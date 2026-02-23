/**
 * MachineAllocationEngine — R26-MS2: Resource Allocation & Load Balancing
 *
 * Actions:
 *   alloc_assign   — assign jobs to machines based on capability, load, and setup time
 *   alloc_balance  — balance workload across machines to minimize idle time
 *   alloc_setup    — analyze and minimize setup/changeover times
 *   alloc_conflict — detect and resolve resource conflicts
 *
 * Depends on: R1 registries, R21 (maintenance), R26-MS1 (job queue)
 */

// ─── Data Types ───────────────────────────────────────────────────────────────

interface Machine {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  capabilities: string[];
  max_workpiece_diameter: number;  // mm
  max_workpiece_length: number;    // mm
  spindle_speed_max: number;       // RPM
  power_kw: number;
  hourly_rate: number;             // $/hr
  current_setup: string;           // current tooling config
  shift_hours: number;             // available hours per day
  load_pct: number;                // current utilization 0-100
  status: "available" | "running" | "setup" | "maintenance" | "offline";
  queued_jobs: string[];
}

interface SetupMatrix {
  from_config: string;
  to_config: string;
  setup_hours: number;
  tooling_changes: number;
  fixture_change: boolean;
}

interface PendingJob {
  job_id: string;
  part_name: string;
  required_machine_type: string;
  required_capabilities: string[];
  workpiece_diameter: number;     // mm
  workpiece_length: number;       // mm
  estimated_run_hours: number;
  tooling_config: string;
  priority_score: number;
  due_date: string;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const MACHINES: Machine[] = [
  { machine_id: "MILL-01", machine_name: "Haas VF-4SS", machine_type: "CNC_MILL", capabilities: ["3-axis", "high-speed", "aluminum", "steel"], max_workpiece_diameter: 508, max_workpiece_length: 508, spindle_speed_max: 12000, power_kw: 22.4, hourly_rate: 85, current_setup: "CFG-MILL-AL", shift_hours: 16, load_pct: 85, status: "running", queued_jobs: ["JOB-001"] },
  { machine_id: "MILL-02", machine_name: "DMG MORI M1", machine_type: "CNC_MILL", capabilities: ["3-axis", "heavy-duty", "steel", "stainless", "titanium"], max_workpiece_diameter: 650, max_workpiece_length: 550, spindle_speed_max: 10000, power_kw: 30.0, hourly_rate: 110, current_setup: "CFG-MILL-STL", shift_hours: 16, load_pct: 60, status: "available", queued_jobs: [] },
  { machine_id: "MILL-03", machine_name: "Mazak VCN-530C", machine_type: "CNC_MILL_5AX", capabilities: ["5-axis", "complex-geometry", "titanium", "inconel", "composite"], max_workpiece_diameter: 530, max_workpiece_length: 460, spindle_speed_max: 18000, power_kw: 37.0, hourly_rate: 165, current_setup: "CFG-5AX-TI", shift_hours: 16, load_pct: 40, status: "available", queued_jobs: [] },
  { machine_id: "LATHE-01", machine_name: "Okuma LB3000", machine_type: "CNC_LATHE", capabilities: ["turning", "threading", "grooving", "steel", "aluminum"], max_workpiece_diameter: 380, max_workpiece_length: 550, spindle_speed_max: 5000, power_kw: 22.0, hourly_rate: 75, current_setup: "CFG-TURN-STL", shift_hours: 16, load_pct: 55, status: "running", queued_jobs: ["JOB-003"] },
  { machine_id: "LATHE-02", machine_name: "Doosan Puma 2600", machine_type: "CNC_LATHE", capabilities: ["turning", "threading", "live-tooling", "titanium", "stainless"], max_workpiece_diameter: 350, max_workpiece_length: 510, spindle_speed_max: 4500, power_kw: 18.5, hourly_rate: 80, current_setup: "CFG-TURN-TI", shift_hours: 16, load_pct: 90, status: "running", queued_jobs: ["JOB-002"] },
  { machine_id: "SWISS-01", machine_name: "Citizen L20", machine_type: "SWISS_LATHE", capabilities: ["swiss-turning", "micro-parts", "brass", "stainless", "aluminum"], max_workpiece_diameter: 20, max_workpiece_length: 200, spindle_speed_max: 10000, power_kw: 3.7, hourly_rate: 95, current_setup: "CFG-SWISS-BRS", shift_hours: 20, load_pct: 30, status: "running", queued_jobs: ["JOB-005"] },
  { machine_id: "GRIND-01", machine_name: "Studer S33", machine_type: "GRINDER", capabilities: ["cylindrical-grinding", "precision", "hardened-steel", "ceramic", "carbide"], max_workpiece_diameter: 300, max_workpiece_length: 1000, spindle_speed_max: 0, power_kw: 15.0, hourly_rate: 120, current_setup: "CFG-GRIND-STL", shift_hours: 16, load_pct: 25, status: "available", queued_jobs: [] },
  { machine_id: "CMM-01", machine_name: "Zeiss Contura", machine_type: "CMM", capabilities: ["dimensional-inspection", "GD&T", "surface-profile"], max_workpiece_diameter: 700, max_workpiece_length: 700, spindle_speed_max: 0, power_kw: 1.0, hourly_rate: 60, current_setup: "CFG-CMM-STD", shift_hours: 8, load_pct: 70, status: "running", queued_jobs: [] },
];

const SETUP_MATRIX: SetupMatrix[] = [
  { from_config: "CFG-MILL-AL", to_config: "CFG-MILL-STL", setup_hours: 0.5, tooling_changes: 3, fixture_change: false },
  { from_config: "CFG-MILL-AL", to_config: "CFG-MILL-TI", setup_hours: 1.0, tooling_changes: 5, fixture_change: true },
  { from_config: "CFG-MILL-STL", to_config: "CFG-MILL-AL", setup_hours: 0.5, tooling_changes: 3, fixture_change: false },
  { from_config: "CFG-MILL-STL", to_config: "CFG-MILL-SS", setup_hours: 0.75, tooling_changes: 4, fixture_change: false },
  { from_config: "CFG-TURN-STL", to_config: "CFG-TURN-TI", setup_hours: 1.5, tooling_changes: 6, fixture_change: true },
  { from_config: "CFG-TURN-TI", to_config: "CFG-TURN-STL", setup_hours: 1.0, tooling_changes: 4, fixture_change: true },
  { from_config: "CFG-TURN-STL", to_config: "CFG-TURN-AL", setup_hours: 0.5, tooling_changes: 2, fixture_change: false },
  { from_config: "CFG-5AX-TI", to_config: "CFG-5AX-INC", setup_hours: 2.0, tooling_changes: 8, fixture_change: true },
  { from_config: "CFG-5AX-TI", to_config: "CFG-5AX-COMP", setup_hours: 1.5, tooling_changes: 6, fixture_change: true },
  { from_config: "CFG-SWISS-BRS", to_config: "CFG-SWISS-SS", setup_hours: 1.0, tooling_changes: 4, fixture_change: false },
  { from_config: "CFG-GRIND-STL", to_config: "CFG-GRIND-CER", setup_hours: 1.5, tooling_changes: 2, fixture_change: true },
];

const PENDING_JOBS: PendingJob[] = [
  { job_id: "JOB-004", part_name: "Valve Body", required_machine_type: "CNC_MILL_5AX", required_capabilities: ["5-axis", "complex-geometry"], workpiece_diameter: 120, workpiece_length: 85, estimated_run_hours: 33.0, tooling_config: "CFG-5AX-SS", priority_score: 72, due_date: "2025-02-25" },
  { job_id: "JOB-006", part_name: "Carbon Fiber Panel", required_machine_type: "CNC_MILL", required_capabilities: ["composite"], workpiece_diameter: 400, workpiece_length: 300, estimated_run_hours: 9.5, tooling_config: "CFG-MILL-COMP", priority_score: 42, due_date: "2025-03-10" },
  { job_id: "JOB-007", part_name: "Ceramic Nozzle", required_machine_type: "GRINDER", required_capabilities: ["ceramic", "precision"], workpiece_diameter: 50, workpiece_length: 80, estimated_run_hours: 11.25, tooling_config: "CFG-GRIND-CER", priority_score: 30, due_date: "2025-03-15" },
  { job_id: "JOB-008", part_name: "Aluminum Housing", required_machine_type: "CNC_MILL", required_capabilities: ["aluminum"], workpiece_diameter: 200, workpiece_length: 150, estimated_run_hours: 34.5, tooling_config: "CFG-MILL-AL", priority_score: 48, due_date: "2025-03-05" },
];

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function getSetupTime(fromConfig: string, toConfig: string): number {
  if (fromConfig === toConfig) return 0;
  const entry = SETUP_MATRIX.find(s => s.from_config === fromConfig && s.to_config === toConfig);
  return entry ? entry.setup_hours : 1.5; // default 1.5h for unknown transitions
}

function machineFitsJob(machine: Machine, job: PendingJob): boolean {
  if (machine.machine_type !== job.required_machine_type) return false;
  if (job.workpiece_diameter > machine.max_workpiece_diameter) return false;
  if (job.workpiece_length > machine.max_workpiece_length) return false;
  return job.required_capabilities.every(cap => machine.capabilities.includes(cap));
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

function handleAllocAssign(params: Record<string, unknown>): unknown {
  const jobId = params.job_id as string | undefined;
  const strategy = (params.strategy as string) || "balanced"; // balanced, fastest, cheapest

  const jobs = jobId ? PENDING_JOBS.filter(j => j.job_id === jobId) : PENDING_JOBS;

  const assignments = jobs.map(job => {
    const capable = MACHINES.filter(m => machineFitsJob(m, job) && m.status !== "offline" && m.status !== "maintenance");

    const scored = capable.map(machine => {
      const setupTime = getSetupTime(machine.current_setup, job.tooling_config);
      const totalHours = setupTime + job.estimated_run_hours;
      const totalCost = totalHours * machine.hourly_rate;
      const availableHours = machine.shift_hours * (1 - machine.load_pct / 100);
      const daysToComplete = availableHours > 0 ? Math.ceil(totalHours / availableHours) : 999;

      // Scoring by strategy
      let score: number;
      if (strategy === "fastest") {
        score = 100 - Math.min(100, daysToComplete * 10);
      } else if (strategy === "cheapest") {
        score = 100 - Math.min(100, totalCost / 50);
      } else {
        // balanced: combine load, cost, and time
        const loadScore = 100 - machine.load_pct;
        const costScore = 100 - Math.min(100, totalCost / 80);
        const timeScore = 100 - Math.min(100, daysToComplete * 8);
        score = loadScore * 0.4 + costScore * 0.3 + timeScore * 0.3;
      }

      return {
        machine_id: machine.machine_id,
        machine_name: machine.machine_name,
        current_load_pct: machine.load_pct,
        setup_hours: setupTime,
        total_hours: Math.round(totalHours * 10) / 10,
        estimated_cost: Math.round(totalCost),
        days_to_complete: daysToComplete,
        score: Math.round(score * 10) / 10,
      };
    }).sort((a, b) => b.score - a.score);

    return {
      job_id: job.job_id,
      part_name: job.part_name,
      priority_score: job.priority_score,
      due_date: job.due_date,
      candidates: scored,
      recommended: scored[0] || null,
      capable_machines: scored.length,
    };
  });

  return {
    action: "alloc_assign",
    strategy,
    total_jobs: assignments.length,
    assignments,
    summary: {
      jobs_with_candidates: assignments.filter(a => a.capable_machines > 0).length,
      jobs_no_machine: assignments.filter(a => a.capable_machines === 0).length,
      avg_candidates: assignments.length > 0 ? Math.round(assignments.reduce((s, a) => s + a.capable_machines, 0) / assignments.length * 10) / 10 : 0,
      total_estimated_cost: assignments.reduce((s, a) => s + (a.recommended?.estimated_cost || 0), 0),
    },
  };
}

function handleAllocBalance(params: Record<string, unknown>): unknown {
  const machineType = params.machine_type as string | undefined;

  let machines = MACHINES.filter(m => m.status !== "offline");
  if (machineType) machines = machines.filter(m => m.machine_type === machineType);

  const loads = machines.map(m => ({
    machine_id: m.machine_id,
    machine_name: m.machine_name,
    machine_type: m.machine_type,
    load_pct: m.load_pct,
    available_hours: Math.round(m.shift_hours * (1 - m.load_pct / 100) * 10) / 10,
    queued_jobs: m.queued_jobs.length,
    status: m.status,
    hourly_rate: m.hourly_rate,
  }));

  const avgLoad = loads.length > 0 ? Math.round(loads.reduce((s, l) => s + l.load_pct, 0) / loads.length * 10) / 10 : 0;
  const maxLoad = Math.max(...loads.map(l => l.load_pct), 0);
  const minLoad = Math.min(...loads.map(l => l.load_pct), 100);
  const imbalance = maxLoad - minLoad;

  // Identify rebalancing opportunities
  const overloaded = loads.filter(l => l.load_pct > avgLoad + 15);
  const underutilized = loads.filter(l => l.load_pct < avgLoad - 15);

  const recommendations: Array<{
    action: string; from_machine: string; to_machine: string; reason: string;
  }> = [];

  for (const over of overloaded) {
    const target = underutilized.find(u => u.machine_type === over.machine_type);
    if (target) {
      recommendations.push({
        action: "transfer_job",
        from_machine: over.machine_name,
        to_machine: target.machine_name,
        reason: `${over.machine_name} at ${over.load_pct}%, ${target.machine_name} at ${target.load_pct}%`,
      });
    }
  }

  return {
    action: "alloc_balance",
    total_machines: loads.length,
    machine_loads: loads,
    balance_metrics: {
      avg_load_pct: avgLoad,
      max_load_pct: maxLoad,
      min_load_pct: minLoad,
      imbalance_pct: imbalance,
      balance_score: Math.round(Math.max(0, 100 - imbalance) * 10) / 10,
    },
    recommendations,
    summary: {
      overloaded_count: overloaded.length,
      underutilized_count: underutilized.length,
      rebalance_opportunities: recommendations.length,
      total_available_hours: Math.round(loads.reduce((s, l) => s + l.available_hours, 0) * 10) / 10,
    },
  };
}

function handleAllocSetup(params: Record<string, unknown>): unknown {
  const machineId = params.machine_id as string | undefined;

  let machines = MACHINES;
  if (machineId) machines = machines.filter(m => m.machine_id === machineId);

  // Analyze setup patterns
  const analyses = machines.map(machine => {
    const pendingForMachine = PENDING_JOBS.filter(j => machineFitsJob(machine, j));
    const setups = pendingForMachine.map(job => {
      const setupTime = getSetupTime(machine.current_setup, job.tooling_config);
      const matrixEntry = SETUP_MATRIX.find(
        s => s.from_config === machine.current_setup && s.to_config === job.tooling_config
      );
      return {
        job_id: job.job_id,
        part_name: job.part_name,
        from_config: machine.current_setup,
        to_config: job.tooling_config,
        setup_hours: setupTime,
        tooling_changes: matrixEntry?.tooling_changes || 0,
        fixture_change: matrixEntry?.fixture_change || false,
      };
    }).sort((a, b) => a.setup_hours - b.setup_hours);

    const totalSetupHours = setups.reduce((s, su) => s + su.setup_hours, 0);

    // Optimal ordering: group by config to minimize changeovers
    const configGroups = new Map<string, typeof setups>();
    for (const s of setups) {
      const group = configGroups.get(s.to_config) || [];
      group.push(s);
      configGroups.set(s.to_config, group);
    }
    const optimizedOrder = [...configGroups.values()].flat();
    let optimizedTotal = 0;
    let prevConfig = machine.current_setup;
    for (const s of optimizedOrder) {
      optimizedTotal += getSetupTime(prevConfig, s.to_config);
      prevConfig = s.to_config;
    }

    return {
      machine_id: machine.machine_id,
      machine_name: machine.machine_name,
      current_config: machine.current_setup,
      pending_setups: setups,
      setup_metrics: {
        total_setup_hours_naive: Math.round(totalSetupHours * 10) / 10,
        total_setup_hours_optimized: Math.round(optimizedTotal * 10) / 10,
        savings_hours: Math.round((totalSetupHours - optimizedTotal) * 10) / 10,
        savings_pct: totalSetupHours > 0 ? Math.round((1 - optimizedTotal / totalSetupHours) * 100) : 0,
      },
      recommended_order: optimizedOrder.map(s => s.job_id),
    };
  });

  const totalNaive = analyses.reduce((s, a) => s + a.setup_metrics.total_setup_hours_naive, 0);
  const totalOptimized = analyses.reduce((s, a) => s + a.setup_metrics.total_setup_hours_optimized, 0);

  return {
    action: "alloc_setup",
    total_machines_analyzed: analyses.length,
    analyses,
    summary: {
      total_naive_hours: Math.round(totalNaive * 10) / 10,
      total_optimized_hours: Math.round(totalOptimized * 10) / 10,
      total_savings_hours: Math.round((totalNaive - totalOptimized) * 10) / 10,
      overall_savings_pct: totalNaive > 0 ? Math.round((1 - totalOptimized / totalNaive) * 100) : 0,
    },
  };
}

function handleAllocConflict(params: Record<string, unknown>): unknown {
  const checkDate = (params.date as string) || "2025-02-07";

  // Detect conflicts: multiple jobs needing same machine type at same time
  const conflicts: Array<{
    type: string; description: string; severity: "low" | "medium" | "high" | "critical";
    affected_jobs: string[]; affected_machines: string[]; resolution: string;
  }> = [];

  // Check overloaded machines
  for (const machine of MACHINES) {
    if (machine.load_pct > 95) {
      conflicts.push({
        type: "overload",
        description: `${machine.machine_name} at ${machine.load_pct}% — exceeds safe capacity`,
        severity: "high",
        affected_jobs: machine.queued_jobs,
        affected_machines: [machine.machine_id],
        resolution: `Offload jobs to ${MACHINES.find(m => m.machine_type === machine.machine_type && m.load_pct < 70)?.machine_name || "alternate machine"}`,
      });
    }
  }

  // Check competing jobs for same machine type
  const byType = new Map<string, PendingJob[]>();
  for (const job of PENDING_JOBS) {
    const group = byType.get(job.required_machine_type) || [];
    group.push(job);
    byType.set(job.required_machine_type, group);
  }
  for (const [type, jobs] of byType) {
    const availableMachines = MACHINES.filter(m => m.machine_type === type && m.status !== "offline" && m.load_pct < 80);
    if (jobs.length > availableMachines.length) {
      conflicts.push({
        type: "capacity_shortage",
        description: `${jobs.length} jobs need ${type} but only ${availableMachines.length} machine(s) available under 80% load`,
        severity: jobs.some(j => j.priority_score >= 70) ? "critical" : "medium",
        affected_jobs: jobs.map(j => j.job_id),
        affected_machines: availableMachines.map(m => m.machine_id),
        resolution: "Schedule jobs sequentially by priority; consider overtime for critical jobs",
      });
    }
  }

  // Check maintenance vs scheduled work
  for (const machine of MACHINES) {
    if (machine.queued_jobs.length > 0) {
      // Simplified check: if machine has maintenance soon while jobs are queued
      if (machine.status === "maintenance") {
        conflicts.push({
          type: "maintenance_conflict",
          description: `${machine.machine_name} in maintenance but has ${machine.queued_jobs.length} queued job(s)`,
          severity: "high",
          affected_jobs: machine.queued_jobs,
          affected_machines: [machine.machine_id],
          resolution: "Reassign jobs to available machines or expedite maintenance completion",
        });
      }
    }
  }

  const critical = conflicts.filter(c => c.severity === "critical");
  const high = conflicts.filter(c => c.severity === "high");

  return {
    action: "alloc_conflict",
    check_date: checkDate,
    total_conflicts: conflicts.length,
    conflicts,
    summary: {
      critical_count: critical.length,
      high_count: high.length,
      total_affected_jobs: [...new Set(conflicts.flatMap(c => c.affected_jobs))].length,
      total_affected_machines: [...new Set(conflicts.flatMap(c => c.affected_machines))].length,
      overall_risk: critical.length > 0 ? "CRITICAL" : high.length > 0 ? "HIGH" : conflicts.length > 0 ? "MEDIUM" : "LOW",
    },
  };
}

// ─── Public Dispatcher ────────────────────────────────────────────────────────

export function executeMachineAllocationAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "alloc_assign":   return handleAllocAssign(params);
    case "alloc_balance":  return handleAllocBalance(params);
    case "alloc_setup":    return handleAllocSetup(params);
    case "alloc_conflict": return handleAllocConflict(params);
    default:
      throw new Error(`MachineAllocationEngine: unknown action "${action}"`);
  }
}
