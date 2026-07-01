/**
 * CashFlowProjectionEngine tests — restoration coverage (U-STUB-HUNT-02).
 *
 * Slot:bravo 2026-05-26. Every assertion checks a real numeric value or
 * cross-property invariant — no presence-only checks per the test-legitimacy
 * gate (no toBeDefined, no typeof === "function", no isolated toBeInstanceOf).
 */
import { describe, it, expect } from "vitest";
import {
  CashFlowProjectionEngine,
  cashFlowProjectionEngine,
  isoDay,
  addDays,
  bucketize,
  type ScheduledFlow,
} from "../engines/CashFlowProjectionEngine.js";

const T0 = "2026-05-26";
const FIXED_NOW = () => new Date(`${T0}T00:00:00.000Z`);

describe("isoDay", () => {
  it("strips time portion from ISO timestamp", () => {
    expect(isoDay(new Date("2026-05-26T12:34:56.000Z"))).toBe("2026-05-26");
    expect(isoDay(new Date("2020-01-01T00:00:00.000Z"))).toBe("2020-01-01");
  });
});

describe("addDays", () => {
  it("adds N days to YYYY-MM-DD", () => {
    expect(addDays("2026-05-26", 0)).toBe("2026-05-26");
    expect(addDays("2026-05-26", 1)).toBe("2026-05-27");
    expect(addDays("2026-05-26", 30)).toBe("2026-06-25");
  });
  it("handles month + year rollover", () => {
    expect(addDays("2026-02-27", 3)).toBe("2026-03-02");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });
  it("accepts negative offsets", () => {
    expect(addDays("2026-05-26", -1)).toBe("2026-05-25");
  });
});

describe("bucketize", () => {
  it("places flows in matching day buckets, ignores out-of-horizon", () => {
    const flows: ScheduledFlow[] = [
      { date: "2026-05-26", amount: 100, type: "inflow" },
      { date: "2026-05-28", amount: 50, type: "outflow" },
      { date: "2026-06-01", amount: 999, type: "outflow" },
    ];
    const buckets = bucketize(flows, "2026-05-26", 3);
    expect(buckets.size).toBe(3);
    expect(buckets.get("2026-05-26")!.length).toBe(1);
    expect(buckets.get("2026-05-27")!.length).toBe(0);
    expect(buckets.get("2026-05-28")!.length).toBe(1);
    expect(buckets.has("2026-06-01")).toBe(false);
  });
  it("truncates timestamp to YYYY-MM-DD before matching", () => {
    const flows: ScheduledFlow[] = [{ date: "2026-05-26T15:00:00Z", amount: 10, type: "inflow" }];
    const buckets = bucketize(flows, "2026-05-26", 1);
    expect(buckets.get("2026-05-26")![0].amount).toBe(10);
  });
});

describe("CashFlowProjectionEngine.project — per-bucket arithmetic", () => {
  it("buckets daily and computes per-day inflow/outflow/net/running", () => {
    const e = new CashFlowProjectionEngine({ now: FIXED_NOW });
    const flows: ScheduledFlow[] = [
      { date: "2026-05-26", amount: 1000, type: "inflow", label: "invoice" },
      { date: "2026-05-26", amount: 200, type: "outflow", label: "vendor" },
      { date: "2026-05-28", amount: 500, type: "outflow", label: "payroll" },
    ];
    const r = e.project(7, flows, 100);
    expect(r.horizonDays).toBe(7);
    expect(r.startDate).toBe(T0);
    expect(r.endDate).toBe(addDays(T0, 6));
    expect(r.openingBalance).toBe(100);
    expect(r.totalInflow).toBe(1000);
    expect(r.totalOutflow).toBe(700);
    expect(r.netCashFlow).toBe(300);
    expect(r.closingBalance).toBe(400);
    expect(r.flowCount).toBe(3);
    expect(r.daysWithActivity).toBe(2);
    expect(r.buckets).toHaveLength(7);
    // Day 0: +1000 -200 = +800, opening 100 → running 900
    expect(r.buckets[0].date).toBe(T0);
    expect(r.buckets[0].inflow).toBe(1000);
    expect(r.buckets[0].outflow).toBe(200);
    expect(r.buckets[0].net).toBe(800);
    expect(r.buckets[0].runningBalance).toBe(900);
    // Day 2: -500, running 900 - 500 = 400
    expect(r.buckets[2].runningBalance).toBe(400);
    // Last day = running balance stable
    expect(r.buckets[6].runningBalance).toBe(400);
    // Cross-invariant: closingBalance equals last bucket's runningBalance
    expect(r.closingBalance).toBe(r.buckets[r.buckets.length - 1].runningBalance);
    // Cross-invariant: sum of bucket nets equals netCashFlow
    expect(r.buckets.reduce((s, b) => s + b.net, 0)).toBe(r.netCashFlow);
  });

  it("flags insolvency days + records firstInsolvencyDate", () => {
    const e = new CashFlowProjectionEngine({ now: FIXED_NOW });
    const flows: ScheduledFlow[] = [
      { date: "2026-05-27", amount: 500, type: "outflow" },
    ];
    const r = e.project(3, flows, 100);
    expect(r.daysInsolvent).toBe(2);
    expect(r.firstInsolvencyDate).toBe("2026-05-27");
    expect(r.buckets[1].runningBalance).toBe(-400);
    expect(r.buckets[2].runningBalance).toBe(-400);
    // Cross-invariant: count of negative-balance buckets matches daysInsolvent
    expect(r.buckets.filter((b) => b.runningBalance < 0).length).toBe(r.daysInsolvent);
  });

  it("burn-rate analytics — daysUntilZero from openingBalance + averageDailyNet", () => {
    const e = new CashFlowProjectionEngine({ now: FIXED_NOW });
    const flows: ScheduledFlow[] = [
      { date: "2026-05-26", amount: 100, type: "outflow" },
      { date: "2026-05-27", amount: 100, type: "outflow" },
      { date: "2026-05-28", amount: 100, type: "outflow" },
      { date: "2026-05-29", amount: 100, type: "outflow" },
    ];
    const r = e.project(4, flows, 1000);
    expect(r.burnRate.averageDailyNet).toBe(-100);
    expect(r.burnRate.averageDailyOutflow).toBe(100);
    expect(r.burnRate.averageDailyInflow).toBe(0);
    expect(r.burnRate.daysUntilZero).toBe(10);
    // Cross-invariant: averageDailyNet = (totalInflow - totalOutflow) / horizonDays
    expect(r.burnRate.averageDailyNet).toBe((r.totalInflow - r.totalOutflow) / r.horizonDays);
  });

  it("daysUntilZero is null when averageDailyNet >= 0", () => {
    const e = new CashFlowProjectionEngine({ now: FIXED_NOW });
    const flows: ScheduledFlow[] = [{ date: "2026-05-26", amount: 100, type: "inflow" }];
    const r = e.project(3, flows, 50);
    expect(r.burnRate.averageDailyNet > 0).toBe(true);
    expect(r.burnRate.daysUntilZero).toBeNull();
  });

  it("daysUntilZero is null when openingBalance is 0", () => {
    const e = new CashFlowProjectionEngine({ now: FIXED_NOW });
    const r = e.project(3, [{ date: "2026-05-26", amount: 50, type: "outflow" }], 0);
    expect(r.openingBalance).toBe(0);
    expect(r.burnRate.daysUntilZero).toBeNull();
  });

  it("ignores flows outside horizon window", () => {
    const e = new CashFlowProjectionEngine({ now: FIXED_NOW });
    const flows: ScheduledFlow[] = [
      { date: "2026-05-26", amount: 100, type: "inflow" },
      { date: "2030-01-01", amount: 999999, type: "outflow" },
    ];
    const r = e.project(7, flows, 0);
    expect(r.totalInflow).toBe(100);
    expect(r.totalOutflow).toBe(0);
    expect(r.netCashFlow).toBe(100);
  });

  it("empty scheduledFlows still returns valid projection of all-zero buckets", () => {
    const e = new CashFlowProjectionEngine({ now: FIXED_NOW });
    const r = e.project(5, [], 500);
    expect(r.totalInflow).toBe(0);
    expect(r.totalOutflow).toBe(0);
    expect(r.closingBalance).toBe(500);
    expect(r.daysWithActivity).toBe(0);
    expect(r.buckets).toHaveLength(5);
    expect(r.buckets.every((b) => b.runningBalance === 500)).toBe(true);
    expect(r.buckets.every((b) => b.net === 0)).toBe(true);
  });
});

describe("CashFlowProjectionEngine.project — fail-loud validation", () => {
  const e = new CashFlowProjectionEngine();
  it("rejects non-positive horizonDays with descriptive error", () => {
    expect(() => e.project(0, [])).toThrow(/horizonDays must be a positive/);
    expect(() => e.project(-1, [])).toThrow(/horizonDays must be a positive/);
    expect(() => e.project(NaN, [])).toThrow(/horizonDays must be a positive/);
    expect(() => e.project(Infinity, [])).toThrow(/horizonDays must be a positive/);
  });
  it("rejects non-array scheduledFlows", () => {
    expect(() => e.project(7, null as unknown as ScheduledFlow[])).toThrow(/must be an array/);
    expect(() => e.project(7, "x" as unknown as ScheduledFlow[])).toThrow(/must be an array/);
  });
  it("rejects non-finite openingBalance", () => {
    expect(() => e.project(7, [], NaN)).toThrow(/openingBalance must be finite/);
    expect(() => e.project(7, [], Infinity)).toThrow(/openingBalance must be finite/);
  });
  it("rejects malformed flows: missing date, invalid type, negative amount, Infinity", () => {
    expect(() => e.project(7, [{ amount: 1, type: "inflow" } as unknown as ScheduledFlow])).toThrow(/missing date/);
    expect(() => e.project(7, [{ date: T0, amount: 1, type: "weird" } as unknown as ScheduledFlow])).toThrow(/invalid type/);
    expect(() => e.project(7, [{ date: T0, amount: -5, type: "inflow" }])).toThrow(/non-negative/);
    expect(() => e.project(7, [{ date: T0, amount: Infinity, type: "inflow" }])).toThrow(/non-negative/);
  });
});

describe("module-singleton — invoked", () => {
  it("singleton produces same per-bucket arithmetic as a fresh instance", () => {
    // Use today's iso so this works without injecting a custom clock
    const today = isoDay(new Date());
    const r = cashFlowProjectionEngine.project(2, [
      { date: today, amount: 100, type: "inflow" },
    ], 50);
    expect(r.horizonDays).toBe(2);
    expect(r.buckets).toHaveLength(2);
    expect(r.totalInflow).toBe(100);
    expect(r.openingBalance).toBe(50);
    expect(r.closingBalance).toBe(150);
    // Day-0 inflow lands in first bucket
    expect(r.buckets[0].inflow).toBe(100);
    expect(r.buckets[0].runningBalance).toBe(150);
    // Day-1 quiet, balance carries forward
    expect(r.buckets[1].inflow).toBe(0);
    expect(r.buckets[1].runningBalance).toBe(150);
  });
});
