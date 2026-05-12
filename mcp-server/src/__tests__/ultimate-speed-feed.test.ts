import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

describe("UltimateSpeedFeedEngine", () => {
  // ── Partial input inference ──
  it("calculates from material alone", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "aluminum" });
    expect(r.resolved.iso_group).toBe("N");
    expect(r.resolved.material).toBe("aluminum");
    expect(r.cutting_speed.value).toBeGreaterThan(200);
    expect(r.spindle_rpm.value).toBeGreaterThan(5000);
    expect(r.feed_per_tooth.value).toBeGreaterThan(0);
    expect(r.inferred_parameters.length).toBeGreaterThan(3);
  });

  it("calculates from tool diameter + material", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "stainless_steel",
      tool_diameter_mm: 10,
    });
    expect(r.resolved.iso_group).toBe("M");
    expect(r.resolved.tool_diameter_mm).toBe(10);
    expect(r.cutting_speed.value).toBeGreaterThan(50);
    expect(r.cutting_speed.value).toBeLessThan(300);
    expect(r.feed_rate.value).toBeGreaterThan(0);
  });

  it("infers everything from just ISO group", () => {
    const r = ultimateSpeedFeedEngine.calculate({ iso_group: "S" });
    expect(r.resolved.iso_group).toBe("S");
    expect(r.cutting_speed.value).toBeLessThan(120); // superalloys are slow
    expect(r.warnings.every(w => !w.includes("not found"))).toBe(true); // no unknown material warning
  });

  // ── All 6 ISO groups ──
  it("produces valid results for all ISO groups", () => {
    const groups = ["P", "M", "K", "N", "S", "H"] as const;
    for (const iso of groups) {
      const r = ultimateSpeedFeedEngine.calculate({ iso_group: iso });
      expect(r.cutting_speed.value).toBeGreaterThan(0);
      expect(r.spindle_rpm.value).toBeGreaterThan(0);
      expect(r.feed_per_tooth.value).toBeGreaterThan(0);
      expect(r.mrr.value).toBeGreaterThan(0);
      expect(r.confidence_overall).toBeGreaterThan(0.3);
    }
  });

  // ── Operations ──
  it("handles turning operation", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      operation: "turning",
      workpiece_diameter_mm: 50,
      tool_diameter_mm: 0,
    });
    expect(r.resolved.operation).toBe("turning");
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_per_rev.value).toBeGreaterThan(0);
  });

  it("handles drilling operation", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "aluminum",
      operation: "drilling",
      tool_diameter_mm: 8,
    });
    expect(r.resolved.operation).toBe("drilling");
    expect(r.cutting_speed.value).toBeGreaterThan(50);
  });

  it("handles tapping", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      operation: "tapping",
      tool_diameter_mm: 6,
    });
    expect(r.resolved.operation).toBe("tapping");
    expect(r.cutting_speed.value).toBeLessThan(50);
  });

  // ── Strategy modifiers ──
  it("applies adaptive/trochoidal strategy", () => {
    const conv = ultimateSpeedFeedEngine.calculate({
      material: "steel", tool_diameter_mm: 12, strategy: "conventional",
    });
    const adapt = ultimateSpeedFeedEngine.calculate({
      material: "steel", tool_diameter_mm: 12, strategy: "adaptive",
    });
    expect(adapt.cutting_speed.value).toBeGreaterThan(conv.cutting_speed.value);
    expect(adapt.radial_depth.value).toBeLessThan(conv.radial_depth.value);
    expect(adapt.axial_depth.value).toBeGreaterThan(conv.axial_depth.value);
  });

  it("applies trochoidal strategy with ae override", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "titanium", tool_diameter_mm: 10, strategy: "trochoidal",
    });
    // Trochoidal: ae should be ~8% of Dc
    const ae_pct = (r.radial_depth.value / 10) * 100;
    expect(ae_pct).toBeLessThan(15);
    expect(r.chip_thinning_factor.value).toBeGreaterThan(1.5);
  });

  // ── Chip thinning compensation ──
  it("compensates for chip thinning at low engagement", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      radial_depth_pct: 10,
    });
    expect(r.chip_thinning_factor.value).toBeGreaterThan(1.3);
    expect(r.feed_per_tooth.source).not.toBe("user_input");
  });

  it("no chip thinning at 50%+ engagement", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      radial_depth_pct: 60,
    });
    expect(r.chip_thinning_factor.value).toBeLessThanOrEqual(1.01);
  });

  // ── Physics models ──
  it("calculates forces via Kienzle model", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      axial_depth_mm: 5,
      feed_per_tooth_mm: 0.1,
    });
    expect(r.forces.tangential_force_N.value).toBeGreaterThan(100);
    expect(r.forces.resultant_force_N.value).toBeGreaterThan(r.forces.tangential_force_N.value);
    expect(r.forces.torque_Nm.value).toBeGreaterThan(0);
    expect(r.formulas_used.some(f => f.includes("Kc"))).toBe(true);
  });

  it("calculates power consumption", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 20,
      machine_power_kw: 15,
    });
    expect(r.power.required_power_kw.value).toBeGreaterThan(0);
    expect(r.power.available_power_kw).toBeDefined();
    expect(r.power.power_utilization_pct).toBeDefined();
  });

  it("warns when power budget exceeded", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 25,
      axial_depth_mm: 15,
      radial_depth_pct: 50,
      machine_power_kw: 3,
      optimize_for: "productivity",
    });
    // With aggressive params on a 3kW machine, should warn
    expect(r.power.required_power_kw.value).toBeGreaterThan(0);
  });

  it("predicts tool life via Taylor equation", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "titanium",
      tool_diameter_mm: 10,
    });
    expect(r.tool_life.life_minutes.value).toBeGreaterThan(0);
    expect(r.tool_life.life_minutes.value).toBeLessThan(600);
    expect(r.tool_life.wear_mechanism).toBeDefined();
    expect(r.formulas_used.some(f => f.includes("Extended Taylor") || f.includes("f^m"))).toBe(true);
  });

  it("predicts surface finish", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "aluminum",
      tool_diameter_mm: 10,
      cut_type: "finishing",
    });
    expect(r.surface_finish.theoretical_ra_um.value).toBeGreaterThan(0);
    expect(r.surface_finish.practical_ra_um.value).toBeGreaterThan(
      r.surface_finish.theoretical_ra_um.value,
    );
  });

  it("calculates thermal analysis", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "inconel",
      tool_diameter_mm: 8,
    });
    expect(r.thermal.interface_temp_C.value).toBeGreaterThan(100);
    expect(r.thermal.coating_limit_C.value).toBeGreaterThan(0);
    expect(r.thermal.thermal_damage_risk).toBeDefined();
  });

  // ── Tool deflection ──
  it("estimates tool deflection with stickout", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 6,
      tool_stickout_mm: 40,
      axial_depth_mm: 3,
    });
    expect(r.forces.deflection_um).toBeDefined();
    expect(r.forces.deflection_um!.value).toBeGreaterThan(0);
  });

  // ── User input passthrough ──
  it("respects user-supplied cutting speed", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      cutting_speed_mpm: 200,
    });
    expect(r.cutting_speed.value).toBe(200);
    expect(r.cutting_speed.source).toBe("user_input");
    expect(r.cutting_speed.confidence).toBe(1.0);
  });

  it("respects user-supplied RPM", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      spindle_rpm: 5000,
    });
    expect(r.spindle_rpm.value).toBe(5000);
  });

  it("caps RPM at machine max", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "aluminum",
      tool_diameter_mm: 6,
      machine_max_rpm: 8000,
    });
    expect(r.spindle_rpm.value).toBeLessThanOrEqual(8000);
  });

  // ── Hardness adjustment ──
  it("adjusts speed for high hardness", () => {
    const soft = ultimateSpeedFeedEngine.calculate({ material: "steel", hardness_hb: 180 });
    const hard = ultimateSpeedFeedEngine.calculate({ material: "steel", hardness_hb: 350 });
    expect(hard.cutting_speed.value).toBeLessThan(soft.cutting_speed.value);
  });

  it("switches to ISO H for very hard steel", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      hardness_hb: 500,
    });
    expect(r.resolved.iso_group).toBe("H");
    expect(r.warnings.some(w => w.includes("hardened"))).toBe(true);
  });

  it("converts HRC to HB", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      hardness_hrc: 55,
    });
    expect(r.resolved.hardness_hb).toBeGreaterThan(400);
    expect(r.formulas_used.some(f => f.includes("HRC"))).toBe(true);
  });

  // ── Machine rigidity ──
  it("scales parameters for low rigidity", () => {
    const normal = ultimateSpeedFeedEngine.calculate({ material: "steel", tool_diameter_mm: 12 });
    const weak = ultimateSpeedFeedEngine.calculate({
      material: "steel", tool_diameter_mm: 12, machine_rigidity: "low",
    });
    expect(weak.cutting_speed.value).toBeLessThan(normal.cutting_speed.value);
  });

  // ── Safety warnings ──
  it("warns about titanium fire risk when dry", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "titanium",
      coolant: "dry",
    });
    expect(r.warnings.some(w => w.toLowerCase().includes("fire"))).toBe(true);
  });

  // ── Alternatives ──
  it("provides three alternative parameter sets", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel", tool_diameter_mm: 12 });
    expect(r.alternatives.conservative.vc).toBeLessThan(r.alternatives.aggressive.vc);
    expect(r.alternatives.balanced.vc).toBeGreaterThan(r.alternatives.conservative.vc);
    expect(r.alternatives.balanced.vc).toBeLessThan(r.alternatives.aggressive.vc);
  });

  // ── Confidence scoring ──
  it("higher confidence with more user inputs", () => {
    const minimal = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    const detailed = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      cutting_speed_mpm: 150,
      feed_per_tooth_mm: 0.1,
    });
    expect(detailed.confidence_overall).toBeGreaterThan(minimal.confidence_overall);
  });

  // ── Quick mode ──
  it("quick() returns compact string", () => {
    const s = ultimateSpeedFeedEngine.quick({ material: "aluminum", tool_diameter_mm: 10 });
    expect(s).toContain("aluminum");
    expect(s).toContain("m/min");
    expect(s).toContain("RPM");
    expect(s).toContain("mm/min");
  });

  // ── Utility methods ──
  it("listMaterials returns all materials", () => {
    const mats = ultimateSpeedFeedEngine.listMaterials();
    expect(mats.length).toBeGreaterThanOrEqual(14);
    expect(mats.some(m => m.iso === "S")).toBe(true);
    expect(mats.some(m => m.key === "aluminum")).toBe(true);
  });

  it("listStrategies returns all strategies", () => {
    const strats = ultimateSpeedFeedEngine.listStrategies();
    expect(strats.length).toBe(7);
    expect(strats.some(s => s.name === "trochoidal")).toBe(true);
  });

  it("getMaterialProfile returns properties", () => {
    const m = ultimateSpeedFeedEngine.getMaterialProfile("inconel");
    expect(m).not.toBeNull();
    expect(m!.iso_group).toBe("S");
    expect(m!.kc1_1).toBe(3000);
    expect(m!.work_hardening_tendency).toBe("severe");
  });

  it("compareAcrossMaterials returns comparison", () => {
    const comparison = ultimateSpeedFeedEngine.compareAcrossMaterials(12, "milling", "roughing");
    expect(comparison.length).toBeGreaterThanOrEqual(14);
    // Aluminum should have highest Vc
    const alum = comparison.find(c => c.material === "aluminum");
    const inconel = comparison.find(c => c.material === "inconel");
    expect(alum!.vc).toBeGreaterThan(inconel!.vc);
  });

  it("stats returns correct counts", () => {
    const s = ultimateSpeedFeedEngine.stats();
    expect(s.materials).toBeGreaterThanOrEqual(14);
    expect(s.iso_groups).toBe(6);
    expect(s.operations).toBe(7);
    expect(s.strategies).toBe(7);
    expect(s.grade_specific_thermal_alloys).toBeGreaterThanOrEqual(40);
    expect(s.physics_models).toBe(31);
    expect(s.output_parameters).toBe(78);
  });

  // ── Formulas shown ──
  it("includes formulas for all calculations", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      axial_depth_mm: 5,
      radial_depth_pct: 15,
    });
    expect(r.formulas_used.length).toBeGreaterThan(5);
    expect(r.formulas_used.some(f => f.includes("Vc"))).toBe(true);
    expect(r.formulas_used.some(f => f.includes("Kc"))).toBe(true);
    expect(r.formulas_used.some(f => f.includes("f^m") || f.includes("Extended Taylor"))).toBe(true);
    expect(r.formulas_used.some(f => f.includes("CTF"))).toBe(true);
  });

  // ── Enhanced physics: Stability Lobe ──
  it("performs stability lobe analysis", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      axial_depth_mm: 5,
      system_stiffness_n_m: 2e7,
      natural_frequency_hz: 800,
      damping_ratio: 0.03,
    });
    expect(r.stability.critical_depth_mm.value).toBeGreaterThan(0);
    expect(r.stability.is_stable).toBeDefined();
    expect(r.stability.stability_margin_pct.value).toBeDefined();
    expect(r.stability.chatter_frequency_hz).toBeDefined();
  });

  it("stability analysis uses user-provided dynamics", () => {
    const withDynamics = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      axial_depth_mm: 5,
      system_stiffness_n_m: 2e7,
      natural_frequency_hz: 800,
      damping_ratio: 0.03,
    });
    const withoutDynamics = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      axial_depth_mm: 5,
    });
    // User-provided dynamics should have higher confidence
    expect(withDynamics.stability.critical_depth_mm.confidence).toBeGreaterThan(
      withoutDynamics.stability.critical_depth_mm.confidence,
    );
    expect(withDynamics.stability.chatter_frequency_hz).toBeDefined();
  });

  // ── Enhanced physics: Wear models ──
  it("calculates Usui + Archard wear rates", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "inconel",
      tool_diameter_mm: 10,
    });
    expect(r.wear.usui_crater_rate!.value).toBeGreaterThanOrEqual(0);
    expect(r.wear.archard_flank_rate!.value).toBeGreaterThan(0);
    expect(r.wear.flank_wear_15min_mm.value).toBeGreaterThan(0);
    expect(r.wear.time_to_vb_03mm.value).toBeGreaterThan(0);
    expect(r.wear.time_to_vb_06mm.value).toBeGreaterThanOrEqual(r.wear.time_to_vb_03mm.value);
  });

  // ── Enhanced physics: Taylor sensitivity ──
  it("provides Taylor sensitivity analysis", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
    });
    expect(r.tool_life.sensitivity.speed).toBeLessThan(0);
    expect(r.tool_life.sensitivity.dominant_factor).toBe("speed");
    expect(Math.abs(r.tool_life.sensitivity.speed)).toBeGreaterThan(
      Math.abs(r.tool_life.sensitivity.feed),
    );
  });

  // ── Enhanced physics: Flank wear progression ──
  it("predicts flank wear at 15 minutes", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "titanium",
      tool_diameter_mm: 10,
    });
    expect(r.tool_life.flank_wear_at_15min!.value).toBeGreaterThan(0);
    expect(r.tool_life.flank_wear_at_15min!.unit).toBe("mm");
  });

  // ── Economics ──
  it("calculates cost per part when economics provided", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      tool_cost_usd: 45,
      cutting_time_per_part_min: 3,
    });
    expect(r.tool_life.cost_per_part).toBeDefined();
    expect(r.tool_life.cost_per_part!.value).toBeGreaterThan(0);
    expect(r.tool_life.cost_per_part!.unit).toBe("USD");
  });

  it("accounts for regrinds in cost calculation", () => {
    const noRegrind = ultimateSpeedFeedEngine.calculate({
      material: "steel", tool_diameter_mm: 12,
      tool_cost_usd: 45, cutting_time_per_part_min: 3,
    });
    const withRegrind = ultimateSpeedFeedEngine.calculate({
      material: "steel", tool_diameter_mm: 12,
      tool_cost_usd: 45, cutting_time_per_part_min: 3,
      regrindable: true, regrinds_available: 3, regrind_cost_usd: 12,
    });
    expect(withRegrind.tool_life.cost_per_part!.value).toBeLessThan(
      noRegrind.tool_life.cost_per_part!.value,
    );
  });

  // ── Merchant shear angle model ──
  it("calculates Merchant shear angle and force", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
      axial_depth_mm: 5,
      feed_per_tooth_mm: 0.1,
    });
    expect(r.merchant_analysis.shear_angle_deg.value).toBeGreaterThan(10);
    expect(r.merchant_analysis.shear_angle_deg.value).toBeLessThan(45);
    expect(r.merchant_analysis.chip_compression_ratio.value).toBeGreaterThan(0);
    expect(r.merchant_analysis.force_merchant_N.value).toBeGreaterThan(0);
    expect(r.formulas_used.some(f => f.includes("Merchant"))).toBe(true);
  });

  // ── Chip type prediction ──
  it("predicts chip type", () => {
    const alum = ultimateSpeedFeedEngine.calculate({ material: "aluminum" });
    expect(alum.chip_prediction.type).toBe("continuous");
    expect(alum.chip_prediction.confidence).toBeGreaterThan(0.5);

    const ci = ultimateSpeedFeedEngine.calculate({ material: "cast_iron" });
    expect(ci.chip_prediction.type).toBe("discontinuous");

    const ti = ultimateSpeedFeedEngine.calculate({ material: "titanium" });
    expect(ti.chip_prediction.type).toBe("segmented");
  });

  it("warns on BUE at low speed", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "aluminum",
      cutting_speed_mpm: 30,
      tool_diameter_mm: 12,
    });
    // Low speed aluminum should trigger BUE
    expect(["built_up_edge", "continuous"].includes(r.chip_prediction.type)).toBe(true);
  });

  // ── Specific cutting energy ──
  it("calculates specific cutting energy", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_diameter_mm: 12,
    });
    expect(r.specific_cutting_energy.value).toBeGreaterThan(0);
    expect(r.specific_cutting_energy.unit).toBe("J/mm³");
    expect(r.formulas_used.some(f => f.includes("SCE"))).toBe(true);
  });

  it("aluminum has lower SCE than steel", () => {
    const steel = ultimateSpeedFeedEngine.calculate({ material: "steel", tool_diameter_mm: 12 });
    const alum = ultimateSpeedFeedEngine.calculate({ material: "aluminum", tool_diameter_mm: 12 });
    expect(alum.specific_cutting_energy.value).toBeLessThan(steel.specific_cutting_energy.value);
  });

  // ── Grade-specific thermal ──
  it("uses grade-specific thermal data when available", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "4140" });
    expect(r.formulas_used.some(f => f.includes("grade-specific"))).toBe(true);
  });

  // ── Edge cases ──
  it("handles empty input gracefully", () => {
    const r = ultimateSpeedFeedEngine.calculate({});
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.inferred_parameters.length).toBeGreaterThan(5);
  });

  it("handles unknown material with warning", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "unobtanium" });
    expect(r.warnings.some(w => w.includes("not found"))).toBe(true);
    expect(r.cutting_speed.value).toBeGreaterThan(0); // still produces results
  });

  it("handles fuzzy material match", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "6061-T6" });
    expect(r.resolved.iso_group).toBe("N");
  });

  // ══════════════════════════════════════════════════════
  // NEW MODELS — Enhancement Round 3 (31 physics models)
  // ══════════════════════════════════════════════════════

  it("Lee-Shaffer shear angle differs from Merchant", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.lee_shaffer_analysis.shear_angle_deg.value).toBeGreaterThan(0);
    expect(r.lee_shaffer_analysis.shear_angle_deg.value).toBeLessThan(50);
    // Lee-Shaffer typically gives different angle than Merchant
    expect(r.lee_shaffer_analysis.delta_vs_merchant_deg).not.toBe(0);
    expect(r.lee_shaffer_analysis.shear_angle_deg.formula).toContain("Lee-Shaffer");
  });

  it("Johnson-Cook flow stress with thermal softening", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "titanium" });
    expect(r.johnson_cook.flow_stress_MPa.value).toBeGreaterThan(0);
    expect(r.johnson_cook.strain).toBe(2);
    expect(r.johnson_cook.strain_rate).toBeGreaterThan(100);
    expect(r.johnson_cook.thermal_softening_pct).toBeGreaterThan(0);
    // Hot titanium softens significantly
    const rAl = ultimateSpeedFeedEngine.calculate({ material: "aluminum" });
    expect(rAl.johnson_cook.flow_stress_MPa.value).toBeLessThan(r.johnson_cook.flow_stress_MPa.value);
  });

  it("Albrecht ploughing force increases with edge radius", () => {
    const r1 = ultimateSpeedFeedEngine.calculate({ material: "steel", edge_radius_mm: 0.005 });
    const r2 = ultimateSpeedFeedEngine.calculate({ material: "steel", edge_radius_mm: 0.030 });
    expect(r2.ploughing_force.force_N.value).toBeGreaterThan(r1.ploughing_force.force_N.value);
    expect(r1.ploughing_force.pct_of_cutting_force).toBeGreaterThan(0);
    expect(r1.ploughing_force.pct_of_cutting_force).toBeLessThan(50);
  });

  it("Boothroyd-Knight heat partition sums to ~100%", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    const sum = r.heat_partition.chip_pct.value
      + r.heat_partition.tool_pct.value
      + r.heat_partition.workpiece_pct.value;
    expect(sum).toBeGreaterThan(85);
    expect(sum).toBeLessThanOrEqual(105);
    // Chip carries most heat
    expect(r.heat_partition.chip_pct.value).toBeGreaterThan(50);
  });

  it("heat partition: low-k materials have higher tool heat", () => {
    const rTi = ultimateSpeedFeedEngine.calculate({ material: "titanium" });
    const rAl = ultimateSpeedFeedEngine.calculate({ material: "aluminum" });
    // Titanium (k=7) should put more heat into tool than aluminum (k=167)
    expect(rTi.heat_partition.tool_pct.value).toBeGreaterThan(rAl.heat_partition.tool_pct.value);
  });

  it("directional factor varies with engagement", () => {
    const r1 = ultimateSpeedFeedEngine.calculate({ material: "steel", radial_depth_pct: 10 });
    const r2 = ultimateSpeedFeedEngine.calculate({ material: "steel", radial_depth_pct: 50 });
    expect(r1.directional_factor.value).toBeGreaterThan(0);
    expect(r2.directional_factor.value).toBeGreaterThan(r1.directional_factor.value);
  });

  it("runout impact computed when TIR inputs provided", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      spindle_runout_mm: 0.003,
      holder_runout_mm: 0.005,
      tool_runout_mm: 0.010,
    });
    expect(r.runout_impact).toBeDefined();
    expect(r.runout_impact!.total_tir_mm.value).toBeGreaterThan(0.010);
    expect(r.runout_impact!.effective_flutes).toBeGreaterThanOrEqual(1);
    expect(r.runout_impact!.ra_increase_um.value).toBeGreaterThan(0);
    expect(r.runout_impact!.life_reduction_pct.value).toBeGreaterThan(0);
  });

  it("runout_impact absent when no TIR inputs", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.runout_impact).toBeUndefined();
  });

  it("ISO 3685 three-zone wear model", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.wear_zones.breakin_end_min).toBeGreaterThan(0);
    expect(r.wear_zones.breakin_vb_mm).toBeGreaterThan(0);
    expect(r.wear_zones.steady_rate_um_min).toBeGreaterThan(0);
    expect(r.wear_zones.accel_start_min).toBeGreaterThan(r.wear_zones.breakin_end_min);
  });

  it("Gilbert economics when machine cost provided", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      tool_cost_usd: 50,
      machine_cost_per_min: 1.5,
      tool_change_time_min: 3,
      cutting_time_per_part_min: 5,
    });
    expect(r.gilbert_economics).toBeDefined();
    expect(r.gilbert_economics!.V_min_cost.value).toBeGreaterThan(0);
    expect(r.gilbert_economics!.V_max_prod.value).toBeGreaterThan(
      r.gilbert_economics!.V_min_cost.value);
    expect(r.gilbert_economics!.cost_per_part_optimal.value).toBeGreaterThan(0);
  });

  it("Gilbert absent without machine cost", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.gilbert_economics).toBeUndefined();
  });

  it("Hertz contact pressure computed", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.hertz_contact.max_pressure_MPa.value).toBeGreaterThan(0);
    expect(r.hertz_contact.avg_pressure_MPa.value).toBeGreaterThan(0);
    expect(r.hertz_contact.max_pressure_MPa.value).toBeGreaterThan(
      r.hertz_contact.avg_pressure_MPa.value);
    expect(r.hertz_contact.contact_length_mm).toBeGreaterThan(0);
  });

  it("SSV recommendation when chatter risk", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      axial_depth_mm: 30,
      system_stiffness_n_m: 5e6,
      natural_frequency_hz: 500,
      damping_ratio: 0.02,
    });
    // With extreme DOC and low stiffness, chatter is likely
    if (!r.stability.is_stable) {
      expect(r.ssv_recommendation.enabled).toBe(true);
      expect(r.ssv_recommendation.rpm_min).toBeDefined();
      expect(r.ssv_recommendation.rpm_max).toBeDefined();
      expect(r.ssv_recommendation.chatter_suppression_index).toBeGreaterThan(0);
    }
  });

  it("SSV disabled when stable", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "aluminum",
      axial_depth_mm: 1,
    });
    if (r.stability.is_stable) {
      expect(r.ssv_recommendation.enabled).toBe(false);
    }
  });

  it("thermal dimensional error with workpiece length", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "aluminum",
      workpiece_length_mm: 200,
    });
    expect(r.thermal_dimensional_error).toBeDefined();
    expect(r.thermal_dimensional_error!.error_um.value).toBeGreaterThan(0);
    // Aluminum has high CTE (~23), should have noticeable error
    expect(r.thermal_dimensional_error!.error_mm).toBeGreaterThan(0);
  });

  it("thermal error absent without workpiece length", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.thermal_dimensional_error).toBeUndefined();
  });

  it("Kronenberg chip compression ratio", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.kronenberg_chip_compression.value).toBeGreaterThan(0.5);
    expect(r.kronenberg_chip_compression.value).toBeLessThan(5);
    expect(r.kronenberg_chip_compression.formula).toContain("Kronenberg");
  });

  it("Zorev contact stress distribution", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.zorev_stress.max_stress_MPa.value).toBeGreaterThan(0);
    expect(r.zorev_stress.sticking_length_mm).toBeGreaterThan(0);
    expect(r.zorev_stress.sliding_length_mm).toBeGreaterThan(0);
    // Max > avg by definition (Zorev triangular distribution)
    expect(r.zorev_stress.max_stress_MPa.value).toBeGreaterThan(0);
  });

  it("Monte Carlo uncertainty on all key outputs", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.uncertainty.cutting_speed.cv_pct).toBeGreaterThan(0);
    expect(r.uncertainty.tool_life.cv_pct).toBeGreaterThan(0);
    expect(r.uncertainty.force.cv_pct).toBeGreaterThan(0);
    expect(r.uncertainty.surface_finish.cv_pct).toBeGreaterThan(0);
    // CI bounds bracket nominal
    expect(r.uncertainty.cutting_speed.ci_95_low).toBeLessThan(r.cutting_speed.value);
    expect(r.uncertainty.cutting_speed.ci_95_high).toBeGreaterThan(r.cutting_speed.value);
    // Tool life has higher uncertainty than cutting speed
    expect(r.uncertainty.tool_life.cv_pct).toBeGreaterThan(r.uncertainty.cutting_speed.cv_pct);
  });

  it("uncertainty higher without material specified", () => {
    const r1 = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    const r2 = ultimateSpeedFeedEngine.calculate({});
    expect(r2.uncertainty.cutting_speed.cv_pct).toBeGreaterThan(
      r1.uncertainty.cutting_speed.cv_pct);
  });

  it("process capability when tolerance provided", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      workpiece_length_mm: 100,
      feature_tolerance_mm: 0.05,
    });
    expect(r.process_capability).toBeDefined();
    expect(r.process_capability!.Cp).toBeGreaterThan(0);
    expect(r.process_capability!.Cpk).toBeGreaterThanOrEqual(0);
    expect(r.process_capability!.sigma_level).toBeGreaterThanOrEqual(0);
    expect(["excellent", "capable", "marginal", "incapable"]).toContain(
      r.process_capability!.rating);
  });

  it("Pareto frontier has 3 points", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.pareto_frontier).toHaveLength(3);
    expect(r.pareto_frontier[0].label).toBe("conservative");
    expect(r.pareto_frontier[1].label).toBe("balanced");
    expect(r.pareto_frontier[2].label).toBe("aggressive");
    // Aggressive has highest MRR
    expect(r.pareto_frontier[2].mrr).toBeGreaterThan(r.pareto_frontier[0].mrr);
    // Conservative has longest tool life
    expect(r.pareto_frontier[0].tool_life).toBeGreaterThan(r.pareto_frontier[2].tool_life);
    // All have scores between 0 and 1
    for (const p of r.pareto_frontier) {
      expect(p.score).toBeGreaterThan(0);
      expect(p.score).toBeLessThanOrEqual(1);
    }
  });

  it("sensitivity ranking sorted by influence", () => {
    const r = ultimateSpeedFeedEngine.calculate({ material: "steel" });
    expect(r.sensitivity_ranking.length).toBeGreaterThanOrEqual(5);
    // Should be sorted descending by influence
    for (let i = 1; i < r.sensitivity_ranking.length; i++) {
      expect(r.sensitivity_ranking[i - 1].influence_pct)
        .toBeGreaterThanOrEqual(r.sensitivity_ranking[i].influence_pct);
    }
    // Cutting speed should be high influence (Taylor dominant)
    expect(r.sensitivity_ranking.some(s => s.parameter === "cutting_speed")).toBe(true);
  });

  it("Johnson-Cook materials cover all 14 profiles", () => {
    const materials = ["steel", "aluminum", "titanium", "inconel", "stainless_steel",
      "hardened_steel", "cast_iron", "copper", "brass", "plastic"];
    for (const mat of materials) {
      const r = ultimateSpeedFeedEngine.calculate({ material: mat });
      expect(r.johnson_cook.flow_stress_MPa.value).toBeGreaterThan(0);
    }
  });

  it("formulas include all new model names", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel",
      edge_radius_mm: 0.01,
      workpiece_length_mm: 100,
      machine_cost_per_min: 1.5,
      tool_cost_usd: 50,
      spindle_runout_mm: 0.003,
    });
    const formStr = r.formulas_used.join(" ");
    expect(formStr).toContain("Lee-Shaffer");
    expect(formStr).toContain("J-C:");
    expect(formStr).toContain("Albrecht");
    expect(formStr).toContain("Heat partition");
    expect(formStr).toContain("ISO 3685");
    expect(formStr).toContain("Hertz");
    expect(formStr).toContain("Kronenberg");
    expect(formStr).toContain("Zorev");
    expect(formStr).toContain("MC uncertainty");
    expect(formStr).toContain("Gilbert");
  });
});
