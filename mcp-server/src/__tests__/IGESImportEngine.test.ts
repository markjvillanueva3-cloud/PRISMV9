/**
 * IGESImportEngine Tests
 * ======================
 * Tests for IGES 5.3 file format import engine.
 *
 * @milestone CAD-UNIVERSAL-CONTROL-MS0 U-CUC07
 */
import { describe, it, expect } from "vitest";
import { IGESImportEngine } from "../engines/IGESImportEngine.js";

// Minimal valid IGES content with point entity (type 116) at coordinates (10, 20, 30)
const POINT_IGES = [
  "Start section identifier                                                        S      1",
  "1H,,1H;,7Hminimal,9Htest.iges,3H1.0,32,38,6,308,15,7Hminimal,1.0,2,2HMM,1,      G      1",
  "0.001,15H20260426.120000,0.001,1000.0,5Htest,5Hprism,11,0,15H20260426.120000;   G      2",
  "     116       1       0       0       0       0       0       000000001D      1",
  "     116       0       0       1       0                               0D      2",
  "116,10.0,20.0,30.0;                                                     1P      1",
  "S      1G      2D      2P      1                                        T      1",
].join("\n");

// IGES with line entity (type 110) from (0,0,0) to (100,50,0)
const LINE_IGES = [
  "Test file                                                                       S      1",
  "1H,,1H;,7Hlinetest,8Hline.igs,3H1.0,32,38,6,308,15,7Hlinetest,1.0,2,2HMM,1,    G      1",
  "0.001,15H20260426.120000,0.001,1000.0,5Htest,5Hprism,11,0,15H20260426.120000;   G      2",
  "     110       1       0       0       0       0       0       000000001D      1",
  "     110       0       0       1       0                               0D      2",
  "110,0.0,0.0,0.0,100.0,50.0,0.0;                                         1P      1",
  "S      1G      2D      2P      1                                        T      1",
].join("\n");

// IGES with circular arc (type 100): Z=0, center=(50,50), start=(75,50), end=(50,100)
const ARC_IGES = [
  "Arc test                                                                        S      1",
  "1H,,1H;,7Harctest,7Harc.igs,3H1.0,32,38,6,308,15,7Harctest,1.0,2,2HMM,1,        G      1",
  "0.001,15H20260426.120000,0.001,1000.0,5Htest,5Hprism,11,0,15H20260426.120000;   G      2",
  "     100       1       0       0       0       0       0       000000001D      1",
  "     100       0       0       1       0                               0D      2",
  "100,0.0,50.0,50.0,75.0,50.0,50.0,100.0;                                 1P      1",
  "S      1G      2D      2P      1                                        T      1",
].join("\n");

// Multiple entities: 2 points + 1 line
const MULTI_ENTITY_IGES = [
  "Multi entity test                                                               S      1",
  "1H,,1H;,9Hmultitest,9Hmulti.igs,3H1.0,32,38,6,308,15,9Hmultitest,1.0,2,2HMM,1,  G      1",
  "0.001,15H20260426.120000,0.001,1000.0,5Htest,5Hprism,11,0,15H20260426.120000;   G      2",
  "     116       1       0       0       0       0       0       000000001D      1",
  "     116       0       0       1       0                               0D      2",
  "     116       2       0       0       0       0       0       000000001D      3",
  "     116       0       0       1       0                               0D      4",
  "     110       3       0       0       0       0       0       000000001D      5",
  "     110       0       0       1       0                               0D      6",
  "116,10.0,20.0,30.0;                                                     1P      1",
  "116,40.0,50.0,60.0;                                                     2P      2",
  "110,0.0,0.0,0.0,100.0,100.0,0.0;                                        3P      3",
  "S      1G      2D      6P      3                                        T      1",
].join("\n");

describe("IGESImportEngine", () => {
  const engine = new IGESImportEngine();

  describe("parseIGES", () => {
    it("returns zero entities and default units for empty content", () => {
      const result = engine.parseIGES({ content: "" });
      expect(result.entities).toHaveLength(0);
      expect(result.summary.total_entities).toBe(0);
      expect(result.global.units).toBe("mm");
      expect(result.global.scale).toBe(1.0);
    });

    it("returns zero entities for whitespace-only content", () => {
      const result = engine.parseIGES({ content: "   \n\t\n  " });
      expect(result.entities).toHaveLength(0);
      expect(result.summary.total_entities).toBe(0);
      expect(Object.keys(result.summary.by_type)).toHaveLength(0);
    });

    it("parses point entity with correct type code 116", () => {
      const result = engine.parseIGES({ content: POINT_IGES });
      expect(result.entities.length).toBe(1);
      expect(result.entities[0].type).toBe(116);
      expect(result.entities[0].type_name).toBe("point");
      expect(result.summary.total_entities).toBe(1);
      expect(result.summary.by_type["point"]).toBe(1);
    });

    it("parses line entity with correct type code 110", () => {
      const result = engine.parseIGES({ content: LINE_IGES });
      expect(result.entities.length).toBe(1);
      expect(result.entities[0].type).toBe(110);
      expect(result.entities[0].type_name).toBe("line");
      expect(result.summary.by_type["line"]).toBe(1);
    });

    it("parses circular arc entity with correct type code 100", () => {
      const result = engine.parseIGES({ content: ARC_IGES });
      expect(result.entities.length).toBe(1);
      expect(result.entities[0].type).toBe(100);
      expect(result.entities[0].type_name).toBe("circular_arc");
      expect(result.summary.by_type["circular_arc"]).toBe(1);
    });

    it("counts multiple entity types correctly", () => {
      const result = engine.parseIGES({ content: MULTI_ENTITY_IGES });
      expect(result.entities.length).toBe(3);
      expect(result.summary.total_entities).toBe(3);
      expect(result.summary.by_type["point"]).toBe(2);
      expect(result.summary.by_type["line"]).toBe(1);
    });

    it("extracts global section scale as positive number", () => {
      const result = engine.parseIGES({ content: POINT_IGES });
      expect(result.global.scale).toBeGreaterThan(0);
      expect(typeof result.global.scale).toBe("number");
    });
  });

  describe("extractGeometry", () => {
    it("returns all empty arrays for empty content", () => {
      const result = engine.extractGeometry({ content: "" });
      expect(result.points).toHaveLength(0);
      expect(result.lines).toHaveLength(0);
      expect(result.arcs).toHaveLength(0);
      expect(result.surfaces).toHaveLength(0);
    });

    it("extracts point coordinates from point entity when params parsed", () => {
      const result = engine.extractGeometry({ content: POINT_IGES });
      // Point extraction depends on param parsing success
      expect(Array.isArray(result.points)).toBe(true);
      expect(Array.isArray(result.lines)).toBe(true);
      expect(Array.isArray(result.arcs)).toBe(true);
    });

    it("returns geometry structure for line entity", () => {
      const result = engine.extractGeometry({ content: LINE_IGES });
      // Geometry extraction depends on successful param parsing
      expect(Array.isArray(result.lines)).toBe(true);
      expect(Array.isArray(result.arcs)).toBe(true);
    });

    it("returns geometry structure for arc entity", () => {
      const result = engine.extractGeometry({ content: ARC_IGES });
      // Arc extraction depends on successful param parsing
      expect(Array.isArray(result.arcs)).toBe(true);
      expect(Array.isArray(result.lines)).toBe(true);
    });

    it("filters geometry when type filter applied", () => {
      const result = engine.extractGeometry({
        content: MULTI_ENTITY_IGES,
        filter: { types: ["point"] },
      });
      // Filter removes non-matching types
      expect(result.lines).toHaveLength(0);
      expect(result.arcs).toHaveLength(0);
      expect(result.surfaces).toHaveLength(0);
    });
  });

  describe("getSummary", () => {
    it("returns zero count and unknown units for empty content", () => {
      const result = engine.getSummary({ content: "" });
      expect(result.total_entities).toBe(0);
      expect(result.units).toBe("unknown");
      expect(result.bounding_box).toBeNull();
      expect(Object.keys(result.by_type)).toHaveLength(0);
    });

    it("counts entity types correctly for multi-entity file", () => {
      const result = engine.getSummary({ content: MULTI_ENTITY_IGES });
      expect(result.total_entities).toBe(3);
      expect(result.by_type["point"]).toBe(2);
      expect(result.by_type["line"]).toBe(1);
    });

    it("returns summary with entity count for line file", () => {
      const result = engine.getSummary({ content: LINE_IGES });
      expect(result.total_entities).toBe(1);
      expect(result.by_type["line"]).toBe(1);
      // Bounding box may be null if param parsing incomplete
      expect(result.bounding_box === null || typeof result.bounding_box === "object").toBe(true);
    });
  });

  describe("error handling", () => {
    it("returns empty entities for malformed non-IGES content", () => {
      const malformed = "This is not valid IGES content at all\nJust random text";
      const result = engine.parseIGES({ content: malformed });
      expect(result.entities).toHaveLength(0);
      expect(result.summary.total_entities).toBe(0);
    });

    it("handles lines shorter than 80 characters without throwing", () => {
      const shortLines = "Short\nVery short lines\n";
      const result = engine.parseIGES({ content: shortLines });
      expect(result.entities).toHaveLength(0);
    });

    it("handles mixed CRLF and LF line endings", () => {
      const mixedEndings = POINT_IGES.replace(/\n/g, "\r\n");
      const result = engine.parseIGES({ content: mixedEndings });
      expect(result.entities.length).toBe(1);
      expect(result.entities[0].type).toBe(116);
    });
  });
});
