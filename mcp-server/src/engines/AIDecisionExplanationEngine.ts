/**
 * AIDecisionExplanationEngine — P0-CRITICAL Gap Fix
 * =================================================
 * Generates human-readable explanations for AI parameter decisions.
 * Addresses scrutiny finding: "AI chooses parameters but doesn't explain WHY"
 *
 * Key Features:
 *   - Parameter-level explanations with reasoning bullets
 *   - Alternative value analysis with rejection reasons
 *   - Tribal knowledge attribution
 *   - Confidence scoring with source tracking
 *   - Risk factor identification
 *   - Multiple verbosity levels (brief/normal/detailed)
 *   - Operation-type-specific explanation templates
 *
 * Integration Points:
 *   - ApprovalWorkflowEngine (for AI code approval gates)
 *   - TribalKnowledgeEngine (for tip attribution)
 *   - DecisionReasoningEngine (for multi-criteria decisions)
 *   - ReasoningExplainerEngine (for chain visualization)
 *
 * @module engines/AIDecisionExplanationEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Verbosity level for explanations */
export type VerbosityLevel = "brief" | "normal" | "detailed";

/** Operation type for template selection */
export type OperationType =
  | "roughing"
  | "finishing"
  | "drilling"
  | "threading"
  | "tapping"
  | "boring"
  | "reaming"
  | "facing"
  | "turning"
  | "grooving"
  | "parting"
  | "profiling"
  | "pocketing"
  | "contouring"
  | "chamfering"
  | "wire_edm"
  | "sinker_edm"
  | "grinding"
  | "general";

/** Source type for attribution */
export type SourceType =
  | "tribal_tip"        // Shop floor tribal knowledge
  | "oem_recommendation" // Tool manufacturer recommendation
  | "physics_formula"   // Physics-based calculation (Kienzle, Taylor, etc.)
  | "neural_inference"  // AI/ML model inference
  | "historical_data"   // Historical shop data
  | "industry_standard" // ISO, ANSI, etc.
  | "machine_limit"     // Machine capability constraint
  | "material_property" // Material database value
  | "user_override"     // User-specified value
  | "playbook_rule";    // Production playbook rule

/** Alternative value with rejection reason */
export interface AlternativeValue {
  value: number | string;
  unit?: string;
  whyNotChosen: string;
  wouldCause?: string[];  // Negative outcomes if chosen
}

/** Source used in decision */
export interface DecisionSource {
  type: SourceType;
  id?: string;            // Source ID (tip ID, formula name, etc.)
  description: string;    // Human-readable description
  confidence: number;     // 0-1 confidence in this source
  reference?: string;     // Citation or reference
}

/** Individual parameter explanation */
export interface ParameterExplanation {
  parameter: string;           // e.g., "feed_rate", "spindle_speed"
  displayName: string;         // e.g., "Feed Rate", "Spindle Speed"
  chosenValue: number | string;
  unit: string;
  reasoning: string[];         // Bullet points explaining why
  alternatives: AlternativeValue[];
  confidenceLevel: number;     // 0-1
  sourcesUsed: DecisionSource[];
  riskFactors?: string[];      // Warnings if applicable
  constraintsApplied?: string[]; // Constraints that shaped this value
}

/** Key tradeoff made in decision */
export interface Tradeoff {
  description: string;
  prioritized: string;
  sacrificed: string;
  impact: string;
}

/** Complete decision explanation */
export interface DecisionExplanation {
  operationId: string;
  operationType: OperationType;
  operationName?: string;      // Human-readable operation name
  timestamp: string;
  parameters: ParameterExplanation[];
  overallConfidence: number;
  keyTradeoffs: Tradeoff[];
  suggestedReview: boolean;    // true if human should double-check
  reviewReasons?: string[];    // Why review is suggested
  summary: string;             // Overall summary for operators
  detailedNarrative?: string;  // Full narrative (detailed mode only)
  verbosityLevel: VerbosityLevel;
}

/** Input for generating parameter explanation */
export interface ParameterDecisionInput {
  parameter: string;
  displayName?: string;
  chosenValue: number | string;
  unit: string;
  context: ParameterContext;
  sources?: DecisionSource[];
  alternatives?: Array<{
    value: number | string;
    reason?: string;
  }>;
  constraints?: string[];
  risks?: string[];
}

/** Context for parameter decision */
export interface ParameterContext {
  material?: string;
  materialHardness?: number;
  toolDiameter?: number;
  toolMaterial?: string;
  toolCoating?: string;
  machineId?: string;
  machineName?: string;
  spindlePowerKw?: number;
  maxRpm?: number;
  operation?: OperationType;
  targetSurfaceFinish?: number;
  tolerance?: number;
  depthOfCut?: number;
  widthOfCut?: number;
  coolantType?: string;
  [key: string]: unknown;
}

/** Input for generating full decision explanation */
export interface DecisionExplanationInput {
  operationId: string;
  operationType: OperationType;
  operationName?: string;
  parameters: ParameterDecisionInput[];
  verbosity?: VerbosityLevel;
  includeTribalKnowledge?: boolean;
  targetAudience?: "operator" | "engineer" | "manager";
}

/** Explanation template for operation types */
interface OperationTemplate {
  primaryParameters: string[];
  secondaryParameters: string[];
  criticalTradeoffs: string[];
  typicalRisks: string[];
  explanationPatterns: Record<string, string>;
}

// ============================================================================
// OPERATION TEMPLATES
// ============================================================================

const OPERATION_TEMPLATES: Record<OperationType, OperationTemplate> = {
  roughing: {
    primaryParameters: ["depth_of_cut", "width_of_cut", "feed_rate", "spindle_speed"],
    secondaryParameters: ["stepover", "stepdown", "lead_in_angle"],
    criticalTradeoffs: [
      "Material removal rate vs tool life",
      "Aggressive cutting vs machine stability",
      "Speed vs heat generation",
    ],
    typicalRisks: [
      "Tool breakage from excessive load",
      "Chatter from aggressive engagement",
      "Thermal damage to workpiece",
    ],
    explanationPatterns: {
      depth_of_cut: "Depth of cut set to {value} {unit} to maximize material removal while staying within {constraint}",
      width_of_cut: "Width of cut at {value} {unit} balances radial engagement with tool deflection limits",
      feed_rate: "Feed rate of {value} {unit} calculated from chip load target of {chipLoad} for {material}",
      spindle_speed: "Spindle speed {value} {unit} based on cutting velocity {Vc} m/min for {toolMaterial} in {material}",
    },
  },
  finishing: {
    primaryParameters: ["spindle_speed", "feed_rate", "stepover", "depth_of_cut"],
    secondaryParameters: ["lead_in_angle", "smoothing_tolerance"],
    criticalTradeoffs: [
      "Surface finish quality vs cycle time",
      "Step-over size vs cusp height",
      "Feed rate vs surface texture",
    ],
    typicalRisks: [
      "Surface marks from incorrect feed/speed ratio",
      "Dimensional errors from tool deflection",
      "Poor finish from worn tool",
    ],
    explanationPatterns: {
      spindle_speed: "Spindle speed {value} {unit} optimized for surface finish target of Ra {targetRa}",
      feed_rate: "Feed rate {value} {unit} calculated to achieve {surfaceFinish} surface finish",
      stepover: "Stepover {value} {unit} results in theoretical cusp height of {cuspHeight}",
      depth_of_cut: "Light finishing pass at {value} {unit} to minimize deflection",
    },
  },
  drilling: {
    primaryParameters: ["spindle_speed", "feed_rate", "peck_depth", "retract_height"],
    secondaryParameters: ["dwell_time", "breakthrough_feed"],
    criticalTradeoffs: [
      "Peck depth vs cycle time",
      "Chip evacuation vs cutting efficiency",
      "Through-hole vs blind-hole strategy",
    ],
    typicalRisks: [
      "Chip packing causing drill breakage",
      "Hole oversize from excessive feed",
      "Poor hole finish from dull drill",
    ],
    explanationPatterns: {
      peck_depth: "Peck depth {value} {unit} at {ratio}x drill diameter for reliable chip evacuation in {material}",
      retract_height: "Retract to {value} {unit} ensures full chip clearance",
      feed_rate: "Feed rate {value} {unit} based on {feedPerRev} per revolution for {drillType} in {material}",
      spindle_speed: "Spindle speed {value} {unit} for cutting velocity of {Vc} m/min recommended for {drillMaterial}",
    },
  },
  threading: {
    primaryParameters: ["spindle_speed", "pitch", "infeed_method", "number_of_passes"],
    secondaryParameters: ["thread_depth", "lead_in_distance", "spring_passes"],
    criticalTradeoffs: [
      "Number of passes vs cycle time",
      "Infeed angle vs thread quality",
      "Spring passes vs productivity",
    ],
    typicalRisks: [
      "Thread damage from incorrect pitch",
      "Poor thread finish from wrong infeed",
      "Dimensional error from insufficient passes",
    ],
    explanationPatterns: {
      pitch: "Thread pitch verified at {value} {unit} - matches drawing specification",
      infeed_method: "Using {value} infeed for optimal chip flow and thread quality in {material}",
      number_of_passes: "{value} passes distributes cutting load for {threadType} thread in {material}",
      spindle_speed: "Spindle speed {value} {unit} safe for threading with {toolType} insert",
    },
  },
  tapping: {
    primaryParameters: ["spindle_speed", "pitch", "synchronization"],
    secondaryParameters: ["peck_depth", "coolant_through"],
    criticalTradeoffs: [
      "Speed vs tap life",
      "Rigid vs floating holder",
      "Through-coolant vs flood",
    ],
    typicalRisks: [
      "Tap breakage from overspeeding",
      "Thread damage from sync error",
      "Chip clogging in blind holes",
    ],
    explanationPatterns: {
      spindle_speed: "Tapping speed {value} {unit} conservative for {tapType} tap in {material}",
      pitch: "Pitch {value} {unit} synchronized for rigid tapping",
      synchronization: "Rigid tapping with {value}% feed/speed sync for accurate threads",
    },
  },
  boring: {
    primaryParameters: ["spindle_speed", "feed_rate", "depth_of_cut", "bar_extension"],
    secondaryParameters: ["dampening", "orientation"],
    criticalTradeoffs: [
      "Bar extension vs stability",
      "Feed rate vs surface finish",
      "Depth of cut vs deflection",
    ],
    typicalRisks: [
      "Chatter from excessive overhang",
      "Taper from bar deflection",
      "Poor finish from vibration",
    ],
    explanationPatterns: {
      bar_extension: "Boring bar at {value}x diameter overhang, within stable range for {barType}",
      feed_rate: "Feed {value} {unit} reduced for boring bar stability at L/D={ldRatio}",
      depth_of_cut: "DOC {value} {unit} limited by bar rigidity at {overhang} extension",
      spindle_speed: "Speed {value} {unit} adjusted for optimal surface finish in bore",
    },
  },
  reaming: {
    primaryParameters: ["spindle_speed", "feed_rate", "stock_allowance"],
    secondaryParameters: ["retract_feed", "dwell"],
    criticalTradeoffs: [
      "Stock allowance vs hole quality",
      "Speed vs hole size control",
      "Feed vs surface finish",
    ],
    typicalRisks: [
      "Oversize hole from excessive stock",
      "Bell-mouth from misalignment",
      "Chatter marks from wrong speed",
    ],
    explanationPatterns: {
      stock_allowance: "Leaving {value} {unit} stock for reamer - optimal for {reamType} reamer",
      feed_rate: "Reaming feed {value} {unit} at {feedPerRev} per rev for tight tolerance",
      spindle_speed: "Reaming speed {value} {unit} conservative to maintain size accuracy",
    },
  },
  facing: {
    primaryParameters: ["spindle_speed", "feed_rate", "depth_of_cut"],
    secondaryParameters: ["approach_angle", "surface_speed_mode"],
    criticalTradeoffs: [
      "CSS vs fixed RPM near center",
      "Feed direction vs surface quality",
      "Single vs multiple passes",
    ],
    typicalRisks: [
      "Nib at center from wrong approach",
      "Surface marks from interrupted cut",
      "Chatter from light engagement",
    ],
    explanationPatterns: {
      spindle_speed: "Using CSS at {value} {unit} for consistent surface finish across face",
      feed_rate: "Face feed {value} {unit} for target surface finish Ra {targetRa}",
      depth_of_cut: "Facing DOC {value} {unit} removes stock in {passes} pass(es)",
    },
  },
  turning: {
    primaryParameters: ["spindle_speed", "feed_rate", "depth_of_cut"],
    secondaryParameters: ["nose_radius_comp", "approach_angle"],
    criticalTradeoffs: [
      "DOC vs number of passes",
      "Feed vs surface finish",
      "Speed vs tool life",
    ],
    typicalRisks: [
      "Tool breakage from excessive DOC",
      "Poor finish from wrong feed/radius",
      "Thermal damage at high speed",
    ],
    explanationPatterns: {
      depth_of_cut: "Turning DOC {value} {unit} at {engagement}% tool engagement",
      feed_rate: "Feed {value} {unit} for Ra {targetRa} with {noseRadius} nose radius",
      spindle_speed: "Turning speed {value} {unit} for {Vc} m/min cutting velocity",
    },
  },
  grooving: {
    primaryParameters: ["spindle_speed", "feed_rate", "groove_depth", "plunge_rate"],
    secondaryParameters: ["peck_depth", "dwell"],
    criticalTradeoffs: [
      "Plunge depth vs chip control",
      "Feed vs insert strength",
      "Coolant vs chip evacuation",
    ],
    typicalRisks: [
      "Insert breakage from chip jamming",
      "Poor finish from built-up edge",
      "Dimensional error from deflection",
    ],
    explanationPatterns: {
      plunge_rate: "Grooving plunge at {value} {unit} for clean chip breaking",
      groove_depth: "Groove depth {value} {unit} with {pecks} peck cycles for chip control",
      feed_rate: "Axial feed {value} {unit} for groove width accuracy",
    },
  },
  parting: {
    primaryParameters: ["spindle_speed", "feed_rate", "blade_width"],
    secondaryParameters: ["peck_depth", "retract", "coolant"],
    criticalTradeoffs: [
      "Feed vs blade life",
      "Speed vs surface finish",
      "Coolant delivery vs chip evacuation",
    ],
    typicalRisks: [
      "Blade breakage at breakthrough",
      "Part ejection danger",
      "Witness mark from blade deflection",
    ],
    explanationPatterns: {
      feed_rate: "Parting feed {value} {unit} reduced for {bladeWidth} blade width",
      spindle_speed: "Parting speed {value} {unit} maintained constant through cut",
      blade_width: "Using {value} {unit} blade - narrowest for part support",
    },
  },
  profiling: {
    primaryParameters: ["spindle_speed", "feed_rate", "stepdown", "engagement"],
    secondaryParameters: ["lead_angle", "smoothing"],
    criticalTradeoffs: [
      "Engagement angle vs chip thickness",
      "Stepdown vs tool deflection",
      "Feed vs contour accuracy",
    ],
    typicalRisks: [
      "Corner gouging from wrong approach",
      "Chatter in thin walls",
      "Dimensional error from deflection",
    ],
    explanationPatterns: {
      engagement: "Profile engagement {value}% maintains consistent chip load",
      stepdown: "Stepdown {value} {unit} for wall support ratio of {ratio}",
      feed_rate: "Profiling feed {value} {unit} with {lookahead} corner deceleration",
    },
  },
  pocketing: {
    primaryParameters: ["spindle_speed", "feed_rate", "stepover", "stepdown"],
    secondaryParameters: ["ramp_angle", "helix_diameter", "entry_method"],
    criticalTradeoffs: [
      "Stepover vs cycle time",
      "Entry method vs corner stress",
      "Depth per pass vs rigidity",
    ],
    typicalRisks: [
      "Tool breakage in plunge",
      "Chatter in deep pockets",
      "Uncut material in corners",
    ],
    explanationPatterns: {
      stepover: "Pocket stepover {value}% ({abs_value} {unit}) for smooth floor",
      stepdown: "Z stepdown {value} {unit} safe for {toolDia} cutter in {material}",
      entry_method: "Using {value} entry to avoid plunge stress on {toolType}",
    },
  },
  contouring: {
    primaryParameters: ["spindle_speed", "feed_rate", "tolerance", "smoothing"],
    secondaryParameters: ["cusp_height", "boundary_offset"],
    criticalTradeoffs: [
      "Tolerance vs cycle time",
      "Smoothing vs accuracy",
      "Lead/lag vs surface quality",
    ],
    typicalRisks: [
      "Faceting from loose tolerance",
      "Overcut in tight radii",
      "Witness marks at transitions",
    ],
    explanationPatterns: {
      tolerance: "Contour tolerance {value} {unit} for smooth blend",
      smoothing: "Smoothing at {value} for cusp height under {cuspHeight}",
      feed_rate: "Contour feed {value} {unit} with arc optimization",
    },
  },
  chamfering: {
    primaryParameters: ["spindle_speed", "feed_rate", "chamfer_size", "angle"],
    secondaryParameters: ["depth_control", "compensation"],
    criticalTradeoffs: [
      "Single vs multi-pass",
      "Speed vs edge quality",
      "Size consistency vs cycle time",
    ],
    typicalRisks: [
      "Inconsistent chamfer size",
      "Burr creation vs removal",
      "Tool marks on adjacent surfaces",
    ],
    explanationPatterns: {
      chamfer_size: "Chamfer at {value}x{angle} per drawing specification",
      feed_rate: "Chamfer feed {value} {unit} for clean edge break",
      spindle_speed: "Chamfer speed {value} {unit} balanced for edge quality",
    },
  },
  wire_edm: {
    primaryParameters: ["on_time", "off_time", "wire_speed", "wire_tension"],
    secondaryParameters: ["flushing_pressure", "power_setting", "offset"],
    criticalTradeoffs: [
      "Speed vs surface finish",
      "Power vs wire breakage risk",
      "Flushing vs recast layer",
    ],
    typicalRisks: [
      "Wire breakage from debris",
      "Poor finish from wrong settings",
      "Taper from thermal effects",
    ],
    explanationPatterns: {
      on_time: "On-time {value} {unit} optimized for {material} at {thickness}",
      off_time: "Off-time {value} {unit} for debris evacuation",
      wire_speed: "Wire speed {value} {unit} for stable cutting",
      wire_tension: "Wire tension {value} {unit} prevents deflection",
    },
  },
  sinker_edm: {
    primaryParameters: ["on_time", "off_time", "peak_current", "gap_voltage"],
    secondaryParameters: ["polarity", "jump_height", "duty_cycle"],
    criticalTradeoffs: [
      "Removal rate vs electrode wear",
      "Surface finish vs speed",
      "Flushing vs stability",
    ],
    typicalRisks: [
      "DC arc damage",
      "Excessive electrode wear",
      "Unstable machining",
    ],
    explanationPatterns: {
      peak_current: "Peak current {value} {unit} for {removal_rate} removal rate",
      on_time: "On-time {value} {unit} balances speed and finish",
      gap_voltage: "Gap voltage {value} {unit} for stable discharge",
    },
  },
  grinding: {
    primaryParameters: ["wheel_speed", "work_speed", "infeed", "crossfeed"],
    secondaryParameters: ["spark_out", "dress_interval", "coolant_flow"],
    criticalTradeoffs: [
      "Removal rate vs burn risk",
      "Dress frequency vs wheel life",
      "Infeed vs surface integrity",
    ],
    typicalRisks: [
      "Thermal damage/burn",
      "Wheel loading",
      "Chatter marks",
    ],
    explanationPatterns: {
      wheel_speed: "Wheel speed {value} {unit} within safe SFPM for {wheelType}",
      infeed: "Infeed {value} {unit} conservative to prevent burn on {material}",
      crossfeed: "Crossfeed {value} {unit} for {overlap}% wheel overlap",
    },
  },
  general: {
    primaryParameters: ["spindle_speed", "feed_rate"],
    secondaryParameters: [],
    criticalTradeoffs: ["Speed vs quality", "Productivity vs tool life"],
    typicalRisks: ["Parameter mismatch", "Unexpected conditions"],
    explanationPatterns: {
      spindle_speed: "Speed {value} {unit} calculated for operation requirements",
      feed_rate: "Feed {value} {unit} based on material and tool combination",
    },
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class AIDecisionExplanationEngine {
  private readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.85,
    MEDIUM: 0.70,
    LOW: 0.50,
  };

  private readonly REVIEW_TRIGGERS = {
    LOW_CONFIDENCE: 0.70,
    MULTIPLE_RISKS: 2,
    CONFLICTING_SOURCES: true,
    OVERRIDE_DETECTED: true,
  };

  /**
   * Generate comprehensive explanation for AI parameter decisions
   */
  explainDecision(input: DecisionExplanationInput): DecisionExplanation {
    log.info("[AIDecisionExplanation] Generating explanation", {
      operationId: input.operationId,
      operationType: input.operationType,
      parameterCount: input.parameters.length,
      verbosity: input.verbosity || "normal",
    });

    const verbosity = input.verbosity || "normal";
    const template = OPERATION_TEMPLATES[input.operationType] || OPERATION_TEMPLATES.general;

    // Generate explanations for each parameter
    const parameterExplanations = input.parameters.map(param =>
      this.explainParameter(param, template, verbosity, input.includeTribalKnowledge)
    );

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(parameterExplanations);

    // Identify key tradeoffs
    const keyTradeoffs = this.identifyTradeoffs(
      parameterExplanations,
      template,
      input.operationType
    );

    // Determine if review is needed
    const { suggestedReview, reviewReasons } = this.assessReviewNeed(
      parameterExplanations,
      overallConfidence
    );

    // Generate summary
    const summary = this.generateSummary(
      parameterExplanations,
      input.operationType,
      overallConfidence,
      input.targetAudience || "operator"
    );

    // Generate detailed narrative if requested
    const detailedNarrative = verbosity === "detailed"
      ? this.generateDetailedNarrative(parameterExplanations, keyTradeoffs, input)
      : undefined;

    return {
      operationId: input.operationId,
      operationType: input.operationType,
      operationName: input.operationName,
      timestamp: new Date().toISOString(),
      parameters: parameterExplanations,
      overallConfidence,
      keyTradeoffs,
      suggestedReview,
      reviewReasons: suggestedReview ? reviewReasons : undefined,
      summary,
      detailedNarrative,
      verbosityLevel: verbosity,
    };
  }

  /**
   * Generate explanation for a single parameter
   */
  explainParameter(
    input: ParameterDecisionInput,
    template: OperationTemplate,
    verbosity: VerbosityLevel,
    includeTribal?: boolean
  ): ParameterExplanation {
    const displayName = input.displayName || this.formatDisplayName(input.parameter);

    // Build reasoning points based on verbosity
    const reasoning = this.buildReasoning(input, template, verbosity, includeTribal);

    // Build alternatives with rejection reasons
    const alternatives = this.buildAlternatives(input, template);

    // Calculate confidence
    const confidenceLevel = this.calculateParameterConfidence(input);

    // Identify risks
    const riskFactors = this.identifyParameterRisks(input, template);

    // Collect sources
    const sourcesUsed = this.collectSources(input, includeTribal);

    return {
      parameter: input.parameter,
      displayName,
      chosenValue: input.chosenValue,
      unit: input.unit,
      reasoning,
      alternatives,
      confidenceLevel,
      sourcesUsed,
      riskFactors: riskFactors.length > 0 ? riskFactors : undefined,
      constraintsApplied: input.constraints,
    };
  }

  /**
   * Build reasoning bullets for a parameter
   */
  private buildReasoning(
    input: ParameterDecisionInput,
    template: OperationTemplate,
    verbosity: VerbosityLevel,
    includeTribal?: boolean
  ): string[] {
    const reasoning: string[] = [];
    const ctx = input.context;

    // Primary reason based on template pattern
    const pattern = template.explanationPatterns[input.parameter];
    if (pattern) {
      reasoning.push(this.interpolatePattern(pattern, input));
    } else {
      reasoning.push(`${this.formatDisplayName(input.parameter)} set to ${input.chosenValue} ${input.unit}`);
    }

    // Add source-based reasoning
    if (input.sources) {
      for (const source of input.sources) {
        if (source.type === "tribal_tip" && includeTribal) {
          reasoning.push(`Based on shop tip: "${source.description}"`);
        } else if (source.type === "oem_recommendation") {
          reasoning.push(`Using ${source.description}`);
        } else if (source.type === "physics_formula") {
          reasoning.push(`Calculated using ${source.description}`);
        } else if (source.type === "machine_limit") {
          reasoning.push(`Constrained by machine limit: ${source.description}`);
        }
      }
    }

    // Add context-based reasoning for normal/detailed
    if (verbosity !== "brief") {
      if (ctx.material) {
        reasoning.push(`Optimized for ${ctx.material} workpiece material`);
      }
      if (ctx.toolMaterial && ctx.toolCoating) {
        reasoning.push(`Using ${ctx.toolCoating}-coated ${ctx.toolMaterial} tooling`);
      }
    }

    // Add constraint reasoning for detailed
    if (verbosity === "detailed" && input.constraints) {
      for (const constraint of input.constraints) {
        reasoning.push(`Constraint applied: ${constraint}`);
      }
    }

    // Limit based on verbosity
    const maxBullets = verbosity === "brief" ? 1 : verbosity === "normal" ? 3 : 6;
    return reasoning.slice(0, maxBullets);
  }

  /**
   * Build alternatives with rejection reasons
   */
  private buildAlternatives(
    input: ParameterDecisionInput,
    template: OperationTemplate
  ): AlternativeValue[] {
    const alternatives: AlternativeValue[] = [];

    if (input.alternatives) {
      for (const alt of input.alternatives) {
        alternatives.push({
          value: alt.value,
          unit: input.unit,
          whyNotChosen: alt.reason || this.generateRejectionReason(
            input.parameter,
            alt.value,
            input.chosenValue,
            input.context
          ),
        });
      }
    }

    // Generate common alternatives if none provided
    if (alternatives.length === 0 && typeof input.chosenValue === "number") {
      // Higher value alternative
      const higherValue = Math.round(input.chosenValue * 1.25 * 100) / 100;
      alternatives.push({
        value: higherValue,
        unit: input.unit,
        whyNotChosen: this.generateRejectionReason(
          input.parameter,
          higherValue,
          input.chosenValue,
          input.context,
          "higher"
        ),
        wouldCause: this.getHigherValueConsequences(input.parameter),
      });

      // Lower value alternative
      const lowerValue = Math.round(input.chosenValue * 0.75 * 100) / 100;
      alternatives.push({
        value: lowerValue,
        unit: input.unit,
        whyNotChosen: this.generateRejectionReason(
          input.parameter,
          lowerValue,
          input.chosenValue,
          input.context,
          "lower"
        ),
        wouldCause: this.getLowerValueConsequences(input.parameter),
      });
    }

    return alternatives.slice(0, 3); // Max 3 alternatives
  }

  /**
   * Generate rejection reason for an alternative value
   */
  private generateRejectionReason(
    parameter: string,
    altValue: number | string,
    chosenValue: number | string,
    context: ParameterContext,
    direction?: "higher" | "lower"
  ): string {
    const paramLower = parameter.toLowerCase();

    // Feed rate rejections
    if (paramLower.includes("feed")) {
      if (direction === "higher") {
        return "Would exceed recommended chip load, risking tool breakage";
      }
      return "Would increase cycle time without surface finish benefit";
    }

    // Speed rejections
    if (paramLower.includes("speed") || paramLower.includes("rpm")) {
      if (direction === "higher") {
        if (context.material?.toLowerCase().includes("titanium")) {
          return "Would cause excessive heat buildup in titanium";
        }
        return "Would reduce tool life significantly";
      }
      return "Would reduce productivity without quality benefit";
    }

    // Depth of cut rejections
    if (paramLower.includes("depth")) {
      if (direction === "higher") {
        return "Would exceed tool engagement limits, risking deflection";
      }
      return "Would require additional passes, increasing cycle time";
    }

    // Peck depth rejections
    if (paramLower.includes("peck")) {
      if (direction === "higher") {
        return "Would risk chip packing and drill breakage";
      }
      return "Excessive pecking increases cycle time without benefit";
    }

    return `${direction === "higher" ? "Higher" : "Lower"} value outside optimal range for this operation`;
  }

  /**
   * Get consequences of higher values for parameter
   */
  private getHigherValueConsequences(parameter: string): string[] {
    const paramLower = parameter.toLowerCase();

    if (paramLower.includes("feed")) {
      return ["Increased tool wear", "Risk of tool breakage", "Rougher surface finish"];
    }
    if (paramLower.includes("speed") || paramLower.includes("rpm")) {
      return ["Reduced tool life", "Increased heat generation", "Risk of thermal damage"];
    }
    if (paramLower.includes("depth")) {
      return ["Increased deflection", "Higher cutting forces", "Risk of chatter"];
    }
    return ["May exceed safe operating limits"];
  }

  /**
   * Get consequences of lower values for parameter
   */
  private getLowerValueConsequences(parameter: string): string[] {
    const paramLower = parameter.toLowerCase();

    if (paramLower.includes("feed")) {
      return ["Increased cycle time", "Rubbing instead of cutting", "Work hardening risk"];
    }
    if (paramLower.includes("speed") || paramLower.includes("rpm")) {
      return ["Reduced productivity", "Built-up edge formation", "Poor chip control"];
    }
    if (paramLower.includes("depth")) {
      return ["More passes required", "Increased cycle time"];
    }
    return ["May reduce efficiency without benefit"];
  }

  /**
   * Calculate confidence for a single parameter
   */
  private calculateParameterConfidence(input: ParameterDecisionInput): number {
    let confidence = 0.75; // Base confidence

    // Boost for sources
    if (input.sources) {
      for (const source of input.sources) {
        if (source.type === "physics_formula") confidence += 0.10;
        else if (source.type === "oem_recommendation") confidence += 0.08;
        else if (source.type === "tribal_tip") confidence += 0.05;
        else if (source.type === "historical_data") confidence += 0.07;
      }
    }

    // Reduce for risks
    if (input.risks) {
      confidence -= input.risks.length * 0.05;
    }

    // Reduce for constraints (indicates edge case)
    if (input.constraints && input.constraints.length > 2) {
      confidence -= 0.05;
    }

    return Math.max(0.3, Math.min(0.98, confidence));
  }

  /**
   * Identify risks for a parameter
   */
  private identifyParameterRisks(
    input: ParameterDecisionInput,
    template: OperationTemplate
  ): string[] {
    const risks: string[] = [];

    // Include explicit risks
    if (input.risks) {
      risks.push(...input.risks);
    }

    // Check for typical operation risks
    for (const typicalRisk of template.typicalRisks) {
      if (this.isRiskApplicable(input, typicalRisk)) {
        risks.push(typicalRisk);
      }
    }

    return risks;
  }

  /**
   * Check if a typical risk applies to this parameter decision
   */
  private isRiskApplicable(input: ParameterDecisionInput, risk: string): boolean {
    const riskLower = risk.toLowerCase();
    const paramLower = input.parameter.toLowerCase();

    // Deflection risks apply to depth/engagement parameters
    if (riskLower.includes("deflection") && (paramLower.includes("depth") || paramLower.includes("engagement"))) {
      return true;
    }

    // Chatter risks apply to speed/depth parameters
    if (riskLower.includes("chatter") && (paramLower.includes("speed") || paramLower.includes("depth"))) {
      return true;
    }

    // Thermal risks apply to speed parameters
    if (riskLower.includes("thermal") && paramLower.includes("speed")) {
      return true;
    }

    return false;
  }

  /**
   * Collect sources with attribution
   */
  private collectSources(input: ParameterDecisionInput, includeTribal?: boolean): DecisionSource[] {
    const sources: DecisionSource[] = [];

    if (input.sources) {
      for (const source of input.sources) {
        if (source.type === "tribal_tip" && !includeTribal) {
          continue;
        }
        sources.push(source);
      }
    }

    // Add implicit sources
    if (input.context.material) {
      sources.push({
        type: "material_property",
        description: `Material database: ${input.context.material}`,
        confidence: 0.9,
      });
    }

    return sources;
  }

  /**
   * Calculate overall confidence from parameter confidences
   */
  private calculateOverallConfidence(parameters: ParameterExplanation[]): number {
    if (parameters.length === 0) return 0.5;

    // Weighted average: primary parameters count more
    const primaryParams = ["feed_rate", "spindle_speed", "depth_of_cut", "width_of_cut"];
    let weightedSum = 0;
    let totalWeight = 0;

    for (const param of parameters) {
      const weight = primaryParams.includes(param.parameter) ? 2 : 1;
      weightedSum += param.confidenceLevel * weight;
      totalWeight += weight;
    }

    return weightedSum / totalWeight;
  }

  /**
   * Identify key tradeoffs in the decision
   */
  private identifyTradeoffs(
    parameters: ParameterExplanation[],
    template: OperationTemplate,
    operationType: OperationType
  ): Tradeoff[] {
    const tradeoffs: Tradeoff[] = [];

    // Include template tradeoffs that are evident
    for (const tradeoffDesc of template.criticalTradeoffs) {
      const parts = tradeoffDesc.split(" vs ");
      if (parts.length === 2) {
        tradeoffs.push({
          description: tradeoffDesc,
          prioritized: parts[0],
          sacrificed: parts[1],
          impact: this.assessTradeoffImpact(parts[0], parts[1], parameters),
        });
      }
    }

    return tradeoffs.slice(0, 3); // Max 3 key tradeoffs
  }

  /**
   * Assess impact of a tradeoff
   */
  private assessTradeoffImpact(prioritized: string, sacrificed: string, parameters: ParameterExplanation[]): string {
    // Generic impact assessment
    if (prioritized.toLowerCase().includes("tool life")) {
      return "Conservative parameters extend tool life but may increase cycle time";
    }
    if (prioritized.toLowerCase().includes("surface")) {
      return "Fine finish parameters selected at cost of material removal rate";
    }
    if (prioritized.toLowerCase().includes("speed") || prioritized.toLowerCase().includes("productivity")) {
      return "Aggressive parameters for faster cycle but monitor tool wear closely";
    }
    return `${prioritized} prioritized over ${sacrificed} based on operation requirements`;
  }

  /**
   * Assess if human review is needed
   */
  private assessReviewNeed(
    parameters: ParameterExplanation[],
    overallConfidence: number
  ): { suggestedReview: boolean; reviewReasons: string[] } {
    const reasons: string[] = [];

    // Low confidence trigger
    if (overallConfidence < this.REVIEW_TRIGGERS.LOW_CONFIDENCE) {
      reasons.push(`Overall confidence (${(overallConfidence * 100).toFixed(0)}%) below threshold`);
    }

    // Multiple risks trigger
    const totalRisks = parameters.reduce((sum, p) => sum + (p.riskFactors?.length || 0), 0);
    if (totalRisks >= this.REVIEW_TRIGGERS.MULTIPLE_RISKS) {
      reasons.push(`${totalRisks} risk factors identified across parameters`);
    }

    // Any parameter with very low confidence
    const lowConfidenceParams = parameters.filter(p => p.confidenceLevel < 0.5);
    if (lowConfidenceParams.length > 0) {
      reasons.push(`Parameters with low confidence: ${lowConfidenceParams.map(p => p.displayName).join(", ")}`);
    }

    // User override detected
    const overrideParams = parameters.filter(p =>
      p.sourcesUsed.some(s => s.type === "user_override")
    );
    if (overrideParams.length > 0) {
      reasons.push(`User overrides detected on: ${overrideParams.map(p => p.displayName).join(", ")}`);
    }

    return {
      suggestedReview: reasons.length > 0,
      reviewReasons: reasons,
    };
  }

  /**
   * Generate summary for operators
   */
  private generateSummary(
    parameters: ParameterExplanation[],
    operationType: OperationType,
    confidence: number,
    audience: "operator" | "engineer" | "manager"
  ): string {
    const opName = this.formatDisplayName(operationType);
    const confDesc = confidence >= 0.85 ? "high confidence" :
      confidence >= 0.70 ? "good confidence" : "moderate confidence";

    const primaryParams = parameters.slice(0, 3)
      .map(p => `${p.displayName}: ${p.chosenValue} ${p.unit}`)
      .join(", ");

    if (audience === "operator") {
      return `${opName} parameters selected with ${confDesc}. Key values: ${primaryParams}. ` +
        `${parameters.some(p => p.riskFactors?.length) ? "Review flagged risks before running." : "Parameters safe for operation."}`;
    }

    if (audience === "engineer") {
      const sourceCount = new Set(parameters.flatMap(p => p.sourcesUsed.map(s => s.type))).size;
      return `${opName} optimized using ${sourceCount} source types. Confidence: ${(confidence * 100).toFixed(0)}%. ` +
        `Primary: ${primaryParams}. ` +
        `${parameters.reduce((sum, p) => sum + (p.riskFactors?.length || 0), 0)} risks identified.`;
    }

    // Manager view
    return `AI-generated ${opName} parameters at ${(confidence * 100).toFixed(0)}% confidence. ` +
      `${parameters.some(p => p.riskFactors?.length) ? "Requires operator review before execution." : "Ready for production."}`;
  }

  /**
   * Generate detailed narrative for full explanation
   */
  private generateDetailedNarrative(
    parameters: ParameterExplanation[],
    tradeoffs: Tradeoff[],
    input: DecisionExplanationInput
  ): string {
    const lines: string[] = [];

    lines.push(`## ${input.operationName || this.formatDisplayName(input.operationType)} Parameter Analysis`);
    lines.push("");

    // Parameter details
    lines.push("### Parameter Decisions");
    for (const param of parameters) {
      lines.push(`**${param.displayName}**: ${param.chosenValue} ${param.unit}`);
      for (const reason of param.reasoning) {
        lines.push(`  - ${reason}`);
      }
      if (param.riskFactors?.length) {
        lines.push(`  - *Risks*: ${param.riskFactors.join("; ")}`);
      }
      lines.push("");
    }

    // Tradeoffs
    if (tradeoffs.length > 0) {
      lines.push("### Key Tradeoffs");
      for (const tradeoff of tradeoffs) {
        lines.push(`- **${tradeoff.description}**: ${tradeoff.impact}`);
      }
      lines.push("");
    }

    // Source attribution
    const allSources = new Map<string, DecisionSource>();
    for (const param of parameters) {
      for (const source of param.sourcesUsed) {
        allSources.set(`${source.type}:${source.description}`, source);
      }
    }

    if (allSources.size > 0) {
      lines.push("### Sources Used");
      for (const source of Array.from(allSources.values())) {
        lines.push(`- ${this.formatSourceType(source.type)}: ${source.description}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Interpolate a pattern with context values
   */
  private interpolatePattern(pattern: string, input: ParameterDecisionInput): string {
    let result = pattern;
    const ctx = input.context;

    result = result.replace("{value}", String(input.chosenValue));
    result = result.replace("{unit}", input.unit);

    // Context replacements
    if (ctx.material) result = result.replace("{material}", ctx.material);
    if (ctx.toolMaterial) result = result.replace("{toolMaterial}", ctx.toolMaterial);
    if (ctx.toolDiameter) result = result.replace("{toolDia}", String(ctx.toolDiameter));
    if (ctx.targetSurfaceFinish) result = result.replace("{targetRa}", String(ctx.targetSurfaceFinish));

    // Generic placeholders
    result = result.replace(/{[^}]+}/g, "[calculated]");

    return result;
  }

  /**
   * Format parameter name for display
   */
  private formatDisplayName(name: string): string {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Format source type for display
   */
  private formatSourceType(type: SourceType): string {
    const map: Record<SourceType, string> = {
      tribal_tip: "Tribal Knowledge",
      oem_recommendation: "OEM Recommendation",
      physics_formula: "Physics Formula",
      neural_inference: "AI Inference",
      historical_data: "Historical Data",
      industry_standard: "Industry Standard",
      machine_limit: "Machine Limit",
      material_property: "Material Property",
      user_override: "User Override",
      playbook_rule: "Playbook Rule",
    };
    return map[type] || type;
  }

  /**
   * Create tribal knowledge attribution string
   */
  createTribalAttribution(tipId: string, tipSource: string, tipBody: string): DecisionSource {
    return {
      type: "tribal_tip",
      id: tipId,
      description: tipBody.length > 80 ? tipBody.substring(0, 77) + "..." : tipBody,
      confidence: 0.85,
      reference: `JM Die tip: ${tipSource}`,
    };
  }

  /**
   * Create OEM recommendation attribution
   */
  createOEMAttribution(manufacturer: string, recommendation: string, catalogRef?: string): DecisionSource {
    return {
      type: "oem_recommendation",
      description: `${manufacturer} recommendation: ${recommendation}`,
      confidence: 0.92,
      reference: catalogRef,
    };
  }

  /**
   * Create physics formula attribution
   */
  createPhysicsAttribution(formulaName: string, formulaDesc: string): DecisionSource {
    return {
      type: "physics_formula",
      id: formulaName,
      description: formulaDesc,
      confidence: 0.95,
      reference: `PRISM physics engine: ${formulaName}`,
    };
  }

  /**
   * Get explanation for approval gate integration
   */
  getApprovalGateExplanation(explanation: DecisionExplanation): {
    summary: string;
    confidence: number;
    requiresReview: boolean;
    reviewReasons: string[];
    parameterSummary: Array<{ name: string; value: string; confidence: number }>;
  } {
    return {
      summary: explanation.summary,
      confidence: explanation.overallConfidence,
      requiresReview: explanation.suggestedReview,
      reviewReasons: explanation.reviewReasons || [],
      parameterSummary: explanation.parameters.map(p => ({
        name: p.displayName,
        value: `${p.chosenValue} ${p.unit}`,
        confidence: p.confidenceLevel,
      })),
    };
  }
}

// Export singleton
export const aiDecisionExplanationEngine = new AIDecisionExplanationEngine();
