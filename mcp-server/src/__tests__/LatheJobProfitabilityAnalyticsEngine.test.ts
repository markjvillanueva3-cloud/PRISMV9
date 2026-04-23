/**
 * LatheJobProfitabilityAnalyticsEngine tests — U-LTH54
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LatheJobProfitabilityAnalyticsEngine } from "../engines/LatheJobProfitabilityAnalyticsEngine.js";

function makeEngine(): { engine: LatheJobProfitabilityAnalyticsEngine; statePath: string } {
  const dir = mkdtempSync(join(tmpdir(), "prof-test-"));
  const statePath = join(dir, "state.json");
  const engine = new LatheJobProfitabilityAnalyticsEngine(statePath);
  engine.__resetForTests();
  return { engine, statePath };
}

describe("LatheJobProfitabilityAnalyticsEngine — waterfall math", () => {
  it("computes margin correctly for a single job", () => {
    const { engine } = makeEngine();
    // Revenue 1000, direct 400 (100+200+50+50), overhead 15%×400=60, cogs=460
    // gross margin per unit = (1000-460)/10 = 54
    const job = engine.recordJob({
      job_id: "J1",
      customer: "ALCOA",
      part_number: "AL-DIE-PIN",
      quantity: 10,
      revenue_total_usd: 1000,
      material_cost_usd: 100,
      labor_cost_usd: 200,
      tool_wear_cost_usd: 50,
      setup_cost_usd: 50,
    });
    expect(job.revenue_per_unit).toBe(100);
    expect(job.material_per_unit).toBe(10);
    expect(job.labor_per_unit).toBe(20);
    expect(job.tool_wear_per_unit).toBe(5);
    expect(job.setup_per_unit).toBe(5);
    expect(job.overhead_per_unit).toBe(6); // 40 × 0.15
    expect(job.gross_margin_per_unit).toBe(54);
    expect(job.gross_profit_job).toBe(540);
    expect(job.gross_margin_pct).toBe(54);
  });

  it("honors overhead_rate override", () => {
    const { engine } = makeEngine();
    const job = engine.recordJob({
      job_id: "J2",
      customer: "X", part_number: "P",
      quantity: 1,
      revenue_total_usd: 100,
      material_cost_usd: 20, labor_cost_usd: 30, tool_wear_cost_usd: 10,
      setup_cost_usd: 0,
      overhead_rate: 0.5,
    });
    // direct 60, overhead 30, cogs 90, margin 10
    expect(job.overhead_per_unit).toBe(30);
    expect(job.gross_margin_per_unit).toBe(10);
  });

  it("negative margin when cogs > revenue (unprofitable job)", () => {
    const { engine } = makeEngine();
    const job = engine.recordJob({
      job_id: "J3",
      customer: "X", part_number: "P",
      quantity: 1,
      revenue_total_usd: 50,
      material_cost_usd: 30, labor_cost_usd: 40, tool_wear_cost_usd: 10,
      setup_cost_usd: 0,
    });
    expect(job.gross_margin_per_unit).toBeLessThan(0);
    expect(job.gross_margin_pct).toBeLessThan(0);
  });
});

describe("LatheJobProfitabilityAnalyticsEngine — duplicate / failure modes", () => {
  it("rejects duplicate job_id", () => {
    const { engine } = makeEngine();
    engine.recordJob({
      job_id: "J", customer: "A", part_number: "P", quantity: 1,
      revenue_total_usd: 100, material_cost_usd: 10, labor_cost_usd: 20,
      tool_wear_cost_usd: 5,
    });
    expect(() =>
      engine.recordJob({
        job_id: "J", customer: "A", part_number: "P", quantity: 1,
        revenue_total_usd: 100, material_cost_usd: 10, labor_cost_usd: 20,
        tool_wear_cost_usd: 5,
      }),
    ).toThrow(/already recorded/);
  });

  it("rejects zero quantity", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordJob({
        job_id: "J", customer: "A", part_number: "P", quantity: 0,
        revenue_total_usd: 100, material_cost_usd: 10, labor_cost_usd: 20,
        tool_wear_cost_usd: 5,
      }),
    ).toThrow();
  });

  it("rejects negative revenue", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordJob({
        job_id: "J", customer: "A", part_number: "P", quantity: 1,
        revenue_total_usd: -100, material_cost_usd: 10, labor_cost_usd: 20,
        tool_wear_cost_usd: 5,
      }),
    ).toThrow();
  });

  it("rejects NaN material cost", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordJob({
        job_id: "J", customer: "A", part_number: "P", quantity: 1,
        revenue_total_usd: 100, material_cost_usd: Number.NaN,
        labor_cost_usd: 20, tool_wear_cost_usd: 5,
      }),
    ).toThrow();
  });

  it("rejects Infinity labor cost", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordJob({
        job_id: "J", customer: "A", part_number: "P", quantity: 1,
        revenue_total_usd: 100, material_cost_usd: 10,
        labor_cost_usd: Number.POSITIVE_INFINITY, tool_wear_cost_usd: 5,
      }),
    ).toThrow();
  });
});

describe("LatheJobProfitabilityAnalyticsEngine — portfolio analysis", () => {
  function seed(engine: LatheJobProfitabilityAnalyticsEngine) {
    // ALCOA 2 jobs, high margin
    engine.recordJob({
      job_id: "J1", customer: "ALCOA", part_number: "P1", quantity: 10,
      revenue_total_usd: 1000, material_cost_usd: 100, labor_cost_usd: 100,
      tool_wear_cost_usd: 50, setup_cost_usd: 50,
    });
    engine.recordJob({
      job_id: "J2", customer: "ALCOA", part_number: "P2", quantity: 5,
      revenue_total_usd: 800, material_cost_usd: 80, labor_cost_usd: 80,
      tool_wear_cost_usd: 40, setup_cost_usd: 40,
    });
    // ITW low margin
    engine.recordJob({
      job_id: "J3", customer: "ITW", part_number: "P3", quantity: 20,
      revenue_total_usd: 500, material_cost_usd: 200, labor_cost_usd: 150,
      tool_wear_cost_usd: 50, setup_cost_usd: 50,
    });
    // OPTIMAS unprofitable
    engine.recordJob({
      job_id: "J4", customer: "OPTIMAS", part_number: "P4", quantity: 3,
      revenue_total_usd: 150, material_cost_usd: 100, labor_cost_usd: 80,
      tool_wear_cost_usd: 30,
    });
  }

  it("group-by-customer aggregates revenue + profit correctly", () => {
    const { engine } = makeEngine();
    seed(engine);
    const report = engine.portfolio({ by: "customer", top_n: 10 });
    const alcoa = report.top.find((r) => r.key === "ALCOA")!;
    expect(alcoa.jobs).toBe(2);
    expect(alcoa.total_revenue_usd).toBe(1800);
  });

  it("top ranking lists highest-profit customer first", () => {
    const { engine } = makeEngine();
    seed(engine);
    const report = engine.portfolio({ by: "customer", top_n: 3 });
    expect(report.top[0].key).toBe("ALCOA");
  });

  it("bottom ranking surfaces unprofitable customer first", () => {
    const { engine } = makeEngine();
    seed(engine);
    const report = engine.portfolio({ by: "customer", top_n: 3 });
    expect(report.bottom[0].key).toBe("OPTIMAS");
    expect(report.bottom[0].total_profit_usd).toBeLessThan(0);
  });

  it("group-by-part_number produces distinct rows per part", () => {
    const { engine } = makeEngine();
    seed(engine);
    const report = engine.portfolio({ by: "part_number", top_n: 10 });
    const keys = report.top.map((r) => r.key).sort();
    expect(keys.slice(0, 4)).toEqual(["P1", "P2", "P3", "P4"]);
  });

  it("pareto cutoff identifies 80% revenue customers", () => {
    const { engine } = makeEngine();
    seed(engine);
    const report = engine.portfolio({ by: "customer" });
    expect(report.pareto_cutoff_count).toBeGreaterThanOrEqual(1);
    expect(report.pareto_cutoff_count).toBeLessThanOrEqual(3);
    expect(report.pareto_cutoff_pct_revenue).toBeGreaterThanOrEqual(80);
  });

  it("median and stdev reflect real margin dispersion", () => {
    const { engine } = makeEngine();
    seed(engine);
    const report = engine.portfolio();
    expect(report.median_margin_pct).not.toBe(0);
    expect(report.stdev_margin_pct).toBeGreaterThan(0);
  });

  it("since/until window filters jobs outside the range", () => {
    const { engine } = makeEngine();
    engine.recordJob({
      job_id: "OLD", customer: "A", part_number: "P", quantity: 1,
      revenue_total_usd: 100, material_cost_usd: 10, labor_cost_usd: 10,
      tool_wear_cost_usd: 5, completed_at_iso: "2025-01-01T00:00:00.000Z",
    });
    engine.recordJob({
      job_id: "NEW", customer: "A", part_number: "P", quantity: 1,
      revenue_total_usd: 100, material_cost_usd: 10, labor_cost_usd: 10,
      tool_wear_cost_usd: 5, completed_at_iso: "2026-04-01T00:00:00.000Z",
    });
    const only2026 = engine.portfolio({ since_iso: "2026-01-01T00:00:00.000Z" });
    expect(only2026.total_jobs).toBe(1);
  });
});

describe("LatheJobProfitabilityAnalyticsEngine — persistence", () => {
  it("jobs survive new engine instance", () => {
    const { engine, statePath } = makeEngine();
    engine.recordJob({
      job_id: "J", customer: "A", part_number: "P", quantity: 1,
      revenue_total_usd: 100, material_cost_usd: 10, labor_cost_usd: 20,
      tool_wear_cost_usd: 5,
    });
    expect(existsSync(statePath)).toBe(true);
    const engine2 = new LatheJobProfitabilityAnalyticsEngine(statePath);
    expect(engine2.__getState().jobs).toHaveLength(1);
  });

  it("persisted JSON has schemaVersion=1", () => {
    const { engine, statePath } = makeEngine();
    engine.recordJob({
      job_id: "J", customer: "A", part_number: "P", quantity: 1,
      revenue_total_usd: 100, material_cost_usd: 10, labor_cost_usd: 20,
      tool_wear_cost_usd: 5,
    });
    const parsed = JSON.parse(readFileSync(statePath, "utf-8")) as { schemaVersion: number };
    expect(parsed.schemaVersion).toBe(1);
  });
});

describe("LatheJobProfitabilityAnalyticsEngine — dispatcher wiring", () => {
  it("both U-LTH54 actions are enum + case + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    expect(src).toContain('"lathe_profit_record"');
    expect(src).toContain('"lathe_profit_portfolio"');
    expect(src).toMatch(/case "lathe_profit_record"/);
    expect(src).toMatch(/case "lathe_profit_portfolio"/);
    expect(src).toContain('"../../engines/LatheJobProfitabilityAnalyticsEngine.js"');
    expect(src).toContain('case "latheProfitability"');
  });
});
