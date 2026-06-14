/**
 * IntegrationHealthEngine — HMPI03 per-integration health score + verdict.
 *
 * Pure-core: caller supplies probe results (latency_ms, success_rate, last_seen_at)
 * for each integration; engine produces a 0-100 health score + categorical
 * verdict (healthy / degraded / unhealthy / unknown) per the SRE 3-signal
 * rubric (availability + latency + freshness).
 *
 * @module engines/IntegrationHealthEngine
 */

import { z } from "zod";

export const HealthVerdictSchema = z.enum(["healthy", "degraded", "unhealthy", "unknown"]);
export type HealthVerdict = z.infer<typeof HealthVerdictSchema>;

export const ProbeResultSchema = z.object({
  integration_id: z.string().min(1).max(120),
  success_rate: z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, {}),
  p50_latency_ms: z.number().refine((v) => Number.isFinite(v) && v >= 0, {}),
  p95_latency_ms: z.number().refine((v) => Number.isFinite(v) && v >= 0, {}),
  last_seen_at: z.string().optional(),
});
export type ProbeResult = z.infer<typeof ProbeResultSchema>;

export interface HealthScore {
  integration_id: string;
  score: number;
  verdict: HealthVerdict;
  availability_score: number;
  latency_score: number;
  freshness_score: number;
}

const HEALTHY_THRESHOLD = 80;
const DEGRADED_THRESHOLD = 50;
const LATENCY_BUDGET_MS = 2000;
const FRESHNESS_BUDGET_MS = 5 * 60 * 1000; // 5 minutes

export class IntegrationHealthEngine {
  static validate(p: unknown): ProbeResult { return ProbeResultSchema.parse(p); }

  /** Compute health score 0..100 and verdict from a probe result. */
  static score(probe: ProbeResult, now_at: string = new Date().toISOString()): HealthScore {
    ProbeResultSchema.parse(probe);
    const availability_score = probe.success_rate * 100;
    const latency_score = Math.max(0, 100 * (1 - Math.min(probe.p95_latency_ms / LATENCY_BUDGET_MS, 1)));
    let freshness_score: number;
    if (!probe.last_seen_at) freshness_score = 0;
    else {
      const ageMs = Math.max(0, Date.parse(now_at) - Date.parse(probe.last_seen_at));
      freshness_score = Math.max(0, 100 * (1 - Math.min(ageMs / FRESHNESS_BUDGET_MS, 1)));
    }
    // Weighted: 50% availability, 30% latency, 20% freshness.
    const score = 0.5 * availability_score + 0.3 * latency_score + 0.2 * freshness_score;
    let verdict: HealthVerdict;
    if (!probe.last_seen_at) verdict = "unknown";
    else if (score >= HEALTHY_THRESHOLD) verdict = "healthy";
    else if (score >= DEGRADED_THRESHOLD) verdict = "degraded";
    else verdict = "unhealthy";
    return {
      integration_id: probe.integration_id,
      score, verdict, availability_score, latency_score, freshness_score,
    };
  }

  /** Aggregate scores across a fleet of probes. */
  static aggregate(scores: readonly HealthScore[]): {
    overall_score: number;
    healthy_count: number; degraded_count: number; unhealthy_count: number; unknown_count: number;
  } {
    if (scores.length === 0) {
      return { overall_score: 0, healthy_count: 0, degraded_count: 0, unhealthy_count: 0, unknown_count: 0 };
    }
    const overall_score = scores.reduce((s, x) => s + x.score, 0) / scores.length;
    return {
      overall_score,
      healthy_count:   scores.filter((s) => s.verdict === "healthy").length,
      degraded_count:  scores.filter((s) => s.verdict === "degraded").length,
      unhealthy_count: scores.filter((s) => s.verdict === "unhealthy").length,
      unknown_count:   scores.filter((s) => s.verdict === "unknown").length,
    };
  }

  static renderScore(s: HealthScore): string {
    return `[HEALTH ${s.verdict.toUpperCase()}] ${s.integration_id} score=${s.score.toFixed(1)} (avail=${s.availability_score.toFixed(0)} lat=${s.latency_score.toFixed(0)} fresh=${s.freshness_score.toFixed(0)})`;
  }
}

export const integrationHealthEngine = IntegrationHealthEngine;
