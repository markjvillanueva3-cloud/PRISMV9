/**
 * VibrationIsolationEngine — Vibration Isolator Design Calculator
 *
 * Models: Passive vibration isolation mounts.
 * - Transmissibility from frequency ratio
 * - Natural frequency from stiffness and mass
 * - Required static deflection
 * - Isolation efficiency percentage
 * - Damped vs undamped transmissibility
 * - Multi-mount system sizing
 *
 * Key physics: fn = (1/2π)√(k/m). r = f/fn.
 * T = √(1+(2ζr)²) / √((1-r²)²+(2ζr)²).
 * Isolation begins when r > √2.
 *
 * Reference: Harris — Shock and Vibration Handbook,
 *            DIN 4150 — Structural Vibration,
 *            ISO 2631 — Human Vibration
 *
 * Actions: vibration_isolation_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface VibrationIsolationInput {
  machine_mass_kg?: number;
  disturbing_frequency_hz?: number;
  num_mounts?: number;
  mount_stiffness_n_mm?: number;
  damping_ratio?: number;
  required_isolation_pct?: number;
  disturbing_force_n?: number;
  mount_type?: "rubber" | "spring" | "air" | "wire_rope";
}

export interface VibrationIsolationResult {
  natural_frequency: AtomicValue;
  frequency_ratio: AtomicValue;
  transmissibility: AtomicValue;
  isolation_efficiency: AtomicValue;
  static_deflection: AtomicValue;
  transmitted_force: AtomicValue;
  required_stiffness: AtomicValue;
  mount_load: AtomicValue;
  resonance_amplification: AtomicValue;
  isolation_zone: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Typical damping ratio by mount type */
const MOUNT_ZETA: Record<string, number> = {
  rubber: 0.05, spring: 0.01, air: 0.03, wire_rope: 0.12,
};

// ── Engine ─────────────────────────────────────────────────────────

export class VibrationIsolationEngine {
  calculate(input: VibrationIsolationInput): VibrationIsolationResult {
    const warnings: string[] = [];
    const mass = input.machine_mass_kg ?? 500;
    const fDist = input.disturbing_frequency_hz ?? 30;
    const nMounts = input.num_mounts ?? 4;
    const mountType = input.mount_type ?? "rubber";
    const zeta = input.damping_ratio
      ?? MOUNT_ZETA[mountType] ?? 0.05;
    const reqIso = input.required_isolation_pct ?? 90;
    const Fdist = input.disturbing_force_n ?? 1000;

    // Mount stiffness
    const kMount = input.mount_stiffness_n_mm
      ?? mass * 9.81 / (nMounts * 3); // ~3mm static deflection
    const kTotal = kMount * nMounts; // N/mm

    // Natural frequency
    const fn = (1 / (2 * Math.PI))
      * Math.sqrt(kTotal * 1000 / mass); // Hz (k in N/m)

    // Frequency ratio
    const r = fDist / Math.max(fn, 0.01);

    // Transmissibility
    const r2 = r * r;
    const zr2 = Math.pow(2 * zeta * r, 2);
    const T = Math.sqrt((1 + zr2)
      / (Math.pow(1 - r2, 2) + zr2));

    // Isolation efficiency
    const isoEff = Math.max(0, (1 - T) * 100);

    // Static deflection
    const deltaStatic = mass * 9.81 / (kTotal);

    // Transmitted force
    const Ftrans = Fdist * T;

    // Required stiffness for target isolation
    // For undamped: T = 1/(r²-1) → r² = 1+1/T
    const Treq = 1 - reqIso / 100;
    const rReq = Treq > 0
      ? Math.sqrt(1 + 1 / Treq)
      : 10;
    const fnReq = fDist / rReq;
    const kReq = mass * Math.pow(2 * Math.PI * fnReq, 2)
      / (nMounts * 1000); // N/mm per mount

    // Mount load
    const mountLoad = mass * 9.81 / nMounts;

    // Resonance amplification
    const Qfactor = 1 / (2 * zeta);

    // Isolation zone
    let zone: string;
    if (r < 1) zone = "amplification";
    else if (r < Math.sqrt(2)) zone = "transition";
    else zone = "isolation";

    // Warnings
    if (r < Math.sqrt(2)) {
      warnings.push(
        `Frequency ratio ${r1(r)} < √2 — NOT isolating`
      );
    }
    if (r > 0.8 && r < 1.2) {
      warnings.push(
        `Near resonance (r=${r1(r)}) — amplification Q=${r0(Qfactor)}×`
      );
    }
    if (isoEff < reqIso) {
      warnings.push(
        `Isolation ${r0(isoEff)}% < required ${reqIso}%`
      );
    }
    if (deltaStatic > 25) {
      warnings.push(
        `Static deflection ${r1(deltaStatic)}mm > 25mm — stability risk`
      );
    }
    if (mountType === "rubber" && deltaStatic > 10) {
      warnings.push("Rubber mount > 10mm deflection — use springs");
    }
    if (fn < 1) {
      warnings.push(
        `fn=${r1(fn)}Hz very low — air springs recommended`
      );
    }

    const src = "VibrationIsolationEngine (Harris/ISO 2631)";

    return {
      natural_frequency: mkAv(r1(fn), "Hz",
        fn * 0.05, `(1/2π)√(k/m)`),
      frequency_ratio: mkAv(r2f(r), "×", 0,
        `f_dist/fn`),
      transmissibility: mkAv(r3(T), "×",
        T * 0.1, "damped SDOF"),
      isolation_efficiency: mkAv(r0(isoEff), "%",
        isoEff * 0.05, `(1-T)×100`),
      static_deflection: mkAv(r1(deltaStatic), "mm",
        deltaStatic * 0.05, `mg/k`),
      transmitted_force: mkAv(r0(Ftrans), "N",
        Ftrans * 0.1, `F×T`),
      required_stiffness: mkAv(r0(kReq), "N/mm",
        kReq * 0.1, `for ${reqIso}% isolation`),
      mount_load: mkAv(r0(mountLoad), "N", 0,
        `mg/${nMounts}`),
      resonance_amplification: mkAv(r0(Qfactor), "×",
        Qfactor * 0.1, `1/(2ζ)`),
      isolation_zone: mkAv(
        zone === "isolation" ? 1
          : zone === "transition" ? 2 : 3,
        zone, 0, src),
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
function r2f(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const vibrationIsolationEngine = new VibrationIsolationEngine();
