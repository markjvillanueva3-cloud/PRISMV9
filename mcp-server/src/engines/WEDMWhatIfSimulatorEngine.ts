/**
 * WEDMWhatIfSimulatorEngine — WEDM AGI Phase 2 / U-P2-02
 *
 * Answers "what if I change parameter X by ΔX?" queries against the WEDM
 * causal graph. Propagates a fractional change through the polarity-and-
 * confidence-weighted graph and reports predicted direction + magnitude
 * for every reachable outcome, plus a plain-English explanation.
 *
 * Delegates graph traversal to WEDMProcessCausalityEngine (which in turn
 * delegates to the generic CausalReasoningEngine) — no duplicate math.
 *
 * Exit gate (P2-MS1):
 *   - Single query returns in <100 ms (verified in tests).
 *   - Predicts direction correctly on the 7 canonical chains.
 */

import {
  wedmProcessCausalityEngine,
  WEDMProcessCausalityEngine,
} from "./WEDMProcessCausalityEngine.js";

// ────────────────────────── Types ──────────────────────────

export interface WhatIfInput {
  /** Parameter to perturb (e.g. "peak_current"). */
  variable: string;
  /** Relative change, e.g. +0.1 for +10%, -0.2 for -20%. */
  delta_fraction: number;
  /** Maximum BFS depth (default 3). */
  max_hops?: number;
  /**
   * Minimum effective-confidence for an outcome to appear in results.
   * Filters noise from multi-hop chains with weak links. Default 0.1.
   */
  min_effect_confidence?: number;
}

export interface OutcomePrediction {
  target: string;
  /** "up" | "down" | "ambiguous" — direction of predicted change. */
  direction: "up" | "down" | "ambiguous";
  /** Signed predicted fractional change on target (clipped to [-1,1]). */
  predicted_delta: number;
  /** Confidence of the direction call ∈ [0,1]. */
  confidence: number;
  /** BFS hops from source → target. */
  hops: number;
  /** Path of intermediate nodes. */
  via: string[];
}

export interface WhatIfResult {
  variable: string;
  delta_fraction: number;
  predictions: OutcomePrediction[];
  explanation: string[];
  elapsed_ms: number;
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMWhatIfSimulatorEngine {
  constructor(
    private readonly causality: WEDMProcessCausalityEngine = wedmProcessCausalityEngine,
  ) {}

  /**
   * Simulate a fractional change on `variable` and return predicted
   * effects on every reachable outcome.
   */
  simulate(input: WhatIfInput): WhatIfResult {
    this.validate(input);
    const maxHops = input.max_hops ?? 3;
    const minConf = input.min_effect_confidence ?? 0.1;
    const t0 = performance.now();

    const impact = this.causality.interventionOn(input.variable, maxHops);

    const predictions: OutcomePrediction[] = [];
    for (const p of impact.affects) {
      if (p.confidence < minConf) continue;
      const sign =
        p.polarity === "positive"
          ? 1
          : p.polarity === "negative"
            ? -1
            : 0;
      const direction =
        p.polarity === "positive"
          ? input.delta_fraction >= 0
            ? "up"
            : "down"
          : p.polarity === "negative"
            ? input.delta_fraction >= 0
              ? "down"
              : "up"
            : "ambiguous";
      // Simple linear propagation: predicted ≈ sign * path_confidence * delta.
      const predicted = sign * p.confidence * input.delta_fraction;
      predictions.push({
        target: p.target,
        direction,
        predicted_delta: clip(predicted, -1, 1),
        confidence: p.confidence,
        hops: p.hops,
        via: [...p.via],
      });
    }

    predictions.sort(
      (a, b) => Math.abs(b.predicted_delta) - Math.abs(a.predicted_delta),
    );

    const explanation = this.buildExplanation(input, predictions);
    const elapsed_ms = performance.now() - t0;

    return {
      variable: input.variable,
      delta_fraction: input.delta_fraction,
      predictions,
      explanation,
      elapsed_ms,
    };
  }

  /**
   * Ask the classic counterfactual directly: "if I change X by Δ, what
   * happens to Y?". Returns null if Y is not reachable from X.
   */
  askAboutOutcome(
    input: WhatIfInput,
    outcome: string,
  ): OutcomePrediction | null {
    const r = this.simulate(input);
    return r.predictions.find((p) => p.target === outcome) ?? null;
  }

  // ─── internals ────────────────────────────────────────────

  private validate(input: WhatIfInput): void {
    if (!input.variable || input.variable.trim() === "") {
      throw new Error("variable required");
    }
    if (!Number.isFinite(input.delta_fraction)) {
      throw new Error("delta_fraction must be finite");
    }
    if (Math.abs(input.delta_fraction) > 1) {
      throw new Error(
        "delta_fraction must be in [-1, 1] (fractional change, not absolute)",
      );
    }
  }

  private buildExplanation(
    input: WhatIfInput,
    predictions: OutcomePrediction[],
  ): string[] {
    const pct = (input.delta_fraction * 100).toFixed(1);
    const verb = input.delta_fraction >= 0 ? "Increasing" : "Decreasing";
    const magnitude = Math.abs(input.delta_fraction * 100).toFixed(1);
    const lines: string[] = [
      `${verb} ${input.variable} by ${magnitude}% (Δ = ${pct}%).`,
    ];
    const top = predictions.slice(0, 5);
    for (const p of top) {
      const sign = p.predicted_delta >= 0 ? "+" : "";
      const pctTarget = (p.predicted_delta * 100).toFixed(1);
      const via =
        p.via.length > 1 ? ` (via ${p.via.slice(0, -1).join(" → ")})` : "";
      lines.push(
        `  ${p.target}: ${p.direction.toUpperCase()} (${sign}${pctTarget}%, confidence ${(p.confidence * 100).toFixed(0)}%)${via}`,
      );
    }
    if (predictions.length === 0) {
      lines.push("  No outcomes reached within hop limit / confidence floor.");
    }
    return lines;
  }
}

function clip(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export const wedmWhatIfSimulatorEngine = new WEDMWhatIfSimulatorEngine();
