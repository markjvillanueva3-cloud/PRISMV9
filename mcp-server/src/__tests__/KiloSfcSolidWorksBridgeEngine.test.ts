/**
 * KiloSfcSolidWorksBridgeEngine Tests — KILO-CAM-MASTERY-MS0 campaign iter 6
 *
 * @milestone KILO-CAM-MASTERY-MS0
 */

import { describe, it, expect } from "vitest";
import {
  kiloSfcSolidWorksBridgeEngine,
  SolidWorksCycleParamsSchema,
  type SFCResult,
} from "../engines/KiloSfcSolidWorksBridgeEngine.js";

const SFC_STEEL_ROUGH: SFCResult = {
  vc_m_min: 180, fz_mm_tooth: 0.12, ap_mm: 6.0, ae_mm: 4.5,
  rpm: 2865, feed_mm_min: 1375, tool_diameter_mm: 20, tool_teeth: 4,
  material_iso_group: "P", confidence: 0.9,
};

const SFC_ALUM_FINISH: SFCResult = {
  vc_m_min: 600, fz_mm_tooth: 0.05, ap_mm: 0.5, ae_mm: 0.25,
  rpm: 19099, feed_mm_min: 3819, tool_diameter_mm: 10, tool_teeth: 4,
  material_iso_group: "N", confidence: 0.95,
};

describe("KiloSfcSolidWorksBridgeEngine", () => {
  describe("sfc_solidworks_bridge — SolidCAM iMachining contract", () => {
    it("maps SFC rpm to spindle_rpm verbatim", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH);
      expect(out.spindle_rpm).toBe(2865);
    });

    it("maps SFC feed_mm_min to feed_xy_mm_min verbatim", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH);
      expect(out.feed_xy_mm_min).toBe(1375);
    });

    it("feed_z_mm_min defaults to 40% of XY (iMachining spiral-entry default)", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH);
      expect(out.feed_z_mm_min).toBeCloseTo(1375 * 0.4, 5);
    });

    it("custom feed_z_factor is honored when supplied", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH, { feed_z_factor: 0.25 });
      expect(out.feed_z_mm_min).toBeCloseTo(1375 * 0.25, 5);
    });

    it("max_stepover_mm uses ABSOLUTE mm from ae_mm (iMachining convention)", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH);
      expect(out.max_stepover_mm).toBe(4.5);
    });

    it("max_stepdown_mm equals ap_mm verbatim", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH);
      expect(out.max_stepdown_mm).toBe(6.0);
    });

    it("default strategy is 'iMachining 2D'", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH);
      expect(out.strategy).toBe("iMachining 2D");
    });

    it("caller can override strategy (e.g. 'iMachining 3D')", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH, { strategy: "iMachining 3D" });
      expect(out.strategy).toBe("iMachining 3D");
    });

    it("aluminum finish (high RPM, sub-mm depth) preserves precision", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_ALUM_FINISH);
      expect(out.spindle_rpm).toBe(19099);
      expect(out.max_stepdown_mm).toBe(0.5);
      expect(out.max_stepover_mm).toBe(0.25);
    });

    it("preserves SFC source values losslessly (refuse-list: tolerance-stack)", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH);
      expect(out.spindle_rpm).toBe(SFC_STEEL_ROUGH.rpm);
      expect(out.feed_xy_mm_min).toBe(SFC_STEEL_ROUGH.feed_mm_min);
      expect(out.max_stepdown_mm).toBe(SFC_STEEL_ROUGH.ap_mm);
      expect(out.max_stepover_mm).toBe(SFC_STEEL_ROUGH.ae_mm);
    });

    it("output passes own zod schema round-trip", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH);
      expect(() => SolidWorksCycleParamsSchema.parse(out)).not.toThrow();
    });

    it("rejects negative RPM (R12 schema gate)", () => {
      const bad: SFCResult = { ...SFC_STEEL_ROUGH, rpm: -1 };
      expect(() => kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(bad)).toThrow();
    });

    it("rejects fractional tool_teeth (R12 schema gate)", () => {
      const bad: SFCResult = { ...SFC_STEEL_ROUGH, tool_teeth: 3.5 };
      expect(() => kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(bad)).toThrow();
    });

    it("output fingerprints source 'sfc_solidworks_bridge'", () => {
      const out = kiloSfcSolidWorksBridgeEngine.sfcSolidWorksBridge(SFC_STEEL_ROUGH);
      expect(out.source).toBe("sfc_solidworks_bridge");
      expect(out.schemaVersion).toBe("1.0.0");
    });
  });
});
