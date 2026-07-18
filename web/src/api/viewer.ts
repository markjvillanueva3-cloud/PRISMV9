/**
 * L9-P2-MS1 P0-U02: Viewer API Client
 *
 * Fetches scene graph JSON from VisualizationEngine via MCP bridge.
 * Provides mock scene data for development/demo mode.
 */
import type {
  SceneGraph,
  SceneNode,
  ToolpathLineData,
  Color,
} from '../types/viewer';

const API_BASE = '/api';

export type ViewerSceneListEntry = {
  id: string;
  name: string;
  type: string;
};

export type ViewerSceneCatalog = {
  source: 'live' | 'demo';
  scenes: ViewerSceneListEntry[];
  note: string;
};

export type ViewerSceneResolution = {
  source: 'live' | 'demo';
  scene: SceneGraph;
  note: string;
};

const DEMO_SCENE_ID = 'demo_scene';
const DEMO_SCENE_NAME = 'Demo Pocket Milling';

const DEMO_SCENE_ENTRY: ViewerSceneListEntry = {
  id: DEMO_SCENE_ID,
  name: DEMO_SCENE_NAME,
  type: 'demo',
};

function normalizeResultEnvelope<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if ('result' in record) {
    return (record.result as T) ?? null;
  }

  if ('data' in record) {
    return (record.data as T) ?? null;
  }

  return payload as T;
}

function normalizeSceneList(payload: unknown): ViewerSceneListEntry[] {
  const direct = normalizeResultEnvelope<unknown>(payload);

  if (Array.isArray(direct)) {
    return direct
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const scene = entry as Record<string, unknown>;
        const id = typeof scene.id === 'string' ? scene.id : null;
        const name = typeof scene.name === 'string' ? scene.name : id;
        const type = typeof scene.type === 'string' ? scene.type : 'scene';

        return id && name ? { id, name, type } : null;
      })
      .filter((entry): entry is ViewerSceneListEntry => Boolean(entry));
  }

  if (direct && typeof direct === 'object') {
    const nested = (direct as Record<string, unknown>).scenes;
    if (nested) {
      return normalizeSceneList(nested);
    }
  }

  return [];
}

function normalizeSceneGraph(payload: unknown): SceneGraph | null {
  const direct = normalizeResultEnvelope<unknown>(payload);
  if (direct && typeof direct === 'object' && 'root' in (direct as Record<string, unknown>)) {
    return direct as SceneGraph;
  }
  return null;
}

/** Fetch a scene graph for a given job or toolpath */
export async function fetchSceneGraph(
  jobId: string
): Promise<SceneGraph> {
  const res = await fetch(`${API_BASE}/viewer/scene/${jobId}`);
  if (!res.ok) throw new Error(`Scene fetch failed: ${res.status}`);
  const payload = await res.json();
  const scene = normalizeSceneGraph(payload);
  if (!scene) {
    throw new Error('Scene payload could not be normalized.');
  }
  return scene;
}

/** Fetch available scene list */
export async function fetchSceneList(): Promise<
  Array<{ id: string; name: string; type: string }>
> {
  const res = await fetch(`${API_BASE}/viewer/scenes`);
  if (!res.ok) throw new Error(`Scene list fetch failed: ${res.status}`);
  const payload = await res.json();
  return normalizeSceneList(payload);
}

export async function loadViewerSceneCatalog(): Promise<ViewerSceneCatalog> {
  try {
    const scenes = await fetchSceneList();
    if (scenes.length > 0) {
      return {
        source: 'live',
        scenes,
        note: 'Live viewer scenes are available from the connected backend source.',
      };
    }
  } catch {
    // Fall back to the local demo scene until a live scene source is reachable.
  }

  return {
    source: 'demo',
    scenes: [DEMO_SCENE_ENTRY],
    note: 'Live viewer scene routes are not available yet, so PRISM is using the local demo scene as a fallback.',
  };
}

export async function loadViewerScene(sceneId?: string | null): Promise<ViewerSceneResolution> {
  const targetId = sceneId && sceneId.trim().length > 0 ? sceneId : DEMO_SCENE_ID;

  if (targetId === DEMO_SCENE_ID) {
    return {
      source: 'demo',
      scene: buildDemoScene(),
      note: 'Using the local demo scene until a live viewer scene is selected or becomes available.',
    };
  }

  try {
    const scene = await fetchSceneGraph(targetId);
    return {
      source: 'live',
      scene,
      note: `Loaded live scene package ${targetId}.`,
    };
  } catch {
    return {
      source: 'demo',
      scene: buildDemoScene(),
      note: `Live scene ${targetId} could not be loaded, so PRISM fell back to the local demo scene.`,
    };
  }
}

// ── Demo / Mock Data ─────────────────────────────────────────────────

/** Generate a demo toolpath (zigzag pocket) for development */
function generateDemoToolpath(): ToolpathLineData {
  const segments: ToolpathLineData['segments'] = [];
  const lines = 20;
  const width = 100;
  const stepover = 5;

  // Rapid to start
  segments.push({
    type: 'rapid',
    points: [0, 0, 50, 0, 0, 0],
    color: { r: 1, g: 0.8, b: 0 },
    line_width: 1,
  });

  // Zigzag pocket
  for (let i = 0; i < lines; i++) {
    const y = -width / 2 + i * stepover;
    const x1 = i % 2 === 0 ? -width / 2 : width / 2;
    const x2 = i % 2 === 0 ? width / 2 : -width / 2;
    const feed = 800 + Math.random() * 400;
    const rpm = 8000 + Math.random() * 2000;

    segments.push({
      type: 'feed',
      points: [x1, y, -2, x2, y, -2],
      color: { r: 0, g: 0.7, b: 1 },
      line_width: 2,
      feed_rate: feed,
      spindle_rpm: rpm,
      tool_id: 'T01',
    });

    // Stepover
    if (i < lines - 1) {
      const nextY = y + stepover;
      segments.push({
        type: 'feed',
        points: [x2, y, -2, x2, nextY, -2],
        color: { r: 0, g: 0.7, b: 1 },
        line_width: 2,
        feed_rate: feed * 0.5,
        spindle_rpm: rpm,
        tool_id: 'T01',
      });
    }
  }

  // Retract
  const lastY = -width / 2 + (lines - 1) * stepover;
  const lastX = (lines - 1) % 2 === 0 ? width / 2 : -width / 2;
  segments.push({
    type: 'rapid',
    points: [lastX, lastY, -2, lastX, lastY, 50],
    color: { r: 1, g: 0.8, b: 0 },
    line_width: 1,
  });

  return {
    id: 'demo_toolpath',
    segments,
    total_points: segments.length * 2,
  };
}

/** Build a complete demo scene graph */
export function buildDemoScene(): SceneGraph {
  const toolpath = generateDemoToolpath();

  const stockNode: SceneNode = {
    id: 'stock_node',
    name: 'Stock',
    type: 'mesh',
    visible: true,
    transform: {
      position: { x: 0, y: 0, z: -15 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    mesh: generateBoxMeshData(
      'stock',
      'Workpiece',
      120, 120, 30,
      { r: 0.6, g: 0.6, b: 0.65, a: 0.3 }
    ),
    render_mode: 'transparent',
    opacity: 0.3,
  };

  const toolpathNode: SceneNode = {
    id: 'toolpath_node',
    name: 'Toolpath',
    type: 'toolpath',
    visible: true,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    toolpath,
  };

  const toolNode: SceneNode = {
    id: 'tool_assembly',
    name: 'Tool Assembly',
    type: 'group',
    visible: true,
    transform: {
      position: { x: 0, y: 0, z: 50 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    children: [
      {
        id: 'tool_cutting',
        name: 'End Mill',
        type: 'mesh',
        visible: true,
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        mesh: generateCylinderMeshData(
          'tool_cutting', 'End Mill', 6, 40,
          { r: 0.9, g: 0.9, b: 0.9 }
        ),
      },
      {
        id: 'tool_holder',
        name: 'Holder',
        type: 'mesh',
        visible: true,
        transform: {
          position: { x: 0, y: 0, z: 40 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        mesh: generateCylinderMeshData(
          'tool_holder', 'Holder', 20, 60,
          { r: 0.3, g: 0.3, b: 0.35 }
        ),
      },
    ],
  };

  return {
    id: DEMO_SCENE_ID,
    name: DEMO_SCENE_NAME,
    root: {
      id: 'root',
      name: 'Scene Root',
      type: 'group',
      visible: true,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      children: [stockNode, toolpathNode, toolNode],
    },
    camera: {
      position: { x: 170, y: 170, z: 170 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      fov: 45,
      near: 0.1,
      far: 5000,
      type: 'perspective',
    },
    lights: [
      { type: 'ambient', color: { r: 0.4, g: 0.4, b: 0.4 }, intensity: 0.6 },
      {
        type: 'directional',
        color: { r: 1, g: 1, b: 0.95 },
        intensity: 0.8,
        position: { x: 200, y: 400, z: 300 },
        target: { x: 0, y: 0, z: 0 },
      },
    ],
    background: { r: 0.15, g: 0.15, b: 0.18 },
    grid: {
      visible: true,
      size: 500,
      divisions: 50,
      color: { r: 0.3, g: 0.3, b: 0.3 },
    },
    axes: { visible: true, size: 100 },
    clipping_planes: [],
  };
}

// ── Geometry Helpers (client-side, for demo data) ────────────────────

function generateBoxMeshData(
  id: string, name: string,
  w: number, h: number, d: number,
  color: Color
) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const vertices = [
    -hw,-hh, hd,  hw,-hh, hd,  hw, hh, hd, -hw, hh, hd,
    -hw,-hh,-hd, -hw, hh,-hd,  hw, hh,-hd,  hw,-hh,-hd,
    -hw, hh,-hd, -hw, hh, hd,  hw, hh, hd,  hw, hh,-hd,
    -hw,-hh,-hd,  hw,-hh,-hd,  hw,-hh, hd, -hw,-hh, hd,
     hw,-hh,-hd,  hw, hh,-hd,  hw, hh, hd,  hw,-hh, hd,
    -hw,-hh,-hd, -hw,-hh, hd, -hw, hh, hd, -hw, hh,-hd,
  ];
  const normals = [
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    -1,0,0, -1,0,0, -1,0,0, -1,0,0,
  ];
  const indices = [
    0,1,2, 0,2,3, 4,5,6, 4,6,7,
    8,9,10, 8,10,11, 12,13,14, 12,14,15,
    16,17,18, 16,18,19, 20,21,22, 20,22,23,
  ];
  const colors: number[] = [];
  for (let i = 0; i < 24; i++) {
    colors.push(color.r, color.g, color.b, color.a ?? 1);
  }
  return { id, name, vertices, normals, indices, colors };
}

function generateCylinderMeshData(
  id: string, name: string,
  radius: number, height: number,
  color: Color, segments = 24
) {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const halfH = height / 2;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    vertices.push(cos * radius, sin * radius, -halfH);
    normals.push(cos, sin, 0);
    vertices.push(cos * radius, sin * radius, halfH);
    normals.push(cos, sin, 0);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, dd = a + 3;
    indices.push(a, c, b, b, c, dd);
  }

  const colors: number[] = [];
  const vc = vertices.length / 3;
  for (let i = 0; i < vc; i++) {
    colors.push(color.r, color.g, color.b, color.a ?? 1);
  }
  return { id, name, vertices, normals, indices, colors };
}
