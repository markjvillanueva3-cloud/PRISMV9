/**
 * LatheLoRAHooks — Training and Inference Safety Guards
 *
 * U-LLR04: Protective hooks for LatheLoRA fine-tuning pipeline.
 * Enforces data quality, training safety, and inference validation.
 *
 * @module hooks/LatheLoRAHooks
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HookResult {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface DatasetExample {
  instruction: string;
  input: string;
  output: string;
}

export interface TrainingMetrics {
  loss: number;
  learning_rate: number;
  epoch: number;
  step: number;
}

export interface InferenceRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
}

export interface GeneratedGCode {
  gcode: string;
  model_version: string;
  confidence?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_DATASET_SIZE = 100;
const MAX_DATASET_SIZE = 50000;
const MIN_INSTRUCTION_LENGTH = 10;
const MAX_INSTRUCTION_LENGTH = 500;
const MIN_OUTPUT_LENGTH = 20;
const MAX_OUTPUT_LENGTH = 8000;

const REQUIRED_GCODE_PATTERNS = [
  /G\d{1,3}/,          // G-codes
  /[XYZIJKR][+-]?\d/,  // Axis coordinates
];

const DANGEROUS_GCODE_PATTERNS = [
  /G28.*G28/,          // Double home
  /M00\s*M00/,         // Double stop
  /S\d{5,}/,           // Spindle > 99999 RPM
  /F\d{6,}/,           // Feed > 999999
];

const BANNED_CONTENT = [
  "password",
  "secret",
  "api_key",
  "token",
  "credential",
];

// ============================================================================
// PRE-TRAINING HOOKS
// ============================================================================

/**
 * Validate dataset before training starts.
 * @param examples Dataset examples
 * @returns Hook result with validation status
 */
export function validateDatasetHook(examples: DatasetExample[]): HookResult {
  const warnings: string[] = [];

  if (examples.length < MIN_DATASET_SIZE) {
    return {
      allowed: false,
      reason: `Dataset too small: ${examples.length} < ${MIN_DATASET_SIZE} minimum`,
    };
  }

  if (examples.length > MAX_DATASET_SIZE) {
    warnings.push(`Dataset very large (${examples.length}). Consider sampling.`);
  }

  let invalidCount = 0;
  let shortOutputCount = 0;
  let missingGCodeCount = 0;

  for (const ex of examples) {
    if (!ex.instruction || ex.instruction.length < MIN_INSTRUCTION_LENGTH) {
      invalidCount++;
      continue;
    }

    if (ex.instruction.length > MAX_INSTRUCTION_LENGTH) {
      warnings.push(`Long instruction found (${ex.instruction.length} chars)`);
    }

    if (!ex.output || ex.output.length < MIN_OUTPUT_LENGTH) {
      shortOutputCount++;
    }

    if (ex.output && ex.output.length > MAX_OUTPUT_LENGTH) {
      warnings.push(`Very long output found (${ex.output.length} chars)`);
    }

    const hasGCode = REQUIRED_GCODE_PATTERNS.some((p) => p.test(ex.output || ""));
    if (!hasGCode && ex.output) {
      missingGCodeCount++;
    }
  }

  if (invalidCount > examples.length * 0.1) {
    return {
      allowed: false,
      reason: `Too many invalid examples: ${invalidCount}/${examples.length} (>10%)`,
    };
  }

  if (shortOutputCount > examples.length * 0.2) {
    warnings.push(`${shortOutputCount} examples have short outputs (<${MIN_OUTPUT_LENGTH} chars)`);
  }

  if (missingGCodeCount > examples.length * 0.3) {
    warnings.push(`${missingGCodeCount} examples appear to lack G-code patterns`);
  }

  return {
    allowed: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      total_examples: examples.length,
      invalid_examples: invalidCount,
      short_outputs: shortOutputCount,
      missing_gcode: missingGCodeCount,
    },
  };
}

/**
 * Check for sensitive content in dataset.
 * @param examples Dataset examples
 * @returns Hook result
 */
export function sensitiveContentHook(examples: DatasetExample[]): HookResult {
  const flagged: string[] = [];

  for (let i = 0; i < examples.length; i++) {
    const text = `${examples[i].instruction} ${examples[i].input} ${examples[i].output}`.toLowerCase();

    for (const banned of BANNED_CONTENT) {
      if (text.includes(banned)) {
        flagged.push(`Example ${i}: contains "${banned}"`);
      }
    }
  }

  if (flagged.length > 0) {
    return {
      allowed: false,
      reason: `Sensitive content detected in ${flagged.length} examples`,
      metadata: { flagged_examples: flagged.slice(0, 10) },
    };
  }

  return { allowed: true };
}

// ============================================================================
// TRAINING HOOKS
// ============================================================================

/**
 * Monitor training metrics for anomalies.
 * @param metrics Current training metrics
 * @param history Historical metrics
 * @returns Hook result
 */
export function trainingMonitorHook(
  metrics: TrainingMetrics,
  history: TrainingMetrics[] = []
): HookResult {
  const warnings: string[] = [];

  if (metrics.loss > 10) {
    return {
      allowed: false,
      reason: `Loss exploded: ${metrics.loss} > 10. Training unstable.`,
    };
  }

  if (Number.isNaN(metrics.loss)) {
    return {
      allowed: false,
      reason: "NaN loss detected. Training corrupted.",
    };
  }

  if (history.length > 5) {
    const recentLosses = history.slice(-5).map((h) => h.loss);
    const avgLoss = recentLosses.reduce((a, b) => a + b, 0) / recentLosses.length;

    if (metrics.loss > avgLoss * 2) {
      warnings.push(`Loss spike: ${metrics.loss.toFixed(4)} vs avg ${avgLoss.toFixed(4)}`);
    }

    const increasing = recentLosses.every((l, i) => i === 0 || l >= recentLosses[i - 1]);
    if (increasing && metrics.loss > recentLosses[0]) {
      warnings.push("Loss has been increasing for 5+ steps");
    }
  }

  if (metrics.learning_rate > 1e-3) {
    warnings.push(`High learning rate: ${metrics.learning_rate}`);
  }

  return {
    allowed: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      current_loss: metrics.loss,
      step: metrics.step,
      epoch: metrics.epoch,
    },
  };
}

/**
 * Guard against training too long (overfitting).
 * @param epoch Current epoch
 * @param maxEpochs Maximum allowed epochs
 * @param evalScore Current evaluation score
 * @returns Hook result
 */
export function overfitGuardHook(
  epoch: number,
  maxEpochs: number,
  evalScore?: number
): HookResult {
  if (epoch > maxEpochs) {
    return {
      allowed: false,
      reason: `Exceeded max epochs: ${epoch} > ${maxEpochs}`,
    };
  }

  if (evalScore !== undefined && evalScore > 98) {
    return {
      allowed: false,
      reason: `Eval score ${evalScore}% suspiciously high. Likely overfitting.`,
      warnings: ["Consider reducing epochs or increasing dataset diversity"],
    };
  }

  return { allowed: true };
}

// ============================================================================
// INFERENCE HOOKS
// ============================================================================

/**
 * Validate inference request before sending to model.
 * @param request Inference request
 * @returns Hook result
 */
export function preInferenceHook(request: InferenceRequest): HookResult {
  const warnings: string[] = [];

  if (!request.prompt || request.prompt.trim().length < 5) {
    return {
      allowed: false,
      reason: "Prompt too short or empty",
    };
  }

  if (request.prompt.length > 4000) {
    warnings.push(`Long prompt (${request.prompt.length} chars). May truncate.`);
  }

  if (request.temperature !== undefined && request.temperature > 1.5) {
    warnings.push(`High temperature (${request.temperature}). Output may be incoherent.`);
  }

  if (request.max_tokens !== undefined && request.max_tokens > 4096) {
    warnings.push(`High max_tokens (${request.max_tokens}). May be slow.`);
  }

  return {
    allowed: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate generated G-code before returning to user.
 * @param result Generated G-code
 * @returns Hook result
 */
export function postInferenceHook(result: GeneratedGCode): HookResult {
  const warnings: string[] = [];

  if (!result.gcode || result.gcode.trim().length < 10) {
    return {
      allowed: false,
      reason: "Generated output too short or empty",
    };
  }

  const hasGCode = REQUIRED_GCODE_PATTERNS.some((p) => p.test(result.gcode));
  if (!hasGCode) {
    warnings.push("Output may not contain valid G-code");
  }

  for (const pattern of DANGEROUS_GCODE_PATTERNS) {
    if (pattern.test(result.gcode)) {
      return {
        allowed: false,
        reason: `Dangerous G-code pattern detected: ${pattern.source}`,
        warnings: ["Review generated code carefully before use"],
      };
    }
  }

  if (result.confidence !== undefined && result.confidence < 0.5) {
    warnings.push(`Low confidence (${(result.confidence * 100).toFixed(1)}%). Review carefully.`);
  }

  return {
    allowed: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      gcode_length: result.gcode.length,
      model_version: result.model_version,
      confidence: result.confidence,
    },
  };
}

// ============================================================================
// DEPLOYMENT HOOKS
// ============================================================================

/**
 * Validate model before deployment.
 * @param evalScore Model evaluation score
 * @param threshold Minimum required score
 * @returns Hook result
 */
export function preDeployHook(evalScore: number, threshold: number = 70): HookResult {
  if (evalScore < threshold) {
    return {
      allowed: false,
      reason: `Eval score ${evalScore}% below threshold ${threshold}%`,
      warnings: ["Model quality insufficient for deployment"],
    };
  }

  if (evalScore < threshold + 10) {
    return {
      allowed: true,
      warnings: [`Eval score ${evalScore}% near threshold. Monitor closely.`],
    };
  }

  return { allowed: true };
}

/**
 * Verify deployment succeeded.
 * @param modelName Deployed model name
 * @param testPrompt Test prompt to verify
 * @param testResponse Actual response
 * @returns Hook result
 */
export function postDeployHook(
  modelName: string,
  testPrompt: string,
  testResponse: string
): HookResult {
  if (!testResponse || testResponse.length < 10) {
    return {
      allowed: false,
      reason: `Model ${modelName} returned empty or short response`,
    };
  }

  const hasGCode = REQUIRED_GCODE_PATTERNS.some((p) => p.test(testResponse));
  if (!hasGCode) {
    return {
      allowed: false,
      reason: `Model ${modelName} response lacks G-code patterns`,
      warnings: ["Deployment verification failed"],
    };
  }

  return {
    allowed: true,
    metadata: {
      model_name: modelName,
      response_length: testResponse.length,
    },
  };
}

// ============================================================================
// HOOK REGISTRY
// ============================================================================

export const latheLoRAHooks = {
  validateDataset: validateDatasetHook,
  sensitiveContent: sensitiveContentHook,
  trainingMonitor: trainingMonitorHook,
  overfitGuard: overfitGuardHook,
  preInference: preInferenceHook,
  postInference: postInferenceHook,
  preDeploy: preDeployHook,
  postDeploy: postDeployHook,
};
