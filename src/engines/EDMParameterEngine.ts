/**
 * EDMParameterEngine — Electrical Discharge Machining Calculator
 *
 * Models: Wire EDM and sinker EDM process parameters.
 * - Material removal rate from discharge energy
 * - Surface roughness: Ra = k_ra × I_p^0.40 × t_on^0.28 [Klocke 2013 canonical]
 * - Electrode wear ratio
 * - Gap voltage and current settings
 * - Flushing requirements
 * - Wire speed and tension (wire EDM)
 *
 * Key physics: MRR ∝ I × ton × f (current × on-time × frequency).
 * Ra ∝ I^a × ton^b. Electrode wear ∝ 1/melting_point_ratio.
 *
 * Reference: Jameson — Electrical Discharge Machining,
 *            CIRP Annals EDM process models,
 *            Sodick/Makino EDM technical guides
 *
 * Actions: edm_parameter_calc
 */

import { klockeRa } from "./utils/klockeRa.js";

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface EDMParameterInput {
  edm_type?: "wire" | "sinker" | "hole_drill";
  workpiece_material?: "steel" | "carbide" | "titanium" | "aluminum" | "copper" | "inconel";
  workpiece_thickness_mm?: number;
  target_roughness_ra_um?: number;
  electrode_material?: "copper" | "graphite" | "brass_wire" | "tungsten";
  cut_type?: "roughing" | "semi_finish" | "finishing" | "micro";
  wire_diameter_mm?: number;
  required_accuracy_mm?: number;
}

export interface EDMParameterResult {
  peak_current: AtomicValue;
  pulse_on_time: AtomicValue;
  pulse_off_time: AtomicValue;
  gap_voltage: AtomicValue;
  mrr: AtomicValue;
  surface_roughness: AtomicValue;
  electrode_wear_ratio: AtomicValue;
  wire_speed: AtomicValue;
  wire_tension: AtomicValue;
  flushing_pressure: AtomicValue;
  estimated_time: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Material machinability factor (relative to steel = 1.0) */
const MAT_FACTOR: Record<string, number> = {
  steel: 1.0, carbide: 0.6, titanium: 0.8,
  aluminum: 1.5, copper: 1.3, inconel: 0.7,
};

/** Electrode wear ratio by electrode/workpiece combo */
const WEAR_RATIO: Record<string, Record<string, number>> = {
  copper: { steel: 0.3, carbide: 0.5, titanium: 0.4, aluminum: 0.2, copper: 0.6, inconel: 0.5 },
  graphite: { steel: 0.1, carbide: 0.3, titanium: 0.2, aluminum: 0.15, copper: 0.2, inconel: 0.3 },
  brass_wire: { steel: 0.8, carbide: 1.0, titanium: 0.9, aluminum: 0.5, copper: 1.0, inconel: 0.9 },
  tungsten: { steel: 0.05, carbide: 0.1, titanium: 0.08, aluminum: 0.04, copper: 0.1, inconel: 0.1 },
};

/** Cut parameters by type: [current_A, ton_us, toff_us, voltage_V] */
const CUT_PARAMS: Record<string, [number, number, number, number]> = {
  roughing:    [25, 200, 100, 60],
  semi_finish: [10, 50, 40, 50],
  finishing:   [3, 10, 20, 40],
  micro:       [0.5, 2, 10, 30],
};

// ── Engine ─────────────────────────────────────────────────────────

export class EDMParameterEngine {
  calculate(input: EDMParameterInput): EDMParameterResult {
    const warnings: string[] = [];
    const edmType = input.edm_type ?? "wire";
    const matKey = input.workpiece_material ?? "steel";
    const thickness = input.workpiece_thickness_mm ?? 25;
    const cutType = input.cut_type ?? "roughing";
    const elecMat = input.electrode_material ?? (edmType === "wire" ? "brass_wire" : "graphite");
    const wireD = input.wire_diameter_mm ?? 0.25;

    const matFactor = MAT_FACTOR[matKey] ?? 1.0;
    const [baseI, baseTon, baseToff, baseV] = CUT_PARAMS[cutType] ?? CUT_PARAMS.roughing;

    // Adjust for material
    const peakI = baseI / matFactor;
    const ton = baseTon;
    const toff = baseToff * (1 / matFactor);
    const voltage = baseV;

    // MRR: mm³/min ≈ K × I × ton × f × matFactor
    // f = 1/(ton + toff) in MHz → cycles/µs
    const freq = 1e6 / (ton + toff); // Hz
    const mrrConst = edmType === "wire" ? 0.0001 : 0.0003;
    const mrr = mrrConst * peakI * ton * freq / 1e6 * matFactor; // mm³/min

    // Surface roughness: Klocke/Puertas&Luis via shared klockeRa() utility
    const ra = klockeRa(peakI, ton, matKey);

    // Override Ra if target specified
    let actualRa = ra;
    if (input.target_roughness_ra_um && ra > input.target_roughness_ra_um * 1.5) {
      warnings.push(
        `Predicted Ra ${r2(ra)}µm > target ${input.target_roughness_ra_um}µm — ` +
        "additional finish passes needed"
      );
    }

    // Electrode wear
    const wearTable = WEAR_RATIO[elecMat] ?? WEAR_RATIO.graphite;
    const wearRatio = wearTable[matKey] ?? 0.3;

    // Wire EDM specific
    let wireSpeed = 0;
    let wireTension = 0;
    if (edmType === "wire") {
      wireSpeed = cutType === "roughing" ? 12 : cutType === "finishing" ? 6 : 9; // m/min
      wireTension = wireD < 0.15 ? 8 : wireD < 0.25 ? 12 : 18; // N
    }

    // Flushing pressure
    const flushBar = cutType === "roughing" ? 8 :
      cutType === "semi_finish" ? 5 : 2;

    // Estimated time
    let estTime = 0;
    if (edmType === "wire") {
      // Wire EDM: time = perimeter_cut / linear_speed
      // Linear speed ≈ MRR / (thickness × wire_kerf)
      const kerf = wireD + 0.05; // mm gap each side
      const linearSpeed = mrr / (thickness * kerf); // mm/min
      estTime = thickness > 0 ? thickness / Math.max(linearSpeed, 0.01) : 0;
    } else {
      // Sinker: time = volume / MRR
      estTime = thickness > 0 ? (thickness * 10 * 10) / Math.max(mrr, 0.01) : 0;
    }

    // Warnings
    if (matKey === "aluminum" && edmType === "sinker") {
      warnings.push("Aluminum EDM — risk of electrode adhesion, use kerosene dielectric");
    }
    if (matKey === "carbide" && cutType === "roughing") {
      warnings.push("Carbide roughing — reduce current to prevent micro-cracking");
    }
    if (thickness > 100 && edmType === "wire") {
      warnings.push(`${thickness}mm thickness — slow wire speed, verify flushing adequacy`);
    }
    if (cutType === "micro" && wireD > 0.15) {
      warnings.push(`Wire ${wireD}mm too large for micro EDM — use ≤0.1mm wire`);
    }

    const src = "EDMParameterEngine (Sodick/Makino reference)";

    return {
      peak_current: mkAv(r1(peakI), "A", peakI * 0.1, `${cutType} on ${matKey}`),
      pulse_on_time: mkAv(r0(ton), "µs", ton * 0.1, cutType),
      pulse_off_time: mkAv(r0(toff), "µs", toff * 0.1, cutType),
      gap_voltage: mkAv(voltage, "V", 5, src),
      mrr: mkAv(r3(mrr), "mm³/min", mrr * 0.2, src),
      surface_roughness: mkAv(r2(actualRa), "µm Ra", actualRa * 0.15, "Klocke 2013: k_ra × I^0.40 × t_on^0.28"),
      electrode_wear_ratio: mkAv(r2(wearRatio), "%/vol", 0.05,
        `${elecMat} on ${matKey}`),
      wire_speed: mkAv(wireSpeed, "m/min", 1,
        edmType === "wire" ? cutType : "N/A"),
      wire_tension: mkAv(wireTension, "N", 2,
        edmType === "wire" ? `${wireD}mm wire` : "N/A"),
      flushing_pressure: mkAv(flushBar, "bar", 1, cutType),
      estimated_time: mkAv(r1(estTime), "min", estTime * 0.3, src),
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

export const edmParameterEngine = new EDMParameterEngine();
