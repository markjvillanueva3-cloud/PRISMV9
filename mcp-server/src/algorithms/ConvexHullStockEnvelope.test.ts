import { describe, it, expect } from "vitest";
import { computeEnvelope, ConvexHullStockEnvelope, type XYZ } from "./ConvexHullStockEnvelope.js";

const cube = (size: number): XYZ[] => {
  const arr: XYZ[] = [];
  for (const x of [0, size]) for (const y of [0, size]) for (const z of [0, size]) arr.push({ x, y, z });
  return arr;
};

describe("ConvexHullStockEnvelope", () => {
  it("10mm cube → block 16×16×16 with 3mm default allowance", () => {
    const r = computeEnvelope({ points: cube(10) });
    expect(r.block.x_mm.value).toBe(16);
    expect(r.block.y_mm.value).toBe(16);
    expect(r.block.z_mm.value).toBe(16);
  });
  it("custom allowance respected", () => {
    const r = computeEnvelope({ points: cube(10), allowance_per_side_mm: 5 });
    expect(r.block.x_mm.value).toBe(20);
  });
  it("zero allowance → block matches part dimensions exactly", () => {
    const r = computeEnvelope({ points: cube(10), allowance_per_side_mm: 0 });
    expect(r.block.x_mm.value).toBe(10);
  });
  it("bar-round: 10mm cube origin-corner → diameter = 2·√200 + 6 (max radial from origin)", () => {
    // Cube vertices at (0,0,0)..(10,10,10); max radial from spindle-axis(0,0) = √(10² + 10²) = √200.
    // diameter = 2·max_radial + 2·allowance = 2·√200 + 6 ≈ 34.28 mm.
    const r = computeEnvelope({ points: cube(10) });
    expect(r.bar_round.diameter_mm.value).toBeCloseTo(2 * Math.sqrt(200) + 6, 2);
  });
  it("plate: thinnest axis becomes thickness (10×20×30 part → thickness 16)", () => {
    const points: XYZ[] = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }];
    const r = computeEnvelope({ points });
    expect(r.plate.thickness_mm.value).toBe(16);  // thinnest extent (10) + 6 allowance
    expect(r.plate.y_mm.value).toBe(26);          // medium extent (20) + 6
    expect(r.plate.x_mm.value).toBe(36);          // largest extent (30) + 6
  });
  it("bounding box min/max set correctly from point set", () => {
    const r = computeEnvelope({ points: [{ x: -5, y: -3, z: 0 }, { x: 10, y: 15, z: 20 }] });
    expect(r.bounding_box_min).toEqual({ x: -5, y: -3, z: 0 });
    expect(r.bounding_box_max).toEqual({ x: 10, y: 15, z: 20 });
  });
  it("point_count reflects input array length", () => {
    expect(computeEnvelope({ points: cube(10) }).point_count).toBe(8);
  });
  it("degenerate (zero-extent axis) emits warning note", () => {
    const flat: XYZ[] = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }];
    expect(computeEnvelope({ points: flat }).notes.join("|")).toContain("degenerate");
  });
  it("empty points diagnostic", () => {
    expect(computeEnvelope({ points: [] }).notes.join("|")).toContain("empty");
  });
  it("non-finite point diagnostic", () => {
    expect(computeEnvelope({ points: [{ x: NaN, y: 0, z: 0 }] }).notes.join("|")).toContain("non-finite");
  });
  it("oversized point coord diagnostic", () => {
    expect(computeEnvelope({ points: [{ x: 50000, y: 0, z: 0 }] }).notes.join("|")).toContain("exceeds");
  });
  it("oversize points array diagnostic", () => {
    const big: XYZ[] = Array(200_000).fill({ x: 0, y: 0, z: 0 });
    expect(computeEnvelope({ points: big }).notes.join("|")).toContain("exceeds");
  });
  it("missing input diagnostic", () => {
    expect(computeEnvelope(null as unknown as { points: XYZ[] }).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(ConvexHullStockEnvelope.version).toBe("1.0.0");
  });
});
