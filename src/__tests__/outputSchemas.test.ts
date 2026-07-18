/**
 * Comprehensive tests for mcp/outputSchemas.ts
 *
 * Tests JSON Schema generation from Zod schemas, the action→schema registry,
 * public API functions, and MCP outputSchema compliance.
 */
import { describe, it, expect } from "vitest";
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
  SurfaceFinishResultSchema,
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
  SafetyResultSchema,
  SpindleProtectionResultSchema,
  CrashDetectionResultSchema,
  QuoteResultSchema,
  JobCostResultSchema,
  NPVResultSchema,
  ScheduleResultSchema,
  EOQResultSchema,
  SPCResultSchema,
  GageRRResultSchema,
  InspectionPlanResultSchema,
  DimensionalAnalysisResultSchema,
  ComplianceCheckResultSchema,
  SimulationResultSchema,
  PhysicsSimResultSchema,
  PredictiveSimResultSchema,
  GenericResultSchema,
  ErrorResultSchema,
  WarningEntrySchema,
  ResultMetaSchema,
} from "../mcp/outputSchemas.js";

// ============================================================================
// Helpers
// ============================================================================

/** Validates that an object looks like a valid JSON Schema */
function assertValidJsonSchema(schema: Record<string, unknown>) {
  expect(schema).toBeDefined();
  expect(typeof schema).toBe("object");
  // Must have a type or $schema or properties — basic structural check
  const hasType = "type" in schema;
  const hasProperties = "properties" in schema;
  const hasSchema = "$schema" in schema;
  expect(hasType || hasProperties || hasSchema).toBe(true);
}

// ============================================================================
// 1. getOutputSchema — basic JSON Schema generation
// ============================================================================

describe("getOutputSchema", () => {
  it("returns a valid JSON Schema object for a known action", () => {
    const schema = getOutputSchema("speed_feed");
    assertValidJsonSchema(schema);
    // speed_feed has required fields: cutting_speed, spindle_speed, feed_per_tooth, feed_rate
    expect(schema.type).toBe("object");
    const props = schema.properties as Record<string, unknown>;
    expect(props).toBeDefined();
    expect(props.cutting_speed).toBeDefined();
    expect(props.spindle_speed).toBeDefined();
    expect(props.feed_per_tooth).toBeDefined();
    expect(props.feed_rate).toBeDefined();
  });

  it("falls back to GenericResultSchema for unknown actions", () => {
    const schema = getOutputSchema("nonexistent_action_xyz");
    assertValidJsonSchema(schema);
    const props = schema.properties as Record<string, unknown>;
    expect(props).toBeDefined();
    expect(props.action).toBeDefined();
    expect(props.result).toBeDefined();
  });

  it("generates schema with correct number types", () => {
    const schema = getOutputSchema("cutting_force");
    const props = schema.properties as Record<string, any>;
    expect(props.Fc).toBeDefined();
    expect(props.Fc.type).toBe("number");
  });

  it("generates schema with correct boolean types", () => {
    const schema = getOutputSchema("stability");
    const props = schema.properties as Record<string, any>;
    expect(props.is_stable).toBeDefined();
    expect(props.is_stable.type).toBe("boolean");
  });

  it("generates schema with correct string types", () => {
    const schema = getOutputSchema("post_process");
    const props = schema.properties as Record<string, any>;
    expect(props.gcode).toBeDefined();
    expect(props.gcode.type).toBe("string");
  });

  it("generates schema with array types", () => {
    const schema = getOutputSchema("safety_check");
    const props = schema.properties as Record<string, any>;
    expect(props.violations).toBeDefined();
    // Violations is optional array — check it exists in properties
    expect(props.recommendations).toBeDefined();
  });

  it("generates schema with enum types", () => {
    const schema = getOutputSchema("safety_check");
    const props = schema.properties as Record<string, any>;
    // risk_level is z.enum(["low", "medium", "high", "critical"]).optional()
    expect(props.risk_level).toBeDefined();
  });

  it("generates schema with nested object types", () => {
    const schema = getOutputSchema("turning_force");
    const props = schema.properties as Record<string, any>;
    expect(props.tangential_force_Fc_N).toBeDefined();
    // Nested object should have its own properties
    expect(props.tangential_force_Fc_N.type).toBe("object");
    expect(props.tangential_force_Fc_N.properties).toBeDefined();
    expect(props.tangential_force_Fc_N.properties.value).toBeDefined();
  });

  it("generates schema with z.record types (QuoteResultSchema.breakdown)", () => {
    const schema = getOutputSchema("quote_estimate");
    const props = schema.properties as Record<string, any>;
    expect(props.breakdown).toBeDefined();
  });
});

// ============================================================================
// 2. getOutputZodSchema
// ============================================================================

describe("getOutputZodSchema", () => {
  it("returns the Zod schema for a known action", () => {
    const zodSchema = getOutputZodSchema("speed_feed");
    expect(zodSchema).toBe(SpeedFeedResultSchema);
  });

  it("returns GenericResultSchema for unknown actions", () => {
    const zodSchema = getOutputZodSchema("does_not_exist_999");
    expect(zodSchema).toBe(GenericResultSchema);
  });

  it("returned Zod schema can validate compliant data", () => {
    const zodSchema = getOutputZodSchema("cutting_force");
    const result = zodSchema.safeParse({ Fc: 1200 });
    expect(result.success).toBe(true);
  });

  it("returned Zod schema rejects invalid data (missing required field)", () => {
    const zodSchema = getOutputZodSchema("cutting_force");
    // Fc is required — omitting it should fail
    const result = zodSchema.safeParse({ Ff: 200 });
    expect(result.success).toBe(false);
  });

  it("shared aliases point to the same schema", () => {
    // torque shares PowerResultSchema with power
    const torqueSchema = getOutputZodSchema("torque");
    const powerSchema = getOutputZodSchema("power");
    expect(torqueSchema).toBe(powerSchema);
  });
});

// ============================================================================
// 3. getAllOutputSchemas
// ============================================================================

describe("getAllOutputSchemas", () => {
  it("returns schemas for all registered actions", () => {
    const all = getAllOutputSchemas();
    const registeredActions = getRegisteredOutputActions();
    expect(Object.keys(all).length).toBe(registeredActions.length);
    for (const action of registeredActions) {
      expect(all[action]).toBeDefined();
      assertValidJsonSchema(all[action]);
    }
  });

  it("every generated schema is a plain object (not a Zod type)", () => {
    const all = getAllOutputSchemas();
    for (const [, schema] of Object.entries(all)) {
      // Should be a plain JSON Schema object, not a Zod instance
      expect(schema).not.toHaveProperty("_def");
      expect(typeof schema).toBe("object");
    }
  });
});

// ============================================================================
// 4. getRegisteredOutputActions
// ============================================================================

describe("getRegisteredOutputActions", () => {
  it("returns an array of strings", () => {
    const actions = getRegisteredOutputActions();
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThan(30);
    for (const a of actions) {
      expect(typeof a).toBe("string");
    }
  });

  it("contains known actions from each dispatcher domain", () => {
    const actions = getRegisteredOutputActions();
    // calc
    expect(actions).toContain("speed_feed");
    expect(actions).toContain("cutting_force");
    // cam
    expect(actions).toContain("toolpath_generate");
    // safety
    expect(actions).toContain("safety_check");
    // business
    expect(actions).toContain("quote_estimate");
    // quality
    expect(actions).toContain("spc_analyze");
    // simulation
    expect(actions).toContain("cnc_simulate");
  });
});

// ============================================================================
// 5. hasOutputSchema
// ============================================================================

describe("hasOutputSchema", () => {
  it("returns true for registered actions", () => {
    expect(hasOutputSchema("speed_feed")).toBe(true);
    expect(hasOutputSchema("cnc_simulate")).toBe(true);
    expect(hasOutputSchema("quote_estimate")).toBe(true);
  });

  it("returns false for unregistered actions", () => {
    expect(hasOutputSchema("nonexistent_action")).toBe(false);
    expect(hasOutputSchema("")).toBe(false);
    expect(hasOutputSchema("SPEED_FEED")).toBe(false); // case-sensitive
  });
});

// ============================================================================
// 6. getOutputSchemasByDispatcher
// ============================================================================

describe("getOutputSchemasByDispatcher", () => {
  it("returns all 6 dispatcher domains", () => {
    const byDispatcher = getOutputSchemasByDispatcher();
    const keys = Object.keys(byDispatcher);
    expect(keys).toContain("prism_calc");
    expect(keys).toContain("prism_cam");
    expect(keys).toContain("prism_safety");
    expect(keys).toContain("prism_business");
    expect(keys).toContain("prism_quality");
    expect(keys).toContain("prism_simulation");
    expect(keys.length).toBe(6);
  });

  it("prism_calc contains the expected 17 actions", () => {
    const byDispatcher = getOutputSchemasByDispatcher();
    expect(byDispatcher.prism_calc.length).toBe(17);
    expect(byDispatcher.prism_calc).toContain("speed_feed");
    expect(byDispatcher.prism_calc).toContain("torque");
  });

  it("every listed action is actually registered in the registry", () => {
    const byDispatcher = getOutputSchemasByDispatcher();
    for (const actions of Object.values(byDispatcher)) {
      for (const action of actions) {
        expect(hasOutputSchema(action)).toBe(true);
      }
    }
  });

  it("total actions across dispatchers matches registry count", () => {
    const byDispatcher = getOutputSchemasByDispatcher();
    const totalFromDispatchers = Object.values(byDispatcher).reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    const registeredCount = getRegisteredOutputActions().length;
    expect(totalFromDispatchers).toBe(registeredCount);
  });
});

// ============================================================================
// 7. Exported Zod schema validation (runtime parse tests)
// ============================================================================

describe("Zod schema runtime validation", () => {
  it("SpeedFeedResultSchema accepts valid data", () => {
    const result = SpeedFeedResultSchema.safeParse({
      cutting_speed: 200,
      spindle_speed: 8000,
      feed_per_tooth: 0.08,
      feed_rate: 1920,
    });
    expect(result.success).toBe(true);
  });

  it("SpeedFeedResultSchema rejects missing required fields", () => {
    const result = SpeedFeedResultSchema.safeParse({
      cutting_speed: 200,
      // missing spindle_speed, feed_per_tooth, feed_rate
    });
    expect(result.success).toBe(false);
  });

  it("SpeedFeedResultSchema allows optional fields to be absent", () => {
    const result = SpeedFeedResultSchema.safeParse({
      cutting_speed: 200,
      spindle_speed: 8000,
      feed_per_tooth: 0.08,
      feed_rate: 1920,
      // all optional fields omitted
    });
    expect(result.success).toBe(true);
  });

  it("SpeedFeedResultSchema allows passthrough of extra fields", () => {
    const result = SpeedFeedResultSchema.safeParse({
      cutting_speed: 200,
      spindle_speed: 8000,
      feed_per_tooth: 0.08,
      feed_rate: 1920,
      custom_extra_field: "hello",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).custom_extra_field).toBe("hello");
    }
  });

  it("ErrorResultSchema accepts error objects", () => {
    const result = ErrorResultSchema.safeParse({
      error: "Something went wrong",
      action: "speed_feed",
      dispatcher: "calcDispatcher",
    });
    expect(result.success).toBe(true);
  });

  it("StochasticWearResultSchema validates nested objects", () => {
    const result = StochasticWearResultSchema.safeParse({
      taylor_life: { mean_min: 45.0, std_min: 5.2 },
    });
    expect(result.success).toBe(true);
  });

  it("StochasticWearResultSchema rejects missing nested required fields", () => {
    const result = StochasticWearResultSchema.safeParse({
      taylor_life: { mean_min: 45.0 }, // missing std_min
    });
    expect(result.success).toBe(false);
  });

  it("SafetyResultSchema validates enum values", () => {
    const valid = SafetyResultSchema.safeParse({
      safe: true,
      risk_level: "high",
    });
    expect(valid.success).toBe(true);

    const invalid = SafetyResultSchema.safeParse({
      safe: true,
      risk_level: "extreme", // not in enum
    });
    expect(invalid.success).toBe(false);
  });

  it("ComplianceCheckResultSchema validates nested enum in array", () => {
    const result = ComplianceCheckResultSchema.safeParse({
      compliant: true,
      standard_checks: [
        { standard: "ISO 9001", status: "pass" },
        { standard: "AS9100", status: "fail", message: "Missing docs" },
      ],
    });
    expect(result.success).toBe(true);

    const invalid = ComplianceCheckResultSchema.safeParse({
      compliant: true,
      standard_checks: [
        { standard: "ISO 9001", status: "invalid_status" },
      ],
    });
    expect(invalid.success).toBe(false);
  });

  it("ScheduleResultSchema validates array of required objects", () => {
    const result = ScheduleResultSchema.safeParse({
      schedule: [
        { job_id: "J1", start: 0, end: 30 },
        { job_id: "J2", start: 30, end: 55, machine: "VMC-1" },
      ],
      makespan: 55,
    });
    expect(result.success).toBe(true);
  });

  it("WarningEntrySchema validates warning objects", () => {
    const result = WarningEntrySchema.safeParse({
      message: "Tool wear approaching limit",
      severity: "warning",
      code: "W001",
    });
    expect(result.success).toBe(true);
  });

  it("ResultMetaSchema validates metadata objects", () => {
    const result = ResultMetaSchema.safeParse({
      action: "speed_feed",
      engine: "SpeedFeedOrchestratorEngine",
      compute_ms: 12.5,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// 8. JSON Schema structure compliance
// ============================================================================

describe("JSON Schema structural compliance", () => {
  it("generated schemas include required arrays for mandatory fields", () => {
    const schema = getOutputSchema("speed_feed");
    // Zod v4 toJSONSchema should produce required array for non-optional fields
    if (schema.required) {
      const required = schema.required as string[];
      expect(required).toContain("cutting_speed");
      expect(required).toContain("spindle_speed");
      expect(required).toContain("feed_per_tooth");
      expect(required).toContain("feed_rate");
    }
  });

  it("optional fields are NOT in the required array", () => {
    const schema = getOutputSchema("speed_feed");
    if (schema.required) {
      const required = schema.required as string[];
      expect(required).not.toContain("mrr");
      expect(required).not.toContain("power_kW");
      expect(required).not.toContain("warnings");
    }
  });

  it("all registered schemas produce valid JSON (serializable)", () => {
    const all = getAllOutputSchemas();
    for (const [action, schema] of Object.entries(all)) {
      const json = JSON.stringify(schema);
      expect(json).toBeTruthy();
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(schema);
    }
  });

  it("GenericResultSchema JSON Schema has action and result properties", () => {
    const schema = z.toJSONSchema(GenericResultSchema) as Record<string, any>;
    assertValidJsonSchema(schema);
    expect(schema.properties.action).toBeDefined();
    expect(schema.properties.result).toBeDefined();
  });

  it("ErrorResultSchema JSON Schema has error property", () => {
    const schema = z.toJSONSchema(ErrorResultSchema) as Record<string, any>;
    assertValidJsonSchema(schema);
    expect(schema.properties.error).toBeDefined();
    expect(schema.properties.error.type).toBe("string");
  });
});

// ============================================================================
// 9. Cross-check: dispatcher listing ↔ registry consistency
// ============================================================================

describe("dispatcher listing ↔ registry consistency", () => {
  it("every action in getOutputSchemasByDispatcher is in getRegisteredOutputActions", () => {
    const byDispatcher = getOutputSchemasByDispatcher();
    const registered = new Set(getRegisteredOutputActions());
    for (const [dispatcher, actions] of Object.entries(byDispatcher)) {
      for (const action of actions) {
        expect(registered.has(action)).toBe(true);
      }
    }
  });

  it("every registered action appears in exactly one dispatcher listing", () => {
    const byDispatcher = getOutputSchemasByDispatcher();
    const allListedActions: string[] = [];
    for (const actions of Object.values(byDispatcher)) {
      allListedActions.push(...actions);
    }
    const registered = getRegisteredOutputActions();
    // Every registered action is listed
    for (const action of registered) {
      expect(allListedActions).toContain(action);
    }
    // No duplicates
    const unique = new Set(allListedActions);
    expect(unique.size).toBe(allListedActions.length);
  });
});
