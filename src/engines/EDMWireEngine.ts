/**
 * EDMWireEngine — Wire EDM process analysis
 *
 * Models: MRR from discharge energy, wire tension/speed,
 *         surface finish prediction, taper cutting capability
 * References: Rajurkar, CIRP Annals, Sodick/Mitsubishi specs
 */

import { klockeRa } from "./utils/klockeRa.js";

export type WireType = "brass" | "coated_brass" | "molybdenum" | "tungsten" | "zinc_coated";
export type CuttingMode = "rough" | "semi_finish" | "finish" | "super_finish";

export interface EDMWireInput {
  wire_type?: WireType;
  wire_diameter_mm?: number;          // default 0.25
  workpiece_thickness_mm: number;
  workpiece_hardness_HRC?: number;   // default 50
  discharge_voltage_V?: number;       // default 60
  discharge_current_A?: number;       // default 8
  pulse_on_us?: number;              // default 10
  pulse_off_us?: number;             // default 20
  cutting_mode?: CuttingMode;
  taper_angle_deg?: number;          // default 0
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface EDMWireResult {
  mrr_mm2_min: AtomicValue;
  cutting_speed_mm_min: AtomicValue;
  surface_roughness_Ra_um: AtomicValue;
  gap_width_mm: AtomicValue;
  wire_tension_N: AtomicValue;
  wire_speed_m_min: AtomicValue;
  energy_per_cut_J_mm: AtomicValue;
  max_taper_deg: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Wire data: [tensile_MPa, max_tension_N, speed_m_min, cost_factor]
const WIRE_DATA: Record<WireType, [number, number, number, number]> = {
  brass:         [900, 15, 12, 1.0],
  coated_brass:  [900, 18, 15, 1.5],
  molybdenum:    [2100, 25, 5, 3.0],
  tungsten:      [3400, 30, 3, 5.0],
  zinc_coated:   [900, 16, 14, 1.8],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class EDMWireEngine {
  calculate(input: EDMWireInput): EDMWireResult {
    const {
      wire_type = "brass",
      wire_diameter_mm: dw = 0.25,
      workpiece_thickness_mm: H,
      workpiece_hardness_HRC: HRC = 50,
      discharge_voltage_V: V = 60,
      discharge_current_A: I = 8,
      pulse_on_us: ton = 10,
      pulse_off_us: toff = 20,
      cutting_mode = "rough",
      taper_angle_deg: taper = 0,
    } = input;

    const recs: string[] = [];
    const [tensile, maxTension, wireSpeed, costFactor] = WIRE_DATA[wire_type];

    // Duty cycle
    const dutyCycle = ton / (ton + toff);

    // Discharge energy per pulse
    const E_pulse = V * I * ton * 1e-6; // Joules

    // MRR model (simplified from Rajurkar)
    const modeFactor = cutting_mode === "rough" ? 1.0 :
      cutting_mode === "semi_finish" ? 0.5 :
      cutting_mode === "finish" ? 0.2 : 0.08;
    const MRR = E_pulse * dutyCycle * 1e6 * modeFactor / (H * 0.001 + 0.1) * 0.1; // mm²/min

    // Cutting speed
    const cuttingSpeed = MRR / Math.max(H, 0.1);

    // Surface roughness: Klocke/Puertas&Luis via shared klockeRa() (replaces old E^0.4 formula)
    const Ra = klockeRa(I, ton, "steel");

    // Spark gap
    const gap = dw * 0.05 + 0.01 * Math.sqrt(E_pulse * 1e6);

    // Wire tension (percentage of max)
    const tension = maxTension * (cutting_mode === "rough" ? 0.7 : 0.9);

    // Energy per unit cut length
    const energyPerMm = V * I * dutyCycle / (cuttingSpeed / 60 + 0.001);

    // Max taper based on thickness
    const maxTaper = Math.atan(30 / Math.max(H, 1)) * 180 / Math.PI; // ~30mm UV travel typical

    const isSafe = cuttingSpeed > 0.01 && Ra < 20 && taper <= maxTaper;

    if (H > 300) recs.push(`Thick workpiece ${H}mm — slow cut speed, use high wire tension`);
    if (Ra > 3 && cutting_mode !== "rough") recs.push(`Ra ${Ra.toFixed(2)}µm — add finishing passes`);
    if (dutyCycle > 0.6) recs.push(`High duty cycle ${(dutyCycle * 100).toFixed(0)}% — wire break risk, increase Toff`);
    if (taper > maxTaper * 0.8) recs.push(`Taper ${taper}° near max ${maxTaper.toFixed(1)}° for ${H}mm thick`);
    if (wire_type === "brass" && H > 150) recs.push(`Use coated wire for better flushing on thick cuts`);
    if (recs.length === 0) recs.push(`Wire EDM nominal — ${cuttingSpeed.toFixed(2)}mm/min, Ra=${Ra.toFixed(2)}µm, gap=${gap.toFixed(3)}mm`);

    return {
      mrr_mm2_min: mkAv(Math.round(MRR * 1000) / 1000, "mm²/min", MRR * 0.15, "discharge_energy"),
      cutting_speed_mm_min: mkAv(Math.round(cuttingSpeed * 1000) / 1000, "mm/min", cuttingSpeed * 0.15, "MRR_H"),
      surface_roughness_Ra_um: mkAv(Math.round(Ra * 100) / 100, "µm", Ra * 0.20, "E_pulse"),
      gap_width_mm: mkAv(Math.round(gap * 1000) / 1000, "mm", gap * 0.15, "dw_E"),
      wire_tension_N: mkAv(Math.round(tension * 10) / 10, "N", tension * 0.10, "mode"),
      wire_speed_m_min: mkAv(wireSpeed, "m/min", wireSpeed * 0.10, "wire_type"),
      energy_per_cut_J_mm: mkAv(Math.round(energyPerMm * 100) / 100, "J/mm", energyPerMm * 0.15, "VI_speed"),
      max_taper_deg: mkAv(Math.round(maxTaper * 10) / 10, "°", maxTaper * 0.10, "UV_H"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const edmWireEngine = new EDMWireEngine();
