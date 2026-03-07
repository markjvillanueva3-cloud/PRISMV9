/**
 * MachineVibrationEngine — Machine Tool Vibration & Chatter Analysis
 *
 * Models: Regenerative chatter prediction and avoidance.
 * - Stability lobe diagram critical depth
 * - Natural frequency from FRF estimates
 * - Tooth passing frequency
 * - Chatter frequency prediction
 * - Spindle speed selection for stability
 * - Vibration severity per ISO 10816
 *
 * Key physics: b_lim = -1/(2Ks×Re[G]).
 * TPF = N×n/60. Stable lobes at n = 60×f_c/(N×(k+ε/2π)).
 * Severity per ISO 10816: velocity mm/s RMS.
 *
 * Reference: Altintas — Manufacturing Automation,
 *            Tlusty — Regenerative Chatter,
 *            ISO 10816 — Vibration Severity
 *
 * Actions: machine_vibration_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface MachineVibrationInput {
  natural_frequency_hz?: number;
  damping_ratio?: number;
  stiffness_n_um?: number;
  specific_cutting_force_mpa?: number;
  num_flutes?: number;
  spindle_rpm?: number;
  radial_doc_mm?: number;
  tool_diameter_mm?: number;
  vibration_velocity_mm_s?: number;
  machine_class?: "small" | "medium" | "large" | "precision";
}

export interface MachineVibrationResult {
  critical_depth_mm: AtomicValue;
  tooth_passing_freq: AtomicValue;
  chatter_frequency: AtomicValue;
  stable_rpm_1: AtomicValue;
  stable_rpm_2: AtomicValue;
  stability_ratio: AtomicValue;
  vibration_severity: AtomicValue;
  iso_zone: AtomicValue;
  recommended_rpm: AtomicValue;
  max_stable_doc: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** ISO 10816 zones (velocity mm/s RMS) by machine class */
const ISO_ZONES: Record<string, [number, number, number]> = {
  small:     [0.71, 1.8, 4.5],  // A/B, B/C, C/D boundaries
  medium:    [1.12, 2.8, 7.1],
  large:     [1.8,  4.5, 11.2],
  precision: [0.45, 1.12, 2.8],
};

// ── Engine ─────────────────────────────────────────────────────────

export class MachineVibrationEngine {
  calculate(input: MachineVibrationInput): MachineVibrationResult {
    const warnings: string[] = [];
    const fn = input.natural_frequency_hz ?? 800;
    const zeta = input.damping_ratio ?? 0.03;
    const ks = input.stiffness_n_um ?? 20; // N/µm
    const Kc = input.specific_cutting_force_mpa ?? 2000;
    const N = input.num_flutes ?? 3;
    const rpm = input.spindle_rpm ?? 8000;
    const ae = input.radial_doc_mm ?? 5;
    const D = input.tool_diameter_mm ?? 12;
    const vibVel = input.vibration_velocity_mm_s ?? 1.0;
    const machClass = input.machine_class ?? "medium";

    // Tooth passing frequency
    const tpf = N * rpm / 60;

    // Immersion ratio
    const immersion = ae / D;
    const avgTeethEngaged = N * Math.acos(1 - 2 * immersion) / (2 * Math.PI);

    // Critical depth of cut (stability limit)
    // b_lim = -1 / (2 × Kc × Re[G(fc)])
    // At worst case: Re[G] = -1/(2k×zeta)
    // b_lim = k / (Kc × zeta × avg_teeth)
    const kN_m = ks * 1e6; // N/µm → N/m
    const blim = kN_m / (Kc * 1e6 * Math.max(zeta, 0.001) *
      Math.max(avgTeethEngaged, 0.5)) * 1000; // m → mm

    // Chatter frequency (near natural frequency)
    const fc = fn * Math.sqrt(1 + 2 * zeta); // slightly above fn

    // Stable RPM (stability lobe peaks)
    // n_k = 60 × fc / (N × k) for integer k
    const k1 = Math.round(fc * 60 / (N * Math.max(rpm, 1)));
    const stableRPM1 = k1 > 0 ? 60 * fc / (N * k1) : rpm;
    const stableRPM2 = k1 > 1 ? 60 * fc / (N * (k1 - 1)) : stableRPM1 * 1.2;

    // Stability ratio (how far above/below critical depth)
    const stabilityRatio = blim > 0 ? ae / blim : 999;

    // ISO 10816 vibration severity
    const [abBound, bcBound, cdBound] = ISO_ZONES[machClass] ?? ISO_ZONES.medium;
    let isoZone: string;
    if (vibVel < abBound) isoZone = "A (Good)";
    else if (vibVel < bcBound) isoZone = "B (Acceptable)";
    else if (vibVel < cdBound) isoZone = "C (Alert)";
    else isoZone = "D (Danger)";

    // Recommended RPM (nearest stable lobe)
    const recRPM = Math.abs(rpm - stableRPM1) < Math.abs(rpm - stableRPM2) ?
      stableRPM1 : stableRPM2;

    // Max stable DOC at current RPM
    // At lobe peaks, blim can be 2-3× the minimum
    const lobeFactor = 1 + Math.abs(Math.sin(Math.PI * tpf / fc));
    const maxStableDoc = blim * lobeFactor;

    // Warnings
    if (stabilityRatio > 0.8) {
      warnings.push(`Stability ratio ${r2(stabilityRatio)} near limit — chatter likely`);
    }
    if (isoZone.includes("C") || isoZone.includes("D")) {
      warnings.push(`Vibration ${vibVel}mm/s in zone ${isoZone} — investigate cause`);
    }
    if (Math.abs(tpf - fn) / fn < 0.1) {
      warnings.push(`TPF ${r0(tpf)}Hz near natural frequency ${fn}Hz — resonance risk`);
    }
    if (zeta < 0.02) {
      warnings.push(`Damping ratio ${zeta} very low — add damping or reduce overhang`);
    }
    if (immersion > 0.5 && blim < 2) {
      warnings.push("High immersion with low stability limit — reduce radial DOC");
    }

    const src = "MachineVibrationEngine (Altintas/Tlusty)";

    return {
      critical_depth_mm: mkAv(r2(blim), "mm", blim * 0.2,
        `k/(Kc×ζ×n_teeth)`),
      tooth_passing_freq: mkAv(r0(tpf), "Hz", tpf * 0.01,
        `${N}×${rpm}/60`),
      chatter_frequency: mkAv(r0(fc), "Hz", fc * 0.05,
        `fn×√(1+2ζ)`),
      stable_rpm_1: mkAv(r0(stableRPM1), "rpm", stableRPM1 * 0.02,
        `Lobe k=${k1}`),
      stable_rpm_2: mkAv(r0(stableRPM2), "rpm", stableRPM2 * 0.02,
        `Lobe k=${k1 > 1 ? k1 - 1 : k1}`),
      stability_ratio: mkAv(r2(stabilityRatio), "ratio", stabilityRatio * 0.1,
        `ae/b_lim`),
      vibration_severity: mkAv(r1(vibVel), "mm/s RMS", vibVel * 0.05,
        "Measured"),
      iso_zone: mkAv(
        isoZone.includes("A") ? 1 : isoZone.includes("B") ? 2 :
        isoZone.includes("C") ? 3 : 4,
        isoZone, 0, `ISO 10816 ${machClass}`),
      recommended_rpm: mkAv(r0(recRPM), "rpm", recRPM * 0.02,
        "Nearest stable lobe"),
      max_stable_doc: mkAv(r2(maxStableDoc), "mm", maxStableDoc * 0.2, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const machineVibrationEngine = new MachineVibrationEngine();
