/**
 * PRISM Algorithm Module — Barrel Export
 *
 * All 8 standalone manufacturing physics algorithms, each implementing
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

// ── Algorithm Registry ──────────────────────────────────────────────

/**
 * All algorithm classes, indexed by their metadata ID.
 * Useful for dynamic dispatch and introspection.
 */
export const ALGORITHM_REGISTRY = {
  "kienzle": KienzleForceModel,
  "taylor": ExtendedTaylorModel,
  "johnson-cook": JohnsonCookModel,
  "surface-finish": SurfaceFinishPredictor,
  "stability-lobe": StabilityLobeDiagram,
  "chip-thinning": ChipThinningCompensation,
  "thermal-power": ThermalPartitionModel,
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
