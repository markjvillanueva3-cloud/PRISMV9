/**
 * PRISM MCP Server — Cutting Mechanics Engine
 *
 * Fundamental cutting mechanics models:
 * - Merchant's orthogonal cutting analysis (force decomposition)
 * - Milling force profile (time-varying tooth engagement)
 * - Cutting temperature estimation (Trigger model)
 * - Crater wear (Usui diffusion model)
 * - Material cutting data database (Kc1.1, mc, tau_s)
 *
 * Consolidated from PRISM_CUTTING_MECHANICS_ENGINE.js,
 * PRISM_CUTTING_PHYSICS.js, and PRISM_TOOL_LIFE_ENGINE.js.
 * Unique methods only — Kienzle, Taylor, wear progression
 * already exist in other PRISM engines.
 *
 * @module CuttingMechanicsEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MerchantParams {
  chipThickness: number;     // Uncut chip thickness (mm)
  width: number;             // Width of cut (mm)
  rakeAngle: number;         // Rake angle (radians)
  shearStrength: number;     // Material shear strength (MPa)
  frictionCoeff?: number;    // Coefficient of friction
}

export interface MerchantResult {
  shearAngle_deg: number;
  frictionAngle_deg: number;
  chipRatio: number;
  chipThickness_mm: number;
  chipCompressionRatio: number;
  shearPlaneArea_mm2: number;
  forces: {
    shear_N: number;
    resultant_N: number;
    cutting_N: number;
    thrust_N: number;
    friction_N: number;
    normal_N: number;
  };
  specificCuttingEnergy_MPa: number;
  leeShaffer_phi_deg: number;
}

export interface MillingToolSpec {
  diameter: number;
  teeth: number;
  helixAngle?: number;
  rakeAngle?: number;
}

export interface MillingCutParams {
  rpm: number;
  feed: number;              // Feed per tooth (mm)
  axialDepth: number;        // ap (mm)
  radialDepth: number;       // ae (mm)
  Ktc: number;               // Tangential specific force (N/mm2)
  Krc?: number;              // Radial specific force
  Kac?: number;              // Axial specific force
}

export interface ForcePoint {
  angle_deg: number;
  Fx: number;
  Fy: number;
  Fz: number;
  F_magnitude: number;
}

export interface MillingForceResult {
  maxForces: { Fx: number; Fy: number; Fz: number };
  avgForces: { Fx: number; Fy: number };
  engagementAngles: { entry_deg: number; exit_deg: number };
  power_kW: number;
  torque_Nm: number;
  profileLength: number;
}

export interface CuttingTempParams {
  speed_mpm?: number;
  feed_mm?: number;
  specificEnergy_J_mm3?: number;
  conductivity_W_mK?: number;
  density_kg_m3?: number;
  specificHeat_J_kgK?: number;
}

export interface CuttingTempResult {
  chipTemperature_C: number;
  toolTemperature_C: number;
  workpieceTemperature_C: number;
  temperatureRise_C: number;
  heatPartition: {
    chip_percent: number;
    tool_percent: number;
    workpiece_percent: number;
  };
}

export interface CraterWearParams {
  cuttingSpeed: number;      // m/min
  interfaceTemp: number;     // C
  contactPressure: number;   // MPa
  cuttingTime: number;       // minutes
}

export interface CraterWearResult {
  craterDepth_mm: number;
  wearRate_mm_per_min: number;
  wearMechanism: "diffusion" | "abrasion";
  criticalDepth_mm: number;
}

export interface MaterialCuttingData {
  Kc1_1: number;   // Specific cutting force at h=1mm (N/mm2)
  mc: number;      // Material exponent
  tau_s: number;   // Shear strength (MPa)
}

// ============================================================================
// DATABASE
// ============================================================================

const MATERIAL_DB: Record<string, MaterialCuttingData> = {
  aluminum_6061:     { Kc1_1: 700,  mc: 0.25, tau_s: 150 },
  aluminum_7075:     { Kc1_1: 900,  mc: 0.25, tau_s: 220 },
  steel_1018:        { Kc1_1: 1800, mc: 0.25, tau_s: 350 },
  steel_1045:        { Kc1_1: 2200, mc: 0.26, tau_s: 450 },
  steel_4140:        { Kc1_1: 2500, mc: 0.27, tau_s: 520 },
  steel_4340:        { Kc1_1: 2800, mc: 0.28, tau_s: 580 },
  stainless_304:     { Kc1_1: 2400, mc: 0.23, tau_s: 480 },
  stainless_316:     { Kc1_1: 2600, mc: 0.24, tau_s: 510 },
  titanium_ti6al4v:  { Kc1_1: 2800, mc: 0.28, tau_s: 600 },
  inconel_718:       { Kc1_1: 2800, mc: 0.28, tau_s: 700 },
  cast_iron_gray:    { Kc1_1: 1200, mc: 0.28, tau_s: 280 },
  brass:             { Kc1_1: 800,  mc: 0.20, tau_s: 180 },
  copper:            { Kc1_1: 1000, mc: 0.22, tau_s: 200 },
};

const DEFAULT_MATERIAL: MaterialCuttingData = {
  Kc1_1: 2000, mc: 0.25, tau_s: 400,
};

// ============================================================================
// ENGINE
// ============================================================================

class CuttingMechanicsEngineImpl {

  /**
   * Merchant's orthogonal cutting model.
   * Decomposes resultant force into cutting, thrust, shear, friction, normal.
   */
  merchantAnalysis(params: MerchantParams): MerchantResult {
    const { chipThickness: h, width: b, rakeAngle: alpha,
      shearStrength: tau_s, frictionCoeff: mu = 0.5 } = params;

    const beta = Math.atan(mu);
    const phi = Math.PI / 4 - (beta - alpha) / 2;
    const phi_ls = Math.PI / 4 - beta + alpha;

    const r_c = Math.cos(phi - alpha) / Math.cos(alpha);
    const h_c = h / r_c;
    const A_s = (b * h) / Math.sin(phi);
    const F_s = tau_s * A_s;
    const R = F_s / Math.cos(phi + beta - alpha);
    const F_c = R * Math.cos(beta - alpha);
    const F_t = R * Math.sin(beta - alpha);
    const F_f = R * Math.sin(beta);
    const F_n = R * Math.cos(beta);
    const u_c = F_c / (b * h);

    return {
      shearAngle_deg: r2(phi * 180 / Math.PI),
      frictionAngle_deg: r2(beta * 180 / Math.PI),
      chipRatio: r4(r_c),
      chipThickness_mm: r4(h_c),
      chipCompressionRatio: r4(1 / r_c),
      shearPlaneArea_mm2: r2(A_s),
      forces: {
        shear_N: r2(F_s), resultant_N: r2(R),
        cutting_N: r2(F_c), thrust_N: r2(F_t),
        friction_N: r2(F_f), normal_N: r2(F_n),
      },
      specificCuttingEnergy_MPa: r2(u_c),
      leeShaffer_phi_deg: r2(phi_ls * 180 / Math.PI),
    };
  }

  /**
   * Time-varying milling force profile over one revolution.
   * Returns max/avg forces, power, and torque (full profile omitted for size).
   */
  millingForces(
    tool: MillingToolSpec, params: MillingCutParams,
  ): MillingForceResult {
    const { diameter: D, teeth: z } = tool;
    const { rpm, feed: f_z, axialDepth: a_p, radialDepth: a_e,
      Ktc, Krc = 0.3 * Ktc, Kac = 0.1 * Ktc } = params;

    const radialImm = a_e / D;
    const phi_st = Math.acos(1 - 2 * radialImm); // down milling entry
    const phi_ex = Math.PI;                        // down milling exit

    const points = 360;
    let fxMax = 0, fyMax = 0, fzMax = 0;
    let fxSum = 0, fySum = 0;

    for (let i = 0; i < points; i++) {
      const phi = (i / points) * 2 * Math.PI;
      let Fx = 0, Fy = 0, Fz = 0;

      for (let t = 0; t < z; t++) {
        const pt = (phi + t * (2 * Math.PI / z)) % (2 * Math.PI);
        if (pt >= phi_st && pt <= phi_ex) {
          const h = f_z * Math.sin(pt);
          if (h > 0) {
            const Ft = Ktc * a_p * h;
            const Fr = Krc * a_p * h;
            const Fa = Kac * a_p * h;
            Fx += -Ft * Math.cos(pt) - Fr * Math.sin(pt);
            Fy += Ft * Math.sin(pt) - Fr * Math.cos(pt);
            Fz += Fa;
          }
        }
      }

      fxMax = Math.max(fxMax, Math.abs(Fx));
      fyMax = Math.max(fyMax, Math.abs(Fy));
      fzMax = Math.max(fzMax, Math.abs(Fz));
      fxSum += Math.abs(Fx);
      fySum += Math.abs(Fy);
    }

    const fxAvg = fxSum / points;
    const fyAvg = fySum / points;
    const V_c = Math.PI * D * rpm / 1000;
    const P_avg = (fxAvg * V_c / 60) / 1000;

    return {
      maxForces: { Fx: r2(fxMax), Fy: r2(fyMax), Fz: r2(fzMax) },
      avgForces: { Fx: r2(fxAvg), Fy: r2(fyAvg) },
      engagementAngles: {
        entry_deg: r2(phi_st * 180 / Math.PI),
        exit_deg: r2(phi_ex * 180 / Math.PI),
      },
      power_kW: r4(P_avg),
      torque_Nm: rpm > 0
        ? r4((P_avg * 1000 * 60) / (2 * Math.PI * rpm)) : 0,
      profileLength: points,
    };
  }

  /**
   * Cutting temperature estimation (Trigger simplified model).
   */
  cuttingTemperature(params: CuttingTempParams = {}): CuttingTempResult {
    const {
      speed_mpm = 100, feed_mm = 0.2,
      specificEnergy_J_mm3 = 3.5,
      conductivity_W_mK = 50,
      density_kg_m3 = 7850,
      specificHeat_J_kgK = 500,
    } = params;

    const alpha = conductivity_W_mK / (density_kg_m3 * specificHeat_J_kgK);
    const L = feed_mm / 1000;
    const V = speed_mpm / 60;

    const sqrtTerm = Math.sqrt(Math.max(alpha * L, 1e-15));
    const deltaT = (0.4 * specificEnergy_J_mm3 * 1e9 * V)
      / (density_kg_m3 * specificHeat_J_kgK * sqrtTerm);

    const ambient = 25;
    return {
      chipTemperature_C: Math.round(ambient + deltaT),
      toolTemperature_C: Math.round(ambient + deltaT * 0.7),
      workpieceTemperature_C: Math.round(ambient + deltaT * 0.1),
      temperatureRise_C: Math.round(deltaT),
      heatPartition: { chip_percent: 70, tool_percent: 20, workpiece_percent: 10 },
    };
  }

  /**
   * Usui crater wear model.
   * dw/dt = A * sigma * V * exp(-B/T)
   */
  craterWear(params: CraterWearParams): CraterWearResult {
    const { cuttingSpeed: V, interfaceTemp: T_i,
      contactPressure: sigma, cuttingTime: t } = params;

    const A = 1e-8;
    const B = 5000;
    const T_K = T_i + 273;

    const wearRate = A * sigma * V * Math.exp(-B / T_K);
    const craterDepth = wearRate * t;

    return {
      craterDepth_mm: r6(craterDepth),
      wearRate_mm_per_min: r6(wearRate),
      wearMechanism: T_i > 800 ? "diffusion" : "abrasion",
      criticalDepth_mm: 0.1,
    };
  }

  /**
   * Get material cutting data (Kc1.1, mc, shear strength).
   */
  getMaterialCuttingData(material: string): MaterialCuttingData {
    const key = material.toLowerCase().replace(/[\s-]/g, "_");
    return MATERIAL_DB[key] ?? DEFAULT_MATERIAL;
  }

  /** List all materials in the cutting data database. */
  listMaterials(): string[] {
    return Object.keys(MATERIAL_DB);
  }
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function r6(v: number): number { return Math.round(v * 1e6) / 1e6; }

export const cuttingMechanicsEngine = new CuttingMechanicsEngineImpl();
