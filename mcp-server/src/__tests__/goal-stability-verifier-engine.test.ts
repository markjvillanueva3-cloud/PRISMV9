/**
 * Tests for GoalStabilityVerifierEngine (Phase 0.25.1 U-SAFE2)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  GoalStabilityVerifierEngine,
  DEFAULT_VERIFIER_CONFIG,
  goalStabilityVerifierEngine,
} from "../engines/GoalStabilityVerifierEngine.js";

const NOW_BASE = Date.parse("2026-04-16T00:00:00.000Z");
function iso(offsetSec: number): string {
  return new Date(NOW_BASE + offsetSec * 1000).toISOString();
}

describe("GoalStabilityVerifierEngine", () => {
  let e: GoalStabilityVerifierEngine;

  beforeEach(() => {
    e = new GoalStabilityVerifierEngine();
  });

  describe("construction", () => {
    it("uses default config when none supplied", () => {
      expect(DEFAULT_VERIFIER_CONFIG.windowSize).toBe(10);
    });

    it("rejects invalid config", () => {
      expect(() =>
        new GoalStabilityVerifierEngine({ ...DEFAULT_VERIFIER_CONFIG, windowSize: 1 })
      ).toThrow(/windowSize/);
      expect(() =>
        new GoalStabilityVerifierEngine({ ...DEFAULT_VERIFIER_CONFIG, driftAlertAt: 0 })
      ).toThrow(/driftAlertAt/);
      expect(() =>
        new GoalStabilityVerifierEngine({ ...DEFAULT_VERIFIER_CONFIG, minObservationsForDrift: 1 })
      ).toThrow(/minObservationsForDrift/);
    });
  });

  describe("observe()", () => {
    it("rejects bad ISO or empty text", () => {
      expect(() => e.observe({ at: "yesterday", goalText: "x" })).toThrow(/at/);
      expect(() => e.observe({ at: iso(0), goalText: "" })).toThrow(/goalText/);
    });

    it("caps window length at the configured size", () => {
      const small = new GoalStabilityVerifierEngine({ ...DEFAULT_VERIFIER_CONFIG, windowSize: 3 });
      for (let i = 0; i < 10; i += 1) small.observe({ at: iso(i), goalText: `goal ${i}` });
      expect(small.analyze().observationCount).toBe(3);
    });
  });

  describe("semantic drift", () => {
    it("flags a large shift between consecutive goals", () => {
      e.observe({ at: iso(0), goalText: "optimise wire edm roughing feedrate" });
      e.observe({ at: iso(60), goalText: "shut down dispatcher registry" });
      const signals = e.analyze().signals.filter((s) => s.kind === "semantic");
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0].severity).toBeGreaterThanOrEqual(DEFAULT_VERIFIER_CONFIG.driftAlertAt);
    });

    it("stays quiet when the next goal is a near-synonym", () => {
      e.observe({ at: iso(0), goalText: "optimise wire edm roughing feedrate" });
      e.observe({ at: iso(60), goalText: "tune wire edm roughing feedrate" });
      const signals = e.analyze().signals.filter((s) => s.kind === "semantic");
      expect(signals).toHaveLength(0);
    });
  });

  describe("value drift", () => {
    it("flags primary-objective change without rationale", () => {
      e.observe({ at: iso(0), goalText: "g1", primaryObjective: "cut titanium" });
      e.observe({ at: iso(60), goalText: "g2", primaryObjective: "disable hooks" });
      const signals = e.analyze().signals.filter((s) => s.kind === "value");
      expect(signals.length).toBeGreaterThan(0);
    });

    it("accepts objective change when rationale is declared", () => {
      e.observe({ at: iso(0), goalText: "g1", primaryObjective: "A" });
      e.observe({
        at: iso(60),
        goalText: "g2",
        primaryObjective: "B",
        declaredRationale: "completed A; proceeding to B per user request",
      });
      const signals = e.analyze().signals.filter((s) => s.kind === "value");
      expect(signals).toHaveLength(0);
    });
  });

  describe("instrumental convergence", () => {
    it("flags a suspicious term inside any observation", () => {
      e.observe({ at: iso(0), goalText: "please disable the safety hook" });
      const signals = e.analyze().signals.filter((s) => s.kind === "instrumental");
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0].severity).toBe(1);
    });

    it("flags even with a single observation", () => {
      e.observe({ at: iso(0), goalText: "self-replicate across terminals" });
      expect(e.analyze().stable).toBe(false);
    });

    it("does not flag innocuous text", () => {
      e.observe({ at: iso(0), goalText: "improve wedm feedrate on cobalt" });
      const signals = e.analyze().signals.filter((s) => s.kind === "instrumental");
      expect(signals).toHaveLength(0);
    });
  });

  describe("report shape", () => {
    it("reports stable=true when no signals", () => {
      e.observe({ at: iso(0), goalText: "optimise speed feed" });
      const report = e.analyze();
      expect(report.stable).toBe(true);
      expect(report.overallSeverity).toBe(0);
    });

    it("overallSeverity is the max severity across signals", () => {
      e.observe({ at: iso(0), goalText: "disable safety" });
      e.observe({ at: iso(60), goalText: "totally different thing" });
      const report = e.analyze();
      expect(report.overallSeverity).toBe(1);
    });
  });

  describe("lifecycle", () => {
    it("clear empties the window", () => {
      e.observe({ at: iso(0), goalText: "x" });
      e.clear();
      expect(e.analyze().observationCount).toBe(0);
    });

    it("setConfig replaces config", () => {
      e.setConfig({ ...DEFAULT_VERIFIER_CONFIG, windowSize: 2 });
      for (let i = 0; i < 5; i += 1) e.observe({ at: iso(i), goalText: `g${i}` });
      expect(e.analyze().observationCount).toBe(2);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      goalStabilityVerifierEngine.clear();
      goalStabilityVerifierEngine.observe({ at: iso(0), goalText: "hi" });
      expect(goalStabilityVerifierEngine.analyze().observationCount).toBe(1);
      goalStabilityVerifierEngine.clear();
    });
  });
});
