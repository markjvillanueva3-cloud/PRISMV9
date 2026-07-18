/**
 * QuoteRevisionEngine tests — Session 6-3 U-IQUOTE2
 *
 * Validates: revision creation, status lifecycle, status transitions,
 * revision comparison, share tokens, and edge cases.
 */
import { describe, it, expect } from "vitest";
import { quoteRevisionEngine } from "../engines/QuoteRevisionEngine.js";
import type { RevisionInput } from "../engines/QuoteRevisionEngine.js";

function baseRevision(overrides?: Partial<RevisionInput>): RevisionInput {
  return {
    quote_id: "Q-001",
    unit_price_usd: 45.50,
    total_price_usd: 455.00,
    quantity: 10,
    ci95_low_usd: 38.20,
    ci95_high_usd: 52.80,
    confidence_pct: 72,
    cost_breakdown: { material: 8.50, machining: 22.00, setup: 5.00 },
    quantity_breaks: [
      { quantity: 1, unit_price: 65.00, total_price: 65.00 },
      { quantity: 10, unit_price: 45.50, total_price: 455.00 },
      { quantity: 100, unit_price: 32.00, total_price: 3200.00 },
    ],
    lead_time_options: [
      { tier: "standard", days: 10, unit_price: 45.50 },
      { tier: "rush", days: 5, unit_price: 79.63 },
    ],
    dfm_score: 85,
    dfm_issues: [{ severity: "warning", message: "Tight tolerance on pocket" }],
    ...overrides,
  };
}

let quoteCounter = 0;
function uniqueQuoteId(): string {
  return `Q-TEST-${++quoteCounter}-${Date.now()}`;
}

describe("QuoteRevisionEngine", () => {

  describe("revise() — create revisions", () => {
    it("should create first revision with revision_number=1", () => {
      const qid = uniqueQuoteId();
      const rev = quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));

      expect(rev.revision_number).toBe(1);
      expect(rev.quote_id).toBe(qid);
      expect(rev.unit_price_usd).toBe(45.50);
      expect(rev.total_price_usd).toBe(455.00);
      expect(rev.quantity).toBe(10);
      expect(rev.id).toBeDefined();
      expect(rev.created_at).toBeDefined();
    });

    it("should auto-increment revision numbers", () => {
      const qid = uniqueQuoteId();
      const rev1 = quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      const rev2 = quoteRevisionEngine.revise(baseRevision({
        quote_id: qid,
        unit_price_usd: 42.00,
        total_price_usd: 420.00,
        change_summary: "Reduced material cost",
      }));

      expect(rev1.revision_number).toBe(1);
      expect(rev2.revision_number).toBe(2);
      expect(rev2.change_summary).toBe("Reduced material cost");
    });

    it("should set initial change_summary to 'Initial quote' for rev 1", () => {
      const qid = uniqueQuoteId();
      const rev = quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      expect(rev.change_summary).toBe("Initial quote");
    });

    it("should preserve CI95 bounds and confidence", () => {
      const qid = uniqueQuoteId();
      const rev = quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      expect(rev.ci95_low_usd).toBe(38.20);
      expect(rev.ci95_high_usd).toBe(52.80);
      expect(rev.confidence_pct).toBe(72);
    });

    it("should reject negative prices", () => {
      const qid = uniqueQuoteId();
      expect(() => quoteRevisionEngine.revise(baseRevision({
        quote_id: qid, unit_price_usd: -10,
      }))).toThrow("unit_price_usd must be >= 0");
    });

    it("should reject zero/negative quantity", () => {
      const qid = uniqueQuoteId();
      expect(() => quoteRevisionEngine.revise(baseRevision({
        quote_id: qid, quantity: 0,
      }))).toThrow("quantity must be > 0");
    });
  });

  describe("getHistory() — revision + status history", () => {
    it("should return revisions newest-first", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid, unit_price_usd: 40.00, total_price_usd: 400.00 }));

      const history = quoteRevisionEngine.getHistory(qid);
      expect(history.revisions).toHaveLength(2);
      expect(history.revisions[0].revision_number).toBe(2);
      expect(history.revisions[1].revision_number).toBe(1);
      expect(history.current_revision).toBe(2);
    });

    it("should include status history", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "sent" });

      const history = quoteRevisionEngine.getHistory(qid);
      expect(history.status_history.length).toBeGreaterThan(0);
      expect(history.current_status).toBe("sent");
    });

    it("should return empty history for unknown quote", () => {
      const history = quoteRevisionEngine.getHistory("NONEXISTENT");
      expect(history.revisions).toHaveLength(0);
      expect(history.current_revision).toBe(0);
    });
  });

  describe("compareRevisions()", () => {
    it("should compare two revisions with price delta", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid, unit_price_usd: 50.00, total_price_usd: 500.00 }));
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid, unit_price_usd: 42.00, total_price_usd: 420.00 }));

      const cmp = quoteRevisionEngine.compareRevisions(qid, 1, 2);
      expect(cmp.price_delta_usd).toBe(-8.00);
      expect(cmp.price_delta_pct).toBeLessThan(0);
      expect(cmp.summary).toContain("decreased");
    });

    it("should detect new and resolved DFM issues", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({
        quote_id: qid,
        dfm_issues: [
          { severity: "critical", message: "Thin wall 0.3mm" },
          { severity: "warning", message: "Deep pocket" },
        ],
      }));
      quoteRevisionEngine.revise(baseRevision({
        quote_id: qid,
        dfm_issues: [
          { severity: "warning", message: "Deep pocket" },
          { severity: "info", message: "Tolerance achievable" },
        ],
      }));

      const cmp = quoteRevisionEngine.compareRevisions(qid, 1, 2);
      expect(cmp.resolved_issues).toHaveLength(1);
      expect(cmp.resolved_issues[0].message).toBe("Thin wall 0.3mm");
      expect(cmp.new_issues).toHaveLength(1);
      expect(cmp.new_issues[0].message).toBe("Tolerance achievable");
    });

    it("should throw for nonexistent revision", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      expect(() => quoteRevisionEngine.compareRevisions(qid, 1, 99)).toThrow("Revision 99 not found");
    });
  });

  describe("changeStatus() — lifecycle transitions", () => {
    it("should transition draft → sent", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      const change = quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "sent" });

      expect(change.from_status).toBe("draft");
      expect(change.to_status).toBe("sent");
    });

    it("should transition sent → viewed → accepted", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "sent" });
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "viewed" });
      const accepted = quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "accepted" });

      expect(accepted.to_status).toBe("accepted");
    });

    it("should reject invalid transitions", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      // draft → accepted is not allowed (must go through sent/viewed first)
      expect(() => quoteRevisionEngine.changeStatus({
        quote_id: qid, to_status: "accepted",
      })).toThrow("Invalid status transition");
    });

    it("should reject transitions from terminal state (accepted)", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "sent" });
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "viewed" });
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "accepted" });

      expect(() => quoteRevisionEngine.changeStatus({
        quote_id: qid, to_status: "sent",
      })).toThrow("none (terminal state)");
    });

    it("should allow rejected → revised for re-quoting", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "sent" });
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "viewed" });
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "rejected", reason: "Too expensive" });
      const revised = quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "revised" });

      expect(revised.from_status).toBe("rejected");
      expect(revised.to_status).toBe("revised");
    });

    it("should record reason and metadata", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      const change = quoteRevisionEngine.changeStatus({
        quote_id: qid,
        to_status: "sent",
        changed_by: "user-123",
        reason: "Customer requested",
        metadata: { email_sent: true },
      });

      expect(change.changed_by).toBe("user-123");
      expect(change.reason).toBe("Customer requested");
      expect(change.metadata).toEqual({ email_sent: true });
    });
  });

  describe("share tokens", () => {
    it("should generate a share token", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      const token = quoteRevisionEngine.generateShareToken({ quote_id: qid });

      expect(token.token).toBeDefined();
      expect(token.token.length).toBeGreaterThan(20);
      expect(token.quote_id).toBe(qid);
      expect(token.revoked).toBe(false);
      expect(token.access_count).toBe(0);
    });

    it("should retrieve quote by valid token", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      const { token } = quoteRevisionEngine.generateShareToken({ quote_id: qid });

      const result = quoteRevisionEngine.getByToken(token);
      expect(result).not.toBeNull();
      expect(result!.quote_id).toBe(qid);
      expect(result!.revision.revision_number).toBe(1);
    });

    it("should auto-transition sent → viewed on token access", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "sent" });
      const { token } = quoteRevisionEngine.generateShareToken({ quote_id: qid });

      const result = quoteRevisionEngine.getByToken(token);
      expect(result!.status).toBe("viewed");
    });

    it("should increment access count", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      const shareToken = quoteRevisionEngine.generateShareToken({ quote_id: qid });

      quoteRevisionEngine.getByToken(shareToken.token);
      quoteRevisionEngine.getByToken(shareToken.token);
      quoteRevisionEngine.getByToken(shareToken.token);

      // Access count tracked on the token object
      expect(shareToken.access_count).toBe(3);
    });

    it("should reject revoked tokens", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      const { token } = quoteRevisionEngine.generateShareToken({ quote_id: qid });

      quoteRevisionEngine.revokeToken(token);
      expect(quoteRevisionEngine.getByToken(token)).toBeNull();
    });

    it("should reject expired tokens", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      const shareToken = quoteRevisionEngine.generateShareToken({
        quote_id: qid,
        expires_in_days: -1, // already expired
      });

      expect(quoteRevisionEngine.getByToken(shareToken.token)).toBeNull();
    });

    it("should throw for unknown quote", () => {
      expect(() => quoteRevisionEngine.generateShareToken({
        quote_id: "NONEXISTENT",
      })).toThrow("Quote not found");
    });
  });

  describe("getRevision() + getState()", () => {
    it("should retrieve a specific revision by number", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid, unit_price_usd: 40.00, total_price_usd: 400.00 }));

      const rev1 = quoteRevisionEngine.getRevision(qid, 1);
      expect(rev1!.unit_price_usd).toBe(45.50);

      const rev2 = quoteRevisionEngine.getRevision(qid, 2);
      expect(rev2!.unit_price_usd).toBe(40.00);
    });

    it("should return null for nonexistent revision", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      expect(quoteRevisionEngine.getRevision(qid, 99)).toBeNull();
    });

    it("should return current state", () => {
      const qid = uniqueQuoteId();
      quoteRevisionEngine.revise(baseRevision({ quote_id: qid }));
      const state = quoteRevisionEngine.getState(qid);
      expect(state!.current_status).toBe("draft");
      expect(state!.current_revision).toBe(1);
    });
  });
});
