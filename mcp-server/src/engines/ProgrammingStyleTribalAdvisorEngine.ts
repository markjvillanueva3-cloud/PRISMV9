/**
 * ProgrammingStyleTribalAdvisorEngine (E-PSTA)
 * ============================================
 *
 * PSN-synergy bridge between curated tribal/controller knowledge and the
 * style-selection decision flow (LatheProgrammingStyleSelectorEngine, E107).
 *
 * Problem this solves:
 *   E107 picks programming style (hardcode / macro / conversational / cam) from
 *   hardcoded coefficients (COMPLEXITY_MULT, STYLE_BASE_PROG_HR, ...). It does
 *   NOT consult tribal-tips, controller-knowledge entries, or the playbook
 *   rules that say things like "Mazak MAZATROL conversational dominates simple
 *   turning under lot 50" (ctrl-026) or "Heidenhain Klartext is conv-first for
 *   beginner milling on small batches" (ctrl-018). This engine bridges that
 *   gap — it returns per-style SCORE DELTAS sourced from a curated rule
 *   library, with citations back to the tribal-tip ids that motivated each
 *   rule. The caller (today: LatheMasterOrchestratorFacadeEngine's
 *   programming_analysis chain, future: any style-decision flow) merges the
 *   deltas into its own ranking before returning the final recommendation.
 *
 * Why a rule library (not a free-text tribal search):
 *   Tribal-tip text is unstructured ("Use MAZATROL for short runs..."). Going
 *   from free text to a numeric per-style adjustment requires interpretation
 *   per call — high latency, low determinism, easy to drift. Instead we curate
 *   one rule per tribal source: humans wrote the rule once with explicit
 *   numeric deltas + source-tip id, the engine just matches predicates and
 *   sums deltas. Determinism + auditability + cheap to test. New tribal tips
 *   are added by appending a rule (see RULES table at the bottom of this file)
 *   with the tip-id in source_tip_ids, NOT by re-parsing tip text at runtime.
 *
 * Contract:
 *   - advise(input) → AdvisorResult { adjustments, applied_rules, confidence }
 *   - getStats() → { rule_count, controllers_covered, tip_sources_count }
 *
 * Edge-case discipline (matches H:\.claude\rules\engines.md + lathe-domain
 * conventions in E107):
 *   - Invalid input (negative lot, invalid enum) → throws via Zod parse (matches
 *     E107's contract; tests assert `.toThrow()`).
 *   - Missing optional fields → default to neutral context, no rule firing.
 *   - No rules match → returns zero-delta result with empty applied_rules + a
 *     low overall_confidence + an unmatched_reason note. NOT an error — the
 *     caller should still be able to merge a zero-delta safely.
 *   - NaN/Infinity numeric inputs → Zod's `.finite()` catches these and throws.
 *
 * @module engines/ProgrammingStyleTribalAdvisorEngine
 * @milestone LATHE-PSN-SYNERGY (Phase 2 of hotel's multi-phase lathe /goal)
 * @version 1.0.0
 */

import { z } from "zod";
import { log } from "../utils/Logger.js";
import type {
  ProgrammingStyle,
  PartComplexity,
} from "./LatheProgrammingStyleSelectorEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface TribalAdviseInput {
  /** Controller string (same vocabulary as E107: "mazatrol_smooth_ai", "fanuc_30i", etc.) */
  controller: string;
  part_complexity: PartComplexity;
  lot_size: number;
  family_parts_expected: number;
  /** Optional material name (e.g., "D2", "4140"). Used for material-specific rules. */
  material?: string;
  /** Optional operation hint (e.g., "turning", "threading"). */
  operation?: string;
}

/** Per-style adjustment record. Mergeable into E107's score (0-100). */
export interface StyleAdjustment {
  /** Signed delta to add to the corresponding style's E107 score. Bounded [-30, +30]. */
  score_delta: number;
  /** Human-readable reasons for this delta (one per applied rule). */
  reasons: string[];
  /** Tribal-tip ids that motivated this delta (citations). */
  source_tip_ids: string[];
}

/** Reference to an applied rule (for audit + debugging). */
export interface AppliedRuleRef {
  rule_id: string;
  name: string;
  matched_controller_family?: string;
  reasons: string[];
}

export interface AdvisorResult {
  adjustments: Record<ProgrammingStyle, StyleAdjustment>;
  applied_rules: AppliedRuleRef[];
  /** 0-1 confidence in the overall advisory (weighted by rule confidences). */
  overall_confidence: number;
  /** Present when no rules fired — explains why. */
  unmatched_reason?: string;
  timestamp: string;
}

// ── Zod Schemas ────────────────────────────────────────────────────────────

export const tribalAdviseInputSchema = z.object({
  controller: z.string().min(1),
  part_complexity: z.enum(["simple", "moderate", "complex", "very_complex"]),
  lot_size: z.number().int().positive().finite(),
  family_parts_expected: z.number().int().nonnegative().finite(),
  material: z.string().min(1).optional(),
  operation: z.string().min(1).optional(),
});

// ── Internal rule shape ────────────────────────────────────────────────────

type StyleDeltaMap = Partial<Record<ProgrammingStyle, number>>;

interface TribalRule {
  id: string;
  name: string;
  /** Predicate over input — true = rule fires. */
  matches: (input: TribalAdviseInput) => boolean;
  /** Style deltas applied when matched (other styles get zero). */
  deltas: StyleDeltaMap;
  /** Rule confidence (0-1). Multiplied into overall_confidence weighting. */
  confidence: number;
  /** Source tribal-tip ids that motivated this rule. */
  source_tip_ids: string[];
  /** Family classifier for reporting (e.g., "mazak_mazatrol"). */
  controller_family?: string;
  /** Reason string surfaced to the caller. */
  reason: string;
}

// ── Controller-family detection ────────────────────────────────────────────

/** Map controller string → broad family name. Used for rule matching + audit. */
function detectControllerFamily(controller: string): string {
  const c = controller.toLowerCase();
  if (c.includes("mazatrol") || c.includes("mazak_smooth") || c.includes("mazak")) return "mazak_mazatrol";
  if (c.includes("winmax") || c.includes("hurco")) return "hurco_winmax";
  if (c.includes("heidenhain") || c.includes("klartext") || c.includes("tnc")) return "heidenhain_klartext";
  if (c.includes("siemens") || c.includes("shopmill") || c.includes("shop_mill") || c.includes("shopturn") || c.includes("840d")) return "siemens_shop";
  if (c.includes("manual_guide") || c.includes("fanuc_30i") || c.includes("fanuc_31i")) return "fanuc_manual_guide";
  if (c.includes("fanuc_0i") || c.includes("fanuc_16") || c.includes("fanuc_18") || c.includes("fanuc_21")) return "fanuc_legacy";
  if (c.includes("okuma_osp") || c.includes("osp_p")) return "okuma_osp";
  if (c.includes("mitsubishi") || c.includes("m70") || c.includes("m80")) return "mitsubishi";
  return "other";
}

// ── Bounds helper ──────────────────────────────────────────────────────────

const MAX_DELTA_PER_STYLE = 30;

function clampDelta(d: number): number {
  if (d > MAX_DELTA_PER_STYLE) return MAX_DELTA_PER_STYLE;
  if (d < -MAX_DELTA_PER_STYLE) return -MAX_DELTA_PER_STYLE;
  return d;
}

// ── Engine Implementation ──────────────────────────────────────────────────

class ProgrammingStyleTribalAdvisorEngineImpl {
  /**
   * Compute per-style score deltas from the rule library for the given input.
   *
   * @param input Controller + part profile context
   * @returns Per-style deltas + applied-rule citations + confidence
   * @throws ZodError on invalid input (negative lot, unknown complexity, etc.)
   */
  advise(input: TribalAdviseInput): AdvisorResult {
    tribalAdviseInputSchema.parse(input);

    const family = detectControllerFamily(input.controller);
    log.info(`[TribalAdvisor] controller=${input.controller} family=${family}`);

    // Initialize zero adjustments for all 4 styles
    const adjustments: Record<ProgrammingStyle, StyleAdjustment> = {
      hardcode: { score_delta: 0, reasons: [], source_tip_ids: [] },
      macro: { score_delta: 0, reasons: [], source_tip_ids: [] },
      conversational: { score_delta: 0, reasons: [], source_tip_ids: [] },
      cam: { score_delta: 0, reasons: [], source_tip_ids: [] },
    };

    const applied: AppliedRuleRef[] = [];
    let confidenceWeightSum = 0;
    let confidenceWeightedSum = 0;

    for (const rule of RULES) {
      if (!rule.matches(input)) continue;
      applied.push({
        rule_id: rule.id,
        name: rule.name,
        matched_controller_family: rule.controller_family,
        reasons: [rule.reason],
      });
      for (const [style, delta] of Object.entries(rule.deltas) as Array<[ProgrammingStyle, number]>) {
        const adj = adjustments[style];
        adj.score_delta = clampDelta(adj.score_delta + delta);
        adj.reasons.push(rule.reason);
        for (const tipId of rule.source_tip_ids) {
          if (!adj.source_tip_ids.includes(tipId)) adj.source_tip_ids.push(tipId);
        }
      }
      confidenceWeightedSum += rule.confidence;
      confidenceWeightSum += 1;
    }

    const overall_confidence =
      confidenceWeightSum > 0 ? confidenceWeightedSum / confidenceWeightSum : 0;

    const result: AdvisorResult = {
      adjustments,
      applied_rules: applied,
      overall_confidence,
      timestamp: new Date().toISOString(),
    };

    if (applied.length === 0) {
      result.unmatched_reason = `No tribal rules matched controller="${input.controller}" (family=${family}) for complexity=${input.part_complexity}, lot=${input.lot_size}, family=${input.family_parts_expected}. Caller should proceed with E107's base scoring unchanged.`;
    }

    return result;
  }

  /** Introspection: rule library size + coverage. */
  getStats(): {
    rule_count: number;
    controllers_covered: number;
    tip_sources_count: number;
    max_delta_per_style: number;
  } {
    const families = new Set<string>();
    const tipIds = new Set<string>();
    for (const r of RULES) {
      if (r.controller_family) families.add(r.controller_family);
      for (const tid of r.source_tip_ids) tipIds.add(tid);
    }
    return {
      rule_count: RULES.length,
      controllers_covered: families.size,
      tip_sources_count: tipIds.size,
      max_delta_per_style: MAX_DELTA_PER_STYLE,
    };
  }

  /** Expose rules for tests + debugging (read-only — array is frozen below). */
  getRules(): ReadonlyArray<Readonly<Pick<TribalRule, "id" | "name" | "controller_family" | "source_tip_ids" | "confidence">>> {
    return RULES.map((r) => ({
      id: r.id,
      name: r.name,
      controller_family: r.controller_family,
      source_tip_ids: r.source_tip_ids,
      confidence: r.confidence,
    }));
  }
}

// ── Rule Library ───────────────────────────────────────────────────────────
//
// Each rule is the structured form of one or more tribal/controller-knowledge
// entries. Adding a new rule = appending to this array with a source_tip_ids
// citation. Test-driven: the test suite asserts exact deltas per rule trigger,
// so changes here will fail the suite unless tests are updated alongside.

const RULES: readonly TribalRule[] = Object.freeze([
  // ── Mazak MAZATROL family ──────────────────────────────────────────────
  {
    id: "psta-001",
    name: "Mazatrol — strong conversational pref for simple+moderate turning, lot <= 100",
    controller_family: "mazak_mazatrol",
    matches: (i) =>
      detectControllerFamily(i.controller) === "mazak_mazatrol" &&
      (i.part_complexity === "simple" || i.part_complexity === "moderate") &&
      i.lot_size <= 100,
    deltas: { conversational: +20, hardcode: -5 },
    confidence: 0.85,
    source_tip_ids: ["ctrl-026"],
    reason: "Mazak MAZATROL Smooth — conversational dominates simple/moderate turning at lot ≤ 100 (ctrl-026)",
  },
  {
    id: "psta-002",
    name: "Mazatrol — yields to CAM for very_complex regardless of lot",
    controller_family: "mazak_mazatrol",
    matches: (i) =>
      detectControllerFamily(i.controller) === "mazak_mazatrol" &&
      i.part_complexity === "very_complex",
    deltas: { conversational: -15, cam: +15 },
    confidence: 0.8,
    source_tip_ids: ["ctrl-026"],
    reason: "Mazak MAZATROL — very-complex parts exceed conversational feature coverage, prefer CAM (ctrl-026)",
  },

  // ── Heidenhain Klartext family ─────────────────────────────────────────
  {
    id: "psta-003",
    name: "Heidenhain Klartext — conversational pref for simple/moderate milling",
    controller_family: "heidenhain_klartext",
    matches: (i) =>
      detectControllerFamily(i.controller) === "heidenhain_klartext" &&
      (i.part_complexity === "simple" || i.part_complexity === "moderate"),
    deltas: { conversational: +18, hardcode: -3 },
    confidence: 0.8,
    source_tip_ids: ["ctrl-018"],
    reason: "Heidenhain TNC 640 Klartext — conversational-first programming for simple/moderate work (ctrl-018)",
  },

  // ── Siemens ShopMill/ShopTurn ──────────────────────────────────────────
  {
    id: "psta-004",
    name: "Siemens ShopMill/ShopTurn — conv for simple, macro for family>=3",
    controller_family: "siemens_shop",
    matches: (i) => detectControllerFamily(i.controller) === "siemens_shop",
    deltas: { conversational: +10 },
    confidence: 0.75,
    source_tip_ids: ["ctrl-014"],
    reason: "Siemens ShopMill — conversational baseline preference (ctrl-014)",
  },
  {
    id: "psta-005",
    name: "Siemens ShopMill — macro boost when family>=3",
    controller_family: "siemens_shop",
    matches: (i) =>
      detectControllerFamily(i.controller) === "siemens_shop" && i.family_parts_expected >= 3,
    deltas: { macro: +12, conversational: -5 },
    confidence: 0.75,
    source_tip_ids: ["ctrl-014"],
    reason: "Siemens ShopMill — at family ≥ 3 macro/parametric beats conv on reuse (ctrl-014)",
  },

  // ── Hurco WinMax ───────────────────────────────────────────────────────
  {
    id: "psta-006",
    name: "Hurco WinMax — balanced conv/macro, conv stronger for one-off",
    controller_family: "hurco_winmax",
    matches: (i) =>
      detectControllerFamily(i.controller) === "hurco_winmax" &&
      i.family_parts_expected <= 1 &&
      i.lot_size <= 10,
    deltas: { conversational: +15 },
    confidence: 0.7,
    source_tip_ids: ["psta-domain-knowledge"],
    reason: "Hurco WinMax NC Productivity — conversational shines on small one-offs",
  },

  // ── Fanuc legacy (no conversational support) ───────────────────────────
  {
    id: "psta-007",
    name: "Fanuc legacy (0i / 16 / 18 / 21) — no conversational, prefer hardcode for simple",
    controller_family: "fanuc_legacy",
    matches: (i) =>
      detectControllerFamily(i.controller) === "fanuc_legacy" &&
      (i.part_complexity === "simple" || i.part_complexity === "moderate") &&
      i.family_parts_expected <= 2,
    deltas: { hardcode: +10, conversational: -25 },
    confidence: 0.9,
    source_tip_ids: ["psta-domain-knowledge"],
    reason: "Fanuc legacy controllers — no conversational dialog; hardcode dominates one-off simple work",
  },

  // ── Fanuc Manual Guide i ───────────────────────────────────────────────
  {
    id: "psta-008",
    name: "Fanuc Manual Guide i — conv for simple operator-driven runs",
    controller_family: "fanuc_manual_guide",
    matches: (i) =>
      detectControllerFamily(i.controller) === "fanuc_manual_guide" &&
      i.part_complexity === "simple",
    deltas: { conversational: +12 },
    confidence: 0.7,
    source_tip_ids: ["psta-domain-knowledge"],
    reason: "Fanuc 30i/31i Manual Guide i — conversational dialog efficient for simple parts",
  },

  // ── Okuma OSP / navi_mill ──────────────────────────────────────────────
  {
    id: "psta-009",
    name: "Okuma OSP — navi_mill conversational for simple+moderate",
    controller_family: "okuma_osp",
    matches: (i) =>
      detectControllerFamily(i.controller) === "okuma_osp" &&
      (i.part_complexity === "simple" || i.part_complexity === "moderate"),
    deltas: { conversational: +12 },
    confidence: 0.75,
    source_tip_ids: ["psta-domain-knowledge"],
    reason: "Okuma OSP-P — navi_mill conversational handles simple+moderate turning effectively",
  },

  // ── Family / lot rules (controller-agnostic) ───────────────────────────
  {
    id: "psta-010",
    name: "Large family (>=5) — universal macro boost",
    matches: (i) => i.family_parts_expected >= 5,
    deltas: { macro: +15, hardcode: -8 },
    confidence: 0.85,
    source_tip_ids: ["jm-die-experience"],
    reason: "Family of ≥ 5 parts amortizes parametric macro investment across variants — JM Die rule of thumb",
  },
  {
    id: "psta-011",
    name: "High lot (>=100) — CAM cycle-efficiency boost on complex+",
    matches: (i) =>
      i.lot_size >= 100 &&
      (i.part_complexity === "complex" || i.part_complexity === "very_complex"),
    deltas: { cam: +12 },
    confidence: 0.8,
    source_tip_ids: ["jm-die-experience"],
    reason: "High lot + complex geometry — CAM toolpath cycle-time gains compound across the run",
  },
  {
    id: "psta-012",
    name: "Very complex universally — CAM dominance",
    matches: (i) => i.part_complexity === "very_complex",
    deltas: { cam: +18, conversational: -10, hardcode: -10 },
    confidence: 0.9,
    source_tip_ids: ["jm-die-experience"],
    reason: "Very-complex geometry — CAM is the only style with verifiable toolpaths at this scale",
  },

  // ── Material-specific (tool steel) ─────────────────────────────────────
  {
    id: "psta-013",
    name: "Tool steel (D2/A2/S7/M2/H13) — CAM verification boost on complex",
    matches: (i) => {
      const m = (i.material ?? "").toUpperCase();
      const isToolSteel =
        m === "D2" || m === "A2" || m === "S7" || m === "M2" || m === "H13" ||
        m.startsWith("D2 ") || m.includes("TOOL STEEL");
      return isToolSteel && (i.part_complexity === "complex" || i.part_complexity === "very_complex");
    },
    deltas: { cam: +8 },
    confidence: 0.75,
    source_tip_ids: ["jm-die-experience"],
    reason: "Tool steel + complex geometry — CAM verification critical (D2/A2/S7/M2/H13 are JM Die's primary materials)",
  },
]);

// ── Singleton Export ───────────────────────────────────────────────────────

export const programmingStyleTribalAdvisorEngine =
  new ProgrammingStyleTribalAdvisorEngineImpl();
export type { ProgrammingStyleTribalAdvisorEngineImpl };
