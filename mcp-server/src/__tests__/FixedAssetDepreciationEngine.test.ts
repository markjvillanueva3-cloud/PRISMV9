import { describe, it, expect } from "vitest";
import { FixedAssetDepreciationEngine as D } from "../engines/FixedAssetDepreciationEngine.js";

describe("FixedAssetDepreciationEngine.straightLine", () => {
  it("$10,000 cost, $1,000 salvage, 5yr → $1,800/yr", () => {
    const s = D.straightLine({ cost: 10000, salvage: 1000, lifeYears: 5 });
    expect(s.schedule.map((y) => y.depreciation)).toEqual([1800, 1800, 1800, 1800, 1800]);
    expect(s.totalDepreciation).toBe(9000);
    expect(s.schedule[4].bookValue).toBe(1000); // ends at salvage
    expect(s.schedule[0].accumulated).toBe(1800);
  });
});

describe("FixedAssetDepreciationEngine.macrs (IRS Pub 946 GDS half-year)", () => {
  it("5-yr property $10,000 → [2000,3200,1920,1152,1152,576], sums to cost", () => {
    const s = D.macrs({ cost: 10000, recoveryYears: 5 });
    expect(s.schedule.map((y) => y.depreciation)).toEqual([2000, 3200, 1920, 1152, 1152, 576]);
    expect(s.totalDepreciation).toBe(10000); // full basis recovered (MACRS ignores salvage)
  });
  it("7-yr property $10,000 → year-1 $1,429", () => {
    expect(D.macrs({ cost: 10000, recoveryYears: 7 }).schedule[0].depreciation).toBe(1429);
  });
  it("throws on an unsupported class life (4-yr)", () => {
    expect(() => D.macrs({ cost: 10000, recoveryYears: 4 })).toThrow(/MACRS/);
  });
});

describe("FixedAssetDepreciationEngine.decliningBalance (200% DDB → SL switch)", () => {
  it("$10,000, 5yr, factor 2 → y1 $4,000, switches to SL at y4 ($1,080), fully depreciated", () => {
    const s = D.decliningBalance({ cost: 10000, salvage: 0, lifeYears: 5, factor: 2 });
    const deps = s.schedule.map((y) => y.depreciation);
    expect(deps[0]).toBe(4000);
    expect(deps[1]).toBe(2400);
    expect(deps[3]).toBe(1080); // SL switch (1080 > DB 864)
    expect(s.totalDepreciation).toBe(10000);
    expect(s.schedule[4].bookValue).toBe(0);
  });
  it("throws on a non-positive factor", () => {
    expect(() => D.decliningBalance({ cost: 10000, lifeYears: 5, factor: 0 })).toThrow(/factor/);
  });
});

describe("FixedAssetDepreciationEngine.sumOfYearsDigits", () => {
  it("$10,000, $1,000 salvage, 5yr → [3000,2400,1800,1200,600]", () => {
    const s = D.sumOfYearsDigits({ cost: 10000, salvage: 1000, lifeYears: 5 });
    expect(s.schedule.map((y) => y.depreciation)).toEqual([3000, 2400, 1800, 1200, 600]);
    expect(s.schedule[4].bookValue).toBe(1000);
  });
});

describe("FixedAssetDepreciationEngine.unitsOfProduction", () => {
  it("$10,000 cost, $1,000 salvage, 90,000 total units, 9,000 this period → $900", () => {
    const r = D.unitsOfProduction({ cost: 10000, salvage: 1000, totalUnits: 90000, unitsThisPeriod: 9000 });
    expect(r.perUnit).toBe(0.1);
    expect(r.depreciation).toBe(900);
  });
  it("throws on zero totalUnits", () => {
    expect(() => D.unitsOfProduction({ cost: 10000, totalUnits: 0, unitsThisPeriod: 5 })).toThrow(/totalUnits/);
  });
});

describe("FixedAssetDepreciationEngine.disposal", () => {
  it("book value + gain", () => {
    expect(D.disposal({ cost: 10000, accumulatedDepreciation: 9000, salePrice: 1500 })).toEqual({ bookValue: 1000, gainLoss: 500, type: "gain" });
  });
  it("loss", () => {
    expect(D.disposal({ cost: 10000, accumulatedDepreciation: 9000, salePrice: 800 })).toEqual({ bookValue: 1000, gainLoss: -200, type: "loss" });
  });
  it("breakeven → none", () => {
    expect(D.disposal({ cost: 10000, accumulatedDepreciation: 9000, salePrice: 1000 }).type).toBe("none");
  });
  it("throws when accumulated depreciation exceeds cost", () => {
    expect(() => D.disposal({ cost: 10000, accumulatedDepreciation: 11000, salePrice: 0 })).toThrow(/exceed/);
  });
  it("throws on non-finite sale price", () => {
    expect(() => D.disposal({ cost: 10000, accumulatedDepreciation: 9000, salePrice: NaN })).toThrow();
  });
});

describe("FixedAssetDepreciationEngine — shared validation (adversarial)", () => {
  it("throws on negative cost", () => {
    expect(() => D.straightLine({ cost: -100, lifeYears: 5 })).toThrow();
  });
  it("throws on zero life", () => {
    expect(() => D.straightLine({ cost: 10000, lifeYears: 0 })).toThrow();
  });
  it("throws when salvage >= cost", () => {
    expect(() => D.straightLine({ cost: 1000, salvage: 1000, lifeYears: 5 })).toThrow(/salvage/);
  });
  it("throws on NaN cost", () => {
    expect(() => D.straightLine({ cost: NaN, lifeYears: 5 })).toThrow();
  });
});
