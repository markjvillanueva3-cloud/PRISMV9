/**
 * RhinoCommonBridgeEngine.test.ts — U-CAD-APP-07 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  RhinoCommonBridgeEngine,
  type RhinoTransport,
  type RhinoClock,
} from "../engines/RhinoCommonBridgeEngine.js";
import type {
  RhinoDocument,
  RhinoObject,
  RhinoLayer,
  RhinoBrep,
  RhinoCurve,
  RhinoMesh,
  GHDefinition,
  GHSlider,
  RhinoCommand,
  BoundingBox,
} from "../schemas/cadRhinoSchema.js";

function makeClock(): RhinoClock & { tickMs(ms: number): void } {
  let mono = 1_000_000;
  let iso = new Date("2026-04-22T00:00:00Z").getTime();
  return {
    now: () => new Date(iso).toISOString(),
    monotonicMs: () => mono,
    tickMs: (ms: number) => {
      mono += ms;
      iso += ms;
    },
  };
}

function makeDocument(overrides: Partial<RhinoDocument> = {}): RhinoDocument {
  return {
    documentId: "doc-001",
    path: "/models/test.3dm",
    name: "test.3dm",
    units: "millimeters",
    tolerances: { absolute: 0.001, relative: 0.01, angle: 0.1 },
    objectCount: 5,
    layerCount: 3,
    isModified: false,
    version: "8.0",
    ...overrides,
  };
}

function makeObject(overrides: Partial<RhinoObject> = {}): RhinoObject {
  return {
    objectId: "550e8400-e29b-41d4-a716-446655440000",
    kind: "brep",
    attributes: {
      name: "Part1",
      layerIndex: 0,
      colorSource: "from_layer",
      color: "#FF0000",
      mode: "normal",
      userStrings: {},
    },
    boundingBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 100, y: 100, z: 50 },
    },
    isValid: true,
    isDeleted: false,
    ...overrides,
  };
}

function makeBrep(overrides: Partial<RhinoBrep> = {}): RhinoBrep {
  return {
    brepId: "brep-001",
    isSolid: true,
    isManifold: true,
    faceCount: 6,
    edgeCount: 12,
    vertexCount: 8,
    faces: [
      { faceIndex: 0, surfaceIndex: 0, outerLoopIndex: 0, loopCount: 1, area: 10000, isSolid: true },
    ],
    edges: [
      { edgeIndex: 0, curveIndex: 0, startVertexIndex: 0, endVertexIndex: 1, tolerance: 0.001, length: 100 },
    ],
    volume: 500000,
    area: 70000,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 50 } },
    ...overrides,
  };
}

function makeCurve(overrides: Partial<RhinoCurve> = {}): RhinoCurve {
  return {
    curveId: "curve-001",
    kind: "nurbs_curve",
    degree: 3,
    isClosed: false,
    isPeriodic: false,
    domain: [0, 1],
    length: 150.5,
    pointCount: 10,
    startPoint: { x: 0, y: 0, z: 0 },
    endPoint: { x: 100, y: 50, z: 0 },
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 50, z: 0 } },
    ...overrides,
  };
}

function makeMesh(overrides: Partial<RhinoMesh> = {}): RhinoMesh {
  return {
    meshId: "mesh-001",
    vertexCount: 100,
    faceCount: 196,
    normalCount: 100,
    hasVertexColors: false,
    hasTextureCoordinates: false,
    isClosed: true,
    isManifold: true,
    volume: 500000,
    area: 70000,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 50 } },
    ...overrides,
  };
}

function makeLayer(overrides: Partial<RhinoLayer> = {}): RhinoLayer {
  return {
    layerIndex: 0,
    name: "Default",
    fullPath: "Default",
    color: "#000000",
    isVisible: true,
    isLocked: false,
    childCount: 0,
    ...overrides,
  };
}

function makeGHDefinition(overrides: Partial<GHDefinition> = {}): GHDefinition {
  return {
    definitionId: "550e8400-e29b-41d4-a716-446655440001",
    path: "/gh/test.gh",
    name: "test.gh",
    componentCount: 5,
    sliderCount: 2,
    sliders: [
      {
        instanceGuid: "550e8400-e29b-41d4-a716-446655440002",
        name: "Height",
        minimum: 0,
        maximum: 100,
        currentValue: 50,
        decimalPlaces: 2,
        type: "float",
      },
    ],
    components: [],
    isExpired: false,
    ...overrides,
  };
}

function makeGHSlider(overrides: Partial<GHSlider> = {}): GHSlider {
  return {
    instanceGuid: "550e8400-e29b-41d4-a716-446655440002",
    name: "Height",
    minimum: 0,
    maximum: 100,
    currentValue: 75,
    decimalPlaces: 2,
    type: "float",
    ...overrides,
  };
}

type TransportHandler = (cmd: RhinoCommand, args: Record<string, unknown>) => { ok: boolean; result?: unknown; error?: string };

function makeTransport(handler: TransportHandler): RhinoTransport {
  return { send: handler };
}

describe("RhinoCommonBridgeEngine (U-CAD-APP-07)", () => {
  let eng: RhinoCommonBridgeEngine;
  let clock: ReturnType<typeof makeClock>;

  describe("document operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("openDocument returns parsed document", () => {
      const doc = makeDocument();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: doc })),
        clock,
      });
      const result = eng.openDocument("/models/test.3dm");
      expect(result.documentId).toBe("doc-001");
      expect(result.units).toBe("millimeters");
      expect(eng.getActiveDocument()).toEqual(result);
    });

    it("saveDocument updates active document", () => {
      const doc = makeDocument({ isModified: false });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: doc })),
        clock,
      });
      const result = eng.saveDocument("/models/saved.3dm");
      expect(result.isModified).toBe(false);
    });

    it("newDocument creates fresh document", () => {
      const doc = makeDocument({ name: "untitled.3dm", objectCount: 0 });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: doc })),
        clock,
      });
      const result = eng.newDocument({ units: "inches" });
      expect(result.objectCount).toBe(0);
    });

    it("throws on failed open", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: false, error: "File not found" })),
        clock,
      });
      expect(() => eng.openDocument("/missing.3dm")).toThrow("File not found");
    });
  });

  describe("object operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("listObjects returns array of objects", () => {
      const objs = [makeObject(), makeObject({ objectId: "550e8400-e29b-41d4-a716-446655440001" })];
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: objs })),
        clock,
      });
      const result = eng.listObjects();
      expect(result.length).toBe(2);
      expect(result[0].kind).toBe("brep");
    });

    it("getObject retrieves single object", () => {
      const obj = makeObject();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: obj })),
        clock,
      });
      const result = eng.getObject("550e8400-e29b-41d4-a716-446655440000");
      expect(result.objectId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("createObject returns new object", () => {
      const obj = makeObject({ kind: "curve" });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: obj })),
        clock,
      });
      const result = eng.createObject("curve", { points: [] });
      expect(result.kind).toBe("curve");
    });

    it("deleteObject returns true on success", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: true })),
        clock,
      });
      expect(eng.deleteObject("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("transformObject applies transform", () => {
      const obj = makeObject();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: obj })),
        clock,
      });
      const transform = {
        m00: 1, m01: 0, m02: 0, m03: 10,
        m10: 0, m11: 1, m12: 0, m13: 20,
        m20: 0, m21: 0, m22: 1, m23: 30,
        m30: 0, m31: 0, m32: 0, m33: 1,
      };
      const result = eng.transformObject("550e8400-e29b-41d4-a716-446655440000", transform);
      expect(result.objectId).toBeDefined();
    });

    it("duplicateObject clones object", () => {
      const obj = makeObject({ objectId: "550e8400-e29b-41d4-a716-446655440099" });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: obj })),
        clock,
      });
      const result = eng.duplicateObject("550e8400-e29b-41d4-a716-446655440000");
      expect(result.objectId).toBe("550e8400-e29b-41d4-a716-446655440099");
    });

    it("getBoundingBox returns box for multiple objects", () => {
      const box: BoundingBox = { min: { x: 0, y: 0, z: 0 }, max: { x: 200, y: 150, z: 100 } };
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: box })),
        clock,
      });
      const result = eng.getBoundingBox(["id1", "id2"]);
      expect(result.max.x).toBe(200);
    });
  });

  describe("layer operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("listLayers returns all layers", () => {
      const layers = [makeLayer(), makeLayer({ layerIndex: 1, name: "Parts" })];
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: layers })),
        clock,
      });
      const result = eng.listLayers();
      expect(result.length).toBe(2);
      expect(result[1].name).toBe("Parts");
    });

    it("createLayer creates new layer", () => {
      const layer = makeLayer({ layerIndex: 5, name: "NewLayer", color: "#00FF00" });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: layer })),
        clock,
      });
      const result = eng.createLayer("NewLayer", { color: "#00FF00" });
      expect(result.name).toBe("NewLayer");
      expect(result.color).toBe("#00FF00");
    });

    it("setLayer moves object to layer", () => {
      const obj = makeObject();
      obj.attributes.layerIndex = 2;
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: obj })),
        clock,
      });
      const result = eng.setLayer("550e8400-e29b-41d4-a716-446655440000", 2);
      expect(result.attributes.layerIndex).toBe(2);
    });
  });

  describe("boolean operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("booleanUnion combines breps", () => {
      const brep = makeBrep({ volume: 1000000 });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.booleanUnion(["id1", "id2"]);
      expect(result.isSolid).toBe(true);
      expect(result.volume).toBe(1000000);
    });

    it("booleanUnion throws with less than 2 objects", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: makeBrep() })),
        clock,
      });
      expect(() => eng.booleanUnion(["id1"])).toThrow("at least 2 objects");
    });

    it("booleanDifference subtracts B from A", () => {
      const brep = makeBrep({ volume: 250000 });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.booleanDifference("idA", "idB");
      expect(result.volume).toBe(250000);
    });

    it("booleanIntersection returns overlap", () => {
      const brep = makeBrep({ volume: 50000 });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.booleanIntersection("idA", "idB");
      expect(result.volume).toBe(50000);
    });
  });

  describe("curve and surface operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("offsetCurve creates parallel curve", () => {
      const curve = makeCurve({ curveId: "curve-offset" });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: curve })),
        clock,
      });
      const result = eng.offsetCurve("curve-001", 5.0, { x: 0, y: 0, z: 1 });
      expect(result.curveId).toBe("curve-offset");
    });

    it("extrudeCurve creates brep from curve", () => {
      const brep = makeBrep();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.extrudeCurve("curve-001", { x: 0, y: 0, z: 50 });
      expect(result.isSolid).toBe(true);
    });

    it("loftCurves creates surface through curves", () => {
      const brep = makeBrep({ faceCount: 1 });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.loftCurves(["c1", "c2", "c3"], { loftType: "normal" });
      expect(result.faceCount).toBe(1);
    });

    it("loftCurves throws with less than 2 curves", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: makeBrep() })),
        clock,
      });
      expect(() => eng.loftCurves(["c1"])).toThrow("at least 2 curves");
    });

    it("sweepOneRail creates surface along rail", () => {
      const brep = makeBrep();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.sweepOneRail("rail", ["shape1"]);
      expect(result.isSolid).toBeDefined();
    });

    it("sweepTwoRail creates surface between rails", () => {
      const brep = makeBrep();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.sweepTwoRail("rail1", "rail2", ["shape1"]);
      expect(result.isSolid).toBeDefined();
    });

    it("revolve creates surface of revolution", () => {
      const brep = makeBrep();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.revolve(
        "curve-001",
        { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 0, z: 100 } },
        360,
      );
      expect(result.isSolid).toBe(true);
    });

    it("pipe creates tube along curve", () => {
      const brep = makeBrep();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.pipe("curve-001", [5, 10, 5]);
      expect(result.isSolid).toBe(true);
    });
  });

  describe("edge operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("filletEdges rounds edges", () => {
      const brep = makeBrep({ edgeCount: 12 });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.filletEdges("brep-001", [0, 1, 2], 2.5);
      expect(result.edgeCount).toBe(12);
    });

    it("chamferEdges bevels edges", () => {
      const brep = makeBrep({ edgeCount: 24 });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.chamferEdges("brep-001", [0, 1], 1.5);
      expect(result.edgeCount).toBe(24);
    });
  });

  describe("brep operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("meshBrep converts to mesh", () => {
      const mesh = makeMesh();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: mesh })),
        clock,
      });
      const result = eng.meshBrep("brep-001", { maxAngle: 20 });
      expect(result.faceCount).toBe(196);
      expect(result.isClosed).toBe(true);
    });

    it("joinBreps merges breps", () => {
      const brep = makeBrep({ faceCount: 12 });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.joinBreps(["b1", "b2"]);
      expect(result.faceCount).toBe(12);
    });

    it("joinBreps throws with less than 2 breps", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: makeBrep() })),
        clock,
      });
      expect(() => eng.joinBreps(["b1"])).toThrow("at least 2 breps");
    });

    it("splitBrep returns array of pieces", () => {
      const breps = [makeBrep({ brepId: "piece1" }), makeBrep({ brepId: "piece2" })];
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: breps })),
        clock,
      });
      const result = eng.splitBrep("brep-001", ["cutter1"]);
      expect(result.length).toBe(2);
    });

    it("capPlanarHoles closes open brep", () => {
      const brep = makeBrep({ isSolid: true });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: brep })),
        clock,
      });
      const result = eng.capPlanarHoles("brep-open");
      expect(result.isSolid).toBe(true);
    });
  });

  describe("Grasshopper operations", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("runGrasshopper loads and solves definition", () => {
      const def = makeGHDefinition();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: def })),
        clock,
      });
      const result = eng.runGrasshopper("/gh/test.gh");
      expect(result.componentCount).toBe(5);
      expect(result.sliderCount).toBe(2);
    });

    it("ghGetDefinition retrieves definition by id", () => {
      const def = makeGHDefinition();
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: def })),
        clock,
      });
      const result = eng.ghGetDefinition("550e8400-e29b-41d4-a716-446655440001");
      expect(result.name).toBe("test.gh");
    });

    it("ghSetSlider updates slider value", () => {
      const slider = makeGHSlider({ currentValue: 75 });
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: slider })),
        clock,
      });
      const result = eng.ghSetSlider("550e8400-e29b-41d4-a716-446655440002", 75);
      expect(result.currentValue).toBe(75);
    });

    it("ghBakeGeometry creates objects from GH output", () => {
      const objs = [makeObject(), makeObject({ objectId: "550e8400-e29b-41d4-a716-446655440003" })];
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: objs })),
        clock,
      });
      const result = eng.ghBakeGeometry("comp-guid", 0);
      expect(result.length).toBe(2);
    });
  });

  describe("export/import", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("exportStep writes STEP file", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: "/export/model.step" })),
        clock,
      });
      const result = eng.exportStep("/export/model.step", { stepSchema: "AP242" });
      expect(result).toBe("/export/model.step");
    });

    it("exportIges writes IGES file", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: "/export/model.igs" })),
        clock,
      });
      const result = eng.exportIges("/export/model.igs");
      expect(result).toBe("/export/model.igs");
    });

    it("exportStl writes STL file", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: "/export/model.stl" })),
        clock,
      });
      const result = eng.exportStl("/export/model.stl", { binary: true });
      expect(result).toBe("/export/model.stl");
    });

    it("importGeometry loads external geometry", () => {
      const objs = [makeObject()];
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: objs })),
        clock,
      });
      const result = eng.importGeometry("/import/part.step");
      expect(result.length).toBe(1);
    });
  });

  describe("call logging", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("logs all calls", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => {
          clock.tickMs(5);
          return { ok: true, result: makeDocument() };
        }),
        clock,
      });
      eng.openDocument("/a.3dm");
      eng.openDocument("/b.3dm");
      const log = eng.getCallLog();
      expect(log.length).toBe(2);
      expect(log[0].command).toBe("open_document");
      expect(log[0].durationMs).toBe(5);
    });

    it("clearCallLog resets log", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: makeDocument() })),
        clock,
      });
      eng.openDocument("/a.3dm");
      eng.clearCallLog();
      expect(eng.getCallLog().length).toBe(0);
    });

    it("p50LatencyMs returns median", () => {
      let callNum = 0;
      const latencies = [10, 20, 30, 40, 50];
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => {
          clock.tickMs(latencies[callNum++] ?? 25);
          return { ok: true, result: makeDocument() };
        }),
        clock,
      });
      for (let i = 0; i < 5; i++) eng.openDocument(`/${i}.3dm`);
      expect(eng.p50LatencyMs()).toBe(30);
    });

    it("p95LatencyMs returns 95th percentile", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => {
          clock.tickMs(10);
          return { ok: true, result: makeDocument() };
        }),
        clock,
      });
      for (let i = 0; i < 20; i++) eng.openDocument(`/${i}.3dm`);
      expect(eng.p95LatencyMs()).toBe(10);
    });

    it("p50LatencyMs returns undefined with no calls", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: true, result: null })),
        clock,
      });
      expect(eng.p50LatencyMs()).toBeUndefined();
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      clock = makeClock();
    });

    it("catches transport exceptions", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: {
          send: () => {
            throw new Error("Connection refused");
          },
        },
        clock,
      });
      expect(() => eng.openDocument("/test.3dm")).toThrow("Connection refused");
      const log = eng.getCallLog();
      expect(log[0].ok).toBe(false);
      expect(log[0].error).toBe("Connection refused");
    });

    it("throws on transport error response", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: false, error: "Invalid geometry" })),
        clock,
      });
      expect(() => eng.booleanUnion(["a", "b"])).toThrow("Invalid geometry");
    });

    it("throws generic error when no message provided", () => {
      eng = new RhinoCommonBridgeEngine({
        transport: makeTransport(() => ({ ok: false })),
        clock,
      });
      expect(() => eng.deleteObject("id")).toThrow("Rhino command failed");
    });
  });
});
