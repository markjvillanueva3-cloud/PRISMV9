/**
 * Tests for RegretMinimizationEngine (Phase 0.20 U-MATH16)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  RegretMinimizationEngine,
  regretMinimizationEngine,
  seededRng,
} from "../engines/RegretMinimizationEngine.js";

describe("RegretMinimizationEngine", () => {
  let e: RegretMinimizationEngine;

  beforeEach(() => {
    e = new RegretMinimizationEngine();
  });

  describe("addArm() / addArms() / record()", () => {
    it("rejects empty arm id", () => {
      expect(() => e.addArm("")).toThrow(/id/);
    });

    it("addArm is idempotent", () => {
      const a = e.addArm("a");
      const b = e.addArm("a");
      expect(a).toBe(b);
    });

    it("addArms registers multiple", () => {
      e.addArms(["a", "b", "c"]);
      expect(e.stats()).toHaveLength(3);
    });

    it("record throws on unknown arm", () => {
      expect(() => e.record("ghost", 0.5)).toThrow(/unknown arm/);
    });

    it("record rejects reward outside [0, 1]", () => {
      e.addArm("a");
      expect(() => e.record("a", -0.1)).toThrow(/reward/);
      expect(() => e.record("a", 1.1)).toThrow(/reward/);
    });

    it("record updates mean and pull counts", () => {
      e.addArm("a");
      e.record("a", 1);
      e.record("a", 0);
      const stats = e.stats().find((s) => s.id === "a")!;
      expect(stats.pulls).toBe(2);
      expect(stats.mean).toBe(0.5);
    });
  });

  describe("selectUcb()", () => {
    it("throws when no arms registered", () => {
      expect(() => e.selectUcb()).toThrow(/arms/);
    });

    it("prefers unpulled arms over pulled ones", () => {
      e.addArms(["pulled", "fresh"]);
      e.record("pulled", 1);
      e.record("pulled", 1);
      const r = e.selectUcb();
      expect(r.arm).toBe("fresh");
    });

    it("converges to the highest-mean arm once all are explored enough", () => {
      e.addArms(["a", "b"]);
      for (let i = 0; i < 20; i += 1) {
        e.record("a", 0.9);
        e.record("b", 0.1);
      }
      expect(e.selectUcb().arm).toBe("a");
    });

    it("reports per-arm scores", () => {
      e.addArms(["a", "b"]);
      e.record("a", 0.5);
      e.record("b", 0.5);
      const r = e.selectUcb();
      expect(Object.keys(r.scores).sort()).toEqual(["a", "b"]);
    });
  });

  describe("selectThompson()", () => {
    it("throws when no arms registered", () => {
      expect(() => e.selectThompson(seededRng(1))).toThrow(/arms/);
    });

    it("is deterministic with a seeded PRNG", () => {
      e.addArms(["a", "b", "c"]);
      for (let i = 0; i < 5; i += 1) {
        e.record("a", 0.8);
        e.record("b", 0.3);
        e.record("c", 0.5);
      }
      const a = e.selectThompson(seededRng(42));
      const b = e.selectThompson(seededRng(42));
      expect(a.arm).toBe(b.arm);
      expect(a.scores).toEqual(b.scores);
    });

    it("eventually selects the high-reward arm over many draws", () => {
      e.addArms(["good", "bad"]);
      for (let i = 0; i < 50; i += 1) e.record("good", 1);
      for (let i = 0; i < 50; i += 1) e.record("bad", 0);
      const rng = seededRng(7);
      let goodWins = 0;
      for (let i = 0; i < 200; i += 1) {
        if (e.selectThompson(rng).arm === "good") goodWins += 1;
      }
      expect(goodWins).toBeGreaterThan(180);
    });
  });

  describe("lifecycle", () => {
    it("totalPullsCount reflects all record calls", () => {
      e.addArm("a");
      e.record("a", 0.5);
      e.record("a", 0.5);
      expect(e.totalPullsCount()).toBe(2);
    });

    it("clear resets state", () => {
      e.addArm("a");
      e.record("a", 1);
      e.clear();
      expect(e.stats()).toEqual([]);
      expect(e.totalPullsCount()).toBe(0);
    });
  });

  describe("seededRng()", () => {
    it("is deterministic for the same seed", () => {
      const a = seededRng(1);
      const b = seededRng(1);
      for (let i = 0; i < 5; i += 1) expect(a()).toBe(b());
    });

    it("produces values in [0, 1)", () => {
      const rng = seededRng(2);
      for (let i = 0; i < 50; i += 1) {
        const v = rng();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      regretMinimizationEngine.clear();
      regretMinimizationEngine.addArm("s");
      expect(regretMinimizationEngine.stats()).toHaveLength(1);
      regretMinimizationEngine.clear();
    });
  });
});
