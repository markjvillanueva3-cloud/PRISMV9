/**
 * RiskForecastEngine — U-FORE-06 (PSAU-FORESIGHT)
 * =================================================
 *
 * Predicts which build gates a proposed unit is most likely to trip
 * BEFORE any code is written, so the safety-physics / test-legitimacy /
 * canonical-constants review can run upfront instead of after a failed
 * commit wastes a cycle.
 *
 * Uses Laplace-smoothed per-(unitClass, gate) failure rates from the
 * GateFailureHistoryEngine event log. Returns Top-K risks plus a simple
 * overall score. Callers persist their prediction back to the log so the
 * Brier-score calibration from GateFailureHistoryEngine.calibration()
 * improves each cycle.
 */

import {
  gateFailureHistoryEngine,
  type GateFailureHistoryEngine,
  type GateName,
} from "./GateFailureHistoryEngine.js";

export interface RiskForecastInput {
  unitId: string;
  unitClass: string;
  filesTouched?: string[];
  gates?: GateName[];
}

export interface GateRisk {
  gate: GateName;
  probability: number;
  sampleSize: number;
  warn: boolean;
  rationale: string;
}

export interface RiskForecast {
  unitId: string;
  unitClass: string;
  perGate: GateRisk[];
  topK: GateRisk[];
  overallScore: number;
  confidence: number;
  computedAt: number;
}

const DEFAULT_GATES: GateName[] = [
  "canonical_constants",
  "no_silent_catch",
  "test_legitimacy",
  "sx_gate",
  "duplication_hard_block",
];

const WARN_THRESHOLD = 0.3;
const TOP_K = 3;
const LAPLACE_ALPHA = 1; // smoothing pseudo-count
const LAPLACE_BETA = 2; // prior (one pass + one fail)
const GLOBAL_PRIOR = 0.1; // 10% base failure rate when no history
const MIN_CONFIDENCE_N = 5;

export class RiskForecastEngine {
  readonly name = "RiskForecastEngine";

  constructor(
    private readonly history: GateFailureHistoryEngine = gateFailureHistoryEngine
  ) {}

  /**
   * Forecast gate-failure risk for an upcoming unit.
   *
   * @param input  UnitClass + optional files/gates.
   * @returns  Forecast with per-gate probabilities and top-K risks.
   */
  forecast(input: RiskForecastInput): RiskForecast {
    this.assertInput(input);
    const gates = input.gates && input.gates.length > 0 ? input.gates : DEFAULT_GATES;
    const aggregates = this.history.aggregates();

    // Build a fast lookup keyed by (unitClass, gate)
    const key = (c: string, g: GateName) => `${c}|${g}`;
    const lookup = new Map<
      string,
      { failures: number; total: number; lastSeen: number }
    >();
    for (const a of aggregates) {
      lookup.set(key(a.unitClass, a.gate), {
        failures: a.failures,
        total: a.total,
        lastSeen: a.lastSeen,
      });
    }

    // Compute global per-gate prior across all classes (fallback when
    // the unit class has no direct history).
    const globalPerGate = new Map<GateName, { failures: number; total: number }>();
    for (const a of aggregates) {
      const prev = globalPerGate.get(a.gate) ?? { failures: 0, total: 0 };
      prev.failures += a.failures;
      prev.total += a.total;
      globalPerGate.set(a.gate, prev);
    }

    const perGate: GateRisk[] = gates.map((g) => {
      const direct = lookup.get(key(input.unitClass, g));
      const global = globalPerGate.get(g);
      let probability: number;
      let sampleSize = 0;
      let rationale: string;
      if (direct && direct.total >= MIN_CONFIDENCE_N) {
        probability =
          (direct.failures + LAPLACE_ALPHA) / (direct.total + LAPLACE_BETA);
        sampleSize = direct.total;
        rationale = `${direct.failures}/${direct.total} fails in ${input.unitClass}`;
      } else if (direct && direct.total > 0) {
        // Blend direct + global prior when direct is small
        const w = direct.total / MIN_CONFIDENCE_N;
        const directRate =
          (direct.failures + LAPLACE_ALPHA) / (direct.total + LAPLACE_BETA);
        const globalRate = global && global.total > 0
          ? (global.failures + LAPLACE_ALPHA) / (global.total + LAPLACE_BETA)
          : GLOBAL_PRIOR;
        probability = w * directRate + (1 - w) * globalRate;
        sampleSize = direct.total;
        rationale = `blended ${direct.failures}/${direct.total} direct + global prior`;
      } else if (global && global.total > 0) {
        probability =
          (global.failures + LAPLACE_ALPHA) / (global.total + LAPLACE_BETA);
        sampleSize = global.total;
        rationale = `no direct history — using global ${global.failures}/${global.total}`;
      } else {
        probability = GLOBAL_PRIOR;
        sampleSize = 0;
        rationale = "cold start — default prior";
      }
      return {
        gate: g,
        probability,
        sampleSize,
        warn: probability >= WARN_THRESHOLD,
        rationale,
      };
    });

    const sorted = [...perGate].sort((a, b) => b.probability - a.probability);
    const topK = sorted.slice(0, TOP_K);
    const overallScore = perGate.reduce((s, r) => s + r.probability, 0) / perGate.length;
    const confidence = this.computeConfidence(perGate);

    return {
      unitId: input.unitId,
      unitClass: input.unitClass,
      perGate,
      topK,
      overallScore,
      confidence,
      computedAt: Date.now(),
    };
  }

  /**
   * Shortcut: return only gates whose probability crosses the warn threshold.
   */
  warningsFor(input: RiskForecastInput): GateRisk[] {
    return this.forecast(input).perGate.filter((r) => r.warn);
  }

  /**
   * After forecasting + observing the actual outcome, log both so the
   * history can compute Brier calibration later.
   *
   * @param forecast  Prior forecast (used for `predicted`).
   * @param actual    Map from gate → observed outcome.
   */
  recordOutcome(
    forecast: RiskForecast,
    actual: Record<string, "pass" | "fail">
  ): void {
    for (const r of forecast.perGate) {
      const outcome = actual[r.gate];
      if (outcome !== "pass" && outcome !== "fail") continue;
      this.history.record({
        unitId: forecast.unitId,
        unitClass: forecast.unitClass,
        gate: r.gate,
        outcome,
        predicted: r.probability,
      });
    }
  }

  /**
   * Render a short plain-language summary of the forecast.
   */
  summarize(forecast: RiskForecast): string {
    const lines: string[] = [];
    lines.push(
      `Risk forecast — ${forecast.unitId} (class=${forecast.unitClass}): overall ${(
        forecast.overallScore * 100
      ).toFixed(0)}%`
    );
    for (const r of forecast.topK) {
      const flag = r.warn ? "⚠" : " ";
      lines.push(
        `  ${flag} ${r.gate}: ${(r.probability * 100).toFixed(0)}% (${r.rationale})`
      );
    }
    return lines.join("\n");
  }

  private computeConfidence(perGate: GateRisk[]): number {
    if (perGate.length === 0) return 0;
    const sizes = perGate.map((r) => r.sampleSize);
    const avg = sizes.reduce((s, n) => s + n, 0) / sizes.length;
    // Saturating curve — >20 samples averaged = full confidence
    return Math.max(0.1, Math.min(1, avg / 20));
  }

  private assertInput(input: unknown): asserts input is RiskForecastInput {
    if (!input || typeof input !== "object") {
      throw new Error("RiskForecastEngine.forecast: input must be an object");
    }
    const rec = input as Partial<RiskForecastInput>;
    if (typeof rec.unitId !== "string" || rec.unitId.trim() === "") {
      throw new Error("RiskForecastEngine.forecast: unitId required");
    }
    if (typeof rec.unitClass !== "string" || rec.unitClass.trim() === "") {
      throw new Error("RiskForecastEngine.forecast: unitClass required");
    }
  }
}

export const riskForecastEngine = new RiskForecastEngine();
