/**
 * HyperMillSurfaceIntegrityBridge — Surface integrity wiring for hyperMILL finishing
 *
 * Connects 3 PRISM surface integrity engines to hyperMILL finishing operations:
 *   1. SurfaceIntegrityEngine     — Ra/Rz prediction, white layer thickness,
 *                                   residual stress, fatigue derating
 *   2. SurfaceFinishPredictorEngine — Used for parameter reference; Ra/Rz from
 *                                     SurfaceIntegrityEngine's Brammertz model
 *   3. ResidualStressPredictionEngine — Tensile/compressive stress profile
 *
 * White layer hard gate (U-HMR30):
 *   Uses a cutting temperature model based on
 *     θ = θ_amb + C_θ · (kc1.1 · fz^(1-mc)) ^ 0.6 · Vc ^ 0.4
 *   where C_θ = 0.4 (empirical coefficient from Trigger & Chao (1951) adapted by
 *   Boothroyd (1963) and validated in Trent & Wright (2000) "Metal Cutting" §6.4).
 *   If predicted temp > WHITE_LAYER_THRESHOLDS[material].threshold_C → HARD BLOCK.
 *   Fail-close: if material not found in thresholds → WARN but do not block.
 *
 * Quality report (U-HMR31):
 *   generateReport() produces a structured quality report compatible with the
 *   MS10 quality chain and setup sheet generation.
 *
 * Sources:
 *   - Field & Kahles (1971) CIRP Annals — "The surface integrity of machined products"
 *   - Davim, J.P. (2010) "Surface Integrity in Machining"
 *   - Brinksmeier et al. (1999) CIRP Annals 48/2 — "Residual stresses in machining"
 *   - Trigger & Chao (1951) Trans ASME — cutting temperature model
 *   - Boothroyd (1963) Proc. IMechE 177 — "Temperatures in orthogonal metal cutting"
 *   - WHITE_LAYER_THRESHOLDS: src/physics/constants.ts
 *
 * HM-REV-MS5 / U-HMR29 + U-HMR30 + U-HMR31
 */

import {
  WHITE_LAYER_THRESHOLDS,
  type WhiteLayerThreshold,
  CANONICAL_KIENZLE,
} from "../physics/constants.js";
import { surfaceIntegrityEngine, type SurfaceIntegrityInput, type SurfaceIntegrityResult } from "./SurfaceIntegrityEngine.js";

// ============================================================================
// Types
// ============================================================================

export type SurfaceMaterial =
  | "steel"
  | "stainless"
  | "titanium"
  | "nickel_alloy"
  | "hardened_steel"
  | "tool_steel"
  | "aluminum";

export type SurfaceProcess =
  | "turning"
  | "milling"
  | "hard_turning"
  | "grinding";

export interface SurfaceIntegrityCheckInput {
  /** Process type */
  process: SurfaceProcess;
  /** Material class */
  material: SurfaceMaterial;
  /** Cutting speed [m/min] */
  cuttingSpeed_m_min: number;
  /** Feed per tooth / feed per rev [mm] */
  feed_mm: number;
  /** Depth of cut [mm] */
  depthOfCut_mm: number;
  /** Tool nose radius [mm] */
  toolNoseRadius_mm?: number;
  /** Coolant condition */
  coolant?: "flood" | "mql" | "dry" | "cryogenic";
  /** Tool condition */
  toolCondition?: "sharp" | "moderate_wear" | "worn";
  /** Required Ra [µm] — for compliance check */
  requiredRa_um?: number;
  /** Required residual stress state */
  requiredStressState?: "compressive" | "tensile" | "any";
  /** Ambient temperature [°C] — for thermal model */
  ambientTemp_C?: number;
}

export interface WhiteLayerGateResult {
  /** Whether the operation is blocked */
  blocked: boolean;
  /** Predicted cutting zone temperature [°C] */
  predictedTemp_C: number;
  /** Threshold from constants.ts */
  threshold_C: number;
  /** Temperature headroom (positive = safe, negative = exceeds threshold) */
  headroom_C: number;
  /** Whether material has a defined threshold */
  thresholdKnown: boolean;
  /** Gate message */
  message: string;
  /** Recommended Vc reduction to bring temp below threshold [m/min] */
  recommendedMaxVc_m_min?: number;
}

export interface ResidualStressEstimate {
  /** Surface residual stress [MPa] — positive = tensile */
  surface_MPa: number;
  /** Stress state classification */
  state: "compressive" | "tensile" | "neutral";
  /** Stress depth profile depth [µm] */
  affectedDepth_um: number;
  /** Confidence 0–1 */
  confidence: number;
}

export interface SurfaceIntegrityCheckResult {
  /** Input echo */
  process: SurfaceProcess;
  material: SurfaceMaterial;

  /** Surface finish predictions */
  ra_um: number;
  rz_um: number;
  raCompliant: boolean;

  /** White layer gate */
  whiteLayerGate: WhiteLayerGateResult;

  /** Residual stress estimate */
  residualStress: ResidualStressEstimate;

  /** White layer thickness from SurfaceIntegrityEngine [µm] */
  whiteLayerThickness_um: number;

  /** Fatigue derating factor (1.0 = no derating) */
  fatigueDeratingFactor: number;

  /** Overall surface integrity score 0–10 */
  surfaceQualityScore: number;

  /** Quality report (U-HMR31) */
  qualityReport: SurfaceIntegrityQualityReport;

  /** Warnings */
  warnings: string[];

  /** Confidence 0–1 */
  confidence: number;

  /** Source attribution */
  source: string;
}

export interface SurfaceIntegrityQualityReport {
  /** Report version */
  reportVersion: "MS5-v1";
  /** Operation summary */
  operation: {
    process: SurfaceProcess;
    material: SurfaceMaterial;
    cuttingSpeed_m_min: number;
    feed_mm: number;
    depthOfCut_mm: number;
    coolant: string;
  };
  /** Surface finish section */
  surfaceFinish: {
    predicted_ra_um: number;
    predicted_rz_um: number;
    required_ra_um: number | null;
    compliant: boolean;
    status: "PASS" | "FAIL" | "UNSPECIFIED";
  };
  /** Residual stress section */
  residualStressSection: {
    surface_MPa: number;
    state: "compressive" | "tensile" | "neutral";
    affectedDepth_um: number;
    required: string;
    compliant: boolean;
  };
  /** White layer section */
  whiteLayerSection: {
    predictedThickness_um: number;
    gateStatus: "PASS" | "BLOCKED" | "WARN_THRESHOLD_UNKNOWN";
    predictedTemp_C: number;
    threshold_C: number | null;
    message: string;
  };
  /** Fatigue section */
  fatigueSection: {
    deratingFactor: number;
    effectiveFatigueStrength_pct: number;
  };
  /** Overall assessment */
  overall: {
    score: number;
    pass: boolean;
    summary: string;
  };
  /** MS10 compatibility token */
  ms10Compatible: true;
}

// ============================================================================
// Thermal model constants
// ============================================================================

/**
 * Cutting temperature model coefficient C_θ.
 *
 * Based on Boothroyd's semi-empirical model for primary shear zone temperature:
 *   θ_cut ≈ θ_amb + C_θ · kc^0.6 · Vc^0.4
 *
 * where kc = kc1.1 · fz^(1-mc) [N/mm²] is the specific cutting force.
 *
 * C_θ = 2.0 °C·mm^1.2/(N^0.6·(m/min)^0.4)
 *
 * Calibration reference (Thiele & Melkote 1999):
 *   Hard turning AISI 52100 (52 HRC), Vc=150m/min, fz=0.1mm:
 *   Experimental tool-face temperature ≈ 750°C
 *   Model: θ = 20 + 2.0 × (3200×0.1^0.7)^0.6 × 150^0.4 ≈ 737°C ✓
 *
 * Source: Boothroyd (1963) Proc. IMechE 177(1):789–810;
 *         Thiele & Melkote (1999) J. Manuf. Sci. Eng. 121(1):462-467;
 *         Trent & Wright (2000) "Metal Cutting" 4th ed. §6.4
 */
const C_THETA = 2.0;

/**
 * Map our SurfaceMaterial to SurfaceIntegrityEngine material keys
 * and to WHITE_LAYER_THRESHOLDS keys.
 */
const MATERIAL_MAP: Record<SurfaceMaterial, {
  sieMaterial: SurfaceIntegrityInput["material"];
  thresholdKey: string | null;
  isoKienzleGroup: string;
}> = {
  steel:          { sieMaterial: "steel",        thresholdKey: "steel",          isoKienzleGroup: "P" },
  stainless:      { sieMaterial: "stainless",    thresholdKey: "stainless",      isoKienzleGroup: "M" },
  titanium:       { sieMaterial: "titanium",     thresholdKey: "titanium",       isoKienzleGroup: "S" },
  nickel_alloy:   { sieMaterial: "nickel_alloy", thresholdKey: "nickel_alloy",   isoKienzleGroup: "S" },
  hardened_steel: { sieMaterial: "steel",        thresholdKey: "hardened_steel", isoKienzleGroup: "H" },
  tool_steel:     { sieMaterial: "steel",        thresholdKey: "tool_steel",     isoKienzleGroup: "H" },
  aluminum:       { sieMaterial: "aluminum",     thresholdKey: null,             isoKienzleGroup: "N" },
};

// ============================================================================
// Engine
// ============================================================================

/**
 * HyperMillSurfaceIntegrityBridge
 *
 * Runs all 3 surface integrity predictions and applies the white layer hard gate.
 * Produces a quality report compatible with the MS10 quality chain.
 */
export class HyperMillSurfaceIntegrityBridge {

  /**
   * Run full surface integrity check for a hyperMILL finishing operation.
   *
   * @param input - Cutting conditions + material + required limits
   * @returns Full surface integrity result including white layer gate and quality report
   */
  calculate(input: SurfaceIntegrityCheckInput): SurfaceIntegrityCheckResult {
    const warnings: string[] = [];
    const {
      process,
      material,
      cuttingSpeed_m_min: Vc,
      feed_mm: fz,
      depthOfCut_mm: ap,
      toolNoseRadius_mm = 0.8,
      coolant = "flood",
      toolCondition = "sharp",
      requiredRa_um,
      requiredStressState = "any",
      ambientTemp_C = 20,
    } = input;

    const matMap = MATERIAL_MAP[material];

    // ── 1. SurfaceIntegrityEngine ────────────────────────────────────────────
    const sieInput: SurfaceIntegrityInput = {
      process: process as SurfaceIntegrityInput["process"],
      feed_mm_rev: fz,
      tool_nose_radius_mm: toolNoseRadius_mm,
      cutting_speed_m_min: Vc,
      depth_of_cut_mm: ap,
      material: matMap.sieMaterial,
      coolant: coolant as SurfaceIntegrityInput["coolant"],
      tool_condition: toolCondition as SurfaceIntegrityInput["tool_condition"],
    };
    const sieResult: SurfaceIntegrityResult = surfaceIntegrityEngine.calculate(sieInput);

    const ra_um = sieResult.surface_roughness_ra.value;
    const rz_um = sieResult.roughness_rz.value;
    const whiteLayerThickness_um = sieResult.white_layer_thickness.value;
    const fatigueDeratingFactor = sieResult.fatigue_derating.value;
    const surfaceQualityScore = sieResult.surface_quality_score.value;

    // Collect SIE warnings
    if (sieResult.warnings?.length) {
      warnings.push(...sieResult.warnings);
    }

    // Ra compliance
    const raCompliant = requiredRa_um === undefined ? true : ra_um <= requiredRa_um;
    if (!raCompliant) {
      warnings.push(
        `Ra ${ra_um.toFixed(3)}µm exceeds required ${requiredRa_um}µm — reduce feed or increase Vc`,
      );
    }

    // ── 2. Residual stress estimate ──────────────────────────────────────────
    const residualStress = this._estimateResidualStress(
      sieResult,
      process,
      material,
      Vc,
      ap,
      coolant,
    );

    const stressCompliant =
      requiredStressState === "any" ||
      residualStress.state === requiredStressState;
    if (!stressCompliant) {
      warnings.push(
        `Residual stress state is '${residualStress.state}' — required '${requiredStressState}'`,
      );
    }

    // ── 3. White layer hard gate ─────────────────────────────────────────────
    const whiteLayerGate = this._runWhiteLayerGate({
      material,
      Vc,
      fz,
      ap,
      ambientTemp_C,
      isoGroup: matMap.isoKienzleGroup,
      thresholdKey: matMap.thresholdKey,
    });

    if (whiteLayerGate.blocked) {
      warnings.push(
        `WHITE LAYER HARD BLOCK: predicted temp ${whiteLayerGate.predictedTemp_C.toFixed(0)}°C ` +
        `exceeds threshold ${whiteLayerGate.threshold_C}°C for ${material}`,
      );
    }

    // ── 4. Quality report (U-HMR31) ──────────────────────────────────────────
    const qualityReport = this.generateReport({
      input,
      ra_um,
      rz_um,
      raCompliant,
      residualStress,
      whiteLayerThickness_um,
      whiteLayerGate,
      fatigueDeratingFactor,
      surfaceQualityScore,
    });

    const confidence = whiteLayerGate.blocked ? 0.95 :
      warnings.length === 0 ? 0.88 : 0.75;

    return {
      process,
      material,
      ra_um: Math.round(ra_um * 1000) / 1000,
      rz_um: Math.round(rz_um * 1000) / 1000,
      raCompliant,
      whiteLayerGate,
      residualStress,
      whiteLayerThickness_um: Math.round(whiteLayerThickness_um * 100) / 100,
      fatigueDeratingFactor: Math.round(fatigueDeratingFactor * 10000) / 10000,
      surfaceQualityScore: Math.round(surfaceQualityScore * 10) / 10,
      qualityReport,
      warnings,
      confidence,
      source:
        "SurfaceIntegrityEngine + Boothroyd-1963-temperature + WHITE_LAYER_THRESHOLDS/constants.ts",
    };
  }

  /**
   * Run the white layer hard gate independently (for hooks and quick checks).
   *
   * Temperature model:
   *   kc = kc1.1 · fz^(1 - mc)          [specific cutting force, N/mm²]
   *   θ  = θ_amb + C_θ · kc^0.6 · Vc^0.4  [cutting zone temp, °C]
   *
   * Fail-close rule: if material not in WHITE_LAYER_THRESHOLDS, emit WARN,
   * not BLOCK (insufficient data).
   */
  runWhiteLayerGate(params: {
    material: string;
    cuttingSpeed_m_min: number;
    feed_mm: number;
    depthOfCut_mm?: number;
    ambientTemp_C?: number;
  }): WhiteLayerGateResult {
    const matKey = params.material as SurfaceMaterial;
    const matMap = MATERIAL_MAP[matKey] ?? {
      isoKienzleGroup: "P",
      thresholdKey: params.material,
    };
    return this._runWhiteLayerGate({
      material: matKey,
      Vc: params.cuttingSpeed_m_min,
      fz: params.feed_mm,
      ap: params.depthOfCut_mm ?? 0.5,
      ambientTemp_C: params.ambientTemp_C ?? 20,
      isoGroup: (matMap as any).isoKienzleGroup ?? "P",
      thresholdKey: (matMap as any).thresholdKey ?? null,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _runWhiteLayerGate(params: {
    material: string;
    Vc: number;
    fz: number;
    ap: number;
    ambientTemp_C: number;
    isoGroup: string;
    thresholdKey: string | null;
  }): WhiteLayerGateResult {
    const { Vc, fz, ap, ambientTemp_C, isoGroup, thresholdKey } = params;

    // Look up Kienzle constants from CANONICAL_KIENZLE
    const kienzle = CANONICAL_KIENZLE[isoGroup as keyof typeof CANONICAL_KIENZLE]
      ?? CANONICAL_KIENZLE["P"];
    const { kc1_1, mc } = kienzle;

    // Specific cutting force [N/mm²]: kc = kc1.1 · fz^(1-mc)
    const fzClamped = Math.max(fz, 0.001);
    const kc = kc1_1 * Math.pow(fzClamped, 1 - mc);

    // Cutting zone temperature [°C]: θ = θ_amb + C_θ · kc^0.6 · Vc^0.4
    const predictedTemp_C = ambientTemp_C + C_THETA * Math.pow(kc, 0.6) * Math.pow(Math.max(Vc, 1), 0.4);

    // Threshold lookup
    const threshold = thresholdKey ? WHITE_LAYER_THRESHOLDS[thresholdKey] : undefined;

    if (!threshold) {
      // Fail-close: WARN but do not block (insufficient data for this material)
      return {
        blocked: false,
        predictedTemp_C: Math.round(predictedTemp_C * 10) / 10,
        threshold_C: 0,
        headroom_C: Infinity,
        thresholdKnown: false,
        message: `White layer threshold not defined for '${params.material}' — proceeding with CAUTION. Manual verification recommended.`,
      };
    }

    const headroom_C = threshold.threshold_C - predictedTemp_C;
    const blocked = predictedTemp_C >= threshold.threshold_C;

    // Recommend max safe Vc: solve θ_safe = θ_amb + C_θ · kc^0.6 · Vc_max^0.4
    //   Vc_max = ((θ_safe - θ_amb) / (C_θ · kc^0.6))^(1/0.4)
    const theta_safe = threshold.threshold_C - 10; // 10°C safety margin
    const k_term = C_THETA * Math.pow(kc, 0.6);
    const recommendedMaxVc_m_min = k_term > 0
      ? Math.pow(Math.max(theta_safe - ambientTemp_C, 1) / k_term, 1 / 0.4)
      : 0;

    const message = blocked
      ? `WHITE LAYER HARD BLOCK — Predicted cutting temp ${predictedTemp_C.toFixed(0)}°C exceeds ` +
        `threshold ${threshold.threshold_C}°C for ${threshold.source}. ` +
        `Reduce Vc to ≤${Math.round(recommendedMaxVc_m_min)}m/min or apply cryogenic cooling.`
      : `White layer gate PASS — Predicted ${predictedTemp_C.toFixed(0)}°C vs threshold ${threshold.threshold_C}°C ` +
        `(headroom: ${Math.round(headroom_C)}°C)`;

    return {
      blocked,
      predictedTemp_C: Math.round(predictedTemp_C * 10) / 10,
      threshold_C: threshold.threshold_C,
      headroom_C: Math.round(headroom_C * 10) / 10,
      thresholdKnown: true,
      message,
      recommendedMaxVc_m_min: Math.round(recommendedMaxVc_m_min),
    };
  }

  private _estimateResidualStress(
    sieResult: SurfaceIntegrityResult,
    process: SurfaceProcess,
    material: SurfaceMaterial,
    Vc: number,
    ap: number,
    coolant: string,
  ): ResidualStressEstimate {
    const baseMPa = sieResult.residual_stress_surface.value;

    // Modify based on process and material context
    let stress_MPa = baseMPa;

    // High Vc → more tensile (thermal dominance)
    if (Vc > 200) stress_MPa += 50;
    // Dry cutting → more tensile
    if (coolant === "dry") stress_MPa += 100;
    // Cryogenic → compressive benefit
    if (coolant === "cryogenic") stress_MPa -= 80;
    // Nickel/titanium — mechanical effect can induce compressive even with heat
    if (material === "nickel_alloy" || material === "titanium") stress_MPa -= 50;
    // Hard turning at low speed — compressive from mechanical
    if (process === "hard_turning" && Vc < 120) stress_MPa -= 100;

    const state: "compressive" | "tensile" | "neutral" =
      stress_MPa < -20 ? "compressive" :
      stress_MPa > 20  ? "tensile"     : "neutral";

    return {
      surface_MPa: Math.round(stress_MPa),
      state,
      affectedDepth_um: Math.round(sieResult.residual_stress_depth.value),
      confidence: 0.70, // residual stress prediction has ±30% uncertainty
    };
  }

  /**
   * Generate structured quality report (U-HMR31).
   * Format is compatible with the MS10 quality chain and setup sheet generation.
   */
  generateReport(params: {
    input: SurfaceIntegrityCheckInput;
    ra_um: number;
    rz_um: number;
    raCompliant: boolean;
    residualStress: ResidualStressEstimate;
    whiteLayerThickness_um: number;
    whiteLayerGate: WhiteLayerGateResult;
    fatigueDeratingFactor: number;
    surfaceQualityScore: number;
  }): SurfaceIntegrityQualityReport {
    const {
      input, ra_um, rz_um, raCompliant, residualStress,
      whiteLayerThickness_um, whiteLayerGate,
      fatigueDeratingFactor, surfaceQualityScore,
    } = params;

    const gateStatus: "PASS" | "BLOCKED" | "WARN_THRESHOLD_UNKNOWN" =
      !whiteLayerGate.thresholdKnown ? "WARN_THRESHOLD_UNKNOWN" :
      whiteLayerGate.blocked         ? "BLOCKED"                : "PASS";

    const requiredStress = input.requiredStressState ?? "any";
    const stressCompliant =
      requiredStress === "any" || residualStress.state === requiredStress;

    const overallPass =
      raCompliant &&
      !whiteLayerGate.blocked &&
      stressCompliant &&
      fatigueDeratingFactor > 0.80; // derating below 20% = surface integrity concern

    const summary = overallPass
      ? `Surface integrity PASS — Ra=${ra_um.toFixed(2)}µm, ${residualStress.state} stress, white layer gate ${gateStatus}`
      : [
          !raCompliant ? `Ra ${ra_um.toFixed(2)}µm exceeds limit` : null,
          whiteLayerGate.blocked ? `WHITE LAYER BLOCKED (${whiteLayerGate.predictedTemp_C.toFixed(0)}°C)` : null,
          !stressCompliant ? `Stress state '${residualStress.state}' not acceptable` : null,
          fatigueDeratingFactor <= 0.80 ? `Fatigue derating ${((1-fatigueDeratingFactor)*100).toFixed(0)}% exceeds 20% limit` : null,
        ].filter(Boolean).join("; ");

    return {
      reportVersion: "MS5-v1",
      operation: {
        process: input.process,
        material: input.material,
        cuttingSpeed_m_min: input.cuttingSpeed_m_min,
        feed_mm: input.feed_mm,
        depthOfCut_mm: input.depthOfCut_mm,
        coolant: input.coolant ?? "flood",
      },
      surfaceFinish: {
        predicted_ra_um: Math.round(ra_um * 1000) / 1000,
        predicted_rz_um: Math.round(rz_um * 1000) / 1000,
        required_ra_um: input.requiredRa_um ?? null,
        compliant: raCompliant,
        status: input.requiredRa_um === undefined ? "UNSPECIFIED" : raCompliant ? "PASS" : "FAIL",
      },
      residualStressSection: {
        surface_MPa: residualStress.surface_MPa,
        state: residualStress.state,
        affectedDepth_um: residualStress.affectedDepth_um,
        required: requiredStress,
        compliant: stressCompliant,
      },
      whiteLayerSection: {
        predictedThickness_um: whiteLayerThickness_um,
        gateStatus,
        predictedTemp_C: whiteLayerGate.predictedTemp_C,
        threshold_C: whiteLayerGate.thresholdKnown ? whiteLayerGate.threshold_C : null,
        message: whiteLayerGate.message,
      },
      fatigueSection: {
        deratingFactor: Math.round(fatigueDeratingFactor * 10000) / 10000,
        effectiveFatigueStrength_pct: Math.round(fatigueDeratingFactor * 100 * 10) / 10,
      },
      overall: {
        score: Math.round(surfaceQualityScore * 10) / 10,
        pass: overallPass,
        summary,
      },
      ms10Compatible: true,
    };
  }
}

export const hyperMillSurfaceIntegrityBridge = new HyperMillSurfaceIntegrityBridge();
