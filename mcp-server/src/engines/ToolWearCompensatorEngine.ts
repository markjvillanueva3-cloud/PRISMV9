/**
 * R18-MS4: Tool Wear Compensator Engine
 *
 * Adaptive tool wear prediction and compensation:
 *   - twc_predict:     Predict tool wear at time T using Taylor + calibration
 *   - twc_compensate:  Calculate compensation offsets for dimensional accuracy
 *   - twc_schedule:    Optimal tool change scheduling (cost vs quality)
 *   - twc_history:     Track and analyze historical wear data
 *
 * Combines: R15 Taylor tool life, R17 measurement feedback, R17 calibration
 * References: ISO 3685 (tool life testing), Stephenson & Agapiou
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface WearPredictInput {
  cutting_time_min: number;
  cutting_speed_mpm: number;
  feed_per_tooth_mm?: number;
  depth_of_cut_mm?: number;
  material?: string;
  tool_material?: string;
  taylor_C?: number;
  taylor_n?: number;
  // Extended Taylor: VT^n × f^a × ap^b = C
  taylor_a?: number;   // feed exponent
  taylor_b?: number;   // depth exponent
  coolant?: boolean;
}

interface WearPredictResult {
  action: "twc_predict";
  tool_life_min: number;
  wear_ratio: number;        // cutting_time / tool_life (0-1)
  wear_state: string;        // "fresh" | "normal" | "approaching_limit" | "exceeded"
  flank_wear_mm: number;     // Estimated VB (mm)
  remaining_life_min: number;
  remaining_life_pct: number;
  dimensional_error_mm: number;  // Expected error due to wear
  surface_degradation_pct: number;
  force_increase_pct: number;
  recommendations: string[];
}

interface CompensateInput {
  cutting_time_min: number;
  cutting_speed_mpm: number;
  feed_per_tooth_mm?: number;
  depth_of_cut_mm?: number;
  material?: string;
  tool_material?: string;
  taylor_C?: number;
  taylor_n?: number;
  nominal_dimension_mm: number;
  tolerance_mm: number;
  compensation_axis?: "x" | "z" | "radial";
  current_offset_mm?: number;
}

interface CompensateResult {
  action: "twc_compensate";
  predicted_wear_mm: number;
  dimensional_error_mm: number;
  required_offset_mm: number;
  total_offset_mm: number;  // current + required
  within_tolerance: boolean;
  tolerance_consumed_pct: number;
  next_check_at_min: number;
  compensation_schedule: Array<{
    time_min: number;
    offset_mm: number;
    cumulative_offset_mm: number;
    wear_ratio: number;
  }>;
}

interface ScheduleInput {
  cutting_speed_mpm: number;
  feed_per_tooth_mm?: number;
  depth_of_cut_mm?: number;
  material?: string;
  taylor_C?: number;
  taylor_n?: number;
  tool_cost_usd?: number;
  change_time_min?: number;
  machine_rate_usd_per_min?: number;
  tolerance_mm?: number;
  target_quality?: "standard" | "precision" | "ultra_precision";
  batch_size?: number;
  cycle_time_min?: number;
}

interface ScheduleResult {
  action: "twc_schedule";
  optimal_change_interval_min: number;
  changes_per_shift: number;
  cost_per_part_tooling_usd: number;
  cost_per_part_downtime_usd: number;
  total_cost_per_part_usd: number;
  quality_factor: number;       // 0-1, higher = better quality
  productivity_factor: number;  // 0-1, higher = more productive
  alternatives: Array<{
    strategy: string;
    change_interval_min: number;
    cost_per_part_usd: number;
    quality_factor: number;
    trade_off: string;
  }>;
}

interface WearRecord {
  time_min: number;
  flank_wear_mm: number;
  cutting_speed_mpm: number;
  material?: string;
}

interface HistoryResult {
  action: "twc_history";
  records: number;
  avg_tool_life_min: number;
  std_tool_life_min: number;
  min_tool_life_min: number;
  max_tool_life_min: number;
  wear_rate_mm_per_min: number;
  wear_model: {
    type: string;     // "linear" | "taylor_fit"
    coefficients: Record<string, number>;
    r_squared: number;
  };
  trend: string;
  anomalies: Array<{ index: number; reason: string }>;
  recommendations: string[];
}

// ============================================================================
// MATERIAL DEFAULTS
// ============================================================================

interface TaylorDefaults {
  C: number;
  n: number;
  a: number;   // feed exponent
  b: number;   // depth exponent
  coolant_factor: number;
}

const TAYLOR_DEFAULTS: Record<string, TaylorDefaults> = {
  steel_carbide: { C: 350, n: 0.25, a: 0.12, b: 0.08, coolant_factor: 1.3 },
  steel_hss: { C: 120, n: 0.125, a: 0.15, b: 0.10, coolant_factor: 1.5 },
  aluminum_carbide: { C: 800, n: 0.35, a: 0.10, b: 0.06, coolant_factor: 1.1 },
  titanium_carbide: { C: 80, n: 0.18, a: 0.14, b: 0.10, coolant_factor: 1.4 },
  stainless_carbide: { C: 200, n: 0.20, a: 0.13, b: 0.09, coolant_factor: 1.4 },
  cast_iron_carbide: { C: 400, n: 0.28, a: 0.11, b: 0.07, coolant_factor: 1.2 },
  inconel_carbide: { C: 40, n: 0.15, a: 0.15, b: 0.12, coolant_factor: 1.5 },
};

function getTaylorDefaults(material?: string, toolMaterial?: string): TaylorDefaults {
  const mat = (material ?? "steel").toLowerCase().replace(/[\s-]/g, "_");
  const tool = (toolMaterial ?? "carbide").toLowerCase();
  const key = `${mat}_${tool}`;
  // Try exact match, then partial
  if (TAYLOR_DEFAULTS[key]) return TAYLOR_DEFAULTS[key];
  for (const [k, v] of Object.entries(TAYLOR_DEFAULTS)) {
    if (k.startsWith(mat) || k.includes(mat)) return v;
  }
  return TAYLOR_DEFAULTS.steel_carbide;
}

// ============================================================================
// WEAR PHYSICS
// ============================================================================

/** Extended Taylor tool life: T = (C / (vc × f^a × ap^b))^(1/n) */
function extendedTaylorLife(
  vc: number, fz: number, ap: number,
  C: number, n: number, a: number, b: number,
  coolant: boolean, coolantFactor: number
): number {
  const effectiveC = coolant ? C * coolantFactor : C;
  const adjustedVc = vc * Math.pow(Math.max(fz, 0.01), a) * Math.pow(Math.max(ap, 0.1), b);
  if (adjustedVc <= 0) return 9999;
  return Math.pow(effectiveC / adjustedVc, 1 / n);
}

/** Flank wear VB (mm) as function of time ratio
 *  Three-zone model: break-in → steady-state → rapid
 *  VB = VB0 + k1×t^0.5 (break-in) + k2×t (steady) + k3×e^(k4×(t-0.8T)) (rapid) */
function flankWear(timeRatio: number, toolLifeMin: number): number {
  const r = Math.min(Math.max(timeRatio, 0), 1.5);
  const VB0 = 0.02;  // Initial break-in wear (mm)

  if (r <= 0.1) {
    // Break-in zone: rapid initial wear
    return VB0 + 0.08 * Math.sqrt(r / 0.1);
  } else if (r <= 0.8) {
    // Steady-state zone: linear wear
    const breakInWear = VB0 + 0.08;
    return breakInWear + 0.2 * ((r - 0.1) / 0.7);
  } else {
    // Rapid wear zone: exponential
    const steadyWear = VB0 + 0.08 + 0.2;
    const excess = r - 0.8;
    return steadyWear + 0.1 * (Math.exp(3 * excess) - 1);
  }
}

/** Dimensional error due to tool wear (mm) — nose wear → radial shift */
function dimensionalError(flankWearMM: number): number {
  // Approximate: dimensional error ≈ 0.5 × VB (radial component)
  return flankWearMM * 0.5;
}

/** Surface finish degradation from wear (%) */
function surfaceDegradation(wearRatio: number): number {
  // Ra increases ~quadratically with wear
  return Math.min(wearRatio ** 1.5 * 100, 200);
}

/** Cutting force increase from wear (%) */
function forceIncrease(flankWearMM: number): number {
  // Force increases linearly with VB (flank contact area)
  return Math.min(flankWearMM * 100, 150);  // up to 150% increase
}

// ============================================================================
// ACTION: twc_predict
// ============================================================================

function predictWear(params: Record<string, unknown>): WearPredictResult {
  const input = params as unknown as WearPredictInput;
  const cutTime = Number(input.cutting_time_min);
  const vc = Number(input.cutting_speed_mpm);
  if (!cutTime || !vc) throw new Error("[ToolWearCompensator] twc_predict: cutting_time_min and cutting_speed_mpm required");

  const fz = Number(input.feed_per_tooth_mm ?? 0.15);
  const ap = Number(input.depth_of_cut_mm ?? 2.0);
  const coolant = input.coolant !== false;

  const defaults = getTaylorDefaults(input.material as string, input.tool_material as string);
  const C = Number(input.taylor_C ?? defaults.C);
  const n = Number(input.taylor_n ?? defaults.n);
  const a = Number(input.taylor_a ?? defaults.a);
  const b = Number(input.taylor_b ?? defaults.b);

  const toolLife = extendedTaylorLife(vc, fz, ap, C, n, a, b, coolant, defaults.coolant_factor);
  const wearRatio = cutTime / toolLife;
  const vb = flankWear(wearRatio, toolLife);
  const dimError = dimensionalError(vb);
  const surfDeg = surfaceDegradation(wearRatio);
  const forceInc = forceIncrease(vb);
  const remaining = Math.max(toolLife - cutTime, 0);
  const remainingPct = (remaining / toolLife) * 100;

  let wearState: string;
  if (wearRatio < 0.1) wearState = "fresh";
  else if (wearRatio < 0.7) wearState = "normal";
  else if (wearRatio < 1.0) wearState = "approaching_limit";
  else wearState = "exceeded";

  const recommendations: string[] = [];
  if (wearState === "approaching_limit") {
    recommendations.push(`Tool approaching end of life — ${remaining.toFixed(1)} min remaining`);
    recommendations.push(`Apply wear offset of ${dimError.toFixed(4)}mm to maintain accuracy`);
  }
  if (wearState === "exceeded") {
    recommendations.push("CRITICAL: Tool life exceeded — immediate tool change required");
    recommendations.push(`Estimated dimensional error: ${dimError.toFixed(4)}mm — parts may be out of tolerance`);
  }
  if (surfDeg > 50) {
    recommendations.push(`Surface finish degraded by ${surfDeg.toFixed(0)}% — may affect Ra requirements`);
  }
  if (forceInc > 30) {
    recommendations.push(`Cutting force increased by ${forceInc.toFixed(0)}% — monitor for chatter/vibration`);
  }

  log.info(`[ToolWearCompensator] Predict: T=${cutTime}min, life=${toolLife.toFixed(1)}min, VB=${vb.toFixed(3)}mm, state=${wearState}`);

  return {
    action: "twc_predict",
    tool_life_min: round4(toolLife),
    wear_ratio: round4(wearRatio),
    wear_state: wearState,
    flank_wear_mm: round4(vb),
    remaining_life_min: round4(remaining),
    remaining_life_pct: round4(remainingPct),
    dimensional_error_mm: round4(dimError),
    surface_degradation_pct: round4(surfDeg),
    force_increase_pct: round4(forceInc),
    recommendations,
  };
}

// ============================================================================
// ACTION: twc_compensate
// ============================================================================

function compensateWear(params: Record<string, unknown>): CompensateResult {
  const input = params as unknown as CompensateInput;
  const cutTime = Number(input.cutting_time_min);
  const vc = Number(input.cutting_speed_mpm);
  const nomDim = Number(input.nominal_dimension_mm);
  const tol = Number(input.tolerance_mm);
  if (!cutTime || !vc || !nomDim || !tol) {
    throw new Error("[ToolWearCompensator] twc_compensate: cutting_time_min, cutting_speed_mpm, nominal_dimension_mm, tolerance_mm required");
  }

  const defaults = getTaylorDefaults(input.material as string, input.tool_material as string);
  const C = Number(input.taylor_C ?? defaults.C);
  const n = Number(input.taylor_n ?? defaults.n);
  const fz = Number(input.feed_per_tooth_mm ?? 0.15);
  const ap = Number(input.depth_of_cut_mm ?? 2.0);
  const toolLife = extendedTaylorLife(vc, fz, ap, C, n, defaults.a, defaults.b, true, defaults.coolant_factor);

  const wearRatio = cutTime / toolLife;
  const vb = flankWear(wearRatio, toolLife);
  const dimError = dimensionalError(vb);
  const currentOffset = Number(input.current_offset_mm ?? 0);
  const requiredOffset = -dimError;  // Compensate in opposite direction
  const totalOffset = currentOffset + requiredOffset;
  const tolConsumed = (Math.abs(dimError) / (tol / 2)) * 100;
  const withinTol = tolConsumed < 100;

  // Build compensation schedule (every 10% of tool life)
  const schedule: CompensateResult["compensation_schedule"] = [];
  const steps = 10;
  let cumOffset = currentOffset;
  for (let i = 1; i <= steps; i++) {
    const ratio = i / steps;
    const stepTime = toolLife * ratio;
    const stepVB = flankWear(ratio, toolLife);
    const stepError = dimensionalError(stepVB);
    const stepOffset = -stepError - cumOffset;
    cumOffset += stepOffset;
    schedule.push({
      time_min: round4(stepTime),
      offset_mm: round4(stepOffset),
      cumulative_offset_mm: round4(cumOffset),
      wear_ratio: round4(ratio),
    });
  }

  // Next check: when wear will consume 50% of remaining tolerance
  const tolRemaining = (tol / 2) - Math.abs(dimError);
  const wearRate = dimError / Math.max(cutTime, 0.001);
  const nextCheck = wearRate !== 0 ? cutTime + Math.abs(tolRemaining * 0.5 / wearRate) : toolLife;

  log.info(`[ToolWearCompensator] Compensate: VB=${vb.toFixed(3)}, error=${dimError.toFixed(4)}, offset=${requiredOffset.toFixed(4)}, tol_consumed=${tolConsumed.toFixed(1)}%`);

  return {
    action: "twc_compensate",
    predicted_wear_mm: round4(vb),
    dimensional_error_mm: round4(dimError),
    required_offset_mm: round4(requiredOffset),
    total_offset_mm: round4(totalOffset),
    within_tolerance: withinTol,
    tolerance_consumed_pct: round4(tolConsumed),
    next_check_at_min: round4(Math.min(nextCheck, toolLife)),
    compensation_schedule: schedule,
  };
}

// ============================================================================
// ACTION: twc_schedule
// ============================================================================

function scheduleChanges(params: Record<string, unknown>): ScheduleResult {
  const input = params as unknown as ScheduleInput;
  const vc = Number(input.cutting_speed_mpm);
  if (!vc) throw new Error("[ToolWearCompensator] twc_schedule: cutting_speed_mpm required");

  const defaults = getTaylorDefaults(input.material as string);
  const C = Number(input.taylor_C ?? defaults.C);
  const n = Number(input.taylor_n ?? defaults.n);
  const fz = Number(input.feed_per_tooth_mm ?? 0.15);
  const ap = Number(input.depth_of_cut_mm ?? 2.0);
  const toolLife = extendedTaylorLife(vc, fz, ap, C, n, defaults.a, defaults.b, true, defaults.coolant_factor);

  const toolCost = Number(input.tool_cost_usd ?? 15);
  const changeTime = Number(input.change_time_min ?? 2);
  const machineRate = Number(input.machine_rate_usd_per_min ?? 1.5);
  const cycleTime = Number(input.cycle_time_min ?? 5);
  const batchSize = Number(input.batch_size ?? 100);
  const tolerance = Number(input.tolerance_mm ?? 0.05);

  // Quality factor: what fraction of tool life to use
  const qualityTargets: Record<string, number> = {
    standard: 0.85,       // Use 85% of tool life
    precision: 0.65,      // Use 65%
    ultra_precision: 0.45, // Use 45%
  };
  const qualityTarget = qualityTargets[input.target_quality ?? "standard"] ?? 0.85;

  const optimalInterval = toolLife * qualityTarget;
  const partsPerTool = Math.floor(optimalInterval / cycleTime);
  const changesPerBatch = Math.ceil(batchSize / partsPerTool);
  const shiftLength = 480;  // 8 hours
  const changesPerShift = Math.ceil(shiftLength / optimalInterval);

  // Cost analysis
  const toolCostPerPart = toolCost / Math.max(partsPerTool, 1);
  const downtimeCostPerPart = (changeTime * machineRate) / Math.max(partsPerTool, 1);
  const totalCostPerPart = toolCostPerPart + downtimeCostPerPart;

  // Quality factor: based on max wear at change time
  const maxWearRatio = optimalInterval / toolLife;
  const qualityFactor = 1 - maxWearRatio * 0.5;  // 0.5-1.0 range

  // Productivity factor
  const cuttingTime = optimalInterval;
  const totalCycleTime = cuttingTime + changeTime;
  const productivityFactor = cuttingTime / totalCycleTime;

  // Alternative strategies
  const alternatives: ScheduleResult["alternatives"] = [
    {
      strategy: "max_tool_life",
      change_interval_min: round4(toolLife * 0.95),
      cost_per_part_usd: round4(toolCost / Math.floor(toolLife * 0.95 / cycleTime) + (changeTime * machineRate) / Math.floor(toolLife * 0.95 / cycleTime)),
      quality_factor: round4(1 - 0.95 * 0.5),
      trade_off: "Lowest cost but risk of out-of-tolerance parts near end of life",
    },
    {
      strategy: "balanced",
      change_interval_min: round4(toolLife * 0.7),
      cost_per_part_usd: round4(toolCost / Math.floor(toolLife * 0.7 / cycleTime) + (changeTime * machineRate) / Math.floor(toolLife * 0.7 / cycleTime)),
      quality_factor: round4(1 - 0.7 * 0.5),
      trade_off: "Good balance between cost and quality consistency",
    },
    {
      strategy: "high_quality",
      change_interval_min: round4(toolLife * 0.5),
      cost_per_part_usd: round4(toolCost / Math.max(Math.floor(toolLife * 0.5 / cycleTime), 1) + (changeTime * machineRate) / Math.max(Math.floor(toolLife * 0.5 / cycleTime), 1)),
      quality_factor: round4(1 - 0.5 * 0.5),
      trade_off: "Higher cost but consistent quality throughout tool life",
    },
    {
      strategy: "fixed_count",
      change_interval_min: round4(cycleTime * 20),
      cost_per_part_usd: round4(toolCost / 20 + (changeTime * machineRate) / 20),
      quality_factor: round4(1 - (cycleTime * 20 / toolLife) * 0.5),
      trade_off: "Change every 20 parts — simple to manage, predictable",
    },
  ];

  log.info(`[ToolWearCompensator] Schedule: life=${toolLife.toFixed(1)}min, interval=${optimalInterval.toFixed(1)}min, cost=$${totalCostPerPart.toFixed(3)}/part`);

  return {
    action: "twc_schedule",
    optimal_change_interval_min: round4(optimalInterval),
    changes_per_shift: changesPerShift,
    cost_per_part_tooling_usd: round4(toolCostPerPart),
    cost_per_part_downtime_usd: round4(downtimeCostPerPart),
    total_cost_per_part_usd: round4(totalCostPerPart),
    quality_factor: round4(qualityFactor),
    productivity_factor: round4(productivityFactor),
    alternatives,
  };
}

// ============================================================================
// ACTION: twc_history
// ============================================================================

function analyzeHistory(params: Record<string, unknown>): HistoryResult {
  const records = (params.records ?? params.history ?? []) as WearRecord[];
  if (!records.length) throw new Error("[ToolWearCompensator] twc_history: records array required");

  // Extract tool lives (records where flank_wear_mm >= 0.3 = VB limit)
  const VB_LIMIT = Number(params.vb_limit_mm ?? 0.3);
  const toolLives: number[] = [];
  const wearRates: number[] = [];

  // Group by ascending time and compute wear rates
  const sorted = [...records].sort((a, b) => a.time_min - b.time_min);

  let prevTime = 0, prevWear = 0;
  for (const r of sorted) {
    if (r.time_min > prevTime && r.flank_wear_mm > prevWear) {
      wearRates.push((r.flank_wear_mm - prevWear) / (r.time_min - prevTime));
    }
    if (r.flank_wear_mm >= VB_LIMIT) {
      toolLives.push(r.time_min);
    }
    prevTime = r.time_min;
    prevWear = r.flank_wear_mm;
  }

  // Tool life statistics
  let avgLife = 0, stdLife = 0, minLife = Infinity, maxLife = -Infinity;
  if (toolLives.length > 0) {
    avgLife = toolLives.reduce((a, b) => a + b, 0) / toolLives.length;
    const variance = toolLives.length > 1
      ? toolLives.reduce((s, t) => s + (t - avgLife) ** 2, 0) / (toolLives.length - 1)
      : 0;
    stdLife = Math.sqrt(variance);
    minLife = Math.min(...toolLives);
    maxLife = Math.max(...toolLives);
  } else {
    // Estimate from data range
    avgLife = sorted[sorted.length - 1]?.time_min ?? 0;
    minLife = avgLife;
    maxLife = avgLife;
  }

  const avgWearRate = wearRates.length > 0
    ? wearRates.reduce((a, b) => a + b, 0) / wearRates.length
    : (sorted[sorted.length - 1]?.flank_wear_mm ?? 0) / Math.max(sorted[sorted.length - 1]?.time_min ?? 1, 1);

  // Linear regression: VB = a + b × t
  const n = sorted.length;
  let sumT = 0, sumVB = 0, sumTVB = 0, sumT2 = 0;
  for (const r of sorted) {
    sumT += r.time_min;
    sumVB += r.flank_wear_mm;
    sumTVB += r.time_min * r.flank_wear_mm;
    sumT2 += r.time_min ** 2;
  }
  const denom = n * sumT2 - sumT ** 2;
  const slopeB = denom !== 0 ? (n * sumTVB - sumT * sumVB) / denom : 0;
  const interceptA = (sumVB - slopeB * sumT) / n;

  // R²
  const meanVB = sumVB / n;
  let ssTot = 0, ssRes = 0;
  for (const r of sorted) {
    ssTot += (r.flank_wear_mm - meanVB) ** 2;
    const predicted = interceptA + slopeB * r.time_min;
    ssRes += (r.flank_wear_mm - predicted) ** 2;
  }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Trend
  let trend = "stable";
  if (toolLives.length >= 3) {
    const recent = toolLives.slice(-3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (recentAvg < avgLife * 0.85) trend = "decreasing_tool_life";
    else if (recentAvg > avgLife * 1.15) trend = "increasing_tool_life";
  }

  // Anomalies: wear rates > 2× average
  const anomalies: HistoryResult["anomalies"] = [];
  for (let i = 0; i < wearRates.length; i++) {
    if (wearRates[i] > avgWearRate * 2) {
      anomalies.push({ index: i, reason: `Wear rate ${wearRates[i].toFixed(4)} mm/min is ${(wearRates[i] / avgWearRate).toFixed(1)}× average` });
    }
  }

  const recommendations: string[] = [];
  if (trend === "decreasing_tool_life") {
    recommendations.push("Tool life trending downward — check insert grade, coolant, or material lot changes");
  }
  if (anomalies.length > 0) {
    recommendations.push(`${anomalies.length} anomalous wear event(s) detected — investigate special causes`);
  }
  if (stdLife > avgLife * 0.3) {
    recommendations.push("High tool life variability (CV > 30%) — consider tighter process control");
  }

  log.info(`[ToolWearCompensator] History: ${records.length} records, avg_life=${avgLife.toFixed(1)}min, wear_rate=${avgWearRate.toFixed(4)}mm/min, trend=${trend}`);

  return {
    action: "twc_history",
    records: records.length,
    avg_tool_life_min: round4(avgLife),
    std_tool_life_min: round4(stdLife),
    min_tool_life_min: round4(minLife === Infinity ? 0 : minLife),
    max_tool_life_min: round4(maxLife === -Infinity ? 0 : maxLife),
    wear_rate_mm_per_min: round4(avgWearRate),
    wear_model: {
      type: "linear",
      coefficients: { intercept: round4(interceptA), slope: round4(slopeB) },
      r_squared: round4(rSquared),
    },
    trend,
    anomalies,
    recommendations,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function round4(v: number): number {
  return Math.round(v * 1e4) / 1e4;
}

// ============================================================================
// DISPATCHER ENTRY
// ============================================================================

export function executeToolWearAction(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "twc_predict": return predictWear(params);
    case "twc_compensate": return compensateWear(params);
    case "twc_schedule": return scheduleChanges(params);
    case "twc_history": return analyzeHistory(params);
    default:
      throw new Error(`[ToolWearCompensatorEngine] Unknown action: ${action}`);
  }
}
