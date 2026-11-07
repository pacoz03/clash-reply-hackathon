import base64
import importlib
import struct
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
import httpx
from fastapi.testclient import TestClient
from openai import AuthenticationError

service = importlib.import_module("backend.app")


def payload(**changes):
    # Complete minimal 1x1 PNG, never user data.
    png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr1sAAAAASUVORK5CYII="
    return {"pageId": "page", "revision": 2, "pageHeight": 1123, "image": "data:image/png;base64," + png, "selection": {"x": 10, "y": 20, "width": 200, "height": 50}, "question": "A hint", "previousHints": [], **changes}


def decision(**changes):
    return service.Decision(kind="question", text="What is the inner derivative?", anchor=None, outcome="needs-work", observation="The inner derivative needs attention.", source=None, **changes)


def test_unconfigured_tutor_is_not_a_fake_success(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_MODEL", raising=False)
    with TestClient(service.app) as client:
        assert client.get("/health").json()["configured"] is False
        assert client.post("/tutor/help", json=payload()).status_code == 503


def test_preserves_selection_and_request_identity(monkeypatch):
    fake = AsyncMock(return_value=decision())
    monkeypatch.setattr(service, "infer", fake)
    with TestClient(service.app) as client:
        result = client.post("/tutor/help", json=payload()).json()
    assert result["pageId"] == "page" and result["revision"] == 2
    assert result["annotation"]["anchor"] == payload()["selection"]
    assert result["annotation"]["mode"] == "connected"
    assert result["observation"]["outcome"] == "needs-work"


@pytest.mark.parametrize("change", [
    {"image": "https://example.com/private.png"},
    {"image": "data:image/png;base64,invalid"},
    {"selection": {"x": 790, "y": 20, "width": 200, "height": 50}},
    {"pageHeight": 7000}, {"revision": -1}, {"sources": [{"materialId": "x", "name": "x", "page": 0, "text": "text"}]},
])
def test_rejects_invalid_input_before_provider_and_does_not_echo_page(monkeypatch, change):
    fake = AsyncMock(return_value=decision())
    monkeypatch.setattr(service, "infer", fake)
    with TestClient(service.app) as client:
        response = client.post("/tutor/help", json=payload(**change))
    assert response.status_code == 422
    assert "image" not in response.text
    fake.assert_not_called()


def test_requires_matching_material_page_and_quote():
    source = {"materialId": "notes", "name": "Lecture.pdf", "page": 3, "text": "The chain rule differentiates composite functions."}
    request = service.TutorRequest(**payload(sources=[source]))
    for material_id, page, quote, expected in [("notes", 3, "chain rule differentiates", True), ("notes", 4, "chain rule differentiates", False), ("missing", 3, "chain rule differentiates", False), ("notes", 3, "An invented theorem", False), ("notes", 3, "                  ", False)]:
        d = decision()
        d.source = service.Citation(materialId=material_id, page=page, quote=quote)
        annotation = service.build_response(request, d)["annotation"]
        assert ("sourceRef" in annotation) is expected


def test_uses_safe_anchor_for_a_short_page():
    request = service.TutorRequest(**payload(selection=None, pageHeight=30))
    d = decision()
    d.anchor = service.Region(x=790, y=500, width=200, height=80)
    anchor = service.build_response(request, d)["annotation"]["anchor"]
    assert anchor["y"] + anchor["height"] <= 30
    assert anchor["x"] + anchor["width"] <= 794


def test_provider_timeout_keeps_failure_explicit(monkeypatch):
    monkeypatch.setattr(service, "infer", AsyncMock(side_effect=TimeoutError))
    with TestClient(service.app) as client:
        response = client.post("/tutor/help", json=payload())
    assert response.status_code == 502


def test_invalid_key_is_actionable_without_exposing_provider_details(monkeypatch, caplog):
    private = "secret-key-and-private-page-content"
    error = AuthenticationError(private, response=httpx.Response(401, request=httpx.Request("POST", "https://api.openai.com/v1/responses")), body={"code": "token_invalidated", "message": private})
    monkeypatch.setattr(service, "infer", AsyncMock(side_effect=error))
    with TestClient(service.app) as client:
        response = client.post("/tutor/help", json=payload())
    assert response.status_code == 502
    assert response.json() == {"detail": {"code": "provider_authentication_failed"}}
    assert "restart the backend" in caplog.text
    assert private not in response.text + caplog.text


def test_provider_contract_uses_the_current_image_and_structured_output(monkeypatch):
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=decision()))
    class Client:
        def __init__(self, **kwargs):
            self.responses = SimpleNamespace(parse=parse)
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
    monkeypatch.setattr(service, "AsyncOpenAI", Client)
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-not-a-key")
    monkeypatch.setenv("OPENAI_MODEL", "test-model")
    with TestClient(service.app) as client:
        assert client.post("/tutor/help", json=payload(intent="check")).status_code == 200
    args = parse.call_args.kwargs
    assert args["store"] is False and args["text_format"] is service.Decision
    assert args["input"][0]["content"][1]["image_url"] == payload()["image"]
    assert '"intent": "check"' in args["input"][0]["content"][0]["text"]


def test_canvas_decision_uses_reserved_frame_and_preserves_request_identity(monkeypatch):
    d = decision()
    d.drawing = service.Drawing(title="Free-body sketch", elements=[service.DrawingElement(id="weight", kind="arrow", x=.5, y=.3, width=0, height=.4, text="mg", color="clay", speech="Weight points down.")])
    monkeypatch.setattr(service, "infer", AsyncMock(return_value=d))
    frame = {"x": 64, "y": 1200, "width": 640, "height": 300}
    with TestClient(service.app) as client:
        response = client.post("/tutor/help", json=payload(presentation="canvas", drawingArea=frame))
    assert response.status_code == 200
    result = response.json()
    assert result["annotation"]["visual"]["frame"] == frame
    assert result["annotation"]["visual"]["drawing"]["elements"][0]["speech"] == "Weight points down."
    assert result["revision"] == 2
    request = service.TutorRequest(**payload())
    assert "visual" not in service.build_response(request, d)["annotation"]


@pytest.mark.parametrize("change", [{"x": .9, "width": .5}, {"kind": "box", "width": -.1}, {"y": float("nan")}])
def test_rejects_invalid_canvas_elements(change):
    from pydantic import ValidationError
    element = dict(id="weight", kind="arrow", x=.5, y=.3, width=0, height=.4, text="mg", color="clay", speech="Weight points down.")
    with pytest.raises(ValidationError):
        service.DrawingElement(**{**element, **change})


def test_rejects_a_drawing_area_outside_notebook(monkeypatch):
    fake = AsyncMock(return_value=decision())
    monkeypatch.setattr(service, "infer", fake)
    with TestClient(service.app) as client:
        assert client.post("/tutor/help", json=payload(presentation="canvas", drawingArea={"x": 64, "y": 5800, "width": 640, "height": 300})).status_code == 422
    fake.assert_not_called()
