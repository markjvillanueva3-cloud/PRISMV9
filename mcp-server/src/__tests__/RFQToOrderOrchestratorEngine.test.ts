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

describe("RFQToOrderOrchestratorEngine -- inbox triage facet (U-HOTEL-RFQ-ASSIGN, gap #2)", () => {
  beforeEach(() => {
    rfqToOrderOrchestratorEngine.reset();
  });

  function seed() {
    return rfqToOrderOrchestratorEngine.receiveRfq({
      rfq: basicRfq(), received_by_subsystem: "CustomerPortalEngine",
    });
  }

  it("assign() sets assignee_id + assignee_name without touching the FSM status", () => {
    const rec = seed();
    expect(rec.status).toBe("rfq_received");
    expect(rec.assignee_id).toBeUndefined();
    const updated = rfqToOrderOrchestratorEngine.assign({
      record_id: rec.id, assignee_id: "EMP-007", assignee_name: "Jane Estimator",
    });
    expect(updated.assignee_id).toBe("EMP-007");
    expect(updated.assignee_name).toBe("Jane Estimator");
    // INVARIANT: the order FSM status is untouched by an inbox-triage assignment.
    expect(updated.status).toBe("rfq_received");
  });

  it("assign() throws on an empty assignee_id (fail-loud, not silent)", () => {
    const rec = seed();
    expect(() => rfqToOrderOrchestratorEngine.assign({ record_id: rec.id, assignee_id: "" }))
      .toThrow(/assignee_id required/);
  });

  it("assign() throws on an unknown record_id", () => {
    expect(() => rfqToOrderOrchestratorEngine.assign({ record_id: "NOPE", assignee_id: "EMP-1" }))
      .toThrow();
  });

  it("updateInboxStatus() sets inbox_status (received/reviewing/quoted/won/lost) distinct from FSM status", () => {
    const rec = seed();
    const r1 = rfqToOrderOrchestratorEngine.updateInboxStatus({ record_id: rec.id, inbox_status: "reviewing" });
    expect(r1.inbox_status).toBe("reviewing");
    expect(r1.status).toBe("rfq_received"); // FSM unchanged
    const r2 = rfqToOrderOrchestratorEngine.updateInboxStatus({ record_id: rec.id, inbox_status: "quoted" });
    expect(r2.inbox_status).toBe("quoted");
    expect(r2.status).toBe("rfq_received");
  });

  it("updateInboxStatus() throws on an invalid inbox_status (guards the triage vocabulary)", () => {
    const rec = seed();
    expect(() => rfqToOrderOrchestratorEngine.updateInboxStatus({
      record_id: rec.id, inbox_status: "bogus" as any,
    })).toThrow(/invalid inbox_status/);
  });

  it("updateInboxStatus() throws on an unknown record_id", () => {
    expect(() => rfqToOrderOrchestratorEngine.updateInboxStatus({
      record_id: "NOPE", inbox_status: "reviewing",
    })).toThrow();
  });

  it("assign + updateInboxStatus persist and are reflected in listRecords (the inbox round-trip)", () => {
    const rec = seed();
    rfqToOrderOrchestratorEngine.assign({ record_id: rec.id, assignee_id: "EMP-007", assignee_name: "Jane" });
    rfqToOrderOrchestratorEngine.updateInboxStatus({ record_id: rec.id, inbox_status: "reviewing" });
    const list = rfqToOrderOrchestratorEngine.listRecords({});
    const found = list.find((r) => r.id === rec.id);
    expect(found).toBeDefined();
    expect(found?.assignee_id).toBe("EMP-007");
    expect(found?.assignee_name).toBe("Jane");
    expect(found?.inbox_status).toBe("reviewing");
    expect(found?.status).toBe("rfq_received"); // FSM still clean after triage ops
  });
  it("listRecords filters by inbox_status (triage facet) without touching the FSM status filter", () => {
    const a = seed();
    rfqToOrderOrchestratorEngine.updateInboxStatus({ record_id: a.id, inbox_status: "reviewing" });
    const b = rfqToOrderOrchestratorEngine.receiveRfq({ rfq: { ...basicRfq(), rfq_id: "RFQ-002" }, received_by_subsystem: "P" });
    // b stays default (no inbox_status set) -> treated as 'received'
    const reviewing = rfqToOrderOrchestratorEngine.listRecords({ inbox_status: "reviewing" });
    expect(reviewing.map((r) => r.id)).toEqual([a.id]);
    const received = rfqToOrderOrchestratorEngine.listRecords({ inbox_status: "received" });
    expect(received.map((r) => r.id)).toEqual([b.id]);
  });

  it("listRecords throws on an invalid inbox_status filter (rejects FSM vocab in the inbox slot)", () => {
    expect(() => rfqToOrderOrchestratorEngine.listRecords({ inbox_status: "rfq_received" as any }))
      .toThrow(/invalid inbox_status filter/);
  });

  it("listRecords filters by assignee_id", () => {
    const a = seed();
    rfqToOrderOrchestratorEngine.assign({ record_id: a.id, assignee_id: "EMP-7" });
    rfqToOrderOrchestratorEngine.receiveRfq({ rfq: { ...basicRfq(), rfq_id: "RFQ-002" }, received_by_subsystem: "P" });
    const mine = rfqToOrderOrchestratorEngine.listRecords({ assignee_id: "EMP-7" });
    expect(mine.map((r) => r.id)).toEqual([a.id]);
  });

  it("a name-less re-assign PRESERVES the prior assignee_name (does not wipe it)", () => {
    const rec = seed();
    rfqToOrderOrchestratorEngine.assign({ record_id: rec.id, assignee_id: "EMP-7", assignee_name: "Jane" });
    const re = rfqToOrderOrchestratorEngine.assign({ record_id: rec.id, assignee_id: "EMP-8" });
    expect(re.assignee_id).toBe("EMP-8");
    expect(re.assignee_name).toBe("Jane"); // preserved, not undefined
  });

});
