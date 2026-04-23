/**
 * Tests for FiveAxisLoRADatasetBuilderEngine + FiveAxisLoRACadenceEngine
 * CAM-ML-CLOSEDLOOP-MS0 U-CMCCL02
 */

import { describe, it, expect } from "vitest";
import { fiveAxisLoRADatasetBuilderEngine } from "../engines/FiveAxisLoRADatasetBuilderEngine.js";
import { createFiveAxisLoRACadence, fiveAxisLoRACadenceEngine } from "../engines/FiveAxisLoRACadenceEngine.js";
import type { RawJob } from "../engines/MachineLoRABaseEngine.js";

function faJob(i: number, tiltDeg: number, overrides: Partial<RawJob> = {}): RawJob {
  return {
    id: `5ax-${i}`,
    fingerprint: {
      material: "titanium",
      op: "contouring",
      tool: `ball-12`,
    },
    features: {
      material: "titanium",
      tool_class: "ball-12",
      op_type: "contouring",
      machine_class: "5-axis-trunnion",
      tilt_deg: tiltDeg,
      tcpc_enabled: true,
    },
    actual: { surface_ra_um: 0.4 + (i % 5) * 0.1 },
    ...overrides,
  };
}

describe("FiveAxisLoRADatasetBuilderEngine", () => {
  const eng = fiveAxisLoRADatasetBuilderEngine;

  it("required schema includes tilt_deg and tcpc_enabled", () => {
    const s = eng.requiredSchema();
    expect(s.features).toContain("tilt_deg");
    expect(s.features).toContain("tcpc_enabled");
    expect(s.actuals).toContain("surface_ra_um");
  });

  it("builds a dataset from valid 5-axis jobs", () => {
    const jobs = Array.from({ length: 20 }, (_, i) => faJob(i, 30 + i));
    const r = eng.buildDataset(jobs);
    expect(r.stats.validJobs).toBe(20);
  });

  it("enriches fingerprint with tilt_bucket (10° increments)", () => {
    const r = eng.buildDataset([faJob(0, 33), faJob(1, 37)]);
    const ex0 = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    // 33 → round(33/10)*10 = 30 → "t30"
    // 37 → round(37/10)*10 = 40 → "t40"
    const fps = [r.examples.train, r.examples.val, r.examples.test]
      .flat()
      .map((e) => e.metadata.fingerprint.tilt_bucket);
    expect(fps).toContain("t30");
    expect(fps).toContain("t40");
  });

  it("flags near-singularity jobs (|tilt-90|<5°) with label", () => {
    const jobs = [faJob(0, 88), faJob(1, 92), faJob(2, 45)];
    const r = eng.buildDataset(jobs);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    const flagged = all.filter((e) => e.metadata.labels.includes("near-singularity"));
    expect(flagged.length).toBe(2); // 88° and 92° both within 5° of 90°
    const unflagged = all.filter((e) => !e.metadata.labels.includes("near-singularity"));
    expect(unflagged.length).toBe(1);
  });

  it("near-singularity jobs get weight boosted to ≥2.0", () => {
    const r = eng.buildDataset([faJob(0, 89)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.metadata.weight).toBeGreaterThanOrEqual(2.0);
  });

  it("preserves caller-supplied weight if higher than singularity boost", () => {
    const r = eng.buildDataset([faJob(0, 89, { weight: 5.0 })]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.metadata.weight).toBe(5.0);
  });

  it("rejects jobs with negative Ra", () => {
    const r = eng.buildDataset([faJob(0, 30, { actual: { surface_ra_um: -0.5 } })]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("rejects jobs missing tcpc_enabled", () => {
    const bad = faJob(0, 30);
    delete (bad.features as Record<string, unknown>).tcpc_enabled;
    const r = eng.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("renders instruction with tilt angle and TCPC state", () => {
    const r = eng.buildDataset([faJob(0, 45, { features: { ...faJob(0, 45).features, tcpc_enabled: false } })]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.instruction).toMatch(/tilt=45/);
    expect(ex.instruction).toMatch(/without TCPC/);
  });

  it("fingerprint tilt_bucket is stable across rebuilds", () => {
    const jobs = Array.from({ length: 10 }, (_, i) => faJob(i, 20 + i * 5));
    const a = eng.buildDataset(jobs);
    const b = eng.buildDataset(jobs);
    expect(a.datasetFingerprint).toBe(b.datasetFingerprint);
  });

  it("empty input returns zero stats", () => {
    const r = eng.buildDataset([]);
    expect(r.stats.validJobs).toBe(0);
    expect(r.examples.train).toHaveLength(0);
  });
});

describe("FiveAxisLoRACadenceEngine", () => {
  it("defaults to weekly (not daily)", () => {
    expect(fiveAxisLoRACadenceEngine.getConfig().interval).toBe("weekly");
  });

  it("defaults to lower minNewJobs (10) than milling", () => {
    expect(fiveAxisLoRACadenceEngine.getConfig().minNewJobs).toBe(10);
  });

  it("defaults to looser drift threshold (0.12)", () => {
    expect(fiveAxisLoRACadenceEngine.getConfig().driftThreshold).toBeCloseTo(0.12, 4);
  });

  it("fires on Sunday 2am with ≥10 jobs", () => {
    // 2026-04-26 was a Sunday (UTC). Use 03:00 so we're past 2am.
    const c = createFiveAxisLoRACadence(() => new Date("2026-04-26T03:00:00Z"));
    c.recordJobs(15);
    expect(c.shouldTriggerRun().should).toBe(true);
  });

  it("autoPromote triggers at eval ≥ 60 (5-axis lower threshold)", () => {
    const c = createFiveAxisLoRACadence(() => new Date("2026-04-26T03:00:00Z"));
    const run = c.startRun("scheduled");
    c.completeRun(run.runId, { datasetSize: 50, trainingLoss: 0.4, evalScore: 62, newJobs: 10 }, "/m");
    expect(c.getState().activeVersion).toBe(run.version);
  });
});
