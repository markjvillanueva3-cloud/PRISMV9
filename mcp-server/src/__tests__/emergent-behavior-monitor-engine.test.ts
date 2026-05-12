/**
 * Tests for EmergentBehaviorMonitorEngine (Phase 0.18 U-AGI11)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EmergentBehaviorMonitorEngine,
  DEFAULT_MONITOR_CONFIG,
  emergentBehaviorMonitorEngine,
} from "../engines/EmergentBehaviorMonitorEngine.js";

describe("EmergentBehaviorMonitorEngine", () => {
  let e: EmergentBehaviorMonitorEngine;

  beforeEach(() => {
    e = new EmergentBehaviorMonitorEngine();
  });

  describe("construction", () => {
    it("uses default config", () => {
      const engine = new EmergentBehaviorMonitorEngine();
      expect(engine.size()).toBe(0);
      expect(DEFAULT_MONITOR_CONFIG.warnZ).toBe(2);
    });

    it("rejects invalid config", () => {
      expect(() => new EmergentBehaviorMonitorEngine({ windowSize: 2, warnZ: 2, alertZ: 3 })).toThrow(/windowSize/);
      expect(() => new EmergentBehaviorMonitorEngine({ windowSize: 20, warnZ: 0, alertZ: 3 })).toThrow(/warnZ/);
      expect(() => new EmergentBehaviorMonitorEngine({ windowSize: 20, warnZ: 3, alertZ: 3 })).toThrow(/alertZ/);
    });
  });

  describe("observeMetric()", () => {
    it("rejects empty name or non-finite value", () => {
      expect(() => e.observeMetric("", 1)).toThrow(/name/);
      expect(() => e.observeMetric("x", NaN)).toThrow(/finite/);
    });

    it("caps the window at the configured size", () => {
      const small = new EmergentBehaviorMonitorEngine({ windowSize: 5, warnZ: 2, alertZ: 3 });
      for (let i = 0; i < 10; i += 1) small.observeMetric("x", i);
      expect(small.size("x")).toBe(5);
    });

    it("stores ISO timestamp when none provided", () => {
      const p = e.observeMetric("x", 1);
      expect(p.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("detect() — baseline", () => {
    it("returns null when fewer than 3 samples", () => {
      e.observeMetric("x", 1);
      e.observeMetric("x", 2);
      expect(e.detect("x")).toBeNull();
    });

    it("returns severity=none when latest is within the baseline", () => {
      for (let i = 0; i < 10; i += 1) e.observeMetric("x", 50 + (i % 3 - 1) * 0.5);
      e.observeMetric("x", 50);
      const r = e.detect("x")!;
      expect(r.severity).toBe("none");
    });
  });

  describe("detect() — anomalies", () => {
    it("flags a warn when |z| crosses warnZ", () => {
      for (let i = 0; i < 10; i += 1) e.observeMetric("x", 50);
      e.observeMetric("x", 50.001); // introduce a tiny std to avoid inf z
      e.observeMetric("x", 60); // big spike
      const r = e.detect("x")!;
      expect(["warn", "alert"]).toContain(r.severity);
    });

    it("flags an alert when |z| crosses alertZ", () => {
      for (let i = 0; i < 10; i += 1) e.observeMetric("x", 50 + (i % 2 === 0 ? 0.1 : -0.1));
      e.observeMetric("x", 100);
      const r = e.detect("x")!;
      expect(r.severity).toBe("alert");
    });

    it("flags on sudden drops as well as spikes", () => {
      for (let i = 0; i < 10; i += 1) e.observeMetric("x", 50 + (i % 2 === 0 ? 0.1 : -0.1));
      e.observeMetric("x", 0);
      const r = e.detect("x")!;
      expect(r.severity).toBe("alert");
      expect(r.z).toBeLessThan(0);
    });

    it("handles zero stddev baseline: latest==mean → z=0", () => {
      for (let i = 0; i < 5; i += 1) e.observeMetric("x", 10);
      e.observeMetric("x", 10);
      const r = e.detect("x")!;
      expect(r.z).toBe(0);
      expect(r.severity).toBe("none");
    });

    it("handles zero stddev baseline: latest differs → z=Infinity → alert", () => {
      for (let i = 0; i < 5; i += 1) e.observeMetric("x", 10);
      e.observeMetric("x", 11);
      const r = e.detect("x")!;
      expect(r.severity).toBe("alert");
    });

    it("reason string reports which threshold was crossed", () => {
      for (let i = 0; i < 10; i += 1) e.observeMetric("x", 50 + (i % 2 === 0 ? 0.1 : -0.1));
      e.observeMetric("x", 100);
      const r = e.detect("x")!;
      expect(r.reason).toMatch(/exceeds/);
    });
  });

  describe("lifecycle helpers", () => {
    it("listMetrics returns sorted names", () => {
      e.observeMetric("b", 1);
      e.observeMetric("a", 1);
      expect(e.listMetrics()).toEqual(["a", "b"]);
    });

    it("size counts per-metric or total", () => {
      e.observeMetric("a", 1);
      e.observeMetric("a", 2);
      e.observeMetric("b", 1);
      expect(e.size()).toBe(3);
      expect(e.size("a")).toBe(2);
      expect(e.size("ghost")).toBe(0);
    });

    it("clear drops one metric or all", () => {
      e.observeMetric("a", 1);
      e.observeMetric("b", 1);
      e.clear("a");
      expect(e.size("a")).toBe(0);
      expect(e.size("b")).toBe(1);
      e.clear();
      expect(e.size()).toBe(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      emergentBehaviorMonitorEngine.clear();
      emergentBehaviorMonitorEngine.observeMetric("s", 1);
      expect(emergentBehaviorMonitorEngine.size("s")).toBe(1);
      emergentBehaviorMonitorEngine.clear();
    });
  });
});
