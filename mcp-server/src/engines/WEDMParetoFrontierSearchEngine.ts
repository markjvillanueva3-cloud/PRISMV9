/**
 * WEDMParetoFrontierSearchEngine — WEDM AGI Phase 2 / U-P2-05
 *
 * Domain wrapper around the generic MultiObjectiveEngine (NSGA-II). Sets up
 * a 4-parameter WEDM search space (peak current, pulse-on, pulse-off, wire
 * tension) and three competing objectives:
 *
 *   1. Ra             — surface finish (minimize, µm)
 *   2. MRR⁻¹          — productivity proxy (minimize so larger MRR wins)
 *   3. wire_break_prob — reliability (minimize)
 *
 * Surrogate models come from first-principles Klocke (Ra) + the canonical
 * spark-signature database (MRR factor, wire-wear factor), scaled by
 * on/off duty cycle.
 *
 * Delegates NSGA-II mechanics to the generic MultiObjectiveEngine — no
 * duplicate algorithm code.
 *
 * Exit gate (P2-MS2): Pareto frontier ≥10 solutions on every JM Die material.
 */

import { multiObjectiveEngine } from "./MultiObjectiveEngine.js";
import type { NSGAIIResult } from "./MultiObjectiveEngine.js";
import {
  wedmMaterialSparkDatabaseEngine,
  type WEDMMaterialKey,
} from "./WEDMMaterialSparkDatabaseEngine.js";

// ────────────────────────── Types ──────────────────────────

export interface WEDMSearchInput {
  material: WEDMMaterialKey;
  bounds?: Partial<WEDMParameterBounds>;
  population_size?: number;
  max_generations?: number;
}

export interface WEDMParameterBounds {
  peak_current_A: [number, number];
  pulse_on_us: [number, number];
  pulse_off_us: [number, number];
  wire_tension_N: [number, number];
}

export interface WEDMFrontierSolution {
  parameters: {
    peak_current_A: number;
    pulse_on_us: number;
    pulse_off_us: number;
    wire_tension_N: number;
    duty_cycle: number;
  };
  objectives: {
    Ra_um: number;
    MRR_inv: number;
    wire_break_prob: number;
  };
  derived: {
    MRR_rel: number;
  };
}

export interface WEDMSearchResult {
  material: WEDMMaterialKey;
  frontier: WEDMFrontierSolution[];
  generations: number;
  elapsed_ms: number;
}

// ────────────────────────── Defaults ──────────────────────────

export const DEFAULT_WEDM_BOUNDS: WEDMParameterBounds = {
  peak_current_A: [4, 16],
  pulse_on_us: [2, 30],
  pulse_off_us: [5, 60],
  wire_tension_N: [8, 18],
};

// ────────────────────────── Engine ──────────────────────────

export class WEDMParetoFrontierSearchEngine {
  search(input: WEDMSearchInput): WEDMSearchResult {
    const sig = wedmMaterialSparkDatabaseEngine.get(input.material);
    const bounds = this.resolveBounds(input.bounds);
    const t0 = performance.now();

    const boundsArr: [number, number][] = [
      bounds.peak_current_A,
      bounds.pulse_on_us,
      bounds.pulse_off_us,
      bounds.wire_tension_N,
    ];

    const raObjective = (x: number[]) =>
      wedmMaterialSparkDatabaseEngine.predictRaUm(input.material, x[0], x[1]);

    const mrrInvObjective = (x: number[]) => {
      const duty = x[1] / (x[1] + x[2]);
      const mrr = x[0] * duty * sig.mrr_factor;
      return 1 / Math.max(mrr, 1e-6);
    };

    const wireBreakObjective = (x: number[]) => {
      const duty = x[1] / (x[1] + x[2]);
      const [tLo, tHi] = bounds.wire_tension_N;
      const tensionPen =
        Math.abs(x[3] - (tLo + tHi) / 2) / ((tHi - tLo) / 2);
      const thermalLoad = (x[0] / 16) * duty * sig.wire_wear_factor;
      return clip(thermalLoad + 0.3 * tensionPen, 0, 1.5);
    };

    const result: NSGAIIResult = multiObjectiveEngine.nsgaII({
      objectives: [raObjective, mrrInvObjective, wireBreakObjective],
      bounds: boundsArr,
      populationSize: input.population_size ?? 60,
      maxGenerations: input.max_generations ?? 40,
    });

    const frontier: WEDMFrontierSolution[] = result.paretoFront.map((s) => {
      const [ie, te, toff, tension] = s.x;
      const duty = te / (te + toff);
      const mrrRel = ie * duty * sig.mrr_factor;
      return {
        parameters: {
          peak_current_A: round3(ie),
          pulse_on_us: round3(te),
          pulse_off_us: round3(toff),
          wire_tension_N: round3(tension),
          duty_cycle: round3(duty),
        },
        objectives: {
          Ra_um: round3(s.objectives[0]),
          MRR_inv: round3(s.objectives[1]),
          wire_break_prob: round3(s.objectives[2]),
        },
        derived: { MRR_rel: round3(mrrRel) },
      };
    });

    return {
      material: input.material,
      frontier,
      generations: result.generations,
      elapsed_ms: performance.now() - t0,
    };
  }

  // ─── internals ────────────────────────────────────────────

  private resolveBounds(
    override?: Partial<WEDMParameterBounds>,
  ): WEDMParameterBounds {
    return {
      peak_current_A:
        override?.peak_current_A ?? DEFAULT_WEDM_BOUNDS.peak_current_A,
      pulse_on_us: override?.pulse_on_us ?? DEFAULT_WEDM_BOUNDS.pulse_on_us,
      pulse_off_us: override?.pulse_off_us ?? DEFAULT_WEDM_BOUNDS.pulse_off_us,
      wire_tension_N:
        override?.wire_tension_N ?? DEFAULT_WEDM_BOUNDS.wire_tension_N,
    };
  }
}

function clip(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export const wedmParetoFrontierSearchEngine =
  new WEDMParetoFrontierSearchEngine();
