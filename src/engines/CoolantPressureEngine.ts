/**
 * CoolantPressureEngine — Through-Tool Coolant Calculations
 *
 * Calculates coolant delivery parameters:
 * - Required pressure for through-tool coolant
 * - Flow rate from orifice size and pressure
 * - Chip evacuation effectiveness
 * - Coolant type recommendation (flood/mist/MQL/HPC)
 * - Nozzle velocity and jet reach
 *
 * Key physics: Through-tool coolant pressure must overcome
 * the chip packing force in the flute. Smaller holes need
 * higher pressure. Flow rate follows Bernoulli's equation:
 * Q = Cd × A × sqrt(2P/ρ). High-pressure coolant (70+ bar)
 * breaks chips and improves tool life 2-5× in deep holes.
 *
 * Reference: Sandvik coolant application guide,
 *            Chipblaster HPC technical manual,
 *            Machinery's Handbook Ch.26 (Cutting fluids)
 *
 * Actions: coolant_calc, coolant_recommend
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type CoolantType = "flood" | "mist" | "mql" | "hpc";

export interface CoolantCalcInput {
  hole_diameter_mm?: number;
  coolant_hole_diameter_mm?: number;
  num_coolant_holes?: number;
  supply_pressure_bar?: number;
  depth_to_dia_ratio?: number;
  operation?: "drilling" | "milling" | "turning" | "grinding";
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
}

export interface CoolantCalcResult {
  recommended_pressure: AtomicValue;
  flow_rate: AtomicValue;
  jet_velocity: AtomicValue;
  coolant_type: CoolantType;
  chip_breaking_effectiveness: AtomicValue;
  pump_power: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Minimum pressure (bar) by operation and depth ratio */
function minPressure(
  op: string, depthRatio: number
): number {
  const base: Record<string, number> = {
    drilling: 20,
    milling: 10,
    turning: 15,
    grinding: 5,
  };
  const p = base[op] ?? 15;
  // Increase with depth ratio
  if (depthRatio > 5) return p * 2;
  if (depthRatio > 3) return p * 1.5;
  return p;
}

/** Coolant density kg/m³ (water-based emulsion) */
const COOLANT_DENSITY = 1000;

/** Discharge coefficient for sharp-edged orifice */
const CD = 0.65;

// ── Engine ─────────────────────────────────────────────────────────

export class CoolantPressureEngine {
  /**
   * Calculate coolant pressure, flow, and delivery parameters.
   */
  calculate(input: CoolantCalcInput): CoolantCalcResult {
    const warnings: string[] = [];
    const op = input.operation ?? "drilling";
    const iso = input.material_iso_group ?? "P";
    const depthRatio = input.depth_to_dia_ratio ?? 3;

    // Coolant hole size
    const holeDia = input.hole_diameter_mm ?? 10;
    const coolantHoleDia = input.coolant_hole_diameter_mm
      ?? Math.max(holeDia * 0.15, 0.8);
    const numHoles = input.num_coolant_holes ?? 2;

    // Required pressure
    const reqPressure = minPressure(op, depthRatio);
    const supplyPressure = input.supply_pressure_bar
      ?? reqPressure;

    // Flow rate: Q = Cd × A × sqrt(2P/ρ)
    // A = total orifice area (m²)
    const areaPerHole = Math.PI
      * Math.pow(coolantHoleDia / 2000, 2); // m²
    const totalArea = areaPerHole * numHoles;
    const pressurePa = supplyPressure * 1e5; // bar to Pa
    const velocity = CD * Math.sqrt(
      (2 * pressurePa) / COOLANT_DENSITY
    );
    const flowM3s = totalArea * velocity;
    const flowLmin = flowM3s * 60000; // m³/s to L/min

    // Jet velocity (m/s)
    const jetVelocity = velocity;

    // Coolant type recommendation
    let coolantType: CoolantType = "flood";
    if (supplyPressure >= 70) coolantType = "hpc";
    else if (op === "milling" && depthRatio < 2) coolantType = "mist";
    if (iso === "N" && op === "milling") coolantType = "mql";

    // Chip breaking effectiveness (0-100)
    // Higher pressure + smaller hole = better chip breaking
    const chipBreaking = Math.min(
      (supplyPressure / 70) * 60 +
      (depthRatio > 3 ? 20 : 0) +
      (coolantType === "hpc" ? 20 : 0),
      100
    );

    // Pump power (kW) = P × Q / (η × 600)
    const pumpEfficiency = 0.7;
    const pumpPower = (supplyPressure * flowLmin)
      / (600 * pumpEfficiency);

    // Warnings
    if (supplyPressure < reqPressure) {
      warnings.push(
        `Supply pressure ${supplyPressure} bar < ` +
        `recommended ${reqPressure} bar`
      );
    }
    if (depthRatio > 5 && supplyPressure < 40) {
      warnings.push(
        "Deep hole with low pressure — chip evacuation risk"
      );
    }
    if (coolantHoleDia < 0.5) {
      warnings.push(
        "Very small coolant holes — risk of clogging"
      );
    }
    if (flowLmin > 50) {
      warnings.push(
        `High flow rate (${r1(flowLmin)} L/min) — ` +
        "verify tank capacity and filtration"
      );
    }
    if (iso === "S" || iso === "H") {
      warnings.push(
        "Difficult material — high-pressure coolant strongly recommended"
      );
    }

    return {
      recommended_pressure: av(reqPressure, "bar", 0.1,
        "Based on operation and depth ratio"),
      flow_rate: av(r2(flowLmin), "L/min", 0.15,
        "Cd × A × √(2P/ρ) × 60000"),
      jet_velocity: av(r1(jetVelocity), "m/s", 0.1,
        "Cd × √(2P/ρ)"),
      coolant_type: coolantType,
      chip_breaking_effectiveness: av(
        Math.round(chipBreaking), "score", 0.2,
        "Pressure/depth/type composite (0-100)"
      ),
      pump_power: av(r2(pumpPower), "kW", 0.15,
        "P × Q / (600 × η)"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const coolantPressureEngine = new CoolantPressureEngine();
