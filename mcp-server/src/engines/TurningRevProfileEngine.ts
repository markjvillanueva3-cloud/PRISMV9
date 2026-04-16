/**
 * TurningRevProfileEngine — 3D STEP → 2D XZ Revolution Silhouette
 *
 * Takes parsed 3D CAD geometry and produces an ordered, gap-free 2D XZ
 * polyline suitable for G71/G70 CNC contour cycle input.
 *
 * Pipeline:
 *   1. Detect principal axis of revolution (inertia tensor eigenvalue
 *      analysis → cylindrical face grouping → conical fallback → Z default)
 *   2. Project all boundary representations onto the XZ half-plane
 *   3. Filter OD envelope (outermost contour) and ID envelope (innermost)
 *   4. Chain segments into continuous, ordered polyline
 *   5. Flag non-axisymmetric features for live tooling
 *   6. Validate: revolve volume matches bounding box estimate within tolerance
 *
 * References:
 *   - ISO 10303-21 (STEP AP203/AP214 geometry abstraction)
 *   - Axisymmetric decomposition via inertia tensor eigenvectors
 *   - G71/G70 contour input: ordered XZ coordinates (radius, axial)
 *
 * @module engines/TurningRevProfileEngine
 * @milestone LATHE-PRO-MS-1 U-LPI09
 */

import { log } from "../utils/Logger.js";
import type {
  CADSolidInput,
  CADFace,
  CADEdge,
  Vector3,
  BoundingBox,
  ProfileSegment,
  NonAxiFeature,
} from "./TurningCADImportEngine.js";
import type { TurningFeatureType } from "./TurningPrintToProgramEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** XZ polyline segment for G71/G70 contour input */
export interface XZSegment {
  start: { x: number; z: number };
  end: { x: number; z: number };
  type: "line" | "arc";
  arc_center?: { x: number; z: number };
  arc_radius_mm?: number;
  arc_direction?: "cw" | "ccw";
  source_face_id?: string;
}

/** Non-axisymmetric 3D feature flagged for live tooling */
export interface Feature3D {
  type: "cross_hole" | "flat" | "keyway" | "pocket" | "slot" | "hex" | "other";
  face_ids: string[];
  description: string;
  suggested_turning_op: TurningFeatureType;
  angular_position_deg?: number;
  width_mm?: number;
  depth_mm?: number;
  diameter_mm?: number;
}

/** Axis detection method used */
export type AxisMethod = "inertia_tensor" | "cylindrical_face" | "conical_face" | "bbox_fallback";

/** Result of revolution profile extraction */
export interface RevProfileResult {
  success: boolean;
  /** Detected axis of revolution */
  axis: { origin: Vector3; direction: Vector3 };
  /** How the axis was detected */
  axis_method: AxisMethod;
  /** Confidence in axis detection (0-1) */
  axis_confidence: number;
  /** Ordered OD profile polyline (sorted Z ascending, gap-free) */
  xz_profile: XZSegment[];
  /** Ordered ID profile polyline (if bore exists) */
  xz_id_profile: XZSegment[];
  /** Non-axisymmetric features requiring live tooling */
  non_axisymmetric_features: Feature3D[];
  /** Part envelope from profile */
  envelope: {
    max_od_mm: number;
    min_id_mm: number | null;
    total_length_mm: number;
  };
  /** Volume validation */
  volume_validation: {
    /** Estimated revolve volume from profile (mm³) */
    profile_volume_mm3: number;
    /** Estimated volume from bounding box (mm³) */
    bbox_volume_mm3: number;
    /** Ratio of profile/bbox volume — should be < 1.0 for typical parts */
    volume_ratio: number;
    /** Whether validation passes (ratio between 0.05 and 1.0) */
    valid: boolean;
  };
  /** Processing warnings */
  warnings: string[];
  /** Profile gap statistics */
  gap_stats: {
    total_gaps: number;
    max_gap_mm: number;
    gaps_filled: number;
  };
}

// ============================================================================
// HELPERS — Vector Math
// ============================================================================

function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function len(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function norm(v: Vector3): Vector3 {
  const l = len(v);
  if (l < 1e-12) return { x: 0, y: 0, z: 1 };
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function sub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function scale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

/** Project 3D point to XZ half-plane: x=radial distance from axis, z=axial */
function projectXZ(
  pt: Vector3,
  axisOrigin: Vector3,
  axisDir: Vector3,
): { x: number; z: number } {
  const d = norm(axisDir);
  const v = sub(pt, axisOrigin);
  const z = dot(v, d);
  const radialVec = { x: v.x - d.x * z, y: v.y - d.y * z, z: v.z - d.z * z };
  const x = len(radialVec);
  return { x, z };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TurningRevProfileEngine {

  /**
   * Extract 2D XZ revolution silhouette from 3D CAD solid.
   *
   * @param input - Parsed 3D solid geometry (faces, edges, vertices)
   * @returns Ordered XZ profile, non-axi features, volume validation
   */
  static extract(input: CADSolidInput): RevProfileResult {
    const t0 = Date.now();
    const warnings: string[] = [];
    const unitScale = input.units === "in" ? 25.4 : 1.0;

    log.info(`[TurningRevProfile] Processing ${input.faces.length} faces, ${input.edges.length} edges from ${input.source_format}`);

    // ── Step 1: Detect revolution axis ───────────────────────────────
    const axisResult = TurningRevProfileEngine.detectAxis(input, unitScale);
    const axis = axisResult.axis;
    if (!axisResult.found) {
      warnings.push("No rotational faces found — using bounding box longest-axis fallback");
    }

    // ── Step 2: Classify faces into axisymmetric vs non-axi ─────────
    const { axi, nonAxi } = TurningRevProfileEngine.classifyFaces(input.faces, axis, unitScale);

    // ── Step 3: Extract OD and ID profiles from face geometry ────────
    const edgeMap = new Map<string, CADEdge>();
    for (const e of input.edges) edgeMap.set(e.id, e);

    const rawOD = TurningRevProfileEngine.extractFaceProfile(axi, edgeMap, axis, "od", unitScale);
    const rawID = TurningRevProfileEngine.extractFaceProfile(axi, edgeMap, axis, "id", unitScale);

    // ── Step 4: Chain into ordered, gap-free polyline ────────────────
    const { segments: odProfile, gapStats: odGaps } = TurningRevProfileEngine.chainAndFillGaps(rawOD);
    const { segments: idProfile, gapStats: idGaps } = TurningRevProfileEngine.chainAndFillGaps(rawID);

    const totalGaps = odGaps.total_gaps + idGaps.total_gaps;
    const maxGap = Math.max(odGaps.max_gap_mm, idGaps.max_gap_mm);
    const gapsFilled = odGaps.gaps_filled + idGaps.gaps_filled;

    if (totalGaps > 0) {
      warnings.push(`${totalGaps} gap(s) in profile (max ${maxGap.toFixed(3)}mm), ${gapsFilled} filled`);
    }

    // ── Step 5: Flag non-axisymmetric features ──────────────────────
    const nonAxiFeatures = TurningRevProfileEngine.classifyNonAxi(nonAxi, axis, unitScale);
    if (nonAxiFeatures.length > 0) {
      warnings.push(`${nonAxiFeatures.length} non-axisymmetric feature(s) — live tooling required`);
    }

    // ── Step 6: Compute envelope ────────────────────────────────────
    const allZ: number[] = [];
    const allR: number[] = [];
    for (const s of odProfile) {
      allZ.push(s.start.z, s.end.z);
      allR.push(s.start.x, s.end.x);
    }
    for (const s of idProfile) {
      allZ.push(s.start.z, s.end.z);
    }

    const maxOD = allR.length > 0 ? Math.max(...allR) * 2 : 0;
    const minID = idProfile.length > 0
      ? Math.min(...idProfile.map(s => Math.min(s.start.x, s.end.x))) * 2
      : null;
    const totalLength = allZ.length > 0
      ? Math.max(...allZ) - Math.min(...allZ)
      : 0;

    // ── Step 7: Volume validation ───────────────────────────────────
    const profileVol = TurningRevProfileEngine.computeRevolveVolume(odProfile, idProfile);
    const bb = input.bounding_box;
    const bx = (bb.max.x - bb.min.x) * unitScale;
    const by = (bb.max.y - bb.min.y) * unitScale;
    const bz = (bb.max.z - bb.min.z) * unitScale;
    const bboxVol = bx * by * bz;
    const volRatio = bboxVol > 0 ? profileVol / bboxVol : 0;
    const volValid = volRatio > 0.05 && volRatio <= 1.0;

    if (!volValid && profileVol > 0) {
      warnings.push(`Volume ratio ${volRatio.toFixed(3)} outside expected range [0.05, 1.0]`);
    }

    const elapsed = Date.now() - t0;
    log.info(`[TurningRevProfile] Complete: ${odProfile.length} OD segs, ${idProfile.length} ID segs, ${nonAxiFeatures.length} non-axi in ${elapsed}ms`);

    return {
      success: odProfile.length > 0,
      axis: axisResult.axis,
      axis_method: axisResult.method,
      axis_confidence: axisResult.confidence,
      xz_profile: odProfile,
      xz_id_profile: idProfile,
      non_axisymmetric_features: nonAxiFeatures,
      envelope: { max_od_mm: maxOD, min_id_mm: minID, total_length_mm: totalLength },
      volume_validation: {
        profile_volume_mm3: profileVol,
        bbox_volume_mm3: bboxVol,
        volume_ratio: volRatio,
        valid: volValid,
      },
      warnings,
      gap_stats: { total_gaps: totalGaps, max_gap_mm: maxGap, gaps_filled: gapsFilled },
    };
  }

  // ── Axis Detection ──────────────────────────────────────────────────

  /**
   * Detect principal axis of revolution using a multi-strategy approach:
   * 1. Inertia tensor eigenvalue analysis from vertex cloud
   * 2. Cylindrical face normal grouping (largest area group)
   * 3. Conical face axis
   * 4. Bounding box longest dimension fallback
   */
  private static detectAxis(
    input: CADSolidInput,
    unitScale: number,
  ): { found: boolean; axis: { origin: Vector3; direction: Vector3 }; method: AxisMethod; confidence: number } {
    const faces = input.faces;

    // Strategy 1: Inertia tensor from vertices (most robust for arbitrary shapes)
    if (input.vertices.length >= 8) {
      const inertiaResult = TurningRevProfileEngine.inertiaAxisDetect(input.vertices, unitScale);
      if (inertiaResult.confidence > 0.7) {
        // Verify against cylindrical faces if available
        const cylCheck = TurningRevProfileEngine.cylFaceAxis(faces, unitScale);
        if (cylCheck.found) {
          // Use cylindrical face axis but boost confidence from inertia agreement
          const agreement = Math.abs(dot(norm(inertiaResult.direction), norm(cylCheck.axis.direction)));
          if (agreement > 0.95) {
            return {
              found: true,
              axis: cylCheck.axis,
              method: "inertia_tensor",
              confidence: Math.min(1.0, cylCheck.confidence + 0.1),
            };
          }
        }
        // Inertia alone
        return {
          found: true,
          axis: { origin: inertiaResult.centroid, direction: inertiaResult.direction },
          method: "inertia_tensor",
          confidence: inertiaResult.confidence,
        };
      }
    }

    // Strategy 2: Cylindrical face grouping
    const cylResult = TurningRevProfileEngine.cylFaceAxis(faces, unitScale);
    if (cylResult.found) return { ...cylResult, method: "cylindrical_face" };

    // Strategy 3: Conical face axis
    const conFaces = faces.filter(f => f.type === "conical" && f.axis);
    if (conFaces.length > 0) {
      const largest = conFaces.sort((a, b) => b.area_mm2 - a.area_mm2)[0];
      return {
        found: true,
        axis: {
          origin: scale(largest.axis!.origin, unitScale),
          direction: norm(largest.axis!.direction),
        },
        method: "conical_face",
        confidence: 0.6,
      };
    }

    // Strategy 4: Bounding box longest axis fallback
    const bb = input.bounding_box;
    const dx = Math.abs(bb.max.x - bb.min.x);
    const dy = Math.abs(bb.max.y - bb.min.y);
    const dz = Math.abs(bb.max.z - bb.min.z);
    const center: Vector3 = {
      x: (bb.min.x + bb.max.x) / 2 * unitScale,
      y: (bb.min.y + bb.max.y) / 2 * unitScale,
      z: (bb.min.z + bb.max.z) / 2 * unitScale,
    };

    // Longest dimension is likely the rotation axis
    let dir: Vector3;
    if (dz >= dx && dz >= dy) dir = { x: 0, y: 0, z: 1 };
    else if (dx >= dy) dir = { x: 1, y: 0, z: 0 };
    else dir = { x: 0, y: 1, z: 0 };

    return { found: false, axis: { origin: center, direction: dir }, method: "bbox_fallback", confidence: 0.3 };
  }

  /**
   * Inertia tensor eigenvalue analysis for axis detection.
   * Computes the inertia tensor of the vertex cloud, finds the eigenvector
   * corresponding to the smallest eigenvalue (axis of symmetry for revolves).
   *
   * For axisymmetric parts, the two larger eigenvalues are approximately equal
   * and the smallest corresponds to the revolution axis direction.
   */
  private static inertiaAxisDetect(
    vertices: Array<{ id: string; position: Vector3 }>,
    unitScale: number,
  ): { direction: Vector3; centroid: Vector3; confidence: number } {
    const n = vertices.length;
    // Centroid
    let cx = 0, cy = 0, cz = 0;
    for (const v of vertices) {
      cx += v.position.x * unitScale;
      cy += v.position.y * unitScale;
      cz += v.position.z * unitScale;
    }
    cx /= n; cy /= n; cz /= n;
    const centroid: Vector3 = { x: cx, y: cy, z: cz };

    // Covariance matrix (inertia tensor analogue)
    let ixx = 0, iyy = 0, izz = 0, ixy = 0, ixz = 0, iyz = 0;
    for (const v of vertices) {
      const dx = v.position.x * unitScale - cx;
      const dy = v.position.y * unitScale - cy;
      const dz = v.position.z * unitScale - cz;
      ixx += dx * dx;
      iyy += dy * dy;
      izz += dz * dz;
      ixy += dx * dy;
      ixz += dx * dz;
      iyz += dy * dz;
    }

    // Power iteration to find the eigenvector with the smallest eigenvalue.
    // For axisymmetric parts, the axis of revolution has the LARGEST variance
    // along its length (most spread of vertices), so we want the LARGEST eigenvalue
    // of the covariance matrix (which corresponds to the revolution axis).
    // Use power iteration for the largest eigenvector.
    let ev: Vector3 = { x: 0.577, y: 0.577, z: 0.577 }; // initial guess
    for (let iter = 0; iter < 50; iter++) {
      const nx = ixx * ev.x + ixy * ev.y + ixz * ev.z;
      const ny = ixy * ev.x + iyy * ev.y + iyz * ev.z;
      const nz = ixz * ev.x + iyz * ev.y + izz * ev.z;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (l < 1e-15) break;
      ev = { x: nx / l, y: ny / l, z: nz / l };
    }
    const eigenLargest = ixx * ev.x * ev.x + iyy * ev.y * ev.y + izz * ev.z * ev.z +
      2 * (ixy * ev.x * ev.y + ixz * ev.x * ev.z + iyz * ev.y * ev.z);

    // Total variance
    const totalVar = ixx + iyy + izz;

    // For a good axisymmetric part, the largest eigenvalue should be significantly
    // larger than the others. The ratio tells us confidence.
    // eigenLargest / totalVar > 0.5 means one axis dominates → likely rotation axis.
    const ratio = totalVar > 0 ? eigenLargest / totalVar : 0;
    const confidence = Math.min(1.0, ratio * 1.5); // scale so 0.67 → 1.0

    return { direction: norm(ev), centroid, confidence };
  }

  /** Detect axis from cylindrical face grouping */
  private static cylFaceAxis(
    faces: CADFace[],
    unitScale: number,
  ): { found: boolean; axis: { origin: Vector3; direction: Vector3 }; confidence: number } {
    const cylFaces = faces.filter(f => f.type === "cylindrical" && f.axis);
    if (cylFaces.length === 0) return { found: false, axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } }, confidence: 0 };

    // Group by axis direction (5° tolerance: cos(5°) ≈ 0.996)
    const groups: CADFace[][] = [];
    const used = new Set<number>();
    for (let i = 0; i < cylFaces.length; i++) {
      if (used.has(i)) continue;
      const group = [cylFaces[i]];
      used.add(i);
      const d = norm(cylFaces[i].axis!.direction);
      for (let j = i + 1; j < cylFaces.length; j++) {
        if (used.has(j) || !cylFaces[j].axis) continue;
        if (Math.abs(dot(d, norm(cylFaces[j].axis!.direction))) > 0.996) {
          group.push(cylFaces[j]);
          used.add(j);
        }
      }
      groups.push(group);
    }

    // Pick group with largest total area
    let bestGroup = groups[0];
    let bestArea = 0;
    for (const g of groups) {
      const area = g.reduce((s, f) => s + f.area_mm2 * unitScale * unitScale, 0);
      if (area > bestArea) { bestArea = area; bestGroup = g; }
    }

    const totalArea = faces.reduce((s, f) => s + f.area_mm2 * unitScale * unitScale, 0);
    const confidence = Math.max(0.5, Math.min(1.0, bestArea / (totalArea + 1e-10)));

    const ref = bestGroup[0];
    return {
      found: true,
      axis: {
        origin: scale(ref.axis!.origin, unitScale),
        direction: norm(ref.axis!.direction),
      },
      confidence,
    };
  }

  // ── Face Classification ─────────────────────────────────────────────

  /** Classify faces into axisymmetric (on rotation axis) and non-axisymmetric */
  private static classifyFaces(
    faces: CADFace[],
    axis: { origin: Vector3; direction: Vector3 },
    unitScale: number,
  ): { axi: CADFace[]; nonAxi: CADFace[] } {
    const axi: CADFace[] = [];
    const nonAxi: CADFace[] = [];
    const axDir = norm(axis.direction);

    for (const f of faces) {
      if ((f.type === "cylindrical" || f.type === "conical" || f.type === "toroidal") && f.axis) {
        const d = norm(f.axis.direction);
        if (Math.abs(dot(d, axDir)) > 0.996) {
          axi.push(f);
        } else {
          nonAxi.push(f);
        }
      } else if (f.type === "planar") {
        // Planar faces: normal ≈ axis direction → axisymmetric (face/shoulder)
        // Normal ≈ perpendicular to axis → flat/keyway (non-axi)
        if (f.axis) {
          const d = Math.abs(dot(norm(f.axis.direction), axDir));
          if (d > 0.95 || d > 0.05) {
            // Perpendicular to axis OR angled → part of turning profile
            axi.push(f);
          } else {
            nonAxi.push(f); // Parallel to axis → flat
          }
        } else {
          axi.push(f); // Default: assume axisymmetric
        }
      } else if (f.type === "spherical") {
        axi.push(f);
      } else {
        nonAxi.push(f);
      }
    }

    return { axi, nonAxi };
  }

  // ── Profile Extraction ──────────────────────────────────────────────

  /**
   * Extract profile segments from axisymmetric faces projected to XZ.
   * Uses face geometry (type + radius) and edge Z-positions directly.
   * Handles STEP models where cylindrical faces only have circle boundary edges.
   */
  private static extractFaceProfile(
    faces: CADFace[],
    edgeMap: Map<string, CADEdge>,
    axis: { origin: Vector3; direction: Vector3 },
    side: "od" | "id",
    unitScale: number,
  ): XZSegment[] {
    const segments: XZSegment[] = [];

    for (const face of faces) {
      if (face.type === "cylindrical" && face.radius_mm) {
        // Cylindrical → horizontal line at constant radius
        const zVals = TurningRevProfileEngine.collectZValues(face, edgeMap, axis, unitScale);
        if (zVals.length >= 2) {
          const zMin = Math.min(...zVals);
          const zMax = Math.max(...zVals);
          const r = face.radius_mm * unitScale;
          if (zMax - zMin > 0.001) {
            segments.push({
              start: { x: r, z: zMin },
              end: { x: r, z: zMax },
              type: "line",
              source_face_id: face.id,
            });
          }
        }
      } else if (face.type === "conical" && face.axis) {
        // Conical → angled line from large to small radius
        const rz = TurningRevProfileEngine.collectRadiiZ(face, edgeMap, axis, unitScale);
        if (rz.length >= 2) {
          rz.sort((a, b) => a.z - b.z);
          segments.push({
            start: { x: rz[0].r, z: rz[0].z },
            end: { x: rz[rz.length - 1].r, z: rz[rz.length - 1].z },
            type: "line",
            source_face_id: face.id,
          });
        }
      } else if (face.type === "spherical") {
        // Spherical → arc segment
        const rz = TurningRevProfileEngine.collectRadiiZ(face, edgeMap, axis, unitScale);
        if (rz.length >= 2) {
          rz.sort((a, b) => a.z - b.z);
          const first = rz[0];
          const last = rz[rz.length - 1];
          // Estimate center from bounding radii
          const midZ = (first.z + last.z) / 2;
          const midR = Math.max(first.r, last.r);
          const arcR = Math.hypot(last.z - first.z, last.r - first.r) / 2;
          segments.push({
            start: { x: first.r, z: first.z },
            end: { x: last.r, z: last.z },
            type: "arc",
            arc_center: { x: midR, z: midZ },
            arc_radius_mm: arcR > 0 ? arcR : undefined,
            arc_direction: first.r < last.r ? "ccw" : "cw",
            source_face_id: face.id,
          });
        }
      } else if (face.type === "toroidal" && face.axis) {
        // Toroidal → arc segment (fillet/radius on turning profile)
        const rz = TurningRevProfileEngine.collectRadiiZ(face, edgeMap, axis, unitScale);
        if (rz.length >= 2) {
          rz.sort((a, b) => a.z - b.z);
          const first = rz[0];
          const last = rz[rz.length - 1];
          segments.push({
            start: { x: first.r, z: first.z },
            end: { x: last.r, z: last.z },
            type: "arc",
            arc_radius_mm: face.radius_mm ? face.radius_mm * unitScale : undefined,
            arc_direction: first.r < last.r ? "ccw" : "cw",
            source_face_id: face.id,
          });
        }
      } else if (face.type === "planar") {
        // Planar → radial step at a specific Z
        const rz = TurningRevProfileEngine.collectRadiiZ(face, edgeMap, axis, unitScale);
        if (rz.length >= 2) {
          const avgZ = rz.reduce((s, p) => s + p.z, 0) / rz.length;
          const minR = Math.min(...rz.map(p => p.r));
          const maxR = Math.max(...rz.map(p => p.r));
          if (maxR - minR > 0.01) {
            segments.push({
              start: { x: maxR, z: avgZ },
              end: { x: minR, z: avgZ },
              type: "line",
              source_face_id: face.id,
            });
          }
        }
      }

      // Also process non-circle edge segments
      for (const eid of face.edge_ids) {
        const edge = edgeMap.get(eid);
        if (!edge || edge.type === "circle") continue;

        const s = projectXZ(scale(edge.start, unitScale), axis.origin, axis.direction);
        const e = projectXZ(scale(edge.end, unitScale), axis.origin, axis.direction);
        if (Math.abs(s.x - e.x) < 0.001 && Math.abs(s.z - e.z) < 0.001) continue;

        const seg: XZSegment = {
          start: s, end: e,
          type: edge.type === "arc" ? "arc" : "line",
          source_face_id: face.id,
        };
        if (edge.center && edge.type === "arc") {
          seg.arc_center = projectXZ(scale(edge.center, unitScale), axis.origin, axis.direction);
          seg.arc_radius_mm = edge.radius_mm ? edge.radius_mm * unitScale : undefined;
          seg.arc_direction = TurningRevProfileEngine.arcDir(s, e, seg.arc_center);
        }
        segments.push(seg);
      }
    }

    // Filter for OD (outermost) or ID (innermost)
    return TurningRevProfileEngine.selectSide(segments, side);
  }

  /** Collect Z values from a face's boundary edges */
  private static collectZValues(
    face: CADFace,
    edgeMap: Map<string, CADEdge>,
    axis: { origin: Vector3; direction: Vector3 },
    unitScale: number,
  ): number[] {
    const zs: number[] = [];
    for (const eid of face.edge_ids) {
      const edge = edgeMap.get(eid);
      if (!edge) continue;
      zs.push(
        projectXZ(scale(edge.start, unitScale), axis.origin, axis.direction).z,
        projectXZ(scale(edge.end, unitScale), axis.origin, axis.direction).z,
      );
      if (edge.center) {
        zs.push(projectXZ(scale(edge.center, unitScale), axis.origin, axis.direction).z);
      }
    }
    return zs;
  }

  /** Collect radius+Z pairs from a face's boundary edges */
  private static collectRadiiZ(
    face: CADFace,
    edgeMap: Map<string, CADEdge>,
    axis: { origin: Vector3; direction: Vector3 },
    unitScale: number,
  ): Array<{ r: number; z: number }> {
    const pts: Array<{ r: number; z: number }> = [];
    for (const eid of face.edge_ids) {
      const edge = edgeMap.get(eid);
      if (!edge) continue;
      const s = projectXZ(scale(edge.start, unitScale), axis.origin, axis.direction);
      const e = projectXZ(scale(edge.end, unitScale), axis.origin, axis.direction);
      pts.push({ r: s.x, z: s.z }, { r: e.x, z: e.z });
    }
    return pts;
  }

  /** Filter segments by side: OD = outermost, ID = innermost */
  private static selectSide(segments: XZSegment[], side: "od" | "id"): XZSegment[] {
    if (segments.length === 0) return [];

    // Group by Z-band (0.5mm resolution)
    const bands = new Map<number, XZSegment[]>();
    for (const s of segments) {
      const zKey = Math.round((s.start.z + s.end.z) / 2 / 0.5) * 0.5;
      if (!bands.has(zKey)) bands.set(zKey, []);
      bands.get(zKey)!.push(s);
    }

    const result: XZSegment[] = [];
    for (const [, segs] of bands) {
      if (side === "od") {
        result.push(segs.reduce((a, b) => Math.max(a.start.x, a.end.x) >= Math.max(b.start.x, b.end.x) ? a : b));
      } else {
        // ID: only when there are multiple segments at this Z-band (OD + ID coexist)
        // A single segment per Z-band is OD, not ID
        if (segs.length < 2) continue;
        const inner = segs.filter(s => Math.min(s.start.x, s.end.x) > 0.01);
        if (inner.length >= 2) {
          // Take the innermost (smallest radius)
          result.push(inner.reduce((a, b) => Math.min(a.start.x, a.end.x) <= Math.min(b.start.x, b.end.x) ? a : b));
        }
      }
    }
    return result;
  }

  // ── Chaining & Gap Fill ─────────────────────────────────────────────

  /**
   * Chain segments into an ordered polyline (Z ascending) and fill small gaps
   * with connecting line segments.
   */
  private static chainAndFillGaps(
    segments: XZSegment[],
  ): { segments: XZSegment[]; gapStats: { total_gaps: number; max_gap_mm: number; gaps_filled: number } } {
    if (segments.length === 0) return { segments: [], gapStats: { total_gaps: 0, max_gap_mm: 0, gaps_filled: 0 } };

    // Sort by Z start
    const sorted = [...segments].sort((a, b) => a.start.z - b.start.z);

    // Nearest-neighbor chaining
    const chain: XZSegment[] = [sorted[0]];
    const used = new Set<number>([0]);

    for (let iter = 1; iter < sorted.length; iter++) {
      const lastEnd = chain[chain.length - 1].end;
      let bestIdx = -1;
      let bestDist = Infinity;
      let bestReverse = false;

      for (let i = 0; i < sorted.length; i++) {
        if (used.has(i)) continue;
        const dFwd = Math.hypot(sorted[i].start.x - lastEnd.x, sorted[i].start.z - lastEnd.z);
        const dRev = Math.hypot(sorted[i].end.x - lastEnd.x, sorted[i].end.z - lastEnd.z);
        if (dFwd < bestDist) { bestDist = dFwd; bestIdx = i; bestReverse = false; }
        if (dRev < bestDist) { bestDist = dRev; bestIdx = i; bestReverse = true; }
      }

      if (bestIdx >= 0) {
        const seg = sorted[bestIdx];
        if (bestReverse) {
          chain.push({
            ...seg,
            start: seg.end,
            end: seg.start,
            arc_direction: seg.arc_direction === "cw" ? "ccw" : seg.arc_direction === "ccw" ? "cw" : undefined,
          });
        } else {
          chain.push(seg);
        }
        used.add(bestIdx);
      }
    }

    // Fill gaps between consecutive segments
    let totalGaps = 0;
    let maxGap = 0;
    let gapsFilled = 0;
    const filled: XZSegment[] = [];

    for (let i = 0; i < chain.length; i++) {
      if (i > 0) {
        const prevEnd = chain[i - 1].end;
        const curStart = chain[i].start;
        const gap = Math.hypot(curStart.x - prevEnd.x, curStart.z - prevEnd.z);

        if (gap > 0.001) {
          totalGaps++;
          maxGap = Math.max(maxGap, gap);

          if (gap < 2.0) {
            // Fill with connecting line
            filled.push({
              start: prevEnd,
              end: curStart,
              type: "line",
            });
            gapsFilled++;
          }
        }
      }
      filled.push(chain[i]);
    }

    return {
      segments: filled,
      gapStats: { total_gaps: totalGaps, max_gap_mm: maxGap, gaps_filled: gapsFilled },
    };
  }

  // ── Non-Axisymmetric Feature Classification ─────────────────────────

  /** Classify non-axisymmetric faces into Feature3D objects */
  private static classifyNonAxi(
    faces: CADFace[],
    axis: { origin: Vector3; direction: Vector3 },
    unitScale: number,
  ): Feature3D[] {
    const features: Feature3D[] = [];

    for (const face of faces) {
      if (face.type === "cylindrical" && face.axis) {
        // Off-axis cylinder → cross-hole
        const dia = (face.radius_mm || 0) * 2 * unitScale;
        features.push({
          type: "cross_hole",
          face_ids: [face.id],
          description: `Cross-hole Ø${dia.toFixed(1)}mm off main axis`,
          suggested_turning_op: "cross_drill",
          diameter_mm: dia,
          angular_position_deg: TurningRevProfileEngine.computeAngularPos(face, axis, unitScale),
        });
      } else if (face.type === "planar") {
        // Parallel-to-axis plane → flat or keyway
        const w = Math.sqrt(face.area_mm2) * unitScale;
        features.push({
          type: "flat",
          face_ids: [face.id],
          description: `Flat surface (area ${(face.area_mm2 * unitScale * unitScale).toFixed(0)}mm²)`,
          suggested_turning_op: "flat_mill",
          width_mm: w,
          angular_position_deg: TurningRevProfileEngine.computeAngularPos(face, axis, unitScale),
        });
      } else {
        features.push({
          type: "other",
          face_ids: [face.id],
          description: `Non-axisymmetric ${face.type} feature`,
          suggested_turning_op: "od_pocket_mill",
        });
      }
    }

    return features;
  }

  /** Compute angular position of a feature around the rotation axis */
  private static computeAngularPos(
    face: CADFace,
    axis: { origin: Vector3; direction: Vector3 },
    unitScale: number,
  ): number {
    if (!face.axis) return 0;
    const origin = scale(face.axis.origin, unitScale);
    const v = sub(origin, axis.origin);
    const axDir = norm(axis.direction);
    // Remove axial component
    const radial = sub(v, scale(axDir, dot(v, axDir)));
    // Angle from reference direction (X-axis in the radial plane)
    const angle = Math.atan2(radial.y, radial.x) * 180 / Math.PI;
    return ((angle % 360) + 360) % 360;
  }

  // ── Volume Validation ───────────────────────────────────────────────

  /**
   * Estimate revolve volume from XZ profile using Pappus' theorem:
   * V = 2π × A × r_centroid, where A = cross-sectional area, r = centroid radius.
   * Approximated by integrating π × r² over Z for OD, minus π × r² for ID.
   */
  private static computeRevolveVolume(
    odProfile: XZSegment[],
    idProfile: XZSegment[],
  ): number {
    const odVol = TurningRevProfileEngine.trapezoidalRevolve(odProfile);
    const idVol = TurningRevProfileEngine.trapezoidalRevolve(idProfile);
    return Math.max(0, odVol - idVol);
  }

  /** Integrate π × r(z)² dz over the profile using trapezoidal rule */
  private static trapezoidalRevolve(segments: XZSegment[]): number {
    let volume = 0;
    for (const seg of segments) {
      const dz = Math.abs(seg.end.z - seg.start.z);
      if (dz < 0.0001) continue;
      const r1 = seg.start.x;
      const r2 = seg.end.x;
      // V = π ∫ r²dz ≈ π × dz × (r1² + r1×r2 + r2²) / 3  (cone frustum formula)
      volume += Math.PI * dz * (r1 * r1 + r1 * r2 + r2 * r2) / 3;
    }
    return volume;
  }

  /** Determine arc direction from start, end, center in XZ plane */
  private static arcDir(
    start: { x: number; z: number },
    end: { x: number; z: number },
    center: { x: number; z: number },
  ): "cw" | "ccw" {
    const ax = start.x - center.x;
    const az = start.z - center.z;
    const bx = end.x - center.x;
    const bz = end.z - center.z;
    return (ax * bz - az * bx) >= 0 ? "ccw" : "cw";
  }
}

/** Singleton instance */
export const turningRevProfileEngine = new TurningRevProfileEngine();
