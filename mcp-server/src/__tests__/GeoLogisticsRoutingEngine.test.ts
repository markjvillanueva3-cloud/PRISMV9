/**
 * GeoLogisticsRoutingEngine.test.ts — real-value coverage. Expected freight/landed numbers are computed
 * by hand from geo-logistics-rates.ts (base + perKg*weight; +3% customs on international).
 */

import { describe, it, expect } from "vitest";
import { GeoLogisticsRoutingEngine } from "../engines/GeoLogisticsRoutingEngine.js";

describe("GeoLogisticsRoutingEngine.resolveZone + routeCost", () => {
  it("same metro → local (25 + 1.5*2kg = 28, 1 day)", () => {
    const q = GeoLogisticsRoutingEngine.routeCost({ fromRegion: "US", toRegion: "US", quantity: 4, sameMetro: true });
    expect(q.zone).toBe("local");
    expect(q.totalWeightKg).toBe(2); // 0.5 default * 4
    expect(q.shippingUsd).toBe(28);
    expect(q.transitDays).toBe(1);
    expect(q.customsApplies).toBe(false);
  });

  it("same region → domestic (60 + 3*2 = 66, 3 days, no customs)", () => {
    const q = GeoLogisticsRoutingEngine.routeCost({ fromRegion: "US", toRegion: "US", quantity: 4 });
    expect(q.zone).toBe("domestic");
    expect(q.shippingUsd).toBe(66);
    expect(q.transitDays).toBe(3);
    expect(q.customsApplies).toBe(false);
  });

  it("cross-region → international (180 + 8*2 = 196, 9 days, customs)", () => {
    const q = GeoLogisticsRoutingEngine.routeCost({ fromRegion: "US", toRegion: "EU", quantity: 4 });
    expect(q.zone).toBe("international");
    expect(q.shippingUsd).toBe(196);
    expect(q.transitDays).toBe(9);
    expect(q.customsApplies).toBe(true);
  });

  it("expedite multiplies cost 1.8x and halves transit (196*1.8=352.8, ceil(9*0.5)=5)", () => {
    const q = GeoLogisticsRoutingEngine.routeCost({ fromRegion: "US", toRegion: "EU", quantity: 4, expedite: true });
    expect(q.shippingUsd).toBeCloseTo(352.8, 2);
    expect(q.transitDays).toBe(5);
  });
});

describe("GeoLogisticsRoutingEngine.landedCost — parts reconcile to the whole", () => {
  it("domestic: 1000 part + 66 freight + 0 customs = 1066", () => {
    const lc = GeoLogisticsRoutingEngine.landedCost({ fromRegion: "US", toRegion: "US", quantity: 4, partValueUsd: 1000 });
    expect(lc.shippingUsd).toBe(66);
    expect(lc.customsDutyUsd).toBe(0);
    expect(lc.totalLandedUsd).toBe(1066);
    expect(lc.partValueUsd + lc.shippingUsd + lc.customsDutyUsd).toBeCloseTo(lc.totalLandedUsd, 6);
  });

  it("international: 1000 part + 196 freight + 30 customs (3%) = 1226", () => {
    const lc = GeoLogisticsRoutingEngine.landedCost({ fromRegion: "US", toRegion: "EU", quantity: 4, partValueUsd: 1000 });
    expect(lc.shippingUsd).toBe(196);
    expect(lc.customsDutyUsd).toBe(30);
    expect(lc.totalLandedUsd).toBe(1226);
  });

  it("THE MOAT: a pricier LOCAL shop beats a cheaper OVERSEAS shop on landed cost", () => {
    const local = GeoLogisticsRoutingEngine.landedCost({ fromRegion: "US", toRegion: "US", quantity: 4, sameMetro: true, partValueUsd: 1100 });
    const overseas = GeoLogisticsRoutingEngine.landedCost({ fromRegion: "ASIA", toRegion: "US", quantity: 4, partValueUsd: 1000 });
    expect(local.totalLandedUsd).toBe(1128); // 1100 + 28
    expect(overseas.totalLandedUsd).toBe(1226); // 1000 + 196 + 30
    expect(local.totalLandedUsd).toBeLessThan(overseas.totalLandedUsd); // local wins on TRUE cost
  });

  it("throws on a negative part value (fail-loud)", () => {
    expect(() =>
      GeoLogisticsRoutingEngine.landedCost({ fromRegion: "US", toRegion: "US", partValueUsd: -5 }),
    ).toThrow(/partValueUsd must be a finite >= 0/);
  });
});

describe("GeoLogisticsRoutingEngine.logisticsScore + continentOf", () => {
  it("scores local > domestic > international", () => {
    expect(GeoLogisticsRoutingEngine.logisticsScore("US", "US", true)).toBe(1.0);
    expect(GeoLogisticsRoutingEngine.logisticsScore("US", "US")).toBe(0.7);
    expect(GeoLogisticsRoutingEngine.logisticsScore("US", "ASIA")).toBe(0.3);
  });
  it("maps region codes to continents", () => {
    expect(GeoLogisticsRoutingEngine.continentOf("US")).toBe("NA");
    expect(GeoLogisticsRoutingEngine.continentOf("DE")).toBe("EU");
    expect(GeoLogisticsRoutingEngine.continentOf("ZZ")).toBe("UNKNOWN");
  });
  it("rejects an invalid route (missing region) via schema", () => {
    expect(() => GeoLogisticsRoutingEngine.routeCost({ fromRegion: "", toRegion: "US" })).toThrow(/fromRegion/);
  });
});
