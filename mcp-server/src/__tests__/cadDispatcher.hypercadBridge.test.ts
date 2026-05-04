/**
 * cadDispatcher.hypercadBridge.test.ts — U-CAD-FIDX-HC-INT-01 dispatcher tests
 *
 * Round-trip tests for the HyperCAD-S planning↔execution bridge actions
 * (cad_hypercad_plan_execution, cad_hypercad_render_macro).
 *
 * @see src/engines/HyperCADCADExecutionBridge.ts
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

describe("cadDispatcher HyperCAD-S planning↔execution bridge (U-CAD-FIDX-HC-INT-01)", () => {
  describe("cad_hypercad_plan_execution", () => {
    it("plans CIRCLE and exposes macro path + sentinel-resolution flag", async () => {
      const r = await invoke("cad_hypercad_plan_execution", {
        module_id: "sketch_operations",
        operation_id: "CIRCLE",
        params: { "Sketch Plane": "Top", Mode: "center_radius", Radius: 25 },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect(plan.module_id).toBe("sketch_operations");
      expect(plan.operation_id).toBe("CIRCLE");
      expect(plan.hypercad_macro).toBe("SKETCH.CIRCLE.CREATE");
      expect(plan.hypercad_api).toBe("Sketcher.createCircle");
      expect(plan.preselect_required).toContain("Sketch Plane");
    });

    it("flags sentinel-resolved macro paths in the plan output", async () => {
      const r = await invoke("cad_hypercad_plan_execution", {
        module_id: "sketch_operations",
        operation_id: "LINE",
        params: { "Sketch Plane": "Top", Mode: "two_point", "Start Point": "0,0" },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect(plan.hypercad_macro).toBe("SKETCH.LINE.CREATE");
      expect(plan.macro_resolved_from_sentinel).toBe(true);
    });

    it("returns dispatcherError when module_id is omitted", async () => {
      const r = await invoke("cad_hypercad_plan_execution", {
        operation_id: "CIRCLE",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("requires module_id and operation_id");
    });

    it("returns dispatcherError when operation_id is omitted", async () => {
      const r = await invoke("cad_hypercad_plan_execution", {
        module_id: "sketch_operations",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("requires module_id and operation_id");
    });

    it("propagates engine catalog-not-found via dispatcherError envelope", async () => {
      const r = await invoke("cad_hypercad_plan_execution", {
        module_id: "sketch_operations",
        operation_id: "OP_THAT_DOES_NOT_EXIST",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("operation not found");
      expect(String(r.error)).toContain("sketch_operations/OP_THAT_DOES_NOT_EXIST");
    });

    it("accepts the parameters alias for params payload", async () => {
      const r = await invoke("cad_hypercad_plan_execution", {
        moduleId: "sketch_operations",
        operationId: "CIRCLE",
        parameters: { "Sketch Plane": "Top", Radius: 50 },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect((plan.provided_params as Record<string, unknown>).Radius).toBe(50);
    });
  });

  describe("cad_hypercad_render_macro", () => {
    it("plans + renders a HyperCAD-S macro scaffold for CIRCLE", async () => {
      const r = await invoke("cad_hypercad_render_macro", {
        module_id: "sketch_operations",
        operation_id: "CIRCLE",
        params: { "Sketch Plane": "Top", Mode: "center_radius", Radius: 25 },
      });
      expect(r.success).toBe(true);
      const macro = r.macro_scaffold as string;
      expect(typeof macro).toBe("string");
      expect(macro).toContain("@SKETCH.CIRCLE.CREATE");
      expect(macro).toContain("Mode = ");
      expect(macro).toContain("Radius = 25");
      expect(macro).toContain("EXEC");
    });

    it("includes SOURCE warning line for sentinel-resolved bindings", async () => {
      const r = await invoke("cad_hypercad_render_macro", {
        module_id: "sketch_operations",
        operation_id: "LINE",
        params: { "Sketch Plane": "Top", Mode: "two_point", "Start Point": "0,0" },
      });
      expect(r.success).toBe(true);
      const macro = r.macro_scaffold as string;
      expect(macro).toContain("SOURCE: macro path extracted from");
    });

    it("returns dispatcherError when module_id is omitted", async () => {
      const r = await invoke("cad_hypercad_render_macro", {
        operation_id: "CIRCLE",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("requires module_id and operation_id");
    });

    it("includes both the structured plan and the rendered macro", async () => {
      const r = await invoke("cad_hypercad_render_macro", {
        module_id: "sketch_operations",
        operation_id: "CIRCLE",
        params: { "Sketch Plane": "Top" },
      });
      expect(r.success).toBe(true);
      const plan = r.plan as Record<string, unknown>;
      expect(plan.module_id).toBe("sketch_operations");
      const macro = r.macro_scaffold as string;
      expect(macro.length).toBeGreaterThan(100);
      expect(macro).toContain("' Operation: sketch_operations/CIRCLE");
    });
  });
});
