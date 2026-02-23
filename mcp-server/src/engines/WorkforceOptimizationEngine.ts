/**
 * WorkforceOptimizationEngine — R24-MS4
 *
 * Shift scheduling, skill-based operator-machine assignment,
 * workforce capacity planning, and workload balancing.
 *
 * Actions:
 *   wf_schedule — Shift scheduling and coverage analysis
 *   wf_assign   — Skill-based operator-machine assignment
 *   wf_capacity — Workforce capacity planning and forecasting
 *   wf_balance  — Workload balancing across shifts and departments
 */

// ── Shift Definitions ──────────────────────────────────────────────────────

interface ShiftDefinition {
  shift_id: string;
  name: string;
  start_time: string;
  end_time: string;
  hours: number;
  days: string[];
  premium_pct: number; // shift differential
}

const SHIFTS: ShiftDefinition[] = [
  { shift_id: "SHIFT-A", name: "Day Shift", start_time: "06:00", end_time: "14:00", hours: 8, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], premium_pct: 0 },
  { shift_id: "SHIFT-B", name: "Swing Shift", start_time: "14:00", end_time: "22:00", hours: 8, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], premium_pct: 10 },
  { shift_id: "SHIFT-C", name: "Night Shift", start_time: "22:00", end_time: "06:00", hours: 8, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], premium_pct: 15 },
  { shift_id: "SHIFT-W", name: "Weekend", start_time: "06:00", end_time: "18:00", hours: 12, days: ["Sat", "Sun"], premium_pct: 25 },
];

// ── Operator Workforce Data ────────────────────────────────────────────────

interface WorkforceOperator {
  operator_id: string;
  name: string;
  department: string;
  assigned_shift: string;
  skills: Record<string, number>;
  hourly_rate_usd: number;
  availability: "AVAILABLE" | "ON_LEAVE" | "TRAINING" | "RESTRICTED";
  weekly_hours_cap: number;
  overtime_eligible: boolean;
  seniority_years: number;
  quality_score: number;
  productivity_score: number;
}

const WORKFORCE: WorkforceOperator[] = [
  { operator_id: "OP-001", name: "James Martinez", department: "CNC Shop", assigned_shift: "SHIFT-A",
    skills: { "SK-TURN": 5, "SK-MILL": 4, "SK-GRIND": 3, "SK-SETUP": 5, "SK-TOOL": 4, "SK-PROG": 3 },
    hourly_rate_usd: 38, availability: "AVAILABLE", weekly_hours_cap: 50, overtime_eligible: true, seniority_years: 7, quality_score: 94, productivity_score: 91 },
  { operator_id: "OP-002", name: "Sarah Chen", department: "CNC Shop", assigned_shift: "SHIFT-A",
    skills: { "SK-TURN": 3, "SK-MILL": 5, "SK-EDM": 4, "SK-SETUP": 4, "SK-TOOL": 5, "SK-PROG": 5, "SK-FIX": 4 },
    hourly_rate_usd: 42, availability: "AVAILABLE", weekly_hours_cap: 45, overtime_eligible: true, seniority_years: 6, quality_score: 96, productivity_score: 88 },
  { operator_id: "OP-003", name: "Robert Thompson", department: "Quality Lab", assigned_shift: "SHIFT-A",
    skills: { "SK-CMM": 5, "SK-GDT": 5, "SK-SPC": 5, "SK-INSP": 5 },
    hourly_rate_usd: 36, availability: "AVAILABLE", weekly_hours_cap: 45, overtime_eligible: true, seniority_years: 10, quality_score: 99, productivity_score: 82 },
  { operator_id: "OP-004", name: "Maria Rodriguez", department: "CNC Shop", assigned_shift: "SHIFT-B",
    skills: { "SK-TURN": 3, "SK-MILL": 3, "SK-SETUP": 3, "SK-TOOL": 3, "SK-PROG": 2 },
    hourly_rate_usd: 30, availability: "TRAINING", weekly_hours_cap: 40, overtime_eligible: true, seniority_years: 4, quality_score: 87, productivity_score: 85 },
  { operator_id: "OP-005", name: "David Kim", department: "CNC Shop", assigned_shift: "SHIFT-B",
    skills: { "SK-TURN": 4, "SK-MILL": 4, "SK-GRIND": 4, "SK-SETUP": 3, "SK-TOOL": 3 },
    hourly_rate_usd: 34, availability: "AVAILABLE", weekly_hours_cap: 50, overtime_eligible: true, seniority_years: 5, quality_score: 90, productivity_score: 93 },
  { operator_id: "OP-006", name: "Lisa Patel", department: "CNC Shop", assigned_shift: "SHIFT-B",
    skills: { "SK-MILL": 3, "SK-TURN": 2, "SK-SETUP": 2, "SK-TOOL": 2, "SK-PROG": 3 },
    hourly_rate_usd: 28, availability: "AVAILABLE", weekly_hours_cap: 40, overtime_eligible: true, seniority_years: 3, quality_score: 83, productivity_score: 79 },
  { operator_id: "OP-007", name: "Thomas Wilson", department: "Maintenance", assigned_shift: "SHIFT-A",
    skills: { "SK-PMNT": 5, "SK-DIAG": 5, "SK-SETUP": 3, "SK-SAFE": 5 },
    hourly_rate_usd: 40, availability: "AVAILABLE", weekly_hours_cap: 50, overtime_eligible: true, seniority_years: 9, quality_score: 85, productivity_score: 90 },
  { operator_id: "OP-008", name: "Emily Johnson", department: "CNC Shop", assigned_shift: "SHIFT-C",
    skills: { "SK-TURN": 2, "SK-MILL": 2, "SK-SETUP": 1, "SK-TOOL": 1 },
    hourly_rate_usd: 24, availability: "AVAILABLE", weekly_hours_cap: 40, overtime_eligible: false, seniority_years: 2, quality_score: 78, productivity_score: 72 },
  { operator_id: "OP-009", name: "Michael Brown", department: "CNC Shop", assigned_shift: "SHIFT-C",
    skills: { "SK-TURN": 4, "SK-MILL": 3, "SK-GRIND": 5, "SK-SETUP": 4, "SK-TOOL": 3 },
    hourly_rate_usd: 36, availability: "AVAILABLE", weekly_hours_cap: 50, overtime_eligible: true, seniority_years: 8, quality_score: 92, productivity_score: 86 },
  { operator_id: "OP-010", name: "Anna Kowalski", department: "Quality Lab", assigned_shift: "SHIFT-B",
    skills: { "SK-CMM": 4, "SK-GDT": 4, "SK-SPC": 4, "SK-INSP": 4 },
    hourly_rate_usd: 32, availability: "AVAILABLE", weekly_hours_cap: 45, overtime_eligible: true, seniority_years: 5, quality_score: 97, productivity_score: 84 },
];

// ── Machine Requirements ───────────────────────────────────────────────────

interface MachineWorkReq {
  machine_id: string;
  machine_type: string;
  department: string;
  required_skills: { skill_id: string; min_level: number }[];
  scheduled_hours_per_week: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

const MACHINE_WORK: MachineWorkReq[] = [
  { machine_id: "MCH-001", machine_type: "CNC Lathe - Mori NLX2500", department: "CNC Shop", required_skills: [{ skill_id: "SK-TURN", min_level: 3 }, { skill_id: "SK-SETUP", min_level: 2 }], scheduled_hours_per_week: 40, priority: "HIGH" },
  { machine_id: "MCH-002", machine_type: "CNC Lathe - Okuma LB3000", department: "CNC Shop", required_skills: [{ skill_id: "SK-TURN", min_level: 3 }, { skill_id: "SK-SETUP", min_level: 2 }], scheduled_hours_per_week: 40, priority: "HIGH" },
  { machine_id: "MCH-003", machine_type: "CNC Mill - Haas VF-4", department: "CNC Shop", required_skills: [{ skill_id: "SK-MILL", min_level: 3 }, { skill_id: "SK-SETUP", min_level: 2 }], scheduled_hours_per_week: 40, priority: "HIGH" },
  { machine_id: "MCH-004", machine_type: "CNC Mill - DMG Mori DMU 50", department: "CNC Shop", required_skills: [{ skill_id: "SK-MILL", min_level: 4 }, { skill_id: "SK-PROG", min_level: 3 }, { skill_id: "SK-SETUP", min_level: 3 }], scheduled_hours_per_week: 35, priority: "HIGH" },
  { machine_id: "MCH-005", machine_type: "Surface Grinder - Okamoto", department: "CNC Shop", required_skills: [{ skill_id: "SK-GRIND", min_level: 3 }], scheduled_hours_per_week: 20, priority: "MEDIUM" },
  { machine_id: "MCH-006", machine_type: "Wire EDM - Makino U6", department: "CNC Shop", required_skills: [{ skill_id: "SK-EDM", min_level: 3 }, { skill_id: "SK-PROG", min_level: 2 }], scheduled_hours_per_week: 30, priority: "MEDIUM" },
  { machine_id: "MCH-007", machine_type: "CMM - Zeiss Contura", department: "Quality Lab", required_skills: [{ skill_id: "SK-CMM", min_level: 3 }, { skill_id: "SK-GDT", min_level: 3 }], scheduled_hours_per_week: 35, priority: "HIGH" },
  { machine_id: "MCH-008", machine_type: "CNC Lathe - Haas ST-20", department: "CNC Shop", required_skills: [{ skill_id: "SK-TURN", min_level: 2 }, { skill_id: "SK-SETUP", min_level: 1 }], scheduled_hours_per_week: 40, priority: "MEDIUM" },
];

// ── Skill Names Lookup ─────────────────────────────────────────────────────

const SKILL_NAMES: Record<string, string> = {
  "SK-TURN": "CNC Turning", "SK-MILL": "CNC Milling", "SK-GRIND": "Precision Grinding",
  "SK-EDM": "EDM Operations", "SK-SETUP": "Machine Setup", "SK-TOOL": "Tool Selection",
  "SK-PROG": "CNC Programming", "SK-FIX": "Fixture Design", "SK-CMM": "CMM Operation",
  "SK-GDT": "GD&T Interpretation", "SK-SPC": "SPC Methods", "SK-INSP": "Manual Inspection",
  "SK-PMNT": "Preventive Maintenance", "SK-DIAG": "Machine Diagnostics",
  "SK-SAFE": "Safety Protocols", "SK-ERGO": "Ergonomics",
};

// ── Helper: Operator qualifies for machine ─────────────────────────────────

function operatorQualifiesForMachine(op: WorkforceOperator, machine: MachineWorkReq): boolean {
  return machine.required_skills.every(rs => (op.skills[rs.skill_id] || 0) >= rs.min_level);
}

function operatorFitScore(op: WorkforceOperator, machine: MachineWorkReq): number {
  let score = 0;
  for (const rs of machine.required_skills) {
    const level = op.skills[rs.skill_id] || 0;
    if (level < rs.min_level) return -1; // disqualified
    score += (level - rs.min_level + 1) * 10; // bonus for exceeding requirement
  }
  score += op.quality_score * 0.3 + op.productivity_score * 0.3;
  score += op.seniority_years * 2;
  return Math.round(score);
}

// ── Action: wf_schedule ────────────────────────────────────────────────────

function wfSchedule(params: Record<string, unknown>): unknown {
  const shiftId = String(params.shift_id || params.shift || "").toUpperCase();
  const dept = String(params.department || "").toLowerCase();
  const weekOf = String(params.week_of || "2025-06-16");

  let shifts = [...SHIFTS];
  if (shiftId) shifts = shifts.filter(s => s.shift_id === shiftId || s.name.toUpperCase().includes(shiftId));

  const schedule = shifts.map(shift => {
    let operators = WORKFORCE.filter(op => op.assigned_shift === shift.shift_id);
    if (dept) operators = operators.filter(op => op.department.toLowerCase().includes(dept));

    const available = operators.filter(op => op.availability === "AVAILABLE");
    const onLeave = operators.filter(op => op.availability === "ON_LEAVE");
    const inTraining = operators.filter(op => op.availability === "TRAINING");

    const totalCapacityHours = available.reduce((s, op) => s + shift.hours * shift.days.length, 0);
    const laborCost = available.reduce((s, op) => s + op.hourly_rate_usd * shift.hours * shift.days.length * (1 + shift.premium_pct / 100), 0);

    // Skill coverage on this shift
    const skillCoverage: Record<string, number> = {};
    for (const op of available) {
      for (const [skillId, level] of Object.entries(op.skills)) {
        if (level >= 3) skillCoverage[skillId] = (skillCoverage[skillId] || 0) + 1;
      }
    }

    const gapSkills = Object.entries(SKILL_NAMES).filter(([sid]) => !skillCoverage[sid] || skillCoverage[sid] === 0);

    return {
      shift_id: shift.shift_id,
      name: shift.name,
      hours: `${shift.start_time}-${shift.end_time}`,
      days: shift.days,
      premium_pct: shift.premium_pct,
      staffing: {
        total_assigned: operators.length,
        available: available.length,
        on_leave: onLeave.length,
        in_training: inTraining.length,
      },
      operators: available.map(op => ({
        operator_id: op.operator_id,
        name: op.name,
        department: op.department,
        top_skills: Object.entries(op.skills).filter(([, v]) => v >= 4).map(([k]) => SKILL_NAMES[k] || k),
      })),
      capacity: {
        total_operator_hours: totalCapacityHours,
        estimated_weekly_labor_cost_usd: Math.round(laborCost),
      },
      skill_coverage: Object.entries(skillCoverage).map(([sid, count]) => ({
        skill: SKILL_NAMES[sid] || sid,
        qualified_operators: count,
      })).sort((a, b) => a.qualified_operators - b.qualified_operators),
      skill_gaps: gapSkills.map(([sid, name]) => ({ skill: name, coverage: 0 })),
    };
  });

  return {
    action: "wf_schedule",
    week_of: weekOf,
    filters: { shift: shiftId || "all", department: dept || "all" },
    total_shifts: schedule.length,
    schedule,
    summary: {
      total_operators: WORKFORCE.filter(op => !dept || op.department.toLowerCase().includes(dept)).length,
      total_available: WORKFORCE.filter(op => op.availability === "AVAILABLE" && (!dept || op.department.toLowerCase().includes(dept))).length,
      total_weekly_capacity_hours: schedule.reduce((s, sh) => s + sh.capacity.total_operator_hours, 0),
      total_weekly_labor_cost_usd: schedule.reduce((s, sh) => s + sh.capacity.estimated_weekly_labor_cost_usd, 0),
    },
  };
}

// ── Action: wf_assign ──────────────────────────────────────────────────────

function wfAssign(params: Record<string, unknown>): unknown {
  const machineId = String(params.machine_id || "").toUpperCase();
  const shiftFilter = String(params.shift || "").toUpperCase();

  // Assign operators to all machines or a specific machine
  let machines = [...MACHINE_WORK];
  if (machineId) machines = machines.filter(m => m.machine_id === machineId);

  const assignments = machines.map(machine => {
    let candidates = WORKFORCE.filter(op => op.availability === "AVAILABLE");
    if (shiftFilter) candidates = candidates.filter(op => op.assigned_shift.includes(shiftFilter));

    const scored = candidates
      .map(op => ({ ...op, fit_score: operatorFitScore(op, machine), qualified: operatorQualifiesForMachine(op, machine) }))
      .filter(op => op.qualified)
      .sort((a, b) => b.fit_score - a.fit_score);

    const bestMatch = scored[0] || null;
    const backups = scored.slice(1, 4);

    return {
      machine_id: machine.machine_id,
      machine_type: machine.machine_type,
      department: machine.department,
      priority: machine.priority,
      scheduled_hours: machine.scheduled_hours_per_week,
      required_skills: machine.required_skills.map(rs => ({
        skill: SKILL_NAMES[rs.skill_id] || rs.skill_id,
        min_level: rs.min_level,
      })),
      recommended_operator: bestMatch ? {
        operator_id: bestMatch.operator_id,
        name: bestMatch.name,
        shift: bestMatch.assigned_shift,
        fit_score: bestMatch.fit_score,
        relevant_skills: machine.required_skills.map(rs => ({
          skill: SKILL_NAMES[rs.skill_id] || rs.skill_id,
          level: bestMatch.skills[rs.skill_id] || 0,
          required: rs.min_level,
        })),
      } : null,
      backup_operators: backups.map(op => ({
        operator_id: op.operator_id,
        name: op.name,
        shift: op.assigned_shift,
        fit_score: op.fit_score,
      })),
      coverage_risk: scored.length === 0 ? "CRITICAL" : scored.length === 1 ? "HIGH" : scored.length <= 3 ? "MEDIUM" : "LOW",
      total_qualified: scored.length,
    };
  });

  const unassignable = assignments.filter(a => !a.recommended_operator);
  const highRisk = assignments.filter(a => a.coverage_risk === "CRITICAL" || a.coverage_risk === "HIGH");

  return {
    action: "wf_assign",
    filters: { machine_id: machineId || "all", shift: shiftFilter || "all" },
    summary: {
      machines_evaluated: assignments.length,
      fully_assigned: assignments.filter(a => a.recommended_operator).length,
      unassignable: unassignable.length,
      high_risk_coverage: highRisk.length,
      avg_fit_score: Math.round(assignments.filter(a => a.recommended_operator).reduce((s, a) => s + (a.recommended_operator?.fit_score || 0), 0) / Math.max(1, assignments.filter(a => a.recommended_operator).length)),
    },
    assignments,
    alerts: [
      ...unassignable.map(a => ({
        severity: "CRITICAL" as const,
        message: `No qualified operator available for ${a.machine_type}`,
      })),
      ...highRisk.filter(a => a.recommended_operator).map(a => ({
        severity: "HIGH" as const,
        message: `${a.machine_type} has only ${a.total_qualified} qualified operator(s)`,
      })),
    ],
  };
}

// ── Action: wf_capacity ────────────────────────────────────────────────────

function wfCapacity(params: Record<string, unknown>): unknown {
  const dept = String(params.department || "").toLowerCase();
  const weeks = Math.min(Number(params.weeks || 4), 12);
  const targetUtilization = Number(params.target_utilization_pct || 85);

  let operators = WORKFORCE.filter(op => op.availability === "AVAILABLE");
  if (dept) operators = operators.filter(op => op.department.toLowerCase().includes(dept));

  let machines = [...MACHINE_WORK];
  if (dept) machines = machines.filter(m => m.department.toLowerCase().includes(dept));

  // Calculate weekly capacity
  const operatorCapacityHours = operators.reduce((s, op) => {
    const shift = SHIFTS.find(sh => sh.shift_id === op.assigned_shift);
    return s + (shift ? shift.hours * shift.days.length : 40);
  }, 0);

  const machineRequirementHours = machines.reduce((s, m) => s + m.scheduled_hours_per_week, 0);
  const utilizationPct = operatorCapacityHours > 0 ? Math.round(machineRequirementHours / operatorCapacityHours * 100) : 0;

  // Forecast: week-by-week capacity (simulate increasing demand)
  const forecast = Array.from({ length: weeks }, (_, i) => {
    const weekNum = i + 1;
    const demandGrowth = 1 + (weekNum - 1) * 0.02; // 2% weekly demand growth
    const adjustedDemand = Math.round(machineRequirementHours * demandGrowth);
    const gap = adjustedDemand - operatorCapacityHours;
    const overtimeNeeded = Math.max(0, gap);
    const overtimeAvail = operators.filter(op => op.overtime_eligible)
      .reduce((s, op) => s + (op.weekly_hours_cap - 40), 0);

    return {
      week: weekNum,
      demand_hours: adjustedDemand,
      capacity_hours: operatorCapacityHours,
      gap_hours: gap,
      overtime_needed: overtimeNeeded,
      overtime_available: overtimeAvail,
      can_meet_demand: gap <= overtimeAvail,
      utilization_pct: Math.round(adjustedDemand / operatorCapacityHours * 100),
    };
  });

  // Skill-based capacity constraints
  const skillCapacity = Object.entries(SKILL_NAMES).map(([sid, name]) => {
    const qualifiedOps = operators.filter(op => (op.skills[sid] || 0) >= 3);
    const machinesNeeding = machines.filter(m => m.required_skills.some(rs => rs.skill_id === sid));
    const demandHours = machinesNeeding.reduce((s, m) => s + m.scheduled_hours_per_week, 0);
    const supplyHours = qualifiedOps.length * 40;
    return {
      skill: name,
      qualified_operators: qualifiedOps.length,
      machines_requiring: machinesNeeding.length,
      weekly_demand_hours: demandHours,
      weekly_supply_hours: supplyHours,
      utilization_pct: supplyHours > 0 ? Math.round(demandHours / supplyHours * 100) : 0,
      bottleneck: supplyHours > 0 && demandHours / supplyHours > targetUtilization / 100,
    };
  }).filter(sc => sc.machines_requiring > 0);

  const bottlenecks = skillCapacity.filter(sc => sc.bottleneck);
  const weeksUntilOverCapacity = forecast.findIndex(f => !f.can_meet_demand);

  return {
    action: "wf_capacity",
    filters: { department: dept || "all", forecast_weeks: weeks, target_utilization_pct: targetUtilization },
    current_state: {
      operators_available: operators.length,
      weekly_capacity_hours: operatorCapacityHours,
      weekly_demand_hours: machineRequirementHours,
      utilization_pct: utilizationPct,
      status: utilizationPct > 95 ? "OVER_CAPACITY" : utilizationPct > targetUtilization ? "NEAR_CAPACITY" : "ADEQUATE",
    },
    forecast,
    skill_bottlenecks: bottlenecks,
    skill_capacity: skillCapacity,
    summary: {
      weeks_until_over_capacity: weeksUntilOverCapacity >= 0 ? weeksUntilOverCapacity + 1 : null,
      current_utilization_pct: utilizationPct,
      skill_bottleneck_count: bottlenecks.length,
      overtime_buffer_hours: operators.filter(op => op.overtime_eligible).reduce((s, op) => s + (op.weekly_hours_cap - 40), 0),
    },
    recommendations: [
      ...(utilizationPct > 90 ? [{ priority: "HIGH", action: "Consider hiring additional operators or adding shifts" }] : []),
      ...bottlenecks.map(b => ({ priority: "MEDIUM" as const, action: `Cross-train operators in ${b.skill} — current bottleneck at ${b.utilization_pct}% utilization` })),
      ...(weeksUntilOverCapacity !== null && weeksUntilOverCapacity >= 0 && weeksUntilOverCapacity < 4
        ? [{ priority: "HIGH", action: `Demand will exceed capacity in ${weeksUntilOverCapacity + 1} week(s) — plan overtime or temporary staffing` }]
        : []),
    ],
  };
}

// ── Action: wf_balance ─────────────────────────────────────────────────────

function wfBalance(params: Record<string, unknown>): unknown {
  const dept = String(params.department || "").toLowerCase();
  const optimizeFor = String(params.optimize_for || "balanced").toLowerCase(); // balanced, quality, cost

  let operators = [...WORKFORCE];
  if (dept) operators = operators.filter(op => op.department.toLowerCase().includes(dept));

  // Analyze current shift balance
  const shiftAnalysis = SHIFTS.filter(s => s.shift_id !== "SHIFT-W").map(shift => {
    const shiftOps = operators.filter(op => op.assigned_shift === shift.shift_id && op.availability === "AVAILABLE");
    const avgQuality = shiftOps.length > 0 ? Math.round(shiftOps.reduce((s, op) => s + op.quality_score, 0) / shiftOps.length) : 0;
    const avgProductivity = shiftOps.length > 0 ? Math.round(shiftOps.reduce((s, op) => s + op.productivity_score, 0) / shiftOps.length) : 0;
    const avgRate = shiftOps.length > 0 ? Math.round(shiftOps.reduce((s, op) => s + op.hourly_rate_usd, 0) / shiftOps.length) : 0;
    const totalSkillPoints = shiftOps.reduce((s, op) => s + Object.values(op.skills).reduce((a, b) => a + b, 0), 0);

    return {
      shift_id: shift.shift_id,
      name: shift.name,
      operator_count: shiftOps.length,
      avg_quality_score: avgQuality,
      avg_productivity_score: avgProductivity,
      avg_hourly_rate: avgRate,
      total_skill_points: totalSkillPoints,
      weekly_labor_cost: Math.round(shiftOps.reduce((s, op) => s + op.hourly_rate_usd * shift.hours * shift.days.length * (1 + shift.premium_pct / 100), 0)),
      operators: shiftOps.map(op => ({
        operator_id: op.operator_id,
        name: op.name,
        quality: op.quality_score,
        productivity: op.productivity_score,
        rate: op.hourly_rate_usd,
        skill_points: Object.values(op.skills).reduce((a, b) => a + b, 0),
      })),
    };
  });

  // Calculate imbalance metrics
  const headcounts = shiftAnalysis.map(s => s.operator_count);
  const qualityScores = shiftAnalysis.map(s => s.avg_quality_score);
  const skillPoints = shiftAnalysis.map(s => s.total_skill_points);

  const headcountVariance = headcounts.length > 0 ? Math.round(Math.max(...headcounts) - Math.min(...headcounts)) : 0;
  const qualityVariance = qualityScores.length > 0 ? Math.round(Math.max(...qualityScores) - Math.min(...qualityScores)) : 0;
  const skillVariance = skillPoints.length > 0 ? Math.round(Math.max(...skillPoints) - Math.min(...skillPoints)) : 0;

  // Generate rebalancing suggestions
  const suggestions: { from_shift: string; to_shift: string; operator: string; operator_id: string; reason: string; impact: string }[] = [];

  // Find the strongest and weakest shifts
  const sortedBySkill = [...shiftAnalysis].sort((a, b) => b.total_skill_points - a.total_skill_points);
  if (sortedBySkill.length >= 2) {
    const strongest = sortedBySkill[0];
    const weakest = sortedBySkill[sortedBySkill.length - 1];
    if (strongest.total_skill_points > weakest.total_skill_points * 1.5 && strongest.operator_count > 1) {
      // Find a transferable operator
      const transferCandidate = strongest.operators
        .sort((a, b) => a.skill_points - b.skill_points)[0]; // move weakest from strong shift
      if (transferCandidate) {
        suggestions.push({
          from_shift: strongest.name,
          to_shift: weakest.name,
          operator: transferCandidate.name,
          operator_id: transferCandidate.operator_id,
          reason: `Skill imbalance: ${strongest.name} has ${strongest.total_skill_points} skill points vs ${weakest.name}'s ${weakest.total_skill_points}`,
          impact: `Would reduce skill point variance by ~${Math.round(skillVariance * 0.3)}`,
        });
      }
    }
  }

  const balanceScore = Math.max(0, 100 - headcountVariance * 10 - qualityVariance - Math.round(skillVariance / 5));

  return {
    action: "wf_balance",
    filters: { department: dept || "all", optimize_for: optimizeFor },
    balance_score: balanceScore,
    rating: balanceScore >= 80 ? "WELL_BALANCED" : balanceScore >= 60 ? "MODERATE_IMBALANCE" : "SIGNIFICANT_IMBALANCE",
    shift_analysis: shiftAnalysis,
    imbalance_metrics: {
      headcount_variance: headcountVariance,
      quality_score_variance: qualityVariance,
      skill_point_variance: skillVariance,
      cost_variance_usd: shiftAnalysis.length > 0 ? Math.round(Math.max(...shiftAnalysis.map(s => s.weekly_labor_cost)) - Math.min(...shiftAnalysis.map(s => s.weekly_labor_cost))) : 0,
    },
    rebalancing_suggestions: suggestions,
    summary: {
      total_operators: operators.filter(op => op.availability === "AVAILABLE").length,
      shifts_analyzed: shiftAnalysis.length,
      balance_score: balanceScore,
      suggestions_count: suggestions.length,
      total_weekly_labor_cost: shiftAnalysis.reduce((s, sh) => s + sh.weekly_labor_cost, 0),
    },
  };
}

// ── Public Entry Point ─────────────────────────────────────────────────────

export function executeWorkforceOptimizationAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "wf_schedule":
      return wfSchedule(params);
    case "wf_assign":
      return wfAssign(params);
    case "wf_capacity":
      return wfCapacity(params);
    case "wf_balance":
      return wfBalance(params);
    default:
      throw new Error(`Unknown WorkforceOptimizationEngine action: ${action}`);
  }
}
