/**
 * MCAT-MS0 U-MCAT08: Machine Validation Safety Hooks
 *
 * 5 BLOCKING hooks that prevent dangerous cutting operations when
 * machine data is incomplete, incompatible, or exceeded:
 *
 * 1. pre-machine-spindle-limits — blocks if RPM exceeds machine spindle max
 * 2. pre-machine-envelope-check — blocks if part exceeds work envelope
 * 3. pre-machine-power-budget — blocks if power/torque exceeds capacity
 * 4. pre-machine-controller-compatibility — blocks if controller incompatible
 * 5. pre-machine-completeness-gate — blocks if machine data < 50% complete
 *
 * These hooks fire on pre-calculation phase for any action that involves
 * machine-specific cutting parameter validation.
 *
 * @module hooks/MachineValidationHooks
 * @milestone MCAT-MS0/U-MCAT08
 * @version 1.0.0
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning,
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum data completeness score required to proceed (50%) */
const MIN_COMPLETENESS_SCORE = 0.50;

/** Physics constant: P = T * RPM / 9549 (kW from Nm and RPM) */
const POWER_CONSTANT = 9549;

/** Maximum RPM sanity limit (no machine exceeds this) */
const ABSOLUTE_MAX_RPM = 100000;

/** Maximum feed rate sanity limit (mm/min) */
const ABSOLUTE_MAX_FEED = 100000;

// ============================================================================
// HOOK 1: PRE-MACHINE-SPINDLE-LIMITS (BLOCKING)
// ============================================================================

/**
 * Validates that calculated spindle RPM does not exceed machine spindle limits.
 * BLOCKS operation if:
 * - Calculated RPM > machine.spindle.max_rpm
 * - Machine spindle data is missing/zero (can't validate)
 */
const preMachineSpindleLimits: HookDefinition = {
  id: "pre-machine-spindle-limits",
  name: "Machine Spindle Limits Gate",
  description:
    "BLOCKS if calculated spindle RPM exceeds machine's maximum spindle speed. Prevents spindle overspeed damage.",
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "machine", "spindle", "mcat", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];

    // Extract machine spindle data
    const machineMaxRpm = d.machine?.spindle?.max_rpm
      ?? d.machinePackage?.spindle?.max_rpm
      ?? d.spindleMaxRpm
      ?? d.maxRpm;

    // Extract calculated/requested RPM
    const requestedRpm = d.spindleRpm ?? d.rpm ?? d.calculatedRpm ?? d.n;

    // Sanity check: absolute limits
    if (requestedRpm && requestedRpm > ABSOLUTE_MAX_RPM) {
      issues.push(`RPM ${requestedRpm} exceeds absolute max ${ABSOLUTE_MAX_RPM}`);
    }

    // Machine-specific limit check
    if (machineMaxRpm && machineMaxRpm > 0) {
      if (requestedRpm && requestedRpm > machineMaxRpm) {
        issues.push(
          `Requested RPM ${requestedRpm} exceeds machine spindle max ${machineMaxRpm} RPM`
        );
      }
    } else if (requestedRpm && requestedRpm > 0) {
      // Warning if we can't validate against machine
      log.warn(
        `[pre-machine-spindle-limits] No machine spindle max_rpm available for validation`
      );
    }

    if (issues.length > 0) {
      return hookBlock(
        preMachineSpindleLimits,
        `SPINDLE OVERSPEED BLOCK: ${issues.join("; ")}`,
        {
          issues,
          data: {
            requestedRpm,
            machineMaxRpm,
            issues,
            recommendation: machineMaxRpm
              ? `Reduce RPM to ≤ ${machineMaxRpm}`
              : "Verify machine spindle specifications",
          },
        }
      );
    }

    return hookSuccess(preMachineSpindleLimits, "Spindle limits validated", {
      data: {
        requestedRpm,
        machineMaxRpm,
        headroom: machineMaxRpm && requestedRpm
          ? ((machineMaxRpm - requestedRpm) / machineMaxRpm * 100).toFixed(1) + "%"
          : "unknown",
      },
    });
  },
};

// ============================================================================
// HOOK 2: PRE-MACHINE-ENVELOPE-CHECK (BLOCKING)
// ============================================================================

/**
 * Validates that part dimensions fit within machine work envelope.
 * BLOCKS operation if:
 * - Part X > machine.envelope.x_travel
 * - Part Y > machine.envelope.y_travel
 * - Part Z > machine.envelope.z_travel
 * - Part weight > machine.envelope.max_table_load_kg
 */
const preMachineEnvelopeCheck: HookDefinition = {
  id: "pre-machine-envelope-check",
  name: "Machine Work Envelope Gate",
  description:
    "BLOCKS if part dimensions exceed machine work envelope (X/Y/Z travel or table load).",
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "machine", "envelope", "mcat", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];

    // Extract machine envelope
    const envelope = d.machine?.envelope
      ?? d.machinePackage?.envelope
      ?? d.work_envelope
      ?? {};

    const xTravel = envelope.x_travel ?? envelope.x_mm ?? envelope.x ?? 0;
    const yTravel = envelope.y_travel ?? envelope.y_mm ?? envelope.y ?? 0;
    const zTravel = envelope.z_travel ?? envelope.z_mm ?? envelope.z ?? 0;
    const maxLoad = envelope.max_table_load_kg ?? envelope.table_load ?? envelope.maxLoad ?? 0;

    // Extract part dimensions
    const part = d.part ?? d.workpiece ?? {};
    const partX = part.length ?? part.x ?? d.partLength ?? 0;
    const partY = part.width ?? part.y ?? d.partWidth ?? 0;
    const partZ = part.height ?? part.z ?? d.partHeight ?? 0;
    const partWeight = part.weight_kg ?? part.weight ?? d.partWeight ?? 0;

    // Validate each dimension
    if (xTravel > 0 && partX > xTravel) {
      issues.push(`Part X (${partX}mm) exceeds X travel (${xTravel}mm)`);
    }
    if (yTravel > 0 && partY > yTravel) {
      issues.push(`Part Y (${partY}mm) exceeds Y travel (${yTravel}mm)`);
    }
    if (zTravel > 0 && partZ > zTravel) {
      issues.push(`Part Z (${partZ}mm) exceeds Z travel (${zTravel}mm)`);
    }
    if (maxLoad > 0 && partWeight > maxLoad) {
      issues.push(`Part weight (${partWeight}kg) exceeds table load (${maxLoad}kg)`);
    }

    if (issues.length > 0) {
      return hookBlock(
        preMachineEnvelopeCheck,
        `ENVELOPE VIOLATION: ${issues.join("; ")}`,
        {
          issues,
          data: {
            partDimensions: { x: partX, y: partY, z: partZ, weight: partWeight },
            machineEnvelope: { x: xTravel, y: yTravel, z: zTravel, maxLoad },
            issues,
            recommendation: "Select a larger machine or redesign part to fit envelope",
          },
        }
      );
    }

    return hookSuccess(preMachineEnvelopeCheck, "Part fits within envelope", {
      data: {
        partDimensions: { x: partX, y: partY, z: partZ, weight: partWeight },
        machineEnvelope: { x: xTravel, y: yTravel, z: zTravel, maxLoad },
      },
    });
  },
};

// ============================================================================
// HOOK 3: PRE-MACHINE-POWER-BUDGET (BLOCKING)
// ============================================================================

/**
 * Validates that required cutting power and torque do not exceed machine capacity.
 * Uses physics: P = T * RPM / 9549 to cross-validate power/torque relationship.
 * BLOCKS if:
 * - Required power > machine.spindle.power_continuous_kw
 * - Required torque > machine.spindle.max_torque_nm
 * - Power/torque relationship inconsistent (> 10% deviation)
 */
const preMachinePowerBudget: HookDefinition = {
  id: "pre-machine-power-budget",
  name: "Machine Power Budget Gate",
  description:
    "BLOCKS if required cutting power or torque exceeds machine spindle capacity. Validates P=T*RPM/9549 physics.",
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "machine", "power", "torque", "mcat", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];

    // Extract machine power specs
    const spindle = d.machine?.spindle ?? d.machinePackage?.spindle ?? {};
    const maxPowerKw = spindle.power_continuous_kw ?? spindle.power_kw ?? spindle.power ?? 0;
    const maxTorqueNm = spindle.max_torque_nm ?? spindle.torque_nm ?? spindle.torque ?? 0;
    const baseRpm = spindle.base_rpm ?? spindle.torque_rpm ?? 0;

    // Extract required power/torque
    const requiredPower = d.requiredPower_kW ?? d.cuttingPower ?? d.power_kw ?? 0;
    const requiredTorque = d.requiredTorque_Nm ?? d.cuttingTorque ?? d.torque_nm ?? 0;
    const operatingRpm = d.spindleRpm ?? d.rpm ?? d.n ?? 0;

    // Power limit check
    if (maxPowerKw > 0 && requiredPower > maxPowerKw) {
      issues.push(
        `Required power ${requiredPower.toFixed(2)} kW exceeds machine max ${maxPowerKw} kW`
      );
    }

    // Torque limit check
    if (maxTorqueNm > 0 && requiredTorque > maxTorqueNm) {
      issues.push(
        `Required torque ${requiredTorque.toFixed(2)} Nm exceeds machine max ${maxTorqueNm} Nm`
      );
    }

    // Physics cross-validation: P = T * RPM / 9549
    if (requiredPower > 0 && requiredTorque > 0 && operatingRpm > 0) {
      const calculatedPower = (requiredTorque * operatingRpm) / POWER_CONSTANT;
      const deviation = Math.abs(calculatedPower - requiredPower) / requiredPower;
      if (deviation > 0.10) {
        issues.push(
          `Power/torque physics mismatch: P=${requiredPower.toFixed(2)}kW but T*RPM/9549=${calculatedPower.toFixed(2)}kW (${(deviation * 100).toFixed(1)}% deviation)`
        );
      }
    }

    // Check torque at operating RPM (torque decreases above base RPM)
    if (baseRpm > 0 && operatingRpm > baseRpm && maxTorqueNm > 0) {
      const availableTorque = maxTorqueNm * (baseRpm / operatingRpm);
      if (requiredTorque > availableTorque) {
        issues.push(
          `At ${operatingRpm} RPM, available torque is only ${availableTorque.toFixed(1)} Nm (reduced from ${maxTorqueNm} Nm at base ${baseRpm} RPM)`
        );
      }
    }

    if (issues.length > 0) {
      return hookBlock(
        preMachinePowerBudget,
        `POWER/TORQUE EXCEEDED: ${issues.join("; ")}`,
        {
          issues,
          data: {
            required: { power_kW: requiredPower, torque_Nm: requiredTorque, rpm: operatingRpm },
            machineCapacity: { power_kW: maxPowerKw, torque_Nm: maxTorqueNm, base_rpm: baseRpm },
            issues,
            recommendation: "Reduce cutting parameters (DOC, feed) to lower power/torque demand",
          },
        }
      );
    }

    return hookSuccess(preMachinePowerBudget, "Power budget validated", {
      data: {
        required: { power_kW: requiredPower, torque_Nm: requiredTorque },
        machineCapacity: { power_kW: maxPowerKw, torque_Nm: maxTorqueNm },
        utilization: maxPowerKw > 0
          ? `${((requiredPower / maxPowerKw) * 100).toFixed(1)}% power`
          : "unknown",
      },
    });
  },
};

// ============================================================================
// HOOK 4: PRE-MACHINE-CONTROLLER-COMPATIBILITY (BLOCKING)
// ============================================================================

/**
 * Validates that machine controller supports the requested operation.
 * BLOCKS if:
 * - Controller doesn't support required G-codes (e.g., G43.4 for RTCP)
 * - Controller doesn't support required cycles (e.g., G76 threading)
 * - Controller has axis count mismatch (e.g., 5-axis op on 3-axis controller)
 */
const preMachineControllerCompatibility: HookDefinition = {
  id: "pre-machine-controller-compatibility",
  name: "Machine Controller Compatibility Gate",
  description:
    "BLOCKS if machine controller doesn't support required operation features (G-codes, cycles, axis count).",
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "machine", "controller", "mcat", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];

    // Extract controller info
    const controller = d.machine?.controller ?? d.machinePackage?.controller ?? {};
    const controllerType = controller.type ?? controller.manufacturer ?? "unknown";
    const controllerModel = controller.model ?? "";
    const supportedAxes = controller.axes ?? controller.axis_count ?? 3;
    const supportedGCodes = controller.supported_gcodes ?? controller.gcodes ?? [];
    const supportedCycles = controller.supported_cycles ?? controller.cycles ?? [];

    // Extract operation requirements
    const requiredAxes = d.requiredAxes ?? d.axisCount ?? d.axes ?? 3;
    const requiredGCodes = d.requiredGCodes ?? d.gcodes ?? [];
    const requiredCycles = d.requiredCycles ?? d.cycles ?? [];
    const operationType = d.operationType ?? d.operation ?? d.type ?? "";

    // Axis count check
    if (requiredAxes > supportedAxes) {
      issues.push(
        `Operation requires ${requiredAxes} axes but controller supports only ${supportedAxes}`
      );
    }

    // G-code support check
    if (Array.isArray(requiredGCodes) && requiredGCodes.length > 0) {
      const missing = requiredGCodes.filter(
        (g: string) => !supportedGCodes.includes(g)
      );
      if (missing.length > 0) {
        issues.push(`Controller missing required G-codes: ${missing.join(", ")}`);
      }
    }

    // Cycle support check
    if (Array.isArray(requiredCycles) && requiredCycles.length > 0) {
      const missingCycles = requiredCycles.filter(
        (c: string) => !supportedCycles.includes(c)
      );
      if (missingCycles.length > 0) {
        issues.push(`Controller missing required cycles: ${missingCycles.join(", ")}`);
      }
    }

    // Special operation compatibility
    if (operationType === "5-axis-simultaneous" && supportedAxes < 5) {
      issues.push("5-axis simultaneous requires 5-axis controller");
    }
    if (operationType === "RTCP" && !supportedGCodes.includes("G43.4") && !supportedGCodes.includes("RTCP")) {
      issues.push("RTCP operation requires G43.4 or equivalent RTCP support");
    }

    if (issues.length > 0) {
      return hookBlock(
        preMachineControllerCompatibility,
        `CONTROLLER INCOMPATIBLE: ${issues.join("; ")}`,
        {
          issues,
          data: {
            controller: { type: controllerType, model: controllerModel, axes: supportedAxes },
            required: { axes: requiredAxes, gcodes: requiredGCodes, cycles: requiredCycles },
            issues,
            recommendation: "Select a machine with compatible controller or modify operation",
          },
        }
      );
    }

    return hookSuccess(preMachineControllerCompatibility, "Controller compatible", {
      data: {
        controller: { type: controllerType, model: controllerModel, axes: supportedAxes },
        operationType,
      },
    });
  },
};

// ============================================================================
// HOOK 5: PRE-MACHINE-COMPLETENESS-GATE (BLOCKING)
// ============================================================================

/**
 * Validates that machine data completeness is above minimum threshold.
 * BLOCKS if:
 * - Machine completeness score < 50%
 * - Critical fields are missing (spindle.max_rpm, spindle.power)
 * - Data source is unverified
 */
const preMachineCompletenessGate: HookDefinition = {
  id: "pre-machine-completeness-gate",
  name: "Machine Data Completeness Gate",
  description:
    "BLOCKS if machine data completeness is below 50% or critical fields are missing. Prevents calculations on unreliable data.",
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "machine", "completeness", "mcat", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];
    const warnings: string[] = [];

    // U-COST-EST-MACHINE-GATE-SCOPE (charlie 2026-06-26): this gate guards machine-PHYSICS calcs
    // (spindle RPM / power / speed-feed) against unreliable machine data. It must NOT force-block a
    // machine-AGNOSTIC calculation that never needed a machine. `process_cost` amortizes a default
    // $/hr rate (machine_rate_per_hour) over a batch -- it does no spindle physics -- yet the gate
    // hard-blocked it on BOTH /api/v1/cost/estimate AND /api/v1/pipeline/quote whenever no machine was
    // supplied (verified live on :3100: "INCOMPLETE MACHINE DATA: ... spindle.max_rpm, spindle.power").
    // The sibling pre-machine-spindle-limits already WARNS-not-blocks when no machine is present (~L93);
    // this gate was the inconsistent outlier. FIX = an explicit machine-agnostic ACTION allowlist:
    // skip the gate ONLY for those actions when NO machine was actually selected. NON-WEAKENING:
    //   - a machine-PHYSICS action (sfc_calculate / job_plan / speed_feed / ...) is NOT in the allowlist
    //     -> still blocks with no machine (the U-OSC-SFC-PRODUCT-BRIDGE no-machine-blocks contract holds);
    //   - even a machine-agnostic action STILL blocks if a machine WAS selected but is incomplete
    //     (the skip requires BOTH the allowlist AND zero machine context).
    const MACHINE_AGNOSTIC_ACTIONS = new Set([
      "process_cost", // cost amortization on a $/hr rate -- no spindle physics
      // U-BRAVO-SFC-COMPONENT-GATE-SCOPE (bravo 2026-06-26): the SFC web component endpoints
      // (POST /api/v1/sfc/{surface-finish,engagement,deflection,tool-life,power-torque,cycle-time})
      // compute descriptive physics from material+tool+cut GEOMETRY and resolve NO machine envelope,
      // yet ALL returned {blocked:"pre-machine-completeness-gate"} live on :3100 -- 6/7 component
      // panels dead. Same machine-AGNOSTIC class as process_cost. Each is pure physics:
      "surface_finish",                 // Ra = f^2/(32*r) -- feed + nose radius only
      "tool_life",                      // Taylor T = (C/Vc)^(1/n) -- speed + material constants only
      "engagement",                     // geometric arc-of-engagement -- tool dia + radial depth only
      "deflection",                     // cantilever delta = F*L^3/(3*E*I) -- tool/force/overhang only
      "power", "power_torque", "torque", // power/torque DEMAND (machine CAPACITY, if a machine is
                                        //   supplied, is still checked by pre-machine-power-budget)
      "cycle_time",                     // distance / feedrate -- no spindle physics
      // adjacent machine-agnostic descriptive physics on the same calc surface:
      "cutting_force", "mrr", "chip_load", "flow_stress", "thermal", "specific_cutting_energy",
      "drilling_force", "turning_force", "tapping_torque", "uts_based_force",
      "helix_angle_force_decomposition", "chip_formation", "chip_diagnose",
      "piispanen_shear_strain", "zorev_stress_distribution", "thick_shear_zone",
      "chip_thinning_compensation", "tolerance_analysis", "fit_analysis",
    ]);
    const action = String(ctx.operation ?? (ctx.metadata as Record<string, any> | undefined)?.action ?? "");
    const machineIntended =
      d.machinePackage !== undefined ||
      d.machine !== undefined ||
      d.machine_id !== undefined ||
      d.machineId !== undefined ||
      d.confidence !== undefined;
    if (!machineIntended && MACHINE_AGNOSTIC_ACTIONS.has(action)) {
      return hookSuccess(
        preMachineCompletenessGate,
        `No machine selected and '${action}' is machine-agnostic -- machine-completeness validation skipped`,
        { data: { machineIntended: false, machineAgnostic: true, action } },
      );
    }

    // Extract machine package or confidence data
    const pkg = d.machinePackage ?? d.machine ?? {};
    const confidence = pkg.confidence ?? d.confidence ?? {};
    const overallConfidence = confidence.overall ?? 0;

    // Critical fields check
    const spindle = pkg.spindle ?? {};
    const criticalMissing: string[] = [];

    if (!spindle.max_rpm || spindle.max_rpm <= 0) {
      criticalMissing.push("spindle.max_rpm");
    }
    if (!spindle.power_kw && !spindle.power_continuous_kw && !spindle.power) {
      criticalMissing.push("spindle.power");
    }

    // Completeness score check
    if (overallConfidence > 0 && overallConfidence < MIN_COMPLETENESS_SCORE) {
      issues.push(
        `Machine data completeness ${(overallConfidence * 100).toFixed(1)}% is below minimum ${(MIN_COMPLETENESS_SCORE * 100)}%`
      );
    }

    // Critical fields missing
    if (criticalMissing.length > 0) {
      issues.push(`Critical machine fields missing: ${criticalMissing.join(", ")}`);
    }

    // Check subsystem confidence
    const subsystems = ["controller", "spindle", "envelope", "axes"];
    for (const sub of subsystems) {
      const subConf = confidence[sub];
      if (subConf !== undefined && subConf < 0.3) {
        warnings.push(`${sub} confidence very low (${(subConf * 100).toFixed(0)}%)`);
      }
    }

    // Check data provenance
    const provenance = pkg.provenance ?? {};
    if (Object.keys(provenance).length === 0 && overallConfidence === 0) {
      warnings.push("No provenance data — machine specs unverified");
    }

    if (issues.length > 0) {
      return hookBlock(
        preMachineCompletenessGate,
        `INCOMPLETE MACHINE DATA: ${issues.join("; ")}`,
        {
          issues,
          threshold: MIN_COMPLETENESS_SCORE,
          data: {
            completeness: overallConfidence,
            threshold: MIN_COMPLETENESS_SCORE,
            criticalMissing,
            warnings,
            issues,
            recommendation: "Enrich machine data via /machine-enrich or select a well-documented machine",
          },
        }
      );
    }

    // Return success with warnings if any
    if (warnings.length > 0) {
      return hookWarning(
        preMachineCompletenessGate,
        `Machine data acceptable but has gaps: ${warnings.join("; ")}`,
        {
          warnings,
          data: {
            completeness: overallConfidence,
            warnings,
          },
        }
      );
    }

    return hookSuccess(preMachineCompletenessGate, "Machine data complete", {
      data: {
        completeness: overallConfidence,
        subsystemConfidence: confidence,
      },
    });
  },
};

// ============================================================================
// EXPORT
// ============================================================================

/**
 * All 5 machine validation safety hooks
 */
export const machineValidationHooks: HookDefinition[] = [
  preMachineSpindleLimits,
  preMachineEnvelopeCheck,
  preMachinePowerBudget,
  preMachineControllerCompatibility,
  preMachineCompletenessGate,
];

// Named exports for direct access
export {
  preMachineSpindleLimits,
  preMachineEnvelopeCheck,
  preMachinePowerBudget,
  preMachineControllerCompatibility,
  preMachineCompletenessGate,
};
