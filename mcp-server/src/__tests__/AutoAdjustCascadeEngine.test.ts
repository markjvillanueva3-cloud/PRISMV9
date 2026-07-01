/**
 * AutoAdjustCascadeEngine tests — SFC-ACCURACY-MS1 Iter 4
 *
 * Each test asserts a concrete value (number/string/exact length/severity literal)
 * that would FAIL if the engine returned the wrong RPM ceiling, fz multiplier,
 * deflection-cubed cap, or compat verdict. No presence-only stubs.
 *
 * Verified edges (spec §7):
 *   material, machine_type, spindle_taper, tool_diameter, tool_stickout,
 *   holder_type, operation, strategy, coolant_type, workholding, optimize_for
 *
 * Real-world references:
 *   Timoshenko δ∝L³ · ISO 7388 HSK + Weldon incompat · Sandvik CoroKey Vc multipliers
 *
 * @module __tests__/AutoAdjustCascadeEngine
 */

import { describe, expect, it } from "vitest";
import {
  autoAdjustCascadeEngine,
  CascadeInputSchema,
  AutoAdjustCascadeEngineImpl,
} from "../engines/AutoAdjustCascadeEngine.js";
import type { CascadeResult, CascadeAdjustment } from "../engines/AutoAdjustCascadeEngine.js";

function adjustmentAt(r: CascadeResult, field: string, source?: string): CascadeAdjustment {
  const a = r.adjustments.find(x => x.field === field && (!source || x.source === source));
  if (!a) throw new Error(`expected adjustment field=${field} source=${source ?? "*"}; got fields=[${r.adjustments.map(x => `${x.field}/${x.source}`).join(",")}]`);
  return a;
}

function countWithSource(r: CascadeResult, source: string): number {
  return r.adjustments.filter(a => a.source === source).length;
}

// ────────────────────────────────────────────────────────────────────────────

describe("CascadeInputSchema accepts/rejects boundaries", () => {
  it("parses changedField='material' verbatim", () => {
    const out = CascadeInputSchema.parse({ oldInput: {}, changedField: "material", newValue: "AL6061" });
    expect(out.changedField).toBe("material");
    expect(out.newValue).toBe("AL6061");
  });

  it("empty changedField throws ZodError citing string origin", () => {
    let msg = "";
    try { CascadeInputSchema.parse({ oldInput: {}, changedField: "", newValue: 1 }); } catch (e) { msg = (e as Error).message; }
    // Zod v4 emits structured JSON; verify it names the offending path/origin.
    expect(msg.includes('"origin": "string"') || msg.includes("changedField")).toBe(true);
  });

  it("maxDepth=6 throws (ceiling=5) citing number origin", () => {
    let msg = "";
    try { CascadeInputSchema.parse({ oldInput: {}, changedField: "x", newValue: 1, maxDepth: 6 }); } catch (e) { msg = (e as Error).message; }
    expect(msg.includes('"origin": "number"') || msg.includes("maxDepth")).toBe(true);
  });

  it("maxDepth=2 round-trips intact", () => {
    const out = CascadeInputSchema.parse({ oldInput: {}, changedField: "x", newValue: 1, maxDepth: 2 });
    expect(out.maxDepth).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("material change", () => {
  it("iso_group advisory severity='info' source='material_baseline' reason names new material", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { material: "1018 steel", iso_group: "P", hardness_hb: 180 },
      changedField: "material",
      newValue: "Inconel 718",
    });
    const isoAdj = adjustmentAt(r, "iso_group", "material_baseline");
    expect(isoAdj.severity).toBe("info");
    expect(isoAdj.reason.includes("Inconel 718")).toBe(true);
  });

  it("hardness advisory fires when prior hardness_hb=180", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { material: "1018 steel", hardness_hb: 180 },
      changedField: "material",
      newValue: "4140 PH",
    });
    const ha = adjustmentAt(r, "hardness_hb", "material_baseline");
    expect(ha.oldValue).toBe(180);
    expect(ha.severity).toBe("info");
  });

  it("no hardness advisory when prior hardness absent — count=0", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { material: "1018 steel" },
      changedField: "material",
      newValue: "AL6061",
    });
    const hardnessCount = r.adjustments.filter(a => a.field === "hardness_hb").length;
    expect(hardnessCount).toBe(0);
  });

  it("requiresRecompute=true on bare material change", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "material", newValue: "Ti6Al4V" });
    expect(r.requiresRecompute).toBe(true);
  });

  it("warnings array contains the literal 'Ti6Al4V'", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "material", newValue: "Ti6Al4V" });
    const hit = r.warnings.find(w => w.includes("Ti6Al4V"));
    expect(hit?.includes("re-resolve")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("machine_type change", () => {
  it("vertical_mill default: rpm=12000, accel=5, rigidity=medium", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "machine_type", newValue: "vertical_mill" });
    expect(r.newInput.machine_max_rpm).toBe(12000);
    expect(r.newInput.machine_axis_accel_m_s2).toBe(5);
    expect(r.newInput.machine_rigidity).toBe("medium");
  });

  it("5axis default: rpm=20000, accel=8, rigidity=medium", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "machine_type", newValue: "5axis" });
    expect(r.newInput.machine_max_rpm).toBe(20000);
    expect(r.newInput.machine_axis_accel_m_s2).toBe(8);
    expect(r.newInput.machine_rigidity).toBe("medium");
  });

  it("horizontal_mill default: rpm=8000, rigidity=high", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "machine_type", newValue: "horizontal_mill" });
    expect(r.newInput.machine_max_rpm).toBe(8000);
    expect(r.newInput.machine_rigidity).toBe("high");
  });

  it("rpm=30000 on vertical_mill (default 12000) → severity='warning' oldValue=30000", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { machine_max_rpm: 30000 }, changedField: "machine_type", newValue: "vertical_mill",
    });
    const a = adjustmentAt(r, "machine_max_rpm", "machine_type_envelope");
    expect(a.severity).toBe("warning");
    expect(a.oldValue).toBe(30000);
    expect(a.newValue).toBe(12000);
  });

  it("rpm=15000 preserved (within 1.5× vertical_mill default 12000)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { machine_max_rpm: 15000 }, changedField: "machine_type", newValue: "vertical_mill",
    });
    expect(r.newInput.machine_max_rpm).toBe(15000);
  });

  it("BT50 on 5axis (typical HSK-A63) → severity='info' reason cites both", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { spindle_taper: "BT50" }, changedField: "machine_type", newValue: "5axis",
    });
    const a = adjustmentAt(r, "spindle_taper", "machine_type_envelope");
    expect(a.severity).toBe("info");
    expect(a.reason.includes("BT50") && a.reason.includes("HSK-A63")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("spindle_taper change → holder compat", () => {
  it("HSK-A63 + Weldon → severity='critical', newInput.holder_type becomes undefined", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { holder_type: "Weldon" }, changedField: "spindle_taper", newValue: "HSK-A63",
    });
    const a = adjustmentAt(r, "holder_type", "taper_holder_compat");
    expect(a.severity).toBe("critical");
    expect(a.oldValue).toBe("Weldon");
    expect(a.newValue).toBe(null);
    expect(r.newInput.holder_type === undefined).toBe(true);
  });

  it("BT40 + Weldon (compatible) → zero critical adjustments, holder preserved", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { holder_type: "Weldon" }, changedField: "spindle_taper", newValue: "BT40",
    });
    const critCount = r.adjustments.filter(a => a.severity === "critical").length;
    expect(critCount).toBe(0);
    expect(r.newInput.holder_type).toBe("Weldon");
  });

  it("HSK-E40 + milling_chuck (undersized E-series) → severity='critical'", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { holder_type: "milling_chuck" }, changedField: "spindle_taper", newValue: "HSK-E40",
    });
    const a = adjustmentAt(r, "holder_type", "taper_holder_compat");
    expect(a.severity).toBe("critical");
  });

  it("HSK-A100 + Weldon → warnings[0..] contains 'CRITICAL' prefix", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { holder_type: "Weldon" }, changedField: "spindle_taper", newValue: "HSK-A100",
    });
    const hit = r.warnings.find(w => w.startsWith("CRITICAL"));
    expect(hit?.includes("Weldon")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("tool_diameter_mm change", () => {
  it("P-group + D=10 + rpm=20000 → advisory severity='info', newValue=20000 (no mutation)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { iso_group: "P", machine_max_rpm: 20000 },
      changedField: "tool_diameter_mm",
      newValue: 10,
    });
    const a = adjustmentAt(r, "machine_max_rpm", "tool_diameter_rpm_ceiling");
    expect(a.severity).toBe("info");
    expect(a.newValue).toBe(20000);
    expect(a.oldValue).toBe(20000);
  });

  it("K-group + D=20 + rpm=6000 → zero machine_max_rpm advisories", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { iso_group: "K", machine_max_rpm: 6000 },
      changedField: "tool_diameter_mm",
      newValue: 20,
    });
    const rpmAdjCount = r.adjustments.filter(
      a => a.field === "machine_max_rpm" && a.source === "tool_diameter_rpm_ceiling").length;
    expect(rpmAdjCount).toBe(0);
  });

  it("shrink_fit + D=12 → gauge=18 (=1.5×D)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { holder_type: "shrink_fit" }, changedField: "tool_diameter_mm", newValue: 12,
    });
    expect(r.newInput.holder_gauge_length_mm).toBe(18);
  });

  it("ER_collet + D=10 → gauge=20 (=2×D)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { holder_type: "ER_collet" }, changedField: "tool_diameter_mm", newValue: 10,
    });
    expect(r.newInput.holder_gauge_length_mm).toBe(20);
  });

  it("D=0 → countWithSource('tool_diameter_rpm_ceiling')=0", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: {}, changedField: "tool_diameter_mm", newValue: 0,
    });
    expect(countWithSource(r, "tool_diameter_rpm_ceiling")).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("tool_stickout_mm change", () => {
  it("stickout 20→40 with ap=4 → ap=0.5 (= 4 × (20/40)³ = 4 × 0.125)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { tool_stickout_mm: 20, axial_depth_mm: 4, tool_diameter_mm: 10 },
      changedField: "tool_stickout_mm",
      newValue: 40,
    });
    const a = adjustmentAt(r, "axial_depth_mm", "stickout_deflection_ceiling");
    expect(a.severity).toBe("warning");
    expect(r.newInput.axial_depth_mm).toBeCloseTo(0.5, 6);
  });

  it("stickout 10→100 with ap=1 → ap clamped to floor 0.1 (would be 0.001 raw)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { tool_stickout_mm: 10, axial_depth_mm: 1, tool_diameter_mm: 5 },
      changedField: "tool_stickout_mm",
      newValue: 100,
    });
    expect(r.newInput.axial_depth_mm).toBe(0.1);
  });

  it("stickout shrinks 40→20 → ap=0.5 preserved (no shrink penalty)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { tool_stickout_mm: 40, axial_depth_mm: 0.5, tool_diameter_mm: 10 },
      changedField: "tool_stickout_mm",
      newValue: 20,
    });
    expect(r.newInput.axial_depth_mm).toBe(0.5);
  });

  it("L/D=7 (newL=70, D=10) → severity='warning', reason includes 'L/D'", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { tool_diameter_mm: 10 }, changedField: "tool_stickout_mm", newValue: 70,
    });
    const a = adjustmentAt(r, "tool_stickout_mm", "stickout_deflection_ceiling");
    expect(a.severity).toBe("warning");
    expect(a.reason.includes("L/D")).toBe(true);
  });

  it("L/D=9 (newL=90, D=10) → severity='critical'", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { tool_diameter_mm: 10 }, changedField: "tool_stickout_mm", newValue: 90,
    });
    const a = adjustmentAt(r, "tool_stickout_mm", "stickout_deflection_ceiling");
    expect(a.severity).toBe("critical");
  });

  it("L/D=3 (newL=30, D=10) safe → countWithSource('stickout_deflection_ceiling')=0", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { tool_diameter_mm: 10 }, changedField: "tool_stickout_mm", newValue: 30,
    });
    expect(countWithSource(r, "stickout_deflection_ceiling")).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("holder_type change", () => {
  it("shrink_fit → TIR=0.003mm, balance=G2.5", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "holder_type", newValue: "shrink_fit" });
    expect(r.newInput.holder_tir_mm).toBe(0.003);
    expect(r.newInput.holder_balanced_g).toBe(2.5);
  });

  it("ER_collet → TIR=0.010mm, balance=G6.3", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "holder_type", newValue: "ER_collet" });
    expect(r.newInput.holder_tir_mm).toBe(0.010);
    expect(r.newInput.holder_balanced_g).toBe(6.3);
  });

  it("hydraulic → balance=G2.5 (tight balance class)", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "holder_type", newValue: "hydraulic" });
    expect(r.newInput.holder_balanced_g).toBe(2.5);
  });

  it("Weldon → balance=G6.3", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "holder_type", newValue: "Weldon" });
    expect(r.newInput.holder_balanced_g).toBe(6.3);
  });

  it("HSK-A63 spindle + holder=Weldon → critical compat adjustment present", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { spindle_taper: "HSK-A63" }, changedField: "holder_type", newValue: "Weldon",
    });
    const compat = r.adjustments.filter(a => a.source === "taper_holder_compat" && a.severity === "critical").length;
    expect(compat).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("operation change", () => {
  it("operation=milling → cut_type='semi_finishing', strategy='adaptive'", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "operation", newValue: "milling" });
    expect(r.newInput.cut_type).toBe("semi_finishing");
    expect(r.newInput.strategy).toBe("adaptive");
  });

  it("operation=tapping → cut_type='finishing'", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "operation", newValue: "tapping" });
    expect(r.newInput.cut_type).toBe("finishing");
  });

  it("operation=drilling → cut_type='roughing'", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "operation", newValue: "drilling" });
    expect(r.newInput.cut_type).toBe("roughing");
  });

  it("user cut_type='roughing' preserved when operation→milling (no overwrite)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { cut_type: "roughing" }, changedField: "operation", newValue: "milling",
    });
    expect(r.newInput.cut_type).toBe("roughing");
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("strategy change", () => {
  it("strategy=trochoidal → reason contains '×0.50', radial_depth_pct=0.10", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "strategy", newValue: "trochoidal" });
    const a = adjustmentAt(r, "strategy", "strategy_fz_multiplier");
    expect(a.reason.includes("×0.50")).toBe(true);
    expect(r.newInput.radial_depth_pct).toBeCloseTo(0.10, 6);
  });

  it("strategy=hsm → reason contains '×1.50', radial_depth_pct=0.15", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "strategy", newValue: "hsm" });
    const a = adjustmentAt(r, "strategy", "strategy_fz_multiplier");
    expect(a.reason.includes("×1.50")).toBe(true);
    expect(r.newInput.radial_depth_pct).toBeCloseTo(0.15, 6);
  });

  it("strategy=conventional → countWithSource('strategy_fz_multiplier')=0 (baseline)", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "strategy", newValue: "conventional" });
    expect(countWithSource(r, "strategy_fz_multiplier")).toBe(0);
  });

  it("strategy=plunge → reason contains '×0.30'", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "strategy", newValue: "plunge" });
    const a = adjustmentAt(r, "strategy", "strategy_fz_multiplier");
    expect(a.reason.includes("×0.30")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("coolant_type change", () => {
  it("cryogenic → reason contains '×1.40'", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "coolant_type", newValue: "cryogenic" });
    const a = adjustmentAt(r, "coolant_type", "coolant_vc_multiplier");
    expect(a.reason.includes("×1.40")).toBe(true);
    expect(a.severity).toBe("info");
  });

  it("dry → severity='warning', warnings contain literal 'Dry cutting'", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "coolant_type", newValue: "dry" });
    const a = adjustmentAt(r, "coolant_type", "coolant_vc_multiplier");
    expect(a.severity).toBe("warning");
    const hit = r.warnings.find(w => w.startsWith("Dry cutting"));
    expect(hit?.includes("40%")).toBe(true);
  });

  it("flood → countWithSource('coolant_vc_multiplier')=0 (baseline ×1.0)", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "coolant_type", newValue: "flood" });
    expect(countWithSource(r, "coolant_vc_multiplier")).toBe(0);
  });

  it("cryogenic + S-group → countWithSource('coolant_vc_multiplier')=2 (base + synergy)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { iso_group: "S" }, changedField: "coolant_type", newValue: "cryogenic",
    });
    expect(countWithSource(r, "coolant_vc_multiplier")).toBe(2);
    const synergy = r.adjustments.find(a => a.source === "coolant_vc_multiplier" && a.reason.includes("superalloy"));
    expect(synergy?.reason.includes("MIT 2.832")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("workholding_type change", () => {
  it("vise → clamping_force_kN=5", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "workholding_type", newValue: "vise" });
    expect(r.newInput.clamping_force_kN).toBe(5);
  });

  it("chuck → clamping_force_kN=50", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "workholding_type", newValue: "chuck" });
    expect(r.newInput.clamping_force_kN).toBe(50);
  });

  it("collet → clamping_force_kN=30", () => {
    const r = autoAdjustCascadeEngine.cascade({ oldInput: {}, changedField: "workholding_type", newValue: "collet" });
    expect(r.newInput.clamping_force_kN).toBe(30);
  });

  it("vise + clamp=30kN stated → severity='warning', oldValue=30", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { clamping_force_kN: 30 }, changedField: "workholding_type", newValue: "vise",
    });
    const a = adjustmentAt(r, "clamping_force_kN", "workholding_force_capacity");
    expect(a.severity).toBe("warning");
    expect(a.oldValue).toBe(30);
  });

  it("vacuum + ap=8mm → severity='warning' on axial_depth_mm", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { axial_depth_mm: 8 }, changedField: "workholding_type", newValue: "vacuum",
    });
    const a = adjustmentAt(r, "axial_depth_mm", "workholding_force_capacity");
    expect(a.severity).toBe("warning");
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("meta-behavior", () => {
  it("optimize_for change → requiresRecompute=true, adjustments.length=0", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { optimize_for: "balanced" }, changedField: "optimize_for", newValue: "productivity",
    });
    expect(r.requiresRecompute).toBe(true);
    expect(r.adjustments.length).toBe(0);
    const objHit = r.warnings.find(w => w.includes("productivity"));
    expect(objHit?.includes("recommend")).toBe(true);
  });

  it("maxDepth=0 → cascadeDepth=0, adjustments.length=0 (primary mutation only)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: {}, changedField: "machine_type", newValue: "5axis", maxDepth: 0,
    });
    expect(r.cascadeDepth).toBe(0);
    expect(r.adjustments.length).toBe(0);
    expect(r.newInput.machine_type).toBe("5axis");
  });

  it("maxDepth=1, 5axis blank input → cascadeDepth=1, exactly 3 adjustments (rpm+rigidity+accel)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: {}, changedField: "machine_type", newValue: "5axis", maxDepth: 1,
    });
    expect(r.cascadeDepth).toBe(1);
    expect(r.adjustments.length).toBe(3);
    const fields = r.adjustments.map(a => a.field).sort();
    expect(fields.join(",")).toBe("machine_axis_accel_m_s2,machine_max_rpm,machine_rigidity");
  });

  it("dryRun=true → caller's oldInput unmutated, newInput.fields match oldInput.fields", () => {
    const oldInput = { tool_stickout_mm: 20, axial_depth_mm: 4, tool_diameter_mm: 10 };
    const r = autoAdjustCascadeEngine.cascade({
      oldInput, changedField: "tool_stickout_mm", newValue: 40, dryRun: true,
    });
    // Caller's reference must be unmutated regardless of zod's internal cloning.
    expect(oldInput.axial_depth_mm).toBe(4);
    expect(oldInput.tool_stickout_mm).toBe(20);
    // dryRun returns the unmodified oldInput shape — primary mutation not applied.
    expect(r.newInput.tool_stickout_mm).toBe(20);
    expect(r.newInput.axial_depth_mm).toBe(4);
    // Adjustments are still reported (advisories only — no mutation).
    // 1 = stickout-grew → ap-reduction advisory. L/D=4 is safe (<6), no L/D advisory.
    expect(r.adjustments.length).toBe(1);
    expect(r.adjustments[0].source).toBe("stickout_deflection_ceiling");
    expect(r.adjustments[0].field).toBe("axial_depth_mm");
  });

  it("every adjustment reason length >= 11 chars (rejects empty stubs)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { iso_group: "P", hardness_hb: 200 }, changedField: "material", newValue: "Ti6Al4V",
    });
    const shortReasons = r.adjustments.filter(a => a.reason.length < 11);
    expect(shortReasons.length).toBe(0);
    expect(r.adjustments.length).toBe(2);  // iso_group + hardness
  });

  it("every adjustment source is in the registered enum (11 values)", () => {
    const validSources = new Set([
      "material_baseline", "machine_type_envelope", "taper_holder_compat",
      "tool_diameter_rpm_ceiling", "stickout_deflection_ceiling", "holder_envelope",
      "operation_defaults", "strategy_fz_multiplier", "coolant_vc_multiplier",
      "workholding_force_capacity", "objective_reset",
    ]);
    // L/D=7 (newL=70, D=10) → exactly 1 stickout warning adjustment.
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { tool_diameter_mm: 10 }, changedField: "tool_stickout_mm", newValue: 70,
    });
    const invalid = r.adjustments.filter(a => !validSources.has(a.source));
    expect(invalid.length).toBe(0);
    expect(r.adjustments.length).toBe(1);
  });

  it("unknown changedField → adjustments.length=0, primary mutation applied", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: {}, changedField: "feed_per_tooth_mm", newValue: 0.1,
    });
    expect(r.adjustments.length).toBe(0);
    expect(r.cascadeDepth).toBe(1);
    expect(r.newInput.feed_per_tooth_mm).toBe(0.1);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("2nd-order propagation", () => {
  it("spindle_taper=HSK-A63 with Weldon → cascadeDepth=2, criticals.length=1", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: { holder_type: "Weldon" }, changedField: "spindle_taper", newValue: "HSK-A63", maxDepth: 2,
    });
    expect(r.cascadeDepth).toBe(2);
    const criticals = r.adjustments.filter(a => a.severity === "critical");
    expect(criticals.length).toBe(1);
  });

  it("operation=milling → strategy='adaptive' (1st) → fz advisory '×1.20' (2nd)", () => {
    const r = autoAdjustCascadeEngine.cascade({
      oldInput: {}, changedField: "operation", newValue: "milling", maxDepth: 2,
    });
    const stratDefault = adjustmentAt(r, "strategy", "operation_defaults");
    expect(stratDefault.newValue).toBe("adaptive");
    const fzAdvisory = r.adjustments.find(a => a.source === "strategy_fz_multiplier");
    expect(fzAdvisory?.reason.includes("×1.20")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("engine module exports", () => {
  it("default instance is instanceof AutoAdjustCascadeEngineImpl", () => {
    expect(autoAdjustCascadeEngine instanceof AutoAdjustCascadeEngineImpl).toBe(true);
  });

  it("autoAdjustCascadeEngine.cascade is a function", () => {
    expect(typeof autoAdjustCascadeEngine.cascade).toBe("function");
  });

  it("numeric changedField (123) → schema throws", () => {
    let threw = false;
    try { CascadeInputSchema.parse({ oldInput: {}, changedField: 123, newValue: 1 }); } catch { threw = true; }
    expect(threw).toBe(true);
  });
});
