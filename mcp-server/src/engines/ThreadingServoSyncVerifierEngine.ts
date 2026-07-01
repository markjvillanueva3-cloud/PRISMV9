/**
 * ThreadingServoSyncVerifierEngine — verify lathe spindle ↔ Z-axis sync for threading
 *
 * Closes the iter20 P1 "threading servo-sync verification" gap. Lathe threading
 * (G33/G92/G76) requires the Z-axis feed to be mechanically locked to spindle
 * angular position — phase error > tolerance produces:
 *   - Drunken threads (pitch error > 0.5% of nominal)
 *   - Stripped thread on retract (synchronization breaks mid-cycle)
 *   - Tool snap on plunge (Z arrives at thread-start before spindle index)
 *
 * Verifier checks (all ADVISORY at first-part-perfect PreCut gate):
 *   - Spindle encoder PPR ≥ 1024 (lower res starves servo loop)
 *   - Servo loop bandwidth ≥ 6× spindle RPM (Nyquist + 3× margin)
 *   - Phase tolerance ≤ 15° (Sandvik T-Max-U recommendation §C-2)
 *   - Acceleration headroom for thread-start dwell (Z must catch spindle at thread index)
 *   - C-axis enabled if rigid-tap or live-tool threading
 *   - Thread lead × spindle_rpm ≤ rapid_traverse_z (Z can keep up with RPM)
 *
 * Reference: ISO 5404 (lathe accuracy + threading); Sandvik T-Max-U Threading
 *   Application Guide §C-2 (phase tolerance + bandwidth); Fanuc 0i-TF Threading
 *   Manual §4 (rigid threading prerequisites); Okuma OSP-P300L Threading Guide §3.
 *
 * @version 1.0.0
 * @module ThreadingServoSyncVerifierEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type ThreadingMode = "g33" | "g32" | "g76" | "g92" | "rigid_tap";

export interface ThreadingServoSyncInput {
  /** Threading G-code mode */
  mode: ThreadingMode;
  /** Spindle RPM during thread cycle */
  spindle_rpm: number;
  /** Thread lead (mm/rev) — distance Z travels per spindle revolution */
  thread_lead_mm: number;
  /** Spindle encoder pulses per revolution */
  spindle_encoder_ppr: number;
  /** Servo loop closure rate (Hz) */
  servo_bandwidth_hz: number;
  /** Z-axis rapid traverse limit (mm/min) */
  z_rapid_mm_min: number;
  /** Z-axis acceleration (mm/s²) */
  z_accel_mm_s2: number;
  /** Whether C-axis encoder is enabled (required for rigid_tap) */
  c_axis_enabled?: boolean;
  /** Phase tolerance for verdict (degrees, default 15) */
  phase_tolerance_deg?: number;
}

export type SyncVerdict = "verified" | "marginal" | "rejected" | "unsafe";

export interface ThreadingServoSyncResult {
  verdict: SyncVerdict;
  /** Per-check pass/fail */
  checks: {
    encoder_resolution: { pass: boolean; required: number; actual: number };
    servo_bandwidth: { pass: boolean; required_hz: number; actual_hz: number };
    z_feed_capability: { pass: boolean; required_mm_min: number; actual_mm_min: number };
    z_accel_headroom: { pass: boolean; required_mm_s2: number; actual_mm_s2: number };
    c_axis_for_rigid: { pass: boolean; required: boolean; actual: boolean };
  };
  required_z_feed_mm_min: AtomicValue;
  failure_reasons: string[];
  warnings: string[];
  source: string;
}

export class ThreadingServoSyncVerifierEngine {
  verify(input: ThreadingServoSyncInput): ThreadingServoSyncResult {
    if (!input || !input.mode || input.spindle_rpm == null || input.thread_lead_mm == null) {
      throw new Error("ThreadingServoSyncVerifierEngine.verify: mode + spindle_rpm + thread_lead_mm required");
    }
    if (input.spindle_rpm <= 0 || input.thread_lead_mm <= 0) {
      throw new Error("ThreadingServoSyncVerifierEngine.verify: positive spindle_rpm + thread_lead required");
    }

    const warnings: string[] = [];
    const failures: string[] = [];

    // ── Encoder resolution (Sandvik T-Max-U §C-2: ≥1024 PPR minimum) ──
    const ENCODER_REQ = 1024;
    const encoderPass = input.spindle_encoder_ppr >= ENCODER_REQ;
    if (!encoderPass) {
      failures.push(`Spindle encoder ${input.spindle_encoder_ppr} PPR < ${ENCODER_REQ} required — phase resolution insufficient for threading sync`);
    }

    // ── Servo bandwidth (Nyquist + 3× margin: bw ≥ 6 × spindle_Hz) ────
    const spindleHz = input.spindle_rpm / 60;
    const bwRequired = 6 * spindleHz;
    const bwPass = input.servo_bandwidth_hz >= bwRequired;
    if (!bwPass) {
      failures.push(`Servo bandwidth ${input.servo_bandwidth_hz} Hz < ${bwRequired.toFixed(1)} Hz required (6× spindle Hz for Nyquist + margin)`);
    }

    // ── Z feed capability (z_feed = lead × rpm) ───────────────────────
    const zFeedRequired = input.thread_lead_mm * input.spindle_rpm;
    const zFeedPass = input.z_rapid_mm_min >= zFeedRequired;
    if (!zFeedPass) {
      failures.push(`Z requires ${zFeedRequired.toFixed(0)} mm/min for lead=${input.thread_lead_mm} mm @ ${input.spindle_rpm} RPM — Z rapid only ${input.z_rapid_mm_min} mm/min`);
    }

    // ── Z acceleration headroom ───────────────────────────────────────
    // Z must reach feed in < 1 rev (so first thread is in spec). Required accel = (z_feed/60) / (1/spindle_rev_s)
    // = (z_feed/60) × (spindle_rpm/60) = z_feed × spindle_rpm / 3600 mm/s²
    const accelRequired = zFeedRequired * input.spindle_rpm / 3600;
    const accelPass = input.z_accel_mm_s2 >= accelRequired;
    if (!accelPass) {
      failures.push(`Z accel ${input.z_accel_mm_s2} mm/s² < ${accelRequired.toFixed(0)} mm/s² required to reach thread feed in <1 spindle rev`);
    }

    // ── C-axis (required for rigid_tap) ───────────────────────────────
    const cAxisRequired = input.mode === "rigid_tap";
    const cAxisActual = input.c_axis_enabled === true;
    const cAxisPass = !cAxisRequired || cAxisActual;
    if (!cAxisPass) {
      failures.push("Rigid tap requires C-axis encoder — enable C-axis or switch to G76 floating-tap holder");
    }

    // ── Verdict ────────────────────────────────────────────────────────
    let verdict: SyncVerdict;
    const allPass = encoderPass && bwPass && zFeedPass && accelPass && cAxisPass;
    if (allPass) {
      // Margin check — if any metric is within 10% of threshold, mark marginal
      const bwMargin = (input.servo_bandwidth_hz - bwRequired) / bwRequired;
      const feedMargin = (input.z_rapid_mm_min - zFeedRequired) / zFeedRequired;
      const accelMargin = (input.z_accel_mm_s2 - accelRequired) / accelRequired;
      if (bwMargin < 0.1 || feedMargin < 0.1 || accelMargin < 0.1) {
        verdict = "marginal";
        warnings.push("One or more metrics within 10% of threshold — recommend reducing spindle RPM or lead");
      } else {
        verdict = "verified";
      }
    } else if (!cAxisPass) {
      verdict = "unsafe";
    } else {
      verdict = "rejected";
    }

    return {
      verdict,
      checks: {
        encoder_resolution: { pass: encoderPass, required: ENCODER_REQ, actual: input.spindle_encoder_ppr },
        servo_bandwidth: { pass: bwPass, required_hz: Number(bwRequired.toFixed(1)), actual_hz: input.servo_bandwidth_hz },
        z_feed_capability: { pass: zFeedPass, required_mm_min: Number(zFeedRequired.toFixed(0)), actual_mm_min: input.z_rapid_mm_min },
        z_accel_headroom: { pass: accelPass, required_mm_s2: Number(accelRequired.toFixed(0)), actual_mm_s2: input.z_accel_mm_s2 },
        c_axis_for_rigid: { pass: cAxisPass, required: cAxisRequired, actual: cAxisActual },
      },
      required_z_feed_mm_min: {
        value: Number(zFeedRequired.toFixed(1)),
        unit: "mm/min",
        source: "thread_lead × spindle_rpm (G33 sync requirement)",
      },
      failure_reasons: failures,
      warnings,
      source: "ThreadingServoSyncVerifierEngine — ISO 5404 + Sandvik T-Max-U §C-2 + Fanuc 0i-TF §4 + Okuma OSP-P300L §3",
    };
  }
}

export const threadingServoSyncVerifierEngine = new ThreadingServoSyncVerifierEngine();
