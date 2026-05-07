/**
 * CAD-INPUT-MS0 — DxfWriterEngine comprehensive test.
 *
 * Covers:
 *   • Reference values on a known rectangle (vertex coords, area, perimeter).
 *   • Round-trip: write → parse recovers vertex count and positions.
 *   • Failure modes: empty polygons, non-finite coords, invalid layer name.
 *   • Adversarial inputs: Infinity/NaN, oversize polygon, degenerate 2-vertex.
 *   • Variability: rectangle, circle, concave polygon, polygon with hole.
 *   • Dispatcher round-trip: both dxf_write_polygons and dxf_parse actions.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  dxfWriterEngine,
  DxfWriterEngine,
} from "../engines/DxfWriterEngine.js";
import {
  dxfParserEngine,
  type Polygon2D,
} from "../engines/DXFParserEngine.js";
import { registerCadAutomationDispatcher } from "../tools/dispatchers/cadAutomationDispatcher.js";

// ───────────────── Helpers ─────────────────

function square(id: string, size = 10, originX = 0, originY = 0): Polygon2D {
  return {
    id,
    vertices: [
      { x: originX, y: originY },
      { x: originX + size, y: originY },
      { x: originX + size, y: originY + size },
      { x: originX, y: originY + size },
    ],
    is_hole: false,
    area_mm2: size * size,
    perimeter_mm: 4 * size,
    bbox: { x: originX, y: originY, w: size, h: size },
  };
}

// ───────────────── Reference-value tests ─────────────────

describe("DxfWriterEngine.writePolygonsToDxf — reference values", () => {
  it("writes a valid DXF with required sections for a single square", () => {
    const r = dxfWriterEngine.writePolygonsToDxf([square("sq1", 5)]);
    expect(r.polygon_count).toBe(1);
    expect(r.vertex_count).toBe(4);
    expect(r.dxf).toContain("SECTION");
    expect(r.dxf).toContain("HEADER");
    expect(r.dxf).toContain("$ACADVER");
    expect(r.dxf).toContain("TABLES");
    expect(r.dxf).toContain("LAYER");
    expect(r.dxf).toContain("ENTITIES");
    expect(r.dxf).toContain("LWPOLYLINE");
    expect(r.dxf).toContain("EOF");
    expect(r.bytes).toBe(r.dxf.length);
  });

  it("emits exactly one LWPOLYLINE per polygon", () => {
    const polys = [square("a"), square("b", 20), square("c", 15, 50, 50)];
    const r = dxfWriterEngine.writePolygonsToDxf(polys);
    const matches = r.dxf.match(/LWPOLYLINE/g) ?? [];
    expect(matches.length).toBe(3);
  });

  it("uses default 'AC1009' for R12 unless overridden", () => {
    const def = dxfWriterEngine.writePolygonsToDxf([square("s")]);
    const over = dxfWriterEngine.writePolygonsToDxf([square("s")], { acadver: "AC1027" });
    expect(def.dxf).toContain("AC1009");
    expect(over.dxf).toContain("AC1027");
  });

  it("places outer polygons on layer '0' and holes on 'HOLES' by default", () => {
    const outer = square("outer");
    const hole = { ...square("hole", 3, 1, 1), is_hole: true };
    const r = dxfWriterEngine.writePolygonsToDxf([outer, hole]);
    expect(r.layers).toContain("0");
    expect(r.layers).toContain("HOLES");
    expect(r.dxf).toContain("HOLES");
  });

  it("respects custom layer names", () => {
    const r = dxfWriterEngine.writePolygonsToDxf([square("s")], {
      outer_layer: "OUTLINE",
    });
    expect(r.layers).toContain("OUTLINE");
    expect(r.dxf).toContain("OUTLINE");
  });

  it("emits vertex coords at the requested precision", () => {
    const poly: Polygon2D = {
      id: "p",
      vertices: [
        { x: 1.123456789, y: 2.987654321 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      is_hole: false,
      area_mm2: 50,
      perimeter_mm: 30,
      bbox: { x: 0, y: 0, w: 10, h: 10 },
    };
    const low = dxfWriterEngine.writePolygonsToDxf([poly], { precision: 2 });
    const high = dxfWriterEngine.writePolygonsToDxf([poly], { precision: 8 });
    expect(low.dxf).toContain("1.12");
    expect(low.dxf).not.toContain("1.1234");
    expect(high.dxf).toContain("1.12345679");
  });

  it("drops duplicate closing vertex when polygon ends at start", () => {
    const closed: Polygon2D = {
      ...square("closed"),
      // Add duplicate closing vertex
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 }, // dup
      ],
    };
    const r = dxfWriterEngine.writePolygonsToDxf([closed]);
    // Expect 90 group code value "4" (4 vertices, not 5)
    expect(r.dxf).toMatch(/90\n4\n/);
  });
});

// ───────────────── Round-trip through parser ─────────────────

describe("DxfWriterEngine — round-trip via DXFParserEngine", () => {
  it("writes a square and parser recovers 4 corner vertices", () => {
    const sq = square("rt1", 25, 10, 20);
    const r = dxfWriterEngine.writePolygonsToDxf([sq]);
    const parsed = dxfParserEngine.parseDXF(r.dxf);
    expect(parsed.length).toBe(1);
    // Parser may reorder/deduplicate vertices; assert corner set matches
    const cornerSet = new Set(
      parsed[0].vertices.map((v) => `${v.x.toFixed(3)},${v.y.toFixed(3)}`),
    );
    expect(cornerSet.has("10.000,20.000")).toBe(true);
    expect(cornerSet.has("35.000,20.000")).toBe(true);
    expect(cornerSet.has("35.000,45.000")).toBe(true);
    expect(cornerSet.has("10.000,45.000")).toBe(true);
  });

  it("writes and parses 3 distinct polygons preserving count", () => {
    const polys = [square("a", 5), square("b", 8, 20, 0), square("c", 3, 0, 30)];
    const r = dxfWriterEngine.writePolygonsToDxf(polys);
    const parsed = dxfParserEngine.parseDXF(r.dxf);
    expect(parsed.length).toBe(3);
  });

  it("round-trip preserves area on a rectangle within 0.1%", () => {
    const sq = square("area", 100);
    const r = dxfWriterEngine.writePolygonsToDxf([sq]);
    const parsed = dxfParserEngine.parseDXF(r.dxf);
    expect(parsed[0].area_mm2).toBeCloseTo(sq.area_mm2, 1);
  });

  it("round-trip through circle polygon preserves vertex count (minus dedup)", () => {
    const circle = dxfWriterEngine.circlePolygon("c", 0, 0, 10, 36);
    const r = dxfWriterEngine.writePolygonsToDxf([circle]);
    const parsed = dxfParserEngine.parseDXF(r.dxf);
    expect(parsed.length).toBe(1);
    // Parser may add a closing vertex, so accept 36 or 37
    expect([36, 37]).toContain(parsed[0].vertices.length);
  });
});

// ───────────────── Failure modes ─────────────────

describe("DxfWriterEngine — failure modes", () => {
  it("rejects empty polygon array", () => {
    expect(() => dxfWriterEngine.writePolygonsToDxf([])).toThrow(/empty/);
  });

  it("rejects polygon with fewer than 2 vertices", () => {
    const bad: Polygon2D = {
      id: "degen",
      vertices: [{ x: 0, y: 0 }],
      is_hole: false,
      area_mm2: 0,
      perimeter_mm: 0,
      bbox: { x: 0, y: 0, w: 0, h: 0 },
    };
    expect(() => dxfWriterEngine.writePolygonsToDxf([bad])).toThrow(/≥2 vertices/);
  });

  it("rejects NaN vertex coord", () => {
    const bad = square("nan");
    bad.vertices[0] = { x: NaN, y: 0 };
    expect(() => dxfWriterEngine.writePolygonsToDxf([bad])).toThrow(/non-finite/);
  });

  it("rejects forbidden character in layer name", () => {
    expect(() =>
      dxfWriterEngine.writePolygonsToDxf([square("s")], { outer_layer: "BAD<LAYER" }),
    ).toThrow(/forbidden character/);
  });

  it("rejects non-array polygons input", () => {
    expect(() =>
      (dxfWriterEngine.writePolygonsToDxf as any)("not-an-array"),
    ).toThrow(/must be an array/);
  });
});

// ───────────────── Adversarial inputs ─────────────────

describe("DxfWriterEngine — adversarial inputs", () => {
  it("rejects Infinity coord", () => {
    const bad = square("inf");
    bad.vertices[1] = { x: Infinity, y: 0 };
    expect(() => dxfWriterEngine.writePolygonsToDxf([bad])).toThrow(/non-finite/);
  });

  it("handles oversize polygon (10,000 vertices)", () => {
    const vertices = [];
    for (let i = 0; i < 10000; i++) {
      vertices.push({ x: Math.cos(i * 0.001), y: Math.sin(i * 0.001) });
    }
    const poly: Polygon2D = {
      id: "big",
      vertices,
      is_hole: false,
      area_mm2: Math.PI,
      perimeter_mm: 2 * Math.PI,
      bbox: { x: -1, y: -1, w: 2, h: 2 },
    };
    const r = dxfWriterEngine.writePolygonsToDxf([poly]);
    expect(r.vertex_count).toBe(10000);
    expect(r.bytes).toBeGreaterThan(100000);
  });

  it("handles minimum 2-vertex polyline (open line)", () => {
    const line: Polygon2D = {
      id: "line",
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      is_hole: false,
      area_mm2: 0,
      perimeter_mm: 10,
      bbox: { x: 0, y: 0, w: 10, h: 0 },
    };
    const r = dxfWriterEngine.writePolygonsToDxf([line]);
    expect(r.dxf).toContain("LWPOLYLINE");
    expect(r.vertex_count).toBe(2);
  });

  it("precision clamps to [0, 15]", () => {
    const sq = square("clamp");
    const neg = dxfWriterEngine.writePolygonsToDxf([sq], { precision: -5 });
    const huge = dxfWriterEngine.writePolygonsToDxf([sq], { precision: 999 });
    // 0 precision emits integer-like "0", 15 emits fractional-heavy
    expect(neg.dxf).toContain("0\n"); // precision 0
    expect(huge.bytes).toBeGreaterThan(neg.bytes);
  });
});

// ───────────────── Variability: 3+ distinct shape families ─────────────────

describe("DxfWriterEngine — variability across shape families", () => {
  it("rectangle helper produces parseable DXF", () => {
    const rect = dxfWriterEngine.rectanglePolygon("r", 5, 5, 30, 20);
    const r = dxfWriterEngine.writePolygonsToDxf([rect]);
    const parsed = dxfParserEngine.parseDXF(r.dxf);
    expect(parsed.length).toBe(1);
    expect(parsed[0].bbox.w).toBeCloseTo(30, 1);
    expect(parsed[0].bbox.h).toBeCloseTo(20, 1);
  });

  it("circle helper (36 segments) produces parseable DXF", () => {
    const circle = dxfWriterEngine.circlePolygon("c", 100, 100, 25, 36);
    const r = dxfWriterEngine.writePolygonsToDxf([circle]);
    const parsed = dxfParserEngine.parseDXF(r.dxf);
    expect(parsed.length).toBe(1);
    // Bbox of a circle at (100,100) with r=25: x=75, y=75, w=50, h=50
    expect(parsed[0].bbox.w).toBeCloseTo(50, 0);
  });

  it("concave polygon (L-shape) round-trips", () => {
    const lShape: Polygon2D = {
      id: "L",
      vertices: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 20 },
        { x: 0, y: 20 },
      ],
      is_hole: false,
      area_mm2: 300,
      perimeter_mm: 80,
      bbox: { x: 0, y: 0, w: 20, h: 20 },
    };
    const r = dxfWriterEngine.writePolygonsToDxf([lShape]);
    const parsed = dxfParserEngine.parseDXF(r.dxf);
    expect(parsed.length).toBe(1);
  });

  it("outer + hole polygon → two layers, two entities", () => {
    const outer = dxfWriterEngine.rectanglePolygon("outer", 0, 0, 100, 100);
    const hole = dxfWriterEngine.rectanglePolygon("hole", 30, 30, 40, 40, true);
    const r = dxfWriterEngine.writePolygonsToDxf([outer, hole]);
    expect(r.polygon_count).toBe(2);
    expect(r.layers).toHaveLength(2);
    const matches = r.dxf.match(/LWPOLYLINE/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it("rectanglePolygon rejects non-positive dimensions", () => {
    expect(() => dxfWriterEngine.rectanglePolygon("r", 0, 0, -1, 10)).toThrow(
      /non-positive/,
    );
  });

  it("circlePolygon rejects non-positive radius", () => {
    expect(() => dxfWriterEngine.circlePolygon("c", 0, 0, 0)).toThrow(
      /non-positive radius/,
    );
  });
});

// ───────────────── Engine singleton equivalence ─────────────────

describe("DxfWriterEngine — singleton stability", () => {
  it("fresh instance produces byte-identical DXF for same input", () => {
    const fresh = new DxfWriterEngine();
    const polys = [square("x", 7), square("y", 11, 30, 30)];
    const a = dxfWriterEngine.writePolygonsToDxf(polys, { precision: 4 });
    const b = fresh.writePolygonsToDxf(polys, { precision: 4 });
    expect(a.dxf).toBe(b.dxf);
    expect(a.bytes).toBe(b.bytes);
  });
});

// ───────────────── Dispatcher round-trip (wiring verification) ─────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      captured.push({ name, description, schema, handler });
    },
  };
}

describe("dxf_write_polygons / dxf_parse — dispatcher round-trip", () => {
  let handler: CapturedTool["handler"];

  beforeAll(() => {
    process.env["PRISM_CAD_MOCK"] = "1";
    const server = makeStubServer();
    registerCadAutomationDispatcher(server as any);
    const tool = server.tools.find((t) => t.name === "prism_cad_automation");
    if (!tool) throw new Error("prism_cad_automation tool was not registered");
    handler = tool.handler;
  });

  async function invoke(action: string, params: Record<string, unknown>) {
    const res = await handler({ action, params });
    const text = res.content[0]?.text ?? "";
    try {
      return JSON.parse(text) as any;
    } catch {
      return { __raw: text };
    }
  }

  it("dispatcher exposes dxf_write_polygons and dxf_parse in tool description", () => {
    const server = makeStubServer();
    registerCadAutomationDispatcher(server as any);
    const tool = server.tools.find((t) => t.name === "prism_cad_automation");
    expect(tool!.description).toContain("dxf_write_polygons");
    expect(tool!.description).toContain("dxf_parse");
  });

  it("dxf_write_polygons action produces DXF identical to engine call", async () => {
    const poly = square("wire", 12);
    const fromDispatcher = await invoke("dxf_write_polygons", { polygons: [poly] });
    const fromEngine = dxfWriterEngine.writePolygonsToDxf([poly]);
    const disp = fromDispatcher.dxf !== undefined ? fromDispatcher : (fromDispatcher.result ?? fromDispatcher);
    expect(disp.polygon_count).toBe(1);
    expect(disp.dxf).toBe(fromEngine.dxf);
  });

  it("dxf_parse action recovers what dxf_write_polygons wrote (full round-trip via dispatcher)", async () => {
    const poly = square("rt-disp", 25, 5, 5);
    const w = await invoke("dxf_write_polygons", { polygons: [poly] });
    const written = w.dxf !== undefined ? w : (w.result ?? w);
    const p = await invoke("dxf_parse", { content: written.dxf });
    const parsed = p.polygons !== undefined ? p : (p.result ?? p);
    expect(parsed.polygon_count).toBe(1);
    expect(parsed.polygons[0].vertices.length).toBeGreaterThanOrEqual(4);
  });

  it("dxf_parse rejects empty content via schema validation", async () => {
    const res = await invoke("dxf_parse", { content: "" });
    // Validation error surface uses "error" field or dispatcher-side "Invalid params"
    const txt = JSON.stringify(res);
    expect(txt.toLowerCase()).toMatch(/invalid|required|empty|content/);
  });

  it("dxf_write_polygons rejects empty polygons via schema validation", async () => {
    const res = await invoke("dxf_write_polygons", { polygons: [] });
    const txt = JSON.stringify(res);
    expect(txt.toLowerCase()).toMatch(/invalid|empty|non-empty/);
  });
});
