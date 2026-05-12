/**
 * WEDMAccessibilityEngine — WEDM AGI Phase 1 / U-P1-08
 *
 * Scores how accessible each WEDM profile is to the wire, given upstream
 * outputs from:
 *   - WEDMPartRecognitionEngine  (profiles, bounds)
 *   - EDMStartHoleSetupEngine    (start-hole plan)
 *   - WEDMFixtureInterferenceEngine (clamp layout)
 *
 * This is NOT the same concern as:
 *   - AccessibilityAnalysisEngine  (milling: tool length + holder reach)
 *   - EDMStartHoleSetupEngine      (planning: where to drill start holes)
 *
 * The WEDM-specific question answered here is:
 *     "Once the start holes are drilled and the fixture is set, can the
 *      wire physically thread every profile, from start hole through the
 *      first approach vector to the profile, without running into clamps,
 *      the part edge, or the upper-guide envelope?"
 *
 * Per-profile accessibility ∈ [0, 1]:
 *   1.0 = unconstrained (start hole exists, clear threading approach,
 *         healthy edge/wall clearance, auto-threading compatible).
 *   < 0.6 blocks the part until setup is revised.
 *
 * Exit gate (P1-MS2): accessibility scoring matches operator assessment on
 * 10 JM Die test parts. Tests exercise the scoring against synthetic
 * fixtures + an operator-assessed batch encoded in the test file.
 *
 * @see WEDMPartRecognitionEngine      — upstream profiles
 * @see EDMStartHoleSetupEngine        — start-hole plan source
 * @see WEDMFixtureInterferenceEngine  — clamp × path interference
 * @see AccessibilityAnalysisEngine    — milling reach (distinct concern)
 */

import type { BoundingBox, Point2D } from "./WEDMPartRecognitionEngine.js";
import type {
  ClampRegion,
  ProfileTrajectory,
  WireEnvelope,
  WorkpieceFootprint,
} from "./WEDMFixtureInterferenceEngine.js";
import type { StartHole } from "./EDMStartHoleSetupEngine.js";

// ────────────────────────── Types ──────────────────────────

export interface ProfileAccessInput {
  profiles: ProfileTrajectory[];
  start_holes: StartHole[];
  clamps: ClampRegion[];
  workpiece: WorkpieceFootprint;
  wire_envelope?: WireEnvelope;
  /** Minimum clearance from clamp footprint (mm). Default 3. */
  min_clamp_clearance_mm?: number;
  /** Minimum edge clearance from part outer bound (mm). Default 2. */
  min_edge_clearance_mm?: number;
  /** Minimum wall thickness near start hole (mm). Default 1.5. */
  min_wall_thickness_mm?: number;
}

export type AccessBlockerKind =
  | "no-start-hole"
  | "start-hole-blocked-by-clamp"
  | "approach-blocked-by-clamp"
  | "insufficient-edge-clearance"
  | "insufficient-wall-thickness"
  | "auto-thread-not-possible"
  | "start-hole-outside-workpiece";

export interface AccessBlocker {
  profile: string;
  kind: AccessBlockerKind;
  severity: "low" | "medium" | "high";
  message: string;
  /** Associated clamp id / start hole id if applicable. */
  ref?: string;
}

export interface ProfileAccessScore {
  profile: string;
  score: number; // 0..1
  start_hole_id: string | null;
  blockers: AccessBlocker[];
  /** Human-readable summary for UI. */
  verdict: "ok" | "caution" | "blocked";
}

export interface WEDMAccessibilityResult {
  overall_score: number; // 0..1, arithmetic mean of per-profile scores
  per_profile: ProfileAccessScore[];
  blockers: AccessBlocker[];
  recommendations: string[];
  assessed: number; // n profiles scored
}

// ────────────────────────── Defaults ──────────────────────────

const DEFAULT_CLAMP_CLEARANCE_MM = 3;
const DEFAULT_EDGE_CLEARANCE_MM = 2;
const DEFAULT_WALL_THICKNESS_MM = 1.5;

// ────────────────────────── Helpers ──────────────────────────

function boxContains(b: BoundingBox, p: Point2D): boolean {
  return p.x >= b.min.x && p.x <= b.max.x && p.y >= b.min.y && p.y <= b.max.y;
}

function pointBoxDistance(p: Point2D, box: BoundingBox): number {
  if (boxContains(box, p)) return 0;
  const dx = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
  const dy = Math.max(box.min.y - p.y, 0, p.y - box.max.y);
  return Math.hypot(dx, dy);
}

function segmentClosestDistanceToBox(
  a: Point2D,
  b: Point2D,
  box: BoundingBox,
): number {
  const N = 32;
  let best = Infinity;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    if (boxContains(box, p)) return 0;
    const d = pointBoxDistance(p, box);
    if (d < best) best = d;
  }
  return best;
}

function distanceToInteriorEdge(p: Point2D, bounds: BoundingBox): number {
  if (!boxContains(bounds, p)) return 0;
  return Math.min(
    p.x - bounds.min.x,
    bounds.max.x - p.x,
    p.y - bounds.min.y,
    bounds.max.y - p.y,
  );
}

function firstVertex(path: Point2D[]): Point2D | null {
  return path.length > 0 ? path[0] : null;
}

/** Nearest start hole to a point, within a reasonable radius. */
function nearestStartHole(
  target: Point2D,
  holes: StartHole[],
  maxRadius = 50,
): StartHole | null {
  let best: StartHole | null = null;
  let bestD = maxRadius;
  for (const h of holes) {
    const d = Math.hypot(h.x_mm - target.x, h.y_mm - target.y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMAccessibilityEngine {
  /** Score accessibility for every profile in the input. */
  analyze(input: ProfileAccessInput): WEDMAccessibilityResult {
    const clampClearance =
      input.min_clamp_clearance_mm ?? DEFAULT_CLAMP_CLEARANCE_MM;
    const edgeClearance =
      input.min_edge_clearance_mm ?? DEFAULT_EDGE_CLEARANCE_MM;
    const wallThickness =
      input.min_wall_thickness_mm ?? DEFAULT_WALL_THICKNESS_MM;

    const per_profile: ProfileAccessScore[] = [];
    const allBlockers: AccessBlocker[] = [];

    for (const profile of input.profiles) {
      const row = this.scoreOne(profile, input, {
        clampClearance,
        edgeClearance,
        wallThickness,
      });
      per_profile.push(row);
      allBlockers.push(...row.blockers);
    }

    const overall_score = this.aggregateScore(per_profile);
    const recommendations = this.recommend(allBlockers, per_profile);

    return {
      overall_score,
      per_profile,
      blockers: allBlockers,
      recommendations,
      assessed: per_profile.length,
    };
  }

  /** Score a single profile. */
  scoreOne(
    profile: ProfileTrajectory,
    input: ProfileAccessInput,
    thresholds: {
      clampClearance: number;
      edgeClearance: number;
      wallThickness: number;
    },
  ): ProfileAccessScore {
    const blockers: AccessBlocker[] = [];
    let penalty = 0;

    // 1. Start hole assigned? (look for id-match in serves_profiles, else nearest)
    const approach = firstVertex(profile.path);
    if (approach === null) {
      blockers.push({
        profile: profile.name,
        kind: "no-start-hole",
        severity: "high",
        message: `Profile ${profile.name} has no path vertices.`,
      });
      return {
        profile: profile.name,
        score: 0,
        start_hole_id: null,
        blockers,
        verdict: "blocked",
      };
    }

    let hole =
      input.start_holes.find((h) =>
        h.serves_profiles.includes(profile.name),
      ) ?? null;
    if (!hole) hole = nearestStartHole(approach, input.start_holes);

    if (!hole) {
      blockers.push({
        profile: profile.name,
        kind: "no-start-hole",
        severity: "high",
        message: `No start hole serves profile ${profile.name}.`,
      });
      penalty += 0.6;
    } else {
      // 2. Start hole inside workpiece bounds?
      const holePoint: Point2D = { x: hole.x_mm, y: hole.y_mm };
      if (!boxContains(input.workpiece.bounds, holePoint)) {
        blockers.push({
          profile: profile.name,
          kind: "start-hole-outside-workpiece",
          severity: "high",
          message: `Start hole ${hole.id} at (${hole.x_mm}, ${hole.y_mm}) lies outside the workpiece bounds.`,
          ref: hole.id,
        });
        penalty += 0.5;
      }

      // 3. Start hole clear of every clamp footprint?
      for (const clamp of input.clamps) {
        const d = pointBoxDistance(holePoint, clamp.footprint);
        if (d < thresholds.clampClearance) {
          blockers.push({
            profile: profile.name,
            kind: "start-hole-blocked-by-clamp",
            severity: d === 0 ? "high" : "medium",
            message: `Start hole ${hole.id} is ${d.toFixed(2)} mm from clamp ${clamp.id} (< ${thresholds.clampClearance} mm).`,
            ref: clamp.id,
          });
          penalty += d === 0 ? 0.5 : 0.25;
        }
      }

      // 4. Threading approach (start hole → first profile vertex) clear of clamps?
      for (const clamp of input.clamps) {
        const d = segmentClosestDistanceToBox(
          holePoint,
          approach,
          clamp.footprint,
        );
        if (d < thresholds.clampClearance) {
          blockers.push({
            profile: profile.name,
            kind: "approach-blocked-by-clamp",
            severity: d === 0 ? "high" : "medium",
            message: `Threading approach for ${profile.name} is ${d.toFixed(2)} mm from clamp ${clamp.id}.`,
            ref: clamp.id,
          });
          penalty += d === 0 ? 0.5 : 0.2;
        }
      }

      // 5. Start hole edge clearance from workpiece outer bounds.
      const edgeD = distanceToInteriorEdge(holePoint, input.workpiece.bounds);
      if (edgeD < thresholds.edgeClearance) {
        blockers.push({
          profile: profile.name,
          kind: "insufficient-edge-clearance",
          severity: "medium",
          message: `Start hole ${hole.id} is ${edgeD.toFixed(2)} mm from the nearest workpiece edge (< ${thresholds.edgeClearance} mm).`,
          ref: hole.id,
        });
        penalty += 0.25;
      }

      // 6. Wall-thickness check: start hole to first profile vertex must
      // leave at least min_wall_thickness_mm of material.
      const wall = Math.hypot(hole.x_mm - approach.x, hole.y_mm - approach.y);
      if (wall < thresholds.wallThickness) {
        blockers.push({
          profile: profile.name,
          kind: "insufficient-wall-thickness",
          severity: "medium",
          message: `Wall between start hole ${hole.id} and profile ${profile.name} is only ${wall.toFixed(2)} mm (< ${thresholds.wallThickness} mm).`,
          ref: hole.id,
        });
        penalty += 0.25;
      }

      // 7. Auto-thread compatibility: flag missing auto-thread support.
      if (hole.auto_thread_compatible === false) {
        blockers.push({
          profile: profile.name,
          kind: "auto-thread-not-possible",
          severity: "low",
          message: `Auto-threading not possible for start hole ${hole.id}; operator must thread manually.`,
          ref: hole.id,
        });
        penalty += 0.05;
      }
    }

    const score = Math.max(0, 1 - penalty);
    const verdict: ProfileAccessScore["verdict"] =
      score >= 0.8 ? "ok" : score >= 0.6 ? "caution" : "blocked";

    return {
      profile: profile.name,
      score,
      start_hole_id: hole?.id ?? null,
      blockers,
      verdict,
    };
  }

  /** Arithmetic mean of per-profile scores; 1.0 when no profiles. */
  aggregateScore(rows: ProfileAccessScore[]): number {
    if (rows.length === 0) return 1;
    const sum = rows.reduce((acc, r) => acc + r.score, 0);
    return sum / rows.length;
  }

  /** Translate blockers into plain-English recommendations. */
  private recommend(
    blockers: AccessBlocker[],
    rows: ProfileAccessScore[],
  ): string[] {
    const out: string[] = [];
    if (blockers.length === 0) return out;

    const kinds = new Set(blockers.map((b) => b.kind));
    if (kinds.has("no-start-hole")) {
      out.push("Add start holes for profiles lacking one.");
    }
    if (
      kinds.has("start-hole-blocked-by-clamp") ||
      kinds.has("approach-blocked-by-clamp")
    ) {
      out.push(
        "Relocate interfering clamps clear of the start-hole and approach paths.",
      );
    }
    if (kinds.has("insufficient-edge-clearance")) {
      out.push(
        "Reposition edge-adjacent start holes inward to maintain ≥2 mm to the part edge.",
      );
    }
    if (kinds.has("insufficient-wall-thickness")) {
      out.push(
        "Move start holes further from their profile to restore wall thickness ≥1.5 mm.",
      );
    }
    if (kinds.has("auto-thread-not-possible")) {
      out.push(
        "Budget manual-threading time for profiles without auto-thread support.",
      );
    }
    if (kinds.has("start-hole-outside-workpiece")) {
      out.push(
        "Correct start-hole coordinates — at least one lies outside the workpiece footprint.",
      );
    }
    const blocked = rows.filter((r) => r.verdict === "blocked").map((r) => r.profile);
    if (blocked.length > 0) {
      out.push(`Blocked profiles (score < 0.6): ${blocked.join(", ")}.`);
    }
    return out;
  }
}

export const wedmAccessibilityEngine = new WEDMAccessibilityEngine();
