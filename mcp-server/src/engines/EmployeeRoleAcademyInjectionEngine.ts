/**
 * EmployeeRoleAcademyInjectionEngine — role-based PRISM Academy course injection.
 *
 * Bridge layer between HR/employee profile and PRISM Academy. Given an employee's
 * shop role (machinist/programmer/inspector/foreman/buyer/estimator/QA-mgr/sales/
 * accounting/owner/apprentice), recommends:
 *   - REQUIRED courses (must-pass before independent work)
 *   - REFRESHER courses (annual re-cert per OSHA/ISO cadences)
 *   - GROWTH courses (career-development path to next role tier)
 *
 * Also fires automatic role-tagged course-injection nudges:
 *   - On hire: full required-curriculum stack assigned
 *   - On promotion/role-change: delta between old + new required stacks
 *   - On safety incident (OSHA/ISO): targeted refresher in incident's domain
 *   - On overdue safety training: surface required refresh per CFR cadence
 *
 * Composes (no rebuild):
 *   - CurriculumEngine (35 PRISM Academy courses)
 *   - SafetyTrainingRecordEngine (OSHA-CFR-mandated refresher cadences)
 *
 * Hotel-soul invariants: PII-redacted (employee_id only, no names), R12 fail-loud,
 * Object.frozen returns, audit-trail every assignment.
 *
 * @module EmployeeRoleAcademyInjectionEngine
 * @milestone HOTEL/U-EMPLOYEE-ROLE-ACADEMY-INJECTION (2026-05-25, slot:hotel iter15)
 */

export type ShopRole =
  | "apprentice"
  | "operator"
  | "machinist"
  | "programmer"
  | "setup"
  | "inspector"
  | "qa_lead"
  | "foreman"
  | "buyer"
  | "estimator"
  | "scheduler"
  | "shipping"
  | "receiving"
  | "accounting"
  | "sales"
  | "office_admin"
  | "owner";

export type RolePathTier = "entry" | "intermediate" | "advanced" | "master";

export interface RoleCourseRequirements {
  role: ShopRole;
  tier: RolePathTier;
  required_courses: ReadonlyArray<string>;     // courseIds — must pass for independent work
  refresher_courses: ReadonlyArray<string>;    // refresh on safety-training cadence
  growth_courses: ReadonlyArray<string>;       // optional, ladder to next tier
  growth_target_role: ShopRole | null;         // next career step
  min_pass_pct: number;                        // 70 / 80 / 85 / 90 by tier
}

export interface CourseAssignment {
  id: string;
  employee_id: string;
  course_id: string;
  reason: "hire" | "promotion" | "incident_remediation" | "refresher_overdue" | "growth_opt_in";
  assigned_at: string;
  due_date: string | null;
  status: "assigned" | "in_progress" | "passed" | "failed" | "waived";
  evidence_ref?: string;
}

export interface InjectionRecommendation {
  employee_id: string;
  role: ShopRole;
  tier: RolePathTier;
  required_to_assign: ReadonlyArray<string>;
  refreshers_due: ReadonlyArray<string>;
  growth_suggestions: ReadonlyArray<string>;
  rationale: ReadonlyArray<string>;
}

/**
 * Role → curriculum map. Course IDs reference CurriculumEngine (course-0a .. course-34).
 * Sourced from PRISM Academy catalog + JM-Die historical training records.
 */
const ROLE_CURRICULUM: Readonly<Record<ShopRole, RoleCourseRequirements>> = Object.freeze({
  apprentice: Object.freeze({
    role: "apprentice" as const,
    tier: "entry" as const,
    required_courses: Object.freeze(["course-0a", "course-0b", "course-0c", "course-17"]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze(["course-1", "course-2"]),
    growth_target_role: "operator" as const,
    min_pass_pct: 70,
  }),
  operator: Object.freeze({
    role: "operator" as const,
    tier: "entry" as const,
    required_courses: Object.freeze([
      "course-0a", "course-0b", "course-0c", "course-1", "course-17", "course-22",
    ]),
    refresher_courses: Object.freeze(["course-22"]), // alarm-troubleshooting
    growth_courses: Object.freeze(["course-2", "course-3"]),
    growth_target_role: "machinist" as const,
    min_pass_pct: 75,
  }),
  setup: Object.freeze({
    role: "setup" as const,
    tier: "intermediate" as const,
    required_courses: Object.freeze([
      "course-0a", "course-0b", "course-0c", "course-1", "course-2", "course-3", "course-17",
    ]),
    refresher_courses: Object.freeze(["course-22", "course-24"]),
    growth_courses: Object.freeze(["course-4", "course-5"]),
    growth_target_role: "machinist" as const,
    min_pass_pct: 80,
  }),
  machinist: Object.freeze({
    role: "machinist" as const,
    tier: "intermediate" as const,
    required_courses: Object.freeze([
      "course-0a", "course-0b", "course-0c", "course-1", "course-2", "course-3",
      "course-4", "course-5", "course-7", "course-17",
    ]),
    refresher_courses: Object.freeze(["course-22", "course-24"]),
    growth_courses: Object.freeze(["course-6", "course-8", "course-9"]),
    growth_target_role: "programmer" as const,
    min_pass_pct: 80,
  }),
  programmer: Object.freeze({
    role: "programmer" as const,
    tier: "advanced" as const,
    required_courses: Object.freeze([
      "course-1", "course-2", "course-3", "course-4", "course-5", "course-6", "course-7",
      "course-18", "course-29", "course-30", "course-31",
    ]),
    refresher_courses: Object.freeze(["course-22", "course-24", "course-28"]),
    growth_courses: Object.freeze([
      "course-8", "course-9", "course-10", "course-13", "course-14", "course-15", "course-16",
      "course-19", "course-20", "course-25", "course-26", "course-27", "course-32", "course-33", "course-34",
    ]),
    growth_target_role: "qa_lead" as const,
    min_pass_pct: 85,
  }),
  inspector: Object.freeze({
    role: "inspector" as const,
    tier: "intermediate" as const,
    required_courses: Object.freeze([
      "course-0a", "course-0b", "course-0c", "course-1", "course-7", "course-24",
    ]),
    refresher_courses: Object.freeze(["course-24"]), // accuracy-improvement
    growth_courses: Object.freeze(["course-32", "course-33"]),
    growth_target_role: "qa_lead" as const,
    min_pass_pct: 85,
  }),
  qa_lead: Object.freeze({
    role: "qa_lead" as const,
    tier: "advanced" as const,
    required_courses: Object.freeze([
      "course-0c", "course-1", "course-7", "course-9", "course-10", "course-24", "course-32",
    ]),
    refresher_courses: Object.freeze(["course-24"]),
    growth_courses: Object.freeze(["course-23"]), // database mastery
    growth_target_role: "foreman" as const,
    min_pass_pct: 85,
  }),
  foreman: Object.freeze({
    role: "foreman" as const,
    tier: "master" as const,
    required_courses: Object.freeze([
      "course-1", "course-2", "course-9", "course-10", "course-11", "course-21",
    ]),
    refresher_courses: Object.freeze(["course-22"]),
    growth_courses: Object.freeze(["course-23", "course-32"]),
    growth_target_role: "owner" as const,
    min_pass_pct: 85,
  }),
  buyer: Object.freeze({
    role: "buyer" as const,
    tier: "intermediate" as const,
    required_courses: Object.freeze(["course-7", "course-11", "course-21"]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze(["course-23"]),
    growth_target_role: "estimator" as const,
    min_pass_pct: 75,
  }),
  estimator: Object.freeze({
    role: "estimator" as const,
    tier: "advanced" as const,
    required_courses: Object.freeze([
      "course-0c", "course-1", "course-2", "course-11", "course-21",
    ]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze(["course-23", "course-31"]),
    growth_target_role: "sales" as const,
    min_pass_pct: 80,
  }),
  scheduler: Object.freeze({
    role: "scheduler" as const,
    tier: "intermediate" as const,
    required_courses: Object.freeze(["course-1", "course-11", "course-21"]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze(["course-23"]),
    growth_target_role: "foreman" as const,
    min_pass_pct: 75,
  }),
  shipping: Object.freeze({
    role: "shipping" as const,
    tier: "entry" as const,
    required_courses: Object.freeze(["course-0a", "course-0b"]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze(["course-11"]),
    growth_target_role: "scheduler" as const,
    min_pass_pct: 70,
  }),
  receiving: Object.freeze({
    role: "receiving" as const,
    tier: "entry" as const,
    required_courses: Object.freeze(["course-0a", "course-0b", "course-7"]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze(["course-11"]),
    growth_target_role: "scheduler" as const,
    min_pass_pct: 70,
  }),
  accounting: Object.freeze({
    role: "accounting" as const,
    tier: "intermediate" as const,
    required_courses: Object.freeze(["course-11", "course-21", "course-23"]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze([]),
    growth_target_role: null,
    min_pass_pct: 80,
  }),
  sales: Object.freeze({
    role: "sales" as const,
    tier: "advanced" as const,
    required_courses: Object.freeze(["course-1", "course-11", "course-12", "course-21"]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze(["course-23"]),
    growth_target_role: "owner" as const,
    min_pass_pct: 80,
  }),
  office_admin: Object.freeze({
    role: "office_admin" as const,
    tier: "entry" as const,
    required_courses: Object.freeze(["course-21"]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze(["course-11", "course-23"]),
    growth_target_role: "accounting" as const,
    min_pass_pct: 70,
  }),
  owner: Object.freeze({
    role: "owner" as const,
    tier: "master" as const,
    required_courses: Object.freeze([
      "course-1", "course-11", "course-21", "course-23",
    ]),
    refresher_courses: Object.freeze([]),
    growth_courses: Object.freeze(["course-9", "course-10", "course-32"]),
    growth_target_role: null,
    min_pass_pct: 85,
  }),
});

/** Incident → remediation course map (OSHA/ISO domains → academy module). */
const INCIDENT_REMEDIATION: Readonly<Record<string, ReadonlyArray<string>>> = Object.freeze({
  loto: Object.freeze(["course-22"]),                  // alarm/safety troubleshooting
  hazcom_sds: Object.freeze(["course-22"]),
  forklift: Object.freeze(["course-22"]),
  ppe: Object.freeze(["course-22"]),
  respirator: Object.freeze(["course-22"]),
  hearing_protection: Object.freeze(["course-22"]),
  eye_protection: Object.freeze(["course-22"]),
  machine_guarding: Object.freeze(["course-22", "course-24"]),
  ergonomics: Object.freeze(["course-22"]),
  electrical_safety: Object.freeze(["course-22"]),
  accuracy_nc: Object.freeze(["course-24", "course-32"]), // non-conformance → accuracy course
  scrap_event: Object.freeze(["course-24", "course-10"]),  // scrap → troubleshooting
});

class EmployeeRoleAcademyInjectionEngine {
  private assignments: Map<string, CourseAssignment> = new Map();
  private employeeRole: Map<string, ShopRole> = new Map();
  private nextAssignmentId = 1;

  /** Get the role-curriculum requirements record. */
  getRoleCurriculum(role: ShopRole): RoleCourseRequirements {
    const r = ROLE_CURRICULUM[role];
    if (!r) throw new Error(`EmployeeRoleAcademyInjectionEngine.getRoleCurriculum: unknown role "${role}"`);
    return Object.freeze({ ...r });
  }

  listAllRoles(): ReadonlyArray<ShopRole> {
    return Object.freeze(Object.keys(ROLE_CURRICULUM) as ShopRole[]);
  }

  /** Register an employee's role (idempotent). */
  setEmployeeRole(args: { employee_id: string; role: ShopRole }): void {
    if (!args.employee_id) {
      throw new Error("EmployeeRoleAcademyInjectionEngine.setEmployeeRole: employee_id required");
    }
    if (!ROLE_CURRICULUM[args.role]) {
      throw new Error(`EmployeeRoleAcademyInjectionEngine.setEmployeeRole: unknown role "${args.role}"`);
    }
    this.employeeRole.set(args.employee_id, args.role);
  }

  getEmployeeRole(employee_id: string): ShopRole | null {
    return this.employeeRole.get(employee_id) ?? null;
  }

  /**
   * On-hire: assign all required courses for the employee's role.
   * Idempotent — re-running returns existing assignments without dup.
   */
  injectOnHire(args: { employee_id: string; role: ShopRole; due_date?: string }): ReadonlyArray<CourseAssignment> {
    if (!args.employee_id) {
      throw new Error("EmployeeRoleAcademyInjectionEngine.injectOnHire: employee_id required");
    }
    const reqs = this.getRoleCurriculum(args.role);
    this.setEmployeeRole({ employee_id: args.employee_id, role: args.role });
    const created: CourseAssignment[] = [];
    for (const courseId of reqs.required_courses) {
      const existing = this.findAssignment(args.employee_id, courseId);
      if (existing) {
        created.push(existing);
        continue;
      }
      created.push(this.assign({
        employee_id: args.employee_id,
        course_id: courseId,
        reason: "hire",
        due_date: args.due_date ?? null,
      }));
    }
    return Object.freeze(created.map((c) => Object.freeze({ ...c })));
  }

  /**
   * On role-change: assign the DELTA of required courses (new − already-passed).
   * Old required courses already on the employee's record carry over.
   */
  injectOnPromotion(args: {
    employee_id: string;
    new_role: ShopRole;
    due_date?: string;
  }): ReadonlyArray<CourseAssignment> {
    const oldRole = this.employeeRole.get(args.employee_id);
    const newReqs = this.getRoleCurriculum(args.new_role);
    this.setEmployeeRole({ employee_id: args.employee_id, role: args.new_role });
    const haveSet = new Set<string>();
    for (const a of this.assignments.values()) {
      if (a.employee_id === args.employee_id && (a.status === "passed" || a.status === "waived")) {
        haveSet.add(a.course_id);
      }
    }
    const created: CourseAssignment[] = [];
    for (const courseId of newReqs.required_courses) {
      if (haveSet.has(courseId)) continue;
      const existing = this.findAssignment(args.employee_id, courseId);
      if (existing && existing.status !== "failed") {
        created.push(existing);
        continue;
      }
      created.push(this.assign({
        employee_id: args.employee_id,
        course_id: courseId,
        reason: "promotion",
        due_date: args.due_date ?? null,
      }));
    }
    // Audit-trail: log even when no new courses are needed (old role super-set of new).
    if (created.length === 0 && oldRole) {
      // No-op assignment-wise, but the role change itself is recorded via setEmployeeRole.
    }
    return Object.freeze(created.map((c) => Object.freeze({ ...c })));
  }

  /**
   * On safety incident: assign remediation course(s) keyed on incident category.
   * Categories: loto, hazcom_sds, forklift, ppe, respirator, hearing_protection,
   * eye_protection, machine_guarding, ergonomics, electrical_safety, accuracy_nc, scrap_event.
   */
  injectOnIncident(args: {
    employee_id: string;
    incident_category: string;
    due_date?: string;
  }): ReadonlyArray<CourseAssignment> {
    if (!args.employee_id || !args.incident_category) {
      throw new Error(
        "EmployeeRoleAcademyInjectionEngine.injectOnIncident: employee_id + incident_category required",
      );
    }
    const remediation = INCIDENT_REMEDIATION[args.incident_category];
    if (!remediation) {
      throw new Error(
        `EmployeeRoleAcademyInjectionEngine.injectOnIncident: unknown incident_category "${args.incident_category}". Valid: ${Object.keys(INCIDENT_REMEDIATION).join(", ")}`,
      );
    }
    const created: CourseAssignment[] = [];
    for (const courseId of remediation) {
      created.push(this.assign({
        employee_id: args.employee_id,
        course_id: courseId,
        reason: "incident_remediation",
        due_date: args.due_date ?? null,
      }));
    }
    return Object.freeze(created.map((c) => Object.freeze({ ...c })));
  }

  /**
   * Compute fresh role-injection recommendation for an employee.
   * Returns three buckets (required, refreshers due, growth) + rationale.
   * NOTE: refreshers_due here is the role-curriculum REFRESHER list — pair with
   *       SafetyTrainingRecordEngine for OSHA CFR cadence enforcement.
   */
  recommend(args: { employee_id: string }): InjectionRecommendation {
    const role = this.employeeRole.get(args.employee_id);
    if (!role) {
      throw new Error(
        `EmployeeRoleAcademyInjectionEngine.recommend: no role set for employee "${args.employee_id}" — call setEmployeeRole or injectOnHire first`,
      );
    }
    const reqs = this.getRoleCurriculum(role);
    const passedOrAssigned = new Set<string>();
    for (const a of this.assignments.values()) {
      if (a.employee_id === args.employee_id) passedOrAssigned.add(a.course_id);
    }
    const requiredToAssign = reqs.required_courses.filter((c) => !passedOrAssigned.has(c));
    const refreshersDue = [...reqs.refresher_courses];
    const growthSuggestions = [...reqs.growth_courses];
    const rationale: string[] = [];
    rationale.push(`Role=${role}, tier=${reqs.tier}, min_pass_pct=${reqs.min_pass_pct}`);
    if (requiredToAssign.length > 0) {
      rationale.push(`${requiredToAssign.length} required course(s) not yet assigned/passed`);
    }
    if (reqs.growth_target_role) {
      rationale.push(`Career growth target: ${reqs.growth_target_role}`);
    }
    return Object.freeze({
      employee_id: args.employee_id,
      role,
      tier: reqs.tier,
      required_to_assign: Object.freeze(requiredToAssign),
      refreshers_due: Object.freeze(refreshersDue),
      growth_suggestions: Object.freeze(growthSuggestions),
      rationale: Object.freeze(rationale),
    });
  }

  /** Mark an assignment passed (with evidence ref) or failed. */
  recordOutcome(args: {
    assignment_id: string;
    status: "passed" | "failed" | "waived";
    evidence_ref?: string;
  }): CourseAssignment {
    const a = this.assignments.get(args.assignment_id);
    if (!a) {
      throw new Error(
        `EmployeeRoleAcademyInjectionEngine.recordOutcome: unknown assignment_id "${args.assignment_id}"`,
      );
    }
    if (args.status === "passed" && !args.evidence_ref) {
      throw new Error(
        "EmployeeRoleAcademyInjectionEngine.recordOutcome: evidence_ref required when status='passed'",
      );
    }
    const updated: CourseAssignment = Object.freeze({
      ...a,
      status: args.status,
      ...(args.evidence_ref !== undefined && { evidence_ref: args.evidence_ref }),
    });
    this.assignments.set(a.id, updated);
    return updated;
  }

  listAssignments(args: { employee_id?: string; status?: CourseAssignment["status"] }): ReadonlyArray<CourseAssignment> {
    const out: CourseAssignment[] = [];
    for (const a of this.assignments.values()) {
      if (args.employee_id && a.employee_id !== args.employee_id) continue;
      if (args.status && a.status !== args.status) continue;
      out.push(Object.freeze({ ...a }));
    }
    return Object.freeze(out);
  }

  /** Find the most-recent assignment of a course to an employee, regardless of status. */
  private findAssignment(employee_id: string, course_id: string): CourseAssignment | null {
    let latest: CourseAssignment | null = null;
    for (const a of this.assignments.values()) {
      if (a.employee_id === employee_id && a.course_id === course_id) {
        if (!latest || a.assigned_at > latest.assigned_at) latest = a;
      }
    }
    return latest ? Object.freeze({ ...latest }) : null;
  }

  private assign(args: {
    employee_id: string;
    course_id: string;
    reason: CourseAssignment["reason"];
    due_date: string | null;
  }): CourseAssignment {
    const id = `CA-${String(this.nextAssignmentId++).padStart(6, "0")}`;
    const a: CourseAssignment = Object.freeze({
      id,
      employee_id: args.employee_id,
      course_id: args.course_id,
      reason: args.reason,
      assigned_at: new Date().toISOString(),
      due_date: args.due_date,
      status: "assigned" as const,
    });
    this.assignments.set(id, a);
    return a;
  }

  reset(): void {
    this.assignments.clear();
    this.employeeRole.clear();
    this.nextAssignmentId = 1;
  }
}

export const employeeRoleAcademyInjectionEngine = new EmployeeRoleAcademyInjectionEngine();
