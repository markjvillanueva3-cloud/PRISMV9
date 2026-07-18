/**
 * CAMKienzleForceEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-KIENZLE
 */
import { describe, it, expect } from "vitest";
import { CAMKienzleForceEngine } from "../engines/CAMKienzleForceEngine.js";

const engine = new CAMKienzleForceEngine();

describe("CAMKienzleForceEngine", () => {

  it("steel: kc(h=0.2 mm) ≈ 1800 × 0.2^(-0.25) = 2691 N/mm^2", () => {
    const kc = engine.kc_only("steel", 0.2);
    // kc1.1 = 1800, mc = 0.25, h = 0.2
    // kc = 1800 × 0.2^(-0.25) = 1800 × 1.4953 = 2691.5
    expect(kc).toBeCloseTo(1800 * Math.pow(0.2, -0.25), 1);
    expect(kc).toBeCloseTo(2691.5, 0);
  });

  it("aluminum kc << steel kc at same chip thickness", () => {
    const al = engine.kc_only("aluminum", 0.2)!;
    const st = engine.kc_only("steel", 0.2)!;
    expect(al).toBeLessThan(st);
    // Aluminum kc1.1 = 700, so kc ≈ 700 × 0.2^(-0.25) ≈ 1047
    expect(al).toBeCloseTo(700 * Math.pow(0.2, -0.25), 1);
  });

  it("kc monotonically decreases with h (chip-size effect)", () => {
    const thin   = engine.kc_only("steel", 0.05)!;
    const medium = engine.kc_only("steel", 0.20)!;
    const thick  = engine.kc_only("steel", 0.50)!;
    expect(thin).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(thick);
  });

  it("compute returns full result for valid input", () => {
    const r = engine.compute({
      material: "steel",
      hMm: 0.2,
      bMm: 5,
      toolDiameterMm: 20,
      spindleRpm: 1000,
      fluteCount: 4,
    });
    expect(r).not.toBeNull();
    expect(r!.kcNMm2).toBeCloseTo(2691.5, 0);
    // Fc per tooth = kc × A = 2691.5 × (0.2 × 5) = 2691.5 N
    expect(r!.fcN).toBeCloseTo(2691.5 * 0.2 * 5, 0);
    expect(r!.kc11NMm2).toBe(1800);
    expect(r!.mc).toBeCloseTo(0.25, 3);
  });

  it("torque = Fc × tool-radius (m)", () => {
    const r = engine.compute({
      material: "steel",
      hMm: 0.2,
      bMm: 5,
      toolDiameterMm: 20, // r = 0.010 m
      spindleRpm: 1000,
      fluteCount: 2, // teethEngaged = max(1, 2/2) = 1 → fcTotalN = fcN
    })!;
    const rM = 0.010;
    expect(r.torqueNm).toBeCloseTo(r.fcTotalN * rM, 3);
  });

  it("spindle power = M × ω / 1000 (kW)", () => {
    const r = engine.compute({
      material: "steel",
      hMm: 0.2,
      bMm: 5,
      toolDiameterMm: 20,
      spindleRpm: 1000,
      fluteCount: 2,
    })!;
    const omega = 1000 * 2 * Math.PI / 60;
    expect(r.spindlePowerKW).toBeCloseTo(r.torqueNm * omega / 1000, 3);
  });

  it("4-flute cutter gets teethEngaged=2 (floor(flute/2)), bumps fcTotal", () => {
    const r2 = engine.compute({ material: "steel", hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 1000, fluteCount: 2 })!;
    const r4 = engine.compute({ material: "steel", hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 1000, fluteCount: 4 })!;
    expect(r4.fcTotalN).toBeCloseTo(2 * r2.fcTotalN, 1);
  });

  it("larger tool → higher torque at same fcTotal", () => {
    const small = engine.compute({ material: "steel", hMm: 0.2, bMm: 5, toolDiameterMm: 10, spindleRpm: 1000, fluteCount: 2 })!;
    const big   = engine.compute({ material: "steel", hMm: 0.2, bMm: 5, toolDiameterMm: 50, spindleRpm: 1000, fluteCount: 2 })!;
    expect(big.torqueNm).toBeGreaterThan(small.torqueNm);
    // r is 5× larger
    expect(big.torqueNm).toBeCloseTo(small.torqueNm * 5, 1);
  });

  it("higher rpm → higher spindle power at same torque", () => {
    const slow = engine.compute({ material: "steel", hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 500,  fluteCount: 2 })!;
    const fast = engine.compute({ material: "steel", hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 5000, fluteCount: 2 })!;
    expect(fast.spindlePowerKW).toBeGreaterThan(slow.spindlePowerKW);
    // power scales linearly with rpm
    expect(fast.spindlePowerKW).toBeCloseTo(slow.spindlePowerKW * 10, 2);
  });

  it("titanium fc > steel fc at same geometry (kc1.1 2800 > 1800)", () => {
    const ti = engine.compute({ material: "titanium", hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 1000 })!;
    const st = engine.compute({ material: "steel",    hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 1000 })!;
    expect(ti.fcN).toBeGreaterThan(st.fcN);
  });

  it("inconel power > titanium power (kc1.1 3000 > 2800)", () => {
    const inc = engine.compute({ material: "inconel",  hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 1000 })!;
    const ti  = engine.compute({ material: "titanium", hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 1000 })!;
    expect(inc.spindlePowerKW).toBeGreaterThan(ti.spindlePowerKW);
  });

  it("compute unknown material → null (no fabrication)", () => {
    // @ts-expect-error — intentional bad id
    expect(engine.compute({ material: "kryptonite", hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 1000 })).toBeNull();
  });

  it("zero chip thickness clamped to floor 0.001 (chip-size physics)", () => {
    const r = engine.compute({ material: "steel", hMm: 0, bMm: 5, toolDiameterMm: 20, spindleRpm: 1000 })!;
    expect(Number.isFinite(r.kcNMm2)).toBe(true);
    expect(r.kcNMm2).toBeGreaterThan(0);
  });

  it("zero rpm clamped (no div-by-zero on power)", () => {
    const r = engine.compute({ material: "steel", hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 0 })!;
    expect(Number.isFinite(r.spindlePowerKW)).toBe(true);
  });

  it("power_only returns same kW as compute().spindlePowerKW", () => {
    const inputs = { material: "steel" as const, hMm: 0.2, bMm: 5, toolDiameterMm: 20, spindleRpm: 1000, fluteCount: 4 };
    expect(engine.power_only(inputs)).toBe(engine.compute(inputs)!.spindlePowerKW);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes compute + kc_only + power_only", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("compute");
    expect(names).toContain("kc_only");
    expect(names).toContain("power_only");
  });
});
