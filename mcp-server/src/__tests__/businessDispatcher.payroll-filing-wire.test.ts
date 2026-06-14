/**
 * businessDispatcher.payroll-filing-wire.test.ts
 *
 * R15 wiring close-out (slot:hotel) — round-trip wire tests for the FOUR PayrollLiabilityFilingEngine
 * methods that were built + unit-tested but unreachable through prism_business (only `compute941` was
 * wired). Invokes THROUGH the dispatcher (action enum → getEngine("payrollLiabilityFiling") → engine
 * method → result), NOT the engine singleton, so the action enum + lazy import + switch case are proven
 * coherent for each. Engine math is independently covered by PayrollLiabilityFilingEngine.test.ts; this
 * file proves the WIRE (the four actions exist + route + survive the round trip) with real IRS values.
 *
 * Reference math (canonical payroll-tax-tables.ts):
 *   2025 — SS 6.2% / wage base $176,100 · Medicare 1.45% · addl 0.9% over $200,000 · FUTA net 0.6% on first $7,000.
 *   1099-NEC box-1 threshold $600.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerBusinessDispatcher(fakeServer);
  return { handler };
}

/** Invoke an action through the dispatcher and unwrap the slimResponse text payload. */
async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  let text: string | undefined;
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) text = r.content[0].text;
  else if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") text = r.text;
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      /* fall through */
    }
  }
  return r;
}

/** A W-2 wage record with sane zero defaults; override per test. */
const wage = (over: Record<string, any> & { employeeId: string }) => ({
  name: `Emp ${over.employeeId}`,
  ssn: "123456789",
  grossPay: 0,
  fedIncomeTaxWithheld: 0,
  socialSecurityWages: 0,
  medicareWages: 0,
  stateTax: 0,
  ...over,
});

describe("prism_business payroll-filing wire (HOTEL R15 close-out — 4 orphaned methods)", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer().handler;
  });

  // ── payroll_compute_940 (annual FUTA) ──────────────────────────────────────────────────────────
  it("payroll_compute_940: per-employee $7,000 cap + 0.6% net rate survives the round trip", async () => {
    const r = await call(handler, "payroll_compute_940", {
      year: 2025,
      annualWagesByEmployee: [
        wage({ employeeId: "E1", grossPay: 10000 }), // capped to 7000
        wage({ employeeId: "E2", grossPay: 5000 }), // uncapped
      ],
    });
    expect(r.totalFutaTaxableWages).toBe(12000); // 7000 + 5000
    expect(r.futaWageBase).toBe(7000);
    expect(r.futaTax).toBeCloseTo(72.0, 2); // 12000 * 0.006
    expect(r.employeeCount).toBe(2);
  });

  // ── payroll_generate_w2 (W-2 wage/tax statements) ──────────────────────────────────────────────
  it("payroll_generate_w2: boxes 1-6 + SSN mask for a sub-cap earner ($50k) through the dispatcher", async () => {
    const r = await call(handler, "payroll_generate_w2", {
      year: 2025,
      employeeYtd: [
        wage({
          employeeId: "W1",
          grossPay: 50000,
          fedIncomeTaxWithheld: 6000,
          socialSecurityWages: 50000,
          medicareWages: 50000,
          stateTax: 2000,
        }),
      ],
    });
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(1);
    const w2 = r[0];
    expect(w2.box1WagesTipsOtherComp).toBe(50000);
    expect(w2.box2FederalIncomeTaxWithheld).toBe(6000);
    expect(w2.box3SocialSecurityWages).toBe(50000); // under the $176,100 cap
    expect(w2.box4SocialSecurityTaxWithheld).toBeCloseTo(3100.0, 2); // 50000 * 0.062
    expect(w2.box5MedicareWagesAndTips).toBe(50000);
    expect(w2.box6MedicareTaxWithheld).toBeCloseTo(725.0, 2); // 50000 * 0.0145, no addl
    expect(w2.box16StateWages).toBe(50000);
    expect(w2.box17StateIncomeTax).toBe(2000);
    expect(w2.ssnMasked).toBe("***-**-6789"); // PII: last-4 only, raw SSN never returned
    expect(w2).not.toHaveProperty("ssn"); // raw SSN must not leak through the wire
  });

  it("payroll_generate_w2: high earner — SS wages capped at $176,100 + 0.9% additional Medicare over $200k", async () => {
    const r = await call(handler, "payroll_generate_w2", {
      year: 2025,
      employeeYtd: [
        wage({
          employeeId: "W2",
          grossPay: 250000,
          fedIncomeTaxWithheld: 50000,
          socialSecurityWages: 250000,
          medicareWages: 250000,
        }),
      ],
    });
    const w2 = r[0];
    expect(w2.box3SocialSecurityWages).toBe(176100); // capped at the 2025 wage base
    expect(w2.box4SocialSecurityTaxWithheld).toBeCloseTo(10918.2, 2); // 176100 * 0.062
    // box6 = 250000*0.0145 (regular) + 50000*0.009 (additional over $200k) = 3625 + 450 = 4075
    expect(w2.box6MedicareTaxWithheld).toBeCloseTo(4075.0, 2);
  });

  it("payroll_generate_w2: invalid SSN is rejected loud through the wire (no blank-SSN W-2)", async () => {
    const r = await call(handler, "payroll_generate_w2", {
      year: 2025,
      employeeYtd: [wage({ employeeId: "BAD", ssn: "123", grossPay: 1000 })], // 3-digit SSN
    });
    expect(String(r.error ?? r.message ?? "")).toMatch(/ssn must be 9 digits/i);
  });

  // ── payroll_reconcile_w2_941 (year-end W-2 ↔ 941 cross-check) ───────────────────────────────────
  it("payroll_reconcile_w2_941: balanced ΣW2-box2=Σ941-FIT and ΣW2-box4=employee-half-of-Σ941-SS", async () => {
    const r = await call(handler, "payroll_reconcile_w2_941", {
      w2s: [{ box2FederalIncomeTaxWithheld: 6000, box4SocialSecurityTaxWithheld: 3100 }],
      // 4 quarters: Σ FIT = 6000; Σ SS (combined 12.4%) = 6200 → employee half = 3100.
      the4Quarters: [
        { totalFitWithheld: 1500, socialSecurityTax: 1550 },
        { totalFitWithheld: 1500, socialSecurityTax: 1550 },
        { totalFitWithheld: 1500, socialSecurityTax: 1550 },
        { totalFitWithheld: 1500, socialSecurityTax: 1550 },
      ],
    });
    expect(r.reconciled).toBe(true);
    expect(r.totalW2Box2Fit).toBe(6000);
    expect(r.total941Fit).toBe(6000);
    expect(r.totalW2Box4SocialSecurity).toBe(3100);
    expect(r.total941EmployeeSocialSecurity).toBe(3100); // 6200 / 2
  });

  it("payroll_reconcile_w2_941: FIT drift throws loud through the dispatcher (year-end must balance)", async () => {
    const r = await call(handler, "payroll_reconcile_w2_941", {
      w2s: [{ box2FederalIncomeTaxWithheld: 6000, box4SocialSecurityTaxWithheld: 3100 }],
      the4Quarters: [
        { totalFitWithheld: 1500, socialSecurityTax: 1550 },
        { totalFitWithheld: 1500, socialSecurityTax: 1550 },
        { totalFitWithheld: 1500, socialSecurityTax: 1550 },
        { totalFitWithheld: 1000, socialSecurityTax: 1550 }, // FIT short by 500 → Σ=5500 ≠ 6000
      ],
    });
    expect(String(r.error ?? r.message ?? "")).toMatch(/reconciliation failed on fit/i);
  });

  it("payroll_reconcile_w2_941: wrong quarter count is rejected (must be exactly 4)", async () => {
    const r = await call(handler, "payroll_reconcile_w2_941", {
      w2s: [{ box2FederalIncomeTaxWithheld: 0, box4SocialSecurityTaxWithheld: 0 }],
      the4Quarters: [{ totalFitWithheld: 0, socialSecurityTax: 0 }], // only 1
    });
    expect(String(r.error ?? r.message ?? "")).toMatch(/exactly 4 quarterly 941s/i);
  });

  // ── payroll_contractor_1099_totals (bridge to Form1099NECEngine) ───────────────────────────────
  it("payroll_contractor_1099_totals: a reportable contractor → 1099-NEC form with masked TIN", async () => {
    const r = await call(handler, "payroll_contractor_1099_totals", {
      taxYear: 2025,
      payees: [{ payeeId: "C1", legalName: "Pat Welder", tin: "123456789", entityType: "individual" }],
      payments: [{ payeeId: "C1", amount: 1500, paymentMethod: "check" }],
    });
    expect(r.taxYear).toBe(2025);
    expect(r.threshold).toBe(600);
    expect(r.forms).toHaveLength(1);
    expect(r.forms[0].box1NonemployeeCompensation).toBe(1500);
    expect(r.forms[0].tinMasked).toBe("***-**-6789"); // SSN-form mask for an individual
    expect(r.summary.totalBox1).toBe(1500);
  });

  it("payroll_contractor_1099_totals: under-threshold contractor → not reportable (honest exclusion)", async () => {
    const r = await call(handler, "payroll_contractor_1099_totals", {
      taxYear: 2025,
      payees: [{ payeeId: "C2", legalName: "Tiny Job LLC", tin: "987654321", entityType: "individual" }],
      payments: [{ payeeId: "C2", amount: 400, paymentMethod: "check" }], // < $600
    });
    expect(r.forms).toHaveLength(0);
    expect(r.notReportable).toHaveLength(1);
    expect(r.notReportable[0].reason).toBe("under_threshold");
  });

  // ── payroll_remit_liability (balanced GL journal lines) ────────────────────────────────────────
  // NOTE: remitLiability takes positional args (amount, date); the dispatcher normalizes from
  // params.amount/params.date. These cases prove that normalization is correct through the wire.
  it("payroll_remit_liability: emits balanced DR Tax Payable / CR Cash journal lines", async () => {
    const r = await call(handler, "payroll_remit_liability", { amount: 15650, date: "2024-04-30" });
    expect(r.balanced).toBe(true);
    expect(r.amount).toBe(15650);
    expect(r.date).toBe("2024-04-30");
    expect(r.lines).toHaveLength(2);
    const debit = r.lines.find((l: any) => l.debit > 0);
    const credit = r.lines.find((l: any) => l.credit > 0);
    expect(debit.debit).toBe(15650); // DR Tax Payable
    expect(credit.credit).toBe(15650); // CR Cash
    // double-entry invariant survives the round trip: Σdebit === Σcredit
    const totDr = r.lines.reduce((s: number, l: any) => s + l.debit, 0);
    const totCr = r.lines.reduce((s: number, l: any) => s + l.credit, 0);
    expect(totDr).toBe(totCr);
  });

  it("payroll_remit_liability: half-even rounds the remit amount to the cent (100.125 → 100.12)", async () => {
    const r = await call(handler, "payroll_remit_liability", { amount: 100.125, date: "2024-04-30" });
    expect(r.amount).toBe(100.12); // banker's rounding, ties-to-even
  });

  it("payroll_remit_liability: non-positive amount is rejected loud through the wire", async () => {
    const r = await call(handler, "payroll_remit_liability", { amount: -100, date: "2024-04-30" });
    expect(String(r.error ?? r.message ?? "")).toMatch(/must be positive/i);
  });

  it("payroll_remit_liability: missing amount (undefined param) fails loud, not silently NaN", async () => {
    const r = await call(handler, "payroll_remit_liability", { date: "2024-04-30" });
    expect(String(r.error ?? r.message ?? "")).toMatch(/must be finite/i);
  });

  // ── action-existence guard (the WIRE itself) ───────────────────────────────────────────────────
  it("all 5 newly-wired actions are routable (unknown-action error is NOT returned)", async () => {
    for (const action of [
      "payroll_compute_940",
      "payroll_generate_w2",
      "payroll_reconcile_w2_941",
      "payroll_contractor_1099_totals",
      "payroll_remit_liability",
    ]) {
      const r = await call(handler, action, {});
      const err = String(r?.error ?? r?.message ?? "");
      // An empty-params call may legitimately error on bad input, but NEVER with "unknown action".
      expect(err.toLowerCase()).not.toMatch(/unknown action|unsupported action|no such action/);
    }
  });
});
