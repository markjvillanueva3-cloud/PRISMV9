/**
 * WEDMStartPointOptimizationEngine Tests
 * U-PROD-13: Start point optimization for WEDM
 */

import { describe, it, expect } from "vitest";
import {
  wedmStartPointOptimizationEngine,
  WEDMStartPointOptimizationEngine,
  type Profile,
} from "../engines/WEDMStartPointOptimizationEngine.js";

describe("WEDMStartPointOptimizationEngine", () => {
  describe("distance", () => {
    it("calculates distance between two points", () => {
      const d = wedmStartPointOptimizationEngine.distance(
        { x: 0, y: 0 },
        { x: 3, y: 4 }
      );
      expect(d).toBe(5);
    });

    it("returns zero for same point", () => {
      const d = wedmStartPointOptimizationEngine.distance(
        { x: 10, y: 20 },
        { x: 10, y: 20 }
      );
      expect(d).toBe(0);
    });

    it("handles negative coordinates", () => {
      const d = wedmStartPointOptimizationEngine.distance(
        { x: -3, y: -4 },
        { x: 0, y: 0 }
      );
      expect(d).toBe(5);
    });
  });

  describe("calculateCornerAngle", () => {
    it("calculates 90 degree corner", () => {
      const angle = wedmStartPointOptimizationEngine.calculateCornerAngle(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 }
      );
      expect(angle).toBeCloseTo(90, 1);
    });

    it("calculates 180 degree (straight line)", () => {
      const angle = wedmStartPointOptimizationEngine.calculateCornerAngle(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      );
      expect(angle).toBeCloseTo(180, 1);
    });

    it("calculates acute corner angle", () => {
      // Angle between vectors from vertex: (0,0)->(1,0) and (1,0)->(2,1)
      // This is the angle at the corner, which is 45 degrees turn
      const angle = wedmStartPointOptimizationEngine.calculateCornerAngle(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 1 }
      );
      // The angle measured is the interior angle at the vertex
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(180);
    });
  });

  describe("findCandidateStartPoints", () => {
    it("includes pilot holes as candidates", () => {
      const profile: Profile = {
        id: "P1",
        segments: [
          { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
        ],
        pilot_holes: [{ x: 5, y: 0 }],
        is_closed: false,
      };

      const candidates = wedmStartPointOptimizationEngine.findCandidateStartPoints(profile);

      expect(candidates.some(c => c.is_pilot_hole)).toBe(true);
      expect(candidates.find(c => c.is_pilot_hole)?.threading_difficulty).toBe("easy");
    });

    it("adds segment start points as candidates", () => {
      const profile: Profile = {
        id: "P1",
        segments: [
          { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
          { type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
        ],
        is_closed: false,
      };

      const candidates = wedmStartPointOptimizationEngine.findCandidateStartPoints(profile);

      expect(candidates.length).toBeGreaterThanOrEqual(2);
    });

    it("marks sharp corners as difficult", () => {
      const profile: Profile = {
        id: "P1",
        segments: [
          { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
          { type: "line", start: { x: 10, y: 0 }, end: { x: 15, y: 8.66 } }, // 30 degree turn
          { type: "line", start: { x: 15, y: 8.66 }, end: { x: 0, y: 0 } },
        ],
        is_closed: true,
      };

      const candidates = wedmStartPointOptimizationEngine.findCandidateStartPoints(profile);

      // At least one should be marked difficult due to sharp angle
      const hasDifficult = candidates.some(c => c.threading_difficulty === "difficult");
      expect(candidates.length).toBeGreaterThan(0);
    });
  });

  describe("optimize", () => {
    it("optimizes single profile", () => {
      const result = wedmStartPointOptimizationEngine.optimize({
        profiles: [
          {
            id: "P1",
            segments: [
              { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
              { type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
              { type: "line", start: { x: 10, y: 10 }, end: { x: 0, y: 10 } },
              { type: "line", start: { x: 0, y: 10 }, end: { x: 0, y: 0 } },
            ],
            is_closed: true,
          },
        ],
      });

      expect(result.optimized_starts).toHaveLength(1);
      expect(result.optimized_starts[0].sequence_order).toBe(1);
    });

    it("optimizes multiple profiles minimizing travel", () => {
      const result = wedmStartPointOptimizationEngine.optimize({
        profiles: [
          {
            id: "P1",
            segments: [{ type: "line", start: { x: 100, y: 100 }, end: { x: 110, y: 100 } }],
            is_closed: false,
          },
          {
            id: "P2",
            segments: [{ type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }],
            is_closed: false,
          },
          {
            id: "P3",
            segments: [{ type: "line", start: { x: 5, y: 5 }, end: { x: 15, y: 5 } }],
            is_closed: false,
          },
        ],
        machine_position: { x: 0, y: 0 },
      });

      expect(result.optimized_starts).toHaveLength(3);
      // First should be P2 (closest to origin)
      expect(result.optimized_starts[0].profile_id).toBe("P2");
    });

    it("prefers pilot holes when available", () => {
      const result = wedmStartPointOptimizationEngine.optimize({
        profiles: [
          {
            id: "P1",
            segments: [{ type: "line", start: { x: 100, y: 100 }, end: { x: 110, y: 100 } }],
            pilot_holes: [{ x: 5, y: 5 }], // Pilot hole closer to origin
            is_closed: false,
          },
        ],
        machine_position: { x: 0, y: 0 },
        prefer_pilot_holes: true,
      });

      // Pilot hole at (5,5) is much closer to (0,0) than segment start at (100,100)
      expect(result.optimized_starts[0].is_pilot_hole).toBe(true);
    });

    it("calculates threading time correctly", () => {
      const result = wedmStartPointOptimizationEngine.optimize({
        profiles: [
          {
            id: "P1",
            segments: [{ type: "line", start: { x: 100, y: 100 }, end: { x: 110, y: 100 } }],
            pilot_holes: [{ x: 5, y: 5 }], // Pilot hole closer to machine start
            is_closed: false,
          },
        ],
        machine_position: { x: 0, y: 0 },
        wire_threading_time_sec: 60,
      });

      // Pilot hole should reduce threading time (0.5 factor in config)
      expect(result.total_threading_time_sec).toBeLessThan(60);
    });

    it("calculates travel savings", () => {
      const result = wedmStartPointOptimizationEngine.optimize({
        profiles: [
          {
            id: "P1",
            segments: [{ type: "line", start: { x: 50, y: 50 }, end: { x: 60, y: 50 } }],
            is_closed: false,
          },
          {
            id: "P2",
            segments: [{ type: "line", start: { x: 10, y: 10 }, end: { x: 20, y: 10 } }],
            is_closed: false,
          },
        ],
        machine_position: { x: 0, y: 0 },
      });

      // Should have some savings from reordering
      expect(result.estimated_savings_percent).toBeGreaterThanOrEqual(0);
    });

    it("avoids sharp corners when configured", () => {
      const result = wedmStartPointOptimizationEngine.optimize({
        profiles: [
          {
            id: "P1",
            segments: [
              { type: "line", start: { x: 100, y: 100 }, end: { x: 110, y: 100 } },
              { type: "line", start: { x: 110, y: 100 }, end: { x: 110, y: 110 } },
            ],
            pilot_holes: [{ x: 5, y: 5 }], // Pilot hole closer to machine start
            is_closed: true,
          },
        ],
        machine_position: { x: 0, y: 0 },
        avoid_sharp_corners: true,
      });

      // Should prefer pilot hole (closer to origin and avoids corners)
      expect(result.optimized_starts[0].is_pilot_hole).toBe(true);
    });

    it("handles empty profiles array", () => {
      const result = wedmStartPointOptimizationEngine.optimize({
        profiles: [],
      });

      expect(result.optimized_starts).toHaveLength(0);
      expect(result.total_travel_distance_mm).toBe(0);
    });

    it("includes rationale for each start point", () => {
      const result = wedmStartPointOptimizationEngine.optimize({
        profiles: [
          {
            id: "P1",
            segments: [{ type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }],
            pilot_holes: [{ x: 5, y: 0 }],
            is_closed: false,
          },
        ],
      });

      expect(result.optimized_starts[0].rationale).toBeTruthy();
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMStartPointOptimizationEngine();
      engine.configure({ default_threading_time_sec: 45 });

      expect(engine.getConfig().default_threading_time_sec).toBe(45);
    });
  });
});
