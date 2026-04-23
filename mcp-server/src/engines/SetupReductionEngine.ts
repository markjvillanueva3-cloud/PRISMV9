/**
 * SetupReductionEngine — Setup Time Analysis & SMED Calculator
 *
 * Calculates setup reduction opportunities:
 * - Internal vs external time classification
 * - SMED savings potential
 * - Quick-change fixture ROI
 * - Batch size economic impact
 * - Setup time per part (amortized)
 * - Changeover frequency optimization
 *
 * Key physics: Setup cost/part = setup_time × machine_rate / batch_size.
 * SMED converts internal (machine stopped) to external (machine running).
 * Typical reduction: 50-75% on first SMED pass. Quick-change fixtures
 * reduce locate/clamp from 15-30min to 1-3min.
 *
 * Reference: Shigeo Shingo — SMED system,
 *            Toyota Production System,
 *            Lean Manufacturing handbook
 *
 * Actions: setup_reduction_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SetupReductionInput {
  current_setup_min: number;
  internal_pct?: number;
  machine_rate_per_hour?: number;
  batch_size?: number;
  batches_per_month?: number;
  quick_change_cost?: number;
  smed_target_min?: number;
  cycle_time_min?: number;
  setup_steps?: { name: string; minutes: number; internal: boolean }[];
}

export interface SetupReductionResult {
  current_internal_min: AtomicValue;
  current_external_min: AtomicValue;
  smed_estimated_min: AtomicValue;
  savings_per_setup_min: AtomicValue;
  savings_per_month_hr: AtomicValue;
  setup_cost_per_part_before: AtomicValue;
  setup_cost_per_part_after: AtomicValue;
  annual_savings: AtomicValue;
  quick_change_roi_months: AtomicValue;
  optimal_batch_size: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class SetupReductionEngine {
  calculate(input: SetupReductionInput): SetupReductionResult {
    const warnings: string[] = [];
    const currentSetup = input.current_setup_min;
    const internalPct = input.internal_pct ?? 70;
    const machRate = input.machine_rate_per_hour ?? 85;
    const batchSize = input.batch_size ?? 50;
    const batchesMonth = input.batches_per_month ?? 20;
    const qcCost = input.quick_change_cost ?? 5000;
    const cycleTime = input.cycle_time_min ?? 3;

    // Current breakdown
    const currentInternal = currentSetup * internalPct / 100;
    const currentExternal = currentSetup - currentInternal;

    // SMED estimation
    // Step 1: Convert 50% of internal to external
    // Step 2: Streamline remaining internal by 30%
    const convertible = currentInternal * 0.5;
    const remainingInternal = (currentInternal - convertible) * 0.7;
    const smedTarget = input.smed_target_min
      ?? Math.max(remainingInternal + currentExternal * 0.5, 3);
    const smedEstimated = Math.max(smedTarget, 2);

    // Savings
    const savingsPerSetup = currentSetup - smedEstimated;
    const savingsMonthHr = (savingsPerSetup * batchesMonth) / 60;
    const machRateMin = machRate / 60;

    // Setup cost per part
    const costBefore = (currentSetup * machRateMin) / batchSize;
    const costAfter = (smedEstimated * machRateMin) / batchSize;

    // Annual savings
    const annualSavings = savingsMonthHr * 12 * machRate;

    // Quick-change ROI
    const roiMonths = annualSavings > 0
      ? (qcCost / (annualSavings / 12))
      : 999;

    // Optimal batch size (where setup cost/part ≈ 5% of cycle cost)
    const targetSetupCostPct = 0.05;
    const cycleCostPerPart = cycleTime * machRateMin;
    const optimalBatch = cycleCostPerPart > 0
      ? Math.ceil((smedEstimated * machRateMin) /
          (targetSetupCostPct * cycleCostPerPart))
      : batchSize;

    // Warnings
    if (currentSetup > 60) {
      warnings.push(
        `Setup ${currentSetup}min is excessive — ` +
        "major SMED opportunity"
      );
    }
    if (costBefore > cycleCostPerPart * 0.2) {
      warnings.push(
        `Setup cost/part $${r2(costBefore)} is >20% of cycle cost — ` +
        "increase batch size or reduce setup"
      );
    }
    if (internalPct > 80) {
      warnings.push(
        `${internalPct}% internal time — ` +
        "large conversion opportunity to external"
      );
    }
    if (roiMonths < 6) {
      warnings.push(
        `Quick-change ROI in ${r1(roiMonths)} months — ` +
        "strong investment case"
      );
    }
    if (savingsPerSetup > 30) {
      warnings.push(
        `SMED can save ${r0(savingsPerSetup)}min per setup — ` +
        "prioritize implementation"
      );
    }

    return {
      current_internal_min: mkAv(r1(currentInternal), "min", 1,
        `${internalPct}% of ${currentSetup}min`),
      current_external_min: mkAv(r1(currentExternal), "min", 1,
        `${100 - internalPct}% of ${currentSetup}min`),
      smed_estimated_min: mkAv(r1(smedEstimated), "min", 2,
        "Convert 50% internal + streamline 30%"),
      savings_per_setup_min: mkAv(r1(savingsPerSetup), "min", 2,
        `${currentSetup} - ${r1(smedEstimated)}`),
      savings_per_month_hr: mkAv(r1(savingsMonthHr), "hr/month", 0.5,
        `${r1(savingsPerSetup)}min × ${batchesMonth} batches`),
      setup_cost_per_part_before: mkAv(r2(costBefore), "$/part", 0.05,
        `$${machRate}/hr × ${currentSetup}min / ${batchSize}`),
      setup_cost_per_part_after: mkAv(r2(costAfter), "$/part", 0.05,
        `$${machRate}/hr × ${r1(smedEstimated)}min / ${batchSize}`),
      annual_savings: mkAv(r0(annualSavings), "$/year", 50,
        `${r1(savingsMonthHr)}hr × 12 × $${machRate}/hr`),
      quick_change_roi_months: mkAv(r1(Math.min(roiMonths, 999)),
        "months", 0.5,
        `$${qcCost} / monthly savings`),
      optimal_batch_size: mkAv(optimalBatch, "pcs", 1,
        "Setup cost = 5% of cycle cost"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const setupReductionEngine = new SetupReductionEngine();
