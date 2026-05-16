/**
 * MillPartClassifierEngine Test Suite (MS-PRINT-PROGRAM-LOOP, U-PPL-A5)
 *
 * Covers:
 *   - 4-family decision tree (prismatic / pocket_2_5d / mold_3d / thin_wall)
 *   - Override paths (thin-wall trumps; tight-tol upgrades; magnetic; tape)
 *   - Defensive guards (FAIL_LOUD, invalid input, NaN, Infinity)
 *   - Constants pinning (decision-tree priority order)
 *   - Adversarial inputs (oversize features, empty strings, non-string entries)
 *   - Zod boundary
 *   - Class wrapper + singleton delegation
 *   - P0/P1 fix regressions (Reviewer A + B findings, 2026-05-15)
 *
 * Inputs are synthetic dimension tuples chosen to span the decision-tree
 * branches (prismatic plate / pocket-heavy plate / mold cavity bbox /
 * thin-wall housing / deep-pocket die-cavity bbox). The reference values
 * pinned in LOCK tests are exact engine constants (SCORE_*, *_RATIO,
 * *_TOL_MM) — not customer-specific fixtures. Per-customer JM-Die fixture
 * adapters belong in the downstream consumer units (U-PPL-B3 / U-PPL-D5),
 * not in this classifier's unit tests (Reviewer B P0-B1 honest-scoping fix).
 */

import { describe, it, expect } from "vitest";
import {
  millPartClassifierEngine,
  MillPartClassifierEngine,
  MillPartGeometryInputSchema,
  MillPartFamilySchema,
  THIN_WALL_RATIO,
  DEEP_POCKET_ASPECT,
  TALL_SLIM_ASPECT,
  TIGHT_TOL_MM,
  THERMAL_TOL_MM,
  FALLBACK_CONFIDENCE,
  SECONDARY_WINDOW,
  MAX_FEATURE_LABEL_LEN,
  DEEP_POCKET_DEPTH_RATIO,
  TAPE_PLATE_MAX_HEIGHT_MM,
  TAPE_MIN_FACE_AREA_MM2,
  SCORE_THIN_WALL,
  SCORE_3D_EXPLICIT,
  SCORE_POCKET_MULTI,
  SCORE_PRISMATIC_EXPLICIT,
  type MillPartGeometryInput,
  type MillPartFamily,
} from "../engines/MillPartClassifierEngine.js";

describe("MillPartClassifierEngine", () => {
  // ═══════════════════════════════════════════════════════════════════
  // LOCK TESTS — pin invariants the decision tree depends on
  // ═══════════════════════════════════════════════════════════════════

  describe("LOCK: constants + invariants", () => {
    it("THIN_WALL_RATIO is exactly 0.08 (industry ≤8% rule-of-thumb)", () => {
      expect(THIN_WALL_RATIO).toBe(0.08);
    });

    it("decision-tree score priority pinned: thin=92 > 3D=88 > pocketMulti=85 > prismExplicit=70", () => {
      expect(SCORE_THIN_WALL).toBe(92);
      expect(SCORE_3D_EXPLICIT).toBe(88);
      expect(SCORE_POCKET_MULTI).toBe(85);
      expect(SCORE_PRISMATIC_EXPLICIT).toBe(70);
    });

    it("TIGHT_TOL_MM=0.02 < THERMAL_TOL_MM=0.05", () => {
      expect(TIGHT_TOL_MM).toBe(0.02);
      expect(THERMAL_TOL_MM).toBe(0.05);
    });

    it("DEEP_POCKET_ASPECT=1.5, DEEP_POCKET_DEPTH_RATIO=0.25", () => {
      expect(DEEP_POCKET_ASPECT).toBe(1.5);
      expect(DEEP_POCKET_DEPTH_RATIO).toBe(0.25);
    });

    it("TALL_SLIM_ASPECT=2.0 (height/footprint threshold)", () => {
      expect(TALL_SLIM_ASPECT).toBe(2.0);
    });

    it("FALLBACK_CONFIDENCE=0.50 (and *100 < SCORE_PRISMATIC_EXPLICIT)", () => {
      expect(FALLBACK_CONFIDENCE).toBe(0.50);
      expect(FALLBACK_CONFIDENCE * 100).toBe(50);
    });

    it("MAX_FEATURE_LABEL_LEN=256, SECONDARY_WINDOW=15", () => {
      expect(MAX_FEATURE_LABEL_LEN).toBe(256);
      expect(SECONDARY_WINDOW).toBe(15);
    });

    it("TAPE_PLATE_MAX_HEIGHT_MM=3, TAPE_MIN_FACE_AREA_MM2=5000", () => {
      expect(TAPE_PLATE_MAX_HEIGHT_MM).toBe(3);
      expect(TAPE_MIN_FACE_AREA_MM2).toBe(5000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FAMILY CLASSIFICATION — happy paths
  // ═══════════════════════════════════════════════════════════════════

  describe("classify() — family decision tree", () => {
    it("plate + no pockets + no 3D → prismatic", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate",
      });
      expect(r.family).toBe("prismatic");
    });

    it("plate with 3 pockets → pocket_2_5d", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        pocket_count: 3, max_pocket_depth_mm: 20, stock_form: "plate",
      });
      expect(r.family).toBe("pocket_2_5d");
    });

    it("has_3d_surface=true → mold_3d", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 300, width_mm: 200, height_mm: 80,
        has_3d_surface: true, stock_form: "block",
      });
      expect(r.family).toBe("mold_3d");
    });

    it("thin-walled housing (ratio=0.05) → thin_wall", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100,
        min_wall_thickness_mm: 5,
      });
      expect(r.family).toBe("thin_wall");
      expect(r.thin_wall_risk).toBe(true);
    });

    it("impeller keyword → mold_3d", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 150, width_mm: 150, height_mm: 100,
        features: ["impeller_blade"], stock_form: "near_net_forged",
      });
      expect(r.family).toBe("mold_3d");
    });

    it("die_cavity keyword → mold_3d", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 200, height_mm: 100,
        features: ["die_cavity_core"],
      });
      expect(r.family).toBe("mold_3d");
    });

    it("thin-wall trumps mold_3d signal (priority 1)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100,
        min_wall_thickness_mm: 4, has_3d_surface: true,
      });
      expect(r.family).toBe("thin_wall");
    });

    it("mold_3d trumps pocket_2_5d when both fire (score 88 vs 72)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 200, height_mm: 100,
        has_3d_surface: true, pocket_count: 1,
      });
      expect(r.family).toBe("mold_3d");
    });

    it("fallback to prismatic when no signals (confidence == FALLBACK)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100, stock_form: "weldment",
      });
      expect(r.family).toBe("prismatic");
      expect(r.confidence).toBe(FALLBACK_CONFIDENCE);
    });

    it("explicit-prismatic confidence is SCORE_PRISMATIC_EXPLICIT/100 = 0.70", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate",
      });
      expect(r.confidence).toBe(0.70);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // P0/P1 fix regressions — guard reviewer findings
  // ═══════════════════════════════════════════════════════════════════

  describe("P0/P1 fix regressions", () => {
    it("P0-2: tall stick (L=100, W=10, H=10) → prismatic via tall/slim (orientation-independent)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 10, height_mm: 10, stock_form: "extrusion",
      });
      expect(r.family).toBe("prismatic");
      expect(r.reasoning.some(s => s.includes("tall/slim"))).toBe(true);
    });

    it("P0-2: orientation-independence — 3 permutations of same bbox give same family + same aspect string", () => {
      const a = millPartClassifierEngine.classify({ length_mm: 200, width_mm: 50, height_mm: 100, stock_form: "block" });
      const b = millPartClassifierEngine.classify({ length_mm: 100, width_mm: 200, height_mm: 50, stock_form: "block" });
      const c = millPartClassifierEngine.classify({ length_mm: 50, width_mm: 100, height_mm: 200, stock_form: "block" });
      expect(a.family).toBe(b.family);
      expect(b.family).toBe(c.family);
      const aspectA = a.reasoning.find(s => s.startsWith("aspect"));
      const aspectB = b.reasoning.find(s => s.startsWith("aspect"));
      expect(aspectA).toBe(aspectB);
    });

    it("P1-1: secondary_families does NOT contain winner family (double-push guard)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 300, width_mm: 50, height_mm: 100, stock_form: "block",
      });
      expect(r.family).toBe("prismatic");
      expect(r.secondary_families).not.toContain("prismatic");
    });

    it("P1-2: ratio EXACTLY 0.08 IS thin-wall (≤)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100, min_wall_thickness_mm: 8,
      });
      expect(r.thin_wall_risk).toBe(true);
      expect(r.family).toBe("thin_wall");
    });

    it("P1-2: ratio 0.085 is NOT thin-wall", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100, min_wall_thickness_mm: 8.5,
      });
      expect(r.thin_wall_risk).toBe(false);
    });

    it("P1-3: deepPocketRisk uses dMid — depth=160 > 1.5*100 triggers", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 100, height_mm: 50,
        pocket_count: 1, max_pocket_depth_mm: 160, stock_form: "plate",
      });
      expect(r.deep_pocket_risk).toBe(true);
      expect(r.toolpath_strategy).toBe("trochoidal");
    });

    it("P1-3: deepPocketRisk false when depth=100 < 1.5*dMid=150", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 100, height_mm: 50,
        pocket_count: 1, max_pocket_depth_mm: 100, stock_form: "plate",
      });
      expect(r.deep_pocket_risk).toBe(false);
    });

    it("P1-4: ferrous prismatic plate → magnetic_chuck (formerly unreachable)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 30,
        stock_form: "plate", is_ferrous: true,
      });
      expect(r.family).toBe("prismatic");
      expect(r.workholding_default).toBe("magnetic_chuck");
    });

    it("P1-4: non-ferrous prismatic plate → vise_standard", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 30,
        stock_form: "plate", is_ferrous: false,
      });
      expect(r.workholding_default).toBe("vise_standard");
    });

    it("P1-5: thin-wall part NOT regressed to tape_double_sided (controlled_pressure preserved)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 100, height_mm: 2,
        min_wall_thickness_mm: 0.1, largest_face_area_mm2: 20000,
      });
      expect(r.thin_wall_risk).toBe(true);
      expect(r.workholding_default).toBe("controlled_pressure");
    });

    it("P1-7: pocket_count=0 + max_depth>0 reasoning flags inferred-pocket assumption", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 100,
        pocket_count: 0, max_pocket_depth_mm: 40,
      });
      expect(r.family).toBe("pocket_2_5d");
      expect(r.reasoning.some(s => s.includes("assumed single pocket from depth signal"))).toBe(true);
    });

    it("P1-8: S-group + tight tol composes to cryogenic_option", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 50,
        iso_group: "S", tightest_tolerance_mm: 0.01, stock_form: "plate",
      });
      expect(r.thermal_approach).toBe("cryogenic_option");
    });

    it("P1-8: S-group alone → cryogenic_option", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 50,
        iso_group: "S", stock_form: "plate",
      });
      expect(r.thermal_approach).toBe("cryogenic_option");
    });

    it("P1-8: P-group + tight tol → rough_cool_finish (existing path preserved)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        iso_group: "P", tightest_tolerance_mm: 0.03, stock_form: "plate",
      });
      expect(r.thermal_approach).toBe("rough_cool_finish");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // WORKHOLDING OVERRIDES
  // ═══════════════════════════════════════════════════════════════════

  describe("workholding overrides", () => {
    it("prismatic default → vise_standard", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate",
      });
      expect(r.workholding_default).toBe("vise_standard");
    });

    it("tight tol < 0.02mm upgrades vise → fixture_plate", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        stock_form: "plate", tightest_tolerance_mm: 0.01,
      });
      expect(r.workholding_default).toBe("fixture_plate");
    });

    it("thin-wall family → controlled_pressure", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100, min_wall_thickness_mm: 4,
      });
      expect(r.workholding_default).toBe("controlled_pressure");
    });

    it("very thin plate (h=2) + face area > 5000 + not thin-wall → tape_double_sided", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 100, height_mm: 2,
        largest_face_area_mm2: 20000, stock_form: "plate",
      });
      expect(r.workholding_default).toBe("tape_double_sided");
    });

    it("mold_3d family → fixture_plate", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 200, height_mm: 100, has_3d_surface: true,
      });
      expect(r.workholding_default).toBe("fixture_plate");
    });

    it("pocket_2_5d family → vise_soft_jaws", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        pocket_count: 3, max_pocket_depth_mm: 10, stock_form: "plate",
      });
      expect(r.workholding_default).toBe("vise_soft_jaws");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // STRATEGY + THERMAL + SEQUENCE
  // ═══════════════════════════════════════════════════════════════════

  describe("strategy + thermal + sequence templates", () => {
    it("prismatic → adaptive_clearing", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate",
      });
      expect(r.toolpath_strategy).toBe("adaptive_clearing");
    });

    it("mold_3d → waterline", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 200, height_mm: 100, has_3d_surface: true,
      });
      expect(r.toolpath_strategy).toBe("waterline");
    });

    it("thin_wall → trochoidal", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100, min_wall_thickness_mm: 3,
      });
      expect(r.toolpath_strategy).toBe("trochoidal");
    });

    it("pocket_2_5d (shallow) → pocketing_2_5d", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        pocket_count: 2, max_pocket_depth_mm: 10, stock_form: "plate",
      });
      expect(r.toolpath_strategy).toBe("pocketing_2_5d");
    });

    it("pocket_2_5d (deep) → trochoidal override", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 100, height_mm: 50,
        pocket_count: 2, max_pocket_depth_mm: 160, stock_form: "plate",
      });
      expect(r.toolpath_strategy).toBe("trochoidal");
    });

    it("prismatic sequence has 8 steps including face_top, drill_holes, finish_periphery", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate",
      });
      expect(r.sequence_template).toEqual([
        "face_top", "rough_periphery", "drill_holes", "tap_threads",
        "finish_periphery", "deburr", "flip", "face_bottom",
      ]);
    });

    it("mold_3d sequence has 7 steps including rough_adaptive, finish_waterline, finish_scallop_shallow", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 200, height_mm: 100, has_3d_surface: true,
      });
      expect(r.sequence_template).toEqual([
        "rough_adaptive", "rest_machining", "semi_finish_waterline", "finish_waterline",
        "finish_scallop_shallow", "polish_prep", "edm_relief_setup",
      ]);
    });

    it("thin_wall sequence includes spring_pass + finish_climb_only", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100, min_wall_thickness_mm: 4,
      });
      expect(r.sequence_template).toContain("spring_pass");
      expect(r.sequence_template).toContain("finish_climb_only");
      expect(r.sequence_template.length).toBe(7);
    });

    it("tol 0.03mm → rough_cool_finish thermal (prismatic profile is standard otherwise)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        stock_form: "plate", tightest_tolerance_mm: 0.03,
      });
      expect(r.thermal_approach).toBe("rough_cool_finish");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FAIL-LOUD + invalid input
  // ═══════════════════════════════════════════════════════════════════

  describe("FAIL-LOUD on invalid input", () => {
    it("throws TypeError on null input", () => {
      expect(() => millPartClassifierEngine.classify(null as unknown as MillPartGeometryInput)).toThrow(TypeError);
    });

    it("throws TypeError on array input", () => {
      expect(() => millPartClassifierEngine.classify([] as unknown as MillPartGeometryInput)).toThrow(TypeError);
    });

    it("throws with /length_mm/ message on missing length_mm", () => {
      expect(() => millPartClassifierEngine.classify({ width_mm: 100, height_mm: 50 } as unknown as MillPartGeometryInput)).toThrow(/length_mm/);
    });

    it("throws with /width_mm/ message on NaN width_mm", () => {
      expect(() => millPartClassifierEngine.classify({ length_mm: 100, width_mm: NaN, height_mm: 50 })).toThrow(/width_mm/);
    });

    it("throws with /height_mm/ message on Infinity height_mm", () => {
      expect(() => millPartClassifierEngine.classify({ length_mm: 100, width_mm: 50, height_mm: Infinity })).toThrow(/height_mm/);
    });

    it("throws on zero length_mm (must be positive)", () => {
      expect(() => millPartClassifierEngine.classify({ length_mm: 0, width_mm: 50, height_mm: 50 })).toThrow(/length_mm/);
    });

    it("throws on negative width_mm", () => {
      expect(() => millPartClassifierEngine.classify({ length_mm: 100, width_mm: -10, height_mm: 50 })).toThrow(/width_mm/);
    });

    it("classifyBatch throws TypeError on non-array input", () => {
      expect(() => millPartClassifierEngine.classifyBatch("not an array" as unknown as MillPartGeometryInput[])).toThrow(TypeError);
    });

    it("getFamilyProfile throws TypeError on unknown family", () => {
      expect(() => millPartClassifierEngine.getFamilyProfile("not_a_family" as MillPartFamily)).toThrow(TypeError);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ADVERSARIAL inputs
  // ═══════════════════════════════════════════════════════════════════

  describe("adversarial inputs", () => {
    it("ignores non-string entries in features array", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        features: ["pocket", 42 as unknown as string, null as unknown as string, "boss"],
        stock_form: "plate",
      });
      expect(r.family).toBe("prismatic");
      // P1-B1 fix: use toMatch over regex — catches undefined AND format-changes
      // with a clean assertion failure instead of TypeError-crash on .toContain.
      const featuresLine = r.reasoning.find(s => s.startsWith("pocket_count="));
      expect(featuresLine).toMatch(/features=\[pocket,boss\]/);
    });

    it("filters empty-string features (no leading commas in reasoning)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        features: ["", "", "pocket"], stock_form: "plate",
      });
      expect(r.family).toBe("prismatic");
      const featuresLine = r.reasoning.find(s => s.startsWith("pocket_count="));
      expect(featuresLine).toMatch(/features=\[pocket\]/);
    });

    it("truncates feature labels longer than MAX_FEATURE_LABEL_LEN — engine doesn't crash", () => {
      const longLabel = "x".repeat(MAX_FEATURE_LABEL_LEN + 100);
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        features: [longLabel], stock_form: "plate",
      });
      expect(r.family).toBe("prismatic");
    });

    it("cube L=W=H=100 → prismatic block with explicit confidence 0.70", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100, stock_form: "block",
      });
      expect(r.family).toBe("prismatic");
      expect(r.confidence).toBe(0.70);
    });

    it("fractional pocket_count (2.7) floors to 2 → pocket_multi (score 85)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        pocket_count: 2.7 as unknown as number,
        max_pocket_depth_mm: 10, stock_form: "plate",
      });
      expect(r.family).toBe("pocket_2_5d");
      expect(r.reasoning.some(s => s.includes("pocket_count=2,"))).toBe(true);
    });

    it("negative pocket_count (-5) falls back to 0 → prismatic", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        pocket_count: -5 as unknown as number,
        stock_form: "plate",
      });
      expect(r.family).toBe("prismatic");
      expect(r.reasoning.some(s => s.includes("pocket_count=0"))).toBe(true);
    });

    it("NaN pocket_count falls back to 0 → prismatic", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        pocket_count: NaN as unknown as number,
        stock_form: "plate",
      });
      expect(r.family).toBe("prismatic");
    });

    it("200-entry features array (bypassing schema) → engine returns prismatic without crash", () => {
      const oversize = Array.from({ length: 200 }, (_, i) => `feature_${i}`);
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        features: oversize, stock_form: "plate",
      });
      expect(r.family).toBe("prismatic");
    });

    it("__proto__/constructor strings in features → treated as plain strings (no pollution, family=prismatic)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50,
        features: ["__proto__", "constructor", "prototype"],
        stock_form: "plate",
      });
      expect(r.family).toBe("prismatic");
      // The returned object's prototype should be Object.prototype (no pollution upward)
      expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECONDARY FAMILIES + REASONING
  // ═══════════════════════════════════════════════════════════════════

  describe("secondary_families + reasoning quality", () => {
    it("secondary_families is empty when only one candidate fires", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "weldment",
      });
      expect(r.secondary_families).toEqual([]);
    });

    it("secondary_families contains runner-up within SECONDARY_WINDOW (mold_3d after pocket-multi)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 200, height_mm: 100,
        features: ["mold_cavity"],  // 3D-keyword → 80
        pocket_count: 2,            // pocket-multi → 85
        stock_form: "block",
      });
      expect(r.family).toBe("pocket_2_5d");
      expect(r.secondary_families).toEqual(["mold_3d"]);
    });

    it("secondary_families excludes runner-ups outside SECONDARY_WINDOW (thin_wall=92 vs prismatic=70)", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 100, width_mm: 100, height_mm: 100,
        min_wall_thickness_mm: 4, stock_form: "plate",
      });
      expect(r.family).toBe("thin_wall");
      expect(r.secondary_families).not.toContain("prismatic");
    });

    it("reasoning array has exactly 4 lines for prismatic plate: bbox + aspect + pocket-line + winner-reason", () => {
      // P1-B3 fix: pin exact length, not floor. classify() always emits 3
      // top-of-method reasoning lines + winner-candidate reasons (≥1).
      // For a plain prismatic plate (single winner candidate, 1 reason), total = 4.
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate",
      });
      expect(r.reasoning).toHaveLength(4);
      expect(r.reasoning[0]).toMatch(/^bbox \(sorted\):/);
      expect(r.reasoning[1]).toMatch(/^aspect/);
      expect(r.reasoning[2]).toMatch(/^pocket_count=/);
      // [3] is the winner's reason ("plate stock + no pockets + no 3D surface → prismatic")
      expect(r.reasoning[3]).toMatch(/prismatic/);
    });

    it("confidence pinned to per-family score/100 for all 4 winners (no silent score-drift)", () => {
      // P1-B2 fix: pin per-family confidence to the named SCORE_* constant.
      // The loop now CATCHES a silent score regression (e.g., SCORE_THIN_WALL
      // shrinking from 92 → 50 would no longer be hidden behind a >0/≤1 check).
      const inputs: Array<[MillPartGeometryInput, MillPartFamily, number]> = [
        [{ length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate" }, "prismatic", SCORE_PRISMATIC_EXPLICIT / 100],
        [{ length_mm: 200, width_mm: 150, height_mm: 50, pocket_count: 3, max_pocket_depth_mm: 20, stock_form: "plate" }, "pocket_2_5d", SCORE_POCKET_MULTI / 100],
        [{ length_mm: 200, width_mm: 200, height_mm: 100, has_3d_surface: true }, "mold_3d", SCORE_3D_EXPLICIT / 100],
        [{ length_mm: 100, width_mm: 100, height_mm: 100, min_wall_thickness_mm: 4 }, "thin_wall", SCORE_THIN_WALL / 100],
      ];
      for (const [input, expectedFamily, expectedConfidence] of inputs) {
        const r = millPartClassifierEngine.classify(input);
        expect(r.family).toBe(expectedFamily);
        expect(r.confidence).toBeCloseTo(expectedConfidence, 5);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // BATCH + LIST + GET
  // ═══════════════════════════════════════════════════════════════════

  describe("classifyBatch() / listFamilies() / getFamilyProfile()", () => {
    it("classifyBatch returns family-correct results for 3 inputs", () => {
      const parts: MillPartGeometryInput[] = [
        { length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate" },
        { length_mm: 100, width_mm: 100, height_mm: 100, has_3d_surface: true },
        { length_mm: 50, width_mm: 50, height_mm: 50, min_wall_thickness_mm: 3 },
      ];
      const results = millPartClassifierEngine.classifyBatch(parts);
      expect(results.length).toBe(3);
      expect(results[0].family).toBe("prismatic");
      expect(results[1].family).toBe("mold_3d");
      expect(results[2].family).toBe("thin_wall");
    });

    it("classifyBatch on empty array returns empty array", () => {
      expect(millPartClassifierEngine.classifyBatch([])).toEqual([]);
    });

    it("listFamilies returns exactly 4 families sorted alphabetically", () => {
      const list = millPartClassifierEngine.listFamilies();
      expect(list.length).toBe(4);
      const names = list.map(f => f.family).sort();
      expect(names).toEqual(["mold_3d", "pocket_2_5d", "prismatic", "thin_wall"]);
    });

    it("listFamilies entry for prismatic: workholding=vise_standard, strategy=adaptive_clearing", () => {
      const list = millPartClassifierEngine.listFamilies();
      const prism = list.find(f => f.family === "prismatic");
      expect(prism).toEqual({
        family: "prismatic",
        workholding: "vise_standard",
        strategy: "adaptive_clearing",
        thermal: "standard",
      });
    });

    it("listFamilies entry for mold_3d: workholding=fixture_plate, strategy=waterline, thermal=controlled_coolant", () => {
      const list = millPartClassifierEngine.listFamilies();
      const m = list.find(f => f.family === "mold_3d");
      expect(m).toEqual({
        family: "mold_3d",
        workholding: "fixture_plate",
        strategy: "waterline",
        thermal: "controlled_coolant",
      });
    });

    it("listFamilies entry for thin_wall: workholding=controlled_pressure, strategy=trochoidal", () => {
      const list = millPartClassifierEngine.listFamilies();
      const t = list.find(f => f.family === "thin_wall");
      expect(t).toEqual({
        family: "thin_wall",
        workholding: "controlled_pressure",
        strategy: "trochoidal",
        thermal: "controlled_coolant",
      });
    });

    it("listFamilies entry for pocket_2_5d: workholding=vise_soft_jaws, strategy=pocketing_2_5d, thermal=rough_cool_finish", () => {
      const list = millPartClassifierEngine.listFamilies();
      const p = list.find(f => f.family === "pocket_2_5d");
      expect(p).toEqual({
        family: "pocket_2_5d",
        workholding: "vise_soft_jaws",
        strategy: "pocketing_2_5d",
        thermal: "rough_cool_finish",
      });
    });

    it("getFamilyProfile(mold_3d) returns waterline + fixture_plate + controlled_coolant", () => {
      const profile = millPartClassifierEngine.getFamilyProfile("mold_3d");
      expect(profile.family).toBe("mold_3d");
      expect(profile.strategy).toBe("waterline");
      expect(profile.workholding).toBe("fixture_plate");
      expect(profile.thermal).toBe("controlled_coolant");
    });

    it("getFamilyProfile(thin_wall) returns trochoidal + controlled_pressure", () => {
      const profile = millPartClassifierEngine.getFamilyProfile("thin_wall");
      expect(profile.strategy).toBe("trochoidal");
      expect(profile.workholding).toBe("controlled_pressure");
    });

    it("getFamilyProfile(prismatic) returns adaptive_clearing + vise_standard", () => {
      const profile = millPartClassifierEngine.getFamilyProfile("prismatic");
      expect(profile.strategy).toBe("adaptive_clearing");
      expect(profile.workholding).toBe("vise_standard");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CLASS WRAPPER + SINGLETON
  // ═══════════════════════════════════════════════════════════════════

  describe("class wrapper delegation", () => {
    it("new MillPartClassifierEngine() gives same family + strategy + workholding as singleton", () => {
      const fresh = new MillPartClassifierEngine();
      const input: MillPartGeometryInput = {
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate",
      };
      const a = fresh.classify(input);
      const b = millPartClassifierEngine.classify(input);
      expect(a.family).toBe(b.family);
      expect(a.toolpath_strategy).toBe(b.toolpath_strategy);
      expect(a.workholding_default).toBe(b.workholding_default);
      expect(a.thermal_approach).toBe(b.thermal_approach);
    });

    it("singleton stable across identical inputs (deep-equal result)", () => {
      const a = millPartClassifierEngine.classify({ length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate" });
      const b = millPartClassifierEngine.classify({ length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate" });
      expect(a).toEqual(b);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ZOD BOUNDARY
  // ═══════════════════════════════════════════════════════════════════

  describe("Zod schema boundary", () => {
    it("MillPartGeometryInputSchema accepts a valid prismatic input", () => {
      const r = MillPartGeometryInputSchema.safeParse({
        length_mm: 200, width_mm: 150, height_mm: 50,
        stock_form: "plate", pocket_count: 2,
      });
      expect(r.success).toBe(true);
    });

    it("MillPartGeometryInputSchema rejects negative length_mm", () => {
      const r = MillPartGeometryInputSchema.safeParse({
        length_mm: -10, width_mm: 150, height_mm: 50,
      });
      expect(r.success).toBe(false);
    });

    it("MillPartGeometryInputSchema rejects zero length_mm", () => {
      const r = MillPartGeometryInputSchema.safeParse({
        length_mm: 0, width_mm: 150, height_mm: 50,
      });
      expect(r.success).toBe(false);
    });

    it("MillPartGeometryInputSchema rejects unknown property (.strict())", () => {
      const r = MillPartGeometryInputSchema.safeParse({
        length_mm: 200, width_mm: 150, height_mm: 50,
        bogus_field: "should fail",
      });
      expect(r.success).toBe(false);
    });

    it("MillPartGeometryInputSchema rejects unknown stock_form", () => {
      const r = MillPartGeometryInputSchema.safeParse({
        length_mm: 200, width_mm: 150, height_mm: 50,
        stock_form: "not_a_form" as never,
      });
      expect(r.success).toBe(false);
    });

    it("MillPartFamilySchema accepts all 4 mill family values", () => {
      expect(MillPartFamilySchema.safeParse("prismatic").success).toBe(true);
      expect(MillPartFamilySchema.safeParse("pocket_2_5d").success).toBe(true);
      expect(MillPartFamilySchema.safeParse("mold_3d").success).toBe(true);
      expect(MillPartFamilySchema.safeParse("thin_wall").success).toBe(true);
    });

    it("MillPartFamilySchema rejects lathe family names (cross-taxonomy guard)", () => {
      expect(MillPartFamilySchema.safeParse("shaft").success).toBe(false);
      expect(MillPartFamilySchema.safeParse("flange").success).toBe(false);
    });

    it("Zod features.max(64) rejects 65-element array", () => {
      const r = MillPartGeometryInputSchema.safeParse({
        length_mm: 200, width_mm: 150, height_mm: 50,
        features: Array.from({ length: 65 }, (_, i) => `f${i}`),
      });
      expect(r.success).toBe(false);
    });

    it("Zod accepts 64-element features array exactly at cap", () => {
      const r = MillPartGeometryInputSchema.safeParse({
        length_mm: 200, width_mm: 150, height_mm: 50,
        features: Array.from({ length: 64 }, (_, i) => `f${i}`),
      });
      expect(r.success).toBe(true);
    });

    it("Zod rejects iso_group outside P/M/K/N/S/H", () => {
      const r = MillPartGeometryInputSchema.safeParse({
        length_mm: 200, width_mm: 150, height_mm: 50,
        iso_group: "X" as never,
      });
      expect(r.success).toBe(false);
    });
  });
});
