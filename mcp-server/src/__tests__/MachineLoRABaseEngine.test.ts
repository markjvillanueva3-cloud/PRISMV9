/**
 * MachineLoRABaseEngine -- companion engine test (R15 completion for
 * U-MACHINE-LORA-INFO-WIRE). Covers the shared LoRA foundation: the
 * geometry-hashed dataset builder, the cadence scheduler, and the pure
 * getInfo() introspection. Deterministic (seeded split + injected clock).
 */
import { describe, it, expect } from "vitest";
import {
  BaseLoRADatasetBuilder,
  BaseLoRACadence,
  machineLoRABase,
  geometryHash,
  DEFAULT_SPLIT,
  DEFAULT_CADENCE,
  type RawJob,
} from "../engines/MachineLoRABaseEngine.js";

function job(over: Partial<RawJob> = {}): RawJob {
  return { id: "j" + Math.random().toString(36).slice(2, 8), fingerprint: { shape: "block", size: 10 }, features: {}, actual: { ok: true }, ...over };
}
const render = (j: RawJob) => ({ instruction: "make " + j.id, input: JSON.stringify(j.fingerprint), output: JSON.stringify(j.actual) });
const clockAt = (ms: number) => () => new Date(ms);

describe("MachineLoRABaseEngine", () => {
  describe("geometryHash", () => {
    it("is deterministic + key-order-independent for the same fingerprint", () => {
      expect(geometryHash({ a: 1, b: "x" })).toBe(geometryHash({ b: "x", a: 1 }));
    });
    it("differs for different fingerprints", () => {
      expect(geometryHash({ a: 1 })).not.toBe(geometryHash({ a: 2 }));
    });
  });

  describe("machineLoRABase.getInfo", () => {
    it("returns the canonical defaults as copies + the 8 machine-type pipelines", () => {
      const i = machineLoRABase.getInfo();
      expect(i.engine).toBe("MachineLoRABaseEngine");
      expect(i.machineTypes).toHaveLength(8);
      expect(i.machineTypes).toEqual(expect.arrayContaining(["milling", "wedm", "grinding"]));
      expect(i.defaults.split).toEqual(DEFAULT_SPLIT);
      expect(i.defaults.split).not.toBe(DEFAULT_SPLIT); // defensive copy
      expect(i.defaults.cadence).toEqual(DEFAULT_CADENCE);
    });
    it("lists the reusable helper factories + cadence enums", () => {
      const i = machineLoRABase.getInfo();
      expect(i.helpers).toEqual(expect.arrayContaining(["buildDatasetHelper", "createCadence"]));
      expect(i.cadence.intervals).toContain("on-demand");
      expect(i.cadence.triggers).toContain("data-drift");
    });
  });

  describe("BaseLoRADatasetBuilder.build", () => {
    it("splits jobs 80/10/10 deterministically by seed (reproducible fingerprint)", () => {
      const b = new BaseLoRADatasetBuilder({ machineType: "milling", render });
      const jobs = Array.from({ length: 20 }, (_, k) => job({ id: "j" + k, fingerprint: { shape: "s" + k } }));
      const split = { trainRatio: 0.8, valRatio: 0.1, testRatio: 0.1, seed: 1 };
      const r1 = b.build(jobs, split);
      const r2 = b.build(jobs, split);
      expect(r1.stats.trainCount).toBe(16);
      expect(r1.stats.valCount).toBe(2);
      expect(r1.stats.testCount).toBe(2);
      expect(r1.datasetFingerprint).toBe(r2.datasetFingerprint);
    });
    it("throws when split ratios do not sum to 1", () => {
      const b = new BaseLoRADatasetBuilder({ machineType: "milling", render });
      expect(() => b.build([job()], { trainRatio: 0.5, valRatio: 0.1, testRatio: 0.1, seed: 1 })).toThrow(/sum to 1/);
    });
    it("throws on a non-finite seed", () => {
      const b = new BaseLoRADatasetBuilder({ machineType: "milling", render });
      expect(() => b.build([job()], { trainRatio: 0.8, valRatio: 0.1, testRatio: 0.1, seed: Number.NaN })).toThrow();
    });
    it("drops jobs rejected by validate()", () => {
      const b = new BaseLoRADatasetBuilder({ machineType: "milling", render, validate: (j) => (j.id === "bad" ? "incomplete" : null) });
      const r = b.build([job({ id: "good" }), job({ id: "bad" })], DEFAULT_SPLIT);
      expect(r.stats.totalJobs).toBe(2);
      expect(r.stats.validJobs).toBe(1);
    });
    it("aggregates label counts + average weight in stats", () => {
      const b = new BaseLoRADatasetBuilder({ machineType: "milling", render });
      const r = b.build([job({ labels: ["burn"], weight: 2 }), job({ labels: ["burn"] })], DEFAULT_SPLIT);
      expect(r.stats.byLabel.burn).toBe(2);
      expect(r.stats.avgWeight).toBeCloseTo(1.5, 6); // (2 + 1 default) / 2
    });
  });

  describe("BaseLoRACadence", () => {
    it("recordJobs accumulates + rejects negatives", () => {
      const c = new BaseLoRACadence({}, clockAt(0));
      expect(c.recordJobs(5)).toBe(5);
      expect(c.recordJobs(3)).toBe(8);
      expect(() => c.recordJobs(-1)).toThrow();
    });
    it("checkDrift triggers a retrain past the threshold + rejects non-finite scores", () => {
      const c = new BaseLoRACadence({ driftThreshold: 0.1, retrainOnDrift: true }, clockAt(0));
      const d = c.checkDrift(70, 100); // (100-70)/100 = 0.30 > 0.10
      expect(d.drifted).toBe(true);
      expect(d.triggerRetrain).toBe(true);
      expect(c.checkDrift(95, 100).drifted).toBe(false); // 0.05 < 0.10
      expect(() => c.checkDrift(Number.NaN, 100)).toThrow();
    });
    it("calculateNextRun returns a strictly future tick", () => {
      const from = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
      const c = new BaseLoRACadence({ interval: "daily", hour: 2 }, () => from);
      expect(c.calculateNextRun(from).getTime()).toBeGreaterThan(from.getTime());
    });
    it("completeRun auto-promotes when evalScore >= performanceThreshold", () => {
      const c = new BaseLoRACadence({ autoPromote: true, performanceThreshold: 65 }, clockAt(1000));
      const run = c.startRun("manual");
      const done = c.completeRun(run.runId, { datasetSize: 10, trainingLoss: 0.1, evalScore: 80, newJobs: 10 }, "/m/v1");
      expect(done.promoted).toBe(true);
      expect(c.getState().activeVersion).toBe(done.version);
    });
    it("does NOT auto-promote a sub-threshold run", () => {
      const c = new BaseLoRACadence({ autoPromote: true, performanceThreshold: 65 }, clockAt(1000));
      const run = c.startRun("manual");
      const done = c.completeRun(run.runId, { datasetSize: 10, trainingLoss: 0.1, evalScore: 40, newJobs: 10 }, "/m/v1");
      expect(done.promoted).toBe(false);
    });
    it("failRun marks the run failed", () => {
      const c = new BaseLoRACadence({}, clockAt(0));
      const run = c.startRun("manual");
      expect(c.failRun(run.runId, "oom").status).toBe("failed");
    });
    it("pruneVersions retains at most maxVersions", () => {
      let t = 1000;
      const c = new BaseLoRACadence({ maxVersions: 2, autoPromote: false }, () => new Date((t += 1000)));
      for (let k = 0; k < 4; k++) {
        const r = c.startRun("manual");
        c.completeRun(r.runId, { datasetSize: 1, trainingLoss: 0, evalScore: 50, newJobs: 1 }, "/m" + k);
      }
      expect(c.getState().versions.length).toBeLessThanOrEqual(2);
    });
  });
});
