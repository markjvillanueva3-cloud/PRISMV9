/**
 * PRISM MCP Server — Tool Substitution Risk Engine
 *
 * Physics-backed risk assessment when substituting one cutting tool
 * for another. Compares deflection (delta=FL^3/3EI), finish impact,
 * chatter risk, tool life, and chip load changes. Provides parameter
 * adjustments for the substitute tool.
 *
 * @module ToolSubstitutionRiskEngine
 */

import { getKienzle } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolSpec {
  diameter_mm: number;
  flutes: number;
  type: string;
  coating: string;
  helix_angle_deg: number;
}

export interface OperationContext {
  material: string;
  depth_mm: number;
  width_mm: number;
  feed_per_tooth_mm: number;
  spindle_rpm: number;
}

export interface SubstitutionInput {
  original: ToolSpec;
  substitute: ToolSpec;
  operation: OperationContext;
  tolerance_mm: number;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskFactors {
  deflection_delta_mm: number;
  finish_impact_Ra_delta: number;
  chatter_risk_change: string;
  tool_life_impact_pct: number;
  chip_load_change_pct: number;
}

export interface ParameterAdjustments {
  new_rpm: number;
  new_feed: number;
  new_depth?: number;
}

export interface SubstitutionResult {
  overall_risk: RiskLevel;
  risk_factors: RiskFactors;
  parameter_adjustments: ParameterAdjustments;
  warnings: string[];
  approval_recommended: boolean;
}

// ============================================================================
// PHYSICS HELPERS
// ============================================================================

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Moment of inertia for solid cylinder: I = pi*D^4/64 */
function momentOfInertia(diameter_mm: number): number {
  return (Math.PI * Math.pow(diameter_mm, 4)) / 64;
}

/** Tool deflection: delta = F*L^3 / (3*E*I)
 *  Overhang L estimated as 3.5 * diameter (typical).
 *  E = 600 GPa for carbide. */
function toolDeflection(diameter_mm: number, force_N: number): number {
  const L = diameter_mm * 3.5;
  const E = 600000; // MPa
  const I = momentOfInertia(diameter_mm);
  if (I === 0) return 0;
  return (force_N * Math.pow(L, 3)) / (3 * E * I);
}

/** Approximate cutting force via Kienzle: Fc = kc1.1 * ap * fz^(1-mc)
 *  Constants from CANONICAL_KIENZLE via getKienzle() — resolved by material/ISO group */
function estimateCuttingForce(
  depth_mm: number,
  width_mm: number,
  fz_mm: number,
  diameter_mm: number,
  material?: string,
): number {
  const { kc1_1, mc } = getKienzle(material ?? "steel");
  const ae_ratio = Math.min(width_mm / diameter_mm, 1.0);
  const effective_ap = depth_mm * ae_ratio;
  const Fc = kc1_1 * effective_ap * Math.pow(Math.max(fz_mm, 0.001), 1 - mc);
  return Fc;
}

/** Theoretical surface finish: Ra ~ f^2 / (32 * r_nose)
 *  Approximate nose radius from helix and type */
function estimateNoseRadius(tool: ToolSpec): number {
  // Ball nose: r = D/2, bull nose: r ~ D*0.1, flat endmill: r ~ 0.4mm
  const t = tool.type.toLowerCase();
  if (t.includes("ball")) return tool.diameter_mm / 2;
  if (t.includes("bull") || t.includes("radius")) return tool.diameter_mm * 0.1;
  return 0.4; // corner radius for flat endmill
}

function theoreticalRa(fz_mm: number, noseRadius_mm: number): number {
  if (noseRadius_mm <= 0) return 999;
  // Ra ~ f^2 / (32 * r) in mm, convert to um
  return ((fz_mm * fz_mm) / (32 * noseRadius_mm)) * 1000;
}

/** Coating hardness multiplier for tool life estimate */
function coatingLifeMultiplier(coating: string): number {
  const c = coating.toLowerCase();
  if (c.includes("tialn") || c.includes("alcrn")) return 1.5;
  if (c.includes("ticn")) return 1.3;
  if (c.includes("tin")) return 1.2;
  if (c.includes("dlc") || c.includes("diamond")) return 2.0;
  if (c === "uncoated" || c === "none" || c === "") return 1.0;
  return 1.15; // generic coating
}

/** Helix angle affects chip evacuation and axial force balance */
function helixStabilityFactor(helix_deg: number): number {
  // Optimal helix ~35-40 deg. Deviation increases chatter risk.
  if (helix_deg >= 30 && helix_deg <= 45) return 1.0;
  if (helix_deg >= 20 && helix_deg < 30) return 0.85;
  if (helix_deg > 45 && helix_deg <= 55) return 0.9;
  return 0.75; // extreme helix values
}

// ============================================================================
// ENGINE
// ============================================================================

export class ToolSubstitutionRiskEngine {
  /**
   * Assess risk of substituting one tool for another with physics-backed analysis.
   */
  assessSubstitution(input: SubstitutionInput): SubstitutionResult {
    const { original, substitute, operation, tolerance_mm } = input;
    const warnings: string[] = [];

    // ── Force & Deflection comparison ──
    const forceOrig = estimateCuttingForce(
      operation.depth_mm, operation.width_mm,
      operation.feed_per_tooth_mm, original.diameter_mm, operation.material,
    );
    const forceSub = estimateCuttingForce(
      operation.depth_mm, operation.width_mm,
      operation.feed_per_tooth_mm, substitute.diameter_mm, operation.material,
    );

    const deflOrig = toolDeflection(original.diameter_mm, forceOrig);
    const deflSub = toolDeflection(substitute.diameter_mm, forceSub);
    const deflection_delta_mm = round3(deflSub - deflOrig);

    if (Math.abs(deflection_delta_mm) > tolerance_mm * 0.5) {
      warnings.push(
        `Deflection change ${deflection_delta_mm > 0 ? "+" : ""}${deflection_delta_mm} mm ` +
        `exceeds 50% of tolerance (${tolerance_mm} mm)`,
      );
    }

    // ── Surface finish impact ──
    const rOrig = estimateNoseRadius(original);
    const rSub = estimateNoseRadius(substitute);
    const raOrig = theoreticalRa(operation.feed_per_tooth_mm, rOrig);
    const raSub = theoreticalRa(operation.feed_per_tooth_mm, rSub);
    const finish_impact_Ra_delta = round3(raSub - raOrig);

    if (finish_impact_Ra_delta > 0.5) {
      warnings.push(
        `Surface finish may degrade by ~${finish_impact_Ra_delta} um Ra`,
      );
    }

    // ── Chatter risk ──
    const stabOrig = helixStabilityFactor(original.helix_angle_deg);
    const stabSub = helixStabilityFactor(substitute.helix_angle_deg);
    // Stiffness ratio: I is proportional to D^4
    const stiffnessRatio = Math.pow(substitute.diameter_mm, 4) /
      Math.pow(Math.max(original.diameter_mm, 0.1), 4);
    // More flutes = more engagement overlap = potentially more chatter damping
    const fluteRatio = substitute.flutes / Math.max(original.flutes, 1);

    let chatter_risk_change: string;
    const chatterScore = stiffnessRatio * stabSub / stabOrig * Math.sqrt(fluteRatio);
    if (chatterScore > 1.15) chatter_risk_change = "reduced";
    else if (chatterScore > 0.85) chatter_risk_change = "similar";
    else if (chatterScore > 0.6) chatter_risk_change = "increased";
    else chatter_risk_change = "significantly_increased";

    if (chatter_risk_change === "significantly_increased") {
      warnings.push("Chatter risk significantly increased — reduced stiffness or helix angle mismatch");
    } else if (chatter_risk_change === "increased") {
      warnings.push("Chatter risk increased — consider reducing DOC");
    }

    // ── Tool life impact ──
    const coatOrig = coatingLifeMultiplier(original.coating);
    const coatSub = coatingLifeMultiplier(substitute.coating);
    const coatingRatio = coatSub / coatOrig;
    // Larger diameter = more material in cutting edge = generally longer life
    const diamRatio = substitute.diameter_mm / Math.max(original.diameter_mm, 0.1);
    const lifeRatio = coatingRatio * Math.pow(diamRatio, 0.3);
    const tool_life_impact_pct = round1((lifeRatio - 1) * 100);

    if (tool_life_impact_pct < -30) {
      warnings.push(`Tool life may decrease by ~${Math.abs(tool_life_impact_pct)}%`);
    }

    // ── Chip load change ──
    // If flute count changes, chip load per tooth changes at same feed rate
    const chip_load_change_pct = round1(
      ((original.flutes / Math.max(substitute.flutes, 1)) - 1) * 100,
    );

    if (Math.abs(chip_load_change_pct) > 30) {
      warnings.push(
        `Chip load per tooth changes by ${chip_load_change_pct > 0 ? "+" : ""}${chip_load_change_pct}% ` +
        `— adjust feed rate`,
      );
    }

    // ── Parameter adjustments ──
    // Maintain same surface speed: RPM_new = RPM_old * D_old / D_new
    const new_rpm = Math.round(
      operation.spindle_rpm * original.diameter_mm /
      Math.max(substitute.diameter_mm, 0.1),
    );

    // Maintain same table feed: adjust fz for different flute count
    // Vf = fz * z * n, keep Vf constant: fz_new = fz_old * z_old * n_old / (z_new * n_new)
    const vf_original = operation.feed_per_tooth_mm * original.flutes * operation.spindle_rpm;
    const new_feed = round3(
      vf_original / (substitute.flutes * Math.max(new_rpm, 1)),
    );

    let new_depth: number | undefined;
    if (deflSub > deflOrig * 1.5 && deflection_delta_mm > tolerance_mm * 0.3) {
      // Reduce DOC to keep deflection similar
      const reductionFactor = deflOrig / Math.max(deflSub, 0.001);
      new_depth = round3(operation.depth_mm * Math.min(reductionFactor, 1.0));
      warnings.push(`Recommend reducing DOC to ${new_depth} mm to maintain deflection budget`);
    }

    // ── Overall risk assessment ──
    let riskScore = 0;

    // Deflection risk
    const deflPctOfTol = Math.abs(deflection_delta_mm) / Math.max(tolerance_mm, 0.001);
    if (deflPctOfTol > 0.8) riskScore += 4;
    else if (deflPctOfTol > 0.5) riskScore += 2;
    else if (deflPctOfTol > 0.2) riskScore += 1;

    // Finish risk
    if (finish_impact_Ra_delta > 1.0) riskScore += 3;
    else if (finish_impact_Ra_delta > 0.5) riskScore += 2;
    else if (finish_impact_Ra_delta > 0.2) riskScore += 1;

    // Chatter risk
    if (chatter_risk_change === "significantly_increased") riskScore += 4;
    else if (chatter_risk_change === "increased") riskScore += 2;

    // Life impact
    if (tool_life_impact_pct < -50) riskScore += 2;
    else if (tool_life_impact_pct < -30) riskScore += 1;

    // Chip load
    if (Math.abs(chip_load_change_pct) > 50) riskScore += 2;
    else if (Math.abs(chip_load_change_pct) > 30) riskScore += 1;

    // Type mismatch
    if (original.type.toLowerCase() !== substitute.type.toLowerCase()) {
      riskScore += 2;
      warnings.push(
        `Tool type mismatch: ${original.type} -> ${substitute.type}`,
      );
    }

    let overall_risk: RiskLevel;
    if (riskScore >= 8) overall_risk = "critical";
    else if (riskScore >= 5) overall_risk = "high";
    else if (riskScore >= 2) overall_risk = "medium";
    else overall_risk = "low";

    const approval_recommended = overall_risk === "high" || overall_risk === "critical";

    if (warnings.length === 0) {
      warnings.push("Substitution appears safe with adjusted parameters");
    }

    return {
      overall_risk,
      risk_factors: {
        deflection_delta_mm,
        finish_impact_Ra_delta,
        chatter_risk_change,
        tool_life_impact_pct,
        chip_load_change_pct,
      },
      parameter_adjustments: {
        new_rpm,
        new_feed,
        new_depth,
      },
      warnings,
      approval_recommended,
    };
  }
}

/** Singleton instance */
export const toolSubstitutionRiskEngine = new ToolSubstitutionRiskEngine();
