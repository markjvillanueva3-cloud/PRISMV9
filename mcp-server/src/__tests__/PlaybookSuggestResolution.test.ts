/**
 * PlaybookSuggestResolution.test.ts — U-PB-SUGGEST-RESOLUTION
 *
 * Verifies MachiningPlaybookEngine.suggestResolution() and suggestResolutions()
 * — third leg of the conflict workflow (detect → rank → RESOLVE). Reference
 * confidence values are computed from the documented formula:
 *
 *   evidence-decided: confidence = 0.5 + 0.5 * (evidenceDelta / 5)   ∈ [0.5, 1.0]
 *   severity-decided: confidence = 0.3 + 0.4 * (severityDelta / 3)   ∈ [0.3, 0.7]
 *   ambiguous:        confidence = 0
 *
 * Ranks:
 *   SEVERITY_RANK: critical=4, important=3, recommended=2, tip=1
 *   EVIDENCE_RANK: iso_standard=5, peer_reviewed=4, manufacturer_data=3,
 *                  empirical_validated=2.5, empirical_heuristic=2,
 *                  theoretical=1, unspecified=0
 *
 * R12 fail-loud: missing rule ids in the corpus surface a `warning` field
 * and override the ambiguous rationale to name the true cause (stale input,
 * not "human judgment required").
 */
import { describe, it, expect } from "vitest";
import {
  MachiningPlaybookEngine,
  type PlaybookRule,
  type RuleCategory,
  type Condition,
  type Severity,
  type EvidenceLevel,
  type PlaybookConflict,
  type ConflictParameter,
  type DirectiveDirection,
} from "../engines/MachiningPlaybookEngine.js";

const fresh = () => new MachiningPlaybookEngine();

function resFixtureRule(
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

function synthConflict(
  ruleIdA: string,
  ruleIdB: string,
  parameter: ConflictParameter = "feedrate",
  directionA: DirectiveDirection = "increase",
  directionB: DirectiveDirection = "decrease",
): PlaybookConflict {
  return {
    ruleIdA,
    ruleIdB,
    parameter,
    directionA,
    directionB,
    category: "tactics" as RuleCategory,
    sharedContext: "fixture",
  };
}

const MAT_P: Condition[] = [{ type: "material_iso", groups: ["P"] }];

describe("MachiningPlaybookEngine.suggestResolution — U-PB-SUGGEST-RESOLUTION", () => {
  describe("evidence-decided proposals", () => {
    it("picks higher evidence_level as winner (delta=5: iso_standard vs unspecified)", () => {
      const eng = fresh();
      // RA: iso_standard (rank 5), important (rank 3)
      // RB: no evidence_level (rank 0), important (rank 3)
      // evidenceDelta=5 → confidence = 0.5 + 0.5 * (5/5) = 1.0
      eng.addRule(resFixtureRule("RA", "increase feedrate aggressively", "tactics", "important", MAT_P, "iso_standard"));
      eng.addRule(resFixtureRule("RB", "decrease feedrate cautiously", "tactics", "important", MAT_P));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.decidedBy).toBe("evidence");
      expect(r.winnerId).toBe("RA");
      expect(r.loserId).toBe("RB");
      expect(r.evidenceDelta).toBeCloseTo(5, 6);
      expect(r.severityDelta).toBeCloseTo(0, 6);
      expect(r.confidence).toBeCloseTo(1.0, 6);
      expect(r.ambiguous).toBe(false);
      expect(r.warning).toBe(undefined);
      expect(r.rationale).toContain("Higher evidence_level wins");
      expect(r.rationale).toContain("RA");
    });

    it("picks higher evidence_level when B is stronger (delta=1: peer_reviewed vs iso_standard)", () => {
      const eng = fresh();
      // RA: peer_reviewed (4), RB: iso_standard (5) → evidenceDelta=1
      // confidence = 0.5 + 0.5 * (1/5) = 0.6
      eng.addRule(resFixtureRule("RA", "rule a", "tactics", "important", MAT_P, "peer_reviewed"));
      eng.addRule(resFixtureRule("RB", "rule b", "tactics", "important", MAT_P, "iso_standard"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.decidedBy).toBe("evidence");
      expect(r.winnerId).toBe("RB");
      expect(r.loserId).toBe("RA");
      expect(r.evidenceDelta).toBeCloseTo(1, 6);
      expect(r.confidence).toBeCloseTo(0.6, 6);
    });

    it("handles fractional evidence delta (empirical_validated=2.5 vs theoretical=1, delta=1.5)", () => {
      const eng = fresh();
      // confidence = 0.5 + 0.5 * (1.5/5) = 0.65
      eng.addRule(resFixtureRule("RA", "rule a", "tactics", "important", MAT_P, "empirical_validated"));
      eng.addRule(resFixtureRule("RB", "rule b", "tactics", "important", MAT_P, "theoretical"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.decidedBy).toBe("evidence");
      expect(r.winnerId).toBe("RA");
      expect(r.evidenceDelta).toBeCloseTo(1.5, 6);
      expect(r.confidence).toBeCloseTo(0.65, 6);
    });

    it("evidence margin overrides severity (severity 3-vs-1 + evidence 5-vs-4)", () => {
      const eng = fresh();
      // RA: important (3) + iso_standard (5)
      // RB: tip (1) + peer_reviewed (4)
      // evidenceDelta=1 (>0) → evidence wins; RA's higher evidence beats RB
      eng.addRule(resFixtureRule("RA", "rule a", "tactics", "important", MAT_P, "iso_standard"));
      eng.addRule(resFixtureRule("RB", "rule b", "tactics", "tip", MAT_P, "peer_reviewed"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.decidedBy).toBe("evidence");
      expect(r.winnerId).toBe("RA");
      // severityDelta is still reported (operator visibility) but not load-bearing
      expect(r.severityDelta).toBeCloseTo(2, 6);
      expect(r.evidenceDelta).toBeCloseTo(1, 6);
    });

    it("confidence is bounded above by 1.0 at the max evidence span", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RA", "rule a", "tactics", "important", MAT_P, "iso_standard"));
      eng.addRule(resFixtureRule("RB", "rule b", "tactics", "important", MAT_P));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.confidence).toBeLessThanOrEqual(1.0);
      expect(r.confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe("severity-decided proposals (evidence tie)", () => {
    it("picks higher severity when evidence_level matches exactly (critical vs tip, delta=3)", () => {
      const eng = fresh();
      // Both peer_reviewed → evidenceDelta=0; severityDelta=3
      // confidence = 0.3 + 0.4 * (3/3) = 0.7
      eng.addRule(resFixtureRule("RA", "rule a", "tactics", "critical", MAT_P, "peer_reviewed"));
      eng.addRule(resFixtureRule("RB", "rule b", "tactics", "tip", MAT_P, "peer_reviewed"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.decidedBy).toBe("severity");
      expect(r.winnerId).toBe("RA");
      expect(r.loserId).toBe("RB");
      expect(r.evidenceDelta).toBeCloseTo(0, 6);
      expect(r.severityDelta).toBeCloseTo(3, 6);
      expect(r.confidence).toBeCloseTo(0.7, 6);
      expect(r.rationale).toContain("Tie on evidence");
      expect(r.rationale).toContain("higher severity wins");
    });

    it("severity decides when both have NO evidence_level (both unspecified, rank 0)", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RA", "rule a", "tactics", "important", MAT_P));
      eng.addRule(resFixtureRule("RB", "rule b", "tactics", "recommended", MAT_P));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.decidedBy).toBe("severity");
      expect(r.winnerId).toBe("RA");
      expect(r.evidenceDelta).toBeCloseTo(0, 6);
      expect(r.severityDelta).toBeCloseTo(1, 6);
      // confidence = 0.3 + 0.4 * (1/3) ≈ 0.5333
      expect(r.confidence).toBeCloseTo(0.3 + 0.4 / 3, 6);
    });

    it("severity-decided confidence is bounded in [0.3, 0.7]", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RA", "rule a", "tactics", "critical", MAT_P, "manufacturer_data"));
      eng.addRule(resFixtureRule("RB", "rule b", "tactics", "recommended", MAT_P, "manufacturer_data"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.decidedBy).toBe("severity");
      expect(r.confidence).toBeGreaterThanOrEqual(0.3);
      expect(r.confidence).toBeLessThanOrEqual(0.7);
    });

    it("crit/tip severity (0.7) outranks tiny evidence margin — composition vs ranking", () => {
      // Documents the intentional confidence-band overlap noted in the engine.
      // crit-vs-tip with tied evidence: confidence = 0.7 (severity-decided).
      // peer_reviewed-vs-manufacturer_data with tied severity: confidence = 0.5 + 0.5 * (1/5) = 0.6 (evidence-decided).
      // So severity-decided (0.7) > evidence-decided (0.6) — matches operator intuition.
      const eng = fresh();
      eng.addRule(resFixtureRule("S1", "sev winner", "tactics", "critical", MAT_P, "peer_reviewed"));
      eng.addRule(resFixtureRule("S2", "sev loser",  "tactics", "tip",      MAT_P, "peer_reviewed"));
      eng.addRule(resFixtureRule("E1", "ev winner",  "tactics", "important", MAT_P, "peer_reviewed"));
      eng.addRule(resFixtureRule("E2", "ev loser",   "tactics", "important", MAT_P, "manufacturer_data"));
      const sev = eng.suggestResolution(synthConflict("S1", "S2"));
      const ev = eng.suggestResolution(synthConflict("E1", "E2"));
      expect(sev.decidedBy).toBe("severity");
      expect(ev.decidedBy).toBe("evidence");
      expect(sev.confidence).toBeCloseTo(0.7, 6);
      expect(ev.confidence).toBeCloseTo(0.6, 6);
      expect(sev.confidence).toBeGreaterThan(ev.confidence);
    });
  });

  describe("ambiguous proposals (both axes tie)", () => {
    it("returns ambiguous when severity AND evidence both tie exactly", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RA", "rule a", "tactics", "important", MAT_P, "peer_reviewed"));
      eng.addRule(resFixtureRule("RB", "rule b", "tactics", "important", MAT_P, "peer_reviewed"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.decidedBy).toBe("ambiguous");
      expect(r.winnerId).toBe(null);
      expect(r.loserId).toBe(null);
      expect(r.confidence).toBe(0);
      expect(r.ambiguous).toBe(true);
      expect(r.warning).toBe(undefined);
      expect(r.rationale).toContain("Both axes tied");
      expect(r.rationale).toContain("human judgment required");
    });

    it("ambiguous when both have NO evidence + matching severity (both rank 0+1)", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RA", "rule a", "tactics", "tip", MAT_P));
      eng.addRule(resFixtureRule("RB", "rule b", "tactics", "tip", MAT_P));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.decidedBy).toBe("ambiguous");
      expect(r.confidence).toBe(0);
      expect(r.winnerId).toBe(null);
    });
  });

  describe("R12 fail-loud — missing rule ids", () => {
    it("surfaces warning + honest rationale when BOTH rule ids are absent", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("REAL_RULE", "real rule", "tactics", "important", MAT_P, "peer_reviewed"));
      const r = eng.suggestResolution(synthConflict("STALE_X", "STALE_Y"));
      expect(r.decidedBy).toBe("ambiguous");
      expect(r.winnerId).toBe(null);
      expect(r.loserId).toBe(null);
      expect(typeof r.warning).toBe("string");
      expect(r.warning).toContain("Neither rule found in corpus");
      expect(r.warning).toContain("STALE_X");
      expect(r.warning).toContain("STALE_Y");
      // R12: rationale must NOT lie with "human judgment required"
      expect(r.rationale).toContain("Ambiguous —");
      expect(r.rationale.includes("human judgment required")).toBe(false);
    });

    it("surfaces warning when only ruleIdA is absent", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RB", "real rule b", "tactics", "important", MAT_P, "peer_reviewed"));
      const r = eng.suggestResolution(synthConflict("STALE_A", "RB"));
      expect(typeof r.warning).toBe("string");
      expect(r.warning).toContain('ruleIdA "STALE_A" not found in corpus');
      // RB has peer_reviewed (4) vs absent RA (unspecified=0) → evidenceDelta=4 → RB wins
      expect(r.decidedBy).toBe("evidence");
      expect(r.winnerId).toBe("RB");
    });

    it("surfaces warning when only ruleIdB is absent", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RA", "real rule a", "tactics", "critical", MAT_P, "iso_standard"));
      const r = eng.suggestResolution(synthConflict("RA", "STALE_B"));
      expect(typeof r.warning).toBe("string");
      expect(r.warning).toContain('ruleIdB "STALE_B" not found in corpus');
      expect(r.decidedBy).toBe("evidence");
      expect(r.winnerId).toBe("RA");
    });

    it("no warning emitted when both rules are present", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RA", "a", "tactics", "important", MAT_P, "peer_reviewed"));
      eng.addRule(resFixtureRule("RB", "b", "tactics", "tip", MAT_P, "peer_reviewed"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.warning).toBe(undefined);
      expect("warning" in r).toBe(false);
    });
  });

  describe("defensive paths — malformed input", () => {
    it("treats unknown severity as tip rank (1) without throwing", () => {
      const eng = fresh();
      // Inject a malformed rule directly via addRule — fixture lets us
      // bypass type safety (severity cast as Severity) to mimic corpus rot.
      eng.addRule({ ...resFixtureRule("RA", "a", "tactics", "important", MAT_P, "peer_reviewed"),
        severity: "garbage" as Severity });
      eng.addRule(resFixtureRule("RB", "b", "tactics", "tip", MAT_P, "peer_reviewed"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      // Both end up at tip rank (1) → severity tie + evidence tie → ambiguous
      expect(r.decidedBy).toBe("ambiguous");
      expect(r.severityDelta).toBeCloseTo(0, 6);
      expect(r.warning).toBe(undefined);  // rules ARE in corpus, just malformed
    });

    it("treats unknown evidence_level as unspecified rank (0) without throwing", () => {
      const eng = fresh();
      eng.addRule({ ...resFixtureRule("RA", "a", "tactics", "important", MAT_P),
        evidence_level: "bogus" as EvidenceLevel });
      eng.addRule(resFixtureRule("RB", "b", "tactics", "important", MAT_P, "iso_standard"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      // RA evidence rank=0, RB=5 → evidence decides, RB wins
      expect(r.decidedBy).toBe("evidence");
      expect(r.winnerId).toBe("RB");
      expect(r.evidenceDelta).toBeCloseTo(5, 6);
    });

    it("self-conflict (ruleIdA === ruleIdB) yields ambiguous (both axes tie by definition)", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("SAME", "a rule", "tactics", "important", MAT_P, "peer_reviewed"));
      const r = eng.suggestResolution(synthConflict("SAME", "SAME"));
      expect(r.decidedBy).toBe("ambiguous");
      expect(r.confidence).toBe(0);
      expect(r.warning).toBe(undefined);
    });
  });

  describe("metadata fields preservation", () => {
    it("echoes parameter through to the proposal", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RA", "a", "tactics", "important", MAT_P, "peer_reviewed"));
      eng.addRule(resFixtureRule("RB", "b", "tactics", "tip", MAT_P, "peer_reviewed"));
      const r1 = eng.suggestResolution(synthConflict("RA", "RB", "feedrate"));
      const r2 = eng.suggestResolution(synthConflict("RA", "RB", "spindle_speed"));
      const r3 = eng.suggestResolution(synthConflict("RA", "RB", "coolant"));
      expect(r1.parameter).toBe("feedrate");
      expect(r2.parameter).toBe("spindle_speed");
      expect(r3.parameter).toBe("coolant");
    });

    it("preserves rule ids in the proposal (winner/loser may swap, ids never lost)", () => {
      const eng = fresh();
      eng.addRule(resFixtureRule("RA", "a", "tactics", "important", MAT_P, "peer_reviewed"));
      eng.addRule(resFixtureRule("RB", "b", "tactics", "tip", MAT_P, "peer_reviewed"));
      const r = eng.suggestResolution(synthConflict("RA", "RB"));
      expect(r.ruleIdA).toBe("RA");
      expect(r.ruleIdB).toBe("RB");
    });
  });
});

describe("MachiningPlaybookEngine.suggestResolutions — batch", () => {
  it("returns conflictCount=0 + empty proposals + zeroed byDecision when input report has no conflicts", () => {
    // Explicit empty-input report exercises the no-conflicts branch without
    // depending on the canonical corpus state (fresh() loads ~296 rules).
    const eng = fresh();
    const r = eng.suggestResolutions({
      totalRules: 0,
      pairsEvaluated: 0,
      conflictCount: 0,
      conflicts: [],
      byParameter: {},
      conflictFree: true,
      method: "lexicon-cooccurrence",
    });
    expect(r.conflictCount).toBe(0);
    expect(r.proposals).toEqual([]);
    expect(r.byDecision).toEqual({ evidence: 0, severity: 0, ambiguous: 0 });
    expect(r.ambiguousCount).toBe(0);
  });

  it("composes on detectConflicts() with no input arg", () => {
    const eng = fresh();
    const r = eng.suggestResolutions();
    expect(r.conflictCount).toBe(r.proposals.length);
    const sum = r.byDecision.evidence + r.byDecision.severity + r.byDecision.ambiguous;
    expect(sum).toBe(r.conflictCount);
  });

  it("accepts a PlaybookConflictReport input (detect → resolve direct chain)", () => {
    const eng = fresh();
    const conflicts = [synthConflict("X", "Y"), synthConflict("Z", "W")];
    const r = eng.suggestResolutions({
      totalRules: 0,
      pairsEvaluated: 0,
      conflictCount: conflicts.length,
      conflicts,
      byParameter: { feedrate: conflicts.length },
      conflictFree: false,
      method: "lexicon-cooccurrence",
    });
    expect(r.conflictCount).toBe(2);
    expect(r.proposals).toHaveLength(2);
    // Both rule pairs are stale ids → warnings on both
    const allWithWarning = r.proposals.every((p) => typeof p.warning === "string");
    expect(allWithWarning).toBe(true);
  });

  it("partitions byDecision correctly across a mixed batch (evidence + severity + ambiguous)", () => {
    const eng = fresh();
    // EV1+EV2: evidence-decided
    eng.addRule(resFixtureRule("EV1", "ev winner", "tactics", "important", MAT_P, "iso_standard"));
    eng.addRule(resFixtureRule("EV2", "ev loser",  "tactics", "important", MAT_P, "peer_reviewed"));
    // SV1+SV2: severity-decided
    eng.addRule(resFixtureRule("SV1", "sv winner", "tactics", "critical", MAT_P, "peer_reviewed"));
    eng.addRule(resFixtureRule("SV2", "sv loser",  "tactics", "tip",      MAT_P, "peer_reviewed"));
    // AM1+AM2: ambiguous (full tie)
    eng.addRule(resFixtureRule("AM1", "am a", "tactics", "important", MAT_P, "peer_reviewed"));
    eng.addRule(resFixtureRule("AM2", "am b", "tactics", "important", MAT_P, "peer_reviewed"));
    const conflicts: PlaybookConflict[] = [
      synthConflict("EV1", "EV2"),
      synthConflict("SV1", "SV2"),
      synthConflict("AM1", "AM2"),
    ];
    const r = eng.suggestResolutions({
      totalRules: 6,
      pairsEvaluated: 0,
      conflictCount: 3,
      conflicts,
      byParameter: { feedrate: 3 },
      conflictFree: false,
      method: "lexicon-cooccurrence",
    });
    expect(r.conflictCount).toBe(3);
    expect(r.byDecision.evidence).toBe(1);
    expect(r.byDecision.severity).toBe(1);
    expect(r.byDecision.ambiguous).toBe(1);
    expect(r.ambiguousCount).toBe(1);
  });

  it("accepts a RankedConflictReport via the 'ranked' discriminator", () => {
    const eng = fresh();
    eng.addRule(resFixtureRule("RA", "a", "tactics", "important", MAT_P, "peer_reviewed"));
    eng.addRule(resFixtureRule("RB", "b", "tactics", "tip", MAT_P, "peer_reviewed"));
    // First rank, then resolve — the engine's discriminator picks the
    // RankedConflictReport branch automatically.
    const conflicts: PlaybookConflict[] = [synthConflict("RA", "RB")];
    const detected = {
      totalRules: 2,
      pairsEvaluated: 1,
      conflictCount: 1,
      conflicts,
      byParameter: { feedrate: 1 },
      conflictFree: false,
      method: "lexicon-cooccurrence" as const,
    };
    const ranked = eng.rankConflicts(detected);
    const resolved = eng.suggestResolutions(ranked);
    expect(resolved.conflictCount).toBe(1);
    expect(resolved.proposals).toHaveLength(1);
    expect(resolved.proposals[0].decidedBy).toBe("severity");
    expect(resolved.proposals[0].winnerId).toBe("RA");
  });

  it("ambiguousCount mirrors byDecision.ambiguous", () => {
    const eng = fresh();
    eng.addRule(resFixtureRule("X", "x", "tactics", "important", MAT_P, "peer_reviewed"));
    eng.addRule(resFixtureRule("Y", "y", "tactics", "important", MAT_P, "peer_reviewed"));
    const r = eng.suggestResolutions({
      totalRules: 2,
      pairsEvaluated: 1,
      conflictCount: 1,
      conflicts: [synthConflict("X", "Y")],
      byParameter: { feedrate: 1 },
      conflictFree: false,
      method: "lexicon-cooccurrence",
    });
    expect(r.ambiguousCount).toBe(r.byDecision.ambiguous);
    expect(r.ambiguousCount).toBe(1);
  });
});
