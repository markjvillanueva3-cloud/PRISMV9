import { describe, it, expect } from "vitest";
import { MACHINES, type MachineEntry } from "../data/machines";
import {
  machineUsageWeight,
  orderMachinesByShopUsage,
  type ShopProfile,
} from "../data/shopUsageOrder";

// Mirrors the real /jm-shop-profile.json category volumes (2026-06-12 distillation).
const LATHE = 19803;
const OKUMA = 6092;
const MILL_MIXED = 1820;
const ROKU = 1102;
const MILL_HAAS = 533;
const MULTUS = 13;

const PROFILE: ShopProfile = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-06-12T00:00:00Z",
  totalFiles: 38251,
  machines: [
    { id: "lathe", files: LATHE, pct: 51.8 },
    { id: "okuma", files: OKUMA, pct: 15.9 },
    { id: "wire_edm", files: 4000, pct: 10.5 },
    { id: "mill_mixed", files: MILL_MIXED, pct: 4.8 },
    { id: "roku_roku", files: ROKU, pct: 2.9 },
    { id: "mill_haas", files: MILL_HAAS, pct: 1.4 },
    { id: "okuma_multus", files: MULTUS, pct: 0.0 },
  ],
};

const okumaLathe = MACHINES.find((m) => m.id === "LTH-01")!;       // Okuma GENOS lathe
const haasMill = MACHINES.find((m) => m.id === "VMC-03")!;          // Haas VF-2
const multus = MACHINES.find((m) => /multus/i.test(m.name))!;      // Okuma Multus mill-turn

describe("machineUsageWeight", () => {
  it("an Okuma lathe accrues both lathe + okuma volume (the busiest)", () => {
    expect(machineUsageWeight(okumaLathe, PROFILE)).toBe(LATHE + OKUMA);
  });

  it("a Haas mill gets only the small mill_mixed + mill_haas volume", () => {
    expect(machineUsageWeight(haasMill, PROFILE)).toBe(MILL_MIXED + MILL_HAAS);
  });

  it("Okuma lathe strictly outranks a Haas mill (real shop usage)", () => {
    expect(machineUsageWeight(okumaLathe, PROFILE)).toBeGreaterThan(machineUsageWeight(haasMill, PROFILE));
  });

  it("the Okuma Multus (mill-turn) accrues lathe + okuma + multus", () => {
    expect(machineUsageWeight(multus, PROFILE)).toBe(LATHE + OKUMA + MULTUS);
  });

  it("null/empty profile => weight 0 (fail-soft)", () => {
    expect(machineUsageWeight(okumaLathe, null)).toBe(0);
    expect(machineUsageWeight(okumaLathe, { ...PROFILE, machines: [] })).toBe(0);
  });
});

describe("orderMachinesByShopUsage", () => {
  it("orders the real fleet with Okuma lathes/mill-turn at the top", () => {
    const ranked = orderMachinesByShopUsage(MACHINES, PROFILE);
    expect(ranked).toHaveLength(MACHINES.length);
    expect(ranked[0].rank).toBe(0);
    expect(ranked[0].machine.manufacturer.toLowerCase()).toContain("okuma");
    expect(["Lathe", "Mill-Turn"]).toContain(ranked[0].machine.type);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].usageWeight).toBeLessThanOrEqual(ranked[i - 1].usageWeight);
    }
    const haasRank = ranked.find((r) => r.machine.id === "VMC-03")!.rank;
    const worstOkumaLatheRank = Math.max(
      ...ranked.filter((r) => r.machine.type === "Lathe" && /okuma/i.test(r.machine.manufacturer)).map((r) => r.rank),
    );
    expect(haasRank).toBeGreaterThan(worstOkumaLatheRank);
  });

  it("null profile => stable original order, all weight 0", () => {
    const ranked = orderMachinesByShopUsage(MACHINES, null);
    expect(ranked.map((r) => r.machine.id)).toEqual(MACHINES.map((m: MachineEntry) => m.id));
    expect(ranked.every((r) => r.usageWeight === 0)).toBe(true);
  });
});
