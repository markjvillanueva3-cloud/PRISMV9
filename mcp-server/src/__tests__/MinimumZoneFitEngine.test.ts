/**
 * Tests for MinimumZoneFitEngine (invention A2).
 *
 * Minimum-zone (Chebyshev / L-infinity) GD&T form-error fits. Every expected
 * number below is hand-computed from the minimum-zone definition, not a stub:
 *   straightness — minimise the residual range over the line slope
 *   flatness    — minimise the residual range over the plane gradient
 *   circularity — minimise (rMax - rMin) over the annulus centre
 */
import { describe, it, expect } from "vitest";
import { MinimumZoneFitEngine, minimumZoneFitEngine } from "../engines/MinimumZoneFitEngine.js";
import { ACTION_CALC_SCHEMAS } from "../schemas/calcActionSchemas.js";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

const engine = new MinimumZoneFitEngine();

describe("MinimumZoneFitEngine — straightness (exact minimax line)", () => {
  it("collinear points → zero zone, recovers the exact line", () => {
    // y = 2x + 1 exactly through every point.
    const r = engine.straightness([
      { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 },
    ]);
    expect(r.zone).toBeCloseTo(0, 6);
    expect(r.fit.slope).toBeCloseTo(2, 5);
    expect(r.fit.intercept).toBeCloseTo(1, 5);
    expect(r.converged).toBe(true);
  });

  it("symmetric tent (0,0),(1,1),(2,0) → zone 1.0, flat centre line y=0.5", () => {
    // g(b)=range{0,1-b,-2b}; min at b=0 with range 1; centre line y=(0+1)/2.
    const r = engine.straightness([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }]);
    expect(r.zone).toBeCloseTo(1.0, 5);
    expect(r.fit.slope).toBeCloseTo(0, 5);
    expect(r.fit.intercept).toBeCloseTo(0.5, 5);
  });

  it("outlier profile → minimum zone 3.0 at slope 1.0 (hand-computed)", () => {
    // (0,0)(1,0)(2,0)(3,0)(4,4): g(b) bottoms at b=1, w={0,-1,-2,-3,0}, range 3.
    const r = engine.straightness([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 4 },
    ]);
    expect(r.zone).toBeCloseTo(3.0, 4);
    expect(r.fit.slope).toBeCloseTo(1.0, 4);
    expect(r.fit.intercept).toBeCloseTo(-1.5, 4);
  });

  it("the same profile: LSQ over-reports — zone 3.0 vs LSQ 3.2", () => {
    // LSQ line slope 0.8 → residual span [-2.4, 0.8] = 3.2; min-zone = 3.0.
    const r = engine.straightness([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 4 },
    ]);
    expect(r.leastSquares.zone).toBeCloseTo(3.2, 4);
    expect(r.improvementOverLSQ).toBeCloseTo(0.2, 4);
    expect(r.improvementPct).toBeCloseTo((0.2 / 3.2) * 100, 3);
  });

  it("minimum zone is never worse than the least-squares zone", () => {
    const r = engine.straightness([
      { x: 0, y: 0.2 }, { x: 1, y: -0.1 }, { x: 2, y: 0.5 },
      { x: 3, y: -0.3 }, { x: 4, y: 0.9 }, { x: 5, y: 0.0 },
    ]);
    expect(r.zone).toBeLessThanOrEqual(r.leastSquares.zone + 1e-9);
    expect(r.converged).toBe(true);
  });
});

describe("MinimumZoneFitEngine — flatness (minimax plane)", () => {
  it("co-planar points → zero zone, recovers z = 1 + 2x + 3y", () => {
    const r = engine.flatness([
      { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 3 }, { x: 0, y: 1, z: 4 },
      { x: 1, y: 1, z: 6 }, { x: 2, y: 0, z: 5 },
    ]);
    expect(r.zone).toBeCloseTo(0, 4);
    expect(r.fit.b).toBeCloseTo(2, 3);
    expect(r.fit.c).toBeCloseTo(3, 3);
    expect(r.fit.a).toBeCloseTo(1, 3);
  });

  it("flat square corners + raised centre → flatness zone 1.0", () => {
    // 4 corners at z=0, centre at z=1: any tilt only widens the band.
    const r = engine.flatness([
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 }, { x: 0.5, y: 0.5, z: 1 },
    ]);
    expect(r.zone).toBeCloseTo(1.0, 4);
    expect(r.fit.b).toBeCloseTo(0, 3);
    expect(r.fit.c).toBeCloseTo(0, 3);
    expect(r.fit.a).toBeCloseTo(0.5, 3);
  });

  it("minimum-zone flatness never exceeds the least-squares flatness", () => {
    const r = engine.flatness([
      { x: 0, y: 0, z: 0.1 }, { x: 1, y: 0, z: -0.2 }, { x: 0, y: 1, z: 0.3 },
      { x: 1, y: 1, z: 0.0 }, { x: 2, y: 1, z: -0.4 }, { x: 1, y: 2, z: 0.5 },
    ]);
    expect(r.zone).toBeLessThanOrEqual(r.leastSquares.zone + 1e-9);
    expect(r.improvementOverLSQ).toBeGreaterThanOrEqual(0);
  });
});

describe("MinimumZoneFitEngine — circularity (minimum-zone annulus)", () => {
  it("perfect circle → zero zone, centre at the origin", () => {
    const r = engine.circularity([
      { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 },
    ]);
    expect(r.zone).toBeCloseTo(0, 5);
    expect(r.fit.centerX).toBeCloseTo(0, 4);
    expect(r.fit.centerY).toBeCloseTo(0, 4);
    expect(r.fit.meanRadius).toBeCloseTo(1, 4);
  });

  it("two concentric radii (9 and 11) → annulus zone exactly 2.0", () => {
    const r = engine.circularity([
      { x: 9, y: 0 }, { x: 0, y: 11 }, { x: -9, y: 0 }, { x: 0, y: -11 },
    ]);
    expect(r.zone).toBeCloseTo(2.0, 4);
    expect(r.fit.centerX).toBeCloseTo(0, 3);
    expect(r.fit.centerY).toBeCloseTo(0, 3);
    expect(r.fit.rMin).toBeCloseTo(9, 3);
    expect(r.fit.rMax).toBeCloseTo(11, 3);
  });

  it("minimum-zone circularity never exceeds the least-squares annulus", () => {
    const r = engine.circularity([
      { x: 10.0, y: 0.0 }, { x: 0.0, y: 9.7 }, { x: -10.2, y: 0.0 },
      { x: 0.0, y: -9.9 }, { x: 7.1, y: 7.0 }, { x: -7.0, y: -7.2 },
    ]);
    expect(r.zone).toBeLessThanOrEqual(r.leastSquares.zone + 1e-9);
    expect(r.improvementOverLSQ).toBeGreaterThanOrEqual(0);
  });
});

describe("MinimumZoneFitEngine — failure modes", () => {
  it("straightness with fewer than 3 points → throws", () => {
    expect(() => engine.straightness([{ x: 0, y: 0 }, { x: 1, y: 1 }]))
      .toThrow(/at least 3 points/);
  });

  it("flatness with fewer than 4 points → throws", () => {
    expect(() => engine.flatness([
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
    ])).toThrow(/at least 4 points/);
  });

  it("circularity with fewer than 3 points → throws", () => {
    expect(() => engine.circularity([{ x: 0, y: 0 }, { x: 1, y: 1 }]))
      .toThrow(/at least 3 points/);
  });

  it("straightness with all x equal → throws (no reference line)", () => {
    expect(() => engine.straightness([
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 5 },
    ])).toThrow(/zero range in x/);
  });

  it("circularity with collinear points → throws (no circle)", () => {
    expect(() => engine.circularity([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ])).toThrow(/collinear/);
  });

  it("flatness with points collinear in XY → throws (no reference plane)", () => {
    expect(() => engine.flatness([
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }, { x: 2, y: 0, z: 2 }, { x: 3, y: 0, z: 5 },
    ])).toThrow(/collinear/);
  });
});

describe("MinimumZoneFitEngine — adversarial inputs", () => {
  it("null input → throws", () => {
    expect(() => engine.straightness(null)).toThrow(/points array required/);
  });

  it("non-array input → throws", () => {
    expect(() => engine.circularity("not-an-array" as unknown)).toThrow(/must be an array/);
  });

  it("NaN coordinate → throws", () => {
    expect(() => engine.straightness([
      { x: 0, y: 0 }, { x: 1, y: NaN }, { x: 2, y: 2 },
    ])).toThrow(/finite number/);
  });

  it("Infinity coordinate → throws", () => {
    expect(() => engine.flatness([
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: Infinity },
      { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 },
    ])).toThrow(/finite number/);
  });

  it("point missing a coordinate field → throws", () => {
    expect(() => engine.circularity([
      { x: 0, y: 0 }, { x: 1 } as unknown as { x: number; y: number }, { x: 2, y: 2 },
    ])).toThrow(/finite number/);
  });
});

describe("MinimumZoneFitEngine — singleton", () => {
  it("singleton export matches a fresh instance", () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }];
    expect(minimumZoneFitEngine.straightness(pts).zone)
      .toBeCloseTo(engine.straightness(pts).zone, 9);
  });
});

describe("MinimumZoneFitEngine — prism_calc wiring", () => {
  it("ACTION_CALC_SCHEMAS exposes a usable minimum_zone_fit schema", () => {
    const schema = ACTION_CALC_SCHEMAS.minimum_zone_fit;
    expect(typeof schema?.safeParse).toBe("function");
    const ok = schema!.safeParse({
      feature: "straightness",
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }],
    });
    expect(ok.success).toBe(true);
  });

  it("the schema rejects a non-array points field", () => {
    const bad = ACTION_CALC_SCHEMAS.minimum_zone_fit!.safeParse({
      feature: "straightness",
      points: "not-an-array",
    });
    expect(bad.success).toBe(false);
  });

  it("the schema rejects an unknown feature", () => {
    const bad = ACTION_CALC_SCHEMAS.minimum_zone_fit!.safeParse({
      feature: "roundness-typo",
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }],
    });
    expect(bad.success).toBe(false);
  });
});

describe("MinimumZoneFitEngine — round-trip through prism_calc dispatcher", () => {
  /** Capture the handler registerCalcDispatcher registers via server.tool(). */
  function getCalcHandler(): (a: { action: string; params?: Record<string, unknown> }) => Promise<any> {
    let handler: any;
    const mockServer = { tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } };
    registerCalcDispatcher(mockServer);
    if (!handler) throw new Error("calc dispatcher did not register a handler");
    return handler;
  }

  /** Pull the JSON payload out of an MCP text response. */
  function payloadOf(res: any): any {
    const text = res?.content?.[0]?.text ?? JSON.stringify(res);
    return JSON.parse(text);
  }

  it("minimum_zone_fit straightness round-trips through prism_calc", async () => {
    const handler = getCalcHandler();
    const res = await handler({
      action: "minimum_zone_fit",
      params: {
        feature: "straightness",
        points: [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 4 },
        ],
      },
    });
    const data = payloadOf(res);
    expect(data.feature).toBe("straightness");
    expect(data.zone).toBeCloseTo(3.0, 4); // matches the engine-direct hand-computed oracle
  });

  it("minimum_zone_fit circularity round-trips through prism_calc", async () => {
    const handler = getCalcHandler();
    const res = await handler({
      action: "minimum_zone_fit",
      params: {
        feature: "circularity",
        points: [{ x: 9, y: 0 }, { x: 0, y: 11 }, { x: -9, y: 0 }, { x: 0, y: -11 }],
      },
    });
    const data = payloadOf(res);
    expect(data.feature).toBe("circularity");
    expect(data.zone).toBeCloseTo(2.0, 4);
  });

  it("an unknown feature is reported as an error, not a silent pass", async () => {
    const handler = getCalcHandler();
    const res = await handler({
      action: "minimum_zone_fit",
      params: { feature: "bogus", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }] },
    });
    const text = res?.content?.[0]?.text ?? JSON.stringify(res);
    expect(text).toMatch(/Invalid params|unknown feature|error/i);
  });

  it("anti-regression: the pre-existing geometry_convex_hull action still works", async () => {
    const handler = getCalcHandler();
    const res = await handler({
      action: "geometry_convex_hull",
      params: {
        points: [
          { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 1 },
        ],
      },
    });
    const text = res?.content?.[0]?.text ?? JSON.stringify(res);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/Unknown action/i);
  });
});
