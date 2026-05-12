/**
 * Tests for MemoryPressureMonitorEngine (Phase 0.25.4 U-PERF6)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MemoryPressureMonitorEngine,
  DEFAULT_MEMORY_CONFIG,
  memoryPressureMonitorEngine,
  type MemoryReader,
} from "../engines/MemoryPressureMonitorEngine.js";

function fakeReader(heapUsedMB: number, heapTotalMB = heapUsedMB * 1.4, rssMB = heapUsedMB * 1.8): MemoryReader {
  return () => ({
    heapUsed: heapUsedMB * 1024 * 1024,
    heapTotal: heapTotalMB * 1024 * 1024,
    rss: rssMB * 1024 * 1024,
    external: 4 * 1024 * 1024,
  });
}

function sequenceReader(sequenceMB: readonly number[]): MemoryReader {
  let i = 0;
  return () => {
    const v = sequenceMB[Math.min(i, sequenceMB.length - 1)];
    i += 1;
    return {
      heapUsed: v * 1024 * 1024,
      heapTotal: Math.max(1, v * 1.4) * 1024 * 1024,
      rss: Math.max(1, v * 1.8) * 1024 * 1024,
      external: 0,
    };
  };
}

describe("MemoryPressureMonitorEngine", () => {
  describe("construction", () => {
    it("uses default config when omitted", () => {
      const e = new MemoryPressureMonitorEngine(undefined, fakeReader(100));
      expect(e.getConfig()).toEqual(DEFAULT_MEMORY_CONFIG);
    });

    it("rejects non-positive warnMB", () => {
      expect(
        () =>
          new MemoryPressureMonitorEngine({ warnMB: 0, criticalMB: 100, windowSize: 5 }, fakeReader(50))
      ).toThrow(/warnMB/);
    });

    it("rejects criticalMB ≤ warnMB", () => {
      expect(
        () =>
          new MemoryPressureMonitorEngine({ warnMB: 100, criticalMB: 50, windowSize: 5 }, fakeReader(50))
      ).toThrow(/criticalMB/);
    });

    it("rejects windowSize < 2", () => {
      expect(
        () =>
          new MemoryPressureMonitorEngine({ warnMB: 100, criticalMB: 200, windowSize: 1 }, fakeReader(50))
      ).toThrow(/windowSize/);
    });
  });

  describe("sampleNow() — band classification", () => {
    const config = { warnMB: 100, criticalMB: 200, windowSize: 10 };

    it("reports healthy when below warnMB", () => {
      const e = new MemoryPressureMonitorEngine(config, fakeReader(50));
      const r = e.sampleNow();
      expect(r.band).toBe("healthy");
      expect(r.heapUsedMB).toBe(50);
    });

    it("reports warn at/above warnMB", () => {
      const e = new MemoryPressureMonitorEngine(config, fakeReader(150));
      expect(e.sampleNow().band).toBe("warn");
    });

    it("reports critical at/above criticalMB", () => {
      const e = new MemoryPressureMonitorEngine(config, fakeReader(250));
      expect(e.sampleNow().band).toBe("critical");
    });

    it("includes threshold in reading and a rationale", () => {
      const e = new MemoryPressureMonitorEngine(config, fakeReader(150));
      const r = e.sampleNow();
      expect(r.thresholdMB).toEqual({ warn: 100, critical: 200 });
      expect(r.rationale).toMatch(/warn/);
    });

    it("computes heapUtilization as heapUsed/heapTotal", () => {
      const e = new MemoryPressureMonitorEngine(config, fakeReader(100, 400));
      const r = e.sampleNow();
      expect(r.heapUtilization).toBeCloseTo(0.25, 4);
    });

    it("uses supplied nowIso on the sample", () => {
      const e = new MemoryPressureMonitorEngine(config, fakeReader(50));
      const r = e.sampleNow("2026-04-16T00:00:00.000Z");
      expect(r.at).toBe("2026-04-16T00:00:00.000Z");
    });
  });

  describe("window management", () => {
    it("caps buffer at windowSize", () => {
      const e = new MemoryPressureMonitorEngine(
        { warnMB: 10, criticalMB: 50, windowSize: 3 },
        fakeReader(20)
      );
      for (let i = 0; i < 10; i += 1) e.sampleNow();
      expect(e.lastN(10).length).toBe(3);
    });

    it("lastN rejects negatives and non-integers", () => {
      const e = new MemoryPressureMonitorEngine(undefined, fakeReader(50));
      expect(() => e.lastN(-1)).toThrow();
      expect(() => e.lastN(1.5)).toThrow();
    });

    it("clear empties the samples", () => {
      const e = new MemoryPressureMonitorEngine(undefined, fakeReader(50));
      e.sampleNow();
      e.sampleNow();
      e.clear();
      expect(e.lastN(10)).toEqual([]);
    });
  });

  describe("trend()", () => {
    it("reports average over window", () => {
      const e = new MemoryPressureMonitorEngine(
        { warnMB: 100, criticalMB: 300, windowSize: 10 },
        sequenceReader([10, 20, 30, 40])
      );
      for (let i = 0; i < 4; i += 1) e.sampleNow();
      const t = e.trend();
      expect(t.average).toBeCloseTo(25, 4);
      expect(t.samples).toBe(4);
    });

    it("detects rising trend when newer half > older by >5%", () => {
      const e = new MemoryPressureMonitorEngine(
        { warnMB: 100, criticalMB: 300, windowSize: 10 },
        sequenceReader([10, 10, 50, 50])
      );
      for (let i = 0; i < 4; i += 1) e.sampleNow();
      expect(e.trend().rising).toBe(true);
    });

    it("detects flat trend", () => {
      const e = new MemoryPressureMonitorEngine(
        { warnMB: 100, criticalMB: 300, windowSize: 10 },
        sequenceReader([50, 50, 50, 50])
      );
      for (let i = 0; i < 4; i += 1) e.sampleNow();
      expect(e.trend().rising).toBe(false);
    });

    it("returns rising=false for fewer than 4 samples", () => {
      const e = new MemoryPressureMonitorEngine(undefined, fakeReader(50));
      e.sampleNow();
      e.sampleNow();
      const t = e.trend();
      expect(t.rising).toBe(false);
      expect(t.samples).toBe(2);
    });

    it("returns zero average for empty buffer", () => {
      const e = new MemoryPressureMonitorEngine(undefined, fakeReader(50));
      expect(e.trend()).toEqual({ average: 0, rising: false, samples: 0 });
    });
  });

  describe("setConfig()", () => {
    it("replaces the active config", () => {
      const e = new MemoryPressureMonitorEngine(
        { warnMB: 100, criticalMB: 200, windowSize: 5 },
        fakeReader(150)
      );
      expect(e.sampleNow().band).toBe("warn");
      e.setConfig({ warnMB: 200, criticalMB: 400, windowSize: 5 });
      expect(e.sampleNow().band).toBe("healthy");
    });

    it("rejects invalid updates", () => {
      const e = new MemoryPressureMonitorEngine(undefined, fakeReader(50));
      expect(() => e.setConfig({ warnMB: 0, criticalMB: 100, windowSize: 5 })).toThrow();
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      expect(memoryPressureMonitorEngine).toBeInstanceOf(MemoryPressureMonitorEngine);
      const r = memoryPressureMonitorEngine.sampleNow();
      expect(["healthy", "warn", "critical"]).toContain(r.band);
    });
  });
});
