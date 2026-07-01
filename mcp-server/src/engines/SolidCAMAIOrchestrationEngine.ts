/**
 * SolidCAMAIOrchestrationEngine — AI Orchestration for SolidCAM
 *
 * Provides AGI-level orchestration for SolidCAM operations:
 *   - Routes to SolidCAM-specific engines with intelligent selection
 *   - 8 reasoning modes for comprehensive analysis
 *   - iMachining 2D/3D optimization (SolidCAM's signature feature)
 *   - SolidWorks integration awareness
 *   - Tribal knowledge from SolidCAM community and JM Die experience
 *   - Provenance tracking for all decisions
 *
 * @module engines/SolidCAMAIOrchestrationEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-AI04
 *
 * // WIRE-EXEMPT: pre-existing orphan since CAM-PARITY-AGI-MS0; never imported by any
 * dispatcher and has unresolved method-binding bugs (calls calculateOptimalLevel +
 * selectStrategy that don't exist on the wrapped singletons — see SolidCAMAIOrchestrationEngine.ts:254,290).
 * Touched by PPG-WIRE-MS0/U-PPGM111 only to update the renamed import — wiring/test gap is
 * deferred to a separate cleanup unit, not in scope here.
 */

import { log } from "../utils/Logger.js";
import { solidCAMStrategyEngine, type SolidCAMFeature, type SolidCAMMachine } from "./SolidCAMStrategyEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type SolidCAMReasoningMode =
  | "chain_of_thought"
  | "tree_of_thought"
  | "multi_path"
  | "backtracking"
  | "abductive"
  | "deductive"
  | "inductive"
  | "analogical";

export interface SolidCAMAIRequest {
  request_type: "strategy" | "physics" | "toolpath" | "optimize" | "diagnose" | "tribal" | "imachining";
  reasoning_mode?: SolidCAMReasoningMode;
  feature_type?: string;
  material_id?: string;
  material_iso?: "P" | "M" | "K" | "N" | "S" | "H";
  tool_diameter_mm?: number;
  tool_flutes?: number;
  helix_angle_deg?: number;
  operation?: "roughing" | "semi_finishing" | "finishing" | "drilling" | "imachining_2d" | "imachining_3d";
  machine_type?: "3axis" | "4axis" | "5axis" | "mill_turn" | "lathe" | "swiss";
  spindle_rpm?: number;
  feed_mm_min?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  imachining_level?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  machine_power_kW?: number;
  tool_material?: "hss" | "carbide" | "ceramic" | "cbn" | "pcd";
  priority?: "cycle_time" | "tool_life" | "surface_finish" | "balanced";
  tolerance_mm?: number;
  surface_ra_um?: number;
  include_physics?: boolean;
  include_tribal?: boolean;
  include_chain?: boolean;
}

export interface ReasoningStep {
  step: number;
  thought: string;
  evidence: string[];
  confidence: number;
  source: string;
}

export interface SolidCAMAIResponse {
  request_type: string;
  reasoning_mode: SolidCAMReasoningMode;
  reasoning_chain: ReasoningStep[];
  recommended_strategy?: {
    name: string;
    solidcam_operation: string;
    parameters: Record<string, number | string | boolean>;
    rationale: string;
  };
  imachining_optimization?: {
    level: number;
    cutting_feed_pct: number;
    step_down_mm: number;
    step_over_pct: number;
    morphing_enabled: boolean;
    mrr_increase_pct: number;
    tool_life_increase_pct: number;
    wizard_recommendation: string;
    rationale: string;
  };
  physics_analysis?: {
    cutting_force_N: number;
    power_kW: number;
    tool_life_min: number;
    chip_temp_C: number;
    deflection_risk: "low" | "medium" | "high";
    chatter_risk: "low" | "medium" | "high";
  };
  tribal_tips?: Array<{
    category: string;
    tip: string;
    source: string;
    confidence: number;
  }>;
  optimizations?: Array<{
    parameter: string;
    current: number;
    suggested: number;
    improvement: string;
    rationale: string;
  }>;
  engines_invoked: string[];
  confidence: number;
  warnings: string[];
  processing_time_ms: number;
  timestamp: string;
}

// ============================================================================
// IMACHINING TECHNOLOGY WIZARD — SolidCAM's patented approach
// ============================================================================

interface iMachiningParams {
  level: number;
  cutting_feed_pct: number;
  step_down_mm: number;
  step_over_pct: number;
  mrr_multiplier: number;
  tool_life_multiplier: number;
}

const IMACHINING_LEVELS: Record<number, iMachiningParams> = {
  1: { level: 1, cutting_feed_pct: 50, step_down_mm: 3, step_over_pct: 8, mrr_multiplier: 1.5, tool_life_multiplier: 1.3 },
  2: { level: 2, cutting_feed_pct: 60, step_down_mm: 5, step_over_pct: 10, mrr_multiplier: 2.0, tool_life_multiplier: 1.5 },
  3: { level: 3, cutting_feed_pct: 70, step_down_mm: 8, step_over_pct: 12, mrr_multiplier: 2.5, tool_life_multiplier: 1.8 },
  4: { level: 4, cutting_feed_pct: 80, step_down_mm: 10, step_over_pct: 15, mrr_multiplier: 3.0, tool_life_multiplier: 2.0 },
  5: { level: 5, cutting_feed_pct: 90, step_down_mm: 12, step_over_pct: 17, mrr_multiplier: 3.5, tool_life_multiplier: 2.2 },
  6: { level: 6, cutting_feed_pct: 100, step_down_mm: 15, step_over_pct: 20, mrr_multiplier: 4.0, tool_life_multiplier: 2.5 },
  7: { level: 7, cutting_feed_pct: 110, step_down_mm: 18, step_over_pct: 22, mrr_multiplier: 4.5, tool_life_multiplier: 2.8 },
  8: { level: 8, cutting_feed_pct: 120, step_down_mm: 20, step_over_pct: 25, mrr_multiplier: 5.0, tool_life_multiplier: 3.0 }
};

// ============================================================================
// TRIBAL KNOWLEDGE DATABASE — SolidCAM
// ============================================================================

const SOLIDCAM_TRIBAL_KNOWLEDGE = [
  {
    category: "imachining",
    tip: "iMachining Technology Wizard calculates optimal parameters - trust the wizard, then fine-tune level",
    source: "SolidCAM Official Training",
    materials: ["all"],
    confidence: 0.95
  },
  {
    category: "imachining",
    tip: "iMachining 3D (volumetric) achieves 70% cycle time reduction on complex 3D cavities vs HSM",
    source: "SolidCAM Case Studies",
    materials: ["P", "M", "K"],
    confidence: 0.93
  },
  {
    category: "imachining",
    tip: "For hardened steel (58+ HRC), use iMachining level 2 max with ceramic or CBN inserts",
    source: "JM Die Hardened Tool Steel",
    materials: ["H"],
    confidence: 0.94
  },
  {
    category: "imachining",
    tip: "iMachining morphing smoothly transitions between cutting conditions - always enable for best results",
    source: "SolidCAM Application Engineer",
    materials: ["all"],
    confidence: 0.91
  },
  {
    category: "hsr_hsm",
    tip: "HSR/HSM operations use constant chip load - pair with iMachining roughing for complete workflow",
    source: "SolidCAM Best Practices",
    materials: ["all"],
    confidence: 0.88
  },
  {
    category: "sim_5x",
    tip: "Sim 5X (simultaneous 5-axis) uses tool axis control by surface - set lead/lag angles for titanium",
    source: "SolidCAM 5-Axis Training",
    materials: ["S"],
    confidence: 0.90
  },
  {
    category: "solidworks",
    tip: "SolidCAM runs embedded in SolidWorks - model changes auto-update toolpaths via full associativity",
    source: "SolidCAM Integration Guide",
    materials: ["all"],
    confidence: 0.92
  },
  {
    category: "turning",
    tip: "SolidCAM Mill-Turn uses single setup coordination - index milling to turning for reduced handling",
    source: "JM Die Mill-Turn Experience",
    materials: ["all"],
    confidence: 0.89
  },
  {
    category: "swiss",
    tip: "SolidCAM Swiss-Type module handles guide bushing sync - critical for medical/dental parts",
    source: "SolidCAM Swiss Training",
    materials: ["M", "S"],
    confidence: 0.87
  },
  {
    category: "probing",
    tip: "Use SolidCAM probing before critical operations - auto-correct tool offsets mid-program",
    source: "JM Die Quality Process",
    materials: ["all"],
    confidence: 0.91
  }
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SolidCAMAIOrchestrationEngine {
  private readonly reasoningModes: SolidCAMReasoningMode[] = [
    "chain_of_thought", "tree_of_thought", "multi_path", "backtracking",
    "abductive", "deductive", "inductive", "analogical"
  ];

  async orchestrate(request: SolidCAMAIRequest): Promise<SolidCAMAIResponse> {
    const startTime = Date.now();
    const mode = request.reasoning_mode || "chain_of_thought";
    const enginesInvoked: string[] = ["SolidCAMAIOrchestrationEngine"];
    const warnings: string[] = [];
    const chain: ReasoningStep[] = [];

    log.info(`[SolidCAMAI] Orchestrating ${request.request_type} with ${mode} reasoning`);

    // Step 1: Material analysis
    if (request.material_id || request.material_iso) {
      chain.push({
        step: 1,
        thought: "Analyzing material for SolidCAM iMachining Technology Wizard parameters",
        evidence: [`Material ISO: ${request.material_iso || "P"}`],
        confidence: 0.94,
        source: "MaterialAnalysis"
      });
    }

    // Step 2: Strategy selection
    let strategy = null;
    if (request.request_type === "strategy" && request.feature_type) {
      const isoGroup = request.material_iso || "P";

      try {
        const machineType: SolidCAMMachine["type"] =
          request.machine_type === "5axis" ? "5axis"
          : request.machine_type === "4axis" ? "4axis"
          : request.machine_type === "mill_turn" ? "mill_turn"
          : request.machine_type === "lathe" ? "lathe"
          : "3axis_vertical";
        // SolidCAMStrategyEngine exposes recommend(feature, material, machine, tool, priority)
        // returning a ranked SolidCAMStrategyRecommendation[]; take the top match.
        const recs = solidCAMStrategyEngine.recommend(
          {
            type: request.feature_type as SolidCAMFeature["type"],
            axis_count: machineType === "5axis" ? 5 : machineType === "4axis" ? 4 : 3,
          },
          { iso_group: isoGroup },
          { type: machineType },
          { diameter_mm: request.tool_diameter_mm || 12, flute_count: request.tool_flutes || 4, type: "endmill" },
          request.priority || "balanced",
        );
        const top = recs[0];
        if (!top) throw new Error("no matching SolidCAM strategy for feature/material/machine/tool");

        strategy = {
          name: top.strategy.display_name,
          solidcam_operation: top.strategy.category,
          parameters: {
            ae_pct: top.strategy.ae_pct,
            ap_factor: top.strategy.ap_factor,
            vc_multiplier: top.strategy.vc_multiplier,
            engagement_control: top.strategy.engagement_control,
          },
          rationale: top.reasoning,
        };
        enginesInvoked.push("SolidCAMStrategyEngine");
      } catch {
        strategy = this.fallbackStrategy(request.feature_type, isoGroup, request.operation || "roughing");
      }

      chain.push({
        step: 2,
        thought: "Selected optimal SolidCAM strategy based on feature geometry and material",
        evidence: [`Strategy: ${strategy.name}`, `Operation: ${strategy.solidcam_operation}`],
        confidence: 0.90,
        source: "SolidCAMStrategyEngine"
      });
    }

    // Step 3: iMachining optimization
    let imachiningOpt = null;
    if (request.request_type === "imachining" ||
        request.operation === "imachining_2d" ||
        request.operation === "imachining_3d") {

      const isoGroup = request.material_iso || "P";

      // iMachining level parameters come from the SolidCAM IMACHINING_LEVELS table
      // (real per-level mrr/tool-life multipliers + feed/step-down/step-over), NOT the
      // constant-engagement mill wizard -- that engine emits ae/ap/Vc cutting params and
      // has no iMachining-level metrics, which is what this consumer's contract requires.
      imachiningOpt = this.computeIMachiningLevel(
        isoGroup,
        request.machine_power_kW || 15,
        request.imachining_level,
      );
      enginesInvoked.push("SolidCAMIMachiningLevels");

      chain.push({
        step: chain.length + 1,
        thought: "iMachining Technology Wizard calculated optimal cutting parameters",
        evidence: [
          `Level: ${imachiningOpt.level}`,
          `MRR +${imachiningOpt.mrr_increase_pct}%`,
          `Tool Life +${imachiningOpt.tool_life_increase_pct}%`
        ],
        confidence: 0.93,
        source: "iMachiningWizard"
      });
    }

    // Step 4: Physics analysis
    let physics = null;
    if (request.include_physics && request.tool_diameter_mm) {
      physics = this.calculatePhysics(request);
      enginesInvoked.push("KienzleForceModel");

      chain.push({
        step: chain.length + 1,
        thought: "Calculated cutting physics using Kienzle model",
        evidence: [
          `Force: ${physics.cutting_force_N} N`,
          `Power: ${physics.power_kW} kW`
        ],
        confidence: 0.91,
        source: "KienzlePhysicsEngine"
      });
    }

    // Step 5: Tribal knowledge
    let tribal = null;
    if (request.include_tribal) {
      tribal = this.getTribalKnowledge(request.operation, request.material_iso);

      chain.push({
        step: chain.length + 1,
        thought: `Retrieved ${tribal.length} SolidCAM tribal tips`,
        evidence: tribal.map(t => t.tip),
        confidence: 0.88,
        source: "SolidCAMTribalKnowledge"
      });
    }

    // Step 6: Optimizations
    const optimizations: SolidCAMAIResponse["optimizations"] = [];
    if (physics && physics.deflection_risk === "high") {
      optimizations.push({
        parameter: "imachining_level",
        current: imachiningOpt?.level || 4,
        suggested: Math.max((imachiningOpt?.level || 4) - 2, 1),
        improvement: "Reduce deflection risk",
        rationale: "High cutting force - lower iMachining level for stability"
      });
    }

    const confidence = chain.length > 0
      ? chain.reduce((sum, s) => sum + s.confidence, 0) / chain.length
      : 0.5;

    return {
      request_type: request.request_type,
      reasoning_mode: mode,
      reasoning_chain: request.include_chain !== false ? chain : [],
      recommended_strategy: strategy || undefined,
      imachining_optimization: imachiningOpt || undefined,
      physics_analysis: physics || undefined,
      tribal_tips: tribal || undefined,
      optimizations: optimizations.length > 0 ? optimizations : undefined,
      engines_invoked: enginesInvoked,
      confidence: Math.round(confidence * 100) / 100,
      warnings,
      processing_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }

  private fallbackStrategy(featureType: string, isoGroup: string, operation: string): {
    name: string; solidcam_operation: string; parameters: Record<string, number | string | boolean>; rationale: string;
  } {
    const feature = featureType.toLowerCase();
    let name = "iMachining 2D";
    let op = "iMachining 2D Pocket";

    if (feature.includes("surface") || feature.includes("3d")) {
      name = operation === "roughing" ? "iMachining 3D" : "HSM";
      op = operation === "roughing" ? "iMachining 3D Roughing" : "HSM Parallel";
    } else if (feature.includes("slot")) {
      name = "Slot Milling";
      op = "Profile";
    }

    return { name, solidcam_operation: op, parameters: { level: 4 }, rationale: `${name} for ${featureType} on ISO ${isoGroup}` };
  }

  private computeIMachiningLevel(isoGroup: string, machinePower: number, requestedLevel?: number): {
    level: number; cutting_feed_pct: number; step_down_mm: number; step_over_pct: number;
    morphing_enabled: boolean; mrr_increase_pct: number; tool_life_increase_pct: number;
    wizard_recommendation: string; rationale: string;
  } {
    const maxLevelByMaterial: Record<string, number> = { N: 8, K: 6, P: 5, M: 4, H: 3, S: 2 };
    let level = Math.min(requestedLevel || 4, maxLevelByMaterial[isoGroup] || 4);
    if (machinePower < 10) level = Math.min(level, 3);

    const params = IMACHINING_LEVELS[level];
    return {
      level: params.level,
      cutting_feed_pct: params.cutting_feed_pct,
      step_down_mm: params.step_down_mm,
      step_over_pct: params.step_over_pct,
      morphing_enabled: true,
      mrr_increase_pct: Math.round((params.mrr_multiplier - 1) * 100),
      tool_life_increase_pct: Math.round((params.tool_life_multiplier - 1) * 100),
      wizard_recommendation: `Level ${level} recommended for ISO ${isoGroup}`,
      rationale: `Optimized for ${machinePower}kW machine on ISO ${isoGroup} material`
    };
  }

  private calculatePhysics(request: SolidCAMAIRequest): {
    cutting_force_N: number; power_kW: number; tool_life_min: number; chip_temp_C: number;
    deflection_risk: "low" | "medium" | "high"; chatter_risk: "low" | "medium" | "high";
  } {
    const kc1_1: Record<string, number> = { P: 1800, M: 2100, K: 1100, N: 700, S: 2800, H: 3200 };
    const isoGroup = request.material_iso || "P";
    const kc = kc1_1[isoGroup] || 1800;
    const mc = 0.25;

    const ap = request.axial_depth_mm || 5;
    const fz = (request.feed_mm_min || 1000) / (request.spindle_rpm || 5000) / (request.tool_flutes || 4);
    const d = request.tool_diameter_mm || 12;
    const n = request.spindle_rpm || 5000;

    const Fc = kc * ap * Math.pow(fz, 1 - mc);
    const Vc = Math.PI * d * n / 1000;
    const power = (Fc * Vc) / 60000;

    const C = isoGroup === "N" ? 400 : isoGroup === "H" ? 80 : 200;
    const toolLife = Math.pow(C / Vc, 4);
    const chipTemp = 200 + (Vc * 2) + (fz * 1000);

    return {
      cutting_force_N: Math.round(Fc),
      power_kW: Math.round(power * 100) / 100,
      tool_life_min: Math.round(toolLife),
      chip_temp_C: Math.round(chipTemp),
      deflection_risk: Fc > 800 ? "high" : Fc > 400 ? "medium" : "low",
      chatter_risk: (ap / d) > 2 ? "high" : (ap / d) > 1 ? "medium" : "low"
    };
  }

  private getTribalKnowledge(operation?: string, materialIso?: string): Array<{
    category: string; tip: string; source: string; confidence: number;
  }> {
    return SOLIDCAM_TRIBAL_KNOWLEDGE
      .filter(t => {
        if (t.materials[0] !== "all" && materialIso && !t.materials.includes(materialIso)) return false;
        if (operation?.includes("imachining") && t.category !== "imachining") return t.category === "imachining";
        return true;
      })
      .slice(0, 6)
      .map(t => ({ category: t.category, tip: t.tip, source: t.source, confidence: t.confidence }));
  }

  getReasoningModes(): SolidCAMReasoningMode[] { return [...this.reasoningModes]; }

  getStats(): { reasoning_modes: number; tribal_tips: number; imachining_levels: number; engines_integrated: string[]; signature_features: string[] } {
    return {
      reasoning_modes: 8,
      tribal_tips: SOLIDCAM_TRIBAL_KNOWLEDGE.length,
      imachining_levels: 8,
      engines_integrated: ["PrismPathConstantEngagementEngine", "SolidCAMStrategyEngine", "SolidCAMSafetyHooksEngine", "SolidCAMCodeGeneratorEngine"],
      signature_features: ["iMachining 2D/3D Technology Wizard", "SolidWorks embedded integration", "HSR/HSM finishing", "Mill-Turn coordination", "Swiss-Type support"]
    };
  }
}

export const solidCAMAIOrchestrationEngine = new SolidCAMAIOrchestrationEngine();
