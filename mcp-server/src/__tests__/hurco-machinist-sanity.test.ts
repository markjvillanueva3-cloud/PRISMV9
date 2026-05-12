import { describe, expect, it } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

function joinedWarnings(warnings: string[] | undefined) {
  return (warnings ?? []).join(" ");
}

describe("Hurco machinist sanity sweeps", () => {
  it("keeps prioritized material speed ordering sane on the Hurco VMX30i for the same roughing cutter", () => {
    const common = {
      tool_diameter_mm: 12,
      flutes: 5,
      operation: "milling" as const,
      cut_type: "roughing" as const,
      strategy: "adaptive" as const,
      machine_max_rpm: 12000,
      machine_power_kw: 18.5,
      holder_type: "shrink_fit",
      coolant: "flood" as const,
    };

    const aluminum = ultimateSpeedFeedEngine.calculate({ ...common, material: "6061-T6" });
    const steel = ultimateSpeedFeedEngine.calculate({ ...common, material: "4140" });
    const stainless = ultimateSpeedFeedEngine.calculate({ ...common, material: "304" });
    const toolSteel = ultimateSpeedFeedEngine.calculate({
      ...common,
      material: "d2",
      hardness_hrc: 58,
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
      expect(result.spindle_rpm.value).toBeLessThanOrEqual(12000);
      expect(result.feed_rate.value).toBeGreaterThan(0);
      expect(result.mrr.value).toBeGreaterThan(0);
      expect(result.tool_life.life_minutes.value).toBeGreaterThan(0);
    });
  });

  it("keeps representative Hurco mill and lathe jobs inside sane machine envelopes", () => {
    const jobs = [
      {
        label: "VMX30i adaptive roughing in 4140 with a solid carbide end mill",
        maxRpm: 12000,
        minConfidence: 0.45,
        minRa: 0.0001,
        input: {
          machine_name: "Hurco VMX30i",
          machine_type: "mill",
          material: "4140 PH",
          operation: "milling",
          cut_type: "roughing",
          strategy: "adaptive",
          tool_diameter_mm: 12,
          flutes: 5,
          tool_material: "carbide",
          tool_coating: "AlTiN",
          machine_power_kw: 18.5,
          machine_max_rpm: 12000,
          holder_type: "shrink_fit",
          coolant_type: "through_tool",
          workholding_type: "vise",
          axial_depth_mm: 16,
          radial_depth_pct: 10,
          tool_stickout_mm: 40,
        },
      },
      {
        label: "VMX30i face milling 6061 with an indexable cutter",
        maxRpm: 12000,
        minConfidence: 0.45,
        minRa: 0.0001,
        input: {
          machine_name: "Hurco VMX30i",
          machine_type: "mill",
          material: "6061-T6",
          operation: "milling",
          cut_type: "roughing",
          strategy: "face",
          tool_diameter_mm: 50,
          flutes: 6,
          tool_material: "carbide",
          machine_power_kw: 18.5,
          machine_max_rpm: 12000,
          holder_type: "milling_chuck",
          coolant_type: "flood",
          workholding_type: "fixture_plate",
          axial_depth_mm: 2.5,
          radial_depth_pct: 70,
          tool_stickout_mm: 55,
        },
      },
      {
        label: "VC500i finish milling H13 stays conservative on a ball end mill",
        maxRpm: 18000,
        minConfidence: 0.4,
        minRa: 0,
        input: {
          machine_name: "Hurco VC500i",
          machine_type: "5axis",
          material: "H13",
          hardness_hrc: 46,
          operation: "milling",
          cut_type: "finishing",
          strategy: "scallop",
          tool_diameter_mm: 6,
          flutes: 4,
          tool_material: "carbide",
          tool_coating: "AlTiN",
          machine_power_kw: 18.5,
          machine_max_rpm: 18000,
          holder_type: "shrink_fit",
          coolant_type: "through_tool",
          workholding_type: "fixture_plate",
          axial_depth_mm: 0.35,
          radial_depth_pct: 5,
          tool_stickout_mm: 48,
          corner_radius_mm: 3,
        },
      },
      {
        label: "VC500i deep drilling 304 with through-tool coolant",
        maxRpm: 18000,
        minConfidence: 0.35,
        minRa: 0.0001,
        input: {
          machine_name: "Hurco VC500i",
          machine_type: "5axis",
          material: "304 Stainless",
          operation: "drilling",
          tool_diameter_mm: 8,
          flutes: 2,
          tool_material: "carbide",
          machine_power_kw: 18.5,
          machine_max_rpm: 18000,
          coolant_type: "through_tool",
          workholding_type: "fixture_plate",
          hole_depth_mm: 42,
        },
      },
      {
        label: "TM10i OD roughing 4140 with a roughing insert stays in the spindle envelope",
        maxRpm: 4000,
        minConfidence: 0.35,
        minRa: 0.0001,
        input: {
          machine_name: "Hurco TM10i",
          machine_type: "lathe",
          material: "4140",
          operation: "turning",
          cut_type: "roughing",
          tool_diameter_mm: 12,
          workpiece_diameter_mm: 80,
          machine_power_kw: 18.5,
          machine_max_rpm: 4000,
          coolant_type: "flood",
          workholding_type: "chuck",
          corner_radius_mm: 0.8,
        },
      },
      {
        label: "TM12i finish turning 316 stainless stays conservative but productive",
        maxRpm: 4000,
        minConfidence: 0.35,
        minRa: 0.0001,
        input: {
          machine_name: "Hurco TM12i",
          machine_type: "lathe",
          material: "316 Stainless",
          operation: "turning",
          cut_type: "finishing",
          tool_diameter_mm: 12,
          workpiece_diameter_mm: 100,
          machine_power_kw: 18.5,
          machine_max_rpm: 4000,
          coolant_type: "flood",
          workholding_type: "chuck",
          corner_radius_mm: 0.4,
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

  it("keeps Hurco turning jobs in turning mode and avoids mill-only setup chatter in the warnings", () => {
    const roughTurning = speedFeedOrchestratorEngine.compute({
      machine_name: "Hurco TM10i",
      machine_type: "lathe",
      material: "316 Stainless",
      operation: "turning",
      cut_type: "roughing",
      tool_diameter_mm: 12,
      workpiece_diameter_mm: 90,
      machine_power_kw: 18.5,
      machine_max_rpm: 4000,
      coolant_type: "flood",
      workholding_type: "chuck",
      corner_radius_mm: 0.8,
    });

    const joined = joinedWarnings(roughTurning.value.playbook_warnings);
    expect(roughTurning.value.spindle_rpm).toBeLessThanOrEqual(4000);
    expect(roughTurning.value.feed_rate_mmmin).toBeGreaterThan(0);
    expect(joined).not.toMatch(/face first, always/i);
    expect(joined).not.toMatch(/establish datums before features/i);
    expect(joined).not.toMatch(/flat-bottom endmill/i);
  });

  it("keeps through-tool drilling on the VC500i stronger than flood for stainless deep-hole work", () => {
    const flood = speedFeedOrchestratorEngine.compute({
      machine_name: "Hurco VC500i",
      machine_type: "5axis",
      material: "304 Stainless",
      operation: "drilling",
      tool_diameter_mm: 8,
      flutes: 2,
      tool_material: "carbide",
      machine_power_kw: 18.5,
      machine_max_rpm: 18000,
      coolant_type: "flood",
      workholding_type: "fixture_plate",
      hole_depth_mm: 42,
    });

    const throughTool = speedFeedOrchestratorEngine.compute({
      machine_name: "Hurco VC500i",
      machine_type: "5axis",
      material: "304 Stainless",
      operation: "drilling",
      tool_diameter_mm: 8,
      flutes: 2,
      tool_material: "carbide",
      machine_power_kw: 18.5,
      machine_max_rpm: 18000,
      coolant_type: "through_tool",
      workholding_type: "fixture_plate",
      hole_depth_mm: 42,
    });

    expect(throughTool.value.cutting_speed_mpm).toBeGreaterThanOrEqual(flood.value.cutting_speed_mpm);
    expect(throughTool.value.feed_rate_mmmin).toBeGreaterThanOrEqual(flood.value.feed_rate_mmmin);
    expect(throughTool.value.overall_confidence).toBeGreaterThanOrEqual(flood.value.overall_confidence);
  });
});
