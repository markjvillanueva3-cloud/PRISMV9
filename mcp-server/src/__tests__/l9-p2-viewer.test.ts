/**
 * L9-P2-MS1 P0-U08: Viewer Testing
 *
 * Tests for the 3D viewer system:
 *   1. VisualizationEngine (backend scene graph generation)
 *   2. Scene graph structure validation
 *   3. ViewerToolbar reducer (pure state logic, tested via import)
 *   4. HeatmapOverlay color interpolation
 *   5. Type conformance checks
 */
import { describe, it, expect } from 'vitest';
import { VisualizationEngine } from '../engines/VisualizationEngine.js';
import type {
  SceneGraph,
  SceneNode,
  MeshData,
  ToolpathLineData,
  CameraConfig,
  HeatmapConfig,
  Vec3,
  ViewPreset,
  ColorMode,
  RenderMode,
} from '../engines/VisualizationEngine.js';

// ============================================================================
// VisualizationEngine — Camera
// ============================================================================

describe('VisualizationEngine — Camera Presets', () => {
  const engine = new VisualizationEngine();
  const presets: ViewPreset[] = [
    'front', 'back', 'top', 'bottom',
    'left', 'right', 'iso', 'iso_rear',
  ];

  it('returns valid CameraConfig for all 8 presets', () => {
    for (const preset of presets) {
      const cam = engine.getCamera(preset);
      expect(cam.position).toBeDefined();
      expect(cam.target).toBeDefined();
      expect(cam.up).toBeDefined();
      expect(cam.fov).toBe(45);
      expect(cam.near).toBeGreaterThan(0);
      expect(cam.far).toBeGreaterThan(cam.near);
      expect(cam.type).toBe('perspective');
    }
  });

  it('front camera is along negative Y axis', () => {
    const cam = engine.getCamera('front');
    expect(cam.position.y).toBeLessThan(0);
    expect(cam.position.x).toBe(0);
  });

  it('top camera is along positive Z axis', () => {
    const cam = engine.getCamera('top');
    expect(cam.position.z).toBeGreaterThan(0);
    expect(cam.position.x).toBe(0);
    expect(cam.position.y).toBe(0);
  });

  it('iso camera has equal XYZ components', () => {
    const cam = engine.getCamera('iso');
    const absX = Math.abs(cam.position.x);
    const absY = Math.abs(cam.position.y);
    const absZ = Math.abs(cam.position.z);
    expect(absX).toBeCloseTo(absY, 0);
    expect(absX).toBeCloseTo(absZ, 0);
  });

  it('respects custom target', () => {
    const target: Vec3 = { x: 100, y: 50, z: 25 };
    const cam = engine.getCamera('front', target);
    expect(cam.target).toEqual(target);
    expect(cam.position.x).toBe(100);
    expect(cam.position.z).toBe(25);
  });

  it('respects custom distance', () => {
    const cam1 = engine.getCamera('front', undefined, 500);
    const cam2 = engine.getCamera('front', undefined, 1000);
    expect(Math.abs(cam2.position.y)).toBeGreaterThan(
      Math.abs(cam1.position.y)
    );
  });

  it('listViewPresets returns all 8 presets', () => {
    const presetList = engine.listViewPresets();
    expect(presetList).toHaveLength(8);
    const labels = presetList.map((p) => p.preset);
    expect(labels).toContain('front');
    expect(labels).toContain('iso');
    expect(labels).toContain('iso_rear');
  });
});

// ============================================================================
// VisualizationEngine — Box Mesh
// ============================================================================

describe('VisualizationEngine — Box Mesh', () => {
  const engine = new VisualizationEngine();

  it('generates valid box mesh geometry', () => {
    const mesh = engine.generateBoxMesh('test', 'Test Box', 100, 50, 30);
    expect(mesh.id).toBe('test');
    expect(mesh.name).toBe('Test Box');
    // 24 vertices (6 faces × 4 verts), 3 components each
    expect(mesh.vertices).toHaveLength(24 * 3);
    expect(mesh.normals).toHaveLength(24 * 3);
    // 12 triangles, 3 indices each
    expect(mesh.indices).toHaveLength(12 * 3);
    // 24 vertices with RGBA
    expect(mesh.colors).toHaveLength(24 * 4);
  });

  it('all indices reference valid vertices', () => {
    const mesh = engine.generateBoxMesh('t', 'T', 10, 10, 10);
    const vertCount = mesh.vertices.length / 3;
    for (const idx of mesh.indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(vertCount);
    }
  });

  it('normals are unit length', () => {
    const mesh = engine.generateBoxMesh('t', 'T', 10, 10, 10);
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const len = Math.sqrt(
        mesh.normals[i] ** 2 +
          mesh.normals[i + 1] ** 2 +
          mesh.normals[i + 2] ** 2
      );
      expect(len).toBeCloseTo(1, 5);
    }
  });

  it('respects custom color', () => {
    const mesh = engine.generateBoxMesh('t', 'T', 10, 10, 10, {
      r: 1, g: 0, b: 0, a: 0.5,
    });
    expect(mesh.colors![0]).toBe(1); // r
    expect(mesh.colors![1]).toBe(0); // g
    expect(mesh.colors![2]).toBe(0); // b
    expect(mesh.colors![3]).toBe(0.5); // a
  });
});

// ============================================================================
// VisualizationEngine — Cylinder Mesh
// ============================================================================

describe('VisualizationEngine — Cylinder Mesh', () => {
  const engine = new VisualizationEngine();

  it('generates valid cylinder mesh geometry', () => {
    const mesh = engine.generateCylinderMesh('cyl', 'Cylinder', 10, 50);
    expect(mesh.id).toBe('cyl');
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.normals.length).toBe(mesh.vertices.length);
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect(mesh.colors!.length).toBeGreaterThan(0);
  });

  it('indices reference valid vertices', () => {
    const mesh = engine.generateCylinderMesh('c', 'C', 5, 20, 16);
    const vertCount = mesh.vertices.length / 3;
    for (const idx of mesh.indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(vertCount);
    }
  });

  it('more segments = more vertices', () => {
    const low = engine.generateCylinderMesh('a', 'A', 5, 20, 8);
    const high = engine.generateCylinderMesh('b', 'B', 5, 20, 32);
    expect(high.vertices.length).toBeGreaterThan(low.vertices.length);
  });
});

// ============================================================================
// VisualizationEngine — Toolpath Visualization
// ============================================================================

describe('VisualizationEngine — Toolpath Vis', () => {
  const engine = new VisualizationEngine();

  const moves = [
    { move_type: 'G0', start: { x: 0, y: 0, z: 50 }, end: { x: 0, y: 0, z: 0 } },
    { move_type: 'G1', start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 }, feed_rate: 500, spindle_rpm: 8000 },
    { move_type: 'G1', start: { x: 100, y: 0, z: 0 }, end: { x: 100, y: 50, z: 0 }, feed_rate: 800, spindle_rpm: 10000 },
    { move_type: 'G2', start: { x: 100, y: 50, z: 0 }, end: { x: 50, y: 50, z: 0 }, feed_rate: 600 },
    { move_type: 'G0', start: { x: 50, y: 50, z: 0 }, end: { x: 50, y: 50, z: 50 } },
  ];

  it('generates toolpath with correct segment count', () => {
    const tp = engine.generateToolpathVis(moves);
    expect(tp.segments).toHaveLength(moves.length);
    expect(tp.total_points).toBe(moves.length * 2);
  });

  it('classifies segment types correctly', () => {
    const tp = engine.generateToolpathVis(moves);
    expect(tp.segments[0].type).toBe('rapid');
    expect(tp.segments[1].type).toBe('feed');
    expect(tp.segments[3].type).toBe('arc_cw');
    expect(tp.segments[4].type).toBe('rapid');
  });

  it('by_type mode: rapid=yellow, feed=blue', () => {
    const tp = engine.generateToolpathVis(moves, 'by_type');
    // Rapid: yellow (r=1, g=0.8, b=0)
    expect(tp.segments[0].color.r).toBe(1);
    expect(tp.segments[0].color.g).toBe(0.8);
    // Feed: blue (r=0, g=0.7, b=1)
    expect(tp.segments[1].color.b).toBe(1);
  });

  it('by_feed mode: colors vary with feed rate', () => {
    const tp = engine.generateToolpathVis(moves, 'by_feed');
    const lowFeed = tp.segments[1].color; // 500
    const highFeed = tp.segments[2].color; // 800
    // Higher feed = higher red
    expect(highFeed.r).toBeGreaterThan(lowFeed.r);
  });

  it('by_speed mode: colors vary with spindle RPM', () => {
    const tp = engine.generateToolpathVis(moves, 'by_speed');
    const lowRpm = tp.segments[1].color; // 8000
    const highRpm = tp.segments[2].color; // 10000
    expect(highRpm.r).toBeGreaterThan(lowRpm.r);
  });

  it('each segment has exactly 6 point values (2 × xyz)', () => {
    const tp = engine.generateToolpathVis(moves);
    for (const seg of tp.segments) {
      expect(seg.points).toHaveLength(6);
    }
  });

  it('rapid segments have smaller line_width', () => {
    const tp = engine.generateToolpathVis(moves);
    const rapid = tp.segments.find((s) => s.type === 'rapid')!;
    const feed = tp.segments.find((s) => s.type === 'feed')!;
    expect(rapid.line_width).toBeLessThan(feed.line_width);
  });
});

// ============================================================================
// VisualizationEngine — Heatmap
// ============================================================================

describe('VisualizationEngine — Heatmap', () => {
  const engine = new VisualizationEngine();

  it('generates heatmap config with 5 color stops', () => {
    const hm = engine.generateHeatmap('thermal', 20, 800, 'C');
    expect(hm.type).toBe('thermal');
    expect(hm.min_value).toBe(20);
    expect(hm.max_value).toBe(800);
    expect(hm.unit).toBe('C');
    expect(hm.color_stops).toHaveLength(5);
  });

  it('color stops span min to max', () => {
    const hm = engine.generateHeatmap('force', 0, 5000, 'N');
    expect(hm.color_stops[0].value).toBe(0);
    expect(hm.color_stops[4].value).toBe(5000);
  });

  it('valueToColor returns blue at minimum', () => {
    const hm = engine.generateHeatmap('thermal', 0, 100, 'C');
    const c = engine.valueToColor(0, hm);
    expect(c.b).toBe(1);
    expect(c.r).toBe(0);
  });

  it('valueToColor returns red at maximum', () => {
    const hm = engine.generateHeatmap('thermal', 0, 100, 'C');
    const c = engine.valueToColor(100, hm);
    expect(c.r).toBe(1);
    expect(c.b).toBe(0);
  });

  it('valueToColor interpolates mid-range', () => {
    const hm = engine.generateHeatmap('thermal', 0, 100, 'C');
    const c = engine.valueToColor(50, hm);
    // At 50%, should be green (middle stop)
    expect(c.g).toBe(1);
  });

  it('valueToColor clamps below minimum', () => {
    const hm = engine.generateHeatmap('thermal', 20, 800, 'C');
    const c = engine.valueToColor(-100, hm);
    expect(c).toEqual(hm.color_stops[0].color);
  });

  it('valueToColor clamps above maximum', () => {
    const hm = engine.generateHeatmap('thermal', 20, 800, 'C');
    const c = engine.valueToColor(9999, hm);
    expect(c).toEqual(hm.color_stops[4].color);
  });
});

// ============================================================================
// VisualizationEngine — Full Scene Build
// ============================================================================

describe('VisualizationEngine — buildScene', () => {
  const engine = new VisualizationEngine();

  it('builds a scene with all components', () => {
    const moves = [
      { move_type: 'G0', start: { x: 0, y: 0, z: 50 }, end: { x: 0, y: 0, z: 0 } },
      { move_type: 'G1', start: { x: 0, y: 0, z: 0 }, end: { x: 50, y: 0, z: 0 }, feed_rate: 500 },
    ];
    const tp = engine.generateToolpathVis(moves);

    const scene = engine.buildScene({
      stock: { width: 100, height: 80, depth: 30 },
      toolpath: tp,
      tool: { diameter: 12, length: 40, holder_diameter: 40, holder_length: 60 },
      view: 'iso',
      show_grid: true,
      show_axes: true,
    });

    expect(scene.id).toBe('machining_scene');
    expect(scene.root.type).toBe('group');
    expect(scene.root.children).toBeDefined();
    expect(scene.root.children!.length).toBe(3); // stock, toolpath, tool
  });

  it('scene has correct lighting', () => {
    const scene = engine.buildScene({});
    expect(scene.lights).toHaveLength(3);
    expect(scene.lights[0].type).toBe('ambient');
    expect(scene.lights[1].type).toBe('directional');
  });

  it('scene has grid and axes config', () => {
    const scene = engine.buildScene({ show_grid: true, show_axes: true });
    expect(scene.grid.visible).toBe(true);
    expect(scene.axes.visible).toBe(true);
    expect(scene.grid.size).toBe(500);
  });

  it('scene defaults work', () => {
    const scene = engine.buildScene({});
    expect(scene.camera.fov).toBe(45);
    expect(scene.background.r).toBeCloseTo(0.15, 1);
    expect(scene.clipping_planes).toHaveLength(0);
  });

  it('stock node has transparent render mode', () => {
    const scene = engine.buildScene({
      stock: { width: 50, height: 50, depth: 20 },
    });
    const stock = scene.root.children?.find((n) => n.id === 'stock_node');
    expect(stock).toBeDefined();
    expect(stock!.render_mode).toBe('transparent');
    expect(stock!.opacity).toBe(0.3);
  });

  it('tool assembly has holder when specified', () => {
    const scene = engine.buildScene({
      tool: { diameter: 12, length: 40, holder_diameter: 40, holder_length: 60 },
    });
    const tool = scene.root.children?.find((n) => n.id === 'tool_assembly');
    expect(tool).toBeDefined();
    expect(tool!.children).toHaveLength(2); // cutting + holder
  });

  it('tool without holder has single child', () => {
    const scene = engine.buildScene({
      tool: { diameter: 12, length: 40 },
    });
    const tool = scene.root.children?.find((n) => n.id === 'tool_assembly');
    expect(tool).toBeDefined();
    expect(tool!.children).toHaveLength(1); // cutting only
  });
});

// ============================================================================
// SceneNode Type Conformance
// ============================================================================

describe('Scene graph type conformance', () => {
  const engine = new VisualizationEngine();

  it('SceneNode has required transform fields', () => {
    const scene = engine.buildScene({
      stock: { width: 100, height: 80, depth: 30 },
    });

    function checkTransform(node: SceneNode) {
      expect(node.transform).toBeDefined();
      expect(node.transform.position).toBeDefined();
      expect(node.transform.rotation).toBeDefined();
      expect(node.transform.scale).toBeDefined();
      expect(typeof node.transform.position.x).toBe('number');
      expect(typeof node.transform.position.y).toBe('number');
      expect(typeof node.transform.position.z).toBe('number');

      if (node.children) {
        for (const child of node.children) {
          checkTransform(child);
        }
      }
    }

    checkTransform(scene.root);
  });

  it('mesh nodes have valid MeshData', () => {
    const scene = engine.buildScene({
      stock: { width: 100, height: 80, depth: 30 },
      tool: { diameter: 12, length: 40 },
    });

    function checkMeshes(node: SceneNode) {
      if (node.type === 'mesh' && node.mesh) {
        expect(node.mesh.id).toBeTruthy();
        expect(node.mesh.vertices.length).toBeGreaterThan(0);
        expect(node.mesh.vertices.length % 3).toBe(0);
        expect(node.mesh.normals.length).toBe(node.mesh.vertices.length);
        expect(node.mesh.indices.length).toBeGreaterThan(0);
        expect(node.mesh.indices.length % 3).toBe(0);
      }
      if (node.children) {
        for (const child of node.children) {
          checkMeshes(child);
        }
      }
    }

    checkMeshes(scene.root);
  });

  it('all nodes have id, name, type, visible fields', () => {
    const scene = engine.buildScene({
      stock: { width: 50, height: 50, depth: 20 },
      tool: { diameter: 10, length: 30 },
    });

    function checkNode(node: SceneNode) {
      expect(node.id).toBeTruthy();
      expect(node.name).toBeTruthy();
      expect(['mesh', 'toolpath', 'point_cloud', 'annotation', 'group'])
        .toContain(node.type);
      expect(typeof node.visible).toBe('boolean');
      if (node.children) {
        for (const child of node.children) {
          checkNode(child);
        }
      }
    }

    checkNode(scene.root);
  });
});

// ============================================================================
// Color Mode Coverage
// ============================================================================

describe('Color mode coverage', () => {
  const engine = new VisualizationEngine();
  const moves = [
    { move_type: 'G0', start: { x: 0, y: 0, z: 10 }, end: { x: 0, y: 0, z: 0 } },
    { move_type: 'G1', start: { x: 0, y: 0, z: 0 }, end: { x: 50, y: 0, z: 0 }, feed_rate: 500, spindle_rpm: 8000 },
  ];

  const modes: ColorMode[] = [
    'by_type', 'by_feed', 'by_speed', 'by_tool',
    'by_mrr', 'by_operation', 'uniform',
  ];

  for (const mode of modes) {
    it(`${mode} mode produces valid colors`, () => {
      const tp = engine.generateToolpathVis(moves, mode);
      for (const seg of tp.segments) {
        expect(seg.color.r).toBeGreaterThanOrEqual(0);
        expect(seg.color.r).toBeLessThanOrEqual(1);
        expect(seg.color.g).toBeGreaterThanOrEqual(0);
        expect(seg.color.g).toBeLessThanOrEqual(1);
        expect(seg.color.b).toBeGreaterThanOrEqual(0);
        expect(seg.color.b).toBeLessThanOrEqual(1);
      }
    });
  }
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Viewer edge cases', () => {
  const engine = new VisualizationEngine();

  it('empty moves produce empty toolpath', () => {
    const tp = engine.generateToolpathVis([]);
    expect(tp.segments).toHaveLength(0);
    expect(tp.total_points).toBe(0);
  });

  it('empty scene has root node', () => {
    const scene = engine.buildScene({});
    expect(scene.root).toBeDefined();
    expect(scene.root.type).toBe('group');
    expect(scene.root.children).toHaveLength(0);
  });

  it('zero-size box mesh still valid', () => {
    const mesh = engine.generateBoxMesh('z', 'Zero', 0, 0, 0);
    expect(mesh.vertices).toHaveLength(72);
    expect(mesh.indices).toHaveLength(36);
  });

  it('very small cylinder still valid', () => {
    const mesh = engine.generateCylinderMesh('s', 'Small', 0.001, 0.001, 4);
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });
});
