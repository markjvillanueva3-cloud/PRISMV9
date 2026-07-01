/**
 * DriftDetectionEngine tests — HMEMV06. Exact cosine arithmetic + verdict
 * threshold behavior + boundary cases.
 */
import { describe, it, expect } from "vitest";
import { DriftDetectionEngine } from "../engines/DriftDetectionEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const LATER = "2026-05-31T13:00:00.000Z";

describe("DriftDetectionEngine.measure — drift verdict", () => {
  it("identical centroids → drift=0, similarity=1, verdict=stable", () => {
    const m = DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [1, 0, 0],
      current_centroid: [1, 0, 0],
      baseline_at: ISO, current_at: LATER,
    });
    expect(m.drift).toBe(0);
    expect(m.similarity).toBe(1);
    expect(m.verdict).toBe("stable");
  });

  it("orthogonal centroids → drift=1, similarity=0, verdict=drifted", () => {
    const m = DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [1, 0, 0],
      current_centroid: [0, 1, 0],
      baseline_at: ISO, current_at: LATER,
    });
    expect(m.drift).toBe(1);
    expect(m.similarity).toBe(0);
    expect(m.verdict).toBe("drifted");
  });

  it("opposite centroids → drift=2, similarity=-1, verdict=drifted", () => {
    const m = DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [1, 0, 0],
      current_centroid: [-1, 0, 0],
      baseline_at: ISO, current_at: LATER,
    });
    expect(m.drift).toBe(2);
    expect(m.similarity).toBe(-1);
    expect(m.verdict).toBe("drifted");
  });

  it("small drift (similarity 0.95) → verdict=stable (drift=0.05 < 0.1 threshold)", () => {
    const m = DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [1, 0],
      current_centroid: [0.95, Math.sqrt(1 - 0.95 * 0.95)], // unit-norm with cos=0.95
      baseline_at: ISO, current_at: LATER,
    });
    expect(m.similarity).toBeCloseTo(0.95, 5);
    expect(m.drift).toBeCloseTo(0.05, 5);
    expect(m.verdict).toBe("stable");
  });

  it("medium drift (drift=0.2) → verdict=drifting (between 0.1 and 0.3)", () => {
    const m = DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [1, 0],
      current_centroid: [0.8, 0.6], // cos=0.8, drift=0.2
      baseline_at: ISO, current_at: LATER,
    });
    expect(m.similarity).toBeCloseTo(0.8, 5);
    expect(m.drift).toBeCloseTo(0.2, 5);
    expect(m.verdict).toBe("drifting");
  });

  it("respects custom thresholds: drift=0.05 vs drifting_threshold=0.02 → drifting", () => {
    const m = DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [1, 0],
      current_centroid: [0.95, Math.sqrt(1 - 0.95 * 0.95)],
      baseline_at: ISO, current_at: LATER,
      opts: { drifting_threshold: 0.02, drifted_threshold: 0.1 },
    });
    expect(m.verdict).toBe("drifting");
  });

  it("throws on mismatched centroid lengths", () => {
    expect(() => DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [1, 0],
      current_centroid: [1, 0, 0],
      baseline_at: ISO, current_at: LATER,
    })).toThrow();
  });

  it("throws on empty centroids", () => {
    expect(() => DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [],
      current_centroid: [],
      baseline_at: ISO, current_at: LATER,
    })).toThrow();
  });

  it("throws when drifting_threshold >= drifted_threshold (inverted)", () => {
    expect(() => DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [1, 0],
      current_centroid: [0, 1],
      baseline_at: ISO, current_at: LATER,
      opts: { drifting_threshold: 0.5, drifted_threshold: 0.3 },
    })).toThrow();
  });

  it("renderMeasurement emits verdict tag + drift score", () => {
    const m = DriftDetectionEngine.measure({
      cluster_id: "c1",
      baseline_centroid: [1, 0],
      current_centroid: [0, 1],
      baseline_at: ISO, current_at: LATER,
    });
    const md = DriftDetectionEngine.renderMeasurement(m);
    expect(md.includes("DRIFTED")).toBe(true);
    expect(md.includes("c1")).toBe(true);
    expect(md.includes("drift=1.0000")).toBe(true);
  });
});
