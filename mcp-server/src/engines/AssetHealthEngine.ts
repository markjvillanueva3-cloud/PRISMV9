/**
 * AssetHealthEngine — R21-MS2
 *
 * Machine health scoring, degradation tracking, maintenance planning,
 * and cross-machine comparison. Monitors spindle, axis, coolant, and
 * electrical subsystems to produce holistic health assessments.
 *
 * Actions:
 *   ah_score           — compute overall health score for a machine
 *   ah_degradation     — track degradation trends over time
 *   ah_maintenance_plan — generate maintenance plan based on health
 *   ah_compare         — compare health across multiple machines
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface SubsystemHealth {
  name: string;
  score: number; // 0-100
  weight: number;
  status: "healthy" | "warning" | "degraded" | "critical";
  indicators: { name: string; value: number; unit: string; threshold: number; status: string }[];
  trend: "improving" | "stable" | "declining";
}

interface MachineHealth {
  machine_id: string;
  machine_type: string;
  overall_score: number;
  overall_status: "healthy" | "warning" | "degraded" | "critical";
  subsystems: SubsystemHealth[];
  hours_since_last_maintenance: number;
  total_runtime_hours: number;
}

interface MaintenanceTask {
  id: string;
  subsystem: string;
  task: string;
  priority: "critical" | "high" | "medium" | "low";
  estimated_hours: number;
  estimated_cost: number;
  due_in_hours: number;
  impact_if_skipped: string;
}

// ── Machine Type Database ──────────────────────────────────────────────────

const MACHINE_TYPES: Record<string, {
  subsystem_weights: Record<string, number>;
  maintenance_interval_hrs: number;
  expected_life_hrs: number;
  hourly_cost: number;
}> = {
  cnc_3axis: {
    subsystem_weights: { spindle: 0.30, axes: 0.25, coolant: 0.15, electrical: 0.15, hydraulic: 0.10, enclosure: 0.05 },
    maintenance_interval_hrs: 500, expected_life_hrs: 40000, hourly_cost: 65,
  },
  cnc_5axis: {
    subsystem_weights: { spindle: 0.25, axes: 0.30, coolant: 0.15, electrical: 0.15, hydraulic: 0.10, enclosure: 0.05 },
    maintenance_interval_hrs: 400, expected_life_hrs: 35000, hourly_cost: 95,
  },
  cnc_lathe: {
    subsystem_weights: { spindle: 0.35, axes: 0.20, coolant: 0.15, electrical: 0.15, hydraulic: 0.10, enclosure: 0.05 },
    maintenance_interval_hrs: 600, expected_life_hrs: 45000, hourly_cost: 55,
  },
  cnc_grinder: {
    subsystem_weights: { spindle: 0.35, axes: 0.20, coolant: 0.20, electrical: 0.15, hydraulic: 0.05, enclosure: 0.05 },
    maintenance_interval_hrs: 300, expected_life_hrs: 30000, hourly_cost: 75,
  },
  cnc_edm: {
    subsystem_weights: { spindle: 0.10, axes: 0.25, coolant: 0.30, electrical: 0.25, hydraulic: 0.05, enclosure: 0.05 },
    maintenance_interval_hrs: 400, expected_life_hrs: 35000, hourly_cost: 70,
  },
};

// ── Helper Functions ───────────────────────────────────────────────────────

function round2(v: number): number { return Math.round(v * 100) / 100; }

function getMachineType(type: string): typeof MACHINE_TYPES[string] {
  const key = type.toLowerCase().replace(/[\s-]/g, "_");
  return MACHINE_TYPES[key] ?? MACHINE_TYPES.cnc_3axis;
}

function statusFromScore(score: number): SubsystemHealth["status"] {
  return score >= 80 ? "healthy" : score >= 60 ? "warning" : score >= 40 ? "degraded" : "critical";
}

function evaluateSubsystem(
  name: string,
  params: Record<string, unknown>,
  runtimeHrs: number,
  lastMaintenanceHrs: number,
): SubsystemHealth {
  const indicators: SubsystemHealth["indicators"] = [];
  let totalScore = 100;

  switch (name) {
    case "spindle": {
      const vibration = Number(params.spindle_vibration_mm_s ?? 0.5 + Math.random() * 2);
      const temp = Number(params.spindle_temperature_c ?? 30 + Math.random() * 30);
      const runout = Number(params.spindle_runout_um ?? 1 + Math.random() * 5);
      const bearingHrs = Number(params.bearing_hours ?? runtimeHrs * 0.8);

      indicators.push({ name: "vibration", value: round2(vibration), unit: "mm/s", threshold: 4.0, status: vibration > 4.0 ? "alarm" : vibration > 2.5 ? "warning" : "ok" });
      indicators.push({ name: "temperature", value: round2(temp), unit: "°C", threshold: 65, status: temp > 65 ? "alarm" : temp > 50 ? "warning" : "ok" });
      indicators.push({ name: "runout", value: round2(runout), unit: "μm", threshold: 5.0, status: runout > 5.0 ? "alarm" : runout > 3.0 ? "warning" : "ok" });
      indicators.push({ name: "bearing_hours", value: round2(bearingHrs), unit: "hrs", threshold: 8000, status: bearingHrs > 8000 ? "alarm" : bearingHrs > 6000 ? "warning" : "ok" });

      if (vibration > 4.0) totalScore -= 35;
      else if (vibration > 2.5) totalScore -= 15;
      if (temp > 65) totalScore -= 25;
      else if (temp > 50) totalScore -= 10;
      if (runout > 5.0) totalScore -= 25;
      else if (runout > 3.0) totalScore -= 10;
      if (bearingHrs > 8000) totalScore -= 20;
      else if (bearingHrs > 6000) totalScore -= 8;
      break;
    }
    case "axes": {
      const backlash = Number(params.axis_backlash_um ?? 2 + Math.random() * 8);
      const posAccuracy = Number(params.positioning_accuracy_um ?? 3 + Math.random() * 10);
      const ballscrewWear = Number(params.ballscrew_wear_pct ?? (runtimeHrs / 40000) * 100);

      indicators.push({ name: "backlash", value: round2(backlash), unit: "μm", threshold: 10, status: backlash > 10 ? "alarm" : backlash > 5 ? "warning" : "ok" });
      indicators.push({ name: "positioning_accuracy", value: round2(posAccuracy), unit: "μm", threshold: 10, status: posAccuracy > 10 ? "alarm" : posAccuracy > 6 ? "warning" : "ok" });
      indicators.push({ name: "ballscrew_wear", value: round2(ballscrewWear), unit: "%", threshold: 80, status: ballscrewWear > 80 ? "alarm" : ballscrewWear > 50 ? "warning" : "ok" });

      if (backlash > 10) totalScore -= 30;
      else if (backlash > 5) totalScore -= 12;
      if (posAccuracy > 10) totalScore -= 30;
      else if (posAccuracy > 6) totalScore -= 12;
      if (ballscrewWear > 80) totalScore -= 25;
      else if (ballscrewWear > 50) totalScore -= 10;
      break;
    }
    case "coolant": {
      const concentration = Number(params.coolant_concentration_pct ?? 5 + Math.random() * 5);
      const ph = Number(params.coolant_ph ?? 8.5 + Math.random() * 1.5);
      const temp = Number(params.coolant_temp_c ?? 20 + Math.random() * 10);

      indicators.push({ name: "concentration", value: round2(concentration), unit: "%", threshold: 3, status: concentration < 3 ? "alarm" : concentration < 5 ? "warning" : "ok" });
      indicators.push({ name: "ph", value: round2(ph), unit: "pH", threshold: 9.5, status: ph > 9.5 || ph < 7.5 ? "alarm" : ph > 9.2 || ph < 8.0 ? "warning" : "ok" });
      indicators.push({ name: "temperature", value: round2(temp), unit: "°C", threshold: 30, status: temp > 30 ? "alarm" : temp > 25 ? "warning" : "ok" });

      if (concentration < 3) totalScore -= 30;
      else if (concentration < 5) totalScore -= 10;
      if (ph > 9.5 || ph < 7.5) totalScore -= 25;
      else if (ph > 9.2 || ph < 8.0) totalScore -= 10;
      if (temp > 30) totalScore -= 20;
      else if (temp > 25) totalScore -= 8;
      break;
    }
    case "electrical": {
      const powerVariation = Number(params.power_variation_pct ?? 1 + Math.random() * 4);
      const insulationResistance = Number(params.insulation_mohm ?? 50 + Math.random() * 200);

      indicators.push({ name: "power_variation", value: round2(powerVariation), unit: "%", threshold: 5, status: powerVariation > 5 ? "alarm" : powerVariation > 3 ? "warning" : "ok" });
      indicators.push({ name: "insulation_resistance", value: round2(insulationResistance), unit: "MΩ", threshold: 10, status: insulationResistance < 10 ? "alarm" : insulationResistance < 50 ? "warning" : "ok" });

      if (powerVariation > 5) totalScore -= 35;
      else if (powerVariation > 3) totalScore -= 15;
      if (insulationResistance < 10) totalScore -= 40;
      else if (insulationResistance < 50) totalScore -= 15;
      break;
    }
    case "hydraulic": {
      const pressure = Number(params.hydraulic_pressure_bar ?? 50 + Math.random() * 20);
      const oilTemp = Number(params.hydraulic_oil_temp_c ?? 35 + Math.random() * 20);

      indicators.push({ name: "pressure", value: round2(pressure), unit: "bar", threshold: 40, status: pressure < 40 ? "alarm" : pressure < 45 ? "warning" : "ok" });
      indicators.push({ name: "oil_temperature", value: round2(oilTemp), unit: "°C", threshold: 55, status: oilTemp > 55 ? "alarm" : oilTemp > 45 ? "warning" : "ok" });

      if (pressure < 40) totalScore -= 40;
      else if (pressure < 45) totalScore -= 15;
      if (oilTemp > 55) totalScore -= 30;
      else if (oilTemp > 45) totalScore -= 12;
      break;
    }
    case "enclosure": {
      const sealCondition = Number(params.seal_condition_pct ?? 70 + Math.random() * 30);
      indicators.push({ name: "seal_condition", value: round2(sealCondition), unit: "%", threshold: 50, status: sealCondition < 50 ? "alarm" : sealCondition < 70 ? "warning" : "ok" });

      if (sealCondition < 50) totalScore -= 40;
      else if (sealCondition < 70) totalScore -= 15;
      break;
    }
  }

  // Age-based degradation
  const maintenanceOverdue = lastMaintenanceHrs > 0 ? lastMaintenanceHrs / 500 : 0;
  if (maintenanceOverdue > 1.5) totalScore -= 15;
  else if (maintenanceOverdue > 1.0) totalScore -= 5;

  totalScore = Math.max(0, Math.min(100, totalScore));
  const alarms = indicators.filter(i => i.status === "alarm").length;
  const warnings = indicators.filter(i => i.status === "warning").length;
  const trend: SubsystemHealth["trend"] = alarms > 0 ? "declining" : warnings > 0 ? "stable" : "improving";

  return {
    name,
    score: round2(totalScore),
    weight: 0, // filled in by caller
    status: statusFromScore(totalScore),
    indicators,
    trend,
  };
}

// ── Action Handlers ────────────────────────────────────────────────────────

function ahScore(params: Record<string, unknown>): unknown {
  const machineId = String(params.machine_id ?? "MCH-001");
  const machineType = String(params.machine_type ?? "cnc_3axis");
  const runtimeHrs = Number(params.total_runtime_hours ?? 5000);
  const lastMaintenanceHrs = Number(params.hours_since_last_maintenance ?? 200);

  const mt = getMachineType(machineType);
  const subsystemNames = Object.keys(mt.subsystem_weights);

  const subsystems: SubsystemHealth[] = subsystemNames.map(name => {
    const sub = evaluateSubsystem(name, params, runtimeHrs, lastMaintenanceHrs);
    sub.weight = mt.subsystem_weights[name];
    return sub;
  });

  const overallScore = round2(subsystems.reduce((s, sub) => s + sub.score * sub.weight, 0));

  const health: MachineHealth = {
    machine_id: machineId,
    machine_type: machineType,
    overall_score: overallScore,
    overall_status: statusFromScore(overallScore),
    subsystems,
    hours_since_last_maintenance: lastMaintenanceHrs,
    total_runtime_hours: runtimeHrs,
  };

  return {
    health,
    life_remaining_pct: round2(Math.max(0, (1 - runtimeHrs / mt.expected_life_hrs) * 100)),
    maintenance_overdue: lastMaintenanceHrs > mt.maintenance_interval_hrs,
    next_maintenance_due_hrs: Math.max(0, mt.maintenance_interval_hrs - lastMaintenanceHrs),
    critical_subsystems: subsystems.filter(s => s.status === "critical").map(s => s.name),
    warning_subsystems: subsystems.filter(s => s.status === "warning").map(s => s.name),
  };
}

function ahDegradation(params: Record<string, unknown>): unknown {
  const machineId = String(params.machine_id ?? "MCH-001");
  const machineType = String(params.machine_type ?? "cnc_3axis");
  const mt = getMachineType(machineType);
  const runtimeHrs = Number(params.total_runtime_hours ?? 5000);
  const periods = Number(params.periods ?? 6);

  // Simulate degradation over time periods
  const history: { period: number; runtime_hrs: number; overall_score: number; subsystem_scores: Record<string, number> }[] = [];

  for (let i = 0; i < periods; i++) {
    const periodHrs = runtimeHrs - (periods - 1 - i) * 500;
    if (periodHrs <= 0) continue;

    const ageFactor = periodHrs / mt.expected_life_hrs;
    const degradation = ageFactor * 30; // Max 30 points degradation at end of life

    const subsystemScores: Record<string, number> = {};
    let overall = 0;
    for (const [name, weight] of Object.entries(mt.subsystem_weights)) {
      const base = 95 - degradation + (Math.random() - 0.5) * 10;
      const score = round2(Math.max(0, Math.min(100, base)));
      subsystemScores[name] = score;
      overall += score * weight;
    }

    history.push({
      period: i + 1,
      runtime_hrs: round2(periodHrs),
      overall_score: round2(overall),
      subsystem_scores: subsystemScores,
    });
  }

  // Calculate degradation rate
  const scores = history.map(h => h.overall_score);
  const degradationRate = scores.length >= 2
    ? round2((scores[0] - scores[scores.length - 1]) / (scores.length - 1))
    : 0;

  // Predict remaining useful life
  const currentScore = scores[scores.length - 1] ?? 80;
  const criticalThreshold = 40;
  const periodsToThreshold = degradationRate > 0
    ? Math.ceil((currentScore - criticalThreshold) / degradationRate)
    : 999;

  return {
    machine_id: machineId,
    machine_type: machineType,
    history,
    degradation_analysis: {
      degradation_rate_per_period: degradationRate,
      current_score: currentScore,
      critical_threshold: criticalThreshold,
      estimated_periods_to_critical: periodsToThreshold,
      estimated_hours_to_critical: periodsToThreshold * 500,
      trend: degradationRate > 2 ? "rapid_decline" : degradationRate > 0.5 ? "gradual_decline" : "stable",
    },
    fastest_degrading: Object.entries(history[history.length - 1]?.subsystem_scores ?? {})
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([name, score]) => ({ subsystem: name, score })),
  };
}

function ahMaintenancePlan(params: Record<string, unknown>): unknown {
  const machineId = String(params.machine_id ?? "MCH-001");
  const machineType = String(params.machine_type ?? "cnc_3axis");
  const runtimeHrs = Number(params.total_runtime_hours ?? 5000);
  const lastMaintenanceHrs = Number(params.hours_since_last_maintenance ?? 200);
  const mt = getMachineType(machineType);

  // Evaluate current health
  const subsystemNames = Object.keys(mt.subsystem_weights);
  const subsystems = subsystemNames.map(name => {
    const sub = evaluateSubsystem(name, params, runtimeHrs, lastMaintenanceHrs);
    sub.weight = mt.subsystem_weights[name];
    return sub;
  });

  const tasks: MaintenanceTask[] = [];
  let taskId = 1;

  for (const sub of subsystems) {
    const alarms = sub.indicators.filter(i => i.status === "alarm");
    const warnings = sub.indicators.filter(i => i.status === "warning");

    if (alarms.length > 0) {
      tasks.push({
        id: `MT${String(taskId++).padStart(3, "0")}`,
        subsystem: sub.name,
        task: `Critical repair: ${alarms.map(a => a.name).join(", ")} out of spec`,
        priority: "critical",
        estimated_hours: sub.name === "spindle" ? 8 : 4,
        estimated_cost: sub.name === "spindle" ? 2500 : 800,
        due_in_hours: 0,
        impact_if_skipped: "Machine damage, scrap production, safety risk",
      });
    }

    if (warnings.length > 0) {
      tasks.push({
        id: `MT${String(taskId++).padStart(3, "0")}`,
        subsystem: sub.name,
        task: `Preventive: ${warnings.map(w => w.name).join(", ")} approaching limits`,
        priority: sub.score < 60 ? "high" : "medium",
        estimated_hours: 2,
        estimated_cost: 300,
        due_in_hours: sub.score < 60 ? 24 : 168,
        impact_if_skipped: "Accelerated degradation, potential unplanned downtime",
      });
    }

    // Routine maintenance check
    if (lastMaintenanceHrs > mt.maintenance_interval_hrs * 0.8) {
      tasks.push({
        id: `MT${String(taskId++).padStart(3, "0")}`,
        subsystem: sub.name,
        task: `Scheduled ${sub.name} maintenance`,
        priority: lastMaintenanceHrs > mt.maintenance_interval_hrs ? "high" : "low",
        estimated_hours: 1,
        estimated_cost: 150,
        due_in_hours: Math.max(0, mt.maintenance_interval_hrs - lastMaintenanceHrs),
        impact_if_skipped: "Warranty implications, gradual performance loss",
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const totalCost = tasks.reduce((s, t) => s + t.estimated_cost, 0);
  const totalHours = tasks.reduce((s, t) => s + t.estimated_hours, 0);

  return {
    machine_id: machineId,
    machine_type: machineType,
    total_tasks: tasks.length,
    tasks,
    summary: {
      critical_tasks: tasks.filter(t => t.priority === "critical").length,
      high_tasks: tasks.filter(t => t.priority === "high").length,
      medium_tasks: tasks.filter(t => t.priority === "medium").length,
      low_tasks: tasks.filter(t => t.priority === "low").length,
      total_estimated_hours: round2(totalHours),
      total_estimated_cost: round2(totalCost),
      estimated_downtime_hours: round2(totalHours * 1.2), // 20% overhead
    },
    scheduling_recommendation: tasks.some(t => t.priority === "critical")
      ? "Immediate shutdown required for critical repairs"
      : tasks.some(t => t.priority === "high")
        ? "Schedule maintenance within 24 hours"
        : "Schedule maintenance at next planned downtime",
  };
}

function ahCompare(params: Record<string, unknown>): unknown {
  const machines: { id: string; type: string; runtime: number; last_maint: number }[] = [];

  if (Array.isArray(params.machines)) {
    for (const m of params.machines) {
      const mObj = m as Record<string, unknown>;
      machines.push({
        id: String(mObj.machine_id ?? `MCH-${machines.length + 1}`),
        type: String(mObj.machine_type ?? "cnc_3axis"),
        runtime: Number(mObj.total_runtime_hours ?? 5000),
        last_maint: Number(mObj.hours_since_last_maintenance ?? 200),
      });
    }
  } else {
    // Default comparison fleet
    machines.push(
      { id: "MCH-001", type: "cnc_3axis", runtime: 5000, last_maint: 200 },
      { id: "MCH-002", type: "cnc_5axis", runtime: 3000, last_maint: 100 },
      { id: "MCH-003", type: "cnc_lathe", runtime: 8000, last_maint: 450 },
    );
  }

  const assessments = machines.map(m => {
    const mt = getMachineType(m.type);
    const subsystemNames = Object.keys(mt.subsystem_weights);
    const subsystems = subsystemNames.map(name => {
      const sub = evaluateSubsystem(name, params, m.runtime, m.last_maint);
      sub.weight = mt.subsystem_weights[name];
      return sub;
    });
    const overallScore = round2(subsystems.reduce((s, sub) => s + sub.score * sub.weight, 0));

    return {
      machine_id: m.id,
      machine_type: m.type,
      overall_score: overallScore,
      status: statusFromScore(overallScore),
      runtime_hours: m.runtime,
      life_remaining_pct: round2(Math.max(0, (1 - m.runtime / mt.expected_life_hrs) * 100)),
      critical_issues: subsystems.filter(s => s.status === "critical").length,
      worst_subsystem: subsystems.sort((a, b) => a.score - b.score)[0]?.name ?? "none",
    };
  });

  assessments.sort((a, b) => a.overall_score - b.overall_score);

  return {
    total_machines: assessments.length,
    fleet_avg_score: round2(assessments.reduce((s, a) => s + a.overall_score, 0) / assessments.length),
    fleet_status: assessments.some(a => a.status === "critical") ? "critical"
      : assessments.some(a => a.status === "degraded") ? "degraded"
      : assessments.some(a => a.status === "warning") ? "warning" : "healthy",
    assessments,
    needs_attention: assessments.filter(a => a.status === "critical" || a.status === "degraded")
      .map(a => ({ machine_id: a.machine_id, score: a.overall_score, status: a.status })),
    best_performer: assessments[assessments.length - 1],
    worst_performer: assessments[0],
  };
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function executeAssetHealthAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "ah_score":            return ahScore(params);
    case "ah_degradation":      return ahDegradation(params);
    case "ah_maintenance_plan": return ahMaintenancePlan(params);
    case "ah_compare":          return ahCompare(params);
    default:
      throw new Error(`AssetHealthEngine: unknown action "${action}"`);
  }
}
