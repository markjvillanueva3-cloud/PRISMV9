/**
 * AssemblyOptimizationEngine — Multi-part assembly optimization
 *
 * Provides 6 methods for assembly sequence planning, tolerance stack-up,
 * line balancing, press-fit analysis, assembly time estimation, and DFA scoring.
 *
 *   1. sequencePlan     — Liaison graph + topological sort assembly sequencing
 *   2. toleranceStack   — Worst-case + RSS + Monte Carlo tolerance analysis
 *   3. lineBalance      — Ranked Positional Weight (RPW) line balancing
 *   4. pegInHole        — Lamé equation press-fit interference analysis
 *   5. assemblyTime     — Simplified MOST time estimation + Crawford learning curve
 *   6. dfaScore         — Boothroyd-Dewhurst Design for Assembly scoring
 *
 * All models are self-contained with inline math — no external libraries.
 *
 * References:
 *   Boothroyd G., Dewhurst P., Knight W. (2011) "Product Design for Manufacture and Assembly" CRC Press
 *   De Fazio T.L., Whitney D.E. (1987) "Simplified Generation of All Mechanical Assembly Sequences" IEEE J. Robotics
 *   Lamé G. (1852) "Leçons sur la théorie mathématique de l'élasticité des corps solides"
 *   Helgeson W.B., Birnie D.P. (1961) "Assembly Line Balancing Using the Ranked Positional Weight Technique" J. Ind. Eng.
 *   Crawford J.R. (1944) "Learning Curve, Ship Costs, and Production Standards" SAE
 *   Zandin K.B. (2003) "MOST Work Measurement Systems" CRC Press
 */

// ─── Types ─────────────────────────────────────────────────────────

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ─── Sequence Planning Types ───────────────────────────────────────

/** Contact (liaison) between two parts. */
export interface Contact {
  part_a: string;
  part_b: string;
  direction: string;
}

/** Input for assembly sequence planning. */
export interface SequencePlanInput {
  parts: string[];
  contacts: Contact[];
  base_part: string;
}

/** Output of assembly sequence planning. */
export interface SequencePlanResult {
  optimal_sequence: string[];
  score: number;
  stability_score: number;
  accessibility_score: number;
  tool_change_score: number;
  recommendations: string[];
}

// ─── Tolerance Stack Types ─────────────────────────────────────────

/** A single dimension in the tolerance stack. */
export interface DimensionInput {
  name: string;
  nominal_mm: number;
  tolerance_plus_mm: number;
  tolerance_minus_mm: number;
  distribution?: 'uniform' | 'normal' | 'triangular';
}

/** Input for tolerance stack-up analysis. */
export interface ToleranceStackInput {
  dimensions: DimensionInput[];
  assembly_gap_target_mm: number;
}

/** Worst-case tolerance result. */
export interface WorstCaseResult {
  gap_min: number;
  gap_max: number;
  total_tolerance: number;
}

/** RSS statistical tolerance result. */
export interface RSSResult {
  gap_mean: number;
  gap_sigma: number;
  gap_min_3sigma: number;
  gap_max_3sigma: number;
  Cpk: number;
}

/** Monte Carlo tolerance result. */
export interface MonteCarloResult {
  mean: number;
  std: number;
  min: number;
  max: number;
  p_out_of_spec_pct: number;
  samples: number;
}

/** Combined tolerance stack output. */
export interface ToleranceStackResult {
  worst_case: WorstCaseResult;
  statistical_rss: RSSResult;
  monte_carlo: MonteCarloResult;
}

// ─── Line Balance Types ────────────────────────────────────────────

/** A task in the line balancing problem. */
export interface TaskInput {
  id: string;
  duration_s: number;
  predecessors: string[];
}

/** Input for line balancing. */
export interface LineBalanceInput {
  tasks: TaskInput[];
  cycle_time_s: number;
}

/** A station assignment in the balanced line. */
export interface StationAssignment {
  station: number;
  tasks: string[];
  station_time_s: number;
  idle_time_s: number;
}

/** Output of line balancing. */
export interface LineBalanceResult {
  stations: StationAssignment[];
  num_stations: number;
  efficiency_pct: number;
  balance_delay_pct: number;
  smoothness_index: number;
  bottleneck: string;
}

// ─── Press-Fit Types ───────────────────────────────────────────────

/** Input for press-fit (peg-in-hole) analysis. */
export interface PegInHoleInput {
  peg_diameter_mm: number;
  hole_diameter_mm: number;
  length_mm: number;
  material_peg: string;
  material_hole: string;
}

/** Output of press-fit analysis. */
export interface PegInHoleResult {
  interference_mm: number;
  contact_pressure_MPa: number;
  insertion_force_N: number;
  extraction_force_N: number;
  hoop_stress_hub_MPa: number;
  radial_stress_shaft_MPa: number;
  safety_factor: number;
  thermal_assembly_delta_T_C: number;
}

// ─── Assembly Time Types ───────────────────────────────────────────

/** An assembly operation for time estimation. */
export interface AssemblyOperation {
  type: 'pick' | 'place' | 'fasten' | 'align' | 'inspect';
  weight_kg?: number;
  distance_mm?: number;
}

/** Input for assembly time estimation. */
export interface AssemblyTimeInput {
  operations: AssemblyOperation[];
  learning_rate?: number;
  num_units?: number;
}

/** Time breakdown for a single operation. */
export interface OperationTimeBreakdown {
  type: string;
  base_time_s: number;
  weight_adder_s: number;
  distance_adder_s: number;
  total_s: number;
}

/** Output of assembly time estimation. */
export interface AssemblyTimeResult {
  total_seconds: number;
  breakdown: OperationTimeBreakdown[];
  with_learning_curve: { unit_number: number; time_s: number }[];
}

// ─── DFA Types ─────────────────────────────────────────────────────

/** A part for DFA analysis. */
export interface DFAPartInput {
  name: string;
  essential: boolean;
  symmetry_alpha_deg: number;
  handling_difficulty: number;
  insertion_difficulty: number;
}

/** Input for DFA scoring. */
export interface DFAScoreInput {
  parts: DFAPartInput[];
}

/** Per-part DFA detail. */
export interface DFAPartDetail {
  name: string;
  essential: boolean;
  handling_time_s: number;
  insertion_time_s: number;
  total_time_s: number;
  handling_penalty: string;
  insertion_penalty: string;
}

/** Redesign suggestion from DFA. */
export interface RedesignSuggestion {
  part: string;
  reason: string;
  potential_saving_s: number;
}

/** Output of DFA scoring. */
export interface DFAScoreResult {
  dfa_index: number;
  total_assembly_time_s: number;
  theoretical_min_parts: number;
  total_parts: number;
  part_details: DFAPartDetail[];
  redesign_suggestions: RedesignSuggestion[];
}

// ─── Material Database (Press-Fit) ─────────────────────────────────

interface PressFitMaterial {
  name: string;
  E_GPa: number;
  nu: number;
  yield_MPa: number;
  alpha_CTE: number; // [1/°C]
  mu_friction: number;
}

const PRESS_FIT_MATERIALS: Record<string, PressFitMaterial> = {
  steel: {
    name: 'Steel', E_GPa: 200, nu: 0.30,
    yield_MPa: 350, alpha_CTE: 12e-6, mu_friction: 0.15,
  },
  aluminum: {
    name: 'Aluminum', E_GPa: 70, nu: 0.33,
    yield_MPa: 275, alpha_CTE: 23e-6, mu_friction: 0.12,
  },
  bronze: {
    name: 'Bronze', E_GPa: 110, nu: 0.34,
    yield_MPa: 310, alpha_CTE: 18e-6, mu_friction: 0.10,
  },
  cast_iron: {
    name: 'Cast Iron', E_GPa: 170, nu: 0.26,
    yield_MPa: 200, alpha_CTE: 10.5e-6, mu_friction: 0.18,
  },
};

// ─── MOST Time Constants ───────────────────────────────────────────

/**
 * Simplified MOST base times (TMU → seconds).
 * 1 TMU = 0.036 seconds. Values from Zandin (2003).
 */
const MOST_BASE_TIMES: Record<string, number> = {
  pick: 2.5,     // General Move: reach + grasp ~70 TMU
  place: 2.0,    // Controlled Move: move + position ~55 TMU
  fasten: 4.5,   // Tool Use: fasten with tool ~125 TMU
  align: 3.0,    // Controlled Move + alignment ~83 TMU
  inspect: 2.0,  // Visual inspection ~55 TMU
};

/** Weight threshold for additional handling time. */
const WEIGHT_PENALTY_THRESHOLD_KG = 2.0;
/** Seconds added per kg above threshold. */
const WEIGHT_PENALTY_PER_KG = 0.3;
/** Distance threshold for additional time. */
const DISTANCE_PENALTY_THRESHOLD_MM = 300;
/** Seconds added per 100 mm above threshold. */
const DISTANCE_PENALTY_PER_100MM = 0.2;

// ─── Mulberry32 PRNG ───────────────────────────────────────────────

/**
 * Mulberry32 — fast, deterministic 32-bit PRNG.
 * Period: ~2^32. Passes BigCrush subset.
 */
function mulberry32(seed: number): () => number {
  let t = seed | 0;
  return (): number => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform for normal samples from uniform [0,1) pairs.
 */
function boxMuller(rng: () => number): number {
  let u1 = rng();
  let u2 = rng();
  // Avoid log(0)
  while (u1 === 0) u1 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Utility ───────────────────────────────────────────────────────

/** Clamp a value to [lo, hi]. */
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ════════════════════════════════════════════════════════════════════
// ENGINE CLASS
// ════════════════════════════════════════════════════════════════════

/**
 * AssemblyOptimizationEngine — multi-part assembly optimization.
 *
 * Covers sequence planning, tolerance stack-up, line balancing,
 * press-fit analysis, assembly time estimation, and DFA scoring.
 */
export class AssemblyOptimizationEngine {

  // ──────────────────────────────────────────────────────────────────
  // 1. SEQUENCE PLANNING
  // ──────────────────────────────────────────────────────────────────

  /**
   * Plan the optimal assembly sequence using liaison graph analysis
   * and topological sort with stability/accessibility scoring.
   *
   * Algorithm:
   *   1. Build adjacency (liaison) graph from contacts.
   *   2. Compute in-degree and topological order starting from base_part.
   *   3. Score sequences by stability (support contacts), accessibility
   *      (direction changes), and tool changes.
   *
   * @param input - Parts, contacts, and base part definition
   * @returns Assembly sequence with scoring breakdown
   *
   * Reference: De Fazio & Whitney (1987) liaison graph method
   */
  sequencePlan(input: SequencePlanInput): AtomicValue<SequencePlanResult> {
    const { parts, contacts, base_part } = input;

    if (!parts.includes(base_part)) {
      throw new Error(`base_part "${base_part}" not found in parts list`);
    }
    if (parts.length < 2) {
      throw new Error('At least 2 parts required for assembly sequence');
    }

    // Build adjacency list (liaison graph)
    const adj = new Map<string, { neighbor: string; direction: string }[]>();
    for (const p of parts) adj.set(p, []);
    for (const c of contacts) {
      adj.get(c.part_a)!.push({ neighbor: c.part_b, direction: c.direction });
      adj.get(c.part_b)!.push({ neighbor: c.part_a, direction: c.direction });
    }

    // Degree of each part in the liaison graph (connectivity)
    const degree = new Map<string, number>();
    for (const p of parts) {
      degree.set(p, (adj.get(p) ?? []).length);
    }

    // BFS/greedy topological assembly: start from base, add most-connected next
    const assembled = new Set<string>();
    const sequence: string[] = [base_part];
    assembled.add(base_part);

    while (assembled.size < parts.length) {
      // Candidates: parts not yet assembled that have at least one contact
      // with an already-assembled part
      const candidates: { part: string; supportCount: number }[] = [];
      for (const p of parts) {
        if (assembled.has(p)) continue;
        const neighbors = adj.get(p) ?? [];
        const supportCount = neighbors.filter(n => assembled.has(n.neighbor)).length;
        if (supportCount > 0) {
          candidates.push({ part: p, supportCount });
        }
      }

      if (candidates.length === 0) {
        // Disconnected parts — add remaining by degree
        for (const p of parts) {
          if (!assembled.has(p)) {
            sequence.push(p);
            assembled.add(p);
          }
        }
        break;
      }

      // Pick candidate with highest support count (stability heuristic)
      candidates.sort((a, b) => b.supportCount - a.supportCount);
      const best = candidates[0];
      sequence.push(best.part);
      assembled.add(best.part);
    }

    // Score the sequence
    const stabilityScores: number[] = [];
    const directionChanges: number[] = [];
    let lastDirection = '';
    let toolChanges = 0;

    for (let i = 1; i < sequence.length; i++) {
      const part = sequence[i];
      const neighbors = adj.get(part) ?? [];
      const assembledNeighbors = neighbors.filter(n => {
        const idx = sequence.indexOf(n.neighbor);
        return idx >= 0 && idx < i;
      });
      // Stability: fraction of contacts already assembled
      const stabFrac = neighbors.length > 0
        ? assembledNeighbors.length / neighbors.length
        : 0;
      stabilityScores.push(stabFrac);

      // Direction tracking for accessibility
      if (assembledNeighbors.length > 0) {
        const dir = assembledNeighbors[0].direction;
        if (lastDirection && dir !== lastDirection) {
          toolChanges++;
        }
        directionChanges.push(dir === lastDirection || !lastDirection ? 1 : 0.5);
        lastDirection = dir;
      } else {
        directionChanges.push(0.5);
      }
    }

    const n = sequence.length - 1;
    const stabilityScore = n > 0
      ? stabilityScores.reduce((a, b) => a + b, 0) / n
      : 1;
    const accessibilityScore = n > 0
      ? directionChanges.reduce((a, b) => a + b, 0) / n
      : 1;
    const toolChangeScore = n > 0
      ? clamp(1 - toolChanges / n, 0, 1)
      : 1;
    const overallScore = 0.4 * stabilityScore + 0.35 * accessibilityScore + 0.25 * toolChangeScore;

    // Recommendations
    const recommendations: string[] = [];
    if (stabilityScore < 0.6) {
      recommendations.push('Consider adding temporary fixtures for unstable sub-assemblies');
    }
    if (toolChanges > n * 0.5) {
      recommendations.push('High direction changes — group same-direction insertions to reduce tool changes');
    }
    if (overallScore > 0.8) {
      recommendations.push('Sequence is well-optimized for stability and accessibility');
    }

    return {
      value: {
        optimal_sequence: sequence,
        score: Math.round(overallScore * 1000) / 1000,
        stability_score: Math.round(stabilityScore * 1000) / 1000,
        accessibility_score: Math.round(accessibilityScore * 1000) / 1000,
        tool_change_score: Math.round(toolChangeScore * 1000) / 1000,
        recommendations,
      },
      unit: 'assembly_plan',
      formula: 'Score = 0.4·Stability + 0.35·Accessibility + 0.25·ToolChange',
      confidence: clamp(overallScore, 0.5, 0.95),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. TOLERANCE STACK-UP
  // ──────────────────────────────────────────────────────────────────

  /**
   * Perform worst-case, RSS, and Monte Carlo tolerance stack-up analysis.
   *
   * Three methods:
   *   - Worst-case: arithmetic sum of all tolerances (100% yield)
   *   - RSS (Root Sum Square): statistical combination assuming normal distributions
   *   - Monte Carlo: N=10,000 simulations with Mulberry32 PRNG
   *
   * @param input - Dimensions with tolerances and target gap
   * @returns Combined worst-case, RSS, and Monte Carlo results
   *
   * Reference: Machinery's Handbook, Tolerance Stack-Up Analysis
   */
  toleranceStack(input: ToleranceStackInput): AtomicValue<ToleranceStackResult> {
    const { dimensions, assembly_gap_target_mm } = input;

    if (dimensions.length === 0) {
      throw new Error('At least one dimension required for tolerance analysis');
    }

    // ── Worst-case analysis ──
    let nominalSum = 0;
    let tolPlus = 0;
    let tolMinus = 0;

    for (const d of dimensions) {
      nominalSum += d.nominal_mm;
      tolPlus += d.tolerance_plus_mm;
      tolMinus += Math.abs(d.tolerance_minus_mm);
    }

    const gapNominal = assembly_gap_target_mm - nominalSum;
    const wcGapMin = gapNominal - tolPlus;
    const wcGapMax = gapNominal + tolMinus;
    const totalTolerance = tolPlus + tolMinus;

    const worstCase: WorstCaseResult = {
      gap_min: Math.round(wcGapMin * 1e6) / 1e6,
      gap_max: Math.round(wcGapMax * 1e6) / 1e6,
      total_tolerance: Math.round(totalTolerance * 1e6) / 1e6,
    };

    // ── RSS analysis ──
    // Each tolerance band half-width: ti = (plus + |minus|) / 2
    // Mean shift per dim: mi = (plus - |minus|) / 2
    let meanShift = 0;
    let sumSqHalf = 0;

    for (const d of dimensions) {
      const absMinus = Math.abs(d.tolerance_minus_mm);
      const halfWidth = (d.tolerance_plus_mm + absMinus) / 2;
      const shift = (d.tolerance_plus_mm - absMinus) / 2;
      meanShift += shift;
      sumSqHalf += halfWidth * halfWidth;
    }

    const rssGapMean = gapNominal - meanShift;
    const rssSigma = Math.sqrt(sumSqHalf);
    const rssMin3 = rssGapMean - 3 * rssSigma;
    const rssMax3 = rssGapMean + 3 * rssSigma;

    // Cpk relative to zero (gap must be > 0)
    const cpkUpper = rssGapMean / (3 * rssSigma);
    const cpk = rssSigma > 0 ? Math.round(Math.max(cpkUpper, 0) * 1000) / 1000 : 999;

    const statisticalRss: RSSResult = {
      gap_mean: Math.round(rssGapMean * 1e6) / 1e6,
      gap_sigma: Math.round(rssSigma * 1e6) / 1e6,
      gap_min_3sigma: Math.round(rssMin3 * 1e6) / 1e6,
      gap_max_3sigma: Math.round(rssMax3 * 1e6) / 1e6,
      Cpk: cpk,
    };

    // ── Monte Carlo analysis ──
    const N = 10000;
    const rng = mulberry32(42);
    const gapSamples: number[] = [];

    for (let i = 0; i < N; i++) {
      let dimSum = 0;
      for (const d of dimensions) {
        const absMinus = Math.abs(d.tolerance_minus_mm);
        const dist = d.distribution ?? 'normal';
        let sample: number;

        if (dist === 'uniform') {
          const lo = d.nominal_mm - absMinus;
          const hi = d.nominal_mm + d.tolerance_plus_mm;
          sample = lo + rng() * (hi - lo);
        } else if (dist === 'triangular') {
          const lo = d.nominal_mm - absMinus;
          const hi = d.nominal_mm + d.tolerance_plus_mm;
          const mode = d.nominal_mm;
          const u = rng();
          const fc = (mode - lo) / (hi - lo);
          if (u < fc) {
            sample = lo + Math.sqrt(u * (hi - lo) * (mode - lo));
          } else {
            sample = hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
          }
        } else {
          // Normal: ±3σ covers tolerance band
          const halfWidth = (d.tolerance_plus_mm + absMinus) / 2;
          const center = d.nominal_mm + (d.tolerance_plus_mm - absMinus) / 2;
          const sigma = halfWidth / 3;
          sample = center + sigma * boxMuller(rng);
        }
        dimSum += sample;
      }
      gapSamples.push(assembly_gap_target_mm - dimSum);
    }

    // Statistics
    const mcMean = gapSamples.reduce((a, b) => a + b, 0) / N;
    const mcVariance = gapSamples.reduce((a, b) => a + (b - mcMean) ** 2, 0) / (N - 1);
    const mcStd = Math.sqrt(mcVariance);
    const mcMin = Math.min(...gapSamples);
    const mcMax = Math.max(...gapSamples);

    // Out-of-spec: gap < 0 means interference
    const oosCount = gapSamples.filter(g => g < 0).length;
    const pOOS = (oosCount / N) * 100;

    const monteCarlo: MonteCarloResult = {
      mean: Math.round(mcMean * 1e6) / 1e6,
      std: Math.round(mcStd * 1e6) / 1e6,
      min: Math.round(mcMin * 1e6) / 1e6,
      max: Math.round(mcMax * 1e6) / 1e6,
      p_out_of_spec_pct: Math.round(pOOS * 100) / 100,
      samples: N,
    };

    return {
      value: { worst_case: worstCase, statistical_rss: statisticalRss, monte_carlo: monteCarlo },
      unit: 'mm',
      formula: 'WC: gap = target - Σnom ± Σtol; RSS: σ = √(Σti²); MC: N=10000 Mulberry32',
      confidence: cpk >= 1.33 ? 0.95 : cpk >= 1.0 ? 0.85 : 0.7,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. LINE BALANCING (RPW)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Balance an assembly line using Ranked Positional Weight (RPW) algorithm.
   *
   * Algorithm (Helgeson-Birnie):
   *   1. Compute positional weight PW(i) = duration(i) + Σ PW(successors)
   *   2. Sort tasks by descending PW
   *   3. Assign tasks to stations respecting cycle time & precedence
   *
   * @param input - Tasks with durations and precedence, cycle time
   * @returns Station assignments with efficiency metrics
   *
   * Reference: Helgeson & Birnie (1961), Salveson (1955)
   */
  lineBalance(input: LineBalanceInput): AtomicValue<LineBalanceResult> {
    const { tasks, cycle_time_s } = input;

    if (tasks.length === 0) {
      throw new Error('At least one task required for line balancing');
    }
    if (cycle_time_s <= 0) {
      throw new Error('Cycle time must be positive');
    }

    // Validate: no task exceeds cycle time
    for (const t of tasks) {
      if (t.duration_s > cycle_time_s) {
        throw new Error(
          `Task "${t.id}" duration (${t.duration_s}s) exceeds cycle time (${cycle_time_s}s)`
        );
      }
    }

    // Build lookup and successor map
    const taskMap = new Map<string, TaskInput>();
    const successors = new Map<string, string[]>();
    for (const t of tasks) {
      taskMap.set(t.id, t);
      successors.set(t.id, []);
    }
    for (const t of tasks) {
      for (const pred of t.predecessors) {
        const succs = successors.get(pred);
        if (succs) succs.push(t.id);
      }
    }

    // Compute positional weights (PW) via memoized DFS
    const pw = new Map<string, number>();
    const computePW = (id: string, visited: Set<string>): number => {
      if (pw.has(id)) return pw.get(id)!;
      if (visited.has(id)) {
        throw new Error(`Circular dependency detected at task "${id}"`);
      }
      visited.add(id);
      const task = taskMap.get(id)!;
      let weight = task.duration_s;
      const succs = successors.get(id) ?? [];
      for (const s of succs) {
        weight += computePW(s, visited);
      }
      pw.set(id, weight);
      return weight;
    };

    for (const t of tasks) {
      computePW(t.id, new Set<string>());
    }

    // Sort by descending positional weight
    const sorted = [...tasks].sort((a, b) => (pw.get(b.id) ?? 0) - (pw.get(a.id) ?? 0));

    // Assign to stations
    const stations: StationAssignment[] = [];
    const assigned = new Set<string>();
    let stationNum = 1;

    while (assigned.size < tasks.length) {
      const stationTasks: string[] = [];
      let remainingTime = cycle_time_s;

      for (const t of sorted) {
        if (assigned.has(t.id)) continue;
        // Check precedence satisfied
        const predsSatisfied = t.predecessors.every(p => assigned.has(p));
        if (!predsSatisfied) continue;
        if (t.duration_s <= remainingTime) {
          stationTasks.push(t.id);
          assigned.add(t.id);
          remainingTime -= t.duration_s;
        }
      }

      if (stationTasks.length === 0) {
        // Safety: should not happen if input is valid
        throw new Error('Cannot assign remaining tasks — check precedence constraints');
      }

      const stationTime = cycle_time_s - remainingTime;
      stations.push({
        station: stationNum,
        tasks: stationTasks,
        station_time_s: Math.round(stationTime * 1000) / 1000,
        idle_time_s: Math.round(remainingTime * 1000) / 1000,
      });
      stationNum++;
    }

    // Metrics
    const numStations = stations.length;
    const totalTaskTime = tasks.reduce((s, t) => s + t.duration_s, 0);
    const efficiency = (totalTaskTime / (numStations * cycle_time_s)) * 100;
    const balanceDelay = 100 - efficiency;

    // Smoothness index (SI) — std dev of idle times
    const avgIdle = stations.reduce((s, st) => s + st.idle_time_s, 0) / numStations;
    const siVariance = stations.reduce((s, st) => s + (st.idle_time_s - avgIdle) ** 2, 0) / numStations;
    const smoothnessIndex = Math.sqrt(siVariance);

    // Bottleneck: station with highest time
    const bottleneckStation = stations.reduce((max, st) =>
      st.station_time_s > max.station_time_s ? st : max
    );
    const bottleneck = `Station ${bottleneckStation.station} (${bottleneckStation.station_time_s}s)`;

    return {
      value: {
        stations,
        num_stations: numStations,
        efficiency_pct: Math.round(efficiency * 100) / 100,
        balance_delay_pct: Math.round(balanceDelay * 100) / 100,
        smoothness_index: Math.round(smoothnessIndex * 1000) / 1000,
        bottleneck,
      },
      unit: 'line_balance',
      formula: 'RPW: PW(i) = t(i) + Σ PW(successors); η = Σt / (K·C) × 100%',
      confidence: efficiency >= 85 ? 0.92 : efficiency >= 70 ? 0.85 : 0.75,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. PEG-IN-HOLE PRESS-FIT (LAMÉ)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Analyze press-fit interference using Lamé (thick cylinder) equations.
   *
   * Computes contact pressure from interference fit, insertion/extraction
   * forces, hoop stress, and thermal assembly temperature differential.
   *
   * Equations:
   *   - Contact pressure: p = δ / (d × (C_hub/E_hub + C_shaft/E_shaft))
   *     where C_hub = (D²+d²)/(D²−d²) + ν_hub, C_shaft = 1 − ν_shaft
   *     (for solid shaft: inner radius = 0 → C_shaft = 1 − ν)
   *   - Insertion force: F = π × d × L × μ × p
   *   - Thermal: ΔT = δ / (d × α_hub)
   *
   * @param input - Peg/hole geometry and materials
   * @returns Contact pressure, forces, stresses, safety factor
   *
   * Reference: Lamé G. (1852); Shigley's Mechanical Engineering Design
   */
  pegInHole(input: PegInHoleInput): AtomicValue<PegInHoleResult> {
    const { peg_diameter_mm, hole_diameter_mm, length_mm, material_peg, material_hole } = input;

    const matPeg = PRESS_FIT_MATERIALS[material_peg.toLowerCase()];
    const matHole = PRESS_FIT_MATERIALS[material_hole.toLowerCase()];

    if (!matPeg) {
      throw new Error(`Unknown peg material "${material_peg}". Available: ${Object.keys(PRESS_FIT_MATERIALS).join(', ')}`);
    }
    if (!matHole) {
      throw new Error(`Unknown hole material "${material_hole}". Available: ${Object.keys(PRESS_FIT_MATERIALS).join(', ')}`);
    }

    const d = peg_diameter_mm;  // nominal interface diameter [mm]
    const dHole = hole_diameter_mm;
    const L = length_mm;

    // Interference
    const delta = d - dHole;
    if (delta <= 0) {
      throw new Error(`No interference: peg (${d}mm) must be larger than hole (${dHole}mm)`);
    }

    // Convert E to MPa from GPa
    const E_hub = matHole.E_GPa * 1000;   // MPa
    const E_shaft = matPeg.E_GPa * 1000;  // MPa

    // Assume hub outer diameter = 2.5 × bore diameter (typical)
    const D_outer = d * 2.5;

    // Lamé coefficients
    // Hub (hollow cylinder): C_hub = (D²+d²)/(D²−d²) + ν_hub
    const dSq = d * d;
    const DSq = D_outer * D_outer;
    const C_hub = (DSq + dSq) / (DSq - dSq) + matHole.nu;
    // Solid shaft: C_shaft = 1 - ν_shaft
    const C_shaft = 1 - matPeg.nu;

    // Contact pressure [MPa]
    // p = δ / (d × (C_hub/E_hub + C_shaft/E_shaft))
    const p = delta / (d * (C_hub / E_hub + C_shaft / E_shaft));

    // Insertion force [N]: F = π × d × L × μ × p
    const mu = (matPeg.mu_friction + matHole.mu_friction) / 2;
    const F_insert = Math.PI * d * L * mu * p;

    // Extraction force (typically 1.2–1.5× insertion due to embedding)
    const F_extract = F_insert * 1.3;

    // Hoop stress in hub (max at bore): σ_θ = p × (D²+d²)/(D²−d²)
    const hoopStressHub = p * (DSq + dSq) / (DSq - dSq);

    // Radial (compressive) stress on shaft surface
    const radialStressShaft = -p;

    // Safety factor (von Mises in hub, simplified as hoop-dominated)
    const sf = matHole.yield_MPa / hoopStressHub;

    // Thermal assembly: heat hub so it expands by δ
    // ΔT = δ / (d × α_CTE_hub)
    const deltaT = delta / (d * matHole.alpha_CTE);

    return {
      value: {
        interference_mm: Math.round(delta * 1e4) / 1e4,
        contact_pressure_MPa: Math.round(p * 100) / 100,
        insertion_force_N: Math.round(F_insert * 10) / 10,
        extraction_force_N: Math.round(F_extract * 10) / 10,
        hoop_stress_hub_MPa: Math.round(hoopStressHub * 100) / 100,
        radial_stress_shaft_MPa: Math.round(radialStressShaft * 100) / 100,
        safety_factor: Math.round(sf * 1000) / 1000,
        thermal_assembly_delta_T_C: Math.round(deltaT * 10) / 10,
      },
      unit: 'press_fit',
      formula: 'Lamé: p = δ/(d·(C_hub/E_hub + C_shaft/E_shaft)); F = π·d·L·μ·p',
      confidence: sf >= 2.0 ? 0.95 : sf >= 1.5 ? 0.85 : 0.7,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. ASSEMBLY TIME (MOST + CRAWFORD)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Estimate assembly time using simplified MOST (Maynard Operation
   * Sequence Technique) with Crawford learning curve projection.
   *
   * MOST base times are assigned per operation type, with weight and
   * distance adders. Crawford learning curve: T_n = T_1 × n^b,
   * where b = ln(learning_rate) / ln(2).
   *
   * @param input - Assembly operations with optional weight/distance, learning parameters
   * @returns Total time, breakdown per operation, and learning curve projection
   *
   * Reference: Zandin (2003) MOST; Crawford (1944) learning curve
   */
  assemblyTime(input: AssemblyTimeInput): AtomicValue<AssemblyTimeResult> {
    const { operations, learning_rate = 0.85, num_units = 10 } = input;

    if (operations.length === 0) {
      throw new Error('At least one operation required');
    }
    if (learning_rate <= 0 || learning_rate > 1) {
      throw new Error('Learning rate must be in (0, 1]');
    }

    const breakdown: OperationTimeBreakdown[] = [];
    let totalTime = 0;

    for (const op of operations) {
      const baseTime = MOST_BASE_TIMES[op.type] ?? 2.5;

      // Weight adder
      let weightAdder = 0;
      if (op.weight_kg !== undefined && op.weight_kg > WEIGHT_PENALTY_THRESHOLD_KG) {
        weightAdder = (op.weight_kg - WEIGHT_PENALTY_THRESHOLD_KG) * WEIGHT_PENALTY_PER_KG;
      }

      // Distance adder
      let distanceAdder = 0;
      if (op.distance_mm !== undefined && op.distance_mm > DISTANCE_PENALTY_THRESHOLD_MM) {
        distanceAdder = ((op.distance_mm - DISTANCE_PENALTY_THRESHOLD_MM) / 100) * DISTANCE_PENALTY_PER_100MM;
      }

      const opTotal = baseTime + weightAdder + distanceAdder;
      totalTime += opTotal;

      breakdown.push({
        type: op.type,
        base_time_s: Math.round(baseTime * 1000) / 1000,
        weight_adder_s: Math.round(weightAdder * 1000) / 1000,
        distance_adder_s: Math.round(distanceAdder * 1000) / 1000,
        total_s: Math.round(opTotal * 1000) / 1000,
      });
    }

    // Crawford learning curve: T_n = T_1 × n^b, b = ln(lr)/ln(2)
    const b = Math.log(learning_rate) / Math.log(2);
    const withLearning: { unit_number: number; time_s: number }[] = [];
    const unitCount = Math.max(1, Math.round(num_units));
    for (let n = 1; n <= unitCount; n++) {
      const t_n = totalTime * Math.pow(n, b);
      withLearning.push({
        unit_number: n,
        time_s: Math.round(t_n * 1000) / 1000,
      });
    }

    return {
      value: {
        total_seconds: Math.round(totalTime * 1000) / 1000,
        breakdown,
        with_learning_curve: withLearning,
      },
      unit: 'seconds',
      formula: 'MOST base + weight/distance adders; Crawford: T_n = T_1 × n^(ln(LR)/ln(2))',
      confidence: 0.80,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 6. DFA SCORE (BOOTHROYD-DEWHURST)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Calculate Boothroyd-Dewhurst Design for Assembly index.
   *
   * Evaluates each part for handling time (based on symmetry and difficulty)
   * and insertion time (based on insertion difficulty). Computes:
   *   - DFA index = (N_min × 3) / total_assembly_time
   *   - Theoretical minimum parts (essential parts only)
   *   - Redesign suggestions for non-essential or difficult parts
   *
   * Handling time model (simplified Boothroyd):
   *   - Base 1.5s + symmetry penalty (360/α - 1) × 0.5s + difficulty × 1.0s
   * Insertion time model:
   *   - Base 1.5s + insertion_difficulty × 1.5s
   *
   * @param input - Parts with essentiality, symmetry, and difficulty ratings
   * @returns DFA index, minimum parts, part details, redesign suggestions
   *
   * Reference: Boothroyd & Dewhurst (2011) "Product Design for Manufacture and Assembly"
   */
  dfaScore(input: DFAScoreInput): AtomicValue<DFAScoreResult> {
    const { parts } = input;

    if (parts.length === 0) {
      throw new Error('At least one part required for DFA analysis');
    }

    const partDetails: DFAPartDetail[] = [];
    const suggestions: RedesignSuggestion[] = [];
    let totalTime = 0;
    let minParts = 0;

    for (const p of parts) {
      // Essential parts contribute to theoretical minimum
      if (p.essential) minParts++;

      // Symmetry factor: α = rotation angle of symmetry
      // 360° = no symmetry penalty, 180° = small, 90° = medium, etc.
      const alpha = clamp(p.symmetry_alpha_deg, 1, 360);
      const symmetryRotations = 360 / alpha;
      const symmetryPenalty = (symmetryRotations - 1) * 0.5;

      // Handling time
      const handlingDiff = clamp(p.handling_difficulty, 0, 5);
      const handlingTime = 1.5 + symmetryPenalty + handlingDiff * 1.0;

      // Insertion time
      const insertionDiff = clamp(p.insertion_difficulty, 0, 5);
      const insertionTime = 1.5 + insertionDiff * 1.5;

      const partTotal = handlingTime + insertionTime;
      totalTime += partTotal;

      // Penalty descriptions
      let handlingPenaltyStr = 'None';
      if (symmetryPenalty > 1) handlingPenaltyStr = `High symmetry penalty (α=${alpha}°)`;
      else if (symmetryPenalty > 0) handlingPenaltyStr = `Moderate symmetry penalty (α=${alpha}°)`;
      if (handlingDiff >= 3) handlingPenaltyStr += '; Difficult handling';

      let insertionPenaltyStr = 'None';
      if (insertionDiff >= 4) insertionPenaltyStr = 'Very difficult insertion';
      else if (insertionDiff >= 2) insertionPenaltyStr = 'Moderate insertion difficulty';

      partDetails.push({
        name: p.name,
        essential: p.essential,
        handling_time_s: Math.round(handlingTime * 1000) / 1000,
        insertion_time_s: Math.round(insertionTime * 1000) / 1000,
        total_time_s: Math.round(partTotal * 1000) / 1000,
        handling_penalty: handlingPenaltyStr,
        insertion_penalty: insertionPenaltyStr,
      });

      // Redesign suggestions
      if (!p.essential) {
        suggestions.push({
          part: p.name,
          reason: 'Non-essential — consider combining with adjacent part or eliminating',
          potential_saving_s: Math.round(partTotal * 1000) / 1000,
        });
      } else if (handlingDiff >= 3 || insertionDiff >= 3) {
        const reason = handlingDiff >= 3 && insertionDiff >= 3
          ? 'High handling AND insertion difficulty — redesign geometry for self-aligning features'
          : handlingDiff >= 3
            ? 'High handling difficulty — add orientation features or increase symmetry'
            : 'High insertion difficulty — add chamfers, guides, or snap-fits';
        const saving = (handlingDiff >= 3 ? handlingDiff * 0.5 : 0) + (insertionDiff >= 3 ? insertionDiff * 0.5 : 0);
        suggestions.push({
          part: p.name,
          reason,
          potential_saving_s: Math.round(saving * 1000) / 1000,
        });
      }
      if (alpha < 90 && p.essential) {
        suggestions.push({
          part: p.name,
          reason: `Low symmetry (α=${alpha}°) — increase rotational symmetry to reduce handling time`,
          potential_saving_s: Math.round(symmetryPenalty * 0.5 * 1000) / 1000,
        });
      }
    }

    // DFA index: ideal_time / actual_time
    // Ideal time = N_min × 3s (Boothroyd ideal: 3s per essential part)
    const idealTime = minParts * 3;
    const dfaIndex = totalTime > 0 ? idealTime / totalTime : 0;

    return {
      value: {
        dfa_index: Math.round(dfaIndex * 1000) / 1000,
        total_assembly_time_s: Math.round(totalTime * 1000) / 1000,
        theoretical_min_parts: minParts,
        total_parts: parts.length,
        part_details: partDetails,
        redesign_suggestions: suggestions,
      },
      unit: 'dfa_score',
      formula: 'DFA Index = (N_min × 3s) / T_total; Boothroyd-Dewhurst method',
      confidence: dfaIndex >= 0.4 ? 0.90 : dfaIndex >= 0.2 ? 0.85 : 0.75,
    };
  }
}

// ════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ════════════════════════════════════════════════════════════════════

/** Singleton instance of AssemblyOptimizationEngine. */
export const assemblyOptimizationEngine = new AssemblyOptimizationEngine();
