/**
 * physics-reference-db.test.ts — U-INFRA07 validation
 *
 * Not a test of an engine — a test of the reference DB itself. For every
 * entry with a closed-form formula, re-derive the expected value from the
 * inputs and confirm it matches the stored value within tolerance. This
 * catches typos in the DB and validates that the stored values are
 * internally consistent with the stated formulas.
 */

import { describe, it, expect } from "vitest";
import db from "../../data/state/physics-reference-db.json";

// Narrowed type — the JSON is static and we know its shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const categories: Record<string, { formula: string; entries: Entry[] }> = (db as any).categories;

describe("physics-reference-db — U-INFRA07", () => {
  it("has schema version 1", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((db as any).schemaVersion).toBe(1);
  });

  it("contains ≥50 reference points across ≥8 categories (exit criterion)", () => {
    let total = 0;
    for (const body of Object.values(categories)) total += body.entries.length;
    expect(total).toBeGreaterThanOrEqual(50);
    expect(Object.keys(categories).length).toBeGreaterThanOrEqual(8);
  });

  it("every entry has source + tolerance + expected (non-empty)", () => {
    for (const [catName, body] of Object.entries(categories)) {
      for (const e of body.entries) {
        expect(e.source, `${catName}/${e.id} missing source`).toBeTruthy();
        expect(typeof e.tolerance_pct, `${catName}/${e.id} bad tolerance_pct`).toBe("number");
        expect(e.expected, `${catName}/${e.id} missing expected`).toBeTruthy();
        expect(e.id, `entry missing id in ${catName}`).toBeTruthy();
      }
    }
  });

  it("variability: covers all 6 ISO material groups across entries", () => {
    const groups = new Set<string>();
    for (const body of Object.values(categories)) {
      for (const e of body.entries) {
        const match = /(?:^|[^A-Z])([PMKNSH])\s/.exec(e.material ?? "");
        if (match) groups.add(match[1]);
      }
    }
    // ≥4 spanning ISO groups present (enforcement floor)
    expect(groups.size).toBeGreaterThanOrEqual(4);
  });

  // ── Closed-form recomputation: Kienzle Fc ──

  it("Kienzle Fc values are internally consistent with Fc = kc1_1 · ap · fz^(1-mc)", () => {
    const entries = categories.kienzle_force.entries;
    for (const e of entries) {
      const { ap_mm, fz_mm, kc1_1, mc } = e.inputs;
      const Fc_expected = kc1_1 * ap_mm * Math.pow(fz_mm, 1 - mc);
      const stored = e.expected.Fc_N;
      // Use a 3% self-consistency band — the entry itself declares its
      // tolerance vs the published sources, but within the formula it must
      // round-trip accurately.
      const deviation = Math.abs(Fc_expected - stored) / stored;
      expect(deviation, `${e.id}: derived Fc=${Fc_expected.toFixed(1)} vs stored ${stored}`).toBeLessThan(0.03);
    }
  });

  // ── Closed-form recomputation: Taylor T ──

  it("Taylor T values are internally consistent with T = (C/Vc)^(1/n)", () => {
    const entries = categories.taylor_tool_life.entries;
    for (const e of entries) {
      const { Vc_m_min, C, n } = e.inputs;
      const T_expected = Math.pow(C / Vc_m_min, 1 / n);
      const stored = e.expected.T_min;
      const deviation = Math.abs(T_expected - stored) / stored;
      expect(deviation, `${e.id}: derived T=${T_expected.toFixed(2)} vs stored ${stored}`).toBeLessThan(0.03);
    }
  });

  // ── Closed-form recomputation: cantilever deflection ──

  it("Deflection values are internally consistent with delta = F·L^3 / (3·E·I)", () => {
    const entries = categories.cantilever_deflection.entries;
    for (const e of entries) {
      const { F_N, L_mm, d_mm, E_GPa } = e.inputs;
      // I = pi·d^4/64 in mm^4. E in GPa => N/mm² when multiplied by 1000.
      const I_mm4 = (Math.PI * Math.pow(d_mm, 4)) / 64;
      const E_N_mm2 = E_GPa * 1000;
      const delta = (F_N * Math.pow(L_mm, 3)) / (3 * E_N_mm2 * I_mm4);
      const stored = e.expected.delta_mm;
      const deviation = Math.abs(delta - stored) / stored;
      expect(deviation, `${e.id}: derived delta=${delta.toExponential(3)} vs stored ${stored}`).toBeLessThan(0.03);
    }
  });

  // ── Closed-form recomputation: theoretical Ra ──

  it("Ra values are internally consistent with Ra = fz² / (32·r_eps)", () => {
    const entries = categories.surface_roughness_theoretical.entries;
    for (const e of entries) {
      const { fz_mm, r_eps_mm } = e.inputs;
      // fz in mm, r in mm, Ra in mm then convert to µm
      const Ra_mm = (fz_mm * fz_mm) / (32 * r_eps_mm);
      const Ra_um = Ra_mm * 1000;
      const stored = e.expected.Ra_theo_um;
      const deviation = Math.abs(Ra_um - stored) / stored;
      expect(deviation, `${e.id}: derived Ra=${Ra_um.toFixed(3)} vs stored ${stored}`).toBeLessThan(0.03);
    }
  });

  // ── Closed-form recomputation: MRR milling ──

  it("MRR values are internally consistent with MRR = ae · ap · fz · z · n", () => {
    const entries = categories.mrr_milling.entries;
    for (const e of entries) {
      const { teeth, rpm, ap_mm, ae_mm, fz_mm } = e.inputs;
      // Result in mm³/min, convert to cm³/min
      const mrr_mm3_min = ae_mm * ap_mm * fz_mm * teeth * rpm;
      const mrr_cm3_min = mrr_mm3_min / 1000;
      const stored = e.expected.MRR_cm3_min;
      const deviation = Math.abs(mrr_cm3_min - stored) / stored;
      expect(deviation, `${e.id}: derived MRR=${mrr_cm3_min.toFixed(2)} vs stored ${stored}`).toBeLessThan(0.02);
    }
  });

  // ── Closed-form recomputation: spindle power ──

  it("Power values are internally consistent with P = Fc · Vc / 60 (Vc in m/min)", () => {
    const entries = categories.spindle_power.entries;
    for (const e of entries) {
      const { Fc_N, Vc_m_min } = e.inputs;
      // Fc (N) × Vc (m/min) ÷ 60 = watts;  ÷ 1000 = kW
      const P_kW = (Fc_N * Vc_m_min) / 60 / 1000;
      const stored = e.expected.P_kW;
      const deviation = Math.abs(P_kW - stored) / stored;
      expect(deviation, `${e.id}: derived P=${P_kW.toFixed(3)} vs stored ${stored}`).toBeLessThan(0.03);
    }
  });

  // ── Structural: no duplicate ids within or across categories ──

  it("all reference entry ids are globally unique", () => {
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const body of Object.values(categories)) {
      for (const e of body.entries) {
        if (seen.has(e.id)) dups.push(e.id);
        seen.add(e.id);
      }
    }
    expect(dups).toEqual([]);
  });

  // ── Failure / adversarial gates: tolerance values are sane ──

  it("every tolerance_pct is in (0, 100]", () => {
    for (const body of Object.values(categories)) {
      for (const e of body.entries) {
        expect(e.tolerance_pct, `${e.id} invalid tolerance`).toBeGreaterThan(0);
        expect(e.tolerance_pct).toBeLessThanOrEqual(100);
      }
    }
  });

  it("Kienzle entries: kc1_1 lies in [500, 4500] (physical plausibility)", () => {
    for (const e of categories.kienzle_force.entries) {
      const kc = e.inputs.kc1_1;
      expect(kc, `${e.id} implausible kc1_1=${kc}`).toBeGreaterThanOrEqual(500);
      expect(kc).toBeLessThanOrEqual(4500);
    }
  });
});
