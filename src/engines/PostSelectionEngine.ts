/**
 * PostSelectionEngine — Intelligent post-processor feature selection.
 *
 * Given a job context (machine profile, part geometry, material, CAM source),
 * decides WHICH post-processor features should be activated for optimal results.
 *
 * Addresses Gap 1: "Can generate 100+ post configs but cannot decide which is optimal."
 * Uses rule-based scoring + feature interaction validation to select the best feature set.
 */

export interface JobContext {
  machine: {
    controller: "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma";
    max_rpm: number;
    spindle_power_kw: number;
    axis_count: 3 | 4 | 5;
    has_tsc: boolean;       // through-spindle coolant
    has_probing: boolean;
    has_rigid_tapping: boolean;
    taper: "BT30" | "BT40" | "CAT40" | "CAT50" | "HSK-A63" | "HSK-A100" | "HSK-F63";
  };
  part: {
    complexity: "simple" | "moderate" | "complex" | "extreme";
    tolerance_mm: number;
    surface_finish_target_um: number;
    has_deep_pockets: boolean;
    has_thin_walls: boolean;
    has_tight_corners: boolean;
    max_depth_mm: number;
    estimated_cycle_time_min: number;
  };
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    hardness_hrc?: number;
    thermal_sensitivity: "low" | "medium" | "high";
  };
  cam_source: "hypermill" | "fusion360" | "mastercam" | "solidcam" | "siemens_nx" | "generic";
  operation_type: "roughing" | "finishing" | "semi_finishing" | "drilling" | "threading" | "probing";
  tool_count: number;
  production_volume: "prototype" | "low" | "medium" | "high";
}

export interface PostFeature {
  id: string;
  name: string;
  category: "hsm" | "safety" | "tool_management" | "measurement" | "coolant" | "multi_axis" | "feed_optimization" | "cam_specific";
  enabled: boolean;
  score: number; // 0-100 relevance for this job
  reason: string;
  gcode_impact: string; // what G-codes/M-codes it adds
  time_impact_pct: number; // estimated cycle time change (negative = faster)
  risk_level: "none" | "low" | "medium" | "high";
  interactions: string[]; // features it conflicts or synergizes with
}

export interface PostSelectionResult {
  selected_features: PostFeature[];
  rejected_features: PostFeature[];
  feature_interactions: Array<{
    features: [string, string];
    type: "synergy" | "conflict" | "redundant";
    resolution: string;
  }>;
  controller_config: {
    controller: string;
    safe_start_block: string;
    smoothing_mode: "off" | "rough" | "finish" | "ultra";
    five_axis_mode: "none" | "tcpm";
    decimal_places: number;
    line_numbers: boolean;
    canned_cycles: boolean;
  };
  estimated_improvement: {
    cycle_time_pct: number;
    surface_quality_pct: number;
    tool_life_pct: number;
    safety_score: number; // 0-100
  };
  confidence: number;
  rationale: string;
}

// ── Feature Database ──

interface FeatureDefinition {
  id: string;
  name: string;
  category: PostFeature["category"];
  controllers: string[];
  gcode_impact: string;
  base_time_impact_pct: number;
  risk_level: PostFeature["risk_level"];
  conditions: (ctx: JobContext) => { score: number; reason: string } | null;
  conflicts: string[];
  synergies: string[];
}

const FEATURE_DATABASE: FeatureDefinition[] = [
  // ── HSM Features ──
  {
    id: "hsm_smoothing",
    name: "High-Speed Machining Smoothing",
    category: "hsm",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma", "heidenhain"],
    gcode_impact: "G5.1/G187/CYCLE832/M120",
    base_time_impact_pct: -8,
    risk_level: "none",
    conflicts: [],
    synergies: ["corner_rounding", "nurbs_interpolation"],
    conditions: (ctx) => {
      if (ctx.operation_type === "drilling" || ctx.operation_type === "threading") return null;
      const score = ctx.part.complexity === "complex" || ctx.part.complexity === "extreme" ? 95 :
                    ctx.part.has_tight_corners ? 85 : 60;
      return { score, reason: `HSM smoothing reduces direction changes for ${ctx.part.complexity} geometry` };
    },
  },
  {
    id: "corner_rounding",
    name: "Corner Rounding Tolerance",
    category: "hsm",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma", "heidenhain"],
    gcode_impact: "G64/G05.1/G187 P2-P3",
    base_time_impact_pct: -5,
    risk_level: "low",
    conflicts: [],
    synergies: ["hsm_smoothing"],
    conditions: (ctx) => {
      if (ctx.part.tolerance_mm > 0.1) return null; // only for tight tolerance
      if (ctx.operation_type === "roughing") {
        return { score: 70, reason: "Corner rounding allows faster rapids in roughing" };
      }
      if (ctx.part.has_tight_corners) {
        return { score: 40, reason: "Corner rounding may violate tight corner requirements — use with caution" };
      }
      return { score: 60, reason: "Corner rounding improves feed consistency" };
    },
  },
  {
    id: "nurbs_interpolation",
    name: "NURBS/Spline Interpolation",
    category: "hsm",
    controllers: ["siemens", "heidenhain", "okuma"],
    gcode_impact: "BSPLINE/SPLINE/G06.2",
    base_time_impact_pct: -12,
    risk_level: "medium",
    conflicts: ["arc_fitting"],
    synergies: ["hsm_smoothing"],
    conditions: (ctx) => {
      if (!["siemens", "heidenhain", "okuma"].includes(ctx.machine.controller)) return null;
      if (ctx.part.complexity === "simple") return null;
      const score = ctx.part.complexity === "extreme" ? 90 : ctx.part.complexity === "complex" ? 75 : 50;
      return { score, reason: `NURBS reduces block count for ${ctx.part.complexity} freeform surfaces` };
    },
  },
  {
    id: "arc_fitting",
    name: "Arc Fitting (Linear to Arc)",
    category: "hsm",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma", "heidenhain"],
    gcode_impact: "Converts G1 sequences to G2/G3",
    base_time_impact_pct: -6,
    risk_level: "low",
    conflicts: ["nurbs_interpolation"],
    synergies: [],
    conditions: (ctx) => {
      if (ctx.part.complexity === "simple") return null;
      return { score: 65, reason: "Arc fitting reduces program size and improves surface finish on curved surfaces" };
    },
  },

  // ── Safety Features ──
  {
    id: "collision_check",
    name: "Collision Avoidance Mode",
    category: "safety",
    controllers: ["siemens", "heidenhain", "okuma"],
    gcode_impact: "DCM/CAS/G08",
    base_time_impact_pct: 2,
    risk_level: "none",
    conflicts: [],
    synergies: [],
    conditions: (ctx) => {
      if (ctx.machine.axis_count >= 5) return { score: 95, reason: "Critical for 5-axis to avoid holder collisions" };
      if (ctx.part.has_deep_pockets) return { score: 80, reason: "Deep pockets increase collision risk with holder/shank" };
      return { score: 50, reason: "General collision safety" };
    },
  },
  {
    id: "safe_retract",
    name: "Safe Z Retract Strategy",
    category: "safety",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma", "heidenhain"],
    gcode_impact: "G28/G53/SUPA",
    base_time_impact_pct: 0,
    risk_level: "none",
    conflicts: [],
    synergies: [],
    conditions: () => ({ score: 90, reason: "Always recommended for safe tool changes" }),
  },

  // ── Tool Management ──
  {
    id: "sister_tooling",
    name: "Sister Tool Management",
    category: "tool_management",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma"],
    gcode_impact: "T+100 offset assignment",
    base_time_impact_pct: 1,
    risk_level: "low",
    conflicts: [],
    synergies: ["tool_break_detect"],
    conditions: (ctx) => {
      if (ctx.production_volume === "prototype") return null;
      if (ctx.production_volume === "high") return { score: 95, reason: "Essential for high-volume — automatic tool swap when worn" };
      if (ctx.material.iso_group === "S" || ctx.material.iso_group === "H") {
        return { score: 85, reason: "Hard/exotic materials accelerate wear — sister tools prevent downtime" };
      }
      return { score: 60, reason: "Sister tooling improves uptime for medium production runs" };
    },
  },
  {
    id: "tool_break_detect",
    name: "Tool Breakage Detection",
    category: "tool_management",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma"],
    gcode_impact: "G65 P9833/M36/TOOLMON",
    base_time_impact_pct: 2,
    risk_level: "none",
    conflicts: [],
    synergies: ["sister_tooling"],
    conditions: (ctx) => {
      if (ctx.production_volume === "prototype") return null;
      if (ctx.tool_count > 10) return { score: 85, reason: "Many tools increase breakage probability" };
      if (ctx.material.iso_group === "S" || ctx.material.iso_group === "H") {
        return { score: 90, reason: "Exotic/hard materials have high tool breakage risk" };
      }
      return { score: 65, reason: "Tool break detection prevents scrap and machine damage" };
    },
  },

  // ── Measurement ──
  {
    id: "in_process_probing",
    name: "In-Process Measurement",
    category: "measurement",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma", "heidenhain"],
    gcode_impact: "G65 P9810-9832/CYCLE977",
    base_time_impact_pct: 5,
    risk_level: "none",
    conflicts: [],
    synergies: ["auto_compensation"],
    conditions: (ctx) => {
      if (!ctx.machine.has_probing) return null;
      if (ctx.part.tolerance_mm <= 0.02) return { score: 95, reason: "Tight tolerance (±0.02mm) requires in-process verification" };
      if (ctx.part.tolerance_mm <= 0.05) return { score: 75, reason: "Moderate tolerance benefits from probing critical features" };
      if (ctx.production_volume === "high") return { score: 70, reason: "SPC data collection for high-volume production" };
      return null;
    },
  },
  {
    id: "auto_compensation",
    name: "Automatic Offset Compensation",
    category: "measurement",
    controllers: ["fanuc", "haas", "siemens", "okuma"],
    gcode_impact: "G10 L2/G10 L11",
    base_time_impact_pct: 0,
    risk_level: "medium",
    conflicts: [],
    synergies: ["in_process_probing"],
    conditions: (ctx) => {
      if (!ctx.machine.has_probing) return null;
      if (ctx.part.tolerance_mm <= 0.02) return { score: 85, reason: "Auto-compensate for thermal drift on tight tolerance parts" };
      if (ctx.material.thermal_sensitivity === "high") return { score: 80, reason: "Thermal-sensitive material needs offset compensation" };
      return null;
    },
  },

  // ── Coolant ──
  {
    id: "through_spindle_coolant",
    name: "Through-Spindle Coolant (TSC)",
    category: "coolant",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma", "heidenhain"],
    gcode_impact: "M88/M51",
    base_time_impact_pct: 0,
    risk_level: "none",
    conflicts: [],
    synergies: [],
    conditions: (ctx) => {
      if (!ctx.machine.has_tsc) return null;
      if (ctx.part.has_deep_pockets && ctx.part.max_depth_mm > 30) {
        return { score: 95, reason: `Deep pocket (${ctx.part.max_depth_mm}mm) — TSC essential for chip evacuation` };
      }
      if (ctx.operation_type === "drilling") return { score: 90, reason: "TSC critical for deep hole drilling chip evacuation" };
      if (ctx.material.iso_group === "S" || ctx.material.iso_group === "H") {
        return { score: 85, reason: "Exotic/hard materials need directed coolant for thermal control" };
      }
      return { score: 50, reason: "TSC improves chip evacuation" };
    },
  },

  // ── Multi-Axis ──
  {
    id: "tcpm_mode",
    name: "Tool Center Point Management (TCPM/RTCP)",
    category: "multi_axis",
    controllers: ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"],
    gcode_impact: "G43.4/G234/TRAORI/FUNCTION TCPM",
    base_time_impact_pct: 0,
    risk_level: "medium",
    conflicts: [],
    synergies: ["collision_check"],
    conditions: (ctx) => {
      if (ctx.machine.axis_count < 5) return null;
      return { score: 98, reason: "TCPM is essential for 5-axis machining — maintains tool center during rotation" };
    },
  },
  {
    id: "singularity_avoidance",
    name: "5-Axis Singularity Avoidance",
    category: "multi_axis",
    controllers: ["siemens", "heidenhain"],
    gcode_impact: "ORIPATH/ORIVECT",
    base_time_impact_pct: 1,
    risk_level: "none",
    conflicts: [],
    synergies: ["tcpm_mode"],
    conditions: (ctx) => {
      if (ctx.machine.axis_count < 5) return null;
      if (!["siemens", "heidenhain"].includes(ctx.machine.controller)) return null;
      return { score: 80, reason: "Prevents axis reversal near gimbal lock positions" };
    },
  },

  // ── Feed Optimization ──
  {
    id: "chip_thinning_comp",
    name: "Chip Thinning Compensation",
    category: "feed_optimization",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma", "heidenhain"],
    gcode_impact: "Feed rate multiplier in program",
    base_time_impact_pct: -15,
    risk_level: "low",
    conflicts: [],
    synergies: ["adaptive_clearing"],
    conditions: (ctx) => {
      if (ctx.operation_type !== "roughing" && ctx.operation_type !== "semi_finishing") return null;
      return { score: 85, reason: "Chip thinning compensation increases feed where engagement is shallow — up to 15% cycle time reduction" };
    },
  },
  {
    id: "corner_deceleration",
    name: "Corner Feed Deceleration",
    category: "feed_optimization",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma", "heidenhain"],
    gcode_impact: "Feed override at direction changes",
    base_time_impact_pct: 3,
    risk_level: "none",
    conflicts: [],
    synergies: ["hsm_smoothing"],
    conditions: (ctx) => {
      if (ctx.part.has_tight_corners) return { score: 90, reason: "Prevents tool overload at sharp direction changes" };
      if (ctx.operation_type === "finishing") return { score: 70, reason: "Maintains surface quality at corners" };
      return { score: 40, reason: "General corner protection" };
    },
  },

  // ── CAM-Specific Features ──
  {
    id: "adaptive_clearing",
    name: "Adaptive Clearing Mode",
    category: "cam_specific",
    controllers: ["fanuc", "haas", "siemens", "mazak", "okuma", "heidenhain"],
    gcode_impact: "Helical ramp, constant engagement toolpath",
    base_time_impact_pct: -20,
    risk_level: "low",
    conflicts: [],
    synergies: ["chip_thinning_comp", "hsm_smoothing"],
    conditions: (ctx) => {
      if (ctx.operation_type !== "roughing") return null;
      if (ctx.cam_source === "solidcam") return { score: 95, reason: "SolidCAM iMachining optimized adaptive clearing — best-in-class" };
      if (ctx.cam_source === "fusion360" || ctx.cam_source === "mastercam") {
        return { score: 90, reason: `${ctx.cam_source} adaptive clearing with constant engagement` };
      }
      return { score: 75, reason: "Adaptive clearing reduces engagement spikes" };
    },
  },
  {
    id: "ssv_mode",
    name: "Spindle Speed Variation (SSV)",
    category: "cam_specific",
    controllers: ["haas", "okuma"],
    gcode_impact: "G96.1/M695-M696/SSV",
    base_time_impact_pct: 0,
    risk_level: "low",
    conflicts: [],
    synergies: [],
    conditions: (ctx) => {
      if (!["haas", "okuma"].includes(ctx.machine.controller)) return null;
      if (ctx.material.iso_group === "S" || ctx.material.iso_group === "H") {
        return { score: 85, reason: "SSV breaks up chatter harmonics in hard/exotic materials" };
      }
      if (ctx.part.has_thin_walls) return { score: 80, reason: "SSV reduces chatter on thin-wall features" };
      return { score: 50, reason: "SSV can reduce chatter in some conditions" };
    },
  },
];

// ── Feature Interaction Matrix ──

const INTERACTION_RULES: Array<{
  features: [string, string];
  type: "synergy" | "conflict" | "redundant";
  resolution: string;
}> = [
  { features: ["nurbs_interpolation", "arc_fitting"], type: "conflict", resolution: "Use NURBS when controller supports it; fall back to arc fitting otherwise" },
  { features: ["hsm_smoothing", "corner_rounding"], type: "synergy", resolution: "Both improve high-speed path following — enable together" },
  { features: ["hsm_smoothing", "nurbs_interpolation"], type: "synergy", resolution: "NURBS + smoothing gives best block processing performance" },
  { features: ["sister_tooling", "tool_break_detect"], type: "synergy", resolution: "Break detection triggers automatic sister tool swap" },
  { features: ["in_process_probing", "auto_compensation"], type: "synergy", resolution: "Probing feeds offset compensation — enable together for closed-loop" },
  { features: ["tcpm_mode", "collision_check"], type: "synergy", resolution: "TCPM + collision avoidance is essential for safe 5-axis operation" },
  { features: ["adaptive_clearing", "chip_thinning_comp"], type: "synergy", resolution: "Adaptive clearing benefits from chip thinning — combined 25%+ time savings" },
  { features: ["chip_thinning_comp", "corner_deceleration"], type: "synergy", resolution: "Chip thinning increases feed on straights; corner decel reduces at turns — balanced approach" },
];

// ── Engine ──

export class PostSelectionEngine {
  compute(ctx: JobContext): PostSelectionResult {
    const selected: PostFeature[] = [];
    const rejected: PostFeature[] = [];

    // Evaluate each feature against job context
    for (const def of FEATURE_DATABASE) {
      // Check controller support
      if (!def.controllers.includes(ctx.machine.controller)) {
        rejected.push(this.buildFeature(def, 0, false, `Not supported on ${ctx.machine.controller}`));
        continue;
      }

      // Evaluate conditions
      const evaluation = def.conditions(ctx);
      if (!evaluation) {
        rejected.push(this.buildFeature(def, 0, false, "Not applicable to this job context"));
        continue;
      }

      const feature = this.buildFeature(def, evaluation.score, evaluation.score >= 40, evaluation.reason);
      if (evaluation.score >= 40) {
        selected.push(feature);
      } else {
        rejected.push(feature);
      }
    }

    // Resolve interactions
    const interactions = this.resolveInteractions(selected);

    // Apply interaction resolutions (disable conflicting features)
    for (const interaction of interactions) {
      if (interaction.type === "conflict") {
        const [a, b] = interaction.features;
        const featureA = selected.find(f => f.id === a);
        const featureB = selected.find(f => f.id === b);
        if (featureA && featureB) {
          // Disable the lower-scored one
          if (featureA.score < featureB.score) {
            featureA.enabled = false;
            const idx = selected.indexOf(featureA);
            if (idx >= 0) { selected.splice(idx, 1); rejected.push(featureA); }
          } else {
            featureB.enabled = false;
            const idx = selected.indexOf(featureB);
            if (idx >= 0) { selected.splice(idx, 1); rejected.push(featureB); }
          }
        }
      }
    }

    // Sort by score
    selected.sort((a, b) => b.score - a.score);

    // Controller configuration
    const controllerConfig = this.buildControllerConfig(ctx, selected);

    // Estimate improvements
    const improvement = this.estimateImprovements(selected, ctx);

    // Confidence
    const avgScore = selected.length > 0 ? selected.reduce((s, f) => s + f.score, 0) / selected.length : 0;
    const confidence = Math.min(0.95, avgScore / 100);

    return {
      selected_features: selected,
      rejected_features: rejected,
      feature_interactions: interactions,
      controller_config: controllerConfig,
      estimated_improvement: improvement,
      confidence,
      rationale: this.buildRationale(ctx, selected, improvement),
    };
  }

  private buildFeature(def: FeatureDefinition, score: number, enabled: boolean, reason: string): PostFeature {
    return {
      id: def.id,
      name: def.name,
      category: def.category,
      enabled,
      score,
      reason,
      gcode_impact: def.gcode_impact,
      time_impact_pct: def.base_time_impact_pct,
      risk_level: def.risk_level,
      interactions: [...def.conflicts.map(c => `conflicts:${c}`), ...def.synergies.map(s => `synergy:${s}`)],
    };
  }

  private resolveInteractions(features: PostFeature[]) {
    const activeIds = new Set(features.map(f => f.id));
    return INTERACTION_RULES.filter(r =>
      activeIds.has(r.features[0]) && activeIds.has(r.features[1])
    );
  }

  private buildControllerConfig(ctx: JobContext, features: PostFeature[]): PostSelectionResult["controller_config"] {
    const hasHSM = features.some(f => f.id === "hsm_smoothing");
    const has5Axis = features.some(f => f.id === "tcpm_mode");

    const smoothing = ctx.operation_type === "finishing" && hasHSM ? "ultra" as const :
                      ctx.operation_type === "semi_finishing" && hasHSM ? "finish" as const :
                      hasHSM ? "rough" as const : "off" as const;

    const safeStartMap: Record<string, string> = {
      fanuc: "G90 G80 G40 G49 G17",
      haas: "G90 G80 G40 G49 G17",
      siemens: "G90 G40 G17 SUPA D0",
      heidenhain: "FN 0: Q0 = +0",
      mazak: "G90 G80 G40 G49 G17",
      okuma: "G90 G80 G40 G49 G17 G15 H0",
    };

    return {
      controller: ctx.machine.controller,
      safe_start_block: safeStartMap[ctx.machine.controller] || "G90 G80 G40 G49 G17",
      smoothing_mode: smoothing,
      five_axis_mode: has5Axis ? "tcpm" : "none",
      decimal_places: ctx.part.tolerance_mm <= 0.01 ? 4 : 3,
      line_numbers: true,
      canned_cycles: ctx.operation_type === "drilling" || ctx.operation_type === "threading",
    };
  }

  private estimateImprovements(features: PostFeature[], ctx: JobContext): PostSelectionResult["estimated_improvement"] {
    const timeImpact = features.reduce((sum, f) => sum + f.time_impact_pct, 0);
    const qualityImpact = features.filter(f =>
      f.category === "hsm" || f.category === "feed_optimization"
    ).length * 5;
    const toolLifeImpact = features.filter(f =>
      f.id === "chip_thinning_comp" || f.id === "adaptive_clearing" || f.id === "corner_deceleration"
    ).length * 8;
    const safetyScore = Math.min(100,
      50 + features.filter(f => f.category === "safety").length * 15 +
      features.filter(f => f.category === "measurement").length * 10 +
      features.filter(f => f.category === "tool_management").length * 10
    );

    return {
      cycle_time_pct: Math.round(timeImpact * 10) / 10,
      surface_quality_pct: Math.round(qualityImpact * 10) / 10,
      tool_life_pct: Math.round(toolLifeImpact * 10) / 10,
      safety_score: safetyScore,
    };
  }

  private buildRationale(ctx: JobContext, features: PostFeature[], improvement: PostSelectionResult["estimated_improvement"]): string {
    const parts = [
      `${ctx.machine.controller.toUpperCase()} ${ctx.machine.axis_count}-axis post for ${ctx.material.iso_group}-group material`,
      `${features.length} features selected (${features.filter(f => f.risk_level === "none").length} zero-risk)`,
      `Est. cycle time: ${improvement.cycle_time_pct > 0 ? "+" : ""}${improvement.cycle_time_pct}%`,
      `Safety score: ${improvement.safety_score}/100`,
    ];
    if (ctx.machine.axis_count >= 5) parts.push("5-axis TCPM enabled");
    if (features.some(f => f.id === "adaptive_clearing")) parts.push("Adaptive clearing active");
    return parts.join(" | ");
  }

  /** Get all available features for a controller */
  getAvailableFeatures(controller: string): string[] {
    return FEATURE_DATABASE
      .filter(f => f.controllers.includes(controller))
      .map(f => f.id);
  }
}

export const postSelectionEngine = new PostSelectionEngine();
