/**
 * TribalKnowledgeApplicatorEngine.test.ts — U-CAMAGI12 (CADCAM-DAGI-MS4)
 *
 * Verifies the Wisdom-Synthesis engine: strategy scoring against tribal/playbook
 * constraints, ranking, naive-vs-tribal improvement metric, the playbook bridge,
 * rationale synthesis, and adversarial robustness. Every assertion checks a real
 * invariant or reference value — no toBeDefined() stubs.
 */
import { describe, it, expect } from "vitest";
import {
  TribalKnowledgeApplicatorEngine,
  tribalKnowledgeApplicatorEngine,
  type TribalConstraint,
  type StrategyCandidate,
  type PlaybookRuleLike,
} from "../engines/TribalKnowledgeApplicatorEngine.js";

const fresh = () => new TribalKnowledgeApplicatorEngine();

/** Critical feed cap: feed_mm_rev must not exceed 0.3. */
const FEED_CAP: TribalConstraint = {
  id: "TW-FEED-CAP",
  severity: "critical",
  description: "thin-wall finishing tears above 0.3 mm/rev",
  appliesTo: "feed_mm_rev",
  max: 0.3,
};
/** Important minimum rpm. */
const RPM_FLOOR: TribalConstraint = {
  id: "BUE-RPM-FLOOR",
  severity: "important",
  description: "built-up edge below 1200 rpm in aluminum",
  appliesTo: "rpm",
  min: 1200,
};

describe("TribalKnowledgeApplicatorEngine", () => {
  describe("apply — core scoring & ranking", () => {
    it("returns an empty, null-chosen result for zero candidates", () => {
      const r = fresh().apply({ candidates: [], constraints: [FEED_CAP] });
      expect(r.ranked).toEqual([]);
      expect(r.chosen).toBeNull();
      expect(r.naivePick).toBeNull();
      expect(r.improvementPct).toBe(0);
      expect(r.tribalRationale).toContain("No strategy candidates");
    });

    it("a single clean candidate keeps its full baseScore (tribalScore 1)", () => {
      const c: StrategyCandidate = { id: "s1", name: "clean", baseScore: 0.82, params: { feed_mm_rev: 0.2 } };
      const r = fresh().apply({ candidates: [c], constraints: [FEED_CAP] });
      expect(r.chosen?.id).toBe("s1");
      expect(r.chosen?.tribalScore).toBeCloseTo(1, 5);
      expect(r.chosen?.combinedScore).toBeCloseTo(0.82, 5);
    });

    it("ABORT-CRITERION INVARIANT: tribal application never worsens a clean strategy", () => {
      // A clean strategy's combined score must equal its base score exactly.
      const c: StrategyCandidate = { id: "s1", name: "sound", baseScore: 0.7, params: { feed_mm_rev: 0.1, rpm: 3000 } };
      const r = fresh().apply({ candidates: [c], constraints: [FEED_CAP, RPM_FLOOR] });
      expect(r.chosen?.combinedScore).toBeCloseTo(r.chosen!.baseScore, 5);
    });

    it("a critical violation halves the tribalScore (penalty 0.5)", () => {
      const c: StrategyCandidate = { id: "s1", name: "fast", baseScore: 0.8, params: { feed_mm_rev: 0.5 } };
      const r = fresh().apply({ candidates: [c], constraints: [FEED_CAP] });
      expect(r.chosen?.tribalScore).toBeCloseTo(0.5, 5);
      expect(r.chosen?.combinedScore).toBeCloseTo(0.4, 5); // 0.8 * 0.5
      expect(r.chosen?.violations).toHaveLength(1);
      expect(r.chosen?.violations[0].constraintId).toBe("TW-FEED-CAP");
    });

    it("ranks a lower-base clean strategy above a higher-base rule-breaking one", () => {
      const fast: StrategyCandidate = { id: "fast", name: "fast", baseScore: 0.95, params: { feed_mm_rev: 0.5 } };
      const sound: StrategyCandidate = { id: "sound", name: "sound", baseScore: 0.8, params: { feed_mm_rev: 0.2 } };
      const r = fresh().apply({ candidates: [fast, sound], constraints: [FEED_CAP] });
      expect(r.ranked[0].id).toBe("sound");
      expect(r.ranked[1].id).toBe("fast");
      expect(r.chosen?.id).toBe("sound");
    });

    it("naivePick differs from chosen when the naive pick breaks a critical rule", () => {
      const fast: StrategyCandidate = { id: "fast", name: "fast", baseScore: 0.95, params: { feed_mm_rev: 0.5 } };
      const sound: StrategyCandidate = { id: "sound", name: "sound", baseScore: 0.8, params: { feed_mm_rev: 0.2 } };
      const r = fresh().apply({ candidates: [fast, sound], constraints: [FEED_CAP] });
      expect(r.naivePick?.id).toBe("fast"); // highest baseScore
      expect(r.chosen?.id).toBe("sound"); // tribal-aware override
    });

    it("EXIT CRITERION: tribal application improves outcome > 15% when the naive pick is unsafe", () => {
      const fast: StrategyCandidate = { id: "fast", name: "fast", baseScore: 0.95, params: { feed_mm_rev: 0.5 } };
      const sound: StrategyCandidate = { id: "sound", name: "sound", baseScore: 0.8, params: { feed_mm_rev: 0.2 } };
      const r = fresh().apply({ candidates: [fast, sound], constraints: [FEED_CAP] });
      // chosen combined 0.80, naive combined 0.95*0.5=0.475 → (0.80-0.475)/0.475 = 68.4%
      expect(r.improvementPct).toBeGreaterThan(15);
      expect(r.improvementPct).toBeCloseTo(68.4, 1);
    });

    it("improvementPct is 0 when the naive and tribal-aware pickers already agree", () => {
      const a: StrategyCandidate = { id: "a", name: "a", baseScore: 0.9, params: { feed_mm_rev: 0.1 } };
      const b: StrategyCandidate = { id: "b", name: "b", baseScore: 0.7, params: { feed_mm_rev: 0.1 } };
      const r = fresh().apply({ candidates: [a, b], constraints: [FEED_CAP] });
      expect(r.chosen?.id).toBe("a");
      expect(r.naivePick?.id).toBe("a");
      expect(r.improvementPct).toBe(0);
    });

    it("is deterministic — identical input yields identical ranking and scores", () => {
      const cands: StrategyCandidate[] = [
        { id: "x", name: "x", baseScore: 0.6, params: { feed_mm_rev: 0.4 } },
        { id: "y", name: "y", baseScore: 0.6, params: { feed_mm_rev: 0.1 } },
      ];
      const r1 = fresh().apply({ candidates: cands, constraints: [FEED_CAP] });
      const r2 = fresh().apply({ candidates: cands, constraints: [FEED_CAP] });
      expect(r1.ranked.map((s) => s.id)).toEqual(r2.ranked.map((s) => s.id));
      expect(r1.ranked.map((s) => s.combinedScore)).toEqual(r2.ranked.map((s) => s.combinedScore));
    });

    it("breaks ties on equal combined score deterministically by id ascending", () => {
      const cands: StrategyCandidate[] = [
        { id: "zeta", name: "zeta", baseScore: 0.5, params: { feed_mm_rev: 0.1 } },
        { id: "alpha", name: "alpha", baseScore: 0.5, params: { feed_mm_rev: 0.1 } },
      ];
      const r = fresh().apply({ candidates: cands, constraints: [FEED_CAP] });
      expect(r.ranked[0].id).toBe("alpha");
      expect(r.ranked[1].id).toBe("zeta");
    });
  });

  describe("scoreCandidate — per-candidate scoring", () => {
    it("flags a parameter exceeding a tribal maximum", () => {
      const s = fresh().scoreCandidate({ id: "s", name: "s", params: { feed_mm_rev: 0.45 } }, [FEED_CAP]);
      expect(s.violations).toHaveLength(1);
      expect(s.violations[0].reason).toContain("exceeds tribal maximum 0.3");
    });

    it("flags a parameter below a tribal minimum", () => {
      const s = fresh().scoreCandidate({ id: "s", name: "s", params: { rpm: 800 } }, [RPM_FLOOR]);
      expect(s.violations).toHaveLength(1);
      expect(s.violations[0].reason).toContain("below tribal minimum 1200");
    });

    it("does not flag a parameter inside its bounds", () => {
      const s = fresh().scoreCandidate({ id: "s", name: "s", params: { feed_mm_rev: 0.3, rpm: 1200 } }, [FEED_CAP, RPM_FLOOR]);
      expect(s.violations).toHaveLength(0);
      expect(s.tribalScore).toBeCloseTo(1, 5);
    });

    it("flags a candidate carrying a forbidden tag", () => {
      const c: TribalConstraint = { id: "NO-CONV", severity: "important", description: "no conventional milling on thin walls", forbiddenTag: "conventional" };
      const s = fresh().scoreCandidate({ id: "s", name: "s", tags: ["conventional", "flood"] }, [c]);
      expect(s.violations).toHaveLength(1);
      expect(s.violations[0].reason).toContain("forbidden tag");
    });

    it("flags a candidate missing a required tag", () => {
      const c: TribalConstraint = { id: "NEED-CLIMB", severity: "recommended", description: "climb milling required", requiredTag: "climb" };
      const s = fresh().scoreCandidate({ id: "s", name: "s", tags: ["flood"] }, [c]);
      expect(s.violations).toHaveLength(1);
      expect(s.violations[0].reason).toContain('missing required tag "climb"');
    });

    it("does not flag a candidate that has the required tag", () => {
      const c: TribalConstraint = { id: "NEED-CLIMB", severity: "recommended", description: "climb milling required", requiredTag: "climb" };
      const s = fresh().scoreCandidate({ id: "s", name: "s", tags: ["climb"] }, [c]);
      expect(s.violations).toHaveLength(0);
    });

    it("accumulates penalty across multiple violations", () => {
      const c1: TribalConstraint = { id: "A", severity: "important", description: "a", forbiddenTag: "bad1" };
      const c2: TribalConstraint = { id: "B", severity: "important", description: "b", forbiddenTag: "bad2" };
      const s = fresh().scoreCandidate({ id: "s", name: "s", tags: ["bad1", "bad2"] }, [c1, c2]);
      expect(s.violations).toHaveLength(2);
      expect(s.tribalScore).toBeCloseTo(0.5, 5); // 1 - 0.25 - 0.25
    });

    it("floors tribalScore at 0 — never negative under heavy violation load", () => {
      const cons: TribalConstraint[] = [0, 1, 2, 3].map((n) => ({
        id: `C${n}`,
        severity: "critical" as const,
        description: `crit ${n}`,
        forbiddenTag: `t${n}`,
      }));
      const s = fresh().scoreCandidate({ id: "s", name: "s", tags: ["t0", "t1", "t2", "t3"] }, cons);
      expect(s.violations).toHaveLength(4);
      expect(s.tribalScore).toBe(0); // 1 - 2.0, clamped
      expect(s.combinedScore).toBe(0);
    });

    it("defaults an omitted baseScore to 0.5", () => {
      const s = fresh().scoreCandidate({ id: "s", name: "s" }, []);
      expect(s.baseScore).toBeCloseTo(0.5, 5);
    });

    it("clamps an out-of-range baseScore into [0,1]", () => {
      const hi = fresh().scoreCandidate({ id: "h", name: "h", baseScore: 1.5 }, []);
      const lo = fresh().scoreCandidate({ id: "l", name: "l", baseScore: -0.2 }, []);
      expect(hi.baseScore).toBe(1);
      expect(lo.baseScore).toBe(0);
    });

    it("records a clean rationale line when there are no violations", () => {
      const s = fresh().scoreCandidate({ id: "s", name: "s", params: { feed_mm_rev: 0.1 } }, [FEED_CAP]);
      expect(s.rationale.some((line) => line.includes("Clean"))).toBe(true);
    });

    it("counts a duplicated constraint id only once", () => {
      const dup: TribalConstraint = { ...FEED_CAP };
      const s = fresh().scoreCandidate({ id: "s", name: "s", params: { feed_mm_rev: 0.5 } }, [FEED_CAP, dup]);
      expect(s.violations).toHaveLength(1); // not 2
      expect(s.tribalScore).toBeCloseTo(0.5, 5);
    });
  });

  describe("fromPlaybookRules — MachiningPlaybook bridge", () => {
    it("maps playbook rules into tribal constraints with normalized severity", () => {
      const rules: PlaybookRuleLike[] = [
        { id: "R1", severity: "warning", rule: "watch chip load", parameter: "chipload", max: 0.15 },
      ];
      const cons = fresh().fromPlaybookRules(rules);
      expect(cons).toHaveLength(1);
      expect(cons[0].id).toBe("R1");
      expect(cons[0].severity).toBe("important"); // warning → important
      expect(cons[0].appliesTo).toBe("chipload");
      expect(cons[0].max).toBe(0.15);
    });

    it("synthesizes an id for a rule that lacks one", () => {
      const cons = fresh().fromPlaybookRules([{ severity: "tip", description: "idless" }]);
      expect(cons[0].id).toBe("playbook-rule-0");
    });

    it("normalizes severity strings (blocker→critical, unknown→tip)", () => {
      const cons = fresh().fromPlaybookRules([
        { id: "a", severity: "blocker", description: "x" },
        { id: "b", severity: "nonsense", description: "y" },
      ]);
      expect(cons[0].severity).toBe("critical");
      expect(cons[1].severity).toBe("tip");
    });

    it("skips malformed rule entries without throwing", () => {
      const dirty = [null, undefined, 42, "str", { id: "ok", description: "real" }] as unknown as PlaybookRuleLike[];
      const cons = fresh().fromPlaybookRules(dirty);
      expect(cons).toHaveLength(1);
      expect(cons[0].id).toBe("ok");
    });

    it("returns an empty array for non-array input", () => {
      expect(fresh().fromPlaybookRules(null as unknown as PlaybookRuleLike[])).toEqual([]);
      expect(fresh().fromPlaybookRules(undefined as unknown as PlaybookRuleLike[])).toEqual([]);
    });

    it("end-to-end: playbook rules drive a real strategy decision", () => {
      const eng = fresh();
      const cons = eng.fromPlaybookRules([
        { id: "PB-FEED", severity: "critical", rule: "feed cap", parameter: "feed_mm_rev", max: 0.25 },
      ]);
      const r = eng.apply({
        candidates: [
          { id: "agg", name: "aggressive", baseScore: 0.9, params: { feed_mm_rev: 0.6 } },
          { id: "safe", name: "safe", baseScore: 0.75, params: { feed_mm_rev: 0.2 } },
        ],
        constraints: cons,
      });
      expect(r.chosen?.id).toBe("safe");
      expect(r.improvementPct).toBeGreaterThan(15);
    });
  });

  describe("rationale synthesis & context", () => {
    it("the synthesized rationale names the chosen strategy and the override", () => {
      const r = fresh().apply({
        candidates: [
          { id: "fast", name: "Fast Roughing", baseScore: 0.95, params: { feed_mm_rev: 0.5 } },
          { id: "sound", name: "Sound Roughing", baseScore: 0.8, params: { feed_mm_rev: 0.2 } },
        ],
        constraints: [FEED_CAP],
      });
      expect(r.tribalRationale).toContain("Sound Roughing");
      expect(r.tribalRationale).toContain("OVERRODE");
    });

    it("surfaces machining context in the rationale when supplied", () => {
      const r = fresh().apply({
        candidates: [{ id: "s", name: "s", baseScore: 0.8, params: { feed_mm_rev: 0.1 } }],
        constraints: [FEED_CAP],
        context: { material: "Ti-6Al-4V", operation: "finishing", feature: "thin-wall" },
      });
      expect(r.tribalRationale).toContain("Ti-6Al-4V");
      expect(r.tribalRationale).toContain("finishing");
    });

    it("states agreement when naive and tribal pickers concur", () => {
      const r = fresh().apply({
        candidates: [{ id: "s", name: "Only", baseScore: 0.8, params: { feed_mm_rev: 0.1 } }],
        constraints: [FEED_CAP],
      });
      expect(r.tribalRationale).toContain("agree");
    });
  });

  describe("getStats — engine introspection", () => {
    it("increments applyCount on each apply() invocation", () => {
      const eng = fresh();
      expect(eng.getStats().applyCount).toBe(0);
      eng.apply({ candidates: [{ id: "s", name: "s" }], constraints: [] });
      eng.apply({ candidates: [{ id: "s", name: "s" }], constraints: [] });
      expect(eng.getStats().applyCount).toBe(2);
    });

    it("exposes the canonical severity penalty weights", () => {
      const w = fresh().getStats().severityWeights;
      expect(w.critical).toBe(0.5);
      expect(w.important).toBe(0.25);
      expect(w.recommended).toBe(0.1);
      expect(w.tip).toBe(0.03);
    });

    it("records the most-recent improvement percentage", () => {
      const eng = fresh();
      eng.apply({
        candidates: [
          { id: "fast", name: "fast", baseScore: 0.95, params: { feed_mm_rev: 0.5 } },
          { id: "sound", name: "sound", baseScore: 0.8, params: { feed_mm_rev: 0.2 } },
        ],
        constraints: [FEED_CAP],
      });
      expect(eng.getStats().lastImprovementPct).toBeGreaterThan(15);
    });
  });

  describe("adversarial & edge cases", () => {
    it("clamps a NaN baseScore to 0 rather than propagating NaN", () => {
      const s = fresh().scoreCandidate({ id: "s", name: "s", baseScore: NaN }, []);
      expect(s.baseScore).toBe(0);
      expect(s.combinedScore).toBe(0);
      expect(Number.isNaN(s.combinedScore)).toBe(false);
    });

    it("treats a non-finite parameter value as unevaluable — no crash, no fabricated violation", () => {
      const s = fresh().scoreCandidate({ id: "s", name: "s", params: { feed_mm_rev: Infinity } }, [FEED_CAP]);
      expect(s.violations).toHaveLength(0);
      expect(Number.isFinite(s.combinedScore)).toBe(true);
    });

    it("flags a required-tag violation even when the candidate has no params at all", () => {
      const c: TribalConstraint = { id: "NEED", severity: "important", description: "needs coolant", requiredTag: "flood" };
      const s = fresh().scoreCandidate({ id: "s", name: "s" }, [c]);
      expect(s.violations).toHaveLength(1);
    });

    it("treats a constraint with neither bounds nor tags as a no-op (never violates)", () => {
      const inert: TribalConstraint = { id: "INERT", severity: "critical", description: "no predicate" };
      const s = fresh().scoreCandidate({ id: "s", name: "s", params: { feed_mm_rev: 999 } }, [inert]);
      expect(s.violations).toHaveLength(0);
      expect(s.tribalScore).toBeCloseTo(1, 5);
    });

    it("with no constraints, the highest-base candidate wins and improvement is 0", () => {
      const r = fresh().apply({
        candidates: [
          { id: "a", name: "a", baseScore: 0.6 },
          { id: "b", name: "b", baseScore: 0.9 },
        ],
        constraints: [],
      });
      expect(r.chosen?.id).toBe("b");
      expect(r.naivePick?.id).toBe("b");
      expect(r.improvementPct).toBe(0);
    });

    it("the exported singleton is a usable engine instance", () => {
      const r = tribalKnowledgeApplicatorEngine.apply({
        candidates: [{ id: "s", name: "s", baseScore: 0.5 }],
        constraints: [],
      });
      expect(r.chosen?.id).toBe("s");
    });
  });
});
