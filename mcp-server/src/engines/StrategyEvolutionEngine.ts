/**
 * StrategyEvolutionEngine — CAMX-MS15/U05 (E1146)
 *
 * Genetic algorithm for discovering new strategy parameter combinations.
 * Mutates ae/ap/Vc/fz within bounds, evaluates fitness via physics
 * (Kienzle cutting force, Taylor tool life), selects fittest individuals.
 *
 * Evolutionary approach:
 *   1. Initialize random population within parameter bounds
 *   2. Evaluate fitness = weighted(MRR, tool_life, surface_quality, force_margin)
 *   3. Tournament selection (k=3) for parent pairs
 *   4. BLX-alpha crossover (alpha=0.5) for continuous parameters
 *   5. Gaussian mutation with adaptive sigma (decays with generation)
 *   6. Elitism: top 2 individuals survive unconditionally
 *
 * Fitness function:
 *   f = w_mrr * MRR_norm + w_life * T_norm - w_force * F_penalty - w_Ra * Ra_penalty
 *
 *   where:
 *     MRR = ae * ap * Vc * fz * z / (pi * D)   [cm3/min]
 *     T   = (C / Vc)^(1/n)                       [min] (Taylor)
 *     Fc  = kc1.1 * ap * fz^(1-mc)               [N]   (Kienzle)
 *     Ra  ~ f^2 / (8 * r_eps)                    [um]  (theoretical)
 *
 * References:
 *   - Kienzle (1952): Specific cutting force model
 *   - Taylor (1907): Tool life equation V*T^n = C
 *   - Goldberg (1989): "Genetic Algorithms in Search, Optimization..."
 *   - FleetLearningStrategyEngine (E1140) — fleet data can seed initial pop
 *
 * @module StrategyEvolutionEngine
 * @shortcode E1146
 * @dispatcher camDispatcher
 * @actions strategy_evolve, strategy_best_discoveries, strategy_evolution_history
 * @milestone CAMX-MS15/U05
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default population size */
const DEFAULT_POP_SIZE = 20;

/** Default number of generations */
const DEFAULT_GENERATIONS = 50;

/** Tournament selection size */
const TOURNAMENT_K = 3;

/** Elitism count — top N survive unconditionally */
const ELITISM_COUNT = 2;

/** BLX-alpha crossover parameter */
const BLX_ALPHA = 0.5;

/** Initial mutation sigma (fraction of range) */
const INITIAL_MUTATION_SIGMA = 0.15;

/** Mutation sigma decay per generation (multiplicative) */
const SIGMA_DECAY = 0.98;

/** Mutation probability per gene */
const MUTATION_PROBABILITY = 0.3;

/** Fitness weights */
const W_MRR = 0.40;
const W_TOOL_LIFE = 0.30;
const W_FORCE = 0.15;
const W_SURFACE = 0.15;

/** Machine force limit default [N] */
const DEFAULT_FORCE_LIMIT_N = 5000;

/** Maximum tool life cap for normalization [min] */
const MAX_TOOL_LIFE_NORM_MIN = 300;

/** Minimum acceptable tool life [min] */
const MIN_TOOL_LIFE_MIN = 5;

// ============================================================================
// TYPES
// ============================================================================

/** ISO material group */
export type EvolutionIsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Cutting parameter bounds for evolution */
export interface ParameterBounds {
  /** Radial depth of cut ae [mm] */
  ae_min: number; ae_max: number;
  /** Axial depth of cut ap [mm] */
  ap_min: number; ap_max: number;
  /** Cutting speed Vc [m/min] */
  Vc_min: number; Vc_max: number;
  /** Feed per tooth fz [mm/tooth] */
  fz_min: number; fz_max: number;
}

/** Material properties for physics evaluation */
export interface EvolutionMaterial {
  /** Material name */
  name: string;
  /** ISO group */
  iso_group: EvolutionIsoGroup;
  /** Kienzle kc1.1 specific cutting force [N/mm2] */
  kc1_1: number;
  /** Kienzle exponent mc [dimensionless] */
  mc: number;
  /** Taylor constant C [m/min] */
  taylor_C: number;
  /** Taylor exponent n [dimensionless, 0 < n < 1] */
  taylor_n: number;
  /** Hardness HRC (optional) */
  hardness_HRC?: number;
}

/** Tool definition for evolution */
export interface EvolutionTool {
  /** Tool diameter [mm] */
  diameter_mm: number;
  /** Number of flutes */
  flute_count: number;
  /** Corner radius [mm] (for Ra estimation) */
  corner_radius_mm: number;
  /** Max allowed deflection force [N] */
  max_force_N?: number;
}

/** Machine constraints */
export interface EvolutionMachine {
  /** Max spindle speed [rpm] */
  max_rpm: number;
  /** Max spindle power [kW] */
  max_power_kW: number;
  /** Max feed rate [mm/min] */
  max_feed_mmpm: number;
  /** Max cutting force the setup can handle [N] */
  max_force_N?: number;
}

/** Feature context for the evolution */
export interface EvolutionFeature {
  /** Feature type */
  type: "pocket" | "contour" | "slot" | "face" | "drill" | "profile";
  /** Target surface roughness Ra [um] */
  target_Ra_um?: number;
  /** Required MRR minimum [cm3/min] */
  min_mrr?: number;
}

/** A single individual in the population */
export interface Individual {
  /** Radial depth of cut [mm] */
  ae: number;
  /** Axial depth of cut [mm] */
  ap: number;
  /** Cutting speed [m/min] */
  Vc: number;
  /** Feed per tooth [mm/tooth] */
  fz: number;
  /** Fitness score (higher = better) */
  fitness: number;
  /** Material removal rate [cm3/min] */
  mrr: number;
  /** Predicted tool life [min] */
  tool_life_min: number;
  /** Predicted cutting force [N] */
  cutting_force_N: number;
  /** Predicted surface roughness Ra [um] */
  predicted_Ra_um: number;
  /** Generation discovered */
  generation: number;
}

/** Evolution result */
export interface EvolutionResult {
  /** Best individual found */
  best: Individual;
  /** Top 5 unique discoveries */
  top_discoveries: Individual[];
  /** Generations run */
  generations_run: number;
  /** Population size */
  population_size: number;
  /** Final population fitness statistics */
  fitness_stats: {
    mean: number;
    std: number;
    min: number;
    max: number;
  };
  /** Convergence history (best fitness per generation) */
  convergence: number[];
  /** Elapsed time [ms] */
  elapsed_ms: number;
}

/** Stored evolution run for history */
export interface EvolutionRun {
  /** Run ID */
  run_id: string;
  /** Timestamp ISO-8601 */
  timestamp: string;
  /** Material name */
  material: string;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Feature type */
  feature_type: string;
  /** Best individual */
  best: Individual;
  /** Generations run */
  generations: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class StrategyEvolutionEngine {
  private history: EvolutionRun[] = [];
  private bestDiscoveries: Individual[] = [];

  /**
   * Run genetic algorithm evolution to discover optimal cutting parameters.
   */
  evolve(
    feature: EvolutionFeature,
    material: EvolutionMaterial,
    tool: EvolutionTool,
    machine: EvolutionMachine,
    generations: number = DEFAULT_GENERATIONS,
  ): EvolutionResult {
    const t0 = Date.now();
    const popSize = DEFAULT_POP_SIZE;
    const bounds = this.computeBounds(tool, machine);

    log.info(`[StrategyEvolution] Starting evolution: ${generations} gen, pop=${popSize}, material=${material.name}`);

    // Initialize population
    let population = this.initializePopulation(popSize, bounds);

    // Evaluate initial fitness
    population = population.map(ind => this.evaluate(ind, material, tool, machine, feature, 0));

    const convergence: number[] = [];
    let sigma = INITIAL_MUTATION_SIGMA;

    for (let gen = 0; gen < generations; gen++) {
      // Sort by fitness descending
      population.sort((a, b) => b.fitness - a.fitness);
      convergence.push(population[0].fitness);

      // Create next generation
      const nextGen: Individual[] = [];

      // Elitism: keep top ELITISM_COUNT
      for (let e = 0; e < ELITISM_COUNT && e < population.length; e++) {
        nextGen.push({ ...population[e] });
      }

      // Fill rest via tournament selection + crossover + mutation
      while (nextGen.length < popSize) {
        const parent1 = this.tournamentSelect(population);
        const parent2 = this.tournamentSelect(population);
        let child = this.crossover(parent1, parent2, bounds);
        child = this.mutate(child, bounds, sigma);
        child = this.evaluate(child, material, tool, machine, feature, gen + 1);
        nextGen.push(child);
      }

      population = nextGen;
      sigma *= SIGMA_DECAY; // Decay mutation strength
    }

    // Final sort
    population.sort((a, b) => b.fitness - a.fitness);
    convergence.push(population[0].fitness);

    const best = population[0];

    // Extract unique top discoveries (diverse parameter sets)
    const topDiscoveries = this.extractDiverseTop(population, 5);

    // Update global best discoveries
    for (const d of topDiscoveries) {
      this.bestDiscoveries.push(d);
    }
    // Keep only top 20 all-time
    this.bestDiscoveries.sort((a, b) => b.fitness - a.fitness);
    this.bestDiscoveries = this.bestDiscoveries.slice(0, 20);

    // Store in history
    const run: EvolutionRun = {
      run_id: `evo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      material: material.name,
      tool_diameter_mm: tool.diameter_mm,
      feature_type: feature.type,
      best,
      generations,
    };
    this.history.push(run);
    if (this.history.length > 100) this.history = this.history.slice(-100);

    // Fitness stats
    const fitnesses = population.map(p => p.fitness);
    const mean = fitnesses.reduce((s, v) => s + v, 0) / fitnesses.length;
    const std = Math.sqrt(fitnesses.reduce((s, v) => s + (v - mean) ** 2, 0) / fitnesses.length);

    const elapsed = Date.now() - t0;
    log.info(`[StrategyEvolution] Complete: best fitness=${best.fitness.toFixed(4)}, MRR=${best.mrr.toFixed(2)} cm3/min, T=${best.tool_life_min.toFixed(1)} min, elapsed=${elapsed}ms`);

    return {
      best,
      top_discoveries: topDiscoveries,
      generations_run: generations,
      population_size: popSize,
      fitness_stats: {
        mean: Math.round(mean * 10000) / 10000,
        std: Math.round(std * 10000) / 10000,
        min: Math.min(...fitnesses),
        max: Math.max(...fitnesses),
      },
      convergence,
      elapsed_ms: elapsed,
    };
  }

  /** Get all-time best discoveries across runs */
  getBestDiscoveries(): Individual[] {
    return [...this.bestDiscoveries];
  }

  /** Get evolution run history */
  getEvolutionHistory(): EvolutionRun[] {
    return [...this.history];
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  /** Compute parameter bounds from tool/machine constraints */
  private computeBounds(tool: EvolutionTool, machine: EvolutionMachine): ParameterBounds {
    const D = tool.diameter_mm;
    return {
      ae_min: D * 0.02,         // 2% of diameter
      ae_max: D,                // Full slotting
      ap_min: 0.2,              // Minimum depth
      ap_max: D * 2.5,          // 2.5x diameter (aggressive)
      Vc_min: 20,               // Very conservative
      Vc_max: Math.min(400, Math.PI * D * machine.max_rpm / 1000),  // Limited by RPM
      fz_min: 0.01,             // Finishing
      fz_max: Math.min(0.5, D * 0.04),  // Max 4% of diameter
    };
  }

  /** Initialize random population */
  private initializePopulation(size: number, bounds: ParameterBounds): Individual[] {
    const pop: Individual[] = [];
    for (let i = 0; i < size; i++) {
      pop.push({
        ae: this.randRange(bounds.ae_min, bounds.ae_max),
        ap: this.randRange(bounds.ap_min, bounds.ap_max),
        Vc: this.randRange(bounds.Vc_min, bounds.Vc_max),
        fz: this.randRange(bounds.fz_min, bounds.fz_max),
        fitness: 0, mrr: 0, tool_life_min: 0,
        cutting_force_N: 0, predicted_Ra_um: 0, generation: 0,
      });
    }
    return pop;
  }

  /** Evaluate an individual's fitness using physics models */
  private evaluate(
    ind: Individual,
    material: EvolutionMaterial,
    tool: EvolutionTool,
    machine: EvolutionMachine,
    feature: EvolutionFeature,
    generation: number,
  ): Individual {
    const D = tool.diameter_mm;
    const z = tool.flute_count;

    // RPM from cutting speed: n = (Vc * 1000) / (pi * D)
    const rpm = (ind.Vc * 1000) / (Math.PI * D);

    // Table feed: vf = fz * z * n [mm/min]
    const vf = ind.fz * z * rpm;

    // MRR = ae * ap * vf / 1000 [cm3/min]
    const mrr = (ind.ae * ind.ap * vf) / 1000;

    // Kienzle cutting force: Fc = kc1.1 * ap * fz^(1-mc) [N]
    // (simplified single-tooth engagement)
    const Fc = material.kc1_1 * ind.ap * Math.pow(ind.fz, 1 - material.mc);

    // Taylor tool life: T = (C / Vc)^(1/n) [min]
    const T = Math.pow(material.taylor_C / ind.Vc, 1 / material.taylor_n);

    // Theoretical surface roughness: Ra ~ fz^2 / (32 * r_eps) * 1000 [um]
    const rEps = tool.corner_radius_mm > 0 ? tool.corner_radius_mm : 0.4;
    const Ra = (ind.fz * ind.fz) / (32 * rEps) * 1000;

    // Spindle power: P = Fc * Vc / (60 * 1000) [kW]
    const power_kW = (Fc * ind.Vc) / 60000;

    // ── Fitness components (normalized 0-1) ──

    // MRR: higher is better, normalize against theoretical max
    const maxMRR = (D * D * 2.5 * 1000) / 1000; // rough upper bound
    const mrrNorm = Math.min(mrr / Math.max(maxMRR, 1), 1);

    // Tool life: longer is better, capped at MAX_TOOL_LIFE_NORM_MIN
    const toolLifeNorm = Math.min(Math.max(T, 0) / MAX_TOOL_LIFE_NORM_MIN, 1);

    // Force penalty: 0 if under limit, increases as fraction exceeds 1
    const forceLimit = machine.max_force_N ?? tool.max_force_N ?? DEFAULT_FORCE_LIMIT_N;
    const forceRatio = Fc / forceLimit;
    const forcePenalty = forceRatio > 1 ? (forceRatio - 1) * 2 : forceRatio > 0.8 ? (forceRatio - 0.8) * 0.5 : 0;

    // Surface penalty: 0 if under target, increases if exceeds
    const targetRa = feature.target_Ra_um ?? 3.2;
    const raRatio = Ra / targetRa;
    const raPenalty = raRatio > 1 ? (raRatio - 1) * 1.5 : 0;

    // Power penalty: hard constraint
    const powerPenalty = power_kW > machine.max_power_kW ? (power_kW / machine.max_power_kW - 1) * 3 : 0;

    // Feed rate constraint
    const feedPenalty = vf > machine.max_feed_mmpm ? (vf / machine.max_feed_mmpm - 1) * 2 : 0;

    // Tool life minimum constraint
    const lifePenalty = T < MIN_TOOL_LIFE_MIN ? (MIN_TOOL_LIFE_MIN - T) / MIN_TOOL_LIFE_MIN * 2 : 0;

    // Final fitness
    const fitness = W_MRR * mrrNorm + W_TOOL_LIFE * toolLifeNorm
      - W_FORCE * forcePenalty - W_SURFACE * raPenalty
      - powerPenalty - feedPenalty - lifePenalty;

    return {
      ae: Math.round(ind.ae * 1000) / 1000,
      ap: Math.round(ind.ap * 1000) / 1000,
      Vc: Math.round(ind.Vc * 10) / 10,
      fz: Math.round(ind.fz * 10000) / 10000,
      fitness: Math.round(fitness * 10000) / 10000,
      mrr: Math.round(mrr * 100) / 100,
      tool_life_min: Math.round(T * 10) / 10,
      cutting_force_N: Math.round(Fc * 10) / 10,
      predicted_Ra_um: Math.round(Ra * 100) / 100,
      generation,
    };
  }

  /** Tournament selection: pick best of k random individuals */
  private tournamentSelect(population: Individual[]): Individual {
    let best: Individual | null = null;
    for (let i = 0; i < TOURNAMENT_K; i++) {
      const idx = Math.floor(Math.random() * population.length);
      if (!best || population[idx].fitness > best.fitness) {
        best = population[idx];
      }
    }
    return best!;
  }

  /** BLX-alpha crossover */
  private crossover(p1: Individual, p2: Individual, bounds: ParameterBounds): Individual {
    return {
      ae: this.blxCross(p1.ae, p2.ae, bounds.ae_min, bounds.ae_max),
      ap: this.blxCross(p1.ap, p2.ap, bounds.ap_min, bounds.ap_max),
      Vc: this.blxCross(p1.Vc, p2.Vc, bounds.Vc_min, bounds.Vc_max),
      fz: this.blxCross(p1.fz, p2.fz, bounds.fz_min, bounds.fz_max),
      fitness: 0, mrr: 0, tool_life_min: 0,
      cutting_force_N: 0, predicted_Ra_um: 0, generation: 0,
    };
  }

  /** BLX-alpha crossover for a single gene */
  private blxCross(v1: number, v2: number, lo: number, hi: number): number {
    const cMin = Math.min(v1, v2);
    const cMax = Math.max(v1, v2);
    const range = cMax - cMin;
    const newMin = Math.max(lo, cMin - BLX_ALPHA * range);
    const newMax = Math.min(hi, cMax + BLX_ALPHA * range);
    return this.randRange(newMin, newMax);
  }

  /** Gaussian mutation */
  private mutate(ind: Individual, bounds: ParameterBounds, sigma: number): Individual {
    const m = (val: number, lo: number, hi: number): number => {
      if (Math.random() > MUTATION_PROBABILITY) return val;
      const range = hi - lo;
      const delta = this.gaussianRandom() * sigma * range;
      return Math.max(lo, Math.min(hi, val + delta));
    };

    return {
      ...ind,
      ae: m(ind.ae, bounds.ae_min, bounds.ae_max),
      ap: m(ind.ap, bounds.ap_min, bounds.ap_max),
      Vc: m(ind.Vc, bounds.Vc_min, bounds.Vc_max),
      fz: m(ind.fz, bounds.fz_min, bounds.fz_max),
    };
  }

  /** Extract top N diverse individuals (prevent clones) */
  private extractDiverseTop(population: Individual[], n: number): Individual[] {
    const result: Individual[] = [];
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);

    for (const ind of sorted) {
      if (result.length >= n) break;
      const isDuplicate = result.some(existing =>
        Math.abs(existing.ae - ind.ae) < 0.01 &&
        Math.abs(existing.ap - ind.ap) < 0.01 &&
        Math.abs(existing.Vc - ind.Vc) < 0.1 &&
        Math.abs(existing.fz - ind.fz) < 0.001
      );
      if (!isDuplicate) result.push(ind);
    }
    return result;
  }

  /** Gaussian random (Box-Muller transform) */
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /** Uniform random in [lo, hi] */
  private randRange(lo: number, hi: number): number {
    return lo + Math.random() * (hi - lo);
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const strategyEvolutionEngine = new StrategyEvolutionEngine();
