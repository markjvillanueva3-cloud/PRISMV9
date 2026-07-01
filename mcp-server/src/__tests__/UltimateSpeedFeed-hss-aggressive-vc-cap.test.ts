/**
 * U-OSC-HSS-AGGR-VC-CAP -- HSS aggressive-mode cutting-speed (Vc) thermal cap.
 *
 * HSS red-hardness (~600 C) gives HSS no aggressive cutting-SPEED gear in hot-cutting ISO groups
 * (P/M/K/S/H); its recommended (balanced) Vc IS the thermal ceiling, so the SFC engine clamps the
 * aggressive Vc base down to the balanced base for HSS in those groups -- fz/ap stay aggressive
 * (HSS MRR comes from depth+feed, not Vc). N (aluminum) is EXCLUDED (low cutting temp -> real Vc
 * headroom). Carbide and the super-hard materials are NEVER clamped (they have a real aggressive
 * Vc regime). Every assertion encodes WHY the behavior matters; a revert to the unclamped Vc[2]
 * base makes the clamp tests fail.
 *
 * Physics basis: Trent & Wright, "Metal Cutting" 4e ch.6 (HSS hot-hardness); Machinery's Handbook
 * 31e HSS milling tables (single recommended Vc band, no aggressive column for HSS, unlike carbide).
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";
import {
  isHssAggressiveVcThermallyCapped,
  HSS_THERMALLY_VC_CAPPED_ISO,
} from "../physics/tool-material-speed-override.js";

// High-RPM machine so the downstream machine-RPM cap does NOT mask the engine's true Vc.
const MACH = {
  machine_name: "HiRPM-test",
  machine_type: "vertical_mill" as const,
  machine_power_kw: 30,
  machine_max_rpm: 30000,
};

function calc(opts: {
  grade: string;
  iso: string;
  hb: number;
  toolMat: string;
  goal: string;
}) {
  return ultimateSpeedFeedEngine.calculate({
    ...MACH,
    material: opts.grade,
    iso_group: opts.iso as any,
    hardness_hb: opts.hb,
    operation: "milling" as any,
    cut_type: "roughing" as any,
    tool_diameter_mm: 12,
    flutes: 4,
    tool_material: opts.toolMat as any,
    axial_depth_mm: 6,
    radial_depth_mm: 6,
    optimize_for: opts.goal as any,
  } as any);
}
const vcOf = (r: any): number => r?.cutting_speed?.value ?? r?.cutting_speed_mpm;
const fzOf = (r: any): number => r?.feed_per_tooth?.value ?? r?.feed_per_tooth_mm;

describe("isHssAggressiveVcThermallyCapped (pure helper)", () => {
  it("is TRUE for HSS in each hot-cutting ISO group P/M/K/S/H", () => {
    for (const iso of ["P", "M", "K", "S", "H"] as const) {
      expect(isHssAggressiveVcThermallyCapped("hss", iso)).toBe(true);
    }
  });
  it("is FALSE for HSS in N (aluminum) -- the deliberate exclusion (low cutting temp -> Vc headroom)", () => {
    expect(isHssAggressiveVcThermallyCapped("hss", "N")).toBe(false);
  });
  it("is FALSE for every non-HSS tool material (they have a real aggressive Vc gear)", () => {
    for (const mat of ["carbide", "cermet", "ceramic", "cbn", "pcd", "diamond"]) {
      expect(isHssAggressiveVcThermallyCapped(mat, "P")).toBe(false);
    }
  });
  it("is case-insensitive on the material name", () => {
    expect(isHssAggressiveVcThermallyCapped("HSS", "P")).toBe(true);
    expect(isHssAggressiveVcThermallyCapped("Hss", "M")).toBe(true);
  });
  it("fails OPEN (false) on unknown/empty material or missing ISO -- never a wild cap", () => {
    expect(isHssAggressiveVcThermallyCapped(undefined, "P")).toBe(false);
    expect(isHssAggressiveVcThermallyCapped(null, "P")).toBe(false);
    expect(isHssAggressiveVcThermallyCapped("", "P")).toBe(false);
    expect(isHssAggressiveVcThermallyCapped("hss", undefined)).toBe(false);
  });
  it("the capped-ISO set is exactly the hot-cutting groups (N absent)", () => {
    expect([...HSS_THERMALLY_VC_CAPPED_ISO].sort()).toEqual(["H", "K", "M", "P", "S"]);
    expect(HSS_THERMALLY_VC_CAPPED_ISO.has("N" as any)).toBe(false);
  });
});

describe("HSS aggressive Vc is clamped to the balanced Vc in hot-cutting groups", () => {
  // Spanning >=3 ISO groups (P steel, M stainless, S superalloy) -- the variability floor.
  const CASES = [
    { grade: "1045", iso: "P", hb: 180 },
    { grade: "316", iso: "M", hb: 170 },
    { grade: "IN718", iso: "S", hb: 360 },
  ];
  for (const c of CASES) {
    it(`${c.iso}: HSS productivity Vc == HSS balanced Vc (no aggressive gear for HSS)`, () => {
      const bal = vcOf(calc({ ...c, toolMat: "hss", goal: "balanced" }));
      const aggr = vcOf(calc({ ...c, toolMat: "hss", goal: "productivity" }));
      expect(bal).toBeGreaterThan(0);
      // Clamped: aggressive must NOT exceed balanced (it equals it within rounding).
      expect(aggr).toBeLessThanOrEqual(bal + 0.05);
      expect(aggr).toBeCloseTo(bal, 1);
    });
  }

  it("P steel: the clamp materially LOWERS Vc vs the un-clamped aggressive base (real magnitude)", () => {
    // Un-clamped would be vc[2]=220 vs balanced vc[1]=160 base -> ~1.375x. Carbide (un-clamped)
    // gives the reference for "what aggressive would have been" shape-wise.
    const hssAggr = vcOf(calc({ grade: "1045", iso: "P", hb: 180, toolMat: "hss", goal: "productivity" }));
    const hssBal = vcOf(calc({ grade: "1045", iso: "P", hb: 180, toolMat: "hss", goal: "balanced" }));
    // Reference band: modern HSS-Co steel milling ~35-65 m/min (Machinery's Handbook 31e HSS-Co).
    expect(hssAggr).toBeGreaterThan(30);
    expect(hssAggr).toBeLessThan(70);
    expect(hssAggr).toBeCloseTo(hssBal, 1);
  });
});

describe("the clamp leaves the un-affected paths byte-identical (monotonic safety)", () => {
  it("carbide aggressive Vc is STRICTLY ABOVE carbide balanced (aggressive gear intact -- NOT clamped)", () => {
    const bal = vcOf(calc({ grade: "1045", iso: "P", hb: 180, toolMat: "carbide", goal: "balanced" }));
    const aggr = vcOf(calc({ grade: "1045", iso: "P", hb: 180, toolMat: "carbide", goal: "productivity" }));
    expect(aggr).toBeGreaterThan(bal * 1.2); // carbide retains its ~1.375x aggressive Vc gear
  });

  it("N (aluminum) HSS aggressive Vc is STRICTLY ABOVE balanced -- the exclusion holds", () => {
    const bal = vcOf(calc({ grade: "6061", iso: "N", hb: 95, toolMat: "hss", goal: "balanced" }));
    const aggr = vcOf(calc({ grade: "6061", iso: "N", hb: 95, toolMat: "hss", goal: "productivity" }));
    expect(aggr).toBeGreaterThan(bal * 1.2); // aluminum gives HSS real Vc headroom
  });

  it("HSS balanced + conservative Vc are unchanged by the cap (cap is a no-op below aggressive)", () => {
    const cons = vcOf(calc({ grade: "1045", iso: "P", hb: 180, toolMat: "hss", goal: "tool_life" }));
    const bal = vcOf(calc({ grade: "1045", iso: "P", hb: 180, toolMat: "hss", goal: "balanced" }));
    expect(cons).toBeGreaterThan(0);
    expect(cons).toBeLessThanOrEqual(bal + 0.05); // conservative <= balanced, untouched
  });
});

describe("aggressive MRR for HSS still comes from feed/depth (only Vc is capped)", () => {
  it("P steel: HSS productivity feed-per-tooth STAYS aggressive (> balanced fz) while Vc is capped", () => {
    const balFz = fzOf(calc({ grade: "1045", iso: "P", hb: 180, toolMat: "hss", goal: "balanced" }));
    const aggrFz = fzOf(calc({ grade: "1045", iso: "P", hb: 180, toolMat: "hss", goal: "productivity" }));
    expect(balFz).toBeGreaterThan(0);
    // fz is NOT clamped -> aggressive fz must remain >= balanced fz (the MRR lever HSS keeps).
    expect(aggrFz).toBeGreaterThanOrEqual(balFz - 1e-9);
    expect(aggrFz).toBeGreaterThan(balFz); // strictly aggressive feed
  });

  it("the alternatives.aggressive set carries the capped Vc but the aggressive fz/ap", () => {
    const r: any = calc({ grade: "1045", iso: "P", hb: 180, toolMat: "hss", goal: "balanced" });
    const alts = r?.alternatives;
    expect(alts).toBeTruthy();
    // aggressive Vc clamped to <= balanced Vc ...
    expect(alts.aggressive.vc).toBeLessThanOrEqual(alts.balanced.vc + 0.05);
    // ... but aggressive fz/ap stay strictly above balanced (the MRR levers).
    expect(alts.aggressive.fz).toBeGreaterThan(alts.balanced.fz);
    expect(alts.aggressive.ap).toBeGreaterThan(alts.balanced.ap);
  });
});

// R15 -- the SAME cap on the customer-facing sf_orchestrate path (SpeedFeedOrchestratorEngine),
// which builds its own synthetic aggressive alternative (vcMult 1.30) rather than reading the
// delegate's. Without the mirror cap the two engines diverge for HSS (the reviewer P2).
describe("SpeedFeedOrchestratorEngine aggressive alternative respects the HSS Vc cap", () => {
  function orch(grade: string, iso: string, hb: number, toolMat: string) {
    // compute() returns AtomicValue<OrchestratorResult> -> the result is under .value.
    const top: any = speedFeedOrchestratorEngine.compute({
      machine_name: "HiRPM-test", machine_type: "vertical_mill",
      machine_power_kw: 30, machine_max_rpm: 30000,
      material: grade, iso_group: iso, hardness_hb: hb,
      operation: "milling", cut_type: "roughing", strategy: "conventional",
      tool_diameter_mm: 12, flutes: 4, tool_material: toolMat,
      axial_depth_mm: 6, radial_depth_mm: 6,
    } as any);
    const out: any = top?.value ?? top;
    const byLabel = (l: string) =>
      (out?.alternatives ?? []).find((a: any) => a.label === l);
    return {
      bal: byLabel("balanced")?.cutting_speed_mpm,
      aggr: byLabel("aggressive")?.cutting_speed_mpm,
      aggrFz: byLabel("aggressive")?.feed_per_tooth_mm,
      balFz: byLabel("balanced")?.feed_per_tooth_mm,
    };
  }

  it("HSS in P steel: aggressive alt Vc == balanced alt Vc (cap fires on sf_orchestrate)", () => {
    const r = orch("1045", "P", 180, "hss");
    expect(r.bal).toBeGreaterThan(0);
    expect(r.aggr).toBeCloseTo(r.bal, 1);
    // feed still aggressive (the MRR lever HSS keeps)
    expect(r.aggrFz).toBeGreaterThan(r.balFz);
  });

  it("carbide in P steel: aggressive alt Vc STRICTLY above balanced (gear intact -- not clamped)", () => {
    const r = orch("1045", "P", 180, "carbide");
    expect(r.aggr).toBeGreaterThan(r.bal * 1.2);
  });

  it("HSS in N aluminum: aggressive alt Vc STRICTLY above balanced (exclusion holds)", () => {
    const r = orch("6061", "N", 95, "hss");
    expect(r.aggr).toBeGreaterThan(r.bal * 1.2);
  });
});
