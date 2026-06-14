/**
 * EmployeeShiftSwapEngine — peer-to-peer shift swap workflow.
 *
 * Bridges EmployeeShiftScheduleEngine (iter17) with the manager dashboard
 * (iter21): worker A proposes to trade their shift with worker B's shift.
 * Both shifts must be on the same date or paired dates. Lifecycle:
 *
 *   proposed → counterparty_accepted → manager_approved → executed
 *   proposed → counterparty_rejected
 *   proposed → counterparty_accepted → manager_rejected
 *   proposed → cancelled  (by requester before anyone responds)
 *
 * Qualification check on approval: BOTH counterparties must be qualified to
 * operate the OTHER's machine. If either is missing a required course, the
 * swap is auto-rejected with the missing course IDs surfaced.
 *
 * Hotel-soul invariants: PII-free (employee_id only), Object.frozen returns,
 * R12 fail-loud, audit-trail on every state transition.
 *
 * @module EmployeeShiftSwapEngine
 * @milestone HOTEL/U-EMPLOYEE-SHIFT-SWAP (2026-05-25, slot:hotel iter22)
 */

export type SwapStatus =
  | "proposed"
  | "counterparty_accepted"
  | "counterparty_rejected"
  | "manager_approved"
  | "manager_rejected"
  | "executed"
  | "cancelled";

export interface ShiftDescriptor {
  date: string;             // YYYY-MM-DD
  shift: "day" | "swing" | "night";
  machine_serial: string;
}

export interface SwapRequest {
  id: string;
  requester_employee_id: string;
  counterparty_employee_id: string;
  requester_shift: ShiftDescriptor;
  counterparty_shift: ShiftDescriptor;
  status: SwapStatus;
  reason?: string;
  counterparty_decision_at?: string;
  manager_decision_at?: string;
  manager_employee_id?: string;
  executed_at?: string;
  cancelled_at?: string;
  rejection_reason?: string;
  created_at: string;
}

class EmployeeShiftSwapEngine {
  private swaps: Map<string, SwapRequest> = new Map();
  private machineQuals: Map<string, ReadonlyArray<string>> = new Map();
  private coursesPassed: Map<string, Set<string>> = new Map();
  private nextSwapId = 1;

  registerMachineQualification(args: { machine_serial: string; required_course_ids: string[] }): void {
    if (!args.machine_serial) {
      throw new Error("EmployeeShiftSwapEngine.registerMachineQualification: machine_serial required");
    }
    this.machineQuals.set(args.machine_serial, Object.freeze([...args.required_course_ids]));
  }

  registerCoursePassed(args: { employee_id: string; course_id: string }): void {
    if (!args.employee_id || !args.course_id) {
      throw new Error("EmployeeShiftSwapEngine.registerCoursePassed: employee_id + course_id required");
    }
    let set = this.coursesPassed.get(args.employee_id);
    if (!set) {
      set = new Set();
      this.coursesPassed.set(args.employee_id, set);
    }
    set.add(args.course_id);
  }

  proposeSwap(args: {
    requester_employee_id: string;
    counterparty_employee_id: string;
    requester_shift: ShiftDescriptor;
    counterparty_shift: ShiftDescriptor;
    reason?: string;
  }): SwapRequest {
    if (!args.requester_employee_id || !args.counterparty_employee_id) {
      throw new Error(
        "EmployeeShiftSwapEngine.proposeSwap: requester + counterparty employee_id required",
      );
    }
    if (args.requester_employee_id === args.counterparty_employee_id) {
      throw new Error("EmployeeShiftSwapEngine.proposeSwap: requester cannot swap with themselves");
    }
    this.validateShift(args.requester_shift, "requester_shift");
    this.validateShift(args.counterparty_shift, "counterparty_shift");
    const id = `SWAP-${String(this.nextSwapId++).padStart(6, "0")}`;
    const req: SwapRequest = Object.freeze({
      id,
      requester_employee_id: args.requester_employee_id,
      counterparty_employee_id: args.counterparty_employee_id,
      requester_shift: Object.freeze({ ...args.requester_shift }),
      counterparty_shift: Object.freeze({ ...args.counterparty_shift }),
      status: "proposed" as const,
      created_at: new Date().toISOString(),
      ...(args.reason !== undefined && { reason: args.reason }),
    });
    this.swaps.set(id, req);
    return req;
  }

  counterpartyRespond(args: {
    swap_id: string;
    accept: boolean;
    reason?: string;
  }): SwapRequest {
    const r = this.requireSwap(args.swap_id);
    if (r.status !== "proposed") {
      throw new Error(
        `EmployeeShiftSwapEngine.counterpartyRespond: swap must be 'proposed' (got '${r.status}')`,
      );
    }
    const updated: SwapRequest = Object.freeze({
      ...r,
      status: args.accept ? ("counterparty_accepted" as const) : ("counterparty_rejected" as const),
      counterparty_decision_at: new Date().toISOString(),
      ...(args.reason !== undefined && !args.accept && { rejection_reason: args.reason }),
    });
    this.swaps.set(r.id, updated);
    return updated;
  }

  managerApprove(args: {
    swap_id: string;
    manager_employee_id: string;
    approve: boolean;
    reason?: string;
  }): SwapRequest {
    const r = this.requireSwap(args.swap_id);
    if (r.status !== "counterparty_accepted") {
      throw new Error(
        `EmployeeShiftSwapEngine.managerApprove: swap must be 'counterparty_accepted' (got '${r.status}')`,
      );
    }
    if (!args.manager_employee_id) {
      throw new Error("EmployeeShiftSwapEngine.managerApprove: manager_employee_id required");
    }
    if (args.manager_employee_id === r.requester_employee_id ||
        args.manager_employee_id === r.counterparty_employee_id) {
      throw new Error(
        "EmployeeShiftSwapEngine.managerApprove: manager cannot be a swap participant (segregation of duties)",
      );
    }
    if (args.approve) {
      // Qualification gate: each counterparty must be qualified to operate the OTHER's machine
      const requesterMissing = this.missingCourses(
        r.requester_employee_id, r.counterparty_shift.machine_serial,
      );
      const counterpartyMissing = this.missingCourses(
        r.counterparty_employee_id, r.requester_shift.machine_serial,
      );
      if (requesterMissing.length > 0 || counterpartyMissing.length > 0) {
        const detail: string[] = [];
        if (requesterMissing.length > 0) {
          detail.push(`${r.requester_employee_id} missing for ${r.counterparty_shift.machine_serial}: ${requesterMissing.join(", ")}`);
        }
        if (counterpartyMissing.length > 0) {
          detail.push(`${r.counterparty_employee_id} missing for ${r.requester_shift.machine_serial}: ${counterpartyMissing.join(", ")}`);
        }
        const rejected: SwapRequest = Object.freeze({
          ...r,
          status: "manager_rejected" as const,
          manager_decision_at: new Date().toISOString(),
          manager_employee_id: args.manager_employee_id,
          rejection_reason: `qualification gap: ${detail.join("; ")}`,
        });
        this.swaps.set(r.id, rejected);
        return rejected;
      }
    }
    const updated: SwapRequest = Object.freeze({
      ...r,
      status: args.approve ? ("manager_approved" as const) : ("manager_rejected" as const),
      manager_decision_at: new Date().toISOString(),
      manager_employee_id: args.manager_employee_id,
      ...(args.reason !== undefined && !args.approve && { rejection_reason: args.reason }),
    });
    this.swaps.set(r.id, updated);
    return updated;
  }

  /** Mark a manager-approved swap as executed (after the shift-schedule engine has been updated). */
  markExecuted(args: { swap_id: string }): SwapRequest {
    const r = this.requireSwap(args.swap_id);
    if (r.status !== "manager_approved") {
      throw new Error(
        `EmployeeShiftSwapEngine.markExecuted: swap must be 'manager_approved' (got '${r.status}')`,
      );
    }
    const updated: SwapRequest = Object.freeze({
      ...r,
      status: "executed" as const,
      executed_at: new Date().toISOString(),
    });
    this.swaps.set(r.id, updated);
    return updated;
  }

  /** Cancel a not-yet-decided swap (only requester can cancel; only while proposed). */
  cancel(args: { swap_id: string; canceller_employee_id: string }): SwapRequest {
    const r = this.requireSwap(args.swap_id);
    if (r.status !== "proposed") {
      throw new Error(
        `EmployeeShiftSwapEngine.cancel: swap must be 'proposed' (got '${r.status}'). Use a separate rollback workflow for executed swaps.`,
      );
    }
    if (args.canceller_employee_id !== r.requester_employee_id) {
      throw new Error("EmployeeShiftSwapEngine.cancel: only the requester can cancel");
    }
    const updated: SwapRequest = Object.freeze({
      ...r,
      status: "cancelled" as const,
      cancelled_at: new Date().toISOString(),
    });
    this.swaps.set(r.id, updated);
    return updated;
  }

  listSwaps(args: { employee_id?: string; status?: SwapStatus }): ReadonlyArray<SwapRequest> {
    const out: SwapRequest[] = [];
    for (const r of this.swaps.values()) {
      if (args.employee_id &&
          r.requester_employee_id !== args.employee_id &&
          r.counterparty_employee_id !== args.employee_id) continue;
      if (args.status && r.status !== args.status) continue;
      out.push(Object.freeze({ ...r }));
    }
    return Object.freeze(out);
  }

  private missingCourses(employee_id: string, machine_serial: string): ReadonlyArray<string> {
    const required = this.machineQuals.get(machine_serial);
    if (!required) return Object.freeze([]); // no qualification record → assume open
    const passed = this.coursesPassed.get(employee_id) ?? new Set<string>();
    return Object.freeze(required.filter((c) => !passed.has(c)));
  }

  private requireSwap(id: string): SwapRequest {
    const r = this.swaps.get(id);
    if (!r) throw new Error(`EmployeeShiftSwapEngine: unknown swap_id "${id}"`);
    return r;
  }

  private validateShift(s: ShiftDescriptor, label: string): void {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) {
      throw new Error(`EmployeeShiftSwapEngine: ${label}.date must be ISO YYYY-MM-DD`);
    }
    if (!["day", "swing", "night"].includes(s.shift)) {
      throw new Error(`EmployeeShiftSwapEngine: ${label}.shift must be day|swing|night`);
    }
    if (!s.machine_serial) {
      throw new Error(`EmployeeShiftSwapEngine: ${label}.machine_serial required`);
    }
  }

  reset(): void {
    this.swaps.clear();
    this.machineQuals.clear();
    this.coursesPassed.clear();
    this.nextSwapId = 1;
  }
}

export const employeeShiftSwapEngine = new EmployeeShiftSwapEngine();
