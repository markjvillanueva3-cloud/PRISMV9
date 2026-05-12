/**
 * Tests for TemporalReasoningEngine (Phase 0.18 U-AGI6)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TemporalReasoningEngine,
  temporalReasoningEngine,
} from "../engines/TemporalReasoningEngine.js";

function dayIso(offset: number): string {
  const base = Date.parse("2026-04-01T00:00:00.000Z");
  return new Date(base + offset * 24 * 60 * 60 * 1000).toISOString();
}

describe("TemporalReasoningEngine", () => {
  let e: TemporalReasoningEngine;

  beforeEach(() => {
    e = new TemporalReasoningEngine();
  });

  describe("record()", () => {
    it("stores a snapshot in chronological order", () => {
      e.record("psi", 40, dayIso(0));
      e.record("psi", 50, dayIso(2));
      e.record("psi", 45, dayIso(1));
      expect(e.snapshots("psi").map((s) => s.value)).toEqual([40, 45, 50]);
    });

    it("rejects empty series name", () => {
      expect(() => e.record("", 1)).toThrow(/series/);
    });

    it("rejects non-finite value", () => {
      expect(() => e.record("x", Infinity)).toThrow(/finite/);
      expect(() => e.record("x", NaN)).toThrow(/finite/);
    });

    it("rejects bad ISO timestamps", () => {
      expect(() => e.record("x", 1, "yesterday")).toThrow(/ISO/);
    });

    it("records a note", () => {
      const s = e.record("x", 1, dayIso(0), "first");
      expect(s.note).toBe("first");
    });
  });

  describe("valueAt()", () => {
    beforeEach(() => {
      e.record("psi", 40, dayIso(0));
      e.record("psi", 50, dayIso(10));
    });

    it("returns the first snapshot for times before the series start", () => {
      expect(e.valueAt("psi", dayIso(-5))).toBe(40);
    });

    it("returns the last snapshot for times past the series end", () => {
      expect(e.valueAt("psi", dayIso(20))).toBe(50);
    });

    it("linearly interpolates between snapshots", () => {
      expect(e.valueAt("psi", dayIso(5))).toBeCloseTo(45, 4);
    });

    it("returns null for unknown series", () => {
      expect(e.valueAt("ghost", dayIso(0))).toBeNull();
    });

    it("throws on unparseable ISO", () => {
      expect(() => e.valueAt("psi", "nonsense")).toThrow(/unparseable/);
    });
  });

  describe("project()", () => {
    it("returns null when fewer than 2 snapshots", () => {
      e.record("psi", 40, dayIso(0));
      expect(e.project("psi")).toBeNull();
    });

    it("detects a positive slope on a linear rise", () => {
      for (let i = 0; i < 10; i += 1) e.record("psi", 40 + i * 2, dayIso(i));
      const p = e.project("psi")!;
      expect(p.slopePerDay).toBeCloseTo(2, 1);
      expect(p.r2).toBeCloseTo(1, 2);
    });

    it("reports current = last window value", () => {
      for (let i = 0; i < 5; i += 1) e.record("psi", i * 10, dayIso(i));
      expect(e.project("psi")!.current).toBe(40);
    });

    it("respects windowSize", () => {
      for (let i = 0; i < 15; i += 1) e.record("psi", 1, dayIso(i));
      expect(e.project("psi", 5)!.windowSize).toBe(5);
    });

    it("rounds slope/intercept/r2 to four decimals", () => {
      e.record("psi", 1, dayIso(0));
      e.record("psi", 1.12345, dayIso(1));
      const p = e.project("psi")!;
      expect((p.slopePerDay.toString().split(".")[1] ?? "").length).toBeLessThanOrEqual(4);
    });
  });

  describe("forecast()", () => {
    it("reports hit=true when target is already met exactly", () => {
      for (let i = 0; i < 5; i += 1) e.record("psi", 40, dayIso(i));
      const f = e.forecast("psi", 40);
      expect(f.hit).toBe(true);
      expect(f.etaDays).toBe(0);
    });

    it("projects ETA when slope points toward target", () => {
      for (let i = 0; i < 5; i += 1) e.record("psi", 40 + i * 2, dayIso(i));
      const f = e.forecast("psi", 50, 10, dayIso(4));
      expect(f.hit).toBe(false);
      expect(f.etaDays).toBeCloseTo(1, 1);
      expect(f.etaIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("reports failure when slope points away from target", () => {
      for (let i = 0; i < 5; i += 1) e.record("psi", 50 - i * 2, dayIso(i));
      const f = e.forecast("psi", 60);
      expect(f.hit).toBe(false);
      expect(f.reason).toMatch(/slope/);
    });

    it("reports failure when slope is zero", () => {
      for (let i = 0; i < 5; i += 1) e.record("psi", 50, dayIso(i));
      const f = e.forecast("psi", 60);
      expect(f.hit).toBe(false);
      expect(f.reason).toMatch(/zero/);
    });

    it("reports failure when no data", () => {
      const f = e.forecast("ghost", 100);
      expect(f.hit).toBe(false);
      expect(f.reason).toMatch(/not enough/);
    });
  });

  describe("lifecycle", () => {
    it("listSeries returns names sorted", () => {
      e.record("b", 1, dayIso(0));
      e.record("a", 1, dayIso(0));
      expect(e.listSeries()).toEqual(["a", "b"]);
    });

    it("size counts all or a single series", () => {
      e.record("a", 1, dayIso(0));
      e.record("a", 1, dayIso(1));
      e.record("b", 1, dayIso(0));
      expect(e.size()).toBe(3);
      expect(e.size("a")).toBe(2);
      expect(e.size("ghost")).toBe(0);
    });

    it("clear deletes a series or all", () => {
      e.record("a", 1, dayIso(0));
      e.record("b", 1, dayIso(0));
      e.clear("a");
      expect(e.size("a")).toBe(0);
      expect(e.size("b")).toBe(1);
      e.clear();
      expect(e.size()).toBe(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      temporalReasoningEngine.clear();
      temporalReasoningEngine.record("s", 1, dayIso(0));
      expect(temporalReasoningEngine.size("s")).toBe(1);
      temporalReasoningEngine.clear();
    });
  });
});
