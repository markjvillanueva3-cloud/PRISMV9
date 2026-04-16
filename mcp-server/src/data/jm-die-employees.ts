import { JM_DIE_SOURCE_ROOTS } from "./jm-die-profile.js";

export type JMDieMachineAuthorityScope =
  | "operate"
  | "setup"
  | "program"
  | "release";

export type JMDieSeedDepartment =
  | "machining"
  | "quality"
  | "engineering"
  | "management"
  | "programming"
  | "planning";

export type JMDieSeedRole =
  | "operator"
  | "lead"
  | "programmer"
  | "inspector"
  | "manager"
  | "engineer"
  | "planner";

export type JMDieShellRoleId =
  | "machinist"
  | "programmer"
  | "lead"
  | "quality"
  | "manager"
  | "engineer";

export interface JMDieShiftSeed {
  shift_id: string;
  start_time: string;
  end_time: string;
  days: number[];
  break_minutes: number;
}

export interface JMDieSkillSeed {
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  machine_types?: string[];
  authority_scope?: JMDieMachineAuthorityScope[];
  applies_to_program_release_ready?: boolean;
  verified_by?: string;
  verified_date?: string;
}

export interface JMDieCertificationSeed {
  name: string;
  issuer: string;
  issued_date: string;
  expiry_date?: string;
  cert_number?: string;
  machine_types?: string[];
  authority_scope?: JMDieMachineAuthorityScope[];
  applies_to_program_release_ready?: boolean;
  status: "active" | "expired" | "pending_renewal";
}

export interface JMDieEmployeeSeed {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: JMDieSeedDepartment;
  department_label: string;
  role: JMDieSeedRole;
  role_label: string;
  hire_date: string;
  hourly_rate: number;
  shift: JMDieShiftSeed;
  skills: JMDieSkillSeed[];
  certifications: JMDieCertificationSeed[];
  notes: string;
  clearance_level: "shop_floor" | "lead" | "hr_manager" | "admin";
  auth_user_id: string | null;
  overtime_policy: {
    rule: "daily" | "weekly";
    daily_threshold_hrs: number;
    weekly_threshold_hrs: number;
    ot_multiplier: number;
    dt_multiplier: number;
  };
  shift_differential: {
    second_shift_premium: number;
    third_shift_premium: number;
  } | null;
}

export interface JMDieShellRoleDefinition {
  id: JMDieShellRoleId;
  employeeId: string;
  displayName: string;
  roleLabel: string;
  department: string;
  tagline: string;
  subtitle: string;
}

const DAY_SHIFT: JMDieShiftSeed = {
  shift_id: "day",
  start_time: "06:00",
  end_time: "16:30",
  days: [1, 2, 3, 4, 5],
  break_minutes: 30,
};

const FLEX_DAY_SHIFT: JMDieShiftSeed = {
  shift_id: "day-flex",
  start_time: "07:00",
  end_time: "17:00",
  days: [1, 2, 3, 4, 5],
  break_minutes: 30,
};

const COMMON_OVERTIME_POLICY = {
  rule: "weekly" as const,
  daily_threshold_hrs: 8,
  weekly_threshold_hrs: 40,
  ot_multiplier: 1.5,
  dt_multiplier: 2.0,
};

const VERIFIED_BY = "JM Die Company rollout";
const VERIFIED_DATE = "2026-04-10";

export const JM_DIE_EMPLOYEE_DATABASE_METADATA = {
  source_path: JM_DIE_SOURCE_ROOTS.employee_database_root,
  status: "in_progress" as const,
  note:
    "Canonical JM Die employee roster, shell identities, clearance levels, and machine/program authority are now seeded in code while the import workflow for live company records is built out.",
};

export const JM_DIE_EMPLOYEE_SEEDS: JMDieEmployeeSeed[] = [
  {
    id: "EMP-0001",
    first_name: "Avery",
    last_name: "Stone",
    email: "avery.stone@jmdie.com",
    department: "machining",
    department_label: "Machining",
    role: "operator",
    role_label: "Machinist",
    hire_date: "2021-03-15",
    hourly_rate: 32,
    shift: { ...DAY_SHIFT },
    skills: [
      {
        name: "okuma_lathe_setup",
        level: 4,
        machine_types: ["LTH-01", "LTH-02", "LTH-05"],
        authority_scope: ["operate", "setup"],
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
      {
        name: "roku_roku_electrode_setup",
        level: 3,
        machine_types: ["VMC-05"],
        authority_scope: ["operate", "setup"],
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
    ],
    certifications: [
      {
        name: "JM Die Floor Readiness",
        issuer: "JM Die Company",
        issued_date: "2024-01-08",
        cert_number: "JM-FLR-0001",
        status: "active",
      },
      {
        name: "Forklift and Material Handling",
        issuer: "JM Die Safety",
        issued_date: "2024-02-12",
        expiry_date: "2027-02-12",
        cert_number: "JM-SAFE-014",
        status: "active",
      },
    ],
    notes:
      "Canonical floor-facing machinist seed for JM Die. Tied to the employee database root at H:\\PRISM\\JM DIE\\Employee Database and used for cell-side APPW validation.",
    clearance_level: "shop_floor",
    auth_user_id: null,
    overtime_policy: { ...COMMON_OVERTIME_POLICY },
    shift_differential: null,
  },
  {
    id: "EMP-0002",
    first_name: "Jordan",
    last_name: "Vance",
    email: "jordan.vance@jmdie.com",
    department: "programming",
    department_label: "Programming",
    role: "programmer",
    role_label: "Programmer",
    hire_date: "2020-08-03",
    hourly_rate: 43,
    shift: { ...FLEX_DAY_SHIFT },
    skills: [
      {
        name: "mastercam_lathe_programming",
        level: 5,
        machine_types: ["LTH-01", "LTH-02", "LTH-05", "LTH-07"],
        authority_scope: ["program"],
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
      {
        name: "edm_program_release",
        level: 4,
        machine_types: ["WEDM-01", "EDM-01", "EDM-02", "VMC-05"],
        authority_scope: ["program", "release"],
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
    ],
    certifications: [
      {
        name: "Mastercam Programming Standard",
        issuer: "JM Die Company",
        issued_date: "2024-03-01",
        cert_number: "JM-CAM-002",
        status: "active",
      },
      {
        name: "Program Release Authority",
        issuer: "JM Die Company",
        issued_date: "2025-01-10",
        cert_number: "JM-REL-002",
        authority_scope: ["program", "release"],
        applies_to_program_release_ready: true,
        status: "active",
      },
    ],
    notes:
      "Canonical JM Die programmer seed for lathe, wire EDM, and sinker EDM electrode release. Owns program-archive validation against H:\\PRISM\\JM DIE\\Programs.",
    clearance_level: "lead",
    auth_user_id: null,
    overtime_policy: { ...COMMON_OVERTIME_POLICY },
    shift_differential: null,
  },
  {
    id: "EMP-0003",
    first_name: "Morgan",
    last_name: "Blake",
    email: "morgan.blake@jmdie.com",
    department: "machining",
    department_label: "Machining",
    role: "lead",
    role_label: "Lead",
    hire_date: "2018-11-26",
    hourly_rate: 38,
    shift: { ...DAY_SHIFT },
    skills: [
      {
        name: "dispatch_board_oversight",
        level: 4,
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
      {
        name: "machine_release_authority",
        level: 4,
        machine_types: ["LTH-01", "LTH-05", "VMC-03", "VMC-05", "WEDM-01"],
        authority_scope: ["release"],
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
    ],
    certifications: [
      {
        name: "Shift Lead Dispatch Authority",
        issuer: "JM Die Company",
        issued_date: "2024-02-20",
        cert_number: "JM-LEAD-003",
        authority_scope: ["release"],
        applies_to_program_release_ready: true,
        status: "active",
      },
    ],
    notes:
      "Canonical shift lead seed for APPW scheduling, dispatch, and cross-cell escalation flows.",
    clearance_level: "lead",
    auth_user_id: null,
    overtime_policy: { ...COMMON_OVERTIME_POLICY },
    shift_differential: null,
  },
  {
    id: "EMP-0004",
    first_name: "Casey",
    last_name: "Mercer",
    email: "casey.mercer@jmdie.com",
    department: "quality",
    department_label: "Quality",
    role: "inspector",
    role_label: "Quality",
    hire_date: "2019-06-10",
    hourly_rate: 36,
    shift: { ...DAY_SHIFT },
    skills: [
      {
        name: "cmm_and_fai_release",
        level: 5,
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
      {
        name: "electrode_packet_validation",
        level: 4,
        machine_types: ["EDM-01", "EDM-02", "VMC-05"],
        authority_scope: ["release"],
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
    ],
    certifications: [
      {
        name: "FAI and SPC Signoff",
        issuer: "JM Die Quality",
        issued_date: "2024-01-15",
        cert_number: "JM-QA-004",
        status: "active",
      },
    ],
    notes:
      "Canonical JM Die quality shell seed for inspection, SPC, and release-blocker workflows.",
    clearance_level: "lead",
    auth_user_id: null,
    overtime_policy: { ...COMMON_OVERTIME_POLICY },
    shift_differential: null,
  },
  {
    id: "EMP-0005",
    first_name: "Riley",
    last_name: "Ashford",
    email: "riley.ashford@jmdie.com",
    department: "management",
    department_label: "Management",
    role: "manager",
    role_label: "Manager",
    hire_date: "2017-05-01",
    hourly_rate: 56,
    shift: { ...FLEX_DAY_SHIFT },
    skills: [
      {
        name: "capacity_and_margin_review",
        level: 5,
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
      {
        name: "customer_release_authority",
        level: 5,
        authority_scope: ["release"],
        applies_to_program_release_ready: true,
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
    ],
    certifications: [
      {
        name: "Executive Approval Authority",
        issuer: "JM Die Company",
        issued_date: "2023-12-11",
        cert_number: "JM-EXEC-005",
        authority_scope: ["release"],
        applies_to_program_release_ready: true,
        status: "active",
      },
    ],
    notes:
      "Canonical management seed for APPW finance, quote, and capacity surfaces connected to the JM Die test shop.",
    clearance_level: "admin",
    auth_user_id: null,
    overtime_policy: { ...COMMON_OVERTIME_POLICY },
    shift_differential: null,
  },
  {
    id: "EMP-0006",
    first_name: "Dakota",
    last_name: "Reeves",
    email: "dakota.reeves@jmdie.com",
    department: "engineering",
    department_label: "Engineering",
    role: "engineer",
    role_label: "Engineer",
    hire_date: "2022-01-24",
    hourly_rate: 48,
    shift: { ...FLEX_DAY_SHIFT },
    skills: [
      {
        name: "process_planning",
        level: 5,
        machine_types: ["LTH-07", "VMC-02", "VMC-05", "EDM-01", "WEDM-01"],
        authority_scope: ["program"],
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
      {
        name: "tooling_and_material_qualification",
        level: 4,
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
    ],
    certifications: [
      {
        name: "Engineering Change Authority",
        issuer: "JM Die Company",
        issued_date: "2024-04-05",
        cert_number: "JM-ENG-006",
        authority_scope: ["program", "release"],
        applies_to_program_release_ready: true,
        status: "active",
      },
    ],
    notes:
      "Canonical engineering seed for material, tooling, controller, and print/program lineage work tied to JM Die.",
    clearance_level: "lead",
    auth_user_id: null,
    overtime_policy: { ...COMMON_OVERTIME_POLICY },
    shift_differential: null,
  },
  {
    id: "EMP-0014",
    first_name: "Morgan",
    last_name: "Hale",
    email: "morgan.hale@jmdie.com",
    department: "quality",
    department_label: "Quality",
    role: "inspector",
    role_label: "Quality Inspector",
    hire_date: "2023-02-13",
    hourly_rate: 34,
    shift: { ...DAY_SHIFT },
    skills: [
      {
        name: "metrology_evidence_capture",
        level: 4,
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
      {
        name: "shipment_blocker_review",
        level: 3,
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
    ],
    certifications: [
      {
        name: "Inspection Evidence Handling",
        issuer: "JM Die Quality",
        issued_date: "2024-06-18",
        cert_number: "JM-QA-014",
        status: "active",
      },
    ],
    notes:
      "Quality-inspector seed aligned to the employee portal and message fixtures so APPW fallback shells stay tied to JM Die identities.",
    clearance_level: "shop_floor",
    auth_user_id: null,
    overtime_policy: { ...COMMON_OVERTIME_POLICY },
    shift_differential: null,
  },
  {
    id: "EMP-0021",
    first_name: "Jordan",
    last_name: "Vale",
    email: "jordan.vale@jmdie.com",
    department: "planning",
    department_label: "Planning",
    role: "planner",
    role_label: "Planner",
    hire_date: "2023-09-05",
    hourly_rate: 37,
    shift: { ...FLEX_DAY_SHIFT },
    skills: [
      {
        name: "dispatch_and_release_planning",
        level: 4,
        authority_scope: ["release"],
        applies_to_program_release_ready: true,
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
      {
        name: "customer_pull_in_management",
        level: 4,
        verified_by: VERIFIED_BY,
        verified_date: VERIFIED_DATE,
      },
    ],
    certifications: [
      {
        name: "Planning and Dispatch Authority",
        issuer: "JM Die Company",
        issued_date: "2024-07-09",
        cert_number: "JM-PLAN-021",
        authority_scope: ["release"],
        applies_to_program_release_ready: true,
        status: "active",
      },
    ],
    notes:
      "Planning shell seed for dispatch, scheduling, and order-release workflows that will converge with machines, materials, prints, and programs.",
    clearance_level: "lead",
    auth_user_id: null,
    overtime_policy: { ...COMMON_OVERTIME_POLICY },
    shift_differential: null,
  },
];

const employeeSeedById = new Map(JM_DIE_EMPLOYEE_SEEDS.map((employee) => [employee.id, employee]));

function createShellRoleDefinition(
  id: JMDieShellRoleId,
  employeeId: string,
  tagline: string,
  subtitle: string,
): JMDieShellRoleDefinition {
  const employee = employeeSeedById.get(employeeId);
  if (!employee) {
    throw new Error(`JM Die shell role ${id} references unknown employee ${employeeId}`);
  }

  return {
    id,
    employeeId,
    displayName: `${employee.first_name} ${employee.last_name}`.trim(),
    roleLabel: employee.role_label,
    department: employee.department_label,
    tagline,
    subtitle,
  };
}

export const JM_DIE_SHELL_ROLE_DEFINITIONS: Record<JMDieShellRoleId, JMDieShellRoleDefinition> = {
  machinist: createShellRoleDefinition(
    "machinist",
    "EMP-0001",
    "Touch-first floor view for cell-side operators",
    "Touch-first floor view with only the work, checks, and learning a cell-side operator needs.",
  ),
  programmer: createShellRoleDefinition(
    "programmer",
    "EMP-0002",
    "CAM strategy and program release focus",
    "CAM strategy, toolpath verification, and program release workflow for CNC programmers.",
  ),
  lead: createShellRoleDefinition(
    "lead",
    "EMP-0003",
    "Shift oversight with scheduling and priority control",
    "Shift oversight with job priority, scheduling exceptions, and team coordination.",
  ),
  quality: createShellRoleDefinition(
    "quality",
    "EMP-0004",
    "Inspection, SPC, and compliance tracking",
    "Inspection planning, SPC monitoring, FAI tracking, and compliance management.",
  ),
  manager: createShellRoleDefinition(
    "manager",
    "EMP-0005",
    "Full visibility across jobs, finance, and capacity",
    "Full shop visibility across jobs, quotes, finance, capacity, and strategic decisions.",
  ),
  engineer: createShellRoleDefinition(
    "engineer",
    "EMP-0006",
    "DfM, process planning, and continuous improvement",
    "DfM review, process planning, tooling optimization, and continuous improvement initiatives.",
  ),
};
