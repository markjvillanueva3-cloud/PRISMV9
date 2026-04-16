/**
 * L9-P2-MS1 P0-U02: Scene Graph Parser
 *
 * Converts VisualizationEngine JSON scene graph into Three.js objects:
 *   SceneNode (mesh)     → THREE.Mesh with BufferGeometry
 *   SceneNode (toolpath) → THREE.LineSegments with per-vertex colors
 *   SceneNode (group)    → THREE.Group with children
 *
 * All geometry uses BufferGeometry for GPU efficiency.
 */
import {
  BufferGeometry,
  Color as ThreeColor,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  type Material,
  type Object3D,
} from 'three';
import type {
  SceneGraph,
  SceneNode,
  MeshData,
  ToolpathLineData,
  Color,
  RenderMode,
} from '../types/viewer';

// ── Color Conversion ─────────────────────────────────────────────────

export function colorToThree(c: Color): ThreeColor {
  return new ThreeColor(c.r, c.g, c.b);
}

// ── Mesh Parsing ─────────────────────────────────────────────────────

/** Convert MeshData JSON to THREE.BufferGeometry */
export function parseMeshGeometry(mesh: MeshData): BufferGeometry {
  const geom = new BufferGeometry();

  geom.setAttribute(
    'position',
    new Float32BufferAttribute(mesh.vertices, 3)
  );
  geom.setAttribute(
    'normal',
    new Float32BufferAttribute(mesh.normals, 3)
  );
  geom.setIndex(mesh.indices);

  if (mesh.colors && mesh.colors.length > 0) {
    geom.setAttribute(
      'color',
      new Float32BufferAttribute(mesh.colors, 4)
    );
  }

  if (mesh.uvs && mesh.uvs.length > 0) {
    geom.setAttribute(
      'uv',
      new Float32BufferAttribute(mesh.uvs, 2)
    );
  }

  geom.computeBoundingSphere();
  return geom;
}

/** Create material based on render mode */
function createMeshMaterial(
  node: SceneNode
): Material {
  const color = node.color
    ? colorToThree(node.color)
    : new ThreeColor(0.6, 0.6, 0.65);
  const opacity = node.opacity ?? 1;
  const mode: RenderMode = node.render_mode ?? 'solid';

  switch (mode) {
    case 'wireframe':
      return new MeshBasicMaterial({
        color,
        wireframe: true,
        opacity,
        transparent: opacity < 1,
      });
    case 'transparent':
    case 'xray':
      return new MeshPhongMaterial({
        color,
        opacity: mode === 'xray' ? 0.15 : opacity,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
        vertexColors: !!node.mesh?.colors,
      });
    case 'hidden_line':
      return new MeshBasicMaterial({
        color,
        wireframe: true,
        opacity: 0.5,
        transparent: true,
      });
    case 'solid':
    default:
      return new MeshPhongMaterial({
        color,
        opacity,
        transparent: opacity < 1,
        side: FrontSide,
        vertexColors: !!node.mesh?.colors,
      });
  }
}

/** Parse a mesh SceneNode into a THREE.Mesh */
export function parseMeshNode(node: SceneNode): Mesh | null {
  if (!node.mesh) return null;

  const geometry = parseMeshGeometry(node.mesh);
  const material = createMeshMaterial(node);
  const mesh = new Mesh(geometry, material);

  mesh.name = node.name;
  mesh.userData = { sceneNodeId: node.id, metadata: node.metadata };
  mesh.visible = node.visible;

  applyTransform(mesh, node);
  return mesh;
}

// ── Toolpath Parsing ─────────────────────────────────────────────────

/** Parse a toolpath SceneNode into THREE.LineSegments */
export function parseToolpathNode(
  node: SceneNode
): LineSegments | null {
  if (!node.toolpath) return null;

  const { positions, colors } = buildToolpathArrays(node.toolpath);

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute(
    'color',
    new Float32BufferAttribute(colors, 3)
  );
  geometry.computeBoundingSphere();

  const material = new LineBasicMaterial({
    vertexColors: true,
    linewidth: 1,
  });

  const lines = new LineSegments(geometry, material);
  lines.name = node.name;
  lines.userData = {
    sceneNodeId: node.id,
    toolpath: node.toolpath,
    metadata: node.metadata,
  };
  lines.visible = node.visible;

  applyTransform(lines, node);
  return lines;
}

/** Build flat position/color arrays from toolpath segments */
export function buildToolpathArrays(toolpath: ToolpathLineData): {
  positions: number[];
  colors: number[];
  segmentTypes: string[];
} {
  const positions: number[] = [];
  const colors: number[] = [];
  const segmentTypes: string[] = [];

  for (const seg of toolpath.segments) {
    const pts = seg.points;
    // Each segment has pairs of points; build line segments
    for (let i = 0; i < pts.length - 3; i += 3) {
      positions.push(
        pts[i], pts[i + 1], pts[i + 2],
        pts[i + 3], pts[i + 4], pts[i + 5]
      );
      colors.push(
        seg.color.r, seg.color.g, seg.color.b,
        seg.color.r, seg.color.g, seg.color.b
      );
      segmentTypes.push(seg.type);
    }
  }

  return { positions, colors, segmentTypes };
}

// ── Scene Node Tree ──────────────────────────────────────────────────

/** Recursively parse a SceneNode tree into Three.js Object3D hierarchy */
export function parseSceneNode(
  node: SceneNode
): Object3D | null {
  let obj: Object3D | null = null;

  switch (node.type) {
    case 'mesh':
      obj = parseMeshNode(node);
      break;
    case 'toolpath':
      obj = parseToolpathNode(node);
      break;
    case 'group':
      obj = new Group();
      obj.name = node.name;
      obj.visible = node.visible;
      obj.userData = {
        sceneNodeId: node.id,
        metadata: node.metadata,
      };
      applyTransform(obj, node);
      break;
    default:
      // point_cloud, annotation — skip for now
      return null;
  }

  if (!obj) return null;

  // Recurse children
  if (node.children) {
    for (const child of node.children) {
      const childObj = parseSceneNode(child);
      if (childObj) obj.add(childObj);
    }
  }

  return obj;
}

/** Parse a full SceneGraph into a Three.js Group */
export function parseSceneGraph(
  scene: SceneGraph
): Group {
  const group = new Group();
  group.name = scene.name;
  group.userData = { sceneId: scene.id };

  const root = parseSceneNode(scene.root);
  if (root) group.add(root);

  return group;
}

// ── Transform Helper ─────────────────────────────────────────────────

function applyTransform(
  obj: Object3D,
  node: SceneNode
): void {
  const { position, rotation, scale } = node.transform;
  obj.position.set(position.x, position.y, position.z);
  // VisualizationEngine uses degrees; Three.js uses radians
  obj.rotation.set(
    (rotation.x * Math.PI) / 180,
    (rotation.y * Math.PI) / 180,
    (rotation.z * Math.PI) / 180
  );
  obj.scale.set(scale.x, scale.y, scale.z);
}

// ── Utility: Count objects in parsed scene ───────────────────────────

export function countSceneObjects(
  obj: Object3D
): { meshes: number; lines: number; groups: number } {
  let meshes = 0, lines = 0, groups = 0;

  obj.traverse((child) => {
    if (child instanceof Mesh) meshes++;
    else if (child instanceof LineSegments) lines++;
    else if (child instanceof Group) groups++;
  });

  return { meshes, lines, groups };
}
