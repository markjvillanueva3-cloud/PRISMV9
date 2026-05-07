/**
 * CAMOptimizationSuggestionEngine — AI Recommendations (U-CAM103)
 * ================================================================
 *
 * PHASE-7: AI-style parameter recommender that proposes one-click,
 * physics-justified parameter changes for the current CAM operation.
 *
 * Three optimization goals are supported, each producing zero or more
 * suggestions ranked by predicted improvement:
 *
 *   cycle_time     — push fz / ae / rpm up to extract MRR headroom
 *   tool_life      — pull rpm / fz back to extend Taylor life
 *   surface_finish — drop fz to push Ra below the target
 *
 * Each suggestion is delivered as a SuggestionPatch — a sparse delta over
 * the current ToolpathSegment — so a CAM UI can preview the diff and
 * apply with a single click. Patches are bounded by absolute parameter
 * limits (rpm/fz/ap/ae caps) and by the U-CAM102 prediction stack:
 * a suggestion that would raise *any* predictor's severity past
 * PRIORITY_HIGH is rejected — we never trade safety for cycle time.
 *
 *   ┌──────────────┐   recommend(goal)   ┌────────────────────┐
 *   │ baseline seg │ ───────────────────► │ Suggestion list    │
 *   └──────────────┘                      └─────────┬──────────┘
 *                                                   │ apply()
 *                                                   ▼
 *                                          patched ToolpathSegment
 *
 * Per-target encoders mirror the U-CAM101/102 layout (hyperMILL XML,
 * Fusion JSON-RPC, Inventor JSON, Mastercam pipe-delimited, generic).
 *
 * @module engines/CAMOptimizationSuggestionEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM103
 */

import { z } from "zod";
import {
  CAMMachiningErrorPredictionEngine,
  ToolpathSegmentSchema,
  type ToolpathSegment,
  PRIORITY_HIGH,
} from "./CAMMachiningErrorPredictionEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const SuggestionTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type SuggestionTarget = z.infer<typeof SuggestionTargetSchema>;

export const OptimizationGoalSchema = z.enum([
  "cycle_time",
  "tool_life",
  "surface_finish",
]);
export type OptimizationGoal = z.infer<typeof OptimizationGoalSchema>;

/** Hard limits the recommender must honor. Defaults are conservative. */
export const SuggestionLimitsSchema = z.object({
  rpm_max: z.number().positive(),
  rpm_min: z.number().positive(),
  fz_max_mm: z.number().positive(),
  fz_min_mm: z.number().positive(),
  ap_max_mm: z.number().positive(),
  ae_max_mm: z.number().positive(),
});
export type SuggestionLimits = z.infer<typeof SuggestionLimitsSchema>;

export const SuggestionPatchSchema = z.object({
  rpm: z.number().positive().optional(),
  fz_mm: z.number().nonnegative().optional(),
  ap_mm: z.number().nonnegative().optional(),
  ae_mm: z.number().nonnegative().optional(),
});
export type SuggestionPatch = z.infer<typeof SuggestionPatchSchema>;

export const SuggestionSchema = z.object({
  goal: OptimizationGoalSchema,
  description: z.string(),
  patch: SuggestionPatchSchema,
  /** Predicted improvement, normalized 0..1 (higher = better). */
  improvement: z.number().min(0).max(1),
  /** Parameter that drove the suggestion (for UI grouping). */
  driver: z.enum(["rpm", "fz_mm", "ap_mm", "ae_mm"]),
  /** Free-form why-string for the operator. */
  rationale: z.string(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SuggestionReportSchema = z.object({
  session_id: z.string(),
  goal: OptimizationGoalSchema,
  baseline_index: z.number().int().nonnegative(),
  suggestion_count: z.number().int().nonnegative(),
  suggestions: z.array(SuggestionSchema),
});
export type SuggestionReport = z.infer<typeof SuggestionReportSchema>;

export const SuggestionStatsSchema = z.object({
  recommends: z.number().int().nonnegative(),
  suggestions_emitted: z.number().int().nonnegative(),
  applied: z.number().int().nonnegative(),
  per_goal_count: z.record(OptimizationGoalSchema, z.number()),
});
export type SuggestionStats = z.infer<typeof SuggestionStatsSchema>;

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_LIMITS: SuggestionLimits = Object.freeze({
  rpm_max: 24000,
  rpm_min: 100,
  fz_max_mm: 0.5,
  fz_min_mm: 0.005,
  ap_max_mm: 25,
  ae_max_mm: 25,
});

/** Multiplicative step sizes per goal — moderate so suggestions feel tunable. */
const STEP = {
  rpm_up: 1.10,
  rpm_down: 0.90,
  fz_up: 1.15,
  fz_down: 0.80,
  ap_up: 1.20,
  ae_up: 1.25,
} as const;

const DEFAULT_TOP_N = 5;

// ── Internal state ───────────────────────────────────────────────────────────

interface SessionTrack {
  stats: SuggestionStats;
}

const tracks = new Map<string, SessionTrack>();

function makeEmptyStats(): SuggestionStats {
  return {
    recommends: 0,
    suggestions_emitted: 0,
    applied: 0,
    per_goal_count: { cycle_time: 0, tool_life: 0, surface_finish: 0 },
  };
}

function ensureTrack(session_id: string): SessionTrack {
  let t = tracks.get(session_id);
  if (!t) {
    t = { stats: makeEmptyStats() };
    tracks.set(session_id, t);
  }
  return t;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Estimate MRR (mm³/min) from a segment. */
export function mrrOf(s: ToolpathSegment): number {
  return s.ap_mm * s.ae_mm * s.rpm * s.flutes * s.fz_mm;
}

/** Apply a sparse patch to a baseline segment, returning a new segment. */
export function applyPatch(
  baseline: ToolpathSegment,
  patch: SuggestionPatch,
): ToolpathSegment {
  return ToolpathSegmentSchema.parse({
    ...baseline,
    ...(patch.rpm !== undefined ? { rpm: patch.rpm } : {}),
    ...(patch.fz_mm !== undefined ? { fz_mm: patch.fz_mm } : {}),
    ...(patch.ap_mm !== undefined ? { ap_mm: patch.ap_mm } : {}),
    ...(patch.ae_mm !== undefined ? { ae_mm: patch.ae_mm } : {}),
  });
}

/** True iff every predictor's severity stays below PRIORITY_HIGH. */
export function isSafe(s: ToolpathSegment): boolean {
  const alerts = CAMMachiningErrorPredictionEngine.evaluateSegment(s);
  return alerts.every(a => a.severity < PRIORITY_HIGH);
}

// ── Goal-specific generators ─────────────────────────────────────────────────

function suggestForCycleTime(
  s: ToolpathSegment,
  L: SuggestionLimits,
): Suggestion[] {
  const out: Suggestion[] = [];
  const baseMrr = mrrOf(s);

  // 1) bump fz upward (most direct MRR lever, and the tool-life cost is
  //    smaller than rpm bumps because Taylor is rpm-dominated)
  const fzNew = clamp(s.fz_mm * STEP.fz_up, L.fz_min_mm, L.fz_max_mm);
  if (fzNew > s.fz_mm) {
    const candidate = { ...s, fz_mm: fzNew };
    if (isSafe(candidate)) {
      const improvement = clamp(
        (mrrOf(candidate) / Math.max(baseMrr, 1) - 1),
        0, 1,
      );
      out.push({
        goal: "cycle_time",
        description: `Increase chip load fz ${s.fz_mm.toFixed(3)}→${fzNew.toFixed(3)} mm`,
        patch: { fz_mm: fzNew },
        improvement,
        driver: "fz_mm",
        rationale: "Higher chip load lifts MRR with predictors still in the safe band.",
      });
    }
  }

  // 2) bump rpm
  const rpmNew = clamp(s.rpm * STEP.rpm_up, L.rpm_min, L.rpm_max);
  if (rpmNew > s.rpm) {
    const candidate = { ...s, rpm: rpmNew };
    if (isSafe(candidate)) {
      const improvement = clamp(
        (mrrOf(candidate) / Math.max(baseMrr, 1) - 1),
        0, 1,
      );
      out.push({
        goal: "cycle_time",
        description: `Increase spindle speed ${s.rpm.toFixed(0)}→${rpmNew.toFixed(0)} rpm`,
        patch: { rpm: rpmNew },
        improvement,
        driver: "rpm",
        rationale: "Faster spindle increases feed rate proportionally; chatter & thermal still safe.",
      });
    }
  }

  // 3) bump ae (radial engagement)
  const aeNew = clamp(s.ae_mm * STEP.ae_up, 0.01, L.ae_max_mm);
  if (aeNew > s.ae_mm) {
    const candidate = { ...s, ae_mm: aeNew };
    if (isSafe(candidate)) {
      const improvement = clamp(
        (mrrOf(candidate) / Math.max(baseMrr, 1) - 1),
        0, 1,
      );
      out.push({
        goal: "cycle_time",
        description: `Increase radial engagement ae ${s.ae_mm.toFixed(2)}→${aeNew.toFixed(2)} mm`,
        patch: { ae_mm: aeNew },
        improvement,
        driver: "ae_mm",
        rationale: "Wider stepover reduces pass count without crossing chatter threshold.",
      });
    }
  }

  return out;
}

function suggestForToolLife(
  s: ToolpathSegment,
  L: SuggestionLimits,
): Suggestion[] {
  const out: Suggestion[] = [];

  // 1) drop rpm (Taylor: T scales as Vc^(-1/n), so a small Vc drop is a big T gain)
  const rpmNew = clamp(s.rpm * STEP.rpm_down, L.rpm_min, L.rpm_max);
  if (rpmNew < s.rpm) {
    const improvement = clamp(1 - rpmNew / s.rpm, 0, 1);
    out.push({
      goal: "tool_life",
      description: `Reduce spindle speed ${s.rpm.toFixed(0)}→${rpmNew.toFixed(0)} rpm`,
      patch: { rpm: rpmNew },
      improvement,
      driver: "rpm",
      rationale: "Lower Vc extends Taylor life T = (C/Vc)^(1/n) substantially.",
    });
  }

  // 2) drop fz a touch (load reduction)
  const fzNew = clamp(s.fz_mm * STEP.fz_down, L.fz_min_mm, L.fz_max_mm);
  if (fzNew < s.fz_mm) {
    const improvement = clamp(1 - fzNew / s.fz_mm, 0, 1);
    out.push({
      goal: "tool_life",
      description: `Reduce chip load fz ${s.fz_mm.toFixed(3)}→${fzNew.toFixed(3)} mm`,
      patch: { fz_mm: fzNew },
      improvement,
      driver: "fz_mm",
      rationale: "Lower fz lowers Fc (Kienzle) and edge stress.",
    });
  }

  return out;
}

function suggestForSurfaceFinish(
  s: ToolpathSegment,
  L: SuggestionLimits,
): Suggestion[] {
  const out: Suggestion[] = [];
  if (s.ra_target_um === undefined) return out;

  // Only suggest if predicted Ra exceeds target.
  const r_mm = 0.05 * s.tool_diameter_mm;
  if (r_mm <= 0) return out;
  const ra_um = (s.fz_mm * s.fz_mm) / (32 * r_mm) * 1000;
  if (ra_um <= s.ra_target_um) return out;

  // Solve for fz that hits exactly the target Ra: fz = sqrt(32·r·Ra/1000).
  const fzExact = Math.sqrt((32 * r_mm * s.ra_target_um) / 1000);
  // Drop a little extra below target for margin.
  const fzNew = clamp(fzExact * 0.95, L.fz_min_mm, L.fz_max_mm);
  if (fzNew < s.fz_mm) {
    const improvement = clamp(1 - (fzNew * fzNew) / (s.fz_mm * s.fz_mm), 0, 1);
    out.push({
      goal: "surface_finish",
      description: `Drop chip load fz ${s.fz_mm.toFixed(3)}→${fzNew.toFixed(3)} mm to hit Ra ≤ ${s.ra_target_um.toFixed(2)} µm`,
      patch: { fz_mm: fzNew },
      improvement,
      driver: "fz_mm",
      rationale: "Ra ≈ fz²/(32·r); reducing fz quadratically improves finish.",
    });
  }
  return out;
}

// ── Encoders ─────────────────────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodeHyperMill(report: SuggestionReport): string {
  const items = report.suggestions
    .map(
      sg =>
        `  <suggestion driver="${sg.driver}" goal="${sg.goal}" imp="${sg.improvement.toFixed(3)}">` +
        `<desc>${xmlEscape(sg.description)}</desc>` +
        `<rationale>${xmlEscape(sg.rationale)}</rationale></suggestion>`,
    )
    .join("\n");
  return `<suggestionReport session="${xmlEscape(report.session_id)}" goal="${report.goal}" count="${report.suggestion_count}">\n${items}\n</suggestionReport>`;
}

function encodeFusion(report: SuggestionReport): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "cam.optimizationSuggestions",
    params: report,
  });
}

function encodeInventor(report: SuggestionReport): string {
  return JSON.stringify({
    type: "hsm.optimizationSuggestions",
    sessionId: report.session_id,
    goal: report.goal,
    count: report.suggestion_count,
    suggestions: report.suggestions,
  });
}

function encodeMastercam(report: SuggestionReport): string {
  const safe = (s: string): string => s.replace(/\|/g, "/").replace(/\n/g, " ");
  const rows = report.suggestions
    .map(
      sg =>
        `${sg.goal}|${sg.driver}|${sg.improvement.toFixed(3)}|${safe(sg.description)}`,
    )
    .join("\n");
  return `OPTIMIZE|${report.session_id}|${report.goal}|${report.suggestion_count}\n${rows}`;
}

function encodeGeneric(report: SuggestionReport): string {
  return JSON.stringify({ type: "optimization_report", ...report });
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMOptimizationSuggestionEngine {
  static readonly DEFAULT_LIMITS = DEFAULT_LIMITS;

  static supportedTargets(): SuggestionTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }

  static supportedGoals(): OptimizationGoal[] {
    return ["cycle_time", "tool_life", "surface_finish"];
  }

  /** Generate suggestions for one segment and a single goal. */
  static recommend(
    session_id: string,
    baseline: ToolpathSegment,
    goal: OptimizationGoal,
    limits: SuggestionLimits = DEFAULT_LIMITS,
    topN: number = DEFAULT_TOP_N,
  ): SuggestionReport {
    const seg = ToolpathSegmentSchema.parse(baseline);
    OptimizationGoalSchema.parse(goal);
    SuggestionLimitsSchema.parse(limits);
    if (topN <= 0) throw new Error("topN must be positive");

    let raw: Suggestion[];
    switch (goal) {
      case "cycle_time":
        raw = suggestForCycleTime(seg, limits);
        break;
      case "tool_life":
        raw = suggestForToolLife(seg, limits);
        break;
      case "surface_finish":
        raw = suggestForSurfaceFinish(seg, limits);
        break;
    }

    raw.sort((a, b) => b.improvement - a.improvement);
    const top = raw.slice(0, topN);

    const track = ensureTrack(session_id);
    track.stats.recommends += 1;
    track.stats.suggestions_emitted += top.length;
    track.stats.per_goal_count[goal] += top.length;

    return {
      session_id,
      goal,
      baseline_index: seg.segment_index,
      suggestion_count: top.length,
      suggestions: top,
    };
  }

  /** Generate suggestions across all goals at once. */
  static recommendAll(
    session_id: string,
    baseline: ToolpathSegment,
    limits: SuggestionLimits = DEFAULT_LIMITS,
    topN: number = DEFAULT_TOP_N,
  ): Record<OptimizationGoal, SuggestionReport> {
    return {
      cycle_time: this.recommend(session_id, baseline, "cycle_time", limits, topN),
      tool_life: this.recommend(session_id, baseline, "tool_life", limits, topN),
      surface_finish: this.recommend(session_id, baseline, "surface_finish", limits, topN),
    };
  }

  /** Apply a suggestion's patch to a baseline segment and update stats. */
  static applySuggestion(
    session_id: string,
    baseline: ToolpathSegment,
    suggestion: Suggestion,
  ): ToolpathSegment {
    SuggestionSchema.parse(suggestion);
    const next = applyPatch(baseline, suggestion.patch);
    const track = ensureTrack(session_id);
    track.stats.applied += 1;
    return next;
  }

  /** Encode a SuggestionReport for a target plugin. */
  static encodeReport(
    report: SuggestionReport,
    target: SuggestionTarget,
  ): string {
    SuggestionTargetSchema.parse(target);
    SuggestionReportSchema.parse(report);
    switch (target) {
      case "hypermill":
        return encodeHyperMill(report);
      case "fusion360":
        return encodeFusion(report);
      case "inventor_hsm":
        return encodeInventor(report);
      case "mastercam":
        return encodeMastercam(report);
      case "generic":
      default:
        return encodeGeneric(report);
    }
  }

  static getStats(session_id: string): SuggestionStats {
    const t = tracks.get(session_id);
    if (!t) return makeEmptyStats();
    return {
      ...t.stats,
      per_goal_count: { ...t.stats.per_goal_count },
    };
  }

  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  static resetAll(): void {
    tracks.clear();
  }
}

export const camOptimizationSuggestionEngine = CAMOptimizationSuggestionEngine;
