#!/usr/bin/env node
/**
 * run-calibration-cycle — JM-DIE-QUOTE-TRAINING-MS0 / U-QT10
 *
 * Closes the inner training loop end-to-end:
 *   1. Load JM Die financial baseline (real actuals)
 *   2. Run QuotingTrainingLoop → AccuracyReport (pre-calibration MAPE + signed bias)
 *   3. derive() CalibrationFactors from the bias report
 *   4. measureImprovement() — post-calibration MAPE projection
 *   5. Persist calibration factors to JSON for future quote-time consumption
 *   6. Print closed-loop verdict
 *
 * Output:
 *   - state/shared/specs/QUOTING-CALIBRATION-2026-05-25.json (factors + verdict)
 *   - state/shared/calibration/quoting-calibration-active.json (current active factors)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { quotingTrainingLoopEngine } from "../mcp-server/src/engines/QuotingTrainingLoopEngine.js";
import { quotingCalibrationEngine } from "../mcp-server/src/engines/QuotingCalibrationEngine.js";

const FIN_BASELINE_PATH = "H:/prism/state/shared/specs/JM-DIE-FINANCIAL-BASELINE-2026-05-24.json";
const SPEC_PATH = "H:/prism/state/shared/specs/QUOTING-CALIBRATION-2026-05-25.json";
const ACTIVE_PATH = "H:/prism/state/shared/calibration/quoting-calibration-active.json";

function main() {
  if (!fs.existsSync(FIN_BASELINE_PATH)) {
    console.error(`[calib] R12 FAIL: baseline missing: ${FIN_BASELINE_PATH}`);
    process.exit(2);
  }
  const fin = JSON.parse(fs.readFileSync(FIN_BASELINE_PATH, "utf8"));
  const records = [];
  for (const c of (fin.baseline?.by_customer ?? [])) {
    if (typeof c.total_revenue_usd === "number" && c.doc_count > 0) {
      records.push({
        customer: c.customer,
        part_id: `${c.customer}-AVG`,
        doc_date: c.last_date ?? null,
        actual_revenue_usd: c.total_revenue_usd / c.doc_count,
        estimated_time_in_cut_s: 600,
        estimated_material_spend_usd: 75,
        machine_rate_usd_per_hr: 95,
      });
    }
  }
  if (records.length === 0) {
    console.error(`[calib] R12 FAIL: zero usable records from baseline`);
    process.exit(2);
  }
  console.log(`[calib] loaded ${records.length} customer-aggregate records from JM Die baseline`);

  // Step 1: pre-calibration measurement
  const report = quotingTrainingLoopEngine.run(records, { feedPsnAutonomy: false });
  if (!report.ok) {
    console.error(`[calib] R12 FAIL: training loop returned not-ok: ${report.reason}`);
    process.exit(2);
  }
  console.log(`[calib] PRE: MAPE=${report.metrics.mape_pct.toFixed(1)}% · signed_bias=${report.metrics.mean_signed_pct_error.toFixed(1)}% · MAE=$${report.metrics.mae_usd.toFixed(2)}`);

  // Step 2: derive calibration factors
  const factors = quotingCalibrationEngine.derive(report);
  if (!factors.ok) {
    console.error(`[calib] R12 FAIL: derive returned not-ok: ${factors.reason}`);
    process.exit(2);
  }
  console.log(`[calib] DERIVED: global_factor=${factors.global.factor} (${factors.global.rationale})`);
  console.log(`[calib] DERIVED: ${factors.per_customer.length} per-customer factors (top 5):`);
  for (const c of factors.per_customer.slice(0, 5)) {
    console.log(`         ${c.customer.padEnd(24)} factor=${c.factor.toFixed(4)} · n=${c.record_count} · observed_bias=${c.signed_pct_error_observed}%`);
  }

  // Step 3: measure improvement
  const verdict = quotingCalibrationEngine.measureImprovement(report, factors);
  console.log(`[calib] POST: MAPE=${verdict.post.mape_pct}% · signed_bias=${verdict.post.mean_signed_pct_error}%`);
  console.log(`[calib] REDUCTION: MAPE ${verdict.mape_reduction_pct}% · bias ${verdict.bias_reduction_pct}%`);

  // Step 4: persist for downstream consumers
  const spec = {
    milestone: "JM-DIE-QUOTE-TRAINING-MS0",
    unit: "U-QT10-CALIBRATION-CYCLE",
    slot: "charlie",
    goal: "/goal-18",
    iter: 2,
    generated_at: new Date().toISOString(),
    source_baseline: FIN_BASELINE_PATH,
    pre_calibration: {
      mape_pct: report.metrics.mape_pct,
      mean_signed_pct_error: report.metrics.mean_signed_pct_error,
      mae_usd: report.metrics.mae_usd,
      rmse_usd: report.metrics.rmse_usd,
      total_predicted: report.total_predicted,
    },
    factors,
    post_calibration_projection: verdict.post,
    reduction: {
      mape_reduction_pct: verdict.mape_reduction_pct,
      bias_reduction_pct: verdict.bias_reduction_pct,
    },
    advisory: "Factors derived from the same record set used to fit them. To validate generalization, re-derive on train split + evaluate on held-out split — single-corpus reduction is upper-bound only.",
  };
  fs.mkdirSync(path.dirname(SPEC_PATH), { recursive: true });
  fs.writeFileSync(SPEC_PATH, JSON.stringify(spec, null, 2), "utf8");
  console.log(`[calib] wrote spec → ${SPEC_PATH}`);

  fs.mkdirSync(path.dirname(ACTIVE_PATH), { recursive: true });
  fs.writeFileSync(ACTIVE_PATH, JSON.stringify(factors, null, 2), "utf8");
  console.log(`[calib] active calibration → ${ACTIVE_PATH}`);

  // Closed-loop verdict
  if (verdict.bias_reduction_pct >= 90) {
    console.log(`[calib] ✓ CLOSED-LOOP PASS — bias reduction ${verdict.bias_reduction_pct}% ≥ 90% target`);
  } else if (verdict.bias_reduction_pct >= 50) {
    console.log(`[calib] ◐ CLOSED-LOOP PARTIAL — bias reduction ${verdict.bias_reduction_pct}% (50-90% band)`);
  } else {
    console.log(`[calib] ✗ CLOSED-LOOP WEAK — bias reduction ${verdict.bias_reduction_pct}% < 50% — investigate clamp range or per-customer minRecords`);
  }
}

main();
