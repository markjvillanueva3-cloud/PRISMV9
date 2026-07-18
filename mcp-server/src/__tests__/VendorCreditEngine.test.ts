/**
 * VendorCreditEngine tests — QuickBooks "Vendor Credit" parity (A/P mirror of CreditMemoEngine).
 *
 * Reference values are HAND-COMPUTED against the imported MI/IN rates (sales-tax-rates.ts:
 * MI=6%, IN=7%) and the half-even rounding rule (roundCentsHalfEven). No toBeDefined() stubs:
 * every assertion encodes a concrete dollar amount or a concrete failure mode.
 */
import { describe, it, expect } from "vitest";
import {
  VendorCreditEngine,
  vendorCreditEngine,
  type VendorCredit,
} from "../engines/VendorCreditEngine.js";
import { VENDOR_CREDIT_ACCOUNTS } from "../data/vendor-credit-policy.js";

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

/** MI vendor credit: 10×$50.00 + 2×$125.50 = $751.00 subtotal; MI 6% tax = $45.06; total $796.06. */
function miCredit(): VendorCredit {
  return VendorCreditEngine.create({
    vendorCreditId: "VC-ACME-001",
    vendorId: "ACME-STEEL",
    reason: "return_to_vendor",
    lines: [
      { description: "1018 CRS bar 1in", quantity: 10, unitPrice: 50.0 },
      { description: "4140 PH plate", quantity: 2, unitPrice: 125.5 },
    ],
    taxJurisdiction: "MI",
  });
}

// ---------------------------------------------------------------------------
// create() — happy path
// ---------------------------------------------------------------------------

describe("VendorCreditEngine.create", () => {
  it("computes subtotal/tax/total with MI 6% tax (hand-computed: 751.00 + 45.06 = 796.06)", () => {
    const vc = miCredit();
    expect(vc.subtotal).toBeCloseTo(751.0, 2);
    expect(vc.tax).toBeCloseTo(45.06, 2); // 751.00 * 0.06 = 45.06
    expect(vc.total).toBeCloseTo(796.06, 2);
    expect(vc.lines[0].extension).toBeCloseTo(500.0, 2);
    expect(vc.lines[1].extension).toBeCloseTo(251.0, 2);
    expect(vc.applied).toBe(0);
    expect(vc.unapplied).toBeCloseTo(796.06, 2);
    expect(vc.taxJurisdiction).toBe("MI");
    expect(vc.reason).toBe("return_to_vendor");
    expect(vc.policySchemaVersion).toBe("1.0.0");
  });

  it("reconciles total == subtotal + tax exactly (both-way money invariant)", () => {
    const vc = miCredit();
    expect(vc.total).toBeCloseTo(vc.subtotal + vc.tax, 2);
  });

  it("no jurisdiction => zero tax, total == subtotal (untaxed vendor credit)", () => {
    const vc = VendorCreditEngine.create({
      vendorId: "ACME-STEEL",
      reason: "vendor_refund",
      lines: [{ description: "short shipment refund", quantity: 1, unitPrice: 400.0 }],
    });
    expect(vc.subtotal).toBeCloseTo(400.0, 2);
    expect(vc.tax).toBe(0);
    expect(vc.total).toBeCloseTo(400.0, 2);
    expect(vc.taxJurisdiction).toBeNull();
    expect(vc.vendorCreditId).toBe("VC-ACME-STEEL-vendor_refund"); // default id
  });

  it("respects taxable=false lines — IN 7% taxes only the taxable base ($100 of $300)", () => {
    // 4 x $25.00 taxable = $100.00 ; 1 x $200.00 non-taxable. subtotal $300, tax 100*0.07=$7.00, total $307.
    const vc = VendorCreditEngine.create({
      vendorId: "TOOLCO",
      reason: "overbilling",
      lines: [
        { description: "endmills (taxable)", quantity: 4, unitPrice: 25.0, taxable: true },
        { description: "freight (exempt)", quantity: 1, unitPrice: 200.0, taxable: false },
      ],
      taxJurisdiction: "IN",
    });
    expect(vc.subtotal).toBeCloseTo(300.0, 2);
    expect(vc.tax).toBeCloseTo(7.0, 2);
    expect(vc.total).toBeCloseTo(307.0, 2);
  });

  it("half-even (banker's) rounding: ties round to even (0.025=>0.02, 0.075=>0.08)", () => {
    const lo = VendorCreditEngine.create({
      vendorId: "V", reason: "price_adjustment",
      lines: [{ description: "tie-low", quantity: 5, unitPrice: 0.005 }], // 0.025 -> half-even -> 0.02
    });
    expect(lo.subtotal).toBeCloseTo(0.02, 2);
    const hi = VendorCreditEngine.create({
      vendorId: "V", reason: "price_adjustment",
      lines: [{ description: "tie-high", quantity: 5, unitPrice: 0.015 }], // 0.075 -> half-even -> 0.08
    });
    expect(hi.subtotal).toBeCloseTo(0.08, 2);
  });

  it("exports a camelCase alias bound to the class", () => {
    expect(vendorCreditEngine).toBe(VendorCreditEngine);
  });
});

// ---------------------------------------------------------------------------
// create() — failure & adversarial modes
// ---------------------------------------------------------------------------

describe("VendorCreditEngine.create — failure modes", () => {
  it("THROWS on an unknown reason (audit-trail gate, no silent A/P reversal)", () => {
    expect(() =>
      VendorCreditEngine.create({
        vendorId: "ACME", reason: "because_i_said_so",
        lines: [{ description: "x", quantity: 1, unitPrice: 10 }],
      })
    ).toThrow(/unknown reason/i);
  });

  it("THROWS on an unknown tax jurisdiction (silent 0% would under-reverse use-tax)", () => {
    expect(() =>
      VendorCreditEngine.create({
        vendorId: "ACME", reason: "return_to_vendor",
        lines: [{ description: "x", quantity: 1, unitPrice: 10 }],
        taxJurisdiction: "ZZ", // not in SALES_TAX_RATES
      })
    ).toThrow(/unknown jurisdiction/i);
  });

  it("THROWS on empty lines (zod .min(1))", () => {
    expect(() =>
      VendorCreditEngine.create({ vendorId: "ACME", reason: "vendor_refund", lines: [] })
    ).toThrow();
  });

  it("THROWS on a negative quantity (no silent coercion — adversarial)", () => {
    expect(() =>
      VendorCreditEngine.create({
        vendorId: "ACME", reason: "vendor_refund",
        lines: [{ description: "x", quantity: -3, unitPrice: 10 }],
      })
    ).toThrow();
  });

  it("THROWS on a NaN unitPrice (non-finite — adversarial)", () => {
    expect(() =>
      VendorCreditEngine.create({
        vendorId: "ACME", reason: "vendor_refund",
        lines: [{ description: "x", quantity: 1, unitPrice: Number.NaN }],
      })
    ).toThrow();
  });

  it("THROWS on an Infinity quantity (non-finite — adversarial)", () => {
    expect(() =>
      VendorCreditEngine.create({
        vendorId: "ACME", reason: "vendor_refund",
        lines: [{ description: "x", quantity: Number.POSITIVE_INFINITY, unitPrice: 10 }],
      })
    ).toThrow();
  });

  it("THROWS when the total is non-positive (a $0 credit reverses nothing)", () => {
    // unitPrice 0 is allowed at the line level (nonnegative) but a wholly-$0 credit must throw.
    expect(() =>
      VendorCreditEngine.create({
        vendorId: "ACME", reason: "vendor_refund",
        lines: [{ description: "zero", quantity: 1, unitPrice: 0 }],
      })
    ).toThrow(/must be positive/i);
  });
});

// ---------------------------------------------------------------------------
// applyToBill() — application + dual ceilings + immutability
// ---------------------------------------------------------------------------

describe("VendorCreditEngine.applyToBill", () => {
  it("partial apply reduces the bill balance and tracks unapplied (immutable)", () => {
    const vc = miCredit(); // total 796.06
    const { vendorCredit: after, application } = VendorCreditEngine.applyToBill(vc, {
      billId: "BILL-100",
      billBalance: 1000.0,
      amount: 300.0,
    });
    expect(application.amount).toBeCloseTo(300.0, 2);
    expect(application.billBalanceAfter).toBeCloseTo(700.0, 2);
    expect(after.applied).toBeCloseTo(300.0, 2);
    expect(after.unapplied).toBeCloseTo(496.06, 2); // 796.06 - 300.00
    // immutability: the original is untouched
    expect(vc.applied).toBe(0);
    expect(vc.unapplied).toBeCloseTo(796.06, 2);
    expect(vc.applications.length).toBe(0);
    expect(after.applications.length).toBe(1);
  });

  it("full apply to a larger bill drives unapplied to exactly 0", () => {
    const vc = miCredit(); // total 796.06
    const { vendorCredit: after } = VendorCreditEngine.applyToBill(vc, {
      billId: "BILL-200",
      billBalance: 2000.0,
      amount: 796.06,
    });
    expect(after.applied).toBeCloseTo(796.06, 2);
    expect(after.unapplied).toBe(0);
    expect(VendorCreditEngine.remainingCredit(after)).toBe(0);
  });

  it("two sequential partial applies accumulate and reconcile both ways", () => {
    const vc = miCredit(); // total 796.06
    const step1 = VendorCreditEngine.applyToBill(vc, { billId: "B1", billBalance: 500, amount: 200 }).vendorCredit;
    const step2 = VendorCreditEngine.applyToBill(step1, { billId: "B2", billBalance: 600, amount: 300 }).vendorCredit;
    expect(step2.applied).toBeCloseTo(500.0, 2);
    expect(step2.unapplied).toBeCloseTo(296.06, 2); // 796.06 - 500.00
    expect(step2.applications.map((a) => a.billId)).toEqual(["B1", "B2"]);
    // both-way reconcile: applied + unapplied == total
    expect(step2.applied + step2.unapplied).toBeCloseTo(step2.total, 2);
  });

  it("THROWS over-apply on ceiling 1 — amount exceeds remaining credit", () => {
    const vc = miCredit(); // remaining 796.06
    expect(() =>
      VendorCreditEngine.applyToBill(vc, { billId: "BILL-X", billBalance: 5000.0, amount: 900.0 })
    ).toThrow(/exceeds remaining credit/i);
  });

  it("THROWS over-apply on ceiling 2 — amount exceeds bill balance", () => {
    const vc = miCredit(); // remaining 796.06 (>= 100), bill only owes 100
    expect(() =>
      VendorCreditEngine.applyToBill(vc, { billId: "BILL-Y", billBalance: 100.0, amount: 150.0 })
    ).toThrow(/exceeds bill .* balance/i);
  });

  it("THROWS on a non-positive amount", () => {
    const vc = miCredit();
    expect(() => VendorCreditEngine.applyToBill(vc, { billId: "B", billBalance: 100, amount: 0 })).toThrow(/positive/i);
  });

  it("THROWS on a NaN amount (adversarial)", () => {
    const vc = miCredit();
    expect(() =>
      VendorCreditEngine.applyToBill(vc, { billId: "B", billBalance: 100, amount: Number.NaN })
    ).toThrow(/non-finite/i);
  });

  it("THROWS on a negative bill balance (adversarial)", () => {
    const vc = miCredit();
    expect(() =>
      VendorCreditEngine.applyToBill(vc, { billId: "B", billBalance: -50, amount: 10 })
    ).toThrow(/non-negative/i);
  });

  it("THROWS on a missing billId", () => {
    const vc = miCredit();
    expect(() =>
      VendorCreditEngine.applyToBill(vc, { billId: "", billBalance: 100, amount: 10 })
    ).toThrow(/billId is required/i);
  });
});

// ---------------------------------------------------------------------------
// glLinesForIssue() — balanced reversal of the original purchase
// ---------------------------------------------------------------------------

describe("VendorCreditEngine.glLinesForIssue", () => {
  it("reverses the purchase: DR 2000 AP (total) / CR 1320 Raw (subtotal) + CR 2100 Tax (tax), balanced", () => {
    const vc = miCredit(); // subtotal 751.00, tax 45.06, total 796.06
    const { lines, totalDebit, totalCredit } = VendorCreditEngine.glLinesForIssue(vc);

    const ap = lines.find((l) => l.account === VENDOR_CREDIT_ACCOUNTS.ACCOUNTS_PAYABLE.number)!;
    const raw = lines.find((l) => l.account === VENDOR_CREDIT_ACCOUNTS.RAW_MATERIALS.number)!;
    const tax = lines.find((l) => l.account === VENDOR_CREDIT_ACCOUNTS.TAX_PAYABLE.number)!;

    expect(ap.debit).toBeCloseTo(796.06, 2); // DR AP = total
    expect(ap.credit).toBe(0);
    expect(raw.credit).toBeCloseTo(751.0, 2); // CR Raw Materials = subtotal
    expect(raw.debit).toBe(0);
    expect(tax.credit).toBeCloseTo(45.06, 2); // CR Tax Payable = tax
    expect(tax.debit).toBe(0);

    // Σdebits == Σcredits == total
    expect(totalDebit).toBeCloseTo(796.06, 2);
    expect(totalCredit).toBeCloseTo(796.06, 2);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
  });

  it("omits the tax leg entirely when there is no tax (2 lines, still balanced)", () => {
    const vc = VendorCreditEngine.create({
      vendorId: "ACME", reason: "vendor_refund",
      lines: [{ description: "refund", quantity: 1, unitPrice: 400.0 }],
    });
    const { lines, totalDebit, totalCredit } = VendorCreditEngine.glLinesForIssue(vc);
    expect(lines.length).toBe(2); // AP debit + Raw credit only
    expect(lines.some((l) => l.account === VENDOR_CREDIT_ACCOUNTS.TAX_PAYABLE.number)).toBe(false);
    expect(totalDebit).toBeCloseTo(400.0, 2);
    expect(totalCredit).toBeCloseTo(400.0, 2);
  });

  it("the GL reversal total equals the create() total exactly (cross-method invariant)", () => {
    const vc = VendorCreditEngine.create({
      vendorId: "TOOLCO", reason: "damaged_goods",
      lines: [{ description: "carbide inserts", quantity: 3, unitPrice: 33.33 }],
      taxJurisdiction: "IN", // 7%
    });
    // subtotal = 99.99, tax = 99.99*0.07 = 6.9993 -> 7.00 (half-even), total = 106.99
    expect(vc.subtotal).toBeCloseTo(99.99, 2);
    expect(vc.tax).toBeCloseTo(7.0, 2);
    expect(vc.total).toBeCloseTo(106.99, 2);
    const gl = VendorCreditEngine.glLinesForIssue(vc);
    expect(gl.totalDebit).toBeCloseTo(vc.total, 2);
    expect(gl.totalCredit).toBeCloseTo(vc.total, 2);
  });

  it("default (no category) reverses to 1320 Raw Materials (legacy back-compat)", () => {
    const vc = miCredit(); // no category given
    expect(vc.category).toBe("materials");
    expect(vc.reversalAccount.number).toBe("1320");
    const { lines } = VendorCreditEngine.glLinesForIssue(vc);
    const reversal = lines.find((l) => l.credit > 0 && l.account !== VENDOR_CREDIT_ACCOUNTS.TAX_PAYABLE.number)!;
    expect(reversal.account).toBe("1320"); // Raw Materials Inventory
    expect(reversal.credit).toBeCloseTo(751.0, 2); // subtotal
  });
});

// ---------------------------------------------------------------------------
// glLinesForIssue() — reversal account follows the original purchase CATEGORY
// (regression guard for the "balanced-but-wrong-account" silent-misstatement class)
// ---------------------------------------------------------------------------

describe("VendorCreditEngine.glLinesForIssue — category-routed reversal account", () => {
  /** Build a single-line, untaxed vendor credit of `amount` for `category`. */
  function catCredit(category: string, amount: number) {
    return VendorCreditEngine.create({
      vendorId: "VEND", reason: "return_to_vendor",
      lines: [{ description: `RTV ${category}`, quantity: 1, unitPrice: amount }],
      // no jurisdiction -> tax 0, so the lone reversal credit == subtotal == amount
      category,
    });
  }

  it("tools reversal credits 5600 Tools & Consumables Expense (NOT 1320) — balanced", () => {
    const vc = catCredit("tools", 1000.0);
    expect(vc.category).toBe("tools");
    expect(vc.reversalAccount.number).toBe("5600");
    const { lines, totalDebit, totalCredit } = VendorCreditEngine.glLinesForIssue(vc);
    const ap = lines.find((l) => l.account === VENDOR_CREDIT_ACCOUNTS.ACCOUNTS_PAYABLE.number)!;
    const reversal = lines.find((l) => l.account === "5600")!;
    // The wrong-account bug: this credit must NOT land on 1320.
    expect(lines.some((l) => l.account === "1320")).toBe(false);
    expect(ap.debit).toBeCloseTo(1000.0, 2); // DR 2000 AP = total
    expect(reversal.credit).toBeCloseTo(1000.0, 2); // CR 5600 = subtotal
    expect(reversal.debit).toBe(0);
    expect(totalDebit).toBeCloseTo(1000.0, 2);
    expect(totalCredit).toBeCloseTo(1000.0, 2);
  });

  it("consumables reversal also credits 5600 (shares the tools account)", () => {
    const vc = catCredit("consumables", 250.0);
    expect(vc.reversalAccount.number).toBe("5600");
    const { lines } = VendorCreditEngine.glLinesForIssue(vc);
    expect(lines.find((l) => l.credit > 0)!.account).toBe("5600");
  });

  it("equipment reversal credits 1500 Equipment (capital) — NOT 1320", () => {
    const vc = catCredit("equipment", 5000.0);
    expect(vc.reversalAccount.number).toBe("1500");
    const { lines, totalDebit, totalCredit } = VendorCreditEngine.glLinesForIssue(vc);
    expect(lines.some((l) => l.account === "1320")).toBe(false);
    expect(lines.find((l) => l.account === "1500")!.credit).toBeCloseTo(5000.0, 2);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
  });

  it("services reversal credits 5500 Operating Expenses", () => {
    const vc = catCredit("services", 320.0);
    expect(vc.reversalAccount.number).toBe("5500");
    expect(VendorCreditEngine.glLinesForIssue(vc).lines.find((l) => l.credit > 0)!.account).toBe("5500");
  });

  it("other reversal credits 5500 Operating Expenses (same as services)", () => {
    const vc = catCredit("other", 75.0);
    expect(vc.reversalAccount.number).toBe("5500");
    expect(VendorCreditEngine.glLinesForIssue(vc).lines.find((l) => l.credit > 0)!.account).toBe("5500");
  });

  it("a category-routed reversal stays balanced WITH a tax leg too", () => {
    // tools RTV, MI 6%: subtotal 1000, tax 60.00, total 1060.00 — reversal must hit 5600 + 2100.
    const vc = VendorCreditEngine.create({
      vendorId: "VEND", reason: "return_to_vendor",
      lines: [{ description: "endmills", quantity: 1, unitPrice: 1000.0 }],
      taxJurisdiction: "MI",
      category: "tools",
    });
    expect(vc.tax).toBeCloseTo(60.0, 2);
    expect(vc.total).toBeCloseTo(1060.0, 2);
    const { lines, totalDebit, totalCredit } = VendorCreditEngine.glLinesForIssue(vc);
    expect(lines.find((l) => l.account === "5600")!.credit).toBeCloseTo(1000.0, 2);
    expect(lines.find((l) => l.account === VENDOR_CREDIT_ACCOUNTS.TAX_PAYABLE.number)!.credit).toBeCloseTo(60.0, 2);
    expect(lines.some((l) => l.account === "1320")).toBe(false);
    expect(totalDebit).toBeCloseTo(1060.0, 2);
    expect(totalCredit).toBeCloseTo(1060.0, 2);
  });

  it("THROWS on an unknown category (fail-loud — no silent fallback to a wrong account)", () => {
    expect(() =>
      VendorCreditEngine.create({
        vendorId: "VEND", reason: "return_to_vendor",
        lines: [{ description: "x", quantity: 1, unitPrice: 10 }],
        category: "widgets", // not in VENDOR_CREDIT_CATEGORIES
      })
    ).toThrow(/unknown category/i);
  });
});

// ---------------------------------------------------------------------------
// remainingCredit()
// ---------------------------------------------------------------------------

describe("VendorCreditEngine.remainingCredit", () => {
  it("returns the unapplied balance and THROWS on an invalid credit", () => {
    const vc = miCredit();
    expect(VendorCreditEngine.remainingCredit(vc)).toBeCloseTo(796.06, 2);
    // @ts-expect-error adversarial: pass garbage
    expect(() => VendorCreditEngine.remainingCredit({ unapplied: Number.NaN })).toThrow(/invalid vendor credit/i);
  });
});
