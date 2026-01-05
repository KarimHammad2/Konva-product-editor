import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Circle, Image, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import {
  EditorObject,
  ObjectType,
  createDefaultObject,
  useEditor,
  useEditorActions,
} from "../state/editorState";

const useImageLoader = (src?: string) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
    return () => {
      setImage(null);
    };
  }, [src]);
  return image;
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

type CanvasStageProps = {
  stageRef: React.RefObject<Konva.Stage>;
  isPanning: boolean;
};

const productImageSrc = "/assets/product.svg";
const patterns: Record<string, string> = {
  stripes: "/assets/pattern-stripes.svg",
  dots: "/assets/pattern-dots.svg",
};

let dropCounter = 0;

type CommonNodeProps = {
  key: string;
  id: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  draggable: boolean;
  onClick: () => void;
  onTap: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
};

const LoadedImage: React.FC<{
  obj: EditorObject;
  common: CommonNodeProps;
}> = ({ obj, common }) => {
  const imageEl = useImageLoader(obj.src);
  return (
    <Image
      {...common}
      width={obj.width}
      height={obj.height}
      image={imageEl ?? undefined}
      listening
    />
  );
};

const CanvasStage: React.FC<CanvasStageProps> = ({ stageRef, isPanning }) => {
  const { objects, selectedId, zoom, pan } = useEditor();
  const actions = useEditorActions();
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });
  const [middlePanning, setMiddlePanning] = useState(false);
  const [backgroundPanning, setBackgroundPanning] = useState(false);
  const [isExternalDrag, setIsExternalDrag] = useState(false);

  const productImage = useImageLoader(productImageSrc);
  const patternImages = {
    stripes: useImageLoader(patterns.stripes),
    dots: useImageLoader(patterns.dots),
  };

  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;
    const selectedNode = stage.findOne(`#${selectedId}`);
    const selectedObj = objects.find((o) => o.id === selectedId);
    if (selectedNode && selectedObj && !selectedObj.locked && !selectedNode.isDragging()) {
      transformer.nodes([selectedNode as Konva.Node]);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedId, stageRef, objects]);

  const handleSelect = (id: string) => {
    actions.select(id);
  };

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const clickedStage = e.target === stage;

    if (clickedStage) {
      actions.select(null);
    }
    if (e.evt.button === 1) {
      setMiddlePanning(true);
      return;
    }

    if (clickedStage && !isPanning && e.evt.button === 0) {
      setBackgroundPanning(true);
      stage?.startDrag();
    }
  };

  const handleStageMouseUp = () => {
    setMiddlePanning(false);
    setBackgroundPanning(false);
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale =
      direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    const mousePointTo = {
      x: (pointer.x - pan.x) / oldScale,
      y: (pointer.y - pan.y) / oldScale,
    };

    const clampedScale = clamp(newScale, 0.2, 4);
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    actions.setViewport(clampedScale, newPos);
  };

  const handleDragEnd = (id: string, e: KonvaEventObject<DragEvent>) => {
    actions.updateObject(id, { x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = (obj: EditorObject, node: Konva.Node) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const next: Partial<EditorObject> = {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
    };

    if (obj.type === "region") {
      next.scaleX = (obj.scaleX ?? 1) * scaleX;
      next.scaleY = (obj.scaleY ?? 1) * scaleY;
    } else {
      next.width = Math.max(8, obj.width * scaleX);
      next.height = Math.max(8, obj.height * scaleY);
      next.scaleX = 1;
      next.scaleY = 1;
    }

    node.scaleX(1);
    node.scaleY(1);
    actions.updateObject(obj.id, next);
  };

  const canPanStage = isPanning || middlePanning || backgroundPanning;
  const isPanActive = middlePanning || backgroundPanning;
  const isDraggingStage = canPanStage;
  const containerClass = `canvas-container${isExternalDrag ? " drag-hover" : ""}${
    canPanStage ? " pan-ready" : ""
  }${isPanActive ? " pan-active" : ""}`;

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData("application/x-editor-item");
    if (!payload) return;
    const stage = stageRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
    const parsed = JSON.parse(payload) as { type: ObjectType; preset?: Partial<EditorObject> };
    dropCounter += 1;
    const object = createDefaultObject(parsed.type, point, dropCounter, parsed.preset);
    actions.addObject(object);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes("application/x-editor-item")) {
      setIsExternalDrag(true);
    }
    e.preventDefault();
  };

  const onDragLeave = () => {
    setIsExternalDrag(false);
  };

  const renderObject = (obj: EditorObject) => {
    const common = {
      key: obj.id,
      id: obj.id,
      x: obj.x,
      y: obj.y,
      rotation: obj.rotation,
      opacity: obj.opacity,
      visible: obj.visible,
      draggable: !obj.locked && !isDraggingStage,
      onClick: () => handleSelect(obj.id),
      onTap: () => handleSelect(obj.id),
      onDragEnd: (e: KonvaEventObject<DragEvent>) => handleDragEnd(obj.id, e),
      onTransformEnd: (e: KonvaEventObject<Event>) =>
        handleTransformEnd(obj, e.target),
    };

    if (obj.type === "region" && obj.points) {
      return (
        <Line
          {...common}
          points={obj.points}
          closed
          fill={obj.patternId ? undefined : obj.fill}
          stroke={obj.stroke}
          strokeWidth={(obj.strokeWidth ?? 1) + (obj.id === selectedId ? 0.6 : 0)}
          listening
          scaleX={obj.scaleX ?? 1}
          scaleY={obj.scaleY ?? 1}
          hitStrokeWidth={12}
          dashEnabled={obj.id === selectedId}
          dash={[6, 4]}
          fillPatternImage={
            obj.patternId
              ? patternImages[obj.patternId as keyof typeof patternImages] ?? undefined
              : undefined
          }
          fillPatternScale={{ x: 0.5, y: 0.5 }}
        />
      );
    }

    if (obj.type === "rect") {
      return (
        <Rect
          {...common}
          width={obj.width}
          height={obj.height}
          fill={obj.fill}
          stroke={obj.stroke}
          strokeWidth={(obj.strokeWidth ?? 1) + (obj.id === selectedId ? 0.6 : 0)}
          cornerRadius={6}
          listening
          dashEnabled={obj.id === selectedId}
          dash={[6, 4]}
          hitStrokeWidth={10}
        />
      );
    }

    if (obj.type === "circle") {
      return (
        <Circle
          {...common}
          radius={obj.width / 2}
          fill={obj.fill}
          stroke={obj.stroke}
          strokeWidth={(obj.strokeWidth ?? 1) + (obj.id === selectedId ? 0.6 : 0)}
          listening
          dashEnabled={obj.id === selectedId}
          dash={[6, 4]}
          hitStrokeWidth={10}
        />
      );
    }

    if (obj.type === "text") {
      return (
        <Text
          {...common}
          width={obj.width}
          height={obj.height}
          text={obj.text ?? ""}
          fontSize={obj.fontSize ?? 20}
          fontFamily={obj.fontFamily ?? "Inter"}
          fill={obj.fill ?? "#0f172a"}
          align={obj.align}
          padding={6}
          listening
        />
      );
    }

    if (obj.type === "image") return <LoadedImage obj={obj} common={common} />;

    return null;
  };

  const sortedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={containerRef}
      className={containerClass}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        draggable={!isExternalDrag && isDraggingStage}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        onDragEnd={(e) =>
          actions.setPan({ x: e.target.x(), y: e.target.y() })
        }
        onDragLeave={onDragLeave}
        onDrop={onDragLeave}
      >
        <Layer>
          {productImage && (
            <Image
              image={productImage}
              width={320}
              height={360}
              x={80}
              y={40}
              listening={false}
              opacity={0.9}
            />
          )}
          {sortedObjects.map((obj) => renderObject(obj))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            enabledAnchors={[
              "top-left",
              "top-center",
              "top-right",
              "middle-left",
              "middle-right",
              "bottom-left",
              "bottom-center",
              "bottom-right",
            ]}
            anchorCornerRadius={6}
            anchorSize={10}
            rotateAnchorOffset={30}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default CanvasStage;

