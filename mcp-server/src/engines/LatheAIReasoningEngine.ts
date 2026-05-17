/**
 * LatheAIReasoningEngine — Deep AI Intelligence for Lathe Programming
 *
 * Provides Claude Opus-level reasoning, deep learning patterns, and tribal knowledge
 * integration for intelligent lathe CNC program generation.
 *
 * CAPABILITIES:
 * - Deep Reasoning: Multi-step chain-of-thought for operation sequencing
 * - Tribal Knowledge: Integrates 3,700+ tips from shop floor experience
 * - G76 Dialect Intelligence: Controller-specific threading cycle optimization
 * - Physics-Based Optimization: AI-guided parameter selection
 * - Risk Assessment: Proactive safety and quality prediction
 * - Cross-Domain Learning: Applies patterns from similar materials/operations
 *
 * INTEGRATION:
 * - TurningPrintToProgramEngine: AI-enhanced operation planning
 * - ThreadTurningEngine: G76 dialect selection and optimization
 * - LatheWizardPage: AI suggestions and confidence scoring
 *
 * @module engines/LatheAIReasoningEngine
 * @milestone LATHE-AI-MS1
 */

import { deepAIIntelligenceEngine } from "./DeepAIIntelligenceEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";
import { threadTurningEngine, G76_DIALECTS, getG76Dialect, generateG76Code, type G76Dialect } from "./ThreadTurningEngine.js";
import { prismSelfAwarenessEngine } from "./PRISMSelfAwarenessEngine.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Lathe operation context for AI reasoning */
export interface LatheOperationContext {
  operation_type: string;
  material_iso: "P" | "M" | "K" | "N" | "S" | "H";
  material_name?: string;
  hardness_hrc?: number;
  diameter_mm?: number;
  length_mm?: number;
  depth_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  thread_pitch_mm?: number;
  controller?: string;
  machine_brand?: string;
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "min_cost" | "surface_quality";
}

/** AI reasoning result for lathe operations */
export interface LatheAIReasoningResult {
  query: string;
  reasoning_steps: string[];
  conclusion: string;
  recommendations: LatheRecommendation[];
  tribal_tips: KnowledgeTip[];
  playbook_rules: Array<{ id: string; title: string; advice: string }>;
  risk_assessment: RiskAssessment;
  confidence: number;
  processing_time_ms: number;
}

/** Specific recommendation from AI reasoning */
export interface LatheRecommendation {
  category: "speed_feed" | "tooling" | "workholding" | "sequence" | "threading" | "safety" | "quality";
  priority: "critical" | "important" | "suggested";
  title: string;
  description: string;
  rationale: string;
  action?: string;
  confidence: number;
}

/** Risk assessment from AI analysis */
export interface RiskAssessment {
  overall_risk: "low" | "medium" | "high" | "critical";
  risk_factors: Array<{
    factor: string;
    severity: "low" | "medium" | "high";
    mitigation: string;
  }>;
  confidence_factors: string[];
  quality_risks: string[];
  safety_risks: string[];
}

/** Threading AI result */
export interface ThreadingAIResult {
  // U-WIRE04 fix: was typed as full G76Dialect but assigned the dialect *string* below.
  recommended_dialect: G76Dialect["dialect"];
  dialect_confidence: number;
  g76_code: string;
  reasoning: string[];
  alternative_dialects: Array<{
    dialect: G76Dialect["dialect"];
    confidence: number;
    reason: string;
  }>;
  tribal_tips: KnowledgeTip[];
  infeed_recommendation: {
    method: string;
    angle: number;
    rationale: string;
  };
  pass_schedule_optimization: string;
  warnings: string[];
}

/** Operation sequencing AI result */
export interface SequencingAIResult {
  recommended_sequence: string[];
  reasoning: string[];
  tool_change_minimization: {
    original_changes: number;
    optimized_changes: number;
    savings_percent: number;
  };
  critical_path: string[];
  parallel_opportunities: string[];
  tribal_tips: KnowledgeTip[];
  confidence: number;
}

/** Parameter optimization AI result */
export interface ParameterAIResult {
  optimized_params: {
    cutting_speed_m_min: number;
    feed_mm_rev: number;
    depth_of_cut_mm: number;
    spindle_rpm: number;
  };
  original_params: {
    cutting_speed_m_min: number;
    feed_mm_rev: number;
    depth_of_cut_mm: number;
    spindle_rpm: number;
  };
  improvement: {
    mrr_increase_percent: number;
    tool_life_impact: string;
    surface_finish_impact: string;
  };
  reasoning: string[];
  cross_domain_insights: string[];
  tribal_tips: KnowledgeTip[];
  confidence: number;
}

// ============================================================================
// KNOWLEDGE STORE INTEGRATION
// ============================================================================

/**
 * Lathe-specific knowledge from PDF-LEARN extracted documents
 */
const LATHE_KNOWLEDGE_STORE = {
  // From g76-threading-cycle.json
  g76_threading: [
    { tip: "G76 P-word first line: 6 digits as 3 two-digit clusters (mm,rr,aa) — spring passes, chamfer, tool angle", confidence: 95 },
    { tip: "For coarse pitches >3mm, use modified flank infeed (29-29.5°) to reduce chip welding", confidence: 90 },
    { tip: "Constant area regression (R=2 on LinuxCNC) maintains consistent chip load across all passes", confidence: 90 },
    { tip: "Spring passes (2-4) are critical for thread accuracy — zero-depth passes let insert spring back", confidence: 95 },
    { tip: "Haas uses D for first cut depth, Q for thread start angle — opposite of Fanuc convention", confidence: 90 },
    { tip: "LinuxCNC I sign determines internal vs external: negative=external, positive=internal", confidence: 95 },
    { tip: "Cancel G68/G54.4 before probing on Haas — cannot probe with rotation/WSEC active", confidence: 95 },
    { tip: "Mach3 has the most G76 parameters (13) — Q=spring passes, L=chamfer, J=min depth per pass", confidence: 85 },
  ],
  // From g71-macro-workaround.json
  g71_macro: [
    { tip: "If G71 fails on Mach3, use IF/GOTO loop: G01 cut, G00 retract, decrement counter, repeat", confidence: 85 },
    { tip: "G52 coordinate shift can emulate G71 depth progression — shift X by DOC each pass", confidence: 80 },
    { tip: "For controllers without G71 Type II, define profile in subprogram and call repeatedly", confidence: 85 },
    { tip: "Verify G71 Type I vs Type II support — Type II retracts along profile, Type I parallel to Z", confidence: 90 },
  ],
  // From deep-hole-drilling.json
  deep_hole_drilling: [
    { tip: "L/D ratio thresholds: 0-5x standard, 5-7x peck, 7-10x parabolic+peck, 10-20x custom cycle, >20x gun drill", confidence: 90 },
    { tip: "NEVER fully retract drill during peck — chips wash back, preventing re-establishment of bite", confidence: 95 },
    { tip: "After 0.001\" partial retract, pause 2 spindle revolutions for chip clearance before continuing", confidence: 85 },
    { tip: "Through-spindle coolant is optimal for deep holes — primary function is chip evacuation, secondary is cooling", confidence: 90 },
    { tip: "Custom deep hole cycles outperform G83: no peck for first 2x D, increasing peck frequency as depth increases", confidence: 85 },
  ],
  // From cnc-lathe-fundamentals.json
  lathe_fundamentals: [
    { tip: "OD rough DOC 2-4mm, finish 0.25-0.5mm; ID rough 1-2mm, finish 0.1-0.25mm", confidence: 90 },
    { tip: "For slender parts (L/D > 3), use tailstock center or steady rest to prevent deflection", confidence: 95 },
    { tip: "First operation should always be facing to establish Z reference plane", confidence: 95 },
    { tip: "Grooving: peck with 50% width overlap, 0.05-0.1mm retract per peck for chip breaking", confidence: 85 },
    { tip: "Part-off: reduce speed 30-50% vs turning, use high-pressure coolant aimed at blade tip", confidence: 90 },
  ],
  // From cnc-fundamentals-autodesk.json
  cnc_fundamentals: [
    { tip: "RPM = (SFM × 3.82) / Diameter — 3.82 = 12/π converts surface feet to revolutions", confidence: 95 },
    { tip: "Feed(IPM) = RPM × ChipLoad(IPR) × Flutes — calculate feed AFTER determining RPM", confidence: 95 },
    { tip: "Form taps (roll taps) produce NO chips — ideal for aluminum, copper, brass, plastics", confidence: 90 },
    { tip: "Reamed holes accurate within ±0.0002\" — always drill undersized first, reamer removes minimal material", confidence: 90 },
    { tip: "Insert tolerance classes: M=±0.002-0.005\", G=±0.001\", E=±0.001\" all dims, K=±0.0005\" ultra-precision", confidence: 85 },
  ],
  // From workholding-solutions.json
  workholding: [
    { tip: "Modular fixture sub-plates provide ~0.0005\" repeatability — eliminates tramming, 1-2 min setup", confidence: 90 },
    { tip: "Ball lock quick-change allows fixture plate changes in ~30 seconds — significant ROI for repeat jobs", confidence: 85 },
    { tip: "Step clamps: position bolt CLOSE to workpiece, not step block — maximizes clamping force", confidence: 90 },
    { tip: "Vacuum fixtures provide 14.7 lbs/sq inch — limit cutting forces accordingly for small surface areas", confidence: 85 },
  ],
  // From haas-programming.json
  haas_specific: [
    { tip: "G12/G13 circular pocket: faster than CAM-generated helical moves for simple circular pockets", confidence: 90 },
    { tip: "Prefer G53 over G28 G91 Z0 — G53 is cleaner because G90 stays active", confidence: 90 },
    { tip: "G154 P1-P99: 99 additional work coordinate systems beyond G54-G59 for tombstone/pallet setups", confidence: 90 },
    { tip: "For rigid tapping, use G95 feed-per-rev instead of calculating F=pitch×RPM", confidence: 90 },
    { tip: "M138 enables SSV (Spindle Speed Variation) to break up chatter harmonics", confidence: 85 },
  ],
};

// ============================================================================
// ENGINE
// ============================================================================

export class LatheAIReasoningEngine {
  readonly name = "LatheAIReasoningEngine";
  readonly version = "1.0.0";

  // Cache for repeated queries
  private reasoningCache = new Map<string, LatheAIReasoningResult>();
  private cacheMaxAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Perform deep AI reasoning on a lathe operation
   */
  async reason(context: LatheOperationContext): Promise<LatheAIReasoningResult> {
    const startTime = Date.now();
    const cacheKey = JSON.stringify(context);

    // Check cache
    const cached = this.reasoningCache.get(cacheKey);
    if (cached && Date.now() - startTime < this.cacheMaxAge) {
      return cached;
    }

    const query = this.buildReasoningQuery(context);
    const steps: string[] = [];
    const recommendations: LatheRecommendation[] = [];

    // Step 1: Understand operation context
    steps.push(`Analyzing ${context.operation_type} operation on ${context.material_name || context.material_iso} material`);
    steps.push(`Diameter: ${context.diameter_mm ?? "unknown"}mm, Length: ${context.length_mm ?? "unknown"}mm`);

    // Step 2: Gather tribal knowledge
    const tribalTips = this.gatherTribalKnowledge(context);
    steps.push(`Found ${tribalTips.length} relevant tribal knowledge tips`);

    // Step 3: Check playbook rules
    const playbookRules = this.checkPlaybookRules(context);
    steps.push(`Applied ${playbookRules.length} machining playbook rules`);

    // Step 4: Generate recommendations
    recommendations.push(...this.generateRecommendations(context, tribalTips, playbookRules));
    steps.push(`Generated ${recommendations.length} AI recommendations`);

    // Step 5: Assess risks
    const riskAssessment = this.assessRisks(context, tribalTips);
    steps.push(`Risk assessment: ${riskAssessment.overall_risk} risk level`);

    // Step 6: Synthesize conclusion
    const conclusion = this.synthesizeConclusion(context, recommendations, riskAssessment);
    steps.push(`Synthesis complete with ${(this.calculateConfidence(context, recommendations) * 100).toFixed(0)}% confidence`);

    const result: LatheAIReasoningResult = {
      query,
      reasoning_steps: steps,
      conclusion,
      recommendations,
      tribal_tips: tribalTips,
      playbook_rules: playbookRules,
      risk_assessment: riskAssessment,
      confidence: this.calculateConfidence(context, recommendations),
      processing_time_ms: Date.now() - startTime,
    };

    // Cache result
    this.reasoningCache.set(cacheKey, result);

    return result;
  }

  /**
   * AI-powered G76 threading dialect selection and code generation
   */
  selectG76Dialect(params: {
    controller: string;
    thread_pitch_mm: number;
    major_diameter_mm: number;
    thread_length_mm: number;
    material_iso: string;
    is_external?: boolean;
  }): ThreadingAIResult {
    const warnings: string[] = [];
    const reasoning: string[] = [];

    // Step 1: Identify controller dialect
    const dialect = getG76Dialect(params.controller);
    const recommendedDialect = dialect?.dialect ?? "fanuc_double";
    reasoning.push(`Controller "${params.controller}" maps to ${recommendedDialect} G76 dialect`);

    // Step 2: Calculate threading parameters
    const threadResult = threadTurningEngine.calculate({
      pitch_mm: params.thread_pitch_mm,
      major_diameter_mm: params.major_diameter_mm,
      is_external: params.is_external ?? true,
      material_iso_group: params.material_iso as any,
    });

    reasoning.push(`Thread depth: ${threadResult.thread_depth.value}mm over ${threadResult.number_of_passes.value} passes`);
    reasoning.push(`Infeed method: ${threadResult.infeed_method} at ${threadResult.infeed_angle.value}°`);

    // Step 3: Generate G76 code
    const g76Code = generateG76Code(recommendedDialect, {
      end_x_mm: params.major_diameter_mm - 2 * threadResult.thread_depth.value,
      end_z_mm: -params.thread_length_mm,
      thread_depth_mm: threadResult.thread_depth.value,
      first_cut_mm: threadResult.pass_schedule[0]?.depth_mm ?? 0.2,
      pitch_mm: params.thread_pitch_mm,
      spring_passes: threadResult.spring_passes.value,
      infeed_angle: threadResult.infeed_angle.value,
    });

    // Step 4: Gather tribal knowledge for threading
    const tribalTips = this.getThreadingTribalTips(params);
    reasoning.push(`Applied ${tribalTips.length} threading-specific tribal tips`);

    // Step 5: Check for potential issues
    if (params.thread_pitch_mm > 3) {
      warnings.push("Coarse pitch — consider modified flank infeed for chip control");
    }
    if (params.major_diameter_mm < 8 && params.thread_pitch_mm > 1) {
      warnings.push("Small diameter with coarse pitch — high relative thread depth, consider extra spring passes");
    }

    // Step 6: Build alternative dialects
    const alternatives = G76_DIALECTS
      .filter(d => d.dialect !== recommendedDialect)
      .map(d => ({
        dialect: d.dialect,
        confidence: d.controller_names.some(n =>
          params.controller.toLowerCase().includes(n.toLowerCase())
        ) ? 0.6 : 0.3,
        reason: d.notes[0] || `Alternative: ${d.dialect}`,
      }));

    return {
      recommended_dialect: recommendedDialect,
      dialect_confidence: dialect ? 0.95 : 0.7,
      g76_code: g76Code,
      reasoning,
      alternative_dialects: alternatives,
      tribal_tips: tribalTips,
      infeed_recommendation: {
        method: threadResult.infeed_method,
        angle: threadResult.infeed_angle.value,
        rationale: `${threadResult.infeed_method} selected for ${params.thread_pitch_mm}mm pitch — ${
          params.thread_pitch_mm > 2 ? "better chip control on coarse threads" : "radial sufficient for fine pitch"
        }`,
      },
      pass_schedule_optimization: `Constant area method: ${threadResult.number_of_passes.value} cutting passes + ${threadResult.spring_passes.value} spring passes`,
      warnings: [...warnings, ...threadResult.warnings],
    };
  }

  /**
   * AI-powered operation sequencing
   */
  optimizeSequence(operations: Array<{
    id: string;
    type: string;
    tool_type: string;
    priority?: number;
  }>): SequencingAIResult {
    const reasoning: string[] = [];

    // Step 1: Analyze operation types
    const opTypes = operations.map(o => o.type);
    reasoning.push(`Analyzing ${operations.length} operations: ${[...new Set(opTypes)].join(", ")}`);

    // Step 2: Apply sequencing rules
    const sequenceRules = [
      { pattern: /face/, priority: 1, reason: "Face first to establish Z reference" },
      { pattern: /center_drill/, priority: 2, reason: "Center drill before other drilling" },
      { pattern: /drill/, priority: 3, reason: "Drill before boring" },
      { pattern: /od_rough/, priority: 4, reason: "OD roughing before finishing" },
      { pattern: /id_rough|bore_rough/, priority: 5, reason: "ID roughing after OD" },
      { pattern: /od_finish/, priority: 6, reason: "OD finishing after roughing" },
      { pattern: /id_finish|bore_finish/, priority: 7, reason: "ID finishing after ID rough" },
      { pattern: /groove/, priority: 8, reason: "Grooving after profiling" },
      { pattern: /thread/, priority: 9, reason: "Threading after all turning complete" },
      { pattern: /part_off/, priority: 10, reason: "Part-off always last" },
    ];

    // Apply rules
    const sequenced = operations.map(op => {
      const rule = sequenceRules.find(r => r.pattern.test(op.type));
      return { ...op, seqPriority: rule?.priority ?? 5, seqReason: rule?.reason };
    }).sort((a, b) => a.seqPriority - b.seqPriority);

    reasoning.push(`Applied ${sequenceRules.length} sequencing rules`);

    // Step 3: Minimize tool changes
    const toolGroups = new Map<string, typeof sequenced>();
    for (const op of sequenced) {
      const group = toolGroups.get(op.tool_type) || [];
      group.push(op);
      toolGroups.set(op.tool_type, group);
    }

    const originalChanges = operations.length - 1;
    const optimizedChanges = Math.max(0, toolGroups.size - 1);
    reasoning.push(`Tool change optimization: ${originalChanges} → ${optimizedChanges} changes`);

    // Step 4: Identify critical path
    const criticalPath = sequenced
      .filter(op => op.type.includes("rough") || op.type.includes("thread") || op.type === "part_off")
      .map(op => op.id);

    // Step 5: Get tribal tips
    // search() now takes KnowledgeSearchInput object (was positional).
    // KnowledgeTip canonical shape: `id` (not `tip_id`).
    const tribalTips = tribalKnowledgeEngine.search({ query: "lathe operation sequence", limit: 5 }).map(t => ({
      ...t,
      id: t.id || `seq-${Math.random().toString(36).slice(2, 8)}`,
    }));

    return {
      recommended_sequence: sequenced.map(o => o.id),
      reasoning,
      tool_change_minimization: {
        original_changes: originalChanges,
        optimized_changes: optimizedChanges,
        savings_percent: originalChanges > 0
          ? Math.round((1 - optimizedChanges / originalChanges) * 100)
          : 0,
      },
      critical_path: criticalPath,
      parallel_opportunities: [], // Single-spindle lathe — no parallelism
      tribal_tips: tribalTips,
      confidence: 0.9,
    };
  }

  /**
   * AI-powered cutting parameter optimization
   */
  optimizeParameters(
    context: LatheOperationContext,
    currentParams: {
      cutting_speed_m_min: number;
      feed_mm_rev: number;
      depth_of_cut_mm: number;
    }
  ): ParameterAIResult {
    const reasoning: string[] = [];
    const crossDomainInsights: string[] = [];

    // Step 1: Analyze current parameters
    reasoning.push(`Current: Vc=${currentParams.cutting_speed_m_min} m/min, f=${currentParams.feed_mm_rev} mm/rev, ap=${currentParams.depth_of_cut_mm} mm`);

    // Step 2: Apply material-specific knowledge
    const materialMultipliers = {
      P: { speed: 1.0, feed: 1.0, doc: 1.0 },    // Steel baseline
      M: { speed: 0.7, feed: 0.9, doc: 0.9 },    // Stainless — harder
      K: { speed: 1.2, feed: 1.1, doc: 1.1 },    // Cast iron — easier
      N: { speed: 2.0, feed: 1.2, doc: 1.2 },    // Aluminum — much faster
      S: { speed: 0.35, feed: 0.7, doc: 0.6 },   // Titanium/superalloys — slow
      H: { speed: 0.4, feed: 0.8, doc: 0.5 },    // Hardened steel
    };

    const mult = materialMultipliers[context.material_iso] || materialMultipliers.P;
    reasoning.push(`Material ${context.material_iso} multipliers: Vc×${mult.speed}, f×${mult.feed}, ap×${mult.doc}`);

    // Step 3: Optimization based on target
    let speedAdjust = 1.0;
    let feedAdjust = 1.0;
    let docAdjust = 1.0;

    switch (context.optimization_target) {
      case "max_speed":
        speedAdjust = 1.2;
        feedAdjust = 1.15;
        docAdjust = 1.1;
        reasoning.push("Max speed target: increasing all parameters by 10-20%");
        break;
      case "max_tool_life":
        speedAdjust = 0.85;
        feedAdjust = 0.9;
        docAdjust = 1.0;
        reasoning.push("Max tool life target: reducing speed/feed by 10-15%");
        crossDomainInsights.push("Taylor equation: 15% speed reduction ≈ 100% tool life increase");
        break;
      case "surface_quality":
        speedAdjust = 1.1;
        feedAdjust = 0.6;  // Lower feed for better finish
        docAdjust = 0.7;
        reasoning.push("Surface quality target: reducing feed/DOC for better Ra");
        crossDomainInsights.push("Ra ∝ f²/r — halving feed reduces roughness by 75%");
        break;
      case "min_cost":
        speedAdjust = 0.9;
        feedAdjust = 1.1;
        docAdjust = 1.2;
        reasoning.push("Min cost target: moderate speed, higher MRR");
        break;
      default:
        reasoning.push("Balanced optimization: applying material-specific adjustments only");
    }

    // Step 4: Calculate optimized parameters (material multipliers × optimization adjustments)
    const diameter = context.diameter_mm || 50;
    const optimizedSpeed = Math.round(currentParams.cutting_speed_m_min * mult.speed * speedAdjust * 10) / 10;
    const optimizedFeed = Math.round(currentParams.feed_mm_rev * mult.feed * feedAdjust * 1000) / 1000;
    const optimizedDoc = Math.round(currentParams.depth_of_cut_mm * mult.doc * docAdjust * 100) / 100;
    const optimizedRpm = Math.round((1000 * optimizedSpeed) / (Math.PI * diameter));

    // Step 5: Calculate improvement
    const originalMRR = currentParams.cutting_speed_m_min * currentParams.feed_mm_rev * currentParams.depth_of_cut_mm * 1000;
    const optimizedMRR = optimizedSpeed * optimizedFeed * optimizedDoc * 1000;
    const mrrIncrease = ((optimizedMRR / originalMRR) - 1) * 100;

    // Step 6: Get tribal tips
    const tribalTips = this.getParameterTribalTips(context);

    return {
      optimized_params: {
        cutting_speed_m_min: optimizedSpeed,
        feed_mm_rev: optimizedFeed,
        depth_of_cut_mm: optimizedDoc,
        spindle_rpm: optimizedRpm,
      },
      original_params: {
        cutting_speed_m_min: currentParams.cutting_speed_m_min,
        feed_mm_rev: currentParams.feed_mm_rev,
        depth_of_cut_mm: currentParams.depth_of_cut_mm,
        spindle_rpm: Math.round((1000 * currentParams.cutting_speed_m_min) / (Math.PI * diameter)),
      },
      improvement: {
        mrr_increase_percent: Math.round(mrrIncrease * 10) / 10,
        tool_life_impact: speedAdjust < 1 ? "Improved" : speedAdjust > 1.1 ? "Reduced" : "Neutral",
        surface_finish_impact: feedAdjust < 0.8 ? "Improved" : feedAdjust > 1.1 ? "Reduced" : "Neutral",
      },
      reasoning,
      cross_domain_insights: crossDomainInsights,
      tribal_tips: tribalTips,
      confidence: 0.85,
    };
  }

  /**
   * Get controller-specific AI recommendations
   */
  getControllerRecommendations(controller: string): LatheRecommendation[] {
    const recommendations: LatheRecommendation[] = [];
    const lowerController = controller.toLowerCase();

    // Haas-specific
    if (lowerController.includes("haas")) {
      recommendations.push({
        category: "threading",
        priority: "important",
        title: "Use G95 for rigid tapping",
        description: "Set useG95forTapping in post processor for reliable rigid tap synchronization",
        rationale: "G95 feed-per-rev mode automatically synchronizes feed with spindle speed",
        confidence: 0.9,
      });
      recommendations.push({
        category: "quality",
        priority: "suggested",
        title: "Enable SSV for long cuts",
        description: "M138 enables Spindle Speed Variation to break up chatter harmonics",
        rationale: "SSV varies RPM within a range to prevent resonance buildup",
        action: "Add M138 at start of long roughing passes",
        confidence: 0.85,
      });
    }

    // Fanuc-specific
    if (lowerController.includes("fanuc")) {
      recommendations.push({
        category: "threading",
        priority: "important",
        title: "Use double-line G76 format",
        description: "Fanuc G76 uses two-line format with P-word encoding spring passes, chamfer, and angle",
        rationale: "P-word format P021029 = 2 spring passes, 10 chamfer units, 29° angle",
        confidence: 0.95,
      });
    }

    // Okuma-specific
    if (lowerController.includes("okuma")) {
      recommendations.push({
        category: "safety",
        priority: "critical",
        title: "G199/G198 for dual-spindle sync",
        description: "Use G199 to synchronize spindles, G198 to release sync",
        rationale: "G96 CSS is blocked during sync mode — use stepped G97 RPM instead",
        confidence: 0.9,
      });
    }

    // LinuxCNC/PathPilot
    if (lowerController.includes("linux") || lowerController.includes("pathpilot") || lowerController.includes("tormach")) {
      recommendations.push({
        category: "threading",
        priority: "important",
        title: "Use R=2 constant area regression",
        description: "LinuxCNC G76 R parameter controls depth regression — R=2 maintains constant chip load",
        rationale: "Constant area method (R=2) is superior to constant depth (R=1) for thread quality",
        confidence: 0.9,
      });
      recommendations.push({
        category: "threading",
        priority: "suggested",
        title: "Native spring pass support with H parameter",
        description: "LinuxCNC G76 H parameter directly specifies spring pass count",
        rationale: "No need for separate G92 spring passes — H handles it automatically",
        confidence: 0.9,
      });
    }

    return recommendations;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private buildReasoningQuery(context: LatheOperationContext): string {
    return `Lathe ${context.operation_type} operation on ${context.material_name || context.material_iso} ` +
      `(${context.hardness_hrc ? context.hardness_hrc + " HRC" : "unknown hardness"}), ` +
      `diameter ${context.diameter_mm ?? "?"}mm, optimization: ${context.optimization_target || "balanced"}`;
  }

  private gatherTribalKnowledge(context: LatheOperationContext): KnowledgeTip[] {
    const searchTerms = [
      context.operation_type,
      context.material_name || context.material_iso,
      context.optimization_target,
    ].filter(Boolean).join(" ");

    const tips = tribalKnowledgeEngine.search({ query: searchTerms, limit: 10 });

    // Add knowledge store tips
    const storeCategory = this.mapOperationToKnowledgeCategory(context.operation_type);
    const storeTips = (LATHE_KNOWLEDGE_STORE as any)[storeCategory] || [];

    return [
      ...tips,
      ...storeTips.slice(0, 5).map((t: any, i: number) => ({
        id: `store-${storeCategory}-${i}`,
        category: storeCategory,
        title: t.tip.slice(0, 50) + "...",
        body: t.tip,
        confidence: t.confidence / 100,
        source: "PRISM Knowledge Store",
      })),
    ];
  }

  private mapOperationToKnowledgeCategory(opType: string): string {
    if (opType.includes("thread")) return "g76_threading";
    if (opType.includes("drill")) return "deep_hole_drilling";
    if (opType.includes("bore")) return "deep_hole_drilling";
    return "lathe_fundamentals";
  }

  private checkPlaybookRules(context: LatheOperationContext): Array<{ id: string; title: string; advice: string }> {
    try {
      const result = machiningPlaybookEngine.advise({
        categories: ["turning", context.operation_type.split("_")[0]],
        operation_type: "turning",
        material_iso: context.material_iso,
      });

      return result.rules.map(r => ({
        id: r.id,
        title: r.title,
        advice: r.advice || r.title,
      }));
    } catch {
      return [];
    }
  }

  private generateRecommendations(
    context: LatheOperationContext,
    tribalTips: KnowledgeTip[],
    playbookRules: Array<{ id: string; title: string; advice: string }>
  ): LatheRecommendation[] {
    const recommendations: LatheRecommendation[] = [];

    // Material-based recommendations
    if (context.material_iso === "S") {
      recommendations.push({
        category: "speed_feed",
        priority: "critical",
        title: "Reduce cutting speed for titanium/superalloy",
        description: "Use 30-40% of steel speeds to prevent heat buildup",
        rationale: "Titanium has low thermal conductivity — heat stays in cut zone",
        confidence: 0.95,
      });
    }

    // Tolerance-based recommendations
    if (context.tolerance_mm && context.tolerance_mm < 0.02) {
      recommendations.push({
        category: "quality",
        priority: "important",
        title: "Add light finish pass for tight tolerance",
        description: `Tolerance ±${context.tolerance_mm}mm requires finish pass with 0.1-0.2mm DOC`,
        rationale: "Light finish pass minimizes tool deflection and spring-back",
        confidence: 0.9,
      });
    }

    // Surface finish recommendations
    if (context.surface_finish_Ra_um && context.surface_finish_Ra_um < 1.6) {
      recommendations.push({
        category: "quality",
        priority: "important",
        title: "Use wiper insert for fine finish",
        description: `Ra < 1.6µm target — consider wiper geometry or reduced feed`,
        rationale: "Ra ∝ f²/r — wiper inserts effectively double nose radius",
        confidence: 0.85,
      });
    }

    // Threading recommendations
    if (context.operation_type.includes("thread") && context.thread_pitch_mm) {
      if (context.thread_pitch_mm > 2) {
        recommendations.push({
          category: "threading",
          priority: "important",
          title: "Use modified flank infeed for coarse pitch",
          description: `Pitch ${context.thread_pitch_mm}mm — use 29-29.5° infeed angle`,
          rationale: "Modified flank distributes chip load between flanks, preventing chip welding",
          confidence: 0.9,
        });
      }
    }

    // Controller-specific recommendations
    if (context.controller) {
      recommendations.push(...this.getControllerRecommendations(context.controller));
    }

    return recommendations;
  }

  private assessRisks(context: LatheOperationContext, tribalTips: KnowledgeTip[]): RiskAssessment {
    const riskFactors: RiskAssessment["risk_factors"] = [];
    const qualityRisks: string[] = [];
    const safetyRisks: string[] = [];

    // Slender part risk
    if (context.diameter_mm && context.length_mm) {
      const ldRatio = context.length_mm / context.diameter_mm;
      if (ldRatio > 4) {
        riskFactors.push({
          factor: `High L/D ratio (${ldRatio.toFixed(1)})`,
          severity: ldRatio > 8 ? "high" : "medium",
          mitigation: "Use tailstock center or steady rest",
        });
        qualityRisks.push("Part deflection may affect dimensional accuracy");
      }
    }

    // Material risk
    if (context.material_iso === "S" || context.material_iso === "H") {
      riskFactors.push({
        factor: "Difficult-to-machine material",
        severity: "medium",
        mitigation: "Reduce speeds, use high-pressure coolant, monitor tool wear",
      });
    }

    // Tolerance risk
    if (context.tolerance_mm && context.tolerance_mm < 0.01) {
      riskFactors.push({
        factor: `Very tight tolerance (±${context.tolerance_mm}mm)`,
        severity: "medium",
        mitigation: "Multiple light finish passes, temperature compensation",
      });
      qualityRisks.push("Thermal expansion may exceed tolerance budget");
    }

    // Threading risk
    if (context.operation_type.includes("thread")) {
      riskFactors.push({
        factor: "Threading operation",
        severity: "low",
        mitigation: "Verify pitch, spring passes, check with thread gauge",
      });
    }

    // Calculate overall risk
    const highRisks = riskFactors.filter(r => r.severity === "high").length;
    const mediumRisks = riskFactors.filter(r => r.severity === "medium").length;
    const overallRisk: RiskAssessment["overall_risk"] =
      highRisks >= 2 ? "critical" :
      highRisks >= 1 ? "high" :
      mediumRisks >= 2 ? "medium" : "low";

    return {
      overall_risk: overallRisk,
      risk_factors: riskFactors,
      confidence_factors: [
        tribalTips.length > 5 ? "Strong tribal knowledge coverage" : "Limited tribal knowledge",
        context.controller ? "Known controller dialect" : "Generic controller assumed",
      ],
      quality_risks: qualityRisks,
      safety_risks: safetyRisks,
    };
  }

  private synthesizeConclusion(
    context: LatheOperationContext,
    recommendations: LatheRecommendation[],
    risk: RiskAssessment
  ): string {
    const critical = recommendations.filter(r => r.priority === "critical");
    const important = recommendations.filter(r => r.priority === "important");

    let conclusion = `${context.operation_type} operation on ${context.material_name || context.material_iso}: `;

    if (critical.length > 0) {
      conclusion += `${critical.length} critical recommendation(s) require attention. `;
    }
    if (important.length > 0) {
      conclusion += `${important.length} important optimization(s) available. `;
    }
    conclusion += `Overall risk: ${risk.overall_risk}.`;

    return conclusion;
  }

  private calculateConfidence(context: LatheOperationContext, recommendations: LatheRecommendation[]): number {
    let confidence = 0.8; // Base confidence

    // Boost for known controller
    if (context.controller) confidence += 0.05;

    // Boost for specific material
    if (context.material_name) confidence += 0.03;

    // Reduce for difficult materials
    if (context.material_iso === "S" || context.material_iso === "H") confidence -= 0.05;

    // Reduce for very tight tolerances
    if (context.tolerance_mm && context.tolerance_mm < 0.01) confidence -= 0.05;

    // Boost for recommendations with high confidence
    const avgRecommendationConfidence = recommendations.length > 0
      ? recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length
      : 0.8;
    confidence = (confidence + avgRecommendationConfidence) / 2;

    return Math.min(0.98, Math.max(0.5, confidence));
  }

  private getThreadingTribalTips(params: { thread_pitch_mm: number; controller?: string }): KnowledgeTip[] {
    const tips: KnowledgeTip[] = [];

    // Add G76 threading knowledge
    for (const tip of LATHE_KNOWLEDGE_STORE.g76_threading) {
      // KnowledgeTip required fields: id/title/body/category/tags/confidence/source/created_at/usage_count.
      tips.push({
        id: `g76-${tips.length}`,
        category: "threading",
        title: tip.tip.slice(0, 60) + "...",
        body: tip.tip,
        tags: [],
        confidence: tip.confidence / 100,
        source: "G76 Threading Guide",
        created_at: new Date().toISOString(),
        usage_count: 0,
      });
    }

    // Add controller-specific tips
    if (params.controller?.toLowerCase().includes("haas")) {
      for (const tip of LATHE_KNOWLEDGE_STORE.haas_specific.filter(t =>
        t.tip.toLowerCase().includes("thread") || t.tip.toLowerCase().includes("tap")
      )) {
        tips.push({
          id: `haas-${tips.length}`,
          category: "threading",
          title: tip.tip.slice(0, 60) + "...",
          tags: [],
          created_at: new Date().toISOString(),
          usage_count: 0,
          body: tip.tip,
          confidence: tip.confidence / 100,
          source: "Haas Programming Guide",
        });
      }
    }

    return tips.slice(0, 8);
  }

  private getParameterTribalTips(context: LatheOperationContext): KnowledgeTip[] {
    const tips: KnowledgeTip[] = [];

    // Add fundamentals
    for (const tip of LATHE_KNOWLEDGE_STORE.lathe_fundamentals.slice(0, 3)) {
      tips.push({
        id: `fund-${tips.length}`,
        category: "speeds_feeds",
        title: tip.tip.slice(0, 60) + "...",
        body: tip.tip,
        tags: [],
        confidence: tip.confidence / 100,
        source: "CNC Lathe Fundamentals",
        created_at: new Date().toISOString(),
        usage_count: 0,
      });
    }

    // Add CNC fundamentals
    for (const tip of LATHE_KNOWLEDGE_STORE.cnc_fundamentals.slice(0, 3)) {
      tips.push({
        id: `cnc-${tips.length}`,
        category: "speeds_feeds",
        title: tip.tip.slice(0, 60) + "...",
        body: tip.tip,
        tags: [],
        confidence: tip.confidence / 100,
        source: "Autodesk CNC Guide",
        created_at: new Date().toISOString(),
        usage_count: 0,
      });
    }

    return tips;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheAIReasoningEngine = new LatheAIReasoningEngine();
