/**
 * HelicalMillingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B13
 */
import { describe, it, expect } from "vitest";
import { helicalMillingEngine } from "../engines/HelicalMillingEngine.js";

describe("HelicalMillingEngine", () => {
  it("calculates basic helix parameters for steel bore", () => {
    const r = helicalMillingEngine.calculate({
      bore_diameter_mm: 30,
      tool_diameter_mm: 16,
      flutes: 4,
    });
    // Helix diameter = 30 - 16 = 14mm
    expect(r.helix_diameter.value).toBe(14);
    // Radial DOC = 14 / 2 = 7mm
    expect(r.radial_depth_of_cut.value).toBe(7);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.programmed_feed.value).toBeGreaterThan(0);
    expect(r.peripheral_feed.value).toBeGreaterThan(
      r.programmed_feed.value
    );
    expect(r.warnings).toHaveLength(0);
  });

  it("warns when tool/bore ratio > 0.7", () => {
    const r = helicalMillingEngine.calculate({
      bore_diameter_mm: 20,
      tool_diameter_mm: 16,
      flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("0.7"))
    ).toBe(true);
  });

  it("warns when tool/bore ratio < 0.3", () => {
    const r = helicalMillingEngine.calculate({
      bore_diameter_mm: 50,
      tool_diameter_mm: 10,
      flutes: 4,
    });
    expect(
      r.warnings.some(w => w.includes("0.3"))
    ).toBe(true);
  });

  it("uses finishing parameters when specified", () => {
    const rough = helicalMillingEngine.calculate({
      bore_diameter_mm: 40,
      tool_diameter_mm: 20,
      flutes: 4,
      bore_depth_mm: 30,
    });
    const finish = helicalMillingEngine.calculate({
      bore_diameter_mm: 40,
      tool_diameter_mm: 20,
      flutes: 4,
      bore_depth_mm: 30,
      finishing: true,
    });
    // Finishing has smaller axial pitch
    expect(finish.helix_pitch.value).toBeLessThan(
      rough.helix_pitch.value
    );
    // More revolutions for finishing
    expect(finish.number_of_helix_revs.value).toBeGreaterThan(
      rough.number_of_helix_revs.value
    );
  });

  it("calculates correct helix revs for given depth", () => {
    const r = helicalMillingEngine.calculate({
      bore_diameter_mm: 30,
      tool_diameter_mm: 16,
      flutes: 4,
      bore_depth_mm: 20,
      axial_pitch_mm: 1.0,
    });
    expect(r.number_of_helix_revs.value).toBe(20);
  });

  it("handles aluminum with higher speeds", () => {
    const r = helicalMillingEngine.calculate({
      bore_diameter_mm: 25,
      tool_diameter_mm: 12,
      flutes: 3,
      material_type: "aluminum",
    });
    // Aluminum default Vc=300 m/min → higher RPM
    expect(r.spindle_rpm.value).toBeGreaterThan(5000);
  });

  it("calculates cycle time and MRR", () => {
    const r = helicalMillingEngine.calculate({
      bore_diameter_mm: 30,
      tool_diameter_mm: 16,
      flutes: 4,
      bore_depth_mm: 20,
    });
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.mrr.value).toBeGreaterThan(0);
  });

  it("warns tool diameter >= bore diameter", () => {
    const r = helicalMillingEngine.calculate({
      bore_diameter_mm: 10,
      tool_diameter_mm: 12,
      flutes: 2,
    });
    expect(
      r.warnings.some(w => w.includes("smaller"))
    ).toBe(true);
  });
});
