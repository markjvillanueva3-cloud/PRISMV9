/**
 * PlaybookRulesEngine Tests
 * U-AWR32: Tests for domain-tagged machining rules system
 */

import { describe, it, expect } from "vitest";
import {
  PlaybookRulesEngine,
  playbookRulesEngine,
  type MachineDomain,
  type DomainRule,
  type DomainStats,
  type RuleCoverage,
} from "../engines/PlaybookRulesEngine.js";

describe("PlaybookRulesEngine", () => {
  describe("Singleton Pattern", () => {
    it("should export playbookRulesEngine singleton", () => {
      expect(playbookRulesEngine).toBeDefined();
      expect(playbookRulesEngine).toBeInstanceOf(PlaybookRulesEngine);
    });

    it("should create instance via constructor", () => {
      const engine = new PlaybookRulesEngine();
      expect(engine).toBeInstanceOf(PlaybookRulesEngine);
    });
  });

  describe("Rule Count", () => {
    it("should have at least 300 rules total", () => {
      const allRules = playbookRulesEngine.getAllRules();
      expect(allRules.length).toBeGreaterThanOrEqual(300);
    });

    it("should have rules in all four domains", () => {
      const stats = playbookRulesEngine.getStats();
      expect(stats.byDomain.lathe).toBeGreaterThan(0);
      expect(stats.byDomain.mill).toBeGreaterThan(0);
      expect(stats.byDomain.wedm).toBeGreaterThan(0);
      expect(stats.byDomain.general).toBeGreaterThan(0);
    });
  });

  describe("Domain Statistics", () => {
    it("should return valid stats structure", () => {
      const stats = playbookRulesEngine.getStats();
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("byDomain");
      expect(stats).toHaveProperty("byCategory");
      expect(stats).toHaveProperty("bySeverity");
    });

    it("should have total equal to sum of domain counts", () => {
      const stats = playbookRulesEngine.getStats();
      const domainSum = stats.byDomain.lathe + stats.byDomain.mill +
                        stats.byDomain.wedm + stats.byDomain.general;
      expect(stats.total).toBe(domainSum);
    });

    it("should have total equal to sum of severity counts", () => {
      const stats = playbookRulesEngine.getStats();
      const severitySum = stats.bySeverity.critical + stats.bySeverity.important +
                          stats.bySeverity.recommended + stats.bySeverity.tip;
      expect(stats.total).toBe(severitySum);
    });
  });

  describe("Coverage Report", () => {
    it("should return coverage for all domains", () => {
      const coverage = playbookRulesEngine.getCoverage();
      expect(coverage).toHaveLength(4);
      const domains = coverage.map(c => c.domain);
      expect(domains).toContain("lathe");
      expect(domains).toContain("mill");
      expect(domains).toContain("wedm");
      expect(domains).toContain("general");
    });

    it("should have target counts per domain", () => {
      const coverage = playbookRulesEngine.getCoverage();
      const lathe = coverage.find(c => c.domain === "lathe");
      const mill = coverage.find(c => c.domain === "mill");
      const wedm = coverage.find(c => c.domain === "wedm");
      const general = coverage.find(c => c.domain === "general");

      expect(lathe?.target).toBe(100);
      expect(mill?.target).toBe(150);
      expect(wedm?.target).toBe(80);
      expect(general?.target).toBe(170);
    });

    it("should calculate percent coverage", () => {
      const coverage = playbookRulesEngine.getCoverage();
      for (const c of coverage) {
        expect(c.percent).toBe(Math.round((c.actual / c.target) * 100));
      }
    });

    it("should calculate gap correctly", () => {
      const coverage = playbookRulesEngine.getCoverage();
      for (const c of coverage) {
        expect(c.gap).toBe(c.target - c.actual);
      }
    });
  });

  describe("Domain Filtering", () => {
    it("should filter rules by lathe domain", () => {
      const rules = playbookRulesEngine.getRules({ domain: "lathe" });
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(r => expect(r.domain).toBe("lathe"));
    });

    it("should filter rules by mill domain", () => {
      const rules = playbookRulesEngine.getRules({ domain: "mill" });
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(r => expect(r.domain).toBe("mill"));
    });

    it("should filter rules by wedm domain", () => {
      const rules = playbookRulesEngine.getRules({ domain: "wedm" });
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(r => expect(r.domain).toBe("wedm"));
    });

    it("should filter rules by general domain", () => {
      const rules = playbookRulesEngine.getRules({ domain: "general" });
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(r => expect(r.domain).toBe("general"));
    });

    it("should return all rules when domain is 'all'", () => {
      const allRules = playbookRulesEngine.getRules({ domain: "all" });
      const total = playbookRulesEngine.getStats().total;
      expect(allRules.length).toBe(total);
    });
  });

  describe("Category Filtering", () => {
    it("should filter rules by category", () => {
      const rules = playbookRulesEngine.getRulesByCategory("sequencing");
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(r => expect(r.category).toBe("sequencing"));
    });

    it("should filter rules by multiple categories", () => {
      const rules = playbookRulesEngine.getRules({
        categories: ["sequencing", "anti_pattern"]
      });
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(r => {
        expect(["sequencing", "anti_pattern"]).toContain(r.category);
      });
    });
  });

  describe("Severity Filtering", () => {
    it("should filter rules by minimum severity - critical", () => {
      const rules = playbookRulesEngine.getRules({ severity_min: "critical" });
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(r => expect(r.severity).toBe("critical"));
    });

    it("should filter rules by minimum severity - important", () => {
      const rules = playbookRulesEngine.getRules({ severity_min: "important" });
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach(r => {
        expect(["critical", "important"]).toContain(r.severity);
      });
    });
  });

  describe("Rule Search", () => {
    it("should find rules by keyword", () => {
      const rules = playbookRulesEngine.searchRules("chip");
      expect(rules.length).toBeGreaterThan(0);
    });

    it("should find rules case-insensitively", () => {
      const upper = playbookRulesEngine.searchRules("COOLANT");
      const lower = playbookRulesEngine.searchRules("coolant");
      expect(upper.length).toBe(lower.length);
    });

    it("should return empty array for no matches", () => {
      const rules = playbookRulesEngine.searchRules("xyznonexistent123");
      expect(rules).toHaveLength(0);
    });
  });

  describe("Safety Rules", () => {
    it("should return safety-related rules", () => {
      const safetyRules = playbookRulesEngine.getSafetyRules();
      expect(safetyRules.length).toBeGreaterThan(0);
    });

    it("should include anti-patterns in safety rules", () => {
      const safetyRules = playbookRulesEngine.getSafetyRules();
      const hasAntiPattern = safetyRules.some(r => r.category === "anti_pattern");
      expect(hasAntiPattern).toBe(true);
    });

    it("should include critical rules in safety rules", () => {
      const safetyRules = playbookRulesEngine.getSafetyRules();
      const hasCritical = safetyRules.some(r => r.severity === "critical");
      expect(hasCritical).toBe(true);
    });
  });

  describe("Rule Access", () => {
    it("should get rule by ID", () => {
      const rule = playbookRulesEngine.getRule("LAT-001");
      expect(rule).toBeDefined();
      expect(rule?.id).toBe("LAT-001");
      expect(rule?.domain).toBe("lathe");
    });

    it("should return undefined for non-existent ID", () => {
      const rule = playbookRulesEngine.getRule("NONEXISTENT-999");
      expect(rule).toBeUndefined();
    });
  });

  describe("Add Rule", () => {
    it("should add new rule and increase count", () => {
      const engine = new PlaybookRulesEngine();
      const initialCount = engine.getStats().total;

      engine.addRule({
        id: "TEST-001",
        domain: "general",
        category: "safety",
        severity: "tip",
        title: "Test Rule",
        rule: "This is a test rule.",
        reasoning: "For testing purposes.",
        conditions: [{ type: "always" }],
        exceptions: [],
        source: "Test",
      });

      expect(engine.getStats().total).toBe(initialCount + 1);
    });

    it("should be able to retrieve added rule", () => {
      const engine = new PlaybookRulesEngine();
      engine.addRule({
        id: "TEST-002",
        domain: "mill",
        category: "milling",
        severity: "important",
        title: "Test Mill Rule",
        rule: "Mill test rule content.",
        reasoning: "For testing.",
        conditions: [{ type: "always" }],
        exceptions: [],
        source: "Test",
      });

      const rule = engine.getRule("TEST-002");
      expect(rule).toBeDefined();
      expect(rule?.domain).toBe("mill");
    });
  });

  describe("Rule Structure", () => {
    it("should have all required fields in rules", () => {
      const allRules = playbookRulesEngine.getAllRules();
      for (const rule of allRules.slice(0, 50)) {
        expect(rule).toHaveProperty("id");
        expect(rule).toHaveProperty("domain");
        expect(rule).toHaveProperty("category");
        expect(rule).toHaveProperty("severity");
        expect(rule).toHaveProperty("title");
        expect(rule).toHaveProperty("rule");
      }
    });

    it("should have valid domain values", () => {
      const validDomains: MachineDomain[] = ["lathe", "mill", "wedm", "general"];
      const allRules = playbookRulesEngine.getAllRules();
      for (const rule of allRules) {
        expect(validDomains).toContain(rule.domain);
      }
    });

    it("should have valid severity values", () => {
      const validSeverities = ["critical", "important", "recommended", "tip"];
      const allRules = playbookRulesEngine.getAllRules();
      for (const rule of allRules) {
        expect(validSeverities).toContain(rule.severity);
      }
    });
  });

  describe("Domain-Specific Rules", () => {
    it("should have lathe-specific rules with LAT prefix", () => {
      const latheRules = playbookRulesEngine.getRules({ domain: "lathe" });
      const latPrefixed = latheRules.filter(r => r.id.startsWith("LAT-"));
      expect(latPrefixed.length).toBeGreaterThan(0);
    });

    it("should have mill-specific rules with MIL prefix", () => {
      const millRules = playbookRulesEngine.getRules({ domain: "mill" });
      const milPrefixed = millRules.filter(r => r.id.startsWith("MIL-"));
      expect(milPrefixed.length).toBeGreaterThan(0);
    });

    it("should have WEDM-specific rules with EDM prefix", () => {
      const wedmRules = playbookRulesEngine.getRules({ domain: "wedm" });
      const edmPrefixed = wedmRules.filter(r => r.id.startsWith("EDM-"));
      expect(edmPrefixed.length).toBeGreaterThan(0);
    });

    it("should have general rules with GEN prefix", () => {
      const generalRules = playbookRulesEngine.getRules({ domain: "general" });
      const genPrefixed = generalRules.filter(r => r.id.startsWith("GEN-"));
      expect(genPrefixed.length).toBeGreaterThan(0);
    });
  });
});
