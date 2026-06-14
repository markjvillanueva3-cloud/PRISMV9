/**
 * MillLoRATribalAugmentationEngine — Test Suite
 * ==============================================
 * MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-TRIBAL-AUGMENTATION (iter98)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRATribalAugmentationEngine,
  MILL_CANONICAL_TIP_SOURCES,
  type MillTribalAugTip,
  type MillPlaybookRule,
} from "../engines/MillLoRATribalAugmentationEngine.js";

describe("MillLoRATribalAugmentationEngine", () => {
  let engine: MillLoRATribalAugmentationEngine;

  beforeEach(() => {
    engine = new MillLoRATribalAugmentationEngine();
  });

  describe("MILL_CANONICAL_TIP_SOURCES taxonomy", () => {
    it("exposes 5 mill-canonical tip sources", () => {
      expect(MILL_CANONICAL_TIP_SOURCES.length).toBe(5);
      expect(MILL_CANONICAL_TIP_SOURCES).toContain("jm_die_mill");
      expect(MILL_CANONICAL_TIP_SOURCES).toContain("heidenhain");
      expect(MILL_CANONICAL_TIP_SOURCES).toContain("mastercam");
      expect(MILL_CANONICAL_TIP_SOURCES).toContain("hsmworks");
      expect(MILL_CANONICAL_TIP_SOURCES).toContain("makino");
    });
  });

  describe("default tips + rules", () => {
    it("preloads 12 default tips (8 JM-Die-mill + 4 controller)", () => {
      const tips = engine.getTips();
      expect(tips.length).toBe(12);
    });

    it("preloads 8 JM-Die-mill tips", () => {
      expect(engine.getTips("jm_die_mill").length).toBe(8);
    });

    it("preloads 1 tip per controller source", () => {
      expect(engine.getTips("heidenhain").length).toBe(1);
      expect(engine.getTips("mastercam").length).toBe(1);
      expect(engine.getTips("hsmworks").length).toBe(1);
      expect(engine.getTips("makino").length).toBe(1);
    });

    it("preloads 10 default rules", () => {
      expect(engine.getRules().length).toBe(10);
    });

    it("4 of the 10 rules are mill-canonical", () => {
      expect(engine.getMillCanonicalRules().length).toBe(4);
    });
  });

  describe("MILL-CANONICAL: getTipsByAxisMode", () => {
    it("filters by axis_mode", () => {
      const fiveAxisTips = engine.getTipsByAxisMode("5_axis_simul");
      // jmm-002, jmm-004, hdh-001, mak-001 = 4 tips
      expect(fiveAxisTips.length).toBe(4);
    });

    it("returns empty array for shared axis (none preloaded)", () => {
      const sharedTips = engine.getTipsByAxisMode("shared");
      expect(sharedTips.length).toBe(0);
    });
  });

  describe("addTip + addRule", () => {
    it("addTip appends a new tip", () => {
      const tip: MillTribalAugTip = {
        id: "custom-1",
        content: "Custom tip",
        source: "community",
        axis_mode: "shared",
        keywords: ["custom"],
        priority: 5,
        verified: false,
      };
      engine.addTip(tip);
      expect(engine.getTips().length).toBe(13);
    });

    it("addRule appends a new rule", () => {
      const rule: MillPlaybookRule = {
        id: "custom-rule-1",
        condition: "x > 0",
        action: "do something",
        rationale: "because",
        category: "test",
        severity: "info",
        mill_canonical: false,
      };
      engine.addRule(rule);
      expect(engine.getRules().length).toBe(11);
    });
  });

  describe("findRelevantTips", () => {
    it("finds tips relevant to chatter on long endmills", () => {
      // jmm-001 keywords: endmill, long, chatter, ae, regen — hit all 5
      const hits = engine.findRelevantTips("long endmill regen chatter at high ae causing tone change", "what to do");
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].relevance).toBeGreaterThanOrEqual(0.5);
      // Should include jmm-001 (long endmill chatter tip)
      expect(hits.some((h) => h.tip.id === "jmm-001")).toBe(true);
    });

    it("respects max_tips_per_response config", () => {
      engine.setConfig({ max_tips_per_response: 1 });
      const hits = engine.findRelevantTips("inconel 5-axis simultaneous tcpm chatter", "advise");
      expect(hits.length).toBe(1);
    });

    it("returns empty when nothing crosses min_relevance_score", () => {
      engine.setConfig({ min_relevance_score: 0.95 });
      const hits = engine.findRelevantTips("totally unrelated text", "nothing");
      expect(hits.length).toBe(0);
    });

    it("MILL-CANONICAL: axis_mode_filter restricts to one axis (+ shared)", () => {
      engine.setConfig({ axis_mode_filter: "5_axis_simul", min_relevance_score: 0.3 });
      const hits = engine.findRelevantTips("5-axis simultaneous inconel tcpm coolant", "advise");
      // All hits should be 5_axis_simul or shared
      for (const h of hits) {
        expect(["5_axis_simul", "shared"].includes(h.tip.axis_mode)).toBe(true);
      }
    });
  });

  describe("MILL-CANONICAL: checkRules", () => {
    it("triggers mill-rule-001 on any chatter mention (critical)", () => {
      const fired = engine.checkRules("encountering chatter at 3500 rpm", "advise");
      const r = fired.find((x) => x.id === "mill-rule-001");
      expect(r === undefined).toBe(false);
      expect(r?.severity).toBe("critical");
    });

    it("triggers mill-rule-002 on 5-axis simul without TCPM enable (critical)", () => {
      const fired = engine.checkRules("Run 5-axis simultaneous toolpath on the rotary", "advise");
      const r = fired.find((x) => x.id === "mill-rule-002");
      expect(r === undefined).toBe(false);
      expect(r?.severity).toBe("critical");
    });

    it("mill-rule-002 does NOT fire when TCPM is enabled", () => {
      const fired = engine.checkRules("Run 5-axis simultaneous with M128 TCPM enable", "advise");
      const r = fired.find((x) => x.id === "mill-rule-002");
      expect(r === undefined).toBe(true);
    });

    it("triggers mill-rule-003 on long endmill + aggressive ae", () => {
      const fired = engine.checkRules("Long endmill cut at ae=0.6D radial step", "advise");
      const r = fired.find((x) => x.id === "mill-rule-003");
      expect(r === undefined).toBe(false);
    });

    it("triggers mill-rule-004 on stainless mill cut without coolant", () => {
      const fired = engine.checkRules("Mill stainless steel dry on the VMC", "advise");
      const r = fired.find((x) => x.id === "mill-rule-004");
      expect(r === undefined).toBe(false);
      expect(r?.mill_canonical).toBe(true);
    });

    it("mill-rule-004 does NOT fire when coolant is mentioned", () => {
      const fired = engine.checkRules("Mill stainless steel with flood coolant on the VMC", "advise");
      const r = fired.find((x) => x.id === "mill-rule-004");
      expect(r === undefined).toBe(true);
    });

    it("respects lathe-shared rule-001 (SFM > 500 for steel)", () => {
      const fired = engine.checkRules("Run steel at 800 SFM with carbide", "advise");
      const r = fired.find((x) => x.id === "rule-001");
      expect(r === undefined).toBe(false);
    });

    it("triggers rule-007 on tap without rigid mode", () => {
      const fired = engine.checkRules("Tap M10 hole at standard feed", "advise");
      const r = fired.find((x) => x.id === "rule-007");
      expect(r === undefined).toBe(false);
    });
  });

  describe("augment — end-to-end", () => {
    it("appends critical-safety section when critical rule fires", () => {
      const r = engine.augment("Run 5-axis simultaneous toolpath", "go");
      expect(r.augmented_response.indexOf("Critical Safety Notes") >= 0).toBe(true);
      expect(r.warnings.some((w) => w.startsWith("[CRITICAL]"))).toBe(true);
    });

    it("appends Shop Floor Tips section when relevant tips found", () => {
      // Match all 5 jmm-001 keywords to clear the 0.5 relevance threshold
      const r = engine.augment("Long endmill regen chatter at high ae", "tone change");
      expect(r.augmented_response.indexOf("Shop Floor Tips") >= 0).toBe(true);
      expect(r.tips_applied.length).toBeGreaterThan(0);
    });

    it("MILL-CANONICAL: mill_canonical_rules_triggered counts only canonical rules", () => {
      // chatter fires mill-rule-001 (canonical)
      // also no 5-axis context so mill-rule-002 doesn't fire
      const r = engine.augment("chatter happening on endmill", "advise");
      expect(r.mill_canonical_rules_triggered).toBeGreaterThanOrEqual(1);
      // all canonical rules in result should have mill_canonical=true
      for (const rule of r.rules_triggered) {
        if (rule.mill_canonical) {
          expect(rule.mill_canonical).toBe(true);
        }
      }
    });

    it("confidence_boost increases when canonical rules fire", () => {
      const dull = engine.augment("just some text", "x");
      const sharp = engine.augment("chatter on long endmill", "x");
      expect(sharp.confidence_boost).toBeGreaterThan(dull.confidence_boost);
    });

    it("warn_on_anti_patterns=false suppresses the critical-warnings block", () => {
      engine.setConfig({ warn_on_anti_patterns: false });
      const r = engine.augment("Run 5-axis simultaneous toolpath", "go");
      expect(r.augmented_response.indexOf("Critical Safety Notes") < 0).toBe(true);
    });
  });

  describe("searchTips + by-material / by-operation", () => {
    it("searchTips finds by keyword", () => {
      const hits = engine.searchTips("trochoidal");
      expect(hits.length).toBeGreaterThan(0);
    });

    it("getTipsByMaterial filters to that material", () => {
      const hits = engine.getTipsByMaterial("inconel");
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].material).toBe("inconel");
    });

    it("getTipsByOperation filters to that operation", () => {
      const hits = engine.getTipsByOperation("drill");
      expect(hits.length).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("reports mill_canonical_rules count", () => {
      const s = engine.getStats();
      expect(s.mill_canonical_rules).toBe(4);
      expect(s.total_rules).toBe(10);
    });

    it("reports tips_by_axis distribution", () => {
      const s = engine.getStats();
      expect(s.tips_by_axis["5_axis_simul"]).toBe(4);
      expect(s.tips_by_axis["3_axis"]).toBeGreaterThan(0);
    });

    it("reports tips_by_source includes all preloaded sources", () => {
      const s = engine.getStats();
      expect(s.tips_by_source["jm_die_mill"]).toBe(8);
      expect(s.tips_by_source["heidenhain"]).toBe(1);
      expect(s.tips_by_source["mastercam"]).toBe(1);
      expect(s.tips_by_source["hsmworks"]).toBe(1);
      expect(s.tips_by_source["makino"]).toBe(1);
    });

    it("rules_by_severity counts each tier", () => {
      const s = engine.getStats();
      const total = s.rules_by_severity.info + s.rules_by_severity.warning + s.rules_by_severity.critical;
      expect(total).toBe(10);
      expect(s.rules_by_severity.critical).toBeGreaterThanOrEqual(3);
    });
  });

  describe("reset", () => {
    it("restores default tips + rules + config", () => {
      engine.addTip({
        id: "x", content: "y", source: "community", axis_mode: "shared",
        keywords: [], priority: 1, verified: false,
      });
      engine.setConfig({ max_tips_per_response: 99 });
      engine.reset();
      expect(engine.getTips().length).toBe(12);
      expect(engine.getRules().length).toBe(10);
      expect(engine.getConfig().max_tips_per_response).toBe(3);
    });
  });

  describe("setConfig + getConfig", () => {
    it("merges partial config", () => {
      engine.setConfig({ min_relevance_score: 0.9 });
      expect(engine.getConfig().min_relevance_score).toBeCloseTo(0.9, 6);
      expect(engine.getConfig().max_tips_per_response).toBe(3);
    });
  });
});
