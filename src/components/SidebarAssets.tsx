import React from "react";
import {
  EditorObject,
  ObjectType,
  createDefaultObject,
  useEditorActions,
} from "../state/editorState";

const assets: {
  label: string;
  type: ObjectType;
  description: string;
  preset?: Partial<EditorObject>;
}[] = [
  { label: "Sample Text 1", type: "text", description: "Large title", preset: { text: "Sample Text 1", fontSize: 28, fontFamily: "Montserrat" } },
  { label: "Sample Text 2", type: "text", description: "Body copy", preset: { text: "Sample Text 2", fontSize: 20, fontFamily: "Arial" } },
  { label: "Rectangle", type: "rect", description: "Add rectangle", preset: { fill: "#fde68a" } },
  { label: "Circle", type: "circle", description: "Add circle", preset: { fill: "#a5b4fc" } },
  {
    label: "Image",
    type: "image",
    description: "Placeholder image",
    preset: { src: "/assets/sample-image.svg" },
  },
  {
    label: "Pattern Stripes",
    type: "image",
    description: "Pattern asset",
    preset: { src: "/assets/pattern-stripes.svg", width: 200, height: 200 },
  },
  {
    label: "Pattern Dots",
    type: "image",
    description: "Pattern asset",
    preset: { src: "/assets/pattern-dots.svg", width: 200, height: 200 },
  },
];

let quickCounter = 0;

const SidebarAssets: React.FC = () => {
  const actions = useEditorActions();

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    type: ObjectType,
    preset?: Partial<EditorObject>,
  ) => {
    e.dataTransfer.setData(
      "application/x-editor-item",
      JSON.stringify({ type, preset }),
    );
  };

  const handleQuickAdd = (type: ObjectType, preset?: Partial<EditorObject>) => {
    quickCounter += 1;
    const object = createDefaultObject(
      type,
      { x: 80 + quickCounter * 12, y: 80 + quickCounter * 12 },
      quickCounter,
      preset,
    );
    actions.addObject(object);
  };

  return (
    <div className="sidebar">
      <div className="section-title">Assets</div>
      {assets.map((asset) => (
        <div
          key={asset.label + asset.type}
          className="asset-item"
          draggable
          onDragStart={(e) => handleDragStart(e, asset.type, asset.preset)}
        >
          <div style={{ fontWeight: 700 }}>{asset.label}</div>
          <div className="small">{asset.description}</div>
          <button
            className="side-button"
            style={{ marginTop: 8 }}
            onClick={() => handleQuickAdd(asset.type, asset.preset)}
          >
            Add
          </button>
        </div>
      ))}
      <div className="section-title">Tips</div>
      <div className="small">
        Drag items onto the canvas to place them. Use the Pan tool or middle
        mouse to move the viewport. Scroll to zoom.
      </div>
    </div>
  );
};

export default SidebarAssets;

