/**
 * TurningEnvelopeDistanceEngine — LATHE-PRO-MS5.3.
 *
 * Given a rule set (from TurningRulesGeneratorEngine) and a set of
 * operations, computes a graduated distance-to-envelope metric:
 *
 *   centre_distance_norm = (value - midpoint) / (half_width)
 *     → 0.0  at dead centre of the envelope
 *     → ±1.0 at the min/max bound
 *     → >|1| outside the envelope (violation)
 *
 *   margin_to_edge_norm = 1 - |centre_distance_norm|
 *     → 1.0  at dead centre (max margin)
 *     → 0.0  at the edge (zero margin)
 *     → negative when outside
 *
 * Use cases:
 *   • Rank operations by how comfortably they sit inside the canonical
 *     envelope (Sandvik / Machinery's Handbook ranges).
 *   • Tie-break robust-optimizer grid points with equal P5(Cpk) by
 *     picking the one with the largest min-margin — the most resilient
 *     to σ on shop-floor inputs.
 *   • Flag "borderline" operations (|centre_distance_norm| > 0.9) that
 *     would tip out of envelope under moderate variability.
 *
 * This is the shipped source of truth — dispatcher case
 * `turning_envelope_distance` delegates here. Tests import directly.
 */
import type {
  MachiningRule,
  RuleSet,
  RuleGenerationContext,
} from "./TurningRulesGeneratorEngine.js";
import { turningRulesGeneratorEngine } from "./TurningRulesGeneratorEngine.js";
import type { OpSpec } from "./TurningInsertLifeEngine.js";

export interface EnvelopeDistanceInput {
  /** Rule-generation context OR a pre-built rule set. Context path is
   *  convenient for one-shot callers; rule_set path lets callers reuse
   *  a merged/tightened rule set across multiple op batches. */
  rules_context?: RuleGenerationContext;
  rule_set?: RuleSet;
  /** Operations to evaluate. Conditions are field-keyed — the engine
   *  maps schema names to envelope field names (e.g. f_mm_rev → fn_mm_rev). */
  ops: OpSpec[];
  /** Treat |centre_distance_norm| >= this as "borderline". Default 0.9. */
  borderline_threshold?: number;
}

export interface PerRuleDistance {
  rule_id: string;
  rule_kind: string;
  rule_name: string;
  field: string;
  value: number;
  min: number | null;
  max: number | null;
  midpoint: number | null;
  half_width: number | null;
  centre_distance_norm: number | null;
  margin_to_edge_norm: number | null;
  in_envelope: boolean;
  borderline: boolean;
}

export interface PerOpDistance {
  op_label: string | undefined;
  op_index: number;
  per_rule: PerRuleDistance[];
  /** Worst (smallest) margin across all checked rules. */
  min_margin_to_edge: number;
  /** Worst (largest absolute) centre distance across all checked rules. */
  max_abs_centre_distance: number;
  all_in_envelope: boolean;
  borderline_count: number;
}

export interface EnvelopeDistanceResult {
  total_ops: number;
  total_rules_used: number;
  per_op: PerOpDistance[];
  /** Aggregate across all ops × all rules. */
  overall_min_margin: number;
  overall_max_abs_centre: number;
  all_in_envelope: boolean;
  borderline_ops: number;
  out_of_envelope_ops: number;
  source: string;
}

/** Map InsertLife conditions fields → rule envelope field names. */
const FIELD_ALIAS: Record<string, string[]> = {
  fn_mm_rev: ["f_mm_rev", "fn_mm_rev"],
  Vc_m_min: ["Vc_m_min"],
  ap_mm: ["ap_mm"],
};

class TurningEnvelopeDistanceEngine {
  /** Resolve a value from op.conditions, tolerating alias names. */
  private resolveFieldValue(
    conditions: Record<string, number>,
    ruleField: string,
  ): number | undefined {
    if (typeof conditions[ruleField] === "number") return conditions[ruleField];
    const aliases = FIELD_ALIAS[ruleField] ?? [];
    for (const alt of aliases) {
      if (typeof conditions[alt] === "number") return conditions[alt];
    }
    return undefined;
  }

  /** Compute centre_distance_norm and margin given value + bounds. */
  private computeOne(
    value: number,
    rule: MachiningRule,
    borderlineThreshold: number,
  ): PerRuleDistance {
    const min = rule.bounds.min ?? null;
    const max = rule.bounds.max ?? null;

    let midpoint: number | null = null;
    let halfWidth: number | null = null;
    let centreDist: number | null = null;
    let margin: number | null = null;
    let inEnvelope = true;

    if (min !== null && max !== null) {
      midpoint = (min + max) / 2;
      halfWidth = (max - min) / 2;
      if (halfWidth > 0) {
        centreDist = (value - midpoint) / halfWidth;
        margin = 1 - Math.abs(centreDist);
        inEnvelope = Math.abs(centreDist) <= 1;
      } else {
        centreDist = value === midpoint ? 0 : Infinity;
        margin = centreDist === 0 ? 1 : 0;
        inEnvelope = centreDist === 0;
      }
    } else if (min !== null && max === null) {
      // Lower-bound only rule
      inEnvelope = value >= min;
      margin = value - min;
      centreDist = margin >= 0 ? 0 : -1;
    } else if (min === null && max !== null) {
      // Upper-bound only rule (e.g. spindle RPM cap)
      inEnvelope = value <= max;
      margin = max - value;
      centreDist = margin >= 0 ? 0 : 1;
    }

    const absCentre = centreDist === null ? 0 : Math.abs(centreDist);
    const borderline =
      inEnvelope && absCentre >= borderlineThreshold;

    const roundN = (x: number | null, dp: number) =>
      x === null
        ? null
        : Number.isFinite(x)
          ? Math.round(x * 10 ** dp) / 10 ** dp
          : x;

    return {
      rule_id: rule.id,
      rule_kind: rule.kind,
      rule_name: rule.name,
      field: rule.bounds.field,
      value,
      min,
      max,
      midpoint: roundN(midpoint, 3),
      half_width: roundN(halfWidth, 3),
      centre_distance_norm: roundN(centreDist, 4),
      margin_to_edge_norm: roundN(margin, 4),
      in_envelope: inEnvelope,
      borderline,
    };
  }

  run(input: EnvelopeDistanceInput): EnvelopeDistanceResult {
    const borderlineThreshold = input.borderline_threshold ?? 0.9;

    let ruleSet: RuleSet;
    if (input.rule_set) {
      ruleSet = input.rule_set;
    } else if (input.rules_context) {
      ruleSet = turningRulesGeneratorEngine.generate(input.rules_context);
    } else {
      throw new Error(
        "rules_context or rule_set must be provided to TurningEnvelopeDistanceEngine",
      );
    }

    const perOp: PerOpDistance[] = [];
    for (let i = 0; i < input.ops.length; i++) {
      const op = input.ops[i];
      const conditions: Record<string, number> = {};
      for (const [k, v] of Object.entries(op.conditions)) {
        if (typeof v === "number") conditions[k] = v;
      }
      const perRule: PerRuleDistance[] = [];
      for (const rule of ruleSet.rules) {
        const v = this.resolveFieldValue(conditions, rule.bounds.field);
        if (v === undefined) continue;
        perRule.push(this.computeOne(v, rule, borderlineThreshold));
      }

      const margins = perRule
        .map((r) => r.margin_to_edge_norm)
        .filter((m): m is number => m !== null);
      const absCentres = perRule
        .map((r) => r.centre_distance_norm)
        .filter((c): c is number => c !== null)
        .map((c) => Math.abs(c));

      perOp.push({
        op_label: op.label,
        op_index: i,
        per_rule: perRule,
        min_margin_to_edge:
          margins.length === 0
            ? 1.0
            : Math.round(Math.min(...margins) * 10000) / 10000,
        max_abs_centre_distance:
          absCentres.length === 0
            ? 0
            : Math.round(Math.max(...absCentres) * 10000) / 10000,
        all_in_envelope: perRule.every((r) => r.in_envelope),
        borderline_count: perRule.filter((r) => r.borderline).length,
      });
    }

    const allMargins = perOp
      .flatMap((o) => o.per_rule)
      .map((r) => r.margin_to_edge_norm)
      .filter((m): m is number => m !== null);
    const allAbsCentres = perOp
      .flatMap((o) => o.per_rule)
      .map((r) => r.centre_distance_norm)
      .filter((c): c is number => c !== null)
      .map((c) => Math.abs(c));

    return {
      total_ops: input.ops.length,
      total_rules_used: ruleSet.rules.length,
      per_op: perOp,
      overall_min_margin:
        allMargins.length === 0
          ? 1.0
          : Math.round(Math.min(...allMargins) * 10000) / 10000,
      overall_max_abs_centre:
        allAbsCentres.length === 0
          ? 0
          : Math.round(Math.max(...allAbsCentres) * 10000) / 10000,
      all_in_envelope: perOp.every((o) => o.all_in_envelope),
      borderline_ops: perOp.filter((o) => o.borderline_count > 0).length,
      out_of_envelope_ops: perOp.filter((o) => !o.all_in_envelope).length,
      source: "TurningEnvelopeDistanceEngine.run (graduated distance-to-envelope)",
    };
  }
}

export const turningEnvelopeDistanceEngine = new TurningEnvelopeDistanceEngine();
export { TurningEnvelopeDistanceEngine };
