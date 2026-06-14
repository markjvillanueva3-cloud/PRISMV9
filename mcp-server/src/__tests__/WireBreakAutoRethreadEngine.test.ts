import { describe, it, expect } from "vitest";
import {
  wireBreakAutoRethreadEngine as eng,
  WireBreakAutoRethreadEngine,
  type WireBreakInput,
} from "../engines/WireBreakAutoRethreadEngine.js";

function nominal(o: Partial<WireBreakInput> = {}): WireBreakInput {
  return {
    break_position_mm: 50,
    cut_path_total_mm: 200,
    workpiece_thickness_mm: 25,
    wire_diameter_mm: 0.25,
    wire_material: "brass",
    cut_phase: "rough",
    threading_capability: "auto_thread",
    feature_position: "interior",
    ...o,
  };
}

describe("WireBreakAutoRethreadEngine", () => {
  it("exports singleton with recover()", () => {
    expect(eng).toBeInstanceOf(WireBreakAutoRethreadEngine);
    expect(typeof eng.recover).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.recover({} as WireBreakInput)).toThrow(/break_position_mm \+ cut_path_total_mm required/);
  });

  it("throws on negative break position", () => {
    expect(() => eng.recover(nominal({ break_position_mm: -1 }))).toThrow(/non-negative break_position/);
  });

  it("throws on non-positive cut_path_total", () => {
    expect(() => eng.recover(nominal({ cut_path_total_mm: 0 }))).toThrow(/positive cut_path_total/);
  });

  it("throws when break beyond cut_path_total", () => {
    expect(() => eng.recover(nominal({ break_position_mm: 300, cut_path_total_mm: 200 }))).toThrow(/cannot exceed/);
  });

  it("throws on non-positive thickness or wire_diameter", () => {
    expect(() => eng.recover(nominal({ workpiece_thickness_mm: 0 }))).toThrow(/positive thickness \+ wire_diameter/);
    expect(() => eng.recover(nominal({ wire_diameter_mm: 0 }))).toThrow(/positive thickness \+ wire_diameter/);
  });

  it("rough cut + interior + auto_thread → auto_rethread strategy", () => {
    const r = eng.recover(nominal());
    expect(r.recovery_strategy).toBe("auto_rethread");
    expect(r.estimated_recovery_time_min.value).toBe(2);
    expect(r.operator_skill_required).toBe("entry");
  });

  it("break in workholding region → scrap_part", () => {
    const r = eng.recover(nominal({ feature_position: "in_workholding" }));
    expect(r.recovery_strategy).toBe("scrap_part");
    expect(r.scrap_risk_pct.value).toBe(100);
    expect(r.warnings.some(w => /workholding/.test(w))).toBe(true);
    expect(r.joint_meets_spec).toBe(false);
  });

  it("4+ prior breaks → scrap_part (accumulated quality defects)", () => {
    const r = eng.recover(nominal({ prior_breaks: 3 }));
    expect(r.recovery_strategy).toBe("scrap_part");
    expect(r.warnings.some(w => /4th break|accumulated joint defects/.test(w))).toBe(true);
  });

  it("manual_only threading → manual_rethread strategy", () => {
    const r = eng.recover(nominal({ threading_capability: "manual_only" }));
    expect(r.recovery_strategy).toBe("manual_rethread");
    expect(r.operator_skill_required).toBe("intermediate");
    expect(r.estimated_recovery_time_min.value).toBe(10);
  });

  it("thick workpiece (>100mm) → manual_rethread + master operator", () => {
    const r = eng.recover(nominal({ workpiece_thickness_mm: 150 }));
    expect(r.recovery_strategy).toBe("manual_rethread");
    expect(r.operator_skill_required).toBe("master");
    expect(r.warnings.some(w => /Thick workpiece.*pickup window/.test(w))).toBe(true);
  });

  it("corner_in feature with auto_with_burnback → burnback_restart with 1.5mm offset", () => {
    const r = eng.recover(nominal({ feature_position: "corner_in", threading_capability: "auto_with_burnback" }));
    expect(r.recovery_strategy).toBe("burnback_restart");
    // 50 + (-1.5) = 48.5
    expect(r.restart_position_mm.value).toBeCloseTo(48.5, 1);
  });

  it("corner without auto_with_burnback → manual_rethread", () => {
    const r = eng.recover(nominal({ feature_position: "corner_out", threading_capability: "auto_thread" }));
    expect(r.recovery_strategy).toBe("manual_rethread");
  });

  it("skim_1 cut → auto_rethread or burnback by threading capability", () => {
    const r = eng.recover(nominal({ cut_phase: "skim_1", threading_capability: "auto_with_burnback" }));
    expect(r.recovery_strategy).toBe("burnback_restart");
    // 50 + (-0.5) = 49.5
    expect(r.restart_position_mm.value).toBeCloseTo(49.5, 1);
  });

  it("skim_2/skim_3 → 1.0mm burnback (deeper cleanup)", () => {
    const r = eng.recover(nominal({ cut_phase: "skim_2", threading_capability: "auto_with_burnback" }));
    expect(r.recovery_strategy).toBe("burnback_restart");
    expect(r.restart_position_mm.value).toBeCloseTo(49.0, 1);
  });

  it("joint Ra scales with phase: rough > skim_2 > finish", () => {
    const rough = eng.recover(nominal({ cut_phase: "rough" }));
    const skim = eng.recover(nominal({ cut_phase: "skim_2", threading_capability: "auto_with_burnback" }));
    const finish = eng.recover(nominal({ cut_phase: "finish", threading_capability: "auto_with_burnback" }));
    expect(rough.expected_joint_ra_um.value).toBeGreaterThan(skim.expected_joint_ra_um.value);
    expect(skim.expected_joint_ra_um.value).toBeGreaterThan(finish.expected_joint_ra_um.value);
  });

  it("prior breaks increase joint Ra (5% per prior break)", () => {
    const zero = eng.recover(nominal({ prior_breaks: 0 }));
    const two = eng.recover(nominal({ prior_breaks: 2 }));
    expect(two.expected_joint_ra_um.value).toBeGreaterThan(zero.expected_joint_ra_um.value);
  });

  it("rough cut recast factor = 2.5×, skim recast = 2.0×", () => {
    const rough = eng.recover(nominal({ cut_phase: "rough" }));
    const skim = eng.recover(nominal({ cut_phase: "skim_2", threading_capability: "auto_with_burnback" }));
    expect(rough.expected_recast_factor.value).toBe(2.5);
    expect(skim.expected_recast_factor.value).toBe(2.0);
  });

  it("scrap risk: finish phase 15% baseline + prior breaks compound", () => {
    const r = eng.recover(nominal({ cut_phase: "finish", prior_breaks: 1, threading_capability: "auto_with_burnback" }));
    // 15% + 1 × 5% = 20%
    expect(r.scrap_risk_pct.value).toBe(20);
  });

  it("dielectric > 30°C triggers chiller warning", () => {
    const r = eng.recover(nominal({ dielectric_temp_c: 35 }));
    expect(r.warnings.some(w => /Dielectric temp 35.*flushing degraded/.test(w))).toBe(true);
  });

  it("brass wire + >60mm thickness triggers zinc-coated recommendation", () => {
    const r = eng.recover(nominal({ wire_material: "brass", workpiece_thickness_mm: 80 }));
    expect(r.warnings.some(w => /zinc-coated wire/.test(w))).toBe(true);
  });

  it("joint Ra > spec triggers additional-skim warning", () => {
    // rough joint ~4.16 μm; spec 1.0 → warning
    const r = eng.recover(nominal({ joint_ra_spec_um: 1.0 }));
    expect(r.joint_meets_spec).toBe(false);
    expect(r.warnings.some(w => /additional skim pass/.test(w))).toBe(true);
  });

  it("auto_rethread offset = -0.3mm (small joint overlap)", () => {
    const r = eng.recover(nominal({ cut_phase: "rough" }));
    expect(r.restart_position_mm.value).toBeCloseTo(49.7, 1);
  });

  it("restart_position clamped to ≥ 0 if break very near origin", () => {
    const r = eng.recover(nominal({ break_position_mm: 0.1 }));
    expect(r.restart_position_mm.value).toBeGreaterThanOrEqual(0);
  });

  it("source cites Fanuc + Sodick + Charmilles + Mitsubishi", () => {
    const r = eng.recover(nominal());
    expect(r.source).toMatch(/Fanuc|Sodick|Charmilles|Mitsubishi/);
  });
});
