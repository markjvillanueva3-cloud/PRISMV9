/**
 * CustomerManagementEngine.credit-review.test.ts -- U-HOTEL-CREDIT-REVIEW (gap #3 of HOTEL-ERP-FRONTEND-WIRING-SPEC)
 *
 * The CreditManagementPage desk had no backing route -- creditReviewAll()/creditReview(id) 404'd.
 * This unit added reviewCredit(id) + reviewAllCredit() (standing credit reviews, no pending order) onto
 * CustomerManagementEngine. Tests the credit posture math + risk tiering + the batch sort, with real
 * reference values (no toBeDefined stubs).
 *
 * Engine isolation: the singleton's customers Map is process-global -- cleared before each test
 * (mirrors the sibling normalize test's reset()). Assumes vitest serial in-file execution.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { customerManagementEngine } from "../engines/CustomerManagementEngine.js";
import type { Customer } from "../engines/CustomerManagementEngine.js";

function reset(): void {
  (customerManagementEngine as any).customers.clear();
  (customerManagementEngine as any).jobHistory?.clear?.();
  (customerManagementEngine as any).nextId = 1;
}

type CustomerInput = Omit<Customer, "id" | "current_balance" | "created_at" | "status">;
function customerDefaults(over: Partial<CustomerInput> = {}): CustomerInput {
  return {
    name: "Acme",
    company: "Acme Inc",
    contact_name: "Jane Doe",
    email: "jane@acme.com",
    phone: "(555) 111-2222",
    address: { street: "1 Main", city: "Town", state: "OH", zip: "44000" },
    credit_limit: 100000,
    payment_terms: "Net 30",
    pricing_tier: "standard",
    discount_pct: 0,
    tax_exempt: false,
    tags: [],
    ...over,
  };
}

/** Create a customer then set its balance + status (createCustomer always starts balance=0, active). */
function seedCustomer(over: Partial<CustomerInput>, balance: number, status?: Customer["status"]): Customer {
  const c = customerManagementEngine.createCustomer(customerDefaults(over));
  return customerManagementEngine.updateCustomer(c.id, { current_balance: balance, ...(status ? { status } : {}) });
}

describe("CustomerManagementEngine -- credit review (U-HOTEL-CREDIT-REVIEW gap #3)", () => {
  beforeEach(() => reset());

  it("reviewCredit computes available_credit + utilization for a healthy customer", () => {
    const c = seedCustomer({ name: "Healthy", credit_limit: 100000 }, 25000);
    const r = customerManagementEngine.reviewCredit(c.id);
    expect(r.credit_limit).toBe(100000);
    expect(r.current_balance).toBe(25000);
    expect(r.available_credit).toBe(75000);
    expect(r.utilization_pct).toBe(25.0); // 25000/100000
    expect(r.over_limit).toBe(false);
    expect(r.risk).toBe("ok");
  });

  it("reviewCredit flags over_limit (balance exceeds limit) with negative available_credit", () => {
    const c = seedCustomer({ name: "OverLimit", credit_limit: 50000 }, 60000);
    const r = customerManagementEngine.reviewCredit(c.id);
    expect(r.available_credit).toBe(-10000);
    expect(r.over_limit).toBe(true);
    expect(r.risk).toBe("over_limit");
  });

  it("reviewCredit flags at_risk at >=90% utilization (not yet over limit)", () => {
    const c = seedCustomer({ name: "Tight", credit_limit: 100000 }, 95000);
    const r = customerManagementEngine.reviewCredit(c.id);
    expect(r.utilization_pct).toBe(95.0);
    expect(r.over_limit).toBe(false);
    expect(r.risk).toBe("at_risk");
  });

  it("reviewCredit: exactly 90.0% utilization is at_risk (the inclusive boundary -- pins >= not >)", () => {
    const c = seedCustomer({ name: "Boundary", credit_limit: 100000 }, 90000);
    const r = customerManagementEngine.reviewCredit(c.id);
    expect(r.utilization_pct).toBe(90.0);
    expect(r.risk).toBe("at_risk"); // a >90 (exclusive) change would flip this to "ok" -> test fails
  });

  it("reviewCredit: 89.9% utilization is still ok (just below the at_risk boundary)", () => {
    const c = seedCustomer({ name: "JustUnder", credit_limit: 100000 }, 89900);
    const r = customerManagementEngine.reviewCredit(c.id);
    expect(r.utilization_pct).toBe(89.9);
    expect(r.risk).toBe("ok");
  });

  it("reviewCredit: on_hold status dominates the risk tier (even if utilization is low)", () => {
    const c = seedCustomer({ name: "Held", credit_limit: 100000 }, 1000, "on_hold");
    const r = customerManagementEngine.reviewCredit(c.id);
    expect(r.status).toBe("on_hold");
    expect(r.risk).toBe("on_hold"); // status wins over the low-utilization "ok"
  });

  it("reviewCredit: zero credit_limit yields 0% utilization (no divide-by-zero)", () => {
    const c = seedCustomer({ name: "NoLimit", credit_limit: 0 }, 0);
    const r = customerManagementEngine.reviewCredit(c.id);
    expect(r.utilization_pct).toBe(0);
    expect(Number.isFinite(r.utilization_pct)).toBe(true);
  });

  it("reviewCredit throws on an unknown customer (fail-loud)", () => {
    expect(() => customerManagementEngine.reviewCredit("NOPE")).toThrow(/not found/);
  });

  it("reviewAllCredit returns every customer, sorted worst-first (highest utilization), with a summary", () => {
    seedCustomer({ name: "Low", credit_limit: 100000 }, 10000); // 10%
    seedCustomer({ name: "High", credit_limit: 100000 }, 95000); // 95% at_risk
    seedCustomer({ name: "Over", credit_limit: 50000 }, 60000); // 120% over_limit
    const { reviews, summary } = customerManagementEngine.reviewAllCredit();
    expect(reviews).toHaveLength(3);
    // worst-first: 120% > 95% > 10%
    expect(reviews.map((r) => r.utilization_pct)).toEqual([120.0, 95.0, 10.0]);
    expect(summary.total).toBe(3);
    expect(summary.over_limit).toBe(1);
    expect(summary.at_risk).toBe(2); // the over_limit one + the 95% one
  });

  it("reviewAllCredit summary counts on_hold separately", () => {
    seedCustomer({ name: "A", credit_limit: 100000 }, 5000, "on_hold");
    seedCustomer({ name: "B", credit_limit: 100000 }, 5000);
    const { summary } = customerManagementEngine.reviewAllCredit();
    expect(summary.on_hold).toBe(1);
    expect(summary.over_limit).toBe(0);
  });

  it("reviewAllCredit on an empty portfolio returns an empty list + zeroed summary (no throw)", () => {
    const { reviews, summary } = customerManagementEngine.reviewAllCredit();
    expect(reviews).toEqual([]);
    expect(summary).toEqual({ total: 0, over_limit: 0, on_hold: 0, at_risk: 0 });
  });
});
