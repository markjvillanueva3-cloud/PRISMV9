/**
 * PRISM Manufacturing Physics Algorithms
 *
 * Standalone algorithm implementations following the Algorithm<I,O> interface.
 * All algorithms are re-exported from this index for convenient importing.
 *
 * S1-MS2: Port Core Monolith Algorithms
 *
 * @module algorithms
 */

import type { Algorithm, AlgorithmInput, AlgorithmOutput } from "./types.js";

// ─── Types ─────────────────────────────────────────────────────────

export * from "./types.js";

// ─── Safety-Critical Models (P1) ───────────────────────────────────

export { KienzleForceModel } from "./KienzleForceModel.js";
export type { KienzleInput, KienzleOutput } from "./KienzleForceModel.js";

export { ExtendedTaylorModel } from "./ExtendedTaylorModel.js";
export type { TaylorInput, TaylorOutput } from "./ExtendedTaylorModel.js";

// ─── Standard Models (P2) ──────────────────────────────────────────

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

// ─── Algorithm Registry ────────────────────────────────────────────

import { KienzleForceModel } from "./KienzleForceModel.js";
import { ExtendedTaylorModel } from "./ExtendedTaylorModel.js";
import { JohnsonCookModel } from "./JohnsonCookModel.js";
import { SurfaceFinishPredictor } from "./SurfaceFinishPredictor.js";
import { StabilityLobeDiagram } from "./StabilityLobeDiagram.js";
import { ChipThinningCompensation } from "./ChipThinningCompensation.js";
import { ThermalPartitionModel } from "./ThermalPartitionModel.js";
import { PowerTorqueCalc } from "./PowerTorqueCalc.js";

/**
 * Algorithm IDs for the 8 core manufacturing physics algorithms.
 */
export type AlgorithmId =
  | "kienzle"
  | "taylor"
  | "johnson_cook"
  | "surface_finish"
  | "stability_lobe"
  | "chip_thinning"
  | "thermal_partition"
  | "power_torque";

/**
 * Registry mapping algorithm IDs to their implementations.
 * Used by AlgorithmEngine for dynamic dispatch.
 */
export const ALGORITHM_REGISTRY: Record<AlgorithmId, Algorithm<AlgorithmInput, AlgorithmOutput>> = {
  kienzle: KienzleForceModel as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  taylor: ExtendedTaylorModel as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  johnson_cook: JohnsonCookModel as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  surface_finish: SurfaceFinishPredictor as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  stability_lobe: StabilityLobeDiagram as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  chip_thinning: ChipThinningCompensation as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  thermal_partition: ThermalPartitionModel as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
  power_torque: PowerTorqueCalc as unknown as Algorithm<AlgorithmInput, AlgorithmOutput>,
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
