/**
 * EmployeeEngine — Employee master data, skills, certifications, labor rates.
 * Provides the HR foundation that TimeClockEngine, PayrollEngine, and
 * ActualCostEngine all depend on.
 */
import {
  JM_DIE_EMPLOYEE_DATABASE_METADATA,
  JM_DIE_EMPLOYEE_SEEDS,
  type JMDieMachineAuthorityScope,
} from "../data/jm-die-employees.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";
import {
  shopConfigurationEngine,
} from "./ShopConfigurationEngine.js";

export type ClearanceLevel = "shop_floor" | "lead" | "hr_manager" | "admin";
export type MachineAuthorityScope = JMDieMachineAuthorityScope;

export interface OvertimePolicy {
  rule: "daily" | "weekly";
  daily_threshold_hrs: number;
  weekly_threshold_hrs: number;
  ot_multiplier: number;
  dt_multiplier: number;
}

export interface ShiftDifferential {
  second_shift_premium: number;
  third_shift_premium: number;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: Department;
  role: EmployeeRole;
  hire_date: string; // ISO date
  status: "active" | "inactive" | "terminated" | "leave";
  hourly_rate: number;
  overtime_rate: number; // typically 1.5x
  double_time_rate: number; // typically 2x
  shift: ShiftAssignment;
  skills: Skill[];
  certifications: Certification[];
  emergency_contact?: { name: string; phone: string; relation: string };
  notes: string;
  clearance_level: ClearanceLevel;
  auth_user_id: string | null;
  overtime_policy: OvertimePolicy;
  shift_differential: ShiftDifferential | null;
}

export type Department =
  | "machining"
  | "assembly"
  | "quality"
  | "engineering"
  | "maintenance"
  | "shipping"
  | "management"
  | "programming"
  | "planning"
  | "admin";

export type EmployeeRole =
  | "operator"
  | "setup_tech"
  | "lead"
  | "supervisor"
  | "programmer"
  | "planner"
  | "inspector"
  | "maintenance_tech"
  | "engineer"
  | "manager";

export interface ShiftAssignment {
  shift_id: string; // "day" | "swing" | "night" | custom
  start_time: string; // "06:00"
  end_time: string; // "14:30"
  days: number[]; // 0=Sun..6=Sat
  break_minutes: number; // unpaid break
}

export interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5; // 1=novice, 5=expert
  machine_types?: string[]; // e.g. ["haas_vf2", "dmg_mori_nhx"]
  authority_scope?: MachineAuthorityScope[];
  applies_to_program_release_ready?: boolean;
  verified_by?: string;
  verified_date?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  issued_date: string;
  expiry_date?: string;
  cert_number?: string;
  machine_types?: string[];
  authority_scope?: MachineAuthorityScope[];
  applies_to_program_release_ready?: boolean;
  status: "active" | "expired" | "pending_renewal";
}

export interface EmployeeMachineAuthorityRecord {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  controller_family: string;
  controller_model: string;
  program_release_ready: boolean;
  scopes: MachineAuthorityScope[];
  evidence: string[];
}

export interface EmployeeMachineAuthoritySummary {
  employee_id: string;
  employee_name: string;
  department: Department;
  role: EmployeeRole;
  clearance_level: ClearanceLevel;
  status: Employee["status"];
  machine_count: number;
  operate_machine_count: number;
  setup_machine_count: number;
  program_machine_count: number;
  release_machine_count: number;
  records: EmployeeMachineAuthorityRecord[];
}

export interface MachineAuthorityStaffingRecord {
  employee_id: string;
  employee_name: string;
  department: Department;
  role: EmployeeRole;
  clearance_level: ClearanceLevel;
  scopes: MachineAuthorityScope[];
  evidence: string[];
}

export interface EmployeeMachineAuthorityOverview {
  employee_count: number;
  active_employee_count: number;
  employees_with_machine_authority: number;
  employees_with_release_authority: number;
  covered_machine_count: number;
  covered_program_release_machine_count: number;
  unmanned_program_release_machine_count: number;
}

export interface EmployeeCreateInput {
  first_name: string;
  last_name: string;
  email: string;
  department: Department;
  role: EmployeeRole;
  hire_date?: string;
  hourly_rate: number;
  overtime_multiplier?: number;
  double_time_multiplier?: number;
  shift?: ShiftAssignment;
}

export interface EmployeeSearchInput {
  department?: Department;
  role?: EmployeeRole;
  status?: Employee["status"];
  skill?: string;
  certification?: string;
  query?: string; // free-text name search
}

export interface EmployeeUtilization {
  employee_id: string;
  name: string;
  period: string;
  scheduled_hours: number;
  worked_hours: number;
  job_hours: number;
  idle_hours: number;
  utilization_pct: number;
  overtime_hours: number;
  jobs_worked: number;
}

const DEFAULT_SHIFT: ShiftAssignment = {
  shift_id: "day",
  start_time: "06:00",
  end_time: "14:30",
  days: [1, 2, 3, 4, 5],
  break_minutes: 30,
};

const SHIFT_PRESETS: Record<string, ShiftAssignment> = {
  day: DEFAULT_SHIFT,
  swing: {
    shift_id: "swing",
    start_time: "14:30",
    end_time: "23:00",
    days: [1, 2, 3, 4, 5],
    break_minutes: 30,
  },
  night: {
    shift_id: "night",
    start_time: "22:00",
    end_time: "06:30",
    days: [1, 2, 3, 4, 5],
    break_minutes: 30,
  },
};

type PersistedEmployeeRecord = {
  id?: string;
  employee_id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  department?: Department;
  role?: EmployeeRole;
  shift?: string;
  shift_assignment?: ShiftAssignment;
  hire_date?: string;
  hourly_rate?: number;
  overtime_rate?: number;
  double_time_rate?: number;
  status?: string;
  skills?: string[];
  skill_details?: Skill[];
  certifications?: string[];
  certification_details?: Certification[];
  emergency_contact?: Employee["emergency_contact"];
  notes?: string;
  clearance_level?: ClearanceLevel;
  auth_user_id?: string | null;
  overtime_policy?: OvertimePolicy;
  shift_differential?: ShiftDifferential | null;
};

function parseSerializedArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeShiftAssignment(
  shiftId: string | undefined,
  assignment: unknown,
): ShiftAssignment {
  const explicit = assignment as Partial<ShiftAssignment> | undefined;
  if (
    explicit &&
    typeof explicit === "object" &&
    typeof explicit.shift_id === "string" &&
    typeof explicit.start_time === "string" &&
    typeof explicit.end_time === "string" &&
    Array.isArray(explicit.days)
  ) {
    return {
      shift_id: explicit.shift_id,
      start_time: explicit.start_time,
      end_time: explicit.end_time,
      days: explicit.days.map(Number),
      break_minutes: Number(explicit.break_minutes ?? DEFAULT_SHIFT.break_minutes),
    };
  }

  const preset = SHIFT_PRESETS[shiftId ?? ""] ?? DEFAULT_SHIFT;
  return { ...preset, shift_id: shiftId ?? preset.shift_id };
}

function splitEmployeeName(
  firstName: unknown,
  lastName: unknown,
  name: unknown,
): { first_name: string; last_name: string } {
  if (typeof firstName === "string" && firstName.trim()) {
    return {
      first_name: firstName.trim(),
      last_name: typeof lastName === "string" ? lastName.trim() : "",
    };
  }

  const full = typeof name === "string" ? name.trim() : "";
  if (!full) return { first_name: "Unknown", last_name: "" };

  const [first, ...rest] = full.split(/\s+/);
  return {
    first_name: first,
    last_name: rest.join(" "),
  };
}

function toStoreEmployeeStatus(status: Employee["status"]): string {
  return status === "leave" ? "on_leave" : status;
}

function fromStoreEmployeeStatus(status: unknown): Employee["status"] {
  return status === "on_leave" ? "leave" : (status as Employee["status"] ?? "active");
}

function parseEmployeeOrdinal(id: string): number {
  const match = /^EMP-(\d+)$/i.exec(id);
  return match ? Number.parseInt(match[1] ?? "0", 10) : 0;
}

const MACHINE_AUTHORITY_SCOPE_ORDER: Record<MachineAuthorityScope, number> = {
  operate: 0,
  setup: 1,
  program: 2,
  release: 3,
};

function sortMachineAuthorityScopes(scopes: Iterable<MachineAuthorityScope>): MachineAuthorityScope[] {
  return [...new Set(scopes)].sort(
    (left, right) => MACHINE_AUTHORITY_SCOPE_ORDER[left] - MACHINE_AUTHORITY_SCOPE_ORDER[right],
  );
}

function scopeSatisfiesMinimum(
  scopes: MachineAuthorityScope[],
  minimumScope: MachineAuthorityScope,
): boolean {
  const minimumRank = MACHINE_AUTHORITY_SCOPE_ORDER[minimumScope];
  return scopes.some((scope) => MACHINE_AUTHORITY_SCOPE_ORDER[scope] >= minimumRank);
}

function createSeedEmployee(seed: (typeof JM_DIE_EMPLOYEE_SEEDS)[number]): Employee {
  return {
    id: seed.id,
    first_name: seed.first_name,
    last_name: seed.last_name,
    email: seed.email,
    department: seed.department,
    role: seed.role,
    hire_date: seed.hire_date,
    status: "active",
    hourly_rate: seed.hourly_rate,
    overtime_rate: seed.hourly_rate * seed.overtime_policy.ot_multiplier,
    double_time_rate: seed.hourly_rate * seed.overtime_policy.dt_multiplier,
    shift: {
      shift_id: seed.shift.shift_id,
      start_time: seed.shift.start_time,
      end_time: seed.shift.end_time,
      days: [...seed.shift.days],
      break_minutes: seed.shift.break_minutes,
    },
    skills: seed.skills.map((skill) => ({
      ...skill,
      machine_types: skill.machine_types ? [...skill.machine_types] : undefined,
      authority_scope: skill.authority_scope ? [...skill.authority_scope] : undefined,
    })),
    certifications: seed.certifications.map((cert) => ({
      ...cert,
      machine_types: cert.machine_types ? [...cert.machine_types] : undefined,
      authority_scope: cert.authority_scope ? [...cert.authority_scope] : undefined,
    })),
    notes: seed.notes,
    clearance_level: seed.clearance_level,
    auth_user_id: seed.auth_user_id,
    overtime_policy: { ...seed.overtime_policy },
    shift_differential: seed.shift_differential ? { ...seed.shift_differential } : null,
  };
}

class EmployeeEngine {
  private employees: Map<string, Employee> = new Map();
  private nextId = 1;

  constructor() {
    this.seedCanonicalRoster();
  }

  private seedCanonicalRoster(): void {
    for (const seed of JM_DIE_EMPLOYEE_SEEDS) {
      if (!this.employees.has(seed.id)) {
        this.employees.set(seed.id, createSeedEmployee(seed));
      }
      this.nextId = Math.max(this.nextId, parseEmployeeOrdinal(seed.id) + 1);
    }
  }

  private buildMachineAuthorityRecords(employee: Employee): EmployeeMachineAuthorityRecord[] {
    if (employee.status !== "active") {
      return [];
    }

    const registry = shopConfigurationEngine.getMachineControllerRegistry();
    const machineById = new Map(registry.map((entry) => [entry.machine_id, entry]));
    const programReleaseReadyMachineIds = registry
      .filter((entry) => entry.program_release_ready)
      .map((entry) => entry.machine_id);
    const authorityByMachine = new Map<string, { scopes: Set<MachineAuthorityScope>; evidence: Set<string> }>();

    const applyGrant = (
      machineIds: string[],
      scopes: MachineAuthorityScope[],
      evidenceLabel: string,
    ) => {
      if (machineIds.length === 0 || scopes.length === 0) {
        return;
      }

      for (const machineId of machineIds) {
        if (!machineById.has(machineId)) {
          continue;
        }
        const existing = authorityByMachine.get(machineId) ?? {
          scopes: new Set<MachineAuthorityScope>(),
          evidence: new Set<string>(),
        };
        for (const scope of scopes) {
          existing.scopes.add(scope);
        }
        existing.evidence.add(evidenceLabel);
        authorityByMachine.set(machineId, existing);
      }
    };

    for (const skill of employee.skills) {
      const directMachineIds = skill.machine_types ? [...skill.machine_types] : [];
      const grantMachineIds = skill.applies_to_program_release_ready
        ? [...new Set([...directMachineIds, ...programReleaseReadyMachineIds])]
        : directMachineIds;
      const scopes = skill.authority_scope?.length
        ? [...skill.authority_scope]
        : (grantMachineIds.length > 0 ? ["operate"] : []);
      applyGrant(grantMachineIds, scopes as JMDieMachineAuthorityScope[], `skill:${skill.name}`);
    }

    for (const cert of employee.certifications) {
      if (cert.status !== "active") {
        continue;
      }
      const directMachineIds = cert.machine_types ? [...cert.machine_types] : [];
      const grantMachineIds = cert.applies_to_program_release_ready
        ? [...new Set([...directMachineIds, ...programReleaseReadyMachineIds])]
        : directMachineIds;
      const scopes = cert.authority_scope?.length ? [...cert.authority_scope] : [];
      applyGrant(grantMachineIds, scopes, `cert:${cert.name}`);
    }

    return [...authorityByMachine.entries()]
      .map(([machineId, authority]) => {
        const machine = machineById.get(machineId)!;
        return {
          machine_id: machine.machine_id,
          machine_name: machine.machine_name,
          machine_type: machine.machine_type,
          controller_family: machine.controller_family,
          controller_model: machine.controller_model,
          program_release_ready: machine.program_release_ready,
          scopes: sortMachineAuthorityScopes(authority.scopes),
          evidence: [...authority.evidence].sort((left, right) => left.localeCompare(right, "en-US")),
        } satisfies EmployeeMachineAuthorityRecord;
      })
      .sort((left, right) => left.machine_id.localeCompare(right.machine_id, "en-US"));
  }

  /** Create a new employee record. */
  create(input: EmployeeCreateInput): Employee {
    const id = `EMP-${String(this.nextId++).padStart(4, "0")}`;
    const otPolicy: OvertimePolicy = {
      rule: "weekly",
      daily_threshold_hrs: 8,
      weekly_threshold_hrs: 40,
      ot_multiplier: input.overtime_multiplier ?? 1.5,
      dt_multiplier: input.double_time_multiplier ?? 2.0,
    };
    const emp: Employee = {
      id,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      department: input.department,
      role: input.role,
      hire_date: input.hire_date ?? new Date().toISOString().slice(0, 10),
      status: "active",
      hourly_rate: input.hourly_rate,
      overtime_rate: input.hourly_rate * (input.overtime_multiplier ?? 1.5),
      double_time_rate: input.hourly_rate * (input.double_time_multiplier ?? 2.0),
      shift: input.shift ?? { ...DEFAULT_SHIFT },
      skills: [],
      certifications: [],
      notes: "",
      clearance_level: "shop_floor",
      auth_user_id: null,
      overtime_policy: otPolicy,
      shift_differential: null,
    };
    this.employees.set(id, emp);
    persistenceBridge.persist("employees", id, emp as any);
    return emp;
  }

  /** Get employee by ID. */
  get(id: string): Employee | undefined {
    return this.employees.get(id);
  }

  /**
   * Resolve the employee linked to an auth user id via the `auth_user_id` field
   * (U-ERP-IDOR-SELFGATE, 2026-07-02). Returns the FIRST employee whose auth_user_id
   * matches, or undefined when no link exists. The route-level self-gate uses this to
   * translate a request's authenticated user id into the caller's own employee_id, so an
   * IDOR check can compare an EMP-* target against the caller's real employee identity
   * rather than a mismatched auth id. Undefined (no mapping yet) lets the caller degrade
   * the check safely -- it must NEVER be read as "not self".
   * @param authUserId the authenticated user id (req.userId)
   * @returns the linked Employee, or undefined if none is mapped
   */
  findByAuthUserId(authUserId: string): Employee | undefined {
    if (!authUserId) return undefined;
    for (const emp of this.employees.values()) {
      if (emp.auth_user_id != null && emp.auth_user_id === authUserId) return emp;
    }
    return undefined;
  }

  /** Update employee fields (partial). */
  update(id: string, updates: Partial<Omit<Employee, "id">>): Employee {
    const emp = this.employees.get(id);
    if (!emp) throw new Error(`Employee ${id} not found`);
    Object.assign(emp, updates);
    // Recalculate OT rates if hourly_rate changed
    if (updates.hourly_rate != null) {
      emp.overtime_rate = emp.hourly_rate * (emp.overtime_policy?.ot_multiplier ?? 1.5);
      emp.double_time_rate = emp.hourly_rate * (emp.overtime_policy?.dt_multiplier ?? 2.0);
    }
    persistenceBridge.persist("employees", id, emp as any);
    return emp;
  }

  /** Update employee status with change tracking. Terminated status is irreversible. */
  updateStatus(
    id: string,
    newStatus: Employee["status"],
    changeReason: string,
    actorId: string,
    returnDate?: string,
  ): Employee {
    const emp = this.employees.get(id);
    if (!emp) throw new Error(`Employee ${id} not found`);
    if (emp.status === "terminated" && newStatus !== "terminated") {
      throw new Error(`Cannot change status of terminated employee ${id}`);
    }
    if (!changeReason || changeReason.trim().length < 3) {
      throw new Error("change_reason must be at least 3 characters");
    }
    emp.status = newStatus;
    persistenceBridge.persist("employees", id, emp as any);
    return emp;
  }

  /** Search employees by criteria. */
  search(input: EmployeeSearchInput): Employee[] {
    let results = Array.from(this.employees.values());

    if (input.status) results = results.filter((e) => e.status === input.status);
    if (input.department) results = results.filter((e) => e.department === input.department);
    if (input.role) results = results.filter((e) => e.role === input.role);
    if (input.skill) {
      const s = input.skill.toLowerCase();
      results = results.filter((e) =>
        e.skills.some((sk) => sk.name.toLowerCase().includes(s)),
      );
    }
    if (input.certification) {
      const c = input.certification.toLowerCase();
      results = results.filter((e) =>
        e.certifications.some(
          (cert) => cert.name.toLowerCase().includes(c) && cert.status === "active",
        ),
      );
    }
    if (input.query) {
      const q = input.query.toLowerCase();
      results = results.filter(
        (e) =>
          e.first_name.toLowerCase().includes(q) ||
          e.last_name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q),
      );
    }
    return results;
  }

  /** Add a skill to an employee. */
  addSkill(employeeId: string, skill: Skill): Employee {
    const emp = this.employees.get(employeeId);
    if (!emp) throw new Error(`Employee ${employeeId} not found`);
    const existing = emp.skills.findIndex(
      (s) => s.name.toLowerCase() === skill.name.toLowerCase(),
    );
    if (existing >= 0) {
      emp.skills[existing] = skill; // update
    } else {
      emp.skills.push(skill);
    }
    persistenceBridge.persist("employees", employeeId, emp as any);
    return emp;
  }

  /** Add a certification to an employee. */
  addCertification(employeeId: string, cert: Certification): Employee {
    const emp = this.employees.get(employeeId);
    if (!emp) throw new Error(`Employee ${employeeId} not found`);
    emp.certifications.push(cert);
    persistenceBridge.persist("employees", employeeId, emp as any);
    return emp;
  }

  /** List all employees, optionally filtered by status. */
  list(status?: Employee["status"]): Employee[] {
    const all = Array.from(this.employees.values());
    return status ? all.filter((e) => e.status === status) : all;
  }

  /** Get the labor rate for an employee given hours context. */
  getLaborRate(
    employeeId: string,
    hoursWorkedToday: number,
  ): { rate: number; type: "regular" | "overtime" | "double_time" } {
    const emp = this.employees.get(employeeId);
    if (!emp) throw new Error(`Employee ${employeeId} not found`);
    if (hoursWorkedToday > 12) return { rate: emp.double_time_rate, type: "double_time" };
    if (hoursWorkedToday > 8) return { rate: emp.overtime_rate, type: "overtime" };
    return { rate: emp.hourly_rate, type: "regular" };
  }

  /** Calculate utilization for an employee given time entries. */
  calculateUtilization(
    employeeId: string,
    periodLabel: string,
    scheduledHours: number,
    timeEntries: { hours: number; job_id?: string }[],
  ): EmployeeUtilization {
    const emp = this.employees.get(employeeId);
    if (!emp) throw new Error(`Employee ${employeeId} not found`);

    const workedHours = timeEntries.reduce((s, e) => s + e.hours, 0);
    const jobHours = timeEntries
      .filter((e) => e.job_id)
      .reduce((s, e) => s + e.hours, 0);
    const overtimeHours = Math.max(0, workedHours - scheduledHours);
    const jobIds = new Set(timeEntries.filter((e) => e.job_id).map((e) => e.job_id));

    return {
      employee_id: employeeId,
      name: `${emp.first_name} ${emp.last_name}`,
      period: periodLabel,
      scheduled_hours: scheduledHours,
      worked_hours: workedHours,
      job_hours: jobHours,
      idle_hours: Math.max(0, workedHours - jobHours),
      utilization_pct: scheduledHours > 0 ? (jobHours / scheduledHours) * 100 : 0,
      overtime_hours: overtimeHours,
      jobs_worked: jobIds.size,
    };
  }

  /** Get employees with expiring certifications (within N days). */
  expiringCertifications(withinDays: number = 30): {
    employee: Employee;
    cert: Certification;
    days_until_expiry: number;
  }[] {
    const now = Date.now();
    const results: { employee: Employee; cert: Certification; days_until_expiry: number }[] = [];

    for (const emp of this.employees.values()) {
      for (const cert of emp.certifications) {
        if (cert.expiry_date && cert.status === "active") {
          const expiry = new Date(cert.expiry_date).getTime();
          const daysLeft = Math.ceil((expiry - now) / 86400000);
          if (daysLeft <= withinDays && daysLeft >= 0) {
            results.push({ employee: emp, cert, days_until_expiry: daysLeft });
          }
        }
      }
    }
    return results.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
  }

  /** Department headcount summary. */
  departmentSummary(): Record<Department, { total: number; active: number; roles: Record<string, number> }> {
    const summary = {} as Record<Department, { total: number; active: number; roles: Record<string, number> }>;
    for (const emp of this.employees.values()) {
      if (!summary[emp.department]) {
        summary[emp.department] = { total: 0, active: 0, roles: {} };
      }
      summary[emp.department].total++;
      if (emp.status === "active") summary[emp.department].active++;
      summary[emp.department].roles[emp.role] = (summary[emp.department].roles[emp.role] ?? 0) + 1;
    }
    return summary;
  }

  getMachineAuthority(employeeId: string): EmployeeMachineAuthoritySummary {
    const employee = this.employees.get(employeeId);
    if (!employee) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    const records = this.buildMachineAuthorityRecords(employee);
    return {
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`.trim(),
      department: employee.department,
      role: employee.role,
      clearance_level: employee.clearance_level,
      status: employee.status,
      machine_count: records.length,
      operate_machine_count: records.filter((record) => record.scopes.includes("operate")).length,
      setup_machine_count: records.filter((record) => record.scopes.includes("setup")).length,
      program_machine_count: records.filter((record) => record.scopes.includes("program")).length,
      release_machine_count: records.filter((record) => record.scopes.includes("release")).length,
      records,
    };
  }

  getQualifiedEmployeesForMachine(
    machineId: string,
    minimumScope: MachineAuthorityScope = "operate",
  ): MachineAuthorityStaffingRecord[] {
    const staff = this.list("active")
      .map((employee) => {
        const authority = this.getMachineAuthority(employee.id);
        const match = authority.records.find((record) => record.machine_id === machineId);
        if (!match || !scopeSatisfiesMinimum(match.scopes, minimumScope)) {
          return null;
        }

        return {
          employee_id: employee.id,
          employee_name: `${employee.first_name} ${employee.last_name}`.trim(),
          department: employee.department,
          role: employee.role,
          clearance_level: employee.clearance_level,
          scopes: match.scopes,
          evidence: match.evidence,
        } satisfies MachineAuthorityStaffingRecord;
      })
      .filter((record): record is MachineAuthorityStaffingRecord => record !== null);

    return staff.sort((left, right) => {
      const leftTop = Math.max(...left.scopes.map((scope) => MACHINE_AUTHORITY_SCOPE_ORDER[scope]));
      const rightTop = Math.max(...right.scopes.map((scope) => MACHINE_AUTHORITY_SCOPE_ORDER[scope]));
      if (rightTop !== leftTop) {
        return rightTop - leftTop;
      }
      return left.employee_name.localeCompare(right.employee_name, "en-US");
    });
  }

  getMachineAuthorityOverview(): EmployeeMachineAuthorityOverview {
    const activeEmployees = this.list("active");
    const authoritySummaries = activeEmployees.map((employee) => this.getMachineAuthority(employee.id));
    const coveredMachineIds = new Set(
      authoritySummaries.flatMap((summary) => summary.records.map((record) => record.machine_id)),
    );
    const programReleaseMachineIds = shopConfigurationEngine
      .getMachineControllerRegistry()
      .filter((entry) => entry.program_release_ready)
      .map((entry) => entry.machine_id);
    const coveredProgramReleaseMachineIds = new Set(
      authoritySummaries.flatMap((summary) =>
        summary.records
          .filter((record) => record.program_release_ready)
          .map((record) => record.machine_id),
      ),
    );

    return {
      employee_count: this.employees.size,
      active_employee_count: activeEmployees.length,
      employees_with_machine_authority: authoritySummaries.filter((summary) => summary.machine_count > 0).length,
      employees_with_release_authority: authoritySummaries.filter((summary) => summary.release_machine_count > 0).length,
      covered_machine_count: coveredMachineIds.size,
      covered_program_release_machine_count: coveredProgramReleaseMachineIds.size,
      unmanned_program_release_machine_count: programReleaseMachineIds.filter(
        (machineId) => !coveredProgramReleaseMachineIds.has(machineId),
      ).length,
    };
  }

  getCanonicalSeedMetadata() {
    return {
      ...JM_DIE_EMPLOYEE_DATABASE_METADATA,
      seeded_employee_ids: JM_DIE_EMPLOYEE_SEEDS.map((employee) => employee.id),
    };
  }
}

export const employeeEngine = new EmployeeEngine();
export { EmployeeEngine };

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "employees",
  getMap: () => (employeeEngine as any).employees as Map<string, any>,
  keyField: "id",
  toRecord: (value) => {
    const employee = value as Employee;
    return {
      employee_id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`.trim(),
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      shift: employee.shift.shift_id,
      shift_assignment: employee.shift,
      hire_date: employee.hire_date,
      hourly_rate: employee.hourly_rate,
      overtime_rate: employee.overtime_rate,
      double_time_rate: employee.double_time_rate,
      status: toStoreEmployeeStatus(employee.status),
      skills: employee.skills.map((skill) => skill.name),
      skill_details: employee.skills,
      certifications: employee.certifications.map((cert) => cert.name),
      certification_details: employee.certifications,
      emergency_contact: employee.emergency_contact,
      notes: employee.notes,
      clearance_level: employee.clearance_level,
      auth_user_id: employee.auth_user_id,
      overtime_policy: employee.overtime_policy,
      shift_differential: employee.shift_differential,
    };
  },
  fromRecord: (record) => {
    const stored = record as PersistedEmployeeRecord;
    const names = splitEmployeeName(stored.first_name, stored.last_name, stored.name);
    const overtimePolicy = stored.overtime_policy ?? {
      rule: "weekly",
      daily_threshold_hrs: 8,
      weekly_threshold_hrs: 40,
      ot_multiplier: 1.5,
      dt_multiplier: 2.0,
    };
    const hourlyRate = Number(stored.hourly_rate ?? 0);
    const parsedSkills = parseSerializedArray<Skill>(stored.skill_details);
    const parsedCertifications = parseSerializedArray<Certification>(stored.certification_details);

    return {
      id: stored.employee_id ?? String(stored.id ?? ""),
      first_name: names.first_name,
      last_name: names.last_name,
      email: stored.email ?? "",
      department: (stored.department ?? "machining") as Department,
      role: (stored.role ?? "operator") as EmployeeRole,
      hire_date: stored.hire_date ?? new Date().toISOString().slice(0, 10),
      status: fromStoreEmployeeStatus(stored.status),
      hourly_rate: hourlyRate,
      overtime_rate: Number(stored.overtime_rate ?? hourlyRate * (overtimePolicy.ot_multiplier ?? 1.5)),
      double_time_rate: Number(stored.double_time_rate ?? hourlyRate * (overtimePolicy.dt_multiplier ?? 2.0)),
      shift: normalizeShiftAssignment(stored.shift, stored.shift_assignment),
      skills:
        parsedSkills.length > 0
          ? parsedSkills
          : parseSerializedArray<string>(stored.skills).map((name) => ({
              name,
              level: 3 as const,
            })),
      certifications:
        parsedCertifications.length > 0
          ? parsedCertifications
          : parseSerializedArray<string>(stored.certifications).map((name) => ({
              name,
              issuer: "Unknown",
              issued_date: "",
              status: "active" as const,
            })),
      emergency_contact: stored.emergency_contact,
      notes: stored.notes ?? "",
      clearance_level: stored.clearance_level ?? "shop_floor",
      auth_user_id: stored.auth_user_id ?? null,
      overtime_policy: overtimePolicy,
      shift_differential: stored.shift_differential ?? null,
    } satisfies Employee;
  },
});
