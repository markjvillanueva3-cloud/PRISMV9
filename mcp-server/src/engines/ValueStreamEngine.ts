/**
 * ValueStreamEngine — Value stream mapping, takt time, cycle time & future-state analysis
 * Phase R29-MS1: Continuous Improvement & Lean Intelligence
 *
 * Actions:
 *   vsm_map       — generate/query value stream maps with process steps & metrics
 *   vsm_takt      — calculate takt time vs. cycle time alignment
 *   vsm_cycle     — analyze cycle time breakdown & bottleneck identification
 *   vsm_future    — generate future-state VSM with improvement targets
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface ProcessStep {
  id: string;
  name: string;
  cell: string;
  cycle_time_sec: number;
  changeover_sec: number;
  uptime_pct: number;
  operators: number;
  wip_units: number;
  batch_size: number;
  value_add_pct: number;
  defect_rate_pct: number;
}

interface ValueStream {
  id: string;
  name: string;
  product_family: string;
  customer_demand_per_day: number;
  available_time_sec_per_day: number;
  steps: ProcessStep[];
  transport_times_sec: Record<string, number>; // "step1→step2": seconds
  inventory_buffers: Record<string, number>;   // "step1→step2": units
  created: string;
}

interface ImprovementTarget {
  step_id: string;
  metric: string;
  current: number;
  target: number;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

// ── Sample Data ────────────────────────────────────────────────────────────

const VALUE_STREAMS: ValueStream[] = [
  {
    id: 'VS-001',
    name: 'Pump Assembly Line',
    product_family: 'Centrifugal Pumps',
    customer_demand_per_day: 48,
    available_time_sec_per_day: 27000, // 7.5 hours
    steps: [
      { id: 'S1', name: 'CNC Machining', cell: 'Cell-A', cycle_time_sec: 420, changeover_sec: 1800, uptime_pct: 85, operators: 2, wip_units: 12, batch_size: 24, value_add_pct: 72, defect_rate_pct: 1.2 },
      { id: 'S2', name: 'Deburring', cell: 'Cell-A', cycle_time_sec: 180, changeover_sec: 300, uptime_pct: 95, operators: 1, wip_units: 6, batch_size: 1, value_add_pct: 45, defect_rate_pct: 0.3 },
      { id: 'S3', name: 'Heat Treatment', cell: 'Oven-1', cycle_time_sec: 600, changeover_sec: 3600, uptime_pct: 90, operators: 1, wip_units: 48, batch_size: 48, value_add_pct: 88, defect_rate_pct: 0.5 },
      { id: 'S4', name: 'Grinding', cell: 'Cell-B', cycle_time_sec: 360, changeover_sec: 900, uptime_pct: 88, operators: 1, wip_units: 8, batch_size: 1, value_add_pct: 65, defect_rate_pct: 0.8 },
      { id: 'S5', name: 'Assembly', cell: 'Cell-C', cycle_time_sec: 540, changeover_sec: 600, uptime_pct: 92, operators: 3, wip_units: 4, batch_size: 1, value_add_pct: 82, defect_rate_pct: 0.4 },
      { id: 'S6', name: 'Testing', cell: 'Test-Bay', cycle_time_sec: 300, changeover_sec: 180, uptime_pct: 97, operators: 1, wip_units: 2, batch_size: 1, value_add_pct: 95, defect_rate_pct: 0.1 },
    ],
    transport_times_sec: { 'S1→S2': 60, 'S2→S3': 300, 'S3→S4': 120, 'S4→S5': 90, 'S5→S6': 60 },
    inventory_buffers: { 'S1→S2': 12, 'S2→S3': 24, 'S3→S4': 16, 'S4→S5': 8, 'S5→S6': 4 },
    created: '2025-01-15',
  },
  {
    id: 'VS-002',
    name: 'Valve Body Line',
    product_family: 'Control Valves',
    customer_demand_per_day: 80,
    available_time_sec_per_day: 27000,
    steps: [
      { id: 'V1', name: 'Casting Inspection', cell: 'Insp-1', cycle_time_sec: 120, changeover_sec: 60, uptime_pct: 98, operators: 1, wip_units: 20, batch_size: 1, value_add_pct: 30, defect_rate_pct: 2.5 },
      { id: 'V2', name: 'CNC Turning', cell: 'Lathe-2', cycle_time_sec: 240, changeover_sec: 1200, uptime_pct: 87, operators: 1, wip_units: 15, batch_size: 1, value_add_pct: 78, defect_rate_pct: 0.9 },
      { id: 'V3', name: 'CNC Milling', cell: 'Mill-3', cycle_time_sec: 300, changeover_sec: 900, uptime_pct: 85, operators: 1, wip_units: 10, batch_size: 1, value_add_pct: 75, defect_rate_pct: 1.1 },
      { id: 'V4', name: 'Lapping', cell: 'Lap-1', cycle_time_sec: 480, changeover_sec: 600, uptime_pct: 90, operators: 1, wip_units: 6, batch_size: 1, value_add_pct: 92, defect_rate_pct: 0.3 },
      { id: 'V5', name: 'Pressure Test', cell: 'Test-2', cycle_time_sec: 180, changeover_sec: 120, uptime_pct: 95, operators: 1, wip_units: 3, batch_size: 1, value_add_pct: 90, defect_rate_pct: 0.2 },
    ],
    transport_times_sec: { 'V1→V2': 45, 'V2→V3': 60, 'V3→V4': 90, 'V4→V5': 30 },
    inventory_buffers: { 'V1→V2': 15, 'V2→V3': 10, 'V3→V4': 8, 'V4→V5': 4 },
    created: '2025-02-20',
  },
];

// ── Action Implementations ─────────────────────────────────────────────────

function vsmMap(params: Record<string, unknown>): unknown {
  const vsId = params.value_stream_id as string | undefined;
  const family = params.product_family as string | undefined;

  let streams = VALUE_STREAMS;
  if (vsId) streams = streams.filter(v => v.id === vsId);
  if (family) streams = streams.filter(v => v.product_family.toLowerCase().includes((family as string).toLowerCase()));

  const maps = streams.map(vs => {
    const totalCycleTime = vs.steps.reduce((sum, s) => sum + s.cycle_time_sec, 0);
    const totalTransport = Object.values(vs.transport_times_sec).reduce((sum, t) => sum + t, 0);
    const totalWIP = vs.steps.reduce((sum, s) => sum + s.wip_units, 0);
    const totalInventory = Object.values(vs.inventory_buffers).reduce((sum, u) => sum + u, 0);
    const valueAddTime = vs.steps.reduce((sum, s) => sum + (s.cycle_time_sec * s.value_add_pct / 100), 0);
    const totalLeadTime = totalCycleTime + totalTransport + ((totalWIP + totalInventory) * totalCycleTime / vs.steps.length / vs.customer_demand_per_day * vs.available_time_sec_per_day);
    const pceRatio = valueAddTime / Math.max(totalLeadTime, 1) * 100;
    const taktTime = vs.available_time_sec_per_day / vs.customer_demand_per_day;

    return {
      id: vs.id,
      name: vs.name,
      product_family: vs.product_family,
      steps: vs.steps.map(s => ({
        id: s.id,
        name: s.name,
        cycle_time_sec: s.cycle_time_sec,
        changeover_sec: s.changeover_sec,
        uptime_pct: s.uptime_pct,
        operators: s.operators,
        wip_units: s.wip_units,
        value_add_pct: s.value_add_pct,
      })),
      summary: {
        total_cycle_time_sec: totalCycleTime,
        total_transport_sec: totalTransport,
        total_wip: totalWIP,
        total_buffer_inventory: totalInventory,
        value_add_time_sec: Math.round(valueAddTime),
        total_lead_time_sec: Math.round(totalLeadTime),
        pce_ratio_pct: Math.round(pceRatio * 10) / 10,
        takt_time_sec: Math.round(taktTime * 10) / 10,
        step_count: vs.steps.length,
        total_operators: vs.steps.reduce((sum, s) => sum + s.operators, 0),
      },
    };
  });

  return { total_maps: maps.length, value_streams: maps };
}

function vsmTakt(params: Record<string, unknown>): unknown {
  const vsId = params.value_stream_id as string || 'VS-001';
  const vs = VALUE_STREAMS.find(v => v.id === vsId);
  if (!vs) return { error: `Value stream ${vsId} not found` };

  const taktTime = vs.available_time_sec_per_day / vs.customer_demand_per_day;
  const analysis = vs.steps.map(s => {
    const effectiveCycle = s.cycle_time_sec / (s.uptime_pct / 100);
    const ratio = effectiveCycle / taktTime;
    const status: string = ratio > 1.1 ? 'BOTTLENECK' : ratio > 0.9 ? 'AT_CAPACITY' : ratio > 0.7 ? 'BALANCED' : 'UNDERUTILIZED';
    const capacityUnits = Math.floor(vs.available_time_sec_per_day / effectiveCycle);
    return {
      step_id: s.id,
      step_name: s.name,
      cycle_time_sec: s.cycle_time_sec,
      effective_cycle_sec: Math.round(effectiveCycle * 10) / 10,
      takt_time_sec: Math.round(taktTime * 10) / 10,
      takt_ratio: Math.round(ratio * 100) / 100,
      status,
      daily_capacity: capacityUnits,
      gap_units: capacityUnits - vs.customer_demand_per_day,
    };
  });

  const bottleneck = analysis.find(a => a.status === 'BOTTLENECK') || analysis.reduce((max, a) => a.takt_ratio > max.takt_ratio ? a : max, analysis[0]);
  const lineCapacity = Math.min(...analysis.map(a => a.daily_capacity));

  return {
    value_stream: vs.name,
    takt_time_sec: Math.round(taktTime * 10) / 10,
    customer_demand: vs.customer_demand_per_day,
    available_time_sec: vs.available_time_sec_per_day,
    step_analysis: analysis,
    summary: {
      bottleneck_step: bottleneck.step_name,
      bottleneck_ratio: bottleneck.takt_ratio,
      line_capacity_per_day: lineCapacity,
      demand_met: lineCapacity >= vs.customer_demand_per_day,
      capacity_gap: lineCapacity - vs.customer_demand_per_day,
      balanced_steps: analysis.filter(a => a.status === 'BALANCED').length,
      bottleneck_steps: analysis.filter(a => a.status === 'BOTTLENECK').length,
    },
  };
}

function vsmCycle(params: Record<string, unknown>): unknown {
  const vsId = params.value_stream_id as string || 'VS-001';
  const vs = VALUE_STREAMS.find(v => v.id === vsId);
  if (!vs) return { error: `Value stream ${vsId} not found` };

  const stepBreakdowns = vs.steps.map(s => {
    const valueAdd = s.cycle_time_sec * s.value_add_pct / 100;
    const nonValueAdd = s.cycle_time_sec - valueAdd;
    const setupPerUnit = s.changeover_sec / Math.max(s.batch_size, 1);
    const waitTime = s.wip_units * s.cycle_time_sec / Math.max(s.operators, 1);
    const totalTouchTime = s.cycle_time_sec + setupPerUnit;
    return {
      step_id: s.id,
      step_name: s.name,
      cycle_time_sec: s.cycle_time_sec,
      value_add_sec: Math.round(valueAdd),
      non_value_add_sec: Math.round(nonValueAdd),
      setup_per_unit_sec: Math.round(setupPerUnit),
      wait_time_sec: Math.round(waitTime),
      total_touch_time_sec: Math.round(totalTouchTime),
      value_add_pct: s.value_add_pct,
      defect_rate_pct: s.defect_rate_pct,
      waste_categories: {
        overprocessing: Math.round(nonValueAdd * 0.4),
        waiting: Math.round(waitTime * 0.3),
        motion: Math.round(nonValueAdd * 0.2),
        defects: Math.round(s.cycle_time_sec * s.defect_rate_pct / 100),
        transport: 0, // calculated separately
      },
    };
  });

  // Add transport waste
  const transportKeys = Object.keys(vs.transport_times_sec);
  transportKeys.forEach(key => {
    const [from] = key.split('→');
    const step = stepBreakdowns.find(s => s.step_id === from);
    if (step) step.waste_categories.transport = vs.transport_times_sec[key];
  });

  const totalCycle = stepBreakdowns.reduce((sum, s) => sum + s.cycle_time_sec, 0);
  const totalValueAdd = stepBreakdowns.reduce((sum, s) => sum + s.value_add_sec, 0);
  const totalWaste = stepBreakdowns.reduce((sum, s) => {
    const w = s.waste_categories;
    return sum + w.overprocessing + w.waiting + w.motion + w.defects + w.transport;
  }, 0);

  const bottleneckStep = stepBreakdowns.reduce((max, s) => s.cycle_time_sec > max.cycle_time_sec ? s : max, stepBreakdowns[0]);

  return {
    value_stream: vs.name,
    step_breakdowns: stepBreakdowns,
    summary: {
      total_cycle_time_sec: totalCycle,
      total_value_add_sec: totalValueAdd,
      total_waste_sec: totalWaste,
      value_add_ratio_pct: Math.round(totalValueAdd / totalCycle * 1000) / 10,
      bottleneck: { step: bottleneckStep.step_name, cycle_time: bottleneckStep.cycle_time_sec },
      top_waste: Object.entries(
        stepBreakdowns.reduce((acc, s) => {
          for (const [k, v] of Object.entries(s.waste_categories)) {
            acc[k] = (acc[k] || 0) + v;
          }
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => ({ category: k, total_sec: v })),
    },
  };
}

function vsmFuture(params: Record<string, unknown>): unknown {
  const vsId = params.value_stream_id as string || 'VS-001';
  const targetImprovement = (params.target_improvement_pct as number) || 20;
  const vs = VALUE_STREAMS.find(v => v.id === vsId);
  if (!vs) return { error: `Value stream ${vsId} not found` };

  const taktTime = vs.available_time_sec_per_day / vs.customer_demand_per_day;
  const improvements: ImprovementTarget[] = [];

  const futureSteps = vs.steps.map(s => {
    const effectiveCycle = s.cycle_time_sec / (s.uptime_pct / 100);
    const isBottleneck = effectiveCycle / taktTime > 1.0;
    const targetCycle = isBottleneck
      ? Math.round(s.cycle_time_sec * (1 - targetImprovement / 100))
      : s.cycle_time_sec;
    const targetWIP = Math.max(1, Math.round(s.wip_units * 0.5));
    const targetChangeover = Math.round(s.changeover_sec * 0.5); // SMED target
    const targetUptime = Math.min(99, s.uptime_pct + 5);

    if (isBottleneck) {
      improvements.push({ step_id: s.id, metric: 'cycle_time', current: s.cycle_time_sec, target: targetCycle, action: `Reduce cycle time through process optimization`, priority: 'high' });
    }
    if (s.wip_units > 5) {
      improvements.push({ step_id: s.id, metric: 'wip', current: s.wip_units, target: targetWIP, action: `Implement pull system / kanban`, priority: isBottleneck ? 'high' : 'medium' });
    }
    if (s.changeover_sec > 600) {
      improvements.push({ step_id: s.id, metric: 'changeover', current: s.changeover_sec, target: targetChangeover, action: `Apply SMED methodology`, priority: 'medium' });
    }
    if (s.defect_rate_pct > 1.0) {
      improvements.push({ step_id: s.id, metric: 'defect_rate', current: s.defect_rate_pct, target: Math.round(s.defect_rate_pct * 0.5 * 10) / 10, action: `Implement poka-yoke / error proofing`, priority: 'high' });
    }

    return {
      id: s.id,
      name: s.name,
      current_cycle: s.cycle_time_sec,
      future_cycle: targetCycle,
      current_wip: s.wip_units,
      future_wip: targetWIP,
      current_changeover: s.changeover_sec,
      future_changeover: targetChangeover,
      current_uptime: s.uptime_pct,
      future_uptime: targetUptime,
    };
  });

  const currentTotal = vs.steps.reduce((sum, s) => sum + s.cycle_time_sec, 0);
  const futureTotal = futureSteps.reduce((sum, s) => sum + s.future_cycle, 0);
  const currentWIP = vs.steps.reduce((sum, s) => sum + s.wip_units, 0);
  const futureWIP = futureSteps.reduce((sum, s) => sum + s.future_wip, 0);

  return {
    value_stream: vs.name,
    target_improvement_pct: targetImprovement,
    future_state: futureSteps,
    improvements: improvements.sort((a, b) => a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0),
    summary: {
      current_total_cycle_sec: currentTotal,
      future_total_cycle_sec: futureTotal,
      cycle_reduction_pct: Math.round((1 - futureTotal / currentTotal) * 1000) / 10,
      current_total_wip: currentWIP,
      future_total_wip: futureWIP,
      wip_reduction_pct: Math.round((1 - futureWIP / currentWIP) * 1000) / 10,
      improvement_count: improvements.length,
      high_priority: improvements.filter(i => i.priority === 'high').length,
      estimated_capacity_gain_pct: Math.round((currentTotal / futureTotal - 1) * 1000) / 10,
    },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeValueStreamAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'vsm_map':     return vsmMap(params);
    case 'vsm_takt':    return vsmTakt(params);
    case 'vsm_cycle':   return vsmCycle(params);
    case 'vsm_future':  return vsmFuture(params);
    default:
      return { error: `Unknown ValueStream action: ${action}` };
  }
}
