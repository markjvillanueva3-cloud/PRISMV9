/**
 * LeanMetricsEngine — OEE, first-time yield, waste categorization & lean KPI dashboards
 * Phase R29-MS4: Continuous Improvement & Lean Intelligence
 *
 * Actions:
 *   lean_oee    — calculate OEE (Availability × Performance × Quality) per machine/cell
 *   lean_fty    — first-time yield and rolled throughput yield across process steps
 *   lean_waste  — categorize and quantify the 8 wastes (TIM WOODS)
 *   lean_kpi    — lean manufacturing KPI dashboard with trend analysis
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface OEERecord {
  id: string;
  machine: string;
  cell: string;
  date: string;
  planned_time_min: number;
  actual_run_min: number;
  downtime_min: number;
  ideal_cycle_sec: number;
  actual_output: number;
  good_units: number;
  defect_units: number;
}

interface YieldRecord {
  id: string;
  process_step: string;
  cell: string;
  date: string;
  units_in: number;
  units_out_good: number;
  units_rework: number;
  units_scrap: number;
}

interface WasteObservation {
  id: string;
  area: string;
  waste_type: 'transport' | 'inventory' | 'motion' | 'waiting' | 'overproduction' | 'overprocessing' | 'defects' | 'skills';
  description: string;
  time_wasted_min: number;
  cost_usd: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  severity: 'low' | 'medium' | 'high';
  date_observed: string;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const OEE_RECORDS: OEERecord[] = [
  { id: 'OEE-001', machine: 'CNC-Mill-01', cell: 'Cell-A', date: '2025-03-17', planned_time_min: 450, actual_run_min: 390, downtime_min: 60, ideal_cycle_sec: 420, actual_output: 48, good_units: 47, defect_units: 1 },
  { id: 'OEE-002', machine: 'CNC-Mill-01', cell: 'Cell-A', date: '2025-03-18', planned_time_min: 450, actual_run_min: 405, downtime_min: 45, ideal_cycle_sec: 420, actual_output: 50, good_units: 49, defect_units: 1 },
  { id: 'OEE-003', machine: 'CNC-Lathe-01', cell: 'Cell-A', date: '2025-03-17', planned_time_min: 450, actual_run_min: 420, downtime_min: 30, ideal_cycle_sec: 240, actual_output: 95, good_units: 93, defect_units: 2 },
  { id: 'OEE-004', machine: 'Grinder-01', cell: 'Cell-B', date: '2025-03-17', planned_time_min: 450, actual_run_min: 380, downtime_min: 70, ideal_cycle_sec: 360, actual_output: 55, good_units: 54, defect_units: 1 },
  { id: 'OEE-005', machine: 'Grinder-01', cell: 'Cell-B', date: '2025-03-18', planned_time_min: 450, actual_run_min: 400, downtime_min: 50, ideal_cycle_sec: 360, actual_output: 58, good_units: 57, defect_units: 1 },
  { id: 'OEE-006', machine: 'Assembly-01', cell: 'Cell-C', date: '2025-03-17', planned_time_min: 450, actual_run_min: 430, downtime_min: 20, ideal_cycle_sec: 540, actual_output: 42, good_units: 41, defect_units: 1 },
  { id: 'OEE-007', machine: 'Assembly-01', cell: 'Cell-C', date: '2025-03-18', planned_time_min: 450, actual_run_min: 435, downtime_min: 15, ideal_cycle_sec: 540, actual_output: 44, good_units: 43, defect_units: 1 },
  { id: 'OEE-008', machine: 'Heat-Treat-01', cell: 'Oven-1', date: '2025-03-17', planned_time_min: 450, actual_run_min: 410, downtime_min: 40, ideal_cycle_sec: 600, actual_output: 36, good_units: 35, defect_units: 1 },
];

const YIELD_RECORDS: YieldRecord[] = [
  { id: 'FTY-001', process_step: 'CNC Machining', cell: 'Cell-A', date: '2025-03-17', units_in: 100, units_out_good: 97, units_rework: 2, units_scrap: 1 },
  { id: 'FTY-002', process_step: 'Deburring', cell: 'Cell-A', date: '2025-03-17', units_in: 97, units_out_good: 96, units_rework: 1, units_scrap: 0 },
  { id: 'FTY-003', process_step: 'Heat Treatment', cell: 'Oven-1', date: '2025-03-17', units_in: 96, units_out_good: 95, units_rework: 0, units_scrap: 1 },
  { id: 'FTY-004', process_step: 'Grinding', cell: 'Cell-B', date: '2025-03-17', units_in: 95, units_out_good: 93, units_rework: 1, units_scrap: 1 },
  { id: 'FTY-005', process_step: 'Assembly', cell: 'Cell-C', date: '2025-03-17', units_in: 93, units_out_good: 91, units_rework: 2, units_scrap: 0 },
  { id: 'FTY-006', process_step: 'Testing', cell: 'Test-Bay', date: '2025-03-17', units_in: 91, units_out_good: 90, units_rework: 1, units_scrap: 0 },
];

const WASTE_OBSERVATIONS: WasteObservation[] = [
  { id: 'W-001', area: 'Cell-A', waste_type: 'waiting', description: 'Operator waiting for crane to load parts', time_wasted_min: 45, cost_usd: 75, frequency: 'daily', severity: 'high', date_observed: '2025-03-17' },
  { id: 'W-002', area: 'Cell-B', waste_type: 'transport', description: 'Parts moved 150ft between grinding and inspection', time_wasted_min: 20, cost_usd: 33, frequency: 'daily', severity: 'medium', date_observed: '2025-03-17' },
  { id: 'W-003', area: 'Warehouse-A', waste_type: 'inventory', description: 'Excess raw material buffer — 6 weeks on hand vs 2-week target', time_wasted_min: 0, cost_usd: 12000, frequency: 'monthly', severity: 'high', date_observed: '2025-03-17' },
  { id: 'W-004', area: 'Cell-C', waste_type: 'motion', description: 'Operator walks to tool crib for frequently used items', time_wasted_min: 30, cost_usd: 50, frequency: 'daily', severity: 'medium', date_observed: '2025-03-17' },
  { id: 'W-005', area: 'Cell-A', waste_type: 'overprocessing', description: 'Polishing non-functional surfaces beyond spec', time_wasted_min: 15, cost_usd: 25, frequency: 'daily', severity: 'low', date_observed: '2025-03-17' },
  { id: 'W-006', area: 'Cell-C', waste_type: 'defects', description: 'Gasket misalignment causing rework on 2.4% of assemblies', time_wasted_min: 25, cost_usd: 180, frequency: 'daily', severity: 'high', date_observed: '2025-03-17' },
  { id: 'W-007', area: 'Oven-1', waste_type: 'overproduction', description: 'Heat treating 48-unit batches when only 30 needed', time_wasted_min: 60, cost_usd: 200, frequency: 'weekly', severity: 'medium', date_observed: '2025-03-17' },
  { id: 'W-008', area: 'Cell-B', waste_type: 'skills', description: 'Experienced operator doing basic deburring — skill underutilization', time_wasted_min: 120, cost_usd: 200, frequency: 'daily', severity: 'medium', date_observed: '2025-03-17' },
  { id: 'W-009', area: 'Test-Bay', waste_type: 'waiting', description: 'Test fixture queuing — 3 units waiting at single test station', time_wasted_min: 35, cost_usd: 58, frequency: 'daily', severity: 'medium', date_observed: '2025-03-17' },
  { id: 'W-010', area: 'Cell-A', waste_type: 'defects', description: 'Tool wear causing dimensional drift — 1.2% scrap rate', time_wasted_min: 10, cost_usd: 150, frequency: 'daily', severity: 'high', date_observed: '2025-03-17' },
];

// ── Action Implementations ─────────────────────────────────────────────────

function leanOEE(params: Record<string, unknown>): unknown {
  const machine = params.machine as string | undefined;
  const cell = params.cell as string | undefined;
  const date = params.date as string | undefined;

  let records = OEE_RECORDS;
  if (machine) records = records.filter(r => r.machine === machine);
  if (cell) records = records.filter(r => r.cell === cell);
  if (date) records = records.filter(r => r.date === date);

  const oeeCalcs = records.map(r => {
    const availability = r.actual_run_min / r.planned_time_min;
    const idealOutput = (r.actual_run_min * 60) / r.ideal_cycle_sec;
    const performance = r.actual_output / idealOutput;
    const quality = r.good_units / r.actual_output;
    const oee = availability * performance * quality;

    return {
      id: r.id,
      machine: r.machine,
      cell: r.cell,
      date: r.date,
      availability_pct: Math.round(availability * 1000) / 10,
      performance_pct: Math.round(performance * 1000) / 10,
      quality_pct: Math.round(quality * 1000) / 10,
      oee_pct: Math.round(oee * 1000) / 10,
      good_units: r.good_units,
      defect_units: r.defect_units,
      downtime_min: r.downtime_min,
      grade: oee >= 0.85 ? 'World Class' : oee >= 0.65 ? 'Good' : oee >= 0.40 ? 'Typical' : 'Low',
    };
  });

  // Aggregate by machine
  const byMachine = new Map<string, typeof oeeCalcs>();
  oeeCalcs.forEach(c => {
    const list = byMachine.get(c.machine) || [];
    list.push(c);
    byMachine.set(c.machine, list);
  });

  const machineAverages = Array.from(byMachine.entries()).map(([m, calcs]) => ({
    machine: m,
    avg_oee_pct: Math.round(calcs.reduce((sum, c) => sum + c.oee_pct, 0) / calcs.length * 10) / 10,
    avg_availability: Math.round(calcs.reduce((sum, c) => sum + c.availability_pct, 0) / calcs.length * 10) / 10,
    avg_performance: Math.round(calcs.reduce((sum, c) => sum + c.performance_pct, 0) / calcs.length * 10) / 10,
    avg_quality: Math.round(calcs.reduce((sum, c) => sum + c.quality_pct, 0) / calcs.length * 10) / 10,
    records: calcs.length,
  }));

  const overallOEE = oeeCalcs.reduce((sum, c) => sum + c.oee_pct, 0) / Math.max(oeeCalcs.length, 1);

  return {
    total_records: oeeCalcs.length,
    oee_data: oeeCalcs,
    by_machine: machineAverages,
    summary: {
      overall_oee_pct: Math.round(overallOEE * 10) / 10,
      world_class_count: oeeCalcs.filter(c => c.grade === 'World Class').length,
      lowest_oee: oeeCalcs.reduce((min, c) => c.oee_pct < min.oee_pct ? c : min, oeeCalcs[0]),
      biggest_loss: oeeCalcs.reduce((max, c) => c.downtime_min > max.downtime_min ? c : max, oeeCalcs[0]),
      total_downtime_min: oeeCalcs.reduce((sum, c) => sum + c.downtime_min, 0),
    },
  };
}

function leanFTY(params: Record<string, unknown>): unknown {
  const step = params.process_step as string | undefined;
  const date = params.date as string | undefined;

  let records = YIELD_RECORDS;
  if (step) records = records.filter(r => r.process_step.toLowerCase().includes((step as string).toLowerCase()));
  if (date) records = records.filter(r => r.date === date);

  const yieldCalcs = records.map(r => {
    const fty = r.units_out_good / r.units_in;
    return {
      id: r.id,
      process_step: r.process_step,
      cell: r.cell,
      date: r.date,
      units_in: r.units_in,
      units_good: r.units_out_good,
      units_rework: r.units_rework,
      units_scrap: r.units_scrap,
      fty_pct: Math.round(fty * 1000) / 10,
      scrap_rate_pct: Math.round(r.units_scrap / r.units_in * 1000) / 10,
      rework_rate_pct: Math.round(r.units_rework / r.units_in * 1000) / 10,
    };
  });

  // Rolled Throughput Yield (RTY) = product of all FTY values
  const rty = yieldCalcs.reduce((product, y) => product * (y.fty_pct / 100), 1) * 100;
  const totalScrap = yieldCalcs.reduce((sum, y) => sum + y.units_scrap, 0);
  const totalRework = yieldCalcs.reduce((sum, y) => sum + y.units_rework, 0);
  const worstStep = yieldCalcs.reduce((worst, y) => y.fty_pct < worst.fty_pct ? y : worst, yieldCalcs[0]);

  return {
    total_steps: yieldCalcs.length,
    yield_data: yieldCalcs,
    summary: {
      rolled_throughput_yield_pct: Math.round(rty * 10) / 10,
      avg_fty_pct: Math.round(yieldCalcs.reduce((sum, y) => sum + y.fty_pct, 0) / Math.max(yieldCalcs.length, 1) * 10) / 10,
      total_scrap: totalScrap,
      total_rework: totalRework,
      worst_step: { step: worstStep.process_step, fty: worstStep.fty_pct },
      hidden_factory_pct: Math.round((1 - rty / 100) * 1000) / 10, // cost of poor quality
    },
  };
}

function leanWaste(params: Record<string, unknown>): unknown {
  const wasteType = params.waste_type as string | undefined;
  const area = params.area as string | undefined;
  const severity = params.severity as string | undefined;

  let observations = WASTE_OBSERVATIONS;
  if (wasteType) observations = observations.filter(o => o.waste_type === wasteType);
  if (area) observations = observations.filter(o => o.area.toLowerCase().includes((area as string).toLowerCase()));
  if (severity) observations = observations.filter(o => o.severity === severity);

  // Annualize costs based on frequency
  const annualize = (obs: WasteObservation) => {
    const multiplier = obs.frequency === 'daily' ? 250 : obs.frequency === 'weekly' ? 52 : 12;
    return obs.cost_usd * multiplier;
  };

  const wasteAnalysis = observations.map(o => ({
    id: o.id,
    area: o.area,
    waste_type: o.waste_type,
    description: o.description,
    time_wasted_min: o.time_wasted_min,
    cost_per_occurrence: o.cost_usd,
    annual_cost_usd: annualize(o),
    frequency: o.frequency,
    severity: o.severity,
  }));

  // TIM WOODS breakdown
  const wasteTypes = ['transport', 'inventory', 'motion', 'waiting', 'overproduction', 'overprocessing', 'defects', 'skills'];
  const byType = wasteTypes.map(wt => {
    const items = wasteAnalysis.filter(w => w.waste_type === wt);
    return {
      waste_type: wt,
      count: items.length,
      annual_cost_usd: items.reduce((sum, w) => sum + w.annual_cost_usd, 0),
      total_time_min: items.reduce((sum, w) => sum + w.time_wasted_min, 0),
    };
  }).filter(wt => wt.count > 0).sort((a, b) => b.annual_cost_usd - a.annual_cost_usd);

  const totalAnnualCost = wasteAnalysis.reduce((sum, w) => sum + w.annual_cost_usd, 0);

  return {
    total_observations: wasteAnalysis.length,
    waste_details: wasteAnalysis,
    by_type: byType,
    summary: {
      total_annual_waste_usd: totalAnnualCost,
      top_waste_type: byType[0]?.waste_type,
      top_waste_cost: byType[0]?.annual_cost_usd,
      high_severity: observations.filter(o => o.severity === 'high').length,
      daily_time_wasted_min: observations.filter(o => o.frequency === 'daily').reduce((sum, o) => sum + o.time_wasted_min, 0),
      elimination_priority: byType.slice(0, 3).map(wt => ({ type: wt.waste_type, annual_cost: wt.annual_cost_usd })),
    },
  };
}

function leanKPI(params: Record<string, unknown>): unknown {
  const cell = params.cell as string | undefined;

  // Compute all lean KPIs
  const oeeData = leanOEE({ cell }) as any;
  const ftyData = leanFTY({}) as any;
  const wasteData = leanWaste({}) as any;

  // Additional KPIs
  const taktTime = 27000 / 48; // available seconds / daily demand
  const avgCycleTime = 420; // from value stream data
  const taktRatio = avgCycleTime / taktTime;
  const inventoryTurns = 12; // annualized
  const onTimeDelivery = 94.5;
  const leadTimeDays = 8.5;

  return {
    kpi_dashboard: {
      oee: {
        value: oeeData.summary?.overall_oee_pct,
        target: 85,
        unit: '%',
        status: (oeeData.summary?.overall_oee_pct || 0) >= 85 ? 'on_target' : 'below_target',
      },
      rty: {
        value: ftyData.summary?.rolled_throughput_yield_pct,
        target: 95,
        unit: '%',
        status: (ftyData.summary?.rolled_throughput_yield_pct || 0) >= 95 ? 'on_target' : 'below_target',
      },
      takt_ratio: {
        value: Math.round(taktRatio * 100) / 100,
        target: 1.0,
        unit: 'ratio',
        status: taktRatio <= 1.0 ? 'on_target' : 'below_target',
      },
      on_time_delivery: {
        value: onTimeDelivery,
        target: 98,
        unit: '%',
        status: onTimeDelivery >= 98 ? 'on_target' : 'below_target',
      },
      inventory_turns: {
        value: inventoryTurns,
        target: 15,
        unit: 'turns/year',
        status: inventoryTurns >= 15 ? 'on_target' : 'below_target',
      },
      lead_time: {
        value: leadTimeDays,
        target: 5,
        unit: 'days',
        status: leadTimeDays <= 5 ? 'on_target' : 'below_target',
      },
      annual_waste_cost: {
        value: wasteData.summary?.total_annual_waste_usd,
        target: 50000,
        unit: 'USD',
        status: (wasteData.summary?.total_annual_waste_usd || 0) <= 50000 ? 'on_target' : 'below_target',
      },
      hidden_factory: {
        value: ftyData.summary?.hidden_factory_pct,
        target: 3,
        unit: '%',
        status: (ftyData.summary?.hidden_factory_pct || 0) <= 3 ? 'on_target' : 'below_target',
      },
    },
    summary: {
      total_kpis: 8,
      on_target: 0, // will be calculated
      below_target: 0,
      overall_health: 'needs_improvement',
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeLeanMetricsAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'lean_oee':    return leanOEE(params);
    case 'lean_fty':    return leanFTY(params);
    case 'lean_waste':  return leanWaste(params);
    case 'lean_kpi':    return leanKPI(params);
    default:
      return { error: `Unknown LeanMetrics action: ${action}` };
  }
}
