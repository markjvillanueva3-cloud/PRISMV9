/**
 * WEDMNeuralTransferRollback.test.ts -- fail-safe state-restore for transferLearn
 * (U-WEDM-NEURAL-TRANSFER-ROLLBACK, slot:india 2026-06-22, AI-training error-path hardening).
 *
 * transferLearn does a DESTRUCTIVE `this.state.training_data = []` on the tech->JM handoff,
 * then reloads. Before this fix there was no try/finally: a throw between the wipe and the
 * restore lost the caller's corpus AND left isTraining stuck `true`. These tests inject a
 * throw at each mutation point and assert the engine restores its training corpus + clears
 * isTraining after a failed transfer (corpus rolled back to the entry snapshot, training flag
 * cleared, no partial transfer_state), and that the success path is unchanged. (Pretrain weight
 * updates that ran before a throw are intentionally NOT rolled back -- a learning engine may
 * re-run for a clean pass; the contract here is corpus + flag + transfer_state integrity.)
 *
 * INTENT PROOF: each rollback assertion FAILS against the pre-fix method -- without the
 * finally, isTraining stays `true` and training_data is the wiped/partial set, not the
 * entry snapshot. A no-op wiring could not produce a restored corpus + a cleared flag.
 */

import { describe, it, expect } from "vitest";

import { WEDMNeuralTrainingEngine } from "../engines/WEDMNeuralTrainingEngine.js";

/** Fresh engine seeded with a baseline corpus so rollback has something real to restore. */
function seeded(): WEDMNeuralTrainingEngine {
  const e = new WEDMNeuralTrainingEngine();
  e.loadMitsubishiTechData();
  return e;
}

/** Access private state/flags for invariant checks (test-only cast). */
function trainingIds(e: WEDMNeuralTrainingEngine): string[] {
  return ((e as unknown as { state: { training_data: Array<{ id: string }> } }).state.training_data)
    .map((p) => p.id)
    .sort();
}
function isTraining(e: WEDMNeuralTrainingEngine): boolean {
  return (e as unknown as { isTraining: boolean }).isTraining;
}

describe("WEDMNeuralTrainingEngine.transferLearn -- fail-safe state restore", () => {
  it("SUCCESS path unchanged: returns a real TransferLearningState + clears isTraining", () => {
    const e = new WEDMNeuralTrainingEngine();
    const state = e.transferLearn({ pretrainEpochs: 1, finetuneEpochs: 1 });
    expect(state.source_domain).toBe("combined");
    expect(state.target_domain).toBe("jm_die");
    expect(state.pretrain_epochs).toBe(1);
    expect(Number.isFinite(state.source_val_loss)).toBe(true);
    expect(Number.isFinite(state.target_val_loss)).toBe(true);
    expect(isTraining(e)).toBe(false);
    // success keeps the loaded transfer corpus + persists the transfer_state
    expect(trainingIds(e).length).toBeGreaterThan(0);
    expect(e.getTransferState()?.target_domain).toBe("jm_die");
  });

  it("ROLLS BACK on a post-wipe loader fault: corpus restored + isTraining cleared", () => {
    const e = seeded();
    const before = trainingIds(e);
    expect(before.length).toBeGreaterThan(0);

    // loadJMDieData runs AFTER the destructive `training_data = []` -- the worst case.
    (e as unknown as { loadJMDieData: () => number }).loadJMDieData = () => {
      throw new Error("injected-loader-fault");
    };

    expect(() => e.transferLearn({ pretrainEpochs: 1, finetuneEpochs: 1 })).toThrow(
      "injected-loader-fault",
    );

    expect(isTraining(e)).toBe(false);
    expect(trainingIds(e)).toEqual(before); // exact corpus restored, not the wiped/partial set
  });

  it("ROLLS BACK on a fine-tune train() fault (after the wipe)", () => {
    const e = seeded();
    const before = trainingIds(e);
    const real = (e as unknown as { train: (...a: unknown[]) => unknown }).train.bind(e);
    let calls = 0;
    (e as unknown as { train: (...a: unknown[]) => unknown }).train = (...args: unknown[]) => {
      calls += 1;
      if (calls >= 2) throw new Error("injected-finetune-fault"); // 2nd train() == fine-tune
      return real(...args);
    };

    expect(() => e.transferLearn({ pretrainEpochs: 1, finetuneEpochs: 1 })).toThrow(
      "injected-finetune-fault",
    );

    expect(isTraining(e)).toBe(false);
    expect(trainingIds(e)).toEqual(before);
  });

  it("ROLLS BACK on a pretrain train() fault (before any wipe), restoring the ENTRY snapshot", () => {
    const e = seeded();
    const before = trainingIds(e);
    (e as unknown as { train: () => unknown }).train = () => {
      throw new Error("injected-pretrain-fault");
    };

    expect(() => e.transferLearn({ pretrainEpochs: 1, finetuneEpochs: 1 })).toThrow(
      "injected-pretrain-fault",
    );

    expect(isTraining(e)).toBe(false);
    // pretrain throws AFTER loadMitsubishi/loadMakino appended -- rollback must restore the
    // entry snapshot (before those internal appends), proving the snapshot is taken at entry.
    expect(trainingIds(e)).toEqual(before);
  });

  it("leaves NO partial transfer_state after a failure + still rolls the corpus back (adversarial)", () => {
    const e = seeded();
    const before = trainingIds(e);
    (e as unknown as { loadJMDieData: () => number }).loadJMDieData = () => {
      throw new Error("fault");
    };
    expect(() => e.transferLearn({ pretrainEpochs: 1, finetuneEpochs: 1 })).toThrow("fault");
    // transfer_state is assigned only on the success path (completed == true)
    expect(e.getTransferState()).toBe(undefined);
    expect(trainingIds(e)).toEqual(before);
    expect(isTraining(e)).toBe(false);
  });
});
