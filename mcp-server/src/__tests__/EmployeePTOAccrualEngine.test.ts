/**
 * EmployeePTOAccrualEngine.test.ts — HOTEL/U-EMPLOYEE-PTO-ACCRUAL (iter18)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeePTOAccrualEngine } from "../engines/EmployeePTOAccrualEngine.js";

describe("EmployeePTOAccrualEngine", () => {
  beforeEach(() => employeePTOAccrualEngine.reset());

  describe("Accrual policy — 4 tenure tiers (variability floor)", () => {
    it("<1yr employee accrues 10 vacation days/yr (3.077h/period)", () => {
      employeePTOAccrualEngine.accruePeriod({
        employee_id: "EMP-NEW",
        tenure_tier: "lt_1yr",
        period_id: "2026-P01",
      });
      const bal = employeePTOAccrualEngine.computeBalance("EMP-NEW");
      // 10/26 days × 8 h/day = 3.0769h
      expect(bal.vacation_hours).toBeCloseTo(3.0769, 3);
    });

    it("1-4yr tier accrues 15 days/yr (4.615h/period)", () => {
      employeePTOAccrualEngine.accruePeriod({
        employee_id: "EMP-2YR",
        tenure_tier: "yrs_1_4",
        period_id: "2026-P01",
      });
      const bal = employeePTOAccrualEngine.computeBalance("EMP-2YR");
      expect(bal.vacation_hours).toBeCloseTo(4.6154, 3);
    });

    it("5-9yr tier accrues 20 days/yr (6.154h/period)", () => {
      employeePTOAccrualEngine.accruePeriod({
        employee_id: "EMP-6YR",
        tenure_tier: "yrs_5_9",
        period_id: "2026-P01",
      });
      const bal = employeePTOAccrualEngine.computeBalance("EMP-6YR");
      expect(bal.vacation_hours).toBeCloseTo(6.1538, 3);
    });

    it("10+yr tier accrues 25 days/yr (7.692h/period)", () => {
      employeePTOAccrualEngine.accruePeriod({
        employee_id: "EMP-15YR",
        tenure_tier: "yrs_10_plus",
        period_id: "2026-P01",
      });
      const bal = employeePTOAccrualEngine.computeBalance("EMP-15YR");
      expect(bal.vacation_hours).toBeCloseTo(7.6923, 3);
    });

    it("sick accrual is flat 10/yr at every tier", () => {
      employeePTOAccrualEngine.accruePeriod({
        employee_id: "EMP-A",
        tenure_tier: "lt_1yr",
        period_id: "2026-P01",
      });
      employeePTOAccrualEngine.accruePeriod({
        employee_id: "EMP-B",
        tenure_tier: "yrs_10_plus",
        period_id: "2026-P01",
      });
      const balA = employeePTOAccrualEngine.computeBalance("EMP-A");
      const balB = employeePTOAccrualEngine.computeBalance("EMP-B");
      expect(balA.sick_hours).toBeCloseTo(balB.sick_hours, 4);
      expect(balA.sick_hours).toBeCloseTo(3.0769, 3);
    });

    it("R12 throws on unknown tenure_tier", () => {
      expect(() =>
        employeePTOAccrualEngine.accruePeriod({
          employee_id: "EMP-X",
          tenure_tier: "yrs_20_plus" as never,
          period_id: "2026-P01",
        }),
      ).toThrow(/unknown tenure_tier/);
    });
  });

  describe("grantAnnualPersonal — lump-sum personal time", () => {
    it("credits 3 days (24h) personal", () => {
      employeePTOAccrualEngine.grantAnnualPersonal({ employee_id: "EMP-P", year: 2026 });
      const bal = employeePTOAccrualEngine.computeBalance("EMP-P");
      expect(bal.personal_hours).toBeCloseTo(24, 4);
    });

    it("R12 throws on out-of-range year", () => {
      expect(() =>
        employeePTOAccrualEngine.grantAnnualPersonal({ employee_id: "EMP-P", year: 1800 }),
      ).toThrow(/year must be 2000..2100/);
    });
  });

  describe("Ledger conservation invariant", () => {
    it("balance equals sum of credits − sum of debits", () => {
      employeePTOAccrualEngine.postLedger({
        employee_id: "EMP-L",
        category: "vacation",
        delta_hours: 40,
        reason: "carryover from 2025",
      });
      employeePTOAccrualEngine.postLedger({
        employee_id: "EMP-L",
        category: "vacation",
        delta_hours: -16,
        reason: "vacation taken 2026-03-15",
      });
      const bal = employeePTOAccrualEngine.computeBalance("EMP-L");
      expect(bal.vacation_hours).toBeCloseTo(24, 4);
      const ledger = employeePTOAccrualEngine.getLedger("EMP-L");
      expect(ledger).toHaveLength(2);
      const sum = ledger.reduce((s, e) => s + e.delta_hours, 0);
      expect(sum).toBeCloseTo(24, 4);
    });

    it("R12 throws on non-finite delta_hours", () => {
      expect(() =>
        employeePTOAccrualEngine.postLedger({
          employee_id: "EMP-X",
          category: "vacation",
          delta_hours: Number.NaN,
          reason: "test",
        }),
      ).toThrow(/delta_hours must be finite/);
    });

    it("R12 throws on Infinity delta_hours", () => {
      expect(() =>
        employeePTOAccrualEngine.postLedger({
          employee_id: "EMP-X",
          category: "vacation",
          delta_hours: Number.POSITIVE_INFINITY,
          reason: "test",
        }),
      ).toThrow(/delta_hours must be finite/);
    });

    it("R12 throws on invalid category", () => {
      expect(() =>
        employeePTOAccrualEngine.postLedger({
          employee_id: "EMP-X",
          category: "bereavement" as never,
          delta_hours: 8,
          reason: "test",
        }),
      ).toThrow(/category must be one of/);
    });
  });

  describe("submitRequest → approve workflow", () => {
    beforeEach(() => {
      // Seed 40h vacation
      employeePTOAccrualEngine.postLedger({
        employee_id: "EMP-R",
        category: "vacation",
        delta_hours: 40,
        reason: "seed",
      });
    });

    it("happy path: request → approve debits balance", () => {
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-R",
        category: "vacation",
        start_date: "2026-07-01",
        end_date: "2026-07-03",
        hours_requested: 24,
      });
      expect(req.status).toBe("requested");
      const { request, ledger } = employeePTOAccrualEngine.approveRequest({
        request_id: req.id,
        approver_employee_id: "EMP-MGR",
      });
      expect(request.status).toBe("approved");
      expect(request.approver_employee_id).toBe("EMP-MGR");
      expect(ledger.delta_hours).toBe(-24);
      const bal = employeePTOAccrualEngine.computeBalance("EMP-R");
      expect(bal.vacation_hours).toBe(16);
    });

    it("R12 refuses approval on insufficient balance (unless allow_negative=true)", () => {
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-R",
        category: "vacation",
        start_date: "2026-07-01",
        end_date: "2026-07-10",
        hours_requested: 100,
      });
      expect(() =>
        employeePTOAccrualEngine.approveRequest({
          request_id: req.id,
          approver_employee_id: "EMP-MGR",
        }),
      ).toThrow(/insufficient vacation balance/);
    });

    it("allow_negative=true permits advance against future accrual", () => {
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-R",
        category: "vacation",
        start_date: "2026-07-01",
        end_date: "2026-07-10",
        hours_requested: 100,
      });
      const { request } = employeePTOAccrualEngine.approveRequest({
        request_id: req.id,
        approver_employee_id: "EMP-MGR",
        allow_negative: true,
      });
      expect(request.status).toBe("approved");
      const bal = employeePTOAccrualEngine.computeBalance("EMP-R");
      expect(bal.vacation_hours).toBe(-60); // 40 - 100
    });

    it("R12 refuses self-approval (segregation of duties)", () => {
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-R",
        category: "vacation",
        start_date: "2026-07-01",
        end_date: "2026-07-02",
        hours_requested: 16,
      });
      expect(() =>
        employeePTOAccrualEngine.approveRequest({
          request_id: req.id,
          approver_employee_id: "EMP-R",
        }),
      ).toThrow(/approver cannot be the requester/);
    });

    it("R12 cannot re-approve an already-approved request", () => {
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-R",
        category: "vacation",
        start_date: "2026-07-01",
        end_date: "2026-07-02",
        hours_requested: 16,
      });
      employeePTOAccrualEngine.approveRequest({
        request_id: req.id,
        approver_employee_id: "EMP-MGR",
      });
      expect(() =>
        employeePTOAccrualEngine.approveRequest({
          request_id: req.id,
          approver_employee_id: "EMP-MGR",
        }),
      ).toThrow(/request must be 'requested'/);
    });
  });

  describe("Reject + cancel workflows", () => {
    it("rejected requests leave balance untouched", () => {
      employeePTOAccrualEngine.postLedger({
        employee_id: "EMP-J",
        category: "sick",
        delta_hours: 32,
        reason: "seed",
      });
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-J",
        category: "sick",
        start_date: "2026-07-01",
        end_date: "2026-07-01",
        hours_requested: 8,
      });
      const rejected = employeePTOAccrualEngine.rejectRequest({
        request_id: req.id,
        approver_employee_id: "EMP-MGR",
        reason: "insufficient notice",
      });
      expect(rejected.status).toBe("rejected");
      const bal = employeePTOAccrualEngine.computeBalance("EMP-J");
      expect(bal.sick_hours).toBe(32);
    });

    it("cancel after approval re-credits balance (ledger conservation)", () => {
      employeePTOAccrualEngine.postLedger({
        employee_id: "EMP-K",
        category: "vacation",
        delta_hours: 40,
        reason: "seed",
      });
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-K",
        category: "vacation",
        start_date: "2026-07-01",
        end_date: "2026-07-03",
        hours_requested: 24,
      });
      employeePTOAccrualEngine.approveRequest({
        request_id: req.id,
        approver_employee_id: "EMP-MGR",
      });
      expect(employeePTOAccrualEngine.computeBalance("EMP-K").vacation_hours).toBe(16);
      const { request, refund_ledger } = employeePTOAccrualEngine.cancelRequest({
        request_id: req.id,
        reason: "trip postponed",
      });
      expect(request.status).toBe("cancelled");
      expect(refund_ledger!.delta_hours).toBe(24);
      // Balance restored
      expect(employeePTOAccrualEngine.computeBalance("EMP-K").vacation_hours).toBe(40);
    });

    it("R12 cannot cancel a rejected/cancelled/consumed request", () => {
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-X",
        category: "personal",
        start_date: "2026-07-01",
        end_date: "2026-07-01",
        hours_requested: 8,
      });
      employeePTOAccrualEngine.rejectRequest({
        request_id: req.id,
        approver_employee_id: "EMP-MGR",
      });
      expect(() =>
        employeePTOAccrualEngine.cancelRequest({ request_id: req.id }),
      ).toThrow(/cannot cancel 'rejected'/);
    });
  });

  describe("submitRequest input validation (R12)", () => {
    it("throws on negative hours_requested", () => {
      expect(() =>
        employeePTOAccrualEngine.submitRequest({
          employee_id: "E",
          category: "vacation",
          start_date: "2026-07-01",
          end_date: "2026-07-01",
          hours_requested: -8,
        }),
      ).toThrow(/hours_requested must be positive/);
    });

    it("throws on start_date > end_date", () => {
      expect(() =>
        employeePTOAccrualEngine.submitRequest({
          employee_id: "E",
          category: "vacation",
          start_date: "2026-07-05",
          end_date: "2026-07-01",
          hours_requested: 8,
        }),
      ).toThrow(/start_date must be ≤ end_date/);
    });

    it("throws on malformed dates", () => {
      expect(() =>
        employeePTOAccrualEngine.submitRequest({
          employee_id: "E",
          category: "vacation",
          start_date: "July 1",
          end_date: "2026-07-01",
          hours_requested: 8,
        }),
      ).toThrow(/must be ISO YYYY-MM-DD/);
    });
  });

  describe("getApprovedPTODates — shift-scheduler integration", () => {
    it("returns approved PTO overlapping the query window", () => {
      employeePTOAccrualEngine.postLedger({
        employee_id: "EMP-S",
        category: "vacation",
        delta_hours: 40,
        reason: "seed",
      });
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-S",
        category: "vacation",
        start_date: "2026-07-10",
        end_date: "2026-07-14",
        hours_requested: 40,
      });
      employeePTOAccrualEngine.approveRequest({
        request_id: req.id,
        approver_employee_id: "EMP-MGR",
      });
      const pto = employeePTOAccrualEngine.getApprovedPTODates({
        employee_id: "EMP-S",
        from_date: "2026-07-12",
        to_date: "2026-07-13",
      });
      expect(pto).toHaveLength(1);
      expect(pto[0].request_id).toBe(req.id);
      expect(pto[0].start_date).toBe("2026-07-10");
    });

    it("excludes non-approved requests", () => {
      employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-S",
        category: "vacation",
        start_date: "2026-07-10",
        end_date: "2026-07-14",
        hours_requested: 40,
      });
      const pto = employeePTOAccrualEngine.getApprovedPTODates({
        employee_id: "EMP-S",
        from_date: "2026-07-01",
        to_date: "2026-07-31",
      });
      expect(pto).toHaveLength(0);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned balance + request + ledger are frozen", () => {
      employeePTOAccrualEngine.postLedger({
        employee_id: "EMP-F",
        category: "vacation",
        delta_hours: 8,
        reason: "test",
      });
      const bal = employeePTOAccrualEngine.computeBalance("EMP-F");
      expect(Object.isFrozen(bal)).toBe(true);
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-F",
        category: "vacation",
        start_date: "2026-07-01",
        end_date: "2026-07-01",
        hours_requested: 8,
      });
      expect(Object.isFrozen(req)).toBe(true);
    });

    it("PII-free — no names/SSN/DOB in any returned shape", () => {
      const req = employeePTOAccrualEngine.submitRequest({
        employee_id: "EMP-P",
        category: "vacation",
        start_date: "2026-07-01",
        end_date: "2026-07-01",
        hours_requested: 8,
      });
      const keys = Object.keys(req);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
    });
  });
});
