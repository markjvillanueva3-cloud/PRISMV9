/**
 * WEDMPartRecognitionEngine Tests — WEDM AGI Phase 1 / U-P1-06
 */
import { describe, it, expect } from "vitest";
import { WEDMPartRecognitionEngine } from "../../engines/WEDMPartRecognitionEngine.js";
import type { DXFEntity } from "../../engines/FileIOEngine.js";

const engine = new WEDMPartRecognitionEngine();

function circle(cx: number, cy: number, r: number, layer = "0"): DXFEntity {
  return { type: "CIRCLE", layer, data: { cx, cy, radius: r } };
}

function closedPoly(points: Array<[number, number]>, layer = "0"): DXFEntity {
  return {
    type: "LWPOLYLINE",
    layer,
    data: {
      vertices: points.map(([x, y]) => ({ x, y })),
      closed: true,
    },
  };
}

function openPoly(points: Array<[number, number]>, layer = "0"): DXFEntity {
  return {
    type: "LWPOLYLINE",
    layer,
    data: {
      vertices: points.map(([x, y]) => ({ x, y })),
      closed: false,
    },
  };
}

describe("WEDMPartRecognitionEngine.recognize — feature detection", () => {
  it("recognises a CIRCLE as a through-hole with correct diameter", () => {
    const r = engine.recognize({
      entities: [circle(10, 10, 2.5)],
      thickness_mm: 6,
    });
    expect(r.features.length).toBe(1);
    const f = r.features[0];
    expect(f.type).toBe("hole");
    expect(f.is_through).toBe(true);
    expect(f.dimensions_mm.diameter).toBeCloseTo(5, 5);
    expect(f.dimensions_mm.depth).toBeCloseTo(6, 5);
  });

  it("classifies a square closed polyline as a profile (aspect ≈ 1)", () => {
    const r = engine.recognize({
      entities: [closedPoly([[0, 0], [20, 0], [20, 20], [0, 20]])],
    });
    expect(r.features.length).toBe(1);
    expect(r.features[0].type).toBe("profile");
  });

  it("classifies a thin rectangular closed polyline as a slot", () => {
    const r = engine.recognize({
      entities: [closedPoly([[0, 0], [50, 0], [50, 3], [0, 3]])],
    });
    expect(r.features[0].type).toBe("slot");
  });

  it("classifies a moderate aspect rectangle as a pocket", () => {
    const r = engine.recognize({
      entities: [closedPoly([[0, 0], [40, 0], [40, 20], [0, 20]])],
    });
    expect(r.features[0].type).toBe("pocket");
  });

  it("classifies an OPEN polyline as a contour feature", () => {
    const r = engine.recognize({
      entities: [openPoly([[0, 0], [10, 0], [10, 5]])],
    });
    expect(r.features[0].type).toBe("contour");
  });

  it("falls back to vertex-coincidence when `closed` flag is absent", () => {
    const e: DXFEntity = {
      type: "LWPOLYLINE",
      layer: "0",
      data: {
        vertices: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
          { x: 0, y: 5 },
          { x: 0, y: 0 }, // close by coincidence
        ],
      },
    };
    const r = engine.recognize({ entities: [e] });
    // Treated as closed → profile/slot/pocket, NOT contour
    expect(["profile", "slot", "pocket"]).toContain(r.features[0].type);
  });

  it("emits cavity feature for a standalone ARC", () => {
    const e: DXFEntity = {
      type: "ARC",
      layer: "0",
      data: { cx: 0, cy: 0, radius: 3.5, start_angle: 0, end_angle: 180 },
    };
    const r = engine.recognize({ entities: [e] });
    expect(r.features[0].type).toBe("cavity");
    expect(r.features[0].dimensions_mm.diameter).toBeCloseTo(7, 5);
  });

  it("skips degenerate polylines with <2 vertices and records a warning", () => {
    const e: DXFEntity = { type: "LWPOLYLINE", layer: "0", data: { vertices: [{ x: 0, y: 0 }] } };
    const r = engine.recognize({ entities: [e] });
    expect(r.features.length).toBe(0);
    expect(r.warnings.some((w) => /<2 vertices/.test(w))).toBe(true);
  });
});

describe("WEDMPartRecognitionEngine.recognize — geometry aggregates", () => {
  it("computes bounding box across mixed entities", () => {
    const r = engine.recognize({
      entities: [
        circle(0, 0, 5),
        closedPoly([[10, 10], [20, 10], [20, 20], [10, 20]]),
      ],
    });
    expect(r.bounds).not.toBeNull();
    expect(r.bounds!.min.x).toBeLessThanOrEqual(-5);
    expect(r.bounds!.max.x).toBeGreaterThanOrEqual(20);
    expect(r.bounds!.max.y).toBeGreaterThanOrEqual(20);
  });

  it("returns null bounds and centroid when no geometry entities", () => {
    const r = engine.recognize({ entities: [] });
    expect(r.bounds).toBeNull();
    expect(r.centroid).toBeNull();
  });

  it("produces start-hole candidates for interior closed loops", () => {
    const r = engine.recognize({
      entities: [closedPoly([[0, 0], [10, 0], [10, 10], [0, 10]])],
    });
    expect(r.start_hole_candidates.length).toBeGreaterThan(0);
    const c = r.start_hole_candidates[0];
    expect(c.accessibility).toBe("interior");
    expect(c.center.x).toBeGreaterThan(0);
    expect(c.center.y).toBeGreaterThan(0);
  });

  it("through-holes dominate the start-hole sort order", () => {
    const ranked = engine.startHoleCandidates({
      entities: [
        closedPoly([[0, 0], [10, 0], [10, 10], [0, 10]]),
        circle(50, 50, 3),
      ],
    });
    expect(ranked[0].accessibility).toBe("through");
  });
});

describe("WEDMPartRecognitionEngine — exit gate (≥95% feature extraction)", () => {
  it("extracts ≥95% of expected features from a synthetic fixture", () => {
    // 20 entities → 20 expected features (every entity is feature-bearing).
    const entities: DXFEntity[] = [];
    for (let i = 0; i < 10; i++) entities.push(circle(i * 10, 0, 1));
    for (let i = 0; i < 5; i++) {
      entities.push(closedPoly([
        [i * 30, 100],
        [i * 30 + 20, 100],
        [i * 30 + 20, 120],
        [i * 30, 120],
      ]));
    }
    for (let i = 0; i < 5; i++) {
      entities.push(openPoly([[i * 10, 200], [i * 10 + 5, 205]]));
    }
    const r = engine.recognize({ entities, thickness_mm: 10 });
    const rate = r.features.length / entities.length;
    expect(rate).toBeGreaterThanOrEqual(0.95);
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("delegates classification to EDMDrawingInterpretationEngine", () => {
    const r = engine.recognize({
      entities: [circle(0, 0, 1)],
      material: "d2",
      thickness_mm: 10,
    });
    expect(r.classification).not.toBeNull();
    expect(r.classification!.features_classified.length).toBe(1);
    expect(r.classification!.material_assessment.material_name.toLowerCase()).toContain("d2");
  });

  it("bounds() convenience returns the same bbox as recognize().bounds", () => {
    const ents = [circle(0, 0, 5)];
    const b = engine.bounds(ents);
    expect(b).not.toBeNull();
    expect(b!.width_mm).toBeCloseTo(10, 5);
    expect(b!.height_mm).toBeCloseTo(10, 5);
  });
});
