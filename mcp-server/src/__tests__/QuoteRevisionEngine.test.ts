/**
 * QuoteRevisionEngine.test.ts — hotel slot (iter12 / U-QUOTE-REVISION-WIRE).
 * Tests revision tracking, status lifecycle, share tokens, history, comparisons.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { quoteRevisionEngine } from "../engines/QuoteRevisionEngine.js";

function uniqueQuote(): string {
  return `Q-${Math.random().toString(36).slice(2, 10)}`;
}

const BASE = (qid: string) => ({
  quote_id: qid,
  unit_price_usd: 100,
  total_price_usd: 1000,
  quantity: 10,
});

describe("QuoteRevisionEngine — revise creates revisions monotonically", () => {
  it("first revise creates revision_number=1 with status='draft'", () => {
    const qid = uniqueQuote();
    const r = quoteRevisionEngine.revise(BASE(qid));
    expect(r.revision_number).toBe(1);
    const state = quoteRevisionEngine.getState(qid);
    expect(state?.current_status).toBe("draft");
  });

  it("second revise increments revision_number to 2", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    const r2 = quoteRevisionEngine.revise(BASE(qid));
    expect(r2.revision_number).toBe(2);
  });

  it("revise rejects negative unit_price_usd", () => {
    expect(() => quoteRevisionEngine.revise({ ...BASE(uniqueQuote()), unit_price_usd: -1 }))
      .toThrow(/unit_price_usd/);
  });

  it("revise rejects quantity <= 0", () => {
    expect(() => quoteRevisionEngine.revise({ ...BASE(uniqueQuote()), quantity: 0 }))
      .toThrow(/quantity/);
  });

  it("getRevision retrieves the exact revision by number", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    quoteRevisionEngine.revise({ ...BASE(qid), unit_price_usd: 120 });
    const r = quoteRevisionEngine.getRevision(qid, 2);
    expect(r?.unit_price_usd).toBe(120);
  });
});

describe("QuoteRevisionEngine — getHistory + compareRevisions", () => {
  it("getHistory returns all revisions sorted by revision_number", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    quoteRevisionEngine.revise(BASE(qid));
    quoteRevisionEngine.revise(BASE(qid));
    const h = quoteRevisionEngine.getHistory(qid);
    expect(h.revisions.length).toBe(3);
    expect(h.revisions.map(r => r.revision_number)).toEqual([3, 2, 1]);   // engine sorts desc
  });

  it("compareRevisions computes price_delta_usd between revisions", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    quoteRevisionEngine.revise({ ...BASE(qid), unit_price_usd: 150 });
    const c = quoteRevisionEngine.compareRevisions(qid, 1, 2);
    expect(c.price_delta_usd).toBe(50);
    expect(c.quantity_changed).toBe(false);
  });

  it("compareRevisions flags quantity_changed when quantity differs", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    quoteRevisionEngine.revise({ ...BASE(qid), quantity: 25 });
    const c = quoteRevisionEngine.compareRevisions(qid, 1, 2);
    expect(c.quantity_changed).toBe(true);
  });
});

describe("QuoteRevisionEngine — changeStatus transitions", () => {
  it("draft → sent is a valid transition", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    const c = quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "sent" });
    expect(c.from_status).toBe("draft");
    expect(c.to_status).toBe("sent");
  });

  it("draft → accepted throws (invalid transition)", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    expect(() => quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "accepted" }))
      .toThrow(/Invalid status transition/);
  });

  it("accepted is terminal: no transitions allowed", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "sent" });
    quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "viewed" });
    quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "accepted" });
    expect(() => quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "revised" }))
      .toThrow(/terminal/);
  });

  it("changeStatus throws on unknown quote_id", () => {
    expect(() => quoteRevisionEngine.changeStatus({ quote_id: "Q-NEVER", to_status: "sent" }))
      .toThrow(/Quote not found/);
  });
});

describe("QuoteRevisionEngine — share tokens", () => {
  it("generateShareToken returns base64url token with default 30-day expiry", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    const t = quoteRevisionEngine.generateShareToken({ quote_id: qid });
    expect(t.token.length).toBeGreaterThan(30);
    expect(t.revoked).toBe(false);
    expect(t.access_count).toBe(0);
  });

  it("getByToken returns latest revision + auto-transitions sent → viewed", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    quoteRevisionEngine.changeStatus({ quote_id: qid, to_status: "sent" });
    const t = quoteRevisionEngine.generateShareToken({ quote_id: qid });
    const result = quoteRevisionEngine.getByToken(t.token);
    expect(result?.quote_id).toBe(qid);
    expect(result?.status).toBe("viewed");
  });

  it("getByToken returns null for unknown token", () => {
    expect(quoteRevisionEngine.getByToken("never-token") === null).toBe(true);
  });

  it("revokeToken flips token.revoked + subsequent getByToken returns null", () => {
    const qid = uniqueQuote();
    quoteRevisionEngine.revise(BASE(qid));
    const t = quoteRevisionEngine.generateShareToken({ quote_id: qid });
    expect(quoteRevisionEngine.revokeToken(t.token)).toBe(true);
    expect(quoteRevisionEngine.getByToken(t.token) === null).toBe(true);
  });
});
