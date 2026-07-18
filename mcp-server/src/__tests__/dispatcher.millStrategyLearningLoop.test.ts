/**
 * dispatcher.millStrategyLearningLoop.test.ts -- round-trip coverage for
 * U-MILL-STRATEGY-LEARNING-LOOP (slot:india 2026-06-22, prism_mill).
 *
 * Closes the MillStrategyNeuralEngine learning loop at the dispatcher boundary. Before
 * this unit the engine emitted predictions on random-init weights forever:
 *   - addTrainingExample() existed but was UNWIRED (actuals could not enter via MCP), and
 *   - there was NO training step (the buffer was a dead-end sink -- predict() never improved).
 * Plus the existing mill_strategy_recommend action was DEAD (it called a non-existent
 * engine method "recommend" and always threw -- sibling of reference_mill_optimizer_dead_actions).
 *
 * This wires three actions and proves the full loop through the dispatcher:
 *   mill_strategy_recommend  -> real predict()
 *   mill_strategy_record_outcome -> recordOutcome() (capture actuals)
 *   mill_strategy_train      -> trainFromBuffer() (SGD; buffered actuals update weights)
 *
 * ROUTING PROOF: the dispatcher mutates the SAME exported singleton this test inspects
 * directly (getEngine("strategy") === millStrategyNeuralEngine), so a record through the
 * dispatcher must change the singleton's buffer, and a train must bump its version + lower
 * its loss + flip predict()'s top strategy toward the trained label. Bad input must reject
 * with a structured error (no silent success).
 */

import { describe, it, expect, beforeEach } from "vitest";

import { registerMillDispatcher } from "../tools/dispatchers/millDispatcher.js";
import {
  millStrategyNeuralEngine,
  type StrategyFeatureVector,
} from "../engines/MillStrategyNeuralEngine.js";

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;

function makeStubServer(): { handler?: Handler; tool: (...a: unknown[]) => void } {
  const captured: { handler?: Handler } = {};
  return {
    get handler() { return captured.handler; },
    tool(...args: unknown[]) {
      // The registered tool's handler is the last function argument.
      const fn = [...args].reverse().find(a => typeof a === "function") as Handler | undefined;
      if (fn) captured.handler = fn;
    },
  } as { handler?: Handler; tool: (...a: unknown[]) => void };
}

function getMillHandler(): Handler {
  const server = makeStubServer();
  registerMillDispatcher(server as unknown as Parameters<typeof registerMillDispatcher>[0]);
  if (!server.handler) throw new Error("registerMillDispatcher did not register a tool handler");
  return server.handler;
}

function unwrap(res: unknown): Record<string, unknown> {
  const r = res as { content?: Array<{ text?: string }> };
  if (r?.content?.[0]?.text) {
    try { return JSON.parse(r.content[0].text as string); } catch { return res as Record<string, unknown>; }
  }
  return res as Record<string, unknown>;
}

// Distinct, finite feature vector; "drilling_standard" is catalog index 19 (last) so a
// successful flip to rank #1 is an unambiguous proof that training moved the model.
const FEAT: StrategyFeatureVector = {
  material_iso_group: 1,
  hardness_normalized: 0.45,
  operation_type: 2,
  tolerance_class: 2,
  feature_complexity: 0.7,
  machine_class: 1,
  depth_to_diameter: 0.6,
  wall_thickness_ratio: 0.3,
};
const LABEL = "drilling_standard";

describe("prism_mill -- strategy neural learning loop (round-trip)", () => {
  let handler: Handler;

  beforeEach(() => {
    handler = getMillHandler();
    millStrategyNeuralEngine.clearTrainingBuffer();
  });

  it("mill_strategy_recommend round-trips the real predict() (was a dead action)", async () => {
    const out = unwrap(await handler({ action: "mill_strategy_recommend", params: { ...FEAT } }));
    expect(Array.isArray(out.top_strategies)).toBe(true);
    expect((out.top_strategies as unknown[]).length).toBe(5);
    expect((out.top_strategies as Array<{ rank: number }>)[0].rank).toBe(1);
    expect(typeof out.model_version).toBe("string");
    expect(out.model_version as string).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it("mill_strategy_record_outcome buffers into the SAME singleton the dispatcher uses (routing proof)", async () => {
    const before = millStrategyNeuralEngine.getTrainingBufferSize();
    const out = unwrap(await handler({
      action: "mill_strategy_record_outcome",
      params: { features: FEAT, label_strategy_id: LABEL, outcome: "success" },
    }));
    expect(out.recorded).toBe(true);
    expect(out.strategy_id).toBe(LABEL);
    expect(out.buffer_size).toBe(before + 1);
    // The dispatcher mutated the real singleton, not a stub:
    expect(millStrategyNeuralEngine.getTrainingBufferSize()).toBe(before + 1);
  });

  it("rejects an unknown strategy_id with a structured error (no silent buffer)", async () => {
    const out = unwrap(await handler({
      action: "mill_strategy_record_outcome",
      params: { features: FEAT, label_strategy_id: "not_a_real_strategy", outcome: "success" },
    }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
    expect(millStrategyNeuralEngine.getTrainingBufferSize()).toBe(0); // nothing buffered
  });

  it("rejects a bad outcome enum with a structured error", async () => {
    const out = unwrap(await handler({
      action: "mill_strategy_record_outcome",
      params: { features: FEAT, label_strategy_id: LABEL, outcome: "kinda_ok" },
    }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
    expect(millStrategyNeuralEngine.getTrainingBufferSize()).toBe(0);
  });

  it("CLOSES THE LOOP: record actuals -> train -> predict's top strategy flips to the trained label", async () => {
    // Predict BEFORE training: under random init the trained label is almost never #1.
    const before = unwrap(await handler({ action: "mill_strategy_recommend", params: { ...FEAT } }));
    const versionBefore = before.model_version as string;

    // Capture three consistent actuals through the dispatcher.
    for (let i = 0; i < 3; i++) {
      await handler({
        action: "mill_strategy_record_outcome",
        params: { features: FEAT, label_strategy_id: LABEL, outcome: "success" },
      });
    }
    expect(millStrategyNeuralEngine.getTrainingBufferSize()).toBe(3);

    // Train through the dispatcher.
    const train = unwrap(await handler({
      action: "mill_strategy_train",
      params: { epochs: 80, learning_rate: 0.1 },
    }));
    expect(train.trained).toBe(true);
    expect(train.examples_used).toBe(3);
    expect(train.loss_after as number).toBeLessThan(train.loss_before as number);
    expect(train.model_version as string).toMatch(/^v0\.2\./);
    expect(train.model_version).not.toBe(versionBefore);

    // Predict AFTER training: the trained label now dominates for these features.
    const after = unwrap(await handler({ action: "mill_strategy_recommend", params: { ...FEAT } }));
    const top = (after.top_strategies as Array<{ strategy_id: string }>)[0];
    expect(top.strategy_id).toBe(LABEL);
    expect(after.model_version).toBe(train.model_version);
  });

  it("mill_strategy_train on an empty buffer reports trained:false (no phantom training)", async () => {
    const out = unwrap(await handler({ action: "mill_strategy_train", params: { epochs: 10 } }));
    expect(out.trained).toBe(false);
    expect(out.examples_used).toBe(0);
    expect(typeof out.reason).toBe("string");
  });

  it("mill_strategy_train rejects non-positive epochs with a structured error", async () => {
    const out = unwrap(await handler({ action: "mill_strategy_train", params: { epochs: -5 } }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });
});
