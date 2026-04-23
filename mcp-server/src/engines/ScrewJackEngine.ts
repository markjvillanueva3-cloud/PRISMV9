/**
 * ScrewJackEngine — Power Screw / Screw Jack Calculator
 *
 * Models: Square and ACME thread power screws.
 * - Torque to raise and lower load
 * - Efficiency from thread geometry and friction
 * - Self-locking condition
 * - Collar friction torque
 * - Critical buckling load
 * - Screw body stress (combined)
 *
 * Key physics: T_raise = Fd_m/2 × (l+πμd_m)/(πd_m-μl).
 * η = tan(λ)/tan(λ+φ). Self-lock when λ < φ.
 *
 * Reference: Shigley — Mechanical Engineering Design,
 *            DIN 103 — Trapezoidal Threads,
 *            ASME B1.5 — ACME Threads
 *
 * Actions: screw_jack_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ScrewJackInput {
  thread_type?: "square" | "acme" | "trapezoidal";
  major_diameter_mm?: number;
  pitch_mm?: number;
  num_starts?: number;
  load_n?: number;
  screw_length_mm?: number;
  thread_friction?: number;
  collar_friction?: number;
  collar_diameter_mm?: number;
  end_condition?: "fixed_free" | "fixed_pinned"
    | "fixed_fixed" | "pinned_pinned";
}

export interface ScrewJackResult {
  torque_raise: AtomicValue;
  torque_lower: AtomicValue;
  efficiency: AtomicValue;
  self_locking: AtomicValue;
  lead_angle: AtomicValue;
  collar_torque: AtomicValue;
  total_torque: AtomicValue;
  screw_stress: AtomicValue;
  buckling_load: AtomicValue;
  buckling_sf: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Thread half-angle (deg) for friction adjustment */
const THREAD_HALF_ANGLE: Record<string, number> = {
  square: 0, acme: 14.5, trapezoidal: 15,
};

/** Euler end-condition K factor */
const END_K: Record<string, number> = {
  fixed_free: 2.0, fixed_pinned: 0.707,
  fixed_fixed: 0.5, pinned_pinned: 1.0,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ScrewJackEngine {
  calculate(input: ScrewJackInput): ScrewJackResult {
    const warnings: string[] = [];
    const tType = input.thread_type ?? "acme";
    const d = input.major_diameter_mm ?? 40;
    const p = input.pitch_mm ?? 6;
    const nStarts = input.num_starts ?? 1;
    const W = input.load_n ?? 50000;
    const Lscrew = input.screw_length_mm ?? 500;
    const muT = input.thread_friction ?? 0.15;
    const muC = input.collar_friction ?? 0.12;
    const dc = input.collar_diameter_mm ?? d * 1.5;
    const endCond = input.end_condition ?? "fixed_free";

    // Thread geometry
    const l = p * nStarts; // lead
    const dm = d - p / 2; // mean diameter
    const alphaDeg = THREAD_HALF_ANGLE[tType] ?? 14.5;
    const alphaRad = alphaDeg * Math.PI / 180;

    // Adjusted friction for thread angle
    const muAdj = alphaRad > 0
      ? muT / Math.cos(alphaRad)
      : muT;

    // Lead angle
    const lambda = Math.atan(l / (Math.PI * dm));
    const lambdaDeg = lambda * 180 / Math.PI;

    // Friction angle
    const phi = Math.atan(muAdj);

    // Torque to raise
    const Traise = W * dm / 2
      * (l + Math.PI * muAdj * dm)
      / (Math.PI * dm - muAdj * l); // N·mm

    // Torque to lower
    const Tlower = W * dm / 2
      * (Math.PI * muAdj * dm - l)
      / (Math.PI * dm + muAdj * l); // N·mm

    // Collar torque
    const Tcollar = muC * W * dc / 2; // N·mm

    // Total torque
    const Ttotal = Traise + Tcollar;

    // Efficiency
    const eta = W * l / (2 * Math.PI * Ttotal);

    // Self-locking
    const selfLock = lambda < phi;

    // Screw body stress
    const Aroot = Math.PI / 4
      * Math.pow(d - 1.2 * p, 2);
    const sigAxial = W / Aroot;
    const J = Math.PI / 32
      * Math.pow(d - 1.2 * p, 4);
    const tauTorsion = Ttotal * (d - 1.2 * p) / 2 / J;
    const sigVm = Math.sqrt(
      sigAxial * sigAxial + 3 * tauTorsion * tauTorsion
    );

    // Buckling (Euler)
    const E = 200000; // MPa
    const Kend = END_K[endCond] ?? 2.0;
    const Imin = Math.PI / 64
      * Math.pow(d - 1.2 * p, 4);
    const Pcr = Math.PI * Math.PI * E * Imin
      / Math.pow(Kend * Lscrew, 2);
    const buckSF = Pcr / Math.max(W, 1);

    // Warnings
    if (!selfLock) {
      warnings.push(
        "NOT self-locking — load will back-drive without brake"
      );
    }
    if (eta < 0.2) {
      warnings.push(
        `Efficiency ${r0(eta * 100)}% < 20% — high friction losses`
      );
    }
    if (buckSF < 3) {
      warnings.push(
        `Buckling SF ${r1(buckSF)} < 3 — increase diameter`
      );
    }
    if (sigVm > 200) {
      warnings.push(
        `Von Mises stress ${r0(sigVm)} MPa — check yield`
      );
    }
    if (Tlower < 0) {
      warnings.push(
        "Negative lower torque — screw will overhaul (back-drive)"
      );
    }
    if (lambdaDeg > 25) {
      warnings.push(
        `Lead angle ${r1(lambdaDeg)}° > 25° — unusual geometry`
      );
    }

    const src = "ScrewJackEngine (Shigley/DIN 103)";

    return {
      torque_raise: mkAv(r0(Traise / 1000), "N·m",
        Traise / 1000 * 0.05, `W×dm/2×(l+πμdm)/...`),
      torque_lower: mkAv(r0(Math.abs(Tlower) / 1000), "N·m",
        Math.abs(Tlower) / 1000 * 0.05, "lower formula"),
      efficiency: mkAv(r0(eta * 100), "%",
        eta * 100 * 0.05, `Wl/(2πT)`),
      self_locking: mkAv(selfLock ? 1 : 0,
        selfLock ? "YES" : "NO", 0,
        `λ=${r1(lambdaDeg)}° φ=${r1(phi * 180 / Math.PI)}°`),
      lead_angle: mkAv(r1(lambdaDeg), "°",
        lambdaDeg * 0.02, `atan(l/πdm)`),
      collar_torque: mkAv(r0(Tcollar / 1000), "N·m",
        Tcollar / 1000 * 0.1, `μc×W×dc/2`),
      total_torque: mkAv(r0(Ttotal / 1000), "N·m",
        Ttotal / 1000 * 0.05, "raise + collar"),
      screw_stress: mkAv(r0(sigVm), "MPa",
        sigVm * 0.1, "von Mises"),
      buckling_load: mkAv(r0(Pcr), "N",
        Pcr * 0.1, `Euler K=${Kend}`),
      buckling_sf: mkAv(r1(buckSF), "×",
        buckSF * 0.1, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }

export const screwJackEngine = new ScrewJackEngine();
