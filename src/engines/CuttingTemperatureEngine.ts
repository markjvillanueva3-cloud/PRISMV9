/**
 * CuttingTemperatureEngine — Tool/Chip Interface Temperature
 *
 * Predicts cutting temperatures:
 * - Tool-chip interface temperature (Loewen-Shaw model)
 * - Temperature rise from speed, feed, DOC
 * - Coolant effectiveness estimation
 * - Tool coating temperature limits
 * - Thermal damage risk assessment
 *
 * Key physics: Cutting temperature T ∝ Vc^0.4 × f^0.2.
 * Most heat (80%) goes into the chip, ~10% into tool,
 * ~10% into workpiece. Higher speeds increase temperature
 * but improve chip heat removal ratio. Tool coatings have
 * maximum service temperatures (TiN: 600°C, TiAlN: 800°C,
 * AlCrN: 1100°C).
 *
 * Reference: Loewen & Shaw cutting temperature model,
 *            Trent & Wright "Metal Cutting" Ch.5,
 *            Sandvik Thermal Load Application Guide
 *
 * Actions: cutting_temperature_calc
 */

import { resolveMaterial } from "../physics/constants.js";

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CuttingTemperatureInput {
  cutting_speed_mpm: number;
  feed_mm: number;
  depth_of_cut_mm?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron" | "inconel";
  tool_coating?: "uncoated" | "TiN" | "TiCN" | "TiAlN"
    | "AlCrN" | "diamond" | "CBN";
  coolant?: "flood" | "mist" | "mql" | "dry"
    | "through_tool" | "cryogenic";
  ambient_temp_c?: number;
}

export interface CuttingTemperatureResult {
  interface_temperature: AtomicValue;
  chip_temperature: AtomicValue;
  tool_temperature: AtomicValue;
  workpiece_temperature: AtomicValue;
  coating_limit: AtomicValue;
  thermal_margin: AtomicValue;
  coolant_reduction: AtomicValue;
  heat_partition_chip: AtomicValue;
  thermal_damage_risk: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/**
 * Material thermal properties for temperature model.
 * Thermal conductivity sourced from CANONICAL_MATERIAL_DB via resolveMaterial();
 * kc_base and melting_point are empirical Loewen-Shaw temperature coefficients
 * specific to this engine's simplified model.
 */
const MAT_THERMAL_OVERRIDES: Record<string, {
  kc_base: number;  // base cutting temp coefficient (Loewen-Shaw C)
  melting_point: number; // °C
}> = {
  // kc_base calibrated against Sandvik Coromant thermal data (General Turning §4)
  // and validated against Loewen-Shaw published test results.
  // Combined with conductivity correction (50/k_thermal, cap 3.0), these produce
  // interface temperatures in the 80-950°C range matching published data.
  // Previous values (350-550) were ~5× too high — producing 1000-4500°C outputs.
  steel:     { kc_base: 76, melting_point: 1500 },    // Target: 300-550°C at Vc=180, f=0.10
  aluminum:  { kc_base: 59, melting_point: 660 },     // Target: 80-200°C at Vc=300, f=0.08
  titanium:  { kc_base: 74, melting_point: 1670 },    // Target: 500-800°C at Vc=60, f=0.05
  stainless: { kc_base: 51, melting_point: 1450 },    // Target: 400-700°C at Vc=100, f=0.06
  cast_iron: { kc_base: 65, melting_point: 1200 },    // Target: 200-400°C (lower than steel)
  inconel:   { kc_base: 116, melting_point: 1350 },   // Target: 600-950°C at Vc=30, f=0.04
};

/** Resolve thermal properties: conductivity from canonical DB, rest from overrides. */
function getMatThermal(mat: string): { kc_base: number; conductivity: number; melting_point: number } {
  const canonical = resolveMaterial(mat);
  const overrides = MAT_THERMAL_OVERRIDES[mat] ?? MAT_THERMAL_OVERRIDES.steel;
  return {
    kc_base: overrides.kc_base,
    conductivity: canonical.k_thermal,  // canonical thermal conductivity [W/(m·K)]
    melting_point: overrides.melting_point,
  };
}

/** Coating max service temperature (°C) */
const COATING_LIMIT: Record<string, number> = {
  uncoated: 400,
  TiN: 600,
  TiCN: 750,
  TiAlN: 800,
  AlCrN: 1100,
  diamond: 600,
  CBN: 1200,
};

/** Coolant temperature reduction factor */
const COOLANT_FACTOR: Record<string, number> = {
  flood: 0.65,
  through_tool: 0.60,
  mist: 0.80,
  mql: 0.85,
  cryogenic: 0.45,
  dry: 1.0,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CuttingTemperatureEngine {
  calculate(
    input: CuttingTemperatureInput
  ): CuttingTemperatureResult {
    const warnings: string[] = [];
    const Vc = input.cutting_speed_mpm;
    const f = input.feed_mm;
    const ap = input.depth_of_cut_mm ?? 1.0;
    const mat = input.material_type ?? "steel";
    const coating = input.tool_coating ?? "TiAlN";
    const coolant = input.coolant ?? "flood";
    const ambient = input.ambient_temp_c ?? 20;

    const thermal = getMatThermal(mat);

    // Loewen-Shaw simplified: T = C × Vc^0.4 × f^0.2
    // C depends on material thermal properties
    const C = thermal.kc_base;
    const tempRise = C * Math.pow(Vc, 0.4) * Math.pow(f, 0.2);

    // Conductivity factor: low conductivity → more heat stays local
    const condFactor = 50 / thermal.conductivity;
    const adjTempRise = tempRise * Math.min(condFactor, 3);

    // Coolant reduction
    const coolFactor = COOLANT_FACTOR[coolant] ?? 1.0;
    const interfaceTemp = ambient + adjTempRise * coolFactor;

    // Heat partition: chip gets most heat at high speed
    // Guard: Vc must be > 0 for log10 (Vc≤0 → NaN propagation)
    const chipFraction = Math.min(
      0.9,
      Math.max(0.1, 0.5 + 0.1 * Math.log10(Math.max(Vc, 1)))
    );
    const toolFraction = (1 - chipFraction) * 0.5;
    const wpFraction = 1 - chipFraction - toolFraction;

    // Component temperatures
    const chipTemp = ambient + adjTempRise * chipFraction * coolFactor;
    // Tool temperature is higher than partition fraction suggests because heat concentrates
    // in a smaller volume. Model as temperature ratio, not energy violation.
    // Tool volume ≈ contact area × depth ≈ 1/3 of chip volume → temp amplification ≈ 1.5×
    const toolTemp = ambient + adjTempRise * toolFraction * coolFactor * 1.5;
    const wpTemp = ambient + adjTempRise * wpFraction * coolFactor;

    // Coating limit check
    const coatingMax = COATING_LIMIT[coating] ?? 600;
    const thermalMargin = coatingMax - toolTemp;

    // Coolant temperature reduction (°C saved)
    const coolReduction = adjTempRise * (1 - coolFactor);

    // Thermal damage risk (0-100)
    let damageRisk = 0;
    if (toolTemp > coatingMax) {
      damageRisk = Math.min(100,
        50 + ((toolTemp - coatingMax) / coatingMax) * 200
      );
    } else if (toolTemp > coatingMax * 0.8) {
      damageRisk = ((toolTemp - coatingMax * 0.8)
        / (coatingMax * 0.2)) * 50;
    }

    // Warnings
    if (toolTemp > coatingMax) {
      warnings.push(
        `Tool temperature ${r0(toolTemp)}°C exceeds ` +
        `${coating} limit of ${coatingMax}°C — coating failure risk`
      );
    }
    if (thermalMargin < 100 && thermalMargin > 0) {
      warnings.push(
        `Only ${r0(thermalMargin)}°C thermal margin — ` +
        "reduce speed or improve cooling"
      );
    }
    if (mat === "titanium" && coolant === "dry") {
      warnings.push(
        "Dry cutting titanium — extreme heat, fire risk"
      );
    }
    if (mat === "inconel" && coolant !== "through_tool"
      && coolant !== "flood") {
      warnings.push(
        "Inconel requires aggressive cooling — " +
        "use flood or through-tool"
      );
    }
    if (interfaceTemp > thermal.melting_point * 0.6) {
      warnings.push(
        "Interface near material softening point — " +
        "may cause BUE or smearing"
      );
    }
    if (coolant === "cryogenic"
      && (coating === "diamond" || coating === "CBN")) {
      // Good combination, no warning
    }

    return {
      interface_temperature: av(r0(interfaceTemp), "°C", 30,
        `Loewen-Shaw: C×Vc^0.4×f^0.2×coolant`),
      chip_temperature: av(r0(chipTemp), "°C", 25,
        `${r0(chipFraction * 100)}% of heat to chip`),
      tool_temperature: av(r0(toolTemp), "°C", 20,
        `${r0(toolFraction * 100)}% of heat concentrated`),
      workpiece_temperature: av(r0(wpTemp), "°C", 15,
        `${r0(wpFraction * 100)}% conducted into work`),
      coating_limit: av(coatingMax, "°C", 0,
        `${coating} max service temperature`),
      thermal_margin: av(r0(thermalMargin), "°C", 25,
        `${coatingMax} - ${r0(toolTemp)}`),
      coolant_reduction: av(r0(coolReduction), "°C", 10,
        `${coolant}: ${r0((1 - coolFactor) * 100)}% reduction`),
      heat_partition_chip: av(
        r0(chipFraction * 100), "%", 5,
        "Increases with cutting speed"),
      thermal_damage_risk: av(r0(damageRisk), "%", 5,
        damageRisk > 50
          ? "HIGH — reduce speed or improve cooling"
          : damageRisk > 20
            ? "MODERATE — monitor closely"
            : "LOW — within safe range"),
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

function r0(n: number): number { return Math.round(n); }

export const cuttingTemperatureEngine = new CuttingTemperatureEngine();
