/**
 * WEDMMLParameterOptimizerEngine
 * Bayesian optimization for Wire EDM cutting parameters
 *
 * Uses Gaussian Process surrogate model with Expected Improvement acquisition
 * to optimize: gap voltage, wire tension, flushing pressure, pulse on/off times
 *
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN01
 */

import { v4 as uuidv4 } from 'uuid';

export interface WEDMParameterBounds {
  gapVoltage: { min: number; max: number };      // V (40-80V typical)
  wireTension: { min: number; max: number };     // N (5-25N typical)
  flushingPressure: { min: number; max: number }; // bar (0.5-2.0 typical)
  pulseOnTime: { min: number; max: number };     // μs (1-50 typical)
  pulseOffTime: { min: number; max: number };    // μs (5-100 typical)
  wireSpeed: { min: number; max: number };       // m/min (5-15 typical)
}

export interface WEDMParameterSet {
  gapVoltage: number;
  wireTension: number;
  flushingPressure: number;
  pulseOnTime: number;
  pulseOffTime: number;
  wireSpeed: number;
}

export interface WEDMOptimizationObjective {
  type: 'mrr' | 'surface_quality' | 'wire_consumption' | 'energy' | 'multi';
  weights?: {
    mrr?: number;          // Material removal rate (maximize)
    surfaceRa?: number;    // Surface roughness (minimize)
    wireConsumption?: number; // Wire usage (minimize)
    energyConsumption?: number; // Energy (minimize)
  };
  constraints?: {
    maxRa?: number;        // Maximum surface roughness Ra (μm)
    minMRR?: number;       // Minimum MRR (mm³/min)
    maxWireBreakRisk?: number; // Max wire break probability (0-1)
  };
}

export interface WEDMObservation {
  parameters: WEDMParameterSet;
  outcomes: {
    mrr: number;           // mm³/min
    surfaceRa: number;     // μm
    wireConsumption: number; // m/cut
    energyConsumption: number; // kWh
    wireBreakOccurred: boolean;
  };
  timestamp: string;
  material: string;
  thickness: number;       // mm
}

export interface WEDMOptimizationResult {
  sessionId: string;
  suggestedParameters: WEDMParameterSet;
  expectedImprovement: number;
  uncertainty: {
    gapVoltage: number;
    wireTension: number;
    flushingPressure: number;
    pulseOnTime: number;
    pulseOffTime: number;
    wireSpeed: number;
  };
  predictedOutcomes: {
    mrr: { mean: number; std: number };
    surfaceRa: { mean: number; std: number };
    wireBreakRisk: number;
  };
  explorationRatio: number; // 0-1, how much exploration vs exploitation
  iteration: number;
  convergenceMetric: number; // Lower = more converged
}

interface GPDataPoint {
  x: number[];
  y: number;
}

class GaussianProcessSurrogate {
  private data: GPDataPoint[] = [];
  private lengthScales: number[];
  private signalVariance: number = 1.0;
  private noiseVariance: number = 0.01;
  private dim: number;

  constructor(dim: number) {
    this.dim = dim;
    this.lengthScales = Array(dim).fill(1.0);
  }

  addObservation(x: number[], y: number): void {
    this.data.push({ x: [...x], y });
  }

  private rbfKernel(x1: number[], x2: number[]): number {
    let sum = 0;
    for (let i = 0; i < this.dim; i++) {
      const diff = (x1[i] - x2[i]) / this.lengthScales[i];
      sum += diff * diff;
    }
    return this.signalVariance * Math.exp(-0.5 * sum);
  }

  private computeKernelMatrix(): number[][] {
    const n = this.data.length;
    const K: number[][] = [];
    for (let i = 0; i < n; i++) {
      K[i] = [];
      for (let j = 0; j < n; j++) {
        K[i][j] = this.rbfKernel(this.data[i].x, this.data[j].x);
        if (i === j) K[i][j] += this.noiseVariance;
      }
    }
    return K;
  }

  private choleskyDecompose(A: number[][]): number[][] {
    const n = A.length;
    const L: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        if (i === j) {
          L[i][j] = Math.sqrt(Math.max(A[i][i] - sum, 1e-10));
        } else {
          L[i][j] = (A[i][j] - sum) / L[j][j];
        }
      }
    }
    return L;
  }

  private solveTriangular(L: number[][], b: number[], lower: boolean): number[] {
    const n = L.length;
    const x = Array(n).fill(0);

    if (lower) {
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < i; j++) {
          sum += L[i][j] * x[j];
        }
        x[i] = (b[i] - sum) / L[i][i];
      }
    } else {
      for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
          sum += L[j][i] * x[j];
        }
        x[i] = (b[i] - sum) / L[i][i];
      }
    }
    return x;
  }

  predict(x: number[]): { mean: number; variance: number } {
    if (this.data.length === 0) {
      return { mean: 0, variance: this.signalVariance };
    }

    const K = this.computeKernelMatrix();
    const L = this.choleskyDecompose(K);

    const kStar: number[] = this.data.map(d => this.rbfKernel(x, d.x));
    const y = this.data.map(d => d.y);

    const alpha = this.solveTriangular(L, y, true);
    const alphaFinal = this.solveTriangular(L, alpha, false);

    let mean = 0;
    for (let i = 0; i < this.data.length; i++) {
      mean += kStar[i] * alphaFinal[i];
    }

    const v = this.solveTriangular(L, kStar, true);
    let variance = this.rbfKernel(x, x);
    for (let i = 0; i < v.length; i++) {
      variance -= v[i] * v[i];
    }
    variance = Math.max(variance, 1e-10);

    return { mean, variance };
  }

  updateHyperparameters(observations: GPDataPoint[]): void {
    if (observations.length < 5) return;

    // Simple empirical Bayes: set length scales based on data range
    const ranges = Array(this.dim).fill(0).map((_, d) => {
      const vals = observations.map(o => o.x[d]);
      return Math.max(...vals) - Math.min(...vals);
    });

    this.lengthScales = ranges.map(r => Math.max(r / 3, 0.1));

    const yVals = observations.map(o => o.y);
    const yMean = yVals.reduce((a, b) => a + b, 0) / yVals.length;
    const yVar = yVals.reduce((a, b) => a + (b - yMean) ** 2, 0) / yVals.length;
    this.signalVariance = Math.max(yVar, 0.1);
  }
}

export class WEDMMLParameterOptimizerEngine {
  private sessions: Map<string, {
    bounds: WEDMParameterBounds;
    objective: WEDMOptimizationObjective;
    observations: WEDMObservation[];
    gp: GaussianProcessSurrogate;
    iteration: number;
    material: string;
    thickness: number;
  }> = new Map();

  private readonly DEFAULT_BOUNDS: WEDMParameterBounds = {
    gapVoltage: { min: 40, max: 80 },
    wireTension: { min: 5, max: 25 },
    flushingPressure: { min: 0.5, max: 2.0 },
    pulseOnTime: { min: 1, max: 50 },
    pulseOffTime: { min: 5, max: 100 },
    wireSpeed: { min: 5, max: 15 }
  };

  initializeOptimization(params: {
    material: string;
    thickness: number;
    objective: WEDMOptimizationObjective;
    bounds?: Partial<WEDMParameterBounds>;
    priorObservations?: WEDMObservation[];
  }): { sessionId: string; initialSuggestion: WEDMOptimizationResult } {
    const sessionId = uuidv4();
    const bounds = { ...this.DEFAULT_BOUNDS, ...params.bounds };

    const gp = new GaussianProcessSurrogate(6); // 6 parameters
    const observations: WEDMObservation[] = params.priorObservations || [];

    // Add prior observations to GP
    for (const obs of observations) {
      const x = this.parametersToVector(obs.parameters, bounds);
      const y = this.computeObjective(obs.outcomes, params.objective);
      gp.addObservation(x, y);
    }

    this.sessions.set(sessionId, {
      bounds,
      objective: params.objective,
      observations,
      gp,
      iteration: 0,
      material: params.material,
      thickness: params.thickness
    });

    const initialSuggestion = this.suggestNextParameters(sessionId);
    return { sessionId, initialSuggestion };
  }

  addObservation(sessionId: string, observation: WEDMObservation): WEDMOptimizationResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.observations.push(observation);
    const x = this.parametersToVector(observation.parameters, session.bounds);
    const y = this.computeObjective(observation.outcomes, session.objective);
    session.gp.addObservation(x, y);

    // Update hyperparameters periodically
    if (session.observations.length % 5 === 0) {
      const gpData = session.observations.map(obs => ({
        x: this.parametersToVector(obs.parameters, session.bounds),
        y: this.computeObjective(obs.outcomes, session.objective)
      }));
      session.gp.updateHyperparameters(gpData);
    }

    return this.suggestNextParameters(sessionId);
  }

  suggestNextParameters(sessionId: string): WEDMOptimizationResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.iteration++;
    const { bounds, gp, iteration, objective } = session;

    // Compute exploration ratio (more exploration early, more exploitation later)
    const explorationRatio = Math.max(0.1, 1 - iteration / 50);

    // Find best point using Expected Improvement
    const bestParams = this.optimizeAcquisition(gp, bounds, explorationRatio);
    const prediction = gp.predict(this.parametersToVector(bestParams, bounds));

    // Estimate outcomes
    const predictedOutcomes = this.estimateOutcomes(bestParams, session.material, session.thickness);

    // Compute convergence metric
    const convergence = this.computeConvergence(session.observations, objective);

    // Compute parameter uncertainties
    const uncertainty = this.estimateParameterUncertainty(gp, bestParams, bounds);

    return {
      sessionId,
      suggestedParameters: bestParams,
      expectedImprovement: Math.sqrt(prediction.variance) * explorationRatio,
      uncertainty,
      predictedOutcomes,
      explorationRatio,
      iteration,
      convergenceMetric: convergence
    };
  }

  private parametersToVector(params: WEDMParameterSet, bounds: WEDMParameterBounds): number[] {
    return [
      (params.gapVoltage - bounds.gapVoltage.min) / (bounds.gapVoltage.max - bounds.gapVoltage.min),
      (params.wireTension - bounds.wireTension.min) / (bounds.wireTension.max - bounds.wireTension.min),
      (params.flushingPressure - bounds.flushingPressure.min) / (bounds.flushingPressure.max - bounds.flushingPressure.min),
      (params.pulseOnTime - bounds.pulseOnTime.min) / (bounds.pulseOnTime.max - bounds.pulseOnTime.min),
      (params.pulseOffTime - bounds.pulseOffTime.min) / (bounds.pulseOffTime.max - bounds.pulseOffTime.min),
      (params.wireSpeed - bounds.wireSpeed.min) / (bounds.wireSpeed.max - bounds.wireSpeed.min)
    ];
  }

  private vectorToParameters(vec: number[], bounds: WEDMParameterBounds): WEDMParameterSet {
    return {
      gapVoltage: bounds.gapVoltage.min + vec[0] * (bounds.gapVoltage.max - bounds.gapVoltage.min),
      wireTension: bounds.wireTension.min + vec[1] * (bounds.wireTension.max - bounds.wireTension.min),
      flushingPressure: bounds.flushingPressure.min + vec[2] * (bounds.flushingPressure.max - bounds.flushingPressure.min),
      pulseOnTime: bounds.pulseOnTime.min + vec[3] * (bounds.pulseOnTime.max - bounds.pulseOnTime.min),
      pulseOffTime: bounds.pulseOffTime.min + vec[4] * (bounds.pulseOffTime.max - bounds.pulseOffTime.min),
      wireSpeed: bounds.wireSpeed.min + vec[5] * (bounds.wireSpeed.max - bounds.wireSpeed.min)
    };
  }

  private computeObjective(outcomes: WEDMObservation['outcomes'], objective: WEDMOptimizationObjective): number {
    if (outcomes.wireBreakOccurred) {
      return -1000; // Heavy penalty for wire break
    }

    switch (objective.type) {
      case 'mrr':
        return outcomes.mrr;
      case 'surface_quality':
        return -outcomes.surfaceRa; // Minimize Ra
      case 'wire_consumption':
        return -outcomes.wireConsumption;
      case 'energy':
        return -outcomes.energyConsumption;
      case 'multi': {
        const w = objective.weights || { mrr: 0.4, surfaceRa: 0.3, wireConsumption: 0.15, energyConsumption: 0.15 };
        let score = 0;
        if (w.mrr) score += w.mrr * (outcomes.mrr / 50); // Normalize MRR
        if (w.surfaceRa) score -= w.surfaceRa * (outcomes.surfaceRa / 5); // Normalize Ra
        if (w.wireConsumption) score -= w.wireConsumption * (outcomes.wireConsumption / 100);
        if (w.energyConsumption) score -= w.energyConsumption * (outcomes.energyConsumption / 10);

        // Apply constraints
        if (objective.constraints) {
          if (objective.constraints.maxRa && outcomes.surfaceRa > objective.constraints.maxRa) {
            score -= 10 * (outcomes.surfaceRa - objective.constraints.maxRa);
          }
          if (objective.constraints.minMRR && outcomes.mrr < objective.constraints.minMRR) {
            score -= 10 * (objective.constraints.minMRR - outcomes.mrr);
          }
        }
        return score;
      }
      default:
        return outcomes.mrr;
    }
  }

  private optimizeAcquisition(gp: GaussianProcessSurrogate, bounds: WEDMParameterBounds, explorationRatio: number): WEDMParameterSet {
    let bestEI = -Infinity;
    let bestVec: number[] = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];

    // Find current best
    let yBest = -Infinity;
    // Using Latin Hypercube-like sampling for better coverage
    const nSamples = 100;

    for (let i = 0; i < nSamples; i++) {
      const vec = Array(6).fill(0).map(() => Math.random());
      const pred = gp.predict(vec);

      // Expected Improvement with exploration bonus
      const z = pred.mean - yBest;
      const sigma = Math.sqrt(pred.variance);
      const ei = sigma > 0
        ? z * this.normalCDF(z / sigma) + sigma * this.normalPDF(z / sigma) + explorationRatio * sigma
        : (z > 0 ? z : 0);

      if (ei > bestEI) {
        bestEI = ei;
        bestVec = vec;
      }

      if (pred.mean > yBest) {
        yBest = pred.mean;
      }
    }

    // Local optimization around best point
    for (let i = 0; i < 50; i++) {
      const perturbedVec = bestVec.map(v => Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.1)));
      const pred = gp.predict(perturbedVec);
      const z = pred.mean - yBest;
      const sigma = Math.sqrt(pred.variance);
      const ei = sigma > 0
        ? z * this.normalCDF(z / sigma) + sigma * this.normalPDF(z / sigma) + explorationRatio * sigma
        : (z > 0 ? z : 0);

      if (ei > bestEI) {
        bestEI = ei;
        bestVec = perturbedVec;
      }
    }

    return this.vectorToParameters(bestVec, bounds);
  }

  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }

  private estimateOutcomes(params: WEDMParameterSet, material: string, thickness: number): WEDMOptimizationResult['predictedOutcomes'] {
    // Physics-based estimates with material/thickness factors
    const materialFactor = this.getMaterialFactor(material);

    // MRR model: MRR = k * (Ton * V) / (Toff * thickness) * materialFactor
    const mrrBase = (params.pulseOnTime * params.gapVoltage) / (params.pulseOffTime * thickness) * materialFactor;
    const mrrMean = mrrBase * 0.8; // Efficiency factor
    const mrrStd = mrrMean * 0.15;

    // Surface roughness model: Ra = f(Ton, energy)
    const energy = params.pulseOnTime * params.gapVoltage;
    const raMean = 0.5 + 0.1 * Math.sqrt(energy / 100);
    const raStd = raMean * 0.1;

    // Wire break risk model
    const tensionRatio = params.wireTension / 25;
    const energyRatio = energy / (50 * 80);
    const wireBreakRisk = Math.min(0.95, 0.01 + 0.3 * tensionRatio + 0.4 * energyRatio);

    return {
      mrr: { mean: mrrMean, std: mrrStd },
      surfaceRa: { mean: raMean, std: raStd },
      wireBreakRisk
    };
  }

  private getMaterialFactor(material: string): number {
    const factors: Record<string, number> = {
      'steel': 1.0,
      'aluminum': 1.8,
      'copper': 1.5,
      'titanium': 0.6,
      'carbide': 0.3,
      'inconel': 0.4,
      'stainless': 0.8
    };
    const key = Object.keys(factors).find(k => material.toLowerCase().includes(k));
    return key ? factors[key] : 1.0;
  }

  private computeConvergence(observations: WEDMObservation[], objective: WEDMOptimizationObjective): number {
    if (observations.length < 3) return 1.0;

    const lastN = observations.slice(-5);
    const objectives = lastN.map(o => this.computeObjective(o.outcomes, objective));

    const mean = objectives.reduce((a, b) => a + b, 0) / objectives.length;
    const variance = objectives.reduce((a, b) => a + (b - mean) ** 2, 0) / objectives.length;

    return Math.sqrt(variance) / (Math.abs(mean) + 1);
  }

  private estimateParameterUncertainty(
    gp: GaussianProcessSurrogate,
    params: WEDMParameterSet,
    bounds: WEDMParameterBounds
  ): WEDMOptimizationResult['uncertainty'] {
    const baseVec = this.parametersToVector(params, bounds);
    const basePred = gp.predict(baseVec);

    const perturbations = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
    const uncertainties: number[] = [];

    for (let i = 0; i < 6; i++) {
      const perturbedVec = [...baseVec];
      perturbedVec[i] = Math.min(1, baseVec[i] + perturbations[i]);
      const perturbedPred = gp.predict(perturbedVec);
      uncertainties.push(Math.abs(perturbedPred.mean - basePred.mean) + Math.sqrt(perturbedPred.variance));
    }

    return {
      gapVoltage: uncertainties[0] * (bounds.gapVoltage.max - bounds.gapVoltage.min),
      wireTension: uncertainties[1] * (bounds.wireTension.max - bounds.wireTension.min),
      flushingPressure: uncertainties[2] * (bounds.flushingPressure.max - bounds.flushingPressure.min),
      pulseOnTime: uncertainties[3] * (bounds.pulseOnTime.max - bounds.pulseOnTime.min),
      pulseOffTime: uncertainties[4] * (bounds.pulseOffTime.max - bounds.pulseOffTime.min),
      wireSpeed: uncertainties[5] * (bounds.wireSpeed.max - bounds.wireSpeed.min)
    };
  }

  getSessionStatus(sessionId: string): {
    iteration: number;
    observationCount: number;
    bestObservation: WEDMObservation | null;
    convergenceMetric: number;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    let bestObservation: WEDMObservation | null = null;
    let bestScore = -Infinity;

    for (const obs of session.observations) {
      const score = this.computeObjective(obs.outcomes, session.objective);
      if (score > bestScore) {
        bestScore = score;
        bestObservation = obs;
      }
    }

    return {
      iteration: session.iteration,
      observationCount: session.observations.length,
      bestObservation,
      convergenceMetric: this.computeConvergence(session.observations, session.objective)
    };
  }

  closeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

export const wedmMLParameterOptimizerEngine = new WEDMMLParameterOptimizerEngine();
