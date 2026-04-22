/**
 * ImpellerCADEngine tests — U-CADC15 / CAD-COMPLETE-MS0
 *
 * Tests impeller geometry generation for pumps, fans, compressors.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  ImpellerCADEngine,
  impellerCADEngine,
  type ImpellerSpec,
  type ImpellerFlowType,
  ImpellerSpecError,
} from "../engines/ImpellerCADEngine.js";

describe("ImpellerCADEngine", () => {
  let engine: ImpellerCADEngine;

  beforeAll(() => {
    engine = impellerCADEngine;
  });

  // ─── Basic generation ─────────────────────────────────────────────────

  describe("generate()", () => {
    it("generates radial impeller with all required operations", () => {
      const spec: ImpellerSpec = {
        id: "test_radial_001",
        flowType: "radial",
        hubInletRadius_mm: 30,
        hubOutletRadius_mm: 80,
        hubLength_mm: 50,
        shroudInletRadius_mm: 50,
        shroudOutletRadius_mm: 85,
        boreDiameter_mm: 20,
        blades: {
          profile: "NACA 2412",
          inletAngle_deg: 30,
          outletAngle_deg: 45,
          wrapAngle_deg: 90,
          chordHub_mm: 25,
          chordTip_mm: 30,
          bladeCount: 7,
        },
      };

      const result = engine.generate(spec);

      expect(result.id).toBe("test_radial_001");
      expect(result.flowType).toBe("radial");
      expect(result.operations.length).toBeGreaterThan(10);
      expect(result.hubProfile.length).toBeGreaterThan(0);
      expect(result.shroudProfile.length).toBeGreaterThan(0);
      expect(result.bladeControlPoints.length).toBe(7);
      expect(result.volumeEstimate_mm3).toBeGreaterThan(0);
      expect(result.massEstimate_kg).toBeGreaterThan(0);
    });

    it("generates axial impeller with correct flow type", () => {
      const spec: ImpellerSpec = {
        id: "test_axial_001",
        flowType: "axial",
        hubInletRadius_mm: 40,
        hubOutletRadius_mm: 45,
        hubLength_mm: 60,
        shroudInletRadius_mm: 100,
        shroudOutletRadius_mm: 105,
        boreDiameter_mm: 25,
        blades: {
          profile: "NACA 4415",
          inletAngle_deg: 25,
          outletAngle_deg: 35,
          wrapAngle_deg: 30,
          chordHub_mm: 40,
          chordTip_mm: 50,
          bladeCount: 4,
        },
      };

      const result = engine.generate(spec);

      expect(result.flowType).toBe("axial");
      expect(result.operations.length).toBeGreaterThan(5);
      // Axial impellers have nearly constant radius
      const hubRadiusChange = result.hubProfile[result.hubProfile.length - 1]!.r - result.hubProfile[0]!.r;
      expect(hubRadiusChange).toBeLessThan(20); // Less radius change for axial
    });

    it("generates mixed-flow impeller", () => {
      const spec: ImpellerSpec = {
        id: "test_mixed_001",
        flowType: "mixed",
        hubInletRadius_mm: 35,
        hubOutletRadius_mm: 70,
        hubLength_mm: 55,
        shroudInletRadius_mm: 60,
        shroudOutletRadius_mm: 80,
        boreDiameter_mm: 22,
        blades: {
          profile: "NACA 23012",
          inletAngle_deg: 28,
          outletAngle_deg: 50,
          wrapAngle_deg: 70,
          chordHub_mm: 30,
          chordTip_mm: 35,
          bladeCount: 6,
        },
      };

      const result = engine.generate(spec);

      expect(result.flowType).toBe("mixed");
      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("includes datum coordinate system operation", () => {
      const spec = createMinimalSpec("datum_test");
      const result = engine.generate(spec);

      const datumOp = result.operations.find(op => op.kind === "datum_coord_system");
      expect(datumOp).toBeDefined();
      expect(datumOp!.args.name).toBe("datum_test_WCS");
    });

    it("includes hub revolve operation", () => {
      const spec = createMinimalSpec("hub_test");
      const result = engine.generate(spec);

      const revolveOp = result.operations.find(
        op => op.kind === "feature_revolve" && String(op.args.name).includes("hub")
      );
      expect(revolveOp).toBeDefined();
      expect(revolveOp!.args.angle).toBe(360);
    });

    it("includes bore hole operation", () => {
      const spec = createMinimalSpec("bore_test");
      spec.boreDiameter_mm = 18;
      const result = engine.generate(spec);

      const holeOp = result.operations.find(
        op => op.kind === "feature_hole" && String(op.args.name).includes("bore")
      );
      expect(holeOp).toBeDefined();
      expect(holeOp!.args.diameter).toBe(18);
      expect(holeOp!.args.through).toBe(true);
    });

    it("includes loft operations for each blade", () => {
      const spec = createMinimalSpec("blade_test");
      spec.blades.bladeCount = 5;
      const result = engine.generate(spec);

      const loftOps = result.operations.filter(
        op => op.kind === "feature_loft" && String(op.args.name).includes("blade")
      );
      expect(loftOps.length).toBe(5);
    });
  });

  // ─── Optional features ────────────────────────────────────────────────

  describe("optional features", () => {
    it("generates keyway when specified", () => {
      const spec = createMinimalSpec("keyway_test");
      spec.keywayWidth_mm = 6;
      spec.keywayDepth_mm = 3;

      const result = engine.generate(spec);

      const keywayOp = result.operations.find(
        op => op.kind === "feature_pocket" && String(op.args.name).includes("keyway")
      );
      expect(keywayOp).toBeDefined();
      expect(keywayOp!.args.width).toBe(6);
    });

    it("generates balance holes when specified", () => {
      const spec = createMinimalSpec("hole_pattern_test");
      spec.balanceHoleDiameter_mm = 8;
      spec.balanceHoleCount = 6;

      const result = engine.generate(spec);

      // Match balance hole pattern specifically (not just substring)
      const balanceHoleOp = result.operations.find(
        op => op.kind === "feature_hole" && String(op.args.name).includes("_balance_hole")
      );
      const patternOp = result.operations.find(
        op => op.kind === "pattern_circular" && String(op.args.name).includes("_balance_holes")
      );

      expect(balanceHoleOp).toBeDefined();
      expect(balanceHoleOp!.args.diameter).toBe(8);
      expect(patternOp).toBeDefined();
      expect(patternOp!.args.count).toBe(6);
    });

    it("generates splitter blades when specified", () => {
      const spec = createMinimalSpec("split_blade_test");
      spec.blades.bladeCount = 6;
      spec.blades.splitterCount = 6;
      spec.blades.splitterChordRatio = 0.5;

      const result = engine.generate(spec);

      // Filter for splitter lofts only (main blades use "_blade_N" pattern)
      const splitterLofts = result.operations.filter(
        op => op.kind === "feature_loft" && String(op.args.name).includes("_splitter_")
      );
      expect(splitterLofts.length).toBe(6);
    });

    it("skips splitters when splitterCount is 0", () => {
      const spec = createMinimalSpec("no_split_test");
      spec.blades.splitterCount = 0;

      const result = engine.generate(spec);

      // Check for splitter pattern specifically (not just substring match)
      const splitterOps = result.operations.filter(
        op => String(op.args.name || "").includes("_splitter_")
      );
      expect(splitterOps.length).toBe(0);
    });
  });

  // ─── Profile computation ──────────────────────────────────────────────

  describe("profile computation", () => {
    it("computes hub profile with correct endpoint radii", () => {
      const spec = createMinimalSpec("profile_test");
      spec.hubInletRadius_mm = 25;
      spec.hubOutletRadius_mm = 75;

      const result = engine.generate(spec);

      expect(result.hubProfile[0]!.r).toBeCloseTo(25, 0);
      expect(result.hubProfile[result.hubProfile.length - 1]!.r).toBeCloseTo(75, 0);
    });

    it("computes shroud profile with correct axial length", () => {
      const spec = createMinimalSpec("shroud_len_test");
      spec.hubLength_mm = 40;
      spec.shroudLength_mm = 35; // Different shroud length

      const result = engine.generate(spec);

      expect(result.shroudProfile[result.shroudProfile.length - 1]!.z).toBeCloseTo(35, 0);
    });

    it("uses custom hub profile when provided", () => {
      const spec = createMinimalSpec("custom_hub_test");
      spec.hubProfile = [
        { z: 0, r: 30 },
        { z: 20, r: 50 },
        { z: 40, r: 70 },
      ];

      const result = engine.generate(spec);

      expect(result.hubProfile).toEqual(spec.hubProfile);
    });
  });

  // ─── Validation ───────────────────────────────────────────────────────

  describe("validation", () => {
    it("throws on empty id", () => {
      const spec = createMinimalSpec("");

      expect(() => engine.generate(spec)).toThrow(ImpellerSpecError);
      expect(() => engine.generate(spec)).toThrow("id");
    });

    it("throws on non-positive hub inlet radius", () => {
      const spec = createMinimalSpec("neg_radius");
      spec.hubInletRadius_mm = 0;

      expect(() => engine.generate(spec)).toThrow(ImpellerSpecError);
      expect(() => engine.generate(spec)).toThrow("hubInletRadius_mm");
    });

    it("throws on bore larger than hub", () => {
      const spec = createMinimalSpec("bore_too_big");
      spec.hubInletRadius_mm = 20;
      spec.boreDiameter_mm = 50; // Larger than 2 * hubInletRadius

      expect(() => engine.generate(spec)).toThrow(ImpellerSpecError);
      expect(() => engine.generate(spec)).toThrow("boreDiameter_mm");
    });

    it("throws on blade count out of range", () => {
      const spec = createMinimalSpec("bad_blade_count");
      spec.blades.bladeCount = 30; // > 24

      expect(() => engine.generate(spec)).toThrow(ImpellerSpecError);
      expect(() => engine.generate(spec)).toThrow("bladeCount");
    });

    it("throws on inlet angle out of range", () => {
      const spec = createMinimalSpec("bad_inlet_angle");
      spec.blades.inletAngle_deg = 100; // > 90

      expect(() => engine.generate(spec)).toThrow(ImpellerSpecError);
    });

    it("validate() returns errors without throwing", () => {
      const spec = createMinimalSpec("validation_test");
      spec.hubInletRadius_mm = -5;

      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("validate() returns valid=true for good spec", () => {
      const spec = createMinimalSpec("good_spec");

      const result = engine.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  // ─── Warnings ─────────────────────────────────────────────────────────

  describe("warnings", () => {
    it("warns on low blade count", () => {
      const spec = createMinimalSpec("low_blade_warn");
      spec.blades.bladeCount = 3;

      const result = engine.generate(spec);

      expect(result.warnings.some(w => w.includes("Blade count < 4"))).toBe(true);
    });

    it("warns on forward-curved blades (outlet > 90°)", () => {
      const spec = createMinimalSpec("forward_curve_warn");
      spec.blades.outletAngle_deg = 100;

      const result = engine.generate(spec);

      expect(result.warnings.some(w => w.includes("Outlet angle > 90"))).toBe(true);
    });

    it("warns on radial impeller with outlet <= inlet radius", () => {
      const spec = createMinimalSpec("bad_radial_warn");
      spec.flowType = "radial";
      spec.hubInletRadius_mm = 50;
      spec.hubOutletRadius_mm = 45;

      const result = engine.generate(spec);

      expect(result.warnings.some(w => w.includes("outlet radius should exceed"))).toBe(true);
    });
  });

  // ─── Volume/mass estimation ───────────────────────────────────────────

  describe("volume and mass estimation", () => {
    it("estimates volume in reasonable range for small impeller", () => {
      const spec = createMinimalSpec("vol_small");
      spec.hubInletRadius_mm = 20;
      spec.hubOutletRadius_mm = 50;
      spec.hubLength_mm = 30;

      const result = engine.generate(spec);

      // Volume should be roughly in the range of a frustum
      expect(result.volumeEstimate_mm3).toBeGreaterThan(50000); // > 50 cm³
      expect(result.volumeEstimate_mm3).toBeLessThan(500000); // < 500 cm³
    });

    it("estimates mass based on steel density", () => {
      const spec = createMinimalSpec("mass_test");
      const result = engine.generate(spec);

      // Mass = volume * 7850 kg/m³
      const expectedMass = (result.volumeEstimate_mm3 / 1e9) * 7850;
      expect(result.massEstimate_kg).toBeCloseTo(expectedMass, 4);
    });

    it("larger impeller has larger volume", () => {
      const small = createMinimalSpec("vol_cmp_small");
      small.hubOutletRadius_mm = 50;

      const large = createMinimalSpec("vol_cmp_large");
      large.hubOutletRadius_mm = 100;

      const smallResult = engine.generate(small);
      const largeResult = engine.generate(large);

      expect(largeResult.volumeEstimate_mm3).toBeGreaterThan(smallResult.volumeEstimate_mm3);
    });
  });

  // ─── Blade profiles ───────────────────────────────────────────────────

  describe("blade profiles", () => {
    it("accepts NACA 4-digit profiles", () => {
      const spec = createMinimalSpec("naca4");
      spec.blades.profile = "NACA 4412";

      const result = engine.generate(spec);
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it("accepts NACA 5-digit profiles", () => {
      const spec = createMinimalSpec("naca5");
      spec.blades.profile = "NACA 23012";

      const result = engine.generate(spec);
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it("throws on invalid profile designation", () => {
      const spec = createMinimalSpec("bad_profile");
      spec.blades.profile = "INVALID_PROFILE";

      expect(() => engine.generate(spec)).toThrow();
    });
  });

  // ─── Control points ───────────────────────────────────────────────────

  describe("blade control points", () => {
    it("returns control points for each blade", () => {
      const spec = createMinimalSpec("ctrl_pts");
      spec.blades.bladeCount = 5;

      const result = engine.generate(spec);

      expect(result.bladeControlPoints.length).toBe(5);
      result.bladeControlPoints.forEach(blade => {
        expect(blade.length).toBeGreaterThan(0);
        blade.forEach(pt => {
          expect(pt).toHaveLength(3);
          expect(pt.every(n => Number.isFinite(n))).toBe(true);
        });
      });
    });

    it("control points are distributed around impeller", () => {
      const spec = createMinimalSpec("ctrl_dist");
      spec.blades.bladeCount = 4;

      const result = engine.generate(spec);

      // Get first point of each blade at hub
      const firstPts = result.bladeControlPoints.map(b => b[0]!);

      // Check that blades are roughly 90° apart (for 4 blades)
      for (let i = 0; i < firstPts.length - 1; i++) {
        const [x1, y1] = firstPts[i]!;
        const [x2, y2] = firstPts[i + 1]!;
        const angle1 = Math.atan2(y1, x1);
        const angle2 = Math.atan2(y2, x2);
        let diff = Math.abs(angle2 - angle1);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        expect(diff).toBeCloseTo(Math.PI / 2, 0); // ~90° apart
      }
    });
  });

  // ─── Utility methods ──────────────────────────────────────────────────

  describe("utility methods", () => {
    it("listProfiles returns available NACA profiles", () => {
      const profiles = engine.listProfiles();

      expect(profiles.length).toBeGreaterThan(100);
      expect(profiles.some(p => p.includes("NACA 2412"))).toBe(true);
      expect(profiles.some(p => p.includes("NACA 0012"))).toBe(true);
    });

    it("recommendBladeCount returns sensible values for radial", () => {
      const rec = engine.recommendBladeCount("radial", 1.0);

      expect(rec.main).toBeGreaterThanOrEqual(6);
      expect(rec.main).toBeLessThanOrEqual(12);
    });

    it("recommendBladeCount returns fewer blades for axial", () => {
      const rec = engine.recommendBladeCount("axial", 5.0);

      expect(rec.main).toBeLessThanOrEqual(4);
      expect(rec.splitter).toBe(0);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles minimum valid blade count (2)", () => {
      const spec = createMinimalSpec("min_blades");
      spec.blades.bladeCount = 2;

      const result = engine.generate(spec);
      expect(result.bladeControlPoints.length).toBe(2);
    });

    it("handles maximum valid blade count (24)", () => {
      const spec = createMinimalSpec("max_blades");
      spec.blades.bladeCount = 24;

      const result = engine.generate(spec);
      expect(result.bladeControlPoints.length).toBe(24);
    });

    it("handles wrap angle of 180°", () => {
      const spec = createMinimalSpec("wrap_180");
      spec.blades.wrapAngle_deg = 180;

      const result = engine.generate(spec);
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it("handles blade lean angle", () => {
      const spec = createMinimalSpec("lean_test");
      spec.blades.leanAngle_deg = 10;

      const result = engine.generate(spec);
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it("handles thickness scaling", () => {
      const spec = createMinimalSpec("thick_scale");
      spec.blades.thicknessScale = 1.5;

      const result = engine.generate(spec);
      expect(result.operations.length).toBeGreaterThan(0);
    });
  });

  // ─── Adversarial inputs ───────────────────────────────────────────────

  describe("adversarial inputs", () => {
    it("rejects NaN in dimensions", () => {
      const spec = createMinimalSpec("nan_test");
      spec.hubInletRadius_mm = NaN;

      expect(() => engine.generate(spec)).toThrow();
    });

    it("rejects Infinity in dimensions", () => {
      const spec = createMinimalSpec("inf_test");
      spec.hubOutletRadius_mm = Infinity;

      expect(() => engine.generate(spec)).toThrow();
    });

    it("rejects negative dimensions", () => {
      const spec = createMinimalSpec("neg_test");
      spec.hubLength_mm = -10;

      expect(() => engine.generate(spec)).toThrow(ImpellerSpecError);
    });

    it("handles special characters in ID", () => {
      const spec = createMinimalSpec("test-id_with.special$chars");

      const result = engine.generate(spec);
      expect(result.id).toBe("test-id_with.special$chars");
    });

    it("rejects whitespace-only ID", () => {
      const spec = createMinimalSpec("   ");

      expect(() => engine.generate(spec)).toThrow(ImpellerSpecError);
    });
  });
});

// ── Test helpers ─────────────────────────────────────────────────────────

function createMinimalSpec(id: string): ImpellerSpec {
  return {
    id,
    flowType: "radial",
    hubInletRadius_mm: 30,
    hubOutletRadius_mm: 70,
    hubLength_mm: 45,
    shroudInletRadius_mm: 50,
    shroudOutletRadius_mm: 75,
    boreDiameter_mm: 20,
    blades: {
      profile: "NACA 2412",
      inletAngle_deg: 30,
      outletAngle_deg: 50,
      wrapAngle_deg: 80,
      chordHub_mm: 25,
      chordTip_mm: 30,
      bladeCount: 6,
    },
  };
}
