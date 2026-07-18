/**
 * SubSpindleHandoffVerifierEngine — twin-spindle lathe pickup verification
 *
 * Closes the iter20 P1 "sub-spindle handoff" gap. Twin-spindle lathes (Okuma LT,
 * Mazak Integrex, Doosan Puma TT, Nakamura WT) transfer the part from main to
 * sub-spindle for back-side machining. Mishandled handoff causes:
 *   - Part dropped (no chuck pressure on sub-side before main release)
 *   - C-axis indexing drift (spindles not phase-locked during pickup)
 *   - Workpiece slip in Op2 cut (grip pressure insufficient for cut load)
 *   - Tool crash at transfer (Z-clearance audit missed)
 *
 * Verifier checks 6 axes (all PreCut-stage gates):
 *   1. Phase sync — spindles ω-locked within ±0.5° before C-axis pickup
 *   2. Face contact — Z-axis stop touch-off ≤0.05mm gap (touch-probe verified)
 *   3. Grip pressure — sub-side ≥ required clamping force for Op2 cut load
 *   4. Transfer window — main releases AFTER sub clamps confirmed (no overlap gap)
 *   5. C-axis re-index — angular orientation maintained across handoff
 *   6. Z-clearance — turret + tailstock out of transfer envelope
 *
 * Reference: Okuma OSP-P300L Sub-Spindle Programming §5; Mazak Integrex i-Series
 *   Multi-Surface Operations §4.2; Doosan Puma TT Series Operator Manual §6
 *   (twin-spindle synchronization); Nakamura WT-150 Operating Procedure §C-3.
 *
 * @version 1.0.0
 * @module SubSpindleHandoffVerifierEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface SubSpindleHandoffInput {
  /** Phase sync error between main and sub spindles (degrees, ±) */
  phase_sync_error_deg: number;
  /** Z-axis face-contact gap measured by touch probe (mm) */
  face_contact_gap_mm: number;
  /** Sub-spindle chuck grip force (N) */
  sub_grip_force_n: number;
  /** Required clamping force for Op2 cut (cutting force × safety_factor) */
  required_grip_force_n: number;
  /** Whether transfer window is "no-overlap" (gap between main-release and sub-clamp ms) */
  transfer_overlap_ms: number;
  /** C-axis angular orientation preserved (true = re-indexed correctly) */
  c_axis_indexed: boolean;
  /** Z-axis clearance from turret/tailstock at transfer (mm) */
  z_clearance_mm: number;
  /** Required Z-clearance for cleanest transfer (default 20mm) */
  required_z_clearance_mm?: number;
  /** Phase tolerance for verdict (default ±0.5°) */
  phase_tolerance_deg?: number;
  /** Max face-contact gap (default 0.05mm) */
  max_face_gap_mm?: number;
  /** Max acceptable transfer overlap (default 0 ms — strict no-overlap) */
  max_overlap_ms?: number;
}

export type HandoffVerdict = "verified" | "marginal" | "rejected" | "unsafe";

export interface SubSpindleHandoffResult {
  verdict: HandoffVerdict;
  checks: {
    phase_sync: { pass: boolean; tolerance_deg: number; actual_deg: number };
    face_contact: { pass: boolean; max_gap_mm: number; actual_mm: number };
    grip_pressure: { pass: boolean; required_n: number; actual_n: number; safety_margin_pct: number };
    transfer_window: { pass: boolean; max_overlap_ms: number; actual_ms: number };
    c_axis_indexed: { pass: boolean };
    z_clearance: { pass: boolean; required_mm: number; actual_mm: number };
  };
  failure_reasons: string[];
  warnings: string[];
  source: string;
}

export class SubSpindleHandoffVerifierEngine {
  verify(input: SubSpindleHandoffInput): SubSpindleHandoffResult {
    if (!input || input.phase_sync_error_deg == null || input.face_contact_gap_mm == null) {
      throw new Error("SubSpindleHandoffVerifierEngine.verify: phase_sync_error_deg + face_contact_gap_mm required");
    }
    if (input.sub_grip_force_n == null || input.required_grip_force_n == null) {
      throw new Error("SubSpindleHandoffVerifierEngine.verify: sub_grip_force_n + required_grip_force_n required");
    }
    if (input.face_contact_gap_mm < 0) {
      throw new Error("SubSpindleHandoffVerifierEngine.verify: face_contact_gap_mm must be non-negative");
    }
    if (input.required_grip_force_n <= 0) {
      throw new Error("SubSpindleHandoffVerifierEngine.verify: positive required_grip_force_n required");
    }

    const failures: string[] = [];
    const warnings: string[] = [];

    const phaseTol = input.phase_tolerance_deg ?? 0.5;
    const maxGap = input.max_face_gap_mm ?? 0.05;
    const maxOverlap = input.max_overlap_ms ?? 0;
    const reqClearance = input.required_z_clearance_mm ?? 20;

    // ── 1. Phase sync ─────────────────────────────────────────────────
    const phaseAbs = Math.abs(input.phase_sync_error_deg);
    const phasePass = phaseAbs <= phaseTol;
    if (!phasePass) {
      failures.push(`Phase sync error ${input.phase_sync_error_deg}° exceeds tolerance ±${phaseTol}° — C-axis pickup will drift (Mazak §4.2)`);
    }

    // ── 2. Face contact ───────────────────────────────────────────────
    const facePass = input.face_contact_gap_mm <= maxGap;
    if (!facePass) {
      failures.push(`Face gap ${input.face_contact_gap_mm}mm > ${maxGap}mm — touch-probe re-zero before transfer (Okuma §5)`);
    }

    // ── 3. Grip pressure ──────────────────────────────────────────────
    const gripPass = input.sub_grip_force_n >= input.required_grip_force_n;
    const safetyMargin = ((input.sub_grip_force_n - input.required_grip_force_n) / input.required_grip_force_n) * 100;
    if (!gripPass) {
      failures.push(`Sub-spindle grip ${input.sub_grip_force_n}N < required ${input.required_grip_force_n}N — workpiece will slip in Op2 cut`);
    } else if (safetyMargin < 25) {
      warnings.push(`Grip safety margin ${safetyMargin.toFixed(1)}% < 25% recommended (Doosan §6 — increase chuck pressure)`);
    }

    // ── 4. Transfer window (no-overlap) ───────────────────────────────
    const transferPass = input.transfer_overlap_ms <= maxOverlap;
    if (!transferPass) {
      failures.push(`Transfer overlap ${input.transfer_overlap_ms}ms > ${maxOverlap}ms — UNSAFE; part is gripped by both spindles simultaneously, will fracture or torque-bind`);
    }

    // ── 5. C-axis indexed ─────────────────────────────────────────────
    if (!input.c_axis_indexed) {
      failures.push("C-axis not re-indexed after handoff — Op2 features will mis-orient relative to Op1 datum");
    }

    // ── 6. Z-clearance ────────────────────────────────────────────────
    const clearancePass = input.z_clearance_mm >= reqClearance;
    if (!clearancePass) {
      failures.push(`Z-clearance ${input.z_clearance_mm}mm < ${reqClearance}mm required — turret/tailstock collision risk during transfer`);
    }

    // ── Verdict ────────────────────────────────────────────────────────
    let verdict: HandoffVerdict;
    if (!transferPass) {
      verdict = "unsafe";  // overlap is the catastrophic failure mode
    } else if (failures.length === 0) {
      // All pass — check for marginal grip-margin warning
      if (gripPass && safetyMargin < 25) {
        verdict = "marginal";
      } else {
        verdict = "verified";
      }
    } else {
      verdict = "rejected";
    }

    return {
      verdict,
      checks: {
        phase_sync: { pass: phasePass, tolerance_deg: phaseTol, actual_deg: input.phase_sync_error_deg },
        face_contact: { pass: facePass, max_gap_mm: maxGap, actual_mm: input.face_contact_gap_mm },
        grip_pressure: {
          pass: gripPass,
          required_n: input.required_grip_force_n,
          actual_n: input.sub_grip_force_n,
          safety_margin_pct: Number(safetyMargin.toFixed(1)),
        },
        transfer_window: { pass: transferPass, max_overlap_ms: maxOverlap, actual_ms: input.transfer_overlap_ms },
        c_axis_indexed: { pass: input.c_axis_indexed },
        z_clearance: { pass: clearancePass, required_mm: reqClearance, actual_mm: input.z_clearance_mm },
      },
      failure_reasons: failures,
      warnings,
      source: "SubSpindleHandoffVerifierEngine — Okuma OSP-P300L §5 + Mazak Integrex §4.2 + Doosan Puma TT §6 + Nakamura WT-150 §C-3",
    };
  }
}

export const subSpindleHandoffVerifierEngine = new SubSpindleHandoffVerifierEngine();
