/**
 * cadDispatcher.inventorBridge.test.ts — U-CAD-FIDX-INV-INT-01 dispatcher tests
 *
 * Round-trip tests for the Inventor planning↔execution bridge actions
 * (cad_inventor_plan_execution, cad_inventor_render_ilogic).
 *
 * @see src/engines/InventorCADExecutionBridge.ts
 * @see src/tools/dispatchers/cadDispatcher.ts (cad_inventor_plan_execution, cad_inventor_render_ilogic)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool not registered");
  handler = tool.handler;
});

describe("cadDispatcher Inventor planning↔execution bridge (U-CAD-FIDX-INV-INT-01)", () => {
  describe("cad_inventor_plan_execution", () => {
    it("plans EXTRUDE with the full Geometry + Operation tab payload", async () => {
      const r = await invoke("cad_inventor_plan_execution", {
        module_id: "part_operations",
        operation_id: "EXTRUDE",
        params: {
          Profile: "Sketch1",
          Termination: "distance",
          Distance: 25,
          "Boolean Op": "join",
        },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect(plan.module_id).toBe("part_operations");
      expect(plan.operation_id).toBe("EXTRUDE");
      expect(plan.category).toBe("Part_Sweep_Extrude");
      expect(String(plan.inventor_api)).toContain(
        "ComponentDefinition.Features.ExtrudeFeatures.AddByDistanceExtent",
      );
      expect(plan.preselect_required).toEqual(["Profile", "To Face"]);
    });

    it("returns dispatcherError when module_id is omitted", async () => {
      const r = await invoke("cad_inventor_plan_execution", {
        operation_id: "EXTRUDE",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("requires module_id and operation_id");
    });

    it("returns dispatcherError when operation_id is omitted", async () => {
      const r = await invoke("cad_inventor_plan_execution", {
        module_id: "part_operations",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("requires module_id and operation_id");
    });

    it("propagates the engine's catalog-not-found message via dispatcherError envelope", async () => {
      const r = await invoke("cad_inventor_plan_execution", {
        module_id: "part_operations",
        operation_id: "OP_THAT_DOES_NOT_EXIST",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("operation not found");
      expect(String(r.error)).toContain("part_operations/OP_THAT_DOES_NOT_EXIST");
    });

    it("accepts the parameters alias for params payload (camel/snake tolerance)", async () => {
      const r = await invoke("cad_inventor_plan_execution", {
        moduleId: "part_operations",
        operationId: "EXTRUDE",
        parameters: {
          Profile: "S1",
          Termination: "distance",
          "Boolean Op": "join",
          Distance: 12,
        },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect((plan.provided_params as Record<string, unknown>).Distance).toBe(12);
    });
  });

  describe("cad_inventor_render_ilogic", () => {
    it("plans + renders an iLogic VB.NET snippet for EXTRUDE", async () => {
      const r = await invoke("cad_inventor_render_ilogic", {
        module_id: "part_operations",
        operation_id: "EXTRUDE",
        params: {
          Profile: "Sketch1",
          Termination: "distance",
          Distance: 25,
          "Boolean Op": "join",
        },
      });
      expect(r.success).toBe(true);
      const ilogic = r.ilogic_snippet as string;
      expect(typeof ilogic).toBe("string");
      expect(ilogic).toContain("Dim oApp As Inventor.Application = ThisApplication");
      expect(ilogic).toContain("Dim oCompDef As ComponentDefinition = oDoc.ComponentDefinition");
      expect(ilogic).toContain("oCompDef.Features.ExtrudeFeatures.AddByDistanceExtent(");
      expect(ilogic).toContain(`' Profile = "Sketch1"`);
      expect(ilogic).toContain("' Distance = 25");
    });

    it("returns dispatcherError when module_id is omitted", async () => {
      const r = await invoke("cad_inventor_render_ilogic", {
        operation_id: "EXTRUDE",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("requires module_id and operation_id");
    });

    it("includes both the structured plan and the rendered iLogic snippet", async () => {
      const r = await invoke("cad_inventor_render_ilogic", {
        module_id: "part_operations",
        operation_id: "EXTRUDE",
        params: { Profile: "S1", Termination: "distance", "Boolean Op": "join" },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect(plan.module_id).toBe("part_operations");
      const ilogic = r.ilogic_snippet as string;
      expect(ilogic.length).toBeGreaterThan(100);
      expect(ilogic).toContain("' Operation: part_operations/EXTRUDE");
    });
  });
});
