/**
 * Tests for sfc-all-axis-sweep (U-OSC-ALL-AXIS-SWEEP) — the clause-1 "calculations across
 * EVERY named axis with max variability" harness.
 *
 * R9: these encode INTENT, not shape. The sweep's whole purpose is to prove each named axis
 * genuinely moves the NineAxisOrchestrator output. So the load-bearing assertions check that
 * the axes that MUST move output (material, tool_material, mode, coolant, holder_balance) show
 * large real spreads — if the orchestrator regressed to material-blindness (the known
 * reference_oscar_speedfeed_material_blind bug class), `material` spread collapses and this
 * suite FAILS. We also pin the 2-regime methodology: holder_balance is an ISO-1940 RPM cap that
 * is INERT at a rigid roughing baseline and only LIVE in the high-RPM regime — so its liveness
 * proves the dual-baseline design actually exercises cap axes.
 */

import { describe, it, expect } from "vitest";
import { runOAT, AXES } from "../../scripts/sfc-all-axis-sweep.mjs";

const RUN_TIMEOUT = 120_000;

describe("sfc-all-axis-sweep — OAT methodology (U-OSC-ALL-AXIS-SWEEP)", () => {
  // One shared run (≈250 orchestrator calls) reused across assertions.
  const oat = runOAT();

  it("covers EVERY named axis defined in AXES (no axis silently skipped)", () => {
    const axisNames = Object.keys(AXES);
    expect(Object.keys(oat.perAxis).sort()).toEqual(axisNames.sort());
    // The goal names >=12 distinct axes; we sweep substantially more (machine sub-axes, etc.).
    expect(axisNames.length).toBeGreaterThanOrEqual(20);
  });

  it("every OAT cell is feasible by construction (baselines chosen to never throw)", () => {
    expect(oat.runs).toBeGreaterThan(0);
    expect(oat.feasible).toBe(oat.runs);
  });

  it("material axis is LIVE with a large MRR spread (regression guard vs material-blindness bug)", () => {
    const m = oat.perAxis.material;
    expect(m.live).toBe(true);
    // P/M/K/N/S/H span a huge MRR range; a material-blind engine would collapse this to ~0.
    expect(m.mrr_spread_pct).toBeGreaterThan(100);
  });

  it("tool_material axis is LIVE (carbide/hss/ceramic/cbn change the recommendation)", () => {
    const t = oat.perAxis.tool_material;
    expect(t.live).toBe(true);
    expect(t.feed_spread_pct).toBeGreaterThan(20);
  });

  it("optimization mode axis is LIVE (cost_batch vs aggressive_rush vs prism_optimized differ)", () => {
    expect(oat.perAxis.mode.live).toBe(true);
    expect(oat.perAxis.mode.feed_spread_pct).toBeGreaterThan(20);
  });

  it("coolant axis is LIVE (coolant type changes effectiveness -> MRR)", () => {
    expect(oat.perAxis.coolant.live).toBe(true);
    expect(oat.perAxis.coolant.mrr_spread_pct).toBeGreaterThan(10);
  });

  it("holder_balance (ISO-1940 RPM cap) is LIVE via the HIGH-RPM regime — proves dual-baseline design", () => {
    const hb = oat.perAxis.holder_balance;
    expect(hb.live).toBe(true);
    // The balance cap only bites at high RPM, so the strongest signal MUST be the light/hi-rpm regime.
    expect(hb.regime).toBe("light_finish_hirpm");
    expect(hb.rpm_spread_pct).toBeGreaterThan(10);
  });

  it("credits holder_runout as LIVE via tool-life (it moves the Taylor derate, not the speed/feed headline)", () => {
    const hr = oat.perAxis.holder_runout;
    // Runout TIR doesn't change vc/rpm/feed/mrr, but it DOES degrade tool life — so the sweep must
    // not falsely report it inert. effect must be 'tool_life_only', not 'speed_feed' and not 'inert'.
    expect(hr.live).toBe(true);
    expect(hr.effect).toBe("tool_life_only");
    expect(hr.tool_life_spread_pct).toBeGreaterThan(1);
    // And it MUST be flat on the speed/feed headline (else the classification is wrong).
    expect(hr.feed_spread_pct === null || hr.feed_spread_pct <= 0.1).toBe(true);
  });

  it("target_ra (desired finish quality) BINDS + goes LIVE with a nose radius + fine Ra (finish-Ra cap fires)", () => {
    const tr = oat.perAxis.target_ra;
    // Was inert (cap skipped: no nose radius + Ra too coarse). With corner_radius + Ra down to 0.1um
    // the cap lowers fz for finer targets, so feed/mrr move across the Ra sweep — a real finish-quality effect.
    expect(tr.live).toBe(true);
    expect(tr.effect).toBe("speed_feed");
    expect(tr.feed_spread_pct).toBeGreaterThan(10);
  });

  it("classifies every axis effect as exactly one of speed_feed | tool_life_only | inert | by_design_inert", () => {
    for (const [, v] of Object.entries(oat.perAxis) as Array<[string, any]>) {
      expect(["speed_feed", "tool_life_only", "inert", "by_design_inert"]).toContain(v.effect);
      // live <=> a speed/feed or tool-life effect; not-live <=> inert or by_design_inert.
      const liveEffect = v.effect === "speed_feed" || v.effect === "tool_life_only";
      expect(liveEffect).toBe(v.live);
    }
  });

  it("machine_accuracy + controller_brand are classified BY-DESIGN-INERT (not lumped with real gaps)", () => {
    // These MUST NOT move speed/feed (accuracy = geometric error budget; brand = per-license capability).
    // The sweep must distinguish them from genuine wiring gaps so it does not over-report incomplete work.
    expect(oat.perAxis.machine_accuracy.effect).toBe("by_design_inert");
    expect(oat.perAxis.controller_brand.effect).toBe("by_design_inert");
    expect(oat.perAxis.machine_accuracy.live).toBe(false);
    expect(oat.perAxis.controller_brand.live).toBe(false);
  });

  it("reports a finite, non-negative spread (never NaN) for every axis it judges live", () => {
    for (const [, v] of Object.entries(oat.perAxis) as Array<[string, any]>) {
      if (!v.live) continue;
      // ALL four metrics count toward liveness (a tool_life_only axis is live via tool_life alone).
      const spreads = [v.rpm_spread_pct, v.feed_spread_pct, v.mrr_spread_pct, v.tool_life_spread_pct].filter((x) => x !== null);
      expect(spreads.length).toBeGreaterThan(0);
      for (const s of spreads) {
        expect(Number.isFinite(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
      }
      // A live axis must have at least one spread above the liveness threshold.
      expect(Math.max(...spreads)).toBeGreaterThan(0.1);
    }
  });
}, RUN_TIMEOUT);
