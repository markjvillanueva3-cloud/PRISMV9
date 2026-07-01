/**
 * muS-B15 — Customer growth/decline trend analysis
 *
 * Tests CustomerManagementEngine.customerTrends() and round-trips the
 * customer_growth_trends action through businessDispatcher's prism_business
 * tool. Job history is dated via the optional `date` param of
 * recordJobForCustomer (added alongside this unit).
 *
 * Real-value assertions (no toBeDefined() stubs):
 *   - change_pct = (recent - prior) / prior * 100, rounded to 0.1%.
 *   - trend bands: >+15% growing, <-15% declining, else stable.
 *   - dormant when the last order is older than 2x the window.
 *
 * @milestone ARC-MS4 / muS-B15
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { customerManagementEngine } from "../engines/CustomerManagementEngine.js";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

// ── Engine isolation: customerTrends() is portfolio-wide over a process-global
//    singleton. Maps must be cleared before each test. Assumes vitest's
//    default serial in-file execution. ──
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

/**
 * ISO date string (YYYY-MM-DD) for `n` days before now. The engine parses
 * this back as UTC midnight, so the effective age can drift up to ~1 day from
 * `n` depending on wall-clock time of run — every assertion here uses a
 * window margin wide enough to absorb that (>=9 day gap to any boundary).
 */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function job(id: string, revenue: number, daysBack: number): void {
  customerManagementEngine.recordJobForCustomer(id, revenue, 20, true, daysAgo(daysBack));
}

beforeEach(reset);

describe("CustomerManagementEngine.customerTrends", () => {
  it("empty portfolio → no trends, no-history recommendation", () => {
    const r = customerManagementEngine.customerTrends();
    expect(r.trends).toEqual([]);
    expect(r.active_customers).toBe(0);
    expect(r.total_customers).toBe(0);
    expect(r.window_days).toBe(90);
    expect(r.recommendation).toContain("No customer job history");
  });

  it("single recent order → 'new' trend, low churn", () => {
    const id = mkCustomer("Fresh");
    job(id, 12_000, 10);
    const r = customerManagementEngine.customerTrends();
    expect(r.active_customers).toBe(1);
    expect(r.new_customers).toBe(1);
    const t = r.trends[0];
    expect(t.trend).toBe("new");
    expect(t.recent_revenue).toBe(12_000);
    expect(t.prior_revenue).toBe(0);
    expect(t.change_pct).toBe(100);
    expect(t.churn_risk).toBe("low");
    expect(t.days_since_last_order).toBeGreaterThanOrEqual(9);
    expect(t.days_since_last_order).toBeLessThanOrEqual(11);
  });

  it("recent > prior by >15% → 'growing' with correct change_pct", () => {
    const id = mkCustomer("Rising");
    job(id, 5_000, 120); // prior window
    job(id, 8_000, 20); // recent window
    const t = customerManagementEngine.customerTrends().trends[0];
    expect(t.trend).toBe("growing");
    expect(t.prior_revenue).toBe(5_000);
    expect(t.recent_revenue).toBe(8_000);
    expect(t.change_pct).toBe(60); // (8000-5000)/5000 = 60%
    expect(t.churn_risk).toBe("low");
  });

  it("recent < prior by >15% → 'declining', moderate churn when last order is recent", () => {
    const id = mkCustomer("Slipping");
    job(id, 10_000, 120); // prior
    job(id, 6_000, 20); // recent (-40%)
    const t = customerManagementEngine.customerTrends().trends[0];
    expect(t.trend).toBe("declining");
    expect(t.change_pct).toBe(-40);
    expect(t.churn_risk).toBe("moderate"); // declining but last order <= window
  });

  it("recent within +/-15% of prior → 'stable'", () => {
    const id = mkCustomer("Steady");
    job(id, 10_000, 120); // prior
    job(id, 10_500, 20); // recent (+5%)
    const t = customerManagementEngine.customerTrends().trends[0];
    expect(t.trend).toBe("stable");
    expect(t.change_pct).toBe(5);
    expect(t.churn_risk).toBe("low");
  });

  it("last order older than 2x window → 'dormant', high churn", () => {
    const id = mkCustomer("Gone");
    job(id, 9_000, 250); // 250 > 2*90
    const t = customerManagementEngine.customerTrends().trends[0];
    expect(t.trend).toBe("dormant");
    expect(t.churn_risk).toBe("high");
    expect(t.recent_revenue).toBe(0);
    expect(t.prior_revenue).toBe(0);
  });

  it("prior-window-only customer → 'declining', high churn (>window since last order)", () => {
    const id = mkCustomer("Quiet");
    job(id, 8_000, 120); // in prior window, nothing recent
    const t = customerManagementEngine.customerTrends().trends[0];
    expect(t.trend).toBe("declining");
    expect(t.recent_revenue).toBe(0);
    expect(t.change_pct).toBe(-100);
    expect(t.churn_risk).toBe("high"); // declining + 120d > 90d window
  });

  it("old order + new order, empty prior window → 'growing' (reactivated)", () => {
    const id = mkCustomer("Returned");
    job(id, 2_000, 300); // far past — outside both windows
    job(id, 9_000, 10); // recent
    const t = customerManagementEngine.customerTrends().trends[0];
    expect(t.trend).toBe("growing");
    expect(t.prior_revenue).toBe(0);
    expect(t.recent_revenue).toBe(9_000);
    expect(t.total_revenue).toBe(11_000);
  });

  it("portfolio tallies + erosion recommendation", () => {
    const g = mkCustomer("Grow"); job(g, 4_000, 120); job(g, 9_000, 15);
    const d1 = mkCustomer("Drop1"); job(d1, 9_000, 130);
    const d2 = mkCustomer("Drop2"); job(d2, 7_000, 250); // dormant
    const r = customerManagementEngine.customerTrends();
    expect(r.active_customers).toBe(3);
    expect(r.growing).toBe(1);
    expect(r.declining).toBe(1);
    expect(r.dormant).toBe(1);
    expect(r.at_churn_risk).toBe(2); // declining-prior-only + dormant
    expect(r.recommendation).toContain("erosion");
  });

  it("window_days param changes the classification of the same data", () => {
    const id = mkCustomer("Windowed");
    job(id, 5_000, 45);
    job(id, 3_000, 10);
    // default 90-day window: both jobs are recent, none prior → 'new'
    expect(customerManagementEngine.customerTrends(90).trends[0].trend).toBe("new");
    // 30-day window: 45d job → prior, 10d job → recent (-40%) → 'declining'
    const narrow = customerManagementEngine.customerTrends(30);
    expect(narrow.window_days).toBe(30);
    expect(narrow.trends[0].trend).toBe("declining");
    expect(narrow.trends[0].prior_revenue).toBe(5_000);
    expect(narrow.trends[0].recent_revenue).toBe(3_000);
  });

  it("customer with no jobs is excluded from trends but counted overall", () => {
    const active = mkCustomer("Active"); job(active, 5_000, 20);
    mkCustomer("Prospect"); // no jobs
    const r = customerManagementEngine.customerTrends();
    expect(r.total_customers).toBe(2);
    expect(r.active_customers).toBe(1);
    expect(r.trends.length).toBe(1);
  });
});

describe("businessDispatcher → customer_growth_trends round-trip", () => {
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
    if (r && Array.isArray(r.content) && r.content[0]?.text) return JSON.parse(r.content[0].text);
    if (r && r.type === "text" && typeof r.text === "string") return JSON.parse(r.text);
    return r;
  }

  it("dispatches with window_days param and returns a trends report", async () => {
    reset();
    const id = mkCustomer("DispTrend");
    job(id, 6_000, 45);
    job(id, 2_000, 10);
    const out = await call("customer_growth_trends", { window_days: 30 });
    const report = out?.result ?? out?.data ?? out;
    expect(report.window_days).toBe(30);
    expect(report.active_customers).toBe(1);
    expect(report.trends[0].trend).toBe("declining");
  });
});
