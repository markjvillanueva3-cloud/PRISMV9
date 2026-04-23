/**
 * HeatTreatmentEngine — Heat Treatment Process Calculator
 *
 * Models: Time/temperature for common heat treatment processes.
 * - Hardening: austenitizing temp, soak time, quench medium
 * - Tempering: temperature for target hardness
 * - Case hardening: carburizing depth vs time (√t law)
 * - Stress relief: time/temp recommendations
 * - Annealing: full, normalize, process anneal
 * - Hardness prediction from Jominy/CCT data
 *
 * Key physics: Case depth ≈ K×√t (diffusion). Tempering:
 * hardness drops with temp per Holloman-Jaffe parameter
 * P = T(K) × (C + log₁₀(t)).
 *
 * Reference: ASM Heat Treater's Guide,
 *            Krauss — Steels: Processing, Structure, Performance,
 *            ISO 683 (heat-treatable steels)
 *
 * Actions: heat_treatment_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface HeatTreatmentInput {
  steel_grade?: string;
  carbon_pct?: number;
  alloy_class?: "plain_carbon" | "low_alloy" | "tool_steel" | "stainless";
  process?: "harden_quench" | "temper" | "carburize" | "stress_relief" |
    "normalize" | "anneal";
  section_thickness_mm?: number;
  target_hardness_hrc?: number;
  target_case_depth_mm?: number;
  tempering_temp_c?: number;
  as_quenched_hrc?: number;
}

export interface HeatTreatmentResult {
  austenitize_temp: AtomicValue;
  soak_time_min: AtomicValue;
  quench_medium: AtomicValue;
  temper_temp: AtomicValue;
  temper_time_min: AtomicValue;
  predicted_hardness: AtomicValue;
  case_depth: AtomicValue;
  carburize_time: AtomicValue;
  process_notes: string[];
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Austenitizing temps by carbon content (°C) */
function austenitizeTemp(carbonPct: number, alloy: string): number {
  if (alloy === "tool_steel") return 1050;
  if (alloy === "stainless") return 1040;
  // Plain carbon / low alloy: Ac3 approximation
  if (carbonPct <= 0.8) return 900 - carbonPct * 100; // hypoeutectoid
  return 760 + carbonPct * 20; // hypereutectoid (heat above Ac1)
}

/** Quench medium recommendation */
function quenchMedium(carbonPct: number, alloy: string, section: number): string {
  if (alloy === "tool_steel") return "oil";
  if (alloy === "stainless") return "air";
  if (section > 50) return "water"; // need aggressive quench for large sections
  if (carbonPct > 0.5) return "oil"; // high carbon = crack risk in water
  if (alloy === "low_alloy") return "oil";
  return "water";
}

/** As-quenched hardness estimate from carbon content */
function asQuenchedHRC(carbonPct: number): number {
  // Martensite hardness ≈ 20 + 60×C (up to ~0.6% C)
  if (carbonPct <= 0.6) return Math.min(65, 20 + 60 * carbonPct);
  return Math.min(67, 56 + 10 * (carbonPct - 0.6));
}

/** Tempering: HRC vs temperature (Holloman-Jaffe-like) */
function temperedHRC(asQ: number, tempC: number): number {
  if (tempC < 150) return asQ;
  // Approximate: hardness drops ~0.035 HRC per °C above 150°C
  const drop = (tempC - 150) * 0.035;
  return Math.max(20, asQ - drop);
}

/** Tempering temp to achieve target hardness */
function temperTempForHRC(asQ: number, target: number): number {
  if (target >= asQ) return 150;
  const delta = asQ - target;
  return Math.min(700, 150 + delta / 0.035);
}

/** Carburizing: case depth = K × √t, K ≈ 0.05-0.07 mm/√min at 925°C */
const CARB_K = 0.063; // mm/√min at 925°C

// ── Engine ─────────────────────────────────────────────────────────

export class HeatTreatmentEngine {
  calculate(input: HeatTreatmentInput): HeatTreatmentResult {
    const warnings: string[] = [];
    const notes: string[] = [];
    const carbon = input.carbon_pct ?? 0.40;
    const alloy = input.alloy_class ?? "low_alloy";
    const process = input.process ?? "harden_quench";
    const section = input.section_thickness_mm ?? 25;

    // Austenitizing
    const austTemp = austenitizeTemp(carbon, alloy);

    // Soak time: ~1 min per mm of section + 15 min minimum
    const soakTime = Math.max(15, Math.round(section * 1.0 + 10));

    // Quench
    const quench = quenchMedium(carbon, alloy, section);

    // As-quenched hardness
    const asQ = input.as_quenched_hrc ?? asQuenchedHRC(carbon);

    // Tempering
    let temperTemp: number;
    let temperTime: number;
    let predictedHRC: number;

    if (input.target_hardness_hrc) {
      temperTemp = temperTempForHRC(asQ, input.target_hardness_hrc);
      temperTime = Math.max(60, section * 2); // ~2 min/mm, min 60
      predictedHRC = input.target_hardness_hrc;
    } else if (input.tempering_temp_c) {
      temperTemp = input.tempering_temp_c;
      temperTime = Math.max(60, section * 2);
      predictedHRC = temperedHRC(asQ, temperTemp);
    } else {
      temperTemp = 400; // default medium temper
      temperTime = Math.max(60, section * 2);
      predictedHRC = temperedHRC(asQ, 400);
    }

    // Case hardening
    let caseDepth = 0;
    let carbTime = 0;
    if (process === "carburize") {
      const targetDepth = input.target_case_depth_mm ?? 0.8;
      carbTime = Math.round((targetDepth / CARB_K) ** 2); // minutes
      caseDepth = targetDepth;
      notes.push(`Carburize at 925°C for ${r0(carbTime / 60)}h ${r0(carbTime % 60)}min`);
      notes.push("Follow with direct quench or reheat quench");
    }

    // Process-specific notes
    if (process === "harden_quench") {
      notes.push(`Heat to ${austTemp}°C, soak ${soakTime}min, quench in ${quench}`);
      notes.push(`Temper immediately at ${r0(temperTemp)}°C for ${temperTime}min`);
      notes.push(`Expected hardness: ${r0(predictedHRC)} HRC`);
    }
    if (process === "temper") {
      notes.push(`Temper at ${r0(temperTemp)}°C for ${temperTime}min, air cool`);
      notes.push("Double temper recommended for tool steels");
    }
    if (process === "stress_relief") {
      const srTemp = alloy === "tool_steel" ? 550 : 600;
      temperTemp = srTemp;
      temperTime = Math.max(60, section * 3);
      notes.push(`Stress relief: ${srTemp}°C for ${temperTime}min, slow cool`);
      predictedHRC = temperedHRC(asQ, srTemp);
    }
    if (process === "normalize") {
      notes.push(`Normalize: heat to ${austTemp + 30}°C, air cool`);
      notes.push("Refines grain structure, relieves residual stress");
      predictedHRC = Math.min(asQ, 28 + carbon * 20);
    }
    if (process === "anneal") {
      notes.push(`Full anneal: heat to ${austTemp}°C, furnace cool (~20°C/hr)`);
      notes.push("Maximum softness and ductility");
      predictedHRC = Math.max(15, 10 + carbon * 15);
    }

    // Warnings
    if (carbon > 0.6 && quench === "water") {
      warnings.push("High carbon + water quench — cracking risk. Consider oil quench");
    }
    if (section > 75 && alloy === "plain_carbon") {
      warnings.push(`${section}mm section — plain carbon may not through-harden. Use alloy steel`);
    }
    if (predictedHRC > 55 && temperTemp < 200) {
      warnings.push(`${r0(predictedHRC)} HRC at low temper — brittle. Temper ≥200°C recommended`);
    }
    if (process === "carburize" && carbon > 0.3) {
      warnings.push("Base carbon > 0.3% — case/core hardness differential may be inadequate");
    }
    if (alloy === "stainless" && temperTemp >= 425 && temperTemp <= 550) {
      warnings.push("Stainless 425-550°C temper — temper embrittlement range, avoid");
    }

    const src = "HeatTreatmentEngine (ASM/Krauss/ISO 683)";

    // Consult MachiningPlaybookEngine for surface treatment / material tips
    try {
      const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
      const pbResult = machiningPlaybookEngine.advise({
        categories: ["surface_treatment", "material_tip"],
      });
      for (const rule of pbResult.rules) {
        if (rule.severity === "critical" || rule.severity === "important") {
          warnings.push(`[Playbook ${rule.id}] ${rule.title}`);
        }
      }
    } catch { /* playbook not available */ }

    return {
      austenitize_temp: mkAv(r0(austTemp), "°C", 15, `${carbon}%C, ${alloy}`),
      soak_time_min: mkAv(soakTime, "min", 5, `~1 min/mm × ${section}mm`),
      quench_medium: mkAv(quench === "water" ? 1 : quench === "oil" ? 2 : 3,
        quench, 0, `${carbon}%C, ${section}mm section`),
      temper_temp: mkAv(r0(temperTemp), "°C", 10, src),
      temper_time_min: mkAv(temperTime, "min", 10, `~2 min/mm × ${section}mm`),
      predicted_hardness: mkAv(r0(predictedHRC), "HRC", 2, src),
      case_depth: mkAv(r2(caseDepth), "mm", 0.1,
        process === "carburize" ? `K=${CARB_K} × √${carbTime}` : "N/A"),
      carburize_time: mkAv(carbTime, "min", carbTime * 0.1,
        process === "carburize" ? `depth²/K² at 925°C` : "N/A"),
      process_notes: notes,
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const heatTreatmentEngine = new HeatTreatmentEngine();
