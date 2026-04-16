/**
 * Scientific Math Dispatcher Action Schemas
 * ==========================================
 * Per-action Zod schemas for all 5 prism_scientific_math actions.
 * SCI-MS3: Stochastic processes, information theory, optimal control,
 * graph theory, fuzzy-neural hybrid.
 *
 * @module schemas/scientificMathActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// stochastic_simulate — StochasticProcessEngine.simulate
// ============================================================================

const stochastic_simulate = z.object({
  method: z.enum(["markov", "wiener", "poisson", "hidden_markov"]).optional(),
  transition_matrix: z.array(z.array(z.number())).optional(),
  initial_state: z.number().int().optional(),
  steps: z.number().int().positive().optional(),
  drift: z.number().optional(),
  volatility: z.number().positive().optional(),
  rate: z.number().positive().optional(),
  dt: z.number().positive().optional(),
  observations: z.array(z.number()).optional(),
  num_states: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// information_entropy — InformationTheoryEngine.analyze
// ============================================================================

const information_entropy = z.object({
  method: z.enum(["shannon", "mutual_information", "kl_divergence", "transfer_entropy", "sample_entropy"]).optional(),
  signal: z.array(z.number()).optional(),
  x: z.array(z.number()).optional(),
  y: z.array(z.number()).optional(),
  p: z.array(z.number()).optional(),
  q: z.array(z.number()).optional(),
  bins: z.number().int().positive().optional(),
  lag: z.number().int().positive().optional(),
  m: z.number().int().positive().optional(),
  r: z.number().positive().optional(),
}).passthrough();

// ============================================================================
// optimal_control — OptimalControlEngine.optimize
// ============================================================================

const optimal_control = z.object({
  method: z.enum(["pontryagin", "lqr", "hjb"]).optional(),
  segments: z.array(z.record(z.string(), z.any())).optional(),
  constraints: z.record(z.string(), z.any()).optional(),
  Q_diag: z.array(z.number()).optional(),
  R_scalar: z.number().optional(),
  dt_sec: z.number().positive().optional(),
}).passthrough();

// ============================================================================
// graph_solve — GraphTheoryEngine.solve
// ============================================================================

const graph_solve = z.object({
  method: z.enum(["topological_sort", "critical_path", "mst", "tsp", "coloring"]).optional(),
  nodes: z.array(z.record(z.string(), z.any())).optional(),
  edges: z.array(z.record(z.string(), z.any())).optional(),
}).passthrough();

// ============================================================================
// fuzzy_neural — FuzzyNeuralHybridEngine.compute
// ============================================================================

const fuzzy_neural = z.object({
  method: z.enum(["anfis", "fuzzy_taguchi", "fuzzy_ahp"]).optional(),
  inputs: z.array(z.record(z.string(), z.any())).optional(),
  rules: z.array(z.record(z.string(), z.any())).optional(),
  training_data: z.array(z.record(z.string(), z.any())).optional(),
  criteria: z.array(z.record(z.string(), z.any())).optional(),
  comparison_matrix: z.array(z.array(z.number())).optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const SCIENTIFIC_MATH_ACTION_SCHEMAS: ActionSchemaMap = {
  stochastic_simulate,
  information_entropy,
  optimal_control,
  graph_solve,
  fuzzy_neural,
};
