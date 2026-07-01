/**
 * Per-Employee Curriculum Tracks — JM Die personnel
 *
 * Per operator directive 2026-05-27 (lima session 92ef25c0): "Mark (CNC mill manager,
 * programs all mills + lathes, engineer, quoting + purchasing + scheduling); Chris
 * (Haas VF-2 + Hurco + Okuma 5-axis programmer, 5 yrs); Justin (apprentice — Excel
 * macros for electrodes, Fusion CAM templates for Roku-Roku, engraving in Haas OM2,
 * Mitsubishi EA12S sinker on GF+ robot)".
 *
 * Each track is an ordered list of course IDs the employee should walk through given
 * their role + actual machines + actual workflows. Course IDs reference entries in
 * mcp-server/web/src/data/academy.ts.
 *
 * Citation discipline (lima soul): every track ordering choice cites the employee's
 * named responsibilities — no propaganda promotions.
 */

export type EmployeeRoleId = 'mark-manager' | 'chris-programmer' | 'justin-apprentice';

export interface EmployeeProfile {
  id: EmployeeRoleId;
  first_name: string;
  last_name: string;
  department: string;
  role: string;
  clearance_level: 'shop_floor' | 'lead' | 'hr_manager' | 'admin';
  machines: string[];
  daily_workflows: string[];
  experience_years?: number;
}

export interface CurriculumTrack {
  employee: EmployeeProfile;
  rationale: string;
  course_ids: string[];
  expected_hours: number;
}

// ─── Profiles ─────────────────────────────────────────────────────────────

export const JM_DIE_EMPLOYEES: Record<EmployeeRoleId, EmployeeProfile> = {
  'mark-manager': {
    id: 'mark-manager',
    first_name: 'Mark',
    last_name: 'Manager',
    department: 'Engineering',
    role: 'CNC Mill Manager + Designated Engineer',
    clearance_level: 'admin',
    machines: ['All mills', 'All lathes'],
    daily_workflows: ['Programming', 'Quoting', 'Tool purchasing', 'Job scheduling', 'Engineering decisions'],
  },
  'chris-programmer': {
    id: 'chris-programmer',
    first_name: 'Chris',
    last_name: 'Programmer',
    department: 'Programming',
    role: 'CAM Programmer (Haas VF-2 + Hurco + Okuma 5-Axis)',
    clearance_level: 'lead',
    machines: ['Haas VF-2', 'Hurco', 'Okuma 5-axis'],
    daily_workflows: ['3-axis CAM programming', 'Hurco WinMAX conversational', '5-axis Okuma OSP programming'],
    experience_years: 5,
  },
  'justin-apprentice': {
    id: 'justin-apprentice',
    first_name: 'Justin',
    last_name: 'Apprentice',
    department: 'Shop Floor',
    role: 'Apprentice Machinist (Electrodes + Engraving + Sinker EDM)',
    clearance_level: 'shop_floor',
    machines: ['Roku-Roku (electrodes)', 'Haas OM2 (engraving)', 'Mitsubishi EA12S sinker (GF+ robot-fed)'],
    daily_workflows: ['Excel macros for electrode sizing', 'Fusion CAM electrode templates', 'Engraving programs', 'Sinker EDM setup on robotic pallet'],
  },
};

// ─── Tracks ───────────────────────────────────────────────────────────────

/**
 * Justin (apprentice) — start here.
 * Anchored to his actual machine stack + workflows. Foundations first, then his
 * exact daily work (electrodes → sinker → robot), then supporting skills.
 */
const JUSTIN_TRACK: CurriculumTrack = {
  employee: JM_DIE_EMPLOYEES['justin-apprentice'],
  rationale: 'Apprentice path: foundations (safety + measurement + G-code basics) → his exact daily workflow (electrode design → Fusion CAM template → Roku-Roku → EA12S sinker → GF+ robot) → supporting skills (chip control, Excel, alarm troubleshooting). Skips manager-only quoting/scheduling content. shop_floor clearance gate.',
  course_ids: [
    // Phase 1: Foundations (must-have before touching any machine)
    'course-0a',  // Kienzle Academy intro
    'course-0b',  // Shop safety
    'course-0c',  // Measurement + inspection basics
    'course-1',   // Print reading + GD&T basics
    'course-2',   // Speed & feed mastery (Kienzle foundation)
    'course-3',   // G-code programming foundations
    // Phase 2: Justin's actual machines + workflows
    'course-14',  // Electrode foundations + sizing
    'course-15',  // Sinker EDM (covers EA12S regime)
    'course-16',  // Robot-fed / lights-out (covers GF+ robot)
    'course-46',  // JM Fleet EDM machines (EA12S specifics)
    'course-45',  // JM Fleet Mills (Haas OM2 + Roku-Roku specifics)
    // Phase 3: Supporting daily skills
    'course-60',  // Chip control & thickness (small-tool engraving relevance)
    'course-9',   // Chatter / stability lobes (Roku-Roku is rigid but small tools chatter)
    'course-39',  // Excel for shop (his electrode macros)
    'course-22',  // Alarms + troubleshooting (entry-level alarm response)
  ],
  expected_hours: 70,
};

/**
 * Chris (mid-level programmer, 5 yrs).
 * Skips foundations he already has. Loads up on tooling encyclopedias, his specific
 * machines (Haas + Hurco + Okuma 5-axis), advanced CAM, hard machining.
 */
const CHRIS_TRACK: CurriculumTrack = {
  employee: JM_DIE_EMPLOYEES['chris-programmer'],
  rationale: 'Mid-level programmer path: skip foundations (5 yr experience) → deep tooling encyclopedias (56 mill, 57 lathe) → his exact machine stack (44/45 JM fleet, 55 5-axis for Okuma) → advanced CAM techniques (28 CAD/CAM atlas, 53 complex geometry) → hard machining (58, when work demands HRC 50+). lead clearance gate.',
  course_ids: [
    // Phase 1: Tooling encyclopedias (the depth a 5-yr programmer needs)
    'course-56',  // Mill tooling encyclopedia
    'course-57',  // Lathe tooling encyclopedia
    'course-50',  // Tooling database mastery (Kienzle toolRegistry)
    'course-51',  // Work-holding database
    // Phase 2: His specific machines
    'course-45',  // JM Fleet Mills (Haas VF-2 + Hurco specifics — VMC-01..05)
    'course-44',  // JM Fleet Lathes (Okuma LTH-01..07)
    'course-55',  // 5-Axis Mastery (Okuma 5-axis = his primary 5-axis machine)
    // Phase 3: Advanced CAM
    'course-28',  // CAD/CAM operations atlas
    'course-53',  // Complex geometry CAM (molds + turbines + etc.)
    'course-32',  // Machining math depth
    'course-30',  // Cycle-time + MRR optimization
    'course-58',  // Hard milling + hard turning
    // Phase 4: Quality + chip control reference
    'course-60',  // Chip control & thickness mastery
    'course-29',  // Wear modes + tool life modeling
  ],
  expected_hours: 90,
};

/**
 * Mark (manager + engineer).
 * Already programs everything — he needs MANAGER content: quoting, scheduling,
 * purchasing decisions, lean/sigma/kaizen, engineering validation (FEA, FOS,
 * process validation), and the PRISM app itself (he's the operator of the system).
 */
const MARK_TRACK: CurriculumTrack = {
  employee: JM_DIE_EMPLOYEES['mark-manager'],
  rationale: 'Manager + engineer path: business operations (35 accounting, 36 quoting, 38 logistics, 39 Excel) → engineering validation (52 CAD advanced, 54 FEA stress, 43 process validation) → operational excellence (47 lean/sigma/kaizen, 41 external resources, 42 Kienzle app) → quick references for the things he buys + schedules (50 tooling DB, 51 workholding DB, 49 speed/feed). admin clearance gate.',
  course_ids: [
    // Phase 1: Business operations (his job, not programming)
    'course-36',  // Quoting + estimation
    'course-35',  // Accounting fundamentals
    'course-38',  // Logistics + shipping
    'course-39',  // Excel for shop
    'course-40',  // QuickBooks
    // Phase 2: Engineering validation
    'course-52',  // CAD advanced (designs his fixtures)
    'course-54',  // FEA stress (validates them)
    'course-43',  // Process validation
    'course-9',   // Chatter / stability lobes (engineering call)
    // Phase 3: Operational excellence
    'course-47',  // Lean / Six Sigma / Kaizen
    'course-41',  // External resources catalog
    'course-42',  // Kienzle app mastery (he's the operator)
    // Phase 4: Quick-reference (purchasing + scheduling decisions)
    'course-50',  // Tooling database (purchasing)
    'course-51',  // Work-holding database
    'course-49',  // Speed/feed calculator (sets defaults for Chris + Justin)
    'course-48',  // Post-processors (debug + edit when Chris or Justin hits a wall)
    'course-31',  // CAD/CAM ops atlas
  ],
  expected_hours: 110,
};

// ─── Exports ──────────────────────────────────────────────────────────────

export const EMPLOYEE_TRACKS: Record<EmployeeRoleId, CurriculumTrack> = {
  'justin-apprentice': JUSTIN_TRACK,
  'chris-programmer': CHRIS_TRACK,
  'mark-manager': MARK_TRACK,
};

/**
 * Build the canonical AuthContext payload for a given employee profile.
 * The dev-seed page uses this to write localStorage exactly the way AuthContext
 * expects (token + userId + 6-field employee record).
 */
export function makeSeedPayload(role: EmployeeRoleId): {
  token: string;
  userId: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string;
    role: string;
    clearance_level: 'shop_floor' | 'lead' | 'hr_manager' | 'admin';
  };
} {
  const profile = JM_DIE_EMPLOYEES[role];
  return {
    token: ['dev', role, 'sid'].join('-') + '-' + Date.now(),
    userId: profile.id,
    employee: {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      department: profile.department,
      role: profile.role,
      clearance_level: profile.clearance_level,
    },
  };
}
