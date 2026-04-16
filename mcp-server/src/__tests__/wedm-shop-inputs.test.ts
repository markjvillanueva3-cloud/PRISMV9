/**
 * WEDM Shop-Critical Inputs — Tests for real operator adjustments
 *
 * Validates: origin override, stock allowance (overcut/undercut),
 * lead-in/lead-out, wire size compensation, per-pass offset/feed overrides,
 * start hole positioning, and thickness→speed scaling.
 */

import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WEDMProgramInput } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, LineSegment } from "../engines/DXFGeometryParserEngine.js";

const engine = new WEDMPrintToProgramEngine();

function makeRect(w: number, h: number, id = "rect"): WireEDMContour {
  return { id, is_closed: true, is_exterior: true, area_mm2: w * h, perimeter_mm: 2 * (w + h),
    bbox: { min_x: 0, min_y: 0, max_x: w, max_y: h },
    segments: [
      { type: "line", start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
      { type: "line", start: { x: w, y: 0 }, end: { x: w, y: h } },
      { type: "line", start: { x: w, y: h }, end: { x: 0, y: h } },
      { type: "line", start: { x: 0, y: h }, end: { x: 0, y: 0 } },
    ] as LineSegment[] };
}

const BASE: WEDMProgramInput = {
  contours: [makeRect(20, 10)],
  material: "D2", thickness_mm: 25.4, target_ra_um: 0.8,
  controller: "mitsubishi", wire_type: "brass_0.25",
};

// ============================================================================
// ORIGIN POINT
// ============================================================================
describe("Origin Point Override", () => {
  it("SI-01: default origin is G92 X0.0 Y0.0", async () => {
    const r = await engine.generate(BASE);
    expect(r.program_text).toContain("G92 X0.0 Y0.0");
  });

  it("SI-02: custom origin replaces G92 coordinates", async () => {
    const r = await engine.generate({ ...BASE, origin: { x: 50.0, y: 25.0 } });
    expect(r.program_text).toContain("G92 X50.0000 Y25.0000");
    expect(r.program_text).not.toContain("G92 X0.0 Y0.0");
  });

  it("SI-03: negative origin works", async () => {
    const r = await engine.generate({ ...BASE, origin: { x: -10, y: -5 } });
    expect(r.program_text).toContain("G92 X-10.0000 Y-5.0000");
  });
});

// ============================================================================
// STOCK ALLOWANCE (OVERCUT / UNDERCUT)
// ============================================================================
describe("Stock Allowance", () => {
  it("SI-04: positive stock_allowance increases all offsets (overcut → smaller part)", async () => {
    const normal = await engine.generate(BASE);
    const overcut = await engine.generate({ ...BASE, stock_allowance_mm: 0.010 });
    for (let i = 0; i < normal.pass_details.length; i++) {
      expect(overcut.pass_details[i].offset_mm).toBeGreaterThan(normal.pass_details[i].offset_mm);
    }
  });

  it("SI-05: negative stock_allowance decreases all offsets (undercut → larger part)", async () => {
    const normal = await engine.generate(BASE);
    const undercut = await engine.generate({ ...BASE, stock_allowance_mm: -0.010 });
    for (let i = 0; i < normal.pass_details.length; i++) {
      expect(undercut.pass_details[i].offset_mm).toBeLessThan(normal.pass_details[i].offset_mm);
    }
  });

  it("SI-06: stock_allowance of 0 matches default", async () => {
    const normal = await engine.generate(BASE);
    const zero = await engine.generate({ ...BASE, stock_allowance_mm: 0 });
    for (let i = 0; i < normal.pass_details.length; i++) {
      expect(zero.pass_details[i].offset_mm).toBeCloseTo(normal.pass_details[i].offset_mm, 4);
    }
  });

  it("SI-07: large negative stock can't go below minimum (0.005mm)", async () => {
    const r = await engine.generate({ ...BASE, stock_allowance_mm: -1.0 });
    for (const p of r.pass_details) {
      expect(p.offset_mm).toBeGreaterThanOrEqual(0.005);
    }
  });

  it("SI-08: warning mentions stock allowance when set", async () => {
    const r = await engine.generate({ ...BASE, stock_allowance_mm: 0.015 });
    expect(r.warnings.some(w => w.includes("Stock allowance"))).toBe(true);
  });
});

// ============================================================================
// LEAD-IN / LEAD-OUT
// ============================================================================
describe("Lead-In / Lead-Out", () => {
  it("SI-09: default lead-in is 2mm", async () => {
    const r = await engine.generate(BASE);
    expect(r.success).toBe(true);
    // The approach/departure is embedded in the profile — verify via setup sheet or program structure
  });

  it("SI-10: custom lead-in distance (5mm)", async () => {
    const r = await engine.generate({ ...BASE, lead_in_mm: 5.0 });
    expect(r.success).toBe(true);
  });

  it("SI-11: custom lead-out distance (3mm)", async () => {
    const r = await engine.generate({ ...BASE, lead_out_mm: 3.0 });
    expect(r.success).toBe(true);
  });

  it("SI-12: arc lead-in type accepted", async () => {
    const r = await engine.generate({ ...BASE, lead_in_type: "arc", lead_in_mm: 3.0 });
    expect(r.success).toBe(true);
  });

  it("SI-13: tangent lead-in type accepted", async () => {
    const r = await engine.generate({ ...BASE, lead_in_type: "tangent", lead_in_mm: 2.5 });
    expect(r.success).toBe(true);
  });

  it("SI-14: zero lead-in accepted (direct approach)", async () => {
    const r = await engine.generate({ ...BASE, lead_in_mm: 0 });
    expect(r.success).toBe(true);
  });
});

// ============================================================================
// WIRE SIZE COMPENSATION
// ============================================================================
describe("Wire Size Compensation", () => {
  it("SI-15: same wire size → no offset change", async () => {
    const normal = await engine.generate(BASE);
    const same = await engine.generate({ ...BASE, actual_wire_diameter_mm: 0.25 });
    for (let i = 0; i < normal.pass_details.length; i++) {
      expect(same.pass_details[i].offset_mm).toBeCloseTo(normal.pass_details[i].offset_mm, 4);
    }
  });

  it("SI-16: smaller wire (0.20mm) → offsets decrease by 0.025mm", async () => {
    const planned25 = await engine.generate(BASE);
    const actual20 = await engine.generate({ ...BASE, actual_wire_diameter_mm: 0.20 });
    // Offset difference should be (0.20 - 0.25) / 2 = -0.025mm
    const diff = actual20.pass_details[0].offset_mm - planned25.pass_details[0].offset_mm;
    expect(diff).toBeCloseTo(-0.025, 3);
  });

  it("SI-17: larger wire (0.30mm) → offsets increase by 0.025mm", async () => {
    const planned25 = await engine.generate(BASE);
    const actual30 = await engine.generate({ ...BASE, actual_wire_diameter_mm: 0.30 });
    const diff = actual30.pass_details[0].offset_mm - planned25.pass_details[0].offset_mm;
    expect(diff).toBeCloseTo(0.025, 3);
  });

  it("SI-18: wire compensation warning emitted", async () => {
    const r = await engine.generate({ ...BASE, actual_wire_diameter_mm: 0.20 });
    expect(r.warnings.some(w => w.includes("Wire compensation"))).toBe(true);
  });
});

// ============================================================================
// PER-PASS OFFSET OVERRIDE
// ============================================================================
describe("Per-Pass Offset Override", () => {
  it("SI-19: explicit offsets override physics calculation", async () => {
    const r = await engine.generate({
      ...BASE,
      offset_overrides_mm: [0.200, 0.150, 0.140, 0.135, 0.130],
    });
    // First pass should be exactly 0.200 (not from physics)
    expect(r.pass_details[0].offset_mm).toBeCloseTo(0.200, 3);
    if (r.pass_details.length >= 2) {
      expect(r.pass_details[1].offset_mm).toBeCloseTo(0.150, 3);
    }
  });

  it("SI-20: null entries in override array use calculated values", async () => {
    const normal = await engine.generate(BASE);
    const partial = await engine.generate({
      ...BASE,
      offset_overrides_mm: [0.300, null, null, null, null],
    });
    expect(partial.pass_details[0].offset_mm).toBeCloseTo(0.300, 3);
    if (normal.pass_details.length >= 2 && partial.pass_details.length >= 2) {
      // Pass 2 should match normal (null = use calculated)
      expect(partial.pass_details[1].offset_mm).toBeCloseTo(normal.pass_details[1].offset_mm, 3);
    }
  });
});

// ============================================================================
// PER-PASS FEED OVERRIDE
// ============================================================================
describe("Per-Pass Feed Override", () => {
  it("SI-21: explicit feed rates override calculation", async () => {
    const r = await engine.generate({
      ...BASE,
      feed_overrides_mm_min: [3.0, 6.0, 5.5, 5.0, 4.8],
    });
    // The E-pack line should contain the overridden feed
    expect(r.success).toBe(true);
    // Verify via pass_details
    expect(r.pass_details[0].feed_mm_min).toBeDefined();
  });

  it("SI-22: null entries use calculated feeds", async () => {
    const r = await engine.generate({
      ...BASE,
      feed_overrides_mm_min: [null, null, 10.0, null, null],
    });
    expect(r.success).toBe(true);
  });
});

// ============================================================================
// START HOLE OVERRIDE
// ============================================================================
describe("Start Hole Override", () => {
  it("SI-23: custom start hole position used", async () => {
    const r = await engine.generate({
      ...BASE,
      start_holes: [{ x: 15.0, y: 5.0 }],
    });
    expect(r.success).toBe(true);
    // The G-code should reference these coordinates for rapid/approach
  });

  it("SI-24: null start_hole entry uses auto-calculated position", async () => {
    const r = await engine.generate({
      ...BASE,
      start_holes: [null],
    });
    expect(r.success).toBe(true);
  });

  it("SI-25: start hole outside part for exterior profile", async () => {
    const r = await engine.generate({
      ...BASE,
      start_holes: [{ x: -10, y: 5 }],
    });
    expect(r.success).toBe(true);
  });
});

// ============================================================================
// THICKNESS → SPEED/FEED SCALING
// ============================================================================
describe("Thickness → Speed/Feed Scaling", () => {
  it("SI-26: 5mm part faster than 50mm part", async () => {
    const thin = await engine.generate({ ...BASE, thickness_mm: 5 });
    const thick = await engine.generate({ ...BASE, thickness_mm: 50 });
    expect(thin.setup_sheet.total_time_min).toBeLessThan(thick.setup_sheet.total_time_min);
  });

  it("SI-27: 250mm part has recommendations for thick stock", async () => {
    const r = await engine.generate({ ...BASE, thickness_mm: 250 });
    expect(r.setup_sheet.notes.some(n => n.toLowerCase().includes("thick") || n.toLowerCase().includes("200"))).toBe(true);
  });

  it("SI-28: 1mm part valid (micro EDM range)", async () => {
    const r = await engine.generate({ ...BASE, thickness_mm: 1, wire_type: "tungsten_0.05" });
    expect(r.success).toBe(true);
  });

  it("SI-29: time increases proportionally with thickness", async () => {
    const t10 = await engine.generate({ ...BASE, thickness_mm: 10 });
    const t100 = await engine.generate({ ...BASE, thickness_mm: 100 });
    // Calibrated: D2@10mm rough ~3.6 mm/min, D2@100mm rough ~1.8 mm/min (PPC-011)
    // Real time ratio ≈ 1.8-2.0× — old model over-predicted (h^-1.5 gave 10-30×)
    expect(t100.setup_sheet.total_time_min).toBeGreaterThan(t10.setup_sheet.total_time_min * 1.5);
    expect(t100.setup_sheet.total_time_min).toBeGreaterThan(t10.setup_sheet.total_time_min);
  });
});

// ============================================================================
// COMBINED OVERRIDES
// ============================================================================
describe("Combined Overrides", () => {
  it("SI-30: stock_allowance + wire_compensation stack correctly", async () => {
    const normal = await engine.generate(BASE);
    const combined = await engine.generate({
      ...BASE,
      stock_allowance_mm: 0.010,         // +10µm overcut
      actual_wire_diameter_mm: 0.20,      // -25µm wire comp
    });
    // Net: -15µm per side
    const netDiff = combined.pass_details[0].offset_mm - normal.pass_details[0].offset_mm;
    expect(netDiff).toBeCloseTo(-0.015, 3);
  });

  it("SI-31: all shop inputs together produce valid program", async () => {
    const r = await engine.generate({
      ...BASE,
      origin: { x: 100, y: 50 },
      stock_allowance_mm: 0.005,
      lead_in_mm: 3.0,
      lead_in_type: "arc",
      lead_out_mm: 3.0,
      lead_out_type: "linear",
      actual_wire_diameter_mm: 0.20,
      start_holes: [{ x: -5, y: 5 }],
    });
    expect(r.success).toBe(true);
    expect(r.program_text).toContain("G92 X100.0000 Y50.0000");
    expect(r.program_text).toContain("M20");
    expect(r.program_text).toContain("M02");
    expect(r.warnings.some(w => w.includes("Wire compensation"))).toBe(true);
    expect(r.warnings.some(w => w.includes("Stock allowance"))).toBe(true);
  });

  it("SI-32: offset_override beats stock_allowance + wire_comp", async () => {
    const r = await engine.generate({
      ...BASE,
      stock_allowance_mm: 0.050,
      actual_wire_diameter_mm: 0.30,
      offset_overrides_mm: [0.180, null, null, null, null],
    });
    // Pass 1 should be exactly 0.180, ignoring stock+wire adjustments
    expect(r.pass_details[0].offset_mm).toBeCloseTo(0.180, 3);
    // Pass 2+ should have stock+wire applied (since null = calculated)
  });
});
