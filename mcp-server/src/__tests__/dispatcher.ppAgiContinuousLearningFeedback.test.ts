/**
 * dispatcher.ppAgiContinuousLearningFeedback.test.ts -- round-trip coverage for
 * U-PP-AGI-CL-FEEDBACK (slot:india 2026-06-22, prism_cam / camDispatcher).
 *
 * Closes the PostProcessorAGIContinuousLearningEngine loop at the dispatcher boundary.
 * Before this, ONLY 3 READ actions were wired (pp_agi_cl_get_state / _top_mistakes /
 * _prevention_rules) -- recordFeedback (the ACTUALS write) was unwired, so the learning
 * engine could be READ but never FED: predictions/prevention-rules went out, the operator's
 * observed outcome never came back. This wires pp_agi_cl_record_feedback (parity with the
 * already-wired lathe_agi_feedback) so the loop closes.
 *
 * INTENT PROOF: record a ProductionFeedback through the dispatcher, then read get_state
 * through the dispatcher and assert totalFeedback incremented -- a frozen no-op would leave
 * the read action's totalFeedback at 0. Round-tripped through the real camDispatcher.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { postProcessorAGIContinuousLearningEngine } from "../engines/PostProcessorAGIContinuousLearningEngine.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function getCamHandler(): Handler {
  const tools: Array<{ handler: Handler }> = [];
  const server = { tool: (_n: string, _d: string, _s: unknown, h: Handler) => { tools.push({ handler: h }); } };
  registerCamDispatcher(server as any);
  return tools[0].handler;
}

function unwrap(res: unknown): Record<string, any> {
  const r = res as { content?: Array<{ text?: string }> };
  if (r?.content?.[0]?.text) {
    try { return JSON.parse(r.content[0].text as string); } catch { return res as Record<string, any>; }
  }
  return res as Record<string, any>;
}

function feedback(postId: string, outcome = "success") {
  // controller/material/operations are REQUIRED fields of ProductionFeedback.
  return { postId, generatedAt: "2026-06-22T00:00:00Z", outcome, controller: "fanuc", material: "4140", operations: ["face", "drill"] };
}

describe("prism_cam -- PP AGI continuous-learning feedback loop (round-trip)", () => {
  let handler: Handler;

  beforeEach(() => {
    handler = getCamHandler();
    postProcessorAGIContinuousLearningEngine.resetLearning();
  });

  it("CLOSES THE LOOP: a recorded outcome is visible in the read action's totalFeedback", async () => {
    const rec = unwrap(await handler({ action: "pp_agi_cl_record_feedback", params: { feedback: feedback("p1") } }));
    expect(rec.success).toBe(true);
    expect(typeof rec.data.learningsGenerated).toBe("number");
    expect(rec.data.learningsGenerated).toBeGreaterThanOrEqual(1);

    // The read action now observes the recorded actuals -> the loop is closed end-to-end.
    const state = unwrap(await handler({ action: "pp_agi_cl_get_state", params: {} }));
    expect(state.data.totalFeedback).toBe(1);
  });

  it("accumulates multiple recorded outcomes (each pass feeds the next)", async () => {
    await handler({ action: "pp_agi_cl_record_feedback", params: { feedback: feedback("p1") } });
    await handler({ action: "pp_agi_cl_record_feedback", params: { feedback: feedback("p2", "minor_edits") } });
    await handler({ action: "pp_agi_cl_record_feedback", params: { feedback: feedback("p3", "failed") } });
    const state = unwrap(await handler({ action: "pp_agi_cl_get_state", params: {} }));
    expect(state.data.totalFeedback).toBe(3);
  });

  it("a failed outcome WITH corrections updates a mistake pattern (real processing, not a stub)", async () => {
    const fb = {
      ...feedback("pf", "failed"),
      corrections: [{ line: 12, type: "feed", original: "F0.3", corrected: "F0.15", reason: "chatter" }],
    };
    const rec = unwrap(await handler({ action: "pp_agi_cl_record_feedback", params: { feedback: fb } }));
    expect(rec.success).toBe(true);
    // failed + a correction -> detectAndUpdatePatterns must register at least one pattern.
    expect(rec.data.patternsUpdated).toBeGreaterThanOrEqual(1);
    expect(typeof rec.data.knowledgeAdded).toBe("number");
    // observable via the read action:
    const top = unwrap(await handler({ action: "pp_agi_cl_top_mistakes", params: { limit: 5 } }));
    expect(Array.isArray(top.data)).toBe(true);
    expect(top.data.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects a missing feedback object (structured error, no phantom record)", async () => {
    const out = unwrap(await handler({ action: "pp_agi_cl_record_feedback", params: {} }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
    const state = unwrap(await handler({ action: "pp_agi_cl_get_state", params: {} }));
    expect(state.data.totalFeedback).toBe(0);
  });

  it("rejects feedback missing postId/generatedAt (structured error)", async () => {
    const out = unwrap(await handler({ action: "pp_agi_cl_record_feedback", params: { feedback: { outcome: "success" } } }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });

  it("rejects an invalid outcome enum (structured error)", async () => {
    const out = unwrap(await handler({ action: "pp_agi_cl_record_feedback", params: { feedback: { postId: "p", generatedAt: "2026-06-22T00:00:00Z", outcome: "whoops", controller: "fanuc", material: "4140", operations: ["face"] } } }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });

  it("rejects feedback missing required context (controller/material/operations) -- would crash the engine's success path", async () => {
    // The engine's extractKnowledgeFromSuccess reads feedback.operations[0] unguarded; the boundary
    // must enforce the full required contract so a malformed record can never reach (and crash) it.
    const out = unwrap(await handler({ action: "pp_agi_cl_record_feedback", params: { feedback: { postId: "p", generatedAt: "2026-06-22T00:00:00Z", outcome: "success" } } }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
    const state = unwrap(await handler({ action: "pp_agi_cl_get_state", params: {} }));
    expect(state.data.totalFeedback).toBe(0); // rejected at the boundary -> never pushed
  });
});
