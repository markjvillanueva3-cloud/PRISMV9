/**
 * U-W100-29: WEDM Setup Sheet Generator Tests
 *
 * Validates that the setup sheet:
 *   - Contains all required sections (header, machine setup, pass table, etc.)
 *   - Per-pass table values match the generated program exactly
 *   - HTML is valid and printable
 *   - Consumables are calculated correctly
 *   - Safety notes are always present
 *   - Handles failed generation gracefully
 */
import { describe, it, expect } from "vitest";
import { generateSetupSheet } from "../engines/WEDMSetupSheetEngine.js";
import type { WEDMProgramResult } from "../engines/WEDMPrintToProgramEngine.js";

// ============================================================================
// TEST FIXTURE: Realistic WEDMProgramResult
// ============================================================================

function makeResult(overrides: Partial<WEDMProgramResult> = {}): WEDMProgramResult {
  const defaults: WEDMProgramResult = {
    success: true,
    program_text: "O1001\nG92 X0 Y0\nG21\n...\nM30\n",
    line_count: 150,
    controller: "mitsubishi",
    profiles_cut: 2,
    passes_per_profile: 4,
    estimated_time_min: 95,
    predicted_ra_um: 0.4,
    predicted_accuracy_mm: 0.005,
    pass_details: [
      { pass_number: 1, type: "rough", offset_mm: 0.1600, feed_mm_min: 4.2, e_pack_code: "E1221", wire_speed_m_min: 12, tension_N: 15, predicted_ra_um: 3.2, predicted_recast_um: 18.5 },
      { pass_number: 2, type: "skim_1", offset_mm: 0.0900, feed_mm_min: 3.0, e_pack_code: "E1222", wire_speed_m_min: 8, tension_N: 12, predicted_ra_um: 1.6, predicted_recast_um: 12.95 },
      { pass_number: 3, type: "skim_2", offset_mm: 0.0650, feed_mm_min: 2.5, e_pack_code: "E1223", wire_speed_m_min: 6, tension_N: 10, predicted_ra_um: 0.8, predicted_recast_um: 9.07 },
      { pass_number: 4, type: "skim_3", offset_mm: 0.0530, feed_mm_min: 2.0, e_pack_code: "E1224", wire_speed_m_min: 6, tension_N: 10, predicted_ra_um: 0.4, predicted_recast_um: 6.35 },
    ],
    wire_consumption_m: 320,
    setup_sheet: {
      part_name: "Punch Die Insert",
      part_number: "PD-2024-001",
      material: "D2",
      thickness_mm: 25.4,
      wire_type: "brass_0.25",
      wire_diameter_mm: 0.25,
      controller: "mitsubishi",
      program_number: 1001,
      num_profiles: 2,
      num_passes: 4,
      total_time_min: 95,
      wire_needed_m: 320,
      flush_pressure_bar: 5,
      submerged: true,
      notes: ["4-pass strategy for Ra 0.4µm target"],
    },
    geometry_summary: {
      num_contours: 3,
      num_selected: 2,
      total_perimeter_mm: 245.8,
      contour_details: [
        { id: "c0", is_exterior: true, perimeter_mm: 180.2, area_mm2: 2500, segment_count: 12, has_arcs: true },
        { id: "c1", is_exterior: false, perimeter_mm: 65.6, area_mm2: 340, segment_count: 8, has_arcs: false },
      ],
    },
    warnings: ["Wire deflection >5µm at 100mm sections"],
    stages_completed: ["geometry_parsed", "features_classified", "multi_pass_planned", "gcode_generated", "cycle_time_estimated", "backplot_generated", "confidence_scored"],
    cycle_time_breakdown: {
      total_time_min: 95,
      per_pass: [
        { pass_number: 1, pass_type: "rough", path_length_mm: 491.6, feed_mm_min: 4.2, cutting_time_min: 58.5 },
        { pass_number: 2, pass_type: "skim_1", path_length_mm: 491.6, feed_mm_min: 3.0, cutting_time_min: 8.19 },
        { pass_number: 3, pass_type: "skim_2", path_length_mm: 491.6, feed_mm_min: 2.5, cutting_time_min: 9.83 },
        { pass_number: 4, pass_type: "skim_3", path_length_mm: 491.6, feed_mm_min: 2.0, cutting_time_min: 12.29 },
      ],
      cutting_time_min: 88.81,
      threading_time_min: 3.0,
      dwell_time_min: 0.5,
      rapid_time_min: 0.2,
      aux_time_min: 2.5,
      summary: "Total 95.0 min — Cutting: 88.8, Threading: 3.0, Dwell: 0.5, Rapid: 0.2, Aux: 2.5",
    },
    confidence_score: {
      pulse: { score: 95, reason: "Published pulse data for D2" },
      offset: { score: 90, reason: "DiBitonto crater model — valid and monotonic" },
      feed: { score: 100, reason: "Published feed rate for D2 25.4mm" },
      epack: { score: 85, reason: "All 4 passes have valid E-pack codes" },
      geometry: { score: 95, reason: "DXF clean, 2 contours, arcs preserved" },
      overall: 91,
      summary: "High confidence — published data for D2 at 25.4mm thickness",
    },
  };
  return { ...defaults, ...overrides };
}

// ============================================================================
// TESTS
// ============================================================================

describe("U-W100-29: WEDM Setup Sheet Generator", () => {

  describe("Basic generation", () => {
    it("generates a setup sheet from a valid program result", () => {
      const result = generateSetupSheet(makeResult());
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.html.length).toBeGreaterThan(500);
    });

    it("returns failure for a failed program result", () => {
      const result = generateSetupSheet(makeResult({ success: false }));
      expect(result.success).toBe(false);
      expect(result.html).toContain("failed");
    });
  });

  describe("Header section", () => {
    it("contains all header fields from the program", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.header.part_name).toBe("Punch Die Insert");
      expect(data.header.part_number).toBe("PD-2024-001");
      expect(data.header.material).toBe("D2");
      expect(data.header.thickness_mm).toBe(25.4);
      expect(data.header.wire_type).toBe("brass_0.25");
      expect(data.header.wire_diameter_mm).toBe(0.25);
      expect(data.header.controller).toBe("mitsubishi");
      expect(data.header.program_number).toBe(1001);
    });

    it("includes hardness from parameter", () => {
      const { data } = generateSetupSheet(makeResult(), 62);
      expect(data.header.hardness_hrc).toBe(62);
    });

    it("includes generation date", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.header.date_generated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("Machine setup section", () => {
    it("has correct flush pressure and submerged mode", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.machine_setup.flush_pressure_bar).toBe(5);
      expect(data.machine_setup.submerged).toBe(true);
    });

    it("calculates start hole diameter from wire diameter", () => {
      const { data } = generateSetupSheet(makeResult());
      // wire 0.25mm + 0.5mm = 0.75mm
      expect(data.machine_setup.start_hole_diameter_mm).toBe(0.75);
    });

    it("shows tank level for submerged mode", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.machine_setup.tank_level).toContain("above table");
    });

    it("shows spray flushing for non-submerged mode", () => {
      const r = makeResult();
      r.setup_sheet.submerged = false;
      const { data } = generateSetupSheet(r);
      expect(data.machine_setup.tank_level).toContain("Spray");
    });
  });

  describe("Per-pass table", () => {
    it("has one row per pass", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.pass_table.length).toBe(4);
    });

    it("pass table values match program pass_details exactly", () => {
      const r = makeResult();
      const { data } = generateSetupSheet(r);
      for (let i = 0; i < r.pass_details.length; i++) {
        const src = r.pass_details[i];
        const row = data.pass_table[i];
        expect(row.pass_number).toBe(src.pass_number);
        expect(row.pass_type).toBe(src.type);
        expect(row.e_pack_code).toBe(src.e_pack_code);
        expect(row.feed_mm_min).toBeCloseTo(src.feed_mm_min, 1);
        expect(row.predicted_ra_um).toBeCloseTo(src.predicted_ra_um, 1);
        expect(row.predicted_recast_um).toBeCloseTo(src.predicted_recast_um, 1);
      }
    });

    it("offsets are monotonically decreasing", () => {
      const { data } = generateSetupSheet(makeResult());
      for (let i = 1; i < data.pass_table.length; i++) {
        expect(data.pass_table[i].offset_mm).toBeLessThan(data.pass_table[i - 1].offset_mm);
      }
    });

    it("Ra is monotonically decreasing across passes", () => {
      const { data } = generateSetupSheet(makeResult());
      for (let i = 1; i < data.pass_table.length; i++) {
        expect(data.pass_table[i].predicted_ra_um).toBeLessThan(data.pass_table[i - 1].predicted_ra_um);
      }
    });

    it("recast is monotonically decreasing across passes", () => {
      const { data } = generateSetupSheet(makeResult());
      for (let i = 1; i < data.pass_table.length; i++) {
        expect(data.pass_table[i].predicted_recast_um).toBeLessThan(data.pass_table[i - 1].predicted_recast_um);
      }
    });
  });

  describe("Cycle time", () => {
    it("total matches program cycle time", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.cycle_time.total_min).toBe(95);
    });

    it("cutting + non-cutting = total", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.cycle_time.cutting_min + data.cycle_time.non_cutting_min).toBeCloseTo(data.cycle_time.total_min, 1);
    });

    it("per-pass breakdown matches pass count", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.cycle_time.per_pass.length).toBe(4);
    });
  });

  describe("Consumables", () => {
    it("wire consumption matches program", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.consumables.wire_needed_m).toBe(320);
    });

    it("wire weight is calculated from diameter", () => {
      const { data } = generateSetupSheet(makeResult());
      // 320m × 0.000417 kg/m ≈ 0.13 kg
      expect(data.consumables.wire_needed_kg).toBeGreaterThan(0);
      expect(data.consumables.wire_needed_kg).toBeLessThan(1);
    });

    it("spool percentage is calculated", () => {
      const { data } = generateSetupSheet(makeResult());
      // 320 / 8000 = 4%
      expect(data.consumables.wire_spool_pct).toBe(4);
    });

    it("filter and guide checks are flagged", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.consumables.filter_check).toBe(true);
      expect(data.consumables.guide_check).toBe(true);
    });
  });

  describe("Safety notes", () => {
    it("always includes standard safety notes", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.safety_notes.length).toBeGreaterThanOrEqual(7);
      expect(data.safety_notes.some(n => n.includes("interlock"))).toBe(true);
      expect(data.safety_notes.some(n => n.includes("water level"))).toBe(true);
      expect(data.safety_notes.some(n => n.includes("fire suppression"))).toBe(true);
    });

    it("adds thick section warning for >100mm", () => {
      const r = makeResult();
      r.setup_sheet.thickness_mm = 120;
      const { data } = generateSetupSheet(r);
      expect(data.safety_notes.some(n => n.includes("Thick section"))).toBe(true);
    });

    it("adds high flush pressure warning", () => {
      const r = makeResult();
      r.setup_sheet.flush_pressure_bar = 10;
      const { data } = generateSetupSheet(r);
      expect(data.safety_notes.some(n => n.includes("High flush pressure"))).toBe(true);
    });
  });

  describe("Confidence", () => {
    it("includes overall confidence score", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.confidence.overall).toBe(91);
    });

    it("includes confidence summary", () => {
      const { data } = generateSetupSheet(makeResult());
      expect(data.confidence.summary.length).toBeGreaterThan(10);
    });
  });

  describe("HTML output", () => {
    it("is valid HTML with doctype", () => {
      const { html } = generateSetupSheet(makeResult());
      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain("</html>");
    });

    it("contains the part name in the title", () => {
      const { html } = generateSetupSheet(makeResult());
      expect(html).toContain("Punch Die Insert");
    });

    it("contains per-pass table with E-pack codes", () => {
      const { html } = generateSetupSheet(makeResult());
      expect(html).toContain("E1221");
      expect(html).toContain("E1222");
      expect(html).toContain("E1223");
      expect(html).toContain("E1224");
    });

    it("contains cycle time section", () => {
      const { html } = generateSetupSheet(makeResult());
      expect(html).toContain("Cycle Time");
      expect(html).toContain("95");
    });

    it("contains consumables section", () => {
      const { html } = generateSetupSheet(makeResult());
      expect(html).toContain("Consumables");
      expect(html).toContain("320");
    });

    it("contains safety notes", () => {
      const { html } = generateSetupSheet(makeResult());
      expect(html).toContain("Safety Notes");
      expect(html).toContain("interlock");
    });

    it("contains print-friendly CSS", () => {
      const { html } = generateSetupSheet(makeResult());
      expect(html).toContain("@media print");
    });

    it("escapes HTML in part names", () => {
      const r = makeResult();
      r.setup_sheet.part_name = '<script>alert("xss")</script>';
      const { html } = generateSetupSheet(r);
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("shows warnings section when warnings exist", () => {
      const { html } = generateSetupSheet(makeResult());
      expect(html).toContain("Warnings");
      expect(html).toContain("Wire deflection");
    });

    it("omits warnings section when no warnings", () => {
      const r = makeResult();
      r.warnings = [];
      const { html } = generateSetupSheet(r);
      expect(html).not.toContain("Warnings");
    });
  });
});
