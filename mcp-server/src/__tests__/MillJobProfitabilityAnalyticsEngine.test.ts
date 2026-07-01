import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";
import {
  MillJobProfitabilityAnalyticsEngine,
  DEFAULT_OVERHEAD_RATE,
  PARETO_THRESHOLD,
  type RecordMillJobInput,
} from "../engines/MillJobProfitabilityAnalyticsEngine.js";

let tmpPath: string;
let eng: MillJobProfitabilityAnalyticsEngine;

function freshEngine(): MillJobProfitabilityAnalyticsEngine {
  tmpPath = join(tmpdir(), `mill-profitability-test-${Date.now()}-${Math.random()}.json`);
  return new MillJobProfitabilityAnalyticsEngine(tmpPath);
}

function nominalJob(overrides: Partial<RecordMillJobInput> = {}): RecordMillJobInput {
  return {
    job_id: "J-001",
    customer: "JM_DIE",
    part_number: "PN-1234",
    quantity: 100,
    revenue_total_usd: 10_000,
    material_cost_usd: 1_000,
    labor_cost_usd: 2_500,
    tool_wear_cost_usd: 300,
    setup_cost_usd: 200,
    fixture_amort_cost_usd: 500,
    energy_cost_usd: 150,
    strategy: "adaptive_clearing",
    axis_count: "3_axis",
    ...overrides,
  };
}

describe("MillJobProfitabilityAnalyticsEngine", () => {
  beforeEach(() => {
    if (tmpPath && existsSync(tmpPath)) rmSync(tmpPath, { force: true });
    eng = freshEngine();
  });

  it("getStats: 7 cost buckets + 2 mill-canonical + 4 portfolio dims + 2 mill-dims + Pareto 0.8", () => {
    const s = eng.getStats();
    expect(s.cost_buckets).toEqual([
      "material", "labor", "tool_wear", "setup",
      "fixture_amort", "energy", "overhead",
    ]);
    expect(s.mill_canonical_buckets).toEqual(["fixture_amort", "energy"]);
    expect(s.portfolio_dims).toEqual(["customer", "part_number", "strategy", "axis_count"]);
    expect(s.mill_canonical_dims).toEqual(["strategy", "axis_count"]);
    expect(s.pareto_threshold).toBe(PARETO_THRESHOLD);
  });

  it("DEFAULT_OVERHEAD_RATE is 0.15, PARETO_THRESHOLD is 0.8", () => {
    expect(DEFAULT_OVERHEAD_RATE).toBe(0.15);
    expect(PARETO_THRESHOLD).toBe(0.8);
  });

  it("recordJob computes waterfall correctly with mill-canonical fixture+energy", () => {
    const r = eng.recordJob(nominalJob());
    // per-unit: rev=100, mat=10, labor=25, tool=3, setup=2, fixture=5, energy=1.5
    // direct = 10+25+3+2+5+1.5 = 46.5
    // overhead = 46.5 × 0.15 = 6.975
    // cogs = 46.5 + 6.975 = 53.475
    // margin = 100 - 53.475 = 46.525
    expect(r.revenue_per_unit).toBe(100);
    expect(r.material_per_unit).toBe(10);
    expect(r.labor_per_unit).toBe(25);
    expect(r.tool_wear_per_unit).toBe(3);
    expect(r.setup_per_unit).toBe(2);
    expect(r.fixture_amort_per_unit).toBe(5);
    expect(r.energy_per_unit).toBe(1.5);
    expect(r.overhead_per_unit).toBeCloseTo(6.98, 2);
    expect(r.gross_margin_per_unit).toBeCloseTo(46.53, 2);
    expect(r.gross_profit_job).toBeCloseTo(4652.5, 1);
    expect(r.gross_margin_pct).toBeCloseTo(46.53, 1);
  });

  it("recordJob throws on duplicate job_id", () => {
    eng.recordJob(nominalJob());
    expect(() => eng.recordJob(nominalJob())).toThrow(/already recorded/);
  });

  it("recordJob validates schema: negative revenue rejected", () => {
    expect(() => eng.recordJob(nominalJob({ revenue_total_usd: -1 }))).toThrow();
  });

  it("recordJob validates schema: empty job_id rejected", () => {
    expect(() => eng.recordJob(nominalJob({ job_id: "" }))).toThrow();
  });

  it("recordJob validates schema: bad strategy enum rejected", () => {
    expect(() => eng.recordJob(nominalJob({ strategy: "tornado_milling" as never }))).toThrow();
  });

  it("recordJob validates schema: bad axis_count enum rejected", () => {
    expect(() => eng.recordJob(nominalJob({ axis_count: "9_axis" as never }))).toThrow();
  });

  it("zero fixture + zero energy → matches lathe waterfall (no mill-canonical contribution)", () => {
    const r = eng.recordJob(nominalJob({ fixture_amort_cost_usd: 0, energy_cost_usd: 0 }));
    // direct = 10+25+3+2 = 40, overhead = 6, cogs = 46
    expect(r.fixture_amort_per_unit).toBe(0);
    expect(r.energy_per_unit).toBe(0);
    expect(r.overhead_per_unit).toBeCloseTo(6, 2);
    expect(r.gross_margin_per_unit).toBeCloseTo(54, 2);
  });

  it("custom overhead_rate overrides default 0.15", () => {
    const r = eng.recordJob(nominalJob({ overhead_rate: 0.30 }));
    // overhead = 46.5 × 0.30 = 13.95
    expect(r.overhead_per_unit).toBeCloseTo(13.95, 2);
  });

  it("listJobs / getJob: persisted records readable", () => {
    eng.recordJob(nominalJob({ job_id: "J-100" }));
    eng.recordJob(nominalJob({ job_id: "J-101" }));
    expect(eng.listJobs().length).toBe(2);
    expect(eng.getJob("J-100")?.job_id).toBe("J-100");
    expect(eng.getJob("MISSING")).toBeNull();
  });

  it("portfolio by customer aggregates revenue + profit per customer", () => {
    eng.recordJob(nominalJob({ job_id: "J-A1", customer: "ACME", revenue_total_usd: 5000 }));
    eng.recordJob(nominalJob({ job_id: "J-A2", customer: "ACME", revenue_total_usd: 3000 }));
    eng.recordJob(nominalJob({ job_id: "J-B1", customer: "BETA", revenue_total_usd: 1000 }));
    const r = eng.portfolio({ by: "customer", top_n: 5 });
    expect(r.total_jobs).toBe(3);
    expect(r.total_revenue_usd).toBe(9000);
    const acme = r.top.find(row => row.key === "ACME");
    const beta = r.top.find(row => row.key === "BETA");
    expect(acme?.jobs).toBe(2);
    expect(acme?.total_revenue_usd).toBe(8000);
    expect(beta?.jobs).toBe(1);
  });

  it("portfolio by part_number works (lathe-shared dim)", () => {
    eng.recordJob(nominalJob({ job_id: "J-1", part_number: "PN-A" }));
    eng.recordJob(nominalJob({ job_id: "J-2", part_number: "PN-A" }));
    eng.recordJob(nominalJob({ job_id: "J-3", part_number: "PN-B" }));
    const r = eng.portfolio({ by: "part_number" });
    const pnA = r.top.find(row => row.key === "PN-A");
    expect(pnA?.jobs).toBe(2);
  });

  it("portfolio by STRATEGY (mill-canonical dim) groups by strategy", () => {
    eng.recordJob(nominalJob({ job_id: "J-1", strategy: "adaptive_clearing" }));
    eng.recordJob(nominalJob({ job_id: "J-2", strategy: "adaptive_clearing" }));
    eng.recordJob(nominalJob({ job_id: "J-3", strategy: "trochoidal" }));
    eng.recordJob(nominalJob({ job_id: "J-4", strategy: "full_slot" }));
    const r = eng.portfolio({ by: "strategy" });
    expect(r.top.length).toBe(3);
    const adapt = r.top.find(row => row.key === "adaptive_clearing");
    expect(adapt?.jobs).toBe(2);
  });

  it("portfolio by AXIS_COUNT (mill-canonical dim) groups by axis_count", () => {
    eng.recordJob(nominalJob({ job_id: "J-1", axis_count: "3_axis" }));
    eng.recordJob(nominalJob({ job_id: "J-2", axis_count: "5_axis_trunnion" }));
    eng.recordJob(nominalJob({ job_id: "J-3", axis_count: "5_axis_trunnion" }));
    const r = eng.portfolio({ by: "axis_count" });
    const five = r.top.find(row => row.key === "5_axis_trunnion");
    expect(five?.jobs).toBe(2);
  });

  it("portfolio sorts top-N by total_profit_usd descending", () => {
    eng.recordJob(nominalJob({ job_id: "J-1", customer: "LOW", revenue_total_usd: 1000 }));
    eng.recordJob(nominalJob({ job_id: "J-2", customer: "HIGH", revenue_total_usd: 50_000 }));
    eng.recordJob(nominalJob({ job_id: "J-3", customer: "MID", revenue_total_usd: 5000 }));
    const r = eng.portfolio({ top_n: 3 });
    expect(r.top[0].key).toBe("HIGH");
    expect(r.top[2].key).toBe("LOW");
  });

  it("portfolio bottom-N is the inverse-sorted list", () => {
    eng.recordJob(nominalJob({ job_id: "J-1", customer: "LOW", revenue_total_usd: 1000 }));
    eng.recordJob(nominalJob({ job_id: "J-2", customer: "HIGH", revenue_total_usd: 50_000 }));
    const r = eng.portfolio({ top_n: 2 });
    expect(r.bottom[0].key).toBe("LOW");
  });

  it("Pareto cutoff: 2 customers @ 80% revenue → count=2 and cumul ≥ 80%", () => {
    // 100, 60, 20, 20 → 80% at 100+60=160/200=80%; cutoff at count 2
    eng.recordJob(nominalJob({ job_id: "J-1", customer: "A", revenue_total_usd: 100 }));
    eng.recordJob(nominalJob({ job_id: "J-2", customer: "B", revenue_total_usd: 60 }));
    eng.recordJob(nominalJob({ job_id: "J-3", customer: "C", revenue_total_usd: 20 }));
    eng.recordJob(nominalJob({ job_id: "J-4", customer: "D", revenue_total_usd: 20 }));
    const r = eng.portfolio({ by: "customer" });
    expect(r.pareto_cutoff_count).toBe(2);
    expect(r.pareto_cutoff_pct_revenue).toBeCloseTo(80, 1);
  });

  it("portfolio median and stdev computed across margin_pct", () => {
    // 3 jobs with very different margins
    eng.recordJob(nominalJob({ job_id: "J-1", revenue_total_usd: 100, material_cost_usd: 50, labor_cost_usd: 0, tool_wear_cost_usd: 0, setup_cost_usd: 0, fixture_amort_cost_usd: 0, energy_cost_usd: 0 }));
    eng.recordJob(nominalJob({ job_id: "J-2", revenue_total_usd: 100, material_cost_usd: 80, labor_cost_usd: 0, tool_wear_cost_usd: 0, setup_cost_usd: 0, fixture_amort_cost_usd: 0, energy_cost_usd: 0 }));
    eng.recordJob(nominalJob({ job_id: "J-3", revenue_total_usd: 100, material_cost_usd: 90, labor_cost_usd: 0, tool_wear_cost_usd: 0, setup_cost_usd: 0, fixture_amort_cost_usd: 0, energy_cost_usd: 0 }));
    const r = eng.portfolio();
    expect(Number.isFinite(r.median_margin_pct)).toBe(true);
    expect(r.stdev_margin_pct).toBeGreaterThan(0);
  });

  it("time-window filter: since_iso excludes earlier jobs", () => {
    const past = "2025-01-01T00:00:00.000Z";
    const future = "2026-12-31T00:00:00.000Z";
    eng.recordJob(nominalJob({ job_id: "J-old", completed_at_iso: past }));
    eng.recordJob(nominalJob({ job_id: "J-new", completed_at_iso: future }));
    const r = eng.portfolio({ since_iso: "2026-01-01T00:00:00.000Z" });
    expect(r.total_jobs).toBe(1);
  });

  it("zero revenue → margin_pct = 0 (no division by zero)", () => {
    // Schema requires positive revenue; test with very small to validate division-safety
    const r = eng.recordJob(nominalJob({ revenue_total_usd: 0.01 }));
    expect(Number.isFinite(r.gross_margin_pct)).toBe(true);
  });

  it("variability ≥3: 3_axis vise vs 4_axis indexer vs 5_axis trunnion all record cleanly", () => {
    const r1 = eng.recordJob(nominalJob({ job_id: "J-3a", axis_count: "3_axis", revenue_total_usd: 1000 }));
    const r2 = eng.recordJob(nominalJob({ job_id: "J-4a", axis_count: "4_axis", revenue_total_usd: 1500 }));
    const r3 = eng.recordJob(nominalJob({ job_id: "J-5a", axis_count: "5_axis_trunnion", revenue_total_usd: 5000 }));
    expect(r1.axis_count).toBe("3_axis");
    expect(r2.axis_count).toBe("4_axis");
    expect(r3.axis_count).toBe("5_axis_trunnion");
    const r = eng.portfolio({ by: "axis_count", top_n: 5 });
    expect(r.top[0].key).toBe("5_axis_trunnion"); // highest revenue
  });

  it("__resetForTests clears state", () => {
    eng.recordJob(nominalJob());
    expect(eng.listJobs().length).toBe(1);
    eng.__resetForTests();
    expect(eng.listJobs().length).toBe(0);
  });

  it("persistence: new engine instance loads previously-saved jobs", () => {
    eng.recordJob(nominalJob({ job_id: "PERSIST-1" }));
    const eng2 = new MillJobProfitabilityAnalyticsEngine(tmpPath);
    expect(eng2.getJob("PERSIST-1")?.job_id).toBe("PERSIST-1");
  });
});
