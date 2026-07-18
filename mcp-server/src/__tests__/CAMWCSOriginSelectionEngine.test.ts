/**
 * CAMWCSOriginSelectionEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-WCS
 */
import { describe, it, expect } from "vitest";
import { CAMWCSOriginSelectionEngine } from "../engines/CAMWCSOriginSelectionEngine.js";

const engine = new CAMWCSOriginSelectionEngine();

describe("CAMWCSOriginSelectionEngine", () => {

  it("turning + chuck_3jaw → part_face_center + face_only", () => {
    const r = engine.select("round_bar", "chuck_3jaw", "lathe");
    expect(r.wcs).toBe("G54");
    expect(r.origin).toBe("part_face_center");
    expect(r.probing).toBe("face_only");
  });

  it("turning + chuck_collet → part_face_center", () => {
    const r = engine.select("round_bar", "chuck_collet", "lathe");
    expect(r.origin).toBe("part_face_center");
  });

  it("turning re-fixture → ring_gauge_probe", () => {
    const r = engine.select("round_bar", "chuck_3jaw", "lathe", { isRefixture: true });
    expect(r.probing).toBe("ring_gauge_probe");
  });

  it("wire-edm machine → operator_visual probe", () => {
    const r = engine.select("rectangular_block", "wedm_jig", "wire_edm");
    expect(r.probing).toBe("operator_visual");
    expect(r.origin).toBe("fixture_pin_a");
  });

  it("5-axis machine → trunnion_pivot origin", () => {
    const r = engine.select("rectangular_block", "trunnion_table", "vmc_5axis");
    expect(r.origin).toBe("trunnion_pivot");
    expect(r.probing).toBe("trunnion_pivot_set");
  });

  it("4th-axis rotary → rotary_centerline", () => {
    const r = engine.select("round_bar", "rotary_4th", "vmc_4axis");
    expect(r.origin).toBe("rotary_centerline");
    expect(r.probing).toBe("ring_gauge_probe");
  });

  it("tombstone with 4 stations → G54..G57 sequence", () => {
    const r = engine.select("rectangular_block", "tombstone", "hmc", { stations: 4 });
    expect(r.wcs).toBe("G54");
    expect(r.probing).toBe("tombstone_grid");
    expect(r.additionalStations.length).toBe(3);
    expect(r.additionalStations[0].wcs).toBe("G55");
    expect(r.additionalStations[1].wcs).toBe("G56");
    expect(r.additionalStations[2].wcs).toBe("G57");
  });

  it("tombstone caps stations at 4 (max physical faces)", () => {
    const r = engine.select("rectangular_block", "tombstone", "hmc", { stations: 10 });
    expect(r.additionalStations.length).toBe(3);
  });

  it("sub_plate with 6 stations → G54 + G54.1 P1..P5", () => {
    const r = engine.select("rectangular_block", "sub_plate", "vmc_3axis", { stations: 6 });
    expect(r.wcs).toBe("G54");
    expect(r.additionalStations.length).toBe(5);
    expect(r.additionalStations[0].wcs).toBe("G54.1_P1");
    expect(r.additionalStations[4].wcs).toBe("G54.1_P5");
  });

  it("vacuum_table → top_back_corner + top_plus_two_edges", () => {
    const r = engine.select("thin_plate", "vacuum_table", "vmc_3axis");
    expect(r.origin).toBe("top_back_corner");
    expect(r.probing).toBe("top_plus_two_edges");
  });

  it("magnetic_plate → top_back_corner (same routine as vacuum)", () => {
    const r = engine.select("thin_plate", "magnetic_plate", "vmc_3axis");
    expect(r.origin).toBe("top_back_corner");
  });

  it("re-fixture casting → bore_center_probe + G55", () => {
    const r = engine.select("casting_near_net", "vise_precision", "vmc_3axis", { isRefixture: true });
    expect(r.wcs).toBe("G55");
    expect(r.origin).toBe("bore_center");
    expect(r.probing).toBe("bore_center_probe");
  });

  it("default mill prismatic → G54 + top-left corner", () => {
    const r = engine.select("rectangular_block", "vise_precision", "vmc_3axis");
    expect(r.wcs).toBe("G54");
    expect(r.origin).toBe("top_left_corner");
    expect(r.probing).toBe("top_plus_two_edges");
  });

  it("wcs_codes() returns the 6 base codes", () => {
    const codes = engine.wcs_codes();
    expect(codes.length).toBe(6);
    expect(codes).toContain("G54");
    expect(codes).toContain("G59");
  });

  it("rationale is non-empty + informative for every common case", () => {
    const cases = [
      engine.select("round_bar", "chuck_3jaw", "lathe"),
      engine.select("rectangular_block", "tombstone", "hmc", { stations: 4 }),
      engine.select("rectangular_block", "trunnion_table", "vmc_5axis"),
      engine.select("rectangular_block", "vise_precision", "vmc_3axis"),
    ];
    expect(cases[0].rationale.length).toBeGreaterThan(10);
    expect(cases[1].rationale).toMatch(/tombstone/i);
    expect(cases[2].rationale).toMatch(/5-axis|pivot/i);
    expect(cases[3].rationale).toMatch(/G54|prismatic/i);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes select + wcs_codes", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("select");
    expect(names).toContain("wcs_codes");
  });
});
