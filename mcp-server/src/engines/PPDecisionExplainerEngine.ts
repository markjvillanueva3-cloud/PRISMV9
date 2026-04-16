/**
 * PPDecisionExplainerEngine — PP-DL-MS9
 *
 * Generates human-readable explanations for PP-AGI decisions.
 * When the system recommends a controller dialect, machine config,
 * material substitution, or toolpath strategy, this engine explains WHY.
 *
 * Explanation types:
 *   - Feature attribution: which embedding dimensions drove the decision
 *   - Counterfactual: "if X were different, result would be Y"
 *   - Analogical: "this is similar to known scenario Z because..."
 *   - Risk narrative: human-readable risk explanation
 *
 * @module PPDecisionExplainerEngine
 */

import { ppControllerEmbeddingEngine, EMBEDDING_DIM } from "./PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine, MACHINE_EMBEDDING_DIM } from "./PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine, MATERIAL_EMBEDDING_DIM } from "./PPMaterialPropertyVectorEngine.js";
import { ppMultiModalFusionEngine, type ScenarioInput } from "./PPMultiModalFusionEngine.js";
import { ppEnsembleUncertaintyEngine } from "./PPEnsembleUncertaintyEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface FeatureAttribution {
  dimension: number;
  name: string;
  domain: "controller" | "machine" | "material";
  value: number;
  contribution: "positive" | "negative" | "neutral";
  explanation: string;
}

export interface CounterfactualExplanation {
  original: ScenarioInput;
  changed_field: string;
  changed_to: string;
  impact: string;
  confidence_delta: number;
}

export interface DecisionExplanation {
  scenario: ScenarioInput;
  summary: string;
  confidence: number;
  recommendation: string;
  top_factors: FeatureAttribution[];
  counterfactuals: CounterfactualExplanation[];
  analogies: string[];
  risk_narrative: string;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPDecisionExplainerEngine {
  /**
   * Generate a full explanation for a machining scenario decision.
   */
  explain(scenario: ScenarioInput): DecisionExplanation {
    const fused = ppMultiModalFusionEngine.fuse(scenario);
    const uncertainty = ppEnsembleUncertaintyEngine.estimateUncertainty(scenario);

    const topFactors = this.computeAttributions(scenario);
    const counterfactuals = this.generateCounterfactuals(scenario);
    const analogies = this.findAnalogies(scenario);
    const riskNarrative = this.generateRiskNarrative(uncertainty);

    const summary = this.generateSummary(scenario, uncertainty, fused?.compatibility.overall ?? 0);
    const recommendation = this.generateRecommendation(uncertainty);

    return {
      scenario,
      summary,
      confidence: uncertainty.confidence,
      recommendation,
      top_factors: topFactors.slice(0, 5),
      counterfactuals,
      analogies,
      risk_narrative: riskNarrative,
    };
  }

  /**
   * Explain why controller A was chosen over controller B.
   */
  explainControllerChoice(chosen: string, alternative: string): string {
    const comparison = ppControllerEmbeddingEngine.compare(chosen, alternative);
    const chosenEmb = ppControllerEmbeddingEngine.embed(chosen);
    const altEmb = ppControllerEmbeddingEngine.embed(alternative);

    const lines: string[] = [];
    lines.push(`Chose ${chosenEmb.display_name} over ${altEmb.display_name}:`);

    if (comparison.shared_features.length > 0) {
      lines.push(`  Shared: ${comparison.shared_features.slice(0, 3).join(", ")}`);
    }
    if (comparison.divergent_features.length > 0) {
      lines.push(`  Key differences: ${comparison.divergent_features.slice(0, 3).join(", ")}`);
    }
    lines.push(`  Similarity: ${(comparison.cosine_similarity * 100).toFixed(1)}%`);

    return lines.join("\n");
  }

  /**
   * Explain a material substitution recommendation.
   */
  explainMaterialSubstitution(original: string, substitute: string): string {
    const comp = ppMaterialPropertyVectorEngine.compare(original, substitute);
    if (!comp) return `Cannot compare: one or both materials not in database.`;

    const lines: string[] = [];
    lines.push(`Material substitution: ${original} → ${substitute}`);
    lines.push(`  Similarity: ${(comp.cosine_similarity * 100).toFixed(1)}%`);
    lines.push(`  Safe to substitute: ${comp.substitution_safe ? "YES" : "NO — verify cutting parameters"}`);
    lines.push(`  Parameter transfer confidence: ${(comp.parameter_transfer_confidence * 100).toFixed(0)}%`);

    if (comp.key_differences.length > 0) {
      lines.push(`  Key differences: ${comp.key_differences.slice(0, 4).join(", ")}`);
    }

    return lines.join("\n");
  }

  // ── Private ──────────────────────────────────────────────────────────

  private computeAttributions(scenario: ScenarioInput): FeatureAttribution[] {
    const attrs: FeatureAttribution[] = [];

    const ctrlEmb = ppControllerEmbeddingEngine.embed(scenario.controller_id);
    if (ctrlEmb) {
      for (let i = 0; i < Math.min(EMBEDDING_DIM, ctrlEmb.vector.length); i++) {
        const v = ctrlEmb.vector[i];
        if (v > 0.5) {
          attrs.push({
            dimension: i,
            name: ppControllerEmbeddingEngine.dimensionName(i),
            domain: "controller",
            value: v,
            contribution: "positive",
            explanation: `Controller has ${ppControllerEmbeddingEngine.dimensionName(i)} = ${v.toFixed(2)}`,
          });
        }
      }
    }

    const machEmb = ppMachineVectorEncoderEngine.embed(scenario.machine_id);
    if (machEmb) {
      for (let i = 0; i < Math.min(MACHINE_EMBEDDING_DIM, machEmb.vector.length); i++) {
        const v = machEmb.vector[i];
        if (v > 0.5) {
          attrs.push({
            dimension: i,
            name: ppMachineVectorEncoderEngine.dimensionName(i),
            domain: "machine",
            value: v,
            contribution: "positive",
            explanation: `Machine has ${ppMachineVectorEncoderEngine.dimensionName(i)} = ${v.toFixed(2)}`,
          });
        }
      }
    }

    // Sort by value descending
    attrs.sort((a, b) => b.value - a.value);
    return attrs;
  }

  private generateCounterfactuals(scenario: ScenarioInput): CounterfactualExplanation[] {
    const cfs: CounterfactualExplanation[] = [];
    const baseUncertainty = ppEnsembleUncertaintyEngine.estimateUncertainty(scenario);

    // What if we used a different controller?
    const controllers = ppControllerEmbeddingEngine.embedAll();
    const altCtrl = controllers.find(c => c.controller_id !== scenario.controller_id);
    if (altCtrl) {
      const altScenario = { ...scenario, controller_id: altCtrl.controller_id };
      const altUncertainty = ppEnsembleUncertaintyEngine.estimateUncertainty(altScenario);
      const delta = round2(altUncertainty.confidence - baseUncertainty.confidence);
      cfs.push({
        original: scenario,
        changed_field: "controller_id",
        changed_to: altCtrl.controller_id,
        impact: delta > 0 ? `Would increase confidence by ${(delta * 100).toFixed(0)}%` :
                delta < 0 ? `Would decrease confidence by ${(-delta * 100).toFixed(0)}%` :
                "No significant impact",
        confidence_delta: delta,
      });
    }

    return cfs;
  }

  private findAnalogies(scenario: ScenarioInput): string[] {
    const analogies: string[] = [];

    const ctrlNearest = ppControllerEmbeddingEngine.findNearest(scenario.controller_id, 1);
    if (ctrlNearest.neighbors.length > 0) {
      const n = ctrlNearest.neighbors[0];
      analogies.push(
        `Controller behaves like ${n.display_name} (${(n.cosine_similarity * 100).toFixed(0)}% similar)`
      );
    }

    const machNearest = ppMachineVectorEncoderEngine.findNearest(scenario.machine_id, 1);
    if (machNearest && machNearest.neighbors.length > 0) {
      const n = machNearest.neighbors[0];
      analogies.push(
        `Machine is closest to ${n.machine_name} (${(n.cosine_similarity * 100).toFixed(0)}% similar)`
      );
    }

    const matNearest = ppMaterialPropertyVectorEngine.findNearest(scenario.material_id, 1);
    if (matNearest && matNearest.neighbors.length > 0) {
      const n = matNearest.neighbors[0];
      analogies.push(
        `Material is closest to ${n.material_name} (${(n.cosine_similarity * 100).toFixed(0)}% similar)`
      );
    }

    return analogies;
  }

  private generateRiskNarrative(u: ReturnType<typeof ppEnsembleUncertaintyEngine.estimateUncertainty>): string {
    if (u.dimension_uncertainties.length === 0) {
      return "No significant risks identified. All domains are well-characterized.";
    }

    const risks = u.dimension_uncertainties
      .sort((a, b) => b.uncertainty - a.uncertainty)
      .slice(0, 3)
      .map(d => d.reason);

    return `Key risks: ${risks.join(". ")}. Overall confidence: ${(u.confidence * 100).toFixed(0)}%.`;
  }

  private generateSummary(
    scenario: ScenarioInput,
    uncertainty: ReturnType<typeof ppEnsembleUncertaintyEngine.estimateUncertainty>,
    compatibility: number,
  ): string {
    const conf = (uncertainty.confidence * 100).toFixed(0);
    const compat = (compatibility * 100).toFixed(0);
    return `Scenario: ${scenario.controller_id} + ${scenario.machine_id} + ${scenario.material_id}. ` +
      `Compatibility: ${compat}%. Confidence: ${conf}%. ` +
      `Recommendation: ${uncertainty.recommendation}.`;
  }

  private generateRecommendation(u: ReturnType<typeof ppEnsembleUncertaintyEngine.estimateUncertainty>): string {
    switch (u.recommendation) {
      case "proceed": return "High confidence — proceed with generated post-processor settings.";
      case "verify": return "Moderate confidence — verify critical parameters before running on machine.";
      case "caution": return "Low confidence — manual review required. Check controller dialect and machine limits.";
      case "insufficient_data": return "Insufficient data — too many unknowns for reliable recommendation.";
    }
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100; }

export const ppDecisionExplainerEngine = new PPDecisionExplainerEngine();
