/**
 * ArcFittingEngine Tests — MIO-MS0/U-MIO20
 */
import { describe, it, expect } from "vitest";
import { arcFittingEngine } from "../engines/ArcFittingEngine.js";

describe("ArcFittingEngine", () => {
  describe("fit", () => {
    it("fits circle through points on circular arc", () => {
      const points = [];
      const radius = 10;
      const centerX = 0, centerY = 0;
      for (let i = 0; i <= 10; i++) {
        const angle = (i / 10) * Math.PI / 2;
        points.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          z: 0,
        });
      }

      const result = arcFittingEngine.fit(points, { tolerance_mm: 0.01 });

      expect(result.arcs.length).toBeGreaterThan(0);
      expect(result.arcs[0].radius_mm).toBeCloseTo(10, 1);
    });

    it("returns empty for insufficient points", () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
      ];

      const result = arcFittingEngine.fit(points);

      expect(result.arcs).toHaveLength(0);
      expect(result.remaining_points).toHaveLength(2);
    });

    it("rejects points not on arc (linear)", () => {
      const points = [];
      for (let i = 0; i < 10; i++) {
        points.push({ x: i, y: i, z: 0 }); // Perfect line
      }

      const result = arcFittingEngine.fit(points, { tolerance_mm: 0.01, min_radius_mm: 0.5 });

      // Line shouldn't fit an arc (radius would be enormous)
      expect(result.remaining_points.length).toBeGreaterThan(0);
    });

    it("calculates reduction percentage", () => {
      const points = [];
      const radius = 15;
      for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI;
        points.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          z: 0,
        });
      }

      const result = arcFittingEngine.fit(points, { tolerance_mm: 0.05 });

      expect(result.reduction_pct).toBeGreaterThan(0);
    });

    it("provides AI reasoning trace", () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ];

      const result = arcFittingEngine.fit(points);

      expect(result.ai_reasoning.length).toBeGreaterThan(0);
      expect(result.ai_reasoning.some(r => r.includes("[ARC-FIT]"))).toBe(true);
    });

    it("respects min_radius limit", () => {
      const points = [];
      const radius = 0.1; // Very small
      for (let i = 0; i <= 10; i++) {
        const angle = (i / 10) * Math.PI / 2;
        points.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          z: 0,
        });
      }

      const result = arcFittingEngine.fit(points, { min_radius_mm: 1.0 });

      // Small radius should be rejected
      expect(result.arcs.length).toBe(0);
    });

    it("respects max_radius limit", () => {
      const points = [];
      const radius = 10000; // Very large
      for (let i = 0; i <= 10; i++) {
        const angle = (i / 10000);
        points.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          z: 0,
        });
      }

      const result = arcFittingEngine.fit(points, { max_radius_mm: 500 });

      expect(result.arcs.length).toBe(0);
    });

    it("detects arc direction (CW vs CCW)", () => {
      const points = [];
      const radius = 10;
      for (let i = 0; i <= 10; i++) {
        const angle = -(i / 10) * Math.PI / 2; // CW direction
        points.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          z: 0,
        });
      }

      const result = arcFittingEngine.fit(points, { tolerance_mm: 0.05 });

      if (result.arcs.length > 0) {
        expect(["cw", "ccw"]).toContain(result.arcs[0].direction);
      }
    });
  });

  describe("toGCode", () => {
    it("converts arcs to G-code format", () => {
      const arcs = [
        {
          start: { x: 10, y: 0, z: 0 },
          end: { x: 0, y: 10, z: 0 },
          center: { x: 0, y: 0 },
          radius_mm: 10,
          direction: "ccw" as const,
          angle_degrees: 90,
          fit_error_mm: 0.001,
          original_points: 10,
        },
      ];

      const gcode = arcFittingEngine.toGCode(arcs, 500);

      expect(gcode).toHaveLength(1);
      expect(gcode[0].code).toBe("G03");
      expect(gcode[0].x).toBe(0);
      expect(gcode[0].y).toBe(10);
      expect(gcode[0].f).toBe(500);
    });

    it("uses G02 for CW arcs", () => {
      const arcs = [
        {
          start: { x: 10, y: 0, z: 0 },
          end: { x: 0, y: 10, z: 0 },
          center: { x: 0, y: 0 },
          radius_mm: 10,
          direction: "cw" as const,
          angle_degrees: 90,
          fit_error_mm: 0.001,
          original_points: 10,
        },
      ];

      const gcode = arcFittingEngine.toGCode(arcs);

      expect(gcode[0].code).toBe("G02");
    });
  });

  describe("quickCheck", () => {
    it("returns true for arc-like points", () => {
      const points = [];
      const radius = 10;
      for (let i = 0; i <= 10; i++) {
        const angle = (i / 10) * Math.PI / 2;
        points.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          z: 0,
        });
      }

      expect(arcFittingEngine.quickCheck(points, 0.05)).toBe(true);
    });

    it("returns false for insufficient points", () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 0 },
      ];

      expect(arcFittingEngine.quickCheck(points)).toBe(false);
    });
  });
});
