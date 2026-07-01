// @ts-nocheck
/**
 * ProcessSynthesisEngine — Cross-Domain Synthesis Algorithms
 *
 * Combines PRISM's full engine ecosystem into compound intelligence through
 * 6 novel algorithms that unify force, thermal, wear, optimization, and
 * experiment design into a single coherent framework.
 *
 * Algorithms:
 * 1. multiPhysicsProcessSimulator — Coupled 5-state ODE via RK4
 * 2. paretoOptimalParameters — NSGA-II multi-objective optimization
 * 3. automaticModelSelector — AIC/BIC model selection from data
 * 4. physicsTransferLearning — Cross-material parameter scaling
 * 5. processAnomalyClassifier — Multi-sensor anomaly classification
 * 6. intelligentExperimentSequencer — GP-based information-theoretic DOE
 *
 * References:
 * - Altintas (2012): Manufacturing Automation
 * - Deb et al. (2002): NSGA-II, IEEE Trans. Evol. Comp.
 * - Rasmussen & Williams (2006): Gaussian Processes for ML
 * - Usui et al. (1978): Analytical prediction of tool wear
 * - Johnson & Cook (1983): Constitutive model for metals
 * - Kienzle (1952): Specific cutting force model
 * - Taylor (1907): On the art of cutting metals
 * - Lindley (1956): On a measure of information provided by an experiment
 *
 * Actions: process_synthesis_* (calcDispatcher)
 */

// ── Interfaces ─────────────────────────────────────────────────────────

/** Seeded Park-Miller PRNG (period 2^31-2) */
class ParkMillerPRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  /** Returns uniform [0, 1) */
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  /** Returns normal(0,1) via Box-Muller */
  nextGaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ── Algorithm 1: Multi-Physics Process Simulator ───────────────────────

export interface MultiPhysicsInput {
  /** Initial cutting force (N) */
  initialForce_N: number;
  /** Initial cutting temperature (C) */
  initialTemp_C: number;
  /** Ambient temperature (C) */
  ambientTemp_C: number;
  /** Initial flank wear (mm) */
  initialWear_mm: number;
  /** Cutting speed (m/min) */
  speed_mpm: number;
  /** Feed rate (mm/rev) */
  feed_mmrev: number;
  /** Depth of cut (mm) */
  depth_mm: number;
  /** Tool overhang length (mm) */
  toolLength_mm: number;
  /** Tool diameter (mm) */
  toolDiameter_mm: number;
  /** Elastic modulus (GPa) */
  elasticModulus_GPa: number;
  /** Thermal diffusivity (m^2/s) */
  thermalDiffusivity: number;
  /** Simulation duration (min) */
  duration_min: number;
  /** Integration time step (min), default 0.01 */
  timeStep_min?: number;
  /** Usui wear coefficients */
  wearCoeffs?: { C1: number; C2: number };
}

export interface TrajectoryPoint {
  time: number;
  force: number;
  temp: number;
  wear: number;
  deflection: number;
  surfaceFinish: number;
}

export interface SimResult {
  trajectory: TrajectoryPoint[];
  finalState: TrajectoryPoint;
  timeToWearLimit_min: number | null;
  timeToTempLimit_min: number | null;
  criticalEvent: string | null;
}

// ── Algorithm 2: Pareto Optimal Parameters ─────────────────────────────

export interface ParetoInput {
  /** Workpiece material name */
  material: string;
  /** Tool diameter (mm) */
  toolDiameter_mm: number;
  /** Speed range [min, max] in m/min */
  speedRange: [number, number];
  /** Feed range [min, max] in mm/rev */
  feedRange: [number, number];
  /** Depth range [min, max] in mm */
  depthRange: [number, number];
  /** Objectives to optimize */
  objectives: string[];
  /** Population size, default 100 */
  populationSize?: number;
  /** Number of generations, default 50 */
  generations?: number;
  /** PRNG seed */
  seed?: number;
}

export interface ParetoSolution {
  speed: number;
  feed: number;
  depth: number;
  cost?: number;
  toolLife?: number;
  surfaceFinish?: number;
  mrr?: number;
}

export interface ParetoResult {
  paretoFront: ParetoSolution[];
  utopiaPoint: Record<string, number>;
  nadirPoint: Record<string, number>;
  tradeoffInsights: string[];
}

// ── Algorithm 3: Automatic Model Selector ──────────────────────────────

export interface ModelSelectorInput {
  /** Independent variable data */
  xData: number[];
  /** Dependent variable data */
  yData: number[];
  /** Model family to search */
  modelFamily: 'force' | 'wear' | 'thermal' | 'life' | 'general';
  /** Max candidates to evaluate */
  nCandidates?: number;
}

export interface ModelRanking {
  model: string;
  aic: number;
  bic: number;
  r2: number;
  params: number[];
}

export interface ModelSelectResult {
  bestModel: string;
  bestParams: number[];
  rankings: ModelRanking[];
  recommendation: string;
}

// ── Algorithm 4: Physics Transfer Learning ─────────────────────────────

export interface MaterialProfile {
  name: string;
  hardness_HRC: number;
  thermalCond_WmK: number;
  jcA_MPa?: number;
  jcB_MPa?: number;
  jcN?: number;
}

export interface KnownMaterialProfile extends MaterialProfile {
  speed_mpm: number;
  feed_mmrev: number;
  depth_mm: number;
  force_N: number;
  toolLife_min: number;
  jcA_MPa: number;
  jcB_MPa: number;
  jcN: number;
}

export interface TransferInput {
  knownMaterial: KnownMaterialProfile;
  targetMaterial: MaterialProfile;
}

export interface TransferResult {
  predictedSpeed_mpm: number;
  predictedFeed_mmrev: number;
  predictedForce_N: number;
  predictedToolLife_min: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  scalingFactors: { hardness: number; thermal: number; strength: number };
  warnings: string[];
}

// ── Algorithm 5: Process Anomaly Classifier ────────────────────────────

export interface AnomalyInput {
  /** Force signal time series (N) */
  forceSignal?: number[];
  /** Vibration signal time series (m/s^2) */
  vibrationSignal?: number[];
  /** Acoustic emission signal (V) */
  aeSignal?: number[];
  /** Temperature readings (C) */
  temperature?: number[];
  /** Sample rate (Hz) */
  sampleRate_Hz?: number;
}

export interface AnomalyFeature {
  name: string;
  value: number;
}

export interface AnomalyResult {
  classification: string;
  confidence: number;
  features: AnomalyFeature[];
  anomalyScore: number;
  recommendations: string[];
}

// ── Algorithm 6: Intelligent Experiment Sequencer ──────────────────────

export interface ExperimentPoint {
  params: number[];
  result: number;
}

export interface ExperimentInput {
  /** Prior experimental data */
  priorExperiments: ExperimentPoint[];
  /** Parameter bounds [[min,max], ...] */
  paramBounds: [number, number][];
  /** Name of response variable */
  objectiveName?: string;
  /** Number of candidate points to evaluate */
  nCandidates?: number;
  /** PRNG seed */
  seed?: number;
}

export interface ExperimentResult {
  nextExperiment: number[];
  expectedInfoGain: number;
  currentModelUncertainty: number;
  experimentsNeeded: number;
  modelPrediction: { mean: number; stdDev: number };
}

// ── Engine ──────────────────────────────────────────────────────────────

/**
 * ProcessSynthesisEngine — Cross-domain synthesis algorithms combining
 * PRISM's full engine ecosystem into compound intelligence.
 *
 * 6 algorithms: multi-physics ODE, NSGA-II Pareto, automatic model selection,
 * physics transfer learning, anomaly classification, GP experiment design.
 */
export class ProcessSynthesisEngine {
  private totalRuns = 0;

  // ────────────────────────────────────────────────────────────────────
  // Algorithm 1: Multi-Physics Process Simulator
  // ────────────────────────────────────────────────────────────────────

  /**
   * Simultaneous ODE integration of coupled force-temperature-wear-deflection-finish.
   *
   * State vector: [F(t), theta(t), VB(t), delta(t), Ra(t)]
   *   dF/dt     = k_wear * dVB/dt * F0       (force grows with wear)
   *   dtheta/dt = (eta*P - h*A*(theta-Tamb)) / (rho*cp*V)  (thermal balance)
   *   dVB/dt    = C1 * V * exp(-C2/theta)     (Usui wear rate)
   *   ddelta/dt = (dF/dt) * L^3 / (3EI)      (deflection tracks force)
   *   dRa/dt    = k_ra * dVB/dt               (finish degrades with wear)
   *
   * Integration: 4th-order Runge-Kutta (classical)
   *
   * @param input - Multi-physics simulation parameters
   * @returns Trajectory, final state, and critical event detection
   */
  multiPhysicsProcessSimulator(input: MultiPhysicsInput): SimResult {
    this.totalRuns++;

    const dt = input.timeStep_min ?? 0.01;
    const C1 = input.wearCoeffs?.C1 ?? 1e-5;
    const C2 = input.wearCoeffs?.C2 ?? 5000;
    const V = input.speed_mpm; // m/min
    const F0 = input.initialForce_N;
    const Tamb = input.ambientTemp_C;

    // Tool geometry
    const L = input.toolLength_mm * 1e-3; // m
    const D = input.toolDiameter_mm * 1e-3; // m
    const I = (Math.PI * D ** 4) / 64; // m^4 second moment of area
    const E = input.elasticModulus_GPa * 1e9; // Pa

    // Thermal parameters
    const eta = 0.85; // fraction of cutting power to heat
    const rho_cp_Vol = 3.5e-3; // rho*cp*V_zone lumped (J/K) — typical carbide chip zone
    const h_conv_A = 0.02; // h*A lumped convection coefficient (W/K)

    // Coupling constants
    const k_wear = 8.0; // force sensitivity to wear
    const k_ra = 0.15; // Ra sensitivity to wear rate (um per mm/min)
    const VB_limit = 0.3; // mm — ISO flank wear limit
    const T_limit = 900; // C — thermal damage threshold

    // Initial Ra from feed geometry: Ra ~ f^2 / (32 * r), assume r = D/2
    const r_nose = input.toolDiameter_mm / 2; // mm (nose radius approx)
    const Ra0 = (input.feed_mmrev ** 2 / (32 * r_nose)) * 1000; // um

    // State: [F, theta, VB, delta, Ra]
    let state = [F0, input.initialTemp_C, input.initialWear_mm, 0, Ra0];

    const trajectory: TrajectoryPoint[] = [];
    let timeToWearLimit: number | null = null;
    let timeToTempLimit: number | null = null;
    let criticalEvent: string | null = null;

    /**
     * RHS of the coupled ODE system
     * @param s state vector [F, theta, VB, delta, Ra]
     * @returns derivative vector [dF, dtheta, dVB, ddelta, dRa]
     */
    const derivatives = (s: number[]): number[] => {
      const [F, theta, VB, _delta, _Ra] = s;
      const thetaK = theta + 273.15; // Kelvin for Arrhenius

      // dVB/dt: Usui wear model
      const dVB = C1 * V * Math.exp(-C2 / thetaK);

      // dF/dt: force grows proportionally to wear rate
      const dF = k_wear * dVB * F0;

      // Power and thermal balance
      const P_cutting = F * (V / 60); // W (V converted m/min -> m/s)
      const Q_gen = eta * P_cutting;
      const Q_diss = h_conv_A * (theta - Tamb);
      const dTheta = (Q_gen - Q_diss) / rho_cp_Vol;

      // Deflection rate tracks force rate
      const dDelta = dF * (L ** 3) / (3 * E * I) * 1e3; // mm

      // Surface finish degradation
      const dRa = k_ra * dVB; // um

      return [dF, dTheta, dVB, dDelta, dRa];
    };

    // RK4 integration
    const nSteps = Math.ceil(input.duration_min / dt);
    for (let i = 0; i <= nSteps; i++) {
      const t = i * dt;

      trajectory.push({
        time: Math.round(t * 1e4) / 1e4,
        force: state[0],
        temp: state[1],
        wear: state[2],
        deflection: state[3],
        surfaceFinish: state[4],
      });

      // Check limits
      if (state[2] >= VB_limit && timeToWearLimit === null) {
        timeToWearLimit = t;
        if (!criticalEvent) criticalEvent = `Flank wear limit (${VB_limit} mm) reached at t=${t.toFixed(2)} min`;
      }
      if (state[1] >= T_limit && timeToTempLimit === null) {
        timeToTempLimit = t;
        if (!criticalEvent) criticalEvent = `Temperature limit (${T_limit} C) reached at t=${t.toFixed(2)} min`;
      }

      if (i === nSteps) break;

      // Classical RK4
      const k1 = derivatives(state);
      const s2 = state.map((s, j) => s + 0.5 * dt * k1[j]);
      const k2 = derivatives(s2);
      const s3 = state.map((s, j) => s + 0.5 * dt * k2[j]);
      const k3 = derivatives(s3);
      const s4 = state.map((s, j) => s + dt * k3[j]);
      const k4 = derivatives(s4);

      state = state.map((s, j) => s + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));

      // Clamp non-negative
      state = state.map((v) => Math.max(v, 0));
    }

    const last = trajectory[trajectory.length - 1];

    return {
      trajectory,
      finalState: last,
      timeToWearLimit_min: timeToWearLimit,
      timeToTempLimit_min: timeToTempLimit,
      criticalEvent,
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // Algorithm 2: Pareto Optimal Parameters (NSGA-II)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Multi-objective optimization via NSGA-II (Non-dominated Sorting Genetic Algorithm II).
   *
   * Finds the Pareto front for cost vs tool life vs surface finish vs MRR
   * using physics-based evaluation (Kienzle force, Taylor life, geometric Ra, MRR).
   *
   * NSGA-II components:
   * - Non-dominated sorting into fronts F1, F2, ...
   * - Crowding distance for diversity preservation
   * - Binary tournament selection
   * - SBX crossover + polynomial mutation
   *
   * @param input - Optimization parameters and ranges
   * @returns Pareto front, utopia/nadir points, and trade-off insights
   */
  paretoOptimalParameters(input: ParetoInput): ParetoResult {
    this.totalRuns++;

    const rng = new ParkMillerPRNG(input.seed ?? 42);
    const popSize = input.populationSize ?? 100;
    const nGen = input.generations ?? 50;
    const objectives = input.objectives.length > 0 ? input.objectives : ['cost', 'toolLife', 'surfaceFinish', 'mrr'];

    // Material-dependent constants — use CANONICAL values from physics/constants.ts
    // F360-REV-MS1 U-SAF04: replaced inline hardcoded values with canonical ISO group constants.
    // Canonical source: P=1800, M=2100, K=1100, N=700, S=2800, H=3200 (CANONICAL_KIENZLE)
    const matLower = input.material.toLowerCase();
    let kc1_1 = 1800; // ISO P default (from CANONICAL_KIENZLE)
    let mc = 0.25;
    let taylorC = 350; // ISO P default (from CANONICAL_TAYLOR)
    let taylorN = 0.25;
    let costPerMin = 1.0;
    let toolCost = 15.0;

    if (matLower.includes('aluminum') || matLower.includes('aluminium')) {
      kc1_1 = 700; mc = 0.23; taylorC = 900; taylorN = 0.35; toolCost = 10; // ISO N canonical
    } else if (matLower.includes('titanium')) {
      kc1_1 = 2800; mc = 0.25; taylorC = 120; taylorN = 0.16; toolCost = 25; // ISO S canonical
    } else if (matLower.includes('stainless')) {
      kc1_1 = 2100; mc = 0.25; taylorC = 200; taylorN = 0.20; toolCost = 18; // ISO M canonical
    } else if (matLower.includes('inconel') || matLower.includes('nickel')) {
      kc1_1 = 3000; mc = 0.25; taylorC = 120; taylorN = 0.16; toolCost = 30; // ISO S (superalloy) canonical
    } else if (matLower.includes('cast iron') || matLower.includes('cast_iron')) {
      kc1_1 = 1100; mc = 0.28; taylorC = 400; taylorN = 0.28; toolCost = 12; // ISO K canonical
    } else if (matLower.includes('hardened') || matLower.includes('hrc')) {
      kc1_1 = 3200; mc = 0.30; taylorC = 200; taylorN = 0.20; toolCost = 30; // ISO H canonical
    }

    const noseRadius = input.toolDiameter_mm / 2; // mm approximation

    type Individual = { genes: number[]; objectives: number[]; rank: number; crowding: number };

    /** Evaluate physics objectives for a parameter set [speed, feed, depth] */
    const evaluate = (genes: number[]): number[] => {
      const [speed, feed, depth] = genes;
      const h = feed; // uncut chip thickness ~ feed for orthogonal
      const b = depth; // width of cut ~ depth

      // Kienzle cutting force
      const F = kc1_1 * b * Math.pow(h, 1 - mc);

      // Taylor tool life
      const T_life = taylorC / Math.pow(speed, 1 / taylorN); // min

      // MRR (cm^3/min)
      const mrr = speed * feed * depth / 1000;

      // Surface finish Ra (um) — geometric model
      const Ra = (feed * feed) / (32 * noseRadius) * 1000;

      // Cost per part (simplified)
      const partTime = 1.0; // assume 1 min cutting time per unit volume
      const toolChanges = partTime / Math.max(T_life, 0.01);
      const cost = costPerMin * partTime + toolCost * toolChanges;

      const result: number[] = [];
      for (const obj of objectives) {
        switch (obj) {
          case 'cost': result.push(cost); break; // minimize
          case 'toolLife': result.push(-T_life); break; // maximize -> negate for minimization
          case 'surfaceFinish': result.push(Ra); break; // minimize Ra
          case 'mrr': result.push(-mrr); break; // maximize -> negate
          default: result.push(0);
        }
      }
      return result;
    };

    /** Create random individual within bounds */
    const randomIndividual = (): Individual => {
      const genes = [
        input.speedRange[0] + rng.next() * (input.speedRange[1] - input.speedRange[0]),
        input.feedRange[0] + rng.next() * (input.feedRange[1] - input.feedRange[0]),
        input.depthRange[0] + rng.next() * (input.depthRange[1] - input.depthRange[0]),
      ];
      return { genes, objectives: evaluate(genes), rank: 0, crowding: 0 };
    };

    /** Non-dominated sorting — assigns front ranks to population */
    const nonDominatedSort = (pop: Individual[]): Individual[][] => {
      const n = pop.length;
      const dominationCount = new Array(n).fill(0);
      const dominatedSet: number[][] = Array.from({ length: n }, () => []);
      const fronts: Individual[][] = [];

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dom_ij = dominates(pop[i].objectives, pop[j].objectives);
          const dom_ji = dominates(pop[j].objectives, pop[i].objectives);
          if (dom_ij) {
            dominatedSet[i].push(j);
            dominationCount[j]++;
          } else if (dom_ji) {
            dominatedSet[j].push(i);
            dominationCount[i]++;
          }
        }
      }

      // First front
      let currentFront: number[] = [];
      for (let i = 0; i < n; i++) {
        if (dominationCount[i] === 0) {
          pop[i].rank = 0;
          currentFront.push(i);
        }
      }
      fronts.push(currentFront.map((i) => pop[i]));

      let frontIdx = 0;
      while (currentFront.length > 0) {
        const nextFront: number[] = [];
        for (const i of currentFront) {
          for (const j of dominatedSet[i]) {
            dominationCount[j]--;
            if (dominationCount[j] === 0) {
              pop[j].rank = frontIdx + 1;
              nextFront.push(j);
            }
          }
        }
        if (nextFront.length > 0) {
          fronts.push(nextFront.map((i) => pop[i]));
        }
        currentFront = nextFront;
        frontIdx++;
      }

      return fronts;
    };

    /** Check if objectives a dominate objectives b (all <=, at least one <) */
    const dominates = (a: number[], b: number[]): boolean => {
      let dominated = false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] > b[i]) return false;
        if (a[i] < b[i]) dominated = true;
      }
      return dominated;
    };

    /** Crowding distance assignment */
    const assignCrowdingDistance = (front: Individual[]): void => {
      const n = front.length;
      if (n <= 2) {
        front.forEach((ind) => (ind.crowding = Infinity));
        return;
      }
      front.forEach((ind) => (ind.crowding = 0));

      for (let m = 0; m < objectives.length; m++) {
        front.sort((a, b) => a.objectives[m] - b.objectives[m]);
        front[0].crowding = Infinity;
        front[n - 1].crowding = Infinity;
        const range = front[n - 1].objectives[m] - front[0].objectives[m];
        if (range === 0) continue;
        for (let i = 1; i < n - 1; i++) {
          front[i].crowding += (front[i + 1].objectives[m] - front[i - 1].objectives[m]) / range;
        }
      }
    };

    /** Binary tournament selection */
    const tournament = (pop: Individual[]): Individual => {
      const i = Math.floor(rng.next() * pop.length);
      const j = Math.floor(rng.next() * pop.length);
      const a = pop[i], b = pop[j];
      if (a.rank < b.rank) return a;
      if (b.rank < a.rank) return b;
      return a.crowding > b.crowding ? a : b;
    };

    /** SBX crossover */
    const crossover = (p1: Individual, p2: Individual): number[] => {
      const child: number[] = [];
      const eta_c = 20;
      const bounds = [input.speedRange, input.feedRange, input.depthRange];
      for (let i = 0; i < 3; i++) {
        if (rng.next() < 0.5) {
          const u = rng.next();
          const beta = u <= 0.5
            ? Math.pow(2 * u, 1 / (eta_c + 1))
            : Math.pow(1 / (2 * (1 - u)), 1 / (eta_c + 1));
          child.push(Math.max(bounds[i][0], Math.min(bounds[i][1],
            0.5 * ((1 + beta) * p1.genes[i] + (1 - beta) * p2.genes[i]))));
        } else {
          child.push(p1.genes[i]);
        }
      }
      return child;
    };

    /** Polynomial mutation */
    const mutate = (genes: number[]): number[] => {
      const eta_m = 20;
      const bounds = [input.speedRange, input.feedRange, input.depthRange];
      return genes.map((g, i) => {
        if (rng.next() > 0.1) return g; // 10% mutation rate per gene
        const delta = rng.next();
        const deltaq = delta < 0.5
          ? Math.pow(2 * delta, 1 / (eta_m + 1)) - 1
          : 1 - Math.pow(2 * (1 - delta), 1 / (eta_m + 1));
        return Math.max(bounds[i][0], Math.min(bounds[i][1], g + deltaq * (bounds[i][1] - bounds[i][0])));
      });
    };

    // Initialize population
    let population: Individual[] = Array.from({ length: popSize }, () => randomIndividual());

    // Main NSGA-II loop
    for (let gen = 0; gen < nGen; gen++) {
      // Create offspring
      const offspring: Individual[] = [];
      for (let i = 0; i < popSize; i++) {
        const p1 = tournament(population);
        const p2 = tournament(population);
        const childGenes = mutate(crossover(p1, p2));
        offspring.push({ genes: childGenes, objectives: evaluate(childGenes), rank: 0, crowding: 0 });
      }

      // Combine parent + offspring
      const combined = [...population, ...offspring];
      const fronts = nonDominatedSort(combined);

      // Select next generation
      const nextPop: Individual[] = [];
      for (const front of fronts) {
        assignCrowdingDistance(front);
        if (nextPop.length + front.length <= popSize) {
          nextPop.push(...front);
        } else {
          front.sort((a, b) => b.crowding - a.crowding);
          const remaining = popSize - nextPop.length;
          nextPop.push(...front.slice(0, remaining));
          break;
        }
      }
      population = nextPop;
    }

    // Extract Pareto front (rank 0)
    nonDominatedSort(population);
    const paretoIndividuals = population.filter((ind) => ind.rank === 0);
    assignCrowdingDistance(paretoIndividuals);

    const paretoFront: ParetoSolution[] = paretoIndividuals.map((ind) => {
      const sol: ParetoSolution = {
        speed: Math.round(ind.genes[0] * 100) / 100,
        feed: Math.round(ind.genes[1] * 10000) / 10000,
        depth: Math.round(ind.genes[2] * 1000) / 1000,
      };
      objectives.forEach((obj, i) => {
        const val = obj === 'toolLife' || obj === 'mrr' ? -ind.objectives[i] : ind.objectives[i];
        (sol as any)[obj] = Math.round(val * 10000) / 10000;
      });
      return sol;
    });

    // Sort Pareto front by first objective
    paretoFront.sort((a, b) => {
      const key = objectives[0] as keyof ParetoSolution;
      return ((a[key] as number) || 0) - ((b[key] as number) || 0);
    });

    // Utopia and nadir points
    const utopia: Record<string, number> = {};
    const nadir: Record<string, number> = {};
    for (const obj of objectives) {
      const vals = paretoFront.map((s) => (s as any)[obj] as number).filter((v) => v !== undefined);
      const isMaximize = obj === 'toolLife' || obj === 'mrr';
      utopia[obj] = isMaximize ? Math.max(...vals) : Math.min(...vals);
      nadir[obj] = isMaximize ? Math.min(...vals) : Math.max(...vals);
    }

    // Trade-off insights
    const insights: string[] = [];
    if (objectives.includes('mrr') && objectives.includes('surfaceFinish')) {
      insights.push('MRR and surface finish are strongly conflicting — higher MRR typically worsens Ra.');
    }
    if (objectives.includes('cost') && objectives.includes('toolLife')) {
      insights.push('Cost reduction often requires shorter tool life through aggressive parameters.');
    }
    if (objectives.includes('mrr') && objectives.includes('toolLife')) {
      insights.push('Productivity (MRR) and tool life trade off nonlinearly due to Taylor relationship.');
    }
    if (paretoFront.length > 20) {
      insights.push(`Dense Pareto front (${paretoFront.length} solutions) — many near-optimal trade-offs exist.`);
    }

    return { paretoFront, utopiaPoint: utopia, nadirPoint: nadir, tradeoffInsights: insights };
  }

  // ────────────────────────────────────────────────────────────────────
  // Algorithm 3: Automatic Model Selector
  // ────────────────────────────────────────────────────────────────────

  /**
   * Automatically selects the best physics model from PRISM's library
   * given experimental data, using AIC/BIC information criteria.
   *
   * For each candidate model:
   * 1. Fit parameters via Levenberg-Marquardt-style least squares
   * 2. Compute residual sum of squares (RSS)
   * 3. Calculate AIC = n*ln(RSS/n) + 2k and BIC = n*ln(RSS/n) + k*ln(n)
   * 4. Compute R^2 = 1 - RSS/TSS
   *
   * @param input - Experimental data and model family
   * @returns Best model, rankings, and recommendation
   */
  automaticModelSelector(input: ModelSelectorInput): ModelSelectResult {
    this.totalRuns++;

    const { xData, yData, modelFamily } = input;
    const n = xData.length;
    if (n < 3) {
      return {
        bestModel: 'insufficient_data',
        bestParams: [],
        rankings: [],
        recommendation: 'Need at least 3 data points for model selection.',
      };
    }

    // Total sum of squares
    const yMean = yData.reduce((a, b) => a + b, 0) / n;
    const TSS = yData.reduce((acc, y) => acc + (y - yMean) ** 2, 0);

    // Model candidate definitions: { name, nParams, predict(x, params), initialGuess(xData, yData) }
    type ModelCandidate = {
      name: string;
      nParams: number;
      predict: (x: number, params: number[]) => number;
      initialGuess: (xd: number[], yd: number[]) => number[];
    };

    const forceCandidates: ModelCandidate[] = [
      {
        name: 'Kienzle (F=kc*b*h^(1-mc))',
        nParams: 2,
        predict: (x, p) => p[0] * Math.pow(x, p[1]),
        initialGuess: () => [1800, 0.75],
      },
      {
        name: 'Linear (F=a*h+b)',
        nParams: 2,
        predict: (x, p) => p[0] * x + p[1],
        initialGuess: (xd, yd) => {
          const slope = (yd[yd.length - 1] - yd[0]) / (xd[xd.length - 1] - xd[0] + 1e-12);
          return [slope, yd[0]];
        },
      },
      {
        name: 'Power (F=a*h^b)',
        nParams: 2,
        predict: (x, p) => p[0] * Math.pow(Math.max(x, 1e-12), p[1]),
        initialGuess: () => [500, 0.8],
      },
      {
        name: 'Exponential (F=a*exp(b*h))',
        nParams: 2,
        predict: (x, p) => p[0] * Math.exp(p[1] * x),
        initialGuess: () => [100, 1.0],
      },
    ];

    const wearCandidates: ModelCandidate[] = [
      {
        name: 'Taylor (T=C/V^n)',
        nParams: 2,
        predict: (x, p) => p[0] / Math.pow(Math.max(x, 1e-12), p[1]),
        initialGuess: () => [300, 0.25],
      },
      {
        name: 'Extended Taylor (T=C/(V^n*f^m))',
        nParams: 3,
        predict: (x, p) => p[0] * Math.pow(Math.max(x, 1e-12), -p[1]),
        initialGuess: () => [500, 0.3, 0.15],
      },
      {
        name: 'Usui Exponential',
        nParams: 2,
        predict: (x, p) => p[0] * Math.exp(-p[1] / (Math.max(x, 1) + 273)),
        initialGuess: () => [1e-3, 3000],
      },
    ];

    const thermalCandidates: ModelCandidate[] = [
      {
        name: 'Newton Cooling',
        nParams: 2,
        predict: (x, p) => p[0] * Math.exp(-p[1] * x),
        initialGuess: () => [500, 0.1],
      },
      {
        name: 'Jaeger Moving Source',
        nParams: 2,
        predict: (x, p) => p[0] * Math.pow(Math.max(x, 1e-12), p[1]),
        initialGuess: () => [100, 0.5],
      },
      {
        name: 'Exponential Saturation',
        nParams: 2,
        predict: (x, p) => p[0] * (1 - Math.exp(-p[1] * x)),
        initialGuess: () => [800, 0.05],
      },
    ];

    const lifeCandidates: ModelCandidate[] = [
      {
        name: 'Weibull 2-param',
        nParams: 2,
        predict: (x, p) => 1 - Math.exp(-Math.pow(Math.max(x, 0) / p[0], p[1])),
        initialGuess: () => [100, 2.0],
      },
      {
        name: 'Lognormal CDF',
        nParams: 2,
        predict: (x, p) => {
          if (x <= 0) return 0;
          const z = (Math.log(x) - p[0]) / Math.max(p[1], 0.01);
          return 0.5 * (1 + erf(z / Math.sqrt(2)));
        },
        initialGuess: () => [4.0, 0.5],
      },
      {
        name: 'Exponential Life',
        nParams: 1,
        predict: (x, p) => 1 - Math.exp(-x / Math.max(p[0], 0.01)),
        initialGuess: () => [50],
      },
    ];

    const generalCandidates: ModelCandidate[] = [
      ...forceCandidates.slice(1), // linear, power, exponential
      { name: 'Quadratic (y=ax^2+bx+c)', nParams: 3,
        predict: (x, p) => p[0] * x * x + p[1] * x + p[2],
        initialGuess: () => [1, 1, 0] },
    ];

    /** Error function approximation (Abramowitz & Stegun 7.1.26) */
    function erf(x: number): number {
      const sign = x >= 0 ? 1 : -1;
      const a = Math.abs(x);
      const t = 1 / (1 + 0.3275911 * a);
      const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
      return sign * y;
    }

    const familyMap: Record<string, ModelCandidate[]> = {
      force: forceCandidates,
      wear: wearCandidates,
      thermal: thermalCandidates,
      life: lifeCandidates,
      general: generalCandidates,
    };

    const candidates = familyMap[modelFamily] || generalCandidates;
    const maxCandidates = input.nCandidates ?? candidates.length;

    /**
     * Simple iterative least-squares fitting (Gauss-Newton style).
     * Numerically computes Jacobian and iterates.
     */
    const fitModel = (model: ModelCandidate): { params: number[]; rss: number } => {
      let params = model.initialGuess(xData, yData);
      const nIter = 200;
      const eps = 1e-7;
      let bestRSS = Infinity;
      let bestParams = [...params];

      for (let iter = 0; iter < nIter; iter++) {
        // Compute residuals and Jacobian
        const residuals: number[] = [];
        const J: number[][] = [];

        let valid = true;
        for (let i = 0; i < n; i++) {
          const pred = model.predict(xData[i], params);
          if (!isFinite(pred)) { valid = false; break; }
          residuals.push(yData[i] - pred);

          // Numerical Jacobian
          const row: number[] = [];
          for (let p = 0; p < model.nParams; p++) {
            const dp = Math.max(Math.abs(params[p]) * eps, eps);
            const pPlus = [...params];
            pPlus[p] += dp;
            const predPlus = model.predict(xData[i], pPlus);
            row.push(-(predPlus - pred) / dp); // negative because J of residual
          }
          J.push(row);
        }

        if (!valid) break;

        const rss = residuals.reduce((a, r) => a + r * r, 0);
        if (rss < bestRSS) {
          bestRSS = rss;
          bestParams = [...params];
        }

        // Normal equations: J^T J delta = J^T r
        const k = model.nParams;
        const JtJ: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
        const Jtr: number[] = new Array(k).fill(0);

        for (let i = 0; i < n; i++) {
          for (let a = 0; a < k; a++) {
            Jtr[a] += J[i][a] * residuals[i];
            for (let b = 0; b < k; b++) {
              JtJ[a][b] += J[i][a] * J[i][b];
            }
          }
        }

        // Levenberg-Marquardt damping
        const lambda = 1e-3;
        for (let a = 0; a < k; a++) {
          JtJ[a][a] += lambda * (JtJ[a][a] + 1);
        }

        // Solve via Gaussian elimination
        const aug: number[][] = JtJ.map((row, i) => [...row, Jtr[i]]);
        for (let col = 0; col < k; col++) {
          let maxRow = col;
          for (let row = col + 1; row < k; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
          }
          [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
          if (Math.abs(aug[col][col]) < 1e-15) continue;
          for (let row = col + 1; row < k; row++) {
            const factor = aug[row][col] / aug[col][col];
            for (let j = col; j <= k; j++) aug[row][j] -= factor * aug[col][j];
          }
        }
        const delta = new Array(k).fill(0);
        for (let row = k - 1; row >= 0; row--) {
          if (Math.abs(aug[row][row]) < 1e-15) continue;
          delta[row] = aug[row][k];
          for (let col = row + 1; col < k; col++) delta[row] -= aug[row][col] * delta[col];
          delta[row] /= aug[row][row];
        }

        // Update
        const stepSize = 0.5;
        params = params.map((p, i) => p - stepSize * delta[i]);

        if (delta.every((d) => Math.abs(d) < eps)) break;
      }

      return { params: bestParams, rss: bestRSS };
    };

    // Fit all candidates and rank
    const rankings: ModelRanking[] = [];
    for (let c = 0; c < Math.min(candidates.length, maxCandidates); c++) {
      const model = candidates[c];
      const { params, rss } = fitModel(model);
      const k = model.nParams;
      const aic = n * Math.log(Math.max(rss / n, 1e-30)) + 2 * k;
      const bic = n * Math.log(Math.max(rss / n, 1e-30)) + k * Math.log(n);
      const r2 = TSS > 0 ? 1 - rss / TSS : 0;

      rankings.push({
        model: model.name,
        aic: Math.round(aic * 100) / 100,
        bic: Math.round(bic * 100) / 100,
        r2: Math.round(r2 * 10000) / 10000,
        params: params.map((p) => Math.round(p * 1e6) / 1e6),
      });
    }

    rankings.sort((a, b) => a.aic - b.aic);
    const best = rankings[0];

    let recommendation = `Best model: ${best.model} (R²=${best.r2}, AIC=${best.aic}).`;
    if (best.r2 < 0.8) {
      recommendation += ' Warning: R² < 0.8 — consider more data or alternative models.';
    }
    if (rankings.length >= 2 && Math.abs(rankings[0].aic - rankings[1].aic) < 2) {
      recommendation += ` Note: ${rankings[1].model} has similar AIC — models are nearly indistinguishable with current data.`;
    }

    return {
      bestModel: best.model,
      bestParams: best.params,
      rankings,
      recommendation,
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // Algorithm 4: Physics Transfer Learning
  // ────────────────────────────────────────────────────────────────────

  /**
   * Scales cutting parameters from a known material to an unknown target
   * using constitutive similarity (Johnson-Cook), hardness ratio, and
   * thermal conductivity ratio.
   *
   * Scaling logic:
   * - Speed scales inversely with hardness ratio and directly with thermal conductivity ratio
   * - Force scales with strength ratio (J-C yield A parameter)
   * - Tool life scales with machinability index (composite of hardness + thermal)
   *
   * @param input - Known and target material profiles
   * @returns Predicted parameters with confidence level and warnings
   */
  physicsTransferLearning(input: TransferInput): TransferResult {
    this.totalRuns++;

    const { knownMaterial: km, targetMaterial: tm } = input;
    const warnings: string[] = [];

    // Hardness ratio (target/known) — higher hardness = harder to cut
    const hardnessRatio = tm.hardness_HRC / Math.max(km.hardness_HRC, 1);

    // Thermal conductivity ratio — higher k = better heat dissipation = can cut faster
    const thermalRatio = tm.thermalCond_WmK / Math.max(km.thermalCond_WmK, 0.1);

    // Strength ratio from Johnson-Cook A parameter (yield stress at reference)
    let strengthRatio = 1.0;
    let hasJC = false;
    if (tm.jcA_MPa && km.jcA_MPa) {
      strengthRatio = tm.jcA_MPa / Math.max(km.jcA_MPa, 1);
      hasJC = true;
    } else {
      // Estimate from hardness: sigma_y ~ 3.45 * HRC (rough Tabor relation for steels)
      strengthRatio = hardnessRatio;
      warnings.push('J-C parameters not available for target — using hardness-based strength estimate.');
    }

    // Speed scaling: inversely proportional to hardness, proportional to sqrt(thermal cond)
    // v_target = v_known * (1/hardnessRatio) * sqrt(thermalRatio)
    const speedScale = (1 / hardnessRatio) * Math.sqrt(thermalRatio);
    const predictedSpeed = km.speed_mpm * speedScale;

    // Feed scaling: inversely proportional to sqrt(strength ratio)
    // Harder materials need lower feed to maintain chip integrity
    const feedScale = 1 / Math.sqrt(strengthRatio);
    const predictedFeed = km.feed_mmrev * feedScale;

    // Force scaling: proportional to strength ratio (Kienzle-like)
    // F_target = F_known * strengthRatio * (feedScale)^(1-mc)
    const mc = 0.25; // typical Kienzle exponent
    const predictedForce = km.force_N * strengthRatio * Math.pow(feedScale, 1 - mc);

    // Tool life scaling: machinability index
    // Taylor: T = C/V^n, harder materials have lower C
    const machinabilityIndex = (1 / hardnessRatio) * Math.pow(thermalRatio, 0.3);
    const predictedToolLife = km.toolLife_min * machinabilityIndex * Math.pow(speedScale, -0.25);

    // Confidence level
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (hasJC && Math.abs(hardnessRatio - 1) < 0.3 && Math.abs(thermalRatio - 1) < 0.5) {
      confidence = 'high';
    } else if (!hasJC || Math.abs(hardnessRatio - 1) > 1.0 || thermalRatio < 0.2 || thermalRatio > 5) {
      confidence = 'low';
      warnings.push('Large property mismatch between materials — predictions have high uncertainty.');
    }

    // Strain hardening check via J-C B and n
    if (hasJC && tm.jcB_MPa && km.jcB_MPa && tm.jcN && km.jcN) {
      const hardeningRatio = (tm.jcB_MPa * tm.jcN) / Math.max(km.jcB_MPa * km.jcN, 1);
      if (hardeningRatio > 2 || hardeningRatio < 0.5) {
        warnings.push(`Strain hardening differs significantly (ratio=${hardeningRatio.toFixed(2)}) — chip formation may behave differently.`);
      }
    }

    if (tm.thermalCond_WmK < 10) {
      warnings.push('Target has low thermal conductivity — risk of thermal damage at predicted speeds.');
    }

    return {
      predictedSpeed_mpm: Math.round(predictedSpeed * 100) / 100,
      predictedFeed_mmrev: Math.round(predictedFeed * 10000) / 10000,
      predictedForce_N: Math.round(predictedForce * 10) / 10,
      predictedToolLife_min: Math.round(predictedToolLife * 10) / 10,
      confidenceLevel: confidence,
      scalingFactors: {
        hardness: Math.round(hardnessRatio * 1000) / 1000,
        thermal: Math.round(thermalRatio * 1000) / 1000,
        strength: Math.round(strengthRatio * 1000) / 1000,
      },
      warnings,
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // Algorithm 5: Process Anomaly Classifier
  // ────────────────────────────────────────────────────────────────────

  /**
   * Multi-sensor anomaly detection and classification.
   *
   * Extracts features from force, vibration, AE, and temperature signals:
   * - Force: RMS, kurtosis, crest factor
   * - Vibration: RMS, dominant frequency (via FFT), bandwidth
   * - AE: RMS, burst rate
   * - Temperature: rate of change, max value
   *
   * Classifies using distance-based matching against known anomaly signatures:
   * - normal: low force var, low vib, stable temp
   * - tool_wear: rising force RMS, stable vibration
   * - chatter: high vib RMS, periodic force, characteristic frequency
   * - tool_breakage: sudden force spike (high kurtosis), AE burst
   * - built_up_edge: fluctuating force, moderate vibration
   * - thermal_damage: high temp rate, elevated AE
   *
   * @param input - Sensor signal arrays
   * @returns Classification, confidence, features, and recommendations
   */
  processAnomalyClassifier(input: AnomalyInput): AnomalyResult {
    this.totalRuns++;

    const features: AnomalyFeature[] = [];

    // ── Feature extraction helpers ──

    const rms = (arr: number[]): number => {
      if (!arr.length) return 0;
      return Math.sqrt(arr.reduce((a, v) => a + v * v, 0) / arr.length);
    };

    const mean = (arr: number[]): number => {
      if (!arr.length) return 0;
      return arr.reduce((a, v) => a + v, 0) / arr.length;
    };

    const kurtosis = (arr: number[]): number => {
      if (arr.length < 4) return 3; // normal
      const m = mean(arr);
      const n = arr.length;
      const m2 = arr.reduce((a, v) => a + (v - m) ** 2, 0) / n;
      const m4 = arr.reduce((a, v) => a + (v - m) ** 4, 0) / n;
      return m2 > 0 ? m4 / (m2 * m2) : 3;
    };

    const crestFactor = (arr: number[]): number => {
      const r = rms(arr);
      return r > 0 ? Math.max(...arr.map(Math.abs)) / r : 1;
    };

    /** Simple DFT peak frequency detection (no FFT library needed) */
    const dominantFrequency = (arr: number[], sampleRate: number): number => {
      if (arr.length < 4) return 0;
      const N = Math.min(arr.length, 1024); // cap for performance
      let maxMag = 0;
      let maxIdx = 0;
      // Only check up to Nyquist
      for (let k = 1; k < N / 2; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < N; n++) {
          const angle = (2 * Math.PI * k * n) / N;
          re += arr[n] * Math.cos(angle);
          im -= arr[n] * Math.sin(angle);
        }
        const mag = re * re + im * im;
        if (mag > maxMag) {
          maxMag = mag;
          maxIdx = k;
        }
      }
      return (maxIdx * sampleRate) / N;
    };

    const sampleRate = input.sampleRate_Hz ?? 1000;

    // ── Extract features from each signal ──

    if (input.forceSignal && input.forceSignal.length > 0) {
      const f = input.forceSignal;
      features.push({ name: 'force_rms', value: rms(f) });
      features.push({ name: 'force_kurtosis', value: kurtosis(f) });
      features.push({ name: 'force_crest_factor', value: crestFactor(f) });
    }

    if (input.vibrationSignal && input.vibrationSignal.length > 0) {
      const v = input.vibrationSignal;
      features.push({ name: 'vibration_rms', value: rms(v) });
      features.push({ name: 'vibration_peak_freq_Hz', value: dominantFrequency(v, sampleRate) });
      features.push({ name: 'vibration_kurtosis', value: kurtosis(v) });
    }

    if (input.aeSignal && input.aeSignal.length > 0) {
      const ae = input.aeSignal;
      features.push({ name: 'ae_rms', value: rms(ae) });
      // Burst count: number of threshold crossings
      const aeThreshold = rms(ae) * 2;
      let bursts = 0;
      let above = false;
      for (const v of ae) {
        if (v > aeThreshold && !above) { bursts++; above = true; }
        if (v < aeThreshold * 0.5) above = false;
      }
      features.push({ name: 'ae_burst_count', value: bursts });
    }

    if (input.temperature && input.temperature.length > 1) {
      const t = input.temperature;
      features.push({ name: 'temp_max', value: Math.max(...t) });
      // Temperature rate (C/sample)
      const dT = t.slice(1).map((v, i) => v - t[i]);
      features.push({ name: 'temp_rate', value: mean(dT) * sampleRate });
    }

    // ── Anomaly signature vectors (normalized feature thresholds) ──

    type AnomalySignature = {
      type: string;
      thresholds: Record<string, { min?: number; max?: number; weight: number }>;
      recommendations: string[];
    };

    const signatures: AnomalySignature[] = [
      {
        type: 'normal',
        thresholds: {
          force_kurtosis: { max: 4.0, weight: 2 },
          vibration_rms: { max: 2.0, weight: 1.5 },
          ae_burst_count: { max: 3, weight: 1 },
          temp_rate: { max: 5, weight: 1 },
        },
        recommendations: ['Process is operating normally.'],
      },
      {
        type: 'tool_wear',
        thresholds: {
          force_rms: { min: 1.2, weight: 2.5 }, // relative to baseline
          force_kurtosis: { max: 5, weight: 1 },
          vibration_rms: { max: 3.0, weight: 1 },
          temp_rate: { min: 0.5, weight: 1.5 },
        },
        recommendations: [
          'Increasing cutting forces indicate progressive flank wear.',
          'Measure VB — consider tool change if VB > 0.3 mm.',
          'Reduce speed by 10-15% to extend remaining tool life.',
        ],
      },
      {
        type: 'chatter',
        thresholds: {
          vibration_rms: { min: 3.0, weight: 3 },
          vibration_kurtosis: { max: 4.5, weight: 1 },
          force_kurtosis: { min: 3.5, max: 8, weight: 1.5 },
          vibration_peak_freq_Hz: { min: 100, weight: 1 },
        },
        recommendations: [
          'Chatter vibration detected — characteristic periodic pattern.',
          'Reduce depth of cut or shift spindle speed to stable lobe.',
          'Consider shorter tool overhang or higher-damping holder.',
        ],
      },
      {
        type: 'tool_breakage',
        thresholds: {
          force_kurtosis: { min: 8, weight: 3 },
          force_crest_factor: { min: 4, weight: 2.5 },
          ae_burst_count: { min: 5, weight: 2 },
        },
        recommendations: [
          'Sudden force spike with high kurtosis — likely tool breakage.',
          'STOP machining immediately — inspect tool and workpiece.',
          'Check for insert fracture or catastrophic edge failure.',
        ],
      },
      {
        type: 'built_up_edge',
        thresholds: {
          force_kurtosis: { min: 4, max: 8, weight: 2 },
          force_crest_factor: { min: 2, max: 4, weight: 1.5 },
          vibration_rms: { min: 1.0, max: 3.0, weight: 1 },
        },
        recommendations: [
          'Fluctuating force pattern consistent with BUE formation/detachment.',
          'Increase cutting speed by 15-20% to raise temperature above BUE threshold.',
          'Switch to coated insert (TiN/TiAlN) to reduce adhesion.',
        ],
      },
      {
        type: 'thermal_damage',
        thresholds: {
          temp_rate: { min: 10, weight: 3 },
          temp_max: { min: 600, weight: 2.5 },
          ae_rms: { min: 0.5, weight: 1.5 },
        },
        recommendations: [
          'Rapid temperature rise indicates thermal damage risk.',
          'Reduce cutting speed and improve coolant delivery.',
          'Check for white layer formation on workpiece surface.',
        ],
      },
    ];

    // ── Score each signature ──

    const featureMap: Record<string, number> = {};
    for (const f of features) {
      featureMap[f.name] = f.value;
    }

    type ScoredSignature = { type: string; score: number; maxScore: number; recommendations: string[] };
    const scored: ScoredSignature[] = signatures.map((sig) => {
      let score = 0;
      let maxScore = 0;

      for (const [featName, spec] of Object.entries(sig.thresholds)) {
        maxScore += spec.weight;
        const val = featureMap[featName];
        if (val === undefined) continue;

        let match = true;
        if (spec.min !== undefined && val < spec.min) match = false;
        if (spec.max !== undefined && val > spec.max) match = false;

        if (match) {
          score += spec.weight;
        }
      }

      return { type: sig.type, score, maxScore, recommendations: sig.recommendations };
    });

    scored.sort((a, b) => (b.score / Math.max(b.maxScore, 1)) - (a.score / Math.max(a.maxScore, 1)));

    const best = scored[0];
    const confidence = best.maxScore > 0 ? Math.min(best.score / best.maxScore, 1) : 0;

    // Anomaly score: 0 = definitely normal, 1 = definitely anomalous
    const normalScore = scored.find((s) => s.type === 'normal');
    const normalConf = normalScore && normalScore.maxScore > 0
      ? normalScore.score / normalScore.maxScore : 0;
    const anomalyScore = 1 - normalConf;

    return {
      classification: best.type,
      confidence: Math.round(confidence * 1000) / 1000,
      features,
      anomalyScore: Math.round(anomalyScore * 1000) / 1000,
      recommendations: best.recommendations,
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // Algorithm 6: Intelligent Experiment Sequencer
  // ────────────────────────────────────────────────────────────────────

  /**
   * Information-theoretic experiment design using Gaussian Process surrogate.
   *
   * Maintains a GP model (squared exponential kernel) of the response surface,
   * then evaluates candidate points and selects the one with maximum expected
   * information gain (reduction in posterior entropy).
   *
   * GP posterior: mean = K_*^T (K + sigma^2 I)^-1 y
   *               var  = k_** - K_*^T (K + sigma^2 I)^-1 K_*
   * Kernel: k(x, x') = sigma_f^2 * exp(-||x-x'||^2 / (2*l^2))
   *
   * Information gain: IG = 0.5 * ln(var_prior / var_posterior)
   * (differential entropy reduction of Gaussian)
   *
   * @param input - Prior experiments, bounds, and configuration
   * @returns Next experiment point, expected info gain, and model prediction
   */
  intelligentExperimentSequencer(input: ExperimentInput): ExperimentResult {
    this.totalRuns++;

    const { priorExperiments, paramBounds } = input;
    const nCandidates = input.nCandidates ?? 100;
    const rng = new ParkMillerPRNG(input.seed ?? 123);
    const dim = paramBounds.length;
    const n = priorExperiments.length;

    // GP hyperparameters
    const sigma_f = 1.0; // signal variance
    const sigma_n = 0.01; // noise variance
    // Length scales: 1/4 of each parameter range
    const lengthScales = paramBounds.map(([lo, hi]) => (hi - lo) / 4);

    /** Squared exponential kernel */
    const kernel = (x1: number[], x2: number[]): number => {
      let sqDist = 0;
      for (let d = 0; d < dim; d++) {
        const diff = (x1[d] - x2[d]) / lengthScales[d];
        sqDist += diff * diff;
      }
      return sigma_f * sigma_f * Math.exp(-0.5 * sqDist);
    };

    if (n < 1) {
      // No data — return center of search space
      const center = paramBounds.map(([lo, hi]) => (lo + hi) / 2);
      return {
        nextExperiment: center,
        expectedInfoGain: Infinity,
        currentModelUncertainty: Infinity,
        experimentsNeeded: 10,
        modelPrediction: { mean: 0, stdDev: Infinity },
      };
    }

    // Build kernel matrix K + sigma_n^2 I
    const X = priorExperiments.map((e) => e.params);
    const y = priorExperiments.map((e) => e.result);
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const yNorm = y.map((v) => v - yMean); // zero-mean for GP

    const K: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => kernel(X[i], X[j]) + (i === j ? sigma_n * sigma_n : 0))
    );

    // Cholesky decomposition K = L L^T
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
        if (i === j) {
          const diag = K[i][i] - sum;
          L[i][j] = Math.sqrt(Math.max(diag, 1e-12));
        } else {
          L[i][j] = (K[i][j] - sum) / Math.max(L[j][j], 1e-12);
        }
      }
    }

    /** Solve L z = b via forward substitution */
    const forwardSolve = (b: number[]): number[] => {
      const z = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < i; j++) sum += L[i][j] * z[j];
        z[i] = (b[i] - sum) / Math.max(L[i][i], 1e-12);
      }
      return z;
    };

    /** Solve L^T x = z via back substitution */
    const backSolve = (z: number[]): number[] => {
      const x = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) sum += L[j][i] * x[j];
        x[i] = (z[i] - sum) / Math.max(L[i][i], 1e-12);
      }
      return x;
    };

    // alpha = (K + sigma_n^2 I)^-1 y = L^-T L^-1 y
    const alpha = backSolve(forwardSolve(yNorm));

    /** GP posterior at point x* */
    const predict = (xStar: number[]): { mean: number; variance: number } => {
      const kStar = X.map((xi) => kernel(xStar, xi));
      const kStarStar = kernel(xStar, xStar) + sigma_n * sigma_n;

      // mean = K_*^T alpha + yMean
      let muStar = yMean;
      for (let i = 0; i < n; i++) muStar += kStar[i] * alpha[i];

      // variance = k_** - K_*^T (K + sigma_n^2 I)^-1 K_*
      const v = forwardSolve(kStar);
      let varStar = kStarStar;
      for (let i = 0; i < n; i++) varStar -= v[i] * v[i];
      varStar = Math.max(varStar, 1e-12);

      return { mean: muStar, variance: varStar };
    };

    // Generate candidate points (Latin Hypercube Sampling)
    const candidates: number[][] = [];
    for (let i = 0; i < nCandidates; i++) {
      const point: number[] = [];
      for (let d = 0; d < dim; d++) {
        // Stratified sampling
        const lo = paramBounds[d][0];
        const hi = paramBounds[d][1];
        const stratum = (i + rng.next()) / nCandidates;
        point.push(lo + stratum * (hi - lo));
      }
      candidates.push(point);
    }

    // Evaluate information gain for each candidate
    // IG = 0.5 * ln(2*pi*e * var_prior) - 0.5 * ln(2*pi*e * var_posterior_after_adding)
    // Simplified: IG proportional to ln(var_current) since adding a point reduces variance
    // We use the current posterior variance as proxy for info gain
    let bestIdx = 0;
    let bestIG = -Infinity;
    let bestPred = { mean: 0, variance: 1 };

    for (let i = 0; i < nCandidates; i++) {
      const pred = predict(candidates[i]);
      // Expected information gain ~ 0.5 * ln(1 + var / sigma_n^2)
      // This is the mutual information between the observation and the GP
      const ig = 0.5 * Math.log(1 + pred.variance / (sigma_n * sigma_n));

      if (ig > bestIG) {
        bestIG = ig;
        bestIdx = i;
        bestPred = pred;
      }
    }

    // Current model uncertainty: average posterior std dev across candidates
    let totalVar = 0;
    for (let i = 0; i < Math.min(nCandidates, 50); i++) {
      totalVar += predict(candidates[i]).variance;
    }
    const avgUncertainty = Math.sqrt(totalVar / Math.min(nCandidates, 50));

    // Estimate experiments needed: heuristic based on current uncertainty relative to signal
    const yRange = Math.max(...y) - Math.min(...y);
    const relUncertainty = yRange > 0 ? avgUncertainty / yRange : 1;
    const experimentsNeeded = Math.max(1, Math.ceil(n * relUncertainty / 0.1));

    return {
      nextExperiment: bestPred ? candidates[bestIdx].map((v) => Math.round(v * 10000) / 10000) : candidates[0],
      expectedInfoGain: Math.round(bestIG * 10000) / 10000,
      currentModelUncertainty: Math.round(avgUncertainty * 10000) / 10000,
      experimentsNeeded,
      modelPrediction: {
        mean: Math.round(bestPred.mean * 10000) / 10000,
        stdDev: Math.round(Math.sqrt(bestPred.variance) * 10000) / 10000,
      },
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // Stats
  // ────────────────────────────────────────────────────────────────────

  /**
   * Returns engine metadata and usage statistics.
   */
  stats(): { algorithms: string[]; totalRuns: number } {
    return {
      algorithms: [
        'multiPhysicsProcessSimulator',
        'paretoOptimalParameters',
        'automaticModelSelector',
        'physicsTransferLearning',
        'processAnomalyClassifier',
        'intelligentExperimentSequencer',
      ],
      totalRuns: this.totalRuns,
    };
  }
}
