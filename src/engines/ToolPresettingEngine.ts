/**
 * ToolPresettingEngine — Tool Presetting & Offset Calculator
 *
 * Calculates tool measurement and offset values:
 * - Tool length offset (H) from presetter measurement
 * - Diameter compensation (D) with runout adjustment
 * - Thermal growth correction at operating temperature
 * - Gage length vs programmed length delta
 * - Wear offset initial values
 * - Measurement uncertainty budget
 *
 * Key physics: Tool length changes with temperature:
 * ΔL = α·L·ΔT (steel α≈12µm/m/°C, carbide α≈6µm/m/°C).
 * Presetter measures at room temp; machine runs warmer.
 * Runout adds effective diameter: D_eff = D + 2·TIR.
 * Touch-off repeatability ±2-5µm for quality presetters.
 *
 * Reference: Zoller presetting handbook,
 *            Haimer tool measurement guide,
 *            ISO 13399 cutting tool data representation
 *
 * Actions: tool_presetting_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ToolPresettingInput {
  measured_length_mm: number;
  measured_diameter_mm?: number;
  programmed_length_mm?: number;
  programmed_diameter_mm?: number;
  tool_material?: "hss" | "carbide" | "ceramic" | "cermet";
  holder_material?: "steel" | "carbide";
  presetter_temp_c?: number;
  machine_temp_c?: number;
  tir_mm?: number;
  presetter_accuracy_um?: number;
  wear_offset_mm?: number;
  gage_line_to_spindle_mm?: number;
}

export interface ToolPresettingResult {
  length_offset: AtomicValue;
  diameter_offset: AtomicValue;
  thermal_correction: AtomicValue;
  effective_diameter: AtomicValue;
  length_delta: AtomicValue;
  total_uncertainty: AtomicValue;
  initial_wear_offset: AtomicValue;
  compensated_length: AtomicValue;
  compensated_diameter: AtomicValue;
  measurement_confidence: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** CTE (µm/m/°C) by material */
const CTE: Record<string, number> = {
  hss: 12,
  carbide: 6,
  ceramic: 4,
  cermet: 8,
  steel: 12,
};

/** Presetter repeatability by accuracy class (µm) */
const PRESETTER_ACCURACY: Record<string, number> = {
  basic: 10,
  standard: 5,
  precision: 2,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ToolPresettingEngine {
  calculate(input: ToolPresettingInput): ToolPresettingResult {
    const warnings: string[] = [];
    const measLen = input.measured_length_mm;
    const measDia = input.measured_diameter_mm ?? 0;
    const progLen = input.programmed_length_mm ?? measLen;
    const progDia = input.programmed_diameter_mm ?? measDia;
    const toolMat = input.tool_material ?? "carbide";
    const holderMat = input.holder_material ?? "steel";
    const preTemp = input.presetter_temp_c ?? 20;
    const machTemp = input.machine_temp_c ?? 25;
    const tir = input.tir_mm ?? 0.005;
    const preAcc = input.presetter_accuracy_um ?? 5;
    const wearOffset = input.wear_offset_mm ?? 0;
    const gageLine = input.gage_line_to_spindle_mm ?? 0;

    const dT = machTemp - preTemp;

    // Thermal correction for tool length
    // Tool + holder both expand
    const toolCTE = CTE[toolMat] ?? 6;
    const holderCTE = CTE[holderMat] ?? 12;
    // Estimate: 60% of length is holder, 40% is tool
    const holderLen = measLen * 0.6;
    const toolLen = measLen * 0.4;
    const thermalGrowth =
      (holderCTE * holderLen * dT / 1000) +
      (toolCTE * toolLen * dT / 1000);
    // Result in mm (CTE is µm/m/°C, length in mm → /1000 for m, result in µm → /1000 for mm)
    const thermalCorr = thermalGrowth / 1000;

    // Compensated length
    const compLen = measLen + thermalCorr - wearOffset;

    // Length offset (H value)
    const lengthOffset = compLen + gageLine;

    // Length delta from programmed
    const lengthDelta = compLen - progLen;

    // Effective diameter (runout adds to radius on each side)
    const effDia = measDia + 2 * tir;

    // Compensated diameter
    const compDia = effDia - wearOffset;

    // Diameter offset (D value = difference from programmed)
    const diaOffset = measDia > 0 ? compDia - progDia : 0;

    // Measurement uncertainty budget (RSS)
    const preAccMm = preAcc / 1000;
    const thermalUnc = Math.abs(thermalCorr) * 0.2; // 20% uncertainty on thermal
    const tirUnc = tir * 0.5; // 50% uncertainty on TIR measurement
    const totalUnc = Math.sqrt(
      preAccMm ** 2 + thermalUnc ** 2 + tirUnc ** 2
    );

    // Measurement confidence (based on uncertainty vs tolerance)
    // Assume typical ±0.025mm tolerance
    const typicalTol = 0.025;
    const confidence = totalUnc < typicalTol
      ? Math.min(100, (1 - totalUnc / typicalTol) * 100)
      : Math.max(0, 50 - (totalUnc - typicalTol) * 1000);

    // Initial wear offset recommendation
    const initWear = toolMat === "hss" ? 0.010
      : toolMat === "carbide" ? 0.005
      : toolMat === "ceramic" ? 0.003
      : 0.005;

    // Warnings
    if (Math.abs(thermalCorr) > 0.010) {
      warnings.push(
        `Thermal correction ${r4(thermalCorr)}mm is significant — ` +
        "ensure machine is warmed up"
      );
    }
    if (tir > 0.015) {
      warnings.push(
        `TIR ${tir}mm is high — ` +
        "check holder/collet condition"
      );
    }
    if (totalUnc > 0.020) {
      warnings.push(
        `Total uncertainty ${r4(totalUnc)}mm may exceed tolerance — ` +
        "use precision presetter"
      );
    }
    if (Math.abs(lengthDelta) > 0.5) {
      warnings.push(
        `Length delta ${r3(lengthDelta)}mm from programmed — ` +
        "verify correct tool is loaded"
      );
    }
    if (dT > 8) {
      warnings.push(
        `${dT}°C temperature difference — ` +
        "thermal compensation critical"
      );
    }
    if (preAcc > 8) {
      warnings.push(
        "Presetter accuracy >8µm — consider calibration"
      );
    }

    return {
      length_offset: av(r4(lengthOffset), "mm", r4(totalUnc),
        "Measured + thermal - wear + gage"),
      diameter_offset: av(r4(diaOffset), "mm", r4(totalUnc),
        "Effective dia - programmed"),
      thermal_correction: av(r4(thermalCorr), "mm", r4(thermalUnc),
        `ΔT=${dT}°C, α_tool=${toolCTE}, α_holder=${holderCTE}`),
      effective_diameter: av(r4(effDia), "mm", r4(tirUnc),
        `${measDia} + 2×${tir} TIR`),
      length_delta: av(r4(lengthDelta), "mm", r4(totalUnc),
        "Compensated - programmed"),
      total_uncertainty: av(r4(totalUnc), "mm", 0,
        "RSS(presetter, thermal, TIR)"),
      initial_wear_offset: av(initWear, "mm", 0.002,
        `${toolMat} recommendation`),
      compensated_length: av(r4(compLen), "mm", r4(totalUnc),
        "Measured + thermal - wear"),
      compensated_diameter: av(r4(compDia), "mm", r4(totalUnc),
        "Effective - wear"),
      measurement_confidence: av(r1(confidence), "%", 2,
        "Based on uncertainty vs ±0.025mm tolerance"),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const toolPresettingEngine = new ToolPresettingEngine();
