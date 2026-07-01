import { describe, it, expect } from "vitest";
import { diff, StepIgesRoundTripDiff, type GeometrySummary } from "./StepIgesRoundTripDiff.js";

const baseline: GeometrySummary = {
  vertex_count: 100, face_count: 50, edge_count: 200,
  volume_mm3: 1000, bbox_x_mm: 10, bbox_y_mm: 20, bbox_z_mm: 30,
  named_features: ["hole_M6_top", "pocket_main", "fillet_R2"],
};

describe("StepIgesRoundTripDiff", () => {
  it("identical before/after → clean severity", () => {
    const r = diff({ before: baseline, after: { ...baseline } });
    expect(r.severity).toBe("clean");
    expect(r.volume_drift_frac.value).toBe(0);
    expect(r.features_lost.length).toBe(0);
  });
  it("0.1% volume drift within default tolerance → clean", () => {
    const after = { ...baseline, volume_mm3: 1001 };
    const r = diff({ before: baseline, after });
    expect(r.severity).toBe("clean");
  });
  it("0.5% volume drift → warning (between 0.1% and 1%)", () => {
    const after = { ...baseline, volume_mm3: 1005 };
    const r = diff({ before: baseline, after });
    expect(r.severity).toBe("warning");
    expect(r.notes.join("|")).toContain("warning band");
  });
  it("5% volume drift → critical", () => {
    const after = { ...baseline, volume_mm3: 1050 };
    const r = diff({ before: baseline, after });
    expect(r.severity).toBe("critical");
    expect(r.notes.join("|")).toContain("face/shell loss");
  });
  it("feature loss → critical regardless of geometry drift", () => {
    const after = { ...baseline, named_features: ["hole_M6_top"] };
    const r = diff({ before: baseline, after });
    expect(r.severity).toBe("critical");
    expect(r.features_lost).toContain("pocket_main");
    expect(r.features_lost).toContain("fillet_R2");
  });
  it("bbox scale mismatch (>1%) flags critical", () => {
    const after = { ...baseline, bbox_x_mm: 12 };  // 20% delta
    const r = diff({ before: baseline, after });
    expect(r.severity).toBe("critical");
    expect(r.notes.join("|")).toContain("scale/unit mismatch");
  });
  it("vertex/face/edge counts reported as deltas", () => {
    const after = { ...baseline, vertex_count: 105, face_count: 52, edge_count: 198 };
    const r = diff({ before: baseline, after });
    expect(r.vertex_delta).toBe(5);
    expect(r.face_delta).toBe(2);
    expect(r.edge_delta).toBe(-2);
  });
  it("features added (conversion artifacts) emit info note", () => {
    const after = { ...baseline, named_features: [...baseline.named_features, "auto_chamfer"] };
    const r = diff({ before: baseline, after });
    expect(r.features_added).toContain("auto_chamfer");
    expect(r.notes.join("|")).toContain("artifact");
  });
  it("custom tolerance respected", () => {
    const after = { ...baseline, volume_mm3: 1005 };
    const r = diff({ before: baseline, after, geometry_tolerance_frac: 0.01 });
    expect(r.severity).toBe("clean");  // 0.5% within 1% tolerance now
  });
  it("missing summary diagnostic", () => {
    const r = diff({ before: undefined as unknown as GeometrySummary, after: baseline });
    expect(r.notes.join("|")).toContain("missing");
  });
  it("non-finite field diagnostic", () => {
    const r = diff({ before: { ...baseline, volume_mm3: NaN }, after: baseline });
    expect(r.notes.join("|")).toContain("not finite");
  });
  it("negative count diagnostic", () => {
    const r = diff({ before: { ...baseline, vertex_count: -1 }, after: baseline });
    expect(r.notes.join("|")).toContain("negative");
  });
  it("zero volume base survives (1e-9 floor)", () => {
    const zeroVol: GeometrySummary = { ...baseline, volume_mm3: 0 };
    const r = diff({ before: zeroVol, after: zeroVol });
    expect(r.severity).toBe("clean");
    expect(Number.isFinite(r.volume_drift_frac.value)).toBe(true);
  });
  it("missing input diagnostic", () => {
    expect(diff(null as unknown as { before: GeometrySummary; after: GeometrySummary }).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(StepIgesRoundTripDiff.version).toBe("1.0.0");
  });
});
