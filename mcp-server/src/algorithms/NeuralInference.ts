/**
 * Neural Inference — Feedforward Neural Network
 *
 * Simple multi-layer perceptron for manufacturing process prediction.
 * Supports configurable hidden layers with ReLU/sigmoid/tanh activation.
 * Forward pass only — weights are pre-trained or provided externally.
 *
 * Manufacturing uses: process outcome prediction, surface roughness estimation,
 * tool wear classification, power consumption prediction.
 *
 * References:
 * - Rumelhart, D.E. et al. (1986). "Learning Representations by Back-Propagating Errors"
 * - Tansel, I.N. et al. (2000). "Micro-End-Milling: Neural Network Modeling"
 *
 * @module algorithms/NeuralInference
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export type ActivationFn = "relu" | "sigmoid" | "tanh" | "linear";

export interface NeuralInferenceInput {
  /** Input feature vector. */
  features: number[];
  /** Layer sizes (including input and output). E.g., [4, 8, 4, 1]. */
  layer_sizes: number[];
  /** Weights: flat array of all layer weights concatenated. */
  weights: number[];
  /** Biases: flat array of all layer biases concatenated. */
  biases: number[];
  /** Activation function per hidden layer. Default "relu". */
  activation?: ActivationFn;
  /** Output activation. Default "linear". */
  output_activation?: ActivationFn;
}

export interface NeuralInferenceOutput extends WithWarnings {
  predictions: number[];
  layer_outputs: number[][];
  confidence: number;
  calculation_method: string;
}

export class NeuralInference implements Algorithm<NeuralInferenceInput, NeuralInferenceOutput> {

  validate(input: NeuralInferenceInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.features?.length) issues.push({ field: "features", message: "Required", severity: "error" });
    if (!input.layer_sizes?.length || input.layer_sizes.length < 2) {
      issues.push({ field: "layer_sizes", message: "At least 2 layers (input + output) required", severity: "error" });
    }
    if (input.features?.length && input.layer_sizes?.[0] !== input.features.length) {
      issues.push({ field: "layer_sizes[0]", message: "First layer must match feature count", severity: "error" });
    }
    // Validate weight count
    if (input.layer_sizes?.length >= 2) {
      let expectedWeights = 0, expectedBiases = 0;
      for (let i = 1; i < input.layer_sizes.length; i++) {
        expectedWeights += input.layer_sizes[i - 1] * input.layer_sizes[i];
        expectedBiases += input.layer_sizes[i];
      }
      if (input.weights?.length !== expectedWeights) {
        issues.push({ field: "weights", message: `Expected ${expectedWeights} weights, got ${input.weights?.length ?? 0}`, severity: "error" });
      }
      if (input.biases?.length !== expectedBiases) {
        issues.push({ field: "biases", message: `Expected ${expectedBiases} biases, got ${input.biases?.length ?? 0}`, severity: "error" });
      }
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: NeuralInferenceInput): NeuralInferenceOutput {
    const warnings: string[] = [];
    const { features, layer_sizes, weights, biases } = input;
    const activation = input.activation ?? "relu";
    const outputAct = input.output_activation ?? "linear";

    const activate = (x: number, fn: ActivationFn): number => {
      switch (fn) {
        case "relu": return Math.max(0, x);
        case "sigmoid": return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
        case "tanh": return Math.tanh(x);
        case "linear": return x;
      }
    };

    let currentInput = [...features];
    const layerOutputs: number[][] = [currentInput];
    let wOffset = 0, bOffset = 0;

    for (let l = 1; l < layer_sizes.length; l++) {
      const nIn = layer_sizes[l - 1];
      const nOut = layer_sizes[l];
      const isOutput = l === layer_sizes.length - 1;
      const actFn = isOutput ? outputAct : activation;
      const output: number[] = [];

      for (let j = 0; j < nOut; j++) {
        let sum = biases[bOffset + j];
        for (let i = 0; i < nIn; i++) {
          sum += currentInput[i] * weights[wOffset + j * nIn + i];
        }
        output.push(activate(sum, actFn));
      }

      wOffset += nIn * nOut;
      bOffset += nOut;
      currentInput = output;
      layerOutputs.push(output);
    }

    // Confidence: based on output magnitude for sigmoid, or softmax-like for multi-output
    let confidence = 1.0;
    if (outputAct === "sigmoid") {
      confidence = currentInput.reduce((s, v) => s + Math.abs(v - 0.5) * 2, 0) / currentInput.length;
    } else if (currentInput.length > 1) {
      const max = Math.max(...currentInput);
      const sum = currentInput.reduce((s, v) => s + Math.exp(v - max), 0);
      confidence = Math.exp(max - max) / sum; // softmax of top
    }

    return {
      predictions: currentInput,
      layer_outputs: layerOutputs,
      confidence: Math.min(1, Math.max(0, confidence)),
      warnings,
      calculation_method: `Feedforward NN [${layer_sizes.join("→")}] (${activation}/${outputAct})`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "neural-inference",
      name: "Neural Network Inference",
      description: "Feedforward MLP for manufacturing process prediction",
      formula: "y = σ(W_n × ... × σ(W_1 × x + b_1) ... + b_n)",
      reference: "Rumelhart et al. (1986); Tansel et al. (2000)",
      safety_class: "informational",
      domain: "ml",
      inputs: { features: "Input vector", layer_sizes: "Network topology", weights: "Pre-trained weights" },
      outputs: { predictions: "Output vector", confidence: "Prediction confidence [0-1]" },
    };
  }
}
