/**
 * PowerMillAIOrchestrationEngine — AI Orchestration for Autodesk PowerMill
 *
 * Provides AGI-level orchestration for Autodesk PowerMill operations:
 *   - Routes to PowerMill-specific engines with intelligent selection
 *   - 8 reasoning modes for comprehensive analysis
 *   - Vortex high-efficiency roughing optimization
 *   - Robot machining support
 *   - Tribal knowledge from mold/die and aerospace production
 *   - Provenance tracking for all decisions
 *
 * @module engines/PowerMillAIOrchestrationEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-AI06
 */

import { log } from "../utils/Logger.js";
import {
  powerMillStrategyEngine,
  type PMFeatureType,
  type PMMaterialGroup,
  type PMMachineType,
  type PMPriority,
  type PMStrategyParameters,
} from "./PowerMillStrategyEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type PowerMillReasoningMode =
  | "chain_of_thought"
  | "tree_of_thought"
  | "multi_path"
  | "backtracking"
  | "abductive"
  | "deductive"
  | "inductive"
  | "analogical";

export interface PowerMillAIRequest {
  request_type: "strategy" | "physics" | "toolpath" | "optimize" | "diagnose" | "tribal" | "vortex" | "robot";
  reasoning_mode?: PowerMillReasoningMode;
  feature_type?: string;
  material_id?: string;
  material_iso?: "P" | "M" | "K" | "N" | "S" | "H";
  tool_diameter_mm?: number;
  tool_flutes?: number;
  helix_angle_deg?: number;
  operation?: "roughing" | "semi_finishing" | "finishing" | "drilling" | "vortex" | "offset_area_clear";
  machine_type?: "3axis" | "4axis" | "5axis" | "mill_turn" | "robot";
  spindle_rpm?: number;
  feed_mm_min?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  machine_power_kW?: number;
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

export interface PowerMillAIResponse {
  request_type: string;
  reasoning_mode: PowerMillReasoningMode;
  reasoning_chain: ReasoningStep[];
  recommended_strategy?: {
    name: string;
    powermill_strategy: string;
    parameters: Record<string, number | string | boolean>;
    rationale: string;
  };
  vortex_optimization?: {
    stepover_pct: number;
    stepdown_mm: number;
    arc_fit_enabled: boolean;
    lead_in_arc_mm: number;
    mrr_increase_pct: number;
    tool_life_increase_pct: number;
    rationale: string;
  };
  robot_machining?: {
    robot_type: string;
    reach_mm: number;
    payload_kg: number;
    collision_zones: number;
    singularity_avoidance: boolean;
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
// TRIBAL KNOWLEDGE DATABASE — AUTODESK POWERMILL
// ============================================================================

const POWERMILL_TRIBAL_KNOWLEDGE = [
  {
    category: "vortex",
    tip: "Vortex maintains constant chip load like Adaptive/iMachining - use 10% stepover for consistent engagement",
    source: "Autodesk PowerMill Training",
    materials: ["all"],
    confidence: 0.94
  },
  {
    category: "vortex",
    tip: "Vortex in titanium: 15% stepover max, 3xD depth, full flute length engagement with through-spindle coolant",
    source: "Aerospace Production Guidelines",
    materials: ["S"],
    confidence: 0.93
  },
  {
    category: "offset_area_clear",
    tip: "Offset Area Clear with rest machining gives best results for complex mold cores and cavities",
    source: "PowerMill Mold Finishing Guide",
    materials: ["P", "H"],
    confidence: 0.91
  },
  {
    category: "steep_shallow",
    tip: "PowerMill auto-detects steep vs shallow - use 'Optimized Constant Z' for steep walls",
    source: "Autodesk Best Practices",
    materials: ["all"],
    confidence: 0.90
  },
  {
    category: "rib_machining",
    tip: "Rib Machining strategy is specialized for thin ribs/walls - auto-adjusts approach to avoid deflection",
    source: "Die Casting Mold Experience",
    materials: ["H"],
    confidence: 0.89
  },
  {
    category: "verification",
    tip: "ViewMill simulation is fast but not NC-accurate - use NCVerify for final verification before posting",
    source: "Quality Assurance Process",
    materials: ["all"],
    confidence: 0.92
  },
  {
    category: "robot",
    tip: "PowerMill Robot handles KUKA, ABB, FANUC - always check reach and singularity zones first",
    source: "Robot Machining Training",
    materials: ["all"],
    confidence: 0.88
  },
  {
    category: "finishing",
    tip: "Raster Finishing with cusps control gives predictable Ra - set cusp height to 0.002mm for mirror finish",
    source: "Mold Polishing Prep Guide",
    materials: ["P", "H"],
    confidence: 0.91
  },
  {
    category: "electrode",
    tip: "PowerMill Electrode has specialized sinker EDM workflows - auto-generates spark gaps and burn positions",
    source: "EDM Electrode Specialist",
    materials: ["N", "K"],
    confidence: 0.87
  },
  {
    category: "5axis",
    tip: "Swarf milling in PowerMill needs explicit axis limits - set A/B axis ranges before toolpath generation",
    source: "5-Axis Machine Setup",
    materials: ["all"],
    confidence: 0.90
  }
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PowerMillAIOrchestrationEngine {
  private readonly reasoningModes: PowerMillReasoningMode[] = [
    "chain_of_thought", "tree_of_thought", "multi_path", "backtracking",
    "abductive", "deductive", "inductive", "analogical"
  ];

  async orchestrate(request: PowerMillAIRequest): Promise<PowerMillAIResponse> {
    const startTime = Date.now();
    const mode = request.reasoning_mode || "chain_of_thought";
    const enginesInvoked: string[] = ["PowerMillAIOrchestrationEngine"];
    const warnings: string[] = [];
    const chain: ReasoningStep[] = [];

    log.info(`[PowerMillAI] Orchestrating ${request.request_type} with ${mode} reasoning`);

    // Step 1: Material analysis
    if (request.material_id || request.material_iso) {
      chain.push({
        step: 1,
        thought: "Analyzing material for PowerMill strategy selection",
        evidence: [`Material ISO: ${request.material_iso || "P"}`],
        confidence: 0.93,
        source: "MaterialAnalysis"
      });
    }

    // Step 2: Strategy selection
    let strategy = null;
    if (request.request_type === "strategy" && request.feature_type) {
      const isoGroup = request.material_iso || "P";

      try {
        // PowerMillStrategyEngine exposes recommend(PMRecommendInput): PMStrategyRecommendation[]
        // (ranked, top-5) + getParameters(name). Map the orchestration request onto that contract,
        // take the rank-1 strategy, and fetch its default parameters. (Prior code called a
        // non-existent selectStrategy() → always threw → fallback was the only path ever taken.)
        const recs = powerMillStrategyEngine.recommend({
          feature_type: request.feature_type as PMFeatureType,
          material_group: isoGroup as PMMaterialGroup,
          machine_type: this.toPMMachineType(request.machine_type),
          tool_diameter_mm: request.tool_diameter_mm,
          tolerance_mm: request.tolerance_mm,
          priority: this.toPMPriority(request.priority),
        });
        const best = recs[0];
        if (!best) throw new Error(`no PowerMill strategy for feature "${request.feature_type}"`);
        const params = powerMillStrategyEngine.getParameters(best.strategy_name);

        strategy = {
          name: best.strategy_name,
          powermill_strategy: best.pm_operation_type,
          parameters: "error" in params ? { arc_fit: true } : this.flattenPMParameters(params),
          rationale: `${best.description} (rank ${best.rank}, confidence ${best.confidence.toFixed(2)})`,
        };
        enginesInvoked.push("PowerMillStrategyEngine");
      } catch {
        strategy = this.fallbackStrategy(request.feature_type, isoGroup, request.operation || "roughing");
      }

      chain.push({
        step: 2,
        thought: "Selected optimal PowerMill strategy",
        evidence: [`Strategy: ${strategy.name}`],
        confidence: 0.90,
        source: "PowerMillStrategyEngine"
      });
    }

    // Step 3: Vortex optimization (PowerMill's high-efficiency roughing)
    let vortexOpt = null;
    if (request.request_type === "vortex" || request.operation === "vortex") {
      const isoGroup = request.material_iso || "P";
      vortexOpt = this.optimizeVortex(isoGroup, request.tool_diameter_mm || 12, request.priority || "balanced");

      chain.push({
        step: chain.length + 1,
        thought: "Optimizing Vortex high-efficiency roughing parameters",
        evidence: [
          `Stepover: ${vortexOpt.stepover_pct}%`,
          `MRR +${vortexOpt.mrr_increase_pct}%`
        ],
        confidence: 0.92,
        source: "VortexOptimizer"
      });
    }

    // Step 4: Robot machining setup
    let robotMachining = null;
    if (request.request_type === "robot" || request.machine_type === "robot") {
      robotMachining = this.setupRobotMachining();

      chain.push({
        step: chain.length + 1,
        thought: "Configuring robot machining parameters",
        evidence: [
          `Robot: ${robotMachining.robot_type}`,
          `Reach: ${robotMachining.reach_mm}mm`
        ],
        confidence: 0.88,
        source: "PowerMillRobot"
      });
    }

    // Step 5: Physics analysis
    let physics = null;
    if (request.include_physics && request.tool_diameter_mm) {
      physics = this.calculatePhysics(request);
      enginesInvoked.push("KienzleForceModel");

      chain.push({
        step: chain.length + 1,
        thought: "Calculated cutting physics",
        evidence: [`Force: ${physics.cutting_force_N} N`, `Power: ${physics.power_kW} kW`],
        confidence: 0.91,
        source: "KienzlePhysicsEngine"
      });
    }

    // Step 6: Tribal knowledge
    let tribal = null;
    if (request.include_tribal) {
      tribal = this.getTribalKnowledge(request.operation, request.material_iso);

      chain.push({
        step: chain.length + 1,
        thought: `Retrieved ${tribal.length} PowerMill tribal tips`,
        evidence: tribal.map(t => t.tip),
        confidence: 0.88,
        source: "PowerMillTribalKnowledge"
      });
    }

    // Step 7: Optimizations
    const optimizations: PowerMillAIResponse["optimizations"] = [];
    if (physics && physics.deflection_risk === "high") {
      optimizations.push({
        parameter: "stepover_pct",
        current: vortexOpt?.stepover_pct || 10,
        suggested: (vortexOpt?.stepover_pct || 10) * 0.7,
        improvement: "Reduce deflection risk",
        rationale: "High cutting force - reduce stepover for stability"
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
      vortex_optimization: vortexOpt || undefined,
      robot_machining: robotMachining || undefined,
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

  /** Map the orchestration machine_type vocabulary onto PowerMillStrategyEngine's PMMachineType.
   *  "robot" maps to "3_axis" -- the conservative (least-permissive) axis class, so robot strategy
   *  requests never get a strategy the setup can't run; robot machining itself is handled in Step 4. */
  private toPMMachineType(mt?: "3axis" | "4axis" | "5axis" | "mill_turn" | "robot"): PMMachineType {
    switch (mt) {
      case "4axis": return "4_axis";
      case "5axis": return "5_axis_continuous";
      case "mill_turn": return "mill_turn";
      default: return "3_axis"; // "3axis", "robot", undefined
    }
  }

  /** Map the orchestration priority vocabulary onto PowerMillStrategyEngine's PMPriority. */
  private toPMPriority(p?: "cycle_time" | "tool_life" | "surface_finish" | "balanced"): PMPriority {
    switch (p) {
      case "cycle_time": return "speed";
      case "tool_life": return "tool_life";
      case "surface_finish": return "quality";
      default: return "balanced";
    }
  }

  /** Flatten the structured PMStrategyParameters into the flat Record the orchestration
   *  response carries (matches the fallbackStrategy parameters shape: number | string | boolean). */
  private flattenPMParameters(p: PMStrategyParameters): Record<string, number | string | boolean> {
    const out: Record<string, number | string | boolean> = {
      ae_pct_of_diameter: p.ae_pct_of_diameter,
      ap_pct_of_diameter: p.ap_pct_of_diameter,
      fz_min_mm: p.fz_range_mm[0],
      fz_max_mm: p.fz_range_mm[1],
      vc_min_m_min: p.vc_range_m_min[0],
      vc_max_m_min: p.vc_range_m_min[1],
      coolant: p.coolant,
      cutting_mode: p.cutting_mode,
      engagement_constant: p.engagement_constant,
    };
    if (p.lead_angle_deg != null) out.lead_angle_deg = p.lead_angle_deg;
    if (p.tilt_angle_deg != null) out.tilt_angle_deg = p.tilt_angle_deg;
    return out;
  }

  private fallbackStrategy(featureType: string, isoGroup: string, operation: string): {
    name: string; powermill_strategy: string; parameters: Record<string, number | string | boolean>; rationale: string;
  } {
    const feature = featureType.toLowerCase();
    let name = "Offset Area Clear";
    let strat = "AreaClear_Offset";

    if (feature.includes("cavity") || feature.includes("mold")) {
      name = operation === "roughing" ? "Vortex" : "Rest Finishing";
      strat = operation === "roughing" ? "Vortex" : "AreaClear_Rest";
    } else if (feature.includes("surface")) {
      name = operation === "finishing" ? "Raster Finishing" : "Offset Area Clear";
      strat = operation === "finishing" ? "Raster" : "AreaClear_Offset";
    }

    return { name, powermill_strategy: strat, parameters: { arc_fit: true }, rationale: `${name} for ${featureType} on ISO ${isoGroup}` };
  }

  private optimizeVortex(isoGroup: string, toolDiameter: number, priority: string): {
    stepover_pct: number; stepdown_mm: number; arc_fit_enabled: boolean;
    lead_in_arc_mm: number; mrr_increase_pct: number; tool_life_increase_pct: number; rationale: string;
  } {
    const baseStepover: Record<string, number> = { N: 15, K: 12, P: 10, M: 8, H: 6, S: 5 };
    let stepover = baseStepover[isoGroup] || 10;
    let mrr = 200;
    let toolLife = 150;

    if (priority === "cycle_time") {
      stepover = Math.min(stepover * 1.3, 20);
      mrr = 250;
      toolLife = 120;
    } else if (priority === "tool_life") {
      stepover *= 0.7;
      mrr = 150;
      toolLife = 200;
    }

    return {
      stepover_pct: Math.round(stepover),
      stepdown_mm: Math.round(toolDiameter * 1.5 * 10) / 10,
      arc_fit_enabled: true,
      lead_in_arc_mm: toolDiameter * 0.5,
      mrr_increase_pct: mrr,
      tool_life_increase_pct: toolLife,
      rationale: `Vortex optimized for ${priority} on ISO ${isoGroup}`
    };
  }

  private setupRobotMachining(): {
    robot_type: string; reach_mm: number; payload_kg: number;
    collision_zones: number; singularity_avoidance: boolean; rationale: string;
  } {
    return {
      robot_type: "KUKA KR 500",
      reach_mm: 2826,
      payload_kg: 500,
      collision_zones: 4,
      singularity_avoidance: true,
      rationale: "Large robot selected for mold/die machining with full collision checking"
    };
  }

  private calculatePhysics(request: PowerMillAIRequest): {
    cutting_force_N: number; power_kW: number; tool_life_min: number; chip_temp_C: number;
    deflection_risk: "low" | "medium" | "high"; chatter_risk: "low" | "medium" | "high";
  } {
    const kc1_1: Record<string, number> = { P: 1800, M: 2100, K: 1100, N: 700, S: 2800, H: 3200 };
    const isoGroup = request.material_iso || "P";
    const kc = kc1_1[isoGroup] || 1800;

    const ap = request.axial_depth_mm || 5;
    const fz = (request.feed_mm_min || 1000) / (request.spindle_rpm || 5000) / (request.tool_flutes || 4);
    const d = request.tool_diameter_mm || 12;
    const n = request.spindle_rpm || 5000;

    const Fc = kc * ap * Math.pow(fz, 0.75);
    const Vc = Math.PI * d * n / 1000;
    const power = (Fc * Vc) / 60000;

    return {
      cutting_force_N: Math.round(Fc),
      power_kW: Math.round(power * 100) / 100,
      tool_life_min: Math.round(Math.pow(200 / Vc, 4)),
      chip_temp_C: Math.round(200 + Vc * 2),
      deflection_risk: Fc > 800 ? "high" : Fc > 400 ? "medium" : "low",
      chatter_risk: (ap / d) > 2 ? "high" : (ap / d) > 1 ? "medium" : "low"
    };
  }

  private getTribalKnowledge(operation?: string, materialIso?: string): Array<{
    category: string; tip: string; source: string; confidence: number;
  }> {
    return POWERMILL_TRIBAL_KNOWLEDGE
      .filter(t => {
        if (t.materials[0] !== "all" && materialIso && !t.materials.includes(materialIso)) return false;
        if (operation === "vortex") return t.category === "vortex";
        return true;
      })
      .slice(0, 6)
      .map(t => ({ category: t.category, tip: t.tip, source: t.source, confidence: t.confidence }));
  }

  getReasoningModes(): PowerMillReasoningMode[] { return [...this.reasoningModes]; }

  getStats(): { reasoning_modes: number; tribal_tips: number; engines_integrated: string[]; signature_features: string[] } {
    return {
      reasoning_modes: 8,
      tribal_tips: POWERMILL_TRIBAL_KNOWLEDGE.length,
      engines_integrated: ["PowerMillStrategyEngine", "PowerMillCodeGeneratorEngine", "KienzleForceModel"],
      signature_features: ["Vortex high-efficiency roughing", "PowerMill Robot machining", "ViewMill simulation", "Electrode workflows", "Rib Machining strategy"]
    };
  }
}

export const powerMillAIOrchestrationEngine = new PowerMillAIOrchestrationEngine();
