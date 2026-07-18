import { describe, it, expect } from "vitest";
import { CADPatternEngine, cadPatternEngine } from "../engines/CADPatternEngine.js";

const eng = new CADPatternEngine();

describe("CADPatternEngine — replication (linear / circular / mirror)", () => {
  // ---- happy path: exact reference values (R9) ----
  it("linear: instance_count = count; total = count * featureVol; emits .rarray", () => {
    const r = eng.linear(5, 10, 200);
    expect(r.success).toBe(true);
    expect(r.instance_count).toBe(5);
    expect(r.total_feature_volume_mm3).toBe(1000); // 5 * 200
    expect(r.cadquery_op).toContain(".rarray(10, 1, 5, 1)");
  });

  it("circular: count instances over 360deg; emits .polarArray", () => {
    const r = eng.circular(6, 20, 100);
    expect(r.success).toBe(true);
    expect(r.instance_count).toBe(6);
    expect(r.total_feature_volume_mm3).toBe(600);
    expect(r.cadquery_op).toContain(".polarArray(20, 0, 360, 6)");
  });

  it("mirror: exactly 2 instances; emits .mirror(plane)", () => {
    const r = eng.mirror("xy", 50); // lowercase normalized -> XY
    expect(r.success).toBe(true);
    expect(r.instance_count).toBe(2);
    expect(r.total_feature_volume_mm3).toBe(100);
    expect(r.cadquery_op).toContain('.mirror("XY")');
  });

  it("featureVolume omitted -> total 0 but still a valid pattern", () => {
    const r = eng.linear(3, 5);
    expect(r.success).toBe(true);
    expect(r.instance_count).toBe(3);
    expect(r.total_feature_volume_mm3).toBe(0);
  });

  // ---- failure modes (>=3) ----
  it("count < 1 or non-integer -> failure", () => {
    expect(eng.linear(0, 10).success).toBe(false);
    expect(eng.linear(-2, 10).success).toBe(false);
    expect(eng.circular(2.5, 20).success).toBe(false); // non-integer count
  });

  it("non-positive spacing/radius -> failure", () => {
    expect(eng.linear(5, 0).success).toBe(false);
    expect(eng.circular(6, -5).success).toBe(false);
  });

  it("invalid mirror plane -> failure naming the valid planes", () => {
    const r = eng.mirror("diagonal");
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/XY\|YZ\|XZ/);
  });

  // ---- adversarial (>=2): NaN / Infinity ----
  it("NaN / Infinity -> structured failure, never throws", () => {
    expect(eng.linear(NaN, 10).success).toBe(false);
    expect(eng.circular(6, Infinity).success).toBe(false);
    expect(eng.linear(5, 10, NaN).success).toBe(false);
  });

  // ---- dispatcher entrypoint round-trip (R15) ----
  it("apply(): routes linear/circular/mirror by kind param", () => {
    expect(cadPatternEngine.apply({ kind: "linear", count: 5, spacing_mm: 10, feature_volume_mm3: 200 }).total_feature_volume_mm3).toBe(1000);
    expect(cadPatternEngine.apply({ pattern: "circular", count: 6, radius_mm: 20 }).instance_count).toBe(6);
    expect(cadPatternEngine.apply({ kind: "mirror", plane: "YZ" }).instance_count).toBe(2);
  });

  it("apply(): unknown kind -> structured failure naming the valid kinds", () => {
    const r = cadPatternEngine.apply({ kind: "spiral", count: 3 });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/linear\|circular\|mirror/);
  });
});
