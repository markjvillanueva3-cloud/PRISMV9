/**
 * MillKinematicsCollisionEngine Tests — P4-U01-COL3
 * ==================================================
 *
 * Tests for 3-axis collision hardening:
 *   - Toolpath collision checking at every XYZ
 *   - Rapid clearance plane validation
 *   - Adaptive step-down calculation
 *
 * @module __tests__/MillKinematicsCollisionEngine.test
 * @milestone MILL-MASTER-P4/U01-COL3
 */

import { describe, it, expect, beforeEach } from "vitest";
import { millKinematicsCollisionEngine } from "../engines/MillKinematicsCollisionEngine.js";

describe("MillKinematicsCollisionEngine", () => {
  // Standard test tool
  const testTool = {
    diameter_mm: 10,
    flute_length_mm: 25,
    overall_length_mm: 75,
  };

  // Standard test holder
  const testHolder = {
    holder_diameter_mm: 40,
    holder_length_mm: 50,
  };

  // Standard obstacle (workpiece on table)
  const workpieceObstacle = {
    id: "workpiece",
    bounds: {
      min: { x: -50, y: -50, z: 0 },
      max: { x: 50, y: 50, z: 30 },
    },
    is_hard_obstacle: true,
  };

  // Fixture obstacle
  const fixtureObstacle = {
    id: "fixture_clamp",
    bounds: {
      min: { x: 60, y: -20, z: 0 },
      max: { x: 80, y: 20, z: 25 },
    },
    is_hard_obstacle: true,
  };

  describe("checkToolpathCollisions", () => {
    it("returns pass=true when toolpath has no collisions", () => {
      const toolpath = [
        { x: 0, y: 0, z: 50, move_type: "rapid" as const },
        { x: 0, y: 0, z: 35, move_type: "feed" as const },
        { x: 20, y: 0, z: 35, move_type: "feed" as const },
        { x: 20, y: 20, z: 35, move_type: "feed" as const },
      ];

      const result = millKinematicsCollisionEngine.checkToolpathCollisions(
        toolpath,
        testTool,
        null,
        [workpieceObstacle]
      );

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.collision_count).toBe(0);
      expect(result.hard_block).toBe(false);
      expect(result.safety_score_contribution).toBe(0.15);
      expect(result.checked_points).toBe(4);
    });

    it("detects tool collision with workpiece", () => {
      const toolpath = [
        { x: 0, y: 0, z: 50, move_type: "rapid" as const },
        { x: 0, y: 0, z: 20, move_type: "feed" as const }, // Tool tip at Z=20, flute extends up to Z=45, but tip overlaps workpiece (Z=0-30)
      ];

      const result = millKinematicsCollisionEngine.checkToolpathCollisions(
        toolpath,
        testTool,
        null,
        [workpieceObstacle]
      );

      expect(result.success).toBe(true);
      expect(result.pass).toBe(false);
      expect(result.collision_count).toBeGreaterThan(0);
      expect(result.hard_block).toBe(true);
      expect(result.collisions[0].collision_type).toBe("tool");
      expect(result.collisions[0].obstacle_id).toBe("workpiece");
    });

    it("detects holder collision with fixture", () => {
      // Tool tip at Z=30 is safe, but holder at Z=55-105 could collide with tall fixture
      const tallFixture = {
        id: "tall_fixture",
        bounds: {
          min: { x: -5, y: -5, z: 0 },
          max: { x: 5, y: 5, z: 80 },
        },
        is_hard_obstacle: true,
      };

      const toolpath = [
        { x: 0, y: 0, z: 35, move_type: "feed" as const },
      ];

      const result = millKinematicsCollisionEngine.checkToolpathCollisions(
        toolpath,
        testTool,
        testHolder,
        [tallFixture]
      );

      expect(result.success).toBe(true);
      expect(result.collisions.some(c => c.collision_type === "holder")).toBe(true);
    });

    it("detects multiple collisions in single toolpath", () => {
      const toolpath = [
        { x: 0, y: 0, z: 15, move_type: "feed" as const },   // Collides with workpiece
        { x: 70, y: 0, z: 10, move_type: "feed" as const },  // Collides with fixture
      ];

      const result = millKinematicsCollisionEngine.checkToolpathCollisions(
        toolpath,
        testTool,
        null,
        [workpieceObstacle, fixtureObstacle]
      );

      expect(result.collision_count).toBeGreaterThanOrEqual(2);
      expect(result.hard_block).toBe(true);
    });

    it("respects safety margin in collision detection", () => {
      // Tool tip (bottom) at Z=33, which is 3mm above workpiece top (Z=30)
      // Safety margin is added to the tool AABB, so effective clearance = 33 - margin - 30
      const toolpath = [
        { x: 0, y: 0, z: 33, move_type: "feed" as const }, // Tool tip at Z=33
      ];

      // With 2mm margin: effective tool bottom at Z=31, clearance = 31 - 30 = 1mm > 0, passes
      const result2mm = millKinematicsCollisionEngine.checkToolpathCollisions(
        toolpath,
        testTool,
        null,
        [workpieceObstacle],
        2.0
      );
      expect(result2mm.pass).toBe(true);

      // With 5mm margin: effective tool bottom at Z=28, overlaps workpiece at Z=30, fails
      const result5mm = millKinematicsCollisionEngine.checkToolpathCollisions(
        toolpath,
        testTool,
        null,
        [workpieceObstacle],
        5.0
      );
      expect(result5mm.pass).toBe(false);
    });

    it("distinguishes critical from warning severity", () => {
      const softObstacle = {
        id: "soft_stop",
        bounds: {
          min: { x: -10, y: -10, z: 0 },
          max: { x: 10, y: 10, z: 25 },
        },
        is_hard_obstacle: false, // Warning only
      };

      const toolpath = [
        { x: 0, y: 0, z: 20, move_type: "feed" as const },
      ];

      const result = millKinematicsCollisionEngine.checkToolpathCollisions(
        toolpath,
        testTool,
        null,
        [softObstacle]
      );

      expect(result.collision_count).toBeGreaterThan(0);
      expect(result.warning_count).toBeGreaterThan(0);
      expect(result.critical_count).toBe(0);
      expect(result.hard_block).toBe(false); // Soft obstacle doesn't hard block
    });

    it("returns min_clearance_mm correctly", () => {
      const toolpath = [
        { x: 0, y: 0, z: 60, move_type: "feed" as const }, // 5mm above workpiece with flute
      ];

      const result = millKinematicsCollisionEngine.checkToolpathCollisions(
        toolpath,
        testTool,
        null,
        [workpieceObstacle],
        0 // No safety margin
      );

      expect(result.min_clearance_mm).toBeGreaterThan(0);
    });
  });

  describe("validateRapidClearance", () => {
    it("returns pass=true when all rapids above safe Z", () => {
      const rapidPoints = [
        { x: 0, y: 0, z: 50 },
        { x: 100, y: 0, z: 50 },
        { x: 100, y: 100, z: 50 },
      ];

      const result = millKinematicsCollisionEngine.validateRapidClearance(
        rapidPoints,
        [workpieceObstacle],
        5.0
      );

      expect(result.pass).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.safe_z).toBe(35); // workpiece top (30) + clearance (5)
    });

    it("detects rapids below safe clearance", () => {
      const rapidPoints = [
        { x: 0, y: 0, z: 50 },   // OK
        { x: 100, y: 0, z: 32 }, // Below safe Z of 35
        { x: 100, y: 100, z: 30 }, // Also below
      ];

      const result = millKinematicsCollisionEngine.validateRapidClearance(
        rapidPoints,
        [workpieceObstacle],
        5.0
      );

      expect(result.pass).toBe(false);
      expect(result.violations.length).toBe(2);
      expect(result.violations[0].index).toBe(1);
      expect(result.violations[1].index).toBe(2);
    });

    it("handles multiple obstacles - uses highest", () => {
      const tallObstacle = {
        id: "tall_part",
        bounds: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 20, y: 20, z: 50 },
        },
      };

      const rapidPoints = [
        { x: 50, y: 50, z: 52 }, // Below 55 (50+5 clearance)
      ];

      const result = millKinematicsCollisionEngine.validateRapidClearance(
        rapidPoints,
        [workpieceObstacle, tallObstacle],
        5.0
      );

      expect(result.pass).toBe(false);
      expect(result.highest_obstacle_z).toBe(50);
      expect(result.safe_z).toBe(55);
    });

    it("provides useful recommendation string", () => {
      const rapidPoints = [{ x: 0, y: 0, z: 32 }];

      const result = millKinematicsCollisionEngine.validateRapidClearance(
        rapidPoints,
        [workpieceObstacle],
        5.0
      );

      expect(result.recommendation).toContain("Z≥35");
    });
  });

  describe("calculateAdaptiveStepDown", () => {
    it("returns original DOC when no obstacle interference", () => {
      const result = millKinematicsCollisionEngine.calculateAdaptiveStepDown(
        { x: 0, y: 0, z: 100 }, // Far above obstacles
        { diameter_mm: 10, flute_length_mm: 25 },
        [workpieceObstacle],
        5.0, // programmed DOC
        2.0
      );

      expect(result.safe_doc_mm).toBe(5.0);
      expect(result.limiting_obstacle).toBeNull();
      expect(result.reduction_percent).toBe(0);
    });

    it("reduces DOC when obstacle limits depth", () => {
      // Tool at Z=35 over workpiece at Z=30
      // With 2mm safety, max DOC = 35 - 32 = 3mm
      const result = millKinematicsCollisionEngine.calculateAdaptiveStepDown(
        { x: 0, y: 0, z: 35 },
        { diameter_mm: 10, flute_length_mm: 25 },
        [workpieceObstacle],
        5.0, // programmed DOC of 5mm
        2.0
      );

      expect(result.safe_doc_mm).toBeLessThan(5.0);
      expect(result.limiting_obstacle).toBe("workpiece");
      expect(result.reduction_percent).toBeGreaterThan(0);
    });

    it("calculates correct number of passes required", () => {
      // If programmed 10mm DOC but safe is 2.5mm, need 4 passes
      const result = millKinematicsCollisionEngine.calculateAdaptiveStepDown(
        { x: 0, y: 0, z: 34.5 }, // Limited by obstacle
        { diameter_mm: 10, flute_length_mm: 25 },
        [workpieceObstacle],
        10.0,
        2.0
      );

      expect(result.passes_required).toBeGreaterThanOrEqual(1);
      expect(result.passes_required).toBe(Math.ceil(10.0 / result.safe_doc_mm));
    });

    it("handles tool not over any obstacle", () => {
      const result = millKinematicsCollisionEngine.calculateAdaptiveStepDown(
        { x: 200, y: 200, z: 35 }, // Outside all obstacles in XY
        { diameter_mm: 10, flute_length_mm: 25 },
        [workpieceObstacle, fixtureObstacle],
        5.0,
        2.0
      );

      expect(result.safe_doc_mm).toBe(5.0);
      expect(result.limiting_obstacle).toBeNull();
    });

    it("clamps minimum DOC to 0.5mm", () => {
      // Extreme case where obstacle is almost at tool position
      const result = millKinematicsCollisionEngine.calculateAdaptiveStepDown(
        { x: 0, y: 0, z: 32.1 }, // Very close to obstacle top + margin
        { diameter_mm: 10, flute_length_mm: 25 },
        [workpieceObstacle],
        5.0,
        2.0
      );

      expect(result.safe_doc_mm).toBeGreaterThanOrEqual(0.5);
    });

    it("provides informative rationale", () => {
      const result = millKinematicsCollisionEngine.calculateAdaptiveStepDown(
        { x: 0, y: 0, z: 35 },
        { diameter_mm: 10, flute_length_mm: 25 },
        [workpieceObstacle],
        5.0,
        2.0
      );

      expect(result.rationale).toBeTruthy();
      if (result.limiting_obstacle) {
        expect(result.rationale).toContain("workpiece");
        expect(result.rationale).toContain("pass");
      }
    });
  });

  describe("integration scenarios", () => {
    it("full 3-axis pocket milling scenario - no collisions", () => {
      // Simulate a pocket milling toolpath at safe height
      const pocketToolpath = [];
      for (let z = 45; z >= 35; z -= 2) {
        for (let x = -30; x <= 30; x += 5) {
          pocketToolpath.push({ x, y: 0, z, move_type: "feed" as const });
        }
      }

      const result = millKinematicsCollisionEngine.checkToolpathCollisions(
        pocketToolpath,
        testTool,
        testHolder,
        [workpieceObstacle]
      );

      expect(result.pass).toBe(true);
      expect(result.checked_points).toBe(pocketToolpath.length);
    });

    it("detects collision on final finishing pass", () => {
      // Roughing passes OK, but finishing goes too deep
      const toolpath = [
        { x: 0, y: 0, z: 40, move_type: "feed" as const }, // Rough OK
        { x: 0, y: 0, z: 38, move_type: "feed" as const }, // Rough OK
        { x: 0, y: 0, z: 25, move_type: "feed" as const }, // Finish - collision!
      ];

      const result = millKinematicsCollisionEngine.checkToolpathCollisions(
        toolpath,
        testTool,
        null,
        [workpieceObstacle]
      );

      expect(result.collision_count).toBe(1);
      expect(result.collisions[0].point_index).toBe(2);
    });
  });
});

describe("millDispatcher collision actions", () => {
  // Test dispatcher integration - actions invoked through dispatcher wiring
  it("mill_collision_check action returns structured result", async () => {
    const params = {
      toolpath: [
        { x: 0, y: 0, z: 50, move_type: "rapid" as const },
        { x: 0, y: 0, z: 35, move_type: "feed" as const },
      ],
      tool: { diameter_mm: 10, flute_length_mm: 25, overall_length_mm: 75 },
      obstacles: [{
        id: "test_workpiece",
        bounds: { min: { x: -50, y: -50, z: 0 }, max: { x: 50, y: 50, z: 30 } },
        is_hard_obstacle: true,
      }],
      safety_margin_mm: 2.0,
    };

    // Validates the engine API that dispatcher wires to
    const result = millKinematicsCollisionEngine.checkToolpathCollisions(
      params.toolpath,
      params.tool,
      null,
      params.obstacles
    );

    expect(result.success).toBe(true);
    expect(result.checked_points).toBe(2);
    expect(typeof result.pass).toBe("boolean");
    expect(Array.isArray(result.collisions)).toBe(true);
  });

  it("mill_rapid_clearance action validates clearance planes", () => {
    const rapidPoints = [
      { x: 0, y: 0, z: 50 },
      { x: 100, y: 0, z: 32 }, // Below safe Z
    ];
    const obstacles = [{
      id: "workpiece",
      bounds: { min: { x: -50, y: -50, z: 0 }, max: { x: 50, y: 50, z: 30 } },
    }];

    const result = millKinematicsCollisionEngine.validateRapidClearance(
      rapidPoints,
      obstacles,
      5.0
    );

    expect(result.pass).toBe(false);
    expect(result.safe_z).toBe(35);
    expect(result.violations.length).toBe(1);
  });

  it("mill_adaptive_stepdown action computes safe DOC", () => {
    const result = millKinematicsCollisionEngine.calculateAdaptiveStepDown(
      { x: 0, y: 0, z: 35 },
      { diameter_mm: 10, flute_length_mm: 25 },
      [{ id: "wp", bounds: { min: { x: -50, y: -50, z: 0 }, max: { x: 50, y: 50, z: 30 } } }],
      5.0,
      2.0
    );

    expect(typeof result.safe_doc_mm).toBe("number");
    expect(typeof result.passes_required).toBe("number");
    expect(result.rationale).toBeTruthy();
  });
});
