/**
 * OSCAR-SFC-9AXIS-MS0/U-OSC-FINISH-RA-CAP -- numeric finish-quality (target Ra) feed cap.
 *
 * Makes "desired finish quality" a NUMERIC, tunable axis (today the orchestrator only had
 * the cut_type CATEGORY rough/semi/finish). When `toolpath.target_ra_um` is supplied AND the
 * tool has a nose/corner radius, the recommended feed-per-tooth is capped so the predicted
 * kinematic finish Ra ~= fz^2/(32r) meets the target. MIN-ceiling only (never raises fz),
 * placed LAST so it composes with the workholding/power derates (most-binding wins).
 *
 * Physics (physics-review 2026-06-09, GO verdict): Ra ~= fz^2/(32r) (Boothroyd & Knight;
 * Sandvik 2024). Inverted via the canonical `predictedRa` (Ra = K*fz^2, K = predictedRa(1,r))
 * -- NO inlined constant, round-trips with the engine's own forward Ra. r->0 SKIPS the cap
 * (square-end wall finish is a different mechanism); below the chip-thickness floor it FAILS
 * LOUD (R12) rather than claim an un-met target.
 *
 * R15: every case round-trips THROUGH speedFeedNineAxisOrchestratorEngine.run().
 */
import { describe, it, expect } from "vitest";
import { speedFeedNineAxisOrchestratorEngine } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";
import { predictedRa } from "../physics/constants.js";

// Roughing base with a corner-radius (bull-nose) end mill -> a high category fz the finish
// cap can actually bite into.  corner_radius default below is overridden per-case.
function cut(extra: Record<string, unknown>, toolpathExtra: Record<string, unknown> = {}): {
  vc: number; rpm: number; feed: number; fz: number; mrr: number; warnings: string[];
} {
  const input: any = {
    material: { name: "AISI 4140 Alloy Steel", iso_group: "P" },
    tooling: { tool_diameter_mm: 16, flutes: 4, tool_material: "carbide", corner_radius_mm: 0.8, tool_cost_usd: 60 },
    toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional", axial_depth_mm: 8, radial_depth_mm: 10, ...toolpathExtra },
    machine: { rigidity: "medium", max_rpm: 12000 },
    mode: "prism_optimized",
    ...extra,
  };
  const out = speedFeedNineAxisOrchestratorEngine.run(input);
  const r = out.recommendation;
  return {
    vc: r.cutting_speed_mpm, rpm: r.spindle_rpm, feed: r.feed_rate_mmmin,
    fz: r.feed_per_tooth_mm, mrr: r.mrr_cm3min, warnings: out.warnings ?? [],
  };
}

describe("finish-Ra cap (U-OSC-FINISH-RA-CAP)", () => {
  // ---- HAPPY PATH: a fine Ra target caps fz so the predicted finish meets the target ----
  it("a fine target_ra_um caps fz so predicted Ra (fz^2/32r) meets the target", () => {
    const r = 0.8;                                   // corner radius mm (base tool)
    const baseline = cut({});                        // no target_ra_um
    const target = 0.8;                              // um -- finer than the roughing category delivers
    const capped = cut({}, { target_ra_um: target });
    // cap must have bitten (roughing fz is well above the Ra-limited fz)
    expect(capped.fz).toBeLessThan(baseline.fz);
    // predicted Ra at the recommended fz meets the target (the whole point), small float slack
    expect(predictedRa(capped.fz, r)).toBeLessThanOrEqual(target * 1.02);
    // and it announced itself
    expect(capped.warnings.some(w => /finish-ra cap/i.test(w))).toBe(true);
  });

  it("the cap holds the analytic ceiling fz_max = sqrt(target / predictedRa(1, r))", () => {
    const r = 0.8, target = 0.8;
    const fzMax = Math.sqrt(target / predictedRa(1, r));   // ~0.1429 mm
    const capped = cut({}, { target_ra_um: target });
    expect(capped.fz).toBeLessThanOrEqual(fzMax * 1.001);
    expect(capped.fz).toBeGreaterThan(0);
  });

  // ---- NO-OP when the target is slack (coarse Ra the category fz already meets) ----
  it("REGRESSION GUARD: a coarse target_ra_um leaves the recommendation unchanged (no-op)", () => {
    const baseline = cut({});
    const coarse = cut({}, { target_ra_um: 12.5 });        // very coarse -> fz_max huge -> no bind
    expect(coarse.fz).toBeCloseTo(baseline.fz, 4);
    expect(coarse.feed).toBeCloseTo(baseline.feed, 0);
    expect(coarse.warnings.some(w => /finish-ra cap:/i.test(w))).toBe(false);
  });

  it("REGRESSION GUARD: no target_ra_um at all -> recommendation identical to baseline", () => {
    const a = cut({});
    const b = cut({});
    expect(a.fz).toBeCloseTo(b.fz, 6);
    expect(a.warnings.some(w => /finish-ra cap/i.test(w))).toBe(false);
  });

  // ---- MONOTONIC: finer Ra -> lower fz ----
  it("monotonic: finer Ra target gives lower fz (Ra 0.4 < Ra 1.6 < Ra 3.2)", () => {
    const f04 = cut({}, { target_ra_um: 0.4 }).fz;
    const f16 = cut({}, { target_ra_um: 1.6 }).fz;
    const f32 = cut({}, { target_ra_um: 3.2 }).fz;
    expect(f04).toBeLessThan(f16);
    expect(f16).toBeLessThanOrEqual(f32);
  });

  // ---- r -> 0 / undefined: SKIP the cap (square end mill, no nose cusp model) ----
  it("FAILURE MODE: a square end mill (corner_radius_mm=0) SKIPS the cap with a warning", () => {
    const base = cut({ tooling: { tool_diameter_mm: 16, flutes: 4, tool_material: "carbide", corner_radius_mm: 0 } });
    const sq = cut(
      { tooling: { tool_diameter_mm: 16, flutes: 4, tool_material: "carbide", corner_radius_mm: 0 } },
      { target_ra_um: 0.4 },
    );
    expect(sq.fz).toBeCloseTo(base.fz, 4);                 // fz untouched
    expect(sq.warnings.some(w => /finish-ra cap skipped/i.test(w))).toBe(true);
  });

  it("FAILURE MODE: omitted corner_radius_mm SKIPS the cap (cannot fabricate a radius)", () => {
    const sq = cut(
      { tooling: { tool_diameter_mm: 16, flutes: 4, tool_material: "carbide" } },        // no corner_radius_mm
      { target_ra_um: 0.4 },
    );
    expect(sq.warnings.some(w => /finish-ra cap skipped/i.test(w))).toBe(true);
    expect(Number.isFinite(sq.fz)).toBe(true);
  });

  // ---- INFEASIBLE: target below the chip-thickness floor -> FAIL LOUD ----
  it("FAILURE MODE: an unachievable mirror Ra (below the rubbing floor) FAILS LOUD, not silent", () => {
    // r=0.1mm, Ra=0.02um -> fz_max = sqrt(0.02/predictedRa(1,0.1)) ~ 0.008mm < 0.01 floor
    const r = 0.1, target = 0.02;
    const fzMax = Math.sqrt(target / predictedRa(1, r));
    expect(fzMax).toBeLessThan(0.01);                      // precondition: genuinely infeasible
    const out = cut(
      { tooling: { tool_diameter_mm: 6, flutes: 3, tool_material: "carbide", corner_radius_mm: r } },
      { target_ra_um: target },
    );
    expect(out.warnings.some(w => /NOT met/i.test(w))).toBe(true);   // R12 fail-loud
    expect(out.fz).toBeGreaterThan(0);                                // never zero/negative
  });

  // ---- SPEED UNTOUCHED: finish is a feed-direction effect ----
  it("the cap reduces feed/fz only -- cutting speed + RPM unchanged", () => {
    const baseline = cut({});
    const capped = cut({}, { target_ra_um: 0.4 });
    expect(capped.vc).toBeCloseTo(baseline.vc, 1);          // speed untouched
    expect(capped.rpm).toBeCloseTo(baseline.rpm, 0);        // rpm untouched
    expect(capped.fz).toBeLessThan(baseline.fz);            // chip load reduced
  });

  // ---- COMPOSITION: finish cap + spindle-power clamp both engage, no NaN / double-derate ----
  it("composes with the spindle-power clamp (both constraints) without NaN", () => {
    const r = cut({ spindle: { hp: 5 } }, { target_ra_um: 0.4 });
    expect(Number.isFinite(r.fz)).toBe(true);
    expect(r.fz).toBeGreaterThan(0);
    expect(Number.isFinite(r.feed)).toBe(true);
  });

  // ---- ADVERSARIAL ----
  it("ADVERSARIAL: NaN target_ra_um -> guard skips, no crash, no cap, baseline preserved", () => {
    const baseline = cut({});
    const r = cut({}, { target_ra_um: NaN });
    expect(Number.isFinite(r.fz)).toBe(true);
    expect(r.fz).toBeCloseTo(baseline.fz, 4);
    expect(r.warnings.some(w => /finish-ra cap/i.test(w))).toBe(false);
  });

  it("ADVERSARIAL: zero / negative target_ra_um -> no cap, no divide-by-zero", () => {
    expect(Number.isFinite(cut({}, { target_ra_um: 0 }).fz)).toBe(true);
    expect(Number.isFinite(cut({}, { target_ra_um: -1 }).fz)).toBe(true);
    expect(cut({}, { target_ra_um: 0 }).warnings.some(w => /finish-ra cap:/i.test(w))).toBe(false);
  });
});
