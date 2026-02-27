/**
 * PRISM Algorithm Module — Barrel Export
 *
 * All 36 standalone manufacturing physics & general-purpose algorithms, each implementing
 * Algorithm<I, O> with typed validation, calculation, and metadata.
 *
 * Usage:
 * ```ts
 * import { KienzleForceModel, ExtendedTaylorModel } from "./algorithms/index.js";
 *
 * const kienzle = new KienzleForceModel();
 * const result = kienzle.validate(input);
 * if (result.valid) {
 *   const output = kienzle.calculate(input);
 * }
 * ```
 *
 * @module algorithms
 */

// ── Types ───────────────────────────────────────────────────────────

export type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
  UncertaintyBand,
} from "./types.js";

// ── Local imports for registry use ──────────────────────────────────

import { KienzleForceModel } from "./KienzleForceModel.js";
import { ExtendedTaylorModel } from "./ExtendedTaylorModel.js";
import { StabilityLobeDiagram } from "./StabilityLobeDiagram.js";
import { JohnsonCookModel } from "./JohnsonCookModel.js";
import { SurfaceFinishPredictor } from "./SurfaceFinishPredictor.js";
import { ChipThinningCompensation } from "./ChipThinningCompensation.js";
import { ThermalPartitionModel } from "./ThermalPartitionModel.js";
import { GilbertMRRModel } from "./GilbertMRRModel.js";
import { ToolDeflectionModel } from "./ToolDeflectionModel.js";
import { ChipBreakingModel } from "./ChipBreakingModel.js";
import { CoolantFlowModel } from "./CoolantFlowModel.js";
import { ToolWearPrediction } from "./ToolWearPrediction.js";
import { SpindleVibFFTModel } from "./SpindleVibFFTModel.js";
import { ChipEvacuationModel } from "./ChipEvacuationModel.js";
import { ThermalFEAModel } from "./ThermalFEAModel.js";
import { BayesianWearModel } from "./BayesianWearModel.js";
import { EnsemblePredictorModel } from "./EnsemblePredictorModel.js";
import { AdaptiveControllerModel } from "./AdaptiveControllerModel.js";
// L1-P1-MS1: 18 new general-purpose algorithms
import { GeneticOptimizer } from "./GeneticOptimizer.js";
import { SimulatedAnnealing } from "./SimulatedAnnealing.js";
import { ParticleSwarm } from "./ParticleSwarm.js";
import { MonteCarlo } from "./MonteCarlo.js";
import { NeuralInference } from "./NeuralInference.js";
import { BayesianOptimizer } from "./BayesianOptimizer.js";
import { FuzzyController } from "./FuzzyController.js";
import { DigitalTwinEstimator } from "./DigitalTwinEstimator.js";
import { TimeSeriesPredictor } from "./TimeSeriesPredictor.js";
import { AnomalyDetector } from "./AnomalyDetector.js";
import { ClusteringEngine } from "./ClusteringEngine.js";
import { DecisionTreeClassifier } from "./DecisionTreeClassifier.js";
import { RegressionEngine } from "./RegressionEngine.js";
import { InterpolationEngine } from "./InterpolationEngine.js";
import { KalmanFilter } from "./KalmanFilter.js";
import { PIDController } from "./PIDController.js";
import { FEASolver2D } from "./FEASolver2D.js";
import { FFTAnalyzer } from "./FFTAnalyzer.js";

// ── Safety-Critical Algorithms (Opus-reviewed) ──────────────────────

export { KienzleForceModel } from "./KienzleForceModel.js";
export type { KienzleInput, KienzleOutput } from "./KienzleForceModel.js";

export { ExtendedTaylorModel } from "./ExtendedTaylorModel.js";
export type { TaylorInput, TaylorOutput } from "./ExtendedTaylorModel.js";

export { StabilityLobeDiagram } from "./StabilityLobeDiagram.js";
export type { StabilityLobeInput, StabilityLobeOutput, StabilityLobe, SweetSpot } from "./StabilityLobeDiagram.js";

// ── Standard Algorithms ─────────────────────────────────────────────

export { JohnsonCookModel } from "./JohnsonCookModel.js";
export type { JohnsonCookInput, JohnsonCookOutput } from "./JohnsonCookModel.js";

export { SurfaceFinishPredictor } from "./SurfaceFinishPredictor.js";
export type { SurfaceFinishInput, SurfaceFinishOutput } from "./SurfaceFinishPredictor.js";

export { ChipThinningCompensation } from "./ChipThinningCompensation.js";
export type { ChipThinningInput, ChipThinningOutput } from "./ChipThinningCompensation.js";

export { ThermalPartitionModel } from "./ThermalPartitionModel.js";
export type { ThermalInput, ThermalOutput } from "./ThermalPartitionModel.js";

// ── L1-P0-MS1: Ported Monolith Algorithms ───────────────────────────

export { GilbertMRRModel } from "./GilbertMRRModel.js";
export type { GilbertMRRInput, GilbertMRROutput } from "./GilbertMRRModel.js";

export { ToolDeflectionModel } from "./ToolDeflectionModel.js";
export type { ToolDeflectionInput, ToolDeflectionOutput } from "./ToolDeflectionModel.js";

export { ChipBreakingModel } from "./ChipBreakingModel.js";
export type { ChipBreakingInput, ChipBreakingOutput } from "./ChipBreakingModel.js";

export { CoolantFlowModel } from "./CoolantFlowModel.js";
export type { CoolantFlowInput, CoolantFlowOutput } from "./CoolantFlowModel.js";

export { ToolWearPrediction } from "./ToolWearPrediction.js";
export type { TWPInput, TWPOutput } from "./ToolWearPrediction.js";

export { SpindleVibFFTModel } from "./SpindleVibFFTModel.js";
export type { SpindleVibFFTInput, SpindleVibFFTOutput } from "./SpindleVibFFTModel.js";

export { ChipEvacuationModel } from "./ChipEvacuationModel.js";
export type { ChipEvacuationInput, ChipEvacuationOutput } from "./ChipEvacuationModel.js";

export { ThermalFEAModel } from "./ThermalFEAModel.js";
export type { ThermalFEAInput, ThermalFEAOutput } from "./ThermalFEAModel.js";

export { BayesianWearModel } from "./BayesianWearModel.js";
export type { BayesianWearInput, BayesianWearOutput } from "./BayesianWearModel.js";

export { EnsemblePredictorModel } from "./EnsemblePredictorModel.js";
export type { EnsemblePredictorInput, EnsemblePredictorOutput } from "./EnsemblePredictorModel.js";

export { AdaptiveControllerModel } from "./AdaptiveControllerModel.js";
export type { AdaptiveControllerInput, AdaptiveControllerOutput } from "./AdaptiveControllerModel.js";

// ── L1-P1-MS1: General-Purpose Algorithms ────────────────────────────

export { GeneticOptimizer } from "./GeneticOptimizer.js";
export type { GeneticOptimizerInput, GeneticOptimizerOutput } from "./GeneticOptimizer.js";

export { SimulatedAnnealing } from "./SimulatedAnnealing.js";
export type { SimulatedAnnealingInput, SimulatedAnnealingOutput } from "./SimulatedAnnealing.js";

export { ParticleSwarm } from "./ParticleSwarm.js";
export type { ParticleSwarmInput, ParticleSwarmOutput } from "./ParticleSwarm.js";

export { MonteCarlo } from "./MonteCarlo.js";
export type { MonteCarloInput, MonteCarloOutput } from "./MonteCarlo.js";

export { NeuralInference } from "./NeuralInference.js";
export type { NeuralInferenceInput, NeuralInferenceOutput } from "./NeuralInference.js";

export { BayesianOptimizer } from "./BayesianOptimizer.js";
export type { BayesianOptimizerInput, BayesianOptimizerOutput } from "./BayesianOptimizer.js";

export { FuzzyController } from "./FuzzyController.js";
export type { FuzzyControllerInput, FuzzyControllerOutput } from "./FuzzyController.js";

export { DigitalTwinEstimator } from "./DigitalTwinEstimator.js";
export type { DigitalTwinEstimatorInput, DigitalTwinEstimatorOutput } from "./DigitalTwinEstimator.js";

export { TimeSeriesPredictor } from "./TimeSeriesPredictor.js";
export type { TimeSeriesPredictorInput, TimeSeriesPredictorOutput } from "./TimeSeriesPredictor.js";

export { AnomalyDetector } from "./AnomalyDetector.js";
export type { AnomalyDetectorInput, AnomalyDetectorOutput } from "./AnomalyDetector.js";

export { ClusteringEngine } from "./ClusteringEngine.js";
export type { ClusteringEngineInput, ClusteringEngineOutput } from "./ClusteringEngine.js";

export { DecisionTreeClassifier } from "./DecisionTreeClassifier.js";
export type { DecisionTreeClassifierInput, DecisionTreeClassifierOutput } from "./DecisionTreeClassifier.js";

export { RegressionEngine } from "./RegressionEngine.js";
export type { RegressionEngineInput, RegressionEngineOutput } from "./RegressionEngine.js";

export { InterpolationEngine } from "./InterpolationEngine.js";
export type { InterpolationEngineInput, InterpolationEngineOutput } from "./InterpolationEngine.js";

export { KalmanFilter } from "./KalmanFilter.js";
export type { KalmanFilterInput, KalmanFilterOutput } from "./KalmanFilter.js";

export { PIDController } from "./PIDController.js";
export type { PIDControllerInput, PIDControllerOutput } from "./PIDController.js";

export { FEASolver2D } from "./FEASolver2D.js";
export type { FEASolver2DInput, FEASolver2DOutput } from "./FEASolver2D.js";

export { FFTAnalyzer } from "./FFTAnalyzer.js";
export type { FFTAnalyzerInput, FFTAnalyzerOutput } from "./FFTAnalyzer.js";

// ── Algorithm Registry ──────────────────────────────────────────────

/**
 * All 36 algorithm classes, indexed by their metadata ID.
 * Useful for dynamic dispatch and introspection.
 */
export const ALGORITHM_REGISTRY = {
  // Original 7
  "kienzle": KienzleForceModel,
  "taylor": ExtendedTaylorModel,
  "johnson-cook": JohnsonCookModel,
  "surface-finish": SurfaceFinishPredictor,
  "stability-lobe": StabilityLobeDiagram,
  "chip-thinning": ChipThinningCompensation,
  "thermal-power": ThermalPartitionModel,
  // L1-P0-MS1: 11 ported monolith algorithms
  "gilbert-mrr": GilbertMRRModel,
  "tool-deflection": ToolDeflectionModel,
  "chip-breaking": ChipBreakingModel,
  "coolant-flow": CoolantFlowModel,
  "tool-wear-prediction": ToolWearPrediction,
  "spindle-vib-fft": SpindleVibFFTModel,
  "chip-evacuation": ChipEvacuationModel,
  "thermal-fea": ThermalFEAModel,
  "bayesian-wear": BayesianWearModel,
  "ensemble-predictor": EnsemblePredictorModel,
  "adaptive-controller": AdaptiveControllerModel,
  // L1-P1-MS1: 18 new general-purpose algorithms
  "genetic-optimizer": GeneticOptimizer,
  "simulated-annealing": SimulatedAnnealing,
  "particle-swarm": ParticleSwarm,
  "monte-carlo": MonteCarlo,
  "neural-inference": NeuralInference,
  "bayesian-optimizer": BayesianOptimizer,
  "fuzzy-controller": FuzzyController,
  "digital-twin-estimator": DigitalTwinEstimator,
  "time-series-predictor": TimeSeriesPredictor,
  "anomaly-detector": AnomalyDetector,
  "clustering-engine": ClusteringEngine,
  "decision-tree-classifier": DecisionTreeClassifier,
  "regression-engine": RegressionEngine,
  "interpolation-engine": InterpolationEngine,
  "kalman-filter": KalmanFilter,
  "pid-controller": PIDController,
  "fea-solver-2d": FEASolver2D,
  "fft-analyzer": FFTAnalyzer,
} as const;

export type AlgorithmId = keyof typeof ALGORITHM_REGISTRY;

/**
 * Create an algorithm instance by ID.
 * Returns null if ID is not found.
 */
export function createAlgorithm(id: string): InstanceType<typeof ALGORITHM_REGISTRY[AlgorithmId]> | null {
  const Cls = ALGORITHM_REGISTRY[id as AlgorithmId];
  if (!Cls) return null;
  return new Cls() as any;
}

/**
 * List all available algorithm IDs.
 */
export function listAlgorithms(): AlgorithmId[] {
  return Object.keys(ALGORITHM_REGISTRY) as AlgorithmId[];
}
