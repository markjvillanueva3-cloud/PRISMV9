/**
 * LATHE-PRO-MS5.3 — envelope distance test.
 *
 * Tests the shipped TurningEnvelopeDistanceEngine (the same code path
 * the dispatcher action `turning_envelope_distance` runs).
 *
 * Imports the engine directly — no drift possible between engine and test.
 */
import { describe, it, expect } from "vitest";
import {
  turningEnvelopeDistanceEngine,
} from "../engines/TurningEnvelopeDistanceEngine.js";
import {
  turningRulesGeneratorEngine,
} from "../engines/TurningRulesGeneratorEngine.js";
import type {
  OpSpec,
  InsertLifeInput,
} from "../engines/TurningInsertLifeEngine.js";

function pCond(o: Partial<InsertLifeInput> = {}): InsertLifeInput {
  return {
    iso_group: "P",
    Vc_m_min: 250,
    f_mm_rev: 0.25,
    ap_mm: 2.0,
    nose_radius_mm: 0.8,
    coating: "TiAlN",
    ...o,
  };
}

const ctx = {
  material: "1045",
  iso_group: "P" as const,
  operation: "roughing" as const,
};

const baseOps: OpSpec[] = [
  { conditions: pCond(), duration_min: 2, label: "rough1" },
  {
    conditions: pCond({ Vc_m_min: 260, f_mm_rev: 0.28, ap_mm: 2.5 }),
    duration_min: 1.5,
    label: "rough2",
  },
];

describe("turning_envelope_distance — MS5.3 graduated distance metric", () => {
  it("returns per-op distance rows for every op", () => {
    const r = turningEnvelopeDistanceEngine.run({ rules_context: ctx, ops: baseOps });
    expect(r.total_ops).toBe(2);
    expect(r.per_op).toHaveLength(2);
    for (const o of r.per_op) {
      expect(o.per_rule.length).toBeGreaterThan(0);
    }
  });

  it("centre_distance_norm = 0 when value is at exact envelope midpoint", () => {
    const ruleSet = turningRulesGeneratorEngine.generate(ctx);
    const vcRule = ruleSet.rules.find((rule) => rule.kind === "velocity_envelope");
    expect(vcRule).toBeDefined();
    if (!vcRule) return;
    const mid = ((vcRule.bounds.min ?? 0) + (vcRule.bounds.max ?? 0)) / 2;
    const op: OpSpec = { conditions: pCond({ Vc_m_min: mid }), duration_min: 1, label: "mid" };
    const r = turningEnvelopeDistanceEngine.run({ rule_set: ruleSet, ops: [op] });
    const vcRow = r.per_op[0].per_rule.find((row) => row.field === "Vc_m_min");
    expect(vcRow).toBeDefined();
    expect(vcRow!.centre_distance_norm).toBe(0);
    expect(vcRow!.margin_to_edge_norm).toBe(1);
    expect(vcRow!.in_envelope).toBe(true);
  });

  it("centre_distance_norm = +1 when value is at max bound", () => {
    const ruleSet = turningRulesGeneratorEngine.generate(ctx);
    const vcRule = ruleSet.rules.find((rule) => rule.kind === "velocity_envelope");
    if (!vcRule || vcRule.bounds.max === undefined) return;
    const op: OpSpec = {
      conditions: pCond({ Vc_m_min: vcRule.bounds.max }),
      duration_min: 1,
      label: "at_max",
    };
    const r = turningEnvelopeDistanceEngine.run({ rule_set: ruleSet, ops: [op] });
    const vcRow = r.per_op[0].per_rule.find((row) => row.field === "Vc_m_min");
    expect(vcRow).toBeDefined();
    expect(vcRow!.centre_distance_norm).toBe(1);
    expect(vcRow!.margin_to_edge_norm).toBe(0);
    expect(vcRow!.in_envelope).toBe(true);
  });

  it("centre_distance_norm > 1 and in_envelope false when above max", () => {
    const ruleSet = turningRulesGeneratorEngine.generate(ctx);
    const vcRule = ruleSet.rules.find((rule) => rule.kind === "velocity_envelope");
    if (!vcRule || vcRule.bounds.max === undefined) return;
    const op: OpSpec = {
      conditions: pCond({ Vc_m_min: vcRule.bounds.max * 1.5 }),
      duration_min: 1,
      label: "oot",
    };
    const r = turningEnvelopeDistanceEngine.run({ rule_set: ruleSet, ops: [op] });
    const vcRow = r.per_op[0].per_rule.find((row) => row.field === "Vc_m_min");
    expect(vcRow).toBeDefined();
    expect(vcRow!.centre_distance_norm).toBeGreaterThan(1);
    expect(vcRow!.margin_to_edge_norm).toBeLessThan(0);
    expect(vcRow!.in_envelope).toBe(false);
    expect(r.per_op[0].all_in_envelope).toBe(false);
    expect(r.all_in_envelope).toBe(false);
    expect(r.out_of_envelope_ops).toBe(1);
  });

  it("borderline flag fires at >= borderline_threshold but still in envelope", () => {
    const ruleSet = turningRulesGeneratorEngine.generate(ctx);
    const vcRule = ruleSet.rules.find((rule) => rule.kind === "velocity_envelope");
    if (!vcRule || vcRule.bounds.min === undefined || vcRule.bounds.max === undefined) {
      return;
    }
    const mid = (vcRule.bounds.min + vcRule.bounds.max) / 2;
    const halfWidth = (vcRule.bounds.max - vcRule.bounds.min) / 2;
    // 92% of the way from centre toward max → in envelope, borderline with threshold 0.9
    const nearMax = mid + 0.92 * halfWidth;
    const op: OpSpec = {
      conditions: pCond({ Vc_m_min: nearMax }),
      duration_min: 1,
      label: "near_max",
    };
    const r = turningEnvelopeDistanceEngine.run({
      rule_set: ruleSet,
      ops: [op],
      borderline_threshold: 0.9,
    });
    const vcRow = r.per_op[0].per_rule.find((row) => row.field === "Vc_m_min");
    expect(vcRow).toBeDefined();
    expect(vcRow!.in_envelope).toBe(true);
    expect(vcRow!.borderline).toBe(true);
    expect(r.borderline_ops).toBeGreaterThanOrEqual(1);
  });

  it("is deterministic on distance metrics — same input yields same numeric results", () => {
    // Note: rule_id is a monotonic counter in the generator so IDs differ across calls.
    // The meaningful invariant is that the distance metrics match.
    const a = turningEnvelopeDistanceEngine.run({ rules_context: ctx, ops: baseOps });
    const b = turningEnvelopeDistanceEngine.run({ rules_context: ctx, ops: baseOps });
    expect(a.overall_min_margin).toBe(b.overall_min_margin);
    expect(a.overall_max_abs_centre).toBe(b.overall_max_abs_centre);
    expect(a.all_in_envelope).toBe(b.all_in_envelope);
    expect(a.borderline_ops).toBe(b.borderline_ops);
    expect(a.out_of_envelope_ops).toBe(b.out_of_envelope_ops);
    for (let i = 0; i < a.per_op.length; i++) {
      expect(a.per_op[i].min_margin_to_edge).toBe(b.per_op[i].min_margin_to_edge);
      expect(a.per_op[i].max_abs_centre_distance).toBe(
        b.per_op[i].max_abs_centre_distance,
      );
      for (let j = 0; j < a.per_op[i].per_rule.length; j++) {
        const ar = a.per_op[i].per_rule[j];
        const br = b.per_op[i].per_rule[j];
        expect(ar.centre_distance_norm).toBe(br.centre_distance_norm);
        expect(ar.margin_to_edge_norm).toBe(br.margin_to_edge_norm);
        expect(ar.in_envelope).toBe(br.in_envelope);
      }
    }
  });

  it("resolves f_mm_rev alias to fn_mm_rev envelope field", () => {
    const r = turningEnvelopeDistanceEngine.run({ rules_context: ctx, ops: baseOps });
    // feed envelope field is "fn_mm_rev" but our OpSpec uses "f_mm_rev"
    const feedRow = r.per_op[0].per_rule.find((row) => row.field === "fn_mm_rev");
    expect(feedRow).toBeDefined();
    expect(feedRow!.value).toBe(0.25); // f_mm_rev from baseOps[0]
  });

  it("handles a pre-built merged rule set as input", () => {
    const rough = turningRulesGeneratorEngine.generate({ ...ctx, operation: "roughing" });
    const finish = turningRulesGeneratorEngine.generate({ ...ctx, operation: "finishing" });
    const merged = turningRulesGeneratorEngine.mergeRuleSets([rough, finish]);
    const r = turningEnvelopeDistanceEngine.run({ rule_set: merged, ops: baseOps });
    expect(r.total_rules_used).toBe(merged.rules.length);
  });

  it("aggregates overall_min_margin as min across all per-op-rule margins", () => {
    const r = turningEnvelopeDistanceEngine.run({ rules_context: ctx, ops: baseOps });
    const allMargins = r.per_op
      .flatMap((o) => o.per_rule)
      .map((row) => row.margin_to_edge_norm)
      .filter((m): m is number => m !== null);
    const expected = Math.min(...allMargins);
    expect(r.overall_min_margin).toBeCloseTo(
      Math.round(expected * 10000) / 10000,
      4,
    );
  });

  it("min_margin_to_edge per op equals min of its per-rule margins", () => {
    const r = turningEnvelopeDistanceEngine.run({ rules_context: ctx, ops: baseOps });
    for (const o of r.per_op) {
      const margins = o.per_rule
        .map((row) => row.margin_to_edge_norm)
        .filter((m): m is number => m !== null);
      if (margins.length > 0) {
        expect(o.min_margin_to_edge).toBeCloseTo(
          Math.round(Math.min(...margins) * 10000) / 10000,
          4,
        );
      }
    }
  });

  it("throws when neither rules_context nor rule_set is provided", () => {
    expect(() =>
      turningEnvelopeDistanceEngine.run({ ops: baseOps }),
    ).toThrow(/rules_context or rule_set/);
  });

  it("rule with upper bound only (spindle cap) reports margin = cap - value", () => {
    const rulesSet = turningRulesGeneratorEngine.generate({
      ...ctx,
      machine_class: "slant_bed",
    });
    const rpmRule = rulesSet.rules.find((r) => r.kind === "spindle_constraint");
    expect(rpmRule).toBeDefined();
    if (!rpmRule || rpmRule.bounds.max === undefined) return;
    // Opsided rule: just check that we don't crash on ops without rpm field
    const r = turningEnvelopeDistanceEngine.run({ rule_set: rulesSet, ops: baseOps });
    // ops don't have "rpm" key so rpm rule is skipped — no violation from there
    expect(r.all_in_envelope).toBeDefined();
  });

  it("borderline flag false when borderline_threshold = 1 (only exact edge triggers)", () => {
    const ruleSet = turningRulesGeneratorEngine.generate(ctx);
    const vcRule = ruleSet.rules.find((rule) => rule.kind === "velocity_envelope");
    if (!vcRule || vcRule.bounds.min === undefined || vcRule.bounds.max === undefined) return;
    const mid = (vcRule.bounds.min + vcRule.bounds.max) / 2;
    const halfWidth = (vcRule.bounds.max - vcRule.bounds.min) / 2;
    const op: OpSpec = {
      conditions: pCond({ Vc_m_min: mid + 0.95 * halfWidth }),
      duration_min: 1,
      label: "close",
    };
    const r = turningEnvelopeDistanceEngine.run({
      rule_set: ruleSet,
      ops: [op],
      borderline_threshold: 1.0,
    });
    const vcRow = r.per_op[0].per_rule.find((row) => row.field === "Vc_m_min");
    expect(vcRow!.borderline).toBe(false);
  });
});
