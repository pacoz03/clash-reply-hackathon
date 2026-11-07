import base64
import importlib
import io
import wave
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

voice = importlib.import_module("backend.voice")
service = importlib.import_module("backend.app")


def script():
    return {"segments": [{"id": "weight", "text": "Weight points down."}, {"id": "normal", "text": "The normal points up."}]}


def test_voice_requires_explicit_configuration(monkeypatch):
    monkeypatch.delenv("OPENAI_VOICE_MODEL", raising=False)
    with TestClient(service.app) as client:
        assert client.post("/tutor/speech", json=script()).status_code == 503


def test_realtime_audio_is_wrapped_as_wav_and_preserves_segment_ids(monkeypatch):
    class Connection:
        session = SimpleNamespace(update=AsyncMock())
        response = SimpleNamespace(create=AsyncMock())
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        def __aiter__(self):
            async def events():
                yield SimpleNamespace(type="response.output_audio.delta", delta=base64.b64encode(b"\0\0" * 2400).decode())
                yield SimpleNamespace(type="response.done", response=SimpleNamespace(status="completed"))
            return events()
    connection = Connection()
    class Client:
        def __init__(self, **kwargs): self.realtime = SimpleNamespace(connect=lambda **kwargs: connection)
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
    monkeypatch.setenv("OPENAI_API_KEY", "test-not-a-key")
    monkeypatch.setenv("OPENAI_VOICE_MODEL", "test-voice-model")
    monkeypatch.setattr(voice, "AsyncOpenAI", Client)
    with TestClient(service.app) as client:
        response = client.post("/tutor/speech", json=script())
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    result = response.json()
    assert [c["id"] for c in result["clips"]] == ["weight", "normal"]
    with wave.open(io.BytesIO(base64.b64decode(result["clips"][0]["audio"]))) as audio:
        assert audio.getframerate() == 24000 and audio.getnchannels() == 1 and audio.getsampwidth() == 2
    assert connection.response.create.await_count == 2
    assert connection.response.create.call_args.kwargs["response"]["conversation"] == "none"


@pytest.mark.parametrize("payload", [{"segments": []}, {"segments": [{"id": "x", "text": " "}]}, {"segments": [{"id": "x", "text": "a"}, {"id": "x", "text": "b"}]}, {"segments": [{"id": "x", "text": "a" * 601}]}])
def test_rejects_invalid_voice_scripts(monkeypatch, payload):
    fake = AsyncMock()
    monkeypatch.setattr(service, "synthesize_voice", fake)
    with TestClient(service.app) as client:
        assert client.post("/tutor/speech", json=payload).status_code == 422
    fake.assert_not_called()


def test_voice_timeout_is_explicit(monkeypatch):
    monkeypatch.setattr(service, "synthesize_voice", AsyncMock(side_effect=TimeoutError))
    with TestClient(service.app) as client:
        assert client.post("/tutor/speech", json=script()).status_code == 502
