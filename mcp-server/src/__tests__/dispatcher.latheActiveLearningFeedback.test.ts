/**
 * dispatcher.latheActiveLearningFeedback.test.ts -- round-trip coverage for
 * U-LATHE-ACTIVE-LEARN-FEEDBACK (slot:india 2026-06-22, prism_turning).
 *
 * Closes the lathe active-learning loop at the dispatcher boundary: the query-side
 * (select/update/uncertainty/committee) was already wired, but the ACTUALS-side --
 * LatheActiveLearningEngine.processOperatorFeedback (operator returns observed quality)
 * and calibrateModelConfidence (Platt/ECE pass) -- had NO dispatcher surface, so the
 * calibration path was dead-letter. These two new actions expose the already-built,
 * already-unit-tested methods.
 *
 * ROUTING PROOF: each wired action's output must EXACTLY equal a direct call on the same
 * singleton the dispatcher uses (the methods are pure reads, so deterministic). Plus the
 * missing-param guard must reject (no silent success), and the fallback path returns the
 * operator's own values verbatim.
 */

import { describe, it, expect } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import {
  latheActiveLearningEngine,
  type OperatorFeedback,
} from "../engines/LatheActiveLearningEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): { tools: CapturedTool[]; tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void } {
  const tools: CapturedTool[] = [];
  return { tools, tool(name, _d, _s, handler) { tools.push({ name, handler }); } };
}

async function getTurningHandler(): Promise<CapturedTool["handler"]> {
  const server = makeStubServer();
  registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  // tools[0] is the registered prism_turning tool; its handler throws if absent (real failure).
  return server.tools[0].handler;
}

function unwrap(res: unknown): Record<string, unknown> {
  const r = res as { content?: Array<{ text?: string }> };
  if (r?.content?.[0]?.text) {
    try { return JSON.parse(r.content[0].text as string); } catch { return res as Record<string, unknown>; }
  }
  return res as Record<string, unknown>;
}

const FEEDBACK: OperatorFeedback = {
  experiment_id: "exp-not-in-pool-xyz",
  operator_id: "op-7",
  timestamp: "2026-06-22T00:00:00.000Z",
  actual_quality: 2,
  observations: ["clean finish", "no chatter"],
  anomalies_noted: [],
  confidence: 0.8,
};

describe("U-LATHE-ACTIVE-LEARN-FEEDBACK -- prism_turning active-learning feedback + calibrate", () => {
  it("lathe_active_learning_feedback routes to processOperatorFeedback; fallback echoes the operator's own values", async () => {
    const handler = await getTurningHandler();
    const out = unwrap(await handler({ action: "lathe_active_learning_feedback", params: { feedback: FEEDBACK } }));
    expect(out.success).toBe(true);
    // experiment_id is absent from the (unseeded) labeled pool -> deterministic fallback:
    // the operator's own actual_quality/confidence are echoed with source "operator".
    const direct = latheActiveLearningEngine.processOperatorFeedback(FEEDBACK);
    expect(out.data).toEqual(direct);
    expect(direct).toEqual({ updated_label: 2, updated_confidence: 0.8, source: "operator" });
  });

  it("lathe_active_learning_feedback rejects missing/invalid feedback (no silent success)", async () => {
    const handler = await getTurningHandler();
    const out = unwrap(await handler({ action: "lathe_active_learning_feedback", params: {} }));
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/feedback/i);

    // experiment_id + actual_quality missing -> still rejected (guard checks both).
    const bad = unwrap(await handler({ action: "lathe_active_learning_feedback", params: { feedback: { operator_id: "x" } } }));
    expect(bad.success).toBe(false);
  });

  it("lathe_active_learning_calibrate routes to calibrateModelConfidence (exact routing proof)", async () => {
    const handler = await getTurningHandler();
    const out = unwrap(await handler({ action: "lathe_active_learning_calibrate", params: {} }));
    expect(out.success).toBe(true);
    // calibrateModelConfidence is a pure read over labeled+predictions -> the wired action's
    // output must EXACTLY equal a direct call on the same singleton.
    expect(out.data).toEqual(latheActiveLearningEngine.calibrateModelConfidence());
  });

  it("calibrateModelConfidence is deterministic on identical state (Platt fit is a pure function)", () => {
    expect(latheActiveLearningEngine.calibrateModelConfidence())
      .toEqual(latheActiveLearningEngine.calibrateModelConfidence());
  });
});
