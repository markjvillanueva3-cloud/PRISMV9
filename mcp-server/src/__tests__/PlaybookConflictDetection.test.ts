/**
 * PlaybookConflictDetection.test.ts — U-PB-CONFLICT-DETECT
 *
 * Verifies MachiningPlaybookEngine.detectConflicts() — the playbook-corpus
 * semantic conflict scan. Structural invariants are asserted against the real
 * canonical rule store; specific detection behavior is asserted against
 * controlled fixtures injected via addRule(), so each conflict path (and each
 * gate that must NOT fire) has a test that fails if its logic regresses.
 *
 * detectConflicts() is heuristic (lexicon co-occurrence), so every fixture
 * keeps the directive verb adjacent to its parameter — the tests verify the
 * detection *intent*, never lexicon luck.
 */
import { describe, it, expect } from "vitest";
import {
  MachiningPlaybookEngine,
  machiningPlaybookEngine,
  type PlaybookRule,
  type PlaybookConflictReport,
  type RuleCategory,
  type Condition,
} from "../engines/MachiningPlaybookEngine.js";

const fresh = () => new MachiningPlaybookEngine();

/** A minimal well-formed playbook rule with caller-controlled text + conditions. */
function fixtureRule(
  id: string,
  ruleText: string,
  category: RuleCategory,
  conditions: Condition[],
  conditionsAll?: Condition[],
): PlaybookRule {
  const rule: PlaybookRule = {
    id,
    category,
    severity: "tip",
    title: `fixture ${id}`,
    rule: ruleText,
    reasoning: "fixture reasoning text",
    conditions,
    exceptions: [],
    source: "test",
  };
  if (conditionsAll !== undefined) rule.conditions_all = conditionsAll;
  return rule;
}

const MAT_P: Condition[] = [{ type: "material_iso", groups: ["P"] }];

/** Conflicts in a report that involve exactly the {idA, idB} pair, either order. */
function pairConflicts(report: PlaybookConflictReport, idA: string, idB: string) {
  return report.conflicts.filter(
    (c) =>
      (c.ruleIdA === idA && c.ruleIdB === idB) ||
      (c.ruleIdA === idB && c.ruleIdB === idA),
  );
}

/** Parameters flagged conflicting for the {idA, idB} pair. */
function paramsForPair(report: PlaybookConflictReport, idA: string, idB: string): string[] {
  return pairConflicts(report, idA, idB).map((c) => c.parameter);
}

describe("MachiningPlaybookEngine.detectConflicts — U-PB-CONFLICT-DETECT", () => {
  describe("structural invariants on the canonical corpus", () => {
    it("totalRules equals getAllRules().length", () => {
      const eng = fresh();
      expect(eng.detectConflicts().totalRules).toBe(eng.getAllRules().length);
    });

    it("conflictCount is exactly conflicts.length", () => {
      const r = fresh().detectConflicts();
      expect(r.conflictCount).toBe(r.conflicts.length);
    });

    it("byParameter counts sum exactly to conflictCount", () => {
      const r = fresh().detectConflicts();
      const sum = Object.values(r.byParameter).reduce((a, b) => a + b, 0);
      expect(sum).toBe(r.conflictCount);
    });

    it("conflictFree is true iff conflictCount is zero (consistency, not a corpus claim)", () => {
      const r = fresh().detectConflicts();
      expect(r.conflictFree).toBe(r.conflictCount === 0);
    });

    it("method label is the honest heuristic identifier", () => {
      expect(fresh().detectConflicts().method).toBe("lexicon-cooccurrence");
    });

    it("every conflict has ruleIdA <= ruleIdB (deterministic pair ordering)", () => {
      for (const c of fresh().detectConflicts().conflicts) {
        expect(c.ruleIdA <= c.ruleIdB).toBe(true);
      }
    });

    it("every conflict has opposite directions on its parameter", () => {
      for (const c of fresh().detectConflicts().conflicts) {
        expect(c.directionA).not.toBe(c.directionB);
        expect(new Set([c.directionA, c.directionB])).toEqual(
          new Set(["increase", "decrease"]),
        );
      }
    });

    it("conflicts are sorted by ruleIdA, then ruleIdB, then parameter", () => {
      const r = fresh().detectConflicts();
      for (let i = 1; i < r.conflicts.length; i++) {
        const prev = r.conflicts[i - 1];
        const cur = r.conflicts[i];
        const ordered =
          prev.ruleIdA < cur.ruleIdA ||
          (prev.ruleIdA === cur.ruleIdA && prev.ruleIdB < cur.ruleIdB) ||
          (prev.ruleIdA === cur.ruleIdA &&
            prev.ruleIdB === cur.ruleIdB &&
            prev.parameter <= cur.parameter);
        expect(ordered).toBe(true);
      }
    });

    it("distinct conflicting pairs never exceed pairsEvaluated", () => {
      const r = fresh().detectConflicts();
      const distinctPairs = new Set(r.conflicts.map((c) => `${c.ruleIdA} ${c.ruleIdB}`));
      expect(distinctPairs.size).toBeLessThanOrEqual(r.pairsEvaluated);
    });

    it("every byParameter key is a recognized ConflictParameter", () => {
      const allowed = ["feedrate", "spindle_speed", "depth_of_cut", "width_of_cut", "coolant"];
      for (const key of Object.keys(fresh().detectConflicts().byParameter)) {
        expect(allowed).toContain(key);
      }
    });

    it("is deterministic — two runs on the same store yield identical reports", () => {
      const eng = fresh();
      const a = eng.detectConflicts();
      const b = eng.detectConflicts();
      expect(a.conflictCount).toBe(b.conflictCount);
      expect(JSON.stringify(a.conflicts)).toBe(JSON.stringify(b.conflicts));
    });
  });

  describe("feedrate conflict detection", () => {
    it("flags two co-firing same-category rules with opposite feedrate directives", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-FEED-DOWN", "Reduce the feedrate for this material.", "milling", MAT_P));
      eng.addRule(fixtureRule("TEST-FEED-UP", "Increase the feedrate for this material.", "milling", MAT_P));
      const c = pairConflicts(eng.detectConflicts(), "TEST-FEED-DOWN", "TEST-FEED-UP")
        .find((x) => x.parameter === "feedrate");
      if (!c) throw new Error("feedrate conflict not detected for opposite-directive pair");
      expect(new Set([c.directionA, c.directionB])).toEqual(new Set(["increase", "decrease"]));
      expect(c.category).toBe("milling");
    });

    it("the conflict's sharedContext names the overlapping material group", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-FCTX-A", "Reduce the feedrate here.", "milling", MAT_P));
      eng.addRule(fixtureRule("TEST-FCTX-B", "Increase the feedrate here.", "milling", MAT_P));
      const c = pairConflicts(eng.detectConflicts(), "TEST-FCTX-A", "TEST-FCTX-B")[0];
      if (!c) throw new Error("expected conflict not detected");
      expect(c.sharedContext).toContain("material P");
    });

    it("does NOT flag two rules giving the SAME feedrate directive", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-SAME-A", "Increase the feedrate.", "milling", MAT_P));
      eng.addRule(fixtureRule("TEST-SAME-B", "Raise the feedrate further.", "milling", MAT_P));
      expect(paramsForPair(eng.detectConflicts(), "TEST-SAME-A", "TEST-SAME-B")).not.toContain("feedrate");
    });

    it("recognizes 'chip load' as a feedrate synonym", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-CL-DOWN", "Reduce the chip load on entry.", "milling", MAT_P));
      eng.addRule(fixtureRule("TEST-CL-UP", "Increase the chip load for productivity.", "milling", MAT_P));
      expect(paramsForPair(eng.detectConflicts(), "TEST-CL-DOWN", "TEST-CL-UP")).toContain("feedrate");
    });

    it("injecting a conflicting pair strictly raises conflictCount versus baseline", () => {
      const eng = fresh();
      const before = eng.detectConflicts().conflictCount;
      eng.addRule(fixtureRule("TEST-RAISE-A", "Reduce the feedrate.", "milling", MAT_P));
      eng.addRule(fixtureRule("TEST-RAISE-B", "Increase the feedrate.", "milling", MAT_P));
      expect(eng.detectConflicts().conflictCount).toBeGreaterThan(before);
    });
  });

  describe("conflict detection across other parameters", () => {
    it("flags opposite spindle-speed directives", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-RPM-DOWN", "Lower the spindle speed to control heat.", "milling", MAT_P));
      eng.addRule(fixtureRule("TEST-RPM-UP", "Raise the spindle speed for finish.", "milling", MAT_P));
      expect(paramsForPair(eng.detectConflicts(), "TEST-RPM-DOWN", "TEST-RPM-UP")).toContain("spindle_speed");
    });

    it("flags opposite depth-of-cut directives", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-DOC-DOWN", "Reduce the depth of cut near thin floors.", "thin_wall", MAT_P));
      eng.addRule(fixtureRule("TEST-DOC-UP", "Increase the depth of cut to remove stock.", "thin_wall", MAT_P));
      expect(paramsForPair(eng.detectConflicts(), "TEST-DOC-DOWN", "TEST-DOC-UP")).toContain("depth_of_cut");
    });

    it("flags opposite coolant directives", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-COOL-DOWN", "Reduce coolant pressure to stop washout.", "milling", MAT_P));
      eng.addRule(fixtureRule("TEST-COOL-UP", "Increase coolant flow for chip evacuation.", "milling", MAT_P));
      expect(paramsForPair(eng.detectConflicts(), "TEST-COOL-DOWN", "TEST-COOL-UP")).toContain("coolant");
    });
  });

  describe("negation handling", () => {
    it("'never increase feedrate' conflicts with 'increase feedrate'", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-NEG-A", "Never increase the feedrate when machining this.", "milling", MAT_P));
      eng.addRule(fixtureRule("TEST-NEG-B", "Increase the feedrate to maximize output.", "milling", MAT_P));
      const c = pairConflicts(eng.detectConflicts(), "TEST-NEG-A", "TEST-NEG-B")
        .find((x) => x.parameter === "feedrate");
      if (!c) throw new Error("negation-flipped conflict not detected");
      expect(new Set([c.directionA, c.directionB])).toEqual(new Set(["increase", "decrease"]));
    });

    it("'do not reduce feedrate' conflicts with 'reduce feedrate'", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-NEG2-A", "Do not reduce the feedrate in this pass.", "milling", MAT_P));
      eng.addRule(fixtureRule("TEST-NEG2-B", "Reduce the feedrate for surface finish.", "milling", MAT_P));
      expect(paramsForPair(eng.detectConflicts(), "TEST-NEG2-A", "TEST-NEG2-B")).toContain("feedrate");
    });
  });

  describe("internal-ambiguity exclusion", () => {
    it("a rule advising BOTH feedrate directions is not flagged against a clean opposite", () => {
      const eng = fresh();
      eng.addRule(fixtureRule(
        "TEST-AMBIG",
        "Increase the feedrate for roughing but reduce the feedrate for finishing.",
        "milling",
        MAT_P,
      ));
      eng.addRule(fixtureRule("TEST-CLEAN", "Increase the feedrate.", "milling", MAT_P));
      expect(paramsForPair(eng.detectConflicts(), "TEST-AMBIG", "TEST-CLEAN")).not.toContain("feedrate");
    });

    it("an ambiguous rule does not raise conflictCount against a clean opposite", () => {
      const eng = fresh();
      const before = eng.detectConflicts().conflictCount;
      eng.addRule(fixtureRule(
        "TEST-AMBIG2",
        "Reduce the feedrate, then increase the feedrate later.",
        "milling",
        MAT_P,
      ));
      eng.addRule(fixtureRule("TEST-CLEAN2", "Reduce the feedrate.", "milling", MAT_P));
      expect(eng.detectConflicts().conflictCount).toBe(before);
    });
  });

  describe("co-fire gating", () => {
    it("does NOT flag opposite directives in DIFFERENT categories", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-CAT-A", "Reduce the feedrate.", "roughing", MAT_P));
      eng.addRule(fixtureRule("TEST-CAT-B", "Increase the feedrate.", "finishing", MAT_P));
      expect(pairConflicts(eng.detectConflicts(), "TEST-CAT-A", "TEST-CAT-B")).toEqual([]);
    });

    it("does NOT flag opposite directives with NO condition overlap", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-OVL-A", "Reduce the feedrate.", "milling", [
        { type: "material_iso", groups: ["P"] },
      ]));
      eng.addRule(fixtureRule("TEST-OVL-B", "Increase the feedrate.", "milling", [
        { type: "material_iso", groups: ["M"] },
      ]));
      expect(pairConflicts(eng.detectConflicts(), "TEST-OVL-A", "TEST-OVL-B")).toEqual([]);
    });

    it("flags opposite directives that co-fire via a shared feature condition", () => {
      const eng = fresh();
      const feat: Condition[] = [{ type: "feature_present", features: ["pocket"] }];
      eng.addRule(fixtureRule("TEST-FEAT-A", "Reduce the feedrate.", "milling", feat));
      eng.addRule(fixtureRule("TEST-FEAT-B", "Increase the feedrate.", "milling", feat));
      const c = pairConflicts(eng.detectConflicts(), "TEST-FEAT-A", "TEST-FEAT-B")[0];
      if (!c) throw new Error("feature-overlap conflict not detected");
      expect(c.sharedContext).toContain("feature pocket");
    });
  });

  describe("shared-context description", () => {
    it("an always-triggered rule co-fires within its category and names 'always'", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-ALW-A", "Reduce the feedrate.", "milling", [{ type: "always" }]));
      eng.addRule(fixtureRule("TEST-ALW-B", "Increase the feedrate.", "milling", MAT_P));
      const c = pairConflicts(eng.detectConflicts(), "TEST-ALW-A", "TEST-ALW-B")[0];
      if (!c) throw new Error("always-rule conflict not detected");
      expect(c.sharedContext).toContain("always");
      expect(c.sharedContext).toContain("TEST-ALW-A");
    });

    it("a shared operation_type condition produces an operation context string", () => {
      const eng = fresh();
      const op: Condition[] = [{ type: "operation_type", operations: ["drill"] }];
      eng.addRule(fixtureRule("TEST-OP-A", "Reduce the feedrate.", "hole_making", op));
      eng.addRule(fixtureRule("TEST-OP-B", "Increase the feedrate.", "hole_making", op));
      const c = pairConflicts(eng.detectConflicts(), "TEST-OP-A", "TEST-OP-B")[0];
      if (!c) throw new Error("operation-overlap conflict not detected");
      expect(c.sharedContext).toContain("operation drill");
    });
  });

  describe("adversarial robustness", () => {
    it("a rule with a non-string rule field neither crashes nor produces a conflict", () => {
      const eng = fresh();
      const hostile = fixtureRule("TEST-NONSTR", "placeholder", "milling", MAT_P);
      (hostile as { rule: unknown }).rule = 42;
      eng.addRule(hostile);
      eng.addRule(fixtureRule("TEST-NONSTR-PEER", "Increase the feedrate.", "milling", MAT_P));
      const r = eng.detectConflicts();
      expect(r.conflictCount).toBe(r.conflicts.length);
      expect(pairConflicts(r, "TEST-NONSTR", "TEST-NONSTR-PEER")).toEqual([]);
    });

    it("a rule with non-array conditions neither crashes nor produces a conflict", () => {
      const eng = fresh();
      const hostile = fixtureRule("TEST-BADCOND", "Reduce the feedrate.", "milling", [{ type: "always" }]);
      (hostile as { conditions: unknown }).conditions = "not-an-array";
      eng.addRule(hostile);
      eng.addRule(fixtureRule("TEST-BADCOND-PEER", "Increase the feedrate.", "milling", MAT_P));
      const r = eng.detectConflicts();
      expect(r.conflictCount).toBe(r.conflicts.length);
      expect(pairConflicts(r, "TEST-BADCOND", "TEST-BADCOND-PEER")).toEqual([]);
    });

    it("a rule whose related material list contains a non-string entry is tolerated", () => {
      const eng = fresh();
      const hostile = fixtureRule("TEST-BADMAT", "Reduce the feedrate.", "milling", [
        { type: "material_iso", groups: ["P", 7 as unknown as string] },
      ]);
      eng.addRule(hostile);
      eng.addRule(fixtureRule("TEST-BADMAT-PEER", "Increase the feedrate.", "milling", MAT_P));
      const r = eng.detectConflicts();
      // 'P' is still a valid string group — the pair co-fires and conflicts cleanly.
      expect(paramsForPair(r, "TEST-BADMAT", "TEST-BADMAT-PEER")).toContain("feedrate");
    });
  });

  describe("conditions_all (AND-logic) co-fire detection", () => {
    // The U-PB-CONFLICT-DETECT-CONDITIONS-ALL fix (closing the previously-logged
    // P2): conditionDiscretes now folds rule.conditions_all into the discrete
    // set, so AND-logic triggers participate in co-fire detection alongside the
    // OR-logic `conditions` array. Before the fix, ~13 canonical rules whose
    // discrete trigger lives only in conditions_all were silently never co-fired.

    it("flags conditions_all-only material overlap with the right shared context (not 'always')", () => {
      const eng = fresh();
      // OLD code: both rules have only {always} in `conditions` → describeOverlap
      // falls to the always-fallback, sharedContext mentions "always". NEW code:
      // material P comes from conditions_all → sharedContext mentions material P.
      const alwaysOnly: Condition[] = [{ type: "always" }];
      eng.addRule(fixtureRule("TEST-CA-MAT-A", "Reduce the feedrate.", "milling", alwaysOnly, MAT_P));
      eng.addRule(fixtureRule("TEST-CA-MAT-B", "Increase the feedrate.", "milling", alwaysOnly, MAT_P));
      const c = pairConflicts(eng.detectConflicts(), "TEST-CA-MAT-A", "TEST-CA-MAT-B")
        .find((x) => x.parameter === "feedrate");
      if (!c) throw new Error("conditions_all-only material overlap not detected");
      expect(c.sharedContext).toContain("material P");
      expect(c.sharedContext).not.toContain("always");
    });

    it("flags conditions_all-only co-fire on a shared feature", () => {
      const eng = fresh();
      const alwaysOnly: Condition[] = [{ type: "always" }];
      const feat: Condition[] = [{ type: "feature_present", features: ["pocket"] }];
      eng.addRule(fixtureRule("TEST-CA-FEAT-A", "Reduce the feedrate.", "milling", alwaysOnly, feat));
      eng.addRule(fixtureRule("TEST-CA-FEAT-B", "Increase the feedrate.", "milling", alwaysOnly, feat));
      const c = pairConflicts(eng.detectConflicts(), "TEST-CA-FEAT-A", "TEST-CA-FEAT-B")
        .find((x) => x.parameter === "feedrate");
      if (!c) throw new Error("conditions_all-only feature overlap not detected");
      expect(c.sharedContext).toContain("feature pocket");
    });

    it("flags conditions_all-only co-fire on a shared operation", () => {
      const eng = fresh();
      const alwaysOnly: Condition[] = [{ type: "always" }];
      const op: Condition[] = [{ type: "operation_type", operations: ["drill"] }];
      eng.addRule(fixtureRule("TEST-CA-OP-A", "Reduce the feedrate.", "hole_making", alwaysOnly, op));
      eng.addRule(fixtureRule("TEST-CA-OP-B", "Increase the feedrate.", "hole_making", alwaysOnly, op));
      const c = pairConflicts(eng.detectConflicts(), "TEST-CA-OP-A", "TEST-CA-OP-B")
        .find((x) => x.parameter === "feedrate");
      if (!c) throw new Error("conditions_all-only operation overlap not detected");
      expect(c.sharedContext).toContain("operation drill");
    });

    it("KILLER CASE: detects co-fire where the discrete trigger lives ONLY in one rule's conditions_all and the other rule's conditions", () => {
      const eng = fresh();
      // R1: triggers when (material P) AND (operation drill). R2: triggers when feature pocket OR material P.
      // OLD discretes(R1) = {material P} (from conditions only). OLD discretes(R2) = {feature pocket} (from conditions only).
      // OLD intersection: empty → null co-fire → MISSED.
      // NEW discretes(R1) = {material P, operation drill}. NEW discretes(R2) = {feature pocket, material P}.
      // NEW intersection: material P → co-fire detected.
      eng.addRule(fixtureRule("TEST-CA-KILLER-A", "Reduce the feedrate.", "milling",
        [{ type: "material_iso", groups: ["P"] }],
        [{ type: "operation_type", operations: ["drill"] }]));
      eng.addRule(fixtureRule("TEST-CA-KILLER-B", "Increase the feedrate.", "milling",
        [{ type: "feature_present", features: ["pocket"] }],
        [{ type: "material_iso", groups: ["P"] }]));
      const c = pairConflicts(eng.detectConflicts(), "TEST-CA-KILLER-A", "TEST-CA-KILLER-B")
        .find((x) => x.parameter === "feedrate");
      if (!c) throw new Error("killer-case co-fire (cross-array discrete overlap) not detected");
      expect(c.sharedContext).toContain("material P");
    });

    it("flags mixed: one rule has only conditions_all, the other has only conditions, same material", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-CA-MIX-A", "Reduce the feedrate.", "milling", [{ type: "always" }], MAT_P));
      eng.addRule(fixtureRule("TEST-CA-MIX-B", "Increase the feedrate.", "milling", MAT_P));
      expect(paramsForPair(eng.detectConflicts(), "TEST-CA-MIX-A", "TEST-CA-MIX-B")).toContain("feedrate");
    });

    it("does NOT flag disjoint conditions_all (R1 material P, R2 material M)", () => {
      const eng = fresh();
      const alwaysOnly: Condition[] = [{ type: "always" }];
      eng.addRule(fixtureRule("TEST-CA-DISJ-A", "Reduce the feedrate.", "milling", alwaysOnly, MAT_P));
      eng.addRule(fixtureRule("TEST-CA-DISJ-B", "Increase the feedrate.", "milling", alwaysOnly,
        [{ type: "material_iso", groups: ["M"] }]));
      // Discretes intersect to nothing; both rules have always so the fallback fires,
      // but the discrete-intersection branch is taken first when materials/features/operations exist
      // — here neither side has shared discretes, so we fall back to "always" co-fire, NOT to "no co-fire".
      // The conflict, if any, would have sharedContext "applies unconditionally". To assert real
      // disjointness, drop the `always` so the always-fallback can't fire either.
      const eng2 = fresh();
      eng2.addRule(fixtureRule("TEST-CA-DISJ2-A", "Reduce the feedrate.", "milling",
        [{ type: "material_iso", groups: ["X"] }], MAT_P));
      eng2.addRule(fixtureRule("TEST-CA-DISJ2-B", "Increase the feedrate.", "milling",
        [{ type: "material_iso", groups: ["Y"] }], [{ type: "material_iso", groups: ["M"] }]));
      // discretes(A) = {material X, material P}, discretes(B) = {material Y, material M} — disjoint.
      expect(pairConflicts(eng2.detectConflicts(), "TEST-CA-DISJ2-A", "TEST-CA-DISJ2-B")).toEqual([]);
    });

    it("treats an always token sitting in conditions_all as the always trigger", () => {
      const eng = fresh();
      eng.addRule(fixtureRule("TEST-CA-ALW-A", "Reduce the feedrate.", "milling",
        [{ type: "material_iso", groups: ["X"] }], [{ type: "always" }]));
      eng.addRule(fixtureRule("TEST-CA-ALW-B", "Increase the feedrate.", "milling",
        [{ type: "material_iso", groups: ["Y"] }], [{ type: "always" }]));
      // No discrete intersection (X vs Y) but BOTH have always (via conditions_all) → fallback fires.
      const c = pairConflicts(eng.detectConflicts(), "TEST-CA-ALW-A", "TEST-CA-ALW-B")
        .find((x) => x.parameter === "feedrate");
      if (!c) throw new Error("always-in-conditions_all co-fire not detected");
      expect(c.sharedContext).toContain("always");
    });

    it("adversarial: a non-array conditions_all is tolerated (no crash, no spurious co-fire)", () => {
      const eng = fresh();
      const hostile = fixtureRule("TEST-CA-BADCA-A", "Reduce the feedrate.", "milling", MAT_P);
      (hostile as { conditions_all: unknown }).conditions_all = "not-an-array";
      eng.addRule(hostile);
      eng.addRule(fixtureRule("TEST-CA-BADCA-B", "Increase the feedrate.", "milling", MAT_P));
      // Material P overlap still fires from `conditions`; the malformed conditions_all is skipped.
      expect(paramsForPair(eng.detectConflicts(), "TEST-CA-BADCA-A", "TEST-CA-BADCA-B")).toContain("feedrate");
    });

    it("adversarial: null entries inside conditions_all are skipped, valid entries survive", () => {
      const eng = fresh();
      const hostile = fixtureRule("TEST-CA-NULL-A", "Reduce the feedrate.", "milling", [{ type: "always" }],
        [null as unknown as Condition, { type: "material_iso", groups: ["P"] }]);
      eng.addRule(hostile);
      eng.addRule(fixtureRule("TEST-CA-NULL-B", "Increase the feedrate.", "milling", [{ type: "always" }], MAT_P));
      expect(paramsForPair(eng.detectConflicts(), "TEST-CA-NULL-A", "TEST-CA-NULL-B")).toContain("feedrate");
    });

    it("adversarial: non-string array members inside a conditions_all entry are skipped", () => {
      const eng = fresh();
      const hostile = fixtureRule("TEST-CA-BADMEM-A", "Reduce the feedrate.", "milling", [{ type: "always" }],
        [{ type: "material_iso", groups: ["P", 42 as unknown as string] }]);
      eng.addRule(hostile);
      eng.addRule(fixtureRule("TEST-CA-BADMEM-B", "Increase the feedrate.", "milling", [{ type: "always" }], MAT_P));
      // "P" survives the per-element string guard, 42 is dropped → co-fire on material P.
      expect(paramsForPair(eng.detectConflicts(), "TEST-CA-BADMEM-A", "TEST-CA-BADMEM-B")).toContain("feedrate");
    });

    it("canonical-corpus invariants still hold after the fold (no count-shape regression)", () => {
      const r = fresh().detectConflicts();
      expect(r.conflictCount).toBe(r.conflicts.length);
      const sum = Object.values(r.byParameter).reduce((a, b) => a + b, 0);
      expect(sum).toBe(r.conflictCount);
      const distinctPairs = new Set(r.conflicts.map((c) => `${c.ruleIdA} ${c.ruleIdB}`));
      expect(distinctPairs.size).toBeLessThanOrEqual(r.pairsEvaluated);
    });
  });

  describe("singleton", () => {
    it("the exported singleton exposes detectConflicts with a shape-correct report", () => {
      const r = machiningPlaybookEngine.detectConflicts();
      expect(Array.isArray(r.conflicts)).toBe(true);
      expect(r.conflictCount).toBe(r.conflicts.length);
      expect(typeof r.conflictFree).toBe("boolean");
      expect(r.totalRules).toBeGreaterThan(0);
    });
  });
});
