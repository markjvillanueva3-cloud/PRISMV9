/**
 * LATHE-UNIFIED M1, U-CALC09
 * Calculator Panel Integration Tests — Threading, Insert Selection, Workholding
 * Tests the backend dispatcher actions that power the calculator panels.
 */

import { describe, it, expect } from "vitest";
import { threadEngine } from "../engines/ThreadCalculationEngine.js";
import { threadGageEngine } from "../engines/ThreadGageEngine.js";
import { singlePointThreadEngine } from "../engines/SinglePointThreadEngine.js";
import { hardTurningDecisionEngine } from "../engines/HardTurningDecisionEngine.js";
import { grooveClassificationEngine } from "../engines/GrooveClassificationEngine.js";

// ═══════════════════════════════════════════════════════════════════════
// Threading Panel Backend (U-CALC01..03)
// ═══════════════════════════════════════════════════════════════════════

describe("Calculator — Threading Panel Backend", () => {
  describe("Thread designation parsing", () => {
    it("parses M10x1.5 with correct pitch diameter", () => {
      const r = threadEngine.parseThreadDesignation("M10x1.5");
      expect(r).not.toBeNull();
      expect(r!.pitch).toBeCloseTo(1.5, 1);
      expect(r!.pitchDiameter).toBeCloseTo(9.026, 1);
    });

    it("parses 1/4-20 UNC", () => {
      const r = threadEngine.parseThreadDesignation("1/4-20 UNC");
      expect(r).not.toBeNull();
      expect(r!.type).toBe("UNC");
    });

    it("parses M6x1 (fine pitch metric)", () => {
      const r = threadEngine.parseThreadDesignation("M6x1");
      expect(r).not.toBeNull();
      expect(r!.nominalDiameter).toBeCloseTo(6, 0);
      expect(r!.pitch).toBeCloseTo(1, 1);
    });

    it("returns null for invalid designation", () => {
      const r = threadEngine.parseThreadDesignation("INVALID");
      // Should either return null or a result with UNKNOWN type
      if (r !== null) {
        expect(r.type).toBe("UNKNOWN");
      }
    });
  });

  describe("Thread gage / 3-wire measurement", () => {
    it("calculates best wire size for M20x2.5", () => {
      const r = threadGageEngine.calculate({
        system: "metric",
        nominal_diameter_mm: 20,
        pitch_mm: 2.5,
        type: "external",
      });
      // Best wire = 0.57735 * P = 0.57735 * 2.5 = 1.443mm
      expect(r.best_wire_size.value).toBeCloseTo(1.443, 2);
      expect(r.measurement_over_wires.value).toBeGreaterThan(0);
    });

    it("calculates go/no-go gage dimensions", () => {
      const r = threadGageEngine.calculate({
        system: "metric",
        nominal_diameter_mm: 10,
        pitch_mm: 1.5,
        type: "external",
        class: "2",
      });
      expect(r.go_gage_pd.value).toBeGreaterThan(0);
      expect(r.nogo_gage_pd.value).toBeGreaterThan(0);
      expect(r.go_gage_pd.value).not.toBe(r.nogo_gage_pd.value);
    });
  });

  describe("Infeed method selection", () => {
    it("selects radial for fine pitch steel", () => {
      const r = singlePointThreadEngine.selectInfeedMethod({
        iso_group: "P", thread_form: "metric", pitch_mm: 1.0,
      });
      expect(r.method).toBe("radial");
      expect(r.spring_passes).toBe(2);
      expect(r.recommended_passes).toBeGreaterThanOrEqual(4);
    });

    it("selects modified flank for medium pitch", () => {
      const r = singlePointThreadEngine.selectInfeedMethod({
        iso_group: "P", thread_form: "metric", pitch_mm: 2.0,
      });
      expect(r.method).toBe("modified_flank");
    });

    it("selects flank for ACME thread", () => {
      const r = singlePointThreadEngine.selectInfeedMethod({
        iso_group: "P", thread_form: "ACME", pitch_mm: 2.0,
      });
      expect(r.method).toBe("flank");
    });

    it("gives 4 spring passes for titanium", () => {
      const r = singlePointThreadEngine.selectInfeedMethod({
        iso_group: "S", thread_form: "metric", pitch_mm: 1.5,
      });
      expect(r.spring_passes).toBe(4);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Insert Selection Panel Backend (U-CALC04..06)
// ═══════════════════════════════════════════════════════════════════════

describe("Calculator — Insert Selection Panel Backend", () => {
  it("selects low-CBN for 60 HRC continuous", () => {
    const r = hardTurningDecisionEngine.analyze({
      workpiece: { hardness_hrc: 60, od_mm: 50 },
      requirements: { target_Ra_um: 0.4, tolerance_mm: 0.01 },
    });
    expect(r.insert_selection?.material).toBe("low_cbn");
    expect(r.insert_selection?.max_doc_mm).toBeGreaterThan(0);
    expect(r.insert_selection?.cutting_speed_m_min).toBeGreaterThan(50);
  });

  it("selects high-CBN for 60 HRC interrupted", () => {
    const r = hardTurningDecisionEngine.analyze({
      workpiece: { hardness_hrc: 60, od_mm: 50, has_interrupted_cut: true },
      requirements: { target_Ra_um: 0.8, tolerance_mm: 0.02 },
    });
    expect(r.insert_selection?.material).toBe("high_cbn");
  });

  it("selects ceramic for 50 HRC", () => {
    const r = hardTurningDecisionEngine.analyze({
      workpiece: { hardness_hrc: 50, od_mm: 40 },
      requirements: { target_Ra_um: 0.8, tolerance_mm: 0.02 },
    });
    expect(r.insert_selection?.material).toContain("ceramic");
  });

  it("enforces DOC <= nose_radius * 0.7", () => {
    const r = hardTurningDecisionEngine.analyze({
      workpiece: { hardness_hrc: 58, od_mm: 30 },
      requirements: { target_Ra_um: 0.4, tolerance_mm: 0.01 },
    });
    const ins = r.insert_selection!;
    expect(ins.max_doc_mm).toBeLessThanOrEqual(ins.nose_radius_mm * 0.7 + 0.01);
  });

  it("selects wiper edge prep for fine finish", () => {
    const r = hardTurningDecisionEngine.analyze({
      workpiece: { hardness_hrc: 58, od_mm: 40 },
      requirements: { target_Ra_um: 0.3, tolerance_mm: 0.01 },
    });
    expect(r.insert_selection?.edge_prep).toBe("wiper");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Workholding Panel Backend (U-CALC07..08)
// ═══════════════════════════════════════════════════════════════════════

describe("Calculator — Workholding Panel Backend", () => {
  it("classifies groove type correctly", () => {
    const r = grooveClassificationEngine.classify({
      type: "o_ring", location: "od", width_mm: 2.5, depth_mm: 1.8,
      diameter_mm: 30,
    });
    expect(r.tool_geometry).toContain("O-ring");
    expect(r.feed_mm_rev).toBeGreaterThan(0);
  });

  it("optimizes parting with correct blade width", () => {
    const r = grooveClassificationEngine.optimizeParting({
      part_diameter_mm: 25, iso_group: "P",
    });
    expect(r.blade_width_mm).toBe(2); // <=25mm → 2mm blade
    expect(r.feed_profile.length).toBeGreaterThan(3);
  });

  it("adds peck for stainless parting", () => {
    const r = grooveClassificationEngine.optimizeParting({
      part_diameter_mm: 40, iso_group: "M",
    });
    expect(r.peck_strategy).toBeDefined();
    expect(r.peck_strategy!.coolant).toBe("high_pressure");
  });

  it("part catcher timing uses correct M-codes per controller", () => {
    const r = grooveClassificationEngine.optimizeParting({
      part_diameter_mm: 30, iso_group: "P",
      has_part_catcher: true, controller: "okuma",
    });
    expect(r.catcher_timing!.m_code_advance).toBe("M71");
    expect(r.catcher_timing!.m_code_retract).toBe("M72");
  });

  it("generates feed reduction profile for parting", () => {
    const r = grooveClassificationEngine.optimizeParting({
      part_diameter_mm: 50, iso_group: "P",
    });
    const first = r.feed_profile[0];
    const last = r.feed_profile[r.feed_profile.length - 1];
    expect(last.feed_mm_rev).toBeLessThan(first.feed_mm_rev);
  });
});
