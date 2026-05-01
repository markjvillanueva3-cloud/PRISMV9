/**
 * wedmGeometry.test.ts — Wire EDM 2D Geometry Utility Tests
 * WEDM-MS0 U-WEDM06
 */

import { describe, it, expect } from "vitest";
import {
  tessellateArc,
  contourToCanvasPath,
  featureToColor,
  offsetContour,
  calculateBounds,
  snapToGrid,
  tessellateContour,
  dist,
  polylineLength,
} from "../utils/wedmGeometry";
import type { ProfileContour, Point2D } from "../types/wedmStudio";

// ============================================================================
// HELPERS
// ============================================================================

function approxEqual(a: number, b: number, tol = 0.001): void {
  expect(Math.abs(a - b)).toBeLessThan(tol);
}

function pointNear(a: Point2D, b: Point2D, tol = 0.01): void {
  expect(dist(a, b)).toBeLessThan(tol);
}

/** Build a simple square contour (4 line segments, 10mm x 10mm at origin). */
function makeSquareContour(size = 10): ProfileContour {
  return {
    id: "square",
    segments: [
      { type: "line", start: { x: 0, y: 0 }, end: { x: size, y: 0 } },
      { type: "line", start: { x: size, y: 0 }, end: { x: size, y: size } },
      { type: "line", start: { x: size, y: size }, end: { x: 0, y: size } },
      { type: "line", start: { x: 0, y: size }, end: { x: 0, y: 0 } },
    ],
    is_closed: true,
    is_exterior: true,
    area_mm2: size * size,
    perimeter_mm: 4 * size,
    bbox: { min_x: 0, min_y: 0, max_x: size, max_y: size },
  };
}

/** Build a full-circle arc contour (radius 5mm at origin). */
function makeCircleContour(r = 5): ProfileContour {
  return {
    id: "circle",
    segments: [
      {
        type: "arc",
        start: { x: r, y: 0 },
        end: { x: r, y: 0 },
        center: { x: 0, y: 0 },
        radius: r,
        start_angle_rad: 0,
        end_angle_rad: 2 * Math.PI,
        ccw: true,
      },
    ],
    is_closed: true,
    is_exterior: true,
    area_mm2: Math.PI * r * r,
    perimeter_mm: 2 * Math.PI * r,
    bbox: { min_x: -r, min_y: -r, max_x: r, max_y: r },
  };
}

// ============================================================================
// tessellateArc
// ============================================================================

describe("tessellateArc", () => {
  it("tessellates a 90-degree CCW arc", () => {
    const pts = tessellateArc(
      { x: 0, y: 0 }, 10,
      0, Math.PI / 2,
      true, 0.01,
    );

    // First point should be at (10, 0), last near (0, 10)
    pointNear(pts[0], { x: 10, y: 0 });
    pointNear(pts[pts.length - 1], { x: 0, y: 10 });

    // All points should be on the circle (distance from center = radius)
    for (const p of pts) {
      approxEqual(dist(p, { x: 0, y: 0 }), 10, 0.02);
    }

    // Should have enough segments for 0.01mm tolerance on R10
    expect(pts.length).toBeGreaterThan(10);
  });

  it("tessellates a 90-degree CW arc", () => {
    const pts = tessellateArc(
      { x: 0, y: 0 }, 10,
      Math.PI / 2, 0,
      false, 0.01,
    );

    pointNear(pts[0], { x: 0, y: 10 });
    pointNear(pts[pts.length - 1], { x: 10, y: 0 });
  });

  it("tessellates a full circle (2π sweep)", () => {
    const pts = tessellateArc(
      { x: 0, y: 0 }, 5,
      0, 2 * Math.PI,
      true, 0.01,
    );

    // Start and end should be at same position
    pointNear(pts[0], pts[pts.length - 1], 0.05);

    // All points on circle
    for (const p of pts) {
      approxEqual(dist(p, { x: 0, y: 0 }), 5, 0.02);
    }
  });

  it("returns center point for zero radius", () => {
    const pts = tessellateArc({ x: 5, y: 5 }, 0, 0, Math.PI, true);
    expect(pts).toEqual([{ x: 5, y: 5 }]);
  });

  it("coarser tolerance produces fewer segments", () => {
    const fine = tessellateArc({ x: 0, y: 0 }, 10, 0, Math.PI, true, 0.001);
    const coarse = tessellateArc({ x: 0, y: 0 }, 10, 0, Math.PI, true, 0.5);
    expect(fine.length).toBeGreaterThan(coarse.length);
  });

  it("returns single point for degenerate arc (start == end)", () => {
    const pts = tessellateArc({ x: 5, y: 5 }, 10, Math.PI, Math.PI, true);
    expect(pts.length).toBe(1);
    pointNear(pts[0], { x: -5, y: 5 }, 0.01);
  });

  it("returns center point for negative radius", () => {
    const pts = tessellateArc({ x: 3, y: 4 }, -5, 0, Math.PI, true);
    expect(pts).toEqual([{ x: 3, y: 4 }]);
  });

  it("handles wrap-around CCW (start > end)", () => {
    // 270° arc from 3π/2 to π (going CCW wraps around 0)
    const pts = tessellateArc(
      { x: 0, y: 0 }, 5,
      (3 * Math.PI) / 2, Math.PI / 2,
      true, 0.05,
    );

    pointNear(pts[0], { x: 0, y: -5 }, 0.1);
    expect(pts.length).toBeGreaterThan(3);
  });
});

// ============================================================================
// contourToCanvasPath (basic smoke test — Path2D unavailable in Node)
// ============================================================================

describe("contourToCanvasPath", () => {
  // Path2D may not be available in the Node test environment.
  // We verify the function doesn't throw and returns an object.
  it("returns a Path2D for a line-only contour", () => {
    // Skip if Path2D is not available (jsdom/node)
    if (typeof Path2D === "undefined") {
      return;
    }
    const contour = makeSquareContour();
    const path = contourToCanvasPath(contour);
    expect(path).toBeInstanceOf(Path2D);
  });

  it("handles empty contour without throwing", () => {
    if (typeof Path2D === "undefined") {
      return;
    }
    const empty: ProfileContour = {
      id: "empty",
      segments: [],
      is_closed: false,
      is_exterior: false,
      area_mm2: 0,
      perimeter_mm: 0,
      bbox: { min_x: 0, min_y: 0, max_x: 0, max_y: 0 },
    };
    expect(() => contourToCanvasPath(empty)).not.toThrow();
  });
});

// ============================================================================
// featureToColor
// ============================================================================

describe("featureToColor", () => {
  it("returns blue for profile", () => {
    expect(featureToColor("profile")).toBe("#2196F3");
  });

  it("returns orange for hole", () => {
    expect(featureToColor("hole")).toBe("#FF9800");
  });

  it("returns purple for slot", () => {
    expect(featureToColor("slot")).toBe("#9C27B0");
  });

  it("returns red for error overlay", () => {
    expect(featureToColor("error")).toBe("#F44336");
  });

  it("returns default gray for unknown type", () => {
    expect(featureToColor("unknown_type")).toBe("#9E9E9E");
  });

  it("maps all 20 overlay types", () => {
    const knownTypes = [
      "profile", "hole", "slot", "cavity", "contour", "pocket",
      "toolpath", "approach", "start_hole", "tab", "wcs", "grid",
      "offset_rough", "offset_semi", "offset_finish", "offset_super",
      "error", "warning", "selection", "dimension",
    ];
    for (const t of knownTypes) {
      expect(featureToColor(t)).not.toBe("#9E9E9E");
    }
  });
});

// ============================================================================
// calculateBounds
// ============================================================================

describe("calculateBounds", () => {
  it("returns zero bounds for empty array", () => {
    const b = calculateBounds([]);
    expect(b).toEqual({ min_x: 0, min_y: 0, max_x: 0, max_y: 0 });
  });

  it("computes bounds for a square contour", () => {
    const b = calculateBounds([makeSquareContour(10)]);
    approxEqual(b.min_x, 0);
    approxEqual(b.min_y, 0);
    approxEqual(b.max_x, 10);
    approxEqual(b.max_y, 10);
  });

  it("computes bounds for a circle (includes arc extrema)", () => {
    const b = calculateBounds([makeCircleContour(5)]);
    approxEqual(b.min_x, -5);
    approxEqual(b.min_y, -5);
    approxEqual(b.max_x, 5);
    approxEqual(b.max_y, 5);
  });

  it("encloses multiple contours", () => {
    const shifted: ProfileContour = {
      ...makeSquareContour(5),
      id: "shifted",
      segments: [
        { type: "line", start: { x: 20, y: 20 }, end: { x: 25, y: 20 } },
        { type: "line", start: { x: 25, y: 20 }, end: { x: 25, y: 25 } },
        { type: "line", start: { x: 25, y: 25 }, end: { x: 20, y: 25 } },
        { type: "line", start: { x: 20, y: 25 }, end: { x: 20, y: 20 } },
      ],
    };
    const b = calculateBounds([makeSquareContour(10), shifted]);
    approxEqual(b.min_x, 0);
    approxEqual(b.min_y, 0);
    approxEqual(b.max_x, 25);
    approxEqual(b.max_y, 25);
  });

  it("handles 90-degree arc that crosses axis-aligned extremum", () => {
    // Arc from 45° to 135° (crosses 90° = top extremum)
    const contour: ProfileContour = {
      id: "arc90",
      segments: [{
        type: "arc",
        start: { x: 7.071, y: 7.071 },
        end: { x: -7.071, y: 7.071 },
        center: { x: 0, y: 0 },
        radius: 10,
        start_angle_rad: Math.PI / 4,
        end_angle_rad: (3 * Math.PI) / 4,
        ccw: true,
      }],
      is_closed: false,
      is_exterior: true,
      area_mm2: 0,
      perimeter_mm: 0,
      bbox: { min_x: -10, min_y: -10, max_x: 10, max_y: 10 },
    };
    const b = calculateBounds([contour]);
    // Should include the top of the arc (y=10)
    approxEqual(b.max_y, 10, 0.01);
  });
});

// ============================================================================
// offsetContour
// ============================================================================

describe("offsetContour", () => {
  it("returns copy for zero offset", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    const result = offsetContour(pts, 0);
    expect(result).toEqual(pts);
  });

  it("returns copy for degenerate input (< 3 points)", () => {
    const pts: Point2D[] = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
    const result = offsetContour(pts, 1);
    expect(result).toEqual(pts);
  });

  it("expands a CCW square outward with positive offset", () => {
    // CCW square: (0,0) → (10,0) → (10,10) → (0,10)
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    const result = offsetContour(pts, 1);
    expect(result.length).toBe(4);

    // Expanded square should be bigger: corners further from center
    const center = { x: 5, y: 5 };
    for (const p of result) {
      const d = dist(p, center);
      expect(d).toBeGreaterThan(dist(pts[0], center));
    }
  });

  it("shrinks a CCW square inward with negative offset", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    const result = offsetContour(pts, -1);
    expect(result.length).toBe(4);

    const center = { x: 5, y: 5 };
    for (const p of result) {
      const d = dist(p, center);
      expect(d).toBeLessThan(dist(pts[0], center));
    }
  });
});

// ============================================================================
// snapToGrid
// ============================================================================

describe("snapToGrid", () => {
  it("snaps to nearest 1mm grid", () => {
    const p = snapToGrid({ x: 3.7, y: 8.2 }, 1);
    expect(p).toEqual({ x: 4, y: 8 });
  });

  it("snaps to 0.5mm grid", () => {
    const p = snapToGrid({ x: 3.3, y: 8.8 }, 0.5);
    expect(p).toEqual({ x: 3.5, y: 9 });
  });

  it("returns copy for zero or negative grid size", () => {
    const orig = { x: 3.7, y: 8.2 };
    expect(snapToGrid(orig, 0)).toEqual(orig);
    expect(snapToGrid(orig, -1)).toEqual(orig);
  });

  it("no-ops on exact grid points", () => {
    expect(snapToGrid({ x: 5, y: 10 }, 5)).toEqual({ x: 5, y: 10 });
  });
});

// ============================================================================
// tessellateContour
// ============================================================================

describe("tessellateContour", () => {
  it("tessellates a line-only contour to vertices", () => {
    const pts = tessellateContour(makeSquareContour(10));
    // 4 segments → 5 points (first seg start + 4 endpoints)
    expect(pts.length).toBe(5);
    pointNear(pts[0], { x: 0, y: 0 });
    pointNear(pts[4], { x: 0, y: 0 }); // closed back to start
  });

  it("tessellates a circle to many points", () => {
    const pts = tessellateContour(makeCircleContour(5), 0.01);
    expect(pts.length).toBeGreaterThan(50);

    // All points on circle
    for (const p of pts) {
      approxEqual(dist(p, { x: 0, y: 0 }), 5, 0.02);
    }
  });

  it("mixed line + arc contour produces continuous polyline", () => {
    const contour: ProfileContour = {
      id: "mixed",
      segments: [
        { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
        {
          type: "arc",
          start: { x: 10, y: 0 },
          end: { x: 10, y: 10 },
          center: { x: 10, y: 5 },
          radius: 5,
          start_angle_rad: -Math.PI / 2,
          end_angle_rad: Math.PI / 2,
          ccw: true,
        },
        { type: "line", start: { x: 10, y: 10 }, end: { x: 0, y: 10 } },
      ],
      is_closed: false,
      is_exterior: true,
      area_mm2: 0,
      perimeter_mm: 0,
      bbox: { min_x: 0, min_y: 0, max_x: 15, max_y: 10 },
    };

    const pts = tessellateContour(contour, 0.05);
    expect(pts.length).toBeGreaterThan(5);

    // Verify start and end points
    pointNear(pts[0], { x: 0, y: 0 });
    pointNear(pts[pts.length - 1], { x: 0, y: 10 });

    // Total polyline length should match: 10 + π*5 + 10 ≈ 35.7mm
    const len = polylineLength(pts);
    expect(len).toBeGreaterThan(33);
    expect(len).toBeLessThan(38);
  });

  it("tessellates an empty contour to empty array", () => {
    const empty: ProfileContour = {
      id: "empty", segments: [], is_closed: false, is_exterior: false,
      area_mm2: 0, perimeter_mm: 0, bbox: { min_x: 0, min_y: 0, max_x: 0, max_y: 0 },
    };
    expect(tessellateContour(empty)).toEqual([]);
  });

  it("tessellates a single line segment", () => {
    const contour: ProfileContour = {
      id: "single-line",
      segments: [{ type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }],
      is_closed: false, is_exterior: true, area_mm2: 0, perimeter_mm: 10,
      bbox: { min_x: 0, min_y: 0, max_x: 10, max_y: 0 },
    };
    const pts = tessellateContour(contour);
    expect(pts.length).toBe(2);
    pointNear(pts[0], { x: 0, y: 0 });
    pointNear(pts[1], { x: 10, y: 0 });
  });
});

// ============================================================================
// dist + polylineLength
// ============================================================================

describe("dist", () => {
  it("returns 0 for same point", () => {
    expect(dist({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it("returns correct distance", () => {
    approxEqual(dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  });
});

describe("polylineLength", () => {
  it("returns 0 for empty or single-point", () => {
    expect(polylineLength([])).toBe(0);
    expect(polylineLength([{ x: 0, y: 0 }])).toBe(0);
  });

  it("returns correct length for a straight line", () => {
    approxEqual(
      polylineLength([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
      10,
    );
  });

  it("returns perimeter for a 10mm square", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 },
      { x: 0, y: 10 }, { x: 0, y: 0 },
    ];
    approxEqual(polylineLength(pts), 40);
  });
});
