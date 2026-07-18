/**
 * PostSelectionEngine companion tests.
 *
 * Invariants verified:
 *   - safe_retract always selected (unconditional conditions fn, score=90)
 *   - tcpm_mode selected iff axis_count >= 5
 *   - nurbs_interpolation and arc_fitting never both enabled after conflict resolution
 *   - sister_tooling / tool_break_detect suppressed for prototype production_volume
 *   - confidence = min(0.95, avgSelectedScore / 100) algebraic
 *   - selected_features sorted descending by score
 *   - decimal_places=4 when tolerance_mm <= 0.01; else 3
 *   - smoothing_mode="ultra" for finishing op + hsm_smoothing active
 *   - getAvailableFeatures returns only controller-supported feature ids
 *   - TSC feature absent when has_tsc=false
 *   - in_process_probing absent when has_probing=false
 *   - collision_check absent on fanuc (only siemens/heidenhain/okuma)
 *   - selected+rejected partition has no id appearing in both lists
 */

import { describe, it, expect } from "vitest";
import {
  PostSelectionEngine,
  postSelectionEngine,
  type JobContext,
} from "../engines/PostSelectionEngine.js";

// ── Canonical job-context fixtures ──────────────────────────────────────────

/** Standard 3-axis Fanuc finishing job on P-group material */
function fanucFinishingCtx(): JobContext {
  return {
    machine: {
      controller: "fanuc",
      max_rpm: 12000,
      spindle_power_kw: 15,
      axis_count: 3,
      has_tsc: true,
      has_probing: true,
      has_rigid_tapping: true,
      taper: "CAT40",
    },
    part: {
      complexity: "complex",
      tolerance_mm: 0.02,
      surface_finish_target_um: 0.8,
      has_deep_pockets: false,
      has_thin_walls: false,
      has_tight_corners: true,
      max_depth_mm: 40,
      estimated_cycle_time_min: 30,
    },
    material: {
      iso_group: "P",
      thermal_sensitivity: "low",
    },
    cam_source: "mastercam",
    operation_type: "finishing",
    tool_count: 8,
    production_volume: "medium",
  };
}

/** Siemens 5-axis complex part */
function siemens5AxisCtx(): JobContext {
  return {
    machine: {
      controller: "siemens",
      max_rpm: 20000,
      spindle_power_kw: 22,
      axis_count: 5,
      has_tsc: true,
      has_probing: true,
      has_rigid_tapping: true,
      taper: "HSK-A63",
    },
    part: {
      complexity: "extreme",
      tolerance_mm: 0.005,
      surface_finish_target_um: 0.4,
      has_deep_pockets: true,
      has_thin_walls: false,
      has_tight_corners: false,
      max_depth_mm: 80,
      estimated_cycle_time_min: 120,
    },
    material: {
      iso_group: "S",
      hardness_hrc: 38,
      thermal_sensitivity: "high",
    },
    cam_source: "hypermill",
    operation_type: "finishing",
    tool_count: 20,
    production_volume: "low",
  };
}

/** Roughing job on Haas — high volume, no TSC, no probing */
function haasRoughingCtx(): JobContext {
  return {
    machine: {
      controller: "haas",
      max_rpm: 8100,
      spindle_power_kw: 22,
      axis_count: 3,
      has_tsc: false,
      has_probing: false,
      has_rigid_tapping: true,
      taper: "BT40",
    },
    part: {
      complexity: "moderate",
      tolerance_mm: 0.1,
      surface_finish_target_um: 3.2,
      has_deep_pockets: false,
      has_thin_walls: false,
      has_tight_corners: false,
      max_depth_mm: 20,
      estimated_cycle_time_min: 15,
    },
    material: {
      iso_group: "K",
      thermal_sensitivity: "low",
    },
    cam_source: "fusion360",
    operation_type: "roughing",
    tool_count: 5,
    production_volume: "high",
  };
}

/** Prototype drilling job on Okuma — minimal features expected */
function prototypeOkumaDrillingCtx(): JobContext {
  return {
    machine: {
      controller: "okuma",
      max_rpm: 6000,
      spindle_power_kw: 11,
      axis_count: 3,
      has_tsc: false,
      has_probing: false,
      has_rigid_tapping: false,
      taper: "BT40",
    },
    part: {
      complexity: "simple",
      tolerance_mm: 0.05,
      surface_finish_target_um: 3.2,
      has_deep_pockets: false,
      has_thin_walls: false,
      has_tight_corners: false,
      max_depth_mm: 30,
      estimated_cycle_time_min: 10,
    },
    material: {
      iso_group: "N",
      thermal_sensitivity: "low",
    },
    cam_source: "generic",
    operation_type: "drilling",
    tool_count: 3,
    production_volume: "prototype",
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PostSelectionEngine", () => {
  it("is the exported singleton instance of PostSelectionEngine class", () => {
    expect(postSelectionEngine).toBeInstanceOf(PostSelectionEngine);
  });

  // ── safe_retract invariant ────────────────────────────────────────────────
  describe("safe_retract is always selected with score 90", () => {
    it("fanuc finishing job includes safe_retract in selected features", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      const ids = result.selected_features.map((f) => f.id);
      expect(ids).toContain("safe_retract");
    });

    it("siemens 5-axis job includes safe_retract", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      expect(result.selected_features.map((f) => f.id)).toContain("safe_retract");
    });

    it("prototype okuma drilling includes safe_retract", () => {
      const result = postSelectionEngine.compute(prototypeOkumaDrillingCtx());
      expect(result.selected_features.map((f) => f.id)).toContain("safe_retract");
    });

    it("safe_retract scores exactly 90", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      const feature = result.selected_features.find((f) => f.id === "safe_retract");
      expect(feature!.score).toBe(90);
    });

    it("safe_retract reason mentions 'tool changes'", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      const feature = result.selected_features.find((f) => f.id === "safe_retract");
      expect(feature!.reason).toMatch(/tool changes/i);
    });
  });

  // ── TCPM / 5-axis invariant ───────────────────────────────────────────────
  describe("tcpm_mode selected if and only if axis_count >= 5", () => {
    it("selects tcpm_mode for 5-axis siemens job", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      expect(result.selected_features.map((f) => f.id)).toContain("tcpm_mode");
    });

    it("tcpm_mode scores 98 for 5-axis job", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      const feature = result.selected_features.find((f) => f.id === "tcpm_mode");
      expect(feature!.score).toBe(98);
    });

    it("does NOT select tcpm_mode for 3-axis fanuc job", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.selected_features.map((f) => f.id)).not.toContain("tcpm_mode");
    });

    it("tcpm_mode appears in rejected list for 3-axis job", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.rejected_features.map((f) => f.id)).toContain("tcpm_mode");
    });

    it("controller_config five_axis_mode is 'tcpm' when tcpm_mode selected", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      expect(result.controller_config.five_axis_mode).toBe("tcpm");
    });

    it("controller_config five_axis_mode is 'none' for 3-axis job", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.controller_config.five_axis_mode).toBe("none");
    });
  });

  // ── nurbs/arc_fitting conflict resolution ─────────────────────────────────
  describe("nurbs_interpolation and arc_fitting conflict resolution", () => {
    it("siemens 5-axis extreme: nurbs wins over arc_fitting (higher score 90 vs 65)", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      const selectedIds = result.selected_features.map((f) => f.id);
      // nurbs scores 90 for extreme, arc_fitting scores 65 — nurbs wins
      expect(selectedIds).toContain("nurbs_interpolation");
      expect(selectedIds).not.toContain("arc_fitting");
    });

    it("arc_fitting appears in rejected list when nurbs wins", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      expect(result.rejected_features.map((f) => f.id)).toContain("arc_fitting");
    });

    it("neither nurbs nor arc_fitting simultaneously in selected_features", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      const selectedIds = result.selected_features.map((f) => f.id);
      const bothPresent =
        selectedIds.includes("nurbs_interpolation") && selectedIds.includes("arc_fitting");
      expect(bothPresent).toBe(false);
    });
  });

  // ── Prototype production_volume gates ─────────────────────────────────────
  describe("prototype volume disables sister_tooling and tool_break_detect", () => {
    it("sister_tooling not selected for prototype", () => {
      const result = postSelectionEngine.compute(prototypeOkumaDrillingCtx());
      expect(result.selected_features.map((f) => f.id)).not.toContain("sister_tooling");
    });

    it("tool_break_detect not selected for prototype", () => {
      const result = postSelectionEngine.compute(prototypeOkumaDrillingCtx());
      expect(result.selected_features.map((f) => f.id)).not.toContain("tool_break_detect");
    });

    it("sister_tooling selected for high volume (score 95)", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      const feature = result.selected_features.find((f) => f.id === "sister_tooling");
      expect(feature!.score).toBe(95);
    });
  });

  // ── TSC feature gate ──────────────────────────────────────────────────────
  describe("through_spindle_coolant suppressed when has_tsc is false", () => {
    it("TSC absent in selected for haas job without TSC", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      expect(result.selected_features.map((f) => f.id)).not.toContain("through_spindle_coolant");
    });

    it("TSC in rejected list when has_tsc=false", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      expect(result.rejected_features.map((f) => f.id)).toContain("through_spindle_coolant");
    });

    it("TSC selected at score 95 for deep pocket (>30mm) with TSC enabled", () => {
      // siemens5AxisCtx has has_tsc=true, has_deep_pockets=true, max_depth_mm=80
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      const feature = result.selected_features.find((f) => f.id === "through_spindle_coolant");
      expect(feature!.score).toBe(95);
    });
  });

  // ── Probing feature gate ──────────────────────────────────────────────────
  describe("in_process_probing absent when has_probing is false", () => {
    it("no in_process_probing when machine lacks probing (haas)", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      expect(result.selected_features.map((f) => f.id)).not.toContain("in_process_probing");
    });

    it("no auto_compensation when machine lacks probing (haas)", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      expect(result.selected_features.map((f) => f.id)).not.toContain("auto_compensation");
    });

    it("in_process_probing selected at score 95 for tight tolerance (<=0.02mm) + probing", () => {
      // fanucFinishingCtx: tolerance_mm=0.02, has_probing=true
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      const feature = result.selected_features.find((f) => f.id === "in_process_probing");
      expect(feature!.score).toBe(95);
    });
  });

  // ── collision_check controller gate ──────────────────────────────────────
  describe("collision_check only on siemens/heidenhain/okuma", () => {
    it("collision_check rejected on fanuc (not in supported controllers)", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.rejected_features.map((f) => f.id)).toContain("collision_check");
    });

    it("collision_check selected on siemens 5-axis job at score 95", () => {
      // axis_count=5 triggers score 95
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      const feature = result.selected_features.find((f) => f.id === "collision_check");
      expect(feature!.score).toBe(95);
    });
  });

  // ── Confidence algebraic invariant ────────────────────────────────────────
  describe("confidence = min(0.95, avgScore/100) algebraic invariant", () => {
    it("confidence matches formula for fanuc finishing job", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      const avgScore =
        result.selected_features.reduce((s, f) => s + f.score, 0) /
        result.selected_features.length;
      const expected = Math.min(0.95, avgScore / 100);
      expect(result.confidence).toBeCloseTo(expected, 6);
    });

    it("confidence matches formula for siemens 5-axis job", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      const avgScore =
        result.selected_features.reduce((s, f) => s + f.score, 0) /
        result.selected_features.length;
      const expected = Math.min(0.95, avgScore / 100);
      expect(result.confidence).toBeCloseTo(expected, 6);
    });

    it("confidence never exceeds 0.95", () => {
      for (const ctx of [
        fanucFinishingCtx(),
        siemens5AxisCtx(),
        haasRoughingCtx(),
        prototypeOkumaDrillingCtx(),
      ]) {
        const result = postSelectionEngine.compute(ctx);
        expect(result.confidence).toBeLessThanOrEqual(0.95);
      }
    });

    it("confidence is non-negative for all fixture jobs", () => {
      for (const ctx of [
        fanucFinishingCtx(),
        siemens5AxisCtx(),
        haasRoughingCtx(),
        prototypeOkumaDrillingCtx(),
      ]) {
        const result = postSelectionEngine.compute(ctx);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ── selected_features sorted descending by score ──────────────────────────
  describe("selected_features sorted descending by score", () => {
    it("fanuc finishing job: scores are non-increasing", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      const scores = result.selected_features.map((f) => f.score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    });

    it("siemens 5-axis job: scores are non-increasing", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      const scores = result.selected_features.map((f) => f.score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    });

    it("haas roughing job: scores are non-increasing", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      const scores = result.selected_features.map((f) => f.score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    });
  });

  // ── decimal_places threshold invariant ───────────────────────────────────
  describe("decimal_places = 4 when tolerance_mm <= 0.01, else 3", () => {
    it("siemens job tolerance=0.005 gets 4 decimal places", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      expect(result.controller_config.decimal_places).toBe(4);
    });

    it("fanuc job tolerance=0.02 gets 3 decimal places", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.controller_config.decimal_places).toBe(3);
    });

    it("tolerance exactly 0.01 gets 4 decimal places (boundary inclusive)", () => {
      const ctx = fanucFinishingCtx();
      ctx.part.tolerance_mm = 0.01;
      expect(postSelectionEngine.compute(ctx).controller_config.decimal_places).toBe(4);
    });

    it("tolerance 0.011 gets 3 decimal places (above boundary)", () => {
      const ctx = fanucFinishingCtx();
      ctx.part.tolerance_mm = 0.011;
      expect(postSelectionEngine.compute(ctx).controller_config.decimal_places).toBe(3);
    });
  });

  // ── smoothing_mode logic ──────────────────────────────────────────────────
  describe("smoothing_mode driven by operation_type + hsm_smoothing presence", () => {
    it("drilling op (no hsm_smoothing) gives smoothing_mode='off'", () => {
      // Prototype drilling: hsm_smoothing conditions returns null for drilling
      const result = postSelectionEngine.compute(prototypeOkumaDrillingCtx());
      expect(result.selected_features.map((f) => f.id)).not.toContain("hsm_smoothing");
      expect(result.controller_config.smoothing_mode).toBe("off");
    });

    it("finishing + hsm_smoothing gives smoothing_mode='ultra'", () => {
      // fanucFinishingCtx: complex geometry -> hsm_smoothing score 95 -> selected
      // operation_type=finishing -> ultra
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      const hsmSelected = result.selected_features.some((f) => f.id === "hsm_smoothing");
      expect(hsmSelected).toBe(true);
      expect(result.controller_config.smoothing_mode).toBe("ultra");
    });

    it("roughing + hsm_smoothing gives smoothing_mode='rough'", () => {
      const ctx = haasRoughingCtx();
      ctx.part.complexity = "complex"; // ensure hsm_smoothing fires with score 95
      const result = postSelectionEngine.compute(ctx);
      const hsmSelected = result.selected_features.some((f) => f.id === "hsm_smoothing");
      expect(hsmSelected).toBe(true);
      expect(result.controller_config.smoothing_mode).toBe("rough");
    });
  });

  // ── safe_start_block canonical values ────────────────────────────────────
  describe("controller_config safe_start_block canonical values", () => {
    it("fanuc safe start is 'G90 G80 G40 G49 G17'", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.controller_config.safe_start_block).toBe("G90 G80 G40 G49 G17");
    });

    it("siemens safe start is 'G90 G40 G17 SUPA D0'", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      expect(result.controller_config.safe_start_block).toBe("G90 G40 G17 SUPA D0");
    });

    it("okuma safe start is 'G90 G80 G40 G49 G17 G15 H0'", () => {
      const result = postSelectionEngine.compute(prototypeOkumaDrillingCtx());
      expect(result.controller_config.safe_start_block).toBe("G90 G80 G40 G49 G17 G15 H0");
    });

    it("controller in result matches input controller string", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      expect(result.controller_config.controller).toBe("haas");
    });
  });

  // ── canned_cycles for drilling/threading ─────────────────────────────────
  describe("canned_cycles enabled only for drilling and threading", () => {
    it("drilling op enables canned_cycles", () => {
      const result = postSelectionEngine.compute(prototypeOkumaDrillingCtx());
      expect(result.controller_config.canned_cycles).toBe(true);
    });

    it("finishing op disables canned_cycles", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.controller_config.canned_cycles).toBe(false);
    });

    it("roughing op disables canned_cycles", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      expect(result.controller_config.canned_cycles).toBe(false);
    });
  });

  // ── getAvailableFeatures ──────────────────────────────────────────────────
  describe("getAvailableFeatures", () => {
    it("heidenhain supports nurbs_interpolation", () => {
      expect(postSelectionEngine.getAvailableFeatures("heidenhain")).toContain("nurbs_interpolation");
    });

    it("haas does NOT support nurbs_interpolation", () => {
      expect(postSelectionEngine.getAvailableFeatures("haas")).not.toContain("nurbs_interpolation");
    });

    it("haas does NOT support collision_check (only siemens/heidenhain/okuma)", () => {
      expect(postSelectionEngine.getAvailableFeatures("haas")).not.toContain("collision_check");
    });

    it("siemens supports collision_check", () => {
      expect(postSelectionEngine.getAvailableFeatures("siemens")).toContain("collision_check");
    });

    it("fanuc includes safe_retract", () => {
      expect(postSelectionEngine.getAvailableFeatures("fanuc")).toContain("safe_retract");
    });

    it("unknown controller returns empty array", () => {
      expect(postSelectionEngine.getAvailableFeatures("totally_unknown_ctrl")).toEqual([]);
    });

    it("haas supports ssv_mode (haas/okuma exclusive)", () => {
      expect(postSelectionEngine.getAvailableFeatures("haas")).toContain("ssv_mode");
    });

    it("fanuc does NOT support ssv_mode", () => {
      expect(postSelectionEngine.getAvailableFeatures("fanuc")).not.toContain("ssv_mode");
    });
  });

  // ── selected + rejected partition ─────────────────────────────────────────
  describe("selected + rejected form a disjoint partition (no id in both)", () => {
    it("no feature id appears in both selected and rejected for fanuc finishing", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      const selectedIds = new Set(result.selected_features.map((f) => f.id));
      const rejectedIds = result.rejected_features.map((f) => f.id);
      for (const id of rejectedIds) {
        expect(selectedIds.has(id)).toBe(false);
      }
    });

    it("no feature id appears in both lists for siemens 5-axis", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      const selectedIds = new Set(result.selected_features.map((f) => f.id));
      const rejectedIds = result.rejected_features.map((f) => f.id);
      for (const id of rejectedIds) {
        expect(selectedIds.has(id)).toBe(false);
      }
    });

    it("all selected features have enabled=true", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      for (const f of result.selected_features) {
        expect(f.enabled).toBe(true);
      }
    });
  });

  // ── rationale string encodes key fields ───────────────────────────────────
  describe("rationale string", () => {
    it("contains controller name uppercased for fanuc", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.rationale.toUpperCase()).toContain("FANUC");
    });

    it("contains '5-axis TCPM enabled' for 5-axis job", () => {
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      expect(result.rationale).toContain("5-axis TCPM enabled");
    });

    it("does NOT mention '5-axis TCPM enabled' for 3-axis job", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.rationale).not.toContain("5-axis TCPM enabled");
    });

    it("contains safety score in rationale", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.rationale).toMatch(/safety score:/i);
    });
  });

  // ── estimated_improvement bounds ──────────────────────────────────────────
  describe("estimated_improvement.safety_score bounds", () => {
    it("safety_score >= 50 for all jobs (base=50)", () => {
      for (const ctx of [
        fanucFinishingCtx(),
        siemens5AxisCtx(),
        haasRoughingCtx(),
        prototypeOkumaDrillingCtx(),
      ]) {
        const result = postSelectionEngine.compute(ctx);
        expect(result.estimated_improvement.safety_score).toBeGreaterThanOrEqual(50);
      }
    });

    it("safety_score <= 100 for all jobs", () => {
      for (const ctx of [fanucFinishingCtx(), siemens5AxisCtx()]) {
        const result = postSelectionEngine.compute(ctx);
        expect(result.estimated_improvement.safety_score).toBeLessThanOrEqual(100);
      }
    });

    it("siemens 5-axis with collision_check + probing: safety_score > 65", () => {
      // safety: collision_check (+15) -> 65; measurement: in_process_probing+auto_comp (+20)
      const result = postSelectionEngine.compute(siemens5AxisCtx());
      expect(result.estimated_improvement.safety_score).toBeGreaterThan(65);
    });
  });

  // ── Adversarial inputs ────────────────────────────────────────────────────
  describe("adversarial inputs", () => {
    it("tolerance_mm=0 gets 4 decimal places (well below 0.01 threshold)", () => {
      const ctx = fanucFinishingCtx();
      ctx.part.tolerance_mm = 0;
      expect(postSelectionEngine.compute(ctx).controller_config.decimal_places).toBe(4);
    });

    it("very large tolerance 100mm gets 3 decimal places", () => {
      const ctx = fanucFinishingCtx();
      ctx.part.tolerance_mm = 100;
      expect(postSelectionEngine.compute(ctx).controller_config.decimal_places).toBe(3);
    });

    it("tool_count=0 on medium-volume K-group haas: tool_break_detect scores 65 (default branch)", () => {
      // tool_count=0 -> not >10 (no 85-score branch), K-group not S/H (no 90-score branch)
      // -> default 65 branch
      const ctx = haasRoughingCtx();
      ctx.tool_count = 0;
      ctx.production_volume = "medium";
      const result = postSelectionEngine.compute(ctx);
      const feature = result.selected_features.find((f) => f.id === "tool_break_detect");
      expect(feature!.score).toBe(65);
    });

    it("tool_count=100 on medium-volume: tool_break_detect scores 85 (>10 branch)", () => {
      const ctx = haasRoughingCtx();
      ctx.tool_count = 100;
      ctx.production_volume = "medium";
      const result = postSelectionEngine.compute(ctx);
      const feature = result.selected_features.find((f) => f.id === "tool_break_detect");
      expect(feature!.score).toBe(85);
    });

    it("heidenhain 5-axis gets singularity_avoidance (only siemens/heidenhain)", () => {
      const ctx = siemens5AxisCtx();
      ctx.machine.controller = "heidenhain";
      const result = postSelectionEngine.compute(ctx);
      expect(result.selected_features.map((f) => f.id)).toContain("singularity_avoidance");
    });

    it("fanuc 5-axis does NOT get singularity_avoidance (only siemens/heidenhain)", () => {
      const ctx = siemens5AxisCtx();
      ctx.machine.controller = "fanuc";
      const result = postSelectionEngine.compute(ctx);
      expect(result.selected_features.map((f) => f.id)).not.toContain("singularity_avoidance");
    });
  });

  // ── adaptive_clearing only for roughing ───────────────────────────────────
  describe("adaptive_clearing restricted to roughing operation_type", () => {
    it("selected for roughing on haas with fusion360 (score 90)", () => {
      const result = postSelectionEngine.compute(haasRoughingCtx());
      const feature = result.selected_features.find((f) => f.id === "adaptive_clearing");
      expect(feature!.score).toBe(90);
    });

    it("NOT selected for finishing op", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(result.selected_features.map((f) => f.id)).not.toContain("adaptive_clearing");
    });

    it("solidcam roughing scores 95 (best-in-class branch)", () => {
      const ctx = haasRoughingCtx();
      ctx.cam_source = "solidcam";
      const result = postSelectionEngine.compute(ctx);
      const feature = result.selected_features.find((f) => f.id === "adaptive_clearing");
      expect(feature!.score).toBe(95);
    });
  });

  // ── ssv_mode controller gate ──────────────────────────────────────────────
  describe("ssv_mode only on haas and okuma", () => {
    it("ssv_mode selected at score 80 when part has thin walls on haas", () => {
      const ctx = haasRoughingCtx();
      ctx.part.has_thin_walls = true;
      const result = postSelectionEngine.compute(ctx);
      const feature = result.selected_features.find((f) => f.id === "ssv_mode");
      expect(feature!.score).toBe(80);
    });

    it("ssv_mode NOT selected on siemens (controller not in [haas, okuma])", () => {
      const ctx = siemens5AxisCtx();
      ctx.part.has_thin_walls = true;
      const result = postSelectionEngine.compute(ctx);
      expect(result.selected_features.map((f) => f.id)).not.toContain("ssv_mode");
    });
  });

  // ── Result shape completeness ─────────────────────────────────────────────
  describe("result object has correct shape and field types", () => {
    it("all top-level keys present with correct types", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      expect(Array.isArray(result.selected_features)).toBe(true);
      expect(Array.isArray(result.rejected_features)).toBe(true);
      expect(Array.isArray(result.feature_interactions)).toBe(true);
      expect(typeof result.controller_config).toBe("object");
      expect(typeof result.estimated_improvement).toBe("object");
      expect(typeof result.confidence).toBe("number");
      expect(typeof result.rationale).toBe("string");
    });

    it("each selected feature score is in [0, 100]", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      for (const f of result.selected_features) {
        expect(f.score).toBeGreaterThanOrEqual(0);
        expect(f.score).toBeLessThanOrEqual(100);
      }
    });

    it("estimated_improvement has four numeric sub-fields", () => {
      const result = postSelectionEngine.compute(fanucFinishingCtx());
      const imp = result.estimated_improvement;
      expect(typeof imp.cycle_time_pct).toBe("number");
      expect(typeof imp.surface_quality_pct).toBe("number");
      expect(typeof imp.tool_life_pct).toBe("number");
      expect(typeof imp.safety_score).toBe("number");
    });

    it("controller_config line_numbers is always true", () => {
      for (const ctx of [fanucFinishingCtx(), siemens5AxisCtx(), haasRoughingCtx()]) {
        const result = postSelectionEngine.compute(ctx);
        expect(result.controller_config.line_numbers).toBe(true);
      }
    });
  });
});
