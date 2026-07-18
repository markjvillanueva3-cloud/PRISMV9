/**
 * turningDispatcher U-WIRE-TURNING round-trip tests.
 *
 * Validates 8 new prism_turning actions wiring two dispatcher-DARK engines:
 *   SwissTypeDecisionEngine -> swiss_decide / swiss_decide_batch
 *     (Swiss-vs-conventional routing verdict from a PartRoutingSpec; deterministic, rule-scored)
 *   TurretLayoutEngine -> turret_analyze_interface / turret_compare_interfaces /
 *     turret_analyze_capability / turret_optimize_layout / turret_plan_gang /
 *     turret_check_interference (all 6 self-route via the engine's executeAction(action,params))
 *
 * Pattern: LIVE dispatcher round-trip via registerTurningDispatcher(shim). prism_turning
 * wraps a successful result as content[0].text = JSON.stringify(slimResponse(result))
 * (TOP-LEVEL JSON, NOT .data-nested) and returns a raw { success:false } on a
 * dispatcherError (schema fail). SwissType results are deterministic (exact verdict/score
 * assertions). TurretLayout returns EngineResult { success, data?, error? }; all 6 methods
 * return success:true on the happy path (verified) -> assert success===true + a real data
 * field. slimResponse strips null/empty but keeps false/0. Both engines are stateless
 * singletons. The swiss spec schema enforces .positive() so an invalid spec rejects at the
 * schema boundary (never reaches the engine's _validate throw).
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA autonomous loop iteration 10.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-TURNING
 */

import { describe, it, expect } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

interface CapturedTool {
  name: string; description: string; schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerTurningDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_turning") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// Full TurretConfig (engine reads beyond the 4 schema-required keys).
const CONFIG = {
  turretId: "T1", turretType: "disc_12", stationCount: 12, interfaceType: "vdi_40",
  drivenStations: [1, 2, 3], maxDrivenRpm: 6000, drivenPower_kW: 5, indexTime_seconds: 0.3,
  coolantThroughSpindle: true, maxToolDiameter_mm: 32, maxToolLength_mm: 100, rapidTraverse_mPerMin: 30,
};
const TOOL = { toolId: "t1", toolType: "OD_turn", diameter_mm: 12, length_mm: 80, isDriven: false, orientation: "radial", capabilities: ["turn"], cost: 50 };
const OPERATION = { operationId: "op1", type: "turn", requiredToolType: "OD_turn", material: "1045", cuttingTime_seconds: 30, toolChangeRequired: false };

describe("U-WIRE-TURNING — SwissTypeDecision + TurretLayout via prism_turning", () => {
  it("registers the prism_turning tool", () => {
    const tool = newServer().tools.find((t) => t.name === "prism_turning");
    expect(tool?.name).toBe("prism_turning");
  });

  // ── SwissTypeDecisionEngine (deterministic rule scoring) ─────────────────
  it("swiss_decide: long slender high-precision part -> swiss_recommended", async () => {
    const s = newServer();
    const r = await call(s, "swiss_decide", {
      spec: { length_mm: 100, max_diameter_mm: 4, tightest_tolerance_mm: 0.003, has_live_operations: true, annual_quantity: 5000, material: "303SS" },
    });
    expect(r.ok).toBe(true);
    expect(r.data.verdict).toBe("swiss_recommended");
    expect(r.data.score as number).toBeGreaterThanOrEqual(30);
  });

  it("swiss_decide: oversize diameter -> hard_conventional with a hard_block_reason", async () => {
    const s = newServer();
    const r = await call(s, "swiss_decide", {
      spec: { length_mm: 80, max_diameter_mm: 50, tightest_tolerance_mm: 0.02, has_live_operations: false, annual_quantity: 100, material: "1045" },
    });
    expect(r.ok).toBe(true);
    expect(r.data.verdict).toBe("hard_conventional");
    expect(typeof r.data.hard_block_reason).toBe("string");
    expect(r.data.score).toBe(-100);
  });

  it("swiss_decide: short fat low-quantity part -> conventional_recommended", async () => {
    const s = newServer();
    const r = await call(s, "swiss_decide", {
      spec: { length_mm: 20, max_diameter_mm: 30, tightest_tolerance_mm: 0.1, has_live_operations: false, annual_quantity: 5, material: "1018" },
    });
    expect(r.ok).toBe(true);
    expect(r.data.verdict).toBe("conventional_recommended");
  });

  it("swiss_decide: non-positive length -> error (schema .positive(), failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "swiss_decide", {
      spec: { length_mm: 0, max_diameter_mm: 6, tightest_tolerance_mm: 0.01, has_live_operations: false, annual_quantity: 100, material: "1045" },
    });
    expect(r.ok).toBe(false);
  });

  it("swiss_decide: missing spec -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "swiss_decide", { notspec: 1 });
    expect(r.ok).toBe(false);
  });

  it("swiss_decide_batch returns one verdict per spec", async () => {
    const s = newServer();
    const spec = { length_mm: 100, max_diameter_mm: 4, tightest_tolerance_mm: 0.003, has_live_operations: true, annual_quantity: 5000, material: "303SS" };
    const r = await call(s, "swiss_decide_batch", { specs: [spec, { ...spec, max_diameter_mm: 30, length_mm: 20, annual_quantity: 5 }] });
    expect(r.ok).toBe(true);
    const results = r.data.results as Array<{ verdict: string }>;
    expect(results.length).toBe(2);
    expect(results[0]!.verdict).toBe("swiss_recommended");
  });

  // ── TurretLayoutEngine (self-routes via executeAction -> EngineResult) ────
  it("turret_analyze_interface vdi_40 -> success with a positive maxRpm", async () => {
    const s = newServer();
    const r = await call(s, "turret_analyze_interface", { interfaceType: "vdi_40" });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    expect((r.data.data as { maxRpm: number }).maxRpm).toBeGreaterThan(0);
  });

  it("turret_analyze_interface invalid enum -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "turret_analyze_interface", { interfaceType: "not-an-interface" });
    expect(r.ok).toBe(false);
  });

  it("turret_compare_interfaces vdi_40 vs capto_c4 -> success", async () => {
    const s = newServer();
    const r = await call(s, "turret_compare_interfaces", { interface1: "vdi_40", interface2: "capto_c4", application: "roughing" });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
  });

  it("turret_analyze_capability -> success with positive totalCapacity", async () => {
    const s = newServer();
    const r = await call(s, "turret_analyze_capability", { config: CONFIG });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    expect((r.data.data as { totalCapacity: number }).totalCapacity).toBeGreaterThan(0);
  });

  it("turret_optimize_layout -> success with an assignments plan", async () => {
    const s = newServer();
    const r = await call(s, "turret_optimize_layout", {
      operations: [OPERATION], availableTools: [TOOL], config: CONFIG,
      priorities: { minimizeCycleTime: 0.5, minimizeToolChanges: 0.2, minimizeToolCount: 0.2, maximizeToolLife: 0.1 },
    });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    expect(Array.isArray((r.data.data as { assignments: unknown[] }).assignments)).toBe(true);
  });

  it("turret_plan_gang -> success with gang positions", async () => {
    const s = newServer();
    const r = await call(s, "turret_plan_gang", { tools: [TOOL], operations: [OPERATION], maxWidth_mm: 200 });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    expect(Array.isArray((r.data.data as { positions: unknown[] }).positions)).toBe(true);
  });

  it("turret_check_interference -> success with a hasInterference verdict", async () => {
    const s = newServer();
    const r = await call(s, "turret_check_interference", {
      assignments: [{ stationNumber: 1, toolId: "t1", toolType: "OD", diameter_mm: 12, length_mm: 80, isDriven: false, orientation: "radial", overhang_mm: 30, cuttingLength_mm: 20 }],
      config: CONFIG,
    });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    expect(typeof (r.data.data as { hasInterference: boolean }).hasInterference).toBe("boolean");
  });
});
