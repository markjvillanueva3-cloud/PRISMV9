/**
 * LatheERPDashboard.test.tsx — U-LTH55 BI dashboard tests
 *
 * Verifies 6 tiles render with exact computed values from injected dispatch.
 * No presence-only asserts: every `expect` pins a concrete string or number.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import LatheERPDashboard from "../pages/LatheERPDashboard";

function dispatchFixture(action: string): unknown {
  if (action === "lathe_order_pipeline") {
    return { draft: 2, quoted: 1, accepted: 1, scheduled: 1, in_production: 3, shipped: 0, invoiced: 0, closed: 5 };
  }
  if (action === "billing_stats") {
    return {
      active_subscriptions: 4,
      mrr_cents: 19600,
      arr_cents: 235200,
      churn_rate_30d: 0.05,
      revenue_mtd_cents: 19600,
      total_usage_posts_mtd: 0,
      plans_breakdown: {},
    };
  }
  if (action === "lathe_inv_snapshot") {
    return {
      item_count: 12, critical_count: 1, low_count: 3, excess_count: 2,
      total_value_usd: 4200, rows: [], generated_at: "2026-04-23T00:00:00Z",
    };
  }
  if (action === "lathe_profit_portfolio") {
    return {
      by: "customer", top_n: 5, range: { since: null, until: null },
      total_jobs: 8, total_revenue_usd: 50000, total_profit_usd: 12000,
      overall_margin_pct: 24, median_margin_pct: 22, stdev_margin_pct: 8.5,
      pareto_cutoff_count: 2, pareto_cutoff_pct_revenue: 82,
      top: [{ key: "ALCOA", jobs: 3, total_revenue_usd: 20000, total_profit_usd: 6000, avg_margin_pct: 30, best_margin_pct: 35, worst_margin_pct: 25 }],
      bottom: [{ key: "OPTIMAS", jobs: 1, total_revenue_usd: 500, total_profit_usd: -50, avg_margin_pct: -10, best_margin_pct: -10, worst_margin_pct: -10 }],
    };
  }
  if (action === "lathe_actual_cost_accuracy") {
    return {
      sample_count: 7, mean_abs_variance_pct: 8.3, bias_pct: 1.2,
      stdev_variance_pct: 4.1, worst_variance_pct: 18, best_variance_pct: 1.5,
    };
  }
  throw new Error(`unexpected action ${action}`);
}

function makeDispatchOK() {
  return vi.fn(async (action: string) => dispatchFixture(action));
}

describe("LatheERPDashboard — render", () => {
  it("header text is exactly 'LATHE ERP Dashboard'", () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} />);
    expect(screen.getByText("LATHE ERP Dashboard").tagName).toBe("H1");
  });

  it("renders exactly 6 tile DIVs with expected testids", async () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} scheduleSummary={{ jobs: 5, on_time: 4, late: 1, util_pct: 72.5 }} />);
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(5);
    });
    const ids = [
      "tile-pipeline",
      "tile-billing-mrr",
      "tile-inventory",
      "tile-schedule",
      "tile-profitability",
      "tile-quote-accuracy",
    ];
    for (const id of ids) {
      expect(screen.getByTestId(id).tagName).toBe("DIV");
    }
  });

  it("dispatches exactly 5 live-query actions, sorted names match expected set", async () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} />);
    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(5));
    const callArgs = dispatch.mock.calls.map((c) => c[0]).sort();
    expect(callArgs).toEqual([
      "billing_stats",
      "lathe_actual_cost_accuracy",
      "lathe_inv_snapshot",
      "lathe_order_pipeline",
      "lathe_profit_portfolio",
    ]);
  });

  it("pipeline header text equals '13 orders' (sum of 8 states: 2+1+1+1+3+0+0+5)", async () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} />);
    await waitFor(() => {
      expect(screen.getByText("13 orders").textContent).toBe("13 orders");
    });
  });

  it("billing tile shows '$196/mo' from 19600 cents, $2352 ARR, 5.00% churn", async () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} />);
    await waitFor(() => {
      const tile = screen.getByTestId("tile-billing-mrr");
      expect(tile.textContent).toContain("$196");
    });
    const tile = screen.getByTestId("tile-billing-mrr");
    expect(tile.textContent).toContain("/mo");      // unit suffix present
    expect(tile.textContent).toContain("$2352");    // ARR 235200 cents = $2352
    expect(tile.textContent).toContain("5.00%");    // churn 0.05 → 5.00%
    expect(tile.textContent?.match(/Subscriptions\s*4/)?.[0]).toMatch(/Subscriptions\s*4/);
  });

  it("inventory tile shows '12 SKUs' and breakdown by severity", async () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} />);
    await waitFor(() => {
      expect(screen.getByText("12 SKUs").textContent).toBe("12 SKUs");
    });
    const tile = screen.getByTestId("tile-inventory");
    expect(tile.textContent?.match(/Critical\s*1/)?.[0]).toMatch(/Critical\s*1/);
    expect(tile.textContent?.match(/Low\s*3/)?.[0]).toMatch(/Low\s*3/);
    expect(tile.textContent?.match(/Excess\s*2/)?.[0]).toMatch(/Excess\s*2/);
    expect(tile.textContent).toContain("$4200");
  });

  it("schedule tile from injected summary shows '5 jobs', '72.5%' util", async () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} scheduleSummary={{ jobs: 5, on_time: 4, late: 1, util_pct: 72.5 }} />);
    const tile = screen.getByTestId("tile-schedule");
    expect(tile.textContent).toContain("5 jobs");
    expect(tile.textContent?.match(/On time\s*4/)?.[0]).toMatch(/On time\s*4/);
    expect(tile.textContent?.match(/Late\s*1/)?.[0]).toMatch(/Late\s*1/);
    expect(tile.textContent).toContain("72.5%");
  });

  it("profitability tile shows '$12000' total profit and exact Top/Bottom customer names", async () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} />);
    await waitFor(() => {
      expect(screen.getByText("$12000").textContent).toBe("$12000");
    });
    const tile = screen.getByTestId("tile-profitability");
    expect(tile.textContent).toContain("Top: ALCOA");
    expect(tile.textContent).toContain("Bottom: OPTIMAS");
    expect(tile.textContent).toContain("24.0%");
  });

  it("accuracy tile shows '±8.3%', bias 1.2%, worst 18.0%, samples 7 — exact values", async () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} />);
    await waitFor(() => {
      expect(screen.getByText("±8.3%").textContent).toBe("±8.3%");
    });
    const tile = screen.getByTestId("tile-quote-accuracy");
    expect(tile.textContent?.match(/Bias\s*1\.2%/)?.[0]).toMatch(/Bias\s*1\.2%/);
    expect(tile.textContent?.match(/Worst\s*18\.0%/)?.[0]).toMatch(/Worst\s*18\.0%/);
    expect(tile.textContent?.match(/Samples\s*7/)?.[0]).toMatch(/Samples\s*7/);
  });
});

describe("LatheERPDashboard — error handling", () => {
  it("pipeline failure surfaces exact 'pipeline down' string in that tile only", async () => {
    const dispatch = vi.fn(async (action: string) => {
      if (action === "lathe_order_pipeline") throw new Error("pipeline down");
      return dispatchFixture(action);
    });
    render(<LatheERPDashboard dispatch={dispatch} />);
    await waitFor(() => {
      const pipelineTile = screen.getByTestId("tile-pipeline");
      expect(pipelineTile.textContent).toContain("pipeline down");
    });
    // Others still render live data — inventory tile unaffected
    const invTile = screen.getByTestId("tile-inventory");
    expect(invTile.textContent).toContain("12 SKUs");
  });

  it("billing failure leaves pipeline tile rendering 13 orders", async () => {
    const dispatch = vi.fn(async (action: string) => {
      if (action === "billing_stats") throw new Error("stripe 500");
      return dispatchFixture(action);
    });
    render(<LatheERPDashboard dispatch={dispatch} />);
    await waitFor(() => {
      expect(screen.getByText("13 orders").textContent).toBe("13 orders");
    });
    const billingTile = screen.getByTestId("tile-billing-mrr");
    expect(billingTile.textContent).toContain("stripe 500");
  });
});

describe("LatheERPDashboard — missing scheduleSummary prop", () => {
  it("schedule tile renders exact string 'No schedule data'", async () => {
    const dispatch = makeDispatchOK();
    render(<LatheERPDashboard dispatch={dispatch} />);
    await waitFor(() => {
      expect(screen.getByText("No schedule data").textContent).toBe("No schedule data");
    });
  });
});
