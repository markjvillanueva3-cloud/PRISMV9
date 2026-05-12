/**
 * WEDMPartRecognitionEngine — WEDM AGI Phase 1 / U-P1-06 (part recognition)
 *
 * Recognises Wire-EDM-relevant geometry from a parsed DXF entity stream
 * (DXFEntity[] produced by FileIOEngine). Emits a structured list of
 * PartFeatures (holes, profiles, slots, pockets, contours) plus part-level
 * metadata (bounding box, centroid, open-edge candidates) that downstream
 * engines consume — most importantly EDMDrawingInterpretationEngine, which
 * handles final feature CLASSIFICATION (process selection). This engine
 * therefore *extends* the existing drawing pipeline rather than duplicating
 * DXF parsing or classification logic.
 *
 * Scope:
 *   1. Group entities into closed loops (profile extraction)
 *   2. Detect circles → hole features
 *   3. Detect rectangular/elongated loops → slot vs pocket classification
 *   4. Detect open polyline segments → contour features (open/wire-exit cuts)
 *   5. Report start-hole candidates (centroids of closed interior loops)
 *   6. Delegate process classification to edmDrawingInterpretationEngine
 *
 * Exit gate (P1-MS2): ≥95% feature extraction accuracy on synthetic DXF
 * fixtures that exercise every feature-type the engine claims to detect.
 *
 * Actions: wedm_part_recognize, wedm_part_bounds, wedm_part_start_hole_candidates
 *
 * @see EDMDrawingInterpretationEngine — consumes the PartFeature[] we emit
 * @see FileIOEngine.DXFEntity             — input entity format
 */

import type { DXFEntity } from "./FileIOEngine.js";
import {
  edmDrawingInterpretationEngine,
  type EDMDrawingResult,
  type PartFeature,
} from "./EDMDrawingInterpretationEngine.js";

// ────────────────────────── Types ──────────────────────────

export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  min: Point2D;
  max: Point2D;
  width_mm: number;
  height_mm: number;
}

export interface StartHoleCandidate {
  center: Point2D;
  diameter_mm: number;
  source_feature: string;
  accessibility: "interior" | "exterior" | "through";
  confidence: number;
}

export interface WEDMPartInput {
  entities: DXFEntity[];
  /** Optional material hint passed through to EDMDrawingInterpretationEngine. */
  material?: string;
  /** Plate thickness (Z-extrusion of the profile), mm. */
  thickness_mm?: number;
  /** Default feature tolerance, mm. Overridden per-feature where detected. */
  tolerance_mm?: number;
  /** Default target surface finish, µm Ra. */
  target_ra_um?: number;
}

export interface WEDMPartRecognitionResult {
  features: PartFeature[];
  bounds: BoundingBox | null;
  centroid: Point2D | null;
  start_hole_candidates: StartHoleCandidate[];
  warnings: string[];
  entity_counts: Record<string, number>;
  /** Per-feature confidence ∈ [0,1]. */
  confidence: number;
  /** Full drawing classification (delegated). Null if no classifiable feats. */
  classification: EDMDrawingResult | null;
}

// ────────────────────────── Helpers ──────────────────────────

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointsClose(a: Point2D, b: Point2D, eps = 1e-3): boolean {
  return dist(a, b) <= eps;
}

function polylineVertices(e: DXFEntity): Point2D[] {
  const d = e.data ?? {};
  if (Array.isArray(d.vertices)) {
    return d.vertices
      .filter((v: any) => typeof v?.x === "number" && typeof v?.y === "number")
      .map((v: any) => ({ x: v.x, y: v.y }));
  }
  if (Array.isArray(d.points)) {
    return d.points
      .filter((v: any) => typeof v?.x === "number" && typeof v?.y === "number")
      .map((v: any) => ({ x: v.x, y: v.y }));
  }
  return [];
}

function isClosedPolyline(e: DXFEntity, verts: Point2D[]): boolean {
  if (verts.length < 3) return false;
  const flag = e.data?.closed ?? e.data?.isClosed ?? null;
  if (flag === true) return true;
  if (flag === false) return false;
  // Fall back to vertex-coincidence check.
  return pointsClose(verts[0], verts[verts.length - 1]);
}

function polygonBounds(verts: Point2D[]): BoundingBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const v of verts) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
    width_mm: maxX - minX,
    height_mm: maxY - minY,
  };
}

/** Polygon area (shoelace). */
function polygonArea(verts: Point2D[]): number {
  let a = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    a += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  return Math.abs(a) * 0.5;
}

function polygonCentroid(verts: Point2D[]): Point2D {
  if (verts.length === 0) return { x: 0, y: 0 };
  let cx = 0,
    cy = 0;
  for (const v of verts) {
    cx += v.x;
    cy += v.y;
  }
  return { x: cx / verts.length, y: cy / verts.length };
}

function polylineLength(verts: Point2D[]): number {
  if (verts.length < 2) return 0;
  let L = 0;
  for (let i = 1; i < verts.length; i++) L += dist(verts[i - 1], verts[i]);
  return L;
}

// ────────────────────────── Feature detectors ──────────────────────────

/** Classify a closed polyline as slot | pocket | profile based on aspect. */
function classifyClosedLoop(
  verts: Point2D[],
  thickness_mm: number | undefined,
  eIndex: number,
): PartFeature {
  const bb = polygonBounds(verts);
  const L = Math.max(bb.width_mm, bb.height_mm);
  const W = Math.min(bb.width_mm, bb.height_mm);
  const aspect = W > 0 ? L / W : Infinity;
  const area = polygonArea(verts);
  const perim = polylineLength(verts);

  let type: PartFeature["type"];
  if (aspect >= 3 && W < 10) type = "slot";
  else if (aspect >= 1.5) type = "pocket";
  else type = "profile";

  return {
    name: `${type}-${eIndex}`,
    type,
    is_through: true,
    dimensions_mm: {
      length: L,
      width: W,
      depth: thickness_mm,
    },
    profile_length_mm: perim,
    // Conservative defaults; EDMDrawingInterpretationEngine fills in
    // process-level tolerance & finish requirements.
    tolerance_mm: undefined,
    surface_finish_ra_um: undefined,
    min_corner_radius_mm: estimateMinCornerRadius(verts),
  };
}

function estimateMinCornerRadius(verts: Point2D[]): number | undefined {
  if (verts.length < 3) return undefined;
  let minR = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[(i - 1 + verts.length) % verts.length];
    const b = verts[i];
    const c = verts[(i + 1) % verts.length];
    const ab = dist(a, b);
    const bc = dist(b, c);
    const ac = dist(a, c);
    // Triangle-circle (circumradius) proxy for corner tightness
    const s = (ab + bc + ac) / 2;
    const area = Math.max(1e-9, Math.sqrt(Math.max(0, s * (s - ab) * (s - bc) * (s - ac))));
    const R = (ab * bc * ac) / (4 * area);
    if (Number.isFinite(R)) minR = Math.min(minR, R);
  }
  return Number.isFinite(minR) ? minR : undefined;
}

function circleToFeature(e: DXFEntity, idx: number, thickness_mm?: number): PartFeature {
  const d = e.data ?? {};
  const diameter = (d.radius ?? 0) * 2 || d.diameter || 0;
  return {
    name: `hole-${idx}`,
    type: "hole",
    is_through: true,
    dimensions_mm: { diameter, depth: thickness_mm },
    min_corner_radius_mm: diameter / 2,
  };
}

function openPolylineToContour(
  verts: Point2D[],
  idx: number,
  thickness_mm?: number,
): PartFeature {
  const bb = polygonBounds(verts);
  return {
    name: `contour-${idx}`,
    type: "contour",
    is_through: true,
    dimensions_mm: {
      length: Math.max(bb.width_mm, bb.height_mm),
      width: Math.min(bb.width_mm, bb.height_mm),
      depth: thickness_mm,
    },
    profile_length_mm: polylineLength(verts),
  };
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMPartRecognitionEngine {
  /**
   * Extract WEDM features from a DXF entity stream.
   *
   * Preconditions: entities are already parsed by FileIOEngine or equivalent
   * and share a consistent units system (millimetres).
   */
  recognize(input: WEDMPartInput): WEDMPartRecognitionResult {
    const entities = input.entities ?? [];
    const warnings: string[] = [];
    const features: PartFeature[] = [];
    const startHoles: StartHoleCandidate[] = [];
    const entityCounts: Record<string, number> = {};

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      entityCounts[e.type] = (entityCounts[e.type] ?? 0) + 1;

      if (e.type === "CIRCLE") {
        const feat = circleToFeature(e, i, input.thickness_mm);
        features.push(feat);
        const d = e.data ?? {};
        const cx = d.cx ?? d.center?.x ?? 0;
        const cy = d.cy ?? d.center?.y ?? 0;
        startHoles.push({
          center: { x: cx, y: cy },
          diameter_mm: feat.dimensions_mm.diameter ?? 0,
          source_feature: feat.name,
          accessibility: "through",
          confidence: 0.95,
        });
        continue;
      }

      if (e.type === "LWPOLYLINE" || e.type === "POLYLINE") {
        const verts = polylineVertices(e);
        if (verts.length < 2) {
          warnings.push(`Polyline ${i} has <2 vertices — skipped`);
          continue;
        }
        if (isClosedPolyline(e, verts)) {
          const feat = classifyClosedLoop(verts, input.thickness_mm, i);
          features.push(feat);
          const c = polygonCentroid(verts);
          const bb = polygonBounds(verts);
          startHoles.push({
            center: c,
            diameter_mm: Math.min(2, Math.min(bb.width_mm, bb.height_mm) * 0.5),
            source_feature: feat.name,
            accessibility: "interior",
            confidence: 0.85,
          });
        } else {
          features.push(openPolylineToContour(verts, i, input.thickness_mm));
        }
        continue;
      }

      if (e.type === "ARC") {
        // Treated as a cavity marker; single arcs seldom define a WEDM feature
        // but are informative for contour length estimates.
        const d = e.data ?? {};
        const rad = d.radius ?? 0;
        if (rad > 0) {
          features.push({
            name: `cavity-${i}`,
            type: "cavity",
            is_through: true,
            dimensions_mm: { diameter: rad * 2, depth: input.thickness_mm },
            min_corner_radius_mm: rad,
          });
        }
        continue;
      }

      // Other DXF entity types (TEXT, DIMENSION, POINT, ...) are ignored
      // but still counted for diagnostics.
    }

    // Part-level geometry aggregates
    const allVerts: Point2D[] = [];
    for (const e of entities) {
      if (e.type === "LWPOLYLINE" || e.type === "POLYLINE") {
        allVerts.push(...polylineVertices(e));
      } else if (e.type === "CIRCLE") {
        const d = e.data ?? {};
        const cx = d.cx ?? d.center?.x ?? 0;
        const cy = d.cy ?? d.center?.y ?? 0;
        const r = d.radius ?? 0;
        allVerts.push({ x: cx - r, y: cy - r }, { x: cx + r, y: cy + r });
      }
    }
    const bounds = allVerts.length > 0 ? polygonBounds(allVerts) : null;
    const centroid = allVerts.length > 0 ? polygonCentroid(allVerts) : null;

    if (features.length === 0 && entities.length > 0) {
      warnings.push(
        `No WEDM-relevant features extracted from ${entities.length} entities`,
      );
    }

    // Delegate final process classification to the existing drawing engine.
    let classification: EDMDrawingResult | null = null;
    if (features.length > 0) {
      classification = edmDrawingInterpretationEngine.interpret({
        features,
        material: input.material,
        overall_thickness_mm: input.thickness_mm,
        tolerance_mm: input.tolerance_mm,
        target_ra_um: input.target_ra_um,
      });
    }

    const confidence = this.scoreConfidence(features, entities.length, warnings);

    return {
      features,
      bounds,
      centroid,
      start_hole_candidates: startHoles,
      warnings,
      entity_counts: entityCounts,
      confidence,
      classification,
    };
  }

  /** Compute a single bounding box for an entity stream, or null if empty. */
  bounds(entities: DXFEntity[]): BoundingBox | null {
    const r = this.recognize({ entities });
    return r.bounds;
  }

  /** Candidate start-hole list sorted by accessibility + size. */
  startHoleCandidates(input: WEDMPartInput): StartHoleCandidate[] {
    const r = this.recognize(input);
    return [...r.start_hole_candidates].sort((a, b) => {
      if (a.accessibility !== b.accessibility) {
        return a.accessibility === "through"
          ? -1
          : b.accessibility === "through"
            ? 1
            : a.accessibility === "interior"
              ? -1
              : 1;
      }
      return b.diameter_mm - a.diameter_mm;
    });
  }

  /** Confidence = feature-yield rate × warnings penalty (∈ [0, 1]). */
  private scoreConfidence(
    features: PartFeature[],
    entityCount: number,
    warnings: string[],
  ): number {
    if (entityCount === 0) return 0;
    const yieldRate = Math.min(1, features.length / Math.max(1, entityCount));
    const penalty = Math.min(0.3, warnings.length * 0.05);
    return Math.max(0, yieldRate - penalty);
  }
}

export const wedmPartRecognitionEngine = new WEDMPartRecognitionEngine();
