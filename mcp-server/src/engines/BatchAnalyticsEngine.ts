/**
 * PRISM Manufacturing Intelligence - Batch Analytics Engine
 * R17-MS4: Cross-Job KPIs, Trend Analysis, Batch Comparison
 *
 * Aggregates manufacturing data across multiple jobs and batches to provide
 * performance dashboards, trend detection, and comparative analysis.
 *
 * Architecture:
 *   BatchStore:    In-memory store of batch/job summaries
 *   KPIComputer:   OEE, yield, cycle time, cost-per-part aggregation
 *   TrendAnalyzer: Linear regression + change-point detection across batches
 *
 * Actions:
 *   batch_kpi     — Compute KPIs for a batch (OEE, yield, cost, cycle time)
 *   batch_trend   — Trend analysis across multiple batches over time
 *   batch_compare — Compare two batches side-by-side
 *   batch_summary — Executive summary of all tracked batches
 *
 * @version 1.0.0  R17-MS4
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface BatchRecord {
  batch_id: string;
  job_id?: string;
  material: string;
  operation: string;
  parts_planned: number;
  parts_produced: number;
  parts_accepted: number;
  parts_reworked: number;
  parts_scrapped: number;
  cycle_time_avg_min: number;
  cycle_time_std_min: number;
  setup_time_min: number;
  downtime_min: number;
  planned_run_time_min: number;
  tool_changes: number;
  tool_cost_usd: number;
  material_cost_usd: number;
  energy_kwh: number;
  surface_finish_avg_Ra_um?: number;
  tolerance_cpk?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface BatchKPI {
  batch_id: string;
  oee: number;                // Overall Equipment Effectiveness (0-1)
  availability: number;       // (planned - downtime) / planned
  performance: number;        // actual throughput / theoretical
  quality: number;            // accepted / produced
  yield_pct: number;          // accepted / planned
  first_pass_yield: number;   // (produced - reworked - scrapped) / produced
  scrap_rate: number;         // scrapped / produced
  rework_rate: number;        // reworked / produced
  cost_per_part_usd: number;
  cycle_efficiency: number;   // theoretical cycle / actual cycle
  tool_cost_per_part_usd: number;
  throughput_parts_per_hr: number;
}

interface TrendPoint {
  batch_id: string;
  timestamp: number;
  value: number;
}

interface TrendResult {
  metric: string;
  points: TrendPoint[];
  regression: { slope: number; intercept: number; r_squared: number };
  trend_direction: "improving" | "degrading" | "stable";
  change_points: Array<{ index: number; batch_id: string; magnitude: number }>;
  forecast_next: number;
}

// ============================================================================
// IN-MEMORY BATCH STORE
// ============================================================================

const MAX_BATCHES = 1000;
const batchStore: BatchRecord[] = [];

function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Compute KPIs for a batch — can provide batch data inline or reference stored batch.
 */
function batchKPI(params: Record<string, unknown>): unknown {
  let record: BatchRecord;

  // If batch_id provided, look up stored batch
  if (params.batch_id && typeof params.batch_id === "string") {
    const found = batchStore.find(b => b.batch_id === params.batch_id);
    if (found) {
      record = found;
    } else {
      // Create from params
      record = createBatchRecord(params);
    }
  } else {
    record = createBatchRecord(params);
    // Store it
    if (batchStore.length >= MAX_BATCHES) batchStore.shift();
    batchStore.push(record);
  }

  const kpi = computeKPIs(record);

  return {
    ...kpi,
    material: record.material,
    operation: record.operation,
    parts_planned: record.parts_planned,
    parts_produced: record.parts_produced,
    parts_accepted: record.parts_accepted,
    safety: {
      score: kpi.oee >= 0.65 ? 1.0 : kpi.oee >= 0.5 ? 0.8 : 0.6,
      flags: [
        ...(kpi.scrap_rate > 0.05 ? ["HIGH_SCRAP_RATE"] : []),
        ...(kpi.oee < 0.5 ? ["LOW_OEE"] : []),
        ...(kpi.quality < 0.95 ? ["QUALITY_CONCERN"] : []),
      ],
    },
  };
}

/**
 * Trend analysis across multiple batches.
 */
function batchTrend(params: Record<string, unknown>): unknown {
  const metric = String(params.metric ?? "oee");
  const material = params.material ? String(params.material) : undefined;
  const operation = params.operation ? String(params.operation) : undefined;
  const lastN = Number(params.last_n ?? 20);

  // Filter batches
  let filtered = batchStore.filter(b => {
    if (material && b.material !== material) return false;
    if (operation && b.operation !== operation) return false;
    return true;
  });

  // Sort by timestamp and take last N
  filtered.sort((a, b) => a.timestamp - b.timestamp);
  filtered = filtered.slice(-lastN);

  if (filtered.length < 3) {
    return {
      metric,
      sufficient_data: false,
      count: filtered.length,
      message: `Need at least 3 batches for trend analysis (have ${filtered.length})`,
    };
  }

  // Extract metric values
  const points: TrendPoint[] = filtered.map(b => ({
    batch_id: b.batch_id,
    timestamp: b.timestamp,
    value: extractMetric(b, metric),
  }));

  // Linear regression
  const x = points.map((_, i) => i);
  const y = points.map(p => p.value);
  const regression = linearRegression(x, y);

  // Change-point detection (simple: points where residual > 2σ)
  const residuals = y.map((yi, i) => yi - (regression.slope * i + regression.intercept));
  const residStd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);
  const changePoints = residuals
    .map((r, i) => ({ index: i, batch_id: points[i].batch_id, magnitude: round4(r) }))
    .filter(cp => Math.abs(cp.magnitude) > 2 * residStd);

  // Trend direction (based on slope significance)
  const isImproving = isHigherBetter(metric);
  let direction: TrendResult["trend_direction"];
  if (Math.abs(regression.slope) < residStd * 0.1) {
    direction = "stable";
  } else if ((regression.slope > 0) === isImproving) {
    direction = "improving";
  } else {
    direction = "degrading";
  }

  // Forecast next value
  const forecastNext = regression.slope * points.length + regression.intercept;

  return {
    metric,
    sufficient_data: true,
    points,
    regression: {
      slope: round4(regression.slope),
      intercept: round4(regression.intercept),
      r_squared: round4(regression.rSquared),
    },
    trend_direction: direction,
    change_points: changePoints,
    forecast_next: round4(forecastNext),
    filter: { material, operation, last_n: lastN },
  };
}

/**
 * Compare two batches side-by-side.
 */
function batchCompare(params: Record<string, unknown>): unknown {
  const batchA = String(params.batch_a ?? params.batch_id_a ?? "");
  const batchB = String(params.batch_b ?? params.batch_id_b ?? "");

  const recordA = batchStore.find(b => b.batch_id === batchA);
  const recordB = batchStore.find(b => b.batch_id === batchB);

  if (!recordA || !recordB) {
    return {
      error: "Both batch IDs must exist in store",
      found_a: !!recordA,
      found_b: !!recordB,
      available_batches: batchStore.map(b => b.batch_id).slice(-20),
    };
  }

  const kpiA = computeKPIs(recordA);
  const kpiB = computeKPIs(recordB);

  // Compute deltas
  const deltas: Record<string, { a: number; b: number; delta: number; delta_pct: number; better: string }> = {};
  const kpiKeys: (keyof BatchKPI)[] = [
    "oee", "availability", "performance", "quality", "yield_pct",
    "first_pass_yield", "scrap_rate", "rework_rate", "cost_per_part_usd",
    "throughput_parts_per_hr",
  ];

  for (const key of kpiKeys) {
    const a = kpiA[key] as number;
    const b = kpiB[key] as number;
    const delta = b - a;
    const deltaPct = a !== 0 ? (delta / Math.abs(a)) * 100 : 0;

    // For scrap_rate, rework_rate, cost_per_part: lower is better
    const lowerIsBetter = ["scrap_rate", "rework_rate", "cost_per_part_usd"].includes(key);
    const better = delta === 0 ? "equal" : ((delta < 0) === lowerIsBetter) ? "B" : "A";

    deltas[key] = {
      a: round4(a),
      b: round4(b),
      delta: round4(delta),
      delta_pct: round4(deltaPct),
      better,
    };
  }

  return {
    batch_a: { id: batchA, material: recordA.material, operation: recordA.operation },
    batch_b: { id: batchB, material: recordB.material, operation: recordB.operation },
    comparison: deltas,
    overall_winner: determineWinner(deltas),
    safety: { score: 1.0, flags: [] },
  };
}

/**
 * Executive summary of all tracked batches.
 */
function batchSummary(params: Record<string, unknown>): unknown {
  const material = params.material ? String(params.material) : undefined;
  const operation = params.operation ? String(params.operation) : undefined;

  let filtered = batchStore.filter(b => {
    if (material && b.material !== material) return false;
    if (operation && b.operation !== operation) return false;
    return true;
  });

  if (filtered.length === 0) {
    return {
      count: 0,
      message: "No batches recorded yet. Use batch_kpi to record batch data.",
      filter: { material, operation },
    };
  }

  // Aggregate KPIs
  const kpis = filtered.map(b => computeKPIs(b));

  const avgOEE = kpis.reduce((s, k) => s + k.oee, 0) / kpis.length;
  const avgYield = kpis.reduce((s, k) => s + k.yield_pct, 0) / kpis.length;
  const avgCost = kpis.reduce((s, k) => s + k.cost_per_part_usd, 0) / kpis.length;
  const avgScrap = kpis.reduce((s, k) => s + k.scrap_rate, 0) / kpis.length;
  const avgThroughput = kpis.reduce((s, k) => s + k.throughput_parts_per_hr, 0) / kpis.length;

  const totalParts = filtered.reduce((s, b) => s + b.parts_produced, 0);
  const totalAccepted = filtered.reduce((s, b) => s + b.parts_accepted, 0);
  const totalScrapped = filtered.reduce((s, b) => s + b.parts_scrapped, 0);
  const totalToolCost = filtered.reduce((s, b) => s + b.tool_cost_usd, 0);
  const totalEnergy = filtered.reduce((s, b) => s + b.energy_kwh, 0);

  // Best and worst batches by OEE
  const sorted = [...kpis].sort((a, b) => b.oee - a.oee);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // By-material breakdown
  const byMaterial: Record<string, { count: number; avg_oee: number; avg_yield: number }> = {};
  const materials = [...new Set(filtered.map(b => b.material))];
  for (const mat of materials) {
    const matKPIs = filtered
      .filter(b => b.material === mat)
      .map(b => computeKPIs(b));
    byMaterial[mat] = {
      count: matKPIs.length,
      avg_oee: round4(matKPIs.reduce((s, k) => s + k.oee, 0) / matKPIs.length),
      avg_yield: round4(matKPIs.reduce((s, k) => s + k.yield_pct, 0) / matKPIs.length),
    };
  }

  return {
    count: filtered.length,
    totals: {
      parts_produced: totalParts,
      parts_accepted: totalAccepted,
      parts_scrapped: totalScrapped,
      tool_cost_usd: round4(totalToolCost),
      energy_kwh: round4(totalEnergy),
    },
    averages: {
      oee: round4(avgOEE),
      yield_pct: round4(avgYield),
      cost_per_part_usd: round4(avgCost),
      scrap_rate: round4(avgScrap),
      throughput_parts_per_hr: round4(avgThroughput),
    },
    best_batch: { id: best.batch_id, oee: round4(best.oee) },
    worst_batch: { id: worst.batch_id, oee: round4(worst.oee) },
    by_material: byMaterial,
    filter: { material, operation },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createBatchRecord(params: Record<string, unknown>): BatchRecord {
  const partsProduced = Number(params.parts_produced ?? 100);
  const partsAccepted = Number(params.parts_accepted ?? partsProduced);
  const partsReworked = Number(params.parts_reworked ?? 0);
  const partsScrapped = Number(params.parts_scrapped ?? 0);
  const cycleTimeAvg = Number(params.cycle_time_avg_min ?? 5);
  const plannedRunTime = Number(params.planned_run_time_min ?? partsProduced * cycleTimeAvg * 1.1);

  return {
    batch_id: String(params.batch_id ?? generateBatchId()),
    job_id: params.job_id ? String(params.job_id) : undefined,
    material: String(params.material ?? "steel"),
    operation: String(params.operation ?? "milling"),
    parts_planned: Number(params.parts_planned ?? partsProduced),
    parts_produced: partsProduced,
    parts_accepted: partsAccepted,
    parts_reworked: partsReworked,
    parts_scrapped: partsScrapped,
    cycle_time_avg_min: cycleTimeAvg,
    cycle_time_std_min: Number(params.cycle_time_std_min ?? cycleTimeAvg * 0.1),
    setup_time_min: Number(params.setup_time_min ?? 30),
    downtime_min: Number(params.downtime_min ?? 15),
    planned_run_time_min: plannedRunTime,
    tool_changes: Number(params.tool_changes ?? 3),
    tool_cost_usd: Number(params.tool_cost_usd ?? 50),
    material_cost_usd: Number(params.material_cost_usd ?? partsProduced * 2),
    energy_kwh: Number(params.energy_kwh ?? partsProduced * 0.5),
    surface_finish_avg_Ra_um: params.surface_finish_avg_Ra_um != null ? Number(params.surface_finish_avg_Ra_um) : undefined,
    tolerance_cpk: params.tolerance_cpk != null ? Number(params.tolerance_cpk) : undefined,
    timestamp: Date.now(),
    metadata: (params.metadata as Record<string, unknown>) ?? undefined,
  };
}

function computeKPIs(record: BatchRecord): BatchKPI {
  const availability = record.planned_run_time_min > 0
    ? (record.planned_run_time_min - record.downtime_min) / record.planned_run_time_min
    : 1;

  const theoreticalTime = record.parts_produced * record.cycle_time_avg_min;
  const actualRunTime = record.planned_run_time_min - record.downtime_min - record.setup_time_min;
  const performance = actualRunTime > 0 ? Math.min(1, theoreticalTime / actualRunTime) : 1;

  const quality = record.parts_produced > 0
    ? record.parts_accepted / record.parts_produced
    : 1;

  const oee = availability * performance * quality;

  const yieldPct = record.parts_planned > 0
    ? (record.parts_accepted / record.parts_planned) * 100
    : 100;

  const firstPassYield = record.parts_produced > 0
    ? (record.parts_produced - record.parts_reworked - record.parts_scrapped) / record.parts_produced
    : 1;

  const scrapRate = record.parts_produced > 0
    ? record.parts_scrapped / record.parts_produced
    : 0;

  const reworkRate = record.parts_produced > 0
    ? record.parts_reworked / record.parts_produced
    : 0;

  const totalCost = record.tool_cost_usd + record.material_cost_usd + record.energy_kwh * 0.12;
  const costPerPart = record.parts_accepted > 0 ? totalCost / record.parts_accepted : 0;

  const toolCostPerPart = record.parts_accepted > 0
    ? record.tool_cost_usd / record.parts_accepted
    : 0;

  const totalTimeMins = record.planned_run_time_min;
  const throughput = totalTimeMins > 0
    ? (record.parts_produced / totalTimeMins) * 60
    : 0;

  const cycleEfficiency = record.cycle_time_avg_min > 0 && actualRunTime > 0
    ? theoreticalTime / actualRunTime
    : 1;

  return {
    batch_id: record.batch_id,
    oee: clamp01(oee),
    availability: clamp01(availability),
    performance: clamp01(performance),
    quality: clamp01(quality),
    yield_pct: round4(yieldPct),
    first_pass_yield: clamp01(firstPassYield),
    scrap_rate: round4(scrapRate),
    rework_rate: round4(reworkRate),
    cost_per_part_usd: round4(costPerPart),
    cycle_efficiency: clamp01(cycleEfficiency),
    tool_cost_per_part_usd: round4(toolCostPerPart),
    throughput_parts_per_hr: round4(throughput),
  };
}

function extractMetric(batch: BatchRecord, metric: string): number {
  const kpi = computeKPIs(batch);
  switch (metric) {
    case "oee": return kpi.oee;
    case "availability": return kpi.availability;
    case "performance": return kpi.performance;
    case "quality": return kpi.quality;
    case "yield": return kpi.yield_pct;
    case "scrap_rate": return kpi.scrap_rate;
    case "cost_per_part": return kpi.cost_per_part_usd;
    case "throughput": return kpi.throughput_parts_per_hr;
    case "cycle_time": return batch.cycle_time_avg_min;
    case "tool_cost": return kpi.tool_cost_per_part_usd;
    case "surface_finish": return batch.surface_finish_avg_Ra_um ?? 0;
    case "cpk": return batch.tolerance_cpk ?? 0;
    default: return kpi.oee;
  }
}

function isHigherBetter(metric: string): boolean {
  const lowerBetter = ["scrap_rate", "rework_rate", "cost_per_part", "tool_cost", "cycle_time", "surface_finish"];
  return !lowerBetter.includes(metric);
}

function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = x.length;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;

  let num = 0, denX = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    denX += (x[i] - mx) ** 2;
  }

  const slope = denX > 0 ? num / denX : 0;
  const intercept = my - slope * mx;

  // R-squared
  const ssRes = y.reduce((s, yi, i) => s + (yi - (slope * x[i] + intercept)) ** 2, 0);
  const ssTot = y.reduce((s, yi) => s + (yi - my) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}

function determineWinner(deltas: Record<string, { better: string }>): string {
  let aWins = 0, bWins = 0;
  for (const d of Object.values(deltas)) {
    if (d.better === "A") aWins++;
    if (d.better === "B") bWins++;
  }
  if (aWins > bWins) return "A";
  if (bWins > aWins) return "B";
  return "tied";
}

function clamp01(v: number): number {
  return round4(Math.max(0, Math.min(1, v)));
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ============================================================================
// PUBLIC DISPATCHER
// ============================================================================

export function executeBatchAnalyticsAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  log.info(`[BatchAnalyticsEngine] action=${action}`);

  switch (action) {
    case "batch_kpi":
      return batchKPI(params);
    case "batch_trend":
      return batchTrend(params);
    case "batch_compare":
      return batchCompare(params);
    case "batch_summary":
      return batchSummary(params);
    default:
      throw new Error(`BatchAnalyticsEngine: unknown action '${action}'`);
  }
}
