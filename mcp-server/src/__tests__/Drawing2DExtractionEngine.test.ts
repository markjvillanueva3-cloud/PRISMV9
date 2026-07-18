/**
 * Drawing2DExtractionEngine Tests � U-AWR28
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Drawing2DExtractionEngine } from "../engines/Drawing2DExtractionEngine.js";
import { normalizeDrawingExtractToContract } from "../schemas/BlueprintExtractionContract.js";

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

  // U-XRAY-DRAWING-EXTRACT-REAL-DXF: real DXF parse (entities + DIMENSION group-42 values).
  describe("parseDxfContent (real DXF parse)", () => {
    // Minimal real DXF: HEADER $INSUNITS=4 (mm) + ENTITIES (LINE, CIRCLE, linear DIMENSION
    // measuring 25.4, TEXT note). Array-join avoids any leading blank line (strict 2-line stride).
    const DXF_MM = [
      "0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC",
      "0", "SECTION", "2", "ENTITIES",
      "0", "LINE", "8", "GEO", "10", "0.0", "20", "0.0", "11", "50.0", "21", "0.0",
      "0", "CIRCLE", "8", "GEO", "10", "25.0", "20", "25.0", "40", "10.0",
      "0", "DIMENSION", "8", "DIM", "70", "0", "42", "25.4", "1", "25.4", "10", "10.0", "20", "5.0",
      "0", "TEXT", "8", "NOTES", "10", "5.0", "20", "60.0", "1", "PART: ABC-123 REV: B",
      "0", "ENDSEC", "0", "EOF",
    ].join("\n");

    it("extracts the real DIMENSION value (group 42), not a simulated number", () => {
      const p = Drawing2DExtractionEngine.parseDxfContent(DXF_MM);
      expect(p.dimensions).toHaveLength(1);
      expect(p.dimensions[0].value).toBeCloseTo(25.4, 5);
      expect(p.dimensions[0].type).toBe("linear");
      expect(p.dimensions[0].unit).toBe("mm");
      expect(p.dimensions[0].text).toBe("25.4");
    });

    it("extracts real entities (line, circle, dimension, text) and layers", () => {
      const p = Drawing2DExtractionEngine.parseDxfContent(DXF_MM);
      const types = p.entities.map((e) => e.type).sort();
      expect(types).toEqual(["circle", "dimension", "line", "text"]);
      expect(p.layers.sort()).toEqual(["DIM", "GEO", "NOTES"]);
    });

    it("collects TEXT/MTEXT as annotations and computes bounds from coords", () => {
      const p = Drawing2DExtractionEngine.parseDxfContent(DXF_MM);
      expect(p.annotations).toContain("PART: ABC-123 REV: B");
      expect(p.bounds.minX).toBe(0);
      expect(p.bounds.maxY).toBeGreaterThanOrEqual(60);
    });

    it("resolves $INSUNITS=4 to mm", () => {
      expect(Drawing2DExtractionEngine.parseDxfContent(DXF_MM).units).toBe("mm");
    });

    it("resolves $INSUNITS=1 to inch (per-dim unit follows the header)", () => {
      const dxfIn = DXF_MM.replace("$INSUNITS\n70\n4", "$INSUNITS\n70\n1");
      const p = Drawing2DExtractionEngine.parseDxfContent(dxfIn);
      expect(p.units).toBe("in");
      expect(p.dimensions[0].unit).toBe("in");
    });

    it("reports unknown units when no $INSUNITS header is present", () => {
      const dxfNoUnits = [
        "0", "SECTION", "2", "ENTITIES",
        "0", "DIMENSION", "8", "DIM", "70", "0", "42", "12.0", "1", "12.0",
        "0", "ENDSEC", "0", "EOF",
      ].join("\n");
      expect(Drawing2DExtractionEngine.parseDxfContent(dxfNoUnits).units).toBe("unknown");
    });

    it("maps DIMENSION group-70 type code 3 to diameter and 4 to radial", () => {
      const mk = (code: string) => [
        "0", "SECTION", "2", "ENTITIES",
        "0", "DIMENSION", "8", "D", "70", code, "42", "8.0", "1", "8.0",
        "0", "ENDSEC", "0", "EOF",
      ].join("\n");
      expect(Drawing2DExtractionEngine.parseDxfContent(mk("3")).dimensions[0].type).toBe("diameter");
      expect(Drawing2DExtractionEngine.parseDxfContent(mk("4")).dimensions[0].type).toBe("radial");
    });

    it('falls back to the measured value when the DIMENSION text override is "<>" or empty', () => {
      const mk = (override: string) => [
        "0", "SECTION", "2", "ENTITIES",
        "0", "DIMENSION", "8", "D", "70", "0", "42", "33.5", "1", override,
        "0", "ENDSEC", "0", "EOF",
      ].join("\n");
      expect(Drawing2DExtractionEngine.parseDxfContent(mk("<>")).dimensions[0].text).toBe("33.5");
      expect(Drawing2DExtractionEngine.parseDxfContent(mk("")).dimensions[0].text).toBe("33.5");
    });

    it("skips a DIMENSION with no parseable group-42 value (no fabricated dimension)", () => {
      const dxf = [
        "0", "SECTION", "2", "ENTITIES",
        "0", "DIMENSION", "8", "D", "70", "0", "1", "SEE NOTE",
        "0", "ENDSEC", "0", "EOF",
      ].join("\n");
      expect(Drawing2DExtractionEngine.parseDxfContent(dxf).dimensions).toHaveLength(0);
    });

    it("returns empty (not a throw) when there is no ENTITIES section", () => {
      const p = Drawing2DExtractionEngine.parseDxfContent("0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF");
      expect(p.entities).toHaveLength(0);
      expect(p.dimensions).toHaveLength(0);
    });
  });

  describe("extractDrawing with real DXF content (U-XRAY-DRAWING-EXTRACT-REAL-DXF)", () => {
    const DXF_MM = [
      "0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC",
      "0", "SECTION", "2", "ENTITIES",
      "0", "LINE", "8", "GEO", "10", "0.0", "20", "0.0", "11", "50.0", "21", "0.0",
      "0", "DIMENSION", "8", "DIM", "70", "0", "42", "25.4", "1", "25.4", "10", "1.0", "20", "1.0",
      "0", "TEXT", "8", "NOTES", "10", "5.0", "20", "60.0", "1", "PART: ABC-123 REV: B",
      "0", "ENDSEC", "0", "EOF",
    ].join("\n");

    it("parses supplied DXF content into real dims + metadata + partInfo", () => {
      const r = Drawing2DExtractionEngine.extractDrawing("/parts/widget.dxf", { content: DXF_MM });
      expect(r.success).toBe(true);
      expect(r.dimensions).toHaveLength(1);
      expect(r.dimensions[0].value).toBeCloseTo(25.4, 5);
      expect(r.metadata.units).toBe("mm");
      expect(r.metadata.entityCount).toBe(r.entities.length);
      expect(r.partInfo.partNumber).toBe("ABC-123");
      expect(r.partInfo.revision).toBe("B");
    });

    it("lets explicit entities/dimensions override real-parse (back-compat)", () => {
      const r = Drawing2DExtractionEngine.extractDrawing("/parts/widget.dxf", {
        content: DXF_MM,
        entities: [{ id: "e1", type: "line", layer: "0", data: {} }],
        dimensions: [{ id: "d1", type: "linear", value: 99, unit: "mm", text: "99" }],
      });
      expect(r.entities).toHaveLength(1);
      expect(r.dimensions).toHaveLength(1);
      expect(r.dimensions[0].value).toBe(99);
    });

    it("marks dims unit:unknown (NOT mm) and warns when the DXF has no $INSUNITS", () => {
      const noUnits = DXF_MM.replace("9\n$INSUNITS\n70\n4\n", "");
      const r = Drawing2DExtractionEngine.extractDrawing("/parts/x.dxf", { content: noUnits });
      expect(r.metadata.units).toBe("unknown");
      // UNITS-FIRST: never silently trust an unknown-units dim as mm (25.4x trap guard).
      expect(r.dimensions[0].unit).toBe("unknown");
      expect(r.warnings.some((w) => w.includes("INSUNITS"))).toBe(true);
    });

    it("does NOT parse content for a .dwg path (ODA warning preserved)", () => {
      const r = Drawing2DExtractionEngine.extractDrawing("/parts/x.dwg", { content: DXF_MM });
      expect(r.dimensions).toHaveLength(0);
      expect(r.warnings.some((w) => w.includes("ODA"))).toBe(true);
    });
  });

  // UNITS-FIRST end-to-end lock (xray #1 refuse): the real-DXF extraction must reach the app
  // contract with the correct units-trust gate -- unknown units force needs_confirm, never a
  // silent mm trust (the 25.4x scale-error class). Locks the scrutiny P1 fix at the boundary.
  describe("real DXF -> BlueprintExtractionContract units-safety (U-XRAY-DRAWING-EXTRACT-REAL-DXF)", () => {
    const dxf = (insunits: string | null) => {
      const head = insunits ? ["9", "$INSUNITS", "70", insunits] : [];
      return [
        "0", "SECTION", "2", "HEADER", ...head, "0", "ENDSEC",
        "0", "SECTION", "2", "ENTITIES",
        "0", "DIMENSION", "8", "D", "70", "0", "42", "2.0", "1", "2.0",
        "0", "ENDSEC", "0", "EOF",
      ].join("\n");
    };

    it("unknown units -> contract dim forced needs_confirm (no silent mm trust)", () => {
      const r = Drawing2DExtractionEngine.extractDrawing("/x.dxf", { content: dxf(null) });
      const c = normalizeDrawingExtractToContract(r);
      expect(c.dimensions).toHaveLength(1);
      expect(c.dimensions[0].needs_confirm).toBe(true);
      // raw value kept (no fabricated conversion) until the operator confirms units.
      expect(c.dimensions[0].value_mm).toBeCloseTo(2.0, 5);
    });

    it("mm units -> trusted (needs_confirm false), value passes through", () => {
      const r = Drawing2DExtractionEngine.extractDrawing("/x.dxf", { content: dxf("4") });
      const c = normalizeDrawingExtractToContract(r);
      expect(c.dimensions[0].needs_confirm).toBe(false);
      expect(c.dimensions[0].value_mm).toBeCloseTo(2.0, 5);
    });

    it("inch units -> converted value*25.4 -> mm, trusted (the gate is discriminating)", () => {
      const r = Drawing2DExtractionEngine.extractDrawing("/x.dxf", { content: dxf("1") });
      const c = normalizeDrawingExtractToContract(r);
      expect(c.dimensions[0].needs_confirm).toBe(false);
      expect(c.dimensions[0].value_mm).toBeCloseTo(50.8, 4); // 2.0 in -> 50.8 mm
    });
  });
});
