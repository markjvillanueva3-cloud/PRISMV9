/**
 * CostQualityTradeoffEngine — R19-MS4
 *
 * Pareto optimization engine for cost vs quality tradeoffs in manufacturing.
 * Evaluates multiple process scenarios across cost and quality dimensions,
 * identifies Pareto-optimal solutions, and provides sensitivity analysis.
 *
 * Actions:
 *   cqt_pareto      — generate Pareto frontier of cost vs quality solutions
 *   cqt_optimize    — find optimal operating point given weights
 *   cqt_sensitivity — sensitivity of cost/quality to parameter changes
 *   cqt_scenario    — compare named scenarios with full cost/quality breakdown
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface CostBreakdown {
  tooling_cost_per_part: number;
  machine_cost_per_part: number;
  material_cost_per_part: number;
  labor_cost_per_part: number;
  overhead_cost_per_part: number;
  scrap_cost_per_part: number;
  total_cost_per_part: number;
}

interface QualityMetrics {
  expected_cpk: number;
  expected_surface_finish_ra: number;
  scrap_rate_pct: number;
  first_pass_yield_pct: number;
  dimensional_accuracy_mm: number;
  tool_life_parts: number;
}

interface ParetoPoint {
  id: string;
  parameters: ProcessParameters;
  cost: CostBreakdown;
  quality: QualityMetrics;
  total_cost: number;
  quality_score: number; // 0-100 composite
  is_pareto_optimal: boolean;
}

interface ProcessParameters {
  cutting_speed_m_min: number;
  feed_per_tooth_mm: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  tool_diameter_mm: number;
  number_of_teeth: number;
  nose_radius_mm: number;
}

// ── Material & Cost Databases ──────────────────────────────────────────────

const MATERIAL_DB: Record<string, {
  kc1_1: number; mc: number;        // Kienzle specific cutting force
  taylor_C: number; taylor_n: number; // Taylor tool life
  density_kg_m3: number;
  cost_per_kg: number;
  machinability: number;
  typical_Ra_factor: number;         // Ra multiplier for feed-based estimate
}> = {
  steel_1045:       { kc1_1: 1800, mc: 0.25, taylor_C: 250, taylor_n: 0.25, density_kg_m3: 7850, cost_per_kg: 1.20, machinability: 0.65, typical_Ra_factor: 1.0 },
  steel_4140:       { kc1_1: 2100, mc: 0.25, taylor_C: 200, taylor_n: 0.22, density_kg_m3: 7850, cost_per_kg: 1.80, machinability: 0.55, typical_Ra_factor: 1.1 },
  aluminum_6061:    { kc1_1: 700,  mc: 0.23, taylor_C: 600, taylor_n: 0.35, density_kg_m3: 2700, cost_per_kg: 3.50, machinability: 0.90, typical_Ra_factor: 0.7 },
  aluminum_7075:    { kc1_1: 800,  mc: 0.23, taylor_C: 500, taylor_n: 0.33, density_kg_m3: 2810, cost_per_kg: 5.00, machinability: 0.85, typical_Ra_factor: 0.8 },
  titanium_ti6al4v: { kc1_1: 1500, mc: 0.23, taylor_C: 80,  taylor_n: 0.18, density_kg_m3: 4430, cost_per_kg: 25.0, machinability: 0.25, typical_Ra_factor: 1.4 },
  stainless_304:    { kc1_1: 2200, mc: 0.26, taylor_C: 150, taylor_n: 0.20, density_kg_m3: 8000, cost_per_kg: 3.00, machinability: 0.45, typical_Ra_factor: 1.2 },
  cast_iron:        { kc1_1: 1200, mc: 0.22, taylor_C: 300, taylor_n: 0.28, density_kg_m3: 7200, cost_per_kg: 0.80, machinability: 0.70, typical_Ra_factor: 0.9 },
  inconel_718:      { kc1_1: 2800, mc: 0.28, taylor_C: 50,  taylor_n: 0.15, density_kg_m3: 8190, cost_per_kg: 35.0, machinability: 0.15, typical_Ra_factor: 1.6 },
};

const DEFAULT_COST_RATES = {
  machine_rate_per_hour: 85,    // USD/hr
  labor_rate_per_hour: 45,      // USD/hr
  overhead_rate_pct: 30,        // % of direct costs
  tool_insert_cost: 12,         // USD per insert edge
  tool_edges_per_insert: 4,
  scrap_cost_multiplier: 1.5,   // scrap costs 1.5x material
};

// ── Physics Models ─────────────────────────────────────────────────────────

function computeToolLife(vc: number, mat: typeof MATERIAL_DB[string]): number {
  // Taylor: T = (C/vc)^(1/n)
  if (vc <= 0) return 999;
  return Math.pow(mat.taylor_C / vc, 1 / mat.taylor_n);
}

function computeMRR(params: ProcessParameters): number {
  // MRR = vc × fz × z × ap × ae / (π × D) ... simplified:
  // MRR (cm³/min) = ap × ae × vf / 1000
  // vf = fz × z × n; n = 1000 × vc / (π × D)
  const n_rpm = (1000 * params.cutting_speed_m_min) / (Math.PI * params.tool_diameter_mm);
  const vf = params.feed_per_tooth_mm * params.number_of_teeth * n_rpm; // mm/min
  return (params.depth_of_cut_mm * params.width_of_cut_mm * vf) / 1000; // cm³/min
}

function computeSurfaceFinish(fz: number, r: number, factor: number): number {
  // Ra ≈ (fz² / (32 × r)) × 1000 × factor
  if (r <= 0) return 6.3;
  return (fz * fz / (32 * r)) * 1000 * factor;
}

function computeCuttingForce(params: ProcessParameters, mat: typeof MATERIAL_DB[string]): number {
  // Kienzle: F = kc1.1 × b × h^(1-mc) where h = fz×sin(engagement), b = ap
  const h = params.feed_per_tooth_mm; // simplified for face milling
  const b = params.depth_of_cut_mm;
  if (h <= 0 || b <= 0) return 0;
  return mat.kc1_1 * b * Math.pow(h, 1 - mat.mc);
}

function computeSpindlePower(force: number, vc: number): number {
  // P = Fc × vc / (60 × 1000) [kW]
  return (force * vc) / (60 * 1000);
}

function estimateCpk(params: ProcessParameters, mat: typeof MATERIAL_DB[string], tolerance_mm: number): number {
  // Estimated process spread ≈ f(material machinability, tool wear, thermal)
  const baseSpread = tolerance_mm * 0.3 / mat.machinability; // Higher machinability → tighter spread
  const toolWearFactor = 1 + (1 - mat.machinability) * 0.3;
  const processSpread = baseSpread * toolWearFactor;
  // Cpk = tolerance / (6σ), assume centered
  const sigma = processSpread / 3;
  return sigma > 0 ? (tolerance_mm / 2) / (3 * sigma) : 2.0;
}

function estimateScrapRate(cpk: number): number {
  // Approximation: scrap PPM from Cpk, converted to %
  if (cpk >= 2.0) return 0.0001;
  if (cpk >= 1.67) return 0.001;
  if (cpk >= 1.33) return 0.01;
  if (cpk >= 1.0) return 0.27;
  if (cpk >= 0.67) return 4.56;
  return 15.0;
}

// ── Cost Computation ───────────────────────────────────────────────────────

function computeCosts(
  params: ProcessParameters,
  mat: typeof MATERIAL_DB[string],
  partVolume_cm3: number,
  cycleTime_min: number,
  toolLife_min: number,
  scrapRate_pct: number,
  rates: typeof DEFAULT_COST_RATES,
): CostBreakdown {
  // Tool cost per part
  const toolCostPerEdge = rates.tool_insert_cost / rates.tool_edges_per_insert;
  const edgesPerPart = toolLife_min > 0 ? cycleTime_min / toolLife_min : 0.1;
  const toolingCost = toolCostPerEdge * edgesPerPart * params.number_of_teeth;

  // Machine cost
  const machineCost = (cycleTime_min / 60) * rates.machine_rate_per_hour;

  // Material cost (including stock allowance)
  const stockMultiplier = 1.3; // 30% stock allowance
  const materialMass = (partVolume_cm3 * stockMultiplier / 1000) * mat.density_kg_m3 / 1000;
  const materialCost = materialMass * mat.cost_per_kg;

  // Labor cost
  const laborCost = (cycleTime_min / 60) * rates.labor_rate_per_hour;

  // Overhead
  const directCost = toolingCost + machineCost + materialCost + laborCost;
  const overheadCost = directCost * (rates.overhead_rate_pct / 100);

  // Scrap cost
  const scrapCost = (materialCost * rates.scrap_cost_multiplier) * (scrapRate_pct / 100);

  return {
    tooling_cost_per_part: round2(toolingCost),
    machine_cost_per_part: round2(machineCost),
    material_cost_per_part: round2(materialCost),
    labor_cost_per_part: round2(laborCost),
    overhead_cost_per_part: round2(overheadCost),
    scrap_cost_per_part: round2(scrapCost),
    total_cost_per_part: round2(toolingCost + machineCost + materialCost + laborCost + overheadCost + scrapCost),
  };
}

function round2(v: number): number { return Math.round(v * 100) / 100; }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }

// ── Quality Score Computation ──────────────────────────────────────────────

function computeQualityScore(q: QualityMetrics): number {
  // Weighted composite: Cpk (40%), surface (20%), FPY (20%), accuracy (20%)
  const cpkScore = Math.min(100, (q.expected_cpk / 2.0) * 100);
  const surfScore = Math.max(0, 100 - (q.expected_surface_finish_ra / 6.3) * 100);
  const fpyScore = q.first_pass_yield_pct;
  const accScore = Math.max(0, 100 - (q.dimensional_accuracy_mm / 0.1) * 100);

  return round2(cpkScore * 0.4 + surfScore * 0.2 + fpyScore * 0.2 + accScore * 0.2);
}

// ── Pareto Generation ──────────────────────────────────────────────────────

function generateParetoPoints(
  material: string,
  baseParams: Partial<ProcessParameters>,
  tolerance_mm: number,
  partVolume_cm3: number,
  rates: typeof DEFAULT_COST_RATES,
  gridSize: number,
): ParetoPoint[] {
  const mat = MATERIAL_DB[material] ?? MATERIAL_DB.steel_1045;

  // Default parameter ranges based on material
  const vcRange = {
    min: mat.taylor_C * 0.3,
    max: mat.taylor_C * 1.2,
  };
  const fzRange = { min: 0.04, max: 0.3 };
  const apRange = { min: 0.5, max: 6.0 };

  const points: ParetoPoint[] = [];
  let idCounter = 1;

  // Grid search over vc × fz × ap
  const vcSteps = Math.max(3, Math.min(gridSize, 8));
  const fzSteps = Math.max(3, Math.min(gridSize, 6));
  const apSteps = Math.max(2, Math.min(gridSize, 4));

  for (let vi = 0; vi < vcSteps; vi++) {
    const vc = vcRange.min + (vcRange.max - vcRange.min) * (vi / (vcSteps - 1));

    for (let fi = 0; fi < fzSteps; fi++) {
      const fz = fzRange.min + (fzRange.max - fzRange.min) * (fi / (fzSteps - 1));

      for (let ai = 0; ai < apSteps; ai++) {
        const ap = apRange.min + (apRange.max - apRange.min) * (ai / (apSteps - 1));

        const params: ProcessParameters = {
          cutting_speed_m_min: round2(vc),
          feed_per_tooth_mm: round3(fz),
          depth_of_cut_mm: round2(ap),
          width_of_cut_mm: baseParams.width_of_cut_mm ?? 20,
          tool_diameter_mm: baseParams.tool_diameter_mm ?? 50,
          number_of_teeth: baseParams.number_of_teeth ?? 4,
          nose_radius_mm: baseParams.nose_radius_mm ?? 0.8,
        };

        const mrr = computeMRR(params);
        const toolLife = computeToolLife(vc, mat);
        const cycleTime = partVolume_cm3 > 0 && mrr > 0 ? partVolume_cm3 / mrr : 5;
        const ra = computeSurfaceFinish(fz, params.nose_radius_mm, mat.typical_Ra_factor);
        const force = computeCuttingForce(params, mat);
        const power = computeSpindlePower(force, vc);
        const cpk = estimateCpk(params, mat, tolerance_mm);
        const scrapRate = estimateScrapRate(cpk);

        // Skip infeasible points
        if (toolLife < 1 || power > 30 || force > 10000) continue;

        const quality: QualityMetrics = {
          expected_cpk: round3(cpk),
          expected_surface_finish_ra: round3(ra),
          scrap_rate_pct: round3(scrapRate),
          first_pass_yield_pct: round2(100 - scrapRate),
          dimensional_accuracy_mm: round3(tolerance_mm * 0.3 / mat.machinability),
          tool_life_parts: round2(toolLife / Math.max(0.1, cycleTime)),
        };

        const cost = computeCosts(params, mat, partVolume_cm3, cycleTime, toolLife, scrapRate, rates);
        const qualityScore = computeQualityScore(quality);

        points.push({
          id: `P${idCounter++}`,
          parameters: params,
          cost,
          quality,
          total_cost: cost.total_cost_per_part,
          quality_score: qualityScore,
          is_pareto_optimal: false, // Will be set later
        });
      }
    }
  }

  // Identify Pareto-optimal points (minimize cost, maximize quality)
  for (const p of points) {
    p.is_pareto_optimal = !points.some(
      q => q.total_cost <= p.total_cost && q.quality_score >= p.quality_score &&
           (q.total_cost < p.total_cost || q.quality_score > p.quality_score)
    );
  }

  return points;
}

// ── Action Handlers ────────────────────────────────────────────────────────

function cqtPareto(params: Record<string, unknown>): unknown {
  const material = String(params.material ?? "steel_1045");
  const tolerance = Number(params.tolerance_mm ?? 0.05);
  const partVolume = Number(params.part_volume_cm3 ?? 50);
  const gridSize = Math.min(10, Math.max(3, Number(params.grid_size ?? 5)));

  const rates = { ...DEFAULT_COST_RATES };
  if (params.machine_rate) rates.machine_rate_per_hour = Number(params.machine_rate);
  if (params.labor_rate) rates.labor_rate_per_hour = Number(params.labor_rate);
  if (params.tool_cost) rates.tool_insert_cost = Number(params.tool_cost);

  const baseParams: Partial<ProcessParameters> = {
    width_of_cut_mm: Number(params.width_of_cut_mm ?? 20),
    tool_diameter_mm: Number(params.tool_diameter_mm ?? 50),
    number_of_teeth: Number(params.number_of_teeth ?? 4),
    nose_radius_mm: Number(params.nose_radius_mm ?? 0.8),
  };

  const points = generateParetoPoints(material, baseParams, tolerance, partVolume, rates, gridSize);
  const paretoFrontier = points.filter(p => p.is_pareto_optimal);

  // Sort frontier by cost ascending
  paretoFrontier.sort((a, b) => a.total_cost - b.total_cost);

  return {
    material,
    tolerance_mm: tolerance,
    part_volume_cm3: partVolume,
    total_points_evaluated: points.length,
    pareto_frontier_size: paretoFrontier.length,
    cost_range: {
      min: round2(Math.min(...points.map(p => p.total_cost))),
      max: round2(Math.max(...points.map(p => p.total_cost))),
    },
    quality_range: {
      min: round2(Math.min(...points.map(p => p.quality_score))),
      max: round2(Math.max(...points.map(p => p.quality_score))),
    },
    pareto_frontier: paretoFrontier,
    best_cost: paretoFrontier[0] ?? null,
    best_quality: paretoFrontier.length > 0
      ? paretoFrontier.reduce((best, p) => p.quality_score > best.quality_score ? p : best)
      : null,
  };
}

function cqtOptimize(params: Record<string, unknown>): unknown {
  const material = String(params.material ?? "steel_1045");
  const tolerance = Number(params.tolerance_mm ?? 0.05);
  const partVolume = Number(params.part_volume_cm3 ?? 50);
  const costWeight = Number(params.cost_weight ?? 0.5);
  const qualityWeight = Number(params.quality_weight ?? 0.5);

  const rates = { ...DEFAULT_COST_RATES };
  if (params.machine_rate) rates.machine_rate_per_hour = Number(params.machine_rate);

  const baseParams: Partial<ProcessParameters> = {
    width_of_cut_mm: Number(params.width_of_cut_mm ?? 20),
    tool_diameter_mm: Number(params.tool_diameter_mm ?? 50),
    number_of_teeth: Number(params.number_of_teeth ?? 4),
    nose_radius_mm: Number(params.nose_radius_mm ?? 0.8),
  };

  const points = generateParetoPoints(material, baseParams, tolerance, partVolume, rates, 6);

  if (points.length === 0) {
    return { error: "No feasible points found", material, tolerance_mm: tolerance };
  }

  // Normalize cost and quality to 0-1
  const minCost = Math.min(...points.map(p => p.total_cost));
  const maxCost = Math.max(...points.map(p => p.total_cost));
  const minQual = Math.min(...points.map(p => p.quality_score));
  const maxQual = Math.max(...points.map(p => p.quality_score));
  const costRange = maxCost - minCost || 1;
  const qualRange = maxQual - minQual || 1;

  // Find optimal point using weighted normalized scores
  let best = points[0];
  let bestScore = -Infinity;
  for (const p of points) {
    const normCost = 1 - (p.total_cost - minCost) / costRange; // Lower cost → higher score
    const normQual = (p.quality_score - minQual) / qualRange;
    const score = costWeight * normCost + qualityWeight * normQual;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return {
    material,
    tolerance_mm: tolerance,
    weights: { cost: costWeight, quality: qualityWeight },
    optimal_point: best,
    weighted_score: round3(bestScore),
    trade_off_summary: {
      cost_vs_best: round2(best.total_cost - minCost),
      quality_vs_best: round2(maxQual - best.quality_score),
      cost_percentile: round2(((best.total_cost - minCost) / costRange) * 100),
      quality_percentile: round2(((best.quality_score - minQual) / qualRange) * 100),
    },
    alternatives: {
      lowest_cost: points.reduce((b, p) => p.total_cost < b.total_cost ? p : b),
      highest_quality: points.reduce((b, p) => p.quality_score > b.quality_score ? p : b),
    },
  };
}

function cqtSensitivity(params: Record<string, unknown>): unknown {
  const material = String(params.material ?? "steel_1045");
  const mat = MATERIAL_DB[material] ?? MATERIAL_DB.steel_1045;
  const tolerance = Number(params.tolerance_mm ?? 0.05);
  const partVolume = Number(params.part_volume_cm3 ?? 50);

  const baseVc = Number(params.cutting_speed_m_min ?? mat.taylor_C * 0.6);
  const baseFz = Number(params.feed_per_tooth_mm ?? 0.12);
  const baseAp = Number(params.depth_of_cut_mm ?? 2.0);

  const rates = { ...DEFAULT_COST_RATES };
  const baseP: ProcessParameters = {
    cutting_speed_m_min: baseVc,
    feed_per_tooth_mm: baseFz,
    depth_of_cut_mm: baseAp,
    width_of_cut_mm: Number(params.width_of_cut_mm ?? 20),
    tool_diameter_mm: Number(params.tool_diameter_mm ?? 50),
    number_of_teeth: Number(params.number_of_teeth ?? 4),
    nose_radius_mm: Number(params.nose_radius_mm ?? 0.8),
  };

  // Compute baseline
  const baseMRR = computeMRR(baseP);
  const baseTL = computeToolLife(baseVc, mat);
  const baseCT = partVolume > 0 && baseMRR > 0 ? partVolume / baseMRR : 5;
  const baseRa = computeSurfaceFinish(baseFz, baseP.nose_radius_mm, mat.typical_Ra_factor);
  const baseCpk = estimateCpk(baseP, mat, tolerance);
  const baseScrap = estimateScrapRate(baseCpk);
  const baseCost = computeCosts(baseP, mat, partVolume, baseCT, baseTL, baseScrap, rates);
  const baseQS = computeQualityScore({
    expected_cpk: baseCpk, expected_surface_finish_ra: baseRa,
    scrap_rate_pct: baseScrap, first_pass_yield_pct: 100 - baseScrap,
    dimensional_accuracy_mm: tolerance * 0.3 / mat.machinability,
    tool_life_parts: baseTL / Math.max(0.1, baseCT),
  });

  // Sensitivity: +10% change in each parameter
  const delta = 0.10;
  const sensitivities: { parameter: string; base_value: number; changed_value: number; cost_change_pct: number; quality_change_pct: number; cost_sensitivity: number; quality_sensitivity: number }[] = [];

  const paramVariations: [string, ProcessParameters][] = [
    ["cutting_speed", { ...baseP, cutting_speed_m_min: baseVc * (1 + delta) }],
    ["feed_per_tooth", { ...baseP, feed_per_tooth_mm: baseFz * (1 + delta) }],
    ["depth_of_cut", { ...baseP, depth_of_cut_mm: baseAp * (1 + delta) }],
  ];

  for (const [name, varP] of paramVariations) {
    const mrr = computeMRR(varP);
    const tl = computeToolLife(varP.cutting_speed_m_min, mat);
    const ct = partVolume > 0 && mrr > 0 ? partVolume / mrr : 5;
    const ra = computeSurfaceFinish(varP.feed_per_tooth_mm, varP.nose_radius_mm, mat.typical_Ra_factor);
    const cpk = estimateCpk(varP, mat, tolerance);
    const scrap = estimateScrapRate(cpk);
    const cost = computeCosts(varP, mat, partVolume, ct, tl, scrap, rates);
    const qs = computeQualityScore({
      expected_cpk: cpk, expected_surface_finish_ra: ra,
      scrap_rate_pct: scrap, first_pass_yield_pct: 100 - scrap,
      dimensional_accuracy_mm: tolerance * 0.3 / mat.machinability,
      tool_life_parts: tl / Math.max(0.1, ct),
    });

    const costChangePct = baseCost.total_cost_per_part > 0
      ? ((cost.total_cost_per_part - baseCost.total_cost_per_part) / baseCost.total_cost_per_part) * 100
      : 0;
    const qualChangePct = baseQS > 0
      ? ((qs - baseQS) / baseQS) * 100
      : 0;

    const baseVal = name === "cutting_speed" ? baseVc : name === "feed_per_tooth" ? baseFz : baseAp;
    const changedVal = name === "cutting_speed" ? varP.cutting_speed_m_min : name === "feed_per_tooth" ? varP.feed_per_tooth_mm : varP.depth_of_cut_mm;

    sensitivities.push({
      parameter: name,
      base_value: round3(baseVal),
      changed_value: round3(changedVal),
      cost_change_pct: round2(costChangePct),
      quality_change_pct: round2(qualChangePct),
      cost_sensitivity: round3(costChangePct / (delta * 100)), // % cost change per % parameter change
      quality_sensitivity: round3(qualChangePct / (delta * 100)),
    });
  }

  // Sort by absolute cost sensitivity
  sensitivities.sort((a, b) => Math.abs(b.cost_sensitivity) - Math.abs(a.cost_sensitivity));

  return {
    material,
    base_parameters: baseP,
    base_cost: baseCost.total_cost_per_part,
    base_quality_score: round2(baseQS),
    perturbation_pct: delta * 100,
    sensitivities,
    most_cost_sensitive: sensitivities[0]?.parameter ?? "none",
    most_quality_sensitive: [...sensitivities].sort((a, b) => Math.abs(b.quality_sensitivity) - Math.abs(a.quality_sensitivity))[0]?.parameter ?? "none",
  };
}

function cqtScenario(params: Record<string, unknown>): unknown {
  const material = String(params.material ?? "steel_1045");
  const mat = MATERIAL_DB[material] ?? MATERIAL_DB.steel_1045;
  const tolerance = Number(params.tolerance_mm ?? 0.05);
  const partVolume = Number(params.part_volume_cm3 ?? 50);
  const rates = { ...DEFAULT_COST_RATES };

  // Define scenarios
  const scenarioDefinitions: Record<string, { label: string; vcFactor: number; fzFactor: number; apFactor: number }> = {
    conservative: { label: "Conservative (low speed, low feed)", vcFactor: 0.5, fzFactor: 0.5, apFactor: 0.5 },
    balanced:     { label: "Balanced (moderate parameters)", vcFactor: 0.7, fzFactor: 0.7, apFactor: 0.7 },
    productive:   { label: "Productive (high speed, moderate feed)", vcFactor: 1.0, fzFactor: 0.7, apFactor: 1.0 },
    aggressive:   { label: "Aggressive (maximum MRR)", vcFactor: 1.0, fzFactor: 1.0, apFactor: 1.0 },
  };

  const requestedScenarios = params.scenarios
    ? (params.scenarios as string[])
    : Object.keys(scenarioDefinitions);

  const results: Record<string, unknown> = {};
  const comparison: { scenario: string; cost: number; quality: number; mrr: number; tool_life: number }[] = [];

  for (const sName of requestedScenarios) {
    const sDef = scenarioDefinitions[sName];
    if (!sDef) continue;

    const vc = mat.taylor_C * sDef.vcFactor;
    const fz = 0.2 * sDef.fzFactor;
    const ap = 4.0 * sDef.apFactor;

    const p: ProcessParameters = {
      cutting_speed_m_min: round2(vc),
      feed_per_tooth_mm: round3(fz),
      depth_of_cut_mm: round2(ap),
      width_of_cut_mm: Number(params.width_of_cut_mm ?? 20),
      tool_diameter_mm: Number(params.tool_diameter_mm ?? 50),
      number_of_teeth: Number(params.number_of_teeth ?? 4),
      nose_radius_mm: Number(params.nose_radius_mm ?? 0.8),
    };

    const mrr = computeMRR(p);
    const tl = computeToolLife(vc, mat);
    const ct = partVolume > 0 && mrr > 0 ? partVolume / mrr : 5;
    const ra = computeSurfaceFinish(fz, p.nose_radius_mm, mat.typical_Ra_factor);
    const cpk = estimateCpk(p, mat, tolerance);
    const scrap = estimateScrapRate(cpk);
    const cost = computeCosts(p, mat, partVolume, ct, tl, scrap, rates);
    const quality: QualityMetrics = {
      expected_cpk: round3(cpk),
      expected_surface_finish_ra: round3(ra),
      scrap_rate_pct: round3(scrap),
      first_pass_yield_pct: round2(100 - scrap),
      dimensional_accuracy_mm: round3(tolerance * 0.3 / mat.machinability),
      tool_life_parts: round2(tl / Math.max(0.1, ct)),
    };
    const qs = computeQualityScore(quality);

    results[sName] = {
      label: sDef.label,
      parameters: p,
      cost,
      quality,
      quality_score: qs,
      mrr_cm3_min: round2(mrr),
      tool_life_min: round2(tl),
      cycle_time_min: round2(ct),
    };

    comparison.push({
      scenario: sName,
      cost: cost.total_cost_per_part,
      quality: qs,
      mrr: round2(mrr),
      tool_life: round2(tl),
    });
  }

  // Rank scenarios
  comparison.sort((a, b) => a.cost - b.cost);
  const bestCostScenario = comparison[0]?.scenario ?? "unknown";
  const bestQualityScenario = [...comparison].sort((a, b) => b.quality - a.quality)[0]?.scenario ?? "unknown";

  return {
    material,
    tolerance_mm: tolerance,
    scenarios_evaluated: Object.keys(results).length,
    scenarios: results,
    comparison,
    best_cost_scenario: bestCostScenario,
    best_quality_scenario: bestQualityScenario,
    recommendation: bestCostScenario === bestQualityScenario
      ? `${bestCostScenario} is optimal for both cost and quality`
      : `${bestCostScenario} for lowest cost; ${bestQualityScenario} for best quality`,
  };
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function executeCostQualityAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "cqt_pareto":      return cqtPareto(params);
    case "cqt_optimize":    return cqtOptimize(params);
    case "cqt_sensitivity": return cqtSensitivity(params);
    case "cqt_scenario":    return cqtScenario(params);
    default:
      throw new Error(`CostQualityTradeoffEngine: unknown action "${action}"`);
  }
}
