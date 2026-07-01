/**
 * calcDispatcher U-WIRE-MOEA-STOP round-trip tests -- MOEAStoppingCriterion.
 *
 * Validates the new moea_stopping_evaluate action wires through prism_calc:
 *   moea_stopping_evaluate -> new MOEAStoppingCriterion(config); evaluate(front)
 *   per generation until shouldStop -> { decision, stopped, stoppedAtGeneration,
 *   trajectory, generationsEvaluated }.
 *
 * MOEAStoppingCriterion (ALGO-SYNERGY-MS0, slot:tango) is a STATEFUL class (no
 * singleton): evaluate() accumulates a hypervolume history and flags convergence
 * when relative HV improvement stays below `tolerance` for `stableWindow`
 * consecutive generations. Because a JSON dispatcher boundary is stateless, the
 * action takes the WHOLE sequence of per-generation fronts and runs the criterion
 * to its stop point in one call (a fresh instance each call -> deterministic).
 *
 * Deterministic fixtures: identical fronts -> HV never improves -> saturates;
 * strictly-improving fronts -> never saturate; a low maxGenerations -> hard cap.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:tango engine wired into prism_calc).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-MOEA-STOP
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { MOEAStoppingCriterion } from "../engines/MOEAStoppingCriterion.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_calc") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// Deterministic fixtures (objectives minimization-normalized; ref dominates all points).
const FRONT = [[1, 2], [2, 1]];
const SAT_CONFIG = { lookback: 1, stableWindow: 2, tolerance: 0.01, maxGenerations: 100, reference: [3, 3] };
const SAT_FRONTS = [FRONT, FRONT, FRONT, FRONT, FRONT];           // identical -> saturate at gen 3
const IMPROVING_FRONTS = [[[2, 2]], [[1, 1]], [[0.5, 0.5]]];      // strictly better HV each gen
const IMPROVING_CONFIG = { lookback: 1, stableWindow: 2, tolerance: 0.01, maxGenerations: 100, reference: [3, 3] };

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCalcDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct reference behavior ----------------------------------------
describe("U-WIRE-MOEA-STOP -- saturation/stopping reference values", () => {
  it("identical fronts saturate after stableWindow consecutive sub-tolerance gens", () => {
    const c = new MOEAStoppingCriterion(SAT_CONFIG);
    const d1 = c.evaluate(FRONT);
    expect(d1.generation).toBe(1);
    expect(d1.shouldStop).toBe(false); // no lookback history yet
    const d2 = c.evaluate(FRONT);
    expect(d2.shouldStop).toBe(false); // saturatedStreak 1 < stableWindow 2
    const d3 = c.evaluate(FRONT);
    expect(d3.shouldStop).toBe(true);
    expect(d3.reason).toBe("saturated");
    expect(d3.generation).toBe(3);
  });

  it("strictly-improving fronts never saturate (stays running)", () => {
    const c = new MOEAStoppingCriterion(IMPROVING_CONFIG);
    let d = c.evaluate(IMPROVING_FRONTS[0]!);
    for (let i = 1; i < IMPROVING_FRONTS.length; i++) d = c.evaluate(IMPROVING_FRONTS[i]!);
    expect(d.shouldStop).toBe(false);
    expect(d.reason).toBe("running");
  });

  it("an empty front yields no_data with NaN hypervolume (fail-soft)", () => {
    const c = new MOEAStoppingCriterion(SAT_CONFIG);
    const d = c.evaluate([]);
    expect(d.reason).toBe("no_data");
    expect(Number.isNaN(d.hypervolume)).toBe(true);
  });

  it("maxGenerations forces a stop even without saturation", () => {
    const c = new MOEAStoppingCriterion({ lookback: 50, stableWindow: 50, tolerance: 1e-9, maxGenerations: 2, reference: [3, 3] });
    c.evaluate(FRONT);
    const d = c.evaluate(FRONT);
    expect(d.shouldStop).toBe(true);
    expect(d.reason).toBe("max_generations");
    expect(d.generation).toBe(2);
  });

  it("trajectory tracks HV history and reset() clears it", () => {
    const c = new MOEAStoppingCriterion(SAT_CONFIG);
    c.evaluate(FRONT);
    c.evaluate(FRONT);
    expect(c.trajectory().length).toBe(2);
    c.reset();
    expect(c.trajectory().length).toBe(0);
    expect(c.evaluate(FRONT).generation).toBe(1); // counter reset
  });
});

// -- LIVE round-trip through prism_calc (the wire proof) ----------------------
describe("U-WIRE-MOEA-STOP -- dispatcher round-trip (prism_calc)", () => {
  it("a saturating sequence stops at generation 3 through the dispatcher", async () => {
    const r = await call(server, "moea_stopping_evaluate", { fronts: SAT_FRONTS, config: SAT_CONFIG });
    expect(r.ok).toBe(true);
    expect(r.data.stopped).toBe(true);                         // slimResponse keeps non-null primitives
    expect(r.data.stoppedAtGeneration).toBe(3);
    expect((r.data.decision as { reason: string }).reason).toBe("saturated");
    expect((r.data.trajectory as number[]).length).toBe(3);    // early-break at the stop gen
  });

  it("a non-saturating sequence keeps running through the dispatcher", async () => {
    const r = await call(server, "moea_stopping_evaluate", { fronts: IMPROVING_FRONTS, config: IMPROVING_CONFIG });
    expect(r.ok).toBe(true);
    // slimResponse strips only null/undefined/empty-array; the boolean false survives intact
    expect(r.data.stopped).toBe(false);
    expect((r.data.decision as { reason: string }).reason).toBe("running");
    expect((r.data.trajectory as number[]).length).toBe(3);
  });

  it("the moea_stopping_evaluate action is accepted by the registered dispatcher", async () => {
    const r = await call(server, "moea_stopping_evaluate", { fronts: [FRONT] });
    expect(r.ok).toBe(true);
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-MOEA-STOP -- schema rejection (prism_calc)", () => {
  it("rejects a missing fronts", async () => {
    const r = await call(server, "moea_stopping_evaluate", { config: SAT_CONFIG });
    expect(r.ok).toBe(false);
  });

  it("rejects an empty fronts array (min 1)", async () => {
    const r = await call(server, "moea_stopping_evaluate", { fronts: [] });
    expect(r.ok).toBe(false);
  });

  it("rejects a non-numeric objective value", async () => {
    const r = await call(server, "moea_stopping_evaluate", { fronts: [[["x"]]] });
    expect(r.ok).toBe(false);
  });

  it("fails loud (ok:false) on a dimension-mismatched front -- engine throw, not Zod", async () => {
    // a ragged front passes the loose number[][][] schema but HypervolumeIndicator rejects the
    // inconsistent objective dimensions -> engine throws -> dispatcherError -> ok:false
    const r = await call(server, "moea_stopping_evaluate", { fronts: [[[1, 2], [3]]], config: SAT_CONFIG });
    expect(r.ok).toBe(false);
  });
});
