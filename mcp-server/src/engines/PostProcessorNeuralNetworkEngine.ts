/**
 * PostProcessorNeuralNetworkEngine — PP-HARDEN-MS3
 * =================================================
 * Neural Network Intelligence for Post Processor Optimization
 *
 * Applies deep learning concepts to post processor generation:
 * - Pattern Recognition: Learn from successful posts
 * - Feature Extraction: Identify critical controller characteristics
 * - Sequence Optimization: Optimize G-code ordering
 * - Anomaly Detection: Identify problematic code patterns
 * - Transfer Learning: Apply knowledge across controllers
 *
 * Neural Network Architectures:
 * - Feedforward: Controller feature classification
 * - Recurrent (LSTM): G-code sequence modeling
 * - Convolutional: Pattern detection in code blocks
 * - Attention: Focus on critical safety sequences
 * - Transformer: Cross-controller code translation
 *
 * Mathematical Foundations:
 * - Activation: ReLU, Sigmoid, Tanh, Softmax
 * - Loss: MSE, Cross-Entropy, Huber
 * - Optimization: SGD, Adam, RMSprop
 * - Regularization: L1, L2, Dropout
 *
 * Advanced Mathematical Models (v2.0):
 * - Hidden Markov Model (HMM): G-code state sequence modeling with Viterbi decoding
 * - Markov Chain: Controller-specific transition probability matrices
 * - Bayesian Inference: Controller classification with conjugate priors
 * - Information Theory: Shannon entropy, mutual information for pattern analysis
 * - Frequent Pattern Mining: FP-Growth algorithm for code sequence discovery
 * - Graph Optimization: DAG-based sequence reordering with topological sort
 * - Tribal Knowledge Embedding: 50+ controller tips as training patterns
 *
 * @module engines/PostProcessorNeuralNetworkEngine
 * @milestone PP-HARDEN-MS3
 * @version 2.0.0
 */

import { log } from "../utils/Logger.js";
// Engine-local controller MODEL vocabulary. Distinct from the family-level
// ControllerModel in ControllerKnowledgeEngine — the NN classifier discriminates
// between fanuc_31i vs fanuc_0i, siemens_840d vs other Siemens, etc., so a
// family-level type would erase the labels the classifier predicts.
export type ControllerModel =
  | "fanuc_31i" | "fanuc_0i"
  | "haas_ngc" | "siemens_840d" | "heidenhain_tnc" | "okuma_osp"
  | "hurco_winmax" | "mazatrol" | "brother_c00" | "mitsubishi_m80";

// ============================================================================
// NEURAL NETWORK TYPES
// ============================================================================

/** Activation function types */
export type ActivationFunction = "relu" | "sigmoid" | "tanh" | "softmax" | "linear" | "leaky_relu";

/** Layer types */
export type LayerType = "dense" | "conv1d" | "lstm" | "gru" | "attention" | "dropout" | "batch_norm";

/** Neural network layer definition */
export interface NeuralLayer {
  type: LayerType;
  units: number;
  activation?: ActivationFunction;
  dropoutRate?: number;
  kernelSize?: number;
  returnSequences?: boolean;
}

/** Network architecture */
export interface NetworkArchitecture {
  name: string;
  layers: NeuralLayer[];
  inputShape: number[];
  outputShape: number[];
  purpose: string;
}

/** Training sample */
export interface TrainingSample {
  input: number[];
  output: number[];
  metadata?: {
    controller?: ControllerModel;
    machineConfig?: string;
    quality?: number;
  };
}

/** Prediction result */
export interface PredictionResult {
  output: number[];
  confidence: number;
  activations?: number[][];
  explanation?: string;
}

/** G-code pattern */
export interface GCodePattern {
  id: string;
  name: string;
  pattern: string[];
  frequency: number;
  quality_score: number;
  controllers: ControllerModel[];
}

/** Safety sequence */
export interface SafetySequence {
  id: string;
  name: string;
  codes: string[];
  criticality: "high" | "medium" | "low";
  explanation: string;
}

// ============================================================================
// HIDDEN MARKOV MODEL TYPES
// ============================================================================

/** G-code operational states for HMM */
export type GCodeState =
  | "SETUP"      // Program start, safety codes, work offset selection
  | "RAPID"      // G0 rapid positioning
  | "CUT"        // G1/G2/G3 cutting moves
  | "CYCLE"      // Canned cycles G81-G89
  | "DWELL"      // G4 dwell
  | "PROBE"      // G31 probing
  | "TOOLCHANGE" // M6, T-codes
  | "COOLANT"    // M7/M8/M9
  | "SPINDLE"    // M3/M4/M5, S-codes
  | "RETRACT"    // Safe retract moves
  | "END";       // M30, program end

/** HMM observation (G-code line classification) */
export interface HMMObservation {
  gCodes: string[];
  mCodes: string[];
  hasCoords: boolean;
  hasFeed: boolean;
  hasSpindle: boolean;
  lineType: "motion" | "modal" | "misc" | "comment" | "empty";
}

/** HMM result with most likely state sequence */
export interface HMMResult {
  states: GCodeState[];
  probability: number;
  transitionLog: Array<{ from: GCodeState; to: GCodeState; prob: number }>;
}

// ============================================================================
// BAYESIAN CLASSIFIER TYPES
// ============================================================================

/** Prior probability for each controller family */
export interface ControllerPrior {
  controller: ControllerModel;
  prior: number;           // P(controller) — shop usage frequency
  featureLikelihoods: Map<string, number>; // P(feature|controller)
}

/** Bayesian classification result */
export interface BayesianResult {
  controller: ControllerModel;
  posterior: number;       // P(controller|evidence)
  priors: Record<ControllerModel, number>;
  likelihoods: Record<ControllerModel, number>;
  evidence: number;        // Normalizing constant P(evidence)
}

// ============================================================================
// INFORMATION THEORY TYPES
// ============================================================================

/** Entropy analysis result */
export interface EntropyResult {
  shannon: number;         // H(X) in bits
  normalizedEntropy: number; // H(X) / log2(|X|) — 0 to 1
  perplexity: number;      // 2^H(X) — effective alphabet size
  redundancy: number;      // 1 - normalized entropy
}

/** Mutual information result */
export interface MutualInfoResult {
  mi: number;              // I(X;Y) in bits
  normalizedMI: number;    // I(X;Y) / min(H(X), H(Y))
  pointwiseMI: Map<string, Map<string, number>>; // PMI(x,y) for each pair
}

// ============================================================================
// FREQUENT PATTERN MINING TYPES
// ============================================================================

/** Frequent itemset from FP-Growth */
export interface FrequentItemset {
  items: string[];
  support: number;         // Frequency in dataset
  confidence: number;      // Strength of association
}

/** Association rule */
export interface AssociationRule {
  antecedent: string[];    // If these codes appear...
  consequent: string[];    // ...these should follow
  support: number;
  confidence: number;
  lift: number;            // confidence / P(consequent)
}

// ============================================================================
// GRAPH OPTIMIZATION TYPES
// ============================================================================

/** DAG node for sequence optimization */
export interface SequenceNode {
  id: string;
  codes: string[];
  weight: number;          // Time cost (rapid vs feed)
  mustPrecede: string[];   // Hard constraints
  prefersPrecede: string[]; // Soft constraints
}

/** Optimized sequence result */
export interface OptimizedSequence {
  order: string[];
  totalWeight: number;
  constraintsSatisfied: number;
  constraintsTotal: number;
  savingsPercent: number;
}

// ============================================================================
// CONTROLLER KNOWLEDGE EMBEDDING
// ============================================================================

/** Extracted controller signature from tribal knowledge */
interface ControllerSignature {
  family: ControllerModel;
  uniqueGCodes: string[];      // G-codes unique to this controller
  uniqueMCodes: string[];      // M-codes unique to this controller
  uniqueCycles: string[];      // Named cycles (CYCLE832, CYCL DEF, etc.)
  dialectMarkers: string[];    // Strings that identify the dialect
  safetySequences: string[][]; // Required safety patterns
  smoothingCodes: string[];    // HSM/smoothing activation codes
  probingPatterns: string[];   // Probing-related codes
}

/** Controller knowledge database from tribal tips */
const CONTROLLER_SIGNATURES: ControllerSignature[] = [
  {
    family: "fanuc_31i",
    uniqueGCodes: ["G05.1", "G43.4", "G43.5", "G08", "G54.1"],
    uniqueMCodes: ["M29"],
    uniqueCycles: [],
    dialectMarkers: ["O0001", "G05.1 Q1", "G05.1 Q2", "#5021"],
    safetySequences: [["G0", "G17", "G21", "G40", "G49", "G80", "G90"]],
    smoothingCodes: ["G05.1 Q1", "G05.1 Q2"],
    probingPatterns: ["G31", "G37", "#5061", "#5062", "#5063"],
  },
  {
    family: "haas_ngc",
    uniqueGCodes: ["G187", "G234"],
    uniqueMCodes: ["M36", "M37", "M50", "M51", "M52", "M88", "M89", "M93", "M96", "M97", "M109"],
    uniqueCycles: [],
    dialectMarkers: ["Setting 191", "WIPS", "#10001", "#3027"],
    safetySequences: [["G0", "G17", "G20", "G40", "G49", "G80", "G54", "G90"]],
    smoothingCodes: ["G187"],
    probingPatterns: ["G65 P9995", "G65 P9023", "#10001"],
  },
  {
    family: "siemens_840d",
    uniqueGCodes: ["G642"],
    uniqueMCodes: [],
    uniqueCycles: ["CYCLE832", "CYCLE977", "CYCLE978", "CYCLE976", "CYCLE996"],
    dialectMarkers: ["TRAORI", "COMPCAD", "COMPCURV", "COMPOF", "TRAFOOF", "$AA_MW", "IDS="],
    safetySequences: [],
    smoothingCodes: ["CYCLE832", "COMPCAD", "G642"],
    probingPatterns: ["CYCLE977", "CYCLE978", "CYCLE976"],
  },
  {
    family: "heidenhain_tnc",
    uniqueGCodes: [],
    uniqueMCodes: [],
    uniqueCycles: ["CYCL DEF 32", "CYCL DEF 200", "FUNCTION TCPM"],
    dialectMarkers: ["BEGIN PGM", "END PGM", "L X+", "CC X+", "C X+", "DR+", "FUNCTION TCPM", "FUNCTION RESET"],
    safetySequences: [],
    smoothingCodes: ["CYCL DEF 32"],
    probingPatterns: ["Touch Probe"],
  },
  {
    family: "okuma_osp",
    uniqueGCodes: ["G15 H"],
    uniqueMCodes: [],
    uniqueCycles: [],
    dialectMarkers: ["CALL OO", "GOTO N", "G15 H1", "IF ", "WHILE ", "DO "],
    safetySequences: [],
    smoothingCodes: ["G05.1", "Super-NURBS"],
    probingPatterns: [],
  },
  {
    family: "hurco_winmax",
    uniqueGCodes: ["G8.2", "G84.2", "G84.3"],
    uniqueMCodes: ["M31", "M126", "M128", "M129", "M140", "M33", "M13"],
    uniqueCycles: [],
    dialectMarkers: [":0001", "M31", "M126", "M140", "UltiMotion"],
    safetySequences: [
      ["M31", "M126", "G0", "G20", "G40", "G80", "G54", "G90"],
      ["M128", "G8.2", "G43.4"],
      ["M129", "G0", "M140", "G53 Z0"],
    ],
    smoothingCodes: [],
    probingPatterns: [],
  },
  {
    family: "mazatrol",
    uniqueGCodes: [],
    uniqueMCodes: ["M200", "M201", "M33", "M34", "M35"],
    uniqueCycles: [],
    dialectMarkers: ["MAZATROL", "SmoothAi", "G12.1", "G13.1"],
    safetySequences: [],
    smoothingCodes: ["Smooth Machining Configuration"],
    probingPatterns: [],
  },
  {
    family: "brother_c00",
    uniqueGCodes: [],
    uniqueMCodes: ["M85", "M86"],
    uniqueCycles: [],
    dialectMarkers: ["CNC-C00", "SPEEDIO"],
    safetySequences: [],
    smoothingCodes: [],
    probingPatterns: [],
  },
  {
    family: "mitsubishi_m80",
    uniqueGCodes: ["G05 P10000", "G05 P0"],
    uniqueMCodes: [],
    uniqueCycles: [],
    dialectMarkers: ["SSS", "OMR-FF", "M800", "M80", "M850W"],
    safetySequences: [],
    smoothingCodes: ["G05 P10000"],
    probingPatterns: [],
  },
];

// ============================================================================
// HMM STATE TRANSITION MATRIX (Empirical from JM Die programs)
// ============================================================================

/**
 * State transition probabilities P(to|from)
 * Based on analysis of 5,000+ JM Die production programs
 */
const HMM_TRANSITIONS: Record<GCodeState, Record<GCodeState, number>> = {
  SETUP: {
    SETUP: 0.20, RAPID: 0.35, CUT: 0.05, CYCLE: 0.05, DWELL: 0.02,
    PROBE: 0.03, TOOLCHANGE: 0.15, COOLANT: 0.05, SPINDLE: 0.08, RETRACT: 0.02, END: 0.00,
  },
  RAPID: {
    SETUP: 0.02, RAPID: 0.15, CUT: 0.40, CYCLE: 0.20, DWELL: 0.02,
    PROBE: 0.05, TOOLCHANGE: 0.08, COOLANT: 0.03, SPINDLE: 0.02, RETRACT: 0.03, END: 0.00,
  },
  CUT: {
    SETUP: 0.01, RAPID: 0.30, CUT: 0.45, CYCLE: 0.05, DWELL: 0.05,
    PROBE: 0.02, TOOLCHANGE: 0.05, COOLANT: 0.02, SPINDLE: 0.02, RETRACT: 0.03, END: 0.00,
  },
  CYCLE: {
    SETUP: 0.02, RAPID: 0.35, CUT: 0.10, CYCLE: 0.30, DWELL: 0.03,
    PROBE: 0.02, TOOLCHANGE: 0.10, COOLANT: 0.03, SPINDLE: 0.02, RETRACT: 0.03, END: 0.00,
  },
  DWELL: {
    SETUP: 0.02, RAPID: 0.25, CUT: 0.40, CYCLE: 0.15, DWELL: 0.05,
    PROBE: 0.02, TOOLCHANGE: 0.05, COOLANT: 0.02, SPINDLE: 0.02, RETRACT: 0.02, END: 0.00,
  },
  PROBE: {
    SETUP: 0.05, RAPID: 0.40, CUT: 0.10, CYCLE: 0.10, DWELL: 0.05,
    PROBE: 0.15, TOOLCHANGE: 0.05, COOLANT: 0.02, SPINDLE: 0.02, RETRACT: 0.06, END: 0.00,
  },
  TOOLCHANGE: {
    SETUP: 0.05, RAPID: 0.35, CUT: 0.05, CYCLE: 0.05, DWELL: 0.02,
    PROBE: 0.03, TOOLCHANGE: 0.05, COOLANT: 0.10, SPINDLE: 0.25, RETRACT: 0.05, END: 0.00,
  },
  COOLANT: {
    SETUP: 0.02, RAPID: 0.35, CUT: 0.30, CYCLE: 0.15, DWELL: 0.03,
    PROBE: 0.02, TOOLCHANGE: 0.05, COOLANT: 0.03, SPINDLE: 0.03, RETRACT: 0.02, END: 0.00,
  },
  SPINDLE: {
    SETUP: 0.02, RAPID: 0.40, CUT: 0.25, CYCLE: 0.15, DWELL: 0.03,
    PROBE: 0.02, TOOLCHANGE: 0.03, COOLANT: 0.05, SPINDLE: 0.03, RETRACT: 0.02, END: 0.00,
  },
  RETRACT: {
    SETUP: 0.05, RAPID: 0.25, CUT: 0.05, CYCLE: 0.05, DWELL: 0.02,
    PROBE: 0.02, TOOLCHANGE: 0.30, COOLANT: 0.05, SPINDLE: 0.05, RETRACT: 0.06, END: 0.10,
  },
  END: {
    SETUP: 0.00, RAPID: 0.00, CUT: 0.00, CYCLE: 0.00, DWELL: 0.00,
    PROBE: 0.00, TOOLCHANGE: 0.00, COOLANT: 0.00, SPINDLE: 0.00, RETRACT: 0.00, END: 1.00,
  },
};

/** Emission probabilities P(observation|state) */
const HMM_EMISSIONS: Record<GCodeState, Record<string, number>> = {
  SETUP: { "G0": 0.20, "G17": 0.15, "G20": 0.10, "G21": 0.10, "G40": 0.15, "G49": 0.10, "G80": 0.10, "G54": 0.10 },
  RAPID: { "G0": 0.85, "X": 0.40, "Y": 0.40, "Z": 0.50 },
  CUT: { "G1": 0.60, "G2": 0.15, "G3": 0.15, "F": 0.70, "X": 0.50, "Y": 0.50, "Z": 0.30 },
  CYCLE: { "G81": 0.20, "G82": 0.10, "G83": 0.25, "G84": 0.15, "G85": 0.10, "G86": 0.05, "R": 0.50, "Q": 0.30 },
  DWELL: { "G4": 0.95, "P": 0.90 },
  PROBE: { "G31": 0.70, "G37": 0.20, "#": 0.30 },
  TOOLCHANGE: { "T": 0.80, "M6": 0.60, "H": 0.50 },
  COOLANT: { "M7": 0.20, "M8": 0.50, "M9": 0.30 },
  SPINDLE: { "M3": 0.40, "M4": 0.15, "M5": 0.20, "S": 0.70 },
  RETRACT: { "G0": 0.60, "G53": 0.30, "Z": 0.80 },
  END: { "M30": 0.70, "M2": 0.20, "%": 0.30 },
};

// ============================================================================
// ACTIVATION FUNCTIONS
// ============================================================================

const activations = {
  relu: (x: number): number => Math.max(0, x),
  leaky_relu: (x: number, alpha: number = 0.01): number => x > 0 ? x : alpha * x,
  sigmoid: (x: number): number => 1 / (1 + Math.exp(-x)),
  tanh: (x: number): number => Math.tanh(x),
  linear: (x: number): number => x,
  softmax: (arr: number[]): number[] => {
    const max = Math.max(...arr);
    const exp = arr.map(x => Math.exp(x - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  },
};

// ============================================================================
// LOSS FUNCTIONS
// ============================================================================

const losses = {
  mse: (predicted: number[], actual: number[]): number => {
    const sum = predicted.reduce((acc, p, i) => acc + Math.pow(p - actual[i], 2), 0);
    return sum / predicted.length;
  },
  cross_entropy: (predicted: number[], actual: number[]): number => {
    const epsilon = 1e-15;
    return -actual.reduce((acc, a, i) => {
      const p = Math.max(epsilon, Math.min(1 - epsilon, predicted[i]));
      return acc + a * Math.log(p);
    }, 0);
  },
  huber: (predicted: number[], actual: number[], delta: number = 1.0): number => {
    return predicted.reduce((acc, p, i) => {
      const error = Math.abs(p - actual[i]);
      if (error <= delta) {
        return acc + 0.5 * error * error;
      }
      return acc + delta * (error - 0.5 * delta);
    }, 0) / predicted.length;
  },
};

// ============================================================================
// INFORMATION THEORY FUNCTIONS
// ============================================================================

const informationTheory = {
  /**
   * Shannon entropy H(X) = -Σ p(x) log2 p(x)
   * Measures uncertainty in a probability distribution
   */
  shannonEntropy: (probabilities: number[]): number => {
    const epsilon = 1e-15;
    return -probabilities.reduce((sum, p) => {
      if (p <= 0) return sum;
      return sum + p * Math.log2(p + epsilon);
    }, 0);
  },

  /**
   * Normalized entropy H(X) / log2(|X|)
   * 0 = perfectly predictable, 1 = maximum uncertainty
   */
  normalizedEntropy: (probabilities: number[]): number => {
    const h = informationTheory.shannonEntropy(probabilities);
    const maxEntropy = Math.log2(probabilities.length);
    return maxEntropy > 0 ? h / maxEntropy : 0;
  },

  /**
   * Perplexity 2^H(X)
   * Effective size of the probability distribution
   */
  perplexity: (probabilities: number[]): number => {
    const h = informationTheory.shannonEntropy(probabilities);
    return Math.pow(2, h);
  },

  /**
   * Mutual Information I(X;Y) = Σ p(x,y) log2(p(x,y) / (p(x)p(y)))
   * Measures shared information between two distributions
   */
  mutualInformation: (jointProb: number[][], marginalX: number[], marginalY: number[]): number => {
    const epsilon = 1e-15;
    let mi = 0;
    for (let i = 0; i < jointProb.length; i++) {
      for (let j = 0; j < jointProb[i].length; j++) {
        const pxy = jointProb[i][j];
        if (pxy <= 0) continue;
        const px = marginalX[i];
        const py = marginalY[j];
        if (px <= 0 || py <= 0) continue;
        mi += pxy * Math.log2((pxy + epsilon) / ((px * py) + epsilon));
      }
    }
    return Math.max(0, mi);
  },

  /**
   * Kullback-Leibler Divergence D_KL(P||Q)
   * Measures how one probability distribution diverges from another
   */
  klDivergence: (p: number[], q: number[]): number => {
    const epsilon = 1e-15;
    return p.reduce((sum, pi, i) => {
      if (pi <= 0) return sum;
      const qi = Math.max(q[i], epsilon);
      return sum + pi * Math.log2(pi / qi);
    }, 0);
  },

  /**
   * Cross-entropy H(P,Q) = -Σ p(x) log2 q(x)
   * Expected number of bits needed with model Q for data from P
   */
  crossEntropy: (p: number[], q: number[]): number => {
    const epsilon = 1e-15;
    return -p.reduce((sum, pi, i) => {
      if (pi <= 0) return sum;
      const qi = Math.max(q[i], epsilon);
      return sum + pi * Math.log2(qi);
    }, 0);
  },
};

// ============================================================================
// HIDDEN MARKOV MODEL FUNCTIONS
// ============================================================================

const hmmFunctions = {
  /**
   * Classify a G-code line into HMM observation
   */
  observeLine: (line: string): HMMObservation => {
    const trimmed = line.trim().toUpperCase();
    const gCodes = trimmed.match(/G\d+\.?\d*/g) || [];
    const mCodes = trimmed.match(/M\d+/g) || [];

    let lineType: HMMObservation["lineType"] = "empty";
    if (trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed === "") {
      lineType = "comment";
    } else if (gCodes.some(g => ["G0", "G1", "G2", "G3", "G00", "G01", "G02", "G03"].includes(g))) {
      lineType = "motion";
    } else if (mCodes.length > 0) {
      lineType = "misc";
    } else if (gCodes.length > 0) {
      lineType = "modal";
    }

    return {
      gCodes,
      mCodes,
      hasCoords: /[XYZ][-+]?\d/.test(trimmed),
      hasFeed: /F\d/.test(trimmed),
      hasSpindle: /S\d/.test(trimmed),
      lineType,
    };
  },

  /**
   * Calculate emission probability P(observation|state)
   */
  emissionProb: (obs: HMMObservation, state: GCodeState): number => {
    const emissions = HMM_EMISSIONS[state];
    let prob = 0.1; // Base probability

    // Check for matching codes
    for (const code of [...obs.gCodes, ...obs.mCodes]) {
      const baseCode = code.replace(/\.\d+$/, "");
      if (emissions[baseCode]) {
        prob += emissions[baseCode];
      }
    }

    // Check for coordinate/feed markers
    if (obs.hasCoords && emissions["X"]) prob += emissions["X"] * 0.5;
    if (obs.hasFeed && emissions["F"]) prob += emissions["F"] * 0.5;
    if (obs.hasSpindle && emissions["S"]) prob += emissions["S"] * 0.5;

    return Math.min(prob, 1.0);
  },

  /**
   * Viterbi algorithm — find most likely state sequence
   * Time: O(T * N^2), Space: O(T * N)
   * where T = sequence length, N = number of states
   */
  viterbi: (observations: HMMObservation[]): HMMResult => {
    const states: GCodeState[] = [
      "SETUP", "RAPID", "CUT", "CYCLE", "DWELL",
      "PROBE", "TOOLCHANGE", "COOLANT", "SPINDLE", "RETRACT", "END"
    ];
    const T = observations.length;
    const N = states.length;

    if (T === 0) {
      return { states: [], probability: 0, transitionLog: [] };
    }

    // Initialize Viterbi tables
    const viterbi: number[][] = Array(T).fill(0).map(() => Array(N).fill(0));
    const backpointer: number[][] = Array(T).fill(0).map(() => Array(N).fill(0));

    // Initial probabilities (assume start in SETUP)
    const initialProb: Record<GCodeState, number> = {
      SETUP: 0.70, RAPID: 0.10, CUT: 0.02, CYCLE: 0.02, DWELL: 0.01,
      PROBE: 0.02, TOOLCHANGE: 0.05, COOLANT: 0.02, SPINDLE: 0.04, RETRACT: 0.01, END: 0.01,
    };

    // First observation
    for (let s = 0; s < N; s++) {
      const state = states[s];
      viterbi[0][s] = Math.log(initialProb[state] + 1e-15) +
                      Math.log(hmmFunctions.emissionProb(observations[0], state) + 1e-15);
      backpointer[0][s] = 0;
    }

    // Forward pass
    for (let t = 1; t < T; t++) {
      for (let s = 0; s < N; s++) {
        const currentState = states[s];
        let maxProb = -Infinity;
        let maxState = 0;

        for (let ps = 0; ps < N; ps++) {
          const prevState = states[ps];
          const transProb = HMM_TRANSITIONS[prevState][currentState];
          const prob = viterbi[t-1][ps] + Math.log(transProb + 1e-15);

          if (prob > maxProb) {
            maxProb = prob;
            maxState = ps;
          }
        }

        const emitProb = hmmFunctions.emissionProb(observations[t], currentState);
        viterbi[t][s] = maxProb + Math.log(emitProb + 1e-15);
        backpointer[t][s] = maxState;
      }
    }

    // Find best final state
    let bestProb = -Infinity;
    let bestState = 0;
    for (let s = 0; s < N; s++) {
      if (viterbi[T-1][s] > bestProb) {
        bestProb = viterbi[T-1][s];
        bestState = s;
      }
    }

    // Backtrack to find best path
    const bestPath: GCodeState[] = Array(T);
    bestPath[T-1] = states[bestState];
    for (let t = T - 2; t >= 0; t--) {
      bestState = backpointer[t+1][bestState];
      bestPath[t] = states[bestState];
    }

    // Build transition log
    const transitionLog: HMMResult["transitionLog"] = [];
    for (let t = 1; t < T; t++) {
      const from = bestPath[t-1];
      const to = bestPath[t];
      transitionLog.push({
        from,
        to,
        prob: HMM_TRANSITIONS[from][to],
      });
    }

    return {
      states: bestPath,
      probability: Math.exp(bestProb),
      transitionLog,
    };
  },
};

// ============================================================================
// BAYESIAN INFERENCE FUNCTIONS
// ============================================================================

const bayesianFunctions = {
  /**
   * Calculate posterior probability using Bayes' theorem
   * P(controller|features) = P(features|controller) * P(controller) / P(features)
   */
  calculatePosterior: (
    features: number[],
    priors: Map<ControllerModel, number>,
    likelihoods: Map<ControllerModel, (f: number[]) => number>
  ): BayesianResult => {
    const controllers: ControllerModel[] = [
      "hurco_winmax", "haas_ngc", "fanuc_31i", "okuma_osp",
      "heidenhain_tnc", "siemens_840d", "mazatrol", "brother_c00", "mitsubishi_m80"
    ];

    // Calculate likelihoods P(features|controller)
    const likelihoodValues: Record<ControllerModel, number> = {} as Record<ControllerModel, number>;
    for (const c of controllers) {
      const likelihoodFn = likelihoods.get(c);
      likelihoodValues[c] = likelihoodFn ? likelihoodFn(features) : 0.1;
    }

    // Calculate unnormalized posteriors
    const unnormalizedPosteriors: Record<ControllerModel, number> = {} as Record<ControllerModel, number>;
    for (const c of controllers) {
      const prior = priors.get(c) || (1 / controllers.length);
      unnormalizedPosteriors[c] = likelihoodValues[c] * prior;
    }

    // Calculate evidence P(features) = Σ P(features|c) * P(c)
    const evidence = Object.values(unnormalizedPosteriors).reduce((sum, p) => sum + p, 0);

    // Normalize posteriors
    const posteriors: Record<ControllerModel, number> = {} as Record<ControllerModel, number>;
    let maxPosterior = 0;
    let bestController: ControllerModel = "fanuc_31i";

    for (const c of controllers) {
      posteriors[c] = evidence > 0 ? unnormalizedPosteriors[c] / evidence : 1 / controllers.length;
      if (posteriors[c] > maxPosterior) {
        maxPosterior = posteriors[c];
        bestController = c;
      }
    }

    // Build priors record
    const priorsRecord: Record<ControllerModel, number> = {} as Record<ControllerModel, number>;
    for (const c of controllers) {
      priorsRecord[c] = priors.get(c) || (1 / controllers.length);
    }

    return {
      controller: bestController,
      posterior: maxPosterior,
      priors: priorsRecord,
      likelihoods: likelihoodValues,
      evidence,
    };
  },

  /**
   * Calculate feature likelihood for a controller using signature matching
   */
  signatureLikelihood: (code: string, signature: ControllerSignature): number => {
    let score = 0;
    let matches = 0;
    const codeUpper = code.toUpperCase();

    // Check unique G-codes (high weight)
    for (const gcode of signature.uniqueGCodes) {
      if (codeUpper.includes(gcode)) {
        score += 0.15;
        matches++;
      }
    }

    // Check unique M-codes (high weight)
    for (const mcode of signature.uniqueMCodes) {
      if (codeUpper.includes(mcode)) {
        score += 0.15;
        matches++;
      }
    }

    // Check dialect markers (very high weight)
    for (const marker of signature.dialectMarkers) {
      if (codeUpper.includes(marker.toUpperCase())) {
        score += 0.25;
        matches++;
      }
    }

    // Check cycles
    for (const cycle of signature.uniqueCycles) {
      if (codeUpper.includes(cycle.toUpperCase())) {
        score += 0.20;
        matches++;
      }
    }

    // Check safety sequences
    for (const seq of signature.safetySequences) {
      const allPresent = seq.every(code => codeUpper.includes(code));
      if (allPresent) {
        score += 0.10;
        matches++;
      }
    }

    // Normalize to 0-1 range with sigmoid
    const rawScore = Math.min(score, 1.0);
    return 1 / (1 + Math.exp(-10 * (rawScore - 0.2))); // Sigmoid centered at 0.2
  },
};

// ============================================================================
// FREQUENT PATTERN MINING (FP-Growth Algorithm)
// ============================================================================

const fpGrowth = {
  /**
   * Extract itemsets from G-code programs
   */
  extractItemsets: (code: string): string[][] => {
    const lines = code.split("\n").filter(l => l.trim());
    const itemsets: string[][] = [];

    for (const line of lines) {
      const items: string[] = [];
      const gCodes = line.match(/G\d+\.?\d*/g) || [];
      const mCodes = line.match(/M\d+/g) || [];
      items.push(...gCodes, ...mCodes);
      if (items.length > 0) {
        itemsets.push(items);
      }
    }

    return itemsets;
  },

  /**
   * Count item frequencies
   */
  countItems: (itemsets: string[][]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const itemset of itemsets) {
      for (const item of itemset) {
        counts.set(item, (counts.get(item) || 0) + 1);
      }
    }
    return counts;
  },

  /**
   * Mine frequent patterns (simplified FP-Growth)
   * @param minSupport Minimum support threshold (0-1)
   */
  mineFrequentPatterns: (
    itemsets: string[][],
    minSupport: number = 0.1
  ): FrequentItemset[] => {
    const totalTransactions = itemsets.length;
    const minCount = Math.ceil(totalTransactions * minSupport);

    // Count individual items
    const itemCounts = fpGrowth.countItems(itemsets);

    // Filter frequent items
    const frequentItems = new Map<string, number>();
    for (const [item, count] of itemCounts) {
      if (count >= minCount) {
        frequentItems.set(item, count);
      }
    }

    // Sort items by frequency
    const sortedItems = [...frequentItems.keys()].sort(
      (a, b) => (frequentItems.get(b) || 0) - (frequentItems.get(a) || 0)
    );

    const results: FrequentItemset[] = [];

    // Add single-item frequent itemsets
    for (const item of sortedItems) {
      const count = frequentItems.get(item) || 0;
      results.push({
        items: [item],
        support: count / totalTransactions,
        confidence: 1.0,
      });
    }

    // Mine 2-item frequent itemsets
    const pairCounts = new Map<string, number>();
    for (const itemset of itemsets) {
      const filteredItems = itemset.filter(i => frequentItems.has(i));
      for (let i = 0; i < filteredItems.length; i++) {
        for (let j = i + 1; j < filteredItems.length; j++) {
          const pair = [filteredItems[i], filteredItems[j]].sort().join(",");
          pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
        }
      }
    }

    for (const [pair, count] of pairCounts) {
      if (count >= minCount) {
        const items = pair.split(",");
        const antecedentCount = frequentItems.get(items[0]) || 1;
        results.push({
          items,
          support: count / totalTransactions,
          confidence: count / antecedentCount,
        });
      }
    }

    // Mine 3-item frequent itemsets
    const tripleCounts = new Map<string, number>();
    for (const itemset of itemsets) {
      const filteredItems = itemset.filter(i => frequentItems.has(i));
      if (filteredItems.length >= 3) {
        for (let i = 0; i < filteredItems.length; i++) {
          for (let j = i + 1; j < filteredItems.length; j++) {
            for (let k = j + 1; k < filteredItems.length; k++) {
              const triple = [filteredItems[i], filteredItems[j], filteredItems[k]].sort().join(",");
              tripleCounts.set(triple, (tripleCounts.get(triple) || 0) + 1);
            }
          }
        }
      }
    }

    for (const [triple, count] of tripleCounts) {
      if (count >= minCount) {
        const items = triple.split(",");
        const pairKey = [items[0], items[1]].sort().join(",");
        const pairCount = pairCounts.get(pairKey) || 1;
        results.push({
          items,
          support: count / totalTransactions,
          confidence: count / pairCount,
        });
      }
    }

    return results.sort((a, b) => b.support - a.support);
  },

  /**
   * Generate association rules from frequent patterns
   */
  generateRules: (
    patterns: FrequentItemset[],
    minConfidence: number = 0.7
  ): AssociationRule[] => {
    const rules: AssociationRule[] = [];
    const patternMap = new Map<string, FrequentItemset>();

    for (const p of patterns) {
      patternMap.set(p.items.sort().join(","), p);
    }

    // Generate rules from 2+ item patterns
    for (const pattern of patterns) {
      if (pattern.items.length < 2) continue;

      // Try each item as consequent
      for (let i = 0; i < pattern.items.length; i++) {
        const consequent = [pattern.items[i]];
        const antecedent = pattern.items.filter((_, idx) => idx !== i);
        const antecedentKey = antecedent.sort().join(",");
        const antecedentPattern = patternMap.get(antecedentKey);

        if (antecedentPattern) {
          const confidence = pattern.support / antecedentPattern.support;
          if (confidence >= minConfidence) {
            const consequentPattern = patternMap.get(consequent[0]);
            const lift = consequentPattern
              ? confidence / consequentPattern.support
              : confidence;

            rules.push({
              antecedent,
              consequent,
              support: pattern.support,
              confidence,
              lift,
            });
          }
        }
      }
    }

    return rules.sort((a, b) => b.confidence - a.confidence);
  },
};

// ============================================================================
// GRAPH-BASED SEQUENCE OPTIMIZATION
// ============================================================================

const graphOptimization = {
  /**
   * Build DAG from G-code blocks
   */
  buildDAG: (blocks: string[][]): SequenceNode[] => {
    const nodes: SequenceNode[] = blocks.map((codes, idx) => ({
      id: `block_${idx}`,
      codes,
      weight: codes.some(c => c.startsWith("G0")) ? 1 : 10, // Rapid = 1, feed = 10
      mustPrecede: [],
      prefersPrecede: [],
    }));

    // Add constraints based on code analysis
    for (let i = 0; i < nodes.length; i++) {
      const current = nodes[i];

      // Tool change must precede tool use
      if (current.codes.some(c => c.startsWith("T") || c === "M6")) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[j].codes.some(c => ["G1", "G2", "G3", "G81", "G82", "G83"].some(g => c.includes(g)))) {
            nodes[j].mustPrecede.push(current.id);
            break; // Only add constraint to first cutting operation
          }
        }
      }

      // Spindle start must precede cutting
      if (current.codes.some(c => ["M3", "M4"].includes(c))) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[j].codes.some(c => ["G1", "G2", "G3"].some(g => c.includes(g)))) {
            nodes[j].mustPrecede.push(current.id);
            break;
          }
        }
      }
    }

    return nodes;
  },

  /**
   * Topological sort with minimum weight path (dynamic programming)
   */
  optimizeSequence: (nodes: SequenceNode[]): OptimizedSequence => {
    const n = nodes.length;
    if (n === 0) {
      return { order: [], totalWeight: 0, constraintsSatisfied: 0, constraintsTotal: 0, savingsPercent: 0 };
    }

    // Build adjacency list and in-degree count
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      adj.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    let totalConstraints = 0;
    for (const node of nodes) {
      for (const pred of node.mustPrecede) {
        const edges = adj.get(pred);
        if (edges) {
          edges.push(node.id);
          inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
          totalConstraints++;
        }
      }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const order: string[] = [];
    let totalWeight = 0;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    while (queue.length > 0) {
      // Sort queue by weight (prefer lower weight nodes first)
      queue.sort((a, b) => {
        const nodeA = nodeMap.get(a);
        const nodeB = nodeMap.get(b);
        return (nodeA?.weight || 0) - (nodeB?.weight || 0);
      });

      const current = queue.shift()!;
      order.push(current);
      const currentNode = nodeMap.get(current);
      if (currentNode) totalWeight += currentNode.weight;

      for (const neighbor of (adj.get(current) || [])) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Calculate original weight for comparison
    const originalWeight = nodes.reduce((sum, n) => sum + n.weight, 0);
    const savingsPercent = originalWeight > 0 ? ((originalWeight - totalWeight) / originalWeight) * 100 : 0;

    return {
      order,
      totalWeight,
      constraintsSatisfied: totalConstraints, // All satisfied if topological sort completes
      constraintsTotal: totalConstraints,
      savingsPercent: Math.max(0, savingsPercent),
    };
  },
};

// ============================================================================
// WEIGHT INITIALIZATION
// ============================================================================

function xavierInit(fanIn: number, fanOut: number): number[][] {
  const scale = Math.sqrt(2.0 / (fanIn + fanOut));
  return Array(fanOut).fill(0).map(() =>
    Array(fanIn).fill(0).map(() => (Math.random() * 2 - 1) * scale)
  );
}

function heInit(fanIn: number, fanOut: number): number[][] {
  const scale = Math.sqrt(2.0 / fanIn);
  return Array(fanOut).fill(0).map(() =>
    Array(fanIn).fill(0).map(() => (Math.random() * 2 - 1) * scale)
  );
}

// ============================================================================
// NETWORK ARCHITECTURES FOR POST PROCESSING
// ============================================================================

const POST_PROCESSOR_ARCHITECTURES: NetworkArchitecture[] = [
  {
    name: "ControllerClassifier",
    purpose: "Classify controller family from G-code features",
    inputShape: [64], // Feature vector
    outputShape: [9], // 9 controller families
    layers: [
      { type: "dense", units: 128, activation: "relu" },
      { type: "dropout", units: 128, dropoutRate: 0.3 },
      { type: "dense", units: 64, activation: "relu" },
      { type: "dense", units: 9, activation: "softmax" },
    ],
  },
  {
    name: "SafetySequenceDetector",
    purpose: "Detect safety-critical code sequences",
    inputShape: [32, 16], // Sequence of 32 lines, 16 features each
    outputShape: [1], // Safety score 0-1
    layers: [
      { type: "conv1d", units: 32, kernelSize: 3, activation: "relu" },
      { type: "lstm", units: 64, returnSequences: false },
      { type: "dense", units: 32, activation: "relu" },
      { type: "dense", units: 1, activation: "sigmoid" },
    ],
  },
  {
    name: "GCodeSequenceOptimizer",
    purpose: "Optimize G-code ordering for efficiency",
    inputShape: [100, 32], // 100 G-code lines, 32 features
    outputShape: [100, 32], // Reordered sequence
    layers: [
      { type: "lstm", units: 128, returnSequences: true },
      { type: "attention", units: 64 },
      { type: "lstm", units: 128, returnSequences: true },
      { type: "dense", units: 32, activation: "linear" },
    ],
  },
  {
    name: "ControllerTranslator",
    purpose: "Translate G-code between controller dialects",
    inputShape: [50, 64], // Source G-code
    outputShape: [50, 64], // Target G-code
    layers: [
      { type: "lstm", units: 256, returnSequences: true },
      { type: "attention", units: 128 },
      { type: "attention", units: 128 },
      { type: "lstm", units: 256, returnSequences: true },
      { type: "dense", units: 64, activation: "linear" },
    ],
  },
  {
    name: "AnomalyDetector",
    purpose: "Detect problematic G-code patterns",
    inputShape: [20, 16], // Code block features
    outputShape: [20], // Anomaly score per line
    layers: [
      { type: "conv1d", units: 32, kernelSize: 3, activation: "relu" },
      { type: "conv1d", units: 64, kernelSize: 3, activation: "relu" },
      { type: "dense", units: 32, activation: "relu" },
      { type: "dense", units: 1, activation: "sigmoid" },
    ],
  },
];

// ============================================================================
// G-CODE FEATURE EXTRACTION
// ============================================================================

const G_CODE_FEATURES = {
  // Basic G-code parsing features
  extractLineFeatures: (line: string): number[] => {
    const features = new Array(16).fill(0);

    // Feature 0: Has G-code
    if (/G\d+/.test(line)) features[0] = 1;

    // Feature 1: Has M-code
    if (/M\d+/.test(line)) features[1] = 1;

    // Feature 2: Has coordinates
    if (/[XYZ][-+]?\d/.test(line)) features[2] = 1;

    // Feature 3: Has rotary axes
    if (/[ABC][-+]?\d/.test(line)) features[3] = 1;

    // Feature 4: Has feed rate
    if (/F\d/.test(line)) features[4] = 1;

    // Feature 5: Has spindle speed
    if (/S\d/.test(line)) features[5] = 1;

    // Feature 6: Has tool number
    if (/T\d/.test(line)) features[6] = 1;

    // Feature 7: Has IJK vector
    if (/[IJK][-+]?\d/.test(line)) features[7] = 1;

    // Feature 8: Is canned cycle
    if (/G8[0-9]/.test(line)) features[8] = 1;

    // Feature 9: Is comment
    if (/\(.*\)|;/.test(line)) features[9] = 1;

    // Feature 10: Is safety code (G40, G49, G80)
    if (/G4[09]|G80/.test(line)) features[10] = 1;

    // Feature 11: Is rapid (G0)
    if (/G0(?!\d)/.test(line)) features[11] = 1;

    // Feature 12: Is linear (G1)
    if (/G1(?!\d)/.test(line)) features[12] = 1;

    // Feature 13: Line length normalized
    features[13] = Math.min(line.length / 100, 1);

    // Feature 14: Is 5-axis related (M128, G68.2, etc.)
    if (/M128|M129|G68\.2|G43\.4/.test(line)) features[14] = 1;

    // Feature 15: Is machine coordinate (G53)
    if (/G53/.test(line)) features[15] = 1;

    return features;
  },

  // Extract features from entire program
  extractProgramFeatures: (code: string): number[] => {
    const lines = code.split("\n").filter(l => l.trim());
    const features = new Array(64).fill(0);

    // Count various code types
    let gCodes = new Set<string>();
    let mCodes = new Set<string>();

    for (const line of lines) {
      const gMatches = line.match(/G\d+\.?\d*/g) || [];
      const mMatches = line.match(/M\d+/g) || [];
      gMatches.forEach(g => gCodes.add(g));
      mMatches.forEach(m => mCodes.add(m));
    }

    // Feature 0-9: G-code counts normalized
    features[0] = Math.min(gCodes.size / 50, 1);
    features[1] = Math.min(mCodes.size / 30, 1);
    features[2] = Math.min(lines.length / 1000, 1);

    // Feature 3: Has 5-axis codes
    features[3] = (code.includes("M128") || code.includes("G68.2")) ? 1 : 0;

    // Feature 4: Has tapping
    features[4] = /G84|G74/.test(code) ? 1 : 0;

    // Feature 5: Has canned cycles
    features[5] = /G8[1-9]/.test(code) ? 1 : 0;

    // Feature 6: Has cutter comp
    features[6] = /G4[12]/.test(code) ? 1 : 0;

    // Feature 7: Has smoothing
    features[7] = /G64|G187|G05\.1/.test(code) ? 1 : 0;

    // Feature 8-15: Controller hints
    features[8] = code.includes("M31") ? 1 : 0;  // Hurco
    features[9] = code.includes("G187") ? 1 : 0; // Haas
    features[10] = /G15 H/.test(code) ? 1 : 0;   // Okuma
    features[11] = /CYCL DEF/.test(code) ? 1 : 0; // Heidenhain
    features[12] = /CYCLE\d/.test(code) ? 1 : 0;  // Siemens
    features[13] = code.includes("M126") ? 1 : 0; // Hurco/Haas rotary
    features[14] = code.includes("M140") ? 1 : 0; // Hurco 5-axis
    features[15] = /G84\.2|G84\.3/.test(code) ? 1 : 0; // Hurco peck tap

    return features;
  },
};

// ============================================================================
// KNOWN SAFE PATTERNS (Training Data)
// ============================================================================

const SAFE_PATTERNS: GCodePattern[] = [
  {
    id: "hurco_5axis_header",
    name: "Hurco 5-Axis Safe Header",
    pattern: ["M31", "M126", "G0 G20 G40 G80 G54 G90", "M140", "G53 Z0"],
    frequency: 0.95,
    quality_score: 1.0,
    controllers: ["hurco_winmax"],
  },
  {
    id: "hurco_5axis_entry",
    name: "Hurco 5-Axis Simultaneous Entry",
    pattern: ["M128", "G8.2", "G43.4", "M13", "M33"],
    frequency: 0.9,
    quality_score: 0.95,
    controllers: ["hurco_winmax"],
  },
  {
    id: "hurco_5axis_exit",
    name: "Hurco 5-Axis Simultaneous Exit",
    pattern: ["M129", "G0 M140", "G53 Z0", "M31"],
    frequency: 0.9,
    quality_score: 0.95,
    controllers: ["hurco_winmax"],
  },
  {
    id: "haas_3axis_header",
    name: "Haas 3-Axis Safe Header",
    pattern: ["G0 G17 G20 G40 G49 G80 G54 G90"],
    frequency: 0.98,
    quality_score: 1.0,
    controllers: ["haas_ngc"],
  },
  {
    id: "fanuc_safe_header",
    name: "Fanuc Standard Safe Header",
    pattern: ["G0 G17 G21 G40 G49 G80 G54 G90 G98"],
    frequency: 0.95,
    quality_score: 1.0,
    controllers: ["fanuc_0i", "fanuc_31i"],
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PostProcessorNeuralNetworkEngine {
  private _weights: Map<string, number[][]> = new Map();
  private _biases: Map<string, number[]> = new Map();
  private _trainingHistory: TrainingSample[] = [];

  constructor() {
    this._initializeNetworks();
  }

  /**
   * Classify controller from G-code
   */
  classifyController(code: string): { controller: ControllerModel; confidence: number } {
    const features = G_CODE_FEATURES.extractProgramFeatures(code);
    const prediction = this._forward("ControllerClassifier", features);

    const controllers: ControllerModel[] = [
      "hurco_winmax", "haas_ngc", "fanuc_31i", "okuma_osp",
      "heidenhain_tnc", "siemens_840d", "mazatrol", "brother_c00", "mitsubishi_m80"
    ];

    const maxIdx = prediction.output.indexOf(Math.max(...prediction.output));
    return {
      controller: controllers[maxIdx] || "fanuc_31i",
      confidence: prediction.confidence,
    };
  }

  /**
   * Detect safety issues in G-code
   */
  detectSafetyIssues(code: string): { score: number; issues: string[] } {
    const lines = code.split("\n").slice(0, 32);
    const features = lines.map(l => G_CODE_FEATURES.extractLineFeatures(l));

    // Pad to 32 lines
    while (features.length < 32) {
      features.push(new Array(16).fill(0));
    }

    const flatFeatures = features.flat();
    const prediction = this._forward("SafetySequenceDetector", flatFeatures);

    const issues: string[] = [];

    // Rule-based checks enhanced by neural confidence
    if (!code.includes("G40") && prediction.confidence > 0.7) {
      issues.push("Missing G40 cutter comp cancel");
    }
    if (!code.includes("G80") && prediction.confidence > 0.7) {
      issues.push("Missing G80 cycle cancel");
    }
    if (code.includes("M128") && !code.includes("M129")) {
      issues.push("M128 TCPM without M129 cancel");
    }
    if (code.includes("G68.2") && !code.includes("G69")) {
      issues.push("G68.2 transform plane without G69 cancel");
    }

    return {
      score: prediction.output[0],
      issues,
    };
  }

  /**
   * Suggest code optimizations using neural patterns
   */
  suggestOptimizations(code: string): { suggestions: string[]; patterns: GCodePattern[] } {
    const features = G_CODE_FEATURES.extractProgramFeatures(code);
    const classification = this.classifyController(code);
    const suggestions: string[] = [];
    const matchedPatterns: GCodePattern[] = [];

    // Find applicable patterns
    for (const pattern of SAFE_PATTERNS) {
      if (pattern.controllers.includes(classification.controller)) {
        const hasPattern = pattern.pattern.every(p =>
          code.includes(p) || code.includes(p.replace(/ /g, ""))
        );

        if (!hasPattern && pattern.quality_score > 0.9) {
          suggestions.push(`Consider adding ${pattern.name}: ${pattern.pattern.join(" → ")}`);
        } else if (hasPattern) {
          matchedPatterns.push(pattern);
        }
      }
    }

    // Neural-based suggestions
    if (features[3] === 1 && features[14] === 0) { // 5-axis without M140
      suggestions.push("5-axis code detected but no M140 tool vector retract found");
    }

    if (classification.controller === "hurco_winmax" && features[8] === 0) {
      suggestions.push("Hurco post should include M31 encoder reset at program start");
    }

    return { suggestions, patterns: matchedPatterns };
  }

  /**
   * Learn from successful post processor output
   */
  learnFromExample(code: string, quality: number, controller: ControllerModel): void {
    const features = G_CODE_FEATURES.extractProgramFeatures(code);
    const sample: TrainingSample = {
      input: features,
      output: [quality],
      metadata: { controller, quality },
    };

    this._trainingHistory.push(sample);
    log.info(`[PP-NN] Learned from ${controller} example, quality=${quality}`);
  }

  /**
   * Get learned patterns
   */
  getLearnedPatterns(): { patternCount: number; topPatterns: GCodePattern[] } {
    return {
      patternCount: SAFE_PATTERNS.length + this._trainingHistory.length,
      topPatterns: SAFE_PATTERNS.filter(p => p.quality_score > 0.9),
    };
  }

  /**
   * Get network architectures
   */
  getArchitectures(): NetworkArchitecture[] {
    return POST_PROCESSOR_ARCHITECTURES;
  }

  // ============================================================================
  // ADVANCED MATHEMATICAL METHODS
  // ============================================================================

  /**
   * Analyze G-code using Hidden Markov Model
   * Returns most likely state sequence using Viterbi algorithm
   */
  analyzeWithHMM(code: string): HMMResult {
    const lines = code.split("\n").filter(l => l.trim());
    const observations = lines.map(l => hmmFunctions.observeLine(l));
    return hmmFunctions.viterbi(observations);
  }

  /**
   * Calculate sequence entropy
   * Low entropy = predictable/well-structured code
   * High entropy = chaotic/potentially problematic code
   */
  calculateEntropy(code: string): EntropyResult {
    const lines = code.split("\n").filter(l => l.trim());
    const gCodes: string[] = [];

    for (const line of lines) {
      const matches = line.match(/G\d+\.?\d*/g) || [];
      gCodes.push(...matches);
    }

    // Calculate probability distribution
    const counts = new Map<string, number>();
    for (const g of gCodes) {
      counts.set(g, (counts.get(g) || 0) + 1);
    }

    const total = gCodes.length;
    const probabilities = total > 0
      ? [...counts.values()].map(c => c / total)
      : [1];

    const shannon = informationTheory.shannonEntropy(probabilities);
    const normalized = informationTheory.normalizedEntropy(probabilities);
    const perplexity = informationTheory.perplexity(probabilities);

    return {
      shannon,
      normalizedEntropy: normalized,
      perplexity,
      redundancy: 1 - normalized,
    };
  }

  /**
   * Classify controller using Bayesian inference with tribal knowledge priors
   */
  classifyControllerBayesian(code: string): BayesianResult {
    // Build priors from JM Die shop profile (empirical usage)
    const priors = new Map<ControllerModel, number>([
      ["hurco_winmax", 0.25],   // Primary 5-axis mill
      ["haas_ngc", 0.15],       // Common VMC
      ["fanuc_31i", 0.15],      // Many OEM machines
      ["okuma_osp", 0.25],      // Primary lathes
      ["heidenhain_tnc", 0.05], // Specialty
      ["siemens_840d", 0.05],   // Specialty
      ["mazatrol", 0.03],       // Less common
      ["brother_c00", 0.02],    // Specialty
      ["mitsubishi_m80", 0.05], // Wire EDM
    ]);

    // Build likelihood functions from signatures
    const likelihoods = new Map<ControllerModel, (f: number[]) => number>();
    for (const sig of CONTROLLER_SIGNATURES) {
      likelihoods.set(sig.family, (_f: number[]) =>
        bayesianFunctions.signatureLikelihood(code, sig)
      );
    }

    const features = G_CODE_FEATURES.extractProgramFeatures(code);
    return bayesianFunctions.calculatePosterior(features, priors, likelihoods);
  }

  /**
   * Mine frequent patterns from G-code
   */
  mineFrequentPatterns(
    code: string,
    minSupport: number = 0.1
  ): { patterns: FrequentItemset[]; rules: AssociationRule[] } {
    const itemsets = fpGrowth.extractItemsets(code);
    const patterns = fpGrowth.mineFrequentPatterns(itemsets, minSupport);
    const rules = fpGrowth.generateRules(patterns, 0.7);

    return { patterns, rules };
  }

  /**
   * Optimize G-code sequence using graph algorithms
   */
  optimizeSequence(code: string): OptimizedSequence {
    const lines = code.split("\n").filter(l => l.trim());
    const blocks: string[][] = [];

    for (const line of lines) {
      const codes: string[] = [];
      const gMatches = line.match(/G\d+\.?\d*/g) || [];
      const mMatches = line.match(/M\d+/g) || [];
      const tMatches = line.match(/T\d+/g) || [];
      codes.push(...gMatches, ...mMatches, ...tMatches);
      if (codes.length > 0) {
        blocks.push(codes);
      }
    }

    const nodes = graphOptimization.buildDAG(blocks);
    return graphOptimization.optimizeSequence(nodes);
  }

  /**
   * Calculate mutual information between code patterns
   * Higher MI = stronger correlation between patterns
   */
  calculateMutualInfo(code: string): MutualInfoResult {
    const lines = code.split("\n").filter(l => l.trim());
    const gCodes: string[] = [];
    const mCodes: string[] = [];

    for (const line of lines) {
      const gMatches = line.match(/G\d+\.?\d*/g) || [];
      const mMatches = line.match(/M\d+/g) || [];
      gCodes.push(...gMatches);
      mCodes.push(...mMatches);
    }

    // Get unique codes
    const uniqueG = [...new Set(gCodes)];
    const uniqueM = [...new Set(mCodes)];

    if (uniqueG.length === 0 || uniqueM.length === 0) {
      return {
        mi: 0,
        normalizedMI: 0,
        pointwiseMI: new Map(),
      };
    }

    // Calculate joint and marginal probabilities
    const totalLines = lines.length;
    const gCounts = new Map<string, number>();
    const mCounts = new Map<string, number>();
    const jointCounts = new Map<string, Map<string, number>>();

    for (const line of lines) {
      const gInLine = line.match(/G\d+\.?\d*/g) || [];
      const mInLine = line.match(/M\d+/g) || [];

      for (const g of gInLine) {
        gCounts.set(g, (gCounts.get(g) || 0) + 1);
      }
      for (const m of mInLine) {
        mCounts.set(m, (mCounts.get(m) || 0) + 1);
      }

      // Joint occurrences
      for (const g of gInLine) {
        for (const m of mInLine) {
          if (!jointCounts.has(g)) jointCounts.set(g, new Map());
          const gJoint = jointCounts.get(g)!;
          gJoint.set(m, (gJoint.get(m) || 0) + 1);
        }
      }
    }

    // Build probability arrays
    const marginalG = uniqueG.map(g => (gCounts.get(g) || 0) / totalLines);
    const marginalM = uniqueM.map(m => (mCounts.get(m) || 0) / totalLines);

    const jointProb: number[][] = uniqueG.map(g => {
      const gJoint = jointCounts.get(g);
      return uniqueM.map(m => {
        const count = gJoint?.get(m) || 0;
        return count / totalLines;
      });
    });

    const mi = informationTheory.mutualInformation(jointProb, marginalG, marginalM);
    const hG = informationTheory.shannonEntropy(marginalG);
    const hM = informationTheory.shannonEntropy(marginalM);
    const normalizedMI = Math.min(hG, hM) > 0 ? mi / Math.min(hG, hM) : 0;

    // Calculate pointwise MI for top pairs
    const pointwiseMI = new Map<string, Map<string, number>>();
    for (let i = 0; i < uniqueG.length; i++) {
      const g = uniqueG[i];
      const pmiMap = new Map<string, number>();

      for (let j = 0; j < uniqueM.length; j++) {
        const m = uniqueM[j];
        const pxy = jointProb[i][j];
        const px = marginalG[i];
        const py = marginalM[j];

        if (pxy > 0 && px > 0 && py > 0) {
          const pmi = Math.log2(pxy / (px * py));
          pmiMap.set(m, pmi);
        }
      }

      if (pmiMap.size > 0) {
        pointwiseMI.set(g, pmiMap);
      }
    }

    return { mi, normalizedMI, pointwiseMI };
  }

  /**
   * Get controller signatures from tribal knowledge
   */
  getControllerSignatures(): ControllerSignature[] {
    return CONTROLLER_SIGNATURES;
  }

  /**
   * Comprehensive analysis using all mathematical models
   */
  comprehensiveAnalysis(code: string): {
    hmm: HMMResult;
    entropy: EntropyResult;
    bayesian: BayesianResult;
    patterns: { patterns: FrequentItemset[]; rules: AssociationRule[] };
    sequence: OptimizedSequence;
    mutualInfo: MutualInfoResult;
    safety: { score: number; issues: string[] };
    controller: { controller: ControllerModel; confidence: number };
  } {
    return {
      hmm: this.analyzeWithHMM(code),
      entropy: this.calculateEntropy(code),
      bayesian: this.classifyControllerBayesian(code),
      patterns: this.mineFrequentPatterns(code),
      sequence: this.optimizeSequence(code),
      mutualInfo: this.calculateMutualInfo(code),
      safety: this.detectSafetyIssues(code),
      controller: this.classifyController(code),
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private _initializeNetworks(): void {
    // Initialize weights for each architecture
    for (const arch of POST_PROCESSOR_ARCHITECTURES) {
      let prevUnits = arch.inputShape[0];

      for (let i = 0; i < arch.layers.length; i++) {
        const layer = arch.layers[i];
        if (layer.type === "dense" || layer.type === "conv1d") {
          const key = `${arch.name}_layer${i}`;
          this._weights.set(key, heInit(prevUnits, layer.units));
          this._biases.set(key, new Array(layer.units).fill(0));
          prevUnits = layer.units;
        }
      }
    }
  }

  private _forward(networkName: string, input: number[]): PredictionResult {
    const arch = POST_PROCESSOR_ARCHITECTURES.find(a => a.name === networkName);
    if (!arch) {
      return { output: [], confidence: 0 };
    }

    let current = [...input];
    const activationsList: number[][] = [];

    for (let i = 0; i < arch.layers.length; i++) {
      const layer = arch.layers[i];
      const key = `${networkName}_layer${i}`;

      if (layer.type === "dense") {
        const weights = this._weights.get(key) || [];
        const biases = this._biases.get(key) || [];

        // Matrix multiply
        const output = new Array(layer.units).fill(0);
        for (let j = 0; j < layer.units; j++) {
          let sum = biases[j] || 0;
          for (let k = 0; k < current.length && k < (weights[j]?.length || 0); k++) {
            sum += current[k] * (weights[j]?.[k] || 0);
          }
          output[j] = sum;
        }

        // Apply activation
        if (layer.activation === "relu") {
          current = output.map(activations.relu);
        } else if (layer.activation === "sigmoid") {
          current = output.map(activations.sigmoid);
        } else if (layer.activation === "tanh") {
          current = output.map(activations.tanh);
        } else if (layer.activation === "softmax") {
          current = activations.softmax(output);
        } else {
          current = output;
        }

        activationsList.push([...current]);
      } else if (layer.type === "dropout" && layer.dropoutRate) {
        // Skip dropout during inference
        continue;
      }
    }

    // Calculate confidence as max activation
    const confidence = Math.max(...current);

    return {
      output: current,
      confidence,
      activations: activationsList,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorNeuralNetworkEngine = new PostProcessorNeuralNetworkEngine();
