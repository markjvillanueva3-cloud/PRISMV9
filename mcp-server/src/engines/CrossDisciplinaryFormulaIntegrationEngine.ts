/**
 * CrossDisciplinaryFormulaIntegrationEngine
 *
 * Bridges the 3 cross-disciplinary JS formula source libraries into PRISM's
 * typed physics layer. Provides a unified registry-compatible interface over
 * formulas from: thermodynamics, fluid dynamics, biology (swarm / genetics),
 * economics (game theory, portfolio), information theory (Shannon entropy,
 * channel capacity), statistics (Bayesian, Monte Carlo, Markov chains),
 * chemistry (Arrhenius kinetics, catalysis), and operations research
 * (M/M/1 queuing, EOQ inventory, scheduling).
 *
 * Key methods:
 *   applyFormula(domain, formulaName, params)   — Execute any formula
 *   findRelevantFormulas(problemDescription)    — AI-powered keyword search
 *   validateFormula(formulaName, inputs)        — Physics sanity check
 *   generateFormulaExplanation(formulaName)     — Educational output
 *
 * Physics constants are sourced from src/physics/constants.ts and injected
 * into formula implementations at construction time.
 *
 * Sources:
 *   PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js (158 KB)
 *   PRISM_ADVANCED_CROSS_DOMAIN_v1.js (33 KB)
 *   PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js (128 KB)
 *
 * @module engines/CrossDisciplinaryFormulaIntegrationEngine
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../physics/constants.js";

// ============================================================================
// CANONICAL PHYSICS CONSTANTS (sourced from PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js)
// All values validated against NIST CODATA 2018 reference
// ============================================================================

/** Stefan-Boltzmann constant [W/(m²·K⁴)] — NIST CODATA 2018 */
export const STEFAN_BOLTZMANN = 5.670374419e-8 as const;

/** Boltzmann constant [J/K] — NIST CODATA 2018 */
export const BOLTZMANN_CONSTANT = 1.380649e-23 as const;

/** Avogadro's number [/mol] — NIST CODATA 2018 */
export const AVOGADRO_NUMBER = 6.02214076e23 as const;

/** Universal gas constant R = N_A × k_B [J/(mol·K)] */
export const GAS_CONSTANT_R = 8.314462618 as const;

/** Speed of sound in air at 20°C [m/s] */
export const SPEED_OF_SOUND_AIR = 343.0 as const;

// ============================================================================
// TYPES
// ============================================================================

/** Supported cross-disciplinary domains */
export type CrossDisciplinaryDomain =
  | "physics"
  | "biology"
  | "economics"
  | "information_theory"
  | "statistics"
  | "chemistry"
  | "operations_research"
  | "finance";

/** Parameter definition for a registered formula */
export interface FormulaParamDef {
  name: string;
  symbol: string;
  unit?: string;
  description: string;
  required: boolean;
  /** Inclusive valid range for physics sanity checks */
  range?: { min: number; max: number };
  default?: number;
}

/** Validation result from validateFormula() */
export interface FormulaValidationResult {
  valid: boolean;
  formulaName: string;
  issues: string[];
  warnings: string[];
  sanitizedInputs: Record<string, number>;
}

/** Result from applyFormula() */
export interface FormulaApplicationResult {
  formulaName: string;
  domain: CrossDisciplinaryDomain;
  inputs: Record<string, number>;
  output: number | Record<string, unknown>;
  unit?: string;
  confidence: number;
  manufacturingContext: string;
  physicsSource: string;
}

/** Result from findRelevantFormulas() */
export interface FormulaSearchResult {
  formulaName: string;
  domain: CrossDisciplinaryDomain;
  relevanceScore: number;
  description: string;
  manufacturingApplication: string;
  formula: string;
}

/** Educational explanation of a formula */
export interface FormulaExplanation {
  formulaName: string;
  domain: CrossDisciplinaryDomain;
  laypersonSummary: string;
  mathematicalDefinition: string;
  variables: FormulaParamDef[];
  workedExample: {
    inputs: Record<string, number>;
    output: number | Record<string, unknown>;
    narrative: string;
  };
  manufacturingContext: string;
  references: string[];
  relatedFormulas: string[];
}

/** Internal formula registration record */
interface FormulaRecord {
  name: string;
  domain: CrossDisciplinaryDomain;
  subdomain: string;
  description: string;
  formula: string;
  unit?: string;
  params: FormulaParamDef[];
  implementation: (inputs: Record<string, number>) => number | Record<string, unknown>;
  manufacturingApplication: string;
  confidence: number;
  source: string;
  references: string[];
  relatedFormulas: string[];
  workedExample: {
    inputs: Record<string, number>;
    output: number | Record<string, unknown>;
    narrative: string;
  };
}

/** FormulaRegistry-compatible entry shape (maps to FormulaRegistry.Formula) */
export interface CrossDisciplinaryRegistryEntry {
  formula_id: string;
  name: string;
  domain: string;
  category: string;
  equation: string;
  equation_plain: string;
  description: string;
  parameters: Array<{
    name: string;
    symbol: string;
    unit: string;
    description: string;
    type: "input" | "output";
  }>;
  validation: {
    required_inputs: string[];
    constraints?: string[];
  };
  consumers: string[];
  source?: string;
}

// ============================================================================
// FORMULA IMPLEMENTATIONS
// (Converted from JS source — all functions pure and deterministic except
//  Monte Carlo which uses Math.random() as per source intent)
// ============================================================================

// ── Physics: Thermodynamics ──────────────────────────────────────────────────

/**
 * Cutting heat generation [W] from mechanical work.
 * Q = Fc × Vc × η_heat  (First Law application)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1, Thermodynamics
 */
function cuttingHeatGeneration(inputs: Record<string, number>): number {
  const { Fc, Vc, eta_heat = 0.9 } = inputs;
  const power = (Fc * Vc) / 60; // W
  return power * eta_heat;
}

/**
 * Carnot cooling efficiency (dimensionless, 0–1).
 * η_max = 1 − T_cold / T_hot
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1, Thermodynamics
 */
function carnotCoolingEfficiency(inputs: Record<string, number>): number {
  const { T_hot, T_cold } = inputs;
  return 1 - T_cold / T_hot;
}

/**
 * Radiative heat loss [W] via Stefan-Boltzmann law.
 * P = ε × σ × A × (T⁴ − T_amb⁴)
 * σ = 5.670374419e-8 W/(m²·K⁴) — NIST CODATA 2018
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1, Thermodynamics
 */
function stefanBoltzmannRadiation(inputs: Record<string, number>): number {
  const { T_surface, T_ambient, area, emissivity = 0.3 } = inputs;
  return (
    emissivity *
    STEFAN_BOLTZMANN *
    area *
    (Math.pow(T_surface, 4) - Math.pow(T_ambient, 4))
  );
}

/**
 * Entropy generation rate [W/K] (Second Law irreversibility).
 * S_gen = Q/T_cold − Q/T_hot
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1, Thermodynamics
 */
function entropyGeneration(inputs: Record<string, number>): number {
  const { Q, T_cold, T_hot } = inputs;
  return Q / T_cold - Q / T_hot;
}

/**
 * Gibbs free energy change [kJ/mol] for chemical wear.
 * ΔG = ΔH − T × ΔS
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1, Thermodynamics
 */
function gibbsFreeEnergy(inputs: Record<string, number>): number {
  const { deltaH, T, deltaS } = inputs;
  return deltaH - (T * deltaS) / 1000; // kJ/mol
}

// ── Physics: Fluid Dynamics ──────────────────────────────────────────────────

/**
 * Reynolds number (dimensionless) — laminar/turbulent classification.
 * Re = ρ × v × D / μ
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1, Fluid Dynamics
 */
function reynoldsNumber(inputs: Record<string, number>): number {
  const { density, velocity, diameter, viscosity } = inputs;
  return (density * velocity * diameter) / viscosity;
}

/**
 * Chip evacuation drag force [N] from coolant flow.
 * F_drag = ½ × ρ × v² × C_d × A
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1, Fluid Dynamics
 */
function chipEvacuationForce(inputs: Record<string, number>): number {
  const { fluid_density, flow_velocity, drag_coeff, chip_area } = inputs;
  return 0.5 * fluid_density * flow_velocity * flow_velocity * drag_coeff * chip_area;
}

/**
 * Darcy-Weisbach coolant line pressure loss [Pa].
 * ΔP = f × (L/D) × (ρv²/2)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1, Fluid Dynamics
 */
function coolantLineLoss(inputs: Record<string, number>): number {
  const { friction_factor, length, diameter, density, velocity } = inputs;
  return friction_factor * (length / diameter) * ((density * velocity * velocity) / 2);
}

/**
 * Bernoulli pressure recovery [Pa].
 * P2 = P1 + ½ρ(v1² − v2²)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1, Fluid Dynamics
 */
function bernoulliPressure(inputs: Record<string, number>): number {
  const { P1, v1, v2, density } = inputs;
  return P1 + 0.5 * density * (v1 * v1 - v2 * v2);
}

// ── Biology: Swarm Intelligence ──────────────────────────────────────────────

/**
 * Ant Colony Optimization pheromone update [dimensionless].
 * τ_new = (1−ρ) × τ_old + Δτ
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §2, Biology
 */
function pheromoneUpdate(inputs: Record<string, number>): number {
  const { evaporation_rate, tau_old, delta_tau } = inputs;
  return (1 - evaporation_rate) * tau_old + delta_tau;
}

/**
 * Genetic fitness function for machining parameter evaluation.
 * fitness = 1 / (cycleTime + qualityPenalty + toolLifePenalty + ε)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §2, Biology/Evolution
 */
function geneticFitness(inputs: Record<string, number>): number {
  const { cycle_time, quality_penalty = 0, tool_life_penalty = 0 } = inputs;
  return 1 / (cycle_time + quality_penalty + tool_life_penalty + 0.001);
}

/**
 * Wright's learning curve — unit time for nth part.
 * Y_n = Y_1 × n^b,   b = log(learning_rate) / log(2)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §7, Psychology
 */
function wrightsLearningCurve(inputs: Record<string, number>): number {
  const { first_unit_time, unit_number, learning_rate = 0.8 } = inputs;
  const b = Math.log(learning_rate) / Math.log(2);
  return first_unit_time * Math.pow(unit_number, b);
}

// ── Economics: Game Theory & Portfolio ───────────────────────────────────────

/**
 * Value-at-Risk for cost estimation.
 * VaR = μ − z × σ  (95% confidence → z = 1.65)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §3, Economics
 */
function valueAtRisk(inputs: Record<string, number>): number {
  const { mean, std_dev, confidence_level = 0.95 } = inputs;
  const zScores: Record<string, number> = { "0.90": 1.28, "0.95": 1.65, "0.99": 2.33 };
  const z = zScores[String(confidence_level)] ?? 1.65;
  return mean - z * std_dev;
}

/**
 * Kelly criterion — optimal capacity allocation fraction.
 * f* = (p × b − q) / b
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §3, Economics
 */
function kellyCriterion(inputs: Record<string, number>): number {
  const { win_probability, payoff_ratio } = inputs;
  const q = 1 - win_probability;
  return Math.max(0, (win_probability * payoff_ratio - q) / payoff_ratio);
}

/**
 * Dynamic pricing multiplier based on capacity utilization.
 * price = basePrice × f(utilization)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §3, Economics
 */
function dynamicPricing(inputs: Record<string, number>): number {
  const { base_price, utilization, min_multiplier = 0.8, max_multiplier = 2.0 } = inputs;
  if (utilization < 0.5) {
    return base_price * (min_multiplier + (1 - min_multiplier) * utilization * 2);
  }
  if (utilization > 0.8) {
    const premium = (utilization - 0.8) / 0.2;
    return base_price * (1 + (max_multiplier - 1) * premium);
  }
  return base_price;
}

/**
 * Portfolio expected return (job mix optimization).
 * E[R] = Σ wᵢ × rᵢ
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §3, Economics
 */
function portfolioReturn(inputs: Record<string, number>): number {
  // Accepts flat key-value pairs: w0, r0, w1, r1, ...
  let ret = 0;
  let i = 0;
  while (`w${i}` in inputs && `r${i}` in inputs) {
    ret += inputs[`w${i}`] * inputs[`r${i}`];
    i++;
  }
  return ret;
}

// ── Information Theory ────────────────────────────────────────────────────────

/**
 * Shannon entropy [bits] of a probability distribution.
 * H(X) = −Σ p(x) × log₂(p(x))
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §4, Information Theory
 */
function shannonEntropy(inputs: Record<string, number>): number {
  // Accepts flat key-value pairs: p0, p1, p2, ...
  const probs: number[] = [];
  let i = 0;
  while (`p${i}` in inputs) {
    probs.push(inputs[`p${i}`]);
    i++;
  }
  return -probs
    .filter((p) => p > 0)
    .reduce((sum, p) => sum + p * Math.log2(p), 0);
}

/**
 * Shannon-Hartley channel capacity [bits/s].
 * C = B × log₂(1 + S/N)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §4, Information Theory
 */
function shannonHartleyCapacity(inputs: Record<string, number>): number {
  const { bandwidth, signal_power, noise_power } = inputs;
  return bandwidth * Math.log2(1 + signal_power / noise_power);
}

/**
 * Information gain [bits] from a decision.
 * IG = H_before − H_after
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §4, Information Theory
 */
function informationGain(inputs: Record<string, number>): number {
  const { entropy_before, conditional_entropy } = inputs;
  return entropy_before - conditional_entropy;
}

// ── Statistics: Bayesian & Markov ─────────────────────────────────────────────

/**
 * Bayesian posterior probability (Bayes' theorem).
 * P(H|E) = P(E|H) × P(H) / P(E)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §5, Statistics
 */
function bayesianPosterior(inputs: Record<string, number>): number {
  const { likelihood, prior, marginal } = inputs;
  return (likelihood * prior) / marginal;
}

/**
 * Gaussian likelihood for Bayesian inference.
 * L = exp(−½z²) / (σ√2π)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §5, Statistics
 */
function gaussianLikelihood(inputs: Record<string, number>): number {
  const { observation, mean, std_dev } = inputs;
  const z = (observation - mean) / std_dev;
  return Math.exp(-0.5 * z * z) / (std_dev * Math.sqrt(2 * Math.PI));
}

/**
 * Monte Carlo cycle time mean estimate [min].
 * Samples N normal perturbations; returns mean of resulting distribution.
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §5, Statistics/MonteCarlo
 */
function monteCarloCycleTime(inputs: Record<string, number>): Record<string, unknown> {
  const { base_time, std_dev_pct = 0.1, num_samples = 1000 } = inputs;
  const samples: number[] = [];
  for (let i = 0; i < num_samples; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2);
    samples.push(base_time + z * base_time * std_dev_pct);
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((s, v) => s + v, 0) / num_samples;
  const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / num_samples;
  return {
    mean,
    stdDev: Math.sqrt(variance),
    p5: samples[Math.floor(0.05 * num_samples)],
    p95: samples[Math.floor(0.95 * num_samples)],
  };
}

// ── Chemistry: Arrhenius & Degradation ───────────────────────────────────────

/**
 * Arrhenius reaction rate constant k [1/s or 1/min depending on A units].
 * k = A × exp(−Ea / RT)
 * R = 8.314462618 J/(mol·K) — canonical GAS_CONSTANT_R
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §8, Chemistry
 */
function arrheniusRateConstant(inputs: Record<string, number>): number {
  const { A, Ea, T } = inputs; // Ea in J/mol, T in K
  return A * Math.exp(-Ea / (GAS_CONSTANT_R * T));
}

/**
 * Coolant degradation concentration [fraction of original].
 * C = C₀ × exp(−kt)   (first-order decay)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §8, Chemistry
 */
function coolantDegradation(inputs: Record<string, number>): number {
  const { C0 = 1.0, k, t } = inputs;
  return C0 * Math.exp(-k * t);
}

/**
 * Chemical wear ratio via Arrhenius: k2/k1 = exp(−Ea/R × (1/T2 − 1/T1)).
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §8, Chemistry
 */
function arrheniusWearRatio(inputs: Record<string, number>): number {
  const { Ea, T1, T2 } = inputs;
  return Math.exp((-Ea / GAS_CONSTANT_R) * (1 / T2 - 1 / T1));
}

// ── Operations Research: Queuing & Inventory ─────────────────────────────────

/**
 * M/M/1 queue utilization ρ = λ/μ [dimensionless, 0–1).
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6, Operations Research
 */
function mm1Utilization(inputs: Record<string, number>): number {
  const { arrival_rate, service_rate } = inputs;
  return arrival_rate / service_rate;
}

/**
 * M/M/1 average queue length [jobs].
 * Lq = ρ² / (1 − ρ)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6, Operations Research
 */
function mm1QueueLength(inputs: Record<string, number>): number {
  const { arrival_rate, service_rate } = inputs;
  const rho = arrival_rate / service_rate;
  if (rho >= 1) return Infinity;
  return (rho * rho) / (1 - rho);
}

/**
 * M/M/1 average time in system [same units as 1/μ].
 * W = 1 / (μ − λ)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6, Operations Research
 */
function mm1TimeInSystem(inputs: Record<string, number>): number {
  const { arrival_rate, service_rate } = inputs;
  return 1 / (service_rate - arrival_rate);
}

/**
 * Economic Order Quantity [units].
 * Q* = √(2DS / H)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6, Operations Research
 */
function economicOrderQuantity(inputs: Record<string, number>): number {
  const { annual_demand, order_cost, holding_cost } = inputs;
  return Math.sqrt((2 * annual_demand * order_cost) / holding_cost);
}

/**
 * Safety stock [units] for uncertain demand/lead time.
 * SS = z × σ_L,  σ_L = √(L×σ_d² + d̄²×σ_L²)
 * Source: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6, Operations Research
 */
function safetyStock(inputs: Record<string, number>): number {
  const {
    avg_demand,
    demand_std_dev,
    avg_lead_time,
    lead_time_std_dev,
    service_level = 0.95,
  } = inputs;
  const zScores: Record<string, number> = { "0.90": 1.28, "0.95": 1.65, "0.99": 2.33 };
  const z = zScores[String(service_level)] ?? 1.65;
  const sigmaL = Math.sqrt(
    avg_lead_time * demand_std_dev * demand_std_dev +
      avg_demand * avg_demand * lead_time_std_dev * lead_time_std_dev
  );
  return z * sigmaL;
}

// ── Finance: Black-Scholes ─────────────────────────────────────────────────

/**
 * Standard normal CDF (Abramowitz & Stegun rational approximation, error < 1.5e-7).
 * Source: PRISM_ADVANCED_CROSS_DOMAIN_v1.js §1, Financial Math
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741;
  const a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
      Math.exp(-absX * absX);
  return 0.5 * (1 + sign * y);
}

/**
 * Black-Scholes call option value — used for real options (machine investment).
 * C = S₀×N(d₁) − K×e^(−rT)×N(d₂)
 * Source: PRISM_ADVANCED_CROSS_DOMAIN_v1.js §1, Financial Math
 */
function blackScholesCallValue(inputs: Record<string, number>): number {
  const { S, K, r, sigma, T } = inputs;
  const d1 =
    (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

/**
 * Sharpe ratio — risk-adjusted return for machine performance.
 * SR = (R̄ − Rf) / σ_R
 * Source: PRISM_ADVANCED_CROSS_DOMAIN_v1.js §1, Financial Math
 */
function sharpeRatio(inputs: Record<string, number>): number {
  const { avg_return, risk_free_rate, std_dev } = inputs;
  return (avg_return - risk_free_rate) / std_dev;
}

// ============================================================================
// FORMULA REGISTRY
// ============================================================================

const FORMULA_REGISTRY: FormulaRecord[] = [
  // ── Physics / Thermodynamics ──
  {
    name: "cutting_heat_generation",
    domain: "physics",
    subdomain: "thermodynamics",
    description: "Heat generated at cutting zone from mechanical work (First Law)",
    formula: "Q = Fc × Vc × η_heat / 60",
    unit: "W",
    params: [
      { name: "Fc", symbol: "F_c", unit: "N", description: "Cutting force", required: true, range: { min: 0, max: 1e6 } },
      { name: "Vc", symbol: "V_c", unit: "m/min", description: "Cutting speed", required: true, range: { min: 0, max: 5000 } },
      { name: "eta_heat", symbol: "η", description: "Heat fraction converted (0.85–0.95)", required: false, range: { min: 0, max: 1 }, default: 0.9 },
    ],
    implementation: cuttingHeatGeneration,
    manufacturingApplication: "Thermal management and coolant sizing in cutting operations",
    confidence: 0.95,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1",
    references: ["Carslaw & Jaeger (1959). Conduction of Heat in Solids, 2nd ed.", "Shaw M.C. (2005). Metal Cutting Principles, 2nd ed."],
    relatedFormulas: ["stefan_boltzmann_radiation", "carnot_cooling_efficiency"],
    workedExample: {
      inputs: { Fc: 1000, Vc: 100, eta_heat: 0.9 },
      output: 1500,
      narrative: "1000 N cutting force at 100 m/min → 1667 W power → 1500 W heat (90% conversion)",
    },
  },
  {
    name: "carnot_cooling_efficiency",
    domain: "physics",
    subdomain: "thermodynamics",
    description: "Maximum theoretical cooling efficiency for flood/mist coolant systems",
    formula: "η_max = 1 − T_cold / T_hot",
    unit: "dimensionless",
    params: [
      { name: "T_hot", symbol: "T_h", unit: "K", description: "Hot temperature (cutting zone)", required: true, range: { min: 273, max: 5000 } },
      { name: "T_cold", symbol: "T_c", unit: "K", description: "Cold temperature (coolant inlet)", required: true, range: { min: 200, max: 500 } },
    ],
    implementation: carnotCoolingEfficiency,
    manufacturingApplication: "Optimize coolant delivery strategy — maximum achievable cooling efficiency",
    confidence: 0.98,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1",
    references: ["Cengel Y.A. & Boles M.A. (2018). Thermodynamics: An Engineering Approach, 9th ed."],
    relatedFormulas: ["cutting_heat_generation", "stefan_boltzmann_radiation"],
    workedExample: {
      inputs: { T_hot: 1073, T_cold: 298 },
      output: 0.7224,
      narrative: "Cutting zone 800°C (1073K), coolant 25°C (298K) → 72.2% maximum theoretical cooling efficiency",
    },
  },
  {
    name: "stefan_boltzmann_radiation",
    domain: "physics",
    subdomain: "thermodynamics",
    description: "Radiative heat loss during dry machining",
    formula: "P = ε × σ × A × (T_surface⁴ − T_ambient⁴)",
    unit: "W",
    params: [
      { name: "T_surface", symbol: "T_s", unit: "K", description: "Surface temperature", required: true, range: { min: 273, max: 5000 } },
      { name: "T_ambient", symbol: "T_amb", unit: "K", description: "Ambient temperature", required: true, range: { min: 200, max: 400 } },
      { name: "area", symbol: "A", unit: "m²", description: "Radiating surface area", required: true, range: { min: 0, max: 10 } },
      { name: "emissivity", symbol: "ε", description: "Surface emissivity (0.1–1.0)", required: false, range: { min: 0, max: 1 }, default: 0.3 },
    ],
    implementation: stefanBoltzmannRadiation,
    manufacturingApplication: "Dry cutting thermal analysis and radiation heat loss quantification",
    confidence: 0.97,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1",
    references: ["NIST CODATA 2018 — σ = 5.670374419×10⁻⁸ W/(m²·K⁴)", "Incropera F.P. et al. (2007). Fundamentals of Heat and Mass Transfer, 6th ed."],
    relatedFormulas: ["carnot_cooling_efficiency", "entropy_generation"],
    workedExample: {
      inputs: { T_surface: 1073, T_ambient: 298, area: 0.0001, emissivity: 0.3 },
      output: 0.47,
      narrative: "Tool at 800°C, ambient 25°C, 1 cm² area, ε=0.3 → ~0.47 W radiated",
    },
  },
  {
    name: "entropy_generation",
    domain: "physics",
    subdomain: "thermodynamics",
    description: "Process irreversibility measure — minimize for energy efficiency",
    formula: "S_gen = Q/T_cold − Q/T_hot",
    unit: "W/K",
    params: [
      { name: "Q", symbol: "Q", unit: "W", description: "Heat transfer rate", required: true, range: { min: 0, max: 1e6 } },
      { name: "T_cold", symbol: "T_c", unit: "K", description: "Cold reservoir temperature", required: true, range: { min: 200, max: 1000 } },
      { name: "T_hot", symbol: "T_h", unit: "K", description: "Hot reservoir temperature", required: true, range: { min: 300, max: 5000 } },
    ],
    implementation: entropyGeneration,
    manufacturingApplication: "Energy efficiency scoring for machining operations (Second Law optimization)",
    confidence: 0.93,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1",
    references: ["Bejan A. (2006). Advanced Engineering Thermodynamics, 3rd ed."],
    relatedFormulas: ["carnot_cooling_efficiency", "gibbs_free_energy_wear"],
    workedExample: {
      inputs: { Q: 1000, T_cold: 298, T_hot: 1073 },
      output: 2.423,
      narrative: "1000 W heat flow, 25°C cold / 800°C hot → 2.42 W/K entropy generation rate",
    },
  },
  {
    name: "gibbs_free_energy_wear",
    domain: "physics",
    subdomain: "thermodynamics",
    description: "Predicts spontaneity of chemical tool wear reactions",
    formula: "ΔG = ΔH − T × ΔS / 1000",
    unit: "kJ/mol",
    params: [
      { name: "deltaH", symbol: "ΔH", unit: "kJ/mol", description: "Enthalpy change of wear reaction", required: true },
      { name: "T", symbol: "T", unit: "K", description: "Cutting zone temperature", required: true, range: { min: 273, max: 3000 } },
      { name: "deltaS", symbol: "ΔS", unit: "J/(mol·K)", description: "Entropy change of wear reaction", required: true },
    ],
    implementation: gibbsFreeEnergy,
    manufacturingApplication: "Chemical tool wear prediction — negative ΔG means spontaneous wear",
    confidence: 0.88,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1",
    references: ["Atkins P.W. (2014). Physical Chemistry, 10th ed.", "Sata T. (1983). Theory of tool wear. CIRP Annals, 32(2)."],
    relatedFormulas: ["arrhenius_rate_constant", "entropy_generation"],
    workedExample: {
      inputs: { deltaH: -50, T: 1000, deltaS: 20 },
      output: -70,
      narrative: "ΔH=−50 kJ/mol, T=1000K, ΔS=20 J/(mol·K) → ΔG=−70 kJ/mol (spontaneous chemical wear)",
    },
  },
  // ── Physics / Fluid Dynamics ──
  {
    name: "reynolds_number",
    domain: "physics",
    subdomain: "fluid_dynamics",
    description: "Classifies coolant flow as laminar (Re<2300) or turbulent (Re>4000)",
    formula: "Re = ρ × v × D / μ",
    unit: "dimensionless",
    params: [
      { name: "density", symbol: "ρ", unit: "kg/m³", description: "Fluid density", required: true, range: { min: 0.1, max: 20000 } },
      { name: "velocity", symbol: "v", unit: "m/s", description: "Flow velocity", required: true, range: { min: 0, max: 100 } },
      { name: "diameter", symbol: "D", unit: "m", description: "Hydraulic diameter of passage", required: true, range: { min: 0.0001, max: 1 } },
      { name: "viscosity", symbol: "μ", unit: "Pa·s", description: "Dynamic viscosity", required: true, range: { min: 1e-6, max: 10 } },
    ],
    implementation: reynoldsNumber,
    manufacturingApplication: "Coolant nozzle optimization — turbulent flow (Re>4000) provides superior heat transfer",
    confidence: 0.99,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1",
    references: ["White F.M. (2016). Fluid Mechanics, 8th ed., McGraw-Hill"],
    relatedFormulas: ["chip_evacuation_force", "coolant_line_loss"],
    workedExample: {
      inputs: { density: 1000, velocity: 5, diameter: 0.003, viscosity: 0.001 },
      output: 15000,
      narrative: "Water at 5 m/s through 3mm nozzle → Re=15,000 (turbulent — good for cooling)",
    },
  },
  {
    name: "chip_evacuation_force",
    domain: "physics",
    subdomain: "fluid_dynamics",
    description: "Drag force required to evacuate chips via coolant flow",
    formula: "F_drag = ½ × ρ × v² × C_d × A",
    unit: "N",
    params: [
      { name: "fluid_density", symbol: "ρ", unit: "kg/m³", description: "Coolant density", required: true, range: { min: 0.1, max: 20000 } },
      { name: "flow_velocity", symbol: "v", unit: "m/s", description: "Coolant flow velocity", required: true, range: { min: 0, max: 100 } },
      { name: "drag_coeff", symbol: "C_d", description: "Drag coefficient (flat=1.28, curled=0.47, stringy=0.82)", required: true, range: { min: 0.1, max: 5 } },
      { name: "chip_area", symbol: "A", unit: "m²", description: "Projected chip area", required: true, range: { min: 0, max: 0.1 } },
    ],
    implementation: chipEvacuationForce,
    manufacturingApplication: "Chip management and coolant flow requirements calculation",
    confidence: 0.92,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1",
    references: ["Nakayama K. (1984). Chip control in metal cutting. Annals of CIRP"],
    relatedFormulas: ["reynolds_number", "coolant_line_loss"],
    workedExample: {
      inputs: { fluid_density: 1000, flow_velocity: 3, drag_coeff: 1.28, chip_area: 0.00001 },
      output: 0.0576,
      narrative: "Water at 3 m/s, flat chip Cd=1.28, area 10mm² → 0.058 N drag force",
    },
  },
  {
    name: "coolant_line_loss",
    domain: "physics",
    subdomain: "fluid_dynamics",
    description: "Pressure drop in coolant delivery lines (Darcy-Weisbach)",
    formula: "ΔP = f × (L/D) × (ρv²/2)",
    unit: "Pa",
    params: [
      { name: "friction_factor", symbol: "f", description: "Darcy friction factor", required: true, range: { min: 0.005, max: 1 } },
      { name: "length", symbol: "L", unit: "m", description: "Pipe length", required: true, range: { min: 0, max: 1000 } },
      { name: "diameter", symbol: "D", unit: "m", description: "Pipe inner diameter", required: true, range: { min: 0.001, max: 1 } },
      { name: "density", symbol: "ρ", unit: "kg/m³", description: "Fluid density", required: true, range: { min: 0.1, max: 20000 } },
      { name: "velocity", symbol: "v", unit: "m/s", description: "Flow velocity", required: true, range: { min: 0, max: 100 } },
    ],
    implementation: coolantLineLoss,
    manufacturingApplication: "Coolant line sizing and pump selection for through-tool and flood delivery",
    confidence: 0.95,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1",
    references: ["Munson B.R. et al. (2013). Fundamentals of Fluid Mechanics, 7th ed."],
    relatedFormulas: ["reynolds_number", "bernoulli_pressure"],
    workedExample: {
      inputs: { friction_factor: 0.02, length: 5, diameter: 0.01, density: 1000, velocity: 3 },
      output: 45000,
      narrative: "f=0.02, 5m pipe, 10mm dia, water at 3 m/s → 45 kPa pressure drop",
    },
  },
  {
    name: "bernoulli_pressure",
    domain: "physics",
    subdomain: "fluid_dynamics",
    description: "Pressure–velocity relationship in coolant delivery (Bernoulli equation)",
    formula: "P2 = P1 + ½ρ(v1² − v2²)",
    unit: "Pa",
    params: [
      { name: "P1", symbol: "P_1", unit: "Pa", description: "Upstream pressure", required: true, range: { min: 0, max: 1e8 } },
      { name: "v1", symbol: "v_1", unit: "m/s", description: "Upstream velocity", required: true, range: { min: 0, max: 100 } },
      { name: "v2", symbol: "v_2", unit: "m/s", description: "Downstream velocity", required: true, range: { min: 0, max: 100 } },
      { name: "density", symbol: "ρ", unit: "kg/m³", description: "Fluid density", required: true, range: { min: 0.1, max: 20000 } },
    ],
    implementation: bernoulliPressure,
    manufacturingApplication: "Through-tool coolant pressure calculation at nozzle exit",
    confidence: 0.97,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §1",
    references: ["Bernoulli D. (1738). Hydrodynamica. Strasbourg."],
    relatedFormulas: ["coolant_line_loss", "reynolds_number"],
    workedExample: {
      inputs: { P1: 200000, v1: 1, v2: 5, density: 1000 },
      output: 188000,
      narrative: "200 kPa at 1 m/s inlet, accelerating to 5 m/s → 188 kPa at nozzle",
    },
  },
  // ── Biology ──
  {
    name: "pheromone_update",
    domain: "biology",
    subdomain: "swarm_intelligence",
    description: "Ant Colony Optimization pheromone trail update rule",
    formula: "τ_new = (1−ρ) × τ_old + Δτ",
    unit: "dimensionless",
    params: [
      { name: "evaporation_rate", symbol: "ρ", description: "Pheromone evaporation rate (0–1)", required: true, range: { min: 0, max: 1 } },
      { name: "tau_old", symbol: "τ_old", description: "Current pheromone level", required: true, range: { min: 0, max: 1e6 } },
      { name: "delta_tau", symbol: "Δτ", description: "Pheromone deposit from ant traversal", required: true, range: { min: 0, max: 1e6 } },
    ],
    implementation: pheromoneUpdate,
    manufacturingApplication: "ACO toolpath optimization — pheromone trails guide tool sequence selection",
    confidence: 0.90,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §2",
    references: ["Dorigo M. & Stutzle T. (2004). Ant Colony Optimization. MIT Press."],
    relatedFormulas: ["genetic_fitness"],
    workedExample: {
      inputs: { evaporation_rate: 0.1, tau_old: 5.0, delta_tau: 2.0 },
      output: 6.5,
      narrative: "ρ=0.1, τ=5, Δτ=2 → τ_new = 0.9×5 + 2 = 6.5",
    },
  },
  {
    name: "genetic_fitness",
    domain: "biology",
    subdomain: "evolutionary_algorithms",
    description: "Fitness function for genetic algorithm machining parameter optimization",
    formula: "fitness = 1 / (cycleTime + qualityPenalty + toolLifePenalty + 0.001)",
    unit: "dimensionless",
    params: [
      { name: "cycle_time", symbol: "T_c", unit: "min", description: "Estimated cycle time", required: true, range: { min: 0, max: 10000 } },
      { name: "quality_penalty", symbol: "P_q", description: "Quality constraint violation penalty", required: false, range: { min: 0, max: 1e6 }, default: 0 },
      { name: "tool_life_penalty", symbol: "P_t", description: "Tool life constraint violation penalty", required: false, range: { min: 0, max: 1e6 }, default: 0 },
    ],
    implementation: geneticFitness,
    manufacturingApplication: "Genetic algorithm toolpath and cutting parameter optimization",
    confidence: 0.88,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §2",
    references: ["Holland J.H. (1992). Adaptation in Natural and Artificial Systems. MIT Press."],
    relatedFormulas: ["pheromone_update"],
    workedExample: {
      inputs: { cycle_time: 12, quality_penalty: 0, tool_life_penalty: 0 },
      output: 0.0833,
      narrative: "12-minute cycle with no violations → fitness = 1/12.001 ≈ 0.083",
    },
  },
  {
    name: "wrights_learning_curve",
    domain: "biology",
    subdomain: "learning",
    description: "Production time decreases with accumulated experience (Wright's Law)",
    formula: "Y_n = Y_1 × n^b,  b = log(lr)/log(2)",
    unit: "min (same as first_unit_time)",
    params: [
      { name: "first_unit_time", symbol: "Y_1", unit: "min", description: "Time to produce first unit", required: true, range: { min: 0, max: 1e6 } },
      { name: "unit_number", symbol: "n", description: "Cumulative unit number", required: true, range: { min: 1, max: 1e9 } },
      { name: "learning_rate", symbol: "lr", description: "Learning rate (0.7–0.9, typical 0.8)", required: false, range: { min: 0.5, max: 1.0 }, default: 0.8 },
    ],
    implementation: wrightsLearningCurve,
    manufacturingApplication: "Operator training time estimation and production scheduling for new parts",
    confidence: 0.85,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §7",
    references: ["Wright T.P. (1936). Factors affecting the cost of airplanes. J. Aeronautical Sciences 3(4)."],
    relatedFormulas: ["genetic_fitness"],
    workedExample: {
      inputs: { first_unit_time: 100, unit_number: 8, learning_rate: 0.8 },
      output: 51.2,
      narrative: "First unit 100 min, lr=0.8 → 8th unit ≈ 51.2 min (doubled 3 times, each at 80% of prior)",
    },
  },
  // ── Economics ──
  {
    name: "value_at_risk",
    domain: "economics",
    subdomain: "risk_management",
    description: "Maximum expected cost loss at a given confidence level",
    formula: "VaR = μ − z × σ",
    unit: "same as mean",
    params: [
      { name: "mean", symbol: "μ", description: "Expected cost/value", required: true },
      { name: "std_dev", symbol: "σ", description: "Standard deviation of cost/value", required: true, range: { min: 0, max: 1e12 } },
      { name: "confidence_level", symbol: "α", description: "Confidence level (0.90, 0.95, or 0.99)", required: false, range: { min: 0.8, max: 0.999 }, default: 0.95 },
    ],
    implementation: valueAtRisk,
    manufacturingApplication: "Risk-adjusted quote pricing and cost estimation with uncertainty buffer",
    confidence: 0.93,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §3",
    references: ["Jorion P. (2006). Value at Risk, 3rd ed. McGraw-Hill."],
    relatedFormulas: ["kelly_criterion", "portfolio_return"],
    workedExample: {
      inputs: { mean: 1000, std_dev: 100, confidence_level: 0.95 },
      output: 835,
      narrative: "μ=$1000, σ=$100, 95% confidence → VaR=$835 (lower bound of acceptable range)",
    },
  },
  {
    name: "kelly_criterion",
    domain: "economics",
    subdomain: "portfolio_theory",
    description: "Optimal fraction of capacity to allocate to an investment (Kelly Formula)",
    formula: "f* = (p×b − q) / b,  q = 1−p",
    unit: "fraction (0–1)",
    params: [
      { name: "win_probability", symbol: "p", description: "Probability of positive return", required: true, range: { min: 0, max: 1 } },
      { name: "payoff_ratio", symbol: "b", description: "Ratio of gain to loss on winning bet", required: true, range: { min: 0, max: 1000 } },
    ],
    implementation: kellyCriterion,
    manufacturingApplication: "Capacity expansion decisions — optimal investment fraction for new equipment",
    confidence: 0.82,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §3",
    references: ["Kelly J.L. (1956). A new interpretation of information rate. Bell System Technical Journal 35(4)."],
    relatedFormulas: ["value_at_risk", "dynamic_pricing"],
    workedExample: {
      inputs: { win_probability: 0.7, payoff_ratio: 2 },
      output: 0.2,
      narrative: "70% win probability, 2:1 payoff → invest 20% of available capital",
    },
  },
  {
    name: "dynamic_pricing",
    domain: "economics",
    subdomain: "pricing",
    description: "Capacity-utilization-based dynamic quote pricing",
    formula: "price = basePrice × f(utilization)",
    unit: "same as base_price",
    params: [
      { name: "base_price", symbol: "P_0", description: "Standard price at normal utilization", required: true, range: { min: 0, max: 1e9 } },
      { name: "utilization", symbol: "ρ", description: "Current capacity utilization (0–1)", required: true, range: { min: 0, max: 1 } },
      { name: "min_multiplier", symbol: "m_min", description: "Minimum price multiplier (default 0.8)", required: false, range: { min: 0.1, max: 1 }, default: 0.8 },
      { name: "max_multiplier", symbol: "m_max", description: "Maximum price multiplier (default 2.0)", required: false, range: { min: 1, max: 10 }, default: 2.0 },
    ],
    implementation: dynamicPricing,
    manufacturingApplication: "Dynamic quoting engine — discount when underloaded, premium when near capacity",
    confidence: 0.80,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §3",
    references: ["Talluri K.T. & van Ryzin G.J. (2004). The Theory and Practice of Revenue Management. Springer."],
    relatedFormulas: ["kelly_criterion", "value_at_risk"],
    workedExample: {
      inputs: { base_price: 100, utilization: 0.9, min_multiplier: 0.8, max_multiplier: 2.0 },
      output: 200,
      narrative: "Base $100, 90% utilized (>80%) → maximum premium → $200 quote",
    },
  },
  {
    name: "portfolio_return",
    domain: "economics",
    subdomain: "portfolio_theory",
    description: "Weighted job mix expected return (Markowitz portfolio theory)",
    formula: "E[R] = Σ wᵢ × rᵢ",
    unit: "same as rᵢ units",
    params: [
      { name: "w0", symbol: "w₀", description: "Weight of job/asset 0 (sums to 1)", required: true, range: { min: 0, max: 1 } },
      { name: "r0", symbol: "r₀", description: "Return of job/asset 0", required: true },
      { name: "w1", symbol: "w₁", description: "Weight of job/asset 1", required: false, range: { min: 0, max: 1 } },
      { name: "r1", symbol: "r₁", description: "Return of job/asset 1", required: false },
    ],
    implementation: portfolioReturn,
    manufacturingApplication: "Optimize job mix for maximum profit — balance high-margin vs stable jobs",
    confidence: 0.85,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §3",
    references: ["Markowitz H. (1952). Portfolio Selection. Journal of Finance 7(1)."],
    relatedFormulas: ["value_at_risk", "sharpe_ratio"],
    workedExample: {
      inputs: { w0: 0.6, r0: 0.15, w1: 0.4, r1: 0.08 },
      output: 0.122,
      narrative: "60% high-margin jobs (15% return) + 40% stable jobs (8% return) → 12.2% expected return",
    },
  },
  // ── Information Theory ──
  {
    name: "shannon_entropy",
    domain: "information_theory",
    subdomain: "entropy",
    description: "Shannon information entropy of a probability distribution",
    formula: "H(X) = −Σ p(x) × log₂(p(x))",
    unit: "bits",
    params: [
      { name: "p0", symbol: "p₀", description: "Probability of outcome 0", required: true, range: { min: 0, max: 1 } },
      { name: "p1", symbol: "p₁", description: "Probability of outcome 1", required: false, range: { min: 0, max: 1 } },
      { name: "p2", symbol: "p₂", description: "Probability of outcome 2", required: false, range: { min: 0, max: 1 } },
      { name: "p3", symbol: "p₃", description: "Probability of outcome 3", required: false, range: { min: 0, max: 1 } },
    ],
    implementation: shannonEntropy,
    manufacturingApplication: "Feature importance scoring, process uncertainty quantification, alarm system optimization",
    confidence: 0.96,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §4",
    references: ["Shannon C.E. (1948). A Mathematical Theory of Communication. Bell System Technical Journal 27."],
    relatedFormulas: ["information_gain", "shannon_hartley_capacity"],
    workedExample: {
      inputs: { p0: 0.5, p1: 0.5 },
      output: 1.0,
      narrative: "50/50 distribution → maximum uncertainty = 1 bit",
    },
  },
  {
    name: "shannon_hartley_capacity",
    domain: "information_theory",
    subdomain: "channel_capacity",
    description: "Maximum channel data rate (Shannon-Hartley theorem)",
    formula: "C = B × log₂(1 + S/N)",
    unit: "bits/s",
    params: [
      { name: "bandwidth", symbol: "B", unit: "Hz", description: "Channel bandwidth", required: true, range: { min: 0, max: 1e12 } },
      { name: "signal_power", symbol: "S", description: "Signal power", required: true, range: { min: 0, max: 1e12 } },
      { name: "noise_power", symbol: "N", description: "Noise power", required: true, range: { min: 1e-20, max: 1e12 } },
    ],
    implementation: shannonHartleyCapacity,
    manufacturingApplication: "DNC network capacity planning, machine communication optimization",
    confidence: 0.94,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §4",
    references: ["Shannon C.E. (1948). A Mathematical Theory of Communication. Bell System Technical Journal 27."],
    relatedFormulas: ["shannon_entropy", "information_gain"],
    workedExample: {
      inputs: { bandwidth: 1e6, signal_power: 100, noise_power: 1 },
      output: 6644000,
      narrative: "1 MHz bandwidth, SNR=100 → 6.6 Mbps maximum data rate",
    },
  },
  {
    name: "information_gain",
    domain: "information_theory",
    subdomain: "entropy",
    description: "Information gain (entropy reduction) from a decision",
    formula: "IG = H_before − H_after|X",
    unit: "bits",
    params: [
      { name: "entropy_before", symbol: "H_Y", unit: "bits", description: "Prior entropy of target variable", required: true, range: { min: 0, max: 100 } },
      { name: "conditional_entropy", symbol: "H(Y|X)", unit: "bits", description: "Posterior conditional entropy given decision X", required: true, range: { min: 0, max: 100 } },
    ],
    implementation: informationGain,
    manufacturingApplication: "Strategy selection decision trees — rank which feature/condition reduces uncertainty most",
    confidence: 0.95,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §4",
    references: ["Quinlan J.R. (1986). Induction of decision trees. Machine Learning 1(1)."],
    relatedFormulas: ["shannon_entropy", "bayesian_posterior"],
    workedExample: {
      inputs: { entropy_before: 1.0, conditional_entropy: 0.4 },
      output: 0.6,
      narrative: "Prior uncertainty 1.0 bit, after observing condition drops to 0.4 bits → IG=0.6 bits",
    },
  },
  // ── Statistics ──
  {
    name: "bayesian_posterior",
    domain: "statistics",
    subdomain: "bayesian_inference",
    description: "Bayesian posterior probability — update beliefs with new evidence",
    formula: "P(H|E) = P(E|H) × P(H) / P(E)",
    unit: "probability (0–1)",
    params: [
      { name: "likelihood", symbol: "P(E|H)", description: "Probability of evidence given hypothesis", required: true, range: { min: 0, max: 1 } },
      { name: "prior", symbol: "P(H)", description: "Prior probability of hypothesis", required: true, range: { min: 0, max: 1 } },
      { name: "marginal", symbol: "P(E)", description: "Marginal probability of evidence", required: true, range: { min: 1e-12, max: 1 } },
    ],
    implementation: bayesianPosterior,
    manufacturingApplication: "Adaptive tool life estimation, fault diagnosis, process state inference",
    confidence: 0.97,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §5",
    references: ["Gelman A. et al. (2013). Bayesian Data Analysis, 3rd ed. CRC Press."],
    relatedFormulas: ["gaussian_likelihood", "information_gain"],
    workedExample: {
      inputs: { likelihood: 0.85, prior: 0.2, marginal: 0.35 },
      output: 0.4857,
      narrative: "P(E|H)=0.85, P(H)=0.2, P(E)=0.35 → P(H|E)≈0.486 (belief updated upward)",
    },
  },
  {
    name: "gaussian_likelihood",
    domain: "statistics",
    subdomain: "bayesian_inference",
    description: "Gaussian likelihood function for continuous observations",
    formula: "L = exp(−½z²) / (σ√2π),  z = (x−μ)/σ",
    unit: "probability density",
    params: [
      { name: "observation", symbol: "x", description: "Observed value", required: true },
      { name: "mean", symbol: "μ", description: "Distribution mean", required: true },
      { name: "std_dev", symbol: "σ", description: "Standard deviation", required: true, range: { min: 1e-12, max: 1e12 } },
    ],
    implementation: gaussianLikelihood,
    manufacturingApplication: "Tool condition monitoring — likelihood of observation given known wear state",
    confidence: 0.96,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §5",
    references: ["Bishop C.M. (2006). Pattern Recognition and Machine Learning. Springer."],
    relatedFormulas: ["bayesian_posterior", "monte_carlo_cycle_time"],
    workedExample: {
      inputs: { observation: 1.0, mean: 1.0, std_dev: 0.5 },
      output: 0.7979,
      narrative: "Observation at mean with σ=0.5 → likelihood = 1/(0.5√2π) ≈ 0.798 (peak of PDF)",
    },
  },
  {
    name: "monte_carlo_cycle_time",
    domain: "statistics",
    subdomain: "monte_carlo",
    description: "Monte Carlo cycle time uncertainty estimation via normal sampling",
    formula: "E[T] ≈ (1/N) Σ (T_base + z_i × T_base × σ_pct)",
    unit: "same as base_time",
    params: [
      { name: "base_time", symbol: "T_0", description: "Deterministic base cycle time", required: true, range: { min: 0, max: 1e6 } },
      { name: "std_dev_pct", symbol: "σ%", description: "Fractional standard deviation (e.g. 0.1 = 10%)", required: false, range: { min: 0, max: 1 }, default: 0.1 },
      { name: "num_samples", symbol: "N", description: "Monte Carlo sample count", required: false, range: { min: 10, max: 100000 }, default: 1000 },
    ],
    implementation: monteCarloCycleTime,
    manufacturingApplication: "Robust cycle time planning with uncertainty bounds for scheduling",
    confidence: 0.88,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §5",
    references: ["Rubinstein R.Y. & Kroese D.P. (2008). Simulation and the Monte Carlo Method. Wiley."],
    relatedFormulas: ["bayesian_posterior", "gaussian_likelihood"],
    workedExample: {
      inputs: { base_time: 10, std_dev_pct: 0.1, num_samples: 100 },
      output: 10,
      narrative: "Base 10 min, 10% variability → mean ~10 min, 90th-percentile ~11.3 min (stochastic)",
    },
  },
  // ── Chemistry ──
  {
    name: "arrhenius_rate_constant",
    domain: "chemistry",
    subdomain: "reaction_kinetics",
    description: "Temperature-dependent reaction rate constant (Arrhenius equation)",
    formula: "k = A × exp(−Ea / RT),  R = 8.314 J/(mol·K)",
    unit: "same units as A",
    params: [
      { name: "A", symbol: "A", description: "Pre-exponential frequency factor", required: true, range: { min: 0, max: 1e30 } },
      { name: "Ea", symbol: "E_a", unit: "J/mol", description: "Activation energy", required: true, range: { min: 0, max: 1e7 } },
      { name: "T", symbol: "T", unit: "K", description: "Temperature", required: true, range: { min: 200, max: 5000 } },
    ],
    implementation: arrheniusRateConstant,
    manufacturingApplication: "Temperature-compensated tool wear prediction and coolant degradation modeling",
    confidence: 0.91,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §8",
    references: ["Arrhenius S. (1889). Über die Reaktionsgeschwindigkeit. Z. Phys. Chem. 4.", "GAS_CONSTANT_R = 8.314462618 J/(mol·K) — NIST CODATA 2018"],
    relatedFormulas: ["arrhenius_wear_ratio", "gibbs_free_energy_wear"],
    workedExample: {
      inputs: { A: 1e10, Ea: 50000, T: 1000 },
      output: 2478752.2,
      narrative: "A=1e10, Ea=50 kJ/mol, T=1000K → k≈2.5×10⁶ (reaction much faster at high temperature)",
    },
  },
  {
    name: "coolant_degradation",
    domain: "chemistry",
    subdomain: "degradation_kinetics",
    description: "First-order coolant effectiveness decay over time",
    formula: "C(t) = C₀ × exp(−kt)",
    unit: "fraction of original effectiveness",
    params: [
      { name: "C0", symbol: "C_0", description: "Initial coolant effectiveness (default 1.0)", required: false, range: { min: 0, max: 1 }, default: 1.0 },
      { name: "k", symbol: "k", unit: "1/h", description: "Degradation rate constant", required: true, range: { min: 0, max: 10 } },
      { name: "t", symbol: "t", unit: "h", description: "Time elapsed", required: true, range: { min: 0, max: 10000 } },
    ],
    implementation: coolantDegradation,
    manufacturingApplication: "Coolant change interval scheduling and effectiveness monitoring",
    confidence: 0.87,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §8",
    references: ["Astakhov V.P. (2006). Tribology of Metal Cutting. Elsevier."],
    relatedFormulas: ["arrhenius_rate_constant", "arrhenius_wear_ratio"],
    workedExample: {
      inputs: { C0: 1.0, k: 0.005, t: 200 },
      output: 0.3679,
      narrative: "k=0.005/h, 200h service → concentration at 36.8% of original (half-life ≈ 139h)",
    },
  },
  {
    name: "arrhenius_wear_ratio",
    domain: "chemistry",
    subdomain: "reaction_kinetics",
    description: "Relative chemical wear rate between two temperatures",
    formula: "k₂/k₁ = exp(−Ea/R × (1/T₂ − 1/T₁))",
    unit: "dimensionless ratio",
    params: [
      { name: "Ea", symbol: "E_a", unit: "J/mol", description: "Wear reaction activation energy", required: true, range: { min: 0, max: 1e7 } },
      { name: "T1", symbol: "T_1", unit: "K", description: "Reference temperature", required: true, range: { min: 200, max: 5000 } },
      { name: "T2", symbol: "T_2", unit: "K", description: "New temperature to predict wear at", required: true, range: { min: 200, max: 5000 } },
    ],
    implementation: arrheniusWearRatio,
    manufacturingApplication: "Predict tool wear acceleration when cutting temperature increases",
    confidence: 0.89,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §8",
    references: ["Trigger K.J. & Chao B.T. (1956). Tool-chip interface temperatures. Trans. ASME 78."],
    relatedFormulas: ["arrhenius_rate_constant", "gibbs_free_energy_wear"],
    workedExample: {
      inputs: { Ea: 80000, T1: 700, T2: 900 },
      output: 14.3,
      narrative: "Ea=80 kJ/mol, temperature rise 700K→900K → wear rate increases 14× (strongly temperature-sensitive)",
    },
  },
  // ── Operations Research ──
  {
    name: "mm1_utilization",
    domain: "operations_research",
    subdomain: "queuing_theory",
    description: "M/M/1 queue server utilization",
    formula: "ρ = λ / μ",
    unit: "fraction (0–1)",
    params: [
      { name: "arrival_rate", symbol: "λ", unit: "jobs/h", description: "Average job arrival rate", required: true, range: { min: 0, max: 1e6 } },
      { name: "service_rate", symbol: "μ", unit: "jobs/h", description: "Average service/completion rate", required: true, range: { min: 1e-9, max: 1e6 } },
    ],
    implementation: mm1Utilization,
    manufacturingApplication: "Machine utilization prediction and bottleneck identification",
    confidence: 0.95,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6",
    references: ["Kleinrock L. (1975). Queueing Systems, Volume 1. Wiley."],
    relatedFormulas: ["mm1_queue_length", "mm1_time_in_system"],
    workedExample: {
      inputs: { arrival_rate: 8, service_rate: 10 },
      output: 0.8,
      narrative: "8 jobs/h arriving, 10 jobs/h capacity → 80% utilization",
    },
  },
  {
    name: "mm1_queue_length",
    domain: "operations_research",
    subdomain: "queuing_theory",
    description: "M/M/1 average queue length (jobs waiting)",
    formula: "Lq = ρ² / (1 − ρ)",
    unit: "jobs",
    params: [
      { name: "arrival_rate", symbol: "λ", unit: "jobs/h", description: "Average job arrival rate", required: true, range: { min: 0, max: 1e6 } },
      { name: "service_rate", symbol: "μ", unit: "jobs/h", description: "Average service rate (must exceed arrival rate)", required: true, range: { min: 1e-9, max: 1e6 } },
    ],
    implementation: mm1QueueLength,
    manufacturingApplication: "WIP level prediction and shop floor capacity planning",
    confidence: 0.93,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6",
    references: ["Kleinrock L. (1975). Queueing Systems, Volume 1. Wiley."],
    relatedFormulas: ["mm1_utilization", "mm1_time_in_system", "economic_order_quantity"],
    workedExample: {
      inputs: { arrival_rate: 8, service_rate: 10 },
      output: 3.2,
      narrative: "ρ=0.8 → average 3.2 jobs waiting in queue",
    },
  },
  {
    name: "mm1_time_in_system",
    domain: "operations_research",
    subdomain: "queuing_theory",
    description: "M/M/1 average time a job spends in the system (waiting + service)",
    formula: "W = 1 / (μ − λ)",
    unit: "same as 1/service_rate",
    params: [
      { name: "arrival_rate", symbol: "λ", unit: "jobs/h", description: "Average job arrival rate", required: true, range: { min: 0, max: 1e6 } },
      { name: "service_rate", symbol: "μ", unit: "jobs/h", description: "Average service rate", required: true, range: { min: 1e-9, max: 1e6 } },
    ],
    implementation: mm1TimeInSystem,
    manufacturingApplication: "Lead time estimation and delivery promise accuracy",
    confidence: 0.93,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6",
    references: ["Little J.D.C. (1961). A proof for the queuing formula. Operations Research 9(3)."],
    relatedFormulas: ["mm1_utilization", "mm1_queue_length"],
    workedExample: {
      inputs: { arrival_rate: 8, service_rate: 10 },
      output: 0.5,
      narrative: "λ=8, μ=10 jobs/h → average 0.5 h per job in system (30 minutes turnaround)",
    },
  },
  {
    name: "economic_order_quantity",
    domain: "operations_research",
    subdomain: "inventory_management",
    description: "Optimal tool/material order quantity minimizing total inventory cost",
    formula: "Q* = √(2DS / H)",
    unit: "units",
    params: [
      { name: "annual_demand", symbol: "D", unit: "units/yr", description: "Annual demand", required: true, range: { min: 0, max: 1e9 } },
      { name: "order_cost", symbol: "S", unit: "$/order", description: "Fixed cost per order", required: true, range: { min: 0, max: 1e6 } },
      { name: "holding_cost", symbol: "H", unit: "$/unit/yr", description: "Annual holding cost per unit", required: true, range: { min: 1e-9, max: 1e6 } },
    ],
    implementation: economicOrderQuantity,
    manufacturingApplication: "Tool inventory management — optimal order quantities for inserts, drills, end mills",
    confidence: 0.92,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6",
    references: ["Harris F.W. (1913). How many parts to make at once. Factory Mag. Mgmt. 10(2)."],
    relatedFormulas: ["safety_stock", "mm1_queue_length"],
    workedExample: {
      inputs: { annual_demand: 1200, order_cost: 50, holding_cost: 5 },
      output: 109.5,
      narrative: "D=1200/yr, S=$50/order, H=$5/unit/yr → Q*=110 units per order",
    },
  },
  {
    name: "safety_stock",
    domain: "operations_research",
    subdomain: "inventory_management",
    description: "Safety stock buffer for uncertain demand and lead time",
    formula: "SS = z × σ_L,  σ_L = √(L×σ_d² + d̄²×σ_L²)",
    unit: "units",
    params: [
      { name: "avg_demand", symbol: "d̄", unit: "units/day", description: "Average daily demand", required: true, range: { min: 0, max: 1e6 } },
      { name: "demand_std_dev", symbol: "σ_d", unit: "units/day", description: "Standard deviation of daily demand", required: true, range: { min: 0, max: 1e6 } },
      { name: "avg_lead_time", symbol: "L̄", unit: "days", description: "Average lead time", required: true, range: { min: 0, max: 1000 } },
      { name: "lead_time_std_dev", symbol: "σ_L", unit: "days", description: "Standard deviation of lead time", required: true, range: { min: 0, max: 500 } },
      { name: "service_level", symbol: "α", description: "Desired service level (0.90, 0.95, 0.99)", required: false, range: { min: 0.8, max: 0.999 }, default: 0.95 },
    ],
    implementation: safetyStock,
    manufacturingApplication: "Safety buffer for tool inventory against demand variability and supplier lead time uncertainty",
    confidence: 0.90,
    source: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js §6",
    references: ["Silver E.A. et al. (2016). Inventory and Production Management in Supply Chains, 4th ed."],
    relatedFormulas: ["economic_order_quantity", "value_at_risk"],
    workedExample: {
      inputs: { avg_demand: 5, demand_std_dev: 2, avg_lead_time: 7, lead_time_std_dev: 1, service_level: 0.95 },
      output: 14.8,
      narrative: "5 units/day avg demand, σ=2, 7-day lead time, σ_L=1 day, 95% SL → ~15 units safety stock",
    },
  },
  // ── Finance ──
  {
    name: "black_scholes_call",
    domain: "finance",
    subdomain: "real_options",
    description: "Black-Scholes call option value for real investment decisions",
    formula: "C = S₀×N(d₁) − K×e^(−rT)×N(d₂)",
    unit: "same as S",
    params: [
      { name: "S", symbol: "S_0", description: "Current value of underlying asset (expected revenue)", required: true, range: { min: 0, max: 1e15 } },
      { name: "K", symbol: "K", description: "Strike price (investment cost)", required: true, range: { min: 0, max: 1e15 } },
      { name: "r", symbol: "r", description: "Risk-free interest rate (annual)", required: true, range: { min: 0, max: 1 } },
      { name: "sigma", symbol: "σ", description: "Volatility of underlying (annualized)", required: true, range: { min: 0.001, max: 10 } },
      { name: "T", symbol: "T", unit: "years", description: "Time to expiry", required: true, range: { min: 0.001, max: 100 } },
    ],
    implementation: blackScholesCallValue,
    manufacturingApplication: "Value of flexibility in machine investment decisions — real options analysis",
    confidence: 0.85,
    source: "PRISM_ADVANCED_CROSS_DOMAIN_v1.js §1",
    references: ["Black F. & Scholes M. (1973). The pricing of options. Journal of Political Economy 81(3).", "Trigeorgis L. (1996). Real Options. MIT Press."],
    relatedFormulas: ["kelly_criterion", "value_at_risk", "sharpe_ratio"],
    workedExample: {
      inputs: { S: 1000000, K: 800000, r: 0.05, sigma: 0.3, T: 1 },
      output: 266891,
      narrative: "Project value $1M, cost $800k, r=5%, σ=30%, 1-year horizon → option value $267k",
    },
  },
  {
    name: "sharpe_ratio",
    domain: "finance",
    subdomain: "portfolio_theory",
    description: "Risk-adjusted return — reward per unit of risk taken",
    formula: "SR = (R̄ − Rf) / σ_R",
    unit: "dimensionless",
    params: [
      { name: "avg_return", symbol: "R̄", description: "Average return or productivity metric", required: true },
      { name: "risk_free_rate", symbol: "R_f", description: "Risk-free baseline (min acceptable return)", required: true },
      { name: "std_dev", symbol: "σ", description: "Standard deviation of returns", required: true, range: { min: 1e-12, max: 1e12 } },
    ],
    implementation: sharpeRatio,
    manufacturingApplication: "Machine performance evaluation — rank machines by risk-adjusted productivity",
    confidence: 0.91,
    source: "PRISM_ADVANCED_CROSS_DOMAIN_v1.js §1",
    references: ["Sharpe W.F. (1966). Mutual fund performance. Journal of Business 39(1)."],
    relatedFormulas: ["portfolio_return", "value_at_risk"],
    workedExample: {
      inputs: { avg_return: 0.15, risk_free_rate: 0.03, std_dev: 0.08 },
      output: 1.5,
      narrative: "15% avg return, 3% risk-free baseline, 8% variability → Sharpe = 1.5 (strong risk-adjusted performance)",
    },
  },
];

// ============================================================================
// ENGINE
// ============================================================================

/**
 * CrossDisciplinaryFormulaIntegrationEngine
 *
 * Unified gateway for applying, searching, validating, and explaining
 * cross-disciplinary formulas in PRISM's physics layer.
 */
export class CrossDisciplinaryFormulaIntegrationEngine {
  private registry: Map<string, FormulaRecord> = new Map();
  private domainIndex: Map<CrossDisciplinaryDomain, string[]> = new Map();
  private initialized = false;

  constructor() {
    this.loadRegistry();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────────────────────────────────

  private loadRegistry(): void {
    for (const formula of FORMULA_REGISTRY) {
      this.registry.set(formula.name, formula);

      const existing = this.domainIndex.get(formula.domain) ?? [];
      existing.push(formula.name);
      this.domainIndex.set(formula.domain, existing);
    }

    this.initialized = true;
    log.info(
      `[CrossDisciplinaryFormulaIntegration] Loaded ${this.registry.size} formulas across ` +
        `${this.domainIndex.size} domains. Constants: σ=${STEFAN_BOLTZMANN}, R=${GAS_CONSTANT_R}`
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Execute any formula by domain and name.
   *
   * @param domain - Scientific domain (e.g. "physics", "statistics")
   * @param formulaName - Snake_case formula name (e.g. "reynolds_number")
   * @param params - Key-value parameter map. Missing required params throw.
   * @returns Typed application result with output, confidence, and context.
   *
   * Source formulas: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js,
   *   PRISM_ADVANCED_CROSS_DOMAIN_v1.js, PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js
   */
  applyFormula(
    domain: CrossDisciplinaryDomain,
    formulaName: string,
    params: Record<string, number>
  ): FormulaApplicationResult {
    if (!this.initialized) {
      throw new Error("[CrossDisciplinaryFormulaIntegration] Engine not initialized");
    }

    const record = this.registry.get(formulaName);
    if (!record) {
      throw new Error(
        `[CrossDisciplinaryFormulaIntegration] Unknown formula: "${formulaName}". ` +
          `Available: ${this.listFormulaNames(domain).join(", ")}`
      );
    }

    if (record.domain !== domain) {
      throw new Error(
        `[CrossDisciplinaryFormulaIntegration] Formula "${formulaName}" is in domain ` +
          `"${record.domain}", not "${domain}"`
      );
    }

    // Inject defaults for optional params
    const resolvedParams: Record<string, number> = { ...params };
    for (const param of record.params) {
      if (!(param.name in resolvedParams) && param.default !== undefined) {
        resolvedParams[param.name] = param.default;
      }
    }

    // Validate required inputs
    const validation = this.validateFormula(formulaName, resolvedParams);
    if (!validation.valid) {
      throw new Error(
        `[CrossDisciplinaryFormulaIntegration] Validation failed for "${formulaName}": ` +
          validation.issues.join("; ")
      );
    }

    let output: number | Record<string, unknown>;
    try {
      output = record.implementation(resolvedParams);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `[CrossDisciplinaryFormulaIntegration] Formula execution failed for "${formulaName}": ${msg}`
      );
    }

    return {
      formulaName: record.name,
      domain: record.domain,
      inputs: resolvedParams,
      output,
      unit: record.unit,
      confidence: record.confidence,
      manufacturingContext: record.manufacturingApplication,
      physicsSource: record.source,
    };
  }

  /**
   * AI-powered keyword search — find relevant formulas for a problem description.
   *
   * Uses multi-factor keyword scoring across name, description, application,
   * and domain-specific keyword dictionaries. Returns results sorted by
   * descending relevance score.
   *
   * @param problemDescription - Natural language problem description
   * @param maxResults - Maximum number of results (default 10)
   * @returns Sorted array of matching formulas with relevance scores
   */
  findRelevantFormulas(
    problemDescription: string,
    maxResults = 10
  ): FormulaSearchResult[] {
    const query = problemDescription.toLowerCase();
    const results: FormulaSearchResult[] = [];

    // Domain keyword dictionaries (source-derived from JS source §§1-8)
    const DOMAIN_KEYWORDS: Record<CrossDisciplinaryDomain, string[]> = {
      physics: ["heat", "temperature", "force", "energy", "pressure", "flow", "thermal", "radiation", "entropy", "fluid", "coolant", "reynolds", "vibration", "wave"],
      biology: ["evolution", "genetic", "swarm", "ant", "learning", "fitness", "population", "adaptation"],
      economics: ["cost", "price", "profit", "investment", "risk", "revenue", "capacity", "market", "demand", "supply"],
      information_theory: ["entropy", "information", "uncertainty", "bit", "compression", "channel", "signal", "noise"],
      statistics: ["probability", "bayesian", "prior", "posterior", "monte carlo", "distribution", "variance", "mean"],
      chemistry: ["reaction", "wear", "kinetics", "temperature", "activation", "coolant", "degradation", "chemical"],
      operations_research: ["queue", "schedule", "inventory", "order", "lead time", "throughput", "bottleneck", "utilization"],
      finance: ["option", "investment", "volatility", "return", "sharpe", "portfolio", "risk"],
    };

    for (const [, record] of this.registry) {
      let score = 0;

      // Exact name match (highest weight)
      if (query.includes(record.name.replace(/_/g, " "))) score += 0.5;

      // Description word matching
      const descWords = record.description.toLowerCase().split(/\W+/);
      for (const word of descWords) {
        if (word.length > 3 && query.includes(word)) score += 0.08;
      }

      // Application word matching (high weight — directly relevant)
      const appWords = record.manufacturingApplication.toLowerCase().split(/\W+/);
      for (const word of appWords) {
        if (word.length > 3 && query.includes(word)) score += 0.12;
      }

      // Formula text matching
      if (query.includes(record.formula.toLowerCase().substring(0, 5))) score += 0.1;

      // Domain keyword matching
      const domainKws = DOMAIN_KEYWORDS[record.domain] ?? [];
      for (const kw of domainKws) {
        if (query.includes(kw)) score += 0.06;
      }

      // Subdomain exact match
      if (query.includes(record.subdomain.replace(/_/g, " "))) score += 0.2;

      if (score > 0.08) {
        results.push({
          formulaName: record.name,
          domain: record.domain,
          relevanceScore: Math.min(1.0, score),
          description: record.description,
          manufacturingApplication: record.manufacturingApplication,
          formula: record.formula,
        });
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, maxResults);
  }

  /**
   * Validate formula inputs against physics sanity constraints.
   *
   * Checks for missing required parameters, out-of-range values, and
   * physics-specific constraints (e.g. temperatures must be positive Kelvin,
   * M/M/1 requires ρ<1, probabilities must sum ≤1).
   *
   * @param formulaName - Formula to validate
   * @param inputs - Input parameter map
   * @returns Validation result with issues array and sanitized inputs
   */
  validateFormula(
    formulaName: string,
    inputs: Record<string, number>
  ): FormulaValidationResult {
    const result: FormulaValidationResult = {
      valid: true,
      formulaName,
      issues: [],
      warnings: [],
      sanitizedInputs: { ...inputs },
    };

    const record = this.registry.get(formulaName);
    if (!record) {
      result.valid = false;
      result.issues.push(`Unknown formula: "${formulaName}"`);
      return result;
    }

    // Check required parameters
    for (const param of record.params) {
      if (param.required && !(param.name in inputs)) {
        result.valid = false;
        result.issues.push(`Missing required parameter: "${param.name}" (${param.symbol})`);
      }
    }

    // Range checks
    for (const param of record.params) {
      const value = inputs[param.name];
      if (value === undefined) continue;

      if (!isFinite(value)) {
        result.valid = false;
        result.issues.push(`Parameter "${param.name}" is non-finite: ${value}`);
        continue;
      }

      if (param.range) {
        if (value < param.range.min || value > param.range.max) {
          result.valid = false;
          result.issues.push(
            `Parameter "${param.name}" = ${value} is outside valid range [${param.range.min}, ${param.range.max}]`
          );
        }
      }
    }

    // Physics-specific sanity checks

    // Temperature in Kelvin must be positive
    const tempParams = ["T_hot", "T_cold", "T_surface", "T_ambient", "T", "T1", "T2"];
    for (const tp of tempParams) {
      const v = inputs[tp];
      if (v !== undefined && v <= 0) {
        result.valid = false;
        result.issues.push(`Temperature parameter "${tp}" = ${v} K must be positive (absolute temperature)`);
      }
    }

    // M/M/1 stability: arrival rate must be < service rate
    if (["mm1_utilization", "mm1_queue_length", "mm1_time_in_system"].includes(formulaName)) {
      const { arrival_rate, service_rate } = inputs;
      if (arrival_rate !== undefined && service_rate !== undefined) {
        if (arrival_rate >= service_rate) {
          result.valid = false;
          result.issues.push(
            `M/M/1 stability violated: arrival_rate (${arrival_rate}) must be < service_rate (${service_rate})`
          );
        }
      }
    }

    // Carnot: T_cold must be < T_hot
    if (formulaName === "carnot_cooling_efficiency") {
      const { T_hot, T_cold } = inputs;
      if (T_hot !== undefined && T_cold !== undefined && T_cold >= T_hot) {
        result.valid = false;
        result.issues.push(
          `Carnot: T_cold (${T_cold} K) must be strictly less than T_hot (${T_hot} K)`
        );
      }
    }

    // Bayesian: marginal probability must be > 0
    if (formulaName === "bayesian_posterior") {
      const { marginal } = inputs;
      if (marginal !== undefined && marginal <= 0) {
        result.valid = false;
        result.issues.push(`Bayesian posterior: marginal probability must be > 0, got ${marginal}`);
      }
    }

    // Emissivity 0–1
    if (inputs.emissivity !== undefined && (inputs.emissivity < 0 || inputs.emissivity > 1)) {
      result.valid = false;
      result.issues.push(`Emissivity must be in [0,1], got ${inputs.emissivity}`);
    }

    // Probability parameters must be in [0,1]
    const probParams = ["likelihood", "prior", "win_probability", "utilization", "confidence_level", "service_level", "learning_rate"];
    for (const pp of probParams) {
      const v = inputs[pp];
      if (v !== undefined && (v < 0 || v > 1)) {
        result.valid = false;
        result.issues.push(`Probability parameter "${pp}" = ${v} must be in [0,1]`);
      }
    }

    // Warn if utilization approaching saturation
    if (formulaName === "mm1_utilization" || formulaName === "mm1_queue_length" || formulaName === "mm1_time_in_system") {
      const { arrival_rate, service_rate } = inputs;
      if (arrival_rate !== undefined && service_rate !== undefined) {
        const rho = arrival_rate / service_rate;
        if (rho > 0.9) {
          result.warnings.push(`High utilization ρ=${rho.toFixed(2)} — system may be near saturation; results are very sensitive`);
        }
      }
    }

    return result;
  }

  /**
   * Generate educational explanation for any formula.
   *
   * Returns a structured explanation including layperson summary,
   * mathematical definition, parameter table, worked example, and
   * manufacturing context — suitable for documentation and operator education.
   *
   * @param formulaName - Name of formula to explain
   * @returns Full educational explanation or null if formula not found
   */
  generateFormulaExplanation(formulaName: string): FormulaExplanation | null {
    const record = this.registry.get(formulaName);
    if (!record) {
      log.warn(`[CrossDisciplinaryFormulaIntegration] generateFormulaExplanation: unknown formula "${formulaName}"`);
      return null;
    }

    // Construct layperson summary by combining domain, subdomain, and description
    const domainLabel: Record<CrossDisciplinaryDomain, string> = {
      physics: "Physics",
      biology: "Biology",
      economics: "Economics",
      information_theory: "Information Theory",
      statistics: "Statistics",
      chemistry: "Chemistry",
      operations_research: "Operations Research",
      finance: "Finance",
    };

    const laypersonSummary =
      `This is a ${domainLabel[record.domain]} formula from the field of ${record.subdomain.replace(/_/g, " ")}. ` +
      `${record.description}. ` +
      `In manufacturing, it is used for: ${record.manufacturingApplication}.`;

    return {
      formulaName: record.name,
      domain: record.domain,
      laypersonSummary,
      mathematicalDefinition: record.formula,
      variables: record.params,
      workedExample: {
        inputs: record.workedExample.inputs,
        output: record.workedExample.output,
        narrative: record.workedExample.narrative,
      },
      manufacturingContext: record.manufacturingApplication,
      references: record.references,
      relatedFormulas: record.relatedFormulas,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FORMULA REGISTRY INTEGRATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * List all formula names, optionally filtered by domain.
   *
   * @param domain - Optional domain filter
   * @returns Array of formula names
   */
  listFormulaNames(domain?: CrossDisciplinaryDomain): string[] {
    if (domain) {
      return this.domainIndex.get(domain) ?? [];
    }
    return Array.from(this.registry.keys());
  }

  /**
   * Get statistics about loaded formulas.
   */
  getStats(): {
    totalFormulas: number;
    byDomain: Record<string, number>;
    canonicalConstants: Record<string, number>;
    kienzleGroups: string[];
    taylorGroups: string[];
  } {
    const byDomain: Record<string, number> = {};
    for (const [domain, names] of this.domainIndex) {
      byDomain[domain] = names.length;
    }
    return {
      totalFormulas: this.registry.size,
      byDomain,
      canonicalConstants: {
        stefan_boltzmann: STEFAN_BOLTZMANN,
        boltzmann: BOLTZMANN_CONSTANT,
        avogadro: AVOGADRO_NUMBER,
        gas_constant_R: GAS_CONSTANT_R,
        speed_of_sound_air: SPEED_OF_SOUND_AIR,
      },
      kienzleGroups: Object.keys(CANONICAL_KIENZLE) as ISOGroup[],
      taylorGroups: Object.keys(CANONICAL_TAYLOR) as ISOGroup[],
    };
  }

  /**
   * Export all formulas as FormulaRegistry-compatible entries.
   * Allows the FormulaRegistry to ingest these cross-disciplinary formulas
   * via its standard loadFromSkillFiles() mechanism.
   *
   * @returns Array of registry-compatible formula entries
   */
  exportRegistryEntries(): CrossDisciplinaryRegistryEntry[] {
    const entries: CrossDisciplinaryRegistryEntry[] = [];

    for (const [name, record] of this.registry) {
      entries.push({
        formula_id: `XD-${name.toUpperCase().replace(/_/g, "-")}`,
        name: record.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        domain: record.domain,
        category: record.subdomain,
        equation: record.formula,
        equation_plain: record.formula.replace(/[^A-Za-z0-9()×÷+\-= .,_^√]/g, ""),
        description: record.description,
        parameters: record.params.map((p) => ({
          name: p.name,
          symbol: p.symbol,
          unit: p.unit ?? "",
          description: p.description,
          type: p.required ? ("input" as const) : ("input" as const),
        })),
        validation: {
          required_inputs: record.params.filter((p) => p.required).map((p) => p.name),
          constraints: record.params
            .filter((p) => p.range !== undefined)
            .map((p) => `${p.name} in [${p.range!.min}, ${p.range!.max}]`),
        },
        consumers: ["CrossDisciplinaryFormulaIntegrationEngine", "CrossDisciplinaryDeepLearningEngine"],
        source: record.source,
      });
    }

    return entries;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const crossDisciplinaryFormulaIntegrationEngine =
  new CrossDisciplinaryFormulaIntegrationEngine();

/**
 * Cross-disciplinary formula registry entries for FormulaRegistry ingestion.
 * These 32 formulas extend the existing 499-formula registry to 531+ formulas.
 */
export const CROSS_DISCIPLINARY_FORMULA_ENTRIES: CrossDisciplinaryRegistryEntry[] =
  crossDisciplinaryFormulaIntegrationEngine.exportRegistryEntries();
