import React, { createContext, useContext, useMemo, useReducer } from "react";

export type ObjectType = "region" | "text" | "image" | "rect" | "circle";

export interface EditorObject {
  id: string;
  type: ObjectType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  scaleX?: number;
  scaleY?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  patternId?: string;
  points?: number[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: "left" | "center" | "right";
  src?: string;
}

export interface EditorPresent {
  objects: EditorObject[];
  selectedId: string | null;
  zoom: number;
  pan: { x: number; y: number };
}

export interface EditorState {
  past: EditorPresent[];
  present: EditorPresent;
  future: EditorPresent[];
}

type EditorAction =
  | { type: "SET_SELECTED"; id: string | null }
  | { type: "ADD_OBJECT"; object: EditorObject }
  | { type: "UPDATE_OBJECT"; id: string; changes: Partial<EditorObject> }
  | { type: "DELETE_OBJECT"; id: string }
  | { type: "BRING_TO_FRONT"; id: string }
  | { type: "SEND_TO_BACK"; id: string }
  | { type: "SET_VISIBILITY"; id: string; visible: boolean }
  | { type: "SET_LOCK"; id: string; locked: boolean }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_VIEWPORT"; zoom: number; pan: { x: number; y: number } }
  | { type: "SET_PAN"; pan: { x: number; y: number } }
  | { type: "RESET" }
  | { type: "IMPORT_STATE"; present: EditorPresent }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR" };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getBoundsFromPoints = (points: number[]) => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    xs.push(points[i]);
    ys.push(points[i + 1]);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { width: maxX - minX, height: maxY - minY, minX, minY };
};

const createRegion = (
  id: string,
  name: string,
  points: number[],
  fill: string,
  zIndex: number,
): EditorObject => {
  const bounds = getBoundsFromPoints(points);
  return {
    id,
    type: "region",
    name,
    points,
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    zIndex,
    opacity: 0.95,
    visible: true,
    locked: false,
    fill,
    stroke: "#0f172a",
    strokeWidth: 0.8,
    scaleX: 1,
    scaleY: 1,
  };
};

const initialRegions: EditorObject[] = [
  createRegion(
    "region-top",
    "Top Panel",
    [120, 60, 220, 60, 250, 150, 90, 150],
    "#fef2f2",
    0,
  ),
  createRegion(
    "region-bottom",
    "Bottom Panel",
    [110, 170, 240, 170, 230, 260, 120, 260],
    "#e0f2fe",
    1,
  ),
  createRegion(
    "region-left-strap",
    "Left Strap",
    [110, 60, 130, 60, 110, 20, 90, 20],
    "#ede9fe",
    2,
  ),
  createRegion(
    "region-right-strap",
    "Right Strap",
    [220, 60, 240, 60, 260, 20, 240, 20],
    "#eef2ff",
    3,
  ),
];

const initialPresent: EditorPresent = {
  objects: initialRegions,
  selectedId: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
};

const normalizeZIndex = (objects: EditorObject[]) =>
  objects.map((obj, index) => ({ ...obj, zIndex: index }));

const pushHistory = (state: EditorState, next: EditorPresent): EditorState => ({
  past: [...state.past, state.present],
  present: next,
  future: [],
});

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case "SET_SELECTED":
      return {
        ...state,
        present: { ...state.present, selectedId: action.id },
      };
    case "ADD_OBJECT": {
      const objects = normalizeZIndex([
        ...state.present.objects,
        { ...action.object, zIndex: state.present.objects.length },
      ]);
      const present = { ...state.present, objects, selectedId: action.object.id };
      return pushHistory(state, present);
    }
    case "UPDATE_OBJECT": {
      const objects = normalizeZIndex(
        state.present.objects.map((obj) =>
        obj.id === action.id ? { ...obj, ...action.changes } : obj,
        ),
      );
      return pushHistory(state, { ...state.present, objects });
    }
    case "DELETE_OBJECT": {
      const objects = normalizeZIndex(
        state.present.objects.filter((obj) => obj.id !== action.id),
      );
      const selectedId =
        state.present.selectedId === action.id ? null : state.present.selectedId;
      return pushHistory(state, { ...state.present, objects, selectedId });
    }
    case "BRING_TO_FRONT": {
      const target = state.present.objects.find((o) => o.id === action.id);
      if (!target) return state;
      const rest = state.present.objects.filter((o) => o.id !== action.id);
      return pushHistory(state, {
        ...state.present,
        objects: normalizeZIndex([...rest, target]),
      });
    }
    case "SEND_TO_BACK": {
      const target = state.present.objects.find((o) => o.id === action.id);
      if (!target) return state;
      const rest = state.present.objects.filter((o) => o.id !== action.id);
      return pushHistory(state, {
        ...state.present,
        objects: normalizeZIndex([target, ...rest]),
      });
    }
    case "SET_VISIBILITY": {
      const objects = normalizeZIndex(
        state.present.objects.map((obj) =>
          obj.id === action.id ? { ...obj, visible: action.visible } : obj,
        ),
      );
      return pushHistory(state, { ...state.present, objects });
    }
    case "SET_LOCK": {
      const objects = normalizeZIndex(
        state.present.objects.map((obj) =>
          obj.id === action.id ? { ...obj, locked: action.locked } : obj,
        ),
      );
      return pushHistory(state, { ...state.present, objects });
    }
    case "SET_ZOOM": {
      const zoom = clamp(action.zoom, 0.2, 4);
      return pushHistory(state, { ...state.present, zoom });
    }
    case "SET_VIEWPORT": {
      const zoom = clamp(action.zoom, 0.2, 4);
      return pushHistory(state, { ...state.present, zoom, pan: action.pan });
    }
    case "SET_PAN": {
      return pushHistory(state, { ...state.present, pan: action.pan });
    }
    case "RESET":
      return {
        past: [],
        present: initialPresent,
        future: [],
      };
    case "IMPORT_STATE":
      return {
        past: [],
        present: {
          ...action.present,
          objects: normalizeZIndex(action.present.objects),
        },
        future: [],
      };
    case "UNDO": {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      const past = state.past.slice(0, state.past.length - 1);
      const future = [state.present, ...state.future];
      return { past, present: previous, future };
    }
    case "REDO": {
      if (!state.future.length) return state;
      const next = state.future[0];
      const future = state.future.slice(1);
      const past = [...state.past, state.present];
      return { past, present: next, future };
    }
    case "CLEAR":
      return pushHistory(state, {
        ...state.present,
        objects: normalizeZIndex(state.present.objects.filter((o) => o.type === "region")),
        selectedId: null,
      });
    default:
      return state;
  }
};

const EditorContext = createContext<{
  state: EditorPresent;
  dispatch: React.Dispatch<EditorAction>;
} | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(editorReducer, {
    past: [],
    present: initialPresent,
    future: [],
  });

  const value = useMemo(() => ({ state: state.present, dispatch }), [state]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

export const useEditor = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be inside EditorProvider");
  return ctx.state;
};

export const useEditorDispatch = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditorDispatch must be inside EditorProvider");
  return ctx.dispatch;
};

export const useEditorActions = () => {
  const dispatch = useEditorDispatch();
  return {
    select: (id: string | null) => dispatch({ type: "SET_SELECTED", id }),
    addObject: (object: EditorObject) => dispatch({ type: "ADD_OBJECT", object }),
    updateObject: (id: string, changes: Partial<EditorObject>) =>
      dispatch({ type: "UPDATE_OBJECT", id, changes }),
    deleteObject: (id: string) => dispatch({ type: "DELETE_OBJECT", id }),
    bringToFront: (id: string) => dispatch({ type: "BRING_TO_FRONT", id }),
    sendToBack: (id: string) => dispatch({ type: "SEND_TO_BACK", id }),
    setVisibility: (id: string, visible: boolean) =>
      dispatch({ type: "SET_VISIBILITY", id, visible }),
    setLock: (id: string, locked: boolean) =>
      dispatch({ type: "SET_LOCK", id, locked }),
    setZoom: (zoom: number) => dispatch({ type: "SET_ZOOM", zoom }),
    setViewport: (zoom: number, pan: { x: number; y: number }) =>
      dispatch({ type: "SET_VIEWPORT", zoom, pan }),
    setPan: (pan: { x: number; y: number }) => dispatch({ type: "SET_PAN", pan }),
    reset: () => dispatch({ type: "RESET" }),
    clearAll: () => dispatch({ type: "CLEAR" }),
    undo: () => dispatch({ type: "UNDO" }),
    redo: () => dispatch({ type: "REDO" }),
    importState: (present: EditorPresent) =>
      dispatch({ type: "IMPORT_STATE", present }),
  };
};

export const createDefaultObject = (
  type: ObjectType,
  point: { x: number; y: number },
  counter: number,
  overrides?: Partial<EditorObject>,
): EditorObject => {
  const base = {
    id: `${type}-${Date.now()}-${counter}`,
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    x: point.x,
    y: point.y,
    width: 150,
    height: 60,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#38bdf8",
    stroke: "#0f172a",
    strokeWidth: 1,
    scaleX: 1,
    scaleY: 1,
  };

  if (type === "text") {
    return {
      ...base,
      width: 180,
      height: 60,
      text: "New Text",
      fontSize: 24,
      fontFamily: "Inter",
      align: "left",
      fill: "#0f172a",
      ...overrides,
    };
  }

  if (type === "image") {
    return {
      ...base,
      width: 180,
      height: 140,
      fill: undefined,
      src: "/assets/sample-image.svg",
      ...overrides,
    };
  }

  if (type === "circle") {
    return {
      ...base,
      width: 120,
      height: 120,
      fill: "#a5b4fc",
      ...overrides,
    };
  }

  if (type === "rect") {
    return {
      ...base,
      width: 160,
      height: 100,
      fill: "#bbf7d0",
      ...overrides,
    };
  }

  return { ...base, ...overrides };
};

export const serializeState = (present: EditorPresent) =>
  JSON.stringify(present, null, 2);

export const parseState = (json: string): EditorPresent => {
  const parsed = JSON.parse(json) as EditorPresent;
  return { ...parsed, objects: normalizeZIndex(parsed.objects ?? []) };
};

