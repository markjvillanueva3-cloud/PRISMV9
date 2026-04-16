/**
 * PRISM Manufacturing Physics Algorithms
 *
 * Standalone algorithm implementations following the Algorithm<I,O> interface.
 * All algorithms are re-exported from this index for convenient importing.
 *
 * MS-WIRE-2: Algorithm Wiring — 51 algorithms wired to ALGORITHM_REGISTRY
 *
 * Categories:
 * - Signal Processing (4): FFT, Wavelet, STFT, SpindleVib
 * - Control (4): Kalman, PID, Fuzzy, Adaptive
 * - Optimization (5): Genetic, ParticleSwarm, SimulatedAnnealing, Bayesian, AntColony
 * - Manufacturing Physics (16): Kienzle, Taylor, JohnsonCook, SurfaceFinish, etc.
 * - ML/Inference (8): Neural, DecisionTree, Clustering, Regression, etc.
 * - Geometry/Math (4): Minkowski, Interpolation, SweptVolume, CWEZ
 * - Thermal (2): ThermalFEA, JaegerTemp
 * - FEA/Structural (2): FEA2D, RCSA
 * - Wear (2): Usui, BayesianWear
 * - Planning (3): CSPSetup, DPMultiPass, ILPAssignment
 * - Stochastic (1): MonteCarlo
 *
 * @module algorithms
 */

import type { Algorithm, AlgorithmInput, AlgorithmOutput } from "./types.js";

// ─── Types ─────────────────────────────────────────────────────────

export * from "./types.js";

// ═══════════════════════════════════════════════════════════════════
// SIGNAL PROCESSING ALGORITHMS (4)
// ═══════════════════════════════════════════════════════════════════

export { FFTAnalyzer } from "./FFTAnalyzer.js";
export type { FFTAnalyzerInput, FFTAnalyzerOutput } from "./FFTAnalyzer.js";

export { WaveletBreakage } from "./WaveletBreakage.js";
export type { WaveletBreakageInput, WaveletBreakageOutput } from "./WaveletBreakage.js";

export { STFTChatter } from "./STFTChatter.js";
export type { STFTChatterInput, STFTChatterOutput } from "./STFTChatter.js";

export { SpindleVibFFTModel } from "./SpindleVibFFTModel.js";
export type { SpindleVibFFTInput, SpindleVibFFTOutput } from "./SpindleVibFFTModel.js";

// ═══════════════════════════════════════════════════════════════════
// CONTROL ALGORITHMS (4)
// ═══════════════════════════════════════════════════════════════════

export { KalmanFilter } from "./KalmanFilter.js";
export type { KalmanFilterInput, KalmanFilterOutput } from "./KalmanFilter.js";

export { PIDController } from "./PIDController.js";
export type { PIDInput, PIDOutput } from "./PIDController.js";

export { FuzzyController } from "./FuzzyController.js";
export type { FuzzyControllerInput, FuzzyControllerOutput } from "./FuzzyController.js";

export { AdaptiveControllerModel } from "./AdaptiveControllerModel.js";
export type { AdaptiveControllerInput, AdaptiveControllerOutput } from "./AdaptiveControllerModel.js";

// ═══════════════════════════════════════════════════════════════════
// OPTIMIZATION ALGORITHMS (5)
// ═══════════════════════════════════════════════════════════════════

export { GeneticOptimizer } from "./GeneticOptimizer.js";
export type { GeneticOptimizerInput, GeneticOptimizerOutput } from "./GeneticOptimizer.js";

export { ParticleSwarm } from "./ParticleSwarm.js";
export type { ParticleSwarmInput, ParticleSwarmOutput } from "./ParticleSwarm.js";

export { SimulatedAnnealing } from "./SimulatedAnnealing.js";
export type { SimulatedAnnealingInput, SimulatedAnnealingOutput } from "./SimulatedAnnealing.js";

export { BayesianOptimizer } from "./BayesianOptimizer.js";
export type { BayesianOptimizerInput, BayesianOptimizerOutput } from "./BayesianOptimizer.js";

export { AntColonyTSP } from "./AntColonyTSP.js";
export type { AntColonyInput, AntColonyOutput } from "./AntColonyTSP.js";

// ═══════════════════════════════════════════════════════════════════
// MANUFACTURING PHYSICS ALGORITHMS (16)
// ═══════════════════════════════════════════════════════════════════

export { KienzleForceModel } from "./KienzleForceModel.js";
export type { KienzleInput, KienzleOutput } from "./KienzleForceModel.js";

export { ExtendedTaylorModel } from "./ExtendedTaylorModel.js";
export type { TaylorInput, TaylorOutput } from "./ExtendedTaylorModel.js";

export { JohnsonCookModel } from "./JohnsonCookModel.js";
export type { JohnsonCookInput, JohnsonCookOutput, JCParams } from "./JohnsonCookModel.js";

export { SurfaceFinishPredictor } from "./SurfaceFinishPredictor.js";
export type { SurfaceFinishInput, SurfaceFinishOutput } from "./SurfaceFinishPredictor.js";

export { StabilityLobeDiagram } from "./StabilityLobeDiagram.js";
export type { StabilityLobeInput, StabilityLobeOutput } from "./StabilityLobeDiagram.js";

export { ChipThinningCompensation } from "./ChipThinningCompensation.js";
export type { ChipThinningInput, ChipThinningOutput } from "./ChipThinningCompensation.js";

export { ThermalPartitionModel } from "./ThermalPartitionModel.js";
export type { ThermalPartitionInput, ThermalPartitionOutput } from "./ThermalPartitionModel.js";

export { PowerTorqueCalc } from "./PowerTorqueCalc.js";
export type { PowerTorqueInput, PowerTorqueOutput } from "./PowerTorqueCalc.js";

export { ToolDeflectionModel } from "./ToolDeflectionModel.js";
export type { ToolDeflectionModelInput, ToolDeflectionModelOutput } from "./ToolDeflectionModel.js";

export { ToolWearPrediction } from "./ToolWearPrediction.js";
export type { ToolWearPredictionInput, ToolWearPredictionOutput } from "./ToolWearPrediction.js";

export { ChipBreakingModel } from "./ChipBreakingModel.js";
export type { ChipBreakingInput, ChipBreakingOutput } from "./ChipBreakingModel.js";

export { ChipEvacuationModel } from "./ChipEvacuationModel.js";
export type { ChipEvacuationInput, ChipEvacuationOutput } from "./ChipEvacuationModel.js";

export { ChipVolumeRate } from "./ChipVolumeRate.js";
export type { ChipVolumeRateInput, ChipVolumeRateOutput } from "./ChipVolumeRate.js";

export { GilbertMRRModel } from "./GilbertMRRModel.js";
export type { GilbertMRRInput, GilbertMRROutput } from "./GilbertMRRModel.js";

export { FRFStabilityLobe } from "./FRFStabilityLobe.js";
export type { FRFStabilityLobeInput, FRFStabilityLobeOutput } from "./FRFStabilityLobe.js";

export { CoolantFlowModel } from "./CoolantFlowModel.js";
export type { CoolantFlowInput, CoolantFlowOutput } from "./CoolantFlowModel.js";

// ═══════════════════════════════════════════════════════════════════
// ML/INFERENCE ALGORITHMS (8)
// ═══════════════════════════════════════════════════════════════════

export { NeuralInference } from "./NeuralInference.js";
export type { NeuralInferenceInput, NeuralInferenceOutput } from "./NeuralInference.js";

export { DecisionTreeClassifier } from "./DecisionTreeClassifier.js";
export type { DecisionTreeInput, DecisionTreeOutput } from "./DecisionTreeClassifier.js";

export { ClusteringEngine } from "./ClusteringEngine.js";
export type { ClusteringInput, ClusteringOutput } from "./ClusteringEngine.js";

export { RegressionEngine } from "./RegressionEngine.js";
export type { RegressionInput, RegressionOutput } from "./RegressionEngine.js";

export { AnomalyDetector } from "./AnomalyDetector.js";
export type { AnomalyDetectorInput, AnomalyDetectorOutput } from "./AnomalyDetector.js";

export { TimeSeriesPredictor } from "./TimeSeriesPredictor.js";
export type { TimeSeriesPredictorInput, TimeSeriesPredictorOutput } from "./TimeSeriesPredictor.js";

export { EnsemblePredictorModel } from "./EnsemblePredictorModel.js";
export type { EnsemblePredictorInput, EnsemblePredictorOutput } from "./EnsemblePredictorModel.js";

export { BayesianWearModel } from "./BayesianWearModel.js";
export type { BayesianWearInput, BayesianWearOutput } from "./BayesianWearModel.js";

// ═══════════════════════════════════════════════════════════════════
// GEOMETRY/MATH ALGORITHMS (4)
// ═══════════════════════════════════════════════════════════════════

export { MinkowskiSum } from "./MinkowskiSum.js";
export type { MinkowskiSumInput, MinkowskiSumOutput } from "./MinkowskiSum.js";

export { InterpolationEngine } from "./InterpolationEngine.js";
export type { InterpolationInput, InterpolationOutput } from "./InterpolationEngine.js";

export { SweptVolumeCollision } from "./SweptVolumeCollision.js";
export type { SweptVolumeInput, SweptVolumeOutput } from "./SweptVolumeCollision.js";

export { CWEZBuffer } from "./CWEZBuffer.js";
export type { CWEZBufferInput, CWEZBufferOutput } from "./CWEZBuffer.js";

// ═══════════════════════════════════════════════════════════════════
// THERMAL ALGORITHMS (2)
// ═══════════════════════════════════════════════════════════════════

export { ThermalFEAModel } from "./ThermalFEAModel.js";
export type { ThermalFEAInput, ThermalFEAOutput } from "./ThermalFEAModel.js";

export { JaegerTempField } from "./JaegerTempField.js";
export type { JaegerTempFieldInput, JaegerTempFieldOutput } from "./JaegerTempField.js";

// ═══════════════════════════════════════════════════════════════════
// FEA/STRUCTURAL ALGORITHMS (2)
// ═══════════════════════════════════════════════════════════════════

export { FEASolver2D } from "./FEASolver2D.js";
export type { FEASolver2DInput, FEASolver2DOutput } from "./FEASolver2D.js";

export { RCSA } from "./RCSA.js";
export type { RCSAInput, RCSAOutput } from "./RCSA.js";

// ═══════════════════════════════════════════════════════════════════
// WEAR ALGORITHMS (2)
// ═══════════════════════════════════════════════════════════════════

export { UsuiWearModel } from "./UsuiWearModel.js";
export type { UsuiWearInput, UsuiWearOutput } from "./UsuiWearModel.js";

// ═══════════════════════════════════════════════════════════════════
// PLANNING ALGORITHMS (3)
// ═══════════════════════════════════════════════════════════════════

export { CSPSetupPlan } from "./CSPSetupPlan.js";
export type { CSPSetupPlanInput, CSPSetupPlanOutput } from "./CSPSetupPlan.js";

export { DPMultiPass } from "./DPMultiPass.js";
export type { DPMultiPassInput, DPMultiPassOutput } from "./DPMultiPass.js";

export { ILPAssignment } from "./ILPAssignment.js";
export type { ILPAssignmentInput, ILPAssignmentOutput } from "./ILPAssignment.js";

// ═══════════════════════════════════════════════════════════════════
// STOCHASTIC ALGORITHMS (1)
// ═══════════════════════════════════════════════════════════════════

export { MonteCarlo } from "./MonteCarlo.js";
export type { MonteCarloInput, MonteCarloOutput } from "./MonteCarlo.js";

// ═══════════════════════════════════════════════════════════════════
// DIGITAL TWIN ALGORITHMS (1)
// ═══════════════════════════════════════════════════════════════════

export { DigitalTwinEstimator } from "./DigitalTwinEstimator.js";
export type { DigitalTwinInput, DigitalTwinOutput } from "./DigitalTwinEstimator.js";

// ═══════════════════════════════════════════════════════════════════
// ALGORITHM REGISTRY — ALL 51 ALGORITHMS
// ═══════════════════════════════════════════════════════════════════

import { FFTAnalyzer } from "./FFTAnalyzer.js";
import { WaveletBreakage } from "./WaveletBreakage.js";
import { STFTChatter } from "./STFTChatter.js";
import { SpindleVibFFTModel } from "./SpindleVibFFTModel.js";
import { KalmanFilter } from "./KalmanFilter.js";
import { PIDController } from "./PIDController.js";
import { FuzzyController } from "./FuzzyController.js";
import { AdaptiveControllerModel } from "./AdaptiveControllerModel.js";
import { GeneticOptimizer } from "./GeneticOptimizer.js";
import { ParticleSwarm } from "./ParticleSwarm.js";
import { SimulatedAnnealing } from "./SimulatedAnnealing.js";
import { BayesianOptimizer } from "./BayesianOptimizer.js";
import { AntColonyTSP } from "./AntColonyTSP.js";
import { KienzleForceModel } from "./KienzleForceModel.js";
import { ExtendedTaylorModel } from "./ExtendedTaylorModel.js";
import { JohnsonCookModel } from "./JohnsonCookModel.js";
import { SurfaceFinishPredictor } from "./SurfaceFinishPredictor.js";
import { StabilityLobeDiagram } from "./StabilityLobeDiagram.js";
import { ChipThinningCompensation } from "./ChipThinningCompensation.js";
import { ThermalPartitionModel } from "./ThermalPartitionModel.js";
import { PowerTorqueCalc } from "./PowerTorqueCalc.js";
import { ToolDeflectionModel } from "./ToolDeflectionModel.js";
import { ToolWearPrediction } from "./ToolWearPrediction.js";
import { ChipBreakingModel } from "./ChipBreakingModel.js";
import { ChipEvacuationModel } from "./ChipEvacuationModel.js";
import { ChipVolumeRate } from "./ChipVolumeRate.js";
import { GilbertMRRModel } from "./GilbertMRRModel.js";
import { FRFStabilityLobe } from "./FRFStabilityLobe.js";
import { CoolantFlowModel } from "./CoolantFlowModel.js";
import { NeuralInference } from "./NeuralInference.js";
import { DecisionTreeClassifier } from "./DecisionTreeClassifier.js";
import { ClusteringEngine } from "./ClusteringEngine.js";
import { RegressionEngine } from "./RegressionEngine.js";
import { AnomalyDetector } from "./AnomalyDetector.js";
import { TimeSeriesPredictor } from "./TimeSeriesPredictor.js";
import { EnsemblePredictorModel } from "./EnsemblePredictorModel.js";
import { BayesianWearModel } from "./BayesianWearModel.js";
import { MinkowskiSum } from "./MinkowskiSum.js";
import { InterpolationEngine } from "./InterpolationEngine.js";
import { SweptVolumeCollision } from "./SweptVolumeCollision.js";
import { CWEZBuffer } from "./CWEZBuffer.js";
import { ThermalFEAModel } from "./ThermalFEAModel.js";
import { JaegerTempField } from "./JaegerTempField.js";
import { FEASolver2D } from "./FEASolver2D.js";
import { RCSA } from "./RCSA.js";
import { UsuiWearModel } from "./UsuiWearModel.js";
import { CSPSetupPlan } from "./CSPSetupPlan.js";
import { DPMultiPass } from "./DPMultiPass.js";
import { ILPAssignment } from "./ILPAssignment.js";
import { MonteCarlo } from "./MonteCarlo.js";
import { DigitalTwinEstimator } from "./DigitalTwinEstimator.js";

/**
 * Algorithm IDs for all 51 manufacturing algorithms.
 *
 * Categories:
 * - Signal Processing: fft, wavelet, stft, spindle_vib_fft
 * - Control: kalman, pid, fuzzy, adaptive_controller
 * - Optimization: genetic, particle_swarm, simulated_annealing, bayesian_opt, ant_colony
 * - Manufacturing Physics: kienzle, taylor, johnson_cook, surface_finish, stability_lobe,
 *   chip_thinning, thermal_partition, power_torque, tool_deflection, tool_wear,
 *   chip_breaking, chip_evacuation, chip_volume_rate, gilbert_mrr, frf_stability, coolant_flow
 * - ML/Inference: neural_inference, decision_tree, clustering, regression,
 *   anomaly_detector, time_series, ensemble_predictor, bayesian_wear
 * - Geometry/Math: minkowski, interpolation, swept_volume, cwez_buffer
 * - Thermal: thermal_fea, jaeger_temp
 * - FEA/Structural: fea_2d, rcsa
 * - Wear: usui_wear
 * - Planning: csp_setup, dp_multipass, ilp_assignment
 * - Stochastic: monte_carlo
 * - Digital Twin: digital_twin
 */
export type AlgorithmId =
  // Signal Processing (4)
  | "fft" | "wavelet" | "stft" | "spindle_vib_fft"
  // Control (4)
  | "kalman" | "pid" | "fuzzy" | "adaptive_controller"
  // Optimization (5)
  | "genetic" | "particle_swarm" | "simulated_annealing" | "bayesian_opt" | "ant_colony"
  // Manufacturing Physics (16)
  | "kienzle" | "taylor" | "johnson_cook" | "surface_finish" | "stability_lobe"
  | "chip_thinning" | "thermal_partition" | "power_torque" | "tool_deflection" | "tool_wear"
  | "chip_breaking" | "chip_evacuation" | "chip_volume_rate" | "gilbert_mrr" | "frf_stability" | "coolant_flow"
  // ML/Inference (8)
  | "neural_inference" | "decision_tree" | "clustering" | "regression"
  | "anomaly_detector" | "time_series" | "ensemble_predictor" | "bayesian_wear"
  // Geometry/Math (4)
  | "minkowski" | "interpolation" | "swept_volume" | "cwez_buffer"
  // Thermal (2)
  | "thermal_fea" | "jaeger_temp"
  // FEA/Structural (2)
  | "fea_2d" | "rcsa"
  // Wear (1)
  | "usui_wear"
  // Planning (3)
  | "csp_setup" | "dp_multipass" | "ilp_assignment"
  // Stochastic (1)
  | "monte_carlo"
  // Digital Twin (1)
  | "digital_twin";

/**
 * Helper to ensure algorithm is an instance (handles both class and singleton exports).
 * Manufacturing physics algorithms (kienzle, taylor, etc.) export singletons.
 * Signal processing/ML algorithms export classes that need instantiation.
 */
function ensureInstance<T>(algo: T | { new(): T }): T {
  // If it has a prototype with calculate method, it's a class - instantiate it
  if (typeof algo === "function" && algo.prototype?.calculate) {
    return new (algo as { new(): T })();
  }
  // Already an instance (singleton pattern)
  return algo as T;
}

/**
 * Registry mapping all 51 algorithm IDs to their implementations.
 * Used by AlgorithmEngine for dynamic dispatch.
 *
 * MS-WIRE-2: Expanded from 8 to 51 algorithms.
 * All entries are instantiated via ensureInstance() to handle both
 * singleton exports and class exports uniformly.
 */
export const ALGORITHM_REGISTRY: Record<AlgorithmId, Algorithm<AlgorithmInput, AlgorithmOutput>> = {
  // Signal Processing (class exports → instantiated)
  fft: ensureInstance(FFTAnalyzer) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  wavelet: ensureInstance(WaveletBreakage) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  stft: ensureInstance(STFTChatter) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  spindle_vib_fft: ensureInstance(SpindleVibFFTModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // Control (class exports → instantiated)
  kalman: ensureInstance(KalmanFilter) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  pid: ensureInstance(PIDController) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  fuzzy: ensureInstance(FuzzyController) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  adaptive_controller: ensureInstance(AdaptiveControllerModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // Optimization (class exports → instantiated)
  genetic: ensureInstance(GeneticOptimizer) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  particle_swarm: ensureInstance(ParticleSwarm) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  simulated_annealing: ensureInstance(SimulatedAnnealing) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  bayesian_opt: ensureInstance(BayesianOptimizer) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  ant_colony: ensureInstance(AntColonyTSP) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // Manufacturing Physics (singleton exports)
  kienzle: KienzleForceModel as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  taylor: ExtendedTaylorModel as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  johnson_cook: JohnsonCookModel as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  surface_finish: SurfaceFinishPredictor as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  stability_lobe: StabilityLobeDiagram as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  chip_thinning: ChipThinningCompensation as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  thermal_partition: ThermalPartitionModel as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  power_torque: PowerTorqueCalc as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  tool_deflection: ensureInstance(ToolDeflectionModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  tool_wear: ensureInstance(ToolWearPrediction) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  chip_breaking: ensureInstance(ChipBreakingModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  chip_evacuation: ensureInstance(ChipEvacuationModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  chip_volume_rate: ensureInstance(ChipVolumeRate) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  gilbert_mrr: ensureInstance(GilbertMRRModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  frf_stability: ensureInstance(FRFStabilityLobe) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  coolant_flow: ensureInstance(CoolantFlowModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // ML/Inference (class exports → instantiated)
  neural_inference: ensureInstance(NeuralInference) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  decision_tree: ensureInstance(DecisionTreeClassifier) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  clustering: ensureInstance(ClusteringEngine) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  regression: ensureInstance(RegressionEngine) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  anomaly_detector: ensureInstance(AnomalyDetector) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  time_series: ensureInstance(TimeSeriesPredictor) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  ensemble_predictor: ensureInstance(EnsemblePredictorModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  bayesian_wear: ensureInstance(BayesianWearModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // Geometry/Math (class exports → instantiated)
  minkowski: ensureInstance(MinkowskiSum) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  interpolation: ensureInstance(InterpolationEngine) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  swept_volume: ensureInstance(SweptVolumeCollision) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  cwez_buffer: ensureInstance(CWEZBuffer) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // Thermal (class exports → instantiated)
  thermal_fea: ensureInstance(ThermalFEAModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  jaeger_temp: ensureInstance(JaegerTempField) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // FEA/Structural (class exports → instantiated)
  fea_2d: ensureInstance(FEASolver2D) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  rcsa: ensureInstance(RCSA) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // Wear (class exports → instantiated)
  usui_wear: ensureInstance(UsuiWearModel) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // Planning (class exports → instantiated)
  csp_setup: ensureInstance(CSPSetupPlan) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  dp_multipass: ensureInstance(DPMultiPass) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  ilp_assignment: ensureInstance(ILPAssignment) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // Stochastic (class exports → instantiated)
  monte_carlo: ensureInstance(MonteCarlo) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,

  // Digital Twin (class exports → instantiated)
  digital_twin: ensureInstance(DigitalTwinEstimator) as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
};

/**
 * Factory function to get an algorithm instance by ID.
 *
 * @param id Algorithm identifier
 * @returns Algorithm instance or null if not found
 */
export function createAlgorithm(id: string): Algorithm<AlgorithmInput, AlgorithmOutput> | null {
  return ALGORITHM_REGISTRY[id as AlgorithmId] ?? null;
}

/**
 * List all available algorithm IDs.
 *
 * @returns Array of algorithm IDs
 */
export function listAlgorithms(): AlgorithmId[] {
  return Object.keys(ALGORITHM_REGISTRY) as AlgorithmId[];
}

/**
 * Get algorithm by ID with type assertion.
 *
 * @param id Algorithm identifier
 * @returns Algorithm instance
 * @throws Error if algorithm not found
 */
export function getAlgorithm(id: AlgorithmId): Algorithm<AlgorithmInput, AlgorithmOutput> {
  const algo = ALGORITHM_REGISTRY[id];
  if (!algo) {
    throw new Error(`Algorithm '${id}' not found. Available: ${listAlgorithms().join(", ")}`);
  }
  return algo;
}
