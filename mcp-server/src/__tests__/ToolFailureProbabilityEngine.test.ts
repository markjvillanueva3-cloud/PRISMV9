// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  ToolFailureProbabilityEngine,
  toolFailureProbabilityEngine,
  type ToolFailureProbabilityInput,
} from "../engines/ToolFailureProbabilityEngine.js";
import {
  CANONICAL_TAYLOR,
  extendedTaylorExponents,
  extendedTaylorLife,
} from "../physics/constants.js";
import { importanceSamplingReliabilityEngine } from "../engines/ImportanceSamplingReliabilityEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE VALUES — hand-derived from the EXACT log-linear FORM closed form.
//
// The failure boundary  life(Vc,f) = L_req  is a HYPERPLANE in log-space because
//   ln life = (1/n)·[ ln C − ln Vc − a·ln f − b·ln d ]  is LINEAR in (ln Vc, ln f).
// Hence FORM is exact and  p_f = Φ(−β)  with
//   D    = ln C − b·ln d − n·ln L_req − a·ln f0 − ln Vc0
//   β    = D / sqrt( [Vc random]·ζ_Vc²  +  [f random]·a²·ζ_f² )
//   ζ_j  = sqrt( ln(1 + CoV_j²) )                                   (lognormal)
//
// Worked numeric anchor (material P: C=350, n=0.25, a=0.30, b=0.20;
//   Vc0=200 m/min, f0=0.2 mm/rev, d=2.0 mm):
//   nominal life = (350/(200·0.2^0.30·2^0.20))^4 ≈ 37.18 min
//   L_req=15, CoV_Vc=0.10 (ζ=0.0997513) →  D≈0.226806, β≈2.2737, p_f≈0.01149
//   L_req=nominal → β=0, p_f=0.5 (boundary through the mean)
//   L_req=45 (>nominal) → D<0, β≈−0.4797, p_f≈0.684
//   design point Vc* = exp(u*) satisfies life(Vc*, f0) = L_req exactly (≈250.9 m/min).
// These are recomputed from the imported canonical constants below (not magic
// numbers), so the reference tracks the constants file if it is ever re-fit.
// ─────────────────────────────────────────────────────────────────────────────

const P = CANONICAL_TAYLOR.P; // { C: 350, n: 0.25 }
const PE = extendedTaylorExponents("P"); // { a: 0.30, b: 0.20 }
const nrm = importanceSamplingReliabilityEngine;

/** Exact FORM reliability index for the log-linear tool-life limit state. */
function closedFormBeta(p: {
  Vc0: number; f0: number; d0: number; Lreq: number;
  C: number; n: number; a: number; b: number; covVc: number; covF: number;
}): number {
  const zeta0 = p.covVc > 0 ? Math.sqrt(Math.log(1 + p.covVc * p.covVc)) : 0;
  const zeta1 = p.covF > 0 ? Math.sqrt(Math.log(1 + p.covF * p.covF)) : 0;
  const D =
    Math.log(p.C) - p.b * Math.log(p.d0) - p.n * Math.log(p.Lreq) -
    p.a * Math.log(p.f0) - Math.log(p.Vc0);
  const denom = Math.sqrt(
    (p.covVc > 0 ? zeta0 * zeta0 : 0) + (p.covF > 0 ? p.a * p.a * zeta1 * zeta1 : 0),
  );
  return D / denom;
}

const BASE: Omit<ToolFailureProbabilityInput, "required_life_min"> = {
  cutting_speed_m_min: 200,
  feed_mm_rev: 0.2,
  depth_of_cut_mm: 2.0,
  iso_group: "P",
  cov_cutting_speed: 0.1,
  cov_feed: 0,
  seed: 12345,
};

const NOMINAL_LIFE = extendedTaylorLife(200, 0.2, 2.0, P.n, P.C, PE.a, PE.b);

describe("ToolFailureProbabilityEngine", () => {
  const eng = toolFailureProbabilityEngine;

  // ── Structural wiring ──────────────────────────────────────────────────────
  it("1. exports a class-instance singleton", () => {
    expect(eng).toBeInstanceOf(ToolFailureProbabilityEngine);
  });

  it("2. resolves canonical Taylor + extended exponents for the ISO group (no inlined constants)", () => {
    const r = eng.estimateToolFailureProbability({ ...BASE, required_life_min: 15 });
    expect(r.isoGroup).toBe("P");
    expect(r.taylor.C).toBe(P.C); // 350 from CANONICAL_TAYLOR
    expect(r.taylor.n).toBe(P.n);
    expect(r.taylor.a).toBe(PE.a);
    expect(r.taylor.b).toBe(PE.b);
    // nominal life matches the canonical extended-Taylor law
    expect(r.nominalLife_min).toBeCloseTo(NOMINAL_LIFE, 6);
    expect(r.nominalLife_min).toBeGreaterThan(35); // ≈ 37.18 min sanity
  });

  // ── HAPPY: generous margin → low p_f, matching the exact FORM closed form ───
  it("3. generous margin (L_req=15 « nominal 37 min) → low p_f matching Φ(−β)", () => {
    const r = eng.estimateToolFailureProbability({ ...BASE, required_life_min: 15 });
    const beta = closedFormBeta({ Vc0: 200, f0: 0.2, d0: 2.0, Lreq: 15, C: P.C, n: P.n, a: PE.a, b: PE.b, covVc: 0.1, covF: 0 });
    const pfExact = nrm.standardNormalTail(beta); // ≈ 0.01149
    expect(pfExact).toBeGreaterThan(0.008);
    expect(pfExact).toBeLessThan(0.02);
    // importance-sampling estimate recovers the closed form
    expect(r.failureProbability).toBeGreaterThan(0);
    expect(Math.abs(r.failureProbability - pfExact) / pfExact).toBeLessThan(0.15);
    // FORM design-point β is deterministic (not sampled) → tight
    expect(r.formReliabilityIndex).toBeCloseTo(beta, 2);
    // generalised β = −Φ⁻¹(p_f) tracks the same value
    expect(Math.abs(r.reliabilityIndexBeta - beta)).toBeLessThan(0.15);
    // uncertainty (std error) is reported and positive
    expect(r.failureProbabilityUncertainty).toBeGreaterThan(0);
    expect(r.randomVariables).toEqual(["cutting_speed_m_min"]);
  });

  // ── FAILURE MODE 1: required == nominal life → boundary through mean → p_f≈0.5
  it("4. at-required-life with high variance → p_f ≈ 0.5, β ≈ 0", () => {
    const r = eng.estimateToolFailureProbability({
      ...BASE,
      required_life_min: NOMINAL_LIFE,
      cov_cutting_speed: 0.15, // high scatter
    });
    expect(r.failureProbability).toBeGreaterThan(0.4);
    expect(r.failureProbability).toBeLessThan(0.6);
    expect(Math.abs(r.formReliabilityIndex)).toBeLessThan(0.05);
    expect(Math.abs(r.reliabilityIndexBeta)).toBeLessThan(0.15);
  });

  // ── FAILURE MODE 2: required > nominal life → mostly fails → high p_f, β<0 ──
  it("5. required life above what the tool can achieve → p_f > 0.5 and β < 0", () => {
    const r = eng.estimateToolFailureProbability({ ...BASE, required_life_min: 45 });
    const beta = closedFormBeta({ Vc0: 200, f0: 0.2, d0: 2.0, Lreq: 45, C: P.C, n: P.n, a: PE.a, b: PE.b, covVc: 0.1, covF: 0 });
    const pfExact = nrm.standardNormalTail(beta); // ≈ 0.684
    expect(beta).toBeLessThan(0);
    expect(r.failureProbability).toBeGreaterThan(0.5);
    expect(r.reliabilityIndexBeta).toBeLessThan(0);
    expect(Math.abs(r.failureProbability - pfExact) / pfExact).toBeLessThan(0.1);
    expect(r.lifeMargin_min).toBeLessThan(0); // 37 − 45 < 0
  });

  // ── FAILURE MODE 3: monotonicity — less margin (↑required) → ↑ p_f ─────────
  it("6. p_f is strictly increasing as required life rises (margin shrinks)", () => {
    const reqs = [12, 18, 24, 30];
    const pfs = reqs.map(
      (Lreq) =>
        eng.estimateToolFailureProbability({
          ...BASE, required_life_min: Lreq, cov_cutting_speed: 0.12,
        }).failureProbability,
    );
    for (let i = 1; i < pfs.length; i++) {
      expect(pfs[i]).toBeGreaterThan(pfs[i - 1]);
    }
    // FORM β must move the opposite way (safety index falls as margin falls)
    const betas = reqs.map(
      (Lreq) =>
        eng.estimateToolFailureProbability({
          ...BASE, required_life_min: Lreq, cov_cutting_speed: 0.12,
        }).formReliabilityIndex,
    );
    for (let i = 1; i < betas.length; i++) {
      expect(betas[i]).toBeLessThan(betas[i - 1]);
    }
  });

  // ── INVARIANT: more scatter → higher p_f at a fixed safe margin ────────────
  it("7. p_f is strictly increasing in the cutting-speed CoV at fixed safe margin", () => {
    const covs = [0.05, 0.1, 0.2];
    const pfs = covs.map(
      (c) =>
        eng.estimateToolFailureProbability({
          ...BASE, required_life_min: 15, cov_cutting_speed: c,
        }).failureProbability,
    );
    for (let i = 1; i < pfs.length; i++) {
      expect(pfs[i]).toBeGreaterThan(pfs[i - 1]);
    }
  });

  // ── PHYSICS: the design point lies ON the life = L_req surface ─────────────
  it("8. reported design point (Vc*) is the on-surface MPP: life(Vc*, f0) = L_req", () => {
    const r = eng.estimateToolFailureProbability({ ...BASE, required_life_min: 15 });
    expect(r.designPointFound).toBe(true);
    // failure happens at HIGHER speed (shorter life) than nominal
    expect(r.designPoint.cutting_speed_m_min).toBeGreaterThan(200);
    const lifeAtDp = extendedTaylorLife(
      r.designPoint.cutting_speed_m_min, r.designPoint.feed_mm_rev, 2.0, P.n, P.C, PE.a, PE.b,
    );
    expect(lifeAtDp).toBeCloseTo(15, 1); // on the limit-state surface within ~0.1 min
  });

  // ── 2-D: both Vc and f lognormal, still exact vs the closed form ───────────
  it("9. two random variables (Vc & f lognormal) recover the exact 2-D FORM p_f", () => {
    const r = eng.estimateToolFailureProbability({
      ...BASE, required_life_min: 15, cov_cutting_speed: 0.1, cov_feed: 0.08,
    });
    const beta = closedFormBeta({ Vc0: 200, f0: 0.2, d0: 2.0, Lreq: 15, C: P.C, n: P.n, a: PE.a, b: PE.b, covVc: 0.1, covF: 0.08 });
    const pfExact = nrm.standardNormalTail(beta);
    expect(r.randomVariables).toEqual(["cutting_speed_m_min", "feed_mm_rev"]);
    expect(r.formReliabilityIndex).toBeCloseTo(beta, 2);
    expect(Math.abs(r.failureProbability - pfExact) / pfExact).toBeLessThan(0.15);
    // 2-D design point on the surface
    const lifeAtDp = extendedTaylorLife(
      r.designPoint.cutting_speed_m_min, r.designPoint.feed_mm_rev, 2.0, P.n, P.C, PE.a, PE.b,
    );
    expect(lifeAtDp).toBeCloseTo(15, 0);
  });

  // ── EDGE: deterministic (all CoV=0) → 0/1 step probability, no sampling ────
  it("10. deterministic case (CoV=0): p_f=0 when safe, p_f=1 when required exceeds nominal", () => {
    const safe = eng.estimateToolFailureProbability({
      ...BASE, required_life_min: 15, cov_cutting_speed: 0, cov_feed: 0,
    });
    expect(safe.failureProbability).toBe(0);
    expect(safe.reliabilityIndexBeta).toBe(Infinity);
    expect(safe.nSamples).toBe(0);
    expect(safe.randomVariables).toEqual([]);

    const unsafe = eng.estimateToolFailureProbability({
      ...BASE, required_life_min: 50, cov_cutting_speed: 0, cov_feed: 0,
    });
    expect(unsafe.failureProbability).toBe(1);
    expect(unsafe.reliabilityIndexBeta).toBe(-Infinity);
  });

  // ── Material resolution across ISO groups (canonical, not inlined) ─────────
  it("11. material key resolves the correct ISO group and Taylor constants", () => {
    const steel = eng.estimateToolFailureProbability({
      cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2.0,
      required_life_min: 15, material: "4140", cov_cutting_speed: 0.1, cov_feed: 0,
    });
    expect(steel.isoGroup).toBe("P");
    expect(steel.taylor.C).toBe(CANONICAL_TAYLOR.P.C);

    const ti = eng.estimateToolFailureProbability({
      cutting_speed_m_min: 60, feed_mm_rev: 0.1, depth_of_cut_mm: 1.0,
      required_life_min: 10, material: "Ti-6Al-4V", cov_cutting_speed: 0.1, cov_feed: 0,
    });
    expect(ti.isoGroup).toBe("S");
    expect(ti.taylor.C).toBe(CANONICAL_TAYLOR.S.C); // 150, superalloy
    expect(ti.taylor.n).toBe(CANONICAL_TAYLOR.S.n);
  });

  // ── ADVERSARIAL 1: required_life = 0 → throw (invalid physics, fail loud) ──
  it("12. required_life_min = 0 throws (a required life must be positive)", () => {
    expect(() =>
      eng.estimateToolFailureProbability({ ...BASE, required_life_min: 0 }),
    ).toThrow(/required_life_min/);
  });

  // ── ADVERSARIAL 2: required_life = NaN → throw ─────────────────────────────
  it("13. required_life_min = NaN throws", () => {
    expect(() =>
      eng.estimateToolFailureProbability({ ...BASE, required_life_min: NaN }),
    ).toThrow(/required_life_min/);
  });

  // ── ADVERSARIAL 3: negative geometry / negative CoV → throw ────────────────
  it("14. negative cutting speed and negative CoV each throw", () => {
    expect(() =>
      eng.estimateToolFailureProbability({ ...BASE, cutting_speed_m_min: -200, required_life_min: 15 }),
    ).toThrow(/cutting_speed_m_min/);
    expect(() =>
      eng.estimateToolFailureProbability({ ...BASE, required_life_min: 15, cov_cutting_speed: -0.1 }),
    ).toThrow(/cov_cutting_speed/);
  });

  // ── ADVERSARIAL 4: unknown material / no material spec → throw ─────────────
  it("15. unknown material and missing material/iso_group each throw", () => {
    expect(() =>
      eng.estimateToolFailureProbability({
        cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2.0,
        required_life_min: 15, material: "unobtanium-9000",
      }),
    ).toThrow(/unknown material/);
    expect(() =>
      eng.estimateToolFailureProbability({
        cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2.0,
        required_life_min: 15,
      }),
    ).toThrow(/material.*iso_group|iso_group|taylor_C/);
  });
});
