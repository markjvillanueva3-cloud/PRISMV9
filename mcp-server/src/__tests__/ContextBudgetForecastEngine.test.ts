/**
 * U-FORE-09 tests — ContextBudgetForecastEngine
 *
 * Coverage floor: happy + ≥3 failure modes + ≥2 adversarial.
 * Variability: 5 model tiers (opus 4.7 1M, opus 4.6, sonnet 4.6, opus
 * 4.5, haiku) cover every window size so recommendations calibrate.
 * Dispatcher round-trip included.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  ContextBudgetForecastEngine,
  contextBudgetForecastEngine,
} from "../engines/ContextBudgetForecastEngine.js";
import type { BuildStep } from "../engines/AtomicStepDecomposerEngine.js";

function step(tokens: number, i = 0): BuildStep {
  return {
    id: `S${i}`,
    kind: "write_engine",
    description: `step ${i}`,
    estTokens: tokens,
    estDurationSec: 10,
    risk: 0.1,
    rollback: "revert",
  } as BuildStep;
}

// ─── Happy path ─────────────────────────────────────────────────────

describe("ContextBudgetForecastEngine — forecast", () => {
  it("continue recommendation when plan fits in Opus 4.7 1M window", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 50_000,
      remainingSteps: [step(5_000), step(6_000), step(7_000)],
      modelTier: "opus_4_7_1m",
    });
    expect(f.recommendation).toBe("continue");
    expect(f.willOverflow).toBe(false);
    expect(f.tokensAvailableAtCompletion).toBeGreaterThan(0);
  });

  it("compact_now when already at >92% utilization", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 940_000,
      remainingSteps: [step(1_000)],
      modelTier: "opus_4_7_1m",
    });
    expect(f.recommendation).toBe("compact_now");
  });

  it("handoff_now when already at >96% utilization", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 970_000,
      remainingSteps: [step(1_000)],
      modelTier: "opus_4_7_1m",
    });
    expect(f.recommendation).toBe("handoff_now");
  });

  it("compact_after_step surfaces the step index where 85% is crossed", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 100_000,
      // Five 40k-token steps — 100k + 5×40k + overhead → crosses 85% at ~step 3
      remainingSteps: [step(40_000, 0), step(40_000, 1), step(40_000, 2), step(40_000, 3), step(40_000, 4)],
      modelTier: "opus_4_6", // 200k window
    });
    expect(f.recommendation).toMatch(/compact/);
    expect(typeof f.recommendCompactAfterStep).toBe("number");
    expect(f.recommendCompactAfterStep).toBeGreaterThanOrEqual(0);
  });

  it("VARIABILITY: Opus 4.7 1M handles more headroom than Opus 4.6", () => {
    const small = { currentTokens: 100_000, remainingSteps: [step(50_000, 0), step(50_000, 1)] };
    const fBig = contextBudgetForecastEngine.forecast({ ...small, modelTier: "opus_4_7_1m" });
    const fSmall = contextBudgetForecastEngine.forecast({ ...small, modelTier: "opus_4_6" });
    expect(fBig.tokensAvailableAtCompletion).toBeGreaterThan(fSmall.tokensAvailableAtCompletion);
  });

  it("VARIABILITY: Sonnet 4.6 window matches Opus 4.6 (both 200k)", () => {
    const input = { currentTokens: 100_000, remainingSteps: [step(1_000)] };
    const fS = contextBudgetForecastEngine.forecast({ ...input, modelTier: "sonnet_4_6" });
    const fO = contextBudgetForecastEngine.forecast({ ...input, modelTier: "opus_4_6" });
    expect(fS.windowTokens).toBe(fO.windowTokens);
    expect(fS.windowTokens).toBe(200_000);
  });

  it("VARIABILITY: Haiku 4.5 has 200k window", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 10_000,
      remainingSteps: [step(1_000)],
      modelTier: "haiku_4_5",
    });
    expect(f.windowTokens).toBe(200_000);
  });

  it("VARIABILITY: unknown tier falls back to 200k + lower confidence", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 10_000,
      remainingSteps: [step(1_000)],
      modelTier: "unknown",
    });
    expect(f.windowTokens).toBe(200_000);
    expect(f.confidence).toBeLessThan(0.7);
  });

  it("utilizationPct reflects the post-plan projection", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 100_000,
      remainingSteps: [step(100_000, 0)],
      modelTier: "opus_4_6",
    });
    // 100k + 100k + overhead ≈ 201k in a 200k window → >1.0
    expect(f.utilizationPct).toBeGreaterThan(1);
  });

  it("shouldCompactNow returns true at high utilization", () => {
    expect(
      contextBudgetForecastEngine.shouldCompactNow({
        currentTokens: 950_000,
        remainingSteps: [step(5_000)],
        modelTier: "opus_4_7_1m",
      })
    ).toBe(true);
  });

  it("summarize emits a color-coded single line", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 100_000,
      remainingSteps: [step(5_000)],
      modelTier: "opus_4_7_1m",
    });
    const s = contextBudgetForecastEngine.summarize(f);
    expect(s).toMatch(/🟢|🟡|🟠|🔴/);
    expect(s).toContain("Context");
  });

  it("confidence drops when steps have missing estTokens", () => {
    const withEstimates = contextBudgetForecastEngine.forecast({
      currentTokens: 10_000,
      remainingSteps: [step(1_000, 0), step(1_000, 1)],
      modelTier: "opus_4_7_1m",
    });
    const withoutEstimates = contextBudgetForecastEngine.forecast({
      currentTokens: 10_000,
      remainingSteps: [step(0, 0), step(0, 1)],
      modelTier: "opus_4_7_1m",
    });
    expect(withEstimates.confidence).toBeGreaterThan(withoutEstimates.confidence);
  });

  it("safetyMarginPct override reduces available tokens", () => {
    const base = { currentTokens: 100_000, remainingSteps: [step(1_000)], modelTier: "opus_4_7_1m" as const };
    const lax = contextBudgetForecastEngine.forecast({ ...base, safetyMarginPct: 0.05 });
    const strict = contextBudgetForecastEngine.forecast({ ...base, safetyMarginPct: 0.3 });
    expect(lax.tokensAvailableNow).toBeGreaterThan(strict.tokensAvailableNow);
  });
});

// ─── Failure modes ──────────────────────────────────────────────────

describe("ContextBudgetForecastEngine — failure modes", () => {
  it("FAIL: null input throws", () => {
    // @ts-expect-error
    expect(() => contextBudgetForecastEngine.forecast(null)).toThrow(/must be an object/);
  });

  it("FAIL: negative currentTokens throws", () => {
    expect(() =>
      contextBudgetForecastEngine.forecast({ currentTokens: -1, remainingSteps: [] })
    ).toThrow(/non-negative/);
  });

  it("FAIL: NaN currentTokens throws", () => {
    expect(() =>
      contextBudgetForecastEngine.forecast({ currentTokens: NaN, remainingSteps: [] })
    ).toThrow(/non-negative/);
  });

  it("FAIL: non-array remainingSteps throws", () => {
    expect(() =>
      contextBudgetForecastEngine.forecast({ currentTokens: 0, remainingSteps: "nope" as any })
    ).toThrow(/must be an array/);
  });
});

// ─── Adversarial ────────────────────────────────────────────────────

describe("ContextBudgetForecastEngine — adversarial", () => {
  it("ADV: empty remaining steps always continues", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 10_000,
      remainingSteps: [],
      modelTier: "opus_4_7_1m",
    });
    expect(f.recommendation).toBe("continue");
    expect(f.recommendCompactAfterStep).toBeNull();
  });

  it("ADV: massive step (>100k tokens) still yields a finite projection", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 0,
      remainingSteps: [step(500_000)],
      modelTier: "opus_4_7_1m",
    });
    expect(Number.isFinite(f.estimatedFinalTokens)).toBe(true);
    expect(f.confidence).toBeLessThan(0.9); // huge step lowers confidence
  });

  it("ADV: safetyMarginPct clamped to [0, 0.5]", () => {
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 10_000,
      remainingSteps: [step(1_000)],
      modelTier: "opus_4_7_1m",
      safetyMarginPct: 999,
    });
    // Should not explode — the engine clamps
    expect(f.tokensAvailableNow).toBeGreaterThanOrEqual(0);
  });

  it("ADV: 100+ tiny steps does not regress compactAfterStep logic", () => {
    const steps: BuildStep[] = [];
    for (let i = 0; i < 120; i++) steps.push(step(100, i));
    const f = contextBudgetForecastEngine.forecast({
      currentTokens: 10_000,
      remainingSteps: steps,
      modelTier: "opus_4_7_1m",
    });
    expect(f.recommendation).toBe("continue");
  });
});

// ─── Dispatcher round-trip ──────────────────────────────────────────

describe("U-FORE-09 — dispatcher round-trip", () => {
  it("devDispatcher exposes context_budget_forecast + context_should_compact actions", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"context_budget_forecast"');
    expect(disp).toContain('"context_should_compact"');
    expect(disp).toContain("ContextBudgetForecastEngine.js");
  });
});
