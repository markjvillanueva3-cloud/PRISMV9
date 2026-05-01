/**
 * L9-P2-MS1: Viewer Types
 * TypeScript types mirroring VisualizationEngine scene graph structures.
 * These are the client-side equivalents — kept in sync with the engine types.
 */

export interface Vec3 { x: number; y: number; z: number }
export interface Color { r: number; g: number; b: number; a?: number }

export type ViewPreset = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'iso' | 'iso_rear';
export type ColorMode = 'by_type' | 'by_feed' | 'by_speed' | 'by_tool' | 'by_mrr' | 'by_operation' | 'uniform';
export type RenderMode = 'solid' | 'wireframe' | 'transparent' | 'xray' | 'hidden_line';
export type HeatmapType = 'thermal' | 'force' | 'wear' | 'stress' | 'deflection' | 'custom';

export interface CameraConfig {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
  near: number;
  far: number;
  type: 'perspective' | 'orthographic';
  ortho_size?: number;
}

export interface MeshData {
  id: string;
  name: string;
  vertices: number[];
  normals: number[];
  indices: number[];
  colors?: number[];
  uvs?: number[];
  wireframe_indices?: number[];
}

export interface ToolpathSegment {
  type: 'rapid' | 'feed' | 'arc_cw' | 'arc_ccw' | 'plunge';
  points: number[];
  color: Color;
  line_width: number;
  feed_rate?: number;
  spindle_rpm?: number;
  tool_id?: string;
}

export interface ToolpathLineData {
  id: string;
  segments: ToolpathSegment[];
  total_points: number;
}

export interface SceneNode {
  id: string;
  name: string;
  type: 'mesh' | 'toolpath' | 'point_cloud' | 'annotation' | 'group';
  visible: boolean;
  transform: {
    position: Vec3;
    rotation: Vec3;
    scale: Vec3;
  };
  mesh?: MeshData;
  toolpath?: ToolpathLineData;
  children?: SceneNode[];
  metadata?: Record<string, unknown>;
  render_mode?: RenderMode;
  color?: Color;
  opacity?: number;
}

export interface SceneLight {
  type: 'ambient' | 'directional' | 'point' | 'spot';
  color: Color;
  intensity: number;
  position?: Vec3;
  target?: Vec3;
}

export interface SceneGraph {
  id: string;
  name: string;
  root: SceneNode;
  camera: CameraConfig;
  lights: SceneLight[];
  background: Color;
  grid: { visible: boolean; size: number; divisions: number; color: Color };
  axes: { visible: boolean; size: number };
  clipping_planes: Array<{ normal: Vec3; distance: number; enabled: boolean }>;
}

export interface HeatmapConfig {
  type: HeatmapType;
  min_value: number;
  max_value: number;
  unit: string;
  color_stops: Array<{ value: number; color: Color }>;
}

/** Camera preset metadata for UI buttons */
export const VIEW_PRESETS: Array<{ preset: ViewPreset; label: string; shortcut: string }> = [
  { preset: 'front', label: 'Front', shortcut: '1' },
  { preset: 'back', label: 'Back', shortcut: '2' },
  { preset: 'top', label: 'Top', shortcut: '3' },
  { preset: 'bottom', label: 'Bottom', shortcut: '4' },
  { preset: 'left', label: 'Left', shortcut: '5' },
  { preset: 'right', label: 'Right', shortcut: '6' },
  { preset: 'iso', label: 'Iso', shortcut: '7' },
  { preset: 'iso_rear', label: 'Iso Rear', shortcut: '8' },
];
