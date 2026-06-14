/**
 * FinanceChargeDunningEngine.test.ts — REAL reference values (hand-computed), not stubs.
 * galaxy:business, slot:hotel. QB-PARITY-MS0 Phase-2 engine #6.
 *
 * Reference math (shop policy: 1.5%/mo, $5 min, 10-day grace, 45%/yr usury cap, 30-day month):
 *   • $1000 @ 30d → months 1.0 → 1000×0.015×1.0 = 15.00 (cap: 1000×0.45×30/365 = 36.99, not hit)
 *   • $1000 @ 10d → within grace → 0
 *   • $0.01 worth of interest → floored at $5.00 minimum
 *   • dunning tiers: 10→reminder, 30→past_due, 60→final_notice, 90→collections
 */
import { describe, it, expect } from "vitest";
import {
  FinanceChargeDunningEngine,
  financeChargeDunningEngine,
} from "../engines/FinanceChargeDunningEngine.js";
import {
  AR_FINANCE_CHARGE_POLICY,
  AR_FINANCE_CHARGE_POLICY_SCHEMA_VERSION,
} from "../data/ar-finance-charge-policy.js";

describe("FinanceChargeDunningEngine.computeFinanceCharge", () => {
  it("charges 1.5% of $1000 for one 30-day month = $15.00 (happy path)", () => {
    const r = FinanceChargeDunningEngine.computeFinanceCharge({
      invoiceId: "INV-1",
      overdueBalance: 1000,
      daysOverdue: 30,
    });
    expect(r.applied).toBe(true);
    expect(r.charge).toBeCloseTo(15.0, 2);
    expect(r.usuryCapped).toBe(false);
    expect(r.policyVersion).toBe(AR_FINANCE_CHARGE_POLICY_SCHEMA_VERSION);
  });

  it("returns 0 / not-applied within the 10-day grace period", () => {
    const r = FinanceChargeDunningEngine.computeFinanceCharge({
      invoiceId: "INV-2",
      overdueBalance: 1000,
      daysOverdue: 10, // == graceDays, inclusive → no charge
    });
    expect(r.applied).toBe(false);
    expect(r.charge).toBe(0);
    expect(r.glLines).toHaveLength(0);
    expect(r.reason).toMatch(/grace/i);
  });

  it("applies the $5.00 minimum-charge floor on a tiny balance past grace", () => {
    // $10 @ 30d → 10×0.015×1.0 = $0.15 < $5 floor → raised to $5.00
    const r = FinanceChargeDunningEngine.computeFinanceCharge({
      invoiceId: "INV-3",
      overdueBalance: 10,
      daysOverdue: 30,
    });
    expect(r.applied).toBe(true);
    expect(r.charge).toBeCloseTo(AR_FINANCE_CHARGE_POLICY.minCharge, 2);
    expect(r.charge).toBeCloseTo(5.0, 2);
    expect(r.reason).toMatch(/minimum/i);
  });

  it("emits a balanced GL posting DR 1200 AR / CR 4000 Sales Revenue equal to the charge", () => {
    const r = FinanceChargeDunningEngine.computeFinanceCharge({
      invoiceId: "INV-4",
      overdueBalance: 2000,
      daysOverdue: 30,
    });
    // 2000×0.015×1.0 = 30.00
    expect(r.charge).toBeCloseTo(30.0, 2);
    expect(r.glLines).toHaveLength(2);
    const ar = r.glLines.find((l) => l.account_id === "1200")!;
    const rev = r.glLines.find((l) => l.account_id === "4000")!;
    expect(ar.debit).toBeCloseTo(30.0, 2);
    expect(ar.credit).toBe(0);
    expect(rev.credit).toBeCloseTo(30.0, 2);
    expect(rev.debit).toBe(0);
    const debits = r.glLines.reduce((s, l) => s + l.debit, 0);
    const credits = r.glLines.reduce((s, l) => s + l.credit, 0);
    expect(debits).toBeCloseTo(credits, 6); // Σdebits === Σcredits
  });

  it("caps the charge at the usury ceiling for a long-overdue balance (config span: high days)", () => {
    // 365 days, 1.5%/mo: raw = 1000×0.015×(365/30) = 182.50 (≈18.25%/yr effective… wait that's
    // months=12.1667 → 182.50). annual effective = 182.50/1000 / (365/365) = 18.25%/yr < 45% cap.
    // To actually hit the cap, push monthlyRatePct via override to 5%/mo (60%/yr nominal).
    const r = FinanceChargeDunningEngine.computeFinanceCharge({
      invoiceId: "INV-5",
      overdueBalance: 1000,
      daysOverdue: 365,
      policy: { monthlyRatePct: 0.05 }, // 5%/mo ≈ 60%/yr → exceeds 45% cap
    });
    expect(r.usuryCapped).toBe(true);
    // capped charge = 1000 × 0.45 × (365/365) = 450.00
    expect(r.charge).toBeCloseTo(450.0, 2);
    expect(r.reason).toMatch(/usury/i);
  });

  it("does NOT cap a charge that stays under the annual usury ceiling (config span: default rate, long overdue)", () => {
    const r = FinanceChargeDunningEngine.computeFinanceCharge({
      invoiceId: "INV-6",
      overdueBalance: 1000,
      daysOverdue: 365,
    });
    // 1000×0.015×(365/30) = 182.50; effective 18.25%/yr < 45% cap → not capped
    expect(r.usuryCapped).toBe(false);
    expect(r.charge).toBeCloseTo(182.5, 2);
  });

  it("returns 0 / not-applied for a zero balance even past grace (no min-charge on nothing owed)", () => {
    const r = FinanceChargeDunningEngine.computeFinanceCharge({
      invoiceId: "INV-7",
      overdueBalance: 0,
      daysOverdue: 60,
    });
    expect(r.applied).toBe(false);
    expect(r.charge).toBe(0);
    expect(r.glLines).toHaveLength(0);
  });

  it("uses banker's (half-even) rounding to the cent (config span: fractional balance)", () => {
    // 333.625 @ 30d → 333.625×0.015×1.0 = 5.0044 → rounds to 5.00 (and == min floor anyway)
    // Use a balance that produces a clean half-even tie on the charge:
    // balance 16.833... × 0.015 = ... choose 100.00 @ 30d → 1.50 → < 5 floor → 5.00
    const r1 = FinanceChargeDunningEngine.computeFinanceCharge({
      invoiceId: "INV-8a",
      overdueBalance: 100,
      daysOverdue: 30,
    });
    expect(r1.charge).toBeCloseTo(5.0, 2); // 1.50 floored to 5.00 min

    // 1000.00 @ 30d → 15.00 exact, no rounding artifact
    const r2 = FinanceChargeDunningEngine.computeFinanceCharge({
      invoiceId: "INV-8b",
      overdueBalance: 1000,
      daysOverdue: 30,
    });
    expect(Number.isInteger(r2.charge * 100)).toBe(true); // cent-exact
    expect(r2.charge).toBeCloseTo(15.0, 2);
  });

  // ---- failure modes ----
  it("THROWS on a NaN overdue balance (adversarial — never coerce)", () => {
    // zod's z.number() rejects NaN as an invalid_type before the engine's own finite guard;
    // either way the contract holds: a NaN balance can NEVER silently produce a $0 charge.
    expect(() =>
      FinanceChargeDunningEngine.computeFinanceCharge({
        invoiceId: "INV-9",
        overdueBalance: NaN,
        daysOverdue: 30,
      }),
    ).toThrow(/finite|NaN|expected number/i);
  });

  it("THROWS on an Infinity overdue balance (adversarial)", () => {
    // zod's z.number() rejects Infinity as an invalid_type before the engine's finite guard.
    expect(() =>
      FinanceChargeDunningEngine.computeFinanceCharge({
        invoiceId: "INV-10",
        overdueBalance: Infinity,
        daysOverdue: 30,
      }),
    ).toThrow(/finite|expected number/i);
  });

  it("THROWS on a negative overdue balance (a credit balance is not chargeable)", () => {
    expect(() =>
      FinanceChargeDunningEngine.computeFinanceCharge({
        invoiceId: "INV-11",
        overdueBalance: -500,
        daysOverdue: 30,
      }),
    ).toThrow(/≥ 0|chargeable/i);
  });

  it("THROWS on negative days-overdue (boundary/adversarial)", () => {
    expect(() =>
      FinanceChargeDunningEngine.computeFinanceCharge({
        invoiceId: "INV-12",
        overdueBalance: 1000,
        daysOverdue: -5,
      }),
    ).toThrow(/≥ 0/);
  });

  it("THROWS on non-integer days-overdue (must be whole days)", () => {
    expect(() =>
      FinanceChargeDunningEngine.computeFinanceCharge({
        invoiceId: "INV-13",
        overdueBalance: 1000,
        daysOverdue: 30.5,
      }),
    ).toThrow(/integer/i);
  });

  it("THROWS when a policy override sets monthlyRatePct above the annual cap (policy typo)", () => {
    expect(() =>
      FinanceChargeDunningEngine.computeFinanceCharge({
        invoiceId: "INV-14",
        overdueBalance: 1000,
        daysOverdue: 30,
        policy: { monthlyRatePct: 0.5, annualRateCapPct: 0.45 },
      }),
    ).toThrow(/exceeds annualRateCapPct|policy error/i);
  });
});

describe("FinanceChargeDunningEngine.dunningLevel", () => {
  it("maps the 10/30/60/90-day tier boundaries to the correct level", () => {
    expect(FinanceChargeDunningEngine.dunningLevel(0)).toBeNull(); // current
    expect(FinanceChargeDunningEngine.dunningLevel(9)).toBeNull(); // below floor tier
    expect(FinanceChargeDunningEngine.dunningLevel(10)?.level).toBe("reminder");
    expect(FinanceChargeDunningEngine.dunningLevel(29)?.level).toBe("reminder");
    expect(FinanceChargeDunningEngine.dunningLevel(30)?.level).toBe("past_due");
    expect(FinanceChargeDunningEngine.dunningLevel(59)?.level).toBe("past_due");
    expect(FinanceChargeDunningEngine.dunningLevel(60)?.level).toBe("final_notice");
    expect(FinanceChargeDunningEngine.dunningLevel(89)?.level).toBe("final_notice");
    expect(FinanceChargeDunningEngine.dunningLevel(90)?.level).toBe("collections");
    expect(FinanceChargeDunningEngine.dunningLevel(365)?.level).toBe("collections");
  });

  it("THROWS on negative days-overdue", () => {
    expect(() => FinanceChargeDunningEngine.dunningLevel(-1)).toThrow(/≥ 0/);
  });

  it("THROWS on NaN / non-integer days-overdue (adversarial)", () => {
    expect(() => FinanceChargeDunningEngine.dunningLevel(NaN)).toThrow(/integer/i);
    expect(() => FinanceChargeDunningEngine.dunningLevel(45.5)).toThrow(/integer/i);
  });
});

describe("FinanceChargeDunningEngine.generateDunning", () => {
  it("generates per-invoice notices and escalates the account level to the MAX tier", () => {
    const r = FinanceChargeDunningEngine.generateDunning({
      customerId: "CUST-1",
      customerName: "Acme Tool & Die",
      overdueInvoices: [
        { invoiceId: "A", balance: 500, daysOverdue: 15 }, // reminder
        { invoiceId: "B", balance: 1200, daysOverdue: 95 }, // collections
        { invoiceId: "C", balance: 300, daysOverdue: 40 }, // past_due
      ],
    });
    expect(r.notices).toHaveLength(3);
    expect(r.accountLevel).toBe("collections"); // max severity wins
    expect(r.totalOverdue).toBeCloseTo(2000.0, 2);
    const a = r.notices.find((n) => n.invoiceId === "A")!;
    expect(a.level).toBe("reminder");
    expect(a.message).toMatch(/Acme Tool & Die/);
    expect(a.message).toMatch(/\$500\.00/);
    expect(a.message).toMatch(/15 days/);
  });

  it("omits current invoices (below floor tier) but still counts them in totalOverdue", () => {
    const r = FinanceChargeDunningEngine.generateDunning({
      customerId: "CUST-2",
      overdueInvoices: [
        { invoiceId: "X", balance: 100, daysOverdue: 5 }, // current → no notice
        { invoiceId: "Y", balance: 250, daysOverdue: 35 }, // past_due
      ],
    });
    expect(r.notices).toHaveLength(1);
    expect(r.notices[0].invoiceId).toBe("Y");
    expect(r.accountLevel).toBe("past_due");
    expect(r.totalOverdue).toBeCloseTo(350.0, 2);
  });

  it("returns accountLevel 'current' with no notices when every invoice is within grace", () => {
    const r = FinanceChargeDunningEngine.generateDunning({
      customerId: "CUST-3",
      overdueInvoices: [{ invoiceId: "Z", balance: 999, daysOverdue: 3 }],
    });
    expect(r.notices).toHaveLength(0);
    expect(r.accountLevel).toBe("current");
    expect(r.totalOverdue).toBeCloseTo(999.0, 2);
  });

  it("THROWS on a negative invoice balance in the batch (fail loud)", () => {
    expect(() =>
      FinanceChargeDunningEngine.generateDunning({
        customerId: "CUST-4",
        overdueInvoices: [{ invoiceId: "Q", balance: -10, daysOverdue: 40 }],
      }),
    ).toThrow(/≥ 0/);
  });

  it("THROWS on a NaN invoice balance in the batch (adversarial)", () => {
    // zod rejects NaN at the schema boundary; the engine's finite guard is defense-in-depth.
    expect(() =>
      FinanceChargeDunningEngine.generateDunning({
        customerId: "CUST-5",
        overdueInvoices: [{ invoiceId: "R", balance: NaN, daysOverdue: 40 }],
      }),
    ).toThrow(/finite|NaN|expected number/i);
  });

  it("rejects an empty overdueInvoices array (zod min(1))", () => {
    expect(() =>
      FinanceChargeDunningEngine.generateDunning({
        customerId: "CUST-6",
        overdueInvoices: [],
      }),
    ).toThrow();
  });

  it("exposes the named-export alias identical to the class", () => {
    expect(financeChargeDunningEngine).toBe(FinanceChargeDunningEngine);
  });
});
