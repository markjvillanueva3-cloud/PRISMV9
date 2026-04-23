/**
 * PlanetaryGearEngine — Epicyclic gear train analysis
 *
 * Models: Willis equation (gear ratio), torque split across planets,
 *         tooth bending/contact stress (AGMA 2001), efficiency estimation
 * References: AGMA 6123, Muller (1982) epicyclic gear trains
 * Safety: Tooth stress limits, planet load sharing
 */

// ─── Types ─────────────────────────────────────────────────────────

export type PlanetaryConfig = "simple" | "compound" | "differential";

export interface PlanetaryGearInput {
  sun_teeth: number;
  ring_teeth: number;
  num_planets: number;
  input_speed_rpm: number;
  input_torque_Nm: number;
  module_mm?: number;                       // default 2
  config?: PlanetaryConfig;                 // default simple
  fixed_member?: "ring" | "sun" | "carrier"; // default ring
  face_width_mm?: number;                   // default 20
  material_hardness_HRC?: number;           // default 58
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface PlanetaryGearResult {
  gear_ratio: AtomicValue;
  output_speed_rpm: AtomicValue;
  output_torque_Nm: AtomicValue;
  planet_teeth: AtomicValue;
  efficiency_pct: AtomicValue;
  tooth_bending_stress_MPa: AtomicValue;
  contact_stress_MPa: AtomicValue;
  planet_bearing_load_N: AtomicValue;
  center_distance_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(value: number, unit: string, unc: number, source: string, warning?: string): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class PlanetaryGearEngine {
  calculate(input: PlanetaryGearInput): PlanetaryGearResult {
    const {
      sun_teeth: Zs,
      ring_teeth: Zr,
      num_planets: Np,
      input_speed_rpm: Nin,
      input_torque_Nm: Tin,
      module_mm: m = 2,
      config = "simple",
      fixed_member: fixed = "ring",
      face_width_mm: b = 20,
      material_hardness_HRC: hrc = 58,
    } = input;

    const recs: string[] = [];

    // Planet teeth: Zp = (Zr - Zs) / 2
    const Zp = (Zr - Zs) / 2;

    // Assembly condition: (Zs + Zr) must be divisible by Np
    const assemblyOk = (Zs + Zr) % Np === 0;

    // Gear ratio (Willis equation for simple planetary)
    let ratio: number;
    if (fixed === "ring") {
      ratio = 1 + Zr / Zs; // carrier output
    } else if (fixed === "carrier") {
      ratio = -Zr / Zs;    // ring output (reversed)
    } else {
      ratio = 1 / (1 + Zs / Zr); // sun fixed, carrier input
    }

    const outputSpeed = Nin / Math.abs(ratio);
    const eta = Math.pow(0.97, 2); // ~2 mesh losses per path
    const outputTorque = Tin * Math.abs(ratio) * eta;

    // Center distance
    const cd = m * (Zs + Zp) / 2;

    // Tooth stress (simplified AGMA)
    // Bending: σ_b = Ft / (m × b × Y), Y ≈ 0.35 for Zp
    const Ft = Tin * 1000 / (m * Zs / 2); // tangential force on sun, N
    const FtPerPlanet = Ft / Np;
    const Y = 0.30 + 0.004 * Math.min(Zp, 50);
    const sigmaBend = FtPerPlanet / (m * b * Y);

    // Contact stress: σ_H = ZE × √(Ft × KH / (b × d × ZI))
    // Simplified
    const ZE = 190; // steel-steel elastic factor
    const d_sun = m * Zs;
    const d_planet = m * Zp;
    const rho = (d_sun * d_planet) / (2 * (d_sun + d_planet)); // equivalent radius
    const sigmaContact = ZE * Math.sqrt(FtPerPlanet / (b * rho));

    // Planet bearing load
    const bearingLoad = FtPerPlanet * 1.4; // combined radial + tangential

    // Allowable stresses (based on hardness)
    const allowBend = 250 + hrc * 8;    // MPa
    const allowContact = 800 + hrc * 15; // MPa
    const sfBend = allowBend / Math.max(sigmaBend, 1);
    const sfContact = allowContact / Math.max(sigmaContact, 1);

    const isSafe = sfBend >= 1.5 && sfContact >= 1.2 && assemblyOk;

    if (!assemblyOk) {
      recs.push(`Assembly condition failed: (Zs+Zr)=${Zs + Zr} not divisible by Np=${Np}`);
    }
    if (Zp < 15) {
      recs.push(`Planet teeth ${Zp} — risk of undercutting. Use Zp ≥ 17 or profile shift`);
    }
    if (sfBend < 2.0) {
      recs.push(`Bending SF=${sfBend.toFixed(2)} — increase module or face width`);
    }
    if (sfContact < 1.5) {
      recs.push(`Contact SF=${sfContact.toFixed(2)} — increase hardness or face width`);
    }
    if (Np < 3) {
      recs.push(`${Np} planets — use ≥3 for balanced radial loads`);
    }
    if (recs.length === 0) {
      recs.push(`Planetary set nominal — ratio ${Math.abs(ratio).toFixed(2)}:1, ${Np} planets, SF_bend=${sfBend.toFixed(1)}`);
    }

    return {
      gear_ratio: mkAv(Math.round(Math.abs(ratio) * 100) / 100, "ratio", Math.abs(ratio) * 0.02, "willis_equation"),
      output_speed_rpm: mkAv(Math.round(outputSpeed * 10) / 10, "rpm", outputSpeed * 0.02, "ratio_kinematics"),
      output_torque_Nm: mkAv(Math.round(outputTorque * 10) / 10, "Nm", outputTorque * 0.05, "torque_ratio"),
      planet_teeth: mkAv(Zp, "teeth", 0, "geometry"),
      efficiency_pct: mkAv(Math.round(eta * 1000) / 10, "%", eta * 2, "mesh_loss_model"),
      tooth_bending_stress_MPa: mkAv(Math.round(sigmaBend * 10) / 10, "MPa", sigmaBend * 0.15, "agma_simplified"),
      contact_stress_MPa: mkAv(Math.round(sigmaContact * 10) / 10, "MPa", sigmaContact * 0.12, "hertz_contact"),
      planet_bearing_load_N: mkAv(Math.round(bearingLoad), "N", bearingLoad * 0.10, "force_balance"),
      center_distance_mm: mkAv(Math.round(cd * 10) / 10, "mm", 0, "geometry"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const planetaryGearEngine = new PlanetaryGearEngine();
