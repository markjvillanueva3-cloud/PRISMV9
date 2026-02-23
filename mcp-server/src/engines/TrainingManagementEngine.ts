/**
 * TrainingManagementEngine — R24-MS2
 *
 * Training program management, progress tracking, skill gap analysis,
 * and training recommendation engine.
 *
 * Actions:
 *   trn_program   — Training program catalog and enrollment
 *   trn_progress  — Training progress and completion tracking
 *   trn_gap       — Skill gap analysis with training path generation
 *   trn_recommend — AI-driven training recommendations
 */

// ── Training Program Catalog ───────────────────────────────────────────────

interface TrainingProgram {
  program_id: string;
  name: string;
  category: string;
  description: string;
  duration_hours: number;
  modules: TrainingModule[];
  prerequisites: string[];
  target_skills: { skill_id: string; level_gain: number }[];
  delivery: "classroom" | "online" | "hands-on" | "blended";
  cost_usd: number;
  max_participants: number;
  certification_id?: string;
}

interface TrainingModule {
  module_id: string;
  name: string;
  duration_hours: number;
  type: "theory" | "practical" | "assessment";
}

interface EnrollmentRecord {
  enrollment_id: string;
  operator_id: string;
  operator_name: string;
  program_id: string;
  enrolled_date: string;
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";
  progress_pct: number;
  modules_completed: string[];
  score?: number;
  completed_date?: string;
}

const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    program_id: "TRN-CNC-BASIC", name: "CNC Fundamentals", category: "Machining",
    description: "Introduction to CNC turning and milling operations",
    duration_hours: 40, delivery: "blended", cost_usd: 2500, max_participants: 8,
    prerequisites: [],
    target_skills: [{ skill_id: "SK-TURN", level_gain: 2 }, { skill_id: "SK-MILL", level_gain: 2 }],
    certification_id: "CERT-CNC1",
    modules: [
      { module_id: "M1", name: "Machine Safety & Basics", duration_hours: 8, type: "theory" },
      { module_id: "M2", name: "CNC Turning Fundamentals", duration_hours: 12, type: "practical" },
      { module_id: "M3", name: "CNC Milling Fundamentals", duration_hours: 12, type: "practical" },
      { module_id: "M4", name: "Setup & Tooling Basics", duration_hours: 4, type: "practical" },
      { module_id: "M5", name: "Skills Assessment", duration_hours: 4, type: "assessment" },
    ],
  },
  {
    program_id: "TRN-CNC-ADV", name: "Advanced CNC Operations", category: "Machining",
    description: "Advanced machining techniques, multi-axis programming, optimization",
    duration_hours: 60, delivery: "blended", cost_usd: 4200, max_participants: 6,
    prerequisites: ["TRN-CNC-BASIC"],
    target_skills: [{ skill_id: "SK-TURN", level_gain: 1 }, { skill_id: "SK-MILL", level_gain: 1 }, { skill_id: "SK-PROG", level_gain: 2 }, { skill_id: "SK-TOOL", level_gain: 1 }],
    certification_id: "CERT-CNC2",
    modules: [
      { module_id: "M1", name: "Advanced Turning Techniques", duration_hours: 12, type: "practical" },
      { module_id: "M2", name: "Advanced Milling & Contouring", duration_hours: 12, type: "practical" },
      { module_id: "M3", name: "CNC Programming with CAM", duration_hours: 16, type: "practical" },
      { module_id: "M4", name: "Tool Selection & Optimization", duration_hours: 12, type: "practical" },
      { module_id: "M5", name: "Practical Examination", duration_hours: 8, type: "assessment" },
    ],
  },
  {
    program_id: "TRN-5AX", name: "5-Axis Machining Mastery", category: "Machining",
    description: "Complex multi-axis machining, simultaneous 5-axis strategies",
    duration_hours: 80, delivery: "hands-on", cost_usd: 6500, max_participants: 4,
    prerequisites: ["TRN-CNC-ADV"],
    target_skills: [{ skill_id: "SK-MILL", level_gain: 1 }, { skill_id: "SK-PROG", level_gain: 1 }, { skill_id: "SK-SETUP", level_gain: 1 }, { skill_id: "SK-FIX", level_gain: 1 }],
    certification_id: "CERT-5AX",
    modules: [
      { module_id: "M1", name: "5-Axis Kinematics & Setup", duration_hours: 16, type: "theory" },
      { module_id: "M2", name: "3+2 Positional Machining", duration_hours: 16, type: "practical" },
      { module_id: "M3", name: "Simultaneous 5-Axis Strategies", duration_hours: 20, type: "practical" },
      { module_id: "M4", name: "Fixture Design for 5-Axis", duration_hours: 16, type: "practical" },
      { module_id: "M5", name: "Capstone Project", duration_hours: 12, type: "assessment" },
    ],
  },
  {
    program_id: "TRN-QC", name: "Quality Control Fundamentals", category: "Quality",
    description: "Inspection methods, GD&T interpretation, SPC basics",
    duration_hours: 32, delivery: "blended", cost_usd: 2000, max_participants: 10,
    prerequisites: [],
    target_skills: [{ skill_id: "SK-GDT", level_gain: 2 }, { skill_id: "SK-INSP", level_gain: 2 }, { skill_id: "SK-SPC", level_gain: 1 }],
    modules: [
      { module_id: "M1", name: "Measurement Tools & Techniques", duration_hours: 8, type: "practical" },
      { module_id: "M2", name: "GD&T Interpretation", duration_hours: 10, type: "theory" },
      { module_id: "M3", name: "SPC Introduction", duration_hours: 8, type: "theory" },
      { module_id: "M4", name: "Hands-on Inspection Lab", duration_hours: 6, type: "assessment" },
    ],
  },
  {
    program_id: "TRN-CMM", name: "CMM Programming & Operation", category: "Quality",
    description: "CMM programming, part alignment, measurement strategies",
    duration_hours: 40, delivery: "hands-on", cost_usd: 3500, max_participants: 4,
    prerequisites: ["TRN-QC"],
    target_skills: [{ skill_id: "SK-CMM", level_gain: 2 }, { skill_id: "SK-GDT", level_gain: 1 }],
    certification_id: "CERT-CMM",
    modules: [
      { module_id: "M1", name: "CMM Fundamentals", duration_hours: 8, type: "theory" },
      { module_id: "M2", name: "Part Alignment Strategies", duration_hours: 8, type: "practical" },
      { module_id: "M3", name: "Measurement Programming", duration_hours: 12, type: "practical" },
      { module_id: "M4", name: "Advanced GD&T Measurement", duration_hours: 8, type: "practical" },
      { module_id: "M5", name: "Certification Exam", duration_hours: 4, type: "assessment" },
    ],
  },
  {
    program_id: "TRN-SAFETY", name: "Manufacturing Safety", category: "Safety",
    description: "OSHA compliance, lockout/tagout, PPE, emergency procedures",
    duration_hours: 16, delivery: "classroom", cost_usd: 800, max_participants: 20,
    prerequisites: [],
    target_skills: [{ skill_id: "SK-SAFE", level_gain: 2 }, { skill_id: "SK-ERGO", level_gain: 1 }],
    modules: [
      { module_id: "M1", name: "OSHA Standards Overview", duration_hours: 4, type: "theory" },
      { module_id: "M2", name: "Lockout/Tagout Procedures", duration_hours: 4, type: "practical" },
      { module_id: "M3", name: "PPE & Ergonomics", duration_hours: 4, type: "theory" },
      { module_id: "M4", name: "Emergency Response Drill", duration_hours: 4, type: "practical" },
    ],
  },
  {
    program_id: "TRN-MAINT", name: "Preventive Maintenance", category: "Maintenance",
    description: "Machine maintenance, lubrication, diagnostic techniques",
    duration_hours: 24, delivery: "hands-on", cost_usd: 1800, max_participants: 6,
    prerequisites: [],
    target_skills: [{ skill_id: "SK-PMNT", level_gain: 2 }, { skill_id: "SK-DIAG", level_gain: 2 }],
    certification_id: "CERT-MNT",
    modules: [
      { module_id: "M1", name: "Maintenance Planning", duration_hours: 4, type: "theory" },
      { module_id: "M2", name: "Lubrication & Inspection", duration_hours: 8, type: "practical" },
      { module_id: "M3", name: "Fault Diagnosis", duration_hours: 8, type: "practical" },
      { module_id: "M4", name: "Practical Assessment", duration_hours: 4, type: "assessment" },
    ],
  },
  {
    program_id: "TRN-GDT-ADV", name: "Advanced GD&T", category: "Quality",
    description: "ASME Y14.5-2018 advanced concepts, composite tolerances, datum systems",
    duration_hours: 24, delivery: "classroom", cost_usd: 2200, max_participants: 12,
    prerequisites: ["TRN-QC"],
    target_skills: [{ skill_id: "SK-GDT", level_gain: 2 }],
    certification_id: "CERT-GDT",
    modules: [
      { module_id: "M1", name: "Advanced Datum Systems", duration_hours: 6, type: "theory" },
      { module_id: "M2", name: "Composite & Profile Tolerances", duration_hours: 6, type: "theory" },
      { module_id: "M3", name: "Tolerance Stack Analysis", duration_hours: 6, type: "practical" },
      { module_id: "M4", name: "Certification Exam", duration_hours: 6, type: "assessment" },
    ],
  },
  {
    program_id: "TRN-SETUP", name: "Machine Setup Mastery", category: "Machining",
    description: "Advanced fixturing, alignment, and work holding techniques",
    duration_hours: 32, delivery: "hands-on", cost_usd: 2800, max_participants: 6,
    prerequisites: ["TRN-CNC-BASIC"],
    target_skills: [{ skill_id: "SK-SETUP", level_gain: 2 }, { skill_id: "SK-FIX", level_gain: 2 }],
    modules: [
      { module_id: "M1", name: "Work Holding Principles", duration_hours: 8, type: "theory" },
      { module_id: "M2", name: "Fixture Design & Fabrication", duration_hours: 10, type: "practical" },
      { module_id: "M3", name: "Alignment & Probing", duration_hours: 8, type: "practical" },
      { module_id: "M4", name: "Setup Optimization", duration_hours: 6, type: "practical" },
    ],
  },
  {
    program_id: "TRN-EDM", name: "EDM Specialist Training", category: "Machining",
    description: "Wire and sinker EDM operation, programming, and process optimization",
    duration_hours: 48, delivery: "hands-on", cost_usd: 4000, max_participants: 4,
    prerequisites: ["TRN-CNC-BASIC"],
    target_skills: [{ skill_id: "SK-EDM", level_gain: 3 }],
    certification_id: "CERT-EDM",
    modules: [
      { module_id: "M1", name: "EDM Principles & Safety", duration_hours: 8, type: "theory" },
      { module_id: "M2", name: "Wire EDM Operation", duration_hours: 16, type: "practical" },
      { module_id: "M3", name: "Sinker EDM Operation", duration_hours: 12, type: "practical" },
      { module_id: "M4", name: "Process Optimization", duration_hours: 8, type: "practical" },
      { module_id: "M5", name: "Certification Exam", duration_hours: 4, type: "assessment" },
    ],
  },
];

// ── Enrollment Database ────────────────────────────────────────────────────

const ENROLLMENT_DB: EnrollmentRecord[] = [
  { enrollment_id: "ENR-001", operator_id: "OP-004", operator_name: "Maria Rodriguez", program_id: "TRN-CNC-ADV", enrolled_date: "2025-01-15", status: "IN_PROGRESS", progress_pct: 60, modules_completed: ["M1", "M2", "M3"] },
  { enrollment_id: "ENR-002", operator_id: "OP-006", operator_name: "Lisa Patel", program_id: "TRN-CNC-BASIC", enrolled_date: "2025-02-01", status: "IN_PROGRESS", progress_pct: 40, modules_completed: ["M1", "M2"] },
  { enrollment_id: "ENR-003", operator_id: "OP-008", operator_name: "Emily Johnson", program_id: "TRN-CNC-BASIC", enrolled_date: "2025-03-01", status: "IN_PROGRESS", progress_pct: 25, modules_completed: ["M1"] },
  { enrollment_id: "ENR-004", operator_id: "OP-005", operator_name: "David Kim", program_id: "TRN-SETUP", enrolled_date: "2024-11-01", status: "COMPLETED", progress_pct: 100, modules_completed: ["M1", "M2", "M3", "M4"], score: 88, completed_date: "2025-01-15" },
  { enrollment_id: "ENR-005", operator_id: "OP-001", operator_name: "James Martinez", program_id: "TRN-5AX", enrolled_date: "2025-04-01", status: "ENROLLED", progress_pct: 0, modules_completed: [] },
  { enrollment_id: "ENR-006", operator_id: "OP-002", operator_name: "Sarah Chen", program_id: "TRN-GDT-ADV", enrolled_date: "2025-03-15", status: "IN_PROGRESS", progress_pct: 50, modules_completed: ["M1", "M2"] },
  { enrollment_id: "ENR-007", operator_id: "OP-009", operator_name: "Michael Brown", program_id: "TRN-CNC-ADV", enrolled_date: "2024-09-01", status: "COMPLETED", progress_pct: 100, modules_completed: ["M1", "M2", "M3", "M4", "M5"], score: 82, completed_date: "2024-12-15" },
  { enrollment_id: "ENR-008", operator_id: "OP-004", operator_name: "Maria Rodriguez", program_id: "TRN-QC", enrolled_date: "2024-06-01", status: "COMPLETED", progress_pct: 100, modules_completed: ["M1", "M2", "M3", "M4"], score: 91, completed_date: "2024-08-15" },
  { enrollment_id: "ENR-009", operator_id: "OP-010", operator_name: "Anna Kowalski", program_id: "TRN-GDT-ADV", enrolled_date: "2025-02-10", status: "IN_PROGRESS", progress_pct: 75, modules_completed: ["M1", "M2", "M3"] },
  { enrollment_id: "ENR-010", operator_id: "OP-007", operator_name: "Thomas Wilson", program_id: "TRN-SAFETY", enrolled_date: "2025-05-01", status: "ENROLLED", progress_pct: 0, modules_completed: [] },
];

// ── Skill Level Database (mirrors OperatorSkillEngine for gap analysis) ────

const OPERATOR_SKILLS: Record<string, Record<string, number>> = {
  "OP-001": { "SK-TURN": 5, "SK-MILL": 4, "SK-GRIND": 3, "SK-SETUP": 5, "SK-TOOL": 4, "SK-PROG": 3, "SK-CMM": 2, "SK-GDT": 3, "SK-SPC": 2, "SK-INSP": 3, "SK-PMNT": 4, "SK-DIAG": 3, "SK-SAFE": 4, "SK-ERGO": 3 },
  "OP-002": { "SK-TURN": 3, "SK-MILL": 5, "SK-GRIND": 2, "SK-EDM": 4, "SK-SETUP": 4, "SK-TOOL": 5, "SK-PROG": 5, "SK-FIX": 4, "SK-CMM": 3, "SK-GDT": 4, "SK-SPC": 3, "SK-INSP": 3, "SK-SAFE": 3, "SK-ERGO": 2 },
  "OP-003": { "SK-TURN": 2, "SK-MILL": 2, "SK-CMM": 5, "SK-GDT": 5, "SK-SPC": 5, "SK-INSP": 5, "SK-SAFE": 3, "SK-ERGO": 3 },
  "OP-004": { "SK-TURN": 3, "SK-MILL": 3, "SK-SETUP": 3, "SK-TOOL": 3, "SK-PROG": 2, "SK-CMM": 2, "SK-GDT": 2, "SK-INSP": 3, "SK-SAFE": 3, "SK-ERGO": 2 },
  "OP-005": { "SK-TURN": 4, "SK-MILL": 4, "SK-GRIND": 4, "SK-SETUP": 3, "SK-TOOL": 3, "SK-PROG": 2, "SK-INSP": 2, "SK-SAFE": 3, "SK-PMNT": 3, "SK-DIAG": 2, "SK-ERGO": 2 },
  "OP-006": { "SK-MILL": 3, "SK-TURN": 2, "SK-SETUP": 2, "SK-TOOL": 2, "SK-PROG": 3, "SK-GDT": 2, "SK-INSP": 2, "SK-SAFE": 3, "SK-ERGO": 2 },
  "OP-007": { "SK-TURN": 2, "SK-MILL": 2, "SK-PMNT": 5, "SK-DIAG": 5, "SK-SETUP": 3, "SK-SAFE": 5, "SK-ERGO": 4, "SK-EDM": 2 },
  "OP-008": { "SK-TURN": 2, "SK-MILL": 2, "SK-SETUP": 1, "SK-TOOL": 1, "SK-INSP": 2, "SK-SAFE": 3, "SK-ERGO": 2 },
  "OP-009": { "SK-TURN": 4, "SK-MILL": 3, "SK-GRIND": 5, "SK-SETUP": 4, "SK-TOOL": 3, "SK-CMM": 3, "SK-GDT": 3, "SK-SPC": 2, "SK-INSP": 4, "SK-PMNT": 3, "SK-SAFE": 3, "SK-ERGO": 3 },
  "OP-010": { "SK-CMM": 4, "SK-GDT": 4, "SK-SPC": 4, "SK-INSP": 4, "SK-SAFE": 3, "SK-ERGO": 3, "SK-TURN": 1, "SK-MILL": 1 },
};

const SKILL_NAMES: Record<string, string> = {
  "SK-TURN": "CNC Turning", "SK-MILL": "CNC Milling", "SK-GRIND": "Precision Grinding",
  "SK-EDM": "EDM Operations", "SK-SETUP": "Machine Setup", "SK-TOOL": "Tool Selection",
  "SK-PROG": "CNC Programming", "SK-FIX": "Fixture Design", "SK-CMM": "CMM Operation",
  "SK-GDT": "GD&T Interpretation", "SK-SPC": "SPC Methods", "SK-INSP": "Manual Inspection",
  "SK-PMNT": "Preventive Maintenance", "SK-DIAG": "Machine Diagnostics",
  "SK-SAFE": "Safety Protocols", "SK-ERGO": "Ergonomics",
};

// ── Action: trn_program ────────────────────────────────────────────────────

function trnProgram(params: Record<string, unknown>): unknown {
  const programId = String(params.program_id || "").toUpperCase();
  const category = String(params.category || "").toLowerCase();
  const skillId = String(params.skill_id || "").toUpperCase();

  // Single program detail
  if (programId) {
    const prog = TRAINING_PROGRAMS.find(p => p.program_id === programId);
    if (!prog) return { action: "trn_program", error: `Program ${programId} not found.` };

    const enrollments = ENROLLMENT_DB.filter(e => e.program_id === programId);
    const completed = enrollments.filter(e => e.status === "COMPLETED");
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((s, e) => s + (e.score || 0), 0) / completed.length)
      : null;

    return {
      action: "trn_program",
      program: {
        ...prog,
        modules: prog.modules.map(m => ({ ...m })),
      },
      enrollment_summary: {
        total_enrolled: enrollments.length,
        in_progress: enrollments.filter(e => e.status === "IN_PROGRESS").length,
        completed: completed.length,
        avg_score: avgScore,
        current_enrollees: enrollments.filter(e => e.status !== "COMPLETED" && e.status !== "DROPPED")
          .map(e => ({ operator_id: e.operator_id, name: e.operator_name, progress_pct: e.progress_pct })),
      },
    };
  }

  // Program catalog search
  let programs = [...TRAINING_PROGRAMS];
  if (category) programs = programs.filter(p => p.category.toLowerCase().includes(category));
  if (skillId) programs = programs.filter(p => p.target_skills.some(ts => ts.skill_id === skillId));

  return {
    action: "trn_program",
    filters: { category: category || "all", skill_id: skillId || "all" },
    total_programs: programs.length,
    programs: programs.map(p => ({
      program_id: p.program_id,
      name: p.name,
      category: p.category,
      duration_hours: p.duration_hours,
      delivery: p.delivery,
      cost_usd: p.cost_usd,
      target_skills: p.target_skills.map(ts => ({ skill: SKILL_NAMES[ts.skill_id] || ts.skill_id, gain: `+${ts.level_gain}` })),
      prerequisites: p.prerequisites,
      certification: p.certification_id || "none",
      active_enrollments: ENROLLMENT_DB.filter(e => e.program_id === p.program_id && e.status !== "COMPLETED" && e.status !== "DROPPED").length,
    })),
    catalog_summary: {
      total_hours: programs.reduce((s, p) => s + p.duration_hours, 0),
      total_cost: programs.reduce((s, p) => s + p.cost_usd, 0),
      categories: [...new Set(programs.map(p => p.category))],
    },
  };
}

// ── Action: trn_progress ───────────────────────────────────────────────────

function trnProgress(params: Record<string, unknown>): unknown {
  const operatorId = String(params.operator_id || "").toUpperCase();
  const programId = String(params.program_id || "").toUpperCase();
  const statusFilter = String(params.status || "").toUpperCase();

  let enrollments = [...ENROLLMENT_DB];
  if (operatorId) enrollments = enrollments.filter(e => e.operator_id === operatorId);
  if (programId) enrollments = enrollments.filter(e => e.program_id === programId);
  if (statusFilter) enrollments = enrollments.filter(e => e.status === statusFilter);

  const records = enrollments.map(e => {
    const prog = TRAINING_PROGRAMS.find(p => p.program_id === e.program_id);
    const totalModules = prog?.modules.length || 0;
    const nextModule = prog?.modules.find(m => !e.modules_completed.includes(m.module_id));
    return {
      enrollment_id: e.enrollment_id,
      operator_id: e.operator_id,
      operator_name: e.operator_name,
      program_id: e.program_id,
      program_name: prog?.name || e.program_id,
      enrolled_date: e.enrolled_date,
      status: e.status,
      progress_pct: e.progress_pct,
      modules_completed: e.modules_completed.length,
      modules_total: totalModules,
      next_module: nextModule ? { id: nextModule.module_id, name: nextModule.name, type: nextModule.type, hours: nextModule.duration_hours } : null,
      score: e.score,
      completed_date: e.completed_date,
      skills_upon_completion: prog?.target_skills.map(ts => ({
        skill: SKILL_NAMES[ts.skill_id] || ts.skill_id,
        gain: `+${ts.level_gain}`,
      })),
    };
  });

  const completed = records.filter(r => r.status === "COMPLETED").length;
  const inProgress = records.filter(r => r.status === "IN_PROGRESS").length;
  const avgProgress = records.length > 0
    ? Math.round(records.reduce((s, r) => s + r.progress_pct, 0) / records.length)
    : 0;

  return {
    action: "trn_progress",
    filters: { operator_id: operatorId || "all", program_id: programId || "all", status: statusFilter || "all" },
    summary: {
      total_enrollments: records.length,
      completed,
      in_progress: inProgress,
      enrolled: records.filter(r => r.status === "ENROLLED").length,
      dropped: records.filter(r => r.status === "DROPPED").length,
      avg_progress_pct: avgProgress,
      avg_score: completed > 0
        ? Math.round(records.filter(r => r.score != null).reduce((s, r) => s + (r.score || 0), 0) / completed)
        : null,
    },
    records,
  };
}

// ── Action: trn_gap ────────────────────────────────────────────────────────

function trnGap(params: Record<string, unknown>): unknown {
  const operatorId = String(params.operator_id || "").toUpperCase();
  const targetLevel = Number(params.target_level || 3);
  const dept = String(params.department || "").toLowerCase();

  // Analyze an individual or a department
  const operatorIds = operatorId
    ? [operatorId]
    : Object.keys(OPERATOR_SKILLS).filter(id => {
        if (!dept) return true;
        // Simple department filter based on ID patterns (mirroring OperatorSkillEngine data)
        return true; // Include all if no specific filter available
      });

  const analyses = operatorIds.map(opId => {
    const skills = OPERATOR_SKILLS[opId] || {};
    const gaps: { skill_id: string; skill_name: string; current: number; target: number; gap: number; priority: string }[] = [];

    for (const [skillId, name] of Object.entries(SKILL_NAMES)) {
      const current = skills[skillId] || 0;
      if (current < targetLevel) {
        const gap = targetLevel - current;
        gaps.push({
          skill_id: skillId,
          skill_name: name,
          current,
          target: targetLevel,
          gap,
          priority: gap >= 3 ? "CRITICAL" : gap >= 2 ? "HIGH" : "MEDIUM",
        });
      }
    }

    // Map gaps to recommended training programs
    const recommendations = gaps.map(g => {
      const matchingPrograms = TRAINING_PROGRAMS.filter(p =>
        p.target_skills.some(ts => ts.skill_id === g.skill_id)
      ).map(p => ({
        program_id: p.program_id,
        name: p.name,
        hours: p.duration_hours,
        cost: p.cost_usd,
        level_gain: p.target_skills.find(ts => ts.skill_id === g.skill_id)?.level_gain || 0,
      }));
      return { ...g, recommended_programs: matchingPrograms };
    });

    // Check for in-progress training that addresses gaps
    const activeTraining = ENROLLMENT_DB.filter(e => e.operator_id === opId && (e.status === "IN_PROGRESS" || e.status === "ENROLLED"));
    const addressedByTraining = activeTraining.flatMap(e => {
      const prog = TRAINING_PROGRAMS.find(p => p.program_id === e.program_id);
      return (prog?.target_skills || []).map(ts => ts.skill_id);
    });

    return {
      operator_id: opId,
      total_gaps: gaps.length,
      critical_gaps: gaps.filter(g => g.priority === "CRITICAL").length,
      gaps_addressed_by_active_training: addressedByTraining.length,
      unaddressed_gaps: recommendations.filter(r => !addressedByTraining.includes(r.skill_id)),
      all_gaps: recommendations,
    };
  });

  // Fleet-wide gap summary
  const allGaps = analyses.flatMap(a => a.all_gaps);
  const skillGapFrequency: Record<string, number> = {};
  for (const g of allGaps) {
    skillGapFrequency[g.skill_id] = (skillGapFrequency[g.skill_id] || 0) + 1;
  }

  const topGaps = Object.entries(skillGapFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skillId, count]) => ({
      skill_id: skillId,
      skill_name: SKILL_NAMES[skillId] || skillId,
      operators_with_gap: count,
      pct_workforce: Math.round(count / operatorIds.length * 100),
    }));

  return {
    action: "trn_gap",
    target_level: targetLevel,
    summary: {
      operators_analyzed: analyses.length,
      total_skill_gaps: allGaps.length,
      avg_gaps_per_operator: Math.round(allGaps.length / analyses.length * 10) / 10,
      most_common_gap: topGaps[0]?.skill_name || "none",
    },
    top_gaps: topGaps,
    operator_analyses: operatorId ? analyses : analyses.map(a => ({
      operator_id: a.operator_id,
      total_gaps: a.total_gaps,
      critical_gaps: a.critical_gaps,
      unaddressed_gaps: a.unaddressed_gaps.length,
    })),
  };
}

// ── Action: trn_recommend ──────────────────────────────────────────────────

function trnRecommend(params: Record<string, unknown>): unknown {
  const operatorId = String(params.operator_id || "").toUpperCase();
  const budgetUsd = Number(params.budget_usd || 10000);
  const maxHours = Number(params.max_hours || 160);
  const focusArea = String(params.focus || "").toLowerCase();

  if (!OPERATOR_SKILLS[operatorId]) {
    return { action: "trn_recommend", error: "Operator not found. Provide a valid operator_id." };
  }

  const skills = OPERATOR_SKILLS[operatorId];

  // Find already completed or in-progress programs
  const completedOrActive = new Set(
    ENROLLMENT_DB.filter(e => e.operator_id === operatorId && e.status !== "DROPPED")
      .map(e => e.program_id)
  );

  // Score each available program
  const scoredPrograms = TRAINING_PROGRAMS
    .filter(p => !completedOrActive.has(p.program_id))
    .filter(p => {
      // Check prerequisites
      return p.prerequisites.every(prereq => completedOrActive.has(prereq));
    })
    .map(p => {
      // Calculate benefit: sum of effective level gains
      let benefit = 0;
      let relevance = 0;
      for (const ts of p.target_skills) {
        const current = skills[ts.skill_id] || 0;
        const effectiveGain = Math.min(ts.level_gain, 5 - current);
        benefit += effectiveGain;
        if (focusArea && SKILL_NAMES[ts.skill_id]?.toLowerCase().includes(focusArea)) {
          relevance += effectiveGain * 2;
        }
      }

      const costEfficiency = benefit > 0 ? Math.round(p.cost_usd / benefit) : 99999;
      const timeEfficiency = benefit > 0 ? Math.round(p.duration_hours / benefit * 10) / 10 : 99999;

      return {
        program_id: p.program_id,
        name: p.name,
        category: p.category,
        duration_hours: p.duration_hours,
        cost_usd: p.cost_usd,
        skill_gains: p.target_skills.map(ts => ({
          skill: SKILL_NAMES[ts.skill_id] || ts.skill_id,
          current: skills[ts.skill_id] || 0,
          gain: `+${Math.min(ts.level_gain, 5 - (skills[ts.skill_id] || 0))}`,
        })),
        benefit_score: benefit + relevance,
        cost_per_level: costEfficiency,
        hours_per_level: timeEfficiency,
        certification: p.certification_id || null,
      };
    })
    .sort((a, b) => b.benefit_score - a.benefit_score);

  // Build optimal training path within budget/time constraints
  const trainingPath: typeof scoredPrograms = [];
  let totalCost = 0;
  let totalHours = 0;
  for (const prog of scoredPrograms) {
    if (prog.benefit_score <= 0) continue;
    if (totalCost + prog.cost_usd > budgetUsd) continue;
    if (totalHours + prog.duration_hours > maxHours) continue;
    trainingPath.push(prog);
    totalCost += prog.cost_usd;
    totalHours += prog.duration_hours;
  }

  return {
    action: "trn_recommend",
    operator_id: operatorId,
    constraints: { budget_usd: budgetUsd, max_hours: maxHours, focus: focusArea || "none" },
    recommended_path: {
      programs: trainingPath.length,
      total_cost_usd: totalCost,
      total_hours: totalHours,
      total_benefit: trainingPath.reduce((s, p) => s + p.benefit_score, 0),
      path: trainingPath,
    },
    all_available: scoredPrograms.slice(0, 10),
    summary: {
      programs_recommended: trainingPath.length,
      budget_used_pct: Math.round(totalCost / budgetUsd * 100),
      hours_used_pct: Math.round(totalHours / maxHours * 100),
      certifications_achievable: trainingPath.filter(p => p.certification).length,
    },
  };
}

// ── Public Entry Point ─────────────────────────────────────────────────────

export function executeTrainingManagementAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "trn_program":
      return trnProgram(params);
    case "trn_progress":
      return trnProgress(params);
    case "trn_gap":
      return trnGap(params);
    case "trn_recommend":
      return trnRecommend(params);
    default:
      throw new Error(`Unknown TrainingManagementEngine action: ${action}`);
  }
}
