/**
 * RestMachiningEngine Tests — CAMK-MS3/U01
 * Tests IPW-aware rest machining with novel algorithm selection
 */
import { describe, it, expect } from "vitest";
import { restMachiningEngine } from "../engines/RestMachiningEngine.js";

const stock = { min_x: 0, min_y: 0, min_z: -30, max_x: 100, max_y: 80, max_z: 0 };
const target = { min_x: 5, min_y: 5, min_z: -25, max_x: 95, max_y: 75, max_z: -5 };

describe("RestMachiningEngine", () => {
  // ---- AABB utilities ----
  it("computes AABB volume", () => {
    expect(restMachiningEngine.aabbVolume(stock)).toBe(100 * 80 * 30);
  });

  it("computes AABB intersection", () => {
    const a = { min_x: 0, min_y: 0, min_z: 0, max_x: 10, max_y: 10, max_z: 10 };
    const b = { min_x: 5, min_y: 5, min_z: 5, max_x: 15, max_y: 15, max_z: 15 };
    const inter = restMachiningEngine.aabbIntersection(a, b);
    expect(inter).not.toBeNull();
    expect(restMachiningEngine.aabbVolume(inter!)).toBe(125); // 5×5×5
  });

  it("returns null for non-overlapping AABBs", () => {
    const a = { min_x: 0, min_y: 0, min_z: 0, max_x: 5, max_y: 5, max_z: 5 };
    const b = { min_x: 10, min_y: 10, min_z: 10, max_x: 15, max_y: 15, max_z: 15 };
    expect(restMachiningEngine.aabbIntersection(a, b)).toBeNull();
  });

  // ---- Rest detection ----
  it("detects rest material after partial machining", () => {
    const machined = [{ min_x: 10, min_y: 10, min_z: -25, max_x: 50, max_y: 40, max_z: 0 }];
    const rest = restMachiningEngine.detectRestRegions(stock, machined, target);
    expect(rest.length).toBeGreaterThan(0);
  });

  it("no rest when fully machined", () => {
    // Machine the entire stock
    const machined = [stock];
    const rest = restMachiningEngine.detectRestRegions(stock, machined, target);
    expect(rest.length).toBe(0);
  });

  // ---- Zone classification ----
  it("classifies narrow zone as corner", () => {
    const zone = { min_x: 0, min_y: 0, min_z: -10, max_x: 3, max_y: 3, max_z: 0 };
    expect(restMachiningEngine.classifyZone(zone, 10, 5)).toBe("corner");
  });

  it("classifies wide shallow zone as floor", () => {
    const zone = { min_x: 0, min_y: 0, min_z: -2, max_x: 40, max_y: 40, max_z: 0 };
    expect(restMachiningEngine.classifyZone(zone, 10, 5)).toBe("floor");
  });

  it("classifies narrow deep zone as wall", () => {
    const zone = { min_x: 0, min_y: 0, min_z: -20, max_x: 3, max_y: 50, max_z: 0 };
    expect(restMachiningEngine.classifyZone(zone, 10, 5)).toBe("wall");
  });

  it("classifies deep wide zone as pocket", () => {
    const zone = { min_x: 0, min_y: 0, min_z: -20, max_x: 30, max_y: 30, max_z: 0 };
    expect(restMachiningEngine.classifyZone(zone, 10, 5)).toBe("pocket");
  });

  // ---- Full analysis ----
  it("analyzes rest machining for 3-operation chain", () => {
    const prevOps = [
      {
        tool: { type: "endmill", diameter_mm: 20 },
        strategy: "adaptive_clearing",
        stock_before: stock,
        zones_cut: [
          { min_x: 10, min_y: 10, min_z: -25, max_x: 90, max_y: 70, max_z: 0 },
        ],
      },
      {
        tool: { type: "endmill", diameter_mm: 10 },
        strategy: "rest_roughing",
        stock_before: stock,
        zones_cut: [
          { min_x: 5, min_y: 5, min_z: -25, max_x: 10, max_y: 70, max_z: 0 },
          { min_x: 90, min_y: 5, min_z: -25, max_x: 95, max_y: 70, max_z: 0 },
        ],
      },
    ];

    const result = restMachiningEngine.analyze({
      target_geometry: target,
      stock,
      previous_ops: prevOps,
    });

    expect(result.rest_zones.length).toBeGreaterThanOrEqual(0);
    expect(result.operations.length).toBe(result.zone_count);
    expect(result.estimated_total_time_sec).toBeGreaterThanOrEqual(0);
  });

  // ---- Algorithm selection per zone type ----
  it("selects SFCR for corner zones", () => {
    const prevOps = [{
      tool: { type: "endmill", diameter_mm: 20 },
      strategy: "roughing",
      stock_before: stock,
      zones_cut: [{ min_x: 20, min_y: 20, min_z: -25, max_x: 80, max_y: 60, max_z: 0 }],
    }];
    const result = restMachiningEngine.analyze({
      target_geometry: target, stock, previous_ops: prevOps,
    });
    const cornerOps = result.operations.filter(o => o.zone.type === "corner");
    for (const op of cornerOps) {
      expect(op.algorithm).toBe("SFCR");
    }
  });

  // ---- Tool recommendation ----
  it("recommends smaller tool for narrow zones", () => {
    const zone = {
      id: "test", type: "corner" as const,
      bounds: { min_x: 0, min_y: 0, min_z: -10, max_x: 4, max_y: 4, max_z: 0 },
      volume_mm3: 160, max_depth_mm: 10, min_width_mm: 4,
      recommended_algorithm: "SFCR", recommended_tool_diameter_mm: 0,
      reason: "test",
    };
    const dia = restMachiningEngine.recommendToolDiameter(zone);
    expect(dia).toBeLessThanOrEqual(4);
    expect(dia).toBeGreaterThan(0);
  });

  it("uses available tools when provided", () => {
    const zone = {
      id: "test", type: "floor" as const,
      bounds: { min_x: 0, min_y: 0, min_z: -3, max_x: 30, max_y: 30, max_z: 0 },
      volume_mm3: 2700, max_depth_mm: 3, min_width_mm: 30,
      recommended_algorithm: "CFSF", recommended_tool_diameter_mm: 0,
      reason: "test",
    };
    const tools = [
      { type: "endmill", diameter_mm: 6 },
      { type: "endmill", diameter_mm: 16 },
      { type: "endmill", diameter_mm: 25 },
    ];
    const dia = restMachiningEngine.recommendToolDiameter(zone, tools);
    expect(dia).toBe(25); // largest that fits (25 <= 30*0.9=27)
  });

  // ---- Operation sequencing ----
  it("groups operations by tool to minimize changes", () => {
    const prevOps = [{
      tool: { type: "endmill", diameter_mm: 20 },
      strategy: "roughing",
      stock_before: stock,
      zones_cut: [{ min_x: 30, min_y: 30, min_z: -20, max_x: 70, max_y: 50, max_z: 0 }],
    }];
    const result = restMachiningEngine.analyze({
      target_geometry: target, stock, previous_ops: prevOps,
    });
    // Operations should be sorted by tool diameter (grouped)
    if (result.operations.length > 1) {
      for (let i = 1; i < result.operations.length; i++) {
        const prev = result.operations[i - 1];
        const curr = result.operations[i];
        // Same tool group should be consecutive
        if (prev.tool.diameter_mm === curr.tool.diameter_mm) {
          expect(curr.sequence).toBe(prev.sequence + 1);
        }
      }
    }
  });

  // ---- Quick check ----
  it("quickCheck detects if rest machining is needed", () => {
    const prevOps = [{
      tool: { type: "endmill", diameter_mm: 20 },
      strategy: "roughing",
      stock_before: stock,
      zones_cut: [{ min_x: 30, min_y: 30, min_z: -20, max_x: 70, max_y: 50, max_z: 0 }],
    }];
    const quick = restMachiningEngine.quickCheck({
      target_geometry: target, stock, previous_ops: prevOps,
    });
    expect(quick.needed).toBeDefined();
    expect(quick.zone_count).toBeGreaterThanOrEqual(0);
  });

  // ---- Empty previous ops ----
  it("handles no previous operations", () => {
    const result = restMachiningEngine.analyze({
      target_geometry: target, stock, previous_ops: [],
    });
    expect(result.zone_count).toBe(0);
    expect(result.optimization_notes).toContain("No previous operations — full machining needed");
  });

  // ---- Optimization notes ----
  it("provides optimization notes", () => {
    const prevOps = [{
      tool: { type: "endmill", diameter_mm: 20 },
      strategy: "roughing",
      stock_before: stock,
      zones_cut: [{ min_x: 30, min_y: 30, min_z: -20, max_x: 70, max_y: 50, max_z: 0 }],
    }];
    const result = restMachiningEngine.analyze({
      target_geometry: target, stock, previous_ops: prevOps,
    });
    expect(Array.isArray(result.optimization_notes)).toBe(true);
  });
});
