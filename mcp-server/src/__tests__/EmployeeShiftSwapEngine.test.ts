/**
 * EmployeeShiftSwapEngine.test.ts — HOTEL/U-EMPLOYEE-SHIFT-SWAP (iter22)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeeShiftSwapEngine } from "../engines/EmployeeShiftSwapEngine.js";

const ALPHA_SHIFT = {
  date: "2026-06-10",
  shift: "day" as const,
  machine_serial: "HAAS-VF2-001",
};
const BRAVO_SHIFT = {
  date: "2026-06-11",
  shift: "day" as const,
  machine_serial: "OKUMA-LATHE-001",
};

describe("EmployeeShiftSwapEngine", () => {
  beforeEach(() => employeeShiftSwapEngine.reset());

  describe("proposeSwap — happy path + R12 validation", () => {
    it("creates a proposed swap with frozen record", () => {
      const s = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-ALPHA",
        counterparty_employee_id: "EMP-BRAVO",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
        reason: "family event",
      });
      expect(s.id).toMatch(/^SWAP-\d{6}$/);
      expect(s.status).toBe("proposed");
      expect(s.reason).toBe("family event");
      expect(Object.isFrozen(s)).toBe(true);
    });

    it("R12 throws when requester == counterparty", () => {
      expect(() =>
        employeeShiftSwapEngine.proposeSwap({
          requester_employee_id: "EMP-SAME",
          counterparty_employee_id: "EMP-SAME",
          requester_shift: ALPHA_SHIFT,
          counterparty_shift: BRAVO_SHIFT,
        }),
      ).toThrow(/cannot swap with themselves/);
    });

    it("R12 throws on bad date in shift descriptor", () => {
      expect(() =>
        employeeShiftSwapEngine.proposeSwap({
          requester_employee_id: "EMP-A",
          counterparty_employee_id: "EMP-B",
          requester_shift: { ...ALPHA_SHIFT, date: "tomorrow" },
          counterparty_shift: BRAVO_SHIFT,
        }),
      ).toThrow(/date must be ISO YYYY-MM-DD/);
    });

    it("R12 throws on invalid shift kind", () => {
      expect(() =>
        employeeShiftSwapEngine.proposeSwap({
          requester_employee_id: "EMP-A",
          counterparty_employee_id: "EMP-B",
          requester_shift: { ...ALPHA_SHIFT, shift: "evening" as never },
          counterparty_shift: BRAVO_SHIFT,
        }),
      ).toThrow(/shift must be day\|swing\|night/);
    });

    it("R12 throws on missing machine_serial", () => {
      expect(() =>
        employeeShiftSwapEngine.proposeSwap({
          requester_employee_id: "EMP-A",
          counterparty_employee_id: "EMP-B",
          requester_shift: { ...ALPHA_SHIFT, machine_serial: "" },
          counterparty_shift: BRAVO_SHIFT,
        }),
      ).toThrow(/machine_serial required/);
    });
  });

  describe("Lifecycle: propose → counterparty accept → manager approve → execute", () => {
    function seedQualified(): ReturnType<typeof employeeShiftSwapEngine.proposeSwap> {
      employeeShiftSwapEngine.registerMachineQualification({
        machine_serial: "HAAS-VF2-001",
        required_course_ids: ["course-0a"],
      });
      employeeShiftSwapEngine.registerMachineQualification({
        machine_serial: "OKUMA-LATHE-001",
        required_course_ids: ["course-5"],
      });
      // ALPHA is qualified for both, BRAVO is qualified for both
      employeeShiftSwapEngine.registerCoursePassed({ employee_id: "EMP-ALPHA", course_id: "course-0a" });
      employeeShiftSwapEngine.registerCoursePassed({ employee_id: "EMP-ALPHA", course_id: "course-5" });
      employeeShiftSwapEngine.registerCoursePassed({ employee_id: "EMP-BRAVO", course_id: "course-0a" });
      employeeShiftSwapEngine.registerCoursePassed({ employee_id: "EMP-BRAVO", course_id: "course-5" });
      return employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-ALPHA",
        counterparty_employee_id: "EMP-BRAVO",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
      });
    }

    it("full happy path through executed", () => {
      const s0 = seedQualified();
      const s1 = employeeShiftSwapEngine.counterpartyRespond({ swap_id: s0.id, accept: true });
      expect(s1.status).toBe("counterparty_accepted");
      expect(s1.counterparty_decision_at).not.toBeNull();

      const s2 = employeeShiftSwapEngine.managerApprove({
        swap_id: s0.id,
        manager_employee_id: "EMP-MGR",
        approve: true,
      });
      expect(s2.status).toBe("manager_approved");
      expect(s2.manager_employee_id).toBe("EMP-MGR");

      const s3 = employeeShiftSwapEngine.markExecuted({ swap_id: s0.id });
      expect(s3.status).toBe("executed");
      expect(s3.executed_at).not.toBeNull();
    });

    it("counterparty rejection ends lifecycle", () => {
      const s0 = seedQualified();
      const s1 = employeeShiftSwapEngine.counterpartyRespond({
        swap_id: s0.id,
        accept: false,
        reason: "kid's birthday",
      });
      expect(s1.status).toBe("counterparty_rejected");
      expect(s1.rejection_reason).toBe("kid's birthday");
      // Cannot proceed to manager approve
      expect(() =>
        employeeShiftSwapEngine.managerApprove({
          swap_id: s0.id,
          manager_employee_id: "EMP-MGR",
          approve: true,
        }),
      ).toThrow(/must be 'counterparty_accepted'/);
    });

    it("manager rejection ends lifecycle even after counterparty accepted", () => {
      const s0 = seedQualified();
      employeeShiftSwapEngine.counterpartyRespond({ swap_id: s0.id, accept: true });
      const s2 = employeeShiftSwapEngine.managerApprove({
        swap_id: s0.id,
        manager_employee_id: "EMP-MGR",
        approve: false,
        reason: "production crunch — need senior on lathe",
      });
      expect(s2.status).toBe("manager_rejected");
      expect(s2.rejection_reason).toContain("production crunch");
    });
  });

  describe("Qualification gate — auto-reject when counterparty unqualified", () => {
    it("auto-rejects when BRAVO missing required course for ALPHA's machine", () => {
      employeeShiftSwapEngine.registerMachineQualification({
        machine_serial: "FIVE-AX-001",
        required_course_ids: ["course-8", "course-32"],
      });
      employeeShiftSwapEngine.registerMachineQualification({
        machine_serial: "HAAS-VF2-001",
        required_course_ids: ["course-0a"],
      });
      // ALPHA has 5-axis quals, BRAVO does NOT
      employeeShiftSwapEngine.registerCoursePassed({ employee_id: "EMP-ALPHA", course_id: "course-8" });
      employeeShiftSwapEngine.registerCoursePassed({ employee_id: "EMP-ALPHA", course_id: "course-32" });
      employeeShiftSwapEngine.registerCoursePassed({ employee_id: "EMP-ALPHA", course_id: "course-0a" });
      employeeShiftSwapEngine.registerCoursePassed({ employee_id: "EMP-BRAVO", course_id: "course-0a" });
      // ALPHA wants to swap their FIVE-AX shift to give BRAVO their HAAS shift
      const s0 = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-ALPHA",
        counterparty_employee_id: "EMP-BRAVO",
        requester_shift: { date: "2026-06-10", shift: "day", machine_serial: "FIVE-AX-001" },
        counterparty_shift: { date: "2026-06-11", shift: "day", machine_serial: "HAAS-VF2-001" },
      });
      employeeShiftSwapEngine.counterpartyRespond({ swap_id: s0.id, accept: true });
      const s2 = employeeShiftSwapEngine.managerApprove({
        swap_id: s0.id,
        manager_employee_id: "EMP-MGR",
        approve: true,
      });
      expect(s2.status).toBe("manager_rejected");
      expect(s2.rejection_reason).toContain("qualification gap");
      expect(s2.rejection_reason).toContain("EMP-BRAVO");
      expect(s2.rejection_reason).toContain("course-8");
      expect(s2.rejection_reason).toContain("course-32");
    });

    it("manager cannot be a swap participant (SoD)", () => {
      const s0 = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-ALPHA",
        counterparty_employee_id: "EMP-BRAVO",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
      });
      employeeShiftSwapEngine.counterpartyRespond({ swap_id: s0.id, accept: true });
      expect(() =>
        employeeShiftSwapEngine.managerApprove({
          swap_id: s0.id,
          manager_employee_id: "EMP-ALPHA",
          approve: true,
        }),
      ).toThrow(/manager cannot be a swap participant/);
    });
  });

  describe("cancel() — only requester, only while proposed", () => {
    it("requester cancels a proposed swap", () => {
      const s0 = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-ALPHA",
        counterparty_employee_id: "EMP-BRAVO",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
      });
      const cancelled = employeeShiftSwapEngine.cancel({
        swap_id: s0.id,
        canceller_employee_id: "EMP-ALPHA",
      });
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.cancelled_at).not.toBeNull();
    });

    it("R12 — non-requester cannot cancel", () => {
      const s0 = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-ALPHA",
        counterparty_employee_id: "EMP-BRAVO",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
      });
      expect(() =>
        employeeShiftSwapEngine.cancel({ swap_id: s0.id, canceller_employee_id: "EMP-BRAVO" }),
      ).toThrow(/only the requester can cancel/);
    });

    it("R12 — cannot cancel an already-accepted swap", () => {
      const s0 = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-ALPHA",
        counterparty_employee_id: "EMP-BRAVO",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
      });
      employeeShiftSwapEngine.counterpartyRespond({ swap_id: s0.id, accept: true });
      expect(() =>
        employeeShiftSwapEngine.cancel({ swap_id: s0.id, canceller_employee_id: "EMP-ALPHA" }),
      ).toThrow(/must be 'proposed'/);
    });
  });

  describe("listSwaps — query surface", () => {
    it("filters by employee_id (matches requester OR counterparty)", () => {
      const sA = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-A",
        counterparty_employee_id: "EMP-B",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
      });
      employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-C",
        counterparty_employee_id: "EMP-D",
        requester_shift: { ...ALPHA_SHIFT, date: "2026-06-12" },
        counterparty_shift: { ...BRAVO_SHIFT, date: "2026-06-13" },
      });
      const bResult = employeeShiftSwapEngine.listSwaps({ employee_id: "EMP-B" });
      expect(bResult).toHaveLength(1);
      expect(bResult[0].id).toBe(sA.id);
    });

    it("filters by status", () => {
      const s0 = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-A",
        counterparty_employee_id: "EMP-B",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
      });
      employeeShiftSwapEngine.counterpartyRespond({ swap_id: s0.id, accept: false });
      const rejected = employeeShiftSwapEngine.listSwaps({ status: "counterparty_rejected" });
      expect(rejected).toHaveLength(1);
      const proposed = employeeShiftSwapEngine.listSwaps({ status: "proposed" });
      expect(proposed).toHaveLength(0);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned swap + nested shift descriptors are frozen", () => {
      const s = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-A",
        counterparty_employee_id: "EMP-B",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
      });
      expect(Object.isFrozen(s)).toBe(true);
      expect(Object.isFrozen(s.requester_shift)).toBe(true);
      expect(Object.isFrozen(s.counterparty_shift)).toBe(true);
    });

    it("PII-free — no name/SSN/DOB in any returned shape", () => {
      const s = employeeShiftSwapEngine.proposeSwap({
        requester_employee_id: "EMP-A",
        counterparty_employee_id: "EMP-B",
        requester_shift: ALPHA_SHIFT,
        counterparty_shift: BRAVO_SHIFT,
      });
      const keys = Object.keys(s);
      expect(keys).not.toContain("requester_name");
      expect(keys).not.toContain("counterparty_name");
      expect(keys).not.toContain("ssn");
    });
  });
});
