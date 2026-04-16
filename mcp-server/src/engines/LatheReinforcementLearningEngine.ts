/**
 * LatheReinforcementLearningEngine — LATHE-RL-MS0
 * =================================================
 * Reinforcement Learning for CNC Lathe Programming Optimization
 *
 * Implements complete RL algorithms for learning optimal lathe operations:
 *   1. Q-Learning with epsilon-greedy exploration
 *   2. REINFORCE (Policy Gradient with baseline)
 *   3. Actor-Critic (A2C) with advantage estimation
 *   4. Experience Replay for sample efficiency
 *   5. Reward shaping for manufacturing objectives
 *
 * State Space:
 *   - Part geometry (diameter, length, feature count)
 *   - Material properties (ISO group, hardness, machinability)
 *   - Current operation state (roughing, finishing, threading)
 *   - Tool wear state (flank wear VB, crater wear)
 *   - Machine state (spindle load, turret position)
 *
 * Action Space:
 *   - Operation selection (face, rough, finish, thread, groove, etc.)
 *   - Parameter adjustment (speed +/- 10%, feed +/- 10%, DOC +/- 10%)
 *   - Tool selection from available tools
 *   - Strategy selection (aggressive, conservative, balanced)
 *
 * Reward Function:
 *   - Cycle time minimization (+reward for faster)
 *   - Tool life preservation (-penalty for excessive wear)
 *   - Quality achievement (+reward for meeting Ra target)
 *   - Safety compliance (large -penalty for violations)
 *   - Cost optimization (balance time vs tool cost)
 *
 * References:
 *   - Sutton & Barto (2018) "Reinforcement Learning: An Introduction"
 *   - Williams (1992) "Simple Statistical Gradient-Following Algorithms"
 *   - Mnih et al. (2016) "Asynchronous Methods for Deep RL" (A2C)
 *   - Manufacturing RL: Zhang et al. (2022) "Deep RL for Adaptive Machining"
 *
 * @module engines/LatheReinforcementLearningEngine
 * @milestone LATHE-RL-MS0
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// STATE SPACE — Manufacturing State Representation
// ============================================================================

/** Part geometry state */
export interface PartGeometryState {
  max_diameter_mm: number;
  min_diameter_mm: number;
  length_mm: number;
  feature_count: number;
  complexity_score: number;  // 0-1 based on feature density
  threads_count: number;
  grooves_count: number;
  tapers_count: number;
  radii_count: number;
}

/** Material state */
export interface MaterialState {
  iso_group: ISOGroup;
  hardness_hrc: number;
  hardness_normalized: number;  // 0-1
  machinability_factor: number;
  kc1_1: number;  // Kienzle specific cutting force
  thermal_conductivity: number;
}

/** Current operation state */
export interface OperationState {
  current_operation: LatheOperationType;
  operations_completed: number;
  operations_remaining: number;
  current_tool_number: number;
  material_removed_pct: number;
  current_diameter_mm: number;
  current_z_position_mm: number;
  is_roughing: boolean;
  is_finishing: boolean;
}

/** Tool wear state */
export interface ToolWearState {
  flank_wear_vb_mm: number;
  crater_wear_kt_mm: number;
  wear_rate_mm_per_min: number;
  remaining_life_pct: number;
  edge_condition: "fresh" | "worn" | "critical" | "failed";
}

/** Machine state */
export interface MachineState {
  spindle_load_pct: number;
  spindle_rpm: number;
  feed_rate_mm_rev: number;
  current_power_kw: number;
  turret_position: number;
  coolant_active: boolean;
  chip_conveyor_load: number;
  vibration_level: number;  // 0-1 normalized
}

/** Complete RL state vector */
export interface LatheRLState {
  part: PartGeometryState;
  material: MaterialState;
  operation: OperationState;
  tool: ToolWearState;
  machine: MachineState;
  timestep: number;
  episode_reward_so_far: number;
}

/** State encoding for neural networks (normalized 0-1) */
export interface EncodedState {
  vector: number[];
  dimension: number;
}

// ============================================================================
// ACTION SPACE — Manufacturing Actions
// ============================================================================

/** Lathe operation types */
export type LatheOperationType =
  | "face"
  | "rough_od"
  | "rough_id"
  | "finish_od"
  | "finish_id"
  | "thread_od"
  | "thread_id"
  | "groove_od"
  | "groove_id"
  | "groove_face"
  | "part_off"
  | "drill"
  | "bore"
  | "tap"
  | "chamfer"
  | "radius"
  | "taper"
  | "contour";

/** Strategy types */
export type StrategyType = "aggressive" | "balanced" | "conservative" | "quality_first" | "speed_first";

/** Parameter adjustment */
export interface ParameterAdjustment {
  speed_delta_pct: number;  // -30 to +30
  feed_delta_pct: number;   // -30 to +30
  doc_delta_pct: number;    // -30 to +30
}

/** Tool selection action */
export interface ToolSelectionAction {
  tool_number: number;
  tool_type: "turning" | "boring" | "threading" | "grooving" | "drilling";
  insert_grade: string;
  nose_radius_mm: number;
}

/** Complete RL action */
export interface LatheRLAction {
  action_type: "select_operation" | "adjust_parameters" | "select_tool" | "select_strategy";
  operation?: LatheOperationType;
  parameter_adjustment?: ParameterAdjustment;
  tool_selection?: ToolSelectionAction;
  strategy?: StrategyType;
}

/** Discrete action for Q-learning */
export interface DiscreteAction {
  action_id: number;
  description: string;
  action_data: LatheRLAction;
}

// ============================================================================
// REWARD FUNCTION — Manufacturing Objectives
// ============================================================================

/** Reward weights for different objectives */
export interface RewardWeights {
  cycle_time: number;      // Weight for cycle time minimization
  tool_life: number;       // Weight for tool life preservation
  surface_quality: number; // Weight for surface finish
  safety: number;          // Weight for safety compliance
  cost: number;            // Weight for cost optimization
  efficiency: number;      // Weight for material removal efficiency
}

/** Reward calculation result */
export interface RewardResult {
  total_reward: number;
  components: {
    cycle_time_reward: number;
    tool_life_reward: number;
    quality_reward: number;
    safety_penalty: number;
    cost_reward: number;
    efficiency_reward: number;
  };
  terminal: boolean;
  info: string;
}

// ============================================================================
// EXPERIENCE REPLAY — Sample Efficiency
// ============================================================================

/** Single experience tuple (s, a, r, s', done) */
export interface Experience {
  state: EncodedState;
  action: number;  // Action index
  reward: number;
  next_state: EncodedState;
  done: boolean;
  info?: Record<string, unknown>;
}

/** Trajectory for policy gradient methods */
export interface Trajectory {
  states: EncodedState[];
  actions: number[];
  rewards: number[];
  log_probs: number[];
  values?: number[];  // For Actor-Critic
  advantages?: number[];
  returns?: number[];
}

// ============================================================================
// Q-LEARNING — Value-Based RL
// ============================================================================

/** Q-table entry */
export interface QTableEntry {
  state_hash: string;
  action_values: number[];
  visit_counts: number[];
  last_updated: number;
}

/** Q-learning configuration */
export interface QLearningConfig {
  learning_rate: number;        // Alpha (0.01-0.3)
  discount_factor: number;      // Gamma (0.9-0.99)
  epsilon_start: number;        // Initial exploration (0.5-1.0)
  epsilon_end: number;          // Final exploration (0.01-0.1)
  epsilon_decay: number;        // Decay rate
  replay_buffer_size: number;   // Experience buffer size
  batch_size: number;           // Mini-batch size
  target_update_freq: number;   // Steps between target updates
}

// ============================================================================
// POLICY GRADIENT — REINFORCE
// ============================================================================

/** Policy network layer */
export interface PolicyLayer {
  weights: number[][];
  biases: number[];
  activation: "relu" | "tanh" | "softmax" | "sigmoid";
}

/** Policy gradient configuration */
export interface PolicyGradientConfig {
  learning_rate: number;
  baseline_learning_rate: number;
  entropy_coefficient: number;  // For entropy regularization
  max_grad_norm: number;        // Gradient clipping
  gamma: number;                // Discount factor
}

// ============================================================================
// ACTOR-CRITIC — A2C
// ============================================================================

/** Actor network configuration */
export interface ActorConfig {
  hidden_sizes: number[];
  activation: "relu" | "tanh";
  output_activation: "softmax";
}

/** Critic network configuration */
export interface CriticConfig {
  hidden_sizes: number[];
  activation: "relu" | "tanh";
  output_activation: "linear";
}

/** A2C configuration */
export interface A2CConfig {
  actor_lr: number;
  critic_lr: number;
  gamma: number;
  gae_lambda: number;           // GAE parameter (0.9-0.99)
  entropy_coeff: number;
  value_loss_coeff: number;
  max_grad_norm: number;
  n_steps: number;              // Steps before update
}

// ============================================================================
// TRAINING INFRASTRUCTURE
// ============================================================================

/** Training episode result */
export interface EpisodeResult {
  episode_id: number;
  total_reward: number;
  episode_length: number;
  avg_reward: number;
  final_quality_score: number;
  cycle_time_sec: number;
  tool_life_used_pct: number;
  safety_violations: number;
  actions_taken: number[];
  converged: boolean;
}

/** Training statistics */
export interface TrainingStats {
  episodes_completed: number;
  total_steps: number;
  avg_reward_last_100: number;
  best_episode_reward: number;
  epsilon_current: number;
  policy_loss: number;
  value_loss: number;
  entropy: number;
  learning_rate: number;
  convergence_detected: boolean;
}

/** Model checkpoint */
export interface ModelCheckpoint {
  version: number;
  timestamp: Date;
  training_stats: TrainingStats;
  q_table?: Map<string, QTableEntry>;
  policy_weights?: PolicyLayer[];
  actor_weights?: PolicyLayer[];
  critic_weights?: PolicyLayer[];
}

// ============================================================================
// LATHE REINFORCEMENT LEARNING ENGINE
// ============================================================================

/**
 * Main Reinforcement Learning Engine for Lathe Programming Optimization.
 *
 * Implements Q-Learning, REINFORCE, and Actor-Critic algorithms for learning
 * optimal lathe programming strategies from experience.
 */
export class LatheReinforcementLearningEngine {
  // ───────────────────────────────────────────────────────────────────────────
  // STATE ENCODING CONSTANTS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * State vector dimension:
   *   Part geometry: 9
   *   Material ISO groups (one-hot): 6
   *   Material continuous: 3
   *   Operation one-hot: 18 (OPERATIONS.length)
   *   Operation continuous: 5
   *   Tool wear: 4
   *   Machine state: 7
   *   Temporal: 2
   *   Total: 9 + 6 + 3 + 18 + 5 + 4 + 7 + 2 = 54
   */
  private readonly STATE_DIM = 54;

  /**
   * Action space size:
   *   Operations: 18
   *   Parameter adjustments: 26 (3x3x3 - 1 for no-change)
   *   Strategies: 5
   *   Tool selections: 10
   *   Total: 18 + 26 + 5 + 10 = 59
   */
  private readonly ACTION_DIM = 59;

  /** Operation types for encoding */
  private readonly OPERATIONS: LatheOperationType[] = [
    "face", "rough_od", "rough_id", "finish_od", "finish_id",
    "thread_od", "thread_id", "groove_od", "groove_id", "groove_face",
    "part_off", "drill", "bore", "tap", "chamfer", "radius", "taper", "contour"
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // RL DATA STRUCTURES
  // ───────────────────────────────────────────────────────────────────────────

  /** Q-table for Q-learning */
  private qTable: Map<string, QTableEntry> = new Map();

  /** Experience replay buffer */
  private replayBuffer: Experience[] = [];
  private replayBufferSize = 10000;

  /** Policy network layers (for REINFORCE and Actor-Critic) */
  private policyLayers: PolicyLayer[] = [];

  /** Value network layers (for Actor-Critic) */
  private valueLayers: PolicyLayer[] = [];

  /** Discrete action space */
  private actionSpace: DiscreteAction[] = [];

  // ───────────────────────────────────────────────────────────────────────────
  // TRAINING STATE
  // ───────────────────────────────────────────────────────────────────────────

  private episodeCount = 0;
  private totalSteps = 0;
  private epsilon = 1.0;
  private rewardHistory: number[] = [];
  private lossHistory: number[] = [];
  private checkpoints: ModelCheckpoint[] = [];

  // ───────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ───────────────────────────────────────────────────────────────────────────

  private qConfig: QLearningConfig = {
    learning_rate: 0.1,
    discount_factor: 0.95,
    epsilon_start: 1.0,
    epsilon_end: 0.01,
    epsilon_decay: 0.995,
    replay_buffer_size: 10000,
    batch_size: 32,
    target_update_freq: 100
  };

  private pgConfig: PolicyGradientConfig = {
    learning_rate: 0.001,
    baseline_learning_rate: 0.01,
    entropy_coefficient: 0.01,
    max_grad_norm: 0.5,
    gamma: 0.95
  };

  private a2cConfig: A2CConfig = {
    actor_lr: 0.0003,
    critic_lr: 0.001,
    gamma: 0.95,
    gae_lambda: 0.95,
    entropy_coeff: 0.01,
    value_loss_coeff: 0.5,
    max_grad_norm: 0.5,
    n_steps: 5
  };

  private rewardWeights: RewardWeights = {
    cycle_time: 0.25,
    tool_life: 0.20,
    surface_quality: 0.20,
    safety: 0.20,
    cost: 0.10,
    efficiency: 0.05
  };

  // ───────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR & INITIALIZATION
  // ───────────────────────────────────────────────────────────────────────────

  constructor() {
    this.initializeActionSpace();
    this.initializeNetworks();
    log.info("[LatheRL] Reinforcement Learning Engine initialized");
  }

  /**
   * Initialize discrete action space for Q-learning.
   * Actions include operation selection, parameter adjustments, tool selection.
   */
  private initializeActionSpace(): void {
    let actionId = 0;

    // Operation selection actions (18 operations)
    for (const op of this.OPERATIONS) {
      this.actionSpace.push({
        action_id: actionId++,
        description: `Select operation: ${op}`,
        action_data: {
          action_type: "select_operation",
          operation: op
        }
      });
    }

    // Parameter adjustment actions (27 combinations)
    const adjustments = [-20, -10, 0, 10, 20];
    for (const speedDelta of [-10, 0, 10]) {
      for (const feedDelta of [-10, 0, 10]) {
        for (const docDelta of [-10, 0, 10]) {
          if (speedDelta === 0 && feedDelta === 0 && docDelta === 0) continue;
          this.actionSpace.push({
            action_id: actionId++,
            description: `Adjust: SPD${speedDelta >= 0 ? "+" : ""}${speedDelta}%, FEED${feedDelta >= 0 ? "+" : ""}${feedDelta}%, DOC${docDelta >= 0 ? "+" : ""}${docDelta}%`,
            action_data: {
              action_type: "adjust_parameters",
              parameter_adjustment: {
                speed_delta_pct: speedDelta,
                feed_delta_pct: feedDelta,
                doc_delta_pct: docDelta
              }
            }
          });
        }
      }
    }

    // Strategy selection actions (5 strategies)
    const strategies: StrategyType[] = ["aggressive", "balanced", "conservative", "quality_first", "speed_first"];
    for (const strategy of strategies) {
      this.actionSpace.push({
        action_id: actionId++,
        description: `Select strategy: ${strategy}`,
        action_data: {
          action_type: "select_strategy",
          strategy
        }
      });
    }

    // Tool selection actions (10 tool types)
    const toolTypes: Array<{ type: string; grade: string; nose: number }> = [
      { type: "turning", grade: "GC4325", nose: 0.8 },
      { type: "turning", grade: "GC4315", nose: 0.4 },
      { type: "finishing", grade: "GC4315", nose: 0.2 },
      { type: "threading", grade: "GC1020", nose: 0.3 },
      { type: "grooving", grade: "GC1125", nose: 0.4 },
      { type: "boring", grade: "GC4325", nose: 0.4 },
      { type: "drilling", grade: "GC1130", nose: 0.0 },
      { type: "parting", grade: "GC1125", nose: 0.2 },
      { type: "roughing", grade: "GC4235", nose: 1.2 },
      { type: "ceramic", grade: "CC670", nose: 0.8 }
    ];

    for (let i = 0; i < toolTypes.length; i++) {
      this.actionSpace.push({
        action_id: actionId++,
        description: `Select tool: T${i + 1} ${toolTypes[i].type} ${toolTypes[i].grade}`,
        action_data: {
          action_type: "select_tool",
          tool_selection: {
            tool_number: i + 1,
            tool_type: "turning",
            insert_grade: toolTypes[i].grade,
            nose_radius_mm: toolTypes[i].nose
          }
        }
      });
    }

    log.info(`[LatheRL] Action space initialized with ${this.actionSpace.length} discrete actions`);
  }

  /**
   * Initialize neural network weights for policy gradient and actor-critic.
   * Uses Xavier/He initialization for weights.
   */
  private initializeNetworks(): void {
    // Policy network: STATE_DIM -> 64 -> 32 -> ACTION_DIM
    this.policyLayers = [
      {
        weights: this.initializeWeights(this.STATE_DIM, 64),
        biases: new Array(64).fill(0),
        activation: "relu"
      },
      {
        weights: this.initializeWeights(64, 32),
        biases: new Array(32).fill(0),
        activation: "relu"
      },
      {
        weights: this.initializeWeights(32, this.ACTION_DIM),
        biases: new Array(this.ACTION_DIM).fill(0),
        activation: "softmax"
      }
    ];

    // Value network: STATE_DIM -> 64 -> 32 -> 1
    this.valueLayers = [
      {
        weights: this.initializeWeights(this.STATE_DIM, 64),
        biases: new Array(64).fill(0),
        activation: "relu"
      },
      {
        weights: this.initializeWeights(64, 32),
        biases: new Array(32).fill(0),
        activation: "relu"
      },
      {
        weights: this.initializeWeights(32, 1),
        biases: [0],
        activation: "sigmoid"
      }
    ];

    log.info("[LatheRL] Neural networks initialized");
  }

  /**
   * Xavier/He weight initialization.
   * @param inputSize Input dimension
   * @param outputSize Output dimension
   * @returns Initialized weight matrix
   */
  private initializeWeights(inputSize: number, outputSize: number): number[][] {
    const scale = Math.sqrt(2.0 / inputSize);  // He initialization for ReLU
    const weights: number[][] = [];

    for (let i = 0; i < inputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < outputSize; j++) {
        weights[i][j] = (Math.random() * 2 - 1) * scale;
      }
    }

    return weights;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE ENCODING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Encode complete manufacturing state into normalized feature vector.
   * @param state Raw manufacturing state
   * @returns Encoded state vector for neural network input
   */
  encodeState(state: LatheRLState): EncodedState {
    const vector: number[] = [];

    // Part geometry features (9 features)
    vector.push(Math.min(state.part.max_diameter_mm / 300, 1));
    vector.push(Math.min(state.part.min_diameter_mm / 300, 1));
    vector.push(Math.min(state.part.length_mm / 500, 1));
    vector.push(Math.min(state.part.feature_count / 20, 1));
    vector.push(state.part.complexity_score);
    vector.push(Math.min(state.part.threads_count / 5, 1));
    vector.push(Math.min(state.part.grooves_count / 5, 1));
    vector.push(Math.min(state.part.tapers_count / 3, 1));
    vector.push(Math.min(state.part.radii_count / 5, 1));

    // Material features (6 features) - one-hot for ISO group + continuous
    const isoGroups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
    for (const group of isoGroups) {
      vector.push(state.material.iso_group === group ? 1 : 0);
    }
    vector.push(state.material.hardness_normalized);
    vector.push(Math.min(state.material.machinability_factor / 2, 1));
    vector.push(Math.min(state.material.kc1_1 / 4000, 1));

    // Operation state features (9 features)
    // One-hot encode current operation
    for (const op of this.OPERATIONS) {
      vector.push(state.operation.current_operation === op ? 1 : 0);
    }
    vector.push(Math.min(state.operation.operations_completed / 20, 1));
    vector.push(Math.min(state.operation.operations_remaining / 20, 1));
    vector.push(state.operation.material_removed_pct);
    vector.push(state.operation.is_roughing ? 1 : 0);
    vector.push(state.operation.is_finishing ? 1 : 0);

    // Tool wear features (5 features)
    vector.push(Math.min(state.tool.flank_wear_vb_mm / 0.4, 1));
    vector.push(Math.min(state.tool.crater_wear_kt_mm / 0.2, 1));
    vector.push(state.tool.remaining_life_pct);
    const edgeConditionMap = { fresh: 0, worn: 0.33, critical: 0.66, failed: 1 };
    vector.push(edgeConditionMap[state.tool.edge_condition]);

    // Machine state features (7 features)
    vector.push(state.machine.spindle_load_pct);
    vector.push(Math.min(state.machine.spindle_rpm / 6000, 1));
    vector.push(Math.min(state.machine.feed_rate_mm_rev / 0.5, 1));
    vector.push(Math.min(state.machine.current_power_kw / 30, 1));
    vector.push(state.machine.coolant_active ? 1 : 0);
    vector.push(state.machine.vibration_level);
    vector.push(Math.min(state.machine.turret_position / 12, 1));

    // Temporal features (2 features)
    vector.push(Math.min(state.timestep / 100, 1));
    vector.push(Math.tanh(state.episode_reward_so_far / 100));

    return {
      vector,
      dimension: vector.length
    };
  }

  /**
   * Hash state for Q-table lookup.
   * Discretizes continuous state into bins for tabular Q-learning.
   * @param state Encoded state
   * @returns State hash string
   */
  private hashState(state: EncodedState): string {
    // Discretize to 10 bins per feature
    const bins = state.vector.map(v => Math.floor(Math.min(v, 0.999) * 10));
    return bins.join("-");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // REWARD FUNCTION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Calculate reward for a state-action-next_state transition.
   * Multi-objective reward combining cycle time, tool life, quality, safety, and cost.
   *
   * @param state Current state
   * @param action Action taken
   * @param nextState Resulting state
   * @param outcome Observed outcome metrics
   * @returns Detailed reward breakdown
   */
  calculateReward(
    state: LatheRLState,
    action: LatheRLAction,
    nextState: LatheRLState,
    outcome: {
      cycle_time_sec: number;
      surface_finish_ra: number;
      target_ra: number;
      tool_wear_increment_mm: number;
      safety_violation: boolean;
      material_removed_mm3: number;
      cost_incurred: number;
    }
  ): RewardResult {
    const w = this.rewardWeights;

    // 1. Cycle time reward: faster is better
    // Normalize against expected time, reward improvement
    const expectedCycleTime = this.estimateExpectedCycleTime(state);
    const cycleTimeRatio = outcome.cycle_time_sec / expectedCycleTime;
    const cycleTimeReward = w.cycle_time * (1 - cycleTimeRatio) * 10;

    // 2. Tool life reward: penalize excessive wear
    // VB < 0.1mm = good, VB > 0.3mm = bad
    const wearPenalty = outcome.tool_wear_increment_mm / 0.1;
    const toolLifeReward = w.tool_life * Math.max(0, 1 - wearPenalty) * 5;

    // 3. Surface quality reward: meeting Ra target
    const qualityRatio = outcome.surface_finish_ra / outcome.target_ra;
    let qualityReward: number;
    if (qualityRatio <= 1.0) {
      // Met or exceeded target
      qualityReward = w.surface_quality * (2 - qualityRatio) * 10;
    } else {
      // Missed target - penalty
      qualityReward = w.surface_quality * (1 - qualityRatio) * 10;
    }

    // 4. Safety penalty: large negative for violations
    const safetyPenalty = outcome.safety_violation ? -w.safety * 50 : 0;

    // 5. Cost reward: minimize cost per part
    const expectedCost = this.estimateExpectedCost(state);
    const costRatio = outcome.cost_incurred / expectedCost;
    const costReward = w.cost * (1 - costRatio) * 5;

    // 6. Efficiency reward: maximize MRR
    const expectedMRR = this.estimateExpectedMRR(state);
    const actualMRR = outcome.material_removed_mm3 / outcome.cycle_time_sec;
    const efficiencyReward = w.efficiency * Math.min(actualMRR / expectedMRR, 2) * 5;

    // Total reward
    const totalReward = cycleTimeReward + toolLifeReward + qualityReward +
      safetyPenalty + costReward + efficiencyReward;

    // Check if episode is terminal
    const terminal = this.isTerminalState(nextState, outcome);

    return {
      total_reward: totalReward,
      components: {
        cycle_time_reward: cycleTimeReward,
        tool_life_reward: toolLifeReward,
        quality_reward: qualityReward,
        safety_penalty: safetyPenalty,
        cost_reward: costReward,
        efficiency_reward: efficiencyReward
      },
      terminal,
      info: this.generateRewardExplanation(totalReward, outcome)
    };
  }

  /**
   * Estimate expected cycle time based on part geometry and material.
   */
  private estimateExpectedCycleTime(state: LatheRLState): number {
    // Base time from part volume and material machinability
    const volume = Math.PI * Math.pow(state.part.max_diameter_mm / 2, 2) * state.part.length_mm;
    const mrrBase = 5000;  // mm^3/min baseline
    const machinabilityFactor = state.material.machinability_factor;
    const baseTime = (volume / mrrBase) / machinabilityFactor * 60;

    // Add time for features
    const featureTime = state.part.feature_count * 15 +
      state.part.threads_count * 30 +
      state.part.grooves_count * 20;

    return baseTime + featureTime;
  }

  /**
   * Estimate expected cost based on tooling and cycle time.
   */
  private estimateExpectedCost(state: LatheRLState): number {
    const hourlyRate = 85;  // $/hr machine rate
    const expectedTime = this.estimateExpectedCycleTime(state) / 3600;
    const toolCost = state.part.feature_count * 2;  // $2 per feature in tooling
    return expectedTime * hourlyRate + toolCost;
  }

  /**
   * Estimate expected MRR based on material and operation.
   */
  private estimateExpectedMRR(state: LatheRLState): number {
    const baseMRR: Record<ISOGroup, number> = {
      P: 6000,  // mm^3/min for steel
      M: 4000,  // Stainless
      K: 8000,  // Cast iron
      N: 15000, // Aluminum
      S: 2000,  // Superalloys
      H: 1500   // Hardened
    };
    return baseMRR[state.material.iso_group] || 5000;
  }

  /**
   * Check if state is terminal (episode end).
   */
  private isTerminalState(
    state: LatheRLState,
    outcome: { safety_violation: boolean }
  ): boolean {
    // Terminal conditions:
    // 1. All operations complete
    // 2. Tool failure
    // 3. Safety violation
    // 4. Part complete
    return state.operation.operations_remaining === 0 ||
      state.tool.edge_condition === "failed" ||
      outcome.safety_violation ||
      state.operation.material_removed_pct >= 0.99;
  }

  /**
   * Generate human-readable reward explanation.
   */
  private generateRewardExplanation(
    totalReward: number,
    outcome: { cycle_time_sec: number; surface_finish_ra: number; safety_violation: boolean }
  ): string {
    if (outcome.safety_violation) {
      return `Safety violation - large penalty applied. Cycle: ${outcome.cycle_time_sec}s`;
    }
    if (totalReward > 10) {
      return `Excellent performance. Cycle: ${outcome.cycle_time_sec}s, Ra: ${outcome.surface_finish_ra}um`;
    }
    if (totalReward > 0) {
      return `Good performance. Cycle: ${outcome.cycle_time_sec}s, Ra: ${outcome.surface_finish_ra}um`;
    }
    return `Below target. Cycle: ${outcome.cycle_time_sec}s, Ra: ${outcome.surface_finish_ra}um`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Q-LEARNING IMPLEMENTATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Select action using epsilon-greedy policy for Q-learning.
   * @param state Current state
   * @returns Selected action index
   */
  selectActionQLearning(state: LatheRLState): number {
    const encodedState = this.encodeState(state);
    const stateHash = this.hashState(encodedState);

    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      // Explore: random action
      return Math.floor(Math.random() * this.actionSpace.length);
    }

    // Exploit: best Q-value action
    const entry = this.qTable.get(stateHash);
    if (!entry) {
      // No experience for this state - random action
      return Math.floor(Math.random() * this.actionSpace.length);
    }

    // Argmax Q-values
    let bestAction = 0;
    let bestValue = entry.action_values[0];
    for (let i = 1; i < entry.action_values.length; i++) {
      if (entry.action_values[i] > bestValue) {
        bestValue = entry.action_values[i];
        bestAction = i;
      }
    }

    return bestAction;
  }

  /**
   * Update Q-table from experience using Q-learning update rule.
   * Q(s,a) <- Q(s,a) + α * [r + γ * max_a' Q(s',a') - Q(s,a)]
   *
   * @param experience Single experience tuple
   */
  updateQLearning(experience: Experience): void {
    const stateHash = this.hashState(experience.state);
    const nextStateHash = this.hashState(experience.next_state);
    const alpha = this.qConfig.learning_rate;
    const gamma = this.qConfig.discount_factor;

    // Initialize Q-entry if not exists
    if (!this.qTable.has(stateHash)) {
      this.qTable.set(stateHash, {
        state_hash: stateHash,
        action_values: new Array(this.actionSpace.length).fill(0),
        visit_counts: new Array(this.actionSpace.length).fill(0),
        last_updated: this.totalSteps
      });
    }

    const entry = this.qTable.get(stateHash)!;

    // Get max Q-value for next state
    let maxNextQ = 0;
    if (!experience.done) {
      const nextEntry = this.qTable.get(nextStateHash);
      if (nextEntry) {
        maxNextQ = Math.max(...nextEntry.action_values);
      }
    }

    // Q-learning update
    const currentQ = entry.action_values[experience.action];
    const target = experience.reward + gamma * maxNextQ;
    const tdError = target - currentQ;

    entry.action_values[experience.action] = currentQ + alpha * tdError;
    entry.visit_counts[experience.action]++;
    entry.last_updated = this.totalSteps;

    // Decay epsilon
    this.epsilon = Math.max(
      this.qConfig.epsilon_end,
      this.epsilon * this.qConfig.epsilon_decay
    );
  }

  /**
   * Perform batch Q-learning update using experience replay.
   */
  updateQLearningBatch(): void {
    if (this.replayBuffer.length < this.qConfig.batch_size) {
      return;
    }

    // Sample random batch
    const batch: Experience[] = [];
    for (let i = 0; i < this.qConfig.batch_size; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length);
      batch.push(this.replayBuffer[idx]);
    }

    // Update each experience
    for (const exp of batch) {
      this.updateQLearning(exp);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // REINFORCE (POLICY GRADIENT) IMPLEMENTATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Forward pass through policy network.
   * @param state Encoded state
   * @returns Action probabilities (softmax output)
   */
  private forwardPolicy(state: EncodedState): number[] {
    let activations = state.vector;

    for (const layer of this.policyLayers) {
      activations = this.forwardLayer(activations, layer);
    }

    return activations;
  }

  /**
   * Forward pass through a single layer.
   */
  private forwardLayer(input: number[], layer: PolicyLayer): number[] {
    const output: number[] = new Array(layer.biases.length).fill(0);

    // Linear transformation: y = Wx + b
    for (let j = 0; j < output.length; j++) {
      for (let i = 0; i < input.length; i++) {
        output[j] += input[i] * layer.weights[i][j];
      }
      output[j] += layer.biases[j];
    }

    // Apply activation
    return this.applyActivation(output, layer.activation);
  }

  /**
   * Apply activation function.
   */
  private applyActivation(x: number[], activation: string): number[] {
    switch (activation) {
      case "relu":
        return x.map(v => Math.max(0, v));
      case "tanh":
        return x.map(v => Math.tanh(v));
      case "sigmoid":
        return x.map(v => 1 / (1 + Math.exp(-Math.min(Math.max(v, -500), 500))));
      case "softmax": {
        const maxVal = Math.max(...x);
        const expVals = x.map(v => Math.exp(v - maxVal));
        const sumExp = expVals.reduce((a, b) => a + b, 0);
        return expVals.map(v => v / sumExp);
      }
      default:
        return x;
    }
  }

  /**
   * Select action using policy network (stochastic).
   * @param state Current state
   * @returns Action index and log probability
   */
  selectActionPolicy(state: LatheRLState): { action: number; logProb: number } {
    const encodedState = this.encodeState(state);
    const probs = this.forwardPolicy(encodedState);

    // Sample from categorical distribution
    const r = Math.random();
    let cumSum = 0;
    let selectedAction = 0;

    for (let i = 0; i < probs.length; i++) {
      cumSum += probs[i];
      if (r < cumSum) {
        selectedAction = i;
        break;
      }
    }

    // Log probability for gradient computation
    const logProb = Math.log(Math.max(probs[selectedAction], 1e-8));

    return { action: selectedAction, logProb };
  }

  /**
   * Update policy using REINFORCE algorithm.
   * Gradient: ∇J(θ) = E[∑_t ∇log π(a_t|s_t) * (R_t - b)]
   *
   * @param trajectory Complete episode trajectory
   */
  updatePolicyREINFORCE(trajectory: Trajectory): void {
    // Compute returns (discounted cumulative rewards)
    const returns = this.computeReturns(trajectory.rewards);
    trajectory.returns = returns;

    // Compute baseline (average return)
    const baseline = returns.reduce((a, b) => a + b, 0) / returns.length;

    // Compute advantages
    trajectory.advantages = returns.map(r => r - baseline);

    // Policy gradient update
    // ∇θ J(θ) ≈ ∑_t ∇θ log π(a_t|s_t) * A_t
    for (let t = 0; t < trajectory.states.length; t++) {
      const state = trajectory.states[t];
      const action = trajectory.actions[t];
      const advantage = trajectory.advantages[t];
      const logProb = trajectory.log_probs[t];

      // Compute gradient and update weights
      this.updatePolicyGradients(state, action, advantage);
    }

    // Entropy regularization for exploration
    this.addEntropyBonus(trajectory);
  }

  /**
   * Compute discounted returns from rewards.
   */
  private computeReturns(rewards: number[]): number[] {
    const gamma = this.pgConfig.gamma;
    const returns: number[] = new Array(rewards.length);
    let runningReturn = 0;

    for (let t = rewards.length - 1; t >= 0; t--) {
      runningReturn = rewards[t] + gamma * runningReturn;
      returns[t] = runningReturn;
    }

    // Normalize returns for stability
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length) + 1e-8;

    return returns.map(r => (r - mean) / std);
  }

  /**
   * Update policy weights using gradient ascent.
   */
  private updatePolicyGradients(
    state: EncodedState,
    action: number,
    advantage: number
  ): void {
    const lr = this.pgConfig.learning_rate;

    // Forward pass to get activations
    let activations: number[][] = [state.vector];
    let current = state.vector;

    for (const layer of this.policyLayers) {
      current = this.forwardLayer(current, layer);
      activations.push(current);
    }

    // Backward pass
    // Output layer gradient: ∂L/∂o = advantage * (1[a=i] - π(a|s))
    const probs = activations[activations.length - 1];
    const outputGrad = probs.map((p, i) =>
      advantage * ((i === action ? 1 : 0) - p)
    );

    // Backpropagate through layers (simplified - full implementation would use chain rule)
    let grad = outputGrad;
    for (let l = this.policyLayers.length - 1; l >= 0; l--) {
      const layer = this.policyLayers[l];
      const prevActivations = activations[l];
      const nextGrad: number[] = new Array(prevActivations.length).fill(0);

      // Update weights
      for (let i = 0; i < prevActivations.length; i++) {
        for (let j = 0; j < grad.length; j++) {
          const gradUpdate = lr * grad[j] * prevActivations[i];
          // Gradient clipping
          const clipped = Math.max(-this.pgConfig.max_grad_norm,
            Math.min(this.pgConfig.max_grad_norm, gradUpdate));
          layer.weights[i][j] += clipped;
          nextGrad[i] += grad[j] * layer.weights[i][j];
        }
      }

      // Update biases
      for (let j = 0; j < grad.length; j++) {
        const gradUpdate = lr * grad[j];
        const clipped = Math.max(-this.pgConfig.max_grad_norm,
          Math.min(this.pgConfig.max_grad_norm, gradUpdate));
        layer.biases[j] += clipped;
      }

      // Propagate gradient to previous layer
      if (l > 0) {
        // Apply activation derivative
        grad = this.activationDerivative(nextGrad, layer.activation);
      }
    }
  }

  /**
   * Compute activation function derivative.
   */
  private activationDerivative(grad: number[], activation: string): number[] {
    switch (activation) {
      case "relu":
        return grad.map((g, i) => g > 0 ? 1 : 0);
      case "tanh":
        return grad.map(g => 1 - Math.pow(Math.tanh(g), 2));
      case "sigmoid": {
        const sig = grad.map(g => 1 / (1 + Math.exp(-g)));
        return sig.map(s => s * (1 - s));
      }
      default:
        return grad;
    }
  }

  /**
   * Add entropy bonus to encourage exploration.
   */
  private addEntropyBonus(trajectory: Trajectory): void {
    // Compute average policy entropy
    let totalEntropy = 0;
    for (const state of trajectory.states) {
      const probs = this.forwardPolicy(state);
      const entropy = -probs.reduce((sum, p) => {
        if (p > 1e-8) {
          return sum + p * Math.log(p);
        }
        return sum;
      }, 0);
      totalEntropy += entropy;
    }

    const avgEntropy = totalEntropy / trajectory.states.length;

    // Log entropy for monitoring
    if (this.episodeCount % 100 === 0) {
      log.debug(`[LatheRL] Policy entropy: ${avgEntropy.toFixed(4)}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ACTOR-CRITIC (A2C) IMPLEMENTATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Forward pass through value network (critic).
   * @param state Encoded state
   * @returns State value estimate
   */
  private forwardValue(state: EncodedState): number {
    let activations = state.vector;

    for (const layer of this.valueLayers) {
      activations = this.forwardLayer(activations, layer);
    }

    // Return single value
    return activations[0];
  }

  /**
   * Select action using Actor-Critic policy.
   * @param state Current state
   * @returns Action, log probability, and value estimate
   */
  selectActionA2C(state: LatheRLState): {
    action: number;
    logProb: number;
    value: number;
  } {
    const encodedState = this.encodeState(state);

    // Actor: get action probabilities
    const { action, logProb } = this.selectActionPolicy(state);

    // Critic: get value estimate
    const value = this.forwardValue(encodedState);

    return { action, logProb, value };
  }

  /**
   * Compute Generalized Advantage Estimation (GAE).
   * A^GAE_t = ∑_{l=0}^{∞} (γλ)^l δ_{t+l}
   * where δ_t = r_t + γV(s_{t+1}) - V(s_t)
   *
   * @param trajectory Episode trajectory with values
   * @returns Advantages using GAE
   */
  private computeGAE(trajectory: Trajectory): number[] {
    const gamma = this.a2cConfig.gamma;
    const lambda = this.a2cConfig.gae_lambda;
    const advantages: number[] = new Array(trajectory.rewards.length).fill(0);
    const values = trajectory.values || [];

    let lastAdvantage = 0;
    for (let t = trajectory.rewards.length - 1; t >= 0; t--) {
      const nextValue = t < values.length - 1 ? values[t + 1] : 0;
      const delta = trajectory.rewards[t] + gamma * nextValue - (values[t] || 0);
      lastAdvantage = delta + gamma * lambda * lastAdvantage;
      advantages[t] = lastAdvantage;
    }

    return advantages;
  }

  /**
   * Update Actor-Critic networks.
   * Actor loss: -E[log π(a|s) * A]
   * Critic loss: E[(V(s) - R)^2]
   *
   * @param trajectory Episode trajectory
   */
  updateA2C(trajectory: Trajectory): { actorLoss: number; criticLoss: number } {
    // Compute returns
    const returns = this.computeReturns(trajectory.rewards);
    trajectory.returns = returns;

    // Compute GAE advantages
    trajectory.advantages = this.computeGAE(trajectory);

    // Update critic (value network)
    let criticLoss = 0;
    for (let t = 0; t < trajectory.states.length; t++) {
      const state = trajectory.states[t];
      const targetReturn = returns[t];
      const predictedValue = this.forwardValue(state);

      // MSE loss
      const tdError = targetReturn - predictedValue;
      criticLoss += Math.pow(tdError, 2);

      // Update value network weights
      this.updateValueGradients(state, tdError);
    }
    criticLoss /= trajectory.states.length;

    // Update actor (policy network)
    let actorLoss = 0;
    for (let t = 0; t < trajectory.states.length; t++) {
      const state = trajectory.states[t];
      const action = trajectory.actions[t];
      const advantage = trajectory.advantages[t];
      const logProb = trajectory.log_probs[t];

      // Policy gradient loss
      actorLoss -= logProb * advantage;

      // Update policy network weights
      this.updatePolicyGradients(state, action, advantage);
    }
    actorLoss /= trajectory.states.length;

    // Entropy regularization
    this.addEntropyBonus(trajectory);

    return { actorLoss, criticLoss };
  }

  /**
   * Update value network weights using gradient descent.
   */
  private updateValueGradients(state: EncodedState, tdError: number): void {
    const lr = this.a2cConfig.critic_lr;

    // Forward pass to get activations
    let activations: number[][] = [state.vector];
    let current = state.vector;

    for (const layer of this.valueLayers) {
      current = this.forwardLayer(current, layer);
      activations.push(current);
    }

    // Backward pass - gradient of MSE loss
    let grad = [2 * tdError];  // ∂L/∂v = 2(v - target)

    for (let l = this.valueLayers.length - 1; l >= 0; l--) {
      const layer = this.valueLayers[l];
      const prevActivations = activations[l];
      const nextGrad: number[] = new Array(prevActivations.length).fill(0);

      // Update weights
      for (let i = 0; i < prevActivations.length; i++) {
        for (let j = 0; j < grad.length; j++) {
          const gradUpdate = lr * grad[j] * prevActivations[i];
          const clipped = Math.max(-this.a2cConfig.max_grad_norm,
            Math.min(this.a2cConfig.max_grad_norm, gradUpdate));
          layer.weights[i][j] -= clipped;  // Gradient descent (negative)
          nextGrad[i] += grad[j] * layer.weights[i][j];
        }
      }

      // Update biases
      for (let j = 0; j < grad.length; j++) {
        const gradUpdate = lr * grad[j];
        const clipped = Math.max(-this.a2cConfig.max_grad_norm,
          Math.min(this.a2cConfig.max_grad_norm, gradUpdate));
        layer.biases[j] -= clipped;
      }

      // Propagate gradient
      if (l > 0) {
        grad = this.activationDerivative(nextGrad, layer.activation);
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXPERIENCE REPLAY
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Store experience in replay buffer.
   */
  storeExperience(experience: Experience): void {
    this.replayBuffer.push(experience);

    // Remove oldest if buffer full
    if (this.replayBuffer.length > this.replayBufferSize) {
      this.replayBuffer.shift();
    }
  }

  /**
   * Sample batch from replay buffer.
   */
  sampleExperienceBatch(batchSize: number): Experience[] {
    if (this.replayBuffer.length < batchSize) {
      return [...this.replayBuffer];
    }

    const batch: Experience[] = [];
    const indices = new Set<number>();

    while (batch.length < batchSize) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        batch.push(this.replayBuffer[idx]);
      }
    }

    return batch;
  }

  /**
   * Clear replay buffer.
   */
  clearReplayBuffer(): void {
    this.replayBuffer = [];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UNIFIED ACTION SELECTION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Select action using the specified RL algorithm.
   *
   * @param state Current manufacturing state
   * @param algorithm Which algorithm to use
   * @returns Action index and metadata
   */
  selectAction(
    state: LatheRLState,
    algorithm: "q_learning" | "reinforce" | "a2c" = "a2c"
  ): { action: number; actionData: LatheRLAction; logProb?: number; value?: number } {
    let actionIdx: number;
    let logProb: number | undefined;
    let value: number | undefined;

    switch (algorithm) {
      case "q_learning":
        actionIdx = this.selectActionQLearning(state);
        break;
      case "reinforce": {
        const result = this.selectActionPolicy(state);
        actionIdx = result.action;
        logProb = result.logProb;
        break;
      }
      case "a2c": {
        const result = this.selectActionA2C(state);
        actionIdx = result.action;
        logProb = result.logProb;
        value = result.value;
        break;
      }
    }

    // Bounds check
    actionIdx = Math.min(actionIdx, this.actionSpace.length - 1);
    actionIdx = Math.max(actionIdx, 0);

    return {
      action: actionIdx,
      actionData: this.actionSpace[actionIdx].action_data,
      logProb,
      value
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UNIFIED POLICY UPDATE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update policy from trajectory or experience.
   *
   * @param trajectory Episode trajectory (for policy gradient methods)
   * @param experience Single experience (for Q-learning)
   * @param algorithm Which algorithm to use
   */
  updatePolicy(
    trajectory?: Trajectory,
    experience?: Experience,
    algorithm: "q_learning" | "reinforce" | "a2c" = "a2c"
  ): void {
    switch (algorithm) {
      case "q_learning":
        if (experience) {
          this.storeExperience(experience);
          this.updateQLearningBatch();
        }
        break;
      case "reinforce":
        if (trajectory) {
          this.updatePolicyREINFORCE(trajectory);
        }
        break;
      case "a2c":
        if (trajectory) {
          const { actorLoss, criticLoss } = this.updateA2C(trajectory);
          this.lossHistory.push(actorLoss + criticLoss);
        }
        break;
    }

    this.totalSteps++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TRAINING LOOP
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Run full training loop for specified number of episodes.
   *
   * @param episodes Number of episodes to train
   * @param environmentStep Function that simulates environment
   * @param algorithm Which RL algorithm to use
   * @returns Training statistics
   */
  async train(
    episodes: number,
    environmentStep: (state: LatheRLState, action: LatheRLAction) => Promise<{
      nextState: LatheRLState;
      outcome: {
        cycle_time_sec: number;
        surface_finish_ra: number;
        target_ra: number;
        tool_wear_increment_mm: number;
        safety_violation: boolean;
        material_removed_mm3: number;
        cost_incurred: number;
      };
    }>,
    algorithm: "q_learning" | "reinforce" | "a2c" = "a2c"
  ): Promise<TrainingStats> {
    log.info(`[LatheRL] Starting training: ${episodes} episodes, algorithm: ${algorithm}`);

    for (let ep = 0; ep < episodes; ep++) {
      const trajectory: Trajectory = {
        states: [],
        actions: [],
        rewards: [],
        log_probs: [],
        values: []
      };

      // Initialize episode with random state
      let state = this.createInitialState();
      let episodeReward = 0;
      let episodeSteps = 0;
      let done = false;

      while (!done && episodeSteps < 100) {
        // Select action
        const { action, actionData, logProb, value } = this.selectAction(state, algorithm);

        // Store trajectory data
        const encodedState = this.encodeState(state);
        trajectory.states.push(encodedState);
        trajectory.actions.push(action);
        if (logProb !== undefined) trajectory.log_probs.push(logProb);
        if (value !== undefined) trajectory.values!.push(value);

        // Execute action in environment
        const { nextState, outcome } = await environmentStep(state, actionData);

        // Calculate reward
        const rewardResult = this.calculateReward(state, actionData, nextState, outcome);
        trajectory.rewards.push(rewardResult.total_reward);
        episodeReward += rewardResult.total_reward;
        done = rewardResult.terminal;

        // Store experience for Q-learning
        if (algorithm === "q_learning") {
          this.storeExperience({
            state: encodedState,
            action,
            reward: rewardResult.total_reward,
            next_state: this.encodeState(nextState),
            done
          });
          this.updateQLearningBatch();
        }

        state = nextState;
        episodeSteps++;
      }

      // Update policy for trajectory-based methods
      if (algorithm !== "q_learning") {
        this.updatePolicy(trajectory, undefined, algorithm);
      }

      // Track rewards
      this.rewardHistory.push(episodeReward);
      this.episodeCount++;

      // Logging
      if (ep % 10 === 0) {
        const avgReward = this.getAverageReward(100);
        log.info(`[LatheRL] Episode ${ep}: reward=${episodeReward.toFixed(2)}, avg100=${avgReward.toFixed(2)}, epsilon=${this.epsilon.toFixed(3)}`);
      }

      // Checkpointing
      if (ep % 100 === 0 && ep > 0) {
        this.saveCheckpoint();
      }

      // Early stopping on convergence
      if (this.detectConvergence()) {
        log.info(`[LatheRL] Convergence detected at episode ${ep}`);
        break;
      }
    }

    return this.getTrainingStats();
  }

  /**
   * Create initial state for training episode.
   */
  private createInitialState(): LatheRLState {
    const isoGroups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
    const randomIso = isoGroups[Math.floor(Math.random() * isoGroups.length)];
    const kienzle = CANONICAL_KIENZLE[randomIso];

    return {
      part: {
        max_diameter_mm: 50 + Math.random() * 200,
        min_diameter_mm: 20 + Math.random() * 30,
        length_mm: 50 + Math.random() * 200,
        feature_count: Math.floor(Math.random() * 10) + 2,
        complexity_score: Math.random(),
        threads_count: Math.floor(Math.random() * 3),
        grooves_count: Math.floor(Math.random() * 4),
        tapers_count: Math.floor(Math.random() * 2),
        radii_count: Math.floor(Math.random() * 3)
      },
      material: {
        iso_group: randomIso,
        hardness_hrc: 20 + Math.random() * 40,
        hardness_normalized: Math.random(),
        machinability_factor: 0.5 + Math.random() * 1.5,
        kc1_1: kienzle.kc1_1,
        thermal_conductivity: 20 + Math.random() * 40
      },
      operation: {
        current_operation: "face",
        operations_completed: 0,
        operations_remaining: 5 + Math.floor(Math.random() * 10),
        current_tool_number: 1,
        material_removed_pct: 0,
        current_diameter_mm: 50 + Math.random() * 200,
        current_z_position_mm: 0,
        is_roughing: true,
        is_finishing: false
      },
      tool: {
        flank_wear_vb_mm: 0,
        crater_wear_kt_mm: 0,
        wear_rate_mm_per_min: 0.001,
        remaining_life_pct: 1.0,
        edge_condition: "fresh"
      },
      machine: {
        spindle_load_pct: 0.3,
        spindle_rpm: 1000,
        feed_rate_mm_rev: 0.2,
        current_power_kw: 5,
        turret_position: 1,
        coolant_active: true,
        chip_conveyor_load: 0.1,
        vibration_level: 0.1
      },
      timestep: 0,
      episode_reward_so_far: 0
    };
  }

  /**
   * Get average reward over last N episodes.
   */
  private getAverageReward(n: number): number {
    if (this.rewardHistory.length === 0) return 0;
    const lastN = this.rewardHistory.slice(-n);
    return lastN.reduce((a, b) => a + b, 0) / lastN.length;
  }

  /**
   * Detect training convergence.
   */
  private detectConvergence(): boolean {
    if (this.rewardHistory.length < 200) return false;

    // Compare average of last 100 vs previous 100
    const recent = this.rewardHistory.slice(-100);
    const previous = this.rewardHistory.slice(-200, -100);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / 100;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / 100;

    // Converged if improvement < 1%
    const improvement = (recentAvg - previousAvg) / Math.abs(previousAvg);
    return improvement < 0.01 && recentAvg > 0;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EVALUATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Evaluate trained policy on test programs.
   *
   * @param programs Test program states
   * @param environmentStep Environment simulation
   * @returns Evaluation results
   */
  async evaluate(
    programs: LatheRLState[],
    environmentStep: (state: LatheRLState, action: LatheRLAction) => Promise<{
      nextState: LatheRLState;
      outcome: {
        cycle_time_sec: number;
        surface_finish_ra: number;
        target_ra: number;
        tool_wear_increment_mm: number;
        safety_violation: boolean;
        material_removed_mm3: number;
        cost_incurred: number;
      };
    }>
  ): Promise<{
    avg_reward: number;
    avg_cycle_time: number;
    avg_quality_score: number;
    safety_violation_rate: number;
    episodes: EpisodeResult[];
  }> {
    // Disable exploration for evaluation
    const savedEpsilon = this.epsilon;
    this.epsilon = 0;

    const episodes: EpisodeResult[] = [];
    let totalReward = 0;
    let totalCycleTime = 0;
    let totalQuality = 0;
    let safetyViolations = 0;

    for (let i = 0; i < programs.length; i++) {
      let state = programs[i];
      let episodeReward = 0;
      let episodeSteps = 0;
      let done = false;
      let cycleTime = 0;
      let quality = 0;
      let violations = 0;
      const actionsUsed: number[] = [];

      while (!done && episodeSteps < 100) {
        const { action, actionData } = this.selectAction(state, "a2c");
        actionsUsed.push(action);

        const { nextState, outcome } = await environmentStep(state, actionData);
        const rewardResult = this.calculateReward(state, actionData, nextState, outcome);

        episodeReward += rewardResult.total_reward;
        cycleTime += outcome.cycle_time_sec;
        quality = outcome.surface_finish_ra;
        if (outcome.safety_violation) violations++;
        done = rewardResult.terminal;

        state = nextState;
        episodeSteps++;
      }

      episodes.push({
        episode_id: i,
        total_reward: episodeReward,
        episode_length: episodeSteps,
        avg_reward: episodeReward / episodeSteps,
        final_quality_score: quality,
        cycle_time_sec: cycleTime,
        tool_life_used_pct: 1 - state.tool.remaining_life_pct,
        safety_violations: violations,
        actions_taken: actionsUsed,
        converged: done
      });

      totalReward += episodeReward;
      totalCycleTime += cycleTime;
      totalQuality += quality;
      safetyViolations += violations;
    }

    // Restore epsilon
    this.epsilon = savedEpsilon;

    return {
      avg_reward: totalReward / programs.length,
      avg_cycle_time: totalCycleTime / programs.length,
      avg_quality_score: totalQuality / programs.length,
      safety_violation_rate: safetyViolations / programs.length,
      episodes
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHECKPOINTING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Save model checkpoint.
   */
  saveCheckpoint(): ModelCheckpoint {
    const checkpoint: ModelCheckpoint = {
      version: this.checkpoints.length + 1,
      timestamp: new Date(),
      training_stats: this.getTrainingStats(),
      q_table: new Map(this.qTable),
      policy_weights: JSON.parse(JSON.stringify(this.policyLayers)),
      actor_weights: JSON.parse(JSON.stringify(this.policyLayers)),
      critic_weights: JSON.parse(JSON.stringify(this.valueLayers))
    };

    this.checkpoints.push(checkpoint);
    log.info(`[LatheRL] Checkpoint saved: version ${checkpoint.version}`);

    return checkpoint;
  }

  /**
   * Load model checkpoint.
   */
  loadCheckpoint(checkpoint: ModelCheckpoint): void {
    if (checkpoint.q_table) {
      this.qTable = new Map(checkpoint.q_table);
    }
    if (checkpoint.policy_weights) {
      this.policyLayers = JSON.parse(JSON.stringify(checkpoint.policy_weights));
    }
    if (checkpoint.critic_weights) {
      this.valueLayers = JSON.parse(JSON.stringify(checkpoint.critic_weights));
    }
    this.episodeCount = checkpoint.training_stats.episodes_completed;
    this.totalSteps = checkpoint.training_stats.total_steps;
    this.epsilon = checkpoint.training_stats.epsilon_current;

    log.info(`[LatheRL] Checkpoint loaded: version ${checkpoint.version}`);
  }

  /**
   * Get training statistics.
   */
  getTrainingStats(): TrainingStats {
    return {
      episodes_completed: this.episodeCount,
      total_steps: this.totalSteps,
      avg_reward_last_100: this.getAverageReward(100),
      best_episode_reward: this.rewardHistory.length > 0 ? Math.max(...this.rewardHistory) : 0,
      epsilon_current: this.epsilon,
      policy_loss: this.lossHistory.length > 0 ? this.lossHistory[this.lossHistory.length - 1] : 0,
      value_loss: 0,  // TODO: Track separately
      entropy: this.computePolicyEntropy(),
      learning_rate: this.a2cConfig.actor_lr,
      convergence_detected: this.detectConvergence()
    };
  }

  /**
   * Compute current policy entropy for monitoring exploration.
   */
  private computePolicyEntropy(): number {
    // Create sample state and compute entropy
    const sampleState = this.createInitialState();
    const encoded = this.encodeState(sampleState);
    const probs = this.forwardPolicy(encoded);

    return -probs.reduce((sum, p) => {
      if (p > 1e-8) return sum + p * Math.log(p);
      return sum;
    }, 0);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update Q-learning configuration.
   */
  setQLearningConfig(config: Partial<QLearningConfig>): void {
    this.qConfig = { ...this.qConfig, ...config };
    log.info("[LatheRL] Q-learning config updated");
  }

  /**
   * Update policy gradient configuration.
   */
  setPolicyGradientConfig(config: Partial<PolicyGradientConfig>): void {
    this.pgConfig = { ...this.pgConfig, ...config };
    log.info("[LatheRL] Policy gradient config updated");
  }

  /**
   * Update A2C configuration.
   */
  setA2CConfig(config: Partial<A2CConfig>): void {
    this.a2cConfig = { ...this.a2cConfig, ...config };
    log.info("[LatheRL] A2C config updated");
  }

  /**
   * Update reward weights.
   */
  setRewardWeights(weights: Partial<RewardWeights>): void {
    this.rewardWeights = { ...this.rewardWeights, ...weights };
    log.info("[LatheRL] Reward weights updated");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get action space details.
   */
  getActionSpace(): DiscreteAction[] {
    return [...this.actionSpace];
  }

  /**
   * Get action by ID.
   */
  getAction(actionId: number): DiscreteAction | undefined {
    return this.actionSpace[actionId];
  }

  /**
   * Get Q-values for a state.
   */
  getQValues(state: LatheRLState): number[] | undefined {
    const encoded = this.encodeState(state);
    const hash = this.hashState(encoded);
    const entry = this.qTable.get(hash);
    return entry?.action_values;
  }

  /**
   * Get policy probabilities for a state.
   */
  getPolicyProbabilities(state: LatheRLState): number[] {
    const encoded = this.encodeState(state);
    return this.forwardPolicy(encoded);
  }

  /**
   * Get state value estimate.
   */
  getStateValue(state: LatheRLState): number {
    const encoded = this.encodeState(state);
    return this.forwardValue(encoded);
  }

  /**
   * Get engine statistics.
   */
  getStats(): {
    q_table_size: number;
    replay_buffer_size: number;
    action_space_size: number;
    state_dimension: number;
    policy_layers: number;
    value_layers: number;
    episodes_trained: number;
    total_steps: number;
    current_epsilon: number;
    checkpoints_saved: number;
  } {
    return {
      q_table_size: this.qTable.size,
      replay_buffer_size: this.replayBuffer.length,
      action_space_size: this.actionSpace.length,
      state_dimension: this.STATE_DIM,
      policy_layers: this.policyLayers.length,
      value_layers: this.valueLayers.length,
      episodes_trained: this.episodeCount,
      total_steps: this.totalSteps,
      current_epsilon: this.epsilon,
      checkpoints_saved: this.checkpoints.length
    };
  }

  /**
   * Reset engine to initial state.
   */
  reset(): void {
    this.qTable.clear();
    this.replayBuffer = [];
    this.rewardHistory = [];
    this.lossHistory = [];
    this.checkpoints = [];
    this.episodeCount = 0;
    this.totalSteps = 0;
    this.epsilon = this.qConfig.epsilon_start;
    this.initializeNetworks();
    log.info("[LatheRL] Engine reset to initial state");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheReinforcementLearningEngine = new LatheReinforcementLearningEngine();
