/**
 * ControlPlanGeneratorEngine Tests (U-MIO34)
 * ==========================================
 * Covers: row construction, severity→policy mapping, counts rollup,
 * override respect, warnings, Markdown/CSV rendering, storage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ControlPlanGeneratorEngine,
  type ControlPlanInput,
  type ControlPlanCharacteristicInput,
} from "../engines/ControlPlanGeneratorEngine.js";

function char(
  over: Partial<ControlPlanCharacteristicInput> = {},
): ControlPlanCharacteristicInput {
  return {
    feature_id: "F-001",
    feature_name: "Bore Ø1.500",
    reference: "B12",
    severity: "major",
    nominal: 1.5,
    tolerance_plus: 0.001,
    tolerance_minus: -0.001,
    unit: "in",
    gage_id: "GAGE-001",
    measurement_method: "CMM",
    op_num: 20,
    machine_id: "HAAS-VF4",
    fmea_rpn: 120,
    ...over,
  };
}

function baseInput(extra: Partial<ControlPlanInput> = {}): ControlPlanInput {
  return {
    part_number: "PN-ACME-100",
    revision: "A",
    phase: "production",
    organization: "JM Die Company",
    supplier: "JM Die",
    team_members: ["Mark V.", "Quality Mgr"],
    routing_id: "RT-00001",
    characteristics: [char()],
    ...extra,
  };
}

describe("ControlPlanGeneratorEngine — generate", () => {
  let engine: ControlPlanGeneratorEngine;
  beforeEach(() => { engine = new ControlPlanGeneratorEngine(); });

  it("generates a control plan with one row per characteristic", () => {
    const cp = engine.generate(baseInput({
      characteristics: [char({ feature_id: "F-1" }), char({ feature_id: "F-2" }), char({ feature_id: "F-3" })],
    }));
    expect(cp.rows).toHaveLength(3);
    expect(cp.control_plan_id).toMatch(/^CP-\d{5}$/);
    expect(cp.rows.map(r => r.line_num)).toEqual([1, 2, 3]);
  });

  it("maps critical severity → 100% check policy (sample=0, method=100%_check)", () => {
    const cp = engine.generate(baseInput({
      characteristics: [char({ severity: "critical" })],
    }));
    expect(cp.rows[0].sample_size).toBe(0);
    expect(cp.rows[0].sample_frequency).toBe("every piece");
    expect(cp.rows[0].control_method).toBe("100%_check");
    expect(cp.rows[0].reaction_plan).toMatch(/STOP line/i);
  });

  it("maps major severity → SPC_Xbar_R policy (sample=5, method=SPC_Xbar_R)", () => {
    const cp = engine.generate(baseInput({
      characteristics: [char({ severity: "major" })],
    }));
    expect(cp.rows[0].sample_size).toBe(5);
    expect(cp.rows[0].control_method).toBe("SPC_Xbar_R");
    expect(cp.rows[0].sample_frequency).toMatch(/5 pieces per hour/);
  });

  it("maps minor severity → AQL policy (sample=1, method=AQL_sampling)", () => {
    const cp = engine.generate(baseInput({
      characteristics: [char({ severity: "minor" })],
    }));
    expect(cp.rows[0].sample_size).toBe(1);
    expect(cp.rows[0].control_method).toBe("AQL_sampling");
    expect(cp.rows[0].sample_frequency).toMatch(/AQL 1\.5/);
  });

  it("respects sample_size, frequency, method, and reaction overrides", () => {
    const cp = engine.generate(baseInput({
      characteristics: [char({
        severity: "major",
        sample_size_override: 25,
        sample_frequency_override: "every shift",
        control_method_override: "poka_yoke",
        reaction_plan_override: "Stop and call engineering.",
      })],
    }));
    expect(cp.rows[0].sample_size).toBe(25);
    expect(cp.rows[0].sample_frequency).toBe("every shift");
    expect(cp.rows[0].control_method).toBe("poka_yoke");
    expect(cp.rows[0].reaction_plan).toBe("Stop and call engineering.");
  });

  it("rolls up severity counts correctly", () => {
    const cp = engine.generate(baseInput({
      characteristics: [
        char({ feature_id: "F-1", severity: "critical" }),
        char({ feature_id: "F-2", severity: "critical" }),
        char({ feature_id: "F-3", severity: "major" }),
        char({ feature_id: "F-4", severity: "minor" }),
        char({ feature_id: "F-5", severity: "minor" }),
        char({ feature_id: "F-6", severity: "minor" }),
      ],
    }));
    expect(cp.summary.total_characteristics).toBe(6);
    expect(cp.summary.critical_count).toBe(2);
    expect(cp.summary.major_count).toBe(1);
    expect(cp.summary.minor_count).toBe(3);
  });

  it("rolls up control-method counts correctly", () => {
    const cp = engine.generate(baseInput({
      characteristics: [
        char({ feature_id: "F-1", severity: "critical" }),   // 100%_check
        char({ feature_id: "F-2", severity: "major" }),      // SPC_Xbar_R
        char({ feature_id: "F-3", severity: "major" }),      // SPC_Xbar_R
        char({ feature_id: "F-4", severity: "major", control_method_override: "poka_yoke" }),
        char({ feature_id: "F-5", severity: "minor" }),      // AQL_sampling
      ],
    }));
    expect(cp.summary.hundred_pct_count).toBe(1);
    expect(cp.summary.spc_controlled_count).toBe(2);
    expect(cp.summary.poka_yoke_count).toBe(1);
  });

  it("formats product_spec as 'nominal +tol+/tol- unit'", () => {
    const cp = engine.generate(baseInput({
      characteristics: [char({ nominal: 1.500, tolerance_plus: 0.002, tolerance_minus: -0.001, unit: "in" })],
    }));
    expect(cp.rows[0].product_spec).toBe("1.5 +0.002/-0.001 in");
  });

  it("flags CRITICAL characteristic with no gage as a warning", () => {
    const cp = engine.generate(baseInput({
      characteristics: [char({ severity: "critical", gage_id: undefined })],
    }));
    expect(cp.summary.warnings.some(w => w.includes("CRITICAL") && w.includes("no gage"))).toBe(true);
  });

  it("flags zero/negative tolerance band as a warning", () => {
    const cp = engine.generate(baseInput({
      characteristics: [char({ tolerance_plus: 0, tolerance_minus: 0 })],
    }));
    expect(cp.summary.warnings.some(w => w.includes("tolerance band"))).toBe(true);
  });

  it("throws when characteristics array is empty", () => {
    expect(() => engine.generate(baseInput({ characteristics: [] }))).toThrow(/at least one characteristic/);
  });

  it("defaults missing organization, supplier, routing_id, gage, method", () => {
    const cp = engine.generate({
      part_number: "PN-DEF",
      revision: "A",
      phase: "prototype",
      characteristics: [char({ gage_id: undefined, measurement_method: undefined, machine_id: undefined })],
    });
    expect(cp.organization).toBe("N/A");
    expect(cp.supplier).toBe("N/A");
    expect(cp.routing_id).toBe("N/A");
    expect(cp.rows[0].gage_id).toBe("N/A");
    expect(cp.rows[0].measurement_method).toBe("CMM");
    expect(cp.rows[0].machine_id).toBe("N/A");
  });

  it("preserves FMEA RPN on rows for traceability", () => {
    const cp = engine.generate(baseInput({
      characteristics: [char({ fmea_rpn: 288 })],
    }));
    expect(cp.rows[0].fmea_rpn).toBe(288);
  });

  it("increments control_plan_id monotonically", () => {
    const cp1 = engine.generate(baseInput());
    const cp2 = engine.generate(baseInput());
    expect(cp1.control_plan_id).toBe("CP-00001");
    expect(cp2.control_plan_id).toBe("CP-00002");
  });

  it("accepts all three phases (prototype, pre-launch, production)", () => {
    const phases = ["prototype", "pre-launch", "production"] as const;
    for (const p of phases) {
      const e = new ControlPlanGeneratorEngine();
      const cp = e.generate(baseInput({ phase: p }));
      expect(cp.phase).toBe(p);
    }
  });
});

describe("ControlPlanGeneratorEngine — rendering", () => {
  it("renders Markdown with header table, characteristics table, and summary", () => {
    const engine = new ControlPlanGeneratorEngine();
    const forms = engine.generateAll(baseInput({
      characteristics: [
        char({ feature_id: "F-CRIT", severity: "critical" }),
        char({ feature_id: "F-MAJ", severity: "major" }),
      ],
    }));
    expect(forms.markdown).toContain("# Control Plan CP-");
    expect(forms.markdown).toContain("PN-ACME-100");
    expect(forms.markdown).toContain("F-CRIT");
    expect(forms.markdown).toContain("F-MAJ");
    expect(forms.markdown).toContain("## Summary");
    expect(forms.markdown).toContain("**Critical:** 1");
    expect(forms.markdown).toContain("**Major:** 1");
  });

  it("renders '100%' in Markdown when sample_size is 0", () => {
    const engine = new ControlPlanGeneratorEngine();
    const forms = engine.generateAll(baseInput({
      characteristics: [char({ severity: "critical" })],
    }));
    expect(forms.markdown).toMatch(/\|\s*100%\s*\|/);
  });

  it("renders CSV with header + rows", () => {
    const engine = new ControlPlanGeneratorEngine();
    const forms = engine.generateAll(baseInput({
      characteristics: [char({ feature_id: "F-A" }), char({ feature_id: "F-B" })],
    }));
    const rows = forms.csv.split("\n");
    expect(rows.length).toBe(3); // header + 2 rows
    expect(rows[0]).toContain("control_plan_id");
    expect(rows[0]).toContain("reaction_plan");
    expect(rows[1]).toContain("F-A");
    expect(rows[2]).toContain("F-B");
  });

  it("escapes CSV cells containing commas, quotes, newlines", () => {
    const engine = new ControlPlanGeneratorEngine();
    const forms = engine.generateAll(baseInput({
      characteristics: [char({
        feature_name: "Bore, Ø1.500",
        reference: 'Zone "A"',
        reaction_plan_override: "Stop, hold,\nsegregate",
      })],
    }));
    expect(forms.csv).toContain('"Bore, Ø1.500"');
    expect(forms.csv).toContain('"Zone ""A"""');
    expect(forms.csv).toContain('"Stop, hold,\nsegregate"');
  });

  it("renders a Warnings section only when warnings exist", () => {
    const engine = new ControlPlanGeneratorEngine();
    const clean = engine.generateAll(baseInput());
    expect(clean.markdown).not.toContain("## Warnings");

    const warned = engine.generateAll(baseInput({
      characteristics: [char({ severity: "critical", gage_id: undefined })],
    }));
    expect(warned.markdown).toContain("## Warnings");
    expect(warned.markdown).toMatch(/⚠/);
  });
});

describe("ControlPlanGeneratorEngine — storage & retrieval", () => {
  it("retrieves plans by control_plan_id", () => {
    const engine = new ControlPlanGeneratorEngine();
    const cp = engine.generate(baseInput());
    expect(engine.get(cp.control_plan_id)).toEqual(cp);
    expect(engine.get("CP-99999")).toBeNull();
  });

  it("reset() clears the store and counter", () => {
    const engine = new ControlPlanGeneratorEngine();
    const cp1 = engine.generate(baseInput());
    engine.reset();
    expect(engine.get(cp1.control_plan_id)).toBeNull();
    const cp2 = engine.generate(baseInput());
    expect(cp2.control_plan_id).toBe("CP-00001");
  });
});
