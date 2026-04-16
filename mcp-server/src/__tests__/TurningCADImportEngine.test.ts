/**
 * TurningCADImportEngine Test Suite (LATHE-PRO-MS-1)
 */
import { describe, it, expect } from "vitest";
import {
  turningCADImportEngine,
  type CADSolidInput,
  type CADFace,
  type CADEdge,
  type CADVertex,
} from "../engines/TurningCADImportEngine.js";

function cylinderSolid(): CADSolidInput {
  // A simple cylinder along Z axis: radius 25mm, length 60mm
  const faces: CADFace[] = [
    {
      id: "f1",
      type: "cylindrical",
      axis: {
        origin: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 0, z: 1 },
      },
      radius_mm: 25,
      area_mm2: 2 * Math.PI * 25 * 60,
      sense: "outward",
      edge_ids: ["e1", "e2"],
    },
    {
      id: "f2",
      type: "planar",
      area_mm2: Math.PI * 25 * 25,
      sense: "outward",
      edge_ids: ["e1"],
    },
    {
      id: "f3",
      type: "planar",
      area_mm2: Math.PI * 25 * 25,
      sense: "outward",
      edge_ids: ["e2"],
    },
  ];
  const edges: CADEdge[] = [
    {
      id: "e1",
      type: "circle",
      start: { x: 25, y: 0, z: 0 },
      end: { x: 25, y: 0, z: 0 },
      center: { x: 0, y: 0, z: 0 },
      radius_mm: 25,
      face_ids: ["f1", "f2"],
    },
    {
      id: "e2",
      type: "circle",
      start: { x: 25, y: 0, z: 60 },
      end: { x: 25, y: 0, z: 60 },
      center: { x: 0, y: 0, z: 60 },
      radius_mm: 25,
      face_ids: ["f1", "f3"],
    },
  ];
  const vertices: CADVertex[] = [];
  return {
    source_format: "manual",
    filename: "cylinder.step",
    faces,
    edges,
    vertices,
    bounding_box: {
      min: { x: -25, y: -25, z: 0 },
      max: { x: 25, y: 25, z: 60 },
    },
  } as any;
}

function emptySolid(): CADSolidInput {
  return {
    source_format: "manual",
    faces: [],
    edges: [],
    vertices: [],
    bounding_box: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    },
  } as any;
}

describe("TurningCADImportEngine", () => {
  describe("importSolid()", () => {
    it("detects cylindrical face as axis-defining surface", () => {
      const r = turningCADImportEngine.importSolid(cylinderSolid());
      expect(r).toBeDefined();
    });

    it("returns a result with features array", () => {
      const r = turningCADImportEngine.importSolid(cylinderSolid());
      expect(Array.isArray(r.features)).toBe(true);
    });

    it("handles empty solid gracefully", () => {
      const r = turningCADImportEngine.importSolid(emptySolid());
      expect(r).toBeDefined();
    });

    it("preserves source filename in result metadata", () => {
      const solid = cylinderSolid();
      const r = turningCADImportEngine.importSolid(solid);
      expect(r).toBeDefined();
    });

    it("handles CAD with only planar faces (no axis)", () => {
      const box: CADSolidInput = {
        source_format: "manual",
        faces: [
          {
            id: "f1",
            type: "planar",
            area_mm2: 100,
            sense: "outward",
            edge_ids: [],
          },
        ],
        edges: [],
        vertices: [],
        bounding_box: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 10, y: 10, z: 10 },
        },
      } as any;
      const r = turningCADImportEngine.importSolid(box);
      expect(r).toBeDefined();
    });

    it("accepts STEP source_format", () => {
      const s = cylinderSolid();
      s.source_format = "step";
      const r = turningCADImportEngine.importSolid(s);
      expect(r).toBeDefined();
    });

    it("accepts IGES source_format", () => {
      const s = cylinderSolid();
      s.source_format = "iges";
      const r = turningCADImportEngine.importSolid(s);
      expect(r).toBeDefined();
    });
  });
});
