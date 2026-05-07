/**
 * Tests for MachineLoRABaseEngine — shared foundation for CAM-ML-CLOSEDLOOP
 *
 * Validates BaseLoRADatasetBuilder determinism + split integrity and
 * BaseLoRACadence scheduling + drift + lifecycle logic against an
 * injected deterministic clock. No network, no filesystem, no mocks
 * beyond the clock.
 */

import { describe, it, expect } from "vitest";
import {
  BaseLoRADatasetBuilder,
  BaseLoRACadence,
  DEFAULT_CADENCE,
  DEFAULT_SPLIT,
  geometryHash,
  type RawJob,
} from "../engines/MachineLoRABaseEngine.js";

// ─────────────────────────────────────────────────────────────────────
// DATASET BUILDER
// ─────────────────────────────────────────────────────────────────────

function synthJobs(n: number, extras: Partial<RawJob> = {}): RawJob[] {
  const materials = ["steel", "aluminum", "titanium"];
  const ops = ["roughing", "finishing", "contouring"];
  return Array.from({ length: n }, (_, i) => ({
    id: `j${i.toString().padStart(4, "0")}`,
    fingerprint: {
      material: materials[i % materials.length],
      op: ops[i % ops.length],
      tool: `T${i % 5}`,
    },
    features: { rpm: 1000 + i * 10, feed: 100 + i, foo: "bar" },
    actual: { cycleTime: 30 + (i % 7) * 2 },
    ...extras,
  }));
}

describe("BaseLoRADatasetBuilder", () => {
  const builder = new BaseLoRADatasetBuilder({
    machineType: "test",
    render: (j) => ({
      instruction: `do ${j.fingerprint.op}`,
      input: JSON.stringify(j.features),
      output: JSON.stringify(j.actual),
    }),
  });

  it("partitions a 100-job dataset into 80/10/10 with seed=1", () => {
    const r = builder.build(synthJobs(100), { ...DEFAULT_SPLIT, seed: 1 });
    expect(r.stats.totalJobs).toBe(100);
    expect(r.stats.validJobs).toBe(100);
    expect(r.stats.trainCount).toBe(80);
    expect(r.stats.valCount).toBe(10);
    expect(r.stats.testCount).toBe(10);
  });

  it("produces identical splits on identical inputs (determinism)", () => {
    const a = builder.build(synthJobs(50), { ...DEFAULT_SPLIT, seed: 42 });
    const b = builder.build(synthJobs(50), { ...DEFAULT_SPLIT, seed: 42 });
    expect(a.datasetFingerprint).toBe(b.datasetFingerprint);
    expect(a.examples.train.map((e) => e.id)).toEqual(b.examples.train.map((e) => e.id));
  });

  it("different seeds produce different orderings", () => {
    const a = builder.build(synthJobs(50), { ...DEFAULT_SPLIT, seed: 1 });
    const b = builder.build(synthJobs(50), { ...DEFAULT_SPLIT, seed: 2 });
    // Fingerprint is seed-independent (it depends only on hash counts + n + seed),
    // but the order of examples within train/val/test will differ.
    const aIds = a.examples.train.map((e) => e.id).join(",");
    const bIds = b.examples.train.map((e) => e.id).join(",");
    expect(aIds).not.toBe(bIds);
  });

  it("rejects invalid split ratios (don't sum to 1)", () => {
    expect(() => builder.build([], { trainRatio: 0.5, valRatio: 0.3, testRatio: 0.3, seed: 1 })).toThrow(/sum to 1/);
  });

  it("rejects negative split ratios", () => {
    expect(() => builder.build([], { trainRatio: -0.1, valRatio: 0.5, testRatio: 0.6, seed: 1 })).toThrow(/non-negative/);
  });

  it("rejects non-finite seed", () => {
    expect(() => builder.build([], { ...DEFAULT_SPLIT, seed: NaN })).toThrow(/Seed/);
  });

  it("counts geometry-hash collisions correctly", () => {
    // Two jobs with identical fingerprint → 1 collision.
    const jobs: RawJob[] = [
      { id: "a", fingerprint: { x: 1 }, features: {}, actual: {} },
      { id: "b", fingerprint: { x: 1 }, features: {}, actual: {} },
      { id: "c", fingerprint: { x: 2 }, features: {}, actual: {} },
    ];
    const r = builder.build(jobs);
    expect(r.stats.geometryHashCollisions).toBe(1);
  });

  it("aggregates label counts across jobs", () => {
    const jobs: RawJob[] = [
      { id: "a", fingerprint: { x: 1 }, features: {}, actual: {}, labels: ["burn"] },
      { id: "b", fingerprint: { x: 2 }, features: {}, actual: {}, labels: ["burn", "chatter"] },
    ];
    const r = builder.build(jobs);
    expect(r.stats.byLabel).toEqual({ burn: 2, chatter: 1 });
  });

  it("geometryHash is order-independent", () => {
    const h1 = geometryHash({ material: "steel", op: "roughing" });
    const h2 = geometryHash({ op: "roughing", material: "steel" });
    expect(h1).toBe(h2);
  });

  it("geometryHash differs for different fingerprints", () => {
    expect(geometryHash({ a: 1 })).not.toBe(geometryHash({ a: 2 }));
  });

  it("validate() rejection drops jobs from the dataset", () => {
    const strict = new BaseLoRADatasetBuilder({
      machineType: "test",
      validate: (j) => (j.features.ok === true ? null : "missing ok"),
      render: () => ({ instruction: "", input: "", output: "" }),
    });
    const jobs: RawJob[] = [
      { id: "a", fingerprint: { x: 1 }, features: { ok: true }, actual: {} },
      { id: "b", fingerprint: { x: 2 }, features: { ok: false }, actual: {} },
      { id: "c", fingerprint: { x: 3 }, features: {}, actual: {} },
    ];
    const r = strict.build(jobs);
    expect(r.stats.validJobs).toBe(1);
  });

  it("empty input yields empty splits but no error", () => {
    const r = builder.build([]);
    expect(r.stats.totalJobs).toBe(0);
    expect(r.stats.validJobs).toBe(0);
    expect(r.examples.train).toHaveLength(0);
    expect(r.examples.val).toHaveLength(0);
    expect(r.examples.test).toHaveLength(0);
  });

  it("computes avg weight from job weights", () => {
    const jobs: RawJob[] = [
      { id: "a", fingerprint: { x: 1 }, features: {}, actual: {}, weight: 1 },
      { id: "b", fingerprint: { x: 2 }, features: {}, actual: {}, weight: 3 },
    ];
    const r = builder.build(jobs);
    expect(r.stats.avgWeight).toBeCloseTo(2.0, 6);
  });
});

// ─────────────────────────────────────────────────────────────────────
// CADENCE
// ─────────────────────────────────────────────────────────────────────

function fixedClock(iso: string): () => Date {
  const d = new Date(iso);
  return () => d;
}

describe("BaseLoRACadence — scheduling", () => {
  it("defaults are weekly Sunday 2am", () => {
    const c = new BaseLoRACadence();
    const cfg = c.getConfig();
    expect(cfg.interval).toBe("weekly");
    expect(cfg.dayOfWeek).toBe(0);
    expect(cfg.hour).toBe(2);
  });

  it("calculateNextRun produces a Sunday 2am for weekly", () => {
    const c = new BaseLoRACadence({ interval: "weekly", dayOfWeek: 0, hour: 2 }, fixedClock("2026-04-20T10:00:00Z"));
    const nxt = c.calculateNextRun();
    expect(nxt.getDay()).toBe(0);
    expect(nxt.getHours()).toBe(2);
  });

  it("calculateNextRun advances past the reference time", () => {
    // Sunday 3am: next should be NEXT Sunday 2am (not same-day 2am).
    const c = new BaseLoRACadence({ interval: "weekly", dayOfWeek: 0, hour: 2 }, fixedClock("2026-04-19T03:00:00Z"));
    const nxt = c.calculateNextRun();
    expect(nxt.getTime()).toBeGreaterThan(new Date("2026-04-19T03:00:00Z").getTime());
  });

  it("on-demand interval returns epoch (disabled marker)", () => {
    const c = new BaseLoRACadence({ interval: "on-demand" });
    expect(c.calculateNextRun().getTime()).toBe(0);
  });

  it("shouldTriggerRun returns false when disabled", () => {
    const c = new BaseLoRACadence({ enabled: false });
    expect(c.shouldTriggerRun().should).toBe(false);
  });

  it("shouldTriggerRun false when jobs below floor", () => {
    // Schedule due but only 10 jobs recorded vs min 50.
    const c = new BaseLoRACadence(
      { interval: "daily", hour: 2, minNewJobs: 50 },
      fixedClock("2026-04-20T03:00:00Z"),
    );
    c.recordJobs(10);
    expect(c.shouldTriggerRun().should).toBe(false);
  });

  it("shouldTriggerRun true when schedule due and jobs ≥ floor", () => {
    const c = new BaseLoRACadence(
      { interval: "daily", hour: 2, minNewJobs: 50 },
      fixedClock("2026-04-20T03:00:00Z"),
    );
    c.recordJobs(100);
    const r = c.shouldTriggerRun();
    expect(r.should).toBe(true);
    expect(r.reason).toBe("scheduled");
  });

  it("recordJobs rejects negatives", () => {
    const c = new BaseLoRACadence();
    expect(() => c.recordJobs(-1)).toThrow(/non-negative/);
  });
});

describe("BaseLoRACadence — drift detection", () => {
  it("reports drifted=true when eval drops > threshold", () => {
    const c = new BaseLoRACadence({ driftThreshold: 0.10 });
    const r = c.checkDrift(80, 100);
    // delta = (100-80)/100 = 0.20 → drifted
    expect(r.drifted).toBe(true);
    expect(r.delta).toBeCloseTo(0.2, 6);
    expect(r.triggerRetrain).toBe(true);
  });

  it("reports drifted=false when drop within threshold", () => {
    const c = new BaseLoRACadence({ driftThreshold: 0.10 });
    const r = c.checkDrift(95, 100);
    expect(r.drifted).toBe(false);
    expect(r.triggerRetrain).toBe(false);
  });

  it("triggerRetrain=false when retrainOnDrift disabled even if drifted", () => {
    const c = new BaseLoRACadence({ driftThreshold: 0.10, retrainOnDrift: false });
    const r = c.checkDrift(80, 100);
    expect(r.drifted).toBe(true);
    expect(r.triggerRetrain).toBe(false);
  });

  it("handles baseline=0 without division error", () => {
    const c = new BaseLoRACadence();
    const r = c.checkDrift(50, 0);
    expect(r.drifted).toBe(false);
    expect(r.delta).toBe(0);
  });

  it("throws on non-finite scores", () => {
    const c = new BaseLoRACadence();
    expect(() => c.checkDrift(NaN, 100)).toThrow(/finite/);
    expect(() => c.checkDrift(50, Infinity)).toThrow(/finite/);
  });
});

describe("BaseLoRACadence — run lifecycle", () => {
  const clock = fixedClock("2026-04-20T02:00:00Z");

  it("startRun → completeRun records metrics and version", () => {
    const c = new BaseLoRACadence({ autoPromote: false }, clock);
    const run = c.startRun("scheduled", "nightly");
    expect(run.status).toBe("running");
    const done = c.completeRun(run.runId, { datasetSize: 1000, trainingLoss: 0.5, evalScore: 72, newJobs: 100 }, "/models/v1");
    expect(done.status).toBe("completed");
    expect(done.metrics?.evalScore).toBe(72);
    const state = c.getState();
    expect(state.versions).toHaveLength(1);
  });

  it("autoPromote activates version when eval ≥ threshold", () => {
    const c = new BaseLoRACadence({ autoPromote: true, performanceThreshold: 70 }, clock);
    const run = c.startRun("scheduled");
    c.completeRun(run.runId, { datasetSize: 1, trainingLoss: 0, evalScore: 80, newJobs: 1 }, "/m");
    const st = c.getState();
    expect(st.activeVersion).toBe(run.version);
    expect(st.versions[0].isActive).toBe(true);
  });

  it("autoPromote skips when eval < threshold", () => {
    const c = new BaseLoRACadence({ autoPromote: true, performanceThreshold: 70 }, clock);
    const run = c.startRun("scheduled");
    c.completeRun(run.runId, { datasetSize: 1, trainingLoss: 0, evalScore: 60, newJobs: 1 }, "/m");
    expect(c.getState().activeVersion).toBeUndefined();
  });

  it("failRun preserves error in notes", () => {
    const c = new BaseLoRACadence({}, clock);
    const run = c.startRun("manual");
    const f = c.failRun(run.runId, "OOM");
    expect(f.status).toBe("failed");
    expect(f.notes).toContain("OOM");
  });

  it("completeRun refuses to complete a non-running run", () => {
    const c = new BaseLoRACadence({}, clock);
    const run = c.startRun("manual");
    c.failRun(run.runId, "oops");
    expect(() =>
      c.completeRun(run.runId, { datasetSize: 1, trainingLoss: 0, evalScore: 1, newJobs: 1 }, "/m"),
    ).toThrow(/cannot complete/);
  });

  it("promoteVersion deprecates previously active version", () => {
    const c = new BaseLoRACadence({ autoPromote: false }, clock);
    const r1 = c.startRun("scheduled");
    c.completeRun(r1.runId, { datasetSize: 1, trainingLoss: 0, evalScore: 80, newJobs: 1 }, "/m1");
    c.promoteVersion(r1.version);
    const r2 = c.startRun("scheduled");
    c.completeRun(r2.runId, { datasetSize: 1, trainingLoss: 0, evalScore: 85, newJobs: 1 }, "/m2");
    c.promoteVersion(r2.version);
    const st = c.getState();
    const v1 = st.versions.find((v) => v.version === r1.version);
    expect(v1?.isActive).toBe(false);
    expect(v1?.deprecatedAt).toBeTruthy();
  });

  it("completeRun resets jobsSinceLastRun to 0", () => {
    const c = new BaseLoRACadence({}, clock);
    c.recordJobs(100);
    const run = c.startRun("manual");
    c.completeRun(run.runId, { datasetSize: 100, trainingLoss: 0, evalScore: 80, newJobs: 100 }, "/m");
    expect(c.getState().jobsSinceLastRun).toBe(0);
  });

  it("pruneVersions keeps maxVersions newest (plus active)", () => {
    const c = new BaseLoRACadence({ maxVersions: 2, autoPromote: false }, clock);
    for (let i = 0; i < 5; i += 1) {
      const r = c.startRun("manual");
      c.completeRun(r.runId, { datasetSize: 1, trainingLoss: 0, evalScore: 70 + i, newJobs: 1 }, `/m${i}`);
    }
    // After pruning: should keep at most maxVersions (2) + active (if separate).
    const st = c.getState();
    expect(st.versions.length).toBeLessThanOrEqual(3);
  });
});
