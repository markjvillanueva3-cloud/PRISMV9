// WIRE-EXEMPT: tests in ContinualLearningEngines.test.ts (49 cases)
/**
 * Synaptic Intelligence Engine — U-LEARN-10
 * ==========================================
 *
 * Implements Synaptic Intelligence (SI) for online consolidation during
 * continual learning. Tracks per-parameter importance via gradient-weighted
 * path integrals, enabling cheap real-time consolidation without storing
 * full Fisher matrices.
 *
 * Reference: Zenke et al. 2017 "Continual Learning Through Synaptic Intelligence"
 *
 * Key equations:
 * - Online importance: ω_k += -g_k * Δθ_k (gradient × parameter delta)
 * - Regularization: L_SI = λ * Σ_k Ω_k * (θ_k - θ*_k)²
 * - Consolidation: Ω_k = ω_k / (Δθ_k² + ξ) on task completion
 *
 * @module engines/SynapticIntelligenceEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-10
 */

import {
  SIRegisterSchema,
  SIUpdateSchema,
  SIConsolidateSchema,
  SILossSchema,
  SILossResultSchema,
  type SIRegister,
  type SIUpdate,
  type SIConsolidate,
  type SILoss,
  type SILossResult,
} from "../schemas/continualLearningSchema.js";

interface SIState {
  parameterCount: number;
  importanceDecay: number;
  damping: number;
  omega: Float64Array;
  omegaRunning: Float64Array;
  previousParams: Float64Array;
  consolidatedParams: Float64Array | null;
  tasksConsolidated: string[];
}

class SynapticIntelligenceEngine {
  private states: Map<string, SIState> = new Map();

  /**
   * Register a model for SI tracking.
   * @param input - Registration config
   * @returns Confirmation with parameter count
   */
  register(input: SIRegister): { model_id: string; parameter_count: number; initialized: boolean } {
    const parsed = SIRegisterSchema.parse(input);

    const state: SIState = {
      parameterCount: parsed.parameter_count,
      importanceDecay: parsed.importance_decay,
      damping: parsed.damping,
      omega: new Float64Array(parsed.parameter_count),
      omegaRunning: new Float64Array(parsed.parameter_count),
      previousParams: new Float64Array(parsed.parameter_count),
      consolidatedParams: null,
      tasksConsolidated: [],
    };

    this.states.set(parsed.model_id, state);

    return {
      model_id: parsed.model_id,
      parameter_count: parsed.parameter_count,
      initialized: true,
    };
  }

  /**
   * Update running importance with gradient × delta.
   * Call after each training step.
   * @param input - Gradients and parameter deltas
   */
  update(input: SIUpdate): { model_id: string; omega_updated: boolean; max_omega: number } {
    const parsed = SIUpdateSchema.parse(input);
    const state = this.states.get(parsed.model_id);
    if (!state) throw new Error(`Model not registered: ${parsed.model_id}`);

    if (parsed.gradients.length !== state.parameterCount) {
      throw new Error(`Gradient dimension mismatch: expected ${state.parameterCount}, got ${parsed.gradients.length}`);
    }

    let maxOmega = 0;
    for (let i = 0; i < state.parameterCount; i++) {
      const contribution = -parsed.gradients[i] * parsed.parameter_deltas[i];
      state.omegaRunning[i] += contribution;
      if (Math.abs(state.omegaRunning[i]) > maxOmega) {
        maxOmega = Math.abs(state.omegaRunning[i]);
      }
    }

    return {
      model_id: parsed.model_id,
      omega_updated: true,
      max_omega: maxOmega,
    };
  }

  /**
   * Consolidate after task completion.
   * Converts running importance to consolidated importance.
   * @param input - Consolidation request
   */
  consolidate(input: SIConsolidate): { model_id: string; task_id: string; mean_importance: number } {
    const parsed = SIConsolidateSchema.parse(input);
    const state = this.states.get(parsed.model_id);
    if (!state) throw new Error(`Model not registered: ${parsed.model_id}`);

    let totalImportance = 0;

    for (let i = 0; i < state.parameterCount; i++) {
      const delta = state.previousParams[i];
      const deltaSq = delta * delta + state.damping;
      const importance = state.omegaRunning[i] / deltaSq;

      state.omega[i] = state.importanceDecay * state.omega[i] + importance;
      totalImportance += Math.abs(state.omega[i]);
      state.omegaRunning[i] = 0;
    }

    state.consolidatedParams = new Float64Array(state.previousParams);
    state.tasksConsolidated.push(parsed.task_id);

    return {
      model_id: parsed.model_id,
      task_id: parsed.task_id,
      mean_importance: totalImportance / state.parameterCount,
    };
  }

  /**
   * Compute SI regularization loss.
   * @param input - Current parameters and lambda
   * @returns Regularization loss and top important params
   */
  computeLoss(input: SILoss): SILossResult {
    const parsed = SILossSchema.parse(input);
    const state = this.states.get(parsed.model_id);
    if (!state) throw new Error(`Model not registered: ${parsed.model_id}`);

    if (!state.consolidatedParams) {
      return SILossResultSchema.parse({
        regularization_loss: 0,
        top_important_params: [],
      });
    }

    let loss = 0;
    const importances: Array<{ index: number; importance: number; contribution: number }> = [];

    for (let i = 0; i < state.parameterCount; i++) {
      const diff = parsed.current_params[i] - state.consolidatedParams[i];
      const contribution = state.omega[i] * diff * diff;
      loss += contribution;
      importances.push({ index: i, importance: state.omega[i], contribution });
    }

    importances.sort((a, b) => b.importance - a.importance);
    const topParams = importances.slice(0, 10).map(p => ({
      index: p.index,
      importance: p.importance,
    }));

    return SILossResultSchema.parse({
      regularization_loss: parsed.lambda_si * loss,
      top_important_params: topParams,
    });
  }

  /**
   * Set previous parameters for delta tracking.
   * @param modelId - Model identifier
   * @param params - Parameter values
   */
  setParams(modelId: string, params: number[]): void {
    const state = this.states.get(modelId);
    if (!state) throw new Error(`Model not registered: ${modelId}`);
    for (let i = 0; i < params.length && i < state.parameterCount; i++) {
      state.previousParams[i] = params[i];
    }
  }

  /**
   * Get model state.
   */
  getState(modelId: string): { tasks: string[]; mean_omega: number } | null {
    const state = this.states.get(modelId);
    if (!state) return null;

    let total = 0;
    for (let i = 0; i < state.parameterCount; i++) {
      total += Math.abs(state.omega[i]);
    }

    return {
      tasks: [...state.tasksConsolidated],
      mean_omega: total / state.parameterCount,
    };
  }

  /**
   * List registered models.
   */
  listModels(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * Delete a model.
   */
  deleteModel(modelId: string): boolean {
    return this.states.delete(modelId);
  }

  /**
   * Clear all models.
   */
  clear(): void {
    this.states.clear();
  }

  static getSelfAwareness() {
    return {
      name: "SynapticIntelligenceEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-10",
      capabilities: ["register", "update", "consolidate", "computeLoss"],
      reference: "Zenke et al. 2017 - Continual Learning Through Synaptic Intelligence",
    };
  }
}

export const synapticIntelligenceEngine = new SynapticIntelligenceEngine();
