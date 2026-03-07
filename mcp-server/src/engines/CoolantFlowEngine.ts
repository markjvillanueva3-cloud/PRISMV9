/**
 * CoolantFlowEngine — Coolant Delivery & Flow Rate Calculator
 *
 * Calculates coolant system performance:
 * - Required flow rate from cutting zone heat
 * - Nozzle velocity and pressure for chip evacuation
 * - Through-spindle coolant requirements
 * - Coolant concentration check
 * - Tank capacity adequacy
 * - Temperature rise in coolant system
 *
 * Key physics: Flow rate Q = P_heat / (ρ·Cp·ΔT) where P_heat
 * is cutting power transferred to coolant. Nozzle velocity
 * v = Cv·√(2·ΔP/ρ) with Cv ≈ 0.6-0.9. Through-spindle
 * pressure 70-100 bar standard, 150+ bar for deep holes.
 *
 * Reference: Blaser Swisslube coolant engineering,
 *            Chipblaster high-pressure coolant systems,
 *            Machinery's Handbook Ch.37 (Coolants)
 *
 * Actions: coolant_flow_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CoolantFlowInput {
  cutting_power_kw?: number;
  coolant_type?: "flood" | "mist" | "through_spindle" | "high_pressure";
  coolant_concentration_pct?: number;
  tank_capacity_liters?: number;
  nozzle_diameter_mm?: number;
  nozzle_count?: number;
  supply_pressure_bar?: number;
  target_temp_rise_c?: number;
  operation?: "drilling" | "milling" | "turning" | "grinding" | "tapping";
  hole_depth_diameter_ratio?: number;
}

export interface CoolantFlowResult {
  required_flow_lpm: AtomicValue;
  nozzle_velocity_mps: AtomicValue;
  actual_flow_lpm: AtomicValue;
  temp_rise: AtomicValue;
  tank_turnover_min: AtomicValue;
  concentration_ok: AtomicValue;
  pressure_adequate: AtomicValue;
  chip_evacuation_score: AtomicValue;
  recommended_pressure: AtomicValue;
  coolant_cost_per_hour: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Heat fraction to coolant by operation */
const HEAT_TO_COOLANT: Record<string, number> = {
  drilling: 0.15,
  milling: 0.10,
  turning: 0.08,
  grinding: 0.60,
  tapping: 0.12,
};

/** Recommended pressures (bar) by delivery type */
const REC_PRESSURES: Record<string, number> = {
  flood: 5,
  mist: 3,
  through_spindle: 70,
  high_pressure: 150,
};

/** Min pressures for deep hole drilling by L/D */
const DEEP_HOLE_PRESSURES: Record<number, number> = {
  3: 30, 5: 50, 8: 70, 10: 100, 15: 150, 20: 200,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CoolantFlowEngine {
  calculate(input: CoolantFlowInput): CoolantFlowResult {
    const warnings: string[] = [];
    const power = input.cutting_power_kw ?? 5;
    const cType = input.coolant_type ?? "flood";
    const conc = input.coolant_concentration_pct ?? 8;
    const tankCap = input.tank_capacity_liters ?? 200;
    const nozzleDia = input.nozzle_diameter_mm ?? 3;
    const nozzleCount = input.nozzle_count ?? 2;
    const pressure = input.supply_pressure_bar
      ?? REC_PRESSURES[cType] ?? 5;
    const targetDT = input.target_temp_rise_c ?? 5;
    const op = input.operation ?? "milling";
    const ldRatio = input.hole_depth_diameter_ratio ?? 3;

    // Heat to coolant
    const heatFrac = HEAT_TO_COOLANT[op] ?? 0.10;
    const heatToCoolant = power * heatFrac; // kW

    // Required flow: Q = P/(ρ·Cp·ΔT)
    // Water-based coolant: ρ≈1000 kg/m³, Cp≈4.0 kJ/(kg·K)
    const rho = 1000; // kg/m³
    const cp = 4.0;   // kJ/(kg·K)
    // Q = P_kW / (ρ·Cp·ΔT) = P / (1000·4.0·ΔT) in m³/s
    // Convert to L/min: × 60000
    const reqFlow = targetDT > 0
      ? (heatToCoolant / (rho * cp * targetDT / 1000)) * 60000
      : 10;

    // Nozzle flow: Q = Cv·A·√(2·ΔP/ρ)
    const Cv = 0.7;
    const A_m2 = Math.PI * Math.pow(nozzleDia / 2000, 2); // m²
    const dP_Pa = pressure * 100000; // bar → Pa
    const nozzleVel = Cv * Math.sqrt(2 * dP_Pa / rho);
    const flowPerNozzle = A_m2 * nozzleVel * 60000; // L/min
    const actualFlow = flowPerNozzle * nozzleCount;

    // Temperature rise
    const actualDT = actualFlow > 0
      ? (heatToCoolant / (rho * cp * (actualFlow / 60000))) * 1000
      : 99;

    // Tank turnover
    const turnover = actualFlow > 0
      ? tankCap / actualFlow : 999;

    // Concentration check
    const concOk = conc >= 5 && conc <= 12;

    // Pressure adequacy
    let recPressure = REC_PRESSURES[cType] ?? 5;
    if (op === "drilling" && ldRatio > 3) {
      // Find minimum pressure for deep hole
      const ldKeys = Object.keys(DEEP_HOLE_PRESSURES)
        .map(Number).sort((a, b) => a - b);
      for (const ld of ldKeys) {
        if (ldRatio <= ld) {
          recPressure = Math.max(recPressure,
            DEEP_HOLE_PRESSURES[ld]);
          break;
        }
      }
      if (ldRatio > 20) recPressure = Math.max(recPressure, 200);
    }
    const pressureOk = pressure >= recPressure * 0.8;

    // Chip evacuation score
    let chipScore = 50;
    if (nozzleVel > 30) chipScore += 20;
    if (nozzleVel > 50) chipScore += 15;
    if (actualFlow > reqFlow) chipScore += 10;
    if (cType === "through_spindle") chipScore += 15;
    if (cType === "high_pressure") chipScore += 20;
    if (cType === "mist") chipScore -= 30;
    chipScore = Math.max(0, Math.min(100, chipScore));

    // Cost estimate ($/hr based on coolant consumption)
    const makeupRate = actualFlow * 0.001; // ~0.1% loss rate L/min
    const coolantCostPerLiter = 0.15; // diluted cost
    const costPerHour = makeupRate * 60 * coolantCostPerLiter;

    // Warnings
    if (actualFlow < reqFlow * 0.7) {
      warnings.push(
        `Flow ${r1(actualFlow)} L/min below required ` +
        `${r1(reqFlow)} L/min — increase nozzle size or count`
      );
    }
    if (actualDT > 8) {
      warnings.push(
        `Coolant temperature rise ${r1(actualDT)}°C is high — ` +
        "increase flow or add chiller"
      );
    }
    if (turnover < 3) {
      warnings.push(
        `Tank turnover ${r1(turnover)}min is too fast — ` +
        "insufficient settling time for chips/tramp oil"
      );
    }
    if (!concOk) {
      warnings.push(
        `Concentration ${conc}% outside 5-12% range — ` +
        "adjust refractometer reading"
      );
    }
    if (!pressureOk) {
      warnings.push(
        `Pressure ${pressure} bar below recommended ` +
        `${r0(recPressure)} bar for ${op} at L/D ${ldRatio}`
      );
    }
    if (cType === "mist" && op === "drilling" && ldRatio > 5) {
      warnings.push(
        "MQL insufficient for deep holes — " +
        "switch to through-spindle coolant"
      );
    }

    return {
      required_flow_lpm: av(r1(reqFlow), "L/min", 0.5,
        `${r2(heatToCoolant)}kW / (ρ·Cp·${targetDT}°C)`),
      nozzle_velocity_mps: av(r1(nozzleVel), "m/s", 1,
        `Cv·√(2·${pressure}bar/ρ)`),
      actual_flow_lpm: av(r1(actualFlow), "L/min", 0.5,
        `${nozzleCount} × ${r1(flowPerNozzle)} L/min`),
      temp_rise: av(r1(actualDT), "°C", 0.5,
        "Heat / (ρ·Cp·Q)"),
      tank_turnover_min: av(r1(turnover), "min", 0.5,
        `${tankCap}L / ${r1(actualFlow)} L/min`),
      concentration_ok: av(concOk ? 1 : 0,
        concOk ? "OK" : "OUT_OF_RANGE", 0,
        `${conc}% vs 5-12% target`),
      pressure_adequate: av(pressureOk ? 1 : 0,
        pressureOk ? "OK" : "LOW", 0,
        `${pressure} bar vs ${r0(recPressure)} bar recommended`),
      chip_evacuation_score: av(chipScore, "score", 5,
        "0=poor → 100=excellent chip clearing"),
      recommended_pressure: av(r0(recPressure), "bar", 2,
        `${cType}, ${op}`),
      coolant_cost_per_hour: av(r2(costPerHour), "$/hr", 0.1,
        "Makeup rate × coolant cost"),
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
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const coolantFlowEngine = new CoolantFlowEngine();
