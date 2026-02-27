/**
 * WaterjetTaperEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Compensates for kerf taper in abrasive waterjet cutting.
 * Waterjet creates a tapered cut (wider at top, narrower at bottom)
 * due to jet divergence and energy loss through material.
 *
 * Models: taper angle prediction, speed-taper relationship,
 * dynamic head tilt compensation, and quality level mapping.
 *
 * Actions: waterjet_taper_calc, waterjet_compensate, waterjet_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type WaterjetQuality = "Q1_separation" | "Q2_rough" | "Q3_medium" | "Q4_fine" | "Q5_precision";

export interface WaterjetTaperInput {
  material: string;
  thickness_mm: number;
  cutting_speed_mm_per_min: number;
  pump_pressure_MPa: number;           // typically 350-600 MPa
  orifice_diameter_mm: number;         // typically 0.2-0.5mm
  mixing_tube_diameter_mm: number;     // typically 0.5-1.5mm
  abrasive_flow_g_per_min: number;
  standoff_mm: number;                 // nozzle to workpiece
  target_quality: WaterjetQuality;
  has_tilt_head: boolean;
}

export interface WaterjetTaperResult {
  predicted_taper_deg: number;
  top_kerf_mm: number;
  bottom_kerf_mm: number;
  taper_per_side_mm: number;
  tilt_compensation_deg: number;       // head tilt needed
  recommended_speed_mm_per_min: number;
  quality_achieved: WaterjetQuality;
  surface_roughness_Ra_um: number;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUALITY_SPEED_FACTOR: Record<WaterjetQuality, number> = {
  Q1_separation: 3.0,    // fastest — maximum taper
  Q2_rough: 2.0,
  Q3_medium: 1.0,        // baseline
  Q4_fine: 0.5,
  Q5_precision: 0.25,    // slowest — minimum taper
};

const MATERIAL_MACHINABILITY: Record<string, number> = {
  aluminum: 1.5, mild_steel: 1.0, stainless: 0.75, titanium: 0.5,
  glass: 0.8, stone: 0.7, ceramic: 0.4, composite: 0.9, copper: 1.2,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WaterjetTaperEngine {
  calculate(input: WaterjetTaperInput): WaterjetTaperResult {
    const matKey = this._materialKey(input.material);
    const matFactor = MATERIAL_MACHINABILITY[matKey] || 0.8;
    const qualFactor = QUALITY_SPEED_FACTOR[input.target_quality];

    // Recommended speed for target quality
    const baseSpeed = 100 * matFactor * (input.pump_pressure_MPa / 400) * (input.mixing_tube_diameter_mm / 1.0);
    const recSpeed = baseSpeed * qualFactor / Math.sqrt(input.thickness_mm / 25);

    // Actual speed ratio (how fast user wants to go vs recommended)
    const speedRatio = input.cutting_speed_mm_per_min / recSpeed;

    // Taper prediction
    // Taper increases with speed and thickness, decreases with pressure
    const baseTaper = 0.05; // degrees at Q3 baseline
    const taperDeg = baseTaper * speedRatio * Math.sqrt(input.thickness_mm / 25) / (input.pump_pressure_MPa / 400);

    // Kerf width
    const topKerf = input.mixing_tube_diameter_mm * 1.1 + input.standoff_mm * 0.02;
    const taperPerSide = Math.tan(taperDeg * Math.PI / 180) * input.thickness_mm;
    const bottomKerf = topKerf - 2 * taperPerSide;

    // Tilt compensation (if head available)
    const tiltComp = input.has_tilt_head ? taperDeg : 0;

    // Actual quality achieved at requested speed
    let achievedQuality: WaterjetQuality;
    if (speedRatio > 2.5) achievedQuality = "Q1_separation";
    else if (speedRatio > 1.5) achievedQuality = "Q2_rough";
    else if (speedRatio > 0.7) achievedQuality = "Q3_medium";
    else if (speedRatio > 0.35) achievedQuality = "Q4_fine";
    else achievedQuality = "Q5_precision";

    // Surface roughness estimate (Ra in µm)
    const Ra = 3.0 * speedRatio + 1.0;

    // Recommendations
    const recs: string[] = [];
    if (taperDeg > 0.5 && !input.has_tilt_head) {
      recs.push(`Taper ${taperDeg.toFixed(2)}° — consider dynamic tilt head for compensation`);
    }
    if (achievedQuality !== input.target_quality) {
      recs.push(`Speed produces ${achievedQuality} quality instead of target ${input.target_quality} — adjust speed to ${recSpeed.toFixed(0)} mm/min`);
    }
    if (input.thickness_mm > 150) {
      recs.push("Thick material (>150mm) — expect significant taper and reduced bottom edge quality");
    }
    if (input.standoff_mm > 3) {
      recs.push("Standoff >3mm — increases kerf width and taper; reduce to 1-2mm");
    }
    if (recs.length === 0) {
      recs.push("Waterjet parameters acceptable — proceed");
    }

    return {
      predicted_taper_deg: Math.round(taperDeg * 1000) / 1000,
      top_kerf_mm: Math.round(topKerf * 1000) / 1000,
      bottom_kerf_mm: Math.round(Math.max(0, bottomKerf) * 1000) / 1000,
      taper_per_side_mm: Math.round(taperPerSide * 1000) / 1000,
      tilt_compensation_deg: Math.round(tiltComp * 1000) / 1000,
      recommended_speed_mm_per_min: Math.round(recSpeed * 10) / 10,
      quality_achieved: achievedQuality,
      surface_roughness_Ra_um: Math.round(Ra * 10) / 10,
      recommendations: recs,
    };
  }

  private _materialKey(material: string): string {
    const m = material.toLowerCase();
    if (m.includes("aluminum")) return "aluminum";
    if (m.includes("stainless")) return "stainless";
    if (m.includes("titanium")) return "titanium";
    if (m.includes("glass")) return "glass";
    if (m.includes("ceramic")) return "ceramic";
    if (m.includes("composite") || m.includes("cfrp")) return "composite";
    if (m.includes("copper")) return "copper";
    if (m.includes("stone") || m.includes("granite") || m.includes("marble")) return "stone";
    return "mild_steel";
  }
}

export const waterjetTaperEngine = new WaterjetTaperEngine();
