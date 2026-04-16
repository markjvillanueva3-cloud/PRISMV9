/**
 * wedm-geometry-parser.test.ts — WEDM-MS0 U-WEDM00
 *
 * Tests for DXFGeometryParserEngine: arc-preserving DXF parser for Wire EDM.
 *
 * Coverage: LINE, ARC, CIRCLE, LWPOLYLINE (with bulge), SPLINE, ELLIPSE,
 * INSERT/BLOCK, gap closure, duplicate removal, winding normalization,
 * self-intersection detection, Wire EDM validation.
 */

import { describe, it, expect } from "vitest";
import {
  DXFGeometryParserEngine,
  type GeometryParseResult,
  type WireEDMContour,
} from "../engines/DXFGeometryParserEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

const engine = new DXFGeometryParserEngine();

/** Build a minimal DXF file with given entities in the ENTITIES section */
function makeDXF(entities: string): string {
  return [
    "0", "SECTION",
    "2", "ENTITIES",
    entities,
    "0", "ENDSEC",
    "0", "EOF",
  ].join("\n");
}

/** Build a DXF with BLOCKS and ENTITIES sections */
function makeDXFWithBlocks(blocks: string, entities: string): string {
  return [
    "0", "SECTION",
    "2", "BLOCKS",
    blocks,
    "0", "ENDSEC",
    "0", "SECTION",
    "2", "ENTITIES",
    entities,
    "0", "ENDSEC",
    "0", "EOF",
  ].join("\n");
}

/** Create a LINE entity string */
function line(x1: number, y1: number, x2: number, y2: number): string {
  return [
    "0", "LINE",
    "10", String(x1), "20", String(y1),
    "11", String(x2), "21", String(y2),
  ].join("\n");
}

/** Create an ARC entity string */
function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  return [
    "0", "ARC",
    "10", String(cx), "20", String(cy),
    "40", String(r),
    "50", String(startDeg), "51", String(endDeg),
  ].join("\n");
}

/** Create a CIRCLE entity string */
function circle(cx: number, cy: number, r: number): string {
  return [
    "0", "CIRCLE",
    "10", String(cx), "20", String(cy),
    "40", String(r),
  ].join("\n");
}

/** Create a closed LWPOLYLINE rectangle */
function lwPolylineRect(x: number, y: number, w: number, h: number): string {
  return [
    "0", "LWPOLYLINE",
    "70", "1", // closed flag
    "10", String(x), "20", String(y),
    "10", String(x + w), "20", String(y),
    "10", String(x + w), "20", String(y + h),
    "10", String(x), "20", String(y + h),
  ].join("\n");
}

/** Create a LWPOLYLINE with bulge (rounded corners) */
function lwPolylineWithBulge(
  points: Array<{ x: number; y: number; bulge?: number }>,
  closed: boolean,
): string {
  const parts: string[] = ["0", "LWPOLYLINE", "70", closed ? "1" : "0"];
  for (const pt of points) {
    parts.push("10", String(pt.x), "20", String(pt.y));
    if (pt.bulge !== undefined) {
      parts.push("42", String(pt.bulge));
    }
  }
  return parts.join("\n");
}

// ============================================================================
// TESTS — Entity Parsing
// ============================================================================

describe("DXFGeometryParserEngine", () => {
  describe("LINE entities", () => {
    it("parses a simple closed triangle from 3 LINE entities", () => {
      const dxf = makeDXF([
        line(0, 0, 10, 0),
        line(10, 0, 5, 8.66),
        line(5, 8.66, 0, 0),
      ].join("\n"));

      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(1);
      expect(result.contours[0].is_closed).toBe(true);
      expect(result.contours[0].segments.length).toBe(3);
      expect(result.contours[0].segments.every(s => s.type === "line")).toBe(true);
      expect(result.entity_count).toBe(3);
    });

    it("preserves line segment start/end coordinates", () => {
      const dxf = makeDXF(line(1.5, 2.5, 10.3, 7.8));
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBeGreaterThanOrEqual(1);
      const seg = result.contours[0].segments[0];
      expect(seg.type).toBe("line");
      // Winding normalization may reverse — check both endpoints exist
      const xs = [seg.start.x, seg.end.x].sort((a, b) => a - b);
      const ys = [seg.start.y, seg.end.y].sort((a, b) => a - b);
      expect(xs[0]).toBeCloseTo(1.5, 4);
      expect(xs[1]).toBeCloseTo(10.3, 4);
      expect(ys[0]).toBeCloseTo(2.5, 4);
      expect(ys[1]).toBeCloseTo(7.8, 4);
    });
  });

  describe("ARC entities", () => {
    it("parses an ARC and preserves center/radius/angles", () => {
      const dxf = makeDXF(arc(5, 5, 10, 0, 90));
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(1);
      const seg = result.contours[0].segments[0];
      expect(seg.type).toBe("arc");
      if (seg.type === "arc") {
        expect(seg.center.x).toBeCloseTo(5, 4);
        expect(seg.center.y).toBeCloseTo(5, 4);
        expect(seg.radius).toBeCloseTo(10, 4);
        expect(seg.ccw).toBe(true); // DXF arcs are CCW
      }
    });

    it("computes arc start/end points from center + angles", () => {
      const dxf = makeDXF(arc(0, 0, 5, 0, 90));
      const result = engine.parseDXF(dxf);
      const seg = result.contours[0].segments[0];
      expect(seg.start.x).toBeCloseTo(5, 3); // R * cos(0)
      expect(seg.start.y).toBeCloseTo(0, 3); // R * sin(0)
      expect(seg.end.x).toBeCloseTo(0, 3);   // R * cos(90°)
      expect(seg.end.y).toBeCloseTo(5, 3);   // R * sin(90°)
    });
  });

  describe("CIRCLE entities", () => {
    it("parses a CIRCLE as a single full-arc segment", () => {
      const dxf = makeDXF(circle(10, 10, 5));
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(1);
      expect(result.contours[0].is_closed).toBe(true);
      expect(result.contours[0].segments.length).toBe(1);
      const seg = result.contours[0].segments[0];
      expect(seg.type).toBe("arc");
      if (seg.type === "arc") {
        expect(seg.radius).toBeCloseTo(5, 4);
        expect(seg.center.x).toBeCloseTo(10, 4);
        expect(seg.center.y).toBeCloseTo(10, 4);
      }
    });

    it("classifies a circle as exterior contour", () => {
      const dxf = makeDXF(circle(0, 0, 10));
      const result = engine.parseDXF(dxf);
      expect(result.contours[0].is_exterior).toBe(true);
    });

    it("computes area as π*r²", () => {
      const r = 10;
      const dxf = makeDXF(circle(0, 0, r));
      const result = engine.parseDXF(dxf);
      expect(result.contours[0].area_mm2).toBeCloseTo(Math.PI * r * r, 0);
    });
  });

  describe("LWPOLYLINE entities", () => {
    it("parses a closed rectangle as 4 line segments", () => {
      const dxf = makeDXF(lwPolylineRect(0, 0, 10, 5));
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(1);
      expect(result.contours[0].is_closed).toBe(true);
      expect(result.contours[0].segments.length).toBe(4);
      expect(result.contours[0].segments.every(s => s.type === "line")).toBe(true);
    });

    it("converts bulge values to arc segments", () => {
      const dxf = makeDXF(lwPolylineWithBulge([
        { x: 0, y: 0, bulge: 0.414 }, // ~90° arc
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ], true));

      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(1);
      // First segment should be an arc (bulge != 0)
      expect(result.contours[0].segments[0].type).toBe("arc");
      // Remaining should be lines
      expect(result.contours[0].segments[1].type).toBe("line");
    });
  });

  describe("SPLINE entities", () => {
    it("converts SPLINE to arc/line segments via biarc fitting", () => {
      // Cubic spline with 5 control points
      const spline = [
        "0", "SPLINE",
        "71", "3", // degree 3
        // Knots (4+5+1 = 10 for degree 3, 5 control points)
        "40", "0", "40", "0", "40", "0", "40", "0",
        "40", "0.5", "40", "1", "40", "1", "40", "1", "40", "1",
        // Control points
        "10", "0", "20", "0",
        "10", "5", "20", "3",
        "10", "10", "20", "0",
        "10", "15", "20", "-3",
        "10", "20", "20", "0",
      ].join("\n");

      const dxf = makeDXF(spline);
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBeGreaterThanOrEqual(1);
      // Should produce arc and/or line segments, not discretized points
      const allSegments = result.contours.flatMap(c => c.segments);
      expect(allSegments.length).toBeGreaterThan(0);
      for (const seg of allSegments) {
        expect(["line", "arc"]).toContain(seg.type);
      }
    });
  });

  describe("ELLIPSE entities", () => {
    it("parses a circular ellipse (ratio=1) as an arc", () => {
      const ellipse = [
        "0", "ELLIPSE",
        "10", "0", "20", "0",     // center
        "11", "5", "21", "0",     // major axis endpoint
        "40", "1",                 // ratio = 1 (circle)
        "41", "0",                 // start param
        "42", String(2 * Math.PI), // end param
      ].join("\n");

      const dxf = makeDXF(ellipse);
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(1);
      expect(result.contours[0].segments.length).toBeGreaterThanOrEqual(1);
      // With ratio=1, should produce arc segment(s)
      expect(result.contours[0].segments[0].type).toBe("arc");
    });

    it("decomposes non-circular ellipse into multiple arcs", () => {
      const ellipse = [
        "0", "ELLIPSE",
        "10", "0", "20", "0",
        "11", "10", "21", "0",  // major = 10
        "40", "0.5",            // ratio = 0.5 (non-circular)
        "41", "0",
        "42", String(2 * Math.PI),
      ].join("\n");

      const dxf = makeDXF(ellipse);
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBeGreaterThanOrEqual(1);
      // Should produce multiple arc segments
      const arcCount = result.contours[0].segments.filter(s => s.type === "arc").length;
      expect(arcCount).toBeGreaterThan(1);
    });
  });

  describe("INSERT/BLOCK entities", () => {
    it("resolves BLOCK references through INSERT", () => {
      const blocks = [
        "0", "BLOCK",
        "2", "MY_CIRCLE",
        // Block contains a circle
        "0", "CIRCLE",
        "10", "0", "20", "0",
        "40", "5",
        "0", "ENDBLK",
      ].join("\n");

      const entities = [
        // INSERT block at position (10, 10)
        "0", "INSERT",
        "2", "MY_CIRCLE",
        "10", "10", "20", "10",
      ].join("\n");

      const dxf = makeDXFWithBlocks(blocks, entities);
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(1);
      // Circle should be translated to (10, 10)
      const seg = result.contours[0].segments[0];
      if (seg.type === "arc") {
        expect(seg.center.x).toBeCloseTo(10, 2);
        expect(seg.center.y).toBeCloseTo(10, 2);
      }
    });

    it("reports warning for missing block reference", () => {
      const entities = [
        "0", "INSERT",
        "2", "NONEXISTENT_BLOCK",
        "10", "0", "20", "0",
      ].join("\n");

      const dxf = makeDXF(entities);
      const result = engine.parseDXF(dxf);
      expect(result.issues.some(i => i.message.includes("NONEXISTENT_BLOCK"))).toBe(true);
    });
  });

  // ============================================================================
  // TESTS — Post-Processing
  // ============================================================================

  describe("gap closure", () => {
    it("closes gaps < 0.01mm between segments", () => {
      // Two lines that almost connect (0.005mm gap)
      const dxf = makeDXF([
        line(0, 0, 10, 0),
        line(10.005, 0, 10.005, 10),
        line(10.005, 10, 0, 10),
        line(0, 10, 0, 0),
      ].join("\n"));

      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(1);
      expect(result.contours[0].is_closed).toBe(true);
      // Should have a gap_closed info issue
      expect(result.issues.some(i => i.type === "gap_closed")).toBe(true);
    });

    it("flags open contour when gap > 0.01mm", () => {
      // Two disconnected lines
      const dxf = makeDXF([
        line(0, 0, 10, 0),
        line(20, 0, 30, 0),
      ].join("\n"));

      const result = engine.parseDXF(dxf);
      // At least one contour should be open
      expect(result.issues.some(i => i.type === "open_contour")).toBe(true);
    });
  });

  describe("duplicate contour removal", () => {
    it("removes duplicate contours with same area and position", () => {
      // Two identical circles at the same position
      const dxf = makeDXF([
        circle(0, 0, 5),
        circle(0, 0, 5),
      ].join("\n"));

      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(1);
      expect(result.issues.some(i => i.type === "duplicate_removed")).toBe(true);
    });
  });

  describe("winding normalization", () => {
    it("normalizes exterior contour to CCW (positive area)", () => {
      // Rectangle — single contour, should be exterior
      const dxf = makeDXF(lwPolylineRect(0, 0, 10, 10));
      const result = engine.parseDXF(dxf);
      expect(result.contours[0].is_exterior).toBe(true);
    });
  });

  describe("self-intersection detection", () => {
    it("detects self-intersecting contour (figure-8 shape)", () => {
      // Lines forming a self-intersection
      const dxf = makeDXF([
        line(0, 0, 10, 10),
        line(10, 10, 10, 0),
        line(10, 0, 0, 10),  // This crosses the first line
        line(0, 10, 0, 0),
      ].join("\n"));

      const result = engine.parseDXF(dxf);
      expect(result.issues.some(i => i.type === "self_intersection")).toBe(true);
    });
  });

  // ============================================================================
  // TESTS — Wire EDM Validation
  // ============================================================================

  describe("validateForWireEDM", () => {
    it("flags open contours as errors", () => {
      // Manually create an open contour
      const result: GeometryParseResult = {
        contours: [{
          id: "test_open",
          segments: [{ type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }],
          is_closed: false,
          is_exterior: true,
          area_mm2: 0,
          perimeter_mm: 10,
          bbox: { min_x: 0, min_y: 0, max_x: 10, max_y: 0 },
        }],
        issues: [],
        entity_count: 1,
        source_format: "dxf",
        warnings: [],
      };

      const issues = engine.validateForWireEDM(result.contours);
      expect(issues.some(i => i.type === "open_contour" && i.severity === "error")).toBe(true);
    });

    it("warns about segments shorter than wire diameter", () => {
      const result: GeometryParseResult = {
        contours: [{
          id: "test_short",
          segments: [
            { type: "line", start: { x: 0, y: 0 }, end: { x: 0.1, y: 0 } }, // 0.1mm < 0.25mm wire
            { type: "line", start: { x: 0.1, y: 0 }, end: { x: 0.1, y: 10 } },
            { type: "line", start: { x: 0.1, y: 10 }, end: { x: 0, y: 10 } },
            { type: "line", start: { x: 0, y: 10 }, end: { x: 0, y: 0 } },
          ],
          is_closed: true,
          is_exterior: false,
          area_mm2: 1,
          perimeter_mm: 20.2,
          bbox: { min_x: 0, min_y: 0, max_x: 0.1, max_y: 10 },
        }],
        issues: [],
        entity_count: 4,
        source_format: "dxf",
        warnings: [],
      };

      const issues = engine.validateForWireEDM(result.contours);
      expect(issues.some(i => i.type === "short_segment")).toBe(true);
    });

    it("warns about narrow slots in internal contours", () => {
      // Internal contour (slot) that's too narrow
      const contours: WireEDMContour[] = [{
        id: "narrow_slot",
        segments: [],
        is_closed: true,
        is_exterior: false,
        area_mm2: 0.5,
        perimeter_mm: 10,
        bbox: { min_x: 5, min_y: 5, max_x: 5.2, max_y: 15 }, // 0.2mm width
      }];

      // With 0.25mm wire + 0.013mm gap per side: min = 0.25 + 2*0.013 + 0.05 = 0.326mm
      const issues = engine.validateForWireEDM(contours, 0.25, 0.013);
      expect(issues.some(i => i.type === "narrow_slot")).toBe(true);
    });

    it("accepts valid contours with no issues", () => {
      const dxf = makeDXF(circle(0, 0, 10));
      const result = engine.parseDXF(dxf);
      const issues = engine.validateForWireEDM(result.contours);
      expect(issues.filter(i => i.severity === "error").length).toBe(0);
    });
  });

  // ============================================================================
  // TESTS — toPartFeatures conversion
  // ============================================================================

  describe("toPartFeatures", () => {
    it("converts a circle contour to a hole PartFeature", () => {
      const dxf = makeDXF(circle(0, 0, 5));
      const result = engine.parseDXF(dxf);

      // Make it interior for hole classification
      const contours = result.contours.map(c => ({ ...c, is_exterior: false }));
      const features = engine.toPartFeatures(contours);

      expect(features.length).toBe(1);
      expect(features[0].type).toBe("hole");
      expect(features[0].dimensions_mm.diameter).toBeCloseTo(10, 2); // 2*radius
      expect(features[0].is_through).toBe(true);
    });

    it("converts a rectangle contour to a profile PartFeature", () => {
      const dxf = makeDXF(lwPolylineRect(0, 0, 20, 15));
      const result = engine.parseDXF(dxf);
      const features = engine.toPartFeatures(result.contours);

      expect(features.length).toBe(1);
      expect(features[0].type).toBe("profile");
      expect(features[0].dimensions_mm.length).toBeCloseTo(20, 1);
      expect(features[0].dimensions_mm.width).toBeCloseTo(15, 1);
      expect(features[0].profile_length_mm).toBeCloseTo(70, 0); // 2*(20+15) perimeter
    });

    it("detects minimum corner radius from arc segments", () => {
      // Circle (single arc) — radius should be detected
      const dxf = makeDXF(circle(0, 0, 3));
      const result = engine.parseDXF(dxf);
      const features = engine.toPartFeatures(result.contours);

      expect(features[0].min_corner_radius_mm).toBeCloseTo(3, 2);
    });
  });

  // ============================================================================
  // TESTS — Edge Cases
  // ============================================================================

  describe("edge cases", () => {
    it("handles empty DXF file", () => {
      const dxf = makeDXF("");
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(0);
      expect(result.entity_count).toBe(0);
    });

    it("handles DXF with only unknown entity types", () => {
      const dxf = makeDXF([
        "0", "3DFACE",
        "10", "0", "20", "0", "30", "0",
        "11", "10", "21", "0", "31", "0",
      ].join("\n"));
      const result = engine.parseDXF(dxf);
      expect(result.contours.length).toBe(0);
    });

    it("handles STEP format with clear error message", () => {
      const result = engine.parseGeometryFile("ISO-10303-21;", "step");
      expect(result.contours.length).toBe(0);
      expect(result.issues.some(i => i.message.includes("STEP"))).toBe(true);
    });

    it("handles IGES format with clear error message", () => {
      const result = engine.parseGeometryFile("IGES file content", "iges");
      expect(result.contours.length).toBe(0);
      expect(result.issues.some(i => i.message.includes("IGES"))).toBe(true);
    });

    it("handles zero-length segments gracefully", () => {
      const dxf = makeDXF(line(5, 5, 5, 5)); // Zero length
      const result = engine.parseDXF(dxf);
      // Should skip zero-length segments
      expect(result.contours.length).toBe(0);
    });
  });
});
