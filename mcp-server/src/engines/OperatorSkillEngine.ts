/**
 * OperatorSkillEngine — R24-MS1
 *
 * Skill matrix, competency tracking, certification management, and skill gap analysis.
 * Connects operator capability to machine assignment, quality outcomes, and production efficiency.
 *
 * Actions:
 *   op_skills   — Operator skill matrix with proficiency levels
 *   op_certify  — Certification tracking and expiry management
 *   op_assess   — Skill assessment and competency evaluation
 *   op_matrix   — Cross-training matrix and skill coverage analysis
 */

// ── Skill Matrix Database ──────────────────────────────────────────────────

interface SkillCategory {
  id: string;
  name: string;
  skills: SkillDefinition[];
}

interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  max_level: number;
  critical: boolean;
}

interface OperatorProfile {
  operator_id: string;
  name: string;
  hire_date: string;
  department: string;
  shift: string;
  skills: Record<string, number>; // skill_id → proficiency 1-5
  certifications: CertificationRecord[];
  quality_score: number; // 0-100
  productivity_score: number; // 0-100
}

interface CertificationRecord {
  cert_id: string;
  name: string;
  issued: string;
  expires: string;
  status: "VALID" | "EXPIRING" | "EXPIRED";
  issuer: string;
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "CAT-MCH", name: "CNC Machining",
    skills: [
      { id: "SK-TURN", name: "CNC Turning", description: "Lathe operation, OD/ID turning, threading", max_level: 5, critical: true },
      { id: "SK-MILL", name: "CNC Milling", description: "3-axis and 5-axis milling operations", max_level: 5, critical: true },
      { id: "SK-GRIND", name: "Precision Grinding", description: "Surface and cylindrical grinding", max_level: 5, critical: false },
      { id: "SK-EDM", name: "EDM Operations", description: "Wire and sinker EDM", max_level: 5, critical: false },
    ]
  },
  {
    id: "CAT-SETUP", name: "Setup & Tooling",
    skills: [
      { id: "SK-SETUP", name: "Machine Setup", description: "Fixture setup, work holding, alignment", max_level: 5, critical: true },
      { id: "SK-TOOL", name: "Tool Selection", description: "Cutting tool selection and optimization", max_level: 5, critical: true },
      { id: "SK-PROG", name: "CNC Programming", description: "G-code programming and CAM", max_level: 5, critical: false },
      { id: "SK-FIX", name: "Fixture Design", description: "Custom fixture design and fabrication", max_level: 5, critical: false },
    ]
  },
  {
    id: "CAT-QC", name: "Quality Control",
    skills: [
      { id: "SK-CMM", name: "CMM Operation", description: "Coordinate measuring machine programming and operation", max_level: 5, critical: true },
      { id: "SK-GDT", name: "GD&T Interpretation", description: "Geometric dimensioning and tolerancing reading", max_level: 5, critical: true },
      { id: "SK-SPC", name: "SPC Methods", description: "Statistical process control charting and analysis", max_level: 5, critical: false },
      { id: "SK-INSP", name: "Manual Inspection", description: "Micrometers, calipers, gauge blocks, surface plates", max_level: 5, critical: false },
    ]
  },
  {
    id: "CAT-MNT", name: "Maintenance & Safety",
    skills: [
      { id: "SK-PMNT", name: "Preventive Maintenance", description: "Routine machine maintenance and lubrication", max_level: 5, critical: false },
      { id: "SK-DIAG", name: "Machine Diagnostics", description: "Troubleshooting machine faults and alarms", max_level: 5, critical: false },
      { id: "SK-SAFE", name: "Safety Protocols", description: "OSHA compliance, lockout/tagout, PPE", max_level: 5, critical: true },
      { id: "SK-ERGO", name: "Ergonomics", description: "Workstation ergonomics and fatigue prevention", max_level: 5, critical: false },
    ]
  },
];

const ALL_SKILLS = SKILL_CATEGORIES.flatMap(c => c.skills);

// ── Certification Catalog ──────────────────────────────────────────────────

interface CertificationType {
  cert_id: string;
  name: string;
  issuer: string;
  validity_months: number;
  required_skills: string[];
  level_required: number;
}

const CERTIFICATION_CATALOG: CertificationType[] = [
  { cert_id: "CERT-CNC1", name: "CNC Operator Level I", issuer: "NIMS", validity_months: 36, required_skills: ["SK-TURN", "SK-MILL"], level_required: 2 },
  { cert_id: "CERT-CNC2", name: "CNC Operator Level II", issuer: "NIMS", validity_months: 36, required_skills: ["SK-TURN", "SK-MILL", "SK-SETUP"], level_required: 3 },
  { cert_id: "CERT-CNC3", name: "CNC Specialist", issuer: "NIMS", validity_months: 36, required_skills: ["SK-TURN", "SK-MILL", "SK-PROG", "SK-TOOL"], level_required: 4 },
  { cert_id: "CERT-CMM", name: "CMM Programmer", issuer: "ASQ", validity_months: 24, required_skills: ["SK-CMM", "SK-GDT"], level_required: 3 },
  { cert_id: "CERT-QI", name: "Quality Inspector", issuer: "ASQ", validity_months: 36, required_skills: ["SK-GDT", "SK-SPC", "SK-INSP"], level_required: 3 },
  { cert_id: "CERT-GDT", name: "GD&T Professional", issuer: "ASME", validity_months: 48, required_skills: ["SK-GDT"], level_required: 4 },
  { cert_id: "CERT-SAFE", name: "Safety Officer", issuer: "OSHA", validity_months: 24, required_skills: ["SK-SAFE"], level_required: 4 },
  { cert_id: "CERT-5AX", name: "5-Axis Machining Specialist", issuer: "NIMS", validity_months: 36, required_skills: ["SK-MILL", "SK-PROG", "SK-TOOL"], level_required: 4 },
  { cert_id: "CERT-EDM", name: "EDM Specialist", issuer: "NIMS", validity_months: 36, required_skills: ["SK-EDM"], level_required: 4 },
  { cert_id: "CERT-MNT", name: "Maintenance Technician", issuer: "SME", validity_months: 24, required_skills: ["SK-PMNT", "SK-DIAG"], level_required: 3 },
];

// ── Operator Database ──────────────────────────────────────────────────────

const OPERATOR_DB: OperatorProfile[] = [
  {
    operator_id: "OP-001", name: "James Martinez", hire_date: "2018-03-15", department: "CNC Shop", shift: "A",
    skills: { "SK-TURN": 5, "SK-MILL": 4, "SK-GRIND": 3, "SK-SETUP": 5, "SK-TOOL": 4, "SK-PROG": 3, "SK-CMM": 2, "SK-GDT": 3, "SK-SPC": 2, "SK-INSP": 3, "SK-PMNT": 4, "SK-DIAG": 3, "SK-SAFE": 4, "SK-ERGO": 3 },
    certifications: [
      { cert_id: "CERT-CNC3", name: "CNC Specialist", issued: "2023-01-10", expires: "2026-01-10", status: "VALID", issuer: "NIMS" },
      { cert_id: "CERT-SAFE", name: "Safety Officer", issued: "2024-06-01", expires: "2026-06-01", status: "VALID", issuer: "OSHA" },
    ],
    quality_score: 94, productivity_score: 91,
  },
  {
    operator_id: "OP-002", name: "Sarah Chen", hire_date: "2019-07-22", department: "CNC Shop", shift: "A",
    skills: { "SK-TURN": 3, "SK-MILL": 5, "SK-GRIND": 2, "SK-EDM": 4, "SK-SETUP": 4, "SK-TOOL": 5, "SK-PROG": 5, "SK-FIX": 4, "SK-CMM": 3, "SK-GDT": 4, "SK-SPC": 3, "SK-INSP": 3, "SK-SAFE": 3, "SK-ERGO": 2 },
    certifications: [
      { cert_id: "CERT-5AX", name: "5-Axis Machining Specialist", issued: "2023-09-15", expires: "2026-09-15", status: "VALID", issuer: "NIMS" },
      { cert_id: "CERT-CNC2", name: "CNC Operator Level II", issued: "2022-04-20", expires: "2025-04-20", status: "EXPIRING", issuer: "NIMS" },
    ],
    quality_score: 96, productivity_score: 88,
  },
  {
    operator_id: "OP-003", name: "Robert Thompson", hire_date: "2015-11-03", department: "Quality Lab", shift: "A",
    skills: { "SK-TURN": 2, "SK-MILL": 2, "SK-CMM": 5, "SK-GDT": 5, "SK-SPC": 5, "SK-INSP": 5, "SK-SAFE": 3, "SK-ERGO": 3 },
    certifications: [
      { cert_id: "CERT-CMM", name: "CMM Programmer", issued: "2024-02-10", expires: "2026-02-10", status: "VALID", issuer: "ASQ" },
      { cert_id: "CERT-QI", name: "Quality Inspector", issued: "2023-06-15", expires: "2026-06-15", status: "VALID", issuer: "ASQ" },
      { cert_id: "CERT-GDT", name: "GD&T Professional", issued: "2022-01-20", expires: "2026-01-20", status: "VALID", issuer: "ASME" },
    ],
    quality_score: 99, productivity_score: 82,
  },
  {
    operator_id: "OP-004", name: "Maria Rodriguez", hire_date: "2021-02-14", department: "CNC Shop", shift: "B",
    skills: { "SK-TURN": 3, "SK-MILL": 3, "SK-SETUP": 3, "SK-TOOL": 3, "SK-PROG": 2, "SK-CMM": 2, "SK-GDT": 2, "SK-INSP": 3, "SK-SAFE": 3, "SK-ERGO": 2 },
    certifications: [
      { cert_id: "CERT-CNC1", name: "CNC Operator Level I", issued: "2023-08-01", expires: "2026-08-01", status: "VALID", issuer: "NIMS" },
    ],
    quality_score: 87, productivity_score: 85,
  },
  {
    operator_id: "OP-005", name: "David Kim", hire_date: "2020-05-10", department: "CNC Shop", shift: "B",
    skills: { "SK-TURN": 4, "SK-MILL": 4, "SK-GRIND": 4, "SK-SETUP": 3, "SK-TOOL": 3, "SK-PROG": 2, "SK-INSP": 2, "SK-SAFE": 3, "SK-PMNT": 3, "SK-DIAG": 2, "SK-ERGO": 2 },
    certifications: [
      { cert_id: "CERT-CNC2", name: "CNC Operator Level II", issued: "2024-01-15", expires: "2027-01-15", status: "VALID", issuer: "NIMS" },
    ],
    quality_score: 90, productivity_score: 93,
  },
  {
    operator_id: "OP-006", name: "Lisa Patel", hire_date: "2022-09-01", department: "CNC Shop", shift: "B",
    skills: { "SK-MILL": 3, "SK-TURN": 2, "SK-SETUP": 2, "SK-TOOL": 2, "SK-PROG": 3, "SK-GDT": 2, "SK-INSP": 2, "SK-SAFE": 3, "SK-ERGO": 2 },
    certifications: [
      { cert_id: "CERT-CNC1", name: "CNC Operator Level I", issued: "2024-03-01", expires: "2027-03-01", status: "VALID", issuer: "NIMS" },
    ],
    quality_score: 83, productivity_score: 79,
  },
  {
    operator_id: "OP-007", name: "Thomas Wilson", hire_date: "2016-06-20", department: "Maintenance", shift: "A",
    skills: { "SK-TURN": 2, "SK-MILL": 2, "SK-PMNT": 5, "SK-DIAG": 5, "SK-SETUP": 3, "SK-SAFE": 5, "SK-ERGO": 4, "SK-EDM": 2 },
    certifications: [
      { cert_id: "CERT-MNT", name: "Maintenance Technician", issued: "2024-05-10", expires: "2026-05-10", status: "VALID", issuer: "SME" },
      { cert_id: "CERT-SAFE", name: "Safety Officer", issued: "2024-01-15", expires: "2026-01-15", status: "VALID", issuer: "OSHA" },
    ],
    quality_score: 85, productivity_score: 90,
  },
  {
    operator_id: "OP-008", name: "Emily Johnson", hire_date: "2023-01-10", department: "CNC Shop", shift: "C",
    skills: { "SK-TURN": 2, "SK-MILL": 2, "SK-SETUP": 1, "SK-TOOL": 1, "SK-INSP": 2, "SK-SAFE": 3, "SK-ERGO": 2 },
    certifications: [],
    quality_score: 78, productivity_score: 72,
  },
  {
    operator_id: "OP-009", name: "Michael Brown", hire_date: "2017-04-18", department: "CNC Shop", shift: "C",
    skills: { "SK-TURN": 4, "SK-MILL": 3, "SK-GRIND": 5, "SK-SETUP": 4, "SK-TOOL": 3, "SK-CMM": 3, "SK-GDT": 3, "SK-SPC": 2, "SK-INSP": 4, "SK-PMNT": 3, "SK-SAFE": 3, "SK-ERGO": 3 },
    certifications: [
      { cert_id: "CERT-CNC2", name: "CNC Operator Level II", issued: "2021-11-01", expires: "2024-11-01", status: "EXPIRED", issuer: "NIMS" },
    ],
    quality_score: 92, productivity_score: 86,
  },
  {
    operator_id: "OP-010", name: "Anna Kowalski", hire_date: "2020-08-25", department: "Quality Lab", shift: "B",
    skills: { "SK-CMM": 4, "SK-GDT": 4, "SK-SPC": 4, "SK-INSP": 4, "SK-SAFE": 3, "SK-ERGO": 3, "SK-TURN": 1, "SK-MILL": 1 },
    certifications: [
      { cert_id: "CERT-QI", name: "Quality Inspector", issued: "2023-10-01", expires: "2026-10-01", status: "VALID", issuer: "ASQ" },
      { cert_id: "CERT-CMM", name: "CMM Programmer", issued: "2024-07-15", expires: "2026-07-15", status: "VALID", issuer: "ASQ" },
    ],
    quality_score: 97, productivity_score: 84,
  },
];

// ── Proficiency Levels ─────────────────────────────────────────────────────

const PROFICIENCY_LABELS: Record<number, string> = {
  0: "None",
  1: "Novice",
  2: "Basic",
  3: "Competent",
  4: "Proficient",
  5: "Expert",
};

// ── Machine-Skill Requirements ─────────────────────────────────────────────

interface MachineSkillReq {
  machine_type: string;
  required_skills: { skill_id: string; min_level: number }[];
  preferred_certifications: string[];
}

const MACHINE_SKILL_REQS: MachineSkillReq[] = [
  { machine_type: "CNC Lathe", required_skills: [{ skill_id: "SK-TURN", min_level: 3 }, { skill_id: "SK-SETUP", min_level: 2 }, { skill_id: "SK-SAFE", min_level: 2 }], preferred_certifications: ["CERT-CNC1", "CERT-CNC2"] },
  { machine_type: "CNC Mill 3-Axis", required_skills: [{ skill_id: "SK-MILL", min_level: 3 }, { skill_id: "SK-SETUP", min_level: 2 }, { skill_id: "SK-SAFE", min_level: 2 }], preferred_certifications: ["CERT-CNC1", "CERT-CNC2"] },
  { machine_type: "CNC Mill 5-Axis", required_skills: [{ skill_id: "SK-MILL", min_level: 4 }, { skill_id: "SK-PROG", min_level: 3 }, { skill_id: "SK-SETUP", min_level: 3 }, { skill_id: "SK-SAFE", min_level: 2 }], preferred_certifications: ["CERT-5AX"] },
  { machine_type: "Surface Grinder", required_skills: [{ skill_id: "SK-GRIND", min_level: 3 }, { skill_id: "SK-SETUP", min_level: 2 }, { skill_id: "SK-SAFE", min_level: 2 }], preferred_certifications: ["CERT-CNC2"] },
  { machine_type: "Wire EDM", required_skills: [{ skill_id: "SK-EDM", min_level: 3 }, { skill_id: "SK-PROG", min_level: 2 }, { skill_id: "SK-SAFE", min_level: 2 }], preferred_certifications: ["CERT-EDM"] },
  { machine_type: "CMM", required_skills: [{ skill_id: "SK-CMM", min_level: 3 }, { skill_id: "SK-GDT", min_level: 3 }], preferred_certifications: ["CERT-CMM"] },
];

// ── Helper Functions ───────────────────────────────────────────────────────

function getOperator(params: Record<string, unknown>): OperatorProfile | undefined {
  const id = String(params.operator_id || "").toUpperCase();
  if (id) return OPERATOR_DB.find(o => o.operator_id === id);
  const name = String(params.operator_name || params.name || "").toLowerCase();
  if (name) return OPERATOR_DB.find(o => o.name.toLowerCase().includes(name));
  return undefined;
}

function calcYearsExperience(hire_date: string): number {
  const hired = new Date(hire_date);
  const now = new Date("2025-06-15");
  return Math.round(((now.getTime() - hired.getTime()) / (365.25 * 86400000)) * 10) / 10;
}

function certStatus(expires: string): "VALID" | "EXPIRING" | "EXPIRED" {
  const exp = new Date(expires);
  const now = new Date("2025-06-15");
  const daysLeft = (exp.getTime() - now.getTime()) / 86400000;
  if (daysLeft < 0) return "EXPIRED";
  if (daysLeft < 90) return "EXPIRING";
  return "VALID";
}

// ── Action: op_skills ──────────────────────────────────────────────────────

function opSkills(params: Record<string, unknown>): unknown {
  const operator = getOperator(params);
  const dept = String(params.department || "").toLowerCase();
  const shift = String(params.shift || "").toUpperCase();
  const skill_id = String(params.skill_id || "").toUpperCase();
  const min_level = Number(params.min_level || 0);

  // Single operator skill profile
  if (operator) {
    const categories = SKILL_CATEGORIES.map(cat => {
      const catSkills = cat.skills.map(sk => ({
        skill_id: sk.id,
        name: sk.name,
        level: operator.skills[sk.id] || 0,
        label: PROFICIENCY_LABELS[operator.skills[sk.id] || 0],
        critical: sk.critical,
        gap: sk.critical && (operator.skills[sk.id] || 0) < 3 ? 3 - (operator.skills[sk.id] || 0) : 0,
      }));
      const avgLevel = catSkills.reduce((s, sk) => s + sk.level, 0) / catSkills.length;
      return { category: cat.name, avg_level: Math.round(avgLevel * 10) / 10, skills: catSkills };
    });

    const totalSkills = Object.keys(operator.skills).length;
    const avgProficiency = Object.values(operator.skills).reduce((s, v) => s + v, 0) / totalSkills;
    const criticalGaps = categories.flatMap(c => c.skills).filter(s => s.gap > 0);

    return {
      action: "op_skills",
      operator_id: operator.operator_id,
      name: operator.name,
      department: operator.department,
      shift: operator.shift,
      years_experience: calcYearsExperience(operator.hire_date),
      summary: {
        total_skills: totalSkills,
        avg_proficiency: Math.round(avgProficiency * 10) / 10,
        proficiency_label: PROFICIENCY_LABELS[Math.round(avgProficiency)],
        quality_score: operator.quality_score,
        productivity_score: operator.productivity_score,
        critical_gaps: criticalGaps.length,
      },
      categories,
      critical_skill_gaps: criticalGaps.length > 0 ? criticalGaps : undefined,
      qualified_machines: MACHINE_SKILL_REQS.filter(m =>
        m.required_skills.every(rs => (operator.skills[rs.skill_id] || 0) >= rs.min_level)
      ).map(m => m.machine_type),
    };
  }

  // Fleet skill search: filter by department, shift, skill, min_level
  let operators = [...OPERATOR_DB];
  if (dept) operators = operators.filter(o => o.department.toLowerCase().includes(dept));
  if (shift) operators = operators.filter(o => o.shift === shift);
  if (skill_id && min_level > 0) operators = operators.filter(o => (o.skills[skill_id] || 0) >= min_level);

  const roster = operators.map(op => {
    const totalSkills = Object.keys(op.skills).length;
    const avgProf = Object.values(op.skills).reduce((s, v) => s + v, 0) / totalSkills;
    return {
      operator_id: op.operator_id,
      name: op.name,
      department: op.department,
      shift: op.shift,
      years_experience: calcYearsExperience(op.hire_date),
      skills_count: totalSkills,
      avg_proficiency: Math.round(avgProf * 10) / 10,
      quality_score: op.quality_score,
      productivity_score: op.productivity_score,
      certifications_count: op.certifications.length,
      ...(skill_id ? { [skill_id]: op.skills[skill_id] || 0 } : {}),
    };
  });

  return {
    action: "op_skills",
    filters: { department: dept || "all", shift: shift || "all", skill_id: skill_id || "all", min_level },
    total_operators: roster.length,
    roster,
    fleet_summary: {
      avg_proficiency: Math.round(roster.reduce((s, r) => s + r.avg_proficiency, 0) / roster.length * 10) / 10,
      avg_quality: Math.round(roster.reduce((s, r) => s + r.quality_score, 0) / roster.length * 10) / 10,
      avg_productivity: Math.round(roster.reduce((s, r) => s + r.productivity_score, 0) / roster.length * 10) / 10,
    },
  };
}

// ── Action: op_certify ─────────────────────────────────────────────────────

function opCertify(params: Record<string, unknown>): unknown {
  const operator = getOperator(params);
  const certId = String(params.cert_id || "").toUpperCase();
  const statusFilter = String(params.status || "").toUpperCase();

  // Single operator certification detail
  if (operator) {
    const certs = operator.certifications.map(c => ({
      ...c,
      status: certStatus(c.expires),
      days_until_expiry: Math.round((new Date(c.expires).getTime() - new Date("2025-06-15").getTime()) / 86400000),
    }));

    // Eligible certifications not yet held
    const heldIds = new Set(certs.map(c => c.cert_id));
    const eligible = CERTIFICATION_CATALOG.filter(ct => !heldIds.has(ct.cert_id)).map(ct => {
      const meetsSkills = ct.required_skills.every(sid => (operator.skills[sid] || 0) >= ct.level_required);
      const gaps = ct.required_skills
        .filter(sid => (operator.skills[sid] || 0) < ct.level_required)
        .map(sid => ({ skill_id: sid, current: operator.skills[sid] || 0, required: ct.level_required }));
      return {
        cert_id: ct.cert_id,
        name: ct.name,
        issuer: ct.issuer,
        eligible: meetsSkills,
        skill_gaps: gaps.length > 0 ? gaps : undefined,
      };
    });

    return {
      action: "op_certify",
      operator_id: operator.operator_id,
      name: operator.name,
      summary: {
        total_certifications: certs.length,
        valid: certs.filter(c => c.status === "VALID").length,
        expiring_soon: certs.filter(c => c.status === "EXPIRING").length,
        expired: certs.filter(c => c.status === "EXPIRED").length,
      },
      certifications: certs,
      eligible_certifications: eligible,
    };
  }

  // Fleet certification overview
  let allCerts: { operator_id: string; name: string; cert: CertificationRecord & { status: string; days_until_expiry: number } }[] = [];
  for (const op of OPERATOR_DB) {
    for (const c of op.certifications) {
      const status = certStatus(c.expires);
      allCerts.push({
        operator_id: op.operator_id,
        name: op.name,
        cert: { ...c, status, days_until_expiry: Math.round((new Date(c.expires).getTime() - new Date("2025-06-15").getTime()) / 86400000) },
      });
    }
  }

  if (certId) allCerts = allCerts.filter(c => c.cert.cert_id === certId);
  if (statusFilter) allCerts = allCerts.filter(c => c.cert.status === statusFilter);

  const valid = allCerts.filter(c => c.cert.status === "VALID").length;
  const expiring = allCerts.filter(c => c.cert.status === "EXPIRING").length;
  const expired = allCerts.filter(c => c.cert.status === "EXPIRED").length;

  return {
    action: "op_certify",
    filters: { cert_id: certId || "all", status: statusFilter || "all" },
    summary: {
      total_records: allCerts.length,
      valid,
      expiring_soon: expiring,
      expired,
      compliance_pct: allCerts.length > 0 ? Math.round(valid / allCerts.length * 100) : 0,
    },
    records: allCerts.map(c => ({
      operator_id: c.operator_id,
      operator_name: c.name,
      ...c.cert,
    })),
    alerts: [
      ...allCerts.filter(c => c.cert.status === "EXPIRED").map(c => ({
        severity: "HIGH",
        message: `${c.name} — ${c.cert.name} EXPIRED ${Math.abs(c.cert.days_until_expiry)} days ago`,
      })),
      ...allCerts.filter(c => c.cert.status === "EXPIRING").map(c => ({
        severity: "MEDIUM",
        message: `${c.name} — ${c.cert.name} expires in ${c.cert.days_until_expiry} days`,
      })),
    ],
  };
}

// ── Action: op_assess ──────────────────────────────────────────────────────

function opAssess(params: Record<string, unknown>): unknown {
  const operator = getOperator(params);
  if (!operator) {
    return { action: "op_assess", error: "Operator not found. Provide operator_id or operator_name." };
  }

  const targetRole = String(params.target_role || params.role || "general").toLowerCase();
  const machineType = String(params.machine_type || "").toLowerCase();

  // Determine required skills based on role or machine
  let requirements: { skill_id: string; min_level: number; weight: number }[] = [];

  if (machineType) {
    const machReq = MACHINE_SKILL_REQS.find(m => m.machine_type.toLowerCase().includes(machineType));
    if (machReq) {
      requirements = machReq.required_skills.map(rs => ({ ...rs, weight: 1.0 }));
    }
  }

  if (requirements.length === 0) {
    // General assessment: all critical skills
    requirements = ALL_SKILLS.filter(s => s.critical).map(s => ({
      skill_id: s.id,
      min_level: 3,
      weight: 1.0,
    }));
  }

  const assessments = requirements.map(req => {
    const skill = ALL_SKILLS.find(s => s.id === req.skill_id);
    const current = operator.skills[req.skill_id] || 0;
    const gap = Math.max(0, req.min_level - current);
    const score = Math.min(100, Math.round((current / req.min_level) * 100));
    return {
      skill_id: req.skill_id,
      skill_name: skill?.name || req.skill_id,
      current_level: current,
      current_label: PROFICIENCY_LABELS[current],
      required_level: req.min_level,
      gap,
      score,
      status: gap === 0 ? "MEETS" : gap <= 1 ? "NEAR" : "GAP",
    };
  });

  const overallScore = Math.round(assessments.reduce((s, a) => s + a.score, 0) / assessments.length);
  const gaps = assessments.filter(a => a.status !== "MEETS");
  const strengths = assessments.filter(a => a.current_level >= 4);

  // Training recommendations for gaps
  const recommendations = gaps.map(g => ({
    skill_id: g.skill_id,
    skill_name: g.skill_name,
    action: g.gap <= 1 ? "On-the-job mentoring" : g.gap <= 2 ? "Structured training program" : "Intensive training + certification",
    estimated_weeks: g.gap * 4,
    priority: g.gap >= 2 ? "HIGH" : "MEDIUM",
  }));

  return {
    action: "op_assess",
    operator_id: operator.operator_id,
    name: operator.name,
    assessment_for: machineType || targetRole,
    overall_score: overallScore,
    rating: overallScore >= 90 ? "EXCELLENT" : overallScore >= 75 ? "PROFICIENT" : overallScore >= 60 ? "DEVELOPING" : "NEEDS_TRAINING",
    summary: {
      skills_assessed: assessments.length,
      meets_requirement: assessments.filter(a => a.status === "MEETS").length,
      near_requirement: assessments.filter(a => a.status === "NEAR").length,
      has_gap: gaps.length,
      quality_score: operator.quality_score,
      productivity_score: operator.productivity_score,
    },
    assessments,
    strengths: strengths.map(s => ({ skill_id: s.skill_id, skill_name: s.skill_name, level: s.current_level })),
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}

// ── Action: op_matrix ──────────────────────────────────────────────────────

function opMatrix(params: Record<string, unknown>): unknown {
  const dept = String(params.department || "").toLowerCase();
  const shift = String(params.shift || "").toUpperCase();
  const category = String(params.category || "").toLowerCase();

  let operators = [...OPERATOR_DB];
  if (dept) operators = operators.filter(o => o.department.toLowerCase().includes(dept));
  if (shift) operators = operators.filter(o => o.shift === shift);

  let skills = [...ALL_SKILLS];
  if (category) {
    const cat = SKILL_CATEGORIES.find(c => c.name.toLowerCase().includes(category));
    if (cat) skills = cat.skills;
  }

  // Build cross-training matrix
  const matrix = operators.map(op => {
    const skillLevels: Record<string, { level: number; label: string }> = {};
    for (const sk of skills) {
      const level = op.skills[sk.id] || 0;
      skillLevels[sk.id] = { level, label: PROFICIENCY_LABELS[level] };
    }
    return {
      operator_id: op.operator_id,
      name: op.name,
      shift: op.shift,
      department: op.department,
      skills: skillLevels,
    };
  });

  // Skill coverage analysis
  const coverage = skills.map(sk => {
    const levels = operators.map(op => op.skills[sk.id] || 0);
    const qualified = levels.filter(l => l >= 3).length;
    const expert = levels.filter(l => l >= 5).length;
    const avgLevel = levels.reduce((s, v) => s + v, 0) / levels.length;
    return {
      skill_id: sk.id,
      skill_name: sk.name,
      critical: sk.critical,
      avg_level: Math.round(avgLevel * 10) / 10,
      qualified_count: qualified,
      expert_count: expert,
      coverage_pct: Math.round(qualified / operators.length * 100),
      risk: qualified <= 1 ? "CRITICAL" : qualified <= 2 ? "HIGH" : qualified <= 3 ? "MEDIUM" : "LOW",
    };
  });

  // Machine qualification matrix
  const machineQualification = MACHINE_SKILL_REQS.map(m => {
    const qualified = operators.filter(op =>
      m.required_skills.every(rs => (op.skills[rs.skill_id] || 0) >= rs.min_level)
    );
    return {
      machine_type: m.machine_type,
      qualified_operators: qualified.length,
      operators: qualified.map(q => ({ operator_id: q.operator_id, name: q.name, shift: q.shift })),
      coverage_risk: qualified.length <= 1 ? "CRITICAL" : qualified.length <= 2 ? "HIGH" : qualified.length <= 3 ? "MEDIUM" : "LOW",
    };
  });

  const criticalRisks = coverage.filter(c => c.risk === "CRITICAL" && c.critical);
  const singlePoints = machineQualification.filter(m => m.qualified_operators <= 1);

  return {
    action: "op_matrix",
    filters: { department: dept || "all", shift: shift || "all", category: category || "all" },
    summary: {
      operators_analyzed: operators.length,
      skills_tracked: skills.length,
      critical_skill_risks: criticalRisks.length,
      single_point_failures: singlePoints.length,
      avg_skill_coverage_pct: Math.round(coverage.reduce((s, c) => s + c.coverage_pct, 0) / coverage.length),
    },
    skill_coverage: coverage,
    machine_qualification: machineQualification,
    cross_training_matrix: matrix,
    alerts: [
      ...criticalRisks.map(r => ({
        severity: "CRITICAL" as const,
        type: "skill_gap",
        message: `Critical skill "${r.skill_name}" has only ${r.qualified_count} qualified operator(s)`,
      })),
      ...singlePoints.map(sp => ({
        severity: "HIGH" as const,
        type: "single_point_failure",
        message: `${sp.machine_type} has only ${sp.qualified_operators} qualified operator(s)`,
      })),
    ],
  };
}

// ── Public Entry Point ─────────────────────────────────────────────────────

export function executeOperatorSkillAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "op_skills":
      return opSkills(params);
    case "op_certify":
      return opCertify(params);
    case "op_assess":
      return opAssess(params);
    case "op_matrix":
      return opMatrix(params);
    default:
      throw new Error(`Unknown OperatorSkillEngine action: ${action}`);
  }
}
