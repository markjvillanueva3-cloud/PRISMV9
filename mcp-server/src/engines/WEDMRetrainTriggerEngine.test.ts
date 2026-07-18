import { describe, it, expect, beforeEach } from "vitest";
import { wedmRetrainTriggerEngine } from "./WEDMRetrainTriggerEngine.js";

const DEFAULT_THRESHOLD = 500;
const DEFAULT_WARNING_FRACTION = 0.8;

describe("WEDMRetrainTriggerEngine — config + checkpoint API", () => {
  beforeEach(() => {
    wedmRetrainTriggerEngine.setConfig({
      retrain_threshold: DEFAULT_THRESHOLD,
      warning_fraction: DEFAULT_WARNING_FRACTION,
    });
    wedmRetrainTriggerEngine.resetCheckpoint();
  });

  it("setConfig merges partial config; getConfig returns defensive copy", () => {
    wedmRetrainTriggerEngine.setConfig({ retrain_threshold: 1000 });
    const a = wedmRetrainTriggerEngine.getConfig();
    a.retrain_threshold = 999999;
    a.warning_fraction = 0.01;
    const b = wedmRetrainTriggerEngine.getConfig();
    expect(b.retrain_threshold).toBe(1000);
    expect(b.warning_fraction).toBe(DEFAULT_WARNING_FRACTION);
  });

  it("recordCheckpoint sets outcomes_at_last_retrain + version + timestamp", () => {
    const cp = wedmRetrainTriggerEngine.recordCheckpoint({
      outcomes_at_this_point: 500,
      adapter_version: "v0.1.0",
      timestamp: "2026-05-27T12:00:00Z",
    });
    expect(cp.outcomes_at_last_retrain).toBe(500);
    expect(cp.last_adapter_version).toBe("v0.1.0");
    expect(cp.last_retrain_at).toBe("2026-05-27T12:00:00Z");
    expect(cp.notes).toBe("");
  });

  it("recordCheckpoint floors fractional outcomes and accepts notes", () => {
    const cp = wedmRetrainTriggerEngine.recordCheckpoint({
      outcomes_at_this_point: 523.7,
      adapter_version: "v0.2.0",
      notes: "Ra-accuracy 0.85, MRR-accuracy 0.78",
    });
    expect(cp.outcomes_at_last_retrain).toBe(523);
    expect(cp.notes).toBe("Ra-accuracy 0.85, MRR-accuracy 0.78");
  });

  it("FAILURE: recordCheckpoint throws on negative outcomes", () => {
    expect(() =>
      wedmRetrainTriggerEngine.recordCheckpoint({
        outcomes_at_this_point: -1,
        adapter_version: "v0.1.0",
      }),
    ).toThrow(/non-negative finite/i);
  });

  it("FAILURE: recordCheckpoint throws on NaN outcomes", () => {
    expect(() =>
      wedmRetrainTriggerEngine.recordCheckpoint({
        outcomes_at_this_point: NaN,
        adapter_version: "v0.1.0",
      }),
    ).toThrow(/non-negative finite/i);
  });

  it("FAILURE: recordCheckpoint throws on empty adapter_version", () => {
    expect(() =>
      wedmRetrainTriggerEngine.recordCheckpoint({
        outcomes_at_this_point: 100,
        adapter_version: "",
      }),
    ).toThrow(/non-empty/i);
  });

  it("FAILURE: recordCheckpoint throws on whitespace-only adapter_version", () => {
    expect(() =>
      wedmRetrainTriggerEngine.recordCheckpoint({
        outcomes_at_this_point: 100,
        adapter_version: "   ",
      }),
    ).toThrow(/non-empty/i);
  });

  it("resetCheckpoint restores 'no retrain yet' state", () => {
    wedmRetrainTriggerEngine.recordCheckpoint({ outcomes_at_this_point: 500, adapter_version: "v0.1.0" });
    wedmRetrainTriggerEngine.resetCheckpoint();
    const cp = wedmRetrainTriggerEngine.getCheckpoint();
    expect(cp.outcomes_at_last_retrain).toBe(0);
    expect(cp.last_adapter_version).toBeNull();
    expect(cp.last_retrain_at).toBeNull();
    expect(cp.notes).toBe("no retrain yet");
  });
});

describe("WEDMRetrainTriggerEngine — status calculation", () => {
  beforeEach(() => {
    wedmRetrainTriggerEngine.setConfig({
      retrain_threshold: DEFAULT_THRESHOLD,
      warning_fraction: DEFAULT_WARNING_FRACTION,
    });
    wedmRetrainTriggerEngine.resetCheckpoint();
  });

  it("HAPPY PATH: zero outcomes → not ready, fraction=0, threshold message", () => {
    const s = wedmRetrainTriggerEngine.status(0);
    expect(s.ready).toBe(false);
    expect(s.total_outcomes).toBe(0);
    expect(s.outcomes_since_last_retrain).toBe(0);
    expect(s.threshold).toBe(DEFAULT_THRESHOLD);
    expect(s.fraction_to_threshold).toBe(0);
    expect(s.reason).toMatch(/below threshold/i);
  });

  it("HAPPY PATH: 250 outcomes (half threshold) → not ready, fraction=0.5", () => {
    const s = wedmRetrainTriggerEngine.status(250);
    expect(s.ready).toBe(false);
    expect(s.outcomes_since_last_retrain).toBe(250);
    expect(s.fraction_to_threshold).toBe(0.5);
  });

  it("HAPPY PATH: 500 outcomes exactly at threshold → ready with next_actions", () => {
    const s = wedmRetrainTriggerEngine.status(500);
    expect(s.ready).toBe(true);
    expect(s.outcomes_since_last_retrain).toBe(500);
    expect(s.fraction_to_threshold).toBe(1);
    expect(s.reason).toMatch(/retrain READY/i);
    expect(s.next_actions.length).toBeGreaterThanOrEqual(4);
    expect(s.next_actions[0]).toMatch(/wedm_lora_dataset_build/);
  });

  it("HAPPY PATH: 800 outcomes (1.6x threshold) → ready, fraction clamps to 1", () => {
    const s = wedmRetrainTriggerEngine.status(800);
    expect(s.ready).toBe(true);
    expect(s.fraction_to_threshold).toBe(1);
  });

  it("WARNING: 420 outcomes (84% of threshold) → not ready but warning surfaces", () => {
    const s = wedmRetrainTriggerEngine.status(420);
    expect(s.ready).toBe(false);
    expect(s.fraction_to_threshold).toBeCloseTo(0.84, 2);
    expect(s.reason).toMatch(/approaching retrain threshold/i);
    expect(s.next_actions[0]).toMatch(/GPU machine/i);
  });

  it("CHECKPOINT INTEGRATION: 600 outcomes total - 500 at checkpoint = 100 since last → not ready", () => {
    wedmRetrainTriggerEngine.recordCheckpoint({ outcomes_at_this_point: 500, adapter_version: "v0.1.0" });
    const s = wedmRetrainTriggerEngine.status(600);
    expect(s.outcomes_since_last_retrain).toBe(100);
    expect(s.ready).toBe(false);
  });

  it("CHECKPOINT INTEGRATION: 1100 total - 500 at checkpoint = 600 since last ≥ 500 → ready", () => {
    wedmRetrainTriggerEngine.recordCheckpoint({ outcomes_at_this_point: 500, adapter_version: "v0.1.0" });
    const s = wedmRetrainTriggerEngine.status(1100);
    expect(s.outcomes_since_last_retrain).toBe(600);
    expect(s.ready).toBe(true);
  });

  it("CHECKPOINT INTEGRATION: status carries the current checkpoint payload", () => {
    wedmRetrainTriggerEngine.recordCheckpoint({
      outcomes_at_this_point: 500,
      adapter_version: "v0.2.0",
      timestamp: "2026-05-27T10:00:00Z",
      notes: "first prod run",
    });
    const s = wedmRetrainTriggerEngine.status(700);
    expect(s.checkpoint.last_adapter_version).toBe("v0.2.0");
    expect(s.checkpoint.last_retrain_at).toBe("2026-05-27T10:00:00Z");
    expect(s.checkpoint.notes).toBe("first prod run");
  });

  it("CHECKPOINT DEFENSE: status checkpoint mutation does not affect engine state", () => {
    wedmRetrainTriggerEngine.recordCheckpoint({ outcomes_at_this_point: 500, adapter_version: "v0.1.0" });
    const s = wedmRetrainTriggerEngine.status(600);
    s.checkpoint.outcomes_at_last_retrain = 999999;
    const s2 = wedmRetrainTriggerEngine.status(600);
    expect(s2.outcomes_since_last_retrain).toBe(100);
  });

  it("ADVERSARIAL: status throws on negative totalOutcomes", () => {
    expect(() => wedmRetrainTriggerEngine.status(-1)).toThrow(/non-negative finite/i);
  });

  it("ADVERSARIAL: status throws on Infinity totalOutcomes", () => {
    expect(() => wedmRetrainTriggerEngine.status(Infinity)).toThrow(/non-negative finite/i);
  });

  it("ADVERSARIAL: status throws on NaN totalOutcomes", () => {
    expect(() => wedmRetrainTriggerEngine.status(NaN)).toThrow(/non-negative finite/i);
  });

  it("BOUNDARY: status floors fractional totalOutcomes", () => {
    const s = wedmRetrainTriggerEngine.status(500.9);
    expect(s.total_outcomes).toBe(500);
    expect(s.ready).toBe(true);
  });

  it("VARIABILITY: tighter threshold (100) fires retrain earlier", () => {
    wedmRetrainTriggerEngine.setConfig({ retrain_threshold: 100 });
    const s = wedmRetrainTriggerEngine.status(100);
    expect(s.ready).toBe(true);
    expect(s.threshold).toBe(100);
  });

  it("VARIABILITY: looser threshold (2000) defers retrain", () => {
    wedmRetrainTriggerEngine.setConfig({ retrain_threshold: 2000 });
    const s = wedmRetrainTriggerEngine.status(500);
    expect(s.ready).toBe(false);
    expect(s.fraction_to_threshold).toBe(0.25);
  });

  it("VARIABILITY: warning_fraction 0.5 surfaces warning earlier than default 0.8", () => {
    wedmRetrainTriggerEngine.setConfig({ warning_fraction: 0.5 });
    const s = wedmRetrainTriggerEngine.status(300);
    expect(s.ready).toBe(false);
    expect(s.reason).toMatch(/approaching/i);
  });

  it("VARIABILITY: warning_fraction 1.0 disables early warning (only fires on ready)", () => {
    wedmRetrainTriggerEngine.setConfig({ warning_fraction: 1.0 });
    const s = wedmRetrainTriggerEngine.status(490);
    expect(s.ready).toBe(false);
    expect(s.reason).toMatch(/below threshold/i);
  });
});
