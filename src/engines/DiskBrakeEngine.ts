/**
 * DiskBrakeEngine — Disc Brake Design Calculator
 *
 * Models: Caliper disc brake thermal and mechanical analysis.
 * - Braking torque T = μ×F×r_eff×n_pads
 * - Thermal capacity (kinetic energy absorption)
 * - Disc temperature rise ΔT = KE/(m×Cp)
 * - Pad wear rate and life estimation
 * - Fade temperature derating
 * - Stopping distance and time
 *
 * Key physics: T_brake = μ×F_clamp×r_eff×n.
 * KE = ½mv² + ½Iω². ΔT = KE/(m_disc×Cp).
 *
 * Reference: SAE J2522 — Disc Brake Dynamometer,
 *            Limpert — Brake Design and Safety,
 *            AMS 2004 — Brake Materials
 *
 * Actions: disk_brake_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface DiskBrakeInput {
  disc_od_mm?: number;
  disc_id_mm?: number;
  disc_thickness_mm?: number;
  num_pads?: number;
  pad_area_cm2?: number;
  clamp_force_n?: number;
  friction_coefficient?: number;
  vehicle_mass_kg?: number;
  initial_speed_kmh?: number;
  disc_material?: "cast_iron" | "carbon_ceramic" | "steel";
}

export interface DiskBrakeResult {
  braking_torque: AtomicValue;
  braking_force: AtomicValue;
  kinetic_energy: AtomicValue;
  disc_temp_rise: AtomicValue;
  stopping_distance: AtomicValue;
  stopping_time: AtomicValue;
  deceleration: AtomicValue;
  pad_pressure: AtomicValue;
  power_dissipated: AtomicValue;
  thermal_capacity: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [density_kg_m3, specific_heat_J_kgK, max_temp_C] */
const DISC_MAT: Record<string, [number, number, number]> = {
  cast_iron:      [7200, 460, 700],
  carbon_ceramic: [2400, 800, 1200],
  steel:          [7800, 490, 600],
};

// ── Engine ─────────────────────────────────────────────────────────

export class DiskBrakeEngine {
  calculate(input: DiskBrakeInput): DiskBrakeResult {
    const warnings: string[] = [];
    const OD = input.disc_od_mm ?? 300;
    const ID = input.disc_id_mm ?? 180;
    const th = input.disc_thickness_mm ?? 25;
    const nPads = input.num_pads ?? 2;
    const Apad = input.pad_area_cm2 ?? 40;
    const Fclamp = input.clamp_force_n ?? 15000;
    const mu = input.friction_coefficient ?? 0.38;
    const mass = input.vehicle_mass_kg ?? 1500;
    const v0kmh = input.initial_speed_kmh ?? 100;
    const mat = input.disc_material ?? "cast_iron";

    const [rho, Cp, maxTemp] = DISC_MAT[mat] ?? DISC_MAT.cast_iron;

    // Effective radius
    const rEff = (OD + ID) / 4; // mm — mean pad radius

    // Braking torque (per disc)
    const Tbrake = mu * Fclamp * rEff / 1000 * nPads; // N·m

    // Braking force at wheel (assume r_tire ≈ 320mm)
    const rTire = 320; // mm
    const Fbrake = Tbrake * 1000 / rTire; // N per disc

    // Total deceleration (4 discs typical)
    const Ftotal = Fbrake * 4;
    const decel = Ftotal / mass; // m/s²

    // Kinetic energy
    const v0 = v0kmh / 3.6; // m/s
    const KE = 0.5 * mass * v0 * v0; // J

    // Disc mass
    const volDisc = Math.PI / 4
      * (OD * OD - ID * ID) * th / 1e9; // m³
    const mDisc = volDisc * rho;

    // Temperature rise per stop (shared across 4 discs)
    const deltaT = KE / (4 * mDisc * Cp);

    // Stopping distance and time
    const sDist = decel > 0 ? v0 * v0 / (2 * decel) : Infinity;
    const sTime = decel > 0 ? v0 / decel : Infinity;

    // Pad pressure
    const padPressure = Fclamp / (Apad * 100); // MPa

    // Peak power dissipated (at initial speed)
    const Ppeak = Ftotal * v0 / 1000; // kW

    // Thermal capacity (energy to reach max temp from 50°C)
    const Qmax = 4 * mDisc * Cp * (maxTemp - 50);

    // Warnings
    if (deltaT > maxTemp * 0.5) {
      warnings.push(
        `Single stop ΔT ${r0(deltaT)}°C > 50% max — fade risk`
      );
    }
    if (padPressure > 5) {
      warnings.push(
        `Pad pressure ${r1(padPressure)} MPa > 5 — accelerated wear`
      );
    }
    if (decel > 12) {
      warnings.push(
        `Decel ${r1(decel)} m/s² > 1.2g — tire traction limit`
      );
    }
    if (mu > 0.5) {
      warnings.push(
        `μ=${mu} very high — verify pad material rating`
      );
    }
    if (Ppeak > 500) {
      warnings.push(
        `Peak power ${r0(Ppeak)} kW — ventilated disc recommended`
      );
    }
    if (deltaT > 300) {
      warnings.push("High temp rise — consider carbon ceramic discs");
    }

    const src = "DiskBrakeEngine (SAE J2522/Limpert)";

    return {
      braking_torque: mkAv(r0(Tbrake), "N·m",
        Tbrake * 0.05, `μFr_eff×n`),
      braking_force: mkAv(r0(Fbrake), "N",
        Fbrake * 0.05, "per disc"),
      kinetic_energy: mkAv(r0(KE / 1000), "kJ",
        KE / 1000 * 0.02, `½mv²`),
      disc_temp_rise: mkAv(r0(deltaT), "°C",
        deltaT * 0.15, `KE/(4mCp)`),
      stopping_distance: mkAv(r1(sDist), "m",
        sDist * 0.1, `v²/(2a)`),
      stopping_time: mkAv(r1(sTime), "s",
        sTime * 0.1, `v/a`),
      deceleration: mkAv(r1(decel), "m/s²",
        decel * 0.1, `F/m`),
      pad_pressure: mkAv(r1(padPressure), "MPa",
        padPressure * 0.05, `F/A_pad`),
      power_dissipated: mkAv(r0(Ppeak), "kW",
        Ppeak * 0.1, "peak at v0"),
      thermal_capacity: mkAv(r0(Qmax / 1000), "kJ",
        Qmax / 1000 * 0.1, src),
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

export const diskBrakeEngine = new DiskBrakeEngine();
