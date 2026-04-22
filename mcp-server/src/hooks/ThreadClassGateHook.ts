/**
 * ThreadClassGateHook — LATHE-PRO-MS4a Forge-Triple hook.
 *
 * Safety gate: validates that the manufactured pitch diameter of a
 * single-point-threaded part lies within the ISO 965-1 (metric) or
 * ASME B1.1 (UN) tolerance class band. Blocks the threading cascade
 * when the projected pitch diameter escapes the class window.
 *
 * Triggers on dispatcher actions:
 *   • turning_thread_optimize       (capstone)
 *   • turning_thread_stochastic_plan
 *   • turning_thread_robust_optimizer
 *   • turning_thread_robust_pass_count
 *
 * Decision rule:
 *   manufactured_d2 = basic_d2 + manufactured_pitch_offset_mm
 *   pass iff min_allowed_pitch_diameter_mm ≤ manufactured_d2 ≤ max_allowed_pitch_diameter_mm
 *
 * The hook delegates the physics to `TurningThreadOptimizerEngine.checkPitchDiameter`
 * so ISO 965-1 tolerance tables live in exactly one place.
 *
 * @milestone LATHE-PRO-MS4a Forge-Triple
 * @module hooks/ThreadClassGateHook
 * @version 1.0.0
 */

import { z } from "zod";
import {
  turningThreadOptimizerEngine,
  type ThreadTolClass,
  type PitchDiameterCheck,
} from "../engines/TurningThreadOptimizerEngine.js";
import type { SPTInput } from "../engines/SinglePointThreadEngine.js";

// ── Hook metadata ───────────────────────────────────────────────────────────

export const HOOK_NAME = "thread-class-gate";
export const HOOK_VERSION = "1.0.0";

/** Dispatcher actions this hook guards. */
export const GUARDED_ACTIONS = [
  "turning_thread_optimize",
  "turning_thread_stochastic_plan",
  "turning_thread_robust_optimizer",
  "turning_thread_robust_pass_count",
  "turning_thread_sensitivity",
] as const;

// ── Schemas ─────────────────────────────────────────────────────────────────

/** Permissive thread-spec validation — engine re-validates. */
const ThreadSpecSchema = z
  .object({
    thread_form: z.enum(["UN", "metric", "ACME", "trapezoidal", "buttress"]),
    pitch_mm: z.number().positive(),
    major_diameter_mm: z.number().positive(),
    internal: z.boolean(),
    infeed_method: z.enum([
      "radial",
      "flank",
      "modified_flank",
      "alternating_flank",
      "constant_area",
    ]),
    total_depth_mm: z.number().positive(),
    spindle_rpm: z.number().positive(),
    num_passes: z.number().int().min(1),
    spring_passes: z.number().int().min(0),
    lead_in_mm: z.number().min(0),
    lead_out_mm: z.number().min(0),
    thread_length_mm: z.number().positive(),
    material_tensile_MPa: z.number().positive(),
  })
  .passthrough();

const GateInputSchema = z.object({
  thread: ThreadSpecSchema,
  tolerance_class: z
    .enum(["6g", "6H", "4g", "4H", "2A", "3A", "2B", "3B"])
    .optional(),
  manufactured_pitch_offset_mm: z.number().finite().optional(),
  /** When true, a borderline pass (margin below `margin_floor_um`) is
   *  promoted to a warning rather than a pass. Default 10 μm. */
  margin_floor_um: z.number().min(0).max(100).optional(),
});

export type ThreadClassGateInput = z.infer<typeof GateInputSchema>;

export type GateSeverity = "pass" | "warning" | "block" | "error";

export interface ThreadClassGateViolation {
  code: string;
  parameter: string;
  value: number;
  limit: number;
  severity: GateSeverity;
  message: string;
}

export interface ThreadClassGateResult {
  passed: boolean;
  blocked: boolean;
  severity: GateSeverity;
  /** Full pitch-diameter breakdown from the optimizer. */
  pitch_check: PitchDiameterCheck;
  violations: ThreadClassGateViolation[];
  safety_score: number; // 0..1 — 1.0 = margin ≥ 2×floor; 0.0 = failed/over band
  summary: string;
  source: string;
}

// ── Hook implementation ─────────────────────────────────────────────────────

export class ThreadClassGateHook {
  private static readonly VERSION = HOOK_VERSION;

  /** Validate manufactured pitch diameter against tolerance class. */
  static validate(input: ThreadClassGateInput): ThreadClassGateResult {
    const parsed = GateInputSchema.safeParse(input);
    if (!parsed.success) {
      const stubCheck: PitchDiameterCheck = {
        thread_form: "metric",
        internal: false,
        class_used: "6g",
        nominal_major_mm: 0,
        pitch_mm: 0,
        basic_pitch_diameter_mm: 0,
        max_allowed_pitch_diameter_mm: 0,
        min_allowed_pitch_diameter_mm: 0,
        tolerance_band_um: 0,
        pass: false,
        margin_um: 0,
        notes: [`Invalid input: ${parsed.error.message}`],
      };
      return {
        passed: false,
        blocked: true,
        severity: "error",
        pitch_check: stubCheck,
        violations: [
          {
            code: "INVALID_INPUT",
            parameter: "input",
            value: 0,
            limit: 0,
            severity: "error",
            message: `ThreadClassGateHook: invalid input — ${parsed.error.message}`,
          },
        ],
        safety_score: 0,
        summary: "ThreadClassGateHook rejected invalid input before evaluation.",
        source: "ThreadClassGateHook.validate",
      };
    }

    const { thread, tolerance_class, manufactured_pitch_offset_mm, margin_floor_um } =
      parsed.data;
    const cls: ThreadTolClass =
      tolerance_class ?? (thread.internal ? "6H" : "6g");
    const floor_um = margin_floor_um ?? 10;

    let pitch: PitchDiameterCheck;
    try {
      pitch = turningThreadOptimizerEngine.checkPitchDiameter(
        thread as SPTInput,
        cls,
        manufactured_pitch_offset_mm ?? 0,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err ?? "unknown error");
      const stubCheck: PitchDiameterCheck = {
        thread_form: thread.thread_form,
        internal: thread.internal,
        class_used: cls,
        nominal_major_mm: thread.major_diameter_mm,
        pitch_mm: thread.pitch_mm,
        basic_pitch_diameter_mm: 0,
        max_allowed_pitch_diameter_mm: 0,
        min_allowed_pitch_diameter_mm: 0,
        tolerance_band_um: 0,
        pass: false,
        margin_um: 0,
        notes: [msg],
      };
      return {
        passed: false,
        blocked: true,
        severity: "error",
        pitch_check: stubCheck,
        violations: [
          {
            code: "ENGINE_ERROR",
            parameter: "thread",
            value: 0,
            limit: 0,
            severity: "error",
            message: `ThreadClassGateHook: pitch-diameter check failed — ${msg}`,
          },
        ],
        safety_score: 0,
        summary: `ThreadClassGateHook errored: ${msg}`,
        source: "ThreadClassGateHook.validate",
      };
    }

    const violations: ThreadClassGateViolation[] = [];
    let severity: GateSeverity;
    let safety_score: number;
    let summary: string;
    let passed: boolean;
    let blocked: boolean;

    if (!pitch.pass) {
      // Outside band → hard block.
      severity = "block";
      passed = false;
      blocked = true;
      safety_score = 0;
      const direction =
        pitch.margin_um < 0 ? "under" : "over"; // negative margin encodes side
      violations.push({
        code: "PITCH_DIA_OUT_OF_CLASS",
        parameter: "manufactured_pitch_diameter_mm",
        value: pitch.basic_pitch_diameter_mm + (manufactured_pitch_offset_mm ?? 0),
        limit:
          direction === "under"
            ? pitch.min_allowed_pitch_diameter_mm
            : pitch.max_allowed_pitch_diameter_mm,
        severity: "block",
        message: `Manufactured pitch diameter escapes class ${pitch.class_used} band by ${Math.abs(pitch.margin_um)} μm (${direction} ${direction === "under" ? "min" : "max"}). Band = ${pitch.tolerance_band_um} μm.`,
      });
      summary = `BLOCK: pitch diameter outside ${pitch.class_used} class band by ${Math.abs(pitch.margin_um)} μm.`;
    } else if (pitch.margin_um < floor_um) {
      // Inside band but thin → warning.
      severity = "warning";
      passed = true;
      blocked = false;
      safety_score = Math.max(pitch.margin_um / Math.max(floor_um, 1), 0.1);
      violations.push({
        code: "PITCH_DIA_MARGIN_THIN",
        parameter: "manufactured_pitch_diameter_mm",
        value: pitch.margin_um,
        limit: floor_um,
        severity: "warning",
        message: `Pitch-diameter margin ${pitch.margin_um} μm below floor ${floor_um} μm for class ${pitch.class_used} — insert wear or thermal drift will push this out of tolerance.`,
      });
      summary = `WARNING: pitch diameter inside class ${pitch.class_used} but margin ${pitch.margin_um} μm < ${floor_um} μm floor.`;
    } else {
      // Healthy margin.
      severity = "pass";
      passed = true;
      blocked = false;
      safety_score = Math.min(
        1,
        0.5 + pitch.margin_um / Math.max(2 * floor_um, 1),
      );
      summary = `PASS: pitch diameter within class ${pitch.class_used} with margin ${pitch.margin_um} μm (≥ ${floor_um} μm floor).`;
    }

    return {
      passed,
      blocked,
      severity,
      pitch_check: pitch,
      violations,
      safety_score: Math.round(safety_score * 1000) / 1000,
      summary,
      source: "ThreadClassGateHook.validate (ISO 965-1 / ASME B1.1 pitch-dia class gate)",
    };
  }
}

export const threadClassGateHook = ThreadClassGateHook;
