import { describe, it, expect } from "vitest";
import { computeVcMultiplier, hrcToHB, HardnessToVcInverter, type HardnessVcInput } from "./HardnessToVcInverter.js";

describe("HardnessToVcInverter", () => {
  describe("hrcToHB ISO-18265 conversion", () => {
    it("HRC=20 → HB=226 (table endpoint)", () => expect(hrcToHB(20)).toBe(226));
    it("HRC=65 → HB=739 (table endpoint)", () => expect(hrcToHB(65)).toBe(739));
    it("HRC=40 → HB=371 (mid-table)", () => expect(hrcToHB(40)).toBe(371));
    it("HRC=22.5 interpolation: between 20→226 and 25→253 = 239.5", () => {
      expect(hrcToHB(22.5)).toBeCloseTo(239.5, 1);
    });
    it("HRC below table clamps to 226", () => expect(hrcToHB(10)).toBe(226));
    it("HRC above table clamps to 739", () => expect(hrcToHB(80)).toBe(739));
    it("HRC NaN → NaN", () => expect(Number.isNaN(hrcToHB(NaN))).toBe(true));
  });

  describe("computeVcMultiplier — at-reference baseline", () => {
    it("P-group at reference HB → multiplier = 1.0", () => {
      const r = computeVcMultiplier({ iso_group: "P", hardness_HB: 180, reference_hardness_HB: 180 });
      expect(r.vc_multiplier.value).toBeCloseTo(1, 6);
    });
    it("N-group at reference HB → multiplier = 1.0", () => {
      const r = computeVcMultiplier({ iso_group: "N", hardness_HB: 80, reference_hardness_HB: 80 });
      expect(r.vc_multiplier.value).toBeCloseTo(1, 6);
    });
  });

  describe("computeVcMultiplier — variability (3 ISO groups)", () => {
    it("P-steel HRC 50 (HB 481) vs HB 180 ref → Vc drops ~30%", () => {
      const r = computeVcMultiplier({ iso_group: "P", hardness_HRC: 50 });
      expect(r.effective_hardness_HB.value).toBe(481);
      // (180/481)^0.30 ≈ 0.748
      expect(r.vc_multiplier.value).toBeCloseTo(Math.pow(180 / 481, 0.30), 4);
      expect(r.vc_multiplier.value).toBeLessThan(1);
    });
    it("M-stainless harder than ref → Vc drops more than P (exponent 0.35 > 0.30)", () => {
      const rP = computeVcMultiplier({ iso_group: "P", hardness_HB: 400, reference_hardness_HB: 200 });
      const rM = computeVcMultiplier({ iso_group: "M", hardness_HB: 400, reference_hardness_HB: 200 });
      expect(rM.vc_multiplier.value).toBeLessThan(rP.vc_multiplier.value);
    });
    it("S-superalloy is most sensitive (exponent 0.45)", () => {
      const rS = computeVcMultiplier({ iso_group: "S", hardness_HB: 400, reference_hardness_HB: 200 });
      expect(rS.exponent_used).toBe(0.45);
      expect(rS.vc_multiplier.value).toBeLessThan(0.8);
    });
  });

  describe("R12 fail-loud invalid input", () => {
    it("unknown iso_group → multiplier=1 + diagnostic note", () => {
      const r = computeVcMultiplier({ iso_group: "ZZ" as HardnessVcInput["iso_group"], hardness_HB: 200 });
      expect(r.notes.join("|")).toContain("unknown iso_group: ZZ");
      expect(r.vc_multiplier.value).toBe(1);
    });
    it("no hardness supplied → diagnostic", () => {
      const r = computeVcMultiplier({ iso_group: "P" });
      expect(r.notes.join("|")).toContain("must supply");
    });
    it("HRC on aluminum (N) → rejected with named diagnostic", () => {
      const r = computeVcMultiplier({ iso_group: "N", hardness_HRC: 40 });
      expect(r.notes.join("|")).toContain("HRC only valid for steel");
    });
    it("HRC out of range → diagnostic, no crash", () => {
      const r = computeVcMultiplier({ iso_group: "P", hardness_HRC: 100 });
      expect(r.notes.join("|")).toContain("outside");
    });
    it("HB below floor → diagnostic", () => {
      const r = computeVcMultiplier({ iso_group: "P", hardness_HB: 10 });
      expect(r.notes.join("|")).toContain("outside");
    });
    it("HB above ceiling → diagnostic", () => {
      const r = computeVcMultiplier({ iso_group: "P", hardness_HB: 1000 });
      expect(r.notes.join("|")).toContain("outside");
    });
    it("reference_hardness_HB ≤ 0 → diagnostic", () => {
      const r = computeVcMultiplier({ iso_group: "P", hardness_HB: 200, reference_hardness_HB: 0 });
      expect(r.notes.join("|")).toContain("reference_hardness_HB");
    });
  });

  describe("notes carry operator-actionable summary", () => {
    it("harder workpiece → DROP signal in notes", () => {
      const r = computeVcMultiplier({ iso_group: "P", hardness_HB: 400, reference_hardness_HB: 180 });
      expect(r.notes.join("|")).toContain("DROP");
    });
    it("softer workpiece → RISE signal in notes", () => {
      const r = computeVcMultiplier({ iso_group: "P", hardness_HB: 120, reference_hardness_HB: 180 });
      expect(r.notes.join("|")).toContain("RISE");
    });
  });

  it("HardnessToVcInverter.version is 1.0.0", () => {
    expect(HardnessToVcInverter.version).toBe("1.0.0");
  });
});
