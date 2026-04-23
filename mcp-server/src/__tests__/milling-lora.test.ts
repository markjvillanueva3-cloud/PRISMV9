/**
 * Tests for MillingLoRADatasetBuilderEngine + MillingLoRACadenceEngine
 * CAM-ML-CLOSEDLOOP-MS0 U-CMCCL01
 */

import { describe, it, expect } from "vitest";
import { millingLoRADatasetBuilderEngine } from "../engines/MillingLoRADatasetBuilderEngine.js";
import { createMillingLoRACadence, millingLoRACadenceEngine } from "../engines/MillingLoRACadenceEngine.js";
import type { RawJob } from "../engines/MachineLoRABaseEngine.js";

function job(i: number, overrides: Partial<RawJob> = {}): RawJob {
  return {
    id: `mill-${i}`,
    fingerprint: {
      material: ["steel", "aluminum"][i % 2],
      tool: `T${i % 3}`,
      op: ["roughing", "finishing"][i % 2],
    },
    features: {
      material: ["steel", "aluminum"][i % 2],
      tool_class: `T${i % 3}`,
      op_type: ["roughing", "finishing"][i % 2],
      machine_class: "VMC",
      ap_mm: 2 + (i % 3),
      ae_mm: 0.5 + (i % 2) * 0.5,
      fz_mm_rev_tooth: 0.05,
      vc_m_min: 200 + i,
    },
    actual: { rpm: 3000 + i * 10, feed_mm_min: 500 + i },
    ...overrides,
  };
}

describe("MillingLoRADatasetBuilderEngine", () => {
  const eng = millingLoRADatasetBuilderEngine;

  it("exposes a static required schema", () => {
    const s = eng.requiredSchema();
    expect(s.features).toContain("material");
    expect(s.features).toContain("tool_class");
    expect(s.actuals).toContain("rpm");
    expect(s.actuals).toContain("feed_mm_min");
  });

  it("builds a dataset from valid milling jobs", () => {
    const r = eng.buildDataset(Array.from({ length: 30 }, (_, i) => job(i)));
    expect(r.stats.validJobs).toBe(30);
    expect(r.stats.trainCount).toBe(24);
    expect(r.stats.valCount).toBe(3);
    expect(r.stats.testCount).toBe(3);
  });

  it("rejects jobs missing required features", () => {
    const bad = job(0);
    delete (bad.features as Record<string, unknown>).material;
    const r = eng.buildDataset([bad, job(1), job(2)]);
    expect(r.stats.validJobs).toBe(2);
  });

  it("rejects jobs with invalid actuals (negative RPM)", () => {
    const bad = job(5, { actual: { rpm: -100, feed_mm_min: 500 } });
    const r = eng.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("rejects NaN and Infinity in actuals", () => {
    const nanJob = job(6, { actual: { rpm: NaN, feed_mm_min: 500 } });
    const infJob = job(7, { actual: { rpm: Infinity, feed_mm_min: 500 } });
    const r = eng.buildDataset([nanJob, infJob, job(8)]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("renders instruction with op/material/tool/machine", () => {
    const r = eng.buildDataset([job(0)]);
    const ex = r.examples.train[0] ?? r.examples.test[0] ?? r.examples.val[0];
    expect(ex.instruction).toMatch(/milling/i);
    expect(ex.instruction).toMatch(/roughing|finishing/);
    expect(ex.instruction).toMatch(/steel|aluminum/);
  });

  it("input JSON has sorted keys (determinism)", () => {
    const r = eng.buildDataset([job(0)]);
    const ex = r.examples.train[0] ?? r.examples.test[0];
    const keys = Object.keys(JSON.parse(ex.input));
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it("empty input yields empty splits, not an error", () => {
    const r = eng.buildDataset([]);
    expect(r.stats.validJobs).toBe(0);
    expect(r.examples.train).toHaveLength(0);
  });

  it("dataset fingerprint is stable across re-runs on identical input", () => {
    const jobs = Array.from({ length: 20 }, (_, i) => job(i));
    const a = eng.buildDataset(jobs);
    const b = eng.buildDataset(jobs);
    expect(a.datasetFingerprint).toBe(b.datasetFingerprint);
  });

  it("dataset fingerprint changes when input changes", () => {
    const a = eng.buildDataset(Array.from({ length: 20 }, (_, i) => job(i)));
    const b = eng.buildDataset(Array.from({ length: 21 }, (_, i) => job(i)));
    expect(a.datasetFingerprint).not.toBe(b.datasetFingerprint);
  });

  it("examples include source_job and weight in metadata", () => {
    const r = eng.buildDataset([job(0, { weight: 2 })]);
    const ex = r.examples.train[0] ?? r.examples.test[0];
    expect(ex.metadata.source_job).toBe("mill-0");
    expect(ex.metadata.weight).toBe(2);
  });
});

describe("MillingLoRACadenceEngine", () => {
  it("defaults to daily cadence at 2am", () => {
    const cfg = millingLoRACadenceEngine.getConfig();
    expect(cfg.interval).toBe("daily");
    expect(cfg.hour).toBe(2);
  });

  it("default minNewJobs is 50 (production volume)", () => {
    expect(millingLoRACadenceEngine.getConfig().minNewJobs).toBe(50);
  });

  it("fires daily-scheduled trigger at 2am with 100 jobs", () => {
    const c = createMillingLoRACadence(() => new Date("2026-04-20T03:00:00Z"));
    c.recordJobs(100);
    const r = c.shouldTriggerRun();
    expect(r.should).toBe(true);
    expect(r.reason).toBe("scheduled");
  });

  it("does not fire when jobs are below min", () => {
    const c = createMillingLoRACadence(() => new Date("2026-04-20T03:00:00Z"));
    c.recordJobs(10);
    expect(c.shouldTriggerRun().should).toBe(false);
  });

  it("drift check triggers retrain at 15% eval drop", () => {
    const c = createMillingLoRACadence(() => new Date("2026-04-20T03:00:00Z"));
    const r = c.checkDrift(85, 100);
    expect(r.drifted).toBe(true);
    expect(r.triggerRetrain).toBe(true);
  });

  it("autoPromote activates at eval ≥ 65", () => {
    const c = createMillingLoRACadence(() => new Date("2026-04-20T03:00:00Z"));
    const run = c.startRun("scheduled");
    c.completeRun(run.runId, { datasetSize: 1000, trainingLoss: 0.3, evalScore: 70, newJobs: 100 }, "/m");
    expect(c.getState().activeVersion).toBe(run.version);
  });
});
