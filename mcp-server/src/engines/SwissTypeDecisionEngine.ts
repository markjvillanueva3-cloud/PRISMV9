/**
 * SwissTypeDecisionEngine — LATHE-PROD-READY-MS0/U-LPR-SWISS
 *
 * Up-front decision: should this part be routed to a Swiss-type lathe, a
 * conventional turning center, or is it ambiguous enough to require a
 * human routing review?
 *
 * Swiss-type machines shine on long, slender, high-precision parts
 * (medical screws, watch parts, connector pins) because the guide bushing
 * supports the workpiece millimeters from the cut. The tradeoff is
 * fixed-length feedstock, slower one-off setup, and added complexity
 * programming the guide-bushing offset. For parts that DON'T need the
 * support, a Swiss is slower and more expensive than a plain turning
 * center.
 *
 * Existing Swiss engines in the codebase handle collision, intelligence,
 * and post-processing AFTER the decision is made. This engine handles the
 * decision itself: rules that compile a part spec into a routing verdict.
 *
 * Rules (weighted, not binary — each feeds a score in [-100, +100])
 * -----------------------------------------------------------------
 *   + L/D ratio:               L/D > 5   → strongly Swiss  (+40)
 *                              L/D > 3   → lean Swiss      (+20)
 *                              L/D < 2   → lean conventional (-20)
 *
 *   + Diameter:                D < 5 mm  → Swiss preferred (+20)
 *                              D > 32 mm → conventional     (-30)  (Swiss bar cap)
 *
 *   + Tolerance:               ≤ 0.005 mm → Swiss edge      (+15)
 *                              ≥ 0.05 mm  → conventional    (-10)
 *
 *   + Length absolute:         > 300 mm → conventional      (-20)
 *                              (Swiss feed stroke typically 200-250 mm)
 *
 *   + Has crosshole / live op: → lean Swiss                 (+15)
 *   + Annual quantity:         > 1000   → amortizes Swiss   (+15)
 *                              < 10     → conventional      (-20)
 *
 * Decision thresholds
 * -------------------
 *   score ≥ +30 : recommend Swiss
 *   score ≤ -30 : recommend conventional
 *   otherwise    : ambiguous (route to human review)
 *
 * Hard blocks (override the score)
 * --------------------------------
 *   Diameter > 42 mm : hard_conventional (exceeds typical Swiss bar cap)
 *   Length > 500 mm  : hard_conventional (exceeds any Swiss feed stroke)
 */

// ============================================================================
// TYPES
// ============================================================================

export type RoutingVerdict =
  | "swiss_recommended"
  | "conventional_recommended"
  | "ambiguous"
  | "hard_conventional";

export interface PartRoutingSpec {
  /** Finished part length (mm). */
  length_mm: number;
  /** Maximum finished diameter (mm). */
  max_diameter_mm: number;
  /** Tightest diametric tolerance on the part (mm). */
  tightest_tolerance_mm: number;
  /** Has cross-drilled holes or live-tool operations. */
  has_live_operations: boolean;
  /** Annual production quantity. */
  annual_quantity: number;
  /** Material — informational only, does not drive routing directly. */
  material: string;
}

export interface RoutingRule {
  rule: string;
  weight: number;
  explanation: string;
}

export interface RoutingVerdictResult {
  verdict: RoutingVerdict;
  score: number;
  rules_fired: RoutingRule[];
  /** If a hard block triggered, describes why. */
  hard_block_reason: string | null;
  /** Top 3 human-facing justifications. */
  justification: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SWISS_BAR_CAP_MM = 42;
const SWISS_FEED_STROKE_MAX_MM = 500;
const SCORE_SWISS_THRESHOLD = 30;
const SCORE_CONVENTIONAL_THRESHOLD = -30;

// ============================================================================
// ENGINE
// ============================================================================

export class SwissTypeDecisionEngine {
  decide(spec: PartRoutingSpec): RoutingVerdictResult {
    this._validate(spec);

    // Hard blocks bypass the scoring system entirely
    const hardBlock = this._checkHardBlocks(spec);
    if (hardBlock) {
      return {
        verdict: "hard_conventional",
        score: -100,
        rules_fired: [],
        hard_block_reason: hardBlock,
        justification: [hardBlock],
      };
    }

    const rulesFired: RoutingRule[] = [];
    let score = 0;

    // ── L/D ratio
    const ld = spec.length_mm / spec.max_diameter_mm;
    if (ld > 5) {
      rulesFired.push({
        rule: "l_to_d_high",
        weight: 40,
        explanation: `L/D ratio ${round(ld, 1)} > 5 — guide bushing support required.`,
      });
      score += 40;
    } else if (ld > 3) {
      rulesFired.push({
        rule: "l_to_d_med",
        weight: 20,
        explanation: `L/D ratio ${round(ld, 1)} > 3 — Swiss support helpful.`,
      });
      score += 20;
    } else if (ld < 2) {
      rulesFired.push({
        rule: "l_to_d_low",
        weight: -20,
        explanation: `L/D ratio ${round(ld, 1)} < 2 — conventional chuck suffices.`,
      });
      score -= 20;
    }

    // ── Diameter
    if (spec.max_diameter_mm < 5) {
      rulesFired.push({
        rule: "dia_small",
        weight: 20,
        explanation: `Diameter ${spec.max_diameter_mm} mm < 5 mm — Swiss excels at small stock.`,
      });
      score += 20;
    } else if (spec.max_diameter_mm > 32) {
      rulesFired.push({
        rule: "dia_large",
        weight: -30,
        explanation: `Diameter ${spec.max_diameter_mm} mm > 32 mm — approaching Swiss bar cap.`,
      });
      score -= 30;
    }

    // ── Tolerance
    if (spec.tightest_tolerance_mm <= 0.005) {
      rulesFired.push({
        rule: "tol_tight",
        weight: 15,
        explanation: `Tightest tol ${spec.tightest_tolerance_mm} mm ≤ 0.005 mm — Swiss rigidity edge.`,
      });
      score += 15;
    } else if (spec.tightest_tolerance_mm >= 0.05) {
      rulesFired.push({
        rule: "tol_loose",
        weight: -10,
        explanation: `Tightest tol ${spec.tightest_tolerance_mm} mm ≥ 0.05 mm — no Swiss advantage.`,
      });
      score -= 10;
    }

    // ── Length absolute
    if (spec.length_mm > 300) {
      rulesFired.push({
        rule: "length_over_stroke",
        weight: -20,
        explanation: `Part length ${spec.length_mm} mm > 300 mm — exceeds typical Swiss feed stroke.`,
      });
      score -= 20;
    }

    // ── Live operations
    if (spec.has_live_operations) {
      rulesFired.push({
        rule: "has_live_ops",
        weight: 15,
        explanation: "Live tooling / cross-drilling benefits from Swiss integration.",
      });
      score += 15;
    }

    // ── Quantity
    if (spec.annual_quantity > 1000) {
      rulesFired.push({
        rule: "qty_high",
        weight: 15,
        explanation: `Annual qty ${spec.annual_quantity} > 1000 — Swiss setup time amortizes.`,
      });
      score += 15;
    } else if (spec.annual_quantity < 10) {
      rulesFired.push({
        rule: "qty_low",
        weight: -20,
        explanation: `Annual qty ${spec.annual_quantity} < 10 — Swiss setup cost wins out.`,
      });
      score -= 20;
    }

    const verdict = this._scoreToVerdict(score);
    const justification = this._topJustification(rulesFired, verdict);

    return {
      verdict,
      score,
      rules_fired: rulesFired,
      hard_block_reason: null,
      justification,
    };
  }

  /** Evaluate a batch of routing decisions. */
  decideBatch(specs: PartRoutingSpec[]): RoutingVerdictResult[] {
    return specs.map((s) => this.decide(s));
  }

  // ── internals ──────────────────────────────────────────────────────────

  private _validate(spec: PartRoutingSpec): void {
    const checks: Array<[string, number]> = [
      ["length_mm", spec.length_mm],
      ["max_diameter_mm", spec.max_diameter_mm],
      ["tightest_tolerance_mm", spec.tightest_tolerance_mm],
      ["annual_quantity", spec.annual_quantity],
    ];
    for (const [name, v] of checks) {
      if (!Number.isFinite(v) || v <= 0) {
        throw new Error(`${name} must be a positive finite number; got ${v}`);
      }
    }
  }

  private _checkHardBlocks(spec: PartRoutingSpec): string | null {
    if (spec.max_diameter_mm > SWISS_BAR_CAP_MM) {
      return `Diameter ${spec.max_diameter_mm} mm exceeds Swiss bar cap (${SWISS_BAR_CAP_MM} mm).`;
    }
    if (spec.length_mm > SWISS_FEED_STROKE_MAX_MM) {
      return `Length ${spec.length_mm} mm exceeds Swiss feed stroke limit (${SWISS_FEED_STROKE_MAX_MM} mm).`;
    }
    return null;
  }

  private _scoreToVerdict(score: number): RoutingVerdict {
    if (score >= SCORE_SWISS_THRESHOLD) return "swiss_recommended";
    if (score <= SCORE_CONVENTIONAL_THRESHOLD) return "conventional_recommended";
    return "ambiguous";
  }

  private _topJustification(rules: RoutingRule[], verdict: RoutingVerdict): string[] {
    if (rules.length === 0) {
      return ["No rules fired — neutral score; recommending human review."];
    }
    // Rank by ABSOLUTE weight, tie-break by rule name for determinism
    const sign = verdict === "conventional_recommended" ? -1 : 1;
    const ranked = [...rules].sort((a, b) => {
      // Prefer rules aligned with the verdict direction
      const alignedA = Math.sign(a.weight) === sign ? 1 : 0;
      const alignedB = Math.sign(b.weight) === sign ? 1 : 0;
      if (alignedA !== alignedB) return alignedB - alignedA;
      if (Math.abs(b.weight) !== Math.abs(a.weight)) return Math.abs(b.weight) - Math.abs(a.weight);
      return a.rule.localeCompare(b.rule);
    });
    return ranked.slice(0, 3).map((r) => r.explanation);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round(v: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const swissTypeDecisionEngine = new SwissTypeDecisionEngine();
