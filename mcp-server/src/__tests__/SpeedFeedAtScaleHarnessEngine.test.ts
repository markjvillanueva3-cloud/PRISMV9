import { describe, it, expect } from "vitest";
import {
  SpeedFeedAtScaleHarnessEngine,
  speedFeedAtScaleHarnessEngine,
  type SfcCell,
  type SfcCellOutput,
} from "../engines/SpeedFeedAtScaleHarnessEngine.js";

describe("SpeedFeedAtScaleHarnessEngine", () => {
  const eng = speedFeedAtScaleHarnessEngine;

  describe("generateMatrix", () => {
    it("expands defaults to 6 iso × 3 op × 3 cut × 3 dia × 1 mat × 1 flutes × 1 unit = 162", () => {
      const cells = eng.generateMatrix();
      expect(cells.length).toBe(162);
    });

    it("respects narrow overrides without silent expansion", () => {
      const cells = eng.generateMatrix({
        iso_groups: ["P"],
        operations: ["milling"],
        cut_types: ["roughing"],
        tool_diameters_mm: [12],
        tool_materials: ["carbide"],
        flutes_list: [4],
        units: ["metric"],
      });
      expect(cells.length).toBe(1);
      expect(cells[0].iso_group).toBe("P");
      expect(cells[0].tool_diameter_mm).toBe(12);
      expect(cells[0].flutes).toBe(4);
    });

    it("propagates machine_power_kw across every cell", () => {
      const cells = eng.generateMatrix({
        iso_groups: ["P", "M"],
        operations: ["milling"],
        cut_types: ["roughing"],
        tool_diameters_mm: [12],
        machine_power_kw: 15,
      });
      expect(cells).toHaveLength(2);
      expect(cells[0].machine_power_kw).toBe(15);
      expect(cells[1].machine_power_kw).toBe(15);
    });
  });

  describe("invariant I1 — RPM coherence", () => {
    it("PASS for canonical synthetic compute (RPM = Vc·1000 / πD)", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell);
      expect(r.verdict).toBe("pass");
      expect(r.invariant_violations).toHaveLength(0);
      // Synthetic must produce canonical RPM (P group Vc=200, D=12 → 5305.16)
      expect(r.output!.rpm).toBeCloseTo((200 * 1000) / (Math.PI * 12), 0);
    });

    it("FAIL with I1_rpm critical when compute returns wrong RPM", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell, (_c) => ({
        rpm: 1234, vc: 200, fz: 0.36, feed_rate: 1776.96, ap: 12,
        fc: 5000, power: 2.0, confidence: 0.9,
      } satisfies SfcCellOutput));
      expect(r.verdict).toBe("fail");
      const i1 = r.invariant_violations.filter((v) => v.invariant === "I1_rpm");
      expect(i1).toHaveLength(1);
      expect(i1[0].severity).toBe("critical");
      expect(i1[0].expected).toContain("RPM");
      expect(i1[0].got).toContain("1234");
    });
  });

  describe("invariant I2 — feed-rate coherence", () => {
    it("FAIL with I2_feed when feed_rate ≠ RPM·fz·N for milling", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell, () => ({
        rpm: 5305, vc: 200, fz: 0.36, feed_rate: 9999, ap: 12, fc: 5000, power: 2.0, confidence: 0.9,
      }));
      expect(r.verdict).toBe("fail");
      const i2 = r.invariant_violations.filter((v) => v.invariant === "I2_feed");
      expect(i2).toHaveLength(1);
      expect(i2[0].severity).toBe("critical");
      expect(i2[0].got).toContain("9999");
    });

    it("FAIL with I2_feed when feed_rate ≠ RPM·fpr for turning", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "turning", cut_type: "roughing",
        tool_diameter_mm: 25, tool_material: "carbide", flutes: 1, units: "metric",
      };
      const r = eng.runCell(cell, () => ({
        rpm: 2546, vc: 200, fpr: 0.3, feed_rate: 9999, ap: 5, fc: 4000, power: 1.5, confidence: 0.9,
      }));
      expect(r.verdict).toBe("fail");
      const i2 = r.invariant_violations.filter((v) => v.invariant === "I2_feed");
      expect(i2).toHaveLength(1);
    });
  });

  describe("invariant I3 — Kienzle sanity", () => {
    it("FAIL with I3_kienzle critical when Fc is non-positive", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell, () => ({
        rpm: 5305, vc: 200, fz: 0.36, feed_rate: 7639.2, ap: 12, fc: -100, power: 0, confidence: 0.9,
      }));
      expect(r.verdict).toBe("fail");
      const i3 = r.invariant_violations.filter((v) => v.invariant === "I3_kienzle");
      expect(i3).toHaveLength(1);
      expect(i3[0].severity).toBe("critical");
      expect(i3[0].got).toContain("-100");
    });

    it("WARN with I3_kienzle warning when Fc exceeds physical envelope", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell, () => ({
        rpm: 5305, vc: 200, fz: 0.36, feed_rate: 7639.2, ap: 12, fc: 80000, power: 4.4, confidence: 0.9,
      }));
      expect(r.verdict).toBe("warn");
      const i3 = r.invariant_violations.filter((v) => v.invariant === "I3_kienzle");
      expect(i3).toHaveLength(1);
      expect(i3[0].severity).toBe("warning");
      expect(i3[0].got).toMatch(/unit|formula/);
    });
  });

  describe("invariant I4 — power budget", () => {
    it("FAIL with I4_power when predicted power exceeds machine cap", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
        machine_power_kw: 5,
      };
      const r = eng.runCell(cell, () => ({
        rpm: 5305, vc: 200, fz: 0.36, feed_rate: 7639.2, ap: 12, fc: 5000, power: 50, confidence: 0.9,
      }));
      expect(r.verdict).toBe("fail");
      const i4 = r.invariant_violations.filter((v) => v.invariant === "I4_power");
      expect(i4).toHaveLength(1);
      expect(i4[0].severity).toBe("critical");
      expect(i4[0].expected).toContain("machine_power_kw");
    });

    it("no I4 flag when machine_power_kw is absent (gate not armed)", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell, () => ({
        rpm: 5305, vc: 200, fz: 0.36, feed_rate: 7639.2, ap: 12, fc: 5000, power: 50, confidence: 0.9,
      }));
      const i4 = r.invariant_violations.filter((v) => v.invariant === "I4_power");
      expect(i4).toHaveLength(0);
    });
  });

  describe("invariant I5 — numeric finiteness", () => {
    it("FAIL with I5_finite when rpm is NaN (includes field name in violation)", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell, () => ({
        rpm: NaN, vc: 200, fz: 0.36, feed_rate: 7639.2, ap: 12, fc: 5000, power: 2.0, confidence: 0.9,
      }));
      expect(r.verdict).toBe("fail");
      const i5 = r.invariant_violations.filter((v) => v.invariant === "I5_finite");
      expect(i5).toHaveLength(1);
      expect(i5[0].got).toContain("rpm");
    });

    it("FAIL with I5_finite when fc is Infinity", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell, () => ({
        rpm: 5305, vc: 200, fz: 0.36, feed_rate: 7639.2, ap: 12, fc: Infinity, power: 2.0, confidence: 0.9,
      }));
      expect(r.verdict).toBe("fail");
      const i5 = r.invariant_violations.filter((v) => v.invariant === "I5_finite");
      expect(i5).toHaveLength(1);
      expect(i5[0].got).toContain("fc");
    });
  });

  describe("invariant I6 — confidence bounded", () => {
    it("WARN with I6_confidence when confidence is out of [0,1]", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell, () => ({
        rpm: 5305, vc: 200, fz: 0.36, feed_rate: 7639.2, ap: 12, fc: 5000, power: 2.0, confidence: 1.5,
      }));
      expect(r.verdict).toBe("warn");
      const i6 = r.invariant_violations.filter((v) => v.invariant === "I6_confidence");
      expect(i6).toHaveLength(1);
      expect(i6[0].got).toContain("1.5");
    });
  });

  describe("compute failure modes", () => {
    it("FAIL when compute throws (calc_error surfaced)", () => {
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const r = eng.runCell(cell, () => { throw new Error("compute boom"); });
      expect(r.verdict).toBe("fail");
      expect(r.calc_error).toContain("compute boom");
      expect(r.calc_ok).toBe(false);
      expect(r.invariant_violations).toHaveLength(0); // can't check invariants if calc failed
    });
  });

  describe("runMatrix — aggregation", () => {
    it("default sweep passes all invariants on the canonical synthetic", () => {
      const report = eng.runMatrix({
        iso_groups: ["P", "M"],
        operations: ["milling"],
        cut_types: ["roughing", "finishing"],
        tool_diameters_mm: [6, 12],
      });
      // 2 × 1 × 2 × 2 = 8 cells
      expect(report.total_cells).toBe(8);
      expect(report.by_verdict.pass).toBe(8);
      expect(report.by_verdict.fail).toBe(0);
      expect(report.by_verdict.warn).toBe(0);
      expect(report.pass_rate.value).toBe(1);
    });

    it("aggregates per-iso-group and per-operation correctly", () => {
      const report = eng.runMatrix({
        iso_groups: ["P", "M"],
        operations: ["milling", "turning"],
        cut_types: ["roughing"],
        tool_diameters_mm: [12],
      });
      expect(report.by_iso_group["P"].total).toBe(2);
      expect(report.by_iso_group["M"].total).toBe(2);
      expect(report.by_iso_group["P"].pass).toBe(2);
      expect(report.by_operation["milling"].total).toBe(2);
      expect(report.by_operation["turning"].total).toBe(2);
    });

    it("pass_rate.uncertainty is Wilson 95% half-width (≈0.49 for p=0.5, n=4)", () => {
      // Force 2/4 pass via a compute callback that fails on M cells (wrong RPM).
      const report = eng.runMatrix({
        iso_groups: ["P", "M"],
        operations: ["milling"],
        cut_types: ["roughing"],
        tool_diameters_mm: [6, 12],
        compute: (c) => c.iso_group === "M"
          ? ({ rpm: 9999, vc: 200, fz: 0.18, feed_rate: 7639.2, ap: 6, fc: 1000, power: 1, confidence: 0.9 })
          : ({ rpm: (200 * 1000) / (Math.PI * c.tool_diameter_mm), vc: 200,
               fz: 0.03 * c.tool_diameter_mm,
               feed_rate: (200 * 1000) / (Math.PI * c.tool_diameter_mm) * 0.03 * c.tool_diameter_mm * c.flutes,
               ap: c.tool_diameter_mm, fc: 5000, power: 2.0, confidence: 0.9 }),
      });
      expect(report.pass_rate.value).toBe(0.5);
      expect(report.pass_rate.uncertainty).toBeGreaterThan(0.45);
      expect(report.pass_rate.uncertainty).toBeLessThan(0.55);
    });

    it("confidence scales sub-linearly with sample size (sqrt curve)", () => {
      const small = eng.runMatrix({
        iso_groups: ["P"],
        operations: ["milling"],
        cut_types: ["roughing"],
        tool_diameters_mm: [12],
      });
      const medium = eng.runMatrix({
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: ["milling", "turning", "drilling"],
        cut_types: ["roughing", "finishing"],
        tool_diameters_mm: [6, 12, 25],
      });
      expect(small.pass_rate.confidence!).toBeLessThan(medium.pass_rate.confidence!);
      expect(medium.pass_rate.confidence!).toBeLessThan(1);
      expect(small.pass_rate.confidence!).toBeLessThan(0.1);
    });
  });

  describe("runKienzleApScalingProbe", () => {
    it("returns finite numeric ratio + boolean pass per requested ISO group", () => {
      const probe = eng.runKienzleApScalingProbe(["P", "M", "K"]);
      expect(Object.keys(probe).sort()).toEqual(["K", "M", "P"]);
      // Real shape + content assertions on every entry
      expect(typeof probe.P.ratio).toBe("number");
      expect(Number.isFinite(probe.P.ratio)).toBe(true);
      expect(typeof probe.P.pass).toBe("boolean");
      expect(typeof probe.M.ratio).toBe("number");
      expect(Number.isFinite(probe.M.ratio)).toBe(true);
      expect(typeof probe.K.ratio).toBe("number");
      expect(Number.isFinite(probe.K.ratio)).toBe(true);
    });

    it("flags Kienzle regression (pass=false) when compute returns Fc=0", () => {
      const probe = eng.runKienzleApScalingProbe(["P"], () => ({
        rpm: 5305, vc: 200, fz: 0.18, feed_rate: 3819.6, ap: 12,
        fc: 0, power: 0, confidence: 0.9,
      }));
      // 0/0 ratio is NaN → pass=false (the probe must reject Fc=0 regressions)
      expect(probe.P.pass).toBe(false);
      expect(Number.isNaN(probe.P.ratio)).toBe(true);
    });
  });

  describe("class API", () => {
    it("singleton + fresh instance produce identical verdicts and outputs", () => {
      const fresh = new SpeedFeedAtScaleHarnessEngine();
      const cell: SfcCell = {
        iso_group: "P", operation: "milling", cut_type: "roughing",
        tool_diameter_mm: 12, tool_material: "carbide", flutes: 4, units: "metric",
      };
      const a = eng.runCell(cell);
      const b = fresh.runCell(cell);
      expect(a.verdict).toBe(b.verdict);
      expect(a.output?.rpm).toBe(b.output?.rpm);
      expect(a.output?.fc).toBe(b.output?.fc);
    });
  });
});
