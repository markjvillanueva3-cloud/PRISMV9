/**
 * PRISM MCP Server — Chance-Constrained Optimization Engine
 *
 * Stochastic optimization for manufacturing under uncertainty:
 * - Chance-constrained programming (CCP): P(g(x,ξ) ≤ 0) ≥ 1-α
 * - Robust optimization: min-max over ellipsoidal uncertainty sets
 * - Sample Average Approximation (SAA) with violation estimation
 *
 * Physics: Kienzle force, Taylor tool life, Brammertz roughness.
 *
 * @module ChanceConstrainedOptimizationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface ChanceConstrainedInput {
  variables: { name: string; min: number; max: number; initial?: number }[];
  objective: {
    type: "minimize" | "maximize";
    expression: "mrr" | "cost" | "cycle_time" | "custom";
    custom_weights?: Record<string, number>;
  };
  constraints: {
    name: string;
    type: "force" | "roughness" | "tool_life" | "power" | "custom";
    limit: number;
    probability: number;
    direction: "leq" | "geq";
  }[];
  uncertainties: {
    parameter: string;
    distribution: "normal" | "uniform" | "triangular";
    mean: number;
    std_or_range: number;
  }[];
  material: { iso_group: ISOGroup };
  tool: { diameter_mm: number; flute_count: number };
  method?: "deterministic_equivalent" | "saa" | "robust";
  saa_samples?: number;
  max_iterations?: number;
}

export interface ChanceConstrainedResult {
  optimal_values: Record<string, number>;
  objective_value: number;
  constraint_satisfaction: {
    name: string; violation_probability: number; satisfied: boolean; margin: number;
  }[];
  robust_margin: number;
  deterministic_vs_stochastic: {
    det_objective: number; stoch_objective: number; conservatism_pct: number;
  };
  sensitivity: { uncertainty: string; impact_on_objective: number; impact_on_feasibility: number }[];
  pareto_robustness?: { robustness_level: number; objective_value: number }[];
  recommendations: string[];
}

// ============================================================================
// MATERIAL DATA — Kienzle kc1.1 [N/mm²], mc exponent, Taylor C/n
// ============================================================================

const MAT_DATA: Record<ISOGroup, {
  kc11: number; mc: number; taylor_C: number; taylor_n: number;
  brammertz_k: number; roughness_exp: number;
}> = {
  P: { kc11: 1800, mc: 0.25, taylor_C: 300, taylor_n: 0.25, brammertz_k: 0.32, roughness_exp: 1.6 },
  M: { kc11: 2100, mc: 0.25, taylor_C: 180, taylor_n: 0.20, brammertz_k: 0.40, roughness_exp: 1.5 },
  K: { kc11: 1100, mc: 0.28, taylor_C: 400, taylor_n: 0.30, brammertz_k: 0.28, roughness_exp: 1.7 },
  N: { kc11: 700,  mc: 0.23, taylor_C: 600, taylor_n: 0.35, brammertz_k: 0.18, roughness_exp: 1.8 },
  S: { kc11: 2800, mc: 0.28, taylor_C: 80,  taylor_n: 0.15, brammertz_k: 0.50, roughness_exp: 1.4 },
  H: { kc11: 3200, mc: 0.30, taylor_C: 120, taylor_n: 0.12, brammertz_k: 0.55, roughness_exp: 1.3 },
};

// ============================================================================
// MATH UTILITIES
// ============================================================================

/** Probit function — Φ⁻¹(p) via Abramowitz & Stegun rational approximation */
function probit(p: number): number {
  if (p <= 0 || p >= 1) throw new Error(`probit: p must be in (0,1), got ${p}`);
  if (p < 0.5) return -probit(1 - p);
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}

/** Standard normal CDF Φ(x) via Horner approximation */
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function sampleDistribution(
  dist: ChanceConstrainedInput["uncertainties"][0], rng: () => number,
): number {
  const { distribution, mean, std_or_range } = dist;
  if (distribution === "normal") {
    const u1 = rng(), u2 = rng();
    return mean + std_or_range * Math.sqrt(-2 * Math.log(Math.max(u1, 1e-15))) * Math.cos(2 * Math.PI * u2);
  }
  if (distribution === "uniform") return mean - std_or_range + 2 * std_or_range * rng();
  // triangular: mode = mean
  const u = rng();
  const a = mean - std_or_range, b = mean + std_or_range, c = mean;
  const fc = (c - a) / (b - a);
  return u < fc
    ? a + Math.sqrt(u * (b - a) * (c - a))
    : b - Math.sqrt((1 - u) * (b - a) * (b - c));
}

function stdOfDist(d: ChanceConstrainedInput["uncertainties"][0]): number {
  if (d.distribution === "normal") return d.std_or_range;
  if (d.distribution === "uniform") return d.std_or_range / Math.sqrt(3);
  return d.std_or_range / Math.sqrt(6); // triangular
}

// ============================================================================
// PHYSICS MODELS
// ============================================================================

function kienzleForce(vc: number, fz: number, ap: number, ae: number, z: number, mat: typeof MAT_DATA.P): AtomicValue<number> {
  const h = Math.max(fz, 0.01);
  const Kc = mat.kc11 * Math.pow(h, -mat.mc);
  const n = (vc * 1000) / (Math.PI * 12); // approximate RPM for generic calc
  const F = Kc * ap * ae * fz * z * (n / 60) / (vc > 0 ? (vc * 1000 / 60) : 1);
  // simplified: Fc ≈ Kc × b × h where b=ap, h=fz
  const Fc = Kc * ap * fz;
  return { value: Fc, unit: "N", formula: "Kienzle: Kc1.1×h^(-mc)×ap×fz" };
}

function taylorToolLife(vc: number, mat: typeof MAT_DATA.P): AtomicValue<number> {
  const T = mat.taylor_C * Math.pow(vc > 0 ? vc : 1, -1 / mat.taylor_n);
  return { value: T, unit: "min", formula: "Taylor: T=C×Vc^(-1/n)" };
}

function brammertzRoughness(fz: number, re: number, mat: typeof MAT_DATA.P): AtomicValue<number> {
  const rn = Math.max(re, 0.4);
  const Ra = mat.brammertz_k * Math.pow(fz * 1000, mat.roughness_exp) / (8 * rn);
  return { value: Math.max(Ra, 0.05), unit: "µm", formula: "Brammertz: k×fz^exp/(8×re)" };
}

function cuttingPower(Fc: number, vc: number): AtomicValue<number> {
  return { value: (Fc * vc) / (60 * 1000 * 0.85), unit: "kW", formula: "Pc=Fc×Vc/(60000×η)" };
}

function mrr(vc: number, fz: number, ap: number, ae: number, z: number, d: number): number {
  const n = (vc * 1000) / (Math.PI * d);
  return ap * ae * fz * z * n; // mm³/min
}

// ============================================================================
// CONSTRAINT EVALUATORS
// ============================================================================

type VarMap = Record<string, number>;

function evalConstraint(
  c: ChanceConstrainedInput["constraints"][0],
  vars: VarMap, mat: typeof MAT_DATA.P, tool: ChanceConstrainedInput["tool"],
): { value: number; limit: number; margin: number } {
  const vc = vars["vc"] ?? vars["speed"] ?? 150;
  const fz = vars["fz"] ?? vars["feed"] ?? 0.1;
  const ap = vars["ap"] ?? vars["depth"] ?? 2;
  const ae = vars["ae"] ?? vars["width"] ?? tool.diameter_mm * 0.5;
  const re = tool.diameter_mm > 10 ? 0.8 : 0.4;

  let value = 0;
  if (c.type === "force") value = kienzleForce(vc, fz, ap, ae, tool.flute_count, mat).value;
  else if (c.type === "roughness") value = brammertzRoughness(fz, re, mat).value;
  else if (c.type === "tool_life") value = taylorToolLife(vc, mat).value;
  else if (c.type === "power") value = cuttingPower(kienzleForce(vc, fz, ap, ae, tool.flute_count, mat).value, vc).value;
  else value = vc * fz * ap; // custom fallback

  const margin = c.direction === "leq" ? c.limit - value : value - c.limit;
  return { value, limit: c.limit, margin };
}

function evalObjective(vars: VarMap, input: ChanceConstrainedInput): number {
  const vc = vars["vc"] ?? vars["speed"] ?? 150;
  const fz = vars["fz"] ?? vars["feed"] ?? 0.1;
  const ap = vars["ap"] ?? vars["depth"] ?? 2;
  const ae = vars["ae"] ?? vars["width"] ?? input.tool.diameter_mm * 0.5;
  const mat = MAT_DATA[input.material.iso_group];

  if (input.objective.expression === "mrr") return mrr(vc, fz, ap, ae, input.tool.flute_count, input.tool.diameter_mm);
  if (input.objective.expression === "cost") {
    const T = taylorToolLife(vc, mat).value;
    const toolCostPerMin = 0.5;
    const machCostPerMin = 1.2;
    const vol = 1000; // mm³ target
    const time = vol / Math.max(mrr(vc, fz, ap, ae, input.tool.flute_count, input.tool.diameter_mm), 1);
    return machCostPerMin * time + toolCostPerMin * (time / Math.max(T, 0.1));
  }
  if (input.objective.expression === "cycle_time") {
    return 1000 / Math.max(mrr(vc, fz, ap, ae, input.tool.flute_count, input.tool.diameter_mm), 1);
  }
  // custom: weighted sum
  const w = input.objective.custom_weights ?? {};
  let s = 0;
  for (const [k, wt] of Object.entries(w)) s += (vars[k] ?? 0) * wt;
  return s;
}

// ============================================================================
// SOLVER CORE
// ============================================================================

export class ChanceConstrainedOptimizationEngine {
  /**
   * Run chance-constrained optimization.
   * Selects method automatically if not specified:
   *   - No uncertainties → deterministic_equivalent
   *   - Few constraints → deterministic_equivalent (fast)
   *   - Many constraints or non-normal → saa
   */
  optimize(input: ChanceConstrainedInput): ChanceConstrainedResult {
    const method = input.method
      ?? (input.uncertainties.some(u => u.distribution !== "normal") ? "saa" : "deterministic_equivalent");
    const mat = MAT_DATA[input.material.iso_group];
    const maxIter = input.max_iterations ?? 200;

    // --- Deterministic baseline ---
    const detResult = this.solveProjectedGradient(input, mat, maxIter, false);

    // --- Stochastic solve ---
    let stochResult: { vars: VarMap; obj: number };
    if (method === "deterministic_equivalent") {
      stochResult = this.solveDeterministicEquivalent(input, mat, maxIter);
    } else if (method === "robust") {
      stochResult = this.solveRobust(input, mat, maxIter);
    } else {
      stochResult = this.solveSAA(input, mat, maxIter);
    }

    // --- Evaluate constraints at stochastic optimum ---
    const satisfaction = this.evaluateConstraintSatisfaction(input, stochResult.vars, mat);

    // --- Sensitivity analysis ---
    const sensitivity = this.sensitivityAnalysis(input, stochResult.vars, mat);

    // --- Robust margin: minimum slack across all constraints ---
    const robustMargin = satisfaction.length > 0
      ? Math.min(...satisfaction.map(s => s.margin)) : Infinity;

    // --- Pareto robustness curve ---
    const pareto = this.paretoRobustness(input, mat, maxIter);

    // --- Recommendations ---
    const recs = this.generateRecommendations(satisfaction, sensitivity, stochResult, detResult, input);

    const stochObj = input.objective.type === "maximize" ? stochResult.obj : stochResult.obj;
    const detObj = input.objective.type === "maximize" ? detResult.obj : detResult.obj;
    const conservatism = detObj !== 0 ? Math.abs(stochObj - detObj) / Math.abs(detObj) * 100 : 0;

    return {
      optimal_values: stochResult.vars,
      objective_value: stochResult.obj,
      constraint_satisfaction: satisfaction,
      robust_margin: robustMargin,
      deterministic_vs_stochastic: {
        det_objective: detResult.obj,
        stoch_objective: stochObj,
        conservatism_pct: Math.round(conservatism * 100) / 100,
      },
      sensitivity,
      pareto_robustness: pareto,
      recommendations: recs,
    };
  }

  // ---------- Projected gradient descent (deterministic core) ----------
  private solveProjectedGradient(
    input: ChanceConstrainedInput, mat: typeof MAT_DATA.P, maxIter: number, penalizeUncertainty: boolean,
  ): { vars: VarMap; obj: number } {
    const vars: VarMap = {};
    for (const v of input.variables) vars[v.name] = v.initial ?? (v.min + v.max) / 2;

    const sign = input.objective.type === "maximize" ? -1 : 1;
    let lr = 0.01;

    for (let iter = 0; iter < maxIter; iter++) {
      const obj0 = evalObjective(vars, input);
      // Numerical gradient
      for (const v of input.variables) {
        const eps = Math.max(Math.abs(vars[v.name]) * 1e-4, 1e-8);
        vars[v.name] += eps;
        const objP = evalObjective(vars, input);
        vars[v.name] -= eps;
        const grad = (objP - obj0) / eps;

        // Penalty for constraint violations
        let penalty = 0;
        for (const c of input.constraints) {
          const ev = evalConstraint(c, vars, mat, input.tool);
          if (ev.margin < 0) penalty += -ev.margin * 10;
        }

        vars[v.name] -= sign * lr * (grad + penalty * sign);
        vars[v.name] = clamp(vars[v.name], v.min, v.max);
      }
      lr *= 0.998; // decay
    }
    return { vars: { ...vars }, obj: evalObjective(vars, input) };
  }

  // ---------- Deterministic equivalent (CCP → det via probit) ----------
  private solveDeterministicEquivalent(
    input: ChanceConstrainedInput, mat: typeof MAT_DATA.P, maxIter: number,
  ): { vars: VarMap; obj: number } {
    // Tighten constraints: μ + Φ⁻¹(1-α)×σ ≤ limit  →  effective_limit = limit - Φ⁻¹(1-α)×σ
    const tightened = input.constraints.map(c => {
      const alpha = 1 - c.probability;
      const z_val = probit(1 - alpha); // e.g., 0.95 → z≈1.645
      // Find matching uncertainty for this constraint type
      const relatedUncert = input.uncertainties.find(u =>
        (c.type === "force" && (u.parameter === "kc11" || u.parameter === "ap" || u.parameter === "fz")) ||
        (c.type === "roughness" && (u.parameter === "fz" || u.parameter === "re")) ||
        (c.type === "tool_life" && (u.parameter === "vc" || u.parameter === "taylor_C")) ||
        (c.type === "power" && (u.parameter === "kc11" || u.parameter === "vc")) ||
        u.parameter === c.name,
      );
      const sigma = relatedUncert ? stdOfDist(relatedUncert) * c.limit * 0.1 : c.limit * 0.02;
      const shift = c.direction === "leq" ? -z_val * sigma : z_val * sigma;
      return { ...c, limit: c.limit + shift };
    });

    const modifiedInput = { ...input, constraints: tightened };
    return this.solveProjectedGradient(modifiedInput, mat, maxIter, true);
  }

  // ---------- Robust optimization — worst-case over ellipsoidal set ----------
  private solveRobust(
    input: ChanceConstrainedInput, mat: typeof MAT_DATA.P, maxIter: number,
  ): { vars: VarMap; obj: number } {
    // Γ = budget of uncertainty (default 2.0 → ~95% coverage)
    const gamma = 2.0;
    const worstCase = input.constraints.map(c => {
      const totalVar = input.uncertainties.reduce((acc, u) => {
        const s = stdOfDist(u);
        return acc + s * s;
      }, 0);
      const norm = Math.sqrt(totalVar);
      const shift = c.direction === "leq" ? -gamma * norm * c.limit * 0.05 : gamma * norm * c.limit * 0.05;
      return { ...c, limit: c.limit + shift };
    });
    return this.solveProjectedGradient({ ...input, constraints: worstCase }, mat, maxIter, true);
  }

  // ---------- Sample Average Approximation ----------
  private solveSAA(
    input: ChanceConstrainedInput, mat: typeof MAT_DATA.P, maxIter: number,
  ): { vars: VarMap; obj: number } {
    const N = input.saa_samples ?? 1000;
    const rng = seededRandom(42);

    // First solve deterministic
    const base = this.solveProjectedGradient(input, mat, maxIter, false);
    const vars = { ...base.vars };

    // Iterative tightening based on violation rates
    for (let round = 0; round < 5; round++) {
      for (const c of input.constraints) {
        let violations = 0;
        for (let s = 0; s < N; s++) {
          const perturbed = { ...vars };
          for (const u of input.uncertainties) {
            if (perturbed[u.parameter] !== undefined) {
              perturbed[u.parameter] += sampleDistribution(u, rng) - u.mean;
            }
          }
          const ev = evalConstraint(c, perturbed, mat, input.tool);
          if (ev.margin < 0) violations++;
        }
        const violRate = violations / N;
        if (violRate > (1 - c.probability)) {
          // Tighten: move variables conservatively
          for (const v of input.variables) {
            const dir = c.direction === "leq" ? -1 : 1;
            vars[v.name] = clamp(vars[v.name] + dir * (v.max - v.min) * 0.02, v.min, v.max);
          }
        }
      }
    }
    return { vars, obj: evalObjective(vars, input) };
  }

  // ---------- Constraint satisfaction evaluation via MC ----------
  private evaluateConstraintSatisfaction(
    input: ChanceConstrainedInput, vars: VarMap, mat: typeof MAT_DATA.P,
  ): ChanceConstrainedResult["constraint_satisfaction"] {
    const N = 2000;
    const rng = seededRandom(7);
    return input.constraints.map(c => {
      let violations = 0;
      for (let s = 0; s < N; s++) {
        const perturbed = { ...vars };
        for (const u of input.uncertainties) {
          if (perturbed[u.parameter] !== undefined) {
            perturbed[u.parameter] += sampleDistribution(u, rng) - u.mean;
          }
        }
        const ev = evalConstraint(c, perturbed, mat, input.tool);
        if (ev.margin < 0) violations++;
      }
      const violProb = violations / N;
      const nominalEv = evalConstraint(c, vars, mat, input.tool);
      return {
        name: c.name,
        violation_probability: Math.round(violProb * 10000) / 10000,
        satisfied: violProb <= (1 - c.probability),
        margin: Math.round(nominalEv.margin * 1000) / 1000,
      };
    });
  }

  // ---------- Sensitivity of each uncertainty ----------
  private sensitivityAnalysis(
    input: ChanceConstrainedInput, vars: VarMap, mat: typeof MAT_DATA.P,
  ): ChanceConstrainedResult["sensitivity"] {
    const baseObj = evalObjective(vars, input);
    return input.uncertainties.map(u => {
      const delta = stdOfDist(u);
      // Perturb +1σ
      const perturbed = { ...vars };
      if (perturbed[u.parameter] !== undefined) perturbed[u.parameter] += delta;
      const pertObj = evalObjective(perturbed, input);
      const objImpact = Math.abs(pertObj - baseObj) / Math.max(Math.abs(baseObj), 1e-10);

      // Feasibility impact: how many constraints flip
      let feasFlips = 0;
      for (const c of input.constraints) {
        const nomM = evalConstraint(c, vars, mat, input.tool).margin;
        const pertM = evalConstraint(c, perturbed, mat, input.tool).margin;
        if (nomM >= 0 && pertM < 0) feasFlips++;
      }
      return {
        uncertainty: u.parameter,
        impact_on_objective: Math.round(objImpact * 10000) / 10000,
        impact_on_feasibility: feasFlips / Math.max(input.constraints.length, 1),
      };
    });
  }

  // ---------- Pareto: robustness vs. objective ----------
  private paretoRobustness(
    input: ChanceConstrainedInput, mat: typeof MAT_DATA.P, maxIter: number,
  ): ChanceConstrainedResult["pareto_robustness"] {
    const levels = [0.80, 0.85, 0.90, 0.95, 0.99];
    return levels.map(level => {
      const scaled = {
        ...input,
        constraints: input.constraints.map(c => ({ ...c, probability: level })),
        max_iterations: Math.min(maxIter, 80),
      };
      const r = this.solveDeterministicEquivalent(scaled, mat, scaled.max_iterations!);
      return { robustness_level: level, objective_value: Math.round(r.obj * 1000) / 1000 };
    });
  }

  // ---------- Recommendations ----------
  private generateRecommendations(
    satisfaction: ChanceConstrainedResult["constraint_satisfaction"],
    sensitivity: ChanceConstrainedResult["sensitivity"],
    stoch: { vars: VarMap; obj: number },
    det: { vars: VarMap; obj: number },
    input: ChanceConstrainedInput,
  ): string[] {
    const recs: string[] = [];
    const violated = satisfaction.filter(s => !s.satisfied);
    if (violated.length > 0) {
      recs.push(`${violated.length} constraint(s) not met at required probability: ${violated.map(v => v.name).join(", ")}. Consider relaxing limits or reducing uncertainty.`);
    }
    const highImpact = sensitivity.filter(s => s.impact_on_objective > 0.1);
    if (highImpact.length > 0) {
      recs.push(`High-impact uncertainties: ${highImpact.map(h => h.uncertainty).join(", ")}. Tighter control on these parameters yields the most objective improvement.`);
    }
    const conservatism = det.obj !== 0 ? Math.abs(stoch.obj - det.obj) / Math.abs(det.obj) * 100 : 0;
    if (conservatism > 15) {
      recs.push(`Stochastic solution is ${conservatism.toFixed(1)}% more conservative than deterministic. Consider whether reliability requirements can be relaxed.`);
    }
    if (recs.length === 0) recs.push("All constraints satisfied within probability bounds. Solution is feasible and robust.");
    return recs;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const chanceConstrainedOptimizationEngine = new ChanceConstrainedOptimizationEngine();
