/**
 * SalesOrderEngine.test.ts — QB Sales Order parity (QB-PARITY Phase-2 #2, galaxy:business, slot:hotel).
 *
 * Reference values are HAND-COMPUTED below each scenario (not toBeDefined stubs). The producer is an
 * accepted-estimate handoff (EstimateEngine.toSalesOrder() shape); we also round-trip a real
 * EstimateEngine estimate through toSalesOrder() → createFromEstimate() to prove the contract.
 */
import { describe, it, expect } from "vitest";
import {
  SalesOrderEngine,
  salesOrderEngine,
  type SalesOrderDraft,
} from "../engines/SalesOrderEngine.js";
import { EstimateEngine } from "../engines/EstimateEngine.js";

/**
 * Canonical 3-line draft (the EstimateEngine.toSalesOrder() shape).
 *   line0: 10 × $10.00 = $100.00 ordered 10
 *   line1:  5 × $50.00 = $250.00 ordered 5
 *   line2:  4 × $15.00 =  $60.00 ordered 4
 *   subtotal = 100 + 250 + 60 = $410.00
 *   discount = $10.00
 *   tax      = $24.00
 *   total    = 410 − 10 + 24 = $424.00   (reconciles both ways)
 */
function draft3(): SalesOrderDraft {
  return {
    fromEstimateId: "EST-ACME-2026-05-29",
    customerId: "ACME",
    lines: [
      { description: "Widget A", quantity: 10, unitPrice: 10, extension: 100 },
      { description: "Widget B", quantity: 5, unitPrice: 50, extension: 250 },
      { description: "Widget C", quantity: 4, unitPrice: 15, extension: 60 },
    ],
    subtotal: 410,
    discountAmount: 10,
    tax: 24,
    total: 424,
  };
}

describe("SalesOrderEngine.createFromEstimate", () => {
  it("builds an open order; ordered=qty, shipped=0, backordered=ordered (3 lines)", () => {
    const so = SalesOrderEngine.createFromEstimate(draft3());
    expect(so.status).toBe("open");
    expect(so.salesOrderId).toBe("SO-EST-ACME-2026-05-29");
    expect(so.fromEstimateId).toBe("EST-ACME-2026-05-29");
    expect(so.customerId).toBe("ACME");
    expect(so.lines).toHaveLength(3);
    // line0: ordered 10, shipped 0, backordered 10
    expect(so.lines[0]).toMatchObject({ description: "Widget A", ordered: 10, shipped: 0, backordered: 10, extension: 100 });
    expect(so.lines[1]).toMatchObject({ ordered: 5, shipped: 0, backordered: 5 });
    expect(so.lines[2]).toMatchObject({ ordered: 4, shipped: 0, backordered: 4 });
    expect(so.subtotal).toBeCloseTo(410, 2);
    expect(so.discountAmount).toBeCloseTo(10, 2);
    expect(so.tax).toBeCloseTo(24, 2);
    expect(so.total).toBeCloseTo(424, 2);
    expect(so.policySchemaVersion).toBe("1.0.0");
  });

  it("round-trips a REAL accepted EstimateEngine estimate through toSalesOrder()", () => {
    // 2 × $100 = $200 subtotal; MI jurisdiction tax computed by SalesUseTaxEngine (real seeded rate 6%).
    const est = EstimateEngine.create({
      customerId: "ACME",
      issueDate: "2026-05-29",
      lines: [{ description: "Part X", quantity: 2, unitPrice: 100 }],
      taxJurisdiction: "MI",
    });
    const accepted = EstimateEngine.transition(EstimateEngine.transition(est, "sent"), "accepted");
    const soDraft = EstimateEngine.toSalesOrder(accepted);
    const so = SalesOrderEngine.createFromEstimate(soDraft);
    expect(so.status).toBe("open");
    expect(so.fromEstimateId).toBe(accepted.estimateId);
    expect(so.lines).toHaveLength(1);
    expect(so.lines[0]).toMatchObject({ description: "Part X", ordered: 2, shipped: 0, backordered: 2 });
    // The booked total equals the estimate grandTotal (engine does not re-price).
    expect(so.total).toBeCloseTo(accepted.grandTotal, 2);
    // And it reconciles: subtotal − discount + tax == total.
    expect(so.subtotal - so.discountAmount + so.tax).toBeCloseTo(so.total, 2);
  });

  it("THROWS when line extensions do not reconcile to the draft subtotal", () => {
    const bad = draft3();
    bad.lines[0].extension = 999; // 999 + 250 + 60 = 1309 ≠ subtotal 410
    expect(() => SalesOrderEngine.createFromEstimate(bad)).toThrow(/do not reconcile/);
  });

  it("THROWS when subtotal − discount + tax does not equal the draft total", () => {
    const bad = draft3();
    bad.total = 999; // 410 − 10 + 24 = 424 ≠ 999
    expect(() => SalesOrderEngine.createFromEstimate(bad)).toThrow(/does not equal draft total/);
  });

  it("THROWS when discount exceeds subtotal", () => {
    // subtotal 410, discount 500, tax 0, total 410 − 500 + 0 = −90 (Zod nonnegative on total catches this
    // adversarial draft first — either way it fails loud, never silently accepts).
    const bad = draft3();
    bad.discountAmount = 500;
    bad.tax = 0;
    bad.total = -90;
    expect(() => SalesOrderEngine.createFromEstimate(bad)).toThrow();
  });

  it("THROWS on a negative quantity (no silent coercion — adversarial)", () => {
    const bad = draft3();
    bad.lines[0].quantity = -10;
    expect(() => SalesOrderEngine.createFromEstimate(bad)).toThrow();
  });

  it("THROWS on a non-finite (NaN/Infinity) money value (adversarial)", () => {
    const badNaN = draft3();
    badNaN.tax = Number.NaN;
    expect(() => SalesOrderEngine.createFromEstimate(badNaN)).toThrow();
    const badInf = draft3();
    badInf.lines[1].extension = Number.POSITIVE_INFINITY;
    expect(() => SalesOrderEngine.createFromEstimate(badInf)).toThrow();
  });

  it("THROWS on an empty lines array (adversarial)", () => {
    const bad = draft3();
    bad.lines = [];
    expect(() => SalesOrderEngine.createFromEstimate(bad)).toThrow();
  });
});

describe("SalesOrderEngine.recordFulfillment", () => {
  it("partial fulfill of ONE line moves status open → partial; backorder = ordered − shipped", () => {
    const so0 = SalesOrderEngine.createFromEstimate(draft3());
    // ship 4 of line0 (ordered 10) → shipped 4, backordered 6
    const so1 = SalesOrderEngine.recordFulfillment(so0, { lineIndex: 0, qtyShipped: 4 });
    expect(so1.status).toBe("partial");
    expect(so1.lines[0].shipped).toBe(4);
    expect(so1.lines[0].backordered).toBe(6); // 10 − 4
    // other lines untouched
    expect(so1.lines[1].shipped).toBe(0);
    expect(so1.lines[2].shipped).toBe(0);
    // purity: original order is not mutated
    expect(so0.lines[0].shipped).toBe(0);
    expect(so0.status).toBe("open");
  });

  it("resolves a line by exact description and accumulates across shipments", () => {
    const so0 = SalesOrderEngine.createFromEstimate(draft3());
    const so1 = SalesOrderEngine.recordFulfillment(so0, { description: "Widget B", qtyShipped: 2 }); // ordered 5
    const so2 = SalesOrderEngine.recordFulfillment(so1, { description: "Widget B", qtyShipped: 3 }); // 2+3 = 5 == ordered
    expect(so2.lines[1].shipped).toBe(5);
    expect(so2.lines[1].backordered).toBe(0);
    expect(so2.status).toBe("partial"); // lines 0 and 2 still unshipped
  });

  it("fully shipping EVERY line moves status to fulfilled", () => {
    let so = SalesOrderEngine.createFromEstimate(draft3());
    so = SalesOrderEngine.recordFulfillment(so, { lineIndex: 0, qtyShipped: 10 });
    expect(so.status).toBe("partial");
    so = SalesOrderEngine.recordFulfillment(so, { lineIndex: 1, qtyShipped: 5 });
    expect(so.status).toBe("partial");
    so = SalesOrderEngine.recordFulfillment(so, { lineIndex: 2, qtyShipped: 4 });
    expect(so.status).toBe("fulfilled");
    expect(so.lines.every((l) => l.backordered === 0)).toBe(true);
  });

  it("single fully-shipped line on a 1-line order goes open → fulfilled directly", () => {
    const oneLine: SalesOrderDraft = {
      fromEstimateId: "EST-1",
      customerId: "ACME",
      lines: [{ description: "Solo", quantity: 3, unitPrice: 7, extension: 21 }],
      subtotal: 21,
      discountAmount: 0,
      tax: 0,
      total: 21,
    };
    const so = SalesOrderEngine.recordFulfillment(SalesOrderEngine.createFromEstimate(oneLine), { lineIndex: 0, qtyShipped: 3 });
    expect(so.status).toBe("fulfilled");
    expect(so.lines[0].backordered).toBe(0);
  });

  it("THROWS on over-ship (shipping more than ordered — boundary, no silent clamp)", () => {
    const so0 = SalesOrderEngine.createFromEstimate(draft3());
    // line0 ordered 10; ship 7 then attempt 5 (7+5=12 > 10)
    const so1 = SalesOrderEngine.recordFulfillment(so0, { lineIndex: 0, qtyShipped: 7 });
    expect(() => SalesOrderEngine.recordFulfillment(so1, { lineIndex: 0, qtyShipped: 5 })).toThrow(/over-ship/);
  });

  it("THROWS on an unknown line index and an unknown description (failure modes)", () => {
    const so0 = SalesOrderEngine.createFromEstimate(draft3());
    expect(() => SalesOrderEngine.recordFulfillment(so0, { lineIndex: 9, qtyShipped: 1 })).toThrow(/out of range/);
    expect(() => SalesOrderEngine.recordFulfillment(so0, { description: "Nonexistent", qtyShipped: 1 })).toThrow(/no line matches/);
  });

  it("THROWS on a negative / non-finite qtyShipped (adversarial)", () => {
    const so0 = SalesOrderEngine.createFromEstimate(draft3());
    expect(() => SalesOrderEngine.recordFulfillment(so0, { lineIndex: 0, qtyShipped: -1 })).toThrow();
    expect(() => SalesOrderEngine.recordFulfillment(so0, { lineIndex: 0, qtyShipped: Number.NaN })).toThrow();
  });

  it("THROWS when fulfilling a fulfilled or cancelled (terminal) order", () => {
    const oneLine: SalesOrderDraft = {
      fromEstimateId: "EST-T",
      customerId: "ACME",
      lines: [{ description: "Solo", quantity: 1, unitPrice: 5, extension: 5 }],
      subtotal: 5,
      discountAmount: 0,
      tax: 0,
      total: 5,
    };
    const fulfilled = SalesOrderEngine.recordFulfillment(SalesOrderEngine.createFromEstimate(oneLine), { lineIndex: 0, qtyShipped: 1 });
    expect(fulfilled.status).toBe("fulfilled");
    expect(() => SalesOrderEngine.recordFulfillment(fulfilled, { lineIndex: 0, qtyShipped: 1 })).toThrow(/terminal status/);

    const cancelled = SalesOrderEngine.cancel(SalesOrderEngine.createFromEstimate(draft3()));
    expect(() => SalesOrderEngine.recordFulfillment(cancelled, { lineIndex: 0, qtyShipped: 1 })).toThrow(/terminal status/);
  });
});

describe("SalesOrderEngine.backorderReport", () => {
  it("computes ordered − shipped per line + rollups; fullyShipped flips when all shipped", () => {
    let so = SalesOrderEngine.createFromEstimate(draft3());
    so = SalesOrderEngine.recordFulfillment(so, { lineIndex: 0, qtyShipped: 4 }); // 10 ordered, 4 shipped → 6 back
    so = SalesOrderEngine.recordFulfillment(so, { lineIndex: 1, qtyShipped: 5 }); // 5 ordered, 5 shipped → 0 back
    const rpt = SalesOrderEngine.backorderReport(so);
    // line0: ordered 10, shipped 4, back 6 ; line1: 5/5/0 ; line2: 4/0/4
    expect(rpt.lines[0]).toMatchObject({ ordered: 10, shipped: 4, backordered: 6 });
    expect(rpt.lines[1]).toMatchObject({ ordered: 5, shipped: 5, backordered: 0 });
    expect(rpt.lines[2]).toMatchObject({ ordered: 4, shipped: 0, backordered: 4 });
    // rollups: ordered 19, shipped 9, back 10
    expect(rpt.totalOrdered).toBe(19);
    expect(rpt.totalShipped).toBe(9);
    expect(rpt.totalBackordered).toBe(10);
    // both-ways reconciliation: ordered == shipped + backordered
    expect(rpt.totalOrdered).toBe(rpt.totalShipped + rpt.totalBackordered);
    expect(rpt.fullyShipped).toBe(false);
    expect(rpt.status).toBe("partial");
  });

  it("reports zero backorder + fullyShipped once every unit ships", () => {
    let so = SalesOrderEngine.createFromEstimate(draft3());
    so = SalesOrderEngine.recordFulfillment(so, { lineIndex: 0, qtyShipped: 10 });
    so = SalesOrderEngine.recordFulfillment(so, { lineIndex: 1, qtyShipped: 5 });
    so = SalesOrderEngine.recordFulfillment(so, { lineIndex: 2, qtyShipped: 4 });
    const rpt = SalesOrderEngine.backorderReport(so);
    expect(rpt.totalBackordered).toBe(0);
    expect(rpt.fullyShipped).toBe(true);
    expect(rpt.status).toBe("fulfilled");
  });
});

describe("SalesOrderEngine FSM (cancel / transition)", () => {
  it("cancels an open order; cancelling a PARTIALLY-shipped order is allowed and keeps shipped qty flagged", () => {
    // open → cancel
    const openCancel = SalesOrderEngine.cancel(SalesOrderEngine.createFromEstimate(draft3()));
    expect(openCancel.status).toBe("cancelled");

    // partial → cancel: already-shipped units remain visible (flagged) in the backorder report
    let so = SalesOrderEngine.createFromEstimate(draft3());
    so = SalesOrderEngine.recordFulfillment(so, { lineIndex: 0, qtyShipped: 4 });
    const partialCancel = SalesOrderEngine.cancel(so);
    expect(partialCancel.status).toBe("cancelled");
    const rpt = SalesOrderEngine.backorderReport(partialCancel);
    expect(rpt.totalShipped).toBe(4); // shipped qty is NOT zeroed by the cancel
    expect(rpt.status).toBe("cancelled");
  });

  it("THROWS on an illegal FSM transition (fulfilled → cancelled, open → fulfilled-skip not via shipping)", () => {
    // build a fulfilled order, then try to cancel it
    const oneLine: SalesOrderDraft = {
      fromEstimateId: "EST-F",
      customerId: "ACME",
      lines: [{ description: "Solo", quantity: 1, unitPrice: 5, extension: 5 }],
      subtotal: 5,
      discountAmount: 0,
      tax: 0,
      total: 5,
    };
    const fulfilled = SalesOrderEngine.recordFulfillment(SalesOrderEngine.createFromEstimate(oneLine), { lineIndex: 0, qtyShipped: 1 });
    expect(() => SalesOrderEngine.cancel(fulfilled)).toThrow(/illegal status transition/);
    // explicit illegal transition: fulfilled → open
    expect(() => SalesOrderEngine.transition(fulfilled, "open")).toThrow(/illegal status transition/);
    // a same-status transition is a valid no-op
    expect(SalesOrderEngine.transition(fulfilled, "fulfilled").status).toBe("fulfilled");
  });

  it("exposes the camelCase alias bound to the class", () => {
    expect(salesOrderEngine).toBe(SalesOrderEngine);
  });
});
