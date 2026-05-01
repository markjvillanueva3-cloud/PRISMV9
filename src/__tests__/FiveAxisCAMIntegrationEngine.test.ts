import { describe, it, expect } from "vitest";
import { FiveAxisCAMIntegrationEngine } from "../engines/FiveAxisCAMIntegrationEngine.js";

const engine = new FiveAxisCAMIntegrationEngine();

const headTable = {
  machine_type: "head_table" as const,
  a_range_deg: [-120, 120] as [number, number],
  b_range_deg: [-120, 120] as [number, number],
  enable_rtcp: true,
  lead_angle_deg: 10,
  max_tilt_deg: 45,
};

function make3axisPath(n: number) {
  const segs: any[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI;
    segs.push({
      x: 50 * Math.cos(angle),
      y: 50 * Math.sin(angle),
      z: -5 - Math.sin(angle * 2),
      feed_mmmin: 2000, rpm: 8000, type: "feed",
      nx: 0.1 * Math.sin(angle),
      ny: 0.1 * Math.cos(angle),
      nz: 0.99,
    });
  }
  return segs;
}

describe("FiveAxisCAMIntegrationEngine", () => {
  it("converts 3-axis path to 5-axis with tool axis vectors", () => {
    const path3 = make3axisPath(20);
    const result = engine.convert3to5axis(path3, headTable);

    expect(result.segment_count).toBe(20);
    for (const seg of result.segments) {
      // Tool axis should be unit vector
      const len = Math.sqrt(seg.i * seg.i + seg.j * seg.j + seg.k * seg.k);
      expect(len).toBeCloseTo(1.0, 2);
      // Rotary angles should be computed
      expect(typeof seg.a_deg).toBe("number");
      expect(typeof seg.b_deg).toBe("number");
    }
  });

  it("applies lead angle to tool axis", () => {
    const path3 = make3axisPath(10);
    const withLead = engine.convert3to5axis(path3, {
      ...headTable, lead_angle_deg: 15,
    });
    const noLead = engine.convert3to5axis(path3, {
      ...headTable, lead_angle_deg: 0,
    });

    // With lead, tool axis should differ from surface normal
    // First segment has no previous point, so skip
    if (withLead.segments.length > 2 && noLead.segments.length > 2) {
      const wl = withLead.segments[2];
      const nl = noLead.segments[2];
      // At least one axis angle should differ
      const differs = Math.abs(wl.a_deg! - nl.a_deg!) > 0.1 ||
        Math.abs(wl.b_deg! - nl.b_deg!) > 0.1;
      expect(differs).toBe(true);
    }
  });

  it("clamps tilt to max_tilt_deg", () => {
    // Create path with steep surface normal (large tilt needed)
    const steepPath = [{
      x: 0, y: 0, z: 0, feed_mmmin: 2000, rpm: 8000, type: "feed",
      nx: 0.8, ny: 0, nz: 0.6, // 53° from vertical
    }];

    const result = engine.convert3to5axis(steepPath, {
      ...headTable, max_tilt_deg: 30, lead_angle_deg: 0,
    });

    // Tool axis k component should reflect max tilt limit
    const seg = result.segments[0];
    const tiltAngle = Math.acos(Math.abs(seg.k)) * 180 / Math.PI;
    expect(tiltAngle).toBeLessThanOrEqual(31); // allow 1° tolerance
  });

  it("detects axis limit violations", () => {
    // Use a steep surface normal that produces A > 10°
    const steepPath = Array.from({ length: 5 }, (_, i) => ({
      x: i * 10, y: 0, z: 0, feed_mmmin: 2000, rpm: 8000, type: "feed",
      nx: 0, ny: -0.5, nz: 0.866, // ~30° tilt in Y → A≈30°
    }));

    const result = engine.convert3to5axis(steepPath, {
      machine_type: "head_table" as const,
      a_range_deg: [-10, 10] as [number, number],
      b_range_deg: [-90, 90] as [number, number],
      max_tilt_deg: 60,
      lead_angle_deg: 0,
    });

    // A angles should exceed ±10° limit
    expect(result.axis_limit_violations).toBeGreaterThan(0);
  });

  it("generates 5-axis G-code with A/B axes", () => {
    const path3 = make3axisPath(10);
    const result = engine.convert3to5axis(path3, headTable);
    const gcode = engine.toFiveAxisGcode(result.segments, {
      ...headTable, rpm: 8000,
    });

    expect(gcode).toContain("G43.4"); // RTCP on
    expect(gcode).toContain("G49"); // RTCP off
    expect(gcode).toMatch(/A-?\d+\.\d+/); // A axis
    expect(gcode).toMatch(/B-?\d+\.\d+/); // B axis
    expect(gcode).toContain("M30");
  });

  it("handles table-table machine type", () => {
    const path3 = make3axisPath(5);
    const result = engine.convert3to5axis(path3, {
      machine_type: "table_table" as const,
      max_tilt_deg: 45,
      lead_angle_deg: 5,
    });

    expect(result.segment_count).toBe(5);
    // Should still produce valid angles
    for (const seg of result.segments) {
      expect(isFinite(seg.a_deg!)).toBe(true);
      expect(isFinite(seg.b_deg!)).toBe(true);
    }
  });

  it("reports max rotary angles used", () => {
    const path3 = make3axisPath(15);
    const result = engine.convert3to5axis(path3, headTable);

    expect(result.max_a_deg).toBeGreaterThanOrEqual(0);
    expect(result.max_b_deg).toBeGreaterThanOrEqual(0);
  });

  it("handles path with no surface normals (defaults to +Z)", () => {
    const path = [
      { x: 0, y: 0, z: -5, feed_mmmin: 2000, rpm: 8000, type: "feed" },
      { x: 10, y: 0, z: -5, feed_mmmin: 2000, rpm: 8000, type: "feed" },
    ];

    const result = engine.convert3to5axis(path, {
      ...headTable, lead_angle_deg: 0,
    });

    // Without normals, tool axis should be near +Z
    expect(result.segments[0].k).toBeCloseTo(1.0, 1);
  });
});
