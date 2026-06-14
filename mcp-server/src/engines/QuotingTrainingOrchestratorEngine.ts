/**
 * QuotingTrainingOrchestratorEngine — continuous calibration loop
 *
 * Operator overnight directive: "keep training the system with quoting".
 *
 * Composes the existing calibration substrate into a single runOnce() so
 * the system can self-train on every fresh batch of quote outcomes:
 *   1. QuotingTrainingLoopEngine.run(records)  → AccuracyReport
 *   2. QuotingCalibrationEngine.deriveWithCoV(report)
 *        → factors + Chain-of-Verification verdict + safe_to_activate flag
 *   3. If safe_to_activate AND writeIfSafe:true → write active-factor JSON
 *      (atomic temp+rename) so QuotingActiveFactorLoaderEngine picks it up
 *      on next quote-time apply.
 *   4. Optionally feed psi_delta back to PSN autonomy loop.
 *
 * Pure compositional + fail-soft. No physics, no new math.
 * Single-cycle today (operator-driven or cron-driven); future tick wraps
 * this in a scheduler.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-TRAINING-ORCHESTRATOR (charlie /goal-yolo iter1)
 */

import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import type { QuoteBaselineRecord, AccuracyReport, RunOptions } from "./QuotingTrainingLoopEngine.js";
import type { CalibrationFactors } from "./QuotingCalibrationEngine.js";
import type { VerificationResult } from "./ChainOfVerificationEngine.js";

export interface OrchestratorRunInput {
  records: QuoteBaselineRecord[];
  /** Pass-through to QuotingTrainingLoopEngine.run. */
  trainingOpts?: RunOptions;
  /** Pass-through to QuotingCalibrationEngine.deriveWithCoV (factor clamp etc.). */
  deriveOpts?: { minRecordsForCustomer?: number; minFactor?: number; maxFactor?: number; balancedBandPct?: number };
  /** When true AND CoV says safe_to_activate, write to active-factor JSON. Default true. */
  writeIfSafe?: boolean;
  /** Override active-factor path (for tests). Defaults to state/shared/quoting/active-calibration.json. */
  activeFactorPath?: string;
  /** When true AND psi_delta-feed wired, pipe outcomes into PSN autonomy loop. Default false. */
  feedPsnAutonomy?: boolean;
}

export interface OrchestratorRunResult {
  ok: boolean;
  reason?: string;
  /** Stage 1 — measurement. */
  report: AccuracyReport;
  /** Stage 2 — derive + CoV. */
  factors?: CalibrationFactors;
  cov?: VerificationResult;
  safe_to_activate?: boolean;
  /** Stage 3 — write outcome. */
  active_factor_written: boolean;
  active_factor_path?: string;
  /** Stage 4 — psi_delta feed (best-effort; never blocks the loop). */
  psi_delta_fed_count: number;
  /** When stage 3 was skipped (not safe or writeIfSafe=false), why. */
  skip_reason?: string;
  warnings: string[];
}

const DEFAULT_ACTIVE_PATH = "H:/prism/state/shared/quoting/active-calibration.json";

export class QuotingTrainingOrchestratorEngine {
  /**
   * One end-to-end training cycle: measure → derive+verify → optional write → optional psi_delta.
   * Returns a result object describing every stage's outcome (no exceptions thrown from this path).
   */
  async runOnce(input: OrchestratorRunInput): Promise<OrchestratorRunResult> {
    const warnings: string[] = [];

    // Stage 1 — measure.
    const { quotingTrainingLoopEngine } = await import("./QuotingTrainingLoopEngine.js");
    const report = quotingTrainingLoopEngine.run(input.records ?? [], input.trainingOpts ?? {});

    if (!report.ok || report.total_predicted === 0) {
      return {
        ok: false, reason: report.reason ?? "training-loop produced no predictions",
        report,
        active_factor_written: false,
        psi_delta_fed_count: 0,
        warnings,
      };
    }

    // Stage 2 — derive + CoV gate.
    const { quotingCalibrationEngine } = await import("./QuotingCalibrationEngine.js");
    const derived = await quotingCalibrationEngine.deriveWithCoV(report, input.deriveOpts ?? {});
    const factors = derived.factors;
    const cov = derived.cov;
    const safe = derived.safe_to_activate;

    // Stage 3 — conditional write.
    const writeIfSafe = input.writeIfSafe !== false; // default true
    const activePath = input.activeFactorPath ?? DEFAULT_ACTIVE_PATH;
    let written = false;
    let skipReason: string | undefined;

    if (!safe) {
      skipReason = `CoV verdict not safe_to_activate (escalate=${cov.shouldEscalate}, posterior=${(cov.posteriorConfidence ?? 0).toFixed(2)})`;
    } else if (!writeIfSafe) {
      skipReason = "writeIfSafe=false (dry-run mode)";
    } else if (!factors.ok) {
      skipReason = `derive() returned ok=false: ${factors.reason ?? "unknown"}`;
    } else {
      try {
        await fs.mkdir(dirname(activePath), { recursive: true });
        const tmpPath = `${activePath}.tmp-${Date.now()}-${process.pid}`;
        await fs.writeFile(tmpPath, JSON.stringify(factors, null, 2), "utf-8");
        await fs.rename(tmpPath, activePath);
        written = true;
      } catch (e) {
        skipReason = `write failed: ${e instanceof Error ? e.message : String(e)}`;
        warnings.push(`active-factor write to ${activePath} failed`);
      }
    }

    // Stage 4 — psi_delta feed (best-effort, optional).
    let psiDeltaFedCount = 0;
    if (input.feedPsnAutonomy) {
      try {
        const { quoteOutcomePSIDeltaBridgeEngine } = await import("./QuoteOutcomePSIDeltaBridgeEngine.js");
        for (const pred of (report.worst_5_records ?? [])) {
          const r = quoteOutcomePSIDeltaBridgeEngine.scoreOutcome({
            quote_id: `${pred.customer}|${pred.part_id}`,
            // PerRecordPrediction's predicted field is `predicted_fmv_usd` — there is no
            // `predicted_usd` on it. Reading the wrong name yielded `undefined`, which
            // scoreOutcome rejects (Number.isFinite(undefined)===false), so EVERY record
            // was silently dropped and the PSN-autonomy psi_delta feed never fired.
            // Grain: predicted_fmv_usd vs actual_usd is the SAME per-record pairing the
            // report's pct_error uses (QuotingTrainingLoopEngine line ~144) — self-consistent
            // here; whether actual_usd is a per-part-job actual is an upstream-baseline
            // property, not introduced by this feed.
            predicted_usd: pred.predicted_fmv_usd,
            actual_usd: pred.actual_usd,
            customer: pred.customer,
          });
          if (r?.ok) psiDeltaFedCount++;
        }
      } catch (e) {
        warnings.push(`psi_delta feed failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      ok: true,
      report,
      factors,
      cov,
      safe_to_activate: safe,
      active_factor_written: written,
      active_factor_path: written ? activePath : undefined,
      psi_delta_fed_count: psiDeltaFedCount,
      skip_reason: skipReason,
      warnings,
    };
  }
}

export const quotingTrainingOrchestratorEngine = new QuotingTrainingOrchestratorEngine();
export default quotingTrainingOrchestratorEngine;
