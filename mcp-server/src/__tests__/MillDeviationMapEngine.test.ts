import { describe, it, expect } from "vitest";
import {
  millDeviationMapEngine as eng,
  type MillDeviationMapInput,
  type MillDeviationSample,
} from "../engines/MillDeviationMapEngine.js";

function pt(x: number, y: number, z: number): MillDeviationSample {
  return { x_mm: x, y_mm: y, z_mm: z };
}

describe("MillDeviationMapEngine", () => {
  it("getStats reports canonical reference + 8 feature types + 7 metrics", () => {
    const s = eng.getStats();
    expect(s.reference).toMatch(/Smith.*Keir|ISO 1101|ISO 10360/);
    expect(s.supported_features).toEqual(["face", "pocket", "slot", "contour", "hole", "boss", "thread", "generic"]);
    expect(s.metrics).toContain("dominant_axis");
    expect(s.metrics.length).toBe(7);
  });

  it("throws when commanded/actual arrays missing", () => {
    expect(() => eng.compare({} as never)).toThrow(/commanded\[\] \+ actual\[\] required/);
  });

  it("exact-match samples → 0 deviation, 0 out_of_tol, dominant_axis=none, conforming recommendation", () => {
    const samples = [pt(0, 0, 0), pt(1, 1, -1), pt(2, 2, -2)];
    const r = eng.compare({ commanded: samples, actual: samples });
    expect(r.points.length).toBe(3);
    expect(r.max_abs_delta_mm).toBe(0);
    expect(r.rms_delta_mm).toBe(0);
    expect(r.out_of_tol_count).toBe(0);
    expect(r.dominant_axis).toBe("none");
    expect(r.recommendation).toMatch(/within tolerance.*conforming/);
  });

  it("0.03mm Z offset (above default 0.025 tol) → out of tol, Z dominant, max delta location captured", () => {
    const commanded = [pt(5, 5, -1)];
    const actual = [pt(5, 5, -0.97)];
    const r = eng.compare({ commanded, actual });
    expect(r.out_of_tol_count).toBe(1);
    expect(r.max_abs_delta_mm).toBeCloseTo(0.03, 5);
    expect(r.dominant_axis).toBe("Z");
    expect(r.max_abs_delta_location).toEqual({ x_mm: 5, y_mm: 5, z_mm: -1 });
    expect(r.points[0].pass_tol).toBe(false);
    expect(r.points[0].delta_z_mm).toBeCloseTo(0.03, 5);
  });

  it("pocket + Z-bias dominant → recommends tool deflection investigation", () => {
    const commanded = [pt(0, 0, -5), pt(2, 2, -5), pt(4, 4, -5)];
    const actual = [pt(0, 0, -4.95), pt(2, 2, -4.95), pt(4, 4, -4.95)]; // 0.05 Z high
    const r = eng.compare({ commanded, actual, feature_type: "pocket" });
    expect(r.dominant_axis).toBe("Z");
    expect(r.recommendation).toMatch(/Pocket Z-bias.*tool deflection|extension.*overhang|prism_calc:tool_deflection_calc/);
  });

  it("face + X-bias dominant → recommends fixture misalignment", () => {
    const commanded = [pt(0, 0, 0), pt(5, 0, 0), pt(10, 0, 0)];
    const actual = [pt(0.05, 0, 0), pt(5.05, 0, 0), pt(10.05, 0, 0)]; // 0.05 X bias
    const r = eng.compare({ commanded, actual, feature_type: "face" });
    expect(r.dominant_axis).toBe("X");
    expect(r.recommendation).toMatch(/face X-bias.*fixture misalignment|tramming/);
  });

  it("hole + Z-bias dominant → recommends drill point compensation drift", () => {
    const commanded = [pt(0, 0, -3), pt(0, 0, -6), pt(0, 0, -9)];
    const actual = [pt(0, 0, -3.08), pt(0, 0, -6.08), pt(0, 0, -9.08)];
    const r = eng.compare({ commanded, actual, feature_type: "hole" });
    expect(r.dominant_axis).toBe("Z");
    expect(r.recommendation).toMatch(/Hole Z-bias.*drill point|peck-retract|prism_calc:peck_drill_optimize/);
  });

  it("contour + dominant axis → recommends CRC/backlash/wear", () => {
    const commanded = [pt(0, 0, 0), pt(2, 0, 0), pt(4, 0, 0)];
    const actual = [pt(0, 0.04, 0), pt(2, 0.04, 0), pt(4, 0.04, 0)]; // Y bias
    const r = eng.compare({ commanded, actual, feature_type: "contour" });
    expect(r.dominant_axis).toBe("Y");
    expect(r.recommendation).toMatch(/Contour Y-bias.*CRC|G41|G42|backlash/);
  });

  it("slot + Z-bias → recommends Z-step depth drift", () => {
    const commanded = [pt(0, 0, -2), pt(1, 0, -2), pt(2, 0, -2)];
    const actual = [pt(0, 0, -2.05), pt(1, 0, -2.05), pt(2, 0, -2.05)];
    const r = eng.compare({ commanded, actual, feature_type: "slot" });
    expect(r.dominant_axis).toBe("Z");
    expect(r.recommendation).toMatch(/Slot Z-bias.*step depth|ap parameter/);
  });

  it("thread + dominant axis → recommends pitch/runout via prism_thread", () => {
    const commanded = [pt(0, 0, -1), pt(0.05, 0, -2), pt(0.10, 0, -3)];
    const actual = [pt(0.05, 0, -1), pt(0.10, 0, -2), pt(0.15, 0, -3)]; // X bias
    const r = eng.compare({ commanded, actual, feature_type: "thread" });
    expect(r.dominant_axis).toBe("X");
    expect(r.recommendation).toMatch(/Thread X-bias.*pitch.*runout|prism_thread/);
  });

  it("boss + Y-bias → fixture misalignment (same family as face)", () => {
    const commanded = [pt(0, 0, 0), pt(2, 0, 0), pt(4, 0, 0)];
    const actual = [pt(0, 0.05, 0), pt(2, 0.05, 0), pt(4, 0.05, 0)];
    const r = eng.compare({ commanded, actual, feature_type: "boss" });
    expect(r.dominant_axis).toBe("Y");
    expect(r.recommendation).toMatch(/boss Y-bias.*fixture|tramming/);
  });

  it("random noise no systematic bias → suggests CMM repeatability / vibration / chatter", () => {
    const commanded = [pt(0, 0, 0), pt(1, 0, 0), pt(2, 0, 0), pt(3, 0, 0)];
    // Symmetric noise: +X then -X then +Z then -Z, bias near zero
    const actual = [pt(0.05, 0, 0), pt(0.95, 0, 0), pt(2, 0, 0.05), pt(3, 0, -0.05)];
    const r = eng.compare({ commanded, actual });
    expect(r.dominant_axis).toBe("none");
    expect(r.out_of_tol_count).toBeGreaterThan(0);
    expect(r.recommendation).toMatch(/random noise.*CMM repeatability|vibration|chatter/);
  });

  it("empty commanded array → 0 matched points + empty-set recommendation", () => {
    const r = eng.compare({ commanded: [], actual: [pt(0, 0, 0)] });
    expect(r.points).toEqual([]);
    expect(r.max_abs_delta_mm).toBe(0);
    expect(r.recommendation).toMatch(/No matched points/);
  });

  it("empty actual array → all commanded skipped (nearest3D returns null), 0 matched points", () => {
    const r = eng.compare({ commanded: [pt(0, 0, 0)], actual: [] });
    expect(r.points).toEqual([]);
    expect(r.max_abs_delta_mm).toBe(0);
  });

  it("custom tolerance band changes pass_tol decisions", () => {
    const commanded = [pt(0, 0, 0)];
    const actual = [pt(0, 0, 0.02)]; // 0.02mm Z offset
    const rStrict = eng.compare({ commanded, actual, tolerance_mm: 0.01 });
    const rLoose = eng.compare({ commanded, actual, tolerance_mm: 0.05 });
    expect(rStrict.out_of_tol_count).toBe(1);
    expect(rLoose.out_of_tol_count).toBe(0);
  });

  it("RMS delta is the root-mean-square across all matched points", () => {
    const commanded = [pt(0, 0, 0), pt(1, 0, 0), pt(2, 0, 0)];
    const actual = [pt(0, 0, 0.01), pt(1, 0, 0.02), pt(2, 0, 0.03)];
    const r = eng.compare({ commanded, actual });
    // deltas: 0.01, 0.02, 0.03 — RMS = sqrt((0.0001 + 0.0004 + 0.0009)/3) = sqrt(0.000467) ≈ 0.02160
    expect(r.rms_delta_mm).toBeCloseTo(0.02160, 4);
  });

  it("max_abs_delta_location matches the commanded coord of the worst point", () => {
    const commanded = [pt(0, 0, 0), pt(5, 5, -3), pt(10, 10, -5)];
    const actual = [pt(0, 0, 0.01), pt(5, 5, -3.1), pt(10, 10, -4.99)]; // worst @ idx 1
    const r = eng.compare({ commanded, actual });
    expect(r.max_abs_delta_location).toEqual({ x_mm: 5, y_mm: 5, z_mm: -3 });
  });

  it("signed bias is the per-axis mean (not absolute)", () => {
    const commanded = [pt(0, 0, 0), pt(1, 0, 0), pt(2, 0, 0)];
    const actual = [pt(0.03, 0, 0), pt(1.03, 0, 0), pt(2.03, 0, 0)]; // +0.03 X each
    const r = eng.compare({ commanded, actual });
    expect(r.signed_bias_x_mm).toBeCloseTo(0.03, 4);
    expect(r.signed_bias_y_mm).toBe(0);
    expect(r.signed_bias_z_mm).toBe(0);
  });

  it("dominant_axis='none' when max bias <= tol/4 (no systematic offset)", () => {
    const commanded = [pt(0, 0, 0), pt(1, 0, 0)];
    const actual = [pt(0.003, 0, 0), pt(1.003, 0, 0)]; // bias 0.003 < tol/4 = 0.00625
    const r = eng.compare({ commanded, actual });
    expect(r.dominant_axis).toBe("none");
  });

  it("reasoning array narrates the comparison with N + tol + bias + out-of-tol counts", () => {
    const commanded = [pt(0, 0, 0), pt(1, 0, 0)];
    const actual = [pt(0, 0, 0.03), pt(1, 0, 0.03)];
    const r = eng.compare({ commanded, actual });
    expect(r.reasoning.length).toBeGreaterThan(0);
    expect(r.reasoning[0]).toMatch(/Compared 2 points.*tol ±0\.025/);
    expect(r.reasoning[1]).toMatch(/max \|Δ\|=/);
    expect(r.reasoning[2]).toMatch(/bias.*out-of-tol=2/);
  });

  it("generic feature_type with dominant axis falls through to generic axis-specific note", () => {
    const commanded = [pt(0, 0, 0), pt(1, 0, 0)];
    const actual = [pt(0, 0, 0.05), pt(1, 0, 0.05)];
    const r = eng.compare({ commanded, actual });
    expect(r.recommendation).toMatch(/generic feature.*Z-axis bias|investigate Z-axis-specific failure modes/);
  });
});
