/**
 * Drawing2DExtractionEngine Tests — U-AWR28
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Drawing2DExtractionEngine } from "../engines/Drawing2DExtractionEngine.js";

describe("Drawing2DExtractionEngine", () => {
  beforeEach(() => { Drawing2DExtractionEngine.reset(); });

  describe("registerDrawing", () => {
    it("registers a drawing file", () => {
      Drawing2DExtractionEngine.registerDrawing("/cad/part.dxf");
      const stats = Drawing2DExtractionEngine.getQueueStats();
      expect(stats.queued).toBe(1);
    });
  });

  describe("registerBatch", () => {
    it("registers multiple drawings", () => {
      Drawing2DExtractionEngine.registerBatch(["/a.dxf", "/b.dwg"]);
      const stats = Drawing2DExtractionEngine.getQueueStats();
      expect(stats.queued).toBe(2);
    });
  });

  describe("extractDrawing", () => {
    it("extracts drawing with entities", () => {
      Drawing2DExtractionEngine.registerDrawing("/part.dxf");
      const result = Drawing2DExtractionEngine.extractDrawing("/part.dxf", {
        entities: [{ id: "e1", type: "line", layer: "0", data: {} }],
        dimensions: [{ id: "d1", type: "linear", value: 25.4, unit: "mm", text: "25.4" }],
      });
      expect(result.success).toBe(true);
      expect(result.entities).toHaveLength(1);
      expect(result.dimensions).toHaveLength(1);
    });

    it("detects DXF format", () => {
      Drawing2DExtractionEngine.registerDrawing("/drawing.dxf");
      const result = Drawing2DExtractionEngine.extractDrawing("/drawing.dxf");
      expect(result.metadata.format).toBe("dxf");
    });

    it("detects DWG format and warns", () => {
      Drawing2DExtractionEngine.registerDrawing("/drawing.dwg");
      const result = Drawing2DExtractionEngine.extractDrawing("/drawing.dwg");
      expect(result.metadata.format).toBe("dwg");
      expect(result.warnings.some(w => w.includes("ODA"))).toBe(true);
    });

    it("extracts part info from annotations", () => {
      Drawing2DExtractionEngine.registerDrawing("/part.dxf");
      const result = Drawing2DExtractionEngine.extractDrawing("/part.dxf", {
        annotations: ["PART: ABC-123", "REV: B", "MATERIAL: STEEL"],
      });
      expect(result.partInfo.partNumber).toBe("ABC-123");
      expect(result.partInfo.revision).toBe("B");
    });
  });

  describe("extractBatch", () => {
    it("processes all registered drawings", () => {
      Drawing2DExtractionEngine.registerBatch(["/a.dxf", "/b.dwg"]);
      const results = Drawing2DExtractionEngine.extractBatch();
      expect(results.totalFiles).toBe(2);
      expect(results.byFormat.dxf).toBe(1);
      expect(results.byFormat.dwg).toBe(1);
    });
  });

  describe("getResult", () => {
    it("retrieves cached result", () => {
      Drawing2DExtractionEngine.registerDrawing("/part.dxf");
      Drawing2DExtractionEngine.extractDrawing("/part.dxf");
      expect(Drawing2DExtractionEngine.getResult("/part.dxf")).not.toBeNull();
    });

    it("returns null for unknown drawing", () => {
      expect(Drawing2DExtractionEngine.getResult("/unknown.dxf")).toBeNull();
    });
  });

  describe("findByPartNumber", () => {
    it("finds drawings by part number", () => {
      Drawing2DExtractionEngine.registerDrawing("/a.dxf");
      Drawing2DExtractionEngine.registerDrawing("/b.dxf");
      Drawing2DExtractionEngine.extractDrawing("/a.dxf", { annotations: ["PART: ABC-123"] });
      Drawing2DExtractionEngine.extractDrawing("/b.dxf", { annotations: ["PART: XYZ-456"] });
      const found = Drawing2DExtractionEngine.findByPartNumber("ABC");
      expect(found).toHaveLength(1);
    });
  });

  describe("getQueueStats", () => {
    it("returns queue statistics", () => {
      Drawing2DExtractionEngine.registerBatch(["/a.dxf", "/b.dxf", "/c.dwg"]);
      const stats = Drawing2DExtractionEngine.getQueueStats();
      expect(stats.queued).toBe(3);
      expect(stats.byFormat.dxf).toBe(2);
      expect(stats.byFormat.dwg).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      Drawing2DExtractionEngine.registerDrawing("/part.dxf");
      Drawing2DExtractionEngine.extractDrawing("/part.dxf");
      Drawing2DExtractionEngine.reset();
      expect(Drawing2DExtractionEngine.getQueueStats().queued).toBe(0);
      expect(Drawing2DExtractionEngine.getAllResults()).toHaveLength(0);
    });
  });
});
