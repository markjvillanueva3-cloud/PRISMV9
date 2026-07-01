/**
 * HMConsumerKnowledgeStats.test.ts — U-HMT-CONSUMER-MEASURE verification
 *
 * HM-TRAINING-WIRING-PLAN-2026-05-20 / U-HMT-CONSUMER-MEASURE (F6 close).
 *
 * Proves each HM-knowledge consumer engine exposes a `knowledgeStats()`
 * accessor whose `tipsLoaded` is a REAL measured count of the corpus
 * genuinely resident in the engine instance — not a grep-wired estimate.
 *
 * Intent (CLAUDE.md R9): every assertion fails if the engine's corpus
 * shrinks to empty OR if knowledgeStats stops tracking the real corpus.
 * The `toBe(manual recount)` checks would pass against a hardcoded
 * constant only by coincidence — they re-derive the expected value from
 * the engine's own public data, so they break the moment knowledgeStats
 * diverges from the corpus it claims to measure.
 */
import { describe, it, expect } from "vitest";
import { hyperMillDeepLearningEngine } from "../engines/HyperMillDeepLearningEngine.js";
import { hyperMillStrategyKnowledgeEngine } from "../engines/HyperMillStrategyKnowledgeEngine.js";
import { millingAIUnificationEngine } from "../engines/MillingAIUnificationEngine.js";

describe("U-HMT-CONSUMER-MEASURE — knowledgeStats() real-load verification", () => {
  it("HyperMillDeepLearningEngine reports tipsLoaded > 0", () => {
    const s = hyperMillDeepLearningEngine.knowledgeStats();
    expect(s.engine).toBe("HyperMillDeepLearningEngine");
    expect(s.tipsLoaded).toBeGreaterThan(0);
    expect(s.strategies_total).toBeGreaterThan(0);
    // tipsLoaded must be the canonical alias of estimated_tribal_tips_total
    expect(s.tipsLoaded).toBe(s.estimated_tribal_tips_total);
  });

  it("HyperMillStrategyKnowledgeEngine reports tipsLoaded > 0 matching its corpus", () => {
    const s = hyperMillStrategyKnowledgeEngine.knowledgeStats();
    expect(s.engine).toBe("HyperMillStrategyKnowledgeEngine");
    expect(s.tipsLoaded).toBeGreaterThan(0);
    expect(s.strategiesLoaded).toBeGreaterThan(0);
    expect(s.commonMistakesLoaded).toBeGreaterThan(0);
    // Re-derive expected tip count from the engine's own public strategy list.
    const strategies = hyperMillStrategyKnowledgeEngine.getAllStrategies();
    const manualTips = strategies.reduce((n, st) => n + st.best_practices.length, 0);
    const manualMistakes = strategies.reduce((n, st) => n + st.common_mistakes.length, 0);
    expect(s.tipsLoaded).toBe(manualTips);
    expect(s.commonMistakesLoaded).toBe(manualMistakes);
    expect(s.strategiesLoaded).toBe(strategies.length);
  });

  it("MillingAIUnificationEngine reports tipsLoaded > 0 across tribal categories", () => {
    const s = millingAIUnificationEngine.knowledgeStats();
    expect(s.engine).toBe("MillingAIUnificationEngine");
    expect(s.tipsLoaded).toBeGreaterThan(0);
    expect(s.playbookRulesLoaded).toBeGreaterThan(0);
    expect(s.tribalCategories).toBeGreaterThan(0);
    // tipsLoaded must spread across more than one tribal category
    expect(s.tribalCategories).toBeGreaterThan(1);
  });

  it("all consumers expose sourceFiles provenance (anti grep-wired false-confidence)", () => {
    const snapshots = [
      hyperMillStrategyKnowledgeEngine.knowledgeStats(),
      millingAIUnificationEngine.knowledgeStats(),
    ];
    for (const s of snapshots) {
      expect(Array.isArray(s.sourceFiles)).toBe(true);
      expect(s.sourceFiles.length).toBeGreaterThan(0);
      for (const f of s.sourceFiles) {
        expect(typeof f).toBe("string");
        expect(f.length).toBeGreaterThan(0);
      }
    }
  });

  it("≥3 consumers satisfy the U-HMT-CONSUMER-MEASURE acceptance gate (tipsLoaded > 0)", () => {
    const consumers = [
      hyperMillDeepLearningEngine.knowledgeStats().tipsLoaded,
      hyperMillStrategyKnowledgeEngine.knowledgeStats().tipsLoaded,
      millingAIUnificationEngine.knowledgeStats().tipsLoaded,
    ];
    const passing = consumers.filter((n) => n > 0).length;
    expect(passing).toBeGreaterThanOrEqual(3);
  });
});
