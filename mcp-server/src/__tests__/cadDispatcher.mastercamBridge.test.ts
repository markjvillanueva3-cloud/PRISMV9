/**
 * cadDispatcher.mastercamBridge.test.ts — U-CAD-FIDX-MC-INT-01 dispatcher tests
 *
 * Round-trip tests for the Mastercam planning↔execution bridge actions
 * (cad_mastercam_plan_execution, cad_mastercam_render_csharp).
 *
 * @see src/engines/MastercamCADExecutionBridge.ts
 * @see src/tools/dispatchers/cadDispatcher.ts
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

describe("cadDispatcher Mastercam planning↔execution bridge (U-CAD-FIDX-MC-INT-01)", () => {
  describe("cad_mastercam_plan_execution", () => {
    it("plans LINE_ENDPOINTS with full payload", async () => {
      const r = await invoke("cad_mastercam_plan_execution", {
        module_id: "wireframe_operations",
        operation_id: "LINE_ENDPOINTS",
        params: {
          "Endpoint 1": "P1",
          "Endpoint 2": "P2",
          "Length Mode": "absolute_3d",
          Length: 100,
        },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect(plan.module_id).toBe("wireframe_operations");
      expect(plan.operation_id).toBe("LINE_ENDPOINTS");
      expect(plan.mastercam_command).toBe("WireframeLineEndpoints");
      expect(plan.mastercam_api).toBe("Mastercam.Curves.LineCreator.CreateByEndpoints");
      expect(plan.preselect_required).toContain("Endpoint 1");
      expect(plan.preselect_required).toContain("Endpoint 2");
    });

    it("returns dispatcherError when module_id is omitted", async () => {
      const r = await invoke("cad_mastercam_plan_execution", {
        operation_id: "LINE_ENDPOINTS",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("requires module_id and operation_id");
    });

    it("returns dispatcherError when operation_id is omitted", async () => {
      const r = await invoke("cad_mastercam_plan_execution", {
        module_id: "wireframe_operations",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("requires module_id and operation_id");
    });

    it("propagates engine catalog-not-found via dispatcherError envelope", async () => {
      const r = await invoke("cad_mastercam_plan_execution", {
        module_id: "wireframe_operations",
        operation_id: "OP_THAT_DOES_NOT_EXIST",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("operation not found");
      expect(String(r.error)).toContain("wireframe_operations/OP_THAT_DOES_NOT_EXIST");
    });

    it("accepts the parameters alias for params payload", async () => {
      const r = await invoke("cad_mastercam_plan_execution", {
        moduleId: "wireframe_operations",
        operationId: "LINE_ENDPOINTS",
        parameters: { "Endpoint 1": "P1", "Endpoint 2": "P2", Length: 25 },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect((plan.provided_params as Record<string, unknown>).Length).toBe(25);
    });
  });

  describe("cad_mastercam_render_csharp", () => {
    it("plans + renders a NET-Hook C# scaffold for LINE_ENDPOINTS", async () => {
      const r = await invoke("cad_mastercam_render_csharp", {
        module_id: "wireframe_operations",
        operation_id: "LINE_ENDPOINTS",
        params: { "Endpoint 1": "P1", "Endpoint 2": "P2", Length: 50 },
      });
      expect(r.success).toBe(true);
      const csharp = r.csharp_scaffold as string;
      expect(typeof csharp).toBe("string");
      expect(csharp).toContain("public class GeneratedAddin : Mastercam.App.NETHook");
      expect(csharp).toContain("var result = Mastercam.Curves.LineCreator.CreateByEndpoints(");
      expect(csharp).toContain("// Length = 50");
      expect(csharp).toContain("using Mastercam.Curves;");
    });

    it("returns dispatcherError when module_id is omitted", async () => {
      const r = await invoke("cad_mastercam_render_csharp", {
        operation_id: "LINE_ENDPOINTS",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("requires module_id and operation_id");
    });

    it("includes both the structured plan and the rendered C# scaffold", async () => {
      const r = await invoke("cad_mastercam_render_csharp", {
        module_id: "wireframe_operations",
        operation_id: "LINE_ENDPOINTS",
        params: { "Endpoint 1": "P1", "Endpoint 2": "P2" },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect(plan.module_id).toBe("wireframe_operations");
      const csharp = r.csharp_scaffold as string;
      expect(csharp.length).toBeGreaterThan(100);
      expect(csharp).toContain("// Operation: wireframe_operations/LINE_ENDPOINTS");
    });
  });
});
