/**
 * U-WLAUNCH09: LAUNCH GATE — 5-Case End-to-End Smoke Test
 *
 * These 5 cases represent the minimum viable proof that Wire EDM program
 * generation is chargeable. Each must produce a complete, correct result
 * (or a correct error for scope-exceeded inputs).
 *
 * Cases:
 *   1. D2 tool steel, 25.4mm (1") — primary calibration anchor (ITW SHAKEPROOF)
 *   2. D2 tool steel, 50mm (2") — thickness scaling proof
 *   3. 304 stainless steel, 25.4mm — multi-material proof
 *   4. 6061 aluminum, 25.4mm — non-ferrous proof
 *   5. D2 tool steel, 25.4mm, taper 15° — scope guard rejection proof
 *
 * All 5 must pass for LAUNCH-GATE-PASS.md to be written.
 */

import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WEDMProgramInput, WEDMProgramResult } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, LineSegment } from "../engines/DXFGeometryParserEngine.js";

const engine = new WEDMPrintToProgramEngine();

function makeSquareContour(): WireEDMContour {
  const side = 25;
  const segments: LineSegment[] = [
    { type: "line", start: { x: 0, y: 0 }, end: { x: side, y: 0 } },
    { type: "line", start: { x: side, y: 0 }, end: { x: side, y: side } },
    { type: "line", start: { x: side, y: side }, end: { x: 0, y: side } },
    { type: "line", start: { x: 0, y: side }, end: { x: 0, y: 0 } },
  ];
  return {
    id: "square_25mm",
    segments,
    is_closed: true,
    is_exterior: true,
    area_mm2: side * side,
    perimeter_mm: 4 * side,
    bbox: { min_x: 0, min_y: 0, max_x: side, max_y: side },
  };
}

function buildInput(material: string, thickness_mm: number, taper_angle_deg = 0): WEDMProgramInput {
  return {
    contours: [makeSquareContour()],
    material,
    thickness_mm,
    target_ra_um: 0.8,
    controller: "mitsubishi",
    part_name: `Launch Gate — ${material} ${thickness_mm}mm`,
    part_number: `LG-${material}-${thickness_mm}`,
    program_number: 1,
    taper_angle_deg,
  };
}

/** Full validation of a successful program result */
function validateSuccessResult(result: WEDMProgramResult, material: string, thickness_mm: number) {
  // Core success
  expect(result.success).toBe(true);
  expect(result.program_text.length).toBeGreaterThan(50);
  expect(result.line_count).toBeGreaterThan(10);

  // Pass details populated
  expect(result.pass_details.length).toBeGreaterThanOrEqual(3);
  for (const pass of result.pass_details) {
    expect(pass.feed_mm_min).toBeGreaterThan(0);
    expect(pass.offset_mm).toBeGreaterThanOrEqual(0);
    expect(pass.e_pack_code.length).toBeGreaterThan(0);
    expect(pass.wire_speed_m_min).toBeGreaterThan(0);
    expect(pass.tension_N).toBeGreaterThan(0);
  }

  // H-offsets monotonically decrease
  for (let i = 1; i < result.pass_details.length; i++) {
    expect(result.pass_details[i].offset_mm).toBeLessThanOrEqual(result.pass_details[i - 1].offset_mm);
  }

  // Setup sheet populated
  expect(result.setup_sheet.material).toBe(material);
  expect(result.setup_sheet.thickness_mm).toBeCloseTo(thickness_mm, 1);
  expect(result.setup_sheet.num_passes).toBeGreaterThanOrEqual(3);

  // Setup sheet HTML rendered
  expect(result.setup_sheet_html.length).toBeGreaterThan(200);
  expect(result.setup_sheet_html).toContain("<!DOCTYPE html>");
  expect(result.setup_sheet_html).toContain("Per-Pass Parameters");

  // Confidence score present and reasonable
  expect(result.confidence_score.overall).toBeGreaterThanOrEqual(60);

  // Cycle time breakdown present
  expect(result.cycle_time_breakdown.total_time_min).toBeGreaterThan(0);
  expect(result.cycle_time_breakdown.per_pass.length).toBe(result.pass_details.length);

  // Pipeline stages all completed
  expect(result.stages_completed).toContain("scope_guard_passed");
  expect(result.stages_completed).toContain("gcode_generated");
  expect(result.stages_completed).toContain("setup_sheet_html_rendered");
  expect(result.stages_completed).toContain("confidence_scored");

  // G-code starts with % or O (standard NC program header)
  const firstLine = result.program_text.trim().split("\n")[0];
  expect(firstLine.startsWith("%") || firstLine.startsWith("O") || firstLine.startsWith("(")).toBe(true);
}

describe("U-WLAUNCH09: LAUNCH GATE — 5-Case Smoke Test", () => {

  it("Case 1: D2 tool steel, 25.4mm — primary calibration anchor", async () => {
    const result = await engine.generate(buildInput("D2", 25.4));
    validateSuccessResult(result, "D2", 25.4);

    // D2-specific: feed ≈ 3.0 mm/min (Lemhunter), E-pack group 1
    expect(result.pass_details[0].feed_mm_min).toBeGreaterThan(2.0);
    expect(result.pass_details[0].feed_mm_min).toBeLessThan(5.0);
    expect(result.pass_details[0].e_pack_code).toMatch(/^E1/);
    expect(result.confidence_score.overall).toBeGreaterThanOrEqual(75);
  });

  it("Case 2: D2 tool steel, 50mm — thickness scaling proof", async () => {
    const result = await engine.generate(buildInput("D2", 50));
    validateSuccessResult(result, "D2", 50);

    // 50mm feed should be lower than 25.4mm (flushing-limited at thickness)
    const d2_25 = await engine.generate(buildInput("D2", 25.4));
    expect(result.pass_details[0].feed_mm_min).toBeLessThan(d2_25.pass_details[0].feed_mm_min);
    expect(result.confidence_score.overall).toBeGreaterThanOrEqual(70);
  });

  it("Case 3: 304 stainless steel, 25.4mm — multi-material proof", async () => {
    const result = await engine.generate(buildInput("304SS", 25.4));
    validateSuccessResult(result, "304SS", 25.4);

    // SS: E-pack group 2, feed lower than D2
    expect(result.pass_details[0].e_pack_code).toMatch(/^E2/);
    const d2_25 = await engine.generate(buildInput("D2", 25.4));
    expect(result.pass_details[0].feed_mm_min).toBeLessThan(d2_25.pass_details[0].feed_mm_min);
    expect(result.confidence_score.overall).toBeGreaterThanOrEqual(65);
  });

  it("Case 4: 6061 aluminum, 25.4mm — non-ferrous proof", async () => {
    const result = await engine.generate(buildInput("6061", 25.4));
    validateSuccessResult(result, "6061", 25.4);

    // Aluminum: E-pack group 3, feed higher than D2 (high thermal conductivity)
    expect(result.pass_details[0].e_pack_code).toMatch(/^E3/);
    const d2_25 = await engine.generate(buildInput("D2", 25.4));
    expect(result.pass_details[0].feed_mm_min).toBeGreaterThan(d2_25.pass_details[0].feed_mm_min);
    expect(result.confidence_score.overall).toBeGreaterThanOrEqual(65);
  });

  it("Case 5: D2 tool steel, 25.4mm, taper 15° — scope guard rejection", async () => {
    const result = await engine.generate(buildInput("D2", 25.4, 15));

    // Must fail cleanly, not silently compute wrong output
    expect(result.success).toBe(false);
    expect(result.warnings.some(w => w.includes("V1 scope exceeded"))).toBe(true);
    expect(result.warnings.some(w => w.includes("V2"))).toBe(true);
    expect(result.stages_completed).toContain("scope_guard_rejected");

    // Should NOT have generated any G-code
    expect(result.program_text).toBe("");
    expect(result.pass_details.length).toBe(0);
  });

  describe("Performance gate", () => {
    it("all 5 cases complete in < 5 seconds total", async () => {
      const start = Date.now();
      await Promise.all([
        engine.generate(buildInput("D2", 25.4)),
        engine.generate(buildInput("D2", 50)),
        engine.generate(buildInput("304SS", 25.4)),
        engine.generate(buildInput("6061", 25.4)),
        engine.generate(buildInput("D2", 25.4, 15)),
      ]);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  });
});
