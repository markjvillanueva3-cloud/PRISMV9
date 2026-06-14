// WIRE-EXEMPT: production-readiness benchmark engine (LATHE-PROD-READY-MS0 U-LPR04). Invoked from CI perf scripts and regression gates, not user-facing dispatcher actions — benchmark instrumentation, not runtime feature.
/**
 * MTConnectRoundTripLatencyBenchEngine — LATHE-PROD-READY-MS0 U-LPR04
 *
 * Benchmarks MTConnect round-trip latency for production readiness validation.
 *
 * Performance requirements (Perf B3):
 * - p95 ≤200ms @ 10 machines × 1Hz sustained 5min
 * - p99 ≤350ms @ 50-machine burst
 * - CI regression guard: fail if latency regresses >20% from baseline
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR04
 */

import { z } from "zod";

export const LatencyMeasurementSchema = z.object({
  timestamp: z.string(),
  machine_id: z.string(),
  endpoint: z.enum(["probe", "current", "sample", "assets"]),
  latency_ms: z.number(),
  success: z.boolean(),
  error: z.string().optional(),
  http_status: z.number().optional(),
  payload_bytes: z.number().optional(),
});

export const LatencyStatsSchema = z.object({
  count: z.number(),
  min_ms: z.number(),
  max_ms: z.number(),
  mean_ms: z.number(),
  median_ms: z.number(),
  p50_ms: z.number(),
  p90_ms: z.number(),
  p95_ms: z.number(),
  p99_ms: z.number(),
  std_dev_ms: z.number(),
  success_rate_percent: z.number(),
  total_errors: z.number(),
});

export const BenchmarkResultSchema = z.object({
  benchmark_id: z.string(),
  started_at: z.string(),
  completed_at: z.string(),
  duration_sec: z.number(),
  config: z.object({
    machine_count: z.number(),
    poll_rate_hz: z.number(),
    duration_sec: z.number(),
    endpoints: z.array(z.string()),
    concurrent: z.boolean(),
  }),
  stats: LatencyStatsSchema,
  per_machine_stats: z.record(z.string(), LatencyStatsSchema),
  per_endpoint_stats: z.record(z.string(), LatencyStatsSchema),
  slo_checks: z.object({
    p95_under_200ms: z.boolean(),
    p99_under_350ms: z.boolean(),
    success_rate_above_99: z.boolean(),
    all_passed: z.boolean(),
  }),
  regression_check: z.object({
    baseline_p95_ms: z.number().optional(),
    current_p95_ms: z.number(),
    delta_percent: z.number().optional(),
    regressed: z.boolean(),
    threshold_percent: z.number(),
  }),
  raw_measurements: z.array(LatencyMeasurementSchema).optional(),
});

export type LatencyMeasurement = z.infer<typeof LatencyMeasurementSchema>;
export type LatencyStats = z.infer<typeof LatencyStatsSchema>;
export type BenchmarkResult = z.infer<typeof BenchmarkResultSchema>;

interface BenchmarkConfig {
  machines: Array<{ id: string; agentUrl: string }>;
  pollRateHz: number;
  durationSec: number;
  endpoints?: Array<"probe" | "current" | "sample" | "assets">;
  concurrent?: boolean;
  baselineP95Ms?: number;
  regressionThresholdPercent?: number;
}

export class MTConnectRoundTripLatencyBenchEngine {

  static calculateStats(measurements: LatencyMeasurement[]): LatencyStats {
    if (measurements.length === 0) {
      return {
        count: 0,
        min_ms: 0,
        max_ms: 0,
        mean_ms: 0,
        median_ms: 0,
        p50_ms: 0,
        p90_ms: 0,
        p95_ms: 0,
        p99_ms: 0,
        std_dev_ms: 0,
        success_rate_percent: 0,
        total_errors: 0,
      };
    }

    const latencies = measurements.filter(m => m.success).map(m => m.latency_ms).sort((a, b) => a - b);
    const successCount = latencies.length;
    const errorCount = measurements.length - successCount;

    if (successCount === 0) {
      return {
        count: measurements.length,
        min_ms: 0,
        max_ms: 0,
        mean_ms: 0,
        median_ms: 0,
        p50_ms: 0,
        p90_ms: 0,
        p95_ms: 0,
        p99_ms: 0,
        std_dev_ms: 0,
        success_rate_percent: 0,
        total_errors: errorCount,
      };
    }

    const sum = latencies.reduce((a, b) => a + b, 0);
    const mean = sum / successCount;
    const variance = latencies.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / successCount;
    const stdDev = Math.sqrt(variance);

    const percentile = (arr: number[], p: number): number => {
      const idx = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, Math.min(idx, arr.length - 1))];
    };

    return {
      count: measurements.length,
      min_ms: latencies[0],
      max_ms: latencies[latencies.length - 1],
      mean_ms: Math.round(mean * 100) / 100,
      median_ms: percentile(latencies, 50),
      p50_ms: percentile(latencies, 50),
      p90_ms: percentile(latencies, 90),
      p95_ms: percentile(latencies, 95),
      p99_ms: percentile(latencies, 99),
      std_dev_ms: Math.round(stdDev * 100) / 100,
      success_rate_percent: Math.round((successCount / measurements.length) * 10000) / 100,
      total_errors: errorCount,
    };
  }

  static async measureLatency(
    machineId: string,
    agentUrl: string,
    endpoint: "probe" | "current" | "sample" | "assets"
  ): Promise<LatencyMeasurement> {
    const timestamp = new Date().toISOString();
    const url = `${agentUrl}/${endpoint}`;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/xml" },
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();
      const latency = endTime - startTime;

      const body = await response.text();

      return {
        timestamp,
        machine_id: machineId,
        endpoint,
        latency_ms: Math.round(latency * 100) / 100,
        success: response.ok,
        http_status: response.status,
        payload_bytes: body.length,
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        timestamp,
        machine_id: machineId,
        endpoint,
        latency_ms: Math.round((endTime - startTime) * 100) / 100,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const benchmarkId = `bench-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();
    const endpoints = config.endpoints ?? ["current"];
    const measurements: LatencyMeasurement[] = [];

    const totalPolls = config.pollRateHz * config.durationSec;
    const pollIntervalMs = 1000 / config.pollRateHz;

    for (let poll = 0; poll < totalPolls; poll++) {
      const pollStart = performance.now();

      if (config.concurrent) {
        const promises = config.machines.flatMap(machine =>
          endpoints.map(endpoint =>
            this.measureLatency(machine.id, machine.agentUrl, endpoint)
          )
        );
        const results = await Promise.all(promises);
        measurements.push(...results);
      } else {
        for (const machine of config.machines) {
          for (const endpoint of endpoints) {
            const result = await this.measureLatency(machine.id, machine.agentUrl, endpoint);
            measurements.push(result);
          }
        }
      }

      const elapsed = performance.now() - pollStart;
      const sleepTime = Math.max(0, pollIntervalMs - elapsed);
      if (sleepTime > 0 && poll < totalPolls - 1) {
        await new Promise(resolve => setTimeout(resolve, sleepTime));
      }
    }

    const completedAt = new Date().toISOString();
    const stats = this.calculateStats(measurements);

    const perMachineStats: Record<string, LatencyStats> = {};
    for (const machine of config.machines) {
      const machineMeasurements = measurements.filter(m => m.machine_id === machine.id);
      perMachineStats[machine.id] = this.calculateStats(machineMeasurements);
    }

    const perEndpointStats: Record<string, LatencyStats> = {};
    for (const endpoint of endpoints) {
      const endpointMeasurements = measurements.filter(m => m.endpoint === endpoint);
      perEndpointStats[endpoint] = this.calculateStats(endpointMeasurements);
    }

    const p95Under200 = stats.p95_ms <= 200;
    const p99Under350 = stats.p99_ms <= 350;
    const successAbove99 = stats.success_rate_percent >= 99;

    const regressionThreshold = config.regressionThresholdPercent ?? 20;
    let deltaPercent: number | undefined;
    let regressed = false;

    if (config.baselineP95Ms !== undefined && config.baselineP95Ms > 0) {
      deltaPercent = ((stats.p95_ms - config.baselineP95Ms) / config.baselineP95Ms) * 100;
      regressed = deltaPercent > regressionThreshold;
    }

    return {
      benchmark_id: benchmarkId,
      started_at: startedAt,
      completed_at: completedAt,
      duration_sec: config.durationSec,
      config: {
        machine_count: config.machines.length,
        poll_rate_hz: config.pollRateHz,
        duration_sec: config.durationSec,
        endpoints,
        concurrent: config.concurrent ?? false,
      },
      stats,
      per_machine_stats: perMachineStats,
      per_endpoint_stats: perEndpointStats,
      slo_checks: {
        p95_under_200ms: p95Under200,
        p99_under_350ms: p99Under350,
        success_rate_above_99: successAbove99,
        all_passed: p95Under200 && p99Under350 && successAbove99,
      },
      regression_check: {
        baseline_p95_ms: config.baselineP95Ms,
        current_p95_ms: stats.p95_ms,
        delta_percent: deltaPercent !== undefined ? Math.round(deltaPercent * 100) / 100 : undefined,
        regressed,
        threshold_percent: regressionThreshold,
      },
    };
  }

  static generateMockMeasurements(
    machineCount: number,
    samplesPerMachine: number,
    baseLatencyMs: number = 50,
    jitterMs: number = 30
  ): LatencyMeasurement[] {
    const measurements: LatencyMeasurement[] = [];
    const endpoints: Array<"probe" | "current" | "sample" | "assets"> = ["current"];

    for (let m = 0; m < machineCount; m++) {
      for (let s = 0; s < samplesPerMachine; s++) {
        const latency = baseLatencyMs + (Math.random() - 0.5) * 2 * jitterMs;
        const success = Math.random() > 0.005;

        measurements.push({
          timestamp: new Date(Date.now() - (samplesPerMachine - s) * 1000).toISOString(),
          machine_id: `machine-${m + 1}`,
          endpoint: endpoints[0],
          latency_ms: Math.round(Math.max(5, latency) * 100) / 100,
          success,
          http_status: success ? 200 : undefined,
          payload_bytes: success ? Math.floor(Math.random() * 5000) + 1000 : undefined,
          error: success ? undefined : "Connection timeout",
        });
      }
    }

    return measurements;
  }

  static runSyntheticBenchmark(
    machineCount: number,
    pollRateHz: number,
    durationSec: number,
    baseLatencyMs: number = 50,
    jitterMs: number = 30,
    baselineP95Ms?: number
  ): BenchmarkResult {
    const samplesPerMachine = pollRateHz * durationSec;
    const measurements = this.generateMockMeasurements(
      machineCount,
      samplesPerMachine,
      baseLatencyMs,
      jitterMs
    );

    const stats = this.calculateStats(measurements);

    const perMachineStats: Record<string, LatencyStats> = {};
    for (let m = 0; m < machineCount; m++) {
      const machineId = `machine-${m + 1}`;
      const machineMeasurements = measurements.filter(x => x.machine_id === machineId);
      perMachineStats[machineId] = this.calculateStats(machineMeasurements);
    }

    const p95Under200 = stats.p95_ms <= 200;
    const p99Under350 = stats.p99_ms <= 350;
    const successAbove99 = stats.success_rate_percent >= 99;

    let deltaPercent: number | undefined;
    let regressed = false;
    const regressionThreshold = 20;

    if (baselineP95Ms !== undefined && baselineP95Ms > 0) {
      deltaPercent = ((stats.p95_ms - baselineP95Ms) / baselineP95Ms) * 100;
      regressed = deltaPercent > regressionThreshold;
    }

    return {
      benchmark_id: `synth-${Date.now()}`,
      started_at: new Date(Date.now() - durationSec * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      duration_sec: durationSec,
      config: {
        machine_count: machineCount,
        poll_rate_hz: pollRateHz,
        duration_sec: durationSec,
        endpoints: ["current"],
        concurrent: true,
      },
      stats,
      per_machine_stats: perMachineStats,
      per_endpoint_stats: { current: stats },
      slo_checks: {
        p95_under_200ms: p95Under200,
        p99_under_350ms: p99Under350,
        success_rate_above_99: successAbove99,
        all_passed: p95Under200 && p99Under350 && successAbove99,
      },
      regression_check: {
        baseline_p95_ms: baselineP95Ms,
        current_p95_ms: stats.p95_ms,
        delta_percent: deltaPercent !== undefined ? Math.round(deltaPercent * 100) / 100 : undefined,
        regressed,
        threshold_percent: regressionThreshold,
      },
    };
  }
}

export const mtConnectRoundTripLatencyBenchEngine = MTConnectRoundTripLatencyBenchEngine;
