/**
 * ScenarioBatchRunnerEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT08
 *
 * Composes the full scenario pipeline at scale:
 *   ScenarioGenerator → XometryStyleQuote → OutsourceRecommender → AggregateMetrics
 *
 * Runs N scenarios (deterministic via seed), tracks per-process + per-material
 * MAPE, per-recommendation outsource distribution, and emits the aggregate
 * report the operator + the deep-reasoning bridge consume.
 *
 * Per R12 (fail-loud): every scenario that fails to quote is counted in the
 * `failed_scenarios` bucket; never silently dropped. Per R10 (reproducibility):
 * same seed → same aggregate metrics across runs.
 *
 * @milestone JM-DIE-QUOTE-TRAINING-MS0/U-QT08
 * @author slot:charlie /goal-18 iter1, 2026-05-24
 */

import { xometryStyleQuoteInputsEngine, type XometryQuoteInputs, type QuoteMaterial, type QuoteProcess } from "./XometryStyleQuoteInputsEngine.js";
import { outsourceRecommenderEngine, type OutsourceRecommendation } from "./OutsourceRecommenderEngine.js";
import { quoteScenarioGeneratorEngine } from "./QuoteScenarioGeneratorEngine.js";

export interface ScenarioOutcome {
  index: number;
  inputs: XometryQuoteInputs;
  ok: boolean;
  fmv_per_part_usd: number | null;
  fmv_total_lot_usd: number | null;
  expedited_total_usd: number | null;
  volume_cm3: number | null;
  time_in_cut_s_per_part: number | null;
  outsource_recommendation: OutsourceRecommendation | null;
  outsource_savings_usd: number | null;
  fail_reason?: string;
}

export interface BatchRunReport {
  ok: boolean;
  total_scenarios: number;
  quoted: number;
  failed: number;
  outsource_distribution: Record<OutsourceRecommendation, number>;
  by_process_mape: Record<QuoteProcess, { count: number; mean_fmv_usd: number; mean_time_s: number }>;
  by_material_mape: Record<QuoteMaterial, { count: number; mean_fmv_usd: number }>;
  aggregate_metrics: {
    mean_fmv_per_part_usd: number;
    mean_fmv_lot_usd: number;
    mean_time_in_cut_s: number;
    total_revenue_simulated_usd: number;
  };
  outcomes: ScenarioOutcome[];   // empty if includeOutcomes=false
  reason?: string;
}

export interface BatchRunOptions {
  count: number;
  seed?: number;
  shopLoadingPct?: number;
  asOfIsoDate?: string;
  /** Include per-scenario outcomes in report (default false for memory at scale). */
  includeOutcomes?: boolean;
}

const DEFAULT_SHOP_LOADING_PCT = 50;

export class ScenarioBatchRunnerEngine {
  run(opts: BatchRunOptions): BatchRunReport {
    const empty: BatchRunReport = {
      ok: false,
      total_scenarios: 0, quoted: 0, failed: 0,
      outsource_distribution: { "in-house": 0, "outsource": 0, "toss-up": 0 },
      by_process_mape: {
        mill: { count: 0, mean_fmv_usd: 0, mean_time_s: 0 },
        lathe: { count: 0, mean_fmv_usd: 0, mean_time_s: 0 },
        wedm: { count: 0, mean_fmv_usd: 0, mean_time_s: 0 },
        sinker_edm: { count: 0, mean_fmv_usd: 0, mean_time_s: 0 },
      },
      by_material_mape: {
        aluminum_6061: { count: 0, mean_fmv_usd: 0 },
        steel_a36: { count: 0, mean_fmv_usd: 0 },
        stainless_304: { count: 0, mean_fmv_usd: 0 },
        copper_c110: { count: 0, mean_fmv_usd: 0 },
      },
      aggregate_metrics: { mean_fmv_per_part_usd: 0, mean_fmv_lot_usd: 0, mean_time_in_cut_s: 0, total_revenue_simulated_usd: 0 },
      outcomes: [],
    };
    if (!opts || !Number.isInteger(opts.count) || opts.count <= 0) {
      return { ...empty, reason: "count-must-be-positive-integer" };
    }
    const includeOutcomes = !!opts.includeOutcomes;
    const shopLoading = opts.shopLoadingPct ?? DEFAULT_SHOP_LOADING_PCT;
    const batch = quoteScenarioGeneratorEngine.generate({ count: opts.count, seed: opts.seed });
    if (!batch.ok) return { ...empty, reason: batch.reason };

    const outcomes: ScenarioOutcome[] = [];
    const procSums: Record<QuoteProcess, { count: number; sumFmv: number; sumTime: number }> = {
      mill: { count: 0, sumFmv: 0, sumTime: 0 },
      lathe: { count: 0, sumFmv: 0, sumTime: 0 },
      wedm: { count: 0, sumFmv: 0, sumTime: 0 },
      sinker_edm: { count: 0, sumFmv: 0, sumTime: 0 },
    };
    const matSums: Record<QuoteMaterial, { count: number; sumFmv: number }> = {
      aluminum_6061: { count: 0, sumFmv: 0 },
      steel_a36: { count: 0, sumFmv: 0 },
      stainless_304: { count: 0, sumFmv: 0 },
      copper_c110: { count: 0, sumFmv: 0 },
    };
    const outsourceDist: Record<OutsourceRecommendation, number> = { "in-house": 0, "outsource": 0, "toss-up": 0 };
    let totalFmvPerPart = 0;
    let totalFmvLot = 0;
    let totalTime = 0;
    let totalRevenue = 0;
    let quoted = 0;
    let failed = 0;

    const inputDate = opts.asOfIsoDate ?? new Date().toISOString().slice(0, 10);

    for (let i = 0; i < batch.scenarios.length; i++) {
      const scn = { ...batch.scenarios[i], asOfIsoDate: inputDate };
      const q = xometryStyleQuoteInputsEngine.quote(scn);
      if (!q.ok) {
        failed++;
        if (includeOutcomes) {
          outcomes.push({
            index: i, inputs: scn, ok: false,
            fmv_per_part_usd: null, fmv_total_lot_usd: null, expedited_total_usd: null,
            volume_cm3: null, time_in_cut_s_per_part: null,
            outsource_recommendation: null, outsource_savings_usd: null,
            fail_reason: q.reason,
          });
        }
        continue;
      }
      const o = outsourceRecommenderEngine.recommend({
        in_house_total_usd: q.fmv_total_lot_usd,
        in_house_lead_time_days: scn.lead_time_days,
        process: scn.process, material: scn.material,
        tolerance_class: scn.tolerance_class, quantity: scn.quantity,
        shop_loading_pct: shopLoading,
      }, q.volume_cm3);

      quoted++;
      totalFmvPerPart += q.fmv_per_part_usd;
      totalFmvLot += q.fmv_total_lot_usd;
      totalTime += q.time_in_cut_s_per_part;
      totalRevenue += q.expedited_total_usd;
      procSums[scn.process].count++;
      procSums[scn.process].sumFmv += q.fmv_per_part_usd;
      procSums[scn.process].sumTime += q.time_in_cut_s_per_part;
      matSums[scn.material].count++;
      matSums[scn.material].sumFmv += q.fmv_per_part_usd;
      if (o.ok) outsourceDist[o.recommendation]++;

      if (includeOutcomes) {
        outcomes.push({
          index: i, inputs: scn, ok: true,
          fmv_per_part_usd: q.fmv_per_part_usd,
          fmv_total_lot_usd: q.fmv_total_lot_usd,
          expedited_total_usd: q.expedited_total_usd,
          volume_cm3: q.volume_cm3,
          time_in_cut_s_per_part: q.time_in_cut_s_per_part,
          outsource_recommendation: o.ok ? o.recommendation : null,
          outsource_savings_usd: o.ok ? o.savings_usd : null,
        });
      }
    }

    const denom = quoted > 0 ? quoted : 1;
    return {
      ok: true,
      total_scenarios: batch.scenarios.length,
      quoted, failed,
      outsource_distribution: outsourceDist,
      by_process_mape: {
        mill:       { count: procSums.mill.count,       mean_fmv_usd: round2(procSums.mill.sumFmv       / Math.max(procSums.mill.count, 1)),       mean_time_s: round2(procSums.mill.sumTime       / Math.max(procSums.mill.count, 1)) },
        lathe:      { count: procSums.lathe.count,      mean_fmv_usd: round2(procSums.lathe.sumFmv      / Math.max(procSums.lathe.count, 1)),      mean_time_s: round2(procSums.lathe.sumTime      / Math.max(procSums.lathe.count, 1)) },
        wedm:       { count: procSums.wedm.count,       mean_fmv_usd: round2(procSums.wedm.sumFmv       / Math.max(procSums.wedm.count, 1)),       mean_time_s: round2(procSums.wedm.sumTime       / Math.max(procSums.wedm.count, 1)) },
        sinker_edm: { count: procSums.sinker_edm.count, mean_fmv_usd: round2(procSums.sinker_edm.sumFmv / Math.max(procSums.sinker_edm.count, 1)), mean_time_s: round2(procSums.sinker_edm.sumTime / Math.max(procSums.sinker_edm.count, 1)) },
      },
      by_material_mape: {
        aluminum_6061: { count: matSums.aluminum_6061.count, mean_fmv_usd: round2(matSums.aluminum_6061.sumFmv / Math.max(matSums.aluminum_6061.count, 1)) },
        steel_a36:     { count: matSums.steel_a36.count,     mean_fmv_usd: round2(matSums.steel_a36.sumFmv     / Math.max(matSums.steel_a36.count, 1)) },
        stainless_304: { count: matSums.stainless_304.count, mean_fmv_usd: round2(matSums.stainless_304.sumFmv / Math.max(matSums.stainless_304.count, 1)) },
        copper_c110:   { count: matSums.copper_c110.count,   mean_fmv_usd: round2(matSums.copper_c110.sumFmv   / Math.max(matSums.copper_c110.count, 1)) },
      },
      aggregate_metrics: {
        mean_fmv_per_part_usd: round2(totalFmvPerPart / denom),
        mean_fmv_lot_usd: round2(totalFmvLot / denom),
        mean_time_in_cut_s: round2(totalTime / denom),
        total_revenue_simulated_usd: round2(totalRevenue),
      },
      outcomes: includeOutcomes ? outcomes : [],
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const scenarioBatchRunnerEngine = new ScenarioBatchRunnerEngine();
