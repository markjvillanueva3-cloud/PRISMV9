/**
 * PRISM MCP Server -- Adaptive Tessellation Engine
 *
 * Curvature-adaptive mesh tessellation:
 * - Quality presets (draft/standard/high/ultra/step_equivalent)
 * - Chord & angle tolerance-based segment calculation
 * - Midpoint subdivision with normal interpolation
 * - Target triangle estimation from surface area
 *
 * Ported from PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2.js (monolith R2.3.1).
 *
 * @module AdaptiveTessellationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface TessellationPreset {
  minSegments: number;
  maxSegments: number;
  chordTolerance: number;
  angleTolerance: number;
  preserveSharpEdges?: boolean;
  smoothShading?: boolean;
}

export interface TessellatedMesh {
  vertices: Float32Array;
  normals: Float32Array;
  indices: number[];
  statistics: { vertexCount: number; triangleCount: number };
}

export interface InputMesh {
  vertices: number[] | Float32Array;
  normals: number[] | Float32Array;
  indices: number[] | Uint32Array;
  boundingBox?: { min?: Vec3; max?: Vec3; dx?: number; dy?: number; dz?: number };
}

// ============================================================================
// ENGINE
// ============================================================================

class AdaptiveTessellationEngineImpl {

  readonly presets: Record<string, TessellationPreset> = {
    draft: { minSegments: 6, maxSegments: 24, chordTolerance: 0.1, angleTolerance: 30 },
    standard: { minSegments: 12, maxSegments: 48, chordTolerance: 0.02, angleTolerance: 15 },
    high: { minSegments: 24, maxSegments: 72, chordTolerance: 0.005, angleTolerance: 8 },
    ultra: { minSegments: 48, maxSegments: 144, chordTolerance: 0.001, angleTolerance: 4 },
    step_equivalent: { minSegments: 36, maxSegments: 96, chordTolerance: 0.002, angleTolerance: 5, preserveSharpEdges: true, smoothShading: true },
  };

  /** Calculate optimal segment count from curvature and tolerance. */
  calculateSegments(radius: number, arcLength: number, options: Partial<TessellationPreset> = {}): number {
    const { minSegments = 8, maxSegments = 72, chordTolerance = 0.02, angleTolerance = 15 } = options;
    if (radius <= 0 || arcLength <= 0) return minSegments;

    const fromChord = Math.ceil(arcLength / (2 * Math.sqrt(2 * radius * chordTolerance)));
    const angle = arcLength / radius;
    const fromAngle = Math.ceil(angle / (angleTolerance * Math.PI / 180));

    return Math.max(minSegments, Math.min(maxSegments, Math.max(fromChord, fromAngle)));
  }

  /** Estimate target triangle count for a quality level. */
  estimateTargetTriangles(mesh: InputMesh, options: TessellationPreset): number {
    let surfaceArea = 1000;
    if (mesh.boundingBox) {
      const bb = mesh.boundingBox;
      const dx = bb.dx ?? ((bb.max?.x ?? 100) - (bb.min?.x ?? 0));
      const dy = bb.dy ?? ((bb.max?.y ?? 100) - (bb.min?.y ?? 0));
      const dz = bb.dz ?? ((bb.max?.z ?? 100) - (bb.min?.z ?? 0));
      surfaceArea = 2 * (dx * dy + dx * dz + dy * dz);
    }
    return Math.ceil(surfaceArea * (0.1 / options.chordTolerance));
  }

  /** Refine mesh by midpoint subdivision if below target quality. */
  refine(mesh: InputMesh, targetQuality: string = "high"): TessellatedMesh | InputMesh {
    const options = this.presets[targetQuality] ?? this.presets.high;
    const currentTri = (mesh.indices?.length ?? 0) / 3;
    const targetTri = this.estimateTargetTriangles(mesh, options);
    if (currentTri >= targetTri * 0.9) return mesh;
    return this.subdivide(mesh);
  }

  /** Single-pass midpoint subdivision: each triangle becomes 4. */
  subdivide(mesh: InputMesh): TessellatedMesh {
    const oldV = mesh.vertices;
    const oldN = mesh.normals;
    const oldI = mesh.indices;

    const newV: number[] = [];
    const newN: number[] = [];
    const newI: number[] = [];

    for (let i = 0; i < oldI.length; i += 3) {
      const [i0, i1, i2] = [oldI[i], oldI[i + 1], oldI[i + 2]];

      const v0 = getV(oldV, i0), v1 = getV(oldV, i1), v2 = getV(oldV, i2);
      const n0 = getV(oldN, i0), n1 = getV(oldN, i1), n2 = getV(oldN, i2);

      const m01 = mid(v0, v1), m12 = mid(v1, v2), m20 = mid(v2, v0);
      const nm01 = norm(mid(n0, n1)), nm12 = norm(mid(n1, n2)), nm20 = norm(mid(n2, n0));

      const b = newV.length / 3;
      pushV(newV, v0); pushV(newV, v1); pushV(newV, v2);
      pushV(newV, m01); pushV(newV, m12); pushV(newV, m20);
      pushV(newN, n0); pushV(newN, n1); pushV(newN, n2);
      pushV(newN, nm01); pushV(newN, nm12); pushV(newN, nm20);

      newI.push(b, b + 3, b + 5);
      newI.push(b + 3, b + 1, b + 4);
      newI.push(b + 5, b + 4, b + 2);
      newI.push(b + 3, b + 4, b + 5);
    }
    return {
      vertices: new Float32Array(newV),
      normals: new Float32Array(newN),
      indices: newI,
      statistics: { vertexCount: newV.length / 3, triangleCount: newI.length / 3 },
    };
  }
}

function getV(arr: number[] | Float32Array | Uint32Array, i: number): Vec3 {
  return { x: arr[i * 3], y: arr[i * 3 + 1], z: arr[i * 3 + 2] };
}
function mid(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}
function norm(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-10) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
function pushV(arr: number[], v: Vec3): void {
  arr.push(v.x, v.y, v.z);
}

export const adaptiveTessellationEngine = new AdaptiveTessellationEngineImpl();
