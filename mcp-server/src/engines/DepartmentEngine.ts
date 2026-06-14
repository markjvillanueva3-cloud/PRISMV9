/**
 * DepartmentEngine — org-chart entity for the shop.
 *
 * Foundational ERP/HR substrate: every department has a code, name, manager,
 * roster of employees, KPI rollup (OEE / on-time / waste). Departments are
 * how audits, dashboards, and AI summaries scope their data.
 *
 * Canonical JM-Die-shaped department codes (operator can add custom):
 *   eng · programming · mill · lathe · swiss · millturn · wedm · sinker
 *   grinder · honing · polishing · qa · shipping · receiving · office · sales
 *   accounting · maintenance
 *
 * Composes (no rebuild):
 *   - EmployeeMachineDomainAcademyEngine: department.machine_domain links
 *     to specialist curriculum (mill dept → mill domain courses).
 *   - ManagerRegistryEngine (G2): department.manager_employee_id resolves to
 *     a manager record; reports_to chains roll up cross-dept.
 *
 * Hotel-soul invariants: PII-free (employee_id only), Object.frozen returns,
 * R12 fail-loud, no silent department-rename (audit-trail every change).
 *
 * @module DepartmentEngine
 * @milestone HOTEL/U-DEPARTMENT-ENGINE (2026-05-26, slot:hotel iter6 /goal Phase 1 P0)
 */

import type { MachineDomain } from "./EmployeeMachineDomainAcademyEngine.js";

export type DepartmentCode = string; // e.g. "mill", "wedm", "qa" — operator-extensible

export interface KpiRollup {
  /** OEE = Availability × Performance × Quality (Nakajima 1988). World-class > 85%. */
  oee_pct: number;
  /** On-time delivery rate. World-class > 95%. */
  on_time_delivery_pct: number;
  /** Total waste observations in window (DOWNTIME 8-waste sum). */
  waste_count: number;
  /** Open kaizen events in this department. */
  open_kaizen_events: number;
  /** Open non-conformance reports in this department. */
  open_ncrs: number;
  /** ISO-8601 window start. */
  window_start: string;
  /** ISO-8601 window end. */
  window_end: string;
}

export interface Department {
  code: DepartmentCode;
  name: string;
  /** Optional machine domain link (mill / lathe / wedm / etc) for specialist-curriculum bridging. */
  machine_domain?: MachineDomain;
  /** employee_id of the department manager. Refers to ManagerRegistryEngine entry. */
  manager_employee_id: string;
  /** Roster of employee_ids assigned to this department (excludes manager unless explicitly listed). */
  member_employee_ids: ReadonlyArray<string>;
  /** Parent department code for nested org-chart (e.g. mill → manufacturing → operations). */
  parent_code?: DepartmentCode;
  created_at: string;
  updated_at: string;
  audit_trail: ReadonlyArray<DepartmentAudit>;
}

export interface DepartmentAudit {
  at: string;
  by_employee_id: string;
  operation:
    | "create"
    | "rename"
    | "reassign_manager"
    | "add_member"
    | "remove_member"
    | "set_machine_domain"
    | "set_parent"
    | "delete";
  detail: string;
}

export interface RollupBundle {
  department: Department;
  kpi: KpiRollup;
}

class DepartmentEngine {
  private departments: Map<DepartmentCode, Department> = new Map();
  private kpis: Map<DepartmentCode, KpiRollup> = new Map();

  createDepartment(args: {
    code: DepartmentCode;
    name: string;
    manager_employee_id: string;
    machine_domain?: MachineDomain;
    parent_code?: DepartmentCode;
    by_employee_id: string;
  }): Department {
    if (!args.code || !/^[a-z][a-z0-9_]{0,31}$/.test(args.code)) {
      throw new Error(
        `DepartmentEngine.createDepartment: code must match /^[a-z][a-z0-9_]{0,31}$/ (got '${args.code}')`,
      );
    }
    if (!args.name || args.name.trim().length === 0) {
      throw new Error(
        "DepartmentEngine.createDepartment: non-empty name required",
      );
    }
    if (!args.manager_employee_id) {
      throw new Error(
        "DepartmentEngine.createDepartment: manager_employee_id required",
      );
    }
    if (this.departments.has(args.code)) {
      throw new Error(
        `DepartmentEngine.createDepartment: department '${args.code}' already exists`,
      );
    }
    if (args.parent_code && !this.departments.has(args.parent_code)) {
      throw new Error(
        `DepartmentEngine.createDepartment: parent_code '${args.parent_code}' does not exist`,
      );
    }
    const now = new Date().toISOString();
    const dept: Department = Object.freeze({
      code: args.code,
      name: args.name,
      manager_employee_id: args.manager_employee_id,
      member_employee_ids: Object.freeze([]),
      ...(args.machine_domain !== undefined && {
        machine_domain: args.machine_domain,
      }),
      ...(args.parent_code !== undefined && { parent_code: args.parent_code }),
      created_at: now,
      updated_at: now,
      audit_trail: Object.freeze([
        Object.freeze({
          at: now,
          by_employee_id: args.by_employee_id,
          operation: "create" as const,
          detail: `created dept '${args.code}' (${args.name}), manager=${args.manager_employee_id}`,
        }),
      ]),
    });
    this.departments.set(args.code, dept);
    return dept;
  }

  reassignManager(args: {
    code: DepartmentCode;
    new_manager_employee_id: string;
    by_employee_id: string;
  }): Department {
    const dept = this.requireDept(args.code);
    if (!args.new_manager_employee_id) {
      throw new Error(
        "DepartmentEngine.reassignManager: new_manager_employee_id required",
      );
    }
    if (dept.manager_employee_id === args.new_manager_employee_id) {
      throw new Error(
        `DepartmentEngine.reassignManager: '${args.new_manager_employee_id}' is already manager of '${args.code}'`,
      );
    }
    return this.update(dept, args.by_employee_id, "reassign_manager",
      `manager ${dept.manager_employee_id} → ${args.new_manager_employee_id}`,
      { manager_employee_id: args.new_manager_employee_id });
  }

  addMember(args: {
    code: DepartmentCode;
    employee_id: string;
    by_employee_id: string;
  }): Department {
    const dept = this.requireDept(args.code);
    if (!args.employee_id) {
      throw new Error("DepartmentEngine.addMember: employee_id required");
    }
    if (dept.member_employee_ids.includes(args.employee_id)) {
      throw new Error(
        `DepartmentEngine.addMember: ${args.employee_id} already a member of ${args.code}`,
      );
    }
    return this.update(dept, args.by_employee_id, "add_member",
      `added ${args.employee_id}`,
      {
        member_employee_ids: Object.freeze([
          ...dept.member_employee_ids,
          args.employee_id,
        ]),
      });
  }

  removeMember(args: {
    code: DepartmentCode;
    employee_id: string;
    by_employee_id: string;
  }): Department {
    const dept = this.requireDept(args.code);
    if (!dept.member_employee_ids.includes(args.employee_id)) {
      throw new Error(
        `DepartmentEngine.removeMember: ${args.employee_id} not a member of ${args.code}`,
      );
    }
    return this.update(dept, args.by_employee_id, "remove_member",
      `removed ${args.employee_id}`,
      {
        member_employee_ids: Object.freeze(
          dept.member_employee_ids.filter((e) => e !== args.employee_id),
        ),
      });
  }

  rename(args: {
    code: DepartmentCode;
    new_name: string;
    by_employee_id: string;
  }): Department {
    const dept = this.requireDept(args.code);
    if (!args.new_name || args.new_name.trim().length === 0) {
      throw new Error(
        "DepartmentEngine.rename: non-empty new_name required",
      );
    }
    if (dept.name === args.new_name) {
      throw new Error(
        `DepartmentEngine.rename: name is already '${args.new_name}'`,
      );
    }
    return this.update(dept, args.by_employee_id, "rename",
      `renamed '${dept.name}' → '${args.new_name}'`,
      { name: args.new_name });
  }

  setMachineDomain(args: {
    code: DepartmentCode;
    machine_domain: MachineDomain;
    by_employee_id: string;
  }): Department {
    const dept = this.requireDept(args.code);
    return this.update(dept, args.by_employee_id, "set_machine_domain",
      `machine_domain ${dept.machine_domain ?? "none"} → ${args.machine_domain}`,
      { machine_domain: args.machine_domain });
  }

  setParent(args: {
    code: DepartmentCode;
    parent_code: DepartmentCode | null;
    by_employee_id: string;
  }): Department {
    const dept = this.requireDept(args.code);
    if (args.parent_code !== null && !this.departments.has(args.parent_code)) {
      throw new Error(
        `DepartmentEngine.setParent: parent_code '${args.parent_code}' does not exist`,
      );
    }
    if (args.parent_code === args.code) {
      throw new Error(
        "DepartmentEngine.setParent: department cannot be its own parent",
      );
    }
    // Cycle check: walk up the proposed parent chain — if we hit `code`, reject
    if (args.parent_code !== null) {
      let walker: DepartmentCode | undefined = args.parent_code;
      const seen = new Set<DepartmentCode>();
      while (walker) {
        if (walker === args.code) {
          throw new Error(
            `DepartmentEngine.setParent: cycle detected — setting parent of '${args.code}' to '${args.parent_code}' would form a loop`,
          );
        }
        if (seen.has(walker)) break;
        seen.add(walker);
        walker = this.departments.get(walker)?.parent_code;
      }
    }
    const patch: Partial<Department> =
      args.parent_code === null
        ? ({ parent_code: undefined } as Partial<Department>)
        : { parent_code: args.parent_code };
    return this.update(dept, args.by_employee_id, "set_parent",
      `parent ${dept.parent_code ?? "none"} → ${args.parent_code ?? "none"}`,
      patch);
  }

  /**
   * Record / overwrite the KPI rollup for a department. Designed to be called
   * by a scheduled rollup job consuming KaizenLeanSigmaEngine.wasteSummary,
   * EmployeeTaskHandoffEngine.listStalledHandoffs, OEE telemetry, etc.
   */
  setKpiRollup(args: {
    code: DepartmentCode;
    oee_pct: number;
    on_time_delivery_pct: number;
    waste_count: number;
    open_kaizen_events: number;
    open_ncrs: number;
    window_start: string;
    window_end: string;
  }): KpiRollup {
    this.requireDept(args.code); // existence gate
    for (const [k, v] of Object.entries(args) as Array<[string, number | string]>) {
      if (
        typeof v === "number" &&
        (!Number.isFinite(v) || v < 0)
      ) {
        throw new Error(
          `DepartmentEngine.setKpiRollup: ${k} must be a finite non-negative number (got ${v})`,
        );
      }
    }
    if (args.oee_pct > 100 || args.on_time_delivery_pct > 100) {
      throw new Error(
        "DepartmentEngine.setKpiRollup: oee_pct and on_time_delivery_pct must be ≤100",
      );
    }
    const kpi: KpiRollup = Object.freeze({
      oee_pct: args.oee_pct,
      on_time_delivery_pct: args.on_time_delivery_pct,
      waste_count: args.waste_count,
      open_kaizen_events: args.open_kaizen_events,
      open_ncrs: args.open_ncrs,
      window_start: args.window_start,
      window_end: args.window_end,
    });
    this.kpis.set(args.code, kpi);
    return kpi;
  }

  getDepartment(code: DepartmentCode): Department {
    return Object.freeze({ ...this.requireDept(code) });
  }

  listDepartments(args: {
    manager_employee_id?: string;
    machine_domain?: MachineDomain;
    parent_code?: DepartmentCode;
  } = {}): ReadonlyArray<Department> {
    const out: Department[] = [];
    for (const d of this.departments.values()) {
      if (
        args.manager_employee_id &&
        d.manager_employee_id !== args.manager_employee_id
      )
        continue;
      if (args.machine_domain && d.machine_domain !== args.machine_domain)
        continue;
      if (args.parent_code && d.parent_code !== args.parent_code) continue;
      out.push(Object.freeze({ ...d }));
    }
    return Object.freeze(out);
  }

  getRollup(code: DepartmentCode): RollupBundle {
    const dept = this.requireDept(code);
    const kpi = this.kpis.get(code);
    if (!kpi) {
      throw new Error(
        `DepartmentEngine.getRollup: no KPI rollup recorded for '${code}' — call setKpiRollup first`,
      );
    }
    return Object.freeze({
      department: Object.freeze({ ...dept }),
      kpi: Object.freeze({ ...kpi }),
    });
  }

  /** Returns the ancestor chain ending at the root (a → parent → ... → root). */
  ancestorChain(code: DepartmentCode): ReadonlyArray<DepartmentCode> {
    this.requireDept(code);
    const chain: DepartmentCode[] = [code];
    const seen = new Set<DepartmentCode>([code]);
    let walker = this.departments.get(code)?.parent_code;
    while (walker) {
      if (seen.has(walker)) {
        // Should never happen due to cycle check in setParent — but fail loud
        throw new Error(
          `DepartmentEngine.ancestorChain: cycle detected at '${walker}' (corrupt state)`,
        );
      }
      seen.add(walker);
      chain.push(walker);
      walker = this.departments.get(walker)?.parent_code;
    }
    return Object.freeze(chain);
  }

  private requireDept(code: DepartmentCode): Department {
    const d = this.departments.get(code);
    if (!d) {
      throw new Error(
        `DepartmentEngine: unknown department '${code}'`,
      );
    }
    return d;
  }

  private update(
    dept: Department,
    by_employee_id: string,
    operation: DepartmentAudit["operation"],
    detail: string,
    patch: Partial<Department>,
  ): Department {
    if (!by_employee_id) {
      throw new Error(
        "DepartmentEngine: by_employee_id required on every mutation (audit-trail)",
      );
    }
    const now = new Date().toISOString();
    const audit: DepartmentAudit = Object.freeze({
      at: now,
      by_employee_id,
      operation,
      detail,
    });
    const updated: Department = Object.freeze({
      ...dept,
      ...patch,
      updated_at: now,
      audit_trail: Object.freeze([...dept.audit_trail, audit]),
    });
    this.departments.set(dept.code, updated);
    return updated;
  }

  reset(): void {
    this.departments.clear();
    this.kpis.clear();
  }
}

export const departmentEngine = new DepartmentEngine();
