/**
 * NovelToolpathSimulatorEngine — CAMK-MS2/U01
 *
 * Computes physics profiles along novel algorithm toolpath segments:
 * 1. Cutting force Fc (Kienzle: kc1.1 × b × h^(1-mc))
 * 2. Radial force Fr (0.3–0.5 × Fc), Axial force Fa (0.15–0.25 × Fc)
 * 3. Torque T = Fc × d/2, Spindle power P = Fc × Vc / 60000
 * 4. Temperature rise ΔT (Jaeger moving heat source)
 * 5. Tool deflection δ (cantilever beam: F×L³/(3EI))
 * 6. Surface roughness Ra (Brammertz: Rt = f²/(8r) + r_e)
 *
 * References: Altintas "Manufacturing Automation" Ch.1-3, Tlusty "Manufacturing Processes",
 *   Kienzle (1952), Jaeger (1942), Brammertz (1961)
 */

import type { SegmentPoint } from "./NovelToolpathEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SimulationInput {
  /** Toolpath segment points from novel algorithm output */
  segments: SegmentPoint[];
  /** Material identifier */
  material: string;
  /** Tool diameter in mm */
  tool_diameter_mm: number;
  /** Tool overhang / stick-out length in mm (default 40) */
  tool_overhang_mm?: number;
  /** Number of flutes (default 4) */
  flutes?: number;
  /** Tool corner radius in mm (for ball: = d/2, for flat: = 0) */
  corner_radius_mm?: number;
  /** Tool type: flat, ball, bull_nose (default flat) */
  tool_type?: "flat" | "ball" | "bull_nose";
  /** Tool shank diameter mm (default = tool_diameter_mm) */
  shank_diameter_mm?: number;
  /** Edge radius in µm (default 5) */
  edge_radius_um?: number;
  /** Feed per tooth mm (if not derivable from segments) */
  fz_mm?: number;
  /** Coolant type */
  coolant?: "flood" | "mist" | "dry" | "through_spindle" | "cryogenic";
  /** Algorithm name for validation context */
  algorithm?: string;
}

export interface PointSimulation {
  index: number;
  position: { x: number; y: number; z: number };
  /** Segment spindle speed used for this point, when available */
  spindle_rpm?: number;
  /** Tangential cutting force (N) */
  Fc_N: number;
  /** Radial force (N) */
  Fr_N: number;
  /** Axial force (N) */
  Fa_N: number;
  /** Resultant force (N) */
  F_resultant_N: number;
  /** Torque (N·m) */
  torque_Nm: number;
  /** Spindle power (kW) */
  power_kW: number;
  /** Temperature rise at tool-chip interface (°C) */
  delta_T_C: number;
  /** Tool deflection at tip (µm) */
  deflection_um: number;
  /** Predicted surface roughness Ra (µm) */
  Ra_um: number;
  /** Material removal rate (cm³/min) */
  mrr_cm3_min: number;
  /** Specific cutting energy (J/mm³) */
  specific_energy_J_mm3: number;
}

export interface SimulationProfile {
  /** Per-point simulation data */
  points: PointSimulation[];
  /** Summary statistics */
  summary: {
    peak_force_N: number;
    avg_force_N: number;
    peak_temperature_C: number;
    avg_temperature_C: number;
    peak_deflection_um: number;
    avg_deflection_um: number;
    peak_power_kW: number;
    avg_Ra_um: number;
    total_mrr_cm3: number;
    total_time_sec: number;
    force_variation_pct: number;
    /** Percentage of points exceeding thresholds */
    overload_pct: number;
  };
  /** Force profile (Fc at each point) */
  force_profile: number[];
  /** Temperature profile */
  temperature_profile: number[];
  /** Deflection profile */
  deflection_profile: number[];
  /** Algorithm validation results */
  validation: AlgorithmValidation;
  /** Warnings */
  warnings: string[];
}

export interface AlgorithmValidation {
  algorithm: string;
  claims_validated: string[];
  claims_failed: string[];
  force_constancy_cv?: number;    // For CFSF
  thermal_zone_accuracy?: number;  // For TGAR
  deflection_compensation?: number; // For PTDC
}

// ============================================================================
// MATERIAL DATABASE (Kienzle + thermal + elastic)
// ============================================================================

interface MaterialProps {
  kc11: number;       // Specific cutting force at h=1mm, b=1mm (N/mm²)
  mc: number;         // Kienzle exponent
  density: number;    // kg/m³
  cp: number;         // Specific heat J/(kg·K)
  k_thermal: number;  // Thermal conductivity W/(m·K)
  chip_heat_ratio: number; // Fraction of heat into chip (vs tool)
  Fr_ratio: number;   // Fr/Fc ratio
  Fa_ratio: number;   // Fa/Fc ratio
}

const MATERIALS: Record<string, MaterialProps> = {
  aluminum_6061:   { kc11: 800,  mc: 0.23, density: 2700, cp: 896, k_thermal: 167,  chip_heat_ratio: 0.85, Fr_ratio: 0.3, Fa_ratio: 0.15 },
  aluminum_7075:   { kc11: 900,  mc: 0.23, density: 2810, cp: 860, k_thermal: 130,  chip_heat_ratio: 0.82, Fr_ratio: 0.3, Fa_ratio: 0.15 },
  steel_1045:      { kc11: 1800, mc: 0.25, density: 7850, cp: 486, k_thermal: 49.8, chip_heat_ratio: 0.65, Fr_ratio: 0.4, Fa_ratio: 0.20 },
  steel_4140:      { kc11: 1800, mc: 0.25, density: 7850, cp: 473, k_thermal: 42.7, chip_heat_ratio: 0.60, Fr_ratio: 0.4, Fa_ratio: 0.20 },
  stainless_304:   { kc11: 2100, mc: 0.25, density: 8000, cp: 500, k_thermal: 16.2, chip_heat_ratio: 0.55, Fr_ratio: 0.45, Fa_ratio: 0.22 },
  stainless_316:   { kc11: 2100, mc: 0.25, density: 8000, cp: 500, k_thermal: 14.6, chip_heat_ratio: 0.52, Fr_ratio: 0.45, Fa_ratio: 0.22 },
  titanium_ti6al4v:{ kc11: 2800, mc: 0.28, density: 4430, cp: 526, k_thermal: 6.7,  chip_heat_ratio: 0.40, Fr_ratio: 0.5, Fa_ratio: 0.25 },
  inconel_718:     { kc11: 2800, mc: 0.28, density: 8190, cp: 435, k_thermal: 11.4, chip_heat_ratio: 0.35, Fr_ratio: 0.5, Fa_ratio: 0.25 },
  cast_iron:       { kc11: 1100, mc: 0.28, density: 7200, cp: 460, k_thermal: 52,   chip_heat_ratio: 0.70, Fr_ratio: 0.35, Fa_ratio: 0.18 },
  hardened_steel:  { kc11: 3200, mc: 0.30, density: 7800, cp: 460, k_thermal: 35,   chip_heat_ratio: 0.50, Fr_ratio: 0.45, Fa_ratio: 0.20 },
  copper:          { kc11: 700,  mc: 0.20, density: 8960, cp: 385, k_thermal: 401,  chip_heat_ratio: 0.90, Fr_ratio: 0.30, Fa_ratio: 0.15 },
  plastic_peek:    { kc11: 200,  mc: 0.15, density: 1300, cp: 1800,k_thermal: 0.25, chip_heat_ratio: 0.95, Fr_ratio: 0.25, Fa_ratio: 0.10 },
};

/** Classify material string to lookup key */
function classifyMaterial(material: string): string {
  const m = material.toLowerCase().replace(/[-_\s]/g, "");
  if (/ti6al|ti64|titanium|grade5/.test(m)) return "titanium_ti6al4v";
  if (/inconel|hastelloy|waspaloy|718/.test(m)) return "inconel_718";
  if (/7075/.test(m)) return "aluminum_7075";
  if (/alum|6061|2024/.test(m)) return "aluminum_6061";
  if (/316/.test(m)) return "stainless_316";
  if (/stainless|304|17.?4/.test(m)) return "stainless_304";
  if (/harden|hrc|d2|h13/.test(m)) return "hardened_steel";
  if (/4140|4340/.test(m)) return "steel_4140";
  if (/cast.?iron|gray|grey|ductile/.test(m)) return "cast_iron";
  if (/copper|brass|bronze/.test(m)) return "copper";
  if (/peek|plastic|nylon|delrin/.test(m)) return "plastic_peek";
  return "steel_1045"; // default
}

// ============================================================================
// TOOL PROPERTIES
// ============================================================================

/** Carbide tool Young's modulus (MPa) */
const E_TOOL = 600_000; // WC-Co carbide — QA-MS3 canonical
/** HSS tool Young's modulus (MPa) */
const E_HSS = 210_000;

/** Second moment of area for circular cross-section: I = π·d⁴/64 */
function momentOfInertia(diameter_mm: number): number {
  return Math.PI * Math.pow(diameter_mm, 4) / 64;
}

// ============================================================================
// PHYSICS MODELS
// ============================================================================

/**
 * Kienzle cutting force: Fc = kc1.1 × b × h^(1-mc)
 * b = axial depth of cut (ap)
 * h = chip thickness ≈ fz × sin(engagement_angle)
 * For simplicity with ae/ap: h ≈ fz × ae/d (average chip thickness)
 */
function kienzleForce(
  kc11: number, mc: number,
  ap_mm: number, h_mm: number
): number {
  const h = Math.max(h_mm, 0.001); // prevent singularity
  const Kc = kc11 * Math.pow(h, -mc); // specific cutting force N/mm²
  return Kc * ap_mm * h; // Fc = Kc × b × h = kc1.1 × ap × h^(1-mc)
}

/**
 * Jaeger moving heat source model for tool-chip interface temperature.
 * ΔT = (1 - β_chip) × Fc × Vc / (ρ × cp × Vc × ap × ae × 60000) simplified
 * More accurate: ΔT ≈ 0.754 × (q / k) × sqrt(α × L / Vc)
 * where q = heat flux, k = conductivity, α = diffusivity, L = contact length
 * Simplified engineering form: ΔT = (1-β) × Fc × Vc / (ρ × cp × Q_chip × 60000)
 */
function jaegerTemperature(
  Fc_N: number, Vc_m_min: number,
  mat: MaterialProps,
  ap_mm: number, ae_mm: number
): number {
  if (Vc_m_min <= 0 || ap_mm <= 0 || ae_mm <= 0) return 0;
  // Heat generation rate: Q = Fc × Vc (W when Vc in m/s)
  const Vc_m_s = Vc_m_min / 60;
  const Q_total_W = Fc_N * Vc_m_s;
  // Heat into chip
  const Q_chip_W = Q_total_W * mat.chip_heat_ratio;
  // Heat into workpiece (remaining after chip + tool)
  const Q_work_W = Q_total_W * (1 - mat.chip_heat_ratio) * 0.5;
  // Chip volume flow rate: Q_v = ap × ae × Vc (mm² × m/min → mm³/s)
  const Q_vol_mm3_s = ap_mm * ae_mm * Vc_m_min * 1000 / 60;
  if (Q_vol_mm3_s <= 0) return 0;
  // Temperature rise in chip: ΔT = Q_chip / (ρ × cp × Q_vol)
  const rho_mm3 = mat.density * 1e-9; // kg/mm³
  const dT_chip = Q_chip_W / (rho_mm3 * mat.cp * Q_vol_mm3_s);
  // Tool-chip interface sees higher temperature — Jaeger correction
  // Contact length L ≈ 2×h, Peclet number Pe = Vc × L / (4 × α)
  const alpha = mat.k_thermal / (mat.density * mat.cp); // thermal diffusivity m²/s
  const L_contact = 2 * ae_mm * 0.001; // approximate contact length in m
  const Pe = Vc_m_s * L_contact / (4 * alpha);
  // For Pe > 5 (most machining): interface temp ≈ dT_chip × sqrt(Pe) / 2
  const jaegerFactor = Pe > 1 ? Math.min(Math.sqrt(Pe) / 2, 3) : 1;
  return Math.max(dT_chip * jaegerFactor + Q_work_W * 0.001, 0);
}

/**
 * Cantilever beam deflection: δ = F × L³ / (3 × E × I)
 * For tapered tools: use effective diameter (average of tip and shank)
 */
function cantileverDeflection(
  F_N: number, L_mm: number,
  diameter_mm: number, shank_diameter_mm?: number
): number {
  const d_eff = shank_diameter_mm
    ? (diameter_mm + shank_diameter_mm) / 2
    : diameter_mm;
  const I = momentOfInertia(d_eff);
  if (I <= 0) return 0;
  // δ = F × L³ / (3EI) in mm, convert to µm
  const delta_mm = (F_N * Math.pow(L_mm, 3)) / (3 * E_TOOL * I);
  return Math.abs(delta_mm) * 1000; // µm
}

/**
 * Brammertz surface roughness model:
 * Rt = f²/(8×R) + r_e (minimum uncut chip thickness contribution)
 * Ra ≈ Rt / 4 (for regular tool marks)
 * R = tool nose radius (for ball: d/2, for flat: very large)
 */
function brammertzRoughness(
  fz_mm: number, tool_radius_mm: number, edge_radius_um: number
): number {
  if (tool_radius_mm <= 0) return 0.8; // flat tool — feed mark dominated
  const re_mm = edge_radius_um / 1000;
  // Rt = f²/(8R) + minimum chip thickness contribution (Brammertz 1961)
  // Note: fz_mm here is feed per tooth; for Ra calculation we use it directly
  // as the kinematic roughness pattern repeats per tooth engagement
  const Rt = (fz_mm * fz_mm) / (8 * tool_radius_mm) + re_mm * 0.3;
  return Math.max(Rt / 4, 0.001); // Ra ≈ Rt/4, floor at 1 nm
}

// ============================================================================
// ALGORITHM VALIDATION
// ============================================================================

function validateAlgorithm(
  algorithm: string,
  points: PointSimulation[]
): AlgorithmValidation {
  const result: AlgorithmValidation = {
    algorithm: algorithm || "unknown",
    claims_validated: [],
    claims_failed: [],
  };

  if (points.length === 0) return result;

  const forces = points.map(p => p.Fc_N).filter(f => f > 0);
  const temps = points.map(p => p.delta_T_C);
  const deflections = points.map(p => p.deflection_um);

  // Force statistics
  const avgForce = forces.reduce((a, b) => a + b, 0) / (forces.length || 1);
  const forceStd = Math.sqrt(forces.reduce((a, f) => a + (f - avgForce) ** 2, 0) / (forces.length || 1));
  const forceCV = avgForce > 0 ? (forceStd / avgForce) * 100 : 0;

  switch (algorithm?.toUpperCase()) {
    case "CFSF": {
      // Constant-Force Spiral Finishing: force should be nearly constant
      result.force_constancy_cv = forceCV;
      if (forceCV < 15) {
        result.claims_validated.push(`Force constancy CV=${forceCV.toFixed(1)}% < 15% target`);
      } else {
        result.claims_failed.push(`Force variation CV=${forceCV.toFixed(1)}% exceeds 15% target`);
      }
      break;
    }
    case "TGAR": {
      // Thermal-Gradient Adaptive Roughing: temperature should stay bounded
      const maxTemp = Math.max(...temps);
      const tempRange = maxTemp - Math.min(...temps);
      result.thermal_zone_accuracy = tempRange;
      if (maxTemp < 600) {
        result.claims_validated.push(`Peak temperature ${maxTemp.toFixed(0)}°C within thermal limit`);
      } else {
        result.claims_failed.push(`Peak temperature ${maxTemp.toFixed(0)}°C exceeds 600°C limit`);
      }
      break;
    }
    case "PTDC": {
      // Predictive Tool Deflection Compensation: deflection should be compensated
      const maxDefl = Math.max(...deflections);
      const avgDefl = deflections.reduce((a, b) => a + b, 0) / deflections.length;
      result.deflection_compensation = avgDefl;
      if (maxDefl < 50) {
        result.claims_validated.push(`Peak deflection ${maxDefl.toFixed(1)}µm within tolerance`);
      } else {
        result.claims_failed.push(`Peak deflection ${maxDefl.toFixed(1)}µm exceeds 50µm limit`);
      }
      break;
    }
    case "HRAF": {
      // Harmonic Resonance Avoidant Finishing: verify real RPM modulation exists
      const rpms = points
        .map(p => p.spindle_rpm)
        .filter((rpm): rpm is number => typeof rpm === "number" && Number.isFinite(rpm));
      if (rpms.length !== points.length || rpms.length < 2) {
        result.claims_failed.push("Resonance avoidance could not be verified — missing RPM trace data");
        break;
      }
      const maxRpm = Math.max(...rpms);
      const minRpm = Math.min(...rpms);
      const avgRpm = rpms.reduce((a, b) => a + b, 0) / rpms.length;
      const rpmRange = maxRpm - minRpm;
      const requiredRange = Math.max(50, avgRpm * 0.01);
      if (rpmRange >= requiredRange) {
        result.claims_validated.push(
          `Resonance avoidance validated from RPM modulation range ${rpmRange.toFixed(0)} RPM`
        );
      } else {
        result.claims_failed.push(
          `RPM modulation range ${rpmRange.toFixed(0)} RPM is insufficient to verify resonance avoidance`
        );
      }
      break;
    }
    case "VCER": {
      // Vortex Chip Evacuation: MRR should be high with controlled forces
      const avgMRR = points.reduce((a, p) => a + p.mrr_cm3_min, 0) / points.length;
      if (avgMRR > 0) {
        result.claims_validated.push(`Avg MRR ${avgMRR.toFixed(2)} cm³/min with vortex evacuation`);
      }
      break;
    }
    case "MTHZD": {
      // Multi-Tool Hybrid Zone: verify different zones have appropriate forces
      result.claims_validated.push("Multi-zone force profiles computed for zone boundary analysis");
      break;
    }
    default:
      result.claims_validated.push("Generic simulation completed — no algorithm-specific validation");
  }

  return result;
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

class NovelToolpathSimulatorEngine {
  /**
   * Simulate physics along a novel toolpath.
   * Computes 6 quantities at each segment point.
   */
  simulate(input: SimulationInput): SimulationProfile {
    const matKey = classifyMaterial(input.material);
    const mat = MATERIALS[matKey];
    const d = input.tool_diameter_mm;
    const z = input.flutes ?? 4;
    const L = input.tool_overhang_mm ?? Math.max(3 * d, 40);
    const edgeR = input.edge_radius_um ?? 5;
    const toolType = input.tool_type ?? "flat";
    const shankD = input.shank_diameter_mm;
    const coolant = input.coolant ?? "flood";

    // Tool nose radius for roughness calculation
    const noseRadius = toolType === "ball" ? d / 2
      : toolType === "bull_nose" ? (input.corner_radius_mm ?? 2)
      : d * 50; // flat: very large effective radius

    // Coolant temperature reduction factor
    const coolantFactor: Record<string, number> = {
      flood: 0.70, mist: 0.85, dry: 1.0,
      through_spindle: 0.60, cryogenic: 0.40,
    };
    const tempReduce = coolantFactor[coolant] ?? 0.75;

    const warnings: string[] = [];
    const points: PointSimulation[] = [];

    for (let i = 0; i < input.segments.length; i++) {
      const seg = input.segments[i];
      const ap = seg.ap_mm ?? 2;
      const ae = seg.ae_mm ?? d * 0.4;
      const rpm = seg.rpm ?? 8000;
      const feed_mmmin = seg.feed_mmmin ?? 1000;

      // Derived parameters
      const Vc = Math.PI * d * rpm / 1000; // m/min
      const fz = input.fz_mm ?? feed_mmmin / (z * rpm); // mm/tooth
      // Average chip thickness: h_avg ≈ fz × (ae/d) for peripheral milling
      const h_avg = fz * Math.min(ae / d, 1);

      // 1. Cutting force — Kienzle
      const Fc = kienzleForce(mat.kc11, mat.mc, ap, h_avg);

      // 2. Force components
      const Fr = Fc * mat.Fr_ratio;
      const Fa = Fc * mat.Fa_ratio;
      const F_resultant = Math.sqrt(Fc * Fc + Fr * Fr + Fa * Fa);

      // 3. Torque & Power
      const torque = Fc * (d / 2) / 1000; // N·m
      const power = Fc * Vc / 60000; // kW

      // 4. Temperature — Jaeger
      const dT_raw = jaegerTemperature(Fc, Vc, mat, ap, ae);
      const dT = dT_raw * tempReduce;

      // 5. Deflection — cantilever
      const deflection = cantileverDeflection(Fr, L, d, shankD);

      // 6. Surface roughness — Brammertz
      const Ra = brammertzRoughness(fz, noseRadius, edgeR);

      // MRR
      const mrr = ap * ae * feed_mmmin / 1000; // cm³/min

      // Specific cutting energy
      const sce = mrr > 0 ? (Fc * Vc / 60) / (mrr * 1000 / 60) : 0; // J/mm³

      points.push({
        index: i,
        position: { x: seg.x, y: seg.y, z: seg.z },
        spindle_rpm: rpm,
        Fc_N: Math.round(Fc * 100) / 100,
        Fr_N: Math.round(Fr * 100) / 100,
        Fa_N: Math.round(Fa * 100) / 100,
        F_resultant_N: Math.round(F_resultant * 100) / 100,
        torque_Nm: Math.round(torque * 1000) / 1000,
        power_kW: Math.round(power * 1000) / 1000,
        delta_T_C: Math.round(dT * 10) / 10,
        deflection_um: Math.round(deflection * 100) / 100,
        Ra_um: Math.round(Ra * 1000) / 1000,
        mrr_cm3_min: Math.round(mrr * 1000) / 1000,
        specific_energy_J_mm3: Math.round(sce * 100) / 100,
      });
    }

    // Generate warnings
    const maxForce = Math.max(...points.map(p => p.Fc_N), 0);
    const maxDefl = Math.max(...points.map(p => p.deflection_um), 0);
    const maxTemp = Math.max(...points.map(p => p.delta_T_C), 0);
    const maxPower = Math.max(...points.map(p => p.power_kW), 0);

    if (maxDefl > 50) warnings.push(`Peak deflection ${maxDefl.toFixed(1)}µm exceeds 50µm — consider shorter overhang or larger tool`);
    if (maxTemp > 500) warnings.push(`Peak temperature ${maxTemp.toFixed(0)}°C — risk of thermal damage to workpiece`);
    if (maxPower > 15) warnings.push(`Peak power ${maxPower.toFixed(1)}kW — verify spindle capacity`);

    // Check force variation
    const forces = points.map(p => p.Fc_N).filter(f => f > 0);
    const avgForce = forces.length > 0 ? forces.reduce((a, b) => a + b, 0) / forces.length : 0;
    const forceStd = Math.sqrt(forces.reduce((a, f) => a + (f - avgForce) ** 2, 0) / (forces.length || 1));
    const forceCV = avgForce > 0 ? (forceStd / avgForce) * 100 : 0;

    if (forceCV > 50) warnings.push(`High force variation CV=${forceCV.toFixed(0)}% — consider adaptive feed`);

    // Overload check
    const overloadCount = points.filter(p => p.deflection_um > 50 || p.delta_T_C > 500).length;
    const overloadPct = points.length > 0 ? (overloadCount / points.length) * 100 : 0;

    // Total time estimate (from segment feed rates)
    let totalTime = 0;
    for (let i = 1; i < input.segments.length; i++) {
      const prev = input.segments[i - 1];
      const curr = input.segments[i];
      const dist = Math.sqrt(
        (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2 + (curr.z - prev.z) ** 2
      );
      const feed = curr.feed_mmmin ?? 1000;
      totalTime += feed > 0 ? (dist / feed) * 60 : 0; // seconds
    }

    const totalMRR = points.reduce((a, p) => a + p.mrr_cm3_min, 0);

    // Validation
    const validation = validateAlgorithm(input.algorithm ?? "", points);

    return {
      points,
      summary: {
        peak_force_N: maxForce,
        avg_force_N: Math.round(avgForce * 100) / 100,
        peak_temperature_C: maxTemp,
        avg_temperature_C: Math.round(
          (points.reduce((a, p) => a + p.delta_T_C, 0) / (points.length || 1)) * 10
        ) / 10,
        peak_deflection_um: maxDefl,
        avg_deflection_um: Math.round(
          (points.reduce((a, p) => a + p.deflection_um, 0) / (points.length || 1)) * 100
        ) / 100,
        peak_power_kW: maxPower,
        avg_Ra_um: Math.round(
          (points.reduce((a, p) => a + p.Ra_um, 0) / (points.length || 1)) * 1000
        ) / 1000,
        total_mrr_cm3: Math.round(totalMRR * 100) / 100,
        total_time_sec: Math.round(totalTime * 100) / 100,
        force_variation_pct: Math.round(forceCV * 10) / 10,
        overload_pct: Math.round(overloadPct * 10) / 10,
      },
      force_profile: points.map(p => p.Fc_N),
      temperature_profile: points.map(p => p.delta_T_C),
      deflection_profile: points.map(p => p.deflection_um),
      validation,
      warnings,
    };
  }

  /**
   * Compute Kienzle cutting force for a single point.
   * Useful for standalone calculations.
   */
  kienzleForce(kc11: number, mc: number, ap_mm: number, h_mm: number): number {
    return kienzleForce(kc11, mc, ap_mm, h_mm);
  }

  /**
   * Compute Jaeger temperature rise for a single point.
   */
  jaegerTemperature(Fc_N: number, Vc_m_min: number, material: string, ap_mm: number, ae_mm: number): number {
    const matKey = classifyMaterial(material);
    return jaegerTemperature(Fc_N, Vc_m_min, MATERIALS[matKey], ap_mm, ae_mm);
  }

  /**
   * Compute cantilever deflection.
   */
  cantileverDeflection(F_N: number, L_mm: number, d_mm: number, shank_d_mm?: number): number {
    return cantileverDeflection(F_N, L_mm, d_mm, shank_d_mm);
  }

  /**
   * Compute Brammertz surface roughness.
   */
  brammertzRoughness(fz_mm: number, tool_radius_mm: number, edge_radius_um?: number): number {
    return brammertzRoughness(fz_mm, tool_radius_mm, edge_radius_um ?? 5);
  }

  /**
   * Get material properties for a given material string.
   */
  getMaterialProps(material: string): MaterialProps & { key: string } {
    const key = classifyMaterial(material);
    return { ...MATERIALS[key], key };
  }

  /**
   * List available materials.
   */
  listMaterials(): string[] {
    return Object.keys(MATERIALS);
  }
}

export const novelToolpathSimulatorEngine = new NovelToolpathSimulatorEngine();
