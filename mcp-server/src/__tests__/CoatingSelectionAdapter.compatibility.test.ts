import { describe, it, expect } from "vitest";
import { coatingSelectionAdapter } from "../engines/CoatingSelectionAdapter.js";

/**
 * compatibleIsoGroups — the material-domain gate. Verifies each coating
 * chemistry maps to the metallurgically-correct workpiece ISO groups, so
 * per-material cutting presets are only emitted for compatible domains.
 */
describe("CoatingSelectionAdapter.compatibleIsoGroups", () => {
  const compat = (c?: string, s?: string) => coatingSelectionAdapter.compatibleIsoGroups(c, s);

  it("Al-bearing PVD (TiAlN/ti-coated) covers ferrous family but EXCLUDES aluminum (N)", () => {
    for (const coat of ["TiAlN", "AlTiN", "AlCrN", "ti coated", "TiAlSiN"]) {
      const g = compat(coat);
      expect(g).toContain("P");
      expect(g).toContain("S");
      expect(g).toContain("H");
      expect(g).not.toContain("N"); // Al affinity → BUE/galling on aluminum
    }
  });

  it("PCD is non-ferrous ONLY (N) — never ferrous (carbon graphitizes on steel)", () => {
    expect(compat("PCD")).toEqual(["N"]);
    expect(compat("polycrystalline diamond")).toEqual(["N"]);
    expect(compat(undefined, "pcd")).toEqual(["N"]);
  });

  it("CBN is hardened steel + cast iron (H,K) — not aluminum or soft steel", () => {
    const g = compat("CBN");
    expect(g).toContain("H");
    expect(g).toContain("K");
    expect(g).not.toContain("N");
    expect(g).not.toContain("P");
  });

  it("uncoated/polished carbide is non-ferrous + cast iron (N,K)", () => {
    const g = compat("uncoated polished");
    expect(g).toContain("N");
    expect(g).toContain("K");
    expect(g).not.toContain("S"); // uncoated cannot survive superalloy heat
  });

  it("HSS substrate cuts cast iron + general (P,M,K,N) but never superalloy/hardened", () => {
    const g = compat("", "hss");
    expect(g.sort()).toEqual(["K", "M", "N", "P"]); // includes K (HSS taps/reamers run iron)
    // HSS overrides coating: even a 'coated' HSS tool can't cut S/H.
    expect(compat("TiN", "HSS")).not.toContain("S");
    expect(compat("TiN", "HSS")).not.toContain("H");
  });

  it("TiN includes aluminum; TiCN does NOT (Ti affinity → BUE); neither does high-temp S/H", () => {
    const tin = compat("TiN");
    expect(tin).toContain("N");
    expect(tin).toContain("P");
    expect(tin).not.toContain("S");
    const ticn = compat("TiCN");
    expect(ticn).toContain("P");
    expect(ticn).not.toContain("N"); // TiCN is a ferrous coating, not for aluminum
    expect(ticn).not.toContain("S");
  });

  it("ceramic/CVD-alumina is cast iron + superalloy (K,S)", () => {
    expect(compat("CVD Al2O3").sort()).toEqual(["K", "S"]);
    expect(compat("ceramic").sort()).toEqual(["K", "S"]);
  });

  it("explicit aluminum/non-ferrous intent → N only", () => {
    expect(compat("uncoated for aluminum")).toContain("N");
    expect(compat("brass cutter")).toEqual(["N"]);
  });

  it("unknown coating defaults CONSERVATIVELY to [P,M,K] — never S/H without a verified film", () => {
    // Safety: an unidentified coating must NOT be granted superalloy/hardened
    // (catastrophic failure domains demanding a verified high-temp/superhard film).
    for (const unknown of ["carbide", "xyz-mystery", ""]) {
      const g = compat(unknown);
      expect(g.length).toBeGreaterThan(0);
      expect(g).toContain("P");
      expect(g).not.toContain("S");
      expect(g).not.toContain("H");
    }
    expect(compat(undefined, undefined).length).toBeGreaterThan(0);
  });

  it("is consistent with the narrower preferred_iso (compatible ⊇ a coating's preferred set, where chemistry agrees)", () => {
    // PCD's preferred_iso is [N]; compatible must also be [N] (no broadening into ferrous).
    expect(compat("PCD")).toEqual(["N"]);
    // CBN preferred [H]; compatible adds K (cast iron) but never softens into P/N.
    expect(compat("CBN")).toContain("H");
    expect(compat("CBN")).not.toContain("N");
  });
});
