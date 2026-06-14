import { describe, it, expect } from "vitest";
import { Form1099NECEngine as F } from "../engines/Form1099NECEngine.js";

// All reference values hand-computed against IRS Form 1099-NEC rules (TY2025 box-1 threshold = $600).
const individual = (over: Record<string, unknown> = {}) => ({ payeeId: "p1", legalName: "Jane Welder", tin: "123456789", entityType: "individual", ...over });
const check = (amount: number, payeeId = "p1") => ({ payeeId, amount, paymentMethod: "check" });

describe("Form1099NECEngine.generate1099NEC — box-1 threshold", () => {
  it("a $5,000 check to an individual is reportable in box 1", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(5000)] });
    expect(r.forms).toHaveLength(1);
    expect(r.forms[0].box1NonemployeeCompensation).toBe(5000);
    expect(r.forms[0].box).toBe(1);
    expect(r.forms[0].reason).toBe("threshold_met");
    expect(r.summary).toEqual({ payeesConsidered: 1, formCount: 1, totalBox1: 5000, totalBox4: 0 });
  });

  it("$599.99 is under the $600 threshold → no form", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(599.99)] });
    expect(r.forms).toHaveLength(0);
    expect(r.notReportable).toEqual([{ payeeId: "p1", reportablePaymentTotal: 599.99, reason: "under_threshold" }]);
  });

  it("$600.00 exactly meets the threshold → reportable", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(600)] });
    expect(r.forms).toHaveLength(1);
    expect(r.forms[0].box1NonemployeeCompensation).toBe(600);
  });

  it("aggregates multiple payments to one payee ($300 + $400 = $700 → reportable)", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(300), check(400)] });
    expect(r.forms[0].box1NonemployeeCompensation).toBe(700);
  });

  it("a refund/reversal nets down the annual total ($5000 + (-$1000) = $4000)", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(5000), check(-1000)] });
    expect(r.forms[0].box1NonemployeeCompensation).toBe(4000);
  });
});

describe("Form1099NECEngine.generate1099NEC — corporation exemption + attorney exception", () => {
  it("a C-corporation is exempt (no 1099-NEC) for ordinary services", () => {
    const r = F.generate1099NEC({
      taxYear: 2025,
      payees: [{ payeeId: "c1", legalName: "Acme Tooling Inc", tin: "987654321", entityType: "c_corporation" }],
      payments: [check(10000, "c1")],
    });
    expect(r.forms).toHaveLength(0);
    expect(r.notReportable[0]).toEqual({ payeeId: "c1", reportablePaymentTotal: 10000, reason: "corporation_exempt" });
  });

  it("attorney legal-services fees ARE reportable even to a corporation (box 1 exception)", () => {
    const r = F.generate1099NEC({
      taxYear: 2025,
      payees: [{ payeeId: "law1", legalName: "Dewey Cheatem LLC", tin: "987654321", entityType: "c_corporation", paymentCategory: "attorney_legal_services" }],
      payments: [check(5000, "law1")],
    });
    expect(r.forms).toHaveLength(1);
    expect(r.forms[0].box1NonemployeeCompensation).toBe(5000);
    expect(r.forms[0].reason).toBe("attorney_corp_exception");
  });
});

describe("Form1099NECEngine.generate1099NEC — payment-card exclusion (Reg. §1.6041-1)", () => {
  it("payments made entirely by credit card are excluded (reported on 1099-K, not NEC)", () => {
    const r = F.generate1099NEC({
      taxYear: 2025,
      payees: [{ payeeId: "p1", legalName: "Jane Welder", entityType: "individual" }], // no TIN needed — no form filed
      payments: [{ payeeId: "p1", amount: 5000, paymentMethod: "credit_card" }],
    });
    expect(r.forms).toHaveLength(0);
    expect(r.notReportable[0]).toEqual({ payeeId: "p1", reportablePaymentTotal: 0, reason: "all_payments_card_excluded" });
  });

  it("mixed pay: only the check portion is box-1; the card portion is tracked but excluded", () => {
    const r = F.generate1099NEC({
      taxYear: 2025,
      payees: [individual()],
      payments: [check(5000), { payeeId: "p1", amount: 2000, paymentMethod: "credit_card" }],
    });
    expect(r.forms[0].box1NonemployeeCompensation).toBe(5000);
    expect(r.forms[0].excludedPaymentTotal).toBe(2000);
  });
});

describe("Form1099NECEngine.generate1099NEC — backup withholding override", () => {
  it("a payee under $600 WITH backup withholding must still be filed (box 4)", () => {
    const r = F.generate1099NEC({
      taxYear: 2025,
      payees: [individual({ federalTaxWithheld: 96 })],
      payments: [check(400)],
    });
    expect(r.forms).toHaveLength(1);
    expect(r.forms[0].reason).toBe("backup_withholding");
    expect(r.forms[0].box4FederalTaxWithheld).toBe(96);
    expect(r.forms[0].box1NonemployeeCompensation).toBe(400);
    expect(r.summary.totalBox4).toBe(96);
  });
});

describe("Form1099NECEngine — TIN masking (PII §8.2)", () => {
  it("masks an SSN to last-4 in SSN format and never emits the raw TIN", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(5000)] });
    expect(r.forms[0].tinMasked).toBe("***-**-6789");
    expect(JSON.stringify(r)).not.toContain("123456789"); // raw TIN absent from the entire filing object
  });

  it("masks an EIN to last-4 in EIN format", () => {
    expect(F.maskTin("98-7654321", "c_corporation")).toBe("**-***4321");
    expect(F.maskTin("987654321", "partnership")).toBe("**-***4321");
  });

  it("masks SSN format for an individual / sole proprietor", () => {
    expect(F.maskTin("123-45-6789", "individual")).toBe("***-**-6789");
    expect(F.maskTin("123456789", "sole_proprietor")).toBe("***-**-6789");
  });
});

describe("Form1099NECEngine — tax-year-keyed threshold change (H.R.1 2025)", () => {
  it("TY2026 threshold is $2,000 — a $1,500 payment is under it", () => {
    const r = F.generate1099NEC({ taxYear: 2026, payees: [individual()], payments: [check(1500)] });
    expect(r.threshold).toBe(2000);
    expect(r.forms).toHaveLength(0);
    expect(r.notReportable[0].reason).toBe("under_threshold");
  });

  it("TY2026 $2,000 exactly is reportable", () => {
    const r = F.generate1099NEC({ taxYear: 2026, payees: [individual()], payments: [check(2000)] });
    expect(r.forms).toHaveLength(1);
    expect(r.forms[0].box1NonemployeeCompensation).toBe(2000);
  });

  it("TY2025 threshold remains $600", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(1500)] });
    expect(r.threshold).toBe(600);
    expect(r.forms).toHaveLength(1);
  });
});

describe("Form1099NECEngine — half-even rounding in aggregation", () => {
  it("rounds a .xx5 running total to even ($1000.125 → $1000.12)", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(1000.125)] });
    expect(r.forms[0].box1NonemployeeCompensation).toBe(1000.12);
  });
  it("rounds the other tie direction ($1000.135 → $1000.14)", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(1000.135)] });
    expect(r.forms[0].box1NonemployeeCompensation).toBe(1000.14);
  });
});

describe("Form1099NECEngine — multi-payee filing summary", () => {
  it("aggregates box totals and form count across payees", () => {
    const r = F.generate1099NEC({
      taxYear: 2025,
      payees: [
        individual(),
        { payeeId: "p2", legalName: "Bob Grinder", tin: "111223333", entityType: "sole_proprietor", federalTaxWithheld: 48 },
        { payeeId: "c1", legalName: "Acme Inc", tin: "987654321", entityType: "c_corporation" }, // exempt
      ],
      payments: [check(5000, "p1"), check(800, "p2")],
    });
    expect(r.summary.formCount).toBe(2);
    expect(r.summary.totalBox1).toBe(5800);
    expect(r.summary.totalBox4).toBe(48);
    expect(r.notReportable.map((n) => n.reason)).toContain("corporation_exempt");
  });

  it("no payees → empty filing", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [], payments: [] });
    expect(r.summary).toEqual({ payeesConsidered: 0, formCount: 0, totalBox1: 0, totalBox4: 0 });
  });
});

describe("Form1099NECEngine — box-1 floor + multi-cause drivers (P1/P2 fixes)", () => {
  it("a year netting below zero with backup withholding files box-1 $0 (never negative), box-4 intact", () => {
    // refunds exceed payments for the year (-$1000 net) but tax was withheld → must still file, box1 floored at 0
    const r = F.generate1099NEC({
      taxYear: 2025,
      payees: [individual({ federalTaxWithheld: 50 })],
      payments: [check(5000), check(-6000)],
    });
    expect(r.forms).toHaveLength(1);
    expect(r.forms[0].box1NonemployeeCompensation).toBe(0); // IRS form floor — never negative
    expect(r.forms[0].reportablePaymentTotal).toBe(-1000); // true net preserved for reconciliation
    expect(r.forms[0].box4FederalTaxWithheld).toBe(50);
    expect(r.forms[0].reason).toBe("backup_withholding");
    expect(r.summary.totalBox1).toBe(0);
  });

  it("a refund-dominant year with no withholding and no card payments files nothing (under_threshold)", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [check(5000), check(-6000)] });
    expect(r.forms).toHaveLength(0);
    expect(r.notReportable[0]).toEqual({ payeeId: "p1", reportablePaymentTotal: -1000, reason: "under_threshold" });
  });

  it("a multi-cause filing (threshold met AND withholding) exposes both drivers", () => {
    const r = F.generate1099NEC({ taxYear: 2025, payees: [individual({ federalTaxWithheld: 120 })], payments: [check(5000)] });
    expect(r.forms[0].drivers).toEqual({ thresholdMet: true, backupWithholding: true, corpException: false });
    expect(r.forms[0].reason).toBe("threshold_met"); // primary driver still threshold
  });

  it("an attorney-corp filing flags the corpException driver", () => {
    const r = F.generate1099NEC({
      taxYear: 2025,
      payees: [{ payeeId: "law1", legalName: "Dewey Cheatem LLC", tin: "987654321", entityType: "c_corporation", paymentCategory: "attorney_legal_services" }],
      payments: [check(5000, "law1")],
    });
    expect(r.forms[0].drivers).toEqual({ thresholdMet: true, backupWithholding: false, corpException: true });
  });
});

describe("Form1099NECEngine — all card/3rd-party methods excluded; exempt-corp needs no TIN", () => {
  it.each(["debit_card", "third_party_network", "gift_card"])("%s payments are excluded like credit cards", (method) => {
    const r = F.generate1099NEC({
      taxYear: 2025,
      payees: [{ payeeId: "p1", legalName: "Jane Welder", entityType: "individual" }],
      payments: [{ payeeId: "p1", amount: 5000, paymentMethod: method }],
    });
    expect(r.forms).toHaveLength(0);
    expect(r.notReportable[0].reason).toBe("all_payments_card_excluded");
  });

  it("an exempt corporation with NO TIN does not throw (no form is filed, so no TIN is needed)", () => {
    expect(() =>
      F.generate1099NEC({
        taxYear: 2025,
        payees: [{ payeeId: "c1", legalName: "Acme Inc", entityType: "c_corporation" }], // no tin
        payments: [check(99999, "c1")],
      })
    ).not.toThrow();
  });
});

describe("Form1099NECEngine — adversarial / fail-loud", () => {
  it("throws on a non-finite payment amount", () => {
    expect(() => F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [{ payeeId: "p1", amount: NaN, paymentMethod: "check" }] })).toThrow();
  });
  it("throws on an unknown entity type (never guesses reportability)", () => {
    expect(() => F.generate1099NEC({ taxYear: 2025, payees: [{ payeeId: "x", legalName: "Mystery", entityType: "cyborg" }], payments: [check(5000, "x")] })).toThrow(/entityType/);
  });
  it("throws on an unknown payment method", () => {
    expect(() => F.generate1099NEC({ taxYear: 2025, payees: [individual()], payments: [{ payeeId: "p1", amount: 5000, paymentMethod: "bitcoin" }] })).toThrow(/paymentMethod/);
  });
  it("throws when a reportable payee has no TIN (cannot file a blank-TIN form)", () => {
    expect(() => F.generate1099NEC({ taxYear: 2025, payees: [{ payeeId: "p1", legalName: "Jane Welder", entityType: "individual" }], payments: [check(5000)] })).toThrow(/TIN/);
  });
  it("throws when a reportable payee has a malformed TIN", () => {
    expect(() => F.generate1099NEC({ taxYear: 2025, payees: [individual({ tin: "12345" })], payments: [check(5000)] })).toThrow(/TIN/);
  });
  it("throws on an unknown tax year", () => {
    expect(() => F.generate1099NEC({ taxYear: 2099, payees: [], payments: [] })).toThrow(/threshold/);
  });
});
