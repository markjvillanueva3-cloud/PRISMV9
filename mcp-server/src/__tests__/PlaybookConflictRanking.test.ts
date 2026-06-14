/**
 * PlaybookConflictRanking.test.ts — U-PB-CONFLICT-RANK
 *
 * Verifies MachiningPlaybookEngine.rankConflicts() — severity + evidence-based
 * prioritization of the detectConflicts() output. Reference priority-score
 * values are computed from the documented formula:
 *
 *   priorityScore = pairSeverity * 0.8 + evidenceDelta * 0.2
 *   pairSeverity  = (max(sevA, sevB) + min(sevA, sevB)) / 8     // [0.25, 1]
 *   evidenceDelta = abs(evA - evB) / 5                          // [0, 1]
 *
 *   buckets: urgent ≥ 0.80, high ≥ 0.55, medium ≥ 0.35, else low.
 */
import { describe, it, expect } from "vitest";
import {
  MachiningPlaybookEngine,
  machiningPlaybookEngine,
  type PlaybookRule,
  type RuleCategory,
  type Condition,
  type Severity,
  type EvidenceLevel,
  type RankedConflictReport,
} from "../engines/MachiningPlaybookEngine.js";

const fresh = () => new MachiningPlaybookEngine();

/** Test fixture: a PlaybookRule with caller-controlled severity + evidence_level. */
function rankFixtureRule(
  id: string,
  ruleText: string,
  category: RuleCategory,
  severity: Severity,
  conditions: Condition[],
  evidence_level?: EvidenceLevel,
): PlaybookRule {
  const rule: PlaybookRule = {
    id,
    category,
    severity,
    title: `fixture ${id}`,
    rule: ruleText,
    reasoning: "fixture reasoning text",
    conditions,
    exceptions: [],
    source: "test",
  };
  if (evidence_level !== undefined) rule.evidence_level = evidence_level;
  return rule;
}

const MAT_P: Condition[] = [{ type: "material_iso", groups: ["P"] }];
const MAT_K: Condition[] = [{ type: "material_iso", groups: ["K"] }];

/** Find the ranked conflict for a fixture pair (either id order). */
function findRanked(report: RankedConflictReport, idA: string, idB: string) {
  return report.ranked.find(
    (r) =>
      (r.ruleIdA === idA && r.ruleIdB === idB) ||
      (r.ruleIdA === idB && r.ruleIdB === idA),
  );
}

describe("MachiningPlaybookEngine.rankConflicts — U-PB-CONFLICT-RANK", () => {
  describe("empty / no-conflicts path", () => {
    it("returns conflictCount=0 + empty ranked when caller passes an empty report", () => {
      const eng = fresh();
      const r = eng.rankConflicts({
        totalRules: 0,
        pairsEvaluated: 0,
        conflictCount: 0,
        conflicts: [],
        byParameter: {},
        conflictFree: true,
        method: "lexicon-cooccurrence",
      });
      expect(r.conflictCount).toBe(0);
      expect(r.ranked).toEqual([]);
      expect(r.byPriority).toEqual({ urgent: 0, high: 0, medium: 0, low: 0 });
    });

    it("composes on detectConflicts() when no input report is passed (no-arg invocation works)", () => {
      const eng = fresh();
      const r = eng.rankConflicts();
      expect(r.conflictCount).toBe(r.ranked.length);
      const sum = r.byPriority.urgent + r.byPriority.high + r.byPriority.medium + r.byPriority.low;
      expect(sum).toBe(r.conflictCount);
    });
  });

  describe("priority-score reference values (no evidence)", () => {
    it("both critical pair → priorityScore 0.8, priority=urgent", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-CC-A", "Reduce the feedrate.", "milling", "critical", MAT_P));
      eng.addRule(rankFixtureRule("TEST-CC-B", "Increase the feedrate.", "milling", "critical", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-CC-A", "TEST-CC-B");
      if (!c) throw new Error("critical/critical conflict not detected");
      expect(c.priorityScore).toBeCloseTo(0.8, 6);
      expect(c.priority).toBe("urgent");
      expect(c.maxSeverity).toBe("critical");
      expect(c.minSeverity).toBe("critical");
    });

    it("both important pair → priorityScore 0.6, priority=high", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-II-A", "Reduce the feedrate.", "milling", "important", MAT_P));
      eng.addRule(rankFixtureRule("TEST-II-B", "Increase the feedrate.", "milling", "important", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-II-A", "TEST-II-B");
      if (!c) throw new Error("important/important conflict not detected");
      expect(c.priorityScore).toBeCloseTo(0.6, 6);
      expect(c.priority).toBe("high");
    });

    it("critical + important pair → priorityScore 0.7, priority=high", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-CI-A", "Reduce the feedrate.", "milling", "critical", MAT_P));
      eng.addRule(rankFixtureRule("TEST-CI-B", "Increase the feedrate.", "milling", "important", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-CI-A", "TEST-CI-B");
      if (!c) throw new Error("critical/important conflict not detected");
      expect(c.priorityScore).toBeCloseTo(0.7, 6);
      expect(c.priority).toBe("high");
      expect(c.maxSeverity).toBe("critical");
      expect(c.minSeverity).toBe("important");
    });

    it("both recommended pair → priorityScore 0.4, priority=medium", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-RR-A", "Reduce the feedrate.", "milling", "recommended", MAT_P));
      eng.addRule(rankFixtureRule("TEST-RR-B", "Increase the feedrate.", "milling", "recommended", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-RR-A", "TEST-RR-B");
      if (!c) throw new Error("recommended/recommended conflict not detected");
      expect(c.priorityScore).toBeCloseTo(0.4, 6);
      expect(c.priority).toBe("medium");
    });

    it("both tip pair → priorityScore 0.2, priority=low", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-TT-A", "Reduce the feedrate.", "milling", "tip", MAT_P));
      eng.addRule(rankFixtureRule("TEST-TT-B", "Increase the feedrate.", "milling", "tip", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-TT-A", "TEST-TT-B");
      if (!c) throw new Error("tip/tip conflict not detected");
      expect(c.priorityScore).toBeCloseTo(0.2, 6);
      expect(c.priority).toBe("low");
    });

    it("critical + tip pair → priorityScore 0.5, priority=medium", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-CT-A", "Reduce the feedrate.", "milling", "critical", MAT_P));
      eng.addRule(rankFixtureRule("TEST-CT-B", "Increase the feedrate.", "milling", "tip", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-CT-A", "TEST-CT-B");
      if (!c) throw new Error("critical/tip conflict not detected");
      expect(c.priorityScore).toBeCloseTo(0.5, 6);
      expect(c.priority).toBe("medium");
    });
  });

  describe("evidence-delta effect", () => {
    it("ISO vs unspecified at both-tip baseline → score 0.2 + 0.2 = 0.4, priority=medium", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-EV-ISO-A", "Reduce the feedrate.", "milling", "tip", MAT_P, "iso_standard"));
      eng.addRule(rankFixtureRule("TEST-EV-ISO-B", "Increase the feedrate.", "milling", "tip", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-EV-ISO-A", "TEST-EV-ISO-B");
      if (!c) throw new Error("evidence-delta conflict not detected");
      expect(c.priorityScore).toBeCloseTo(0.4, 6);
      expect(c.priority).toBe("medium");
    });

    it("evidenceWinner names the higher-evidence rule", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-EW-ISO", "Reduce the feedrate.", "milling", "important", MAT_P, "iso_standard"));
      eng.addRule(rankFixtureRule("TEST-EW-EMP", "Increase the feedrate.", "milling", "important", MAT_P, "empirical_heuristic"));
      const c = findRanked(eng.rankConflicts(), "TEST-EW-ISO", "TEST-EW-EMP");
      if (!c) throw new Error("evidence-winner conflict not detected");
      expect(c.evidenceWinner).toBe("TEST-EW-ISO");
    });

    it("evidenceWinner is null when both rules share the same evidence_level", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-EWT-A", "Reduce the feedrate.", "milling", "important", MAT_P, "peer_reviewed"));
      eng.addRule(rankFixtureRule("TEST-EWT-B", "Increase the feedrate.", "milling", "important", MAT_P, "peer_reviewed"));
      const c = findRanked(eng.rankConflicts(), "TEST-EWT-A", "TEST-EWT-B");
      if (!c) throw new Error("evidence-tie conflict not detected");
      expect(c.evidenceWinner).toBe(null);
    });

    it("evidenceWinner is null when neither rule specifies evidence_level (both unspecified=0)", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-EWN-A", "Reduce the feedrate.", "milling", "important", MAT_P));
      eng.addRule(rankFixtureRule("TEST-EWN-B", "Increase the feedrate.", "milling", "important", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-EWN-A", "TEST-EWN-B");
      if (!c) throw new Error("no-evidence conflict not detected");
      expect(c.evidenceWinner).toBe(null);
    });
  });

  describe("sort order + stability", () => {
    it("urgent appears before low in the ranked list", () => {
      const eng = fresh();
      eng.addRule(rankFixtureRule("TEST-SO-URG-A", "Reduce the feedrate.", "milling", "critical", MAT_P));
      eng.addRule(rankFixtureRule("TEST-SO-URG-B", "Increase the feedrate.", "milling", "critical", MAT_P));
      eng.addRule(rankFixtureRule("TEST-SO-LOW-A", "Reduce the feedrate.", "roughing", "tip", MAT_K));
      eng.addRule(rankFixtureRule("TEST-SO-LOW-B", "Increase the feedrate.", "roughing", "tip", MAT_K));
      const r = eng.rankConflicts();
      const urg = r.ranked.findIndex((x) => x.ruleIdA === "TEST-SO-URG-A" || x.ruleIdB === "TEST-SO-URG-A");
      const low = r.ranked.findIndex((x) => x.ruleIdA === "TEST-SO-LOW-A" || x.ruleIdB === "TEST-SO-LOW-A");
      if (urg < 0 || low < 0) throw new Error("expected both fixture pairs in ranked output");
      expect(urg).toBeLessThan(low);
    });

    it("stable sort: two same-priority pairs retain detectConflicts() order (alphabetical by ruleIdA)", () => {
      const eng = fresh();
      // Two distinct critical/critical pairs, separated by category+material so they don't co-fire across pairs.
      eng.addRule(rankFixtureRule("TEST-ST-1A", "Reduce the feedrate.", "milling", "critical", MAT_P));
      eng.addRule(rankFixtureRule("TEST-ST-1B", "Increase the feedrate.", "milling", "critical", MAT_P));
      eng.addRule(rankFixtureRule("TEST-ST-2A", "Reduce the feedrate.", "roughing", "critical", MAT_K));
      eng.addRule(rankFixtureRule("TEST-ST-2B", "Increase the feedrate.", "roughing", "critical", MAT_K));
      const r = eng.rankConflicts();
      const pair1Idx = r.ranked.findIndex((x) => x.ruleIdA === "TEST-ST-1A");
      const pair2Idx = r.ranked.findIndex((x) => x.ruleIdA === "TEST-ST-2A");
      if (pair1Idx < 0 || pair2Idx < 0) throw new Error("expected both stable-sort pairs in ranked output");
      // Both have identical priorityScore (0.8). Stable sort preserves original
      // detectConflicts order, which sorts by ruleIdA — so 1A precedes 2A.
      expect(r.ranked[pair1Idx].priorityScore).toBeCloseTo(r.ranked[pair2Idx].priorityScore, 6);
      expect(pair1Idx).toBeLessThan(pair2Idx);
    });
  });

  describe("structural invariants on the canonical corpus", () => {
    it("ranked.length equals conflictCount", () => {
      const r = fresh().rankConflicts();
      expect(r.ranked.length).toBe(r.conflictCount);
    });

    it("byPriority bucket counts partition conflictCount exactly", () => {
      const r = fresh().rankConflicts();
      const sum = r.byPriority.urgent + r.byPriority.high + r.byPriority.medium + r.byPriority.low;
      expect(sum).toBe(r.conflictCount);
    });

    it("every priorityScore is in [0, 1]", () => {
      const r = fresh().rankConflicts();
      for (const x of r.ranked) {
        expect(x.priorityScore).toBeGreaterThanOrEqual(0);
        expect(x.priorityScore).toBeLessThanOrEqual(1);
      }
    });

    it("ranked is sorted by priorityScore DESC", () => {
      const r = fresh().rankConflicts();
      for (let i = 1; i < r.ranked.length; i++) {
        expect(r.ranked[i - 1].priorityScore).toBeGreaterThanOrEqual(r.ranked[i].priorityScore);
      }
    });

    it("every priority bucket label is one of {urgent,high,medium,low}", () => {
      const r = fresh().rankConflicts();
      const allowed = new Set(["urgent", "high", "medium", "low"]);
      for (const x of r.ranked) expect(allowed.has(x.priority)).toBe(true);
    });

    it("is deterministic — two runs on the same store yield identical reports", () => {
      const eng = fresh();
      const a = eng.rankConflicts();
      const b = eng.rankConflicts();
      expect(JSON.stringify(a.ranked)).toBe(JSON.stringify(b.ranked));
      expect(a.byPriority).toEqual(b.byPriority);
    });
  });

  describe("adversarial robustness", () => {
    it("a rule with a non-canonical severity string defaults to tip rank (priority='low' for the pair)", () => {
      const eng = fresh();
      const hostile = rankFixtureRule("TEST-HOST-SEV", "Reduce the feedrate.", "milling", "tip", MAT_P);
      (hostile as { severity: unknown }).severity = "spicy";
      eng.addRule(hostile);
      eng.addRule(rankFixtureRule("TEST-HOST-SEV-PEER", "Increase the feedrate.", "milling", "tip", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-HOST-SEV", "TEST-HOST-SEV-PEER");
      if (!c) throw new Error("hostile-severity conflict not detected");
      // Hostile severity → default rank 1 (tip). Other rule is tip. So tip+tip → 0.2 → low.
      expect(c.priorityScore).toBeCloseTo(0.2, 6);
      expect(c.priority).toBe("low");
    });

    it("a rule with a non-canonical evidence_level string defaults to unspecified rank (no evidence delta vs peer with unspecified)", () => {
      const eng = fresh();
      const hostile = rankFixtureRule("TEST-HOST-EV", "Reduce the feedrate.", "milling", "important", MAT_P);
      (hostile as { evidence_level: unknown }).evidence_level = "alien-source";
      eng.addRule(hostile);
      eng.addRule(rankFixtureRule("TEST-HOST-EV-PEER", "Increase the feedrate.", "milling", "important", MAT_P));
      const c = findRanked(eng.rankConflicts(), "TEST-HOST-EV", "TEST-HOST-EV-PEER");
      if (!c) throw new Error("hostile-evidence conflict not detected");
      // Hostile evidence_level → unspecified (0). Peer also unspecified. Delta 0. Both important → 0.6 → high.
      expect(c.priorityScore).toBeCloseTo(0.6, 6);
      expect(c.priority).toBe("high");
      expect(c.evidenceWinner).toBe(null);
    });

    it("the method never throws on a malformed input report shape", () => {
      const eng = fresh();
      // Pass a conflict referencing rule ids that don't exist — caller could synthesize this.
      const r = eng.rankConflicts({
        totalRules: 0,
        pairsEvaluated: 0,
        conflictCount: 1,
        conflicts: [{
          ruleIdA: "GHOST-NONEXISTENT-A",
          ruleIdB: "GHOST-NONEXISTENT-B",
          parameter: "feedrate",
          directionA: "increase",
          directionB: "decrease",
          category: "milling",
          sharedContext: "synthetic",
        }],
        byParameter: { feedrate: 1 },
        conflictFree: false,
        method: "lexicon-cooccurrence",
      });
      // Missing rules → both default to tip rank + unspecified evidence → score 0.2 → low.
      expect(r.ranked.length).toBe(1);
      expect(r.ranked[0].priorityScore).toBeCloseTo(0.2, 6);
      expect(r.ranked[0].priority).toBe("low");
      expect(r.ranked[0].maxSeverity).toBe("tip");
    });
  });

  describe("singleton", () => {
    it("the exported singleton exposes rankConflicts with a shape-correct report", () => {
      const r = machiningPlaybookEngine.rankConflicts();
      expect(Array.isArray(r.ranked)).toBe(true);
      expect(r.conflictCount).toBe(r.ranked.length);
      expect(typeof r.byPriority.urgent).toBe("number");
      expect(typeof r.byPriority.high).toBe("number");
      expect(typeof r.byPriority.medium).toBe("number");
      expect(typeof r.byPriority.low).toBe("number");
    });
  });
});
