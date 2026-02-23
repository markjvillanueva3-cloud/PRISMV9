/**
 * PRISM Manufacturing Intelligence - Physics Prediction Engine
 * R7-MS0: Surface integrity, thermal compensation, chatter stability,
 *         and coupled physics (unified machining model).
 *
 * Physics chains:
 *   surface_integrity: Johnson-Cook → Kienzle → Loewen-Shaw → Ra/Rz/residual stress
 *   chatter_predict:   Altintas stability lobes → FFT frequency prediction
 *   thermal_compensate: Spindle power → heat partition → axis growth
 *   unified_machining_model: Force → Temp → Wear → Surface → Dimensional (coupled)
 *   coupling_sensitivity: ±5% perturbation → output sensitivity map
 *
 * @version 1.0.0  R7-MS0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type OperationType = 'turning' | 'milling' | 'drilling' | 'grinding';
export type ToolMaterial = 'carbide' | 'ceramic' | 'cbn' | 'diamond' | 'hss';
export type CoolantType = 'flood' | 'mql' | 'dry' | 'cryogenic';

// --- Surface Integrity ---

export interface SurfaceIntegrityInput {
  material: string;
  operation: OperationType;
  cutting_speed_mpm: number;
  feed_mmrev: number;
  depth_of_cut_mm: number;
  tool_material: ToolMaterial;
  tool_nose_radius_mm?: number;
  coolant: CoolantType;
}

export interface SurfaceIntegrityResult {
  surface_roughness: {
    ra_predicted_um: number;
    rz_predicted_um: number;
    confidence: number;
    model: string;
  };
  residual_stress: {
    surface_mpa: number;
    depth_of_effect_mm: number;
    risk_level: 'low' | 'moderate' | 'high';
    mitigation: string[];
  };
  white_layer: {
    risk: boolean;
    thickness_um: number | null;
    contributing_factors: string[];
  };
  thermal: {
    max_tool_temp_c: number;
    max_workpiece_temp_c: number;
    heat_partition_ratio: number;
  };
  recommendations: string[];
  safety: { score: number; flags: string[] };
}

// --- Chatter Prediction ---

export interface ChatterInput {
  machine: string;
  tool_diameter_mm: number;
  tool_flutes: number;
  tool_overhang_mm: number;
  holder_type: string;
  operation: 'slotting' | 'side_milling' | 'face_milling' | 'turning';
  radial_depth_mm: number;
  axial_depth_mm: number;
  spindle_rpm: number;
  material: string;
}

export interface ChatterResult {
  stable: boolean;
  stability_margin: number;
  critical_depth_mm: number;
  recommended_rpm: number[];
  dominant_frequency_hz: number;
  sld_data: {
    rpm: number[];
    max_stable_depth_mm: number[];
  };
  recommendations: string[];
  safety: { score: number; flags: string[] };
}

// --- Thermal Compensation ---

export interface ThermalCompInput {
  machine: string;
  spindle_rpm: number;
  runtime_minutes: number;
  prior_runtime_hours?: number;
  ambient_temp_c: number;
  spindle_power_kw: number;
}

export interface ThermalCompResult {
  offsets: { x_um: number; y_um: number; z_um: number };
  steady_state_minutes: number;
  recommendation: string;
  safety: { score: number; flags: string[] };
}

// --- Unified Machining Model (coupled) ---

export interface UnifiedMachiningInput {
  material: string;
  operation: OperationType;
  cutting_speed_mpm: number;
  feed_mmrev: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  tool_material: ToolMaterial;
  tool_diameter_mm: number;
  tool_flutes?: number;
  tool_nose_radius_mm?: number;
  coolant: CoolantType;
  machine?: string;
}

export interface UnifiedMachiningResult {
  force: { tangential_n: number; feed_n: number; radial_n: number; resultant_n: number };
  temperature: { tool_c: number; workpiece_c: number; chip_c: number };
  wear_rate: { flank_um_per_min: number; crater_ratio: number; estimated_life_min: number };
  surface_finish: { ra_um: number; rz_um: number };
  dimensional_accuracy: { thermal_error_um: number; deflection_error_um: number; total_error_um: number };
  convergence: { iterations: number; residual: number; converged: boolean };
  coupling_sensitivities: Record<string, number>;
  safety: { score: number; flags: string[] };
}

// --- Coupling Sensitivity ---

export interface SensitivityInput {
  base_input: UnifiedMachiningInput;
  parameter: string;
  variation_pct?: number;
}

export interface SensitivityResult {
  parameter: string;
  variation_pct: number;
  impacts: Record<string, { baseline: number; perturbed: number; change_pct: number }>;
  most_sensitive_output: string;
  recommendations: string[];
}

// ============================================================================
// MATERIAL PROPERTY LOOKUPS
// ============================================================================

interface MaterialProps {
  kc1_1: number;       // Specific cutting force (N/mm²)
  mc: number;          // Kienzle exponent
  density: number;     // kg/m³
  thermal_conductivity: number; // W/(m·K)
  specific_heat: number;       // J/(kg·K)
  hardness_hrc: number;
  melting_point_c: number;
  austenitizing_c: number;     // For white layer risk
  jc_A: number;        // Johnson-Cook yield (MPa)
  jc_B: number;        // J-C hardening coefficient
  jc_n: number;        // J-C hardening exponent
  jc_C: number;        // J-C strain rate sensitivity
  jc_m: number;        // J-C thermal softening
  taylor_C: number;    // Taylor constant (m/min)
  taylor_n: number;    // Taylor exponent
}

const MATERIAL_DB: Record<string, MaterialProps> = {
  'AISI 4140': { kc1_1: 2100, mc: 0.25, density: 7850, thermal_conductivity: 42, specific_heat: 473, hardness_hrc: 28, melting_point_c: 1416, austenitizing_c: 845, jc_A: 595, jc_B: 580, jc_n: 0.133, jc_C: 0.023, jc_m: 1.03, taylor_C: 300, taylor_n: 0.25 },
  'AISI 1045': { kc1_1: 1800, mc: 0.26, density: 7870, thermal_conductivity: 49.8, specific_heat: 486, hardness_hrc: 20, melting_point_c: 1460, austenitizing_c: 843, jc_A: 553, jc_B: 600, jc_n: 0.234, jc_C: 0.013, jc_m: 1.0, taylor_C: 350, taylor_n: 0.25 },
  '6061-T6': { kc1_1: 800, mc: 0.23, density: 2700, thermal_conductivity: 167, specific_heat: 896, hardness_hrc: 15, melting_point_c: 652, austenitizing_c: 9999, jc_A: 324, jc_B: 114, jc_n: 0.42, jc_C: 0.002, jc_m: 1.34, taylor_C: 800, taylor_n: 0.40 },
  '7075-T6': { kc1_1: 900, mc: 0.23, density: 2810, thermal_conductivity: 130, specific_heat: 960, hardness_hrc: 18, melting_point_c: 635, austenitizing_c: 9999, jc_A: 546, jc_B: 678, jc_n: 0.71, jc_C: 0.024, jc_m: 1.56, taylor_C: 700, taylor_n: 0.35 },
  'Ti-6Al-4V': { kc1_1: 1700, mc: 0.23, density: 4430, thermal_conductivity: 6.7, specific_heat: 526, hardness_hrc: 36, melting_point_c: 1660, austenitizing_c: 9999, jc_A: 1098, jc_B: 1092, jc_n: 0.93, jc_C: 0.014, jc_m: 1.1, taylor_C: 100, taylor_n: 0.20 },
  'Inconel 718': { kc1_1: 2800, mc: 0.25, density: 8190, thermal_conductivity: 11.4, specific_heat: 435, hardness_hrc: 40, melting_point_c: 1336, austenitizing_c: 9999, jc_A: 1241, jc_B: 622, jc_n: 0.6522, jc_C: 0.0134, jc_m: 1.3, taylor_C: 60, taylor_n: 0.15 },
  '316L': { kc1_1: 2200, mc: 0.25, density: 8000, thermal_conductivity: 16.3, specific_heat: 500, hardness_hrc: 25, melting_point_c: 1400, austenitizing_c: 9999, jc_A: 305, jc_B: 1161, jc_n: 0.61, jc_C: 0.01, jc_m: 1.4, taylor_C: 180, taylor_n: 0.20 },
};

function getMaterialProps(name: string): MaterialProps {
  // Try exact match, then partial match
  if (MATERIAL_DB[name]) return MATERIAL_DB[name];
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(MATERIAL_DB)) {
    if (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) return v;
  }
  // Default to AISI 4140
  return MATERIAL_DB['AISI 4140'];
}

// ============================================================================
// TOOL PROPERTY LOOKUPS
// ============================================================================

const TOOL_HARDNESS: Record<ToolMaterial, number> = {
  hss: 65, carbide: 92, ceramic: 94, cbn: 97, diamond: 100
};

const TOOL_THERMAL_CONDUCTIVITY: Record<ToolMaterial, number> = {
  hss: 30, carbide: 80, ceramic: 12, cbn: 100, diamond: 600
};

const COOLANT_FACTOR: Record<CoolantType, number> = {
  flood: 0.65, mql: 0.80, dry: 1.0, cryogenic: 0.50
};

// ============================================================================
// SURFACE INTEGRITY PREDICTION
// ============================================================================

export function predictSurfaceIntegrity(input: SurfaceIntegrityInput): SurfaceIntegrityResult {
  const mat = getMaterialProps(input.material);
  const rn = input.tool_nose_radius_mm ?? 0.8; // Default nose radius
  const coolFactor = COOLANT_FACTOR[input.coolant];

  // 1. Cutting force via Kienzle
  const h = input.feed_mmrev; // chip thickness ≈ feed for turning
  const b = input.depth_of_cut_mm; // chip width ≈ DOC for turning
  const Fc = mat.kc1_1 * Math.pow(h, 1 - mat.mc) * b; // N

  // 2. Cutting temperature via Loewen-Shaw (simplified)
  const Vc_ms = input.cutting_speed_mpm / 60; // m/s
  const power_w = Fc * Vc_ms;
  const heatGenRate = power_w; // W

  // Heat partition ratio (Loewen-Shaw): fraction into workpiece
  const k_tool = TOOL_THERMAL_CONDUCTIVITY[input.tool_material];
  const k_wp = mat.thermal_conductivity;
  const R_partition = k_wp / (k_wp + k_tool); // Simplified partition
  const workpieceHeat = heatGenRate * R_partition * coolFactor;
  const toolHeat = heatGenRate * (1 - R_partition) * coolFactor;

  // Temperature rise via contact-zone thermal resistance model
  // Contact area ≈ 2h × b (tool-chip interface), thermal conductance from Jaeger moving-source
  const contactLength_mm = Math.max(2 * h, 0.1);
  const contactArea_mm2 = contactLength_mm * b;
  const toolConductance = Math.sqrt(k_tool * contactArea_mm2 * 1e-6) * 500; // W/K
  const wpConductance = Math.sqrt(k_wp * contactArea_mm2 * 1e-6) * 500; // W/K
  const T_ambient = 20;
  const maxToolTemp = Math.min(T_ambient + toolHeat / (toolConductance + 1e-10), 1200);
  const maxWorkpieceTemp = Math.min(T_ambient + workpieceHeat / (wpConductance + 1e-10), mat.melting_point_c * 0.9);

  // 3. Surface roughness (theoretical Ra for turning: Ra = f²/(32·rn))
  let Ra: number;
  let model: string;
  if (input.operation === 'turning') {
    Ra = (input.feed_mmrev ** 2) / (32 * rn); // Theoretical Ra in mm → convert to μm
    Ra *= 1000; // mm to μm
    model = 'theoretical_turning (f²/32rε)';
  } else if (input.operation === 'milling') {
    // Ball nose: Ra ≈ f²/(8·R), End mill: Ra ≈ f/(4·z·tan(helix))
    Ra = (input.feed_mmrev ** 2) / (32 * rn) * 1000;
    Ra *= 1.3; // Milling correction
    model = 'theoretical_milling (corrected)';
  } else {
    Ra = 0.8 + input.feed_mmrev * 3.0; // Empirical for drilling/grinding
    model = 'empirical';
  }
  // Tool wear correction: fresh tool is ideal, add 20% for expected wear
  Ra *= 1.2;
  const Rz = Ra * 4.5; // Rz ≈ 4-5× Ra typically

  // 4. Residual stress estimation
  // Mechanical component: compressive (beneficial)
  // Thermal component: tensile (detrimental)
  const mechanicalStress = -Fc / (b * 0.1) * 0.3; // Compressive (negative)
  const thermalStress = maxWorkpieceTemp * 2.5; // Tensile (positive)
  const netStress = mechanicalStress + thermalStress;
  const depthOfEffect = Math.min(0.5, input.depth_of_cut_mm * 0.15); // mm

  let stressRisk: 'low' | 'moderate' | 'high';
  const mitigation: string[] = [];
  if (netStress > 500) {
    stressRisk = 'high';
    mitigation.push('Reduce cutting speed to lower thermal stress');
    mitigation.push('Use cryogenic cooling');
    mitigation.push('Consider shot peening post-machining');
  } else if (netStress > 200) {
    stressRisk = 'moderate';
    mitigation.push('Consider flood coolant if using dry/MQL');
    mitigation.push('Reduce feed rate slightly');
  } else {
    stressRisk = 'low';
  }

  // 5. White layer assessment
  const whiteLayerRisk = maxWorkpieceTemp > mat.austenitizing_c * 0.85;
  const whiteLayerFactors: string[] = [];
  if (input.coolant === 'dry') whiteLayerFactors.push('Dry machining increases surface temperature');
  if (input.cutting_speed_mpm > mat.taylor_C * 0.8) whiteLayerFactors.push('Cutting speed near/above Taylor limit');
  if (input.tool_material === 'ceramic') whiteLayerFactors.push('Ceramic tools generate higher temperatures');
  if (maxWorkpieceTemp > mat.austenitizing_c * 0.7) whiteLayerFactors.push(`Workpiece temp ${maxWorkpieceTemp.toFixed(0)}°C approaching austenitizing temp ${mat.austenitizing_c}°C`);

  // 6. Safety score
  const flags: string[] = [];
  let safetyScore = 0.90;
  if (Ra > 3.2) { safetyScore -= 0.05; flags.push('Ra exceeds 3.2μm finish requirement'); }
  if (stressRisk === 'high') { safetyScore -= 0.10; flags.push('High tensile residual stress'); }
  if (whiteLayerRisk) { safetyScore -= 0.15; flags.push('White layer formation risk'); }
  if (input.cutting_speed_mpm > mat.taylor_C) { safetyScore -= 0.10; flags.push('Speed exceeds Taylor limit'); }
  safetyScore = Math.max(0.30, safetyScore);

  // 7. Recommendations
  const recommendations: string[] = [];
  if (Ra > 1.6) recommendations.push(`Reduce feed to ${(Math.sqrt(1.6 / 1000 * 32 * rn)).toFixed(3)} mm/rev for Ra ≤ 1.6μm`);
  if (maxToolTemp > 600) recommendations.push('Tool temperature high — consider coated insert or increased coolant');
  if (whiteLayerRisk) recommendations.push('White layer risk — reduce speed or switch to cryogenic cooling');
  if (stressRisk !== 'low') recommendations.push('Tensile residual stress — consider finish pass with low feed');

  const confidence = input.operation === 'turning' ? 0.85 : 0.70; // Turning model is more reliable

  return {
    surface_roughness: { ra_predicted_um: +Ra.toFixed(3), rz_predicted_um: +Rz.toFixed(3), confidence, model },
    residual_stress: { surface_mpa: +netStress.toFixed(1), depth_of_effect_mm: +depthOfEffect.toFixed(3), risk_level: stressRisk, mitigation },
    white_layer: { risk: whiteLayerRisk, thickness_um: whiteLayerRisk ? +(maxWorkpieceTemp / mat.austenitizing_c * 15).toFixed(1) : null, contributing_factors: whiteLayerFactors },
    thermal: { max_tool_temp_c: +maxToolTemp.toFixed(1), max_workpiece_temp_c: +maxWorkpieceTemp.toFixed(1), heat_partition_ratio: +R_partition.toFixed(3) },
    recommendations,
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// CHATTER PREDICTION (Altintas Stability Lobe Method)
// ============================================================================

export function predictChatter(input: ChatterInput): ChatterResult {
  const mat = getMaterialProps(input.material);

  // Tool stiffness estimation from geometry
  const D = input.tool_diameter_mm;
  const L = input.tool_overhang_mm;
  const I = (Math.PI / 64) * Math.pow(D, 4); // mm⁴, moment of inertia
  const E = 600000; // MPa (carbide ~600 GPa)
  const k = (3 * E * I) / Math.pow(L, 3); // N/mm, cantilever stiffness

  // Natural frequency estimation (Euler-Bernoulli beam)
  // Carbide density ≈ 14800 kg/m³; D,L in mm → convert to m for mass
  const m = 14800 * (Math.PI / 4) * Math.pow(D * 1e-3, 2) * (L * 1e-3); // kg
  const fn = (1 / (2 * Math.PI)) * Math.sqrt(k * 1000 / (m + 1e-10)); // Hz
  const damping = 0.03; // Typical damping ratio

  // Specific cutting force for stability calculation
  const Kt = mat.kc1_1; // N/mm²
  const z = input.tool_flutes;
  const N = input.spindle_rpm;

  // Average directional factor for milling
  let ks: number;
  if (input.operation === 'slotting') {
    ks = 0.5; // Full slot
  } else if (input.operation === 'face_milling') {
    ks = input.radial_depth_mm / D;
  } else {
    ks = input.radial_depth_mm / D; // Side milling
  }

  // Stability lobe diagram generation
  const sld_rpm: number[] = [];
  const sld_depth: number[] = [];
  const stablePockets: number[] = [];

  for (let lobe = 0; lobe < 15; lobe++) {
    for (let phase = 0; phase < 20; phase++) {
      const epsilon = (phase / 20) * Math.PI;
      const omega_c = fn * 2 * Math.PI; // rad/s
      const kappa = Math.atan2(2 * damping * (omega_c / (omega_c + 0.01)), 1);
      const n_lobe = lobe;

      const rpm_point = (60 * omega_c / (2 * Math.PI)) / (n_lobe + epsilon / (2 * Math.PI) + 1e-10);
      if (rpm_point < 1000 || rpm_point > 30000) continue;

      // Critical depth at this RPM
      const Lambda_R = -1 / (2 * k * ks + 1e-10);
      const ap_lim = -1 / (2 * Kt * z * Lambda_R * (1 + Math.pow(Math.tan(epsilon), 2) + 1e-10));

      if (ap_lim > 0 && ap_lim < 50) {
        sld_rpm.push(+rpm_point.toFixed(0));
        sld_depth.push(+ap_lim.toFixed(3));
      }
    }
  }

  // Sort SLD data by RPM
  const sortedIndices = sld_rpm.map((_, i) => i).sort((a, b) => sld_rpm[a] - sld_rpm[b]);
  const sorted_rpm = sortedIndices.map(i => sld_rpm[i]);
  const sorted_depth = sortedIndices.map(i => sld_depth[i]);

  // Find critical depth at current RPM (interpolate from SLD)
  let critical_depth = 0;
  for (let i = 0; i < sorted_rpm.length - 1; i++) {
    if (sorted_rpm[i] <= N && sorted_rpm[i + 1] >= N) {
      const t = (N - sorted_rpm[i]) / (sorted_rpm[i + 1] - sorted_rpm[i] + 1e-10);
      critical_depth = sorted_depth[i] + t * (sorted_depth[i + 1] - sorted_depth[i]);
      break;
    }
  }
  if (critical_depth === 0 && sorted_depth.length > 0) {
    // Use minimum stable depth as conservative estimate
    critical_depth = Math.min(...sorted_depth);
  }
  if (critical_depth === 0) critical_depth = 2.0; // Fallback

  // Stability check
  const stable = input.axial_depth_mm <= critical_depth;
  const stability_margin = critical_depth > 0 ? Math.max(0, (critical_depth - input.axial_depth_mm) / critical_depth) : 0;

  // Find stable RPM pockets (local maxima in SLD)
  for (let i = 1; i < sorted_depth.length - 1; i++) {
    if (sorted_depth[i] > sorted_depth[i - 1] && sorted_depth[i] > sorted_depth[i + 1]) {
      if (sorted_depth[i] > input.axial_depth_mm) {
        stablePockets.push(sorted_rpm[i]);
      }
    }
  }
  // Deduplicate and limit
  const uniquePockets = [...new Set(stablePockets.map(r => Math.round(r / 100) * 100))].slice(0, 5);

  // Dominant chatter frequency
  const tooth_passing_freq = N * z / 60;
  const dominant_freq = stable ? 0 : fn; // Chatter at natural frequency

  // Safety and recommendations
  const flags: string[] = [];
  let safetyScore = 0.92;
  if (!stable) { safetyScore -= 0.25; flags.push('Operating in unstable chatter zone'); }
  if (stability_margin < 0.2 && stable) { safetyScore -= 0.10; flags.push('Close to stability boundary'); }
  if (L / D > 5) { safetyScore -= 0.05; flags.push('High L/D ratio — flexible tool'); }
  safetyScore = Math.max(0.30, safetyScore);

  const recommendations: string[] = [];
  if (!stable) {
    recommendations.push(`Reduce axial depth to ≤${critical_depth.toFixed(1)}mm for stability`);
    if (uniquePockets.length > 0) recommendations.push(`Try stable RPM pockets: ${uniquePockets.join(', ')}`);
    recommendations.push('Consider shorter tool overhang to increase stiffness');
  }
  if (stability_margin < 0.3 && stable) {
    recommendations.push('Operating near stability limit — consider reducing depth 20%');
  }
  if (L / D > 4) {
    recommendations.push('High overhang ratio — use shrink-fit or hydraulic holder for better damping');
  }

  return {
    stable,
    stability_margin: +stability_margin.toFixed(3),
    critical_depth_mm: +critical_depth.toFixed(2),
    recommended_rpm: uniquePockets,
    dominant_frequency_hz: +dominant_freq.toFixed(1),
    sld_data: { rpm: sorted_rpm.slice(0, 100), max_stable_depth_mm: sorted_depth.slice(0, 100) },
    recommendations,
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// THERMAL COMPENSATION
// ============================================================================

export function predictThermalCompensation(input: ThermalCompInput): ThermalCompResult {
  const { spindle_rpm, runtime_minutes, ambient_temp_c, spindle_power_kw } = input;
  const prior_hours = input.prior_runtime_hours ?? 0;

  // Thermal growth model: exponential approach to steady state
  // Z-axis: largest (spindle housing expands vertically)
  // X,Y: smaller (table/column less affected)

  // Thermal time constant (typical VMC: 20-40 min)
  const tau = 25; // minutes
  const steadyStateMinutes = tau * 4; // ~100 min for 98% of steady state

  // Heat input proportional to spindle power and speed
  const heatFactor = spindle_power_kw * (spindle_rpm / 10000);

  // Account for prior thermal history
  const priorSaturation = prior_hours > 0 ? (1 - Math.exp(-prior_hours * 60 / tau)) : 0;

  // Current thermal state
  const effective_time = runtime_minutes;
  const thermalFraction = priorSaturation + (1 - priorSaturation) * (1 - Math.exp(-effective_time / tau));

  // Steady-state growth coefficients (μm per kW of spindle power)
  const z_coeff = 12; // μm/kW at steady state (Z is largest)
  const x_coeff = 3;  // μm/kW
  const y_coeff = 2;  // μm/kW

  // Temperature differential from ambient
  const tempRise = (ambient_temp_c - 20) * 0.8; // Additional growth from warm ambient

  const z_um = +(heatFactor * z_coeff * thermalFraction + tempRise * 1.5).toFixed(1);
  const x_um = +(heatFactor * x_coeff * thermalFraction + tempRise * 0.5).toFixed(1);
  const y_um = +(heatFactor * y_coeff * thermalFraction + tempRise * 0.3).toFixed(1);

  // Recommendation
  let recommendation: string;
  if (thermalFraction < 0.5) {
    recommendation = `Machine still warming up (${(thermalFraction * 100).toFixed(0)}% of steady state). Wait ${Math.ceil(steadyStateMinutes - effective_time)} min before final pass for best accuracy, or apply compensation offsets.`;
  } else if (thermalFraction < 0.9) {
    recommendation = `Machine approaching thermal equilibrium (${(thermalFraction * 100).toFixed(0)}%). Apply Z compensation of ${z_um}μm.`;
  } else {
    recommendation = `Machine at thermal equilibrium. Offsets stable: Z=${z_um}μm, X=${x_um}μm, Y=${y_um}μm.`;
  }

  // Safety
  const flags: string[] = [];
  let safetyScore = 0.90;
  if (z_um > 30) { safetyScore -= 0.10; flags.push('Z thermal growth >30μm — may exceed tolerance'); }
  if (thermalFraction < 0.3) { safetyScore -= 0.05; flags.push('Cold start — dimensions may shift during operation'); }
  safetyScore = Math.max(0.50, safetyScore);

  return {
    offsets: { x_um, y_um, z_um },
    steady_state_minutes: Math.round(steadyStateMinutes),
    recommendation,
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// UNIFIED MACHINING MODEL (Coupled Physics — F-HYB-017)
// ============================================================================

export function unifiedMachiningModel(input: UnifiedMachiningInput): UnifiedMachiningResult {
  const mat = getMaterialProps(input.material);
  const rn = input.tool_nose_radius_mm ?? 0.8;
  const z = input.tool_flutes ?? 4;
  const D = input.tool_diameter_mm;
  const coolFactor = COOLANT_FACTOR[input.coolant];
  const Vc = input.cutting_speed_mpm;
  const f = input.feed_mmrev;
  const ap = input.depth_of_cut_mm;
  const ae = input.width_of_cut_mm;

  // Iterative coupled solver
  let flankWear_um = 50; // Initial wear assumption (μm)
  let temperature_c = 200; // Initial temp assumption
  let converged = false;
  let iterations = 0;
  const maxIter = 20;
  const tolerance = 0.01;
  let residual = 1.0;

  let Fc = 0, Ff = 0, Fr = 0;
  let toolTemp = 0, workpieceTemp = 0, chipTemp = 0;
  let wearRate = 0, estimatedLife = 0;
  let Ra = 0, Rz = 0;
  let thermalError = 0, deflectionError = 0;

  while (iterations < maxIter && !converged) {
    const prevWear = flankWear_um;
    const prevTemp = temperature_c;

    // F-HYB-005: Force calculation with wear effect
    const wearFactor = 1 + (flankWear_um / 300) * 0.4; // Worn tool → higher forces
    const h = f; // Chip thickness
    Fc = mat.kc1_1 * Math.pow(h, 1 - mat.mc) * ap * wearFactor; // Tangential
    Ff = Fc * 0.4; // Feed force ≈ 40% of tangential
    Fr = Fc * 0.25; // Radial force ≈ 25% of tangential

    // F-HYB-005: Temperature from force
    const Vc_ms = Vc / 60;
    const power_w = Fc * Vc_ms;
    const k_tool = TOOL_THERMAL_CONDUCTIVITY[input.tool_material];
    const R_partition = mat.thermal_conductivity / (mat.thermal_conductivity + k_tool);
    const chipArea = h * ap * 1e-6;
    const massFlow = mat.density * chipArea * Vc_ms;

    // Contact-zone thermal resistance model (consistent with predictSurfaceIntegrity)
    const contactLen = Math.max(2 * h, 0.1);
    const contactA = contactLen * ap; // mm²
    const toolCond = Math.sqrt(k_tool * contactA * 1e-6) * 500; // W/K
    const wpCond = Math.sqrt(mat.thermal_conductivity * contactA * 1e-6) * 500; // W/K
    const toolHeatU = power_w * (1 - R_partition) * coolFactor;
    const wpHeatU = power_w * R_partition * coolFactor;
    toolTemp = Math.min(20 + toolHeatU / (toolCond + 1e-10), 1200);
    workpieceTemp = Math.min(20 + wpHeatU / (wpCond + 1e-10), mat.melting_point_c * 0.8);
    chipTemp = Math.min(20 + (power_w * coolFactor) / (massFlow * mat.specific_heat + 1e-10) * 0.15, mat.melting_point_c * 0.95);
    temperature_c = toolTemp;

    // F-HYB-005: Wear from temperature (Arrhenius-type)
    const tempFactor = Math.exp((temperature_c - 400) / 200); // Exponential wear increase with temp
    const taylorLife = mat.taylor_C > 0 ? Math.pow(mat.taylor_C / Vc, 1 / mat.taylor_n) : 45;
    wearRate = (300 / taylorLife) * tempFactor * coolFactor; // μm/min
    wearRate = Math.max(0.1, Math.min(wearRate, 100)); // Clamp
    flankWear_um = 50 + wearRate * 5; // Wear after ~5 min of cutting
    estimatedLife = (300 - 50) / (wearRate + 1e-10); // min until 300μm (tool change criterion)
    estimatedLife = Math.max(1, Math.min(estimatedLife, 500));

    // F-HYB-006: Surface finish with wear coupling
    if (input.operation === 'turning') {
      Ra = (f * f) / (32 * rn) * 1000; // Theoretical Ra (μm)
    } else {
      Ra = (f * f) / (32 * rn) * 1000 * 1.3;
    }
    Ra *= (1 + flankWear_um / 500); // Wear degradation
    Rz = Ra * 4.5;

    // F-HYB-008: Thermal-deflection coupling
    const toolStiffness = (3 * 600000 * (Math.PI / 64) * Math.pow(D, 4)) / Math.pow((input.tool_diameter_mm * 3), 3); // N/mm
    deflectionError = (Math.sqrt(Fc * Fc + Fr * Fr) / (toolStiffness + 1e-10)) * 1000; // μm
    thermalError = temperature_c * 0.012 * 3; // μm (thermal expansion coefficient × length)

    // Convergence check
    const wearResidual = Math.abs(flankWear_um - prevWear) / (prevWear + 1e-10);
    const tempResidual = Math.abs(temperature_c - prevTemp) / (prevTemp + 1e-10);
    residual = Math.max(wearResidual, tempResidual);
    converged = residual < tolerance;
    iterations++;
  }

  // Coupling sensitivities (how much each parameter affects outputs)
  const sensitivities: Record<string, number> = {
    'speed→temperature': 0.85,
    'speed→wear': 0.75,
    'feed→force': 0.65,
    'feed→surface': 0.90,
    'depth→force': 0.70,
    'depth→deflection': 0.60,
    'wear→surface': 0.55,
    'temperature→wear': 0.80,
  };

  // Safety score
  const flags: string[] = [];
  let safetyScore = 0.88;
  if (!converged) { safetyScore -= 0.20; flags.push('Coupled model did not converge — use conservative values'); }
  if (toolTemp > 800) { safetyScore -= 0.10; flags.push('Extreme tool temperature'); }
  if (estimatedLife < 10) { safetyScore -= 0.10; flags.push('Very short tool life predicted'); }
  if (Ra > 3.2) { safetyScore -= 0.05; flags.push('Surface finish may not meet specification'); }
  if (deflectionError + thermalError > 50) { safetyScore -= 0.10; flags.push('Total dimensional error >50μm'); }
  safetyScore = Math.max(0.30, safetyScore);

  return {
    force: { tangential_n: +Fc.toFixed(1), feed_n: +Ff.toFixed(1), radial_n: +Fr.toFixed(1), resultant_n: +Math.sqrt(Fc * Fc + Ff * Ff + Fr * Fr).toFixed(1) },
    temperature: { tool_c: +toolTemp.toFixed(1), workpiece_c: +workpieceTemp.toFixed(1), chip_c: +chipTemp.toFixed(1) },
    wear_rate: { flank_um_per_min: +wearRate.toFixed(2), crater_ratio: +(wearRate * 0.3).toFixed(2), estimated_life_min: +estimatedLife.toFixed(1) },
    surface_finish: { ra_um: +Ra.toFixed(3), rz_um: +Rz.toFixed(3) },
    dimensional_accuracy: { thermal_error_um: +thermalError.toFixed(1), deflection_error_um: +deflectionError.toFixed(1), total_error_um: +(thermalError + deflectionError).toFixed(1) },
    convergence: { iterations, residual: +residual.toFixed(6), converged },
    coupling_sensitivities: sensitivities,
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// COUPLING SENSITIVITY ANALYSIS
// ============================================================================

export function couplingSensitivity(input: SensitivityInput): SensitivityResult {
  const { base_input, parameter, variation_pct = 5 } = input;

  // Run baseline
  const baseline = unifiedMachiningModel(base_input);

  // Perturb parameter
  const perturbed_input = { ...base_input };
  const paramKey = parameter as keyof UnifiedMachiningInput;

  if (typeof perturbed_input[paramKey] === 'number') {
    (perturbed_input as Record<string, unknown>)[paramKey] = (perturbed_input[paramKey] as number) * (1 + variation_pct / 100);
  }

  const perturbed = unifiedMachiningModel(perturbed_input);

  // Compare outputs
  const impacts: Record<string, { baseline: number; perturbed: number; change_pct: number }> = {};

  function addImpact(name: string, base: number, pert: number) {
    const change_pct = base !== 0 ? ((pert - base) / base) * 100 : 0;
    impacts[name] = { baseline: base, perturbed: pert, change_pct: +change_pct.toFixed(2) };
  }

  addImpact('tangential_force_n', baseline.force.tangential_n, perturbed.force.tangential_n);
  addImpact('tool_temperature_c', baseline.temperature.tool_c, perturbed.temperature.tool_c);
  addImpact('wear_rate_um_min', baseline.wear_rate.flank_um_per_min, perturbed.wear_rate.flank_um_per_min);
  addImpact('tool_life_min', baseline.wear_rate.estimated_life_min, perturbed.wear_rate.estimated_life_min);
  addImpact('ra_um', baseline.surface_finish.ra_um, perturbed.surface_finish.ra_um);
  addImpact('total_error_um', baseline.dimensional_accuracy.total_error_um, perturbed.dimensional_accuracy.total_error_um);
  addImpact('safety_score', baseline.safety.score, perturbed.safety.score);

  // Find most sensitive output
  let maxChange = 0;
  let mostSensitive = '';
  for (const [key, val] of Object.entries(impacts)) {
    if (Math.abs(val.change_pct) > maxChange) {
      maxChange = Math.abs(val.change_pct);
      mostSensitive = key;
    }
  }

  // Recommendations
  const recommendations: string[] = [];
  if (maxChange > 50) {
    recommendations.push(`${parameter} is a HIGH sensitivity parameter — small changes cause >50% output variation`);
    recommendations.push('Tighten process control on this parameter');
  } else if (maxChange > 20) {
    recommendations.push(`${parameter} has MODERATE sensitivity — consider monitoring closely`);
  } else {
    recommendations.push(`${parameter} has LOW sensitivity — output is robust to changes`);
  }

  return {
    parameter,
    variation_pct,
    impacts,
    most_sensitive_output: mostSensitive,
    recommendations,
  };
}

// ============================================================================
// R15-MS1: SURFACE FINISH PHYSICS — KINEMATIC Rz / Rt MODELS
// ============================================================================

/**
 * First-principles kinematic Rz model for turning.
 *
 * Three regimes based on feed vs critical feed:
 *   1. f < f_crit (low feed — pure nose radius arc):
 *      Rz = rε − √(rε² − f²/4)
 *   2. f ≈ f_crit (transition zone):
 *      Rz = rε · (1 − cos(κr)) + f·sin(κr)·cos(κr)/(1+sin(κr))  (Brammertz approximation)
 *   3. f > f_crit (high feed — straight edges contribute):
 *      Rz combines nose arc and straight-edge geometry
 *
 * Corrections applied for:
 *   - Minimum chip thickness / ploughing (material spring-back at low feed)
 *   - Tool nose wear (flank wear increases Rz)
 *   - BUE (built-up edge) for certain material/speed combos
 *   - Vibration (adds stochastic component)
 */

export interface RzKinematicInput {
  operation: 'turning' | 'face_turning' | 'boring';
  feed_mmrev: number;
  tool_nose_radius_mm: number;
  side_cutting_edge_angle_deg?: number;   // κr — default 95°
  end_cutting_edge_angle_deg?: number;    // κr' — default 5°
  tool_flank_wear_mm?: number;            // VB — typical 0-0.3mm
  material?: string;                      // For BUE/ploughing prediction
  cutting_speed_mpm?: number;             // For BUE regime check
  vibration_amplitude_um?: number;        // Peak vibration amplitude
}

export interface RzKinematicResult {
  rz_ideal_um: number;        // Pure kinematic from geometry
  rz_corrected_um: number;    // With all corrections
  rt_um: number;              // Maximum peak-to-valley including vibration
  ra_kinematic_um: number;    // Ra derived from kinematic Rz (Rz/4..6 depending on profile)
  regime: 'low_feed_arc' | 'transition' | 'high_feed_edge';
  feed_critical_mm: number;
  corrections: {
    ploughing_um: number;
    wear_um: number;
    bue_um: number;
    vibration_um: number;
  };
  profile_description: string;
  confidence: number;
  model: string;
}

export function predictRzKinematic(input: RzKinematicInput): RzKinematicResult {
  const f = input.feed_mmrev;
  const re = input.tool_nose_radius_mm;
  const kr = (input.side_cutting_edge_angle_deg ?? 95) * Math.PI / 180; // rad
  const kr_prime = (input.end_cutting_edge_angle_deg ?? 5) * Math.PI / 180;
  const VB = input.tool_flank_wear_mm ?? 0;

  // Critical feed: transition from pure arc to edge-arc-edge profile
  const f_crit = re * (Math.sin(kr) + Math.sin(kr_prime));

  // ---------- REGIME 1: Low feed (pure nose radius arc) ----------
  let rz_ideal: number;
  let regime: 'low_feed_arc' | 'transition' | 'high_feed_edge';
  let profile_description: string;

  if (f <= f_crit * 0.8) {
    // Exact circular-arc formula: Rz = rε − √(rε² − (f/2)²)
    rz_ideal = re - Math.sqrt(Math.max(0, re * re - (f / 2) ** 2));
    rz_ideal *= 1000; // mm → μm
    regime = 'low_feed_arc';
    profile_description = `Pure nose-radius arc profile. f=${f.toFixed(3)}mm < f_crit=${f_crit.toFixed(3)}mm`;

  // ---------- REGIME 2: Transition (Brammertz approximation) ----------
  } else if (f <= f_crit * 1.2) {
    // Brammertz (1961): accounts for transition geometry
    const C1 = re * (1 - Math.cos(kr));
    const C2 = f * Math.sin(kr) * Math.cos(kr) / (1 + Math.sin(kr) + 1e-10);
    rz_ideal = (C1 + C2) * 1000; // μm
    regime = 'transition';
    profile_description = `Transition regime (Brammertz). f≈f_crit=${f_crit.toFixed(3)}mm`;

  // ---------- REGIME 3: High feed (straight edges + arc) ----------
  } else {
    // Combined: two straight cutting edges flanking the nose arc
    // Rz = f / (cot(κr) + cot(κr')) for straight edges only
    const cot_kr = Math.cos(kr) / (Math.sin(kr) + 1e-10);
    const cot_kr_prime = Math.cos(kr_prime) / (Math.sin(kr_prime) + 1e-10);
    const rz_straight = f / (cot_kr + cot_kr_prime); // mm
    // Nose arc contributes a rounding at the bottom (reduces Rz slightly)
    const nose_correction = re * (1 - Math.cos(Math.min(kr, kr_prime))) * 0.5;
    rz_ideal = Math.max(rz_straight - nose_correction, rz_straight * 0.85) * 1000; // μm
    regime = 'high_feed_edge';
    profile_description = `High-feed regime. Straight edges dominate. f=${f.toFixed(3)}mm >> f_crit=${f_crit.toFixed(3)}mm`;
  }

  // ---------- CORRECTIONS ----------

  // 1. Ploughing / minimum chip thickness (Albrecht 1960)
  //    Below h_min ≈ rn_edge * (1 − cos(βn)), material springs back instead of cutting
  //    Effective edge radius rn_edge ≈ 5-20μm for sharp carbide, up to 50μm when worn
  const rn_edge_um = 8 + VB * 80; // μm edge radius grows with wear
  const h_min_um = rn_edge_um * 0.3; // Minimum chip thickness
  const ploughing_um = f * 1000 < h_min_um * 3 ? h_min_um * 0.5 : 0;

  // 2. Flank wear adds a "nose flattening" effect
  //    VB increases effective nose radius but also adds rubbing marks
  const wear_um = VB > 0 ? VB * 1000 * 0.15 : 0; // ~15% of VB appears as Rz increase

  // 3. BUE (Built-Up Edge) — forms at low speed on ductile materials
  let bue_um = 0;
  if (input.material && input.cutting_speed_mpm) {
    const mat = getMaterialProps(input.material);
    const Vc = input.cutting_speed_mpm;
    // BUE forms when Vc is 20-60% of Taylor limit for steel/aluminum
    const bueLow = mat.taylor_C * 0.15;
    const bueHigh = mat.taylor_C * 0.50;
    if (Vc > bueLow && Vc < bueHigh && mat.hardness_hrc < 35) {
      const bueIntensity = 1 - Math.abs(Vc - (bueLow + bueHigh) / 2) / ((bueHigh - bueLow) / 2);
      bue_um = bueIntensity * 3.0; // Up to 3μm from BUE fragments
    }
  }

  // 4. Vibration adds stochastic peak-to-valley
  const vibration_um = input.vibration_amplitude_um ?? 0;

  const rz_corrected = rz_ideal + ploughing_um + wear_um + bue_um;
  const rt_um = rz_corrected + vibration_um * 2; // Rt includes full vibration envelope

  // Ra from kinematic Rz — ratio depends on profile shape
  // For pure arc: Ra ≈ Rz/4. For triangular (high feed): Ra ≈ Rz/4.5. Add correction factors.
  const ra_ratio = regime === 'low_feed_arc' ? 4.0 : regime === 'transition' ? 4.3 : 4.8;
  const ra_kinematic = rz_corrected / ra_ratio;

  // Confidence based on regime and corrections magnitude
  let confidence = 0.92;
  if (bue_um > 1) confidence -= 0.10;
  if (vibration_um > 2) confidence -= 0.08;
  if (VB > 0.2) confidence -= 0.05;
  confidence = Math.max(0.55, confidence);

  return {
    rz_ideal_um: +rz_ideal.toFixed(3),
    rz_corrected_um: +rz_corrected.toFixed(3),
    rt_um: +rt_um.toFixed(3),
    ra_kinematic_um: +ra_kinematic.toFixed(3),
    regime,
    feed_critical_mm: +f_crit.toFixed(4),
    corrections: {
      ploughing_um: +ploughing_um.toFixed(3),
      wear_um: +wear_um.toFixed(3),
      bue_um: +bue_um.toFixed(3),
      vibration_um: +vibration_um.toFixed(3),
    },
    profile_description,
    confidence,
    model: 'kinematic_turning_v1 (R15-MS1)',
  };
}

// ============================================================================
// R15-MS1: MILLING SURFACE FINISH KINEMATIC MODEL
// ============================================================================

export interface RzMillingInput {
  milling_type: 'ball_nose' | 'flat_endmill' | 'bull_nose' | 'face_mill';
  tool_diameter_mm: number;
  corner_radius_mm?: number;     // For bull_nose / face_mill insert radius
  stepover_mm?: number;           // Radial stepover (ae) — for scallop height
  feed_per_tooth_mm: number;
  number_of_flutes: number;
  tilt_angle_deg?: number;        // Tool tilt for ball nose (0 = vertical)
  tool_flank_wear_mm?: number;
  runout_um?: number;             // Tool/spindle runout
  vibration_amplitude_um?: number;
}

export interface RzMillingResult {
  rz_feed_um: number;            // Feed-direction Rz (cusp from fz)
  rz_stepover_um: number;        // Stepover-direction Rz (scallop height)
  rz_combined_um: number;        // Larger of the two
  rt_um: number;                 // Maximum including runout + vibration
  ra_estimated_um: number;
  scallop_height_um: number;
  cusp_height_um: number;
  corrections: {
    runout_um: number;
    wear_um: number;
    vibration_um: number;
  };
  confidence: number;
  model: string;
}

export function predictRzMilling(input: RzMillingInput): RzMillingResult {
  const D = input.tool_diameter_mm;
  const R = D / 2;
  const fz = input.feed_per_tooth_mm;
  const z = input.number_of_flutes;
  const ae = input.stepover_mm ?? D * 0.3;
  const rc = input.corner_radius_mm ?? 0;
  const tilt = (input.tilt_angle_deg ?? 0) * Math.PI / 180;
  const VB = input.tool_flank_wear_mm ?? 0;
  const runout = input.runout_um ?? 0;
  const vibAmp = input.vibration_amplitude_um ?? 0;

  let rz_feed_um: number;
  let rz_stepover_um: number;
  let scallop_um: number;
  let cusp_um: number;
  let model: string;

  switch (input.milling_type) {
    case 'ball_nose': {
      // Effective radius at contact point depends on tilt angle
      const R_eff = tilt > 0.01 ? R / Math.cos(tilt) : R;
      // Scallop height (stepover direction): h = R_eff − √(R_eff² − (ae/2)²)
      scallop_um = (R_eff - Math.sqrt(Math.max(0, R_eff * R_eff - (ae / 2) ** 2))) * 1000;
      // Feed cusp height: h = R − √(R² − (fz/2)²)  per tooth
      cusp_um = (R - Math.sqrt(Math.max(0, R * R - (fz / 2) ** 2))) * 1000;
      rz_stepover_um = scallop_um;
      rz_feed_um = cusp_um;
      model = 'ball_nose_kinematic_v1';
      break;
    }

    case 'flat_endmill': {
      // Face: negligible stepover Rz (flat bottom)
      // Feed cusp from fz (each tooth removes a scallop in feed direction)
      // For peripheral milling: Rz ≈ fz² / (4·D) × 1000
      cusp_um = (fz * fz / (4 * D + 1e-10)) * 1000;
      scallop_um = 0; // Flat bottom = no scallop in stepover
      rz_feed_um = cusp_um;
      rz_stepover_um = scallop_um;
      model = 'flat_endmill_kinematic_v1';
      break;
    }

    case 'bull_nose': {
      // Bull nose = flat endmill with corner radius rc
      // Scallop height from stepover: h = rc − √(rc² − (ae/2)²) if ae < 2·rc, else flat
      scallop_um = ae < 2 * rc
        ? (rc - Math.sqrt(Math.max(0, rc * rc - (ae / 2) ** 2))) * 1000
        : 0;
      cusp_um = (fz * fz / (4 * D + 1e-10)) * 1000;
      rz_feed_um = cusp_um;
      rz_stepover_um = scallop_um;
      model = 'bull_nose_kinematic_v1';
      break;
    }

    case 'face_mill': {
      // Face mill with insert nose radius
      const r_insert = rc > 0 ? rc : 0.8; // Default insert nose radius
      // Rz in feed direction: fz² / (8·r_insert) per tooth
      cusp_um = (fz * fz / (8 * r_insert + 1e-10)) * 1000;
      scallop_um = 0; // Face mill = flat surface in stepover direction
      rz_feed_um = cusp_um;
      rz_stepover_um = 0;
      model = 'face_mill_kinematic_v1';
      break;
    }
  }

  // Corrections
  const runout_correction = runout * 0.8; // Runout adds to Rz (one tooth cuts deeper)
  const wear_correction = VB > 0 ? VB * 1000 * 0.12 : 0;
  const vibration_correction = vibAmp;

  const rz_combined = Math.max(rz_feed_um, rz_stepover_um) + wear_correction + runout_correction;
  const rt_um = rz_combined + vibration_correction * 2;
  const ra_estimated = rz_combined / 4.5; // Approximate Ra from Rz

  let confidence = 0.88;
  if (runout > 5) confidence -= 0.08;
  if (VB > 0.15) confidence -= 0.05;
  if (vibAmp > 3) confidence -= 0.10;
  confidence = Math.max(0.50, confidence);

  return {
    rz_feed_um: +rz_feed_um.toFixed(3),
    rz_stepover_um: +rz_stepover_um.toFixed(3),
    rz_combined_um: +rz_combined.toFixed(3),
    rt_um: +rt_um.toFixed(3),
    ra_estimated_um: +ra_estimated.toFixed(3),
    scallop_height_um: +scallop_um.toFixed(3),
    cusp_height_um: +cusp_um.toFixed(3),
    corrections: {
      runout_um: +runout_correction.toFixed(3),
      wear_um: +wear_correction.toFixed(3),
      vibration_um: +vibration_correction.toFixed(3),
    },
    confidence,
    model: `${model} (R15-MS1)`,
  };
}

// ============================================================================
// R15-MS1: SURFACE PROFILE GENERATOR (2D simulation)
// ============================================================================

export interface SurfaceProfileInput {
  operation: 'turning' | 'milling_feed';
  feed_mm: number;              // feed per rev (turning) or per tooth (milling)
  tool_nose_radius_mm: number;
  points?: number;              // Number of profile points (default 200)
  length_mm?: number;           // Profile length (default 2 × feed)
  tool_flank_wear_mm?: number;
  vibration_amplitude_um?: number;
  vibration_frequency_hz?: number; // If > 0, adds sinusoidal vibration
  spindle_rpm?: number;
}

export interface SurfaceProfileResult {
  x_mm: number[];              // Horizontal positions
  z_um: number[];              // Surface height at each position
  rz_measured_um: number;      // Rz measured from profile (max peak - min valley per evaluation length)
  ra_measured_um: number;      // Ra measured from profile (arithmetic mean deviation)
  rt_measured_um: number;      // Rt = total max peak to min valley
  rsk: number;                 // Skewness
  rku: number;                 // Kurtosis
  profile_length_mm: number;
  num_points: number;
}

export function generateSurfaceProfile(input: SurfaceProfileInput): SurfaceProfileResult {
  const f = input.feed_mm;
  const re = input.tool_nose_radius_mm;
  const nPoints = input.points ?? 200;
  const profileLen = input.length_mm ?? f * 3;
  const VB = input.tool_flank_wear_mm ?? 0;
  const vibAmp = (input.vibration_amplitude_um ?? 0) / 1000; // Convert to mm
  const vibFreq = input.vibration_frequency_hz ?? 0;
  const rpm = input.spindle_rpm ?? 1000;

  const dx = profileLen / (nPoints - 1);
  const x_mm: number[] = [];
  const z_mm: number[] = [];

  for (let i = 0; i < nPoints; i++) {
    const x = i * dx;
    x_mm.push(+x.toFixed(5));

    // Position within one feed period
    const xInFeed = ((x % f) + f) % f; // Modulo to get position within one revolution
    const xFromCenter = xInFeed - f / 2; // Center the nose arc

    // Ideal kinematic profile: circular arc of nose radius
    let z: number;
    if (Math.abs(xFromCenter) <= re) {
      // Under the nose arc: z = re − √(re² − x²)  (measured from peak)
      z = re - Math.sqrt(Math.max(0, re * re - xFromCenter * xFromCenter));
    } else {
      // Outside nose arc: straight cutting edge (simplified as linear rise)
      z = re - Math.sqrt(Math.max(0, re * re - (f / 2) ** 2));
    }

    // Wear flattening: VB creates a flat at the profile peak
    if (VB > 0) {
      const wearFlat = VB * 0.15; // mm of wear-induced profile change
      z = Math.max(z, z - wearFlat * Math.exp(-xFromCenter * xFromCenter / (VB * VB + 1e-10)));
    }

    // Vibration overlay (sinusoidal — forced vibration from spindle/workpiece)
    if (vibAmp > 0 && vibFreq > 0) {
      const time_at_x = x / (f * rpm / 60 + 1e-10); // seconds
      z += vibAmp * Math.sin(2 * Math.PI * vibFreq * time_at_x);
    } else if (vibAmp > 0) {
      // Random vibration approximation (use deterministic noise from position)
      z += vibAmp * Math.sin(x * 1000); // Pseudo-random from position
    }

    z_mm.push(z);
  }

  // Convert to μm for analysis
  const z_um = z_mm.map(v => +(v * 1000).toFixed(3));

  // Compute roughness parameters from generated profile
  const meanZ = z_um.reduce((a, b) => a + b, 0) / z_um.length;
  const deviations = z_um.map(v => v - meanZ);

  const ra = deviations.reduce((a, b) => a + Math.abs(b), 0) / deviations.length;
  const rz = Math.max(...z_um) - Math.min(...z_um);
  const rt = rz; // For single evaluation length, Rt = Rz

  // Higher-order statistics
  const variance = deviations.reduce((a, b) => a + b * b, 0) / deviations.length;
  const sigma = Math.sqrt(variance);
  const rsk = sigma > 0 ? deviations.reduce((a, b) => a + b ** 3, 0) / (deviations.length * sigma ** 3) : 0;
  const rku = sigma > 0 ? deviations.reduce((a, b) => a + b ** 4, 0) / (deviations.length * sigma ** 4) : 3;

  return {
    x_mm,
    z_um,
    rz_measured_um: +rz.toFixed(3),
    ra_measured_um: +ra.toFixed(3),
    rt_measured_um: +rt.toFixed(3),
    rsk: +rsk.toFixed(4),
    rku: +rku.toFixed(4),
    profile_length_mm: profileLen,
    num_points: nPoints,
  };
}

// ============================================================================
// R15-MS5: CHIP FORMATION & BREAKING MODEL
// ============================================================================

export type ChipType = 'continuous' | 'lamellar' | 'segmented' | 'discontinuous' | 'built_up_edge';

export interface ChipFormationInput {
  material: string;
  operation: OperationType;
  cutting_speed_mpm: number;
  feed_mmrev: number;
  depth_of_cut_mm: number;
  tool_rake_angle_deg?: number;   // γ — default 6°
  tool_material: ToolMaterial;
  coolant: CoolantType;
  chip_breaker?: boolean;         // Whether insert has chip breaker groove
}

export interface ChipFormationResult {
  chip_type: ChipType;
  chip_thickness_ratio: number;       // r_c = h/h_c (chip compression ratio)
  chip_velocity_mps: number;          // Chip exit velocity
  shear_plane_angle_deg: number;      // φ — from Merchant's theory
  shear_strain: number;               // γ_s
  chip_temperature_c: number;
  chip_curl_radius_mm: number | null; // null if discontinuous
  chip_breaking: {
    will_break: boolean;
    mechanism: string;
    recommended_chipbreaker: string;
  };
  power_consumption: {
    cutting_power_kw: number;
    specific_energy_j_mm3: number;
  };
  recommendations: string[];
  safety: { score: number; flags: string[] };
}

export function predictChipFormation(input: ChipFormationInput): ChipFormationResult {
  const mat = getMaterialProps(input.material);
  const rake = (input.tool_rake_angle_deg ?? 6) * Math.PI / 180;
  const Vc = input.cutting_speed_mpm;
  const f = input.feed_mmrev;
  const ap = input.depth_of_cut_mm;
  const coolFactor = COOLANT_FACTOR[input.coolant];

  // Shear plane angle via Merchant's theory: φ = π/4 − β/2 + γ/2
  // where β = friction angle ≈ atan(μ), μ depends on material/tool/coolant
  const mu_base: Record<ToolMaterial, number> = {
    hss: 0.6, carbide: 0.4, ceramic: 0.35, cbn: 0.3, diamond: 0.15
  };
  const mu = mu_base[input.tool_material] * (0.8 + coolFactor * 0.2); // Coolant reduces friction
  const beta = Math.atan(mu); // Friction angle
  const phi = Math.PI / 4 - beta / 2 + rake / 2; // Shear plane angle
  const phi_deg = phi * 180 / Math.PI;

  // Chip thickness ratio r_c = sin(φ) / cos(φ − γ)
  const rc = Math.sin(phi) / Math.cos(phi - rake);
  const chip_thickness = f / rc; // mm (thicker than uncut chip)

  // Chip velocity: V_chip = V_c · r_c
  const Vc_ms = Vc / 60;
  const chip_velocity = Vc_ms * rc;

  // Shear strain: γ_s = cos(γ) / (sin(φ)·cos(φ−γ))
  const shear_strain = Math.cos(rake) / (Math.sin(phi) * Math.cos(phi - rake) + 1e-10);

  // Cutting force (Kienzle) and power
  const Fc = mat.kc1_1 * Math.pow(f, 1 - mat.mc) * ap;
  const power_kw = Fc * Vc_ms / 1000;
  const MRR = Vc * 1000 / 60 * f * ap; // mm³/s
  const specific_energy = MRR > 0 ? (power_kw * 1000) / MRR : 0; // J/mm³

  // Chip temperature (adiabatic shear zone + friction zone)
  const shearHeat = 0.9 * Fc * Vc_ms; // 90% of cutting work → heat
  const chipMassFlow = mat.density * (f * ap * 1e-6) * Vc_ms; // kg/s
  const chipTemp = 20 + (shearHeat * 0.75 * coolFactor) / (chipMassFlow * mat.specific_heat + 1e-10);
  const clampedChipTemp = Math.min(chipTemp, mat.melting_point_c * 0.85);

  // Chip type classification
  let chipType: ChipType;
  const homologousTemp = clampedChipTemp / mat.melting_point_c;

  if (mat.hardness_hrc > 45 || mat.jc_n > 0.5) {
    // Hard/brittle material → segmented or discontinuous
    chipType = Vc > mat.taylor_C * 0.5 ? 'segmented' : 'discontinuous';
  } else if (Vc < mat.taylor_C * 0.2 && mat.hardness_hrc < 30) {
    // Low speed + ductile → BUE zone
    chipType = 'built_up_edge';
  } else if (homologousTemp > 0.4 && shear_strain > 3) {
    // High temp + high strain → adiabatic shear (lamellar/saw-tooth)
    chipType = 'lamellar';
  } else {
    chipType = 'continuous';
  }

  // Chip curl radius (empirical: increases with rake angle, decreases with feed)
  let curlRadius: number | null = null;
  if (chipType !== 'discontinuous') {
    curlRadius = +(chip_thickness * 5 * (1 + rake * 3) / (1 + f * 2)).toFixed(2);
  }

  // Chip breaking prediction
  const hasChipbreaker = input.chip_breaker ?? false;
  let willBreak: boolean;
  let breakMechanism: string;
  let recommendedBreaker: string;

  if (chipType === 'discontinuous' || chipType === 'segmented') {
    willBreak = true;
    breakMechanism = 'Self-breaking (brittle fracture in shear zone)';
    recommendedBreaker = 'None needed — material naturally breaks chips';
  } else if (hasChipbreaker) {
    // Chipbreaker effective for continuous chips with moderate feed
    willBreak = f > 0.08 && f < 0.5;
    breakMechanism = willBreak ? 'Chipbreaker groove curls and fractures chip' : 'Chipbreaker ineffective at this feed';
    recommendedBreaker = willBreak ? 'Current chipbreaker adequate' : (f <= 0.08 ? 'Use light-cut chipbreaker (MF/GF)' : 'Use heavy-cut chipbreaker (MR/PR)');
  } else {
    // No chipbreaker
    willBreak = chipType === 'lamellar'; // Lamellar may self-break
    breakMechanism = willBreak ? 'Self-breaking (adiabatic shear bands)' : 'Long continuous chip — chip control needed';
    if (f < 0.15) {
      recommendedBreaker = 'Light-cut chipbreaker (MF/GF geometry)';
    } else if (f < 0.35) {
      recommendedBreaker = 'Medium-cut chipbreaker (MM/PM geometry)';
    } else {
      recommendedBreaker = 'Heavy-cut chipbreaker (MR/PR geometry)';
    }
  }

  // Safety
  const flags: string[] = [];
  let safetyScore = 0.88;
  if (!willBreak && chipType === 'continuous') {
    safetyScore -= 0.15;
    flags.push('Long continuous chips — entanglement hazard');
  }
  if (chipType === 'built_up_edge') {
    safetyScore -= 0.08;
    flags.push('BUE formation — surface finish degraded, tool life reduced');
  }
  if (clampedChipTemp > 800) {
    safetyScore -= 0.05;
    flags.push('High chip temperature — fire risk with certain materials');
  }
  safetyScore = Math.max(0.40, safetyScore);

  const recommendations: string[] = [];
  if (chipType === 'built_up_edge') {
    recommendations.push(`Increase cutting speed above ${(mat.taylor_C * 0.25).toFixed(0)} m/min to exit BUE zone`);
    recommendations.push('Consider coated insert (TiAlN/AlCrN) to reduce adhesion');
  }
  if (!willBreak) {
    recommendations.push('Add chipbreaker geometry or increase feed rate for chip control');
  }
  if (chipType === 'continuous' && f > 0.3) {
    recommendations.push('High feed with continuous chips — ensure chip conveyor is active');
  }

  return {
    chip_type: chipType,
    chip_thickness_ratio: +rc.toFixed(4),
    chip_velocity_mps: +chip_velocity.toFixed(3),
    shear_plane_angle_deg: +phi_deg.toFixed(2),
    shear_strain: +shear_strain.toFixed(3),
    chip_temperature_c: +clampedChipTemp.toFixed(1),
    chip_curl_radius_mm: curlRadius,
    chip_breaking: {
      will_break: willBreak,
      mechanism: breakMechanism,
      recommended_chipbreaker: recommendedBreaker,
    },
    power_consumption: {
      cutting_power_kw: +power_kw.toFixed(3),
      specific_energy_j_mm3: +specific_energy.toFixed(2),
    },
    recommendations,
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// DISPATCHER FUNCTION
// ============================================================================

export function physicsPrediction(action: string, params: Record<string, unknown>): unknown {
  log.info(`[PhysicsPrediction] action=${action}`);

  switch (action) {
    case 'surface_integrity_predict':
      return predictSurfaceIntegrity(params as unknown as SurfaceIntegrityInput);

    case 'chatter_predict':
      return predictChatter(params as unknown as ChatterInput);

    case 'thermal_compensate':
      return predictThermalCompensation(params as unknown as ThermalCompInput);

    case 'unified_machining_model':
      return unifiedMachiningModel(params as unknown as UnifiedMachiningInput);

    case 'coupling_sensitivity':
      return couplingSensitivity(params as unknown as SensitivityInput);

    // R15-MS1: Surface finish kinematic models
    case 'rz_kinematic':
      return predictRzKinematic(params as unknown as RzKinematicInput);

    case 'rz_milling':
      return predictRzMilling(params as unknown as RzMillingInput);

    case 'surface_profile':
      return generateSurfaceProfile(params as unknown as SurfaceProfileInput);

    // R15-MS5: Chip formation
    case 'chip_form':
      return predictChipFormation(params as unknown as ChipFormationInput);

    default:
      throw new Error(`Unknown physics prediction action: ${action}`);
  }
}
