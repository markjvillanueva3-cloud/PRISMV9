/**
 * AdaptiveThermalEngine -- session-scoped thermal trend (row 7 of the verified SFC fix-plan).
 *
 * The temperature ring was a process-global STATIC: independent jobs arriving through
 * adaptiveControlDispatcher:adaptive_thermal_analyze shared thermal history, so job B's
 * warming/stable trend was computed on job A's temperatures (existing suites hand-called
 * reset() between cases to dodge the bleed). analyze() now takes an optional
 * ThermalTrendSession; the default is per-request FRESH, and a caller that wants trend
 * detection threads the same session across its own calls.
 *
 * The coolant-factor INVERSION found during this unit (the model DIVIDED by the
 * temperature-reduction multipliers, so cryogenic predicted ~3x hotter than dry) is FIXED
 * in the same session (crossroad auto-decide; confirmed backwards by two independent
 * reviewers) -- the ordering test below pins the corrected physics. History: memory
 * reference_oscar_sfc_coolant_inversion_usui_magnitude_2026_07_01 + the CORRECTION header
 * in state/shared/specs/SFC-ROWS-VERIFY-BATCH2-2026-07-01.md.
 */
import { describe, it, expect } from "vitest";
import {
  AdaptiveThermalEngine,
  createThermalTrendSession,
  type ThermalInput,
} from "../engines/AdaptiveThermalEngine.js";

const base: ThermalInput = {
  cuttingSpeed: 200,
  feedRate: 1000,
  depthOfCut: 2,
  toolMaterial: "carbide",
  workMaterial: "steel",
  coolantType: "flood",
};

describe("AdaptiveThermalEngine -- per-request isolation (row 7)", () => {
  it("two independent calls are identical: the second never sees the first call's history", () => {
    const a = AdaptiveThermalEngine.analyze(base);
    const b = AdaptiveThermalEngine.analyze(base);
    expect(b).toEqual(a); // pre-fix, call 2 pushed onto a shared ring and could diverge
  });

  it("15 sequential stateless calls never reach a trend state (no shared ring to accumulate)", () => {
    for (let i = 0; i < 15; i++) {
      const r = AdaptiveThermalEngine.analyze(base);
      // trend states need >=10 ring samples; a fresh per-request session has exactly 1
      expect(["cold", "hot", "critical"]).toContain(r.thermalState);
    }
  });

  it("reset() is a harmless legacy shim (no shared state to clear, does not throw)", () => {
    expect(() => AdaptiveThermalEngine.reset()).not.toThrow();
    const a = AdaptiveThermalEngine.analyze(base);
    AdaptiveThermalEngine.reset();
    expect(AdaptiveThermalEngine.analyze(base)).toEqual(a);
  });
});

describe("AdaptiveThermalEngine -- threaded session accumulates trend", () => {
  it("12 identical calls on ONE session reach 'stable' and record stableTemp", () => {
    const session = createThermalTrendSession();
    let last = AdaptiveThermalEngine.analyze(base, session);
    for (let i = 0; i < 11; i++) last = AdaptiveThermalEngine.analyze(base, session);
    expect(last.thermalState).toBe("stable"); // identical temps -> |recent-older| < 5
    expect(session.stableTemp).not.toBeNull();
    expect(session.tempHistory.length).toBe(12);
  });

  it("rising measured temps on ONE session reach 'warming'", () => {
    const session = createThermalTrendSession();
    let last = AdaptiveThermalEngine.analyze(base, session);
    for (let i = 1; i <= 12; i++) {
      last = AdaptiveThermalEngine.analyze(
        { ...base, measuredToolTemp: 100 + i * 25 }, session); // 125..400 C, below hot band
    }
    expect(last.thermalState).toBe("warming");
    expect(last.compensations.feedAdjust).toBe(-5);
  });

  it("a long session (>20 samples) earns the history confidence bump vs a fresh call", () => {
    const session = createThermalTrendSession();
    let last = AdaptiveThermalEngine.analyze(base, session);
    for (let i = 0; i < 24; i++) last = AdaptiveThermalEngine.analyze(base, session);
    const fresh = AdaptiveThermalEngine.analyze(base);
    expect(last.confidence).toBeCloseTo(fresh.confidence + 0.05, 8);
  });

  it("two DIFFERENT sessions do not contaminate each other", () => {
    const hotJob = createThermalTrendSession();
    const coldJob = createThermalTrendSession();
    for (let i = 0; i < 12; i++) {
      AdaptiveThermalEngine.analyze({ ...base, measuredToolTemp: 100 + i * 25 }, hotJob);
    }
    const r = AdaptiveThermalEngine.analyze(base, coldJob);
    expect(["cold", "hot", "critical"]).toContain(r.thermalState); // 1 sample -> no trend
    expect(coldJob.tempHistory.length).toBe(1);
  });
});

describe("AdaptiveThermalEngine -- absolute thermal references (session-independent)", () => {
  it("tempMargin is (limit - temp)/limit: measured 400 C on carbide (800 C limit) -> 0.5", () => {
    const r = AdaptiveThermalEngine.analyze({ ...base, measuredToolTemp: 400 });
    expect(r.toolTempLimit).toBe(800);
    expect(r.tempMargin).toBeCloseTo(0.5, 3);
  });

  it("measured 790 C on carbide is critical: pause_cooldown, safetyScore 0.2, warning raised", () => {
    const r = AdaptiveThermalEngine.analyze({ ...base, measuredToolTemp: 790 });
    expect(r.thermalState).toBe("critical"); // > 0.95 * 800
    expect(r.recommendedAction).toBe("pause_cooldown"); // <= limit, so not emergency_stop
    expect(r.safetyScore).toBe(0.2);
    expect(r.warnings.some((w) => w.includes("CRITICAL"))).toBe(true);
  });

  it("measured 700 C on carbide is hot: reduce_speed (coolant present) + feed/speed derates", () => {
    const r = AdaptiveThermalEngine.analyze({ ...base, measuredToolTemp: 700 });
    expect(r.thermalState).toBe("hot"); // > 0.85 * 800, < 0.95 * 800
    expect(r.recommendedAction).toBe("reduce_speed");
    expect(r.compensations.feedAdjust).toBe(-20);
    expect(r.compensations.speedAdjust).toBe(-15);
  });

  it("thermal expansion compensation offsets DOWN (negative z) and totals the three sources", () => {
    const r = AdaptiveThermalEngine.analyze({ ...base, measuredToolTemp: 400 });
    expect(r.compensations.zOffset).toBeLessThan(0);
    const e = r.thermalExpansion;
    expect(e.total).toBeCloseTo(e.tool + e.work + e.spindle, 2);
  });

  it("adversarial: schema rejects out-of-range inputs (zero speed, absurd temp)", () => {
    expect(() => AdaptiveThermalEngine.analyze({ ...base, cuttingSpeed: 0 })).toThrow();
    expect(() =>
      AdaptiveThermalEngine.analyze({ ...base, measuredToolTemp: 5000 })).toThrow();
  });

  it("coolant physics ordering: dry hotter than flood hotter than cryogenic (inversion fixed)", () => {
    // Pre-fix the model DIVIDED by the reduction factors: cryogenic (0.25) predicted ~3x
    // HOTTER than dry -- exactly backwards. Post-fix the heat term multiplies, so better
    // cooling strictly lowers the estimated temperature. Fails loudly on a revert.
    const dry = AdaptiveThermalEngine.analyze({ ...base, coolantType: "none" });
    const flood = AdaptiveThermalEngine.analyze({ ...base, coolantType: "flood" });
    const cryo = AdaptiveThermalEngine.analyze({ ...base, coolantType: "cryogenic" });
    expect(dry.estimatedCuttingTemp).toBeGreaterThan(flood.estimatedCuttingTemp);
    expect(flood.estimatedCuttingTemp).toBeGreaterThan(cryo.estimatedCuttingTemp);
    // dry (factor 1.0) is the unchanged baseline: heat term at Vc=200/f=1000/d=2 steel
    // = 4.0 * 200^0.4 * 1^0.2 * 2^0.1 = ~35.7C above ambient 20C -> ~56C
    expect(dry.estimatedCuttingTemp).toBeGreaterThan(50);
    expect(dry.estimatedCuttingTemp).toBeLessThan(62);
  });
});
