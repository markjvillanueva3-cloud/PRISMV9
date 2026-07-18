/**
 * Forge Engines Round 3 — TurningForce, TappingTorque, CuttingPowerBudget
 */
import { describe, it, expect } from "vitest";
import { TurningForceEngine } from "../engines/TurningForceEngine.js";
import { TappingTorqueEngine } from "../engines/TappingTorqueEngine.js";
import { CuttingPowerBudgetEngine } from "../engines/CuttingPowerBudgetEngine.js";

// ─── TurningForceEngine ─────────────────────────────────────────

describe("TurningForceEngine", () => {
  const engine = new TurningForceEngine();

  it("returns AtomicValue format for all force outputs", () => {
    const r = engine.calculate({ cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2 });
    for (const key of ["tangential_force_Fc_N", "feed_force_Ff_N", "radial_force_Fp_N", "resultant_force_N", "cutting_power_kW", "spindle_torque_Nm", "specific_cutting_force_N_mm2", "chip_thickness_mm", "chip_width_mm"] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("calculates Fc in expected range for steel turning", () => {
    const r = engine.calculate({ cutting_speed_m_min: 200, feed_mm_rev: 0.25, depth_of_cut_mm: 2, iso_group: "P" });
    // Fc ~ kc * h * b, kc ~ 1800*h^-0.25 ~ 2700, h ~ 0.25*sin(95°) ~ 0.249, b ~ 2/sin(95°) ~ 2.008
    // Fc ~ 2700 * 0.249 * 2.008 ~ 1350 N (range 800-2500 reasonable)
    expect(r.tangential_force_Fc_N.value).toBeGreaterThan(500);
    expect(r.tangential_force_Fc_N.value).toBeLessThan(3000);
  });

  it("feed force is less than tangential force", () => {
    const r = engine.calculate({ cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2 });
    expect(r.feed_force_Ff_N.value).toBeLessThan(r.tangential_force_Fc_N.value);
  });

  it("radial force is less than feed force for steel", () => {
    const r = engine.calculate({ cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2, iso_group: "P" });
    expect(r.radial_force_Fp_N.value).toBeLessThan(r.feed_force_Ff_N.value);
  });

  it("aluminum requires less cutting force than steel", () => {
    const base = { cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2 };
    const steel = engine.calculate({ ...base, iso_group: "P" });
    const alu = engine.calculate({ ...base, iso_group: "N" });
    expect(alu.tangential_force_Fc_N.value).toBeLessThan(steel.tangential_force_Fc_N.value);
  });

  it("parting operation increases kc by 25%", () => {
    const base = { cutting_speed_m_min: 100, feed_mm_rev: 0.1, depth_of_cut_mm: 3 };
    const longitudinal = engine.calculate({ ...base, operation: "longitudinal" as const });
    const parting = engine.calculate({ ...base, operation: "parting" as const });
    // Parting Fc should be ~25% higher
    expect(parting.tangential_force_Fc_N.value).toBeGreaterThan(longitudinal.tangential_force_Fc_N.value * 1.2);
  });

  it("computes power and torque when workpiece diameter given", () => {
    const r = engine.calculate({ cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2, workpiece_diameter_mm: 50 });
    expect(r.cutting_power_kW.value).toBeGreaterThan(0);
    expect(r.spindle_torque_Nm.value).toBeGreaterThan(0);
  });

  it("computes power utilization when machine power provided", () => {
    const r = engine.calculate({ cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2, workpiece_diameter_mm: 50, spindle_power_kW: 15 });
    expect(r.power_utilization_pct).toBeGreaterThan(0);
    expect(r.power_utilization_pct).toBeLessThan(100);
  });

  it("warns on thin chip thickness", () => {
    const r = engine.calculate({ cutting_speed_m_min: 200, feed_mm_rev: 0.02, depth_of_cut_mm: 0.5 });
    expect(r.recommendations.some(s => s.includes("thin"))).toBe(true);
  });

  it("warns on superalloy at high speed", () => {
    const r = engine.calculate({ cutting_speed_m_min: 80, feed_mm_rev: 0.15, depth_of_cut_mm: 1, iso_group: "S" });
    expect(r.recommendations.some(s => s.includes("Superalloy") || s.includes("ceramic"))).toBe(true);
  });
});

// ─── TappingTorqueEngine ────────────────────────────────────────

describe("TappingTorqueEngine", () => {
  const engine = new TappingTorqueEngine();

  it("returns AtomicValue format for all outputs", () => {
    const r = engine.calculate({ thread_major_diameter_mm: 10, pitch_mm: 1.5 });
    for (const key of ["cutting_torque_Nm", "axial_thrust_N", "tapping_power_kW", "torque_margin_pct", "max_safe_rpm"] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("calculates torque in reasonable range for M10x1.5 steel", () => {
    const r = engine.calculate({ thread_major_diameter_mm: 10, pitch_mm: 1.5, workpiece_iso_group: "P" });
    // M10 tapping torque typically 2-15 Nm
    expect(r.cutting_torque_Nm.value).toBeGreaterThan(0.5);
    expect(r.cutting_torque_Nm.value).toBeLessThan(30);
  });

  it("form tap requires more torque than cut tap", () => {
    const base = { thread_major_diameter_mm: 10, pitch_mm: 1.5 };
    const cut = engine.calculate({ ...base, tap_type: "cut_spiral_point" as const });
    const form = engine.calculate({ ...base, tap_type: "form" as const });
    // Form tap has FORM_TAP_MULTIPLIER=1.65 but also different chip geometry (no flutes),
    // so kc is lower. Net effect: form tap torque is higher but not by full 1.65×
    expect(form.cutting_torque_Nm.value).toBeGreaterThan(cut.cutting_torque_Nm.value * 1.1);
  });

  it("blind hole increases torque vs through hole", () => {
    const base = { thread_major_diameter_mm: 10, pitch_mm: 1.5 };
    const through = engine.calculate({ ...base, hole_type: "through" as const });
    const blind = engine.calculate({ ...base, hole_type: "blind" as const });
    expect(blind.cutting_torque_Nm.value).toBeGreaterThan(through.cutting_torque_Nm.value);
  });

  it("warns about spiral point in blind hole", () => {
    const r = engine.calculate({ thread_major_diameter_mm: 10, pitch_mm: 1.5, tap_type: "cut_spiral_point", hole_type: "blind" });
    expect(r.recommendations.some(s => s.includes("Spiral point") || s.includes("blind"))).toBe(true);
  });

  it("breakage risk increases without coolant", () => {
    const base = { thread_major_diameter_mm: 10, pitch_mm: 1.5 };
    const wet = engine.calculate({ ...base, coolant_active: true });
    const dry = engine.calculate({ ...base, coolant_active: false });
    expect(dry.breakage_risk).toBeGreaterThan(wet.breakage_risk);
  });

  it("detects low torque margin when machine torque is tight", () => {
    const r = engine.calculate({
      thread_major_diameter_mm: 16, pitch_mm: 2,
      spindle_max_torque_Nm: 5, // deliberately low
      workpiece_iso_group: "M",
    });
    expect(r.torque_margin_pct.value).toBeLessThan(50);
  });

  it("calculates max safe RPM from ISO speed limits", () => {
    const r = engine.calculate({ thread_major_diameter_mm: 10, pitch_mm: 1.5, workpiece_iso_group: "N" });
    // Aluminum max Vc=40 m/min, M10: RPM = 40*1000/(π*10) ≈ 1273
    expect(r.max_safe_rpm.value).toBeGreaterThan(1000);
    expect(r.max_safe_rpm.value).toBeLessThan(2000);
  });

  it("hardened steel increases torque", () => {
    const base = { thread_major_diameter_mm: 10, pitch_mm: 1.5 };
    const normal = engine.calculate({ ...base });
    const hard = engine.calculate({ ...base, workpiece_hardness_hrc: 50 });
    expect(hard.cutting_torque_Nm.value).toBeGreaterThan(normal.cutting_torque_Nm.value);
  });

  it("computes axial thrust from torque and pitch", () => {
    const r = engine.calculate({ thread_major_diameter_mm: 10, pitch_mm: 1.5 });
    expect(r.axial_thrust_N.value).toBeGreaterThan(0);
    expect(r.axial_thrust_N.unit).toBe("N");
  });
});

// ─── CuttingPowerBudgetEngine ───────────────────────────────────

describe("CuttingPowerBudgetEngine", () => {
  const engine = new CuttingPowerBudgetEngine();

  it("returns AtomicValue format for all power outputs", () => {
    const r = engine.calculate({ machine_power_kW: 15, cutting_speed_m_min: 200, depth_of_cut_mm: 2, tool_diameter_mm: 20 });
    for (const key of ["required_power_kW", "available_power_kW", "required_torque_Nm", "available_torque_Nm", "power_utilization_pct", "torque_utilization_pct", "max_feed_at_limit", "max_mrr_cm3_min"] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("power utilization increases with deeper cuts", () => {
    const base = { machine_power_kW: 15, cutting_speed_m_min: 200, tool_diameter_mm: 20, feed_mm_tooth: 0.1, width_of_cut_mm: 10 };
    const shallow = engine.calculate({ ...base, depth_of_cut_mm: 1 });
    const deep = engine.calculate({ ...base, depth_of_cut_mm: 4 });
    expect(deep.power_utilization_pct.value).toBeGreaterThan(shallow.power_utilization_pct.value);
  });

  it("is_safe when utilization below 95%", () => {
    const r = engine.calculate({ machine_power_kW: 30, cutting_speed_m_min: 100, depth_of_cut_mm: 0.5, tool_diameter_mm: 20, feed_mm_tooth: 0.05 });
    expect(r.is_safe).toBe(true);
    expect(r.power_utilization_pct.value).toBeLessThan(95);
  });

  it("detects overload with small machine and aggressive cut", () => {
    const r = engine.calculate({
      machine_power_kW: 3,
      cutting_speed_m_min: 200,
      depth_of_cut_mm: 5,
      tool_diameter_mm: 20,
      feed_mm_tooth: 0.15,
      width_of_cut_mm: 20,
      iso_group: "P",
    });
    expect(r.power_utilization_pct.value).toBeGreaterThan(50);
  });

  it("inverse solver returns valid max feed", () => {
    const r = engine.calculate({ machine_power_kW: 15, cutting_speed_m_min: 200, depth_of_cut_mm: 2, tool_diameter_mm: 20, width_of_cut_mm: 10 });
    expect(r.max_feed_at_limit.value).toBeGreaterThan(0);
    expect(r.max_feed_at_limit.unit).toBe("mm/rev");
  });

  it("computes spindle RPM from tool diameter and cutting speed", () => {
    const r = engine.calculate({ machine_power_kW: 15, cutting_speed_m_min: 200, depth_of_cut_mm: 2, tool_diameter_mm: 20 });
    // RPM = 200*1000/(π*20) ≈ 3183
    expect(r.spindle_rpm).toBeGreaterThan(3000);
    expect(r.spindle_rpm).toBeLessThan(3400);
  });

  it("clamps RPM to machine max", () => {
    const r = engine.calculate({ machine_power_kW: 15, cutting_speed_m_min: 500, depth_of_cut_mm: 1, tool_diameter_mm: 5, machine_max_rpm: 8000 });
    expect(r.spindle_rpm).toBeLessThanOrEqual(8000);
  });

  it("torque-speed curve: more torque at low RPM", () => {
    const base = { machine_power_kW: 15, depth_of_cut_mm: 2, tool_diameter_mm: 50, machine_base_rpm: 2000 };
    const lowSpeed = engine.calculate({ ...base, cutting_speed_m_min: 30 }); // ~191 RPM, below base
    const highSpeed = engine.calculate({ ...base, cutting_speed_m_min: 300 }); // ~1910 RPM, near base
    expect(lowSpeed.available_torque_Nm.value).toBeGreaterThanOrEqual(highSpeed.available_torque_Nm.value);
  });

  it("aluminum requires less power than steel", () => {
    const base = { machine_power_kW: 15, cutting_speed_m_min: 200, depth_of_cut_mm: 2, tool_diameter_mm: 20, feed_mm_tooth: 0.1, width_of_cut_mm: 10 };
    const steel = engine.calculate({ ...base, iso_group: "P" });
    const alu = engine.calculate({ ...base, iso_group: "N" });
    expect(alu.required_power_kW.value).toBeLessThan(steel.required_power_kW.value);
  });

  it("max MRR is positive and reasonable", () => {
    const r = engine.calculate({ machine_power_kW: 15, cutting_speed_m_min: 200, depth_of_cut_mm: 2, tool_diameter_mm: 20, width_of_cut_mm: 10 });
    expect(r.max_mrr_cm3_min.value).toBeGreaterThan(0);
    expect(r.max_mrr_cm3_min.value).toBeLessThan(5000);
  });

  it("turning mode uses workpiece diameter for RPM", () => {
    const r = engine.calculate({ machine_power_kW: 15, cutting_speed_m_min: 200, depth_of_cut_mm: 2, workpiece_diameter_mm: 50, feed_mm_rev: 0.2 });
    // RPM = 200*1000/(π*50) ≈ 1273
    expect(r.spindle_rpm).toBeGreaterThan(1200);
    expect(r.spindle_rpm).toBeLessThan(1350);
  });
});
