/**
 * U-PARSER-POLYLINE — legacy POLYLINE / VERTEX / SEQEND entity support.
 *
 * v3 of DXFGeometryParserEngine supported LINE/ARC/CIRCLE/LWPOLYLINE/ELLIPSE/
 * SPLINE only — legacy POLYLINE was unsupported. JM Die's AF102-05.dxf (and
 * many other AutoCAD R12/R13-era shop files) emit `AcDb2dPolyline` which uses
 * the legacy format: one POLYLINE header → N VERTEX subrecords → SEQEND.
 *
 * These tests exercise the parsePolyline() method introduced in iter 32. They
 * use deterministic hand-authored DXF text rather than fixture files because
 * the format is line-pair group codes — easy to write inline + commits stay
 * reviewable (no binary churn).
 *
 * Each test covers a real-shop pattern OR a malformed input the parser must
 * survive without crashing.
 */
import { describe, it, expect } from "vitest";
import { dxfGeometryParserEngine } from "../engines/DXFGeometryParserEngine.js";

/** Build a minimal DXF text from line pairs. Each entry becomes one line. */
function makeDxf(...lines: Array<string | number>): string {
  return lines.map(String).join("\n") + "\n";
}

/** Wrap entity payload between ENTITIES + ENDSEC + EOF. */
function entitiesSection(...lines: Array<string | number>): string {
  return makeDxf(
    "0", "SECTION", "2", "ENTITIES",
    ...lines,
    "0", "ENDSEC",
    "0", "EOF",
  );
}

describe("DXFGeometryParserEngine — legacy POLYLINE support (U-PARSER-POLYLINE)", () => {
  it("open polyline with 3 vertices → 2 line segments, not closed", () => {
    const dxf = entitiesSection(
      "0", "POLYLINE",
      "70", "0",
      "0", "VERTEX", "10", "0.0", "20", "0.0",
      "0", "VERTEX", "10", "10.0", "20", "0.0",
      "0", "VERTEX", "10", "10.0", "20", "10.0",
      "0", "SEQEND",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    // 3 vertices, open → 2 line segments forming an L
    const allSegs = r.contours.flatMap((c) => c.segments);
    expect(allSegs).toHaveLength(2);
    expect(allSegs[0].type).toBe("line");
    expect(allSegs[1].type).toBe("line");
    expect(allSegs[0].start).toEqual({ x: 0, y: 0 });
    expect(allSegs[0].end).toEqual({ x: 10, y: 0 });
    expect(allSegs[1].start).toEqual({ x: 10, y: 0 });
    expect(allSegs[1].end).toEqual({ x: 10, y: 10 });
  });

  it("closed polyline (group 70 bit 1) — 4 vertices form a closed square (4 segments)", () => {
    const dxf = entitiesSection(
      "0", "POLYLINE",
      "70", "1",
      "0", "VERTEX", "10", "0.0", "20", "0.0",
      "0", "VERTEX", "10", "10.0", "20", "0.0",
      "0", "VERTEX", "10", "10.0", "20", "10.0",
      "0", "VERTEX", "10", "0.0", "20", "10.0",
      "0", "SEQEND",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const allSegs = r.contours.flatMap((c) => c.segments);
    expect(allSegs).toHaveLength(4);
    // closing segment goes from (0,10) back to (0,0)
    expect(allSegs[3].start).toEqual({ x: 0, y: 10 });
    expect(allSegs[3].end).toEqual({ x: 0, y: 0 });
    // is_closed should be true on the resulting contour
    expect(r.contours[0].is_closed).toBe(true);
  });

  it("polyline with bulge on one vertex → arc segment for that span, line for others", () => {
    // Bulge = tan(theta/4); bulge=1 → quarter circle (90° arc).
    const dxf = entitiesSection(
      "0", "POLYLINE",
      "70", "0",
      "0", "VERTEX", "10", "0.0", "20", "0.0", "42", "1.0",
      "0", "VERTEX", "10", "10.0", "20", "0.0",
      "0", "VERTEX", "10", "10.0", "20", "10.0",
      "0", "SEQEND",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const allSegs = r.contours.flatMap((c) => c.segments);
    expect(allSegs).toHaveLength(2);
    expect(allSegs[0].type).toBe("arc"); // first segment is the bulge arc
    expect(allSegs[1].type).toBe("line"); // second is straight
  });

  it("empty polyline (POLYLINE → SEQEND with no VERTEX) — 0 segments, no crash", () => {
    const dxf = entitiesSection(
      "0", "POLYLINE",
      "70", "0",
      "0", "SEQEND",
    );
    expect(() => dxfGeometryParserEngine.parseDXF(dxf)).not.toThrow();
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const allSegs = r.contours.flatMap((c) => c.segments);
    expect(allSegs).toHaveLength(0);
  });

  it("malformed: VERTEX without preceding POLYLINE → no segments, no crash, treated as orphan entity", () => {
    const dxf = entitiesSection(
      "0", "VERTEX", "10", "5.0", "20", "5.0",
    );
    expect(() => dxfGeometryParserEngine.parseDXF(dxf)).not.toThrow();
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    expect(r.contours).toHaveLength(0);
  });

  it("malformed: POLYLINE without SEQEND followed by a LINE — emit polyline segments + parse the LINE", () => {
    const dxf = entitiesSection(
      "0", "POLYLINE",
      "70", "0",
      "0", "VERTEX", "10", "0.0", "20", "0.0",
      "0", "VERTEX", "10", "5.0", "20", "0.0",
      // No SEQEND — next entity is a LINE
      "0", "LINE",
      "10", "100.0", "20", "100.0", "11", "200.0", "21", "200.0",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const allSegs = r.contours.flatMap((c) => c.segments);
    // polyline yields 1 line segment + standalone LINE yields 1 → 2 total
    expect(allSegs).toHaveLength(2);
    // standalone LINE should be present connecting (100,100) ↔ (200,200).
    // normalizeWinding may flip start/end — check either direction.
    const hasStandalone = allSegs.some((s) => {
      if (s.type !== "line") return false;
      const endpoints = [
        [s.start.x, s.start.y, s.end.x, s.end.y].join(","),
        [s.end.x, s.end.y, s.start.x, s.start.y].join(","),
      ];
      return endpoints.includes("100,100,200,200");
    });
    expect(hasStandalone).toBe(true);
  });

  it("mixed entities: POLYLINE + LINE + CIRCLE in one ENTITIES section — all parse", () => {
    const dxf = entitiesSection(
      "0", "POLYLINE",
      "70", "0",
      "0", "VERTEX", "10", "0.0", "20", "0.0",
      "0", "VERTEX", "10", "1.0", "20", "0.0",
      "0", "SEQEND",
      "0", "LINE",
      "10", "5.0", "20", "5.0", "11", "6.0", "21", "5.0",
      "0", "CIRCLE",
      "10", "20.0", "20", "20.0", "40", "3.0",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const allSegs = r.contours.flatMap((c) => c.segments);
    // 1 line (polyline span) + 1 line (standalone) + 1 arc (CIRCLE) = 3
    expect(allSegs).toHaveLength(3);
    expect(allSegs.filter((s) => s.type === "line")).toHaveLength(2);
    expect(allSegs.filter((s) => s.type === "arc")).toHaveLength(1);
  });

  it("3D polyline (group 70 bit 8 = 8) — projects to 2D, still produces segments", () => {
    const dxf = entitiesSection(
      "0", "POLYLINE",
      "70", "8", // bit 8 = 3D polyline
      "0", "VERTEX", "10", "0.0", "20", "0.0", "30", "5.0",
      "0", "VERTEX", "10", "10.0", "20", "0.0", "30", "5.0",
      "0", "VERTEX", "10", "10.0", "20", "10.0", "30", "5.0",
      "0", "SEQEND",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const allSegs = r.contours.flatMap((c) => c.segments);
    // Z dropped, XY projection yields 2 line segments
    expect(allSegs).toHaveLength(2);
  });

  it("polyline inside a BLOCK referenced by INSERT — parses via extractBlocks path", () => {
    const dxf = makeDxf(
      "0", "SECTION", "2", "BLOCKS",
      "0", "BLOCK",
      "2", "MYBLOCK",
      "0", "POLYLINE",
      "70", "0",
      "0", "VERTEX", "10", "0.0", "20", "0.0",
      "0", "VERTEX", "10", "2.0", "20", "0.0",
      "0", "VERTEX", "10", "2.0", "20", "2.0",
      "0", "SEQEND",
      "0", "ENDBLK",
      "0", "ENDSEC",
      "0", "SECTION", "2", "ENTITIES",
      "0", "INSERT",
      "2", "MYBLOCK",
      "10", "100.0", "20", "200.0",
      "0", "ENDSEC",
      "0", "EOF",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    const allSegs = r.contours.flatMap((c) => c.segments);
    // Block content (2 line segments from 3 vertices) translated by INSERT offset (100,200)
    expect(allSegs).toHaveLength(2);
    // Some endpoint must land at the INSERT origin (100,200) — direction-agnostic
    // since normalizeWinding may flip chain orientation.
    const endpoints = allSegs.flatMap((s) => [s.start, s.end]);
    const hasOrigin = endpoints.some((p) => Math.abs(p.x - 100) < 1e-5 && Math.abs(p.y - 200) < 1e-5);
    expect(hasOrigin).toBe(true);
    // And another endpoint must land at the far corner (102,202)
    const hasCorner = endpoints.some((p) => Math.abs(p.x - 102) < 1e-5 && Math.abs(p.y - 202) < 1e-5);
    expect(hasCorner).toBe(true);
  });

  it("AF102-05 reproduction fixture: 2 CIRCLE + 1 POLYLINE — all 3 entities parse", () => {
    // Mirrors the real JM Die part that hit the v3 gap.
    const dxf = entitiesSection(
      "0", "POLYLINE",
      "70", "1",
      "0", "VERTEX", "10", "-12.5", "20", "-12.5",
      "0", "VERTEX", "10", "12.5", "20", "-12.5",
      "0", "VERTEX", "10", "12.5", "20", "12.5",
      "0", "VERTEX", "10", "-12.5", "20", "12.5",
      "0", "SEQEND",
      "0", "CIRCLE",
      "10", "5.0", "20", "5.0", "40", "1.0",
      "0", "CIRCLE",
      "10", "-5.0", "20", "-5.0", "40", "1.0",
    );
    const r = dxfGeometryParserEngine.parseDXF(dxf);
    expect(r.entity_count).toBeGreaterThanOrEqual(3); // POLYLINE + 2 CIRCLE
    const allSegs = r.contours.flatMap((c) => c.segments);
    // 4 polyline lines (closed square) + 2 CIRCLE arcs = 6 segments
    expect(allSegs).toHaveLength(6);
    expect(allSegs.filter((s) => s.type === "arc")).toHaveLength(2);
    expect(allSegs.filter((s) => s.type === "line")).toHaveLength(4);
    // Must produce at least 3 contours (1 closed square + 2 circles)
    expect(r.contours.length).toBeGreaterThanOrEqual(3);
  });
});
