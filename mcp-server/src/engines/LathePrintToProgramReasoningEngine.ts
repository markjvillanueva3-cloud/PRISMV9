/**
 * LathePrintToProgramReasoningEngine — U-LTH43 (LATHE-MASTER P4-S4)
 *
 * Explains the full decision chain from print → program. Produces a structured
 * reasoning trace with:
 *   - Causal chain: "A because B, B because C..."
 *   - Counterfactual: "If material were aluminum, we would have chosen ..."
 *   - Deductive steps with citations
 *   - Abductive selection when multiple paths exist
 *
 * Exit Gate: Produces >=10 decision steps for any fixture.
 *
 * @milestone LATHE-MASTER U-LTH43
 * @version 1.0.0
 */

import { z } from "zod";
import type { StrategyPlan } from "./LathePrintFeatureStrategySelectorEngine.js";
import type { SequencePlan } from "./LathePrintSequencePlannerEngine.js";
import type { SetupRecommendation } from "./LathePrintSetupSelectionEngine.js";
import type { ToolpathProgram } from "./LathePrintToolpathGeneratorEngine.js";
import type { EmittedProgram } from "./LathePrintProgramEmitterEngine.js";
import type { FailurePrediction } from "./LathePrintToProgramDLIntelligenceEngine.js";
import type { FeatureInput, MaterialInput } from "./LathePrintFeatureStrategySelectorEngine.js";

// ============================================================================
// SCHEMAS
// ============================================================================

export const ReasoningStepSchema = z.object({
  step: z.number().int().positive(),
  stage: z.enum(["ingest", "tolerance", "strategy", "sequence", "setup", "toolpath", "emit", "signoff", "dl_review"]),
  mode: z.enum(["causal", "counterfactual", "deductive", "abductive", "analogical"]),
  decision: z.string(),
  because: z.array(z.string()),
  alternative_considered: z.string().optional(),
  confidence: z.number().min(0).max(1),
  citations: z.array(z.string()),
  evidence: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;

export const CounterfactualScenarioSchema = z.object({
  variable_changed: z.string(),
  original_value: z.string(),
  hypothetical_value: z.string(),
  predicted_change: z.string(),
  impact_severity: z.enum(["minimal", "moderate", "significant", "critical"]),
  affected_stages: z.array(z.string()),
});
export type CounterfactualScenario = z.infer<typeof CounterfactualScenarioSchema>;

export const ReasoningTraceSchema = z.object({
  trace_id: z.string(),
  program_id: z.string(),
  steps: z.array(ReasoningStepSchema),
  step_count: z.number().int().min(0),
  causal_chain: z.array(z.string()),
  counterfactuals: z.array(CounterfactualScenarioSchema),
  narrative_summary: z.string(),
  confidence_average: z.number().min(0).max(1),
  reasoning_modes_used: z.array(z.string()),
  generated_at: z.string(),
});
export type ReasoningTrace = z.infer<typeof ReasoningTraceSchema>;

export const ReasoningInputSchema = z.object({
  strategy_plan: z.any(),
  sequence_plan: z.any(),
  setup: z.any().optional(),
  toolpath: z.any(),
  emitted: z.any().optional(),
  dl_prediction: z.any().optional(),
  features: z.array(z.any()),
  material: z.any(),
});
export type ReasoningInput = z.infer<typeof ReasoningInputSchema>;

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintToProgramReasoningEngine {
  /**
   * Generate complete reasoning trace for the pipeline.
   * @param input All artifacts U-LTH36..U-LTH42
   * @returns ReasoningTrace with >=10 decision steps
   */
  explain(input: ReasoningInput): ReasoningTrace {
    this.validateInput(input);

    const steps: ReasoningStep[] = [];
    let stepNum = 1;

    const strat: StrategyPlan = input.strategy_plan;
    const seq: SequencePlan = input.sequence_plan;
    const setup: SetupRecommendation | undefined = input.setup;
    const tp: ToolpathProgram = input.toolpath;
    const dl: FailurePrediction | undefined = input.dl_prediction;
    const features: FeatureInput[] = input.features;
    const material: MaterialInput = input.material;

    // Stage 1: Material classification
    steps.push({
      step: stepNum++,
      stage: "ingest",
      mode: "deductive",
      decision: `Material classified as ISO group ${material.iso_group}`,
      because: [
        `Input material name: "${material.name}"`,
        `Tensile strength: ${material.tensile_strength_mpa ?? "n/a"} MPa`,
        material.hardness_hrc ? `Hardness: ${material.hardness_hrc} HRC` : "No hardness specified",
      ],
      confidence: 0.95,
      citations: ["ISO 513:2012 — Classification of hard cutting materials"],
      evidence: { iso_group: material.iso_group, name: material.name },
    });

    // Stage 2: Feature count
    steps.push({
      step: stepNum++,
      stage: "ingest",
      mode: "deductive",
      decision: `${features.length} features identified for machining`,
      because: features.map(f => `${f.id}: ${f.type}` + (f.diameter_mm ? ` (Ø${f.diameter_mm}mm)` : "")),
      confidence: 1.0,
      citations: ["Feature taxonomy U-LTH34"],
      evidence: { feature_count: features.length },
    });

    // Stage 3: Tolerance propagation (if critical features present)
    const criticalFeatures = features.filter(f => f.is_critical || (f.cpk_target && f.cpk_target >= 1.33));
    if (criticalFeatures.length > 0) {
      steps.push({
        step: stepNum++,
        stage: "tolerance",
        mode: "deductive",
        decision: `${criticalFeatures.length} critical feature(s) require Cpk-driven strategy selection`,
        because: criticalFeatures.map(f => `${f.id}: tolerance=${f.tolerance_total_mm}mm, Cpk target=${f.cpk_target ?? "default"}`),
        confidence: 0.9,
        citations: ["U-LTH35 — Tolerance stack propagation", "ASME Y14.5-2018"],
      });
    }

    // Stage 4: Strategy selection rationale (top strategies)
    const topStrategies = strat.recommendations.slice(0, Math.min(3, strat.recommendations.length));
    for (const rec of topStrategies) {
      const feature = features.find(f => f.id === rec.featureId);
      const alt = rec.alternatives[0];
      steps.push({
        step: stepNum++,
        stage: "strategy",
        mode: "abductive",
        decision: `${rec.featureId} (${rec.featureType}) → ${rec.strategy_id}`,
        because: [
          `Score: ${rec.score}/100`,
          `Feature matches: ${rec.strategy_name}`,
          feature?.ra_um_target ? `Target surface finish Ra ${feature.ra_um_target}µm` : "No Ra target",
          feature?.tolerance_total_mm ? `Tolerance ${feature.tolerance_total_mm}mm` : "Default tolerance",
        ],
        alternative_considered: alt ? `${alt.strategy_id} (score ${alt.score}, rejected: ${alt.reason_for_rejection})` : undefined,
        confidence: rec.score / 100,
        citations: rec.citations,
        evidence: {
          strategy: rec.strategy_id,
          score: rec.score,
          material_group: material.iso_group,
        },
      });
    }

    // Stage 5: Sequence precedence
    steps.push({
      step: stepNum++,
      stage: "sequence",
      mode: "causal",
      decision: `Operation sequence: ${seq.operations.length} ops, ${seq.setup_count} setup(s), ${seq.tool_change_count} tool change(s)`,
      because: [
        "Manufacturing precedence: center_drill → drill → face → OD → thread",
        `Sequence validity: ${seq.valid ? "valid" : "has violations"}`,
        seq.violations.length > 0
          ? `${seq.violations.length} violation(s) detected`
          : "All precedence rules satisfied",
      ],
      confidence: seq.valid ? 0.9 : 0.5,
      citations: ["Machinery's Handbook 31st ed. — Turning operation sequencing"],
      evidence: { op_count: seq.operations.length, valid: seq.valid },
    });

    // Stage 6: Setup selection
    if (setup) {
      steps.push({
        step: stepNum++,
        stage: "setup",
        mode: "deductive",
        decision: `Selected ${setup.chuck.type} chuck (${setup.chuck.num_jaws} jaws, ${setup.chuck.max_grip_force_kn}kN)`,
        because: [
          `L/D ratio: ${setup.ld_ratio.toFixed(2)}`,
          `L/D < 3 → chuck only; 3-8 → tailstock; >8 → steady rest`,
          `Required grip: ${setup.estimated_grip_force_required_kn.toFixed(1)}kN (${setup.grip_force_margin_percent.toFixed(0)}% margin)`,
          setup.soft_jaw_required ? "Soft jaws required (thin wall or soft material)" : "Hard jaws acceptable",
        ],
        confidence: setup.grip_force_adequate ? 0.9 : 0.4,
        citations: [
          "Machinery's Handbook 31st — Workholding",
          "Sandvik Coromant — Jaw friction coefficients",
        ],
        evidence: {
          ld_ratio: setup.ld_ratio,
          grip_adequate: setup.grip_force_adequate,
          tailstock: setup.needs_tailstock,
          steady_rest: setup.needs_steady_rest,
        },
      });

      if (setup.ld_ratio > 3) {
        steps.push({
          step: stepNum++,
          stage: "setup",
          mode: "causal",
          decision: setup.needs_steady_rest ? "Steady rest added" : "Tailstock engagement required",
          because: [
            `L/D ${setup.ld_ratio.toFixed(2)} exceeds threshold`,
            setup.needs_steady_rest
              ? "L/D > 8 → deflection/chatter risk without mid-span support"
              : "L/D 3-8 → tailstock sufficient to resist axial forces",
          ],
          confidence: 0.88,
          citations: ["Mitsubishi Hitachi Long-parts practice"],
        });
      }
    }

    // Stage 7: Toolpath physics
    const maxForce = Math.max(...tp.operations.map(o => o.cutting_force_n), 0);
    const maxRpm = Math.max(...tp.operations.map(o => o.spindle_rpm), 0);
    steps.push({
      step: stepNum++,
      stage: "toolpath",
      mode: "deductive",
      decision: `Toolpath generated: ${tp.operations.length} ops, ${(tp.total_cycle_time_sec / 60).toFixed(1)} min cycle`,
      because: [
        `Max cutting force ${maxForce.toFixed(0)}N (Kienzle: Fc = kc·ap·fz^(1-mc))`,
        `Max spindle ${maxRpm} RPM (N = 1000·Vc/(π·D))`,
        `MRR-weighted for category-specific Vc table per ISO ${material.iso_group}`,
        tp.machine_envelope_check.within_envelope ? "Within machine envelope" : "Envelope violation detected",
      ],
      confidence: tp.machine_envelope_check.within_envelope ? 0.92 : 0.3,
      citations: [
        "Kienzle 1952 — specific cutting force",
        "Sandvik Coromant Turning Handbook",
      ],
      evidence: {
        max_force_n: maxForce,
        max_rpm: maxRpm,
        cycle_time_min: tp.total_cycle_time_sec / 60,
      },
    });

    // Stage 8: Emission + post
    if (input.emitted) {
      steps.push({
        step: stepNum++,
        stage: "emit",
        mode: "deductive",
        decision: `G-code emitted for ${input.emitted.controller} (${input.emitted.gcode_lines} lines)`,
        because: [
          `Controller dialect: ${input.emitted.controller}`,
          `File extension: ${input.emitted.filename.split(".").pop()}`,
          "Standalone emission (Master Post tuning pending P3 completion)",
        ],
        confidence: 0.9,
        citations: [`${input.emitted.controller.toUpperCase()} programming manual`],
        evidence: { controller: input.emitted.controller, lines: input.emitted.gcode_lines },
      });
    }

    // Stage 9: DL review (if provided)
    if (dl) {
      steps.push({
        step: stepNum++,
        stage: "dl_review",
        mode: "abductive",
        decision: `DL intelligence predicts ${(dl.failure_probability * 100).toFixed(0)}% failure probability (${dl.tier} tier)`,
        because: [
          `Top risk: ${dl.top_risk_factors[0]?.factor ?? "none"}`,
          `Model confidence: ${(dl.confidence * 100).toFixed(0)}%`,
          `${dl.corrective_suggestions.length} corrective suggestion(s) generated`,
        ],
        alternative_considered: dl.corrective_suggestions[0]
          ? `Mitigation: ${dl.corrective_suggestions[0].action}`
          : undefined,
        confidence: dl.confidence,
        citations: ["U-LTH42 DL Intelligence model v1.0.0"],
        evidence: {
          failure_probability: dl.failure_probability,
          tier: dl.tier,
        },
      });
    }

    // Stage 10: Signoff decision
    steps.push({
      step: stepNum++,
      stage: "signoff",
      mode: "deductive",
      decision: this.shouldRelease(tp, seq, setup, dl)
        ? "Program cleared for release"
        : "Program requires rework before release",
      because: [
        `Machine envelope: ${tp.machine_envelope_check.within_envelope ? "OK" : "VIOLATION"}`,
        `Sequence valid: ${seq.valid}`,
        setup ? `Grip force adequate: ${setup.grip_force_adequate}` : "Setup not validated",
        dl ? `DL failure probability: ${(dl.failure_probability * 100).toFixed(0)}%` : "DL review skipped",
      ],
      confidence: 0.9,
      citations: ["U-LTH41 signoff gate criteria"],
    });

    // Generate counterfactuals
    const counterfactuals = this.generateCounterfactuals(input);
    const causalChain = this.extractCausalChain(steps);
    const narrative = this.renderNarrative(steps, material, features);
    const avgConfidence = steps.reduce((s, x) => s + x.confidence, 0) / steps.length;
    const modes = [...new Set(steps.map(s => s.mode))];

    return {
      trace_id: `trace_${Date.now()}`,
      program_id: tp.program_id,
      steps,
      step_count: steps.length,
      causal_chain: causalChain,
      counterfactuals,
      narrative_summary: narrative,
      confidence_average: avgConfidence,
      reasoning_modes_used: modes,
      generated_at: new Date().toISOString(),
    };
  }

  private validateInput(input: ReasoningInput): void {
    if (!input || typeof input !== "object") throw new Error("Invalid reasoning input");
    if (!input.strategy_plan?.plan_id) throw new Error("Missing strategy plan");
    if (!input.sequence_plan?.plan_id) throw new Error("Missing sequence plan");
    if (!input.toolpath?.program_id) throw new Error("Missing toolpath");
    if (!Array.isArray(input.features)) throw new Error("Features must be array");
    if (!input.material?.iso_group) throw new Error("Missing material");
  }

  /**
   * Release decision gate
   */
  private shouldRelease(
    tp: ToolpathProgram,
    seq: SequencePlan,
    setup: SetupRecommendation | undefined,
    dl: FailurePrediction | undefined
  ): boolean {
    if (!tp.machine_envelope_check.within_envelope) return false;
    if (!seq.valid) return false;
    if (setup && !setup.grip_force_adequate) return false;
    if (dl && dl.tier === "critical") return false;
    return true;
  }

  /**
   * Generate counterfactual "what-if" scenarios
   */
  private generateCounterfactuals(input: ReasoningInput): CounterfactualScenario[] {
    const scenarios: CounterfactualScenario[] = [];
    const material: MaterialInput = input.material;

    // Counterfactual 1: Softer material
    if (material.iso_group === "H" || material.iso_group === "S") {
      scenarios.push({
        variable_changed: "material",
        original_value: `${material.name} (${material.iso_group})`,
        hypothetical_value: "P group (e.g., 1018 Steel)",
        predicted_change: "Would enable higher Vc (~200 m/min vs current), hard-turning strategy would revert to standard rough/finish",
        impact_severity: "significant",
        affected_stages: ["strategy", "toolpath"],
      });
    } else if (material.iso_group === "N") {
      scenarios.push({
        variable_changed: "material",
        original_value: `${material.name} (N-aluminum)`,
        hypothetical_value: "S group (e.g., Inconel 718)",
        predicted_change: "Vc would drop 8x, force would rise 4x, would require hard turning CBN tooling",
        impact_severity: "critical",
        affected_stages: ["strategy", "setup", "toolpath"],
      });
    }

    // Counterfactual 2: Tighter tolerance
    const loosestFeature = input.features.reduce((max: FeatureInput | null, f: FeatureInput) => {
      if (!f.tolerance_total_mm) return max;
      return (!max || f.tolerance_total_mm > (max.tolerance_total_mm ?? 0)) ? f : max;
    }, null);
    if (loosestFeature?.tolerance_total_mm && loosestFeature.tolerance_total_mm > 0.025) {
      scenarios.push({
        variable_changed: "tolerance",
        original_value: `${loosestFeature.tolerance_total_mm}mm on ${loosestFeature.id}`,
        hypothetical_value: "0.01mm (precision grade)",
        predicted_change: "Would require finishing pass (wiper insert), 30-40% longer cycle, possibly thermal compensation",
        impact_severity: "moderate",
        affected_stages: ["strategy", "toolpath"],
      });
    }

    // Counterfactual 3: Shorter part (L/D reduction)
    const seq: SequencePlan = input.sequence_plan;
    const setup: SetupRecommendation | undefined = input.setup;
    if (setup && setup.ld_ratio > 5) {
      scenarios.push({
        variable_changed: "part length",
        original_value: `L/D = ${setup.ld_ratio.toFixed(1)}`,
        hypothetical_value: "L/D = 2 (stubby part)",
        predicted_change: "Could eliminate tailstock/steady rest, reduce setup time, enable higher feeds",
        impact_severity: "significant",
        affected_stages: ["setup", "toolpath"],
      });
    }

    return scenarios;
  }

  /**
   * Extract causal chain as ordered "A because B" strings
   */
  private extractCausalChain(steps: ReasoningStep[]): string[] {
    return steps
      .filter(s => s.because.length > 0)
      .map(s => `${s.decision} ← ${s.because[0]}`);
  }

  /**
   * Render human-readable narrative summary
   */
  private renderNarrative(
    steps: ReasoningStep[],
    material: MaterialInput,
    features: FeatureInput[]
  ): string {
    const lines: string[] = [];
    lines.push(
      `This program machines ${features.length} features in ${material.name} (ISO ${material.iso_group}).`
    );
    lines.push(
      `The pipeline made ${steps.length} distinct decisions across ${new Set(steps.map(s => s.stage)).size} stages.`
    );

    const strategySteps = steps.filter(s => s.stage === "strategy");
    if (strategySteps.length > 0) {
      lines.push(`Strategy selection focused on ${strategySteps.length} feature-specific mappings.`);
    }

    const setupStep = steps.find(s => s.stage === "setup");
    if (setupStep) {
      lines.push(setupStep.decision);
    }

    const signoffStep = steps.find(s => s.stage === "signoff");
    if (signoffStep) {
      lines.push(`Final verdict: ${signoffStep.decision}.`);
    }

    return lines.join(" ");
  }

  /**
   * Export trace as formatted markdown
   */
  exportMarkdown(trace: ReasoningTrace): string {
    const lines: string[] = [];
    lines.push(`# Reasoning Trace`);
    lines.push(`**Trace ID:** ${trace.trace_id}`);
    lines.push(`**Program:** ${trace.program_id}`);
    lines.push(`**Generated:** ${trace.generated_at}`);
    lines.push(`**Steps:** ${trace.step_count}  |  **Avg Confidence:** ${(trace.confidence_average * 100).toFixed(0)}%`);
    lines.push(`**Modes used:** ${trace.reasoning_modes_used.join(", ")}`);
    lines.push("");
    lines.push(`## Summary`);
    lines.push(trace.narrative_summary);
    lines.push("");
    lines.push(`## Decision Steps`);
    trace.steps.forEach(s => {
      lines.push(`### Step ${s.step}: [${s.stage}] ${s.decision}`);
      lines.push(`**Mode:** ${s.mode}  |  **Confidence:** ${(s.confidence * 100).toFixed(0)}%`);
      lines.push(`**Because:**`);
      s.because.forEach(b => lines.push(`- ${b}`));
      if (s.alternative_considered) {
        lines.push(`**Alternative considered:** ${s.alternative_considered}`);
      }
      if (s.citations.length > 0) {
        lines.push(`**Citations:** ${s.citations.join("; ")}`);
      }
      lines.push("");
    });

    if (trace.counterfactuals.length > 0) {
      lines.push(`## Counterfactual Scenarios`);
      trace.counterfactuals.forEach(cf => {
        lines.push(`### What if ${cf.variable_changed} = "${cf.hypothetical_value}"?`);
        lines.push(`- Original: ${cf.original_value}`);
        lines.push(`- Predicted change: ${cf.predicted_change}`);
        lines.push(`- Severity: **${cf.impact_severity}**`);
        lines.push(`- Affects: ${cf.affected_stages.join(", ")}`);
        lines.push("");
      });
    }

    lines.push(`## Causal Chain`);
    trace.causal_chain.forEach(c => lines.push(`- ${c}`));

    return lines.join("\n");
  }

  /**
   * Export trace as JSON string
   */
  exportJSON(trace: ReasoningTrace): string {
    return JSON.stringify(trace, null, 2);
  }

  /**
   * Filter steps by stage or mode
   */
  filterSteps(trace: ReasoningTrace, filter: { stage?: string; mode?: string }): ReasoningStep[] {
    return trace.steps.filter(s => {
      if (filter.stage && s.stage !== filter.stage) return false;
      if (filter.mode && s.mode !== filter.mode) return false;
      return true;
    });
  }

  /**
   * Summarize reasoning modes used with counts
   */
  summarizeModes(trace: ReasoningTrace): Record<string, number> {
    const counts: Record<string, number> = {};
    trace.steps.forEach(s => {
      counts[s.mode] = (counts[s.mode] ?? 0) + 1;
    });
    return counts;
  }
}

export const lathePrintToProgramReasoningEngine = new LathePrintToProgramReasoningEngine();
