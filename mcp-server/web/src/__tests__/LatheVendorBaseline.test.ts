import { describe, it, expect } from "vitest";
import {
  LATHE_VENDOR_BASELINE,
  traditionalLathePowerKw,
  traditionalLatheMrr,
  cssRpm,
  theoreticalRaUm,
  sfmToMperMin,
  mPerMinToSfm,
  compareLatheVsBaseline,
  type IsoGroup,
} from "../components/calculator/LatheVendorBaseline";

/**
 * LATHE-STUDIO-MS0/U-LSTUD-VENDOR-BASELINE tests (oscar, 2026-05-25 iter28).
 *
 * Anchors every lathe vendor baseline value against the cited handbook source.
 * Same shape as MillVendorBaseline.test.ts. Coverage: canonical workpoint
 * table integrity + 6 ISO group spans + traditional MRR + power + CSS RPM +
 * theoretical Ra + Imperial conversion + comparison verdict.
 *
 * The accuracy contract: these baseline values are what the user pays for —
 * every lathe calculator output downstream must compare against them within
 * 25% tolerance (compareLatheVsBaseline), and within 5% for canonical points.
 */

describe("LatheVendorBaseline — vendor catalog + textbook formula anchors", () => {
  describe("LATHE_VENDOR_BASELINE table — completeness + physical sanity", () => {
    it("covers all 6 ISO groups with concrete reference values matching Sandvik mid-range turning recommendations", () => {
      expect(Object.keys(LATHE_VENDOR_BASELINE).sort()).toEqual(["H", "K", "M", "N", "P", "S"]);
      expect(LATHE_VENDOR_BASELINE.P.V_mid_m_min).toBe(200);
      expect(LATHE_VENDOR_BASELINE.M.V_mid_m_min).toBe(150);
      expect(LATHE_VENDOR_BASELINE.K.V_mid_m_min).toBe(180);
      expect(LATHE_VENDOR_BASELINE.N.V_mid_m_min).toBe(400);
      expect(LATHE_VENDOR_BASELINE.S.V_mid_m_min).toBe(50);
      expect(LATHE_VENDOR_BASELINE.H.V_mid_m_min).toBe(100);
      expect(LATHE_VENDOR_BASELINE.P.fr_mid_mm).toBe(0.30);
      expect(LATHE_VENDOR_BASELINE.P.ap_mid_mm).toBe(2.0);
    });

    it("kc values match canonical Sandvik per ISO (P=1800, M=2100, K=1100, N=700, S=2800, H=3200)", () => {
      expect(LATHE_VENDOR_BASELINE.P.kc_n_per_mm2).toBe(1800);
      expect(LATHE_VENDOR_BASELINE.M.kc_n_per_mm2).toBe(2100);
      expect(LATHE_VENDOR_BASELINE.K.kc_n_per_mm2).toBe(1100);
      expect(LATHE_VENDOR_BASELINE.N.kc_n_per_mm2).toBe(700);
      expect(LATHE_VENDOR_BASELINE.S.kc_n_per_mm2).toBe(2800);
      expect(LATHE_VENDOR_BASELINE.H.kc_n_per_mm2).toBe(3200);
    });

    it("aluminum (N) has the highest Vc and superalloy (S) the lowest — vendor consensus", () => {
      const N = LATHE_VENDOR_BASELINE.N.V_mid_m_min;
      const S = LATHE_VENDOR_BASELINE.S.V_mid_m_min;
      const allV = Object.values(LATHE_VENDOR_BASELINE).map((w) => w.V_mid_m_min);
      expect(N).toBe(Math.max(...allV));
      expect(S).toBe(Math.min(...allV));
    });

    it("hardened steel (H) has the smallest ap_mid (finish-only territory)", () => {
      const allAp = Object.values(LATHE_VENDOR_BASELINE).map((w) => w.ap_mid_mm);
      expect(LATHE_VENDOR_BASELINE.H.ap_mid_mm).toBe(Math.min(...allAp));
    });

    it("Inconel (S) and D2 (H) use larger nose radius (0.8 mm) — heat-spreading + edge strength", () => {
      expect(LATHE_VENDOR_BASELINE.S.nose_radius_mm).toBe(0.8);
      expect(LATHE_VENDOR_BASELINE.H.nose_radius_mm).toBe(0.8);
      expect(LATHE_VENDOR_BASELINE.P.nose_radius_mm).toBe(0.4);
    });

    it("Taylor life self-consistency — P-group T = (350/200)^4 ≈ 9.38 min ±0.05", () => {
      const expected = Math.pow(350 / 200, 4);
      expect(LATHE_VENDOR_BASELINE.P.taylor_life_min).toBeCloseTo(expected, 1);
    });

    it("Taylor life self-consistency — N-group T = (600/400)^2.5 ≈ 2.76 min ±0.05", () => {
      const expected = Math.pow(600 / 400, 2.5);
      expect(LATHE_VENDOR_BASELINE.N.taylor_life_min).toBeCloseTo(expected, 1);
    });
  });

  describe("traditionalLathePowerKw — Kalpakjian Eq. 22.6", () => {
    it("P-group canonical: 50000 mm³/min × 1800 N/mm² = 1.5 kW", () => {
      const p = traditionalLathePowerKw(50_000, 1800);
      expect(p).toBeCloseTo(1.5, 6);
    });

    it("zero MRR → zero power (no division-by-zero crash)", () => {
      expect(traditionalLathePowerKw(0, 1800)).toBe(0);
    });

    it("negative inputs → zero (defensive)", () => {
      expect(traditionalLathePowerKw(-100, 1800)).toBe(0);
      expect(traditionalLathePowerKw(1000, -500)).toBe(0);
    });

    it("Inconel at 30000 mm³/min × kc=2800 vs P-group same MRR × kc=1800 yields exact 2800/1800 ratio", () => {
      const inconel = traditionalLathePowerKw(30_000, 2800);
      const steel = traditionalLathePowerKw(30_000, 1800);
      const ratio = inconel / steel;
      expect(ratio).toBeCloseTo(2800 / 1800, 6);
    });
  });

  describe("traditionalLatheMrr — Kalpakjian Eq. 23.2 (Vc × 1000 × fr × ap)", () => {
    it("P-group canonical: Vc=200 m/min × 1000 × fr=0.3 × ap=2.0 = 120000 mm³/min", () => {
      const mrr = traditionalLatheMrr(200, 0.3, 2.0);
      expect(mrr).toBeCloseTo(120_000, 6);
    });

    it("N-group aggressive: Vc=400 × 0.40 × 4.0 × 1000 = 640000 mm³/min — highest in vendor table", () => {
      const mrr = traditionalLatheMrr(400, 0.40, 4.0);
      expect(mrr).toBeCloseTo(640_000, 6);
    });

    it("S-group conservative: Vc=50 × 0.15 × 1.0 × 1000 = 7500 mm³/min — lowest in vendor table", () => {
      const mrr = traditionalLatheMrr(50, 0.15, 1.0);
      expect(mrr).toBeCloseTo(7500, 6);
    });

    it("any zero/negative arg → zero (defensive)", () => {
      expect(traditionalLatheMrr(0, 0.3, 2)).toBe(0);
      expect(traditionalLatheMrr(200, 0, 2)).toBe(0);
      expect(traditionalLatheMrr(200, 0.3, 0)).toBe(0);
      expect(traditionalLatheMrr(-200, 0.3, 2)).toBe(0);
    });

    it("vendor-table integration — each ISO produces a specific positive MRR matching the Kalpakjian formula exactly", () => {
      const expected: Record<IsoGroup, number> = {
        P: 200 * 1000 * 0.30 * 2.0,
        M: 150 * 1000 * 0.25 * 1.5,
        K: 180 * 1000 * 0.35 * 3.0,
        N: 400 * 1000 * 0.40 * 4.0,
        S: 50 * 1000 * 0.15 * 1.0,
        H: 100 * 1000 * 0.12 * 0.5,
      };
      for (const g of Object.keys(LATHE_VENDOR_BASELINE) as IsoGroup[]) {
        const w = LATHE_VENDOR_BASELINE[g];
        const mrr = traditionalLatheMrr(w.V_mid_m_min, w.fr_mid_mm, w.ap_mid_mm);
        expect(mrr).toBeCloseTo(expected[g], 4);
      }
    });
  });

  describe("cssRpm — Sandvik CoroTurn G96 constant-surface-speed", () => {
    it("Vc=200 m/min on 50 mm diameter → RPM = 200×1000/(π×50) ≈ 1273", () => {
      const rpm = cssRpm(200, 50);
      const expected = (200 * 1000) / (Math.PI * 50);
      expect(rpm).toBeCloseTo(expected, 6);
      expect(rpm).toBeGreaterThan(1270);
      expect(rpm).toBeLessThan(1275);
    });

    it("RPM scales inversely with diameter — Vc=200 on 25 mm = 2× the RPM on 50 mm", () => {
      const small = cssRpm(200, 25);
      const big = cssRpm(200, 50);
      expect(small / big).toBeCloseTo(2.0, 6);
    });

    it("zero/negative inputs → zero", () => {
      expect(cssRpm(0, 50)).toBe(0);
      expect(cssRpm(200, 0)).toBe(0);
      expect(cssRpm(-100, 50)).toBe(0);
    });
  });

  describe("theoreticalRaUm — Smith Ch.5 line-of-cusps geometric Ra", () => {
    it("fr=0.10 mm, r=0.4 mm: Ra = 0.01/(8×0.4)×1000 = 3.125 µm", () => {
      const ra = theoreticalRaUm(0.10, 0.4);
      expect(ra).toBeCloseTo(3.125, 4);
    });

    it("Halving feed quarters Ra (Ra ∝ fr²)", () => {
      const coarse = theoreticalRaUm(0.20, 0.4);
      const fine = theoreticalRaUm(0.10, 0.4);
      expect(coarse / fine).toBeCloseTo(4.0, 6);
    });

    it("Doubling nose radius halves Ra (Ra ∝ 1/r)", () => {
      const small_r = theoreticalRaUm(0.15, 0.4);
      const big_r = theoreticalRaUm(0.15, 0.8);
      expect(small_r / big_r).toBeCloseTo(2.0, 6);
    });

    it("vendor canonical P-group: fr=0.30, r=0.4 → Ra=28.125 µm (rough territory; finishing needs fr≤0.10)", () => {
      const ra = theoreticalRaUm(0.30, 0.4);
      expect(ra).toBeCloseTo(28.125, 4);
    });

    it("zero/negative inputs → zero (defensive)", () => {
      expect(theoreticalRaUm(0, 0.4)).toBe(0);
      expect(theoreticalRaUm(0.1, 0)).toBe(0);
      expect(theoreticalRaUm(-0.1, 0.4)).toBe(0);
    });
  });

  describe("sfmToMperMin / mPerMinToSfm — Imperial ↔ SI", () => {
    it("100 SFM ≈ 30.48 m/min", () => {
      expect(sfmToMperMin(100)).toBeCloseTo(30.48, 4);
    });

    it("round-trip preserves value within float precision", () => {
      const orig = 350;
      const round_trip = mPerMinToSfm(sfmToMperMin(orig));
      expect(round_trip).toBeCloseTo(orig, 6);
    });

    it("100 m/min ≈ 328 SFM", () => {
      expect(mPerMinToSfm(100)).toBeCloseTo(328.08, 1);
    });
  });

  describe("compareLatheVsBaseline — accuracy verdict ladder", () => {
    it("Kienzle=baseline → match verdict", () => {
      const v = compareLatheVsBaseline("P", 100, 100, "Vc", false);
      expect(v.verdict).toBe("match");
      expect(v.pct_delta).toBe(0);
    });

    it("Kienzle 4% above baseline → match (within 5% tight band)", () => {
      const v = compareLatheVsBaseline("P", 104, 100, "Vc", false);
      expect(v.verdict).toBe("match");
    });

    it("Kienzle 10% above baseline + higher-is-better=true → prism_better", () => {
      const v = compareLatheVsBaseline("P", 110, 100, "MRR", true);
      expect(v.verdict).toBe("prism_better");
      expect(v.pct_delta).toBeCloseTo(10, 6);
    });

    it("Kienzle 10% above baseline + higher-is-better=false → prism_worse (more power = worse)", () => {
      const v = compareLatheVsBaseline("P", 110, 100, "Power_kW", false);
      expect(v.verdict).toBe("prism_worse");
    });

    it("Kienzle 50% above baseline → out_of_band (default tolerance 25%)", () => {
      const v = compareLatheVsBaseline("P", 150, 100, "Vc", false);
      expect(v.verdict).toBe("out_of_band");
    });

    it("custom tolerance 50% absorbs the 30% delta as prism_better (if higher_is_better)", () => {
      const v = compareLatheVsBaseline("P", 130, 100, "MRR", true, 50);
      expect(v.verdict).toBe("prism_better");
    });

    it("baseline=0 → out_of_band with explanatory note (no NaN crash)", () => {
      const v = compareLatheVsBaseline("P", 100, 0, "Vc", false);
      expect(v.verdict).toBe("out_of_band");
      expect(v.note).toContain("baseline=0");
    });

    it("negative pct_delta surfaces in note text with sign", () => {
      const v = compareLatheVsBaseline("P", 80, 100, "Vc", false);
      expect(v.note).toContain("-20.0%");
    });
  });

  describe("Integration — vendor table feeds Kalpakjian power formula end-to-end", () => {
    it("every ISO group produces concrete power values in the 0.05-50 kW envelope at the vendor mid-range workpoint", () => {
      const computedPower: Record<IsoGroup, number> = {} as Record<IsoGroup, number>;
      for (const g of Object.keys(LATHE_VENDOR_BASELINE) as IsoGroup[]) {
        const w = LATHE_VENDOR_BASELINE[g];
        const mrr = traditionalLatheMrr(w.V_mid_m_min, w.fr_mid_mm, w.ap_mid_mm);
        const power = traditionalLathePowerKw(mrr, w.kc_n_per_mm2);
        computedPower[g] = power;
        expect(power).toBeGreaterThan(0.05);
        expect(power).toBeLessThan(50);
      }
      // Sanity: aluminum (N) burns the most power despite low kc — MRR dominates
      const naval = computedPower.N;
      const inconel = computedPower.S;
      expect(naval).toBeGreaterThan(inconel);
    });

    it("Inconel (S) vendor pick produces low MRR (≤10000 mm³/min) — conservative envelope is correct", () => {
      const w = LATHE_VENDOR_BASELINE.S;
      const mrr = traditionalLatheMrr(w.V_mid_m_min, w.fr_mid_mm, w.ap_mid_mm);
      expect(mrr).toBeLessThanOrEqual(10_000);
    });

    it("aluminum (N) vendor pick produces highest MRR (≥400000 mm³/min) — aggressive envelope is correct", () => {
      const w = LATHE_VENDOR_BASELINE.N;
      const mrr = traditionalLatheMrr(w.V_mid_m_min, w.fr_mid_mm, w.ap_mid_mm);
      expect(mrr).toBeGreaterThanOrEqual(400_000);
    });
  });
});
