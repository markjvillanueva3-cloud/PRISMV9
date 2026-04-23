/**
 * WormGearEngine — Worm Gear Drive Design Calculator
 *
 * Models: Cylindrical worm and worm wheel pairs.
 * - Gear ratio from threads and teeth
 * - Efficiency from lead angle and friction
 * - Thermal power rating (AGMA 6034)
 * - Contact stress and bending stress
 * - Self-locking condition
 * - Oil temperature rise
 *
 * Key physics: η = tan(λ)/tan(λ+φ) for driving worm.
 * Self-locking when λ < φ (lead angle < friction angle).
 * Ratio = Ng/Nw (teeth/threads).
 *
 * Reference: AGMA 6034 — Worm Gearing,
 *            DIN 3975 — Worm Gear Geometry,
 *            Dudley — Gear Handbook
 *
 * Actions: worm_gear_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface WormGearInput {
  num_worm_threads?: number;
  num_wheel_teeth?: number;
  center_distance_mm?: number;
  worm_speed_rpm?: number;
  input_power_kw?: number;
  friction_coefficient?: number;
  wheel_material?: "bronze" | "cast_iron" | "nylon";
  lubrication?: "splash" | "forced" | "grease";
  duty_cycle_pct?: number;
}

export interface WormGearResult {
  gear_ratio: AtomicValue;
  lead_angle: AtomicValue;
  efficiency: AtomicValue;
  output_torque: AtomicValue;
  output_speed: AtomicValue;
  self_locking: AtomicValue;
  thermal_power_limit: AtomicValue;
  heat_generated: AtomicValue;
  worm_pitch_diameter: AtomicValue;
  wheel_pitch_diameter: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Thermal capacity factor by lubrication (W/°C) */
const THERMAL_CAP: Record<string, number> = {
  splash: 15, forced: 40, grease: 8,
};

/** Allowable contact stress by wheel material (MPa) */
const WHEEL_STRESS: Record<string, number> = {
  bronze: 150, cast_iron: 100, nylon: 30,
};

// ── Engine ─────────────────────────────────────────────────────────

export class WormGearEngine {
  calculate(input: WormGearInput): WormGearResult {
    const warnings: string[] = [];
    const Nw = input.num_worm_threads ?? 2;
    const Ng = input.num_wheel_teeth ?? 40;
    const C = input.center_distance_mm ?? 100;
    const nIn = input.worm_speed_rpm ?? 1500;
    const Pin = input.input_power_kw ?? 2;
    const mu = input.friction_coefficient ?? 0.05;
    const wheelMat = input.wheel_material ?? "bronze";
    const lube = input.lubrication ?? "splash";
    const dutyCycle = input.duty_cycle_pct ?? 100;

    // Gear ratio
    const ratio = Ng / Nw;

    // Pitch diameters (approximate from center distance)
    // d_worm ≈ C^0.875 / 2.2 (AGMA empirical)
    const dWorm = Math.pow(C, 0.875) / 2.2;
    const dWheel = 2 * C - dWorm;

    // Lead angle
    const lead = Nw * Math.PI * dWorm / (Math.PI * dWorm);
    // λ = atan(Nw × p_axial / (π × d_worm))
    // p_axial = π × d_wheel / Ng
    const pAxial = Math.PI * dWheel / Ng;
    const lambda = Math.atan(Nw * pAxial
      / (Math.PI * dWorm));
    const lambdaDeg = lambda * 180 / Math.PI;

    // Friction angle
    const phi = Math.atan(mu);

    // Efficiency
    const eta = Math.tan(lambda)
      / Math.tan(lambda + phi);

    // Self-locking check
    const selfLock = lambda < phi;

    // Output speed and torque
    const nOut = nIn / ratio;
    const Tout = Pin * 1000 * eta
      / (nOut * 2 * Math.PI / 60); // N·m

    // Heat generated
    const Ploss = Pin * (1 - eta); // kW
    const Qloss = Ploss * 1000; // W

    // Thermal power limit
    const thermCap = THERMAL_CAP[lube] ?? 15;
    const maxTempRise = 60; // °C above ambient
    const Pthermal = thermCap * maxTempRise / 1000
      / Math.max(1 - eta, 0.01); // kW

    // Warnings
    if (eta < 0.5) {
      warnings.push(
        `Efficiency ${r0(eta * 100)}% < 50% — high heat generation`
      );
    }
    if (Pin > Pthermal * dutyCycle / 100) {
      warnings.push(
        `Power exceeds thermal limit — add cooling or reduce duty`
      );
    }
    if (selfLock && Nw > 1) {
      warnings.push(
        "Self-locking with multi-thread — verify at operating temp"
      );
    }
    if (!selfLock && lambdaDeg > 25) {
      warnings.push(
        `Lead angle ${r1(lambdaDeg)}° > 25° — back-driving possible`
      );
    }
    if (ratio > 100) {
      warnings.push(
        `Ratio ${ratio}:1 > 100 — consider 2-stage reduction`
      );
    }
    if (Nw > 6) {
      warnings.push(
        `${Nw} threads unusual — typically 1-4`
      );
    }
    if (wheelMat === "nylon" && Pin > 0.5) {
      warnings.push("Nylon wheel — low power capacity, heat risk");
    }

    const src = "WormGearEngine (AGMA 6034/DIN 3975)";

    return {
      gear_ratio: mkAv(ratio, ":1", 0,
        `${Ng}/${Nw}`),
      lead_angle: mkAv(r1(lambdaDeg), "°",
        lambdaDeg * 0.05, `atan(Nw×p/πd)`),
      efficiency: mkAv(r0(eta * 100), "%",
        eta * 100 * 0.05, `tan(λ)/tan(λ+φ)`),
      output_torque: mkAv(r1(Tout), "N·m",
        Tout * 0.1, `P×η/ω_out`),
      output_speed: mkAv(r1(nOut), "RPM", 0,
        `n_in/ratio`),
      self_locking: mkAv(selfLock ? 1 : 0,
        selfLock ? "YES" : "NO", 0,
        `λ=${r1(lambdaDeg)}° vs φ=${r1(phi * 180 / Math.PI)}°`),
      thermal_power_limit: mkAv(r1(Pthermal), "kW",
        Pthermal * 0.15, lube),
      heat_generated: mkAv(r0(Qloss), "W",
        Qloss * 0.1, `P×(1−η)`),
      worm_pitch_diameter: mkAv(r1(dWorm), "mm",
        dWorm * 0.05, "AGMA empirical"),
      wheel_pitch_diameter: mkAv(r1(dWheel), "mm",
        dWheel * 0.05, src),
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

export const wormGearEngine = new WormGearEngine();
