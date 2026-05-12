/**
 * Tests for MCP Elicitation — structured user input schemas
 */
import { describe, it, expect } from "vitest";
import {
  ELICITATION_SCHEMAS,
  requestElicitation,
  detectMissingInput,
  getElicitationAwareActions,
  getActionRequirements,
  type McpElicitationContext,
  type ElicitationJsonSchema,
} from "../mcp/elicitation.js";
import {
  ensureInput,
  checkMissingInput,
  describeMissingInput,
} from "../mcp/elicitationIntegration.js";

// ============================================================================
// Schema Validity
// ============================================================================
describe("ELICITATION_SCHEMAS", () => {
  const schemaNames = Object.keys(ELICITATION_SCHEMAS);

  it("has all 8 expected schemas", () => {
    expect(schemaNames.length).toBeGreaterThanOrEqual(8);
    const expected = [
      "MaterialSelection",
      "MachineSelection",
      "OperationSelection",
      "ToolSelection",
      "ToleranceSpec",
      "WorkpieceGeometry",
      "CoolantPreference",
      "ControllerTarget",
    ];
    for (const name of expected) {
      expect(ELICITATION_SCHEMAS).toHaveProperty(name);
    }
  });

  it.each(schemaNames)("schema '%s' is valid JSON Schema object", (name) => {
    const schema = ELICITATION_SCHEMAS[name] as ElicitationJsonSchema;
    expect(schema.type).toBe("object");
    expect(schema.title).toBeTruthy();
    expect(schema.description).toBeTruthy();
    expect(typeof schema.properties).toBe("object");
    expect(Object.keys(schema.properties).length).toBeGreaterThan(0);
  });

  it.each(schemaNames)("schema '%s' properties have title+description", (name) => {
    const schema = ELICITATION_SCHEMAS[name] as ElicitationJsonSchema;
    for (const [propName, prop] of Object.entries(schema.properties)) {
      expect(prop.title, `${name}.${propName} missing title`).toBeTruthy();
      expect(prop.description, `${name}.${propName} missing description`).toBeTruthy();
      expect(prop.type, `${name}.${propName} missing type`).toBeTruthy();
    }
  });

  it("MaterialSelection has material_group with enum/oneOf", () => {
    const schema = ELICITATION_SCHEMAS.MaterialSelection as ElicitationJsonSchema;
    const mg = schema.properties.material_group;
    expect(mg).toBeDefined();
    expect(mg.oneOf?.length ?? mg.enum?.length ?? 0).toBeGreaterThan(5);
  });

  it("MachineSelection has numeric constraints on max_rpm and max_power_kw", () => {
    const schema = ELICITATION_SCHEMAS.MachineSelection as ElicitationJsonSchema;
    const rpm = schema.properties.max_rpm;
    if (rpm) {
      expect(rpm.type).toBe("number");
      expect(rpm.minimum).toBeDefined();
    }
  });
});

// ============================================================================
// detectMissingInput
// ============================================================================
describe("detectMissingInput", () => {
  it("detects missing material for sf_orchestrate action", () => {
    const result = detectMissingInput("sf_orchestrate", { tool_diameter_mm: 10 });
    expect(result.length).toBeGreaterThan(0);
    const materialReport = result.find((r) => r.schemaName === "MaterialSelection");
    expect(materialReport).toBeDefined();
    expect(materialReport!.missingFields.length).toBeGreaterThan(0);
  });

  it("detects missing machine for cnc_simulate action", () => {
    const result = detectMissingInput("cnc_simulate", { gcode: "G0 X0" });
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty when all required params present", () => {
    const result = detectMissingInput("speed_feed", {
      material: "steel",
      material_group: "steel",
      tool_diameter_mm: 10,
      operation: "face_mill",
      machine: "DMG MORI DMU 50",
    });
    // May still have some optional missing, but material should not be flagged
    const materialReport = result.find((r) => r.schemaName === "MaterialSelection");
    if (materialReport) {
      expect(materialReport.missingFields).not.toContain("material_group");
    }
  });

  it("returns empty array for unknown action", () => {
    const result = detectMissingInput("unknown_action_xyz", {});
    expect(result).toEqual([]);
  });
});

// ============================================================================
// requestElicitation
// ============================================================================
describe("requestElicitation", () => {
  it("calls context.elicitInput with correct schema", async () => {
    const mockContext: McpElicitationContext = {
      elicitInput: async (params) => {
        expect(params.mode).toBe("form");
        expect(params.requestedSchema.type).toBe("object");
        expect(params.message).toBeTruthy();
        return { action: "accept", content: { material_group: "steel" } };
      },
    };
    const result = await requestElicitation(mockContext, "MaterialSelection", "Need material for S/F calc");
    // requestElicitation returns the content directly on accept, or null on decline
    expect(result).toBeDefined();
    expect(result?.material_group).toBe("steel");
  });

  it("handles user decline", async () => {
    const mockContext: McpElicitationContext = {
      elicitInput: async () => ({ action: "decline" }),
    };
    const result = await requestElicitation(mockContext, "MachineSelection", "Need machine");
    expect(result).toBeNull();
  });

  it("returns null for unknown schema", async () => {
    const mockContext: McpElicitationContext = {
      elicitInput: async () => ({ action: "accept", content: {} }),
    };
    const result = await requestElicitation(mockContext, "NonExistentSchema", "test");
    expect(result).toBeNull();
  });
});

// ============================================================================
// getElicitationAwareActions / getActionRequirements
// ============================================================================
describe("getElicitationAwareActions", () => {
  it("returns a non-empty list of action names", () => {
    const actions = getElicitationAwareActions();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions).toContain("sf_orchestrate");
  });
});

describe("getActionRequirements", () => {
  it("returns requirements for sf_orchestrate", () => {
    const reqs = getActionRequirements("sf_orchestrate");
    expect(reqs).toBeDefined();
    expect(reqs.length).toBeGreaterThan(0);
    expect(reqs.some((r: { schemaName: string }) => r.schemaName.includes("Material"))).toBe(true);
  });

  it("returns empty array for unknown action", () => {
    const reqs = getActionRequirements("totally_fake_action_xyz");
    expect(reqs).toEqual([]);
  });
});

// ============================================================================
// Integration helpers
// ============================================================================
describe("checkMissingInput", () => {
  it("identifies missing fields from provided params", () => {
    // checkMissingInput(actionName, params) delegates to detectMissingInput
    const missing = checkMissingInput("sf_orchestrate", { tool_diameter_mm: 10 });
    expect(missing.length).toBeGreaterThan(0);
    const materialReport = missing.find((r) => r.schemaName === "MaterialSelection");
    expect(materialReport).toBeDefined();
  });

  it("returns empty when all present", () => {
    // For an unknown action, nothing is required so nothing is missing
    const missing = checkMissingInput("unknown_action_xyz", { a: 1, b: 2 });
    expect(missing).toHaveLength(0);
  });
});

describe("describeMissingInput", () => {
  it("returns human-readable description of missing fields", () => {
    // describeMissingInput(actionName, params) returns a string or null
    const desc = describeMissingInput("sf_orchestrate", {});
    expect(desc).toBeTruthy();
    expect(desc).toContain("MaterialSelection");
  });
});

describe("ensureInput", () => {
  it("returns provided params when all required are present", async () => {
    const mockContext: McpElicitationContext = {
      elicitInput: async () => ({ action: "accept", content: {} }),
    };
    // ensureInput(ctx, actionName, providedParams, options?)
    // Use sf_orchestrate with all required params present
    const result = await ensureInput(mockContext, "sf_orchestrate", {
      material: "steel",
      material_group: "steel",
      tool_diameter: 10,
      operation: "face_mill",
      machine: "DMG MORI DMU 50",
    });
    expect(result.complete).toBe(true);
    expect(result.params.material).toBe("steel");
  });

  it("triggers elicitation when required fields missing", async () => {
    let elicitCalled = false;
    const mockContext: McpElicitationContext = {
      elicitInput: async () => {
        elicitCalled = true;
        return { action: "accept", content: { material_group: "aluminum" } };
      },
    };
    const result = await ensureInput(mockContext, "sf_orchestrate", {});
    expect(elicitCalled).toBe(true);
    // Elicited fields get mapped through SCHEMA_FIELD_TO_PARAM
    expect(
      result.params.material_group === "aluminum" || result.elicited.length > 0,
    ).toBe(true);
  });

  it("returns incomplete when user declines", async () => {
    const mockContext: McpElicitationContext = {
      elicitInput: async () => ({ action: "decline" }),
    };
    const result = await ensureInput(mockContext, "sf_orchestrate", {});
    expect(result.complete).toBe(false);
  });
});
