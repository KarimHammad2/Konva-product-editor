import React from "react";
import { useEditor, useEditorActions } from "../state/editorState";

const PropertiesPanel: React.FC = () => {
  const { objects, selectedId } = useEditor();
  const actions = useEditorActions();
  const selected = objects.find((o) => o.id === selectedId);

  if (!selected) {
    return (
      <div className="properties">
        <div className="section-title">Properties</div>
        <div className="small">Select an item to edit its properties.</div>
      </div>
    );
  }

  const update = (key: string, value: unknown) => {
    actions.updateObject(selected.id, { [key]: value });
  };

  return (
    <div className="properties">
      <div className="section-title">Properties</div>
      <div className="prop-row">
        <label>Type</label>
        <span className="tag">{selected.type}</span>
      </div>
      <div className="prop-row">
        <label>Name</label>
        <span className="small">{selected.name}</span>
      </div>
      <div className="prop-row">
        <label>Status</label>
        <span className="tag">{selected.locked ? "Locked" : "Editable"}</span>
      </div>
      <div className="prop-row">
        <label>Layer</label>
        <span className="tag">z {selected.zIndex}</span>
      </div>
      <div className="prop-row">
        <label>X</label>
        <input
          type="number"
          value={selected.x}
          onChange={(e) => update("x", parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="prop-row">
        <label>Y</label>
        <input
          type="number"
          value={selected.y}
          onChange={(e) => update("y", parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="prop-row">
        <label>Width</label>
        <input
          type="number"
          value={selected.width}
          disabled={selected.type === "region"}
          onChange={(e) =>
            update("width", Math.max(8, parseFloat(e.target.value) || 0))
          }
        />
      </div>
      <div className="prop-row">
        <label>Height</label>
        <input
          type="number"
          value={selected.height}
          disabled={selected.type === "region"}
          onChange={(e) =>
            update("height", Math.max(8, parseFloat(e.target.value) || 0))
          }
        />
      </div>
      <div className="prop-row">
        <label>Rotation</label>
        <input
          type="number"
          value={selected.rotation}
          onChange={(e) => update("rotation", parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="prop-row">
        <label>Opacity</label>
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={selected.opacity}
          onChange={(e) =>
            update(
              "opacity",
              Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)),
            )
          }
        />
      </div>

      {selected.type !== "image" && (
        <div className="prop-row">
          <label>Fill</label>
          <input
            type="color"
            value={selected.fill ?? "#ffffff"}
            onChange={(e) => update("fill", e.target.value)}
          />
        </div>
      )}
      <div className="prop-row">
        <label>Stroke</label>
        <input
          type="color"
          value={selected.stroke ?? "#0f172a"}
          onChange={(e) => update("stroke", e.target.value)}
        />
      </div>
      {selected.type !== "text" && (
        <div className="prop-row">
          <label>Stroke W</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={selected.strokeWidth ?? 1}
            onChange={(e) =>
              update(
                "strokeWidth",
                Math.max(0, parseFloat(e.target.value) || 0),
              )
            }
          />
        </div>
      )}

      {selected.type === "region" && (
        <div className="prop-row">
          <label>Pattern</label>
          <select
            value={selected.patternId ?? ""}
            onChange={(e) =>
              update("patternId", e.target.value === "" ? undefined : e.target.value)
            }
          >
            <option value="">None</option>
            <option value="stripes">Stripes</option>
            <option value="dots">Dots</option>
          </select>
        </div>
      )}

      {selected.type === "text" && (
        <>
          <div className="prop-row">
            <label>Text</label>
            <input
              type="text"
              value={selected.text ?? ""}
              onChange={(e) => update("text", e.target.value)}
            />
          </div>
          <div className="prop-row">
            <label>Font Size</label>
            <input
              type="number"
              value={selected.fontSize ?? 20}
              onChange={(e) => update("fontSize", parseFloat(e.target.value) || 12)}
            />
          </div>
          <div className="prop-row">
            <label>Font</label>
            <select
              value={selected.fontFamily ?? "Inter"}
              onChange={(e) => update("fontFamily", e.target.value)}
            >
              <option value="Inter">Inter</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Montserrat">Montserrat</option>
            </select>
          </div>
          <div className="prop-row">
            <label>Align</label>
            <select
              value={selected.align ?? "left"}
              onChange={(e) => update("align", e.target.value as "left" | "center" | "right")}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </>
      )}

      {selected.type === "image" && (
        <div className="prop-row">
          <label>Src</label>
          <input
            type="text"
            value={selected.src ?? ""}
            onChange={(e) => update("src", e.target.value)}
          />
        </div>
      )}

      <div className="divider" />
      <div className="layer-controls">
        <button className="side-button" onClick={() => actions.sendToBack(selected.id)}>
          Send Back
        </button>
        <button className="side-button" onClick={() => actions.bringToFront(selected.id)}>
          Bring Front
        </button>
      </div>
      <div className="layer-controls">
        <button
          className="side-button"
          onClick={() => actions.setLock(selected.id, !selected.locked)}
        >
          {selected.locked ? "Unlock" : "Lock"}
        </button>
        <button
          className="side-button"
          onClick={() => actions.setVisibility(selected.id, !selected.visible)}
        >
          {selected.visible ? "Hide" : "Show"}
        </button>
        <button
          className="side-button"
          style={{ color: "#dc2626" }}
          onClick={() => actions.deleteObject(selected.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;

