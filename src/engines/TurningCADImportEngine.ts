/**
 * TurningCADImportEngine — STEP/IGES 3D → Axisymmetric Turning Profile Extraction
 *
 * Takes parsed 3D CAD geometry (faces, edges, vertices) and extracts:
 *   1. Rotational axis of symmetry (largest cylindrical face)
 *   2. 2D XZ silhouette profile (polyline for G71/G70 contour input)
 *   3. Classified TurningFeature[] with geometry coordinates
 *   4. Non-axisymmetric features flagged for live tooling
 *
 * Input sources: Python CAD engine bridge, JS geometry parser, user geometry data.
 * The engine works with an abstracted geometry representation, NOT raw STEP bytes.
 *
 * References:
 *   - ISO 10303-21 (STEP AP203/AP214 geometry handling)
 *   - IGES 5.3 (surface types 120-128)
 *   - Axisymmetric decomposition: revolve axis detection via cylindrical face normals
 *
 * @module engines/TurningCADImportEngine
 * @milestone LATHE-PRO-MS-1
 */

import { log } from "../utils/Logger.js";
import type {
  TurningFeature,
  TurningFeatureType,
} from "./TurningPrintToProgramEngine.js";

// ============================================================================
// TYPES — 3D Geometry Abstraction
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

/** A face of the 3D solid with surface type classification */
export interface CADFace {
  id: string;
  type: "planar" | "cylindrical" | "conical" | "spherical" | "toroidal" | "freeform";
  /** For cylindrical/conical: axis origin + direction */
  axis?: { origin: Vector3; direction: Vector3 };
  /** For cylindrical: radius; for conical: half-angle */
  radius_mm?: number;
  half_angle_deg?: number;
  /** Surface area in mm² */
  area_mm2: number;
  /** Whether surface normal points outward or inward */
  sense: "outward" | "inward";
  /** Boundary edge references */
  edge_ids: string[];
}

/** An edge of the 3D solid */
export interface CADEdge {
  id: string;
  type: "line" | "arc" | "circle" | "ellipse" | "bspline";
  start: Vector3;
  end: Vector3;
  /** For arcs/circles: center point */
  center?: Vector3;
  /** For arcs/circles: radius */
  radius_mm?: number;
  /** Owning face IDs */
  face_ids: string[];
}

/** A vertex of the 3D solid */
export interface CADVertex {
  id: string;
  position: Vector3;
}

/** Input: parsed 3D solid model */
export interface CADSolidInput {
  /** Source file format */
  source_format: "step" | "iges" | "brep" | "mesh" | "manual";
  /** Source filename (for traceability) */
  filename?: string;
  /** All faces of the solid */
  faces: CADFace[];
  /** All edges of the solid */
  edges: CADEdge[];
  /** All vertices of the solid */
  vertices: CADVertex[];
  /** Overall bounding box */
  bounding_box: BoundingBox;
  /** Units of the source model (default mm) */
  units?: "mm" | "in";
  /** Thread annotations from PMI (if available) */
  thread_annotations?: Array<{
    face_id: string;
    callout: string;   // "M12x1.75", "1/2-13 UNC"
    pitch_mm: number;
    is_internal: boolean;
  }>;
}

/** A 2D profile segment in the XZ half-plane */
export interface ProfileSegment {
  /** Start point: X = radial distance (radius, not diameter), Z = axial */
  start: { x: number; z: number };
  /** End point */
  end: { x: number; z: number };
  /** Segment type */
  type: "line" | "arc";
  /** For arcs: center in XZ */
  arc_center?: { x: number; z: number };
  /** For arcs: radius */
  arc_radius_mm?: number;
  /** For arcs: clockwise or counter-clockwise */
  arc_direction?: "cw" | "ccw";
  /** Source face ID for traceability */
  source_face_id?: string;
}

/** Non-axisymmetric feature flagged for live tooling */
export interface NonAxiFeature {
  type: "cross_hole" | "flat" | "keyway" | "pocket" | "slot" | "hex" | "other";
  face_ids: string[];
  description: string;
  /** Suggested turning operation */
  suggested_op: TurningFeatureType;
  /** Angular position on the part (degrees) */
  angular_position_deg?: number;
  /** Dimensions */
  width_mm?: number;
  depth_mm?: number;
  diameter_mm?: number;
}

/** Result of the CAD import process */
export interface TurningCADImportResult {
  success: boolean;
  /** Detected axis of revolution */
  revolution_axis: { origin: Vector3; direction: Vector3 };
  /** 2D OD profile in XZ half-plane (ordered by Z, for G71/G70) */
  od_profile: ProfileSegment[];
  /** 2D ID profile in XZ half-plane (if bore exists) */
  id_profile: ProfileSegment[];
  /** Classified turning features */
  features: TurningFeature[];
  /** Non-axisymmetric features requiring live tooling */
  non_axi_features: NonAxiFeature[];
  /** Part envelope */
  envelope: {
    max_od_mm: number;
    min_id_mm: number | null;
    total_length_mm: number;
  };
  /** Warnings and notes */
  warnings: string[];
  /** Confidence in axis detection (0-1) */
  axis_confidence: number;
}

// ============================================================================
// HELPERS — Vector Math
// ============================================================================

function vec3Dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Length(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vector3): Vector3 {
  const len = vec3Length(v);
  if (len < 1e-10) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vec3Cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vec3Sub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Distance from a point to a line (axis) */
function pointToAxisDistance(point: Vector3, axisOrigin: Vector3, axisDir: Vector3): number {
  const d = vec3Normalize(axisDir);
  const v = vec3Sub(point, axisOrigin);
  const t = vec3Dot(v, d);
  const proj = { x: axisOrigin.x + d.x * t, y: axisOrigin.y + d.y * t, z: axisOrigin.z + d.z * t };
  return vec3Length(vec3Sub(point, proj));
}

/** Project a 3D point onto the XZ half-plane relative to the revolution axis.
 *  Returns { x: radial distance (radius), z: axial position } */
function projectToXZ(
  point: Vector3,
  axisOrigin: Vector3,
  axisDir: Vector3,
): { x: number; z: number } {
  const d = vec3Normalize(axisDir);
  const v = vec3Sub(point, axisOrigin);
  const z = vec3Dot(v, d);  // axial component
  // Radial component = distance from axis
  const proj = { x: v.x - d.x * z, y: v.y - d.y * z, z: v.z - d.z * z };
  const x = vec3Length(proj); // always positive (radius)
  return { x, z };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TurningCADImportEngine {

  /**
   * Import a 3D CAD solid and extract turning profile + features.
   *
   * @param input - Parsed 3D solid geometry
   * @returns Turning profile, features, and non-axisymmetric flags
   */
  importSolid(input: CADSolidInput): TurningCADImportResult {
    const startMs = Date.now();
    const warnings: string[] = [];
    const scale = input.units === "in" ? 25.4 : 1.0;

    log.info(`[TurningCADImport] Processing ${input.faces.length} faces, ${input.edges.length} edges from ${input.source_format}`);

    // ── Step 1: Detect revolution axis ──────────────────────────────
    const axisResult = this.detectRevolutionAxis(input.faces, scale);
    if (!axisResult.found) {
      warnings.push("No cylindrical faces found — using bounding box longest axis as fallback");
    }
    const axis = axisResult.axis;
    const axisConfidence = axisResult.confidence;

    // ── Step 2: Classify faces ──────────────────────────────────────
    const { axisymmetric, nonAxisymmetric } = this.classifyFaces(input.faces, axis, scale);

    // ── Step 3: Extract OD/ID profiles ──────────────────────────────
    const odProfile = this.extractProfile(axisymmetric, input.edges, axis, "od", scale);
    const idProfile = this.extractProfile(axisymmetric, input.edges, axis, "id", scale);

    // ── Step 4: Identify features from profile segments ──────────────
    const features = this.classifyProfileFeatures(odProfile, idProfile, input.thread_annotations, scale);

    // ── Step 5: Flag non-axisymmetric features ──────────────────────
    const nonAxiFeatures = this.classifyNonAxiFeatures(nonAxisymmetric, axis, scale);
    if (nonAxiFeatures.length > 0) {
      warnings.push(`${nonAxiFeatures.length} non-axisymmetric feature(s) detected — live tooling required`);
    }

    // ── Step 6: Compute envelope ────────────────────────────────────
    const allZValues: number[] = [];
    const allRadii: number[] = [];
    for (const seg of odProfile) {
      allZValues.push(seg.start.z, seg.end.z);
      allRadii.push(seg.start.x, seg.end.x);
    }
    for (const seg of idProfile) {
      allZValues.push(seg.start.z, seg.end.z);
    }

    const maxOD = allRadii.length > 0 ? Math.max(...allRadii) * 2 : 0;
    const minID = idProfile.length > 0
      ? Math.min(...idProfile.map(s => Math.min(s.start.x, s.end.x))) * 2
      : null;
    const totalLength = allZValues.length > 0
      ? Math.max(...allZValues) - Math.min(...allZValues)
      : 0;

    const elapsed = Date.now() - startMs;
    log.info(`[TurningCADImport] Complete: ${features.length} features, ${nonAxiFeatures.length} non-axi, OD=${maxOD.toFixed(1)}mm, L=${totalLength.toFixed(1)}mm in ${elapsed}ms`);

    return {
      success: features.length > 0 || odProfile.length > 0,
      revolution_axis: axis,
      od_profile: odProfile,
      id_profile: idProfile,
      features,
      non_axi_features: nonAxiFeatures,
      envelope: {
        max_od_mm: maxOD,
        min_id_mm: minID,
        total_length_mm: totalLength,
      },
      warnings,
      axis_confidence: axisConfidence,
    };
  }

  // ── Private: Axis Detection ──────────────────────────────────────

  /**
   * Detect the axis of revolution from cylindrical faces.
   * Uses the largest-area cylindrical face as the primary axis.
   * Falls back to conical faces, then bounding box analysis.
   */
  private detectRevolutionAxis(
    faces: CADFace[],
    scale: number,
  ): { found: boolean; axis: { origin: Vector3; direction: Vector3 }; confidence: number } {
    // Collect cylindrical faces with their axes
    const cylFaces = faces.filter(f => f.type === "cylindrical" && f.axis);
    const conFaces = faces.filter(f => f.type === "conical" && f.axis);

    if (cylFaces.length > 0) {
      // Group by axis direction (faces sharing the same axis)
      const axisGroups = this.groupByAxis(cylFaces);

      // Pick the group with the largest total area
      let bestGroup = axisGroups[0];
      let bestArea = 0;
      for (const group of axisGroups) {
        const totalArea = group.reduce((sum, f) => sum + f.area_mm2 * scale * scale, 0);
        if (totalArea > bestArea) {
          bestArea = totalArea;
          bestGroup = group;
        }
      }

      const refFace = bestGroup[0];
      const confidence = Math.min(1.0, bestArea / (faces.reduce((s, f) => s + f.area_mm2, 0) * scale * scale + 1e-10));

      return {
        found: true,
        axis: {
          origin: this.scaleVec(refFace.axis!.origin, scale),
          direction: vec3Normalize(refFace.axis!.direction),
        },
        confidence: Math.max(0.5, confidence),
      };
    }

    if (conFaces.length > 0) {
      // Use largest conical face axis
      const largest = conFaces.sort((a, b) => b.area_mm2 - a.area_mm2)[0];
      return {
        found: true,
        axis: {
          origin: this.scaleVec(largest.axis!.origin, scale),
          direction: vec3Normalize(largest.axis!.direction),
        },
        confidence: 0.6,
      };
    }

    // Fallback: assume Z-axis (most common for turning parts)
    return {
      found: false,
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
      confidence: 0.3,
    };
  }

  /** Group faces that share the same axis direction (within 5° tolerance) */
  private groupByAxis(faces: CADFace[]): CADFace[][] {
    const groups: CADFace[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < faces.length; i++) {
      if (used.has(i)) continue;
      const group = [faces[i]];
      used.add(i);
      const dir = vec3Normalize(faces[i].axis!.direction);

      for (let j = i + 1; j < faces.length; j++) {
        if (used.has(j) || !faces[j].axis) continue;
        const otherDir = vec3Normalize(faces[j].axis!.direction);
        // Check if axes are parallel (dot product close to ±1)
        const dot = Math.abs(vec3Dot(dir, otherDir));
        if (dot > 0.996) { // ~5° tolerance
          group.push(faces[j]);
          used.add(j);
        }
      }
      groups.push(group);
    }

    return groups;
  }

  // ── Private: Face Classification ─────────────────────────────────

  /** Separate faces into axisymmetric (on the revolution axis) and non-axisymmetric */
  private classifyFaces(
    faces: CADFace[],
    axis: { origin: Vector3; direction: Vector3 },
    scale: number,
  ): { axisymmetric: CADFace[]; nonAxisymmetric: CADFace[] } {
    const axisymmetric: CADFace[] = [];
    const nonAxisymmetric: CADFace[] = [];

    for (const face of faces) {
      if (face.type === "cylindrical" || face.type === "conical" || face.type === "toroidal") {
        if (face.axis) {
          const dir = vec3Normalize(face.axis.direction);
          const axisDir = vec3Normalize(axis.direction);
          const dot = Math.abs(vec3Dot(dir, axisDir));
          if (dot > 0.996) {
            axisymmetric.push(face);
            continue;
          }
        }
        nonAxisymmetric.push(face);
      } else if (face.type === "planar") {
        // Planar faces perpendicular to axis → axisymmetric (face/shoulder)
        // Planar faces parallel to axis → could be flat/keyway (non-axi)
        const faceNormal = this.estimateFaceNormal(face, axis);
        if (faceNormal) {
          const dot = Math.abs(vec3Dot(faceNormal, vec3Normalize(axis.direction)));
          if (dot > 0.95) {
            // Nearly perpendicular to axis → face feature
            axisymmetric.push(face);
          } else if (dot < 0.05) {
            // Nearly parallel to axis → flat or keyway
            nonAxisymmetric.push(face);
          } else {
            axisymmetric.push(face); // Angled → taper face
          }
        } else {
          axisymmetric.push(face); // Default: assume axisymmetric
        }
      } else if (face.type === "spherical") {
        axisymmetric.push(face); // Spherical faces on turning = ball nose
      } else {
        nonAxisymmetric.push(face);
      }
    }

    return { axisymmetric, nonAxisymmetric };
  }

  /** Estimate face normal from axis info or default */
  private estimateFaceNormal(face: CADFace, axis: { origin: Vector3; direction: Vector3 }): Vector3 | null {
    if (face.axis) return vec3Normalize(face.axis.direction);
    // For planar faces without axis info, use edge cross-product if we had them
    // For now, return null (caller uses default)
    return null;
  }

  // ── Private: Profile Extraction ──────────────────────────────────

  /**
   * Extract the 2D profile in the XZ half-plane from axisymmetric faces.
   * Uses face geometry (type + radius) and edge Z-positions directly,
   * rather than relying on edge line segments. This handles STEP models
   * where cylindrical faces only have circle boundary edges (no seam lines).
   *
   * For OD: outermost contour. For ID: innermost contour.
   */
  private extractProfile(
    faces: CADFace[],
    edges: CADEdge[],
    axis: { origin: Vector3; direction: Vector3 },
    side: "od" | "id",
    scale: number,
  ): ProfileSegment[] {
    const segments: ProfileSegment[] = [];
    const edgeMap = new Map<string, CADEdge>();
    for (const e of edges) edgeMap.set(e.id, e);

    for (const face of faces) {
      if (face.type === "cylindrical" && face.radius_mm) {
        // Cylindrical face → horizontal line at constant radius across Z extent
        const zValues = this.collectEdgeZValues(face, edgeMap, axis, scale);
        if (zValues.length >= 2) {
          const zMin = Math.min(...zValues);
          const zMax = Math.max(...zValues);
          const radius = face.radius_mm * scale;
          if (Math.abs(zMax - zMin) > 0.001) {
            segments.push({
              start: { x: radius, z: zMin },
              end: { x: radius, z: zMax },
              type: "line",
              source_face_id: face.id,
            });
          }
        }
      } else if (face.type === "conical" && face.axis) {
        // Conical face → angled line from large radius to small radius
        const edgeRadii = this.collectEdgeRadiiAndZ(face, edgeMap, axis, scale);
        if (edgeRadii.length >= 2) {
          edgeRadii.sort((a, b) => a.z - b.z);
          segments.push({
            start: { x: edgeRadii[0].r, z: edgeRadii[0].z },
            end: { x: edgeRadii[edgeRadii.length - 1].r, z: edgeRadii[edgeRadii.length - 1].z },
            type: "line",
            source_face_id: face.id,
          });
        }
      } else if (face.type === "planar") {
        // Planar face → radial step (connecting OD to ID at a specific Z)
        const edgeRadii = this.collectEdgeRadiiAndZ(face, edgeMap, axis, scale);
        if (edgeRadii.length >= 2) {
          // Group by Z (planar face is at a single Z)
          const avgZ = edgeRadii.reduce((s, e) => s + e.z, 0) / edgeRadii.length;
          const minR = Math.min(...edgeRadii.map(e => e.r));
          const maxR = Math.max(...edgeRadii.map(e => e.r));
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

      // Also process non-circle edge segments (arcs, lines on the surface)
      for (const edgeId of face.edge_ids) {
        const edge = edgeMap.get(edgeId);
        if (!edge || edge.type === "circle") continue; // Skip circles (handled above)

        const startXZ = projectToXZ(this.scaleVec(edge.start, scale), axis.origin, axis.direction);
        const endXZ = projectToXZ(this.scaleVec(edge.end, scale), axis.origin, axis.direction);

        if (Math.abs(startXZ.x - endXZ.x) < 0.001 && Math.abs(startXZ.z - endXZ.z) < 0.001) continue;

        const seg: ProfileSegment = {
          start: startXZ, end: endXZ,
          type: edge.type === "arc" ? "arc" : "line",
          source_face_id: face.id,
        };

        if (edge.center && edge.type === "arc") {
          const centerXZ = projectToXZ(this.scaleVec(edge.center, scale), axis.origin, axis.direction);
          seg.arc_center = centerXZ;
          seg.arc_radius_mm = edge.radius_mm ? edge.radius_mm * scale : undefined;
          seg.arc_direction = this.determineArcDirection(startXZ, endXZ, centerXZ);
        }

        segments.push(seg);
      }
    }

    // Filter for OD (outermost) or ID (innermost) profile
    const filtered = this.selectProfileSide(segments, side);

    // Sort by Z coordinate (chuck end to tailstock)
    filtered.sort((a, b) => a.start.z - b.start.z);

    // Chain segments into a continuous polyline
    return this.chainSegments(filtered);
  }

  /** Collect Z-axis positions from a face's boundary edges */
  private collectEdgeZValues(
    face: CADFace,
    edgeMap: Map<string, CADEdge>,
    axis: { origin: Vector3; direction: Vector3 },
    scale: number,
  ): number[] {
    const zValues: number[] = [];
    for (const edgeId of face.edge_ids) {
      const edge = edgeMap.get(edgeId);
      if (!edge) continue;
      const startXZ = projectToXZ(this.scaleVec(edge.start, scale), axis.origin, axis.direction);
      const endXZ = projectToXZ(this.scaleVec(edge.end, scale), axis.origin, axis.direction);
      zValues.push(startXZ.z, endXZ.z);
      if (edge.center) {
        const centerXZ = projectToXZ(this.scaleVec(edge.center, scale), axis.origin, axis.direction);
        zValues.push(centerXZ.z);
      }
    }
    return zValues;
  }

  /** Collect radius+Z pairs from a face's boundary edges */
  private collectEdgeRadiiAndZ(
    face: CADFace,
    edgeMap: Map<string, CADEdge>,
    axis: { origin: Vector3; direction: Vector3 },
    scale: number,
  ): Array<{ r: number; z: number }> {
    const points: Array<{ r: number; z: number }> = [];
    for (const edgeId of face.edge_ids) {
      const edge = edgeMap.get(edgeId);
      if (!edge) continue;
      const startXZ = projectToXZ(this.scaleVec(edge.start, scale), axis.origin, axis.direction);
      const endXZ = projectToXZ(this.scaleVec(edge.end, scale), axis.origin, axis.direction);
      points.push({ r: startXZ.x, z: startXZ.z });
      points.push({ r: endXZ.x, z: endXZ.z });
    }
    return points;
  }

  /** Select outer or inner profile from all segments */
  private selectProfileSide(segments: ProfileSegment[], side: "od" | "id"): ProfileSegment[] {
    if (segments.length === 0) return [];

    // Group segments by Z-band (0.5mm resolution)
    const zBands = new Map<number, ProfileSegment[]>();
    for (const seg of segments) {
      const zKey = Math.round((seg.start.z + seg.end.z) / 2 / 0.5) * 0.5;
      if (!zBands.has(zKey)) zBands.set(zKey, []);
      zBands.get(zKey)!.push(seg);
    }

    const result: ProfileSegment[] = [];
    for (const [, bandSegs] of zBands) {
      if (side === "od") {
        // Keep the segment with the largest radial distance
        const best = bandSegs.reduce((a, b) => {
          const aMax = Math.max(a.start.x, a.end.x);
          const bMax = Math.max(b.start.x, b.end.x);
          return aMax >= bMax ? a : b;
        });
        result.push(best);
      } else {
        // Keep the segment with the smallest radial distance (but > 0)
        const inner = bandSegs.filter(s => Math.min(s.start.x, s.end.x) > 0.01);
        if (inner.length > 0) {
          const best = inner.reduce((a, b) => {
            const aMin = Math.min(a.start.x, a.end.x);
            const bMin = Math.min(b.start.x, b.end.x);
            return aMin <= bMin ? a : b;
          });
          result.push(best);
        }
      }
    }

    return result;
  }

  /** Chain disjoint segments into a continuous polyline by connecting nearest endpoints */
  private chainSegments(segments: ProfileSegment[]): ProfileSegment[] {
    if (segments.length <= 1) return segments;

    const result: ProfileSegment[] = [segments[0]];
    const used = new Set<number>([0]);

    for (let iter = 1; iter < segments.length; iter++) {
      const last = result[result.length - 1];
      const lastEnd = last.end;
      let bestIdx = -1;
      let bestDist = Infinity;

      for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue;
        const dist = Math.hypot(segments[i].start.x - lastEnd.x, segments[i].start.z - lastEnd.z);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
        // Also check reversed
        const distRev = Math.hypot(segments[i].end.x - lastEnd.x, segments[i].end.z - lastEnd.z);
        if (distRev < bestDist) {
          bestDist = distRev;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        // Check if we need to reverse the segment
        const seg = segments[bestIdx];
        const distFwd = Math.hypot(seg.start.x - lastEnd.x, seg.start.z - lastEnd.z);
        const distRev = Math.hypot(seg.end.x - lastEnd.x, seg.end.z - lastEnd.z);
        if (distRev < distFwd) {
          // Reverse the segment
          result.push({
            ...seg,
            start: seg.end,
            end: seg.start,
            arc_direction: seg.arc_direction === "cw" ? "ccw" : seg.arc_direction === "ccw" ? "cw" : undefined,
          });
        } else {
          result.push(seg);
        }
        used.add(bestIdx);
      }
    }

    return result;
  }

  /** Determine arc CW/CCW from start, end, center in XZ plane */
  private determineArcDirection(
    start: { x: number; z: number },
    end: { x: number; z: number },
    center: { x: number; z: number },
  ): "cw" | "ccw" {
    // Cross product of (center→start) × (center→end) determines direction
    const ax = start.x - center.x;
    const az = start.z - center.z;
    const bx = end.x - center.x;
    const bz = end.z - center.z;
    const cross = ax * bz - az * bx;
    return cross >= 0 ? "ccw" : "cw";
  }

  // ── Private: Feature Classification ──────────────────────────────

  /**
   * Classify profile segments into TurningFeature[].
   * Analyzes the XZ profile geometry to identify standard turning features.
   */
  private classifyProfileFeatures(
    odProfile: ProfileSegment[],
    idProfile: ProfileSegment[],
    threadAnnotations: CADSolidInput["thread_annotations"],
    scale: number,
  ): TurningFeature[] {
    const features: TurningFeature[] = [];
    let featureIdx = 0;

    // ── OD features ──
    for (let i = 0; i < odProfile.length; i++) {
      const seg = odProfile[i];
      const prevSeg = i > 0 ? odProfile[i - 1] : null;
      const nextSeg = i < odProfile.length - 1 ? odProfile[i + 1] : null;

      const dx = seg.end.x - seg.start.x; // radial change
      const dz = seg.end.z - seg.start.z; // axial change
      const segLength = Math.hypot(dx, dz);
      const diameter = (seg.start.x + seg.end.x); // average diameter (radius * 2)

      if (segLength < 0.01) continue;

      const feature: TurningFeature = {
        id: `CAD-OD-${++featureIdx}`,
        type: "od_straight",
        od_mm: diameter,
        length_mm: Math.abs(dz),
        position_z_mm: Math.min(seg.start.z, seg.end.z),
      };

      if (seg.type === "arc") {
        // Arc on OD → contour feature
        feature.type = "od_contour";
        if (seg.arc_radius_mm) {
          feature.profile_points = [{
            X: seg.start.x * 2, Z: seg.start.z,
            type: seg.arc_direction === "cw" ? "arc_cw" : "arc_ccw",
            R: seg.arc_radius_mm,
          }, {
            X: seg.end.x * 2, Z: seg.end.z, type: "linear",
          }];
        }
      } else if (Math.abs(dx) < 0.01 && Math.abs(dz) > 0.5) {
        // Horizontal line (constant radius) → OD straight
        feature.type = "od_straight";
      } else if (Math.abs(dz) < 0.01 && Math.abs(dx) > 0.5) {
        // Vertical line (step change in radius) → shoulder/face
        if (prevSeg && seg.start.x < prevSeg.end.x) {
          feature.type = "od_shoulder";
        } else {
          feature.type = "face";
        }
        feature.od_mm = Math.max(seg.start.x, seg.end.x) * 2;
        feature.length_mm = Math.abs(dx);
      } else if (Math.abs(dx) > 0.1 && Math.abs(dz) > 0.1) {
        // Angled line → taper
        feature.type = "od_taper";
        feature.taper_angle_deg = Math.abs(Math.atan2(dx, dz) * 180 / Math.PI);
        feature.od_mm = Math.max(seg.start.x, seg.end.x) * 2;
      }

      // Check for groove (narrow radial dip between adjacent segments)
      if (prevSeg && nextSeg) {
        const prevRadius = prevSeg.end.x;
        const nextRadius = nextSeg.start.x;
        const myMinRadius = Math.min(seg.start.x, seg.end.x);
        if (myMinRadius < prevRadius * 0.9 && myMinRadius < nextRadius * 0.9 && Math.abs(dz) < 10) {
          feature.type = "groove_od";
          feature.groove_width_mm = Math.abs(dz);
          feature.groove_depth_mm = Math.max(prevRadius, nextRadius) - myMinRadius;
        }
      }

      // Build G71/G70 profile points
      if (!feature.profile_points) {
        feature.profile_points = [
          { X: seg.start.x * 2, Z: seg.start.z, type: "linear" as const },
          { X: seg.end.x * 2, Z: seg.end.z, type: "linear" as const },
        ];
      }

      features.push(feature);
    }

    // ── ID features ──
    for (let i = 0; i < idProfile.length; i++) {
      const seg = idProfile[i];
      const dx = seg.end.x - seg.start.x;
      const dz = seg.end.z - seg.start.z;
      const diameter = (seg.start.x + seg.end.x); // average diameter

      if (Math.hypot(dx, dz) < 0.01) continue;

      const feature: TurningFeature = {
        id: `CAD-ID-${++featureIdx}`,
        type: "id_bore",
        id_mm: diameter,
        length_mm: Math.abs(dz),
        position_z_mm: Math.min(seg.start.z, seg.end.z),
      };

      if (seg.type === "arc") {
        feature.type = "id_contour";
      } else if (Math.abs(dx) > 0.1 && Math.abs(dz) > 0.1) {
        feature.type = "id_taper";
        feature.taper_angle_deg = Math.abs(Math.atan2(dx, dz) * 180 / Math.PI);
      }

      // Check for internal groove
      const prevSeg = i > 0 ? idProfile[i - 1] : null;
      const nextSeg = i < idProfile.length - 1 ? idProfile[i + 1] : null;
      if (prevSeg && nextSeg) {
        const myMaxRadius = Math.max(seg.start.x, seg.end.x);
        const prevRadius = prevSeg.end.x;
        const nextRadius = nextSeg.start.x;
        if (myMaxRadius > prevRadius * 1.1 && myMaxRadius > nextRadius * 1.1 && Math.abs(dz) < 10) {
          feature.type = "groove_id";
          feature.groove_width_mm = Math.abs(dz);
          feature.groove_depth_mm = myMaxRadius - Math.min(prevRadius, nextRadius);
        }
      }

      feature.profile_points = [
        { X: seg.start.x * 2, Z: seg.start.z, type: "linear" as const },
        { X: seg.end.x * 2, Z: seg.end.z, type: "linear" as const },
      ];

      features.push(feature);
    }

    // ── Apply thread annotations (from STEP PMI) ──
    if (threadAnnotations) {
      for (const thread of threadAnnotations) {
        const matchingFeature = features.find(f =>
          f.profile_points?.some(p => p.X > 0) &&
          (thread.is_internal ? f.type.startsWith("id") : f.type.startsWith("od"))
        );

        const threadFeature: TurningFeature = {
          id: `CAD-THR-${++featureIdx}`,
          type: thread.is_internal ? "thread_id" : "thread_od",
          length_mm: matchingFeature?.length_mm || 20,
          od_mm: matchingFeature?.od_mm,
          id_mm: matchingFeature?.id_mm,
          thread_pitch_mm: thread.pitch_mm * scale,
          position_z_mm: matchingFeature?.position_z_mm,
        };

        features.push(threadFeature);
      }
    }

    return features;
  }

  // ── Private: Non-Axisymmetric Feature Classification ──────────────

  /** Classify non-axisymmetric faces into live tooling features */
  private classifyNonAxiFeatures(
    faces: CADFace[],
    axis: { origin: Vector3; direction: Vector3 },
    scale: number,
  ): NonAxiFeature[] {
    const result: NonAxiFeature[] = [];

    for (const face of faces) {
      if (face.type === "cylindrical" && face.axis) {
        // Cylindrical face NOT on the main axis → cross-hole
        const r = (face.radius_mm || 0) * scale;
        const angularPos = this.computeAngularPosition(face.axis.origin, axis);

        result.push({
          type: "cross_hole",
          face_ids: [face.id],
          description: `Cross-hole Ø${(r * 2).toFixed(1)}mm at ${angularPos.toFixed(0)}°`,
          suggested_op: "cross_drill",
          angular_position_deg: angularPos,
          diameter_mm: r * 2,
        });
      } else if (face.type === "planar") {
        // Planar face parallel to axis → flat or keyway
        const area = face.area_mm2 * scale * scale;
        if (area < 100) continue; // Ignore tiny faces (fillets, chamfers)

        // Estimate flat dimensions from area
        const estWidth = Math.sqrt(area);
        result.push({
          type: "flat",
          face_ids: [face.id],
          description: `Flat surface (~${estWidth.toFixed(1)}mm) — C-axis milling`,
          suggested_op: "flat_mill",
          width_mm: estWidth,
        });
      }
    }

    return result;
  }

  /** Compute angular position of a point relative to the axis */
  private computeAngularPosition(point: Vector3, axis: { origin: Vector3; direction: Vector3 }): number {
    const v = vec3Sub(point, axis.origin);
    const d = vec3Normalize(axis.direction);
    const axialComponent = vec3Dot(v, d);
    const radialVec = {
      x: v.x - d.x * axialComponent,
      y: v.y - d.y * axialComponent,
      z: v.z - d.z * axialComponent,
    };
    return Math.atan2(radialVec.y, radialVec.x) * 180 / Math.PI;
  }

  /** Scale a Vector3 by a factor */
  private scaleVec(v: Vector3, scale: number): Vector3 {
    if (scale === 1.0) return v;
    return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const turningCADImportEngine = new TurningCADImportEngine();
