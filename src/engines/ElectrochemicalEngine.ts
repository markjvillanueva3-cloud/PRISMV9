/**
 * ElectrochemicalEngine — ECM/ECD Process Calculator
 *
 * Models: Electrochemical machining and deburring parameters.
 * - Material removal by Faraday's law
 * - Current density and gap control
 * - Electrolyte flow requirements
 * - Surface finish prediction
 * - Power supply sizing
 * - Process time estimation
 *
 * Key physics: MRR = η×I×M/(n×F×ρ). Faraday: m = ItM/(nF).
 * Gap = V/(J×ρ_electrolyte). Feed rate = MRR/area.
 *
 * Reference: McGeough — Principles of ECM,
 *            Rajurkar — ECM process modeling,
 *            CIRP ECM process handbook
 *
 * Actions: ecm_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ElectrochemicalInput {
  process?: "ecm" | "ecd" | "ecg";
  workpiece_material?: "steel" | "nickel_alloy" | "titanium" | "cobalt_alloy" | "stainless";
  machining_area_mm2?: number;
  depth_mm?: number;
  gap_mm?: number;
  voltage_v?: number;
  electrolyte?: "NaCl" | "NaNO3" | "KNO3" | "NaClO3";
  electrolyte_flow_lpm?: number;
  current_efficiency_pct?: number;
}

export interface ElectrochemicalResult {
  current_required: AtomicValue;
  current_density: AtomicValue;
  mrr: AtomicValue;
  feed_rate: AtomicValue;
  process_time: AtomicValue;
  power_required: AtomicValue;
  surface_roughness: AtomicValue;
  electrolyte_flow: AtomicValue;
  electrolyte_temp_rise: AtomicValue;
  ecm_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Material electrochemical equivalent: [atomic_mass, valence, density_g_cm3] */
const MAT_PROPS: Record<string, [number, number, number]> = {
  steel:        [55.85, 2, 7.87],
  nickel_alloy: [58.69, 2, 8.90],
  titanium:     [47.87, 4, 4.51],
  cobalt_alloy: [58.93, 2, 8.90],
  stainless:    [55.85, 2, 7.98],
};

/** Faraday constant */
const F_CONST = 96485; // C/mol

/** Electrolyte conductivity (S/m) approximate */
const CONDUCTIVITY: Record<string, number> = {
  NaCl: 20, NaNO3: 12, KNO3: 10, NaClO3: 8,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ElectrochemicalEngine {
  calculate(input: ElectrochemicalInput): ElectrochemicalResult {
    const warnings: string[] = [];
    const process = input.process ?? "ecm";
    const matKey = input.workpiece_material ?? "steel";
    const area = input.machining_area_mm2 ?? 500;
    const depth = input.depth_mm ?? 5;
    const gap = input.gap_mm ?? 0.2;
    const V = input.voltage_v ?? 12;
    const electrolyte = input.electrolyte ?? "NaCl";
    const eta = (input.current_efficiency_pct ?? 90) / 100;

    const [M, n, rhoG] = MAT_PROPS[matKey] ?? MAT_PROPS.steel;
    const rho = rhoG * 1000; // g/cm³ → kg/m³

    // Conductivity
    const sigma = CONDUCTIVITY[electrolyte] ?? 20; // S/m

    // Current density: J = σ × V / gap (A/m²)
    const gapM = gap / 1000; // mm → m
    const J = sigma * V / gapM; // A/m²
    const J_Acm2 = J / 10000; // A/cm²

    // Total current
    const areaM2 = area / 1e6; // mm² → m²
    const I = J * areaM2; // A

    // MRR by Faraday's law: MRR = η × I × M / (n × F × ρ)
    // Result in m³/s, convert to mm³/min
    const mrrM3s = eta * I * (M / 1000) / (n * F_CONST * rho);
    const mrr = mrrM3s * 1e9 * 60; // mm³/min

    // Feed rate = MRR / area
    const feedRate = mrr / area; // mm/min

    // Process time
    const processTime = depth / Math.max(feedRate, 0.001); // minutes

    // Power
    const power = V * I / 1000; // kW

    // Surface roughness (ECM typically 0.2-3.0 µm Ra)
    let ra: number;
    if (process === "ecm") {
      ra = J_Acm2 > 50 ? 0.4 : J_Acm2 > 20 ? 0.8 : 1.5;
    } else if (process === "ecd") {
      ra = 0.8; // deburring — not primary concern
    } else {
      ra = 0.3; // ECG — very smooth
    }

    // Electrolyte flow requirement
    // Need to remove heat: Q = P × 860 / (ΔT × ρ_elec × Cp)
    // Simplified: ~2-5 L/min per 100A
    const flowReq = input.electrolyte_flow_lpm ?? Math.max(2, I / 20);

    // Temperature rise: ΔT = P / (flow × ρ × Cp) simplified
    const tempRise = power * 1000 * 60 / (flowReq * 4186); // °C approx

    // Feasibility
    const feasible = I > 0 && I < 10000 && gap > 0.05;

    // Warnings
    if (I > 5000) {
      warnings.push(`Current ${r0(I)}A very high — verify power supply capacity`);
    }
    if (gap < 0.1) {
      warnings.push(`Gap ${gap}mm < 0.1 — risk of short circuit, improve flushing`);
    }
    if (tempRise > 20) {
      warnings.push(`Electrolyte temp rise ${r0(tempRise)}°C — increase flow rate or add chiller`);
    }
    if (matKey === "titanium") {
      warnings.push("Titanium ECM — passivation layer requires pulsed current or higher voltage");
    }
    if (electrolyte === "NaCl") {
      warnings.push("NaCl electrolyte — stray current corrosion risk, NaNO₃ gives better localization");
    }
    if (process === "ecd" && depth > 2) {
      warnings.push(`ECD depth ${depth}mm excessive — ECD typically for <1mm deburring`);
    }

    const src = "ElectrochemicalEngine (McGeough/Faraday)";

    return {
      current_required: mkAv(r0(I), "A", I * 0.05, `J=${r0(J_Acm2)}A/cm² × ${area}mm²`),
      current_density: mkAv(r1(J_Acm2), "A/cm²", J_Acm2 * 0.05,
        `σ×V/gap = ${sigma}×${V}/${gap}`),
      mrr: mkAv(r2(mrr), "mm³/min", mrr * 0.1, "Faraday's law"),
      feed_rate: mkAv(r3(feedRate), "mm/min", feedRate * 0.1, `MRR/${area}mm²`),
      process_time: mkAv(r1(processTime), "min", processTime * 0.15,
        `${depth}mm / ${r3(feedRate)}mm/min`),
      power_required: mkAv(r1(power), "kW", power * 0.05, `${V}V × ${r0(I)}A`),
      surface_roughness: mkAv(r1(ra), "µm Ra", ra * 0.2, process),
      electrolyte_flow: mkAv(r1(flowReq), "L/min", flowReq * 0.2, src),
      electrolyte_temp_rise: mkAv(r0(tempRise), "°C", tempRise * 0.2,
        `${r1(power)}kW into ${r1(flowReq)}L/min`),
      ecm_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const electrochemicalEngine = new ElectrochemicalEngine();
