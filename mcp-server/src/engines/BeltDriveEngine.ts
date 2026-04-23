/**
 * BeltDriveEngine — V-Belt & Timing Belt Drive Calculator
 *
 * Models: Belt selection, tension, service life, pulley sizing.
 * - Speed ratio from pulley diameters
 * - Belt length from center distance & pulley sizes
 * - Power capacity per belt (HP rating method)
 * - Number of belts required
 * - Belt tension (tight/slack side)
 * - Service life estimation
 *
 * Key physics: Speed ratio i = D2/D1. Belt length L = 2C + π(D1+D2)/2 + (D2-D1)²/(4C).
 * Power per belt from manufacturer tables, derated by arc-of-contact and service factor.
 * Tension: T_tight/T_slack = e^(μθ) (Euler-Eytelwein).
 *
 * Reference: Gates Belt Design Manual, ANSI/RMA IP-20,
 *            Shigley Ch.17 (Flexible Mechanical Elements)
 *
 * Actions: belt_drive_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface BeltDriveInput {
  power_kw?: number;
  driver_rpm?: number;
  driven_rpm?: number;
  driver_pulley_mm?: number;
  driven_pulley_mm?: number;
  center_distance_mm?: number;
  belt_type?: "v_belt_A" | "v_belt_B" | "v_belt_C" | "timing_HTD_5M" | "timing_HTD_8M";
  friction_coeff?: number;
  service_factor?: number;
  desired_life_hours?: number;
  environment?: "clean" | "dusty" | "oily" | "high_temp";
}

export interface BeltDriveResult {
  speed_ratio: AtomicValue;
  belt_length: AtomicValue;
  belt_speed: AtomicValue;
  arc_of_contact_deg: AtomicValue;
  arc_correction: AtomicValue;
  power_per_belt: AtomicValue;
  num_belts: AtomicValue;
  tight_side_tension: AtomicValue;
  slack_side_tension: AtomicValue;
  estimated_life_hours: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Power rating per belt (kW) at 1750 RPM for small pulley [belt_type, small_dia_mm, kW] */
const POWER_RATINGS: Record<string, [number, number][]> = {
  v_belt_A: [[75, 0.7], [100, 1.2], [125, 1.7], [150, 2.1], [200, 2.8]],
  v_belt_B: [[125, 2.5], [150, 3.5], [175, 4.3], [200, 5.0], [250, 6.2]],
  v_belt_C: [[200, 6.0], [250, 8.5], [300, 10.5], [350, 12.0], [400, 13.5]],
  timing_HTD_5M: [[30, 0.8], [40, 1.5], [60, 2.8], [80, 4.0], [100, 5.5]],
  timing_HTD_8M: [[40, 2.5], [60, 5.0], [80, 7.5], [100, 10.0], [120, 12.5]],
};

function interpolatePower(table: [number, number][], dia: number, rpm: number): number {
  // Linearly interpolate diameter, then scale by RPM ratio
  let kw = table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (dia <= table[i][0]) {
      const frac = (dia - table[i - 1][0]) / (table[i][0] - table[i - 1][0]);
      kw = table[i - 1][1] + frac * (table[i][1] - table[i - 1][1]);
      break;
    }
    kw = table[i][1];
  }
  // Scale by RPM (linear approximation from 1750 base)
  return kw * (rpm / 1750);
}

// ── Engine ─────────────────────────────────────────────────────────

export class BeltDriveEngine {
  calculate(input: BeltDriveInput): BeltDriveResult {
    const warnings: string[] = [];
    const P = input.power_kw ?? 5;
    const n1 = input.driver_rpm ?? 1750;
    const beltType = input.belt_type ?? "v_belt_B";
    const mu = input.friction_coeff ?? 0.35;
    const sf = input.service_factor ?? 1.3;

    // Pulley sizing
    const D1 = input.driver_pulley_mm ?? 150;
    let D2: number;
    if (input.driven_pulley_mm) {
      D2 = input.driven_pulley_mm;
    } else if (input.driven_rpm) {
      D2 = D1 * (n1 / input.driven_rpm);
    } else {
      D2 = D1 * 2; // default 2:1 reduction
    }

    const ratio = D2 / D1;
    const n2 = n1 / ratio;

    // Center distance (default ~1.5× sum of diameters)
    const C = input.center_distance_mm ?? (D1 + D2) * 0.75;

    // Belt length: L = 2C + π(D1+D2)/2 + (D2-D1)²/(4C)
    const beltLen = 2 * C + Math.PI * (D1 + D2) / 2 + (D2 - D1) ** 2 / (4 * C);

    // Belt speed: v = π × D1 × n1 / 60000 (m/s)
    const beltSpeed = Math.PI * D1 * n1 / 60000;

    // Arc of contact on small pulley
    const arcRad = Math.PI - (D2 - D1) / (2 * C);
    const arcDeg = arcRad * 180 / Math.PI;

    // Arc correction factor (1.0 at 180°, decreases below)
    const arcCorr = Math.min(1.0, arcDeg / 180);

    // Power per belt
    const table = POWER_RATINGS[beltType] ?? POWER_RATINGS.v_belt_B;
    const powerPerBelt = interpolatePower(table, D1, n1) * arcCorr;

    // Design power = P × service_factor
    const designPower = P * sf;

    // Number of belts
    const numBelts = Math.max(1, Math.ceil(designPower / Math.max(powerPerBelt, 0.01)));

    // Tension: Euler-Eytelwein
    // T_tight - T_slack = P_total × 1000 / v
    // T_tight / T_slack = e^(μθ)
    const emu = Math.exp(mu * arcRad);
    const netTension = designPower * 1000 / Math.max(beltSpeed, 0.1); // N
    const tSlack = netTension / (emu - 1);
    const tTight = tSlack * emu;

    // Life estimation (simplified: base 25000h, derated)
    let lifeBase = 25000;
    const loadRatio = designPower / (numBelts * Math.max(powerPerBelt, 0.01));
    // Life ~ (1/loadRatio)^3 relationship
    lifeBase *= Math.pow(1 / Math.min(loadRatio, 1.0), 3);
    // Environment derating
    const envFactor: Record<string, number> = {
      clean: 1.0, dusty: 0.7, oily: 0.6, high_temp: 0.5,
    };
    lifeBase *= envFactor[input.environment ?? "clean"] ?? 1.0;
    lifeBase = Math.min(lifeBase, 50000); // cap

    // Warnings
    if (beltSpeed > 30) {
      warnings.push(`Belt speed ${r1(beltSpeed)} m/s exceeds 30 m/s — consider timing belt`);
    }
    if (beltSpeed < 5) {
      warnings.push(`Belt speed ${r1(beltSpeed)} m/s is low — verify tension for grip`);
    }
    if (arcDeg < 120) {
      warnings.push(`Arc of contact ${r0(arcDeg)}° < 120° — use idler pulley to increase wrap`);
    }
    if (ratio > 8) {
      warnings.push(`Speed ratio ${r1(ratio)} > 8:1 — use two-stage drive`);
    }
    if (numBelts > 10) {
      warnings.push(`${numBelts} belts required — consider larger belt cross-section`);
    }

    const src = "BeltDriveEngine (Gates/RMA IP-20)";

    return {
      speed_ratio: mkAv(r2(ratio), ":1", 0.01, `D2/D1 = ${r0(D2)}/${r0(D1)}`),
      belt_length: mkAv(r1(beltLen), "mm", 10, src),
      belt_speed: mkAv(r2(beltSpeed), "m/s", 0.1, `π×${r0(D1)}×${n1}/60000`),
      arc_of_contact_deg: mkAv(r1(arcDeg), "°", 2, `On ${r0(D1)}mm pulley`),
      arc_correction: mkAv(r2(arcCorr), "factor", 0.02, `${r1(arcDeg)}°/180°`),
      power_per_belt: mkAv(r2(powerPerBelt), "kW", 0.1, `${beltType} at ${n1} RPM`),
      num_belts: mkAv(numBelts, "belts", 0, `${r1(designPower)}kW / ${r2(powerPerBelt)}kW`),
      tight_side_tension: mkAv(r0(tTight), "N", 20, `Euler e^(${mu}×${r2(arcRad)})`),
      slack_side_tension: mkAv(r0(tSlack), "N", 10, `T_tight / e^μθ`),
      estimated_life_hours: mkAv(r0(lifeBase), "hours", 2000, src),
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

export const beltDriveEngine = new BeltDriveEngine();
