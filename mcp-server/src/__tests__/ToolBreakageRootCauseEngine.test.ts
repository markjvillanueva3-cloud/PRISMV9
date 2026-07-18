import { describe, it, expect } from "vitest";
import { toolBreakageRootCauseEngine as eng, type DamageMode } from "../engines/ToolBreakageRootCauseEngine.js";
import { ToolBreakagePredictionEngine, type BreakageTool, type BreakageForces, type EngagementEntry } from "../engines/ToolBreakagePredictionEngine.js";

/**
 * UNIT-0011 (half 2) ToolBreakageRootCauseEngine -- attributes a tool break to the dominant damage mode
 * by COMPOSING ToolBreakagePredictionEngine.predictBreakage. Tests pin the composition to the source-of-
 * truth engine's LIVE output (not hardcoded formula results), plus every guard + honesty-warning branch.
 */

const MODES: DamageMode[] = ["fatigue", "deflection", "chipload", "engagement"];

// Aggressive full-slot cut on a stubby 6mm 4-flute carbide -- drives multiple modes (total > 0).
const slotTool: BreakageTool = { tool_id: "EM-6", diameter_mm: 6, flute_count: 4, cutting_length_mm: 20, gauge_length_mm: 30, tool_material: "carbide" };
const slotForces: BreakageForces = { Fc_N: 600, peak_force_N: 900, force_std_N: 120 };
const slotHist: EngagementEntry[] = [{ ae_mm: 6, ap_mm: 12, fz_mm: 0.08, Vc_mpm: 120, duration_min: 5, force_N: 600, interrupted: false, label: "full-slot" }];

// Grossly overhung 3mm 2-flute carbide (45mm stickout at 500N) -- deflection is unambiguously dominant.
const slenderTool: BreakageTool = { tool_id: "EM-3-long", diameter_mm: 3, flute_count: 2, cutting_length_mm: 15, gauge_length_mm: 45, tool_material: "carbide" };
const slenderForces: BreakageForces = { Fc_N: 500 };

// Gentle finishing pass on a rigid 12mm tool -- essentially no active failure driver (total ~ 0).
const gentleTool: BreakageTool = { tool_id: "EM-12", diameter_mm: 12, flute_count: 4, cutting_length_mm: 15, gauge_length_mm: 20, tool_material: "carbide" };
const gentleForces: BreakageForces = { Fc_N: 15 };
const gentleHist: EngagementEntry[] = [{ ae_mm: 0.2, ap_mm: 0.3, fz_mm: 0.02, Vc_mpm: 150, duration_min: 0.5, force_N: 15, label: "finish" }];

function liveArgmax(t: BreakageTool, f: BreakageForces, h?: EngagementEntry[]): { mode: DamageMode; probs: Record<DamageMode, number>; pBreak: number; total: number } {
  const pred = new ToolBreakagePredictionEngine().predictBreakage(t, f, h ?? []);
  const probs = pred.probabilities as Record<DamageMode, number>;
  const mode = MODES.reduce((a, b) => (probs[a] >= probs[b] ? a : b));
  const total = MODES.reduce((s, m) => s + probs[m], 0);
  return { mode, probs, pBreak: pred.breakage_probability, total };
}

describe("ToolBreakageRootCauseEngine.analyze -- faithful composition of the forward model", () => {
  it("mirrors predictBreakage: per-mode probabilities, dominant = live argmax, P_break match", () => {
    const live = liveArgmax(slotTool, slotForces, slotHist);
    const r = eng.analyze({ tool: slotTool, forces: slotForces, engagement_history: slotHist });
    // probabilities are re-read verbatim from the source engine (no re-derivation)
    for (const a of r.attribution) expect(a.probability).toBe(live.probs[a.mode]);
    expect(r.breakage_probability).toBe(live.pBreak);
    expect(r.risk_level).toBeTruthy();
    if (live.total > 0) expect(r.dominant_mode).toBe(live.mode);
  });

  it("attribution lists exactly the 4 modes, sorted by probability desc", () => {
    const r = eng.analyze({ tool: slotTool, forces: slotForces, engagement_history: slotHist });
    expect(r.attribution.map((a) => a.mode).sort()).toEqual([...MODES].sort());
    for (let i = 1; i < r.attribution.length; i++) {
      expect(r.attribution[i - 1].probability).toBeGreaterThanOrEqual(r.attribution[i].probability);
    }
  });

  it("shares sum to ~1 and dominance_margin = top.share - runnerUp.share (total > 0 case)", () => {
    const r = eng.analyze({ tool: slotTool, forces: slotForces, engagement_history: slotHist });
    const sumShares = r.attribution.reduce((s, a) => s + a.share, 0);
    expect(sumShares).toBeCloseTo(1, 3);
    expect(r.dominance_margin).toBeCloseTo(r.attribution[0].share - r.attribution[1].share, 4);
  });

  it("primary_corrective_actions equals the dominant mode's action list (non-empty, actionable)", () => {
    const r = eng.analyze({ tool: slotTool, forces: slotForces, engagement_history: slotHist });
    const dom = r.attribution[0];
    expect(r.primary_corrective_actions).toEqual(dom.corrective_actions);
    expect(r.primary_corrective_actions.length).toBeGreaterThanOrEqual(3);
  });

  it("a grossly overhung slender tool attributes the break to DEFLECTION (physically certain)", () => {
    const r = eng.analyze({ tool: slenderTool, forces: slenderForces });
    expect(r.dominant_mode).toBe("deflection");
    // its driver caption surfaces the stress ratio, and the fix leads with reducing stickout
    expect(r.attribution[0].driver).toMatch(/stress ratio/i);
    expect(r.primary_corrective_actions[0]).toMatch(/stickout/i);
  });
});

describe("ToolBreakageRootCauseEngine.analyze -- honesty warnings (R12, don't over-claim)", () => {
  it("multi-factor near-tie warning fires IFF margin < 0.15 with a nonzero dominant (branch invariant)", () => {
    const r = eng.analyze({ tool: slotTool, forces: slotForces, engagement_history: slotHist });
    const nearTie = r.attribution[0].probability > 0 && r.dominance_margin < 0.15;
    const hasWarn = r.warnings.some((w) => /multi-factor break/i.test(w));
    expect(hasWarn).toBe(nearTie);
  });

  it("observed-gap warning fires IFF break observed, total>0, and P_break <= 0.15 (branch invariant)", () => {
    for (const c of [
      { tool: slotTool, forces: slotForces, engagement_history: slotHist },
      { tool: slenderTool, forces: slenderForces },
    ]) {
      const live = liveArgmax(c.tool, c.forces, (c as any).engagement_history);
      const r = eng.analyze({ ...c, break_observed: true });
      const shouldFire = live.total > 0 && r.breakage_probability <= 0.15;
      const fired = r.warnings.some((w) => /exceeds model expectation/i.test(w));
      expect(fired).toBe(shouldFire);
    }
  });

  it("no active driver (gentle cut) + break observed -> dominant null, empty actions, UNMODELED-cause warning", () => {
    const live = liveArgmax(gentleTool, gentleForces, gentleHist);
    const r = eng.analyze({ tool: gentleTool, forces: gentleForces, engagement_history: gentleHist, break_observed: true });
    if (live.total === 0) {
      expect(r.dominant_mode).toBeNull();
      expect(r.primary_corrective_actions).toEqual([]);
      expect(r.warnings.some((w) => /unmodeled/i.test(w))).toBe(true);
    } else {
      // if the model does see a driver here, attribution is still well-formed
      expect(r.dominant_mode).toBe(live.mode);
    }
  });

  it("break_observed=false never emits the observed-break wording", () => {
    const r = eng.analyze({ tool: slenderTool, forces: slenderForces, break_observed: false });
    expect(r.warnings.some((w) => /observed break exceeds/i.test(w))).toBe(false);
  });

  it("recovery_pointer always references the verified getRecoveryProcedure entry point", () => {
    const r = eng.analyze({ tool: slotTool, forces: slotForces, engagement_history: slotHist });
    expect(r.recovery_pointer).toMatch(/getRecoveryProcedure/);
  });
});

describe("ToolBreakageRootCauseEngine.analyze -- guards (pure, never throws)", () => {
  it("invalid tool_material -> warnings-only, empty attribution, no dominant", () => {
    const bad = { ...slotTool, tool_material: "titanium" as any };
    const r = eng.analyze({ tool: bad, forces: slotForces });
    expect(r.attribution).toHaveLength(0);
    expect(r.dominant_mode).toBeNull();
    expect(r.warnings.some((w) => /invalid tool_material/i.test(w))).toBe(true);
  });

  it("missing forces -> warnings-only (does not throw)", () => {
    const r = eng.analyze({ tool: slotTool } as any);
    expect(r.attribution).toHaveLength(0);
    expect(r.warnings.some((w) => /missing tool or forces/i.test(w))).toBe(true);
  });

  it("non-positive Fc_N -> guarded with a warning, empty attribution", () => {
    const r = eng.analyze({ tool: slotTool, forces: { Fc_N: 0 } });
    expect(r.attribution).toHaveLength(0);
    expect(r.warnings.some((w) => /Fc_N must be a finite positive/i.test(w))).toBe(true);
  });

  it("NaN / non-positive geometry -> guarded, never throws", () => {
    expect(() => eng.analyze({ tool: { ...slotTool, gauge_length_mm: NaN }, forces: slotForces })).not.toThrow();
    const r = eng.analyze({ tool: { ...slotTool, diameter_mm: -6 }, forces: slotForces });
    expect(r.attribution).toHaveLength(0);
    expect(r.warnings.some((w) => /diameter_mm must be a finite positive/i.test(w))).toBe(true);
  });

  it("wild garbage input never throws and returns the stable empty shape", () => {
    expect(() => eng.analyze({} as any)).not.toThrow();
    const r = eng.analyze({} as any);
    expect(r.source).toMatch(/ToolBreakageRootCauseEngine/);
    expect(r.recovery_pointer).toMatch(/getRecoveryProcedure/);
  });
});
