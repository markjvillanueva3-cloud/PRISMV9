/**
 * KiloCamSfcBridgesEngine Tests — KILO-CAM-MASTERY-MS0 iter 1
 *
 * 2 bridges: sfc_mastercam_bridge, sfc_esprit_bridge
 * Mirrors echo's CamBridgeKitEngine.test.ts shape — same SFC fixtures,
 * same R12 schema-rejection invariants, same dimensional cross-check.
 *
 * Test file lives in __tests__/ per project convention (the
 * stop_on_unwired_assets hook scans ONLY src/__tests__/ — see
 * feedback_engine_tests_in_tests_dir.md).
 *
 * @milestone KILO-CAM-MASTERY-MS0
 */

import { describe, it, expect } from "vitest";
import {
  kiloCamSfcBridgesEngine,
  MastercamCycleParamsSchema,
  EspritCycleParamsSchema,
  type SFCResult,
} from "../engines/KiloCamSfcBridgesEngine.js";

// ============================================================================
// FIXTURES — same shapes echo uses, so cross-bridge regression is detectable
// ============================================================================

const SFC_STEEL_ROUGH: SFCResult = {
  vc_m_min: 180,
  fz_mm_tooth: 0.12,
  ap_mm: 6.0,
  ae_mm: 4.5,
  rpm: 2865,
  feed_mm_min: 1375,
  tool_diameter_mm: 20,
  tool_teeth: 4,
  material_iso_group: "P",
  confidence: 0.9,
};

const SFC_ALUM_FINISH: SFCResult = {
  vc_m_min: 600,
  fz_mm_tooth: 0.05,
  ap_mm: 0.5,
  ae_mm: 0.25,
  rpm: 19099,
  feed_mm_min: 3819,
  tool_diameter_mm: 10,
  tool_teeth: 4,
  material_iso_group: "N",
  confidence: 0.95,
};

const SFC_TI_HEAVY: SFCResult = {
  vc_m_min: 60,
  fz_mm_tooth: 0.08,
  ap_mm: 2.0,
  ae_mm: 0.8,
  rpm: 955,
  feed_mm_min: 305,
  tool_diameter_mm: 20,
  tool_teeth: 4,
  material_iso_group: "S",
  confidence: 0.85,
};

const SFC_TOOL_DIA_ZERO: SFCResult = {
  ...SFC_STEEL_ROUGH,
  tool_diameter_mm: 0,
};

// ============================================================================
// sfc_mastercam_bridge — Mastercam Dynamic Mill
// ============================================================================

describe("KiloCamSfcBridgesEngine", () => {
  describe("sfc_mastercam_bridge (KILO-BRIDGE-SFC-MASTERCAM)", () => {
    it("maps SFC RPM directly to Mastercam spindle_rpm", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      expect(m.spindle_rpm).toBe(2865);
    });

    it("maps SFC feed_mm_min directly to feed_rate_mm_min", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      expect(m.feed_rate_mm_min).toBe(1375);
    });

    it("plunge_feed_mm_min defaults to 50% of milling feed (Dynamic Motion §5.2)", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      expect(m.plunge_feed_mm_min).toBeCloseTo(1375 * 0.5, 5);
    });

    it("custom plunge_factor is honored when supplied", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH, { plunge_factor: 0.35 });
      expect(m.plunge_feed_mm_min).toBeCloseTo(1375 * 0.35, 5);
    });

    it("stepover_pct = (ae / tool_dia) * 100 (Mastercam % convention)", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      // 4.5/20 = 22.5%
      expect(m.stepover_pct).toBeCloseTo(22.5, 5);
    });

    it("stepover_pct is clamped to ≤100 when ae > tool_dia (R12 boundary guard)", () => {
      const bad: SFCResult = { ...SFC_STEEL_ROUGH, ae_mm: 30 };
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(bad);
      expect(m.stepover_pct).toBe(100);
    });

    it("step_depth_mm equals ap_mm verbatim", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      expect(m.step_depth_mm).toBe(6.0);
    });

    it("default cycle_strategy is Mastercam 'Dynamic Mill'", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      expect(m.cycle_strategy).toBe("Dynamic Mill");
    });

    it("caller can override cycle_strategy (e.g. '2D HighSpeed')", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH, { cycle_strategy: "2D HighSpeed" });
      expect(m.cycle_strategy).toBe("2D HighSpeed");
    });

    it("aluminum finish path routes correctly (high RPM, low ap)", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_ALUM_FINISH);
      expect(m.spindle_rpm).toBe(19099);
      expect(m.step_depth_mm).toBe(0.5);
      expect(m.stepover_pct).toBeCloseTo(2.5, 5); // 0.25/10 = 2.5%
    });

    it("titanium heavy roughing path routes correctly (low RPM, modest ap)", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_TI_HEAVY);
      expect(m.spindle_rpm).toBe(955);
      expect(m.feed_rate_mm_min).toBe(305);
      expect(m.plunge_feed_mm_min).toBeCloseTo(152.5, 5);
    });

    it("stepover_pct = 0 when tool_diameter_mm = 0 (no NaN, no Infinity)", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_TOOL_DIA_ZERO);
      expect(m.stepover_pct).toBe(0);
      expect(Number.isFinite(m.stepover_pct)).toBe(true);
    });

    it("output passes its own zod schema (round-trip)", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      expect(() => MastercamCycleParamsSchema.parse(m)).not.toThrow();
    });

    it("rejects negative RPM (R12 schema gate)", () => {
      const bad: SFCResult = { ...SFC_STEEL_ROUGH, rpm: -100 };
      expect(() => kiloCamSfcBridgesEngine.sfcMastercamBridge(bad)).toThrow();
    });

    it("rejects invalid material iso_group (R12 schema gate)", () => {
      const bad = { ...SFC_STEEL_ROUGH, material_iso_group: "Z" as never };
      expect(() => kiloCamSfcBridgesEngine.sfcMastercamBridge(bad as SFCResult)).toThrow();
    });
  });

  // ==========================================================================
  // sfc_esprit_bridge — Esprit ProfitMilling
  // ==========================================================================

  describe("sfc_esprit_bridge (KILO-BRIDGE-SFC-ESPRIT)", () => {
    it("maps SFC RPM to spindle_speed_rpm", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(e.spindle_speed_rpm).toBe(2865);
    });

    it("maps SFC feed to cutting_feed_mm_min", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(e.cutting_feed_mm_min).toBe(1375);
    });

    it("lead_in_feed defaults to 60% of cutting feed (MachineSmart convention)", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(e.lead_in_feed_mm_min).toBeCloseTo(1375 * 0.6, 5);
    });

    it("custom lead_in_factor is honored", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH, { lead_in_factor: 0.4 });
      expect(e.lead_in_feed_mm_min).toBeCloseTo(1375 * 0.4, 5);
    });

    it("radial_stepover_mm uses ABSOLUTE mm (not pct, unlike Mastercam)", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(e.radial_stepover_mm).toBe(4.5);
    });

    it("axial_stepdown_mm equals ap_mm verbatim", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(e.axial_stepdown_mm).toBe(6.0);
    });

    it("default cycle_strategy is Esprit 'ProfitMilling'", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(e.cycle_strategy).toBe("ProfitMilling");
    });

    it("caller can override cycle_strategy (e.g. 'Adaptive 3D')", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH, { cycle_strategy: "Adaptive 3D" });
      expect(e.cycle_strategy).toBe("Adaptive 3D");
    });

    it("aluminum finish path preserves precision (high RPM, sub-mm depth)", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_ALUM_FINISH);
      expect(e.spindle_speed_rpm).toBe(19099);
      expect(e.axial_stepdown_mm).toBe(0.5);
      expect(e.radial_stepover_mm).toBe(0.25);
    });

    it("titanium heavy path preserves dimensional consistency", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_TI_HEAVY);
      expect(e.spindle_speed_rpm).toBe(955);
      expect(e.cutting_feed_mm_min).toBe(305);
      expect(e.lead_in_feed_mm_min).toBeCloseTo(305 * 0.6, 5);
    });

    it("output passes its own zod schema (round-trip)", () => {
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(() => EspritCycleParamsSchema.parse(e)).not.toThrow();
    });

    it("rejects negative feed (R12 schema gate)", () => {
      const bad: SFCResult = { ...SFC_STEEL_ROUGH, feed_mm_min: -50 };
      expect(() => kiloCamSfcBridgesEngine.sfcEspritBridge(bad)).toThrow();
    });

    it("rejects fractional tool_teeth (R12 schema gate — teeth must be integer)", () => {
      const bad: SFCResult = { ...SFC_STEEL_ROUGH, tool_teeth: 4.5 };
      expect(() => kiloCamSfcBridgesEngine.sfcEspritBridge(bad)).toThrow();
    });

    it("preserves SFC source values losslessly through the bridge (no rounding drift)", () => {
      // Round-trip: SFC inputs -> bridge -> outputs that exactly preserve the source fields.
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(e.spindle_speed_rpm).toBe(SFC_STEEL_ROUGH.rpm);
      expect(e.cutting_feed_mm_min).toBe(SFC_STEEL_ROUGH.feed_mm_min);
      expect(e.axial_stepdown_mm).toBe(SFC_STEEL_ROUGH.ap_mm);
      expect(e.radial_stepover_mm).toBe(SFC_STEEL_ROUGH.ae_mm);
    });
  });

  // ==========================================================================
  // CROSS-BRIDGE INVARIANTS
  // ==========================================================================

  describe("Cross-bridge invariants (KILO-CAM-MASTERY contract)", () => {
    it("Mastercam + Esprit agree on spindle/feed source values (same SFC input)", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(m.spindle_rpm).toBe(e.spindle_speed_rpm);
      expect(m.feed_rate_mm_min).toBe(e.cutting_feed_mm_min);
    });

    it("both bridges propagate ap_mm to their axial-depth field verbatim", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(m.step_depth_mm).toBe(SFC_STEEL_ROUGH.ap_mm);
      expect(e.axial_stepdown_mm).toBe(SFC_STEEL_ROUGH.ap_mm);
    });

    it("both bridges fingerprint their source in the output (auditability)", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(m.source).toBe("sfc_mastercam_bridge");
      expect(e.source).toBe("sfc_esprit_bridge");
    });

    it("both bridges carry the same schemaVersion (1.0.0 — KILO-CAM-MASTERY-MS0)", () => {
      const m = kiloCamSfcBridgesEngine.sfcMastercamBridge(SFC_STEEL_ROUGH);
      const e = kiloCamSfcBridgesEngine.sfcEspritBridge(SFC_STEEL_ROUGH);
      expect(m.schemaVersion).toBe("1.0.0");
      expect(e.schemaVersion).toBe("1.0.0");
    });
  });
});
