import { describe, it, expect } from "vitest";
import {
  millOnMachineProbeCycleEngine as eng,
  DEFAULT_PROBE_FEED_MM_MIN,
  DEFAULT_APPROACH_MM,
  PROBE_HANDSHAKE_S,
  MIN_MILL_STYLUS_LENGTH_MM,
  type MillProbeCycleInput,
} from "../engines/MillOnMachineProbeCycleEngine.js";

function nominal(o: Partial<MillProbeCycleInput> = {}): MillProbeCycleInput {
  return {
    cycle: "bore_diameter_4point",
    nominal_mm: 25,
    tol_mm: 0.05,
    feature_center_x_mm: 100,
    feature_center_y_mm: 50,
    ...o,
  };
}

describe("MillOnMachineProbeCycleEngine", () => {
  it("getStats: 10 cycles total, 7 mill-canonical, Renishaw/Heidenhain/Blum refs", () => {
    const s = eng.getStats();
    expect(s.cycles.length).toBe(10);
    expect(s.mill_canonical_cycles.length).toBe(7);
    expect(s.mill_canonical_cycles).toContain("bore_diameter_4point");
    expect(s.mill_canonical_cycles).toContain("rotary_axis_zero");
    expect(s.default_feed_mm_min).toBe(DEFAULT_PROBE_FEED_MM_MIN);
    expect(s.default_approach_mm).toBe(DEFAULT_APPROACH_MM);
    expect(s.min_stylus_mm).toBe(MIN_MILL_STYLUS_LENGTH_MM);
    expect(s.reference).toMatch(/Renishaw|Heidenhain|Blum/);
  });

  it("throws on invalid input", () => {
    expect(() => eng.generate(null as never)).toThrow(/input required/);
    expect(() => eng.generate(nominal({ tol_mm: -0.01 }))).toThrow(/tol_mm/);
    expect(() => eng.generate(nominal({ cycle: "deep_pocket" as never }))).toThrow(/Unknown cycle/);
  });

  it("bore_diameter_4point: 4 touches + Renishaw macro 9814 + XY positioning", () => {
    const r = eng.generate(nominal());
    expect(r.touch_count).toBe(4);
    expect(r.macro).toBe(9814);
    expect(r.nc_snippet).toMatch(/G65 P9814/);
    expect(r.nc_snippet).toMatch(/X100 Y50/); // approach to feature center
  });

  it("boss_diameter_4point: outside variant uses S1 flag for outside-diameter probe", () => {
    const r = eng.generate(nominal({ cycle: "boss_diameter_4point" }));
    expect(r.nc_snippet).toMatch(/S1.*outside/);
    expect(r.touch_count).toBe(4);
  });

  it("web_width (X axis): 2 touches + axis flag A1", () => {
    const r = eng.generate(nominal({ cycle: "web_width", axis: "X" }));
    expect(r.touch_count).toBe(2);
    expect(r.nc_snippet).toMatch(/A1/);
  });

  it("web_width (Y axis): 2 touches + axis flag A2", () => {
    const r = eng.generate(nominal({ cycle: "web_width", axis: "Y" }));
    expect(r.nc_snippet).toMatch(/A2/);
  });

  it("corner_3point: 3 touches + Renishaw macro 9815", () => {
    const r = eng.generate(nominal({ cycle: "corner_3point" }));
    expect(r.touch_count).toBe(3);
    expect(r.macro).toBe(9815);
  });

  it("pocket_corner: 2 touches + dives Z- into pocket (negative Z)", () => {
    const r = eng.generate(nominal({ cycle: "pocket_corner" }));
    expect(r.touch_count).toBe(2);
    expect(r.nc_snippet).toMatch(/Z-/); // into pocket
  });

  it("surface_z_measure: 1 touch + Z-axis (A3 flag)", () => {
    const r = eng.generate(nominal({ cycle: "surface_z_measure" }));
    expect(r.touch_count).toBe(1);
    expect(r.nc_snippet).toMatch(/A3/);
  });

  it("rotary_axis_zero: 2 touches + A-axis default", () => {
    const r = eng.generate(nominal({ cycle: "rotary_axis_zero" }));
    expect(r.touch_count).toBe(2);
    expect(r.nc_snippet).toMatch(/A/);
  });

  it("rotary_axis_zero supports B and C axes", () => {
    const rb = eng.generate(nominal({ cycle: "rotary_axis_zero", axis: "B" }));
    const rc = eng.generate(nominal({ cycle: "rotary_axis_zero", axis: "C" }));
    expect(rb.nc_snippet).toMatch(/B/);
    expect(rc.nc_snippet).toMatch(/C/);
  });

  it("work_offset_xy_bump: 0 physical touches (pure G10 write)", () => {
    const r = eng.generate(nominal({ cycle: "work_offset_xy_bump" }));
    expect(r.touch_count).toBe(0);
    expect(r.macro).toBe(9832);
    expect(r.nc_snippet).toMatch(/W54/); // default WCS G54 → W54
  });

  it("work_offset_xy_bump uses specified WCS", () => {
    const r = eng.generate(nominal({ cycle: "work_offset_xy_bump", wcs: "G57" }));
    expect(r.nc_snippet).toMatch(/W57/);
  });

  it("tool_length_probe: 1 touch + macro 9853", () => {
    const r = eng.generate(nominal({ cycle: "tool_length_probe" }));
    expect(r.touch_count).toBe(1);
    expect(r.macro).toBe(9853);
  });

  it("stylus shorter than MIN emits warning", () => {
    const r = eng.generate(nominal({ probe_stylus_length_mm: 15 }));
    expect(r.warnings.some(w => /Probe stylus 15mm/.test(w))).toBe(true);
  });

  it("stylus >= MIN emits no warning", () => {
    const r = eng.generate(nominal({ probe_stylus_length_mm: 40 }));
    expect(r.warnings.some(w => /stylus/i.test(w))).toBe(false);
  });

  it("bore cycle without feature_center_xy emits warning", () => {
    const r = eng.generate({
      cycle: "bore_diameter_4point",
      nominal_mm: 25,
      tol_mm: 0.05,
    });
    expect(r.warnings.some(w => /feature_center_x_mm/.test(w))).toBe(true);
  });

  it("estimated_time_s = travel/feed×60 + reposition + handshake", () => {
    // 4 touches × (2×5 + 2×0.05) = 40.4mm travel; at 1000 mm/min = 2.42s
    // reposition: 3 × 1.5 = 4.5s; handshake: 2s → total ~8.92s
    const r = eng.generate(nominal());
    expect(r.estimated_time_s).toBeCloseTo(8.92, 1);
  });

  it("work_offset_xy_bump has zero travel time (0 touches) + handshake only", () => {
    const r = eng.generate(nominal({ cycle: "work_offset_xy_bump" }));
    expect(r.estimated_time_s).toBeCloseTo(PROBE_HANDSHAKE_S, 1);
  });

  it("custom probe_feed_mm_min slows down probe time proportionally", () => {
    const slow = eng.generate(nominal({ probe_feed_mm_min: 500 }));
    const fast = eng.generate(nominal({ probe_feed_mm_min: 1000 }));
    // travel component doubles when feed halves; reposition + handshake same
    // slow_travel = 40.4/500 × 60 = 4.85s vs fast = 2.42s
    expect(slow.estimated_time_s).toBeGreaterThan(fast.estimated_time_s);
  });

  it("custom macro_override is used in NC snippet", () => {
    const r = eng.generate(nominal({ macro_override: 9999 }));
    expect(r.macro).toBe(9999);
    expect(r.nc_snippet).toMatch(/G65 P9999/);
  });

  it("NC snippet includes header comment with cycle name + nominal + tol", () => {
    const r = eng.generate(nominal());
    expect(r.nc_snippet).toMatch(/\( OMV bore_diameter_4point nominal=25mm tol=±0\.05mm \)/);
  });

  it("NC snippet uses specified WCS (G54..G59)", () => {
    const r = eng.generate(nominal({ wcs: "G55" }));
    expect(r.nc_snippet).toMatch(/^G55/m);
  });

  it("variability ≥3: 3 distinct cycle taxonomies (bore_4pt, web_width, surface_z) all produce valid snippets", () => {
    const r1 = eng.generate(nominal({ cycle: "bore_diameter_4point" }));
    const r2 = eng.generate(nominal({ cycle: "web_width" }));
    const r3 = eng.generate(nominal({ cycle: "surface_z_measure" }));
    expect(r1.touch_count).toBe(4);
    expect(r2.touch_count).toBe(2);
    expect(r3.touch_count).toBe(1);
    // All three nc_snippets start with the standard OMV header
    for (const r of [r1, r2, r3]) {
      expect(r.nc_snippet).toMatch(/^\( OMV /);
    }
  });

  it("determinism: same input twice → identical output", () => {
    const i = nominal();
    expect(eng.generate(i)).toEqual(eng.generate(i));
  });

  it("approach_mm default vs override: override beats default", () => {
    const r_default = eng.generate(nominal());
    const r_override = eng.generate(nominal({ approach_mm: 10 }));
    expect(r_default.approach_mm).toBe(DEFAULT_APPROACH_MM);
    expect(r_override.approach_mm).toBe(10);
  });

  it("rotary_axis_zero with nominal=0 (zero point) does not throw (exception cycle)", () => {
    const r = eng.generate({
      cycle: "rotary_axis_zero",
      nominal_mm: 0,
      tol_mm: 0.001,
    });
    expect(r.touch_count).toBe(2);
  });

  it("work_offset_xy_bump with nominal=0 (zero point) does not throw", () => {
    const r = eng.generate({
      cycle: "work_offset_xy_bump",
      nominal_mm: 0,
      tol_mm: 0.001,
      feature_center_x_mm: 100,
      feature_center_y_mm: 50,
    });
    expect(r.touch_count).toBe(0);
  });

  it("non-rotary/non-WCS-bump cycle with nominal=0 throws", () => {
    expect(() => eng.generate({
      cycle: "bore_diameter_4point",
      nominal_mm: 0,
      tol_mm: 0.05,
    })).toThrow(/nominal_mm > 0/);
  });

  it("reasoning narrates macro + touches + estimated breakdown", () => {
    const r = eng.generate(nominal());
    expect(r.reasoning.some(s => /Macro P9814/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Touch points: 4/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /handshake.*=.*s/.test(s))).toBe(true);
  });
});
