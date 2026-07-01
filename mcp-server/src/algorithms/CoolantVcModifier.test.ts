import { describe, it, expect } from "vitest";
import { getMultipliers, CoolantVcModifier, type CoolantVcInput } from "./CoolantVcModifier.js";

describe("CoolantVcModifier", () => {
  describe("flood is the reference (1.0 baseline) for every ISO group", () => {
    for (const iso of ["P","M","K","N","S","H"] as const) {
      it(`${iso}-group flood → Vc-mult=1.0, C-mult=1.0`, () => {
        const r = getMultipliers({ iso_group: iso, coolant: "flood" });
        expect(r.vc_multiplier.value).toBe(1);
        expect(r.taylor_C_multiplier.value).toBe(1);
      });
    }
  });

  describe("variability — 3+ ISO groups", () => {
    it("S-superalloy + cryogenic: largest Vc boost (60%)", () => {
      const r = getMultipliers({ iso_group: "S", coolant: "cryogenic" });
      expect(r.vc_multiplier.value).toBe(1.60);
      expect(r.taylor_C_multiplier.value).toBe(1.80);
      expect(r.notes.join("|")).toContain("largest Vc boost");
    });
    it("P-steel + dry: Vc drops to 0.78 of flood", () => {
      const r = getMultipliers({ iso_group: "P", coolant: "dry" });
      expect(r.vc_multiplier.value).toBe(0.78);
      expect(r.taylor_C_multiplier.value).toBe(0.65);
    });
    it("N-aluminum + MQL: best non-flood option (1.15× Vc)", () => {
      const r = getMultipliers({ iso_group: "N", coolant: "MQL" });
      expect(r.vc_multiplier.value).toBe(1.15);
    });
    it("M-stainless + dry: warns about life drop", () => {
      const r = getMultipliers({ iso_group: "M", coolant: "dry" });
      expect(r.notes.join("|")).toContain("aggressive");
    });
    it("H-hardened + MQL: warns insufficient heat removal", () => {
      const r = getMultipliers({ iso_group: "H", coolant: "MQL" });
      expect(r.notes.join("|")).toContain("sub-flood");
    });
  });

  describe("R12 fail-loud invalid input", () => {
    it("unknown iso_group → multiplier=1 + diagnostic", () => {
      const r = getMultipliers({ iso_group: "ZZ" as CoolantVcInput["iso_group"], coolant: "flood" });
      expect(r.vc_multiplier.value).toBe(1);
      expect(r.notes.join("|")).toContain("unknown iso_group: ZZ");
    });
    it("unknown coolant → multiplier=1 + diagnostic", () => {
      const r = getMultipliers({ iso_group: "P", coolant: "rainwater" as CoolantVcInput["coolant"] });
      expect(r.notes.join("|")).toContain("unknown coolant: rainwater");
    });
    it("missing input → diagnostic, no crash", () => {
      // Adversarial: simulate runtime null leak (caller bypassed TS). The
      // engine must surface a diagnostic, not crash. Cast via `unknown` to
      // preserve type-safety boundary at the caller while allowing null.
      const r = getMultipliers(null as unknown as CoolantVcInput);
      expect(r.notes.join("|")).toContain("missing input");
    });
  });

  describe("algebraic invariants", () => {
    it("every cell returns finite positive multipliers", () => {
      for (const iso of ["P","M","K","N","S","H"] as const) {
        for (const cool of ["dry","flood","mist","MQL","cryogenic"] as const) {
          const r = getMultipliers({ iso_group: iso, coolant: cool });
          expect(Number.isFinite(r.vc_multiplier.value)).toBe(true);
          expect(r.vc_multiplier.value).toBeGreaterThan(0);
          expect(Number.isFinite(r.taylor_C_multiplier.value)).toBe(true);
          expect(r.taylor_C_multiplier.value).toBeGreaterThan(0);
        }
      }
    });
    it("AtomicValue carries confidence + source provenance", () => {
      const r = getMultipliers({ iso_group: "P", coolant: "flood" });
      expect(r.vc_multiplier.confidence).toBeGreaterThan(0);
      expect(r.vc_multiplier.source).toContain("P/flood");
    });
  });

  it("CoolantVcModifier.version is 1.0.0", () => {
    expect(CoolantVcModifier.version).toBe("1.0.0");
  });
});
