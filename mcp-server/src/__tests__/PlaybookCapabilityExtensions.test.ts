/**
 * PlaybookCapabilityExtensions.test.ts — U-PB-EXPAND-CAPABILITIES
 *
 * Verifies the three new playbook capabilities added to MachiningPlaybookEngine:
 *   - explainRule:           deep single-rule + related-chain resolution
 *   - coverageReport:        per-job blind-spot analysis over advise()
 *   - quantitativeGuidance:  applicable rules carrying threshold formulas
 *
 * Pure data-driven enhancements that compose the existing 296-rule store +
 * advise() ranker. Tests assert real invariants against real canonical rules,
 * and use addRule() to inject controlled fixtures for cycle / unresolved /
 * dedup paths so the assertions stay deterministic.
 */
import { describe, it, expect } from "vitest";
import {
  MachiningPlaybookEngine,
  machiningPlaybookEngine,
  type PlaybookRule,
} from "../engines/MachiningPlaybookEngine.js";

const fresh = () => new MachiningPlaybookEngine();

describe("MachiningPlaybookEngine — capability extensions (U-PB-EXPAND)", () => {
  describe("explainRule — deep single-rule with related chain", () => {
    it("returns null for a rule id that is not in the playbook", () => {
      expect(fresh().explainRule("BOGUS-DOES-NOT-EXIST-XYZ")).toBe(null);
    });

    it("returns the canonical SEQ-001 rule with its presence flags set", () => {
      const exp = fresh().explainRule("SEQ-001");
      if (!exp) throw new Error("SEQ-001 not found in canonical playbook");
      expect(exp.rule.id).toBe("SEQ-001");
      expect(exp.rule.category).toBe("sequencing");
      expect(exp.rule.severity).toBe("critical");
      // SEQ-001 is documented with a quantitative threshold formula.
      expect(exp.hasQuantitative).toBe(true);
    });

    it("resolves a forward related_rules cross-reference to its real rule", () => {
      const eng = fresh();
      eng.addRule({
        id: "TEST-LINK-FORWARD",
        category: "sequencing",
        severity: "tip",
        title: "links forward to SEQ-001",
        rule: "links",
        reasoning: "test of related-rule resolution",
        conditions: [{ type: "always" }],
        exceptions: [],
        related_rules: ["SEQ-001"],
        source: "test",
      });
      const exp = eng.explainRule("TEST-LINK-FORWARD");
      if (!exp) throw new Error("TEST-LINK-FORWARD not found");
      expect(exp.relatedResolved.map((r) => r.id)).toEqual(["SEQ-001"]);
      expect(exp.unresolvedRelated).toEqual([]);
    });

    it("lists unresolved related_rules separately from the resolved set", () => {
      const eng = fresh();
      eng.addRule({
        id: "TEST-LINKS-MIXED",
        category: "sequencing",
        severity: "tip",
        title: "one real, one fake",
        rule: "mixed links",
        reasoning: "test",
        conditions: [{ type: "always" }],
        exceptions: [],
        related_rules: ["SEQ-001", "NEVER-EXISTED-RULE-9999"],
        source: "test",
      });
      const exp = eng.explainRule("TEST-LINKS-MIXED");
      if (!exp) throw new Error("TEST-LINKS-MIXED not found");
      expect(exp.relatedResolved.map((r) => r.id)).toEqual(["SEQ-001"]);
      expect(exp.unresolvedRelated).toEqual(["NEVER-EXISTED-RULE-9999"]);
    });

    it("the seen-guard drops a self-referencing related_rules entry", () => {
      const eng = fresh();
      eng.addRule({
        id: "TEST-SELF-REF",
        category: "sequencing",
        severity: "tip",
        title: "self-ref",
        rule: "I link to myself",
        reasoning: "cycle-guard test",
        conditions: [{ type: "always" }],
        exceptions: [],
        related_rules: ["TEST-SELF-REF"],
        source: "test",
      });
      const exp = eng.explainRule("TEST-SELF-REF");
      if (!exp) throw new Error("TEST-SELF-REF not found");
      expect(exp.relatedResolved).toEqual([]);
      expect(exp.unresolvedRelated).toEqual([]);
    });

    it("deduplicates a related_rules list that names the same id twice", () => {
      const eng = fresh();
      eng.addRule({
        id: "TEST-DUP-RELATED",
        category: "sequencing",
        severity: "tip",
        title: "dup-related",
        rule: "duplicated cross-reference",
        reasoning: "test",
        conditions: [{ type: "always" }],
        exceptions: [],
        related_rules: ["SEQ-001", "SEQ-001"],
        source: "test",
      });
      const exp = eng.explainRule("TEST-DUP-RELATED");
      if (!exp) throw new Error("TEST-DUP-RELATED not found");
      expect(exp.relatedResolved).toHaveLength(1);
      expect(exp.relatedResolved[0].id).toBe("SEQ-001");
    });

    it("hasExceptions truthfully reflects rule.exceptions.length", () => {
      const eng = fresh();
      eng.addRule({
        id: "TEST-WITH-EXC",
        category: "sequencing",
        severity: "tip",
        title: "carries exceptions",
        rule: "x",
        reasoning: "test",
        conditions: [{ type: "always" }],
        exceptions: ["except when X", "except when Y"],
        source: "test",
      });
      eng.addRule({
        id: "TEST-NO-EXC",
        category: "sequencing",
        severity: "tip",
        title: "no exceptions",
        rule: "x",
        reasoning: "test",
        conditions: [{ type: "always" }],
        exceptions: [],
        source: "test",
      });
      expect(eng.explainRule("TEST-WITH-EXC")!.hasExceptions).toBe(true);
      expect(eng.explainRule("TEST-NO-EXC")!.hasExceptions).toBe(false);
    });

    it("evidenceLevel falls back to 'unspecified' when the rule omits the field", () => {
      const eng = fresh();
      eng.addRule({
        id: "TEST-NO-EVIDENCE",
        category: "sequencing",
        severity: "tip",
        title: "no evidence level",
        rule: "x",
        reasoning: "test",
        conditions: [{ type: "always" }],
        exceptions: [],
        source: "test",
      });
      expect(eng.explainRule("TEST-NO-EVIDENCE")!.evidenceLevel).toBe("unspecified");
    });

    it("treats a non-string related_rules entry as unresolvable (no crash)", () => {
      const eng = fresh();
      eng.addRule({
        id: "TEST-DIRTY-RELATED",
        category: "sequencing",
        severity: "tip",
        title: "dirty related",
        rule: "x",
        reasoning: "test",
        conditions: [{ type: "always" }],
        exceptions: [],
        // Force a non-string into related_rules via a deliberate adversarial cast.
        related_rules: ["SEQ-001", 42 as unknown as string, ""],
        source: "test",
      });
      const exp = eng.explainRule("TEST-DIRTY-RELATED");
      if (!exp) throw new Error("TEST-DIRTY-RELATED not found");
      expect(exp.relatedResolved.map((r) => r.id)).toEqual(["SEQ-001"]);
      // 42 and "" are both dropped — they appear in neither resolved nor unresolved.
      expect(exp.unresolvedRelated).toEqual([]);
    });
  });

  describe("coverageReport — per-job blind-spot analysis", () => {
    it("totalRulesEvaluated equals getAllRules().length", () => {
      const eng = fresh();
      expect(eng.coverageReport({}).totalRulesEvaluated).toBe(eng.getAllRules().length);
    });

    it("an empty-context query returns a positive applicableCount", () => {
      const r = fresh().coverageReport({});
      expect(r.applicableCount).toBeGreaterThan(0);
    });

    it("bySeverity buckets sum exactly to applicableCount", () => {
      const r = fresh().coverageReport({});
      const sum = r.bySeverity.critical + r.bySeverity.important + r.bySeverity.recommended + r.bySeverity.tip;
      expect(sum).toBe(r.applicableCount);
    });

    it("criticalApplicable is identical to bySeverity.critical", () => {
      const r = fresh().coverageReport({});
      expect(r.criticalApplicable).toBe(r.bySeverity.critical);
    });

    it("ruleIds length matches applicableCount", () => {
      const r = fresh().coverageReport({});
      expect(r.ruleIds.length).toBe(r.applicableCount);
    });

    it("every byCategory key is a real category present in the rule store", () => {
      const eng = fresh();
      const known = new Set(eng.getAllRules().map((r) => r.category as string));
      const r = eng.coverageReport({});
      for (const cat of Object.keys(r.byCategory)) {
        expect(known.has(cat)).toBe(true);
      }
    });

    it("filtering to a single category drives other categories into blindSpotCategories", () => {
      const r = fresh().coverageReport({ categories: ["sequencing"] });
      expect(r.blindSpotCategories.length).toBeGreaterThan(0);
      expect(r.blindSpotCategories.includes("sequencing")).toBe(false);
    });

    it("blindSpotCategories is sorted alphabetically", () => {
      const r = fresh().coverageReport({ categories: ["sequencing"] });
      const sorted = [...r.blindSpotCategories].sort();
      expect(r.blindSpotCategories).toEqual(sorted);
    });

    it("severity_min:critical drives non-critical buckets to exactly 0", () => {
      const r = fresh().coverageReport({ categories: ["sequencing"], severity_min: "critical" });
      expect(r.bySeverity.important).toBe(0);
      expect(r.bySeverity.recommended).toBe(0);
      expect(r.bySeverity.tip).toBe(0);
    });

    it("byCategory counts sum to applicableCount (categories partition the applicable set)", () => {
      const r = fresh().coverageReport({});
      const sum = Object.values(r.byCategory).reduce((a, b) => a + b, 0);
      expect(sum).toBe(r.applicableCount);
    });
  });

  describe("quantitativeGuidance — applicable rules with threshold formulas", () => {
    it("count is always equal to entries.length (structural invariant)", () => {
      const r = fresh().quantitativeGuidance({});
      expect(r.count).toBe(r.entries.length);
    });

    it("at least the canonical SEQ-001 rule carries a quantitative formula", () => {
      const r = fresh().quantitativeGuidance({});
      expect(r.entries.some((e) => e.ruleId === "SEQ-001")).toBe(true);
    });

    it("every entry's quantitative field is a non-empty string", () => {
      const r = fresh().quantitativeGuidance({});
      // The "at least SEQ-001" test above already proves count > 0 on canonical data.
      for (const e of r.entries) {
        expect(typeof e.quantitative).toBe("string");
        expect(e.quantitative.length).toBeGreaterThan(0);
      }
    });

    it("withQuantitativePct equals round(count/totalApplicable * 1000) / 10", () => {
      const r = fresh().quantitativeGuidance({});
      const expected =
        r.totalApplicable > 0 ? Math.round((r.count / r.totalApplicable) * 1000) / 10 : 0;
      expect(r.withQuantitativePct).toBe(expected);
    });

    it("totalApplicable matches advise() rule count for the same query", () => {
      const eng = fresh();
      const q = { material_iso: "P" };
      const adviseCount = eng.advise(q).rules.length;
      expect(eng.quantitativeGuidance(q).totalApplicable).toBe(adviseCount);
    });

    it("every entry's severity is one of the four canonical levels", () => {
      const r = fresh().quantitativeGuidance({});
      const allowed = new Set(["critical", "important", "recommended", "tip"]);
      for (const e of r.entries) {
        expect(allowed.has(e.severity)).toBe(true);
      }
    });

    it("entry.standardRef is set iff the underlying rule carries a non-empty standard_ref", () => {
      const eng = fresh();
      const r = eng.quantitativeGuidance({});
      const allRules: PlaybookRule[] = eng.getAllRules();
      for (const e of r.entries) {
        const src = allRules.find((rule) => rule.id === e.ruleId);
        if (!src) throw new Error(`source rule ${e.ruleId} missing`);
        const srcHasRef = typeof src.standard_ref === "string" && src.standard_ref.length > 0;
        if (srcHasRef) {
          expect(e.standardRef).toBe(src.standard_ref);
        } else {
          // No standard_ref on the source → engine OMITS the property on the entry.
          expect("standardRef" in e).toBe(false);
        }
      }
    });

    it("the exported singleton exposes the new methods and they return shape-correct objects", () => {
      const r = machiningPlaybookEngine.quantitativeGuidance({});
      expect(Array.isArray(r.entries)).toBe(true);
      expect(r.count).toBe(r.entries.length);
    });

    it("withQuantitativePct lies in the [0,100] interval and is finite", () => {
      const r = fresh().quantitativeGuidance({});
      expect(r.withQuantitativePct).toBeGreaterThanOrEqual(0);
      expect(r.withQuantitativePct).toBeLessThanOrEqual(100);
      expect(Number.isFinite(r.withQuantitativePct)).toBe(true);
    });
  });
});
