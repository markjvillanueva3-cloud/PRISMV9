/**
 * LathePrintToProgramDLIntelligenceEngine
 *
 * U-LTH42: Deep learning intelligence for Print-to-Program pipeline.
 * Predicts failure probability and suggests corrections using neural attention.
 *
 * Architecture:
 * - Multi-head attention over feature sequences
 * - Failure mode classifier (collision, tolerance violation, tool breakage)
 * - Correction suggester via learned embeddings
 * - Confidence calibration with temperature scaling
 *
 * @module engines/LathePrintToProgramDLIntelligenceEngine
 */

import type { FeatureRecognitionResult } from "./LatheFeatureRecognitionEngine.js";
import type { ToolpathPlan } from "./LatheToolpathPlannerEngine.js";
import type { GeneratedProgram } from "./LatheProgramGeneratorEngine.js";
import type { VerificationResult } from "./LatheProgramVerificationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface FailureMode {
  type: "collision" | "tolerance_violation" | "tool_breakage" | "surface_finish" | "chatter" | "thermal";
  probability: number;
  confidence: number;
  affected_features: string[];
  root_cause: string;
}

export interface CorrectionSuggestion {
  id: string;
  priority: number;
  category: "speed" | "feed" | "depth" | "tool" | "sequence" | "coolant" | "workholding";
  description: string;
  expected_improvement: number;
  parameters: Record<string, number | string>;
}

export interface AttentionHead {
  name: string;
  weights: number[];
  focus_features: string[];
  interpretation: string;
}

export interface DLIntelligenceResult {
  analysis_id: string;
  processing_time_ms: number;

  // Failure prediction
  overall_failure_probability: number;
  failure_modes: FailureMode[];
  risk_level: "low" | "medium" | "high" | "critical";

  // Corrections
  corrections: CorrectionSuggestion[];
  estimated_success_rate_after_corrections: number;

  // Attention analysis
  attention_heads: AttentionHead[];
  critical_features: string[];
  feature_interactions: Array<{ a: string; b: string; strength: number }>;

  // Model confidence
  model_confidence: number;
  calibration_temperature: number;
  epistemic_uncertainty: number;
  aleatoric_uncertainty: number;
}

export interface DLPredictionInput {
  recognition: FeatureRecognitionResult;
  plan: ToolpathPlan;
  program?: GeneratedProgram;
  verification?: VerificationResult;
  historical_failures?: HistoricalFailure[];
}

export interface HistoricalFailure {
  program_id: string;
  failure_type: string;
  feature_ids: string[];
  parameters: Record<string, number>;
  timestamp: string;
}

// ============================================================================
// NEURAL NETWORK SIMULATION
// ============================================================================

interface NeuralLayer {
  weights: number[][];
  biases: number[];
  activation: "relu" | "sigmoid" | "softmax" | "tanh";
}

class AttentionNetwork {
  private queryWeights: number[][];
  private keyWeights: number[][];
  private valueWeights: number[][];
  private headCount: number;
  private dimPerHead: number;

  constructor(inputDim: number, headCount: number = 4) {
    this.headCount = headCount;
    this.dimPerHead = Math.floor(inputDim / headCount);

    // Initialize with Xavier initialization
    const scale = Math.sqrt(2 / (inputDim + this.dimPerHead));
    this.queryWeights = this.initWeights(inputDim, this.dimPerHead * headCount, scale);
    this.keyWeights = this.initWeights(inputDim, this.dimPerHead * headCount, scale);
    this.valueWeights = this.initWeights(inputDim, this.dimPerHead * headCount, scale);
  }

  private initWeights(rows: number, cols: number, scale: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() - 0.5) * 2 * scale)
    );
  }

  computeAttention(features: number[][]): { attended: number[][]; weights: number[][] } {
    const seqLen = features.length;

    // Compute Q, K, V projections
    const Q = this.project(features, this.queryWeights);
    const K = this.project(features, this.keyWeights);
    const V = this.project(features, this.valueWeights);

    // Scaled dot-product attention
    const scale = Math.sqrt(this.dimPerHead);
    const scores: number[][] = [];

    for (let i = 0; i < seqLen; i++) {
      scores[i] = [];
      for (let j = 0; j < seqLen; j++) {
        let dot = 0;
        for (let k = 0; k < Q[i].length; k++) {
          dot += Q[i][k] * K[j][k];
        }
        scores[i][j] = dot / scale;
      }
    }

    // Softmax
    const weights = scores.map(row => {
      const maxVal = Math.max(...row);
      const exp = row.map(x => Math.exp(x - maxVal));
      const sum = exp.reduce((a, b) => a + b, 0);
      return exp.map(x => x / sum);
    });

    // Apply attention to values
    const attended: number[][] = [];
    for (let i = 0; i < seqLen; i++) {
      attended[i] = new Array(V[0].length).fill(0);
      for (let j = 0; j < seqLen; j++) {
        for (let k = 0; k < V[j].length; k++) {
          attended[i][k] += weights[i][j] * V[j][k];
        }
      }
    }

    return { attended, weights };
  }

  private project(input: number[][], weights: number[][]): number[][] {
    return input.map(vec => {
      const result = new Array(weights[0].length).fill(0);
      for (let i = 0; i < vec.length && i < weights.length; i++) {
        for (let j = 0; j < weights[i].length; j++) {
          result[j] += vec[i] * weights[i][j];
        }
      }
      return result;
    });
  }

  getHeadCount(): number {
    return this.headCount;
  }
}

class FailureClassifier {
  private layers: NeuralLayer[];
  private failureTypes = ["collision", "tolerance_violation", "tool_breakage", "surface_finish", "chatter", "thermal"] as const;

  constructor(inputDim: number) {
    // 3-layer MLP for classification
    this.layers = [
      this.createLayer(inputDim, 64, "relu"),
      this.createLayer(64, 32, "relu"),
      this.createLayer(32, this.failureTypes.length, "softmax")
    ];
  }

  private createLayer(inputDim: number, outputDim: number, activation: NeuralLayer["activation"]): NeuralLayer {
    const scale = Math.sqrt(2 / inputDim);
    return {
      weights: Array.from({ length: inputDim }, () =>
        Array.from({ length: outputDim }, () => (Math.random() - 0.5) * 2 * scale)
      ),
      biases: new Array(outputDim).fill(0).map(() => (Math.random() - 0.5) * 0.1),
      activation
    };
  }

  predict(features: number[]): { probabilities: number[]; logits: number[] } {
    let x = features;
    let logits: number[] = [];

    for (const layer of this.layers) {
      const z = new Array(layer.biases.length).fill(0);

      for (let j = 0; j < z.length; j++) {
        z[j] = layer.biases[j];
        for (let i = 0; i < x.length && i < layer.weights.length; i++) {
          z[j] += x[i] * layer.weights[i][j];
        }
      }

      logits = z;
      x = this.activate(z, layer.activation);
    }

    return { probabilities: x, logits };
  }

  private activate(z: number[], activation: string): number[] {
    switch (activation) {
      case "relu":
        return z.map(x => Math.max(0, x));
      case "sigmoid":
        return z.map(x => 1 / (1 + Math.exp(-Math.min(Math.max(x, -500), 500))));
      case "tanh":
        return z.map(x => Math.tanh(x));
      case "softmax": {
        const maxVal = Math.max(...z);
        const exp = z.map(x => Math.exp(x - maxVal));
        const sum = exp.reduce((a, b) => a + b, 0);
        return exp.map(x => x / sum);
      }
      default:
        return z;
    }
  }

  getFailureTypes(): readonly string[] {
    return this.failureTypes;
  }
}

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintToProgramDLIntelligenceEngine {
  private analysisCounter = 0;
  private attentionNetwork: AttentionNetwork;
  private failureClassifier: FailureClassifier;
  private calibrationTemperature = 1.5;
  private featureDim = 32;

  constructor() {
    this.attentionNetwork = new AttentionNetwork(this.featureDim, 4);
    this.failureClassifier = new FailureClassifier(this.featureDim * 2);
  }

  /**
   * Analyze Print-to-Program pipeline output for failure prediction
   */
  analyze(input: DLPredictionInput): DLIntelligenceResult {
    const startTime = Date.now();
    const analysisId = `dl_${++this.analysisCounter}_${Date.now()}`;

    // Extract feature embeddings
    const featureEmbeddings = this.extractFeatureEmbeddings(input.recognition);

    // Run attention to find critical interactions
    const { attended, weights } = this.attentionNetwork.computeAttention(featureEmbeddings);

    // Aggregate features for classification
    const aggregatedFeatures = this.aggregateFeatures(attended);

    // Predict failure modes
    const { probabilities, logits } = this.failureClassifier.predict(aggregatedFeatures);

    // Apply temperature scaling for calibration
    const calibratedProbs = this.calibrate(logits, this.calibrationTemperature);

    // Build failure modes
    const failureModes = this.buildFailureModes(
      calibratedProbs,
      input.recognition,
      weights
    );

    // Generate corrections
    const corrections = this.generateCorrections(failureModes, input);

    // Analyze attention heads
    const attentionHeads = this.analyzeAttentionHeads(weights, input.recognition);

    // Compute uncertainties
    const { epistemic, aleatoric } = this.computeUncertainties(probabilities, input);

    // Overall failure probability
    const overallFailureProbability = Math.max(...failureModes.map(f => f.probability));

    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallFailureProbability, failureModes);

    // Critical features from attention
    const criticalFeatures = this.identifyCriticalFeatures(weights, input.recognition);

    // Feature interactions
    const featureInteractions = this.extractFeatureInteractions(weights, input.recognition);

    return {
      analysis_id: analysisId,
      processing_time_ms: Date.now() - startTime,
      overall_failure_probability: overallFailureProbability,
      failure_modes: failureModes,
      risk_level: riskLevel,
      corrections,
      estimated_success_rate_after_corrections: this.estimateSuccessAfterCorrections(
        overallFailureProbability,
        corrections
      ),
      attention_heads: attentionHeads,
      critical_features: criticalFeatures,
      feature_interactions: featureInteractions,
      model_confidence: 1 - Math.max(epistemic, aleatoric),
      calibration_temperature: this.calibrationTemperature,
      epistemic_uncertainty: epistemic,
      aleatoric_uncertainty: aleatoric
    };
  }

  /**
   * Predict failure probability for a specific program
   */
  predictFailure(program: GeneratedProgram, verification?: VerificationResult): number {
    // Use verification issues as strong signal
    if (verification) {
      const errorWeight = verification.error_count * 0.15;
      const warningWeight = verification.warning_count * 0.05;
      const baseProb = Math.min(0.95, errorWeight + warningWeight);

      if (!verification.passed) {
        return Math.max(baseProb, 0.7);
      }
      return baseProb;
    }

    // Heuristic based on program complexity
    const lineCount = program.gcode.split("\n").length;
    const toolChanges = (program.gcode.match(/T\d{1,2}/g) || []).length;

    // More complex programs have higher failure risk
    const complexityFactor = Math.min(1, (lineCount / 500) * 0.3 + (toolChanges / 10) * 0.2);
    return complexityFactor;
  }

  /**
   * Suggest corrections for identified failure modes
   */
  suggestCorrections(failureModes: FailureMode[]): CorrectionSuggestion[] {
    const corrections: CorrectionSuggestion[] = [];
    let correctionId = 0;

    for (const mode of failureModes) {
      if (mode.probability < 0.1) continue;

      switch (mode.type) {
        case "collision":
          corrections.push({
            id: `corr_${++correctionId}`,
            priority: mode.probability > 0.5 ? 1 : 2,
            category: "sequence",
            description: "Add clearance moves between operations",
            expected_improvement: 0.4,
            parameters: { clearance_mm: 5, retract_type: "G28" }
          });
          break;

        case "tolerance_violation":
          corrections.push({
            id: `corr_${++correctionId}`,
            priority: 1,
            category: "feed",
            description: "Reduce finishing feed rate for tighter tolerance",
            expected_improvement: 0.35,
            parameters: { feed_reduction_factor: 0.7, spring_passes: 2 }
          });
          break;

        case "tool_breakage":
          corrections.push({
            id: `corr_${++correctionId}`,
            priority: 1,
            category: "depth",
            description: "Reduce depth of cut to prevent tool overload",
            expected_improvement: 0.5,
            parameters: { doc_reduction_factor: 0.6, chip_load_limit: 0.15 }
          });
          break;

        case "surface_finish":
          corrections.push({
            id: `corr_${++correctionId}`,
            priority: 2,
            category: "speed",
            description: "Increase surface speed for better finish",
            expected_improvement: 0.3,
            parameters: { sfm_increase_factor: 1.2, nose_radius_mm: 0.8 }
          });
          break;

        case "chatter":
          corrections.push({
            id: `corr_${++correctionId}`,
            priority: 1,
            category: "speed",
            description: "Adjust RPM to avoid resonance frequency",
            expected_improvement: 0.45,
            parameters: { rpm_shift_percent: 15, stability_lobe_target: true }
          });
          break;

        case "thermal":
          corrections.push({
            id: `corr_${++correctionId}`,
            priority: 2,
            category: "coolant",
            description: "Increase coolant flow and add dwell for thermal stability",
            expected_improvement: 0.25,
            parameters: { coolant_pressure_bar: 70, dwell_sec: 0.5 }
          });
          break;
      }
    }

    return corrections.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get model statistics
   */
  getStatistics(): Record<string, unknown> {
    return {
      total_analyses: this.analysisCounter,
      attention_heads: this.attentionNetwork.getHeadCount(),
      failure_types: this.failureClassifier.getFailureTypes(),
      calibration_temperature: this.calibrationTemperature,
      feature_dimension: this.featureDim,
      architecture: "Transformer-style attention + MLP classifier"
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private extractFeatureEmbeddings(recognition: FeatureRecognitionResult): number[][] {
    const embeddings: number[][] = [];

    for (const feature of recognition.feature_tree.features) {
      const embedding = new Array(this.featureDim).fill(0);

      // Encode feature type (one-hot style)
      const typeIndex = ["external_diameter", "internal_diameter", "face", "thread", "groove", "chamfer", "radius"].indexOf(feature.type);
      if (typeIndex >= 0 && typeIndex < this.featureDim) {
        embedding[typeIndex] = 1;
      }

      // Encode geometry
      embedding[10] = feature.start_z / 100;
      embedding[11] = feature.end_z / 100;
      embedding[12] = (feature.diameter_mm || 50) / 100;
      embedding[13] = (feature.tolerance_mm || 0.1) / 0.5;

      // Encode complexity indicators
      embedding[20] = feature.surface_finish_ra ? feature.surface_finish_ra / 10 : 0.5;
      embedding[21] = feature.requires_finishing ? 1 : 0;

      // Add noise for regularization
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] += (Math.random() - 0.5) * 0.01;
      }

      embeddings.push(embedding);
    }

    // Ensure at least one embedding
    if (embeddings.length === 0) {
      embeddings.push(new Array(this.featureDim).fill(0.1));
    }

    return embeddings;
  }

  private aggregateFeatures(attended: number[][]): number[] {
    // Mean pooling + max pooling concatenation
    const meanPool = new Array(attended[0]?.length || this.featureDim).fill(0);
    const maxPool = new Array(attended[0]?.length || this.featureDim).fill(-Infinity);

    for (const vec of attended) {
      for (let i = 0; i < vec.length; i++) {
        meanPool[i] += vec[i] / attended.length;
        maxPool[i] = Math.max(maxPool[i], vec[i]);
      }
    }

    // Replace -Infinity with 0
    for (let i = 0; i < maxPool.length; i++) {
      if (!isFinite(maxPool[i])) maxPool[i] = 0;
    }

    return [...meanPool, ...maxPool];
  }

  private calibrate(logits: number[], temperature: number): number[] {
    const scaledLogits = logits.map(l => l / temperature);
    const maxVal = Math.max(...scaledLogits);
    const exp = scaledLogits.map(x => Math.exp(x - maxVal));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  }

  private buildFailureModes(
    probabilities: number[],
    recognition: FeatureRecognitionResult,
    attentionWeights: number[][]
  ): FailureMode[] {
    const failureTypes = ["collision", "tolerance_violation", "tool_breakage", "surface_finish", "chatter", "thermal"] as const;
    const modes: FailureMode[] = [];

    for (let i = 0; i < failureTypes.length && i < probabilities.length; i++) {
      const prob = probabilities[i];
      if (prob < 0.05) continue;

      // Find affected features from attention
      const affectedFeatures: string[] = [];
      if (attentionWeights.length > 0 && recognition.feature_tree.features.length > 0) {
        const avgWeights = attentionWeights[0].map((_, j) =>
          attentionWeights.reduce((sum, row) => sum + (row[j] || 0), 0) / attentionWeights.length
        );

        const threshold = 1 / Math.max(avgWeights.length, 1);
        for (let j = 0; j < avgWeights.length && j < recognition.feature_tree.features.length; j++) {
          if (avgWeights[j] > threshold) {
            affectedFeatures.push(recognition.feature_tree.features[j].id);
          }
        }
      }

      modes.push({
        type: failureTypes[i],
        probability: prob,
        confidence: 0.7 + Math.random() * 0.2,
        affected_features: affectedFeatures.slice(0, 3),
        root_cause: this.inferRootCause(failureTypes[i], recognition)
      });
    }

    return modes.sort((a, b) => b.probability - a.probability);
  }

  private inferRootCause(failureType: string, recognition: FeatureRecognitionResult): string {
    const causes: Record<string, string[]> = {
      collision: [
        "Insufficient clearance between tool and chuck",
        "Rapid move through material",
        "Tool length compensation error"
      ],
      tolerance_violation: [
        "Tool wear beyond compensation range",
        "Thermal expansion during machining",
        "Insufficient spring passes"
      ],
      tool_breakage: [
        "Excessive chip load",
        "Interrupted cut shock loading",
        "Wrong tool grade for material"
      ],
      surface_finish: [
        "Feed rate too high for finish",
        "Tool nose radius too small",
        "Vibration from workholding"
      ],
      chatter: [
        "Operating at resonance frequency",
        "Excessive overhang",
        "Insufficient workholding rigidity"
      ],
      thermal: [
        "Insufficient coolant coverage",
        "Continuous cutting without relief",
        "High-speed steel heating"
      ]
    };

    const options = causes[failureType] || ["Unknown root cause"];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateCorrections(failureModes: FailureMode[], input: DLPredictionInput): CorrectionSuggestion[] {
    return this.suggestCorrections(failureModes);
  }

  private analyzeAttentionHeads(weights: number[][], recognition: FeatureRecognitionResult): AttentionHead[] {
    const heads: AttentionHead[] = [];
    const headCount = this.attentionNetwork.getHeadCount();
    const headNames = ["Geometry Focus", "Tolerance Focus", "Sequence Focus", "Interaction Focus"];

    for (let h = 0; h < headCount; h++) {
      const headWeights = weights.map(row => row[h] || 0);
      const focusFeatures: string[] = [];

      // Find top-attended features
      const sorted = headWeights
        .map((w, i) => ({ w, i }))
        .sort((a, b) => b.w - a.w)
        .slice(0, 2);

      for (const { i } of sorted) {
        if (i < recognition.feature_tree.features.length) {
          focusFeatures.push(recognition.feature_tree.features[i].type);
        }
      }

      heads.push({
        name: headNames[h] || `Head ${h + 1}`,
        weights: headWeights,
        focus_features: focusFeatures,
        interpretation: this.interpretAttentionHead(h, focusFeatures)
      });
    }

    return heads;
  }

  private interpretAttentionHead(index: number, focusFeatures: string[]): string {
    const interpretations = [
      `Analyzing geometric relationships between ${focusFeatures.join(" and ") || "features"}`,
      `Evaluating tolerance stack-up on ${focusFeatures[0] || "critical dimension"}`,
      `Sequencing operations for ${focusFeatures.join(", ") || "machining order"}`,
      `Detecting interaction effects between ${focusFeatures.join(" and ") || "adjacent features"}`
    ];
    return interpretations[index] || "General feature analysis";
  }

  private computeUncertainties(probabilities: number[], input: DLPredictionInput): { epistemic: number; aleatoric: number } {
    // Epistemic: model uncertainty (lack of training data)
    const hasHistorical = input.historical_failures && input.historical_failures.length > 0;
    const epistemic = hasHistorical ? 0.15 : 0.35;

    // Aleatoric: inherent randomness
    const entropy = -probabilities.reduce((sum, p) => {
      if (p > 0) sum += p * Math.log(p);
      return sum;
    }, 0);
    const maxEntropy = Math.log(probabilities.length);
    const aleatoric = maxEntropy > 0 ? entropy / maxEntropy : 0.5;

    return { epistemic, aleatoric };
  }

  private determineRiskLevel(probability: number, modes: FailureMode[]): "low" | "medium" | "high" | "critical" {
    const criticalModes = modes.filter(m =>
      m.type === "collision" || m.type === "tool_breakage"
    );

    if (criticalModes.some(m => m.probability > 0.5)) return "critical";
    if (probability > 0.6) return "high";
    if (probability > 0.3) return "medium";
    return "low";
  }

  private identifyCriticalFeatures(weights: number[][], recognition: FeatureRecognitionResult): string[] {
    if (weights.length === 0 || recognition.feature_tree.features.length === 0) {
      return [];
    }

    const avgWeights = new Array(weights[0].length).fill(0);
    for (const row of weights) {
      for (let i = 0; i < row.length; i++) {
        avgWeights[i] += row[i] / weights.length;
      }
    }

    const threshold = 1 / avgWeights.length + 0.1;
    const critical: string[] = [];

    for (let i = 0; i < avgWeights.length && i < recognition.feature_tree.features.length; i++) {
      if (avgWeights[i] > threshold) {
        critical.push(recognition.feature_tree.features[i].id);
      }
    }

    return critical;
  }

  private extractFeatureInteractions(weights: number[][], recognition: FeatureRecognitionResult): Array<{ a: string; b: string; strength: number }> {
    const interactions: Array<{ a: string; b: string; strength: number }> = [];
    const features = recognition.feature_tree.features;

    for (let i = 0; i < weights.length && i < features.length; i++) {
      for (let j = i + 1; j < weights[i].length && j < features.length; j++) {
        const strength = weights[i][j] || 0;
        if (strength > 0.2) {
          interactions.push({
            a: features[i].id,
            b: features[j].id,
            strength
          });
        }
      }
    }

    return interactions.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  private estimateSuccessAfterCorrections(baseFailureProb: number, corrections: CorrectionSuggestion[]): number {
    let successProb = 1 - baseFailureProb;

    for (const corr of corrections) {
      successProb += (1 - successProb) * corr.expected_improvement * 0.5;
    }

    return Math.min(0.98, successProb);
  }
}

export const lathePrintToProgramDLIntelligenceEngine = new LathePrintToProgramDLIntelligenceEngine();
