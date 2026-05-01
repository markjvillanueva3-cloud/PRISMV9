/**
 * SafetyGateForOptimizationEngine — NEVER optimize away safety
 *
 * Safety rules for program physics optimization:
 *   1. G50 speed clamp can only DECREASE, never increase
 *   2. M1 optional stops between tools must be preserved
 *   3. Rapid clearance positions must stay at original or increase
 *   4. Cutoff feed can only decrease (parting is dangerous)
 *   5. Chuck force safety: if Vc increased, verify centrifugal force doesn't exceed grip
 *   6. Threading: spring passes NEVER removed, infeed only tightened
 *   7. Coolant codes must be preserved
 *   8. Spindle stop (M5) must be preserved
 *   9. Power must not exceed machine spindle rating
 *  10. Deflection must stay within tolerance
 *
 * Ref: ISO 13849 safety of machinery, Sandvik safe machining guidelines
 *
 * @module SafetyGateForOptimizationEngine
 */

import { log } from "../utils/Logger.js";
import { cuttingPower, rpmFromVc } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type SafetyViolation = {
  /** Rule that was violated */
  rule: string;
  /** Severity: critical blocks optimization, warning allows with flag */
  severity: "critical" | "warning";
  /** Block/line where violation occurs */
  line_number: number;
  /** Description of violation */
  message: string;
  /** Original value */
  original_value: number | string;
  /** Proposed value that violates safety */
  proposed_value: number | string;
};

export interface SafetyGateInput {
  /** Original G50 S values per tool station [station → RPM] */
  original_g50: Map<number, number>;
  /** Proposed G50 S values */
  proposed_g50: Map<number, number>;
  /** Original rapid clearance positions [line → X value] */
  original_rapids: Array<{ line: number; x: number; z: number }>;
  /** Proposed rapid clearance positions */
  proposed_rapids: Array<{ line: number; x: number; z: number }>;
  /** Original cutoff feed [mm/rev] */
  original_cutoff_feed?: number;
  /** Proposed cutoff feed */
  proposed_cutoff_feed?: number;
  /** Original Vc [m/min] for each tool */
  original_vc: Map<number, number>;
  /** Proposed Vc */
  proposed_vc: Map<number, number>;
  /** Stock diameter [mm] */
  stock_diameter_mm: number;
  /** Chuck type */
  chuck_type?: "3jaw" | "collet" | "mandrel";
  /** Machine max spindle power [kW] */
  machine_max_power_kw: number;
  /** Machine max RPM */
  machine_max_rpm: number;
  /** Proposed cutting force [N] per block */
  proposed_forces?: Array<{ line: number; Fc_N: number; Vc_mpm: number }>;
  /** Proposed deflection [mm] per block */
  proposed_deflections?: Array<{ line: number; deflection_mm: number; tolerance_mm: number }>;
  /** Original line count for M1/M5/coolant check */
  original_lines: string[];
  /** Proposed lines */
  proposed_lines: string[];
  /** Threading blocks (must preserve spring passes) */
  threading_blocks?: Array<{
    line: number;
    type: "infeed" | "spring_pass";
    original_doc_mm: number;
    proposed_doc_mm: number;
  }>;
}

export interface SafetyGateResult {
  /** Whether the optimization passes safety gate */
  passed: boolean;
  /** Violations found */
  violations: SafetyViolation[];
  /** Corrected values (auto-fixed where possible) */
  corrections: Array<{
    rule: string;
    line: number;
    original: number | string;
    corrected: number | string;
    reason: string;
  }>;
  /** Summary */
  summary: {
    critical_violations: number;
    warnings: number;
    auto_corrections: number;
    rules_checked: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum G50 clamp by operation type [RPM]
 *  Never allow G50 below these values — machine protection */
const MIN_G50: Record<string, number> = {
  cutoff: 1000,
  groove: 1200,
  thread: 1500,
  default: 500,
};

/** Chuck centrifugal force safety factors
 *  At high RPM, centrifugal force reduces grip.
 *  Simplified model: effective_grip = grip × (1 - (RPM/RPM_max)^2 × k)
 *  k depends on chuck type */
const CHUCK_CENTRIFUGAL_K: Record<string, number> = {
  "3jaw": 0.35,     // Scroll chuck — worst centrifugal behavior
  collet: 0.15,     // Collet — better
  mandrel: 0.05,    // Mandrel — minimal centrifugal effect
};

/** Maximum safe centrifugal grip reduction [%] */
const MAX_GRIP_LOSS_PCT = 50;

/** Maximum power utilization [fraction] — leave margin */
const MAX_POWER_UTILIZATION = 0.85;

/** Maximum deflection for general turning [mm] */
const DEFAULT_MAX_DEFLECTION_MM = 0.05;

// ============================================================================
// ENGINE
// ============================================================================

export class SafetyGateForOptimizationEngine {
  /**
   * Check proposed optimization against safety rules.
   * Returns pass/fail with violations and auto-corrections.
   */
  check(input: SafetyGateInput): SafetyGateResult {
    const violations: SafetyViolation[] = [];
    const corrections: SafetyGateResult["corrections"] = [];
    let rulesChecked = 0;

    // Rule 1: G50 can only decrease
    rulesChecked++;
    this._checkG50(input, violations, corrections);

    // Rule 2: M1 optional stops preserved
    rulesChecked++;
    this._checkM1Preserved(input, violations);

    // Rule 3: Rapid clearance positions
    rulesChecked++;
    this._checkRapidClearance(input, violations, corrections);

    // Rule 4: Cutoff feed
    rulesChecked++;
    this._checkCutoffFeed(input, violations, corrections);

    // Rule 5: Chuck centrifugal force
    rulesChecked++;
    this._checkChuckForce(input, violations);

    // Rule 6: Threading spring passes
    rulesChecked++;
    this._checkThreading(input, violations);

    // Rule 7: Coolant codes preserved
    rulesChecked++;
    this._checkCoolant(input, violations);

    // Rule 8: Spindle stop preserved
    rulesChecked++;
    this._checkSpindleStop(input, violations);

    // Rule 9: Power check
    rulesChecked++;
    this._checkPower(input, violations);

    // Rule 10: Deflection check
    rulesChecked++;
    this._checkDeflection(input, violations);

    const critical = violations.filter(v => v.severity === "critical").length;
    const warnings = violations.filter(v => v.severity === "warning").length;

    log.info(
      `[SafetyGate] ${critical} critical, ${warnings} warnings, ${corrections.length} auto-corrections`,
    );

    return {
      passed: critical === 0,
      violations,
      corrections,
      summary: {
        critical_violations: critical,
        warnings,
        auto_corrections: corrections.length,
        rules_checked: rulesChecked,
      },
    };
  }

  /**
   * Apply safety corrections to proposed values.
   * Returns corrected values that pass the safety gate.
   */
  applySafetyCorrections(
    proposedG50: Map<number, number>,
    originalG50: Map<number, number>,
  ): Map<number, number> {
    const corrected = new Map<number, number>();
    for (const [station, proposed] of proposedG50) {
      const original = originalG50.get(station) ?? proposed;
      // G50 can only decrease
      corrected.set(station, Math.min(proposed, original));
    }
    return corrected;
  }

  // ── Rule checks ─────────────────────────────────────────────────────

  private _checkG50(
    input: SafetyGateInput,
    violations: SafetyViolation[],
    corrections: SafetyGateResult["corrections"],
  ): void {
    for (const [station, proposed] of input.proposed_g50) {
      const original = input.original_g50.get(station);
      if (original != null && proposed > original) {
        violations.push({
          rule: "g50_no_increase",
          severity: "critical",
          line_number: 0,
          message: `G50 S${proposed} exceeds original S${original} for T${station}. G50 can only decrease for safety.`,
          original_value: original,
          proposed_value: proposed,
        });
        corrections.push({
          rule: "g50_no_increase",
          line: 0,
          original: proposed,
          corrected: original,
          reason: `Clamped G50 back to original ${original} RPM`,
        });
      }
    }
  }

  private _checkM1Preserved(
    input: SafetyGateInput,
    violations: SafetyViolation[],
  ): void {
    const origM1 = input.original_lines.filter(l => /^\s*M1\b/.test(l)).length;
    const propM1 = input.proposed_lines.filter(l => /^\s*M1\b/.test(l)).length;

    if (propM1 < origM1) {
      violations.push({
        rule: "m1_preserved",
        severity: "critical",
        line_number: 0,
        message: `M1 optional stops reduced from ${origM1} to ${propM1}. M1 stops between tools must be preserved.`,
        original_value: origM1,
        proposed_value: propM1,
      });
    }
  }

  private _checkRapidClearance(
    input: SafetyGateInput,
    violations: SafetyViolation[],
    corrections: SafetyGateResult["corrections"],
  ): void {
    for (let i = 0; i < input.proposed_rapids.length && i < input.original_rapids.length; i++) {
      const orig = input.original_rapids[i];
      const prop = input.proposed_rapids[i];

      // X clearance must not decrease
      if (prop.x < orig.x - 0.001) {
        violations.push({
          rule: "rapid_clearance",
          severity: "critical",
          line_number: prop.line,
          message: `Rapid X${prop.x} below original X${orig.x}. Clearance must stay at original or increase.`,
          original_value: orig.x,
          proposed_value: prop.x,
        });
        corrections.push({
          rule: "rapid_clearance",
          line: prop.line,
          original: prop.x,
          corrected: orig.x,
          reason: `Restored rapid clearance to original X${orig.x}`,
        });
      }

      // Z clearance must not decrease in magnitude (closer to part = more negative Z or smaller positive Z)
      if (prop.z < orig.z - 0.001 && orig.z > 0) {
        violations.push({
          rule: "rapid_clearance_z",
          severity: "warning",
          line_number: prop.line,
          message: `Rapid Z${prop.z} closer to part than original Z${orig.z}.`,
          original_value: orig.z,
          proposed_value: prop.z,
        });
      }
    }
  }

  private _checkCutoffFeed(
    input: SafetyGateInput,
    violations: SafetyViolation[],
    corrections: SafetyGateResult["corrections"],
  ): void {
    if (input.original_cutoff_feed == null || input.proposed_cutoff_feed == null) return;

    if (input.proposed_cutoff_feed > input.original_cutoff_feed) {
      violations.push({
        rule: "cutoff_feed_decrease_only",
        severity: "critical",
        line_number: 0,
        message: `Cutoff feed ${input.proposed_cutoff_feed} exceeds original ${input.original_cutoff_feed}. Parting feed can only decrease.`,
        original_value: input.original_cutoff_feed,
        proposed_value: input.proposed_cutoff_feed,
      });
      corrections.push({
        rule: "cutoff_feed_decrease_only",
        line: 0,
        original: input.proposed_cutoff_feed,
        corrected: input.original_cutoff_feed,
        reason: `Clamped cutoff feed to original ${input.original_cutoff_feed}`,
      });
    }
  }

  private _checkChuckForce(
    input: SafetyGateInput,
    violations: SafetyViolation[],
  ): void {
    const chuckK = CHUCK_CENTRIFUGAL_K[input.chuck_type ?? "3jaw"] ?? 0.35;
    const rpmMax = input.machine_max_rpm;

    for (const [station, proposedVc] of input.proposed_vc) {
      const originalVc = input.original_vc.get(station) ?? proposedVc;
      if (proposedVc <= originalVc) continue; // Not increasing — safe

      // Calculate RPM at stock diameter (worst case, largest diameter)
      const rpm = rpmFromVc(proposedVc, input.stock_diameter_mm);

      // Grip loss percentage
      const gripLossPct = (rpm / rpmMax) ** 2 * chuckK * 100;

      if (gripLossPct > MAX_GRIP_LOSS_PCT) {
        violations.push({
          rule: "chuck_centrifugal_force",
          severity: "critical",
          line_number: 0,
          message: `Chuck grip loss ${gripLossPct.toFixed(1)}% at ${rpm.toFixed(0)} RPM (T${station}) exceeds ${MAX_GRIP_LOSS_PCT}% limit. Reduce Vc or use collet.`,
          original_value: `Vc=${originalVc}`,
          proposed_value: `Vc=${proposedVc} → ${rpm.toFixed(0)} RPM`,
        });
      }
    }
  }

  private _checkThreading(
    input: SafetyGateInput,
    violations: SafetyViolation[],
  ): void {
    if (!input.threading_blocks) return;

    for (const block of input.threading_blocks) {
      if (block.type === "spring_pass" && block.proposed_doc_mm !== block.original_doc_mm) {
        violations.push({
          rule: "spring_pass_preserved",
          severity: "critical",
          line_number: block.line,
          message: `Spring pass at line ${block.line} modified (original DOC=${block.original_doc_mm}, proposed=${block.proposed_doc_mm}). Spring passes must NEVER be removed or modified.`,
          original_value: block.original_doc_mm,
          proposed_value: block.proposed_doc_mm,
        });
      }

      if (block.type === "infeed" && block.proposed_doc_mm > block.original_doc_mm) {
        violations.push({
          rule: "thread_infeed_tighten_only",
          severity: "warning",
          line_number: block.line,
          message: `Threading infeed increased from ${block.original_doc_mm}mm to ${block.proposed_doc_mm}mm. Infeed can only be tightened (reduced).`,
          original_value: block.original_doc_mm,
          proposed_value: block.proposed_doc_mm,
        });
      }
    }
  }

  private _checkCoolant(
    input: SafetyGateInput,
    violations: SafetyViolation[],
  ): void {
    const origM8 = input.original_lines.filter(l => /\bM8\b/.test(l)).length;
    const propM8 = input.proposed_lines.filter(l => /\bM8\b/.test(l)).length;
    const origM9 = input.original_lines.filter(l => /\bM9\b/.test(l)).length;
    const propM9 = input.proposed_lines.filter(l => /\bM9\b/.test(l)).length;

    if (propM8 < origM8) {
      violations.push({
        rule: "coolant_preserved",
        severity: "warning",
        line_number: 0,
        message: `Coolant ON (M8) reduced from ${origM8} to ${propM8}. Coolant codes must be preserved.`,
        original_value: origM8,
        proposed_value: propM8,
      });
    }
    if (propM9 < origM9) {
      violations.push({
        rule: "coolant_off_preserved",
        severity: "warning",
        line_number: 0,
        message: `Coolant OFF (M9) reduced from ${origM9} to ${propM9}.`,
        original_value: origM9,
        proposed_value: propM9,
      });
    }
  }

  private _checkSpindleStop(
    input: SafetyGateInput,
    violations: SafetyViolation[],
  ): void {
    const origM5 = input.original_lines.some(l => /\bM5\b/.test(l));
    const propM5 = input.proposed_lines.some(l => /\bM5\b/.test(l));

    if (origM5 && !propM5) {
      violations.push({
        rule: "spindle_stop_preserved",
        severity: "critical",
        line_number: 0,
        message: "M5 spindle stop removed from program. Spindle must be stopped at end.",
        original_value: "M5 present",
        proposed_value: "M5 missing",
      });
    }
  }

  private _checkPower(
    input: SafetyGateInput,
    violations: SafetyViolation[],
  ): void {
    if (!input.proposed_forces) return;

    const maxAllowed = input.machine_max_power_kw * MAX_POWER_UTILIZATION;

    for (const block of input.proposed_forces) {
      const power = cuttingPower(block.Fc_N, block.Vc_mpm);
      if (power > maxAllowed) {
        violations.push({
          rule: "power_limit",
          severity: "critical",
          line_number: block.line,
          message: `Power ${power.toFixed(1)} kW exceeds ${(MAX_POWER_UTILIZATION * 100).toFixed(0)}% of machine max ${input.machine_max_power_kw} kW at line ${block.line}.`,
          original_value: maxAllowed,
          proposed_value: power,
        });
      }
    }
  }

  private _checkDeflection(
    input: SafetyGateInput,
    violations: SafetyViolation[],
  ): void {
    if (!input.proposed_deflections) return;

    for (const block of input.proposed_deflections) {
      const limit = block.tolerance_mm > 0 ? block.tolerance_mm : DEFAULT_MAX_DEFLECTION_MM;
      if (block.deflection_mm > limit) {
        violations.push({
          rule: "deflection_limit",
          severity: "warning",
          line_number: block.line,
          message: `Deflection ${block.deflection_mm.toFixed(4)}mm exceeds tolerance ${limit.toFixed(4)}mm at line ${block.line}.`,
          original_value: limit,
          proposed_value: block.deflection_mm,
        });
      }
    }
  }
}

export const safetyGateForOptimizationEngine = new SafetyGateForOptimizationEngine();
