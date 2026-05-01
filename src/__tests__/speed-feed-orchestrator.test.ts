/**
 * SpeedFeedOrchestratorEngine — Exhaustive Tests
 */
import { describe, it, expect } from "vitest";

describe("SpeedFeedOrchestratorEngine", () => {
  it("minimal input: material + diameter → valid S/F", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "steel", tool_diameter_mm: 12 });
    const v = r.value;
    expect(v.cutting_speed_mpm).toBeGreaterThan(0);
    expect(v.spindle_rpm).toBeGreaterThan(0);
    expect(v.feed_per_tooth_mm).toBeGreaterThan(0);
    expect(v.feed_rate_mmmin).toBeGreaterThan(0);
    expect(v.overall_confidence).toBeLessThan(0.7);
  });

  it("just material → low confidence", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "titanium" });
    expect(r.value.cutting_speed_mpm).toBeGreaterThan(0);
    expect(r.value.overall_confidence).toBeLessThan(0.5);
  });

  it("full input → higher confidence", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const baseline = eng.compute({ material: "Ti-6Al-4V", tool_diameter_mm: 12 });
    const r = eng.compute({
      material: "Ti-6Al-4V", tool_diameter_mm: 12, flutes: 4,
      tool_material: "carbide", tool_coating: "TiAlN",
      corner_radius_mm: 0.5, tool_stickout_mm: 40,
      operation: "milling", cut_type: "roughing", strategy: "adaptive",
      machine_power_kw: 22, machine_max_rpm: 12000,
      holder_type: "shrink_fit", coolant_type: "flood",
      workholding_type: "vise",
    });
    const v = r.value;
    expect(v.cutting_speed_mpm).toBeGreaterThan(0);
    expect(v.overall_confidence).toBeGreaterThan(baseline.value.overall_confidence);
    expect(v.safety_checks.length).toBeGreaterThan(0);
  });

  it("aluminum gets high Vc", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "aluminum", tool_diameter_mm: 10 });
    expect(r.value.cutting_speed_mpm).toBeGreaterThan(100);
  });

  it("tool steel stays slower than 1045 steel", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const toolSteel = eng.compute({
      material: "D2 tool steel",
      tool_diameter_mm: 10,
      flutes: 4,
      operation: "milling",
    });
    const plainSteel = eng.compute({
      material: "steel 1045",
      tool_diameter_mm: 10,
      flutes: 4,
      operation: "milling",
    });
    expect(toolSteel.value.cutting_speed_mpm).toBeGreaterThan(0);
    expect(toolSteel.value.cutting_speed_mpm).toBeLessThan(plainSteel.value.cutting_speed_mpm);
    expect(toolSteel.value.playbook_warnings.length).toBeGreaterThan(0);
  });

  it("shrink fit has lower TIR than ER collet", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const s = eng.compute({ material: "steel", tool_diameter_mm: 10, holder_type: "shrink_fit" });
    const e = eng.compute({ material: "steel", tool_diameter_mm: 10, holder_type: "ER_collet" });
    expect(s.value.resolved_holder.tir_mm.value)
      .toBeLessThan(e.value.resolved_holder.tir_mm.value);
  });

  it("cryogenic coolant boosts speed vs dry", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const dry = eng.compute({ material: "Ti-6Al-4V", tool_diameter_mm: 12, coolant_type: "dry" });
    const cryo = eng.compute({ material: "Ti-6Al-4V", tool_diameter_mm: 12, coolant_type: "cryogenic" });
    expect(cryo.value.cutting_speed_mpm).toBeGreaterThan(dry.value.cutting_speed_mpm);
  });

  it("adaptive strategy boosts speed vs conventional", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const conv = eng.compute({ material: "steel", tool_diameter_mm: 12, strategy: "conventional" });
    const adapt = eng.compute({ material: "steel", tool_diameter_mm: 12, strategy: "adaptive" });
    expect(adapt.value.cutting_speed_mpm).toBeGreaterThan(conv.value.cutting_speed_mpm);
  });

  it("more inputs → higher confidence", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const full = eng.compute({
      material: "steel", tool_diameter_mm: 12, machine_power_kw: 22,
      machine_max_rpm: 12000, holder_type: "shrink_fit", coolant_type: "flood",
    });
    const min = eng.compute({ material: "steel", tool_diameter_mm: 12 });
    expect(full.value.overall_confidence).toBeGreaterThan(min.value.overall_confidence);
  });

  it("returns alternatives", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "steel", tool_diameter_mm: 12 });
    expect(r.value.alternatives).toBeDefined();
    expect(r.value.alternatives.length).toBeGreaterThanOrEqual(2);
  });

  it("reports limiting factors", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "steel", tool_diameter_mm: 12 });
    expect(r.value.limiting_factors).toBeDefined();
    expect(r.value.limiting_factors.length).toBeGreaterThan(0);
  });

  it("reports formulas used", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "steel", tool_diameter_mm: 12 });
    expect(r.value.formulas_used).toBeDefined();
    expect(r.value.formulas_used.length).toBeGreaterThan(0);
  });

  it("works for all major materials", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    for (const m of ["steel", "aluminum", "titanium", "stainless_steel", "cast_iron", "inconel"]) {
      const r = eng.compute({ material: m, tool_diameter_mm: 12 });
      expect(r.value.cutting_speed_mpm).toBeGreaterThan(0);
    }
  });

  it("safety checks present", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "steel", tool_diameter_mm: 12, machine_power_kw: 15 });
    expect(r.value.safety_checks.length).toBeGreaterThan(0);
    expect(r.value.safety_checks[0].name).toBeDefined();
  });

  it("playbook warnings for titanium", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "titanium", tool_diameter_mm: 12, cut_type: "roughing" });
    expect(r.value.playbook_warnings.length).toBeGreaterThan(0);
  });

  it("keeps turning playbook warnings scoped away from mill-only setup rules", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({
      material: "4140",
      tool_diameter_mm: 12,
      machine_type: "lathe",
      operation: "turning",
      cut_type: "roughing",
    });
    const joined = r.value.playbook_warnings.join(" ");
    expect(joined).not.toMatch(/Face first, always/i);
    expect(joined).not.toMatch(/Establish datums before features/i);
    expect(joined).not.toMatch(/flat-bottom endmill/i);
  });

  it("MRR is positive", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "steel", tool_diameter_mm: 12 });
    expect(r.value.mrr_cm3min).toBeGreaterThan(0);
  });

  it("power and torque positive", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "steel", tool_diameter_mm: 12 });
    expect(r.value.power_kw).toBeGreaterThan(0);
    expect(r.value.torque_Nm).toBeGreaterThan(0);
  });

  it("tool life positive", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "steel", tool_diameter_mm: 12 });
    expect(r.value.tool_life_min).toBeGreaterThan(0);
  });

  it("surface finish positive", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({ material: "steel", tool_diameter_mm: 12, corner_radius_mm: 0.5 });
    expect(r.value.surface_finish_Ra_um).toBeGreaterThan(0);
  });
});
