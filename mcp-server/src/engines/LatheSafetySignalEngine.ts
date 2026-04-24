// WIRE-EXEMPT: U-LSR24 orchestrator wired by its downstream consumer (U-LSR22 formal
// safety predicate + U-LSR04/05/06 emitter hard-blocks). Dispatcher action is added
// together with U-LSR22 so the wiring surface is a tri-state {SAFE,UNVERIFIED,BLOCKED}
// result, not the raw signals — raw signals stay internal.
/**
 * LatheSafetySignalEngine — LATHE-HARDENED-MS0 / U-LSR24
 *
 * Composes the existing physics engines into a single per-program safety
 * signal record. Pure orchestration — NO new physics or formulas:
 *
 *   • TurningForceEngine           → Fc (tangential), Ff (feed/axial),
 *                                    Fp (radial), resultant, chip geometry,
 *                                    spindle power + torque
 *     Ref: Sandvik Coromant Turning App Guide, Altintas (2012) Ch.2
 *     Kienzle via CANONICAL_KIENZLE (P=1800, M=2100, K=1100, N=700, S=2800,
 *     H=3200). Chip-thinning for turning is implicit in the Kienzle form:
 *     h = f·sin(κr), b = ap/sin(κr) (see TurningForceEngine §§2).
 *
 *   • RegenerativeChatterPredictor → Altintas-Budak stability lobes with
 *     cut_type:"turning" (num_flutes = 1 for single-point insert).
 *     Ref: Tlusty & Polacek (1963); Altintas & Budak (1995).
 *
 *   • ChuckJawForceEngine          → 3-force grip adequacy at operating
 *     RPM with ISO 10218 SF ≥ 2.5.
 *
 * Rationale for building this as an orchestrator rather than yet-another
 * physics engine: round-2 Physics Agent flagged the lathe emitter's
 * "Fc-only" safety check as insufficient. The fix is not new formulas —
 * the physics already lives in the three engines above — the fix is a
 * composition layer that supplies all three signals to the emitter and
 * safety predicate so every hard-block has the evidence it needs.
 *
 * Caller supplies material (ISO group), chuck config, and optional FRF
 * data. When FRF is omitted the chatter signal degrades gracefully to
 * `{ computed: false, reason: "no_frf_data" }` rather than fabricating
 * numbers. The emitter can then choose to BLOCK on missing FRF for
 * SAFETY-CRITICAL machines or WARN for the rest.
 *
 * @milestone LATHE-HARDENED-MS0 U-LSR24
 */

import { z } from "zod";
import { TurningForceEngine } from "./TurningForceEngine.js";
import type { TurningForceInput } from "./TurningForceEngine.js";
import { RegenerativeChatterPredictor } from "./RegenerativeChatterPredictor.js";
import type { ChatterInput } from "./RegenerativeChatterPredictor.js";
import { ChuckJawForceEngine } from "./ChuckJawForceEngine.js";
import type { ChuckForceInput, ChuckForceResult } from "./ChuckJawForceEngine.js";
import type { ToolpathProgram, ToolpathOperation } from "./LathePrintToolpathGeneratorEngine.js";
import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const MaterialContextSchema = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  name: z.string().optional(),
  hardness_hrc: z.number().min(0).max(70).optional(),
});
export type MaterialContext = z.infer<typeof MaterialContextSchema>;

export const ChuckContextSchema = z.object({
  chuck_type: z.enum(["3_jaw_scroll", "3_jaw_power", "4_jaw_independent", "6_jaw", "collet"]),
  jaw_type: z.enum(["hard", "soft", "pie", "special"]),
  num_jaws: z.number().int().positive(),
  workpiece_mass_kg: z.number().positive(),
  workpiece_od_mm: z.number().positive(),
  workpiece_length_mm: z.number().positive(),
  gripping_diameter_mm: z.number().positive(),
  gripping_length_mm: z.number().positive(),
  max_spindle_rpm: z.number().positive(),
  friction_coefficient: z.number().min(0.05).max(0.8).optional(),
});
export type ChuckContext = z.infer<typeof ChuckContextSchema>;

export const FRFContextSchema = z.object({
  natural_freq_Hz: z.number().positive(),
  stiffness_N_per_m: z.number().positive(),
  damping_ratio: z.number().min(0.001).max(0.5),
  tool_diameter_mm: z.number().positive(),
});
export type FRFContext = z.infer<typeof FRFContextSchema>;

export const MachineContextSchema = z.object({
  max_spindle_power_kW: z.number().positive().optional(),
  frf: FRFContextSchema.optional(),
});
export type MachineContext = z.infer<typeof MachineContextSchema>;

export const SafetySignalInputSchema = z.object({
  program: z.custom<ToolpathProgram>(),
  material: MaterialContextSchema,
  chuck: ChuckContextSchema,
  machine: MachineContextSchema,
});
export type SafetySignalInput = z.infer<typeof SafetySignalInputSchema>;

// ============================================================================
// OUTPUT SCHEMAS
// ============================================================================

export const ForceSignalSchema = z.object({
  Fc_N: z.number(),
  Fr_N: z.number(),
  Fa_N: z.number(),
  resultant_N: z.number(),
  chip_thickness_mm: z.number(),
  chip_width_mm: z.number(),
  specific_cutting_force_N_mm2: z.number(),
});
export type ForceSignal = z.infer<typeof ForceSignalSchema>;

export const PowerSignalSchema = z.object({
  cutting_kW: z.number(),
  spindle_torque_Nm: z.number(),
  utilization_pct: z.number(),
  power_safe: z.boolean(),
});
export type PowerSignal = z.infer<typeof PowerSignalSchema>;

export const ChatterSignalSchema = z.discriminatedUnion("computed", [
  z.object({
    computed: z.literal(true),
    is_stable: z.boolean(),
    current_depth_mm: z.number(),
    critical_depth_mm: z.number(),
    stability_margin_pct: z.number(),
    chatter_frequency_Hz: z.number(),
    optimal_rpm: z.number(),
    severity: z.enum(["stable", "marginal", "chatter", "severe_chatter"]),
  }),
  z.object({
    computed: z.literal(false),
    reason: z.enum(["no_frf_data", "invalid_input", "zero_depth"]),
  }),
]);
export type ChatterSignal = z.infer<typeof ChatterSignalSchema>;

export const OpSignalSchema = z.object({
  op_number: z.number().int(),
  feature_id: z.string(),
  tool_id: z.string(),
  forces: ForceSignalSchema,
  power: PowerSignalSchema,
  chatter: ChatterSignalSchema,
  warnings: z.array(z.string()),
});
export type OpSignal = z.infer<typeof OpSignalSchema>;

export const LatheSafetySignalsSchema = z.object({
  program_id: z.string(),
  material_iso_group: z.string(),
  per_operation: z.array(OpSignalSchema),
  grip: z.object({
    required_gripping_force_N: z.number(),
    centrifugal_force_N: z.number(),
    grip_loss_at_rpm_pct: z.number(),
    safety_factor: z.number(),
    max_safe_rpm: z.number(),
    is_safe: z.boolean(),
    recommendations: z.array(z.string()),
    worst_case_op_number: z.number().int(),
  }),
  overall: z.object({
    any_force_failure: z.boolean(),
    any_power_failure: z.boolean(),
    any_chatter_failure: z.boolean(),
    any_chatter_unverified: z.boolean(),
    grip_safe: z.boolean(),
    worst_case_resultant_N: z.number(),
    worst_case_op_number: z.number().int().nullable(),
    warnings: z.array(z.string()),
  }),
  timestamp: z.string(),
});
export type LatheSafetySignals = z.infer<typeof LatheSafetySignalsSchema>;

// ============================================================================
// ENGINE
// ============================================================================

const POWER_UTIL_SAFE_THRESHOLD_PCT = 85;   // Spindle power utilisation ≤85% to allow transient peaks.
const CHATTER_MARGIN_SAFE_PCT = 10;         // ap must be ≤90% of critical depth.

class LatheSafetySignalEngine {
  private readonly forceEngine = new TurningForceEngine();
  private readonly chatterEngine = new RegenerativeChatterPredictor();
  private readonly chuckEngine = new ChuckJawForceEngine();

  /**
   * Compute per-op + job-level safety signals for a toolpath program.
   * Throws ZodError on invalid input. On per-op physics errors the op's
   * warnings array carries the message and the op signal falls back to
   * zero forces — the overall failure flags will catch it.
   */
  compute(input: SafetySignalInput): LatheSafetySignals {
    SafetySignalInputSchema.parse(input);
    const { program, material, chuck, machine } = input;

    if (program.operations.length === 0) {
      throw new Error("empty_program: ToolpathProgram has zero operations");
    }

    const per_operation: OpSignal[] = [];
    const warnings: string[] = [];

    let worstResultant = 0;
    let worstOpNumber: number | null = null;
    let anyForceFailure = false;
    let anyPowerFailure = false;
    let anyChatterFailure = false;
    let anyChatterUnverified = false;

    for (const op of program.operations) {
      const signal = this.computeOpSignal(op, material, machine);
      per_operation.push(signal);

      if (signal.forces.resultant_N > worstResultant) {
        worstResultant = signal.forces.resultant_N;
        worstOpNumber = op.op_number;
      }

      // Force-failure criterion: NaN / Infinity / negative → invalid physics
      if (!Number.isFinite(signal.forces.resultant_N) || signal.forces.resultant_N < 0) {
        anyForceFailure = true;
      }

      if (!signal.power.power_safe) anyPowerFailure = true;

      if (signal.chatter.computed === false) {
        anyChatterUnverified = true;
      } else if (!signal.chatter.is_stable || signal.chatter.stability_margin_pct < CHATTER_MARGIN_SAFE_PCT) {
        anyChatterFailure = true;
      }
    }

    // Grip gate uses the WORST-CASE op forces (anti-envelope check — if the
    // single heaviest cut is safe at chuck RPM, all lighter cuts are too).
    const worstForces = per_operation.reduce<ForceSignal | null>((acc, s) =>
      !acc || s.forces.resultant_N > acc.resultant_N ? s.forces : acc
    , null);

    if (!worstForces) {
      throw new Error("internal: per_operation empty after non-empty program");
    }

    const worstSpindleRpm = Math.max(...program.operations.map(op => op.spindle_rpm), 0);

    const chuckInput: ChuckForceInput = {
      chuck_type: chuck.chuck_type,
      jaw_type: chuck.jaw_type,
      num_jaws: chuck.num_jaws,
      workpiece_mass_kg: chuck.workpiece_mass_kg,
      workpiece_od_mm: chuck.workpiece_od_mm,
      workpiece_length_mm: chuck.workpiece_length_mm,
      gripping_diameter_mm: chuck.gripping_diameter_mm,
      gripping_length_mm: chuck.gripping_length_mm,
      spindle_rpm: worstSpindleRpm,
      max_spindle_rpm: chuck.max_spindle_rpm,
      cutting_force_tangential_N: worstForces.Fc_N,
      cutting_force_radial_N: worstForces.Fr_N,
      cutting_force_axial_N: worstForces.Fa_N,
      friction_coefficient: chuck.friction_coefficient,
    };
    const gripResult: ChuckForceResult = this.chuckEngine.calculate(chuckInput);

    if (!gripResult.is_safe) {
      warnings.push(
        `GRIP: safety factor ${gripResult.safety_factor.toFixed(2)} < 2.5 — ` +
          `required ${gripResult.required_gripping_force_N.toFixed(0)} N at ${worstSpindleRpm} rpm`,
      );
    }

    if (anyChatterUnverified && machine.frf === undefined) {
      warnings.push(
        "CHATTER: no FRF data supplied — chatter stability UNVERIFIED for all operations. " +
          "Supply machine.frf to enable hard-block, or the emitter must gate on this.",
      );
    }

    return {
      program_id: program.program_id,
      material_iso_group: material.iso_group,
      per_operation,
      grip: {
        required_gripping_force_N: gripResult.required_gripping_force_N,
        centrifugal_force_N: gripResult.centrifugal_force_N,
        grip_loss_at_rpm_pct: gripResult.grip_loss_at_rpm_pct,
        safety_factor: gripResult.safety_factor,
        max_safe_rpm: gripResult.max_safe_rpm,
        is_safe: gripResult.is_safe,
        recommendations: gripResult.recommendations,
        worst_case_op_number: worstOpNumber ?? per_operation[0]?.op_number ?? 0,
      },
      overall: {
        any_force_failure: anyForceFailure,
        any_power_failure: anyPowerFailure,
        any_chatter_failure: anyChatterFailure,
        any_chatter_unverified: anyChatterUnverified,
        grip_safe: gripResult.is_safe,
        worst_case_resultant_N: worstResultant,
        worst_case_op_number: worstOpNumber,
        warnings,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convenience: run compute() and reduce to a short boolean gate used by the
   * emitter's pre-emit safety check. Matches the SAFE/UNVERIFIED/BLOCKED
   * convention downstream U-LSR22 will consume. "UNVERIFIED" here means
   * chatter was skipped due to missing FRF — policy decision is deferred.
   */
  gate(input: SafetySignalInput): { status: "SAFE" | "UNVERIFIED" | "BLOCKED"; reasons: string[]; signals: LatheSafetySignals } {
    const signals = this.compute(input);
    const reasons: string[] = [];

    if (signals.overall.any_force_failure) reasons.push("non-finite cutting force detected");
    if (signals.overall.any_power_failure) reasons.push("spindle power utilisation exceeds threshold");
    if (signals.overall.any_chatter_failure) reasons.push("chatter stability margin below threshold");
    if (!signals.overall.grip_safe) {
      reasons.push(
        `chuck grip unsafe (SF=${signals.grip.safety_factor.toFixed(2)}, ` +
          `max safe rpm ${Math.round(signals.grip.max_safe_rpm)})`,
      );
    }

    if (reasons.length > 0) return { status: "BLOCKED", reasons, signals };
    if (signals.overall.any_chatter_unverified) {
      return {
        status: "UNVERIFIED",
        reasons: ["chatter stability UNVERIFIED — no FRF data for machine"],
        signals,
      };
    }
    return { status: "SAFE", reasons: [], signals };
  }

  // ─── internals ────────────────────────────────────────────────────────

  private computeOpSignal(
    op: ToolpathOperation,
    material: MaterialContext,
    machine: MachineContext,
  ): OpSignal {
    const warnings: string[] = [];

    // 1. Forces via TurningForceEngine — Kienzle + Altintas ratios
    const forceInput: TurningForceInput = {
      cutting_speed_m_min: op.cutting_speed_m_min,
      feed_mm_rev: op.feed_mm_rev,
      depth_of_cut_mm: op.depth_of_cut_mm,
      iso_group: material.iso_group,
      workpiece_diameter_mm: 2 * this.approxRadiusFromMoves(op),
      spindle_power_kW: machine.max_spindle_power_kW,
      operation: this.mapFeatureTypeToTurningOp(op.featureType),
    };

    let forceResult;
    try {
      forceResult = this.forceEngine.calculate(forceInput);
    } catch (err) {
      warnings.push(`TurningForceEngine threw: ${(err as Error).message}`);
      return this.emptyOpSignal(op, warnings);
    }

    // Sandvik notation: Fc = tangential (main cutting), Fp = radial (passive),
    // Ff = feed = axial for longitudinal/boring. For facing the feed direction
    // flips X↔Z but the magnitude mapping is identical, so Fa_N = Ff_N still
    // represents the feed-direction force.
    const forces: ForceSignal = {
      Fc_N: forceResult.tangential_force_Fc_N.value,
      Fr_N: forceResult.radial_force_Fp_N.value,
      Fa_N: forceResult.feed_force_Ff_N.value,
      resultant_N: forceResult.resultant_force_N.value,
      chip_thickness_mm: forceResult.chip_thickness_mm.value,
      chip_width_mm: forceResult.chip_width_mm.value,
      specific_cutting_force_N_mm2: forceResult.specific_cutting_force_N_mm2.value,
    };

    const power: PowerSignal = {
      cutting_kW: forceResult.cutting_power_kW.value,
      spindle_torque_Nm: forceResult.spindle_torque_Nm.value,
      utilization_pct: forceResult.power_utilization_pct,
      power_safe: forceResult.power_utilization_pct <= POWER_UTIL_SAFE_THRESHOLD_PCT,
    };
    if (!power.power_safe) {
      warnings.push(
        `POWER: utilisation ${power.utilization_pct.toFixed(1)}% > ${POWER_UTIL_SAFE_THRESHOLD_PCT}%`,
      );
    }
    forceResult.recommendations.forEach(r => warnings.push(r));

    // 2. Chatter via RegenerativeChatterPredictor — only if FRF supplied.
    let chatter: ChatterSignal;
    if (!machine.frf) {
      chatter = { computed: false, reason: "no_frf_data" };
    } else if (op.depth_of_cut_mm <= 0) {
      chatter = { computed: false, reason: "zero_depth" };
    } else {
      const kc11 = CANONICAL_KIENZLE[material.iso_group].kc1_1;
      const chatterInput: ChatterInput = {
        cut_type: "turning",
        spindle_rpm: op.spindle_rpm,
        depth_of_cut_mm: op.depth_of_cut_mm,
        num_flutes: 1,                                // single-point insert
        tool_diameter_mm: machine.frf.tool_diameter_mm,
        natural_freq_Hz: machine.frf.natural_freq_Hz,
        stiffness_N_per_m: machine.frf.stiffness_N_per_m,
        damping_ratio: machine.frf.damping_ratio,
        specific_cutting_force_N_mm2: kc11,
      };
      try {
        const cr = this.chatterEngine.predict(chatterInput);
        chatter = {
          computed: true,
          is_stable: cr.is_stable,
          current_depth_mm: cr.current_depth_mm,
          critical_depth_mm: cr.critical_depth_mm,
          stability_margin_pct: cr.stability_margin_pct,
          chatter_frequency_Hz: cr.chatter_frequency_Hz,
          optimal_rpm: cr.optimal_rpm,
          severity: cr.severity,
        };
        if (!cr.is_stable) {
          warnings.push(
            `CHATTER: ${cr.severity} at ${op.spindle_rpm} rpm, margin ${cr.stability_margin_pct.toFixed(0)}%. ` +
              `Optimal ${Math.round(cr.optimal_rpm)} rpm.`,
          );
        }
      } catch (err) {
        chatter = { computed: false, reason: "invalid_input" };
        warnings.push(`CHATTER: predictor threw: ${(err as Error).message}`);
      }
    }

    return {
      op_number: op.op_number,
      feature_id: op.featureId,
      tool_id: op.tool_id,
      forces,
      power,
      chatter,
      warnings,
    };
  }

  private emptyOpSignal(op: ToolpathOperation, warnings: string[]): OpSignal {
    return {
      op_number: op.op_number,
      feature_id: op.featureId,
      tool_id: op.tool_id,
      forces: { Fc_N: 0, Fr_N: 0, Fa_N: 0, resultant_N: 0, chip_thickness_mm: 0, chip_width_mm: 0, specific_cutting_force_N_mm2: 0 },
      power: { cutting_kW: 0, spindle_torque_Nm: 0, utilization_pct: 0, power_safe: false },
      chatter: { computed: false, reason: "invalid_input" },
      warnings,
    };
  }

  private approxRadiusFromMoves(op: ToolpathOperation): number {
    // Diameter-mode turning: X is stored as radial coordinate in moves.
    // Use the max absolute X across moves as the workpiece radius proxy.
    let maxX = 0;
    for (const m of op.moves) {
      if (m.x_mm !== undefined && Math.abs(m.x_mm) > maxX) maxX = Math.abs(m.x_mm);
    }
    return maxX > 0 ? maxX : 25; // fallback 25 mm radius = 50 mm OD if no geometry
  }

  private mapFeatureTypeToTurningOp(
    featureType: string,
  ): "longitudinal" | "facing" | "parting" | "boring" | "grooving" {
    const f = featureType.toLowerCase();
    if (f.includes("bore") || f.includes("id_")) return "boring";
    if (f.includes("part") || f.includes("cutoff") || f.includes("cut_off")) return "parting";
    if (f.includes("groove")) return "grooving";
    if (f.includes("face")) return "facing";
    return "longitudinal";
  }
}

export const latheSafetySignalEngine = new LatheSafetySignalEngine();
export { LatheSafetySignalEngine };
