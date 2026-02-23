/**
 * R18-MS3: Cpk Optimizer Engine
 *
 * Physics-informed statistical process capability improvement:
 *   - cpk_analyze:       Analyze current Cpk with physics model linkage
 *   - cpk_improve:       Suggest parameter adjustments to improve Cpk target
 *   - cpk_center:        Process centering — shift mean to target
 *   - cpk_reduce_spread: Variability reduction recommendations
 *
 * Combines: R17 SPC (Cp/Cpk), R15 physics (force/surface models), R17 calibration
 * References: Montgomery "Statistical Quality Control", AIAG SPC Manual
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface CpkAnalyzeInput {
  measurements: number[];
  usl: number;           // Upper specification limit
  lsl: number;           // Lower specification limit
  target?: number;        // Target value (default: midpoint)
  characteristic?: string; // e.g., "diameter", "surface_roughness", "force"
  unit?: string;
  physics_model?: string; // Which physics model drives this characteristic
}

interface CpkAnalyzeResult {
  action: "cpk_analyze";
  n: number;
  mean: number;
  std: number;
  cp: number;
  cpk: number;
  cpu: number;
  cpl: number;
  pp: number;
  ppk: number;
  sigma_level: number;
  ppm_total: number;
  ppm_upper: number;
  ppm_lower: number;
  target: number;
  off_center_pct: number;
  capability_rating: string;
  process_shift_mm: number;
  distribution_shape: string;
  recommendations: string[];
  physics_linkage: PhysicsLinkage | null;
}

interface PhysicsLinkage {
  model: string;
  primary_drivers: string[];
  sensitivity_ranking: Array<{ parameter: string; influence: string }>;
}

interface CpkImproveInput {
  measurements: number[];
  usl: number;
  lsl: number;
  target?: number;
  target_cpk?: number;   // Default 1.33
  characteristic?: string;
  current_params?: Record<string, number>;  // Current cutting parameters
}

interface CpkImproveResult {
  action: "cpk_improve";
  current_cpk: number;
  target_cpk: number;
  gap: number;
  feasible: boolean;
  strategies: Array<{
    strategy: string;
    description: string;
    expected_cpk_improvement: number;
    difficulty: "easy" | "moderate" | "hard";
    parameter_changes?: Record<string, { from: number; to: number; unit: string }>;
  }>;
  combined_expected_cpk: number;
  priority_order: string[];
}

interface CpkCenterResult {
  action: "cpk_center";
  current_mean: number;
  target: number;
  shift_needed: number;
  shift_direction: string;
  current_cpk: number;
  centered_cpk: number;
  improvement_pct: number;
  adjustment_suggestions: Array<{
    parameter: string;
    adjustment: string;
    rationale: string;
  }>;
}

interface CpkReduceSpreadResult {
  action: "cpk_reduce_spread";
  current_std: number;
  required_std: number;
  reduction_pct: number;
  current_cpk: number;
  achievable_cpk: number;
  variance_sources: Array<{
    source: string;
    estimated_contribution_pct: number;
    reducible: boolean;
    method: string;
  }>;
  recommendations: string[];
}

// ============================================================================
// CAPABILITY CONSTANTS
// ============================================================================

const CAPABILITY_RATINGS: Array<[number, string]> = [
  [2.0, "world_class"],
  [1.67, "excellent"],
  [1.33, "capable"],
  [1.0, "marginal"],
  [0.67, "poor"],
  [0, "incapable"],
];

function rateCapability(cpk: number): string {
  for (const [threshold, rating] of CAPABILITY_RATINGS) {
    if (cpk >= threshold) return rating;
  }
  return "incapable";
}

/** Standard normal CDF (Abramowitz & Stegun) */
function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

/** PPM from Cpk */
function ppmFromCpk(cpk: number): number {
  const z = cpk * 3;
  return Math.round((1 - normalCDF(z) + normalCDF(-z)) * 1_000_000);
}

// ============================================================================
// PHYSICS MODEL LINKAGES
// ============================================================================

const PHYSICS_MODELS: Record<string, PhysicsLinkage> = {
  diameter: {
    model: "Kienzle_force → deflection → dimensional_error",
    primary_drivers: ["cutting_force", "tool_stiffness", "workpiece_stiffness"],
    sensitivity_ranking: [
      { parameter: "depth_of_cut", influence: "high" },
      { parameter: "feed_rate", influence: "high" },
      { parameter: "tool_overhang", influence: "medium" },
      { parameter: "cutting_speed", influence: "low" },
    ],
  },
  surface_roughness: {
    model: "Ra = f(fz, nose_radius, BUE, vibration)",
    primary_drivers: ["feed_per_tooth", "nose_radius", "vibration_amplitude"],
    sensitivity_ranking: [
      { parameter: "feed_per_tooth", influence: "very_high" },
      { parameter: "nose_radius", influence: "high" },
      { parameter: "cutting_speed", influence: "medium" },
      { parameter: "depth_of_cut", influence: "low" },
    ],
  },
  force: {
    model: "Kienzle: Fc = kc1.1 × h^(-mc) × ap × ae",
    primary_drivers: ["chip_thickness", "depth_of_cut", "material_kc1_1"],
    sensitivity_ranking: [
      { parameter: "depth_of_cut", influence: "very_high" },
      { parameter: "feed_rate", influence: "high" },
      { parameter: "radial_engagement", influence: "high" },
      { parameter: "cutting_speed", influence: "low" },
    ],
  },
  tool_life: {
    model: "Taylor: VT^n = C, with wear-rate corrections",
    primary_drivers: ["cutting_speed", "feed_rate", "depth_of_cut"],
    sensitivity_ranking: [
      { parameter: "cutting_speed", influence: "very_high" },
      { parameter: "feed_rate", influence: "high" },
      { parameter: "depth_of_cut", influence: "medium" },
      { parameter: "coolant_type", influence: "medium" },
    ],
  },
  position: {
    model: "Thermal_expansion + servo_error + backlash",
    primary_drivers: ["temperature_gradient", "axis_accuracy", "backlash"],
    sensitivity_ranking: [
      { parameter: "thermal_stability", influence: "very_high" },
      { parameter: "servo_tuning", influence: "high" },
      { parameter: "backlash_compensation", influence: "medium" },
      { parameter: "cutting_speed", influence: "low" },
    ],
  },
};

function getPhysicsLinkage(characteristic?: string): PhysicsLinkage | null {
  if (!characteristic) return null;
  const key = characteristic.toLowerCase().replace(/[\s-]/g, "_");
  return PHYSICS_MODELS[key] ?? null;
}

// ============================================================================
// STATISTICS HELPERS
// ============================================================================

function stats(data: number[]): { mean: number; std: number; min: number; max: number } {
  const n = data.length;
  if (n === 0) return { mean: 0, std: 0, min: 0, max: 0 };
  let sum = 0, sumSq = 0, mn = Infinity, mx = -Infinity;
  for (const v of data) {
    sum += v;
    sumSq += v * v;
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const mean = sum / n;
  const variance = n > 1 ? (sumSq - n * mean * mean) / (n - 1) : 0;
  return { mean, std: Math.sqrt(Math.max(variance, 0)), min: mn, max: mx };
}

function skewness(data: number[], mean: number, std: number): number {
  if (std === 0 || data.length < 3) return 0;
  const n = data.length;
  let sum3 = 0;
  for (const v of data) sum3 += ((v - mean) / std) ** 3;
  return (n / ((n - 1) * (n - 2))) * sum3;
}

function kurtosis(data: number[], mean: number, std: number): number {
  if (std === 0 || data.length < 4) return 0;
  const n = data.length;
  let sum4 = 0;
  for (const v of data) sum4 += ((v - mean) / std) ** 4;
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4 - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

// ============================================================================
// ACTION: cpk_analyze
// ============================================================================

function analyzeCapability(params: Record<string, unknown>): CpkAnalyzeResult {
  const input = params as unknown as CpkAnalyzeInput;
  const data = input.measurements;
  if (!data || data.length < 2) throw new Error("[CpkOptimizer] cpk_analyze: at least 2 measurements required");

  const usl = Number(input.usl);
  const lsl = Number(input.lsl);
  if (usl <= lsl) throw new Error("[CpkOptimizer] cpk_analyze: USL must be > LSL");

  const target = input.target != null ? Number(input.target) : (usl + lsl) / 2;
  const { mean, std, min, max } = stats(data);

  const specRange = usl - lsl;
  const cp = std > 0 ? specRange / (6 * std) : 99;
  const cpu = std > 0 ? (usl - mean) / (3 * std) : 99;
  const cpl = std > 0 ? (mean - lsl) / (3 * std) : 99;
  const cpk = Math.min(cpu, cpl);

  // Pp/Ppk (overall — same as Cp/Cpk for single sample, but included for completeness)
  const pp = cp;
  const ppk = cpk;

  // Sigma level (with 1.5σ shift)
  const sigmaLevel = cpk * 3 + 1.5;

  // PPM
  const zUpper = std > 0 ? (usl - mean) / std : 99;
  const zLower = std > 0 ? (mean - lsl) / std : 99;
  const ppmUpper = Math.round((1 - normalCDF(zUpper)) * 1_000_000);
  const ppmLower = Math.round(normalCDF(-zLower) * 1_000_000);
  const ppmTotal = ppmUpper + ppmLower;

  // Off-center
  const offCenter = target !== 0 ? ((mean - target) / (specRange / 2)) * 100 : 0;

  // Distribution shape
  const skew = skewness(data, mean, std);
  const kurt = kurtosis(data, mean, std);
  let shape = "normal";
  if (Math.abs(skew) > 1) shape = skew > 0 ? "right_skewed" : "left_skewed";
  else if (kurt > 2) shape = "heavy_tailed";
  else if (kurt < -1) shape = "light_tailed";

  // Recommendations
  const recommendations: string[] = [];
  const rating = rateCapability(cpk);
  if (cpk < 1.33) {
    if (Math.abs(mean - target) > specRange * 0.1) {
      recommendations.push(`Process off-center by ${Math.abs(mean - target).toFixed(4)}${input.unit ?? "mm"} — centering would improve Cpk to ~${cp.toFixed(2)}`);
    }
    if (cp < 1.33) {
      recommendations.push("Process spread too wide — reduce variability through parameter control");
    }
    if (cpk < 1.0) {
      recommendations.push("URGENT: Process incapable (Cpk < 1.0) — immediate action needed");
    }
  }
  if (shape !== "normal") {
    recommendations.push(`Non-normal distribution (${shape}) — consider special-cause investigation`);
  }

  const physics = getPhysicsLinkage(input.characteristic);

  log.info(`[CpkOptimizer] Analyze: n=${data.length}, Cp=${cp.toFixed(3)}, Cpk=${cpk.toFixed(3)}, rating=${rating}`);

  return {
    action: "cpk_analyze",
    n: data.length,
    mean: round6(mean),
    std: round6(std),
    cp: round6(cp),
    cpk: round6(cpk),
    cpu: round6(cpu),
    cpl: round6(cpl),
    pp: round6(pp),
    ppk: round6(ppk),
    sigma_level: round6(sigmaLevel),
    ppm_total: ppmTotal,
    ppm_upper: ppmUpper,
    ppm_lower: ppmLower,
    target: round6(target),
    off_center_pct: round6(offCenter),
    capability_rating: rating,
    process_shift_mm: round6(mean - target),
    distribution_shape: shape,
    recommendations,
    physics_linkage: physics,
  };
}

// ============================================================================
// ACTION: cpk_improve
// ============================================================================

function improveCapability(params: Record<string, unknown>): CpkImproveResult {
  const input = params as unknown as CpkImproveInput;
  const data = input.measurements;
  if (!data || data.length < 2) throw new Error("[CpkOptimizer] cpk_improve: measurements required");

  const usl = Number(input.usl);
  const lsl = Number(input.lsl);
  const target = input.target != null ? Number(input.target) : (usl + lsl) / 2;
  const targetCpk = Number(input.target_cpk ?? 1.33);

  const { mean, std } = stats(data);
  const specRange = usl - lsl;
  const cpu = std > 0 ? (usl - mean) / (3 * std) : 99;
  const cpl = std > 0 ? (mean - lsl) / (3 * std) : 99;
  const currentCpk = Math.min(cpu, cpl);
  const cp = std > 0 ? specRange / (6 * std) : 99;
  const gap = targetCpk - currentCpk;

  const strategies: CpkImproveResult["strategies"] = [];

  // Strategy 1: Centering (if off-center)
  const offCenter = Math.abs(mean - target);
  if (offCenter > specRange * 0.05) {
    const centeredCpk = cp;  // If perfectly centered, Cpk = Cp
    strategies.push({
      strategy: "process_centering",
      description: `Shift process mean by ${offCenter.toFixed(4)} toward target ${target}`,
      expected_cpk_improvement: round6(centeredCpk - currentCpk),
      difficulty: "easy",
      parameter_changes: input.current_params ? {
        tool_offset: { from: 0, to: round6(target - mean), unit: "mm" },
      } : undefined,
    });
  }

  // Strategy 2: Reduce variability by 20%
  if (std > 0) {
    const newStd = std * 0.8;
    const newCp = specRange / (6 * newStd);
    const newCpu = (usl - mean) / (3 * newStd);
    const newCpl = (mean - lsl) / (3 * newStd);
    const newCpk = Math.min(newCpu, newCpl);
    strategies.push({
      strategy: "variability_reduction_20pct",
      description: "Reduce process std by 20% through tighter parameter control",
      expected_cpk_improvement: round6(newCpk - currentCpk),
      difficulty: "moderate",
    });
  }

  // Strategy 3: Reduce feed rate (for surface/dimension characteristics)
  if (input.current_params?.feed_rate || input.current_params?.feed_per_tooth) {
    const feed = input.current_params.feed_rate ?? input.current_params.feed_per_tooth ?? 0;
    if (feed > 0) {
      const newFeed = feed * 0.85;
      // Surface roughness ∝ fz², so 15% feed reduction → ~28% Ra reduction → ~14% std reduction
      const stdReduction = 0.14;
      const newStd = std * (1 - stdReduction);
      const newCpu = newStd > 0 ? (usl - mean) / (3 * newStd) : 99;
      const newCpl = newStd > 0 ? (mean - lsl) / (3 * newStd) : 99;
      const newCpk = Math.min(newCpu, newCpl);
      strategies.push({
        strategy: "reduce_feed_rate",
        description: "Reduce feed rate by 15% to lower surface roughness variability",
        expected_cpk_improvement: round6(newCpk - currentCpk),
        difficulty: "easy",
        parameter_changes: {
          feed_rate: { from: round6(feed), to: round6(newFeed), unit: "mm/rev" },
        },
      });
    }
  }

  // Strategy 4: Reduce cutting speed (for dimensional accuracy — thermal effects)
  if (input.current_params?.cutting_speed) {
    const vc = input.current_params.cutting_speed;
    const newVc = vc * 0.9;
    // 10% speed reduction → ~5% thermal error reduction → ~5% std reduction
    const stdReduction = 0.05;
    const newStd = std * (1 - stdReduction);
    const newCpu = newStd > 0 ? (usl - mean) / (3 * newStd) : 99;
    const newCpl = newStd > 0 ? (mean - lsl) / (3 * newStd) : 99;
    const newCpk = Math.min(newCpu, newCpl);
    strategies.push({
      strategy: "reduce_cutting_speed",
      description: "Reduce cutting speed by 10% to lower thermal distortion",
      expected_cpk_improvement: round6(newCpk - currentCpk),
      difficulty: "easy",
      parameter_changes: {
        cutting_speed: { from: round6(vc), to: round6(newVc), unit: "m/min" },
      },
    });
  }

  // Strategy 5: Tooling upgrade
  strategies.push({
    strategy: "tooling_upgrade",
    description: "Upgrade to tighter-tolerance tooling (closer runout, better insert grade)",
    expected_cpk_improvement: round6(currentCpk * 0.3),  // typically ~30% improvement
    difficulty: "hard",
  });

  // Sort by expected improvement descending
  strategies.sort((a, b) => b.expected_cpk_improvement - a.expected_cpk_improvement);

  // Combined expected: sum of top strategies (capped at diminishing returns)
  let combined = currentCpk;
  for (const s of strategies.slice(0, 3)) {
    combined += s.expected_cpk_improvement * 0.7;  // 70% realization factor
  }

  const feasible = combined >= targetCpk;

  log.info(`[CpkOptimizer] Improve: current=${currentCpk.toFixed(3)}, target=${targetCpk}, gap=${gap.toFixed(3)}, strategies=${strategies.length}, feasible=${feasible}`);

  return {
    action: "cpk_improve",
    current_cpk: round6(currentCpk),
    target_cpk: targetCpk,
    gap: round6(gap),
    feasible,
    strategies,
    combined_expected_cpk: round6(combined),
    priority_order: strategies.map(s => s.strategy),
  };
}

// ============================================================================
// ACTION: cpk_center
// ============================================================================

function centerProcess(params: Record<string, unknown>): CpkCenterResult {
  const data = (params.measurements ?? []) as number[];
  if (!data.length) throw new Error("[CpkOptimizer] cpk_center: measurements required");

  const usl = Number(params.usl);
  const lsl = Number(params.lsl);
  const target = params.target != null ? Number(params.target) : (usl + lsl) / 2;
  const { mean, std } = stats(data);

  const specRange = usl - lsl;
  const cpu = std > 0 ? (usl - mean) / (3 * std) : 99;
  const cpl = std > 0 ? (mean - lsl) / (3 * std) : 99;
  const currentCpk = Math.min(cpu, cpl);
  const cp = std > 0 ? specRange / (6 * std) : 99;

  const shift = target - mean;
  const direction = shift > 0 ? "increase" : shift < 0 ? "decrease" : "none";
  const centeredCpk = cp;  // Perfect centering: Cpk = Cp
  const improvement = currentCpk > 0 ? ((centeredCpk - currentCpk) / currentCpk) * 100 : 0;

  // Generate adjustment suggestions based on shift direction
  const suggestions: CpkCenterResult["adjustment_suggestions"] = [];
  if (Math.abs(shift) > 0.001) {
    suggestions.push({
      parameter: "tool_offset",
      adjustment: `${direction} by ${Math.abs(shift).toFixed(4)}mm`,
      rationale: "Direct offset compensation — most immediate effect",
    });
    if (Math.abs(shift) > specRange * 0.1) {
      suggestions.push({
        parameter: "tool_wear_compensation",
        adjustment: "Check and update wear offset",
        rationale: "Large shift may indicate accumulated tool wear",
      });
      suggestions.push({
        parameter: "thermal_compensation",
        adjustment: "Verify machine thermal compensation is active",
        rationale: "Thermal growth can cause systematic shift",
      });
    }
  }

  log.info(`[CpkOptimizer] Center: shift=${shift.toFixed(4)}, currentCpk=${currentCpk.toFixed(3)}, centeredCpk=${centeredCpk.toFixed(3)}`);

  return {
    action: "cpk_center",
    current_mean: round6(mean),
    target: round6(target),
    shift_needed: round6(shift),
    shift_direction: direction,
    current_cpk: round6(currentCpk),
    centered_cpk: round6(centeredCpk),
    improvement_pct: round6(improvement),
    adjustment_suggestions: suggestions,
  };
}

// ============================================================================
// ACTION: cpk_reduce_spread
// ============================================================================

function reduceSpread(params: Record<string, unknown>): CpkReduceSpreadResult {
  const data = (params.measurements ?? []) as number[];
  if (!data.length) throw new Error("[CpkOptimizer] cpk_reduce_spread: measurements required");

  const usl = Number(params.usl);
  const lsl = Number(params.lsl);
  const targetCpk = Number(params.target_cpk ?? 1.33);
  const { mean, std } = stats(data);

  const specRange = usl - lsl;
  const cpu = std > 0 ? (usl - mean) / (3 * std) : 99;
  const cpl = std > 0 ? (mean - lsl) / (3 * std) : 99;
  const currentCpk = Math.min(cpu, cpl);

  // Required std for target Cpk (assuming centered)
  const requiredStd = specRange / (6 * targetCpk);
  const reductionPct = std > 0 ? ((std - requiredStd) / std) * 100 : 0;

  // Achievable Cpk if std reduced to required
  const achievableCpk = requiredStd > 0 ? specRange / (6 * requiredStd) : 99;

  // Variance sources (typical CNC machining breakdown)
  const varianceSources: CpkReduceSpreadResult["variance_sources"] = [
    { source: "tool_wear_progression", estimated_contribution_pct: 25, reducible: true, method: "More frequent tool changes or wear compensation" },
    { source: "thermal_variation", estimated_contribution_pct: 20, reducible: true, method: "Machine warm-up cycle, thermal compensation" },
    { source: "material_variation", estimated_contribution_pct: 15, reducible: false, method: "Tighter incoming material specification" },
    { source: "fixture_repeatability", estimated_contribution_pct: 15, reducible: true, method: "Fixture maintenance, locating pin replacement" },
    { source: "spindle_runout", estimated_contribution_pct: 10, reducible: true, method: "Spindle maintenance, tool holder balance" },
    { source: "feed_drive_accuracy", estimated_contribution_pct: 10, reducible: true, method: "Servo tuning, backlash compensation update" },
    { source: "measurement_error", estimated_contribution_pct: 5, reducible: true, method: "Gauge R&R study, calibrate measurement system" },
  ];

  const recommendations: string[] = [];
  if (reductionPct > 50) {
    recommendations.push("CAUTION: >50% std reduction needed — may require equipment upgrade or process redesign");
  }
  if (reductionPct > 0) {
    // Sort sources by contribution, recommend top reducible ones
    const reducible = varianceSources.filter(s => s.reducible).sort((a, b) => b.estimated_contribution_pct - a.estimated_contribution_pct);
    for (const src of reducible.slice(0, 3)) {
      recommendations.push(`Address ${src.source} (${src.estimated_contribution_pct}%): ${src.method}`);
    }
  } else {
    recommendations.push("Current capability meets target — no spread reduction needed");
  }

  log.info(`[CpkOptimizer] ReduceSpread: current_std=${std.toFixed(4)}, required=${requiredStd.toFixed(4)}, reduction=${reductionPct.toFixed(1)}%`);

  return {
    action: "cpk_reduce_spread",
    current_std: round6(std),
    required_std: round6(requiredStd),
    reduction_pct: round6(Math.max(reductionPct, 0)),
    current_cpk: round6(currentCpk),
    achievable_cpk: round6(achievableCpk),
    variance_sources: varianceSources,
    recommendations,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

// ============================================================================
// DISPATCHER ENTRY
// ============================================================================

export function executeCpkOptimizerAction(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "cpk_analyze": return analyzeCapability(params);
    case "cpk_improve": return improveCapability(params);
    case "cpk_center": return centerProcess(params);
    case "cpk_reduce_spread": return reduceSpread(params);
    default:
      throw new Error(`[CpkOptimizerEngine] Unknown action: ${action}`);
  }
}
