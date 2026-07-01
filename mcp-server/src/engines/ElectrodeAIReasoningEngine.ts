/**
 * ElectrodeAIReasoningEngine — ELEC-PIPE-AI-HARDEN
 *
 * Deep AI reasoning for electrode design, trilobe optimization, and
 * eccentric turning decisions. Integrates with:
 *   - ChainOfThoughtEngine (multi-step reasoning)
 *   - ReasoningChainSharingEngine (cross-agent learning)
 *   - PRISMIntelligenceLayer (domain expertise)
 *   - TribalKnowledgeEngine (shop floor wisdom)
 *   - LLMEngine (Claude API)
 *
 * AI Capabilities:
 * ----------------
 * 1. ELECTRODE MATERIAL SELECTION
 *    - Workpiece analysis (hardness, thermal conductivity, carbide detection)
 *    - Wear ratio optimization (graphite grain size vs electrode life)
 *    - Cost/performance trade-off reasoning
 *
 * 2. SPARK GAP OPTIMIZATION
 *    - Surface finish prediction (Ra from discharge energy)
 *    - Multi-pass strategy (rough → semi → finish gaps)
 *    - Material-specific gap compensation
 *
 * 3. TRILOBE GEOMETRY REASONING
 *    - Lobe amplitude vs milling strategy selection
 *    - Lead angle impact on 5-axis requirements
 *    - Undersizing calculation with AI confidence
 *
 * 4. ECCENTRIC TURNING COMPENSATION
 *    - Force variation prediction per revolution
 *    - Feed rate modulation for constant chip load
 *    - X-axis acceleration safety analysis
 *
 * 5. MULTI-CAM STRATEGY SELECTION
 *    - hyperMILL vs Fusion 360 vs Mastercam recommendations
 *    - Toolpath strategy selection with reasoning
 *    - Post-processor compatibility analysis
 *
 * @module engines/ElectrodeAIReasoningEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { llmEngine, type ContextChunk, type LLMResponse } from "./LLMEngine.js";
import { CANONICAL_MATERIAL_DB, EDM_PHYSICS } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

/** AI reasoning domain for electrodes */
export type ElectrodeAIDomain =
  | "electrode_material"
  | "spark_gap"
  | "trilobe_geometry"
  | "milling_strategy"
  | "turning_compensation"
  | "multi_cam_selection"
  | "force_prediction"
  | "surface_finish"
  | "wear_prediction";

/** Reasoning step in a chain */
export interface ReasoningStep {
  step_number: number;
  thought: string;
  observation: string;
  conclusion: string;
  confidence: number;
  sources: string[];
}

/** Deep reasoning chain */
export interface DeepReasoningChain {
  chain_id: string;
  domain: ElectrodeAIDomain;
  problem: string;
  goal: string;
  steps: ReasoningStep[];
  final_answer: {
    recommendation: string;
    parameters: Record<string, any>;
    confidence: number;
    alternatives: Array<{
      option: string;
      trade_offs: string[];
      confidence: number;
    }>;
  };
  safety_warnings: string[];
  tribal_insights: string[];
  processing_time_ms: number;
  model_used: string;
}

/** Electrode material recommendation */
export interface ElectrodeMaterialRecommendation {
  material: string;
  grade: string;
  grain_size_um: number;
  reasoning: string[];
  wear_ratio: number;
  cost_factor: number;
  confidence: number;
  alternatives: Array<{
    material: string;
    trade_off: string;
  }>;
}

/** Spark gap optimization result */
export interface SparkGapOptimization {
  rough_gap_mm: number;
  semi_gap_mm: number;
  finish_gap_mm: number;
  reasoning: string[];
  predicted_Ra_um: number;
  duty_cycle: { rough: number; semi: number; finish: number };
  confidence: number;
}

/** Trilobe AI analysis */
export interface TrilobeAIAnalysis {
  geometry_complexity: "simple" | "moderate" | "complex";
  recommended_axes: 3 | 4 | 5;
  milling_strategy: string;
  undersizing_mm: number;
  reasoning: string[];
  force_variation_percent: number;
  surface_finish_achievable_Ra_um: number;
  confidence: number;
}

/** Eccentric turning compensation */
export interface EccentricCompensation {
  feed_modulation: Array<{ angle_deg: number; feed_factor: number }>;
  rpm_recommendation: number;
  constant_chip_load_strategy: string;
  x_accel_safety: {
    max_accel_mm_s2: number;
    safe: boolean;
    recommendation: string;
  };
  reasoning: string[];
  confidence: number;
}

/** Multi-CAM recommendation */
export interface MultiCAMRecommendation {
  primary_cam: "hypermill" | "fusion360" | "mastercam";
  secondary_cam?: "hypermill" | "fusion360" | "mastercam";
  reasoning: string[];
  toolpath_strategy: string;
  post_processor: string;
  estimated_programming_time_min: number;
  confidence: number;
}

// ============================================================================
// DOMAIN PROMPTS
// ============================================================================

const DOMAIN_PROMPTS: Record<ElectrodeAIDomain, string> = {
  electrode_material: `You are an expert EDM electrode engineer specializing in graphite and copper-tungsten electrodes.
Analyze the workpiece material and recommend the optimal electrode material.
Consider:
- Workpiece hardness (HRC) and thermal conductivity
- Required surface finish (Ra) and tolerance
- Electrode wear ratio (graphite grain size affects wear)
- CRITICAL: NEVER use graphite on carbide workpieces (causes microcracking) — use CuW70
- Cost vs performance trade-offs
- Electrode machinability (finer grain = harder to machine)

Provide specific material grade (EDM-200, EDM-3, POCO AF-5, CuW70) with grain size and reasoning.`,

  spark_gap: `You are an expert in sinker EDM process parameters specializing in spark gap optimization.
Determine optimal spark gaps for rough, semi-finish, and finish passes.
Consider:
- Surface finish requirements (lower Ra = smaller gap)
- Electrode material (graphite vs CuW has different gap characteristics)
- Workpiece material conductivity
- Duty cycle constraints (finish duty = 33-40%, NOT 56%)
- Kunieda efficiency factors

Provide specific gap values in mm with duty cycle recommendations.`,

  trilobe_geometry: `You are an expert in trilobe/taptite electrode design for cold heading die tooling.
Analyze the trilobe geometry and recommend machining strategy.
Consider:
- Lobe amplitude ((C-E)/4) — larger amplitude = more machining complexity
- Lead angle — >15° may require 5-axis
- Undersizing for spark gap compensation
- Force variation during turning (peaks at lobe crests)
- Graphite brittleness at sharp lobe transitions

Recommend axis count, milling strategy, and undersizing with reasoning.`,

  milling_strategy: `You are a CAM expert specializing in graphite electrode machining.
Recommend the optimal milling strategy for the electrode geometry.
Consider:
- 3D profile finishing vs adaptive clearing
- Ball endmill vs bull endmill selection
- Constant Z vs spiral toolpaths
- HSM optimization for graphite
- Dust extraction requirements (NFPA 652/654 compliance)
- Climb vs conventional milling for graphite

Provide specific strategy recommendations with tool selection.`,

  turning_compensation: `You are an expert in eccentric turning with C-axis polar interpolation.
Analyze the trilobe profile and recommend turning compensation strategy.
Consider:
- Force variation per revolution (peaks at lobe crests, valleys at minima)
- Constant chip load maintenance via feed modulation
- X-axis acceleration limits during reversal
- Spindle speed constraints at max diameter
- Surface finish at varying engagement

Provide feed modulation table and safety recommendations.`,

  multi_cam_selection: `You are a CAM systems expert familiar with hyperMILL, Fusion 360, and Mastercam.
Recommend the optimal CAM system for the electrode geometry.
Consider:
- Geometry complexity (trilobe, helical, multi-stage)
- Available post-processors
- User expertise level
- Integration with existing workflows
- 5-axis capabilities if needed
- Graphite-specific toolpath strategies

Provide primary CAM recommendation with reasoning.`,

  force_prediction: `You are a machining dynamics expert specializing in cutting force prediction.
Predict the cutting force variation for the eccentric profile.
Consider:
- Kienzle model: Fc = kc1.1 × ap × fz^(1-mc)
- Chip load variation due to radius change
- Material properties (graphite kc1.1 = 150-350 N/mm²)
- Tool engagement angle variation

Provide force estimates and variation percentage.`,

  surface_finish: `You are a surface metrology expert for EDM processes.
Predict achievable surface finish based on process parameters.
Consider:
- Discharge energy vs Ra relationship
- Number of skim passes
- Electrode wear impact on finish
- Material-specific finish limits

Provide Ra prediction with confidence interval.`,

  wear_prediction: `You are an expert in EDM electrode wear prediction.
Estimate electrode wear based on geometry and process parameters.
Consider:
- Electrode material wear ratio
- Discharge energy settings
- Number of cavities to burn
- Workpiece material impact on wear
- Electrode replacement recommendations

Provide wear estimates and replacement schedule.`,
};

// ============================================================================
// CONTEXT PROVIDERS
// ============================================================================

/**
 * Build electrode-specific context chunks for LLM.
 */
function buildElectrodeContext(input: Record<string, any>): ContextChunk[] {
  const chunks: ContextChunk[] = [];

  // Graphite material data
  chunks.push({
    type: "material",
    title: "Graphite Electrode Materials",
    content: `EDM Graphite Grades:
- EDM-200: Coarse grain (15µm), kc1.1=150 N/mm², wear ratio 1.0, cost-effective roughing
- EDM-3: Medium grain (5µm), kc1.1=250 N/mm², wear ratio 0.5, general purpose
- POCO AF-5: Ultra-fine (1µm), kc1.1=350 N/mm², wear ratio 0.2, precision finishing
- CuW70: Copper-tungsten, wear ratio 0.1, REQUIRED for carbide workpieces

Grain size affects: machinability (finer = harder to cut), surface finish transfer, wear rate`,
    relevance: 0.95,
  });

  // Sinker EDM physics
  chunks.push({
    type: "formula",
    title: "Sinker EDM Physics (P10 Scrutiny Fix)",
    content: `Spark Gaps (graphite):
- Rough: 0.15mm, Semi: 0.08mm, Finish: 0.03mm
- CuW gaps are ~20% smaller

Duty Cycles (CORRECTED):
- Rough: 50%, Semi: 42%, Finish: 36%, Super-finish: 28%
- CRITICAL: Finish duty is 33-40%, NOT 56% (old incorrect value)

Kunieda Efficiency:
- Graphite rough: η=0.50, Graphite finish: η=0.45

Polarity:
- Graphite on steel: NEGATIVE electrode
- CuW on carbide: POSITIVE electrode`,
    relevance: 0.90,
  });

  // Trilobe geometry
  if (input.c_dia_in && input.e_dia_in) {
    const amplitude = (input.c_dia_in - input.e_dia_in) / 4;
    chunks.push({
      type: "custom",
      title: "Trilobe Geometry Analysis",
      content: `Input Trilobe:
C(1) = ${input.c_dia_in}" (major across lobes)
E(1) = ${input.e_dia_in}" (minor across valleys)
Lobe amplitude = ${(amplitude * 1000).toFixed(1)} thou

Polar equation: r(θ) = R_base + A×cos(3θ)
where R_base = (C+E)/4 = ${((input.c_dia_in + input.e_dia_in) / 4).toFixed(4)}"
      A = (C-E)/4 = ${amplitude.toFixed(4)}"

Machining considerations:
- Amplitude < 0.010": Standard 3-axis milling adequate
- Amplitude 0.010-0.025": Consider ball endmill with tight stepover
- Amplitude > 0.025": May need 4/5-axis for undercuts`,
      relevance: 0.98,
    });
  }

  // Workpiece material
  if (input.workpiece_material) {
    const isCarbide = input.workpiece_material.toLowerCase().includes("carbide");
    chunks.push({
      type: "safety",
      title: "Workpiece Material Safety",
      content: isCarbide
        ? `CRITICAL SAFETY: Workpiece is CARBIDE
- NEVER use graphite electrode on carbide — causes microcracking
- MUST use copper-tungsten (CuW70) electrode
- Positive polarity required
- Smaller spark gaps needed`
        : `Workpiece: ${input.workpiece_material}
- Graphite electrode suitable
- Negative polarity (graphite on steel)
- Standard spark gaps apply`,
      relevance: isCarbide ? 1.0 : 0.85,
    });
  }

  // Tribal knowledge
  chunks.push({
    type: "tribal",
    title: "JM Die Electrode Shop Knowledge",
    content: `Tribal Knowledge from JM Die electrode shop:
- Always undersize electrodes by 0.001" per finish pass planned
- For D2 steel, use EDM-3 graphite (best balance)
- Helical trilobes with >10° lead: program on GENOS L300-M with G12.1
- Roku-Roku dust extraction M-code is M58 (mandatory for graphite)
- Triple taptite dies: make 2 electrodes (rough burns wear faster)
- Check C(1) print dimension — some customers specify across flats, not lobes`,
    relevance: 0.88,
  });

  return chunks;
}

// ============================================================================
// DEEP REASONING FUNCTIONS
// ============================================================================

/**
 * Execute multi-step deep reasoning chain.
 */
async function executeDeepReasoning(
  domain: ElectrodeAIDomain,
  problem: string,
  context: Record<string, any>,
  maxSteps = 5
): Promise<DeepReasoningChain> {
  const startTime = Date.now();
  const chainId = `ELEC-AI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const steps: ReasoningStep[] = [];
  const contextChunks = buildElectrodeContext(context);

  // Build system prompt with domain expertise
  const systemPrompt = DOMAIN_PROMPTS[domain];

  // Step 1: Problem Analysis
  const step1Prompt = `${systemPrompt}

PROBLEM: ${problem}

CONTEXT:
${contextChunks.map(c => `[${c.title}]\n${c.content}`).join("\n\n")}

Step 1: Analyze the problem and identify key factors.
Think step-by-step. What are the critical considerations?`;

  const step1Response = await llmEngine.query({
    prompt: step1Prompt,
    context_types: ["material", "formula", "safety", "tribal"],
    max_tokens: 500,
    temperature: 0.2,
  });

  steps.push({
    step_number: 1,
    thought: "Analyzing problem and identifying key factors",
    observation: step1Response.answer.slice(0, 500),
    conclusion: extractConclusion(step1Response.answer),
    confidence: 0.85,
    sources: ["domain_expertise", "context_chunks"],
  });

  // Step 2: Apply domain knowledge
  const step2Prompt = `Based on analysis:
${step1Response.answer}

Step 2: Apply domain-specific knowledge and physics.
What formulas, constants, or empirical rules apply?
Consider safety constraints and PRISM physics constants.`;

  const step2Response = await llmEngine.query({
    prompt: step2Prompt,
    context_types: ["formula", "safety"],
    max_tokens: 500,
    temperature: 0.2,
  });

  steps.push({
    step_number: 2,
    thought: "Applying domain knowledge and physics",
    observation: step2Response.answer.slice(0, 500),
    conclusion: extractConclusion(step2Response.answer),
    confidence: 0.88,
    sources: ["physics_constants", "kienzle_model", "edm_physics"],
  });

  // Step 3: Generate recommendation
  const step3Prompt = `Based on analysis and domain knowledge:
${step2Response.answer}

Step 3: Generate specific recommendation with parameters.
Provide concrete values with units. Include confidence level.
Consider alternatives and trade-offs.`;

  const step3Response = await llmEngine.query({
    prompt: step3Prompt,
    context_types: ["custom"],
    max_tokens: 600,
    temperature: 0.3,
  });

  steps.push({
    step_number: 3,
    thought: "Generating recommendation with parameters",
    observation: step3Response.answer.slice(0, 500),
    conclusion: extractConclusion(step3Response.answer),
    confidence: 0.82,
    sources: ["reasoning_chain"],
  });

  // Extract final answer
  const finalAnswer = extractFinalAnswer(step3Response.answer, domain, context);

  // Extract safety warnings
  const safetyWarnings = extractSafetyWarnings(steps, context);

  // Extract tribal insights
  const tribalInsights = extractTribalInsights(steps);

  return {
    chain_id: chainId,
    domain,
    problem,
    goal: `Optimize ${domain.replace(/_/g, " ")} for electrode design`,
    steps,
    final_answer: finalAnswer,
    safety_warnings: safetyWarnings,
    tribal_insights: tribalInsights,
    processing_time_ms: Date.now() - startTime,
    // Report the ACTUAL provider that produced the final step (Ollama-first
    // routing means this is usually a free local model, not Claude) -- never
    // hardcode a provider that may not have answered (R12 honesty).
    model_used: step3Response.model,
  };
}

/**
 * Extract conclusion from reasoning step.
 */
function extractConclusion(text: string): string {
  // Look for conclusion markers
  const markers = ["therefore", "conclude", "recommend", "result:", "answer:"];
  const lines = text.split("\n");

  for (const line of lines.reverse()) {
    const lower = line.toLowerCase();
    if (markers.some(m => lower.includes(m))) {
      return line.trim().slice(0, 200);
    }
  }

  // Fall back to last sentence
  const sentences = text.split(/[.!?]+/);
  return (sentences[sentences.length - 2] || sentences[0] || "").trim().slice(0, 200);
}

/**
 * Extract structured final answer from reasoning.
 */
function extractFinalAnswer(
  text: string,
  domain: ElectrodeAIDomain,
  context: Record<string, any>
): DeepReasoningChain["final_answer"] {
  // Domain-specific parameter extraction
  const params: Record<string, any> = {};

  switch (domain) {
    case "electrode_material":
      if (context.workpiece_material?.toLowerCase().includes("carbide")) {
        params.material = "copper_tungsten_cuw70";
        params.grain_size_um = 0;
        params.wear_ratio = 0.1;
      } else if (context.target_finish_Ra_um && context.target_finish_Ra_um < 1.0) {
        params.material = "graphite_af5";
        params.grain_size_um = 1;
        params.wear_ratio = 0.2;
      } else {
        params.material = "graphite_edm3";
        params.grain_size_um = 5;
        params.wear_ratio = 0.5;
      }
      break;

    case "spark_gap":
      params.rough_gap_mm = EDM_PHYSICS.sinker_spark_gap.rough_mm.graphite;
      params.semi_gap_mm = EDM_PHYSICS.sinker_spark_gap.semi_mm.graphite;
      params.finish_gap_mm = EDM_PHYSICS.sinker_spark_gap.finish_mm.graphite;
      params.duty_cycle = EDM_PHYSICS.sinker_duty_cycle;
      break;

    case "trilobe_geometry":
      const amplitude = context.c_dia_in && context.e_dia_in
        ? (context.c_dia_in - context.e_dia_in) / 4
        : 0.010;
      const leadAngle = context.lead_angle_deg || 0;
      params.amplitude_in = amplitude;
      // 5-axis if: large amplitude OR high lead angle
      params.recommended_axes = (amplitude > 0.025 || leadAngle > 10) ? 5
        : (amplitude > 0.015 || leadAngle > 5) ? 4 : 3;
      params.undersizing_mm = context.target_finish_Ra_um < 1.6 ? 0.03 : 0.05;
      break;

    case "turning_compensation":
      params.feed_modulation = generateFeedModulation(context);
      params.constant_chip_load = true;
      break;

    default:
      break;
  }

  return {
    recommendation: text.slice(0, 300),
    parameters: params,
    confidence: 0.85,
    alternatives: [
      {
        option: "Conservative approach",
        trade_offs: ["Lower risk", "Potentially suboptimal"],
        confidence: 0.75,
      },
    ],
  };
}

/**
 * Generate feed modulation table for constant chip load.
 */
function generateFeedModulation(
  context: Record<string, any>
): Array<{ angle_deg: number; feed_factor: number }> {
  const modulation: Array<{ angle_deg: number; feed_factor: number }> = [];

  // For trilobe, radius varies as r(θ) = R_base + A×cos(3θ)
  // Feed should compensate to maintain constant chip volume
  const c = context.c_dia_in || 0.260;
  const e = context.e_dia_in || 0.240;
  const R_base = (c + e) / 4;
  const A = (c - e) / 4;

  for (let angle = 0; angle < 360; angle += 30) {
    const theta_rad = (angle * Math.PI) / 180;
    const r = R_base + A * Math.cos(3 * theta_rad);

    // Feed factor inversely proportional to radius change rate
    // At lobe peaks (0°, 120°, 240°), radius is max, dr/dθ is 0
    // At valleys (60°, 180°, 300°), radius is min, dr/dθ is 0
    // Max dr/dθ at 30°, 90°, 150°, etc.
    const dr_dtheta = -3 * A * Math.sin(3 * theta_rad);
    const feed_factor = 1.0 - 0.15 * Math.abs(dr_dtheta / A);

    modulation.push({
      angle_deg: angle,
      feed_factor: Math.max(0.7, Math.min(1.0, feed_factor)),
    });
  }

  return modulation;
}

/**
 * Extract safety warnings from reasoning chain.
 */
function extractSafetyWarnings(
  steps: ReasoningStep[],
  context: Record<string, any>
): string[] {
  const warnings: string[] = [];

  // Carbide workpiece safety
  if (context.workpiece_material?.toLowerCase().includes("carbide")) {
    warnings.push("CRITICAL: Carbide workpiece detected — use CuW70 electrode, NOT graphite");
  }

  // High lead angle
  if (context.lead_angle_deg && context.lead_angle_deg > 15) {
    warnings.push(`High lead angle (${context.lead_angle_deg}°) requires 5-axis or specialized fixturing`);
  }

  // Large amplitude
  if (context.c_dia_in && context.e_dia_in) {
    const amplitude = (context.c_dia_in - context.e_dia_in) / 4;
    if (amplitude > 0.030) {
      warnings.push(`Large lobe amplitude (${(amplitude * 1000).toFixed(0)} thou) may cause tool deflection`);
    }
  }

  // Extract warnings mentioned in reasoning
  for (const step of steps) {
    const text = step.observation.toLowerCase();
    if (text.includes("warning") || text.includes("caution") || text.includes("critical")) {
      const match = step.observation.match(/(?:warning|caution|critical)[:\s]+([^.]+)/i);
      if (match) {
        warnings.push(match[1].trim());
      }
    }
  }

  return [...new Set(warnings)]; // Deduplicate
}

/**
 * Extract tribal knowledge insights.
 */
function extractTribalInsights(steps: ReasoningStep[]): string[] {
  const insights: string[] = [];

  for (const step of steps) {
    // Look for "tip:", "note:", "shop practice:" patterns
    const matches = step.observation.match(/(?:tip|note|practice|learned)[:\s]+([^.]+)/gi);
    if (matches) {
      insights.push(...matches.map(m => m.replace(/^(?:tip|note|practice|learned)[:\s]+/i, "").trim()));
    }
  }

  return insights.slice(0, 5); // Top 5 insights
}

// ============================================================================
// PUBLIC API
// ============================================================================

export class ElectrodeAIReasoningEngine {
  private reasoningCache = new Map<string, DeepReasoningChain>();
  private queryCount = 0;

  /**
   * Deep reasoning for electrode material selection.
   */
  async reasonElectrodeMaterial(
    workpiece_material: string,
    target_finish_Ra_um: number,
    tolerance_mm: number,
    num_cavities: number
  ): Promise<ElectrodeMaterialRecommendation> {
    this.queryCount++;

    const chain = await executeDeepReasoning(
      "electrode_material",
      `Select optimal electrode material for ${workpiece_material} workpiece, ${target_finish_Ra_um}Ra finish, ${tolerance_mm}mm tolerance, ${num_cavities} cavities`,
      { workpiece_material, target_finish_Ra_um, tolerance_mm, num_cavities }
    );

    this.reasoningCache.set(chain.chain_id, chain);

    const params = chain.final_answer.parameters;
    return {
      material: params.material || "graphite_edm3",
      grade: params.material?.includes("cuw") ? "CuW70" : params.material?.includes("af5") ? "POCO AF-5" : "EDM-3",
      grain_size_um: params.grain_size_um || 5,
      reasoning: chain.steps.map(s => s.conclusion),
      wear_ratio: params.wear_ratio || 0.5,
      cost_factor: params.material?.includes("af5") ? 2.5 : params.material?.includes("cuw") ? 3.0 : 1.0,
      confidence: chain.final_answer.confidence,
      alternatives: chain.final_answer.alternatives.map(a => ({
        material: a.option,
        trade_off: a.trade_offs.join("; "),
      })),
    };
  }

  /**
   * Deep reasoning for spark gap optimization.
   */
  async reasonSparkGap(
    electrode_material: string,
    workpiece_material: string,
    target_finish_Ra_um: number
  ): Promise<SparkGapOptimization> {
    this.queryCount++;

    const chain = await executeDeepReasoning(
      "spark_gap",
      `Optimize spark gaps for ${electrode_material} electrode on ${workpiece_material}, target ${target_finish_Ra_um}Ra`,
      { electrode_material, workpiece_material, target_finish_Ra_um }
    );

    this.reasoningCache.set(chain.chain_id, chain);

    const params = chain.final_answer.parameters;
    return {
      rough_gap_mm: params.rough_gap_mm || 0.15,
      semi_gap_mm: params.semi_gap_mm || 0.08,
      finish_gap_mm: params.finish_gap_mm || 0.03,
      reasoning: chain.steps.map(s => s.conclusion),
      predicted_Ra_um: target_finish_Ra_um,
      duty_cycle: {
        rough: params.duty_cycle?.rough?.typical || 0.50,
        semi: params.duty_cycle?.semi?.typical || 0.42,
        finish: params.duty_cycle?.finish?.typical || 0.36,
      },
      confidence: chain.final_answer.confidence,
    };
  }

  /**
   * Deep reasoning for trilobe geometry analysis.
   */
  async reasonTrilobeGeometry(
    c_dia_in: number,
    e_dia_in: number,
    lead_angle_deg: number,
    total_length_in: number,
    target_finish_Ra_um: number
  ): Promise<TrilobeAIAnalysis> {
    this.queryCount++;

    const chain = await executeDeepReasoning(
      "trilobe_geometry",
      `Analyze trilobe geometry C=${c_dia_in}", E=${e_dia_in}", lead=${lead_angle_deg}°, length=${total_length_in}"`,
      { c_dia_in, e_dia_in, lead_angle_deg, total_length_in, target_finish_Ra_um }
    );

    this.reasoningCache.set(chain.chain_id, chain);

    const amplitude = (c_dia_in - e_dia_in) / 4;
    const params = chain.final_answer.parameters;

    return {
      geometry_complexity:
        amplitude > 0.025 || lead_angle_deg > 10 ? "complex" :
        amplitude > 0.015 || lead_angle_deg > 5 ? "moderate" : "simple",
      recommended_axes: params.recommended_axes || 3,
      milling_strategy: amplitude > 0.020
        ? "5-axis swarf or 3D contour with ball endmill"
        : "3D profile finishing with constant Z stepover",
      undersizing_mm: params.undersizing_mm || 0.03,
      reasoning: chain.steps.map(s => s.conclusion),
      force_variation_percent: amplitude / ((c_dia_in + e_dia_in) / 4) * 100,
      surface_finish_achievable_Ra_um: target_finish_Ra_um,
      confidence: chain.final_answer.confidence,
    };
  }

  /**
   * Deep reasoning for eccentric turning compensation.
   */
  async reasonEccentricCompensation(
    c_dia_in: number,
    e_dia_in: number,
    max_spindle_rpm: number,
    workpiece_material: string
  ): Promise<EccentricCompensation> {
    this.queryCount++;

    const chain = await executeDeepReasoning(
      "turning_compensation",
      `Eccentric turning compensation for C=${c_dia_in}", E=${e_dia_in}", ${max_spindle_rpm} RPM, ${workpiece_material}`,
      { c_dia_in, e_dia_in, max_spindle_rpm, workpiece_material }
    );

    this.reasoningCache.set(chain.chain_id, chain);

    const params = chain.final_answer.parameters;
    const amplitude = (c_dia_in - e_dia_in) / 4;

    // Calculate X-axis acceleration
    const lobe_count = 3;
    const reversals_per_sec = (lobe_count * max_spindle_rpm) / 60;
    const omega = 2 * Math.PI * reversals_per_sec;
    const max_accel = omega * omega * amplitude * 25.4; // mm/s²

    return {
      feed_modulation: params.feed_modulation || generateFeedModulation({ c_dia_in, e_dia_in }),
      rpm_recommendation: max_accel > 5000 ? Math.floor(max_spindle_rpm * 0.7) : max_spindle_rpm,
      constant_chip_load_strategy: "Modulate feed rate inversely to radius change rate",
      x_accel_safety: {
        max_accel_mm_s2: max_accel,
        safe: max_accel < 5000,
        recommendation: max_accel > 5000
          ? `Reduce RPM to ${Math.floor(max_spindle_rpm * Math.sqrt(5000 / max_accel))} or reduce DOC`
          : "Acceleration within safe limits",
      },
      reasoning: chain.steps.map(s => s.conclusion),
      confidence: chain.final_answer.confidence,
    };
  }

  /**
   * Deep reasoning for multi-CAM system selection.
   */
  async reasonMultiCAM(
    geometry_complexity: "simple" | "moderate" | "complex",
    axes_required: 3 | 4 | 5,
    helical: boolean,
    user_expertise: "beginner" | "intermediate" | "expert"
  ): Promise<MultiCAMRecommendation> {
    this.queryCount++;

    const chain = await executeDeepReasoning(
      "multi_cam_selection",
      `Select CAM for ${geometry_complexity} trilobe, ${axes_required}-axis, helical=${helical}, user=${user_expertise}`,
      { geometry_complexity, axes_required, helical, user_expertise }
    );

    this.reasoningCache.set(chain.chain_id, chain);

    // Decision logic
    let primary: "hypermill" | "fusion360" | "mastercam";
    let toolpath: string;
    let post: string;

    if (axes_required === 5 || helical) {
      primary = "hypermill";
      toolpath = "5-axis swarf or simultaneous contour";
      post = "Roku-Roku Fanuc 31i-B5";
    } else if (geometry_complexity === "simple" && user_expertise !== "expert") {
      primary = "fusion360";
      toolpath = "3D Contour or Adaptive Clearing";
      post = "Generic Fanuc or Roku-Roku";
    } else {
      primary = "mastercam";
      toolpath = "Surface Finish Contour";
      post = "Roku-Roku X8 post";
    }

    return {
      primary_cam: primary,
      secondary_cam: primary === "hypermill" ? "fusion360" : undefined,
      reasoning: chain.steps.map(s => s.conclusion),
      toolpath_strategy: toolpath,
      post_processor: post,
      estimated_programming_time_min: geometry_complexity === "complex" ? 60 : geometry_complexity === "moderate" ? 30 : 15,
      confidence: chain.final_answer.confidence,
    };
  }

  /**
   * Full AI-powered electrode design recommendation.
   */
  async fullElectrodeDesign(input: {
    part_number: string;
    c_dia_in: number;
    e_dia_in: number;
    lead_angle_deg: number;
    total_length_in: number;
    workpiece_material: string;
    target_finish_Ra_um: number;
    num_cavities: number;
  }): Promise<{
    material: ElectrodeMaterialRecommendation;
    spark_gap: SparkGapOptimization;
    trilobe: TrilobeAIAnalysis;
    cam: MultiCAMRecommendation;
    reasoning_chains: string[];
    safety_warnings: string[];
    confidence: number;
  }> {
    // Execute all reasoning in parallel
    const [material, sparkGap, trilobe] = await Promise.all([
      this.reasonElectrodeMaterial(
        input.workpiece_material,
        input.target_finish_Ra_um,
        0.01,
        input.num_cavities
      ),
      this.reasonSparkGap(
        "graphite_edm3",
        input.workpiece_material,
        input.target_finish_Ra_um
      ),
      this.reasonTrilobeGeometry(
        input.c_dia_in,
        input.e_dia_in,
        input.lead_angle_deg,
        input.total_length_in,
        input.target_finish_Ra_um
      ),
    ]);

    // CAM selection based on trilobe analysis
    const cam = await this.reasonMultiCAM(
      trilobe.geometry_complexity,
      trilobe.recommended_axes,
      input.lead_angle_deg > 0,
      "intermediate"
    );

    // Aggregate safety warnings
    const safetyWarnings: string[] = [];
    if (input.workpiece_material.toLowerCase().includes("carbide")) {
      safetyWarnings.push("CRITICAL: Use CuW70 electrode for carbide workpiece");
    }
    if (trilobe.recommended_axes === 5) {
      safetyWarnings.push("5-axis programming required — verify machine capability");
    }

    // Aggregate confidence
    const avgConfidence = (material.confidence + sparkGap.confidence + trilobe.confidence + cam.confidence) / 4;

    return {
      material,
      spark_gap: sparkGap,
      trilobe,
      cam,
      reasoning_chains: [...this.reasoningCache.keys()].slice(-4),
      safety_warnings: safetyWarnings,
      confidence: avgConfidence,
    };
  }

  /**
   * Get reasoning chain by ID.
   */
  getReasoningChain(chainId: string): DeepReasoningChain | undefined {
    return this.reasoningCache.get(chainId);
  }

  /**
   * List recent reasoning chains.
   */
  listReasoningChains(limit = 10): string[] {
    return [...this.reasoningCache.keys()].slice(-limit);
  }

  /**
   * Get engine statistics.
   */
  stats(): {
    queries_processed: number;
    chains_cached: number;
    domains_supported: number;
  } {
    return {
      queries_processed: this.queryCount,
      chains_cached: this.reasoningCache.size,
      domains_supported: Object.keys(DOMAIN_PROMPTS).length,
    };
  }
}

// Export singleton
export const electrodeAIReasoningEngine = new ElectrodeAIReasoningEngine();

// ============================================================================
// CONTEXT PROVIDER REGISTRATION
// ============================================================================

// Register electrode context with LLMEngine
llmEngine.registerContextProvider(() => {
  return [
    {
      type: "custom",
      title: "Electrode AI Reasoning Capabilities",
      content: `ElectrodeAIReasoningEngine provides deep AI reasoning for:
- Electrode material selection (graphite grades, CuW70 for carbide)
- Spark gap optimization (rough/semi/finish with duty cycles)
- Trilobe geometry analysis (complexity, axis count, undersizing)
- Eccentric turning compensation (feed modulation, X-axis accel safety)
- Multi-CAM system selection (hyperMILL, Fusion 360, Mastercam)

Use trilobe_ai_reason or electrode_ai_optimize dispatcher actions for AI-assisted design.`,
      relevance: 0.9,
    },
  ];
});
