/**
 * ChainDriveEngine — Roller Chain Drive Selection Calculator
 *
 * Models: ANSI roller chain drive sizing and analysis.
 * - Chain pitch selection from power rating tables
 * - Sprocket tooth count and ratio
 * - Chain speed and centrifugal tension
 * - Service factor by application
 * - Chain length in pitches
 * - Wear elongation and life estimation
 *
 * Key physics: P_design = P × SF. v = p×N×n/12000 (m/s).
 * T_centrifugal = w×v². L = 2C/p + (N1+N2)/2 + p(N2-N1)²/(4π²C).
 *
 * Reference: ASME B29.1 — Roller Chains,
 *            Renold Chain Design Guide,
 *            Machinery's Handbook — Chain Drives
 *
 * Actions: chain_drive_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ChainDriveInput {
  power_kw?: number;
  driver_rpm?: number;
  driven_rpm?: number;
  application?: "smooth" | "moderate_shock" | "heavy_shock";
  center_distance_mm?: number;
  chain_pitch?: "6.35" | "9.525" | "12.7" | "15.875" | "19.05" | "25.4";
  num_strands?: 1 | 2 | 3;
  lubrication?: "manual" | "drip" | "bath" | "forced";
}

export interface ChainDriveResult {
  speed_ratio: AtomicValue;
  driver_teeth: AtomicValue;
  driven_teeth: AtomicValue;
  chain_speed: AtomicValue;
  design_power: AtomicValue;
  chain_tension: AtomicValue;
  chain_length_pitches: AtomicValue;
  chain_length_mm: AtomicValue;
  estimated_life: AtomicValue;
  recommended_pitch: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const SERVICE_FACTORS: Record<string, number> = {
  smooth: 1.0, moderate_shock: 1.3, heavy_shock: 1.5,
};

/** Power rating per strand at 1000rpm (kW) by pitch (mm) */
const POWER_RATING: Record<string, number> = {
  "6.35": 0.5, "9.525": 1.8, "12.7": 4.5, "15.875": 9.0,
  "19.05": 15, "25.4": 30,
};

/** Chain weight per meter (kg/m) by pitch */
const CHAIN_WEIGHT: Record<string, number> = {
  "6.35": 0.15, "9.525": 0.35, "12.7": 0.7, "15.875": 1.1,
  "19.05": 1.7, "25.4": 3.0,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ChainDriveEngine {
  calculate(input: ChainDriveInput): ChainDriveResult {
    const warnings: string[] = [];
    const P = input.power_kw ?? 5;
    const n1 = input.driver_rpm ?? 1000;
    const n2 = input.driven_rpm ?? 500;
    const app = input.application ?? "moderate_shock";
    const strands = input.num_strands ?? 1;
    const lub = input.lubrication ?? "drip";

    const SF = SERVICE_FACTORS[app] ?? 1.3;
    const Pd = P * SF;

    // Speed ratio
    const ratio = n1 / Math.max(n2, 1);

    // Select chain pitch if not specified
    let pitch: number;
    if (input.chain_pitch) {
      pitch = parseFloat(input.chain_pitch);
    } else {
      // Find smallest pitch that handles the power
      pitch = 25.4; // default largest
      const pitches = [6.35, 9.525, 12.7, 15.875, 19.05, 25.4];
      for (const p of pitches) {
        const rpmFactor = Math.pow(1000 / Math.max(n1, 100), 0.35);
        const rating = (POWER_RATING[String(p)] ?? 1) * strands * rpmFactor;
        if (rating >= Pd) {
          pitch = p;
          break;
        }
      }
    }

    // Sprocket teeth (min 17 for smooth operation)
    const N1 = Math.max(17, Math.round(21 / Math.pow(ratio, 0.25)));
    const N2 = Math.round(N1 * ratio);

    // Chain speed (m/s)
    const v = pitch / 1000 * N1 * n1 / 60;

    // Chain tension (N)
    const T = v > 0 ? P * 1000 / v : 0;

    // Centrifugal tension
    const w = CHAIN_WEIGHT[String(pitch)] ?? 1.0;
    const Tc = w * v * v;

    const totalTension = T + Tc;

    // Center distance
    const C = input.center_distance_mm ?? pitch * 40;

    // Chain length in pitches
    const Cp = C / pitch;
    const Lp = 2 * Cp + (N1 + N2) / 2 +
      pitch * Math.pow(N2 - N1, 2) / (4 * Math.PI * Math.PI * C);
    const Lpitch = Math.ceil(Lp / 2) * 2; // round to even
    const Lmm = Lpitch * pitch;

    // Life estimation (hours)
    // Simplified: life ∝ (breaking_strength / tension)³
    const breakStr = pitch * pitch * 10; // rough N
    const lifeRatio = Math.pow(breakStr / Math.max(totalTension, 1), 3);
    let life = Math.min(30000, lifeRatio * 1000);
    if (lub === "manual") life *= 0.3;
    if (lub === "drip") life *= 0.6;
    if (lub === "forced") life *= 1.3;

    // Warnings
    if (v > 25) {
      warnings.push(`Chain speed ${r1(v)}m/s > 25m/s — use toothed belt instead`);
    }
    if (N1 < 17) {
      warnings.push(`Driver sprocket ${N1}T < 17 — chordal action and noise`);
    }
    if (N2 > 120) {
      warnings.push(`Driven sprocket ${N2}T > 120 — chain may skip teeth`);
    }
    if (lub === "manual" && v > 4) {
      warnings.push("Manual lubrication inadequate at this speed — use drip or bath");
    }
    if (Tc > T * 0.3) {
      warnings.push(`Centrifugal tension ${r0(Tc)}N significant — reduce speed or use lighter chain`);
    }

    const src = "ChainDriveEngine (ASME B29.1/Renold)";

    return {
      speed_ratio: mkAv(r2(ratio), ":1", ratio * 0.02, `${n1}/${n2}rpm`),
      driver_teeth: mkAv(N1, "teeth", 0, `Min 17, ratio-adjusted`),
      driven_teeth: mkAv(N2, "teeth", 0, `${N1}×${r2(ratio)}`),
      chain_speed: mkAv(r1(v), "m/s", v * 0.02, `p×N1×n1/60`),
      design_power: mkAv(r2(Pd), "kW", Pd * 0.05, `${P}×${SF}`),
      chain_tension: mkAv(r0(totalTension), "N", totalTension * 0.05,
        `P/v + centrifugal`),
      chain_length_pitches: mkAv(Lpitch, "pitches", 0, src),
      chain_length_mm: mkAv(r0(Lmm), "mm", Lmm * 0.01, `${Lpitch}×${pitch}mm`),
      estimated_life: mkAv(r0(life), "hours", life * 0.3, `${lub} lubrication`),
      recommended_pitch: mkAv(pitch, "mm", 0, `ANSI for ${r2(Pd)}kW`),
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

export const chainDriveEngine = new ChainDriveEngine();
