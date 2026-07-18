/**
 * FeatureToZoneEngine Tests — CAMK-MS0/U01
 * Tests geometric feature → machining zone decomposition
 */
import { describe, it, expect } from "vitest";
import { featureToZoneEngine, type FeatureInput } from "../engines/FeatureToZoneEngine.js";

describe("FeatureToZoneEngine", () => {
  // ---- Pocket decomposition ----
  it("decomposes a rectangular pocket into floor + walls + corners", () => {
    const features: FeatureInput[] = [{
      id: "pocket1",
      type: "pocket",
      dims: { length_mm: 80, width_mm: 60, depth_mm: 20 },
      corner_radii_mm: [5, 5, 5, 5],
      wall_angles_deg: [0],
    }];
    const result = featureToZoneEngine.decompose(features);
    expect(result.total_zones).toBeGreaterThanOrEqual(3); // floor + wall(s) + corners
    expect(result.zones.some(z => z.type === "flat")).toBe(true);
    expect(result.zones.some(z => z.type === "steep_wall")).toBe(true);
    expect(result.zones.some(z => z.type === "corner")).toBe(true);
    expect(result.zones.every(z => z.source_feature_id === "pocket1")).toBe(true);
  });

  // ---- Pocket with curved floor ----
  it("handles pocket with curved floor as freeform zone", () => {
    const features: FeatureInput[] = [{
      id: "cpocket",
      type: "pocket",
      dims: { length_mm: 50, width_mm: 50, depth_mm: 15 },
      floor: "curved",
      wall_angles_deg: [5],
    }];
    const result = featureToZoneEngine.decompose(features);
    const floorZone = result.zones.find(z => z.id.includes("floor"));
    expect(floorZone).toBeDefined();
    expect(floorZone!.type).toBe("freeform");
  });

  // ---- Boss decomposition ----
  it("decomposes a cylindrical boss into top + sides", () => {
    const features: FeatureInput[] = [{
      id: "boss1",
      type: "boss",
      dims: { diameter_mm: 30, height_mm: 12 },
    }];
    const result = featureToZoneEngine.decompose(features);
    expect(result.total_zones).toBe(2); // top + sides
    expect(result.zones.some(z => z.type === "flat")).toBe(true);
    expect(result.zones.some(z => z.id.includes("sides"))).toBe(true);
  });

  // ---- Freeform with curvature variation ----
  it("splits freeform surface with high curvature variation into 2 zones", () => {
    const features: FeatureInput[] = [{
      id: "surf1",
      type: "freeform_surface",
      dims: { length_mm: 100, width_mm: 80 },
      curvature: {
        min_radius_mm: 5,
        max_radius_mm: 200,
        avg_radius_mm: 50,
        type: "saddle",
      },
    }];
    const result = featureToZoneEngine.decompose(features);
    expect(result.total_zones).toBe(2); // high_curv + low_curv
    const highCurv = result.zones.find(z => z.id.includes("high_curv"));
    expect(highCurv).toBeDefined();
    expect(highCurv!.curvature_radius_mm).toBe(5);
  });

  // ---- Freeform uniform curvature ----
  it("keeps uniform curvature freeform as single zone", () => {
    const features: FeatureInput[] = [{
      id: "surf2",
      type: "freeform_surface",
      dims: { length_mm: 60, width_mm: 40 },
      curvature: { min_radius_mm: 20, max_radius_mm: 30, avg_radius_mm: 25 },
    }];
    const result = featureToZoneEngine.decompose(features);
    expect(result.total_zones).toBe(1);
    expect(result.zones[0].curvature_radius_mm).toBe(25);
  });

  // ---- Hole feature ----
  it("maps hole to single hole zone", () => {
    const features: FeatureInput[] = [{
      id: "hole1",
      type: "hole",
      dims: { diameter_mm: 10, depth_mm: 25 },
    }];
    const result = featureToZoneEngine.decompose(features);
    expect(result.total_zones).toBe(1);
    expect(result.zones[0].type).toBe("hole");
    expect(result.zones[0].area_mm2).toBeCloseTo(Math.PI * 10 * 25, 0);
  });

  // ---- Rib feature ----
  it("maps rib to rib zone with correct area", () => {
    const features: FeatureInput[] = [{
      id: "rib1",
      type: "rib",
      dims: { length_mm: 60, width_mm: 3, height_mm: 20 },
    }];
    const result = featureToZoneEngine.decompose(features);
    expect(result.total_zones).toBe(1);
    expect(result.zones[0].type).toBe("rib");
    // Area = 2*L*H + L*W = 2*60*20 + 60*3 = 2580
    expect(result.zones[0].area_mm2).toBeCloseTo(2580, 0);
  });

  // ---- Thin wall ----
  it("maps thin_wall to steep_wall zone", () => {
    const features: FeatureInput[] = [{
      id: "wall1",
      type: "thin_wall",
      dims: { length_mm: 50, height_mm: 30, width_mm: 2 },
    }];
    const result = featureToZoneEngine.decompose(features);
    expect(result.zones[0].type).toBe("steep_wall");
    expect(result.zones[0].suggested_algorithms).toContain("PTDC");
  });

  // ---- Multiple features ----
  it("handles multiple features returning combined zones", () => {
    const features: FeatureInput[] = [
      { id: "f1", type: "planar_face", dims: { length_mm: 100, width_mm: 80 } },
      { id: "f2", type: "hole", dims: { diameter_mm: 8, depth_mm: 15 } },
      { id: "f3", type: "chamfer", dims: { length_mm: 100, depth_mm: 2 } },
    ];
    const result = featureToZoneEngine.decompose(features);
    expect(result.total_zones).toBe(3);
    expect(result.zone_type_summary).toHaveProperty("flat");
    expect(result.zone_type_summary).toHaveProperty("hole");
    expect(result.zone_type_summary).toHaveProperty("shallow");
  });

  // ---- MTHZD compatibility ----
  it("converts zones to MTHZD-compatible format", () => {
    const features: FeatureInput[] = [{
      id: "p1",
      type: "pocket",
      dims: { length_mm: 40, width_mm: 30, depth_mm: 10 },
      corner_radii_mm: [3],
      wall_angles_deg: [0],
    }];
    const result = featureToZoneEngine.decompose(features);
    const mthzd = featureToZoneEngine.toMTHZDZones(result.zones);
    const validTypes = new Set(["flat", "steep_wall", "freeform", "pocket", "corner", "rib", "undercut"]);
    for (const z of mthzd) {
      expect(validTypes.has(z.type)).toBe(true);
      expect(z.area_mm2).toBeGreaterThan(0);
    }
  });

  // ---- MACS compatibility ----
  it("converts zones to MACS-compatible format", () => {
    const features: FeatureInput[] = [
      { id: "b1", type: "boss", dims: { diameter_mm: 20, height_mm: 10 } },
    ];
    const result = featureToZoneEngine.decompose(features);
    const macs = featureToZoneEngine.toMACSZones(result.zones);
    const validTypes = new Set(["steep", "shallow", "undercut", "boss", "pocket", "freeform"]);
    for (const z of macs) {
      expect(validTypes.has(z.type)).toBe(true);
      expect(typeof z.max_angle_deg).toBe("number");
    }
  });

  // ---- Algorithm suggestions ----
  it("suggests appropriate algorithms per zone type", () => {
    const features: FeatureInput[] = [
      { id: "deep", type: "pocket", dims: { length_mm: 50, width_mm: 50, depth_mm: 40 }, corner_radii_mm: [5], wall_angles_deg: [0] },
    ];
    const result = featureToZoneEngine.decompose(features);
    const pocketFloor = result.zones.find(z => z.type === "flat");
    expect(pocketFloor?.suggested_algorithms).toContain("CFSF");
    const corner = result.zones.find(z => z.type === "corner");
    expect(corner?.suggested_algorithms).toContain("PTDC");
  });

  // ---- List functions ----
  it("lists all supported feature types", () => {
    const types = featureToZoneEngine.listFeatureTypes();
    expect(types.length).toBe(12);
    expect(types).toContain("pocket");
    expect(types).toContain("freeform_surface");
    expect(types).toContain("contour");
  });

  it("lists all zone types", () => {
    const types = featureToZoneEngine.listZoneTypes();
    expect(types.length).toBe(10);
    expect(types).toContain("steep_wall");
    expect(types).toContain("undercut");
  });

  // ---- Slot treated as pocket ----
  it("treats slot as pocket for decomposition", () => {
    const features: FeatureInput[] = [{
      id: "slot1",
      type: "slot",
      dims: { length_mm: 100, width_mm: 8, depth_mm: 12 },
      corner_radii_mm: [4],
      wall_angles_deg: [0],
    }];
    const result = featureToZoneEngine.decompose(features);
    expect(result.total_zones).toBeGreaterThanOrEqual(2); // floor + walls
    expect(result.zones.some(z => z.type === "flat")).toBe(true);
  });

  // ---- Area computation ----
  it("computes feature area correctly for cylindrical hole", () => {
    const feature: FeatureInput = {
      id: "h1", type: "hole",
      dims: { diameter_mm: 12, depth_mm: 30 },
    };
    const area = featureToZoneEngine.computeFeatureArea(feature);
    // π * d * D = π * 12 * 30 ≈ 1130.97
    expect(area).toBeCloseTo(Math.PI * 12 * 30, 0);
  });
});
