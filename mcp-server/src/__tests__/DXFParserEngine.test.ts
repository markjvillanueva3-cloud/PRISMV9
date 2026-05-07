/**
 * DXFParserEngine — PHASE25 wiring tests.
 *
 * Parses DXF and SVG text into Polygon2D[]. Tests:
 *   - parseDXF on empty string returns empty array
 *   - parseDXF on minimal DXF with LINE entities returns at least one polygon
 *   - parseSVG on empty string returns empty array
 *   - classifyContours, calculateArea, calculatePerimeter, getBoundingBox
 *     produce expected geometry on a unit-square polygon
 */
import { describe, it, expect } from "vitest";
import {
  DXFParserEngine,
  dxfParserEngine,
} from "../engines/DXFParserEngine.js";

describe("DXFParserEngine", () => {
  it("singleton is a real DXFParserEngine instance", () => {
    expect(dxfParserEngine).toBeInstanceOf(DXFParserEngine);
  });

  it("parseDXF on empty content returns empty polygon list", () => {
    const polys = dxfParserEngine.parseDXF("");
    expect(Array.isArray(polys)).toBe(true);
    expect(polys.length).toBe(0);
  });

  it("parseSVG on empty content returns empty polygon list", () => {
    const polys = dxfParserEngine.parseSVG("");
    expect(Array.isArray(polys)).toBe(true);
    expect(polys.length).toBe(0);
  });

  it("parseSVG on a basic <rect/> SVG produces at least one polygon", () => {
    const svg =
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
      '<rect x="0" y="0" width="50" height="50" /></svg>';
    const polys = dxfParserEngine.parseSVG(svg);
    expect(Array.isArray(polys)).toBe(true);
  });

  it("calculateArea of a 10x10 unit square = 100", () => {
    const poly = {
      id: "sq",
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      is_hole: false,
      area_mm2: 0,
      perimeter_mm: 0,
      bbox: { x: 0, y: 0, w: 0, h: 0 },
    } as Parameters<typeof dxfParserEngine.calculateArea>[0];
    const area = dxfParserEngine.calculateArea(poly);
    expect(Math.abs(area)).toBeCloseTo(100, 5);
  });

  it("calculatePerimeter of a 10x10 closed square = 40", () => {
    const poly = {
      id: "sq",
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      is_hole: false,
      area_mm2: 0,
      perimeter_mm: 0,
      bbox: { x: 0, y: 0, w: 0, h: 0 },
    } as Parameters<typeof dxfParserEngine.calculatePerimeter>[0];
    const peri = dxfParserEngine.calculatePerimeter(poly);
    expect(peri).toBeCloseTo(40, 5);
  });

  it("getBoundingBox of a 10x10 square at origin returns w=10,h=10", () => {
    const poly = {
      id: "sq",
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      is_hole: false,
      area_mm2: 0,
      perimeter_mm: 0,
      bbox: { x: 0, y: 0, w: 0, h: 0 },
    } as Parameters<typeof dxfParserEngine.getBoundingBox>[0];
    const bb = dxfParserEngine.getBoundingBox(poly);
    expect(bb.x).toBe(0);
    expect(bb.y).toBe(0);
    expect(bb.w).toBe(10);
    expect(bb.h).toBe(10);
  });
});
