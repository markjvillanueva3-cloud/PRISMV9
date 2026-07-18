/**
 * OEECalculatorEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates Overall Equipment Effectiveness (OEE) — the gold standard
 * KPI for manufacturing productivity. OEE = Availability × Performance × Quality.
 *
 * Models: planned vs unplanned downtime, speed losses, quality losses,
 * and six big losses categorization per TPM methodology.
 *
 * Actions: oee_calc, oee_trend, oee_losses
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OEEInput {
  planned_production_time_min: number;
  actual_run_time_min: number;
  planned_downtime_min: number;       // scheduled maintenance, breaks
  unplanned_downtime_min: number;     // breakdowns, changeovers
  ideal_cycle_time_sec: number;       // per part
  actual_cycle_time_sec: number;
  total_parts_produced: number;
  good_parts: number;
  machine_id?: string;
  shift?: string;
  date?: string;
}

/** O E E Result configuration/data structure.
 */
export interface OEEResult {
  oee_pct: number;
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  world_class: boolean;               // OEE >= 85%
  six_big_losses: {
    breakdowns_min: number;
    setup_adjustment_min: number;
    minor_stops_min: number;
    reduced_speed_min: number;
    startup_rejects: number;
    production_rejects: number;
  };
  parts_per_hour_actual: number;
  parts_per_hour_ideal: number;
  time_lost_min: number;
  recommendations: string[];
}

/** A single Six-Big-Losses entry, bucketed into the OEE component it degrades.
 *  Shape mirrors the OEEDashboardPage `BigLoss` FE contract exactly (id/name/category/minutes_lost/description). */
export interface OEELoss {
  id: string;
  name: string;
  category: "availability" | "performance" | "quality";
  minutes_lost: number;
  description: string;
}

/** One day of OEE history. Shape mirrors the OEEDashboardPage `TrendDay` FE contract exactly. */
export interface OEETrendDay {
  date: string;
  oee_pct: number;
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** O E E Calculator Engine engine/manager.
 */
export class OEECalculatorEngine {
  calculate(input: OEEInput): OEEResult {
    // Available time = planned production - planned downtime
    const availableTime = input.planned_production_time_min - input.planned_downtime_min;

    // Availability = run time / available time (clamped to [0, 1])
    const runTime = input.actual_run_time_min;
    const availability = Math.min(1, availableTime > 0 ? runTime / availableTime : 0);

    // Performance = (ideal cycle time × total parts) / run time (clamped to [0, 1])
    const idealRunTime = (input.ideal_cycle_time_sec * input.total_parts_produced) / 60;
    const performance = Math.min(1, runTime > 0 ? idealRunTime / runTime : 0);

    // Quality = good parts / total parts (clamped to [0, 1])
    const quality = Math.min(1, input.total_parts_produced > 0 ? input.good_parts / input.total_parts_produced : 0);

    // OEE = A × P × Q (max 100%). Ref: Nakajima (1988), SEMI E10-0304E
    const oee = availability * performance * quality * 100;

    // Six big losses (default split — provide measured data for accuracy)
    // TODO: Accept measured breakdown data instead of assuming 60/40 split
    const breakdowns = input.unplanned_downtime_min * 0.6; // default: 60% breakdowns
    const setupAdj = input.unplanned_downtime_min * 0.4;   // default: 40% setup/changeover
    const speedLoss = runTime - idealRunTime;
    const minorStops = speedLoss > 0 ? speedLoss * 0.3 : 0;
    const reducedSpeed = speedLoss > 0 ? speedLoss * 0.7 : 0;
    const rejects = input.total_parts_produced - input.good_parts;
    const startupRejects = Math.round(rejects * 0.2);
    const prodRejects = rejects - startupRejects;

    // Throughput
    const actualPPH = runTime > 0 ? input.total_parts_produced / (runTime / 60) : 0;
    const idealPPH = input.ideal_cycle_time_sec > 0 ? 3600 / input.ideal_cycle_time_sec : 0;

    // Time lost
    const timeLost = availableTime - (input.good_parts * input.ideal_cycle_time_sec / 60);

    // Recommendations
    const recs: string[] = [];
    /** If.
     * @param availability - availability
     * @returns void
     */
    if (availability * 100 < 90) {
      recs.push(`Low availability (${(availability * 100).toFixed(1)}%) — focus on reducing unplanned downtime (${input.unplanned_downtime_min}min)`);
    }
    /** If.
     * @param performance - performance
     * @returns void
     */
    if (performance * 100 < 95) {
      recs.push(`Performance gap (${(performance * 100).toFixed(1)}%) — investigate speed losses and minor stops`);
    }
    /** If.
     * @param quality - quality
     * @returns void
     */
    if (quality * 100 < 99) {
      recs.push(`Quality below 99% (${(quality * 100).toFixed(1)}%) — ${rejects} rejects need root cause analysis`);
    }
    /** If.
     * @param oee - oee
     * @returns void
     */
    if (oee >= 85) {
      recs.push("World-class OEE (≥85%) — maintain current practices");
    } else if (oee >= 65) {
      recs.push("Typical OEE — significant improvement opportunity exists");
    } else {
      recs.push("Low OEE — prioritize largest loss category for improvement");
    }

    return {
      oee_pct: Math.round(oee * 10) / 10,
      availability_pct: Math.round(availability * 1000) / 10,
      performance_pct: Math.round(performance * 1000) / 10,
      quality_pct: Math.round(quality * 1000) / 10,
      world_class: oee >= 85,
      six_big_losses: {
        breakdowns_min: Math.round(breakdowns * 10) / 10,
        setup_adjustment_min: Math.round(setupAdj * 10) / 10,
        minor_stops_min: Math.round(minorStops * 10) / 10,
        reduced_speed_min: Math.round(reducedSpeed * 10) / 10,
        startup_rejects: startupRejects,
        production_rejects: prodRejects,
      },
      parts_per_hour_actual: Math.round(actualPPH * 10) / 10,
      parts_per_hour_ideal: Math.round(idealPPH * 10) / 10,
      time_lost_min: Math.round(timeLost * 10) / 10,
      recommendations: recs,
    };
  }

  /**
   * Project the Six Big Losses (from `calculate()`) into the OEE component each one degrades,
   * for the OEEDashboardPage Losses tab. Pure derivation of `calculate()` -- no new data, no I/O.
   * Reject COUNTS (startup/production) are converted to minutes lost via the ideal cycle time
   * (each scrapped part consumed `ideal_cycle_time_sec` of capacity). Sorted worst-first to match
   * the page's ranked display. TPM bucketing per Nakajima (1988): breakdowns + setup/changeover ->
   * availability, speed losses (minor stops + reduced speed) -> performance, defects -> quality.
   * @param input - the OEE measurement window (same shape `calculate()` consumes).
   * @returns the six losses as OEELoss[] (FE BigLoss contract), ranked by minutes_lost desc.
   */
  losses(input: OEEInput): OEELoss[] {
    // FAIL-CLOSED (symmetric with trend([]) -> []): if the window is UNMEASURED -- the core fields the
    // six-big-losses math depends on are missing / non-finite (e.g. the FE's first-load empty {} body) --
    // return [] so the page shows honest "Unavailable" rather than fabricated "0 min lost / Live" cards.
    // The fields below are exactly those calculate() reads for the loss breakdown; any absent/NaN one means
    // there is no real measurement to project.
    if (!isMeasuredWindow(input)) return [];

    const r = this.calculate(input);
    const l = r.six_big_losses;
    // Convert reject counts to minutes lost: each defect consumed one ideal cycle of capacity.
    const idealCycleMin = (input.ideal_cycle_time_sec ?? 0) / 60;
    const startupMin = Math.round(l.startup_rejects * idealCycleMin * 10) / 10;
    const prodMin = Math.round(l.production_rejects * idealCycleMin * 10) / 10;

    // Clamp every emitted minutes_lost to a finite, non-negative value: a loss is time lost, never negative,
    // and a NaN/Infinity (degenerate input) must not render as a 0-width or overflowing bar on the page.
    const safeMin = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 0);

    const losses: OEELoss[] = [
      {
        id: "breakdowns",
        name: "Breakdowns",
        category: "availability",
        minutes_lost: safeMin(l.breakdowns_min),
        description: "Equipment failures and unplanned stoppages that halt production.",
      },
      {
        id: "setup_adjustment",
        name: "Setup & Adjustment",
        category: "availability",
        minutes_lost: safeMin(l.setup_adjustment_min),
        description: "Changeover, tooling swaps, and adjustment time between runs.",
      },
      {
        id: "minor_stops",
        name: "Minor Stops",
        category: "performance",
        minutes_lost: safeMin(l.minor_stops_min),
        description: "Brief stoppages, jams, and idling that interrupt steady cutting.",
      },
      {
        id: "reduced_speed",
        name: "Reduced Speed",
        category: "performance",
        minutes_lost: safeMin(l.reduced_speed_min),
        description: "Running below the ideal cycle time -- slow cycles and derated feeds.",
      },
      {
        id: "startup_rejects",
        name: "Startup Rejects",
        category: "quality",
        minutes_lost: safeMin(startupMin),
        description: `${l.startup_rejects} scrap part(s) during warm-up / first-off before the process stabilized.`,
      },
      {
        id: "production_rejects",
        name: "Production Rejects",
        category: "quality",
        minutes_lost: safeMin(prodMin),
        description: `${l.production_rejects} scrap part(s) produced during steady-state running.`,
      },
    ];

    // Worst-first (matches the page's ranked-by-impact display).
    return losses.sort((a, b) => b.minutes_lost - a.minutes_lost);
  }

  /**
   * Project a series of daily OEE measurement windows into per-day OEE history for the
   * OEEDashboardPage Trends tab. Pure derivation of `calculate()` -- no synthetic/random data.
   * Returns [] when no samples are supplied so the fail-closed page shows honest "Unavailable"
   * rather than fabricated trend data; samples with no `date` are dropped (the FE drops them too).
   * @param samples - an array of daily OEEInput measurements (each should carry a `date`).
   * @returns OEETrendDay[] (FE TrendDay contract), one row per dated sample, in input order.
   */
  trend(samples: OEEInput[]): OEETrendDay[] {
    if (!Array.isArray(samples) || samples.length === 0) return [];
    const days: OEETrendDay[] = [];
    for (const sample of samples) {
      const date = sample?.date;
      if (typeof date !== "string" || date.length === 0) continue; // drop dateless rows (FE drops them)
      const r = this.calculate(sample);
      days.push({
        date,
        oee_pct: r.oee_pct,
        availability_pct: r.availability_pct,
        performance_pct: r.performance_pct,
        quality_pct: r.quality_pct,
      });
    }
    return days;
  }
}

/**
 * Is this OEEInput a REAL measurement window, or an empty/partial first-load body?
 * The six-big-losses projection (losses()) is only meaningful when the fields its math reads are
 * present finite numbers; an empty {} (the FE's first-load analyticsOEELosses({}) call) or a window
 * missing core fields has nothing to project -> losses() returns [] so the page shows honest
 * "Unavailable" instead of fabricated "0 min lost" cards. (Negatives are allowed through here so a
 * genuine bad-data window still surfaces -- the per-loss safeMin() clamp keeps the rendered bars sane.)
 */
function isMeasuredWindow(input: OEEInput): boolean {
  if (!input || typeof input !== "object") return false;
  const required: Array<keyof OEEInput> = [
    "planned_production_time_min",
    "actual_run_time_min",
    "planned_downtime_min",
    "unplanned_downtime_min",
    "ideal_cycle_time_sec",
    "total_parts_produced",
    "good_parts",
  ];
  return required.every((k) => Number.isFinite(input[k] as number));
}

/** Oee Calculator Engine constant.
 */
export const oeeCalculatorEngine = new OEECalculatorEngine();
