/**
 * CoolantStrategyAdapter — CAMX-MS0.3 / U-CAMX06
 *
 * Replaces HARDCODED "if material === steel use flood" and HEURISTIC coolant
 * decisions across PrintToProgram, Turning, Grinding, and Laser gas-assist
 * selection with a candidate-ranked physics + ISO-group-aware recommender
 * routed through PipelineDecisionOrchestrator.
 *
 * Candidate catalog covers:
 *   - flood (water-soluble)   — general purpose wet cutting
 *   - HPC through-spindle     — deep holes, HRSA, chip flush
 *   - MQL (mist lubrication)  — near-dry for titanium / aluminum finish
 *   - air blast               — aluminum, dry cutting
 *   - dry                     — cast iron, brittle materials
 *   - dielectric (EDM)        — all EDM flushing (selected for EDM only)
 *   - N2 / O2 / air / Ar      — laser assist-gas picks
 *
 * Physics selection rules (Kennametal / Sandvik / GF / TRUMPF guidelines):
 *   - ISO N (aluminum): MQL, air, flood with anti-BUE additives
 *   - ISO K (cast iron): dry > air (inverted)
 *   - ISO S (HRSA / superalloy): flood + HPC only; never MQL (BUE risk)
 *   - ISO H (hardened): dry or MQL (finishing); flood risky (thermal cracks)
 *   - ISO P/M: flood default; HPC for deep holes
 *   - EDM: always dielectric (wire → deionized water; sinker → oil)
 *   - Laser: mild steel → O2; stainless → N2 (high-P); Al → N2 or air
 *
 * Call sites
 *   PrintToProgram.selectCoolantMode()        → "p2p.coolant_mode"
 *   Turning.selectCoolantMethod()             → "turn.coolant_method"
 *   Grinding.selectCoolantMethod()            → "gr.coolant_method"
 *   Laser.selectAssistGas()                   → "la.gas_select"
 */

import { pipelineDecisionOrchestratorEngine } from "./PipelineDecisionOrchestratorEngine.js";

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type CoolantDomain = "machining" | "edm" | "laser" | "grinding";

export interface CoolantCandidate {
  id: string;
  name: string;
  delivery: "flood" | "hpc" | "mql" | "air" | "dry" | "dielectric" | "gas";
  fluid: "water_soluble" | "emulsion" | "synthetic" | "vegetable_oil" | "air" | "none" | "deionized_water" | "edm_oil" | "O2" | "N2" | "Ar";
  pressure_bar: number; // 0 for dry/air/MQL
  thermal_capacity_w_m2K: number; // bulk heat-removal rate estimate
  chip_evac_score: number; // 0..1 — how well it clears chips
  cost_index: number; // 1..5
  environmental_index: number; // 1..5 (5 = greenest)
  applicable_iso: Array<"P" | "M" | "K" | "N" | "S" | "H" | "any">;
  applicable_ops: string[]; // "rough","finish","drill","thread","turn","grind","laser","edm"
  source: string;
}

export interface OrchestratedCoolantRequest {
  decision_point: string;
  domain?: CoolantDomain;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  material_name?: string;
  operation_type?: "rough" | "finish" | "drill" | "thread" | "turn" | "grind" | "laser_cut" | "edm_cut";
  cutting_temp_c?: number;
  depth_over_diameter?: number; // deep holes (L/D>5) bias toward HPC
  hrsa_flag?: boolean; // Heat-Resistant Super Alloy (Inconel, Ti-6Al-4V)
  environmental_bias?: boolean; // prefer MQL / dry where safe
  pipeline_stage?: string;
  caller?: string;
  objective?: "speed" | "quality" | "cost" | "balanced" | "tool_life";
  explain?: boolean;
}

export interface OrchestratedCoolantDecision {
  coolant: CoolantCandidate;
  decision: any;
  no_candidates: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// Catalog
// ────────────────────────────────────────────────────────────────────────

const MACHINING: CoolantCandidate[] = [
  {
    id: "FLOOD-water-soluble",
    name: "Flood water-soluble emulsion (5-10%)",
    delivery: "flood",
    fluid: "water_soluble",
    pressure_bar: 2,
    thermal_capacity_w_m2K: 5000,
    chip_evac_score: 0.7,
    cost_index: 2,
    environmental_index: 2,
    applicable_iso: ["P", "M", "K", "S"],
    applicable_ops: ["rough", "finish", "drill", "thread", "turn", "grind"],
    source: "Sandvik Coolant Guide",
  },
  {
    id: "HPC-through-spindle",
    name: "High-pressure coolant through spindle (70+ bar)",
    delivery: "hpc",
    fluid: "synthetic",
    pressure_bar: 70,
    thermal_capacity_w_m2K: 9000,
    chip_evac_score: 0.95,
    cost_index: 4,
    environmental_index: 2,
    applicable_iso: ["P", "M", "S"],
    applicable_ops: ["rough", "drill", "turn"],
    source: "Kennametal HPC Technical Bulletin",
  },
  {
    id: "MQL",
    name: "Minimum Quantity Lubrication (vegetable oil mist)",
    delivery: "mql",
    fluid: "vegetable_oil",
    pressure_bar: 0.5,
    thermal_capacity_w_m2K: 300,
    chip_evac_score: 0.4,
    cost_index: 3,
    environmental_index: 5,
    applicable_iso: ["N", "H", "K"],
    applicable_ops: ["finish", "drill", "thread"],
    source: "Walter MQL Guide",
  },
  {
    id: "AIR",
    name: "Air blast (compressed dry air)",
    delivery: "air",
    fluid: "air",
    pressure_bar: 6,
    thermal_capacity_w_m2K: 80,
    chip_evac_score: 0.75,
    cost_index: 1,
    environmental_index: 5,
    applicable_iso: ["N", "K"],
    applicable_ops: ["rough", "finish"],
    source: "ISCAR aluminum guide",
  },
  {
    id: "DRY",
    name: "Dry cutting (no coolant)",
    delivery: "dry",
    fluid: "none",
    pressure_bar: 0,
    thermal_capacity_w_m2K: 10,
    chip_evac_score: 0.3,
    cost_index: 1,
    environmental_index: 5,
    applicable_iso: ["K", "H"],
    applicable_ops: ["finish", "turn"],
    source: "Kennametal hardened-steel turning",
  },
];

const EDM: CoolantCandidate[] = [
  {
    id: "DIELECTRIC-deionized",
    name: "Deionized water dielectric (wire EDM)",
    delivery: "dielectric",
    fluid: "deionized_water",
    pressure_bar: 12,
    thermal_capacity_w_m2K: 4000,
    chip_evac_score: 0.9,
    cost_index: 2,
    environmental_index: 4,
    applicable_iso: ["P", "M", "K", "S", "H"],
    applicable_ops: ["edm_cut"],
    source: "GF AgieCharmilles Wire EDM",
  },
  {
    id: "DIELECTRIC-edm-oil",
    name: "Hydrocarbon dielectric oil (sinker EDM)",
    delivery: "dielectric",
    fluid: "edm_oil",
    pressure_bar: 4,
    thermal_capacity_w_m2K: 2500,
    chip_evac_score: 0.85,
    cost_index: 3,
    environmental_index: 2,
    applicable_iso: ["P", "M", "S", "H"],
    applicable_ops: ["edm_cut"],
    source: "Mitsubishi Sinker EDM",
  },
];

const LASER: CoolantCandidate[] = [
  {
    id: "GAS-N2-high-P",
    name: "N2 at 20+ bar (clean cut stainless / aluminum)",
    delivery: "gas",
    fluid: "N2",
    pressure_bar: 20,
    thermal_capacity_w_m2K: 0,
    chip_evac_score: 0.9,
    cost_index: 4,
    environmental_index: 4,
    applicable_iso: ["M", "N"],
    applicable_ops: ["laser_cut"],
    source: "TRUMPF Laser Guide",
  },
  {
    id: "GAS-O2",
    name: "O2 at 1-3 bar (oxidation-assisted mild steel)",
    delivery: "gas",
    fluid: "O2",
    pressure_bar: 2,
    thermal_capacity_w_m2K: 0,
    chip_evac_score: 0.8,
    cost_index: 2,
    environmental_index: 3,
    applicable_iso: ["P"],
    applicable_ops: ["laser_cut"],
    source: "Bystronic Laser Guide",
  },
  {
    id: "GAS-air",
    name: "Compressed air (thin mild steel / Al)",
    delivery: "gas",
    fluid: "air",
    pressure_bar: 8,
    thermal_capacity_w_m2K: 0,
    chip_evac_score: 0.7,
    cost_index: 1,
    environmental_index: 5,
    applicable_iso: ["P", "N"],
    applicable_ops: ["laser_cut"],
    source: "Amada Laser Guide",
  },
  {
    id: "GAS-Ar",
    name: "Argon (reactive metals — Ti / Zr)",
    delivery: "gas",
    fluid: "Ar",
    pressure_bar: 10,
    thermal_capacity_w_m2K: 0,
    chip_evac_score: 0.85,
    cost_index: 5,
    environmental_index: 4,
    applicable_iso: ["S"],
    applicable_ops: ["laser_cut"],
    source: "TRUMPF — reactive-metal cutting",
  },
];

const GRINDING: CoolantCandidate[] = [
  {
    id: "GR-FLOOD",
    name: "Grinding flood (high-flow emulsion)",
    delivery: "flood",
    fluid: "emulsion",
    pressure_bar: 2,
    thermal_capacity_w_m2K: 5500,
    chip_evac_score: 0.8,
    cost_index: 2,
    environmental_index: 2,
    applicable_iso: ["P", "M", "K", "S", "H"],
    applicable_ops: ["grind"],
    source: "Norton Grinding Handbook",
  },
  {
    id: "GR-MIST",
    name: "Grinding mist (light lubrication)",
    delivery: "mql",
    fluid: "synthetic",
    pressure_bar: 0.5,
    thermal_capacity_w_m2K: 400,
    chip_evac_score: 0.3,
    cost_index: 3,
    environmental_index: 4,
    applicable_iso: ["N", "H"],
    applicable_ops: ["grind"],
    source: "Walter Grinding Mist Guide",
  },
  {
    id: "GR-HPC",
    name: "High-pressure creep-feed grinding (15+ bar, 200+ L/min)",
    delivery: "hpc",
    fluid: "synthetic",
    pressure_bar: 20,
    thermal_capacity_w_m2K: 9500,
    chip_evac_score: 0.95,
    cost_index: 4,
    environmental_index: 2,
    applicable_iso: ["S", "H", "P"],
    applicable_ops: ["grind"],
    source: "Blohm creep-feed specification",
  },
];

function selectDomain(req: OrchestratedCoolantRequest): CoolantCandidate[] {
  const dp = req.decision_point;
  if (dp === "edm.flushing_pressure" || dp === "edm.dielectric_conductivity" || req.domain === "edm") return EDM;
  if (dp === "la.gas_select" || req.domain === "laser") return LASER;
  if (dp === "gr.coolant_method" || req.domain === "grinding") return GRINDING;
  return MACHINING;
}

// ────────────────────────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────────────────────────

function score(c: CoolantCandidate, req: OrchestratedCoolantRequest): Record<string, number> {
  const iso = req.material_iso_group;
  const op = req.operation_type;
  const temp = req.cutting_temp_c ?? 0;
  const lod = req.depth_over_diameter ?? 0;

  // optimal_performance ← thermal + chip evac + hot-application boost
  let perf = 0.3 + 0.3 * c.chip_evac_score;
  if (c.thermal_capacity_w_m2K >= 4000) perf += 0.15;
  if (temp > 600 && c.delivery === "hpc") perf += 0.15;
  if (lod > 5 && c.delivery === "hpc") perf += 0.2;
  perf = Math.max(0, Math.min(1, perf));

  // logical_consistency ← iso + operation + HRSA flag
  let logical = 0.5;
  const isoMatch = iso && (c.applicable_iso.includes(iso) || c.applicable_iso.includes("any"));
  if (isoMatch) logical += 0.25;
  // Hard penalty when iso is declared but not supported — chemistry-critical
  // for laser gas and HRSA cutting.
  if (iso && !isoMatch && c.applicable_iso.length > 0) logical -= 0.45;
  if (op && c.applicable_ops.includes(op)) logical += 0.2;
  if (req.hrsa_flag && (c.delivery === "flood" || c.delivery === "hpc")) logical += 0.1;
  if (req.hrsa_flag && c.delivery === "mql") logical -= 0.4; // MQL is unsafe on HRSA
  logical = Math.max(0, Math.min(1, logical));

  // safety ← anti-BUE + thermal-shock avoidance + ISO-chemistry mismatch
  let safety = 0.7;
  if (iso === "H" && c.delivery === "flood") safety -= 0.3; // cracks hardened tool
  if (iso === "N" && c.delivery === "dry") safety -= 0.2; // BUE risk
  if (iso === "K" && c.delivery === "flood") safety -= 0.1; // slurry concerns
  if (req.hrsa_flag && c.delivery === "mql") safety -= 0.5;
  if (req.hrsa_flag && c.delivery === "hpc") safety += 0.15;
  // Chemistry-critical mismatch (gas-assist laser especially) — wrong gas on
  // reactive / stainless risks poor edge quality or combustion
  if (iso && !isoMatch && c.applicable_iso.length > 0) {
    safety -= c.delivery === "gas" ? 0.55 : 0.25;
  }
  safety = Math.max(0, Math.min(1, safety));

  // cost_efficiency ← inverse of cost_index
  const cost = 1 - (c.cost_index - 1) / 5;

  // robustness ← environmental index (capped) + iso overlap breadth
  const env = c.environmental_index / 5;
  const breadth = Math.min(1, c.applicable_iso.length / 6);
  const robust = req.environmental_bias ? 0.5 * env + 0.3 * breadth : 0.3 * env + 0.5 * breadth;

  return {
    optimal_performance: perf,
    logical_consistency: logical,
    safety,
    cost_efficiency: cost,
    robustness: Math.max(0, Math.min(1, robust + 0.2)),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Engine / adapter
// ────────────────────────────────────────────────────────────────────────

export class CoolantStrategyAdapter {
  selectCoolantOrchestrated(req: OrchestratedCoolantRequest): OrchestratedCoolantDecision {
    const catalog = selectDomain(req);

    // Hard filter: drop entries that are fundamentally inapplicable to the op
    const viable = catalog.filter(
      (c) =>
        !req.operation_type ||
        c.applicable_ops.includes(req.operation_type) ||
        c.applicable_ops.includes("any" as any),
    );

    if (viable.length === 0) {
      return { coolant: null as any, decision: null, no_candidates: true };
    }

    const candidates = viable.map((c) => ({
      id: c.id,
      label: c.name,
      data: {
        delivery: c.delivery,
        fluid: c.fluid,
        pressure_bar: c.pressure_bar,
        thermal_capacity_w_m2K: c.thermal_capacity_w_m2K,
        chip_evac_score: c.chip_evac_score,
        cost_index: c.cost_index,
        environmental_index: c.environmental_index,
        applicable_iso: c.applicable_iso,
      },
      pre_scores: score(c, req),
    }));

    const decision = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "coolant_select",
      context: {
        material: { iso_group: req.material_iso_group, name: req.material_name },
        operation: req.operation_type,
        thermal: { cutting_temp_c: req.cutting_temp_c },
        hole: { depth_over_diameter: req.depth_over_diameter },
        flags: { hrsa: req.hrsa_flag, environmental_bias: req.environmental_bias },
      },
      candidates,
      objective: req.objective ?? "balanced",
      explain: req.explain ?? false,
      pipeline_stage: req.pipeline_stage,
      caller: req.caller,
      constraints: { max_cost_index: 5 },
    });

    const winnerId = decision?.choice?.id;
    const winner = viable.find((c) => c.id === winnerId) ?? viable[0];

    return { coolant: winner, decision, no_candidates: false };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Singleton
// ────────────────────────────────────────────────────────────────────────
export const coolantStrategyAdapter = new CoolantStrategyAdapter();
