/**
 * RFQToOrderOrchestratorEngine — full lifecycle (rfq→draft→admin→send→accept→order),
 * rejection branches, expiry sweep, financial-invariant gate on line items.
 *
 * @milestone HOTEL/U-RFQ-TO-ORDER (2026-05-26, slot:hotel iter8 /goal Phase 3)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  rfqToOrderOrchestratorEngine,
  type RfqIntake,
  type QuoteDraft,
} from "../engines/RFQToOrderOrchestratorEngine.js";
import { aiProposalApprovalQueueEngine } from "../engines/AIProposalApprovalQueueEngine.js";
import { managerRegistryEngine } from "../engines/ManagerRegistryEngine.js";

function basicRfq(): RfqIntake {
  return {
    rfq_id: "RFQ-001",
    customer_id: "ALCOA",
    received_at: "2026-05-26T08:00:00.000Z",
    description: "Tungsten carbide die, 100 pcs, drawing TC-1042",
    required_by: "2026-06-25T17:00:00.000Z",
  };
}

function balancedDraft(): QuoteDraft {
  // 100 × $250.00 + 1 × $1500.00 = $26,500.00 = 2650000 cents
  return {
    line_items: [
      { description: "Tungsten die, op cost", qty: 100, unit_price_cents: 25000n },
      { description: "Setup + tooling NRE", qty: 1, unit_price_cents: 150000n },
    ],
    total_cents: 2650000n,
    lead_time_days: 21,
    valid_for_days: 30,
  };
}

describe("RFQToOrderOrchestratorEngine — lifecycle", () => {
  beforeEach(() => {
    rfqToOrderOrchestratorEngine.reset();
    aiProposalApprovalQueueEngine.reset();
    managerRegistryEngine.reset();
    managerRegistryEngine.register({
      employee_id: "ADMIN-001", rank: "admin", department_code: "office",
      reports_to_employee_id: null, by_employee_id: "ADMIN-001",
    });
  });

  it("HAPPY PATH: rfq → draft → admin_approved → sent → accepted → order_created", () => {
    const rec = rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: basicRfq(), received_by_subsystem: "CustomerPortalEngine",
    });
    expect(rec.status).toBe("rfq_received");
    const drafted = rfqToOrderOrchestratorEngine.draftQuote({
      record_id: rec.id,
      draft: balancedDraft(),
      explanation_ref: "EXPL-QUOTE-001",
      submitter_subsystem: "QuoteAutopilotEngine",
    });
    expect(drafted.status).toBe("quote_drafted");
    expect(drafted.ai_proposal_id).toMatch(/^AIPROP-/);
    expect(drafted.draft?.total_cents).toBe(2650000n);
    const approved = rfqToOrderOrchestratorEngine.markAdminApproved({
      record_id: rec.id, by_admin_employee_id: "ADMIN-001",
    });
    expect(approved.status).toBe("admin_approved");
    expect(approved.quote_id).toMatch(/^Q-\d{6}$/);
    const sent = rfqToOrderOrchestratorEngine.markSentToCustomer({
      record_id: rec.id, by_subsystem: "CustomerPortalEngine",
    });
    expect(sent.status).toBe("sent_to_customer");
    const orderCreated = rfqToOrderOrchestratorEngine.markCustomerAccepted({
      record_id: rec.id, by_subsystem: "CustomerPortalEngine",
    });
    expect(orderCreated.status).toBe("order_created");
    expect(orderCreated.order_id).toMatch(/^ORD-\d{6}$/);
    // History should have 7 entries: receive + draft + admin_approved + sent + accepted + order_created
    expect(orderCreated.status_history.length).toBeGreaterThanOrEqual(6);
  });

  it("ADMIN REJECT branch", () => {
    const rec = rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: basicRfq(), received_by_subsystem: "X",
    });
    rfqToOrderOrchestratorEngine.draftQuote({
      record_id: rec.id, draft: balancedDraft(),
      explanation_ref: "X", submitter_subsystem: "X",
    });
    const rejected = rfqToOrderOrchestratorEngine.markAdminRejected({
      record_id: rec.id, by_admin_employee_id: "ADMIN-001",
      reason: "margin too thin, revise",
    });
    expect(rejected.status).toBe("admin_rejected");
  });

  it("CUSTOMER REJECT branch", () => {
    const rec = rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: basicRfq(), received_by_subsystem: "X",
    });
    rfqToOrderOrchestratorEngine.draftQuote({
      record_id: rec.id, draft: balancedDraft(),
      explanation_ref: "X", submitter_subsystem: "X",
    });
    rfqToOrderOrchestratorEngine.markAdminApproved({ record_id: rec.id, by_admin_employee_id: "ADMIN-001" });
    rfqToOrderOrchestratorEngine.markSentToCustomer({ record_id: rec.id, by_subsystem: "X" });
    const rejected = rfqToOrderOrchestratorEngine.markCustomerRejected({
      record_id: rec.id, reason: "lead time too long",
    });
    expect(rejected.status).toBe("customer_rejected");
  });

  it("EXPIRY SWEEP: required_by passed without order_created → expired", () => {
    const rec = rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: basicRfq(), received_by_subsystem: "X",
    });
    const future = "2026-07-01T00:00:00.000Z"; // past required_by 2026-06-25
    const expired = rfqToOrderOrchestratorEngine.expireOverdue({ now_iso: future });
    expect(expired).toEqual([rec.id]);
    expect(rfqToOrderOrchestratorEngine.getRecord(rec.id).status).toBe("expired");
  });

  it("FINANCIAL INVARIANT: line items must sum to total_cents (R12)", () => {
    const rec = rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: basicRfq(), received_by_subsystem: "X",
    });
    expect(() =>
      rfqToOrderOrchestratorEngine.draftQuote({
        record_id: rec.id,
        draft: {
          line_items: [{ description: "x", qty: 10, unit_price_cents: 100n }],
          total_cents: 9999n, // wrong — should be 1000
          lead_time_days: 14, valid_for_days: 30,
        },
        explanation_ref: "X", submitter_subsystem: "X",
      }),
    ).toThrow(/financial invariant/);
  });

  it("REJECTS non-bigint total (PII-safe currency R12)", () => {
    const rec = rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: basicRfq(), received_by_subsystem: "X",
    });
    expect(() =>
      rfqToOrderOrchestratorEngine.draftQuote({
        record_id: rec.id,
        draft: {
          line_items: [{ description: "x", qty: 1, unit_price_cents: 100n }],
          total_cents: 100 as unknown as bigint,
          lead_time_days: 14, valid_for_days: 30,
        },
        explanation_ref: "X", submitter_subsystem: "X",
      }),
    ).toThrow(/bigint/);
  });

  it("REJECTS lifecycle violations (admin_approved before draft, etc.)", () => {
    const rec = rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: basicRfq(), received_by_subsystem: "X",
    });
    expect(() =>
      rfqToOrderOrchestratorEngine.markAdminApproved({
        record_id: rec.id, by_admin_employee_id: "ADMIN-001",
      }),
    ).toThrow(/quote_drafted/);
    expect(() =>
      rfqToOrderOrchestratorEngine.markSentToCustomer({
        record_id: rec.id, by_subsystem: "X",
      }),
    ).toThrow(/admin_approved/);
  });

  it("REJECTS missing/invalid RFQ fields (R12)", () => {
    expect(() =>
      rfqToOrderOrchestratorEngine.receiveRfq({
        rfq: { ...basicRfq(), required_by: "not-a-date" },
        received_by_subsystem: "X",
      }),
    ).toThrow(/required_by/);
    expect(() =>
      rfqToOrderOrchestratorEngine.receiveRfq({
        rfq: { ...basicRfq(), customer_id: "" },
        received_by_subsystem: "X",
      }),
    ).toThrow(/customer_id/);
  });

  it("REJECTS adversarial NaN qty / negative price (R12)", () => {
    const rec = rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: basicRfq(), received_by_subsystem: "X",
    });
    expect(() =>
      rfqToOrderOrchestratorEngine.draftQuote({
        record_id: rec.id,
        draft: {
          line_items: [{ description: "x", qty: NaN, unit_price_cents: 100n }],
          total_cents: 0n, lead_time_days: 1, valid_for_days: 1,
        },
        explanation_ref: "X", submitter_subsystem: "X",
      }),
    ).toThrow(/qty must be > 0/);
    expect(() =>
      rfqToOrderOrchestratorEngine.draftQuote({
        record_id: rec.id,
        draft: {
          line_items: [{ description: "x", qty: 1, unit_price_cents: -1n }],
          total_cents: 0n, lead_time_days: 1, valid_for_days: 1,
        },
        explanation_ref: "X", submitter_subsystem: "X",
      }),
    ).toThrow(/unit_price_cents/);
  });

  it("listRecords filters by customer + status", () => {
    rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: { ...basicRfq(), rfq_id: "R-1", customer_id: "ALCOA" },
      received_by_subsystem: "X",
    });
    rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: { ...basicRfq(), rfq_id: "R-2", customer_id: "OPTIMAS" },
      received_by_subsystem: "X",
    });
    expect(rfqToOrderOrchestratorEngine.listRecords({ customer_id: "ALCOA" }).length).toBe(1);
    expect(rfqToOrderOrchestratorEngine.listRecords({ status: "rfq_received" }).length).toBe(2);
  });

  it("PSN roost: edges_out to AIProposal+OrderManager+CustomerPortal", () => {
    const r = rfqToOrderOrchestratorEngine.systemVizRoost();
    expect(r.layer).toBe(7);
    expect(r.psn_legs).toEqual([7, 11]);
    expect(r.edges_out).toContain("AIProposalApprovalQueueEngine");
    expect(r.edges_out).toContain("OrderManagerEngine");
    expect(r.edges_out).toContain("CustomerPortalEngine");
  });
});
