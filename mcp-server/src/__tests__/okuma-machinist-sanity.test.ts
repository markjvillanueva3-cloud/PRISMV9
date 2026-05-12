import { describe, expect, it } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

function joinedWarnings(warnings: string[] | undefined) {
  return (warnings ?? []).join(" ");
}

describe("Okuma machinist sanity sweeps", () => {
  it("keeps prioritized material speed ordering sane on the Okuma M460V-5AX for the same roughing cutter", () => {
    const common = {
      tool_diameter_mm: 12,
      flutes: 5,
      operation: "milling" as const,
      cut_type: "roughing" as const,
      strategy: "adaptive" as const,
      machine_max_rpm: 15000,
      machine_power_kw: 22,
      holder_type: "shrink_fit",
      coolant: "flood" as const,
    };

    const aluminum = ultimateSpeedFeedEngine.calculate({ ...common, material: "6061-T6" });
    const steel = ultimateSpeedFeedEngine.calculate({ ...common, material: "4140" });
    const stainless = ultimateSpeedFeedEngine.calculate({ ...common, material: "304" });
    const toolSteel = ultimateSpeedFeedEngine.calculate({
      ...common,
      material: "d2",
      hardness_hrc: 60,
    });

    expect(aluminum.resolved.iso_group).toBe("N");
    expect(steel.resolved.iso_group).toBe("P");
    expect(stainless.resolved.iso_group).toBe("M");
    expect(toolSteel.resolved.iso_group).toBe("H");

    expect(aluminum.cutting_speed.value).toBeGreaterThan(steel.cutting_speed.value);
    expect(steel.cutting_speed.value).toBeGreaterThan(stainless.cutting_speed.value);
    expect(stainless.cutting_speed.value).toBeGreaterThan(toolSteel.cutting_speed.value);

    [aluminum, steel, stainless, toolSteel].forEach((result) => {
      expect(result.spindle_rpm.value).toBeGreaterThan(0);
      expect(result.spindle_rpm.value).toBeLessThanOrEqual(15000);
      expect(result.feed_rate.value).toBeGreaterThan(0);
      expect(result.mrr.value).toBeGreaterThan(0);
      expect(result.tool_life.life_minutes.value).toBeGreaterThan(0);
    });
  });

  it("keeps realistic Okuma steel, tool-steel, and live-milling jobs inside sane machine envelopes", () => {
    const jobs = [
      {
        label: "M460 adaptive roughing in 4140 with a solid carbide end mill",
        maxRpm: 15000,
        minConfidence: 0.5,
        minRa: 0.0001,
        input: {
          machine_name: "Okuma GENOS M460V-5AX",
          machine_type: "5axis",
          material: "4140 PH",
          operation: "milling",
          cut_type: "roughing",
          strategy: "adaptive",
          tool_diameter_mm: 12,
          flutes: 5,
          tool_material: "carbide",
          tool_coating: "AlTiN",
          machine_power_kw: 22,
          machine_max_rpm: 15000,
          holder_type: "shrink_fit",
          coolant_type: "through_tool",
          workholding_type: "fixture_plate",
          axial_depth_mm: 18,
          radial_depth_pct: 10,
          tool_stickout_mm: 38,
        },
      },
      {
        label: "M460 face milling 6061 with an indexable-style cutter",
        maxRpm: 15000,
        minConfidence: 0.5,
        minRa: 0.0001,
        input: {
          machine_name: "Okuma GENOS M460V-5AX",
          machine_type: "5axis",
          material: "6061-T6",
          operation: "milling",
          cut_type: "roughing",
          strategy: "face",
          tool_diameter_mm: 50,
          flutes: 6,
          tool_material: "carbide",
          machine_power_kw: 22,
          machine_max_rpm: 15000,
          holder_type: "milling_chuck",
          coolant_type: "flood",
          workholding_type: "fixture_plate",
          axial_depth_mm: 2.5,
          radial_depth_pct: 70,
          tool_stickout_mm: 55,
        },
      },
      {
        label: "M460 deep drilling 304 with through-tool coolant",
        maxRpm: 15000,
        minConfidence: 0.35,
        minRa: 0.0001,
        input: {
          machine_name: "Okuma GENOS M460V-5AX",
          machine_type: "5axis",
          material: "304 Stainless",
          operation: "drilling",
          tool_diameter_mm: 8,
          flutes: 2,
          tool_material: "carbide",
          machine_power_kw: 22,
          machine_max_rpm: 15000,
          coolant_type: "through_tool",
          workholding_type: "fixture_plate",
          hole_depth_mm: 48,
        },
      },
      {
        label: "GENOS L3000 OD roughing 4140 with an insert-style turning tool",
        maxRpm: 3800,
        minConfidence: 0.35,
        minRa: 0.0001,
        input: {
          machine_name: "Okuma GENOS L3000",
          machine_type: "lathe",
          material: "4140",
          operation: "turning",
          cut_type: "roughing",
          tool_diameter_mm: 12,
          workpiece_diameter_mm: 80,
          machine_power_kw: 30,
          machine_max_rpm: 3800,
          coolant_type: "flood",
          workholding_type: "chuck",
          corner_radius_mm: 0.8,
        },
      },
      {
        label: "MULTUS live milling 303 stainless with through-tool coolant",
        maxRpm: 10000,
        minConfidence: 0.45,
        minRa: 0.0001,
        input: {
          machine_name: "Okuma MULTUS U3000",
          machine_type: "mill_turn",
          material: "303 Stainless",
          operation: "milling",
          cut_type: "roughing",
          strategy: "adaptive",
          tool_diameter_mm: 9.525,
          flutes: 4,
          tool_material: "carbide",
          tool_coating: "TiAlN",
          machine_power_kw: 15,
          machine_max_rpm: 10000,
          holder_type: "milling_chuck",
          coolant_type: "through_tool",
          workholding_type: "chuck",
          axial_depth_mm: 2.1,
          radial_depth_pct: 8,
          tool_stickout_mm: 52,
        },
      },
      {
        label: "MULTUS tool-steel finish milling stays conservative",
        maxRpm: 10000,
        minConfidence: 0.45,
        minRa: 0,
        input: {
          machine_name: "Okuma MULTUS U3000",
          machine_type: "mill_turn",
          material: "H13",
          hardness_hrc: 46,
          operation: "milling",
          cut_type: "finishing",
          strategy: "scallop",
          tool_diameter_mm: 6,
          flutes: 4,
          tool_material: "carbide",
          tool_coating: "AlTiN",
          machine_power_kw: 15,
          machine_max_rpm: 10000,
          holder_type: "shrink_fit",
          coolant_type: "through_tool",
          workholding_type: "chuck",
          axial_depth_mm: 0.4,
          radial_depth_pct: 6,
          tool_stickout_mm: 45,
          corner_radius_mm: 3,
        },
      },
    ] as const;

    let validated = 0;

    jobs.forEach(({ label, maxRpm, minConfidence, minRa, input }) => {
      const result = speedFeedOrchestratorEngine.compute(input);
      const value = result.value;

      expect(value.cutting_speed_mpm, label).toBeGreaterThan(0);
      expect(value.spindle_rpm, label).toBeGreaterThan(0);
      expect(value.spindle_rpm, label).toBeLessThanOrEqual(maxRpm);
      expect(value.feed_rate_mmmin, label).toBeGreaterThan(0);
      expect(value.power_kw, label).toBeGreaterThan(0);
      expect(value.tool_life_min, label).toBeGreaterThan(0);
      if (minRa === 0) {
        expect(value.surface_finish_Ra_um, label).toBeGreaterThanOrEqual(0);
      } else {
        expect(value.surface_finish_Ra_um, label).toBeGreaterThan(minRa);
      }
      expect(value.overall_confidence, label).toBeGreaterThanOrEqual(minConfidence);
      validated += 1;
    });

    expect(validated).toBe(jobs.length);
  });

  it("keeps Okuma turning jobs in turning mode and avoids mill-only setup chatter in the warnings", () => {
    const roughTurning = speedFeedOrchestratorEngine.compute({
      machine_name: "Okuma GENOS L3000",
      machine_type: "lathe",
      material: "316 Stainless",
      operation: "turning",
      cut_type: "roughing",
      tool_diameter_mm: 12,
      workpiece_diameter_mm: 90,
      machine_power_kw: 30,
      machine_max_rpm: 3800,
      coolant_type: "flood",
      workholding_type: "chuck",
      corner_radius_mm: 0.8,
    });

    const joined = joinedWarnings(roughTurning.value.playbook_warnings);
    expect(roughTurning.value.spindle_rpm).toBeLessThanOrEqual(3800);
    expect(roughTurning.value.feed_rate_mmmin).toBeGreaterThan(0);
    expect(joined).not.toMatch(/face first, always/i);
    expect(joined).not.toMatch(/establish datums before features/i);
    expect(joined).not.toMatch(/flat-bottom endmill/i);
  });

  it("keeps through-tool drilling on the M460 stronger than flood for stainless deep-hole work", () => {
    const flood = speedFeedOrchestratorEngine.compute({
      machine_name: "Okuma GENOS M460V-5AX",
      machine_type: "5axis",
      material: "304 Stainless",
      operation: "drilling",
      tool_diameter_mm: 8,
      flutes: 2,
      tool_material: "carbide",
      machine_power_kw: 22,
      machine_max_rpm: 15000,
      coolant_type: "flood",
      workholding_type: "fixture_plate",
      hole_depth_mm: 48,
    });

    const throughTool = speedFeedOrchestratorEngine.compute({
      machine_name: "Okuma GENOS M460V-5AX",
      machine_type: "5axis",
      material: "304 Stainless",
      operation: "drilling",
      tool_diameter_mm: 8,
      flutes: 2,
      tool_material: "carbide",
      machine_power_kw: 22,
      machine_max_rpm: 15000,
      coolant_type: "through_tool",
      workholding_type: "fixture_plate",
      hole_depth_mm: 48,
    });

    expect(throughTool.value.cutting_speed_mpm).toBeGreaterThanOrEqual(flood.value.cutting_speed_mpm);
    expect(throughTool.value.feed_rate_mmmin).toBeGreaterThanOrEqual(flood.value.feed_rate_mmmin);
    expect(throughTool.value.overall_confidence).toBeGreaterThanOrEqual(flood.value.overall_confidence);
  });
});
