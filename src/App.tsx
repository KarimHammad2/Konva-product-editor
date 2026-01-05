import React, { useRef, useState } from "react";
import type Konva from "konva";
import CanvasStage from "./components/CanvasStage";
import SidebarAssets from "./components/SidebarAssets";
import PropertiesPanel from "./components/PropertiesPanel";
import TopBar from "./components/TopBar";

const App: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const [isPanning, setIsPanning] = useState(false);

  const handleExportPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = "design.png";
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="app-shell">
      <TopBar
        isPanning={isPanning}
        togglePan={() => setIsPanning((p) => !p)}
        onExportPNG={handleExportPNG}
      />
      <div className="layout">
        <SidebarAssets />
        <div className="canvas-wrap">
          <CanvasStage stageRef={stageRef} isPanning={isPanning} />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
};

export default App;

