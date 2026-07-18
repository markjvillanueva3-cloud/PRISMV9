import { describe, it, expect } from "vitest";
import { EstimateEngine as E, type Estimate } from "../engines/EstimateEngine.js";

const base = (over: Record<string, unknown> = {}) => ({
  customerId: "CUST-1",
  issueDate: "2026-01-01",
  lines: [{ description: "CNC part A", quantity: 10, unitPrice: 100 }],
  ...over,
});

describe("EstimateEngine.create — line/subtotal/total reconciliation", () => {
  it("computes line extensions and subtotal; no discount/tax → grandTotal == subtotal", () => {
    const e = E.create(base({ lines: [{ description: "A", quantity: 10, unitPrice: 100 }, { description: "B", quantity: 5, unitPrice: 50 }] }));
    expect(e.lines.map((l) => l.extension)).toEqual([1000, 250]);
    expect(e.subtotal).toBe(1250);
    expect(e.grandTotal).toBe(1250);
    expect(e.status).toBe("draft");
    expect(e.estimateId).toMatch(/^EST-CUST-1-2026-01-01-[0-9a-z]+$/); // customer+date+content-hash fallback
  });

  it("rounds a line extension to the cent (3 × $33.33 = $99.99)", () => {
    const e = E.create(base({ lines: [{ description: "A", quantity: 3, unitPrice: 33.33 }] }));
    expect(e.lines[0].extension).toBe(99.99);
  });

  it("default validity is 30 days from issue date", () => {
    expect(E.create(base()).validUntil).toBe("2026-01-31");
  });

  it("honors a custom validDays", () => {
    expect(E.create(base({ validDays: 14 })).validUntil).toBe("2026-01-15");
  });
});

describe("EstimateEngine.create — fallback estimateId uniqueness (P2 silent-collision fix)", () => {
  it("uses an explicit estimateId verbatim (no hash suffix)", () => {
    expect(E.create(base({ estimateId: "EST-EXPLICIT-9" })).estimateId).toBe("EST-EXPLICIT-9");
  });
  it("gives two DIFFERENT estimates for the same customer+day DIFFERENT ids (no silent overwrite)", () => {
    const a = E.create(base({ lines: [{ description: "A", quantity: 10, unitPrice: 100 }] }));
    const b = E.create(base({ lines: [{ description: "B", quantity: 5, unitPrice: 50 }] }));
    expect(a.estimateId).not.toBe(b.estimateId);
    expect(a.estimateId.startsWith("EST-CUST-1-2026-01-01-")).toBe(true);
    expect(b.estimateId.startsWith("EST-CUST-1-2026-01-01-")).toBe(true);
  });
  it("is idempotent — identical input yields the same fallback id (re-create is not a new estimate)", () => {
    expect(E.create(base()).estimateId).toBe(E.create(base()).estimateId);
  });
  it("a differing discount alone changes the fallback id (content-distinguished)", () => {
    const a = E.create(base());
    const b = E.create(base({ discount: { type: "percent", value: 10 } }));
    expect(a.estimateId).not.toBe(b.estimateId);
  });
});

describe("EstimateEngine.create — discounts", () => {
  it("applies a percent discount (10% of $1000 → $100, total $900)", () => {
    const e = E.create(base({ discount: { type: "percent", value: 10 } }));
    expect(e.discountAmount).toBe(100);
    expect(e.grandTotal).toBe(900);
  });
  it("applies a fixed discount ($150 → total $850)", () => {
    const e = E.create(base({ discount: { type: "fixed", value: 150 } }));
    expect(e.discountAmount).toBe(150);
    expect(e.grandTotal).toBe(850);
  });
  it("clamps a fixed discount to the subtotal (never negative total)", () => {
    const e = E.create(base({ discount: { type: "fixed", value: 2000 } }));
    expect(e.discountAmount).toBe(1000);
    expect(e.grandTotal).toBe(0);
  });
  it("throws on a percent discount over 100%", () => {
    expect(() => E.create(base({ discount: { type: "percent", value: 150 } }))).toThrow(/100%/);
  });
});

describe("EstimateEngine.create — sales tax via SalesUseTaxEngine (synergy, MI 6%)", () => {
  it("taxes the full taxable subtotal ($1000 MI → $60, total $1060)", () => {
    const e = E.create(base({ taxJurisdiction: "MI" }));
    expect(e.tax).toBe(60);
    expect(e.grandTotal).toBe(1060);
    expect(e.taxJurisdiction).toBe("MI");
  });

  it("taxes the post-discount taxable base ($1000 − 10% = $900 × 6% = $54, total $954)", () => {
    const e = E.create(base({ discount: { type: "percent", value: 10 }, taxJurisdiction: "MI" }));
    expect(e.taxableBase).toBe(900);
    expect(e.tax).toBe(54);
    expect(e.grandTotal).toBe(954); // 1000 − 100 + 54
  });

  it("pro-rates tax to the taxable share when some lines are non-taxable", () => {
    const e = E.create(
      base({
        lines: [
          { description: "taxable part", quantity: 1, unitPrice: 1000, taxable: true },
          { description: "exempt freight", quantity: 1, unitPrice: 1000, taxable: false },
        ],
        taxJurisdiction: "MI",
      })
    );
    expect(e.subtotal).toBe(2000);
    expect(e.taxableBase).toBe(1000); // only the taxable half
    expect(e.tax).toBe(60);
    expect(e.grandTotal).toBe(2060);
  });

  it("an exempt estimate is taxed $0 (requires an exempt reason)", () => {
    const e = E.create(base({ taxJurisdiction: "MI", taxExempt: true, exemptReason: "resale certificate on file" }));
    expect(e.tax).toBe(0);
    expect(e.grandTotal).toBe(1000);
  });

  it("reconciliation invariant holds: subtotal − discount + tax === grandTotal", () => {
    const e = E.create(base({ discount: { type: "fixed", value: 137.5 }, taxJurisdiction: "MI" }));
    expect(e.subtotal - e.discountAmount + e.tax).toBeCloseTo(e.grandTotal, 2);
  });
});

describe("EstimateEngine.transition — status FSM", () => {
  const draft = () => E.create(base());
  it("allows draft → sent → accepted → converted", () => {
    const sent = E.transition(draft(), "sent");
    expect(sent.status).toBe("sent");
    const accepted = E.transition(sent, "accepted");
    expect(accepted.status).toBe("accepted");
    expect(E.transition(accepted, "converted").status).toBe("converted");
  });
  it("throws on an illegal transition (draft → converted)", () => {
    expect(() => E.transition(draft(), "converted")).toThrow(/illegal status transition/);
  });
  it("throws moving out of a terminal state (rejected → accepted)", () => {
    const rejected = E.transition(draft(), "rejected");
    expect(() => E.transition(rejected, "accepted")).toThrow(/illegal status transition/);
  });
  it("an accepted estimate cannot be expired (accepted is committed; FSM ↔ isExpired consistent)", () => {
    const accepted = E.transition(E.transition(draft(), "sent"), "accepted");
    expect(() => E.transition(accepted, "expired")).toThrow(/illegal status transition/);
    expect(E.isExpired(accepted, "2099-01-01")).toBe(false); // and the predicate agrees
  });
});

describe("EstimateEngine.isExpired", () => {
  it("is expired after validUntil", () => {
    expect(E.isExpired(E.create(base()), "2026-02-15")).toBe(true);
  });
  it("is not expired before validUntil", () => {
    expect(E.isExpired(E.create(base()), "2026-01-15")).toBe(false);
  });
  it("an accepted estimate never expires", () => {
    const accepted = E.transition(E.transition(E.create(base()), "sent"), "accepted");
    expect(E.isExpired(accepted, "2030-01-01")).toBe(false);
  });
});

describe("EstimateEngine.toSalesOrder", () => {
  it("converts an accepted estimate to a sales-order draft carrying the totals", () => {
    const accepted = E.transition(E.transition(E.create(base({ taxJurisdiction: "MI" })), "sent"), "accepted");
    const so = E.toSalesOrder(accepted);
    expect(so.fromEstimateId).toBe(accepted.estimateId);
    expect(so.total).toBe(1060);
    expect(so.tax).toBe(60);
    expect(so.lines).toHaveLength(1);
  });
  it("throws when converting a non-accepted estimate", () => {
    expect(() => E.toSalesOrder(E.create(base()))).toThrow(/must be "accepted"/);
  });
  it("returns the source estimate flipped to converted (persist it for idempotency)", () => {
    const accepted = E.transition(E.transition(E.create(base()), "sent"), "accepted");
    const so = E.toSalesOrder(accepted);
    expect(so.convertedEstimate.status).toBe("converted");
    expect(so.convertedEstimate.estimateId).toBe(accepted.estimateId);
  });
  it("a second conversion of the now-converted estimate THROWS (idempotent — no duplicate sales order)", () => {
    const accepted = E.transition(E.transition(E.create(base()), "sent"), "accepted");
    const so = E.toSalesOrder(accepted);
    expect(() => E.toSalesOrder(so.convertedEstimate)).toThrow(/must be "accepted"/);
  });
});

describe("EstimateEngine — adversarial / fail-loud", () => {
  it("throws on a negative quantity", () => {
    expect(() => E.create(base({ lines: [{ description: "A", quantity: -1, unitPrice: 100 }] }))).toThrow();
  });
  it("throws on a negative unit price", () => {
    expect(() => E.create(base({ lines: [{ description: "A", quantity: 1, unitPrice: -5 }] }))).toThrow();
  });
  it("throws on zero lines", () => {
    expect(() => E.create(base({ lines: [] }))).toThrow();
  });
  it("throws on an invalid issue date", () => {
    expect(() => E.create(base({ issueDate: "not-a-date" }))).toThrow(/issueDate/);
  });
  it("throws on an unknown tax jurisdiction (no silent 0% tax)", () => {
    expect(() => E.create(base({ taxJurisdiction: "ZZ" }))).toThrow();
  });
  it("throws on an unknown jurisdiction even when ALL lines are non-taxable ($0 base, no silent skip)", () => {
    expect(() => E.create(base({ lines: [{ description: "freight", quantity: 1, unitPrice: 1000, taxable: false }], taxJurisdiction: "ZZ" }))).toThrow();
  });
  it("throws on an exempt estimate missing its exempt reason, even at a $0 taxable base (audit trail)", () => {
    expect(() =>
      E.create(base({ lines: [{ description: "freight", quantity: 1, unitPrice: 1000, taxable: false }], taxJurisdiction: "MI", taxExempt: true }))
    ).toThrow();
  });
});
