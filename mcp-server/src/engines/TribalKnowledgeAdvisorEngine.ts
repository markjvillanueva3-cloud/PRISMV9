/**
 * TribalKnowledgeAdvisorEngine — Manufacturing Parameter Advisor
 * ================================================================
 * Advisory layer on top of TribalKnowledgeEngine that converts tribal
 * knowledge into actionable cutting parameter modifiers, constraints,
 * and warnings.
 *
 * Integrates with:
 *   - TribalKnowledgeEngine (3,700+ tips from 18 CAM systems)
 *   - SpeedFeedOrchestratorEngine (parameter calculations)
 *   - QuoteEstimatorEngine (cost/time adjustments)
 *   - ProactiveIntelligenceEngine (proactive suggestions)
 *
 * JM Die Shop Context:
 *   - Primary materials: D2, A2, S7, M2, H13 tool steels
 *   - Machines: 7 Okuma lathes, 5 mills, 2 EDMs
 *   - Typical work: cold heading dies, punches, inserts
 *
 * @module engines/TribalKnowledgeAdvisorEngine
 */

import { log } from "../utils/Logger.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";

// ============================================================================
// TYPES — Query Context
// ============================================================================

/** Context for tribal knowledge query */
export interface TribalQueryContext {
  /** Material name (e.g., "D2", "A2 tool steel") */
  material?: string;
  /** ISO material group (P, M, K, N, S, H) */
  iso_group?: string;
  /** Machine ID from shop config */
  machine_id?: string;
  /** Operation type (turning, milling, threading, etc.) */
  operation?: string;
  /** Tool type (carbide, HSS, CBN, ceramic, etc.) */
  tool_type?: string;
  /** Tool diameter in mm */
  tool_diameter_mm?: number;
  /** Additional search keywords */
  keywords?: string[];
  /** Customer name for customer-specific tips */
  customer?: string;
  /** Hardness value in HRC */
  hardness_hrc?: number;
  /** Surface finish target Ra in um */
  target_ra_um?: number;
}

// ============================================================================
// TYPES — Modifiers & Constraints
// ============================================================================

/** Cutting parameter modifiers derived from tribal knowledge */
export interface TribalModifiers {
  /** Cutting speed modifier (1.0 = no change, 0.7 = reduce 30%) */
  vc_modifier: number;
  /** Feed rate modifier */
  fz_modifier: number;
  /** Depth of cut modifier */
  ap_modifier: number;
  /** Tool life modifier (>1 = extended, <1 = reduced) */
  tool_life_modifier: number;
  /** Coolant recommendation */
  coolant_strategy?: "flood" | "mist" | "air_blast" | "mql" | "dry" | "high_pressure";
  /** Chip breaking recommendation */
  chip_break_strategy?: "peck" | "dwell" | "retract" | "standard";
  /** Notes explaining the modifiers */
  notes: string[];
  /** Tip IDs that contributed to these modifiers */
  tip_ids: string[];
  /** Overall confidence (0-1) */
  confidence: number;
}

/** Constraints on cutting parameters */
export interface TribalConstraints {
  /** Maximum cutting speed (m/min) */
  max_vc?: number;
  /** Maximum feed per tooth (mm) */
  max_fz?: number;
  /** Maximum depth of cut (mm) */
  max_ap?: number;
  /** Minimum coolant pressure (bar) */
  min_coolant_pressure?: number;
  /** Required tool coating */
  required_coating?: string;
  /** Forbidden operations */
  forbidden_operations?: string[];
  /** Constraint reasons */
  reasons: string[];
  /** Tip IDs */
  tip_ids: string[];
}

/** Advisory output with warnings and recommendations */
export interface TribalAdvisory {
  /** Critical warnings that should block operation */
  warnings: string[];
  /** Recommendations for better results */
  recommendations: string[];
  /** Machine-specific advice */
  machine_advice: string[];
  /** Material-specific advice */
  material_advice: string[];
  /** Operation-specific advice */
  operation_advice: string[];
  /** Tool-specific advice */
  tool_advice: string[];
  /** Tips that contributed */
  contributing_tips: Array<{ id: string; title: string; confidence: number }>;
}

// ============================================================================
// MATERIAL MODIFIER TABLES — JM Die Shop Experience
// ============================================================================

/** Material-specific modifiers based on JM Die experience */
const MATERIAL_MODIFIERS: Record<string, Partial<TribalModifiers>> = {
  // Tool Steels (JM Die primary materials)
  d2: { vc_modifier: 0.70, fz_modifier: 0.85, tool_life_modifier: 0.60, coolant_strategy: "flood" },
  a2: { vc_modifier: 0.75, fz_modifier: 0.90, tool_life_modifier: 0.70, coolant_strategy: "flood" },
  s7: { vc_modifier: 0.80, fz_modifier: 0.90, tool_life_modifier: 0.75, coolant_strategy: "flood" },
  m2: { vc_modifier: 0.65, fz_modifier: 0.80, tool_life_modifier: 0.55, coolant_strategy: "flood" },
  h13: { vc_modifier: 0.75, fz_modifier: 0.85, tool_life_modifier: 0.65, coolant_strategy: "flood" },
  // Carbides (EDM recommended)
  carbide: { vc_modifier: 0.30, fz_modifier: 0.50, tool_life_modifier: 0.20, coolant_strategy: "flood" },
  tungsten_carbide: { vc_modifier: 0.25, fz_modifier: 0.40, tool_life_modifier: 0.15, coolant_strategy: "flood" },
  // Stainless
  "304": { vc_modifier: 0.85, fz_modifier: 0.90, tool_life_modifier: 0.80, coolant_strategy: "high_pressure" },
  "316": { vc_modifier: 0.80, fz_modifier: 0.85, tool_life_modifier: 0.75, coolant_strategy: "high_pressure" },
  "17-4": { vc_modifier: 0.70, fz_modifier: 0.80, tool_life_modifier: 0.65, coolant_strategy: "high_pressure" },
  // Aluminum
  "6061": { vc_modifier: 1.50, fz_modifier: 1.30, tool_life_modifier: 2.00, coolant_strategy: "mist" },
  "7075": { vc_modifier: 1.40, fz_modifier: 1.20, tool_life_modifier: 1.80, coolant_strategy: "mist" },
};

/** Hardness adjustments (applied on top of material modifiers) */
const HARDNESS_ADJUSTMENTS: Array<{ min_hrc: number; max_hrc: number; vc_factor: number; life_factor: number }> = [
  { min_hrc: 0, max_hrc: 30, vc_factor: 1.0, life_factor: 1.0 },
  { min_hrc: 30, max_hrc: 40, vc_factor: 0.90, life_factor: 0.85 },
  { min_hrc: 40, max_hrc: 50, vc_factor: 0.75, life_factor: 0.70 },
  { min_hrc: 50, max_hrc: 58, vc_factor: 0.60, life_factor: 0.50 },
  { min_hrc: 58, max_hrc: 65, vc_factor: 0.45, life_factor: 0.35 },
  { min_hrc: 65, max_hrc: 72, vc_factor: 0.30, life_factor: 0.20 },
];

/** Operation-specific modifiers */
const OPERATION_MODIFIERS: Record<string, Partial<TribalModifiers>> = {
  roughing: { vc_modifier: 1.0, fz_modifier: 1.0, ap_modifier: 1.0 },
  finishing: { vc_modifier: 1.15, fz_modifier: 0.70, ap_modifier: 0.30 },
  threading: { vc_modifier: 0.50, fz_modifier: 1.0, ap_modifier: 1.0 },
  tapping: { vc_modifier: 0.40, fz_modifier: 1.0, chip_break_strategy: "peck" },
  drilling: { vc_modifier: 0.85, fz_modifier: 0.90, chip_break_strategy: "peck" },
  reaming: { vc_modifier: 0.50, fz_modifier: 0.60 },
  boring: { vc_modifier: 0.90, fz_modifier: 0.80 },
  grooving: { vc_modifier: 0.70, fz_modifier: 0.80 },
  parting: { vc_modifier: 0.60, fz_modifier: 0.70, coolant_strategy: "high_pressure" },
  thin_wall: { vc_modifier: 0.85, fz_modifier: 0.70, ap_modifier: 0.40 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TribalKnowledgeAdvisorEngine {
  /**
   * Get cutting parameter modifiers based on tribal knowledge context.
   * Used by SpeedFeedOrchestratorEngine for parameter adjustments.
   */
  getModifiers(context: TribalQueryContext): TribalModifiers {
    log.debug("TribalKnowledgeAdvisorEngine.getModifiers", { context });

    const notes: string[] = [];
    const tip_ids: string[] = [];

    // Start with neutral modifiers
    let vc_modifier = 1.0;
    let fz_modifier = 1.0;
    let ap_modifier = 1.0;
    let tool_life_modifier = 1.0;
    let coolant_strategy: TribalModifiers["coolant_strategy"];
    let chip_break_strategy: TribalModifiers["chip_break_strategy"];

    // 1. Apply material modifiers
    if (context.material) {
      const matKey = this._normalizeMaterial(context.material);
      const matMod = MATERIAL_MODIFIERS[matKey];
      if (matMod) {
        if (matMod.vc_modifier) {
          vc_modifier *= matMod.vc_modifier;
          notes.push(`Material ${context.material}: Vc × ${matMod.vc_modifier}`);
        }
        if (matMod.fz_modifier) fz_modifier *= matMod.fz_modifier;
        if (matMod.tool_life_modifier) tool_life_modifier *= matMod.tool_life_modifier;
        if (matMod.coolant_strategy) coolant_strategy = matMod.coolant_strategy;
        tip_ids.push(`mat-${matKey}`);
      }
    }

    // 2. Apply hardness adjustments
    if (context.hardness_hrc) {
      const adj = HARDNESS_ADJUSTMENTS.find(
        a => context.hardness_hrc! >= a.min_hrc && context.hardness_hrc! < a.max_hrc
      );
      if (adj && adj.vc_factor < 1.0) {
        vc_modifier *= adj.vc_factor;
        tool_life_modifier *= adj.life_factor;
        notes.push(`Hardness ${context.hardness_hrc} HRC: Vc × ${adj.vc_factor}`);
        tip_ids.push(`hrc-${context.hardness_hrc}`);
      }
    }

    // 3. Apply operation modifiers
    if (context.operation) {
      const opKey = context.operation.toLowerCase().replace(/[^a-z]/g, "_");
      const opMod = OPERATION_MODIFIERS[opKey];
      if (opMod) {
        if (opMod.vc_modifier) vc_modifier *= opMod.vc_modifier;
        if (opMod.fz_modifier) fz_modifier *= opMod.fz_modifier;
        if (opMod.ap_modifier) ap_modifier *= opMod.ap_modifier;
        if (opMod.coolant_strategy) coolant_strategy = opMod.coolant_strategy;
        if (opMod.chip_break_strategy) chip_break_strategy = opMod.chip_break_strategy;
        notes.push(`Operation ${context.operation}: modifiers applied`);
        tip_ids.push(`op-${opKey}`);
      }
    }

    // 4. Query TribalKnowledgeEngine for matching tips
    const tips = this._queryTribalKnowledge(context);
    for (const tip of tips.slice(0, 5)) {
      tip_ids.push(tip.id);
      // Extract modifiers from tip content
      const extracted = this._extractModifiersFromTip(tip);
      if (extracted.vc_factor) vc_modifier *= extracted.vc_factor;
      if (extracted.fz_factor) fz_modifier *= extracted.fz_factor;
      if (extracted.note) notes.push(extracted.note);
    }

    // Calculate confidence based on matching depth
    const confidence = Math.min(0.95, 0.5 + tip_ids.length * 0.08);

    return {
      vc_modifier: Math.round(vc_modifier * 100) / 100,
      fz_modifier: Math.round(fz_modifier * 100) / 100,
      ap_modifier: Math.round(ap_modifier * 100) / 100,
      tool_life_modifier: Math.round(tool_life_modifier * 100) / 100,
      coolant_strategy,
      chip_break_strategy,
      notes,
      tip_ids,
      confidence,
    };
  }

  /**
   * Get constraints on cutting parameters.
   * Returns hard limits that should not be exceeded.
   */
  getConstraints(context: TribalQueryContext): TribalConstraints {
    log.debug("TribalKnowledgeAdvisorEngine.getConstraints", { context });

    const reasons: string[] = [];
    const tip_ids: string[] = [];
    const constraints: TribalConstraints = { reasons, tip_ids };

    // Material-based constraints
    if (context.material) {
      const mat = context.material.toLowerCase();
      if (mat.includes("carbide") || mat.includes("tungsten")) {
        constraints.forbidden_operations = ["conventional_turning", "conventional_milling"];
        reasons.push("Carbide/WC: EDM or diamond tooling required");
        tip_ids.push("constraint-carbide");
      }
      if (mat.includes("d2") || mat.includes("m2")) {
        if (context.hardness_hrc && context.hardness_hrc > 58) {
          constraints.max_vc = 40; // m/min
          constraints.max_ap = 0.3; // mm
          constraints.required_coating = "CBN or ceramic";
          reasons.push(`Hardened ${context.material} (${context.hardness_hrc} HRC): CBN required, Vc < 40 m/min`);
          tip_ids.push("constraint-hardened-tool-steel");
        }
      }
    }

    // Operation-based constraints
    if (context.operation) {
      const op = context.operation.toLowerCase();
      if (op.includes("thread") && context.tool_diameter_mm && context.tool_diameter_mm < 3) {
        constraints.max_vc = 15;
        reasons.push("Small thread (<3mm): Vc < 15 m/min to prevent tap breakage");
        tip_ids.push("constraint-small-thread");
      }
      if (op.includes("parting") || op.includes("cutoff")) {
        constraints.min_coolant_pressure = 20; // bar
        reasons.push("Parting: high pressure coolant (>20 bar) required");
        tip_ids.push("constraint-parting-coolant");
      }
    }

    return constraints;
  }

  /**
   * Get advisory with warnings and recommendations.
   * Used by ProactiveIntelligenceEngine for suggestions.
   */
  getAdvisory(context: TribalQueryContext): TribalAdvisory {
    log.debug("TribalKnowledgeAdvisorEngine.getAdvisory", { context });

    const warnings: string[] = [];
    const recommendations: string[] = [];
    const machine_advice: string[] = [];
    const material_advice: string[] = [];
    const operation_advice: string[] = [];
    const tool_advice: string[] = [];
    const contributing_tips: TribalAdvisory["contributing_tips"] = [];

    // Query tribal knowledge for matching tips
    const tips = this._queryTribalKnowledge(context);

    for (const tip of tips.slice(0, 10)) {
      contributing_tips.push({ id: tip.id, title: tip.title, confidence: tip.confidence / 100 });

      // Categorize by tip category
      const cat = tip.category?.toLowerCase() || "";
      const body = tip.body?.toLowerCase() || "";

      if (body.includes("warning") || body.includes("caution") || body.includes("never") || body.includes("danger")) {
        warnings.push(`${tip.title}: ${tip.body.slice(0, 150)}`);
      } else if (cat.includes("machine") || cat.includes("controller")) {
        machine_advice.push(tip.body.slice(0, 200));
      } else if (cat.includes("material") || body.includes("steel") || body.includes("carbide")) {
        material_advice.push(tip.body.slice(0, 200));
      } else if (cat.includes("tooling") || cat.includes("tool")) {
        tool_advice.push(tip.body.slice(0, 200));
      } else {
        recommendations.push(tip.body.slice(0, 200));
      }
    }

    // Add context-specific warnings
    if (context.hardness_hrc && context.hardness_hrc > 55) {
      warnings.push(`High hardness (${context.hardness_hrc} HRC): Verify CBN/ceramic tooling, reduce speeds significantly`);
    }
    if (context.material?.toLowerCase().includes("carbide")) {
      warnings.push("Tungsten carbide: Use EDM or PCD/diamond tooling only. Conventional tools will fracture.");
    }

    // Add JM Die specific advice
    if (context.machine_id?.includes("okuma")) {
      machine_advice.push("Okuma: Use OSP macro variables for efficient programming. Check spindle warmup.");
    }

    return {
      warnings,
      recommendations,
      machine_advice,
      material_advice,
      operation_advice,
      tool_advice,
      contributing_tips,
    };
  }

  /**
   * Full query returning tips, modifiers, and advisory in one call.
   */
  query(context: TribalQueryContext): {
    tips: KnowledgeTip[];
    modifiers: TribalModifiers;
    constraints: TribalConstraints;
    advisory: TribalAdvisory;
  } {
    return {
      tips: this._queryTribalKnowledge(context),
      modifiers: this.getModifiers(context),
      constraints: this.getConstraints(context),
      advisory: this.getAdvisory(context),
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private _normalizeMaterial(material: string): string {
    const m = material.toLowerCase().trim();
    // Map common variations
    if (m.includes("d2") || m.includes("d-2")) return "d2";
    if (m.includes("a2") || m.includes("a-2")) return "a2";
    if (m.includes("s7") || m.includes("s-7")) return "s7";
    if (m.includes("m2") || m.includes("m-2")) return "m2";
    if (m.includes("h13") || m.includes("h-13")) return "h13";
    if (m.includes("tungsten") || m.includes("wc") || m.includes("carbide")) return "tungsten_carbide";
    if (m.includes("6061")) return "6061";
    if (m.includes("7075")) return "7075";
    if (m.includes("304")) return "304";
    if (m.includes("316")) return "316";
    if (m.includes("17-4") || m.includes("174")) return "17-4";
    return m.replace(/[^a-z0-9]/g, "");
  }

  private _queryTribalKnowledge(context: TribalQueryContext): KnowledgeTip[] {
    try {
      // Build search keywords from context
      const keywords: string[] = [];
      if (context.material) keywords.push(context.material);
      if (context.operation) keywords.push(context.operation);
      if (context.tool_type) keywords.push(context.tool_type);
      if (context.machine_id) keywords.push(context.machine_id);
      if (context.keywords) keywords.push(...context.keywords);

      if (keywords.length === 0) return [];

      // Query the main tribal knowledge engine
      const result = tribalKnowledgeEngine.search({
        query: keywords.join(" "),
        limit: 15,
        min_confidence: 50,
      });

      return result;
    } catch (err) {
      log.warn("TribalKnowledgeAdvisorEngine: Failed to query tribal knowledge", { error: err });
      return [];
    }
  }

  private _extractModifiersFromTip(tip: KnowledgeTip): { vc_factor?: number; fz_factor?: number; note?: string } {
    const body = tip.body.toLowerCase();
    const result: { vc_factor?: number; fz_factor?: number; note?: string } = {};

    // Look for percentage reductions/increases
    const reduceMatch = body.match(/reduce\s+(?:speed|vc|cutting speed)\s+(?:by\s+)?(\d+)%/);
    if (reduceMatch) {
      result.vc_factor = 1 - parseInt(reduceMatch[1], 10) / 100;
      result.note = `${tip.title}: reduce Vc ${reduceMatch[1]}%`;
    }

    const increaseMatch = body.match(/increase\s+(?:speed|vc|cutting speed)\s+(?:by\s+)?(\d+)%/);
    if (increaseMatch) {
      result.vc_factor = 1 + parseInt(increaseMatch[1], 10) / 100;
      result.note = `${tip.title}: increase Vc ${increaseMatch[1]}%`;
    }

    const feedReduceMatch = body.match(/reduce\s+(?:feed|fz|feedrate)\s+(?:by\s+)?(\d+)%/);
    if (feedReduceMatch) {
      result.fz_factor = 1 - parseInt(feedReduceMatch[1], 10) / 100;
    }

    return result;
  }
}

/** Singleton instance */
export const tribalKnowledgeAdvisorEngine = new TribalKnowledgeAdvisorEngine();
