import { memo, useEffect, useRef } from "react";
import { Arrow, Ellipse, Group, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { Annotation } from "../model";

const ink = { ink: "#31574c", sage: "#617f44", clay: "#a65f40" };

export const CanvasVisual = memo(function CanvasVisual({ annotation, activeElement }: { annotation: Annotation; activeElement?: string | null }) {
  const root = useRef<Konva.Group>(null);
  const visual = annotation.visual!;
  useEffect(() => {
    const nodes = root.current?.getChildren() ?? [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    nodes.forEach((n) => n.opacity(0));
    const tick = (now: number) => {
      let done = true;
      nodes.forEach((node, i) => {
        const t = Math.max(0, Math.min(1, (now - start - i * 85) / 280));
        node.opacity(1 - (1 - t) ** 4);
        if (t < 1) done = false;
      });
      root.current?.getLayer()?.batchDraw();
      if (!done) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); nodes.forEach((n) => n.opacity(1)); };
  }, [visual]);
  const { frame, drawing } = visual;
  const width = frame.width, height = frame.height - 40;
  return (
    <Group x={frame.x} y={frame.y} listening={false}>
      <Text text={`${annotation.mode === "demo" ? "DEMO" : "AI"} SKETCH  ·  ${drawing.title}`} fontFamily="DM Sans" fontSize={12} fill={ink.sage} width={width} height={24} />
      <Group y={32} ref={root}>
        {drawing.elements.map((e) => {
          const x = e.x * width, y = e.y * height, w = e.width * width, h = e.height * height;
          const color = ink[e.color], active = e.id === activeElement;
          return (
            <Group key={e.id}>
              {active ? <Rect x={Math.max(0, Math.min(x, x + w) - 9)} y={Math.max(0, Math.min(y, y + h) - 8)} width={Math.min(width, Math.abs(w) + 18)} height={Math.max(38, Math.abs(h) + 16)} fill="#dcebbd" opacity={0.65} cornerRadius={8} /> : null}
              {e.kind === "arrow" ? <Arrow points={[x, y, x + w, y + h]} stroke={color} fill={color} strokeWidth={active ? 3.5 : 2.4} pointerLength={10} pointerWidth={9} lineCap="round" /> : null}
              {e.kind === "line" ? <Line points={[x, y, x + w, y + h]} stroke={color} strokeWidth={active ? 3 : 1.8} lineCap="round" /> : null}
              {e.kind === "box" ? <Rect x={x} y={y} width={w} height={h} stroke={color} strokeWidth={active ? 2.8 : 1.8} fill="#eff3e3" cornerRadius={5} /> : null}
              {e.kind === "ellipse" ? <Ellipse x={x + w / 2} y={y + h / 2} radiusX={w / 2} radiusY={h / 2} stroke={color} strokeWidth={active ? 2.8 : 1.8} fill="#eff3e3" /> : null}
              {e.text ? e.kind === "arrow" || e.kind === "line" ? (
                <Text x={Math.max(0, Math.min(width - 100, x + w + 12))} y={Math.max(0, Math.min(height - 30, y + h - 16))} width={100} height={30} text={e.text} fontFamily="Caveat" fontSize={25} fill={color} />
              ) : (
                <Text x={x + (e.kind === "label" ? 0 : 8)} y={y} width={Math.max(1, w - (e.kind === "label" ? 0 : 16))} height={h} text={e.text} fontFamily="Caveat" fontSize={Math.max(16, Math.min(29, h * .7))} align="center" verticalAlign="middle" fill={color} wrap="word" />
              ) : null}
            </Group>
          );
        })}
      </Group>
    </Group>
  );
});
