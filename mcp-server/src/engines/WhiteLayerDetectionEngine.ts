/**
 * WhiteLayerDetectionEngine — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Detects risk of white layer formation during hard machining.
 * White layer is an untempered martensite surface layer caused by
 * rapid heating and quenching during cutting of hardened steels.
 * Degrades fatigue life and may cause premature component failure.
 *
 * Model: Temperature threshold + specific energy + contact time
 * Risk increases with: cutting speed, tool wear, low coolant, high hardness
 *
 * Actions: white_layer_predict, white_layer_validate, white_layer_mitigate
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WhiteLayerInput {
  cutting_speed_mmin: number;
  feed_per_rev_mm: number;
  depth_of_cut_mm: number;
  workpiece_hardness_HRC: number;
  tool_wear_VB_mm: number;         // flank wear land width
  tool_material: "CBN" | "ceramic" | "carbide";
  coolant: "flood" | "mist" | "air" | "dry" | "cryo";
  operation: "hard_turning" | "hard_milling" | "grinding";
}

export type WhiteLayerRisk = "none" | "low" | "moderate" | "high" | "critical";

export interface WhiteLayerResult {
  risk_level: WhiteLayerRisk;
  probability_pct: number;
  estimated_layer_depth_um: number;
  surface_temp_C: number;
  threshold_temp_C: number;
  contributing_factors: { factor: string; contribution_pct: number; description: string }[];
  recommendations: string[];
  safe_to_proceed: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Austenite transformation temp for bearing steels ~750-800°C
const AUSTENITIZATION_TEMP_C = 760;
// Martensite start temperature
const MS_TEMP_C = 200;

// Tool wear multiplier on temperature
const WEAR_TEMP_FACTOR: Record<string, number> = {
  "0.0": 1.0, "0.1": 1.15, "0.2": 1.35, "0.3": 1.60, "0.4": 2.0, "0.5": 2.5,
};

// Coolant effectiveness at preventing white layer
const COOLANT_PREVENTION: Record<string, number> = {
  flood: 0.65, mist: 0.40, air: 0.15, dry: 0.0, cryo: 0.80,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WhiteLayerDetectionEngine {
  predict(input: WhiteLayerInput): WhiteLayerResult {
    // Base temperature model (simplified Loewen-Shaw for hard machining)
    const Vc = input.cutting_speed_mmin;
    const f = input.feed_per_rev_mm;
    const ap = input.depth_of_cut_mm;

    // Specific cutting energy increases with hardness
    const kc = 2000 + (input.workpiece_hardness_HRC - 40) * 80; // N/mm²

    // Cutting power → heat
    const power_W = (kc * Vc * f * ap) / 60;

    // Contact area
    const contactArea_mm2 = f * ap;

    // Heat flux
    const heatFlux = contactArea_mm2 > 0 ? power_W / contactArea_mm2 : 0;

    // Base surface temperature estimate
    let surfaceTemp = 200 + heatFlux * 0.08 + Vc * 2.5;

    // Tool wear multiplier
    const wearKey = String(Math.min(0.5, Math.round(input.tool_wear_VB_mm * 10) / 10));
    const wearFactor = WEAR_TEMP_FACTOR[wearKey] || (1 + input.tool_wear_VB_mm * 3);
    surfaceTemp *= wearFactor;

    // Tool material effect
    if (input.tool_material === "ceramic") surfaceTemp *= 1.10; // lower conductivity
    if (input.tool_material === "carbide") surfaceTemp *= 0.90;

    // Coolant reduction
    const coolantEff = COOLANT_PREVENTION[input.coolant] || 0;
    surfaceTemp *= (1 - coolantEff * 0.4);

    // White layer probability
    const tempRatio = surfaceTemp / AUSTENITIZATION_TEMP_C;
    let probability = 0;
    if (tempRatio >= 1.0) probability = Math.min(99, 50 + (tempRatio - 1.0) * 200);
    else if (tempRatio >= 0.85) probability = (tempRatio - 0.85) / 0.15 * 50;

    // Layer depth estimate (µm)
    const layerDepth = probability > 0 ? Math.max(1, (surfaceTemp - AUSTENITIZATION_TEMP_C * 0.85) * 0.05) : 0;

    // Risk classification
    const risk: WhiteLayerRisk =
      probability >= 80 ? "critical"
      : probability >= 50 ? "high"
      : probability >= 25 ? "moderate"
      : probability >= 5 ? "low"
      : "none";

    // Contributing factors
    const factors: WhiteLayerResult["contributing_factors"] = [];
    const totalContrib = Vc / 200 + wearFactor + (1 - coolantEff) + (input.workpiece_hardness_HRC - 40) / 20;
    factors.push({ factor: "cutting_speed", contribution_pct: Math.round(Vc / 200 / totalContrib * 100), description: `Vc=${Vc} m/min` });
    factors.push({ factor: "tool_wear", contribution_pct: Math.round(wearFactor / totalContrib * 100), description: `VB=${input.tool_wear_VB_mm}mm, factor=${wearFactor.toFixed(2)}` });
    factors.push({ factor: "coolant", contribution_pct: Math.round((1 - coolantEff) / totalContrib * 100), description: `${input.coolant}, prevention=${(coolantEff * 100).toFixed(0)}%` });
    factors.push({ factor: "hardness", contribution_pct: Math.round((input.workpiece_hardness_HRC - 40) / 20 / totalContrib * 100), description: `${input.workpiece_hardness_HRC} HRC` });

    // Recommendations
    const recs: string[] = [];
    if (risk === "critical" || risk === "high") {
      recs.push("STOP — white layer risk is unacceptable for safety-critical parts");
      if (input.tool_wear_VB_mm > 0.2) recs.push("Replace tool immediately — wear VB > 0.2mm drives temperature");
      if (input.coolant === "dry" || input.coolant === "air") recs.push("Switch to flood or cryogenic coolant");
      if (Vc > 150) recs.push(`Reduce cutting speed from ${Vc} to ${Math.round(Vc * 0.7)} m/min`);
    } else if (risk === "moderate") {
      recs.push("Monitor closely — inspect surface with Barkhausen noise or etch test");
      if (input.tool_wear_VB_mm > 0.15) recs.push("Consider tool change — wear approaching critical threshold");
    } else {
      recs.push("White layer risk is acceptable — proceed with standard monitoring");
    }

    return {
      risk_level: risk,
      probability_pct: Math.round(probability * 10) / 10,
      estimated_layer_depth_um: Math.round(layerDepth * 10) / 10,
      surface_temp_C: Math.round(surfaceTemp),
      threshold_temp_C: AUSTENITIZATION_TEMP_C,
      contributing_factors: factors,
      recommendations: recs,
      safe_to_proceed: risk === "none" || risk === "low",
    };
  }

  validate(input: WhiteLayerInput): { safe: boolean; risk: WhiteLayerRisk; message: string } {
    const result = this.predict(input);
    return {
      safe: result.safe_to_proceed,
      risk: result.risk_level,
      message: result.safe_to_proceed ? "White layer risk acceptable" : `WARNING: ${result.risk_level} white layer risk (${result.probability_pct}%)`,
    };
  }

  mitigate(input: WhiteLayerInput): { original_risk: WhiteLayerRisk; mitigated_risk: WhiteLayerRisk; changes: string[] } {
    const original = this.predict(input);
    const changes: string[] = [];
    const mitigated = { ...input };

    if (input.tool_wear_VB_mm > 0.15) { mitigated.tool_wear_VB_mm = 0.1; changes.push("Replace tool (VB → 0.1mm)"); }
    if (input.coolant !== "flood" && input.coolant !== "cryo") { mitigated.coolant = "flood"; changes.push("Switch to flood coolant"); }
    if (input.cutting_speed_mmin > 120) { mitigated.cutting_speed_mmin = Math.round(input.cutting_speed_mmin * 0.75); changes.push(`Reduce speed to ${mitigated.cutting_speed_mmin} m/min`); }

    const after = this.predict(mitigated);
    return { original_risk: original.risk_level, mitigated_risk: after.risk_level, changes };
  }
}

export const whiteLayerDetectionEngine = new WhiteLayerDetectionEngine();
