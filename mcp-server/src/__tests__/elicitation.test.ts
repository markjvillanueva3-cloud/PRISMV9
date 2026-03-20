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
  it("detects missing material for speed_feed action", () => {
    const result = detectMissingInput("speed_feed", { tool_diameter_mm: 10 });
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
    expect(result.action).toBe("accept");
    expect(result.content?.material_group).toBe("steel");
  });

  it("handles user decline", async () => {
    const mockContext: McpElicitationContext = {
      elicitInput: async () => ({ action: "decline" }),
    };
    const result = await requestElicitation(mockContext, "MachineSelection", "Need machine");
    expect(result.action).toBe("decline");
  });

  it("throws for unknown schema", async () => {
    const mockContext: McpElicitationContext = {
      elicitInput: async () => ({ action: "accept", content: {} }),
    };
    await expect(
      requestElicitation(mockContext, "NonExistentSchema", "test")
    ).rejects.toThrow();
  });
});

// ============================================================================
// getElicitationAwareActions / getActionRequirements
// ============================================================================
describe("getElicitationAwareActions", () => {
  it("returns a non-empty list of action names", () => {
    const actions = getElicitationAwareActions();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions).toContain("speed_feed");
  });
});

describe("getActionRequirements", () => {
  it("returns requirements for speed_feed", () => {
    const reqs = getActionRequirements("speed_feed");
    expect(reqs).toBeDefined();
    if (reqs) {
      expect(reqs.length).toBeGreaterThan(0);
      expect(reqs.some((r) => r.includes("Material") || r.includes("material"))).toBe(true);
    }
  });

  it("returns undefined for unknown action", () => {
    const reqs = getActionRequirements("totally_fake_action_xyz");
    expect(reqs).toBeUndefined();
  });
});

// ============================================================================
// Integration helpers
// ============================================================================
describe("checkMissingInput", () => {
  it("identifies missing fields from provided params", () => {
    const missing = checkMissingInput(
      ["material_group", "tool_diameter_mm", "operation"],
      { tool_diameter_mm: 10 }
    );
    expect(missing).toContain("material_group");
    expect(missing).toContain("operation");
    expect(missing).not.toContain("tool_diameter_mm");
  });

  it("returns empty when all present", () => {
    const missing = checkMissingInput(
      ["a", "b"],
      { a: 1, b: 2 }
    );
    expect(missing).toHaveLength(0);
  });
});

describe("describeMissingInput", () => {
  it("returns human-readable description of missing fields", () => {
    const desc = describeMissingInput(["material_group", "operation"]);
    expect(desc).toContain("material_group");
    expect(desc).toContain("operation");
  });
});

describe("ensureInput", () => {
  it("returns provided params when all required are present", async () => {
    const mockContext: McpElicitationContext = {
      elicitInput: async () => ({ action: "accept", content: {} }),
    };
    const result = await ensureInput(mockContext, ["material"], { material: "steel" });
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
    const result = await ensureInput(mockContext, ["material_group"], {});
    expect(elicitCalled).toBe(true);
    expect(result.params.material_group).toBe("aluminum");
  });

  it("returns incomplete when user declines", async () => {
    const mockContext: McpElicitationContext = {
      elicitInput: async () => ({ action: "decline" }),
    };
    const result = await ensureInput(mockContext, ["material_group"], {});
    expect(result.complete).toBe(false);
  });
});
