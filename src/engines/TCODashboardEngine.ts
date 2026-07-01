/**
 * TCODashboardEngine — Total Cost of Ownership Dashboard
 *
 * Aggregates all cost streams from PipelineCostModelEngine and provides
 * actionable optimization insights across 6 dashboard views:
 *
 *   1. generateDashboard(job)          → TCODashboardData
 *      Full cost breakdown (10 components), savings summary, top drivers
 *
 *   2. compareCosts(current, optimized) → CostComparison
 *      Side-by-side parameter comparison with delta and ROI parts
 *
 *   3. costDriverAnalysis(job)         → { drivers, pareto_data }
 *      Pareto chart data: drivers sorted by cost, cumulative % curve
 *
 *   4. savingsOpportunities(job)       → { opportunities[] }
 *      Ranked action list: cycle-time, tooling, setup, coolant, shift
 *
 *   5. machineUtilizationCost(machines[]) → { machine, hourly_cost, utilization_pct, effective_cost }[]
 *      Effective cost per hour accounting for idle time
 *
 *   6. historicalTrend(part_number?, date_range?) → { dates[], costs[], moving_avg[] }
 *      Cost-per-part trend from StrategyPerformanceTrackerEngine data
 *
 * Savings opportunity taxonomy:
 *   • adaptive_clearing   — reduce cycle time X% via trochoidal engagement
 *   • premium_tool        — reduce tool cost $Y/part via longer tool life
 *   • setup_reduction     — reduce setup by 15 min → save $Z/batch amortized
 *   • mql_coolant         — MQL vs. flood: save $W/year in coolant costs
 *   • lights_out_shift    — double throughput at 1.3× cost → net 35% CPP reduction
 *
 * @engine TCODashboardEngine
 * @shortcode E1136
 * @dispatcher camDispatcher
 * @actions tco_dashboard, tco_compare, tco_savings, tco_drivers
 * @milestone CAMX-MS13/U06
 */

import {
  pipelineCostModelEngine,
  type PipelineCostInput,
  type CostBreakdown,
  DEFAULT_RATES,
} from "./PipelineCostModelEngine.js";

// ─── Utility ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ─── Job input type ───────────────────────────────────────────────────────────

/**
 * TCO job input — superset of PipelineCostInput with additional
 * fields needed for dashboard views (machine utilization, trends, etc.)
 */
export interface TCOJobInput extends PipelineCostInput {
  /** Part number or identifier used for historical trend lookup. */
  part_number?: string;
  /** Machine identifier for utilization lookup. */
  machine_id?: string;
  /** Planned machine utilization (0–1, e.g. 0.75 = 75%). */
  utilization_pct?: number;
  /** Actual machine hours per year (for MQL coolant savings calculation). */
  annual_machine_hours?: number;
  /** Flood coolant cost per year in USD (for MQL savings estimate). */
  flood_coolant_cost_per_year?: number;
  /** Annual volume of parts (for lights-out shift ROI). */
  annual_volume?: number;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface CostComponent {
  /** Human-readable cost category name. */
  category: string;
  /** Cost per part in USD. */
  amount: number;
  /** Percentage of total cost. */
  pct: number;
}

export interface TCODashboardData {
  /** Part label. */
  label: string;
  /** Full 10-component cost breakdown per part. */
  breakdown: CostBreakdown;
  /** Top 5 cost components sorted by amount descending. */
  top_drivers: CostComponent[];
  /** Total cost per part. */
  total_per_part: number;
  /** Total batch cost. */
  total_batch: number;
  /** Batch size used. */
  batch_size: number;
  /** Estimated annual cost at annual_volume if provided. */
  annual_cost?: number;
  /** Quick savings headline: potential savings per part if all opportunities applied. */
  potential_savings_per_part?: number;
  /** Potential savings as % of total cost. */
  potential_savings_pct?: number;
  /** List of assumptions made during computation. */
  assumptions: string[];
  /** Timestamp of dashboard generation (epoch ms). */
  generated_at: number;
}

export interface CostComparisonResult {
  /** Label for the current (baseline) scenario. */
  current_label: string;
  /** Label for the optimized scenario. */
  optimized_label: string;
  /** Current total cost per part. */
  current_total: number;
  /** Optimized total cost per part. */
  optimized_total: number;
  /** Absolute savings per part (positive = optimized is cheaper). */
  savings_per_part: number;
  /** Savings as percentage of current cost. */
  savings_pct: number;
  /** Number of parts to produce before savings offset any additional tooling/setup cost. */
  roi_parts?: number;
  /** Component-level delta table. */
  component_deltas: {
    category: string;
    current: number;
    optimized: number;
    delta: number;
    delta_pct: number;
  }[];
  /** Current breakdown (full). */
  current_breakdown: CostBreakdown;
  /** Optimized breakdown (full). */
  optimized_breakdown: CostBreakdown;
}

export interface ParetoData {
  /** Ordered list of cost drivers (highest first). */
  drivers: CostComponent[];
  /** Cumulative percentage curve parallel to drivers[]. */
  cumulative_pct: number[];
  /** Index of the "80% line" driver (Pareto threshold). */
  pareto_threshold_index: number;
  /** Total cost used as basis. */
  total_cost: number;
}

export interface CostDriverAnalysisResult {
  drivers: CostComponent[];
  pareto_data: ParetoData;
}

export interface SavingsOpportunity {
  /** Action identifier. */
  action: string;
  /** Human-readable description. */
  description: string;
  /** Estimated savings per part in USD. */
  savings_per_part: number;
  /** Number of parts to produce before the investment pays off (0 if no upfront cost). */
  roi_parts: number;
  /** Priority: "high" | "medium" | "low". */
  priority: "high" | "medium" | "low";
  /** Upfront cost required to capture the savings (USD). */
  upfront_cost?: number;
  /** Basis for the savings estimate. */
  basis: string;
}

export interface SavingsOpportunitiesResult {
  /** Ranked list of savings opportunities (highest savings_per_part first). */
  opportunities: SavingsOpportunity[];
  /** Total potential savings per part if all opportunities are applied. */
  total_potential_savings_per_part: number;
  /** Total potential savings as % of current cost per part. */
  total_potential_savings_pct: number;
  /** Current cost per part (basis). */
  current_cost_per_part: number;
}

export interface MachineUtilizationCostResult {
  /** Machine identifier. */
  machine: string;
  /** Machine type. */
  machine_type: string;
  /** Nominal hourly machine cost (ownership + maintenance + space). */
  hourly_cost: number;
  /** Utilization fraction (0–1). */
  utilization_pct: number;
  /** Effective cost per productive hour (hourly_cost / utilization). */
  effective_cost: number;
  /** Annual idle cost in USD (if annual_hours provided). */
  annual_idle_cost?: number;
  /** Notes. */
  notes: string;
}

export interface HistoricalTrendResult {
  /** Part number filtered on (or "all" if not specified). */
  part_number: string;
  /** ISO date strings for each data point. */
  dates: string[];
  /** Cost per part at each date. */
  costs: number[];
  /** 3-period moving average (NaN-padded at start). */
  moving_avg: number[];
  /** Trend direction: "improving" | "stable" | "worsening". */
  trend: "improving" | "stable" | "worsening";
  /** Total data points. */
  sample_count: number;
  /** Min cost in range. */
  min_cost: number;
  /** Max cost in range. */
  max_cost: number;
  /** Date range used. */
  date_range: { from: string; to: string };
}

// ─── Machine utilization input ────────────────────────────────────────────────

export interface MachineUtilizationInput {
  /** Machine identifier label. */
  machine: string;
  /** Machine type used for default rate lookup. */
  machine_type: "3axis" | "5axis" | "lathe" | "custom";
  /** Override hourly rate USD/hr (otherwise defaults by machine_type). */
  hourly_rate_override?: number;
  /** Actual utilization fraction 0–1 (e.g. 0.75 = 75%). */
  utilization_pct: number;
  /** Annual machine hours (for idle cost calculation). */
  annual_hours?: number;
}

// ─── Historical data record (subset of StrategyExecution) ────────────────────

export interface CostHistoryRecord {
  /** Part number. */
  part_number: string;
  /** ISO date string. */
  date: string;
  /** Cost per part in USD. */
  cost_per_part: number;
}

// ─── Engine class ─────────────────────────────────────────────────────────────

class TCODashboardEngine {

  // ─── In-memory cost history store (lightweight — persisted externally) ──────
  private _history: CostHistoryRecord[] = [];

  // ─── 1. generateDashboard ─────────────────────────────────────────────────

  /**
   * Generate a full TCO dashboard for a job.
   *
   * Computes the 10-component cost breakdown via PipelineCostModelEngine,
   * extracts top drivers, and estimates potential savings headroom from
   * the savingsOpportunities analysis.
   */
  generateDashboard(job: TCOJobInput): TCODashboardData {
    const breakdown = pipelineCostModelEngine.computeCostPerPart(job);
    const total     = breakdown.total_per_part;

    // Top drivers — all 10 components sorted by cost descending
    const topDrivers: CostComponent[] = breakdown.line_items
      .map(li => ({
        category: li.component,
        amount:   li.cost_usd,
        pct:      li.pct_of_total,
      }))
      .filter(d => d.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Potential savings estimate
    let potentialSavings: number | undefined;
    let potentialSavingsPct: number | undefined;
    try {
      const opportunities = this.savingsOpportunities(job);
      potentialSavings    = opportunities.total_potential_savings_per_part;
      potentialSavingsPct = opportunities.total_potential_savings_pct;
    } catch {
      // non-fatal — savings estimate is optional
    }

    const annualVolume = job.annual_volume;
    const annualCost   = annualVolume !== undefined
      ? round2(total * annualVolume)
      : undefined;

    return {
      label:                     breakdown.label,
      breakdown,
      top_drivers:               topDrivers,
      total_per_part:            total,
      total_batch:               breakdown.total_batch,
      batch_size:                breakdown.batch_size,
      annual_cost:               annualCost,
      potential_savings_per_part: potentialSavings !== undefined ? round2(potentialSavings) : undefined,
      potential_savings_pct:     potentialSavingsPct !== undefined ? round2(potentialSavingsPct) : undefined,
      assumptions:               breakdown.assumptions,
      generated_at:              Date.now(),
    };
  }

  // ─── 2. compareCosts ──────────────────────────────────────────────────────

  /**
   * Side-by-side comparison of current vs. optimized manufacturing parameters.
   *
   * Returns a delta table at the component level plus ROI calculation:
   *   roi_parts = upfront_delta_cost / savings_per_part
   * where upfront_delta_cost defaults to 0 (caller can pass via
   * `optimized_params.upfront_cost_delta`).
   */
  compareCosts(
    currentParams:   TCOJobInput,
    optimizedParams: TCOJobInput & { upfront_cost_delta?: number },
  ): CostComparisonResult {
    const curBD  = pipelineCostModelEngine.computeCostPerPart(currentParams);
    const optBD  = pipelineCostModelEngine.computeCostPerPart(optimizedParams);

    const savingsPerPart = round2(curBD.total_per_part - optBD.total_per_part);
    const savingsPct     = curBD.total_per_part > 0
      ? round2(savingsPerPart / curBD.total_per_part * 100)
      : 0;

    // ROI: how many parts to recover any upfront investment
    const upfrontDelta = optimizedParams.upfront_cost_delta ?? 0;
    const roiParts     = upfrontDelta > 0 && savingsPerPart > 0
      ? Math.ceil(upfrontDelta / savingsPerPart)
      : 0;

    // Component-level delta table
    const componentDeltas = curBD.line_items.map((curItem, i) => {
      const optItem  = optBD.line_items[i];
      const delta    = round2(optItem.cost_usd - curItem.cost_usd);
      const deltaPct = curItem.cost_usd > 0
        ? round2(delta / curItem.cost_usd * 100)
        : 0;
      return {
        category:  curItem.component,
        current:   curItem.cost_usd,
        optimized: optItem.cost_usd,
        delta,
        delta_pct: deltaPct,
      };
    });

    return {
      current_label:       curBD.label,
      optimized_label:     optBD.label,
      current_total:       curBD.total_per_part,
      optimized_total:     optBD.total_per_part,
      savings_per_part:    savingsPerPart,
      savings_pct:         savingsPct,
      roi_parts:           roiParts > 0 ? roiParts : undefined,
      component_deltas:    componentDeltas,
      current_breakdown:   curBD,
      optimized_breakdown: optBD,
    };
  }

  // ─── 3. costDriverAnalysis ────────────────────────────────────────────────

  /**
   * Pareto chart data for cost drivers.
   *
   * All 10 components are sorted descending; cumulative percentage is
   * computed so the caller can draw the Pareto curve. The "80% line"
   * index identifies which drivers account for 80% of total cost
   * (Pareto principle in cost analysis).
   */
  costDriverAnalysis(job: TCOJobInput): CostDriverAnalysisResult {
    const breakdown = pipelineCostModelEngine.computeCostPerPart(job);
    const total     = breakdown.total_per_part;

    const drivers: CostComponent[] = breakdown.line_items
      .map(li => ({
        category: li.component,
        amount:   li.cost_usd,
        pct:      total > 0 ? round4(li.cost_usd / total * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Cumulative % curve
    let cumulative = 0;
    const cumulativePct: number[] = [];
    let paretoThresholdIdx = drivers.length - 1;
    let foundThreshold     = false;

    for (let i = 0; i < drivers.length; i++) {
      cumulative += drivers[i].pct;
      cumulativePct.push(round4(cumulative));
      if (!foundThreshold && cumulative >= 80) {
        paretoThresholdIdx = i;
        foundThreshold     = true;
      }
    }

    const paretoData: ParetoData = {
      drivers,
      cumulative_pct:          cumulativePct,
      pareto_threshold_index:  paretoThresholdIdx,
      total_cost:              total,
    };

    return { drivers, pareto_data: paretoData };
  }

  // ─── 4. savingsOpportunities ──────────────────────────────────────────────

  /**
   * Ranked list of savings opportunities for a job.
   *
   * Five canonical opportunity types are evaluated:
   *
   *   1. adaptive_clearing     — 20% cycle-time reduction from trochoidal/adaptive
   *                              engagement (applicable when cycle_time_min > 10)
   *   2. premium_tool          — 2× tool life at 1.4× price → ~30% tooling cost reduction
   *                              (applicable when tool_wear_cost > 0)
   *   3. setup_reduction       — 15-min setup time reduction at labor rate, amortized
   *                              (applicable when setup_time_min > 15)
   *   4. mql_coolant           — MQL vs. flood coolant saves ~$3,000–$8,000/year
   *                              amortized over annual_volume (applicable when annual_volume > 0)
   *   5. lights_out_shift      — second shift at 1.3× cost, doubles throughput → 35% CPP drop
   *                              (applicable when annual_volume > 0 and machine utilization < 70%)
   *
   * All opportunities are ranked by savings_per_part descending.
   */
  savingsOpportunities(job: TCOJobInput): SavingsOpportunitiesResult {
    const breakdown = pipelineCostModelEngine.computeCostPerPart(job);
    const current   = breakdown.total_per_part;
    const laborRate = (job.labor_rate_per_hr ?? DEFAULT_RATES.labor_rate_per_hr) / 60; // per min
    const batchSize = Math.max(1, job.batch_size ?? 1);

    const opportunities: SavingsOpportunity[] = [];

    // ── 1. Adaptive clearing (cycle-time reduction) ───────────────────────────
    const cycleMin = job.cycle_time_min;
    if (cycleMin > 10) {
      const machineRatePerMin = (job.machine_rate_per_hr ??
        (job.machine_type === "5axis"
          ? DEFAULT_RATES.machine_rate_5axis_per_hr
          : job.machine_type === "lathe"
            ? DEFAULT_RATES.machine_rate_lathe_per_hr
            : DEFAULT_RATES.machine_rate_3axis_per_hr)) / 60;

      const cycleTimeSavingMin  = cycleMin * 0.20;
      const machiningCostSaving = round2(cycleTimeSavingMin * machineRatePerMin);
      // Energy savings proportional
      const powerKw     = job.power_kw ?? 0;
      const energyRate  = job.energy_rate_per_kwh ?? DEFAULT_RATES.energy_rate_per_kwh;
      const energySaving = round2(powerKw * (cycleTimeSavingMin / 60) * energyRate);
      const totalSaving  = round2(machiningCostSaving + energySaving);

      if (totalSaving > 0.01) {
        opportunities.push({
          action:          "Switch to adaptive clearing",
          description:     `Reduce cycle time by ~20% (${round2(cycleTimeSavingMin)} min) using trochoidal/adaptive engagement. Machining cost reduction: $${machiningCostSaving}/part.`,
          savings_per_part: totalSaving,
          roi_parts:        0,   // no upfront capital required beyond CAM reprogramming
          upfront_cost:     0,
          priority:         totalSaving > current * 0.10 ? "high" : "medium",
          basis:            "20% cycle-time reduction at current machine rate; energy savings proportional",
        });
      }
    }

    // ── 2. Premium tool (longer life) ─────────────────────────────────────────
    const toolWearCost = breakdown.tool_wear_cost;
    if (toolWearCost > 0 && (job.tools?.length ?? 0) > 0) {
      // Model: premium tool = 1.4× price, 2.2× life → net reduction ~36%
      const premiumToolCostEstimate = round2(toolWearCost * (1.4 / 2.2));
      const toolSaving = round2(toolWearCost - premiumToolCostEstimate);

      if (toolSaving > 0.01) {
        // Upfront: premium tool costs 1.4× per tool. Approximate first-buy delta.
        const upfrontEstimate = round2(
          (job.tools ?? []).reduce((sum, t) => sum + t.tool_price_usd * 0.4, 0)
        );
        const roiParts = toolSaving > 0
          ? Math.ceil(upfrontEstimate / toolSaving)
          : 0;

        opportunities.push({
          action:          "Buy premium tool grade",
          description:     `Upgrade to premium coated insert/end mill at ~1.4× price with ~2.2× tool life. Tooling cost: $${toolWearCost.toFixed(2)} → $${premiumToolCostEstimate.toFixed(2)}/part.`,
          savings_per_part: toolSaving,
          roi_parts:        roiParts,
          upfront_cost:     upfrontEstimate,
          priority:         toolSaving > current * 0.05 ? "high" : "medium",
          basis:            "Premium tool: 1.4× price / 2.2× life = 36% tooling cost reduction",
        });
      }
    }

    // ── 3. Setup reduction by 15 min ──────────────────────────────────────────
    const setupTimeMin = job.setup_time_min ?? 0;
    if (setupTimeMin > 15) {
      const reductionMin  = 15;
      const setupSaving   = round2((reductionMin * laborRate) / batchSize);

      if (setupSaving > 0.001) {
        opportunities.push({
          action:          "Reduce setup time by 15 min",
          description:     `Standardize fixturing and tooling pre-set to cut setup by 15 min/batch. Saves $${setupSaving.toFixed(3)}/part ($${round2(reductionMin * laborRate * 60 / 60).toFixed(2)}/batch).`,
          savings_per_part: setupSaving,
          roi_parts:        0,
          upfront_cost:     0,
          priority:         setupSaving > current * 0.03 ? "medium" : "low",
          basis:            `15 min × $${(laborRate * 60).toFixed(2)}/hr ÷ batch ${batchSize}`,
        });
      }
    }

    // ── 4. Switch to MQL coolant ──────────────────────────────────────────────
    const annualVol   = job.annual_volume;
    const floodCost   = job.flood_coolant_cost_per_year;
    if (annualVol && annualVol > 0) {
      // MQL saves ~65% of flood coolant cost (industry benchmark)
      // Default flood cost if not provided: $6,000/year (modest single-machine shop)
      const floodAnnual   = floodCost ?? 6000;
      const mqlAnnual     = round2(floodAnnual * 0.35);
      const annualSaving  = round2(floodAnnual - mqlAnnual);
      const savingPerPart = round2(annualSaving / annualVol);

      if (savingPerPart > 0.001) {
        // MQL system upfront cost ~$4,500–$8,000; use midpoint $6,000
        const mqlUpfront = 6000;
        const roiParts   = Math.ceil(mqlUpfront / savingPerPart);

        opportunities.push({
          action:          "Switch to MQL coolant",
          description:     `Minimum Quantity Lubrication reduces coolant cost by ~65%. Annual saving: $${annualSaving.toFixed(0)}/yr → $${savingPerPart.toFixed(3)}/part at ${annualVol} parts/yr.`,
          savings_per_part: savingPerPart,
          roi_parts:        roiParts,
          upfront_cost:     mqlUpfront,
          priority:         savingPerPart > current * 0.01 ? "medium" : "low",
          basis:            `MQL saves ~65% of flood coolant cost. Annual: $${floodAnnual.toFixed(0)} → $${mqlAnnual.toFixed(0)}`,
        });
      }
    }

    // ── 5. Lights-out second shift ────────────────────────────────────────────
    const utilizationPct = job.utilization_pct ?? 0;
    if (annualVol && annualVol > 0 && utilizationPct < 0.70) {
      // Model: running a second unattended shift doubles throughput at 1.30× total cost
      // (lighting, minimal supervision, slightly higher maintenance risk)
      // Net effect: cost per part = (1.30 × current_total) / 2.0 = 0.65 × current
      // → 35% CPP reduction on the second-shift volume
      const secondShiftCPP    = round2(current * 0.65);
      const avgCPP            = round2((current + secondShiftCPP) / 2);
      const savingPerPart     = round2(current - avgCPP);

      if (savingPerPart > 0) {
        opportunities.push({
          action:          "Run lights-out second shift",
          description:     `Enable unattended second shift to double throughput at 1.3× cost. Second-shift CPP: $${secondShiftCPP.toFixed(2)} vs. $${current.toFixed(2)} day-shift → blended CPP: $${avgCPP.toFixed(2)}.`,
          savings_per_part: savingPerPart,
          roi_parts:        0,   // primarily organizational, not capital
          upfront_cost:     0,
          priority:         savingPerPart > current * 0.15 ? "high" : "medium",
          basis:            "Second shift at 1.3× cost / 2.0× output → 35% CPP reduction on shift volume",
        });
      }
    }

    // Sort by savings descending and assign priorities
    opportunities.sort((a, b) => b.savings_per_part - a.savings_per_part);

    // Re-assign priorities by rank
    opportunities.forEach((opp, idx) => {
      if (idx === 0 && opp.savings_per_part > current * 0.05) opp.priority = "high";
      else if (opp.savings_per_part > current * 0.02) opp.priority = "medium";
      else opp.priority = "low";
    });

    // Total potential savings (additive, optimistic — assumes non-overlapping effects)
    const totalSavings = round2(opportunities.reduce((s, o) => s + o.savings_per_part, 0));
    const totalPct     = current > 0 ? round2(totalSavings / current * 100) : 0;

    return {
      opportunities,
      total_potential_savings_per_part: totalSavings,
      total_potential_savings_pct:      totalPct,
      current_cost_per_part:            current,
    };
  }

  // ─── 5. machineUtilizationCost ───────────────────────────────────────────

  /**
   * Compute effective hourly cost for each machine accounting for idle time.
   *
   * effective_cost = nominal_hourly_cost / utilization_pct
   *
   * This reveals the "true" cost per productive hour. A machine running at 50%
   * utilization has an effective cost 2× its nominal rate — idle overhead must
   * still be covered.
   */
  machineUtilizationCost(machines: MachineUtilizationInput[]): MachineUtilizationCostResult[] {
    return machines.map(m => {
      const nominalRate = m.hourly_rate_override
        ?? (m.machine_type === "5axis"
          ? DEFAULT_RATES.machine_rate_5axis_per_hr
          : m.machine_type === "lathe"
            ? DEFAULT_RATES.machine_rate_lathe_per_hr
            : DEFAULT_RATES.machine_rate_3axis_per_hr);

      const util         = Math.max(0.01, Math.min(1, m.utilization_pct));
      const effectiveCost = round2(nominalRate / util);

      // Annual idle cost: idle hours × nominal rate
      let annualIdleCost: number | undefined;
      if (m.annual_hours !== undefined) {
        const idleHours    = m.annual_hours * (1 - util);
        annualIdleCost     = round2(idleHours * nominalRate);
      }

      const utilizationPctDisplay = round2(util * 100);
      const idleNote = annualIdleCost !== undefined
        ? ` Annual idle cost: $${annualIdleCost.toLocaleString()}.`
        : "";

      return {
        machine:           m.machine,
        machine_type:      m.machine_type,
        hourly_cost:       round2(nominalRate),
        utilization_pct:   utilizationPctDisplay,
        effective_cost:    effectiveCost,
        annual_idle_cost:  annualIdleCost,
        notes: `At ${utilizationPctDisplay}% utilization, effective cost is $${effectiveCost}/hr (${round2((1 / util - 1) * 100)}% overhead premium).${idleNote}`,
      };
    });
  }

  // ─── 6. historicalTrend ───────────────────────────────────────────────────

  /**
   * Cost-per-part trend from the in-memory history store.
   *
   * Returns daily observations with a 3-period moving average to smooth
   * noise. Trend direction is determined by linear regression slope:
   *   • slope < −0.5%/period  → "improving"
   *   • slope > +0.5%/period  → "worsening"
   *   • otherwise             → "stable"
   *
   * The history store is populated via recordCostHistory() which is
   * called automatically by generateDashboard() when a part_number is present.
   * External callers (e.g. from StrategyPerformanceTrackerEngine integration)
   * can also inject records via injectHistory().
   */
  historicalTrend(
    part_number?: string,
    date_range?:  { from?: string; to?: string },
  ): HistoricalTrendResult {
    let records = part_number
      ? this._history.filter(r => r.part_number === part_number)
      : [...this._history];

    // Date range filter
    const fromDate = date_range?.from ? new Date(date_range.from) : null;
    const toDate   = date_range?.to   ? new Date(date_range.to)   : null;

    if (fromDate || toDate) {
      records = records.filter(r => {
        const d = new Date(r.date);
        if (fromDate && d < fromDate) return false;
        if (toDate   && d > toDate)   return false;
        return true;
      });
    }

    // Sort chronologically
    records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const dates  = records.map(r => r.date);
    const costs  = records.map(r => r.cost_per_part);

    // 3-period moving average
    const movingAvg: number[] = costs.map((_, i) => {
      if (i < 2) return NaN;
      return round2((costs[i - 2] + costs[i - 1] + costs[i]) / 3);
    });

    // Trend: linear regression slope using first/last thirds of data
    let trend: "improving" | "stable" | "worsening" = "stable";
    if (costs.length >= 4) {
      const n      = costs.length;
      const sumX   = (n * (n - 1)) / 2;
      const sumX2  = (n * (n - 1) * (2 * n - 1)) / 6;
      const sumY   = costs.reduce((a, b) => a + b, 0);
      const sumXY  = costs.reduce((acc, y, i) => acc + i * y, 0);
      const slope  = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const meanY  = sumY / n;
      const slopeRelative = meanY > 0 ? (slope / meanY) * 100 : 0;

      if (slopeRelative < -0.5)      trend = "improving";
      else if (slopeRelative > 0.5)  trend = "worsening";
    }

    const minCost = costs.length > 0 ? Math.min(...costs) : 0;
    const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

    const actualFrom = dates[0] ?? (date_range?.from ?? "");
    const actualTo   = dates[dates.length - 1] ?? (date_range?.to ?? "");

    return {
      part_number:  part_number ?? "all",
      dates,
      costs,
      moving_avg:   movingAvg,
      trend,
      sample_count: records.length,
      min_cost:     round2(minCost),
      max_cost:     round2(maxCost),
      date_range:   { from: actualFrom, to: actualTo },
    };
  }

  // ─── History management ───────────────────────────────────────────────────

  /**
   * Record a cost data point for historical trend tracking.
   * Called automatically by generateDashboard() when part_number is set.
   */
  recordCostHistory(record: CostHistoryRecord): void {
    this._history.push(record);
  }

  /**
   * Inject an array of historical records (e.g. from StrategyPerformanceTrackerEngine
   * integration or CSV import).
   */
  injectHistory(records: CostHistoryRecord[]): { injected: number } {
    this._history.push(...records);
    return { injected: records.length };
  }

  /**
   * Clear history for a given part number (or all if omitted).
   */
  clearHistory(part_number?: string): { cleared: number } {
    const before = this._history.length;
    if (part_number) {
      this._history = this._history.filter(r => r.part_number !== part_number);
    } else {
      this._history = [];
    }
    return { cleared: before - this._history.length };
  }

  /**
   * Return raw history records (for diagnostics / export).
   */
  getHistory(part_number?: string): CostHistoryRecord[] {
    return part_number
      ? this._history.filter(r => r.part_number === part_number)
      : [...this._history];
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const tcoDashboardEngine = new TCODashboardEngine();
export { TCODashboardEngine };
