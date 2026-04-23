/**
 * CAMOptimizationSuggestionEngine — U-CAM103 unit tests
 * ======================================================
 *
 * Verifies goal-specific suggestion generators, the safety guard that
 * rejects suggestions raising any predictor past PRIORITY_HIGH, the
 * apply-patch path, per-target encoders, and per-session statistics.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMOptimizationSuggestionEngine,
  SuggestionTargetSchema,
  SuggestionReportSchema,
  DEFAULT_LIMITS,
  applyPatch,
  isSafe,
  mrrOf,
} from "../engines/CAMOptimizationSuggestionEngine.js";
import type { ToolpathSegment } from "../engines/CAMMachiningErrorPredictionEngine.js";

const E = CAMOptimizationSuggestionEngine;

function seg(overrides: Partial<ToolpathSegment> = {}): ToolpathSegment {
  return {
    segment_index: overrides.segment_index ?? 0,
    rpm: overrides.rpm ?? 6000,
    fz_mm: overrides.fz_mm ?? 0.05,
    ap_mm: overrides.ap_mm ?? 1.5,
    ae_mm: overrides.ae_mm ?? 0.6,
    tool_diameter_mm: overrides.tool_diameter_mm ?? 6,
    tool_stickout_mm: overrides.tool_stickout_mm ?? 18,
    flutes: overrides.flutes ?? 4,
    kc1_1: overrides.kc1_1 ?? 1800,
    mc: overrides.mc ?? 0.25,
    tool_load_limit_n: overrides.tool_load_limit_n ?? 1500,
    ra_target_um: overrides.ra_target_um,
    coolant_lpm: overrides.coolant_lpm ?? 20,
  };
}

beforeEach(() => {
  E.resetAll();
});

// ── 1. Enumeration & defaults ────────────────────────────────────────────────

describe("U-CAM103 — supported targets and goals", () => {
  it("supportedTargets returns 5 targets", () => {
    expect(E.supportedTargets().sort()).toEqual([
      "fusion360", "generic", "hypermill", "inventor_hsm", "mastercam",
    ]);
  });

  it("supportedGoals returns the 3 goals", () => {
    expect(E.supportedGoals().sort()).toEqual([
      "cycle_time", "surface_finish", "tool_life",
    ]);
  });

  it("DEFAULT_LIMITS are sane and frozen", () => {
    expect(DEFAULT_LIMITS.rpm_max).toBeGreaterThan(DEFAULT_LIMITS.rpm_min);
    expect(DEFAULT_LIMITS.fz_max_mm).toBeGreaterThan(DEFAULT_LIMITS.fz_min_mm);
    expect(Object.isFrozen(DEFAULT_LIMITS)).toBe(true);
  });

  it("SuggestionTargetSchema rejects unknown targets", () => {
    expect(() => SuggestionTargetSchema.parse("siemens_nx")).toThrow();
  });
});

// ── 2. mrrOf / applyPatch / isSafe primitives ────────────────────────────────

describe("U-CAM103 — primitive helpers", () => {
  it("mrrOf computes ap·ae·rpm·flutes·fz", () => {
    expect(mrrOf(seg())).toBeCloseTo(1.5 * 0.6 * 6000 * 4 * 0.05, 3);
  });

  it("applyPatch is a sparse override that preserves untouched fields", () => {
    const baseline = seg({ rpm: 6000, fz_mm: 0.05 });
    const patched = applyPatch(baseline, { rpm: 8000 });
    expect(patched.rpm).toBe(8000);
    expect(patched.fz_mm).toBe(0.05);
    expect(patched.tool_diameter_mm).toBe(baseline.tool_diameter_mm);
  });

  it("applyPatch with empty patch returns equivalent segment", () => {
    const baseline = seg();
    const patched = applyPatch(baseline, {});
    expect(patched).toEqual(baseline);
  });

  it("isSafe returns true for a conservative baseline", () => {
    expect(isSafe(seg({ ap_mm: 0.5, fz_mm: 0.03, ae_mm: 0.5 }))).toBe(true);
  });

  it("isSafe returns false when load exceeds tool limit", () => {
    expect(isSafe(seg({ ap_mm: 8, fz_mm: 0.2, tool_load_limit_n: 50 }))).toBe(false);
  });
});

// ── 3. cycle_time goal ───────────────────────────────────────────────────────

describe("U-CAM103 — recommend(cycle_time)", () => {
  it("emits at least one suggestion when there is MRR headroom", () => {
    const r = E.recommend("s1", seg({ ap_mm: 0.5, fz_mm: 0.03, ae_mm: 0.4 }), "cycle_time");
    expect(r.suggestion_count).toBeGreaterThan(0);
  });

  it("all suggestions have improvement > 0", () => {
    const r = E.recommend("s1", seg({ ap_mm: 0.5, fz_mm: 0.03, ae_mm: 0.4 }), "cycle_time");
    for (const sg of r.suggestions) expect(sg.improvement).toBeGreaterThan(0);
  });

  it("ranks suggestions by improvement desc", () => {
    const r = E.recommend("s1", seg({ ap_mm: 0.5, fz_mm: 0.03, ae_mm: 0.4 }), "cycle_time");
    for (let i = 1; i < r.suggestions.length; i++) {
      expect(r.suggestions[i].improvement).toBeLessThanOrEqual(
        r.suggestions[i - 1].improvement,
      );
    }
  });

  it("emits no unsafe suggestions (all patched segments safe)", () => {
    const baseline = seg({ ap_mm: 0.5, fz_mm: 0.03, ae_mm: 0.4 });
    const r = E.recommend("s1", baseline, "cycle_time");
    for (const sg of r.suggestions) {
      const patched = applyPatch(baseline, sg.patch);
      expect(isSafe(patched)).toBe(true);
    }
  });

  it("emits zero suggestions when baseline is already at limits", () => {
    const r = E.recommend("s1", seg({
      rpm: DEFAULT_LIMITS.rpm_max,
      fz_mm: DEFAULT_LIMITS.fz_max_mm,
      ae_mm: DEFAULT_LIMITS.ae_max_mm,
    }), "cycle_time");
    // All bumps would exceed limits and clamp to current → no patch produced
    expect(r.suggestion_count).toBe(0);
  });

  it("respects topN cap", () => {
    const r = E.recommend("s1", seg({ ap_mm: 0.3, fz_mm: 0.02, ae_mm: 0.3 }), "cycle_time", DEFAULT_LIMITS, 1);
    expect(r.suggestion_count).toBeLessThanOrEqual(1);
  });

  it("filters out unsafe rpm bump on heavily loaded segment", () => {
    // Tool load limit very low → any bump would push tool_overload severity high
    const r = E.recommend("s1", seg({
      ap_mm: 4, fz_mm: 0.15, tool_load_limit_n: 350,
    }), "cycle_time");
    for (const sg of r.suggestions) {
      // No suggestion should bump fz higher than baseline if it would be unsafe
      expect(isSafe(applyPatch(seg({
        ap_mm: 4, fz_mm: 0.15, tool_load_limit_n: 350,
      }), sg.patch))).toBe(true);
    }
  });
});

// ── 4. tool_life goal ────────────────────────────────────────────────────────

describe("U-CAM103 — recommend(tool_life)", () => {
  it("returns rpm-down and fz-down suggestions", () => {
    const r = E.recommend("s1", seg(), "tool_life");
    const drivers = r.suggestions.map(s => s.driver).sort();
    expect(drivers).toContain("rpm");
    expect(drivers).toContain("fz_mm");
  });

  it("rpm-down suggestion patches rpm to a lower value", () => {
    const r = E.recommend("s1", seg({ rpm: 8000 }), "tool_life");
    const rpmSg = r.suggestions.find(s => s.driver === "rpm");
    expect(rpmSg).toBeDefined();
    expect(rpmSg!.patch.rpm!).toBeLessThan(8000);
  });

  it("fz-down suggestion patches fz to a lower value", () => {
    const r = E.recommend("s1", seg({ fz_mm: 0.10 }), "tool_life");
    const fzSg = r.suggestions.find(s => s.driver === "fz_mm");
    expect(fzSg).toBeDefined();
    expect(fzSg!.patch.fz_mm!).toBeLessThan(0.10);
  });

  it("emits no rpm suggestion when already at rpm_min", () => {
    const r = E.recommend("s1", seg({ rpm: DEFAULT_LIMITS.rpm_min }), "tool_life");
    expect(r.suggestions.find(s => s.driver === "rpm")).toBeUndefined();
  });

  it("emits no fz suggestion when already at fz_min", () => {
    const r = E.recommend("s1", seg({ fz_mm: DEFAULT_LIMITS.fz_min_mm }), "tool_life");
    expect(r.suggestions.find(s => s.driver === "fz_mm")).toBeUndefined();
  });

  it("ranks suggestions by improvement desc", () => {
    const r = E.recommend("s1", seg(), "tool_life");
    for (let i = 1; i < r.suggestions.length; i++) {
      expect(r.suggestions[i].improvement).toBeLessThanOrEqual(
        r.suggestions[i - 1].improvement,
      );
    }
  });
});

// ── 5. surface_finish goal ───────────────────────────────────────────────────

describe("U-CAM103 — recommend(surface_finish)", () => {
  it("emits no suggestions when no Ra target supplied", () => {
    const r = E.recommend("s1", seg({ ra_target_um: undefined }), "surface_finish");
    expect(r.suggestion_count).toBe(0);
  });

  it("emits no suggestions when current Ra already meets target", () => {
    // tiny fz, generous Ra target → already passes
    const r = E.recommend("s1", seg({ fz_mm: 0.005, ra_target_um: 6.3 }), "surface_finish");
    expect(r.suggestion_count).toBe(0);
  });

  it("emits an fz-down suggestion when Ra exceeds target", () => {
    const r = E.recommend("s1", seg({ fz_mm: 0.20, ra_target_um: 1.6 }), "surface_finish");
    expect(r.suggestion_count).toBeGreaterThan(0);
    expect(r.suggestions[0].driver).toBe("fz_mm");
    expect(r.suggestions[0].patch.fz_mm!).toBeLessThan(0.20);
  });

  it("the suggested fz brings Ra under the target", () => {
    const baseline = seg({ fz_mm: 0.20, ra_target_um: 1.6, tool_diameter_mm: 6 });
    const r = E.recommend("s1", baseline, "surface_finish");
    const sg = r.suggestions[0];
    const r_mm = 0.05 * baseline.tool_diameter_mm;
    const newFz = sg.patch.fz_mm!;
    const newRa = (newFz * newFz) / (32 * r_mm) * 1000;
    expect(newRa).toBeLessThanOrEqual(baseline.ra_target_um!);
  });
});

// ── 6. recommendAll composition ──────────────────────────────────────────────

describe("U-CAM103 — recommendAll()", () => {
  it("returns one report per goal keyed correctly", () => {
    const all = E.recommendAll("s1", seg({ fz_mm: 0.10, ra_target_um: 1.6 }));
    expect(Object.keys(all).sort()).toEqual(["cycle_time", "surface_finish", "tool_life"]);
    expect(all.cycle_time.goal).toBe("cycle_time");
    expect(all.tool_life.goal).toBe("tool_life");
    expect(all.surface_finish.goal).toBe("surface_finish");
  });

  it("each report validates against SuggestionReportSchema", () => {
    const all = E.recommendAll("s1", seg({ fz_mm: 0.10, ra_target_um: 1.6 }));
    for (const r of Object.values(all)) {
      expect(() => SuggestionReportSchema.parse(r)).not.toThrow();
    }
  });
});

// ── 7. applySuggestion ───────────────────────────────────────────────────────

describe("U-CAM103 — applySuggestion()", () => {
  it("returns a new segment with the patch applied", () => {
    const baseline = seg({ rpm: 6000 });
    const patched = E.applySuggestion("s1", baseline, {
      goal: "tool_life",
      driver: "rpm",
      improvement: 0.1,
      description: "test",
      patch: { rpm: 5400 },
      rationale: "test",
    });
    expect(patched.rpm).toBe(5400);
  });

  it("increments applied counter in stats", () => {
    const baseline = seg();
    E.applySuggestion("s1", baseline, {
      goal: "tool_life", driver: "rpm", improvement: 0.1,
      description: "x", patch: { rpm: 5400 }, rationale: "x",
    });
    E.applySuggestion("s1", baseline, {
      goal: "tool_life", driver: "rpm", improvement: 0.1,
      description: "x", patch: { rpm: 5000 }, rationale: "x",
    });
    expect(E.getStats("s1").applied).toBe(2);
  });

  it("rejects suggestion with negative improvement via schema", () => {
    expect(() =>
      E.applySuggestion("s1", seg(), {
        goal: "tool_life", driver: "rpm", improvement: -0.1,
        description: "x", patch: { rpm: 5000 }, rationale: "x",
      }),
    ).toThrow();
  });
});

// ── 8. Encoders ──────────────────────────────────────────────────────────────

describe("U-CAM103 — encodeReport() per-target", () => {
  const sample = (): ReturnType<typeof E.recommend> => {
    E.resetAll();
    return E.recommend("s1", seg({ ap_mm: 0.5, fz_mm: 0.03, ae_mm: 0.4 }), "cycle_time");
  };

  it("hyperMILL encoding emits XML envelope with goal attribute", () => {
    const r = sample();
    const xml = E.encodeReport(r, "hypermill");
    expect(xml).toContain('<suggestionReport');
    expect(xml).toContain('goal="cycle_time"');
    expect(xml).toContain("</suggestionReport>");
  });

  it("Fusion 360 encoding emits JSON-RPC 2.0 envelope", () => {
    const r = sample();
    const obj = JSON.parse(E.encodeReport(r, "fusion360"));
    expect(obj.jsonrpc).toBe("2.0");
    expect(obj.method).toBe("cam.optimizationSuggestions");
    expect(obj.params.goal).toBe("cycle_time");
  });

  it("Inventor encoding emits typed JSON", () => {
    const r = sample();
    const obj = JSON.parse(E.encodeReport(r, "inventor_hsm"));
    expect(obj.type).toBe("hsm.optimizationSuggestions");
    expect(obj.goal).toBe("cycle_time");
  });

  it("Mastercam encoding emits pipe-delimited rows with header", () => {
    const r = sample();
    const out = E.encodeReport(r, "mastercam");
    const lines = out.split("\n");
    expect(lines[0].startsWith("OPTIMIZE|s1|cycle_time|")).toBe(true);
    expect(lines.length).toBe(1 + r.suggestion_count);
  });

  it("generic encoding emits tagged envelope", () => {
    const r = sample();
    const obj = JSON.parse(E.encodeReport(r, "generic"));
    expect(obj.type).toBe("optimization_report");
    expect(obj.goal).toBe(r.goal);
  });

  it("encodeReport rejects unknown target", () => {
    const r = sample();
    expect(() => E.encodeReport(r, "powermill" as never)).toThrow();
  });
});

// ── 9. Per-session statistics ────────────────────────────────────────────────

describe("U-CAM103 — getStats() per-session", () => {
  it("zeroed snapshot for unseen session", () => {
    const s = E.getStats("never-seen");
    expect(s.recommends).toBe(0);
    expect(s.suggestions_emitted).toBe(0);
    expect(s.applied).toBe(0);
    expect(Object.values(s.per_goal_count).every(v => v === 0)).toBe(true);
  });

  it("recommends counter increments per recommend()", () => {
    E.recommend("s1", seg(), "cycle_time");
    E.recommend("s1", seg(), "tool_life");
    expect(E.getStats("s1").recommends).toBe(2);
  });

  it("per_goal_count tracks tool_life suggestions", () => {
    E.recommend("s1", seg(), "tool_life");
    expect(E.getStats("s1").per_goal_count.tool_life).toBeGreaterThan(0);
  });

  it("sessions are isolated", () => {
    E.recommend("a", seg(), "tool_life");
    E.recommend("b", seg(), "tool_life");
    E.recommend("b", seg(), "cycle_time");
    expect(E.getStats("a").recommends).toBe(1);
    expect(E.getStats("b").recommends).toBe(2);
  });

  it("getStats returns a defensive copy of per_goal_count", () => {
    E.recommend("s1", seg(), "tool_life");
    const s = E.getStats("s1");
    s.per_goal_count.tool_life = 999;
    expect(E.getStats("s1").per_goal_count.tool_life).toBeLessThan(999);
  });
});

// ── 10. Reset lifecycle ──────────────────────────────────────────────────────

describe("U-CAM103 — reset lifecycle", () => {
  it("resetSession clears one session, preserves others", () => {
    E.recommend("a", seg(), "tool_life");
    E.recommend("b", seg(), "tool_life");
    E.resetSession("a");
    expect(E.getStats("a").recommends).toBe(0);
    expect(E.getStats("b").recommends).toBe(1);
  });

  it("resetAll clears every session", () => {
    E.recommend("a", seg(), "tool_life");
    E.recommend("b", seg(), "tool_life");
    E.resetAll();
    expect(E.getStats("a").recommends).toBe(0);
    expect(E.getStats("b").recommends).toBe(0);
  });
});

// ── 11. Validation guards ────────────────────────────────────────────────────

describe("U-CAM103 — input validation", () => {
  it("recommend rejects topN <= 0", () => {
    expect(() => E.recommend("s", seg(), "tool_life", DEFAULT_LIMITS, 0)).toThrow();
    expect(() => E.recommend("s", seg(), "tool_life", DEFAULT_LIMITS, -1)).toThrow();
  });

  it("recommend rejects unknown goal", () => {
    expect(() =>
      E.recommend("s", seg(), "throughput" as never, DEFAULT_LIMITS),
    ).toThrow();
  });

  it("recommend rejects malformed limits (rpm_min > rpm_max not enforced — schema only checks positivity)", () => {
    // Only schema rejection: negative rpm_max should throw
    expect(() =>
      E.recommend("s", seg(), "tool_life", { ...DEFAULT_LIMITS, rpm_max: -1 } as never),
    ).toThrow();
  });
});
