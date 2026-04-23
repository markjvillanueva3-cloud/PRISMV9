/**
 * Tests for MillTurnLoRADatasetBuilderEngine + MillTurnLoRACadenceEngine
 * CAM-ML-CLOSEDLOOP-MS0 U-CMCCL03
 */

import { describe, it, expect } from "vitest";
import { millTurnLoRADatasetBuilderEngine } from "../engines/MillTurnLoRADatasetBuilderEngine.js";
import { createMillTurnLoRACadence, millTurnLoRACadenceEngine } from "../engines/MillTurnLoRACadenceEngine.js";
import type { RawJob } from "../engines/MachineLoRABaseEngine.js";

function mtJob(i: number, channels: number, imbalance: number, overrides: Partial<RawJob> = {}): RawJob {
  return {
    id: `mt-${i}`,
    fingerprint: { material: "brass", op: "turn-mill" },
    features: {
      material: "brass",
      part_class: "shaft",
      machine_class: "multus",
      channel_count: channels,
      sub_spindle: channels >= 2,
    },
    actual: {
      wait_ms_per_sync: 100 + i * 10,
      channel_imbalance_ratio: imbalance,
    },
    ...overrides,
  };
}

describe("MillTurnLoRADatasetBuilderEngine", () => {
  const eng = millTurnLoRADatasetBuilderEngine;

  it("required schema includes channel_count and sub_spindle", () => {
    const s = eng.requiredSchema();
    expect(s.features).toContain("channel_count");
    expect(s.features).toContain("sub_spindle");
    expect(s.actuals).toContain("wait_ms_per_sync");
    expect(s.actuals).toContain("channel_imbalance_ratio");
  });

  it("builds dataset and stratifies on channel + sub-spindle", () => {
    const jobs = [mtJob(0, 2, 0.5), mtJob(1, 2, 0.5), mtJob(2, 3, 0.3)];
    const r = eng.buildDataset(jobs);
    expect(r.stats.validJobs).toBe(3);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    const fps = all.map((e) => e.metadata.fingerprint);
    expect(fps.some((f) => f.channels === "c2")).toBe(true);
    expect(fps.some((f) => f.channels === "c3")).toBe(true);
  });

  it("labels heavily imbalanced jobs (>0.95) as 'imbalanced'", () => {
    const jobs = [mtJob(0, 2, 0.97), mtJob(1, 2, 0.50)];
    const r = eng.buildDataset(jobs);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    const flagged = all.filter((e) => e.metadata.labels.includes("imbalanced"));
    expect(flagged.length).toBe(1);
  });

  it("rejects jobs with negative wait_ms_per_sync", () => {
    const r = eng.buildDataset([mtJob(0, 2, 0.5, { actual: { wait_ms_per_sync: -1, channel_imbalance_ratio: 0.5 } })]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("rejects jobs missing sub_spindle feature", () => {
    const bad = mtJob(0, 2, 0.5);
    delete (bad.features as Record<string, unknown>).sub_spindle;
    const r = eng.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("fingerprint captures 1-channel vs 2-channel distinction", () => {
    const r = eng.buildDataset([mtJob(0, 1, 0.0), mtJob(1, 2, 0.5)]);
    const fps = [...r.examples.train, ...r.examples.val, ...r.examples.test].map(
      (e) => e.metadata.fingerprint.channels,
    );
    expect(new Set(fps).size).toBe(2);
  });

  it("renders instruction mentioning channel count and sub-spindle", () => {
    const r = eng.buildDataset([mtJob(0, 3, 0.4)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.instruction).toMatch(/3 channels/);
    expect(ex.instruction).toMatch(/sub-spindle/);
  });

  it("handles empty jobs gracefully", () => {
    const r = eng.buildDataset([]);
    expect(r.stats.validJobs).toBe(0);
    expect(r.examples.train).toHaveLength(0);
  });

  it("deterministic across reruns on same input", () => {
    const jobs = Array.from({ length: 10 }, (_, i) => mtJob(i, 2, 0.5));
    const a = eng.buildDataset(jobs);
    const b = eng.buildDataset(jobs);
    expect(a.datasetFingerprint).toBe(b.datasetFingerprint);
  });

  it("rejects jobs with non-finite imbalance ratio", () => {
    const r = eng.buildDataset([mtJob(0, 2, NaN)]);
    expect(r.stats.validJobs).toBe(0);
  });
});

describe("MillTurnLoRACadenceEngine", () => {
  it("defaults to weekly cadence", () => {
    expect(millTurnLoRACadenceEngine.getConfig().interval).toBe("weekly");
  });

  it("defaults to minNewJobs=7 (moderate volume)", () => {
    expect(millTurnLoRACadenceEngine.getConfig().minNewJobs).toBe(7);
  });

  it("higher performance threshold (70) reflects wait-ms discipline", () => {
    expect(millTurnLoRACadenceEngine.getConfig().performanceThreshold).toBe(70);
  });

  it("fires trigger when ≥7 jobs are recorded and schedule due", () => {
    // 2026-04-26 was Sunday UTC.
    const c = createMillTurnLoRACadence(() => new Date("2026-04-26T03:00:00Z"));
    c.recordJobs(10);
    expect(c.shouldTriggerRun().should).toBe(true);
  });

  it("autoPromote activates only at eval ≥ 70", () => {
    const c = createMillTurnLoRACadence(() => new Date("2026-04-26T03:00:00Z"));
    const r1 = c.startRun("scheduled");
    c.completeRun(r1.runId, { datasetSize: 10, trainingLoss: 0.4, evalScore: 65, newJobs: 10 }, "/a");
    expect(c.getState().activeVersion).toBeUndefined();
    const r2 = c.startRun("scheduled");
    c.completeRun(r2.runId, { datasetSize: 10, trainingLoss: 0.3, evalScore: 75, newJobs: 10 }, "/b");
    expect(c.getState().activeVersion).toBe(r2.version);
  });
});
