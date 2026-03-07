/**
 * ElectroPlatingEngine — Electroplating Process Calculator
 *
 * Models: Electroplating thickness, time, and cost.
 * - Faraday's law: m = ItM/(nF)
 * - Plating time from target thickness
 * - Current density and throwing power
 * - Bath chemistry maintenance
 * - Hydrogen embrittlement risk
 * - Cost per part (energy + chemistry + labor)
 *
 * Key physics: thickness = (I×t×M)/(n×F×ρ×A).
 * Cathode efficiency η. Current distribution uniformity.
 *
 * Reference: ASM Handbook Vol.5 — Surface Engineering,
 *            Lowenheim — Modern Electroplating,
 *            MIL-STD-1501 / ASTM B633/B488
 *
 * Actions: plating_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ElectroPlatingInput {
  plating_type?: "chrome_hard" | "chrome_decorative" | "nickel" | "zinc" |
    "cadmium" | "gold" | "silver" | "copper" | "tin";
  target_thickness_um?: number;
  part_area_dm2?: number;
  current_density_A_dm2?: number;
  bath_temperature_c?: number;
  substrate?: "steel" | "aluminum" | "copper" | "brass";
  num_parts?: number;
  electricity_cost_kwh?: number;
}

export interface ElectroPlatingResult {
  plating_time: AtomicValue;
  total_current: AtomicValue;
  metal_deposited: AtomicValue;
  cathode_efficiency: AtomicValue;
  throwing_power: AtomicValue;
  bath_voltage: AtomicValue;
  energy_per_part: AtomicValue;
  cost_per_part: AtomicValue;
  hydrogen_risk: AtomicValue;
  bake_required: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [atomic_mass, valence, density_g_cm3, cathode_eff, bath_V, throwing_power_1_10] */
const PLATING_DATA: Record<string, [number, number, number, number, number, number]> = {
  chrome_hard:       [52.0,  6, 7.19, 0.15, 6.0, 2],
  chrome_decorative: [52.0,  6, 7.19, 0.15, 6.0, 2],
  nickel:            [58.69, 2, 8.90, 0.95, 4.0, 8],
  zinc:              [65.38, 2, 7.13, 0.95, 3.0, 7],
  cadmium:           [112.4, 2, 8.65, 0.95, 2.5, 9],
  gold:              [197.0, 1, 19.3, 0.80, 4.0, 5],
  silver:            [107.9, 1, 10.5, 0.98, 2.0, 6],
  copper:            [63.55, 2, 8.96, 0.98, 3.0, 7],
  tin:               [118.7, 2, 7.31, 0.90, 3.0, 6],
};

const F_CONST = 96485; // C/mol

// ── Engine ─────────────────────────────────────────────────────────

export class ElectroPlatingEngine {
  calculate(input: ElectroPlatingInput): ElectroPlatingResult {
    const warnings: string[] = [];
    const pType = input.plating_type ?? "nickel";
    const tTarget = input.target_thickness_um ?? 25;
    const area = input.part_area_dm2 ?? 5;
    const substrate = input.substrate ?? "steel";
    const nParts = input.num_parts ?? 1;
    const elecCost = input.electricity_cost_kwh ?? 0.10;

    const [M, n, rho, eta, bathV, throwPower] =
      PLATING_DATA[pType] ?? PLATING_DATA.nickel;

    // Current density
    const J = input.current_density_A_dm2 ??
      (pType.includes("chrome") ? 30 : 3);

    // Total current
    const I = J * area * nParts;

    // Plating time (seconds)
    // thickness = η×I×t×M / (n×F×ρ×A)
    // t = thickness×n×F×ρ×A / (η×I×M)
    const thickM = tTarget * 1e-6; // µm → m
    const areaM2 = area * 1e-2; // dm² → m²
    const rhoKg = rho * 1000; // g/cm³ → kg/m³
    const tSec = thickM * n * F_CONST * rhoKg * areaM2 /
      (eta * I * (M / 1000));
    const tMin = tSec / 60;

    // Metal deposited per part (grams)
    const metalG = eta * I * tSec * M / (n * F_CONST * nParts);

    // Energy per part
    const energyWh = bathV * I * tSec / 3600; // Wh
    const energyKwh = energyWh / 1000;

    // Cost per part (simplified: energy + chemistry @ 2× energy)
    const energyCostPart = energyKwh * elecCost / nParts;
    const chemCost = energyCostPart * 2;
    const laborCost = (tMin / 60) * 30 / nParts; // $30/hr
    const costPerPart = energyCostPart + chemCost + laborCost;

    // Hydrogen embrittlement risk
    let hRisk: string;
    if (pType.includes("chrome") || pType === "cadmium" || pType === "zinc") {
      hRisk = substrate === "steel" ? "high" : "low";
    } else {
      hRisk = "low";
    }

    // Bake required (for H2 relief)
    const bakeReq = hRisk === "high";

    // Warnings
    if (hRisk === "high") {
      warnings.push(`Hydrogen embrittlement risk — bake at 190°C for 4-24h within 4h of plating`);
    }
    if (pType === "cadmium") {
      warnings.push("Cadmium is toxic — restricted by REACH/RoHS, consider zinc-nickel alternative");
    }
    if (substrate === "aluminum" && !["zinc", "copper"].includes(pType)) {
      warnings.push("Aluminum substrate — requires zincate pre-treatment before plating");
    }
    if (pType.includes("chrome") && tTarget > 250) {
      warnings.push(`Chrome ${tTarget}µm — multiple passes may be needed, check cracking`);
    }
    if (J > 50 && pType.includes("chrome")) {
      warnings.push(`High current density ${J}A/dm² — burning risk at edges`);
    }
    if (throwPower < 4 && area > 10) {
      warnings.push("Low throwing power — thickness variation on complex geometry");
    }

    const src = "ElectroPlatingEngine (ASM/Lowenheim)";

    return {
      plating_time: mkAv(r1(tMin), "min", tMin * 0.05,
        `${tTarget}µm at ${J}A/dm² η=${eta}`),
      total_current: mkAv(r1(I), "A", I * 0.02,
        `${J}A/dm² × ${area}dm²`),
      metal_deposited: mkAv(r2(metalG), "g/part", metalG * 0.05,
        "Faraday's law"),
      cathode_efficiency: mkAv(r0(eta * 100), "%", 2, pType),
      throwing_power: mkAv(throwPower, "/10", 0, pType),
      bath_voltage: mkAv(bathV, "V", 0.5, pType),
      energy_per_part: mkAv(r2(energyKwh / nParts), "kWh", energyKwh / nParts * 0.1,
        `${bathV}V × ${r1(I)}A × ${r1(tMin)}min`),
      cost_per_part: mkAv(r2(costPerPart), "$/part", costPerPart * 0.2,
        "Energy + chem + labor"),
      hydrogen_risk: mkAv(hRisk === "high" ? 3 : hRisk === "moderate" ? 2 : 1,
        hRisk, 0, `${pType} on ${substrate}`),
      bake_required: mkAv(bakeReq ? 1 : 0,
        bakeReq ? "YES — 190°C 4-24h" : "NO", 0, src),
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

export const electroPlatingEngine = new ElectroPlatingEngine();
