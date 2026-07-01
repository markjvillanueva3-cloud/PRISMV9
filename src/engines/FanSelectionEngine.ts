/**
 * FanSelectionEngine — Industrial Fan/Blower Sizing Calculator
 *
 * Models: Centrifugal and axial fan selection.
 * - Fan static and total pressure
 * - Air power and fan efficiency
 * - Specific speed for fan type selection
 * - Fan laws (affinity laws for fans)
 * - Sound power level prediction
 * - Motor sizing with VFD consideration
 *
 * Key physics: P_air = Q×ΔP. BHP = P_air/η. Fan laws: Q∝N, P∝N², W∝N³.
 * Ns = N×√Q / ΔP^0.75. Sound: Lw = 10+10×log10(Q) + 20×log10(ΔP).
 *
 * Reference: AMCA 210 — Fan Performance Testing,
 *            ASHRAE Fundamentals Handbook,
 *            AMCA 300 — Sound Testing
 *
 * Actions: fan_selection_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface FanSelectionInput {
  flow_m3h?: number;
  static_pressure_pa?: number;
  air_temperature_c?: number;
  altitude_m?: number;
  fan_type?: "centrifugal_bc" | "centrifugal_fc" | "axial" | "mixed_flow";
  fan_speed_rpm?: number;
  use_vfd?: boolean;
  duct_velocity_m_s?: number;
}

export interface FanSelectionResult {
  total_pressure: AtomicValue;
  air_power: AtomicValue;
  brake_power: AtomicValue;
  fan_efficiency: AtomicValue;
  specific_speed: AtomicValue;
  fan_type_rec: AtomicValue;
  motor_size: AtomicValue;
  sound_power_level: AtomicValue;
  tip_speed: AtomicValue;
  annual_energy_cost: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class FanSelectionEngine {
  calculate(input: FanSelectionInput): FanSelectionResult {
    const warnings: string[] = [];
    const Q = input.flow_m3h ?? 5000;
    const Ps = input.static_pressure_pa ?? 500;
    const tempC = input.air_temperature_c ?? 20;
    const alt = input.altitude_m ?? 0;
    const fanType = input.fan_type ?? "centrifugal_bc";
    const rpm = input.fan_speed_rpm ?? 1450;
    const vfd = input.use_vfd ?? false;
    const ductV = input.duct_velocity_m_s ?? 10;

    // Air density correction
    const rhoStd = 1.2; // kg/m³ at 20°C sea level
    const rho = rhoStd * (273.15 / (273.15 + tempC)) *
      Math.exp(-alt / 8500);

    // Velocity pressure
    const Pv = 0.5 * rho * ductV * ductV; // Pa

    // Total pressure
    const Pt = Ps + Pv;

    // Air power (W)
    const Qm3s = Q / 3600;
    const Pair = Qm3s * Pt;

    // Fan efficiency by type
    let eta: number;
    switch (fanType) {
      case "centrifugal_bc": eta = 0.78; break;
      case "centrifugal_fc": eta = 0.60; break;
      case "axial":          eta = 0.75; break;
      case "mixed_flow":     eta = 0.80; break;
      default:               eta = 0.70;
    }

    // Brake power
    const Pbrake = eta > 0 ? Pair / eta / 1000 : 0; // kW

    // Motor size
    const motorSizes = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5,
      11, 15, 18.5, 22, 30, 37, 45, 55, 75];
    let motorKW = motorSizes[motorSizes.length - 1];
    for (const s of motorSizes) {
      if (s >= Pbrake * 1.15) {
        motorKW = s;
        break;
      }
    }

    // Specific speed
    const Ns = rpm * Math.sqrt(Qm3s) / Math.pow(Math.max(Pt, 1), 0.75);

    // Fan type recommendation
    let typeRec = fanType;
    if (!input.fan_type) {
      if (Ns > 3) typeRec = "axial";
      else if (Ns > 1.5) typeRec = "mixed_flow";
      else if (Ps > 1500) typeRec = "centrifugal_bc";
      else typeRec = "centrifugal_fc";
    }

    // Tip speed (approximate wheel diameter from specific speed)
    const wheelD = Qm3s > 0 ?
      Math.pow(Qm3s * 4 / Math.PI, 1 / 3) * 2 : 0.5; // rough m
    const tipSpeed = Math.PI * wheelD * rpm / 60;

    // Sound power level (AMCA simplified)
    const Lw = Q > 0 && Pt > 0 ?
      10 + 10 * Math.log10(Qm3s) + 20 * Math.log10(Pt) : 0;

    // Annual energy cost
    const hours = 6000;
    const annualCost = motorKW * hours * 0.10;
    const vfdSavings = vfd ? annualCost * 0.25 : 0;

    // Warnings
    if (tipSpeed > 80) {
      warnings.push(`Tip speed ${r0(tipSpeed)}m/s > 80m/s — noise and structural concern`);
    }
    if (Lw > 100) {
      warnings.push(`Sound power ${r0(Lw)}dB high — add silencer or acoustic enclosure`);
    }
    if (fanType === "centrifugal_fc" && Ps > 1500) {
      warnings.push("FC fan at >1500Pa — unstable, use backward-curved");
    }
    if (tempC > 200) {
      warnings.push("Temperature >200°C — special construction and bearings required");
    }
    if (!vfd && Pbrake > 5) {
      warnings.push("Consider VFD for energy savings at partial load");
    }
    if (fanType === "axial" && Ps > 1000) {
      warnings.push("Axial fan at >1000Pa — consider centrifugal or mixed flow");
    }

    const src = "FanSelectionEngine (AMCA/ASHRAE)";

    return {
      total_pressure: mkAv(r0(Pt), "Pa", Pt * 0.05,
        `Ps=${Ps} + Pv=${r0(Pv)}`),
      air_power: mkAv(r1(Pair), "W", Pair * 0.05,
        `Q×Pt`),
      brake_power: mkAv(r2(Pbrake), "kW", Pbrake * 0.1,
        `P_air/η at ${r0(eta * 100)}%`),
      fan_efficiency: mkAv(r0(eta * 100), "%", 3, fanType),
      specific_speed: mkAv(r2(Ns), "Ns", Ns * 0.05,
        `${rpm}rpm ${r0(Q)}m³/h`),
      fan_type_rec: mkAv(typeRec === fanType ? 1 : 0, typeRec, 0, src),
      motor_size: mkAv(motorKW, "kW", 0, `≥${r2(Pbrake)}×1.15`),
      sound_power_level: mkAv(r0(Lw), "dB", 3, "AMCA formula"),
      tip_speed: mkAv(r0(tipSpeed), "m/s", tipSpeed * 0.1,
        `πDN at D≈${r2(wheelD)}m`),
      annual_energy_cost: mkAv(r0(annualCost - vfdSavings), "$/yr",
        annualCost * 0.1, vfd ? "With VFD savings" : `${motorKW}kW×${hours}h`),
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

export const fanSelectionEngine = new FanSelectionEngine();
