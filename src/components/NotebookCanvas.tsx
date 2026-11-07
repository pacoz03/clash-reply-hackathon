import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Text,
  Circle,
  Image as CanvasImage,
  Group,
} from "react-konva";
import type Konva from "konva";
import { CanvasVisual } from "./CanvasVisual";
import {
  PAGE_WIDTH,
  selectionFromPoints,
  uid,
  type Page,
  type Annotation,
  type Selection,
  type Stroke,
  type Tool,
} from "../model";

export interface CanvasHandle {
  snapshot: () => string;
}
interface Props {
  page: Page;
  scale: number;
  tool: Tool;
  color: string;
  penWidth: number;
  penOnly: boolean;
  selection: Selection | null;
  annotationsVisible: boolean;
  visibleAnnotations: Annotation[];
  narration: { annotationId: string; elementId: string | null } | null;
  viewportRef: RefObject<HTMLDivElement | null>;
  onSelection: (selection: Selection | null) => void;
  onStroke: (stroke: Stroke) => void;
  onActivate: () => void;
  onSelecting: (selecting: boolean) => void;
}
const Paper = memo(function Paper({ page }: { page: Page }) {
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    let alive = true;
    setImage(undefined);
    if (page.background) {
      const img = new Image();
      img.src = page.background;
      img.onload = () => {
        if (alive) setImage(img);
      };
    }
    return () => {
      alive = false;
    };
  }, [page.background]);
  return (
    <>
      <Rect width={PAGE_WIDTH} height={page.height} fill="#fffef9" />
      {image ? (
        <CanvasImage image={image} width={PAGE_WIDTH} height={page.backgroundHeight ?? Math.round(image.naturalHeight * PAGE_WIDTH / image.naturalWidth)} />
      ) : null}
      {page.paper === "lines"
        ? Array.from({ length: Math.floor(page.height / 30) }, (_, i) => (
            <Line
              key={i}
              points={[40, 60 + i * 30, 754, 60 + i * 30]}
              stroke="#e5e7de"
              strokeWidth={0.7}
            />
          ))
        : null}
      {page.paper === "dots"
        ? Array.from({ length: Math.floor(page.height / 24) }, (_, row) =>
            Array.from({ length: 31 }, (_, col) => (
              <Circle
                key={`${row}-${col}`}
                x={36 + col * 24}
                y={36 + row * 24}
                radius={0.8}
                fill="#d6dbce"
              />
            )),
          )
        : null}
      {page.template ? (
        <>
          <Rect x={47} y={61} width={500} height={119} fill="#fffef9" />
          <Text
            x={60}
            y={72}
            text="GUIDED EXAMPLE   /   01"
            fontFamily="DM Sans"
            fontSize={11}
            letterSpacing={1.4}
            fill="#758070"
          />
          <Text
            x={60}
            y={106}
            text="The chain rule"
            fontFamily="Lora"
            fontSize={29}
            fill="#293b34"
          />
          <Text
            x={60}
            y={153}
            text="Find the derivative of the following function."
            fontFamily="DM Sans"
            fontSize={14}
            fill="#647065"
          />
          <Text
            x={71}
            y={217}
            text="f(x) = sin(x² + 1)"
            fontFamily="Caveat"
            fontSize={38}
            fill="#273c46"
          />
          <Text
            x={68}
            y={300}
            text="Trying the derivative…"
            fontFamily="Caveat"
            fontSize={27}
            fill="#697369"
          />
          <Text
            x={71}
            y={359}
            text="f′(x) = cos(x² + 1)"
            fontFamily="Caveat"
            fontSize={36}
            fill="#273c46"
          />
          <Text
            x={71}
            y={429}
            text="Something missing?"
            fontFamily="Caveat"
            fontSize={27}
            fill="#697369"
          />
          <Line
            points={[557, 206, 557, 500]}
            stroke="#d6dccd"
            strokeWidth={1}
            dash={[3, 5]}
          />
          <Text
            x={586}
            y={225}
            width={145}
            text={"A little room\nfor another\npoint of view."}
            lineHeight={1.6}
            fontFamily="Lora"
            fontStyle="italic"
            fontSize={17}
            fill="#8a9485"
          />
          <Text
            x={60}
            y={page.height - 72}
            text="Illustrative example · write on this page or add a blank one."
            fontFamily="DM Sans"
            fontSize={10}
            fill="#8b9186"
          />
        </>
      ) : null}
    </>
  );
});

export const NotebookCanvas = forwardRef<CanvasHandle, Props>(
  function NotebookCanvas(props, ref) {
    const {
      page,
      scale,
      tool,
      color,
      penWidth,
      penOnly,
      selection,
      annotationsVisible,
      viewportRef,
      onSelection,
      onStroke,
      onActivate,
      onSelecting,
    } = props;
    const stageRef = useRef<Konva.Stage>(null);
    const overlayRef = useRef<Konva.Layer>(null);
    const draftLineRef = useRef<Konva.Line>(null);
    const activeStroke = useRef<Stroke | null>(null);
    const pointer = useRef<number | null>(null);
    const start = useRef<{ x: number; y: number } | null>(null);
    const pan = useRef<{
      x: number;
      y: number;
      left: number;
      top: number;
    } | null>(null);
    const [draft, setDraft] = useState<Stroke | null>(null);
    const [fontsLoaded, setFontsLoaded] = useState(false);
    useEffect(() => {
      void Promise.all([
        document.fonts.load("16px Caveat"),
        document.fonts.load("16px Lora"),
        document.fonts.load('16px "DM Sans"'),
      ]).then(() => setFontsLoaded(true));
    }, []);
    useImperativeHandle(
      ref,
      () => ({
        snapshot() {
          const stage = stageRef.current;
          if (!stage) throw new Error("The page is not ready yet.");
          const overlay = overlayRef.current;
          overlay?.hide();
          try {
            return stage.toDataURL({ pixelRatio: 1.5 / scale });
          } finally {
            overlay?.show();
            stage.batchDraw();
          }
        },
      }),
      [scale],
    );

    const position = (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: Math.max(
          0,
          Math.min(PAGE_WIDTH, (event.clientX - rect.left) / scale),
        ),
        y: Math.max(
          0,
          Math.min(page.height, (event.clientY - rect.top) / scale),
        ),
      };
    };
    const down = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        pointer.current !== null ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      event.preventDefault();
      onActivate();
      pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      if (tool === "hand" || (penOnly && event.pointerType === "touch")) {
        pan.current = {
          x: event.clientX,
          y: event.clientY,
          left: viewportRef.current?.scrollLeft ?? 0,
          top: viewportRef.current?.scrollTop ?? 0,
        };
        return;
      }
      const point = position(event);
      if (tool === "select") {
        start.current = point;
        onSelecting(true);
        onSelection(null);
        return;
      }
      const stroke: Stroke = {
        id: uid(),
        points: [point.x, point.y, point.x + 0.01, point.y + 0.01],
        color,
        width: tool === "eraser" ? 24 : penWidth,
        tool,
      };
      activeStroke.current = stroke;
      setDraft(stroke);
    };
    const move = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointer.current !== event.pointerId) return;
      if (pan.current && viewportRef.current) {
        viewportRef.current.scrollLeft =
          pan.current.left - (event.clientX - pan.current.x);
        viewportRef.current.scrollTop =
          pan.current.top - (event.clientY - pan.current.y);
        return;
      }
      const point = position(event);
      if (start.current) {
        onSelection(selectionFromPoints(start.current, point, page.height));
        return;
      }
      const stroke = activeStroke.current;
      if (!stroke) return;
      const events = event.nativeEvent.getCoalescedEvents?.() ?? [
        event.nativeEvent,
      ];
      const rect = event.currentTarget.getBoundingClientRect();
      for (const sample of events) {
        stroke.points.push(
          Math.max(
            0,
            Math.min(PAGE_WIDTH, (sample.clientX - rect.left) / scale),
          ),
          Math.max(
            0,
            Math.min(page.height, (sample.clientY - rect.top) / scale),
          ),
        );
      }
      // Transient pointer movement stays out of application state.
      draftLineRef.current?.points([...stroke.points]);
      draftLineRef.current?.getLayer()?.batchDraw();
    };
    const finish = (
      event: ReactPointerEvent<HTMLDivElement>,
      cancelled = false,
    ) => {
      if (pointer.current !== event.pointerId) return;
      if (activeStroke.current && !cancelled)
        onStroke({
          ...activeStroke.current,
          points: [...activeStroke.current.points],
        });
      onSelecting(false);
      if (cancelled) onSelection(null);
      activeStroke.current = null;
      start.current = null;
      pan.current = null;
      pointer.current = null;
      setDraft(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    };
    return (
      <div
        className={`paper tool-${tool}`}
        style={{ width: PAGE_WIDTH * scale, height: page.height * scale }}
        data-testid="notebook-canvas"
        role="img"
        aria-label={`Page ${page.title}. Use the pen to write or select a step to ask for help.`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(event) => finish(event)}
        onPointerCancel={(event) => finish(event, true)}
      >
        <Stage
          width={PAGE_WIDTH * scale}
          height={page.height * scale}
          scaleX={scale}
          scaleY={scale}
          ref={stageRef}
        >
          <Layer listening={false}>
            <Paper key={String(fontsLoaded)} page={page} />
          </Layer>
          <Layer listening={false}>
            {page.strokes.map((stroke) => (
              <Line
                key={stroke.id}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  stroke.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            ))}
            {draft ? (
              <Line
                ref={draftLineRef}
                points={draft.points}
                stroke={draft.color}
                strokeWidth={draft.width}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  draft.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            ) : null}
          </Layer>
          <Layer ref={overlayRef} listening={false}>
            {annotationsVisible ? props.visibleAnnotations.filter((a) => a.visual).map((annotation) => (
              <CanvasVisual key={annotation.id} annotation={annotation} activeElement={props.narration?.annotationId === annotation.id ? props.narration.elementId : null} />
            )) : null}
            {annotationsVisible
              ? props.visibleAnnotations.map((annotation) => {
                  const a = annotation.anchor;
                  return (
                    <Group key={annotation.id}>
                      <Rect
                        {...a}
                        fill="#d4e89a"
                        opacity={0.25}
                        cornerRadius={5}
                      />
                      <Line
                        points={[
                          a.x + a.width,
                          a.y + a.height / 2,
                          PAGE_WIDTH,
                          a.y + a.height / 2,
                        ]}
                        stroke="#7c8e50"
                        strokeWidth={1}
                        dash={[3, 4]}
                      />
                    </Group>
                  );
                })
              : null}
            {selection ? (
              <Rect
                {...selection}
                fill="#819dba"
                opacity={0.2}
                stroke="#395a7d"
                strokeWidth={2}
                dash={[6, 4]}
                cornerRadius={3}
              />
            ) : null}
          </Layer>
        </Stage>
      </div>
    );
  },
);
