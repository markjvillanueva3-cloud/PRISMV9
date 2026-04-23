/**
 * PRISM MCP Server — Reliability Block Diagram Engine
 *
 * System-level reliability analysis via reliability block diagrams (RBD),
 * fault tree analysis (FTA), importance measures, Monte Carlo simulation,
 * redundancy optimization, and availability modeling.
 *
 * Complements ReliabilityEngineeringEngine (component-level) with
 * system topology analysis for CNC manufacturing systems.
 *
 * References:
 * - Rausand & Hoyland, "System Reliability Theory" (2004)
 * - Modarres et al., "Reliability Engineering and Risk Analysis" (2017)
 * - IEC 61025 (Fault Tree Analysis)
 * - MIL-HDBK-338B (Electronic Reliability Design Handbook)
 *
 * @module ReliabilityBlockDiagramEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

/** Component definition for RBD analysis. */
export interface RBDComponent {
  id: string;
  name: string;
  reliability: number;
  failure_rate_per_hour?: number;
  mtbf_hours?: number;
  distribution?: "exponential" | "weibull" | "lognormal";
  weibull_beta?: number;
  weibull_eta?: number;
  lognormal_mu?: number;
  lognormal_sigma?: number;
}

/** Connection defining system topology. */
export interface RBDConnection {
  type: "series" | "parallel" | "k_of_n" | "standby";
  components: string[];
  k?: number;
}

/** System analysis input. */
export interface SystemAnalysisInput {
  components: RBDComponent[];
  connections: RBDConnection[];
  mission_time_hours?: number;
}

/** System analysis output. */
export interface SystemAnalysisResult {
  system_reliability: number;
  system_mtbf_hours: number;
  system_failure_rate: number;
  availability: number;
  component_criticality: Record<string, number>;
}

/** Fault tree gate. */
export interface FTGate {
  id: string;
  type: "AND" | "OR" | "VOTING";
  inputs: string[];
  k?: number;
}

/** Fault tree basic event. */
export interface FTBasicEvent {
  id: string;
  probability: number;
  description?: string;
}

/** Fault tree analysis input. */
export interface FaultTreeInput {
  gates: FTGate[];
  basic_events: FTBasicEvent[];
  top_event: string;
}

/** Fault tree analysis output. */
export interface FaultTreeResult {
  top_event_probability: number;
  minimal_cut_sets: string[][];
  cut_set_probabilities: number[];
  dominant_cut_set: string[];
  order_distribution: Record<number, number>;
}

/** Importance measures input. */
export interface ImportanceMeasuresInput {
  components: RBDComponent[];
  connections: RBDConnection[];
}

/** Importance measures output. */
export interface ImportanceMeasuresResult {
  birnbaum: Record<string, number>;
  fussell_vesely: Record<string, number>;
  raw: Record<string, number>;
  rrw: Record<string, number>;
  criticality: Record<string, number>;
  most_critical_component: string;
}

/** Monte Carlo input. */
export interface MonteCarloInput {
  components: RBDComponent[];
  connections: RBDConnection[];
  mission_time_hours: number;
  num_simulations?: number;
  time_points?: number;
  seed?: number;
}

/** Monte Carlo output. */
export interface MonteCarloResult {
  system_mttf_hours: number;
  ci95: [number, number];
  reliability_curve: { t_hours: number; R: number }[];
  percentiles: { p10: number; p50: number; p90: number };
}

/** Redundancy optimization input. */
export interface RedundancyInput {
  components: { id: string; name: string; reliability: number; cost: number; weight: number }[];
  connections: RBDConnection[];
  constraints: { max_cost: number; max_weight: number; target_reliability: number };
  max_units_per_component?: number;
}

/** Redundancy optimization output. */
export interface RedundancyResult {
  optimal_allocation: Record<string, number>;
  system_reliability: number;
  total_cost: number;
  total_weight: number;
  improvement_over_baseline: number;
}

/** Availability input. */
export interface AvailabilityInput {
  mtbf_hours: number;
  mttr_hours: number;
  mtbm_hours?: number;
  mean_maintenance_time_hours?: number;
  uptime_hours?: number;
  downtime_hours?: number;
  mission_time_hours?: number;
  time_points?: number;
}

/** Availability output. */
export interface AvailabilityResult {
  inherent_availability: number;
  achieved_availability: number;
  steady_state_availability: number;
  availability_curve: { t: number; A: number }[];
}

/** CNC system preset topology. */
export interface CNCPreset {
  name: string;
  components: RBDComponent[];
  connections: RBDConnection[];
}

// ============================================================================
// MATH HELPERS
// ============================================================================

/** Binomial coefficient C(n, k). */
function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return result;
}

/** Factorial for small n. */
function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

/** Gamma function (Lanczos approximation). */
function gammaFn(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  z -= 1;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) *
    Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/** Inverse normal CDF (rational approximation, Beasley-Springer-Moro). */
function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < 0.5) return -normInv(1 - p);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    const cc = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
      -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
    const d = [
      7.784695709041462e-3, 3.224671290700398e-1,
      2.445134137142996e0, 3.754408661907416e0,
    ];
    return (((((cc[0] * q + cc[1]) * q + cc[2]) * q + cc[3]) * q + cc[4]) * q + cc[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Mulberry32 PRNG — deterministic 32-bit seeded generator.
 * Ref: Tommy Ettinger, public domain.
 */
class Mulberry32 {
  private state: number;
  constructor(seed: number) { this.state = seed | 0; }
  /** Return uniform random in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Exponential variate with rate lambda. */
  exponential(lambda: number): number {
    return -Math.log(1 - this.next()) / lambda;
  }
  /** Weibull variate with shape beta, scale eta. */
  weibull(beta: number, eta: number): number {
    return eta * Math.pow(-Math.log(1 - this.next()), 1 / beta);
  }
  /** Lognormal variate with parameters mu, sigma. Box-Muller transform. */
  lognormal(mu: number, sigma: number): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.exp(mu + sigma * z);
  }
}

// ============================================================================
// CNC SYSTEM PRESETS
// ============================================================================

/**
 * Common CNC system topologies with published MTBF values.
 * Sources: MIL-HDBK-217F, manufacturer maintenance data, ISO 12100.
 */
const CNC_PRESETS: Record<string, CNCPreset> = {
  cnc_spindle_system: {
    name: "CNC Spindle System",
    components: [
      { id: "motor", name: "Spindle Motor", reliability: 0.995, mtbf_hours: 40000, distribution: "exponential" },
      { id: "belt_gear", name: "Belt/Gear Drive", reliability: 0.990, mtbf_hours: 20000, distribution: "weibull", weibull_beta: 2.5, weibull_eta: 22000 },
      { id: "bearing_a", name: "Front Bearing", reliability: 0.992, mtbf_hours: 25000, distribution: "weibull", weibull_beta: 2.0, weibull_eta: 28000 },
      { id: "bearing_b", name: "Rear Bearing", reliability: 0.992, mtbf_hours: 25000, distribution: "weibull", weibull_beta: 2.0, weibull_eta: 28000 },
      { id: "spindle_shaft", name: "Spindle Shaft", reliability: 0.999, mtbf_hours: 80000, distribution: "exponential" },
    ],
    connections: [
      { type: "series", components: ["motor", "belt_gear", "bearings_sub", "spindle_shaft"] },
      { type: "parallel", components: ["bearing_a", "bearing_b"] },
    ],
  },
  cnc_axis_system: {
    name: "CNC Axis System",
    components: [
      { id: "servo", name: "Servo Motor", reliability: 0.997, mtbf_hours: 50000, distribution: "exponential" },
      { id: "encoder", name: "Rotary Encoder", reliability: 0.998, mtbf_hours: 60000, distribution: "exponential" },
      { id: "ballscrew", name: "Ball Screw", reliability: 0.993, mtbf_hours: 30000, distribution: "weibull", weibull_beta: 3.0, weibull_eta: 33000 },
      { id: "guideway_a", name: "Linear Guideway A", reliability: 0.996, mtbf_hours: 45000, distribution: "weibull", weibull_beta: 2.5, weibull_eta: 50000 },
      { id: "guideway_b", name: "Linear Guideway B", reliability: 0.996, mtbf_hours: 45000, distribution: "weibull", weibull_beta: 2.5, weibull_eta: 50000 },
    ],
    connections: [
      { type: "series", components: ["servo", "encoder", "ballscrew", "guideways_sub"] },
      { type: "parallel", components: ["guideway_a", "guideway_b"] },
    ],
  },
  coolant_system: {
    name: "Coolant Delivery System",
    components: [
      { id: "pump", name: "Coolant Pump", reliability: 0.985, mtbf_hours: 15000, distribution: "exponential" },
      { id: "filter", name: "Coolant Filter", reliability: 0.990, mtbf_hours: 10000, distribution: "weibull", weibull_beta: 1.5, weibull_eta: 11000 },
      { id: "nozzle_1", name: "Nozzle 1", reliability: 0.980, mtbf_hours: 8000, distribution: "exponential" },
      { id: "nozzle_2", name: "Nozzle 2", reliability: 0.980, mtbf_hours: 8000, distribution: "exponential" },
      { id: "nozzle_3", name: "Nozzle 3", reliability: 0.980, mtbf_hours: 8000, distribution: "exponential" },
    ],
    connections: [
      { type: "series", components: ["pump", "filter", "nozzles_sub"] },
      { type: "k_of_n", components: ["nozzle_1", "nozzle_2", "nozzle_3"], k: 1 },
    ],
  },
  tool_magazine: {
    name: "Tool Magazine System",
    components: [
      { id: "carousel", name: "Carousel Motor/Mechanism", reliability: 0.988, mtbf_hours: 18000, distribution: "weibull", weibull_beta: 2.0, weibull_eta: 20000 },
      { id: "gripper", name: "Tool Gripper", reliability: 0.992, mtbf_hours: 22000, distribution: "exponential" },
      { id: "sensor", name: "Position Sensor", reliability: 0.995, mtbf_hours: 35000, distribution: "exponential" },
    ],
    connections: [
      { type: "series", components: ["carousel", "gripper", "sensor"] },
    ],
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class ReliabilityBlockDiagramEngine {
  private readonly componentMap = new Map<string, RBDComponent>();

  /**
   * Retrieve a CNC system preset topology.
   * Available presets: cnc_spindle_system, cnc_axis_system, coolant_system, tool_magazine.
   * @param name Preset name key
   * @returns The CNC preset definition or undefined
   */
  public getPreset(name: string): CNCPreset | undefined {
    return CNC_PRESETS[name];
  }

  /**
   * List all available CNC system presets.
   * @returns Array of preset names and descriptions
   */
  public listPresets(): AtomicValue<{ name: string; description: string }[]> {
    const presets = Object.entries(CNC_PRESETS).map(([key, p]) => ({
      name: key,
      description: `${p.name} — ${p.components.length} components`,
    }));
    return { value: presets, unit: "presets" };
  }

  // --------------------------------------------------------------------------
  // 1. System Reliability Analysis
  // --------------------------------------------------------------------------

  /**
   * Compute system reliability from component topology using RBD methods.
   *
   * Series: R_sys = product(R_i)
   * Parallel: R_sys = 1 - product(1 - R_i)
   * k-of-n (voting): inclusion-exclusion for non-identical components
   * Standby: R_sys = e^(-lambda*t) * sum_{i=0}^{n-1} (lambda*t)^i / i!  (cold standby, perfect switching)
   *
   * @param input System topology definition with components and connections
   * @returns System-level reliability metrics with component criticality
   */
  public analyzeSystem(input: SystemAnalysisInput): AtomicValue<SystemAnalysisResult> {
    const { components, connections, mission_time_hours } = input;
    this.buildComponentMap(components);

    const sysR = this.computeSystemReliability(connections, components);
    const sysFailRate = sysR > 0 && sysR < 1 ? -Math.log(sysR) : 0;
    const sysMTBF = sysFailRate > 0 ? 1 / sysFailRate : Infinity;
    const mttr = 4; // assumed 4h mean repair for availability estimate
    const avail = sysMTBF / (sysMTBF + mttr);

    // Component criticality via Birnbaum importance (quick calc)
    const criticality: Record<string, number> = {};
    for (const comp of components) {
      const origR = comp.reliability;
      comp.reliability = 1.0;
      const rHigh = this.computeSystemReliability(connections, components);
      comp.reliability = 0.0;
      const rLow = this.computeSystemReliability(connections, components);
      criticality[comp.id] = rHigh - rLow;
      comp.reliability = origR;
    }

    const result: SystemAnalysisResult = {
      system_reliability: sysR,
      system_mtbf_hours: sysMTBF,
      system_failure_rate: sysFailRate,
      availability: avail,
      component_criticality: criticality,
    };

    log.info(`[RBD] analyzeSystem: R_sys=${sysR.toFixed(6)}, MTBF=${sysMTBF.toFixed(1)}h`);
    return {
      value: result,
      unit: "system_reliability",
      formula: "Series: R=ΠRi, Parallel: R=1-Π(1-Ri), k-of-n: inclusion-exclusion",
      confidence: 0.95,
    };
  }

  // --------------------------------------------------------------------------
  // 2. Fault Tree Analysis
  // --------------------------------------------------------------------------

  /**
   * Boolean fault tree analysis with minimal cut sets via MOCUS algorithm.
   *
   * MOCUS (Method of Obtaining Cut Sets): top-down expansion of gates,
   * replacing AND gates by appending to rows, OR gates by duplicating rows.
   * Minimal cut sets obtained by removing supersets.
   *
   * Top event probability: P(top) = 1 - product(1 - P(MCS_i)) (inclusion-exclusion approx)
   *
   * Ref: IEC 61025:2006, Fussell (1975)
   *
   * @param input Fault tree definition with gates, basic events, and top event
   * @returns Minimal cut sets, top event probability, and order distribution
   */
  public faultTree(input: FaultTreeInput): AtomicValue<FaultTreeResult> {
    const { gates, basic_events, top_event } = input;
    const gateMap = new Map<string, FTGate>();
    const eventMap = new Map<string, FTBasicEvent>();
    for (const g of gates) gateMap.set(g.id, g);
    for (const e of basic_events) eventMap.set(e.id, e);

    // MOCUS algorithm: expand gate tree into cut sets
    const rawCutSets = this.mocusExpand(top_event, gateMap, eventMap);

    // Minimize: remove supersets
    const minCutSets = this.minimizeCutSets(rawCutSets);

    // Compute cut set probabilities
    const cutSetProbs = minCutSets.map(cs =>
      cs.reduce((p, eventId) => {
        const ev = eventMap.get(eventId);
        return p * (ev ? ev.probability : 0);
      }, 1)
    );

    // Top event probability using inclusion-exclusion (rare event approximation for large trees)
    let topProb: number;
    if (minCutSets.length <= 20) {
      // Exact inclusion-exclusion up to 20 cut sets
      topProb = this.inclusionExclusion(minCutSets, eventMap);
    } else {
      // Rare event upper bound: P(top) ≈ Σ P(MCS_i)
      topProb = Math.min(1, cutSetProbs.reduce((s, p) => s + p, 0));
    }

    // Find dominant cut set (highest probability)
    let dominantIdx = 0;
    for (let i = 1; i < cutSetProbs.length; i++) {
      if (cutSetProbs[i] > cutSetProbs[dominantIdx]) dominantIdx = i;
    }

    // Order distribution: count of cut sets by order (number of events)
    const orderDist: Record<number, number> = {};
    for (const cs of minCutSets) {
      const order = cs.length;
      orderDist[order] = (orderDist[order] || 0) + 1;
    }

    const result: FaultTreeResult = {
      top_event_probability: topProb,
      minimal_cut_sets: minCutSets,
      cut_set_probabilities: cutSetProbs,
      dominant_cut_set: minCutSets[dominantIdx] || [],
      order_distribution: orderDist,
    };

    log.info(`[RBD] faultTree: P(top)=${topProb.toFixed(6)}, ${minCutSets.length} MCS`);
    return {
      value: result,
      unit: "fault_tree",
      formula: "MOCUS expansion + inclusion-exclusion for P(top)",
      confidence: 0.95,
    };
  }

  // --------------------------------------------------------------------------
  // 3. Importance Measures
  // --------------------------------------------------------------------------

  /**
   * Compute component importance measures for system reliability.
   *
   * Birnbaum: I_B(i) = R_sys(R_i=1) - R_sys(R_i=0)
   * Fussell-Vesely: I_FV(i) = 1 - Q_sys(q_i=0) / Q_sys
   * Risk Achievement Worth: RAW(i) = Q_sys(q_i=1) / Q_sys
   * Risk Reduction Worth: RRW(i) = Q_sys / Q_sys(q_i=0)
   * Criticality: I_CR(i) = I_B(i) * q_i / Q_sys
   *
   * Ref: Rausand & Hoyland (2004), Ch. 3.9
   *
   * @param input Components and connections defining system topology
   * @returns All five importance measures per component
   */
  public importanceMeasures(input: ImportanceMeasuresInput): AtomicValue<ImportanceMeasuresResult> {
    const { components, connections } = input;
    this.buildComponentMap(components);

    const qSys = 1 - this.computeSystemReliability(connections, components);

    const birnbaum: Record<string, number> = {};
    const fussellVesely: Record<string, number> = {};
    const raw: Record<string, number> = {};
    const rrw: Record<string, number> = {};
    const criticality: Record<string, number> = {};

    for (const comp of components) {
      const origR = comp.reliability;
      const qi = 1 - origR;

      // R_sys with component i perfectly reliable
      comp.reliability = 1.0;
      const rPerfect = this.computeSystemReliability(connections, components);
      const qPerfect = 1 - rPerfect; // Q_sys(q_i=0)

      // R_sys with component i failed
      comp.reliability = 0.0;
      const rFailed = this.computeSystemReliability(connections, components);
      const qFailed = 1 - rFailed; // Q_sys(q_i=1)

      comp.reliability = origR;

      // Birnbaum importance
      birnbaum[comp.id] = rPerfect - rFailed;

      // Fussell-Vesely importance
      fussellVesely[comp.id] = qSys > 1e-15 ? 1 - qPerfect / qSys : 0;

      // Risk Achievement Worth
      raw[comp.id] = qSys > 1e-15 ? qFailed / qSys : 1;

      // Risk Reduction Worth
      rrw[comp.id] = qPerfect > 1e-15 ? qSys / qPerfect : Infinity;

      // Criticality importance
      criticality[comp.id] = qSys > 1e-15 ? birnbaum[comp.id] * qi / qSys : 0;
    }

    // Most critical component by Birnbaum importance
    let maxId = components[0]?.id ?? "";
    let maxVal = -1;
    for (const [id, val] of Object.entries(birnbaum)) {
      if (val > maxVal) { maxVal = val; maxId = id; }
    }

    const result: ImportanceMeasuresResult = {
      birnbaum, fussell_vesely: fussellVesely, raw, rrw, criticality,
      most_critical_component: maxId,
    };

    log.info(`[RBD] importanceMeasures: most critical = ${maxId} (Birnbaum=${maxVal.toFixed(4)})`);
    return {
      value: result,
      unit: "importance_measures",
      formula: "Birnbaum I_B(i)=R(1)-R(0), FV=1-Q(qi=0)/Q, RAW=Q(qi=1)/Q, RRW=Q/Q(qi=0), CR=I_B·qi/Q",
      confidence: 0.95,
    };
  }

  // --------------------------------------------------------------------------
  // 4. Monte Carlo System Simulation
  // --------------------------------------------------------------------------

  /**
   * Monte Carlo simulation for system reliability with Latin Hypercube Sampling.
   *
   * For each simulation run, sample component failure times from their distributions
   * (exponential, Weibull, or lognormal), propagate through topology to determine
   * system failure time, then build system R(t) curve and compute MTTF with CI95.
   *
   * LHS: Stratified sampling for variance reduction — partition [0,1] into N strata,
   * randomly sample within each stratum, then shuffle.
   *
   * @param input MC simulation parameters with component distributions
   * @returns System MTTF, CI95, reliability curve, and percentiles
   */
  public monteCarloReliability(input: MonteCarloInput): AtomicValue<MonteCarloResult> {
    const {
      components, connections, mission_time_hours,
      num_simulations = 10000, time_points = 50, seed = 42,
    } = input;
    const rng = new Mulberry32(seed);

    // Generate LHS samples for each component
    const nComp = components.length;
    const lhsSamples: number[][] = []; // [sim][comp] -> uniform in [0,1]
    for (let c = 0; c < nComp; c++) {
      const strata: number[] = [];
      for (let i = 0; i < num_simulations; i++) {
        strata.push((i + rng.next()) / num_simulations);
      }
      // Fisher-Yates shuffle
      for (let i = strata.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [strata[i], strata[j]] = [strata[j], strata[i]];
      }
      lhsSamples.push(strata);
    }

    // Sample failure times
    const systemFailTimes: number[] = [];
    for (let sim = 0; sim < num_simulations; sim++) {
      const compFailTimes = new Map<string, number>();
      for (let c = 0; c < nComp; c++) {
        const comp = components[c];
        const u = lhsSamples[c][sim];
        let failTime: number;
        const dist = comp.distribution || "exponential";
        if (dist === "weibull" && comp.weibull_beta && comp.weibull_eta) {
          failTime = comp.weibull_eta * Math.pow(-Math.log(1 - u), 1 / comp.weibull_beta);
        } else if (dist === "lognormal" && comp.lognormal_mu !== undefined && comp.lognormal_sigma !== undefined) {
          const z = normInv(u);
          failTime = Math.exp(comp.lognormal_mu + comp.lognormal_sigma * z);
        } else {
          // Exponential
          const lambda = comp.failure_rate_per_hour || (comp.mtbf_hours ? 1 / comp.mtbf_hours : -Math.log(comp.reliability));
          failTime = -Math.log(1 - u) / Math.max(lambda, 1e-15);
        }
        compFailTimes.set(comp.id, failTime);
      }

      // Propagate through connections to get system failure time
      const sysFailTime = this.propagateFailureTimes(connections, compFailTimes);
      systemFailTimes.push(sysFailTime);
    }

    // Sort for percentiles
    const sorted = [...systemFailTimes].sort((a, b) => a - b);
    const mttf = systemFailTimes.reduce((s, t) => s + t, 0) / num_simulations;

    // CI95 for mean (t-distribution ≈ normal for large n)
    const variance = systemFailTimes.reduce((s, t) => s + (t - mttf) ** 2, 0) / (num_simulations - 1);
    const se = Math.sqrt(variance / num_simulations);
    const ci95: [number, number] = [mttf - 1.96 * se, mttf + 1.96 * se];

    // Percentiles
    const p10 = sorted[Math.floor(0.1 * num_simulations)];
    const p50 = sorted[Math.floor(0.5 * num_simulations)];
    const p90 = sorted[Math.floor(0.9 * num_simulations)];

    // Reliability curve R(t) at time points
    const dt = mission_time_hours / time_points;
    const relCurve: { t_hours: number; R: number }[] = [];
    for (let tp = 0; tp <= time_points; tp++) {
      const t = tp * dt;
      const surviving = sorted.filter(ft => ft > t).length;
      relCurve.push({ t_hours: t, R: surviving / num_simulations });
    }

    const result: MonteCarloResult = {
      system_mttf_hours: mttf,
      ci95,
      reliability_curve: relCurve,
      percentiles: { p10, p50, p90 },
    };

    log.info(`[RBD] monteCarloReliability: MTTF=${mttf.toFixed(1)}h, CI95=[${ci95[0].toFixed(1)}, ${ci95[1].toFixed(1)}]`);
    return {
      value: result,
      unit: "hours",
      formula: "MC with LHS: sample component TTF, propagate through topology, N=" + num_simulations,
      confidence: 0.95,
    };
  }

  // --------------------------------------------------------------------------
  // 5. Optimal Redundancy Allocation
  // --------------------------------------------------------------------------

  /**
   * Find optimal component redundancy allocation to maximize system reliability
   * subject to cost and weight constraints.
   *
   * Algorithm: Bounded enumeration for small systems (n_i in [1, max_units]).
   * For each allocation, compute parallel subsystem reliability per component,
   * then series reliability for the system.
   *
   * Parallel R for n identical units: R_parallel = 1 - (1-R)^n
   *
   * Ref: Tillman, Hwang & Kuo, "Optimization of Systems Reliability" (1980)
   *
   * @param input Components with cost/weight, connections, constraints
   * @returns Optimal allocation, achieved reliability, total cost/weight
   */
  public optimizeRedundancy(input: RedundancyInput): AtomicValue<RedundancyResult> {
    const { components, constraints, max_units_per_component = 5 } = input;
    const { max_cost, max_weight, target_reliability } = constraints;
    const n = components.length;

    // Baseline: 1 unit each (series system)
    const baselineR = components.reduce((r, c) => r * c.reliability, 1);

    // Enumerate all allocations [1..max] for each component
    const maxPerComp = Math.min(max_units_per_component, 10); // cap to avoid explosion
    let bestR = 0;
    let bestAlloc: number[] = new Array(n).fill(1);
    let bestCost = 0;
    let bestWeight = 0;

    const alloc = new Array(n).fill(1);

    const enumerate = (idx: number): void => {
      if (idx === n) {
        // Check constraints
        let totalCost = 0;
        let totalWeight = 0;
        for (let i = 0; i < n; i++) {
          totalCost += components[i].cost * alloc[i];
          totalWeight += components[i].weight * alloc[i];
        }
        if (totalCost > max_cost || totalWeight > max_weight) return;

        // Compute system reliability (series of parallel subsystems)
        let sysR = 1;
        for (let i = 0; i < n; i++) {
          const compR = components[i].reliability;
          const parallelR = 1 - Math.pow(1 - compR, alloc[i]);
          sysR *= parallelR;
        }

        if (sysR > bestR) {
          bestR = sysR;
          bestAlloc = [...alloc];
          bestCost = totalCost;
          bestWeight = totalWeight;
        }
        return;
      }
      for (let k = 1; k <= maxPerComp; k++) {
        alloc[idx] = k;
        enumerate(idx + 1);
      }
    };

    // Limit search space for large n
    if (n <= 8 && maxPerComp <= 5) {
      enumerate(0);
    } else {
      // Greedy heuristic for large systems: iteratively add redundancy to weakest link
      bestAlloc = new Array(n).fill(1);
      bestCost = components.reduce((s, c) => s + c.cost, 0);
      bestWeight = components.reduce((s, c) => s + c.weight, 0);
      bestR = baselineR;

      let improved = true;
      while (improved) {
        improved = false;
        let bestDelta = 0;
        let bestIdx = -1;

        for (let i = 0; i < n; i++) {
          if (bestAlloc[i] >= maxPerComp) continue;
          const addCost = bestCost + components[i].cost;
          const addWeight = bestWeight + components[i].weight;
          if (addCost > max_cost || addWeight > max_weight) continue;

          bestAlloc[i]++;
          let testR = 1;
          for (let j = 0; j < n; j++) {
            testR *= 1 - Math.pow(1 - components[j].reliability, bestAlloc[j]);
          }
          bestAlloc[i]--;

          const delta = testR - bestR;
          if (delta > bestDelta) {
            bestDelta = delta;
            bestIdx = i;
          }
        }

        if (bestIdx >= 0 && bestDelta > 1e-12) {
          bestAlloc[bestIdx]++;
          bestCost += components[bestIdx].cost;
          bestWeight += components[bestIdx].weight;
          bestR += bestDelta;
          improved = true;
          // Recompute exact R
          bestR = 1;
          for (let j = 0; j < n; j++) {
            bestR *= 1 - Math.pow(1 - components[j].reliability, bestAlloc[j]);
          }
        }
      }
    }

    const optAlloc: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      optAlloc[components[i].id] = bestAlloc[i];
    }

    const result: RedundancyResult = {
      optimal_allocation: optAlloc,
      system_reliability: bestR,
      total_cost: bestCost,
      total_weight: bestWeight,
      improvement_over_baseline: bestR - baselineR,
    };

    log.info(`[RBD] optimizeRedundancy: R_opt=${bestR.toFixed(6)} (baseline=${baselineR.toFixed(6)}, Δ=${(bestR - baselineR).toFixed(6)})`);
    return {
      value: result,
      unit: "optimization",
      formula: "Maximize R_sys=Π[1-(1-Ri)^ni] s.t. ΣCi·ni≤budget, ΣWi·ni≤weight",
      confidence: 0.90,
    };
  }

  // --------------------------------------------------------------------------
  // 6. Availability Analysis
  // --------------------------------------------------------------------------

  /**
   * Steady-state and time-dependent availability analysis for repairable systems.
   *
   * Inherent availability: A_i = MTBF / (MTBF + MTTR)
   * Achieved availability: A_a = MTBM / (MTBM + MMT)
   * Markov model (2-state): A(t) = μ/(λ+μ) + λ/(λ+μ) · e^(-(λ+μ)t)
   * Steady-state: A_ss = μ / (λ + μ)
   *
   * Ref: MIL-HDBK-338B, Section 7; Ebeling "Reliability and Maintainability Engineering" (2010)
   *
   * @param input MTBF, MTTR, and optional MTBM/maintenance parameters
   * @returns Inherent, achieved, steady-state availability and time-dependent curve
   */
  public availability(input: AvailabilityInput): AtomicValue<AvailabilityResult> {
    const {
      mtbf_hours, mttr_hours,
      mtbm_hours, mean_maintenance_time_hours,
      uptime_hours, downtime_hours,
      mission_time_hours = 10000, time_points = 50,
    } = input;

    // Failure and repair rates
    const lambda = 1 / mtbf_hours;
    const mu = 1 / mttr_hours;

    // Inherent availability: A_i = MTBF / (MTBF + MTTR)
    const inherentA = mtbf_hours / (mtbf_hours + mttr_hours);

    // Achieved availability: A_a = MTBM / (MTBM + MMT)
    const achievedA = (mtbm_hours && mean_maintenance_time_hours)
      ? mtbm_hours / (mtbm_hours + mean_maintenance_time_hours)
      : inherentA;

    // Operational availability: A_o = uptime / (uptime + downtime)
    const operationalA = (uptime_hours && downtime_hours)
      ? uptime_hours / (uptime_hours + downtime_hours)
      : inherentA;

    // Steady-state availability from Markov model
    const steadyStateA = mu / (lambda + mu);

    // Time-dependent availability curve: A(t) = μ/(λ+μ) + λ/(λ+μ) · e^(-(λ+μ)t)
    const dt = mission_time_hours / time_points;
    const curve: { t: number; A: number }[] = [];
    for (let i = 0; i <= time_points; i++) {
      const t = i * dt;
      const At = mu / (lambda + mu) + lambda / (lambda + mu) * Math.exp(-(lambda + mu) * t);
      curve.push({ t, A: At });
    }

    const result: AvailabilityResult = {
      inherent_availability: inherentA,
      achieved_availability: achievedA,
      steady_state_availability: steadyStateA,
      availability_curve: curve,
    };

    log.info(`[RBD] availability: A_i=${inherentA.toFixed(6)}, A_ss=${steadyStateA.toFixed(6)}`);
    return {
      value: result,
      unit: "availability",
      formula: "A_i=MTBF/(MTBF+MTTR), Markov: A(t)=μ/(λ+μ)+λ/(λ+μ)·e^(-(λ+μ)t)",
      confidence: 0.95,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  /** Build id-to-component lookup map. */
  private buildComponentMap(components: RBDComponent[]): void {
    this.componentMap.clear();
    for (const c of components) this.componentMap.set(c.id, c);
  }

  /**
   * Compute system reliability by evaluating connections.
   * Processes connections in order; the last connection is treated as the system-level block.
   */
  private computeSystemReliability(connections: RBDConnection[], components: RBDComponent[]): number {
    this.buildComponentMap(components);

    // Build subsystem reliabilities from inner connections first, then outer
    const subsystemR = new Map<string, number>();

    // Initialize component reliabilities
    for (const c of components) {
      subsystemR.set(c.id, c.reliability);
    }

    for (const conn of connections) {
      const reliabilities = conn.components.map(id => subsystemR.get(id) ?? this.componentMap.get(id)?.reliability ?? 0);

      let blockR: number;
      switch (conn.type) {
        case "series":
          blockR = reliabilities.reduce((r, ri) => r * ri, 1);
          break;
        case "parallel":
          blockR = 1 - reliabilities.reduce((q, ri) => q * (1 - ri), 1);
          break;
        case "k_of_n": {
          const k = conn.k ?? 1;
          blockR = this.kOfNReliability(reliabilities, k);
          break;
        }
        case "standby": {
          // Cold standby with perfect switching: R = e^(-λt) · Σ(λt)^i/i! for i=0..n-1
          // Use average failure rate, assume mission time from -ln(R)/λ
          const avgLambda = reliabilities.length > 0
            ? -reliabilities.reduce((s, r) => s + Math.log(Math.max(r, 1e-15)), 0) / reliabilities.length
            : 0;
          const n = reliabilities.length;
          // λt = -ln(R_single) on average
          const lambdaT = avgLambda;
          let sum = 0;
          for (let i = 0; i < n; i++) {
            sum += Math.pow(lambdaT, i) / factorial(i);
          }
          blockR = Math.exp(-lambdaT) * sum;
          break;
        }
        default:
          blockR = reliabilities.reduce((r, ri) => r * ri, 1);
      }

      // Store as subsystem; use composite key for the connection's components
      const subKey = conn.components.join("+");
      subsystemR.set(subKey, blockR);

      // Also store for any _sub references (e.g., "bearings_sub" → parallel bearing block)
      // The last connection processed sets the system-level reliability
    }

    // System reliability = last connection's block reliability
    if (connections.length === 0) {
      return components.reduce((r, c) => r * c.reliability, 1);
    }
    const lastConn = connections[connections.length - 1];
    const lastKey = lastConn.components.join("+");

    // For nested structures: if the first connection is a subsystem used by later connections,
    // substitute its result. Re-evaluate the outer connection.
    if (connections.length >= 2) {
      return this.evaluateNestedConnections(connections, components);
    }

    return subsystemR.get(lastKey) ?? 0;
  }

  /**
   * Evaluate nested connections: inner connections produce subsystem reliabilities,
   * outer connections reference them.
   */
  private evaluateNestedConnections(connections: RBDConnection[], components: RBDComponent[]): number {
    const reliabilityMap = new Map<string, number>();
    for (const c of components) reliabilityMap.set(c.id, c.reliability);

    // Process connections in reverse: later ones are typically outer/system-level,
    // but inner subsystem connections should be processed first.
    // Convention: connections listed inner-first, outer-last.
    // Detect subsystem references (ids ending in _sub) and resolve them.

    // First pass: find subsystem connections (parallel/k_of_n that define _sub groups)
    for (let i = connections.length - 1; i >= 0; i--) {
      const conn = connections[i];
      // Check if any later connection references a _sub id matching this group
      const subKey = this.findSubsystemKey(conn, connections);
      if (subKey) {
        const reliabilities = conn.components.map(id => reliabilityMap.get(id) ?? 0);
        const blockR = this.evalConnectionBlock(conn, reliabilities);
        reliabilityMap.set(subKey, blockR);
      }
    }

    // Final pass: evaluate the first connection (system-level, typically series)
    const sysCon = connections[0];
    const sysRels = sysCon.components.map(id => reliabilityMap.get(id) ?? 0);
    return this.evalConnectionBlock(sysCon, sysRels);
  }

  /** Find if this connection serves as a subsystem referenced by a _sub id. */
  private findSubsystemKey(conn: RBDConnection, allConns: RBDConnection[]): string | undefined {
    // Look for _sub references in other connections that match this group
    for (const other of allConns) {
      if (other === conn) continue;
      for (const id of other.components) {
        if (id.endsWith("_sub")) {
          // Check if this connection's component ids share a prefix
          const prefix = id.replace("_sub", "");
          const allMatch = conn.components.every(cid => cid.startsWith(prefix));
          if (allMatch || conn.components.some(cid => cid.startsWith(prefix))) {
            return id;
          }
        }
      }
    }
    return undefined;
  }

  /** Evaluate a single connection block. */
  private evalConnectionBlock(conn: RBDConnection, reliabilities: number[]): number {
    switch (conn.type) {
      case "series":
        return reliabilities.reduce((r, ri) => r * ri, 1);
      case "parallel":
        return 1 - reliabilities.reduce((q, ri) => q * (1 - ri), 1);
      case "k_of_n":
        return this.kOfNReliability(reliabilities, conn.k ?? 1);
      case "standby": {
        const avgLambda = reliabilities.length > 0
          ? -reliabilities.reduce((s, r) => s + Math.log(Math.max(r, 1e-15)), 0) / reliabilities.length
          : 0;
        const n = reliabilities.length;
        let sum = 0;
        for (let i = 0; i < n; i++) sum += Math.pow(avgLambda, i) / factorial(i);
        return Math.exp(-avgLambda) * sum;
      }
      default:
        return reliabilities.reduce((r, ri) => r * ri, 1);
    }
  }

  /**
   * k-of-n reliability using inclusion-exclusion for non-identical components.
   * R = P(at least k of n work) = Σ over all subsets of size ≥ k
   * For efficiency, uses complement: R = 1 - P(fewer than k work)
   */
  private kOfNReliability(reliabilities: number[], k: number): number {
    const n = reliabilities.length;
    if (k <= 0) return 1;
    if (k > n) return 0;

    // Check if all identical (within tolerance)
    const allSame = reliabilities.every(r => Math.abs(r - reliabilities[0]) < 1e-10);
    if (allSame) {
      const R = reliabilities[0];
      let sum = 0;
      for (let i = k; i <= n; i++) {
        sum += binomial(n, i) * Math.pow(R, i) * Math.pow(1 - R, n - i);
      }
      return sum;
    }

    // Non-identical: enumerate subsets of size >= k that are all working
    // For small n (<=20), direct enumeration is feasible
    if (n <= 20) {
      return this.kOfNExact(reliabilities, k);
    }

    // Fallback for large n: use average R
    const avgR = reliabilities.reduce((s, r) => s + r, 0) / n;
    let sum = 0;
    for (let i = k; i <= n; i++) {
      sum += binomial(n, i) * Math.pow(avgR, i) * Math.pow(1 - avgR, n - i);
    }
    return sum;
  }

  /**
   * Exact k-of-n for non-identical components using recursive method.
   * P(at least k of n work) computed via DP.
   */
  private kOfNExact(reliabilities: number[], k: number): number {
    const n = reliabilities.length;
    // dp[j] = P(exactly j of first i components work)
    let dp = new Array(n + 1).fill(0);
    dp[0] = 1;

    for (let i = 0; i < n; i++) {
      const newDp = new Array(n + 1).fill(0);
      const R = reliabilities[i];
      for (let j = 0; j <= i; j++) {
        newDp[j] += dp[j] * (1 - R); // component i fails
        newDp[j + 1] += dp[j] * R;    // component i works
      }
      dp = newDp;
    }

    let prob = 0;
    for (let j = k; j <= n; j++) prob += dp[j];
    return prob;
  }

  /**
   * MOCUS algorithm: Method of Obtaining Cut Sets.
   * Top-down expansion of the fault tree into product-of-sums form.
   * AND gate: append inputs to each existing row.
   * OR gate: duplicate rows for each input.
   */
  private mocusExpand(
    nodeId: string,
    gateMap: Map<string, FTGate>,
    eventMap: Map<string, FTBasicEvent>
  ): string[][] {
    // If it's a basic event, return single cut set
    if (eventMap.has(nodeId)) return [[nodeId]];

    const gate = gateMap.get(nodeId);
    if (!gate) return [[nodeId]]; // treat unknown as basic event

    const expandedInputs: string[][][] = gate.inputs.map(inp =>
      this.mocusExpand(inp, gateMap, eventMap)
    );

    if (gate.type === "AND") {
      // AND gate: cross-product of all input cut sets
      let result: string[][] = [[]];
      for (const inputSets of expandedInputs) {
        const newResult: string[][] = [];
        for (const existing of result) {
          for (const inputSet of inputSets) {
            // Merge and deduplicate
            const merged = [...Array.from(new Set([...existing, ...inputSet]))];
            newResult.push(merged);
          }
        }
        result = newResult;
      }
      return result;
    } else if (gate.type === "OR") {
      // OR gate: union of all input cut sets
      const result: string[][] = [];
      for (const inputSets of expandedInputs) {
        result.push(...inputSets);
      }
      return result;
    } else if (gate.type === "VOTING" && gate.k !== undefined) {
      // VOTING gate (k-of-n): generate cut sets for all combinations of (n-k+1) failures
      const n = gate.inputs.length;
      const failNeeded = n - gate.k + 1; // need this many failures for system failure
      const combos = this.combinations(expandedInputs, failNeeded);
      const result: string[][] = [];
      for (const combo of combos) {
        // AND the selected input cut sets (cross-product)
        let cross: string[][] = [[]];
        for (const inputSets of combo) {
          const newCross: string[][] = [];
          for (const existing of cross) {
            for (const inputSet of inputSets) {
              newCross.push([...Array.from(new Set([...existing, ...inputSet]))]);
            }
          }
          cross = newCross;
        }
        result.push(...cross);
      }
      return result;
    }

    return [[]];
  }

  /** Generate all C(arr, k) combinations. */
  private combinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const result: T[][] = [];
    const [first, ...rest] = arr;
    // Include first
    for (const combo of this.combinations(rest, k - 1)) {
      result.push([first, ...combo]);
    }
    // Exclude first
    result.push(...this.combinations(rest, k));
    return result;
  }

  /** Remove supersets from cut sets to get minimal cut sets. */
  private minimizeCutSets(cutSets: string[][]): string[][] {
    // Sort by size (smaller first)
    const sorted = cutSets
      .map(cs => Array.from(new Set(cs)).sort())
      .sort((a, b) => a.length - b.length);

    const minimal: string[][] = [];
    for (const cs of sorted) {
      const csSet = new Set(cs);
      const isSuperset = minimal.some(m =>
        m.every(e => csSet.has(e))
      );
      if (!isSuperset) {
        // Also check for duplicates
        const isDup = minimal.some(m =>
          m.length === cs.length && m.every(e => csSet.has(e))
        );
        if (!isDup) minimal.push(cs);
      }
    }
    return minimal;
  }

  /**
   * Inclusion-exclusion for top event probability from minimal cut sets.
   * P(top) = Σ P(MCS_i) - Σ P(MCS_i ∩ MCS_j) + ...
   */
  private inclusionExclusion(
    minCutSets: string[][],
    eventMap: Map<string, FTBasicEvent>
  ): number {
    const n = minCutSets.length;
    let result = 0;

    // For tractability, limit to 3rd order inclusion-exclusion
    const maxOrder = Math.min(n, 3);

    for (let order = 1; order <= maxOrder; order++) {
      const sign = order % 2 === 1 ? 1 : -1;
      const combos = this.indexCombinations(n, order);
      for (const combo of combos) {
        // Union of events in selected cut sets
        const unionEvents = new Set<string>();
        for (const idx of combo) {
          for (const e of minCutSets[idx]) unionEvents.add(e);
        }
        // P(intersection) = product of event probabilities (independence)
        let prob = 1;
        for (const e of Array.from(unionEvents)) {
          const ev = eventMap.get(e);
          prob *= ev ? ev.probability : 0;
        }
        result += sign * prob;
      }
    }

    return Math.max(0, Math.min(1, result));
  }

  /** Generate combinations of indices [0..n) choose k. */
  private indexCombinations(n: number, k: number): number[][] {
    if (k === 0) return [[]];
    if (n < k) return [];
    const result: number[][] = [];
    const combo = new Array(k).fill(0);

    const generate = (start: number, depth: number): void => {
      if (depth === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < n; i++) {
        combo[depth] = i;
        generate(i + 1, depth + 1);
      }
    };
    generate(0, 0);
    return result;
  }

  /**
   * Propagate component failure times through system topology to determine
   * system failure time.
   * Series: system fails at min(component failure times)
   * Parallel: system fails at max(component failure times)
   * k-of-n: system fails at (n-k+1)th ordered failure time
   * Standby: system fails at sum of failure times (perfect switching)
   */
  private propagateFailureTimes(
    connections: RBDConnection[],
    compFailTimes: Map<string, number>
  ): number {
    const blockTimes = new Map<string, number>(compFailTimes);

    // Process inner connections first (subsystem blocks)
    for (let i = connections.length - 1; i >= 0; i--) {
      const conn = connections[i];
      const times = conn.components.map(id => blockTimes.get(id) ?? Infinity);

      let blockTime: number;
      switch (conn.type) {
        case "series":
          blockTime = Math.min(...times);
          break;
        case "parallel":
          blockTime = Math.max(...times);
          break;
        case "k_of_n": {
          const k = conn.k ?? 1;
          const sorted = [...times].sort((a, b) => a - b);
          const failuresNeeded = times.length - k + 1;
          blockTime = sorted[Math.min(failuresNeeded - 1, sorted.length - 1)];
          break;
        }
        case "standby":
          blockTime = times.reduce((s, t) => s + t, 0);
          break;
        default:
          blockTime = Math.min(...times);
      }

      // Store for subsystem reference
      const subKey = this.findSubKeyForConnection(conn, connections);
      if (subKey) blockTimes.set(subKey, blockTime);
    }

    // System failure time from the first (outer) connection
    const sysCon = connections[0];
    const sysTimes = sysCon.components.map(id => blockTimes.get(id) ?? Infinity);

    switch (sysCon.type) {
      case "series": return Math.min(...sysTimes);
      case "parallel": return Math.max(...sysTimes);
      case "k_of_n": {
        const k = sysCon.k ?? 1;
        const sorted = [...sysTimes].sort((a, b) => a - b);
        return sorted[Math.min(sysTimes.length - k, sorted.length - 1)];
      }
      case "standby": return sysTimes.reduce((s, t) => s + t, 0);
      default: return Math.min(...sysTimes);
    }
  }

  /** Find _sub key for a connection used by another connection. */
  private findSubKeyForConnection(conn: RBDConnection, allConns: RBDConnection[]): string | undefined {
    for (const other of allConns) {
      if (other === conn) continue;
      for (const id of other.components) {
        if (id.endsWith("_sub")) {
          const prefix = id.replace("_sub", "");
          if (conn.components.some(cid => cid.startsWith(prefix))) {
            return id;
          }
        }
      }
    }
    return undefined;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const reliabilityBlockDiagramEngine = new ReliabilityBlockDiagramEngine();
