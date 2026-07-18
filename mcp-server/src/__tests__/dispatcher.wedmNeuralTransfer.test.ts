/**
 * dispatcher.wedmNeuralTransfer.test.ts -- round-trip coverage for
 * U-WEDM-NEURAL-TRANSFER (slot:india 2026-06-22, prism_edm).
 *
 * Closes the train side of the WEDM neural loop. WEDMNeuralTrainingEngine.ensemblePredict was
 * wired (wedm_neural_training_ensemble) but transferLearn -- the TRAINING path (pretrain on
 * in-memory Mitsubishi/Makino tech data, fine-tune on JM Die data) -- was UNWIRED, so the
 * ensemble could predict but never (re)train from the corpus. This wires
 * wedm_neural_training_transfer. (transferLearn is in-memory/CPU-bound -- no disk I/O -- so it
 * is a clean additive wire; tests pass tiny epoch counts to keep runtime small.)
 *
 * INTENT PROOF: a real TransferLearningState comes back (source/target domains + numeric
 * val-losses + a finite transfer_efficiency) -- a no-op/unwired path could not produce it.
 */

import { describe, it, expect } from "vitest";

import { registerEdmDispatcher } from "../tools/dispatchers/edmDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function getEdmHandler(): CapturedTool["handler"] {
  const tools: CapturedTool[] = [];
  const server = { tool: (_n: string, _d: string, _s: unknown, h: CapturedTool["handler"]) => { tools.push({ name: _n, handler: h }); } };
  registerEdmDispatcher(server as unknown as Parameters<typeof registerEdmDispatcher>[0]);
  return tools[0].handler;
}

function unwrap(res: unknown): Record<string, any> {
  const r = res as { content?: Array<{ text?: string }> };
  if (r?.content?.[0]?.text) {
    try { return JSON.parse(r.content[0].text as string); } catch { return res as Record<string, any>; }
  }
  return res as Record<string, any>;
}

describe("prism_edm -- WEDM neural transfer-learning (round-trip)", () => {
  const handler = getEdmHandler();

  it("CLOSES THE LOOP: transferLearn runs and returns a real TransferLearningState", async () => {
    const out = unwrap(await handler({
      action: "wedm_neural_training_transfer",
      params: { pretrain_epochs: 1, finetune_epochs: 1, learning_rate: 0.001 },
    }));
    expect(out.success).toBe(true);
    expect(out.data.source_domain).toBe("combined");
    expect(out.data.target_domain).toBe("jm_die");
    expect(out.data.pretrain_epochs).toBe(1);
    expect(out.data.finetune_epochs).toBe(1);
    // Real training produces numeric validation losses + a finite efficiency (no-op could not).
    expect(Number.isFinite(out.data.source_val_loss)).toBe(true);
    expect(Number.isFinite(out.data.target_val_loss)).toBe(true);
    expect(Number.isFinite(out.data.transfer_efficiency)).toBe(true);
  });

  it("uses config defaults when no options are passed (still returns a valid state)", async () => {
    // No epoch override -> defaults (50/25). Still in-memory; assert the contract, not timing.
    const out = unwrap(await handler({ action: "wedm_neural_training_transfer", params: {} }));
    expect(out.success).toBe(true);
    expect(out.data.pretrain_epochs).toBe(50);
    expect(out.data.finetune_epochs).toBe(25);
  }, 30000);

  it("rejects non-positive pretrain_epochs (structured error)", async () => {
    const out = unwrap(await handler({ action: "wedm_neural_training_transfer", params: { pretrain_epochs: 0 } }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });

  it("rejects a non-integer finetune_epochs (structured error)", async () => {
    const out = unwrap(await handler({ action: "wedm_neural_training_transfer", params: { finetune_epochs: 1.5 } }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });

  it("rejects a non-positive learning_rate (structured error)", async () => {
    const out = unwrap(await handler({ action: "wedm_neural_training_transfer", params: { learning_rate: -0.01 } }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });
});
