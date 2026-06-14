import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";
import {
  MillCustomerOrderLifecycleEngine,
  MILL_ORDER_STATES,
  MILL_CANONICAL_STATES,
  type CreateMillOrderInput,
} from "../engines/MillCustomerOrderLifecycleEngine.js";

let tmpPath: string;
let eng: MillCustomerOrderLifecycleEngine;

function freshEngine(): MillCustomerOrderLifecycleEngine {
  tmpPath = join(tmpdir(), `mill-lifecycle-test-${Date.now()}-${Math.random()}.json`);
  return new MillCustomerOrderLifecycleEngine(tmpPath);
}

function nominalOrder(o: Partial<CreateMillOrderInput> = {}): CreateMillOrderInput {
  return {
    order_id: "ORD-001",
    customer: "JM_DIE",
    part_number: "PN-1234",
    quantity: 100,
    fixture_id: "FIX-001",
    fpa_feature_count: 8,
    ...o,
  };
}

describe("MillCustomerOrderLifecycleEngine", () => {
  beforeEach(() => {
    if (tmpPath && existsSync(tmpPath)) rmSync(tmpPath, { force: true });
    eng = freshEngine();
  });

  it("getStats: 17 states (14 lathe-shared + 3 mill-canonical), 1 terminal (closed)", () => {
    const s = eng.getStats();
    expect(s.state_count).toBe(17);
    expect(s.mill_canonical_states).toEqual([
      "fixture_prep", "first_piece_approval", "first_piece_rejected",
    ]);
    expect(s.terminal_states).toEqual(["closed"]);
    expect(s.reference).toMatch(/AS9102|ERP/);
  });

  it("MILL_ORDER_STATES contains all 3 canonical states", () => {
    for (const s of MILL_CANONICAL_STATES) {
      expect(MILL_ORDER_STATES).toContain(s);
    }
  });

  it("createOrder starts in 'draft' state with mill-canonical fixture_id + fpa_feature_count", () => {
    const o = eng.createOrder(nominalOrder());
    expect(o.state).toBe("draft");
    expect(o.fixture_id).toBe("FIX-001");
    expect(o.fpa_feature_count).toBe(8);
  });

  it("createOrder throws on duplicate order_id", () => {
    eng.createOrder(nominalOrder());
    expect(() => eng.createOrder(nominalOrder())).toThrow(/already exists/);
  });

  it("createOrder validates schema: empty order_id rejected", () => {
    expect(() => eng.createOrder(nominalOrder({ order_id: "" }))).toThrow();
  });

  it("createOrder writes audit event for creation", () => {
    eng.createOrder(nominalOrder({ order_id: "AUD-1" }));
    const audit = eng.getAuditLog("AUD-1");
    expect(audit.length).toBe(1);
    expect(audit[0].from_state).toBeNull();
    expect(audit[0].to_state).toBe("draft");
  });

  it("full happy-path walks all mill-canonical states: draft → quoted → accepted → scheduled → fixture_prep → first_piece_approval → in_production → shipped → invoiced → closed", () => {
    const path: Array<typeof MILL_ORDER_STATES[number]> = [
      "quoted", "accepted", "scheduled", "fixture_prep",
      "first_piece_approval", "in_production", "shipped",
      "invoiced", "closed",
    ];
    eng.createOrder(nominalOrder({ order_id: "WALK-1" }));
    for (const to_state of path) {
      const o = eng.transition({ order_id: "WALK-1", to_state, actor: "tester" });
      expect(o.state).toBe(to_state);
    }
    const audit = eng.getAuditLog("WALK-1");
    expect(audit.length).toBe(path.length + 1); // +1 for creation
  });

  it("FPA-reject loop: first_piece_approval → first_piece_rejected → fixture_prep (rework)", () => {
    eng.createOrder(nominalOrder({ order_id: "FPA-LOOP" }));
    eng.transition({ order_id: "FPA-LOOP", to_state: "quoted" });
    eng.transition({ order_id: "FPA-LOOP", to_state: "accepted" });
    eng.transition({ order_id: "FPA-LOOP", to_state: "scheduled" });
    eng.transition({ order_id: "FPA-LOOP", to_state: "fixture_prep" });
    eng.transition({ order_id: "FPA-LOOP", to_state: "first_piece_approval" });
    const rejected = eng.transition({ order_id: "FPA-LOOP", to_state: "first_piece_rejected" });
    expect(rejected.state).toBe("first_piece_rejected");
    // loop back to fixture_prep
    const reworking = eng.transition({ order_id: "FPA-LOOP", to_state: "fixture_prep" });
    expect(reworking.state).toBe("fixture_prep");
  });

  it("FPA-reject can ALSO loop back to first_piece_approval directly (re-attempt FPA without fixture rework)", () => {
    eng.createOrder(nominalOrder({ order_id: "FPA-RETRY" }));
    eng.transition({ order_id: "FPA-RETRY", to_state: "quoted" });
    eng.transition({ order_id: "FPA-RETRY", to_state: "accepted" });
    eng.transition({ order_id: "FPA-RETRY", to_state: "scheduled" });
    eng.transition({ order_id: "FPA-RETRY", to_state: "fixture_prep" });
    eng.transition({ order_id: "FPA-RETRY", to_state: "first_piece_approval" });
    eng.transition({ order_id: "FPA-RETRY", to_state: "first_piece_rejected" });
    const retry = eng.transition({ order_id: "FPA-RETRY", to_state: "first_piece_approval" });
    expect(retry.state).toBe("first_piece_approval");
  });

  it("invalid transition draft → in_production throws (must follow mill canonical path)", () => {
    eng.createOrder(nominalOrder({ order_id: "BAD-1" }));
    expect(() => eng.transition({ order_id: "BAD-1", to_state: "in_production" })).toThrow(/invalid transition/);
  });

  it("invalid transition: scheduled → in_production directly (must go through fixture_prep + FPA)", () => {
    eng.createOrder(nominalOrder({ order_id: "BAD-2" }));
    eng.transition({ order_id: "BAD-2", to_state: "quoted" });
    eng.transition({ order_id: "BAD-2", to_state: "accepted" });
    eng.transition({ order_id: "BAD-2", to_state: "scheduled" });
    expect(() => eng.transition({ order_id: "BAD-2", to_state: "in_production" })).toThrow(/invalid transition.*scheduled.*in_production/);
  });

  it("closed is terminal: no transitions allowed from closed", () => {
    eng.createOrder(nominalOrder({ order_id: "TERM" }));
    eng.transition({ order_id: "TERM", to_state: "cancelled" });
    eng.transition({ order_id: "TERM", to_state: "closed" });
    expect(() => eng.transition({ order_id: "TERM", to_state: "draft" })).toThrow(/invalid transition.*closed/);
    expect(eng.allowedTransitions("closed")).toEqual([]);
  });

  it("transition on missing order_id throws", () => {
    expect(() => eng.transition({ order_id: "MISSING", to_state: "quoted" })).toThrow(/not found/);
  });

  it("on_hold can return to fixture_prep / first_piece_approval / in_production (mill flexibility)", () => {
    expect(eng.allowedTransitions("on_hold")).toEqual(
      expect.arrayContaining(["scheduled", "fixture_prep", "first_piece_approval", "in_production", "cancelled"]),
    );
  });

  it("pipelineSummary counts orders by state", () => {
    eng.createOrder(nominalOrder({ order_id: "P1" }));
    eng.createOrder(nominalOrder({ order_id: "P2" }));
    eng.transition({ order_id: "P2", to_state: "quoted" });
    const sum = eng.pipelineSummary();
    expect(sum.draft).toBe(1);
    expect(sum.quoted).toBe(1);
    expect(sum.fixture_prep).toBe(0);
  });

  it("millCanonicalQueueDepth aggregates 3 canonical-state counts", () => {
    eng.createOrder(nominalOrder({ order_id: "Q1" }));
    eng.transition({ order_id: "Q1", to_state: "quoted" });
    eng.transition({ order_id: "Q1", to_state: "accepted" });
    eng.transition({ order_id: "Q1", to_state: "scheduled" });
    eng.transition({ order_id: "Q1", to_state: "fixture_prep" });

    eng.createOrder(nominalOrder({ order_id: "Q2" }));
    eng.transition({ order_id: "Q2", to_state: "quoted" });
    eng.transition({ order_id: "Q2", to_state: "accepted" });
    eng.transition({ order_id: "Q2", to_state: "scheduled" });
    eng.transition({ order_id: "Q2", to_state: "fixture_prep" });
    eng.transition({ order_id: "Q2", to_state: "first_piece_approval" });

    const depth = eng.millCanonicalQueueDepth();
    expect(depth.fixture_prep).toBe(1);
    expect(depth.first_piece_approval).toBe(1);
    expect(depth.first_piece_rejected).toBe(0);
    expect(depth.total).toBe(2);
  });

  it("listOrders filters by customer + state + fixture_id (mill-canonical)", () => {
    eng.createOrder(nominalOrder({ order_id: "L1", customer: "ACME", fixture_id: "FIX-A" }));
    eng.createOrder(nominalOrder({ order_id: "L2", customer: "ACME", fixture_id: "FIX-B" }));
    eng.createOrder(nominalOrder({ order_id: "L3", customer: "BETA", fixture_id: "FIX-A" }));
    expect(eng.listOrders({ customer: "ACME" }).length).toBe(2);
    expect(eng.listOrders({ fixture_id: "FIX-A" }).length).toBe(2);
    expect(eng.listOrders({ customer: "ACME", fixture_id: "FIX-A" }).length).toBe(1);
  });

  it("getAuditLog returns events in insertion order", () => {
    eng.createOrder(nominalOrder({ order_id: "AUD" }));
    eng.transition({ order_id: "AUD", to_state: "quoted", actor: "alice" });
    eng.transition({ order_id: "AUD", to_state: "accepted", actor: "bob", reason: "PO approved" });
    const log = eng.getAuditLog("AUD");
    expect(log.length).toBe(3);
    expect(log[0].to_state).toBe("draft");
    expect(log[1].actor).toBe("alice");
    expect(log[2].reason).toBe("PO approved");
  });

  it("asSummaryRows includes fixture_id (mill-canonical column)", () => {
    eng.createOrder(nominalOrder({ order_id: "SUM", fixture_id: "TOMBSTONE-7" }));
    const rows = eng.asSummaryRows();
    expect(rows[0].fixture_id).toBe("TOMBSTONE-7");
    expect(rows[0].days_in_current_state).toBeGreaterThanOrEqual(0);
  });

  it("variability ≥3: 3 distinct lifecycle paths — happy, cancelled-from-quoted, returned-from-shipped", () => {
    // Happy
    eng.createOrder(nominalOrder({ order_id: "PATH-1" }));
    eng.transition({ order_id: "PATH-1", to_state: "quoted" });
    eng.transition({ order_id: "PATH-1", to_state: "accepted" });
    eng.transition({ order_id: "PATH-1", to_state: "scheduled" });
    eng.transition({ order_id: "PATH-1", to_state: "fixture_prep" });
    eng.transition({ order_id: "PATH-1", to_state: "first_piece_approval" });
    eng.transition({ order_id: "PATH-1", to_state: "in_production" });
    eng.transition({ order_id: "PATH-1", to_state: "shipped" });
    eng.transition({ order_id: "PATH-1", to_state: "invoiced" });
    eng.transition({ order_id: "PATH-1", to_state: "closed" });
    expect(eng.getOrder("PATH-1")?.state).toBe("closed");

    // Cancelled from quoted
    eng.createOrder(nominalOrder({ order_id: "PATH-2" }));
    eng.transition({ order_id: "PATH-2", to_state: "quoted" });
    eng.transition({ order_id: "PATH-2", to_state: "cancelled" });
    eng.transition({ order_id: "PATH-2", to_state: "closed" });
    expect(eng.getOrder("PATH-2")?.state).toBe("closed");

    // Returned from shipped
    eng.createOrder(nominalOrder({ order_id: "PATH-3" }));
    eng.transition({ order_id: "PATH-3", to_state: "quoted" });
    eng.transition({ order_id: "PATH-3", to_state: "accepted" });
    eng.transition({ order_id: "PATH-3", to_state: "scheduled" });
    eng.transition({ order_id: "PATH-3", to_state: "fixture_prep" });
    eng.transition({ order_id: "PATH-3", to_state: "first_piece_approval" });
    eng.transition({ order_id: "PATH-3", to_state: "in_production" });
    eng.transition({ order_id: "PATH-3", to_state: "shipped" });
    eng.transition({ order_id: "PATH-3", to_state: "returned" });
    eng.transition({ order_id: "PATH-3", to_state: "refunded" });
    eng.transition({ order_id: "PATH-3", to_state: "closed" });
    expect(eng.getOrder("PATH-3")?.state).toBe("closed");
  });

  it("audit metadata is preserved", () => {
    eng.createOrder(nominalOrder({ order_id: "META" }));
    eng.transition({
      order_id: "META",
      to_state: "quoted",
      metadata: { quote_total_usd: 1234.56, sales_rep: "alice" },
    });
    const log = eng.getAuditLog("META");
    const quotedEvent = log.find(e => e.to_state === "quoted");
    expect(quotedEvent?.metadata?.quote_total_usd).toBe(1234.56);
    expect(quotedEvent?.metadata?.sales_rep).toBe("alice");
  });

  it("allowedTransitions matches the transition table for each state", () => {
    expect(eng.allowedTransitions("draft")).toEqual(["quoted", "cancelled"]);
    expect(eng.allowedTransitions("scheduled")).toEqual(["fixture_prep", "on_hold", "cancelled"]);
    expect(eng.allowedTransitions("first_piece_rejected")).toEqual(
      ["fixture_prep", "first_piece_approval", "cancelled"],
    );
  });

  it("__resetForTests clears state", () => {
    eng.createOrder(nominalOrder());
    expect(eng.listOrders().length).toBe(1);
    eng.__resetForTests();
    expect(eng.listOrders().length).toBe(0);
  });

  it("persistence: new engine instance loads previously-saved orders", () => {
    eng.createOrder(nominalOrder({ order_id: "PERSIST" }));
    const eng2 = new MillCustomerOrderLifecycleEngine(tmpPath);
    expect(eng2.getOrder("PERSIST")?.order_id).toBe("PERSIST");
  });

  it("audit IDs are sequential (zero-padded 8-digit)", () => {
    eng.createOrder(nominalOrder({ order_id: "AUDID" }));
    eng.transition({ order_id: "AUDID", to_state: "quoted" });
    const log = eng.getAuditLog("AUDID");
    expect(log[0].id).toBe("evt_00000001");
    expect(log[1].id).toBe("evt_00000002");
  });
});
