/**
 * PrismEnhancedRecommenderEngine — pareto-optimal selection over operator's
 * available-resources subset.
 *
 * Given a curated subset of available machines/tools/holders/materials plus part
 * requirements (stock volume, Ra spec, quantity), runs NSGA-II to find the
 * pareto-optimal (cheapest, fastest, balanced) combinations across 5 objectives:
 *   1. cost_usd            (setup + cycle×$/min + tool-amortized)
 *   2. cycle_time_min      (stock_volume / MRR)
 *   3. tool_wear_risk      (cycle_time / Taylor_life — higher = worse)
 *   4. surface_risk        (Brammertz Ra_um / Ra_spec_um — higher = worse)
 *   5. chatter_risk        (proxy from rigidity × holder TIR)
 *
 * Implements SFC-ACCURACY-MS1 §8 (spec: state/shared/specs/SFC-ACCURACY-MS1-DESIGN.md).
 * Wires as prism_calc:prism_enhanced_recommend.
 *
 * Delegates the actual NSGA-II run to the existing `multiObjectiveEngine.nsgaII`
 * (`mcp-server/src/engines/MultiObjectiveEngine.ts`) per R8 (don't reinvent).
 *
 * References:
 *   - Deb, K. "NSGA-II: A fast and elitist multiobjective genetic algorithm" (IEEE TEC 6:2, 2002)
 *   - Brammertz Ra ≈ fz²/(8·r) for finishing turning/milling
 *   - Taylor T = (C/Vc)^(1/n) for tool life
 *   - Sandvik CoroKey machinability factors per ISO group
 *
 * @module engines/PrismEnhancedRecommenderEngine
 */

import { z } from "zod";
import { multiObjectiveEngine } from "./MultiObjectiveEngine.js";

// ────────────────────────────────────────────────────────────────────────────
// CANDIDATE SHAPES
// ────────────────────────────────────────────────────────────────────────────

export const MachineCandidateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  cost_per_min_usd: z.number().positive(),
  rigidity: z.enum(["low", "medium", "high"]),
  max_rpm: z.number().positive(),
  max_power_kw: z.number().positive(),
});
export type MachineCandidate = z.infer<typeof MachineCandidateSchema>;

export const ToolCandidateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  diameter_mm: z.number().positive(),
  flutes: z.number().int().positive(),
  vc_baseline_mpm: z.number().positive(),     // catalog Vc (will be scaled by material)
  fz_baseline_mm: z.number().positive(),
  taylor_C: z.number().positive(),
  taylor_n: z.number().positive().max(1),
  corner_radius_mm: z.number().nonnegative().default(0.4).optional(),
  unit_cost_usd: z.number().positive(),
});
export type ToolCandidate = z.infer<typeof ToolCandidateSchema>;

export const HolderCandidateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  tir_um: z.number().nonnegative(),
  balance_grade: z.number().positive(),       // G2.5, G6.3, …
});
export type HolderCandidate = z.infer<typeof HolderCandidateSchema>;

export const MaterialCandidateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  hardness_hb: z.number().positive(),
  machinability_factor: z.number().min(0.1).max(2.0),   // 1.0 = baseline
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
});
export type MaterialCandidate = z.infer<typeof MaterialCandidateSchema>;

// ────────────────────────────────────────────────────────────────────────────
// INPUT / OUTPUT
// ────────────────────────────────────────────────────────────────────────────

export const PartRequirementsSchema = z.object({
  stock_volume_cm3: z.number().positive(),
  quantity: z.number().int().positive(),
  ra_spec_um: z.number().positive(),
  setup_cost_usd: z.number().nonnegative().default(50),
  axial_depth_mm: z.number().positive().default(2),
  radial_depth_mm: z.number().positive().default(5),
});
export type PartRequirements = z.infer<typeof PartRequirementsSchema>;

export const RecommendInputSchema = z.object({
  resources: z.object({
    machines: z.array(MachineCandidateSchema).min(1),
    tools: z.array(ToolCandidateSchema).min(1),
    holders: z.array(HolderCandidateSchema).min(1),
    materials: z.array(MaterialCandidateSchema).min(1),
  }),
  part: PartRequirementsSchema,
  optimizer: z.object({
    populationSize: z.number().int().min(4).max(500).default(60),
    maxGenerations: z.number().int().min(1).max(500).default(40),
  }).default({ populationSize: 60, maxGenerations: 40 }),
});
export type RecommendInput = z.infer<typeof RecommendInputSchema>;

export interface RecommendCombo {
  machine: MachineCandidate;
  tool: ToolCandidate;
  holder: HolderCandidate;
  material: MaterialCandidate;
  metrics: {
    cost_usd: number;
    cycle_time_min: number;
    tool_wear_risk: number;
    surface_risk: number;
    chatter_risk: number;
  };
}

export interface RecommendResult {
  paretoFront: RecommendCombo[];
  top3: {
    cheapest: RecommendCombo;
    fastest: RecommendCombo;
    balanced: RecommendCombo;
  };
  meta: {
    populationSize: number;
    generations: number;
    paretoFrontSize: number;
    method: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// PHYSICS HELPERS — minimal, deterministic, no I/O
// ────────────────────────────────────────────────────────────────────────────

const RIGIDITY_SCORE: Record<string, number> = { low: 0.5, medium: 0.75, high: 1.0 };

/**
 * Cycle time per part using stock volume and MRR (Material Removal Rate).
 *   MRR = ap × ae × fz × flutes × RPM × 0.001  (mm³/min → cm³/min)
 *   RPM = Vc × 1000 / (π × D)
 *   Vc  = tool.vc_baseline × material.machinability_factor   (m/min)
 *
 * Bounded to the smaller of catalog RPM and machine max_rpm.
 */
function cycleTimeMin(t: ToolCandidate, mch: MachineCandidate, mat: MaterialCandidate, p: PartRequirements): number {
  const vc_mpm = t.vc_baseline_mpm * mat.machinability_factor;
  const rpm_from_vc = (vc_mpm * 1000) / (Math.PI * t.diameter_mm);
  const rpm = Math.min(rpm_from_vc, mch.max_rpm);
  const feed_mm_min = t.fz_baseline_mm * t.flutes * rpm;
  const mrr_mm3_min = p.axial_depth_mm * p.radial_depth_mm * feed_mm_min;
  const mrr_cm3_min = mrr_mm3_min / 1000;
  if (mrr_cm3_min <= 0) return Number.POSITIVE_INFINITY;
  return p.stock_volume_cm3 / mrr_cm3_min;
}

/** Taylor tool life in minutes: T = (C/Vc)^(1/n). Vc scaled by material machinability. */
function taylorLifeMin(t: ToolCandidate, mat: MaterialCandidate): number {
  const vc_mpm = t.vc_baseline_mpm * mat.machinability_factor;
  if (vc_mpm <= 0) return 0;
  return Math.pow(t.taylor_C / vc_mpm, 1 / t.taylor_n);
}

/** Tool wear risk = cycle_time / taylor_life. <1 means the tool outlasts the part; >>1 = early replacement. */
function toolWearRisk(t: ToolCandidate, mch: MachineCandidate, mat: MaterialCandidate, p: PartRequirements): number {
  const T = taylorLifeMin(t, mat);
  if (T <= 0) return 1e9;
  return cycleTimeMin(t, mch, mat, p) / T;
}

/** Brammertz surface Ra (µm): Ra ≈ fz²/(8·r) × 1000. */
function brammertzRaUm(t: ToolCandidate): number {
  const r = t.corner_radius_mm && t.corner_radius_mm > 0 ? t.corner_radius_mm : 0.4;
  return (t.fz_baseline_mm * t.fz_baseline_mm) / (8 * r) * 1000;
}

/** Surface risk = predicted Ra / spec Ra. <=1 OK, >1 fails finish spec. */
function surfaceRisk(t: ToolCandidate, p: PartRequirements): number {
  const ra_um = brammertzRaUm(t);
  return ra_um / p.ra_spec_um;
}

/**
 * Chatter risk proxy: lower rigidity + looser holder TIR → higher risk.
 * Holder TIR > 5 µm reduces the rigidity multiplier (mimics excitation amplification).
 */
function chatterRisk(mch: MachineCandidate, h: HolderCandidate): number {
  const rigScore = RIGIDITY_SCORE[mch.rigidity];
  const tirPenalty = h.tir_um > 5 ? 0.8 : 1.0;
  return 1 - rigScore * tirPenalty;
}

/** Total cost: setup + qty × (cycle×$/min + tool_unit_cost / parts_per_tool). */
function totalCostUsd(t: ToolCandidate, mch: MachineCandidate, mat: MaterialCandidate, h: HolderCandidate, p: PartRequirements): number {
  const cycle = cycleTimeMin(t, mch, mat, p);
  if (!Number.isFinite(cycle)) return Number.POSITIVE_INFINITY;
  const T_life_min = taylorLifeMin(t, mat);
  const parts_per_tool = T_life_min > 0 && cycle > 0 ? T_life_min / cycle : 1;
  const tool_amortized = parts_per_tool > 0 ? t.unit_cost_usd / parts_per_tool : t.unit_cost_usd;
  const chatter_overhead_factor = 1 + chatterRisk(mch, h) * 0.10;  // 0–10% downtime penalty
  return p.setup_cost_usd + p.quantity * (cycle * mch.cost_per_min_usd + tool_amortized) * chatter_overhead_factor;
}

// ────────────────────────────────────────────────────────────────────────────
// DECISION-VECTOR DECODING
// ────────────────────────────────────────────────────────────────────────────

interface ComboIdx {
  m: number;  // machine index
  t: number;  // tool index
  h: number;  // holder index
  mat: number;  // material index
}

/** Clamp a continuous NSGA-II x[i] into a valid catalog index [0, len-1]. */
function decodeIdx(x: number, len: number): number {
  const i = Math.floor(x);
  if (i < 0) return 0;
  if (i >= len) return len - 1;
  return i;
}

function decode(x: number[]): ComboIdx {
  return { m: Math.floor(x[0]), t: Math.floor(x[1]), h: Math.floor(x[2]), mat: Math.floor(x[3]) };
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

class PrismEnhancedRecommenderEngineImpl {

  /**
   * Compute pareto-optimal (cheapest, fastest, balanced) selection over the
   * caller's available-resources subset.
   *
   * @param input RecommendInput — resources + part requirements + optimizer config
   * @returns RecommendResult — pareto front + labeled top-3 + meta
   * @throws Error on empty resources or invalid inputs (zod-validated)
   */
  recommend(input: RecommendInput): RecommendResult {
    const parsed = RecommendInputSchema.parse(input);
    const { resources, part } = parsed;
    const optConf = parsed.optimizer ?? {};
    const populationSize = optConf.populationSize ?? 60;
    const maxGenerations = optConf.maxGenerations ?? 40;

    // Defensive: any resource list of length 1 collapses to a constant axis.
    const lens = {
      m: resources.machines.length,
      t: resources.tools.length,
      h: resources.holders.length,
      mat: resources.materials.length,
    };

    // Decision-variable bounds — each axis is a continuous [0, len) interval
    // that decodes to an integer catalog index. NSGA-II uses continuous bounds
    // natively; we round at evaluation.
    const bounds: [number, number][] = [
      [0, lens.m],
      [0, lens.t],
      [0, lens.h],
      [0, lens.mat],
    ];

    // Objective functions — all minimized.
    const objectives: Array<(x: number[]) => number> = [
      (x) => this.evalCost(x, resources, part),
      (x) => this.evalCycle(x, resources, part),
      (x) => this.evalWear(x, resources, part),
      (x) => this.evalSurface(x, resources, part),
      (x) => this.evalChatter(x, resources),
    ];

    const result = multiObjectiveEngine.nsgaII({
      objectives,
      bounds,
      populationSize,
      maxGenerations,
    });

    // Materialize pareto front into RecommendCombo[] (dedup by index tuple).
    const seen = new Set<string>();
    const pareto: RecommendCombo[] = [];
    for (const sol of result.paretoFront) {
      const idx = decode(sol.x);
      const key = `${decodeIdx(idx.m, lens.m)}/${decodeIdx(idx.t, lens.t)}/${decodeIdx(idx.h, lens.h)}/${decodeIdx(idx.mat, lens.mat)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const combo = this.materialize(sol.x, resources, part);
      pareto.push(combo);
    }

    // Defensive: if NSGA-II produced an empty pareto front (degenerate input),
    // evaluate the first combo as the fallback. Should never happen with min(1) resource lists.
    if (pareto.length === 0) {
      pareto.push(this.materialize([0, 0, 0, 0], resources, part));
    }

    const top3 = this.pickTop3(pareto);

    return {
      paretoFront: pareto,
      top3,
      meta: {
        populationSize,
        generations: result.generations,
        paretoFrontSize: pareto.length,
        method: result.method,
      },
    };
  }

  // ── Individual objective evaluators ─────────────────────────────────────────

  private evalCost(x: number[], r: RecommendInput["resources"], p: PartRequirements): number {
    const mch = r.machines[decodeIdx(x[0], r.machines.length)];
    const t   = r.tools[decodeIdx(x[1], r.tools.length)];
    const h   = r.holders[decodeIdx(x[2], r.holders.length)];
    const mat = r.materials[decodeIdx(x[3], r.materials.length)];
    return totalCostUsd(t, mch, mat, h, p);
  }

  private evalCycle(x: number[], r: RecommendInput["resources"], p: PartRequirements): number {
    const mch = r.machines[decodeIdx(x[0], r.machines.length)];
    const t   = r.tools[decodeIdx(x[1], r.tools.length)];
    const mat = r.materials[decodeIdx(x[3], r.materials.length)];
    return cycleTimeMin(t, mch, mat, p);
  }

  private evalWear(x: number[], r: RecommendInput["resources"], p: PartRequirements): number {
    const mch = r.machines[decodeIdx(x[0], r.machines.length)];
    const t   = r.tools[decodeIdx(x[1], r.tools.length)];
    const mat = r.materials[decodeIdx(x[3], r.materials.length)];
    return toolWearRisk(t, mch, mat, p);
  }

  private evalSurface(x: number[], r: RecommendInput["resources"], p: PartRequirements): number {
    const t = r.tools[decodeIdx(x[1], r.tools.length)];
    return surfaceRisk(t, p);
  }

  private evalChatter(x: number[], r: RecommendInput["resources"]): number {
    const mch = r.machines[decodeIdx(x[0], r.machines.length)];
    const h   = r.holders[decodeIdx(x[2], r.holders.length)];
    return chatterRisk(mch, h);
  }

  /** Build a fully-resolved RecommendCombo from an NSGA-II decision vector. */
  private materialize(x: number[], r: RecommendInput["resources"], p: PartRequirements): RecommendCombo {
    const machine = r.machines[decodeIdx(x[0], r.machines.length)];
    const tool    = r.tools[decodeIdx(x[1], r.tools.length)];
    const holder  = r.holders[decodeIdx(x[2], r.holders.length)];
    const material = r.materials[decodeIdx(x[3], r.materials.length)];
    return {
      machine, tool, holder, material,
      metrics: {
        cost_usd:       totalCostUsd(tool, machine, material, holder, p),
        cycle_time_min: cycleTimeMin(tool, machine, material, p),
        tool_wear_risk: toolWearRisk(tool, machine, material, p),
        surface_risk:   surfaceRisk(tool, p),
        chatter_risk:   chatterRisk(machine, holder),
      },
    };
  }

  /**
   * Select cheapest / fastest / balanced from the pareto front.
   * - cheapest = min cost_usd
   * - fastest  = min cycle_time_min
   * - balanced = min sum of normalized objectives (Z-score per axis)
   */
  private pickTop3(pf: RecommendCombo[]): RecommendResult["top3"] {
    const cheapest = pf.reduce((a, b) => a.metrics.cost_usd <= b.metrics.cost_usd ? a : b);
    const fastest = pf.reduce((a, b) => a.metrics.cycle_time_min <= b.metrics.cycle_time_min ? a : b);

    // Min-max normalize each axis, sum the normalized score, pick the minimum.
    const axes = ["cost_usd", "cycle_time_min", "tool_wear_risk", "surface_risk", "chatter_risk"] as const;
    const ranges = axes.map(ax => {
      const vals = pf.map(c => c.metrics[ax]).filter(Number.isFinite);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return { ax, min, max };
    });
    const score = (c: RecommendCombo): number => {
      let s = 0;
      for (const { ax, min, max } of ranges) {
        const v = c.metrics[ax];
        if (!Number.isFinite(v)) { s += 1e6; continue; }
        const span = max - min;
        s += span > 0 ? (v - min) / span : 0;
      }
      return s;
    };
    const balanced = pf.reduce((a, b) => score(a) <= score(b) ? a : b);

    return { cheapest, fastest, balanced };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export const prismEnhancedRecommenderEngine = new PrismEnhancedRecommenderEngineImpl();
export type PrismEnhancedRecommenderEngine = typeof prismEnhancedRecommenderEngine;
export { PrismEnhancedRecommenderEngineImpl };
