/**
 * MTConnectRoundTripLatencyBenchEngine — LATHE-PROD-READY-MS0 U-LPR04
 *
 * Tests latency benchmarking and SLO validation.
 */

import { describe, it, expect } from "vitest";
import {
  MTConnectRoundTripLatencyBenchEngine,
  LatencyMeasurement,
} from "../engines/MTConnectRoundTripLatencyBenchEngine.js";

describe("MTConnectRoundTripLatencyBenchEngine", () => {
  describe("calculateStats", () => {
    it("calculates stats for valid measurements", () => {
      const measurements: LatencyMeasurement[] = [
        { timestamp: "2026-04-19T00:00:00Z", machine_id: "m1", endpoint: "current", latency_ms: 50, success: true },
        { timestamp: "2026-04-19T00:00:01Z", machine_id: "m1", endpoint: "current", latency_ms: 60, success: true },
        { timestamp: "2026-04-19T00:00:02Z", machine_id: "m1", endpoint: "current", latency_ms: 70, success: true },
        { timestamp: "2026-04-19T00:00:03Z", machine_id: "m1", endpoint: "current", latency_ms: 80, success: true },
        { timestamp: "2026-04-19T00:00:04Z", machine_id: "m1", endpoint: "current", latency_ms: 100, success: true },
      ];
      const stats = MTConnectRoundTripLatencyBenchEngine.calculateStats(measurements);
      expect(stats.count).toBe(5);
      expect(stats.min_ms).toBe(50);
      expect(stats.max_ms).toBe(100);
      expect(stats.mean_ms).toBeCloseTo(72, 0);
      expect(stats.success_rate_percent).toBe(100);
    });

    it("handles empty measurements", () => {
      const stats = MTConnectRoundTripLatencyBenchEngine.calculateStats([]);
      expect(stats.count).toBe(0);
      expect(stats.success_rate_percent).toBe(0);
    });

    it("calculates success rate with failures", () => {
      const measurements: LatencyMeasurement[] = [
        { timestamp: "2026-04-19T00:00:00Z", machine_id: "m1", endpoint: "current", latency_ms: 50, success: true },
        { timestamp: "2026-04-19T00:00:01Z", machine_id: "m1", endpoint: "current", latency_ms: 5000, success: false, error: "timeout" },
      ];
      const stats = MTConnectRoundTripLatencyBenchEngine.calculateStats(measurements);
      expect(stats.count).toBe(2);
      expect(stats.success_rate_percent).toBe(50);
      expect(stats.total_errors).toBe(1);
    });

    it("calculates percentiles correctly", () => {
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const measurements: LatencyMeasurement[] = latencies.map((l, i) => ({
        timestamp: `2026-04-19T00:00:0${i}Z`,
        machine_id: "m1",
        endpoint: "current" as const,
        latency_ms: l,
        success: true,
      }));
      const stats = MTConnectRoundTripLatencyBenchEngine.calculateStats(measurements);
      expect(stats.p50_ms).toBe(50);
      expect(stats.p90_ms).toBe(90);
      expect(stats.p95_ms).toBe(100);
      expect(stats.p99_ms).toBe(100);
    });

    it("calculates standard deviation", () => {
      const measurements: LatencyMeasurement[] = [
        { timestamp: "2026-04-19T00:00:00Z", machine_id: "m1", endpoint: "current", latency_ms: 100, success: true },
        { timestamp: "2026-04-19T00:00:01Z", machine_id: "m1", endpoint: "current", latency_ms: 100, success: true },
        { timestamp: "2026-04-19T00:00:02Z", machine_id: "m1", endpoint: "current", latency_ms: 100, success: true },
      ];
      const stats = MTConnectRoundTripLatencyBenchEngine.calculateStats(measurements);
      expect(stats.std_dev_ms).toBe(0);
    });
  });

  describe("generateMockMeasurements", () => {
    it("generates correct number of measurements", () => {
      const measurements = MTConnectRoundTripLatencyBenchEngine.generateMockMeasurements(
        10, 300, 50, 30
      );
      expect(measurements.length).toBe(3000);
    });

    it("generates measurements for all machines", () => {
      const measurements = MTConnectRoundTripLatencyBenchEngine.generateMockMeasurements(
        5, 10, 50, 30
      );
      const machines = new Set(measurements.map(m => m.machine_id));
      expect(machines.size).toBe(5);
    });

    it("generates latencies within expected range", () => {
      const measurements = MTConnectRoundTripLatencyBenchEngine.generateMockMeasurements(
        1, 100, 50, 20
      );
      for (const m of measurements.filter(x => x.success)) {
        expect(m.latency_ms).toBeGreaterThanOrEqual(5);
        expect(m.latency_ms).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("runSyntheticBenchmark", () => {
    it("runs 10-machine 1Hz 5min benchmark", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        10, 1, 300, 80, 40
      );
      expect(result.config.machine_count).toBe(10);
      expect(result.config.poll_rate_hz).toBe(1);
      expect(result.config.duration_sec).toBe(300);
      expect(result.stats.count).toBe(3000);
    });

    it("validates SLO p95 ≤200ms", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        10, 1, 60, 80, 40
      );
      expect(result.slo_checks.p95_under_200ms).toBe(true);
    });

    it("validates SLO p99 ≤350ms", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        10, 1, 60, 80, 40
      );
      expect(result.slo_checks.p99_under_350ms).toBe(true);
    });

    it("fails SLO when latency too high", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        10, 1, 60, 300, 100
      );
      expect(result.slo_checks.p95_under_200ms).toBe(false);
    });

    it("detects regression from baseline", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        10, 1, 60, 150, 30, 80
      );
      expect(result.regression_check.regressed).toBe(true);
      expect(result.regression_check.delta_percent).toBeGreaterThan(20);
    });

    it("passes when within regression threshold", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        10, 1, 60, 50, 10, 60
      );
      expect(result.regression_check.regressed).toBe(false);
    });

    it("generates per-machine stats", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        5, 1, 10, 50, 20
      );
      expect(Object.keys(result.per_machine_stats).length).toBe(5);
      for (const machineId of Object.keys(result.per_machine_stats)) {
        expect(result.per_machine_stats[machineId].count).toBeGreaterThan(0);
      }
    });
  });

  describe("SLO validation scenarios", () => {
    it("passes all SLOs for low-latency scenario", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        10, 1, 60, 50, 20
      );
      expect(result.slo_checks.all_passed).toBe(true);
    });

    it("passes 50-machine burst scenario", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        50, 1, 10, 100, 50
      );
      expect(result.config.machine_count).toBe(50);
      expect(result.slo_checks.p99_under_350ms).toBe(true);
    });

    it("calculates success rate above 99%", () => {
      const result = MTConnectRoundTripLatencyBenchEngine.runSyntheticBenchmark(
        10, 1, 60, 50, 20
      );
      expect(result.stats.success_rate_percent).toBeGreaterThan(98);
    });
  });
});
