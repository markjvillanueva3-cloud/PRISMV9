/**
 * WEDMOnlineLearningEngine — Incremental learning from production feedback
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN04
 *
 * Implements online learning to continuously improve WEDM parameter predictions
 * from production feedback. Uses exponential moving averages and adaptive
 * learning rates to incorporate new observations without full retraining.
 */

export interface ProductionFeedback {
  parameters: {
    gapVoltage: number;
    wireTension: number;
    flushingPressure: number;
    pulseOnTime: number;
    pulseOffTime: number;
    wireSpeed: number;
  };
  actualOutcomes: {
    mrr: number;
    surfaceRa: number;
    wireConsumption: number;
    energyConsumption: number;
  };
  predictedOutcomes?: {
    mrr: number;
    surfaceRa: number;
    wireConsumption: number;
    energyConsumption: number;
  };
  material: string;
  thickness: number;
  machineId?: string;
  timestamp: string;
  wireBreakOccurred?: boolean;
  qualityAccepted?: boolean;
}

export interface ModelState {
  coefficients: Record<string, Record<string, number>>;
  biases: Record<string, number>;
  observationCount: number;
  lastUpdated: string;
  learningRate: number;
  momentumTerms: Record<string, Record<string, number>>;
}

export interface LearningStats {
  totalObservations: number;
  recentPredictionError: Record<string, number>;
  learningRateHistory: number[];
  convergenceMetric: number;
  driftDetected: boolean;
  lastUpdate: string;
}

export interface PredictionResult {
  predictions: {
    mrr: number;
    surfaceRa: number;
    wireConsumption: number;
    energyConsumption: number;
  };
  confidence: Record<string, number>;
  modelVersion: number;
}

const FEATURE_NAMES = ['gapVoltage', 'wireTension', 'flushingPressure', 'pulseOnTime', 'pulseOffTime', 'wireSpeed'] as const;
type FeatureName = typeof FEATURE_NAMES[number];

const OUTCOME_NAMES = ['mrr', 'surfaceRa', 'wireConsumption', 'energyConsumption'] as const;
type OutcomeName = typeof OUTCOME_NAMES[number];

const FEATURE_SCALES: Record<FeatureName, number> = {
  gapVoltage: 60, wireTension: 15, flushingPressure: 1.0,
  pulseOnTime: 25, pulseOffTime: 50, wireSpeed: 10
};

const OUTCOME_SCALES: Record<OutcomeName, number> = {
  mrr: 30, surfaceRa: 1.5, wireConsumption: 50, energyConsumption: 5
};

function initializeCoefficients(): Record<OutcomeName, Record<FeatureName, number>> {
  return {
    mrr: { gapVoltage: 0.35, wireTension: -0.05, flushingPressure: 0.15, pulseOnTime: 0.30, pulseOffTime: -0.20, wireSpeed: 0.10 },
    surfaceRa: { gapVoltage: 0.25, wireTension: -0.10, flushingPressure: -0.05, pulseOnTime: 0.35, pulseOffTime: -0.15, wireSpeed: 0.05 },
    wireConsumption: { gapVoltage: 0.20, wireTension: 0.30, flushingPressure: 0.05, pulseOnTime: 0.25, pulseOffTime: -0.10, wireSpeed: 0.40 },
    energyConsumption: { gapVoltage: 0.40, wireTension: 0.05, flushingPressure: 0.10, pulseOnTime: 0.35, pulseOffTime: -0.25, wireSpeed: 0.15 },
  };
}

function initializeMomentum(): Record<OutcomeName, Record<FeatureName, number>> {
  const momentum: Record<string, Record<string, number>> = {};
  for (const outcome of OUTCOME_NAMES) {
    momentum[outcome] = {};
    for (const feature of FEATURE_NAMES) {
      momentum[outcome][feature] = 0;
    }
  }
  return momentum as Record<OutcomeName, Record<FeatureName, number>>;
}

export class WEDMOnlineLearningEngine {
  private models: Map<string, ModelState> = new Map();
  private feedbackHistory: Map<string, ProductionFeedback[]> = new Map();
  private stats: Map<string, LearningStats> = new Map();

  private readonly initialLearningRate = 0.01;
  private readonly minLearningRate = 0.001;
  private readonly maxLearningRate = 0.1;
  private readonly momentumFactor = 0.9;
  private readonly driftThreshold = 0.3;

  /**
   * Initialize or get a model for a specific context (material + machine)
   */
  initializeModel(material: string, machineId = 'default'): { modelId: string; modelState: ModelState } {
    const modelId = `${material.toLowerCase()}_${machineId}`;

    if (!this.models.has(modelId)) {
      const state: ModelState = {
        coefficients: initializeCoefficients(),
        biases: { mrr: 30, surfaceRa: 1.5, wireConsumption: 50, energyConsumption: 5 },
        observationCount: 0,
        lastUpdated: new Date().toISOString(),
        learningRate: this.initialLearningRate,
        momentumTerms: initializeMomentum(),
      };
      this.models.set(modelId, state);
      this.feedbackHistory.set(modelId, []);
      this.stats.set(modelId, {
        totalObservations: 0,
        recentPredictionError: { mrr: 0, surfaceRa: 0, wireConsumption: 0, energyConsumption: 0 },
        learningRateHistory: [this.initialLearningRate],
        convergenceMetric: 1.0,
        driftDetected: false,
        lastUpdate: new Date().toISOString(),
      });
    }

    return { modelId, modelState: this.models.get(modelId)! };
  }

  /**
   * Make a prediction using the current model
   */
  predict(
    material: string,
    parameters: ProductionFeedback['parameters'],
    thickness: number,
    machineId = 'default'
  ): PredictionResult {
    const { modelId, modelState } = this.initializeModel(material, machineId);
    const thicknessFactor = Math.sqrt(thickness / 25);

    const predictions: Record<OutcomeName, number> = {} as any;
    const confidence: Record<string, number> = {};

    for (const outcome of OUTCOME_NAMES) {
      let pred = modelState.biases[outcome];
      for (const feature of FEATURE_NAMES) {
        const normalizedFeature = parameters[feature] / FEATURE_SCALES[feature];
        pred += modelState.coefficients[outcome][feature] * normalizedFeature;
      }
      predictions[outcome] = Math.max(0, pred * thicknessFactor);

      // Confidence based on observation count
      const obsCount = modelState.observationCount;
      confidence[outcome] = Math.min(0.95, 0.5 + 0.4 * (1 - Math.exp(-obsCount / 20)));
    }

    return {
      predictions,
      confidence,
      modelVersion: modelState.observationCount,
    };
  }

  /**
   * Update model with production feedback (online learning step)
   */
  updateFromFeedback(feedback: ProductionFeedback): {
    modelId: string;
    updated: boolean;
    predictionErrors: Record<string, number>;
    newLearningRate: number;
  } {
    const { modelId, modelState } = this.initializeModel(feedback.material, feedback.machineId);
    const history = this.feedbackHistory.get(modelId)!;
    const stats = this.stats.get(modelId)!;

    // Store feedback
    history.push(feedback);
    if (history.length > 1000) history.shift(); // Keep last 1000 observations

    // Get prediction for these parameters
    const prediction = this.predict(
      feedback.material,
      feedback.parameters,
      feedback.thickness,
      feedback.machineId
    );

    // Compute prediction errors
    const predictionErrors: Record<string, number> = {};
    const gradients: Record<OutcomeName, Record<FeatureName, number>> = {} as any;
    const thicknessFactor = Math.sqrt(feedback.thickness / 25);

    for (const outcome of OUTCOME_NAMES) {
      const actual = feedback.actualOutcomes[outcome];
      const predicted = prediction.predictions[outcome];
      const error = actual - predicted;
      const normalizedError = error / (OUTCOME_SCALES[outcome] * thicknessFactor);
      predictionErrors[outcome] = normalizedError;

      // Compute gradients for each feature
      gradients[outcome] = {} as any;
      for (const feature of FEATURE_NAMES) {
        const normalizedFeature = feedback.parameters[feature] / FEATURE_SCALES[feature];
        gradients[outcome][feature] = normalizedError * normalizedFeature;
      }
    }

    // Adaptive learning rate based on error magnitude
    const avgAbsError = Object.values(predictionErrors).reduce((a, b) => a + Math.abs(b), 0) / 4;
    let newLearningRate = modelState.learningRate;

    if (avgAbsError > this.driftThreshold) {
      // Large error - increase learning rate (possible drift)
      newLearningRate = Math.min(this.maxLearningRate, modelState.learningRate * 1.1);
      stats.driftDetected = true;
    } else if (avgAbsError < 0.05) {
      // Small error - decrease learning rate (converged)
      newLearningRate = Math.max(this.minLearningRate, modelState.learningRate * 0.95);
      stats.driftDetected = false;
    }

    // Update coefficients using gradient descent with momentum
    for (const outcome of OUTCOME_NAMES) {
      for (const feature of FEATURE_NAMES) {
        const gradient = gradients[outcome][feature];
        const momentum = modelState.momentumTerms[outcome][feature];

        // Momentum update
        const newMomentum = this.momentumFactor * momentum + (1 - this.momentumFactor) * gradient;
        modelState.momentumTerms[outcome][feature] = newMomentum;

        // Apply update
        modelState.coefficients[outcome][feature] += newLearningRate * newMomentum;
      }

      // Update bias
      modelState.biases[outcome] += newLearningRate * predictionErrors[outcome] * 0.1;
    }

    // Penalize coefficients if wire break occurred
    if (feedback.wireBreakOccurred) {
      // Reduce aggressive parameters
      modelState.coefficients.mrr.gapVoltage *= 0.95;
      modelState.coefficients.mrr.pulseOnTime *= 0.95;
    }

    // Update model state
    modelState.observationCount++;
    modelState.lastUpdated = new Date().toISOString();
    modelState.learningRate = newLearningRate;

    // Update stats
    stats.totalObservations++;
    stats.recentPredictionError = predictionErrors;
    stats.learningRateHistory.push(newLearningRate);
    if (stats.learningRateHistory.length > 100) stats.learningRateHistory.shift();
    stats.convergenceMetric = 1 - Math.min(1, avgAbsError);
    stats.lastUpdate = new Date().toISOString();

    return {
      modelId,
      updated: true,
      predictionErrors,
      newLearningRate,
    };
  }

  /**
   * Batch update from multiple feedback entries
   */
  batchUpdate(feedbackList: ProductionFeedback[]): {
    modelsUpdated: string[];
    totalUpdates: number;
    averageError: number;
  } {
    const modelsUpdated = new Set<string>();
    let totalError = 0;
    let updateCount = 0;

    for (const feedback of feedbackList) {
      const result = this.updateFromFeedback(feedback);
      modelsUpdated.add(result.modelId);
      totalError += Object.values(result.predictionErrors).reduce((a, b) => a + Math.abs(b), 0) / 4;
      updateCount++;
    }

    return {
      modelsUpdated: Array.from(modelsUpdated),
      totalUpdates: updateCount,
      averageError: updateCount > 0 ? totalError / updateCount : 0,
    };
  }

  /**
   * Get current learning statistics for a model
   */
  getStats(material: string, machineId = 'default'): LearningStats | null {
    const modelId = `${material.toLowerCase()}_${machineId}`;
    return this.stats.get(modelId) ?? null;
  }

  /**
   * Get model state
   */
  getModelState(material: string, machineId = 'default'): ModelState | null {
    const modelId = `${material.toLowerCase()}_${machineId}`;
    return this.models.get(modelId) ?? null;
  }

  /**
   * Reset a model to initial state
   */
  resetModel(material: string, machineId = 'default'): boolean {
    const modelId = `${material.toLowerCase()}_${machineId}`;
    if (!this.models.has(modelId)) return false;

    this.models.delete(modelId);
    this.feedbackHistory.delete(modelId);
    this.stats.delete(modelId);
    this.initializeModel(material, machineId);
    return true;
  }

  /**
   * Export model for persistence
   */
  exportModel(material: string, machineId = 'default'): {
    modelId: string;
    state: ModelState;
    history: ProductionFeedback[];
  } | null {
    const modelId = `${material.toLowerCase()}_${machineId}`;
    const state = this.models.get(modelId);
    const history = this.feedbackHistory.get(modelId);

    if (!state || !history) return null;

    return {
      modelId,
      state: JSON.parse(JSON.stringify(state)),
      history: JSON.parse(JSON.stringify(history)),
    };
  }

  /**
   * Import a previously exported model
   */
  importModel(
    modelId: string,
    state: ModelState,
    history: ProductionFeedback[] = []
  ): boolean {
    this.models.set(modelId, JSON.parse(JSON.stringify(state)));
    this.feedbackHistory.set(modelId, JSON.parse(JSON.stringify(history)));
    this.stats.set(modelId, {
      totalObservations: state.observationCount,
      recentPredictionError: { mrr: 0, surfaceRa: 0, wireConsumption: 0, energyConsumption: 0 },
      learningRateHistory: [state.learningRate],
      convergenceMetric: 0.5,
      driftDetected: false,
      lastUpdate: state.lastUpdated,
    });
    return true;
  }

  /**
   * List all active models
   */
  listModels(): { modelId: string; observationCount: number; lastUpdated: string }[] {
    const result: { modelId: string; observationCount: number; lastUpdated: string }[] = [];
    for (const [modelId, state] of this.models) {
      result.push({
        modelId,
        observationCount: state.observationCount,
        lastUpdated: state.lastUpdated,
      });
    }
    return result;
  }

  /**
   * Detect concept drift by comparing recent vs historical errors
   */
  detectDrift(material: string, machineId = 'default'): {
    driftDetected: boolean;
    driftScore: number;
    recommendation: string;
  } {
    const modelId = `${material.toLowerCase()}_${machineId}`;
    const history = this.feedbackHistory.get(modelId);

    if (!history || history.length < 20) {
      return { driftDetected: false, driftScore: 0, recommendation: 'Insufficient data for drift detection' };
    }

    // Compare recent errors to historical errors
    const recentWindow = 10;
    const historicalWindow = Math.min(50, history.length - recentWindow);

    const recentErrors: number[] = [];
    const historicalErrors: number[] = [];

    for (let i = history.length - recentWindow; i < history.length; i++) {
      const fb = history[i];
      if (fb.predictedOutcomes) {
        const error = Math.abs(fb.actualOutcomes.mrr - fb.predictedOutcomes.mrr) / OUTCOME_SCALES.mrr;
        recentErrors.push(error);
      }
    }

    for (let i = history.length - recentWindow - historicalWindow; i < history.length - recentWindow; i++) {
      if (i < 0) continue;
      const fb = history[i];
      if (fb.predictedOutcomes) {
        const error = Math.abs(fb.actualOutcomes.mrr - fb.predictedOutcomes.mrr) / OUTCOME_SCALES.mrr;
        historicalErrors.push(error);
      }
    }

    if (recentErrors.length < 5 || historicalErrors.length < 10) {
      return { driftDetected: false, driftScore: 0, recommendation: 'Not enough predictions to detect drift' };
    }

    const recentMean = recentErrors.reduce((a, b) => a + b, 0) / recentErrors.length;
    const historicalMean = historicalErrors.reduce((a, b) => a + b, 0) / historicalErrors.length;
    const driftScore = (recentMean - historicalMean) / Math.max(0.01, historicalMean);

    const driftDetected = driftScore > 0.5;
    let recommendation = 'Model performance stable';
    if (driftDetected) {
      recommendation = driftScore > 1.0
        ? 'Severe drift detected - consider model reset or retraining'
        : 'Moderate drift detected - increase learning rate or collect more data';
    }

    return { driftDetected, driftScore, recommendation };
  }
}

export const wedmOnlineLearningEngine = new WEDMOnlineLearningEngine();
