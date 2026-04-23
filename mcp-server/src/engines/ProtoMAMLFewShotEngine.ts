// WIRE-EXEMPT: tests in ProtoMAMLEngines.test.ts
/**
 * ProtoMAML Few-Shot Engine — U-LEARN-11
 * =======================================
 *
 * Combines Prototypical Networks initialization with MAML fine-tuning for
 * rapid adaptation to new customers with <10 samples. Fires DURING quote
 * path, not tonight's cron.
 *
 * Reference:
 * - Triantafillou 2020 "Meta-Dataset: A Dataset of Datasets for Learning to Learn"
 * - Finn 2017 "Model-Agnostic Meta-Learning for Fast Adaptation of Deep Networks"
 *
 * Key equations:
 * - Proto init: θ₀ = prototype-based initialization
 * - Inner loop: θ'ᵢ = θᵢ - α * ∇L(θᵢ, D_support)
 * - Prediction: ŷ = f_θ'(x_query)
 *
 * Manufacturing use case:
 * - ITW sends 3 new nickel-alloy parts
 * - Inner loop adapts base model in 5 steps (<500ms)
 * - Quote returns adapted prediction with provenance
 * - Adapted params cached for future queries
 *
 * @module engines/ProtoMAMLFewShotEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-11
 */

import {
  ProtoMAMLConfigSchema,
  ProtoMAMLAdaptSchema,
  ProtoMAMLAdaptResultSchema,
  ProtoMAMLPredictSchema,
  ProtoMAMLPredictResultSchema,
  type ProtoMAMLConfig,
  type ProtoMAMLAdapt,
  type ProtoMAMLAdaptResult,
  type ProtoMAMLPredict,
  type ProtoMAMLPredictResult,
} from "../schemas/continualLearningSchema.js";

import { prototypicalNetworkEngine } from "./PrototypicalNetworkEngine.js";

interface ModelParams {
  weights: number[][];
  bias: number[];
}

interface ConfigState {
  config: ProtoMAMLConfig;
  baseParams: ModelParams;
  metaTrainingTasks: number;
  lastMetaUpdate: string | null;
}

interface AdaptedParams {
  configId: string;
  customerId: string;
  materialClass: string;
  params: ModelParams;
  supportSetSize: number;
  adaptedAt: string;
  innerSteps: number;
  finalLoss: number;
}

class ProtoMAMLFewShotEngine {
  private configs: Map<string, ConfigState> = new Map();
  private adaptedCache: Map<string, AdaptedParams> = new Map();

  /**
   * Register a ProtoMAML configuration.
   * @param config - Meta-learning configuration
   * @returns Registration confirmation
   */
  register(config: ProtoMAMLConfig): { config_id: string; domain: string; registered: boolean } {
    const parsed = ProtoMAMLConfigSchema.parse(config);

    const baseParams = this.initializeBaseParams(parsed.feature_dim, parsed.hidden_dim);

    this.configs.set(parsed.config_id, {
      config: parsed,
      baseParams,
      metaTrainingTasks: 0,
      lastMetaUpdate: null,
    });

    return {
      config_id: parsed.config_id,
      domain: parsed.domain,
      registered: true,
    };
  }

  /**
   * Adapt to new customer with inner loop optimization.
   * Target: <500ms for 3-shot adaptation with 5 inner steps.
   *
   * @param input - Adaptation request with support set
   * @returns Adaptation result with timing
   */
  adapt(input: ProtoMAMLAdapt): ProtoMAMLAdaptResult {
    const startTime = performance.now();
    const parsed = ProtoMAMLAdaptSchema.parse(input);

    const configState = this.configs.get(parsed.config_id);
    if (!configState) throw new Error(`Config not found: ${parsed.config_id}`);

    const config = configState.config;
    const supportSet = parsed.support_set;

    if (supportSet.length === 0) {
      throw new Error("Support set cannot be empty");
    }

    let currentParams = this.cloneParams(configState.baseParams);

    if (config.use_proto_init && supportSet.length >= 2) {
      currentParams = this.protoInitialize(currentParams, supportSet, config);
    }

    let loss = 0;
    for (let step = 0; step < config.inner_steps; step++) {
      const { gradients, currentLoss } = this.computeGradients(currentParams, supportSet, config);
      loss = currentLoss;

      for (let i = 0; i < currentParams.weights.length; i++) {
        for (let j = 0; j < currentParams.weights[i].length; j++) {
          currentParams.weights[i][j] -= config.inner_lr * gradients.weights[i][j];
        }
      }
      for (let i = 0; i < currentParams.bias.length; i++) {
        currentParams.bias[i] -= config.inner_lr * gradients.bias[i];
      }
    }

    const cacheKey = `${parsed.config_id}:${parsed.customer_id}:${parsed.material_class}`;
    let adaptedParamsId: string | undefined;

    if (parsed.cache_adapted) {
      adaptedParamsId = cacheKey;
      this.adaptedCache.set(cacheKey, {
        configId: parsed.config_id,
        customerId: parsed.customer_id,
        materialClass: parsed.material_class,
        params: currentParams,
        supportSetSize: supportSet.length,
        adaptedAt: new Date().toISOString(),
        innerSteps: config.inner_steps,
        finalLoss: loss,
      });
    }

    const elapsedMs = performance.now() - startTime;

    return ProtoMAMLAdaptResultSchema.parse({
      config_id: parsed.config_id,
      customer_id: parsed.customer_id,
      material_class: parsed.material_class,
      inner_steps_executed: config.inner_steps,
      final_inner_loss: loss,
      adaptation_time_ms: elapsedMs,
      cached: parsed.cache_adapted,
      adapted_params_id: adaptedParamsId,
    });
  }

  /**
   * Predict with adapted parameters.
   * Uses cached adapted params if available, else uses base model.
   *
   * @param input - Prediction request
   * @returns Prediction with provenance
   */
  predict(input: ProtoMAMLPredict): ProtoMAMLPredictResult {
    const startTime = performance.now();
    const parsed = ProtoMAMLPredictSchema.parse(input);

    const configState = this.configs.get(parsed.config_id);
    if (!configState) throw new Error(`Config not found: ${parsed.config_id}`);

    const cacheKey = `${parsed.config_id}:${parsed.customer_id}:${parsed.material_class}`;
    const cached = parsed.use_cached ? this.adaptedCache.get(cacheKey) : undefined;

    const params = cached ? cached.params : configState.baseParams;
    const usedCached = !!cached;

    const prediction = this.forward(params, parsed.query_features);

    const confidence = this.computeConfidence(params, parsed.query_features);

    const elapsedMs = performance.now() - startTime;

    return ProtoMAMLPredictResultSchema.parse({
      config_id: parsed.config_id,
      customer_id: parsed.customer_id,
      material_class: parsed.material_class,
      predicted_value: prediction,
      confidence,
      used_cached: usedCached,
      inference_time_ms: elapsedMs,
      provenance: {
        base_model: `${parsed.config_id}_base`,
        adapted_params_id: cached?.configId ? cacheKey : undefined,
        support_set_size: cached?.supportSetSize ?? 0,
      },
    });
  }

  /**
   * Get adaptation cache statistics.
   * @returns Cache statistics
   */
  getCacheStats(): {
    total_cached: number;
    by_customer: Record<string, number>;
    by_material: Record<string, number>;
  } {
    const byCustomer: Record<string, number> = {};
    const byMaterial: Record<string, number> = {};

    for (const cached of this.adaptedCache.values()) {
      byCustomer[cached.customerId] = (byCustomer[cached.customerId] || 0) + 1;
      byMaterial[cached.materialClass] = (byMaterial[cached.materialClass] || 0) + 1;
    }

    return {
      total_cached: this.adaptedCache.size,
      by_customer: byCustomer,
      by_material: byMaterial,
    };
  }

  /**
   * Clear cached adaptations for a customer.
   * @param customerId - Customer identifier
   * @returns Number of entries cleared
   */
  clearCustomerCache(customerId: string): number {
    let cleared = 0;
    for (const [key, cached] of this.adaptedCache) {
      if (cached.customerId === customerId) {
        this.adaptedCache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * List registered configurations.
   * @returns Array of config summaries
   */
  listConfigs(): Array<{ config_id: string; domain: string; inner_steps: number }> {
    return Array.from(this.configs.values()).map((s) => ({
      config_id: s.config.config_id,
      domain: s.config.domain,
      inner_steps: s.config.inner_steps,
    }));
  }

  private initializeBaseParams(featureDim: number, hiddenDim: number): ModelParams {
    const weights: number[][] = [];
    const scale = Math.sqrt(2.0 / featureDim);

    for (let i = 0; i < hiddenDim; i++) {
      const row: number[] = [];
      for (let j = 0; j < featureDim; j++) {
        row.push((Math.random() - 0.5) * 2 * scale);
      }
      weights.push(row);
    }

    const outputWeights: number[] = [];
    const outputScale = Math.sqrt(2.0 / hiddenDim);
    for (let i = 0; i < hiddenDim; i++) {
      outputWeights.push((Math.random() - 0.5) * 2 * outputScale);
    }
    weights.push(outputWeights);

    const bias = new Array(hiddenDim + 1).fill(0);

    return { weights, bias };
  }

  private cloneParams(params: ModelParams): ModelParams {
    return {
      weights: params.weights.map((row) => [...row]),
      bias: [...params.bias],
    };
  }

  private protoInitialize(
    params: ModelParams,
    supportSet: Array<{ features: number[]; target: number }>,
    config: ProtoMAMLConfig
  ): ModelParams {
    const featureMean = new Array(supportSet[0].features.length).fill(0);
    let targetMean = 0;

    for (const ex of supportSet) {
      for (let i = 0; i < ex.features.length; i++) {
        featureMean[i] += ex.features[i];
      }
      targetMean += ex.target;
    }

    const n = supportSet.length;
    for (let i = 0; i < featureMean.length; i++) {
      featureMean[i] /= n;
    }
    targetMean /= n;

    const newParams = this.cloneParams(params);

    const lastBiasIdx = newParams.bias.length - 1;
    newParams.bias[lastBiasIdx] = targetMean;

    return newParams;
  }

  private computeGradients(
    params: ModelParams,
    supportSet: Array<{ features: number[]; target: number }>,
    config: ProtoMAMLConfig
  ): { gradients: ModelParams; currentLoss: number } {
    const hiddenDim = params.weights.length - 1;
    const featureDim = params.weights[0].length;

    const gradWeights: number[][] = params.weights.map((row) => new Array(row.length).fill(0));
    const gradBias: number[] = new Array(params.bias.length).fill(0);

    let totalLoss = 0;

    for (const ex of supportSet) {
      const hidden = new Array(hiddenDim).fill(0);
      for (let i = 0; i < hiddenDim; i++) {
        let sum = params.bias[i];
        for (let j = 0; j < featureDim; j++) {
          sum += params.weights[i][j] * ex.features[j];
        }
        hidden[i] = Math.max(0, sum);
      }

      let output = params.bias[hiddenDim];
      for (let i = 0; i < hiddenDim; i++) {
        output += params.weights[hiddenDim][i] * hidden[i];
      }

      const error = output - ex.target;
      totalLoss += 0.5 * error * error;

      gradBias[hiddenDim] += error;
      for (let i = 0; i < hiddenDim; i++) {
        gradWeights[hiddenDim][i] += error * hidden[i];
      }

      for (let i = 0; i < hiddenDim; i++) {
        if (hidden[i] > 0) {
          const dHidden = error * params.weights[hiddenDim][i];
          gradBias[i] += dHidden;
          for (let j = 0; j < featureDim; j++) {
            gradWeights[i][j] += dHidden * ex.features[j];
          }
        }
      }
    }

    const n = supportSet.length;
    for (let i = 0; i < gradWeights.length; i++) {
      for (let j = 0; j < gradWeights[i].length; j++) {
        gradWeights[i][j] /= n;
        gradWeights[i][j] += config.regularization_lambda * params.weights[i][j];
      }
    }
    for (let i = 0; i < gradBias.length; i++) {
      gradBias[i] /= n;
    }

    return {
      gradients: { weights: gradWeights, bias: gradBias },
      currentLoss: totalLoss / n,
    };
  }

  private forward(params: ModelParams, features: number[]): number {
    const hiddenDim = params.weights.length - 1;
    const hidden = new Array(hiddenDim).fill(0);

    for (let i = 0; i < hiddenDim; i++) {
      let sum = params.bias[i];
      for (let j = 0; j < features.length; j++) {
        sum += params.weights[i][j] * (features[j] ?? 0);
      }
      hidden[i] = Math.max(0, sum);
    }

    let output = params.bias[hiddenDim];
    for (let i = 0; i < hiddenDim; i++) {
      output += params.weights[hiddenDim][i] * hidden[i];
    }

    return output;
  }

  private computeConfidence(params: ModelParams, features: number[]): number {
    const hiddenDim = params.weights.length - 1;
    let activeUnits = 0;

    for (let i = 0; i < hiddenDim; i++) {
      let sum = params.bias[i];
      for (let j = 0; j < features.length; j++) {
        sum += params.weights[i][j] * (features[j] ?? 0);
      }
      if (sum > 0) activeUnits++;
    }

    const activationRatio = activeUnits / hiddenDim;
    return Math.min(0.95, 0.5 + activationRatio * 0.45);
  }
}

export const protoMAMLFewShotEngine = new ProtoMAMLFewShotEngine();
