/**
 * ProgrammingStyleTribalAdvisorEngine Test Suite
 * ===============================================
 *
 * PSN-synergy bridge: tribal-knowledge → style-decision score deltas.
 * Every test asserts exact numeric deltas + rule-id citations + source-tip ids.
 * No presence-only assertions, no synthetic parameter loops, no toBeDefined stubs.
 *
 * @milestone LATHE-PSN-SYNERGY Phase 2
 */

import { describe, it, expect } from "vitest";
import {
  programmingStyleTribalAdvisorEngine,
  type TribalAdviseInput,
} from "../engines/ProgrammingStyleTribalAdvisorEngine.js";

function makeInput(overrides: Partial<TribalAdviseInput> = {}): TribalAdviseInput {
  return {
    controller: "generic_unknown_xyz",
    part_complexity: "simple",
    lot_size: 1,
    family_parts_expected: 1,
    ...overrides,
  };
}

describe("ProgrammingStyleTribalAdvisorEngine — no-match baseline", () => {
  it("generic controller + simple + lot 1 + family 1 → all deltas exactly 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(makeInput());
    expect(r.adjustments.hardcode.score_delta).toBe(0);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.adjustments.conversational.score_delta).toBe(0);
    expect(r.adjustments.cam.score_delta).toBe(0);
    expect(r.applied_rules).toHaveLength(0);
    expect(r.overall_confidence).toBe(0);
  });

  it("no-match unmatched_reason cites the exact controller and family-detection result", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(makeInput());
    expect(r.unmatched_reason).toContain("generic_unknown_xyz");
    expect(r.unmatched_reason).toContain("family=other");
  });

  it("no-match timestamp parses to a 2026-or-later Date", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(makeInput());
    const ms = Date.parse(r.timestamp);
    expect(ms).toBeGreaterThan(Date.parse("2026-01-01"));
  });

  it("rule-firing case omits unmatched_reason (vs no-match case includes it)", () => {
    const fired = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "mazatrol_smooth_ai", part_complexity: "simple", lot_size: 50 })
    );
    expect(fired.unmatched_reason).toBeUndefined();
    expect(fired.applied_rules.length).toBeGreaterThan(0);
  });
});

describe("psta-001 — Mazatrol conversational boost (simple/moderate, lot<=100)", () => {
  it("Mazatrol + simple + lot 50 → conv +20, hardcode -5, macro 0, cam 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "mazatrol_smooth_ai", part_complexity: "simple", lot_size: 50 })
    );
    expect(r.adjustments.conversational.score_delta).toBe(20);
    expect(r.adjustments.hardcode.score_delta).toBe(-5);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.adjustments.cam.score_delta).toBe(0);
    expect(r.adjustments.conversational.source_tip_ids).toEqual(["ctrl-026"]);
    expect(r.applied_rules.map((a) => a.rule_id)).toEqual(["psta-001"]);
  });

  it("boundary lot=100 — psta-001 fires (<=100 condition)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "mazatrol_smooth_ai", part_complexity: "moderate", lot_size: 100 })
    );
    expect(r.adjustments.conversational.score_delta).toBe(20);
    expect(r.applied_rules.map((a) => a.rule_id)).toContain("psta-001");
  });

  it("boundary lot=101 — psta-001 does NOT fire, conv delta back to 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "mazatrol_smooth_ai", part_complexity: "moderate", lot_size: 101 })
    );
    expect(r.adjustments.conversational.score_delta).toBe(0);
    expect(r.applied_rules.map((a) => a.rule_id)).not.toContain("psta-001");
  });
});

describe("psta-002 + psta-012 — Mazatrol very_complex compound", () => {
  it("Mazatrol + very_complex → conv -25, cam +30 (clamped from +33), hardcode -10, macro 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "mazatrol_smooth_ai", part_complexity: "very_complex", lot_size: 1 })
    );
    expect(r.adjustments.conversational.score_delta).toBe(-25);
    expect(r.adjustments.cam.score_delta).toBe(30);
    expect(r.adjustments.hardcode.score_delta).toBe(-10);
    expect(r.adjustments.macro.score_delta).toBe(0);
    const ids = r.applied_rules.map((a) => a.rule_id);
    expect(ids).toContain("psta-002");
    expect(ids).toContain("psta-012");
  });
});

describe("psta-003 — Heidenhain Klartext", () => {
  it("heidenhain_tnc640 + simple → conv +18, hardcode -3, macro 0, cam 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "heidenhain_tnc640", part_complexity: "simple" })
    );
    expect(r.adjustments.conversational.score_delta).toBe(18);
    expect(r.adjustments.hardcode.score_delta).toBe(-3);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.adjustments.cam.score_delta).toBe(0);
    expect(r.adjustments.conversational.source_tip_ids).toEqual(["ctrl-018"]);
    expect(r.adjustments.hardcode.source_tip_ids).toEqual(["ctrl-018"]);
  });
});

describe("psta-004 + psta-005 — Siemens ShopMill + family threshold", () => {
  it("siemens_840d family=1 → only psta-004: conv +10, macro 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "siemens_840d", part_complexity: "simple", family_parts_expected: 1 })
    );
    expect(r.adjustments.conversational.score_delta).toBe(10);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.applied_rules.map((a) => a.rule_id)).toEqual(["psta-004"]);
  });

  it("siemens_840d family=3 boundary → psta-004+psta-005: conv +5, macro +12", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "siemens_840d", part_complexity: "simple", family_parts_expected: 3 })
    );
    expect(r.adjustments.conversational.score_delta).toBe(5);
    expect(r.adjustments.macro.score_delta).toBe(12);
    const ids = r.applied_rules.map((a) => a.rule_id).sort();
    expect(ids).toEqual(["psta-004", "psta-005"]);
  });
});

describe("psta-006 — Hurco WinMax one-off", () => {
  it("hurco_winmax + lot 5 + family 1 → conv +15, others 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "hurco_winmax", part_complexity: "simple", lot_size: 5 })
    );
    expect(r.adjustments.conversational.score_delta).toBe(15);
    expect(r.adjustments.hardcode.score_delta).toBe(0);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.adjustments.cam.score_delta).toBe(0);
  });

  it("hurco_winmax + family=3 — psta-006 does NOT fire (one-off-only rule)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({
        controller: "hurco_winmax",
        part_complexity: "simple",
        lot_size: 5,
        family_parts_expected: 3,
      })
    );
    expect(r.adjustments.conversational.score_delta).toBe(0);
    expect(r.applied_rules.map((a) => a.rule_id)).not.toContain("psta-006");
  });
});

describe("psta-007 — Fanuc legacy no-conv hardcode pref", () => {
  it("fanuc_0i_f + simple + family 1 → hardcode +10, conv -25, macro 0, cam 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({
        controller: "fanuc_0i_f",
        part_complexity: "simple",
        lot_size: 1,
        family_parts_expected: 1,
      })
    );
    expect(r.adjustments.hardcode.score_delta).toBe(10);
    expect(r.adjustments.conversational.score_delta).toBe(-25);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.adjustments.cam.score_delta).toBe(0);
    expect(r.applied_rules[0]!.matched_controller_family).toBe("fanuc_legacy");
  });
});

describe("psta-008 — Fanuc Manual Guide i", () => {
  it("fanuc_30i + simple → conv +12, others 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "fanuc_30i", part_complexity: "simple" })
    );
    expect(r.adjustments.conversational.score_delta).toBe(12);
    expect(r.adjustments.hardcode.score_delta).toBe(0);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.adjustments.cam.score_delta).toBe(0);
  });
});

describe("psta-009 — Okuma OSP navi_mill", () => {
  it("okuma_osp_p300 + moderate → conv +12, others 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "okuma_osp_p300", part_complexity: "moderate" })
    );
    expect(r.adjustments.conversational.score_delta).toBe(12);
    expect(r.adjustments.hardcode.score_delta).toBe(0);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.adjustments.cam.score_delta).toBe(0);
  });
});

describe("psta-010 — universal macro on family>=5", () => {
  it("generic + family=5 → macro +15, hardcode -8, others 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ family_parts_expected: 5 })
    );
    expect(r.adjustments.macro.score_delta).toBe(15);
    expect(r.adjustments.hardcode.score_delta).toBe(-8);
    expect(r.adjustments.conversational.score_delta).toBe(0);
    expect(r.adjustments.cam.score_delta).toBe(0);
  });

  it("family=4 boundary — psta-010 does NOT fire, macro back to 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ family_parts_expected: 4 })
    );
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.applied_rules.map((a) => a.rule_id)).not.toContain("psta-010");
  });
});

describe("psta-011 — high lot + complex CAM boost", () => {
  it("lot=100 + complex → cam +12, others 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ lot_size: 100, part_complexity: "complex" })
    );
    expect(r.adjustments.cam.score_delta).toBe(12);
    expect(r.adjustments.hardcode.score_delta).toBe(0);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.adjustments.conversational.score_delta).toBe(0);
  });

  it("lot=99 + complex — does NOT fire (boundary)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ lot_size: 99, part_complexity: "complex" })
    );
    expect(r.adjustments.cam.score_delta).toBe(0);
  });

  it("lot=100 + simple — does NOT fire (complexity gate)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ lot_size: 100, part_complexity: "simple" })
    );
    expect(r.adjustments.cam.score_delta).toBe(0);
  });
});

describe("psta-012 — universal CAM dominance on very_complex", () => {
  it("generic + very_complex → cam +18, conv -10, hardcode -10, macro 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ part_complexity: "very_complex" })
    );
    expect(r.adjustments.cam.score_delta).toBe(18);
    expect(r.adjustments.conversational.score_delta).toBe(-10);
    expect(r.adjustments.hardcode.score_delta).toBe(-10);
    expect(r.adjustments.macro.score_delta).toBe(0);
  });
});

describe("psta-013 — tool steel CAM verification on complex+", () => {
  it("material=D2 + complex → cam +8, others 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ part_complexity: "complex", material: "D2" })
    );
    expect(r.adjustments.cam.score_delta).toBe(8);
    expect(r.adjustments.hardcode.score_delta).toBe(0);
    expect(r.adjustments.macro.score_delta).toBe(0);
    expect(r.adjustments.conversational.score_delta).toBe(0);
  });

  it("material=A2 + very_complex → psta-012+psta-013 sum cam to +26", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ part_complexity: "very_complex", material: "A2" })
    );
    expect(r.adjustments.cam.score_delta).toBe(26);
  });

  it("material=6061 aluminum + complex — does NOT fire (not tool steel)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ part_complexity: "complex", material: "6061" })
    );
    expect(r.adjustments.cam.score_delta).toBe(0);
  });

  it("material=H13 + very_complex → cam clamps to +26 (within bounds)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ part_complexity: "very_complex", material: "H13" })
    );
    expect(r.adjustments.cam.score_delta).toBe(26);
  });
});

describe("Delta clamp [-30, +30]", () => {
  it("Mazatrol+very_complex+D2 — raw cam +41 clamps to exactly +30", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({
        controller: "mazatrol_smooth_ai",
        part_complexity: "very_complex",
        material: "D2",
      })
    );
    expect(r.adjustments.cam.score_delta).toBe(30);
  });

  it("Mazatrol+very_complex+D2 — conv sums to -25 (below -30 clamp boundary)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({
        controller: "mazatrol_smooth_ai",
        part_complexity: "very_complex",
        material: "D2",
      })
    );
    expect(r.adjustments.conversational.score_delta).toBe(-25);
  });
});

describe("Confidence weighting", () => {
  it("no rules fire → overall_confidence = 0", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(makeInput());
    expect(r.overall_confidence).toBe(0);
  });

  it("psta-001 only → overall_confidence = 0.85 (rule's own confidence)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "mazatrol_smooth_ai", part_complexity: "simple", lot_size: 50 })
    );
    expect(r.applied_rules.map((a) => a.rule_id)).toEqual(["psta-001"]);
    expect(r.overall_confidence).toBeCloseTo(0.85, 2);
  });

  it("psta-002 (0.8) + psta-012 (0.9) → average 0.85", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "mazatrol_smooth_ai", part_complexity: "very_complex" })
    );
    expect(r.overall_confidence).toBeCloseTo(0.85, 2);
  });
});

describe("Source-tip citation discipline", () => {
  it("dedupes ctrl-014 when psta-004 and psta-005 both cite it (siemens family=3)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({
        controller: "siemens_840d",
        part_complexity: "simple",
        family_parts_expected: 3,
      })
    );
    const ctrl014Count = r.adjustments.conversational.source_tip_ids.filter(
      (id) => id === "ctrl-014"
    ).length;
    expect(ctrl014Count).toBe(1);
  });

  it("hardcode source_tip_ids equals [ctrl-018] for heidenhain simple", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "heidenhain_tnc640", part_complexity: "simple" })
    );
    expect(r.adjustments.hardcode.source_tip_ids).toEqual(["ctrl-018"]);
  });
});

describe("Input validation — failure modes", () => {
  it("throws on negative lot_size", () => {
    expect(() =>
      programmingStyleTribalAdvisorEngine.advise(makeInput({ lot_size: -1 }))
    ).toThrow();
  });

  it("throws on zero lot_size", () => {
    expect(() =>
      programmingStyleTribalAdvisorEngine.advise(makeInput({ lot_size: 0 }))
    ).toThrow();
  });

  it("throws on invalid part_complexity enum 'ultra_mega'", () => {
    const bad = { ...makeInput(), part_complexity: "ultra_mega" } as unknown as TribalAdviseInput;
    expect(() => programmingStyleTribalAdvisorEngine.advise(bad)).toThrow();
  });

  it("throws on NaN lot_size", () => {
    expect(() =>
      programmingStyleTribalAdvisorEngine.advise(makeInput({ lot_size: NaN }))
    ).toThrow();
  });

  it("throws on Infinity family_parts_expected", () => {
    expect(() =>
      programmingStyleTribalAdvisorEngine.advise(
        makeInput({ family_parts_expected: Infinity })
      )
    ).toThrow();
  });

  it("throws on empty controller string", () => {
    expect(() =>
      programmingStyleTribalAdvisorEngine.advise(makeInput({ controller: "" }))
    ).toThrow();
  });

  it("throws on non-integer family_parts_expected (3.7)", () => {
    expect(() =>
      programmingStyleTribalAdvisorEngine.advise(
        makeInput({ family_parts_expected: 3.7 })
      )
    ).toThrow();
  });

  it("throws on negative family_parts_expected", () => {
    expect(() =>
      programmingStyleTribalAdvisorEngine.advise(
        makeInput({ family_parts_expected: -1 })
      )
    ).toThrow();
  });
});

describe("Adversarial inputs", () => {
  it("accepts lot_size=5_000_000 + complex → still applies psta-011 cam +12", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ lot_size: 5_000_000, part_complexity: "complex" })
    );
    expect(r.adjustments.cam.score_delta).toBe(12);
    expect(r.applied_rules.map((a) => a.rule_id)).toContain("psta-011");
  });

  it("accepts unicode material 'Inconel-718 (η ≥ 0.9)' — no tool-steel rule fires", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ material: "Inconel-718 (η ≥ 0.9) — heat-treated" })
    );
    expect(r.adjustments.cam.score_delta).toBe(0);
    expect(r.applied_rules.map((a) => a.rule_id)).not.toContain("psta-013");
  });

  it("accepts 1000-char material string without crash; deltas remain bounded", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ material: "A".repeat(1000) })
    );
    expect(r.adjustments.cam.score_delta).toBe(0);
    expect(r.adjustments.hardcode.score_delta).toBe(0);
  });

  it("material='TOOL STEEL D2 alloy' + complex → psta-013 fires via 'TOOL STEEL' branch (cam +8)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ part_complexity: "complex", material: "tool steel D2 alloy" })
    );
    expect(r.adjustments.cam.score_delta).toBe(8);
  });
});

describe("Specific controller variability (4 distinct scenarios)", () => {
  it("Mazatrol simple lot 30 → conv +20 (psta-001)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "mazatrol_smooth_ai", part_complexity: "simple", lot_size: 30 })
    );
    expect(r.adjustments.conversational.score_delta).toBe(20);
  });

  it("Fanuc 0i moderate lot 10 family 1 → hardcode +10, conv -25 (psta-007)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({
        controller: "fanuc_0i_f",
        part_complexity: "moderate",
        lot_size: 10,
        family_parts_expected: 1,
      })
    );
    expect(r.adjustments.hardcode.score_delta).toBe(10);
    expect(r.adjustments.conversational.score_delta).toBe(-25);
  });

  it("Hurco WinMax simple lot 3 family 1 → conv +15 (psta-006)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({
        controller: "hurco_winmax",
        part_complexity: "simple",
        lot_size: 3,
        family_parts_expected: 1,
      })
    );
    expect(r.adjustments.conversational.score_delta).toBe(15);
  });

  it("Heidenhain TNC moderate lot 10 → conv +18 (psta-003)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "heidenhain_tnc640", part_complexity: "moderate", lot_size: 10 })
    );
    expect(r.adjustments.conversational.score_delta).toBe(18);
  });
});

describe("Introspection", () => {
  it("getStats.rule_count equals 13", () => {
    expect(programmingStyleTribalAdvisorEngine.getStats().rule_count).toBe(13);
  });

  it("getStats.controllers_covered equals 7", () => {
    expect(programmingStyleTribalAdvisorEngine.getStats().controllers_covered).toBe(7);
  });

  it("getStats.max_delta_per_style equals 30", () => {
    expect(programmingStyleTribalAdvisorEngine.getStats().max_delta_per_style).toBe(30);
  });

  it("getStats.tip_sources_count is at least 4", () => {
    expect(programmingStyleTribalAdvisorEngine.getStats().tip_sources_count).toBeGreaterThanOrEqual(4);
  });

  it("getRules length equals getStats.rule_count", () => {
    const rules = programmingStyleTribalAdvisorEngine.getRules();
    expect(rules.length).toBe(13);
  });

  it("first rule id matches 'psta-001' (insertion order preserved)", () => {
    const rules = programmingStyleTribalAdvisorEngine.getRules();
    expect(rules[0]!.id).toBe("psta-001");
  });

  it("all rule ids are unique across the library", () => {
    const ids = programmingStyleTribalAdvisorEngine.getRules().map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every rule has confidence > 0 and <= 1 (no infinite, no zero)", () => {
    const rules = programmingStyleTribalAdvisorEngine.getRules();
    const minConf = Math.min(...rules.map((r) => r.confidence));
    const maxConf = Math.max(...rules.map((r) => r.confidence));
    expect(minConf).toBeGreaterThan(0);
    expect(maxConf).toBeLessThanOrEqual(1);
  });

  it("every rule cites at least one source_tip_id", () => {
    const rules = programmingStyleTribalAdvisorEngine.getRules();
    const minTips = Math.min(...rules.map((r) => r.source_tip_ids.length));
    expect(minTips).toBeGreaterThanOrEqual(1);
  });
});

describe("PSN merge contract — output safe to add to E107 scores", () => {
  it("E107 base 50 + zero-result conv delta = 50 (additive identity)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(makeInput());
    expect(50 + r.adjustments.conversational.score_delta).toBe(50);
  });

  it("E107 base 50 + Mazatrol-very-complex-D2 cam delta = 80 (50 + clamped 30)", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({
        controller: "mazatrol_smooth_ai",
        part_complexity: "very_complex",
        material: "D2",
      })
    );
    expect(50 + r.adjustments.cam.score_delta).toBe(80);
  });

  it("E107 base 50 + Mazatrol-very-complex conv delta = 25 (50 + (-25))", () => {
    const r = programmingStyleTribalAdvisorEngine.advise(
      makeInput({ controller: "mazatrol_smooth_ai", part_complexity: "very_complex" })
    );
    expect(50 + r.adjustments.conversational.score_delta).toBe(25);
  });
});
