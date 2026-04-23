/**
 * NXOpenSketchEntityEngine.test.ts — U-CAD-APP-17 (PHASE-48)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NXOpenSketchEntityEngine,
  type NXSketchTransport,
  type NXSketchClock,
  type NXSketch,
  type NXSketchEntity,
  type NXGeometricConstraint,
  type NXDimensionalConstraint,
  type NXSketchAnalysis,
  type NXSketchResult,
  type NXPlane,
  type NXPoint2D,
} from "../engines/NXOpenSketchEntityEngine.js";

function makeClock(): NXSketchClock & { tick(): void } {
  let t = new Date("2026-04-22T00:00:00Z").getTime();
  return {
    now: () => new Date(t).toISOString(),
    tick: () => { t += 1000; },
  };
}

function makeSketch(id: string, name: string): NXSketch {
  return {
    sketchId: id,
    name,
    plane: { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } },
    origin: { x: 0, y: 0, z: 0 },
    entities: [],
    geometricConstraints: [],
    dimensionalConstraints: [],
    status: "under_constrained",
    isActive: true,
    isInternal: false,
  };
}

function makeLine(id: string): NXSketchEntity {
  return {
    entityType: "line",
    entityId: id,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 10, y: 0 },
    isConstruction: false,
    isCenterline: false,
  };
}

function makeCircle(id: string): NXSketchEntity {
  return {
    entityType: "circle",
    entityId: id,
    center: { x: 5, y: 5 },
    radius: 10,
    isConstruction: false,
  };
}

function makeTransport(): NXSketchTransport {
  let entityCounter = 0;
  let constraintCounter = 0;

  return {
    createSketch: vi.fn((partTag: string, plane: NXPlane, name: string) => makeSketch(`sketch-${Date.now()}`, name)),
    openSketch: vi.fn((sketchId: string) => makeSketch(sketchId, "Opened")),
    closeSketch: vi.fn(),
    updateSketch: vi.fn((sketchId: string) => ({
      success: true,
      command: "update_sketch" as const,
      sketchId,
      sketch: makeSketch(sketchId, "Updated"),
    })),
    deleteSketch: vi.fn(() => true),

    createLine: vi.fn(() => makeLine(`line-${++entityCounter}`)),
    createArc: vi.fn(() => ({
      entityType: "arc" as const,
      entityId: `arc-${++entityCounter}`,
      center: { x: 0, y: 0 },
      radius: 5,
      startAngle: 0,
      endAngle: 90,
      isClockwise: false,
      isConstruction: false,
    })),
    createCircle: vi.fn(() => makeCircle(`circle-${++entityCounter}`)),
    createEllipse: vi.fn(() => ({
      entityType: "ellipse" as const,
      entityId: `ellipse-${++entityCounter}`,
      center: { x: 0, y: 0 },
      majorRadius: 10,
      minorRadius: 5,
      rotationAngle: 0,
      isConstruction: false,
    })),
    createSpline: vi.fn(() => ({
      entityType: "spline" as const,
      entityId: `spline-${++entityCounter}`,
      points: [
        { point: { x: 0, y: 0 }, weight: 1 },
        { point: { x: 10, y: 10 }, weight: 1 },
      ],
      degree: 3,
      isClosed: false,
      isPeriodic: false,
      isConstruction: false,
    })),
    createConic: vi.fn(() => ({
      entityType: "conic" as const,
      entityId: `conic-${++entityCounter}`,
      conicType: "parabola" as const,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 10, y: 0 },
      isConstruction: false,
    })),
    createPoint: vi.fn(() => ({
      entityType: "point" as const,
      entityId: `point-${++entityCounter}`,
      position: { x: 5, y: 5 },
      isConstruction: false,
    })),
    createText: vi.fn(() => ({
      entityType: "text" as const,
      entityId: `text-${++entityCounter}`,
      position: { x: 0, y: 0 },
      text: "Test",
      height: 5,
      angle: 0,
      isBold: false,
      isItalic: false,
    })),
    createCenterline: vi.fn(() => ({
      entityType: "line" as const,
      entityId: `centerline-${++entityCounter}`,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 10, y: 0 },
      isConstruction: true,
      isCenterline: true,
    })),
    deleteEntity: vi.fn(() => true),

    addGeometricConstraint: vi.fn((sketchId, type, entityIds) => ({
      constraintId: `gc-${++constraintCounter}`,
      constraintType: type,
      entityIds,
      isDriving: true,
      isActive: true,
    })),
    addDimensionalConstraint: vi.fn((sketchId, type, entityIds, value, expression) => ({
      constraintId: `dc-${++constraintCounter}`,
      constraintType: type,
      entityIds,
      value,
      expression,
      isDriving: true,
      isActive: true,
    })),
    removeConstraint: vi.fn(() => true),
    modifyDimension: vi.fn(() => true),

    trimCurve: vi.fn(() => ({ success: true, command: "trim_curve" as const })),
    extendCurve: vi.fn(() => ({ success: true, command: "extend_curve" as const })),
    offsetCurve: vi.fn(() => ({
      success: true,
      command: "offset_curve" as const,
      createdEntityIds: [`offset-${++entityCounter}`],
    })),
    mirrorEntities: vi.fn(() => ({
      success: true,
      command: "mirror_entities" as const,
      createdEntityIds: [`mirror-${++entityCounter}`],
    })),
    patternEntities: vi.fn(() => ({
      success: true,
      command: "pattern_entities" as const,
      createdEntityIds: [`pattern-${++entityCounter}`, `pattern-${++entityCounter}`],
    })),
    filletCurves: vi.fn(() => ({
      success: true,
      command: "fillet_curves" as const,
      createdEntityIds: [`fillet-${++entityCounter}`],
    })),
    chamferCurves: vi.fn(() => ({
      success: true,
      command: "chamfer_curves" as const,
      createdEntityIds: [`chamfer-${++entityCounter}`],
    })),
    projectCurve: vi.fn(() => ({
      success: true,
      command: "project_curve" as const,
      createdEntityIds: [`projected-${++entityCounter}`],
    })),
    intersectCurves: vi.fn(() => ({
      success: true,
      command: "intersect_curves" as const,
      createdEntityIds: [`intersection-${++entityCounter}`],
    })),

    getSketchInfo: vi.fn((sketchId) => makeSketch(sketchId, "Info")),
    getEntities: vi.fn(() => [makeLine("e1"), makeCircle("e2")]),
    getConstraints: vi.fn(() => ({
      geometric: [{ constraintId: "gc1", constraintType: "horizontal" as const, entityIds: ["e1"], isDriving: true, isActive: true }],
      dimensional: [{ constraintId: "dc1", constraintType: "horizontal_dim" as const, entityIds: ["e1"], value: 10, isDriving: true, isActive: true }],
    })),
    solveSketch: vi.fn(() => ({
      status: "fully_constrained" as const,
      totalDOF: 0,
      entityCount: 2,
      constraintCount: 3,
      dimensionCount: 1,
      underConstrainedEntities: [],
      overConstrainedGroups: [],
      inconsistentConstraints: [],
    })),
    analyzeDegreesOfFreedom: vi.fn(() => ({
      status: "under_constrained" as const,
      totalDOF: 3,
      entityCount: 2,
      constraintCount: 1,
      dimensionCount: 0,
      underConstrainedEntities: [{ entityId: "e1", freedoms: ["translate_x" as const], description: "Line free in X" }],
      overConstrainedGroups: [],
      inconsistentConstraints: [],
    })),
    autoDimension: vi.fn(() => [
      { constraintId: "ad1", constraintType: "horizontal_dim" as const, entityIds: ["e1"], value: 10, isDriving: true, isActive: true },
      { constraintId: "ad2", constraintType: "vertical_dim" as const, entityIds: ["e2"], value: 20, isDriving: true, isActive: true },
    ]),

    convertToReference: vi.fn(() => true),
    convertToActive: vi.fn(() => true),
    reattachSketch: vi.fn(() => true),
  };
}

describe("NXOpenSketchEntityEngine (U-CAD-APP-17)", () => {
  let eng: NXOpenSketchEntityEngine;
  let clock: ReturnType<typeof makeClock>;
  let transport: NXSketchTransport;

  beforeEach(() => {
    clock = makeClock();
    transport = makeTransport();
    eng = new NXOpenSketchEntityEngine({ transport, clock });
  });

  describe("sketch lifecycle", () => {
    it("createSketch creates and activates sketch", () => {
      const plane: NXPlane = { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } };
      const result = eng.createSketch("part-001", plane, "Sketch1");
      expect(result.success).toBe(true);
      expect(result.command).toBe("create_sketch");
      expect(result.sketchId).toBeDefined();
      expect(eng.getActiveSketchId()).toBe(result.sketchId);
    });

    it("openSketch sets active sketch", () => {
      const result = eng.openSketch("sketch-123");
      expect(result.success).toBe(true);
      expect(eng.getActiveSketchId()).toBe("sketch-123");
    });

    it("closeSketch clears active sketch", () => {
      eng.openSketch("sketch-123");
      const result = eng.closeSketch();
      expect(result.success).toBe(true);
      expect(eng.getActiveSketchId()).toBeNull();
    });

    it("closeSketch fails without active sketch", () => {
      const result = eng.closeSketch();
      expect(result.success).toBe(false);
      expect(result.error).toContain("No active sketch");
    });

    it("updateSketch refreshes cache", () => {
      eng.openSketch("sketch-123");
      const result = eng.updateSketch();
      expect(result.success).toBe(true);
      expect(result.sketch).toBeDefined();
    });

    it("deleteSketch removes from cache", () => {
      eng.openSketch("sketch-123");
      const result = eng.deleteSketch("sketch-123");
      expect(result.success).toBe(true);
      expect(eng.getActiveSketchId()).toBeNull();
    });
  });

  describe("entity creation", () => {
    beforeEach(() => {
      eng.openSketch("sketch-001");
    });

    it("createLine creates line entity", () => {
      const result = eng.createLine({ startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } });
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(1);
      expect(transport.createLine).toHaveBeenCalled();
    });

    it("createArc creates arc entity", () => {
      const result = eng.createArc({ mode: "center_radius", center: { x: 5, y: 5 }, radius: 10, startAngle: 0, endAngle: 90 });
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(1);
    });

    it("createCircle creates circle entity", () => {
      const result = eng.createCircle({ mode: "center_radius", center: { x: 5, y: 5 }, radius: 10 });
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(1);
    });

    it("createEllipse creates ellipse entity", () => {
      const result = eng.createEllipse({ x: 0, y: 0 }, 10, 5, 45);
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(1);
    });

    it("createSpline creates spline entity", () => {
      const result = eng.createSpline({ points: [{ x: 0, y: 0 }, { x: 5, y: 10 }, { x: 10, y: 0 }], degree: 3 });
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(1);
    });

    it("createConic creates conic entity", () => {
      const result = eng.createConic({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 }, 0.5);
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(1);
    });

    it("createPoint creates point entity", () => {
      const result = eng.createPoint({ x: 5, y: 5 });
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(1);
    });

    it("createText creates text entity", () => {
      const result = eng.createText({ x: 0, y: 0 }, "Label", 5);
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(1);
    });

    it("createCenterline creates centerline", () => {
      const result = eng.createCenterline({ x: 0, y: 0 }, { x: 10, y: 0 });
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(1);
    });

    it("deleteEntity removes entity", () => {
      const result = eng.deleteEntity("e1");
      expect(result.success).toBe(true);
      expect(result.deletedEntityIds).toContain("e1");
    });

    it("entity creation fails without active sketch", () => {
      eng.closeSketch();
      const result = eng.createLine({ startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } });
      expect(result.success).toBe(false);
      expect(result.error).toContain("No active sketch");
    });
  });

  describe("constraints", () => {
    beforeEach(() => {
      eng.openSketch("sketch-001");
    });

    it("addGeometricConstraint adds constraint", () => {
      const result = eng.addGeometricConstraint("horizontal", ["e1"]);
      expect(result.success).toBe(true);
      expect(result.constraintId).toBeDefined();
    });

    it("addDimensionalConstraint adds dimension", () => {
      const result = eng.addDimensionalConstraint("horizontal_dim", ["e1"], 25.4);
      expect(result.success).toBe(true);
      expect(result.constraintId).toBeDefined();
    });

    it("addDimensionalConstraint with expression", () => {
      const result = eng.addDimensionalConstraint("radius_dim", ["c1"], 10, "base_radius*2");
      expect(result.success).toBe(true);
      expect(transport.addDimensionalConstraint).toHaveBeenCalledWith(
        "sketch-001", "radius_dim", ["c1"], 10, "base_radius*2"
      );
    });

    it("removeConstraint removes constraint", () => {
      const result = eng.removeConstraint("gc-1");
      expect(result.success).toBe(true);
    });

    it("modifyDimension updates value", () => {
      const result = eng.modifyDimension("dc-1", 50);
      expect(result.success).toBe(true);
    });

    it("modifyDimension with expression", () => {
      const result = eng.modifyDimension("dc-1", 50, "width/2");
      expect(result.success).toBe(true);
      expect(transport.modifyDimension).toHaveBeenCalledWith("sketch-001", "dc-1", 50, "width/2");
    });
  });

  describe("sketch operations", () => {
    beforeEach(() => {
      eng.openSketch("sketch-001");
    });

    it("trimCurve trims entity", () => {
      const result = eng.trimCurve({ entityId: "e1", trimPoint: { x: 5, y: 0 } });
      expect(result.success).toBe(true);
    });

    it("extendCurve extends entity", () => {
      const result = eng.extendCurve("e1", { x: 15, y: 0 });
      expect(result.success).toBe(true);
    });

    it("offsetCurve creates offset", () => {
      const result = eng.offsetCurve({ entityIds: ["e1"], distance: 5 });
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toBeDefined();
    });

    it("mirrorEntities creates mirrored copies", () => {
      const result = eng.mirrorEntities({ entityIds: ["e1", "e2"], mirrorLineId: "centerline-1" });
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toBeDefined();
    });

    it("patternEntities creates pattern", () => {
      const result = eng.patternEntities({
        entityIds: ["e1"],
        patternType: "linear",
        xCount: 3,
        xSpacing: 10,
      });
      expect(result.success).toBe(true);
      expect(result.createdEntityIds!.length).toBeGreaterThan(0);
    });

    it("filletCurves creates fillet", () => {
      const result = eng.filletCurves({ entityId1: "e1", entityId2: "e2", radius: 2 });
      expect(result.success).toBe(true);
    });

    it("chamferCurves creates chamfer", () => {
      const result = eng.chamferCurves({ entityId1: "e1", entityId2: "e2", distance1: 3 });
      expect(result.success).toBe(true);
    });

    it("projectCurve projects external geometry", () => {
      const result = eng.projectCurve("external-edge-tag");
      expect(result.success).toBe(true);
    });

    it("intersectCurves finds intersections", () => {
      const result = eng.intersectCurves("e1", "e2");
      expect(result.success).toBe(true);
    });
  });

  describe("query and analysis", () => {
    beforeEach(() => {
      eng.openSketch("sketch-001");
    });

    it("getSketchInfo returns sketch data", () => {
      const result = eng.getSketchInfo();
      expect(result.success).toBe(true);
      expect(result.sketch).toBeDefined();
    });

    it("getEntities returns entity list", () => {
      const result = eng.getEntities();
      expect(result.success).toBe(true);
      expect(result.createdEntityIds).toHaveLength(2);
    });

    it("getConstraints returns both types", () => {
      const result = eng.getConstraints();
      expect(result.success).toBe(true);
      expect(result.geometric).toHaveLength(1);
      expect(result.dimensional).toHaveLength(1);
    });

    it("solveSketch returns analysis", () => {
      const result = eng.solveSketch();
      expect(result.success).toBe(true);
      expect(result.analysis?.status).toBe("fully_constrained");
      expect(result.analysis?.totalDOF).toBe(0);
    });

    it("analyzeDegreesOfFreedom identifies under-constrained entities", () => {
      const result = eng.analyzeDegreesOfFreedom();
      expect(result.success).toBe(true);
      expect(result.analysis?.status).toBe("under_constrained");
      expect(result.analysis?.underConstrainedEntities.length).toBeGreaterThan(0);
    });

    it("autoDimension suggests dimensions", () => {
      const result = eng.autoDimension();
      expect(result.success).toBe(true);
      expect(result.dimensions).toHaveLength(2);
    });

    it("autoDimension for specific entities", () => {
      const result = eng.autoDimension(["e1"]);
      expect(result.success).toBe(true);
      expect(transport.autoDimension).toHaveBeenCalledWith("sketch-001", ["e1"]);
    });
  });

  describe("reference geometry", () => {
    beforeEach(() => {
      eng.openSketch("sketch-001");
    });

    it("convertToReference marks as construction", () => {
      const result = eng.convertToReference(["e1", "e2"]);
      expect(result.success).toBe(true);
      expect(result.modifiedEntityIds).toEqual(["e1", "e2"]);
    });

    it("convertToActive marks as active geometry", () => {
      const result = eng.convertToActive(["e1"]);
      expect(result.success).toBe(true);
      expect(result.modifiedEntityIds).toEqual(["e1"]);
    });

    it("reattachSketch moves to new plane", () => {
      const newPlane: NXPlane = { origin: { x: 0, y: 0, z: 10 }, normal: { x: 0, y: 1, z: 0 } };
      const result = eng.reattachSketch(newPlane);
      expect(result.success).toBe(true);
    });
  });

  describe("event subscriptions", () => {
    it("onSketchEvent receives events", () => {
      const events: Array<{ type: string }> = [];
      eng.onSketchEvent((e) => events.push(e));

      eng.openSketch("sketch-001");
      eng.createLine({ startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } });

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === "entity_created")).toBe(true);
    });

    it("onSketchEvent unsubscribe stops notifications", () => {
      const events: Array<{ type: string }> = [];
      const unsub = eng.onSketchEvent((e) => events.push(e));
      unsub();

      eng.openSketch("sketch-001");
      eng.createLine({ startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } });

      expect(events.length).toBe(0);
    });

    it("getEventLog filters by sketchId", () => {
      eng.openSketch("sketch-001");
      eng.createLine({ startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } });

      const events = eng.getEventLog({ sketchId: "sketch-001" });
      expect(events.every(e => e.sketchId === "sketch-001")).toBe(true);
    });

    it("getEventLog filters by type", () => {
      eng.openSketch("sketch-001");
      eng.createLine({ startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } });
      eng.deleteEntity("e1");

      const events = eng.getEventLog({ type: "entity_deleted" });
      expect(events.every(e => e.type === "entity_deleted")).toBe(true);
    });

    it("getEventLog with limit", () => {
      eng.openSketch("sketch-001");
      for (let i = 0; i < 10; i++) {
        eng.createLine({ startPoint: { x: 0, y: i }, endPoint: { x: 10, y: i } });
      }

      const events = eng.getEventLog({ limit: 5 });
      expect(events.length).toBe(5);
    });

    it("clearEventLog clears all events", () => {
      eng.openSketch("sketch-001");
      eng.createLine({ startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } });

      const count = eng.clearEventLog();
      expect(count).toBeGreaterThan(0);
      expect(eng.getEventLog().length).toBe(0);
    });
  });

  describe("cache management", () => {
    it("getCachedSketch returns cached sketch", () => {
      eng.openSketch("sketch-001");
      const cached = eng.getCachedSketch("sketch-001");
      expect(cached).toBeDefined();
      expect(cached?.sketchId).toBe("sketch-001");
    });

    it("getCachedSketch returns undefined for uncached", () => {
      const cached = eng.getCachedSketch("nonexistent");
      expect(cached).toBeUndefined();
    });

    it("clearCache clears all cached sketches", () => {
      eng.openSketch("sketch-001");
      eng.openSketch("sketch-002");

      const count = eng.clearCache();
      expect(count).toBe(2);
      expect(eng.getCachedSketch("sketch-001")).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("operations fail without active sketch", () => {
      expect(eng.createLine({ startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } }).success).toBe(false);
      expect(eng.addGeometricConstraint("horizontal", ["e1"]).success).toBe(false);
      expect(eng.trimCurve({ entityId: "e1", trimPoint: { x: 5, y: 0 } }).success).toBe(false);
      expect(eng.solveSketch().success).toBe(false);
    });

    it("operations accept explicit sketchId override", () => {
      const result = eng.createLine(
        { startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } },
        "explicit-sketch"
      );
      expect(result.success).toBe(true);
      expect(transport.createLine).toHaveBeenCalled();
    });

    it("subscriber errors do not block others", () => {
      const events: Array<{ type: string }> = [];
      eng.onSketchEvent(() => { throw new Error("fail"); });
      eng.onSketchEvent((e) => events.push(e));

      eng.openSketch("sketch-001");
      eng.createLine({ startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 0 } });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      eng.openSketch("sketch-001");
    });

    it("handles zero-length line", () => {
      const result = eng.createLine({ startPoint: { x: 5, y: 5 }, endPoint: { x: 5, y: 5 } });
      expect(result.success).toBe(true);
    });

    it("handles negative coordinates", () => {
      const result = eng.createLine({ startPoint: { x: -10, y: -5 }, endPoint: { x: -20, y: -15 } });
      expect(result.success).toBe(true);
    });

    it("handles very small radius", () => {
      const result = eng.createCircle({ mode: "center_radius", center: { x: 0, y: 0 }, radius: 0.001 });
      expect(result.success).toBe(true);
    });

    it("handles large coordinate values", () => {
      const result = eng.createLine({
        startPoint: { x: 1e6, y: 1e6 },
        endPoint: { x: 1e6 + 100, y: 1e6 },
      });
      expect(result.success).toBe(true);
    });

    it("handles circular pattern", () => {
      const result = eng.patternEntities({
        entityIds: ["e1"],
        patternType: "circular",
        angularCount: 6,
        angularSpacing: 60,
        center: { x: 0, y: 0 },
      });
      expect(result.success).toBe(true);
    });

    it("handles three-point arc creation", () => {
      const result = eng.createArc({
        mode: "three_point",
        startPoint: { x: 0, y: 0 },
        midPoint: { x: 5, y: 5 },
        endPoint: { x: 10, y: 0 },
      });
      expect(result.success).toBe(true);
    });

    it("handles three-point circle creation", () => {
      const result = eng.createCircle({
        mode: "three_point",
        point1: { x: 0, y: 5 },
        point2: { x: 5, y: 0 },
        point3: { x: 10, y: 5 },
      });
      expect(result.success).toBe(true);
    });
  });
});
