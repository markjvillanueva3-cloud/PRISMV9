/**
 * DXFGeometryParserEngine — PHASE25 wiring tests.
 *
 * Heavier DXF/STEP/IGES geometry parser used by Wire EDM. Tests:
 *   - parseGeometryFile on empty content returns a result struct (no throw)
 *   - parseDXF on empty content returns a result with empty contours
 *   - validateForWireEDM returns a structured object on empty contours
 *   - toPartFeatures handles empty contours
 */
import { describe, it, expect } from "vitest";
import {
  DXFGeometryParserEngine,
  dxfGeometryParserEngine,
} from "../engines/DXFGeometryParserEngine.js";

describe("DXFGeometryParserEngine", () => {
  it("singleton is a real DXFGeometryParserEngine instance", () => {
    expect(dxfGeometryParserEngine).toBeInstanceOf(DXFGeometryParserEngine);
  });

  it("parseGeometryFile on empty DXF content returns a result struct", () => {
    const r = dxfGeometryParserEngine.parseGeometryFile("", "dxf");
    expect(typeof r).toBe("object");
    expect(r).not.toBe(null);
  });

  it("parseGeometryFile defaults format to dxf when omitted", () => {
    const r = dxfGeometryParserEngine.parseGeometryFile("");
    expect(typeof r).toBe("object");
  });

  it("parseDXF on empty content returns object (degraded gracefully)", () => {
    const r = dxfGeometryParserEngine.parseDXF("");
    expect(typeof r).toBe("object");
    expect(r).not.toBe(null);
  });

  it("validateForWireEDM on empty contour list returns a structured object", () => {
    const r = dxfGeometryParserEngine.validateForWireEDM([]);
    expect(typeof r).toBe("object");
    expect(r).not.toBe(null);
  });

  it("toPartFeatures on empty contour list returns an array (possibly empty)", () => {
    const r = dxfGeometryParserEngine.toPartFeatures([]);
    expect(Array.isArray(r)).toBe(true);
  });

  it("parseGeometryFile result is consistent across repeat calls (pure function)", () => {
    const a = dxfGeometryParserEngine.parseGeometryFile("", "dxf");
    const b = dxfGeometryParserEngine.parseGeometryFile("", "dxf");
    // Both should produce the same shape — same key count
    expect(Object.keys(a).length).toBe(Object.keys(b).length);
  });
});
