/**
 * SafetyVetoEngine — CAMX-MS14/U02 (E1098)
 *
 * Hard safety vetoes that can NEVER be overridden. This is the final safety
 * gate before any machining parameter is accepted into a program.
 *
 * Eight mandatory veto rules:
 *   1. power_veto      — Fc * Vc / 60000 > machine_max_power_kw * 0.85
 *   2. deflection_veto — Fc * L³ / (3·E·I) > tolerance_mm / 3
 *   3. chatter_veto    — P(chatter) > 0.15 (tooth-passing freq near natural freq)
 *   4. collision_veto  — any collision detected (zero tolerance)
 *   5. workholding_veto — cutting_force / (μ · grip_force · n_points) > 1/1.5
 *   6. coolant_veto    — deep hole (L/D > 3) AND coolant_pressure < 40 bar
 *   7. rpm_veto        — RPM > machine_max_rpm * 1.05
 *   8. torque_veto     — Fc * D/2 / 1000 > machine_max_torque_Nm
 *
 * Auto-escalation when vetoed (tries to fix automatically, up to max_iterations):
 *   - power_veto      → reduce ap 20%, recheck; if still veto reduce fz 15%
 *   - deflection_veto → reduce ap 25%, recheck; suggest shorter tool
 *   - chatter_veto    → shift RPM to nearest stable pocket (±10%)
 *   - workholding_veto → reduce ap+fz 30%; suggest reclamp
 *   - coolant_veto    → flag for TSC upgrade; cannot auto-fix
 *   - rpm_veto        → reduce Vc 20%, recompute RPM, recheck
 *   - torque_veto     → reduce Vc 20%, recheck
 *
 * References:
 *   - Kienzle (1952): cutting force model
 *   - Altintas "Manufacturing Automation" (2012): chatter threshold
 *   - Coulomb friction: workholding safety factor
 *   - Sandvik coolant guide: 40 bar minimum for L/D > 3 deep holes
 *   - Machinery's Handbook Ch.25: workholding, deflection
 *
 * @module SafetyVetoEngine
 * @shortcode E1098
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum allowed fraction of machine rated power */
const POWER_DERATING = 0.85;

/** Chatter probability hard limit */
const CHATTER_LIMIT = 0.15;

/** Workholding minimum safety factor (Coulomb friction model) */
const WORKHOLDING_MIN_SF = 1.5;

/** Deflection limit divisor relative to part tolerance */
const DEFLECTION_DIVISOR = 3;

/** Deep-hole threshold by L/D ratio */
const DEEP_HOLE_LD = 3;

/** Minimum coolant pressure [bar] for deep holes */
const MIN_COOLANT_PRESSURE_BAR = 40;

/** RPM overspeed allowance factor (105% of machine max) */
const RPM_OVERSPEED_FACTOR = 1.05;

/** Elastic modulus for solid carbide tooling [Pa] */
const CARBIDE_E_PA = 6e11;

/** Default tool second moment of area for circular cross-section [m^4] when D=10mm */
const DEFAULT_I_M4 = Math.PI * (0.01 ** 4) / 64;

// ============================================================================
// TYPES
// ============================================================================

/** Identifies which veto rule fired */
export type VetoRule =
  | "power_veto"
  | "deflection_veto"
  | "chatter_veto"
  | "collision_veto"
  | "workholding_veto"
  | "coolant_veto"
  | "rpm_veto"
  | "torque_veto";

/** Raw machining parameters subject to veto checks */
export interface VetoParams {
  /** Cutting force [N] */
  Fc_N: number;
  /** Cutting speed [m/min] */
  Vc_mpm: number;
  /** Axial depth of cut [mm] */
  ap_mm: number;
  /** Feed per tooth [mm/tooth] */
  fz_mm: number;
  /** Tool diameter [mm] */
  D_mm: number;
  /** Tool overhang/stickout [mm] */
  L_mm: number;
  /** Spindle speed [rpm] */
  RPM: number;
  /** Chatter probability 0–1 (from ChatterPredictionEngine or equivalent) */
  chatter_probability: number;
  /** Whether any collision was detected (from CollisionDetectionEngine) */
  collision_detected: boolean;
  /** Part tolerance [mm] — used for deflection limit */
  tolerance_mm?: number;
  /** Tool elastic modulus [Pa] — defaults to carbide (6e11 Pa) */
  elastic_modulus_Pa?: number;
  /** Second moment of area [m^4] — computed from D if omitted */
  I_m4?: number;
  /** Hole depth [mm] — for coolant deep-hole check */
  hole_depth_mm?: number;
  /** Coolant supply pressure [bar] */
  coolant_pressure_bar?: number;
}

/** Machine capability constraints */
export interface MachineConstraints {
  /** Maximum rated power [kW] */
  max_power_kW: number;
  /** Maximum rated spindle speed [rpm] */
  max_rpm: number;
  /** Maximum rated torque [N·m] */
  max_torque_Nm: number;
}

/** Material properties needed for force calculations */
export interface MaterialProps {
  /** Kienzle specific cutting force at h=1mm [N/mm²] */
  kc1_1: number;
  /** Kienzle exponent (0.15–0.35 typical) */
  mc: number;
}

/** Tool properties */
export interface ToolProps {
  /** Tool diameter [mm] */
  D_mm: number;
  /** Tool overhang/stickout [mm] */
  L_mm: number;
  /** Elastic modulus [Pa] — defaults to carbide */
  elastic_modulus_Pa?: number;
  /** Number of cutting teeth/flutes */
  num_teeth?: number;
}

/** Workholding setup */
export interface WorkholdingProps {
  /** Grip force [N] */
  grip_force_N: number;
  /** Coefficient of friction (workpiece–jaw) */
  friction_coefficient: number;
  /** Number of active clamping contact points */
  n_points?: number;
}

/** Result from a single veto rule check */
export interface VetoCheckResult {
  /** Whether this rule triggered a veto */
  vetoed: boolean;
  /** Which rule fired (or null if not vetoed) */
  rule: VetoRule | null;
  /** Computed value that was checked */
  original_value: number;
  /** Threshold that must not be exceeded */
  limit: number;
  /** Human-readable explanation */
  detail: string;
  /** Suggested escalation action (present when vetoed and auto-fixable) */
  escalation_action?: string;
  /** Adjusted parameters after auto-fix attempt (present when fixable) */
  adjusted_params?: Partial<VetoParams>;
}

/** Aggregated report from checkAllVetos */
export interface VetoReport {
  /** True if any rule fired */
  vetoed: boolean;
  /** List of all individual veto results */
  checks: VetoCheckResult[];
  /** Only the vetoed rules */
  active_vetos: VetoCheckResult[];
  /** Parameters as supplied (unchanged) */
  original_params: VetoParams;
  /** Machine constraints used */
  machine: MachineConstraints;
  /** Workholding used */
  workholding: WorkholdingProps;
}

/** Result from autoEscalate */
export interface EscalationResult {
  /** True if all vetos were resolved */
  resolved: boolean;
  /** Final parameter set after escalation attempts */
  final_params: VetoParams;
  /** Number of escalation iterations used */
  iterations: number;
  /** Veto rules that remain unresolved after all iterations */
  remaining_vetos: VetoRule[];
  /** Log of actions taken each iteration */
  escalation_log: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

/** Compute second moment of area for circular cross-section tool [m^4] */
function computeI(D_mm: number): number {
  const r = (D_mm / 2) / 1000; // convert mm → m
  return Math.PI * r ** 4 / 4;
}

/** Compute tool deflection [mm] using Euler-Bernoulli cantilever formula */
function toolDeflection_mm(Fc_N: number, L_mm: number, E_Pa: number, I_m4: number): number {
  const L_m = L_mm / 1000;
  // δ = F·L³ / (3·E·I)   [units: N·m³ / (Pa·m⁴) = N·m³ / (N/m²·m⁴) = m]
  return (Fc_N * L_m ** 3) / (3 * E_Pa * I_m4) * 1000; // convert m → mm
}

/** Compute chatter probability from tooth-passing frequency vs natural frequencies.
 *  Uses a Lorentzian proximity function: P = 1 – product_k(1 – exp(–((f_tp–f_n_k)/bw_k)²))
 *  where bw_k = 0.05 * f_n_k (5% bandwidth).
 *  Returns the supplied value directly if already computed externally.
 */
function chatterProbability(
  p_external: number,
  RPM: number,
  num_teeth: number,
  natural_freqs_Hz?: number[],
): number {
  // If a pre-computed value was supplied (from ChatterPredictionEngine) use it directly
  if (!natural_freqs_Hz || natural_freqs_Hz.length === 0) return p_external;

  const f_tooth_passing = (RPM * num_teeth) / 60; // Hz
  let p_safe = 1.0;
  for (const fn of natural_freqs_Hz) {
    const bw = 0.05 * fn;
    const distance_ratio = (f_tooth_passing - fn) / bw;
    p_safe *= 1 - Math.exp(-(distance_ratio ** 2));
  }
  return 1 - p_safe;
}

/** Nearest stable RPM pocket: shift by ±fraction until chatter probability drops */
function nearestStablePocket(
  RPM: number,
  num_teeth: number,
  natural_freqs_Hz: number[],
  max_shift_fraction = 0.10,
  steps = 20,
): number {
  if (natural_freqs_Hz.length === 0) return RPM * (1 - max_shift_fraction);

  let best_rpm = RPM;
  let best_p = 1.0;

  for (let i = -steps; i <= steps; i++) {
    const candidate = RPM * (1 + (i / steps) * max_shift_fraction);
    if (candidate <= 0) continue;
    const p = chatterProbability(0, candidate, num_teeth, natural_freqs_Hz);
    if (p < best_p) {
      best_p = p;
      best_rpm = candidate;
    }
  }
  return best_rpm;
}

// ============================================================================
// CORE CLASS
// ============================================================================

export class SafetyVetoEngine {

  // --------------------------------------------------------------------------
  // checkVeto — single rule check
  // --------------------------------------------------------------------------

  /**
   * Check a single veto rule against the supplied parameters.
   *
   * @param rule      - The rule identifier to check
   * @param params    - Current machining parameters
   * @param machine   - Machine capability constraints
   * @param workholding - Workholding configuration (required for workholding_veto)
   * @param naturalFreqs_Hz - Machine natural frequencies [Hz] for chatter pocket shift
   * @returns VetoCheckResult with vetoed flag, values, and optional escalation
   */
  checkVeto(
    rule: VetoRule,
    params: VetoParams,
    machine: MachineConstraints,
    workholding?: WorkholdingProps,
    naturalFreqs_Hz?: number[],
  ): VetoCheckResult {
    const E = params.elastic_modulus_Pa ?? CARBIDE_E_PA;
    const I = params.I_m4 ?? computeI(params.D_mm);
    const tol = params.tolerance_mm ?? 0.05;
    const n_pts = workholding?.n_points ?? 1;
    const mu = workholding?.friction_coefficient ?? 0.3;
    const grip = workholding?.grip_force_N ?? Infinity;

    switch (rule) {
      // ── 1. Power veto ──────────────────────────────────────────────────────
      case "power_veto": {
        const power_kW = (params.Fc_N * params.Vc_mpm) / 60_000;
        const limit_kW = machine.max_power_kW * POWER_DERATING;
        const vetoed = power_kW > limit_kW;
        const result: VetoCheckResult = {
          vetoed,
          rule: vetoed ? "power_veto" : null,
          original_value: power_kW,
          limit: limit_kW,
          detail: `Power ${power_kW.toFixed(2)} kW vs limit ${limit_kW.toFixed(2)} kW (${(POWER_DERATING * 100).toFixed(0)}% of ${machine.max_power_kW} kW rated)`,
        };
        if (vetoed) {
          result.escalation_action = "Reduce ap by 20%; if still vetoed, reduce fz by 15%";
          result.adjusted_params = { ap_mm: params.ap_mm * 0.80 };
        }
        return result;
      }

      // ── 2. Deflection veto ─────────────────────────────────────────────────
      case "deflection_veto": {
        const defl_mm = toolDeflection_mm(params.Fc_N, params.L_mm, E, I);
        const limit_mm = tol / DEFLECTION_DIVISOR;
        const vetoed = defl_mm > limit_mm;
        const result: VetoCheckResult = {
          vetoed,
          rule: vetoed ? "deflection_veto" : null,
          original_value: defl_mm,
          limit: limit_mm,
          detail: `Tool deflection ${defl_mm.toFixed(4)} mm vs limit ${limit_mm.toFixed(4)} mm (tolerance/3 = ${tol}/3)`,
        };
        if (vetoed) {
          result.escalation_action = "Reduce ap by 25%; consider shorter tool (L/D < 4 preferred)";
          result.adjusted_params = { ap_mm: params.ap_mm * 0.75 };
        }
        return result;
      }

      // ── 3. Chatter veto ────────────────────────────────────────────────────
      case "chatter_veto": {
        const p = params.chatter_probability;
        const vetoed = p > CHATTER_LIMIT;
        const result: VetoCheckResult = {
          vetoed,
          rule: vetoed ? "chatter_veto" : null,
          original_value: p,
          limit: CHATTER_LIMIT,
          detail: `P(chatter) = ${(p * 100).toFixed(1)}% vs limit ${(CHATTER_LIMIT * 100).toFixed(0)}%`,
        };
        if (vetoed) {
          const num_teeth = 2; // conservative default if not in params
          const stable_rpm = naturalFreqs_Hz && naturalFreqs_Hz.length > 0
            ? nearestStablePocket(params.RPM, num_teeth, naturalFreqs_Hz)
            : params.RPM * 0.93; // fallback: drop 7%
          result.escalation_action = `Shift RPM to nearest stable pocket (~${stable_rpm.toFixed(0)} rpm, ±10% search)`;
          result.adjusted_params = { RPM: stable_rpm };
        }
        return result;
      }

      // ── 4. Collision veto ──────────────────────────────────────────────────
      case "collision_veto": {
        const vetoed = params.collision_detected;
        return {
          vetoed,
          rule: vetoed ? "collision_veto" : null,
          original_value: vetoed ? 1 : 0,
          limit: 0,
          detail: `Collision detected: ${vetoed}. Zero-tolerance — no auto-fix possible.`,
          escalation_action: vetoed ? "HALT: Review toolpath geometry, fixtures, and machine envelope. Cannot auto-fix." : undefined,
        };
      }

      // ── 5. Workholding veto ────────────────────────────────────────────────
      case "workholding_veto": {
        const holding_capacity = mu * grip * n_pts;
        const ratio = holding_capacity > 0 ? params.Fc_N / holding_capacity : Infinity;
        const limit_ratio = 1 / WORKHOLDING_MIN_SF; // ~0.6667
        const vetoed = ratio > limit_ratio;
        const result: VetoCheckResult = {
          vetoed,
          rule: vetoed ? "workholding_veto" : null,
          original_value: ratio,
          limit: limit_ratio,
          detail: `Cutting force ratio ${ratio.toFixed(3)} vs limit ${limit_ratio.toFixed(3)} (SF must be ≥ ${WORKHOLDING_MIN_SF}). μ=${mu}, grip=${grip.toFixed(0)} N, n=${n_pts}`,
        };
        if (vetoed) {
          result.escalation_action = "Reduce ap+fz by 30% to cut forces; suggest reclamp or add clamp points";
          result.adjusted_params = {
            ap_mm: params.ap_mm * 0.70,
            fz_mm: params.fz_mm * 0.70,
          };
        }
        return result;
      }

      // ── 6. Coolant veto ────────────────────────────────────────────────────
      case "coolant_veto": {
        const ld = params.hole_depth_mm !== undefined && params.D_mm > 0
          ? params.hole_depth_mm / params.D_mm
          : 0;
        const is_deep = ld > DEEP_HOLE_LD;
        const pressure = params.coolant_pressure_bar ?? Infinity;
        const vetoed = is_deep && pressure < MIN_COOLANT_PRESSURE_BAR;
        return {
          vetoed,
          rule: vetoed ? "coolant_veto" : null,
          original_value: pressure,
          limit: MIN_COOLANT_PRESSURE_BAR,
          detail: `L/D = ${ld.toFixed(1)} (${is_deep ? "deep hole" : "not deep"}). Coolant pressure ${pressure === Infinity ? "n/a" : pressure + " bar"} vs minimum ${MIN_COOLANT_PRESSURE_BAR} bar for deep holes.`,
          escalation_action: vetoed ? "Flag for TSC (through-spindle coolant) upgrade. Cannot auto-fix — requires hardware change." : undefined,
        };
      }

      // ── 7. RPM veto ────────────────────────────────────────────────────────
      case "rpm_veto": {
        const limit_rpm = machine.max_rpm * RPM_OVERSPEED_FACTOR;
        const vetoed = params.RPM > limit_rpm;
        const result: VetoCheckResult = {
          vetoed,
          rule: vetoed ? "rpm_veto" : null,
          original_value: params.RPM,
          limit: limit_rpm,
          detail: `RPM ${params.RPM.toFixed(0)} vs limit ${limit_rpm.toFixed(0)} (${(RPM_OVERSPEED_FACTOR * 100).toFixed(0)}% of ${machine.max_rpm} max rated RPM)`,
        };
        if (vetoed) {
          const new_vc = params.Vc_mpm * 0.80;
          const new_rpm = (new_vc * 1000) / (Math.PI * params.D_mm);
          result.escalation_action = `Reduce Vc by 20% → ${new_vc.toFixed(1)} m/min → RPM ${new_rpm.toFixed(0)}`;
          result.adjusted_params = { Vc_mpm: new_vc, RPM: new_rpm };
        }
        return result;
      }

      // ── 8. Torque veto ─────────────────────────────────────────────────────
      case "torque_veto": {
        const torque_Nm = (params.Fc_N * (params.D_mm / 2)) / 1000;
        const limit_Nm = machine.max_torque_Nm;
        const vetoed = torque_Nm > limit_Nm;
        const result: VetoCheckResult = {
          vetoed,
          rule: vetoed ? "torque_veto" : null,
          original_value: torque_Nm,
          limit: limit_Nm,
          detail: `Torque ${torque_Nm.toFixed(1)} N·m vs machine max ${limit_Nm} N·m. Fc=${params.Fc_N.toFixed(0)} N, D/2=${(params.D_mm / 2).toFixed(1)} mm`,
        };
        if (vetoed) {
          const new_vc = params.Vc_mpm * 0.80;
          const new_rpm = (new_vc * 1000) / (Math.PI * params.D_mm);
          result.escalation_action = `Reduce Vc by 20% → ${new_vc.toFixed(1)} m/min (reduces Fc via Taylor-type relationship)`;
          result.adjusted_params = { Vc_mpm: new_vc, RPM: new_rpm };
        }
        return result;
      }

      default: {
        // Exhaustive guard — TypeScript should prevent reaching here
        const _unreachable: never = rule;
        throw new Error(`Unknown veto rule: ${_unreachable}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // checkAllVetos — run all 8 rules
  // --------------------------------------------------------------------------

  /**
   * Run all 8 veto rules against the supplied parameters and context.
   *
   * @param params      - Current machining parameters
   * @param _material   - Material properties (reserved for future Fc recalculation)
   * @param machine     - Machine capability constraints
   * @param _tool       - Tool properties (reserved for future use)
   * @param workholding - Workholding configuration
   * @param naturalFreqs_Hz - Machine structural natural frequencies [Hz]
   * @returns VetoReport aggregating all rule results
   */
  checkAllVetos(
    params: VetoParams,
    _material: MaterialProps | null,
    machine: MachineConstraints,
    _tool: ToolProps | null,
    workholding: WorkholdingProps,
    naturalFreqs_Hz?: number[],
  ): VetoReport {
    const rules: VetoRule[] = [
      "power_veto",
      "deflection_veto",
      "chatter_veto",
      "collision_veto",
      "workholding_veto",
      "coolant_veto",
      "rpm_veto",
      "torque_veto",
    ];

    const checks: VetoCheckResult[] = rules.map((rule) =>
      this.checkVeto(rule, params, machine, workholding, naturalFreqs_Hz)
    );

    const active_vetos = checks.filter((c) => c.vetoed);
    const vetoed = active_vetos.length > 0;

    if (vetoed) {
      log.warn(
        `[SafetyVetoEngine] ${active_vetos.length} veto(s) fired: ${active_vetos.map((v) => v.rule).join(", ")}`
      );
    }

    return {
      vetoed,
      checks,
      active_vetos,
      original_params: params,
      machine,
      workholding,
    };
  }

  // --------------------------------------------------------------------------
  // autoEscalate — iterative auto-fix loop
  // --------------------------------------------------------------------------

  /**
   * Attempt to resolve all active vetos by applying escalation adjustments
   * iteratively. Collision veto and coolant veto cannot be auto-fixed.
   *
   * @param vetoReport    - Report from checkAllVetos
   * @param max_iterations - Maximum fix iterations (default 3)
   * @param naturalFreqs_Hz - Machine natural frequencies for chatter pocket search
   * @returns EscalationResult with resolution status, final parameters, and log
   */
  autoEscalate(
    vetoReport: VetoReport,
    max_iterations = 3,
    naturalFreqs_Hz?: number[],
  ): EscalationResult {
    const log_entries: string[] = [];
    let current_params: VetoParams = { ...vetoReport.original_params };
    const machine = vetoReport.machine;
    const workholding = vetoReport.workholding;

    // Rules that cannot be resolved automatically
    const HARD_BLOCK: VetoRule[] = ["collision_veto", "coolant_veto"];

    // Identify unresolvable vetos immediately
    const hard_blocks = vetoReport.active_vetos.filter((v) => v.rule && HARD_BLOCK.includes(v.rule));
    if (hard_blocks.length > 0) {
      const msgs = hard_blocks.map((v) => `${v.rule}: ${v.detail}`);
      log_entries.push(`HARD BLOCK — cannot auto-fix: ${msgs.join("; ")}`);
    }

    let iteration = 0;
    let remaining_rules: VetoRule[] = vetoReport.active_vetos
      .filter((v) => v.rule !== null)
      .map((v) => v.rule as VetoRule);

    while (iteration < max_iterations && remaining_rules.length > 0) {
      iteration++;
      log_entries.push(`--- Iteration ${iteration} ---`);

      // Apply escalation adjustments for each remaining resolvable veto
      for (const rule of remaining_rules) {
        if (HARD_BLOCK.includes(rule)) {
          log_entries.push(`  SKIP ${rule}: requires manual intervention (${rule === "coolant_veto" ? "TSC hardware upgrade" : "toolpath correction"})`);
          continue;
        }

        // Get escalation for the current state of params
        const check = this.checkVeto(rule, current_params, machine, workholding, naturalFreqs_Hz);
        if (!check.vetoed) {
          log_entries.push(`  ${rule}: already resolved in this iteration`);
          continue;
        }

        // Apply the suggested adjusted_params
        if (check.adjusted_params) {
          const before = JSON.stringify({
            ap: current_params.ap_mm.toFixed(3),
            fz: current_params.fz_mm.toFixed(3),
            Vc: current_params.Vc_mpm.toFixed(1),
            RPM: current_params.RPM.toFixed(0),
          });
          current_params = { ...current_params, ...check.adjusted_params };

          // Special second-stage for power_veto: if ap was already reduced and still veto,
          // also reduce fz (only on iteration 2+)
          if (rule === "power_veto" && iteration >= 2) {
            current_params = { ...current_params, fz_mm: current_params.fz_mm * 0.85 };
            log_entries.push(`  power_veto [iter ${iteration}]: additional fz reduction to ${current_params.fz_mm.toFixed(4)} mm/tooth`);
          }

          const after = JSON.stringify({
            ap: current_params.ap_mm.toFixed(3),
            fz: current_params.fz_mm.toFixed(3),
            Vc: current_params.Vc_mpm.toFixed(1),
            RPM: current_params.RPM.toFixed(0),
          });
          log_entries.push(`  ${rule}: applied adjustment. ${before} → ${after}. Action: ${check.escalation_action}`);
        } else {
          log_entries.push(`  ${rule}: no adjustable params available, flagged for manual fix`);
        }
      }

      // Recheck all rules with updated params to see which remain
      const recheck = this.checkAllVetos(
        current_params,
        null,
        machine,
        null,
        workholding,
        naturalFreqs_Hz,
      );

      remaining_rules = recheck.active_vetos
        .filter((v) => v.rule !== null)
        .map((v) => v.rule as VetoRule);

      const resolved_this_iter = remaining_rules.filter((r) => !HARD_BLOCK.includes(r));
      log_entries.push(
        `  After iteration ${iteration}: ${remaining_rules.length} veto(s) remaining` +
        (remaining_rules.length > 0 ? ` [${remaining_rules.join(", ")}]` : " — ALL CLEAR")
      );

      // If only hard-block vetos remain, further iterations won't help
      if (remaining_rules.every((r) => HARD_BLOCK.includes(r))) break;

      // Safety: if no resolvable vetos, stop early
      if (resolved_this_iter.length === 0 && remaining_rules.length > 0) {
        log_entries.push(`  No progress made in iteration ${iteration}. Stopping early.`);
        break;
      }
    }

    const resolvable_remaining = remaining_rules.filter((r) => !HARD_BLOCK.includes(r));
    const resolved = resolvable_remaining.length === 0;

    if (resolved && hard_blocks.length === 0) {
      log_entries.push("RESULT: All vetos resolved. Parameters are safe to proceed.");
    } else if (resolved && hard_blocks.length > 0) {
      log_entries.push("RESULT: Parametric vetos resolved, but HARD BLOCK vetos require manual intervention.");
    } else {
      log_entries.push(`RESULT: Could not resolve ${resolvable_remaining.length} veto(s) within ${max_iterations} iterations.`);
    }

    log.info(`[SafetyVetoEngine.autoEscalate] resolved=${resolved} iterations=${iteration} remaining=${remaining_rules.length}`);

    return {
      resolved: remaining_rules.length === 0, // true only when zero vetos remain
      final_params: current_params,
      iterations: iteration,
      remaining_vetos: remaining_rules,
      escalation_log: log_entries,
    };
  }

  // --------------------------------------------------------------------------
  // calculate — dispatcher entry point
  // --------------------------------------------------------------------------

  /**
   * Unified dispatcher entry point for calcDispatcher integration.
   * Actions: "safety_veto_check", "safety_veto_all", "safety_veto_escalate"
   */
  calculate(action: string, params: Record<string, unknown>): unknown {
    switch (action) {
      case "safety_veto_check": {
        const rule = params.rule as VetoRule;
        const vp = this._extractVetoParams(params);
        const mc = this._extractMachine(params);
        const wh = this._extractWorkholding(params);
        const natFreqs = Array.isArray(params.natural_freqs_Hz)
          ? (params.natural_freqs_Hz as number[])
          : undefined;
        return this.checkVeto(rule, vp, mc, wh, natFreqs);
      }

      case "safety_veto_all": {
        const vp = this._extractVetoParams(params);
        const mc = this._extractMachine(params);
        const wh = this._extractWorkholding(params);
        const natFreqs = Array.isArray(params.natural_freqs_Hz)
          ? (params.natural_freqs_Hz as number[])
          : undefined;
        return this.checkAllVetos(vp, null, mc, null, wh, natFreqs);
      }

      case "safety_veto_escalate": {
        const vp = this._extractVetoParams(params);
        const mc = this._extractMachine(params);
        const wh = this._extractWorkholding(params);
        const natFreqs = Array.isArray(params.natural_freqs_Hz)
          ? (params.natural_freqs_Hz as number[])
          : undefined;
        const report = this.checkAllVetos(vp, null, mc, null, wh, natFreqs);
        const max_iter = typeof params.max_iterations === "number" ? params.max_iterations : 3;
        return this.autoEscalate(report, max_iter, natFreqs);
      }

      default:
        throw new Error(`SafetyVetoEngine: unknown action "${action}"`);
    }
  }

  // --------------------------------------------------------------------------
  // Private extraction helpers
  // --------------------------------------------------------------------------

  private _extractVetoParams(p: Record<string, unknown>): VetoParams {
    return {
      Fc_N:                  Number(p.Fc_N ?? 0),
      Vc_mpm:                Number(p.Vc_mpm ?? 0),
      ap_mm:                 Number(p.ap_mm ?? 0),
      fz_mm:                 Number(p.fz_mm ?? 0),
      D_mm:                  Number(p.D_mm ?? 10),
      L_mm:                  Number(p.L_mm ?? 50),
      RPM:                   Number(p.RPM ?? 0),
      chatter_probability:   Number(p.chatter_probability ?? 0),
      collision_detected:    Boolean(p.collision_detected ?? false),
      tolerance_mm:          p.tolerance_mm !== undefined ? Number(p.tolerance_mm) : undefined,
      elastic_modulus_Pa:    p.elastic_modulus_Pa !== undefined ? Number(p.elastic_modulus_Pa) : undefined,
      I_m4:                  p.I_m4 !== undefined ? Number(p.I_m4) : undefined,
      hole_depth_mm:         p.hole_depth_mm !== undefined ? Number(p.hole_depth_mm) : undefined,
      coolant_pressure_bar:  p.coolant_pressure_bar !== undefined ? Number(p.coolant_pressure_bar) : undefined,
    };
  }

  private _extractMachine(p: Record<string, unknown>): MachineConstraints {
    return {
      max_power_kW:    Number(p.max_power_kW ?? p.machine_max_power_kw ?? 15),
      max_rpm:         Number(p.max_rpm ?? p.machine_max_rpm ?? 8000),
      max_torque_Nm:   Number(p.max_torque_Nm ?? p.machine_max_torque_Nm ?? 100),
    };
  }

  private _extractWorkholding(p: Record<string, unknown>): WorkholdingProps {
    return {
      grip_force_N:          Number(p.grip_force_N ?? 5000),
      friction_coefficient:  Number(p.friction_coefficient ?? p.mu ?? 0.3),
      n_points:              p.n_points !== undefined ? Number(p.n_points) : 1,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance — use this in dispatcher and downstream engines */
export const safetyVetoEngine = new SafetyVetoEngine();
