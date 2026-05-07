/**
 * HardTurningCapstoneEngine — LATHE-PRO-MS5 capstone.
 *
 * Unifies hard-turning decision + grinding-replacement feasibility +
 * white-layer prediction + surface-integrity reasoning into a single
 * optimize() call. Delegates to canonical engines — no physics is
 * re-derived here.
 *
 * Pipeline:
 *   1. HardTurningDecisionEngine.decide() — CBN vs ceramic vs grind
 *   2. GrindingReplacementEngine.evaluate() — feasibility of replacing a
 *      current grinding process with hard turning (when baseline given)
 *   3. WhiteLayerDetectionEngine.predict() — thermal surface damage risk
 *      across the recommended tool + cutting conditions
 *   4. Compose a residual-stress / surface-integrity judgement: CBN with
 *      controlled wear gives compressive residual (desirable for fatigue);
 *      aggressive wear or dry cutting flips it to tensile.
 *
 * References:
 *   Klocke F. "Manufacturing Processes 1: Cutting" (2011) §5.3
 *   König W. "Hard Machining" (1996)
 *   Tönshoff H. "Cutting of Hardened Steel" CIRP Annals 2000
 *   ASM Handbook Vol.16 "Machining" — surface integrity chapter
 *   Loewen & Shaw ASME Trans (1954) — cutting temperature model
 *
 * Shipped source of truth — dispatcher action
 * `turning_grinding_replacement_analysis` (and narrower sub-actions)
 * delegate here.
 *
 * @module engines/HardTurningCapstoneEngine
 * @milestone LATHE-PRO-MS5
 */

import {
  hardTurningDecisionEngine,
  type HardTurningInput,
  type HardTurningDecisionResult,
  type DecisionChoice,
} from "./HardTurningDecisionEngine.js";
import {
  grindingReplacementEngine,
  type GrindingReplacementInput,
  type GrindingReplacementResult,
} from "./GrindingReplacementEngine.js";
import {
  whiteLayerDetectionEngine,
  type WhiteLayerInput,
  type WhiteLayerResult,
} from "./WhiteLayerDetectionEngine.js";

// ────────────────────────────────────────────────────────────────────────────
// Capstone input / output
// ────────────────────────────────────────────────────────────────────────────

export type ResidualStressRequirement =
  | "tensile_required"
  | "compressive_ok"
  | "any";

export interface HardTurningCapstoneInput {
  /** Decision-context inputs (copied into HardTurningDecisionEngine). */
  hardness_hrc: number;
  target_ra_um: number;
  target_tolerance_mm: number;
  feature: "od" | "bore" | "face" | "thread" | "groove";
  lot_size: number;
  diameter_mm: number;
  length_over_diameter?: number;
  shop_has_grinder?: boolean;
  cbn_cost_per_edge_usd?: number;
  grind_cost_per_part_usd?: number;
  setup_hours?: number;

  /** Optional baseline for grinding replacement analysis. */
  grinding_baseline?: {
    achieved_ra_um: number;
    achieved_tolerance_mm: number;
    stock_removal_mm: number;
    grind_cycle_sec: number;
    grind_cost_per_part_usd: number;
  };

  /** Surface-integrity inputs. */
  residual_stress_requirement?: ResidualStressRequirement;
  concentricity_mm?: number;
  turret_precision_mm?: number;
  wall_thickness_mm?: number;

  /** White-layer inputs (if omitted, derived from decision result). */
  cutting_speed_mmin?: number;     // default: per-material CBN Vc
  feed_per_rev_mm?: number;        // default: conservative 0.08
  depth_of_cut_mm?: number;        // default: 0.15
  tool_wear_VB_mm?: number;        // default: 0.1 mm
  coolant?: "flood" | "mist" | "air" | "dry" | "cryo";

  /** Force a specific tool material (override decision). */
  forced_tool_material?: "CBN" | "ceramic" | "carbide";
}

export interface ResidualStressJudgement {
  predicted_state: "compressive" | "tensile" | "mixed";
  meets_requirement: boolean;
  rationale: string[];
  vb_wear_ok: boolean;
  coolant_ok: boolean;
}

export interface HardTurningCapstoneResult {
  decision: HardTurningDecisionResult;
  grinding_replacement: GrindingReplacementResult | null;
  white_layer: WhiteLayerResult;
  residual_stress: ResidualStressJudgement;
  composite_safe: boolean;
  reasoning: string[];
  source: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Engine
// ────────────────────────────────────────────────────────────────────────────

class HardTurningCapstoneEngine {
  private validate(input: HardTurningCapstoneInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("HardTurningCapstoneEngine: input is required");
    }
    const num: Array<[string, number | undefined]> = [
      ["hardness_hrc", input.hardness_hrc],
      ["target_ra_um", input.target_ra_um],
      ["target_tolerance_mm", input.target_tolerance_mm],
      ["lot_size", input.lot_size],
      ["diameter_mm", input.diameter_mm],
    ];
    for (const [k, v] of num) {
      if (v === undefined || !Number.isFinite(v)) {
        throw new Error(`HardTurningCapstoneEngine: ${k} must be finite, got ${v}`);
      }
      if ((v as number) <= 0) {
        throw new Error(`HardTurningCapstoneEngine: ${k} must be positive, got ${v}`);
      }
    }
    if (input.hardness_hrc > 75) {
      throw new Error(`HardTurningCapstoneEngine: hardness_hrc ${input.hardness_hrc} > 75 is non-physical`);
    }
  }

  /** Map a decision choice to a WhiteLayerInput tool_material. */
  private decisionToToolMaterial(
    choice: DecisionChoice,
    forced?: "CBN" | "ceramic" | "carbide",
  ): "CBN" | "ceramic" | "carbide" {
    if (forced) return forced;
    switch (choice) {
      case "hard_turn_cbn":
        return "CBN";
      case "hard_turn_ceramic":
        return "ceramic";
      case "grind":
        // White-layer model still runs — use CBN as a "what would HT risk be" proxy.
        return "CBN";
      case "conventional_turn":
      default:
        return "carbide";
    }
  }

  /** Default Vc per tool material (m/min). Values chosen conservatively
   *  — higher Vc pushes white-layer risk out of compressive regime.
   *  CBN typical range is 80-150 m/min; stay in the middle. */
  private defaultVc(tool: "CBN" | "ceramic" | "carbide"): number {
    if (tool === "CBN") return 120;      // conservative hard-turning CBN
    if (tool === "ceramic") return 150;  // slightly higher for ceramic
    return 100;                          // carbide
  }

  /** Compose a residual-stress / surface-integrity verdict. */
  private judgeResidualStress(
    input: HardTurningCapstoneInput,
    wl: WhiteLayerResult,
    toolMaterial: "CBN" | "ceramic" | "carbide",
  ): ResidualStressJudgement {
    const rationale: string[] = [];
    // Baseline for CBN at controlled wear: compressive residual stress.
    // As wear (VB) rises past 0.15-0.20 mm or coolant drops, the surface
    // temperature rises and the compressive regime flips to tensile.
    const vb = input.tool_wear_VB_mm ?? 0.1;
    const coolant = input.coolant ?? "flood";

    const vbOk = vb <= 0.20;
    const coolantOk = coolant !== "dry";

    let predicted: "compressive" | "tensile" | "mixed";
    if (toolMaterial === "CBN" && vbOk && coolantOk && wl.risk_level !== "critical") {
      predicted = "compressive";
      rationale.push("CBN with VB ≤ 0.20 mm + coolant → compressive residual stress (fatigue-positive).");
    } else if (!vbOk || coolant === "dry") {
      predicted = "tensile";
      rationale.push(
        `VB=${vb} mm ${vbOk ? "OK" : "HIGH"}, coolant=${coolant} ${coolantOk ? "OK" : "DRY"} → residual stress flips tensile.`,
      );
    } else if (wl.risk_level === "critical" || wl.risk_level === "high") {
      predicted = "mixed";
      rationale.push(`White-layer risk ${wl.risk_level} — surface likely has localized tensile bands.`);
    } else {
      predicted = "compressive";
      rationale.push("Conservative conditions → compressive residual stress expected.");
    }

    const req = input.residual_stress_requirement ?? "any";
    let meets: boolean;
    if (req === "tensile_required") {
      meets = predicted === "tensile";
      if (!meets) {
        rationale.push("Tensile required but predicted compressive/mixed — grind or shot-peen reversal needed.");
      }
    } else if (req === "compressive_ok") {
      meets = predicted !== "tensile";
      if (!meets) {
        rationale.push("Compressive required but predicted tensile — reduce VB limit, restore flood coolant.");
      }
    } else {
      meets = true;
    }

    return {
      predicted_state: predicted,
      meets_requirement: meets,
      rationale,
      vb_wear_ok: vbOk,
      coolant_ok: coolantOk,
    };
  }

  optimize(input: HardTurningCapstoneInput): HardTurningCapstoneResult {
    this.validate(input);

    // Stage 1 — decide hard turning vs grind vs conventional.
    const decisionInput: HardTurningInput = {
      hardness_hrc: input.hardness_hrc,
      target_ra_um: input.target_ra_um,
      target_tolerance_mm: input.target_tolerance_mm,
      feature: input.feature,
      lot_size: input.lot_size,
      diameter_mm: input.diameter_mm,
      length_over_diameter: input.length_over_diameter,
      shop_has_grinder: input.shop_has_grinder,
      cbn_cost_per_edge_usd: input.cbn_cost_per_edge_usd,
      grind_cost_per_part_usd: input.grind_cost_per_part_usd,
      setup_hours: input.setup_hours,
    };
    const decision = hardTurningDecisionEngine.decide(decisionInput);

    // Stage 2 — grinding replacement (optional).
    let grindingReplacement: GrindingReplacementResult | null = null;
    if (input.grinding_baseline) {
      const grInput: GrindingReplacementInput = {
        baseline: input.grinding_baseline,
        hardness_hrc: input.hardness_hrc,
        length_over_diameter: input.length_over_diameter ?? 3,
        diameter_mm: input.diameter_mm,
        wall_thickness_mm: input.wall_thickness_mm,
        lot_size: input.lot_size,
        residual_stress_requirement: input.residual_stress_requirement,
        concentricity_mm: input.concentricity_mm,
        turret_precision_mm: input.turret_precision_mm,
      };
      grindingReplacement = grindingReplacementEngine.evaluate(grInput);
    }

    // Stage 3 — white-layer prediction.
    const toolMaterial = this.decisionToToolMaterial(
      decision.recommendation,
      input.forced_tool_material,
    );
    const wlInput: WhiteLayerInput = {
      cutting_speed_mmin: input.cutting_speed_mmin ?? this.defaultVc(toolMaterial),
      feed_per_rev_mm: input.feed_per_rev_mm ?? 0.08,
      depth_of_cut_mm: input.depth_of_cut_mm ?? 0.15,
      workpiece_hardness_HRC: input.hardness_hrc,
      tool_wear_VB_mm: input.tool_wear_VB_mm ?? 0.1,
      tool_material: toolMaterial,
      coolant: input.coolant ?? "flood",
      operation: "hard_turning",
    };
    const whiteLayer = whiteLayerDetectionEngine.predict(wlInput);

    // Stage 4 — residual stress judgement.
    const residualStress = this.judgeResidualStress(input, whiteLayer, toolMaterial);

    // Composite safety.
    const compositeSafe =
      whiteLayer.safe_to_proceed &&
      residualStress.meets_requirement &&
      (grindingReplacement ? grindingReplacement.feasibility !== "blocked" : true);

    // Reasoning trace.
    const reasoning: string[] = [];
    reasoning.push(
      `Decision: ${decision.recommendation} (confidence ${decision.confidence.toFixed(2)}) — ${decision.tool_material}.`,
    );
    if (grindingReplacement) {
      reasoning.push(
        `Grind replacement: ${grindingReplacement.feasibility} (confidence ${grindingReplacement.confidence.toFixed(2)}) — ${grindingReplacement.recommended_tool_material}.`,
      );
    }
    reasoning.push(
      `White-layer risk: ${whiteLayer.risk_level} (${whiteLayer.probability_pct.toFixed(0)}%) @ surface ${whiteLayer.surface_temp_C.toFixed(0)}°C vs threshold ${whiteLayer.threshold_temp_C}°C.`,
    );
    reasoning.push(
      `Residual stress: ${residualStress.predicted_state} → ${residualStress.meets_requirement ? "meets" : "FAILS"} requirement "${input.residual_stress_requirement ?? "any"}".`,
    );
    for (const r of residualStress.rationale) reasoning.push(`  • ${r}`);
    reasoning.push(
      `Composite safety: ${compositeSafe ? "SAFE" : "BLOCKED"}.`,
    );

    return {
      decision,
      grinding_replacement: grindingReplacement,
      white_layer: whiteLayer,
      residual_stress: residualStress,
      composite_safe: compositeSafe,
      reasoning,
      source:
        "HardTurningCapstoneEngine.optimize (decision + grind-replacement + white-layer + residual-stress composite)",
    };
  }
}

export const hardTurningCapstoneEngine = new HardTurningCapstoneEngine();
export { HardTurningCapstoneEngine };
