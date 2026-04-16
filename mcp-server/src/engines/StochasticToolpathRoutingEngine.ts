/**
 * StochasticToolpathRoutingEngine — Monte Carlo Strategy Optimization
 *
 * Treats toolpath strategy selection as a stochastic optimization problem.
 * Samples N toolpath variants by perturbing parameters (entry point, direction,
 * step pattern, stepover, feed/RPM multipliers), evaluates each with
 * Kienzle/Taylor physics, builds a Pareto front via non-dominated sorting
 * (NSGA-II style), and selects optimal variants by priority or TOPSIS.
 *
 * Physics references:
 *   Kienzle & Victor (1952): Fc = kc1_1 * ap * fz^(1-mc)
 *   Taylor (1907): VT^n = C  =>  T = (C/Vc)^(1/n)
 *   Scallop height: h = R - sqrt(R² - (ae/2)²)
 *   Cutting power: P = Fc * Vc / (60 * 1000) kW
 *
 * PRNG: Mulberry32 (32-bit seeded generator) for reproducible sampling.
 *
 * @module StochasticToolpathRoutingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** 2D point for pocket boundary and entry positions. */
export interface Point2D {
  x: number;
  y: number;
}

/** Pocket geometry defining the machining region. */
export interface PocketGeometry {
  boundary: Point2D[];
  depth_mm: number;
  width_mm: number;
  length_mm: number;
}

/** Ranges for Monte Carlo perturbation of toolpath parameters. */
export interface PerturbationRanges {
  direction_deg?: number;
  stepover_pct?: number;
  feed_mult_range?: [number, number];
  rpm_mult_range?: [number, number];
  patterns?: string[];
}

/** A single sampled toolpath variant with perturbed parameters. */
export interface ToolpathVariant {
  id: number;
  entry_point: Point2D;
  direction_deg: number;
  pattern: string;
  stepover_pct: number;
  feed_multiplier: number;
  rpm_multiplier: number;
  estimated_path_length_mm: number;
}

/** Material cutting parameters for Kienzle and Taylor models. */
export interface MaterialParams {
  name: string;
  /** Kienzle specific cutting force coefficient (N/mm²) */
  kc1_1: number;
  /** Kienzle exponent */
  mc: number;
  /** Taylor constant C (m/min) */
  taylor_C: number;
  /** Taylor exponent n */
  taylor_n: number;
}

/** Tool geometry and cost parameters. */
export interface ToolParams {
  diameter_mm: number;
  flute_count: number;
  max_rpm: number;
  base_feed_mm_min: number;
  base_rpm: number;
  cost_per_tool: number;
  nose_radius_mm?: number;
}

/** Multi-objective evaluation results for a single variant. */
export interface ObjectiveValues {
  /** Total cycle time in seconds */
  cycle_time_s: number;
  /** Surface quality score 0-100 (higher = better) */
  surface_quality_score: number;
  /** Taylor tool life in minutes */
  tool_life_min: number;
  /** Cost per part in currency units */
  cost_per_part: number;
  /** Cutting energy in kWh */
  energy_kWh: number;
}

/** A variant paired with its physics-based objective evaluation. */
export interface EvaluatedVariant {
  variant: ToolpathVariant;
  objectives: ObjectiveValues;
}

/** Pareto front from non-dominated sorting. */
export interface ParetoFront {
  solutions: EvaluatedVariant[];
  size: number;
  dominated_count: number;
}

/** Sensitivity of objectives to a single parameter perturbation. */
export interface ParameterSensitivity {
  parameter: string;
  base_value: number;
  delta_cycle_time_pct: number;
  delta_quality_pct: number;
  delta_life_pct: number;
  delta_cost_pct: number;
  delta_energy_pct: number;
  importance_score: number;
}

/** Result of sensitivity analysis across all parameters. */
export interface SensitivityResult {
  sensitivities: ParameterSensitivity[];
  most_important: string;
  least_important: string;
}

/** Result of batch optimization across multiple pockets. */
export interface BatchResult {
  pocket_results: Array<{
    pocket_index: number;
    selected: EvaluatedVariant;
    pareto_size: number;
    remaining_tool_life_min: number;
  }>;
  total_cycle_time_s: number;
  total_cost: number;
  total_tool_changes: number;
}

/** Selection result with explanation. */
export interface SelectionResult {
  selected: EvaluatedVariant;
  priority: string;
  trade_off_explanation: string;
  pareto_rank: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PATTERNS = ['zigzag', 'spiral', 'contour', 'morphed_spiral'];

const MACHINE_RATE_PER_MIN = 1.50; // $/min default
const TOOL_CHANGE_TIME_S = 30;
const RAPID_FEED_MM_MIN = 10000;
const CUTTING_EFFICIENCY = 0.75; // motor-to-cut efficiency

/** Inline material database for common materials. */
const MATERIAL_DB: Record<string, MaterialParams> = {
  steel_1045:    { name: 'steel_1045',    kc1_1: 1800, mc: 0.25, taylor_C: 250, taylor_n: 0.25 },
  aluminum_6061: { name: 'aluminum_6061', kc1_1: 700,  mc: 0.23, taylor_C: 600, taylor_n: 0.28 },
  titanium_6al4v:{ name: 'titanium_6al4v',kc1_1: 2800, mc: 0.28, taylor_C: 80,  taylor_n: 0.20 },
};

// ============================================================================
// PRNG — Mulberry32 (seeded 32-bit generator)
// ============================================================================

/**
 * Mulberry32: a fast, high-quality 32-bit seeded PRNG.
 * Returns a function that yields [0,1) on each call.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

/** Euclidean distance between two 2D points. */
function dist2D(a: Point2D, b: Point2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Linear interpolation between two points at parameter t in [0,1]. */
function lerp2D(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Compute perimeter of a polygon from its boundary points. */
function polygonPerimeter(boundary: Point2D[]): number {
  let perim = 0;
  for (let i = 0; i < boundary.length; i++) {
    const next = boundary[(i + 1) % boundary.length];
    perim += dist2D(boundary[i], next);
  }
  return perim;
}

/** Pick a random point on a polygon boundary given a uniform random in [0,1). */
function randomBoundaryPoint(boundary: Point2D[], rnd: number): Point2D {
  const perim = polygonPerimeter(boundary);
  let target = rnd * perim;
  for (let i = 0; i < boundary.length; i++) {
    const next = boundary[(i + 1) % boundary.length];
    const segLen = dist2D(boundary[i], next);
    if (target <= segLen) {
      return lerp2D(boundary[i], next, segLen > 0 ? target / segLen : 0);
    }
    target -= segLen;
  }
  return boundary[0];
}

/**
 * Estimate toolpath length for a given pocket, pattern, and stepover.
 * Simplified geometric model per pattern type.
 */
function estimatePathLength(
  pocket: PocketGeometry,
  pattern: string,
  stepover_pct: number,
  tool_diameter_mm: number
): number {
  const ae = tool_diameter_mm * (stepover_pct / 100);
  const passes_width = Math.ceil(pocket.width_mm / Math.max(ae, 0.01));
  const passes_depth = Math.ceil(pocket.depth_mm / Math.max(tool_diameter_mm * 0.5, 0.01));

  switch (pattern) {
    case 'zigzag':
      // Back-and-forth passes across the pocket
      return passes_width * pocket.length_mm * passes_depth;
    case 'spiral':
      // Spiral from outside inward — slightly longer due to curves
      return passes_width * pocket.length_mm * passes_depth * 1.08;
    case 'contour':
      // Concentric offset passes
      return passes_width * (2 * (pocket.length_mm + pocket.width_mm)) * passes_depth * 0.5;
    case 'morphed_spiral':
      // Morphed spiral adapts to pocket shape — moderate overhead
      return passes_width * pocket.length_mm * passes_depth * 1.15;
    default:
      return passes_width * pocket.length_mm * passes_depth;
  }
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * StochasticToolpathRoutingEngine
 *
 * Monte Carlo toolpath strategy optimizer. Samples N variants by perturbing
 * toolpath parameters, evaluates each with Kienzle/Taylor physics, builds
 * a Pareto front, and selects optimal solutions by priority or TOPSIS.
 */
export class StochasticToolpathRoutingEngine {

  /**
   * Look up a material by name, falling back to the inline database.
   * @param nameOrParams - material name string or full MaterialParams
   * @returns resolved MaterialParams
   */
  private resolveMaterial(nameOrParams: string | MaterialParams): MaterialParams {
    if (typeof nameOrParams === 'object') return nameOrParams;
    const key = nameOrParams.toLowerCase().replace(/[\s-]/g, '_');
    const mat = MATERIAL_DB[key];
    if (!mat) throw new Error(`Unknown material: ${nameOrParams}. Available: ${Object.keys(MATERIAL_DB).join(', ')}`);
    return mat;
  }

  // --------------------------------------------------------------------------
  // 1. sampleVariants
  // --------------------------------------------------------------------------

  /**
   * Generate N toolpath variants by Monte Carlo sampling with Mulberry32 PRNG.
   *
   * Each variant perturbs: entry point (uniform on boundary), cut direction,
   * step pattern, stepover, feed multiplier, and RPM multiplier.
   *
   * @param pocket - Pocket geometry
   * @param N - Number of variants to sample (default 100)
   * @param perturbation - Parameter perturbation ranges
   * @param seed - PRNG seed for reproducibility (default 42)
   * @returns Array of N ToolpathVariant objects
   */
  sampleVariants(
    pocket: PocketGeometry,
    N: number = 100,
    perturbation: PerturbationRanges = {},
    seed: number = 42
  ): ToolpathVariant[] {
    const rng = mulberry32(seed);

    const baseDirection = 0; // degrees
    const dirRange = perturbation.direction_deg ?? 45;
    const baseStepover = 50; // percent of tool diameter
    const stepRange = perturbation.stepover_pct ?? 20;
    const feedRange = perturbation.feed_mult_range ?? [0.8, 1.2];
    const rpmRange = perturbation.rpm_mult_range ?? [0.9, 1.1];
    const patterns = perturbation.patterns ?? DEFAULT_PATTERNS;

    // Default tool diameter estimate from pocket width (25% engagement)
    const approxToolDia = Math.min(pocket.width_mm * 0.5, 25);

    const variants: ToolpathVariant[] = [];
    for (let i = 0; i < N; i++) {
      const entryPoint = randomBoundaryPoint(pocket.boundary, rng());
      const direction = baseDirection + (rng() * 2 - 1) * dirRange;
      const pattern = patterns[Math.floor(rng() * patterns.length)];
      const stepover = Math.max(5, Math.min(95,
        baseStepover + (rng() * 2 - 1) * stepRange
      ));
      const feedMult = feedRange[0] + rng() * (feedRange[1] - feedRange[0]);
      const rpmMult = rpmRange[0] + rng() * (rpmRange[1] - rpmRange[0]);
      const pathLen = estimatePathLength(pocket, pattern, stepover, approxToolDia);

      variants.push({
        id: i,
        entry_point: { x: round2(entryPoint.x), y: round2(entryPoint.y) },
        direction_deg: round2(direction),
        pattern,
        stepover_pct: round2(stepover),
        feed_multiplier: round4(feedMult),
        rpm_multiplier: round4(rpmMult),
        estimated_path_length_mm: round2(pathLen),
      });
    }

    return variants;
  }

  // --------------------------------------------------------------------------
  // 2. evaluateVariant
  // --------------------------------------------------------------------------

  /**
   * Evaluate a single toolpath variant using Kienzle/Taylor physics.
   *
   * Computes: cutting force (Kienzle), tool life (Taylor), cycle time,
   * surface quality (scallop height model), cost, and energy.
   *
   * @param variant - The toolpath variant to evaluate
   * @param material - Material cutting parameters
   * @param tool - Tool geometry and cost parameters
   * @returns EvaluatedVariant with physics-based objective values
   */
  evaluateVariant(
    variant: ToolpathVariant,
    material: string | MaterialParams,
    tool: ToolParams
  ): EvaluatedVariant {
    const mat = typeof material === 'string' ? this.resolveMaterial(material) : material;

    // Effective cutting parameters
    const rpm = tool.base_rpm * variant.rpm_multiplier;
    const feedPerRev = (tool.base_feed_mm_min * variant.feed_multiplier) / rpm;
    const fz = feedPerRev / tool.flute_count;
    const ae = tool.diameter_mm * (variant.stepover_pct / 100);
    const ap = Math.min(tool.diameter_mm * 0.5, 5); // axial depth heuristic
    const Vc = (Math.PI * tool.diameter_mm * rpm) / 1000; // m/min

    // Kienzle cutting force: Fc = kc1_1 * ap * fz^(1 - mc)
    const Fc = mat.kc1_1 * ap * Math.pow(Math.max(fz, 0.001), 1 - mat.mc);

    // Taylor tool life: T = (C / Vc)^(1/n) minutes
    const toolLife = Math.pow(mat.taylor_C / Math.max(Vc, 0.1), 1 / mat.taylor_n);

    // Cutting power: P = Fc * Vc / (60 * 1000) kW
    const P_kW = (Fc * Vc) / 60000;

    // Effective feed rate
    const effectiveFeed = tool.base_feed_mm_min * variant.feed_multiplier;

    // Cycle time: cutting time + rapid time + tool change time
    const cuttingTime_s = (variant.estimated_path_length_mm / Math.max(effectiveFeed, 1)) * 60;
    // Rapid moves ~20% of path length at rapid feed
    const rapidTime_s = (variant.estimated_path_length_mm * 0.2 / RAPID_FEED_MM_MIN) * 60;
    // Tool changes: ceil(cutting_time / tool_life)
    const toolChanges = Math.max(0, Math.ceil(cuttingTime_s / 60 / Math.max(toolLife, 0.1)) - 1);
    const cycleTime_s = cuttingTime_s + rapidTime_s + toolChanges * TOOL_CHANGE_TIME_S;

    // Surface quality score based on scallop height
    // Scallop h = R - sqrt(R² - (ae/2)²), where R = tool radius or nose radius
    const R = tool.nose_radius_mm ?? tool.diameter_mm / 2;
    const halfAe = ae / 2;
    const scallop_mm = halfAe < R
      ? R - Math.sqrt(R * R - halfAe * halfAe)
      : R; // full scallop if ae > diameter
    // Score: 100 for scallop=0, decaying exponentially
    const surfaceQuality = round2(100 * Math.exp(-scallop_mm * 20));

    // Cost: machine time cost + tooling cost
    const machineTimeCost = (cycleTime_s / 60) * MACHINE_RATE_PER_MIN;
    const toolCost = tool.cost_per_tool * (cuttingTime_s / 60) / Math.max(toolLife, 0.1);
    const cost = round2(machineTimeCost + toolCost);

    // Energy: P * cutting_time / 3600, adjusted for motor efficiency
    const energy_kWh = round4((P_kW / CUTTING_EFFICIENCY) * (cuttingTime_s / 3600));

    return {
      variant,
      objectives: {
        cycle_time_s: round2(cycleTime_s),
        surface_quality_score: surfaceQuality,
        tool_life_min: round2(toolLife),
        cost_per_part: cost,
        energy_kWh,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 3. buildParetoFront
  // --------------------------------------------------------------------------

  /**
   * Non-dominated sorting (NSGA-II style) to extract the Pareto front.
   *
   * Dominance: variant A dominates B if A is at least as good on all objectives
   * and strictly better on at least one. Objectives: minimize cycle_time, cost,
   * energy; maximize surface_quality_score, tool_life_min.
   *
   * Computes crowding distance for diversity preservation.
   *
   * @param evaluations - Array of evaluated variants
   * @returns ParetoFront with non-dominated solutions sorted by crowding distance
   */
  buildParetoFront(evaluations: EvaluatedVariant[]): ParetoFront {
    if (evaluations.length === 0) {
      return { solutions: [], size: 0, dominated_count: 0 };
    }

    // Objectives: [cycle_time, quality, life, cost, energy]
    // Minimize: cycle_time, cost, energy. Maximize: quality, life.
    // Normalize to "lower is better" by negating maximization objectives.
    const normalize = (obj: ObjectiveValues): number[] => [
      obj.cycle_time_s,
      -obj.surface_quality_score, // negate: lower = better quality
      -obj.tool_life_min,         // negate: lower = longer life
      obj.cost_per_part,
      obj.energy_kWh,
    ];

    /**
     * Check if a dominates b (all normalized objectives <= and at least one <).
     */
    const dominates = (a: number[], b: number[]): boolean => {
      let strictlyBetter = false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] > b[i]) return false;
        if (a[i] < b[i]) strictlyBetter = true;
      }
      return strictlyBetter;
    };

    const normalized = evaluations.map(e => normalize(e.objectives));
    const n = evaluations.length;
    const dominated = new Array<boolean>(n).fill(false);

    // Find non-dominated set (rank 0)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && dominates(normalized[j], normalized[i])) {
          dominated[i] = true;
          break;
        }
      }
    }

    const front = evaluations.filter((_, i) => !dominated[i]);
    const dominatedCount = n - front.length;

    // Compute crowding distance for front solutions
    if (front.length > 2) {
      const crowding = new Array<number>(front.length).fill(0);
      const frontNorm = front.map(e => normalize(e.objectives));
      const numObj = frontNorm[0].length;

      for (let m = 0; m < numObj; m++) {
        // Sort indices by objective m
        const indices = Array.from({ length: front.length }, (_, i) => i);
        indices.sort((a, b) => frontNorm[a][m] - frontNorm[b][m]);

        // Boundary solutions get infinite crowding
        crowding[indices[0]] = Infinity;
        crowding[indices[indices.length - 1]] = Infinity;

        const objRange = frontNorm[indices[indices.length - 1]][m] - frontNorm[indices[0]][m];
        if (objRange > 0) {
          for (let k = 1; k < indices.length - 1; k++) {
            crowding[indices[k]] +=
              (frontNorm[indices[k + 1]][m] - frontNorm[indices[k - 1]][m]) / objRange;
          }
        }
      }

      // Sort front by descending crowding distance (higher = more diverse)
      const sortedIndices = Array.from({ length: front.length }, (_, i) => i);
      sortedIndices.sort((a, b) => crowding[b] - crowding[a]);
      const sortedFront = sortedIndices.map(i => front[i]);

      return {
        solutions: sortedFront,
        size: sortedFront.length,
        dominated_count: dominatedCount,
      };
    }

    return {
      solutions: front,
      size: front.length,
      dominated_count: dominatedCount,
    };
  }

  // --------------------------------------------------------------------------
  // 4. selectOptimal
  // --------------------------------------------------------------------------

  /**
   * Select the best variant from the Pareto front based on a priority.
   *
   * Priorities: speed (min cycle_time), quality (max surface_quality),
   * life (max tool_life), cost (min cost), balanced (TOPSIS with equal weights).
   *
   * @param pareto - Pareto front from buildParetoFront
   * @param priority - Selection priority
   * @returns SelectionResult with chosen variant and trade-off explanation
   */
  selectOptimal(
    pareto: ParetoFront,
    priority: 'speed' | 'quality' | 'life' | 'cost' | 'balanced' = 'balanced'
  ): SelectionResult {
    if (pareto.solutions.length === 0) {
      throw new Error('Cannot select from empty Pareto front');
    }

    const sols = pareto.solutions;
    let bestIdx = 0;

    if (priority === 'speed') {
      bestIdx = sols.reduce((bi, s, i) =>
        s.objectives.cycle_time_s < sols[bi].objectives.cycle_time_s ? i : bi, 0);
    } else if (priority === 'quality') {
      bestIdx = sols.reduce((bi, s, i) =>
        s.objectives.surface_quality_score > sols[bi].objectives.surface_quality_score ? i : bi, 0);
    } else if (priority === 'life') {
      bestIdx = sols.reduce((bi, s, i) =>
        s.objectives.tool_life_min > sols[bi].objectives.tool_life_min ? i : bi, 0);
    } else if (priority === 'cost') {
      bestIdx = sols.reduce((bi, s, i) =>
        s.objectives.cost_per_part < sols[bi].objectives.cost_per_part ? i : bi, 0);
    } else {
      // TOPSIS with equal weights
      bestIdx = this.topsisSelect(sols);
    }

    const selected = sols[bestIdx];
    const obj = selected.objectives;

    // Build trade-off explanation
    const avgTime = sols.reduce((s, e) => s + e.objectives.cycle_time_s, 0) / sols.length;
    const avgCost = sols.reduce((s, e) => s + e.objectives.cost_per_part, 0) / sols.length;
    const explanation = `Selected variant #${selected.variant.id} (${selected.variant.pattern}) ` +
      `by ${priority} priority. Cycle time: ${obj.cycle_time_s}s ` +
      `(${round2((obj.cycle_time_s / avgTime - 1) * 100)}% vs Pareto avg), ` +
      `cost: $${obj.cost_per_part} (${round2((obj.cost_per_part / avgCost - 1) * 100)}% vs avg), ` +
      `quality: ${obj.surface_quality_score}, tool life: ${obj.tool_life_min} min.`;

    return {
      selected,
      priority,
      trade_off_explanation: explanation,
      pareto_rank: 0, // all are rank 0 (non-dominated)
    };
  }

  /**
   * TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)
   * with equal weights across all 5 objectives.
   */
  private topsisSelect(solutions: EvaluatedVariant[]): number {
    const n = solutions.length;
    if (n === 1) return 0;

    // Build normalized decision matrix (5 objectives)
    // Columns: cycle_time(-), quality(+), life(+), cost(-), energy(-)
    const raw: number[][] = solutions.map(s => [
      s.objectives.cycle_time_s,
      s.objectives.surface_quality_score,
      s.objectives.tool_life_min,
      s.objectives.cost_per_part,
      s.objectives.energy_kWh,
    ]);

    // Vector normalization
    const norms = [0, 0, 0, 0, 0];
    for (const row of raw) {
      for (let j = 0; j < 5; j++) norms[j] += row[j] * row[j];
    }
    for (let j = 0; j < 5; j++) norms[j] = Math.sqrt(norms[j]) || 1;

    const norm: number[][] = raw.map(row => row.map((v, j) => v / norms[j]));

    // Equal weights
    const w = 1 / 5;
    const weighted = norm.map(row => row.map(v => v * w));

    // Ideal and anti-ideal (columns 1,2 = benefit; 0,3,4 = cost)
    const ideal = [Infinity, -Infinity, -Infinity, Infinity, Infinity];
    const antiIdeal = [-Infinity, Infinity, Infinity, -Infinity, -Infinity];
    const isBenefit = [false, true, true, false, false];

    for (const row of weighted) {
      for (let j = 0; j < 5; j++) {
        if (isBenefit[j]) {
          if (row[j] > ideal[j]) ideal[j] = row[j];
          if (row[j] < antiIdeal[j]) antiIdeal[j] = row[j];
        } else {
          if (row[j] < ideal[j]) ideal[j] = row[j];
          if (row[j] > antiIdeal[j]) antiIdeal[j] = row[j];
        }
      }
    }

    // Distance to ideal and anti-ideal
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      let dPlus = 0, dMinus = 0;
      for (let j = 0; j < 5; j++) {
        dPlus += (weighted[i][j] - ideal[j]) ** 2;
        dMinus += (weighted[i][j] - antiIdeal[j]) ** 2;
      }
      dPlus = Math.sqrt(dPlus);
      dMinus = Math.sqrt(dMinus);
      const score = dMinus / (dPlus + dMinus + 1e-12);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  // --------------------------------------------------------------------------
  // 5. sensitivityAnalysis
  // --------------------------------------------------------------------------

  /**
   * One-at-a-time (OAT) sensitivity analysis.
   *
   * Perturbs each toolpath parameter by ±10% from a base variant,
   * measures the relative change in all objectives, and ranks parameters
   * by aggregate importance.
   *
   * @param pocket - Pocket geometry
   * @param material - Material parameters
   * @param tool - Tool parameters
   * @param baseVariant - Base variant to perturb around
   * @returns SensitivityResult with ranked parameter importance
   */
  sensitivityAnalysis(
    pocket: PocketGeometry,
    material: string | MaterialParams,
    tool: ToolParams,
    baseVariant: ToolpathVariant
  ): SensitivityResult {
    const mat = typeof material === 'string' ? this.resolveMaterial(material) : material;
    const baseEval = this.evaluateVariant(baseVariant, mat, tool);
    const baseObj = baseEval.objectives;

    const parameters: Array<{ name: string; key: keyof ToolpathVariant; perturb: number }> = [
      { name: 'direction_deg', key: 'direction_deg', perturb: 0.1 },
      { name: 'stepover_pct', key: 'stepover_pct', perturb: 0.1 },
      { name: 'feed_multiplier', key: 'feed_multiplier', perturb: 0.1 },
      { name: 'rpm_multiplier', key: 'rpm_multiplier', perturb: 0.1 },
    ];

    const sensitivities: ParameterSensitivity[] = [];

    for (const param of parameters) {
      const baseVal = baseVariant[param.key] as number;
      const delta = baseVal * param.perturb;

      // Perturb up
      const upVariant: ToolpathVariant = {
        ...baseVariant,
        [param.key]: baseVal + delta,
        estimated_path_length_mm: estimatePathLength(
          pocket,
          baseVariant.pattern,
          param.key === 'stepover_pct' ? (baseVal + delta) : baseVariant.stepover_pct,
          tool.diameter_mm
        ),
      };
      const upEval = this.evaluateVariant(upVariant, mat, tool);

      // Perturb down
      const downVariant: ToolpathVariant = {
        ...baseVariant,
        [param.key]: Math.max(baseVal - delta, 0.01),
        estimated_path_length_mm: estimatePathLength(
          pocket,
          baseVariant.pattern,
          param.key === 'stepover_pct' ? Math.max(baseVal - delta, 5) : baseVariant.stepover_pct,
          tool.diameter_mm
        ),
      };
      const downEval = this.evaluateVariant(downVariant, mat, tool);

      // Central difference: (up - down) / (2 * delta) normalized by base
      const deltaTime = safeRelDelta(upEval.objectives.cycle_time_s, downEval.objectives.cycle_time_s, baseObj.cycle_time_s);
      const deltaQual = safeRelDelta(upEval.objectives.surface_quality_score, downEval.objectives.surface_quality_score, baseObj.surface_quality_score);
      const deltaLife = safeRelDelta(upEval.objectives.tool_life_min, downEval.objectives.tool_life_min, baseObj.tool_life_min);
      const deltaCost = safeRelDelta(upEval.objectives.cost_per_part, downEval.objectives.cost_per_part, baseObj.cost_per_part);
      const deltaEnergy = safeRelDelta(upEval.objectives.energy_kWh, downEval.objectives.energy_kWh, baseObj.energy_kWh);

      const importance = (Math.abs(deltaTime) + Math.abs(deltaQual) + Math.abs(deltaLife) +
                          Math.abs(deltaCost) + Math.abs(deltaEnergy)) / 5;

      sensitivities.push({
        parameter: param.name,
        base_value: round4(baseVal),
        delta_cycle_time_pct: round2(deltaTime),
        delta_quality_pct: round2(deltaQual),
        delta_life_pct: round2(deltaLife),
        delta_cost_pct: round2(deltaCost),
        delta_energy_pct: round2(deltaEnergy),
        importance_score: round4(importance),
      });
    }

    // Sort by importance descending
    sensitivities.sort((a, b) => b.importance_score - a.importance_score);

    return {
      sensitivities,
      most_important: sensitivities[0]?.parameter ?? 'none',
      least_important: sensitivities[sensitivities.length - 1]?.parameter ?? 'none',
    };
  }

  // --------------------------------------------------------------------------
  // 6. batchOptimize
  // --------------------------------------------------------------------------

  /**
   * Optimize multiple pockets in sequence, sharing tool life across the batch.
   *
   * For each pocket: sample variants, evaluate, build Pareto, select optimal.
   * Remaining tool life carries over; tool changes are tracked globally.
   *
   * @param pockets - Array of pocket geometries
   * @param material - Material parameters
   * @param tool - Tool parameters
   * @param priority - Selection priority
   * @param N - Samples per pocket (default 100)
   * @param seed - PRNG seed (default 42)
   * @returns BatchResult with per-pocket results and totals
   */
  batchOptimize(
    pockets: PocketGeometry[],
    material: string | MaterialParams,
    tool: ToolParams,
    priority: 'speed' | 'quality' | 'life' | 'cost' | 'balanced' = 'balanced',
    N: number = 100,
    seed: number = 42
  ): BatchResult {
    const mat = typeof material === 'string' ? this.resolveMaterial(material) : material;

    let remainingToolLife = Infinity; // fresh tool
    let totalCycleTime = 0;
    let totalCost = 0;
    let totalToolChanges = 0;
    const pocketResults: BatchResult['pocket_results'] = [];

    for (let pi = 0; pi < pockets.length; pi++) {
      const pocket = pockets[pi];
      const variants = this.sampleVariants(pocket, N, {}, seed + pi);
      const evals = variants.map(v => this.evaluateVariant(v, mat, tool));
      const pareto = this.buildParetoFront(evals);

      if (pareto.solutions.length === 0) {
        continue;
      }

      const selection = this.selectOptimal(pareto, priority);
      const obj = selection.selected.objectives;

      // Track tool life across pockets
      const cuttingTimeMin = obj.cycle_time_s / 60;
      if (remainingToolLife === Infinity) {
        remainingToolLife = obj.tool_life_min;
      }

      // Tool changes needed for this pocket
      let pocketToolChanges = 0;
      if (cuttingTimeMin > remainingToolLife) {
        pocketToolChanges = Math.ceil((cuttingTimeMin - remainingToolLife) / obj.tool_life_min);
        remainingToolLife = obj.tool_life_min - ((cuttingTimeMin - remainingToolLife) % obj.tool_life_min);
      } else {
        remainingToolLife -= cuttingTimeMin;
      }

      totalCycleTime += obj.cycle_time_s + pocketToolChanges * TOOL_CHANGE_TIME_S;
      totalCost += obj.cost_per_part;
      totalToolChanges += pocketToolChanges;

      pocketResults.push({
        pocket_index: pi,
        selected: selection.selected,
        pareto_size: pareto.size,
        remaining_tool_life_min: round2(remainingToolLife),
      });
    }

    return {
      pocket_results: pocketResults,
      total_cycle_time_s: round2(totalCycleTime),
      total_cost: round2(totalCost),
      total_tool_changes: totalToolChanges,
    };
  }

  // --------------------------------------------------------------------------
  // Dispatcher entry point
  // --------------------------------------------------------------------------

  /**
   * Dispatch an action by name. Used by toolpathDispatcher.
   *
   * @param action - Action name
   * @param params - Action parameters
   * @returns Action result
   */
  dispatch(action: string, params: Record<string, unknown>): unknown {
    switch (action) {
      case 'sample_variants':
        return this.sampleVariants(
          params.pocket as PocketGeometry,
          (params.N as number) ?? 100,
          (params.perturbation as PerturbationRanges) ?? {},
          (params.seed as number) ?? 42
        );
      case 'evaluate_variant':
        return this.evaluateVariant(
          params.variant as ToolpathVariant,
          (params.material as string | MaterialParams),
          params.tool as ToolParams
        );
      case 'build_pareto':
        return this.buildParetoFront(params.evaluations as EvaluatedVariant[]);
      case 'select_optimal':
        return this.selectOptimal(
          params.pareto as ParetoFront,
          (params.priority as 'speed' | 'quality' | 'life' | 'cost' | 'balanced') ?? 'balanced'
        );
      case 'sensitivity_analysis':
        return this.sensitivityAnalysis(
          params.pocket as PocketGeometry,
          (params.material as string | MaterialParams),
          params.tool as ToolParams,
          params.baseVariant as ToolpathVariant
        );
      case 'batch_optimize':
        return this.batchOptimize(
          params.pockets as PocketGeometry[],
          (params.material as string | MaterialParams),
          params.tool as ToolParams,
          (params.priority as 'speed' | 'quality' | 'life' | 'cost' | 'balanced') ?? 'balanced',
          (params.N as number) ?? 100,
          (params.seed as number) ?? 42
        );
      default:
        throw new Error(`StochasticToolpathRoutingEngine: unknown action '${action}'`);
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Compute relative delta as percentage: (up - down) / base * 100 / 2
 * Safe against zero base values.
 */
function safeRelDelta(up: number, down: number, base: number): number {
  if (Math.abs(base) < 1e-12) return 0;
  return ((up - down) / (2 * base)) * 100;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const stochasticToolpathRoutingEngine = new StochasticToolpathRoutingEngine();
