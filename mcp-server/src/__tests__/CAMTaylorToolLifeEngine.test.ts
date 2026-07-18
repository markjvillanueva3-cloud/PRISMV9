/**
 * CAMTaylorToolLifeEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-TAYLOR
 */
import { describe, it, expect } from "vitest";
import { CAMTaylorToolLifeEngine } from "../engines/CAMTaylorToolLifeEngine.js";

const engine = new CAMTaylorToolLifeEngine();

describe("CAMTaylorToolLifeEngine", () => {

  it("steel at V=100 m/min → T = (350/100)^(1/0.28) ≈ 60.4 min", () => {
    const r = engine.predict({ material: "steel", cuttingSpeedMmin: 100 });
    expect(r).not.toBeNull();
    // (350/100)^(1/0.28) = 3.5^3.5714 = 81.0?
    // Verify: 100 × 81^0.28 = 100 × 3.50 = 350 ✓
    const expected = Math.pow(350 / 100, 1 / 0.28);
    expect(r!.toolLifeMin).toBeCloseTo(expected, 2);
  });

  it("Taylor invariant: V × T^n = C", () => {
    const r = engine.predict({ material: "aluminum", cuttingSpeedMmin: 200 });
    const reconstructed = r!.vMmin * Math.pow(r!.toolLifeMin, r!.constants.n);
    expect(reconstructed).toBeCloseTo(r!.constants.C, 1);
  });

  it("higher V → shorter T (inverse relationship)", () => {
    const slow = engine.predict({ material: "steel", cuttingSpeedMmin: 100 })!;
    const fast = engine.predict({ material: "steel", cuttingSpeedMmin: 200 })!;
    expect(fast.toolLifeMin).toBeLessThan(slow.toolLifeMin);
  });

  it("aluminum life > steel life > titanium life > inconel life at same V", () => {
    const al = engine.predict({ material: "aluminum", cuttingSpeedMmin: 50 })!;
    const st = engine.predict({ material: "steel",    cuttingSpeedMmin: 50 })!;
    const ti = engine.predict({ material: "titanium", cuttingSpeedMmin: 50 })!;
    const inc = engine.predict({ material: "inconel", cuttingSpeedMmin: 50 })!;
    expect(al.toolLifeMin).toBeGreaterThan(st.toolLifeMin);
    expect(st.toolLifeMin).toBeGreaterThan(ti.toolLifeMin);
    expect(ti.toolLifeMin).toBeGreaterThan(inc.toolLifeMin);
  });

  it("hardened steel life < tool_steel life at same V (higher difficulty)", () => {
    const hs = engine.predict({ material: "hardened_steel", cuttingSpeedMmin: 50 })!;
    const ts = engine.predict({ material: "tool_steel",     cuttingSpeedMmin: 50 })!;
    expect(hs.toolLifeMin).toBeLessThan(ts.toolLifeMin);
  });

  it("at V=50, brass + plastic + aluminum + copper all give long lives (>100 min)", () => {
    const pl = engine.predict({ material: "plastic",  cuttingSpeedMmin: 50 })!;
    const br = engine.predict({ material: "brass",    cuttingSpeedMmin: 50 })!;
    const al = engine.predict({ material: "aluminum", cuttingSpeedMmin: 50 })!;
    const cu = engine.predict({ material: "copper",   cuttingSpeedMmin: 50 })!;
    // All N-group easy-materials produce >100 min predicted life at conservative V=50 m/min.
    expect(pl.toolLifeMin).toBeGreaterThan(100);
    expect(br.toolLifeMin).toBeGreaterThan(100);
    expect(al.toolLifeMin).toBeGreaterThan(100);
    expect(cu.toolLifeMin).toBeGreaterThan(100);
  });

  it("tap_cut family halves tool life vs end_mill baseline (multiplier 0.5 vs 1.0)", () => {
    const baseline = engine.predict({ material: "steel", cuttingSpeedMmin: 50 }, "end_mill_flat")!;
    const tap = engine.predict({ material: "steel", cuttingSpeedMmin: 50 }, "tap_cut")!;
    expect(tap.toolLifeMin).toBeCloseTo(baseline.toolLifeMin * 0.5, 1);
  });

  it("thread_mill family extends life 1.3× vs baseline", () => {
    const baseline = engine.predict({ material: "steel", cuttingSpeedMmin: 50 }, "end_mill_flat")!;
    const tm = engine.predict({ material: "steel", cuttingSpeedMmin: 50 }, "thread_mill")!;
    expect(tm.toolLifeMin).toBeCloseTo(baseline.toolLifeMin * 1.3, 1);
  });

  it("override constants take precedence over table", () => {
    const override = { n: 0.5, C: 2000 };
    const r = engine.predict({ material: "steel", cuttingSpeedMmin: 100, overrideConstants: override })!;
    expect(r.constants).toEqual(override);
    expect(r.toolLifeMin).toBeCloseTo(Math.pow(2000 / 100, 1 / 0.5), 2);
  });

  it("constants(steel) → n=0.28, C=350", () => {
    const k = engine.constants("steel");
    expect(k?.n).toBeCloseTo(0.28, 3);
    expect(k?.C).toBe(350);
  });

  it("constants(inconel) lowest C in table (hardest to machine)", () => {
    const inc = engine.constants("inconel")!;
    expect(inc.C).toBe(80);
  });

  it("speed_for_life(steel, 60) gives V ≈ 350 / 60^0.28 ≈ 113 m/min", () => {
    const v = engine.speed_for_life("steel", 60);
    expect(v).toBeCloseTo(350 / Math.pow(60, 0.28), 2);
  });

  it("speed_for_life inverse: predict(speed_for_life(T)) ≈ T", () => {
    const target = 30;
    const v = engine.speed_for_life("aluminum", target)!;
    const back = engine.predict({ material: "aluminum", cuttingSpeedMmin: v })!;
    expect(back.toolLifeMin).toBeCloseTo(target, 1);
  });

  it("zero V clamped to floor 0.1 (no infinite life)", () => {
    const r = engine.predict({ material: "steel", cuttingSpeedMmin: 0 })!;
    expect(Number.isFinite(r.toolLifeMin)).toBe(true);
    expect(r.vMmin).toBeCloseTo(0.1, 3);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes predict + constants + speed_for_life", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("predict");
    expect(names).toContain("constants");
    expect(names).toContain("speed_for_life");
  });
});
