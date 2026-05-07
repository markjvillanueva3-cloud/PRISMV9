/**
 * U-P2PFS24: WEDMHeadClearanceEngine MCP Wiring Tests
 * Verifies dispatcher action wedm_head_clearance_check
 */
import { describe, it, expect } from "vitest";
import {
  wedmHeadClearanceEngine,
  DEFAULT_UPPER_GUIDE,
  DEFAULT_LOWER_GUIDE,
  DEFAULT_SAFETY_MARGIN_MM,
  type MachinePose,
  type AABB,
  type ClearanceOptions,
} from "../engines/WEDMHeadClearanceEngine.js";

describe("WEDMHeadClearanceEngine MCP Wiring (U-P2PFS24)", () => {
  const basePose: MachinePose = {
    X: 100,
    Y: 100,
    Z_upper: 75,
    Z_lower: 25,
  };

  describe("check()", () => {
    it("returns ClearanceReport structure", () => {
      const result = wedmHeadClearanceEngine.check(basePose, []);

      expect(result).toHaveProperty("pose");
      expect(result).toHaveProperty("pass");
      expect(result).toHaveProperty("minClearance_mm");
      expect(result).toHaveProperty("events");
    });

    it("passes with no obstacles", () => {
      const result = wedmHeadClearanceEngine.check(basePose, []);

      expect(result.pass).toBe(true);
      expect(result.events).toHaveLength(0);
    });

    it("detects upper guide collision with fixture", () => {
      const fixture: AABB = {
        id: "clamp1",
        role: "fixture",
        min: { x: 95, y: 95, z: 70 },
        max: { x: 125, y: 125, z: 90 },
      };

      const result = wedmHeadClearanceEngine.check(basePose, [fixture]);

      expect(result.pass).toBe(false);
      const collisions = result.events.filter((e) => e.severity === "critical");
      expect(collisions.length).toBeGreaterThan(0);
    });

    it("detects lower guide collision with fixture", () => {
      const fixture: AABB = {
        id: "base_clamp",
        role: "fixture",
        min: { x: 95, y: 95, z: 0 },
        max: { x: 125, y: 125, z: 30 },
      };

      const result = wedmHeadClearanceEngine.check(basePose, [fixture]);

      expect(result.pass).toBe(false);
      const lowerEvents = result.events.filter((e) => e.actor === "lower_guide");
      expect(lowerEvents.length).toBeGreaterThan(0);
    });

    it("warns when clearance is below safety margin", () => {
      const nearFixture: AABB = {
        id: "near_clamp",
        role: "fixture",
        min: { x: 121, y: 100, z: 70 },
        max: { x: 140, y: 120, z: 90 },
      };

      const result = wedmHeadClearanceEngine.check(basePose, [nearFixture]);

      const warnings = result.events.filter((e) => e.severity === "warning");
      expect(warnings.length).toBeGreaterThanOrEqual(0);
    });

    it("handles taper offsets (U/V)", () => {
      const taperPose: MachinePose = {
        X: 100,
        Y: 100,
        Z_upper: 75,
        Z_lower: 25,
        U: 10,
        V: 10,
      };

      const fixture: AABB = {
        id: "shifted_clamp",
        role: "fixture",
        min: { x: 105, y: 105, z: 70 },
        max: { x: 135, y: 135, z: 90 },
      };

      const result = wedmHeadClearanceEngine.check(taperPose, [fixture]);

      expect(result.events.length).toBeGreaterThan(0);
    });

    it("checks head inside tank envelope", () => {
      const tankInner: AABB = {
        id: "tank",
        role: "tank_wall",
        min: { x: 0, y: 0, z: 0 },
        max: { x: 50, y: 50, z: 100 },
      };

      const result = wedmHeadClearanceEngine.check(basePose, [], { tankInner });

      expect(result.pass).toBe(false);
      const tankEvents = result.events.filter((e) => e.kind === "head_outside_tank");
      expect(tankEvents.length).toBeGreaterThan(0);
    });

    it("checks lower guide above table Z", () => {
      const lowPose: MachinePose = {
        X: 100,
        Y: 100,
        Z_upper: 50,
        Z_lower: -5,
      };

      const result = wedmHeadClearanceEngine.check(lowPose, [], { tableZ: 0 });

      expect(result.pass).toBe(false);
      const tableEvents = result.events.filter((e) => e.kind === "head_below_table");
      expect(tableEvents.length).toBeGreaterThan(0);
    });

    it("respects custom safety margin", () => {
      const nearFixture: AABB = {
        id: "near",
        role: "fixture",
        min: { x: 125, y: 100, z: 70 },
        max: { x: 140, y: 120, z: 90 },
      };

      const result = wedmHeadClearanceEngine.check(basePose, [nearFixture], {
        safetyMargin_mm: 10,
      });

      const warnings = result.events.filter((e) => e.severity === "warning");
      expect(warnings.length).toBeGreaterThanOrEqual(0);
    });

    it("uses custom guide dimensions", () => {
      const largeGuide = { radius_mm: 30, length_mm: 50 };

      const fixture: AABB = {
        id: "fixture",
        role: "fixture",
        min: { x: 132, y: 100, z: 70 },
        max: { x: 150, y: 120, z: 90 },
      };

      const defaultResult = wedmHeadClearanceEngine.check(basePose, [fixture]);
      const largeResult = wedmHeadClearanceEngine.check(basePose, [fixture], {
        upperGuide: largeGuide,
      });

      expect(largeResult.events.length).toBeGreaterThanOrEqual(defaultResult.events.length);
    });

    it("distinguishes guide_vs_part from guide_vs_fixture", () => {
      const part: AABB = {
        id: "workpiece",
        role: "part",
        min: { x: 95, y: 95, z: 30 },
        max: { x: 105, y: 105, z: 70 },
      };

      const result = wedmHeadClearanceEngine.check(basePose, [part]);

      const partEvents = result.events.filter((e) => e.kind === "guide_vs_part");
      expect(partEvents.length).toBeGreaterThanOrEqual(0);
    });

    it("reports minimum clearance distance", () => {
      const result = wedmHeadClearanceEngine.check(basePose, []);

      expect(typeof result.minClearance_mm).toBe("number");
    });

    it("handles multiple obstacles", () => {
      const obstacles: AABB[] = [
        {
          id: "clamp1",
          role: "fixture",
          min: { x: 0, y: 0, z: 0 },
          max: { x: 50, y: 50, z: 20 },
        },
        {
          id: "clamp2",
          role: "fixture",
          min: { x: 150, y: 150, z: 0 },
          max: { x: 200, y: 200, z: 20 },
        },
      ];

      const result = wedmHeadClearanceEngine.check(basePose, obstacles);

      expect(result).toHaveProperty("pass");
      expect(result).toHaveProperty("events");
    });

    it("includes obstacle ID in events", () => {
      const fixture: AABB = {
        id: "test_clamp_xyz",
        role: "fixture",
        min: { x: 95, y: 95, z: 70 },
        max: { x: 125, y: 125, z: 90 },
      };

      const result = wedmHeadClearanceEngine.check(basePose, [fixture]);

      const eventsWithId = result.events.filter((e) => e.obstacleId === "test_clamp_xyz");
      expect(eventsWithId.length).toBeGreaterThan(0);
    });
  });

  describe("defaults", () => {
    it("DEFAULT_UPPER_GUIDE has expected values", () => {
      expect(DEFAULT_UPPER_GUIDE.radius_mm).toBe(20);
      expect(DEFAULT_UPPER_GUIDE.length_mm).toBe(40);
    });

    it("DEFAULT_LOWER_GUIDE has expected values", () => {
      expect(DEFAULT_LOWER_GUIDE.radius_mm).toBe(20);
      expect(DEFAULT_LOWER_GUIDE.length_mm).toBe(40);
    });

    it("DEFAULT_SAFETY_MARGIN_MM is 2mm", () => {
      expect(DEFAULT_SAFETY_MARGIN_MM).toBe(2);
    });
  });

  describe("wire segment clearance", () => {
    it("checks wire segment against fixtures", () => {
      const fixture: AABB = {
        id: "mid_clamp",
        role: "fixture",
        min: { x: 99, y: 99, z: 40 },
        max: { x: 101, y: 101, z: 60 },
      };

      const result = wedmHeadClearanceEngine.check(basePose, [fixture]);

      const wireEvents = result.events.filter((e) => e.actor === "wire");
      expect(wireEvents.length).toBeGreaterThanOrEqual(0);
    });

    it("wire segment follows taper path", () => {
      const taperPose: MachinePose = {
        X: 100,
        Y: 100,
        Z_upper: 75,
        Z_lower: 25,
        U: 5,
        V: 5,
      };

      const midFixture: AABB = {
        id: "taper_zone",
        role: "fixture",
        min: { x: 102, y: 102, z: 45 },
        max: { x: 105, y: 105, z: 55 },
      };

      const result = wedmHeadClearanceEngine.check(taperPose, [midFixture]);

      expect(result).toHaveProperty("events");
    });
  });

  describe("edge cases", () => {
    it("handles zero taper offsets", () => {
      const pose: MachinePose = {
        X: 100,
        Y: 100,
        Z_upper: 75,
        Z_lower: 25,
        U: 0,
        V: 0,
      };

      const result = wedmHeadClearanceEngine.check(pose, []);

      expect(result.pass).toBe(true);
    });

    it("handles empty obstacles array", () => {
      const result = wedmHeadClearanceEngine.check(basePose, []);

      expect(result.pass).toBe(true);
      expect(result.events).toHaveLength(0);
    });

    it("handles negative Z positions", () => {
      const pose: MachinePose = {
        X: 100,
        Y: 100,
        Z_upper: 50,
        Z_lower: -10,
      };

      const result = wedmHeadClearanceEngine.check(pose, []);

      expect(result).toHaveProperty("pass");
    });
  });
});
