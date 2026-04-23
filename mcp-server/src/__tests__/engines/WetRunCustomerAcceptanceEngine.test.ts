/**
 * WetRunCustomerAcceptanceEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-CUSTOMER-ACCEPT
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunCustomerAcceptanceEngine,
  type SubmitInput,
  type DecideInput,
} from "../../engines/WetRunCustomerAcceptanceEngine.js";

const T0 = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function baseSubmit(overrides: Partial<SubmitInput> = {}): SubmitInput {
  return {
    pilot_id: "PILOT-A",
    batch_id: "BATCH-001",
    ts: T0,
    submitted_by: "alice@prism",
    customer_name: "ACME Aerospace",
    customer_acceptor: "bob@acme",
    ...overrides,
  };
}

function baseDecide(
  submissionId: string,
  overrides: Partial<DecideInput> = {},
): DecideInput {
  return {
    submission_id: submissionId,
    ts: T0 + HOUR,
    decision: "accepted",
    notes: "parts conform to drawing and traveler; CoC reviewed and filed",
    ...overrides,
  };
}

describe("WetRunCustomerAcceptanceEngine", () => {
  let engine: WetRunCustomerAcceptanceEngine;
  beforeEach(() => {
    engine = new WetRunCustomerAcceptanceEngine();
  });

  describe("submit", () => {
    it("creates a submission in submitted state", () => {
      const s = engine.submit(baseSubmit());
      expect(s.state).toBe("submitted");
      expect(s.seq).toBe(1);
      expect(s.id).toBe("acc:PILOT-A:000001");
      expect(s.punchlist).toEqual([]);
    });

    it("rejects submitter == customer_acceptor (four-eyes)", () => {
      expect(() =>
        engine.submit(
          baseSubmit({
            submitted_by: "same@id",
            customer_acceptor: "same@id",
          }),
        ),
      ).toThrow(/four-eyes/);
    });

    it("rejects duplicate active submission for same pilot+batch", () => {
      engine.submit(baseSubmit());
      expect(() => engine.submit(baseSubmit())).toThrow(/active submission/);
    });

    it("allows re-submission after withdrawal", () => {
      const s1 = engine.submit(baseSubmit());
      engine.withdraw({
        submission_id: s1.id,
        ts: T0 + 1,
        withdrawn_by: "alice@prism",
        reason: "found tooling issue, reworking before re-submission",
      });
      const s2 = engine.submit(baseSubmit({ ts: T0 + 2 }));
      expect(s2.seq).toBe(2);
      expect(s2.state).toBe("submitted");
    });

    it("keeps per-pilot seq independent", () => {
      engine.submit(baseSubmit({ pilot_id: "P1" }));
      const b = engine.submit(baseSubmit({ pilot_id: "P2" }));
      expect(b.seq).toBe(1);
      expect(b.id).toBe("acc:P2:000001");
    });
  });

  describe("decide — accepted", () => {
    it("transitions to accepted", () => {
      const s = engine.submit(baseSubmit());
      const d = engine.decide(baseDecide(s.id));
      expect(d.state).toBe("accepted");
      expect(d.decided_ts).toBe(T0 + HOUR);
      expect(d.decision_notes).toMatch(/CoC reviewed/);
    });

    it("rejects notes shorter than 40 chars", () => {
      const s = engine.submit(baseSubmit());
      expect(() =>
        engine.decide(baseDecide(s.id, { notes: "too short" })),
      ).toThrow(/at least 40/);
    });

    it("rejects accept with punchlist", () => {
      const s = engine.submit(baseSubmit());
      expect(() =>
        engine.decide(
          baseDecide(s.id, {
            punchlist: [
              { description: "irrelevant item for accept", due_ts: T0 + DAY },
            ],
          }),
        ),
      ).toThrow(/only conditional/);
    });

    it("rejects decide on already-decided submission", () => {
      const s = engine.submit(baseSubmit());
      engine.decide(baseDecide(s.id));
      expect(() => engine.decide(baseDecide(s.id))).toThrow(
        /cannot decide on submission in state accepted/,
      );
    });
  });

  describe("decide — conditional", () => {
    it("requires at least one punch item", () => {
      const s = engine.submit(baseSubmit());
      expect(() =>
        engine.decide(baseDecide(s.id, { decision: "conditional" })),
      ).toThrow(/at least one punch item/);
    });

    it("accepts conditional with punch items and assigns ids", () => {
      const s = engine.submit(baseSubmit());
      const d = engine.decide(
        baseDecide(s.id, {
          decision: "conditional",
          punchlist: [
            {
              description: "deburr all through-holes to R0.2 before shipment",
              due_ts: T0 + 3 * DAY,
            },
            {
              description: "passivate Part-02 per AMS 2700 and attach CoC",
              due_ts: T0 + 7 * DAY,
            },
          ],
        }),
      );
      expect(d.state).toBe("conditional");
      expect(d.punchlist).toHaveLength(2);
      expect(d.punchlist[0]?.id).toMatch(/^acc:PILOT-A:000001:punch:/);
      expect(d.punchlist[0]?.closed).toBe(false);
    });

    it("rejects duplicate punch descriptions", () => {
      const s = engine.submit(baseSubmit());
      expect(() =>
        engine.decide(
          baseDecide(s.id, {
            decision: "conditional",
            punchlist: [
              {
                description: "deburr all through-holes to R0.2 before shipment",
                due_ts: T0 + 3 * DAY,
              },
              {
                description: "Deburr All Through-Holes to R0.2 before Shipment",
                due_ts: T0 + 4 * DAY,
              },
            ],
          }),
        ),
      ).toThrow(/duplicate punch/);
    });

    it("rejects punch description shorter than 30 chars", () => {
      const s = engine.submit(baseSubmit());
      expect(() =>
        engine.decide(
          baseDecide(s.id, {
            decision: "conditional",
            punchlist: [
              { description: "too short", due_ts: T0 + 3 * DAY },
            ],
          }),
        ),
      ).toThrow(/at least 30/);
    });

    it("rejects punch due_ts not strictly after decision ts", () => {
      const s = engine.submit(baseSubmit());
      expect(() =>
        engine.decide(
          baseDecide(s.id, {
            ts: T0 + HOUR,
            decision: "conditional",
            punchlist: [
              {
                description: "fix scoring on visible flange surface 001",
                due_ts: T0 + HOUR,
              },
            ],
          }),
        ),
      ).toThrow(/strictly after decision ts/);
    });
  });

  describe("decide — rejected", () => {
    it("transitions to rejected and notes become required", () => {
      const s = engine.submit(baseSubmit());
      const d = engine.decide(
        baseDecide(s.id, {
          decision: "rejected",
          notes: "visible surface defects out of tolerance, scrap and remake",
        }),
      );
      expect(d.state).toBe("rejected");
    });
  });

  describe("closePunchlistItem", () => {
    it("closes the item and flips to accepted when all closed", () => {
      const s = engine.submit(baseSubmit());
      const d = engine.decide(
        baseDecide(s.id, {
          decision: "conditional",
          punchlist: [
            {
              description: "deburr all through-holes to R0.2 before shipment",
              due_ts: T0 + 3 * DAY,
            },
          ],
        }),
      );
      const itemId = d.punchlist[0]!.id;
      const closed = engine.closePunchlistItem({
        submission_id: s.id,
        item_id: itemId,
        ts: T0 + 2 * DAY,
        closed_by: "carol@prism",
        reason: "deburr complete; verified per in-process inspection",
      });
      expect(closed.state).toBe("accepted");
      expect(closed.punchlist[0]?.closed).toBe(true);
      expect(closed.punchlist[0]?.closed_by).toBe("carol@prism");
    });

    it("stays conditional while items remain open", () => {
      const s = engine.submit(baseSubmit());
      const d = engine.decide(
        baseDecide(s.id, {
          decision: "conditional",
          punchlist: [
            {
              description: "deburr all through-holes to R0.2 before shipment",
              due_ts: T0 + 3 * DAY,
            },
            {
              description: "passivate Part-02 per AMS 2700 and attach CoC",
              due_ts: T0 + 7 * DAY,
            },
          ],
        }),
      );
      const closed = engine.closePunchlistItem({
        submission_id: s.id,
        item_id: d.punchlist[0]!.id,
        ts: T0 + 2 * DAY,
        closed_by: "carol@prism",
        reason: "deburr complete; verified per in-process inspection",
      });
      expect(closed.state).toBe("conditional");
    });

    it("rejects double close", () => {
      const s = engine.submit(baseSubmit());
      const d = engine.decide(
        baseDecide(s.id, {
          decision: "conditional",
          punchlist: [
            {
              description: "deburr all through-holes to R0.2 before shipment",
              due_ts: T0 + 3 * DAY,
            },
            {
              description: "passivate Part-02 per AMS 2700 and attach CoC",
              due_ts: T0 + 7 * DAY,
            },
          ],
        }),
      );
      const itemId = d.punchlist[0]!.id;
      engine.closePunchlistItem({
        submission_id: s.id,
        item_id: itemId,
        ts: T0 + 2 * DAY,
        closed_by: "carol@prism",
        reason: "deburr complete; verified per in-process inspection",
      });
      expect(() =>
        engine.closePunchlistItem({
          submission_id: s.id,
          item_id: itemId,
          ts: T0 + 3 * DAY,
          closed_by: "carol@prism",
          reason: "already closed; attempting reopen for demo purpose",
        }),
      ).toThrow(/already closed/);
    });

    it("rejects close on non-conditional submission", () => {
      const s = engine.submit(baseSubmit());
      engine.decide(baseDecide(s.id));
      expect(() =>
        engine.closePunchlistItem({
          submission_id: s.id,
          item_id: "anything",
          ts: T0 + DAY,
          closed_by: "carol@prism",
          reason: "no items should exist on accepted submission for test",
        }),
      ).toThrow(/state accepted/);
    });
  });

  describe("withdraw", () => {
    it("flips submitted → withdrawn with reason", () => {
      const s = engine.submit(baseSubmit());
      const w = engine.withdraw({
        submission_id: s.id,
        ts: T0 + HOUR,
        withdrawn_by: "alice@prism",
        reason: "internal QA caught a scrap ledger entry, resubmit tomorrow",
      });
      expect(w.state).toBe("withdrawn");
      expect(w.withdrawn_by).toBe("alice@prism");
    });

    it("rejects withdraw on rejected submission", () => {
      const s = engine.submit(baseSubmit());
      engine.decide(
        baseDecide(s.id, {
          decision: "rejected",
          notes: "customer inspector found surface defects, batch rejected",
        }),
      );
      expect(() =>
        engine.withdraw({
          submission_id: s.id,
          ts: T0 + 2 * HOUR,
          withdrawn_by: "alice@prism",
          reason: "too late, customer already rejected this submission",
        }),
      ).toThrow(/terminal state rejected/);
    });

    it("rejects short withdraw reason", () => {
      const s = engine.submit(baseSubmit());
      expect(() =>
        engine.withdraw({
          submission_id: s.id,
          ts: T0 + HOUR,
          withdrawn_by: "alice@prism",
          reason: "oops",
        }),
      ).toThrow(/at least 40/);
    });
  });

  describe("promotionGate", () => {
    it("blocks when no submissions exist", () => {
      const g = engine.promotionGate("EMPTY");
      expect(g.ready_to_promote).toBe(false);
      expect(g.submission_count).toBe(0);
    });

    it("blocks while any submission is pending", () => {
      engine.submit(baseSubmit({ batch_id: "B1" }));
      engine.submit(baseSubmit({ batch_id: "B2" }));
      const g = engine.promotionGate("PILOT-A");
      expect(g.submitted_pending).toBe(2);
      expect(g.ready_to_promote).toBe(false);
      expect(g.blockers).toHaveLength(2);
    });

    it("blocks on rejected", () => {
      const s1 = engine.submit(baseSubmit({ batch_id: "B1" }));
      engine.decide(
        baseDecide(s1.id, {
          decision: "rejected",
          notes: "customer inspector flagged dimensional nonconformance",
        }),
      );
      const g = engine.promotionGate("PILOT-A");
      expect(g.rejected).toBe(1);
      expect(g.ready_to_promote).toBe(false);
    });

    it("blocks on open punch items", () => {
      const s1 = engine.submit(baseSubmit({ batch_id: "B1" }));
      engine.decide(
        baseDecide(s1.id, {
          decision: "conditional",
          punchlist: [
            {
              description: "deburr all through-holes to R0.2 before shipment",
              due_ts: T0 + 3 * DAY,
            },
          ],
        }),
      );
      const g = engine.promotionGate("PILOT-A");
      expect(g.conditional_open).toBe(1);
      expect(g.outstanding_punch_items).toBe(1);
      expect(g.ready_to_promote).toBe(false);
    });

    it("clears when all batches accepted (including closed conditionals)", () => {
      const s1 = engine.submit(baseSubmit({ batch_id: "B1" }));
      engine.decide(baseDecide(s1.id));
      const s2 = engine.submit(baseSubmit({ batch_id: "B2" }));
      const d2 = engine.decide(
        baseDecide(s2.id, {
          decision: "conditional",
          punchlist: [
            {
              description: "deburr all through-holes to R0.2 before shipment",
              due_ts: T0 + 3 * DAY,
            },
          ],
        }),
      );
      engine.closePunchlistItem({
        submission_id: s2.id,
        item_id: d2.punchlist[0]!.id,
        ts: T0 + 2 * DAY,
        closed_by: "carol@prism",
        reason: "deburr complete; verified per in-process inspection",
      });
      const g = engine.promotionGate("PILOT-A");
      expect(g.accepted).toBe(2);
      expect(g.conditional_open).toBe(0);
      expect(g.ready_to_promote).toBe(true);
      expect(g.blockers).toEqual([]);
    });
  });

  describe("snapshot", () => {
    it("captures schemaVersion + submissions + last_seq_by_pilot", () => {
      engine.submit(baseSubmit({ pilot_id: "P1", batch_id: "B1" }));
      engine.submit(baseSubmit({ pilot_id: "P1", batch_id: "B2" }));
      engine.submit(baseSubmit({ pilot_id: "P2", batch_id: "B1" }));
      const s = engine.snapshot();
      expect(s.schemaVersion).toBe(1);
      expect(s.submissions).toHaveLength(3);
      expect(s.last_seq_by_pilot["P1"]).toBe(2);
      expect(s.last_seq_by_pilot["P2"]).toBe(1);
    });

    it("is defensively copied including punchlist", () => {
      const sub = engine.submit(baseSubmit());
      engine.decide(
        baseDecide(sub.id, {
          decision: "conditional",
          punchlist: [
            {
              description: "deburr all through-holes to R0.2 before shipment",
              due_ts: T0 + 3 * DAY,
            },
          ],
        }),
      );
      const s = engine.snapshot();
      s.submissions[0]!.punchlist[0]!.description = "TAMPERED";
      expect(
        engine.getSubmission(sub.id)?.punchlist[0]?.description,
      ).toMatch(/deburr/);
    });
  });
});
