/**
 * CAMFeedrateChiploadEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-FEEDRATE
 */
import { describe, it, expect } from "vitest";
import { CAMFeedrateChiploadEngine } from "../engines/CAMFeedrateChiploadEngine.js";

const engine = new CAMFeedrateChiploadEngine();

describe("CAMFeedrateChiploadEngine", () => {

  it("rpm = (1000 × cuttingSpeed) / (π × dia)", () => {
    // 100 m/min, dia 10 mm → rpm = 100000 / (π × 10) ≈ 3183
    const r = engine.compute({
      cuttingSpeedMmin: 100,
      toolDiameterMm: 10,
      fluteCount: 4,
      chiploadMmTooth: 0.05,
    });
    expect(r.spindleRpm).toBeCloseTo(100000 / (Math.PI * 10), 1);
    expect(r.spindleRpm).toBeCloseTo(3183.1, 0);
  });

  it("feedrate = chipload × flutes × rpm", () => {
    const r = engine.compute({
      cuttingSpeedMmin: 100,
      toolDiameterMm: 10,
      fluteCount: 4,
      chiploadMmTooth: 0.05,
    });
    expect(r.feedrateMmMin).toBeCloseTo(0.05 * 4 * r.spindleRpm, 2);
  });

  it("smaller diameter → higher rpm at same surface speed", () => {
    const small = engine.compute({ cuttingSpeedMmin: 100, toolDiameterMm: 5,  fluteCount: 2, chiploadMmTooth: 0.05 });
    const big   = engine.compute({ cuttingSpeedMmin: 100, toolDiameterMm: 20, fluteCount: 2, chiploadMmTooth: 0.05 });
    expect(small.spindleRpm).toBeGreaterThan(big.spindleRpm);
    expect(small.spindleRpm).toBeCloseTo(big.spindleRpm * 4, 1);
  });

  it("more flutes → higher feedrate at same rpm", () => {
    const two = engine.compute({ cuttingSpeedMmin: 100, toolDiameterMm: 10, fluteCount: 2, chiploadMmTooth: 0.05 });
    const four = engine.compute({ cuttingSpeedMmin: 100, toolDiameterMm: 10, fluteCount: 4, chiploadMmTooth: 0.05 });
    expect(four.feedrateMmMin).toBeCloseTo(two.feedrateMmMin * 2, 1);
  });

  it("aluminum end_mill_flat recommended: 300 m/min, 0.08 mm/tooth", () => {
    const r = engine.recommended("aluminum", "end_mill_flat");
    expect(r?.cuttingSpeedMmin).toBe(300);
    expect(r?.chiploadMmTooth).toBeCloseTo(0.08, 3);
  });

  it("steel face_mill recommended: 200 m/min, 0.15 mm/tooth", () => {
    const r = engine.recommended("steel", "face_mill");
    expect(r?.cuttingSpeedMmin).toBe(200);
    expect(r?.chiploadMmTooth).toBeCloseTo(0.15, 3);
  });

  it("titanium drill_twist recommended: 10 m/min, 0.03 mm/tooth (conservative for Ti)", () => {
    const r = engine.recommended("titanium", "drill_twist");
    expect(r?.cuttingSpeedMmin).toBe(10);
    expect(r?.chiploadMmTooth).toBeCloseTo(0.03, 3);
  });

  it("inconel end_mill_flat recommended slower than titanium (kc1.1 3000 vs 2800)", () => {
    const inc = engine.recommended("inconel", "end_mill_flat")!;
    const ti  = engine.recommended("titanium", "end_mill_flat")!;
    expect(inc.cuttingSpeedMmin).toBeLessThan(ti.cuttingSpeedMmin);
    expect(inc.chiploadMmTooth).toBeLessThan(ti.chiploadMmTooth);
  });

  it("aluminum is the fastest material (highest cuttingSpeed)", () => {
    const al = engine.recommended("aluminum", "end_mill_flat")!;
    const st = engine.recommended("steel", "end_mill_flat")!;
    const ti = engine.recommended("titanium", "end_mill_flat")!;
    expect(al.cuttingSpeedMmin).toBeGreaterThan(st.cuttingSpeedMmin);
    expect(st.cuttingSpeedMmin).toBeGreaterThan(ti.cuttingSpeedMmin);
  });

  it("unsupported material/tool combo returns null (no fabrication)", () => {
    // composite + face_mill not in table
    expect(engine.recommended("composite", "face_mill")).toBeNull();
  });

  it("compute_recommended chains lookup + math", () => {
    const r = engine.compute_recommended("aluminum", "end_mill_flat", 10, 4);
    expect(r).not.toBeNull();
    // 300 m/min / (π × 10) × 1000 ≈ 9549 rpm
    expect(r!.spindleRpm).toBeCloseTo(9549.3, 0);
    // 0.08 × 4 × 9549 ≈ 3055 mm/min
    expect(r!.feedrateMmMin).toBeCloseTo(0.08 * 4 * r!.spindleRpm, 1);
    expect(r!.source).toBe("table");
  });

  it("compute_recommended returns null for missing combo", () => {
    expect(engine.compute_recommended("composite", "face_mill", 10, 4)).toBeNull();
  });

  it("zero diameter clamped to floor 0.1 mm (avoids div-by-zero)", () => {
    const r = engine.compute({ cuttingSpeedMmin: 100, toolDiameterMm: 0, fluteCount: 4, chiploadMmTooth: 0.05 });
    expect(Number.isFinite(r.spindleRpm)).toBe(true);
    expect(r.spindleRpm).toBeGreaterThan(0);
  });

  it("zero flute count clamped to 1 (single-edge tool)", () => {
    const r = engine.compute({ cuttingSpeedMmin: 100, toolDiameterMm: 10, fluteCount: 0, chiploadMmTooth: 0.05 });
    expect(Number.isFinite(r.feedrateMmMin)).toBe(true);
  });

  it("zero chipload clamped, feedrate hits FEED_MIN=1 mm/min floor", () => {
    const r = engine.compute({ cuttingSpeedMmin: 100, toolDiameterMm: 10, fluteCount: 4, chiploadMmTooth: 0 });
    expect(r.feedrateMmMin).toBe(1);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes compute + recommended + compute_recommended", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("compute");
    expect(names).toContain("recommended");
    expect(names).toContain("compute_recommended");
  });
});
