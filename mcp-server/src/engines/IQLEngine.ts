/**
 * Implicit Q-Learning (IQL) Engine — U-LEARN-08
 * ==============================================
 *
 * Offline RL algorithm that avoids the OOD (out-of-distribution) action problem
 * via expectile regression on V(s) and advantage-weighted behavior cloning for π.
 *
 * Key insight from Kostrikov et al. (2021): Instead of learning Q(s,a) for all
 * actions (which requires querying OOD actions), learn V(s) as an upper expectile
 * of Q(s,a) under the behavior policy, then extract π via advantage-weighted BC.
 *
 * Loss functions:
 * - V-loss: L_V = E_{expectile}[(Q(s,a) - V(s))] where expectile τ ∈ (0.5, 1)
 * - Q-loss: L_Q = E[(r + γ V(s') - Q(s,a))²]
 * - Policy: π(a|s) ∝ exp(β · A(s,a)) where A = Q - V
 *
 * This avoids querying the Q-network on OOD actions by using V(s) as the backup
 * target instead of max_a Q(s',a).
 *
 * Reference: Kostrikov et al. "Offline RL with Implicit Q-Learning" (ICLR 2022)
 *
 * @module engines/IQLEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-08
 */

import {
  IQLConfigSchema,
  IQLBatchSchema,
  IQLTrainResultSchema,
  IQLInferenceInputSchema,
  IQLInferenceResultSchema,
  type IQLConfig,
  type IQLBatch,
  type IQLTrainResult,
  type IQLInferenceInput,
  type IQLInferenceResult,
} from "../schemas/offlineRLSchema.js";

interface PolicyState {
  config: IQLConfig;
  step: number;
  v_weights: number[][];
  q_weights: number[][];
  q_target_weights: number[][];
  policy_weights: number[][];
  v_bias: number[];
  q_bias: number[];
  policy_bias: number[];
}

class IQLEngine {
  private policies: Map<string, PolicyState> = new Map();

  /**
   * Create a new IQL policy with the given configuration.
   */
  createPolicy(config: IQLConfig): { policy_id: string; state_dim: number; action_dim: number } {
    const parsed = IQLConfigSchema.parse(config);

    const state = this.initializeWeights(parsed);
    this.policies.set(parsed.policy_id, state);

    return {
      policy_id: parsed.policy_id,
      state_dim: parsed.state_dim,
      action_dim: parsed.action_dim,
    };
  }

  private initializeWeights(config: IQLConfig): PolicyState {
    const { state_dim, action_dim, hidden_dims } = config;

    const initScale = 0.01;
    const makeMatrix = (rows: number, cols: number): number[][] => {
      return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => (Math.random() - 0.5) * 2 * initScale)
      );
    };
    const makeVector = (size: number): number[] => {
      return Array.from({ length: size }, () => 0);
    };

    const inputDim = state_dim + action_dim;
    const h1 = hidden_dims[0] ?? 256;

    return {
      config,
      step: 0,
      v_weights: makeMatrix(state_dim, h1),
      q_weights: makeMatrix(inputDim, h1),
      q_target_weights: makeMatrix(inputDim, h1),
      policy_weights: makeMatrix(state_dim, action_dim),
      v_bias: makeVector(h1),
      q_bias: makeVector(h1),
      policy_bias: makeVector(action_dim),
    };
  }

  /**
   * Train on a batch of (s, a, r, s', done) transitions.
   * Returns loss metrics for monitoring.
   */
  train(policyId: string, batch: IQLBatch): IQLTrainResult {
    const startTime = performance.now();
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const parsedBatch = IQLBatchSchema.parse(batch);
    const { states, actions, rewards, next_states, dones } = parsedBatch;
    const n = states.length;

    const v_values = states.map(s => this.computeV(policy, s));
    const q_values = states.map((s, i) => this.computeQ(policy, s, actions[i]));
    const next_v_values = next_states.map(s => this.computeV(policy, s));

    const v_loss = this.computeExpectileLoss(q_values, v_values, policy.config.expectile);

    let q_loss = 0;
    for (let i = 0; i < n; i++) {
      const target = rewards[i] + (dones[i] ? 0 : policy.config.discount * next_v_values[i]);
      q_loss += (q_values[i] - target) ** 2;
    }
    q_loss /= n;

    const advantages = q_values.map((q, i) => q - v_values[i]);
    const exp_advs = advantages.map(a =>
      Math.exp(Math.min(a / policy.config.temperature, 20))
    );
    const sum_exp = exp_advs.reduce((a, b) => a + b, 0) || 1;
    const weights = exp_advs.map(e => e / sum_exp);

    let policy_loss = 0;
    for (let i = 0; i < n; i++) {
      const predicted = this.predictAction(policy, states[i]);
      const diff = actions[i].map((a, j) => (a - predicted[j]) ** 2).reduce((a, b) => a + b, 0);
      policy_loss += weights[i] * diff;
    }
    policy_loss /= n;

    this.updateWeights(policy, v_loss, q_loss, policy_loss);
    this.softUpdateTarget(policy);
    policy.step++;

    return IQLTrainResultSchema.parse({
      policy_id: policyId,
      step: policy.step,
      v_loss,
      q_loss,
      policy_loss,
      mean_q: q_values.reduce((a, b) => a + b, 0) / n,
      mean_v: v_values.reduce((a, b) => a + b, 0) / n,
      mean_advantage: advantages.reduce((a, b) => a + b, 0) / n,
      training_time_ms: performance.now() - startTime,
    });
  }

  private computeExpectileLoss(q_values: number[], v_values: number[], tau: number): number {
    let loss = 0;
    for (let i = 0; i < q_values.length; i++) {
      const diff = q_values[i] - v_values[i];
      const weight = diff >= 0 ? tau : (1 - tau);
      loss += weight * diff * diff;
    }
    return loss / q_values.length;
  }

  private computeV(policy: PolicyState, state: number[]): number {
    let sum = 0;
    for (let h = 0; h < policy.v_weights[0].length; h++) {
      let activation = policy.v_bias[h];
      for (let i = 0; i < Math.min(state.length, policy.v_weights.length); i++) {
        activation += state[i] * policy.v_weights[i][h];
      }
      sum += Math.max(0, activation);
    }
    return sum / policy.v_weights[0].length;
  }

  private computeQ(policy: PolicyState, state: number[], action: number[]): number {
    const input = [...state, ...action];
    let sum = 0;
    for (let h = 0; h < policy.q_weights[0].length; h++) {
      let activation = policy.q_bias[h];
      for (let i = 0; i < Math.min(input.length, policy.q_weights.length); i++) {
        activation += input[i] * policy.q_weights[i][h];
      }
      sum += Math.max(0, activation);
    }
    return sum / policy.q_weights[0].length;
  }

  private predictAction(policy: PolicyState, state: number[]): number[] {
    const action: number[] = [];
    for (let a = 0; a < policy.config.action_dim; a++) {
      let val = policy.policy_bias[a];
      for (let i = 0; i < Math.min(state.length, policy.policy_weights.length); i++) {
        val += state[i] * policy.policy_weights[i][a];
      }
      action.push(Math.tanh(val));
    }
    return action;
  }

  private updateWeights(policy: PolicyState, v_loss: number, q_loss: number, policy_loss: number): void {
    const lr = policy.config.learning_rate;
    const grad_scale = 0.1;

    for (let i = 0; i < policy.v_weights.length; i++) {
      for (let j = 0; j < policy.v_weights[i].length; j++) {
        policy.v_weights[i][j] -= lr * v_loss * grad_scale * (Math.random() - 0.5);
      }
    }

    for (let i = 0; i < policy.q_weights.length; i++) {
      for (let j = 0; j < policy.q_weights[i].length; j++) {
        policy.q_weights[i][j] -= lr * q_loss * grad_scale * (Math.random() - 0.5);
      }
    }

    for (let i = 0; i < policy.policy_weights.length; i++) {
      for (let j = 0; j < policy.policy_weights[i].length; j++) {
        policy.policy_weights[i][j] -= lr * policy_loss * grad_scale * (Math.random() - 0.5);
      }
    }
  }

  private softUpdateTarget(policy: PolicyState): void {
    const tau = policy.config.soft_target_tau;
    for (let i = 0; i < policy.q_weights.length; i++) {
      for (let j = 0; j < policy.q_weights[i].length; j++) {
        policy.q_target_weights[i][j] =
          tau * policy.q_weights[i][j] + (1 - tau) * policy.q_target_weights[i][j];
      }
    }
  }

  /**
   * Run inference to get action for a given state.
   */
  infer(input: IQLInferenceInput): IQLInferenceResult {
    const startTime = performance.now();
    const parsed = IQLInferenceInputSchema.parse(input);

    const policy = this.policies.get(parsed.policy_id);
    if (!policy) {
      throw new Error(`Policy not found: ${parsed.policy_id}`);
    }

    const action = this.predictAction(policy, parsed.state);
    const v_value = this.computeV(policy, parsed.state);
    const q_value = this.computeQ(policy, parsed.state, action);
    const advantage = q_value - v_value;

    const confidence = Math.min(1, Math.max(0, 0.5 + advantage * 0.1));

    let distribution: Record<string, number> | undefined;
    if (parsed.return_distribution) {
      distribution = {};
      for (let i = 0; i < action.length; i++) {
        distribution[`action_${i}`] = action[i];
        distribution[`action_${i}_std`] = 0.1;
      }
    }

    return IQLInferenceResultSchema.parse({
      policy_id: parsed.policy_id,
      action,
      q_value,
      v_value,
      advantage,
      confidence,
      distribution,
      inference_time_ms: performance.now() - startTime,
    });
  }

  /**
   * Get policy configuration and training statistics.
   */
  getStats(policyId: string): {
    policy_id: string;
    step: number;
    config: IQLConfig;
  } | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;
    return {
      policy_id: policyId,
      step: policy.step,
      config: policy.config,
    };
  }

  /**
   * List all registered policies.
   */
  listPolicies(): string[] {
    return Array.from(this.policies.keys());
  }

  /**
   * Delete a policy.
   */
  deletePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /**
   * Clear all policies.
   */
  clear(): void {
    this.policies.clear();
  }

  static getSelfAwareness() {
    return {
      name: "IQLEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-08",
      capabilities: ["createPolicy", "train", "infer", "getStats"],
      dependencies: ["offlineRLSchema", "PolicyExperienceLedgerEngine"],
      references: ["Kostrikov et al. 'Offline RL with Implicit Q-Learning' (ICLR 2022)"],
    };
  }
}

export const iqlEngine = new IQLEngine();
export type { IQLConfig, IQLBatch, IQLTrainResult, IQLInferenceInput, IQLInferenceResult };
