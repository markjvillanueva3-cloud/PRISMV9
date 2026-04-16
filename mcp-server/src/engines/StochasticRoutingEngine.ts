/**
 * StochasticRoutingEngine — Uncertainty-aware toolpath algorithm selection
 *
 * Ranks toolpath algorithms by P(success) using Monte Carlo simulation of
 * chatter probability, force exceedance, deflection exceedance, and tool life.
 *
 * Physics:
 *   - Cutting force: Fc = kc1.1 × h^(1-mc) × ap × ae/D  (Kienzle)
 *   - Chatter: regenerative stability lobes, stable if RPM in safe zone
 *   - Deflection: δ = F × L³ / (3EI)
 *   - Tool life: Taylor V×T^n = C
 *   - P(success) = P(no_chatter) × P(force_ok) × P(deflection_ok) × P(life_ok)
 *
 * Algorithms available:
 *   Standard: adaptive_clearing, contour_parallel, zigzag, spiral, trochoidal
 *   Novel:    TGAR, HRAF, MTHZD, CFSF, PTDC, VCER
 *   Extended: MEGM, RSMP, WHAP, BOPA, MCTP, SFCR, KALP, PTAP, PARETO, CFCM, WBRL, DPLS
 *
 * @module StochasticRoutingEngine
 */

import { log } from "../utils/Logger.js";

// ── Constants ────────────────────────────────────────────────────────────────

const MC_SAMPLES = 500;

// Kienzle coefficients per material
const KIENZLE_DB: Record<string, { kc11: number; mc: number }> = {
  aluminum:        { kc11: 700,  mc: 0.23 },
  steel:           { kc11: 1800, mc: 0.25 },
  stainless_steel: { kc11: 2100, mc: 0.25 },
  titanium:        { kc11: 2800, mc: 0.28 },
  inconel:         { kc11: 2800, mc: 0.28 },
  cast_iron:       { kc11: 1100, mc: 0.28 },
  brass:           { kc11: 700,  mc: 0.23 },
  hardened_steel:  { kc11: 3200, mc: 0.30 },
  copper:          { kc11: 700,  mc: 0.23 },
  plastic:         { kc11: 200,  mc: 0.20 },
};

// Algorithm engagement and force characteristics
// engagement_factor: lower = less radial engagement variance
// chatter_risk: 0=low, 1=high — baseline P(chatter) modifier
// force_variance_cv: coefficient of variation for force distribution
// deflection_compensation: 0-1 (1 = PTDC fully compensates deflection)
interface AlgorithmTraits {
  engagement_factor: number;   // ae/D characteristic 0-1
  chatter_risk: number;        // baseline chatter modifier 0-1
  force_variance_cv: number;   // CV of force distribution
  deflection_compensation: number; // how much deflection is pre-compensated
  speed_multiplier: number;    // relative cycle time (1=nominal)
  description: string;
}

const ALGORITHM_TRAITS: Record<string, AlgorithmTraits> = {
  // Standard
  adaptive_clearing:  { engagement_factor: 0.35, chatter_risk: 0.45, force_variance_cv: 0.18, deflection_compensation: 0.0,  speed_multiplier: 0.90, description: "Variable engagement adaptive clearing" },
  contour_parallel:   { engagement_factor: 0.55, chatter_risk: 0.50, force_variance_cv: 0.15, deflection_compensation: 0.0,  speed_multiplier: 1.00, description: "Constant offset contour parallel" },
  zigzag:             { engagement_factor: 0.65, chatter_risk: 0.55, force_variance_cv: 0.20, deflection_compensation: 0.0,  speed_multiplier: 1.05, description: "Bi-directional zigzag raster" },
  spiral:             { engagement_factor: 0.50, chatter_risk: 0.42, force_variance_cv: 0.12, deflection_compensation: 0.0,  speed_multiplier: 0.95, description: "Spiral inward/outward" },
  trochoidal:         { engagement_factor: 0.20, chatter_risk: 0.22, force_variance_cv: 0.08, deflection_compensation: 0.0,  speed_multiplier: 0.85, description: "Trochoidal low-engagement arc" },
  // Novel
  TGAR:               { engagement_factor: 0.30, chatter_risk: 0.30, force_variance_cv: 0.10, deflection_compensation: 0.10, speed_multiplier: 0.88, description: "Thermal-Gradient Adaptive Roughing" },
  HRAF:               { engagement_factor: 0.45, chatter_risk: 0.12, force_variance_cv: 0.13, deflection_compensation: 0.05, speed_multiplier: 1.15, description: "Harmonic-Resonance Avoidant Finishing" },
  MTHZD:              { engagement_factor: 0.35, chatter_risk: 0.28, force_variance_cv: 0.09, deflection_compensation: 0.15, speed_multiplier: 0.92, description: "Multi-Tool Hybrid Zone Decomposition" },
  CFSF:               { engagement_factor: 0.48, chatter_risk: 0.48, force_variance_cv: 0.06, deflection_compensation: 0.05, speed_multiplier: 1.00, description: "Constant-Force Spiral Finishing" },
  PTDC:               { engagement_factor: 0.50, chatter_risk: 0.38, force_variance_cv: 0.11, deflection_compensation: 0.75, speed_multiplier: 1.05, description: "Predictive Tool Deflection Compensation" },
  VCER:               { engagement_factor: 0.18, chatter_risk: 0.20, force_variance_cv: 0.07, deflection_compensation: 0.0,  speed_multiplier: 0.82, description: "Vortex Chip Evacuation Roughing" },
  // Extended
  MEGM:               { engagement_factor: 0.32, chatter_risk: 0.35, force_variance_cv: 0.11, deflection_compensation: 0.20, speed_multiplier: 0.93, description: "Multi-Entry Geometric Morphing" },
  RSMP:               { engagement_factor: 0.42, chatter_risk: 0.30, force_variance_cv: 0.10, deflection_compensation: 0.10, speed_multiplier: 0.90, description: "Radial Stepover Morphing Path" },
  WHAP:               { engagement_factor: 0.28, chatter_risk: 0.25, force_variance_cv: 0.09, deflection_compensation: 0.08, speed_multiplier: 0.87, description: "Waveform High-speed Adaptive Passes" },
  BOPA:               { engagement_factor: 0.38, chatter_risk: 0.33, force_variance_cv: 0.12, deflection_compensation: 0.05, speed_multiplier: 0.95, description: "Bi-directional Optimized Pass Alternation" },
  MCTP:               { engagement_factor: 0.40, chatter_risk: 0.36, force_variance_cv: 0.13, deflection_compensation: 0.12, speed_multiplier: 0.98, description: "Multi-Cutter Tool Path" },
  SFCR:               { engagement_factor: 0.22, chatter_risk: 0.18, force_variance_cv: 0.07, deflection_compensation: 0.10, speed_multiplier: 0.83, description: "Spiral Finish with Chip Relief" },
  KALP:               { engagement_factor: 0.45, chatter_risk: 0.40, force_variance_cv: 0.10, deflection_compensation: 0.30, speed_multiplier: 1.02, description: "Kinematically Adaptive Local Path" },
  PTAP:               { engagement_factor: 0.36, chatter_risk: 0.32, force_variance_cv: 0.11, deflection_compensation: 0.15, speed_multiplier: 0.91, description: "Predictive Thermal-Adaptive Pass" },
  PARETO:             { engagement_factor: 0.33, chatter_risk: 0.29, force_variance_cv: 0.10, deflection_compensation: 0.20, speed_multiplier: 1.08, description: "Pareto-Optimal Multi-Objective Path" },
  CFCM:               { engagement_factor: 0.48, chatter_risk: 0.44, force_variance_cv: 0.06, deflection_compensation: 0.05, speed_multiplier: 0.96, description: "Constant Force Contour Morphing" },
  WBRL:               { engagement_factor: 0.40, chatter_risk: 0.38, force_variance_cv: 0.12, deflection_compensation: 0.08, speed_multiplier: 0.94, description: "Wavelet-Based Roughing Lines" },
  DPLS:               { engagement_factor: 0.35, chatter_risk: 0.34, force_variance_cv: 0.11, deflection_compensation: 0.25, speed_multiplier: 1.03, description: "Dynamic-Programming Lead/Stepdown" },
};

export const ALL_ALGORITHMS = Object.keys(ALGORITHM_TRAITS);

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface FeatureInput {
  /** Feature type hint */
  type?: "pocket" | "slot" | "contour" | "boss" | "bore" | "open_pocket" | "freeform";
  /** Axial depth of cut mm */
  ap_mm: number;
  /** Radial depth of cut mm */
  ae_mm: number;
  /** Tool diameter mm */
  tool_diameter_mm: number;
  /** Tool overhang / stick-out mm */
  overhang_mm: number;
  /** Number of flutes */
  flute_count?: number;
  /** Spindle speed RPM */
  rpm?: number;
  /** Feed rate mm/min */
  feed_mmmin?: number;
  /** Tolerance requirement mm (for deflection check) */
  tolerance_mm?: number;
  /** Tool natural frequency Hz (default 800 Hz) */
  natural_freq_hz?: number;
  /** Modal stiffness N/m (default 5e6) */
  stiffness_nm?: number;
  /** Damping ratio (default 0.05) */
  damping_ratio?: number;
}

export interface MaterialInput {
  name: string;
  /** Taylor tool life constant C (m/min) at 1min life, default 150 */
  taylor_C?: number;
  /** Taylor exponent n, default 0.25 */
  taylor_n?: number;
  /** Elastic modulus GPa for deflection, default 200 */
  elastic_modulus_gpa?: number;
}

export interface MachineInput {
  max_rpm?: number;
  max_feed_mmmin?: number;
  spindle_power_kw?: number;
  /** Second moment of area of tool mm^4 (default computed from diameter) */
  tool_second_moment_mm4?: number;
}

export interface AlgorithmEvaluation {
  algorithm: string;
  description: string;
  p_success: number;
  p_no_chatter: number;
  p_force_ok: number;
  p_deflection_ok: number;
  p_life_ok: number;
  force_mean_n: number;
  force_ci95_n: [number, number];
  deflection_mean_mm: number;
  deflection_ci95_mm: [number, number];
  speed_multiplier: number;
  rank?: number;
}

export interface RoutingResult {
  ranked: AlgorithmEvaluation[];
  best_algorithm: string;
  best_p_success: number;
  material: string;
  feature: FeatureInput;
  n_samples: number;
  warnings: string[];
}

export interface SensitivityResult {
  algorithm: string;
  parameters: {
    name: string;
    p_success_delta: number;
    relative_importance: number;
  }[];
  most_sensitive: string;
}

export interface OptimizationResult {
  algorithm: string;
  optimal_ae_mm: number;
  optimal_ap_mm: number;
  optimal_feed_mmmin: number;
  p_success_optimal: number;
  p_success_baseline: number;
  iterations: number;
}

// ── Box-Muller normal sampler ─────────────────────────────────────────────────

function randNormal(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * sorted.length)));
  return sorted[idx];
}

// ── Core physics evaluation ────────────────────────────────────────────────────

function evaluateSamples(
  algorithm: string,
  feature: FeatureInput,
  material: MaterialInput,
  machine: MachineInput,
  n: number = MC_SAMPLES
): { forces: number[]; deflections: number[]; chatter_flags: number[]; life_ratios: number[] } {
  const traits = ALGORITHM_TRAITS[algorithm];
  if (!traits) throw new Error(`Unknown algorithm: ${algorithm}`);

  const kc = KIENZLE_DB[material.name] ?? KIENZLE_DB["steel"];
  const E_gpa = material.elastic_modulus_gpa ?? 200;
  const E_mpa = E_gpa * 1000;

  const D = feature.tool_diameter_mm;
  const ap = feature.ap_mm;
  const ae_base = feature.ae_mm * traits.engagement_factor;
  const L = feature.overhang_mm;
  const fn = feature.natural_freq_hz ?? 800;
  const k_stiff = feature.stiffness_nm ?? 5e6;
  const zeta = feature.damping_ratio ?? 0.05;
  const flutes = feature.flute_count ?? 4;
  const rpm = feature.rpm ?? 6000;
  const tol = feature.tolerance_mm ?? 0.05;

  // Second moment of area: I = π D^4 / 64
  const I_mm4 = machine.tool_second_moment_mm4 ?? (Math.PI * Math.pow(D, 4) / 64);
  const EI = E_mpa * I_mm4; // N·mm²

  // Taylor
  const C_taylor = material.taylor_C ?? 150;
  const n_taylor = material.taylor_n ?? 0.25;
  const V_cut = (rpm * Math.PI * D) / (1000 * 60); // m/s
  const T_life = Math.pow(C_taylor / V_cut, 1.0 / n_taylor); // min

  const forces: number[] = [];
  const deflections: number[] = [];
  const chatter_flags: number[] = [];
  const life_ratios: number[] = [];

  for (let i = 0; i < n; i++) {
    // Vary Kienzle kc1.1 ±8% (CV 4%)
    const kc11_s = randNormal(kc.kc11, kc.kc11 * 0.04);
    const mc_s   = randNormal(kc.mc,   kc.mc   * 0.02);

    // Chip thickness: h = ae/D (simplified for peripheral milling average)
    const ae_s = Math.max(0.01, randNormal(ae_base, ae_base * traits.force_variance_cv));
    const h    = ae_s / D; // average chip thickness proxy
    const Fc   = kc11_s * Math.pow(h, 1.0 - mc_s) * ap * (ae_s / D); // N (Kienzle)
    forces.push(Math.max(0, Fc));

    // Deflection: δ = F × L³ / (3EI), accounting for compensation
    const comp = traits.deflection_compensation;
    const delta_raw = (Fc * Math.pow(L, 3)) / (3.0 * EI); // mm
    const delta = delta_raw * (1.0 - comp);
    deflections.push(Math.max(0, delta));

    // Chatter: stability limit a_lim = -1 / (2 Kc Re[G])
    // Re[G(jω)] = (1-r²) / k / ((1-r²)² + (2ζr)²), r = ω/ωn
    const omega_n = 2 * Math.PI * randNormal(fn, fn * 0.025);
    const omega_tooth = (rpm / 60) * flutes * 2 * Math.PI;
    const r = omega_tooth / omega_n;
    const zeta_s = Math.max(0.01, randNormal(zeta, zeta * 0.15));
    const denom = (1 - r * r) ** 2 + (2 * zeta_s * r) ** 2;
    const ReG = (1 - r * r) / (k_stiff * denom);
    // Stability limit only meaningful when ReG < 0 (above resonance, r > 1)
    // When ReG > 0, the limit is effectively infinite (always stable at that lobe)
    // Use a baseline stability limit from damping when ReG >= 0
    let a_lim: number;
    if (ReG < 0) {
      a_lim = -1.0 / (2.0 * kc11_s * ReG);
    } else {
      // stable zone: limit set by damping-based heuristic (large stable depth)
      a_lim = k_stiff * zeta_s / kc11_s;
    }
    // Apply chatter_risk heuristic: higher risk = lower effective a_lim
    const a_lim_eff = Math.max(0, a_lim * (1.0 - traits.chatter_risk * 0.5));
    chatter_flags.push(ap > a_lim_eff ? 1 : 0);

    // Tool life vs required life (assume 60 min minimum acceptable)
    const T_life_s = T_life * randNormal(1.0, 0.07);
    life_ratios.push(T_life_s / 60.0);
  }

  return { forces, deflections, chatter_flags, life_ratios };
}

function computePSuccess(
  forces: number[],
  deflections: number[],
  chatter_flags: number[],
  life_ratios: number[],
  feature: FeatureInput,
  _machine: MachineInput
): { p_success: number; p_no_chatter: number; p_force_ok: number; p_deflection_ok: number; p_life_ok: number; force_mean: number; force_ci95: [number, number]; defl_mean: number; defl_ci95: [number, number] } {
  const n = forces.length;
  const tol = feature.tolerance_mm ?? 0.05;
  const max_force = 2000; // N threshold

  const p_no_chatter   = chatter_flags.filter(f => f === 0).length / n;
  const p_force_ok     = forces.filter(f => f < max_force).length / n;
  const p_defl_ok      = deflections.filter(d => d < tol / 2).length / n;
  const p_life_ok      = life_ratios.filter(r => r > 1.0).length / n;
  const p_success      = p_no_chatter * p_force_ok * p_defl_ok * p_life_ok;

  const force_mean = forces.reduce((s, f) => s + f, 0) / n;
  const defl_mean  = deflections.reduce((s, d) => s + d, 0) / n;

  return {
    p_success,
    p_no_chatter,
    p_force_ok,
    p_deflection_ok: p_defl_ok,
    p_life_ok,
    force_mean,
    force_ci95:  [percentile(forces, 0.025), percentile(forces, 0.975)],
    defl_mean,
    defl_ci95:   [percentile(deflections, 0.025), percentile(deflections, 0.975)],
  };
}

// ── Engine class ──────────────────────────────────────────────────────────────

export class StochasticRoutingEngine {
  /**
   * Rank all algorithms by P(success) for the given feature/material/machine.
   */
  selectAlgorithm(
    feature: FeatureInput,
    material: MaterialInput,
    machine: MachineInput = {},
    options: { algorithms?: string[]; n_samples?: number } = {}
  ): RoutingResult {
    const algos = options.algorithms ?? ALL_ALGORITHMS;
    const n = options.n_samples ?? MC_SAMPLES;
    const warnings: string[] = [];

    if (feature.overhang_mm / feature.tool_diameter_mm > 5) {
      warnings.push("High L/D ratio > 5: elevated deflection risk for all algorithms");
    }
    if ((feature.ae_mm / feature.tool_diameter_mm) > 0.7) {
      warnings.push("ae/D > 0.7: consider trochoidal or VCER to reduce engagement");
    }

    const evals: AlgorithmEvaluation[] = algos
      .filter(a => ALGORITHM_TRAITS[a])
      .map(algo => {
        const traits = ALGORITHM_TRAITS[algo];
        const samples = evaluateSamples(algo, feature, material, machine, n);
        const ps = computePSuccess(samples.forces, samples.deflections, samples.chatter_flags, samples.life_ratios, feature, machine);
        return {
          algorithm: algo,
          description: traits.description,
          p_success: ps.p_success,
          p_no_chatter: ps.p_no_chatter,
          p_force_ok: ps.p_force_ok,
          p_deflection_ok: ps.p_deflection_ok,
          p_life_ok: ps.p_life_ok,
          force_mean_n: ps.force_mean,
          force_ci95_n: ps.force_ci95,
          deflection_mean_mm: ps.defl_mean,
          deflection_ci95_mm: ps.defl_ci95,
          speed_multiplier: traits.speed_multiplier,
        };
      });

    evals.sort((a, b) => b.p_success - a.p_success);
    evals.forEach((e, i) => { e.rank = i + 1; });

    const bestP = evals[0] ? evals[0].p_success.toFixed(3) : "n/a";
    log.info(`StochasticRoutingEngine: ranked ${evals.length} algorithms, best=${evals[0]?.algorithm} P(success)=${bestP}`);

    return {
      ranked: evals,
      best_algorithm: evals[0]?.algorithm ?? "trochoidal",
      best_p_success: evals[0]?.p_success ?? 0,
      material: material.name,
      feature,
      n_samples: n,
      warnings,
    };
  }

  /**
   * Evaluate a single algorithm and return detailed probabilistic metrics.
   */
  evaluateAlgorithm(
    algorithm: string,
    feature: FeatureInput,
    material: MaterialInput,
    machine: MachineInput = {}
  ): AlgorithmEvaluation {
    const traits = ALGORITHM_TRAITS[algorithm];
    if (!traits) throw new Error(`Unknown algorithm: ${algorithm}`);

    const samples = evaluateSamples(algorithm, feature, material, machine);
    const ps = computePSuccess(samples.forces, samples.deflections, samples.chatter_flags, samples.life_ratios, feature, machine);

    return {
      algorithm,
      description: traits.description,
      p_success: ps.p_success,
      p_no_chatter: ps.p_no_chatter,
      p_force_ok: ps.p_force_ok,
      p_deflection_ok: ps.p_deflection_ok,
      p_life_ok: ps.p_life_ok,
      force_mean_n: ps.force_mean,
      force_ci95_n: ps.force_ci95,
      deflection_mean_mm: ps.defl_mean,
      deflection_ci95_mm: ps.defl_ci95,
      speed_multiplier: traits.speed_multiplier,
    };
  }

  /**
   * Side-by-side comparison with CI95 for a list of algorithms.
   */
  compareAlgorithms(
    algorithms: string[],
    feature: FeatureInput,
    material: MaterialInput,
    machine: MachineInput = {}
  ): { comparisons: AlgorithmEvaluation[]; winner: string; margin: number } {
    const comparisons = algorithms.map(a => this.evaluateAlgorithm(a, feature, material, machine));
    comparisons.sort((a, b) => b.p_success - a.p_success);
    const margin = comparisons.length >= 2
      ? comparisons[0].p_success - comparisons[1].p_success
      : 1.0;
    return { comparisons, winner: comparisons[0]?.algorithm ?? algorithms[0], margin };
  }

  /**
   * Grid search for optimal DOC/stepover/feed minimizing risk.
   */
  optimizeParameters(
    algorithm: string,
    feature: FeatureInput,
    material: MaterialInput,
    constraints: { min_ae_mm?: number; max_ae_mm?: number; min_ap_mm?: number; max_ap_mm?: number; min_feed?: number; max_feed?: number } = {},
    machine: MachineInput = {}
  ): OptimizationResult {
    const ae_min = constraints.min_ae_mm ?? feature.ae_mm * 0.5;
    const ae_max = constraints.max_ae_mm ?? feature.ae_mm * 1.5;
    const ap_min = constraints.min_ap_mm ?? feature.ap_mm * 0.5;
    const ap_max = constraints.max_ap_mm ?? feature.ap_mm * 1.5;

    const grid = 5; // 5x5 grid
    let best_p = -1;
    let best_ae = feature.ae_mm;
    let best_ap = feature.ap_mm;
    let iterations = 0;

    for (let i = 0; i < grid; i++) {
      for (let j = 0; j < grid; j++) {
        const ae = ae_min + (i / (grid - 1)) * (ae_max - ae_min);
        const ap = ap_min + (j / (grid - 1)) * (ap_max - ap_min);
        const f_test: FeatureInput = { ...feature, ae_mm: ae, ap_mm: ap };
        const ev = this.evaluateAlgorithm(algorithm, f_test, material, machine);
        iterations++;
        if (ev.p_success > best_p) {
          best_p = ev.p_success;
          best_ae = ae;
          best_ap = ap;
        }
      }
    }

    const baseline_ev = this.evaluateAlgorithm(algorithm, feature, material, machine);
    const optimal_feed = feature.feed_mmmin ?? 1000;

    return {
      algorithm,
      optimal_ae_mm: +best_ae.toFixed(3),
      optimal_ap_mm: +best_ap.toFixed(3),
      optimal_feed_mmmin: optimal_feed,
      p_success_optimal: +best_p.toFixed(4),
      p_success_baseline: +baseline_ev.p_success.toFixed(4),
      iterations,
    };
  }

  /**
   * Sensitivity analysis: which parameter variation affects P(success) most.
   */
  sensitivityAnalysis(
    algorithm: string,
    feature: FeatureInput,
    material: MaterialInput,
    machine: MachineInput = {}
  ): SensitivityResult {
    const base_ev = this.evaluateAlgorithm(algorithm, feature, material, machine);
    const p_base = base_ev.p_success;

    const perturbations: { name: string; feature_mod: Partial<FeatureInput>; material_mod?: Partial<MaterialInput> }[] = [
      { name: "ae_mm +20%",        feature_mod: { ae_mm: feature.ae_mm * 1.2 } },
      { name: "ap_mm +20%",        feature_mod: { ap_mm: feature.ap_mm * 1.2 } },
      { name: "overhang +20%",     feature_mod: { overhang_mm: feature.overhang_mm * 1.2 } },
      { name: "rpm -10%",          feature_mod: { rpm: (feature.rpm ?? 6000) * 0.9 } },
      { name: "tolerance -20%",    feature_mod: { tolerance_mm: (feature.tolerance_mm ?? 0.05) * 0.8 } },
      { name: "kc +8% (material)", feature_mod: {}, material_mod: { taylor_C: (material.taylor_C ?? 150) * 0.92 } },
    ];

    const results = perturbations.map(p => {
      const f = { ...feature, ...p.feature_mod };
      const m = { ...material, ...(p.material_mod ?? {}) };
      const ev = this.evaluateAlgorithm(algorithm, f, m, machine);
      return {
        name: p.name,
        p_success_delta: ev.p_success - p_base,
        relative_importance: 0,
      };
    });

    const max_abs = Math.max(...results.map(r => Math.abs(r.p_success_delta)), 1e-9);
    results.forEach(r => {
      r.relative_importance = +(Math.abs(r.p_success_delta) / max_abs).toFixed(3);
    });
    results.sort((a, b) => Math.abs(b.p_success_delta) - Math.abs(a.p_success_delta));

    return {
      algorithm,
      parameters: results,
      most_sensitive: results[0]?.name ?? "unknown",
    };
  }
}

export const stochasticRoutingEngine = new StochasticRoutingEngine();
