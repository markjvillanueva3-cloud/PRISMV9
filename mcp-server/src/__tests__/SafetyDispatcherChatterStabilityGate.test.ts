import { describe, it, expect } from "vitest";
import type { ChatterResult } from "../engines/ChatterStabilityLobeEngine.js";
import { evaluateChatterStabilityGate } from "../tools/dispatchers/safetyDispatcher.js";
import { ACTION_SAFETY_SCHEMAS } from "../schemas/safetyActionSchemas.js";

/**
 * MS-CRITWIRE/U-CW-03 wiring verification (oscar iter25, 2026-05-24).
 *
 * Wires ChatterStabilityLobeEngine.compute() (Altintas single-DoF SLD) onto
 * prism_safety via the chatter_stability_gate action. The gate verdict logic
 * is extracted into evaluateChatterStabilityGate() so the algorithm is testable
 * IN ISOLATION from the engine — important because the live engine currently
 * returns 0 lobes for many inputs (pre-existing regression in the SLD/fallback
 * pipeline — see ChatterStabilityLobeEngine.test.ts which also fails today).
 * That engine regression is tracked as a follow-up candidate unit; the wiring
 * itself is correct, and the gate fails LOUD (no-coverage verdict) whenever
 * the engine returns an empty envelope — which is the safety-correct response.
 *
 * Coverage: gate verdict logic on synthetic ChatterResult fixtures (safe /
 * unsafe / no-coverage / boundary / safety-factor mechanics) + wiring contract
 * (dispatcher source + ALL_ACTIONS enum + schema map).
 */

function mkResult(overrides: Partial<ChatterResult> = {}): ChatterResult {
  // Two-lobe envelope spanning rpm 2000-10000 — synthetic but realistic.
  // Lobe 1 covers 2000-5000 rpm with max ap 1.5 mm (peak at 3500); lobe 2
  // covers 6000-10000 rpm with max ap 3.0 mm (peak at 8000 — the global
  // optimum). Outside [2000, 10000] there is no lobe coverage.
  return {
    lobes: [
      { lobe_number: 1, rpm_values: [2000, 3500, 5000], ap_limit_mm: [0.8, 1.5, 0.8] },
      { lobe_number: 2, rpm_values: [6000, 8000, 10000], ap_limit_mm: [1.5, 3.0, 1.5] },
    ],
    optimal_rpm: 8000,
    max_stable_ap_mm: 3.0,
    critical_frequency_hz: 800,
    chatter_frequency_hz: 820,
    stable_pockets: [
      { rpm_range: [7000, 9000], max_ap_mm: 3.0, lobe: 2 },
      { rpm_range: [3000, 4000], max_ap_mm: 1.5, lobe: 1 },
    ],
    recommendations: [
      "Optimal RPM: 8000 — max stable depth: 3.0mm",
      "Best stable pocket: 7000-9000 RPM (ap ≤ 3.0mm)",
    ],
    ...overrides,
  };
}

describe("MS-CRITWIRE/U-CW-03 — chatter_stability_gate on prism_safety", () => {
  describe("evaluateChatterStabilityGate() — verdict logic on synthetic SLD fixtures", () => {
    it("safe verdict — proposed_ap well below lobe ceiling at proposed_rpm 8000 (optimal)", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 8000, 0.3, 1.25);
      expect(v.safe).toBe(true);
      expect(v.reason).toContain("≤ stable_ap_budget");
      expect(v.safety_margin).toBeGreaterThan(0);
      expect(v.active_lobe_number).toBe(2);
      expect(v.max_stable_ap_mm_at_rpm).toBeCloseTo(3.0, 6);
      expect(v.stable_ap_budget_mm).toBeCloseTo(3.0 / 1.25, 6);
    });

    it("unsafe verdict — proposed_ap above lobe ceiling triggers regenerative-chatter reason", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 8000, 5.0, 1.25);
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("regenerative chatter onset");
      expect(v.reason).toContain("Re[Φ(ωc)] crosses zero");
      expect(v.recommendations[0]).toMatch(/Reduce ap/);
      expect(v.recommendations[1]).toMatch(/optimal_rpm=8000/);
      expect(v.active_lobe_number).toBe(2);
    });

    it("no-coverage verdict — proposed_rpm below the computed rpm-window fails LOUD", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 500, 1.0, 1.25);
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("no stability-lobe coverage");
      expect(v.max_stable_ap_mm_at_rpm).toBe(0);
      expect(v.active_lobe_number).toBeNull();
      expect(v.recommendations[0]).toMatch(/Move to optimal_rpm=8000/);
    });

    it("no-coverage verdict — proposed_rpm above the computed rpm-window fails LOUD", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 20000, 1.0, 1.25);
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("no stability-lobe coverage");
      expect(v.max_stable_ap_mm_at_rpm).toBe(0);
      expect(v.active_lobe_number).toBeNull();
    });

    it("no-coverage verdict — gap BETWEEN lobes (5500 rpm, between lobe 1 [2000-5000] and lobe 2 [6000-10000]) fails LOUD", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 5500, 1.0, 1.25);
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("no stability-lobe coverage");
      expect(v.active_lobe_number).toBeNull();
    });

    it("interpolation — proposed_rpm halfway between (6000,1.5) and (8000,3.0) yields ap=2.25 (linear)", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 7000, 0.001, 1.0);
      expect(v.max_stable_ap_mm_at_rpm).toBeCloseTo(2.25, 6);
      expect(v.active_lobe_number).toBe(2);
    });

    it("interpolation — proposed_rpm = exact sample point returns that sample's ap directly", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 8000, 0.001, 1.0);
      expect(v.max_stable_ap_mm_at_rpm).toBeCloseTo(3.0, 6);
    });

    it("safety_factor mechanics — increasing the factor narrows the ap budget proportionally", () => {
      const v_low = evaluateChatterStabilityGate(mkResult(), 8000, 0.001, 1.0);
      const v_high = evaluateChatterStabilityGate(mkResult(), 8000, 0.001, 2.5);
      expect(v_low.stable_ap_budget_mm).toBeCloseTo(3.0, 6);
      expect(v_high.stable_ap_budget_mm).toBeCloseTo(3.0 / 2.5, 6);
      const ratio = v_low.stable_ap_budget_mm! / v_high.stable_ap_budget_mm!;
      expect(ratio).toBeCloseTo(2.5, 6);
    });

    it("safety_factor mechanics — cut safe at sf=1.0 becomes unsafe at sf=5.0", () => {
      // local ceiling at 8000 is 3.0 mm. ap=2.0 is safe at sf=1.0 (budget=3.0),
      // unsafe at sf=5.0 (budget=0.6).
      const v_lax = evaluateChatterStabilityGate(mkResult(), 8000, 2.0, 1.0);
      const v_strict = evaluateChatterStabilityGate(mkResult(), 8000, 2.0, 5.0);
      expect(v_lax.safe).toBe(true);
      expect(v_strict.safe).toBe(false);
      expect(v_strict.reason).toContain("regenerative chatter onset");
    });

    it("output shape — covered verdict carries optimal_rpm + chatter_frequency_hz + critical_frequency_hz + global ceiling", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 8000, 0.5, 1.25);
      expect(v.optimal_rpm).toBe(8000);
      expect(v.max_stable_ap_mm_global).toBeCloseTo(3.0, 6);
      expect(v.chatter_frequency_hz).toBe(820);
      expect(v.critical_frequency_hz).toBe(800);
    });

    it("output shape — no-coverage verdict still carries optimal_rpm + chatter/critical frequencies + global ceiling for operator guidance", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 500, 1.0, 1.25);
      expect(v.optimal_rpm).toBe(8000);
      expect(v.max_stable_ap_mm_global).toBeCloseTo(3.0, 6);
      expect(v.chatter_frequency_hz).toBe(820);
      expect(v.critical_frequency_hz).toBe(800);
    });

    it("boundary — proposed_ap exactly equal to ap_budget is safe (≤ not <)", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 8000, 3.0, 1.0);
      expect(v.safe).toBe(true);
      expect(v.safety_margin).toBeCloseTo(0, 9);
    });

    it("boundary — proposed_ap one epsilon above ap_budget is unsafe", () => {
      const v = evaluateChatterStabilityGate(mkResult(), 8000, 3.0 + 1e-6, 1.0);
      expect(v.safe).toBe(false);
    });

    it("multi-lobe ranking — when two lobes COULD cover same rpm, the higher ap_limit wins", () => {
      // Construct a fixture where lobes overlap and lobe 3 is higher.
      const overlapResult = mkResult({
        lobes: [
          { lobe_number: 1, rpm_values: [4000, 5000, 6000], ap_limit_mm: [1.0, 1.2, 1.0] },
          { lobe_number: 3, rpm_values: [4000, 5000, 6000], ap_limit_mm: [2.0, 2.5, 2.0] },
        ],
      });
      const v = evaluateChatterStabilityGate(overlapResult, 5000, 0.001, 1.0);
      expect(v.max_stable_ap_mm_at_rpm).toBeCloseTo(2.5, 6);
      expect(v.active_lobe_number).toBe(3);
    });

    it("degenerate lobe — lobe with mismatched array lengths is skipped (defensive)", () => {
      const malformedResult = mkResult({
        lobes: [
          { lobe_number: 1, rpm_values: [3000, 4000, 5000], ap_limit_mm: [1.0] }, // mismatched
          { lobe_number: 2, rpm_values: [6000, 8000, 10000], ap_limit_mm: [1.5, 3.0, 1.5] },
        ],
      });
      const v = evaluateChatterStabilityGate(malformedResult, 8000, 0.001, 1.0);
      expect(v.max_stable_ap_mm_at_rpm).toBeCloseTo(3.0, 6);
      expect(v.active_lobe_number).toBe(2);
    });

    it("degenerate lobe — single-point lobe (length 1) is skipped (need 2 samples to interpolate)", () => {
      const singleSampleResult = mkResult({
        lobes: [
          { lobe_number: 1, rpm_values: [5000], ap_limit_mm: [1.0] },
          { lobe_number: 2, rpm_values: [6000, 8000, 10000], ap_limit_mm: [1.5, 3.0, 1.5] },
        ],
      });
      const v_in_skipped = evaluateChatterStabilityGate(singleSampleResult, 5000, 0.001, 1.0);
      expect(v_in_skipped.safe).toBe(false);
      expect(v_in_skipped.reason).toContain("no stability-lobe coverage");
      const v_in_good = evaluateChatterStabilityGate(singleSampleResult, 8000, 0.001, 1.0);
      expect(v_in_good.safe).toBe(true);
    });
  });

  describe("Wiring contract — safetyDispatcher source + schema map + ALL_ACTIONS enum", () => {
    it("dispatcher source contains CHATTER_STABILITY_GATE_ACTIONS + action string + engine import + spread into ALL_ACTIONS + exported pure-function", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const here = path.dirname(fileURLToPath(import.meta.url));
      const src = fs.readFileSync(path.resolve(here, "../tools/dispatchers/safetyDispatcher.ts"), "utf8");
      expect(src).toContain("CHATTER_STABILITY_GATE_ACTIONS");
      expect(src).toContain('"chatter_stability_gate"');
      expect(src).toContain("ChatterStabilityLobeEngine.js");
      expect(src).toContain("chatterStabilityLobeEngine.compute");
      expect(src).toContain("...CHATTER_STABILITY_GATE_ACTIONS");
      expect(src).toContain("evaluateChatterStabilityGate");
      expect(src).toContain("export function evaluateChatterStabilityGate");
    });

    it("schema map exposes chatter_stability_gate as a valid Zod schema accepting known-good params", () => {
      const schema = ACTION_SAFETY_SCHEMAS.chatter_stability_gate;
      expect(typeof schema?.safeParse).toBe("function");
      const good = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 50, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 15000, min_rpm: 500 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
        proposed_rpm: 8000,
        proposed_ap_mm: 1.5,
        safety_factor: 1.25,
      };
      const r = schema!.safeParse(good);
      expect(r.success).toBe(true);
    });

    it("schema map — safety_factor defaults gracefully (omitted is OK; OptionalSchema)", () => {
      const good = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 50, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 15000, min_rpm: 500 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
        proposed_rpm: 8000,
        proposed_ap_mm: 1.5,
      };
      const r = ACTION_SAFETY_SCHEMAS.chatter_stability_gate!.safeParse(good);
      expect(r.success).toBe(true);
    });

    it("schema map — proposed_rpm missing → safeParse failure (REQUIRED)", () => {
      const bad = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 50, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 15000, min_rpm: 500 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
        proposed_ap_mm: 1.5,
      };
      const r = ACTION_SAFETY_SCHEMAS.chatter_stability_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map — safety_factor below 1.0 rejected (lower bound is the safety contract)", () => {
      const bad = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 50, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 15000, min_rpm: 500 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
        proposed_rpm: 8000,
        proposed_ap_mm: 1.5,
        safety_factor: 0.5,
      };
      const r = ACTION_SAFETY_SCHEMAS.chatter_stability_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map — radial_immersion_ratio > 1 rejected (ae/D ∈ [0, 1] is the physical contract)", () => {
      const bad = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 50, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 15000, min_rpm: 500 },
        cutting: { radial_immersion_ratio: 1.5, up_milling: false },
        proposed_rpm: 8000,
        proposed_ap_mm: 1.5,
      };
      const r = ACTION_SAFETY_SCHEMAS.chatter_stability_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map P1 hardening — proposed_rpm=Infinity rejected (must be finite, not just positive)", () => {
      const bad = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 50, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 15000, min_rpm: 500 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
        proposed_rpm: Number.POSITIVE_INFINITY,
        proposed_ap_mm: 1.5,
      };
      const r = ACTION_SAFETY_SCHEMAS.chatter_stability_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map P1 hardening — damping_ratio > 1 rejected (physical bound 0 < ζ ≤ 1; overdamped systems have no chatter)", () => {
      const bad = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 50, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 15000, min_rpm: 500, damping_ratio: 2.0 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
        proposed_rpm: 8000,
        proposed_ap_mm: 1.5,
      };
      const r = ACTION_SAFETY_SCHEMAS.chatter_stability_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("gate P1 hardening — lobe with NEGATIVE ap_limit_mm sample is dropped (no misleading 'exceeds-ceiling' verdict)", () => {
      // Simulates upstream engine regression — negative ap_limit must produce
      // no-coverage fail-loud rather than the misleading exceeds-ceiling reason.
      const corruptResult = mkResult({
        lobes: [
          { lobe_number: 1, rpm_values: [6000, 8000, 10000], ap_limit_mm: [1.5, -3.0, 1.5] }, // negative middle sample
        ],
        stable_pockets: [],
      });
      const v = evaluateChatterStabilityGate(corruptResult, 8000, 1.0, 1.25);
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("no stability-lobe coverage");
      expect(v.active_lobe_number).toBeNull();
    });

    it("schema map — proposed_ap_mm negative rejected (positive cut depths only)", () => {
      const bad = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 50, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 15000, min_rpm: 500 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
        proposed_rpm: 8000,
        proposed_ap_mm: -0.5,
      };
      const r = ACTION_SAFETY_SCHEMAS.chatter_stability_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });
  });
});
