/**
 * AdvancedCuttingPhysicsExtEngine — Four critical missing physics models
 *
 * Models: Built-Up Edge (BUE) formation, Usui crater wear,
 *         Brammertz surface roughness speed correction, Colding tool life
 * References: Usui (1984), Brammertz (1961), Colding (1959),
 *             Shaw (2005), Trent & Wright (2000)
 */

import { log } from "../utils/Logger.js";

// ─── Constants ──────────────────────────────────────────────────────
const DEG = Math.PI / 180;

// ─── Material-dependent BUE parameters ──────────────────────────────
interface BUEMaterialParams {
  v_bue_min: number;   // m/min — lower bound of BUE zone
  v_bue_max: number;   // m/min — upper bound of BUE zone
  v_opt: number;       // m/min — speed of maximum BUE
  k_adhesion: number;  // adhesion tendency (0-1)
  alpha: number;       // Gaussian width parameter
  beta_ra: number;     // Ra degradation coefficient
  gamma_force: number; // force modification coefficient
}

const BUE_MATERIAL_DB: Record<string, BUEMaterialParams> = {
  steel:      { v_bue_min: 20, v_bue_max: 80,  v_opt: 40, k_adhesion: 0.6, alpha: 0.003,  beta_ra: 3.0, gamma_force: 0.15 },
  aluminum:   { v_bue_min: 15, v_bue_max: 120, v_opt: 50, k_adhesion: 0.9, alpha: 0.0015, beta_ra: 5.0, gamma_force: 0.20 },
  stainless:  { v_bue_min: 15, v_bue_max: 70,  v_opt: 35, k_adhesion: 0.7, alpha: 0.004,  beta_ra: 4.0, gamma_force: 0.18 },
  titanium:   { v_bue_min: 10, v_bue_max: 50,  v_opt: 25, k_adhesion: 0.8, alpha: 0.005,  beta_ra: 4.5, gamma_force: 0.22 },
  cast_iron:  { v_bue_min: 25, v_bue_max: 60,  v_opt: 38, k_adhesion: 0.3, alpha: 0.005,  beta_ra: 2.0, gamma_force: 0.10 },
};

const COATING_ADHESION_FACTOR: Record<string, number> = {
  uncoated: 1.0,
  TiN:      0.55,
  TiAlN:    0.45,
  AlCrN:    0.40,
  DLC:      0.25,
};

const COOLANT_BUE_FACTOR: Record<string, number> = {
  dry:   1.0,
  flood: 0.6,
  mql:   0.75,
};

// ─── Usui crater wear constants ─────────────────────────────────────
interface UsaiMaterialConstants {
  C: number;       // wear coefficient
  D: number;       // activation energy / R (K)
  sigma_n_base: number; // base normal stress MPa
  chip_vel_ratio: number; // Vs/Vc ratio
  temp_coeff: number;    // temperature rise coefficient
}

const USUI_MATERIAL_DB: Record<string, UsaiMaterialConstants> = {
  steel:     { C: 7.8e-9,  D: 8900,  sigma_n_base: 650,  chip_vel_ratio: 0.45, temp_coeff: 3.5 },
  stainless: { C: 9.2e-9,  D: 8500,  sigma_n_base: 750,  chip_vel_ratio: 0.40, temp_coeff: 4.0 },
  titanium:  { C: 1.2e-8,  D: 7800,  sigma_n_base: 850,  chip_vel_ratio: 0.35, temp_coeff: 5.0 },
  inconel:   { C: 1.5e-8,  D: 7500,  sigma_n_base: 950,  chip_vel_ratio: 0.30, temp_coeff: 5.5 },
  cast_iron: { C: 5.5e-9,  D: 9500,  sigma_n_base: 500,  chip_vel_ratio: 0.50, temp_coeff: 2.8 },
};

const TOOL_MATERIAL_FACTOR: Record<string, number> = {
  carbide: 1.0,
  cermet:  0.60,
  ceramic: 0.35,
  CBN:     0.20,
};

// ─── Brammertz material roughness factors ───────────────────────────
interface BrammertzMaterialFactor {
  k_mat: number;
  speed_A: number;  // low-speed degradation amplitude
  speed_B: number;  // low-speed degradation decay rate
}

const BRAMMERTZ_MATERIAL_DB: Record<string, BrammertzMaterialFactor> = {
  soft_steel:    { k_mat: 1.15, speed_A: 0.8, speed_B: 0.03 },
  medium_steel:  { k_mat: 1.00, speed_A: 0.5, speed_B: 0.04 },
  hard_steel:    { k_mat: 0.90, speed_A: 0.3, speed_B: 0.05 },
  stainless:     { k_mat: 1.20, speed_A: 0.7, speed_B: 0.03 },
  aluminum:      { k_mat: 1.30, speed_A: 1.0, speed_B: 0.02 },
  cast_iron:     { k_mat: 0.85, speed_A: 0.2, speed_B: 0.06 },
  titanium:      { k_mat: 1.10, speed_A: 0.6, speed_B: 0.035 },
};

// ─── Colding constants database ─────────────────────────────────────
interface ColdingConstants {
  K0: number;
  K1: number;
  K2: number;
  K3: number;
}

const COLDING_DB: Record<string, ColdingConstants> = {
  steel:     { K0: 12.5, K1: 2.8, K2: 0.35, K3: 1.2 },
  stainless: { K0: 11.0, K1: 3.0, K2: 0.40, K3: 1.1 },
  aluminum:  { K0: 15.0, K1: 2.2, K2: 0.25, K3: 1.5 },
  titanium:  { K0: 9.5,  K1: 3.5, K2: 0.50, K3: 0.9 },
  cast_iron: { K0: 13.0, K1: 2.5, K2: 0.30, K3: 1.3 },
};

// Taylor constants for comparison
const TAYLOR_DB: Record<string, { n: number; C: number }> = {
  steel:     { n: 0.25, C: 300 },
  stainless: { n: 0.20, C: 200 },
  aluminum:  { n: 0.40, C: 600 },
  titanium:  { n: 0.15, C: 120 },
  cast_iron: { n: 0.28, C: 350 },
};

// ─── Input / Output Types ───────────────────────────────────────────

export type MaterialType = "steel" | "aluminum" | "stainless" | "titanium" | "cast_iron";
export type ToolCoating = "uncoated" | "TiN" | "TiAlN" | "AlCrN" | "DLC";
export type CoolantType = "dry" | "flood" | "mql";
export type ToolMaterial = "carbide" | "cermet" | "ceramic" | "CBN";

export interface PredictBUEInput {
  cutting_speed_mpm: number;
  feed_mm_rev: number;
  rake_angle_deg: number;
  material_hardness_HB: number;
  material_type: MaterialType;
  tool_coating?: ToolCoating;
  coolant?: CoolantType;
}

export interface PredictBUEResult {
  bue_probability: number;
  bue_height_mm: number;
  bue_stability: number;
  critical_speed_range: [number, number];
  ra_degradation_factor: number;
  force_modification_factor: number;
  recommendation: string;
  safe_speed_mpm: number;
}

export interface BUESpeedMapInput {
  speed_range: [number, number];
  n_points: number;
  feed_mm_rev: number;
  rake_angle_deg: number;
  material_hardness_HB: number;
  material_type: MaterialType;
  tool_coating?: ToolCoating;
  coolant?: CoolantType;
}

export interface BUESpeedMapResult {
  speeds: number[];
  bue_probabilities: number[];
  bue_heights: number[];
  optimal_speed_mpm: number;
  bue_zone: [number, number];
}

export interface UsaiCraterWearInput {
  cutting_speed_mpm: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  material_type: "steel" | "stainless" | "titanium" | "inconel" | "cast_iron";
  tool_material: ToolMaterial;
  cutting_time_min: number;
  chip_contact_length_mm?: number;
}

export interface UsaiCraterWearResult {
  crater_depth_KT_mm: number;
  crater_width_KB_mm: number;
  crater_ratio_KT_KM: number;
  max_rake_stress_MPa: number;
  tool_face_temp_C: number;
  wear_rate_mm_per_min: number;
  time_to_KT_limit_min: number;
  kt_vs_time: { time_min: number; kt_mm: number }[];
}

export interface CombinedWearInput extends UsaiCraterWearInput {
  flank_wear_rate_mm_per_min?: number;
}

export interface CombinedWearResult {
  vb_mm: number;
  kt_mm: number;
  dominant_mechanism: "flank" | "crater" | "balanced";
  tool_life_min: number;
  wear_ratio_kt_vb: number;
  critical_mechanism_speed_mpm: number;
}

export interface BrammertzRoughnessInput {
  feed_mm_rev: number;
  nose_radius_mm: number;
  cutting_speed_mpm: number;
  approach_angle_deg: number;
  edge_radius_um: number;
  material_hardness_HB: number;
  material_carbon_pct?: number;
  material_type?: string;
  tool_condition?: "sharp" | "moderate" | "worn";
}

export interface BrammertzRoughnessResult {
  ra_theoretical_um: number;
  ra_brammertz_um: number;
  ra_with_speed_um: number;
  min_chip_thickness_mm: number;
  ploughing_contribution_pct: number;
  kinematic_contribution_pct: number;
  speed_contribution_pct: number;
  optimal_feed_mm_rev: number;
  ra_vs_feed: { feed: number; ra: number }[];
}

export interface SurfaceRoughnessDecompositionInput {
  feed_mm_rev: number;
  nose_radius_mm: number;
  cutting_speed_mpm: number;
  approach_angle_deg: number;
  edge_radius_um: number;
  vibration_amplitude_um?: number;
  bue_height_mm?: number;
}

export interface SurfaceRoughnessDecompositionResult {
  total_ra_um: number;
  components: {
    kinematic: number;
    ploughing: number;
    vibration: number;
    bue: number;
    wear: number;
  };
  dominant_factor: string;
  improvement_advice: string[];
}

export interface ColdingToolLifeInput {
  operation: "turning" | "milling";
  cutting_speed_mpm: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  tool_diameter_mm?: number;
  approach_angle_deg?: number;
  material_type: MaterialType;
  hardness_HB: number;
}

export interface ColdingToolLifeResult {
  tool_life_min: number;
  equivalent_chip_thickness_mm: number;
  taylor_equivalent: { V: number; n: number; C: number };
  colding_vs_taylor_error_pct: number;
  sensitivity: { to_speed: number; to_feed: number; to_depth: number };
}

export interface CompareTaylorColdingInput {
  speed_range: [number, number];
  n_points: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  material_type: MaterialType;
  hardness_HB: number;
  operation?: "turning" | "milling";
  approach_angle_deg?: number;
  tool_diameter_mm?: number;
}

export interface ModelCurveResult {
  tool_life_curve: { speed: number; life: number }[];
  model_name: string;
  parameters: Record<string, number>;
  divergence_zones: { speed: number; max_pct_diff: number }[];
  recommendation: string;
}

export interface CompareTaylorColdingResult {
  models: ModelCurveResult[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function getBrammertzMaterialKey(hardness_HB: number, carbon_pct?: number): string {
  if (carbon_pct !== undefined && carbon_pct < 0.15) return "soft_steel";
  if (hardness_HB < 180) return "soft_steel";
  if (hardness_HB < 300) return "medium_steel";
  return "hard_steel";
}

/** Shaw's chip-tool interface temperature model (simplified). */
function shawTemperature(Vc_mpm: number, feed_mm: number, depth_mm: number, tempCoeff: number): number {
  // T = T_ambient + coeff * Vc^0.4 * f^0.2 * ap^0.1
  const Vc_ms = Vc_mpm / 60;
  return 25 + tempCoeff * 100 * Math.pow(Vc_ms, 0.4) * Math.pow(feed_mm, 0.2) * Math.pow(depth_mm, 0.1);
}

// ─── Engine Implementation ──────────────────────────────────────────

class AdvancedCuttingPhysicsExtEngineImpl {
  readonly name = "AdvancedCuttingPhysicsExtEngine";
  readonly version = "1.0.0";

  // ── Model 1: Built-Up Edge ───────────────────────────────────────

  /**
   * Predict BUE formation probability, height, and effects.
   * BUE forms at low cutting speeds where chip-tool interface temperature
   * falls in the adhesion zone. Modeled as Gaussian probability centered
   * on V_opt with material/coating/coolant modifiers.
   */
  predictBUE(params: PredictBUEInput): PredictBUEResult {
    const mat = BUE_MATERIAL_DB[params.material_type];
    const coatingFactor = COATING_ADHESION_FACTOR[params.tool_coating ?? "uncoated"];
    const coolantFactor = COOLANT_BUE_FACTOR[params.coolant ?? "dry"];

    // Hardness effect: softer materials → more BUE
    const hardnessFactor = clamp(1.5 - params.material_hardness_HB / 400, 0.3, 1.5);
    // Rake angle effect: higher positive rake → more adhesion area
    const rakeFactor = 1.0 + 0.01 * params.rake_angle_deg;

    const Vc = params.cutting_speed_mpm;
    const vOpt = mat.v_opt;

    // Gaussian BUE probability centered on V_opt
    const rawProb = Math.exp(-mat.alpha * (Vc - vOpt) ** 2);
    // Apply modifiers
    const bue_probability = clamp(
      rawProb * mat.k_adhesion * coatingFactor * coolantFactor * hardnessFactor * rakeFactor,
      0, 1
    );

    // BUE height (prow model)
    const kappa = 90; // default approach angle for height calc
    const h_bue_raw = mat.k_adhesion * (params.feed_mm_rev * Math.sin(kappa * DEG))
      * Math.exp(-mat.alpha * (Vc - vOpt) ** 2);
    const bue_height_mm = Math.max(0, h_bue_raw * coatingFactor * coolantFactor * hardnessFactor);

    // Stability index
    let bue_stability: number;
    if (bue_probability < 0.15) {
      bue_stability = 0;
    } else if (bue_probability < 0.5) {
      bue_stability = 0.5; // intermittent
    } else {
      bue_stability = 1.0; // stable cap
    }

    // Speed-adjusted BUE zone
    const v_min = mat.v_bue_min * (1 / (coatingFactor + 0.001));
    const v_max = mat.v_bue_max * coatingFactor;
    const critical_speed_range: [number, number] = [
      Math.max(5, mat.v_bue_min * 0.8),
      mat.v_bue_max * 1.1
    ];

    // Ra degradation
    const ra_degradation_factor = 1 + mat.beta_ra * bue_height_mm;

    // Force modification (BUE acts as extended rake → reduces force)
    const force_modification_factor = params.feed_mm_rev > 0
      ? 1 - mat.gamma_force * (bue_height_mm / params.feed_mm_rev)
      : 1.0;

    // Safe speed: above BUE zone
    const safe_speed_mpm = mat.v_bue_max * 1.2;

    // Recommendation
    let recommendation: string;
    if (bue_probability < 0.1) {
      recommendation = "No significant BUE risk at current conditions.";
    } else if (bue_probability < 0.4) {
      recommendation = `Moderate BUE risk. Consider increasing speed above ${safe_speed_mpm.toFixed(0)} m/min or applying coating.`;
    } else {
      recommendation = `High BUE risk (P=${(bue_probability * 100).toFixed(0)}%). Increase speed to >${safe_speed_mpm.toFixed(0)} m/min, use TiAlN/DLC coating, or apply flood coolant.`;
    }

    log.debug(`[BUE] Vc=${Vc} mat=${params.material_type} P=${bue_probability.toFixed(3)} h=${bue_height_mm.toFixed(4)}mm`);

    return {
      bue_probability,
      bue_height_mm,
      bue_stability,
      critical_speed_range,
      ra_degradation_factor,
      force_modification_factor,
      recommendation,
      safe_speed_mpm,
    };
  }

  /**
   * Generate BUE risk map across a speed range.
   */
  bueSpeedMap(params: BUESpeedMapInput): BUESpeedMapResult {
    const n = Math.max(2, params.n_points);
    const [vMin, vMax] = params.speed_range;
    const step = (vMax - vMin) / (n - 1);

    const speeds: number[] = [];
    const bue_probabilities: number[] = [];
    const bue_heights: number[] = [];

    let minProb = Infinity;
    let optimalSpeed = vMin;

    for (let i = 0; i < n; i++) {
      const v = vMin + i * step;
      const result = this.predictBUE({
        cutting_speed_mpm: v,
        feed_mm_rev: params.feed_mm_rev,
        rake_angle_deg: params.rake_angle_deg,
        material_hardness_HB: params.material_hardness_HB,
        material_type: params.material_type,
        tool_coating: params.tool_coating,
        coolant: params.coolant,
      });
      speeds.push(v);
      bue_probabilities.push(result.bue_probability);
      bue_heights.push(result.bue_height_mm);

      if (result.bue_probability < minProb) {
        minProb = result.bue_probability;
        optimalSpeed = v;
      }
    }

    // Find BUE zone boundaries (P > 0.1)
    const threshold = 0.1;
    let zoneStart = vMax;
    let zoneEnd = vMin;
    for (let i = 0; i < n; i++) {
      if (bue_probabilities[i] > threshold) {
        zoneStart = Math.min(zoneStart, speeds[i]);
        zoneEnd = Math.max(zoneEnd, speeds[i]);
      }
    }

    return {
      speeds,
      bue_probabilities,
      bue_heights,
      optimal_speed_mpm: optimalSpeed,
      bue_zone: [zoneStart, zoneEnd],
    };
  }

  // ── Model 2: Usui Crater Wear ────────────────────────────────────

  /**
   * Usui (1984) diffusion-based crater wear model.
   * dKT/dt = C * sigma_n * Vs * exp(-D / theta_tool)
   */
  usaiCraterWear(params: UsaiCraterWearInput): UsaiCraterWearResult {
    const mat = USUI_MATERIAL_DB[params.material_type];
    const toolFactor = TOOL_MATERIAL_FACTOR[params.tool_material];

    // Tool face temperature via Shaw's model
    const theta_C = shawTemperature(
      params.cutting_speed_mpm, params.feed_mm_rev,
      params.depth_of_cut_mm, mat.temp_coeff
    );
    const theta_K = theta_C + 273.15;

    // Chip sliding velocity
    const Vc_ms = params.cutting_speed_mpm / 60;
    const Vs = Vc_ms * mat.chip_vel_ratio;

    // Normal stress on rake face (pressure distribution)
    const sigma_n = mat.sigma_n_base * Math.pow(params.feed_mm_rev / 0.2, 0.3)
      * Math.pow(params.depth_of_cut_mm / 2.0, 0.15);

    // Usui wear rate: dKT/dt = C * sigma_n * Vs * exp(-D/theta)
    const wear_rate_raw = mat.C * sigma_n * 1e6 * Vs * Math.exp(-mat.D / theta_K);
    // Apply tool material resistance factor
    const wear_rate_mm_per_min = wear_rate_raw * toolFactor * 60; // convert to mm/min

    // Contact length
    const lc = params.chip_contact_length_mm ?? (params.feed_mm_rev * 2.5);

    // KT at given time
    const kt = wear_rate_mm_per_min * params.cutting_time_min;

    // Crater width KB ≈ 2.5 * KT for typical geometry
    const kb = Math.min(lc, 2.5 * Math.max(kt, 0.001));

    // KM = distance from edge to crater center ≈ lc/2
    const km = lc / 2;
    const kt_km_ratio = kt / Math.max(km, 0.01);

    // Time to KT limit (0.06 mm)
    const KT_LIMIT = 0.06;
    const time_to_limit = wear_rate_mm_per_min > 0 ? KT_LIMIT / wear_rate_mm_per_min : Infinity;

    // Generate KT vs time curve
    const nSteps = 10;
    const tMax = Math.min(params.cutting_time_min * 1.5, time_to_limit * 1.2);
    const kt_vs_time: { time_min: number; kt_mm: number }[] = [];
    for (let i = 0; i <= nSteps; i++) {
      const t = (tMax / nSteps) * i;
      kt_vs_time.push({ time_min: t, kt_mm: wear_rate_mm_per_min * t });
    }

    log.debug(`[Usui] KT=${kt.toFixed(4)}mm rate=${wear_rate_mm_per_min.toExponential(3)} T=${theta_C.toFixed(0)}C`);

    return {
      crater_depth_KT_mm: kt,
      crater_width_KB_mm: kb,
      crater_ratio_KT_KM: kt_km_ratio,
      max_rake_stress_MPa: sigma_n,
      tool_face_temp_C: theta_C,
      wear_rate_mm_per_min,
      time_to_KT_limit_min: time_to_limit,
      kt_vs_time,
    };
  }

  /**
   * Combined flank + crater wear analysis.
   * Determines dominant wear mechanism and overall tool life.
   */
  combinedWear(params: CombinedWearInput): CombinedWearResult {
    const crater = this.usaiCraterWear(params);

    // Default flank wear rate from empirical correlation
    const flank_rate = params.flank_wear_rate_mm_per_min
      ?? 0.003 * Math.pow(params.cutting_speed_mpm / 100, 1.5);

    const VB_LIMIT = 0.3; // mm
    const KT_LIMIT = 0.06; // mm

    const vb = flank_rate * params.cutting_time_min;
    const kt = crater.crater_depth_KT_mm;

    const time_vb_limit = VB_LIMIT / flank_rate;
    const time_kt_limit = crater.time_to_KT_limit_min;
    const tool_life_min = Math.min(time_vb_limit, time_kt_limit);

    const wear_ratio = kt / Math.max(vb, 1e-6);

    let dominant_mechanism: "flank" | "crater" | "balanced";
    if (wear_ratio > 1.5) {
      dominant_mechanism = "crater";
    } else if (wear_ratio < 0.67) {
      dominant_mechanism = "flank";
    } else {
      dominant_mechanism = "balanced";
    }

    // Critical speed where mechanism shifts (crater rate = flank rate scaled)
    // Crater wear grows exponentially with speed, flank grows as power law
    // Approximate crossover speed
    const critical_mechanism_speed_mpm = params.cutting_speed_mpm * Math.pow(0.67 / Math.max(wear_ratio, 0.01), 0.5);

    return {
      vb_mm: vb,
      kt_mm: kt,
      dominant_mechanism,
      tool_life_min,
      wear_ratio_kt_vb: wear_ratio,
      critical_mechanism_speed_mpm: clamp(critical_mechanism_speed_mpm, 20, 500),
    };
  }

  // ── Model 3: Brammertz Surface Roughness ─────────────────────────

  /**
   * Brammertz (1961) surface roughness with speed correction.
   * Ra = (f^2/(32*r) + k_min*(1+cos(kappa))/f) * k_speed * k_mat * k_tool
   */
  brammertzRoughness(params: BrammertzRoughnessInput): BrammertzRoughnessResult {
    const f = params.feed_mm_rev;
    const r = params.nose_radius_mm;
    const Vc = params.cutting_speed_mpm;
    const kappa = params.approach_angle_deg * DEG;
    const rEdge_mm = params.edge_radius_um / 1000;

    // Minimum chip thickness ≈ 0.03 * edge radius (Brammertz/Albrecht)
    const k_min = 0.03 * rEdge_mm;

    // Ra theoretical (pure kinematic)
    const ra_theor = (f * f) / (32 * r) * 1000; // convert to um

    // Brammertz ploughing correction
    const ploughing_term = k_min * (1 + Math.cos(kappa)) / f * 1000; // um
    const ra_brammertz = ra_theor + ploughing_term;

    // Material-dependent speed correction
    const matKey = params.material_type
      ? (params.material_hardness_HB > 300 ? "hard_steel" : (params.material_hardness_HB < 180 ? "soft_steel" : "medium_steel"))
      : "medium_steel";
    const bMat = BRAMMERTZ_MATERIAL_DB[matKey] ?? BRAMMERTZ_MATERIAL_DB["medium_steel"];

    // Speed factor: low-speed degradation from BUE/ploughing
    const k_speed = 1 + bMat.speed_A * Math.exp(-bMat.speed_B * Vc);

    // Tool condition factor
    const toolConditionFactor: Record<string, number> = { sharp: 1.0, moderate: 1.15, worn: 1.4 };
    const k_tool = toolConditionFactor[params.tool_condition ?? "sharp"];

    const ra_with_speed = ra_brammertz * k_speed * bMat.k_mat * k_tool;

    // Contribution percentages
    const total_components = ra_theor + ploughing_term;
    const speed_addition = ra_brammertz * (k_speed * bMat.k_mat * k_tool - 1);
    const grand_total = total_components + Math.max(0, speed_addition);

    const kinematic_pct = (ra_theor / grand_total) * 100;
    const ploughing_pct = (ploughing_term / grand_total) * 100;
    const speed_pct = (Math.max(0, speed_addition) / grand_total) * 100;

    // Optimal feed: minimize Ra = f^2/(32r) + k_min*(1+cos(kappa))/f
    // dRa/df = 2f/(32r) - k_min*(1+cos(kappa))/f^2 = 0
    // f_opt = (16*r*k_min*(1+cos(kappa)))^(1/3)
    const optimal_feed = Math.pow(16 * r * k_min * (1 + Math.cos(kappa)), 1 / 3);

    // Ra vs feed curve
    const ra_vs_feed: { feed: number; ra: number }[] = [];
    for (let i = 1; i <= 20; i++) {
      const fi = 0.02 * i; // 0.02 to 0.40
      const ra_k = (fi * fi) / (32 * r) * 1000;
      const ra_p = k_min * (1 + Math.cos(kappa)) / fi * 1000;
      ra_vs_feed.push({ feed: fi, ra: (ra_k + ra_p) * k_speed * bMat.k_mat * k_tool });
    }

    return {
      ra_theoretical_um: ra_theor,
      ra_brammertz_um: ra_brammertz,
      ra_with_speed_um: ra_with_speed,
      min_chip_thickness_mm: k_min,
      ploughing_contribution_pct: ploughing_pct,
      kinematic_contribution_pct: kinematic_pct,
      speed_contribution_pct: speed_pct,
      optimal_feed_mm_rev: optimal_feed,
      ra_vs_feed,
    };
  }

  /**
   * Decompose total Ra into physical contribution components.
   */
  surfaceRoughnessDecomposition(params: SurfaceRoughnessDecompositionInput): SurfaceRoughnessDecompositionResult {
    const f = params.feed_mm_rev;
    const r = params.nose_radius_mm;
    const rEdge_mm = params.edge_radius_um / 1000;

    // Kinematic component
    const kinematic = (f * f) / (32 * r) * 1000; // um

    // Ploughing component (edge radius effect)
    const k_min = 0.03 * rEdge_mm;
    const kappa = params.approach_angle_deg * DEG;
    const ploughing = k_min * (1 + Math.cos(kappa)) / f * 1000;

    // Vibration component
    const vibration = params.vibration_amplitude_um
      ? params.vibration_amplitude_um * 0.5
      : 0;

    // BUE component
    const bue = params.bue_height_mm
      ? params.bue_height_mm * 3.0 * 1000 // BUE fragments degrade surface, convert to um scale
      : 0;

    // Wear component (simplified — worn edge increases ploughing)
    const wear = 0; // baseline; real value would need VB input

    const total = kinematic + ploughing + vibration + bue + wear;

    // Find dominant
    const components = { kinematic, ploughing, vibration, bue, wear };
    const entries = Object.entries(components);
    entries.sort((a, b) => b[1] - a[1]);
    const dominant_factor = entries[0][0];

    // Improvement advice
    const improvement_advice: string[] = [];
    if (kinematic > ploughing && kinematic > vibration) {
      improvement_advice.push("Reduce feed rate or increase nose radius to lower kinematic roughness.");
    }
    if (ploughing > kinematic * 0.5) {
      improvement_advice.push("Ploughing is significant — increase feed above minimum chip thickness or reduce edge radius.");
    }
    if (vibration > kinematic * 0.3) {
      improvement_advice.push("Vibration contributes significantly — improve workholding or reduce overhang.");
    }
    if (bue > 0.1) {
      improvement_advice.push("BUE is degrading surface — increase cutting speed or apply coating.");
    }
    if (improvement_advice.length === 0) {
      improvement_advice.push("Surface finish is well-optimized for current conditions.");
    }

    return {
      total_ra_um: total,
      components,
      dominant_factor,
      improvement_advice,
    };
  }

  // ── Model 4: Colding Tool Life ───────────────────────────────────

  /**
   * Colding's equivalent chip thickness tool life model.
   * More general than Taylor — accounts for engagement geometry.
   */
  coldingToolLife(params: ColdingToolLifeInput): ColdingToolLifeResult {
    const kappa = (params.approach_angle_deg ?? 90) * DEG;

    // Equivalent chip thickness
    let h_eq: number;
    if (params.operation === "milling") {
      const D = params.tool_diameter_mm ?? 20;
      h_eq = (params.feed_mm_rev * params.depth_of_cut_mm) / (Math.PI * D / 4);
    } else {
      // turning
      h_eq = params.feed_mm_rev * Math.sin(kappa);
    }

    // Hardness adjustment to Colding constants
    const hardnessScale = Math.pow(params.hardness_HB / 200, 0.3);
    const cold = COLDING_DB[params.material_type];

    const lnH = Math.log(h_eq);
    const K0 = cold.K0 / hardnessScale;
    const K1 = cold.K1;
    const K2 = cold.K2;
    const K3 = cold.K3;

    // Colding: T = exp((K0 - K1*ln(h_eq) - K2*ln(h_eq)^2) / (K3 + ln(h_eq)))
    // But we also need speed effect — full Colding uses Vc in conjunction
    // T = exp(f(h_eq)) * g(Vc)
    const numerator = K0 - K1 * lnH - K2 * lnH * lnH;
    const denominator = K3 + lnH;
    const T_base = denominator !== 0 ? Math.exp(numerator / denominator) : 1;

    // Speed correction (Colding relates Vc to h_eq for constant life)
    // Apply Taylor-like speed decay
    const taylor = TAYLOR_DB[params.material_type];
    const Vc = params.cutting_speed_mpm;
    const V_ref = taylor.C * Math.pow(T_base, -taylor.n); // reference speed for T_base life
    const speed_ratio = Vc / Math.max(V_ref, 1);
    const tool_life_min = T_base * Math.pow(speed_ratio, -1 / taylor.n);

    // Taylor equivalent
    const taylor_life = Math.pow(taylor.C / Vc, 1 / taylor.n);

    const colding_vs_taylor_error_pct = taylor_life > 0
      ? Math.abs(tool_life_min - taylor_life) / taylor_life * 100
      : 0;

    // Sensitivity analysis (numerical, +-5%)
    const delta = 0.05;
    const life_base = tool_life_min;

    // Speed sensitivity
    const life_speed_up = this._coldingLifeInternal(
      params.operation, Vc * (1 + delta), params.feed_mm_rev,
      params.depth_of_cut_mm, params.tool_diameter_mm, kappa / DEG,
      params.material_type, params.hardness_HB
    );
    const sens_speed = Math.abs((life_speed_up - life_base) / life_base / delta);

    // Feed sensitivity
    const life_feed_up = this._coldingLifeInternal(
      params.operation, Vc, params.feed_mm_rev * (1 + delta),
      params.depth_of_cut_mm, params.tool_diameter_mm, kappa / DEG,
      params.material_type, params.hardness_HB
    );
    const sens_feed = Math.abs((life_feed_up - life_base) / life_base / delta);

    // Depth sensitivity
    const life_depth_up = this._coldingLifeInternal(
      params.operation, Vc, params.feed_mm_rev,
      params.depth_of_cut_mm * (1 + delta), params.tool_diameter_mm, kappa / DEG,
      params.material_type, params.hardness_HB
    );
    const sens_depth = Math.abs((life_depth_up - life_base) / life_base / delta);

    log.debug(`[Colding] h_eq=${h_eq.toFixed(4)} T=${tool_life_min.toFixed(1)}min vs Taylor=${taylor_life.toFixed(1)}min`);

    return {
      tool_life_min: Math.max(0.1, tool_life_min),
      equivalent_chip_thickness_mm: h_eq,
      taylor_equivalent: { V: Vc, n: taylor.n, C: taylor.C },
      colding_vs_taylor_error_pct,
      sensitivity: {
        to_speed: sens_speed,
        to_feed: sens_feed,
        to_depth: sens_depth,
      },
    };
  }

  /** Internal helper for sensitivity calculation. */
  private _coldingLifeInternal(
    operation: "turning" | "milling", Vc: number, feed: number,
    depth: number, toolDia: number | undefined, approachDeg: number,
    matType: MaterialType, hardness: number
  ): number {
    const kappa = approachDeg * DEG;
    let h_eq: number;
    if (operation === "milling") {
      const D = toolDia ?? 20;
      h_eq = (feed * depth) / (Math.PI * D / 4);
    } else {
      h_eq = feed * Math.sin(kappa);
    }

    const hardnessScale = Math.pow(hardness / 200, 0.3);
    const cold = COLDING_DB[matType];
    const lnH = Math.log(h_eq);
    const K0 = cold.K0 / hardnessScale;
    const numerator = K0 - cold.K1 * lnH - cold.K2 * lnH * lnH;
    const denominator = cold.K3 + lnH;
    const T_base = denominator !== 0 ? Math.exp(numerator / denominator) : 1;

    const taylor = TAYLOR_DB[matType];
    const V_ref = taylor.C * Math.pow(T_base, -taylor.n);
    const speed_ratio = Vc / Math.max(V_ref, 1);
    return Math.max(0.1, T_base * Math.pow(speed_ratio, -1 / taylor.n));
  }

  /**
   * Compare Taylor, extended Taylor, and Colding tool life predictions
   * across a speed range.
   */
  compareTaylorColding(params: CompareTaylorColdingInput): CompareTaylorColdingResult {
    const n = Math.max(2, params.n_points);
    const [vMin, vMax] = params.speed_range;
    const step = (vMax - vMin) / (n - 1);
    const taylor = TAYLOR_DB[params.material_type];
    const operation = params.operation ?? "turning";

    const taylorCurve: { speed: number; life: number }[] = [];
    const coldingCurve: { speed: number; life: number }[] = [];
    const divergenceZones: { speed: number; max_pct_diff: number }[] = [];

    for (let i = 0; i < n; i++) {
      const v = vMin + i * step;

      // Taylor: T = (C/V)^(1/n)
      const taylorLife = Math.pow(taylor.C / v, 1 / taylor.n);
      taylorCurve.push({ speed: v, life: taylorLife });

      // Colding
      const coldingResult = this.coldingToolLife({
        operation,
        cutting_speed_mpm: v,
        feed_mm_rev: params.feed_mm_rev,
        depth_of_cut_mm: params.depth_of_cut_mm,
        tool_diameter_mm: params.tool_diameter_mm,
        approach_angle_deg: params.approach_angle_deg,
        material_type: params.material_type,
        hardness_HB: params.hardness_HB,
      });
      coldingCurve.push({ speed: v, life: coldingResult.tool_life_min });

      // Track divergence
      const pctDiff = taylorLife > 0
        ? Math.abs(coldingResult.tool_life_min - taylorLife) / taylorLife * 100
        : 0;
      if (pctDiff > 15) {
        divergenceZones.push({ speed: v, max_pct_diff: pctDiff });
      }
    }

    const models: ModelCurveResult[] = [
      {
        tool_life_curve: taylorCurve,
        model_name: "Taylor (VT^n = C)",
        parameters: { n: taylor.n, C: taylor.C },
        divergence_zones: [],
        recommendation: "Standard Taylor is reliable in mid-speed range but diverges at extremes.",
      },
      {
        tool_life_curve: coldingCurve,
        model_name: "Colding (equivalent chip thickness)",
        parameters: {
          K0: COLDING_DB[params.material_type].K0,
          K1: COLDING_DB[params.material_type].K1,
          K2: COLDING_DB[params.material_type].K2,
          K3: COLDING_DB[params.material_type].K3,
        },
        divergence_zones: divergenceZones,
        recommendation: divergenceZones.length > 0
          ? `Colding diverges from Taylor by >${divergenceZones[0].max_pct_diff.toFixed(0)}% at ${divergenceZones[0].speed.toFixed(0)} m/min. Use Colding for variable-geometry operations.`
          : "Colding and Taylor agree well across this speed range.",
      },
    ];

    return { models };
  }

  // ── Model 5: Surface Integrity Prediction ────────────────────────────

  /**
   * Surface integrity prediction: white layer thickness, microhardness,
   * and roughness degradation as function of tool flank wear.
   *
   * Based on empirical data from PMC 2024 study of AISI 4340 hard milling.
   * WLT follows exponential growth with VB: WLT ≈ 6.6 × exp(2.9 × VB)
   * Ra threshold at VB ≈ 0.4mm (below: <0.8μm, above: rapid degradation)
   * Microhardness: HV ≈ 457 + 138 × VB² (quadratic with wear)
   *
   * Reference: PMC 11415661 (2024), AISI 4340 ball nose end milling
   */
  surfaceIntegrityPrediction(input: {
    flank_wear_mm: number;
    cutting_speed_mpm?: number;
    feed_per_tooth_mm?: number;
    workpiece_hardness_HV?: number;
  }): {
    white_layer_thickness_um: { value: number; unit: string; source: string };
    surface_roughness_Ra_um: { value: number; unit: string; source: string };
    surface_microhardness_HV: { value: number; unit: string; source: string };
    hardness_affected_depth_um: { value: number; unit: string; source: string };
    integrity_rating: string;
    recommendation: string;
  } {
    const VB = Math.max(0, input.flank_wear_mm);
    const Vc = input.cutting_speed_mpm ?? 270;
    const fz = input.feed_per_tooth_mm ?? 0.06;
    const HV_work = input.workpiece_hardness_HV ?? 430;

    // ── White layer thickness: WLT = 6.6 × exp(2.9 × VB) μm ────────
    // Fitted to PMC 11415661 data: VB 0→0.6mm, WLT 6.6→39μm
    const wlt = 6.6 * Math.exp(2.9 * VB);

    // ── Surface roughness Ra: piecewise linear ───────────────────────
    // Breakpoint at VB=0.4mm (Ra=0.80μm); rapid degradation above
    let Ra: number;
    if (VB <= 0.4) {
      Ra = 0.46 + 0.85 * VB;
    } else {
      Ra = 0.46 + 0.85 * 0.4 + 9.25 * (VB - 0.4);
    }

    // ── Microhardness: HV = 457 + 138 × VB² ────────────────────────
    // Calibrated to: VB=0→457HV, VB=0.4→479HV≈482.6, VB=0.6→547HV≈540
    const HV = 457 + 138 * VB * VB;

    // ── Hardness-affected depth: linear from 70μm (VB=0) to 120μm (VB=0.6) ──
    const depth_um = 70 + (120 - 70) * Math.min(VB / 0.6, 1);

    // ── Speed / hardness scaling notes (informational) ───────────────
    // At non-reference conditions the empirical coefficients shift slightly;
    // for now we log the deviation so callers can apply engineering judgment.
    const speed_factor = Vc / 270;
    const hardness_factor = HV_work / 430;
    log.debug(
      `[SurfaceIntegrity] VB=${VB.toFixed(3)}mm WLT=${wlt.toFixed(1)}μm ` +
      `Ra=${Ra.toFixed(3)}μm HV=${HV.toFixed(1)} depth=${depth_um.toFixed(0)}μm ` +
      `speed_ratio=${speed_factor.toFixed(2)} hardness_ratio=${hardness_factor.toFixed(2)}`
    );

    // ── Integrity rating ─────────────────────────────────────────────
    let integrity_rating: string;
    if (VB < 0.1) {
      integrity_rating = "excellent";
    } else if (VB < 0.2) {
      integrity_rating = "good";
    } else if (VB < 0.4) {
      integrity_rating = "acceptable";
    } else if (VB < 0.5) {
      integrity_rating = "degraded";
    } else {
      integrity_rating = "critical";
    }

    // ── Recommendation ───────────────────────────────────────────────
    let recommendation: string;
    if (VB < 0.1) {
      recommendation = "Tool condition excellent. Surface integrity within specification. Continue operation.";
    } else if (VB < 0.2) {
      recommendation = "Surface integrity good. Monitor wear progression. Ra expected below 0.63μm.";
    } else if (VB < 0.4) {
      recommendation = `Acceptable range but white layer growing (${wlt.toFixed(1)}μm). Plan tool change before VB=0.4mm to maintain Ra<0.8μm.`;
    } else if (VB < 0.5) {
      recommendation = `VB approaching critical threshold. Ra=${Ra.toFixed(2)}μm exceeds 0.8μm limit. Replace tool immediately for hard-milling applications.`;
    } else {
      recommendation = `CRITICAL: VB=${VB.toFixed(3)}mm. WLT=${wlt.toFixed(1)}μm, Ra=${Ra.toFixed(2)}μm — severe surface degradation. Stop and replace tool now.`;
    }

    return {
      white_layer_thickness_um: {
        value: Math.round(wlt * 10) / 10,
        unit: "μm",
        source: "PMC 11415661 exponential fit: WLT=6.6×exp(2.9×VB)",
      },
      surface_roughness_Ra_um: {
        value: Math.round(Ra * 1000) / 1000,
        unit: "μm",
        source: "PMC 11415661 piecewise: Ra=0.46+0.85×VB (VB≤0.4), +9.25×(VB-0.4) above",
      },
      surface_microhardness_HV: {
        value: Math.round(HV * 10) / 10,
        unit: "HV0.5",
        source: "PMC 11415661 quadratic: HV=457+138×VB²",
      },
      hardness_affected_depth_um: {
        value: Math.round(depth_um * 10) / 10,
        unit: "μm",
        source: "Linear interpolation: 70μm at VB=0, 120μm at VB=0.6mm",
      },
      integrity_rating,
      recommendation,
    };
  }
}

// ─── Singleton Export ───────────────────────────────────────────────
export const advancedCuttingPhysicsExtEngine = new AdvancedCuttingPhysicsExtEngineImpl();
