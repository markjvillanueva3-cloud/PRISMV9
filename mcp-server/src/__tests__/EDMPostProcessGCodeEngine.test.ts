/**
 * EDMPostProcessGCodeEngine Tests
 *
 * Tests for wire EDM G-code generation across 5 controllers:
 * - Fanuc Alpha-C/iC
 * - Sodick ALC/SLC/ALN
 * - Makino Hyper-i
 * - Mitsubishi M800
 * - AgieCharmilles CUT
 *
 * Includes U-WGAP02 imperial coordinate conversion tests.
 */
import { describe, it, expect } from "vitest";
import {
  EDMPostProcessGCodeEngine,
  edmPostProcessGCodeEngine,
  type EDMGCodeInput,
  type EDMProfile,
  type EDMPass,
} from "../engines/EDMPostProcessGCodeEngine.js";

// ── Test fixtures ─────────────────────────────────────────────────────────

function makeTestProfile(name = "TEST"): EDMProfile {
  return {
    name,
    start_hole: { x: 0, y: 0 },
    approach: { type: "linear", length_mm: 2 },
    departure: { type: "linear", length_mm: 2 },
    contour_points: [
      { x: 10, y: 0 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
      { x: 0, y: 0 },
    ],
  };
}

function makeTestPasses(): EDMPass[] {
  return [
    { pass_number: 1, offset_mm: 0.160, technology_table: "E001", wire_speed_m_min: 12, tension_N: 15 },
    { pass_number: 2, offset_mm: 0.135, technology_table: "E002", wire_speed_m_min: 8, tension_N: 12 },
  ];
}

function makeBaseInput(controller: EDMGCodeInput["controller"]): EDMGCodeInput {
  return {
    controller,
    profiles: [makeTestProfile()],
    passes: makeTestPasses(),
    wire_type: "0.25mm Brass",
    program_number: 1234,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// BASIC TESTS
// ══════════════════════════════════════════════════════════════════════════

describe("EDMPostProcessGCodeEngine", () => {
  it("exports singleton", () => {
    expect(edmPostProcessGCodeEngine).toBeInstanceOf(EDMPostProcessGCodeEngine);
  });

  it("lists 5 controllers", () => {
    const controllers = edmPostProcessGCodeEngine.list_controllers();
    expect(controllers.length).toBe(5);
    expect(controllers.map(c => c.controller)).toContain("fanuc");
    expect(controllers.map(c => c.controller)).toContain("sodick");
    expect(controllers.map(c => c.controller)).toContain("makino");
    expect(controllers.map(c => c.controller)).toContain("mitsubishi");
    expect(controllers.map(c => c.controller)).toContain("agiecharmilles");
  });

  // ── Fanuc ─────────────────────────────────────────────────────────────────

  describe("generate_fanuc", () => {
    it("produces valid G-code", () => {
      const r = edmPostProcessGCodeEngine.generate_fanuc({
        profiles: [makeTestProfile()],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
      });
      expect(r.gcode.length).toBeGreaterThan(100);
      expect(r.line_count).toBeGreaterThan(10);
      expect(r.controller).toContain("Fanuc");
    });

    it("contains M50 thread code", () => {
      const r = edmPostProcessGCodeEngine.generate_fanuc({
        profiles: [makeTestProfile()],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
      });
      expect(r.gcode).toContain("M50");
    });

    it("contains M60 cut wire code", () => {
      const r = edmPostProcessGCodeEngine.generate_fanuc({
        profiles: [makeTestProfile()],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
      });
      expect(r.gcode).toContain("M60");
    });

    it("uses G61.1 for exact stop corner", () => {
      const r = edmPostProcessGCodeEngine.generate_fanuc({
        profiles: [makeTestProfile()],
        passes: [{ ...makeTestPasses()[0], corner_strategy: "exact_stop" }],
        wire_type: "0.25mm Brass",
      });
      expect(r.gcode).toContain("G61.1");
    });
  });

  // ── Sodick ────────────────────────────────────────────────────────────────

  describe("generate_sodick", () => {
    it("produces valid G-code", () => {
      const r = edmPostProcessGCodeEngine.generate_sodick({
        profiles: [makeTestProfile()],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
      });
      expect(r.gcode.length).toBeGreaterThan(100);
      expect(r.controller).toContain("Sodick");
    });

    it("uses C### condition codes", () => {
      const r = edmPostProcessGCodeEngine.generate_sodick({
        profiles: [makeTestProfile()],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
      });
      expect(r.gcode).toMatch(/C\d{3}/);
    });

    it("contains M60/M61 threading codes", () => {
      const r = edmPostProcessGCodeEngine.generate_sodick({
        profiles: [makeTestProfile()],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
      });
      expect(r.gcode).toContain("M60");
    });
  });

  // ── Makino ────────────────────────────────────────────────────────────────

  describe("generate_makino", () => {
    it("produces valid G-code", () => {
      const r = edmPostProcessGCodeEngine.generate_makino({
        profiles: [makeTestProfile()],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
      });
      expect(r.gcode.length).toBeGreaterThan(100);
      expect(r.controller).toContain("Makino");
    });
  });

  // ── generate_gcode dispatcher ─────────────────────────────────────────────

  describe("generate_gcode", () => {
    it("dispatches to fanuc", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode(makeBaseInput("fanuc"));
      expect(r.controller).toContain("Fanuc");
      expect(r.gcode).toContain("M50");
    });

    it("dispatches to sodick", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode(makeBaseInput("sodick"));
      expect(r.controller).toContain("Sodick");
    });

    it("dispatches to makino", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode(makeBaseInput("makino"));
      expect(r.controller).toContain("Makino");
    });

    it("dispatches to mitsubishi", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode(makeBaseInput("mitsubishi"));
      expect(r.controller).toContain("Mitsubishi");
    });

    it("dispatches to agiecharmilles", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode(makeBaseInput("agiecharmilles"));
      expect(r.controller).toContain("Agie");
    });

    it("returns warning for empty profiles", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode({
        ...makeBaseInput("fanuc"),
        profiles: [],
      });
      expect(r.warnings.some(w => w.includes("No profiles"))).toBe(true);
    });

    it("returns warning for empty passes", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode({
        ...makeBaseInput("fanuc"),
        passes: [],
      });
      expect(r.warnings.some(w => w.includes("No passes"))).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // U-WGAP02: Imperial coordinate conversion tests
  // ══════════════════════════════════════════════════════════════════════════

  describe("generate_gcode — imperial units (U-WGAP02)", () => {
    it("emits G20 for imperial mode (Fanuc)", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode({
        ...makeBaseInput("fanuc"),
        units: "imperial",
      });
      expect(r.gcode).toContain("G20");
      expect(r.gcode).not.toContain("G21");
    });

    it("emits G21 for metric mode (default, Fanuc)", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode({
        ...makeBaseInput("fanuc"),
        units: "metric",
      });
      expect(r.gcode).toContain("G21");
      expect(r.gcode).not.toContain("G20");
    });

    it("converts coordinates to inches when imperial (Fanuc)", () => {
      const profile: EDMProfile = {
        name: "TEST",
        start_hole: { x: 25.4, y: 50.8 }, // 1", 2"
        approach: { type: "linear", length_mm: 2.54 }, // 0.1"
        departure: { type: "linear", length_mm: 2.54 },
        contour_points: [
          { x: 25.4, y: 0 },  // 1", 0"
          { x: 25.4, y: 25.4 }, // 1", 1"
        ],
      };
      const r = edmPostProcessGCodeEngine.generate_gcode({
        controller: "fanuc",
        profiles: [profile],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
        units: "imperial",
      });
      // Start hole 25.4mm = 1.0000 inches
      expect(r.gcode).toMatch(/X1\.0000/);
      expect(r.gcode).toMatch(/Y2\.0000/);
    });

    it("keeps coordinates in mm when metric (Fanuc)", () => {
      const profile: EDMProfile = {
        name: "TEST",
        start_hole: { x: 25.4, y: 50.8 },
        approach: { type: "linear", length_mm: 2.54 },
        departure: { type: "linear", length_mm: 2.54 },
        contour_points: [
          { x: 25.4, y: 0 },
          { x: 25.4, y: 25.4 },
        ],
      };
      const r = edmPostProcessGCodeEngine.generate_gcode({
        controller: "fanuc",
        profiles: [profile],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
        units: "metric",
      });
      // Coordinates stay in mm
      expect(r.gcode).toMatch(/X25\.4/);
      expect(r.gcode).toMatch(/Y50\.8/);
    });

    it("emits G20 for imperial mode (Sodick)", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode({
        ...makeBaseInput("sodick"),
        units: "imperial",
      });
      expect(r.gcode).toContain("G20");
    });

    it("emits G20 for imperial mode (Makino)", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode({
        ...makeBaseInput("makino"),
        units: "imperial",
      });
      expect(r.gcode).toContain("G20");
    });

    it("scales coordinates for imperial mode (Mitsubishi)", () => {
      // Mitsubishi uses implicit units (no G20/G21) — just coordinate scaling
      const profile: EDMProfile = {
        name: "TEST",
        start_hole: { x: 25.4, y: 0 }, // 1 inch
        approach: { type: "linear", length_mm: 2.54 },
        departure: { type: "linear", length_mm: 2.54 },
        contour_points: [
          { x: 25.4, y: 0 },
          { x: 25.4, y: 25.4 },
        ],
      };
      const r = edmPostProcessGCodeEngine.generate_gcode({
        controller: "mitsubishi",
        profiles: [profile],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
        units: "imperial",
      });
      // Should have converted 25.4mm to 1.0 inch
      expect(r.gcode).toMatch(/X1\.0000/);
    });

    it("emits G20 for imperial mode (AgieCharmilles)", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode({
        ...makeBaseInput("agiecharmilles"),
        units: "imperial",
      });
      expect(r.gcode).toContain("G20");
    });

    it("labels output as INCH in comments when imperial", () => {
      const r = edmPostProcessGCodeEngine.generate_gcode({
        ...makeBaseInput("fanuc"),
        units: "imperial",
      });
      expect(r.gcode).toContain("INCH");
    });
  });

  // ── Post-process planning (MS15) ──────────────────────────────────────────

  describe("plan_post_process", () => {
    it("generates sequence for standard part", () => {
      const r = edmPostProcessGCodeEngine.plan_post_process({
        material: "D2",
        hardness_hrc: 58,
        surface_finish_Ra_um: 0.8,
        recast_layer_max_um: 5,
        has_tight_tolerances: true,
        tolerance_mm: 0.005,
        requires_fatigue_life: false,
        requires_coating: false,
        part_thickness_mm: 25,
        is_aerospace: false,
        is_medical: false,
        num_profiles: 4,
      });
      expect(r.sequence.length).toBeGreaterThan(0);
      expect(r.total_time_hours).toBeGreaterThan(0);
    });

    it("includes recast removal for tight recast spec", () => {
      const r = edmPostProcessGCodeEngine.plan_post_process({
        material: "H13",
        surface_finish_Ra_um: 1.6,
        recast_layer_max_um: 3,
        has_tight_tolerances: false,
        requires_fatigue_life: false,
        requires_coating: false,
        part_thickness_mm: 20,
        is_aerospace: false,
        is_medical: false,
        num_profiles: 1,
      });
      expect(r.sequence.some(s => s.process.toLowerCase().includes("recast"))).toBe(true);
    });

    it("includes coating step when required", () => {
      const r = edmPostProcessGCodeEngine.plan_post_process({
        material: "M2",
        surface_finish_Ra_um: 0.4,
        has_tight_tolerances: true,
        requires_fatigue_life: false,
        requires_coating: true,
        coating_type: "pvd",
        part_thickness_mm: 15,
        is_aerospace: false,
        is_medical: false,
        num_profiles: 2,
      });
      expect(r.sequence.some(s => s.process.toLowerCase().includes("pvd") || s.process.toLowerCase().includes("coat"))).toBe(true);
    });
  });

  // ── Arc interpolation ─────────────────────────────────────────────────────

  describe("arc interpolation", () => {
    it("emits G02/G03 for arc contour points", () => {
      const profile: EDMProfile = {
        name: "ARC_TEST",
        start_hole: { x: 0, y: 0 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
        contour_points: [
          { x: 10, y: 0 },
          { x: 15, y: 5, type: "arc", i: 0, j: 5, direction: "ccw" },
          { x: 10, y: 10 },
        ],
      };
      const r = edmPostProcessGCodeEngine.generate_fanuc({
        profiles: [profile],
        passes: [makeTestPasses()[0]],
        wire_type: "0.25mm Brass",
      });
      expect(r.gcode).toContain("G03");
    });
  });

  // ── Multi-pass sequencing ─────────────────────────────────────────────────

  describe("multi-pass sequencing", () => {
    it("generates passes in order", () => {
      const r = edmPostProcessGCodeEngine.generate_fanuc({
        profiles: [makeTestProfile()],
        passes: [
          { pass_number: 1, offset_mm: 0.160, technology_table: "E001", wire_speed_m_min: 12, tension_N: 15 },
          { pass_number: 2, offset_mm: 0.135, technology_table: "E002", wire_speed_m_min: 10, tension_N: 12 },
          { pass_number: 3, offset_mm: 0.128, technology_table: "E003", wire_speed_m_min: 8, tension_N: 10 },
        ],
        wire_type: "0.25mm Brass",
      });
      expect(r.passes_generated).toBe(3);
    });

    it("handles single pass", () => {
      const r = edmPostProcessGCodeEngine.generate_fanuc({
        profiles: [makeTestProfile()],
        passes: [makeTestPasses()[0]],
        wire_type: "0.25mm Brass",
      });
      expect(r.passes_generated).toBe(1);
    });
  });

  // ── Summary metrics ───────────────────────────────────────────────────────

  describe("summary metrics", () => {
    it("tracks profiles cut", () => {
      const r = edmPostProcessGCodeEngine.generate_fanuc({
        profiles: [makeTestProfile("P1"), makeTestProfile("P2")],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
      });
      expect(r.profiles_cut).toBe(2);
    });

    it("estimates time > 0", () => {
      const r = edmPostProcessGCodeEngine.generate_fanuc({
        profiles: [makeTestProfile()],
        passes: makeTestPasses(),
        wire_type: "0.25mm Brass",
      });
      expect(r.estimated_time_min).toBeGreaterThan(0);
    });
  });
});
