/**
 * Output Schemas — MCP outputSchema integration tests
 *
 * Validates:
 * 1. z.toJSONSchema produces valid JSON Schema for all output schemas
 * 2. getOutputSchema returns correct schema for known actions
 * 3. Output schemas match expected structure (Zod validation)
 * 4. Registry completeness and consistency
 * 5. wrapWithOutputSchema handler wrapper behavior
 * 6. getDispatcherOutputSchema integration
 * 7. JSON Schema structural correctness
 */

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import {
  getOutputSchema,
  getOutputZodSchema,
  getAllOutputSchemas,
  getRegisteredOutputActions,
  hasOutputSchema,
  getOutputSchemasByDispatcher,
  SpeedFeedResultSchema,
  ForceResultSchema,
  ToolLifeResultSchema,
  SafetyResultSchema,
  QuoteResultSchema,
  SurfaceFinishResultSchema,
  SimulationResultSchema,
  SPCResultSchema,
  GenericResultSchema,
  ErrorResultSchema,
  PowerResultSchema,
  MRRResultSchema,
  DeflectionResultSchema,
  ThermalResultSchema,
  StabilityResultSchema,
  ChipLoadResultSchema,
  DrillingForceResultSchema,
  TurningForceResultSchema,
  WearProgressionResultSchema,
  CostOptimizeResultSchema,
  CapabilityPredictResultSchema,
  StochasticWearResultSchema,
  ToolpathGenerateResultSchema,
  StrategyRecommendResultSchema,
  PostProcessResultSchema,
  CollisionCheckResultSchema,
  CycleTimeResultSchema,
  SpindleProtectionResultSchema,
  CrashDetectionResultSchema,
  JobCostResultSchema,
  NPVResultSchema,
  ScheduleResultSchema,
  EOQResultSchema,
  GageRRResultSchema,
  InspectionPlanResultSchema,
  DimensionalAnalysisResultSchema,
  ComplianceCheckResultSchema,
  PhysicsSimResultSchema,
  PredictiveSimResultSchema,
} from "../mcp/outputSchemas.js";
import {
  wrapWithOutputSchema,
  getDispatcherOutputSchema,
} from "../mcp/registerToolWithOutput.js";

// ============================================================================
// 1. z.toJSONSchema produces valid JSON Schema for all output schemas
// ============================================================================

describe("z.toJSONSchema produces valid JSON Schema", () => {
  const schemas: [string, z.ZodType][] = [
    ["SpeedFeedResult", SpeedFeedResultSchema],
    ["ForceResult", ForceResultSchema],
    ["ToolLifeResult", ToolLifeResultSchema],
    ["SurfaceFinishResult", SurfaceFinishResultSchema],
    ["PowerResult", PowerResultSchema],
    ["MRRResult", MRRResultSchema],
    ["DeflectionResult", DeflectionResultSchema],
    ["ThermalResult", ThermalResultSchema],
    ["StabilityResult", StabilityResultSchema],
    ["ChipLoadResult", ChipLoadResultSchema],
    ["DrillingForceResult", DrillingForceResultSchema],
    ["TurningForceResult", TurningForceResultSchema],
    ["WearProgressionResult", WearProgressionResultSchema],
    ["CostOptimizeResult", CostOptimizeResultSchema],
    ["CapabilityPredictResult", CapabilityPredictResultSchema],
    ["StochasticWearResult", StochasticWearResultSchema],
    ["SafetyResult", SafetyResultSchema],
    ["SpindleProtectionResult", SpindleProtectionResultSchema],
    ["CrashDetectionResult", CrashDetectionResultSchema],
    ["QuoteResult", QuoteResultSchema],
    ["JobCostResult", JobCostResultSchema],
    ["NPVResult", NPVResultSchema],
    ["ScheduleResult", ScheduleResultSchema],
    ["EOQResult", EOQResultSchema],
    ["SPCResult", SPCResultSchema],
    ["GageRRResult", GageRRResultSchema],
    ["InspectionPlanResult", InspectionPlanResultSchema],
    ["DimensionalAnalysisResult", DimensionalAnalysisResultSchema],
    ["ComplianceCheckResult", ComplianceCheckResultSchema],
    ["SimulationResult", SimulationResultSchema],
    ["PhysicsSimResult", PhysicsSimResultSchema],
    ["PredictiveSimResult", PredictiveSimResultSchema],
    ["ToolpathGenerateResult", ToolpathGenerateResultSchema],
    ["StrategyRecommendResult", StrategyRecommendResultSchema],
    ["PostProcessResult", PostProcessResultSchema],
    ["CollisionCheckResult", CollisionCheckResultSchema],
    ["CycleTimeResult", CycleTimeResultSchema],
    ["GenericResult", GenericResultSchema],
    ["ErrorResult", ErrorResultSchema],
  ];

  for (const [name, schema] of schemas) {
    it(`${name} converts to valid JSON Schema`, () => {
      const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
      expect(jsonSchema).toBeDefined();
      expect(jsonSchema.type).toBe("object");
      expect(jsonSchema).toHaveProperty("properties");
      // Zod v4 uses draft 2020-12
      expect(jsonSchema.$schema).toContain("json-schema.org");
    });
  }
});

// ============================================================================
// 2. getOutputSchema returns correct schema for known actions
// ============================================================================

describe("getOutputSchema", () => {
  it("returns schema for speed_feed action", () => {
    const schema = getOutputSchema("speed_feed");
    expect(schema).toBeDefined();
    expect(schema.type).toBe("object");
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("cutting_speed");
    expect(props).toHaveProperty("spindle_speed");
    expect(props).toHaveProperty("feed_per_tooth");
    expect(props).toHaveProperty("feed_rate");
  });

  it("returns schema for cutting_force action", () => {
    const schema = getOutputSchema("cutting_force");
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("Fc");
    expect(props).toHaveProperty("torque");
    expect(props).toHaveProperty("power");
  });

  it("returns schema for tool_life action", () => {
    const schema = getOutputSchema("tool_life");
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("tool_life_minutes");
    expect(props).toHaveProperty("wear_model");
  });

  it("returns schema for safety_check action", () => {
    const schema = getOutputSchema("safety_check");
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("safe");
    expect(props).toHaveProperty("violations");
    expect(props).toHaveProperty("risk_level");
  });

  it("returns schema for quote_estimate action", () => {
    const schema = getOutputSchema("quote_estimate");
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("material_cost");
    expect(props).toHaveProperty("total");
    expect(props).toHaveProperty("cycle_time_min");
  });

  it("returns schema for spc_analyze action", () => {
    const schema = getOutputSchema("spc_analyze");
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("in_control");
    expect(props).toHaveProperty("cpk");
  });

  it("returns schema for cnc_simulate action", () => {
    const schema = getOutputSchema("cnc_simulate");
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("blocks_processed");
    expect(props).toHaveProperty("forces");
    expect(props).toHaveProperty("tool_wear_progression");
  });

  it("returns GenericResultSchema for unknown actions", () => {
    const schema = getOutputSchema("nonexistent_action_xyz");
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("action");
    expect(props).toHaveProperty("result");
  });

  it("returns schema with additionalProperties allowed", () => {
    const schema = getOutputSchema("speed_feed");
    // Zod v4 passthrough uses additionalProperties: {}
    expect(schema.additionalProperties).toBeDefined();
    expect(schema.additionalProperties).not.toBe(false);
  });
});

// ============================================================================
// 3. Output schemas validate expected data shapes
// ============================================================================

describe("Output schemas validate data shapes", () => {
  it("SpeedFeedResultSchema accepts valid data", () => {
    const data = {
      cutting_speed: 200,
      spindle_speed: 5000,
      feed_per_tooth: 0.1,
      feed_rate: 2000,
      mrr: 50,
      power_kW: 5.5,
    };
    const result = SpeedFeedResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("SpeedFeedResultSchema rejects non-numeric speed", () => {
    const data = {
      cutting_speed: "fast",
      spindle_speed: 5000,
      feed_per_tooth: 0.1,
      feed_rate: 2000,
    };
    const result = SpeedFeedResultSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("ForceResultSchema accepts valid force data", () => {
    const data = {
      Fc: 1200,
      Ff: 400,
      Fp: 300,
      torque: 15.2,
      power: 3.8,
    };
    const result = ForceResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("SafetyResultSchema accepts valid safety data", () => {
    const data = {
      safe: false,
      violations: [
        {
          severity: "critical",
          message: "Spindle speed exceeds machine limit",
          line: 42,
        },
      ],
      risk_level: "high",
      score: 35,
    };
    const result = SafetyResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("QuoteResultSchema accepts valid quote data", () => {
    const data = {
      material_cost: 25.50,
      labor_cost: 45.00,
      overhead: 12.00,
      total: 92.50,
      cycle_time_min: 8.5,
    };
    const result = QuoteResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("SimulationResultSchema accepts complex sim data", () => {
    const data = {
      blocks_processed: 150,
      total_time_sec: 45.2,
      forces: [
        { block: 1, Fc_N: 800, power_kW: 2.1 },
        { block: 2, Fc_N: 950, power_kW: 2.5 },
      ],
      tool_wear_progression: [
        { block: 50, vb_mm: 0.12 },
        { block: 100, vb_mm: 0.18 },
      ],
    };
    const result = SimulationResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("ToolLifeResultSchema accepts valid tool life data", () => {
    const data = {
      tool_life_minutes: 45,
      parts_count: 120,
      wear_rate: 0.003,
      confidence: 0.85,
      wear_model: "taylor",
    };
    const result = ToolLifeResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("SPCResultSchema accepts valid SPC data", () => {
    const data = {
      in_control: true,
      cpk: 1.67,
      cp: 2.0,
      mean: 10.002,
      std_dev: 0.003,
      ucl: 10.011,
      lcl: 9.993,
    };
    const result = SPCResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("schemas pass through extra properties", () => {
    const data = {
      Fc: 1000,
      custom_engine_field: "extra",
      _internal: true,
    };
    const result = ForceResultSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.custom_engine_field).toBe("extra");
    }
  });
});

// ============================================================================
// 4. Registry completeness and consistency
// ============================================================================

describe("Output schema registry", () => {
  it("getRegisteredOutputActions returns 40+ actions", () => {
    const actions = getRegisteredOutputActions();
    expect(actions.length).toBeGreaterThan(40);
  });

  it("hasOutputSchema returns true for registered actions", () => {
    expect(hasOutputSchema("speed_feed")).toBe(true);
    expect(hasOutputSchema("cutting_force")).toBe(true);
    expect(hasOutputSchema("tool_life")).toBe(true);
    expect(hasOutputSchema("safety_check")).toBe(true);
    expect(hasOutputSchema("quote_estimate")).toBe(true);
    expect(hasOutputSchema("spc_analyze")).toBe(true);
    expect(hasOutputSchema("cnc_simulate")).toBe(true);
  });

  it("hasOutputSchema returns false for unknown actions", () => {
    expect(hasOutputSchema("nonexistent_xyz")).toBe(false);
  });

  it("getAllOutputSchemas returns schemas for all registered", () => {
    const all = getAllOutputSchemas();
    const actions = getRegisteredOutputActions();
    expect(Object.keys(all).length).toBe(actions.length);
    for (const action of actions) {
      expect(all[action]).toBeDefined();
      expect(all[action].type).toBe("object");
    }
  });

  it("getOutputSchemasByDispatcher covers all dispatchers", () => {
    const map = getOutputSchemasByDispatcher();
    expect(map).toHaveProperty("prism_calc");
    expect(map).toHaveProperty("prism_cam");
    expect(map).toHaveProperty("prism_safety");
    expect(map).toHaveProperty("prism_business");
    expect(map).toHaveProperty("prism_quality");
    expect(map).toHaveProperty("prism_simulation");
  });

  it("dispatcher action lists are non-empty", () => {
    const map = getOutputSchemasByDispatcher();
    for (const [dispatcher, actions] of Object.entries(map)) {
      expect(
        actions.length,
        `${dispatcher} should have actions`,
      ).toBeGreaterThan(0);
    }
  });

  it("all actions in dispatcher map have schemas", () => {
    const map = getOutputSchemasByDispatcher();
    for (const actions of Object.values(map)) {
      for (const action of actions) {
        expect(
          hasOutputSchema(action),
          `${action} should have a registered schema`,
        ).toBe(true);
      }
    }
  });

  it("getOutputZodSchema returns Zod types", () => {
    const schema = getOutputZodSchema("speed_feed");
    expect(schema).toBeDefined();
    const result = schema.safeParse({
      cutting_speed: 200,
      spindle_speed: 5000,
      feed_per_tooth: 0.1,
      feed_rate: 2000,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// 5. wrapWithOutputSchema handler wrapper
// ============================================================================

describe("wrapWithOutputSchema", () => {
  it("adds structuredContent for actions with output schema", async () => {
    const mockHandler = vi.fn().mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          cutting_speed: 200,
          spindle_speed: 5000,
        }),
      }],
    });

    const wrapped = wrapWithOutputSchema(mockHandler);
    const result = await wrapped(
      { action: "speed_feed", params: {} },
      {},
    );

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent.cutting_speed).toBe(200);
    // Preserves original content array
    expect(result.content).toBeDefined();
  });

  it("leaves result unchanged for unknown actions", async () => {
    const original = {
      content: [{ type: "text", text: '{"data": 42}' }],
    };
    const mockHandler = vi.fn().mockResolvedValue(original);

    const wrapped = wrapWithOutputSchema(mockHandler);
    const result = await wrapped(
      { action: "unknown_action_xyz", params: {} },
      {},
    );

    expect(result).toEqual(original);
    expect(result.structuredContent).toBeUndefined();
  });

  it("leaves result unchanged when no action param", async () => {
    const original = {
      content: [{ type: "text", text: '{"ok": true}' }],
    };
    const mockHandler = vi.fn().mockResolvedValue(original);

    const wrapped = wrapWithOutputSchema(mockHandler);
    const result = await wrapped({}, {});

    expect(result).toEqual(original);
  });

  it("does not override existing structuredContent", async () => {
    const existing = { custom: "data" };
    const mockHandler = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: '{"other": 1}' }],
      structuredContent: existing,
    });

    const wrapped = wrapWithOutputSchema(mockHandler);
    const result = await wrapped(
      { action: "speed_feed", params: {} },
      {},
    );

    expect(result.structuredContent).toBe(existing);
  });

  it("handles non-JSON content gracefully", async () => {
    const mockHandler = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
    });

    const wrapped = wrapWithOutputSchema(mockHandler);
    const result = await wrapped(
      { action: "speed_feed", params: {} },
      {},
    );

    expect(result.structuredContent).toBeUndefined();
  });
});

// ============================================================================
// 6. getDispatcherOutputSchema
// ============================================================================

describe("getDispatcherOutputSchema", () => {
  it("returns schema for prism_calc", () => {
    const schema = getDispatcherOutputSchema("prism_calc");
    expect(schema).toBeDefined();
    expect(schema!.type).toBe("object");
    expect(schema!.additionalProperties).toBe(true);
  });

  it("returns schema for prism_business", () => {
    const schema = getDispatcherOutputSchema("prism_business");
    expect(schema).toBeDefined();
  });

  it("returns undefined for unknown dispatcher", () => {
    const schema = getDispatcherOutputSchema("prism_unknown_xyz");
    expect(schema).toBeUndefined();
  });

  it("schema description mentions available actions", () => {
    const schema = getDispatcherOutputSchema("prism_calc");
    const desc = schema!.description as string;
    expect(desc).toContain("speed_feed");
    expect(desc).toContain("cutting_force");
  });
});

// ============================================================================
// 7. JSON Schema structural correctness
// ============================================================================

describe("JSON Schema structure", () => {
  it("speed_feed schema has required fields marked", () => {
    const schema = getOutputSchema("speed_feed");
    const required = schema.required as string[];
    expect(required).toContain("cutting_speed");
    expect(required).toContain("spindle_speed");
    expect(required).toContain("feed_per_tooth");
    expect(required).toContain("feed_rate");
  });

  it("safety schema has boolean safe field", () => {
    const schema = getOutputSchema("safety_check");
    const props = schema.properties as Record<
      string, { type?: string }
    >;
    expect(props.safe.type).toBe("boolean");
  });

  it("schemas include descriptions on key fields", () => {
    const schema = getOutputSchema("speed_feed");
    const props = schema.properties as Record<
      string, { description?: string }
    >;
    expect(props.cutting_speed.description).toBeDefined();
    expect(props.cutting_speed.description).toContain("m/min");
  });

  it("force schema Fc is a required number", () => {
    const schema = getOutputSchema("cutting_force");
    const props = schema.properties as Record<
      string, { type?: string }
    >;
    expect(props.Fc.type).toBe("number");
    const required = schema.required as string[];
    expect(required).toContain("Fc");
  });

  it("quote schema total and material_cost are required", () => {
    const schema = getOutputSchema("quote_estimate");
    const required = schema.required as string[];
    expect(required).toContain("total");
    expect(required).toContain("material_cost");
  });

  it("all schemas are valid JSON Schema objects", () => {
    const all = getAllOutputSchemas();
    for (const [name, schema] of Object.entries(all)) {
      expect(
        schema.type,
        `${name} should have type: object`,
      ).toBe("object");
      expect(
        schema.properties,
        `${name} should have properties`,
      ).toBeDefined();
    }
  });

  it("simulation schema has array-typed forces field", () => {
    const schema = getOutputSchema("cnc_simulate");
    const props = schema.properties as Record<
      string, { type?: string }
    >;
    expect(props.forces.type).toBe("array");
  });

  it("SPC schema in_control is required boolean", () => {
    const schema = getOutputSchema("spc_analyze");
    const props = schema.properties as Record<
      string, { type?: string }
    >;
    expect(props.in_control.type).toBe("boolean");
    const required = schema.required as string[];
    expect(required).toContain("in_control");
  });
});
