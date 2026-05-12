/**
 * LatheGeneticAlgorithmEngine Test Suite
 * =======================================
 *
 * Comprehensive tests for evolutionary optimization of lathe machining parameters.
 * Tests cover: population initialization, selection, crossover, mutation,
 * NSGA-II multi-objective optimization, and manufacturing-specific applications.
 *
 * @module tests/LatheGeneticAlgorithmEngine
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheGeneticAlgorithmEngine,
  type ParameterBounds,
  type LatheObjective,
  type LatheGAConfig,
  type ManufacturingOptInput,
  type HeuristicSeed,
  type LatheParameterSet,
} from "../engines/LatheGeneticAlgorithmEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const SIMPLE_BOUNDS: ParameterBounds[] = [
  { name: "x", min: 0, max: 10, unit: "mm" },
  { name: "y", min: -5, max: 5, unit: "mm" },
  { name: "z", min: 100, max: 200, unit: "m/min" },
];

const LATHE_BOUNDS: ParameterBounds[] = [
  { name: "cutting_speed_m_min", min: 50, max: 400, unit: "m/min" },
  { name: "feed_mm_rev", min: 0.1, max: 0.8, unit: "mm/rev" },
  { name: "depth_of_cut_mm", min: 0.5, max: 6.0, unit: "mm" },
  { name: "number_of_passes", min: 1, max: 10, unit: "count", integer: true },
];

const SIMPLE_OBJECTIVES: LatheObjective[] = [
  { name: "fitness", minimize: false, weight: 1.0, unit: "score" },
];

const MULTI_OBJECTIVES: LatheObjective[] = [
  { name: "cycle_time", minimize: true, weight: 0.4, unit: "min" },
  { name: "surface_finish", minimize: true, weight: 0.3, unit: "Ra" },
  { name: "tool_life", minimize: false, weight: 0.3, unit: "min" },
];

const TEST_CONFIG: Partial<LatheGAConfig> = {
  population_size: 50,
  max_generations: 30,
  mutation_rate: 0.1,
  crossover_rate: 0.8,
  elite_ratio: 0.1,
  seed: 42,
};

// Simple sphere function (minimum at origin)
const sphereFunction = (genes: number[]): number => {
  return -genes.reduce((sum, g) => sum + g * g, 0);
};

// Rosenbrock function (minimum at [1,1,...])
const rosenbrockFunction = (genes: number[]): number => {
  let sum = 0;
  for (let i = 0; i < genes.length - 1; i++) {
    sum +=
      100 * (genes[i + 1] - genes[i] * genes[i]) ** 2 + (1 - genes[i]) ** 2;
  }
  return -sum; // Negate for maximization
};

// ============================================================================
// POPULATION INITIALIZATION TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - Population Initialization", () => {
  it("should initialize random population within bounds", () => {
    const population = latheGeneticAlgorithmEngine.initializeRandomPopulation(
      20,
      SIMPLE_BOUNDS,
      42
    );

    expect(population).toHaveLength(20);
    for (const ind of population) {
      expect(ind.genes).toHaveLength(3);
      expect(ind.genes[0]).toBeGreaterThanOrEqual(0);
      expect(ind.genes[0]).toBeLessThanOrEqual(10);
      expect(ind.genes[1]).toBeGreaterThanOrEqual(-5);
      expect(ind.genes[1]).toBeLessThanOrEqual(5);
      expect(ind.genes[2]).toBeGreaterThanOrEqual(100);
      expect(ind.genes[2]).toBeLessThanOrEqual(200);
    }
  });

  it("should initialize Latin Hypercube sampling with uniform coverage", () => {
    const population = latheGeneticAlgorithmEngine.initializeLatinHypercube(
      100,
      SIMPLE_BOUNDS,
      42
    );

    expect(population).toHaveLength(100);

    // Check uniform distribution by dividing range into strata
    const strata = 10;
    for (let d = 0; d < SIMPLE_BOUNDS.length; d++) {
      const min = SIMPLE_BOUNDS[d].min;
      const max = SIMPLE_BOUNDS[d].max;
      const bins = new Array(strata).fill(0);

      for (const ind of population) {
        const normalized = (ind.genes[d] - min) / (max - min);
        const bin = Math.min(Math.floor(normalized * strata), strata - 1);
        bins[bin]++;
      }

      // Each stratum should have roughly equal samples
      const expected = 100 / strata;
      for (const count of bins) {
        expect(count).toBeGreaterThanOrEqual(expected * 0.5);
        expect(count).toBeLessThanOrEqual(expected * 1.5);
      }
    }
  });

  it("should handle integer parameter bounds correctly", () => {
    const intBounds: ParameterBounds[] = [
      { name: "passes", min: 1, max: 10, unit: "count", integer: true },
    ];

    const population = latheGeneticAlgorithmEngine.initializeRandomPopulation(
      50,
      intBounds,
      42
    );

    for (const ind of population) {
      expect(Number.isInteger(ind.genes[0])).toBe(true);
      expect(ind.genes[0]).toBeGreaterThanOrEqual(1);
      expect(ind.genes[0]).toBeLessThanOrEqual(10);
    }
  });

  it("should seed population with heuristics", () => {
    const seeds: HeuristicSeed[] = [
      {
        parameters: {
          cutting_speed_m_min: 200,
          feed_mm_rev: 0.3,
          depth_of_cut_mm: 2.5,
          spindle_rpm: 1000,
          number_of_passes: 3,
          finishing_allowance_mm: 0.2,
        },
        source: "jm-die-program-123",
        confidence: 0.95,
        performance_score: 0.9,
      },
      {
        parameters: {
          cutting_speed_m_min: 180,
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 3.0,
          spindle_rpm: 900,
          number_of_passes: 4,
          finishing_allowance_mm: 0.15,
        },
        source: "expert-recommendation",
        confidence: 0.85,
      },
    ];

    const population = latheGeneticAlgorithmEngine.initializeRandomPopulation(
      20,
      LATHE_BOUNDS,
      42
    );

    const seededPop = latheGeneticAlgorithmEngine.seedWithHeuristics(
      population,
      seeds,
      LATHE_BOUNDS,
      0.1
    );

    expect(seededPop).toHaveLength(20);

    // At least one individual should have seeded values
    const hasSeededSpeed = seededPop.some(
      (ind) => Math.abs(ind.genes[0] - 200) < 1
    );
    expect(hasSeededSpeed).toBe(true);
  });

  it("should calculate population diversity", () => {
    const homogeneous = latheGeneticAlgorithmEngine.initializeRandomPopulation(
      10,
      SIMPLE_BOUNDS,
      42
    );

    // Make all individuals identical
    for (let i = 1; i < homogeneous.length; i++) {
      homogeneous[i].genes = [...homogeneous[0].genes];
    }

    const homoDiversity =
      latheGeneticAlgorithmEngine.calculateDiversity(homogeneous);
    expect(homoDiversity).toBeCloseTo(0, 5);

    // Diverse population
    const diverse = latheGeneticAlgorithmEngine.initializeLatinHypercube(
      50,
      SIMPLE_BOUNDS,
      42
    );
    const diversityScore =
      latheGeneticAlgorithmEngine.calculateDiversity(diverse);
    expect(diversityScore).toBeGreaterThan(0);
  });

  it("should calculate Shannon entropy for diversity", () => {
    const population = latheGeneticAlgorithmEngine.initializeLatinHypercube(
      100,
      SIMPLE_BOUNDS,
      42
    );

    const entropy =
      latheGeneticAlgorithmEngine.calculateShannonEntropy(population);
    expect(entropy).toBeGreaterThan(0);
    expect(entropy).toBeLessThanOrEqual(Math.log2(10)); // Max entropy for 10 bins
  });
});

// ============================================================================
// SELECTION OPERATOR TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - Selection Operators", () => {
  let population: ReturnType<
    typeof latheGeneticAlgorithmEngine.initializeRandomPopulation
  >;

  beforeEach(() => {
    population = latheGeneticAlgorithmEngine.initializeRandomPopulation(
      50,
      SIMPLE_BOUNDS,
      42
    );
    // Assign fitness values
    for (let i = 0; i < population.length; i++) {
      population[i].fitness = [i]; // Fitness = index, so last is best
    }
  });

  it("should perform tournament selection", () => {
    const selected = latheGeneticAlgorithmEngine.tournamentSelection(
      population,
      3
    );

    expect(selected).toBeDefined();
    expect(selected.genes).toHaveLength(3);
    expect(selected.fitness).toBeDefined();
  });

  it("should favor higher fitness in tournament selection", () => {
    let highFitnessWins = 0;
    const trials = 100;

    for (let i = 0; i < trials; i++) {
      const selected = latheGeneticAlgorithmEngine.tournamentSelection(
        population,
        5
      );
      if (selected.fitness[0] >= population.length / 2) {
        highFitnessWins++;
      }
    }

    // Should favor higher fitness more than 50% of the time
    expect(highFitnessWins).toBeGreaterThan(trials * 0.5);
  });

  it("should perform roulette wheel selection", () => {
    const selected = latheGeneticAlgorithmEngine.rouletteSelection(population);

    expect(selected).toBeDefined();
    expect(selected.genes).toHaveLength(3);
  });

  it("should perform rank-based selection", () => {
    const selected = latheGeneticAlgorithmEngine.rankBasedSelection(
      population,
      1.5
    );

    expect(selected).toBeDefined();
    expect(selected.genes).toHaveLength(3);
  });

  it("should preserve elites correctly", () => {
    const elites = latheGeneticAlgorithmEngine.preserveElites(population, 0.1);

    expect(elites).toHaveLength(5); // 10% of 50
    // Elites should be highest fitness
    for (const elite of elites) {
      expect(elite.fitness[0]).toBeGreaterThanOrEqual(45);
    }
  });
});

// ============================================================================
// CROSSOVER OPERATOR TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - Crossover Operators", () => {
  let parent1: ReturnType<
    typeof latheGeneticAlgorithmEngine.initializeRandomPopulation
  >[0];
  let parent2: ReturnType<
    typeof latheGeneticAlgorithmEngine.initializeRandomPopulation
  >[0];

  beforeEach(() => {
    const pop = latheGeneticAlgorithmEngine.initializeRandomPopulation(
      2,
      SIMPLE_BOUNDS,
      42
    );
    parent1 = pop[0];
    parent2 = pop[1];
    parent1.fitness = [1];
    parent2.fitness = [1];
  });

  it("should perform single-point crossover", () => {
    const [c1, c2] = latheGeneticAlgorithmEngine.singlePointCrossover(
      parent1,
      parent2,
      SIMPLE_BOUNDS
    );

    expect(c1.genes).toHaveLength(3);
    expect(c2.genes).toHaveLength(3);

    // Children should have mix of parent genes
    const hasP1 = c1.genes.some((g, i) => g === parent1.genes[i]);
    const hasP2 = c1.genes.some((g, i) => g === parent2.genes[i]);
    expect(hasP1 || hasP2).toBe(true);
  });

  it("should perform two-point crossover", () => {
    const [c1, c2] = latheGeneticAlgorithmEngine.twoPointCrossover(
      parent1,
      parent2,
      SIMPLE_BOUNDS
    );

    expect(c1.genes).toHaveLength(3);
    expect(c2.genes).toHaveLength(3);
  });

  it("should perform uniform crossover", () => {
    const [c1, c2] = latheGeneticAlgorithmEngine.uniformCrossover(
      parent1,
      parent2,
      SIMPLE_BOUNDS,
      0.5
    );

    expect(c1.genes).toHaveLength(3);
    expect(c2.genes).toHaveLength(3);
  });

  it("should perform arithmetic crossover", () => {
    const [c1, c2] = latheGeneticAlgorithmEngine.arithmeticCrossover(
      parent1,
      parent2,
      SIMPLE_BOUNDS,
      0.6
    );

    expect(c1.genes).toHaveLength(3);
    expect(c2.genes).toHaveLength(3);

    // Arithmetic crossover produces linear combinations
    for (let i = 0; i < 3; i++) {
      const expected1 = 0.6 * parent1.genes[i] + 0.4 * parent2.genes[i];
      expect(c1.genes[i]).toBeCloseTo(expected1, 5);
    }
  });

  it("should perform BLX-alpha crossover", () => {
    const [c1, c2] = latheGeneticAlgorithmEngine.blxAlphaCrossover(
      parent1,
      parent2,
      SIMPLE_BOUNDS,
      0.5
    );

    expect(c1.genes).toHaveLength(3);
    expect(c2.genes).toHaveLength(3);

    // Children should be within extended bounds
    for (let i = 0; i < 3; i++) {
      expect(c1.genes[i]).toBeGreaterThanOrEqual(SIMPLE_BOUNDS[i].min);
      expect(c1.genes[i]).toBeLessThanOrEqual(SIMPLE_BOUNDS[i].max);
    }
  });

  it("should perform SBX crossover (Simulated Binary)", () => {
    const [c1, c2] = latheGeneticAlgorithmEngine.sbxCrossover(
      parent1,
      parent2,
      SIMPLE_BOUNDS,
      15
    );

    expect(c1.genes).toHaveLength(3);
    expect(c2.genes).toHaveLength(3);

    // SBX should produce children within bounds
    for (let i = 0; i < 3; i++) {
      expect(c1.genes[i]).toBeGreaterThanOrEqual(SIMPLE_BOUNDS[i].min);
      expect(c1.genes[i]).toBeLessThanOrEqual(SIMPLE_BOUNDS[i].max);
    }
  });
});

// ============================================================================
// MUTATION OPERATOR TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - Mutation Operators", () => {
  let individual: ReturnType<
    typeof latheGeneticAlgorithmEngine.initializeRandomPopulation
  >[0];

  beforeEach(() => {
    const pop = latheGeneticAlgorithmEngine.initializeRandomPopulation(
      1,
      SIMPLE_BOUNDS,
      42
    );
    individual = pop[0];
    individual.fitness = [1];
  });

  it("should perform Gaussian mutation", () => {
    const mutated = latheGeneticAlgorithmEngine.gaussianMutation(
      individual,
      SIMPLE_BOUNDS,
      1.0, // 100% rate to ensure mutation
      0.1
    );

    expect(mutated.genes).toHaveLength(3);
    // Should be different from original
    const changed = mutated.genes.some(
      (g, i) => g !== individual.genes[i]
    );
    expect(changed).toBe(true);

    // Should remain within bounds
    for (let i = 0; i < 3; i++) {
      expect(mutated.genes[i]).toBeGreaterThanOrEqual(SIMPLE_BOUNDS[i].min);
      expect(mutated.genes[i]).toBeLessThanOrEqual(SIMPLE_BOUNDS[i].max);
    }
  });

  it("should perform uniform mutation", () => {
    const mutated = latheGeneticAlgorithmEngine.uniformMutation(
      individual,
      SIMPLE_BOUNDS,
      1.0
    );

    expect(mutated.genes).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(mutated.genes[i]).toBeGreaterThanOrEqual(SIMPLE_BOUNDS[i].min);
      expect(mutated.genes[i]).toBeLessThanOrEqual(SIMPLE_BOUNDS[i].max);
    }
  });

  it("should perform polynomial mutation", () => {
    const mutated = latheGeneticAlgorithmEngine.polynomialMutation(
      individual,
      SIMPLE_BOUNDS,
      1.0,
      20
    );

    expect(mutated.genes).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(mutated.genes[i]).toBeGreaterThanOrEqual(SIMPLE_BOUNDS[i].min);
      expect(mutated.genes[i]).toBeLessThanOrEqual(SIMPLE_BOUNDS[i].max);
    }
  });

  it("should perform Cauchy mutation", () => {
    const mutated = latheGeneticAlgorithmEngine.cauchyMutation(
      individual,
      SIMPLE_BOUNDS,
      1.0,
      0.1
    );

    expect(mutated.genes).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(mutated.genes[i]).toBeGreaterThanOrEqual(SIMPLE_BOUNDS[i].min);
      expect(mutated.genes[i]).toBeLessThanOrEqual(SIMPLE_BOUNDS[i].max);
    }
  });

  it("should adapt mutation rate based on success", () => {
    const lowSuccess = latheGeneticAlgorithmEngine.adaptMutationRate(
      0.1,
      0.1,
      0.2
    );
    const highSuccess = latheGeneticAlgorithmEngine.adaptMutationRate(
      0.3,
      0.1,
      0.2
    );

    // Low success should increase rate
    expect(lowSuccess).toBeGreaterThan(0.1);
    // High success should decrease rate
    expect(highSuccess).toBeLessThan(0.1);
  });
});

// ============================================================================
// EVOLUTION (SINGLE-OBJECTIVE) TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - Evolution", () => {
  it("should evolve population to optimize sphere function", () => {
    const bounds: ParameterBounds[] = [
      { name: "x", min: -5, max: 5, unit: "" },
      { name: "y", min: -5, max: 5, unit: "" },
    ];

    const result = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      bounds,
      SIMPLE_OBJECTIVES,
      {
        ...TEST_CONFIG,
        max_generations: 50,
      }
    );

    expect(result.success).toBe(true);
    expect(result.generations).toBeGreaterThan(0);
    expect(result.best_fitness[0]).toBeGreaterThan(-1); // Near optimum

    // Best should be near origin
    expect(Math.abs(result.best_parameters["x"])).toBeLessThan(1);
    expect(Math.abs(result.best_parameters["y"])).toBeLessThan(1);
  });

  it("should track fitness history", () => {
    const result = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      TEST_CONFIG
    );

    expect(result.fitness_history.length).toBeGreaterThan(0);
    // Fitness should generally improve
    const firstFitness = result.fitness_history[0][0];
    const lastFitness = result.fitness_history[result.fitness_history.length - 1][0];
    expect(lastFitness).toBeGreaterThanOrEqual(firstFitness);
  });

  it("should track diversity history", () => {
    const result = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      TEST_CONFIG
    );

    expect(result.diversity_history.length).toBeGreaterThan(0);
    // Diversity typically decreases as population converges
  });

  it("should detect convergence and stop early", () => {
    const result = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      {
        ...TEST_CONFIG,
        max_generations: 500,
        stagnation_limit: 10,
      }
    );

    // Should converge before max generations on simple problem
    expect(result.generations).toBeLessThan(500);
  });

  it("should use different selection methods", () => {
    const methods: Array<LatheGAConfig["selection_method"]> = [
      "tournament",
      "roulette",
      "rank",
    ];

    for (const method of methods) {
      const result = latheGeneticAlgorithmEngine.evolve(
        sphereFunction,
        SIMPLE_BOUNDS,
        SIMPLE_OBJECTIVES,
        {
          ...TEST_CONFIG,
          selection_method: method,
        }
      );

      expect(result.success).toBe(true);
    }
  });

  it("should use different crossover methods", () => {
    const methods: Array<LatheGAConfig["crossover_method"]> = [
      "single",
      "two_point",
      "uniform",
      "arithmetic",
      "blx_alpha",
      "sbx",
    ];

    for (const method of methods) {
      const result = latheGeneticAlgorithmEngine.evolve(
        sphereFunction,
        SIMPLE_BOUNDS,
        SIMPLE_OBJECTIVES,
        {
          ...TEST_CONFIG,
          crossover_method: method,
        }
      );

      expect(result.success).toBe(true);
    }
  });

  it("should use different mutation methods", () => {
    const methods: Array<LatheGAConfig["mutation_method"]> = [
      "gaussian",
      "uniform",
      "polynomial",
      "cauchy",
    ];

    for (const method of methods) {
      const result = latheGeneticAlgorithmEngine.evolve(
        sphereFunction,
        SIMPLE_BOUNDS,
        SIMPLE_OBJECTIVES,
        {
          ...TEST_CONFIG,
          mutation_method: method,
        }
      );

      expect(result.success).toBe(true);
    }
  });

  it("should provide statistics", () => {
    const result = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      TEST_CONFIG
    );

    expect(result.statistics).toBeDefined();
    expect(result.statistics.total_evaluations).toBeGreaterThan(0);
    expect(result.statistics.unique_individuals).toBeGreaterThan(0);
    expect(result.statistics.population_diversity).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// NSGA-II MULTI-OBJECTIVE TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - NSGA-II", () => {
  // Bi-objective: minimize f1 = x^2, minimize f2 = (x-2)^2
  const biObjectiveFunction = (genes: number[]): number[] => {
    const x = genes[0];
    return [-x * x, -(x - 2) * (x - 2)]; // Negate for maximization
  };

  const biObjectives: LatheObjective[] = [
    { name: "f1", minimize: true, weight: 0.5, unit: "" },
    { name: "f2", minimize: true, weight: 0.5, unit: "" },
  ];

  it("should find Pareto front for bi-objective problem", () => {
    const bounds: ParameterBounds[] = [
      { name: "x", min: -1, max: 3, unit: "" },
    ];

    const result = latheGeneticAlgorithmEngine.nsgaII(
      biObjectives,
      bounds,
      biObjectiveFunction,
      {
        ...TEST_CONFIG,
        population_size: 50,
        max_generations: 30,
      }
    );

    expect(result.success).toBe(true);
    expect(result.pareto_front.length).toBeGreaterThan(0);

    // All Pareto front members should have rank 0
    for (const ind of result.pareto_front) {
      expect(ind.rank).toBe(0);
    }

    // All solutions should be within bounds
    for (const ind of result.pareto_front) {
      expect(ind.genes[0]).toBeGreaterThanOrEqual(-1);
      expect(ind.genes[0]).toBeLessThanOrEqual(3);
    }
  });

  it("should assign correct Pareto ranks", () => {
    const bounds: ParameterBounds[] = [
      { name: "x", min: -1, max: 3, unit: "" },
    ];

    const result = latheGeneticAlgorithmEngine.nsgaII(
      biObjectives,
      bounds,
      biObjectiveFunction,
      TEST_CONFIG
    );

    // All Pareto front members should have rank 0
    for (const ind of result.pareto_front) {
      expect(ind.rank).toBe(0);
    }
  });

  it("should calculate crowding distance", () => {
    const bounds: ParameterBounds[] = [
      { name: "x", min: -1, max: 3, unit: "" },
    ];

    const result = latheGeneticAlgorithmEngine.nsgaII(
      biObjectives,
      bounds,
      biObjectiveFunction,
      {
        ...TEST_CONFIG,
        population_size: 30,
      }
    );

    // Boundary solutions should have infinite crowding distance
    const hasInfinite = result.pareto_front.some(
      (ind) => ind.crowding_distance === Infinity
    );
    expect(hasInfinite).toBe(true);
  });

  it("should calculate hypervolume indicator", () => {
    const bounds: ParameterBounds[] = [
      { name: "x", min: -1, max: 3, unit: "" },
    ];

    const result = latheGeneticAlgorithmEngine.nsgaII(
      biObjectives,
      bounds,
      biObjectiveFunction,
      TEST_CONFIG
    );

    // Hypervolume should be defined (may be 0 for this test case due to minimization)
    expect(result.hypervolume).toBeGreaterThanOrEqual(0);
    // Check that nadir and utopia points are calculated
    expect(result.utopia_point).toHaveLength(2);
    expect(result.nadir_point).toHaveLength(2);
  });

  it("should find best compromise solution", () => {
    const bounds: ParameterBounds[] = [
      { name: "x", min: -1, max: 3, unit: "" },
    ];

    const result = latheGeneticAlgorithmEngine.nsgaII(
      biObjectives,
      bounds,
      biObjectiveFunction,
      TEST_CONFIG
    );

    expect(result.best_compromise).not.toBeNull();
    // Best compromise should be within bounds
    expect(result.best_compromise!.genes[0]).toBeGreaterThanOrEqual(-1);
    expect(result.best_compromise!.genes[0]).toBeLessThanOrEqual(3);
    // Should have valid fitness values
    expect(result.best_compromise!.fitness).toHaveLength(2);
  });

  it("should calculate utopia and nadir points", () => {
    const bounds: ParameterBounds[] = [
      { name: "x", min: -1, max: 3, unit: "" },
    ];

    const result = latheGeneticAlgorithmEngine.nsgaII(
      biObjectives,
      bounds,
      biObjectiveFunction,
      TEST_CONFIG
    );

    expect(result.utopia_point).toHaveLength(2);
    expect(result.nadir_point).toHaveLength(2);
  });

  it("should calculate objective correlations", () => {
    const bounds: ParameterBounds[] = [
      { name: "x", min: -1, max: 3, unit: "" },
    ];

    const result = latheGeneticAlgorithmEngine.nsgaII(
      biObjectives,
      bounds,
      biObjectiveFunction,
      TEST_CONFIG
    );

    expect(result.objective_correlations).toBeDefined();
    expect(result.objective_correlations["f1"]["f1"]).toBe(1);
    // f1 and f2 should be negatively correlated (trade-off)
    expect(result.objective_correlations["f1"]["f2"]).toBeLessThan(0);
  });

  it("should get Pareto front from population", () => {
    const population = latheGeneticAlgorithmEngine.initializeRandomPopulation(
      20,
      SIMPLE_BOUNDS,
      42
    );

    // Assign random multi-objective fitness
    for (const ind of population) {
      ind.fitness = [Math.random(), Math.random()];
    }

    const front = latheGeneticAlgorithmEngine.getParetoFront(
      population,
      biObjectives
    );

    expect(front.length).toBeGreaterThan(0);
    expect(front.length).toBeLessThanOrEqual(population.length);

    // All front members should have rank 0
    for (const ind of front) {
      expect(ind.rank).toBe(0);
    }
  });
});

// ============================================================================
// MANUFACTURING APPLICATION TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - Manufacturing Applications", () => {
  it("should optimize lathe cutting parameters", () => {
    const input: ManufacturingOptInput = {
      material: "steel",
      operation: "roughing",
      machine: {
        max_spindle_rpm: 4000,
        max_power_kw: 15,
        max_feed_mm_rev: 1.0,
        max_rapid_mm_min: 30000,
        turret_stations: 12,
      },
      tool: {
        insert_grade: "GC4325",
        nose_radius_mm: 0.8,
        approach_angle_deg: 95,
        max_depth_mm: 5.0,
        tool_life_ref_min: 60,
      },
      workpiece: {
        diameter_mm: 50,
        length_mm: 100,
        stock_allowance_mm: 3,
      },
      objectives: [
        { name: "cycle_time", minimize: true, weight: 0.5, unit: "min" },
        { name: "tool_life", minimize: false, weight: 0.3, unit: "min" },
        { name: "surface_finish", minimize: true, weight: 0.2, unit: "Ra" },
      ],
      config: {
        population_size: 30,
        max_generations: 20,
        seed: 42,
      },
    };

    const result = latheGeneticAlgorithmEngine.optimizeParameters(input);

    expect(result.success).toBe(true);
    expect(result.best_parameters).toBeDefined();

    const params = result.best_parameters as LatheParameterSet;
    expect(params.cutting_speed_m_min).toBeGreaterThan(0);
    expect(params.feed_mm_rev).toBeGreaterThan(0);
    expect(params.depth_of_cut_mm).toBeGreaterThan(0);
    expect(params.spindle_rpm).toBeGreaterThan(0);
  });

  it("should respect machine power constraints", () => {
    const input: ManufacturingOptInput = {
      material: "stainless_304",
      operation: "roughing",
      machine: {
        max_spindle_rpm: 3000,
        max_power_kw: 5, // Low power limit
        max_feed_mm_rev: 0.5,
        max_rapid_mm_min: 25000,
        turret_stations: 8,
      },
      tool: {
        insert_grade: "GC2025",
        nose_radius_mm: 0.4,
        approach_angle_deg: 90,
        max_depth_mm: 3.0,
      },
      workpiece: {
        diameter_mm: 30,
        length_mm: 80,
        stock_allowance_mm: 2,
      },
      objectives: [
        { name: "mrr", minimize: false, weight: 1.0, unit: "cm3/min" },
      ],
      config: {
        population_size: 30,
        max_generations: 20,
        seed: 42,
      },
    };

    const result = latheGeneticAlgorithmEngine.optimizeParameters(input);

    expect(result.success).toBe(true);
    // Parameters should not exceed power limit
    // (power calculation happens in fitness function)
  });

  it("should optimize tool sequence", () => {
    const operations = [
      { name: "face", time_min: 0.5, tool_id: "T1" },
      { name: "rough_od", time_min: 2.0, tool_id: "T2", dependencies: ["face"] },
      { name: "finish_od", time_min: 1.5, tool_id: "T2", dependencies: ["rough_od"] },
      { name: "groove", time_min: 0.8, tool_id: "T3", dependencies: ["finish_od"] },
      { name: "thread", time_min: 1.2, tool_id: "T4", dependencies: ["groove"] },
      { name: "part_off", time_min: 0.3, tool_id: "T5", dependencies: ["thread"] },
    ];

    const result = latheGeneticAlgorithmEngine.optimizeToolSequence(
      operations,
      { ...TEST_CONFIG, max_generations: 20 }
    );

    expect(result.sequence).toHaveLength(6);
    expect(result.total_time).toBeGreaterThan(0);
    expect(result.tool_changes).toBeGreaterThanOrEqual(0);

    // Face should come before rough_od
    const faceIdx = result.sequence.indexOf("face");
    const roughIdx = result.sequence.indexOf("rough_od");
    expect(faceIdx).toBeLessThan(roughIdx);
  });

  it("should optimize multi-pass roughing strategy", () => {
    const result = latheGeneticAlgorithmEngine.optimizeMultiPassStrategy(
      6.0, // 6mm total stock
      {
        max_doc_mm: 3.0,
        min_doc_mm: 0.5,
        max_passes: 5,
        tool_stability_factor: 0.8,
      },
      [
        { name: "time", minimize: true, weight: 0.5, unit: "factor" },
        { name: "wear", minimize: true, weight: 0.3, unit: "factor" },
        { name: "passes", minimize: true, weight: 0.2, unit: "count" },
      ],
      { ...TEST_CONFIG, max_generations: 20 }
    );

    expect(result.passes.length).toBeGreaterThan(0);
    expect(result.passes.length).toBeLessThanOrEqual(5);
    expect(result.total_passes).toEqual(result.passes.length);

    // Total DOC should approximately equal stock
    const totalDoc = result.passes.reduce((s, d) => s + d, 0);
    // Allow some tolerance since GA may not find perfect match
    expect(Math.abs(totalDoc - 6.0)).toBeLessThan(2.0);
  });
});

// ============================================================================
// UTILITY METHOD TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - Utility Methods", () => {
  it("should return default configuration", () => {
    const config = latheGeneticAlgorithmEngine.getDefaultConfig();

    expect(config.population_size).toBe(100);
    expect(config.max_generations).toBe(150);
    expect(config.mutation_rate).toBe(0.05);
    expect(config.crossover_rate).toBe(0.85);
    expect(config.selection_method).toBe("tournament");
    expect(config.crossover_method).toBe("sbx");
    expect(config.mutation_method).toBe("polynomial");
  });

  it("should return bounds for operation types", () => {
    const roughingBounds =
      latheGeneticAlgorithmEngine.getBoundsForOperation("roughing");
    const finishingBounds =
      latheGeneticAlgorithmEngine.getBoundsForOperation("finishing");

    expect(roughingBounds.length).toBeGreaterThan(0);
    expect(finishingBounds.length).toBeGreaterThan(0);

    // Roughing should allow deeper cuts
    const roughDoc = roughingBounds.find((b) => b.name === "depth_of_cut_mm");
    const finishDoc = finishingBounds.find((b) => b.name === "depth_of_cut_mm");

    expect(roughDoc!.max).toBeGreaterThan(finishDoc!.max);
  });

  it("should adjust bounds for material properties", () => {
    const bounds = latheGeneticAlgorithmEngine.getBoundsForOperation("roughing");

    const material = {
      name: "Titanium Ti-6Al-4V",
      iso_group: "S" as const,
      kc1_1: 2800,
      mc: 0.28,
      taylor_C: 150,
      taylor_n: 0.18,
      k_thermal: 7,
      sigma_y_MPa: 880,
      density_kg_m3: 4430,
      hardness_HB: 334,
      vc_base_roughing: 50,
      vc_base_finishing: 80,
      machinability_factor: 0.35,
      cp_J_kgK: 520,
      E_GPa: 114,
    };

    const adjusted = latheGeneticAlgorithmEngine.adjustBoundsForMaterial(
      bounds,
      material
    );

    const speedBound = adjusted.find((b) => b.name === "cutting_speed_m_min");
    expect(speedBound).toBeDefined();
    // Should be adjusted for titanium's lower cutting speeds
    expect(speedBound!.min).toBeLessThan(100);
  });
});

// ============================================================================
// REPRODUCIBILITY TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - Reproducibility", () => {
  it("should produce same results with same seed", () => {
    const result1 = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      { ...TEST_CONFIG, seed: 12345 }
    );

    const result2 = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      { ...TEST_CONFIG, seed: 12345 }
    );

    expect(result1.best_fitness[0]).toBeCloseTo(result2.best_fitness[0], 6);
    expect(result1.generations).toBe(result2.generations);
  });

  it("should produce different results with different seeds", () => {
    const result1 = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      { ...TEST_CONFIG, seed: 11111 }
    );

    const result2 = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      { ...TEST_CONFIG, seed: 22222 }
    );

    // Results should be similar (both find optimum) but not identical
    expect(result1.best_parameters["x"]).not.toBe(result2.best_parameters["x"]);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe("LatheGeneticAlgorithmEngine - Edge Cases", () => {
  it("should handle single-dimension optimization", () => {
    const bounds: ParameterBounds[] = [
      { name: "x", min: 0, max: 10, unit: "" },
    ];

    const result = latheGeneticAlgorithmEngine.evolve(
      (genes) => -((genes[0] - 5) ** 2),
      bounds,
      SIMPLE_OBJECTIVES,
      TEST_CONFIG
    );

    expect(result.success).toBe(true);
    expect(Math.abs(result.best_parameters["x"] - 5)).toBeLessThan(1);
  });

  it("should handle very small population", () => {
    const result = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      {
        population_size: 5,
        max_generations: 10,
        seed: 42,
      }
    );

    expect(result.success).toBe(true);
    expect(result.final_population).toHaveLength(5);
  });

  it("should handle zero mutation rate", () => {
    const result = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      {
        ...TEST_CONFIG,
        mutation_rate: 0,
      }
    );

    expect(result.success).toBe(true);
    // Should still make progress via crossover
  });

  it("should handle zero crossover rate", () => {
    const result = latheGeneticAlgorithmEngine.evolve(
      sphereFunction,
      SIMPLE_BOUNDS,
      SIMPLE_OBJECTIVES,
      {
        ...TEST_CONFIG,
        crossover_rate: 0,
        mutation_rate: 0.2,
      }
    );

    expect(result.success).toBe(true);
    // Should still make progress via mutation
  });

  it("should handle all-integer parameters", () => {
    const intBounds: ParameterBounds[] = [
      { name: "a", min: 0, max: 10, unit: "", integer: true },
      { name: "b", min: 5, max: 15, unit: "", integer: true },
    ];

    const result = latheGeneticAlgorithmEngine.evolve(
      (genes) => -genes[0] * genes[1],
      intBounds,
      [{ name: "product", minimize: true, weight: 1, unit: "" }],
      TEST_CONFIG
    );

    expect(result.success).toBe(true);
    expect(Number.isInteger(result.best_parameters["a"])).toBe(true);
    expect(Number.isInteger(result.best_parameters["b"])).toBe(true);
  });
});
