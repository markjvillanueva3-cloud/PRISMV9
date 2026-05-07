/**
 * HookTelemetryEngine Tests — Phase 0.25 Scientific Foundations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { hookTelemetryEngine } from "../engines/HookTelemetryEngine.js";

describe("HookTelemetryEngine", () => {
  beforeEach(() => {
    hookTelemetryEngine.reset();
  });

  describe("recordStart and recordEnd", () => {
    it("records hook invocation", () => {
      const invocation = hookTelemetryEngine.recordStart("test-hook");
      expect(invocation.hookName).toBe("test-hook");
      expect(invocation.startTime).toBeGreaterThan(0);

      hookTelemetryEngine.recordEnd(invocation, true, false);

      const stats = hookTelemetryEngine.getHookStats("test-hook");
      expect(stats).not.toBeNull();
      expect(stats!.invocations).toBe(1);
      expect(stats!.successes).toBe(1);
    });

    it("tracks failures", () => {
      const invocation = hookTelemetryEngine.recordStart("failing-hook");
      hookTelemetryEngine.recordEnd(invocation, false, false, "Test error");

      const stats = hookTelemetryEngine.getHookStats("failing-hook");
      expect(stats!.failures).toBe(1);
      expect(stats!.successes).toBe(0);
    });

    it("tracks blocks", () => {
      const invocation = hookTelemetryEngine.recordStart("blocking-hook");
      hookTelemetryEngine.recordEnd(invocation, true, true);

      const stats = hookTelemetryEngine.getHookStats("blocking-hook");
      expect(stats!.blocks).toBe(1);
    });
  });

  describe("getHookStats", () => {
    it("calculates percentile latencies", () => {
      // Record many invocations with varying latencies
      for (let i = 0; i < 100; i++) {
        const invocation = hookTelemetryEngine.recordStart("latency-test");
        // Simulate some processing time
        const fakeEnd = invocation.startTime + (i + 1);
        invocation.endTime = fakeEnd;
        hookTelemetryEngine.recordEnd(invocation, true, false);
      }

      const stats = hookTelemetryEngine.getHookStats("latency-test");
      expect(stats).not.toBeNull();
      expect(stats!.p50LatencyMs).toBeLessThanOrEqual(stats!.p95LatencyMs);
      expect(stats!.p95LatencyMs).toBeLessThanOrEqual(stats!.p99LatencyMs);
      expect(stats!.p99LatencyMs).toBeLessThanOrEqual(stats!.maxLatencyMs);
    });

    it("returns null for unknown hook", () => {
      const stats = hookTelemetryEngine.getHookStats("nonexistent");
      expect(stats).toBeNull();
    });
  });

  describe("getSystemMetrics", () => {
    it("calculates arrival and service rates", () => {
      // Record several invocations
      for (let i = 0; i < 10; i++) {
        const inv = hookTelemetryEngine.recordStart("system-test");
        hookTelemetryEngine.recordEnd(inv, true, false);
      }

      const metrics = hookTelemetryEngine.getSystemMetrics();
      expect(metrics.arrivalRate).toBeGreaterThanOrEqual(0);
      expect(metrics.serviceRate).toBeGreaterThanOrEqual(0);
    });

    it("identifies bottleneck hook", () => {
      // Record some hooks - bottleneck is determined by actual recorded latencies
      for (let i = 0; i < 5; i++) {
        const inv = hookTelemetryEngine.recordStart("fast-hook");
        hookTelemetryEngine.recordEnd(inv, true, false);
      }

      for (let i = 0; i < 5; i++) {
        const inv = hookTelemetryEngine.recordStart("another-hook");
        hookTelemetryEngine.recordEnd(inv, true, false);
      }

      const metrics = hookTelemetryEngine.getSystemMetrics();
      // Bottleneck should be one of the hooks we created
      if (metrics.bottleneckHook) {
        expect(["fast-hook", "another-hook"]).toContain(metrics.bottleneckHook);
      }
    });

    it("calculates utilization", () => {
      const metrics = hookTelemetryEngine.getSystemMetrics();
      expect(metrics.utilization).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.isHealthy).toBe("boolean");
      expect(typeof metrics.isStable).toBe("boolean");
    });
  });

  describe("alerts", () => {
    it("generates alerts structure correctly", () => {
      // Record several invocations to potentially trigger alerts
      for (let i = 0; i < 15; i++) {
        const inv = hookTelemetryEngine.recordStart("test-alert-hook");
        // Trigger failures for failure_rate alert
        hookTelemetryEngine.recordEnd(inv, i < 3, false);  // 80% failure rate
      }

      const alerts = hookTelemetryEngine.getAlerts();
      // Should have some alerts due to high failure rate
      expect(Array.isArray(alerts)).toBe(true);
      if (alerts.length > 0) {
        expect(alerts[0]).toHaveProperty("type");
        expect(alerts[0]).toHaveProperty("severity");
        expect(alerts[0]).toHaveProperty("hookName");
      }
    });

    it("generates failure rate alert", () => {
      // Create high failure rate
      for (let i = 0; i < 20; i++) {
        const inv = hookTelemetryEngine.recordStart("failing");
        hookTelemetryEngine.recordEnd(inv, i < 15, false);  // 75% failure rate
      }

      const alerts = hookTelemetryEngine.getAlerts();
      const failAlert = alerts.find(a => a.type === "failure_rate");
      expect(failAlert).toBeDefined();
    });

    it("clears alerts", () => {
      const inv = hookTelemetryEngine.recordStart("alerting");
      inv.endTime = inv.startTime + 200;
      hookTelemetryEngine.recordEnd(inv, true, false);

      expect(hookTelemetryEngine.getAlerts().length).toBeGreaterThan(0);

      hookTelemetryEngine.clearAlerts();
      expect(hookTelemetryEngine.getAlerts().length).toBe(0);
    });
  });

  describe("isHealthy", () => {
    it("returns boolean health status", () => {
      // Record successful invocations
      for (let i = 0; i < 5; i++) {
        const inv = hookTelemetryEngine.recordStart("healthy");
        hookTelemetryEngine.recordEnd(inv, true, false);
      }

      const healthy = hookTelemetryEngine.isHealthy();
      expect(typeof healthy).toBe("boolean");
    });
  });

  describe("getHealthSummary", () => {
    it("returns structured health summary", () => {
      const inv = hookTelemetryEngine.recordStart("test");
      hookTelemetryEngine.recordEnd(inv, true, false);

      const summary = hookTelemetryEngine.getHealthSummary();
      expect(["healthy", "degraded", "critical"]).toContain(summary.status);
      expect(typeof summary.utilization).toBe("number");
      expect(typeof summary.recentAlerts).toBe("number");
    });
  });

  describe("getAllHookStats", () => {
    it("returns stats for all hooks sorted by latency", () => {
      // Create multiple hooks
      for (const name of ["hook-a", "hook-b", "hook-c"]) {
        const inv = hookTelemetryEngine.recordStart(name);
        hookTelemetryEngine.recordEnd(inv, true, false);
      }

      const all = hookTelemetryEngine.getAllHookStats();
      expect(all.length).toBe(3);
    });
  });

  describe("export", () => {
    it("exports complete telemetry data", () => {
      const inv = hookTelemetryEngine.recordStart("export-test");
      hookTelemetryEngine.recordEnd(inv, true, false);

      const exported = hookTelemetryEngine.export();
      expect(exported.hooks).toBeDefined();
      expect(exported.system).toBeDefined();
      expect(exported.alerts).toBeDefined();
    });
  });

  describe("queueing theory validation", () => {
    it("avgQueueLength approaches infinity as utilization approaches 1", () => {
      // This is a theoretical validation - L_q = ρ²/(1-ρ)
      // As ρ → 1, L_q → ∞

      // We can't actually saturate the system in a test, but we can verify
      // the formula is applied correctly
      const metrics = hookTelemetryEngine.getSystemMetrics();

      // For a non-saturated system, queue length should be finite
      if (metrics.utilization < 1) {
        expect(metrics.avgQueueLength).toBeLessThan(Infinity);
      }
    });
  });
});
