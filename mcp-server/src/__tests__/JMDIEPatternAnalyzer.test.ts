/**
 * Tests for JMDIEPatternAnalyzer — U-AWR09 Pattern Analysis Engine
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  JMDIEPatternAnalyzer,
  TribalTip,
  PatternRule,
  PatternAnalysisResult,
} from "../engines/JMDIEPatternAnalyzer.js";

describe("JMDIEPatternAnalyzer", () => {
  describe("analyze", () => {
    let result: PatternAnalysisResult;

    beforeEach(() => {
      result = JMDIEPatternAnalyzer.analyze();
    });

    it("returns pattern analysis result", () => {
      expect(result).toBeDefined();
      expect(result.totalProgramsAnalyzed).toBeGreaterThan(0);
    });

    it("reports JM Die program counts", () => {
      expect(result.lathePrograms).toBe(5297);
      expect(result.millPrograms).toBe(3713);
      expect(result.totalProgramsAnalyzed).toBe(36929);
    });

    it("extracts patterns from lathe and mill", () => {
      expect(result.patternsExtracted).toBeGreaterThan(0);
      expect(result.patternsExtracted).toBeGreaterThanOrEqual(10);
    });

    it("generates rules from patterns", () => {
      expect(result.rulesGenerated).toBeGreaterThan(0);
      expect(result.rules.length).toBe(result.rulesGenerated);
    });

    it("generates tips from patterns", () => {
      expect(result.tipsGenerated).toBeGreaterThan(0);
      expect(result.tips.length).toBe(result.tipsGenerated);
    });

    it("includes top patterns", () => {
      expect(result.topPatterns.length).toBeGreaterThan(0);
      expect(result.topPatterns[0].frequency).toBeGreaterThan(0);
    });
  });

  describe("rules generation", () => {
    let rules: PatternRule[];

    beforeEach(() => {
      rules = JMDIEPatternAnalyzer.getRulesForPlaybook();
    });

    it("returns array of rules", () => {
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it("rules have required fields", () => {
      for (const rule of rules) {
        expect(rule.id).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.domain).toBeDefined();
        expect(rule.condition).toBeDefined();
        expect(rule.action).toBeDefined();
        expect(rule.rationale).toBeDefined();
        expect(rule.source).toBe("jm_die");
        expect(rule.confidence).toBeGreaterThan(0);
        expect(rule.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("rules have valid categories", () => {
      const validCategories = ["speed_feed", "tool_selection", "sequence", "safety", "quality", "setup"];
      for (const rule of rules) {
        expect(validCategories).toContain(rule.category);
      }
    });

    it("rules have valid domains", () => {
      const validDomains = ["lathe", "mill", "wedm", "general"];
      for (const rule of rules) {
        expect(validDomains).toContain(rule.domain);
      }
    });

    it("rules have valid safety impact", () => {
      const validImpacts = ["none", "low", "medium", "high", "critical"];
      for (const rule of rules) {
        expect(validImpacts).toContain(rule.safetyImpact);
      }
    });

    it("includes lathe rules", () => {
      const latheRules = rules.filter(r => r.domain === "lathe");
      expect(latheRules.length).toBeGreaterThan(0);
    });

    it("includes mill rules", () => {
      const millRules = rules.filter(r => r.domain === "mill");
      expect(millRules.length).toBeGreaterThan(0);
    });

    it("includes safety rules", () => {
      const safetyRules = rules.filter(r => r.category === "safety");
      expect(safetyRules.length).toBeGreaterThan(0);
    });

    it("includes G50 spindle clamp safety rule", () => {
      const g50Rule = rules.find(r => r.condition.includes("G96") && r.category === "safety");
      expect(g50Rule).toBeDefined();
      expect(g50Rule?.safetyImpact).toBe("critical");
    });

    it("includes speed_feed rules", () => {
      const sfRules = rules.filter(r => r.category === "speed_feed");
      expect(sfRules.length).toBeGreaterThanOrEqual(3);
    });

    it("rules have unique IDs", () => {
      const ids = rules.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("rule IDs follow PBR-DOMAIN-CATEGORY-NNN format", () => {
      for (const rule of rules) {
        expect(rule.id).toMatch(/^PBR-[A-Z]+-[A-Z_]+-\d{3}$/);
      }
    });
  });

  describe("tips generation", () => {
    let tips: TribalTip[];

    beforeEach(() => {
      tips = JMDIEPatternAnalyzer.getTipsForTribalKnowledge();
    });

    it("returns array of tips", () => {
      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
    });

    it("tips have required fields", () => {
      for (const tip of tips) {
        expect(tip.id).toBeDefined();
        expect(tip.category).toBeDefined();
        expect(tip.source).toBe("jm_die_pattern");
        expect(tip.title).toBeDefined();
        expect(tip.content).toBeDefined();
        expect(tip.confidence).toBeGreaterThan(0);
        expect(tip.patternFrequency).toBeGreaterThan(0);
        expect(tip.extractedFrom).toBeDefined();
      }
    });

    it("tips have valid categories", () => {
      const validCategories = ["lathe", "mill", "wedm", "general"];
      for (const tip of tips) {
        expect(validCategories).toContain(tip.category);
      }
    });

    it("includes lathe tips", () => {
      const latheTips = tips.filter(t => t.category === "lathe");
      expect(latheTips.length).toBeGreaterThan(0);
    });

    it("includes mill tips", () => {
      const millTips = tips.filter(t => t.category === "mill");
      expect(millTips.length).toBeGreaterThan(0);
    });

    it("tips have unique IDs", () => {
      const ids = tips.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("tip IDs follow JMD-TIP-CATEGORY-NNN format", () => {
      for (const tip of tips) {
        expect(tip.id).toMatch(/^JMD-TIP-[A-Z]+-\d{3}$/);
      }
    });

    it("includes G85/G87 cycle tip", () => {
      const cycleTip = tips.find(t => t.title.includes("G85") || t.content.includes("G85"));
      expect(cycleTip).toBeDefined();
    });

    it("includes CSS mode tip", () => {
      const cssTip = tips.find(t => t.title.includes("CSS") || t.content.includes("CSS"));
      expect(cssTip).toBeDefined();
    });
  });

  describe("coverage report", () => {
    it("returns coverage statistics", () => {
      const report = JMDIEPatternAnalyzer.getCoverageReport();

      expect(report.lathePatterns).toBeGreaterThan(0);
      expect(report.millPatterns).toBeGreaterThan(0);
      expect(report.totalRules).toBeGreaterThan(0);
      expect(report.totalTips).toBeGreaterThan(0);
    });

    it("reports rules by domain", () => {
      const report = JMDIEPatternAnalyzer.getCoverageReport();

      expect(report.rulesByDomain).toBeDefined();
      expect(report.rulesByDomain.lathe).toBeGreaterThan(0);
      expect(report.rulesByDomain.mill).toBeGreaterThan(0);
    });

    it("reports rules by category", () => {
      const report = JMDIEPatternAnalyzer.getCoverageReport();

      expect(report.rulesByCategory).toBeDefined();
      expect(Object.keys(report.rulesByCategory).length).toBeGreaterThan(0);
    });
  });

  describe("deterministic output", () => {
    it("produces same results on multiple calls", () => {
      const result1 = JMDIEPatternAnalyzer.analyze();
      const result2 = JMDIEPatternAnalyzer.analyze();

      expect(result1.rulesGenerated).toBe(result2.rulesGenerated);
      expect(result1.tipsGenerated).toBe(result2.tipsGenerated);
      expect(result1.patternsExtracted).toBe(result2.patternsExtracted);
    });

    it("rule IDs are deterministic", () => {
      const rules1 = JMDIEPatternAnalyzer.getRulesForPlaybook();
      const rules2 = JMDIEPatternAnalyzer.getRulesForPlaybook();

      for (let i = 0; i < rules1.length; i++) {
        expect(rules1[i].id).toBe(rules2[i].id);
      }
    });
  });

  describe("pattern knowledge validation", () => {
    it("G85-G87 pattern has 97% frequency", () => {
      const result = JMDIEPatternAnalyzer.analyze();
      const g85Pattern = result.topPatterns.find(p => p.description.includes("G85"));
      expect(g85Pattern?.frequency).toBe(97);
    });

    it("CSS mode pattern has 89% frequency", () => {
      const result = JMDIEPatternAnalyzer.analyze();
      const cssPattern = result.topPatterns.find(p => p.description.includes("G96"));
      expect(cssPattern?.frequency).toBe(89);
    });

    it("G50 clamp pattern has 78% frequency", () => {
      const result = JMDIEPatternAnalyzer.analyze();
      const g50Pattern = result.topPatterns.find(p => p.description.includes("G50"));
      expect(g50Pattern?.frequency).toBe(78);
    });
  });

  describe("PlaybookRulesEngine compatibility", () => {
    it("rules have all fields required by PlaybookRule interface", () => {
      const rules = JMDIEPatternAnalyzer.getRulesForPlaybook();

      for (const rule of rules) {
        // Required PlaybookRule fields
        expect(typeof rule.id).toBe("string");
        expect(typeof rule.category).toBe("string");
        expect(typeof rule.domain).toBe("string");
        expect(typeof rule.condition).toBe("string");
        expect(typeof rule.action).toBe("string");
        expect(typeof rule.rationale).toBe("string");
        expect(typeof rule.source).toBe("string");
        expect(typeof rule.sourceRef).toBe("string");
        expect(typeof rule.confidence).toBe("number");
        expect(typeof rule.safetyImpact).toBe("string");
        // failureMode can be null or string
        expect(rule.failureMode === null || typeof rule.failureMode === "string").toBe(true);
      }
    });
  });
});
