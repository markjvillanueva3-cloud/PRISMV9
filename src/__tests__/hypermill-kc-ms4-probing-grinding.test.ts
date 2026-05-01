/**
 * HM-KC-MS4 Probing + Grinding + Misc Cycle Parameter Schema Tests
 *
 * U-HKC26: Validates param counts, DFM ranges, AC Python setters,
 * and schema validation for probing, grinding, and misc cycles.
 */

import { describe, it, expect } from "vitest";
import {
  setupProbeSchema,
  boreProbeSchema,
  bossProbeSchema,
  webProbeSchema,
  surfaceProbeSchema,
  toolSetterSchema,
  toolBreakageSchema,
  inProcessVerifySchema,
  PROBING_SCHEMA_MAP,
  PROBING_METADATA,
  PROBING_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cam/probingSchemas.js";
import {
  surfaceGrindingSchema,
  cylindricalODSchema,
  cylindricalIDSchema,
  centerlessSchema,
  creepFeedSchema,
  transformationCycleSchema,
  linkingDefaultsSchema,
  machineControlSchema,
  GRINDING_SCHEMA_MAP,
  GRINDING_METADATA,
  GRINDING_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cam/grindingSchemas.js";

// ── Probing Schemas ───────────────────────────────────────────────────────────

describe("U-HKC26: Probing Cycle Schemas", () => {
  it("exports exactly 8 probing cycle types", () => {
    const keys = Object.keys(PROBING_SCHEMA_MAP);
    expect(keys).toHaveLength(8);
    expect(keys).toContain("setup_probe");
    expect(keys).toContain("bore_probe");
    expect(keys).toContain("boss_probe");
    expect(keys).toContain("web_probe");
    expect(keys).toContain("surface_probe");
    expect(keys).toContain("tool_setter");
    expect(keys).toContain("tool_breakage");
    expect(keys).toContain("in_process_verify");
  });

  it("probing total param count >= 70", () => {
    expect(PROBING_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(70);
  });

  it("setup_probe schema has correct param count", () => {
    const count = Object.keys(setupProbeSchema.shape).length;
    expect(count).toBe(10);
    expect(PROBING_METADATA.setup_probe.paramCount).toBe(count);
  });

  it("bore_probe schema has correct param count", () => {
    const count = Object.keys(boreProbeSchema.shape).length;
    expect(count).toBe(10);
    expect(PROBING_METADATA.bore_probe.paramCount).toBe(count);
  });

  it("boss_probe schema has correct param count", () => {
    const count = Object.keys(bossProbeSchema.shape).length;
    expect(count).toBe(9);
    expect(PROBING_METADATA.boss_probe.paramCount).toBe(count);
  });

  it("web_probe schema has correct param count", () => {
    const count = Object.keys(webProbeSchema.shape).length;
    expect(count).toBe(9);
    expect(PROBING_METADATA.web_probe.paramCount).toBe(count);
  });

  it("surface_probe schema has correct param count", () => {
    const count = Object.keys(surfaceProbeSchema.shape).length;
    expect(count).toBe(10);
    expect(PROBING_METADATA.surface_probe.paramCount).toBe(count);
  });

  it("tool_setter schema has correct param count", () => {
    const count = Object.keys(toolSetterSchema.shape).length;
    expect(count).toBe(9);
    expect(PROBING_METADATA.tool_setter.paramCount).toBe(count);
  });

  it("tool_breakage schema has correct param count", () => {
    const count = Object.keys(toolBreakageSchema.shape).length;
    expect(count).toBe(8);
    expect(PROBING_METADATA.tool_breakage.paramCount).toBe(count);
  });

  it("in_process_verify schema has correct param count", () => {
    const count = Object.keys(inProcessVerifySchema.shape).length;
    expect(count).toBe(9);
    expect(PROBING_METADATA.in_process_verify.paramCount).toBe(count);
  });

  it("setup_probe approach_feed validates DFM range 10..5000", () => {
    const base = {
      probe_type: "touch" as const,
      calibration_diameter: 6,
      overtravel: 2,
      retract_distance: 5,
      dwell_before_measure: 0.5,
      repeat_count: 3,
    };

    const valid = setupProbeSchema.safeParse({ ...base, approach_feed: 500 });
    expect(valid.success).toBe(true);

    const tooSlow = setupProbeSchema.safeParse({ ...base, approach_feed: 5 });
    expect(tooSlow.success).toBe(false);

    const tooFast = setupProbeSchema.safeParse({ ...base, approach_feed: 6000 });
    expect(tooFast.success).toBe(false);
  });

  it("bore_probe angular_positions validates range 2..8", () => {
    const base = {
      bore_diameter_nominal: 50,
      tolerance: 0.01,
      measure_depth: 20,
      auto_correct_wcs: false,
      approach_feed: 300,
    };

    const valid = boreProbeSchema.safeParse({ ...base, angular_positions: 4 });
    expect(valid.success).toBe(true);

    const tooFew = boreProbeSchema.safeParse({ ...base, angular_positions: 1 });
    expect(tooFew.success).toBe(false);

    const tooMany = boreProbeSchema.safeParse({ ...base, angular_positions: 12 });
    expect(tooMany.success).toBe(false);
  });

  it("all probing setters use hm.probe.* namespace", () => {
    for (const [key, meta] of Object.entries(PROBING_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.probe\./);
      expect(meta.acPythonSetter).toBe(`hm.probe.${key}`);
    }
  });
});

// ── Grinding + Misc Schemas ───────────────────────────────────────────────────

describe("U-HKC26: Grinding + Misc Cycle Schemas", () => {
  it("exports exactly 8 grinding + misc cycle types", () => {
    const keys = Object.keys(GRINDING_SCHEMA_MAP);
    expect(keys).toHaveLength(8);
    expect(keys).toContain("surface_grinding");
    expect(keys).toContain("cylindrical_od");
    expect(keys).toContain("cylindrical_id");
    expect(keys).toContain("centerless");
    expect(keys).toContain("creep_feed");
    expect(keys).toContain("transformation_cycle");
    expect(keys).toContain("linking_defaults");
    expect(keys).toContain("machine_control");
  });

  it("grinding+misc total param count >= 90", () => {
    expect(GRINDING_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(90);
  });

  it("surface_grinding schema has 12 params", () => {
    const count = Object.keys(surfaceGrindingSchema.shape).length;
    expect(count).toBe(12);
    expect(GRINDING_METADATA.surface_grinding.paramCount).toBe(count);
  });

  it("cylindrical_od schema has 12 params", () => {
    const count = Object.keys(cylindricalODSchema.shape).length;
    expect(count).toBe(12);
    expect(GRINDING_METADATA.cylindrical_od.paramCount).toBe(count);
  });

  it("cylindrical_id schema has 12 params", () => {
    const count = Object.keys(cylindricalIDSchema.shape).length;
    expect(count).toBe(12);
    expect(GRINDING_METADATA.cylindrical_id.paramCount).toBe(count);
  });

  it("centerless schema has 12 params", () => {
    const count = Object.keys(centerlessSchema.shape).length;
    expect(count).toBe(12);
    expect(GRINDING_METADATA.centerless.paramCount).toBe(count);
  });

  it("creep_feed schema has 12 params", () => {
    const count = Object.keys(creepFeedSchema.shape).length;
    expect(count).toBe(12);
    expect(GRINDING_METADATA.creep_feed.paramCount).toBe(count);
  });

  it("transformation_cycle schema has 9 params", () => {
    const count = Object.keys(transformationCycleSchema.shape).length;
    expect(count).toBe(9);
    expect(GRINDING_METADATA.transformation_cycle.paramCount).toBe(count);
  });

  it("linking_defaults schema has 10 params", () => {
    const count = Object.keys(linkingDefaultsSchema.shape).length;
    expect(count).toBe(10);
    expect(GRINDING_METADATA.linking_defaults.paramCount).toBe(count);
  });

  it("machine_control schema has 11 params", () => {
    const count = Object.keys(machineControlSchema.shape).length;
    expect(count).toBe(11);
    expect(GRINDING_METADATA.machine_control.paramCount).toBe(count);
  });

  it("creep_feed burn_risk_threshold is DFM-critical and validates range 100..1000", () => {
    const base = {
      wheel_speed: 30,
      depth_of_cut: 0.5,
      table_speed: 100,
      continuous_dress: true,
      coolant_pressure: 50,
      coolant_flow: 80,
      wheel_porosity: "open" as const,
      spark_out_passes: 1,
      stock_removal_total: 2,
    };

    const valid = creepFeedSchema.safeParse({ ...base, burn_risk_threshold: 500 });
    expect(valid.success).toBe(true);

    const tooLow = creepFeedSchema.safeParse({ ...base, burn_risk_threshold: 50 });
    expect(tooLow.success).toBe(false);

    const tooHigh = creepFeedSchema.safeParse({ ...base, burn_risk_threshold: 1500 });
    expect(tooHigh.success).toBe(false);

    // Confirm it's tagged as DFM-critical in metadata
    expect(GRINDING_METADATA.creep_feed.dfmCriticalParams).toContain("burn_risk_threshold");
  });

  it("creep_feed depth_of_cut validates range 0.01..5", () => {
    const base = {
      wheel_speed: 30,
      table_speed: 100,
      continuous_dress: false,
      burn_risk_threshold: 500,
      coolant_pressure: 50,
      coolant_flow: 80,
      wheel_porosity: "medium" as const,
      spark_out_passes: 1,
      stock_removal_total: 2,
    };

    const valid = creepFeedSchema.safeParse({ ...base, depth_of_cut: 1.0 });
    expect(valid.success).toBe(true);

    const tooSmall = creepFeedSchema.safeParse({ ...base, depth_of_cut: 0.005 });
    expect(tooSmall.success).toBe(false);

    const tooLarge = creepFeedSchema.safeParse({ ...base, depth_of_cut: 10 });
    expect(tooLarge.success).toBe(false);

    // Confirm it's tagged as DFM-critical in metadata
    expect(GRINDING_METADATA.creep_feed.dfmCriticalParams).toContain("depth_of_cut");
  });

  it("grinding setters use hm.grind.* namespace", () => {
    const grindingKeys = ["surface_grinding", "cylindrical_od", "cylindrical_id", "centerless", "creep_feed"];
    for (const key of grindingKeys) {
      const meta = GRINDING_METADATA[key as keyof typeof GRINDING_METADATA];
      expect(meta.acPythonSetter).toMatch(/^hm\.grind\./);
      expect(meta.acPythonSetter).toBe(`hm.grind.${key}`);
    }
  });

  it("misc setters use hm.misc.* namespace", () => {
    const miscKeys = ["transformation_cycle", "linking_defaults", "machine_control"];
    for (const key of miscKeys) {
      const meta = GRINDING_METADATA[key as keyof typeof GRINDING_METADATA];
      expect(meta.acPythonSetter).toMatch(/^hm\.misc\./);
      expect(meta.acPythonSetter).toBe(`hm.misc.${key}`);
    }
  });
});

// ── Combined Totals ───────────────────────────────────────────────────────────

describe("U-HKC26: Combined Probing + Grinding Totals", () => {
  it("combined total param count >= 160", () => {
    const combined = PROBING_TOTAL_PARAM_COUNT + GRINDING_TOTAL_PARAM_COUNT;
    expect(combined).toBeGreaterThanOrEqual(160);
  });

  it("probing has 8 types and grinding+misc has 8 types", () => {
    expect(Object.keys(PROBING_SCHEMA_MAP)).toHaveLength(8);
    expect(Object.keys(GRINDING_SCHEMA_MAP)).toHaveLength(8);
  });

  it("surface_grinding depth_per_pass DFM is tagged", () => {
    expect(GRINDING_METADATA.surface_grinding.dfmCriticalParams).toContain("depth_per_pass");
  });

  it("setup_probe approach_feed DFM is tagged", () => {
    expect(PROBING_METADATA.setup_probe.dfmCriticalParams).toContain("approach_feed");
  });
});
