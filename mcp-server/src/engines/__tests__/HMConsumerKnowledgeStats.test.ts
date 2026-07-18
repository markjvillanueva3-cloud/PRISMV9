/**
 * U-HMT-CONSUMER-MEASURE: per-engine knowledgeStats() smoke tests.
 *
 * Validates the two engines that ACTUALLY consume tribal/training data
 * (HyperMillDeepLearningEngine, CAMTrainingExtractionAggregatorEngine) expose
 * a knowledgeStats() method with the canonical R12-honest schema. The other 6
 * audit-listed engines have zero tribal references in their code — they are
 * tracked as a follow-up gap, not stubbed here. See:
 * state/shared/specs/HM-TRAINING-WIRING-PLAN-2026-05-20.md §F6.
 */
import { describe, expect, it } from "vitest";
import { hyperMillDeepLearningEngine } from "../HyperMillDeepLearningEngine.js";
import { CAMTrainingExtractionAggregatorEngine } from "../CAMTrainingExtractionAggregatorEngine.js";
import * as path from "node:path";

const KNOWLEDGE_STORE = path.resolve(
  process.cwd(),
  "..",
  "cad-engine",
  "knowledge_store",
);

describe("U-HMT-CONSUMER-MEASURE: HyperMillDeepLearningEngine.knowledgeStats", () => {
  it("returns the canonical schema with non-negative counts", () => {
    const s = hyperMillDeepLearningEngine.knowledgeStats();
    expect(s.engine).toBe("HyperMillDeepLearningEngine");
    expect(s.strategies_total).toBeGreaterThanOrEqual(0);
    expect(typeof s.strategies_by_category).toBe("object");
    expect(s.feature_patterns).toBeGreaterThanOrEqual(0);
    expect(s.automation_capabilities).toBeGreaterThanOrEqual(0);
    expect(s.sql_tables).toBeGreaterThanOrEqual(0);
    expect(s.virtual_machining_features).toBeGreaterThanOrEqual(0);
    expect(s.pdf_sources).toBeGreaterThanOrEqual(0);
    expect(s.estimated_tribal_tips_total).toBeGreaterThanOrEqual(0);
    expect(typeof s.knowledge_base_built).toBe("boolean");
    expect(s.version).toBe("33.0");
  });

  it("category counts sum to strategies_total (invariant)", () => {
    const s = hyperMillDeepLearningEngine.knowledgeStats();
    const sum = Object.values(s.strategies_by_category).reduce(
      (acc, v) => acc + v,
      0,
    );
    expect(sum).toBe(s.strategies_total);
  });
});

describe("U-HMT-CONSUMER-MEASURE: CAMTrainingExtractionAggregatorEngine.knowledgeStats", () => {
  it("returns empty stats when the directory does not exist", () => {
    const s = CAMTrainingExtractionAggregatorEngine.knowledgeStats(
      "/nonexistent/path/should/not/exist/asdf",
    );
    expect(s.engine).toBe("CAMTrainingExtractionAggregatorEngine");
    expect(s.doc_count).toBe(0);
    expect(s.hm_doc_count).toBe(0);
    expect(s.total_tips).toBe(0);
    expect(s.zero_tip_docs).toEqual([]);
    expect(s.per_doc).toEqual([]);
  });

  it("scans the live knowledge_store and reports HM-domain counts (smoke)", () => {
    const s = CAMTrainingExtractionAggregatorEngine.knowledgeStats(KNOWLEDGE_STORE);
    expect(s.engine).toBe("CAMTrainingExtractionAggregatorEngine");
    // Liberal invariants — exact counts drift as extractions ship; just verify
    // structural sanity. The dedicated extraction-coverage script (H:/prism/scripts/
    // hm-extraction-coverage.mjs) owns precise numeric assertions.
    expect(s.doc_count).toBeGreaterThanOrEqual(0);
    expect(s.hm_doc_count).toBeLessThanOrEqual(s.doc_count);
    expect(s.total_tips_unique).toBeLessThanOrEqual(s.total_tips);
    expect(Array.isArray(s.zero_tip_docs)).toBe(true);
    expect(Array.isArray(s.per_doc)).toBe(true);
    expect(s.per_doc.length).toBe(s.doc_count);
    // hm_tip_total invariant: sum of HM doc tips
    const hmSum = s.per_doc.filter(d => d.hm).reduce((acc, d) => acc + d.tips, 0);
    expect(hmSum).toBe(s.hm_tip_total);
  });
});
