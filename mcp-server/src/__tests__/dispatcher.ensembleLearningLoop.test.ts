/**
 * dispatcher.ensembleLearningLoop.test.ts -- round-trip coverage for
 * U-ENSEMBLE-LEARNING-LOOP (slot:india 2026-06-22, prism_ai / aiReasoningDispatcher).
 *
 * Closes the EnsembleModelSelectorEngine learning loop at the dispatcher boundary.
 * Before this unit, `ensemble_register_member` + `ensemble_predict` were wired but
 * `updateWeights` (the ACTUALS-feedback side) was NOT -> the ensemble emitted weighted
 * predictions forever on FROZEN member weights; observed errors could never re-weight
 * the members (the open-loop pattern). Two new actions close + observe the loop:
 *   ensemble_update_weights -> updateWeights(memberErrors, actual)  (re-weight on actuals)
 *   ensemble_get_weights    -> getWeights()                          (observe re-weighting)
 *
 * ROUTING/INTENT PROOF: the dispatcher mutates the SAME exported singleton, so after
 * feeding a low-error member A and a high-error member B, the loop must (1) name A best /
 * B worst (guaranteed by the engine), and (2) re-weight A above B (hedge: w*exp(-lr*err)).
 * A frozen-weight no-op would fail both. Bad input must reject with a structured error.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { ensembleModelSelectorEngine } from "../engines/EnsembleModelSelectorEngine.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) { resolve(fn); },
  };
  registerAIReasoningDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try { return JSON.parse(text); } catch { return r; }
}

function member(id: string) {
  return { id, name: id, type: "neural" as const, domain: "force" as const, weight: 1.0, active: true };
}

describe("prism_ai -- ensemble learning loop (round-trip)", () => {
  let handler: Handler;

  beforeEach(async () => {
    handler = await createServer().handler;
    ensembleModelSelectorEngine.reset();
  });

  it("registers members and predicts a finite weighted value (existing wiring still works)", async () => {
    await call(handler, "ensemble_register_member", { member: member("mA") });
    await call(handler, "ensemble_register_member", { member: member("mB") });
    const pred = (await call(handler, "ensemble_predict", { input: { mA: 10, mB: 12 }, domain: "force" })).data;
    expect(Number.isFinite(pred.value)).toBe(true);
    expect(pred.value).toBeGreaterThan(0);
    expect(Array.isArray(pred.member_contributions)).toBe(true);
    expect(pred.member_contributions.length).toBe(2);
  });

  it("CLOSES THE LOOP: feeding observed errors re-weights the accurate member up and names best/worst", async () => {
    await call(handler, "ensemble_register_member", { member: member("mA") });
    await call(handler, "ensemble_register_member", { member: member("mB") });

    const upd = (await call(handler, "ensemble_update_weights", {
      member_errors: { mA: 0.01, mB: 5.0 }, // A accurate, B way off
      actual: 11.0,
    })).data;

    // Guaranteed by the engine: min-error member = best, max-error = worst.
    expect(upd.best_member).toBe("mA");
    expect(upd.worst_member).toBe("mB");
    // The loop actually learned: the accurate member is now weighted ABOVE the inaccurate one.
    expect(upd.updated_weights.mA).toBeGreaterThan(upd.updated_weights.mB);

    // Observability action reflects the same re-weighting on the live singleton.
    const w = (await call(handler, "ensemble_get_weights", {})).data;
    expect(w.weights.mA).toBeGreaterThan(w.weights.mB);
  });

  it("re-weighting compounds across rounds (each pass feeds the next)", async () => {
    await call(handler, "ensemble_register_member", { member: member("mA") });
    await call(handler, "ensemble_register_member", { member: member("mB") });
    await call(handler, "ensemble_update_weights", { member_errors: { mA: 0.01, mB: 4.0 }, actual: 5 });
    const w1 = (await call(handler, "ensemble_get_weights", {})).data.weights.mA;
    await call(handler, "ensemble_update_weights", { member_errors: { mA: 0.01, mB: 4.0 }, actual: 5 });
    const w2 = (await call(handler, "ensemble_get_weights", {})).data.weights.mA;
    expect(w2).toBeGreaterThanOrEqual(w1); // accurate member keeps (or holds) its share
  });

  it("rejects a missing member_errors map with a structured error", async () => {
    await call(handler, "ensemble_register_member", { member: member("mA") });
    const out = await call(handler, "ensemble_update_weights", { actual: 1.0 });
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });

  it("rejects a non-finite 'actual' with a structured error", async () => {
    await call(handler, "ensemble_register_member", { member: member("mA") });
    const out = await call(handler, "ensemble_update_weights", { member_errors: { mA: 0.5 }, actual: "NaN" as any });
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });

  it("rejects a non-finite error value with a structured error", async () => {
    await call(handler, "ensemble_register_member", { member: member("mA") });
    const out = await call(handler, "ensemble_update_weights", { member_errors: { mA: Infinity }, actual: 1.0 });
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });
});
