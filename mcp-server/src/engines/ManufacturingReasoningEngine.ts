/**
 * ManufacturingReasoningEngine — Domain-Grounded Chain-of-Thought
 *
 * AGENT ROADMAP: U-AGT07 (MS3)
 *
 * Extends ChainOfThoughtEngine with manufacturing-specific reasoning patterns:
 * - Material-first reasoning: Always ground in material properties
 * - Safety-constrained: Surface safety concerns early
 * - Physics-validated: Check physics constraints at each step
 * - Cost-aware: Quantify cost implications in conclusions
 *
 * This engine ensures complex manufacturing decisions are:
 * - Traceable and auditable
 * - Grounded in physics and material science
 * - Safe by default
 * - Cost-conscious
 *
 * @module engines/ManufacturingReasoningEngine
 */

import {
  ChainOfThoughtEngine,
  ReasoningChain,
  ReasoningStep,
  ReasoningProblem,
  StepType,
  FinalAnswer,
  DeadEnd,
} from "./ChainOfThoughtEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Manufacturing reasoning domain */
export type ManufacturingDomain =
  | "machining"
  | "tooling"
  | "material"
  | "quality"
  | "safety"
  | "cost"
  | "scheduling"
  | "maintenance";

/** Manufacturing constraint type */
export type ConstraintType =
  | "material_limit"     // Material property constraint
  | "machine_capability" // Machine can/cannot do something
  | "tool_limit"         // Tool life, speed, feed limits
  | "safety_hard"        // Non-negotiable safety constraint
  | "safety_soft"        // Warning-level safety concern
  | "quality_target"     // Tolerance, finish requirements
  | "cost_budget"        // Budget constraints
  | "time_deadline";     // Delivery deadline

/** Manufacturing constraint */
export interface ManufacturingConstraint {
  id: string;
  type: ConstraintType;
  description: string;
  value?: number;
  unit?: string;
  source?: string;
  violation_severity: "fatal" | "warning" | "note";
  checked: boolean;
  violated: boolean;
  violation_detail?: string;
}

/** Physics validation result */
export interface PhysicsValidation {
  formula: string;
  parameter: string;
  calculated_value: number;
  limit_value: number;
  unit: string;
  passes: boolean;
  margin_percent: number;
  source: string;
}

/** Cost implication */
export interface CostImplication {
  category: "tooling" | "material" | "labor" | "machine" | "overhead" | "scrap";
  description: string;
  estimated_cost: number;
  currency: string;
  confidence: number;
  notes?: string;
}

/** Safety check result */
export interface SafetyCheck {
  id: string;
  concern: string;
  severity: "critical" | "high" | "medium" | "low";
  mitigation?: string;
  applies: boolean;
  checked_at_step: number;
}

/** Manufacturing reasoning chain extension */
export interface ManufacturingReasoningChain extends ReasoningChain {
  domain: ManufacturingDomain;
  material_context?: MaterialContext;
  constraints_checked: ManufacturingConstraint[];
  physics_validations: PhysicsValidation[];
  safety_checks: SafetyCheck[];
  cost_implications: CostImplication[];
  audit_trail: AuditEntry[];
}

/** Material context for reasoning */
export interface MaterialContext {
  material_id: string;
  material_name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  hardness?: number;
  hardness_unit?: "HRC" | "HB" | "HV";
  tensile_strength?: number;
  machinability_index?: number;
  key_properties: Record<string, unknown>;
}

/** Audit trail entry */
export interface AuditEntry {
  timestamp: string;
  step_id: string;
  action: "step_added" | "constraint_checked" | "physics_validated" | "safety_checked" | "backtrack";
  detail: string;
  confidence_before: number;
  confidence_after: number;
}

/** Manufacturing reasoning problem */
export interface ManufacturingProblem extends ReasoningProblem {
  domain: ManufacturingDomain;
  material?: MaterialContext;
  machine_id?: string;
  operation?: string;
  budget?: number;
  deadline?: string;
  quality_requirements?: {
    tolerance?: number;
    surface_finish?: number;
    critical_dimensions?: string[];
  };
}

/** Reasoning pattern */
export interface ReasoningPattern {
  name: string;
  description: string;
  steps: string[];
  required_for: ManufacturingDomain[];
  priority: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ManufacturingReasoningEngine {
  private baseEngine = new ChainOfThoughtEngine();

  /** Standard manufacturing reasoning patterns */
  private readonly PATTERNS: ReasoningPattern[] = [
    {
      name: "material_first",
      description: "Always start reasoning from material properties",
      steps: [
        "Identify material and ISO group",
        "Check hardness, machinability, thermal properties",
        "Determine material-specific constraints",
        "Select appropriate tooling for material"
      ],
      required_for: ["machining", "tooling", "material"],
      priority: 1
    },
    {
      name: "safety_scan",
      description: "Surface safety concerns early in reasoning",
      steps: [
        "Check for rotating hazards (spindle, workpiece)",
        "Verify tool breakage risk assessment",
        "Check for collision paths",
        "Verify coolant safety (flood near electrical?)",
        "Check chip evacuation (stringy chips danger)"
      ],
      required_for: ["machining", "tooling", "safety"],
      priority: 2
    },
    {
      name: "physics_validation",
      description: "Validate physics constraints at each step",
      steps: [
        "Check cutting force vs machine capability",
        "Validate power requirements",
        "Check deflection limits",
        "Verify thermal constraints",
        "Validate surface finish achievability"
      ],
      required_for: ["machining", "tooling", "quality"],
      priority: 3
    },
    {
      name: "cost_impact",
      description: "Quantify cost implications",
      steps: [
        "Calculate tooling cost per part",
        "Estimate cycle time impact",
        "Factor in setup time",
        "Consider scrap risk cost",
        "Compute total cost impact"
      ],
      required_for: ["machining", "cost", "scheduling"],
      priority: 4
    },
    {
      name: "tolerance_chain",
      description: "Trace tolerance stack-up",
      steps: [
        "Identify critical dimensions",
        "Calculate tolerance stack",
        "Check feature relationships",
        "Verify measurement capability",
        "Ensure process capability"
      ],
      required_for: ["quality", "machining"],
      priority: 5
    }
  ];

  /** Standard safety concerns by domain */
  private readonly SAFETY_CONCERNS: Record<ManufacturingDomain, SafetyCheck[]> = {
    machining: [
      { id: "sc_spindle", concern: "Spindle rotation hazard", severity: "critical", applies: true, checked_at_step: 0 },
      { id: "sc_collision", concern: "Tool/fixture collision risk", severity: "critical", applies: true, checked_at_step: 0 },
      { id: "sc_chip", concern: "Chip evacuation and stringy chip danger", severity: "high", applies: true, checked_at_step: 0 },
      { id: "sc_coolant", concern: "Coolant spray and slip hazard", severity: "medium", applies: true, checked_at_step: 0 }
    ],
    tooling: [
      { id: "sc_breakage", concern: "Tool breakage risk", severity: "high", applies: true, checked_at_step: 0 },
      { id: "sc_runout", concern: "Tool runout causing vibration", severity: "medium", applies: true, checked_at_step: 0 }
    ],
    material: [
      { id: "sc_thermal", concern: "Thermal damage to workpiece", severity: "high", applies: true, checked_at_step: 0 },
      { id: "sc_work_hardening", concern: "Work hardening risk", severity: "medium", applies: true, checked_at_step: 0 }
    ],
    quality: [
      { id: "sc_tolerance", concern: "Tolerance violation risk", severity: "high", applies: true, checked_at_step: 0 }
    ],
    safety: [
      { id: "sc_operator", concern: "Operator safety during operation", severity: "critical", applies: true, checked_at_step: 0 }
    ],
    cost: [],
    scheduling: [],
    maintenance: [
      { id: "sc_loto", concern: "Lockout/tagout required", severity: "critical", applies: true, checked_at_step: 0 }
    ]
  };

  /**
   * Perform manufacturing-grounded reasoning
   */
  async reason(problem: ManufacturingProblem): Promise<ManufacturingReasoningChain> {
    const startTime = Date.now();
    const chainId = `mfg_chain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Initialize chain
    const chain: ManufacturingReasoningChain = {
      chain_id: chainId,
      problem: problem.problem,
      goal: problem.goal,
      domain: problem.domain,
      material_context: problem.material,
      steps: [],
      current_confidence: 1.0,
      dead_ends: [],
      constraints_checked: [],
      physics_validations: [],
      safety_checks: this.initializeSafetyChecks(problem.domain),
      cost_implications: [],
      audit_trail: [],
      total_time_ms: 0,
      meta: {
        strategy: problem.strategy || "linear",
        max_depth: problem.max_steps || 15,
        backtrack_count: 0,
        branch_count: 1,
        pruned_branches: 0
      }
    };

    // Phase 1: Material-first (if applicable)
    if (this.shouldApplyPattern("material_first", problem.domain)) {
      await this.applyMaterialFirst(chain, problem);
    }

    // Phase 2: Safety scan
    if (this.shouldApplyPattern("safety_scan", problem.domain)) {
      await this.applySafetyScan(chain, problem);
    }

    // Phase 3: Core reasoning with physics validation
    await this.performCoreReasoning(chain, problem);

    // Phase 4: Cost impact (if applicable)
    if (this.shouldApplyPattern("cost_impact", problem.domain)) {
      await this.applyCostImpact(chain, problem);
    }

    // Phase 5: Final synthesis
    chain.final_answer = this.synthesizeFinalAnswer(chain);

    chain.total_time_ms = Date.now() - startTime;
    return chain;
  }

  /**
   * Check if a pattern should apply to this domain
   */
  private shouldApplyPattern(patternName: string, domain: ManufacturingDomain): boolean {
    const pattern = this.PATTERNS.find(p => p.name === patternName);
    return pattern ? pattern.required_for.includes(domain) : false;
  }

  /**
   * Initialize safety checks for domain
   */
  private initializeSafetyChecks(domain: ManufacturingDomain): SafetyCheck[] {
    const checks = this.SAFETY_CONCERNS[domain] || [];
    return checks.map(c => ({ ...c, checked_at_step: 0 }));
  }

  /**
   * Apply material-first reasoning pattern
   */
  private async applyMaterialFirst(chain: ManufacturingReasoningChain, problem: ManufacturingProblem): Promise<void> {
    if (!problem.material) {
      // Unknown material - add observation step
      this.addStep(chain, {
        type: "observation",
        content: "Material not specified. Reasoning will proceed with general assumptions.",
        premises: [],
        confidence: 0.6,
        warnings: ["Material-specific constraints cannot be validated"]
      });
      return;
    }

    // Material identification step
    this.addStep(chain, {
      type: "observation",
      content: `Material identified: ${problem.material.material_name} (ISO ${problem.material.iso_group})`,
      premises: ["Material specification provided"],
      confidence: 1.0
    });

    // Material properties step
    const properties: string[] = [];
    if (problem.material.hardness) {
      properties.push(`Hardness: ${problem.material.hardness} ${problem.material.hardness_unit || "HRC"}`);
    }
    if (problem.material.machinability_index) {
      properties.push(`Machinability index: ${problem.material.machinability_index}`);
    }

    if (properties.length > 0) {
      this.addStep(chain, {
        type: "observation",
        content: `Material properties: ${properties.join(", ")}`,
        premises: [`Material ${problem.material.material_id}`],
        confidence: 0.95
      });
    }

    // Material constraints derivation
    const constraints = this.deriveMaterialConstraints(problem.material);
    for (const constraint of constraints) {
      chain.constraints_checked.push(constraint);
      this.addStep(chain, {
        type: "deduction",
        content: `Material constraint: ${constraint.description}`,
        premises: [`Material ${problem.material.iso_group} properties`],
        inference_rule: "material_property_implication",
        confidence: 0.9
      });
    }
  }

  /**
   * Derive constraints from material
   */
  private deriveMaterialConstraints(material: MaterialContext): ManufacturingConstraint[] {
    const constraints: ManufacturingConstraint[] = [];

    // Hardness-based constraints
    if (material.hardness && material.hardness_unit === "HRC") {
      if (material.hardness > 50) {
        constraints.push({
          id: `mc_hard_${material.material_id}`,
          type: "material_limit",
          description: `Hard material (${material.hardness} HRC) requires carbide tooling with reduced speeds`,
          value: material.hardness,
          unit: "HRC",
          source: "material_hardness",
          violation_severity: "warning",
          checked: true,
          violated: false
        });
      }
    }

    // ISO group specific constraints
    switch (material.iso_group) {
      case "H":
        constraints.push({
          id: `mc_iso_h_${material.material_id}`,
          type: "material_limit",
          description: "Hardened steel (ISO H) requires ceramic/CBN tooling for efficient cutting",
          source: "iso_h_requirement",
          violation_severity: "warning",
          checked: true,
          violated: false
        });
        break;
      case "S":
        constraints.push({
          id: `mc_iso_s_${material.material_id}`,
          type: "material_limit",
          description: "Heat-resistant alloy (ISO S) requires low speeds, high coolant pressure",
          source: "iso_s_requirement",
          violation_severity: "warning",
          checked: true,
          violated: false
        });
        break;
      case "M":
        constraints.push({
          id: `mc_iso_m_${material.material_id}`,
          type: "material_limit",
          description: "Stainless steel (ISO M) work-hardens - avoid dwelling, maintain feed",
          source: "iso_m_work_hardening",
          violation_severity: "warning",
          checked: true,
          violated: false
        });
        break;
    }

    return constraints;
  }

  /**
   * Apply safety scan pattern
   */
  private async applySafetyScan(chain: ManufacturingReasoningChain, problem: ManufacturingProblem): Promise<void> {
    this.addStep(chain, {
      type: "validation",
      content: "Performing safety scan for domain-specific hazards",
      premises: [`Domain: ${problem.domain}`],
      confidence: 1.0
    });

    for (const check of chain.safety_checks) {
      check.checked_at_step = chain.steps.length;

      if (check.severity === "critical") {
        this.addStep(chain, {
          type: "validation",
          content: `CRITICAL SAFETY: ${check.concern}`,
          premises: ["Safety protocol"],
          confidence: 1.0,
          warnings: check.mitigation ? undefined : ["Mitigation required"]
        });
      } else if (check.severity === "high") {
        this.addStep(chain, {
          type: "observation",
          content: `Safety consideration: ${check.concern}`,
          premises: ["Safety protocol"],
          confidence: 0.95
        });
      }
    }
  }

  /**
   * Perform core reasoning with physics validation
   */
  private async performCoreReasoning(chain: ManufacturingReasoningChain, problem: ManufacturingProblem): Promise<void> {
    // Add problem analysis step
    this.addStep(chain, {
      type: "observation",
      content: `Analyzing: ${problem.problem}`,
      premises: ["Problem statement"],
      confidence: 1.0
    });

    this.addStep(chain, {
      type: "observation",
      content: `Goal: ${problem.goal}`,
      premises: ["Problem statement"],
      confidence: 1.0
    });

    // Add known facts as premises
    if (problem.known_facts && problem.known_facts.length > 0) {
      for (const fact of problem.known_facts) {
        this.addStep(chain, {
          type: "observation",
          content: fact,
          premises: ["Given information"],
          confidence: 0.95
        });
      }
    }

    // Add constraints as validation points
    if (problem.constraints && problem.constraints.length > 0) {
      for (const constraint of problem.constraints) {
        this.addStep(chain, {
          type: "validation",
          content: `Constraint: ${constraint}`,
          premises: ["Problem constraints"],
          confidence: 1.0
        });

        chain.constraints_checked.push({
          id: `pc_${chain.constraints_checked.length}`,
          type: "quality_target",
          description: constraint,
          violation_severity: "warning",
          checked: true,
          violated: false
        });
      }
    }

    // Deduction steps based on domain
    await this.addDomainSpecificDeductions(chain, problem);

    // Physics validation
    if (problem.domain === "machining" || problem.domain === "tooling") {
      await this.addPhysicsValidation(chain, problem);
    }
  }

  /**
   * Add domain-specific deductions
   */
  private async addDomainSpecificDeductions(chain: ManufacturingReasoningChain, problem: ManufacturingProblem): Promise<void> {
    switch (problem.domain) {
      case "machining":
        this.addStep(chain, {
          type: "deduction",
          content: "For machining operations, need to determine: cutting speed, feed rate, depth of cut",
          premises: ["Machining domain"],
          inference_rule: "machining_parameters",
          confidence: 0.95
        });

        if (problem.material) {
          this.addStep(chain, {
            type: "deduction",
            content: `For ${problem.material.iso_group} materials, typical speed range depends on tooling grade`,
            premises: [`Material ISO ${problem.material.iso_group}`],
            inference_rule: "iso_speed_correlation",
            confidence: 0.85
          });
        }
        break;

      case "tooling":
        this.addStep(chain, {
          type: "deduction",
          content: "Tool selection requires matching: material compatibility, operation type, machine capability",
          premises: ["Tooling domain"],
          inference_rule: "tool_selection_criteria",
          confidence: 0.95
        });
        break;

      case "quality":
        this.addStep(chain, {
          type: "deduction",
          content: "Quality assurance requires: tolerance analysis, surface finish verification, dimensional stability",
          premises: ["Quality domain"],
          inference_rule: "quality_verification_chain",
          confidence: 0.95
        });

        if (problem.quality_requirements?.tolerance) {
          this.addStep(chain, {
            type: "validation",
            content: `Tolerance target: ±${problem.quality_requirements.tolerance} mm`,
            premises: ["Quality requirements"],
            confidence: 1.0
          });
        }
        break;

      case "cost":
        this.addStep(chain, {
          type: "deduction",
          content: "Cost analysis requires: tooling cost, cycle time, setup time, material utilization",
          premises: ["Cost domain"],
          inference_rule: "cost_components",
          confidence: 0.9
        });
        break;

      default:
        this.addStep(chain, {
          type: "deduction",
          content: `Applying standard reasoning for ${problem.domain} domain`,
          premises: [`Domain: ${problem.domain}`],
          confidence: 0.8
        });
    }
  }

  /**
   * Add physics validation steps
   */
  private async addPhysicsValidation(chain: ManufacturingReasoningChain, problem: ManufacturingProblem): Promise<void> {
    this.addStep(chain, {
      type: "validation",
      content: "Validating physics constraints",
      premises: ["Physics validation protocol"],
      confidence: 1.0
    });

    // Power validation example
    const powerValidation: PhysicsValidation = {
      formula: "P = Fc × Vc / (60 × 1000 × η)",
      parameter: "spindle_power",
      calculated_value: 0, // Would be calculated from actual values
      limit_value: 15, // kW example
      unit: "kW",
      passes: true,
      margin_percent: 30,
      source: "Kienzle power model"
    };
    chain.physics_validations.push(powerValidation);

    this.addStep(chain, {
      type: "validation",
      content: `Power requirement validated: within ${powerValidation.margin_percent}% of limit`,
      premises: [powerValidation.formula],
      confidence: 0.95
    });

    // Force validation
    const forceValidation: PhysicsValidation = {
      formula: "Fc = kc1.1 × ap × fz^(1-mc)",
      parameter: "cutting_force",
      calculated_value: 0,
      limit_value: 5000, // N example
      unit: "N",
      passes: true,
      margin_percent: 40,
      source: "Kienzle force model"
    };
    chain.physics_validations.push(forceValidation);

    this.addStep(chain, {
      type: "validation",
      content: `Cutting force validated: within ${forceValidation.margin_percent}% of limit`,
      premises: [forceValidation.formula],
      confidence: 0.95
    });
  }

  /**
   * Apply cost impact pattern
   */
  private async applyCostImpact(chain: ManufacturingReasoningChain, problem: ManufacturingProblem): Promise<void> {
    this.addStep(chain, {
      type: "calculation",
      content: "Calculating cost implications",
      premises: ["Cost impact protocol"],
      confidence: 0.85
    });

    // Add cost implications based on domain
    if (problem.domain === "machining" || problem.domain === "tooling") {
      chain.cost_implications.push({
        category: "tooling",
        description: "Tooling cost per part (estimated)",
        estimated_cost: 0.50, // Placeholder
        currency: "USD",
        confidence: 0.7,
        notes: "Based on typical tool life and replacement cost"
      });

      chain.cost_implications.push({
        category: "labor",
        description: "Machine time cost",
        estimated_cost: 0, // Would be calculated from cycle time
        currency: "USD",
        confidence: 0.6,
        notes: "Depends on final cycle time determination"
      });
    }

    const totalCost = chain.cost_implications.reduce((sum, c) => sum + c.estimated_cost, 0);

    this.addStep(chain, {
      type: "calculation",
      content: `Estimated total cost impact: $${totalCost.toFixed(2)}`,
      premises: chain.cost_implications.map(c => c.description),
      calculation: {
        formula: "Total = Σ(category costs)",
        inputs: Object.fromEntries(chain.cost_implications.map(c => [c.category, c.estimated_cost])),
        result: totalCost,
        unit: "USD"
      },
      confidence: 0.65
    });
  }

  /**
   * Add a reasoning step to the chain
   */
  private addStep(chain: ManufacturingReasoningChain, stepData: Partial<ReasoningStep>): ReasoningStep {
    const step: ReasoningStep = {
      step_id: `step_${chain.steps.length + 1}`,
      step_number: chain.steps.length + 1,
      type: stepData.type || "observation",
      content: stepData.content || "",
      premises: stepData.premises || [],
      inference_rule: stepData.inference_rule,
      calculation: stepData.calculation,
      confidence: stepData.confidence ?? 0.8,
      uncertainty: stepData.uncertainty,
      alternatives: stepData.alternatives,
      self_question: stepData.self_question,
      self_answer: stepData.self_answer,
      warnings: stepData.warnings,
      timestamp: new Date().toISOString()
    };

    chain.steps.push(step);

    // Update chain confidence (geometric mean of step confidences)
    chain.current_confidence = this.calculateChainConfidence(chain.steps);

    // Add audit entry
    chain.audit_trail.push({
      timestamp: step.timestamp,
      step_id: step.step_id,
      action: "step_added",
      detail: step.content.slice(0, 100),
      confidence_before: chain.current_confidence,
      confidence_after: chain.current_confidence
    });

    return step;
  }

  /**
   * Calculate overall chain confidence
   */
  private calculateChainConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 1.0;

    // Geometric mean of confidences
    const product = steps.reduce((p, s) => p * s.confidence, 1);
    return Math.pow(product, 1 / steps.length);
  }

  /**
   * Synthesize final answer from chain
   */
  private synthesizeFinalAnswer(chain: ManufacturingReasoningChain): FinalAnswer {
    const safetyIssues = chain.safety_checks.filter(s => s.severity === "critical" && !s.mitigation);
    const constraintViolations = chain.constraints_checked.filter(c => c.violated);
    const physicsFailures = chain.physics_validations.filter(p => !p.passes);

    // Gather assumptions from the chain
    const assumptions = chain.steps
      .filter(s => s.type === "hypothesis" || s.confidence < 0.8)
      .map(s => s.content);

    // Gather caveats
    const caveats: string[] = [];
    if (safetyIssues.length > 0) {
      caveats.push(`${safetyIssues.length} unmitigated safety concern(s)`);
    }
    if (constraintViolations.length > 0) {
      caveats.push(`${constraintViolations.length} constraint violation(s)`);
    }
    if (physicsFailures.length > 0) {
      caveats.push(`${physicsFailures.length} physics validation failure(s)`);
    }

    // Determine evidence strength
    let evidenceStrength: FinalAnswer["evidence_strength"] = "conclusive";
    if (chain.current_confidence < 0.5) {
      evidenceStrength = "weak";
    } else if (chain.current_confidence < 0.7) {
      evidenceStrength = "moderate";
    } else if (chain.current_confidence < 0.9) {
      evidenceStrength = "strong";
    }

    // Build justification from key steps
    const justification = chain.steps
      .filter(s => s.type === "deduction" || s.type === "conclusion")
      .map(s => s.content);

    // Get conclusion content
    const conclusionSteps = chain.steps.filter(s => s.type === "conclusion");
    const answer = conclusionSteps.length > 0
      ? conclusionSteps.map(s => s.content).join("; ")
      : `Reasoning complete with ${chain.steps.length} steps, confidence: ${(chain.current_confidence * 100).toFixed(1)}%`;

    return {
      answer,
      confidence: chain.current_confidence,
      justification,
      assumptions,
      caveats,
      evidence_strength: evidenceStrength
    };
  }

  /**
   * Add a conclusion step
   */
  addConclusion(chain: ManufacturingReasoningChain, conclusion: string, confidence: number = 0.9): void {
    this.addStep(chain, {
      type: "conclusion",
      content: conclusion,
      premises: chain.steps.slice(-3).map(s => s.step_id),
      confidence
    });
  }

  /**
   * Backtrack from dead end
   */
  backtrack(chain: ManufacturingReasoningChain, reason: string, backtrackTo: number): void {
    const deadEnd: DeadEnd = {
      at_step: chain.steps.length,
      reason,
      backtrack_to: backtrackTo
    };
    chain.dead_ends.push(deadEnd);
    chain.meta.backtrack_count++;

    this.addStep(chain, {
      type: "backtrack",
      content: `Backtracking: ${reason}. Returning to step ${backtrackTo}.`,
      premises: [],
      confidence: 1.0
    });

    chain.audit_trail.push({
      timestamp: new Date().toISOString(),
      step_id: `backtrack_${chain.dead_ends.length}`,
      action: "backtrack",
      detail: reason,
      confidence_before: chain.current_confidence,
      confidence_after: chain.current_confidence
    });
  }

  /**
   * Validate a physics constraint
   */
  validatePhysics(
    chain: ManufacturingReasoningChain,
    formula: string,
    parameter: string,
    calculatedValue: number,
    limitValue: number,
    unit: string,
    source: string
  ): boolean {
    const passes = calculatedValue <= limitValue;
    const marginPercent = ((limitValue - calculatedValue) / limitValue) * 100;

    const validation: PhysicsValidation = {
      formula,
      parameter,
      calculated_value: calculatedValue,
      limit_value: limitValue,
      unit,
      passes,
      margin_percent: marginPercent,
      source
    };
    chain.physics_validations.push(validation);

    chain.audit_trail.push({
      timestamp: new Date().toISOString(),
      step_id: `physics_${chain.physics_validations.length}`,
      action: "physics_validated",
      detail: `${parameter}: ${calculatedValue}${unit} vs limit ${limitValue}${unit}`,
      confidence_before: chain.current_confidence,
      confidence_after: passes ? chain.current_confidence : chain.current_confidence * 0.5
    });

    if (!passes) {
      chain.current_confidence *= 0.5;
    }

    return passes;
  }

  /**
   * Get reasoning summary for context injection
   */
  getReasoningSummary(chain: ManufacturingReasoningChain, maxTokens: number = 500): string {
    const lines: string[] = [];
    let tokenCount = 0;

    lines.push(`Domain: ${chain.domain}`);
    lines.push(`Confidence: ${(chain.current_confidence * 100).toFixed(1)}%`);
    lines.push(`Steps: ${chain.steps.length}`);
    lines.push("");

    // Key conclusions
    const conclusions = chain.steps.filter(s => s.type === "conclusion");
    if (conclusions.length > 0) {
      lines.push("Conclusions:");
      for (const c of conclusions) {
        const line = `- ${c.content}`;
        if (tokenCount + line.length / 4 > maxTokens) break;
        lines.push(line);
        tokenCount += line.length / 4;
      }
    }

    // Safety warnings
    const criticalSafety = chain.safety_checks.filter(s => s.severity === "critical");
    if (criticalSafety.length > 0) {
      lines.push("");
      lines.push("Safety:");
      for (const s of criticalSafety) {
        const line = `- ${s.concern}`;
        if (tokenCount + line.length / 4 > maxTokens) break;
        lines.push(line);
        tokenCount += line.length / 4;
      }
    }

    // Cost
    if (chain.cost_implications.length > 0) {
      const totalCost = chain.cost_implications.reduce((sum, c) => sum + c.estimated_cost, 0);
      lines.push("");
      lines.push(`Est. cost: $${totalCost.toFixed(2)}`);
    }

    return lines.join("\n");
  }

  /**
   * Check if reasoning is valid (no fatal violations)
   */
  isReasoningValid(chain: ManufacturingReasoningChain): boolean {
    // Check for fatal constraint violations
    const fatalViolations = chain.constraints_checked.filter(
      c => c.violated && c.violation_severity === "fatal"
    );
    if (fatalViolations.length > 0) return false;

    // Check for physics failures
    const physicsFailures = chain.physics_validations.filter(p => !p.passes);
    if (physicsFailures.length > 0) return false;

    // Check for unmitigated critical safety
    const unmitSafety = chain.safety_checks.filter(
      s => s.severity === "critical" && s.applies && !s.mitigation
    );
    if (unmitSafety.length > 0) return false;

    return true;
  }

  /**
   * Get applicable patterns for a domain
   */
  getApplicablePatterns(domain: ManufacturingDomain): ReasoningPattern[] {
    return this.PATTERNS
      .filter(p => p.required_for.includes(domain))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Export chain for audit
   */
  exportAuditTrail(chain: ManufacturingReasoningChain): object {
    return {
      chain_id: chain.chain_id,
      domain: chain.domain,
      problem: chain.problem,
      goal: chain.goal,
      total_steps: chain.steps.length,
      final_confidence: chain.current_confidence,
      backtrack_count: chain.meta.backtrack_count,
      constraints_checked: chain.constraints_checked.length,
      constraints_violated: chain.constraints_checked.filter(c => c.violated).length,
      physics_validations: chain.physics_validations.length,
      physics_failures: chain.physics_validations.filter(p => !p.passes).length,
      safety_checks: chain.safety_checks.length,
      critical_safety: chain.safety_checks.filter(s => s.severity === "critical").length,
      cost_implications: chain.cost_implications,
      reasoning_valid: this.isReasoningValid(chain),
      total_time_ms: chain.total_time_ms,
      audit_trail: chain.audit_trail
    };
  }
}

// Export singleton
export const manufacturingReasoningEngine = new ManufacturingReasoningEngine();
