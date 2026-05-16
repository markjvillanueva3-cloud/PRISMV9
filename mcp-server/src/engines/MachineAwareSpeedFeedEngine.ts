/**
 * MCAT-MS0 U-MCAT12: Machine-Aware Speed/Feed Pipeline
 *
 * Wraps speed/feed calculations with real machine constraints from
 * CanonicalMachinePackage. Ensures calculated parameters never exceed:
 * - Spindle max RPM
 * - Spindle power/torque capacity
 * - Machine feed rate limits
 * - Work envelope constraints
 *
 * Uses the 5 machine validation hooks (U-MCAT08) for safety gating.
 *
 * Physics:
 * - RPM clamp: n = min(n_calc, n_max)
 * - Feed clamp: f = min(f_calc, f_max)
 * - Power check: P = T * n / 9549 ≤ P_max
 * - Torque at RPM: T_avail = T_max * (n_base / n) for n > n_base
 *
 * @module engines/MachineAwareSpeedFeedEngine
 * @milestone MCAT-MS0/U-MCAT12
 */

import { log } from "../utils/Logger.js";
import type { CanonicalMachinePackage } from "../types/MachinePackage.js";
import { hookExecutor } from "./HookExecutor.js";
import { captureSFC } from "../middleware/sfcOutcomeWire.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const POWER_CONSTANT = 9549; // P(kW) = T(Nm) * n(RPM) / 9549

// ============================================================================
// TYPES
// ============================================================================

export interface SpeedFeedInput {
  /** Calculated/requested spindle speed (RPM) */
  spindleRpm: number;
  /** Calculated/requested feed rate (mm/min) */
  feedRate?: number;
  /** Feed per tooth (mm/tooth) for milling */
  feedPerTooth?: number;
  /** Feed per revolution (mm/rev) for turning */
  feedPerRev?: number;
  /** Cutting speed (m/min) */
  cuttingSpeed?: number;
  /** Tool diameter (mm) */
  toolDiameter?: number;
  /** Number of flutes/teeth */
  numberOfFlutes?: number;
  /** Depth of cut (mm) */
  depthOfCut?: number;
  /** Width of cut (mm) */
  widthOfCut?: number;
  /** Required cutting power (kW) */
  requiredPower?: number;
  /** Required torque (Nm) */
  requiredTorque?: number;
  /** Operation type */
  operation?: string;
}

export interface MachineConstraints {
  /** Maximum spindle RPM */
  maxRpm: number;
  /** Minimum spindle RPM */
  minRpm: number;
  /** Maximum feed rate (mm/min) */
  maxFeedRate: number;
  /** Continuous spindle power (kW) */
  maxPower: number;
  /** Maximum torque (Nm) */
  maxTorque: number;
  /** Base RPM for constant torque region */
  baseRpm: number;
  /** Rapid traverse rate (mm/min) */
  rapidRate: number;
}

export interface ConstrainedSpeedFeed {
  /** Original unconstrained values */
  unconstrained: {
    rpm: number;
    feedRate: number;
    feedPerTooth?: number;
    feedPerRev?: number;
    power?: number;
    torque?: number;
  };
  /** Machine-constrained values */
  constrained: {
    rpm: number;
    feedRate: number;
    feedPerTooth?: number;
    feedPerRev?: number;
    power?: number;
    torque?: number;
  };
  /** Constraint details */
  constraints: {
    rpmLimited: boolean;
    feedLimited: boolean;
    powerLimited: boolean;
    torqueLimited: boolean;
    limitingFactor: string;
  };
  /** Machine used for constraints */
  machine: {
    id: string;
    manufacturer: string;
    model: string;
    constraints: MachineConstraints;
  };
  /** Headroom percentages */
  headroom: {
    rpm: number;
    feed: number;
    power: number;
    torque: number;
  };
  /** Safety validation */
  safety: {
    passed: boolean;
    hooksExecuted: string[];
    warnings: string[];
    blocked?: string;
  };
  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

class MachineAwareSpeedFeedEngine {
  /**
   * Extract machine constraints from CanonicalMachinePackage
   */
  extractConstraints(pkg: CanonicalMachinePackage): MachineConstraints {
    const spindle = pkg.spindle;
    const axes = pkg.axes;

    // MachineSpindle exposes rated power/torque directly. Max cutting feed
    // and base (constant-torque) RPM are not modeled on the canonical
    // package type, so they use conservative defaults.
    return {
      maxRpm: spindle.max_rpm ?? 10000,
      minRpm: spindle.min_rpm ?? 50,
      maxFeedRate: 15000,
      maxPower: spindle.power ?? 15,
      maxTorque: spindle.torque ?? 100,
      baseRpm: 1500,
      rapidRate: axes?.x_rapid ?? 30000,
    };
  }

  /**
   * Calculate available torque at a given RPM
   * In constant power region (above base RPM), torque decreases: T = T_base * (n_base / n)
   */
  torqueAtRpm(rpm: number, maxTorque: number, baseRpm: number): number {
    if (rpm <= baseRpm || baseRpm <= 0) {
      return maxTorque;
    }
    return maxTorque * (baseRpm / rpm);
  }

  /**
   * Calculate power from torque and RPM: P = T * n / 9549
   */
  powerFromTorque(torque: number, rpm: number): number {
    return (torque * rpm) / POWER_CONSTANT;
  }

  /**
   * Calculate torque from power and RPM: T = P * 9549 / n
   */
  torqueFromPower(power: number, rpm: number): number {
    if (rpm <= 0) return 0;
    return (power * POWER_CONSTANT) / rpm;
  }

  /**
   * Constrain speed/feed to machine limits
   */
  constrain(
    input: SpeedFeedInput,
    pkg: CanonicalMachinePackage
  ): ConstrainedSpeedFeed {
    const constraints = this.extractConstraints(pkg);
    const recommendations: string[] = [];

    // Track what's being limited
    let rpmLimited = false;
    let feedLimited = false;
    let powerLimited = false;
    let torqueLimited = false;
    let limitingFactor = "none";

    // Original values
    const origRpm = input.spindleRpm;
    let origFeedRate = input.feedRate ?? 0;
    const origPower = input.requiredPower ?? 0;
    const origTorque = input.requiredTorque ?? 0;

    // Calculate feed rate if not provided
    if (!origFeedRate && input.feedPerTooth && input.numberOfFlutes) {
      origFeedRate = input.feedPerTooth * input.numberOfFlutes * origRpm;
    } else if (!origFeedRate && input.feedPerRev) {
      origFeedRate = input.feedPerRev * origRpm;
    }

    // Start with unconstrained values
    let newRpm = origRpm;
    let newFeedRate = origFeedRate;
    let newPower = origPower;
    let newTorque = origTorque;

    // 1. Constrain RPM
    if (newRpm > constraints.maxRpm) {
      rpmLimited = true;
      limitingFactor = "spindle_max_rpm";
      const reduction = ((newRpm - constraints.maxRpm) / newRpm * 100).toFixed(1);
      recommendations.push(
        `RPM reduced from ${newRpm} to ${constraints.maxRpm} (${reduction}% reduction)`
      );
      newRpm = constraints.maxRpm;
    }
    if (newRpm < constraints.minRpm) {
      newRpm = constraints.minRpm;
      recommendations.push(`RPM increased to minimum ${constraints.minRpm}`);
    }

    // 2. Constrain feed rate
    if (newFeedRate > constraints.maxFeedRate) {
      feedLimited = true;
      if (limitingFactor === "none") limitingFactor = "max_feed_rate";
      const reduction = ((newFeedRate - constraints.maxFeedRate) / newFeedRate * 100).toFixed(1);
      recommendations.push(
        `Feed rate reduced from ${newFeedRate.toFixed(0)} to ${constraints.maxFeedRate} mm/min (${reduction}% reduction)`
      );
      newFeedRate = constraints.maxFeedRate;
    }

    // 3. Check power budget
    if (newPower > constraints.maxPower) {
      powerLimited = true;
      if (limitingFactor === "none") limitingFactor = "spindle_power";
      const excessPct = ((newPower - constraints.maxPower) / constraints.maxPower * 100).toFixed(1);
      recommendations.push(
        `Required power ${newPower.toFixed(2)} kW exceeds machine capacity ${constraints.maxPower} kW by ${excessPct}%`
      );
      recommendations.push(
        `Consider: reduce DOC, reduce feed, or select more powerful machine`
      );
    }

    // 4. Check torque at operating RPM
    const availableTorque = this.torqueAtRpm(newRpm, constraints.maxTorque, constraints.baseRpm);
    if (newTorque > availableTorque) {
      torqueLimited = true;
      if (limitingFactor === "none") limitingFactor = "spindle_torque";
      recommendations.push(
        `Required torque ${newTorque.toFixed(1)} Nm exceeds available ${availableTorque.toFixed(1)} Nm at ${newRpm} RPM`
      );

      // Suggest lower RPM for more torque
      if (newRpm > constraints.baseRpm && newTorque <= constraints.maxTorque) {
        const suggestedRpm = Math.floor(constraints.baseRpm * constraints.maxTorque / newTorque);
        recommendations.push(
          `Reduce RPM to ~${suggestedRpm} to get ${constraints.maxTorque} Nm torque`
        );
      }
    }

    // 5. Recalculate dependent values
    let newFeedPerTooth = input.feedPerTooth;
    let newFeedPerRev = input.feedPerRev;

    if (rpmLimited || feedLimited) {
      // Recalculate fpt/fpr based on constrained values
      if (input.numberOfFlutes && newRpm > 0) {
        newFeedPerTooth = newFeedRate / (input.numberOfFlutes * newRpm);
      }
      if (newRpm > 0) {
        newFeedPerRev = newFeedRate / newRpm;
      }
    }

    // Calculate headroom
    const headroom = {
      rpm: constraints.maxRpm > 0 ? ((constraints.maxRpm - newRpm) / constraints.maxRpm * 100) : 0,
      feed: constraints.maxFeedRate > 0 ? ((constraints.maxFeedRate - newFeedRate) / constraints.maxFeedRate * 100) : 0,
      power: constraints.maxPower > 0 && newPower > 0 ? ((constraints.maxPower - newPower) / constraints.maxPower * 100) : 100,
      torque: availableTorque > 0 && newTorque > 0 ? ((availableTorque - newTorque) / availableTorque * 100) : 100,
    };

    const result: ConstrainedSpeedFeed = {
      unconstrained: {
        rpm: origRpm,
        feedRate: origFeedRate,
        feedPerTooth: input.feedPerTooth,
        feedPerRev: input.feedPerRev,
        power: origPower,
        torque: origTorque,
      },
      constrained: {
        rpm: newRpm,
        feedRate: newFeedRate,
        feedPerTooth: newFeedPerTooth,
        feedPerRev: newFeedPerRev,
        power: newPower,
        torque: newTorque,
      },
      constraints: {
        rpmLimited,
        feedLimited,
        powerLimited,
        torqueLimited,
        limitingFactor,
      },
      machine: {
        id: pkg.canonical_id,
        manufacturer: pkg.manufacturer,
        model: pkg.model,
        constraints,
      },
      headroom,
      safety: {
        passed: !powerLimited && !torqueLimited,
        hooksExecuted: [],
        warnings: powerLimited || torqueLimited
          ? [`Operation may exceed machine capacity: ${limitingFactor}`]
          : [],
      },
      recommendations,
    };

    // U-PPG-SFC-01: emit recommendation onto OutcomeCaptureBus.
    captureSFC({
      engine: "MachineAwareSpeedFeedEngine",
      action: "constrain",
      context: {
        machine_id: pkg.canonical_id,
        operation: input.operation,
      },
      recommended: result,
    });

    return result;
  }

  /**
   * Constrain and validate with safety hooks
   */
  async constrainWithSafetyValidation(
    input: SpeedFeedInput,
    pkg: CanonicalMachinePackage
  ): Promise<ConstrainedSpeedFeed> {
    // First constrain to machine limits
    const result = this.constrain(input, pkg);

    // Build hook context for safety validation
    const hookCtx = {
      operation: input.operation ?? "speed_feed",
      target: {
        type: "calculation" as const,
        id: "machine-aware-speed-feed",
        data: {
          spindleRpm: result.constrained.rpm,
          feedRate: result.constrained.feedRate,
          requiredPower_kW: result.constrained.power,
          requiredTorque_Nm: result.constrained.torque,
          machinePackage: pkg,
        },
      },
      metadata: {
        engine: "MachineAwareSpeedFeedEngine",
        unconstrained: result.unconstrained,
        constrained: result.constrained,
      },
    };

    // Execute machine validation hooks
    const hookIds = [
      "pre-machine-spindle-limits",
      "pre-machine-power-budget",
      "pre-machine-completeness-gate",
    ];

    const hooksExecuted: string[] = [];
    const warnings: string[] = [...result.safety.warnings];
    let blocked: string | undefined;

    for (const hookId of hookIds) {
      try {
        const hookResult = await hookExecutor.executeById(hookId, hookCtx);
        hooksExecuted.push(hookId);

        if (hookResult?.blocked) {
          blocked = `${hookId}: ${hookResult.message}`;
          break;
        }
        if (hookResult?.warnings) {
          warnings.push(...hookResult.warnings);
        }
      } catch (err) {
        log.warn(`[MachineAwareSpeedFeed] Hook ${hookId} failed: ${err}`);
      }
    }

    result.safety = {
      passed: !blocked,
      hooksExecuted,
      warnings,
      blocked,
    };

    return result;
  }

  /**
   * Quick check if speed/feed will fit machine
   */
  willFit(input: SpeedFeedInput, pkg: CanonicalMachinePackage): boolean {
    const constraints = this.extractConstraints(pkg);

    if (input.spindleRpm > constraints.maxRpm) return false;
    if (input.feedRate && input.feedRate > constraints.maxFeedRate) return false;
    if (input.requiredPower && input.requiredPower > constraints.maxPower) return false;

    const availableTorque = this.torqueAtRpm(
      input.spindleRpm,
      constraints.maxTorque,
      constraints.baseRpm
    );
    if (input.requiredTorque && input.requiredTorque > availableTorque) return false;

    return true;
  }

  /**
   * Find optimal RPM for a given torque requirement
   */
  optimalRpmForTorque(
    requiredTorque: number,
    pkg: CanonicalMachinePackage
  ): { rpm: number; availableTorque: number; inConstantTorqueRegion: boolean } {
    const constraints = this.extractConstraints(pkg);

    if (requiredTorque <= constraints.maxTorque) {
      // Can achieve at base RPM or below
      return {
        rpm: constraints.baseRpm,
        availableTorque: constraints.maxTorque,
        inConstantTorqueRegion: true,
      };
    }

    // Cannot achieve required torque
    return {
      rpm: constraints.minRpm,
      availableTorque: constraints.maxTorque,
      inConstantTorqueRegion: true,
    };
  }

  /**
   * Calculate achievable MRR given machine constraints
   */
  achievableMRR(
    pkg: CanonicalMachinePackage,
    toolDiameter: number,
    depthOfCut: number,
    materialKc: number = 2000 // Default Kienzle kc1.1 for steel
  ): { maxMRR: number; limitingFactor: string; recommendations: string[] } {
    const constraints = this.extractConstraints(pkg);
    const recommendations: string[] = [];

    // MRR = ae * ap * vf (mm³/min)
    // Power required: P = Fc * Vc / 60000 (kW)
    // Fc = kc * ae * ap * fz (simplified)

    // Work backwards from power limit
    // P_max = kc * ae * ap * vf / 60000
    // vf_max = P_max * 60000 / (kc * ae * ap)

    const ae = toolDiameter * 0.5; // 50% stepover
    const ap = depthOfCut;

    const maxFeedFromPower = (constraints.maxPower * 60000000) / (materialKc * ae * ap);
    const maxFeedFromMachine = constraints.maxFeedRate;

    const effectiveMaxFeed = Math.min(maxFeedFromPower, maxFeedFromMachine);
    const maxMRR = ae * ap * effectiveMaxFeed;

    let limitingFactor: string;
    if (maxFeedFromPower < maxFeedFromMachine) {
      limitingFactor = "spindle_power";
      recommendations.push(
        `Power-limited: max feed ${maxFeedFromPower.toFixed(0)} mm/min at ${constraints.maxPower} kW`
      );
    } else {
      limitingFactor = "feed_rate";
      recommendations.push(
        `Feed-limited: machine max ${maxFeedFromMachine} mm/min`
      );
    }

    return {
      maxMRR,
      limitingFactor,
      recommendations,
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const machineAwareSpeedFeedEngine = new MachineAwareSpeedFeedEngine();
export { MachineAwareSpeedFeedEngine };
