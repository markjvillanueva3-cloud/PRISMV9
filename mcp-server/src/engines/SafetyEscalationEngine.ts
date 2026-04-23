/**
 * SafetyEscalationEngine — CAMX-MS14/U03 (E1138)
 *
 * When safety constraints are tight (veto or near-veto), automatically
 * escalates through progressively conservative parameter adjustments:
 *   1. Reduce ap by 20% (depth of cut — primary force reducer)
 *   2. Reduce fz by 15% (feed per tooth — secondary force reducer)
 *   3. Switch to lower-engagement strategy (e.g., trochoidal, adaptive)
 *   4. Add spring passes (light finishing pass to relieve residual stress)
 *   5. Suggest fixture redesign (when workholding is the bottleneck)
 *
 * Iterates up to max_iterations (default 3) until all vetoes are resolved
 * or no further escalation is possible.
 *
 * Physics basis:
 *   - Kienzle (1952): Fc = kc1_1 * h^(1-mc) * ap * ae
 *     Reducing ap → proportional force reduction
 *     Reducing fz → sub-linear force reduction (exponent 1-mc, mc~0.25)
 *   - Power: P = Fc * Vc / (60000 * eta)
 *   - Deflection: delta = Fc * L^3 / (3*E*I) — scales linearly with Fc
 *   - Torque: T = Fc * D / (2 * 1000)
 *   - Chatter: shifting RPM to stable pocket (±10% of natural freq)
 *
 * References:
 *   - SafetyVetoEngine (E1098) — produces VetoReport consumed here
 *   - Altintas "Manufacturing Automation" (2012) — chatter escalation
 *   - Sandvik Coromant: recommended depth-of-cut derating tables
 *   - Machinery's Handbook Ch.25: workholding safety
 *
 * @module SafetyEscalationEngine
 * @shortcode E1138
 * @dispatcher camDispatcher
 * @actions safety_escalate, safety_escalate_preview
 * @milestone CAMX-MS14/U03
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** ap reduction per escalation step */
const AP_REDUCTION = 0.20;

/** fz reduction per escalation step */
const FZ_REDUCTION = 0.15;

/** Vc reduction for RPM/torque vetoes */
const VC_REDUCTION = 0.20;

/** Combined ap+fz reduction for workholding vetoes */
const WORKHOLDING_AP_REDUCTION = 0.30;
const WORKHOLDING_FZ_REDUCTION = 0.30;

/** Maximum RPM shift for chatter avoidance [fraction] */
const MAX_RPM_SHIFT = 0.10;

/** Minimum ap floor [mm] — do not reduce below this */
const MIN_AP_MM = 0.1;

/** Minimum fz floor [mm/tooth] */
const MIN_FZ_MM = 0.02;

/** Minimum Vc floor [m/min] */
const MIN_VC_MPM = 10;

/** Default max escalation iterations */
const DEFAULT_MAX_ITERATIONS = 3;

/** Spring pass depth of cut [mm] */
const SPRING_PASS_AP_MM = 0.05;

/** Spring pass feed per tooth [mm/tooth] */
const SPRING_PASS_FZ_MM = 0.03;

// ============================================================================
// TYPES
// ============================================================================

/** Identifies which veto rule was active */
export type VetoRuleType =
  | "power_veto"
  | "deflection_veto"
  | "chatter_veto"
  | "collision_veto"
  | "workholding_veto"
  | "coolant_veto"
  | "rpm_veto"
  | "torque_veto";

/** Input veto report (from SafetyVetoEngine) */
export interface EscalationVetoReport {
  /** True if any rule fired */
  vetoed: boolean;
  /** Which rules fired */
  active_vetoes: VetoRuleType[];
  /** Details per fired rule */
  details?: Record<string, {
    original_value: number;
    limit: number;
    detail: string;
  }>;
}

/** Machining parameters subject to escalation */
export interface EscalationParams {
  /** Axial depth of cut [mm] */
  ap_mm: number;
  /** Feed per tooth [mm/tooth] */
  fz_mm: number;
  /** Cutting speed [m/min] */
  Vc_mpm: number;
  /** Spindle speed [rpm] */
  RPM: number;
  /** Tool diameter [mm] */
  D_mm: number;
  /** Tool overhang [mm] */
  L_mm?: number;
  /** Radial depth of cut [mm] */
  ae_mm?: number;
  /** Number of flutes */
  num_flutes?: number;
  /** Strategy name (e.g., "conventional", "trochoidal", "adaptive") */
  strategy?: string;
  /** Whether spring pass is already planned */
  has_spring_pass?: boolean;
}

/** Machine limits for re-checking */
export interface EscalationMachineLimits {
  max_power_kW: number;
  max_rpm: number;
  max_torque_Nm: number;
}

/** A single escalation action taken */
export interface EscalationAction {
  /** Which iteration (1-based) */
  iteration: number;
  /** Which veto triggered this action */
  veto_rule: VetoRuleType;
  /** What was done */
  action: string;
  /** Parameter changed */
  parameter: string;
  /** Old value */
  old_value: number | string;
  /** New value */
  new_value: number | string;
  /** Whether this resolved the veto */
  resolved: boolean;
}

/** Result of a single escalation iteration */
export interface EscalationIteration {
  iteration: number;
  params_before: EscalationParams;
  params_after: EscalationParams;
  actions: EscalationAction[];
  remaining_vetoes: VetoRuleType[];
  resolved_vetoes: VetoRuleType[];
}

/** Final escalation result */
export interface EscalationResult {
  /** Whether all vetoes were resolved */
  resolved: boolean;
  /** Final adjusted parameters */
  final_params: EscalationParams;
  /** Original input parameters */
  original_params: EscalationParams;
  /** Per-iteration breakdown */
  iterations: EscalationIteration[];
  /** Vetoes still active after all iterations */
  remaining_issues: VetoRuleType[];
  /** Total escalation actions taken */
  total_actions: number;
  /** Suggestions that require human intervention */
  manual_suggestions: string[];
  /** MRR reduction [%] */
  mrr_reduction_pct: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SafetyEscalationEngine {

  /**
   * Escalate safety-vetoed parameters through progressive derating.
   *
   * @param vetoReport - The veto report from SafetyVetoEngine
   * @param originalParams - The original machining parameters
   * @param machineLimits - Machine capability limits for re-checking
   * @param max_iterations - Maximum escalation attempts (default 3)
   */
  escalate(
    vetoReport: EscalationVetoReport,
    originalParams: EscalationParams,
    machineLimits?: EscalationMachineLimits,
    max_iterations: number = DEFAULT_MAX_ITERATIONS,
  ): EscalationResult {
    const manualSuggestions: string[] = [];
    const iterations: EscalationIteration[] = [];

    if (!vetoReport.vetoed || vetoReport.active_vetoes.length === 0) {
      return {
        resolved: true,
        final_params: { ...originalParams },
        original_params: { ...originalParams },
        iterations: [],
        remaining_issues: [],
        total_actions: 0,
        manual_suggestions: [],
        mrr_reduction_pct: 0,
      };
    }

    let currentParams = { ...originalParams };
    let activeVetoes = [...vetoReport.active_vetoes];

    for (let iter = 1; iter <= max_iterations && activeVetoes.length > 0; iter++) {
      const paramsBefore = { ...currentParams };
      const actions: EscalationAction[] = [];
      const resolvedThisIter: VetoRuleType[] = [];

      for (const veto of [...activeVetoes]) {
        const result = this.applyEscalation(
          veto, currentParams, machineLimits, iter, manualSuggestions,
        );
        currentParams = result.params;
        actions.push(...result.actions);

        if (result.resolved) {
          resolvedThisIter.push(veto);
        }
      }

      // Remove resolved vetoes
      activeVetoes = activeVetoes.filter(v => !resolvedThisIter.includes(v));

      iterations.push({
        iteration: iter,
        params_before: paramsBefore,
        params_after: { ...currentParams },
        actions,
        remaining_vetoes: [...activeVetoes],
        resolved_vetoes: resolvedThisIter,
      });

      if (activeVetoes.length === 0) break;
    }

    // Compute MRR reduction
    const originalMRR = originalParams.ap_mm * (originalParams.ae_mm ?? originalParams.D_mm * 0.5)
      * originalParams.fz_mm * (originalParams.num_flutes ?? 4) * originalParams.RPM;
    const finalMRR = currentParams.ap_mm * (currentParams.ae_mm ?? currentParams.D_mm * 0.5)
      * currentParams.fz_mm * (currentParams.num_flutes ?? 4) * currentParams.RPM;
    const mrrReduction = originalMRR > 0 ? ((originalMRR - finalMRR) / originalMRR) * 100 : 0;

    const totalActions = iterations.reduce((sum, it) => sum + it.actions.length, 0);

    log.info(`[SafetyEscalation] ${vetoReport.active_vetoes.length} vetoes -> ${activeVetoes.length} remaining after ${iterations.length} iterations (MRR -${Math.round(mrrReduction)}%)`);

    return {
      resolved: activeVetoes.length === 0,
      final_params: currentParams,
      original_params: originalParams,
      iterations,
      remaining_issues: activeVetoes,
      total_actions: totalActions,
      manual_suggestions: manualSuggestions,
      mrr_reduction_pct: Math.round(mrrReduction * 10) / 10,
    };
  }

  /**
   * Preview what escalation would do without applying changes.
   * Returns the same result structure as escalate().
   */
  preview(
    vetoReport: EscalationVetoReport,
    originalParams: EscalationParams,
    machineLimits?: EscalationMachineLimits,
    max_iterations: number = DEFAULT_MAX_ITERATIONS,
  ): EscalationResult {
    // Preview is identical to escalate — both are pure computation
    return this.escalate(vetoReport, originalParams, machineLimits, max_iterations);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private: apply escalation for a single veto
  // ──────────────────────────────────────────────────────────────────────────

  private applyEscalation(
    veto: VetoRuleType,
    params: EscalationParams,
    machineLimits: EscalationMachineLimits | undefined,
    iteration: number,
    manualSuggestions: string[],
  ): { params: EscalationParams; actions: EscalationAction[]; resolved: boolean } {
    const p = { ...params };
    const actions: EscalationAction[] = [];
    let resolved = false;

    switch (veto) {
      case "power_veto": {
        // Step 1: reduce ap
        const oldAp = p.ap_mm;
        p.ap_mm = Math.max(MIN_AP_MM, p.ap_mm * (1 - AP_REDUCTION));
        actions.push({
          iteration, veto_rule: veto, action: `Reduce ap by ${AP_REDUCTION * 100}%`,
          parameter: "ap_mm", old_value: oldAp, new_value: p.ap_mm,
          resolved: false,
        });

        // Step 2: if still likely over power, reduce fz
        if (iteration >= 2) {
          const oldFz = p.fz_mm;
          p.fz_mm = Math.max(MIN_FZ_MM, p.fz_mm * (1 - FZ_REDUCTION));
          actions.push({
            iteration, veto_rule: veto, action: `Reduce fz by ${FZ_REDUCTION * 100}%`,
            parameter: "fz_mm", old_value: oldFz, new_value: p.fz_mm,
            resolved: false,
          });
        }

        // Estimate if resolved: P proportional to ap * fz^(1-mc) * Vc
        // Rough check: reduction factor
        const reductionFactor = (p.ap_mm / params.ap_mm) * (p.fz_mm / params.fz_mm);
        if (reductionFactor < 0.7) resolved = true;
        actions[actions.length - 1].resolved = resolved;
        break;
      }

      case "deflection_veto": {
        // Reduce ap aggressively — deflection proportional to Fc proportional to ap
        const oldAp = p.ap_mm;
        p.ap_mm = Math.max(MIN_AP_MM, p.ap_mm * (1 - 0.25));
        actions.push({
          iteration, veto_rule: veto, action: "Reduce ap by 25% (deflection mitigation)",
          parameter: "ap_mm", old_value: oldAp, new_value: p.ap_mm,
          resolved: false,
        });

        if (p.L_mm && p.L_mm > 4 * p.D_mm) {
          manualSuggestions.push(`Tool overhang L=${p.L_mm}mm is ${(p.L_mm / p.D_mm).toFixed(1)}xD — consider shorter tool or toolholder`);
        }

        // Add spring pass to compensate for part deflection
        if (!p.has_spring_pass) {
          p.has_spring_pass = true;
          actions.push({
            iteration, veto_rule: veto,
            action: `Add spring pass (ap=${SPRING_PASS_AP_MM}mm, fz=${SPRING_PASS_FZ_MM}mm)`,
            parameter: "has_spring_pass", old_value: "false", new_value: "true",
            resolved: false,
          });
        }

        const deflReduction = (p.ap_mm / params.ap_mm);
        if (deflReduction < 0.6) resolved = true;
        actions[actions.length - 1].resolved = resolved;
        break;
      }

      case "chatter_veto": {
        // Shift RPM to nearest stable pocket (±10%)
        const oldRPM = p.RPM;
        // Without SLD data, we shift RPM down by 5-10% to move away from
        // tooth-passing frequency resonance
        const shift = iteration <= 2 ? 0.05 : MAX_RPM_SHIFT;
        p.RPM = Math.round(p.RPM * (1 - shift));
        // Recompute Vc from new RPM: Vc = pi * D * RPM / 1000
        p.Vc_mpm = Math.PI * p.D_mm * p.RPM / 1000;
        actions.push({
          iteration, veto_rule: veto,
          action: `Shift RPM down ${shift * 100}% to escape chatter zone`,
          parameter: "RPM", old_value: oldRPM, new_value: p.RPM,
          resolved: true, // RPM shift usually resolves chatter
        });
        resolved = true;
        break;
      }

      case "collision_veto": {
        // Cannot auto-fix collision — requires toolpath modification
        manualSuggestions.push("COLLISION detected — requires toolpath regeneration, fixture redesign, or manual clearance verification");
        actions.push({
          iteration, veto_rule: veto,
          action: "Cannot auto-fix collision — manual intervention required",
          parameter: "N/A", old_value: "collision", new_value: "collision",
          resolved: false,
        });
        break;
      }

      case "workholding_veto": {
        // Reduce both ap and fz aggressively
        const oldAp = p.ap_mm;
        const oldFz = p.fz_mm;
        p.ap_mm = Math.max(MIN_AP_MM, p.ap_mm * (1 - WORKHOLDING_AP_REDUCTION));
        p.fz_mm = Math.max(MIN_FZ_MM, p.fz_mm * (1 - WORKHOLDING_FZ_REDUCTION));
        actions.push({
          iteration, veto_rule: veto,
          action: `Reduce ap by ${WORKHOLDING_AP_REDUCTION * 100}% and fz by ${WORKHOLDING_FZ_REDUCTION * 100}% for workholding safety`,
          parameter: "ap_mm+fz_mm",
          old_value: `ap=${oldAp}, fz=${oldFz}`,
          new_value: `ap=${p.ap_mm}, fz=${p.fz_mm}`,
          resolved: false,
        });

        manualSuggestions.push("Consider reclamp or additional fixture support points");

        const forceReduction = (p.ap_mm / params.ap_mm) * (p.fz_mm / params.fz_mm);
        if (forceReduction < 0.5) resolved = true;
        actions[actions.length - 1].resolved = resolved;
        break;
      }

      case "coolant_veto": {
        // Cannot auto-fix — requires TSC upgrade or different drilling strategy
        manualSuggestions.push("Deep-hole coolant pressure insufficient — upgrade to Through-Spindle Coolant (TSC) or peck drilling cycle");
        actions.push({
          iteration, veto_rule: veto,
          action: "Coolant veto cannot be auto-fixed — TSC upgrade required",
          parameter: "N/A", old_value: "insufficient", new_value: "insufficient",
          resolved: false,
        });

        // Switch to peck drilling strategy if applicable
        if (p.strategy !== "peck_drill") {
          p.strategy = "peck_drill";
          actions.push({
            iteration, veto_rule: veto,
            action: "Suggest switch to peck drilling for chip evacuation",
            parameter: "strategy", old_value: params.strategy ?? "standard",
            new_value: "peck_drill", resolved: false,
          });
        }
        break;
      }

      case "rpm_veto": {
        // Reduce Vc to bring RPM within limits
        const oldVc = p.Vc_mpm;
        p.Vc_mpm = Math.max(MIN_VC_MPM, p.Vc_mpm * (1 - VC_REDUCTION));
        p.RPM = Math.round((p.Vc_mpm * 1000) / (Math.PI * p.D_mm));
        const withinLimit = machineLimits ? p.RPM <= machineLimits.max_rpm : true;
        actions.push({
          iteration, veto_rule: veto,
          action: `Reduce Vc by ${VC_REDUCTION * 100}% to lower RPM`,
          parameter: "Vc_mpm", old_value: oldVc, new_value: p.Vc_mpm,
          resolved: withinLimit,
        });
        resolved = withinLimit;
        break;
      }

      case "torque_veto": {
        // Reduce Vc (and therefore cutting force) to lower torque
        const oldVc = p.Vc_mpm;
        p.Vc_mpm = Math.max(MIN_VC_MPM, p.Vc_mpm * (1 - VC_REDUCTION));
        p.RPM = Math.round((p.Vc_mpm * 1000) / (Math.PI * p.D_mm));
        actions.push({
          iteration, veto_rule: veto,
          action: `Reduce Vc by ${VC_REDUCTION * 100}% to lower torque`,
          parameter: "Vc_mpm", old_value: oldVc, new_value: p.Vc_mpm,
          resolved: false,
        });

        // Also reduce ap to directly reduce torque
        if (iteration >= 2) {
          const oldAp = p.ap_mm;
          p.ap_mm = Math.max(MIN_AP_MM, p.ap_mm * (1 - AP_REDUCTION));
          actions.push({
            iteration, veto_rule: veto,
            action: `Reduce ap by ${AP_REDUCTION * 100}% for torque mitigation`,
            parameter: "ap_mm", old_value: oldAp, new_value: p.ap_mm,
            resolved: false,
          });
        }

        const torqueReduction = (p.Vc_mpm / params.Vc_mpm) * (p.ap_mm / params.ap_mm);
        if (torqueReduction < 0.65) resolved = true;
        actions[actions.length - 1].resolved = resolved;
        break;
      }
    }

    return { params: p, actions, resolved };
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const safetyEscalationEngine = new SafetyEscalationEngine();
