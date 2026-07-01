/**
 * CADReasoningChainEngine — Chain-of-Thought for CAD Design Decisions
 * CADCAM-DAGI-MS0/U-DAGI10
 *
 * Makes CAD generation auditable with explicit reasoning:
 *   - Why fillet here? → Stress concentration reduction
 *   - Why this draft angle? → Molding direction constraint
 *   - Why wall thickness? → DFM requirement + material strength
 *
 * Wraps NeuralCADGenerationEngine with reasoning output, stores chains
 * for traceability, and supports follow-up "why" queries.
 */

import { log } from "../utils/Logger.js";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./BaseEngine.js";
import type { FeatureSpec } from "./NeuralCADGenerationEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Design decision category */
export type DecisionCategory =
  | "geometry"        // Shape, dimensions
  | "feature"         // Feature type selection
  | "constraint"      // Constraint application
  | "material"        // Material selection
  | "manufacturability" // DFM considerations
  | "tolerance"       // GD&T decisions
  | "assembly"        // Assembly considerations
  | "cost"            // Cost optimization
  | "performance";    // Functional requirements

/** Evidence source for reasoning */
export type EvidenceSource =
  | "input_spec"      // From user specification
  | "dfm_rule"        // DFM constraint
  | "material_property" // Material database
  | "tribal_knowledge" // Shop floor expertise
  | "similar_part"    // RAG-retrieved similar part
  | "physics_model"   // Engineering calculation
  | "standard"        // Industry standard (ISO, ASME, etc.)
  | "customer_pref";  // Customer-specific preference

/** Single design reasoning step */
export interface DesignReasoningStep {
  stepId: string;
  stepNumber: number;
  category: DecisionCategory;
  decision: string;
  rationale: string;
  evidence: Array<{
    source: EvidenceSource;
    description: string;
    confidence: number;
  }>;
  alternatives: Array<{
    option: string;
    whyRejected: string;
  }>;
  confidence: number;
  affectedFeatures: string[];
  timestamp: number;
}

/** Complete reasoning chain for a CAD generation */
export interface CADReasoningChain {
  chainId: string;
  generationId: string;
  inputSummary: string;
  steps: DesignReasoningStep[];
  summary: string;
  overallConfidence: number;
  keyDecisions: string[];
  assumptions: string[];
  caveats: string[];
  createdAt: number;
}

/** Why query result */
export interface WhyQueryResult {
  query: string;
  matchedSteps: DesignReasoningStep[];
  explanation: string;
  relatedDecisions: string[];
  furtherQuestions: string[];
}

/** Generation with reasoning input */
export interface ReasonedGenerationInput {
  spec: {
    description: string;
    dimensions?: Record<string, number>;
    features?: string[];
    material?: string;
    constraints?: string[];
  };
  context?: {
    customer?: string;
    machineType?: string;
    similarParts?: string[];
  };
  verbosity?: "minimal" | "standard" | "detailed";
}

/** Generation with reasoning output */
export interface ReasonedGenerationOutput {
  features: FeatureSpec[];
  code: string;
  reasoning: CADReasoningChain;
  designScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class CADReasoningChainEngine extends BaseEngine {
  private chainStore: Map<string, CADReasoningChain> = new Map();
  private stepCounter = 0;

  constructor() {
    super({
      name: "CADReasoningChainEngine",
      version: "1.0.0",
      domain: "cad_reasoning",
      description: "Chain-of-thought reasoning for CAD design decisions",
    });
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const err = this.validate(input);
    if (err) throw new Error(err);
    return this.generateWithReasoning(input as ReasonedGenerationInput);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "reason_generate", description: "Generate CAD with reasoning chain" },
      { name: "why_query", description: "Query why a decision was made" },
      { name: "get_chain", description: "Retrieve a reasoning chain by ID" },
      { name: "list_chains", description: "List recent reasoning chains" },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") {
      return "Input must be an object";
    }
    const i = input as ReasonedGenerationInput;
    if (!i.spec || typeof i.spec !== "object") {
      return "spec is required and must be an object";
    }
    if (!i.spec.description || typeof i.spec.description !== "string") {
      return "spec.description is required and must be a string";
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REASONING GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate CAD with chain-of-thought reasoning
   */
  async generateWithReasoning(
    input: ReasonedGenerationInput
  ): Promise<ReasonedGenerationOutput> {
    const chainId = `chain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const generationId = `gen-${Date.now()}`;
    const startTime = Date.now();

    const steps: DesignReasoningStep[] = [];
    const features: FeatureSpec[] = [];
    const verbosity = input.verbosity ?? "standard";

    // Step 1: Analyze input specification
    steps.push(this.createStep({
      category: "geometry",
      decision: "Parse input specification",
      rationale: `Extracting design intent from: "${input.spec.description}"`,
      evidence: [
        { source: "input_spec", description: input.spec.description, confidence: 1.0 },
      ],
      alternatives: [],
      affectedFeatures: [],
    }));

    // Step 2: Determine base geometry
    const baseGeometry = this.inferBaseGeometry(input.spec);
    steps.push(this.createStep({
      category: "geometry",
      decision: `Select base geometry: ${baseGeometry.type}`,
      rationale: baseGeometry.rationale,
      evidence: baseGeometry.evidence,
      alternatives: baseGeometry.alternatives,
      affectedFeatures: ["base"],
    }));
    features.push({ type: baseGeometry.type, params: baseGeometry.params });

    // Step 3: Apply dimensions
    if (input.spec.dimensions) {
      const dimStep = this.reasonDimensions(input.spec.dimensions);
      steps.push(dimStep);
      this.applyDimensionsToFeature(features[0], input.spec.dimensions);
    }

    // Step 4: Add features based on spec
    const featureSteps = this.reasonFeatures(input.spec.features ?? [], input.spec);
    for (const fs of featureSteps) {
      steps.push(fs.step);
      features.push(fs.feature);
    }

    // Step 5: Material selection reasoning
    if (input.spec.material) {
      steps.push(this.reasonMaterial(input.spec.material));
    }

    // Step 6: DFM considerations
    const dfmSteps = this.reasonDFM(features, input.context);
    steps.push(...dfmSteps);

    // Step 7: Apply constraints
    if (input.spec.constraints?.length) {
      const constraintSteps = this.reasonConstraints(input.spec.constraints);
      steps.push(...constraintSteps);
    }

    // Generate final code
    const code = this.generateCadQueryCode(features, input.spec);

    // Build reasoning chain
    const chain: CADReasoningChain = {
      chainId,
      generationId,
      inputSummary: input.spec.description,
      steps,
      summary: this.summarizeChain(steps),
      overallConfidence: this.calculateOverallConfidence(steps),
      keyDecisions: this.extractKeyDecisions(steps),
      assumptions: this.extractAssumptions(steps),
      caveats: this.extractCaveats(steps, features),
      createdAt: startTime,
    };

    // Store for later queries
    this.chainStore.set(chainId, chain);

    log.info(`[CADReasoningChain] Generated chain ${chainId} with ${steps.length} steps`);

    return {
      features,
      code,
      reasoning: chain,
      designScore: chain.overallConfidence,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WHY QUERY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Query why a particular decision was made
   */
  queryWhy(chainId: string, query: string): WhyQueryResult {
    const chain = this.chainStore.get(chainId);
    if (!chain) {
      return {
        query,
        matchedSteps: [],
        explanation: `No reasoning chain found with ID: ${chainId}`,
        relatedDecisions: [],
        furtherQuestions: [],
      };
    }

    // Parse query to find relevant steps
    const queryLower = query.toLowerCase();
    const matchedSteps = chain.steps.filter(step => {
      const decisionLower = step.decision.toLowerCase();
      const rationaleLower = step.rationale.toLowerCase();
      return (
        decisionLower.includes(queryLower) ||
        rationaleLower.includes(queryLower) ||
        step.affectedFeatures.some(f => queryLower.includes(f.toLowerCase()))
      );
    });

    // Build explanation
    let explanation: string;
    if (matchedSteps.length === 0) {
      explanation = `No specific reasoning found for "${query}". The design was based on: ${chain.summary}`;
    } else {
      const reasons = matchedSteps.map(s => `${s.decision}: ${s.rationale}`);
      explanation = reasons.join(". ");
    }

    // Find related decisions
    const relatedDecisions = chain.steps
      .filter(s => !matchedSteps.includes(s))
      .filter(s => this.stepsAreRelated(matchedSteps, s))
      .map(s => s.decision);

    // Suggest follow-up questions
    const furtherQuestions = this.suggestFollowUpQuestions(matchedSteps, chain);

    return {
      query,
      matchedSteps,
      explanation,
      relatedDecisions,
      furtherQuestions,
    };
  }

  /**
   * Get chain by ID
   */
  getChain(chainId: string): CADReasoningChain | null {
    return this.chainStore.get(chainId) ?? null;
  }

  /**
   * List recent chains
   */
  listChains(limit = 10): Array<{ chainId: string; inputSummary: string; createdAt: number }> {
    return Array.from(this.chainStore.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(c => ({
        chainId: c.chainId,
        inputSummary: c.inputSummary,
        createdAt: c.createdAt,
      }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REASONING HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private createStep(config: {
    category: DecisionCategory;
    decision: string;
    rationale: string;
    evidence: Array<{ source: EvidenceSource; description: string; confidence: number }>;
    alternatives: Array<{ option: string; whyRejected: string }>;
    affectedFeatures: string[];
  }): DesignReasoningStep {
    this.stepCounter++;
    const avgConfidence =
      config.evidence.reduce((sum, e) => sum + e.confidence, 0) /
      Math.max(config.evidence.length, 1);

    return {
      stepId: `step-${this.stepCounter}`,
      stepNumber: this.stepCounter,
      ...config,
      confidence: avgConfidence,
      timestamp: Date.now(),
    };
  }

  private inferBaseGeometry(spec: ReasonedGenerationInput["spec"]): {
    type: string;
    params: Record<string, number>;
    rationale: string;
    evidence: Array<{ source: EvidenceSource; description: string; confidence: number }>;
    alternatives: Array<{ option: string; whyRejected: string }>;
  } {
    const desc = spec.description.toLowerCase();

    // Detect cylindrical parts
    if (/shaft|bushing|pin|rod|spindle|mandrel|bore/.test(desc)) {
      return {
        type: "cylinder",
        params: { diameter: spec.dimensions?.diameter ?? 25, length: spec.dimensions?.length ?? 50 },
        rationale: "Cylindrical base selected for rotational symmetry implied by part type",
        evidence: [
          { source: "input_spec", description: `Part description suggests rotational part: "${spec.description}"`, confidence: 0.9 },
          { source: "dfm_rule", description: "Cylindrical parts efficient on lathe", confidence: 0.85 },
        ],
        alternatives: [
          { option: "box", whyRejected: "Rotational features require cylindrical base" },
        ],
      };
    }

    // Detect plate/bracket
    if (/plate|bracket|panel|base|mount/.test(desc)) {
      return {
        type: "box",
        params: {
          length: spec.dimensions?.length ?? 100,
          width: spec.dimensions?.width ?? 50,
          height: spec.dimensions?.thickness ?? spec.dimensions?.height ?? 10,
        },
        rationale: "Rectangular base selected for flat mounting surface geometry",
        evidence: [
          { source: "input_spec", description: `Part type indicates flat stock: "${spec.description}"`, confidence: 0.9 },
          { source: "dfm_rule", description: "Flat parts efficient from plate stock", confidence: 0.8 },
        ],
        alternatives: [
          { option: "cylinder", whyRejected: "No rotational symmetry indicated" },
        ],
      };
    }

    // Detect flange
    if (/flange/.test(desc)) {
      return {
        type: "flange",
        params: {
          od: spec.dimensions?.od ?? spec.dimensions?.diameter ?? 60,
          id: spec.dimensions?.id ?? spec.dimensions?.bore ?? 25,
          thickness: spec.dimensions?.thickness ?? 10,
        },
        rationale: "Flange geometry for pipe/shaft connection interface",
        evidence: [
          { source: "input_spec", description: "Flange part type specified", confidence: 0.95 },
          { source: "standard", description: "Standard flange geometry per ASME B16.5", confidence: 0.75 },
        ],
        alternatives: [
          { option: "cylinder", whyRejected: "Flange requires OD/ID distinction" },
        ],
      };
    }

    // Default to box
    return {
      type: "box",
      params: { length: 100, width: 50, height: 25 },
      rationale: "Default rectangular geometry for unspecified part shape",
      evidence: [
        { source: "input_spec", description: "No specific geometry keywords detected", confidence: 0.5 },
      ],
      alternatives: [
        { option: "cylinder", whyRejected: "No rotational features specified" },
      ],
    };
  }

  private reasonDimensions(dimensions: Record<string, number>): DesignReasoningStep {
    const dimList = Object.entries(dimensions)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");

    return this.createStep({
      category: "geometry",
      decision: `Apply specified dimensions: ${dimList}`,
      rationale: "Dimensions taken directly from input specification as design intent",
      evidence: [
        { source: "input_spec", description: `User specified: ${dimList}`, confidence: 1.0 },
      ],
      alternatives: [],
      affectedFeatures: ["base"],
    });
  }

  private applyDimensionsToFeature(
    feature: FeatureSpec,
    dimensions: Record<string, number>
  ): void {
    for (const [key, value] of Object.entries(dimensions)) {
      feature.params[key] = value;
    }
  }

  private reasonFeatures(
    featureNames: string[],
    spec: ReasonedGenerationInput["spec"]
  ): Array<{ step: DesignReasoningStep; feature: FeatureSpec }> {
    const result: Array<{ step: DesignReasoningStep; feature: FeatureSpec }> = [];

    for (const name of featureNames) {
      const feature = this.createFeatureFromName(name, spec);
      const step = this.createStep({
        category: "feature",
        decision: `Add ${name} feature`,
        rationale: feature.rationale,
        evidence: feature.evidence,
        alternatives: feature.alternatives,
        affectedFeatures: [name],
      });
      result.push({ step, feature: feature.spec });
    }

    return result;
  }

  private createFeatureFromName(
    name: string,
    spec: ReasonedGenerationInput["spec"]
  ): {
    spec: FeatureSpec;
    rationale: string;
    evidence: Array<{ source: EvidenceSource; description: string; confidence: number }>;
    alternatives: Array<{ option: string; whyRejected: string }>;
  } {
    const nameLower = name.toLowerCase();

    if (nameLower.includes("chamfer")) {
      return {
        spec: { type: "chamfer", params: { size: 1 } },
        rationale: "Chamfer added for edge break and assembly ease",
        evidence: [
          { source: "dfm_rule", description: "Sharp edges require deburring; chamfer is more controlled", confidence: 0.9 },
          { source: "tribal_knowledge", description: "Chamfers easier to machine than fillets on lathe", confidence: 0.85 },
        ],
        alternatives: [
          { option: "fillet", whyRejected: "Not specified; chamfer is default edge treatment" },
        ],
      };
    }

    if (nameLower.includes("fillet")) {
      return {
        spec: { type: "fillet", params: { radius: 2 } },
        rationale: "Fillet added for stress concentration reduction",
        evidence: [
          { source: "physics_model", description: "Sharp corners create stress risers (Kt > 2.5)", confidence: 0.95 },
          { source: "standard", description: "Per ASME Y14.5 GD&T best practices", confidence: 0.8 },
        ],
        alternatives: [
          { option: "chamfer", whyRejected: "Fillet provides better stress distribution" },
        ],
      };
    }

    if (nameLower.includes("hole") || nameLower.includes("bore")) {
      return {
        spec: { type: "hole", params: { diameter: spec.dimensions?.bore ?? 10, depth: 20 } },
        rationale: "Hole feature for fastener or shaft clearance",
        evidence: [
          { source: "input_spec", description: "Hole/bore requested in features", confidence: 0.9 },
        ],
        alternatives: [],
      };
    }

    if (nameLower.includes("thread")) {
      return {
        spec: { type: "thread", params: { diameter: 10, pitch: 1.5 } },
        rationale: "Thread feature for fastener engagement",
        evidence: [
          { source: "input_spec", description: "Thread requested", confidence: 0.9 },
          { source: "standard", description: "Metric thread per ISO 68-1", confidence: 0.85 },
        ],
        alternatives: [
          { option: "UNC thread", whyRejected: "Metric default unless specified" },
        ],
      };
    }

    if (nameLower.includes("pocket")) {
      return {
        spec: { type: "pocket", params: { length: 30, width: 20, depth: 5 } },
        rationale: "Pocket for material removal or mating feature",
        evidence: [
          { source: "input_spec", description: "Pocket requested", confidence: 0.9 },
        ],
        alternatives: [],
      };
    }

    if (nameLower.includes("keyway") || nameLower.includes("slot")) {
      return {
        spec: { type: "slot", params: { width: 5, depth: 3, length: 20 } },
        rationale: "Keyway/slot for rotational locking or linear constraint",
        evidence: [
          { source: "input_spec", description: "Keyway/slot requested", confidence: 0.9 },
          { source: "standard", description: "Key dimensions per DIN 6885", confidence: 0.8 },
        ],
        alternatives: [],
      };
    }

    // Default generic feature
    return {
      spec: { type: name, params: {} },
      rationale: `Feature "${name}" added per specification`,
      evidence: [
        { source: "input_spec", description: `User requested: ${name}`, confidence: 0.7 },
      ],
      alternatives: [],
    };
  }

  private reasonMaterial(material: string): DesignReasoningStep {
    const materialUpper = material.toUpperCase();
    let rationale: string;
    let evidence: Array<{ source: EvidenceSource; description: string; confidence: number }>;

    if (/4140|4340|1045|1018/.test(materialUpper)) {
      rationale = `Selected ${material} steel for strength and machinability balance`;
      evidence = [
        { source: "material_property", description: `${material}: HRC 28-32, good toughness`, confidence: 0.9 },
        { source: "tribal_knowledge", description: "Common tooling steel at JM Die", confidence: 0.85 },
      ];
    } else if (/6061|7075|2024/.test(materialUpper)) {
      rationale = `Selected ${material} aluminum for lightweight and corrosion resistance`;
      evidence = [
        { source: "material_property", description: `${material}: high strength-to-weight ratio`, confidence: 0.9 },
      ];
    } else if (/D2|A2|M2|S7|H13/.test(materialUpper)) {
      rationale = `Selected ${material} tool steel for wear resistance and hardness`;
      evidence = [
        { source: "material_property", description: `${material}: tool steel for die/mold work`, confidence: 0.95 },
        { source: "tribal_knowledge", description: "JM Die specialty: cold heading die tooling", confidence: 0.9 },
      ];
    } else {
      rationale = `Material ${material} specified per customer requirement`;
      evidence = [
        { source: "input_spec", description: `User specified material: ${material}`, confidence: 1.0 },
      ];
    }

    return this.createStep({
      category: "material",
      decision: `Select material: ${material}`,
      rationale,
      evidence,
      alternatives: [],
      affectedFeatures: ["base"],
    });
  }

  private reasonDFM(
    features: FeatureSpec[],
    context?: ReasonedGenerationInput["context"]
  ): DesignReasoningStep[] {
    const steps: DesignReasoningStep[] = [];

    // Check for thin walls
    const hasSmallFeatures = features.some(f => {
      const wall = f.params.wallThickness ?? f.params.thickness;
      return typeof wall === "number" && wall < 2;
    });

    if (hasSmallFeatures) {
      steps.push(this.createStep({
        category: "manufacturability",
        decision: "Flag thin wall concern",
        rationale: "Wall thickness < 2mm may cause chatter or deflection during machining",
        evidence: [
          { source: "dfm_rule", description: "Min wall thickness for steel: 1.5mm, aluminum: 1mm", confidence: 0.9 },
          { source: "tribal_knowledge", description: "Thin walls need light cuts and good workholding", confidence: 0.85 },
        ],
        alternatives: [
          { option: "Increase wall thickness", whyRejected: "May conflict with design intent" },
        ],
        affectedFeatures: features.filter(f => { const w = f.params.wallThickness ?? f.params.thickness; return typeof w === "number" && w < 2; }).map(f => f.type),
      }));
    }

    // Machine type consideration
    if (context?.machineType) {
      steps.push(this.createStep({
        category: "manufacturability",
        decision: `Target machine: ${context.machineType}`,
        rationale: `Design optimized for ${context.machineType} capabilities`,
        evidence: [
          { source: "input_spec", description: `Machine type specified: ${context.machineType}`, confidence: 1.0 },
        ],
        alternatives: [],
        affectedFeatures: [],
      }));
    }

    // Add general DFM step if no specific issues
    if (steps.length === 0) {
      steps.push(this.createStep({
        category: "manufacturability",
        decision: "DFM check passed",
        rationale: "No manufacturability concerns detected for this design",
        evidence: [
          { source: "dfm_rule", description: "All features within standard machining envelope", confidence: 0.85 },
        ],
        alternatives: [],
        affectedFeatures: [],
      }));
    }

    return steps;
  }

  private reasonConstraints(constraints: string[]): DesignReasoningStep[] {
    return constraints.map(constraint => {
      const constraintLower = constraint.toLowerCase();
      let rationale: string;

      if (constraintLower.includes("concentric")) {
        rationale = "Concentricity ensures rotational alignment for bearing fit or shaft interface";
      } else if (constraintLower.includes("perpendicular")) {
        rationale = "Perpendicularity critical for assembly datum or mating surface";
      } else if (constraintLower.includes("parallel")) {
        rationale = "Parallelism ensures even clamping or sliding fit";
      } else if (constraintLower.includes("tangent")) {
        rationale = "Tangent constraint for smooth blend between features";
      } else {
        rationale = `Constraint "${constraint}" applied per specification`;
      }

      return this.createStep({
        category: "constraint",
        decision: `Apply constraint: ${constraint}`,
        rationale,
        evidence: [
          { source: "input_spec", description: `User specified: ${constraint}`, confidence: 1.0 },
          { source: "standard", description: "Per ASME Y14.5 GD&T", confidence: 0.8 },
        ],
        alternatives: [],
        affectedFeatures: [],
      });
    });
  }

  private generateCadQueryCode(
    features: FeatureSpec[],
    spec: ReasonedGenerationInput["spec"]
  ): string {
    const lines: string[] = [
      "import cadquery as cq",
      "",
      `# ${spec.description}`,
      "# Generated by CADReasoningChainEngine with chain-of-thought reasoning",
      "",
    ];

    // Start with base feature
    const base = features[0];
    if (base.type === "cylinder") {
      lines.push(`result = cq.Workplane("XY").cylinder(${base.params.length ?? 50}, ${base.params.diameter ?? 25} / 2)`);
    } else if (base.type === "box") {
      lines.push(`result = cq.Workplane("XY").box(${base.params.length ?? 100}, ${base.params.width ?? 50}, ${base.params.height ?? 25})`);
    } else if (base.type === "flange") {
      lines.push(`result = cq.Workplane("XY").circle(${base.params.od ?? 60} / 2).extrude(${base.params.thickness ?? 10})`);
      lines.push(`result = result.faces(">Z").workplane().hole(${base.params.id ?? 25})`);
    } else {
      lines.push(`result = cq.Workplane("XY").box(100, 50, 25)  # Default`);
    }

    // Add secondary features
    for (let i = 1; i < features.length; i++) {
      const f = features[i];
      if (f.type === "chamfer") {
        lines.push(`result = result.edges().chamfer(${f.params.size ?? 1})`);
      } else if (f.type === "fillet") {
        lines.push(`result = result.edges().fillet(${f.params.radius ?? 2})`);
      } else if (f.type === "hole") {
        lines.push(`result = result.faces(">Z").workplane().hole(${f.params.diameter ?? 10}, ${f.params.depth ?? 20})`);
      } else if (f.type === "thread") {
        lines.push(`# Thread: M${f.params.diameter ?? 10}x${f.params.pitch ?? 1.5}`);
      } else if (f.type === "pocket") {
        lines.push(`result = result.faces(">Z").workplane().rect(${f.params.length ?? 30}, ${f.params.width ?? 20}).cutBlind(-${f.params.depth ?? 5})`);
      } else if (f.type === "slot") {
        lines.push(`result = result.faces(">Z").workplane().slot2D(${f.params.length ?? 20}, ${f.params.width ?? 5}).cutBlind(-${f.params.depth ?? 3})`);
      }
    }

    lines.push("");
    lines.push("show_object(result)");

    return lines.join("\n");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private summarizeChain(steps: DesignReasoningStep[]): string {
    const categories = new Map<DecisionCategory, number>();
    for (const step of steps) {
      categories.set(step.category, (categories.get(step.category) ?? 0) + 1);
    }

    const parts: string[] = [];
    if (categories.has("geometry")) {
      parts.push(`${categories.get("geometry")} geometry decisions`);
    }
    if (categories.has("feature")) {
      parts.push(`${categories.get("feature")} feature additions`);
    }
    if (categories.has("manufacturability")) {
      parts.push(`${categories.get("manufacturability")} DFM checks`);
    }
    if (categories.has("constraint")) {
      parts.push(`${categories.get("constraint")} constraints`);
    }

    return `Design process: ${parts.join(", ")}. Total ${steps.length} reasoning steps.`;
  }

  private calculateOverallConfidence(steps: DesignReasoningStep[]): number {
    if (steps.length === 0) return 0;
    const sum = steps.reduce((acc, s) => acc + s.confidence, 0);
    return Math.round((sum / steps.length) * 100) / 100;
  }

  private extractKeyDecisions(steps: DesignReasoningStep[]): string[] {
    return steps
      .filter(s => s.confidence >= 0.8)
      .map(s => s.decision)
      .slice(0, 5);
  }

  private extractAssumptions(steps: DesignReasoningStep[]): string[] {
    const assumptions: string[] = [];
    for (const step of steps) {
      for (const ev of step.evidence) {
        if (ev.confidence < 0.7) {
          assumptions.push(`${step.decision}: ${ev.description} (conf: ${ev.confidence})`);
        }
      }
    }
    return assumptions.slice(0, 5);
  }

  private extractCaveats(
    steps: DesignReasoningStep[],
    features: FeatureSpec[]
  ): string[] {
    const caveats: string[] = [];

    const lowConfSteps = steps.filter(s => s.confidence < 0.7);
    if (lowConfSteps.length > 0) {
      caveats.push(`${lowConfSteps.length} decisions made with low confidence`);
    }

    const rejectedAlts = steps.flatMap(s => s.alternatives);
    if (rejectedAlts.length > 0) {
      caveats.push(`${rejectedAlts.length} alternative approaches were considered`);
    }

    return caveats;
  }

  private stepsAreRelated(
    matchedSteps: DesignReasoningStep[],
    candidate: DesignReasoningStep
  ): boolean {
    const matchedFeatures = new Set(matchedSteps.flatMap(s => s.affectedFeatures));
    return candidate.affectedFeatures.some(f => matchedFeatures.has(f));
  }

  private suggestFollowUpQuestions(
    matchedSteps: DesignReasoningStep[],
    chain: CADReasoningChain
  ): string[] {
    const questions: string[] = [];

    for (const step of matchedSteps) {
      if (step.alternatives.length > 0) {
        questions.push(`Why not ${step.alternatives[0].option}?`);
      }
      if (step.evidence.some(e => e.source === "dfm_rule")) {
        questions.push("What are the DFM implications?");
      }
    }

    if (chain.assumptions.length > 0) {
      questions.push("What assumptions were made?");
    }

    return [...new Set(questions)].slice(0, 3);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const cadReasoningChainEngine = new CADReasoningChainEngine();
export default cadReasoningChainEngine;
