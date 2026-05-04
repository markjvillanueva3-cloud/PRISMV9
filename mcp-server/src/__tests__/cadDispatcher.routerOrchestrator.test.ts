/**
 * cadDispatcher.routerOrchestrator.test.ts — U-CAD-FIDX-ORCH-01 dispatcher tests
 *
 * Round-trip tests for the 5-CAD orchestrator router actions:
 *   - cad_route_supported_systems
 *   - cad_route_detect_system
 *   - cad_route_plan_execution
 *   - cad_route_find_operation
 *   - cad_route_capabilities
 *
 * @see src/engines/CADSystemRouterEngine.ts
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

describe("cadDispatcher 5-CAD orchestrator router (U-CAD-FIDX-ORCH-01)", () => {
  describe("cad_route_supported_systems", () => {
    it("returns the canonical system list and extension map", async () => {
      const r = await invoke("cad_route_supported_systems");
      expect(r.success).toBe(true);
      const systems = r.systems as readonly string[];
      expect(systems).toEqual(["fusion360", "inventor", "mastercam", "hypercad", "solidworks"]);
      const exts = r.extensions as Record<string, string>;
      expect(exts["sldprt"]).toBe("solidworks");
      expect(exts["f3d"]).toBe("fusion360");
      expect(exts["ipt"]).toBe("inventor");
    });
  });

  describe("cad_route_detect_system", () => {
    it("detects fusion360 from .f3d file path", async () => {
      const r = await invoke("cad_route_detect_system", { file_path: "/jobs/part.f3d" });
      expect(r.success).toBe(true);
      expect(r.detected_system).toBe("fusion360");
    });

    it("detects solidworks from .sldprt file path", async () => {
      const r = await invoke("cad_route_detect_system", { file_path: "bracket.sldprt" });
      expect(r.success).toBe(true);
      expect(r.detected_system).toBe("solidworks");
    });

    it("respects explicit source_system hint over file_path extension", async () => {
      const r = await invoke("cad_route_detect_system", {
        source_system: "inventor",
        file_path: "x.f3d",
      });
      expect(r.success).toBe(true);
      expect(r.detected_system).toBe("inventor");
    });

    it("returns no detected_system for unknown extension (slimResponse drops null from wire)", async () => {
      const r = await invoke("cad_route_detect_system", { file_path: "file.unknown" });
      expect(r.success).toBe(true);
      // slimResponse strips null values from the JSON wire payload —
      // the absence of detected_system in the parsed envelope is the canonical
      // "no detection" signal. Engine-level null handling is covered in the
      // CADSystemRouterEngine test suite directly.
      expect(r.detected_system ?? null).toBeNull();
    });
  });

  describe("cad_route_plan_execution", () => {
    it("auto-detects system from file_path and routes to SolidWorks bridge", async () => {
      const r = await invoke("cad_route_plan_execution", {
        file_path: "bracket.sldprt",
        module_id: "part_operations",
        operation_id: "EXTRUDE_BOSS",
        params: { Sketch: "Sketch1", Depth: 25 },
      });
      expect(r.success).toBe(true);
      const routed = r.routed as Record<string, unknown>;
      expect(routed.system).toBe("solidworks");
      expect(routed.module_id).toBe("part_operations");
      expect(typeof routed.vba_macro).toBe("string");
      expect(String(routed.vba_macro)).toContain("Set feature = swFeatureMgr.FeatureExtrusion3(");
    });

    it("accepts explicit system arg and routes to Inventor bridge", async () => {
      const r = await invoke("cad_route_plan_execution", {
        system: "inventor",
        module_id: "part_operations",
        operation_id: "EXTRUDE",
        params: { Profile: "S1", Termination: "distance", "Boolean Op": "join" },
      });
      expect(r.success).toBe(true);
      const routed = r.routed as Record<string, unknown>;
      expect(routed.system).toBe("inventor");
      expect(typeof routed.ilogic_snippet).toBe("string");
    });

    it("returns dispatcherError when no system + no detectable file_path", async () => {
      const r = await invoke("cad_route_plan_execution", {
        module_id: "part_operations",
        operation_id: "EXTRUDE_BOSS",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain(
        "requires `system` (or `source_system` / `file_path`",
      );
    });

    it("returns dispatcherError when module_id omitted", async () => {
      const r = await invoke("cad_route_plan_execution", {
        system: "solidworks",
        operation_id: "EXTRUDE_BOSS",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("module_id and operation_id");
    });

    it("propagates downstream-bridge errors via dispatcherError envelope", async () => {
      const r = await invoke("cad_route_plan_execution", {
        system: "solidworks",
        module_id: "part_operations",
        operation_id: "BOGUS_NEVER_EXISTS",
        params: {},
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("operation not found");
    });
  });

  describe("cad_route_find_operation", () => {
    it("finds CIRCLE across multiple CAD systems", async () => {
      const r = await invoke("cad_route_find_operation", { operation_id: "CIRCLE" });
      expect(r.success).toBe(true);
      expect(r.operation_id).toBe("CIRCLE");
      const matches = r.matches as Array<{ system: string; module_id: string }>;
      expect(matches.length).toBeGreaterThanOrEqual(2);
      const systemsHit = new Set(matches.map((m) => m.system));
      expect(systemsHit.size).toBeGreaterThanOrEqual(2);
    });

    it("returns dispatcherError when operation_id omitted", async () => {
      const r = await invoke("cad_route_find_operation", {});
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("operation_id");
    });

    it("returns count=0 + empty matches for non-existent op", async () => {
      const r = await invoke("cad_route_find_operation", {
        operation_id: "OP_THAT_NEVER_EXISTS_ANYWHERE",
      });
      expect(r.success).toBe(true);
      expect(r.count).toBe(0);
    });
  });

  describe("cad_route_capabilities", () => {
    it("returns the full 5-CAD capability matrix with aggregate totals", async () => {
      const r = await invoke("cad_route_capabilities");
      expect(r.success).toBe(true);
      const systems = r.systems as Array<{
        system: string;
        total_modules: number;
        total_operations: number;
        total_parameters: number;
      }>;
      expect(systems.length).toBe(5);
      const totals = r.totals as {
        total_modules: number;
        total_operations: number;
        total_parameters: number;
      };
      expect(totals.total_modules).toBe(40);
      expect(totals.total_parameters).toBeGreaterThanOrEqual(4900);
    });

    it("solidworks slice reports the 1184 / 178 / 8 closure values", async () => {
      const r = await invoke("cad_route_capabilities");
      const systems = r.systems as Array<{
        system: string;
        total_modules: number;
        total_operations: number;
        total_parameters: number;
      }>;
      const sw = systems.find((s) => s.system === "solidworks");
      expect(sw?.total_modules).toBe(8);
      expect(sw?.total_operations).toBe(178);
      expect(sw?.total_parameters).toBe(1184);
    });
  });
});
