import { describe, it, expect } from "vitest";
import { johnsonCookEngine } from "../engines/JohnsonCookEngine.js";
import {
  JohnsonCookConstitutiveEngine,
} from "../engines/JohnsonCookConstitutiveEngine.js";

/**
 * Reference-value coverage for the WIRED canonical Johnson-Cook engine
 * (`johnsonCookEngine`, behind prism_calc jc_flow_stress / jc_params / jc_search /
 * jc_list). This engine had NO companion test before U-OSC-JC-INCONEL718-CONSOLIDATE
 * (2026-07-02); the only JC test was for the deprecated sibling.
 *
 * Reference identity used throughout: at strain=1, strainRate=1, T=T_room(293K):
 *   ε^n = 1, rateTerm = 1 + C·ln(max(1/1,1)) = 1, thermalTerm = 1 - 0^m = 1
 *   => σ = A + B  exactly. Hand-computed, no magic numbers.
 */
describe("JohnsonCookEngine.getParams / listAll", () => {
  it("Inconel_718 is now present (was ABSENT -> jc_params returned null)", () => {
    const p = johnsonCookEngine.getParams("Inconel_718");
    expect(p).not.toBeNull();
    expect(p).toEqual({ A: 1241, B: 622, n: 0.65, C: 0.0134, m: 1.3, T_melt: 1609 });
  });

  it("single-source consistency: canonical Inconel_718 == the deprecated engine's value (reconciled, not divergent)", () => {
    const canonical = johnsonCookEngine.getParams("Inconel_718")!;
    const legacy = JohnsonCookConstitutiveEngine.getParams("Inconel_718")!;
    // A/B/n/C/m/T_melt must agree so no consumer can pick up a divergent 718 flow stress.
    expect(canonical.A).toBe(legacy.A);
    expect(canonical.B).toBe(legacy.B);
    expect(canonical.n).toBe(legacy.n);
    expect(canonical.C).toBe(legacy.C);
    expect(canonical.m).toBe(legacy.m);
    expect(canonical.T_melt).toBe(legacy.T_melt);
  });

  it("Ti-6Al-4V is grade-disambiguated (Grade5 vs ELI are DISTINCT, not a divergence)", () => {
    const g5 = johnsonCookEngine.getParams("Ti_Grade5")!;
    const eli = johnsonCookEngine.getParams("Ti6Al4V_ELI")!;
    expect(g5.A).toBe(862); expect(g5.B).toBe(331); expect(g5.m).toBe(0.8);
    expect(eli.A).toBe(850); expect(eli.B).toBe(350); expect(eli.m).toBe(0.82);
    // They differ -> two real grades, correctly kept separate.
    expect(g5.A).not.toBe(eli.A);
  });

  it("returns null for an unknown material", () => {
    expect(johnsonCookEngine.getParams("UNOBTAINIUM")).toBeNull();
  });

  it("count reflects the added material (>= 61 across all categories)", () => {
    expect(johnsonCookEngine.count()).toBeGreaterThanOrEqual(61);
    expect(johnsonCookEngine.listAll()).toContain("Inconel_718");
  });
});

describe("JohnsonCookEngine.calculateFlowStress -- reference values (sigma = A+B at eps=1, epsdot=1, T=293)", () => {
  const cases: Array<[string, number]> = [
    ["Inconel_718", 1241 + 622], // 1863
    ["1045", 553 + 601],         // 1154
    ["Ti_Grade5", 862 + 331],    // 1193
    ["316", 305 + 1161],         // 1466
  ];
  for (const [mat, expected] of cases) {
    it(`${mat}: sigma(eps=1, epsdot=1, T=293) == A+B == ${expected} MPa`, () => {
      const r = johnsonCookEngine.calculateFlowStress(mat, 1.0, 1.0, 293)!;
      expect(r).not.toBeNull();
      expect(r.stress).toBeCloseTo(expected, 2);
      expect(r.rateTerm).toBeCloseTo(1, 4);
      expect(r.thermalTerm).toBeCloseTo(1, 4);
    });
  }

  it("thermal softening: sigma -> 0 at the melting point (thermalTerm = 0)", () => {
    const p = johnsonCookEngine.getParams("Inconel_718")!;
    const r = johnsonCookEngine.calculateFlowStress("Inconel_718", 1.0, 1.0, p.T_melt)!;
    expect(r.thermalTerm).toBeCloseTo(0, 6);
    expect(r.stress).toBeCloseTo(0, 4);
  });

  it("strain-rate hardening: higher strain rate -> higher flow stress (C > 0)", () => {
    const slow = johnsonCookEngine.calculateFlowStress("Inconel_718", 1.0, 1.0, 293)!;
    const fast = johnsonCookEngine.calculateFlowStress("Inconel_718", 1.0, 1000.0, 293)!;
    expect(fast.stress).toBeGreaterThan(slow.stress);
    // rate factor = 1 + 0.0134*ln(1000) ~= 1.0926
    expect(fast.stress / slow.stress).toBeCloseTo(1 + 0.0134 * Math.log(1000), 3);
  });

  it("strain hardening: higher strain -> higher flow stress (B, n > 0)", () => {
    const lo = johnsonCookEngine.calculateFlowStress("Inconel_718", 0.5, 1.0, 293)!;
    const hi = johnsonCookEngine.calculateFlowStress("Inconel_718", 2.0, 1.0, 293)!;
    expect(hi.stress).toBeGreaterThan(lo.stress);
  });

  it("returns null for an unknown material (fail-loud, no fabricated stress)", () => {
    expect(johnsonCookEngine.calculateFlowStress("NOTAMETAL", 1, 1, 293)).toBeNull();
  });

  it("temperature above melt saturates T* to 1 (no negative/overflow stress)", () => {
    const p = johnsonCookEngine.getParams("1045")!;
    const r = johnsonCookEngine.calculateFlowStress("1045", 1.0, 1.0, p.T_melt + 500)!;
    expect(r.T_star).toBeCloseTo(1, 6);
    expect(r.stress).toBeCloseTo(0, 4);
  });
});

describe("JohnsonCookEngine.search", () => {
  it("finds Inconel_718 by partial name and by number", () => {
    expect(johnsonCookEngine.search("inconel").map((r) => r.id)).toContain("Inconel_718");
    expect(johnsonCookEngine.search("718").map((r) => r.id)).toContain("Inconel_718");
  });
});
