/**
 * InventoryReorderPointFormula.test.ts — hotel iter13.
 * Reference cases cross-checked against Silver/Pyke/Peterson textbook
 * worked examples and NIST/Sematech z-table values.
 */

import { describe, it, expect } from "vitest";
import {
  economicOrderQuantity,
  safetyStock,
  reorderPoint,
  totalInventoryCost,
  reorderPolicy,
} from "../algorithms/InventoryReorderPointFormula.js";

const TOLERANCE_PCT = 0.005;
const SECOND_TOLERANCE_PCT = 0.01;

describe("economicOrderQuantity (Wilson 1934)", () => {
  it("Silver §5.2 worked example: D=10000, S=$50, H=$5 → Q*=447.21", () => {
    // EOQ = sqrt(2*10000*50/5) = sqrt(200000) = 447.2136
    const q = economicOrderQuantity(10_000, 50, 5);
    expect(Math.abs(q - 447.2136) / 447.2136).toBeLessThan(TOLERANCE_PCT);
  });

  it("doubling demand → EOQ scales by sqrt(2)", () => {
    const q1 = economicOrderQuantity(1000, 25, 2);
    const q2 = economicOrderQuantity(2000, 25, 2);
    expect(Math.abs(q2 - q1 * Math.sqrt(2))).toBeLessThan(1e-6);
  });

  it("doubling order cost → EOQ scales by sqrt(2)", () => {
    const q1 = economicOrderQuantity(1000, 25, 2);
    const q2 = economicOrderQuantity(1000, 50, 2);
    expect(Math.abs(q2 - q1 * Math.sqrt(2))).toBeLessThan(1e-6);
  });

  it("doubling holding cost → EOQ scales by 1/sqrt(2)", () => {
    const q1 = economicOrderQuantity(1000, 25, 2);
    const q2 = economicOrderQuantity(1000, 25, 4);
    expect(Math.abs(q2 - q1 / Math.sqrt(2))).toBeLessThan(1e-6);
  });

  it("R12: rejects zero demand", () => {
    expect(() => economicOrderQuantity(0, 50, 5)).toThrow(/> 0/);
  });

  it("R12: rejects negative orderCost", () => {
    expect(() => economicOrderQuantity(1000, -1, 5)).toThrow(/> 0/);
  });

  it("R12: rejects NaN holdingCost", () => {
    expect(() => economicOrderQuantity(1000, 50, NaN)).toThrow(/finite/);
  });
});

describe("safetyStock (Brown 1959 z-score)", () => {
  it("95% service: SS = 1.6449 · σ · sqrt(LT) — σ=10, LT=4 → 32.898", () => {
    const ss = safetyStock(10, 4, 0.95);
    // 1.6449 * 10 * 2 = 32.898
    expect(Math.abs(ss - 32.898) / 32.898).toBeLessThan(TOLERANCE_PCT);
  });

  it("99% service: z=2.3263 — σ=5, LT=9 → 34.8945", () => {
    const ss = safetyStock(5, 9, 0.99);
    // 2.3263 * 5 * 3 = 34.8945
    expect(Math.abs(ss - 34.8945) / 34.8945).toBeLessThan(TOLERANCE_PCT);
  });

  it("50% service: z=0 → SS=0 (no buffer)", () => {
    const ss = safetyStock(10, 4, 0.50);
    expect(ss).toBe(0);
  });

  it("zero demand variance → SS=0 regardless of service level", () => {
    const ss = safetyStock(0, 4, 0.99);
    expect(ss).toBe(0);
  });

  it("linear interpolation between 0.95 and 0.975", () => {
    const ss950 = safetyStock(10, 4, 0.95);
    const ss975 = safetyStock(10, 4, 0.975);
    const ss962 = safetyStock(10, 4, 0.9625);
    expect(ss962).toBeGreaterThan(ss950);
    expect(ss962).toBeLessThan(ss975);
  });

  it("R12: rejects service_level < 0.50", () => {
    expect(() => safetyStock(10, 4, 0.40)).toThrow(/0.5/);
  });

  it("R12: rejects service_level > 0.999", () => {
    expect(() => safetyStock(10, 4, 0.9999)).toThrow(/0.999/);
  });

  it("R12: rejects negative stdDev", () => {
    expect(() => safetyStock(-1, 4, 0.95)).toThrow(/>= 0/);
  });

  it("R12: rejects LT=0", () => {
    expect(() => safetyStock(10, 0, 0.95)).toThrow(/> 0/);
  });
});

describe("reorderPoint", () => {
  it("d=50/day, LT=4, SS=33 → ROP = 200 + 33 = 233", () => {
    const rop = reorderPoint(50, 4, 33);
    expect(rop).toBe(233);
  });

  it("zero safety stock → ROP = pure lead-time demand", () => {
    const rop = reorderPoint(20, 7, 0);
    expect(rop).toBe(140);
  });

  it("R12: rejects negative SS", () => {
    expect(() => reorderPoint(20, 7, -1)).toThrow(/>= 0/);
  });

  it("R12: rejects zero avgDailyDemand", () => {
    expect(() => reorderPoint(0, 7, 5)).toThrow(/> 0/);
  });
});

describe("totalInventoryCost (sensitivity)", () => {
  it("TC at EOQ equals 2 · TC(ordering) = 2 · TC(holding) — symmetry property", () => {
    const D = 10_000, S = 50, H = 5;
    const eoq = economicOrderQuantity(D, S, H);
    const ordering = (D / eoq) * S;
    const holding = (eoq / 2) * H;
    // At the EOQ, ordering cost == holding cost (classic Wilson property)
    expect(Math.abs(ordering - holding)).toBeLessThan(1e-6);
    // And total cost at EOQ = ordering + holding
    const tc = totalInventoryCost(D, S, H, eoq);
    expect(Math.abs(tc - (ordering + holding))).toBeLessThan(1e-6);
  });

  it("non-optimal Q always >= TC(EOQ)", () => {
    const D = 10_000, S = 50, H = 5;
    const eoq = economicOrderQuantity(D, S, H);
    const tcEoq = totalInventoryCost(D, S, H, eoq);
    const tcLow = totalInventoryCost(D, S, H, eoq * 0.5);
    const tcHigh = totalInventoryCost(D, S, H, eoq * 2);
    expect(tcLow).toBeGreaterThan(tcEoq);
    expect(tcHigh).toBeGreaterThan(tcEoq);
  });

  it("R12: rejects orderQuantity=0", () => {
    expect(() => totalInventoryCost(1000, 50, 5, 0)).toThrow(/> 0/);
  });
});

describe("reorderPolicy (aggregated)", () => {
  it("returns all four surfaces consistently", () => {
    const p = reorderPolicy({
      annualDemand: 10_000,
      orderCost: 50,
      holdingCost: 5,
      avgDailyDemand: 27.4,        // ~10000/365
      stdDevDemand: 4,
      leadTimeDays: 7,
      serviceLevel: 0.95,
    });
    expect(p.eoq).toBeCloseTo(447.2136, 2);
    expect(p.z_score).toBeCloseTo(1.6449, 4);
    // SS = 1.6449 * 4 * sqrt(7) ≈ 17.4
    expect(p.safety_stock).toBeCloseTo(17.40998, 2);
    // ROP = 27.4 * 7 + 17.41 ≈ 209.21
    expect(p.reorder_point).toBeCloseTo(209.20998, 2);
    // Orders/year = 10000 / 447.21 ≈ 22.36
    expect(p.expected_orders_per_year).toBeCloseTo(22.3607, 2);
    // Days between = 365 / 22.36 ≈ 16.32
    expect(p.expected_days_between_orders).toBeCloseTo(16.3242, 2);
  });

  it("higher service level → larger SS → larger ROP", () => {
    const baseInput = {
      annualDemand: 10_000, orderCost: 50, holdingCost: 5,
      avgDailyDemand: 27.4, stdDevDemand: 4, leadTimeDays: 7,
    };
    const p95 = reorderPolicy({ ...baseInput, serviceLevel: 0.95 });
    const p99 = reorderPolicy({ ...baseInput, serviceLevel: 0.99 });
    expect(p99.safety_stock).toBeGreaterThan(p95.safety_stock);
    expect(p99.reorder_point).toBeGreaterThan(p95.reorder_point);
    expect(Math.abs(p95.eoq - p99.eoq)).toBeLessThan(1e-6); // EOQ unaffected by service level
  });

  it("sensitivity: longer LT → SS scales as sqrt(LT)", () => {
    const baseInput = {
      annualDemand: 10_000, orderCost: 50, holdingCost: 5,
      avgDailyDemand: 27.4, stdDevDemand: 4, serviceLevel: 0.95,
    };
    const p7 = reorderPolicy({ ...baseInput, leadTimeDays: 7 });
    const p28 = reorderPolicy({ ...baseInput, leadTimeDays: 28 });
    // 4x LT → 2x SS (sqrt(4) = 2)
    expect(Math.abs(p28.safety_stock / p7.safety_stock - 2)).toBeLessThan(SECOND_TOLERANCE_PCT);
  });
});
