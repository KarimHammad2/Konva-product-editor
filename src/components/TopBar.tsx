import React from "react";
import {
  parseState,
  serializeState,
  useEditor,
  useEditorActions,
} from "../state/editorState";

type TopBarProps = {
  onExportPNG: () => void;
  isPanning: boolean;
  togglePan: () => void;
};

const TopBar: React.FC<TopBarProps> = ({ onExportPNG, isPanning, togglePan }) => {
  const state = useEditor();
  const actions = useEditorActions();

  const handleImport = () => {
    const existing = serializeState(state);
    const text = window.prompt("Paste editor JSON", existing);
    if (!text) return;
    try {
      const imported = parseState(text);
      actions.importState(imported);
    } catch (err) {
      alert("Invalid JSON");
      console.error(err);
    }
  };

  const handleExportJSON = () => {
    const data = serializeState(state);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "design.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const zoomIn = () => actions.setZoom(state.zoom + 0.1);
  const zoomOut = () => actions.setZoom(state.zoom - 0.1);

  return (
    <div className="top-bar">
      <button onClick={actions.undo}>Undo</button>
      <button onClick={actions.redo}>Redo</button>
      <button onClick={actions.reset}>Reset</button>
      <button onClick={actions.clearAll}>Clear</button>
      <span style={{ flex: 1 }} />
      <button onClick={togglePan}>{isPanning ? "Exit Pan" : "Pan"}</button>
      <button onClick={zoomOut}>-</button>
      <span className="tag">Zoom {state.zoom.toFixed(2)}x</span>
      <button onClick={zoomIn}>+</button>
      <button onClick={handleExportJSON}>Export JSON</button>
      <button onClick={handleImport}>Import JSON</button>
      <button onClick={onExportPNG}>Export PNG</button>
    </div>
  );
};

export default TopBar;

