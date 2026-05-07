/**
 * CADRevisionPromotionWorkflowEngine.test.ts — U-FS-04 (PHASE-47)
 *
 * Verifies the draft→review→released state machine:
 *   - Legal + illegal transitions
 *   - 2-signer approval enforcement (must be DISTINCT approvers)
 *   - Immutability of released revisions
 *   - Superseding on new release
 *   - Rollback creates a new draft, doesn't mutate the released record
 *   - Full transition history preserved (append-only)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADRevisionPromotionWorkflowEngine,
  type PromotionWorkflowClock,
} from "../engines/CADRevisionPromotionWorkflowEngine.js";

// Deterministic clock for testing
function makeClock(): PromotionWorkflowClock & { advance(): void } {
  let t = new Date("2026-01-01T00:00:00Z").getTime();
  return {
    now: () => {
      t += 1000;
      return new Date(t).toISOString();
    },
    advance() {
      t += 1000;
    },
  };
}

describe("CADRevisionPromotionWorkflowEngine (U-FS-04)", () => {
  let eng: CADRevisionPromotionWorkflowEngine;

  beforeEach(() => {
    eng = new CADRevisionPromotionWorkflowEngine(makeClock());
  });

  describe("createDraft", () => {
    it("creates a new draft record in state=draft", () => {
      const r = eng.createDraft("PN-100", "A", "alice");
      expect(r.state).toBe("draft");
      expect(r.drawingNumber).toBe("PN-100");
      expect(r.revision).toBe("A");
      expect(r.isCurrent).toBe(false);
      expect(r.history.length).toBe(1);
      expect(r.history[0].reason).toBe("created");
    });

    it("rejects duplicate (drawingNumber, revision)", () => {
      eng.createDraft("PN-100", "A", "alice");
      expect(() => eng.createDraft("PN-100", "A", "alice")).toThrow(/already/);
    });
  });

  describe("submitForReview", () => {
    it("transitions draft → in_review", () => {
      eng.createDraft("PN-100", "A", "alice");
      const r = eng.submitForReview("PN-100", "A", "alice", "ready");
      expect(r.state).toBe("in_review");
      const last = r.history[r.history.length - 1];
      expect(last.from).toBe("draft");
      expect(last.to).toBe("in_review");
      expect(last.reason).toBe("ready");
    });

    it("blocks submit if not in draft", () => {
      eng.createDraft("PN-100", "A", "alice");
      eng.submitForReview("PN-100", "A", "alice");
      expect(() => eng.submitForReview("PN-100", "A", "alice")).toThrow(/Illegal/);
    });
  });

  describe("approvals + release", () => {
    beforeEach(() => {
      eng.createDraft("PN-100", "A", "alice");
      eng.submitForReview("PN-100", "A", "alice");
    });

    it("records an approval during in_review", () => {
      const r = eng.addApproval("PN-100", "A", {
        approverId: "bob",
        role: "qa",
      });
      expect(r.approvals.length).toBe(1);
      expect(r.approvals[0].approverId).toBe("bob");
      expect(r.approvals[0].role).toBe("qa");
      expect(r.approvals[0].timestamp).toBeTruthy();
    });

    it("rejects adding approval outside in_review", () => {
      eng.revokeToDraft("PN-100", "A", "alice");
      expect(() =>
        eng.addApproval("PN-100", "A", {
          approverId: "bob",
          role: "qa",
        }),
      ).toThrow(/in_review/);
    });

    it("rejects duplicate approver", () => {
      eng.addApproval("PN-100", "A", {
        approverId: "bob",
        role: "qa",
      });
      expect(() =>
        eng.addApproval("PN-100", "A", {
          approverId: "bob",
          role: "qa",
        }),
      ).toThrow(/already signed/);
    });

    it("blocks release with <2 approvals", () => {
      eng.addApproval("PN-100", "A", {
        approverId: "bob",
        role: "qa",
      });
      expect(() => eng.release("PN-100", "A", "alice")).toThrow(/requires 2 approvers/);
    });

    it("releases with 2 DISTINCT approvers", () => {
      eng.addApproval("PN-100", "A", { approverId: "bob", role: "qa" });
      eng.addApproval("PN-100", "A", { approverId: "carol", role: "manufacturing" });
      const r = eng.release("PN-100", "A", "alice", "approved");
      expect(r.state).toBe("released");
      expect(r.isCurrent).toBe(true);
    });
  });

  describe("superseding", () => {
    it("new release supersedes prior current", () => {
      // First revision goes released
      eng.createDraft("PN-100", "A", "alice");
      eng.submitForReview("PN-100", "A", "alice");
      eng.addApproval("PN-100", "A", { approverId: "bob", role: "qa" });
      eng.addApproval("PN-100", "A", { approverId: "carol", role: "manufacturing" });
      eng.release("PN-100", "A", "alice");

      // Second revision released
      eng.createDraft("PN-100", "B", "alice");
      eng.submitForReview("PN-100", "B", "alice");
      eng.addApproval("PN-100", "B", { approverId: "bob", role: "qa" });
      eng.addApproval("PN-100", "B", { approverId: "carol", role: "manufacturing" });
      eng.release("PN-100", "B", "alice");

      const a = eng.getRecord("PN-100", "A")!;
      const b = eng.getRecord("PN-100", "B")!;
      expect(a.state).toBe("superseded");
      expect(a.isCurrent).toBe(false);
      expect(a.supersededBy).toBe("B");
      expect(b.state).toBe("released");
      expect(b.isCurrent).toBe(true);
      expect(eng.getCurrent("PN-100")?.revision).toBe("B");
    });
  });

  describe("illegal transitions", () => {
    it("cannot submit a released revision back to review", () => {
      eng.createDraft("PN-100", "A", "alice");
      eng.submitForReview("PN-100", "A", "alice");
      eng.addApproval("PN-100", "A", { approverId: "bob", role: "qa" });
      eng.addApproval("PN-100", "A", { approverId: "carol", role: "manufacturing" });
      eng.release("PN-100", "A", "alice");
      expect(() => eng.submitForReview("PN-100", "A", "alice")).toThrow(/Illegal/);
    });

    it("cannot modify a rejected record", () => {
      eng.createDraft("PN-100", "A", "alice");
      eng.reject("PN-100", "A", "alice", "spec error");
      expect(() => eng.submitForReview("PN-100", "A", "alice")).toThrow(/Illegal/);
    });
  });

  describe("rollback", () => {
    it("creates a new draft seeded from a released revision", () => {
      eng.createDraft("PN-100", "A", "alice");
      eng.submitForReview("PN-100", "A", "alice");
      eng.addApproval("PN-100", "A", { approverId: "bob", role: "qa" });
      eng.addApproval("PN-100", "A", { approverId: "carol", role: "manufacturing" });
      eng.release("PN-100", "A", "alice");

      const rb = eng.rollback("PN-100", "A", "A1", "alice", "fix field defect");
      expect(rb.state).toBe("draft");
      expect(rb.revision).toBe("A1");
      // Released source remains released + current
      expect(eng.getRecord("PN-100", "A")!.state).toBe("released");
      expect(eng.getRecord("PN-100", "A")!.isCurrent).toBe(true);
      // Rollback history mentions the source
      const rbNote = rb.history.find((h) => h.reason?.includes("rollback from A"));
      expect(rbNote).toBeTruthy();
    });

    it("rejects rollback from non-released state", () => {
      eng.createDraft("PN-100", "A", "alice");
      expect(() => eng.rollback("PN-100", "A", "B", "alice")).toThrow(/released\/superseded/);
    });
  });

  describe("decommission", () => {
    it("released → obsolete with isCurrent cleared", () => {
      eng.createDraft("PN-100", "A", "alice");
      eng.submitForReview("PN-100", "A", "alice");
      eng.addApproval("PN-100", "A", { approverId: "bob", role: "qa" });
      eng.addApproval("PN-100", "A", { approverId: "carol", role: "manufacturing" });
      eng.release("PN-100", "A", "alice");
      const r = eng.decommission("PN-100", "A", "alice", "EOL");
      expect(r.state).toBe("obsolete");
      expect(r.isCurrent).toBe(false);
    });
  });

  describe("history is append-only", () => {
    it("history grows monotonically across transitions", () => {
      const r0 = eng.createDraft("PN-100", "A", "alice");
      const r1 = eng.submitForReview("PN-100", "A", "alice");
      const r2 = eng.revokeToDraft("PN-100", "A", "alice");
      expect(r0.history.length).toBe(1);
      expect(r1.history.length).toBe(2);
      expect(r2.history.length).toBe(3);
      expect(r2.approvals.length).toBe(0); // cleared on revoke
    });
  });

  describe("listByDrawing + getCurrent", () => {
    it("lists every revision of a drawing, identifies current", () => {
      eng.createDraft("PN-100", "A", "alice");
      eng.submitForReview("PN-100", "A", "alice");
      eng.addApproval("PN-100", "A", { approverId: "bob", role: "qa" });
      eng.addApproval("PN-100", "A", { approverId: "carol", role: "manufacturing" });
      eng.release("PN-100", "A", "alice");
      eng.createDraft("PN-100", "B", "alice");
      const list = eng.listByDrawing("PN-100");
      expect(list.length).toBe(2);
      expect(eng.getCurrent("PN-100")?.revision).toBe("A");
    });
  });
});
