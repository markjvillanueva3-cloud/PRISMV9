/**
 * Tests for U-QT06/U-QT07 — JM-DIE-QUOTE-TRAINING-MS0.
 *   - OutsideKnowledgeSourceCatalogEngine (curated reputable-source catalog)
 *   - QuotingDeepReasoningBridgeEngine    (routes accuracy questions to NN/GNN/reasoning)
 */
import { describe, it, expect } from "vitest";
import { OutsideKnowledgeSourceCatalogEngine } from "../engines/OutsideKnowledgeSourceCatalogEngine.js";
import { QuotingDeepReasoningBridgeEngine } from "../engines/QuotingDeepReasoningBridgeEngine.js";
import type { AccuracyReport } from "../engines/QuotingTrainingLoopEngine.js";

const catalog = new OutsideKnowledgeSourceCatalogEngine();
const bridge = new QuotingDeepReasoningBridgeEngine();

describe("OutsideKnowledgeSourceCatalogEngine — catalog presence + reliability tiers", () => {
  it("catalog has ≥20 curated sources", () => {
    expect(catalog.getCatalogSize()).toBeGreaterThanOrEqual(20);
  });
  it("includes ISO 2768 (general tolerances) with reliability_weight = 1.0", () => {
    const iso = catalog.list().find((s) => s.id === "iso-2768-1989");
    expect(iso?.publisher).toBe("ISO");
    expect(iso?.reliability_weight).toBe(1.0);
  });
  it("includes Machinery's Handbook 31e with reliability >= 0.95", () => {
    const mh = catalog.list().find((s) => s.id === "machinerys-handbook-31");
    expect(mh?.publisher).toBe("Industrial Press");
    expect(mh?.reliability_weight).toBeGreaterThanOrEqual(0.95);
  });
  it("includes NIST AMS 100-7 predictive models with weight=1.0", () => {
    const nist = catalog.list().find((s) => s.id === "nist-ams-100-7");
    expect(nist?.publisher).toBe("NIST");
    expect(nist?.reliability_weight).toBe(1.0);
  });
  it("includes MFG.com cost benchmark in cost-benchmark category", () => {
    const mfg = catalog.list().find((s) => s.id === "mfg-com-benchmark-2024");
    expect(mfg?.categories).toContain("cost-benchmark");
  });
});

describe("OutsideKnowledgeSourceCatalogEngine.query", () => {
  it("token 'turning' returns Sandvik Coromant + Machinery's Handbook + Kennametal in results", () => {
    const r = catalog.query({ tokens: ["turning"], limit: 10 });
    const ids = r.results.map((s) => s.id);
    expect(ids).toContain("sandvik-coromant-2024");
    expect(ids).toContain("kennametal-master-2024");
  });
  it("category 'edm-reference' returns ≥2 EDM sources sorted by reliability DESC", () => {
    const r = catalog.query({ categories: ["edm-reference"], limit: 10 });
    expect(r.matched).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < r.results.length; i++) {
      expect(r.results[i - 1]._score).toBeGreaterThanOrEqual(r.results[i]._score);
    }
  });
  it("minReliability=1.0 returns ONLY ISO/NIST/ASME-tier sources", () => {
    const r = catalog.query({ tokens: ["tolerance"], minReliability: 1.0, limit: 10 });
    for (const s of r.results) expect(s.reliability_weight).toBe(1.0);
  });
  it("limit=3 truncates to 3 even when matched > 3", () => {
    const r = catalog.query({ tokens: ["machining"], limit: 3 });
    expect(r.returned).toBeLessThanOrEqual(3);
    expect(r.results.length).toBeLessThanOrEqual(3);
  });
  it("empty tokens + no categories → R12 reason 'must-provide-tokens-or-categories'", () => {
    const r = catalog.query({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("must-provide-tokens-or-categories");
  });
  it("byCategory('cost-benchmark') returns ≥3 cost sources sorted by reliability", () => {
    const list = catalog.byCategory("cost-benchmark");
    expect(list.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].reliability_weight).toBeGreaterThanOrEqual(list[i].reliability_weight);
    }
  });
});

describe("OutsideKnowledgeSourceCatalogEngine.citationsFor", () => {
  it("returns formatted [1] [2] [3] citation block including publisher + title + year", () => {
    const cites = catalog.citationsFor({ tokens: ["turning"], limit: 2 });
    expect(cites).toMatch(/^\[1\]/);
    expect(cites).toContain("Sandvik Coromant");
    expect(cites).toContain("2024");
  });
  it("empty query → '(no matching sources in curated catalog)' literal", () => {
    const cites = catalog.citationsFor({ tokens: ["nonexistent-topic-12345"], categories: ["machining-handbook"], minReliability: 1.5 });
    expect(cites).toBe("(no matching sources in curated catalog)");
  });
});

function mockReport(overrides: Partial<AccuracyReport> = {}): AccuracyReport {
  return {
    ok: true,
    total_records: 10, total_predicted: 10, total_skipped: 0,
    metrics: { mae_usd: 12.34, rmse_usd: 15.67, mape_pct: 18.5, mean_signed_pct_error: 8.2 },
    per_customer_bias: [
      { customer: "ACCURATE", record_count: 5, mean_pct_error: 12.5, mean_abs_pct_error: 12.5, systematic_direction: "over-predicting" },
      { customer: "ITW", record_count: 3, mean_pct_error: -8.3, mean_abs_pct_error: 8.3, systematic_direction: "under-predicting" },
    ],
    worst_5_records: [
      { customer: "ACCURATE", part_id: "778", actual_usd: 100, predicted_fmv_usd: 145, abs_error_usd: 45, pct_error: 45 },
      { customer: "ITW", part_id: "9095", actual_usd: 200, predicted_fmv_usd: 160, abs_error_usd: 40, pct_error: -20 },
    ],
    best_5_records: [
      { customer: "OPTIMAS", part_id: "X-1", actual_usd: 50, predicted_fmv_usd: 51, abs_error_usd: 1, pct_error: 2 },
    ],
    psi_delta_fed_count: 10,
    ...overrides,
  };
}

describe("QuotingDeepReasoningBridgeEngine — routing matrix", () => {
  it("routes 'explain-bias' to prism-creative-reasoning", () => {
    const m = bridge.getRoutingMap();
    expect(m["explain-bias"]).toBe("prism-creative-reasoning");
  });
  it("routes 'find-pattern' to psn-nn-gnn (graph correlation)", () => {
    const m = bridge.getRoutingMap();
    expect(m["find-pattern"]).toBe("psn-nn-gnn");
  });
  it("routes 'suggest-rate-adjust' to claude-deep-reasoning", () => {
    const m = bridge.getRoutingMap();
    expect(m["suggest-rate-adjust"]).toBe("claude-deep-reasoning");
  });
  it("routes 'outlier-investigate' to tribal-rag", () => {
    const m = bridge.getRoutingMap();
    expect(m["outlier-investigate"]).toBe("tribal-rag");
  });
  it("routes 'cross-customer-rec' to prism-creative-reasoning", () => {
    const m = bridge.getRoutingMap();
    expect(m["cross-customer-rec"]).toBe("prism-creative-reasoning");
  });
  it("routes every declared question class -- none left to resolve to an undefined substrate", () => {
    const m = bridge.getRoutingMap();
    // Completeness invariant on the AI-substrate routing node: a dropped key would
    // make that question class pick `undefined` downstream (silent mis-route, e.g.
    // a Claude-only task quietly losing its substrate). Pin the exact declared set
    // so adding/removing a class is a deliberate, test-updating decision.
    expect(Object.keys(m).sort()).toEqual(
      ["cross-customer-rec", "explain-bias", "find-pattern", "outlier-investigate", "suggest-rate-adjust"].sort(),
    );
    // every routed substrate is a real, known substrate (no typo'd dead target)
    const known = ["prism-creative-reasoning", "claude-deep-reasoning", "ollama-fast-classify", "psn-nn-gnn", "tribal-rag"];
    for (const sub of Object.values(m)) expect(known).toContain(sub);
  });
});

describe("QuotingDeepReasoningBridgeEngine.buildExplainBias", () => {
  it("packages ACCURATE bias facts into prompt envelope routed to PRISMCreativeReasoning", () => {
    const p = bridge.buildExplainBias(mockReport(), "ACCURATE");
    expect(p.ai_substrate).toBe("prism-creative-reasoning");
    expect(p.context_facts).toContain("customer=ACCURATE");
    expect(p.context_facts).toContain("record_count=5");
    expect(p.context_facts).toContain("systematic_direction=over-predicting");
    expect(p.prompt_text).toContain("ACCURATE");
    expect(p.prompt_text).toContain("over-predicting");
  });
  it("when customer has no records, surfaces 'no-records-for-customer' note in facts", () => {
    const p = bridge.buildExplainBias(mockReport(), "UNKNOWN_CUSTOMER");
    expect(p.context_facts.join(" ")).toContain("no-records-for-customer");
  });
  it("citations include reputable publishers (Industrial Press / Sandvik / MFG.com / AMT / NIST / ASM)", () => {
    const p = bridge.buildExplainBias(mockReport(), "ACCURATE");
    expect(p.citations.length).toBeGreaterThan(20);
    expect(p.citations).toMatch(/Industrial Press|Sandvik|MFG\.com|AMT|NIST|ASM/);
  });
});

describe("QuotingDeepReasoningBridgeEngine.buildFindPattern", () => {
  it("includes top-3 worst-record facts and routes to psn-nn-gnn", () => {
    const p = bridge.buildFindPattern(mockReport());
    expect(p.ai_substrate).toBe("psn-nn-gnn");
    expect(p.context_facts.some((f) => f.startsWith("worst:ACCURATE:778"))).toBe(true);
  });
});

describe("QuotingDeepReasoningBridgeEngine.buildSuggestRateAdjust", () => {
  it("when global bias > 0 (over-predicting) includes hint about rate-too-high", () => {
    const p = bridge.buildSuggestRateAdjust(mockReport());
    expect(p.context_facts.join(" ")).toContain("rate-or-overhead-too-high");
  });
  it("when global bias < 0 (under-predicting) includes hint about rate-too-low", () => {
    const p = bridge.buildSuggestRateAdjust(mockReport({
      metrics: { mae_usd: 12, rmse_usd: 15, mape_pct: 18, mean_signed_pct_error: -10 },
    }));
    expect(p.context_facts.join(" ")).toContain("rate-or-overhead-too-low");
  });
});

describe("QuotingDeepReasoningBridgeEngine.buildOutlierInvestigate", () => {
  it("packages every worst_5_record as an outlier:CUSTOMER:PART fact", () => {
    const p = bridge.buildOutlierInvestigate(mockReport());
    expect(p.ai_substrate).toBe("tribal-rag");
    expect(p.context_facts.length).toBe(2); // mock has 2 worst records
    expect(p.context_facts[0]).toContain("ACCURATE:778");
    expect(p.context_facts[1]).toContain("ITW:9095");
  });
});

describe("QuotingDeepReasoningBridgeEngine.buildCrossCustomerRec", () => {
  it("includes both source + target customer facts", () => {
    const p = bridge.buildCrossCustomerRec(mockReport(), "ACCURATE", "ITW");
    expect(p.ai_substrate).toBe("prism-creative-reasoning");
    expect(p.context_facts.some((f) => f.startsWith("source=ACCURATE"))).toBe(true);
    expect(p.context_facts.some((f) => f.startsWith("target=ITW"))).toBe(true);
  });
});
