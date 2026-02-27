/**
 * PRISM Algorithm Module — Barrel Export
 *
 * All 18 standalone manufacturing physics algorithms, each implementing
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

// ── Algorithm Registry ──────────────────────────────────────────────

/**
 * All 18 algorithm classes, indexed by their metadata ID.
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
  // L1-P0-MS1: 11 new ported algorithms
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
