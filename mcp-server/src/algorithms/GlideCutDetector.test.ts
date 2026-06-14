import { describe, it, expect } from "vitest";
import { detect, GlideCutDetector, type GlideCutInput } from "./GlideCutDetector.js";

describe("GlideCutDetector", () => {
  it("steady-cut at baseline current → no glide, 0% boost", () => {
    const r = detect({ spark_current_A: 5, gap_voltage_V: 40, dV_dt_V_per_sec: 0 });
    expect(r.glide_detected).toBe(false);
    expect(r.recommended_power_boost_pct.value).toBe(0);
    expect(r.notes.join("|")).toContain("steady-cut");
  });
  it("low current + rising voltage → glide detected, boost recommended", () => {
    const r = detect({ spark_current_A: 0.5, gap_voltage_V: 50, dV_dt_V_per_sec: 50 });
    expect(r.glide_detected).toBe(true);
    expect(r.recommended_power_boost_pct.value).toBeGreaterThan(0);
    expect(r.confidence.value).toBeGreaterThan(0.5);
  });
  it("current drop alone → partial-glide candidate (no boost yet)", () => {
    const r = detect({ spark_current_A: 0.5, gap_voltage_V: 40, dV_dt_V_per_sec: 0 });
    expect(r.glide_detected).toBe(false);
    expect(r.notes.join("|")).toContain("current dropped");
  });
  it("voltage rise alone → partial-glide candidate (thin-wall hint)", () => {
    const r = detect({ spark_current_A: 5, gap_voltage_V: 40, dV_dt_V_per_sec: 60 });
    expect(r.glide_detected).toBe(false);
    expect(r.notes.join("|")).toContain("thin-wall");
  });
  it("custom baseline shifts detection threshold (10A baseline: 1A is glide-low, 5A is steady)", () => {
    // At baseline 10A: currentRatio at 1A = 0.10 (< 0.30 threshold = glide-current signal 0.667)
    // dV/dt=80, gap=50 → voltageRiseRatio=1.6 → signal=0.8
    // conf = 0.5·0.667 + 0.5·0.8 = 0.733 → glide=true
    const glideLow = detect({ spark_current_A: 1, gap_voltage_V: 50, dV_dt_V_per_sec: 80, baseline_cut_current_A: 10 });
    expect(glideLow.glide_detected).toBe(true);
    // At baseline 10A: 5A current = 0.50 ratio (above 0.30 threshold → no current signal)
    const steady = detect({ spark_current_A: 5, gap_voltage_V: 50, dV_dt_V_per_sec: 0, baseline_cut_current_A: 10 });
    expect(steady.glide_detected).toBe(false);
  });
  it("boost capped at 50%", () => {
    const r = detect({ spark_current_A: 0, gap_voltage_V: 60, dV_dt_V_per_sec: 200 });
    expect(r.recommended_power_boost_pct.value).toBeLessThanOrEqual(50);
  });
  it("NaN current → diagnostic", () => {
    expect(detect({ spark_current_A: NaN, gap_voltage_V: 40, dV_dt_V_per_sec: 0 }).notes.join("|")).toContain("not finite");
  });
  it("current out of range → diagnostic", () => {
    expect(detect({ spark_current_A: 100, gap_voltage_V: 40, dV_dt_V_per_sec: 0 }).notes.join("|")).toContain("outside");
  });
  it("negative voltage → diagnostic", () => {
    expect(detect({ spark_current_A: 5, gap_voltage_V: -10, dV_dt_V_per_sec: 0 }).notes.join("|")).toContain("outside");
  });
  it("missing input → diagnostic", () => {
    expect(detect(null as unknown as GlideCutInput).notes.join("|")).toContain("missing");
  });
  it("zero gap voltage → no division-by-zero crash", () => {
    const r = detect({ spark_current_A: 5, gap_voltage_V: 0, dV_dt_V_per_sec: 100 });
    expect(r.notes.length).toBeGreaterThan(0);
    expect(Number.isFinite(r.confidence.value)).toBe(true);
  });
  it("version 1.0.0", () => {
    expect(GlideCutDetector.version).toBe("1.0.0");
  });
});
