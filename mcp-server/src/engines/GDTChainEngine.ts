/**
 * R18-MS1: GD&T Tolerance Chain Engine
 *
 * Advanced tolerance chain analysis extending ToleranceEngine (R15):
 *   - gdt_chain_montecarlo: Monte Carlo simulation of tolerance chains (N samples)
 *   - gdt_chain_allocate:   Optimal tolerance allocation across contributors
 *   - gdt_chain_sensitivity: Sensitivity analysis — contribution percentage per dimension
 *   - gdt_chain_2d:         2D tolerance chain (parallel + perpendicular components)
 *
 * Builds on: ToleranceEngine.gdtStackUp (worst-case + RSS), R16 sensitivity analysis patterns
 * References: ASME Y14.5-2018, ISO 8015, Dimensioning and Tolerancing Handbook (Drake)
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface ChainDimension {
  name: string;
  nominal_mm: number;
  tolerance_plus_mm: number;
  tolerance_minus_mm: number;  // typically negative
  distribution?: "uniform" | "normal" | "triangular";  // default: normal
  sigma_factor?: number;  // how many sigma = tolerance band (default: 3 = 99.73%)
  cost_per_mm?: number;   // cost to tighten by 1mm (for allocation)
  direction?: number;     // +1 or -1 in chain (default: +1)
}

interface MonteCarloResult {
  action: "gdt_chain_montecarlo";
  n_samples: number;
  closing_dimension: {
    nominal_mm: number;
    mean_mm: number;
    std_mm: number;
    min_mm: number;
    max_mm: number;
    p5_mm: number;
    p95_mm: number;
    p01_mm: number;
    p99_mm: number;
  };
  worst_case: { min_mm: number; max_mm: number; range_mm: number };
  rss: { tolerance_mm: number };
  conformance: {
    target_min_mm?: number;
    target_max_mm?: number;
    pct_in_spec: number;
    ppm_out_of_spec: number;
    sigma_level: number;
  };
  histogram: Array<{ bin_center_mm: number; count: number }>;
  dimensions: number;
}

interface AllocateResult {
  action: "gdt_chain_allocate";
  method: "equal" | "proportional" | "cost_weighted" | "precision_weighted";
  target_assembly_tolerance_mm: number;
  original_rss_mm: number;
  allocated: Array<{
    name: string;
    original_tolerance_mm: number;
    allocated_tolerance_mm: number;
    change_pct: number;
    cost_impact?: number;
  }>;
  achieved_rss_mm: number;
  feasible: boolean;
  total_cost_delta?: number;
}

interface SensitivityResult {
  action: "gdt_chain_sensitivity";
  contributions: Array<{
    name: string;
    nominal_mm: number;
    tolerance_mm: number;
    variance_contribution_pct: number;
    rank: number;
    cumulative_pct: number;
  }>;
  closing_rss_mm: number;
  top_contributor: string;
  pareto_80: string[];  // dimensions covering 80% of variance
}

interface Chain2DResult {
  action: "gdt_chain_2d";
  x_chain: { nominal_mm: number; wc_min_mm: number; wc_max_mm: number; rss_mm: number };
  y_chain: { nominal_mm: number; wc_min_mm: number; wc_max_mm: number; rss_mm: number };
  resultant: {
    nominal_mm: number;
    wc_max_mm: number;
    rss_mm: number;
    angle_deg: number;
  };
  combined_conformance: {
    target_radius_mm?: number;
    pct_in_spec: number;
    n_samples: number;
  };
}

// ============================================================================
// RANDOM NUMBER GENERATION
// ============================================================================

/** Seeded LCG for reproducible Monte Carlo */
class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed & 0x7fffffff;
    if (this.state === 0) this.state = 1;
  }
  next(): number {
    // Numerical Recipes LCG
    this.state = (this.state * 1664525 + 1013904223) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }
  /** Box-Muller normal(0,1) */
  nextNormal(): number {
    const u1 = Math.max(this.next(), 1e-10);
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  /** Triangular distribution on [a, b] with mode c */
  nextTriangular(a: number, b: number, c: number): number {
    const u = this.next();
    const fc = (c - a) / (b - a);
    return u < fc
      ? a + Math.sqrt(u * (b - a) * (c - a))
      : b - Math.sqrt((1 - u) * (b - a) * (b - c));
  }
}

// ============================================================================
// ACTION: gdt_chain_montecarlo
// ============================================================================

function monteCarloChain(params: Record<string, unknown>): MonteCarloResult {
  const dims = (params.dimensions ?? params.dims ?? []) as ChainDimension[];
  if (!dims.length) throw new Error("[GDTChainEngine] gdt_chain_montecarlo: dimensions required");

  const N = Math.min(Math.max(Number(params.n_samples ?? 10000), 100), 1_000_000);
  const seed = Number(params.seed ?? 42);
  const targetMin = params.target_min_mm != null ? Number(params.target_min_mm) : undefined;
  const targetMax = params.target_max_mm != null ? Number(params.target_max_mm) : undefined;

  const rng = new SeededRNG(seed);

  // Compute nominal closing dimension
  let nominalClosing = 0;
  for (const d of dims) {
    const dir = d.direction ?? 1;
    nominalClosing += dir * d.nominal_mm;
  }

  // Worst case
  let wcMin = 0, wcMax = 0;
  for (const d of dims) {
    const dir = d.direction ?? 1;
    const lo = d.nominal_mm + d.tolerance_minus_mm;
    const hi = d.nominal_mm + d.tolerance_plus_mm;
    if (dir > 0) { wcMin += lo; wcMax += hi; }
    else { wcMin -= hi; wcMax -= lo; }
  }

  // RSS
  let rssVar = 0;
  for (const d of dims) {
    const band = d.tolerance_plus_mm - d.tolerance_minus_mm;
    rssVar += (band / 2) ** 2;
  }
  const rssTol = Math.sqrt(rssVar);

  // Monte Carlo samples
  const samples = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let val = 0;
    for (const d of dims) {
      const dir = d.direction ?? 1;
      const dist = d.distribution ?? "normal";
      const lo = d.nominal_mm + d.tolerance_minus_mm;
      const hi = d.nominal_mm + d.tolerance_plus_mm;
      const mid = d.nominal_mm + (d.tolerance_plus_mm + d.tolerance_minus_mm) / 2;
      let sample: number;

      if (dist === "uniform") {
        sample = lo + rng.next() * (hi - lo);
      } else if (dist === "triangular") {
        sample = rng.nextTriangular(lo, hi, mid);
      } else {
        // Normal: sigma_factor sigma = half-band
        const sf = d.sigma_factor ?? 3;
        const halfBand = (hi - lo) / 2;
        const sigma = halfBand / sf;
        sample = mid + rng.nextNormal() * sigma;
        // Clamp to physical limits
        sample = Math.max(lo, Math.min(hi, sample));
      }
      val += dir * sample;
    }
    samples[i] = val;
  }

  // Statistics
  let sum = 0, sumSq = 0, sMin = Infinity, sMax = -Infinity;
  for (let i = 0; i < N; i++) {
    sum += samples[i];
    sumSq += samples[i] ** 2;
    if (samples[i] < sMin) sMin = samples[i];
    if (samples[i] > sMax) sMax = samples[i];
  }
  const mean = sum / N;
  const stddev = Math.sqrt(sumSq / N - mean ** 2);

  // Sort for percentiles
  const sorted = Array.from(samples).sort((a, b) => a - b);
  const pctile = (p: number) => sorted[Math.min(Math.floor(p / 100 * N), N - 1)];

  // Conformance
  let inSpec = 0;
  for (let i = 0; i < N; i++) {
    const ok = (targetMin == null || samples[i] >= targetMin) &&
               (targetMax == null || samples[i] <= targetMax);
    if (ok) inSpec++;
  }
  const pctInSpec = (inSpec / N) * 100;
  const ppmOut = Math.round((1 - inSpec / N) * 1_000_000);
  // Sigma level approximation from ppm
  const sigmaLevel = ppmOut === 0 ? 6.0 : Math.max(0, inversePhi(1 - ppmOut / 2_000_000) + 1.5);

  // Histogram (20 bins)
  const nBins = 20;
  const binWidth = (sMax - sMin) / nBins || 1;
  const bins = new Array(nBins).fill(0);
  for (let i = 0; i < N; i++) {
    const idx = Math.min(Math.floor((samples[i] - sMin) / binWidth), nBins - 1);
    bins[idx]++;
  }
  const histogram = bins.map((count, idx) => ({
    bin_center_mm: round6(sMin + (idx + 0.5) * binWidth),
    count,
  }));

  log.info(`[GDTChainEngine] Monte Carlo: ${dims.length} dims, N=${N}, mean=${mean.toFixed(4)}, std=${stddev.toFixed(4)}, conformance=${pctInSpec.toFixed(2)}%`);

  return {
    action: "gdt_chain_montecarlo",
    n_samples: N,
    closing_dimension: {
      nominal_mm: round6(nominalClosing),
      mean_mm: round6(mean),
      std_mm: round6(stddev),
      min_mm: round6(sMin),
      max_mm: round6(sMax),
      p5_mm: round6(pctile(5)),
      p95_mm: round6(pctile(95)),
      p01_mm: round6(pctile(1)),
      p99_mm: round6(pctile(99)),
    },
    worst_case: { min_mm: round6(wcMin), max_mm: round6(wcMax), range_mm: round6(wcMax - wcMin) },
    rss: { tolerance_mm: round6(rssTol) },
    conformance: {
      target_min_mm: targetMin,
      target_max_mm: targetMax,
      pct_in_spec: round6(pctInSpec),
      ppm_out_of_spec: ppmOut,
      sigma_level: round6(sigmaLevel),
    },
    histogram,
    dimensions: dims.length,
  };
}

// ============================================================================
// ACTION: gdt_chain_allocate
// ============================================================================

function allocateTolerance(params: Record<string, unknown>): AllocateResult {
  const dims = (params.dimensions ?? params.dims ?? []) as ChainDimension[];
  if (!dims.length) throw new Error("[GDTChainEngine] gdt_chain_allocate: dimensions required");

  const targetTol = Number(params.target_assembly_tolerance_mm ?? params.target_tolerance_mm);
  if (!targetTol || targetTol <= 0) throw new Error("[GDTChainEngine] gdt_chain_allocate: target_assembly_tolerance_mm required (> 0)");

  const method = (params.method ?? "proportional") as AllocateResult["method"];

  // Current RSS
  const bands = dims.map(d => d.tolerance_plus_mm - d.tolerance_minus_mm);
  const currentRSS = Math.sqrt(bands.reduce((s, b) => s + (b / 2) ** 2, 0));

  // Target half-tolerance for RSS
  const targetHalf = targetTol / 2;
  const scaleFactor = targetHalf / currentRSS;

  const allocated: AllocateResult["allocated"] = [];
  let totalCostDelta = 0;
  let hasCost = dims.some(d => d.cost_per_mm != null);

  if (method === "equal") {
    // Equal tolerance for all: each gets targetHalf / sqrt(n)
    const equalHalf = targetHalf / Math.sqrt(dims.length);
    for (let i = 0; i < dims.length; i++) {
      const origBand = bands[i];
      const newBand = equalHalf * 2;
      const changePct = ((newBand - origBand) / origBand) * 100;
      const costImpact = dims[i].cost_per_mm != null
        ? dims[i].cost_per_mm! * Math.max(0, origBand - newBand)
        : undefined;
      if (costImpact) totalCostDelta += costImpact;
      allocated.push({
        name: dims[i].name,
        original_tolerance_mm: round6(origBand),
        allocated_tolerance_mm: round6(newBand),
        change_pct: round6(changePct),
        cost_impact: costImpact != null ? round6(costImpact) : undefined,
      });
    }
  } else if (method === "proportional") {
    // Scale each proportionally to maintain relative ratios
    for (let i = 0; i < dims.length; i++) {
      const origBand = bands[i];
      const newBand = origBand * scaleFactor;
      const changePct = ((newBand - origBand) / origBand) * 100;
      const costImpact = dims[i].cost_per_mm != null
        ? dims[i].cost_per_mm! * Math.max(0, origBand - newBand)
        : undefined;
      if (costImpact) totalCostDelta += costImpact;
      allocated.push({
        name: dims[i].name,
        original_tolerance_mm: round6(origBand),
        allocated_tolerance_mm: round6(newBand),
        change_pct: round6(changePct),
        cost_impact: costImpact != null ? round6(costImpact) : undefined,
      });
    }
  } else if (method === "cost_weighted") {
    // Minimize cost: tighten cheapest dimensions more, expensive ones less
    // Using Lagrange multiplier approach: t_i ∝ sqrt(c_i)
    const costs = dims.map(d => d.cost_per_mm ?? 1);
    const sqrtCosts = costs.map(c => Math.sqrt(c));
    const sumSqrtCosts = sqrtCosts.reduce((a, b) => a + b, 0);
    for (let i = 0; i < dims.length; i++) {
      const origBand = bands[i];
      const weight = sqrtCosts[i] / sumSqrtCosts;
      const newHalf = targetHalf * weight * Math.sqrt(dims.length);
      const newBand = newHalf * 2;
      const changePct = ((newBand - origBand) / origBand) * 100;
      const costImpact = costs[i] * Math.max(0, origBand - newBand);
      totalCostDelta += costImpact;
      allocated.push({
        name: dims[i].name,
        original_tolerance_mm: round6(origBand),
        allocated_tolerance_mm: round6(newBand),
        change_pct: round6(changePct),
        cost_impact: round6(costImpact),
      });
    }
  } else {
    // precision_weighted: tighten dimensions with larger current tolerance more
    const totalBand = bands.reduce((a, b) => a + b, 0);
    for (let i = 0; i < dims.length; i++) {
      const origBand = bands[i];
      // Inverse weight: larger tolerances get tightened more
      const invWeight = (totalBand - origBand) / (totalBand * (dims.length - 1));
      const newHalf = targetHalf * invWeight * Math.sqrt(dims.length);
      const newBand = Math.max(newHalf * 2, 0.001); // minimum 1μm
      const changePct = ((newBand - origBand) / origBand) * 100;
      const costImpact = dims[i].cost_per_mm != null
        ? dims[i].cost_per_mm! * Math.max(0, origBand - newBand)
        : undefined;
      if (costImpact) totalCostDelta += costImpact;
      allocated.push({
        name: dims[i].name,
        original_tolerance_mm: round6(origBand),
        allocated_tolerance_mm: round6(newBand),
        change_pct: round6(changePct),
        cost_impact: costImpact != null ? round6(costImpact) : undefined,
      });
    }
  }

  // Verify achieved RSS
  const achievedRSS = Math.sqrt(allocated.reduce((s, a) => s + (a.allocated_tolerance_mm / 2) ** 2, 0));
  const feasible = allocated.every(a => a.allocated_tolerance_mm > 0);

  log.info(`[GDTChainEngine] Allocate: ${method}, target=${targetTol}, achieved RSS=${achievedRSS.toFixed(4)}, feasible=${feasible}`);

  return {
    action: "gdt_chain_allocate",
    method,
    target_assembly_tolerance_mm: targetTol,
    original_rss_mm: round6(currentRSS),
    allocated,
    achieved_rss_mm: round6(achievedRSS),
    feasible,
    total_cost_delta: hasCost ? round6(totalCostDelta) : undefined,
  };
}

// ============================================================================
// ACTION: gdt_chain_sensitivity
// ============================================================================

function sensitivityAnalysis(params: Record<string, unknown>): SensitivityResult {
  const dims = (params.dimensions ?? params.dims ?? []) as ChainDimension[];
  if (!dims.length) throw new Error("[GDTChainEngine] gdt_chain_sensitivity: dimensions required");

  // Variance contribution: each dim's variance / total variance
  const variances = dims.map(d => {
    const band = d.tolerance_plus_mm - d.tolerance_minus_mm;
    return (band / 2) ** 2;
  });
  const totalVar = variances.reduce((a, b) => a + b, 0);
  const closingRSS = Math.sqrt(totalVar);

  const contributions = dims.map((d, i) => ({
    name: d.name,
    nominal_mm: d.nominal_mm,
    tolerance_mm: round6(d.tolerance_plus_mm - d.tolerance_minus_mm),
    variance_contribution_pct: round6(totalVar > 0 ? (variances[i] / totalVar) * 100 : 0),
    rank: 0,
    cumulative_pct: 0,
  }));

  // Sort by contribution descending
  contributions.sort((a, b) => b.variance_contribution_pct - a.variance_contribution_pct);
  let cumulative = 0;
  for (let i = 0; i < contributions.length; i++) {
    contributions[i].rank = i + 1;
    cumulative += contributions[i].variance_contribution_pct;
    contributions[i].cumulative_pct = round6(cumulative);
  }

  // Pareto 80%: dimensions covering 80% of variance
  const pareto80 = contributions
    .filter(c => c.cumulative_pct - c.variance_contribution_pct < 80)
    .map(c => c.name);

  log.info(`[GDTChainEngine] Sensitivity: ${dims.length} dims, top=${contributions[0]?.name} (${contributions[0]?.variance_contribution_pct}%), pareto80=[${pareto80.join(",")}]`);

  return {
    action: "gdt_chain_sensitivity",
    contributions,
    closing_rss_mm: round6(closingRSS),
    top_contributor: contributions[0]?.name ?? "none",
    pareto_80: pareto80,
  };
}

// ============================================================================
// ACTION: gdt_chain_2d
// ============================================================================

interface Chain2DDimension extends ChainDimension {
  axis: "x" | "y";
}

function chain2D(params: Record<string, unknown>): Chain2DResult {
  const dims = (params.dimensions ?? params.dims ?? []) as Chain2DDimension[];
  if (!dims.length) throw new Error("[GDTChainEngine] gdt_chain_2d: dimensions with axis required");

  const xDims = dims.filter(d => d.axis === "x");
  const yDims = dims.filter(d => d.axis === "y");

  function chainStats(chainDims: ChainDimension[]) {
    let nom = 0, wcMin = 0, wcMax = 0, rssVar = 0;
    for (const d of chainDims) {
      const dir = d.direction ?? 1;
      nom += dir * d.nominal_mm;
      const lo = d.nominal_mm + d.tolerance_minus_mm;
      const hi = d.nominal_mm + d.tolerance_plus_mm;
      if (dir > 0) { wcMin += lo; wcMax += hi; }
      else { wcMin -= hi; wcMax -= lo; }
      const band = d.tolerance_plus_mm - d.tolerance_minus_mm;
      rssVar += (band / 2) ** 2;
    }
    return { nominal_mm: round6(nom), wc_min_mm: round6(wcMin), wc_max_mm: round6(wcMax), rss_mm: round6(Math.sqrt(rssVar)) };
  }

  const xChain = chainStats(xDims);
  const yChain = chainStats(yDims);

  // Resultant vector
  const resNom = Math.sqrt(xChain.nominal_mm ** 2 + yChain.nominal_mm ** 2);
  const resWcMax = Math.sqrt((xChain.wc_max_mm - xChain.nominal_mm) ** 2 + (yChain.wc_max_mm - yChain.nominal_mm) ** 2);
  const resRSS = Math.sqrt(xChain.rss_mm ** 2 + yChain.rss_mm ** 2);
  const angle = Math.atan2(yChain.nominal_mm, xChain.nominal_mm) * 180 / Math.PI;

  // Monte Carlo for 2D conformance
  const N = Math.min(Number(params.n_samples ?? 10000), 100000);
  const targetRadius = params.target_radius_mm != null ? Number(params.target_radius_mm) : undefined;
  const rng = new SeededRNG(Number(params.seed ?? 42));

  let inSpec = 0;
  for (let i = 0; i < N; i++) {
    let xVal = 0, yVal = 0;
    for (const d of dims) {
      const dir = d.direction ?? 1;
      const lo = d.nominal_mm + d.tolerance_minus_mm;
      const hi = d.nominal_mm + d.tolerance_plus_mm;
      const mid = (lo + hi) / 2;
      const halfBand = (hi - lo) / 2;
      const sf = d.sigma_factor ?? 3;
      const sample = mid + rng.nextNormal() * (halfBand / sf);
      const clamped = Math.max(lo, Math.min(hi, sample));
      if (d.axis === "x") xVal += dir * clamped;
      else yVal += dir * clamped;
    }
    const dist = Math.sqrt((xVal - xChain.nominal_mm) ** 2 + (yVal - yChain.nominal_mm) ** 2);
    if (targetRadius == null || dist <= targetRadius) inSpec++;
  }

  log.info(`[GDTChainEngine] 2D chain: X=${xDims.length}, Y=${yDims.length}, resultant=${resNom.toFixed(4)}`);

  return {
    action: "gdt_chain_2d",
    x_chain: xChain,
    y_chain: yChain,
    resultant: {
      nominal_mm: round6(resNom),
      wc_max_mm: round6(resWcMax),
      rss_mm: round6(resRSS),
      angle_deg: round6(angle),
    },
    combined_conformance: {
      target_radius_mm: targetRadius,
      pct_in_spec: round6((inSpec / N) * 100),
      n_samples: N,
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/** Inverse standard normal CDF (Abramowitz & Stegun approximation) */
function inversePhi(p: number): number {
  if (p <= 0) return -6;
  if (p >= 1) return 6;
  if (p === 0.5) return 0;

  const a = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(a));
  // Rational approximation (Abramowitz & Stegun 26.2.23)
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  let x = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
  if (p < 0.5) x = -x;
  return x;
}

// ============================================================================
// DISPATCHER ENTRY
// ============================================================================

export function executeGDTChainAction(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "gdt_chain_montecarlo": return monteCarloChain(params);
    case "gdt_chain_allocate": return allocateTolerance(params);
    case "gdt_chain_sensitivity": return sensitivityAnalysis(params);
    case "gdt_chain_2d": return chain2D(params);
    default:
      throw new Error(`[GDTChainEngine] Unknown action: ${action}`);
  }
}
