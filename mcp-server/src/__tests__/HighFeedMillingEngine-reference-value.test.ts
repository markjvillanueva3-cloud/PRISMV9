/**
 * HighFeedMillingEngine — REAL reference-value physics coverage (slot:oscar, SFC-COVERAGE)
 *
 * Prior coverage (exhaustive-science-batch7-manufacturing.test.ts) was effectively a
 * stub: `expect(r).toBeDefined()` plus GUARDED (skippable) `if (v(...) !== undefined)`
 * assertions — proves nothing per R9. This suite hand-computes the HFM chip-thinning
 * geometry + kinematics + MRR from first principles.
 *
 * HFM chip-thinning model (per engine, Sandvik CoroMill / ISCAR HELIDO HFM):
 *   kappa (approach angle) = arcsin(min(ap/R, 1))
 *   chip_thinning_factor   = sin(kappa) = ap/R   (exact, for ap<=R)
 *   programmed_fz          = target_hex / chip_thinning_factor
 *   axial_force_ratio      = cos(kappa) = sqrt(1 - (ap/R)^2)
 *   rpm                    = vc*1000 / (pi*Dc)
 *   table_feed             = programmed_fz * z * rpm
 *   mrr (cm^3/min)         = ae * ap * table_feed / 1000
 *
 * Reference case: Dc=50, R=2.0, ap=1.0, ae=30, z=4, ISO P
 *   kappa   = arcsin(0.5) = 30deg;  chip_thinning_factor = 0.5
 *   fz      = 0.10 / 0.5 = 0.2 mm/tooth   (target_hex[P] = 0.10, engine output)
 *   rpm     = 200*1000/(pi*50) = 1273.24 -> 1273   (vc[P]=200 m/min, engine output)
 *   feed    = 0.2*4*1273.24 = 1018.59 -> 1019 mm/min
 *   mrr     = 30*1.0*1018.59/1000 = 30.56 cm^3/min
 *   axialR  = cos(30deg) = 0.8660 -> 0.87
 *
 * NOTE (constants-provenance finding, reported to physics-reviewer — NOT edited here):
 * this engine INLINES its kc1 / speed / target-hex tables (KC1, HFM_SPEEDS, TARGET_HEX)
 * instead of importing CANONICAL_KIENZLE from constants.ts. Assertions below therefore
 * read the engine's own reported vc/hex from the output rather than inlining them.
 */
import { describe, it, expect } from "vitest";
import { HighFeedMillingEngine, highFeedMillingEngine } from "../engines/HighFeedMillingEngine.js";

const engine = new HighFeedMillingEngine();

describe("HighFeedMillingEngine — reference-value physics", () => {
  const base = {
    tool_diameter_mm: 50,
    num_inserts: 4,
    insert_nose_radius_mm: 2.0,
    axial_depth_mm: 1.0,
    radial_width_mm: 30,
    material_iso_group: "P" as const,
  };

  it("chip-thinning factor = sin(arcsin(ap/R)) = ap/R = 0.5", () => {
    const r = engine.calculate(base);
    expect(r.chip_thinning_factor.value).toBe(0.5); // 1.0 / 2.0
    // exact geometry invariant: factor == ap/R
    expect(r.chip_thinning_factor.value).toBeCloseTo(
      base.axial_depth_mm / base.insert_nose_radius_mm, 6);
  });

  it("programmed fz = target_hex / chip_thinning_factor = 0.2 mm/tooth", () => {
    const r = engine.calculate(base);
    expect(r.programmed_fz.value).toBe(0.2);
    // invariant tying the three fields: actual_hex = fz * chip_thinning_factor
    expect(r.programmed_fz.value * r.chip_thinning_factor.value)
      .toBeCloseTo(r.actual_hex.value, 6);
  });

  it("spindle rpm = vc*1000/(pi*Dc) = 1273 (from engine-reported vc)", () => {
    const r = engine.calculate(base);
    expect(r.spindle_rpm.value).toBe(1273);
    const expectedRpm = (r.cutting_speed.value * 1000) / (Math.PI * base.tool_diameter_mm);
    expect(r.spindle_rpm.value).toBe(Math.round(expectedRpm));
  });

  it("table feed = fz*z*rpm = 1019 mm/min and MRR = 30.56 cm^3/min", () => {
    const r = engine.calculate(base);
    expect(r.table_feed.value).toBe(1019);
    expect(r.mrr.value).toBe(30.56);
    // MRR invariant against reported feed (rounding-tolerant)
    const mrrInv = (base.radial_width_mm * base.axial_depth_mm * r.table_feed.value) / 1000;
    expect(r.mrr.value).toBeCloseTo(mrrInv, 1);
  });

  it("axial force ratio = cos(arcsin(ap/R)) = sqrt(1-(ap/R)^2) = 0.87", () => {
    const r = engine.calculate(base);
    expect(r.axial_force_ratio.value).toBe(0.87);
    const expectedRatio = Math.sqrt(1 - Math.pow(base.axial_depth_mm / base.insert_nose_radius_mm, 2));
    expect(r.axial_force_ratio.value).toBeCloseTo(expectedRatio, 2);
  });

  it("power scales linearly with MRR (P = kc*MRR/(60M*eta))", () => {
    const r1 = engine.calculate(base);
    const r2 = engine.calculate({ ...base, radial_width_mm: 60 }); // double ae => double MRR
    expect(r2.mrr.value / r1.mrr.value).toBeCloseTo(2, 2);
    expect(r2.power_required.value / r1.power_required.value).toBeCloseTo(2, 2);
    expect(r1.power_required.value).toBeCloseTo(1.4, 1); // 2200*30557.7/(48e6)
  });

  // ── Defaulting behaviour ──
  it("fills defaults: z=round(Dc/12)=4, R=2.5 (Dc>32), ap=min(0.8R,1.5)=1.5, ae=0.6Dc", () => {
    const r = engine.calculate({ tool_diameter_mm: 50, material_iso_group: "P" });
    expect(r.axial_depth.value).toBe(1.5);       // min(2.5*0.8, 1.5)
    expect(r.radial_width.value).toBe(30);        // 50*0.6
    expect(r.chip_thinning_factor.value).toBe(0.6); // ap/R = 1.5/2.5
    expect(r.programmed_fz.value).toBe(0.167);    // 0.10/0.6
    expect(r.spindle_rpm.value).toBe(1273);
    expect(r.axial_force_ratio.value).toBe(0.8);  // cos(arcsin(0.6))
  });

  // ── Failure modes / warnings ──
  it("FAILURE: ap exceeds nose radius => two geometry warnings + axial ratio -> 0", () => {
    const r = engine.calculate({ ...base, insert_nose_radius_mm: 1.0, axial_depth_mm: 1.5 });
    // ap(1.5) > maxAp(0.8) AND ap(1.5) > R(1.0)
    expect(r.warnings.some(w => w.includes("exceeds recommended max"))).toBe(true);
    expect(r.warnings.some(w => w.includes("exceeds nose radius"))).toBe(true);
    // kappa clamps to arcsin(1)=pi/2 => cos=0
    expect(r.chip_thinning_factor.value).toBe(1);
    expect(r.axial_force_ratio.value).toBe(0);
  });

  it("FAILURE: near-full radial engagement warning (ae > 0.9*Dc)", () => {
    const r = engine.calculate({ ...base, radial_width_mm: 46 }); // > 45
    expect(r.warnings.some(w => w.includes("Near-full radial engagement"))).toBe(true);
  });

  it("FAILURE: shallow depth stays true HFM (no warnings for a nominal cut)", () => {
    const r = engine.calculate(base);
    expect(r.warnings).toEqual([]);
  });

  // ── Adversarial inputs ──
  it("ADVERSARIAL: unknown ISO group falls back gracefully (no throw, vc=200)", () => {
    const r = engine.calculate({ ...base, material_iso_group: "Z" as unknown as "P" });
    expect(r.cutting_speed.value).toBe(200); // HFM_SPEEDS[iso] ?? 200
    expect(r.actual_hex.value).toBe(0.1);    // TARGET_HEX[iso] ?? 0.10
  });

  it("ADVERSARIAL: zero tool diameter => Infinity rpm/feed/mrr (unguarded div-by-zero)", () => {
    const r = engine.calculate({ ...base, tool_diameter_mm: 0 });
    expect(r.spindle_rpm.value).toBe(Infinity);
    expect(r.mrr.value).toBe(Infinity);
  });

  it("ADVERSARIAL: NaN axial depth => factor guard forces 1, MRR NaN", () => {
    const r = engine.calculate({ ...base, axial_depth_mm: NaN });
    // sinKappa > 0 is false for NaN => chip_thinning_factor forced to 1
    expect(r.chip_thinning_factor.value).toBe(1);
    expect(Number.isNaN(r.mrr.value)).toBe(true);
  });

  it("ADVERSARIAL: negative axial depth accepted, produces negative MRR (no input guard)", () => {
    const r = engine.calculate({ ...base, axial_depth_mm: -1.0 });
    expect(r.mrr.value).toBeLessThan(0);
  });

  it("exports a shared singleton with identical behaviour", () => {
    const a = engine.calculate(base).mrr.value;
    const b = highFeedMillingEngine.calculate(base).mrr.value;
    expect(a).toBe(b);
  });
});
