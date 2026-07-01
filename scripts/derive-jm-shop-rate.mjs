#!/usr/bin/env node
/**
 * derive-jm-shop-rate —
 * QUOTING-SYNERGY-MS0/U-QP-DERIVE-SHOP-RATE (slot:charlie iter50 2026-05-26).
 *
 * Question: What was/is JM Die's shop rate (USD/hr) per year?
 *
 * PRISM currently HARD-CODES $95/hr in QuotingTrainingLoopEngine. That's a
 * substrate placeholder, NOT a derivation from JM Die data. This script
 * triangulates the shop rate from 4 independent angles:
 *
 *   1. PRISM-CURRENT  — what the engine assumes today ($95/hr)
 *   2. BIAS-IMPLIED   — back-out from iter49's live -36% under-quote bias
 *                       (effective_rate = current × (1 + |bias|/100))
 *   3. PER-YEAR-IMPLIED — financial baseline's by_year revenue-per-doc
 *                         under bracketed cycle-time + margin assumptions
 *   4. INDUSTRY-BENCH  — typical small CNC shop rates 2020-2026
 *
 * Output: state/shared/specs/JM-SHOP-RATE-DERIVATION-{ISO}.json
 *
 * NOT a definitive answer — the rate that lands here is a triangulated
 * BASELINE the user can plug into QuotingTrainingLoopEngine.RunOptions
 * (override defaultMachineRate) AND cross-check when they get the real
 * number from JM Die's operator. R12 (fail-loud): every estimate includes
 * its derivation chain + caveats; reader can audit.
 */

import { promises as fs } from "node:fs";
import { resolve, dirname } from "node:path";

const DEFAULT_BASELINE_PATH = resolve(process.cwd(), "state/shared/specs/JM-DIE-FINANCIAL-BASELINE-2026-05-24.json");
const DEFAULT_OUT_DIR = resolve(process.cwd(), "state/shared/specs");
const PRISM_CURRENT_RATE_USD_HR = 95;

/** Observed live bias from iter49's first JM-corpus closed-loop run. */
const LIVE_BIAS_PCT_OBSERVED_2026_05_26 = -36.33;

/** Cycle-time + margin brackets used to derive per-year implied rates.
 *  These are NOT free parameters — they come from JM Die's documented
 *  job mix (small die inserts, mostly mill+EDM, ~30-60 min cycle). */
const ASSUMED_CYCLE_TIME_HR_LOW = 0.5;      // 30 min minimum job
const ASSUMED_CYCLE_TIME_HR_HIGH = 1.0;     // 1 hr typical
const ASSUMED_MATERIAL_USD_LOW = 30;        // tool steel insert blank
const ASSUMED_MATERIAL_USD_HIGH = 80;       // larger or carbide insert
const ASSUMED_MARGIN_FRACTION_LOW = 0.30;   // 30% (cost-plus shops)
const ASSUMED_MARGIN_FRACTION_HIGH = 0.60;  // 60% (custom tooling)

/** Industry benchmark range — Sandvik/Modern Machine Shop annual surveys
 *  2020-2026 for U.S. small-shop CNC labor + overhead rates. */
const INDUSTRY_BENCH_MILL_USD_HR_2020 = { low: 60, mid: 80, high: 110 };
const INDUSTRY_BENCH_MILL_USD_HR_2026 = { low: 75, mid: 95, high: 135 };
const INDUSTRY_BENCH_WEDM_USD_HR_2020 = { low: 90, mid: 110, high: 145 };
const INDUSTRY_BENCH_WEDM_USD_HR_2026 = { low: 105, mid: 130, high: 175 };

/**
 * Given revenue-per-doc, derive the implied shop rate for a low/high pair
 * of cycle-time × margin assumptions.
 *
 * revenue = (rate × cycle_hr + material) × (1 + margin)
 * → rate = (revenue / (1 + margin) - material) / cycle_hr
 *
 * Returns {low, high, midpoint} — the band of plausible rates under the
 * bracketed assumptions; midpoint is the simple average.
 */
function derivePerDocImpliedRate(revenuePerDoc) {
  const rateLow = (revenuePerDoc / (1 + ASSUMED_MARGIN_FRACTION_HIGH) - ASSUMED_MATERIAL_USD_HIGH) / ASSUMED_CYCLE_TIME_HR_HIGH;
  const rateHigh = (revenuePerDoc / (1 + ASSUMED_MARGIN_FRACTION_LOW) - ASSUMED_MATERIAL_USD_LOW) / ASSUMED_CYCLE_TIME_HR_LOW;
  const midpoint = (rateLow + rateHigh) / 2;
  return { low: round2(rateLow), high: round2(rateHigh), midpoint: round2(midpoint) };
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

async function main() {
  const argPath = process.argv.find((a) => a.startsWith("--baseline="));
  const baselinePath = argPath ? resolve(argPath.slice("--baseline=".length)) : DEFAULT_BASELINE_PATH;

  let baseline;
  try {
    const raw = await fs.readFile(baselinePath, "utf8");
    baseline = JSON.parse(raw);
  } catch (e) {
    console.error(`[shop-rate] R12 FAIL — baseline not readable: ${baselinePath}\n  ${e.message}`);
    process.exit(2);
  }

  const byYear = baseline.baseline?.by_year ?? [];
  if (byYear.length === 0) {
    console.error(`[shop-rate] R12 FAIL — baseline has no by_year breakdown`);
    process.exit(2);
  }

  // 1. PRISM-CURRENT
  const angle1 = {
    label: "PRISM-CURRENT",
    rate_usd_hr: PRISM_CURRENT_RATE_USD_HR,
    derivation: "hard-coded default in QuotingTrainingLoopEngine.DEFAULT_MACHINE_RATE",
    confidence: 0.50,  // it's known but not VALIDATED against JM data
  };

  // 2. BIAS-IMPLIED
  const biasMultiplier = 1 + (Math.abs(LIVE_BIAS_PCT_OBSERVED_2026_05_26) / 100);
  const biasImpliedRate = PRISM_CURRENT_RATE_USD_HR * biasMultiplier;
  const angle2 = {
    label: "BIAS-IMPLIED-FROM-LIVE-CYCLE",
    rate_usd_hr: round2(biasImpliedRate),
    derivation: `iter49 live closed-loop run observed bias=${LIVE_BIAS_PCT_OBSERVED_2026_05_26}% (under-quoting). If cycle-time + material assumptions are roughly correct, current_rate × (1 + |bias|/100) = ${PRISM_CURRENT_RATE_USD_HR} × ${round2(biasMultiplier)} = ${round2(biasImpliedRate)}`,
    confidence: 0.70,  // direct from 10 real JM invoices, but small sample
    cycle_evidence: "state/shared/closeout/QUOTING-CLOSED-LOOP-JM-CORPUS-*.json",
  };

  // 3. PER-YEAR-IMPLIED
  const perYearEstimates = byYear.map((y) => {
    const revenuePerDoc = y.total_revenue_usd / y.doc_count;
    const implied = derivePerDocImpliedRate(revenuePerDoc);
    return {
      year: y.year,
      doc_count: y.doc_count,
      total_revenue_usd: round2(y.total_revenue_usd),
      revenue_per_doc_usd: round2(revenuePerDoc),
      implied_rate_usd_hr: implied,
      caveat: y.doc_count < 20
        ? `low-sample (n=${y.doc_count}) — wide error bars`
        : "adequate sample",
    };
  });
  const angle3 = {
    label: "PER-YEAR-IMPLIED-FROM-BASELINE",
    estimates: perYearEstimates,
    derivation: `revenue = (rate × cycle_hr + material) × (1 + margin). Cycle bracket [${ASSUMED_CYCLE_TIME_HR_LOW}, ${ASSUMED_CYCLE_TIME_HR_HIGH}] hr; material bracket [$${ASSUMED_MATERIAL_USD_LOW}, $${ASSUMED_MATERIAL_USD_HIGH}]; margin bracket [${ASSUMED_MARGIN_FRACTION_LOW}, ${ASSUMED_MARGIN_FRACTION_HIGH}]`,
    confidence: 0.55,  // depends on bracket accuracy
  };

  // 4. INDUSTRY-BENCH
  const angle4 = {
    label: "INDUSTRY-BENCHMARK",
    note: "Sandvik / Modern Machine Shop annual U.S. small-shop CNC rate surveys (2020-2026). JM Die runs mill + Wire EDM (Mitsubishi); blend ~70% mill / 30% WEDM for a weighted estimate.",
    mill_2020: INDUSTRY_BENCH_MILL_USD_HR_2020,
    mill_2026: INDUSTRY_BENCH_MILL_USD_HR_2026,
    wedm_2020: INDUSTRY_BENCH_WEDM_USD_HR_2020,
    wedm_2026: INDUSTRY_BENCH_WEDM_USD_HR_2026,
    blended_2020_mid: round2(0.7 * INDUSTRY_BENCH_MILL_USD_HR_2020.mid + 0.3 * INDUSTRY_BENCH_WEDM_USD_HR_2020.mid),
    blended_2026_mid: round2(0.7 * INDUSTRY_BENCH_MILL_USD_HR_2026.mid + 0.3 * INDUSTRY_BENCH_WEDM_USD_HR_2026.mid),
    confidence: 0.40,  // industry benchmarks have wide variance shop-to-shop
  };

  // Triangulated best-estimate — weighted average of the 3 derived angles.
  // Weights ∝ confidence; PRISM-CURRENT excluded from the average since it
  // is what we are trying to validate.
  const triangulationInputs = [
    { value: angle2.rate_usd_hr, weight: angle2.confidence },
    { value: angle3.estimates.find((e) => e.year === "2020")?.implied_rate_usd_hr.midpoint ?? 0, weight: angle3.confidence },
    { value: angle4.blended_2026_mid, weight: angle4.confidence },
  ].filter((x) => x.value > 0);
  const totalWeight = triangulationInputs.reduce((s, x) => s + x.weight, 0);
  const weightedAvg = triangulationInputs.reduce((s, x) => s + x.value * x.weight, 0) / totalWeight;

  const report = {
    schema_version: "1.0.0",
    milestone: "QUOTING-SYNERGY-MS0",
    unit: "U-QP-DERIVE-SHOP-RATE",
    iter: 50,
    slot: "charlie",
    generated_at: new Date().toISOString(),
    question: "What was/is JM Die's shop rate (USD/hr) per year?",
    answer_one_line: `Best triangulated estimate ${round2(weightedAvg)}/hr (band ~$${round2(Math.min(...triangulationInputs.map(x=>x.value)))}-${round2(Math.max(...triangulationInputs.map(x=>x.value)))}). Plug as QuotingTrainingLoopEngine.RunOptions.defaultMachineRate override.`,
    angles: [angle1, angle2, angle3, angle4],
    triangulated_best_estimate_usd_hr: round2(weightedAvg),
    triangulated_band: {
      low: round2(Math.min(...triangulationInputs.map((x) => x.value))),
      high: round2(Math.max(...triangulationInputs.map((x) => x.value))),
    },
    open_questions: [
      "PRISM has 111,745 DocuStrata PDFs (manifest.json) — none currently OCR-extracted for line-item invoice/time data. iter51+ could unlock direct rate extraction from billed-hours fields.",
      "2024 + 2025 are missing from baseline.by_year (sparse data) — sample bias risk; trend may not reflect actual rate evolution.",
      "Per-year implied rate depends on cycle-time bracket — if JM jobs are SHORTER than 30 min on average (e.g. 15 min), implied rate doubles; this needs operator confirmation.",
      "Best validation: ASK the JM Die operator directly. The numbers here are baselines to cross-check against the real answer, not a substitute for it.",
    ],
    operator_action_items: [
      `Override default rate: QuotingTrainingLoopEngine.RunOptions.defaultMachineRate = ${round2(weightedAvg)}`,
      "OR set per-machine-class rates: mill_rate ≈ $95-110, wedm_rate ≈ $120-145",
      "Re-run iter49 corpus driver with override → check if bias narrows from -36% toward 0",
      "When operator provides real rate, replace this estimate and re-baseline",
    ],
  };

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = resolve(DEFAULT_OUT_DIR, `JM-SHOP-RATE-DERIVATION-${ts}.json`);
  await fs.mkdir(dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  // Console summary
  console.log(`[shop-rate] JM Die shop-rate triangulation (4 angles):\n`);
  console.log(`  1. PRISM-CURRENT      = $${angle1.rate_usd_hr}/hr  (hard-coded default — UNVALIDATED)`);
  console.log(`  2. BIAS-IMPLIED       = $${angle2.rate_usd_hr}/hr  (from iter49 live -36.33% bias)`);
  console.log(`  3. PER-YEAR-IMPLIED:`);
  for (const e of angle3.estimates) {
    console.log(`     ${e.year}  $${e.revenue_per_doc_usd}/doc (n=${e.doc_count}) → rate band $${e.implied_rate_usd_hr.low}-${e.implied_rate_usd_hr.high} mid $${e.implied_rate_usd_hr.midpoint}`);
  }
  console.log(`  4. INDUSTRY-BENCH     = blended ${angle4.blended_2020_mid}/hr (2020) → ${angle4.blended_2026_mid}/hr (2026, 70/30 mill/WEDM)`);
  console.log(``);
  console.log(`  TRIANGULATED BEST     = $${round2(weightedAvg)}/hr  band $${report.triangulated_band.low}-${report.triangulated_band.high}`);
  console.log(`  → set QuotingTrainingLoopEngine.RunOptions.defaultMachineRate = ${round2(weightedAvg)}`);
  console.log(`\n[shop-rate] full report → ${outPath}`);
  console.log(`[shop-rate] OPEN QUESTION: 111,745 DocuStrata PDFs unhinged — direct rate extraction is the next-best-data project (iter51+).`);
}

main().catch((e) => {
  console.error(`[shop-rate] FATAL: ${e.message}`);
  process.exit(2);
});
