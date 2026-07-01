/**
 * TransportHealthProbeEngine — HMPI07 MCP transport health probing.
 *
 * Pure-core probe-result analyzer over a sequence of (timestamp, latency_ms,
 * ok) samples per transport.  Reports rolling p50/p95 latency, error rate,
 * connection-flap count, and overall transport verdict.
 *
 * @module engines/TransportHealthProbeEngine
 */

import { z } from "zod";

export const ProbeSampleSchema = z.object({
  at: z.string().min(1),
  latency_ms: z.number().refine((v) => Number.isFinite(v) && v >= 0, {}),
  ok: z.boolean(),
});
export type ProbeSample = z.infer<typeof ProbeSampleSchema>;

export interface TransportHealth {
  transport_id: string;
  sample_count: number;
  ok_count: number;
  error_count: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  flap_count: number;
  verdict: "healthy" | "degraded" | "unhealthy";
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

export class TransportHealthProbeEngine {
  static validateSample(s: unknown): ProbeSample { return ProbeSampleSchema.parse(s); }

  /** Analyze a fixed window of probe samples. */
  static analyze(transport_id: string, samples: readonly ProbeSample[]): TransportHealth {
    if (!transport_id) throw new Error("TransportHealthProbe.analyze: transport_id required");
    if (!Array.isArray(samples)) throw new Error("TransportHealthProbe.analyze: samples must be an array");
    for (const s of samples) ProbeSampleSchema.parse(s);
    if (samples.length === 0) {
      return {
        transport_id, sample_count: 0, ok_count: 0, error_count: 0,
        p50_latency_ms: 0, p95_latency_ms: 0, flap_count: 0, verdict: "unhealthy",
      };
    }
    const ok_count = samples.filter((s) => s.ok).length;
    const error_count = samples.length - ok_count;
    const latencies = samples.map((s) => s.latency_ms).sort((a, b) => a - b);
    const p50 = percentile(latencies, 0.5);
    const p95 = percentile(latencies, 0.95);
    // Flap = ok-state transitions (ok→error or error→ok).
    let flap_count = 0;
    for (let i = 1; i < samples.length; i += 1) {
      if (samples[i].ok !== samples[i - 1].ok) flap_count += 1;
    }
    const error_rate = error_count / samples.length;
    let verdict: TransportHealth["verdict"];
    if (error_rate >= 0.5) verdict = "unhealthy";
    else if (error_rate >= 0.1 || flap_count >= 5 || p95 > 5000) verdict = "degraded";
    else verdict = "healthy";
    return { transport_id, sample_count: samples.length, ok_count, error_count, p50_latency_ms: p50, p95_latency_ms: p95, flap_count, verdict };
  }

  static renderHealth(h: TransportHealth): string {
    return `[TRANSPORT ${h.verdict.toUpperCase()}] ${h.transport_id} samples=${h.sample_count} ok=${h.ok_count} err=${h.error_count} p50=${h.p50_latency_ms}ms p95=${h.p95_latency_ms}ms flaps=${h.flap_count}`;
  }
}

export const transportHealthProbeEngine = TransportHealthProbeEngine;
