/**
 * Tests for BOX-MS2 engines:
 *   - OkumaMacroHeaderGeneratorEngine (U-BOX19)
 *   - AutoSpeedFeedCalculatorEngine (U-BOX20)
 */
import { describe, it, expect } from "vitest";
import { OkumaMacroHeaderGeneratorEngine } from "../engines/OkumaMacroHeaderGeneratorEngine.js";
import { AutoSpeedFeedCalculatorEngine } from "../engines/AutoSpeedFeedCalculatorEngine.js";
import type { MacroHeaderInput, MacroToolDef } from "../engines/OkumaMacroHeaderGeneratorEngine.js";
import type { AutoSFInput, AutoSFOperation } from "../engines/AutoSpeedFeedCalculatorEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function makeToolDef(overrides: Partial<MacroToolDef> = {}): MacroToolDef {
  return {
    station: 1,
    operation: "od_rough",
    sfm: 600,
    feed: 0.012,
    doc: 0.100,
    nose_radius: 0.032,
    ...overrides,
  };
}

function makeHeaderInput(overrides: Partial<MacroHeaderInput> = {}): MacroHeaderInput {
  return {
    program_name: "TEST-PART-001",
    unit_system: "imperial",
    stock_diameter: 2.0,
    part_length: 3.5,
    finish_od: 1.875,
    drill_size: 0.500,
    drill_point_angle: 118,
    od_finish_allowance: 0.010,
    tools: [
      makeToolDef({ station: 1, operation: "od_rough", sfm: 600, feed: 0.012, doc: 0.100 }),
      makeToolDef({ station: 2, operation: "od_finish", sfm: 800, feed: 0.006, nose_radius: 0.032 }),
      makeToolDef({ station: 5, operation: "drill", sfm: 300, feed: 0.008 }),
    ],
    ...overrides,
  };
}

function makeAutoSFOp(overrides: Partial<AutoSFOperation> = {}): AutoSFOperation {
  return {
    station: 1,
    operation: "od_rough",
    sfm: 600,
    feed: 0.012,
    cutting_diameter: 2.0,
    doc: 0.100,
    nose_radius: 0.032,
    material_group: "P",
    ...overrides,
  };
}

// ============================================================================
// OkumaMacroHeaderGeneratorEngine
// ============================================================================

describe("OkumaMacroHeaderGeneratorEngine", () => {
  const engine = new OkumaMacroHeaderGeneratorEngine();

  describe("generate()", () => {
    it("produces valid header with all sections", () => {
      const result = engine.generate(makeHeaderInput());

      expect(result.header_lines.length).toBeGreaterThan(20);
      expect(result.header_text).toContain("PARAMETRIC MACRO");
      expect(result.header_text).toContain("TEST-PART-001");
      expect(result.header_text).toContain("IMPERIAL");
      expect(result.line_count).toBe(result.header_lines.length);
    });

    it("includes part dimension variables (V1, V2, V5)", () => {
      const result = engine.generate(makeHeaderInput());
      const varNames = result.variable_map.map(v => v.var);

      expect(varNames).toContain("V1");  // stock diameter
      expect(varNames).toContain("V2");  // finish OD
      expect(varNames).toContain("V5");  // part length

      const v1 = result.variable_map.find(v => v.var === "V1");
      expect(v1?.value).toBe(2.0);
      expect(v1?.purpose).toContain("STOCK DIAMETER");
    });

    it("includes drill parameters (V20, V21)", () => {
      const result = engine.generate(makeHeaderInput());
      const varNames = result.variable_map.map(v => v.var);

      expect(varNames).toContain("V20"); // drill size
      expect(varNames).toContain("V21"); // drill point angle
      expect(result.header_text).toContain("DRILL PARAMETERS");
    });

    it("includes finish allowances (V35)", () => {
      const result = engine.generate(makeHeaderInput());
      const varNames = result.variable_map.map(v => v.var);

      expect(varNames).toContain("V35"); // OD finish allowance
      expect(result.header_text).toContain("FINISH ALLOWANCE");
    });

    it("generates RPM formulas for each tool", () => {
      const result = engine.generate(makeHeaderInput());

      expect(result.rpm_formulas.length).toBe(3); // 3 tools
      expect(result.rpm_formulas[0].formula).toContain("3.8197");
      expect(result.rpm_formulas[0].tool_station).toBe(1);
    });

    it("uses correct diameter variable per operation type", () => {
      const input = makeHeaderInput({
        tools: [
          makeToolDef({ station: 1, operation: "od_rough", sfm: 600, feed: 0.012 }),
          makeToolDef({ station: 7, operation: "bore_rough", sfm: 400, feed: 0.008 }),
          makeToolDef({ station: 5, operation: "drill", sfm: 300, feed: 0.006 }),
        ],
      });
      const result = engine.generate(input);

      // OD uses V1 (stock diameter)
      expect(result.rpm_formulas[0].formula).toContain("V1");
      // Bore uses V3 (finish ID)
      expect(result.rpm_formulas[1].formula).toContain("V3");
      // Drill uses V20 (drill size)
      expect(result.rpm_formulas[2].formula).toContain("V20");
    });

    it("generates metric RPM formulas when metric unit system", () => {
      const result = engine.generate(makeHeaderInput({ unit_system: "metric" }));

      expect(result.rpm_formulas[0].formula).toContain("318.31");
      expect(result.header_text).toContain("METRIC");
    });

    it("includes clearance variables (V60-V64)", () => {
      const result = engine.generate(makeHeaderInput());
      const varNames = result.variable_map.map(v => v.var);

      expect(varNames).toContain("V60"); // X clearance
      expect(varNames).toContain("V61"); // Z clearance
      expect(varNames).toContain("V62"); // retract X
      expect(varNames).toContain("V63"); // retract Z
      expect(varNames).toContain("V64"); // max RPM
    });

    it("includes G50 clamp values in safety", () => {
      const result = engine.generate(makeHeaderInput());

      expect(result.safety.g50_clamps.length).toBe(3);
      expect(result.safety.g50_clamps).toContain(2500); // od_rough default
    });

    it("includes bar feeder variables when requested", () => {
      const result = engine.generate(makeHeaderInput({ bar_feeder: true }));
      const varNames = result.variable_map.map(v => v.var);

      expect(varNames).toContain("V90"); // part counter
      expect(varNames).toContain("V91"); // parts per bar
      expect(varNames).toContain("V92"); // cutoff width
      expect(result.header_text).toContain("BAR FEEDER");
    });

    it("includes C-axis variables when requested", () => {
      const result = engine.generate(makeHeaderInput({ c_axis: true }));
      const varNames = result.variable_map.map(v => v.var);

      expect(varNames).toContain("V96");
      expect(varNames).toContain("V97");
      expect(result.header_text).toContain("C-AXIS");
    });

    it("includes optional feature branching variables", () => {
      const result = engine.generate(makeHeaderInput({
        optional_features: [
          { control_var: "V10", skip_label: "NCHAMF", description: "CHAMFER (0=SKIP)" },
          { control_var: "V11", skip_label: "NIDROUGH", description: "ID ROUGHING (0=SKIP)" },
        ],
      }));
      const varNames = result.variable_map.map(v => v.var);

      expect(varNames).toContain("V10");
      expect(varNames).toContain("V11");
      expect(result.header_text).toContain("OPTIONAL FEATURES");
    });

    it("handles empty tools list gracefully", () => {
      const result = engine.generate(makeHeaderInput({ tools: [] }));

      expect(result.rpm_formulas.length).toBe(0);
      expect(result.header_lines.length).toBeGreaterThan(10);
      expect(result.variable_map.some(v => v.var === "V1")).toBe(true);
    });

    it("generates valid Okuma syntax (no semicolons, uses parentheses for comments)", () => {
      const result = engine.generate(makeHeaderInput());

      for (const line of result.header_lines) {
        // Okuma uses ( ) for comments, not ;
        expect(line).not.toContain(";");
        // Every comment line should use parentheses
        if (line.trim() && !line.startsWith("V") && !line.startsWith("(")) {
          // This should be empty line or variable assignment
          expect(line.trim()).toBe("");
        }
      }
    });
  });

  describe("generateMinimal()", () => {
    it("produces a header with only dimension variables", () => {
      const result = engine.generateMinimal({
        program_name: "SIMPLE-PART",
        unit_system: "imperial",
        stock_diameter: 1.5,
        part_length: 2.0,
      });

      expect(result.variable_map.some(v => v.var === "V1")).toBe(true);
      expect(result.variable_map.some(v => v.var === "V5")).toBe(true);
      expect(result.rpm_formulas.length).toBe(0);
    });

    it("includes drill size when provided", () => {
      const result = engine.generateMinimal({
        program_name: "DRILL-PART",
        unit_system: "imperial",
        stock_diameter: 1.5,
        part_length: 2.0,
        drill_size: 0.375,
      });

      expect(result.variable_map.some(v => v.var === "V20")).toBe(true);
    });
  });

  describe("getStandardVar()", () => {
    it("returns correct variable for known purposes", () => {
      expect(engine.getStandardVar("stock_diameter")).toBe("V1");
      expect(engine.getStandardVar("finish_od")).toBe("V2");
      expect(engine.getStandardVar("finish_id")).toBe("V3");
      expect(engine.getStandardVar("part_length")).toBe("V5");
      expect(engine.getStandardVar("drill_size")).toBe("V20");
      expect(engine.getStandardVar("x_clearance")).toBe("V60");
      expect(engine.getStandardVar("max_rpm")).toBe("V64");
    });

    it("returns null for unknown purposes", () => {
      expect(engine.getStandardVar("banana")).toBeNull();
      expect(engine.getStandardVar("")).toBeNull();
    });
  });
});

// ============================================================================
// AutoSpeedFeedCalculatorEngine
// ============================================================================

describe("AutoSpeedFeedCalculatorEngine", () => {
  const engine = new AutoSpeedFeedCalculatorEngine();

  describe("calcRPM()", () => {
    it("calculates imperial RPM correctly (SFM * 3.82 / DIA)", () => {
      // SFM=600, DIA=2" → RPM = 600 * 3.8197 / 2 = 1146
      const rpm = engine.calcRPM(600, 2.0, "imperial");
      expect(rpm).toBeCloseTo(1146, -1); // within ~10
    });

    it("calculates metric RPM correctly (SCS * 1000 / (pi * D))", () => {
      // Vc=200 m/min, D=50mm → RPM = 1000*200 / (pi*50) = 1273
      const rpm = engine.calcRPM(200, 50, "metric");
      expect(rpm).toBeCloseTo(1273, -1);
    });

    it("returns 0 for zero diameter", () => {
      expect(engine.calcRPM(600, 0, "imperial")).toBe(0);
    });

    it("returns 0 for zero SFM", () => {
      expect(engine.calcRPM(0, 2.0, "imperial")).toBe(0);
    });

    it("returns higher RPM for smaller diameters", () => {
      const rpmLarge = engine.calcRPM(600, 2.0, "imperial");
      const rpmSmall = engine.calcRPM(600, 0.5, "imperial");
      expect(rpmSmall).toBeGreaterThan(rpmLarge);
      expect(rpmSmall).toBeCloseTo(rpmLarge * 4, -1);
    });
  });

  describe("applyG50Clamp()", () => {
    it("clamps RPM above G50 limit", () => {
      const result = engine.applyG50Clamp(4000, "od_rough");
      expect(result.clamped_rpm).toBe(2500); // od_rough default G50
      expect(result.was_clamped).toBe(true);
      expect(result.g50_value).toBe(2500);
    });

    it("does not clamp RPM below G50 limit", () => {
      const result = engine.applyG50Clamp(1500, "od_rough");
      expect(result.clamped_rpm).toBe(1500);
      expect(result.was_clamped).toBe(false);
    });

    it("respects max_rpm_override", () => {
      const result = engine.applyG50Clamp(3000, "od_rough", 2000);
      expect(result.clamped_rpm).toBe(2000);
      expect(result.g50_value).toBe(2000);
    });

    it("respects machine max RPM", () => {
      const result = engine.applyG50Clamp(3000, "od_rough", undefined, 2200);
      expect(result.clamped_rpm).toBe(2200);
    });

    it("uses cutoff default G50 (1500) for cutoff operations", () => {
      const result = engine.applyG50Clamp(2000, "cutoff");
      expect(result.clamped_rpm).toBe(1500);
      expect(result.was_clamped).toBe(true);
    });
  });

  describe("scaleBoringBarFeed()", () => {
    it("returns full feed for L/D <= 3", () => {
      const result = engine.scaleBoringBarFeed(0.008, 0.75, 2.0); // L/D = 2.67
      expect(result.scaled_feed).toBe(0.008);
      expect(result.scale_factor).toBe(1.0);
    });

    it("returns 75% feed for L/D 3-4", () => {
      const result = engine.scaleBoringBarFeed(0.008, 0.75, 2.625); // L/D = 3.5
      expect(result.scaled_feed).toBeCloseTo(0.006, 3);
      expect(result.scale_factor).toBe(0.75);
    });

    it("returns 50% feed for L/D 4-5", () => {
      const result = engine.scaleBoringBarFeed(0.008, 0.5, 2.25); // L/D = 4.5
      expect(result.scaled_feed).toBe(0.004);
      expect(result.scale_factor).toBe(0.50);
    });

    it("returns 25% feed for L/D 5-6", () => {
      const result = engine.scaleBoringBarFeed(0.008, 0.5, 2.75); // L/D = 5.5
      expect(result.scaled_feed).toBe(0.002);
      expect(result.scale_factor).toBe(0.25);
    });

    it("returns 15% feed for L/D > 6 with warning", () => {
      const result = engine.scaleBoringBarFeed(0.008, 0.375, 3.0); // L/D = 8
      expect(result.scale_factor).toBe(0.15);
      expect(result.reason).toContain("CAUTION");
    });

    it("handles zero bar diameter", () => {
      const result = engine.scaleBoringBarFeed(0.008, 0, 2.0);
      expect(result.scaled_feed).toBe(0.008);
      expect(result.scale_factor).toBe(1.0);
    });
  });

  describe("calcPeckSchedule()", () => {
    it("calculates peck schedule for steel (1xD first, 0.5xD subsequent)", () => {
      const schedule = engine.calcPeckSchedule(0.5, 2.0, "imperial", "P");
      expect(schedule[0]).toBe(0.5);      // First peck = 1xD
      expect(schedule[1]).toBe(0.25);     // Subsequent = 0.5xD
      expect(schedule.length).toBeGreaterThanOrEqual(4);
      // Total should equal depth
      const total = schedule.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(2.0, 3);
    });

    it("calculates larger pecks for aluminum (1.5xD first, 1xD subsequent)", () => {
      const schedule = engine.calcPeckSchedule(0.5, 2.0, "imperial", "N");
      expect(schedule[0]).toBe(0.75);     // First peck = 1.5xD
      expect(schedule[1]).toBe(0.5);      // Subsequent = 1xD
    });

    it("handles metric units", () => {
      const schedule = engine.calcPeckSchedule(12.0, 60.0, "metric", "P");
      expect(schedule[0]).toBe(12.0);     // First peck = 1xD = 12mm
      expect(schedule[1]).toBe(6.0);      // Subsequent = 0.5xD = 6mm
    });

    it("returns empty for zero drill diameter", () => {
      expect(engine.calcPeckSchedule(0, 2.0, "imperial")).toEqual([]);
    });

    it("returns empty for zero depth", () => {
      expect(engine.calcPeckSchedule(0.5, 0, "imperial")).toEqual([]);
    });

    it("handles shallow hole (depth < 1xD)", () => {
      const schedule = engine.calcPeckSchedule(0.5, 0.3, "imperial", "P");
      expect(schedule.length).toBe(1);
      expect(schedule[0]).toBe(0.3);
    });
  });

  describe("calcFinishFeed()", () => {
    it("calculates correct feed for target Ra with imperial nose radius", () => {
      // Target Ra=1.6um, nose_radius=0.032" (0.8128mm)
      // f_mm = sqrt(1.6 * 32 * 0.8128 / 1000) = sqrt(0.04162) = 0.204mm
      // f_ipr = 0.204 / 25.4 = 0.008"
      const feed = engine.calcFinishFeed(1.6, 0.032, "imperial");
      expect(feed).toBeCloseTo(0.008, 3);
    });

    it("calculates correct feed for metric nose radius", () => {
      // Target Ra=1.6um, nose_radius=0.8mm
      // f_mm = sqrt(1.6 * 32 * 0.8 / 1000) = sqrt(0.04096) = 0.2024mm
      const feed = engine.calcFinishFeed(1.6, 0.8, "metric");
      expect(feed).toBeCloseTo(0.2024, 3);
    });

    it("returns 0 for zero Ra target", () => {
      expect(engine.calcFinishFeed(0, 0.032, "imperial")).toBe(0);
    });

    it("returns 0 for zero nose radius", () => {
      expect(engine.calcFinishFeed(1.6, 0, "imperial")).toBe(0);
    });

    it("larger nose radius allows higher feed for same Ra", () => {
      const feedSmall = engine.calcFinishFeed(1.6, 0.016, "imperial");
      const feedLarge = engine.calcFinishFeed(1.6, 0.032, "imperial");
      expect(feedLarge).toBeGreaterThan(feedSmall);
    });
  });

  describe("calculate() — full pipeline", () => {
    it("calculates all operations and returns results", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        machine_max_rpm: 4500,
        machine_power_kw: 15,
        operations: [
          makeAutoSFOp({ station: 1, operation: "od_rough", sfm: 600, cutting_diameter: 2.0 }),
          makeAutoSFOp({ station: 2, operation: "od_finish", sfm: 800, cutting_diameter: 1.875 }),
          makeAutoSFOp({ station: 5, operation: "drill", sfm: 300, cutting_diameter: 0.5 }),
        ],
      };

      const result = engine.calculate(input);

      expect(result.operations.length).toBe(3);
      expect(result.stats.total_operations).toBe(3);
      expect(result.all_okuma_lines.length).toBeGreaterThan(0);
    });

    it("clamps RPM for small-diameter drill", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [
          makeAutoSFOp({
            station: 5,
            operation: "drill",
            sfm: 300,
            cutting_diameter: 0.125, // 1/8" drill → RPM = 300*3.82/0.125 = 9168
          }),
        ],
      };

      const result = engine.calculate(input);
      const drillResult = result.operations[0];

      expect(drillResult.calculated_rpm).toBeGreaterThan(4500);
      expect(drillResult.was_clamped).toBe(true);
      expect(drillResult.clamped_rpm).toBeLessThanOrEqual(2000); // drill G50 default
    });

    it("scales feed for boring bar rigidity", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [
          makeAutoSFOp({
            station: 7,
            operation: "bore_rough",
            sfm: 400,
            cutting_diameter: 1.0,
            feed: 0.008,
            bar_diameter: 0.625,
            bar_stickout: 3.0, // L/D = 4.8 → 50% feed
          }),
        ],
      };

      const result = engine.calculate(input);
      const boreResult = result.operations[0];

      expect(boreResult.feed_scaled).toBe(true);
      expect(boreResult.adjusted_feed).toBe(0.004); // 50%
      expect(boreResult.feed_scale_reason).toContain("50%");
    });

    it("predicts surface finish when nose radius provided", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [
          makeAutoSFOp({
            station: 2,
            operation: "od_finish",
            sfm: 800,
            cutting_diameter: 1.875,
            feed: 0.006,
            nose_radius: 0.032,
          }),
        ],
      };

      const result = engine.calculate(input);
      const finishResult = result.operations[0];

      expect(finishResult.predicted_ra_um).toBeDefined();
      expect(finishResult.predicted_ra_um!).toBeGreaterThan(0);
      expect(finishResult.predicted_ra_um!).toBeLessThan(5);
    });

    it("estimates power and warns when exceeded", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        machine_power_kw: 5, // Deliberately low
        operations: [
          makeAutoSFOp({
            station: 1,
            operation: "od_rough",
            sfm: 800,
            cutting_diameter: 2.0,
            feed: 0.020,
            doc: 0.200,
            material_group: "P",
          }),
        ],
      };

      const result = engine.calculate(input);
      const roughResult = result.operations[0];

      expect(roughResult.estimated_power_kw).toBeDefined();
      expect(roughResult.estimated_force_n).toBeDefined();
      expect(roughResult.estimated_force_n!).toBeGreaterThan(0);
      // With heavy DOC on steel, might exceed 5kW
      if (roughResult.estimated_power_kw! > 5) {
        expect(roughResult.power_ok).toBe(false);
        expect(roughResult.warnings.some(w => w.includes("POWER EXCEEDED"))).toBe(true);
      }
    });

    it("generates peck schedule for drill operations", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [
          makeAutoSFOp({
            station: 5,
            operation: "peck_drill",
            sfm: 300,
            cutting_diameter: 0.5,
            doc: 2.0,
            material_group: "P",
          }),
        ],
      };

      const result = engine.calculate(input);
      const drillResult = result.operations[0];

      expect(drillResult.peck_schedule).toBeDefined();
      expect(drillResult.peck_schedule!.length).toBeGreaterThan(1);
      expect(drillResult.peck_schedule![0]).toBe(0.5); // First peck = 1xD for steel
    });

    it("handles metric operations correctly", () => {
      const input: AutoSFInput = {
        unit_system: "metric",
        operations: [
          makeAutoSFOp({
            station: 1,
            operation: "od_rough",
            sfm: 200, // 200 m/min
            cutting_diameter: 50, // 50mm
            feed: 0.3, // 0.3mm/rev
            doc: 2.5,
            material_group: "P",
          }),
        ],
      };

      const result = engine.calculate(input);
      const op = result.operations[0];

      // RPM = 1000*200 / (pi*50) = 1273
      expect(op.calculated_rpm).toBeCloseTo(1273, -1);
    });

    it("returns correct stats", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        machine_max_rpm: 4500,
        operations: [
          makeAutoSFOp({ station: 1, sfm: 600, cutting_diameter: 2.0 }),
          makeAutoSFOp({ station: 5, operation: "drill", sfm: 300, cutting_diameter: 0.125 }),
          makeAutoSFOp({
            station: 7, operation: "bore_rough", sfm: 400, cutting_diameter: 1.0,
            feed: 0.008, bar_diameter: 0.5, bar_stickout: 2.5, // L/D=5
          }),
        ],
      };

      const result = engine.calculate(input);

      expect(result.stats.total_operations).toBe(3);
      expect(result.stats.operations_clamped).toBeGreaterThanOrEqual(1); // drill clamped
      expect(result.stats.operations_feed_scaled).toBeGreaterThanOrEqual(1); // bore scaled
    });
  });
});
