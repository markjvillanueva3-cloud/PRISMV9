import { describe, it, expect } from "vitest";
import {
  preCutChecklistEngine as gate,
  PreCutChecklistEngine,
  type PreCutChecklistInput,
} from "../engines/PreCutChecklistEngine.js";

function allPass(overrides: Partial<PreCutChecklistInput["axes"]> = {}): PreCutChecklistInput {
  return {
    domain: "mill",
    part_id: "jmdie-itw-bracket-01",
    program_id: "ITW-BRKT-01-V003",
    axes: {
      stock_verified: true,
      datum_probed: true,
      tool_offsets_verified: true,
      magazine_integrity: true,
      coolant_verified: true,
      spindle_warmed_up: true,
      workholding_torqued: true,
      collision_sim_passed: true,
      wcs_envelope_ok: true,
      tool_life_budget_ok: true,
      post_dialect_audited: true,
      operator_skill_ok: true,
      ...overrides,
    },
  };
}

describe("PreCutChecklistEngine", () => {
  it("exports a singleton with check() method", () => {
    expect(gate).toBeInstanceOf(PreCutChecklistEngine);
    expect(typeof gate.check).toBe("function");
  });

  it("throws on missing domain/part_id/program_id/axes", () => {
    expect(() => gate.check({} as PreCutChecklistInput)).toThrow(/domain \+ part_id \+ program_id \+ axes/);
  });

  it("CLEARED when all 12 axes pass", () => {
    const r = gate.check(allPass());
    expect(r.verdict).toBe("cleared");
    expect(r.passed).toBe(12);
    expect(r.failed).toBe(0);
    expect(r.safety_critical_failed).toBe(0);
    expect(r.confidence.value).toBe(1);
    expect(r.warnings[0]).toMatch(/All 12.*cleared/);
  });

  it("BLOCKED when a safety-critical axis (datum) fails — cannot waive", () => {
    const r = gate.check(allPass({ datum_probed: false }));
    expect(r.verdict).toBe("blocked");
    expect(r.safety_critical_failed).toBe(1);
    const datum = r.axes.find(a => a.axis === "datum_probed");
    expect(datum?.passed).toBe(false);
    expect(datum?.safety_critical).toBe(true);
    expect(datum?.remediation).toMatch(/probe-macro|G54/);
  });

  it("BLOCKED when collision_sim_passed=false (safety critical)", () => {
    const r = gate.check(allPass({ collision_sim_passed: false }));
    expect(r.verdict).toBe("blocked");
    expect(r.safety_critical_failed).toBe(1);
  });

  it("GATED when a non-safety axis (coolant) fails — operator review required", () => {
    const r = gate.check(allPass({ coolant_verified: false }));
    expect(r.verdict).toBe("gated");
    expect(r.failed).toBe(1);
    expect(r.safety_critical_failed).toBe(0);
    expect(r.warnings[0]).toMatch(/operator review/);
  });

  it("a non-safety axis CAN be waived; verdict CLEARED with waived count > 0", () => {
    const input = allPass({ coolant_verified: false });
    input.waived_axes = ["coolant_verified"];
    const r = gate.check(input);
    expect(r.verdict).toBe("cleared");
    expect(r.waived).toBe(1);
    const coolant = r.axes.find(a => a.axis === "coolant_verified");
    expect(coolant?.waived).toBe(true);
    expect(coolant?.passed).toBe(true);
  });

  it("a safety-critical axis CANNOT be waived — verdict stays BLOCKED", () => {
    const input = allPass({ datum_probed: false });
    input.waived_axes = ["datum_probed"];
    const r = gate.check(input);
    expect(r.verdict).toBe("blocked");
    expect(r.waived).toBe(0);
    expect(r.axes.find(a => a.axis === "datum_probed")?.passed).toBe(false);
  });

  it("operator_skill_ok derived from skill vs complexity when not explicit", () => {
    const input = allPass();
    delete input.axes.operator_skill_ok;
    input.operator_skill = 3;
    input.part_complexity = 2;
    const r = gate.check(input);
    expect(r.verdict).toBe("cleared");
    expect(r.axes.find(a => a.axis === "operator_skill_ok")?.passed).toBe(true);
  });

  it("operator_skill_ok fails when skill < complexity (derived)", () => {
    const input = allPass();
    delete input.axes.operator_skill_ok;
    input.operator_skill = 1;
    input.part_complexity = 3;
    const r = gate.check(input);
    expect(r.verdict).toBe("gated");
    expect(r.axes.find(a => a.axis === "operator_skill_ok")?.passed).toBe(false);
  });

  it("every failed axis cites a remediation step", () => {
    const r = gate.check(allPass({
      stock_verified: false,
      tool_offsets_verified: false,
      coolant_verified: false,
      tool_life_budget_ok: false,
    }));
    expect(r.failed).toBe(4);
    const failedAxes = r.axes.filter(a => !a.passed);
    for (const a of failedAxes) {
      expect(typeof a.remediation).toBe("string");
      expect((a.remediation ?? "").length).toBeGreaterThan(10);
      expect(a.source.length).toBeGreaterThan(10);
    }
  });

  it("confidence equals exactly passed/12 — partial CLEARED has 1.0; one fail → ~0.917", () => {
    const r1 = gate.check(allPass());
    expect(r1.confidence.value).toBe(1);
    const r2 = gate.check(allPass({ coolant_verified: false }));
    expect(r2.confidence.value).toBe(0.917);  // 11/12 = 0.9166...
    expect(r2.confidence.unit).toBe("ratio");
  });

  it("works for lathe + wire-edm domains, not just mill", () => {
    const r1 = gate.check({ ...allPass(), domain: "lathe", part_id: "jmdie-shaft-01" });
    const r2 = gate.check({ ...allPass(), domain: "wire-edm", part_id: "jmdie-die-01" });
    expect(r1.verdict).toBe("cleared");
    expect(r1.domain).toBe("lathe");
    expect(r2.verdict).toBe("cleared");
    expect(r2.domain).toBe("wire-edm");
  });

  it("counts exactly 6 safety-critical axes (datum + magazine + workholding + collision + wcs + post)", () => {
    const r = gate.check(allPass({
      datum_probed: false,
      magazine_integrity: false,
      workholding_torqued: false,
      collision_sim_passed: false,
      wcs_envelope_ok: false,
      post_dialect_audited: false,
    }));
    expect(r.safety_critical_failed).toBe(6);
    expect(r.verdict).toBe("blocked");
    const sc = r.axes.filter(a => a.safety_critical);
    expect(sc).toHaveLength(6);
  });
});
