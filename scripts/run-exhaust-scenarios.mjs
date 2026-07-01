#!/usr/bin/env node
/**
 * run-exhaust-scenarios — JM-DIE-QUOTE-TRAINING-MS0 / U-QT09
 *
 * The operational closing of /goal-18:
 *   1. Run N synthetic scenarios (default 50,000) through the full pipeline
 *   2. Run JM Die financial-baseline 500 actual records through QuotingTrainingLoop
 *   3. Log scenario outcomes to scenario-results JSONL (one row per outcome)
 *   4. Compute combined accuracy + per-process/per-material breakdown
 *   5. Generate 5 deep-reasoning prompt envelopes (U-QT07) for the operator
 *   6. Write spec JSON capturing everything for downstream PSN consumption
 *
 * Output:
 *   - state/shared/scan-tracking/scenario-results.jsonl (per-outcome log)
 *   - state/shared/specs/QUOTING-SCENARIO-EXHAUST-2026-05-25.json (aggregate)
 *
 * Knobs (env):
 *   SCENARIO_COUNT (default 50000), SCENARIO_SEED (default 2026), SHOP_LOADING_PCT (default 50)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { scenarioBatchRunnerEngine } from "../mcp-server/src/engines/ScenarioBatchRunnerEngine.js";
import { quotingTrainingLoopEngine } from "../mcp-server/src/engines/QuotingTrainingLoopEngine.js";
import { quotingDeepReasoningBridgeEngine } from "../mcp-server/src/engines/QuotingDeepReasoningBridgeEngine.js";

const SCENARIO_COUNT = Number(process.env.SCENARIO_COUNT ?? 50000);
const SCENARIO_SEED = Number(process.env.SCENARIO_SEED ?? 2026);
const SHOP_LOADING_PCT = Number(process.env.SHOP_LOADING_PCT ?? 50);
const AS_OF_DATE = process.env.AS_OF_DATE ?? new Date().toISOString().slice(0, 10);
const OUTCOMES_PATH = "H:/prism/state/shared/scan-tracking/scenario-results.jsonl";
const SPEC_PATH = "H:/prism/state/shared/specs/QUOTING-SCENARIO-EXHAUST-2026-05-25.json";
const FIN_BASELINE_PATH = "H:/prism/state/shared/specs/JM-DIE-FINANCIAL-BASELINE-2026-05-24.json";

function main() {
  console.log(`[exhaust] running ${SCENARIO_COUNT} scenarios (seed=${SCENARIO_SEED}, shop_loading=${SHOP_LOADING_PCT}%, as_of=${AS_OF_DATE})…`);
  const t0 = Date.now();
  // 50K with includeOutcomes=true would consume ~50MB. We turn it on but stream-write.
  const report = scenarioBatchRunnerEngine.run({
    count: SCENARIO_COUNT,
    seed: SCENARIO_SEED,
    shopLoadingPct: SHOP_LOADING_PCT,
    asOfIsoDate: AS_OF_DATE,
    includeOutcomes: true,
  });
  if (!report.ok) {
    console.error(`[exhaust] R12 FAIL: ${report.reason}`);
    process.exit(2);
  }
  const t1 = Date.now();
  console.log(`[exhaust] ran ${report.total_scenarios} scenarios in ${t1 - t0}ms — ${report.quoted} quoted, ${report.failed} failed`);

  // Write per-outcome JSONL
  fs.mkdirSync(path.dirname(OUTCOMES_PATH), { recursive: true });
  const stream = fs.createWriteStream(OUTCOMES_PATH, { encoding: "utf8" });
  for (const o of report.outcomes) {
    stream.write(JSON.stringify({
      idx: o.index,
      ok: o.ok,
      mat: o.inputs.material,
      proc: o.inputs.process,
      tol: o.inputs.tolerance_class,
      qty: o.inputs.quantity,
      lead: o.inputs.lead_time_days,
      fmv_part: o.fmv_per_part_usd,
      fmv_lot: o.fmv_total_lot_usd,
      time_s: o.time_in_cut_s_per_part,
      vol_cm3: o.volume_cm3,
      out_rec: o.outsource_recommendation,
      out_save: o.outsource_savings_usd,
      fail: o.fail_reason ?? null,
    }) + "\n");
  }
  stream.end();
  console.log(`[exhaust] wrote ${report.outcomes.length} outcomes → ${OUTCOMES_PATH}`);

  // JM Die actuals — feed through training-loop
  let trainingReport = null;
  let jmDieReport = null;
  if (fs.existsSync(FIN_BASELINE_PATH)) {
    try {
      const fin = JSON.parse(fs.readFileSync(FIN_BASELINE_PATH, "utf8"));
      console.log(`[exhaust] loaded JM Die financial baseline: ${fin.ingest_summary?.records ?? 0} records, $${fin.baseline?.total_revenue_usd ?? 0} total revenue`);
      // Build training-loop records from baseline by_customer (aggregate per customer)
      const records = [];
      for (const c of (fin.baseline?.by_customer ?? [])) {
        if (typeof c.total_revenue_usd === "number" && c.doc_count > 0) {
          // synthesize per-doc avg as a single ground-truth record per customer
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
      trainingReport = quotingTrainingLoopEngine.run(records, { feedPsnAutonomy: true });
      jmDieReport = {
        baseline_records_used: records.length,
        baseline_source: FIN_BASELINE_PATH,
        training_loop_report: trainingReport,
      };
      console.log(`[exhaust] JM Die training loop: ${trainingReport.total_predicted}/${trainingReport.total_records} predicted, MAPE=${trainingReport.metrics.mape_pct.toFixed(1)}%, signed_bias=${trainingReport.metrics.mean_signed_pct_error.toFixed(1)}%`);
    } catch (err) {
      console.warn(`[exhaust] JM Die baseline read failed: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.warn(`[exhaust] JM Die baseline missing: ${FIN_BASELINE_PATH}`);
  }

  // Deep-reasoning prompt envelopes (U-QT07)
  let prompts = null;
  if (trainingReport && trainingReport.ok) {
    prompts = {
      explain_bias_top_customer: trainingReport.per_customer_bias[0]
        ? quotingDeepReasoningBridgeEngine.buildExplainBias(trainingReport, trainingReport.per_customer_bias[0].customer)
        : null,
      find_pattern: quotingDeepReasoningBridgeEngine.buildFindPattern(trainingReport),
      suggest_rate_adjust: quotingDeepReasoningBridgeEngine.buildSuggestRateAdjust(trainingReport),
      outlier_investigate: quotingDeepReasoningBridgeEngine.buildOutlierInvestigate(trainingReport),
      cross_customer_rec: trainingReport.per_customer_bias.length >= 2
        ? quotingDeepReasoningBridgeEngine.buildCrossCustomerRec(trainingReport, trainingReport.per_customer_bias[0].customer, trainingReport.per_customer_bias[1].customer)
        : null,
    };
    console.log(`[exhaust] built ${Object.values(prompts).filter(Boolean).length} deep-reasoning prompt envelopes`);
  }

  // Write aggregate spec JSON (without per-outcome list to keep it small)
  const spec = {
    milestone: "JM-DIE-QUOTE-TRAINING-MS0",
    unit: "U-QT09-EXHAUST-SCENARIOS",
    slot: "charlie",
    goal: "/goal-18",
    generated_at: new Date().toISOString(),
    duration_ms: t1 - t0,
    config: { scenario_count: SCENARIO_COUNT, scenario_seed: SCENARIO_SEED, shop_loading_pct: SHOP_LOADING_PCT, as_of_date: AS_OF_DATE },
    synthetic_scenarios: {
      total: report.total_scenarios,
      quoted: report.quoted,
      failed: report.failed,
      outsource_distribution: report.outsource_distribution,
      by_process: report.by_process_mape,
      by_material: report.by_material_mape,
      aggregate: report.aggregate_metrics,
      outcomes_log: OUTCOMES_PATH,
    },
    jm_die_first_hop: jmDieReport,
    deep_reasoning_prompts: prompts,
  };
  fs.mkdirSync(path.dirname(SPEC_PATH), { recursive: true });
  fs.writeFileSync(SPEC_PATH, JSON.stringify(spec, null, 2), "utf8");
  console.log(`[exhaust] wrote spec → ${SPEC_PATH}`);
  console.log(`[exhaust] DONE in ${Date.now() - t0}ms`);
}

main();
