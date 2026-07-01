import { describe, it, expect } from "vitest";
import { FeatureClusteringEngine, ClusterableFeature } from "../engines/FeatureClusteringEngine.js";

const engine = new FeatureClusteringEngine();

function makeFeatures(count: number): ClusterableFeature[] {
  const features: ClusterableFeature[] = [];
  const types = ["pocket_rectangular", "through_hole", "slot", "boss", "face", "contour"];
  const ops: Array<"roughing" | "finishing" | "drilling"> = ["roughing", "finishing", "drilling"];
  const dirs = [
    { x: 0, y: 0, z: 1 }, // top
    { x: 0, y: 0, z: -1 }, // bottom
    { x: 1, y: 0, z: 0 }, // right
    { x: 0, y: 1, z: 0 }, // front
  ];

  for (let i = 0; i < count; i++) {
    features.push({
      id: `f-${i}`,
      type: types[i % types.length],
      operation: ops[i % ops.length],
      position: { x: (i % 10) * 15, y: Math.floor(i / 10) * 15, z: 0 },
      access_direction: dirs[i % dirs.length],
      dimensions: { length_mm: 20 + (i % 5) * 5, width_mm: 15, depth_mm: 8 },
      tolerance_mm: 0.05,
    });
  }
  return features;
}

describe("FeatureClusteringEngine", () => {
  it("clusters 10 features into direction-based setups", () => {
    const features = makeFeatures(10);
    const result = engine.cluster(features);

    expect(result.total_features).toBe(10);
    expect(result.total_setups).toBeGreaterThan(0);
    expect(result.total_setups).toBeLessThanOrEqual(6);
    expect(result.quality_score).toBe(1.0);
    const totalClustered = result.clusters.reduce((s, c) => s + c.feature_count, 0);
    expect(totalClustered).toBe(10);
  });

  it("handles 200+ features without performance issues", () => {
    const features = makeFeatures(250);
    const t0 = Date.now();
    const result = engine.cluster(features);
    const elapsed = Date.now() - t0;

    expect(result.total_features).toBe(250);
    expect(result.total_setups).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000); // under 2 seconds
    expect(result.quality_score).toBe(1.0);
  });

  it("respects dependencies: roughing before finishing", () => {
    const features: ClusterableFeature[] = [
      {
        id: "rough-1", type: "pocket", operation: "roughing",
        position: { x: 0, y: 0, z: 0 }, access_direction: { x: 0, y: 0, z: 1 },
      },
      {
        id: "finish-1", type: "pocket", operation: "finishing",
        position: { x: 0, y: 0, z: 0 }, access_direction: { x: 0, y: 0, z: 1 },
      },
    ];
    const result = engine.cluster(features);

    // Both in same cluster (same direction)
    expect(result.clusters.length).toBe(1);
    const ops = result.clusters[0].operations;
    const roughIdx = ops.findIndex((o) => o.feature_id === "rough-1");
    const finishIdx = ops.findIndex((o) => o.feature_id === "finish-1");
    expect(roughIdx).toBeLessThan(finishIdx);
  });

  it("separates features by access direction", () => {
    const features: ClusterableFeature[] = [
      { id: "top-1", type: "pocket", operation: "roughing", position: { x: 0, y: 0, z: 0 }, access_direction: { x: 0, y: 0, z: 1 } },
      { id: "top-2", type: "pocket", operation: "roughing", position: { x: 20, y: 0, z: 0 }, access_direction: { x: 0, y: 0, z: 1 } },
      { id: "side-1", type: "pocket", operation: "roughing", position: { x: 0, y: 0, z: 0 }, access_direction: { x: 1, y: 0, z: 0 } },
    ];
    const result = engine.cluster(features);

    expect(result.total_setups).toBe(2);
    const topCluster = result.clusters.find((c) => c.orientation_label.includes("+Z"));
    const sideCluster = result.clusters.find((c) => c.orientation_label.includes("+X"));
    expect(topCluster?.feature_count).toBe(2);
    expect(sideCluster?.feature_count).toBe(1);
  });

  it("builds dependency edges for drill → tap", () => {
    const features: ClusterableFeature[] = [
      { id: "drill-1", type: "drill_hole", operation: "drilling", position: { x: 10, y: 10, z: 0 }, access_direction: { x: 0, y: 0, z: 1 } },
      { id: "tap-1", type: "tap_thread", operation: "drilling", position: { x: 10, y: 10, z: 0 }, access_direction: { x: 0, y: 0, z: 1 } },
    ];
    const result = engine.cluster(features);

    expect(result.dependency_edges.length).toBeGreaterThan(0);
    expect(result.dependency_edges.some((e) => e.from === "drill-1" && e.to === "tap-1")).toBe(true);
  });

  it("estimates tools and cycle time per cluster", () => {
    const features = makeFeatures(30);
    const result = engine.cluster(features);

    for (const cluster of result.clusters) {
      expect(cluster.estimated_tools).toBeGreaterThan(0);
      expect(cluster.estimated_cycle_time_min).toBeGreaterThan(0);
    }
  });

  it("handles empty feature list", () => {
    const result = engine.cluster([]);
    expect(result.total_features).toBe(0);
    expect(result.total_setups).toBe(0);
    expect(result.quality_score).toBe(1.0);
  });

  it("handles explicit prerequisites", () => {
    const features: ClusterableFeature[] = [
      { id: "a", type: "face", operation: "facing", position: { x: 0, y: 0, z: 0 }, access_direction: { x: 0, y: 0, z: 1 } },
      { id: "b", type: "pocket", operation: "roughing", position: { x: 20, y: 0, z: 0 }, access_direction: { x: 0, y: 0, z: 1 }, requires_feature_ids: ["a"] },
    ];
    const result = engine.cluster(features);

    expect(result.dependency_edges.some((e) => e.from === "a" && e.to === "b")).toBe(true);
    const ops = result.clusters[0].operations;
    const aIdx = ops.findIndex((o) => o.feature_id === "a");
    const bIdx = ops.findIndex((o) => o.feature_id === "b");
    expect(aIdx).toBeLessThan(bIdx);
  });

  it("sorts clusters largest first", () => {
    const features = makeFeatures(50);
    const result = engine.cluster(features);

    for (let i = 1; i < result.clusters.length; i++) {
      expect(result.clusters[i - 1].feature_count).toBeGreaterThanOrEqual(
        result.clusters[i].feature_count
      );
    }
  });
});
