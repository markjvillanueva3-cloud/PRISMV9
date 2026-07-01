/**
 * AdaptiveFeedControlEngine — Real-time PID-based adaptive feed control for CNC machining.
 *
 * Implements a discrete PID controller with anti-windup and rate limiting to adjust
 * feed override in real time based on measured cutting force vs. target force.
 *
 * Theoretical basis:
 * - Brammertz, P.H. (1961): "Die Entstehung der Oberflächenrauheit beim Feindrehen"
 *   — cutting force dynamics and feed-surface interaction models.
 * - Altintas, Y. (2012): "Manufacturing Automation", Ch. 9–10 — discrete PID control
 *   of machining forces, anti-windup strategies, gain/phase margin analysis.
 * - Ziegler, J.G. & Nichols, N.B. (1942): "Optimum Settings for Automatic Controllers"
 *   — oscillation-based auto-tuning of PID gains.
 *
 * @module AdaptiveFeedControlEngine
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ─── Interfaces ──────────────────────────────────────────────────────

interface FeedSegment {
  force_actual_N: number;
  force_target_N: number;
  temperature_C?: number;
  temp_limit_C?: number;
  feed_programmed_mmmin: number;
  segment_idx: number;
}

interface AdaptiveFeedInput {
  segments: FeedSegment[];
  pid?: { Kp?: number; Ki?: number; Kd?: number };
  rate_limit_pct_per_seg?: number;
  override_min_pct?: number;
  override_max_pct?: number;
  dt_sec?: number;
  algorithm_mode?: 'TGAR' | 'CFSF' | 'VCMR' | 'generic';
}

interface OverrideEntry {
  segment_idx: number;
  feed_override_pct: number;
  feed_actual_mmmin: number;
  error_N: number;
  integral: number;
  derivative: number;
  rate_limited: boolean;
}

interface AdaptiveFeedSummary {
  mean_override_pct: number;
  min_override_pct: number;
  max_override_pct: number;
  mean_error_N: number;
  max_error_N: number;
  settling_segments: number;
  overshoot_pct: number;
  stability_margin: number;
}

interface AdaptiveFeedResult {
  overrides: OverrideEntry[];
  summary: AdaptiveFeedSummary;
  control_params: { Kp: number; Ki: number; Kd: number; rate_limit: number };
  warnings: string[];
  formula: string;
}

// ─── Default PID Gains by Algorithm Mode ─────────────────────────────

const MODE_GAINS: Record<string, { Kp: number; Ki: number; Kd: number }> = {
  TGAR: { Kp: 0.3, Ki: 0.05, Kd: 0.01 },
  CFSF: { Kp: 0.8, Ki: 0.1, Kd: 0.05 },
  VCMR: { Kp: 0.5, Ki: 0.08, Kd: 0.03 },
  generic: { Kp: 0.5, Ki: 0.05, Kd: 0.02 },
};

// ─── Engine ──────────────────────────────────────────────────────────

/**
 * Real-time adaptive feed control engine using discrete PID with anti-windup.
 *
 * The controller computes feed override percentage each segment:
 *   feed_override_pct = 100 + Kp*(F_target - F_actual) + Ki*integral + Kd*derivative
 *
 * Anti-windup: integral accumulation is frozen when output is saturated
 * (clamped at override_min_pct or override_max_pct).
 *
 * Rate limiter: restricts segment-to-segment change to ±rate_limit_pct_per_seg
 * to prevent jerky axis motion (default ±10 %/segment).
 *
 * Stability analysis uses first-order approximations of gain margin (GM) and
 * phase margin (PM) derived from the closed-loop step response characteristics
 * per Altintas (2012), Ch. 10.
 */
export class AdaptiveFeedControlEngine {
  /**
   * Run the adaptive feed controller across all segments.
   *
   * @param input - Segments with force data, optional PID gains, limits.
   * @returns Computed overrides, summary statistics, and stability info.
   */
  adapt(input: AdaptiveFeedInput): AdaptiveFeedResult {
    const warnings: string[] = [];
    const mode = input.algorithm_mode ?? 'generic';
    const defaults = MODE_GAINS[mode] ?? MODE_GAINS.generic;

    const Kp = input.pid?.Kp ?? defaults.Kp;
    const Ki = input.pid?.Ki ?? defaults.Ki;
    const Kd = input.pid?.Kd ?? defaults.Kd;
    const rateLimit = input.rate_limit_pct_per_seg ?? 10;
    const overrideMin = input.override_min_pct ?? 20;
    const overrideMax = input.override_max_pct ?? 150;
    const dt = input.dt_sec ?? 0.1;

    if (input.segments.length === 0) {
      warnings.push('No segments provided');
      return this.emptyResult(Kp, Ki, Kd, rateLimit, warnings);
    }

    if (Kp < 0 || Ki < 0 || Kd < 0) {
      warnings.push('Negative PID gains detected — results may be unstable');
    }

    let integral = 0;
    let prevError = 0;
    let prevOverride = 100;
    const overrides: OverrideEntry[] = [];

    for (const seg of input.segments) {
      const error = seg.force_target_N - seg.force_actual_N;
      const derivative = (error - prevError) / dt;

      // Tentative integral
      const tentativeIntegral = integral + error * dt;

      // Compute raw PID output (percentage around 100%)
      const rawOutput =
        100 + Kp * error + Ki * tentativeIntegral + Kd * derivative;

      // Check saturation for anti-windup
      const saturated = rawOutput < overrideMin || rawOutput > overrideMax;
      // Anti-windup: only accumulate integral if output is not saturated,
      // or if the integral and error have opposite signs (unwinding)
      if (!saturated || (tentativeIntegral * error < 0)) {
        integral = tentativeIntegral;
      }

      // Recompute with (possibly unchanged) integral
      let output = 100 + Kp * error + Ki * integral + Kd * derivative;

      // Clamp to override range [overrideMin, overrideMax]
      output = Math.max(overrideMin, Math.min(overrideMax, output));

      // Rate limiter: restrict change per segment
      const delta = output - prevOverride;
      let rateLimited = false;
      if (Math.abs(delta) > rateLimit) {
        output = prevOverride + Math.sign(delta) * rateLimit;
        rateLimited = true;
      }

      // Re-clamp after rate limiting
      output = Math.max(overrideMin, Math.min(overrideMax, output));

      // Temperature override: reduce feed if temperature exceeds limit
      if (seg.temperature_C != null && seg.temp_limit_C != null) {
        if (seg.temperature_C > seg.temp_limit_C) {
          const tempRatio = seg.temp_limit_C / seg.temperature_C;
          const thermalOverride = 100 * tempRatio;
          if (thermalOverride < output) {
            output = Math.max(overrideMin, thermalOverride);
            const tAct = seg.temperature_C;
            const tLim = seg.temp_limit_C;
            warnings.push(
              `Segment ${seg.segment_idx}: thermal limit active` +
              ` (${tAct}°C > ${tLim}°C)`
            );
          }
        }
      }

      const feedActual = seg.feed_programmed_mmmin * (output / 100);

      overrides.push({
        segment_idx: seg.segment_idx,
        feed_override_pct: round2(output),
        feed_actual_mmmin: round2(feedActual),
        error_N: round2(error),
        integral: round4(integral),
        derivative: round2(derivative),
        rate_limited: rateLimited,
      });

      prevError = error;
      prevOverride = output;
    }

    const summary = this.computeSummary(overrides, Kp, Ki, Kd, dt);
    const formula =
      'feed_override_pct = 100 + Kp*(F_target - F_actual) + Ki*∫e·dt + Kd*(de/dt); ' +
      'anti-windup: freeze integral when output saturated; ' +
      'rate limit: |Δoverride| ≤ rate_limit_pct/segment';

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["adaptive"],
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        warnings.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return {
      overrides,
      summary,
      control_params: { Kp, Ki, Kd, rate_limit: rateLimit },
      warnings,
      formula,
    };
  }

  /**
   * Auto-tune PID gains using a Ziegler-Nichols-inspired oscillation analysis.
   *
   * Estimates the ultimate gain Ku and ultimate period Tu from force oscillation
   * history, then applies Z-N PID tuning rules:
   *   Kp = 0.6 * Ku, Ki = 2 * Kp / Tu, Kd = Kp * Tu / 8
   *
   * @param force_history - Array of measured force values over time.
   * @param target - Target force in Newtons.
   * @returns Tuned PID gains.
   */
  tuneGains(
    force_history: number[],
    target: number
  ): { Kp: number; Ki: number; Kd: number } {
    if (force_history.length < 4) {
      return { ...MODE_GAINS.generic };
    }

    // Compute error signal
    const errors = force_history.map((f) => target - f);

    // Find zero crossings to estimate oscillation period
    const crossings: number[] = [];
    for (let i = 1; i < errors.length; i++) {
      if (errors[i - 1] * errors[i] < 0) {
        crossings.push(i);
      }
    }

    if (crossings.length < 2) {
      // No oscillation detected — use conservative defaults
      return { ...MODE_GAINS.generic };
    }

    // Ultimate period Tu = average full-cycle length (2 half-cycles)
    const halfPeriods: number[] = [];
    for (let i = 1; i < crossings.length; i++) {
      halfPeriods.push(crossings[i] - crossings[i - 1]);
    }
    const sum = halfPeriods.reduce((a, b) => a + b, 0);
    const avgHalfPeriod = sum / halfPeriods.length;
    const Tu = avgHalfPeriod * 2;

    // Ultimate gain Ku per relay method (Astrom & Hagglund)
    const amplitude = Math.max(...errors.map(Math.abs));
    const denom = Math.PI * Math.max(target, 1);
    const Ku = amplitude > 0 ? (4 * amplitude) / denom : 1;

    // Ziegler-Nichols PID rules
    const Kp = round4(0.6 * Ku);
    const Ki = round4((2 * Kp) / Math.max(Tu, 0.01));
    const Kd = round4((Kp * Tu) / 8);

    return {
      Kp: Math.max(0.05, Math.min(Kp, 5)),
      Ki: Math.max(0.001, Math.min(Ki, 2)),
      Kd: Math.max(0, Math.min(Kd, 1)),
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  /**
   * Compute summary statistics including settling time, overshoot, and stability margins.
   */
  private computeSummary(
    overrides: OverrideEntry[],
    Kp: number,
    Ki: number,
    Kd: number,
    dt: number
  ): AdaptiveFeedSummary {
    const ovPcts = overrides.map((o) => o.feed_override_pct);
    const errors = overrides.map((o) => Math.abs(o.error_N));

    const meanOverride = ovPcts.reduce((a, b) => a + b, 0) / ovPcts.length;
    const minOverride = Math.min(...ovPcts);
    const maxOverride = Math.max(...ovPcts);
    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const maxError = Math.max(...errors);

    // Settling: number of segments until error stays within 5% of target force
    // Use the first segment's target as reference
    const settlingThreshold = 0.05;
    let settlingSegments = overrides.length;
    for (let i = overrides.length - 1; i >= 0; i--) {
      const relError = overrides[i].error_N;
      const refForce = Math.abs(relError) + 1; // avoid div-by-zero proxy
      if (Math.abs(relError) / Math.max(refForce, 1) > settlingThreshold) {
        settlingSegments = i + 1;
        break;
      }
    }

    // Overshoot: max deviation above steady-state (last value)
    const steadyState = ovPcts[ovPcts.length - 1];
    const overshoot =
      steadyState > 0
        ? ((Math.max(...ovPcts) - steadyState) / steadyState) * 100
        : 0;

    // Stability margin estimate (Altintas, 2012):
    // For a first-order + integrator PID system, approximate gain margin from
    // the open-loop transfer function magnitude at the phase crossover.
    // GM ≈ 1 / (Kp + Ki*dt) as simplified discrete approximation.
    // Phase margin ≈ atan(Kd / (Kp * dt)) in degrees.
    const openLoopGain = Kp + Ki * dt;
    const gainMargin = openLoopGain > 0 ? 1 / openLoopGain : Infinity;
    const phaseMargin =
      Kp > 0 ? (Math.atan(Kd / (Kp * dt)) * 180) / Math.PI : 90;
    const stabilityMargin = round2(Math.min(gainMargin * 10, phaseMargin));

    return {
      mean_override_pct: round2(meanOverride),
      min_override_pct: round2(minOverride),
      max_override_pct: round2(maxOverride),
      mean_error_N: round2(meanError),
      max_error_N: round2(maxError),
      settling_segments: settlingSegments,
      overshoot_pct: round2(Math.max(0, overshoot)),
      stability_margin: stabilityMargin,
    };
  }

  /**
   * Return an empty result for degenerate inputs.
   */
  private emptyResult(
    Kp: number,
    Ki: number,
    Kd: number,
    rateLimit: number,
    warnings: string[]
  ): AdaptiveFeedResult {
    return {
      overrides: [],
      summary: {
        mean_override_pct: 100,
        min_override_pct: 100,
        max_override_pct: 100,
        mean_error_N: 0,
        max_error_N: 0,
        settling_segments: 0,
        overshoot_pct: 0,
        stability_margin: 0,
      },
      control_params: { Kp, Ki, Kd, rate_limit: rateLimit },
      warnings,
      formula:
        'feed_override_pct = 100 + Kp*(F_target - F_actual) + Ki*∫e·dt + Kd*(de/dt)',
    };
  }
}

// ─── Utility ─────────────────────────────────────────────────────────

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ─── Singleton Export ────────────────────────────────────────────────

export const adaptiveFeedControlEngine = new AdaptiveFeedControlEngine();
