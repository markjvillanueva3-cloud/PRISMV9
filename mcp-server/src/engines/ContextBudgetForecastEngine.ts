/**
 * ContextBudgetForecastEngine — U-FORE-09 (PSAU-FORESIGHT)
 * =========================================================
 *
 * Given the current conversation token usage + a sequence of planned
 * build steps (each with `estTokens`), predict whether the session is
 * about to blow past its context window and recommend a pre-emptive
 * /compact or /handoff point.
 *
 * Consumed by pretool-context-forecast.mjs (PreToolUse hook) and the
 * /plan-build skill — both want a short answer to "will this session
 * survive the next N steps?"
 */

import type { AtomicStep } from "./AtomicStepDecomposerEngine.js";

export type ModelTier = "opus_4_7_1m" | "opus_4_6" | "sonnet_4_6" | "opus_4_5" | "haiku_4_5" | "unknown";

export interface ContextBudgetForecastInput {
  currentTokens: number;
  remainingSteps: AtomicStep[];
  modelTier?: ModelTier;
  /** Override the safety margin as fraction of the window (default 0.15). */
  safetyMarginPct?: number;
  /** Override the per-step overhead (default 800 tokens/step for tool-use IO). */
  perStepOverhead?: number;
}

export interface ContextBudgetForecast {
  willOverflow: boolean;
  recommendCompactAfterStep: number | null; // null = no pre-emptive compact needed
  estimatedFinalTokens: number;
  tokensAvailableNow: number;
  tokensAvailableAtCompletion: number;
  utilizationPct: number;
  confidence: number;
  modelTier: ModelTier;
  windowTokens: number;
  recommendation: "continue" | "compact_now" | "compact_after_step" | "handoff_now";
  rationale: string;
}

const WINDOWS: Record<ModelTier, number> = {
  opus_4_7_1m: 1_000_000,
  opus_4_6: 200_000,
  sonnet_4_6: 200_000,
  opus_4_5: 200_000,
  haiku_4_5: 200_000,
  unknown: 200_000,
};

const DEFAULT_SAFETY = 0.15;
const DEFAULT_PER_STEP_OVERHEAD = 800;
const COMPACT_AT_UTIL = 0.85;
const IMMEDIATE_COMPACT_UTIL = 0.92;
const HANDOFF_UTIL = 0.96;

export class ContextBudgetForecastEngine {
  readonly name = "ContextBudgetForecastEngine";

  /**
   * Forecast whether the planned work fits in the current session.
   *
   * @param input Current token usage + remaining planned steps.
   * @returns Forecast with recommendation + rationale.
   */
  forecast(input: ContextBudgetForecastInput): ContextBudgetForecast {
    this.assertInput(input);
    const tier = input.modelTier ?? "opus_4_7_1m";
    const window = WINDOWS[tier] ?? WINDOWS.unknown;
    const safety = Math.max(0, Math.min(0.5, input.safetyMarginPct ?? DEFAULT_SAFETY));
    const perStepOverhead = Math.max(0, input.perStepOverhead ?? DEFAULT_PER_STEP_OVERHEAD);
    const availableCap = Math.floor(window * (1 - safety));

    // Step-by-step projection
    let running = input.currentTokens;
    let compactAfter: number | null = null;
    for (let i = 0; i < input.remainingSteps.length; i++) {
      const step = input.remainingSteps[i];
      running += Math.max(0, step.estTokens) + perStepOverhead;
      if (compactAfter == null && running / window > COMPACT_AT_UTIL) {
        compactAfter = i;
      }
    }

    const willOverflow = running > availableCap;
    const util = input.currentTokens / window;
    const finalUtil = running / window;
    let recommendation: ContextBudgetForecast["recommendation"];
    let rationale: string;
    if (util > HANDOFF_UTIL) {
      recommendation = "handoff_now";
      rationale = `Already at ${(util * 100).toFixed(0)}% of the ${tier} window — /handoff now`;
    } else if (util > IMMEDIATE_COMPACT_UTIL) {
      recommendation = "compact_now";
      rationale = `At ${(util * 100).toFixed(0)}% utilization — /compact before the next step`;
    } else if (willOverflow) {
      recommendation = compactAfter != null ? "compact_after_step" : "compact_now";
      rationale = compactAfter != null
        ? `Projected ${(finalUtil * 100).toFixed(0)}% after plan — /compact after step ${compactAfter}`
        : `Projected ${(finalUtil * 100).toFixed(0)}% after plan — /compact now`;
    } else {
      recommendation = "continue";
      rationale = `Plan fits with ${Math.max(0, availableCap - running)} tokens of headroom`;
    }

    return {
      willOverflow,
      recommendCompactAfterStep: compactAfter,
      estimatedFinalTokens: running,
      tokensAvailableNow: Math.max(0, availableCap - input.currentTokens),
      tokensAvailableAtCompletion: Math.max(0, availableCap - running),
      utilizationPct: finalUtil,
      confidence: this.computeConfidence(input, tier),
      modelTier: tier,
      windowTokens: window,
      recommendation,
      rationale,
    };
  }

  /**
   * Convenience wrapper: just ask if we should compact right now.
   */
  shouldCompactNow(input: ContextBudgetForecastInput): boolean {
    const f = this.forecast(input);
    return f.recommendation === "compact_now" || f.recommendation === "handoff_now";
  }

  /**
   * Short one-liner formatted for hook injection.
   */
  summarize(forecast: ContextBudgetForecast): string {
    const icon =
      forecast.recommendation === "continue"
        ? "🟢"
        : forecast.recommendation === "compact_after_step"
          ? "🟡"
          : forecast.recommendation === "compact_now"
            ? "🟠"
            : "🔴";
    return `${icon} Context ${(forecast.utilizationPct * 100).toFixed(0)}% projected (${forecast.modelTier}) — ${forecast.rationale}`;
  }

  private computeConfidence(input: ContextBudgetForecastInput, tier: ModelTier): number {
    // Confidence drops with larger steps (harder to estimate), unknown tier,
    // and missing estTokens on some steps.
    let c = 0.9;
    if (tier === "unknown") c -= 0.3;
    const steps = input.remainingSteps;
    const missing = steps.filter((s) => !Number.isFinite(s.estTokens) || s.estTokens <= 0).length;
    if (steps.length > 0) c -= Math.min(0.3, (missing / steps.length) * 0.5);
    const biggest = Math.max(0, ...steps.map((s) => s.estTokens ?? 0));
    if (biggest > 10_000) c -= 0.1;
    return Math.max(0.1, Math.min(1, c));
  }

  private assertInput(input: unknown): asserts input is ContextBudgetForecastInput {
    if (!input || typeof input !== "object") {
      throw new Error("ContextBudgetForecastEngine.forecast: input must be an object");
    }
    const rec = input as Partial<ContextBudgetForecastInput>;
    if (typeof rec.currentTokens !== "number" || !Number.isFinite(rec.currentTokens) || rec.currentTokens < 0) {
      throw new Error("ContextBudgetForecastEngine.forecast: currentTokens must be a non-negative number");
    }
    if (!Array.isArray(rec.remainingSteps)) {
      throw new Error("ContextBudgetForecastEngine.forecast: remainingSteps must be an array");
    }
  }
}

export const contextBudgetForecastEngine = new ContextBudgetForecastEngine();
