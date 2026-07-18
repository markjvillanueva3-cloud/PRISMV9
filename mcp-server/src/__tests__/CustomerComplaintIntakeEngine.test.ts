/**
 * CustomerComplaintIntakeEngine.test.ts — HOTEL/U-CUSTOMER-COMPLAINT-INTAKE (iter24)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { customerComplaintIntakeEngine } from "../engines/CustomerComplaintIntakeEngine.js";

const BASE = {
  customer_id: "CUST-ALCOA-IND",
  customer_tier_score: 0.85, // anchor account
  channel: "phone" as const,
  description: "OD diameter 0.003 oversize on part PT-1234 lot 2026-Q2",
  received_by_employee_id: "EMP-CSR-01",
};

describe("CustomerComplaintIntakeEngine", () => {
  beforeEach(() => customerComplaintIntakeEngine.reset());

  describe("receiveComplaint — happy path + R12", () => {
    it("creates a received complaint with all fields", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint(BASE);
      expect(c.id).toMatch(/^CMP-\d{6}$/);
      expect(c.status).toBe("received");
      expect(c.customer_id).toBe("CUST-ALCOA-IND");
      expect(c.customer_tier_score).toBe(0.85);
      expect(Object.isFrozen(c)).toBe(true);
    });

    it("variability — accepts all 5 channels", () => {
      const channels: Array<"phone" | "email" | "portal" | "in_person" | "fax"> = [
        "phone", "email", "portal", "in_person", "fax",
      ];
      for (const ch of channels) {
        const c = customerComplaintIntakeEngine.receiveComplaint({ ...BASE, channel: ch });
        expect(c.channel).toBe(ch);
      }
    });

    it("R12 throws on missing customer_id", () => {
      expect(() =>
        customerComplaintIntakeEngine.receiveComplaint({ ...BASE, customer_id: "" }),
      ).toThrow(/customer_id required/);
    });

    it("R12 throws on out-of-range customer_tier_score", () => {
      expect(() =>
        customerComplaintIntakeEngine.receiveComplaint({ ...BASE, customer_tier_score: 1.5 }),
      ).toThrow(/customer_tier_score must be in/);
    });

    it("R12 throws on invalid channel", () => {
      expect(() =>
        customerComplaintIntakeEngine.receiveComplaint({ ...BASE, channel: "telegraph" as never }),
      ).toThrow(/invalid channel/);
    });

    it("R12 throws on short description", () => {
      expect(() =>
        customerComplaintIntakeEngine.receiveComplaint({ ...BASE, description: "bad" }),
      ).toThrow(/description \(≥5 chars\) required/);
    });
  });

  describe("Triage — keyword + tier classification", () => {
    it("safety keyword → critical regardless of tier", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint({
        ...BASE,
        customer_tier_score: 0.2, // cold lead
        description: "safety hazard reported on shipment",
      });
      const t = customerComplaintIntakeEngine.triage({ complaint_id: c.id });
      expect(t.triaged_severity).toBe("critical");
    });

    it("oversize keyword on anchor tier → critical (elevated from major)", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint({
        ...BASE,
        customer_tier_score: 0.9, // anchor
        description: "oversize OD on 4 parts",
      });
      const t = customerComplaintIntakeEngine.triage({ complaint_id: c.id });
      expect(t.triaged_severity).toBe("critical");
    });

    it("oversize keyword on cold tier → major (not elevated)", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint({
        ...BASE,
        customer_tier_score: 0.3,
        description: "oversize OD on 1 part",
      });
      const t = customerComplaintIntakeEngine.triage({ complaint_id: c.id });
      expect(t.triaged_severity).toBe("major");
    });

    it("cosmetic keyword → minor", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint({
        ...BASE,
        description: "cosmetic blemish on chrome plating",
      });
      const t = customerComplaintIntakeEngine.triage({ complaint_id: c.id });
      expect(t.triaged_severity).toBe("minor");
    });

    it("no keyword match → defaults to major (safer default)", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint({
        ...BASE,
        customer_tier_score: 0.5,
        description: "shipment arrived 2 days late",
      });
      const t = customerComplaintIntakeEngine.triage({ complaint_id: c.id });
      expect(t.triaged_severity).toBe("major");
    });

    it("override_severity bypasses classifier", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint(BASE);
      const t = customerComplaintIntakeEngine.triage({
        complaint_id: c.id,
        override_severity: "critical",
      });
      expect(t.triaged_severity).toBe("critical");
    });

    it("R12 — cannot triage twice", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint(BASE);
      customerComplaintIntakeEngine.triage({ complaint_id: c.id });
      expect(() =>
        customerComplaintIntakeEngine.triage({ complaint_id: c.id }),
      ).toThrow(/must be 'received'/);
    });
  });

  describe("NCR linkage + lifecycle close-out", () => {
    it("attachNCR transitions to ncr_created with ncr_id stored", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint(BASE);
      customerComplaintIntakeEngine.triage({ complaint_id: c.id });
      const linked = customerComplaintIntakeEngine.attachNCR({
        complaint_id: c.id,
        ncr_id: "NCR-000042",
      });
      expect(linked.status).toBe("ncr_created");
      expect(linked.ncr_id).toBe("NCR-000042");
    });

    it("R12 — attachNCR refuses untriaged complaint", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint(BASE);
      expect(() =>
        customerComplaintIntakeEngine.attachNCR({ complaint_id: c.id, ncr_id: "NCR-000001" }),
      ).toThrow(/must be 'triaged'/);
    });

    it("resolve → closeComplaint full lifecycle", () => {
      const c0 = customerComplaintIntakeEngine.receiveComplaint(BASE);
      customerComplaintIntakeEngine.triage({ complaint_id: c0.id });
      const resolved = customerComplaintIntakeEngine.resolve({
        complaint_id: c0.id,
        resolution_summary: "Replacement parts shipped 2026-06-15; customer satisfied",
      });
      expect(resolved.status).toBe("resolved");
      const closed = customerComplaintIntakeEngine.closeComplaint({ complaint_id: c0.id });
      expect(closed.status).toBe("closed");
      expect(closed.closed_at).not.toBeNull();
    });

    it("R12 — cannot close before resolve", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint(BASE);
      expect(() =>
        customerComplaintIntakeEngine.closeComplaint({ complaint_id: c.id }),
      ).toThrow(/must be 'resolved'/);
    });
  });

  describe("listComplaints — query surface", () => {
    it("filters by customer_id, status, severity", () => {
      const a = customerComplaintIntakeEngine.receiveComplaint({
        ...BASE,
        customer_id: "CUST-A",
        description: "safety issue here",
      });
      customerComplaintIntakeEngine.triage({ complaint_id: a.id });
      const b = customerComplaintIntakeEngine.receiveComplaint({
        ...BASE,
        customer_id: "CUST-B",
        description: "cosmetic blemish",
      });
      customerComplaintIntakeEngine.triage({ complaint_id: b.id });
      const critical = customerComplaintIntakeEngine.listComplaints({ severity: "critical" });
      expect(critical).toHaveLength(1);
      const custA = customerComplaintIntakeEngine.listComplaints({ customer_id: "CUST-A" });
      expect(custA).toHaveLength(1);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned complaint + nested arrays frozen", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint({
        ...BASE,
        affected_po_numbers: ["PO-001", "PO-002"],
      });
      expect(Object.isFrozen(c)).toBe(true);
      expect(Object.isFrozen(c.affected_po_numbers)).toBe(true);
    });

    it("PII-free — no customer name/email/phone in returned shape", () => {
      const c = customerComplaintIntakeEngine.receiveComplaint(BASE);
      const keys = Object.keys(c);
      expect(keys).not.toContain("customer_name");
      expect(keys).not.toContain("email");
      expect(keys).not.toContain("phone");
      expect(keys).not.toContain("contact_address");
    });
  });
});
