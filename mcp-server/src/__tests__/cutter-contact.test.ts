/**
 * CutterContactEngine Tests — CAMK-MS0/U03
 * Tests CC point computation on analytical surfaces with multiple cutter types
 */
import { describe, it, expect } from "vitest";
import { cutterContactEngine } from "../engines/CutterContactEngine.js";

describe("CutterContactEngine", () => {
  // ---- Plane + Ball cutter ----
  it("computes CC on plane with ball cutter", () => {
    const pt = cutterContactEngine.computeCC({
      surface: {
        type: "plane",
        origin: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
      },
      cutter: { type: "ball", diameter_mm: 10 },
      u: 0.5,
      v: 0.5,
      stepover_mm: 2,
    });
    expect(pt.normal.z).toBeCloseTo(1, 3);
    expect(pt.gouge_free).toBe(true);
    expect(pt.effective_radius_mm).toBe(5); // R = D/2
    expect(pt.scallop_height_mm).toBeGreaterThan(0);
  });

  // ---- Scallop height formula verification ----
  it("computes correct scallop height for ball cutter", () => {
    const R = 5; // ball radius
    const ae = 2; // stepover
    // h = R - sqrt(R² - (ae/2)²) = 5 - sqrt(25 - 1) = 5 - 4.899 ≈ 0.1010
    const h = cutterContactEngine.computeScallopHeight(R, ae);
    const expected = R - Math.sqrt(R ** 2 - (ae / 2) ** 2);
    expect(h).toBeCloseTo(expected, 6);
  });

  // ---- Cylinder surface ----
  it("computes CC on cylinder surface", () => {
    const pt = cutterContactEngine.computeCC({
      surface: {
        type: "cylinder",
        origin: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        radius_mm: 25,
      },
      cutter: { type: "ball", diameter_mm: 10 },
      u: 0.25, // 90 degrees around
      v: 0.5,
      stepover_mm: 1,
    });
    expect(pt.cc).toBeDefined();
    expect(pt.normal).toBeDefined();
    // Normal should point radially outward
    const normalLen = Math.sqrt(pt.normal.x ** 2 + pt.normal.y ** 2 + pt.normal.z ** 2);
    expect(normalLen).toBeCloseTo(1, 3);
  });

  // ---- Sphere surface ----
  it("computes CC on sphere surface", () => {
    const pt = cutterContactEngine.computeCC({
      surface: {
        type: "sphere",
        origin: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        radius_mm: 30,
      },
      cutter: { type: "ball", diameter_mm: 8 },
      u: 0.5, // equator
      v: 0.25,
      stepover_mm: 1.5,
    });
    // CC point should be on sphere surface (distance from origin ≈ 30)
    const dist = Math.sqrt(pt.cc.x ** 2 + pt.cc.y ** 2 + pt.cc.z ** 2);
    expect(dist).toBeCloseTo(30, 0);
    expect(pt.gouge_free).toBe(true);
  });

  // ---- Cone surface ----
  it("computes CC on cone surface", () => {
    const pt = cutterContactEngine.computeCC({
      surface: {
        type: "cone",
        origin: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        radius_mm: 20,
        half_angle_deg: 15,
      },
      cutter: { type: "flat", diameter_mm: 12 },
      u: 0.1,
      v: 0.3,
      stepover_mm: 3,
    });
    expect(pt.cc).toBeDefined();
    // Flat cutter on cone — very small scallop
    expect(pt.scallop_height_mm).toBeLessThan(0.01);
  });

  // ---- Torus surface ----
  it("computes CC on torus surface", () => {
    const pt = cutterContactEngine.computeCC({
      surface: {
        type: "torus",
        origin: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        radius_mm: 40,
        radius2_mm: 10,
      },
      cutter: { type: "bull_nose", diameter_mm: 16, corner_radius_mm: 3 },
      u: 0.25,
      v: 0.25,
      stepover_mm: 2,
    });
    expect(pt.cc).toBeDefined();
    expect(pt.effective_radius_mm).toBeGreaterThan(0);
  });

  // ---- Bull-nose cutter ----
  it("uses corner radius for bull-nose scallop", () => {
    const pt = cutterContactEngine.computeCC({
      surface: {
        type: "plane",
        origin: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
      },
      cutter: { type: "bull_nose", diameter_mm: 20, corner_radius_mm: 3 },
      u: 0.5,
      v: 0.5,
      stepover_mm: 2,
    });
    // Effective radius = corner radius for bull-nose on flat
    expect(pt.effective_radius_mm).toBe(3);
  });

  // ---- Barrel cutter — large effective radius ----
  it("uses barrel radius for barrel cutter scallop", () => {
    const pt = cutterContactEngine.computeCC({
      surface: {
        type: "plane",
        origin: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
      },
      cutter: { type: "barrel", diameter_mm: 16, barrel_radius_mm: 250 },
      u: 0.5,
      v: 0.5,
      stepover_mm: 5,
    });
    expect(pt.effective_radius_mm).toBe(250);
    // Barrel cutter: very small scallop even at large stepover
    expect(pt.scallop_height_mm).toBeLessThan(0.1);
  });

  // ---- Grid computation ----
  it("computes CC grid with statistics", () => {
    const result = cutterContactEngine.computeGrid(
      {
        type: "sphere",
        origin: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        radius_mm: 50,
      },
      { type: "ball", diameter_mm: 12 },
      2, // stepover
      5, // u_steps
      5, // v_steps
    );
    expect(result.points).toHaveLength(36); // (5+1)*(5+1)
    expect(result.avg_scallop_mm).toBeGreaterThan(0);
    expect(result.max_scallop_mm).toBeGreaterThanOrEqual(result.avg_scallop_mm);
    expect(result.surface_type).toBe("sphere");
    expect(result.cutter_type).toBe("ball");
  });

  // ---- Tool axis with tilt ----
  it("applies tilt angle to tool axis", () => {
    const normal = { x: 0, y: 0, z: 1 };
    const axis0 = cutterContactEngine.computeToolAxis(normal, 0, 0);
    expect(axis0.z).toBeCloseTo(1, 3);

    const axis15 = cutterContactEngine.computeToolAxis(normal, 15, 0);
    // Tilted: z component should be less than 1
    expect(axis15.z).toBeLessThan(1);
    expect(axis15.z).toBeGreaterThan(0.9); // cos(15°) ≈ 0.966
  });

  // ---- Tool axis with lead ----
  it("applies lead angle to tool axis", () => {
    const normal = { x: 0, y: 0, z: 1 };
    const axisLead = cutterContactEngine.computeToolAxis(normal, 0, 10);
    expect(axisLead.z).toBeLessThan(1);
    expect(axisLead.z).toBeGreaterThan(0.95);
  });

  // ---- Optimal stepover computation ----
  it("computes optimal stepover for target scallop", () => {
    // ae = 2 * sqrt(2 * R * h)
    const cutter = { type: "ball" as const, diameter_mm: 10 };
    const targetH = 0.01; // 10 µm scallop
    const ae = cutterContactEngine.optimalStepover(cutter, targetH);
    // ae = 2 * sqrt(2 * 5 * 0.01) = 2 * sqrt(0.1) ≈ 0.632 mm
    expect(ae).toBeCloseTo(2 * Math.sqrt(2 * 5 * 0.01), 3);
  });

  // ---- Effective radius with concave surface ----
  it("adjusts effective radius for curved surfaces", () => {
    const cutter = { type: "ball" as const, diameter_mm: 10 };
    // Convex surface (positive curvature) → larger effective R → smaller scallop
    const rFlat = cutterContactEngine.getEffectiveRadius(cutter, 0, 0);
    const rConvex = cutterContactEngine.getEffectiveRadius(cutter, 0, 0.02); // κ2 = 0.02 (R=50mm)
    expect(rFlat).toBe(5);
    // 1/R_eff = 1/5 - 0.02 = 0.18 → R_eff ≈ 5.556
    expect(rConvex).toBeCloseTo(1 / (1 / 5 - 0.02), 2);
    expect(rConvex).toBeGreaterThan(rFlat);
  });

  // ---- Gouge detection ----
  it("detects potential gouging with large ball on tight curve", () => {
    const result = cutterContactEngine.computeGrid(
      {
        type: "sphere",
        origin: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 0, z: 1 },
        radius_mm: 8, // tight sphere, R < cutter radius
      },
      { type: "ball", diameter_mm: 20 }, // R=10 > sphere R=8
      2,
      3,
      3,
    );
    // Should detect gouging risk
    expect(result.gouge_free).toBe(false);
  });
});
