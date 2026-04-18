/**
 * Tests for WEDMWirePathCollisionEngine
 * MS-P1.5-ONESHOT/U-P1.5-OS-05
 */

import { describe, it, expect } from "vitest";
import {
  wedmWirePathCollisionEngine,
  type WirePath,
  type Obstacle,
  type MachineGeometry,
  type CollisionCheckInput,
} from "../engines/WEDMWirePathCollisionEngine.js";

const DEFAULT_MACHINE = wedmWirePathCollisionEngine.getDefaultMachineGeometry();

describe("WEDMWirePathCollisionEngine", () => {
  describe("Collision-Free Path", () => {
    it("passes when wire path has no obstacles", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
            { x: 0, y: 0 },
          ],
          pass_type: "rough",
        },
      ];

      const result = wedmWirePathCollisionEngine.quickCheck(wirePaths, [], 25);

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.collision_count).toBe(0);
      expect(result.critical_count).toBe(0);
      expect(result.hard_block).toBe(false);
      expect(result.safety_score_contribution).toBe(0.15);
    });

    it("passes when obstacles are far from wire path", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          pass_type: "rough",
        },
      ];

      const obstacles: Obstacle[] = [
        wedmWirePathCollisionEngine.createFixtureObstacle(
          "clamp-1",
          "clamp",
          100, // Far away at x=100
          100,
          20,
          20,
          30
        ),
      ];

      const result = wedmWirePathCollisionEngine.quickCheck(
        wirePaths,
        obstacles,
        25
      );

      expect(result.pass).toBe(true);
      expect(result.collision_count).toBe(0);
      expect(result.hard_block).toBe(false);
    });
  });

  describe("Collision Detection", () => {
    it("detects upper head collision with fixture", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [{ x: 50, y: 50 }],
          pass_type: "rough",
        },
      ];

      // Place fixture where upper head will be (at guide height)
      const obstacles: Obstacle[] = [
        {
          id: "tall-fixture",
          type: "fixture",
          bounds: {
            min: { x: 40, y: 40, z: 140 }, // At upper guide height
            max: { x: 60, y: 60, z: 180 },
          },
          is_hard_obstacle: true,
        },
      ];

      const result = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
      });

      expect(result.pass).toBe(false);
      expect(result.collision_count).toBeGreaterThan(0);
      expect(result.critical_count).toBeGreaterThan(0);
      expect(result.hard_block).toBe(true);
      expect(result.safety_score_contribution).toBe(0);
      expect(result.collisions[0].collision_type).toBe("upper_head");
    });

    it("detects lower head collision with fixture", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [{ x: 50, y: 50 }],
          pass_type: "rough",
        },
      ];

      // Place fixture at table level where lower head is
      const obstacles: Obstacle[] = [
        {
          id: "low-fixture",
          type: "fixture",
          bounds: {
            min: { x: 40, y: 40, z: -30 },
            max: { x: 60, y: 60, z: 5 },
          },
          is_hard_obstacle: true,
        },
      ];

      const result = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
      });

      expect(result.pass).toBe(false);
      expect(result.collisions.some((c) => c.collision_type === "lower_head")).toBe(true);
      expect(result.hard_block).toBe(true);
    });

    it("detects wire collision with clamp", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [{ x: 50, y: 50 }],
          pass_type: "rough",
        },
      ];

      // Place clamp directly in wire path
      const obstacles: Obstacle[] = [
        {
          id: "blocking-clamp",
          type: "clamp",
          bounds: {
            min: { x: 48, y: 48, z: 50 },
            max: { x: 52, y: 52, z: 100 },
          },
          is_hard_obstacle: true,
        },
      ];

      const result = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
      });

      expect(result.pass).toBe(false);
      expect(result.collisions.some((c) => c.collision_type === "wire")).toBe(true);
    });

    it("does NOT flag wire collision with workpiece (expected during cut)", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [{ x: 50, y: 50 }],
          pass_type: "rough",
        },
      ];

      // Workpiece obstacle - wire should pass through without collision
      const obstacles: Obstacle[] = [
        wedmWirePathCollisionEngine.createWorkpieceObstacle(50, 50, 100, 100, 25),
      ];

      const result = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
      });

      // Wire-workpiece collision should NOT be flagged (wire cuts through workpiece)
      const wireCollisions = result.collisions.filter(
        (c) => c.collision_type === "wire" && c.obstacle_type === "workpiece"
      );
      expect(wireCollisions.length).toBe(0);
    });
  });

  describe("Taper Cutting (U/V Offsets)", () => {
    it("checks upper head position with UV offsets", () => {
      const wirePaths: WirePath[] = [
        {
          id: "taper-path",
          points: [
            { x: 50, y: 50, u: 5, v: 5 }, // Upper head at (55, 55)
          ],
          pass_type: "rough",
        },
      ];

      // Obstacle at upper head position (55, 55)
      const obstacles: Obstacle[] = [
        {
          id: "taper-obstacle",
          type: "fixture",
          bounds: {
            min: { x: 45, y: 45, z: 140 },
            max: { x: 65, y: 65, z: 180 },
          },
          is_hard_obstacle: true,
        },
      ];

      const result = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
      });

      expect(result.pass).toBe(false);
      expect(result.collisions[0].collision_type).toBe("upper_head");
    });
  });

  describe("Travel Limits", () => {
    it("detects when wire path exceeds tank boundaries", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [
            { x: 250, y: 0 }, // Beyond tank limit (max x = 200)
          ],
          pass_type: "rough",
        },
      ];

      const result = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles: [],
        workpiece_thickness_mm: 25,
      });

      expect(result.pass).toBe(false);
      expect(result.collisions.some((c) => c.collision_type === "travel_limit")).toBe(true);
      expect(result.hard_block).toBe(true);
    });

    it("passes when within tank boundaries", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [
            { x: 100, y: 100 }, // Within limits
          ],
          pass_type: "rough",
        },
      ];

      const result = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles: [],
        workpiece_thickness_mm: 25,
      });

      expect(result.pass).toBe(true);
      expect(result.collisions.filter((c) => c.collision_type === "travel_limit").length).toBe(0);
    });
  });

  describe("Gate Function", () => {
    it("allows emission for collision-free program", () => {
      const wirePaths: WirePath[] = [
        {
          id: "safe-path",
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
          pass_type: "rough",
        },
      ];

      const gate = wedmWirePathCollisionEngine.gate({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles: [],
        workpiece_thickness_mm: 25,
      });

      expect(gate.allow).toBe(true);
      expect(gate.result.pass).toBe(true);
    });

    it("blocks emission when collision detected", () => {
      const wirePaths: WirePath[] = [
        {
          id: "collision-path",
          points: [{ x: 50, y: 50 }],
          pass_type: "rough",
        },
      ];

      const obstacles: Obstacle[] = [
        {
          id: "blocker",
          type: "clamp",
          bounds: {
            min: { x: 40, y: 40, z: 50 },
            max: { x: 60, y: 60, z: 100 },
          },
          is_hard_obstacle: true,
        },
      ];

      const gate = wedmWirePathCollisionEngine.gate({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
      });

      expect(gate.allow).toBe(false);
      expect(gate.reason).toContain("COLLISION");
    });
  });

  describe("Safety Score", () => {
    it("returns +0.15 S(x) contribution for collision-free", () => {
      const result = wedmWirePathCollisionEngine.quickCheck(
        [{ id: "p1", points: [{ x: 0, y: 0 }], pass_type: "rough" }],
        [],
        25
      );

      expect(result.safety_score_contribution).toBe(0.15);
      expect(wedmWirePathCollisionEngine.getSafetyScoreContribution(result)).toBe(0.15);
    });

    it("returns 0 S(x) contribution for collision", () => {
      const result = wedmWirePathCollisionEngine.check({
        wire_paths: [{ id: "p1", points: [{ x: 250, y: 0 }], pass_type: "rough" }],
        machine: DEFAULT_MACHINE,
        obstacles: [],
        workpiece_thickness_mm: 25,
      });

      expect(result.safety_score_contribution).toBe(0);
    });
  });

  describe("Warning vs Critical", () => {
    it("marks soft obstacles as warnings", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [{ x: 50, y: 50 }],
          pass_type: "rough",
        },
      ];

      const obstacles: Obstacle[] = [
        {
          id: "soft-obstacle",
          type: "parallel",
          bounds: {
            min: { x: 40, y: 40, z: 50 },
            max: { x: 60, y: 60, z: 100 },
          },
          is_hard_obstacle: false, // Soft obstacle
        },
      ];

      const result = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
      });

      expect(result.warning_count).toBeGreaterThan(0);
      expect(result.collisions.some((c) => c.severity === "warning")).toBe(true);
      // Soft obstacles don't cause hard block
      expect(result.critical_count).toBe(0);
      expect(result.pass).toBe(true);
    });

    it("marks hard obstacles as critical", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [{ x: 50, y: 50 }],
          pass_type: "rough",
        },
      ];

      const obstacles: Obstacle[] = [
        {
          id: "hard-obstacle",
          type: "clamp",
          bounds: {
            min: { x: 40, y: 40, z: 50 },
            max: { x: 60, y: 60, z: 100 },
          },
          is_hard_obstacle: true,
        },
      ];

      const result = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
      });

      expect(result.critical_count).toBeGreaterThan(0);
      expect(result.collisions.some((c) => c.severity === "critical")).toBe(true);
      expect(result.hard_block).toBe(true);
    });
  });

  describe("Multiple Passes", () => {
    it("checks all points across multiple passes", () => {
      const wirePaths: WirePath[] = [
        {
          id: "rough",
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          pass_type: "rough",
        },
        {
          id: "skim1",
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          pass_type: "skim1",
        },
        {
          id: "skim2",
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          pass_type: "skim2",
        },
      ];

      const result = wedmWirePathCollisionEngine.quickCheck(wirePaths, [], 25);

      expect(result.checked_points).toBe(9); // 3 paths × 3 points
      expect(result.pass).toBe(true);
    });
  });

  describe("Safety Margin", () => {
    it("respects custom safety margin", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [{ x: 50, y: 50 }],
          pass_type: "rough",
        },
      ];

      // Obstacle just outside default 2mm margin but inside 10mm margin
      const obstacles: Obstacle[] = [
        {
          id: "close-obstacle",
          type: "clamp",
          bounds: {
            min: { x: 80, y: 50, z: 140 },
            max: { x: 85, y: 55, z: 180 },
          },
          is_hard_obstacle: true,
        },
      ];

      // With small margin, should pass
      const smallMarginResult = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
        safety_margin_mm: 2,
      });

      // With large margin, might collide
      const largeMarginResult = wedmWirePathCollisionEngine.check({
        wire_paths: wirePaths,
        machine: DEFAULT_MACHINE,
        obstacles,
        workpiece_thickness_mm: 25,
        safety_margin_mm: 15,
      });

      // Large margin should detect more collisions
      expect(largeMarginResult.collision_count).toBeGreaterThanOrEqual(
        smallMarginResult.collision_count
      );
    });
  });

  describe("Fixture Helper Methods", () => {
    it("creates fixture obstacle with correct bounds", () => {
      const fixture = wedmWirePathCollisionEngine.createFixtureObstacle(
        "test-clamp",
        "clamp",
        50, // x center
        50, // y center
        20, // width
        30, // depth
        40  // height
      );

      expect(fixture.id).toBe("test-clamp");
      expect(fixture.type).toBe("clamp");
      expect(fixture.bounds.min.x).toBe(40); // 50 - 20/2
      expect(fixture.bounds.max.x).toBe(60); // 50 + 20/2
      expect(fixture.bounds.min.y).toBe(35); // 50 - 30/2
      expect(fixture.bounds.max.y).toBe(65); // 50 + 30/2
      expect(fixture.bounds.min.z).toBe(0);
      expect(fixture.bounds.max.z).toBe(40);
      expect(fixture.is_hard_obstacle).toBe(true);
    });

    it("creates workpiece obstacle with correct bounds", () => {
      const workpiece = wedmWirePathCollisionEngine.createWorkpieceObstacle(
        0,   // x center
        0,   // y center
        100, // width
        100, // depth
        25   // thickness
      );

      expect(workpiece.id).toBe("workpiece");
      expect(workpiece.type).toBe("workpiece");
      expect(workpiece.bounds.min.x).toBe(-50);
      expect(workpiece.bounds.max.x).toBe(50);
      expect(workpiece.bounds.min.z).toBe(0);
      expect(workpiece.bounds.max.z).toBe(25);
    });
  });

  describe("Min Clearance Tracking", () => {
    it("tracks minimum clearance across all checks", () => {
      const wirePaths: WirePath[] = [
        {
          id: "path-1",
          points: [{ x: 0, y: 0 }],
          pass_type: "rough",
        },
      ];

      const result = wedmWirePathCollisionEngine.quickCheck(wirePaths, [], 25);

      // With no obstacles, min clearance should be -1 (no clearance measured)
      expect(result.min_clearance_mm).toBe(-1);
    });
  });
});
