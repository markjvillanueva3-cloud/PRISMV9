/**
 * 6-CAD orchestrator round-trip E2E test (Esprit closure)
 * @see U-CAD-FIDX-ESP-E2E-01
 *
 * Closure proof for the 6/6 tier-1 CAM bridge ship: exercises the Esprit
 * pathway through the unified CAD orchestrator (cad_route_*) end-to-end,
 * validating that the orchestrator detects Esprit from file extensions,
 * routes plan_execution to EspritCADExecutionBridge, emits a KBM scaffold,
 * and surfaces Esprit operations in the capability + find-operation
 * surfaces alongside the 5 sealed CAD systems.
 *
 * The other 5 CAM bridges are covered by cadDispatcher.routerOrchestrator
 * .test.ts; this file is purposefully Esprit-centric to prove the new
 * bridge integrates cleanly with the existing orchestrator without
 * regressing the sealed pathways.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import { EspritFunctionIndexEngine } from "../engines/EspritFunctionIndexEngine.js";

// Mock-server stub matching the pattern in cadDispatcher.routerOrchestrator.test.ts —
// the dispatcher's handler signature is ({action, params}), not ({action, ...params}).
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
    tool(name: string, description: string, schema: unknown, h: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler: h });
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
  EspritFunctionIndexEngine.resetCache();
});

// ============================================================================
// SECTION 1 — Esprit detection through the orchestrator's detectSystem path
// ============================================================================

describe("6-CAD orchestrator — Esprit detection from file extensions", () => {
  it("detects esprit from .esprit (current TNG project extension)", async () => {
    const r = await invoke("cad_route_detect_system", { file_path: "fixture.esprit" });
    expect(r.success).toBe(true);
    expect(r.detected_system).toBe("esprit");
  });

  it("detects esprit from .esp (legacy DP Technology)", async () => {
    const r = await invoke("cad_route_detect_system", { file_path: "legacy_part.esp" });
    expect(r.success).toBe(true);
    expect(r.detected_system).toBe("esprit");
  });

  it("detects esprit from .escx (TNG project archive)", async () => {
    const r = await invoke("cad_route_detect_system", { file_path: "archive.escx" });
    expect(r.success).toBe(true);
    expect(r.detected_system).toBe("esprit");
  });

  it("detects esprit from explicit sourceSystem hint (case-insensitive)", async () => {
    const a = await invoke("cad_route_detect_system", { source_system: "esprit" });
    const b = await invoke("cad_route_detect_system", { source_system: "ESPRIT" });
    const c = await invoke("cad_route_detect_system", { source_system: "  Esprit  " });
    expect(a.detected_system).toBe("esprit");
    expect(b.detected_system).toBe("esprit");
    expect(c.detected_system).toBe("esprit");
  });

  it("returns no detection (null/undefined) for an unmapped extension (.xyz is NOT in any vendor map)", async () => {
    const r = await invoke("cad_route_detect_system", { file_path: "vendor.xyz" });
    expect(r.success).toBe(true);
    // detectSystem returns null on miss; the dispatcher serializes it through
    // a JSON pipeline that may collapse null→undefined. Assert the semantic
    // "no system was resolved" rather than the wire format.
    expect(r.detected_system == null).toBe(true);
    // Belt-and-braces: confirm it's not a real CAD system id.
    const known = ["fusion360", "inventor", "mastercam", "hypercad", "solidworks", "esprit"];
    expect(known.includes(String(r.detected_system))).toBe(false);
  });
});

// ============================================================================
// SECTION 2 — End-to-end cad_route_plan_execution → KBM emission for Esprit
// ============================================================================

describe("6-CAD orchestrator — end-to-end Esprit plan_execution", () => {
  it("auto-detects esprit from file_path and routes to EspritCADExecutionBridge with KBM macro emission", async () => {
    const r = await invoke("cad_route_plan_execution", {
      file_path: "shop.esprit",
      // moduleId="milling" is a real Esprit section so it forwards as sectionHint
      module_id: "milling",
      operation_id: "profitmilling_rough",
      params: {
        topZ: 0,
        bottomZ: -25,
        tea: 35,
        stockToLeave: 0.3,
        direction: "climb",
      },
    });
    expect(r.success).toBe(true);
    const routed = r.routed as Record<string, unknown>;
    expect(routed.system).toBe("esprit");
    // module_id echoes the resolved section back, not the caller's input verbatim.
    expect(routed.module_id).toBe("milling");
    expect(routed.operation_id).toBe("profitmilling_rough");
    expect(typeof routed.kbm_macro).toBe("string");
    const kbm = routed.kbm_macro as string;
    expect(kbm).toContain("' Operation: profitmilling_rough");
    expect(kbm).toContain("' Section: milling");
    expect(kbm).toContain('Set op = ops.AddOperation("profitmilling_rough")');
    expect(kbm).toContain('op.SetParameter("engagement", "tea", 35)');
    expect(kbm).toContain('op.SetParameter("linking", "direction", "climb")');
  });

  it("accepts explicit system='esprit' arg with no file_path and no sectionHint (auto-detect runs)", async () => {
    const r = await invoke("cad_route_plan_execution", {
      system: "esprit",
      // module_id="any-irrelevant" doesn't match {milling,turning,mill_turn,swiss}
      // so the router drops it and Esprit's auto-detect takes over.
      module_id: "any-irrelevant",
      operation_id: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30 },
    });
    expect(r.success).toBe(true);
    const routed = r.routed as Record<string, unknown>;
    expect(routed.system).toBe("esprit");
    // Auto-detect resolves milling for profitmilling_rough.
    expect(routed.module_id).toBe("milling");
  });

  it("accepts a turning-section operation routed through the orchestrator", async () => {
    // Pick the first turning op from the live catalog so we don't pin to a specific id.
    const turningOps = EspritFunctionIndexEngine.listOperations().filter(
      (o) => o.section === "turning",
    );
    expect(turningOps.length).toBeGreaterThan(0);
    const turningOp = turningOps[0];
    // Synthesize the minimum payload that satisfies required catalog fields,
    // so the test isn't brittle across catalog updates that flip `required: true`.
    const lookup = EspritFunctionIndexEngine.getOperation(turningOp.operation_id);
    if ("error" in lookup) throw new Error(`unexpected catalog miss: ${lookup.error}`);
    const params = synthesizeMinimalParams(lookup.operation);
    const r = await invoke("cad_route_plan_execution", {
      system: "esprit",
      module_id: "turning",
      operation_id: turningOp.operation_id,
      params,
    });
    expect(r.success).toBe(true);
    const routed = r.routed as Record<string, unknown>;
    expect(routed.system).toBe("esprit");
    expect(routed.module_id).toBe("turning");
    expect(routed.operation_id).toBe(turningOp.operation_id);
    expect(typeof routed.kbm_macro).toBe("string");
  });

  it("propagates Esprit catalog 'operation not found' errors via dispatcherError envelope", async () => {
    const r = await invoke("cad_route_plan_execution", {
      system: "esprit",
      module_id: "milling",
      operation_id: "DEFINITELY_NOT_A_REAL_OP",
      params: {},
    });
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("operation not found");
  });

  it("propagates Esprit's strict sectionHint validation (real section that lacks the op)", async () => {
    // profitmilling_rough is in milling, NOT swiss — strict hint validation throws.
    const r = await invoke("cad_route_plan_execution", {
      system: "esprit",
      module_id: "swiss",
      operation_id: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30 },
    });
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("does not contain operation");
  });
});

// ============================================================================
// SECTION 3 — find_operation_across_systems includes Esprit in matches
// ============================================================================

describe("6-CAD orchestrator — find_operation includes Esprit pathways", () => {
  it("locates an Esprit-only operation (profitmilling_rough) and reports section as module_id", async () => {
    const r = await invoke("cad_route_find_operation", { operation_id: "profitmilling_rough" });
    expect(r.success).toBe(true);
    expect(r.operation_id).toBe("profitmilling_rough");
    const matches = r.matches as Array<{
      system: string;
      module_id: string;
      operation_id: string;
      params_count: number;
    }>;
    // profitmilling_rough is unique to ESPRIT — exactly one match.
    expect(matches.length).toBe(1);
    expect(matches[0].system).toBe("esprit");
    expect(matches[0].module_id).toBe("milling");
    expect(matches[0].operation_id).toBe("profitmilling_rough");
    // params_count is the catalog's declared 18 (per ESPRIT milling.json header).
    expect(matches[0].params_count).toBe(18);
  });

  it("returns no match (count=0) when the operation_id doesn't exist in any system", async () => {
    const r = await invoke("cad_route_find_operation", { operation_id: "NONSENSE_OP_XYZ" });
    expect(r.success).toBe(true);
    expect(r.operation_id).toBe("NONSENSE_OP_XYZ");
    expect(r.count).toBe(0);
  });
});

// ============================================================================
// SECTION 4 — capability matrix accounts for Esprit alongside 5 sealed systems
// ============================================================================

describe("6-CAD orchestrator — capability matrix 6/6 closure", () => {
  it("returns 6 system snapshots including esprit with non-zero counts", async () => {
    const r = await invoke("cad_route_capabilities");
    expect(r.success).toBe(true);
    const systems = r.systems as Array<{
      system: string;
      total_modules: number;
      total_operations: number;
      total_parameters: number;
    }>;
    expect(systems.length).toBe(6);
    const allSystems = new Set(systems.map((s) => s.system));
    expect(allSystems.has("fusion360")).toBe(true);
    expect(allSystems.has("inventor")).toBe(true);
    expect(allSystems.has("mastercam")).toBe(true);
    expect(allSystems.has("hypercad")).toBe(true);
    expect(allSystems.has("solidworks")).toBe(true);
    expect(allSystems.has("esprit")).toBe(true);
    const esprit = systems.find((s) => s.system === "esprit");
    expect(esprit?.total_modules).toBe(4);
    expect(esprit?.total_operations).toBeGreaterThanOrEqual(18);
    expect(esprit?.total_parameters).toBeGreaterThanOrEqual(200);
  });

  it("aggregate totals are internally consistent (sum-of-systems == aggregate)", async () => {
    const r = await invoke("cad_route_capabilities");
    const systems = r.systems as Array<{
      system: string;
      total_modules: number;
      total_operations: number;
      total_parameters: number;
    }>;
    const totals = r.totals as {
      total_modules: number;
      total_operations: number;
      total_parameters: number;
    };
    const sumModules = systems.reduce((acc, s) => acc + s.total_modules, 0);
    const sumOps = systems.reduce((acc, s) => acc + s.total_operations, 0);
    const sumParams = systems.reduce((acc, s) => acc + s.total_parameters, 0);
    expect(totals.total_modules).toBe(sumModules);
    expect(totals.total_operations).toBe(sumOps);
    expect(totals.total_parameters).toBe(sumParams);
  });
});

// ============================================================================
// SECTION 5 — Round-trip determinism: orchestrator → Esprit → orchestrator
// ============================================================================

// ============================================================================
// HELPERS — module-private to this test file
// ============================================================================

/**
 * Build the smallest payload satisfying an Esprit op's required fields by
 * walking the catalog and synthesizing minimal valid values per declared
 * type. Mirrors buildMinimalParams in EspritCADExecutionBridge.test.ts so
 * cross-catalog updates don't make this test brittle.
 */
function synthesizeMinimalParams(
  op: { parameters?: Record<string, Record<string, { type: string; range?: [number, number]; values?: string[]; required?: boolean }>> },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!op.parameters) return out;
  for (const group of Object.values(op.parameters)) {
    for (const [name, def] of Object.entries(group)) {
      if (def.required !== true) continue;
      const t = (def.type ?? "").toLowerCase();
      if (t === "boolean" || t === "checkbox" || t === "bool") out[name] = true;
      else if (t === "number" || t === "integer" || t === "int" || t === "numeric" || t === "spinner") {
        out[name] = Array.isArray(def.range) ? def.range[0] : 0;
      } else if (t === "enum" || t === "dropdown" || t === "combo" || t === "select") {
        out[name] = Array.isArray(def.values) && def.values.length > 0 ? def.values[0] : "";
      } else if (t === "string" || t === "text") {
        out[name] = "";
      } else {
        out[name] = "auto-select-token";
      }
    }
  }
  return out;
}

describe("6-CAD orchestrator — Esprit round-trip determinism", () => {
  it("produces identical kbm_macro across two repeated route_plan_execution calls", async () => {
    const args = {
      system: "esprit",
      module_id: "milling",
      operation_id: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -10, tea: 35, direction: "climb" },
    };
    const a = await invoke("cad_route_plan_execution", args);
    const b = await invoke("cad_route_plan_execution", args);
    const routedA = a.routed as Record<string, unknown>;
    const routedB = b.routed as Record<string, unknown>;
    expect(routedA.kbm_macro).toBe(routedB.kbm_macro);
    expect(typeof routedA.kbm_macro).toBe("string");
    // Stable across distinctive markers.
    expect(String(routedA.kbm_macro)).toContain('AddOperation("profitmilling_rough")');
  });
});
