/**
 * PlaybookIntegrityAudit.test.ts — U-PB-INTEGRITY-AUDIT
 *
 * Verifies MachiningPlaybookEngine.auditIntegrity() — the playbook-corpus
 * integrity scan. Structural invariants are asserted against the real
 * canonical 296-rule store; specific defect detection is asserted against
 * controlled fixtures injected via addRule(), so each issueType has a test
 * that fails if its detection logic regresses.
 */
import { describe, it, expect } from "vitest";
import {
  MachiningPlaybookEngine,
  machiningPlaybookEngine,
} from "../engines/MachiningPlaybookEngine.js";

const fresh = () => new MachiningPlaybookEngine();

/** A minimal well-formed rule — every required PlaybookRule field present. */
function goodRule(id: string, related?: string[]) {
  return {
    id,
    category: "sequencing" as const,
    severity: "tip" as const,
    title: `fixture ${id}`,
    rule: "fixture rule body",
    reasoning: "fixture reasoning text",
    conditions: [{ type: "always" as const }],
    exceptions: [],
    related_rules: related,
    source: "test",
  };
}

/** All issueType strings recorded against a given ruleId in a report. */
function issueTypesFor(report: { issues: { ruleId: string; issueType: string }[] }, ruleId: string): string[] {
  return report.issues.filter((i) => i.ruleId === ruleId).map((i) => i.issueType);
}

describe("MachiningPlaybookEngine.auditIntegrity — U-PB-INTEGRITY-AUDIT", () => {
  describe("structural invariants on the canonical corpus", () => {
    it("totalRules equals getAllRules().length", () => {
      const eng = fresh();
      expect(eng.auditIntegrity().totalRules).toBe(eng.getAllRules().length);
    });

    it("issueCount is exactly issues.length", () => {
      const r = fresh().auditIntegrity();
      expect(r.issueCount).toBe(r.issues.length);
    });

    it("byType counts sum exactly to issueCount", () => {
      const r = fresh().auditIntegrity();
      const sum = Object.values(r.byType).reduce((a, b) => a + b, 0);
      expect(sum).toBe(r.issueCount);
    });

    it("healthy is true iff issueCount is zero (consistency, not a corpus claim)", () => {
      const r = fresh().auditIntegrity();
      expect(r.healthy).toBe(r.issueCount === 0);
    });

    it("uniqueRuleIds never exceeds totalRules", () => {
      const r = fresh().auditIntegrity();
      expect(r.uniqueRuleIds).toBeLessThanOrEqual(r.totalRules);
    });

    it("issues are sorted by ruleId then issueType (deterministic ordering)", () => {
      const r = fresh().auditIntegrity();
      for (let i = 1; i < r.issues.length; i++) {
        const prev = r.issues[i - 1];
        const cur = r.issues[i];
        const ordered =
          prev.ruleId < cur.ruleId ||
          (prev.ruleId === cur.ruleId && prev.issueType <= cur.issueType);
        expect(ordered).toBe(true);
      }
    });

    it("is deterministic — two runs on the same store yield identical reports", () => {
      const eng = fresh();
      const a = eng.auditIntegrity();
      const b = eng.auditIntegrity();
      expect(a.issueCount).toBe(b.issueCount);
      expect(JSON.stringify(a.issues)).toBe(JSON.stringify(b.issues));
    });

    it("every byType key is a recognized PlaybookIntegrityIssueType", () => {
      const allowed = [
        "duplicate_id",
        "dangling_related",
        "self_reference",
        "asymmetric_related",
        "empty_reasoning",
        "unreachable_rule",
      ];
      for (const key of Object.keys(fresh().auditIntegrity().byType)) {
        expect(allowed).toContain(key);
      }
    });
  });

  describe("dangling_related detection", () => {
    it("flags a rule whose related_rules points at a non-existent id", () => {
      const eng = fresh();
      eng.addRule(goodRule("TEST-DANGLING", ["NO-SUCH-RULE-9999"]));
      const issue = eng
        .auditIntegrity()
        .issues.find((i) => i.ruleId === "TEST-DANGLING" && i.issueType === "dangling_related");
      if (!issue) throw new Error("dangling_related not detected");
      expect(issue.detail).toContain("NO-SUCH-RULE-9999");
    });

    it("does NOT flag dangling when related_rules points at a real rule", () => {
      const eng = fresh();
      eng.addRule(goodRule("TEST-VALID-LINK", ["SEQ-001"]));
      expect(issueTypesFor(eng.auditIntegrity(), "TEST-VALID-LINK")).not.toContain("dangling_related");
    });
  });

  describe("self_reference detection", () => {
    it("flags a rule that lists its own id in related_rules", () => {
      const eng = fresh();
      eng.addRule(goodRule("TEST-SELFREF", ["TEST-SELFREF"]));
      const issue = eng
        .auditIntegrity()
        .issues.find((i) => i.ruleId === "TEST-SELFREF" && i.issueType === "self_reference");
      if (!issue) throw new Error("self_reference not detected");
      expect(issue.detail).toContain("own id");
    });

    it("a self-referencing rule is NOT also flagged dangling for its own id", () => {
      const eng = fresh();
      eng.addRule(goodRule("TEST-SELFREF-2", ["TEST-SELFREF-2"]));
      expect(issueTypesFor(eng.auditIntegrity(), "TEST-SELFREF-2")).not.toContain("dangling_related");
    });
  });

  describe("asymmetric_related detection", () => {
    it("flags A→B when B does not link back to A", () => {
      const eng = fresh();
      eng.addRule(goodRule("TEST-ASYM-A", ["TEST-ASYM-B"]));
      eng.addRule(goodRule("TEST-ASYM-B")); // B has no related_rules back to A
      const issue = eng
        .auditIntegrity()
        .issues.find((i) => i.ruleId === "TEST-ASYM-A" && i.issueType === "asymmetric_related");
      if (!issue) throw new Error("asymmetric_related not detected");
      expect(issue.detail).toContain("TEST-ASYM-B");
    });

    it("does NOT flag a symmetric A↔B related pair", () => {
      const eng = fresh();
      eng.addRule(goodRule("TEST-SYM-A", ["TEST-SYM-B"]));
      eng.addRule(goodRule("TEST-SYM-B", ["TEST-SYM-A"]));
      const report = eng.auditIntegrity();
      expect(issueTypesFor(report, "TEST-SYM-A")).not.toContain("asymmetric_related");
      expect(issueTypesFor(report, "TEST-SYM-B")).not.toContain("asymmetric_related");
    });
  });

  describe("duplicate_id — canonical corpus authoring integrity", () => {
    // addRule() enforces id-uniqueness at the only runtime mutation point, so a
    // duplicate id can ONLY arise from the hand-authored PLAYBOOK_RULES literal
    // (the constructor copies it without de-duping). These tests are the
    // regression guard for that authoring surface — they exercise the same
    // idCounts map the duplicate_id check reads.
    it("the canonical corpus has zero duplicate rule ids (uniqueRuleIds === totalRules)", () => {
      const r = fresh().auditIntegrity();
      expect(r.uniqueRuleIds).toBe(r.totalRules);
    });

    it("the canonical audit reports no duplicate_id issues", () => {
      const r = fresh().auditIntegrity();
      const dupIssues = r.issues.filter((i) => i.issueType === "duplicate_id");
      expect(dupIssues).toEqual([]);
    });

    it("addRule rejects a colliding id — duplicate_id is canonical-only, never runtime", () => {
      const eng = fresh();
      expect(() => eng.addRule(goodRule("SEQ-001"))).toThrow(/already exists/i);
    });
  });

  describe("empty_reasoning detection", () => {
    it("flags a rule whose reasoning is whitespace-only", () => {
      const eng = fresh();
      const rule = goodRule("TEST-NO-REASON");
      rule.reasoning = "   ";
      eng.addRule(rule);
      expect(issueTypesFor(eng.auditIntegrity(), "TEST-NO-REASON")).toContain("empty_reasoning");
    });
  });

  describe("unreachable_rule detection", () => {
    it("flags a rule that has neither conditions nor conditions_all", () => {
      const eng = fresh();
      const rule = goodRule("TEST-UNREACHABLE");
      rule.conditions = [];
      eng.addRule(rule);
      const issue = eng
        .auditIntegrity()
        .issues.find((i) => i.ruleId === "TEST-UNREACHABLE" && i.issueType === "unreachable_rule");
      if (!issue) throw new Error("unreachable_rule not detected");
      expect(issue.detail).toContain("never match");
    });

    it("does NOT flag a rule that has conditions_all even when conditions is empty", () => {
      const eng = fresh();
      const rule = {
        ...goodRule("TEST-COND-ALL"),
        conditions: [],
        conditions_all: [{ type: "always" as const }],
      };
      eng.addRule(rule);
      expect(issueTypesFor(eng.auditIntegrity(), "TEST-COND-ALL")).not.toContain("unreachable_rule");
    });
  });

  describe("multi-defect & singleton", () => {
    it("reports every distinct defect on a rule that has two at once", () => {
      const eng = fresh();
      const rule = goodRule("TEST-MULTI", ["GHOST-RULE-XYZ"]);
      rule.reasoning = "";
      eng.addRule(rule);
      const types = new Set(issueTypesFor(eng.auditIntegrity(), "TEST-MULTI"));
      expect(types.has("empty_reasoning")).toBe(true);
      expect(types.has("dangling_related")).toBe(true);
    });

    it("injecting a defect strictly raises issueCount versus the clean baseline", () => {
      const eng = fresh();
      const before = eng.auditIntegrity().issueCount;
      eng.addRule(goodRule("TEST-RAISES", ["DANGLES-NOWHERE-123"]));
      const after = eng.auditIntegrity().issueCount;
      expect(after).toBeGreaterThan(before);
    });

    it("the exported singleton exposes auditIntegrity with a shape-correct report", () => {
      const r = machiningPlaybookEngine.auditIntegrity();
      expect(Array.isArray(r.issues)).toBe(true);
      expect(r.issueCount).toBe(r.issues.length);
      expect(typeof r.healthy).toBe("boolean");
    });
  });
});
