/**
 * ProductionSequencingEngine — R26-MS3: Operation Sequencing & Bottleneck Detection
 *
 * Actions:
 *   seq_optimize   — optimize operation sequence across machines for throughput
 *   seq_bottleneck — identify production bottlenecks and constraint points
 *   seq_flow       — analyze production flow and work-in-progress (WIP)
 *   seq_reorder    — reorder operations to minimize total makespan
 *
 * Depends on: R1 registries, R26-MS1 (jobs), R26-MS2 (machine allocation)
 */

// ─── Data Types ───────────────────────────────────────────────────────────────

interface WorkCenter {
  center_id: string;
  center_name: string;
  machine_ids: string[];
  machine_type: string;
  parallel_capacity: number;     // how many jobs can run simultaneously
  avg_cycle_time_min: number;    // average per-piece cycle time
  queue_length: number;          // current jobs waiting
  throughput_per_hour: number;   // parts/hour at current setup
  utilization_pct: number;
  is_bottleneck: boolean;
}

interface ProductionOrder {
  order_id: string;
  job_id: string;
  part_name: string;
  quantity: number;
  operations: OperationStep[];
  current_op_index: number;
  start_date: string;
  target_completion: string;
  status: "not_started" | "in_progress" | "waiting" | "completed";
}

interface OperationStep {
  step_id: string;
  op_number: number;
  work_center_id: string;
  description: string;
  setup_min: number;
  cycle_time_min: number;        // per piece
  batch_size: number;
  status: "pending" | "in_progress" | "completed" | "blocked";
  wait_time_min?: number;        // time waiting in queue
  dependencies: string[];        // step_ids that must complete first
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const WORK_CENTERS: WorkCenter[] = [
  { center_id: "WC-MILL", center_name: "CNC Milling", machine_ids: ["MILL-01", "MILL-02"], machine_type: "CNC_MILL", parallel_capacity: 2, avg_cycle_time_min: 18, queue_length: 3, throughput_per_hour: 6.7, utilization_pct: 75, is_bottleneck: false },
  { center_id: "WC-MILL5", center_name: "5-Axis Milling", machine_ids: ["MILL-03"], machine_type: "CNC_MILL_5AX", parallel_capacity: 1, avg_cycle_time_min: 45, queue_length: 2, throughput_per_hour: 1.3, utilization_pct: 40, is_bottleneck: false },
  { center_id: "WC-TURN", center_name: "CNC Turning", machine_ids: ["LATHE-01", "LATHE-02"], machine_type: "CNC_LATHE", parallel_capacity: 2, avg_cycle_time_min: 12, queue_length: 4, throughput_per_hour: 10.0, utilization_pct: 72, is_bottleneck: false },
  { center_id: "WC-SWISS", center_name: "Swiss Turning", machine_ids: ["SWISS-01"], machine_type: "SWISS_LATHE", parallel_capacity: 1, avg_cycle_time_min: 2.4, queue_length: 1, throughput_per_hour: 25.0, utilization_pct: 30, is_bottleneck: false },
  { center_id: "WC-GRIND", center_name: "Grinding", machine_ids: ["GRIND-01"], machine_type: "GRINDER", parallel_capacity: 1, avg_cycle_time_min: 30, queue_length: 1, throughput_per_hour: 2.0, utilization_pct: 25, is_bottleneck: false },
  { center_id: "WC-INSP", center_name: "Inspection/CMM", machine_ids: ["CMM-01"], machine_type: "CMM", parallel_capacity: 1, avg_cycle_time_min: 8, queue_length: 5, throughput_per_hour: 7.5, utilization_pct: 85, is_bottleneck: true },
  { center_id: "WC-HT", center_name: "Heat Treatment", machine_ids: ["FURN-01"], machine_type: "FURNACE", parallel_capacity: 1, avg_cycle_time_min: 1, queue_length: 2, throughput_per_hour: 60, utilization_pct: 45, is_bottleneck: false },
  { center_id: "WC-DEB", center_name: "Deburring", machine_ids: ["TUMBLE-01", "BENCH-01"], machine_type: "MANUAL", parallel_capacity: 2, avg_cycle_time_min: 6, queue_length: 3, throughput_per_hour: 20.0, utilization_pct: 55, is_bottleneck: false },
];

const PRODUCTION_ORDERS: ProductionOrder[] = [
  { order_id: "PRD-001", job_id: "JOB-001", part_name: "Brake Housing", quantity: 50, current_op_index: 1, start_date: "2025-01-20", target_completion: "2025-02-15", status: "in_progress", operations: [
    { step_id: "S-001-10", op_number: 10, work_center_id: "WC-MILL", description: "Rough mill cavity", setup_min: 90, cycle_time_min: 27, batch_size: 50, status: "completed", dependencies: [] },
    { step_id: "S-001-20", op_number: 20, work_center_id: "WC-MILL", description: "Finish mill + bore", setup_min: 30, cycle_time_min: 18, batch_size: 50, status: "in_progress", wait_time_min: 45, dependencies: ["S-001-10"] },
    { step_id: "S-001-30", op_number: 30, work_center_id: "WC-INSP", description: "CMM inspection", setup_min: 15, cycle_time_min: 6, batch_size: 50, status: "pending", dependencies: ["S-001-20"] },
  ]},
  { order_id: "PRD-002", job_id: "JOB-002", part_name: "Titanium Implant Pin", quantity: 200, current_op_index: 0, start_date: "2025-01-15", target_completion: "2025-02-10", status: "in_progress", operations: [
    { step_id: "S-002-10", op_number: 10, work_center_id: "WC-TURN", description: "Turn OD profile", setup_min: 120, cycle_time_min: 9, batch_size: 200, status: "in_progress", dependencies: [] },
    { step_id: "S-002-20", op_number: 20, work_center_id: "WC-GRIND", description: "Precision grind", setup_min: 60, cycle_time_min: 4.8, batch_size: 200, status: "pending", dependencies: ["S-002-10"] },
    { step_id: "S-002-30", op_number: 30, work_center_id: "WC-INSP", description: "100% inspection", setup_min: 30, cycle_time_min: 3, batch_size: 200, status: "pending", dependencies: ["S-002-20"] },
  ]},
  { order_id: "PRD-003", job_id: "JOB-003", part_name: "Drive Shaft", quantity: 100, current_op_index: 0, start_date: "2025-02-01", target_completion: "2025-02-20", status: "not_started", operations: [
    { step_id: "S-003-10", op_number: 10, work_center_id: "WC-TURN", description: "Turn shaft profile", setup_min: 60, cycle_time_min: 15, batch_size: 100, status: "pending", dependencies: [] },
    { step_id: "S-003-20", op_number: 20, work_center_id: "WC-MILL", description: "Mill keyway", setup_min: 45, cycle_time_min: 4.8, batch_size: 100, status: "pending", dependencies: ["S-003-10"] },
    { step_id: "S-003-30", op_number: 30, work_center_id: "WC-HT", description: "Case harden", setup_min: 30, cycle_time_min: 1.2, batch_size: 100, status: "pending", dependencies: ["S-003-20"] },
    { step_id: "S-003-40", op_number: 40, work_center_id: "WC-INSP", description: "Final inspection", setup_min: 15, cycle_time_min: 4, batch_size: 100, status: "pending", dependencies: ["S-003-30"] },
  ]},
  { order_id: "PRD-004", job_id: "JOB-004", part_name: "Valve Body", quantity: 25, current_op_index: 0, start_date: "2025-02-05", target_completion: "2025-02-25", status: "waiting", operations: [
    { step_id: "S-004-10", op_number: 10, work_center_id: "WC-MILL5", description: "5-axis mill body", setup_min: 180, cycle_time_min: 72, batch_size: 25, status: "pending", dependencies: [] },
    { step_id: "S-004-20", op_number: 20, work_center_id: "WC-DEB", description: "Manual deburr", setup_min: 0, cycle_time_min: 18, batch_size: 25, status: "pending", dependencies: ["S-004-10"] },
    { step_id: "S-004-30", op_number: 30, work_center_id: "WC-INSP", description: "CMM + pressure test", setup_min: 30, cycle_time_min: 12, batch_size: 25, status: "pending", dependencies: ["S-004-20"] },
  ]},
  { order_id: "PRD-005", job_id: "JOB-005", part_name: "Brass Fitting", quantity: 500, current_op_index: 0, start_date: "2025-02-03", target_completion: "2025-03-01", status: "in_progress", operations: [
    { step_id: "S-005-10", op_number: 10, work_center_id: "WC-SWISS", description: "Swiss turn fitting", setup_min: 150, cycle_time_min: 2.4, batch_size: 500, status: "in_progress", dependencies: [] },
    { step_id: "S-005-20", op_number: 20, work_center_id: "WC-INSP", description: "SPC sampling", setup_min: 15, cycle_time_min: 1.2, batch_size: 50, status: "pending", dependencies: ["S-005-10"] },
  ]},
];

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function calcMakespan(order: ProductionOrder): number {
  // Total time = sum of (setup + cycle*qty) for each op + wait times
  return order.operations.reduce((total, op) => {
    const opTime = op.setup_min + (op.cycle_time_min * order.quantity);
    const wait = op.wait_time_min || 0;
    return total + opTime + wait;
  }, 0);
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

function handleSeqOptimize(params: Record<string, unknown>): unknown {
  const orderId = params.order_id as string | undefined;
  const objective = (params.objective as string) || "makespan"; // makespan, throughput, due_date

  let orders = PRODUCTION_ORDERS;
  if (orderId) orders = orders.filter(o => o.order_id === orderId);

  const optimized = orders.map(order => {
    const currentMakespan = calcMakespan(order);

    // Analyze overlapping opportunities: can any ops run in parallel?
    const parallelOpportunities: Array<{
      ops: string[]; savings_min: number; description: string;
    }> = [];

    for (let i = 0; i < order.operations.length - 1; i++) {
      const op = order.operations[i];
      const nextOp = order.operations[i + 1];
      // If different work centers, partial overlap possible (batch splitting)
      if (op.work_center_id !== nextOp.work_center_id) {
        const overlapMin = Math.round(op.cycle_time_min * order.quantity * 0.3);
        if (overlapMin > 15) {
          parallelOpportunities.push({
            ops: [op.step_id, nextOp.step_id],
            savings_min: overlapMin,
            description: `Start ${nextOp.description} after 70% of ${op.description} (batch overlap)`,
          });
        }
      }
    }

    const totalSavings = parallelOpportunities.reduce((s, p) => s + p.savings_min, 0);
    const optimizedMakespan = currentMakespan - totalSavings;

    return {
      order_id: order.order_id,
      part_name: order.part_name,
      quantity: order.quantity,
      operations_count: order.operations.length,
      current_makespan_min: Math.round(currentMakespan),
      optimized_makespan_min: Math.round(optimizedMakespan),
      savings_min: Math.round(totalSavings),
      savings_pct: currentMakespan > 0 ? Math.round(totalSavings / currentMakespan * 100) : 0,
      parallel_opportunities: parallelOpportunities,
    };
  });

  return {
    action: "seq_optimize",
    objective,
    total_orders: optimized.length,
    optimizations: optimized,
    summary: {
      total_current_makespan_hrs: Math.round(optimized.reduce((s, o) => s + o.current_makespan_min, 0) / 60 * 10) / 10,
      total_optimized_makespan_hrs: Math.round(optimized.reduce((s, o) => s + o.optimized_makespan_min, 0) / 60 * 10) / 10,
      total_savings_hrs: Math.round(optimized.reduce((s, o) => s + o.savings_min, 0) / 60 * 10) / 10,
      orders_with_opportunities: optimized.filter(o => o.parallel_opportunities.length > 0).length,
    },
  };
}

function handleSeqBottleneck(params: Record<string, unknown>): unknown {
  const threshold = (params.utilization_threshold as number) || 75;

  // Analyze each work center for bottleneck indicators
  const analysis = WORK_CENTERS.map(wc => {
    // Calculate incoming demand from active orders
    const incomingOps = PRODUCTION_ORDERS.flatMap(o =>
      o.operations.filter(op => op.work_center_id === wc.center_id && op.status !== "completed")
    );
    const totalDemandMin = incomingOps.reduce((s, op) => {
      const order = PRODUCTION_ORDERS.find(o => o.operations.includes(op))!;
      return s + op.setup_min + (op.cycle_time_min * order.quantity);
    }, 0);
    const demandHrs = Math.round(totalDemandMin / 60 * 10) / 10;
    const capacityHrs = wc.parallel_capacity * 16; // 16hrs/day
    const daysOfWork = capacityHrs > 0 ? Math.round(demandHrs / capacityHrs * 10) / 10 : 0;

    const isBottleneck = wc.utilization_pct >= threshold || wc.queue_length >= 4 || daysOfWork > 3;
    const severity = wc.utilization_pct >= 90 ? "critical" : wc.utilization_pct >= threshold ? "high" : wc.queue_length >= 4 ? "medium" : "low";

    const mitigations: string[] = [];
    if (isBottleneck) {
      if (wc.parallel_capacity < 2) mitigations.push("Add parallel machine capacity");
      if (wc.queue_length > 3) mitigations.push("Prioritize queue by due date urgency");
      mitigations.push("Consider overtime or second shift");
      if (wc.avg_cycle_time_min > 15) mitigations.push("Review cycle time — tooling/speed optimization");
    }

    return {
      center_id: wc.center_id,
      center_name: wc.center_name,
      utilization_pct: wc.utilization_pct,
      queue_length: wc.queue_length,
      throughput_per_hour: wc.throughput_per_hour,
      pending_demand_hrs: demandHrs,
      days_of_backlog: daysOfWork,
      is_bottleneck: isBottleneck,
      severity,
      mitigations,
    };
  }).sort((a, b) => b.utilization_pct - a.utilization_pct);

  const bottlenecks = analysis.filter(a => a.is_bottleneck);

  return {
    action: "seq_bottleneck",
    utilization_threshold: threshold,
    total_work_centers: analysis.length,
    analysis,
    summary: {
      bottleneck_count: bottlenecks.length,
      critical_bottlenecks: bottlenecks.filter(b => b.severity === "critical").length,
      primary_bottleneck: bottlenecks[0]?.center_name || "none",
      avg_utilization: Math.round(analysis.reduce((s, a) => s + a.utilization_pct, 0) / analysis.length),
      total_backlog_hrs: Math.round(analysis.reduce((s, a) => s + a.pending_demand_hrs, 0) * 10) / 10,
    },
  };
}

function handleSeqFlow(params: Record<string, unknown>): unknown {
  const orderId = params.order_id as string | undefined;

  let orders = PRODUCTION_ORDERS;
  if (orderId) orders = orders.filter(o => o.order_id === orderId);

  const flows = orders.map(order => {
    const totalMakespan = calcMakespan(order);
    const completedOps = order.operations.filter(op => op.status === "completed");
    const activeOps = order.operations.filter(op => op.status === "in_progress");
    const blockedOps = order.operations.filter(op => op.status === "blocked");
    const waitTime = order.operations.reduce((s, op) => s + (op.wait_time_min || 0), 0);
    const valueAddTime = order.operations.reduce((s, op) => s + op.cycle_time_min * order.quantity, 0);
    const totalTime = totalMakespan;
    const flowEfficiency = totalTime > 0 ? Math.round(valueAddTime / totalTime * 100) : 0;

    return {
      order_id: order.order_id,
      part_name: order.part_name,
      status: order.status,
      progress: {
        total_ops: order.operations.length,
        completed: completedOps.length,
        active: activeOps.length,
        pending: order.operations.filter(op => op.status === "pending").length,
        blocked: blockedOps.length,
        pct_complete: Math.round(completedOps.length / order.operations.length * 100),
      },
      timing: {
        total_makespan_hrs: Math.round(totalMakespan / 60 * 10) / 10,
        value_add_hrs: Math.round(valueAddTime / 60 * 10) / 10,
        wait_time_hrs: Math.round(waitTime / 60 * 10) / 10,
        flow_efficiency_pct: flowEfficiency,
      },
      current_operation: activeOps[0] ? {
        step_id: activeOps[0].step_id,
        description: activeOps[0].description,
        work_center: activeOps[0].work_center_id,
      } : null,
      next_operation: order.operations.find(op => op.status === "pending") ? {
        step_id: order.operations.find(op => op.status === "pending")!.step_id,
        description: order.operations.find(op => op.status === "pending")!.description,
        work_center: order.operations.find(op => op.status === "pending")!.work_center_id,
      } : null,
    };
  });

  const avgEfficiency = flows.length > 0
    ? Math.round(flows.reduce((s, f) => s + f.timing.flow_efficiency_pct, 0) / flows.length)
    : 0;

  return {
    action: "seq_flow",
    total_orders: flows.length,
    flows,
    summary: {
      in_progress: flows.filter(f => f.status === "in_progress").length,
      waiting: flows.filter(f => f.status === "waiting").length,
      avg_flow_efficiency_pct: avgEfficiency,
      total_wip_hrs: Math.round(flows.filter(f => f.status === "in_progress").reduce((s, f) => s + f.timing.total_makespan_hrs, 0) * 10) / 10,
      total_wait_hrs: Math.round(flows.reduce((s, f) => s + f.timing.wait_time_hrs, 0) * 10) / 10,
    },
  };
}

function handleSeqReorder(params: Record<string, unknown>): unknown {
  const strategy = (params.strategy as string) || "edd"; // edd (earliest due date), spt (shortest processing time), priority

  const activeOrders = PRODUCTION_ORDERS.filter(o => o.status !== "completed");

  // Calculate processing metrics for ranking
  const ranked = activeOrders.map(order => {
    const remainingOps = order.operations.filter(op => op.status !== "completed");
    const remainingTime = remainingOps.reduce((s, op) => s + op.setup_min + (op.cycle_time_min * order.quantity), 0);
    const daysToDeadline = Math.round((new Date(order.target_completion).getTime() - new Date("2025-02-07").getTime()) / 86400000);
    const slack = daysToDeadline - Math.ceil(remainingTime / 60 / 16); // days of slack

    return {
      order_id: order.order_id,
      part_name: order.part_name,
      quantity: order.quantity,
      due_date: order.target_completion,
      days_to_deadline: daysToDeadline,
      remaining_time_hrs: Math.round(remainingTime / 60 * 10) / 10,
      remaining_ops: remainingOps.length,
      slack_days: slack,
      is_critical: slack <= 0,
    };
  });

  // Sort by strategy
  let sorted: typeof ranked;
  switch (strategy) {
    case "spt":
      sorted = [...ranked].sort((a, b) => a.remaining_time_hrs - b.remaining_time_hrs);
      break;
    case "priority":
      sorted = [...ranked].sort((a, b) => a.slack_days - b.slack_days);
      break;
    case "edd":
    default:
      sorted = [...ranked].sort((a, b) => a.days_to_deadline - b.days_to_deadline);
  }

  // Compare with current order
  const currentOrder = ranked.map(r => r.order_id);
  const newOrder = sorted.map(r => r.order_id);
  const changesNeeded = currentOrder.filter((id, idx) => id !== newOrder[idx]).length;

  return {
    action: "seq_reorder",
    strategy,
    total_orders: sorted.length,
    recommended_sequence: sorted,
    reorder_metrics: {
      changes_needed: changesNeeded,
      critical_orders: sorted.filter(s => s.is_critical).length,
      avg_slack_days: sorted.length > 0 ? Math.round(sorted.reduce((s, r) => s + r.slack_days, 0) / sorted.length * 10) / 10 : 0,
      total_remaining_hrs: Math.round(sorted.reduce((s, r) => s + r.remaining_time_hrs, 0) * 10) / 10,
    },
    summary: {
      reorder_needed: changesNeeded > 0,
      changes_count: changesNeeded,
      most_urgent: sorted[0]?.order_id || "none",
      most_urgent_slack: sorted[0]?.slack_days ?? 0,
    },
  };
}

// ─── Public Dispatcher ────────────────────────────────────────────────────────

export function executeProductionSequencingAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "seq_optimize":   return handleSeqOptimize(params);
    case "seq_bottleneck": return handleSeqBottleneck(params);
    case "seq_flow":       return handleSeqFlow(params);
    case "seq_reorder":    return handleSeqReorder(params);
    default:
      throw new Error(`ProductionSequencingEngine: unknown action "${action}"`);
  }
}
