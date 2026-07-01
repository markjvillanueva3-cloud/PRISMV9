/**
 * TribalCorpusOrchestratorEngine — single-entry router for the 7-corpus septet
 *
 * iter44-iter51 shipped 7 process-specific tribal corpora (operator coaching,
 * sinker EDM, laser cutting, waterjet, grinding, welding, additive mfg). This
 * orchestrator is the entry point: given a process type (or auto-inferred from
 * machine + operation), dispatch to the right child corpus.
 *
 * Lighter-weight design than the children — pure routing logic, delegates all
 * tip-bank scoring to the child engines. Keeps the slot-soul rule intact (no
 * averaging across domains — pick the right corpus and call it).
 *
 * Routing table (process → corpus):
 *   sinker_edm → SinkerEDMTribalCorpusEngine
 *   laser_cut  → LaserCuttingTribalCorpusEngine
 *   waterjet   → WaterjetCuttingTribalCorpusEngine
 *   grinding   → GrindingTribalCorpusEngine
 *   welding    → WeldingTribalCorpusEngine
 *   additive   → AdditiveManufacturingTribalCorpusEngine
 *   *otherwise → OperatorCoachingTipsEngine (mill/lathe/wedm/drilling/tapping/etc)
 *
 * @version 1.0.0
 * @module TribalCorpusOrchestratorEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type ProcessCategory =
  | "operator_general"
  | "sinker_edm"
  | "laser_cut"
  | "waterjet"
  | "grinding"
  | "welding"
  | "additive";

export interface OrchestratorInput {
  /** Explicit process category (skips inference) */
  process_category?: ProcessCategory;
  /** Free-text machine type hint (used for inference) */
  machine_type_hint?: string;
  /** Free-text operation hint (used for inference) */
  operation_hint?: string;
  /** Free-form params forwarded to the selected child corpus */
  child_params: Record<string, unknown>;
  /** Max tips (forwarded to child) */
  top_n?: number;
  /** Min confidence (forwarded to child) */
  min_confidence?: number;
}

export interface OrchestratorResult {
  routed_to: ProcessCategory;
  routing_reason: string;
  child_result: unknown;  // shape varies by child
  routed_action_name: string;  // prism_safety action for the child
  warnings: string[];
  source: string;
}

const ROUTING_KEYWORDS: Array<{ category: ProcessCategory; pattern: RegExp; weight: number }> = [
  // Order matters — most specific first
  { category: "sinker_edm", pattern: /\bsinker[_-]?edm\b|\bedm[_-]?sinker\b|\bdie[_-]?sink\b/i, weight: 1.0 },
  { category: "laser_cut", pattern: /\blaser[_-]?(cut|weld)?\b|\bfiber[_-]?laser\b|\bco2[_-]?laser\b|\btrumpf\b|\bbystronic\b/i, weight: 1.0 },
  { category: "waterjet", pattern: /\bwaterjet\b|\bawj\b|\babrasive[_-]?water\b|\bomax\b|\bflow[_-]?mach\b/i, weight: 1.0 },
  { category: "grinding", pattern: /\bgrind|\bgrinder\b|\bcreep[_-]?feed\b|\bcenterless\b|\bstuder\b/i, weight: 1.0 },
  { category: "welding", pattern: /\bweld|\btig\b|\bmig\b|\bgmaw\b|\bgtaw\b|\bfcaw\b|\bsmaw\b|\bstick[_-]?weld\b/i, weight: 1.0 },
  { category: "additive", pattern: /\badditive\b|\b3d[_-]?print\b|\bfdm\b|\bsla\b|\bdmls\b|\bslm\b|\bsls\b|\bebm\b|\bbinder[_-]?jet\b|\bprusa\b|\bformlabs\b|\beos\b|\bstratasys\b/i, weight: 1.0 },
  // operator_general catches mill/lathe/wedm/drill/tap/thread/general machining (lowest priority — fallback)
  { category: "operator_general", pattern: /\b(mill|lathe|wedm|drill|tap|thread|turning|boring|parting|chatter|bue)\b/i, weight: 0.5 },
];

export class TribalCorpusOrchestratorEngine {
  async route(input: OrchestratorInput): Promise<OrchestratorResult> {
    if (!input || !input.child_params) {
      throw new Error("TribalCorpusOrchestratorEngine.route: child_params required");
    }

    let category: ProcessCategory;
    let reason: string;

    if (input.process_category) {
      category = input.process_category;
      reason = `explicit process_category="${input.process_category}"`;
    } else {
      const haystack = [input.machine_type_hint, input.operation_hint].filter(Boolean).join(" ");
      if (!haystack) {
        throw new Error("TribalCorpusOrchestratorEngine.route: provide process_category OR (machine_type_hint and/or operation_hint) for inference");
      }
      // Score each category by best regex match
      const scores = new Map<ProcessCategory, number>();
      for (const rule of ROUTING_KEYWORDS) {
        if (rule.pattern.test(haystack)) {
          const prev = scores.get(rule.category) ?? 0;
          if (rule.weight > prev) scores.set(rule.category, rule.weight);
        }
      }
      if (scores.size === 0) {
        category = "operator_general";
        reason = `no specific-process keyword matched in "${haystack}" — defaulting to operator_general (mill/lathe/wedm coaching)`;
      } else {
        // Pick highest-weight category (ties → first in ROUTING_KEYWORDS order, which is most-specific-first)
        let bestCat: ProcessCategory = "operator_general";
        let bestScore = -1;
        for (const rule of ROUTING_KEYWORDS) {
          const s = scores.get(rule.category);
          if (s !== undefined && s > bestScore) {
            bestScore = s;
            bestCat = rule.category;
          }
        }
        category = bestCat;
        reason = `keyword match in "${haystack}" → ${category} (score ${bestScore.toFixed(2)})`;
      }
    }

    const warnings: string[] = [];
    // Forward shared knobs to child_params if not already set
    if (input.top_n !== undefined && input.child_params.top_n === undefined) {
      input.child_params.top_n = input.top_n;
    }
    if (input.min_confidence !== undefined && input.child_params.min_confidence === undefined) {
      input.child_params.min_confidence = input.min_confidence;
    }

    // Dispatch
    let child_result: unknown;
    let routed_action: string;
    try {
      switch (category) {
        case "sinker_edm": {
          const { sinkerEDMTribalCorpusEngine } = await import("./SinkerEDMTribalCorpusEngine.js");
          child_result = sinkerEDMTribalCorpusEngine.surface(input.child_params as unknown as Parameters<typeof sinkerEDMTribalCorpusEngine.surface>[0]);
          routed_action = "sinker_edm_tribal_surface";
          break;
        }
        case "laser_cut": {
          const { laserCuttingTribalCorpusEngine } = await import("./LaserCuttingTribalCorpusEngine.js");
          child_result = laserCuttingTribalCorpusEngine.surface(input.child_params as unknown as Parameters<typeof laserCuttingTribalCorpusEngine.surface>[0]);
          routed_action = "laser_cutting_tribal_surface";
          break;
        }
        case "waterjet": {
          const { waterjetCuttingTribalCorpusEngine } = await import("./WaterjetCuttingTribalCorpusEngine.js");
          child_result = waterjetCuttingTribalCorpusEngine.surface(input.child_params as unknown as Parameters<typeof waterjetCuttingTribalCorpusEngine.surface>[0]);
          routed_action = "waterjet_cutting_tribal_surface";
          break;
        }
        case "grinding": {
          const { grindingTribalCorpusEngine } = await import("./GrindingTribalCorpusEngine.js");
          child_result = grindingTribalCorpusEngine.surface(input.child_params as unknown as Parameters<typeof grindingTribalCorpusEngine.surface>[0]);
          routed_action = "grinding_tribal_surface";
          break;
        }
        case "welding": {
          const { weldingTribalCorpusEngine } = await import("./WeldingTribalCorpusEngine.js");
          child_result = weldingTribalCorpusEngine.surface(input.child_params as unknown as Parameters<typeof weldingTribalCorpusEngine.surface>[0]);
          routed_action = "welding_tribal_surface";
          break;
        }
        case "additive": {
          const { additiveManufacturingTribalCorpusEngine } = await import("./AdditiveManufacturingTribalCorpusEngine.js");
          child_result = additiveManufacturingTribalCorpusEngine.surface(input.child_params as unknown as Parameters<typeof additiveManufacturingTribalCorpusEngine.surface>[0]);
          routed_action = "additive_mfg_tribal_surface";
          break;
        }
        case "operator_general":
        default: {
          const { operatorCoachingTipsEngine } = await import("./OperatorCoachingTipsEngine.js");
          child_result = operatorCoachingTipsEngine.coach(input.child_params as unknown as Parameters<typeof operatorCoachingTipsEngine.coach>[0]);
          routed_action = "operator_coaching_tips";
          break;
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`TribalCorpusOrchestratorEngine.route: child corpus "${category}" failed — ${errMsg}`);
    }

    return {
      routed_to: category,
      routing_reason: reason,
      child_result,
      routed_action_name: routed_action,
      warnings,
      source: `TribalCorpusOrchestratorEngine — routes to 7-corpus tribal septet (iter44-iter51 foxtrot deliverables): OperatorCoaching + SinkerEDM + LaserCutting + Waterjet + Grinding + Welding + AdditiveMfg`,
    };
  }
}

export const tribalCorpusOrchestratorEngine = new TribalCorpusOrchestratorEngine();
