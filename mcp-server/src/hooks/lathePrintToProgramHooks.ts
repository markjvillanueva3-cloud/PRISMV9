/**
 * lathePrintToProgramHooks — Safety hooks for Print-to-Program pipeline
 *
 * U-LTH47 (partial): Forge-Triple hook component
 *
 * Hooks:
 * - p2p-cpk-below-gate: Blocks program emission if predicted Cpk < threshold
 * - p2p-collision-risk: Warns if collision probability > 30%
 * - p2p-tool-life-risk: Warns if tool breakage probability > 25%
 *
 * @module hooks/lathePrintToProgramHooks
 */

import type { DLIntelligenceResult } from "../engines/LathePrintToProgramDLIntelligenceEngine.js";
import type { VerificationResult } from "../engines/LatheProgramVerificationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface HookContext {
  action: string;
  program_number: number;
  part_number?: string;
  machine_id?: string;
  controller?: string;
}

export interface HookResult {
  allowed: boolean;
  hook_name: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  details?: Record<string, unknown>;
  recommendations?: string[];
}

export interface CpkGateConfig {
  min_cpk: number;
  block_on_failure: boolean;
  require_verification: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_CPK_GATE_CONFIG: CpkGateConfig = {
  min_cpk: 1.33,
  block_on_failure: true,
  require_verification: true,
};

const COLLISION_RISK_THRESHOLD = 0.30;
const TOOL_BREAKAGE_THRESHOLD = 0.25;
const TOLERANCE_VIOLATION_THRESHOLD = 0.40;

// ============================================================================
// HOOK IMPLEMENTATIONS
// ============================================================================

/**
 * p2p-cpk-below-gate: Blocks emission if predicted Cpk below threshold
 *
 * Uses DL intelligence to predict process capability.
 * If Cpk < 1.33 (default), blocks program and requires review.
 */
export function checkCpkGate(
  dlResult: DLIntelligenceResult,
  verification: VerificationResult | undefined,
  context: HookContext,
  config: Partial<CpkGateConfig> = {}
): HookResult {
  const cfg = { ...DEFAULT_CPK_GATE_CONFIG, ...config };

  // Require verification if configured
  if (cfg.require_verification && !verification) {
    return {
      allowed: false,
      hook_name: "p2p-cpk-below-gate",
      severity: "error",
      message: "Verification required before program emission",
      details: { require_verification: true },
      recommendations: [
        "Run lathe_print_verify before lathe_print_full",
        "Or set require_verification: false in hook config"
      ]
    };
  }

  // Check verification score
  if (verification && !verification.passed) {
    return {
      allowed: false,
      hook_name: "p2p-cpk-below-gate",
      severity: "critical",
      message: `Program failed verification with ${verification.error_count} errors`,
      details: {
        verification_score: verification.score,
        error_count: verification.error_count,
        warning_count: verification.warning_count
      },
      recommendations: [
        "Review verification issues and fix errors",
        "Re-run verification after corrections"
      ]
    };
  }

  // Estimate Cpk from DL failure probability
  // Higher failure probability = lower Cpk
  const failureProb = dlResult.overall_failure_probability;
  const toleranceMode = dlResult.failure_modes.find(m => m.type === "tolerance_violation");
  const toleranceProb = toleranceMode?.probability || 0;

  // Cpk estimation: Cpk ≈ 1/(3σ) where σ relates to failure rate
  // If failure prob = 0, Cpk → ∞; if failure prob = 0.5, Cpk ≈ 1.0
  const estimatedCpk = toleranceProb > 0
    ? Math.max(0.5, 2.0 - (toleranceProb * 3))
    : 2.0 - (failureProb * 2);

  if (estimatedCpk < cfg.min_cpk) {
    return {
      allowed: !cfg.block_on_failure,
      hook_name: "p2p-cpk-below-gate",
      severity: cfg.block_on_failure ? "critical" : "warning",
      message: `Predicted Cpk ${estimatedCpk.toFixed(2)} below threshold ${cfg.min_cpk}`,
      details: {
        predicted_cpk: estimatedCpk,
        min_cpk: cfg.min_cpk,
        failure_probability: failureProb,
        tolerance_violation_probability: toleranceProb,
        model_confidence: dlResult.model_confidence
      },
      recommendations: dlResult.corrections.slice(0, 3).map(c => c.description)
    };
  }

  return {
    allowed: true,
    hook_name: "p2p-cpk-below-gate",
    severity: "info",
    message: `Cpk gate passed: ${estimatedCpk.toFixed(2)} >= ${cfg.min_cpk}`,
    details: {
      predicted_cpk: estimatedCpk,
      model_confidence: dlResult.model_confidence
    }
  };
}

/**
 * p2p-collision-risk: Warns if collision probability exceeds threshold
 */
export function checkCollisionRisk(
  dlResult: DLIntelligenceResult,
  context: HookContext,
  threshold: number = COLLISION_RISK_THRESHOLD
): HookResult {
  const collisionMode = dlResult.failure_modes.find(m => m.type === "collision");
  const collisionProb = collisionMode?.probability || 0;

  if (collisionProb > threshold) {
    return {
      allowed: true, // Warning only, doesn't block
      hook_name: "p2p-collision-risk",
      severity: collisionProb > 0.5 ? "error" : "warning",
      message: `Collision risk ${(collisionProb * 100).toFixed(0)}% exceeds ${(threshold * 100).toFixed(0)}% threshold`,
      details: {
        collision_probability: collisionProb,
        threshold,
        affected_features: collisionMode?.affected_features || [],
        root_cause: collisionMode?.root_cause
      },
      recommendations: [
        "Review clearance moves between operations",
        "Verify tool length compensation",
        "Check workholding interference",
        "Run collision simulation before cutting"
      ]
    };
  }

  return {
    allowed: true,
    hook_name: "p2p-collision-risk",
    severity: "info",
    message: `Collision risk ${(collisionProb * 100).toFixed(0)}% within acceptable range`
  };
}

/**
 * p2p-tool-life-risk: Warns if tool breakage probability exceeds threshold
 */
export function checkToolLifeRisk(
  dlResult: DLIntelligenceResult,
  context: HookContext,
  threshold: number = TOOL_BREAKAGE_THRESHOLD
): HookResult {
  const breakageMode = dlResult.failure_modes.find(m => m.type === "tool_breakage");
  const breakageProb = breakageMode?.probability || 0;

  if (breakageProb > threshold) {
    return {
      allowed: true,
      hook_name: "p2p-tool-life-risk",
      severity: breakageProb > 0.5 ? "error" : "warning",
      message: `Tool breakage risk ${(breakageProb * 100).toFixed(0)}% exceeds ${(threshold * 100).toFixed(0)}% threshold`,
      details: {
        breakage_probability: breakageProb,
        threshold,
        affected_features: breakageMode?.affected_features || [],
        root_cause: breakageMode?.root_cause
      },
      recommendations: [
        "Reduce depth of cut",
        "Lower feed rate",
        "Check tool grade vs material hardness",
        "Inspect tool for wear before running"
      ]
    };
  }

  return {
    allowed: true,
    hook_name: "p2p-tool-life-risk",
    severity: "info",
    message: `Tool life risk ${(breakageProb * 100).toFixed(0)}% within acceptable range`
  };
}

/**
 * Run all P2P safety hooks
 */
export function runAllP2PHooks(
  dlResult: DLIntelligenceResult,
  verification: VerificationResult | undefined,
  context: HookContext,
  cpkConfig?: Partial<CpkGateConfig>
): HookResult[] {
  return [
    checkCpkGate(dlResult, verification, context, cpkConfig),
    checkCollisionRisk(dlResult, context),
    checkToolLifeRisk(dlResult, context)
  ];
}

/**
 * Check if all hooks pass (allowed = true)
 */
export function allHooksPass(results: HookResult[]): boolean {
  return results.every(r => r.allowed);
}

/**
 * Get blocking hooks (allowed = false)
 */
export function getBlockingHooks(results: HookResult[]): HookResult[] {
  return results.filter(r => !r.allowed);
}

/**
 * Get warnings (allowed = true but severity >= warning)
 */
export function getWarningHooks(results: HookResult[]): HookResult[] {
  return results.filter(r => r.allowed && (r.severity === "warning" || r.severity === "error"));
}

// ============================================================================
// HOOK REGISTRY
// ============================================================================

export const LATHE_P2P_HOOKS = {
  "p2p-cpk-below-gate": {
    description: "Blocks program emission if predicted Cpk below threshold",
    default_config: DEFAULT_CPK_GATE_CONFIG,
    severity: "critical",
    blocking: true
  },
  "p2p-collision-risk": {
    description: "Warns if collision probability exceeds threshold",
    default_threshold: COLLISION_RISK_THRESHOLD,
    severity: "warning",
    blocking: false
  },
  "p2p-tool-life-risk": {
    description: "Warns if tool breakage probability exceeds threshold",
    default_threshold: TOOL_BREAKAGE_THRESHOLD,
    severity: "warning",
    blocking: false
  }
} as const;
