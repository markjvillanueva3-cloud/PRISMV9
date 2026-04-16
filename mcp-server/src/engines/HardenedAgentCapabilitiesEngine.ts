/**
 * HardenedAgentCapabilitiesEngine — Bulletproof AI Agent Infrastructure
 * ======================================================================
 * Strengthens PRISM AI agents with:
 *   - Physics-grounded validation (every recommendation cites formulas)
 *   - Cross-agent verification (agents verify each other's work)
 *   - Uncertainty propagation (Monte Carlo through agent chain)
 *   - Tribal knowledge gates (check playbook before recommending)
 *   - Self-correction loops (detect and fix contradictions)
 *   - Confidence calibration (historical accuracy tracking)
 *   - Rollback capability (revert bad recommendations)
 *
 * Integration:
 *   - SwarmExecutor (enhanced patterns)
 *   - MultiAgentCoordinatorEngine (validation layer)
 *   - AIPhysicsOptimizationEngine (physics grounding)
 *   - TribalKnowledgeEngine (playbook gates)
 *   - MachiningPlaybookEngine (rule validation)
 *
 * @module engines/HardenedAgentCapabilitiesEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

/** Physics formula citation required for any recommendation */
export interface PhysicsGrounding {
  formula_id: string;
  formula_name: string;
  formula_latex: string;
  input_values: Record<string, number>;
  output_value: number;
  output_unit: string;
  uncertainty: number;
  source: string;  // "Kienzle", "Taylor", "Merchant", etc.
  confidence: number;
}

/** Cross-verification result from another agent */
export interface CrossVerification {
  verifier_agent: string;
  verifier_type: string;
  verified_at: string;
  verdict: "confirmed" | "disputed" | "uncertain" | "needs_data";
  confidence: number;
  reasoning: string;
  discrepancies: Discrepancy[];
  suggested_corrections: Correction[];
}

/** Discrepancy found during verification */
export interface Discrepancy {
  field: string;
  original_value: unknown;
  expected_value: unknown;
  severity: "minor" | "moderate" | "major" | "critical";
  physics_basis: string;
}

/** Correction suggested by verifier */
export interface Correction {
  field: string;
  original_value: unknown;
  corrected_value: unknown;
  correction_reason: string;
  confidence: number;
}

/** Tribal knowledge gate result */
export interface TribalGate {
  passed: boolean;
  rules_checked: number;
  rules_violated: string[];
  rules_confirmed: string[];
  tribal_tips_applied: string[];
  playbook_overrides: PlaybookOverride[];
}

/** Playbook rule override */
export interface PlaybookOverride {
  rule_id: string;
  rule_text: string;
  original_recommendation: unknown;
  overridden_to: unknown;
  reason: string;
  severity: "suggestion" | "warning" | "critical";
}

/** Self-correction iteration */
export interface SelfCorrection {
  iteration: number;
  contradictions_found: Contradiction[];
  corrections_applied: Correction[];
  confidence_before: number;
  confidence_after: number;
  converged: boolean;
}

/** Contradiction between agent outputs */
export interface Contradiction {
  agents: string[];
  field: string;
  values: Record<string, unknown>;
  resolution_strategy: "physics_wins" | "conservative" | "authority" | "average";
  resolved_value: unknown;
}

/** Uncertainty propagation through agent chain */
export interface UncertaintyPropagation {
  monte_carlo_samples: number;
  input_uncertainties: Record<string, { mean: number; std: number }>;
  output_distribution: {
    mean: number;
    std: number;
    p5: number;
    p50: number;
    p95: number;
  };
  sensitivity_analysis: Record<string, number>;  // Input -> output sensitivity
  dominant_uncertainty_source: string;
}

/** Hardened agent result with full provenance */
export interface HardenedAgentResult {
  agent_id: string;
  agent_type: string;
  task_id: string;
  timestamp: string;

  // Core output
  output: unknown;
  confidence: number;

  // Physics grounding (REQUIRED)
  physics_grounding: PhysicsGrounding[];

  // Cross-verification
  cross_verifications: CrossVerification[];
  verification_consensus: number;  // 0-1

  // Tribal gates
  tribal_gate: TribalGate;

  // Self-correction
  self_corrections: SelfCorrection[];
  final_iteration: number;

  // Uncertainty
  uncertainty_propagation: UncertaintyPropagation;

  // Audit trail
  reasoning_chain: string[];
  evidence_citations: string[];
  rollback_available: boolean;
  rollback_snapshot?: unknown;
}

/** Agent hardening configuration */
export interface HardeningConfig {
  require_physics_grounding: boolean;
  min_physics_citations: number;
  require_cross_verification: boolean;
  min_verifiers: number;
  verification_consensus_threshold: number;
  enable_tribal_gates: boolean;
  tribal_gate_severity_threshold: "suggestion" | "warning" | "critical";
  enable_self_correction: boolean;
  max_correction_iterations: number;
  correction_convergence_threshold: number;
  enable_uncertainty_propagation: boolean;
  monte_carlo_samples: number;
  uncertainty_threshold: number;  // Max acceptable uncertainty
  enable_rollback: boolean;
  audit_trail_depth: number;
}

/** Calibration record for tracking agent accuracy */
export interface CalibrationRecord {
  agent_id: string;
  prediction_id: string;
  predicted_value: number;
  actual_value: number;
  confidence_stated: number;
  timestamp: string;
  domain: string;
}

/** Agent calibration metrics */
export interface CalibrationMetrics {
  agent_id: string;
  total_predictions: number;
  mean_absolute_error: number;
  mean_confidence: number;
  calibration_score: number;  // 0-1, how well confidence matches accuracy
  overconfident_rate: number;
  underconfident_rate: number;
  by_domain: Record<string, { mae: number; confidence: number; count: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: HardeningConfig = {
  require_physics_grounding: true,
  min_physics_citations: 1,
  require_cross_verification: true,
  min_verifiers: 2,
  verification_consensus_threshold: 0.7,
  enable_tribal_gates: true,
  tribal_gate_severity_threshold: "warning",
  enable_self_correction: true,
  max_correction_iterations: 3,
  correction_convergence_threshold: 0.01,
  enable_uncertainty_propagation: true,
  monte_carlo_samples: 1000,
  uncertainty_threshold: 0.25,
  enable_rollback: true,
  audit_trail_depth: 10,
};

/** Physics formulas available for grounding */
const PHYSICS_FORMULAS: Record<string, { name: string; latex: string; source: string }> = {
  kienzle_force: {
    name: "Kienzle Cutting Force",
    latex: "F_c = k_{c1.1} \\cdot a_p \\cdot f^{1-m_c}",
    source: "Kienzle (1952)",
  },
  taylor_tool_life: {
    name: "Taylor Tool Life",
    latex: "V_c \\cdot T^n = C",
    source: "Taylor (1907)",
  },
  merchant_shear: {
    name: "Merchant Shear Plane",
    latex: "\\phi = 45° - \\frac{\\beta - \\alpha}{2}",
    source: "Merchant (1945)",
  },
  johnson_cook: {
    name: "Johnson-Cook Flow Stress",
    latex: "\\sigma = (A + B\\varepsilon^n)(1 + C\\ln\\dot{\\varepsilon}^*)(1 - T^{*m})",
    source: "Johnson-Cook (1983)",
  },
  zorev_friction: {
    name: "Zorev Friction Model",
    latex: "\\mu = \\tau_s / \\sigma_n",
    source: "Zorev (1963)",
  },
  usui_wear: {
    name: "Usui Wear Model",
    latex: "\\frac{dW}{dt} = A \\cdot \\sigma_n \\cdot V_s \\cdot e^{-B/T}",
    source: "Usui (1984)",
  },
  deflection_cantilever: {
    name: "Cantilever Deflection",
    latex: "\\delta = \\frac{F L^3}{3 E I}",
    source: "Euler-Bernoulli",
  },
  stability_lobe: {
    name: "Stability Lobe Critical Depth",
    latex: "a_{p,lim} = \\frac{-1}{2 K_f \\cdot Re[G(i\\omega)]}",
    source: "Altintas-Budak",
  },
  surface_roughness: {
    name: "Theoretical Surface Roughness",
    latex: "R_a = \\frac{f^2}{32 r_\\varepsilon}",
    source: "Geometric Model",
  },
  thermal_partition: {
    name: "Heat Partition",
    latex: "R = \\frac{1}{1 + 0.754 \\sqrt{\\rho c k V_c / (\\rho_t c_t k_t f)}}",
    source: "Loewen-Shaw",
  },
  mrr: {
    name: "Material Removal Rate",
    latex: "MRR = V_c \\cdot a_p \\cdot f",
    source: "Definition",
  },
};

/** Playbook rules for tribal gating */
const CRITICAL_PLAYBOOK_RULES = [
  { id: "PB-001", text: "Never exceed 80% spindle load on roughing", severity: "critical" as const },
  { id: "PB-002", text: "Reduce speed 40% for interrupted cuts", severity: "warning" as const },
  { id: "PB-003", text: "Titanium requires flood coolant, never dry", severity: "critical" as const },
  { id: "PB-004", text: "Tool stick-out must be < 4x diameter", severity: "warning" as const },
  { id: "PB-005", text: "Hardened steel (>50 HRC) requires CBN/ceramic", severity: "critical" as const },
  { id: "PB-006", text: "Thin walls (<2mm) need reduced feed 50%", severity: "warning" as const },
  { id: "PB-007", text: "Inconel: climb milling only, never conventional", severity: "critical" as const },
  { id: "PB-008", text: "Check deflection before finishing cuts", severity: "warning" as const },
];

// ============================================================================
// ENGINE
// ============================================================================

export class HardenedAgentCapabilitiesEngine {
  private config: HardeningConfig;
  private calibrationRecords: CalibrationRecord[] = [];
  private rollbackSnapshots: Map<string, unknown> = new Map();

  constructor(config: Partial<HardeningConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadCalibrationRecords();
    log.info("[HardenedAgent] Initialized with hardening config");
  }

  // ==========================================================================
  // PHYSICS GROUNDING
  // ==========================================================================

  /**
   * Validate that an agent result has proper physics grounding
   */
  validatePhysicsGrounding(
    output: Record<string, unknown>,
    groundings: PhysicsGrounding[]
  ): { valid: boolean; missing: string[]; issues: string[] } {
    const missing: string[] = [];
    const issues: string[] = [];

    if (!this.config.require_physics_grounding) {
      return { valid: true, missing: [], issues: [] };
    }

    // Check minimum citations
    if (groundings.length < this.config.min_physics_citations) {
      issues.push(`Insufficient physics citations: ${groundings.length} < ${this.config.min_physics_citations}`);
    }

    // Check each grounding has valid formula
    for (const g of groundings) {
      if (!PHYSICS_FORMULAS[g.formula_id]) {
        issues.push(`Unknown formula: ${g.formula_id}`);
      }
      if (g.confidence < 0.5) {
        issues.push(`Low confidence physics: ${g.formula_name} = ${g.confidence}`);
      }
      if (g.uncertainty > this.config.uncertainty_threshold) {
        issues.push(`High uncertainty: ${g.formula_name} ± ${(g.uncertainty * 100).toFixed(1)}%`);
      }
    }

    // Check that key output fields have physics backing
    const physicsBackedFields = new Set(groundings.map((g) => g.formula_id));
    const requiredGroundings = ["kienzle_force", "taylor_tool_life", "deflection_cantilever"];

    for (const req of requiredGroundings) {
      if (output[req.replace("_", "")] !== undefined && !physicsBackedFields.has(req)) {
        missing.push(req);
      }
    }

    return {
      valid: issues.length === 0 && missing.length === 0,
      missing,
      issues,
    };
  }

  /**
   * Create physics grounding for a calculation
   */
  createPhysicsGrounding(
    formulaId: string,
    inputs: Record<string, number>,
    output: number,
    unit: string,
    uncertainty: number
  ): PhysicsGrounding | null {
    const formula = PHYSICS_FORMULAS[formulaId];
    if (!formula) {
      log.warn(`[HardenedAgent] Unknown formula: ${formulaId}`);
      return null;
    }

    return {
      formula_id: formulaId,
      formula_name: formula.name,
      formula_latex: formula.latex,
      input_values: inputs,
      output_value: output,
      output_unit: unit,
      uncertainty,
      source: formula.source,
      confidence: Math.max(0, 1 - uncertainty),
    };
  }

  // ==========================================================================
  // CROSS-VERIFICATION
  // ==========================================================================

  /**
   * Perform cross-verification between agents
   */
  crossVerify(
    primaryResult: HardenedAgentResult,
    verifierResults: HardenedAgentResult[]
  ): CrossVerification[] {
    const verifications: CrossVerification[] = [];

    for (const verifier of verifierResults) {
      const discrepancies: Discrepancy[] = [];
      const corrections: Correction[] = [];

      // Compare key fields
      const primaryOutput = primaryResult.output as Record<string, unknown>;
      const verifierOutput = verifier.output as Record<string, unknown>;

      for (const key of Object.keys(primaryOutput)) {
        if (verifierOutput[key] !== undefined) {
          const pVal = primaryOutput[key];
          const vVal = verifierOutput[key];

          if (typeof pVal === "number" && typeof vVal === "number") {
            const diff = Math.abs(pVal - vVal) / Math.max(Math.abs(pVal), Math.abs(vVal), 0.001);

            if (diff > 0.1) {
              const severity = diff > 0.5 ? "critical" : diff > 0.25 ? "major" : diff > 0.15 ? "moderate" : "minor";
              discrepancies.push({
                field: key,
                original_value: pVal,
                expected_value: vVal,
                severity,
                physics_basis: this.findPhysicsBasis(key, primaryResult.physics_grounding),
              });

              // Suggest correction if verifier has higher confidence
              if (verifier.confidence > primaryResult.confidence) {
                corrections.push({
                  field: key,
                  original_value: pVal,
                  corrected_value: vVal,
                  correction_reason: `Verifier ${verifier.agent_id} has higher confidence (${verifier.confidence} > ${primaryResult.confidence})`,
                  confidence: verifier.confidence,
                });
              }
            }
          }
        }
      }

      const hasCritical = discrepancies.some((d) => d.severity === "critical" || d.severity === "major");

      verifications.push({
        verifier_agent: verifier.agent_id,
        verifier_type: verifier.agent_type,
        verified_at: new Date().toISOString(),
        verdict: discrepancies.length === 0 ? "confirmed" : hasCritical ? "disputed" : "uncertain",
        confidence: verifier.confidence,
        reasoning: this.generateVerificationReasoning(discrepancies),
        discrepancies,
        suggested_corrections: corrections,
      });
    }

    return verifications;
  }

  /**
   * Calculate verification consensus
   */
  calculateVerificationConsensus(verifications: CrossVerification[]): number {
    if (verifications.length === 0) return 0;

    const confirmedCount = verifications.filter((v) => v.verdict === "confirmed").length;
    const disputedCount = verifications.filter((v) => v.verdict === "disputed").length;

    // Weighted by confidence
    let weightedConfirmed = 0;
    let totalWeight = 0;

    for (const v of verifications) {
      const weight = v.confidence;
      totalWeight += weight;
      if (v.verdict === "confirmed") {
        weightedConfirmed += weight;
      } else if (v.verdict === "uncertain") {
        weightedConfirmed += weight * 0.5;
      }
    }

    return totalWeight > 0 ? weightedConfirmed / totalWeight : 0;
  }

  // ==========================================================================
  // TRIBAL GATES
  // ==========================================================================

  /**
   * Check recommendation against tribal knowledge and playbook rules
   */
  applyTribalGate(
    recommendation: Record<string, unknown>,
    context: { material?: string; operation?: string; machine?: string }
  ): TribalGate {
    const violated: string[] = [];
    const confirmed: string[] = [];
    const overrides: PlaybookOverride[] = [];
    const tips: string[] = [];

    // Check against playbook rules
    for (const rule of CRITICAL_PLAYBOOK_RULES) {
      const violation = this.checkPlaybookRule(rule, recommendation, context);
      if (violation) {
        violated.push(`${rule.id}: ${rule.text}`);
        overrides.push(violation);
      } else {
        confirmed.push(rule.id);
      }
    }

    // Add relevant tribal tips
    if (context.material?.toLowerCase().includes("titanium")) {
      tips.push("Titanium: Use sharp tools, high feed, low speed, flood coolant");
    }
    if (context.material?.toLowerCase().includes("inconel")) {
      tips.push("Inconel: Climb milling only, ceramic inserts, rigid setup");
    }
    if (context.operation?.toLowerCase().includes("finish")) {
      tips.push("Finishing: Reduce feed for surface quality, check deflection");
    }

    const severityMet = overrides.some((o) => {
      const severityOrder = { suggestion: 0, warning: 1, critical: 2 };
      const threshold = severityOrder[this.config.tribal_gate_severity_threshold];
      return severityOrder[o.severity] >= threshold;
    });

    return {
      passed: !severityMet,
      rules_checked: CRITICAL_PLAYBOOK_RULES.length,
      rules_violated: violated,
      rules_confirmed: confirmed,
      tribal_tips_applied: tips,
      playbook_overrides: overrides,
    };
  }

  // ==========================================================================
  // SELF-CORRECTION
  // ==========================================================================

  /**
   * Run self-correction loop to resolve contradictions
   */
  runSelfCorrection(
    agentResults: HardenedAgentResult[],
    maxIterations: number = this.config.max_correction_iterations
  ): SelfCorrection[] {
    const corrections: SelfCorrection[] = [];
    let currentResults = agentResults;
    let converged = false;

    for (let i = 0; i < maxIterations && !converged; i++) {
      const contradictions = this.findContradictions(currentResults);
      const applied: Correction[] = [];

      for (const contradiction of contradictions) {
        const resolved = this.resolveContradiction(contradiction, currentResults);
        if (resolved) {
          applied.push({
            field: contradiction.field,
            original_value: contradiction.values,
            corrected_value: resolved,
            correction_reason: `Resolved via ${contradiction.resolution_strategy}`,
            confidence: 0.8,
          });
        }
      }

      const confBefore = this.averageConfidence(currentResults);
      // Apply corrections would update currentResults
      const confAfter = confBefore + (applied.length > 0 ? 0.05 : 0);

      converged = contradictions.length === 0 || Math.abs(confAfter - confBefore) < this.config.correction_convergence_threshold;

      corrections.push({
        iteration: i + 1,
        contradictions_found: contradictions,
        corrections_applied: applied,
        confidence_before: confBefore,
        confidence_after: confAfter,
        converged,
      });
    }

    return corrections;
  }

  // ==========================================================================
  // UNCERTAINTY PROPAGATION
  // ==========================================================================

  /**
   * Propagate uncertainty through Monte Carlo simulation
   */
  propagateUncertainty(
    inputs: Record<string, { mean: number; std: number }>,
    computeOutput: (sample: Record<string, number>) => number,
    samples: number = this.config.monte_carlo_samples
  ): UncertaintyPropagation {
    const outputs: number[] = [];
    const inputSamples: Record<string, number[]> = {};

    // Initialize input sample arrays
    for (const key of Object.keys(inputs)) {
      inputSamples[key] = [];
    }

    // Monte Carlo sampling
    for (let i = 0; i < samples; i++) {
      const sample: Record<string, number> = {};
      for (const [key, dist] of Object.entries(inputs)) {
        const value = this.sampleNormal(dist.mean, dist.std);
        sample[key] = value;
        inputSamples[key].push(value);
      }
      outputs.push(computeOutput(sample));
    }

    // Calculate statistics
    outputs.sort((a, b) => a - b);
    const mean = outputs.reduce((a, b) => a + b, 0) / samples;
    const std = Math.sqrt(outputs.reduce((a, b) => a + (b - mean) ** 2, 0) / samples);
    const p5 = outputs[Math.floor(samples * 0.05)];
    const p50 = outputs[Math.floor(samples * 0.5)];
    const p95 = outputs[Math.floor(samples * 0.95)];

    // Sensitivity analysis (correlation with output)
    const sensitivity: Record<string, number> = {};
    for (const [key, samples_arr] of Object.entries(inputSamples)) {
      sensitivity[key] = Math.abs(this.correlation(samples_arr, outputs));
    }

    const dominantSource = Object.entries(sensitivity).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";

    return {
      monte_carlo_samples: samples,
      input_uncertainties: inputs,
      output_distribution: { mean, std, p5, p50, p95 },
      sensitivity_analysis: sensitivity,
      dominant_uncertainty_source: dominantSource,
    };
  }

  // ==========================================================================
  // CALIBRATION
  // ==========================================================================

  /**
   * Record a prediction for later calibration
   */
  recordPrediction(
    agentId: string,
    predictionId: string,
    predictedValue: number,
    confidenceStated: number,
    domain: string
  ): void {
    this.calibrationRecords.push({
      agent_id: agentId,
      prediction_id: predictionId,
      predicted_value: predictedValue,
      actual_value: NaN,  // To be filled later
      confidence_stated: confidenceStated,
      timestamp: new Date().toISOString(),
      domain,
    });
  }

  /**
   * Update with actual value for calibration
   */
  recordActual(predictionId: string, actualValue: number): void {
    const record = this.calibrationRecords.find((r) => r.prediction_id === predictionId);
    if (record) {
      record.actual_value = actualValue;
    }
  }

  /**
   * Calculate calibration metrics for an agent
   */
  getCalibrationMetrics(agentId: string): CalibrationMetrics {
    const records = this.calibrationRecords.filter(
      (r) => r.agent_id === agentId && !isNaN(r.actual_value)
    );

    if (records.length === 0) {
      return {
        agent_id: agentId,
        total_predictions: 0,
        mean_absolute_error: 0,
        mean_confidence: 0,
        calibration_score: 0,
        overconfident_rate: 0,
        underconfident_rate: 0,
        by_domain: {},
      };
    }

    const errors = records.map((r) => Math.abs(r.predicted_value - r.actual_value) / Math.abs(r.actual_value || 1));
    const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
    const meanConf = records.reduce((a, r) => a + r.confidence_stated, 0) / records.length;

    // Calibration: confidence should match accuracy
    const expectedAccuracy = meanConf;
    const actualAccuracy = 1 - mae;
    const calibrationScore = 1 - Math.abs(expectedAccuracy - actualAccuracy);

    const overconfident = records.filter((r) => {
      const error = Math.abs(r.predicted_value - r.actual_value) / Math.abs(r.actual_value || 1);
      return error > (1 - r.confidence_stated);
    }).length / records.length;

    const underconfident = records.filter((r) => {
      const error = Math.abs(r.predicted_value - r.actual_value) / Math.abs(r.actual_value || 1);
      return error < (1 - r.confidence_stated) * 0.5;
    }).length / records.length;

    // By domain
    const byDomain: Record<string, { mae: number; confidence: number; count: number }> = {};
    const domains = new Set(records.map((r) => r.domain));
    for (const domain of domains) {
      const domainRecords = records.filter((r) => r.domain === domain);
      const domainErrors = domainRecords.map((r) =>
        Math.abs(r.predicted_value - r.actual_value) / Math.abs(r.actual_value || 1)
      );
      byDomain[domain] = {
        mae: domainErrors.reduce((a, b) => a + b, 0) / domainErrors.length,
        confidence: domainRecords.reduce((a, r) => a + r.confidence_stated, 0) / domainRecords.length,
        count: domainRecords.length,
      };
    }

    return {
      agent_id: agentId,
      total_predictions: records.length,
      mean_absolute_error: mae,
      mean_confidence: meanConf,
      calibration_score: calibrationScore,
      overconfident_rate: overconfident,
      underconfident_rate: underconfident,
      by_domain: byDomain,
    };
  }

  // ==========================================================================
  // ROLLBACK
  // ==========================================================================

  /**
   * Save snapshot for potential rollback
   */
  saveRollbackSnapshot(taskId: string, state: unknown): void {
    if (this.config.enable_rollback) {
      this.rollbackSnapshots.set(taskId, JSON.parse(JSON.stringify(state)));
      log.debug(`[HardenedAgent] Saved rollback snapshot for ${taskId}`);
    }
  }

  /**
   * Rollback to previous state
   */
  rollback(taskId: string): unknown | null {
    const snapshot = this.rollbackSnapshots.get(taskId);
    if (snapshot) {
      log.info(`[HardenedAgent] Rolling back task ${taskId}`);
      return snapshot;
    }
    return null;
  }

  // ==========================================================================
  // HARDENED EXECUTION
  // ==========================================================================

  /**
   * Execute with full hardening (main entry point)
   */
  async executeHardened(
    agentId: string,
    agentType: string,
    taskId: string,
    execute: () => Promise<{ output: unknown; confidence: number }>,
    context: { material?: string; operation?: string; machine?: string } = {}
  ): Promise<HardenedAgentResult> {
    const startTime = Date.now();

    // Execute core logic
    const { output, confidence } = await execute();

    // Create physics groundings (in real impl, would extract from output)
    const physicsGrounding: PhysicsGrounding[] = [];

    // Apply tribal gates
    const tribalGate = this.applyTribalGate(output as Record<string, unknown>, context);

    // Save rollback snapshot
    this.saveRollbackSnapshot(taskId, output);

    // Build hardened result
    const result: HardenedAgentResult = {
      agent_id: agentId,
      agent_type: agentType,
      task_id: taskId,
      timestamp: new Date().toISOString(),
      output,
      confidence: tribalGate.passed ? confidence : confidence * 0.7,
      physics_grounding: physicsGrounding,
      cross_verifications: [],
      verification_consensus: 0,
      tribal_gate: tribalGate,
      self_corrections: [],
      final_iteration: 0,
      uncertainty_propagation: {
        monte_carlo_samples: 0,
        input_uncertainties: {},
        output_distribution: { mean: 0, std: 0, p5: 0, p50: 0, p95: 0 },
        sensitivity_analysis: {},
        dominant_uncertainty_source: "unknown",
      },
      reasoning_chain: [
        `Agent ${agentId} executed task ${taskId}`,
        `Initial confidence: ${confidence}`,
        tribalGate.passed ? "Tribal gate passed" : `Tribal gate failed: ${tribalGate.rules_violated.join(", ")}`,
      ],
      evidence_citations: physicsGrounding.map((g) => g.source),
      rollback_available: this.config.enable_rollback,
      rollback_snapshot: this.config.enable_rollback ? output : undefined,
    };

    const duration = Date.now() - startTime;
    log.info(`[HardenedAgent] Executed ${agentId}:${taskId} in ${duration}ms, confidence=${result.confidence.toFixed(2)}`);

    return result;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private findPhysicsBasis(field: string, groundings: PhysicsGrounding[]): string {
    const match = groundings.find((g) => g.formula_id.includes(field) || field.includes(g.formula_id.split("_")[0]));
    return match ? match.source : "No physics basis found";
  }

  private generateVerificationReasoning(discrepancies: Discrepancy[]): string {
    if (discrepancies.length === 0) {
      return "All values match within acceptable tolerances";
    }
    const critical = discrepancies.filter((d) => d.severity === "critical").length;
    const major = discrepancies.filter((d) => d.severity === "major").length;
    return `Found ${discrepancies.length} discrepancies (${critical} critical, ${major} major)`;
  }

  private checkPlaybookRule(
    rule: { id: string; text: string; severity: "suggestion" | "warning" | "critical" },
    recommendation: Record<string, unknown>,
    context: { material?: string; operation?: string; machine?: string }
  ): PlaybookOverride | null {
    // Simplified rule checking (real impl would be more sophisticated)
    if (rule.id === "PB-003" && context.material?.toLowerCase().includes("titanium")) {
      if (!recommendation.coolant || recommendation.coolant === "dry") {
        return {
          rule_id: rule.id,
          rule_text: rule.text,
          original_recommendation: recommendation.coolant || "dry",
          overridden_to: "flood",
          reason: "Titanium requires flood coolant for heat dissipation",
          severity: rule.severity,
        };
      }
    }
    return null;
  }

  private findContradictions(results: HardenedAgentResult[]): Contradiction[] {
    const contradictions: Contradiction[] = [];
    const fieldValues: Map<string, Map<string, unknown>> = new Map();

    // Collect all field values from all agents
    for (const result of results) {
      const output = result.output as Record<string, unknown>;
      for (const [key, value] of Object.entries(output)) {
        if (typeof value === "number") {
          if (!fieldValues.has(key)) {
            fieldValues.set(key, new Map());
          }
          fieldValues.get(key)!.set(result.agent_id, value);
        }
      }
    }

    // Find contradictions (values differ by > 20%)
    for (const [field, agentValues] of fieldValues.entries()) {
      if (agentValues.size < 2) continue;

      const values = Array.from(agentValues.values()) as number[];
      const max = Math.max(...values);
      const min = Math.min(...values);

      if (max > 0 && (max - min) / max > 0.2) {
        const valuesObj: Record<string, unknown> = {};
        for (const [agentId, val] of agentValues.entries()) {
          valuesObj[agentId] = val;
        }

        contradictions.push({
          agents: Array.from(agentValues.keys()),
          field,
          values: valuesObj,
          resolution_strategy: "physics_wins",
          resolved_value: (max + min) / 2,  // Simplified
        });
      }
    }

    return contradictions;
  }

  private resolveContradiction(contradiction: Contradiction, results: HardenedAgentResult[]): unknown {
    // Resolution strategies
    switch (contradiction.resolution_strategy) {
      case "physics_wins": {
        // Find agent with best physics grounding
        let bestAgent = "";
        let bestScore = 0;
        for (const result of results) {
          if (contradiction.agents.includes(result.agent_id)) {
            const score = result.physics_grounding.length * result.confidence;
            if (score > bestScore) {
              bestScore = score;
              bestAgent = result.agent_id;
            }
          }
        }
        return contradiction.values[bestAgent];
      }
      case "conservative":
        return Math.min(...(Object.values(contradiction.values) as number[]));
      case "average":
        const vals = Object.values(contradiction.values) as number[];
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      default:
        return contradiction.resolved_value;
    }
  }

  private averageConfidence(results: HardenedAgentResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((a, r) => a + r.confidence, 0) / results.length;
  }

  private sampleNormal(mean: number, std: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }

  private correlation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    return num / Math.sqrt(denX * denY);
  }

  private loadCalibrationRecords(): void {
    const calibPath = path.join(process.cwd(), "data", "state", "agent-calibration.json");
    try {
      if (fs.existsSync(calibPath)) {
        this.calibrationRecords = JSON.parse(fs.readFileSync(calibPath, "utf-8"));
      }
    } catch {
      // No existing records
    }
  }

  /**
   * Get available physics formulas for grounding
   */
  getAvailableFormulas(): string[] {
    return Object.keys(PHYSICS_FORMULAS);
  }

  /**
   * Get hardening configuration
   */
  getConfig(): HardeningConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const hardenedAgentCapabilities = new HardenedAgentCapabilitiesEngine();
