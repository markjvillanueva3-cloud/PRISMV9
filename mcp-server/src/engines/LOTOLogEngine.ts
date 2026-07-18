/**
 * LOTOLogEngine — Lockout/Tagout chain-of-custody per OSHA 29 CFR 1910.147.
 *
 * Mandates per OSHA Standard:
 *   1910.147(c)(4) — Energy control program with documented procedures
 *   1910.147(d)    — Application of energy controls (apply lockout → verify → de-energized)
 *   1910.147(e)    — Release from lockout (notify → remove devices → restore energy)
 *   1910.147(f)    — Additional requirements (group lockout, shift change, periodic inspection)
 *
 * State machine (per authorized employee + machine):
 *   identified → isolated → locked_out → tagged → verified_zero_energy → work_in_progress
 *     → ready_to_restore → notification_sent → devices_removed → energy_restored → closed
 *
 * Each transition is an immutable audit row with timestamp + employee_id + device_serial.
 * Group lockout (multiple authorized employees on same machine) supported.
 *
 * Hotel-soul invariants:
 *   - R12 fail-loud: forbidden transition / unknown machine / missing fields → throw
 *   - PII-free: employee_id string only
 *   - Object.frozen on every return
 *   - No silent state mutations — every transition is an explicit method call
 *   - Devices cannot be removed before verified_zero_energy
 *
 * @module LOTOLogEngine
 * @milestone HOTEL/U-LOTO-LOG (2026-05-25, slot:hotel iter12)
 */

// ─── Constants ────────────────────────────────────────────────
const LOTO_STATES = [
  "identified",
  "isolated",
  "locked_out",
  "tagged",
  "verified_zero_energy",
  "work_in_progress",
  "ready_to_restore",
  "notification_sent",
  "devices_removed",
  "energy_restored",
  "closed",
] as const;

export type LOTOState = (typeof LOTO_STATES)[number];

/** Valid forward transitions per OSHA §1910.147 control sequence. */
const VALID_TRANSITIONS: Record<LOTOState, LOTOState[]> = {
  identified: ["isolated"],
  isolated: ["locked_out"],
  locked_out: ["tagged"],
  tagged: ["verified_zero_energy"],
  verified_zero_energy: ["work_in_progress"],
  work_in_progress: ["ready_to_restore"],
  ready_to_restore: ["notification_sent"],
  notification_sent: ["devices_removed"],
  devices_removed: ["energy_restored"],
  energy_restored: ["closed"],
  closed: [],
};

// ─── Types ────────────────────────────────────────────────────

export interface LOTOTransition {
  id: string;
  loto_event_id: string;
  from_state: LOTOState | null;
  to_state: LOTOState;
  authorized_employee_id: string;
  device_serial: string | null;
  timestamp: string;
  notes?: string;
}

export interface LOTOEvent {
  id: string;
  machine_id: string;
  initiated_by_employee_id: string;
  initiated_at: string;
  current_state: LOTOState;
  authorized_employees: ReadonlyArray<string>;
  devices_applied: ReadonlyArray<string>;
  transitions: ReadonlyArray<LOTOTransition>;
  closed_at: string | null;
}

// ─── Engine ───────────────────────────────────────────────────

class LOTOLogEngine {
  private events: Map<string, LOTOEvent> = new Map();
  private nextEventId = 1;
  private nextTransId = 1;

  /**
   * Open a new LOTO event in `identified` state.
   * @throws on missing required fields
   */
  initiate(args: { machine_id: string; authorized_employee_id: string; notes?: string }): LOTOEvent {
    if (!args.machine_id || !args.authorized_employee_id) {
      throw new Error("LOTOLogEngine.initiate: machine_id + authorized_employee_id required");
    }
    const id = `LOTO-${String(this.nextEventId++).padStart(6, "0")}`;
    const ts = new Date().toISOString();
    const firstTrans: LOTOTransition = Object.freeze({
      id: `LT-${String(this.nextTransId++).padStart(6, "0")}`,
      loto_event_id: id,
      from_state: null,
      to_state: "identified",
      authorized_employee_id: args.authorized_employee_id,
      device_serial: null,
      timestamp: ts,
      ...(args.notes !== undefined && { notes: args.notes }),
    });
    const event: LOTOEvent = Object.freeze({
      id,
      machine_id: args.machine_id,
      initiated_by_employee_id: args.authorized_employee_id,
      initiated_at: ts,
      current_state: "identified",
      authorized_employees: Object.freeze([args.authorized_employee_id]),
      devices_applied: Object.freeze([]),
      transitions: Object.freeze([firstTrans]),
      closed_at: null,
    });
    this.events.set(id, event);
    return event;
  }

  /**
   * Add another authorized employee to the LOTO event (group lockout per §1910.147(f)(3)).
   */
  addAuthorizedEmployee(args: { loto_event_id: string; employee_id: string }): LOTOEvent {
    const evt = this.requireEvent(args.loto_event_id);
    if (!args.employee_id) {
      throw new Error("LOTOLogEngine.addAuthorizedEmployee: employee_id required");
    }
    if (evt.authorized_employees.includes(args.employee_id)) {
      return evt; // idempotent
    }
    const updated: LOTOEvent = Object.freeze({
      ...evt,
      authorized_employees: Object.freeze([...evt.authorized_employees, args.employee_id]),
    });
    this.events.set(evt.id, updated);
    return updated;
  }

  /**
   * Advance the LOTO event to the next state. Enforces the OSHA control sequence.
   * @throws on forbidden transition / unknown employee
   */
  transition(args: {
    loto_event_id: string;
    to_state: LOTOState;
    authorized_employee_id: string;
    device_serial?: string;
    notes?: string;
  }): LOTOEvent {
    const evt = this.requireEvent(args.loto_event_id);
    if (!args.authorized_employee_id) {
      throw new Error("LOTOLogEngine.transition: authorized_employee_id required");
    }
    if (!evt.authorized_employees.includes(args.authorized_employee_id)) {
      throw new Error(
        `LOTOLogEngine.transition: employee "${args.authorized_employee_id}" not authorized on LOTO event ${evt.id}`,
      );
    }
    const valid = VALID_TRANSITIONS[evt.current_state];
    if (!valid.includes(args.to_state)) {
      throw new Error(
        `LOTOLogEngine.transition: forbidden transition ${evt.current_state} → ${args.to_state} (valid: [${valid.join(", ")}])`,
      );
    }
    const ts = new Date().toISOString();
    const trans: LOTOTransition = Object.freeze({
      id: `LT-${String(this.nextTransId++).padStart(6, "0")}`,
      loto_event_id: evt.id,
      from_state: evt.current_state,
      to_state: args.to_state,
      authorized_employee_id: args.authorized_employee_id,
      device_serial: args.device_serial ?? null,
      timestamp: ts,
      ...(args.notes !== undefined && { notes: args.notes }),
    });
    const devicesApplied =
      args.to_state === "locked_out" && args.device_serial
        ? [...evt.devices_applied, args.device_serial]
        : [...evt.devices_applied];
    const updated: LOTOEvent = Object.freeze({
      ...evt,
      current_state: args.to_state,
      devices_applied: Object.freeze(devicesApplied),
      transitions: Object.freeze([...evt.transitions, trans]),
      closed_at: args.to_state === "closed" ? ts : evt.closed_at,
    });
    this.events.set(evt.id, updated);
    return updated;
  }

  /** Get an event by id. Returns null if unknown. */
  getEvent(id: string): LOTOEvent | null {
    return this.events.get(id) ?? null;
  }

  /** List events filtered by machine / state / open-vs-closed. */
  listEvents(filter?: { machine_id?: string; state?: LOTOState; open_only?: boolean }): ReadonlyArray<LOTOEvent> {
    let out = [...this.events.values()];
    if (filter?.machine_id) out = out.filter((e) => e.machine_id === filter.machine_id);
    if (filter?.state) out = out.filter((e) => e.current_state === filter.state);
    if (filter?.open_only) out = out.filter((e) => e.current_state !== "closed");
    return Object.freeze(out);
  }

  /** Full audit chain for an event. */
  audit(args: { loto_event_id: string }): ReadonlyArray<LOTOTransition> {
    const evt = this.requireEvent(args.loto_event_id);
    return evt.transitions;
  }

  /** Reset state — test-only. */
  reset(): void {
    this.events.clear();
    this.nextEventId = 1;
    this.nextTransId = 1;
  }

  // ─── Internals ──────────────────────────────────────────────

  private requireEvent(id: string): LOTOEvent {
    const e = this.events.get(id);
    if (!e) throw new Error(`LOTOLogEngine: unknown LOTO event id "${id}"`);
    return e;
  }
}

export const lotoLogEngine = new LOTOLogEngine();
