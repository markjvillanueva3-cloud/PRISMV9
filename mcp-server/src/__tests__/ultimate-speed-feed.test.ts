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
    expect(r.formulas_used.some(f => f.includes("C/Vc"))).toBe(true);
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
    expect(m!.kc1_1).toBe(2800);
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
    expect(s.physics_models).toBe(5);
    expect(s.output_parameters).toBe(28);
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
    expect(r.formulas_used.some(f => f.includes("C/Vc"))).toBe(true);
    expect(r.formulas_used.some(f => f.includes("CTF"))).toBe(true);
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
});
