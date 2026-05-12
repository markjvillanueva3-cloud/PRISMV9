/**
 * MillNeuralNetworkEngine — Advanced Neural Network for Milling AI
 * ==================================================================
 * Multi-layer neural network with:
 *   - Pattern recognition layers
 *   - Sequence prediction (RNN-style)
 *   - Parameter optimization (gradient descent)
 *   - Confidence scoring with Bayesian updates
 *   - Transfer learning from proven programs
 *   - Anomaly detection for bad patterns
 *
 * Architecture:
 *   Input Layer: Program features (material, tools, operations)
 *   Hidden Layer 1: Pattern embedding (32 neurons)
 *   Hidden Layer 2: Sequence context (16 neurons)
 *   Hidden Layer 3: Decision synthesis (8 neurons)
 *   Output Layer: Optimized parameters + confidence
 *
 * @module engines/MillNeuralNetworkEngine
 * @version 1.0.0
 * @milestone MILL-NEURAL-MS0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES — NEURAL NETWORK ARCHITECTURE
// ============================================================================

/** Neuron activation function */
export type ActivationFn = "relu" | "sigmoid" | "tanh" | "softmax";

/** Single neuron in the network */
export interface Neuron {
  id: string;
  layer: number;
  weights: number[];
  bias: number;
  activation: ActivationFn;
  output: number;
  gradient: number;
}

/** Neural network layer */
export interface NeuralLayer {
  id: string;
  neurons: Neuron[];
  type: "input" | "hidden" | "output";
}

/** Training sample */
export interface TrainingSample {
  features: number[];
  labels: number[];
  weight: number; // Higher for proven programs
}

/** Prediction result */
export interface NeuralPrediction {
  output: number[];
  confidence: number;
  explanation: string[];
  feature_importance: Record<string, number>;
}

// ============================================================================
// FEATURE ENCODING
// ============================================================================

/** Feature indices for input encoding */
const FEATURE_INDEX = {
  // Material (one-hot encoded, 6 values)
  MATERIAL_P: 0,
  MATERIAL_M: 1,
  MATERIAL_K: 2,
  MATERIAL_N: 3,
  MATERIAL_S: 4,
  MATERIAL_H: 5,

  // Tool type (one-hot encoded, 10 values)
  TOOL_SPOT: 6,
  TOOL_DRILL: 7,
  TOOL_FLAT_EM: 8,
  TOOL_BALL_EM: 9,
  TOOL_INSERT_EM: 10,
  TOOL_FACE: 11,
  TOOL_CHAMFER: 12,
  TOOL_TAP: 13,
  TOOL_REAM: 14,
  TOOL_BORE: 15,

  // Operation type (one-hot encoded, 12 values)
  OP_FACE: 16,
  OP_ROUGH_PROFILE: 17,
  OP_FINISH_PROFILE: 18,
  OP_ROUGH_POCKET: 19,
  OP_FINISH_POCKET: 20,
  OP_DRILL: 21,
  OP_PECK_DRILL: 22,
  OP_TAP: 23,
  OP_CHAMFER: 24,
  OP_CONTOUR: 25,
  OP_3D_ROUGH: 26,
  OP_3D_FINISH: 27,

  // Continuous features
  TOOL_DIAMETER_MM: 28,
  RPM_NORMALIZED: 29,
  FEED_NORMALIZED: 30,
  DOC_NORMALIZED: 31,
  SFM_NORMALIZED: 32,
  CHIP_LOAD_NORMALIZED: 33,
  Z_LEVEL_COUNT: 34,
  CUTTER_COMP: 35,
  IS_PROVEN: 36,
};

const INPUT_SIZE = 37;
const HIDDEN_1_SIZE = 32;
const HIDDEN_2_SIZE = 16;
const HIDDEN_3_SIZE = 8;
const OUTPUT_SIZE = 5; // RPM, Feed, DOC, Confidence, Anomaly score

// ============================================================================
// MILL NEURAL NETWORK ENGINE
// ============================================================================

export class MillNeuralNetworkEngine {
  private layers: NeuralLayer[] = [];
  private trainingSamples: TrainingSample[] = [];
  private learningRate = 0.01;
  private epochs = 100;
  private batchSize = 8;
  private trained = false;

  // Bayesian confidence tracking
  private priorConfidence = 0.5;
  private confidenceHistory: number[] = [];

  // Pattern memory for RNN-style sequence learning
  private sequenceMemory: number[][] = [];
  private memorySize = 10;

  constructor() {
    this.initializeNetwork();
  }

  // --------------------------------------------------------------------------
  // NETWORK INITIALIZATION
  // --------------------------------------------------------------------------

  private initializeNetwork(): void {
    // Input layer
    this.layers.push({
      id: "input",
      type: "input",
      neurons: Array.from({ length: INPUT_SIZE }, (_, i) => ({
        id: `input-${i}`,
        layer: 0,
        weights: [],
        bias: 0,
        activation: "relu" as ActivationFn,
        output: 0,
        gradient: 0,
      })),
    });

    // Hidden layer 1 - Pattern embedding
    this.layers.push({
      id: "hidden1",
      type: "hidden",
      neurons: Array.from({ length: HIDDEN_1_SIZE }, (_, i) => ({
        id: `hidden1-${i}`,
        layer: 1,
        weights: Array.from({ length: INPUT_SIZE }, () => this.randomWeight()),
        bias: this.randomWeight() * 0.1,
        activation: "relu" as ActivationFn,
        output: 0,
        gradient: 0,
      })),
    });

    // Hidden layer 2 - Sequence context
    this.layers.push({
      id: "hidden2",
      type: "hidden",
      neurons: Array.from({ length: HIDDEN_2_SIZE }, (_, i) => ({
        id: `hidden2-${i}`,
        layer: 2,
        weights: Array.from({ length: HIDDEN_1_SIZE }, () => this.randomWeight()),
        bias: this.randomWeight() * 0.1,
        activation: "relu" as ActivationFn,
        output: 0,
        gradient: 0,
      })),
    });

    // Hidden layer 3 - Decision synthesis
    this.layers.push({
      id: "hidden3",
      type: "hidden",
      neurons: Array.from({ length: HIDDEN_3_SIZE }, (_, i) => ({
        id: `hidden3-${i}`,
        layer: 3,
        weights: Array.from({ length: HIDDEN_2_SIZE }, () => this.randomWeight()),
        bias: this.randomWeight() * 0.1,
        activation: "tanh" as ActivationFn,
        output: 0,
        gradient: 0,
      })),
    });

    // Output layer
    this.layers.push({
      id: "output",
      type: "output",
      neurons: Array.from({ length: OUTPUT_SIZE }, (_, i) => ({
        id: `output-${i}`,
        layer: 4,
        weights: Array.from({ length: HIDDEN_3_SIZE }, () => this.randomWeight()),
        bias: this.randomWeight() * 0.1,
        activation: "sigmoid" as ActivationFn,
        output: 0,
        gradient: 0,
      })),
    });

    log.info(`[MillNeuralNetwork] Initialized network: ${INPUT_SIZE}-${HIDDEN_1_SIZE}-${HIDDEN_2_SIZE}-${HIDDEN_3_SIZE}-${OUTPUT_SIZE}`);
  }

  private randomWeight(): number {
    // Xavier initialization
    return (Math.random() * 2 - 1) * Math.sqrt(2 / INPUT_SIZE);
  }

  // --------------------------------------------------------------------------
  // ACTIVATION FUNCTIONS
  // --------------------------------------------------------------------------

  private activate(value: number, fn: ActivationFn): number {
    switch (fn) {
      case "relu":
        return Math.max(0, value);
      case "sigmoid":
        return 1 / (1 + Math.exp(-Math.min(Math.max(value, -500), 500)));
      case "tanh":
        return Math.tanh(value);
      case "softmax":
        return value; // Handled at layer level
      default:
        return value;
    }
  }

  private activateDerivative(output: number, fn: ActivationFn): number {
    switch (fn) {
      case "relu":
        return output > 0 ? 1 : 0;
      case "sigmoid":
        return output * (1 - output);
      case "tanh":
        return 1 - output * output;
      default:
        return 1;
    }
  }

  // --------------------------------------------------------------------------
  // FEATURE ENCODING
  // --------------------------------------------------------------------------

  /**
   * Encode operation features into neural network input vector.
   */
  encodeFeatures(
    materialIso: string,
    toolType: string,
    operationType: string,
    toolDiameterMm: number,
    rpm: number,
    feed: number,
    doc: number,
    zLevelCount: number,
    cutterComp: boolean,
    isProven: boolean
  ): number[] {
    const features = new Array(INPUT_SIZE).fill(0);

    // Material one-hot encoding
    const matMap: Record<string, number> = { P: 0, M: 1, K: 2, N: 3, S: 4, H: 5 };
    if (materialIso in matMap) {
      features[matMap[materialIso]] = 1;
    }

    // Tool type one-hot encoding
    const toolMap: Record<string, number> = {
      spot_drill: 6, twist_drill: 7, flat_endmill: 8, ball_endmill: 9,
      insert_endmill: 10, face_mill: 11, chamfer_mill: 12, tap: 13, reamer: 14, boring_bar: 15,
    };
    if (toolType in toolMap) {
      features[toolMap[toolType]] = 1;
    }

    // Operation type one-hot encoding
    const opMap: Record<string, number> = {
      face: 16, rough_profile: 17, finish_profile: 18, rough_pocket: 19, finish_pocket: 20,
      drill: 21, peck_drill: 22, tap: 23, chamfer: 24, contour: 25, "3d_rough": 26, "3d_finish": 27,
    };
    if (operationType in opMap) {
      features[opMap[operationType]] = 1;
    }

    // Continuous features (normalized 0-1)
    features[28] = Math.min(toolDiameterMm / 50, 1); // Tool diameter
    features[29] = Math.min(rpm / 15000, 1);         // RPM
    features[30] = Math.min(feed / 100, 1);          // Feed IPM
    features[31] = Math.min(doc / 10, 1);            // DOC
    features[32] = Math.min((rpm * Math.PI * (toolDiameterMm / 25.4)) / 12 / 1000, 1); // SFM
    features[33] = Math.min((feed / (rpm * 4) || 0) * 100, 1); // Chip load
    features[34] = Math.min(zLevelCount / 50, 1);    // Z levels
    features[35] = cutterComp ? 1 : 0;
    features[36] = isProven ? 1 : 0;

    return features;
  }

  // --------------------------------------------------------------------------
  // FORWARD PROPAGATION
  // --------------------------------------------------------------------------

  /**
   * Run forward pass through the network.
   */
  private forward(input: number[]): number[] {
    // Set input layer
    for (let i = 0; i < input.length; i++) {
      this.layers[0].neurons[i].output = input[i];
    }

    // Propagate through hidden and output layers
    for (let l = 1; l < this.layers.length; l++) {
      const prevLayer = this.layers[l - 1];
      const currLayer = this.layers[l];

      for (const neuron of currLayer.neurons) {
        let sum = neuron.bias;
        for (let w = 0; w < neuron.weights.length; w++) {
          sum += neuron.weights[w] * prevLayer.neurons[w].output;
        }
        neuron.output = this.activate(sum, neuron.activation);
      }
    }

    // Apply sequence memory (RNN-style context)
    if (this.sequenceMemory.length > 0) {
      const memoryContext = this.computeMemoryContext();
      const outputLayer = this.layers[this.layers.length - 1];
      for (let i = 0; i < outputLayer.neurons.length; i++) {
        outputLayer.neurons[i].output = (outputLayer.neurons[i].output + memoryContext[i % memoryContext.length]) / 2;
      }
    }

    return this.layers[this.layers.length - 1].neurons.map(n => n.output);
  }

  private computeMemoryContext(): number[] {
    if (this.sequenceMemory.length === 0) return [0, 0, 0, 0, 0];

    // Average recent sequence outputs
    const context = new Array(OUTPUT_SIZE).fill(0);
    for (const mem of this.sequenceMemory) {
      for (let i = 0; i < Math.min(mem.length, OUTPUT_SIZE); i++) {
        context[i] += mem[i] / this.sequenceMemory.length;
      }
    }
    return context;
  }

  // --------------------------------------------------------------------------
  // BACKPROPAGATION
  // --------------------------------------------------------------------------

  /**
   * Run backpropagation to update weights.
   */
  private backpropagate(target: number[]): void {
    // Calculate output layer gradients
    const outputLayer = this.layers[this.layers.length - 1];
    for (let i = 0; i < outputLayer.neurons.length; i++) {
      const neuron = outputLayer.neurons[i];
      const error = target[i] - neuron.output;
      neuron.gradient = error * this.activateDerivative(neuron.output, neuron.activation);
    }

    // Backpropagate through hidden layers
    for (let l = this.layers.length - 2; l > 0; l--) {
      const currLayer = this.layers[l];
      const nextLayer = this.layers[l + 1];

      for (let i = 0; i < currLayer.neurons.length; i++) {
        let sum = 0;
        for (const nextNeuron of nextLayer.neurons) {
          sum += nextNeuron.weights[i] * nextNeuron.gradient;
        }
        currLayer.neurons[i].gradient = sum * this.activateDerivative(currLayer.neurons[i].output, currLayer.neurons[i].activation);
      }
    }

    // Update weights
    for (let l = 1; l < this.layers.length; l++) {
      const prevLayer = this.layers[l - 1];
      const currLayer = this.layers[l];

      for (const neuron of currLayer.neurons) {
        for (let w = 0; w < neuron.weights.length; w++) {
          neuron.weights[w] += this.learningRate * neuron.gradient * prevLayer.neurons[w].output;
        }
        neuron.bias += this.learningRate * neuron.gradient;
      }
    }
  }

  // --------------------------------------------------------------------------
  // TRAINING
  // --------------------------------------------------------------------------

  /**
   * Add training sample.
   */
  addTrainingSample(
    materialIso: string,
    toolType: string,
    operationType: string,
    toolDiameterMm: number,
    rpm: number,
    feed: number,
    doc: number,
    zLevelCount: number,
    cutterComp: boolean,
    isProven: boolean,
    targetRPM: number,
    targetFeed: number,
    targetDOC: number
  ): void {
    const features = this.encodeFeatures(
      materialIso, toolType, operationType, toolDiameterMm,
      rpm, feed, doc, zLevelCount, cutterComp, isProven
    );

    const labels = [
      targetRPM / 15000,  // Normalized RPM
      targetFeed / 100,   // Normalized Feed
      targetDOC / 10,     // Normalized DOC
      isProven ? 0.9 : 0.7, // Target confidence
      0,                  // Target anomaly (0 = normal)
    ];

    this.trainingSamples.push({
      features,
      labels,
      weight: isProven ? 2.0 : 1.0, // Higher weight for proven programs
    });
  }

  /**
   * Train the network on all samples.
   */
  train(): { loss: number; epochs: number } {
    if (this.trainingSamples.length === 0) {
      return { loss: 0, epochs: 0 };
    }

    let totalLoss = 0;

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      let epochLoss = 0;

      // Shuffle samples
      const shuffled = [...this.trainingSamples].sort(() => Math.random() - 0.5);

      // Mini-batch training
      for (let b = 0; b < shuffled.length; b += this.batchSize) {
        const batch = shuffled.slice(b, b + this.batchSize);

        for (const sample of batch) {
          const output = this.forward(sample.features);

          // Calculate loss (MSE)
          let sampleLoss = 0;
          for (let i = 0; i < output.length; i++) {
            sampleLoss += Math.pow(sample.labels[i] - output[i], 2);
          }
          epochLoss += (sampleLoss / output.length) * sample.weight;

          // Backpropagate
          this.backpropagate(sample.labels);
        }
      }

      totalLoss = epochLoss / shuffled.length;

      // Early stopping if loss is low
      if (totalLoss < 0.001) {
        log.info(`[MillNeuralNetwork] Early stopping at epoch ${epoch + 1}, loss: ${totalLoss.toFixed(6)}`);
        this.trained = true;
        return { loss: totalLoss, epochs: epoch + 1 };
      }
    }

    this.trained = true;
    log.info(`[MillNeuralNetwork] Training complete, final loss: ${totalLoss.toFixed(6)}`);
    return { loss: totalLoss, epochs: this.epochs };
  }

  // --------------------------------------------------------------------------
  // PREDICTION
  // --------------------------------------------------------------------------

  /**
   * Predict optimized parameters for an operation.
   */
  predict(
    materialIso: string,
    toolType: string,
    operationType: string,
    toolDiameterMm: number,
    rpm: number,
    feed: number,
    doc: number,
    zLevelCount: number,
    cutterComp: boolean
  ): NeuralPrediction {
    const features = this.encodeFeatures(
      materialIso, toolType, operationType, toolDiameterMm,
      rpm, feed, doc, zLevelCount, cutterComp, false
    );

    const output = this.forward(features);

    // Update sequence memory
    this.sequenceMemory.push(output);
    if (this.sequenceMemory.length > this.memorySize) {
      this.sequenceMemory.shift();
    }

    // Decode outputs
    const predictedRPM = output[0] * 15000;
    const predictedFeed = output[1] * 100;
    const predictedDOC = output[2] * 10;
    const confidence = output[3];
    const anomalyScore = output[4];

    // Update Bayesian confidence
    this.confidenceHistory.push(confidence);
    const bayesianConfidence = this.computeBayesianConfidence(confidence);

    // Compute feature importance
    const importance = this.computeFeatureImportance(features);

    // Generate explanation
    const explanation = this.generateExplanation(
      predictedRPM, predictedFeed, predictedDOC,
      rpm, feed, doc, materialIso, toolType, importance
    );

    return {
      output: [predictedRPM, predictedFeed, predictedDOC],
      confidence: bayesianConfidence,
      explanation,
      feature_importance: importance,
    };
  }

  private computeBayesianConfidence(newConfidence: number): number {
    // Bayesian update: P(confidence | data) ∝ P(data | confidence) * P(confidence)
    const likelihood = newConfidence;
    const prior = this.confidenceHistory.length > 0
      ? this.confidenceHistory.reduce((a, b) => a + b) / this.confidenceHistory.length
      : this.priorConfidence;

    // Posterior (simplified conjugate update)
    const alpha = this.confidenceHistory.length;
    const posterior = (alpha * prior + likelihood) / (alpha + 1);

    return Math.min(Math.max(posterior, 0.1), 0.99);
  }

  private computeFeatureImportance(features: number[]): Record<string, number> {
    const importance: Record<string, number> = {};
    const names = [
      "material_P", "material_M", "material_K", "material_N", "material_S", "material_H",
      "tool_spot", "tool_drill", "tool_flat_em", "tool_ball_em", "tool_insert_em",
      "tool_face", "tool_chamfer", "tool_tap", "tool_ream", "tool_bore",
      "op_face", "op_rough_profile", "op_finish_profile", "op_rough_pocket", "op_finish_pocket",
      "op_drill", "op_peck_drill", "op_tap", "op_chamfer", "op_contour", "op_3d_rough", "op_3d_finish",
      "tool_diameter", "rpm", "feed", "doc", "sfm", "chip_load", "z_levels", "cutter_comp", "is_proven",
    ];

    // Calculate importance based on input weight magnitudes
    for (let i = 0; i < features.length && i < names.length; i++) {
      if (features[i] > 0) {
        let totalWeight = 0;
        for (const neuron of this.layers[1].neurons) {
          totalWeight += Math.abs(neuron.weights[i]);
        }
        importance[names[i]] = totalWeight / this.layers[1].neurons.length;
      }
    }

    return importance;
  }

  private generateExplanation(
    predRPM: number, predFeed: number, predDOC: number,
    origRPM: number, origFeed: number, origDOC: number,
    material: string, tool: string,
    importance: Record<string, number>
  ): string[] {
    const explanations: string[] = [];

    // RPM change
    if (Math.abs(predRPM - origRPM) > origRPM * 0.1) {
      if (predRPM > origRPM) {
        explanations.push(`Increase RPM from ${Math.round(origRPM)} to ${Math.round(predRPM)} — neural patterns suggest higher speed for ${material} material`);
      } else {
        explanations.push(`Decrease RPM from ${Math.round(origRPM)} to ${Math.round(predRPM)} — learned optimal range for ${tool}`);
      }
    }

    // Feed change
    if (Math.abs(predFeed - origFeed) > origFeed * 0.1) {
      if (predFeed > origFeed) {
        explanations.push(`Increase feed from ${origFeed.toFixed(1)} to ${predFeed.toFixed(1)} IPM — cycle time reduction`);
      } else {
        explanations.push(`Decrease feed from ${origFeed.toFixed(1)} to ${predFeed.toFixed(1)} IPM — surface finish optimization`);
      }
    }

    // Top influential features
    const sortedImportance = Object.entries(importance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (sortedImportance.length > 0) {
      explanations.push(`Key factors: ${sortedImportance.map(([k, v]) => `${k} (${(v * 100).toFixed(1)}%)`).join(", ")}`);
    }

    return explanations;
  }

  // --------------------------------------------------------------------------
  // ANOMALY DETECTION
  // --------------------------------------------------------------------------

  /**
   * Detect if an operation has anomalous parameters.
   */
  detectAnomaly(
    materialIso: string,
    toolType: string,
    operationType: string,
    toolDiameterMm: number,
    rpm: number,
    feed: number,
    doc: number
  ): { isAnomaly: boolean; score: number; reason: string } {
    const features = this.encodeFeatures(
      materialIso, toolType, operationType, toolDiameterMm,
      rpm, feed, doc, 0, false, false
    );

    const output = this.forward(features);
    const anomalyScore = output[4];

    if (anomalyScore > 0.7) {
      return {
        isAnomaly: true,
        score: anomalyScore,
        reason: "Parameters significantly deviate from learned patterns",
      };
    }

    // Check against expected ranges
    const expectedRPM = output[0] * 15000;
    const expectedFeed = output[1] * 100;

    if (rpm > 0 && Math.abs(rpm - expectedRPM) / expectedRPM > 0.5) {
      return {
        isAnomaly: true,
        score: Math.abs(rpm - expectedRPM) / expectedRPM,
        reason: `RPM ${rpm} deviates >50% from expected ${Math.round(expectedRPM)}`,
      };
    }

    if (feed > 0 && Math.abs(feed - expectedFeed) / expectedFeed > 0.5) {
      return {
        isAnomaly: true,
        score: Math.abs(feed - expectedFeed) / expectedFeed,
        reason: `Feed ${feed} deviates >50% from expected ${expectedFeed.toFixed(1)}`,
      };
    }

    return { isAnomaly: false, score: anomalyScore, reason: "Parameters within normal range" };
  }

  // --------------------------------------------------------------------------
  // STATISTICS
  // --------------------------------------------------------------------------

  getNetworkStats(): {
    layers: number;
    total_neurons: number;
    total_weights: number;
    training_samples: number;
    trained: boolean;
    avg_confidence: number;
  } {
    let totalNeurons = 0;
    let totalWeights = 0;

    for (const layer of this.layers) {
      totalNeurons += layer.neurons.length;
      for (const neuron of layer.neurons) {
        totalWeights += neuron.weights.length;
      }
    }

    const avgConf = this.confidenceHistory.length > 0
      ? this.confidenceHistory.reduce((a, b) => a + b) / this.confidenceHistory.length
      : 0.5;

    return {
      layers: this.layers.length,
      total_neurons: totalNeurons,
      total_weights: totalWeights,
      training_samples: this.trainingSamples.length,
      trained: this.trained,
      avg_confidence: avgConf,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millNeuralNetworkEngine = new MillNeuralNetworkEngine();
