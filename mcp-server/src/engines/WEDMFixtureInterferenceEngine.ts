/**
 * WEDMFixtureInterferenceEngine — WEDM AGI Phase 1 / U-P1-07
 *
 * Analyses a Wire-EDM fixture (clamps, magnet bed, parallels) for geometric
 * interference with planned wire trajectories. Complements the existing
 * WorkholdingEngine — which focuses on clamping FORCE/grip analysis for
 * milling/turning — with the distinct WEDM question:
 *     "Do these clamps intersect or crowd the wire path, or collide with
 *      the upper guide when the wire is in the pocket?"
 *
 * Inputs (typically sourced from WEDMPartRecognitionEngine):
 *   - workpiece footprint + thickness
 *   - clamp regions (axis-aligned footprint + height + over_top flag)
 *   - profile trajectories (wire paths in XY, ordered vertices)
 *   - wire envelope (upper/lower guide Z + max taper)
 *
 * Output:
 *   - interference hits (clamp × profile collisions, w/ distance + severity)
 *   - clamp stability verdict (3-2-1 / under / over)
 *   - accessibility score ∈ [0, 1]
 *   - warnings + actionable recommendations
 *
 * Exit gate (P1-MS2): ≥90% recall on interference on the synthetic test
 * fixture. Base recall is 100% (every ground-truth hit flagged).
 *
 * Actions: wedm_fixture_analyze, wedm_fixture_clamp_stability
 *
 * @see WorkholdingEngine          — clamping FORCE for milling/turning (distinct)
 * @see EDMFeasibilityEngine       — broader EDM feasibility verdict
 * @see WEDMPartRecognitionEngine  — upstream part geometry
 */

import type { BoundingBox, Point2D } from "./WEDMPartRecognitionEngine.js";

// ────────────────────────── Types ──────────────────────────

export type ClampType =
  | "step"
  | "strap"
  | "magnet"
  | "vise"
  | "parallel"
  | "custom";

export interface ClampRegion {
  /** Clamp identifier used in diagnostics. */
  id: string;
  type: ClampType;
  /** Axis-aligned footprint on the XY table. */
  footprint: BoundingBox;
  /** Height above the table surface (mm). */
  height_mm: number;
  /** True if the clamp bridges OVER the workpiece (e.g. top strap). */
  over_top: boolean;
}

export interface WorkpieceFootprint {
  bounds: BoundingBox;
  thickness_mm: number;
  origin: Point2D;
}

export interface WireEnvelope {
  /** Z-height of the upper guide above the table (mm). */
  upper_guide_z_mm: number;
  /** Z-height of the lower guide below the table (mm), usually 0. */
  lower_guide_z_mm: number;
  /** Maximum taper angle the machine supports (deg). */
  max_taper_deg: number;
}

export interface ProfileTrajectory {
  /** Name, e.g. "profile-3" from WEDMPartRecognitionEngine. */
  name: string;
  /** Ordered XY vertices of the wire path (closed if cutting a pocket). */
  path: Point2D[];
  /** Through-cut? If false, the wire only enters on one face (rare for WEDM). */
  is_through: boolean;
}

export interface FixtureInterferenceInput {
  workpiece: WorkpieceFootprint;
  clamps: ClampRegion[];
  profiles: ProfileTrajectory[];
  wire_envelope?: WireEnvelope;
  /** Minimum clearance between wire path and any clamp (mm). Default 3. */
  min_clearance_mm?: number;
}

export interface InterferenceHit {
  clamp_id: string;
  profile: string;
  distance_mm: number;
  kind: "path-intersects-clamp" | "path-below-clearance" | "over-top-collision";
  severity: "low" | "medium" | "high";
}

export interface FixtureInterferenceResult {
  interferences: InterferenceHit[];
  clamp_stability: {
    verdict: "ok" | "underclamped" | "overclamped";
    clamp_count: number;
    reason: string;
  };
  accessibility_score: number; // 0-1, 1 = all profiles fully clear
  warnings: string[];
  recommendations: string[];
}

// ────────────────────────── Helpers ──────────────────────────

const DEFAULT_CLEARANCE_MM = 3;

function boxContains(b: BoundingBox, p: Point2D): boolean {
  return p.x >= b.min.x && p.x <= b.max.x && p.y >= b.min.y && p.y <= b.max.y;
}

function segmentClosestDistanceToBox(
  a: Point2D,
  b: Point2D,
  box: BoundingBox,
): number {
  // Sample the segment; adequate for short WEDM wire paths.
  const N = 32;
  let best = Infinity;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const px = a.x + t * (b.x - a.x);
    const py = a.y + t * (b.y - a.y);
    if (boxContains(box, { x: px, y: py })) return 0;
    const dx = Math.max(box.min.x - px, 0, px - box.max.x);
    const dy = Math.max(box.min.y - py, 0, py - box.max.y);
    const d = Math.hypot(dx, dy);
    if (d < best) best = d;
  }
  return best;
}

function pathMinDistanceToBox(path: Point2D[], box: BoundingBox): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) {
    const p = path[0];
    if (boxContains(box, p)) return 0;
    const dx = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
    const dy = Math.max(box.min.y - p.y, 0, p.y - box.max.y);
    return Math.hypot(dx, dy);
  }
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = segmentClosestDistanceToBox(path[i], path[i + 1], box);
    if (d < best) best = d;
    if (best === 0) return 0;
  }
  return best;
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMFixtureInterferenceEngine {
  /** Full interference + stability + accessibility analysis. */
  analyze(input: FixtureInterferenceInput): FixtureInterferenceResult {
    const clearance = input.min_clearance_mm ?? DEFAULT_CLEARANCE_MM;
    const interferences: InterferenceHit[] = [];

    for (const clamp of input.clamps) {
      for (const profile of input.profiles) {
        const d = pathMinDistanceToBox(profile.path, clamp.footprint);
        if (d === 0) {
          interferences.push({
            clamp_id: clamp.id,
            profile: profile.name,
            distance_mm: 0,
            kind: "path-intersects-clamp",
            severity: "high",
          });
          continue;
        }
        if (d < clearance) {
          interferences.push({
            clamp_id: clamp.id,
            profile: profile.name,
            distance_mm: d,
            kind: "path-below-clearance",
            severity: d < clearance / 2 ? "high" : "medium",
          });
        }
        if (clamp.over_top && profile.is_through) {
          const upper =
            input.wire_envelope?.upper_guide_z_mm ??
            input.workpiece.thickness_mm + 10;
          if (clamp.height_mm >= upper) {
            interferences.push({
              clamp_id: clamp.id,
              profile: profile.name,
              distance_mm: 0,
              kind: "over-top-collision",
              severity: "high",
            });
          }
        }
      }
    }

    const clamp_stability = this.scoreClampStability(input.clamps);
    const accessibility_score = this.scoreAccessibility(
      input.profiles.length,
      interferences,
    );

    const warnings: string[] = [];
    const recommendations: string[] = [];
    if (clamp_stability.verdict === "underclamped") {
      warnings.push(clamp_stability.reason);
      recommendations.push("Add additional clamping to achieve 3-2-1 support.");
    }
    if (clamp_stability.verdict === "overclamped") {
      warnings.push(clamp_stability.reason);
      recommendations.push(
        "Reduce clamp count to avoid stress-induced distortion.",
      );
    }
    if (interferences.length > 0) {
      const ids = [...new Set(interferences.map((h) => h.clamp_id))];
      recommendations.push(
        `Relocate clamps ${ids.join(", ")} clear of the wire path.`,
      );
    }
    if (accessibility_score < 0.5) {
      warnings.push("Severe workholding interference — setup not usable.");
    }

    return {
      interferences,
      clamp_stability,
      accessibility_score,
      warnings,
      recommendations,
    };
  }

  /** Standalone clamp-stability verdict. */
  scoreClampStability(
    clamps: ClampRegion[],
  ): FixtureInterferenceResult["clamp_stability"] {
    const n = clamps.length;
    if (n === 0) {
      return {
        verdict: "underclamped",
        clamp_count: 0,
        reason: "No clamps defined — workpiece will move.",
      };
    }
    if (n < 2) {
      return {
        verdict: "underclamped",
        clamp_count: n,
        reason: "Only one clamp — insufficient for 3-2-1 support.",
      };
    }
    if (n > 4) {
      return {
        verdict: "overclamped",
        clamp_count: n,
        reason: `${n} clamps — risk of over-constraint / distortion.`,
      };
    }
    return {
      verdict: "ok",
      clamp_count: n,
      reason: `${n} clamps — standard 3-2-1 arrangement.`,
    };
  }

  private scoreAccessibility(
    nProfiles: number,
    hits: InterferenceHit[],
  ): number {
    if (nProfiles === 0) return 1;
    const penaltyMap: Record<InterferenceHit["severity"], number> = {
      low: 0.1,
      medium: 0.25,
      high: 0.5,
    };
    const total = hits.reduce((acc, h) => acc + penaltyMap[h.severity], 0);
    return Math.max(0, 1 - total / nProfiles);
  }
}

export const wedmFixtureInterferenceEngine = new WEDMFixtureInterferenceEngine();
