/**
 * EmployeeEngine — Employee master data, skills, certifications, labor rates.
 * Provides the HR foundation that TimeClockEngine, PayrollEngine, and
 * ActualCostEngine all depend on.
 */
import { persistenceBridge } from "../db/PersistenceBridge.js";

export type ClearanceLevel = "shop_floor" | "lead" | "hr_manager" | "admin";

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
  | "admin";

export type EmployeeRole =
  | "operator"
  | "setup_tech"
  | "lead"
  | "supervisor"
  | "programmer"
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
  verified_by?: string;
  verified_date?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  issued_date: string;
  expiry_date?: string;
  cert_number?: string;
  status: "active" | "expired" | "pending_renewal";
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

class EmployeeEngine {
  private employees: Map<string, Employee> = new Map();
  private nextId = 1;

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
}

export const employeeEngine = new EmployeeEngine();
export { EmployeeEngine };

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "employees",
  getMap: () => (employeeEngine as any).employees as Map<string, any>,
  keyField: "id",
});
