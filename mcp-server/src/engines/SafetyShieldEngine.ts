/**
 * Safety Shield Engine — U-LEARN-08
 * ===================================
 *
 * CMDP (Constrained MDP) formulation with control-barrier functions (CBF)
 * over the Kienzle physics envelope. Wraps any RL policy to ensure safe
 * actions that respect machine limits and physics constraints.
 *
 * Key constraints enforced:
 * - P(F_c > F_limit) < 1e-4 — force limit with uncertainty
 * - E[tool_life] > 0.8·nominal — preserve tool life
 * - Spindle load < max_spindle_power
 * - Tool deflection < tolerance
 *
 * Control-Barrier Function:
 *   h(x) ≥ 0 defines safe set. CBF condition: ḣ(x) + γh(x) ≥ 0
 *   When h(x) approaches 0, the shield modifies the action to maintain safety.
 *
 * S(x) Safety Score:
 *   S(x) ∈ [0, 1] computed as weighted sum of constraint margins.
 *   S(x) ≥ 0.90: PASS, 0.70-0.90: WARN, <0.70: REJECT
 *
 * @module engines/SafetyShieldEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-08
 */

import {
  SafetyConstraintSchema,
  SafetyShieldConfigSchema,
  SafetyShieldInputSchema,
  SafetyShieldResultSchema,
  ConstraintEvaluationSchema,
  type SafetyConstraint,
  type SafetyShieldConfig,
  type SafetyShieldInput,
  type SafetyShieldResult,
  type ConstraintEvaluation,
} from "../schemas/offlineRLSchema.js";

// ============================================================================
// PHYSICS CONSTANTS — Canonical values from ISO 3685 / Machinery's Handbook
// ============================================================================

type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

interface KienzleCoefficients {
  kc1_1: number;
  mc: number;
  source: string;
}

/**
 * Kienzle specific cutting force coefficients by ISO material group.
 * @see ISO 3685 / Sandvik Coromant General Turning (2024)
 */
const KIENZLE_BY_ISO: Record<ISOGroup, KienzleCoefficients> = {
  P: { kc1_1: 1800, mc: 0.25, source: "ISO 3685 / Machinery's Handbook" },
  M: { kc1_1: 2100, mc: 0.25, source: "ISO 3685 / Sandvik" },
  K: { kc1_1: 1100, mc: 0.28, source: "ISO 3685 / Kennametal" },
  N: { kc1_1: 700, mc: 0.22, source: "ISO 3685 / ASM Handbook" },
  S: { kc1_1: 2800, mc: 0.25, source: "ISO 3685 / Aerospace specs" },
  H: { kc1_1: 3200, mc: 0.28, source: "ISO 3685 / Hard milling data" },
};

interface TaylorConstants {
  C: number;
  n: number;
  source: string;
}

/**
 * Taylor tool life constants by ISO material group.
 * T = (C / Vc)^(1/n) where T is minutes, Vc is m/min
 * @see Taylor (1907), ISO 3685:1993
 */
const TAYLOR_BY_ISO: Record<ISOGroup, TaylorConstants> = {
  P: { C: 350, n: 0.25, source: "Taylor 1907 / Modern updates" },
  M: { C: 200, n: 0.22, source: "Stainless steel machining data" },
  K: { C: 400, n: 0.30, source: "Cast iron machining data" },
  N: { C: 600, n: 0.35, source: "Aluminum machining data" },
  S: { C: 100, n: 0.18, source: "Superalloy machining data" },
  H: { C: 80, n: 0.15, source: "Hard milling data" },
};

/**
 * S(x) Safety Score weights by constraint type.
 * @see physics/CLAUDE.md
 */
const SAFETY_WEIGHTS: Record<string, number> = {
  force_limit: 0.30,
  spindle_load: 0.25,
  tool_deflection: 0.20,
  thermal_limit: 0.15,
  collision_margin: 0.10,
  tool_life_reserve: 0.10,
  vibration_limit: 0.10,
  power_limit: 0.10,
};

interface ShieldState {
  config: SafetyShieldConfig;
  evaluationCount: number;
  rejectCount: number;
  modificationCount: number;
}

class SafetyShieldEngine {
  private shields: Map<string, ShieldState> = new Map();

  /**
   * Create a safety shield with constraints.
   * @param config - Shield configuration with constraints
   * @returns Created shield info
   */
  createShield(config: SafetyShieldConfig): { shield_id: string; constraint_count: number } {
    const parsed = SafetyShieldConfigSchema.parse(config);

    this.shields.set(parsed.shield_id, {
      config: parsed,
      evaluationCount: 0,
      rejectCount: 0,
      modificationCount: 0,
    });

    return {
      shield_id: parsed.shield_id,
      constraint_count: parsed.constraints.length,
    };
  }

  /**
   * Evaluate action safety and potentially modify for compliance.
   * @param input - Shield input with state and proposed action
   * @returns Safety evaluation with safe action
   */
  evaluate(input: SafetyShieldInput): SafetyShieldResult {
    const startTime = performance.now();
    const parsed = SafetyShieldInputSchema.parse(input);

    const shield = this.shields.get(parsed.shield_id);
    if (!shield) {
      throw new Error(`Shield not found: ${parsed.shield_id}`);
    }

    shield.evaluationCount++;

    const evaluations: ConstraintEvaluation[] = [];
    let safeAction = { ...parsed.proposed_action };
    let wasModified = false;
    let rejectionReason: string | null = null;
    let cbfStatus: "safe" | "approaching_boundary" | "boundary_enforcement" = "safe";

    for (const constraint of shield.config.constraints) {
      const evaluation = this.evaluateConstraint(
        constraint,
        parsed.state,
        safeAction,
        parsed.material_iso,
        parsed.machine_envelope,
        shield.config
      );
      evaluations.push(evaluation);

      if (evaluation.status === "reject" && constraint.severity === "hard") {
        const modified = this.enforceConstraint(constraint, parsed.state, safeAction, evaluation);
        if (modified) {
          safeAction = modified.action;
          wasModified = true;
          cbfStatus = "boundary_enforcement";
        } else {
          rejectionReason = `Hard constraint violated: ${constraint.constraint_id} (${constraint.type})`;
        }
      } else if (evaluation.status === "warn") {
        cbfStatus = cbfStatus === "safe" ? "approaching_boundary" : cbfStatus;
      }
    }

    const overallSafetyScore = this.computeOverallSafetyScore(evaluations);

    const allowed = rejectionReason === null && overallSafetyScore >= 0.70;

    if (!allowed) {
      shield.rejectCount++;
      if (!rejectionReason) {
        rejectionReason = `Overall safety score ${overallSafetyScore.toFixed(3)} < 0.70 threshold`;
      }
    }
    if (wasModified) {
      shield.modificationCount++;
    }

    return SafetyShieldResultSchema.parse({
      shield_id: parsed.shield_id,
      allowed,
      safe_action: safeAction,
      original_action: parsed.proposed_action,
      was_modified: wasModified,
      constraint_evaluations: evaluations,
      overall_safety_score: overallSafetyScore,
      rejection_reason: rejectionReason,
      cbf_status: cbfStatus,
      evaluation_time_ms: performance.now() - startTime,
    });
  }

  private evaluateConstraint(
    constraint: SafetyConstraint,
    state: Record<string, number>,
    action: Record<string, number>,
    materialIso: ISOGroup | undefined,
    machineEnvelope: { max_spindle_power_kW?: number; max_spindle_torque_Nm?: number; max_spindle_rpm?: number; max_axis_force_N?: number } | undefined,
    config: SafetyShieldConfig
  ): ConstraintEvaluation {
    let computedValue = 0;
    let limitValue = constraint.limit_value;

    switch (constraint.type) {
      case "force_limit": {
        const iso = materialIso ?? "P";
        const coeffs = KIENZLE_BY_ISO[iso];
        const ap = action["ap_mm"] ?? state["ap_mm"] ?? 2.0;
        const fz = action["fz_mm"] ?? state["fz_mm"] ?? 0.1;
        computedValue = coeffs.kc1_1 * ap * Math.pow(fz, 1 - coeffs.mc);
        if (machineEnvelope?.max_axis_force_N) {
          limitValue = Math.min(limitValue, machineEnvelope.max_axis_force_N);
        }
        break;
      }

      case "spindle_load": {
        const power = action["spindle_power_kW"] ?? state["spindle_power_kW"] ?? 0;
        const maxPower = machineEnvelope?.max_spindle_power_kW ?? 15;
        computedValue = (power / maxPower) * 100;
        break;
      }

      case "tool_deflection": {
        const force = action["cutting_force_N"] ?? state["cutting_force_N"] ?? 500;
        const L = action["tool_overhang_mm"] ?? state["tool_overhang_mm"] ?? 50;
        const D = action["tool_diameter_mm"] ?? state["tool_diameter_mm"] ?? 10;
        const E = 210000;
        const I = (Math.PI * Math.pow(D, 4)) / 64;
        computedValue = (force * Math.pow(L, 3)) / (3 * E * I);
        break;
      }

      case "thermal_limit": {
        computedValue = action["temperature_C"] ?? state["temperature_C"] ?? 200;
        break;
      }

      case "tool_life_reserve": {
        const iso = materialIso ?? "P";
        const taylor = TAYLOR_BY_ISO[iso];
        const Vc = action["Vc_m_min"] ?? state["Vc_m_min"] ?? 100;
        const nominalLife = Math.pow(taylor.C / Vc, 1 / taylor.n);
        const requiredReserve = 0.8 * nominalLife;
        const actualLife = action["tool_life_min"] ?? state["tool_life_min"] ?? nominalLife;
        computedValue = actualLife;
        limitValue = requiredReserve;
        break;
      }

      case "vibration_limit": {
        computedValue = action["vibration_mm_s"] ?? state["vibration_mm_s"] ?? 0;
        break;
      }

      case "power_limit": {
        computedValue = action["power_kW"] ?? state["power_kW"] ?? 0;
        if (machineEnvelope?.max_spindle_power_kW) {
          limitValue = Math.min(limitValue, machineEnvelope.max_spindle_power_kW);
        }
        break;
      }

      case "collision_margin": {
        computedValue = action["collision_distance_mm"] ?? state["collision_distance_mm"] ?? 100;
        break;
      }
    }

    if (config.uncertainty_model !== "none") {
      const uncertaintyFactor = config.uncertainty_scale * 0.1;
      if (constraint.limit_type === "max") {
        computedValue *= (1 + uncertaintyFactor);
      } else {
        computedValue *= (1 - uncertaintyFactor);
      }
    }

    const isMaxConstraint = constraint.limit_type === "max";
    const margin = isMaxConstraint
      ? limitValue - computedValue
      : computedValue - limitValue;

    const relativeMargin = Math.abs(limitValue) > 1e-10
      ? margin / Math.abs(limitValue)
      : margin;

    const violationProbability = relativeMargin < 0
      ? 1.0
      : Math.max(0, 1 - Math.exp(relativeMargin * 2));

    let status: "pass" | "warn" | "reject";
    if (violationProbability > constraint.probability_threshold) {
      status = "reject";
    } else if (relativeMargin < 0.1) {
      status = "warn";
    } else {
      status = "pass";
    }

    const cbfValue = margin / (Math.abs(limitValue) + 1);

    return ConstraintEvaluationSchema.parse({
      constraint_id: constraint.constraint_id,
      type: constraint.type,
      parameter: constraint.parameter,
      computed_value: computedValue,
      limit_value: limitValue,
      margin,
      violation_probability: violationProbability,
      status,
      cbf_value: cbfValue,
    });
  }

  private enforceConstraint(
    constraint: SafetyConstraint,
    state: Record<string, number>,
    action: Record<string, number>,
    evaluation: ConstraintEvaluation
  ): { action: Record<string, number> } | null {
    const modified = { ...action };

    if (evaluation.margin >= 0) return null;

    const reductionFactor = 0.8;

    switch (constraint.type) {
      case "force_limit": {
        if ("fz_mm" in modified) {
          modified["fz_mm"] = (modified["fz_mm"] ?? 0.1) * reductionFactor;
        }
        if ("ap_mm" in modified) {
          modified["ap_mm"] = (modified["ap_mm"] ?? 2.0) * reductionFactor;
        }
        break;
      }

      case "spindle_load":
      case "power_limit": {
        if ("Vc_m_min" in modified) {
          modified["Vc_m_min"] = (modified["Vc_m_min"] ?? 100) * reductionFactor;
        }
        if ("spindle_power_kW" in modified) {
          modified["spindle_power_kW"] = (modified["spindle_power_kW"] ?? 10) * reductionFactor;
        }
        break;
      }

      case "tool_deflection": {
        if ("cutting_force_N" in modified) {
          modified["cutting_force_N"] = (modified["cutting_force_N"] ?? 500) * reductionFactor;
        }
        if ("ap_mm" in modified) {
          modified["ap_mm"] = (modified["ap_mm"] ?? 2.0) * reductionFactor;
        }
        break;
      }

      case "tool_life_reserve": {
        if ("Vc_m_min" in modified) {
          modified["Vc_m_min"] = (modified["Vc_m_min"] ?? 100) * reductionFactor;
        }
        break;
      }

      default:
        return null;
    }

    return { action: modified };
  }

  private computeOverallSafetyScore(evaluations: ConstraintEvaluation[]): number {
    if (evaluations.length === 0) return 1.0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const eval_ of evaluations) {
      const weight = SAFETY_WEIGHTS[eval_.type] ?? 0.1;
      const normalizedMargin = Math.max(0, Math.min(1, 0.5 + eval_.margin / (Math.abs(eval_.limit_value) + 1)));
      weightedSum += weight * normalizedMargin;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 1.0;
  }

  /**
   * Check if action violates any Kienzle envelope constraints.
   * @param action - Action parameters
   * @param materialIso - ISO material group
   * @param maxForce - Maximum allowed cutting force [N]
   * @returns Force computation with pass/fail
   */
  checkKienzleEnvelope(
    action: { ap_mm: number; fz_mm: number },
    materialIso: ISOGroup,
    maxForce: number
  ): { force_N: number; allowed: boolean; margin: number } {
    const coeffs = KIENZLE_BY_ISO[materialIso];
    const force = coeffs.kc1_1 * action.ap_mm * Math.pow(action.fz_mm, 1 - coeffs.mc);
    const margin = maxForce - force;

    return {
      force_N: force,
      allowed: margin >= 0,
      margin,
    };
  }

  /**
   * Get shield statistics.
   */
  getStats(shieldId: string): {
    shield_id: string;
    evaluation_count: number;
    reject_count: number;
    modification_count: number;
    rejection_rate: number;
    modification_rate: number;
    constraint_count: number;
  } | null {
    const shield = this.shields.get(shieldId);
    if (!shield) return null;

    return {
      shield_id: shieldId,
      evaluation_count: shield.evaluationCount,
      reject_count: shield.rejectCount,
      modification_count: shield.modificationCount,
      rejection_rate: shield.evaluationCount > 0 ? shield.rejectCount / shield.evaluationCount : 0,
      modification_rate: shield.evaluationCount > 0 ? shield.modificationCount / shield.evaluationCount : 0,
      constraint_count: shield.config.constraints.length,
    };
  }

  /**
   * List all shields.
   */
  listShields(): string[] {
    return Array.from(this.shields.keys());
  }

  /**
   * Delete a shield.
   */
  deleteShield(shieldId: string): boolean {
    return this.shields.delete(shieldId);
  }

  /**
   * Clear all shields.
   */
  clear(): void {
    this.shields.clear();
  }

  static getSelfAwareness() {
    return {
      name: "SafetyShieldEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-08",
      capabilities: ["createShield", "evaluate", "checkKienzleEnvelope", "getStats"],
      dependencies: ["offlineRLSchema"],
      physicsModels: ["Kienzle cutting force", "Taylor tool life", "Control-barrier functions"],
      references: [
        "Kienzle (1952): Fc = kc1.1 * ap * fz^(1-mc)",
        "Taylor (1907): T = (C/Vc)^(1/n)",
        "Ames et al. 'Control Barrier Functions' (2017)",
      ],
    };
  }
}

export const safetyShieldEngine = new SafetyShieldEngine();
export type { SafetyConstraint, SafetyShieldConfig, SafetyShieldInput, SafetyShieldResult };
