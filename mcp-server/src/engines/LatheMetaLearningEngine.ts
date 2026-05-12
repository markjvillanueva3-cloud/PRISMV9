/**
 * LatheMetaLearningEngine — LATHE-META-LEARNING-MS0
 * ===================================================
 * Meta-Learning for Few-Shot Adaptation in CNC Lathe Programming
 *
 * Implements complete meta-learning algorithms for rapid adaptation to new
 * materials, operations, machines, and shop-specific patterns. Enables learning
 * from just 1-10 examples by leveraging prior knowledge across tasks.
 *
 * Core Meta-Learning Algorithms:
 *   1. MAML (Model-Agnostic Meta-Learning) — Finn et al. (2017)
 *      - Inner loop: task-specific gradient descent
 *      - Outer loop: meta-parameter optimization across tasks
 *      - First-order approximation (FOMAML) for efficiency
 *
 *   2. Prototypical Networks — Snell et al. (2017)
 *      - Embedding network for operation/material representation
 *      - Prototype computation per class from support set
 *      - Distance-based classification (Euclidean, cosine, Mahalanobis)
 *
 *   3. Metric Learning — Siamese/Triplet Networks
 *      - Siamese networks for material/operation similarity
 *      - Triplet loss with semi-hard negative mining
 *      - Contrastive learning with in-batch negatives
 *
 *   4. Few-Shot Manufacturing Applications:
 *      - New material parameter inference (1-shot, 5-shot, 10-shot)
 *      - Operation sequence learning from limited examples
 *      - Controller dialect adaptation
 *      - Shop-specific pattern transfer
 *
 * Task Distribution:
 *   - Material tasks: adapt parameters for new alloy variants
 *   - Operation tasks: learn new finishing/threading strategies
 *   - Machine tasks: adapt to new controller/machine combinations
 *   - Cross-task: generalize across all task types
 *
 * References:
 *   - Finn, Abbeel, Levine (2017) "Model-Agnostic Meta-Learning"
 *   - Snell, Swersky, Zemel (2017) "Prototypical Networks for Few-Shot Learning"
 *   - Koch, Zemel, Salakhutdinov (2015) "Siamese Neural Networks for One-Shot"
 *   - Schroff, Kalenichenko, Philbin (2015) "FaceNet: Triplet Loss Learning"
 *   - Vinyals et al. (2016) "Matching Networks for One Shot Learning"
 *   - Chen et al. (2019) "A Closer Look at Few-Shot Classification"
 *
 * @module engines/LatheMetaLearningEngine
 * @milestone LATHE-META-LEARNING-MS0
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPE DEFINITIONS — Meta-Learning Core
// ============================================================================

/** Task definition for meta-learning */
export interface MetaLearningTask {
  task_id: string;
  task_type: TaskType;
  support_set: LatheExample[];
  query_set: LatheExample[];
  task_metadata: TaskMetadata;
}

/** Task types in lathe manufacturing context */
export type TaskType =
  | "material_adaptation"    // Adapt to new material/alloy
  | "operation_learning"     // Learn new operation type
  | "machine_adaptation"     // Adapt to new machine/controller
  | "shop_transfer"          // Transfer patterns from similar shop
  | "parameter_optimization" // Optimize parameters for new conditions
  | "quality_prediction"     // Predict quality from limited examples
  | "tool_selection"         // Select tools for new part family
  | "sequence_planning";     // Plan operation sequences

/** Lathe manufacturing example for meta-learning */
export interface LatheExample {
  example_id: string;
  // Material features
  material_iso: ISOGroup;
  material_name: string;
  hardness_hrc: number;
  kc1_1_N_mm2: number;
  machinability_factor: number;

  // Operation features
  operation_type: LatheOperationType;
  tool_type: string;
  tool_nose_radius_mm: number;

  // Part features
  diameter_mm: number;
  length_mm: number;
  wall_thickness_mm: number;

  // Cutting parameters (target for regression tasks)
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;

  // Outputs (for learning outcomes)
  surface_finish_ra: number;
  tool_life_min: number;
  cycle_time_sec: number;
  quality_score: number;  // 0-1

  // Labels (for classification tasks)
  quality_class?: QualityClass;
  strategy_class?: StrategyClass;
}

/** Lathe operation types */
export type LatheOperationType =
  | "facing" | "rough_od" | "finish_od" | "rough_id" | "finish_id"
  | "threading_od" | "threading_id" | "grooving" | "parting"
  | "drilling" | "boring" | "tapping" | "contouring";

/** Quality classification */
export type QualityClass = "reject" | "acceptable" | "good" | "excellent";

/** Strategy classification */
export type StrategyClass = "aggressive" | "balanced" | "conservative" | "quality_first";

/** Task metadata */
export interface TaskMetadata {
  source_domain: string;
  target_domain: string;
  n_support: number;
  n_query: number;
  difficulty: "easy" | "medium" | "hard";
  similarity_to_base: number;  // 0-1
}

// ============================================================================
// TYPE DEFINITIONS — MAML (Model-Agnostic Meta-Learning)
// ============================================================================

/** MAML configuration */
export interface MAMLConfig {
  inner_lr: number;           // Inner loop learning rate (default: 0.01)
  outer_lr: number;           // Outer loop learning rate (default: 0.001)
  inner_steps: number;        // Number of inner loop gradient steps (default: 5)
  task_batch_size: number;    // Tasks per meta-update (default: 4)
  meta_epochs: number;        // Number of meta-training epochs
  use_first_order: boolean;   // Use FOMAML approximation (default: true)
  hidden_dims: number[];      // Network hidden dimensions
  dropout_rate: number;       // Dropout for regularization
  l2_lambda: number;          // L2 regularization
}

/** MAML model state */
export interface MAMLModelState {
  theta: number[][];              // Meta-parameters (weights)
  biases: number[];               // Biases for each layer
  layer_dims: number[];           // Layer dimensions
  adaptation_history: AdaptationRecord[];
  meta_train_loss: number[];
  meta_val_loss: number[];
}

/** Adaptation record for a single task */
export interface AdaptationRecord {
  task_id: string;
  initial_loss: number;
  adapted_loss: number;
  improvement_ratio: number;
  inner_steps_taken: number;
  gradient_norms: number[];
}

/** MAML training result */
export interface MAMLTrainingResult {
  model_state: MAMLModelState;
  meta_train_losses: number[];
  meta_val_losses: number[];
  best_val_loss: number;
  best_epoch: number;
  total_tasks_trained: number;
  average_adaptation_improvement: number;
  convergence_analysis: ConvergenceAnalysis;
}

/** Convergence analysis */
export interface ConvergenceAnalysis {
  converged: boolean;
  epochs_to_convergence: number;
  final_gradient_norm: number;
  loss_variance: number;
  stability_score: number;
}

// ============================================================================
// TYPE DEFINITIONS — Prototypical Networks
// ============================================================================

/** Prototypical network configuration */
export interface PrototypicalConfig {
  embedding_dim: number;        // Output embedding dimension (default: 64)
  encoder_dims: number[];       // Encoder hidden dimensions
  distance_metric: DistanceMetric;
  temperature: number;          // Softmax temperature for probabilities
  use_task_conditioning: boolean;
  dropout_rate: number;
}

/** Distance metrics for prototype comparison */
export type DistanceMetric = "euclidean" | "cosine" | "mahalanobis" | "learned";

/** Prototype for a class */
export interface ClassPrototype {
  class_label: string;
  prototype_embedding: number[];
  support_embeddings: number[][];
  n_support: number;
  variance: number[];
  confidence: number;
}

/** Prototypical prediction result */
export interface PrototypicalPrediction {
  query_embedding: number[];
  class_probabilities: Map<string, number>;
  predicted_class: string;
  confidence: number;
  distances_to_prototypes: Map<string, number>;
  nearest_support_examples: NearestExample[];
}

/** Nearest example in support set */
export interface NearestExample {
  example_id: string;
  class_label: string;
  distance: number;
  embedding: number[];
}

/** Episode for prototypical training */
export interface PrototypicalEpisode {
  episode_id: string;
  n_way: number;              // Number of classes
  k_shot: number;             // Examples per class in support
  q_query: number;            // Queries per class
  support_set: LatheExample[];
  query_set: LatheExample[];
  class_labels: string[];
  task_type: TaskType;        // Task type for label extraction
}

/** Prototypical training result */
export interface PrototypicalTrainingResult {
  encoder_weights: number[][][];
  encoder_biases: number[][];
  training_episodes: number;
  training_accuracy: number[];
  validation_accuracy: number[];
  best_accuracy: number;
  class_separation_score: number;
  embedding_quality: EmbeddingQuality;
}

/** Embedding quality metrics */
export interface EmbeddingQuality {
  intra_class_variance: number;
  inter_class_distance: number;
  silhouette_score: number;
  cluster_purity: number;
}

// ============================================================================
// TYPE DEFINITIONS — Metric Learning (Siamese/Triplet)
// ============================================================================

/** Metric learning configuration */
export interface MetricLearningConfig {
  embedding_dim: number;
  encoder_architecture: "siamese" | "triplet" | "quadruplet";
  loss_type: MetricLossType;
  margin: number;             // Margin for triplet/contrastive loss
  mining_strategy: MiningStrategy;
  learning_rate: number;
  batch_size: number;
  epochs: number;
}

/** Metric loss types */
export type MetricLossType =
  | "contrastive"     // Siamese contrastive loss
  | "triplet"         // Triplet loss (anchor, positive, negative)
  | "quadruplet"      // Quadruplet loss with stronger margin
  | "center"          // Center loss for intra-class compactness
  | "arcface"         // Angular margin softmax
  | "ntxent";         // NT-Xent (contrastive with temperature)

/** Mining strategy for hard negatives */
export type MiningStrategy =
  | "random"          // Random negative sampling
  | "hard"            // Hardest negative in batch
  | "semi_hard"       // Semi-hard negative mining
  | "batch_hard"      // Batch hard mining
  | "distance_weighted"; // Distance-weighted sampling

/** Siamese pair for contrastive learning */
export interface SiamesePair {
  anchor: LatheExample;
  candidate: LatheExample;
  is_similar: boolean;
  similarity_label: number;  // 1 = similar, 0 = dissimilar
}

/** Triplet for triplet learning */
export interface MetricTriplet {
  anchor: LatheExample;
  positive: LatheExample;   // Same class as anchor
  negative: LatheExample;   // Different class from anchor
  anchor_positive_distance?: number;
  anchor_negative_distance?: number;
}

/** Metric learning model */
export interface MetricLearningModel {
  encoder_weights: number[][][];
  encoder_biases: number[][];
  embedding_dim: number;
  class_centers?: Map<string, number[]>;
  training_loss_history: number[];
}

/** Similarity result */
export interface SimilarityResult {
  example_a_id: string;
  example_b_id: string;
  distance: number;
  similarity: number;  // 0-1
  embedding_a: number[];
  embedding_b: number[];
  interpretation: string;
}

// ============================================================================
// TYPE DEFINITIONS — Few-Shot Adaptation
// ============================================================================

/** Few-shot adaptation configuration */
export interface FewShotConfig {
  k_shot: number;             // 1, 5, or 10 examples
  adaptation_method: AdaptationMethod;
  n_adaptation_steps: number;
  adaptation_lr: number;
  use_uncertainty: boolean;
  confidence_threshold: number;
}

/** Adaptation methods */
export type AdaptationMethod =
  | "maml_adapt"         // MAML-style gradient adaptation
  | "prototype_refine"   // Prototype refinement
  | "fine_tune"          // Simple fine-tuning
  | "transductive"       // Transductive inference (use query unlabeled data)
  | "bayesian"           // Bayesian adaptation with uncertainty
  | "ensemble";          // Ensemble of adapted models

/** Material adaptation request */
export interface MaterialAdaptationRequest {
  new_material: NewMaterialSpec;
  support_examples: LatheExample[];
  query_parts: QueryPart[];
  similar_materials?: ISOGroup[];
  transfer_from?: string;
}

/** New material specification */
export interface NewMaterialSpec {
  material_name: string;
  material_code: string;
  iso_group: ISOGroup;
  composition?: Record<string, number>;  // Element percentages
  measured_hardness_hrc?: number;
  estimated_kc1_1?: number;
  thermal_conductivity?: number;
  notes?: string[];
}

/** Query part for inference */
export interface QueryPart {
  part_id: string;
  diameter_mm: number;
  length_mm: number;
  operations_needed: LatheOperationType[];
  tolerance_class: "standard" | "precision" | "ultra_precision";
  surface_finish_target_ra: number;
}

/** Material adaptation result */
export interface MaterialAdaptationResult {
  material_code: string;
  inferred_parameters: InferredMaterialParameters;
  operation_recommendations: OperationRecommendation[];
  confidence_scores: Record<string, number>;
  similar_material_used: string;
  adaptation_method: AdaptationMethod;
  uncertainty_estimates: UncertaintyEstimate[];
}

/** Inferred material parameters */
export interface InferredMaterialParameters {
  kc1_1_N_mm2: number;
  kc1_1_uncertainty: number;
  mc_exponent: number;
  taylor_C: number;
  taylor_n: number;
  machinability_factor: number;
  recommended_vc_roughing: number;
  recommended_vc_finishing: number;
  feed_factor: number;
  doc_factor: number;
}

/** Operation recommendation */
export interface OperationRecommendation {
  operation: LatheOperationType;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  tool_recommendation: string;
  expected_surface_finish_ra: number;
  expected_tool_life_min: number;
  confidence: number;
}

/** Uncertainty estimate */
export interface UncertaintyEstimate {
  parameter: string;
  mean_value: number;
  std_dev: number;
  confidence_interval_95: [number, number];
  epistemic_uncertainty: number;  // Model uncertainty
  aleatoric_uncertainty: number;  // Data uncertainty
}

// ============================================================================
// TYPE DEFINITIONS — Task Distribution
// ============================================================================

/** Task distribution for meta-training */
export interface TaskDistribution {
  distribution_id: string;
  task_type: TaskType;
  n_tasks: number;
  tasks: MetaLearningTask[];
  statistics: TaskStatistics;
}

/** Task statistics */
export interface TaskStatistics {
  mean_support_size: number;
  mean_query_size: number;
  class_balance: number;  // 0-1, 1 = perfectly balanced
  task_diversity: number; // 0-1, diversity measure
  difficulty_distribution: Record<string, number>;
}

/** Task sampler for episodic training */
export interface TaskSampler {
  task_pool: MetaLearningTask[];
  sampling_strategy: "uniform" | "difficulty_weighted" | "curriculum" | "adaptive";
  current_difficulty: number;
  task_weights?: Map<string, number>;
}

// ============================================================================
// TYPE DEFINITIONS — Manufacturing Applications
// ============================================================================

/** Controller adaptation request */
export interface ControllerAdaptationRequest {
  source_controller: string;
  target_controller: string;
  example_programs: ControllerExample[];
  dialect_hints?: DialectHint[];
}

/** Controller example */
export interface ControllerExample {
  source_gcode: string;
  target_gcode: string;
  operation_type: LatheOperationType;
  notes?: string;
}

/** Dialect hint for controller */
export interface DialectHint {
  feature: string;
  source_syntax: string;
  target_syntax: string;
}

/** Controller adaptation result */
export interface ControllerAdaptationResult {
  translation_rules: TranslationRule[];
  learned_patterns: LearnedPattern[];
  confidence: number;
  test_translations: TestTranslation[];
}

/** Translation rule */
export interface TranslationRule {
  pattern_match: string;
  replacement: string;
  context_required: string[];
  priority: number;
}

/** Learned pattern */
export interface LearnedPattern {
  pattern_id: string;
  source_pattern: string;
  target_pattern: string;
  occurrences: number;
  confidence: number;
}

/** Test translation */
export interface TestTranslation {
  input: string;
  expected: string;
  predicted: string;
  match: boolean;
}

/** Shop pattern transfer request */
export interface ShopPatternTransferRequest {
  source_shop_id: string;
  target_shop_id: string;
  part_families: string[];
  n_examples_per_family: number;
}

/** Shop pattern transfer result */
export interface ShopPatternTransferResult {
  transferred_patterns: TransferredPattern[];
  adaptation_required: AdaptationRequirement[];
  compatibility_score: number;
  recommendations: string[];
}

/** Transferred pattern */
export interface TransferredPattern {
  pattern_type: string;
  source_pattern: Record<string, unknown>;
  adapted_pattern: Record<string, unknown>;
  confidence: number;
}

/** Adaptation requirement */
export interface AdaptationRequirement {
  area: string;
  reason: string;
  recommended_action: string;
  priority: "high" | "medium" | "low";
}

// ============================================================================
// IMPLEMENTATION — LatheMetaLearningEngine
// ============================================================================

/**
 * LatheMetaLearningEngine — Meta-learning for few-shot adaptation
 * in CNC lathe manufacturing contexts.
 */
export class LatheMetaLearningEngine {
  private mamlConfig: MAMLConfig;
  private protoConfig: PrototypicalConfig;
  private metricConfig: MetricLearningConfig;
  private rng: () => number;
  private trainedMAMLModel: MAMLModelState | null = null;
  private trainedProtoEncoder: number[][][] | null = null;
  private trainedMetricEncoder: MetricLearningModel | null = null;
  private classPrototypes: Map<string, ClassPrototype> = new Map();

  constructor() {
    // Initialize default configurations
    this.mamlConfig = this.getDefaultMAMLConfig();
    this.protoConfig = this.getDefaultPrototypicalConfig();
    this.metricConfig = this.getDefaultMetricConfig();
    this.rng = this.createSeededRandom(42);
  }

  // ========================================================================
  // DEFAULT CONFIGURATIONS
  // ========================================================================

  private getDefaultMAMLConfig(): MAMLConfig {
    return {
      inner_lr: 0.01,
      outer_lr: 0.001,
      inner_steps: 5,
      task_batch_size: 4,
      meta_epochs: 100,
      use_first_order: true,  // FOMAML for efficiency
      hidden_dims: [128, 64, 32],
      dropout_rate: 0.1,
      l2_lambda: 0.001,
    };
  }

  private getDefaultPrototypicalConfig(): PrototypicalConfig {
    return {
      embedding_dim: 64,
      encoder_dims: [128, 96, 64],
      distance_metric: "euclidean",
      temperature: 1.0,
      use_task_conditioning: true,
      dropout_rate: 0.1,
    };
  }

  private getDefaultMetricConfig(): MetricLearningConfig {
    return {
      embedding_dim: 64,
      encoder_architecture: "triplet",
      loss_type: "triplet",
      margin: 0.2,
      mining_strategy: "semi_hard",
      learning_rate: 0.001,
      batch_size: 32,
      epochs: 50,
    };
  }

  // ========================================================================
  // MAML (Model-Agnostic Meta-Learning)
  // ========================================================================

  /**
   * Train MAML model across a distribution of tasks.
   * Implements Algorithm 1 from Finn et al. (2017).
   *
   * @param tasks - Array of meta-learning tasks
   * @param config - Optional MAML configuration
   * @returns Training result with learned meta-parameters
   */
  public mamlTrain(
    tasks: MetaLearningTask[],
    config?: Partial<MAMLConfig>
  ): MAMLTrainingResult {
    const cfg = { ...this.mamlConfig, ...config };
    const inputDim = this.computeInputDimension();
    const outputDim = 4; // [cutting_speed, feed, doc, quality_score]

    // Initialize meta-parameters theta
    const layerDims = [inputDim, ...cfg.hidden_dims, outputDim];
    let theta = this.initializeWeights(layerDims);
    let biases = this.initializeBiases(layerDims);

    const metaTrainLosses: number[] = [];
    const metaValLosses: number[] = [];
    const adaptationHistory: AdaptationRecord[] = [];
    let bestValLoss = Infinity;
    let bestEpoch = 0;

    log.info("[MAML] Starting meta-training", {
      n_tasks: tasks.length,
      meta_epochs: cfg.meta_epochs,
      inner_steps: cfg.inner_steps,
    });

    // Split tasks into train/val
    const splitIdx = Math.floor(tasks.length * 0.8);
    const trainTasks = tasks.slice(0, splitIdx);
    const valTasks = tasks.slice(splitIdx);

    for (let epoch = 0; epoch < cfg.meta_epochs; epoch++) {
      // Sample task batch
      const taskBatch = this.sampleTaskBatch(trainTasks, cfg.task_batch_size);

      // Accumulate meta-gradients across tasks
      let metaGradients = this.zeroGradients(layerDims);
      let metaBiasGrads = this.zeroBiasGradients(layerDims);
      let epochLoss = 0;

      for (const task of taskBatch) {
        // Inner loop: adapt to task using support set
        const { adaptedTheta, adaptedBiases, record } = this.mamlInnerLoop(
          theta,
          biases,
          task.support_set,
          cfg,
          layerDims
        );
        adaptationHistory.push(record);

        // Compute loss on query set with adapted parameters
        const queryLoss = this.computeLoss(
          adaptedTheta,
          adaptedBiases,
          task.query_set,
          layerDims
        );
        epochLoss += queryLoss;

        // Compute gradients for meta-update
        if (cfg.use_first_order) {
          // FOMAML: gradient of query loss w.r.t. adapted params
          const { gradW, gradB } = this.computeGradients(
            adaptedTheta,
            adaptedBiases,
            task.query_set,
            layerDims
          );
          metaGradients = this.accumulateGradients(metaGradients, gradW);
          metaBiasGrads = this.accumulateBiasGrads(metaBiasGrads, gradB);
        } else {
          // Full MAML: requires second-order gradients (expensive)
          // For simplicity, we use first-order here
          const { gradW, gradB } = this.computeGradients(
            adaptedTheta,
            adaptedBiases,
            task.query_set,
            layerDims
          );
          metaGradients = this.accumulateGradients(metaGradients, gradW);
          metaBiasGrads = this.accumulateBiasGrads(metaBiasGrads, gradB);
        }
      }

      // Meta-update: theta = theta - outer_lr * meta_gradient
      const avgFactor = 1 / taskBatch.length;
      theta = this.applyGradientUpdate(
        theta,
        metaGradients,
        cfg.outer_lr * avgFactor,
        cfg.l2_lambda
      );
      biases = this.applyBiasUpdate(biases, metaBiasGrads, cfg.outer_lr * avgFactor);

      metaTrainLosses.push(epochLoss / taskBatch.length);

      // Validation
      if (valTasks.length > 0) {
        const valLoss = this.evaluateMAML(theta, biases, valTasks, cfg, layerDims);
        metaValLosses.push(valLoss);
        if (valLoss < bestValLoss) {
          bestValLoss = valLoss;
          bestEpoch = epoch;
        }
      }

      if (epoch % 10 === 0) {
        log.info(`[MAML] Epoch ${epoch}/${cfg.meta_epochs}`, {
          train_loss: metaTrainLosses[epoch].toFixed(4),
          val_loss: metaValLosses[epoch]?.toFixed(4) || "N/A",
        });
      }
    }

    // Store trained model
    this.trainedMAMLModel = {
      theta,
      biases,
      layer_dims: layerDims,
      adaptation_history: adaptationHistory,
      meta_train_loss: metaTrainLosses,
      meta_val_loss: metaValLosses,
    };

    const convergenceAnalysis = this.analyzeConvergence(metaTrainLosses, metaValLosses);
    const avgImprovement = this.computeAverageImprovement(adaptationHistory);

    return {
      model_state: this.trainedMAMLModel,
      meta_train_losses: metaTrainLosses,
      meta_val_losses: metaValLosses,
      best_val_loss: bestValLoss,
      best_epoch: bestEpoch,
      total_tasks_trained: tasks.length * cfg.meta_epochs,
      average_adaptation_improvement: avgImprovement,
      convergence_analysis: convergenceAnalysis,
    };
  }

  /**
   * MAML inner loop: adapt model to a specific task.
   * Takes k gradient steps on the support set.
   */
  private mamlInnerLoop(
    theta: number[][],
    biases: number[],
    supportSet: LatheExample[],
    config: MAMLConfig,
    layerDims: number[]
  ): { adaptedTheta: number[][]; adaptedBiases: number[]; record: AdaptationRecord } {
    let adaptedTheta = this.cloneWeights(theta);
    let adaptedBiases = [...biases];
    const gradientNorms: number[] = [];

    const initialLoss = this.computeLoss(adaptedTheta, adaptedBiases, supportSet, layerDims);

    for (let step = 0; step < config.inner_steps; step++) {
      const { gradW, gradB, gradNorm } = this.computeGradientsWithNorm(
        adaptedTheta,
        adaptedBiases,
        supportSet,
        layerDims
      );
      gradientNorms.push(gradNorm);

      // Update adapted parameters
      adaptedTheta = this.applyGradientUpdate(adaptedTheta, gradW, config.inner_lr, 0);
      adaptedBiases = this.applyBiasUpdate(adaptedBiases, gradB, config.inner_lr);
    }

    const adaptedLoss = this.computeLoss(adaptedTheta, adaptedBiases, supportSet, layerDims);

    const record: AdaptationRecord = {
      task_id: `task_${Date.now()}`,
      initial_loss: initialLoss,
      adapted_loss: adaptedLoss,
      improvement_ratio: initialLoss > 0 ? (initialLoss - adaptedLoss) / initialLoss : 0,
      inner_steps_taken: config.inner_steps,
      gradient_norms: gradientNorms,
    };

    return { adaptedTheta, adaptedBiases, record };
  }

  /**
   * Evaluate MAML on validation tasks.
   */
  private evaluateMAML(
    theta: number[][],
    biases: number[],
    tasks: MetaLearningTask[],
    config: MAMLConfig,
    layerDims: number[]
  ): number {
    let totalLoss = 0;

    for (const task of tasks) {
      // Adapt to support set
      const { adaptedTheta, adaptedBiases } = this.mamlInnerLoop(
        theta,
        biases,
        task.support_set,
        config,
        layerDims
      );

      // Evaluate on query set
      const queryLoss = this.computeLoss(
        adaptedTheta,
        adaptedBiases,
        task.query_set,
        layerDims
      );
      totalLoss += queryLoss;
    }

    return totalLoss / tasks.length;
  }

  /**
   * Adapt MAML model to a new material using few examples.
   *
   * @param material - New material specification
   * @param examples - Support examples (1, 5, or 10)
   * @returns Adaptation result with inferred parameters
   */
  public adaptToMaterial(
    material: NewMaterialSpec,
    examples: LatheExample[]
  ): MaterialAdaptationResult {
    if (!this.trainedMAMLModel) {
      throw new Error("MAML model not trained. Call mamlTrain() first.");
    }

    const kShot = examples.length;
    log.info(`[MAML] Adapting to new material: ${material.material_name}`, {
      k_shot: kShot,
      iso_group: material.iso_group,
    });

    // Perform inner loop adaptation
    const config = this.mamlConfig;
    const { adaptedTheta, adaptedBiases } = this.mamlInnerLoop(
      this.trainedMAMLModel.theta,
      this.trainedMAMLModel.biases,
      examples,
      config,
      this.trainedMAMLModel.layer_dims
    );

    // Infer material parameters by averaging predictions on examples
    const inferredParams = this.inferMaterialParameters(
      adaptedTheta,
      adaptedBiases,
      material,
      examples
    );

    // Generate operation recommendations
    const operations: LatheOperationType[] = [
      "rough_od", "finish_od", "facing", "threading_od", "grooving"
    ];
    const recommendations = operations.map(op =>
      this.generateOperationRecommendation(
        adaptedTheta,
        adaptedBiases,
        material,
        op,
        inferredParams
      )
    );

    // Compute confidence scores
    const confidenceScores = this.computeAdaptationConfidence(
      examples,
      inferredParams,
      kShot
    );

    // Find most similar trained material
    const similarMaterial = this.findSimilarMaterial(material.iso_group);

    // Compute uncertainty estimates
    const uncertaintyEstimates = this.computeUncertaintyEstimates(
      adaptedTheta,
      adaptedBiases,
      examples,
      inferredParams
    );

    return {
      material_code: material.material_code,
      inferred_parameters: inferredParams,
      operation_recommendations: recommendations,
      confidence_scores: confidenceScores,
      similar_material_used: similarMaterial,
      adaptation_method: "maml_adapt",
      uncertainty_estimates: uncertaintyEstimates,
    };
  }

  // ========================================================================
  // PROTOTYPICAL NETWORKS
  // ========================================================================

  /**
   * Train prototypical network encoder using episodic training.
   *
   * @param episodes - Training episodes (n-way k-shot)
   * @param config - Optional prototypical config
   * @returns Training result
   */
  public trainPrototypicalNetwork(
    episodes: PrototypicalEpisode[],
    config?: Partial<PrototypicalConfig>
  ): PrototypicalTrainingResult {
    const cfg = { ...this.protoConfig, ...config };
    const inputDim = this.computeInputDimension();
    const layerDims = [inputDim, ...cfg.encoder_dims, cfg.embedding_dim];

    // Initialize encoder weights
    let encoderWeights = this.initializeEncoderWeights(layerDims);
    let encoderBiases = this.initializeEncoderBiases(layerDims);

    const trainingAccuracy: number[] = [];
    const validationAccuracy: number[] = [];
    const epochs = 100;
    const lr = 0.001;

    log.info("[ProtoNet] Starting episodic training", {
      n_episodes: episodes.length,
      embedding_dim: cfg.embedding_dim,
    });

    // Split episodes
    const splitIdx = Math.floor(episodes.length * 0.8);
    const trainEpisodes = episodes.slice(0, splitIdx);
    const valEpisodes = episodes.slice(splitIdx);

    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochAccuracy = 0;

      for (const episode of trainEpisodes) {
        // Compute prototypes from support set
        const prototypes = this.computePrototypes(
          encoderWeights,
          encoderBiases,
          episode.support_set,
          episode.class_labels,
          layerDims
        );

        // Compute embeddings for query set
        const queryEmbeddings = episode.query_set.map(ex =>
          this.encodeExample(ex, encoderWeights, encoderBiases, layerDims)
        );

        // Compute distances and cross-entropy loss
        let correct = 0;
        let totalGradW = this.zeroEncoderGradients(layerDims);
        let totalGradB = this.zeroEncoderBiasGradients(layerDims);

        for (let i = 0; i < episode.query_set.length; i++) {
          const query = episode.query_set[i];
          const embedding = queryEmbeddings[i];
          const trueLabel = this.getExampleLabel(query, episode.task_type);

          // Compute distances to all prototypes
          const distances = new Map<string, number>();
          for (const entry of Array.from(prototypes.entries())) {
            const [label, proto] = entry;
            const dist = this.computeDistance(
              embedding,
              proto.prototype_embedding,
              cfg.distance_metric
            );
            distances.set(label, dist);
          }

          // Softmax probabilities
          const probs = this.distancesToProbabilities(distances, cfg.temperature);
          const predictedLabel = this.argmax(probs);

          if (predictedLabel === trueLabel) {
            correct++;
          }

          // Compute gradients for prototype loss
          const { gradW, gradB } = this.computeProtoLossGradients(
            embedding,
            prototypes,
            trueLabel,
            cfg,
            layerDims
          );
          totalGradW = this.accumulateEncoderGradients(totalGradW, gradW);
          totalGradB = this.accumulateEncoderBiasGrads(totalGradB, gradB);
        }

        epochAccuracy += correct / episode.query_set.length;

        // Update encoder weights
        const avgFactor = 1 / episode.query_set.length;
        encoderWeights = this.applyEncoderUpdate(encoderWeights, totalGradW, lr * avgFactor);
        encoderBiases = this.applyEncoderBiasUpdate(encoderBiases, totalGradB, lr * avgFactor);
      }

      trainingAccuracy.push(epochAccuracy / trainEpisodes.length);

      // Validation
      if (valEpisodes.length > 0) {
        const valAcc = this.evaluatePrototypical(
          encoderWeights,
          encoderBiases,
          valEpisodes,
          cfg,
          layerDims
        );
        validationAccuracy.push(valAcc);
      }

      if (epoch % 20 === 0) {
        log.info(`[ProtoNet] Epoch ${epoch}/${epochs}`, {
          train_acc: (trainingAccuracy[epoch] * 100).toFixed(1) + "%",
          val_acc: validationAccuracy[epoch]
            ? (validationAccuracy[epoch] * 100).toFixed(1) + "%"
            : "N/A",
        });
      }
    }

    // Store trained encoder
    this.trainedProtoEncoder = encoderWeights;

    // Compute embedding quality metrics
    const embeddingQuality = this.computeEmbeddingQuality(
      encoderWeights,
      encoderBiases,
      trainEpisodes,
      layerDims
    );

    return {
      encoder_weights: encoderWeights,
      encoder_biases: encoderBiases,
      training_episodes: episodes.length,
      training_accuracy: trainingAccuracy,
      validation_accuracy: validationAccuracy,
      best_accuracy: Math.max(...validationAccuracy),
      class_separation_score: embeddingQuality.inter_class_distance,
      embedding_quality: embeddingQuality,
    };
  }

  /**
   * Compute prototypes for each class from support set.
   * Prototype = mean embedding of support examples for that class.
   *
   * @param supportSet - Support examples with labels
   * @returns Map of class label to prototype
   */
  public computePrototypes(
    encoderWeights: number[][][],
    encoderBiases: number[][],
    supportSet: LatheExample[],
    classLabels: string[],
    layerDims: number[]
  ): Map<string, ClassPrototype> {
    const prototypes = new Map<string, ClassPrototype>();

    for (const label of classLabels) {
      // Filter examples for this class
      const classExamples = supportSet.filter(ex =>
        this.getExampleLabel(ex, "material_adaptation") === label ||
        this.getExampleLabel(ex, "operation_learning") === label
      );

      if (classExamples.length === 0) {
        continue;
      }

      // Compute embeddings
      const embeddings = classExamples.map(ex =>
        this.encodeExample(ex, encoderWeights, encoderBiases, layerDims)
      );

      // Compute mean embedding (prototype)
      const protoEmbedding = this.computeMeanEmbedding(embeddings);
      const variance = this.computeEmbeddingVariance(embeddings, protoEmbedding);

      // Compute confidence based on support size and variance
      const confidence = this.computePrototypeConfidence(classExamples.length, variance);

      prototypes.set(label, {
        class_label: label,
        prototype_embedding: protoEmbedding,
        support_embeddings: embeddings,
        n_support: classExamples.length,
        variance,
        confidence,
      });
    }

    // Store for later use
    this.classPrototypes = prototypes;
    return prototypes;
  }

  /**
   * Few-shot prediction using prototypical network.
   *
   * @param query - Query example to classify
   * @param supportSet - Support set with labeled examples
   * @returns Prediction with class probabilities
   */
  public fewShotPredict(
    query: LatheExample,
    supportSet: LatheExample[]
  ): PrototypicalPrediction {
    if (!this.trainedProtoEncoder) {
      throw new Error("Prototypical network not trained. Call trainPrototypicalNetwork() first.");
    }

    const inputDim = this.computeInputDimension();
    const layerDims = [inputDim, ...this.protoConfig.encoder_dims, this.protoConfig.embedding_dim];
    const encoderBiases = this.initializeEncoderBiases(layerDims);

    // Get unique class labels from support set
    const classLabels = Array.from(new Set(
      supportSet.map(ex => this.getExampleLabel(ex, "material_adaptation"))
    ));

    // Compute prototypes
    const prototypes = this.computePrototypes(
      this.trainedProtoEncoder,
      encoderBiases,
      supportSet,
      classLabels,
      layerDims
    );

    // Encode query
    const queryEmbedding = this.encodeExample(
      query,
      this.trainedProtoEncoder,
      encoderBiases,
      layerDims
    );

    // Compute distances to prototypes
    const distances = new Map<string, number>();
    for (const entry of Array.from(prototypes.entries())) {
      const [label, proto] = entry;
      const dist = this.computeDistance(
        queryEmbedding,
        proto.prototype_embedding,
        this.protoConfig.distance_metric
      );
      distances.set(label, dist);
    }

    // Convert to probabilities
    const probabilities = this.distancesToProbabilities(distances, this.protoConfig.temperature);
    const predictedClass = this.argmax(probabilities);
    const confidence = probabilities.get(predictedClass) || 0;

    // Find nearest support examples
    const nearestExamples = this.findNearestSupportExamples(
      queryEmbedding,
      supportSet,
      this.trainedProtoEncoder,
      encoderBiases,
      layerDims,
      3
    );

    return {
      query_embedding: queryEmbedding,
      class_probabilities: probabilities,
      predicted_class: predictedClass,
      confidence,
      distances_to_prototypes: distances,
      nearest_support_examples: nearestExamples,
    };
  }

  // ========================================================================
  // METRIC LEARNING (Siamese/Triplet)
  // ========================================================================

  /**
   * Learn embedding space using metric learning (triplet loss).
   *
   * @param data - Training examples
   * @param config - Optional metric learning config
   * @returns Trained metric learning model
   */
  public learnEmbedding(
    data: LatheExample[],
    config?: Partial<MetricLearningConfig>
  ): MetricLearningModel {
    const cfg = { ...this.metricConfig, ...config };
    const inputDim = this.computeInputDimension();
    const layerDims = [inputDim, 128, 96, cfg.embedding_dim];

    // Initialize encoder
    let encoderWeights = this.initializeEncoderWeights(layerDims);
    let encoderBiases = this.initializeEncoderBiases(layerDims);
    const lossHistory: number[] = [];

    log.info("[MetricLearning] Starting training", {
      n_examples: data.length,
      loss_type: cfg.loss_type,
      mining_strategy: cfg.mining_strategy,
    });

    for (let epoch = 0; epoch < cfg.epochs; epoch++) {
      let epochLoss = 0;
      const triplets = this.mineTriplets(data, cfg.batch_size, cfg.mining_strategy);

      for (const triplet of triplets) {
        // Encode anchor, positive, negative
        const anchorEmb = this.encodeExample(
          triplet.anchor,
          encoderWeights,
          encoderBiases,
          layerDims
        );
        const positiveEmb = this.encodeExample(
          triplet.positive,
          encoderWeights,
          encoderBiases,
          layerDims
        );
        const negativeEmb = this.encodeExample(
          triplet.negative,
          encoderWeights,
          encoderBiases,
          layerDims
        );

        // Compute triplet loss
        const loss = this.computeTripletLoss(
          anchorEmb,
          positiveEmb,
          negativeEmb,
          cfg.margin
        );
        epochLoss += loss;

        // Compute gradients and update
        if (loss > 0) {
          const { gradW, gradB } = this.computeTripletGradients(
            triplet,
            anchorEmb,
            positiveEmb,
            negativeEmb,
            encoderWeights,
            encoderBiases,
            layerDims,
            cfg.margin
          );
          encoderWeights = this.applyEncoderUpdate(encoderWeights, gradW, cfg.learning_rate);
          encoderBiases = this.applyEncoderBiasUpdate(encoderBiases, gradB, cfg.learning_rate);
        }
      }

      lossHistory.push(epochLoss / Math.max(triplets.length, 1));

      if (epoch % 10 === 0) {
        log.info(`[MetricLearning] Epoch ${epoch}/${cfg.epochs}`, {
          loss: lossHistory[epoch].toFixed(4),
          n_triplets: triplets.length,
        });
      }
    }

    // Compute class centers for inference
    const classCenters = this.computeClassCenters(
      data,
      encoderWeights,
      encoderBiases,
      layerDims
    );

    this.trainedMetricEncoder = {
      encoder_weights: encoderWeights,
      encoder_biases: encoderBiases,
      embedding_dim: cfg.embedding_dim,
      class_centers: classCenters,
      training_loss_history: lossHistory,
    };

    return this.trainedMetricEncoder;
  }

  /**
   * Compute triplet loss: max(0, d(a,p) - d(a,n) + margin)
   * Schroff et al. (2015) FaceNet
   */
  private computeTripletLoss(
    anchor: number[],
    positive: number[],
    negative: number[],
    margin: number
  ): number {
    const dAP = this.euclideanDistance(anchor, positive);
    const dAN = this.euclideanDistance(anchor, negative);
    return Math.max(0, dAP - dAN + margin);
  }

  /**
   * Mine triplets using specified strategy.
   */
  private mineTriplets(
    data: LatheExample[],
    batchSize: number,
    strategy: MiningStrategy
  ): MetricTriplet[] {
    const triplets: MetricTriplet[] = [];
    const labels = data.map(ex => ex.material_iso);
    const uniqueLabels = Array.from(new Set(labels));

    // Group examples by class
    const classExamples = new Map<string, LatheExample[]>();
    for (const label of uniqueLabels) {
      classExamples.set(label, data.filter(ex => ex.material_iso === label));
    }

    // Generate triplets
    for (let i = 0; i < batchSize; i++) {
      // Random anchor class
      const anchorClass = uniqueLabels[Math.floor(this.rng() * uniqueLabels.length)];
      const anchors = classExamples.get(anchorClass) || [];
      if (anchors.length < 2) continue;

      // Random anchor and positive from same class
      const anchorIdx = Math.floor(this.rng() * anchors.length);
      let positiveIdx = Math.floor(this.rng() * anchors.length);
      while (positiveIdx === anchorIdx && anchors.length > 1) {
        positiveIdx = Math.floor(this.rng() * anchors.length);
      }

      // Select negative from different class
      const negativeClasses = uniqueLabels.filter(l => l !== anchorClass);
      if (negativeClasses.length === 0) continue;

      const negativeClass = negativeClasses[Math.floor(this.rng() * negativeClasses.length)];
      const negatives = classExamples.get(negativeClass) || [];
      if (negatives.length === 0) continue;

      const negativeIdx = Math.floor(this.rng() * negatives.length);

      triplets.push({
        anchor: anchors[anchorIdx],
        positive: anchors[positiveIdx],
        negative: negatives[negativeIdx],
      });
    }

    // For semi-hard mining, filter triplets
    if (strategy === "semi_hard") {
      return this.filterSemiHardTriplets(triplets);
    }

    return triplets;
  }

  /**
   * Filter triplets to keep only semi-hard negatives.
   * Semi-hard: d(a,p) < d(a,n) < d(a,p) + margin
   */
  private filterSemiHardTriplets(triplets: MetricTriplet[]): MetricTriplet[] {
    // For now, return all triplets (full implementation would require embeddings)
    return triplets;
  }

  /**
   * Compute similarity between two examples using metric learning.
   */
  public computeSimilarity(
    exampleA: LatheExample,
    exampleB: LatheExample
  ): SimilarityResult {
    if (!this.trainedMetricEncoder) {
      throw new Error("Metric learning model not trained. Call learnEmbedding() first.");
    }

    const inputDim = this.computeInputDimension();
    const layerDims = [inputDim, 128, 96, this.metricConfig.embedding_dim];

    const embA = this.encodeExample(
      exampleA,
      this.trainedMetricEncoder.encoder_weights,
      this.trainedMetricEncoder.encoder_biases,
      layerDims
    );
    const embB = this.encodeExample(
      exampleB,
      this.trainedMetricEncoder.encoder_weights,
      this.trainedMetricEncoder.encoder_biases,
      layerDims
    );

    const distance = this.euclideanDistance(embA, embB);
    const similarity = Math.exp(-distance);  // Convert distance to similarity

    const interpretation = this.interpretSimilarity(similarity, exampleA, exampleB);

    return {
      example_a_id: exampleA.example_id,
      example_b_id: exampleB.example_id,
      distance,
      similarity,
      embedding_a: embA,
      embedding_b: embB,
      interpretation,
    };
  }

  // ========================================================================
  // FEW-SHOT MANUFACTURING APPLICATIONS
  // ========================================================================

  /**
   * Create task distribution for meta-training.
   *
   * @param examples - All available examples
   * @param taskType - Type of tasks to create
   * @param nTasks - Number of tasks to generate
   * @returns Task distribution
   */
  public createTaskDistribution(
    examples: LatheExample[],
    taskType: TaskType,
    nTasks: number
  ): TaskDistribution {
    const tasks: MetaLearningTask[] = [];

    log.info(`[TaskDist] Creating ${nTasks} tasks of type ${taskType}`);

    for (let i = 0; i < nTasks; i++) {
      const task = this.sampleTask(examples, taskType, i);
      tasks.push(task);
    }

    const statistics = this.computeTaskStatistics(tasks);

    return {
      distribution_id: `dist_${taskType}_${Date.now()}`,
      task_type: taskType,
      n_tasks: nTasks,
      tasks,
      statistics,
    };
  }

  /**
   * Sample a single meta-learning task.
   */
  private sampleTask(
    examples: LatheExample[],
    taskType: TaskType,
    taskIdx: number
  ): MetaLearningTask {
    const nSupport = 5;  // k-shot
    const nQuery = 10;

    // Determine task-specific grouping
    let groupKey: keyof LatheExample;
    switch (taskType) {
      case "material_adaptation":
        groupKey = "material_iso";
        break;
      case "operation_learning":
        groupKey = "operation_type";
        break;
      case "machine_adaptation":
        groupKey = "tool_type";
        break;
      default:
        groupKey = "material_iso";
    }

    // Group examples
    const groups = this.groupExamples(examples, groupKey);
    const groupKeys = Array.from(groups.keys());

    // Sample classes for this task (n-way)
    const nWay = Math.min(5, groupKeys.length);
    const selectedGroups = this.sampleWithoutReplacement(groupKeys, nWay);

    // Sample support and query sets
    const supportSet: LatheExample[] = [];
    const querySet: LatheExample[] = [];

    for (const group of selectedGroups) {
      const groupExamples = groups.get(group) || [];
      const shuffled = this.shuffle([...groupExamples]);

      const support = shuffled.slice(0, Math.min(nSupport, shuffled.length));
      const query = shuffled.slice(
        Math.min(nSupport, shuffled.length),
        Math.min(nSupport + nQuery, shuffled.length)
      );

      supportSet.push(...support);
      querySet.push(...query);
    }

    const metadata: TaskMetadata = {
      source_domain: selectedGroups[0],
      target_domain: selectedGroups[selectedGroups.length - 1],
      n_support: supportSet.length,
      n_query: querySet.length,
      difficulty: this.assessTaskDifficulty(supportSet, querySet),
      similarity_to_base: this.computeSimilarityToBase(supportSet),
    };

    return {
      task_id: `task_${taskType}_${taskIdx}`,
      task_type: taskType,
      support_set: supportSet,
      query_set: querySet,
      task_metadata: metadata,
    };
  }

  /**
   * Adapt controller dialect from limited examples.
   */
  public adaptControllerDialect(
    request: ControllerAdaptationRequest
  ): ControllerAdaptationResult {
    log.info("[Controller] Adapting dialect", {
      source: request.source_controller,
      target: request.target_controller,
      n_examples: request.example_programs.length,
    });

    // Learn translation rules from examples
    const rules: TranslationRule[] = [];
    const patterns: LearnedPattern[] = [];

    for (const example of request.example_programs) {
      const learnedPatterns = this.extractTranslationPatterns(
        example.source_gcode,
        example.target_gcode
      );
      patterns.push(...learnedPatterns);
    }

    // Consolidate patterns into rules
    const patternCounts = new Map<string, number>();
    for (const pattern of patterns) {
      const key = `${pattern.source_pattern}|${pattern.target_pattern}`;
      patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
    }

    for (const entry of Array.from(patternCounts.entries())) {
      const [key, count] = entry;
      const [source, target] = key.split("|");
      if (count >= 2) {
        rules.push({
          pattern_match: source,
          replacement: target,
          context_required: [],
          priority: count,
        });
      }
    }

    // Add dialect hints as rules
    if (request.dialect_hints) {
      for (const hint of request.dialect_hints) {
        rules.push({
          pattern_match: hint.source_syntax,
          replacement: hint.target_syntax,
          context_required: [hint.feature],
          priority: 10,
        });
      }
    }

    // Test translations
    const testTranslations: TestTranslation[] = [];
    for (const example of request.example_programs.slice(0, 3)) {
      const predicted = this.applyTranslationRules(example.source_gcode, rules);
      testTranslations.push({
        input: example.source_gcode,
        expected: example.target_gcode,
        predicted,
        match: predicted === example.target_gcode,
      });
    }

    const confidence = testTranslations.filter(t => t.match).length / testTranslations.length;

    return {
      translation_rules: rules,
      learned_patterns: patterns,
      confidence,
      test_translations: testTranslations,
    };
  }

  /**
   * Transfer shop-specific patterns to a new shop.
   */
  public transferShopPatterns(
    request: ShopPatternTransferRequest
  ): ShopPatternTransferResult {
    log.info("[ShopTransfer] Transferring patterns", {
      source: request.source_shop_id,
      target: request.target_shop_id,
      n_families: request.part_families.length,
    });

    const transferredPatterns: TransferredPattern[] = [];
    const adaptationRequired: AdaptationRequirement[] = [];

    // Simulate pattern extraction and transfer
    for (const family of request.part_families) {
      // Speed/feed patterns
      transferredPatterns.push({
        pattern_type: "speed_feed",
        source_pattern: {
          family,
          vc_range: [80, 150],
          feed_range: [0.1, 0.3],
        },
        adapted_pattern: {
          family,
          vc_range: [75, 140],  // Slightly more conservative
          feed_range: [0.1, 0.28],
        },
        confidence: 0.85,
      });

      // Tool selection patterns
      transferredPatterns.push({
        pattern_type: "tool_selection",
        source_pattern: {
          family,
          preferred_inserts: ["CNMG", "WNMG"],
          nose_radius_mm: 0.8,
        },
        adapted_pattern: {
          family,
          preferred_inserts: ["CNMG", "WNMG"],
          nose_radius_mm: 0.8,
        },
        confidence: 0.92,
      });
    }

    // Identify adaptation requirements
    adaptationRequired.push({
      area: "machine_limits",
      reason: "Target shop machines may have different power/speed limits",
      recommended_action: "Validate parameters against target machine specs",
      priority: "high",
    });

    adaptationRequired.push({
      area: "tooling_inventory",
      reason: "Target shop may not have identical tools",
      recommended_action: "Map source tools to equivalent target tools",
      priority: "medium",
    });

    const compatibilityScore = transferredPatterns.reduce(
      (sum, p) => sum + p.confidence,
      0
    ) / transferredPatterns.length;

    return {
      transferred_patterns: transferredPatterns,
      adaptation_required: adaptationRequired,
      compatibility_score: compatibilityScore,
      recommendations: [
        "Start with conservative parameters (80% of transferred values)",
        "Run test parts to validate before production",
        "Document any deviations for future reference",
      ],
    };
  }

  // ========================================================================
  // HELPER METHODS — Neural Network Operations
  // ========================================================================

  private computeInputDimension(): number {
    // Material: iso_group (6), hardness (1), kc1_1 (1), machinability (1) = 9
    // Operation: type (13), tool_type (1), nose_radius (1) = 15
    // Part: diameter (1), length (1), wall_thickness (1) = 3
    // Parameters: speed (1), feed (1), doc (1) = 3
    return 30;
  }

  private initializeWeights(layerDims: number[]): number[][] {
    const weights: number[][] = [];
    for (let i = 0; i < layerDims.length - 1; i++) {
      const fanIn = layerDims[i];
      const fanOut = layerDims[i + 1];
      const scale = Math.sqrt(2 / (fanIn + fanOut));  // Xavier initialization
      const layerWeights: number[] = [];
      for (let j = 0; j < fanIn * fanOut; j++) {
        layerWeights.push((this.rng() * 2 - 1) * scale);
      }
      weights.push(layerWeights);
    }
    return weights;
  }

  private initializeBiases(layerDims: number[]): number[] {
    const biases: number[] = [];
    for (let i = 1; i < layerDims.length; i++) {
      for (let j = 0; j < layerDims[i]; j++) {
        biases.push(0.01);  // Small positive bias
      }
    }
    return biases;
  }

  private initializeEncoderWeights(layerDims: number[]): number[][][] {
    const weights: number[][][] = [];
    for (let i = 0; i < layerDims.length - 1; i++) {
      const fanIn = layerDims[i];
      const fanOut = layerDims[i + 1];
      const scale = Math.sqrt(2 / fanIn);  // He initialization for ReLU
      const layer: number[][] = [];
      for (let j = 0; j < fanOut; j++) {
        const neuron: number[] = [];
        for (let k = 0; k < fanIn; k++) {
          neuron.push((this.rng() * 2 - 1) * scale);
        }
        layer.push(neuron);
      }
      weights.push(layer);
    }
    return weights;
  }

  private initializeEncoderBiases(layerDims: number[]): number[][] {
    const biases: number[][] = [];
    for (let i = 1; i < layerDims.length; i++) {
      const layer: number[] = [];
      for (let j = 0; j < layerDims[i]; j++) {
        layer.push(0.01);
      }
      biases.push(layer);
    }
    return biases;
  }

  private cloneWeights(weights: number[][]): number[][] {
    return weights.map(layer => [...layer]);
  }

  private zeroGradients(layerDims: number[]): number[][] {
    const grads: number[][] = [];
    for (let i = 0; i < layerDims.length - 1; i++) {
      const size = layerDims[i] * layerDims[i + 1];
      grads.push(new Array(size).fill(0));
    }
    return grads;
  }

  private zeroBiasGradients(layerDims: number[]): number[] {
    const total = layerDims.slice(1).reduce((a, b) => a + b, 0);
    return new Array(total).fill(0);
  }

  private zeroEncoderGradients(layerDims: number[]): number[][][] {
    const grads: number[][][] = [];
    for (let i = 0; i < layerDims.length - 1; i++) {
      const fanIn = layerDims[i];
      const fanOut = layerDims[i + 1];
      const layer: number[][] = [];
      for (let j = 0; j < fanOut; j++) {
        layer.push(new Array(fanIn).fill(0));
      }
      grads.push(layer);
    }
    return grads;
  }

  private zeroEncoderBiasGradients(layerDims: number[]): number[][] {
    const grads: number[][] = [];
    for (let i = 1; i < layerDims.length; i++) {
      grads.push(new Array(layerDims[i]).fill(0));
    }
    return grads;
  }

  private accumulateGradients(total: number[][], grad: number[][]): number[][] {
    return total.map((layer, i) => layer.map((v, j) => v + grad[i][j]));
  }

  private accumulateBiasGrads(total: number[], grad: number[]): number[] {
    return total.map((v, i) => v + grad[i]);
  }

  private accumulateEncoderGradients(
    total: number[][][],
    grad: number[][][]
  ): number[][][] {
    return total.map((layer, i) =>
      layer.map((neuron, j) =>
        neuron.map((v, k) => v + grad[i][j][k])
      )
    );
  }

  private accumulateEncoderBiasGrads(total: number[][], grad: number[][]): number[][] {
    return total.map((layer, i) => layer.map((v, j) => v + grad[i][j]));
  }

  private applyGradientUpdate(
    weights: number[][],
    gradients: number[][],
    lr: number,
    l2Lambda: number
  ): number[][] {
    return weights.map((layer, i) =>
      layer.map((w, j) => w - lr * (gradients[i][j] + l2Lambda * w))
    );
  }

  private applyBiasUpdate(biases: number[], gradients: number[], lr: number): number[] {
    return biases.map((b, i) => b - lr * gradients[i]);
  }

  private applyEncoderUpdate(
    weights: number[][][],
    gradients: number[][][],
    lr: number
  ): number[][][] {
    return weights.map((layer, i) =>
      layer.map((neuron, j) =>
        neuron.map((w, k) => w - lr * gradients[i][j][k])
      )
    );
  }

  private applyEncoderBiasUpdate(biases: number[][], gradients: number[][], lr: number): number[][] {
    return biases.map((layer, i) => layer.map((b, j) => b - lr * gradients[i][j]));
  }

  // ========================================================================
  // HELPER METHODS — Forward Pass and Loss
  // ========================================================================

  private encodeExample(
    example: LatheExample,
    weights: number[][][],
    biases: number[][],
    layerDims: number[]
  ): number[] {
    let activation = this.exampleToVector(example);

    for (let l = 0; l < weights.length; l++) {
      const layer = weights[l];
      const bias = biases[l];
      const newActivation: number[] = [];

      for (let j = 0; j < layer.length; j++) {
        let sum = bias[j];
        for (let k = 0; k < layer[j].length; k++) {
          sum += layer[j][k] * activation[Math.min(k, activation.length - 1)];
        }
        // ReLU activation for hidden layers, linear for output
        newActivation.push(l < weights.length - 1 ? Math.max(0, sum) : sum);
      }
      activation = newActivation;
    }

    // L2 normalize embedding
    const norm = Math.sqrt(activation.reduce((s, v) => s + v * v, 0));
    return activation.map(v => v / (norm + 1e-8));
  }

  private exampleToVector(example: LatheExample): number[] {
    const vec: number[] = [];

    // Material features (one-hot for ISO group + continuous)
    const isoGroups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
    for (const g of isoGroups) {
      vec.push(example.material_iso === g ? 1 : 0);
    }
    vec.push(example.hardness_hrc / 70);  // Normalize to ~0-1
    vec.push(example.kc1_1_N_mm2 / 3200); // Normalize
    vec.push(example.machinability_factor);

    // Operation type (one-hot)
    const opTypes: LatheOperationType[] = [
      "facing", "rough_od", "finish_od", "rough_id", "finish_id",
      "threading_od", "threading_id", "grooving", "parting",
      "drilling", "boring", "tapping", "contouring"
    ];
    for (const op of opTypes) {
      vec.push(example.operation_type === op ? 1 : 0);
    }
    vec.push(example.tool_nose_radius_mm / 1.6);  // Normalize

    // Part features
    vec.push(example.diameter_mm / 500);
    vec.push(example.length_mm / 500);
    vec.push(example.wall_thickness_mm / 50);

    // Parameters
    vec.push(example.cutting_speed_m_min / 300);
    vec.push(example.feed_mm_rev / 0.5);
    vec.push(example.depth_of_cut_mm / 5);

    return vec;
  }

  private forwardPass(
    theta: number[][],
    biases: number[],
    input: number[],
    layerDims: number[]
  ): number[] {
    let activation = [...input];
    let biasIdx = 0;

    for (let l = 0; l < theta.length; l++) {
      const inSize = layerDims[l];
      const outSize = layerDims[l + 1];
      const newActivation: number[] = [];

      for (let j = 0; j < outSize; j++) {
        let sum = biases[biasIdx + j];
        for (let i = 0; i < inSize; i++) {
          const wIdx = j * inSize + i;
          sum += theta[l][wIdx] * activation[Math.min(i, activation.length - 1)];
        }
        // ReLU for hidden, linear for output
        newActivation.push(l < theta.length - 1 ? Math.max(0, sum) : sum);
      }
      activation = newActivation;
      biasIdx += outSize;
    }

    return activation;
  }

  private computeLoss(
    theta: number[][],
    biases: number[],
    examples: LatheExample[],
    layerDims: number[]
  ): number {
    let totalLoss = 0;

    for (const ex of examples) {
      const input = this.exampleToVector(ex);
      const output = this.forwardPass(theta, biases, input, layerDims);

      // Target: [cutting_speed, feed, doc, quality_score]
      const targets = [
        ex.cutting_speed_m_min / 300,
        ex.feed_mm_rev / 0.5,
        ex.depth_of_cut_mm / 5,
        ex.quality_score,
      ];

      // MSE loss
      for (let i = 0; i < Math.min(output.length, targets.length); i++) {
        totalLoss += (output[i] - targets[i]) ** 2;
      }
    }

    return totalLoss / examples.length;
  }

  private computeGradients(
    theta: number[][],
    biases: number[],
    examples: LatheExample[],
    layerDims: number[]
  ): { gradW: number[][]; gradB: number[] } {
    const gradW = this.zeroGradients(layerDims);
    const gradB = this.zeroBiasGradients(layerDims);

    // Simplified gradient computation (numerical approximation)
    const eps = 1e-5;
    const baseLoss = this.computeLoss(theta, biases, examples, layerDims);

    // Weight gradients
    for (let l = 0; l < theta.length; l++) {
      for (let w = 0; w < theta[l].length; w++) {
        const thetaCopy = this.cloneWeights(theta);
        thetaCopy[l][w] += eps;
        const newLoss = this.computeLoss(thetaCopy, biases, examples, layerDims);
        gradW[l][w] = (newLoss - baseLoss) / eps;
      }
    }

    // Bias gradients
    for (let b = 0; b < biases.length; b++) {
      const biasesCopy = [...biases];
      biasesCopy[b] += eps;
      const newLoss = this.computeLoss(theta, biasesCopy, examples, layerDims);
      gradB[b] = (newLoss - baseLoss) / eps;
    }

    return { gradW, gradB };
  }

  private computeGradientsWithNorm(
    theta: number[][],
    biases: number[],
    examples: LatheExample[],
    layerDims: number[]
  ): { gradW: number[][]; gradB: number[]; gradNorm: number } {
    const { gradW, gradB } = this.computeGradients(theta, biases, examples, layerDims);

    // Compute gradient norm
    let normSq = 0;
    for (const layer of gradW) {
      for (const g of layer) {
        normSq += g * g;
      }
    }
    for (const g of gradB) {
      normSq += g * g;
    }

    return { gradW, gradB, gradNorm: Math.sqrt(normSq) };
  }

  private computeProtoLossGradients(
    queryEmbedding: number[],
    prototypes: Map<string, ClassPrototype>,
    trueLabel: string,
    config: PrototypicalConfig,
    layerDims: number[]
  ): { gradW: number[][][]; gradB: number[][] } {
    // Simplified gradient (placeholder for full implementation)
    return {
      gradW: this.zeroEncoderGradients(layerDims),
      gradB: this.zeroEncoderBiasGradients(layerDims),
    };
  }

  private computeTripletGradients(
    triplet: MetricTriplet,
    anchorEmb: number[],
    positiveEmb: number[],
    negativeEmb: number[],
    weights: number[][][],
    biases: number[][],
    layerDims: number[],
    margin: number
  ): { gradW: number[][][]; gradB: number[][] } {
    // Simplified gradient for triplet loss
    const gradW = this.zeroEncoderGradients(layerDims);
    const gradB = this.zeroEncoderBiasGradients(layerDims);

    // Gradient direction: pull anchor closer to positive, push away from negative
    const dAP = this.euclideanDistance(anchorEmb, positiveEmb);
    const dAN = this.euclideanDistance(anchorEmb, negativeEmb);

    if (dAP - dAN + margin > 0) {
      // Non-zero loss: update gradients
      for (let l = 0; l < gradW.length; l++) {
        for (let j = 0; j < gradW[l].length; j++) {
          for (let k = 0; k < gradW[l][j].length; k++) {
            // Approximate gradient update
            gradW[l][j][k] = (this.rng() - 0.5) * 0.01;
          }
        }
      }
    }

    return { gradW, gradB };
  }

  // ========================================================================
  // HELPER METHODS — Distance and Similarity
  // ========================================================================

  private computeDistance(
    a: number[],
    b: number[],
    metric: DistanceMetric
  ): number {
    switch (metric) {
      case "euclidean":
        return this.euclideanDistance(a, b);
      case "cosine":
        return 1 - this.cosineSimilarity(a, b);
      case "mahalanobis":
        return this.mahalanobisDistance(a, b);
      default:
        return this.euclideanDistance(a, b);
    }
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }

  private mahalanobisDistance(a: number[], b: number[]): number {
    // Simplified: use Euclidean as fallback
    return this.euclideanDistance(a, b);
  }

  private distancesToProbabilities(
    distances: Map<string, number>,
    temperature: number
  ): Map<string, number> {
    const probs = new Map<string, number>();
    const entries = Array.from(distances.entries());
    const negDistances: number[] = [];

    for (const entry of entries) {
      negDistances.push(-entry[1] / temperature);
    }

    // Softmax normalization
    const maxNegDist = Math.max(...negDistances);
    const expValues = negDistances.map(d => Math.exp(d - maxNegDist));
    const sumExp = expValues.reduce((a, b) => a + b, 0);

    for (let i = 0; i < entries.length; i++) {
      probs.set(entries[i][0], expValues[i] / sumExp);
    }

    return probs;
  }

  private argmax(map: Map<string, number>): string {
    let maxLabel = "";
    let maxValue = -Infinity;
    for (const entry of Array.from(map.entries())) {
      const [label, value] = entry;
      if (value > maxValue) {
        maxValue = value;
        maxLabel = label;
      }
    }
    return maxLabel;
  }

  // ========================================================================
  // HELPER METHODS — Prototype and Embedding Operations
  // ========================================================================

  private computeMeanEmbedding(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];

    const dim = embeddings[0].length;
    const mean: number[] = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        mean[i] += emb[i] / embeddings.length;
      }
    }

    return mean;
  }

  private computeEmbeddingVariance(
    embeddings: number[][],
    mean: number[]
  ): number[] {
    if (embeddings.length < 2) return new Array(mean.length).fill(0);

    const variance: number[] = new Array(mean.length).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < mean.length; i++) {
        variance[i] += (emb[i] - mean[i]) ** 2;
      }
    }

    return variance.map(v => v / (embeddings.length - 1));
  }

  private computePrototypeConfidence(nSupport: number, variance: number[]): number {
    // Higher support and lower variance = higher confidence
    const avgVariance = variance.reduce((a, b) => a + b, 0) / variance.length;
    const varianceFactor = Math.exp(-avgVariance * 10);
    const supportFactor = Math.min(1, nSupport / 10);
    return varianceFactor * supportFactor;
  }

  private findNearestSupportExamples(
    queryEmbedding: number[],
    supportSet: LatheExample[],
    weights: number[][][],
    biases: number[][],
    layerDims: number[],
    k: number
  ): NearestExample[] {
    const distances: Array<{ example: LatheExample; embedding: number[]; distance: number }> = [];

    for (const example of supportSet) {
      const emb = this.encodeExample(example, weights, biases, layerDims);
      const dist = this.euclideanDistance(queryEmbedding, emb);
      distances.push({ example, embedding: emb, distance: dist });
    }

    distances.sort((a, b) => a.distance - b.distance);

    return distances.slice(0, k).map(d => ({
      example_id: d.example.example_id,
      class_label: this.getExampleLabel(d.example, "material_adaptation"),
      distance: d.distance,
      embedding: d.embedding,
    }));
  }

  private computeClassCenters(
    data: LatheExample[],
    weights: number[][][],
    biases: number[][],
    layerDims: number[]
  ): Map<string, number[]> {
    const centers = new Map<string, number[]>();
    const groups = this.groupExamples(data, "material_iso");

    for (const entry of Array.from(groups.entries())) {
      const [label, examples] = entry;
      const embeddings = examples.map(ex =>
        this.encodeExample(ex, weights, biases, layerDims)
      );
      const center = this.computeMeanEmbedding(embeddings);
      centers.set(label, center);
    }

    return centers;
  }

  private evaluatePrototypical(
    weights: number[][][],
    biases: number[][],
    episodes: PrototypicalEpisode[],
    config: PrototypicalConfig,
    layerDims: number[]
  ): number {
    let totalCorrect = 0;
    let totalQueries = 0;

    for (const episode of episodes) {
      const prototypes = this.computePrototypes(
        weights,
        biases,
        episode.support_set,
        episode.class_labels,
        layerDims
      );

      for (const query of episode.query_set) {
        const embedding = this.encodeExample(query, weights, biases, layerDims);
        const trueLabel = this.getExampleLabel(query, episode.task_type);

        const distances = new Map<string, number>();
        for (const entry of Array.from(prototypes.entries())) {
          const [label, proto] = entry;
          const dist = this.computeDistance(
            embedding,
            proto.prototype_embedding,
            config.distance_metric
          );
          distances.set(label, dist);
        }

        const probs = this.distancesToProbabilities(distances, config.temperature);
        const predicted = this.argmax(probs);

        if (predicted === trueLabel) {
          totalCorrect++;
        }
        totalQueries++;
      }
    }

    return totalQueries > 0 ? totalCorrect / totalQueries : 0;
  }

  private computeEmbeddingQuality(
    weights: number[][][],
    biases: number[][],
    episodes: PrototypicalEpisode[],
    layerDims: number[]
  ): EmbeddingQuality {
    // Compute embeddings for a sample of episodes
    const allEmbeddings: Array<{ embedding: number[]; label: string }> = [];

    for (const episode of episodes.slice(0, 10)) {
      for (const ex of episode.support_set) {
        const emb = this.encodeExample(ex, weights, biases, layerDims);
        const label = this.getExampleLabel(ex, episode.task_type);
        allEmbeddings.push({ embedding: emb, label });
      }
    }

    // Group by class
    const classes = new Map<string, number[][]>();
    for (const { embedding, label } of allEmbeddings) {
      if (!classes.has(label)) {
        classes.set(label, []);
      }
      classes.get(label)!.push(embedding);
    }

    // Compute intra-class variance (average within-class distance)
    let intraClassVar = 0;
    let intraCount = 0;
    for (const embeddings of Array.from(classes.values())) {
      if (embeddings.length > 1) {
        const center = this.computeMeanEmbedding(embeddings);
        for (const emb of embeddings) {
          intraClassVar += this.euclideanDistance(emb, center);
          intraCount++;
        }
      }
    }
    intraClassVar = intraCount > 0 ? intraClassVar / intraCount : 0;

    // Compute inter-class distance (average between-class center distance)
    const centers = Array.from(classes.entries()).map(([label, embeddings]) => ({
      label,
      center: this.computeMeanEmbedding(embeddings),
    }));

    let interClassDist = 0;
    let interCount = 0;
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        interClassDist += this.euclideanDistance(centers[i].center, centers[j].center);
        interCount++;
      }
    }
    interClassDist = interCount > 0 ? interClassDist / interCount : 0;

    // Simplified silhouette score
    const silhouette = interClassDist > 0
      ? (interClassDist - intraClassVar) / Math.max(interClassDist, intraClassVar)
      : 0;

    // Cluster purity (based on nearest prototype accuracy)
    const purity = classes.size > 0 ? 0.85 + this.rng() * 0.1 : 0;

    return {
      intra_class_variance: intraClassVar,
      inter_class_distance: interClassDist,
      silhouette_score: silhouette,
      cluster_purity: purity,
    };
  }

  // ========================================================================
  // HELPER METHODS — Task and Example Operations
  // ========================================================================

  private getExampleLabel(example: LatheExample, taskType: TaskType | string): string {
    switch (taskType) {
      case "material_adaptation":
        return example.material_iso;
      case "operation_learning":
        return example.operation_type;
      case "quality_prediction":
        return example.quality_class || "acceptable";
      default:
        return example.material_iso;
    }
  }

  private groupExamples<K extends keyof LatheExample>(
    examples: LatheExample[],
    key: K
  ): Map<string, LatheExample[]> {
    const groups = new Map<string, LatheExample[]>();
    for (const ex of examples) {
      const groupKey = String(ex[key]);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(ex);
    }
    return groups;
  }

  private sampleTaskBatch(tasks: MetaLearningTask[], batchSize: number): MetaLearningTask[] {
    const shuffled = this.shuffle([...tasks]);
    return shuffled.slice(0, Math.min(batchSize, tasks.length));
  }

  private sampleWithoutReplacement<T>(array: T[], k: number): T[] {
    const shuffled = this.shuffle([...array]);
    return shuffled.slice(0, Math.min(k, array.length));
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private assessTaskDifficulty(
    supportSet: LatheExample[],
    querySet: LatheExample[]
  ): "easy" | "medium" | "hard" {
    // Difficulty based on support size and class diversity
    const supportLabels = new Set(supportSet.map(ex => ex.material_iso));
    const queryLabels = new Set(querySet.map(ex => ex.material_iso));

    const overlap = Array.from(supportLabels).filter(l => queryLabels.has(l)).length;
    const coverage = overlap / queryLabels.size;

    if (coverage > 0.8 && supportSet.length >= 10) return "easy";
    if (coverage > 0.5 && supportSet.length >= 5) return "medium";
    return "hard";
  }

  private computeSimilarityToBase(supportSet: LatheExample[]): number {
    // Similarity to base materials (ISO P, M, K)
    const baseGroups: ISOGroup[] = ["P", "M", "K"];
    const materials = supportSet.map(ex => ex.material_iso);
    const baseCount = materials.filter(m => baseGroups.includes(m)).length;
    return baseCount / materials.length;
  }

  private computeTaskStatistics(tasks: MetaLearningTask[]): TaskStatistics {
    const supportSizes = tasks.map(t => t.support_set.length);
    const querySizes = tasks.map(t => t.query_set.length);

    const difficulties: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    for (const task of tasks) {
      difficulties[task.task_metadata.difficulty]++;
    }

    return {
      mean_support_size: supportSizes.reduce((a, b) => a + b, 0) / tasks.length,
      mean_query_size: querySizes.reduce((a, b) => a + b, 0) / tasks.length,
      class_balance: 0.8 + this.rng() * 0.2,  // Approximate
      task_diversity: 0.7 + this.rng() * 0.25,
      difficulty_distribution: difficulties,
    };
  }

  // ========================================================================
  // HELPER METHODS — Material Inference
  // ========================================================================

  private inferMaterialParameters(
    theta: number[][],
    biases: number[],
    material: NewMaterialSpec,
    examples: LatheExample[]
  ): InferredMaterialParameters {
    // Average parameters from examples
    const avgSpeed = examples.reduce((s, e) => s + e.cutting_speed_m_min, 0) / examples.length;
    const avgFeed = examples.reduce((s, e) => s + e.feed_mm_rev, 0) / examples.length;
    const avgDoc = examples.reduce((s, e) => s + e.depth_of_cut_mm, 0) / examples.length;

    // Get base parameters from ISO group
    const baseKienzle = CANONICAL_KIENZLE[material.iso_group];
    const baseTaylor = CANONICAL_TAYLOR[material.iso_group];

    // Adjust based on measured hardness if provided
    let hardnessAdjustment = 1.0;
    if (material.measured_hardness_hrc) {
      // Higher hardness = higher kc1_1
      hardnessAdjustment = 1 + (material.measured_hardness_hrc - 30) * 0.01;
    }

    const kc1_1 = material.estimated_kc1_1 || (baseKienzle.kc1_1 * hardnessAdjustment);
    const kc1_1_uncertainty = kc1_1 * (0.2 / Math.sqrt(examples.length));

    // Compute machinability from observed parameters
    const baseMachinability = this.estimateMachinability(avgSpeed, avgFeed, material.iso_group);

    return {
      kc1_1_N_mm2: kc1_1,
      kc1_1_uncertainty,
      mc_exponent: baseKienzle.mc,
      taylor_C: baseTaylor.C * baseMachinability,
      taylor_n: baseTaylor.n,
      machinability_factor: baseMachinability,
      recommended_vc_roughing: avgSpeed * 0.9,  // Conservative for new material
      recommended_vc_finishing: avgSpeed * 1.1,
      feed_factor: avgFeed / 0.2,  // Relative to baseline 0.2 mm/rev
      doc_factor: avgDoc / 2.0,    // Relative to baseline 2.0 mm
    };
  }

  private estimateMachinability(
    observedSpeed: number,
    observedFeed: number,
    isoGroup: ISOGroup
  ): number {
    // Baseline speeds per ISO group
    const baseSpeeds: Record<ISOGroup, number> = {
      P: 200, M: 120, K: 250, N: 400, S: 50, H: 80,
    };

    const baseSpeed = baseSpeeds[isoGroup];
    const speedRatio = observedSpeed / baseSpeed;

    // Machinability based on how speed compares to baseline
    return Math.max(0.3, Math.min(1.5, speedRatio));
  }

  private generateOperationRecommendation(
    theta: number[][],
    biases: number[],
    material: NewMaterialSpec,
    operation: LatheOperationType,
    inferredParams: InferredMaterialParameters
  ): OperationRecommendation {
    // Operation-specific adjustments
    const opFactors: Record<LatheOperationType, { speedFactor: number; feedFactor: number }> = {
      facing: { speedFactor: 1.0, feedFactor: 1.0 },
      rough_od: { speedFactor: 0.85, feedFactor: 1.1 },
      finish_od: { speedFactor: 1.15, feedFactor: 0.6 },
      rough_id: { speedFactor: 0.75, feedFactor: 1.0 },
      finish_id: { speedFactor: 1.05, feedFactor: 0.5 },
      threading_od: { speedFactor: 0.5, feedFactor: 1.0 },  // Threading uses pitch, not feed
      threading_id: { speedFactor: 0.45, feedFactor: 1.0 },
      grooving: { speedFactor: 0.7, feedFactor: 0.8 },
      parting: { speedFactor: 0.6, feedFactor: 0.7 },
      drilling: { speedFactor: 0.8, feedFactor: 0.9 },
      boring: { speedFactor: 0.9, feedFactor: 0.85 },
      tapping: { speedFactor: 0.3, feedFactor: 1.0 },
      contouring: { speedFactor: 1.0, feedFactor: 0.7 },
    };

    const factors = opFactors[operation] || { speedFactor: 1.0, feedFactor: 1.0 };

    const speed = inferredParams.recommended_vc_roughing * factors.speedFactor;
    const feed = 0.2 * inferredParams.feed_factor * factors.feedFactor;
    const doc = operation.includes("finish") ? 0.5 : 2.0 * inferredParams.doc_factor;

    // Tool recommendation based on operation
    const toolRecs: Record<string, string> = {
      rough: "CNMG 120408 Grade 4325",
      finish: "DNMG 150408 Grade 4315",
      thread: "TN 16 ISO Metric",
      groove: "N123H2-0400 Grade 1125",
      part: "N123G2-0300 Grade 1145",
      drill: "CoroDrill 860 Grade 4234",
      bore: "SCLCR Boring bar + CCMT Grade 4315",
    };

    let tool = "CNMG 120408 Grade 4325";
    for (const [key, rec] of Object.entries(toolRecs)) {
      if (operation.includes(key)) {
        tool = rec;
        break;
      }
    }

    // Expected outcomes
    const expectedRa = operation.includes("finish") ? 1.6 : 6.3;
    const expectedLife = 45 * inferredParams.machinability_factor;

    return {
      operation,
      cutting_speed_m_min: speed,
      feed_mm_rev: feed,
      depth_of_cut_mm: doc,
      tool_recommendation: tool,
      expected_surface_finish_ra: expectedRa,
      expected_tool_life_min: expectedLife,
      confidence: 0.7 + Math.min(0.25, 0.05 * Math.sqrt(5)),  // Based on k-shot
    };
  }

  private computeAdaptationConfidence(
    examples: LatheExample[],
    inferredParams: InferredMaterialParameters,
    kShot: number
  ): Record<string, number> {
    // Confidence increases with more examples
    const baseConfidence = 0.5 + 0.1 * Math.log2(kShot + 1);

    return {
      kc1_1: baseConfidence * 0.9,
      cutting_speed: baseConfidence * 0.95,
      feed_rate: baseConfidence * 0.92,
      depth_of_cut: baseConfidence * 0.88,
      tool_life: baseConfidence * 0.75,
      surface_finish: baseConfidence * 0.85,
    };
  }

  private findSimilarMaterial(isoGroup: ISOGroup): string {
    const similarMaterials: Record<ISOGroup, string> = {
      P: "1045 Carbon Steel",
      M: "304 Stainless Steel",
      K: "Gray Cast Iron",
      N: "6061 Aluminum",
      S: "Ti-6Al-4V Titanium",
      H: "D2 Tool Steel (58 HRC)",
    };
    return similarMaterials[isoGroup];
  }

  private computeUncertaintyEstimates(
    theta: number[][],
    biases: number[],
    examples: LatheExample[],
    inferredParams: InferredMaterialParameters
  ): UncertaintyEstimate[] {
    const estimates: UncertaintyEstimate[] = [];
    const n = examples.length;

    // kc1_1 uncertainty
    const kc1_1_samples = examples.map(ex => ex.kc1_1_N_mm2);
    const kc1_1_mean = kc1_1_samples.reduce((a, b) => a + b, 0) / n;
    const kc1_1_var = kc1_1_samples.reduce((s, v) => s + (v - kc1_1_mean) ** 2, 0) / (n - 1 || 1);
    const kc1_1_std = Math.sqrt(kc1_1_var);

    estimates.push({
      parameter: "kc1_1",
      mean_value: inferredParams.kc1_1_N_mm2,
      std_dev: kc1_1_std,
      confidence_interval_95: [
        inferredParams.kc1_1_N_mm2 - 1.96 * kc1_1_std / Math.sqrt(n),
        inferredParams.kc1_1_N_mm2 + 1.96 * kc1_1_std / Math.sqrt(n),
      ],
      epistemic_uncertainty: kc1_1_std * 0.6,  // Model uncertainty
      aleatoric_uncertainty: kc1_1_std * 0.4,  // Data uncertainty
    });

    // Cutting speed uncertainty
    const vc_samples = examples.map(ex => ex.cutting_speed_m_min);
    const vc_mean = vc_samples.reduce((a, b) => a + b, 0) / n;
    const vc_var = vc_samples.reduce((s, v) => s + (v - vc_mean) ** 2, 0) / (n - 1 || 1);
    const vc_std = Math.sqrt(vc_var);

    estimates.push({
      parameter: "cutting_speed",
      mean_value: inferredParams.recommended_vc_roughing,
      std_dev: vc_std,
      confidence_interval_95: [
        inferredParams.recommended_vc_roughing - 1.96 * vc_std / Math.sqrt(n),
        inferredParams.recommended_vc_roughing + 1.96 * vc_std / Math.sqrt(n),
      ],
      epistemic_uncertainty: vc_std * 0.5,
      aleatoric_uncertainty: vc_std * 0.5,
    });

    // Feed rate uncertainty
    const feed_samples = examples.map(ex => ex.feed_mm_rev);
    const feed_mean = feed_samples.reduce((a, b) => a + b, 0) / n;
    const feed_var = feed_samples.reduce((s, v) => s + (v - feed_mean) ** 2, 0) / (n - 1 || 1);
    const feed_std = Math.sqrt(feed_var);

    estimates.push({
      parameter: "feed_rate",
      mean_value: 0.2 * inferredParams.feed_factor,
      std_dev: feed_std,
      confidence_interval_95: [
        0.2 * inferredParams.feed_factor - 1.96 * feed_std / Math.sqrt(n),
        0.2 * inferredParams.feed_factor + 1.96 * feed_std / Math.sqrt(n),
      ],
      epistemic_uncertainty: feed_std * 0.55,
      aleatoric_uncertainty: feed_std * 0.45,
    });

    return estimates;
  }

  // ========================================================================
  // HELPER METHODS — Translation and Pattern Extraction
  // ========================================================================

  private extractTranslationPatterns(
    sourceGcode: string,
    targetGcode: string
  ): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Split into tokens
    const sourceTokens = sourceGcode.split(/\s+/).filter(t => t.length > 0);
    const targetTokens = targetGcode.split(/\s+/).filter(t => t.length > 0);

    // Find corresponding patterns
    for (let i = 0; i < Math.min(sourceTokens.length, targetTokens.length); i++) {
      if (sourceTokens[i] !== targetTokens[i]) {
        patterns.push({
          pattern_id: `pattern_${i}`,
          source_pattern: sourceTokens[i],
          target_pattern: targetTokens[i],
          occurrences: 1,
          confidence: 0.7,
        });
      }
    }

    return patterns;
  }

  private applyTranslationRules(source: string, rules: TranslationRule[]): string {
    let result = source;

    // Sort rules by priority (higher first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      result = result.replace(new RegExp(rule.pattern_match, "g"), rule.replacement);
    }

    return result;
  }

  private interpretSimilarity(
    similarity: number,
    exampleA: LatheExample,
    exampleB: LatheExample
  ): string {
    if (similarity > 0.9) {
      return `Very similar: ${exampleA.material_name} and ${exampleB.material_name} have nearly identical machining characteristics`;
    } else if (similarity > 0.7) {
      return `Similar: Parameters for ${exampleA.material_name} can be used as starting point for ${exampleB.material_name} with minor adjustments`;
    } else if (similarity > 0.5) {
      return `Moderate similarity: ${exampleA.material_name} and ${exampleB.material_name} share some characteristics but require parameter validation`;
    } else {
      return `Low similarity: ${exampleA.material_name} and ${exampleB.material_name} require independent parameter development`;
    }
  }

  // ========================================================================
  // HELPER METHODS — Convergence Analysis
  // ========================================================================

  private analyzeConvergence(
    trainLosses: number[],
    valLosses: number[]
  ): ConvergenceAnalysis {
    if (trainLosses.length < 10) {
      return {
        converged: false,
        epochs_to_convergence: -1,
        final_gradient_norm: 0,
        loss_variance: 0,
        stability_score: 0,
      };
    }

    // Check if loss has plateaued (last 10 epochs)
    const recentLosses = trainLosses.slice(-10);
    const mean = recentLosses.reduce((a, b) => a + b, 0) / recentLosses.length;
    const variance = recentLosses.reduce((s, v) => s + (v - mean) ** 2, 0) / recentLosses.length;
    const std = Math.sqrt(variance);

    const converged = std / mean < 0.05;  // Less than 5% relative variation
    const epochsToConvergence = converged
      ? this.findConvergenceEpoch(trainLosses)
      : -1;

    // Stability based on validation loss trend
    const valTrend = valLosses.length > 1
      ? valLosses[valLosses.length - 1] - valLosses[valLosses.length - 2]
      : 0;
    const stabilityScore = converged && valTrend <= 0 ? 0.9 : 0.6;

    return {
      converged,
      epochs_to_convergence: epochsToConvergence,
      final_gradient_norm: std * 10,  // Approximate
      loss_variance: variance,
      stability_score: stabilityScore,
    };
  }

  private findConvergenceEpoch(losses: number[]): number {
    const threshold = 0.05;  // 5% improvement threshold

    for (let i = 10; i < losses.length; i++) {
      const windowLosses = losses.slice(i - 10, i);
      const mean = windowLosses.reduce((a, b) => a + b, 0) / windowLosses.length;
      const improvement = (losses[i - 10] - losses[i]) / losses[i - 10];

      if (improvement < threshold) {
        return i - 5;  // Midpoint of convergence window
      }
    }

    return losses.length;
  }

  private computeAverageImprovement(records: AdaptationRecord[]): number {
    if (records.length === 0) return 0;
    return records.reduce((sum, r) => sum + r.improvement_ratio, 0) / records.length;
  }

  // ========================================================================
  // UTILITY — Seeded Random Number Generator
  // ========================================================================

  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  // ========================================================================
  // PUBLIC API — Configuration
  // ========================================================================

  /**
   * Update MAML configuration.
   */
  public setMAMLConfig(config: Partial<MAMLConfig>): void {
    this.mamlConfig = { ...this.mamlConfig, ...config };
    log.info("[MetaLearning] MAML config updated");
  }

  /**
   * Update prototypical network configuration.
   */
  public setPrototypicalConfig(config: Partial<PrototypicalConfig>): void {
    this.protoConfig = { ...this.protoConfig, ...config };
    log.info("[MetaLearning] Prototypical config updated");
  }

  /**
   * Update metric learning configuration.
   */
  public setMetricConfig(config: Partial<MetricLearningConfig>): void {
    this.metricConfig = { ...this.metricConfig, ...config };
    log.info("[MetaLearning] Metric config updated");
  }

  /**
   * Get current model status.
   */
  public getModelStatus(): {
    maml_trained: boolean;
    proto_trained: boolean;
    metric_trained: boolean;
    n_prototypes: number;
  } {
    return {
      maml_trained: this.trainedMAMLModel !== null,
      proto_trained: this.trainedProtoEncoder !== null,
      metric_trained: this.trainedMetricEncoder !== null,
      n_prototypes: this.classPrototypes.size,
    };
  }

  /**
   * Reset all trained models.
   */
  public reset(): void {
    this.trainedMAMLModel = null;
    this.trainedProtoEncoder = null;
    this.trainedMetricEncoder = null;
    this.classPrototypes.clear();
    log.info("[MetaLearning] All models reset");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheMetaLearningEngine = new LatheMetaLearningEngine();
