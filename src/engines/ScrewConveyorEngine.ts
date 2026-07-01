/**
 * ScrewConveyorEngine — Screw conveyor capacity, torque, and power
 *
 * Models: CEMA volumetric capacity, Hp = (CLWFm + CQFL)/1e6,
 *         screw diameter selection, critical speed
 * References: CEMA #350 Screw Conveyors, Martin Engineering
 * Safety: Trough loading limits, critical speed, shaft deflection
 */

export type ConveyorMaterial = "grain" | "cement" | "coal" | "sand"
  | "wood_chips" | "fly_ash" | "limestone";

export interface ScrewConveyorInput {
  capacity_tph: number;                // tonnes per hour
  length_m: number;
  inclination_deg?: number;            // default 0 (horizontal)
  material?: ConveyorMaterial;
  screw_diameter_mm?: number;          // auto-sized
  screw_speed_rpm?: number;            // auto-selected
  trough_loading_pct?: number;         // default 30%
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ScrewConveyorResult {
  screw_diameter_mm: AtomicValue;
  screw_speed_rpm: AtomicValue;
  drive_power_kW: AtomicValue;
  shaft_torque_Nm: AtomicValue;
  volumetric_capacity_m3_h: AtomicValue;
  critical_speed_rpm: AtomicValue;
  material_factor: AtomicValue;
  inclination_factor: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const MAT_PROPS: Record<ConveyorMaterial, {
  density_kg_m3: number; Fm: number; Ff: number; maxSpeed: number
}> = {
  grain:      { density_kg_m3: 770,  Fm: 1.0, Ff: 0.4, maxSpeed: 120 },
  cement:     { density_kg_m3: 1500, Fm: 2.0, Ff: 1.4, maxSpeed: 60 },
  coal:       { density_kg_m3: 880,  Fm: 1.5, Ff: 0.8, maxSpeed: 90 },
  sand:       { density_kg_m3: 1600, Fm: 2.5, Ff: 2.0, maxSpeed: 50 },
  wood_chips: { density_kg_m3: 320,  Fm: 1.5, Ff: 0.6, maxSpeed: 100 },
  fly_ash:    { density_kg_m3: 700,  Fm: 3.0, Ff: 1.5, maxSpeed: 40 },
  limestone:  { density_kg_m3: 1400, Fm: 2.0, Ff: 1.2, maxSpeed: 70 },
};

const STD_DIAMETERS = [150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900];

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ScrewConveyorEngine {
  calculate(input: ScrewConveyorInput): ScrewConveyorResult {
    const {
      capacity_tph: C,
      length_m: L,
      inclination_deg: incl = 0,
      material = "grain",
      trough_loading_pct: loading = 30,
    } = input;

    const recs: string[] = [];
    const mp = MAT_PROPS[material];
    const rho = mp.density_kg_m3;

    // Volumetric capacity
    const volCap = (C * 1000) / rho; // m³/h

    // Inclination factor
    const inclFactor = incl === 0 ? 1.0
      : incl <= 10 ? 0.9 : incl <= 20 ? 0.75
      : incl <= 30 ? 0.55 : 0.30;

    // Screw diameter selection
    // Q = π/4 × D² × pitch × N × loading × inclFactor
    // Assume pitch = D (standard pitch)
    let D = input.screw_diameter_mm;
    let N = input.screw_speed_rpm;
    if (!D) {
      for (const sd of STD_DIAMETERS) {
        const maxN = Math.min(mp.maxSpeed, 50 * 1000 / sd); // speed limit
        const Dm = sd / 1000;
        const cap = Math.PI / 4 * Dm * Dm * Dm * maxN * 60 * (loading / 100) * inclFactor; // m³/h
        if (cap >= volCap) {
          D = sd;
          N = N ?? Math.ceil(volCap / (Math.PI / 4 * Dm * Dm * Dm * 60 * (loading / 100) * inclFactor));
          break;
        }
      }
      D = D ?? STD_DIAMETERS[STD_DIAMETERS.length - 1];
      N = N ?? mp.maxSpeed;
    }
    if (!N) N = mp.maxSpeed;

    const Dm = D / 1000;
    const omega = 2 * Math.PI * N / 60;

    // CEMA Power formula:
    // Hp_friction = C × L × W × Ff × Fm / 1e6
    // Hp_material = C × Q × Ff × L / 1e6
    const W = rho * volCap / 3600; // kg/s
    const Hp_friction = L * W * mp.Ff * 9.81 / 1000; // kW
    const Hp_material = L * W * mp.Fm * 9.81 / 1000;
    const Hp_incline = incl > 0 ? C * 1000 / 3600 * 9.81 * L * Math.sin(incl * Math.PI / 180) / 1000 : 0;
    const totalPower = (Hp_friction + Hp_material + Hp_incline) * 1.15; // 15% margin

    // Shaft torque
    const torque = totalPower * 1000 / omega;

    // Critical speed: Nc ≈ 60/(2π) × √(g/R)
    const critSpeed = (60 / (2 * Math.PI)) * Math.sqrt(9.81 / (Dm / 2));

    const isSafe = N < critSpeed * 0.8 && N <= mp.maxSpeed;

    if (N > mp.maxSpeed) recs.push(`Speed ${N}rpm exceeds max ${mp.maxSpeed}rpm for ${material}`);
    if (N > critSpeed * 0.7) recs.push(`Speed near critical ${critSpeed.toFixed(0)}rpm — resonance risk`);
    if (incl > 20) recs.push(`Steep inclination ${incl}° — use ribbon or shaftless screw`);
    if (loading > 45 && material === "cement") recs.push(`High trough loading ${loading}% — risk of packing`);
    if (recs.length === 0) recs.push(`Screw conveyor nominal — ${D}mm dia, ${N}rpm, ${totalPower.toFixed(1)}kW`);

    return {
      screw_diameter_mm: mkAv(D, "mm", 0, "cema_sizing"),
      screw_speed_rpm: mkAv(N, "rpm", 0, "capacity_match"),
      drive_power_kW: mkAv(Math.round(totalPower * 10) / 10, "kW", totalPower * 0.12, "cema_formula"),
      shaft_torque_Nm: mkAv(Math.round(torque), "Nm", torque * 0.12, "power_speed"),
      volumetric_capacity_m3_h: mkAv(Math.round(volCap * 10) / 10, "m³/h", volCap * 0.05, "mass_density"),
      critical_speed_rpm: mkAv(Math.round(critSpeed), "rpm", critSpeed * 0.10, "natural_frequency"),
      material_factor: mkAv(mp.Fm, "dimensionless", 0, "cema_table"),
      inclination_factor: mkAv(inclFactor, "dimensionless", 0, "cema_table"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const screwConveyorEngine = new ScrewConveyorEngine();
