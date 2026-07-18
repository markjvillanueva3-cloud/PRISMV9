/**
 * InventoryAdjustmentEngine.test.ts — QuickBooks "Adjust Quantity/Value on Hand" parity tests.
 *
 * Verifies the financial invariants of the inventory adjustment engine with REAL reference values
 * (every assertion fails if the business math changes):
 *  - GL polarity: found-stock (+) → DR asset / CR 5100; shrinkage (−) → DR 5100 / CR asset.
 *  - balanced lines (Σdebit == Σcredit) returned as DATA (engine stays pure).
 *  - both-ways reconcile: qtyBefore + qtyDelta == qtyAfter, and the value reconstructed from the
 *    returned lines (asset debit − asset credit) == the reported valueDelta.
 *  - half-even (banker's) rounding to the cent on fractional-cent unit costs.
 *  - fail-loud edges: negative unitCost, qtyAfter < 0, zero delta, non-13xx / unknown asset account,
 *    unrecognized reason, non-finite inputs.
 */
import { describe, it, expect } from "vitest";
import { InventoryAdjustmentEngine } from "../engines/InventoryAdjustmentEngine.js";

const D = "2026-05-30";

/** Sum the debit/credit sides of a posting (for the balanced-lines invariant). */
function totals(lines: { debit: number; credit: number }[]) {
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  return { debit, credit };
}

/** Net effect on a specific account (debit − credit) across the posting. */
function netOn(lines: { account: string; debit: number; credit: number }[], account: string) {
  return lines
    .filter((l) => l.account === account)
    .reduce((s, l) => s + l.debit - l.credit, 0);
}

describe("InventoryAdjustmentEngine.adjustQuantity — found stock (positive delta)", () => {
  const r = InventoryAdjustmentEngine.adjustQuantity({
    itemCode: "D2-ROUND-50",
    assetAccountId: "1320", // Raw Materials Inventory
    unitCost: 12.5,
    qtyBefore: 4,
    qtyAfter: 10,
    reason: "found_stock",
    date: D,
  });

  it("computes the value delta as (qtyAfter − qtyBefore) × unitCost", () => {
    expect(r.qtyDelta).toBe(6);
    expect(r.valueDelta).toBeCloseTo(75.0, 6); // 6 * 12.5
    expect(r.newQty).toBe(10);
    expect(r.mode).toBe("quantity");
  });

  it("posts DR inventory asset / CR 5100 Materials Expense (found-stock polarity)", () => {
    expect(r.lines).toHaveLength(2);
    expect(netOn(r.lines, "1320")).toBeCloseTo(75.0, 6); // asset debited
    expect(netOn(r.lines, "5100")).toBeCloseTo(-75.0, 6); // materials expense credited (contra)
  });

  it("returns balanced lines (Σdebit == Σcredit)", () => {
    const t = totals(r.lines);
    expect(t.debit).toBeCloseTo(75.0, 6);
    expect(t.credit).toBeCloseTo(75.0, 6);
    expect(t.debit).toBeCloseTo(t.credit, 9);
  });

  it("reconciles BOTH ways: qtyBefore + qtyDelta == qtyAfter, and lines reconstruct valueDelta", () => {
    expect(4 + r.qtyDelta).toBe(10);
    // asset-side (debit − credit) reconstructs the signed value delta
    expect(netOn(r.lines, "1320")).toBeCloseTo(r.valueDelta, 6);
  });
});

describe("InventoryAdjustmentEngine.adjustQuantity — shrinkage (negative delta)", () => {
  const r = InventoryAdjustmentEngine.adjustQuantity({
    itemCode: "S7-BLOCK",
    assetAccountId: "1320",
    unitCost: 40,
    qtyBefore: 10,
    qtyAfter: 7,
    reason: "shrinkage",
    date: D,
  });

  it("computes a negative value delta", () => {
    expect(r.qtyDelta).toBe(-3);
    expect(r.valueDelta).toBeCloseTo(-120.0, 6); // -3 * 40
    expect(r.newQty).toBe(7);
  });

  it("posts DR 5100 Materials Expense / CR inventory asset (shrinkage polarity)", () => {
    expect(netOn(r.lines, "5100")).toBeCloseTo(120.0, 6); // materials expense debited (loss)
    expect(netOn(r.lines, "1320")).toBeCloseTo(-120.0, 6); // asset credited (reduced)
    const t = totals(r.lines);
    expect(t.debit).toBeCloseTo(t.credit, 9);
    expect(t.debit).toBeCloseTo(120.0, 6);
  });

  it("reconciles BOTH ways for a write-down", () => {
    expect(10 + r.qtyDelta).toBe(7);
    expect(netOn(r.lines, "1320")).toBeCloseTo(r.valueDelta, 6); // signed asset-side == valueDelta
  });
});

describe("InventoryAdjustmentEngine.adjustQuantity — qtyAfter zero (full write-off allowed)", () => {
  it("allows qtyAfter == 0 (writing off all on-hand stock)", () => {
    const r = InventoryAdjustmentEngine.adjustQuantity({
      itemCode: "OBSOLETE-1",
      assetAccountId: "1310", // Finished Goods Inventory
      unitCost: 5,
      qtyBefore: 8,
      qtyAfter: 0,
      reason: "obsolescence",
      date: D,
    });
    expect(r.qtyDelta).toBe(-8);
    expect(r.valueDelta).toBeCloseTo(-40.0, 6);
    expect(r.newQty).toBe(0);
    expect(netOn(r.lines, "1310")).toBeCloseTo(-40.0, 6);
  });
});

describe("InventoryAdjustmentEngine.adjustQuantity — fractional-cent unit cost (half-even rounding)", () => {
  it("rounds a half-cent tie to even DOWN and keeps lines balanced (12.5¢ → 0.12)", () => {
    // qtyDelta = 1, unitCost = 0.125 → 0.125 → 12.5¢ tie → floor 12 (even) → 0.12
    const r = InventoryAdjustmentEngine.adjustQuantity({
      itemCode: "WASHER",
      assetAccountId: "1320",
      unitCost: 0.125,
      qtyBefore: 0,
      qtyAfter: 1,
      reason: "physical_count",
      date: D,
    });
    expect(r.valueDelta).toBeCloseTo(0.12, 9);
    const t = totals(r.lines);
    expect(t.debit).toBeCloseTo(t.credit, 9);
    expect(t.debit).toBeCloseTo(0.12, 9);
  });

  it("rounds a half-cent tie to even UP and keeps lines balanced (37.5¢ → 0.38)", () => {
    // qtyDelta = 3, unitCost = 0.125 → 0.375 → 37.5¢ tie → floor 37 (odd) → 38 → 0.38
    const r = InventoryAdjustmentEngine.adjustQuantity({
      itemCode: "WASHER",
      assetAccountId: "1320",
      unitCost: 0.125,
      qtyBefore: 0,
      qtyAfter: 3,
      reason: "physical_count",
      date: D,
    });
    expect(r.valueDelta).toBeCloseTo(0.38, 9);
    expect(netOn(r.lines, "1320")).toBeCloseTo(0.38, 9);
    expect(netOn(r.lines, "5100")).toBeCloseTo(-0.38, 9);
  });
});

describe("InventoryAdjustmentEngine.adjustValue — value revaluation at fixed qty", () => {
  it("write-down: posts DR 5100 / CR asset, qtyDelta == 0, reconciles from lines", () => {
    const r = InventoryAdjustmentEngine.adjustValue({
      itemCode: "ALUM-PLATE",
      assetAccountId: "1320",
      qty: 20,
      valueBefore: 1000,
      valueAfter: 850.5,
      reason: "revaluation",
      date: D,
    });
    expect(r.qtyDelta).toBe(0);
    expect(r.newQty).toBe(20);
    expect(r.valueDelta).toBeCloseTo(-149.5, 6); // 850.50 - 1000
    expect(r.mode).toBe("value");
    expect(netOn(r.lines, "5100")).toBeCloseTo(149.5, 6); // expense debited
    expect(netOn(r.lines, "1320")).toBeCloseTo(-149.5, 6); // asset credited
    // reconstruct: signed asset-side == reported delta
    expect(netOn(r.lines, "1320")).toBeCloseTo(r.valueDelta, 6);
  });

  it("write-up: posts DR asset / CR 5100", () => {
    const r = InventoryAdjustmentEngine.adjustValue({
      itemCode: "ALUM-PLATE",
      assetAccountId: "1300", // WIP Inventory
      qty: 5,
      valueBefore: 200,
      valueAfter: 275,
      reason: "correction",
      date: D,
    });
    expect(r.valueDelta).toBeCloseTo(75.0, 6);
    expect(netOn(r.lines, "1300")).toBeCloseTo(75.0, 6);
    expect(netOn(r.lines, "5100")).toBeCloseTo(-75.0, 6);
    const t = totals(r.lines);
    expect(t.debit).toBeCloseTo(t.credit, 9);
  });
});

describe("InventoryAdjustmentEngine — fail-loud invariants (throw paths)", () => {
  it("throws on negative unitCost", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1320",
        unitCost: -5,
        qtyBefore: 0,
        qtyAfter: 3,
        reason: "physical_count",
        date: D,
      })
    ).toThrow();
  });

  it("throws on zero unitCost (must be > 0)", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1320",
        unitCost: 0,
        qtyBefore: 0,
        qtyAfter: 3,
        reason: "physical_count",
        date: D,
      })
    ).toThrow();
  });

  it("throws on qtyAfter < 0 (on-hand cannot go negative)", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1320",
        unitCost: 10,
        qtyBefore: 5,
        qtyAfter: -2,
        reason: "shrinkage",
        date: D,
      })
    ).toThrow(/qtyAfter/);
  });

  it("throws on a zero value delta (no-op adjustment is an error)", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1320",
        unitCost: 10,
        qtyBefore: 5,
        qtyAfter: 5,
        reason: "physical_count",
        date: D,
      })
    ).toThrow(/zero value delta/);
  });

  it("throws on a zero-delta value revaluation", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustValue({
        itemCode: "X",
        assetAccountId: "1320",
        qty: 10,
        valueBefore: 500,
        valueAfter: 500,
        reason: "revaluation",
        date: D,
      })
    ).toThrow(/zero value delta/);
  });

  it("throws on a non-13xx asset account (e.g. 1000 Cash)", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1000",
        unitCost: 10,
        qtyBefore: 0,
        qtyAfter: 3,
        reason: "physical_count",
        date: D,
      })
    ).toThrow(/not an inventory-asset account/);
  });

  it("throws on a non-13xx asset account (e.g. 1500 Equipment)", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1500",
        unitCost: 10,
        qtyBefore: 0,
        qtyAfter: 3,
        reason: "physical_count",
        date: D,
      })
    ).toThrow(/not an inventory-asset account/);
  });

  it("throws on a 13xx account id that doesn't exist in the GL chart (e.g. 1399)", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1399",
        unitCost: 10,
        qtyBefore: 0,
        qtyAfter: 3,
        reason: "physical_count",
        date: D,
      })
    ).toThrow(/does not exist in the GL chart/);
  });

  it("throws on an unrecognized reason", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1320",
        unitCost: 10,
        qtyBefore: 0,
        qtyAfter: 3,
        reason: "because_i_said_so",
        date: D,
      })
    ).toThrow(/unknown reason/);
  });

  it("throws on a non-finite unitCost (NaN)", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1320",
        unitCost: NaN,
        qtyBefore: 0,
        qtyAfter: 3,
        reason: "physical_count",
        date: D,
      })
    ).toThrow();
  });

  it("throws on a non-finite qtyAfter (Infinity)", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1320",
        unitCost: 10,
        qtyBefore: 0,
        qtyAfter: Infinity,
        reason: "physical_count",
        date: D,
      })
    ).toThrow();
  });

  it("throws on a malformed date", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustQuantity({
        itemCode: "X",
        assetAccountId: "1320",
        unitCost: 10,
        qtyBefore: 0,
        qtyAfter: 3,
        reason: "physical_count",
        date: "05/30/2026",
      })
    ).toThrow();
  });

  it("throws on a negative valueBefore in a revaluation", () => {
    expect(() =>
      InventoryAdjustmentEngine.adjustValue({
        itemCode: "X",
        assetAccountId: "1320",
        qty: 10,
        valueBefore: -100,
        valueAfter: 50,
        reason: "revaluation",
        date: D,
      })
    ).toThrow();
  });
});

describe("InventoryAdjustmentEngine — result metadata", () => {
  it("carries itemCode, reason, date, resolved assetAccountId, and policy schema version", () => {
    const r = InventoryAdjustmentEngine.adjustQuantity({
      itemCode: "D2-ROUND-50",
      assetAccountId: "1320",
      unitCost: 12.5,
      qtyBefore: 4,
      qtyAfter: 10,
      reason: "found_stock",
      date: D,
    });
    expect(r.itemCode).toBe("D2-ROUND-50");
    expect(r.reason).toBe("found_stock");
    expect(r.date).toBe(D);
    expect(r.assetAccountId).toBe("1320");
    expect(r.policySchemaVersion).toBe("1.0.0");
  });
});
