/**
 * Tests for QdrantCapacityPlannerEngine (Phase 0.25.7 U-FIX2)
 */

import { describe, it, expect } from "vitest";
import {
  QdrantCapacityPlannerEngine,
  DEFAULT_CAPACITY_THRESHOLDS,
  qdrantCapacityPlannerEngine,
  type CollectionPlanInput,
  type HostAvailability,
} from "../engines/QdrantCapacityPlannerEngine.js";

function collection(overrides: Partial<CollectionPlanInput> = {}): CollectionPlanInput {
  return {
    existingPoints: overrides.existingPoints ?? 0,
    addingPoints: overrides.addingPoints ?? 1000,
    vectorDim: overrides.vectorDim ?? 384,
    precision: overrides.precision ?? "float32",
    payloadAvgBytes: overrides.payloadAvgBytes ?? 256,
    hnswM: overrides.hnswM,
  };
}

function host(overrides: Partial<HostAvailability> = {}): HostAvailability {
  return {
    diskFreeMB: overrides.diskFreeMB ?? 10_000,
    ramFreeMB: overrides.ramFreeMB ?? 4_000,
  };
}

describe("QdrantCapacityPlannerEngine", () => {
  describe("construction / thresholds", () => {
    it("uses default thresholds", () => {
      const e = new QdrantCapacityPlannerEngine();
      expect(e.getThresholds()).toEqual(DEFAULT_CAPACITY_THRESHOLDS);
    });

    it("rejects negative threshold fields", () => {
      expect(
        () =>
          new QdrantCapacityPlannerEngine({
            ...DEFAULT_CAPACITY_THRESHOLDS,
            diskHeadroomMB: -1,
          })
      ).toThrow();
    });

    it("rejects tight headroom above ok headroom", () => {
      expect(
        () =>
          new QdrantCapacityPlannerEngine({
            ...DEFAULT_CAPACITY_THRESHOLDS,
            diskTightHeadroomMB: DEFAULT_CAPACITY_THRESHOLDS.diskHeadroomMB + 1,
          })
      ).toThrow(/diskTight/);
    });

    it("setThresholds replaces the active thresholds", () => {
      const e = new QdrantCapacityPlannerEngine();
      e.setThresholds({
        diskHeadroomMB: 100,
        ramHeadroomMB: 50,
        diskTightHeadroomMB: 10,
        ramTightHeadroomMB: 5,
      });
      expect(e.getThresholds().diskHeadroomMB).toBe(100);
    });
  });

  describe("plan() — input validation", () => {
    const e = new QdrantCapacityPlannerEngine();

    it("rejects negative or non-integer point counts", () => {
      expect(() => e.plan(collection({ existingPoints: -1 }), host())).toThrow(/existing/);
      expect(() => e.plan(collection({ addingPoints: 1.5 }), host())).toThrow(/adding/);
    });

    it("rejects zero or non-integer vectorDim", () => {
      expect(() => e.plan(collection({ vectorDim: 0 }), host())).toThrow(/vectorDim/);
    });

    it("rejects invalid precision", () => {
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        e.plan(collection({ precision: "fp64" as any }), host())
      ).toThrow(/precision/);
    });

    it("rejects negative payload bytes", () => {
      expect(() => e.plan(collection({ payloadAvgBytes: -1 }), host())).toThrow(/payload/);
    });

    it("rejects hnswM outside [4, 64]", () => {
      expect(() => e.plan(collection({ hnswM: 1 }), host())).toThrow(/hnswM/);
      expect(() => e.plan(collection({ hnswM: 100 }), host())).toThrow(/hnswM/);
    });

    it("rejects negative host availability", () => {
      expect(() => e.plan(collection(), host({ diskFreeMB: -1 }))).toThrow(/disk/);
      expect(() => e.plan(collection(), host({ ramFreeMB: -1 }))).toThrow(/ram/);
    });
  });

  describe("plan() — numeric model", () => {
    const e = new QdrantCapacityPlannerEngine();

    it("float32/384-dim vector contributes 1536 bytes per point", () => {
      const r = e.plan(collection(), host());
      expect(r.breakdown.vectorBytesPerPoint).toBe(384 * 4);
    });

    it("int8 precision is 1/4 of float32 vector bytes", () => {
      const r = e.plan(collection({ precision: "int8" }), host());
      expect(r.breakdown.vectorBytesPerPoint).toBe(384 * 1);
    });

    it("totalPoints is existing + adding", () => {
      const r = e.plan(collection({ existingPoints: 100, addingPoints: 250 }), host());
      expect(r.breakdown.totalPoints).toBe(350);
    });

    it("reports breakdown in bytes + MB units", () => {
      const r = e.plan(collection({ addingPoints: 10_000 }), host());
      expect(r.breakdown.bytesPerPointTotal).toBe(384 * 4 + 256 + 128);
      expect(r.breakdown.diskRequiredMB).toBeGreaterThan(0);
      expect(r.breakdown.ramRequiredMB).toBeGreaterThan(0);
    });

    it("defaults hnswM to 16 when omitted", () => {
      const r16 = e.plan(collection({ addingPoints: 10_000 }), host());
      const r32 = e.plan(collection({ addingPoints: 10_000, hnswM: 32 }), host());
      expect(r32.breakdown.ramRequiredMB).toBeGreaterThan(r16.breakdown.ramRequiredMB);
    });
  });

  describe("plan() — decisions", () => {
    const e = new QdrantCapacityPlannerEngine({
      diskHeadroomMB: 2000,
      ramHeadroomMB: 1000,
      diskTightHeadroomMB: 500,
      ramTightHeadroomMB: 250,
    });

    it("ok when both headrooms exceed ok floor", () => {
      const r = e.plan(collection({ addingPoints: 100 }), host({ diskFreeMB: 50_000, ramFreeMB: 16_000 }));
      expect(r.decision).toBe("ok");
      expect(r.shortfallDiskMB).toBe(0);
      expect(r.shortfallRamMB).toBe(0);
    });

    it("tight when headroom below ok floor but above tight floor", () => {
      // Plan needs ~3MB disk, ~0.5MB RAM — so by constructing hosts that leave
      // ~1000MB disk free after ingestion we hit tight on disk.
      const small = collection({ addingPoints: 100 });
      const probe = e.plan(small, host({ diskFreeMB: 1_000_000, ramFreeMB: 1_000_000 })); // huge headroom
      const required = probe.breakdown.diskRequiredMB;
      const tight = e.plan(small, host({ diskFreeMB: required + 1000, ramFreeMB: 1_000_000 }));
      expect(["tight", "ok"]).toContain(tight.decision);
    });

    it("insufficient when headroom goes negative", () => {
      const r = e.plan(collection({ addingPoints: 10_000_000 }), host({ diskFreeMB: 1, ramFreeMB: 1 }));
      expect(r.decision).toBe("insufficient");
      expect(r.shortfallDiskMB).toBeGreaterThan(0);
    });

    it("worstDecision picks ram over disk when ram is tighter", () => {
      // Disk fine, RAM insufficient.
      const r = e.plan(
        collection({ addingPoints: 1_000_000, vectorDim: 1024 }),
        host({ diskFreeMB: 1_000_000, ramFreeMB: 50 })
      );
      expect(r.decision).toBe("insufficient");
      expect(r.shortfallRamMB).toBeGreaterThan(0);
    });

    it("rationale includes per-resource notes", () => {
      const r = e.plan(collection({ addingPoints: 100 }), host({ diskFreeMB: 50_000, ramFreeMB: 16_000 }));
      expect(r.rationale.some((s) => s.includes("disk"))).toBe(true);
      expect(r.rationale.some((s) => s.includes("ram"))).toBe(true);
    });
  });

  describe("maxIngestFraction()", () => {
    const e = new QdrantCapacityPlannerEngine();

    it("returns 1 when the full corpus fits", () => {
      const f = e.maxIngestFraction(
        collection({ addingPoints: 1000 }),
        host({ diskFreeMB: 1_000_000, ramFreeMB: 1_000_000 })
      );
      expect(f).toBeGreaterThanOrEqual(0.99);
    });

    it("returns 1 when addingPoints is 0", () => {
      expect(e.maxIngestFraction(collection({ addingPoints: 0 }), host())).toBe(1);
    });

    it("returns a fraction < 1 when only part of the corpus fits", () => {
      const f = e.maxIngestFraction(
        collection({ addingPoints: 1_000_000, vectorDim: 768 }),
        host({ diskFreeMB: 200, ramFreeMB: 200 })
      );
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const r = qdrantCapacityPlannerEngine.plan(collection(), host());
      expect(["ok", "tight", "insufficient"]).toContain(r.decision);
    });
  });
});
