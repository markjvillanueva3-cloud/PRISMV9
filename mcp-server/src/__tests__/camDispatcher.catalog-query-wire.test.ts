/**
 * CAMCatalogQueryEngine + prism_cam catalog-query wiring (U-CAM-CAT-QUERY, slot:kilo 2026-05-29)
 * =============================================================================================
 * The "utilize" surface for the grounded CAM feature catalogs. Two layers proven:
 *   1. CAMCatalogQueryEngine — normalized per-operation parameter enumeration + validation over
 *      the REAL data/cam-functions/{fusion360,hypermill,mastercam}/ catalogs (not a stub — the
 *      assertions pin concrete known parameters/ranges/enums from each system's real JSON).
 *   2. prism_cam round-trip — the 4 new actions reachable through the dispatcher (enum + switch).
 *
 * Variability floor: exercises all 3 spanning CAM systems (Fusion / hyperMILL / Mastercam).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { camCatalogQueryEngine } from "../engines/CAMCatalogQueryEngine.js";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

describe("CAMCatalogQueryEngine — normalized cross-system enumeration (real data)", () => {
  it("lists the 3 target systems", () => {
    const sys = camCatalogQueryEngine.listSystems();
    expect(sys).toContain("fusion360");
    expect(sys).toContain("hypermill");
    expect(sys).toContain("mastercam");
  });

  it("Fusion: adaptive_clearing_3d enumerates real params with type/unit/range", () => {
    const ops = camCatalogQueryEngine.listOperations("fusion360").map((o) => o.id);
    expect(ops).toContain("adaptive_clearing_3d");
    const params = camCatalogQueryEngine.getOperationParams("fusion360", "adaptive_clearing_3d");
    expect(params.length).toBeGreaterThan(5);
    const ss = params.find((p) => p.name === "spindle_speed");
    expect(ss?.name).toBe("spindle_speed");
    expect(ss!.type).toBe("number");
    expect(ss!.unit).toBe("rpm");
    expect(ss!.min).toBe(1);
    expect(ss!.max).toBe(60000);
    const coolant = params.find((p) => p.name === "coolant");
    expect(coolant!.enumValues).toContain("flood");
    expect(coolant!.uiTab).toBe("tool"); // params carry their UI tab
  });

  it("Mastercam: dynamic_mill enumerates enum + range-derived params", () => {
    const ops = camCatalogQueryEngine.listOperations("mastercam").map((o) => o.id);
    expect(ops).toContain("dynamic_mill");
    const params = camCatalogQueryEngine.getOperationParams("mastercam", "dynamic_mill");
    const strat = params.find((p) => p.name === "machining_strategy");
    expect(strat!.type).toBe("enum");
    expect(strat!.enumValues).toContain("area");
    const appr = params.find((p) => p.name === "approach_distance");
    expect(appr!.min).toBe(0);   // derived from range:[0,100]
    expect(appr!.max).toBe(100);
  });

  it("hyperMILL: 5ax_swarf_cutting enumerates dialog params (flat + range)", () => {
    const ops = camCatalogQueryEngine.listOperations("hypermill").map((o) => o.id);
    expect(ops).toContain("5ax_swarf_cutting");
    const params = camCatalogQueryEngine.getOperationParams("hypermill", "5ax_swarf_cutting");
    expect(params.length).toBeGreaterThan(3);
    const cc = params.find((p) => p.name === "CURVE_CONTACT");
    expect(cc!.min).toBe(0);
    expect(cc!.max).toBe(1);
  });

  it("coverage() returns non-trivial op + param counts per system", () => {
    const f = camCatalogQueryEngine.coverage("fusion360");
    expect(f.operations).toBeGreaterThan(10);
    expect(f.parameters).toBeGreaterThan(200);
  });

  describe("validateOperation (fail-loud)", () => {
    it("flags an out-of-range numeric (spindle_speed beyond max)", () => {
      const r = camCatalogQueryEngine.validateOperation("fusion360", "adaptive_clearing_3d", { spindle_speed: 1_000_000 });
      expect(r.outOfRange.some((o) => o.name === "spindle_speed")).toBe(true);
      expect(r.ok).toBe(false);
    });
    it("flags an unknown parameter", () => {
      const r = camCatalogQueryEngine.validateOperation("fusion360", "adaptive_clearing_3d", { not_a_real_param: 1 });
      expect(r.unknown).toContain("not_a_real_param");
      expect(r.ok).toBe(false);
    });
    it("flags an invalid enum value", () => {
      const r = camCatalogQueryEngine.validateOperation("fusion360", "adaptive_clearing_3d", { coolant: "plasma_jet" });
      expect(r.invalidEnum.some((e) => e.name === "coolant")).toBe(true);
    });
    it("flags missing required params (empty input)", () => {
      const r = camCatalogQueryEngine.validateOperation("fusion360", "adaptive_clearing_3d", {});
      expect(r.missingRequired).toContain("tool");
    });
    it("an unknown operation has zero known params and is not ok", () => {
      const r = camCatalogQueryEngine.validateOperation("fusion360", "no_such_operation_xyz", { foo: 1 });
      expect(r.knownParamCount).toBe(0);
      expect(r.ok).toBe(false);
    });
    it("an unknown system is empty, not a crash", () => {
      expect(camCatalogQueryEngine.getOperationParams("not_a_system", "x")).toEqual([]);
      expect(camCatalogQueryEngine.listOperations("not_a_system")).toEqual([]);
    });
  });
});

// ── prism_cam round-trip ────────────────────────────────────────────────
interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as { content?: { text: string }[]; success?: boolean };
  if (raw && typeof raw === "object" && "success" in raw && raw.success === false) return { ok: false, data: raw };
  const text = (raw as { content: { text: string }[] }).content[0]!.text;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("prism_cam catalog-query round-trip", () => {
  it("the 4 new actions are in the ACTIONS enum", () => {
    for (const a of ["cam_catalog_operations", "cam_catalog_operation_params", "cam_catalog_param_lookup", "cam_catalog_validate_op"]) {
      expect(ACTIONS).toContain(a);
    }
  });
  it("cam_catalog_operations returns Fusion operations including adaptive_clearing_3d", async () => {
    const { ok, data } = await call(server, "cam_catalog_operations", { system: "fusion360" });
    expect(ok).toBe(true);
    const ids = (data.operations ?? []).map((o: any) => o.id);
    expect(ids).toContain("adaptive_clearing_3d");
  });
  it("cam_catalog_operation_params returns the machining_strategy param for a Mastercam op", async () => {
    const { ok, data } = await call(server, "cam_catalog_operation_params", { system: "mastercam", operation: "dynamic_mill" });
    expect(ok).toBe(true);
    expect(data.params.some((p: any) => p.name === "machining_strategy")).toBe(true);
  });
  it("cam_catalog_param_lookup resolves a single Fusion param with its range", async () => {
    const { ok, data } = await call(server, "cam_catalog_param_lookup", { system: "fusion360", operation: "adaptive_clearing_3d", param: "spindle_speed" });
    expect(ok).toBe(true);
    expect(data.param.max).toBe(60000);
  });
  it("cam_catalog_validate_op flags an out-of-range param through the dispatcher", async () => {
    const { data } = await call(server, "cam_catalog_validate_op", {
      system: "fusion360", operation: "adaptive_clearing_3d", params: { spindle_speed: 1_000_000 },
    });
    expect(JSON.stringify(data)).toMatch(/spindle_speed/);
    expect(JSON.stringify(data)).toMatch(/outOfRange/);
  });
});
