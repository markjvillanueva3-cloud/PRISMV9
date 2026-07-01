/**
 * LOTOLogEngine.test.ts — HOTEL/U-LOTO-LOG (iter12)
 *
 * OSHA 29 CFR 1910.147 chain-of-custody validator.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { lotoLogEngine, type LOTOState } from "../engines/LOTOLogEngine.js";

const FULL_SEQUENCE: LOTOState[] = [
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
];

describe("LOTOLogEngine", () => {
  beforeEach(() => lotoLogEngine.reset());

  describe("initiate", () => {
    it("creates event in 'identified' state with initial transition", () => {
      const e = lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "EMP-MV" });
      expect(e.current_state).toBe("identified");
      expect(e.machine_id).toBe("VMC-001");
      expect(e.authorized_employees).toEqual(["EMP-MV"]);
      expect(e.transitions).toHaveLength(1);
      expect(e.transitions[0].to_state).toBe("identified");
      expect(e.closed_at).toBeNull();
    });

    it("R12 throws on missing machine_id", () => {
      expect(() =>
        lotoLogEngine.initiate({ machine_id: "", authorized_employee_id: "EMP-MV" }),
      ).toThrow(/machine_id \+ authorized_employee_id required/);
    });

    it("R12 throws on missing employee_id", () => {
      expect(() =>
        lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "" }),
      ).toThrow(/machine_id \+ authorized_employee_id required/);
    });
  });

  describe("transition — full OSHA control sequence", () => {
    it("advances through identified → isolated → … → closed (10 transitions)", () => {
      const e0 = lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "EMP-MV" });
      let evt = e0;
      for (const next of FULL_SEQUENCE) {
        evt = lotoLogEngine.transition({
          loto_event_id: evt.id,
          to_state: next,
          authorized_employee_id: "EMP-MV",
          ...(next === "locked_out" && { device_serial: "DEV-001" }),
        });
      }
      expect(evt.current_state).toBe("closed");
      expect(evt.closed_at).not.toBeNull();
      // 1 initial + 10 sequence = 11 transitions
      expect(evt.transitions).toHaveLength(11);
      expect(evt.devices_applied).toContain("DEV-001");
    });

    it("forbidden transition throws (e.g. identified → tagged without intermediate)", () => {
      const e = lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "EMP-MV" });
      expect(() =>
        lotoLogEngine.transition({
          loto_event_id: e.id,
          to_state: "tagged",
          authorized_employee_id: "EMP-MV",
        }),
      ).toThrow(/forbidden transition/);
    });

    it("forbidden skip throws (e.g. locked_out → energy_restored without verify)", () => {
      const e0 = lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "EMP-MV" });
      let evt = lotoLogEngine.transition({ loto_event_id: e0.id, to_state: "isolated", authorized_employee_id: "EMP-MV" });
      evt = lotoLogEngine.transition({ loto_event_id: evt.id, to_state: "locked_out", authorized_employee_id: "EMP-MV" });
      expect(() =>
        lotoLogEngine.transition({
          loto_event_id: evt.id,
          to_state: "energy_restored",
          authorized_employee_id: "EMP-MV",
        }),
      ).toThrow(/forbidden transition/);
    });

    it("unauthorized employee cannot transition", () => {
      const e = lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "EMP-MV" });
      expect(() =>
        lotoLogEngine.transition({
          loto_event_id: e.id,
          to_state: "isolated",
          authorized_employee_id: "EMP-XX",
        }),
      ).toThrow(/not authorized/);
    });

    it("transitions after closed are forbidden (terminal state)", () => {
      const e0 = lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "EMP-MV" });
      let evt = e0;
      for (const next of FULL_SEQUENCE) {
        evt = lotoLogEngine.transition({
          loto_event_id: evt.id,
          to_state: next,
          authorized_employee_id: "EMP-MV",
        });
      }
      expect(() =>
        lotoLogEngine.transition({
          loto_event_id: evt.id,
          to_state: "identified",
          authorized_employee_id: "EMP-MV",
        }),
      ).toThrow(/forbidden transition/);
    });
  });

  describe("addAuthorizedEmployee — group lockout per §1910.147(f)(3)", () => {
    it("adds an employee to the authorized list", () => {
      const e = lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "EMP-A" });
      const updated = lotoLogEngine.addAuthorizedEmployee({ loto_event_id: e.id, employee_id: "EMP-B" });
      expect(updated.authorized_employees).toEqual(["EMP-A", "EMP-B"]);
    });

    it("is idempotent — adding same employee twice doesn't duplicate", () => {
      const e = lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "EMP-A" });
      lotoLogEngine.addAuthorizedEmployee({ loto_event_id: e.id, employee_id: "EMP-B" });
      const evt = lotoLogEngine.addAuthorizedEmployee({ loto_event_id: e.id, employee_id: "EMP-B" });
      expect(evt.authorized_employees).toEqual(["EMP-A", "EMP-B"]);
    });

    it("multiple authorized employees can each transition (group lockout)", () => {
      const e0 = lotoLogEngine.initiate({ machine_id: "VMC-001", authorized_employee_id: "EMP-A" });
      lotoLogEngine.addAuthorizedEmployee({ loto_event_id: e0.id, employee_id: "EMP-B" });
      const e1 = lotoLogEngine.transition({ loto_event_id: e0.id, to_state: "isolated", authorized_employee_id: "EMP-A" });
      const e2 = lotoLogEngine.transition({ loto_event_id: e1.id, to_state: "locked_out", authorized_employee_id: "EMP-B" });
      expect(e2.current_state).toBe("locked_out");
    });
  });

  describe("listEvents + getEvent + audit", () => {
    it("listEvents filters by machine_id", () => {
      lotoLogEngine.initiate({ machine_id: "M-1", authorized_employee_id: "E" });
      lotoLogEngine.initiate({ machine_id: "M-2", authorized_employee_id: "E" });
      const list = lotoLogEngine.listEvents({ machine_id: "M-1" });
      expect(list).toHaveLength(1);
      expect(list[0].machine_id).toBe("M-1");
    });

    it("listEvents open_only excludes closed events", () => {
      const e0 = lotoLogEngine.initiate({ machine_id: "M", authorized_employee_id: "E" });
      let evt = e0;
      for (const next of FULL_SEQUENCE) {
        evt = lotoLogEngine.transition({ loto_event_id: evt.id, to_state: next, authorized_employee_id: "E" });
      }
      const open = lotoLogEngine.listEvents({ open_only: true });
      expect(open).toHaveLength(0);
    });

    it("audit returns full immutable transition chain", () => {
      const e = lotoLogEngine.initiate({ machine_id: "M", authorized_employee_id: "E" });
      lotoLogEngine.transition({ loto_event_id: e.id, to_state: "isolated", authorized_employee_id: "E" });
      const chain = lotoLogEngine.audit({ loto_event_id: e.id });
      expect(chain).toHaveLength(2);
      expect(Object.isFrozen(chain)).toBe(true);
      expect(Object.isFrozen(chain[0])).toBe(true);
    });

    it("getEvent returns null on unknown id", () => {
      expect(lotoLogEngine.getEvent("UNKNOWN")).toBeNull();
    });
  });

  describe("Hotel-soul invariants", () => {
    it("all returned events frozen", () => {
      const e = lotoLogEngine.initiate({ machine_id: "M", authorized_employee_id: "E" });
      expect(Object.isFrozen(e)).toBe(true);
      expect(Object.isFrozen(e.authorized_employees)).toBe(true);
      expect(Object.isFrozen(e.transitions)).toBe(true);
    });

    it("PII-free — only employee_id (string), no name/SSN/DOB", () => {
      const e = lotoLogEngine.initiate({ machine_id: "M", authorized_employee_id: "EMP-42" });
      const keys = Object.keys(e);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
    });
  });
});
