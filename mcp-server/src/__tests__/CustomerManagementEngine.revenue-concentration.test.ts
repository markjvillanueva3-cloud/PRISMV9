/**
 * muS-B14 — Customer revenue concentration (HHI / Pareto / risk grade)
 *
 * Tests CustomerManagementEngine.revenueConcentration() and round-trips the
 * customer_revenue_concentration action through businessDispatcher's
 * prism_business tool.
 *
 * Real-value assertions (no toBeDefined() stubs):
 *   - HHI is the sum of squared share percentages: 1 customer → 10000,
 *     two 50/50 → 5000, four 25% → 2500, ten 10% → 1000.
 *   - Pareto count is the smallest customer set producing >=80% of revenue.
 *   - concentration_risk combines top-1 share and HHI.
 *
 * @milestone ARC-MS4 / muS-B14
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { customerManagementEngine } from "../engines/CustomerManagementEngine.js";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

// ── Engine isolation: revenueConcentration() is portfolio-wide, so the
//    singleton's customer + job maps must be empty before each test.
//    Assumes vitest's default serial in-file execution — these tests must
//    not be run with in-file parallelism enabled. ──
function reset(): void {
  (customerManagementEngine as any).customers.clear();
  (customerManagementEngine as any).jobHistory.clear();
  (customerManagementEngine as any).nextId = 1;
}

function mkCustomer(name: string): string {
  return customerManagementEngine.createCustomer({
    name,
    company: name,
    contact_name: "Contact",
    email: "buyer@example.com",
    phone: "555-0100",
    address: { street: "1 Main St", city: "Town", state: "XX", zip: "00000" },
    credit_limit: 100_000,
    payment_terms: "NET30",
    pricing_tier: "standard",
    discount_pct: 0,
    tax_exempt: false,
    tags: [],
  }).id;
}

/** Create a customer and book one job of the given revenue. */
function customerWithRevenue(name: string, revenue: number): string {
  const id = mkCustomer(name);
  if (revenue > 0) customerManagementEngine.recordJobForCustomer(id, revenue, 20, true);
  return id;
}

beforeEach(reset);

describe("CustomerManagementEngine.revenueConcentration", () => {
  it("empty portfolio → zeroed report, low risk", () => {
    const r = customerManagementEngine.revenueConcentration();
    expect(r.total_customers).toBe(0);
    expect(r.revenue_customers).toBe(0);
    expect(r.total_revenue).toBe(0);
    expect(r.hhi_index).toBe(0);
    expect(r.hhi_classification).toBe("unconcentrated");
    expect(r.concentration_risk).toBe("low");
    expect(r.top_customers).toEqual([]);
    expect(r.recommendation).toContain("No customer revenue");
  });

  it("customers exist but no revenue → still the no-revenue path", () => {
    mkCustomer("Acme");
    mkCustomer("Beta");
    const r = customerManagementEngine.revenueConcentration();
    expect(r.total_customers).toBe(2);
    expect(r.revenue_customers).toBe(0);
    expect(r.total_revenue).toBe(0);
    expect(r.concentration_risk).toBe("low");
  });

  it("single customer → HHI 10000, top1 100%, critical risk", () => {
    customerWithRevenue("Solo", 50_000);
    const r = customerManagementEngine.revenueConcentration();
    expect(r.total_revenue).toBe(50_000);
    expect(r.hhi_index).toBe(10_000);
    expect(r.hhi_classification).toBe("high");
    expect(r.top1_share_pct).toBe(100);
    expect(r.pareto_count).toBe(1);
    expect(r.concentration_risk).toBe("critical");
    expect(r.recommendation).toContain("Single-customer dependency");
  });

  it("two equal customers → HHI 5000 (50²+50²), critical risk", () => {
    customerWithRevenue("A", 5_000);
    customerWithRevenue("B", 5_000);
    const r = customerManagementEngine.revenueConcentration();
    expect(r.total_revenue).toBe(10_000);
    expect(r.hhi_index).toBe(5_000);
    expect(r.top1_share_pct).toBe(50);
    expect(r.top3_share_pct).toBe(100);
    expect(r.pareto_count).toBe(2);
    expect(r.concentration_risk).toBe("critical");
  });

  it("ten equal customers → HHI 1000, unconcentrated, low risk", () => {
    for (let i = 0; i < 10; i++) customerWithRevenue(`C${i}`, 1_000);
    const r = customerManagementEngine.revenueConcentration();
    expect(r.total_revenue).toBe(10_000);
    expect(r.hhi_index).toBe(1_000);
    expect(r.hhi_classification).toBe("unconcentrated");
    expect(r.top1_share_pct).toBe(10);
    expect(r.concentration_risk).toBe("low");
    // 10% each → 8 customers reach exactly 80%.
    expect(r.pareto_count).toBe(8);
    expect(r.pareto_pct).toBe(80);
  });

  it("four equal customers → HHI 2500, moderate classification + risk", () => {
    for (const n of ["W", "X", "Y", "Z"]) customerWithRevenue(n, 2_500);
    const r = customerManagementEngine.revenueConcentration();
    expect(r.hhi_index).toBe(2_500);
    expect(r.hhi_classification).toBe("moderate"); // 1500 <= 2500, not > 2500
    expect(r.top1_share_pct).toBe(25);
    expect(r.concentration_risk).toBe("moderate"); // top1 >= 20
    expect(r.pareto_count).toBe(4); // 25+25+25 = 75% < 80, need the 4th
  });

  it("high HHI with top1 below 50 → high risk (40/40/10/10)", () => {
    customerWithRevenue("Big1", 4_000);
    customerWithRevenue("Big2", 4_000);
    customerWithRevenue("Sm1", 1_000);
    customerWithRevenue("Sm2", 1_000);
    const r = customerManagementEngine.revenueConcentration();
    // HHI = 40² + 40² + 10² + 10² = 1600 + 1600 + 100 + 100 = 3400
    expect(r.hhi_index).toBe(3_400);
    expect(r.hhi_classification).toBe("high");
    expect(r.top1_share_pct).toBe(40);
    expect(r.concentration_risk).toBe("high"); // top1 >= 35
    expect(r.pareto_count).toBe(2); // 40 + 40 = 80%
  });

  it("Pareto count is the smallest set reaching 80% (60/15/15/10)", () => {
    customerWithRevenue("Whale", 6_000);
    customerWithRevenue("Mid1", 1_500);
    customerWithRevenue("Mid2", 1_500);
    customerWithRevenue("Tail", 1_000);
    const r = customerManagementEngine.revenueConcentration();
    // cumulative: 60, 75, 90 → 3rd customer crosses 80%
    expect(r.pareto_count).toBe(3);
    expect(r.top1_share_pct).toBe(60);
    expect(r.concentration_risk).toBe("critical"); // top1 >= 50
  });

  it("zero-revenue customers excluded from revenue_customers but counted overall", () => {
    customerWithRevenue("Paying1", 3_000);
    customerWithRevenue("Paying2", 2_000);
    mkCustomer("Prospect"); // no jobs booked
    const r = customerManagementEngine.revenueConcentration();
    expect(r.total_customers).toBe(3);
    expect(r.revenue_customers).toBe(2);
    expect(r.total_revenue).toBe(5_000);
  });

  it("top_customers is revenue-sorted, capped at 10, shares monotonic", () => {
    for (let i = 0; i < 14; i++) customerWithRevenue(`Cust${i}`, (i + 1) * 1_000);
    const r = customerManagementEngine.revenueConcentration();
    expect(r.top_customers.length).toBe(10); // capped
    // highest-revenue customer (14000) first
    expect(r.top_customers[0].revenue).toBe(14_000);
    for (let i = 1; i < r.top_customers.length; i++) {
      expect(r.top_customers[i].revenue).toBeLessThanOrEqual(r.top_customers[i - 1].revenue);
    }
    // top-N shares are non-decreasing and bounded by 100
    expect(r.top1_share_pct).toBeLessThanOrEqual(r.top3_share_pct);
    expect(r.top3_share_pct).toBeLessThanOrEqual(r.top5_share_pct);
    expect(r.top5_share_pct).toBeLessThanOrEqual(100);
  });
});

describe("businessDispatcher → customer_revenue_concentration round-trip", () => {
  let handler:
    | ((args: { action: string; params?: Record<string, any> }) => Promise<any>)
    | null = null;

  beforeAll(() => {
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
        if (_name === "prism_business") handler = fn;
      },
    };
    registerBusinessDispatcher(fakeServer as any);
    if (!handler) throw new Error("businessDispatcher did not register prism_business");
  });

  async function call(action: string, params: Record<string, any> = {}): Promise<any> {
    const r = await handler!({ action, params });
    if (r && Array.isArray(r.content) && r.content[0]?.text) {
      return JSON.parse(r.content[0].text);
    }
    if (r && r.type === "text" && typeof r.text === "string") return JSON.parse(r.text);
    return r;
  }

  it("dispatches and returns a concentration report", async () => {
    reset();
    customerWithRevenue("DispA", 7_000); // 70% share
    customerWithRevenue("DispB", 3_000); // 30% share
    const out = await call("customer_revenue_concentration");
    // unwrap { result } / { data } envelope variants
    const report = out?.result ?? out?.data ?? out;
    expect(report.total_revenue).toBe(10_000);
    // HHI = 70² + 30² = 4900 + 900 = 5800
    expect(report.hhi_index).toBe(5_800);
    expect(report.hhi_classification).toBe("high");
    expect(report.top1_share_pct).toBe(70);
    expect(report.concentration_risk).toBe("critical"); // top1 >= 50
  });
});
