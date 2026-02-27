/**
 * VisualizationEngine — 3D Visualization Data Pipeline
 *
 * L2-P0-MS1: Ported from monolith visualization modules.
 * Generates structured rendering data for WebGL/Three.js frontend.
 * Does NOT render — produces scene graphs, mesh data, and camera
 * configurations suitable for client-side 3D rendering.
 *
 * Capabilities:
 *   - Toolpath visualization (colored by feed/speed/type)
 *   - Stock/workpiece mesh generation
 *   - Tool assembly visualization
 *   - Machine kinematic chain rendering
 *   - Heatmap overlays (thermal, force, wear)
 *   - Section view / clipping plane generation
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface Vec3 { x: number; y: number; z: number; }
export interface Vec4 { x: number; y: number; z: number; w: number; }
export interface Color { r: number; g: number; b: number; a?: number; }

export type ViewPreset = "front" | "back" | "top" | "bottom" | "left" | "right" | "iso" | "iso_rear";
export type ColorMode = "by_type" | "by_feed" | "by_speed" | "by_tool" | "by_mrr" | "by_operation" | "uniform";
export type RenderMode = "solid" | "wireframe" | "transparent" | "xray" | "hidden_line";

export interface CameraConfig {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
  near: number;
  far: number;
  type: "perspective" | "orthographic";
  ortho_size?: number;
}

export interface MeshData {
  id: string;
  name: string;
  vertices: number[];    // flat [x,y,z, x,y,z, ...]
  normals: number[];     // flat [nx,ny,nz, ...]
  indices: number[];     // triangle indices
  colors?: number[];     // per-vertex [r,g,b,a, ...]
  uvs?: number[];        // texture coords [u,v, ...]
  wireframe_indices?: number[];
}

export interface ToolpathLineData {
  id: string;
  segments: Array<{
    type: "rapid" | "feed" | "arc_cw" | "arc_ccw" | "plunge";
    points: number[];   // flat [x,y,z, x,y,z, ...]
    color: Color;
    line_width: number;
    feed_rate?: number;
    spindle_rpm?: number;
    tool_id?: string;
  }>;
  total_points: number;
}

export interface SceneNode {
  id: string;
  name: string;
  type: "mesh" | "toolpath" | "point_cloud" | "annotation" | "group";
  visible: boolean;
  transform: {
    position: Vec3;
    rotation: Vec3;   // euler angles in degrees
    scale: Vec3;
  };
  mesh?: MeshData;
  toolpath?: ToolpathLineData;
  children?: SceneNode[];
  metadata?: Record<string, any>;
  render_mode?: RenderMode;
  color?: Color;
  opacity?: number;
}

export interface SceneGraph {
  id: string;
  name: string;
  root: SceneNode;
  camera: CameraConfig;
  lights: Array<{
    type: "ambient" | "directional" | "point" | "spot";
    color: Color;
    intensity: number;
    position?: Vec3;
    target?: Vec3;
  }>;
  background: Color;
  grid: { visible: boolean; size: number; divisions: number; color: Color };
  axes: { visible: boolean; size: number };
  clipping_planes: Array<{ normal: Vec3; distance: number; enabled: boolean }>;
}

export interface HeatmapConfig {
  type: "thermal" | "force" | "wear" | "stress" | "deflection" | "custom";
  min_value: number;
  max_value: number;
  unit: string;
  color_stops: Array<{ value: number; color: Color }>;
}

// ── Color Constants ───────────────────────────────────────────────────

const COLORS = {
  rapid: { r: 1, g: 0.8, b: 0 } as Color,         // yellow
  feed: { r: 0, g: 0.7, b: 1 } as Color,           // blue
  arc: { r: 0.2, g: 1, b: 0.2 } as Color,          // green
  plunge: { r: 1, g: 0.2, b: 0.2 } as Color,       // red
  stock: { r: 0.6, g: 0.6, b: 0.65, a: 0.8 } as Color, // steel gray
  tool: { r: 0.9, g: 0.9, b: 0.9 } as Color,       // silver
  holder: { r: 0.3, g: 0.3, b: 0.35 } as Color,    // dark gray
  fixture: { r: 0.4, g: 0.4, b: 0.2 } as Color,    // olive
  machine_frame: { r: 0.2, g: 0.3, b: 0.2 } as Color, // dark green
  machine_cover: { r: 0.25, g: 0.25, b: 0.25 } as Color,
  warning: { r: 1, g: 0.5, b: 0 } as Color,
  danger: { r: 1, g: 0, b: 0 } as Color,
  safe: { r: 0, g: 0.8, b: 0 } as Color,
};

// ── Engine ────────────────────────────────────────────────────────────

export class VisualizationEngine {
  /** Generate a camera configuration for a view preset */
  getCamera(preset: ViewPreset, target: Vec3 = { x: 0, y: 0, z: 0 }, distance: number = 500): CameraConfig {
    const cameras: Record<ViewPreset, Vec3> = {
      front: { x: 0, y: -distance, z: 0 },
      back: { x: 0, y: distance, z: 0 },
      top: { x: 0, y: 0, z: distance },
      bottom: { x: 0, y: 0, z: -distance },
      left: { x: -distance, y: 0, z: 0 },
      right: { x: distance, y: 0, z: 0 },
      iso: { x: distance * 0.577, y: -distance * 0.577, z: distance * 0.577 },
      iso_rear: { x: -distance * 0.577, y: distance * 0.577, z: distance * 0.577 },
    };

    return {
      position: {
        x: target.x + cameras[preset].x,
        y: target.y + cameras[preset].y,
        z: target.z + cameras[preset].z,
      },
      target,
      up: { x: 0, y: 0, z: 1 },
      fov: 45,
      near: 0.1,
      far: distance * 10,
      type: "perspective",
    };
  }

  /** Generate box mesh data (for stock, fixture blocks, etc.) */
  generateBoxMesh(id: string, name: string, width: number, height: number, depth: number, color?: Color): MeshData {
    const hw = width / 2, hh = height / 2, hd = depth / 2;

    // 8 vertices, 12 triangles (6 faces × 2)
    const vertices = [
      // Front face
      -hw, -hh, hd,   hw, -hh, hd,   hw, hh, hd,   -hw, hh, hd,
      // Back face
      -hw, -hh, -hd,  -hw, hh, -hd,  hw, hh, -hd,  hw, -hh, -hd,
      // Top face
      -hw, hh, -hd,   -hw, hh, hd,   hw, hh, hd,   hw, hh, -hd,
      // Bottom face
      -hw, -hh, -hd,  hw, -hh, -hd,  hw, -hh, hd,  -hw, -hh, hd,
      // Right face
      hw, -hh, -hd,   hw, hh, -hd,   hw, hh, hd,   hw, -hh, hd,
      // Left face
      -hw, -hh, -hd,  -hw, -hh, hd,  -hw, hh, hd,  -hw, hh, -hd,
    ];

    const normals = [
      0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,      // front
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,      // back
      0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,       // top
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,      // bottom
      1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,       // right
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,      // left
    ];

    const indices = [
      0, 1, 2,   0, 2, 3,     // front
      4, 5, 6,   4, 6, 7,     // back
      8, 9, 10,  8, 10, 11,   // top
      12, 13, 14, 12, 14, 15, // bottom
      16, 17, 18, 16, 18, 19, // right
      20, 21, 22, 20, 22, 23, // left
    ];

    const c = color ?? COLORS.stock;
    const colors: number[] = [];
    for (let i = 0; i < 24; i++) {
      colors.push(c.r, c.g, c.b, c.a ?? 1);
    }

    return { id, name, vertices, normals, indices, colors };
  }

  /** Generate cylinder mesh data (for tools, spindles, etc.) */
  generateCylinderMesh(id: string, name: string, radius: number, height: number, segments: number = 32, color?: Color): MeshData {
    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    const halfH = height / 2;

    // Side vertices
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cos = Math.cos(angle), sin = Math.sin(angle);

      // Bottom ring
      vertices.push(cos * radius, sin * radius, -halfH);
      normals.push(cos, sin, 0);
      // Top ring
      vertices.push(cos * radius, sin * radius, halfH);
      normals.push(cos, sin, 0);
    }

    // Side faces
    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }

    // Top cap center
    const topCenter = vertices.length / 3;
    vertices.push(0, 0, halfH);
    normals.push(0, 0, 1);
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, halfH);
      normals.push(0, 0, 1);
    }
    for (let i = 0; i < segments; i++) {
      indices.push(topCenter, topCenter + 1 + i, topCenter + 1 + ((i + 1) % segments));
    }

    // Bottom cap center
    const botCenter = vertices.length / 3;
    vertices.push(0, 0, -halfH);
    normals.push(0, 0, -1);
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, -halfH);
      normals.push(0, 0, -1);
    }
    for (let i = 0; i < segments; i++) {
      indices.push(botCenter, botCenter + 1 + ((i + 1) % segments), botCenter + 1 + i);
    }

    const col = color ?? COLORS.tool;
    const colors: number[] = [];
    const vertCount = vertices.length / 3;
    for (let i = 0; i < vertCount; i++) colors.push(col.r, col.g, col.b, col.a ?? 1);

    return { id, name, vertices, normals, indices, colors };
  }

  /** Generate toolpath visualization from simulation moves */
  generateToolpathVis(
    moves: Array<{ move_type: string; start: Vec3; end: Vec3; feed_rate?: number; spindle_rpm?: number; tool_id?: string }>,
    colorMode: ColorMode = "by_type"
  ): ToolpathLineData {
    const segments: ToolpathLineData["segments"] = [];

    // Compute ranges for gradient coloring
    const feeds = moves.filter(m => m.feed_rate).map(m => m.feed_rate!);
    const rpms = moves.filter(m => m.spindle_rpm).map(m => m.spindle_rpm!);
    const minFeed = Math.min(...feeds, 0), maxFeed = Math.max(...feeds, 1);
    const minRpm = Math.min(...rpms, 0), maxRpm = Math.max(...rpms, 1);

    let totalPoints = 0;

    for (const move of moves) {
      const type = move.move_type === "G0" ? "rapid" : move.move_type === "G2" ? "arc_cw" : move.move_type === "G3" ? "arc_ccw" : "feed";

      let color: Color;
      switch (colorMode) {
        case "by_type":
          color = type === "rapid" ? COLORS.rapid : type === "feed" ? COLORS.feed : type.startsWith("arc") ? COLORS.arc : COLORS.plunge;
          break;
        case "by_feed": {
          const t = maxFeed > minFeed ? ((move.feed_rate ?? 0) - minFeed) / (maxFeed - minFeed) : 0.5;
          color = { r: t, g: 0.3, b: 1 - t };
          break;
        }
        case "by_speed": {
          const t = maxRpm > minRpm ? ((move.spindle_rpm ?? 0) - minRpm) / (maxRpm - minRpm) : 0.5;
          color = { r: t, g: 1 - t, b: 0.2 };
          break;
        }
        default:
          color = COLORS.feed;
      }

      segments.push({
        type: type as any,
        points: [move.start.x, move.start.y, move.start.z, move.end.x, move.end.y, move.end.z],
        color,
        line_width: type === "rapid" ? 1 : 2,
        feed_rate: move.feed_rate,
        spindle_rpm: move.spindle_rpm,
        tool_id: move.tool_id,
      });
      totalPoints += 2;
    }

    return { id: "toolpath_main", segments, total_points: totalPoints };
  }

  /** Generate a heatmap color configuration */
  generateHeatmap(type: HeatmapConfig["type"], min: number, max: number, unit: string): HeatmapConfig {
    const range = max - min;
    return {
      type,
      min_value: min,
      max_value: max,
      unit,
      color_stops: [
        { value: min, color: { r: 0, g: 0, b: 1 } },              // blue (cool)
        { value: min + range * 0.25, color: { r: 0, g: 1, b: 1 } }, // cyan
        { value: min + range * 0.5, color: { r: 0, g: 1, b: 0 } },  // green
        { value: min + range * 0.75, color: { r: 1, g: 1, b: 0 } }, // yellow
        { value: max, color: { r: 1, g: 0, b: 0 } },                // red (hot)
      ],
    };
  }

  /** Build a complete scene graph for machining visualization */
  buildScene(input: {
    stock?: { width: number; height: number; depth: number; position?: Vec3 };
    toolpath?: ToolpathLineData;
    tool?: { diameter: number; length: number; holder_diameter?: number; holder_length?: number };
    view?: ViewPreset;
    show_grid?: boolean;
    show_axes?: boolean;
    background?: Color;
  }): SceneGraph {
    const children: SceneNode[] = [];

    // Stock
    if (input.stock) {
      const stockMesh = this.generateBoxMesh("stock", "Workpiece Stock", input.stock.width, input.stock.height, input.stock.depth, COLORS.stock);
      children.push({
        id: "stock_node",
        name: "Stock",
        type: "mesh",
        visible: true,
        transform: {
          position: input.stock.position ?? { x: 0, y: 0, z: -input.stock.depth / 2 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        mesh: stockMesh,
        render_mode: "transparent",
        opacity: 0.3,
      });
    }

    // Toolpath
    if (input.toolpath) {
      children.push({
        id: "toolpath_node",
        name: "Toolpath",
        type: "toolpath",
        visible: true,
        transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        toolpath: input.toolpath,
      });
    }

    // Tool
    if (input.tool) {
      const toolMesh = this.generateCylinderMesh("tool_cutting", "Cutting Tool", input.tool.diameter / 2, input.tool.length, 24, COLORS.tool);
      const toolChildren: SceneNode[] = [{
        id: "tool_cutting_node",
        name: "Cutting Portion",
        type: "mesh",
        visible: true,
        transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        mesh: toolMesh,
      }];

      if (input.tool.holder_diameter && input.tool.holder_length) {
        const holderMesh = this.generateCylinderMesh("tool_holder", "Tool Holder", input.tool.holder_diameter / 2, input.tool.holder_length, 24, COLORS.holder);
        toolChildren.push({
          id: "tool_holder_node",
          name: "Holder",
          type: "mesh",
          visible: true,
          transform: { position: { x: 0, y: 0, z: input.tool.length / 2 + input.tool.holder_length / 2 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
          mesh: holderMesh,
        });
      }

      children.push({
        id: "tool_assembly",
        name: "Tool Assembly",
        type: "group",
        visible: true,
        transform: { position: { x: 0, y: 0, z: 50 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        children: toolChildren,
      });
    }

    const viewPreset = input.view ?? "iso";
    const camera = this.getCamera(viewPreset);

    return {
      id: "machining_scene",
      name: "CNC Machining Visualization",
      root: {
        id: "root",
        name: "Scene Root",
        type: "group",
        visible: true,
        transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        children,
      },
      camera,
      lights: [
        { type: "ambient", color: { r: 0.4, g: 0.4, b: 0.4 }, intensity: 0.6 },
        { type: "directional", color: { r: 1, g: 1, b: 0.95 }, intensity: 0.8, position: { x: 200, y: -300, z: 400 }, target: { x: 0, y: 0, z: 0 } },
        { type: "directional", color: { r: 0.6, g: 0.6, b: 0.7 }, intensity: 0.3, position: { x: -100, y: 200, z: 100 }, target: { x: 0, y: 0, z: 0 } },
      ],
      background: input.background ?? { r: 0.15, g: 0.15, b: 0.18 },
      grid: { visible: input.show_grid !== false, size: 500, divisions: 50, color: { r: 0.3, g: 0.3, b: 0.3 } },
      axes: { visible: input.show_axes !== false, size: 100 },
      clipping_planes: [],
    };
  }

  /** Map a scalar value to heatmap color */
  valueToColor(value: number, heatmap: HeatmapConfig): Color {
    if (value <= heatmap.min_value) return heatmap.color_stops[0].color;
    if (value >= heatmap.max_value) return heatmap.color_stops[heatmap.color_stops.length - 1].color;

    for (let i = 0; i < heatmap.color_stops.length - 1; i++) {
      const a = heatmap.color_stops[i];
      const b = heatmap.color_stops[i + 1];
      if (value >= a.value && value <= b.value) {
        const t = (value - a.value) / (b.value - a.value);
        return {
          r: a.color.r + (b.color.r - a.color.r) * t,
          g: a.color.g + (b.color.g - a.color.g) * t,
          b: a.color.b + (b.color.b - a.color.b) * t,
        };
      }
    }

    return heatmap.color_stops[0].color;
  }

  /** Get available view presets */
  listViewPresets(): Array<{ preset: ViewPreset; label: string }> {
    return [
      { preset: "front", label: "Front (XZ)" },
      { preset: "back", label: "Back (-XZ)" },
      { preset: "top", label: "Top (XY)" },
      { preset: "bottom", label: "Bottom (-XY)" },
      { preset: "left", label: "Left (YZ)" },
      { preset: "right", label: "Right (-YZ)" },
      { preset: "iso", label: "Isometric" },
      { preset: "iso_rear", label: "Isometric Rear" },
    ];
  }
}

export const visualizationEngine = new VisualizationEngine();
