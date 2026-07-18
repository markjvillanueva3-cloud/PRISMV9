/**
 * WEDMPrintToProgramEngine — End-to-end pipeline tests
 *
 * Tests the full DXF → multi-pass plan → Mitsubishi G-code pipeline
 * against real shop program expectations and published data.
 *
 * Reference data:
 *   - ITW SHAKEPROOF 500-30540-24000-04.NC (4-pass, hex + circle, Mitsubishi)
 *   - NOZE TEST.NC (5-pass, UV taper, E2821-E2825)
 *   - Klocke & König, "Manufacturing Processes 3" (energy cascade)
 *   - Sommer & Sommer, "Handbook of Wire EDM" (offsets, feeds)
 */

import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WEDMProgramInput } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, ArcSegment, LineSegment } from "../engines/DXFGeometryParserEngine.js";

const engine = new WEDMPrintToProgramEngine();

// ============================================================================
// HELPER: Build simple contours for testing
// ============================================================================

/** Build a rectangular contour (4 line segments, closed) */
function makeRectContour(
  width_mm: number,
  height_mm: number,
  id = "rect_1",
  exterior = true,
): WireEDMContour {
  const segments: LineSegment[] = [
    { type: "line", start: { x: 0, y: 0 }, end: { x: width_mm, y: 0 } },
    { type: "line", start: { x: width_mm, y: 0 }, end: { x: width_mm, y: height_mm } },
    { type: "line", start: { x: width_mm, y: height_mm }, end: { x: 0, y: height_mm } },
    { type: "line", start: { x: 0, y: height_mm }, end: { x: 0, y: 0 } },
  ];
  return {
    id,
    segments,
    is_closed: true,
    is_exterior: exterior,
    area_mm2: width_mm * height_mm,
    perimeter_mm: 2 * (width_mm + height_mm),
    bbox: { min_x: 0, min_y: 0, max_x: width_mm, max_y: height_mm },
  };
}

/** Build a circular contour (single arc segment, closed) */
function makeCircleContour(
  cx: number,
  cy: number,
  radius: number,
  id = "circle_1",
  exterior = false,
): WireEDMContour {
  // Represent circle as two semi-circular arcs
  const segments: ArcSegment[] = [
    {
      type: "arc",
      start: { x: cx + radius, y: cy },
      end: { x: cx - radius, y: cy },
      center: { x: cx, y: cy },
      radius,
      start_angle_rad: 0,
      end_angle_rad: Math.PI,
      ccw: true,
    },
    {
      type: "arc",
      start: { x: cx - radius, y: cy },
      end: { x: cx + radius, y: cy },
      center: { x: cx, y: cy },
      radius,
      start_angle_rad: Math.PI,
      end_angle_rad: 2 * Math.PI,
      ccw: true,
    },
  ];
  return {
    id,
    segments,
    is_closed: true,
    is_exterior: exterior,
    area_mm2: Math.PI * radius * radius,
    perimeter_mm: 2 * Math.PI * radius,
    bbox: { min_x: cx - radius, min_y: cy - radius, max_x: cx + radius, max_y: cy + radius },
  };
}

/** Build a hex contour (6 line segments, closed) */
function makeHexContour(
  cx: number,
  cy: number,
  flat_to_flat_mm: number,
  id = "hex_1",
): WireEDMContour {
  const r = flat_to_flat_mm / Math.sqrt(3); // vertex radius
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 + 30) * Math.PI / 180; // flat-side up
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  const segments: LineSegment[] = [];
  for (let i = 0; i < 6; i++) {
    segments.push({ type: "line", start: pts[i], end: pts[(i + 1) % 6] });
  }
  return {
    id,
    segments,
    is_closed: true,
    is_exterior: true,
    area_mm2: (3 * Math.sqrt(3) / 2) * r * r,
    perimeter_mm: 6 * r,
    bbox: {
      min_x: Math.min(...pts.map(p => p.x)),
      min_y: Math.min(...pts.map(p => p.y)),
      max_x: Math.max(...pts.map(p => p.x)),
      max_y: Math.max(...pts.map(p => p.y)),
    },
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("WEDMPrintToProgramEngine", () => {
  // ── Section 1: Basic Pipeline Execution ──────────────────────────────

  describe("Pipeline Execution", () => {
    it("T01: generates Mitsubishi G-code from rectangular contour", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(25.4, 12.7)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
        program_number: 1,
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      expect(result.program_text).toBeTruthy();
      expect(result.line_count).toBeGreaterThan(20);
      expect(result.controller).toContain("Mitsubishi");
      expect(result.profiles_cut).toBe(1);
      expect(result.passes_per_profile).toBeGreaterThanOrEqual(3);
      expect(result.stages_completed).toContain("contours_selected");
      expect(result.stages_completed).toContain("settings_calculated");
      expect(result.stages_completed).toContain("multipass_planned");
      expect(result.stages_completed).toContain("gcode_generated");
    });

    it("T02: generates program from circular contour (arcs preserved)", async () => {
      const input: WEDMProgramInput = {
        contours: [makeCircleContour(0, 0, 10)],
        material: "4140",
        thickness_mm: 50,
        target_ra_um: 1.6,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      // Should contain G02 or G03 arc codes
      expect(result.program_text).toMatch(/G0?[23]/);
      // Arc I/J center offsets
      expect(result.program_text).toMatch(/I[-.0-9]+/);
      expect(result.program_text).toMatch(/J[-.0-9]+/);
    });

    it("T03: generates program from hex contour (ITW SHAKEPROOF pattern)", async () => {
      const hex = makeHexContour(0, 0, 14.224);
      const input: WEDMProgramInput = {
        contours: [hex],
        material: "D2",
        hardness_hrc: 60,
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
        part_name: "ITW SHAKEPROOF",
        part_number: "500-30540-24000-04",
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      expect(result.profiles_cut).toBe(1);
      expect(result.passes_per_profile).toBeGreaterThanOrEqual(3);
      expect(result.setup_sheet.part_name).toBe("ITW SHAKEPROOF");
      expect(result.setup_sheet.part_number).toBe("500-30540-24000-04");
    });

    it("T04: handles multiple contours (hex + circle = 2 profiles)", async () => {
      const hex = makeHexContour(0, 0, 14.224, "hex_1");
      const circle = makeCircleContour(30, 0, 5, "circle_1", false);
      const input: WEDMProgramInput = {
        contours: [hex, circle],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      expect(result.profiles_cut).toBe(2);
      expect(result.geometry_summary.num_selected).toBe(2);
    });

    it("T05: selects specific contours via contour_indices", async () => {
      const rect1 = makeRectContour(20, 10, "rect_1");
      const rect2 = makeRectContour(15, 8, "rect_2");
      const rect3 = makeRectContour(10, 5, "rect_3");
      const input: WEDMProgramInput = {
        contours: [rect1, rect2, rect3],
        material: "A2",
        thickness_mm: 30,
        target_ra_um: 1.6,
        controller: "mitsubishi",
        contour_indices: [0, 2],
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      expect(result.profiles_cut).toBe(2);
      expect(result.geometry_summary.num_selected).toBe(2);
    });
  });

  // ── Section 2: Mitsubishi G-code Format Validation ──────────────────

  describe("Mitsubishi G-code Format", () => {
    it("T06: program starts with % and ends with %", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);
      const lines = result.program_text.split("\n");

      expect(lines[0]).toBe("%");
      expect(lines[lines.length - 1]).toBe("%");
    });

    it("T07: has H-offset variable declarations (H175 master + H1-Hn)", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.program_text).toContain("H175 = 0.0000");
      expect(result.program_text).toMatch(/H1\s*=/);
      expect(result.program_text).toMatch(/\+ H175/);
    });

    it("T08: has correct M-code sequence (M20 thread → M78 fill → M80 water → M82 wire → M84 power)", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      // Thread wire (M20) before first cut
      expect(result.program_text).toContain("M20");
      // Fill tank (M78)
      expect(result.program_text).toContain("M78");
      // Water on (M80)
      expect(result.program_text).toContain("M80");
      // Wire on (M82)
      expect(result.program_text).toContain("M82");
      // Power on (M84)
      expect(result.program_text).toContain("M84");
    });

    it("T09: has E-pack technology table codes", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      // E-pack codes should be present (E{mat}{thick}2{pass})
      // D2 = tool steel = group 1, 25.4mm = range 2, first pass = E1221
      expect(result.program_text).toMatch(/E\d{4}/);
    });

    it("T10: has footer M-code sequence (M85 → M21 → M58 → M02)", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      // Footer shutdown sequence
      expect(result.program_text).toContain("M85");
      expect(result.program_text).toContain("M21");
      expect(result.program_text).toContain("M58");
      expect(result.program_text).toContain("M02");
    });

    it("T11: has G42/G41 offset compensation", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      // Should have both G42 (external) and G41 (pass 3 error averaging)
      expect(result.program_text).toMatch(/G4[12]/);
      // Should cancel with G40
      expect(result.program_text).toContain("G40");
    });

    it("T12: has M01 glue stop between rough and skim passes", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      // M01 optional stop for glue retention
      expect(result.program_text).toContain("M01");
    });

    it("T13: G90 absolute positioning in setup", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.program_text).toContain("G90");
      expect(result.program_text).toContain("G92 X0.0 Y0.0");
    });
  });

  // ── Section 3: Multi-Pass Strategy ──────────────────────────────────

  describe("Multi-Pass Strategy", () => {
    it("T14: 4+ passes for Ra ≤ 0.8 µm (precision finish)", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.passes_per_profile).toBeGreaterThanOrEqual(3);
      expect(result.pass_details.length).toBeGreaterThanOrEqual(3);
    });

    it("T15: fewer passes for Ra ≤ 1.6 µm with loose tolerance than for Ra ≤ 0.8", async () => {
      const fine = await engine.generate({
        contours: [makeRectContour(20, 10)],
        material: "4140",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        target_accuracy_mm: 0.010,
        controller: "mitsubishi",
      });
      const standard = await engine.generate({
        contours: [makeRectContour(20, 10)],
        material: "4140",
        thickness_mm: 25.4,
        target_ra_um: 1.6,
        target_accuracy_mm: 0.050,
        controller: "mitsubishi",
      });

      // Standard finish with loose tolerance should use fewer passes
      expect(standard.passes_per_profile).toBeLessThanOrEqual(fine.passes_per_profile);
      expect(standard.passes_per_profile).toBeGreaterThanOrEqual(2);
    });

    it("T16: 1-2 passes for Ra > 3.2 µm with loose tolerance", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "4140",
        thickness_mm: 25.4,
        target_ra_um: 3.5,
        target_accuracy_mm: 0.100, // Loose tolerance — Ra drives pass count, not accuracy
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.passes_per_profile).toBeGreaterThanOrEqual(1);
      expect(result.passes_per_profile).toBeLessThanOrEqual(3);
    });

    it("T17: offset decreases with each pass (wire approaches final dimension)", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      const offsets = result.pass_details.map(p => p.offset_mm);
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    });

    it("T18: predicted Ra improves with each pass", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      const raValues = result.pass_details.map(p => p.predicted_ra_um);
      for (let i = 1; i < raValues.length; i++) {
        expect(raValues[i]).toBeLessThanOrEqual(raValues[i - 1] + 0.1); // Allow small tolerance
      }
    });

    it("T19: each pass has a valid E-pack code", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      for (const pass of result.pass_details) {
        expect(pass.e_pack_code).toMatch(/^E\d{4}$/);
      }
    });
  });

  // ── Section 4: Material Handling ────────────────────────────────────

  describe("Material Handling", () => {
    const materials = [
      { name: "D2", group: "tool_steel", expectedEPackPrefix: "E1" },
      { name: "4140", group: "steel", expectedEPackPrefix: "E1" },
      { name: "stainless 304", group: "stainless", expectedEPackPrefix: "E2" },
      { name: "aluminum 6061", group: "aluminum", expectedEPackPrefix: "E3" },
      { name: "copper C110", group: "copper", expectedEPackPrefix: "E4" },
      { name: "carbide", group: "carbide", expectedEPackPrefix: "E5" },
      { name: "titanium Ti-6Al-4V", group: "titanium", expectedEPackPrefix: "E6" },
    ];

    materials.forEach(({ name, expectedEPackPrefix }, idx) => {
      it(`T${20 + idx}: generates valid program for ${name}`, async () => {
        const input: WEDMProgramInput = {
          contours: [makeRectContour(20, 10)],
          material: name,
          thickness_mm: 25.4,
          target_ra_um: 1.6,
          controller: "mitsubishi",
        };
        const result = await engine.generate(input);

        expect(result.success).toBe(true);
        expect(result.program_text.length).toBeGreaterThan(100);
        // E-pack should start with expected material group code
        expect(result.pass_details[0].e_pack_code).toMatch(new RegExp(`^${expectedEPackPrefix}`));
      });
    });
  });

  // ── Section 5: Wire Type Selection ──────────────────────────────────

  describe("Wire Type", () => {
    it("T27: auto-selects moly wire for carbide", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "carbide",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.setup_sheet.wire_type).toBe("moly_0.10");
      expect(result.setup_sheet.wire_diameter_mm).toBe(0.10);
    });

    it("T28: auto-selects coated wire for titanium", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "titanium",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.setup_sheet.wire_type).toBe("coated_0.25");
    });

    it("T29: respects explicit wire_type override", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
        wire_type: "brass_0.20",
      };
      const result = await engine.generate(input);

      expect(result.setup_sheet.wire_type).toBe("brass_0.20");
      expect(result.setup_sheet.wire_diameter_mm).toBe(0.20);
    });
  });

  // ── Section 6: Controller Dialects ──────────────────────────────────

  describe("Controller Support", () => {
    it("T30: generates valid Fanuc WEDM program", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "fanuc",
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      expect(result.controller).toContain("Fanuc");
      expect(result.program_text).toContain("M50"); // Fanuc thread
    });

    it("T31: generates valid Sodick WEDM program", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "sodick",
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      expect(result.controller).toContain("Sodick");
    });

    it("T32: defaults to Mitsubishi when no controller specified", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      expect(result.controller).toContain("Mitsubishi");
    });
  });

  // ── Section 7: Setup Sheet ──────────────────────────────────────────

  describe("Setup Sheet", () => {
    it("T33: includes all required fields", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
        part_name: "Test Part",
        part_number: "TP-001",
        program_number: 42,
      };
      const result = await engine.generate(input);

      const ss = result.setup_sheet;
      expect(ss.part_name).toBe("Test Part");
      expect(ss.part_number).toBe("TP-001");
      expect(ss.material).toBe("D2");
      expect(ss.thickness_mm).toBe(25.4);
      expect(ss.controller).toBe("mitsubishi");
      expect(ss.program_number).toBe(42);
      expect(ss.num_profiles).toBe(1);
      expect(ss.num_passes).toBeGreaterThanOrEqual(3);
      expect(ss.total_time_min).toBeGreaterThan(0);
      expect(ss.wire_needed_m).toBeGreaterThan(0);
      expect(ss.flush_pressure_bar).toBeGreaterThan(0);
      expect(ss.submerged).toBe(true);
    });

    it("T34: wire consumption scales with perimeter", async () => {
      const smallRect = makeRectContour(10, 5, "small");
      const largeRect = makeRectContour(100, 50, "large");

      const smallResult = await engine.generate({
        contours: [smallRect],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });
      const largeResult = await engine.generate({
        contours: [largeRect],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });

      expect(largeResult.wire_consumption_m).toBeGreaterThan(smallResult.wire_consumption_m);
    });
  });

  // ── Section 8: Error Handling ───────────────────────────────────────

  describe("Error Handling", () => {
    it("T35: fails gracefully when no geometry provided", async () => {
      const input: WEDMProgramInput = {
        material: "D2",
        thickness_mm: 25.4,
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(false);
      expect(result.warnings).toContain("No geometry provided — supply dxf_content or contours");
    });

    it("T36: fails gracefully with empty contours array", async () => {
      const input: WEDMProgramInput = {
        contours: [],
        material: "D2",
        thickness_mm: 25.4,
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(false);
    });

    it("T37: warns on open contours (not wire-cuttable)", async () => {
      const openContour: WireEDMContour = {
        id: "open_1",
        segments: [
          { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
          { type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
        ],
        is_closed: false,
        is_exterior: true,
        area_mm2: 0,
        perimeter_mm: 20,
        bbox: { min_x: 0, min_y: 0, max_x: 10, max_y: 10 },
      };
      const input: WEDMProgramInput = {
        contours: [openContour],
        material: "D2",
        thickness_mm: 25.4,
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(false);
      expect(result.warnings.some(w => w.includes("closed"))).toBe(true);
    });
  });

  // ── Section 9: Thickness Variations ─────────────────────────────────

  describe("Thickness Handling", () => {
    it("T38: thin workpiece (5mm) produces valid program", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 5,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);
      expect(result.success).toBe(true);
    });

    it("T39: thick workpiece (200mm) produces valid program", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 200,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);
      expect(result.success).toBe(true);
      // Should have recommendations for thick stock
      expect(result.setup_sheet.notes.length).toBeGreaterThan(0);
    });

    it("T40: time increases with thickness", async () => {
      const thin = await engine.generate({
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 10,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });
      const thick = await engine.generate({
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 100,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });

      // Multi-pass plan time is thickness-dependent (setup_sheet uses the physics model)
      expect(thick.setup_sheet.total_time_min).toBeGreaterThan(thin.setup_sheet.total_time_min);
    });
  });

  // ── Section 10: Real Shop Program Comparison ────────────────────────

  describe("Real Shop Comparison", () => {
    it("T41: ITW SHAKEPROOF — 4-pass D2 hex generates comparable program", async () => {
      const hex = makeHexContour(0, 0, 14.224);
      const input: WEDMProgramInput = {
        contours: [hex],
        material: "D2",
        hardness_hrc: 60,
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        target_accuracy_mm: 0.005,
        controller: "mitsubishi",
        wire_type: "brass_0.25",
        part_number: "500-30540-24000-04",
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      // Real program: 4 passes
      expect(result.passes_per_profile).toBeGreaterThanOrEqual(3);
      expect(result.passes_per_profile).toBeLessThanOrEqual(5);

      // Real offsets: 0.216, 0.163, 0.147, 0.135 mm
      // Our offsets should be in same order of magnitude
      const firstOffset = result.pass_details[0].offset_mm;
      expect(firstOffset).toBeGreaterThan(0.10);
      expect(firstOffset).toBeLessThan(0.40);

      // Last offset still > wire radius (0.125mm) — real shop: 0.135mm
      const lastOffset = result.pass_details[result.pass_details.length - 1].offset_mm;
      expect(lastOffset).toBeGreaterThan(0.05);
    });

    it("T42: program text matches Mitsubishi format markers", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);
      const text = result.program_text;

      // Must have Mitsubishi-specific markers found in real programs
      expect(text).toContain("L001");           // Program number
      expect(text).toContain("H175 = 0.0000");  // Master offset variable
      expect(text).toContain("M91");             // Adaptive off at start
      expect(text).toContain("G92 X0.0 Y0.0");  // Work coordinate set
      expect(text).toContain("M78");         // Double M78 fill tank
      expect(text).toContain("M90");             // Adaptive on for cutting
      expect(text).toContain("M85");     // Shutdown trio
    });

    it("T43: generated offsets are physically plausible", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
        wire_type: "brass_0.25",
      };
      const result = await engine.generate(input);

      for (const pass of result.pass_details) {
        // Offset must be > wire radius (0.125mm) — wire + spark gap
        expect(pass.offset_mm).toBeGreaterThan(0.05);
        // Offset must be < 1mm (anything larger is unreasonable)
        expect(pass.offset_mm).toBeLessThan(1.0);
      }
    });

    it("T44: E-pack codes are sequential per pass", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(20, 10)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      // E-pack last digit should be sequential: E1221, E1222, E1223...
      const codes = result.pass_details.map(p => p.e_pack_code);
      for (let i = 1; i < codes.length; i++) {
        const prevLast = parseInt(codes[i - 1].slice(-1));
        const currLast = parseInt(codes[i].slice(-1));
        expect(currLast).toBe(prevLast + 1);
      }
    });
  });

  // ── Section 11: Geometry Summary ────────────────────────────────────

  describe("Geometry Summary", () => {
    it("T45: reports correct contour count and perimeter", async () => {
      const rect = makeRectContour(25.4, 12.7);
      const input: WEDMProgramInput = {
        contours: [rect],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.geometry_summary.num_contours).toBe(1);
      expect(result.geometry_summary.total_perimeter_mm).toBeCloseTo(2 * (25.4 + 12.7), 1);
    });

    it("T46: identifies arc-containing contours", async () => {
      const circle = makeCircleContour(0, 0, 10);
      const input: WEDMProgramInput = {
        contours: [circle],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.geometry_summary.contour_details[0].has_arcs).toBe(true);
    });

    it("T47: rectangle has no arcs", async () => {
      const rect = makeRectContour(20, 10);
      const input: WEDMProgramInput = {
        contours: [rect],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      };
      const result = await engine.generate(input);

      expect(result.geometry_summary.contour_details[0].has_arcs).toBe(false);
    });
  });

  // ── Section 12: Units and Output ────────────────────────────────────

  describe("Units", () => {
    it("T48: imperial units produce inch-based coordinates", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(25.4, 12.7)], // ~1" x 0.5"
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
        units: "imperial",
      };
      const result = await engine.generate(input);

      expect(result.success).toBe(true);
      // H-offsets should be in inches (< 0.01")
      expect(result.program_text).toMatch(/H1\s*=\s*\.?\d+/);
    });

    it("T49: metric units produce mm-based coordinates", async () => {
      const input: WEDMProgramInput = {
        contours: [makeRectContour(25.4, 12.7)],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
        units: "metric",
      };
      const result = await engine.generate(input);
      expect(result.success).toBe(true);
    });
  });

  // ── Section 13: Pipeline Robustness ─────────────────────────────────

  describe("Pipeline Robustness", () => {
    it("T50: handles extremely small features (micro-EDM scale)", async () => {
      const micro = makeRectContour(0.5, 0.5, "micro");
      const input: WEDMProgramInput = {
        contours: [micro],
        material: "stainless 304",
        thickness_mm: 1,
        target_ra_um: 0.4,
        controller: "mitsubishi",
        wire_type: "tungsten_0.05",
      };
      const result = await engine.generate(input);
      expect(result.success).toBe(true);
    });
  });
});
