/**
 * ShopFloorAnalyticsEngine — R21-MS3
 *
 * Provides shop-floor-level analytics: OEE calculation, machine utilization
 * tracking, bottleneck detection, and capacity planning / forecasting.
 *
 * Actions:
 *   sf_oee          — Calculate Overall Equipment Effectiveness
 *   sf_utilization   — Analyse machine / cell utilization
 *   sf_bottleneck    — Detect production bottlenecks
 *   sf_capacity      — Capacity planning & forecasting
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduledDowntime {
  reason: string;
  minutes: number;
}

interface QualityRecord {
  total_parts: number;
  good_parts: number;
  rework_parts?: number;
  scrap_parts?: number;
}

interface OEEInput {
  machine_id?: string;
  planned_production_minutes: number;
  actual_run_minutes: number;
  ideal_cycle_time_seconds: number;
  total_pieces: number;
  good_pieces: number;
  scheduled_downtime?: ScheduledDowntime[];
  unplanned_downtime_minutes?: number;
}

interface UtilizationInput {
  machines: {
    machine_id: string;
    machine_type?: string;
    shift_hours: number;
    run_hours: number;
    idle_hours?: number;
    setup_hours?: number;
    maintenance_hours?: number;
  }[];
  period?: string;
}

interface BottleneckInput {
  stations: {
    station_id: string;
    cycle_time_seconds: number;
    buffer_before?: number;
    buffer_after?: number;
    downtime_pct?: number;
    scrap_pct?: number;
    operators?: number;
  }[];
  takt_time_seconds?: number;
  demand_per_shift?: number;
  shift_hours?: number;
}

interface CapacityInput {
  machines: {
    machine_id: string;
    available_hours_per_week: number;
    current_load_hours: number;
    efficiency_pct?: number;
    planned_maintenance_hours?: number;
  }[];
  demand_forecast?: {
    period: string;
    required_hours: number;
  }[];
  planning_horizon_weeks?: number;
}

// ---------------------------------------------------------------------------
// Machine-type reference data — typical OEE benchmarks
// ---------------------------------------------------------------------------

const OEE_BENCHMARKS: Record<string, { world_class: number; typical: number; low: number }> = {
  cnc_3axis:  { world_class: 0.85, typical: 0.65, low: 0.45 },
  cnc_5axis:  { world_class: 0.82, typical: 0.60, low: 0.40 },
  cnc_lathe:  { world_class: 0.87, typical: 0.68, low: 0.48 },
  cnc_grinder:{ world_class: 0.80, typical: 0.58, low: 0.38 },
  cnc_edm:    { world_class: 0.75, typical: 0.55, low: 0.35 },
  assembly:   { world_class: 0.90, typical: 0.72, low: 0.50 },
  inspection: { world_class: 0.92, typical: 0.78, low: 0.55 },
  default:    { world_class: 0.85, typical: 0.65, low: 0.45 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function rateOEE(oee: number, machineType: string): string {
  const bench = OEE_BENCHMARKS[machineType] ?? OEE_BENCHMARKS.default;
  if (oee >= bench.world_class) return "world_class";
  if (oee >= bench.typical) return "good";
  if (oee >= bench.low) return "acceptable";
  return "needs_improvement";
}

// ---------------------------------------------------------------------------
// sf_oee — Overall Equipment Effectiveness
// ---------------------------------------------------------------------------

function computeOEE(input: OEEInput) {
  const {
    machine_id = "machine_1",
    planned_production_minutes,
    actual_run_minutes,
    ideal_cycle_time_seconds,
    total_pieces,
    good_pieces,
    scheduled_downtime = [],
    unplanned_downtime_minutes = 0,
  } = input;

  const scheduledDown = scheduled_downtime.reduce((s, d) => s + d.minutes, 0);
  const netPlanned = planned_production_minutes - scheduledDown;
  const operatingTime = actual_run_minutes - unplanned_downtime_minutes;

  // Availability = operating time / net planned time
  const availability = netPlanned > 0 ? clamp01(operatingTime / netPlanned) : 0;

  // Performance = (ideal cycle * total pieces) / operating time
  const idealRunMinutes = (ideal_cycle_time_seconds * total_pieces) / 60;
  const performance = operatingTime > 0 ? clamp01(idealRunMinutes / operatingTime) : 0;

  // Quality = good pieces / total pieces
  const quality = total_pieces > 0 ? clamp01(good_pieces / total_pieces) : 0;

  const oee = availability * performance * quality;

  // Six big losses breakdown
  const downtimeLoss = netPlanned > 0 ? (1 - availability) * netPlanned : 0;
  const speedLoss = operatingTime > 0 ? (1 - performance) * operatingTime : 0;
  const qualityLoss = total_pieces > 0 ? (1 - quality) * total_pieces : 0;

  const machineType = "default";
  const rating = rateOEE(oee, machineType);
  const bench = OEE_BENCHMARKS[machineType];

  const recommendations: string[] = [];
  if (availability < 0.90) recommendations.push("Reduce unplanned downtime — consider predictive maintenance (pm_predict_wear)");
  if (performance < 0.95) recommendations.push("Investigate speed losses — small stops, reduced speed cycles");
  if (quality < 0.99) recommendations.push("Address quality defects — root cause analysis on scrap/rework");

  return {
    machine_id,
    oee: Math.round(oee * 10000) / 10000,
    oee_pct: pct(oee),
    availability: Math.round(availability * 10000) / 10000,
    performance: Math.round(performance * 10000) / 10000,
    quality: Math.round(quality * 10000) / 10000,
    rating,
    six_big_losses: {
      downtime_loss_minutes: Math.round(downtimeLoss * 10) / 10,
      speed_loss_minutes: Math.round(speedLoss * 10) / 10,
      quality_loss_pieces: Math.round(qualityLoss),
    },
    time_analysis: {
      planned_production_minutes,
      scheduled_downtime_minutes: scheduledDown,
      net_planned_minutes: Math.round(netPlanned * 10) / 10,
      operating_minutes: Math.round(operatingTime * 10) / 10,
      unplanned_downtime_minutes,
    },
    benchmark: bench,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// sf_utilization — Machine / cell utilization
// ---------------------------------------------------------------------------

function computeUtilization(input: UtilizationInput) {
  const { machines, period = "shift" } = input;

  const results = machines.map((m) => {
    const totalHours = m.shift_hours;
    const run = m.run_hours;
    const idle = m.idle_hours ?? 0;
    const setup = m.setup_hours ?? 0;
    const maint = m.maintenance_hours ?? 0;
    const unaccounted = Math.max(0, totalHours - run - idle - setup - maint);

    const utilization = totalHours > 0 ? clamp01(run / totalHours) : 0;
    const productiveRatio = totalHours > 0 ? clamp01((run - setup) / totalHours) : 0;

    let status: string;
    if (utilization >= 0.85) status = "high";
    else if (utilization >= 0.65) status = "moderate";
    else if (utilization >= 0.40) status = "low";
    else status = "underutilized";

    return {
      machine_id: m.machine_id,
      machine_type: m.machine_type ?? "unknown",
      utilization: Math.round(utilization * 10000) / 10000,
      utilization_pct: pct(utilization),
      productive_ratio: Math.round(productiveRatio * 10000) / 10000,
      status,
      breakdown_hours: {
        run,
        idle,
        setup,
        maintenance: maint,
        unaccounted: Math.round(unaccounted * 100) / 100,
      },
    };
  });

  const avgUtil = results.length > 0
    ? results.reduce((s, r) => s + r.utilization, 0) / results.length
    : 0;

  // Identify least and most utilized
  const sorted = [...results].sort((a, b) => a.utilization - b.utilization);
  const leastUtilized = sorted.length > 0 ? sorted[0].machine_id : null;
  const mostUtilized = sorted.length > 0 ? sorted[sorted.length - 1].machine_id : null;

  const recommendations: string[] = [];
  const underused = results.filter((r) => r.utilization < 0.40);
  if (underused.length > 0)
    recommendations.push(`${underused.length} machine(s) below 40% utilization — consider load redistribution`);

  const overloaded = results.filter((r) => r.utilization > 0.92);
  if (overloaded.length > 0)
    recommendations.push(`${overloaded.length} machine(s) above 92% utilization — risk of no maintenance window`);

  const highSetup = results.filter((r) => {
    const sh = machines.find((m) => m.machine_id === r.machine_id)?.setup_hours ?? 0;
    const th = machines.find((m) => m.machine_id === r.machine_id)?.shift_hours ?? 1;
    return sh / th > 0.15;
  });
  if (highSetup.length > 0)
    recommendations.push(`${highSetup.length} machine(s) with >15% setup time — SMED improvements advised`);

  return {
    period,
    total_machines: results.length,
    fleet_avg_utilization: Math.round(avgUtil * 10000) / 10000,
    fleet_avg_utilization_pct: pct(avgUtil),
    least_utilized: leastUtilized,
    most_utilized: mostUtilized,
    machines: results,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// sf_bottleneck — Production bottleneck detection
// ---------------------------------------------------------------------------

function detectBottlenecks(input: BottleneckInput) {
  const { stations, takt_time_seconds, demand_per_shift, shift_hours = 8 } = input;

  // Calculate effective takt time
  let takt = takt_time_seconds;
  if (!takt && demand_per_shift && shift_hours) {
    takt = (shift_hours * 3600) / demand_per_shift;
  }

  // Effective cycle time = cycle_time / (1 - downtime_pct) / (1 - scrap_pct)
  const analyzed = stations.map((st) => {
    const dt = st.downtime_pct ?? 0;
    const scrap = st.scrap_pct ?? 0;
    const effectiveCycle = st.cycle_time_seconds / ((1 - dt / 100) * (1 - scrap / 100));
    const throughputPerHour = 3600 / effectiveCycle;

    return {
      station_id: st.station_id,
      raw_cycle_seconds: st.cycle_time_seconds,
      effective_cycle_seconds: Math.round(effectiveCycle * 100) / 100,
      throughput_per_hour: Math.round(throughputPerHour * 10) / 10,
      downtime_pct: dt,
      scrap_pct: scrap,
      buffer_before: st.buffer_before ?? 0,
      buffer_after: st.buffer_after ?? 0,
      operators: st.operators ?? 1,
    };
  });

  // Sort by effective cycle time descending — highest is bottleneck
  const sorted = [...analyzed].sort((a, b) => b.effective_cycle_seconds - a.effective_cycle_seconds);
  const bottleneck = sorted[0] ?? null;
  const lineRate = bottleneck ? bottleneck.throughput_per_hour : 0;
  const lineCycle = bottleneck ? bottleneck.effective_cycle_seconds : 0;

  // Utilization of each station relative to bottleneck
  const stationAnalysis = analyzed.map((st) => {
    const utilVsBottleneck = lineCycle > 0 ? clamp01(st.effective_cycle_seconds / lineCycle) : 0;
    const exceedsTakt = takt ? st.effective_cycle_seconds > takt : false;
    const taktMargin = takt ? Math.round((takt - st.effective_cycle_seconds) * 100) / 100 : null;

    return {
      ...st,
      utilization_vs_bottleneck: Math.round(utilVsBottleneck * 1000) / 1000,
      exceeds_takt: exceedsTakt,
      takt_margin_seconds: taktMargin,
    };
  });

  const exceedCount = takt ? stationAnalysis.filter((s) => s.exceeds_takt).length : 0;

  // Recommendations
  const recommendations: string[] = [];
  if (bottleneck) {
    recommendations.push(
      `Primary bottleneck: ${bottleneck.station_id} (${bottleneck.effective_cycle_seconds}s effective cycle)`
    );
    if (bottleneck.downtime_pct > 5)
      recommendations.push(`Reduce downtime at ${bottleneck.station_id} (currently ${bottleneck.downtime_pct}%)`);
    if (bottleneck.scrap_pct > 2)
      recommendations.push(`Improve quality at ${bottleneck.station_id} (currently ${bottleneck.scrap_pct}% scrap)`);
  }
  if (exceedCount > 1)
    recommendations.push(`${exceedCount} stations exceed takt time — line rebalancing needed`);

  // Starvation / blocking risk
  const starvationRisk = stationAnalysis.filter(
    (s) => s.buffer_before === 0 && s.utilization_vs_bottleneck < 0.80
  );
  if (starvationRisk.length > 0)
    recommendations.push(`${starvationRisk.length} station(s) at starvation risk — add buffer or synchronize`);

  return {
    total_stations: stations.length,
    bottleneck_station: bottleneck?.station_id ?? null,
    line_throughput_per_hour: Math.round(lineRate * 10) / 10,
    line_cycle_seconds: Math.round(lineCycle * 100) / 100,
    takt_time_seconds: takt ? Math.round(takt * 100) / 100 : null,
    stations_exceeding_takt: exceedCount,
    stations: stationAnalysis,
    balance_efficiency: (() => {
      const sumCycles = analyzed.reduce((s, a) => s + a.effective_cycle_seconds, 0);
      const maxCycle = lineCycle * analyzed.length;
      return maxCycle > 0 ? Math.round((sumCycles / maxCycle) * 10000) / 10000 : 0;
    })(),
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// sf_capacity — Capacity planning & forecasting
// ---------------------------------------------------------------------------

function planCapacity(input: CapacityInput) {
  const { machines, demand_forecast = [], planning_horizon_weeks = 12 } = input;

  const machineAnalysis = machines.map((m) => {
    const efficiency = (m.efficiency_pct ?? 85) / 100;
    const maint = m.planned_maintenance_hours ?? 0;
    const effectiveHours = (m.available_hours_per_week - maint) * efficiency;
    const loadRatio = effectiveHours > 0 ? m.current_load_hours / effectiveHours : 999;
    const spareHours = Math.max(0, effectiveHours - m.current_load_hours);

    let status: string;
    if (loadRatio > 1.0) status = "overloaded";
    else if (loadRatio > 0.90) status = "near_capacity";
    else if (loadRatio > 0.70) status = "balanced";
    else if (loadRatio > 0.40) status = "underloaded";
    else status = "idle";

    return {
      machine_id: m.machine_id,
      available_hours_per_week: m.available_hours_per_week,
      effective_hours_per_week: Math.round(effectiveHours * 10) / 10,
      current_load_hours: m.current_load_hours,
      load_ratio: Math.round(loadRatio * 1000) / 1000,
      load_pct: pct(Math.min(loadRatio, 1)),
      spare_capacity_hours: Math.round(spareHours * 10) / 10,
      status,
    };
  });

  // Fleet totals
  const totalEffective = machineAnalysis.reduce((s, m) => s + m.effective_hours_per_week, 0);
  const totalLoad = machineAnalysis.reduce((s, m) => s + m.current_load_hours, 0);
  const fleetRatio = totalEffective > 0 ? totalLoad / totalEffective : 0;
  const fleetSpare = Math.max(0, totalEffective - totalLoad);

  // Demand forecast analysis
  const forecastAnalysis = demand_forecast.map((df) => {
    const gap = df.required_hours - totalEffective;
    return {
      period: df.period,
      required_hours: df.required_hours,
      available_hours: Math.round(totalEffective * 10) / 10,
      gap_hours: Math.round(gap * 10) / 10,
      feasible: gap <= 0,
      utilization_pct: pct(totalEffective > 0 ? Math.min(df.required_hours / totalEffective, 1) : 0),
    };
  });

  // Projected weeks until full capacity (linear extrapolation)
  const loadGrowthRate = demand_forecast.length >= 2
    ? (demand_forecast[demand_forecast.length - 1].required_hours - demand_forecast[0].required_hours) /
      Math.max(demand_forecast.length - 1, 1)
    : 0;
  const weeksUntilFull = loadGrowthRate > 0 && fleetSpare > 0
    ? Math.round(fleetSpare / loadGrowthRate)
    : null;

  // Recommendations
  const recommendations: string[] = [];
  const overloaded = machineAnalysis.filter((m) => m.status === "overloaded");
  if (overloaded.length > 0)
    recommendations.push(`${overloaded.length} machine(s) overloaded — redistribute or add capacity`);

  const idle = machineAnalysis.filter((m) => m.status === "idle");
  if (idle.length > 0)
    recommendations.push(`${idle.length} machine(s) idle (<40% load) — consolidate or repurpose`);

  if (weeksUntilFull !== null && weeksUntilFull < planning_horizon_weeks)
    recommendations.push(`Fleet reaches full capacity in ~${weeksUntilFull} weeks — plan expansion`);

  const infeasible = forecastAnalysis.filter((f) => !f.feasible);
  if (infeasible.length > 0)
    recommendations.push(`${infeasible.length} forecast period(s) exceed available capacity — overtime or outsourcing needed`);

  return {
    total_machines: machines.length,
    fleet_effective_hours_per_week: Math.round(totalEffective * 10) / 10,
    fleet_current_load_hours: Math.round(totalLoad * 10) / 10,
    fleet_load_ratio: Math.round(fleetRatio * 1000) / 1000,
    fleet_spare_hours: Math.round(fleetSpare * 10) / 10,
    weeks_until_full_capacity: weeksUntilFull,
    planning_horizon_weeks,
    machines: machineAnalysis,
    forecast: forecastAnalysis,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeShopFloorAnalyticsAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "sf_oee":
      return computeOEE(params as unknown as OEEInput);
    case "sf_utilization":
      return computeUtilization(params as unknown as UtilizationInput);
    case "sf_bottleneck":
      return detectBottlenecks(params as unknown as BottleneckInput);
    case "sf_capacity":
      return planCapacity(params as unknown as CapacityInput);
    default:
      throw new Error(`ShopFloorAnalyticsEngine: unknown action "${action}"`);
  }
}
