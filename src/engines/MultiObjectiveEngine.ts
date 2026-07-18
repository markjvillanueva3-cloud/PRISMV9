/**
 * PRISM MCP Server — Multi-Objective Optimization Engine
 *
 * Multi-objective optimization using evolutionary algorithms:
 * - Pareto dominance check
 * - Non-dominated sorting (fast, O(MN²))
 * - Crowding distance assignment
 * - NSGA-II (Deb et al. 2002)
 *
 * Ported from PRISM_MULTI_OBJECTIVE_ENGINE.js (monolith R2.3.1).
 *
 * @module MultiObjectiveEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Individual {
  x: number[];
  objectives?: number[];
  rank?: number;
  crowdingDistance?: number;
}

export interface NSGAIIConfig {
  objectives: Array<(x: number[]) => number>;
  bounds: [number, number][];
  populationSize?: number;
  maxGenerations?: number;
  crossoverProbability?: number;
  mutationProbability?: number;
  mutationScale?: number;
}

export interface ParetoSolution {
  x: number[];
  objectives: number[];
}

export interface NSGAIIResult {
  paretoFront: ParetoSolution[];
  population: Individual[];
  generations: number;
  history: Array<{ generation: number; paretoFrontSize: number; hypervolume: number }>;
  method: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class MultiObjectiveEngineImpl {

  /** Check if objective vector a dominates b (all objectives minimized). */
  dominates(a: number[], b: number[]): boolean {
    let dominated = true;
    let strictlyBetter = false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] > b[i]) { dominated = false; break; }
      if (a[i] < b[i]) strictlyBetter = true;
    }
    return dominated && strictlyBetter;
  }

  /** Fast non-dominated sorting. Returns array of fronts (index arrays). */
  nonDominatedSort(population: Individual[]): number[][] {
    const n = population.length;
    const dominationCount = new Array(n).fill(0);
    const dominatedBy: number[][] = population.map(() => []);
    const fronts: number[][] = [[]];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this.dominates(population[i].objectives!, population[j].objectives!)) {
          dominatedBy[i].push(j);
          dominationCount[j]++;
        } else if (this.dominates(population[j].objectives!, population[i].objectives!)) {
          dominatedBy[j].push(i);
          dominationCount[i]++;
        }
      }
      if (dominationCount[i] === 0) {
        population[i].rank = 0;
        fronts[0].push(i);
      }
    }

    let fi = 0;
    while (fronts[fi].length > 0) {
      const nextFront: number[] = [];
      for (const i of fronts[fi]) {
        for (const j of dominatedBy[i]) {
          dominationCount[j]--;
          if (dominationCount[j] === 0) {
            population[j].rank = fi + 1;
            nextFront.push(j);
          }
        }
      }
      fi++;
      fronts.push(nextFront);
    }
    fronts.pop();
    return fronts;
  }

  /** Assign crowding distance to individuals in a front. */
  calculateCrowdingDistance(population: Individual[], frontIndices: number[]): void {
    const n = frontIndices.length;
    if (n === 0) return;
    const numObj = population[frontIndices[0]].objectives!.length;

    for (const i of frontIndices) population[i].crowdingDistance = 0;

    for (let m = 0; m < numObj; m++) {
      const sorted = [...frontIndices].sort(
        (a, b) => population[a].objectives![m] - population[b].objectives![m],
      );
      population[sorted[0]].crowdingDistance = Infinity;
      population[sorted[n - 1]].crowdingDistance = Infinity;

      const fMin = population[sorted[0]].objectives![m];
      const fMax = population[sorted[n - 1]].objectives![m];
      const range = fMax - fMin;
      if (range === 0) continue;

      for (let i = 1; i < n - 1; i++) {
        const prev = population[sorted[i - 1]].objectives![m];
        const next = population[sorted[i + 1]].objectives![m];
        population[sorted[i]].crowdingDistance! += (next - prev) / range;
      }
    }
  }

  /** NSGA-II multi-objective optimization. */
  nsgaII(config: NSGAIIConfig): NSGAIIResult {
    const {
      objectives, bounds,
      populationSize = 100,
      maxGenerations = 100,
      crossoverProbability = 0.9,
      mutationProbability = 0.1,
      mutationScale = 0.1,
    } = config;
    const numObj = objectives.length;

    let population = this.initPopulation(populationSize, bounds);
    this.evaluate(population, objectives);

    const history: NSGAIIResult["history"] = [];

    for (let gen = 0; gen < maxGenerations; gen++) {
      const offspring: Individual[] = [];
      while (offspring.length < populationSize) {
        const p1 = this.tournamentSelect(population);
        const p2 = this.tournamentSelect(population);

        let c1: number[], c2: number[];
        if (Math.random() < crossoverProbability) {
          [c1, c2] = this.sbxCrossover(p1.x, p2.x, bounds);
        } else {
          c1 = [...p1.x]; c2 = [...p2.x];
        }

        this.polyMutation(c1, bounds, mutationProbability, mutationScale);
        this.polyMutation(c2, bounds, mutationProbability, mutationScale);

        offspring.push({ x: c1 });
        if (offspring.length < populationSize) offspring.push({ x: c2 });
      }

      this.evaluate(offspring, objectives);
      const combined = [...population, ...offspring];
      const fronts = this.nonDominatedSort(combined);

      const nextGen: Individual[] = [];
      let fi = 0;
      while (fi < fronts.length && nextGen.length + fronts[fi].length <= populationSize) {
        for (const i of fronts[fi]) nextGen.push(combined[i]);
        fi++;
      }

      if (nextGen.length < populationSize && fi < fronts.length) {
        this.calculateCrowdingDistance(combined, fronts[fi]);
        const lastFront = fronts[fi].map(i => combined[i]);
        lastFront.sort((a, b) => (b.crowdingDistance ?? 0) - (a.crowdingDistance ?? 0));
        const rem = populationSize - nextGen.length;
        for (let i = 0; i < rem; i++) nextGen.push(lastFront[i]);
      }

      population = nextGen;

      const pf = fronts[0].map(i => ({ x: combined[i].x, objectives: combined[i].objectives! }));
      history.push({
        generation: gen,
        paretoFrontSize: pf.length,
        hypervolume: this.hypervolume2D(pf),
      });
    }

    const finalFronts = this.nonDominatedSort(population);
    const paretoFront = finalFronts[0].map(i => ({
      x: population[i].x,
      objectives: population[i].objectives!,
    }));

    return { paretoFront, population, generations: maxGenerations, history, method: "NSGA-II" };
  }

  // ── Internal helpers ──

  private initPopulation(size: number, bounds: [number, number][]): Individual[] {
    return Array.from({ length: size }, () => ({
      x: bounds.map(([lb, ub]) => lb + Math.random() * (ub - lb)),
    }));
  }

  private evaluate(pop: Individual[], objectives: Array<(x: number[]) => number>): void {
    for (const ind of pop) ind.objectives = objectives.map(f => f(ind.x));
  }

  private tournamentSelect(pop: Individual[], size = 2): Individual {
    let best = pop[Math.floor(Math.random() * pop.length)];
    for (let i = 1; i < size; i++) {
      const c = pop[Math.floor(Math.random() * pop.length)];
      if ((c.rank ?? Infinity) < (best.rank ?? Infinity)) best = c;
      else if (c.rank === best.rank && (c.crowdingDistance ?? 0) > (best.crowdingDistance ?? 0)) best = c;
    }
    return best;
  }

  private sbxCrossover(p1: number[], p2: number[], bounds: [number, number][], eta = 20): [number[], number[]] {
    const n = p1.length;
    const c1 = new Array(n), c2 = new Array(n);
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.5) {
        const [lb, ub] = bounds[i];
        const y1 = Math.min(p1[i], p2[i]), y2 = Math.max(p1[i], p2[i]);
        if (y2 - y1 > 1e-10) {
          const beta1 = 1 + 2 * (y1 - lb) / (y2 - y1);
          const beta2 = 1 + 2 * (ub - y2) / (y2 - y1);
          const alpha1 = 2 - Math.pow(beta1, -(eta + 1));
          const alpha2 = 2 - Math.pow(beta2, -(eta + 1));
          const u = Math.random();
          const bq1 = u <= 1 / alpha1 ? Math.pow(u * alpha1, 1 / (eta + 1)) : Math.pow(1 / (2 - u * alpha1), 1 / (eta + 1));
          const bq2 = u <= 1 / alpha2 ? Math.pow(u * alpha2, 1 / (eta + 1)) : Math.pow(1 / (2 - u * alpha2), 1 / (eta + 1));
          c1[i] = Math.max(lb, Math.min(ub, 0.5 * ((y1 + y2) - bq1 * (y2 - y1))));
          c2[i] = Math.max(lb, Math.min(ub, 0.5 * ((y1 + y2) + bq2 * (y2 - y1))));
        } else { c1[i] = p1[i]; c2[i] = p2[i]; }
      } else { c1[i] = p1[i]; c2[i] = p2[i]; }
    }
    return [c1, c2];
  }

  private polyMutation(x: number[], bounds: [number, number][], prob: number, scale: number, eta = 20): void {
    for (let i = 0; i < x.length; i++) {
      if (Math.random() < prob) {
        const [lb, ub] = bounds[i];
        const u = Math.random();
        const dq = u < 0.5 ? Math.pow(2 * u, 1 / (eta + 1)) - 1 : 1 - Math.pow(2 * (1 - u), 1 / (eta + 1));
        x[i] = Math.max(lb, Math.min(ub, x[i] + dq * (ub - lb) * scale));
      }
    }
  }

  private hypervolume2D(front: ParetoSolution[]): number {
    if (front.length === 0 || front[0].objectives.length !== 2) return 0;
    const ref = [1.1, 1.1];
    const sorted = [...front].sort((a, b) => a.objectives[0] - b.objectives[0]);
    let hv = 0;
    for (let i = 0; i < sorted.length; i++) {
      const w = (i === sorted.length - 1 ? ref[0] : sorted[i + 1].objectives[0]) - sorted[i].objectives[0];
      const h = ref[1] - sorted[i].objectives[1];
      hv += w * h;
    }
    return hv;
  }
}

export const multiObjectiveEngine = new MultiObjectiveEngineImpl();
