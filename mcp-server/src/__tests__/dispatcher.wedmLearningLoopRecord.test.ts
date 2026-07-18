/**
 * dispatcher.wedmLearningLoopRecord.test.ts -- round-trip coverage for the R12 fix to
 * U-WEDM-LEARNING-LOOP-RECORD (slot:india 2026-06-22, prism_edm).
 *
 * The action `wedm_learning_loop_record` previously did
 *   `(wedmLearningLoopEngine as any).recordOutcome?.(params as any)`
 * and unconditionally returned `{recorded:true}` -- it swallowed type errors and LIED about
 * success (a job was "recorded" even on garbage input). The fix validates the JobOutcome
 * contract, coerces the JSON timestamp string to a Date, and reports the REAL total_jobs
 * delta. These tests prove: (a) a valid outcome actually increments the engine's total_jobs
 * and the action's reported total_jobs matches the engine (routing proof), (b) invalid input
 * is rejected with success:false and records NOTHING (no phantom job).
 */

import { describe, it, expect } from "vitest";

import { registerEdmDispatcher } from "../tools/dispatchers/edmDispatcher.js";
import { wedmLearningLoopEngine } from "../engines/WEDMLearningLoopEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): { tools: CapturedTool[]; tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void } {
  const tools: CapturedTool[] = [];
  return { tools, tool(name, _d, _s, handler) { tools.push({ name, handler }); } };
}

async function getEdmHandler(): Promise<CapturedTool["handler"]> {
  const server = makeStubServer();
  registerEdmDispatcher(server as unknown as Parameters<typeof registerEdmDispatcher>[0]);
  return server.tools[0].handler;
}

function unwrap(res: unknown): Record<string, any> {
  const r = res as { content?: Array<{ text?: string }> };
  if (r?.content?.[0]?.text) {
    try { return JSON.parse(r.content[0].text as string); } catch { return res as Record<string, any>; }
  }
  return res as Record<string, any>;
}

function validOutcome(jobId: string) {
  return {
    job_id: jobId,
    timestamp: "2026-06-22T00:00:00.000Z", // JSON string -> must be coerced to Date
    material: "D2",
    thickness_mm: 25.4,
    wire_type: "brass",
    wire_diameter_mm: 0.25,
    predicted: { cutting_speed_mm_min: 2.1, wire_tension_N: 12, peak_current_A: 18, passes: 4, time_min: 30 },
    actual: { cutting_speed_mm_min: 2.0, wire_tension_N: 12, peak_current_A: 18, passes: 4, time_min: 33, wire_breaks: 0 },
    success: true,
  };
}

describe("U-WEDM-LEARNING-LOOP-RECORD -- typed validated recordOutcome (R12 fix)", () => {
  it("a valid JobOutcome actually increments the engine total_jobs (routing proof, no lie)", async () => {
    const handler = await getEdmHandler();
    const before = wedmLearningLoopEngine.getStats().total_jobs;
    const out = unwrap(await handler({ action: "wedm_learning_loop_record", params: validOutcome("india-wllr-test-1") }));
    const after = wedmLearningLoopEngine.getStats().total_jobs;

    expect(out.success).toBe(true);
    expect(after).toBe(before + 1);              // the record genuinely landed
    expect(out.data.recorded).toBe(true);        // truthful, derived from the real delta
    expect(out.data.total_jobs).toBe(after);     // action's count == engine's count (routing proof)
    expect(out.data.job_id).toBe("india-wllr-test-1");
  });

  it("invalid input is rejected and records NOTHING (was: swallowed + lied recorded:true)", async () => {
    const handler = await getEdmHandler();
    const before = wedmLearningLoopEngine.getStats().total_jobs;

    const out = unwrap(await handler({ action: "wedm_learning_loop_record", params: { material: "D2" } })); // no job_id/predicted/actual
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/JobOutcome/i);

    const after = wedmLearningLoopEngine.getStats().total_jobs;
    expect(after).toBe(before);                  // critical: NO phantom record on bad input
  });
});
