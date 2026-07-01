/**
 * BliskCADEngine tests — U-CADC16 / CAD-COMPLETE-MS0
 *
 * Verifies blisk geometry generation, circular pattern usage,
 * validation logic, and blade count recommendations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BliskCADEngine,
  BliskSpec,
  BliskSpecError,
  BliskStageType,
} from "../engines/BliskCADEngine.js";

describe("BliskCADEngine", () => {
  let engine: BliskCADEngine;

  beforeEach(() => {
    engine = new BliskCADEngine();
  });

  // ── Helper to create minimal valid spec ─────────────────────────────────

  function createMinimalSpec(id: string, stageType: BliskStageType = "compressor"): BliskSpec {
    return {
      id,
      stageType,
      diskOuterRadius_mm: 150,
      diskInnerRadius_mm: 80,
      diskThickness_mm: 25,
      bladeCount: 36,
      blade: {
        profile: "NACA 0010",
        inletAngle_deg: 45,
        outletAngle_deg: 60,
        chordHub_mm: 30,
        chordTip_mm: 25,
        height_mm: 50,
      },
      rootFilletRadius_mm: 3,
      boreDiameter_mm: 60,
    };
  }

  // ── Basic generation tests ──────────────────────────────────────────────

  describe("generate()", () => {
    it("generates valid blisk geometry for compressor stage", () => {
      const spec = createMinimalSpec("compressor_blisk_test");
      const result = engine.generate(spec);

      expect(result.id).toBe("compressor_blisk_test");
      expect(result.stageType).toBe("compressor");
      expect(result.operations.length).toBeGreaterThan(10);
      expect(result.volumeEstimate_mm3).toBeGreaterThan(0);
      expect(result.massEstimate_kg).toBeGreaterThan(0);
    });

    it("generates valid blisk geometry for turbine stage", () => {
      const spec = createMinimalSpec("turbine_blisk_test", "turbine");
      spec.bladeCount = 60;
      const result = engine.generate(spec);

      expect(result.stageType).toBe("turbine");
      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("generates valid blisk geometry for fan stage", () => {
      const spec = createMinimalSpec("fan_blisk_test", "fan");
      spec.bladeCount = 20;
      spec.blade.height_mm = 100;
      const result = engine.generate(spec);

      expect(result.stageType).toBe("fan");
      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("includes datum coordinate system as first operation", () => {
      const spec = createMinimalSpec("datum_test");
      const result = engine.generate(spec);

      expect(result.operations[0]!.kind).toBe("datum_coord_system");
      expect(result.operations[0]!.args.name).toBe("datum_test_WCS");
    });

    it("includes disk revolve operation", () => {
      const spec = createMinimalSpec("disk_revolve_test");
      const result = engine.generate(spec);

      const revolveOps = result.operations.filter(op => op.kind === "feature_revolve");
      expect(revolveOps.length).toBeGreaterThanOrEqual(1);

      const diskRevolve = revolveOps.find(op =>
        String(op.args.name).includes("disk")
      );
      expect(diskRevolve).toBeDefined();
    });

    it("includes bore hole operation", () => {
      const spec = createMinimalSpec("bore_test");
      const result = engine.generate(spec);

      const boreOps = result.operations.filter(op =>
        op.kind === "feature_hole" && String(op.args.name).includes("bore")
      );
      expect(boreOps.length).toBe(1);
      expect(boreOps[0]!.args.diameter).toBe(60);
    });

    it("includes circular pattern for blade replication", () => {
      const spec = createMinimalSpec("pattern_test");
      const result = engine.generate(spec);

      const patternOps = result.operations.filter(op =>
        op.kind === "pattern_circular" &&
        String(op.args.name).includes("blade_pattern")
      );
      expect(patternOps.length).toBe(1);
      expect(patternOps[0]!.args.count).toBe(36);
      expect(patternOps[0]!.args.angle).toBe(360);
    });

    it("includes root fillet operation", () => {
      const spec = createMinimalSpec("fillet_test");
      const result = engine.generate(spec);

      const filletOps = result.operations.filter(op =>
        op.kind === "feature_fillet" &&
        String(op.args.name).includes("root_fillet")
      );
      expect(filletOps.length).toBe(1);
      expect(filletOps[0]!.args.radius).toBe(3);
    });

    it("includes tip fillet when specified", () => {
      const spec = createMinimalSpec("tip_fil_test");
      spec.tipFilletRadius_mm = 0.5;
      const result = engine.generate(spec);

      const tipFilletOps = result.operations.filter(op =>
        op.kind === "feature_fillet" &&
        String(op.args.name).endsWith("_tip_fillet")
      );
      expect(tipFilletOps.length).toBe(1);
      expect(tipFilletOps[0]!.args.radius).toBe(0.5);
    });

    it("excludes tip fillet when not specified", () => {
      const spec = createMinimalSpec("no_tip_fillet_test");
      // Ensure tipFilletRadius_mm is undefined
      delete (spec as Record<string, unknown>).tipFilletRadius_mm;
      const result = engine.generate(spec);

      const tipFilletOps = result.operations.filter(op =>
        op.kind === "feature_fillet" &&
        String(op.args.name).endsWith("_tip_fillet")
      );
      expect(tipFilletOps.length).toBe(0);
    });

    it("includes balance holes when specified", () => {
      const spec = createMinimalSpec("bal_hole_test");
      spec.balanceHoles = { count: 6, diameter_mm: 8, depth_mm: 10 };
      const result = engine.generate(spec);

      const balancePatternOps = result.operations.filter(op =>
        op.kind === "pattern_circular" &&
        String(op.args.name).endsWith("_balance_holes")
      );
      expect(balancePatternOps.length).toBe(1);
      expect(balancePatternOps[0]!.args.count).toBe(6);
    });

    it("generates blade sections for loft", () => {
      const spec = createMinimalSpec("blade_loft_test");
      const result = engine.generate(spec);

      const loftOps = result.operations.filter(op =>
        op.kind === "feature_loft" &&
        String(op.args.name).includes("master_blade")
      );
      expect(loftOps.length).toBe(1);
      expect(loftOps[0]!.args.profiles.length).toBe(5); // 5 sections
    });

    it("exports blade control points", () => {
      const spec = createMinimalSpec("control_points_test");
      const result = engine.generate(spec);

      expect(result.bladeControlPoints.length).toBe(5); // 5 sections
      expect(result.bladeControlPoints[0]!.length).toBeGreaterThan(0);

      // Each point should be [x, y, z]
      const firstPt = result.bladeControlPoints[0]![0]!;
      expect(firstPt.length).toBe(3);
      expect(Number.isFinite(firstPt[0])).toBe(true);
    });

    it("applies blade twist when specified", () => {
      const spec = createMinimalSpec("blade_twist_test");
      spec.blade.twist_deg = 25;
      const result = engine.generate(spec);

      // Twist affects section angles — verify operations generated
      const sectionSketches = result.operations.filter(op =>
        op.kind === "sketch_create" &&
        String(op.args.name).includes("section")
      );
      expect(sectionSketches.length).toBe(5);
    });

    it("applies blade lean when specified", () => {
      const spec = createMinimalSpec("blade_lean_test");
      spec.blade.lean_deg = 10;
      const result = engine.generate(spec);

      expect(result.operations.length).toBeGreaterThan(10);
      expect(result.bladeControlPoints.length).toBe(5);
    });

    it("applies blade sweep when specified", () => {
      const spec = createMinimalSpec("blade_sweep_test");
      spec.blade.sweep_deg = 15;
      const result = engine.generate(spec);

      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("includes web thickness in disk profile", () => {
      const spec = createMinimalSpec("web_test");
      spec.webThickness_mm = 15;
      const result = engine.generate(spec);

      const diskSketch = result.operations.find(op =>
        op.kind === "sketch_create" &&
        String(op.args.name).includes("disk_sketch")
      );
      expect(diskSketch).toBeDefined();
    });

    it("includes spline pattern when specified", () => {
      const spec = createMinimalSpec("spline_test");
      spec.splineCount = 24;
      spec.splineDepth_mm = 2;
      const result = engine.generate(spec);

      const splinePatternOps = result.operations.filter(op =>
        op.kind === "pattern_circular" &&
        String(op.args.name).includes("splines")
      );
      expect(splinePatternOps.length).toBe(1);
      expect(splinePatternOps[0]!.args.count).toBe(24);
    });
  });

  // ── Volume and mass estimation ──────────────────────────────────────────

  describe("volume and mass estimation", () => {
    it("estimates reasonable volume", () => {
      const spec = createMinimalSpec("volume_est_test");
      const result = engine.generate(spec);

      // Disk: ~π × (150² - 80²) × 25 ≈ 1,178,000 mm³
      // Plus blades: 36 × ~0.1 × 27.5² × 50 ≈ ~136,000 mm³
      // Total: ~1,300,000 mm³
      expect(result.volumeEstimate_mm3).toBeGreaterThan(500000);
      expect(result.volumeEstimate_mm3).toBeLessThan(3000000);
    });

    it("estimates mass using Inconel 718 density", () => {
      const spec = createMinimalSpec("mass_est_test");
      const result = engine.generate(spec);

      // ρ = 8190 kg/m³ = 8.19e-6 kg/mm³
      // Vol ~1.3e6 mm³ → mass ~10-15 kg
      expect(result.massEstimate_kg).toBeGreaterThan(3);
      expect(result.massEstimate_kg).toBeLessThan(30);
    });

    it("mass scales with blade count", () => {
      const spec1 = createMinimalSpec("mass_scale_test_1");
      spec1.bladeCount = 24;
      const spec2 = createMinimalSpec("mass_scale_test_2");
      spec2.bladeCount = 48;

      const result1 = engine.generate(spec1);
      const result2 = engine.generate(spec2);

      // More blades → more mass
      expect(result2.massEstimate_kg).toBeGreaterThan(result1.massEstimate_kg);
    });
  });

  // ── Validation tests ────────────────────────────────────────────────────

  describe("validate()", () => {
    it("returns valid for correct spec", () => {
      const spec = createMinimalSpec("valid_spec_test");
      const result = engine.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects empty id", () => {
      const spec = createMinimalSpec("");
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("id"))).toBe(true);
    });

    it("rejects negative disk radius", () => {
      const spec = createMinimalSpec("neg_radius_test");
      spec.diskOuterRadius_mm = -100;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("diskOuterRadius_mm"))).toBe(true);
    });

    it("rejects NaN disk radius", () => {
      const spec = createMinimalSpec("nan_radius_test");
      spec.diskOuterRadius_mm = NaN;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
    });

    it("rejects Infinity disk radius", () => {
      const spec = createMinimalSpec("inf_radius_test");
      spec.diskOuterRadius_mm = Infinity;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
    });

    it("rejects inner radius >= outer radius", () => {
      const spec = createMinimalSpec("radii_order_test");
      spec.diskInnerRadius_mm = 200;
      spec.diskOuterRadius_mm = 150;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("less than"))).toBe(true);
    });

    it("rejects bore exceeding inner diameter", () => {
      const spec = createMinimalSpec("bore_exceed_test");
      spec.boreDiameter_mm = 200;
      spec.diskInnerRadius_mm = 80;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("bore"))).toBe(true);
    });

    it("rejects blade count < 3", () => {
      const spec = createMinimalSpec("low_blade_count_test");
      spec.bladeCount = 2;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("bladeCount"))).toBe(true);
    });

    it("rejects blade count > 120", () => {
      const spec = createMinimalSpec("high_blade_count_test");
      spec.bladeCount = 150;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("bladeCount"))).toBe(true);
    });

    it("rejects inlet angle > 90", () => {
      const spec = createMinimalSpec("inlet_angle_test");
      spec.blade.inletAngle_deg = 100;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("inletAngle"))).toBe(true);
    });

    it("rejects negative blade height", () => {
      const spec = createMinimalSpec("neg_height_test");
      spec.blade.height_mm = -50;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("height_mm"))).toBe(true);
    });

    it("rejects zero root fillet", () => {
      const spec = createMinimalSpec("zero_fillet_test");
      spec.rootFilletRadius_mm = 0;
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("rootFilletRadius_mm"))).toBe(true);
    });

    it("warns on high aspect ratio blades", () => {
      const spec = createMinimalSpec("high_ar_test");
      spec.blade.height_mm = 150;
      spec.blade.chordHub_mm = 30;
      const result = engine.validate(spec);

      // Should still be valid, but with warnings
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes("aspect ratio"))).toBe(true);
    });

    it("warns on small root fillet", () => {
      const spec = createMinimalSpec("small_fillet_test");
      spec.rootFilletRadius_mm = 1;
      const result = engine.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes("Root fillet"))).toBe(true);
    });

    it("warns on low solidity for compressor", () => {
      const spec = createMinimalSpec("low_solidity_test");
      spec.bladeCount = 10;
      spec.blade.chordHub_mm = 20;
      spec.diskOuterRadius_mm = 200;
      const result = engine.validate(spec);

      expect(result.warnings.some(w => w.includes("solidity"))).toBe(true);
    });
  });

  // -- Profile capability validation (U-BLISK-6SERIES-PARSE) ----------------

  describe("validate() blade-profile capability", () => {
    it("rejects a recommended-but-ungeneratable NACA 6-series profile", () => {
      const spec = createMinimalSpec("six_series_validate_test");
      spec.blade.profile = "NACA 65-010";
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("blade.profile"))).toBe(true);
      expect(result.errors.some(e => e.includes("6-series"))).toBe(true);
    });

    it("rejects an unsupported 5-digit mean-line profile", () => {
      const spec = createMinimalSpec("bad_meanline_validate_test");
      spec.blade.profile = "NACA 44112";
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("blade.profile"))).toBe(true);
    });

    it("rejects an empty profile string", () => {
      const spec = createMinimalSpec("empty_profile_test");
      spec.blade.profile = "";
      const result = engine.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("blade.profile"))).toBe(true);
    });

    it("accepts the supported 4-digit profile of the minimal spec", () => {
      const spec = createMinimalSpec("good_profile_test");
      const result = engine.validate(spec); // default profile NACA 0010
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects a missing blade spec without throwing a TypeError", () => {
      const spec = createMinimalSpec("no_blade_test");
      delete (spec as Record<string, unknown>).blade;
      let result!: ReturnType<BliskCADEngine["validate"]>;
      expect(() => { result = engine.validate(spec); }).not.toThrow();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("blade"))).toBe(true);
    });

    it("generate() fails loud (BliskSpecError at validate) for a 6-series profile, not deep at getProfile", () => {
      const spec = createMinimalSpec("six_series_generate_test");
      spec.blade.profile = "NACA 65-010";
      try {
        engine.generate(spec);
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BliskSpecError);
        expect((e as Error).message).toContain("blade.profile");
      }
    });
  });

  // -- listProfiles honesty (U-BLISK-6SERIES-PARSE) -------------------------

  describe("listProfiles() capability honesty", () => {
    it("flags the 6-series entries as not generatable", () => {
      const profiles = engine.listProfiles();
      const s65010 = profiles.find(p => p.designation === "NACA 65-010");
      const s65012 = profiles.find(p => p.designation === "NACA 65-012");
      // `?.` so a missing entry surfaces as undefined !== false (clear fail).
      expect(s65010?.generatable).toBe(false);
      expect(s65012?.generatable).toBe(false);
      expect(s65010?.thicknessPercent).toBe(10);
      expect(s65012?.thicknessPercent).toBe(12);
    });

    it("does not flag generatable 4-/5-digit entries as ungeneratable", () => {
      const profiles = engine.listProfiles();
      for (const p of profiles) {
        if (p.designation === "NACA 65-010" || p.designation === "NACA 65-012") continue;
        expect(p.generatable, p.designation).not.toBe(false);
      }
    });

    it("every profile NOT flagged ungeneratable actually validates through the engine", () => {
      const profiles = engine.listProfiles();
      let checked = 0;
      for (const p of profiles) {
        if (p.generatable === false) continue;
        const spec = createMinimalSpec(`listprofile_${p.designation.replace(/\W+/g, "_")}`);
        spec.blade.profile = p.designation;
        const result = engine.validate(spec);
        expect(result.valid, `${p.designation} should validate`).toBe(true);
        checked++;
      }
      expect(checked).toBeGreaterThanOrEqual(6);
    });
  });

  // ── Strict validation (throws) ──────────────────────────────────────────

  describe("generate() strict validation", () => {
    it("throws BliskSpecError for invalid spec", () => {
      const spec = createMinimalSpec("throw_test");
      spec.diskOuterRadius_mm = -100;

      expect(() => engine.generate(spec)).toThrow(BliskSpecError);
    });

    it("error message includes field name", () => {
      const spec = createMinimalSpec("error_field_test");
      spec.bladeCount = 1;

      try {
        engine.generate(spec);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BliskSpecError);
        expect((e as BliskSpecError).message).toContain("bladeCount");
      }
    });
  });

  // ── Blade count recommendation ──────────────────────────────────────────

  describe("recommendBladeCount()", () => {
    it("returns reasonable count for compressor", () => {
      const rec = engine.recommendBladeCount({
        stageType: "compressor",
        diskRadius_mm: 150,
        bladeChord_mm: 30,
        inletAngle_deg: 45,
        outletAngle_deg: 60,
      });

      expect(rec.recommended).toBeGreaterThanOrEqual(20);
      expect(rec.recommended).toBeLessThanOrEqual(80);
      expect(rec.min).toBeLessThan(rec.recommended);
      expect(rec.max).toBeGreaterThan(rec.recommended);
    });

    it("returns reasonable count for turbine", () => {
      const rec = engine.recommendBladeCount({
        stageType: "turbine",
        diskRadius_mm: 200,
        bladeChord_mm: 25,
        inletAngle_deg: 50,
        outletAngle_deg: 65,
      });

      expect(rec.recommended).toBeGreaterThanOrEqual(30);
      expect(rec.recommended).toBeLessThanOrEqual(100);
    });

    it("returns reasonable count for fan", () => {
      const rec = engine.recommendBladeCount({
        stageType: "fan",
        diskRadius_mm: 300,
        bladeChord_mm: 60,
        inletAngle_deg: 30,
        outletAngle_deg: 45,
      });

      expect(rec.recommended).toBeGreaterThanOrEqual(12);
      expect(rec.recommended).toBeLessThanOrEqual(40);
    });

    it("handles flat blade angles gracefully", () => {
      const rec = engine.recommendBladeCount({
        stageType: "compressor",
        diskRadius_mm: 150,
        bladeChord_mm: 30,
        inletAngle_deg: 45,
        outletAngle_deg: 45, // Same angle
      });

      expect(rec.recommended).toBeGreaterThan(0);
      expect(rec.formula).toContain("Empirical");
    });

    it("includes Zweifel formula in explanation", () => {
      const rec = engine.recommendBladeCount({
        stageType: "turbine",
        diskRadius_mm: 150,
        bladeChord_mm: 30,
        inletAngle_deg: 45,
        outletAngle_deg: 60,
      });

      expect(rec.formula).toContain("Zweifel");
    });

    it("includes solidity in notes", () => {
      const rec = engine.recommendBladeCount({
        stageType: "compressor",
        diskRadius_mm: 150,
        bladeChord_mm: 30,
        inletAngle_deg: 45,
        outletAngle_deg: 60,
      });

      expect(rec.notes.some(n => n.includes("Solidity"))).toBe(true);
    });
  });

  // ── Profile listing ─────────────────────────────────────────────────────

  describe("listProfiles()", () => {
    it("returns multiple profiles", () => {
      const profiles = engine.listProfiles();

      expect(profiles.length).toBeGreaterThanOrEqual(6);
    });

    it("includes NACA 0010", () => {
      const profiles = engine.listProfiles();
      const naca0010 = profiles.find(p => p.designation === "NACA 0010");

      expect(naca0010).toBeDefined();
      expect(naca0010!.thicknessPercent).toBe(10);
      expect(naca0010!.suitableFor).toContain("compressor");
    });

    it("includes profiles for all stage types", () => {
      const profiles = engine.listProfiles();
      const stageTypes: BliskStageType[] = ["compressor", "turbine", "fan"];

      for (const stage of stageTypes) {
        const suitable = profiles.filter(p => p.suitableFor.includes(stage));
        expect(suitable.length).toBeGreaterThan(0);
      }
    });

    it("all profiles have required fields", () => {
      const profiles = engine.listProfiles();

      for (const p of profiles) {
        expect(p.designation).toBeTruthy();
        expect(p.suitableFor.length).toBeGreaterThan(0);
        expect(p.thicknessPercent).toBeGreaterThan(0);
        expect(p.notes).toBeTruthy();
      }
    });
  });

  // ── Warnings generation ─────────────────────────────────────────────────

  describe("warnings", () => {
    it("warns on low blade count for compressor", () => {
      const spec = createMinimalSpec("low_blade_warn_test");
      spec.stageType = "compressor";
      spec.bladeCount = 15;
      const result = engine.generate(spec);

      expect(result.warnings.some(w => w.includes("20+ blades"))).toBe(true);
    });

    it("warns on small root fillet", () => {
      const spec = createMinimalSpec("small_root_fillet_test");
      spec.rootFilletRadius_mm = 1;
      const result = engine.generate(spec);

      expect(result.warnings.some(w => w.includes("stress concentration"))).toBe(true);
    });

    it("warns on high aspect ratio", () => {
      const spec = createMinimalSpec("high_ar_warn_test");
      spec.blade.height_mm = 120;
      spec.blade.chordHub_mm = 30;
      const result = engine.generate(spec);

      expect(result.warnings.some(w => w.includes("flutter"))).toBe(true);
    });

    it("warns on thin disk", () => {
      const spec = createMinimalSpec("thin_disk_test");
      spec.diskThickness_mm = 8;
      spec.blade.chordHub_mm = 30;
      const result = engine.generate(spec);

      expect(result.warnings.some(w => w.includes("vibration"))).toBe(true);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles minimum valid blade count (3)", () => {
      const spec = createMinimalSpec("min_blades_test");
      spec.bladeCount = 3;
      const result = engine.generate(spec);

      const pattern = result.operations.find(op =>
        op.kind === "pattern_circular" &&
        String(op.args.name).includes("blade_pattern")
      );
      expect(pattern!.args.count).toBe(3);
    });

    it("handles maximum valid blade count (120)", () => {
      const spec = createMinimalSpec("max_blades_test");
      spec.bladeCount = 120;
      const result = engine.generate(spec);

      const pattern = result.operations.find(op =>
        op.kind === "pattern_circular" &&
        String(op.args.name).includes("blade_pattern")
      );
      expect(pattern!.args.count).toBe(120);
    });

    it("handles zero twist angle", () => {
      const spec = createMinimalSpec("zero_twist_test");
      spec.blade.twist_deg = 0;
      const result = engine.generate(spec);

      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("handles zero lean angle", () => {
      const spec = createMinimalSpec("zero_lean_test");
      spec.blade.lean_deg = 0;
      const result = engine.generate(spec);

      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("handles zero sweep angle", () => {
      const spec = createMinimalSpec("zero_sweep_test");
      spec.blade.sweep_deg = 0;
      const result = engine.generate(spec);

      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("handles thickness scale < 1", () => {
      const spec = createMinimalSpec("thin_blade_test");
      spec.blade.thicknessScale = 0.5;
      const result = engine.generate(spec);

      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("handles thickness scale > 1", () => {
      const spec = createMinimalSpec("thick_blade_test");
      spec.blade.thicknessScale = 1.5;
      const result = engine.generate(spec);

      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("handles equal hub and tip chord", () => {
      const spec = createMinimalSpec("equal_chord_test");
      spec.blade.chordHub_mm = 30;
      spec.blade.chordTip_mm = 30;
      const result = engine.generate(spec);

      expect(result.operations.length).toBeGreaterThan(10);
    });

    it("handles material metadata", () => {
      const spec = createMinimalSpec("material_test");
      spec.material = "Inconel 718";
      spec.surfaceFinish_um = 1.6;
      const result = engine.generate(spec);

      // Metadata doesn't affect operations, just verify no crash
      expect(result.operations.length).toBeGreaterThan(10);
    });
  });

  // ── Operation ordering ──────────────────────────────────────────────────

  describe("operation ordering", () => {
    it("datum comes before geometry", () => {
      const spec = createMinimalSpec("order_test");
      const result = engine.generate(spec);

      const datumIdx = result.operations.findIndex(op =>
        op.kind === "datum_coord_system"
      );
      const revolveIdx = result.operations.findIndex(op =>
        op.kind === "feature_revolve"
      );

      expect(datumIdx).toBeLessThan(revolveIdx);
    });

    it("disk comes before blade", () => {
      const spec = createMinimalSpec("disk_blade_order_test");
      const result = engine.generate(spec);

      const diskRevolveIdx = result.operations.findIndex(op =>
        op.kind === "feature_revolve" && String(op.args.name).includes("disk")
      );
      const bladeLoftIdx = result.operations.findIndex(op =>
        op.kind === "feature_loft" && String(op.args.name).includes("blade")
      );

      expect(diskRevolveIdx).toBeLessThan(bladeLoftIdx);
    });

    it("blade comes before pattern", () => {
      const spec = createMinimalSpec("blade_pattern_order_test");
      const result = engine.generate(spec);

      const bladeLoftIdx = result.operations.findIndex(op =>
        op.kind === "feature_loft" && String(op.args.name).includes("blade")
      );
      const patternIdx = result.operations.findIndex(op =>
        op.kind === "pattern_circular" && String(op.args.name).includes("blade_pattern")
      );

      expect(bladeLoftIdx).toBeLessThan(patternIdx);
    });

    it("pattern comes before fillet", () => {
      const spec = createMinimalSpec("pattern_fillet_order_test");
      const result = engine.generate(spec);

      const patternIdx = result.operations.findIndex(op =>
        op.kind === "pattern_circular" && String(op.args.name).includes("blade_pattern")
      );
      const filletIdx = result.operations.findIndex(op =>
        op.kind === "feature_fillet" && String(op.args.name).includes("root_fillet")
      );

      expect(patternIdx).toBeLessThan(filletIdx);
    });
  });
});
