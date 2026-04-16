/**
 * Tests for HM-KC-MS3 U-HKC21: Shared Cutting Data + Tool Comp + Coolant Schemas
 *
 * Validates parameter counts, DFM-critical field ranges, schema defaults,
 * and AC Python setter namespace correctness across all 13 profile schemas.
 */

import { describe, it, expect } from "vitest";
import {
  CUTTING_DATA_SCHEMA_MAP,
  CUTTING_DATA_METADATA,
  CUTTING_DATA_TOTAL_PARAM_COUNT,
  roughingCuttingDataSchema,
  hscHpcCuttingDataSchema,
  threadingCuttingDataSchema,
  type CuttingDataProfileType,
} from "../schemas/hypermill/cam/cuttingDataSchemas.js";
import {
  TOOL_COMP_SCHEMA_MAP,
  TOOL_COMP_METADATA,
  TOOL_COMP_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cam/toolCompSchemas.js";
import {
  COOLANT_SCHEMA_MAP,
  COOLANT_METADATA,
  COOLANT_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cam/coolantSchemas.js";

// ── Cutting Data Schemas ──────────────────────────────────────────────────────

describe("Cutting Data Schemas (6 profiles)", () => {
  it("should have exactly 6 cutting data profile types", () => {
    const keys = Object.keys(CUTTING_DATA_SCHEMA_MAP);
    expect(keys).toHaveLength(6);
    expect(keys).toEqual(
      expect.arrayContaining([
        "roughing",
        "finishing",
        "drilling",
        "threading",
        "hsc_hpc",
        "multi_axis",
      ]),
    );
  });

  it("should have >= 140 total cutting data params", () => {
    expect(CUTTING_DATA_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(140);
    // Exact: 30 + 28 + 22 + 22 + 25 + 22 = 149
    expect(CUTTING_DATA_TOTAL_PARAM_COUNT).toBe(149);
  });

  it("roughing has 30 params per metadata", () => {
    expect(CUTTING_DATA_METADATA.roughing.paramCount).toBe(30);
  });

  it("finishing has 28 params per metadata", () => {
    expect(CUTTING_DATA_METADATA.finishing.paramCount).toBe(28);
  });

  it("drilling has 22 params per metadata", () => {
    expect(CUTTING_DATA_METADATA.drilling.paramCount).toBe(22);
  });

  it("threading has 22 params per metadata", () => {
    expect(CUTTING_DATA_METADATA.threading.paramCount).toBe(22);
  });

  it("hsc_hpc has 25 params per metadata", () => {
    expect(CUTTING_DATA_METADATA.hsc_hpc.paramCount).toBe(25);
  });

  it("multi_axis has 22 params per metadata", () => {
    expect(CUTTING_DATA_METADATA.multi_axis.paramCount).toBe(22);
  });

  it("roughing depth_of_cut validates range 0.01..200", () => {
    const shape = roughingCuttingDataSchema.shape;
    // Valid at boundaries
    const validLow = shape.depth_of_cut.safeParse(0.01);
    expect(validLow.success).toBe(true);
    const validHigh = shape.depth_of_cut.safeParse(200);
    expect(validHigh.success).toBe(true);
    // Invalid below range
    const tooLow = shape.depth_of_cut.safeParse(0.009);
    expect(tooLow.success).toBe(false);
    // Invalid above range
    const tooHigh = shape.depth_of_cut.safeParse(200.1);
    expect(tooHigh.success).toBe(false);
  });

  it("roughing spindle_speed validates range 50..99999", () => {
    const shape = roughingCuttingDataSchema.shape;
    const valid = shape.spindle_speed.safeParse(8000);
    expect(valid.success).toBe(true);
    const tooLow = shape.spindle_speed.safeParse(49);
    expect(tooLow.success).toBe(false);
    const tooHigh = shape.spindle_speed.safeParse(100000);
    expect(tooHigh.success).toBe(false);
  });

  it("HSC chip_thinning_comp defaults to true (boolean)", () => {
    const shape = hscHpcCuttingDataSchema.shape;
    const parsed = shape.chip_thinning_comp.parse(undefined);
    expect(parsed).toBe(true);
    expect(typeof parsed).toBe("boolean");
  });

  it("HSC spindle_speed requires >= 1000 RPM", () => {
    const shape = hscHpcCuttingDataSchema.shape;
    const valid = shape.spindle_speed.safeParse(1000);
    expect(valid.success).toBe(true);
    const tooLow = shape.spindle_speed.safeParse(999);
    expect(tooLow.success).toBe(false);
  });

  it("threading pitch is DFM-critical and in metadata", () => {
    expect(CUTTING_DATA_METADATA.threading.dfmCriticalParams).toContain("pitch");
    // Pitch range: 0.2..25 mm
    const shape = threadingCuttingDataSchema.shape;
    const validPitch = shape.pitch.safeParse(1.5);
    expect(validPitch.success).toBe(true);
    const tooSmall = shape.pitch.safeParse(0.1);
    expect(tooSmall.success).toBe(false);
    const tooLarge = shape.pitch.safeParse(26);
    expect(tooLarge.success).toBe(false);
  });

  it("threading infeed_angle allows 0, 29, and 30 degrees", () => {
    const shape = threadingCuttingDataSchema.shape;
    expect(shape.infeed_angle.safeParse(0).success).toBe(true);
    expect(shape.infeed_angle.safeParse(29).success).toBe(true);
    expect(shape.infeed_angle.safeParse(30).success).toBe(true);
  });

  it("all cutting data AC Python setters use hm.cutting.* namespace", () => {
    for (const [key, meta] of Object.entries(CUTTING_DATA_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.cutting\./);
      expect(meta.acPythonSetter).toBe(`hm.cutting.${key}`);
    }
  });

  it("roughing DFM-critical params include depth_of_cut and width_of_cut", () => {
    const dfm = CUTTING_DATA_METADATA.roughing.dfmCriticalParams;
    expect(dfm).toBeDefined();
    expect(dfm).toContain("depth_of_cut");
    expect(dfm).toContain("width_of_cut");
  });

  it("each schema shape key count matches metadata paramCount", () => {
    for (const [key, schema] of Object.entries(CUTTING_DATA_SCHEMA_MAP)) {
      const shapeKeys = Object.keys(schema.shape);
      const meta = CUTTING_DATA_METADATA[key as CuttingDataProfileType];
      expect(shapeKeys).toHaveLength(meta.paramCount);
    }
  });
});

// ── Tool Compensation Schemas ─────────────────────────────────────────────────

describe("Tool Compensation Schemas (4 profiles)", () => {
  it("should have exactly 4 tool comp profile types", () => {
    const keys = Object.keys(TOOL_COMP_SCHEMA_MAP);
    expect(keys).toHaveLength(4);
    expect(keys).toEqual(
      expect.arrayContaining(["milling", "turning", "drilling", "multi_axis"]),
    );
  });

  it("should have >= 45 total tool comp params", () => {
    expect(TOOL_COMP_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(45);
    // Exact: 15 + 14 + 12 + 13 = 54
    expect(TOOL_COMP_TOTAL_PARAM_COUNT).toBe(54);
  });

  it("milling comp has 15 params", () => {
    expect(TOOL_COMP_METADATA.milling.paramCount).toBe(15);
  });

  it("turning comp has 14 params", () => {
    expect(TOOL_COMP_METADATA.turning.paramCount).toBe(14);
  });

  it("drilling comp has 12 params", () => {
    expect(TOOL_COMP_METADATA.drilling.paramCount).toBe(12);
  });

  it("multi_axis comp has 13 params", () => {
    expect(TOOL_COMP_METADATA.multi_axis.paramCount).toBe(13);
  });

  it("all tool comp AC Python setters use hm.comp.* namespace", () => {
    for (const [key, meta] of Object.entries(TOOL_COMP_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.comp\./);
      expect(meta.acPythonSetter).toBe(`hm.comp.${key}`);
    }
  });

  it("milling comp_type allows none/computer/wear/reverse", () => {
    const schema = TOOL_COMP_SCHEMA_MAP.milling;
    expect(schema.shape.comp_type.safeParse("none").success).toBe(true);
    expect(schema.shape.comp_type.safeParse("computer").success).toBe(true);
    expect(schema.shape.comp_type.safeParse("wear").success).toBe(true);
    expect(schema.shape.comp_type.safeParse("reverse").success).toBe(true);
    expect(schema.shape.comp_type.safeParse("invalid").success).toBe(false);
  });

  it("turning imaginary_tip validates range 1..8", () => {
    const shape = TOOL_COMP_SCHEMA_MAP.turning.shape;
    expect(shape.imaginary_tip.safeParse(1).success).toBe(true);
    expect(shape.imaginary_tip.safeParse(8).success).toBe(true);
    expect(shape.imaginary_tip.safeParse(0).success).toBe(false);
    expect(shape.imaginary_tip.safeParse(9).success).toBe(false);
  });

  it("multi_axis pivot_comp allows none/command/inverse", () => {
    const shape = TOOL_COMP_SCHEMA_MAP.multi_axis.shape;
    expect(shape.pivot_comp.safeParse("none").success).toBe(true);
    expect(shape.pivot_comp.safeParse("command").success).toBe(true);
    expect(shape.pivot_comp.safeParse("inverse").success).toBe(true);
    expect(shape.pivot_comp.safeParse("other").success).toBe(false);
  });
});

// ── Coolant Schemas ───────────────────────────────────────────────────────────

describe("Coolant Schemas (3 profiles)", () => {
  it("should have exactly 3 coolant profile types", () => {
    const keys = Object.keys(COOLANT_SCHEMA_MAP);
    expect(keys).toHaveLength(3);
    expect(keys).toEqual(
      expect.arrayContaining(["standard", "high_pressure", "cryogenic"]),
    );
  });

  it("should have >= 25 total coolant params", () => {
    expect(COOLANT_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(25);
    // Exact: 12 + 12 + 10 = 34
    expect(COOLANT_TOTAL_PARAM_COUNT).toBe(34);
  });

  it("standard coolant has 12 params", () => {
    expect(COOLANT_METADATA.standard.paramCount).toBe(12);
  });

  it("high_pressure coolant has 12 params", () => {
    expect(COOLANT_METADATA.high_pressure.paramCount).toBe(12);
  });

  it("cryogenic coolant has 10 params", () => {
    expect(COOLANT_METADATA.cryogenic.paramCount).toBe(10);
  });

  it("standard mode enum includes all 6 delivery types", () => {
    const shape = COOLANT_SCHEMA_MAP.standard.shape;
    const modes = ["off", "flood", "mist", "through_tool", "air_blast", "mql"];
    for (const mode of modes) {
      expect(shape.mode.safeParse(mode).success).toBe(true);
    }
    expect(shape.mode.safeParse("invalid").success).toBe(false);
  });

  it("standard temperature is optional with range -40..60", () => {
    const shape = COOLANT_SCHEMA_MAP.standard.shape;
    expect(shape.temperature.safeParse(undefined).success).toBe(true);
    expect(shape.temperature.safeParse(20).success).toBe(true);
    expect(shape.temperature.safeParse(-40).success).toBe(true);
    expect(shape.temperature.safeParse(60).success).toBe(true);
    expect(shape.temperature.safeParse(-41).success).toBe(false);
    expect(shape.temperature.safeParse(61).success).toBe(false);
  });

  it("high_pressure pressure validates DFM range 10..300", () => {
    const shape = COOLANT_SCHEMA_MAP.high_pressure.shape;
    expect(shape.pressure.safeParse(10).success).toBe(true);
    expect(shape.pressure.safeParse(300).success).toBe(true);
    expect(shape.pressure.safeParse(9).success).toBe(false);
    expect(shape.pressure.safeParse(301).success).toBe(false);
  });

  it("high_pressure pressure is DFM-critical in metadata", () => {
    expect(COOLANT_METADATA.high_pressure.dfmCriticalParams).toContain("pressure");
  });

  it("cryogenic type allows co2/ln2/none", () => {
    const shape = COOLANT_SCHEMA_MAP.cryogenic.shape;
    expect(shape.type.safeParse("co2").success).toBe(true);
    expect(shape.type.safeParse("ln2").success).toBe(true);
    expect(shape.type.safeParse("none").success).toBe(true);
    expect(shape.type.safeParse("water").success).toBe(false);
  });

  it("all coolant AC Python setters use hm.coolant.* namespace", () => {
    for (const [key, meta] of Object.entries(COOLANT_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.coolant\./);
      expect(meta.acPythonSetter).toBe(`hm.coolant.${key}`);
    }
  });
});

// ── Combined Totals ───────────────────────────────────────────────────────────

describe("Combined Schema Totals", () => {
  it("should have >= 210 combined params across all 13 profiles", () => {
    const combined =
      CUTTING_DATA_TOTAL_PARAM_COUNT +
      TOOL_COMP_TOTAL_PARAM_COUNT +
      COOLANT_TOTAL_PARAM_COUNT;
    expect(combined).toBeGreaterThanOrEqual(210);
    // Exact: 149 + 54 + 34 = 237
    expect(combined).toBe(237);
  });

  it("should have 13 total profile types (6 + 4 + 3)", () => {
    const totalProfiles =
      Object.keys(CUTTING_DATA_SCHEMA_MAP).length +
      Object.keys(TOOL_COMP_SCHEMA_MAP).length +
      Object.keys(COOLANT_SCHEMA_MAP).length;
    expect(totalProfiles).toBe(13);
  });

  it("all 13 metadata entries have non-empty descriptions", () => {
    const allMeta = [
      ...Object.values(CUTTING_DATA_METADATA),
      ...Object.values(TOOL_COMP_METADATA),
      ...Object.values(COOLANT_METADATA),
    ];
    expect(allMeta).toHaveLength(13);
    for (const meta of allMeta) {
      expect(meta.description.length).toBeGreaterThan(20);
    }
  });

  it("all 13 metadata entries have paramCount > 0", () => {
    const allMeta = [
      ...Object.values(CUTTING_DATA_METADATA),
      ...Object.values(TOOL_COMP_METADATA),
      ...Object.values(COOLANT_METADATA),
    ];
    for (const meta of allMeta) {
      expect(meta.paramCount).toBeGreaterThan(0);
    }
  });
});
