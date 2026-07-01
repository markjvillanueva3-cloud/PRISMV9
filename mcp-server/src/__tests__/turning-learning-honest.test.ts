/**
 * turning-learning-honest.test.ts -- slot:whiskey (Lathe Wizard, U-LW-CL-UNSTUB)
 * ============================================================================
 * orchestrateLearning (dispatcher-wired: lathe_ai_orchestrate_learning) previously returned
 * FABRICATED data presented as real:
 *   - _validateProgramPhysics = `return true` -> forced overallAccuracy/confidenceScore to a
 *     constant 1.0 for ANY input (a lie: it "validated" garbage);
 *   - _extractPatterns returned a hardcoded {material:"P", operation:"od_rough", confidence:0.75};
 *   - _updateNeuralNetworks returned a fake accuracy delta {beforeAccuracy:0.82, afterAccuracy:0.84,
 *     trainingEpochs:10} -- but the lathe MLP is sine-initialized/untrained (no real training path).
 *
 * The honest-fail (R12/R9): the structural pre-gate is now REAL (non-empty + recognizable NC codes),
 * so overallAccuracy is a true structural-pass ratio; _extractPatterns and _updateNeuralNetworks emit
 * nothing fabricated ([] patterns, null NN record). These tests prove the fabrication is GONE and the
 * remaining numbers are real (they discriminate garbage from real NC), including a round-trip through
 * the dispatcher boundary (R15).
 */
import { describe, it, expect } from "vitest";
import {
  latheAIOrchestrationEngine,
  type LearningOrchestrationResult,
} from "../engines/LatheAIOrchestrationEngine.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

// A structurally-real Okuma-style turning program (prep/motion codes + coordinate words).
const REAL_NC =
  "O0001\nN10 G50 S2000\nN20 G96 S180 M03\nN30 G00 X25.0 Z2.0\nN40 G71 P50 Q90 U0.4 W0.1 D2000 F0.25\nN90 G00 X100.0 Z100.0\nM30";
const GARBAGE = "the quick brown fox jumped over the lazy dog";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
function makeStubServer(): {
  tools: CapturedTool[];
  tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return { tools, tool(name, _d, _s, handler) { tools.push({ name, handler }); } };
}
async function getTurningHandler(): Promise<CapturedTool["handler"]> {
  const server = makeStubServer();
  registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  return server.tools[0].handler;
}
function unwrap(res: unknown): Record<string, unknown> {
  const r = res as { content?: Array<{ text?: string }> };
  if (r?.content?.[0]?.text) {
    try { return JSON.parse(r.content[0].text as string); } catch { return res as Record<string, unknown>; }
  }
  return res as Record<string, unknown>;
}

describe("U-LW-CL-UNSTUB -- orchestrateLearning emits NO fabricated learning metrics", () => {
  it("NO FABRICATED PATTERN: a real program yields patternsLearned [] (was a hardcoded od_rough/P/0.75)", async () => {
    const r = await latheAIOrchestrationEngine.orchestrateLearning([REAL_NC]);
    expect(r.patternsLearned).toEqual([]);
    // Regression guard: the specific fabricated signature must never reappear.
    expect(r.patternsLearned.some((p) => p.material === "P" && p.operation === "od_rough")).toBe(false);
    expect(r.trainingMetrics.patternsExtracted).toBe(0);
    expect(r.trainingMetrics.knowledgeNodesAdded).toBe(0);
  });

  it("NO FABRICATED NN METRICS: neuralNetworkUpdates [] (was a fake 0.82 -> 0.84 accuracy delta)", async () => {
    const r = await latheAIOrchestrationEngine.orchestrateLearning([REAL_NC]);
    expect(r.neuralNetworkUpdates).toEqual([]);
    // Regression guard: the specific fabricated accuracy numbers must never reappear.
    expect(r.neuralNetworkUpdates.some((n) => n.beforeAccuracy === 0.82 && n.afterAccuracy === 0.84)).toBe(false);
  });

  it("REAL STRUCTURAL GATE: a garbage-only list yields overallAccuracy 0 (was a blind constant 1.0)", async () => {
    const r = await latheAIOrchestrationEngine.orchestrateLearning([GARBAGE]);
    expect(r.trainingMetrics.overallAccuracy).toBe(0);
    expect(r.trainingMetrics.physicsValidatedPrograms).toBe(0);
    expect(r.confidenceScore).toBe(0);
  });

  it("HONEST 1.0 IS EARNED: a single real NC program is structurally valid -> overallAccuracy 1", async () => {
    const r = await latheAIOrchestrationEngine.orchestrateLearning([REAL_NC]);
    // 1.0 here is a TRUE measurement (the program really is structurally valid), not a fabricated constant.
    expect(r.trainingMetrics.overallAccuracy).toBe(1);
    expect(r.confidenceScore).toBe(r.trainingMetrics.overallAccuracy); // confidence derives from the real ratio
  });

  it("GATE DISCRIMINATES: a mixed [realNC, \"\"] list yields overallAccuracy 0.5 (empty is rejected)", async () => {
    const r = await latheAIOrchestrationEngine.orchestrateLearning([REAL_NC, ""]);
    expect(r.trainingMetrics.validPrograms).toBe(2);
    expect(r.trainingMetrics.physicsValidatedPrograms).toBe(1); // only the real one passes
    expect(r.trainingMetrics.overallAccuracy).toBeCloseTo(0.5, 5);
  });

  it("an empty-string program alone yields overallAccuracy 0 (not blind true)", async () => {
    const r = await latheAIOrchestrationEngine.orchestrateLearning([""]);
    expect(r.trainingMetrics.physicsValidatedPrograms).toBe(0);
    expect(r.trainingMetrics.overallAccuracy).toBe(0);
  });

  it("a coordinate-word-only program (no G/M code) still validates as NC content", async () => {
    const r = await latheAIOrchestrationEngine.orchestrateLearning(["X25.4 Z-10.0"]);
    expect(r.trainingMetrics.physicsValidatedPrograms).toBe(1);
  });

  it("patterns are [] regardless of the extractPatterns flag (no fabrication either way)", async () => {
    const on = await latheAIOrchestrationEngine.orchestrateLearning([REAL_NC], { extractPatterns: true });
    const off = await latheAIOrchestrationEngine.orchestrateLearning([REAL_NC], { extractPatterns: false });
    expect(on.patternsLearned).toEqual([]);
    expect(off.patternsLearned).toEqual([]);
    expect(on.neuralNetworkUpdates).toEqual([]);
  });

  it("DISPATCHER ROUND-TRIP: lathe_ai_orchestrate_learning returns the honest result (R15)", async () => {
    const handler = await getTurningHandler();
    const out = unwrap(await handler({ action: "lathe_ai_orchestrate_learning", params: { programs: [REAL_NC] } }));
    expect(out.success).toBe(true);
    const data = out.data as LearningOrchestrationResult;
    // slimResponse drops empty arrays on the wire, so [] is legitimately absent here -- `?? []`
    // normalizes that. A FABRICATED non-empty pattern/NN would survive slimming and fail this,
    // so absence-of-fabrication is still proven (the engine-direct tests assert the [] exactly).
    expect(data.patternsLearned ?? []).toEqual([]);
    expect(data.neuralNetworkUpdates ?? []).toEqual([]);
    expect(data.confidenceScore).toBe(1); // real NC -> earned 1.0 (survives slimming, it is a number)
  });

  it("DISPATCHER ROUND-TRIP: a mixed list carries the honest 0.5 ratio through the wire", async () => {
    const handler = await getTurningHandler();
    const out = unwrap(await handler({ action: "lathe_ai_orchestrate_learning", params: { programs: [REAL_NC, GARBAGE] } }));
    expect(out.success).toBe(true);
    const data = out.data as LearningOrchestrationResult;
    expect(data.trainingMetrics.overallAccuracy).toBeCloseTo(0.5, 5);
    expect(data.trainingMetrics.physicsValidatedPrograms).toBe(1);
  });

  it("DISPATCHER GUARD: non-array programs is rejected (no silent fabricated success)", async () => {
    const handler = await getTurningHandler();
    const out = unwrap(await handler({ action: "lathe_ai_orchestrate_learning", params: {} }));
    expect(out.success).toBe(false);
    expect(String(out.error)).toMatch(/programs/i);
  });

  it("DIRECT-CALL: _updateNeuralNetworks returns null (honest contract, independent of the dead caller block)", async () => {
    // The caller only reaches _updateNeuralNetworks when patternsLearned is non-empty; because
    // _extractPatterns now returns [], that block is currently dead. This asserts the method's honest
    // contract DIRECTLY, so a re-introduced fabricated {beforeAccuracy, afterAccuracy, trainingEpochs}
    // record fails here even though the caller cannot exercise it (closes the coverage gap).
    const engine = latheAIOrchestrationEngine as unknown as {
      _updateNeuralNetworks(patterns: unknown[]): Promise<unknown>;
    };
    const seedPattern = {
      patternId: "p1", patternType: "success", material: "P", operation: "od_rough",
      sampleCount: 1, successRate: 1, confidence: 0.9,
    };
    const nn = await engine._updateNeuralNetworks([seedPattern]);
    expect(nn).toBeNull(); // no fabricated NN record until a real trainer is wired
  });
});
