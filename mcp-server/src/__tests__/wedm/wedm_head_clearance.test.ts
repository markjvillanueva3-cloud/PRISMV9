/**
 * WEDMHeadClearanceEngine tests — WEDM AGI Phase 4 / P4-MS2 / U-P4-04.
 *
 * Covers:
 *  - Clear pose returns pass=true with positive minClearance
 *  - Upper guide collision with overhead clamp → critical + pass=false
 *  - Lower guide collision with table stop → critical + pass=false
 *  - Wire segment intersecting a fixture (vertical + taper) → critical
 *  - Part AABB does NOT flag wire-vs-fixture (wire is in part by design)
 *  - Part AABB DOES flag guide-vs-part if guide is inside part bbox
 *  - Tank-inner envelope → head_outside_tank on XY out of bounds
 *  - tableZ → head_below_table when Z_lower below table
 *  - Safety margin: clearance in [0, margin] → warning (pass=true)
 *  - Safety margin override (smaller margin) changes a warning to clean
 *  - checkPath returns one report per pose
 *  - firstCollision returns the first failing index
 */
import { describe, it, expect } from "vitest";
import {
  WEDMHeadClearanceEngine,
  wedmHeadClearanceEngine,
  DEFAULT_SAFETY_MARGIN_MM,
  type AABB,
  type MachinePose,
} from "../../engines/WEDMHeadClearanceEngine.js";

// ----------------------------------------------------------------------------
// Fixture factories
// ----------------------------------------------------------------------------

function fixture(id: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): AABB {
  return {
    id,
    role: "fixture",
    min: { x: x0, y: y0, z: z0 },
    max: { x: x1, y: y1, z: z1 },
  };
}

function part(id: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): AABB {
  return {
    id,
    role: "part",
    min: { x: x0, y: y0, z: z0 },
    max: { x: x1, y: y1, z: z1 },
  };
}

function clearPose(): MachinePose {
  // Vertical wire at origin, part assumed far away.
  return { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 };
}

// ----------------------------------------------------------------------------
// Clear pose baseline
// ----------------------------------------------------------------------------

describe("WEDMHeadClearanceEngine — clear pose", () => {
  it("empty obstacle list → pass=true, minClearance=Infinity", () => {
    const e = new WEDMHeadClearanceEngine();
    const r = e.check(clearPose(), []);
    expect(r.pass).toBe(true);
    expect(r.events).toHaveLength(0);
    expect(r.minClearance_mm).toBe(Number.POSITIVE_INFINITY);
  });

  it("distant fixture → pass=true, minClearance > margin", () => {
    const e = new WEDMHeadClearanceEngine();
    const ob = fixture("far-clamp", 500, 500, 0, 520, 520, 20);
    const r = e.check(clearPose(), [ob]);
    expect(r.pass).toBe(true);
    expect(r.minClearance_mm).toBeGreaterThan(DEFAULT_SAFETY_MARGIN_MM);
  });

  it("singleton export works identically", () => {
    const r = wedmHeadClearanceEngine.check(clearPose(), []);
    expect(r.pass).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Guide-vs-fixture collisions
// ----------------------------------------------------------------------------

describe("WEDMHeadClearanceEngine — guide-vs-fixture", () => {
  it("upper guide penetrates an overhead clamp → critical", () => {
    const e = new WEDMHeadClearanceEngine();
    // Upper guide at Z_upper=50, extends up 40 mm → box z 50..90.
    // Clamp at z 70..80 directly over the head.
    const clamp = fixture("over-clamp", -30, -30, 70, 30, 30, 80);
    const r = e.check(clearPose(), [clamp]);
    expect(r.pass).toBe(false);
    expect(
      r.events.some(
        (ev) =>
          ev.actor === "upper_guide" &&
          ev.kind === "guide_vs_fixture" &&
          ev.severity === "critical",
      ),
    ).toBe(true);
  });

  it("lower guide penetrates a table stop → critical", () => {
    const e = new WEDMHeadClearanceEngine();
    // Lower guide extends down from Z_lower=0 → box z -40..0.
    const stop = fixture("stop", -30, -30, -20, 30, 30, -10);
    const r = e.check(clearPose(), [stop]);
    expect(r.pass).toBe(false);
    expect(
      r.events.some(
        (ev) =>
          ev.actor === "lower_guide" &&
          ev.severity === "critical",
      ),
    ).toBe(true);
  });

  it("taper (U,V) pushes upper guide into a side wall → critical", () => {
    const e = new WEDMHeadClearanceEngine();
    const wall = fixture("side", 50, -30, 50, 70, 30, 90);
    const plumb = e.check(clearPose(), [wall]);
    expect(plumb.pass).toBe(true);
    // With U=+50, upper center moves to (+50, 0) — guide radius 20 → box x 30..70.
    const tapered: MachinePose = { X: 0, Y: 0, Z_upper: 50, Z_lower: 0, U: 50, V: 0 };
    const t = e.check(tapered, [wall]);
    expect(t.pass).toBe(false);
    expect(
      t.events.some((ev) => ev.actor === "upper_guide" && ev.severity === "critical"),
    ).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Wire-vs-fixture segment test
// ----------------------------------------------------------------------------

describe("WEDMHeadClearanceEngine — wire-vs-fixture", () => {
  it("vertical wire intersecting a clamp mid-Z → critical wire event", () => {
    const e = new WEDMHeadClearanceEngine();
    const clamp = fixture("mid-clamp", -5, -5, 20, 5, 5, 30);
    const r = e.check(clearPose(), [clamp]);
    expect(r.pass).toBe(false);
    expect(
      r.events.some(
        (ev) => ev.actor === "wire" && ev.severity === "critical",
      ),
    ).toBe(true);
  });

  it("tapered wire cutting across a fixture edge → critical", () => {
    const e = new WEDMHeadClearanceEngine();
    // Wire from (0,0,0) to (40,0,50) — midpoint around x=20.
    const obstruction = fixture("chip", 18, -2, 22, 22, 2, 28);
    const pose: MachinePose = { X: 0, Y: 0, Z_upper: 50, Z_lower: 0, U: 40 };
    const r = e.check(pose, [obstruction]);
    expect(r.pass).toBe(false);
    expect(
      r.events.some((ev) => ev.actor === "wire" && ev.severity === "critical"),
    ).toBe(true);
  });

  it("wire far from fixture → no wire event", () => {
    const e = new WEDMHeadClearanceEngine();
    const far = fixture("far", 100, 100, 0, 110, 110, 50);
    const r = e.check(clearPose(), [far]);
    expect(r.events.filter((ev) => ev.actor === "wire")).toHaveLength(0);
  });
});

// ----------------------------------------------------------------------------
// Part role — wire inside is fine, guides inside are not
// ----------------------------------------------------------------------------

describe("WEDMHeadClearanceEngine — role=part", () => {
  it("wire inside part does NOT raise a wire_vs_fixture event", () => {
    const e = new WEDMHeadClearanceEngine();
    // Part fully enclosing the wire.
    const p = part("workpiece", -20, -20, 10, 20, 20, 40);
    const r = e.check(clearPose(), [p]);
    const wireEvents = r.events.filter((ev) => ev.actor === "wire");
    expect(wireEvents).toHaveLength(0);
  });

  it("guide inside part raises guide_vs_part critical", () => {
    const e = new WEDMHeadClearanceEngine();
    // Part bounding box that swallows the upper guide body (z=50..90).
    const p = part("big-part", -100, -100, 45, 100, 100, 100);
    const r = e.check(clearPose(), [p]);
    expect(r.pass).toBe(false);
    expect(
      r.events.some(
        (ev) =>
          ev.actor === "upper_guide" &&
          ev.kind === "guide_vs_part" &&
          ev.severity === "critical",
      ),
    ).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Tank / table
// ----------------------------------------------------------------------------

describe("WEDMHeadClearanceEngine — tank / table envelopes", () => {
  it("head XY outside tankInner → head_outside_tank critical", () => {
    const e = new WEDMHeadClearanceEngine();
    const tank: AABB = {
      id: "tank",
      role: "tank_wall",
      min: { x: -100, y: -100, z: 0 },
      max: { x: 100, y: 100, z: 300 },
    };
    const pose: MachinePose = { X: 150, Y: 0, Z_upper: 50, Z_lower: 0 };
    const r = e.check(pose, [], { tankInner: tank });
    expect(r.pass).toBe(false);
    expect(
      r.events.some((ev) => ev.kind === "head_outside_tank"),
    ).toBe(true);
  });

  it("head inside tankInner → no tank event", () => {
    const e = new WEDMHeadClearanceEngine();
    const tank: AABB = {
      id: "tank",
      role: "tank_wall",
      min: { x: -100, y: -100, z: 0 },
      max: { x: 100, y: 100, z: 300 },
    };
    const r = e.check(clearPose(), [], { tankInner: tank });
    expect(r.events.filter((ev) => ev.kind === "head_outside_tank")).toHaveLength(0);
  });

  it("tableZ breach → head_below_table critical", () => {
    const e = new WEDMHeadClearanceEngine();
    const pose: MachinePose = { X: 0, Y: 0, Z_upper: 50, Z_lower: -5 };
    const r = e.check(pose, [], { tableZ: 0 });
    expect(r.pass).toBe(false);
    expect(
      r.events.some((ev) => ev.kind === "head_below_table"),
    ).toBe(true);
  });

  it("Z_lower >= tableZ → no table event", () => {
    const e = new WEDMHeadClearanceEngine();
    const r = e.check(clearPose(), [], { tableZ: 0 });
    expect(r.events.filter((ev) => ev.kind === "head_below_table")).toHaveLength(0);
  });
});

// ----------------------------------------------------------------------------
// Safety margin behaviour
// ----------------------------------------------------------------------------

describe("WEDMHeadClearanceEngine — safety margin", () => {
  it("clearance inside margin (but > 0) → warning, pass=true", () => {
    const e = new WEDMHeadClearanceEngine();
    // Upper guide box max.y = +20; clamp at y 21..22 → 1 mm clearance, below 2 mm margin.
    const clamp = fixture("near", -30, 21, 50, 30, 22, 90);
    const r = e.check(clearPose(), [clamp]);
    expect(r.pass).toBe(true);
    expect(r.events.some((ev) => ev.severity === "warning")).toBe(true);
    expect(r.events.every((ev) => ev.severity !== "critical")).toBe(true);
  });

  it("smaller margin removes a previous warning", () => {
    const e = new WEDMHeadClearanceEngine();
    const clamp = fixture("near", -30, 21, 50, 30, 22, 90);
    const r = e.check(clearPose(), [clamp], { safetyMargin_mm: 0.5 });
    expect(r.events).toHaveLength(0);
  });
});

// ----------------------------------------------------------------------------
// Path-level helpers
// ----------------------------------------------------------------------------

describe("WEDMHeadClearanceEngine — path helpers", () => {
  it("checkPath returns one report per pose", () => {
    const e = new WEDMHeadClearanceEngine();
    const poses: MachinePose[] = [
      { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
      { X: 10, Y: 0, Z_upper: 50, Z_lower: 0 },
      { X: 20, Y: 0, Z_upper: 50, Z_lower: 0 },
    ];
    const rs = e.checkPath(poses, []);
    expect(rs).toHaveLength(3);
    expect(rs.every((r) => r.pass)).toBe(true);
  });

  it("firstCollision returns the first failing index", () => {
    const e = new WEDMHeadClearanceEngine();
    // Thin mid-Z slab the guides clear; wire crosses it at X≥19.
    const slab = fixture("slab", 18, -5, 20, 22, 5, 40);
    const poses: MachinePose[] = [
      { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
      { X: 10, Y: 0, Z_upper: 50, Z_lower: 0 },
      { X: 20, Y: 0, Z_upper: 50, Z_lower: 0 }, // wire intersects slab
      { X: 25, Y: 0, Z_upper: 50, Z_lower: 0 },
    ];
    const hit = e.firstCollision(poses, [slab]);
    expect(hit).not.toBeNull();
    expect(hit!.index).toBe(2);
    expect(hit!.report.pass).toBe(false);
  });

  it("firstCollision returns null on a clean path", () => {
    const e = new WEDMHeadClearanceEngine();
    const poses: MachinePose[] = [{ X: 0, Y: 0, Z_upper: 50, Z_lower: 0 }];
    expect(e.firstCollision(poses, [])).toBeNull();
  });
});
