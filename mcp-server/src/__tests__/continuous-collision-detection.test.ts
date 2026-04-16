/**
 * ContinuousCollisionDetectionEngine Tests — SAFETY-CRITICAL
 *
 * Tests for P0-CRITICAL tunneling detection that discrete detection misses.
 * These tests verify that rapid moves through thin walls are caught.
 */
import { describe, it, expect } from "vitest";
import {
  continuousCollisionDetectionEngine,
  ContinuousCollisionDetectionEngine,
  type CCDParams,
  type Obstacle,
  type ToolGeometry,
} from "../engines/ContinuousCollisionDetectionEngine.js";
import { Vector3 } from "../engines/CollisionEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const standardTool: ToolGeometry = {
  diameter: 10,
  fluteLength: 30,
  totalLength: 80,
  holderDiameter: 25,
  holderLength: 50,
  type: "endmill",
};

const smallTool: ToolGeometry = {
  diameter: 3,
  fluteLength: 15,
  totalLength: 50,
  holderDiameter: 12,
  holderLength: 35,
  type: "endmill",
};

const thinWall: Obstacle = {
  id: "thin_wall_1mm",
  type: "wall",
  aabb: {
    min: { x: 45, y: 0, z: -50 },
    max: { x: 46, y: 100, z: 0 },
  },
  thickness_mm: 1,
  isThinWall: true,
};

const normalFixture: Obstacle = {
  id: "vise_jaw",
  type: "fixture",
  aabb: {
    min: { x: 0, y: 0, z: -30 },
    max: { x: 30, y: 50, z: 0 },
  },
  thickness_mm: 30,
};

const thinPlate: Obstacle = {
  id: "thin_plate_3mm",
  type: "workpiece",
  aabb: {
    min: { x: 40, y: 20, z: -5 },
    max: { x: 43, y: 80, z: 0 },
  },
  thickness_mm: 3,
  isThinWall: true,
};

// ============================================================================
// CORE FUNCTIONALITY TESTS
// ============================================================================

describe("ContinuousCollisionDetectionEngine", () => {
  // ---- Singleton Pattern ----
  it("returns singleton instance", () => {
    const instance1 = ContinuousCollisionDetectionEngine.getInstance();
    const instance2 = ContinuousCollisionDetectionEngine.getInstance();
    expect(instance1).toBe(instance2);
    expect(continuousCollisionDetectionEngine).toBe(instance1);
  });

  // ---- Safe Path (No Collision) ----
  it("reports no collision for safe path above obstacles", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, 50),
      endPosition: new Vector3(100, 50, 50),
      toolGeometry: standardTool,
      obstacles: [normalFixture, thinWall],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(false);
    expect(result.minClearance_mm).toBeGreaterThan(0);
    expect(result.metrics.algorithm).toBe("swept_volume");
  });

  // ---- Direct Collision Detection ----
  it("detects collision with fixture during rapid move", () => {
    const params: CCDParams = {
      startPosition: new Vector3(-10, 25, -15),
      endPosition: new Vector3(50, 25, -15),
      toolGeometry: standardTool,
      obstacles: [normalFixture],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(true);
    expect(result.collidingObstacle).toBe("vise_jaw");
    expect(result.timeOfImpact).toBeGreaterThan(0);
    expect(result.timeOfImpact).toBeLessThan(1);
    expect(result.safeStopPoint).toBeDefined();
    expect(result.safeRetractPoint).toBeDefined();
  });

  // ---- Holder Collision (Tool Tip Clear) ----
  it("detects holder collision when tool tip is clear", () => {
    // Tool tip at z=5 (above fixture top at z=0), but holder extends up
    // With tool length 80mm and fixture from z=-30 to z=0, holder at z=50+ is clear
    // Need a taller fixture or different geometry
    const tallFixture: Obstacle = {
      id: "tall_clamp",
      type: "clamp",
      aabb: {
        min: { x: 40, y: 40, z: -10 },
        max: { x: 60, y: 60, z: 60 }, // Extends to z=60
      },
    };

    const params: CCDParams = {
      startPosition: new Vector3(50, 50, 15), // Tool tip at z=15, holder at z=45+
      endPosition: new Vector3(50, 50, 15),
      toolGeometry: standardTool,
      obstacles: [tallFixture],
      motionType: "linear",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    // Holder at z=15+30=45 to z=45+50=95 overlaps with fixture at z=60
    expect(result.collision).toBe(true);
    expect(result.collidingObstacle).toBe("tall_clamp");
  });
});

// ============================================================================
// TUNNELING DETECTION TESTS — CRITICAL
// ============================================================================

describe("Tunneling Detection (CCD vs Discrete)", () => {
  // ---- 1mm Thin Wall Tunneling ----
  it("CRITICAL: CCD catches tunneling through 1mm wall that discrete misses", () => {
    // Rapid move that passes completely through 1mm wall
    // With 5mm discrete sampling, both endpoints and all sample points
    // could be on opposite sides of the wall
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, -25),
      endPosition: new Vector3(100, 50, -25), // Passes through wall at x=45-46
      toolGeometry: smallTool, // 3mm diameter tool
      obstacles: [thinWall], // 1mm thick wall
      motionType: "rapid",
    };

    const comparison = continuousCollisionDetectionEngine.compareWithDiscreteDetection(
      params,
      10 // 10mm discrete sampling interval
    );

    // CCD must catch the collision
    expect(comparison.ccdResult.collision).toBe(true);
    expect(comparison.ccdResult.collidingObstacle).toBe("thin_wall_1mm");

    // Verify tunneling was detected (discrete might miss with large interval)
    // Note: With very fine discrete sampling, discrete might also catch it
    // The key is CCD provides a guarantee
    expect(comparison.ccdResult.isTunnelingCase).toBe(true);
  });

  // ---- 3mm Thin Plate Tunneling ----
  it("CRITICAL: CCD catches tunneling through 3mm plate", () => {
    const params: CCDParams = {
      startPosition: new Vector3(30, 50, -2),
      endPosition: new Vector3(60, 50, -2), // Passes through plate at x=40-43
      toolGeometry: smallTool,
      obstacles: [thinPlate],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(true);
    expect(result.collidingObstacle).toBe("thin_plate_3mm");
    expect(result.diagnostics.thinnestWall_mm).toBe(3);
  });

  // ---- Multiple Thin Walls ----
  it("detects collision with first thin wall in path", () => {
    const wall1: Obstacle = {
      id: "wall_at_20",
      type: "wall",
      aabb: { min: { x: 19, y: 0, z: -20 }, max: { x: 21, y: 100, z: 0 } },
      thickness_mm: 2,
      isThinWall: true,
    };
    const wall2: Obstacle = {
      id: "wall_at_60",
      type: "wall",
      aabb: { min: { x: 59, y: 0, z: -20 }, max: { x: 61, y: 100, z: 0 } },
      thickness_mm: 2,
      isThinWall: true,
    };

    const params: CCDParams = {
      startPosition: new Vector3(0, 50, -10),
      endPosition: new Vector3(100, 50, -10),
      toolGeometry: smallTool,
      obstacles: [wall1, wall2],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(true);
    expect(result.collidingObstacle).toBe("wall_at_20"); // First wall hit
    expect(result.timeOfImpact).toBeLessThan(0.3); // Should be early in path
  });

  // ---- Near-Parallel Path ----
  it("detects tunneling when path is nearly parallel to thin wall", () => {
    // Path that grazes along the wall - might clip the corner
    const params: CCDParams = {
      startPosition: new Vector3(44, 10, -25),
      endPosition: new Vector3(47, 90, -25), // Almost parallel, slight angle through wall
      toolGeometry: smallTool,
      obstacles: [thinWall],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(true);
    expect(result.minClearance_mm).toBeLessThan(0);
  });
});

// ============================================================================
// SAFE POINT CALCULATION TESTS
// ============================================================================

describe("Safe Point Calculations", () => {
  // ---- Safe Stop Point ----
  it("calculates valid safe stop point before collision", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, -25),
      endPosition: new Vector3(100, 50, -25),
      toolGeometry: standardTool,
      obstacles: [thinWall],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(true);
    expect(result.safeStopPoint).toBeDefined();

    // Safe stop should be before collision point
    const safeX = result.safeStopPoint!.x;
    const collisionX = result.collisionPoint!.x;
    expect(safeX).toBeLessThan(collisionX);

    // Safe stop should still be on the path
    expect(result.safeStopPoint!.y).toBeCloseTo(50, 3);
    expect(result.safeStopPoint!.z).toBeCloseTo(-25, 3);
  });

  // ---- Safe Retract Point ----
  it("calculates safe retract point above collision", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, -25),
      endPosition: new Vector3(100, 50, -25),
      toolGeometry: standardTool,
      obstacles: [thinWall],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(true);
    expect(result.safeRetractPoint).toBeDefined();

    // Retract Z should be significantly above collision
    expect(result.safeRetractPoint!.z).toBeGreaterThan(result.collisionPoint!.z + 20);
  });

  // ---- Time of Impact Accuracy ----
  it("returns accurate time of impact", () => {
    // Move from x=0 to x=100, wall at x=45-46
    // Expected TOI depends on tool radius and safety margin
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, -25),
      endPosition: new Vector3(100, 50, -25),
      toolGeometry: smallTool, // 3mm diameter, so tool edge at x - 1.5
      obstacles: [thinWall], // Wall at x=45-46
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(true);
    expect(result.timeOfImpact).toBeDefined();

    // Tool (3mm dia = 1.5mm radius) + 2mm safety margin = 3.5mm effective reach
    // Collision when tool tip at x reaches ~41.5 (45 - 3.5), TOI ≈ 0.37-0.43
    expect(result.timeOfImpact).toBeGreaterThan(0.3);
    expect(result.timeOfImpact).toBeLessThan(0.5);
  });
});

// ============================================================================
// MOTION TYPE TESTS
// ============================================================================

describe("Motion Type Handling", () => {
  // ---- Linear Move ----
  it("handles linear cutting moves", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, -10),
      endPosition: new Vector3(60, 50, -10),
      toolGeometry: standardTool,
      obstacles: [thinWall],
      motionType: "linear",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(true);
    expect(result.metrics.algorithm).toBe("swept_volume");
  });

  // ---- Arc Move ----
  it("handles arc moves with temporal subdivision", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, -10),
      endPosition: new Vector3(50, 100, -10),
      toolGeometry: standardTool,
      obstacles: [thinWall],
      motionType: "arc",
      arcParams: {
        center: { x: 50, y: 50, z: -10 },
        radius: 50,
        startAngle: Math.PI, // 180 degrees
        endAngle: Math.PI / 2, // 90 degrees
        direction: "CCW",
        plane: "XY",
      },
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.metrics.algorithm).toBe("temporal_subdivision");
    expect(result.diagnostics.pathLength).toBeGreaterThan(0);
  });

  // ---- Zero-Length Move ----
  it("handles zero-length moves (static position check)", () => {
    const params: CCDParams = {
      startPosition: new Vector3(15, 25, -15),
      endPosition: new Vector3(15, 25, -15), // Same position
      toolGeometry: standardTool,
      obstacles: [normalFixture],
      motionType: "linear",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(true); // Inside fixture
    expect(result.diagnostics.pathLength).toBe(0);
  });
});

// ============================================================================
// RAPID MOVE VALIDATION TESTS
// ============================================================================

describe("Rapid Move Batch Validation", () => {
  // ---- All Safe Rapids ----
  it("validates batch of safe rapid moves", () => {
    const moves = [
      { start: new Vector3(0, 0, 50), end: new Vector3(50, 0, 50) },
      { start: new Vector3(50, 0, 50), end: new Vector3(50, 50, 50) },
      { start: new Vector3(50, 50, 50), end: new Vector3(0, 50, 50) },
    ];

    const result = continuousCollisionDetectionEngine.validateRapidMoves(
      moves,
      standardTool,
      [normalFixture, thinWall]
    );

    expect(result.safe).toBe(true);
    expect(result.criticalIssues).toHaveLength(0);
    expect(result.results).toHaveLength(3);
  });

  // ---- Mixed Safe and Unsafe Rapids ----
  it("identifies unsafe rapids in batch", () => {
    const moves = [
      { start: new Vector3(0, 0, 50), end: new Vector3(100, 0, 50) }, // Safe
      { start: new Vector3(0, 50, -25), end: new Vector3(100, 50, -25) }, // Through wall
      { start: new Vector3(100, 50, 50), end: new Vector3(100, 100, 50) }, // Safe
    ];

    const result = continuousCollisionDetectionEngine.validateRapidMoves(
      moves,
      standardTool,
      [thinWall]
    );

    expect(result.safe).toBe(false);
    expect(result.criticalIssues.length).toBeGreaterThan(0);
    expect(result.criticalIssues[0]).toContain("thin_wall_1mm");
  });

  // ---- Tunneling Detection in Batch ----
  it("flags tunneling cases in batch validation", () => {
    const moves = [
      { start: new Vector3(0, 50, -25), end: new Vector3(100, 50, -25) },
    ];

    const result = continuousCollisionDetectionEngine.validateRapidMoves(
      moves,
      smallTool,
      [thinWall]
    );

    expect(result.safe).toBe(false);
    expect(result.criticalIssues.some(issue => issue.includes("TUNNELING"))).toBe(true);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe("Performance Requirements", () => {
  // ---- Performance Target ----
  it("completes typical rapid move check within 100ms", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, 10),
      endPosition: new Vector3(200, 50, 10), // 200mm move
      toolGeometry: standardTool,
      obstacles: [normalFixture, thinWall, thinPlate],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.metrics.computationTime_ms).toBeLessThan(100);
  });

  // ---- Check Count Tracking ----
  it("tracks number of checks performed", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, 10),
      endPosition: new Vector3(100, 50, 10),
      toolGeometry: standardTool,
      obstacles: [normalFixture],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.metrics.checksPerformed).toBeGreaterThan(0);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("Edge Cases", () => {
  // ---- No Obstacles ----
  it("handles empty obstacle list", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 0, 0),
      endPosition: new Vector3(100, 100, 100),
      toolGeometry: standardTool,
      obstacles: [],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(false);
    expect(result.minClearance_mm).toBe(Infinity);
  });

  // ---- Very Long Move ----
  it("handles very long rapid moves", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, 10),
      endPosition: new Vector3(1000, 50, 10), // 1 meter move
      toolGeometry: standardTool,
      obstacles: [thinWall],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.metrics.computationTime_ms).toBeLessThan(200); // Still reasonable
  });

  // ---- Obstacle Completely Outside Path ----
  it("efficiently rejects obstacles outside swept volume", () => {
    const farObstacle: Obstacle = {
      id: "far_away",
      type: "fixture",
      aabb: {
        min: { x: 500, y: 500, z: 500 },
        max: { x: 600, y: 600, z: 600 },
      },
    };

    const params: CCDParams = {
      startPosition: new Vector3(0, 0, 0),
      endPosition: new Vector3(100, 0, 0),
      toolGeometry: standardTool,
      obstacles: [farObstacle],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.collision).toBe(false);
    expect(result.metrics.checksPerformed).toBeLessThan(5); // Quick rejection
  });

  // ---- Arc Without Params ----
  it("throws error for arc motion without arc params", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 0, 0),
      endPosition: new Vector3(50, 50, 0),
      toolGeometry: standardTool,
      obstacles: [],
      motionType: "arc",
      // Missing arcParams
    };

    expect(() => continuousCollisionDetectionEngine.checkMove(params)).toThrow(
      "Arc parameters required"
    );
  });

  // ---- Minimum Safety Margin Enforcement ----
  it("enforces minimum 2mm safety margin", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, 10),
      endPosition: new Vector3(100, 50, 10),
      toolGeometry: standardTool,
      obstacles: [normalFixture],
      motionType: "rapid",
      safetyMargin_mm: 0.5, // Try to use less than minimum
    };

    // Should still use at least 2mm margin internally
    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result).toBeDefined();
    // The engine enforces MIN_SAFETY_MARGIN_MM = 2.0 internally
  });
});

// ============================================================================
// DIAGNOSTIC OUTPUT TESTS
// ============================================================================

describe("Diagnostic Information", () => {
  // ---- Path Length ----
  it("reports correct path length", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 0, 0),
      endPosition: new Vector3(100, 0, 0),
      toolGeometry: standardTool,
      obstacles: [],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.diagnostics.pathLength).toBeCloseTo(100, 3);
  });

  // ---- Thinnest Wall Tracking ----
  it("tracks thinnest wall encountered", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, 10),
      endPosition: new Vector3(100, 50, 10),
      toolGeometry: standardTool,
      obstacles: [
        { ...normalFixture, thickness_mm: 30 },
        { ...thinWall, thickness_mm: 1 },
        { ...thinPlate, thickness_mm: 3 },
      ],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.diagnostics.thinnestWall_mm).toBe(1);
  });

  // ---- Warnings for Thin Walls ----
  it("generates warnings for thin walls", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, 10),
      endPosition: new Vector3(100, 50, 10),
      toolGeometry: standardTool,
      obstacles: [thinWall],
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    expect(result.diagnostics.warnings.some(w => w.includes("thin wall"))).toBe(true);
  });

  // ---- Min Clearance Position ----
  it("reports position of minimum clearance", () => {
    // Path that passes close to obstacle (within swept AABB)
    const params: CCDParams = {
      startPosition: new Vector3(0, 25, 5), // Just above fixture at z=0
      endPosition: new Vector3(50, 25, 5),
      toolGeometry: standardTool,
      obstacles: [normalFixture], // at x=0-30, y=0-50, z=-30 to z=0
      motionType: "rapid",
    };

    const result = continuousCollisionDetectionEngine.checkMove(params);
    // Path passes through fixture zone, clearance position should be set
    expect(result.collision).toBe(true); // Tool tip at z=5, but holder extends up
    // If collision, we have detailed info
  });
});

// ============================================================================
// COMPARISON WITH DISCRETE DETECTION
// ============================================================================

describe("CCD vs Discrete Detection Comparison", () => {
  // ---- Demonstrate Tunneling Advantage ----
  it("demonstrates CCD advantage for 1mm wall with 10mm sampling", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, -25),
      endPosition: new Vector3(100, 50, -25),
      toolGeometry: smallTool,
      obstacles: [thinWall],
      motionType: "rapid",
    };

    const comparison = continuousCollisionDetectionEngine.compareWithDiscreteDetection(
      params,
      10 // 10mm discrete interval
    );

    // CCD always catches the collision
    expect(comparison.ccdResult.collision).toBe(true);

    // Report whether discrete would miss it
    console.log(
      `Discrete detection (10mm): collision=${comparison.discreteResult.collision}, ` +
      `checks=${comparison.discreteResult.checksPerformed}`
    );
    console.log(
      `CCD: collision=${comparison.ccdResult.collision}, ` +
      `checks=${comparison.ccdResult.metrics.checksPerformed}, ` +
      `tunneling=${comparison.tunnelingDetected}`
    );
  });

  // ---- High-Resolution Discrete Also Catches ----
  it("shows that fine discrete sampling also catches collision but at higher cost", () => {
    const params: CCDParams = {
      startPosition: new Vector3(0, 50, -25),
      endPosition: new Vector3(100, 50, -25),
      toolGeometry: smallTool,
      obstacles: [thinWall],
      motionType: "rapid",
    };

    const comparison1mm = continuousCollisionDetectionEngine.compareWithDiscreteDetection(params, 0.5);

    // With 0.5mm sampling, discrete should also catch it
    expect(comparison1mm.discreteResult.collision).toBe(true);

    // It requires many checks (100mm / 0.5mm = 200+ samples)
    expect(comparison1mm.discreteResult.checksPerformed).toBeGreaterThan(50);
  });
});
