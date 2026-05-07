/**
 * PartGeometryPipelineEngine — PHASE24 wiring tests.
 *
 * Covers analyzeFeatures (feature classification + complexity grading +
 * required-ops mapping) and matchTools (tool-feature pairing). The full
 * generateJobPlan path is not exercised here — needs deeper material+tool
 * fixture data and is covered by job-planning suite.
 */
import { describe, it, expect } from "vitest";
import { partGeometryPipelineEngine } from "../engines/PartGeometryPipelineEngine.js";

describe("PartGeometryPipelineEngine", () => {
  it("analyzeFeatures returns simple complexity for empty list", () => {
    const out = partGeometryPipelineEngine.analyzeFeatures({
      features: [],
      material: "AISI 1018",
    });
    expect(out.value.features.length).toBe(0);
    expect(out.value.total_operations).toBe(0);
    expect(out.value.estimated_complexity).toBe("simple");
    expect(out.confidence).toBe(1.0);
  });

  it("analyzeFeatures classifies a face as simple with 1 op (roughing)", () => {
    const out = partGeometryPipelineEngine.analyzeFeatures({
      features: [{ id: "F1", type: "face", depth_mm: 1, length_mm: 100, width_mm: 100 }],
      material: "AISI 1018",
    });
    expect(out.value.features.length).toBe(1);
    expect(out.value.features[0].complexity).toBe("simple");
    expect(out.value.features[0].required_ops).toEqual(["roughing"]);
    expect(out.value.total_operations).toBe(1);
  });

  it("analyzeFeatures grades pocket_open with tight tolerance as complex", () => {
    const out = partGeometryPipelineEngine.analyzeFeatures({
      features: [
        {
          id: "P1",
          type: "pocket_open",
          depth_mm: 10,
          length_mm: 50,
          width_mm: 30,
          tolerance_mm: 0.005, // < 0.01 → complex
        },
      ],
      material: "AISI 1018",
    });
    expect(out.value.features[0].complexity).toBe("complex");
    // tol < 0.02 → roughing + semi_finishing + finishing = 3 ops
    expect(out.value.features[0].required_ops).toEqual([
      "roughing",
      "semi_finishing",
      "finishing",
    ]);
    expect(out.value.estimated_complexity).toBe("complex");
  });

  it("analyzeFeatures classifies hole_through with tight tolerance as drilling+reaming", () => {
    const out = partGeometryPipelineEngine.analyzeFeatures({
      features: [
        {
          id: "H1",
          type: "hole_through",
          depth_mm: 25,
          diameter_mm: 10,
          tolerance_mm: 0.01, // < 0.02 → adds reaming
        },
      ],
      material: "AISI 1018",
    });
    expect(out.value.features[0].required_ops).toEqual(["drilling", "reaming"]);
    expect(out.value.total_operations).toBe(2);
  });

  it("analyzeFeatures emits drilling+tapping for thread feature", () => {
    const out = partGeometryPipelineEngine.analyzeFeatures({
      features: [{ id: "T1", type: "thread", depth_mm: 20, diameter_mm: 8 }],
      material: "AISI 1018",
    });
    expect(out.value.features[0].required_ops).toEqual(["drilling", "tapping"]);
  });

  it("analyzeFeatures grades thin-wall (≤2mm) as complex", () => {
    const out = partGeometryPipelineEngine.analyzeFeatures({
      features: [
        {
          id: "W1",
          type: "wall",
          depth_mm: 30,
          length_mm: 80,
          wall_thickness_mm: 1.5, // ≤2mm → complex
        },
      ],
      material: "Aluminum 6061",
    });
    expect(out.value.features[0].complexity).toBe("complex");
  });

  it("analyzeFeatures grades high-aspect-ratio (>4) as complex", () => {
    // depth/width = 50/10 = 5 > 4 → complex
    const out = partGeometryPipelineEngine.analyzeFeatures({
      features: [
        { id: "S1", type: "slot", depth_mm: 50, width_mm: 10, length_mm: 80 },
      ],
      material: "AISI 1018",
    });
    expect(out.value.features[0].complexity).toBe("complex");
    expect(out.value.features[0].aspect_ratio).toBe(5);
  });

  it("analyzeFeatures skips features with non-positive depth", () => {
    const out = partGeometryPipelineEngine.analyzeFeatures({
      features: [
        { id: "BAD", type: "face", depth_mm: 0, length_mm: 100, width_mm: 100 },
        { id: "OK", type: "face", depth_mm: 1, length_mm: 100, width_mm: 100 },
      ],
      material: "AISI 1018",
    });
    expect(out.value.features.length).toBe(1);
    expect(out.value.features[0].id).toBe("OK");
  });

  it("matchTools returns empty matches when no tools provided", () => {
    const out = partGeometryPipelineEngine.matchTools({
      features: [{ id: "P1", type: "pocket_open", depth_mm: 5, length_mm: 50, width_mm: 30 }],
      tools: [],
      material: "AISI 1018",
    });
    expect(out.value.matches.length).toBe(0);
    // 1 feature with 2 ops (roughing + finishing) → 2 unmatched specs
    expect(out.value.unmatched.length).toBeGreaterThanOrEqual(1);
  });

  it("analyzeFeatures returns AtomicValue envelope with formula + confidence", () => {
    const out = partGeometryPipelineEngine.analyzeFeatures({
      features: [{ id: "F1", type: "face", depth_mm: 1, length_mm: 100, width_mm: 100 }],
      material: "AISI 1018",
    });
    expect(out.unit).toBe("analysis");
    expect(out.formula).toBe("feature_classification + operation_mapping");
    expect(out.confidence).toBe(0.92);
  });
});
