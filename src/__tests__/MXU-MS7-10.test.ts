/**
 * MXU-MS7/MS9/MS10 Tests
 * DiscoverabilityEngine, CapabilityEffectivenessEngine
 */
import { describe, it, expect, beforeEach } from "vitest";
import { discoverabilityEngine } from "../engines/DiscoverabilityEngine.js";
import { capabilityEffectivenessEngine } from "../engines/CapabilityEffectivenessEngine.js";

// ── DiscoverabilityEngine (MXU-MS7) ──────────────────────────

describe("DiscoverabilityEngine — Search", () => {

  it("finds speed/feed capabilities", () => {
    const r = discoverabilityEngine.search("speed feed calculation");
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results[0].domain).toBe("physics");
    expect(r.query_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("finds G-code capabilities", () => {
    const r = discoverabilityEngine.search("generate gcode fanuc");
    expect(r.results.some(r => r.domain === "post_processor")).toBe(true);
  });

  it("finds quoting capabilities", () => {
    const r = discoverabilityEngine.search("quote cost estimate");
    expect(r.results.some(r => r.domain === "business")).toBe(true);
  });

  it("finds wire EDM capabilities", () => {
    const r = discoverabilityEngine.search("wire edm");
    expect(r.results.some(r => r.id.includes("wedm"))).toBe(true);
  });

  it("returns empty for gibberish", () => {
    const r = discoverabilityEngine.search("xz");
    expect(r.total).toBe(0);
  });

  it("respects limit", () => {
    const r = discoverabilityEngine.search("tool", 3);
    expect(r.results.length).toBeLessThanOrEqual(3);
  });

  it("scores are between 0 and 1", () => {
    const r = discoverabilityEngine.search("cutting force kienzle");
    for (const result of r.results) {
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("DiscoverabilityEngine — Browse", () => {

  it("browses physics domain", () => {
    const r = discoverabilityEngine.browse("physics");
    expect(r.total).toBeGreaterThan(3);
    expect(r.capabilities.every(c => c.domain === "physics")).toBe(true);
  });

  it("browses business domain", () => {
    const r = discoverabilityEngine.browse("business");
    expect(r.total).toBeGreaterThan(0);
  });

  it("empty for unknown domain", () => {
    const r = discoverabilityEngine.browse("nonexistent");
    expect(r.total).toBe(0);
  });

  it("lists all domains", () => {
    const domains = discoverabilityEngine.listDomains();
    expect(domains.length).toBeGreaterThan(4);
    expect(domains.some(d => d.domain === "physics")).toBe(true);
    expect(domains.some(d => d.domain === "post_processor")).toBe(true);
  });
});

describe("DiscoverabilityEngine — Recommendation", () => {

  it("recommends related capabilities", () => {
    const r = discoverabilityEngine.recommend(["sf-calc"]);
    expect(r.length).toBeGreaterThan(0);
    // Should recommend related capabilities like force-calc, tool-life
    expect(r.some(rec => rec.capability.id === "force-calc" || rec.capability.id === "tool-life")).toBe(true);
  });

  it("empty recommendations with no usage", () => {
    const r = discoverabilityEngine.recommend([]);
    expect(r).toHaveLength(0);
  });

  it("sorts by confidence", () => {
    const r = discoverabilityEngine.recommend(["sf-calc", "pp-gen"]);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].confidence).toBeLessThanOrEqual(r[i - 1].confidence);
    }
  });
});

describe("DiscoverabilityEngine — What Can I Do", () => {

  it("answers 'what can prism do with cutting force'", () => {
    const r = discoverabilityEngine.whatCanIDo("what can prism do with cutting force?");
    expect(r.results.length).toBeGreaterThan(0);
  });

  it("answers 'how do I generate gcode'", () => {
    const r = discoverabilityEngine.whatCanIDo("how do I generate gcode?");
    expect(r.results.some(r => r.domain === "post_processor")).toBe(true);
  });
});

describe("DiscoverabilityEngine — Stats", () => {

  it("returns index statistics", () => {
    const s = discoverabilityEngine.getStats();
    expect(s.total).toBeGreaterThan(15);
    expect(s.by_type.action).toBeGreaterThan(0);
    expect(s.by_type.skill).toBeGreaterThan(0);
    expect(Object.keys(s.by_domain).length).toBeGreaterThan(4);
  });
});

// ── CapabilityEffectivenessEngine (MXU-MS9+10) ──────────────

beforeEach(() => {
  capabilityEffectivenessEngine.clearUsageLog();
});

describe("CapabilityEffectivenessEngine — Validation", () => {

  it("returns validation test suite", () => {
    const tests = capabilityEffectivenessEngine.getValidationTests();
    expect(tests.length).toBeGreaterThan(5);
    expect(tests.some(t => t.pillar === "calculator")).toBe(true);
    expect(tests.some(t => t.pillar === "postprocessor")).toBe(true);
  });

  it("validates passing result", () => {
    const test = capabilityEffectivenessEngine.getValidationTests()[0];
    const output = { output: {}, material: {}, tool: {}, machine: {}, safety_score: 0.9 };
    const r = capabilityEffectivenessEngine.validateResult(test, output, 100);
    expect(r.pass).toBe(true);
    expect(r.missing_fields).toHaveLength(0);
  });

  it("validates failing result with missing fields", () => {
    const test = capabilityEffectivenessEngine.getValidationTests()[0];
    const output = { output: {} }; // missing material, tool, machine, safety_score
    const r = capabilityEffectivenessEngine.validateResult(test, output, 100);
    expect(r.pass).toBe(false);
    expect(r.missing_fields.length).toBeGreaterThan(0);
  });

  it("aggregates validation results", () => {
    const results = [
      { test_id: "v1", pillar: "calculator" as const, pass: true, duration_ms: 100, output_fields_present: ["a"], missing_fields: [] },
      { test_id: "v2", pillar: "calculator" as const, pass: false, duration_ms: 50, output_fields_present: [], missing_fields: ["b"] },
      { test_id: "v3", pillar: "postprocessor" as const, pass: true, duration_ms: 80, output_fields_present: ["c"], missing_fields: [] },
    ];
    const suite = capabilityEffectivenessEngine.aggregateValidation(results);
    expect(suite.total_tests).toBe(3);
    expect(suite.passed).toBe(2);
    expect(suite.pass_rate).toBeCloseTo(66.7, 0);
    expect(suite.by_pillar.length).toBe(2);
  });
});

describe("CapabilityEffectivenessEngine — Usage Tracking", () => {

  it("records and scores usage", () => {
    capabilityEffectivenessEngine.recordUsage({ capability_id: "sf-calc", pillar: "calculator", timestamp: new Date().toISOString(), tokens_consumed: 5000, success: true });
    capabilityEffectivenessEngine.recordUsage({ capability_id: "sf-calc", pillar: "calculator", timestamp: new Date().toISOString(), tokens_consumed: 4500, success: true });
    capabilityEffectivenessEngine.recordUsage({ capability_id: "sf-calc", pillar: "calculator", timestamp: new Date().toISOString(), tokens_consumed: 6000, success: false });

    const score = capabilityEffectivenessEngine.scoreCapability("sf-calc");
    expect(score.usage_count).toBe(3);
    expect(score.success_rate).toBeCloseTo(0.67, 1);
    expect(score.avg_tokens).toBeGreaterThan(0);
    expect(score.effectiveness).toBe("medium");
  });

  it("scores unused capability", () => {
    const score = capabilityEffectivenessEngine.scoreCapability("unused-cap");
    expect(score.effectiveness).toBe("unused");
    expect(score.recommendation).toContain("promote");
  });

  it("scores high-effectiveness capability", () => {
    for (let i = 0; i < 6; i++) {
      capabilityEffectivenessEngine.recordUsage({ capability_id: "pp-gen", pillar: "postprocessor", timestamp: new Date().toISOString(), tokens_consumed: 3000, success: true });
    }
    const score = capabilityEffectivenessEngine.scoreCapability("pp-gen");
    expect(score.effectiveness).toBe("high");
  });
});

describe("CapabilityEffectivenessEngine — Report", () => {

  it("generates empty report", () => {
    const r = capabilityEffectivenessEngine.generateReport(["sf-calc", "pp-gen"]);
    expect(r.total_capabilities).toBe(2);
    expect(r.unused_capabilities).toBe(2);
    expect(r.active_capabilities).toBe(0);
  });

  it("generates report with usage data", () => {
    capabilityEffectivenessEngine.recordUsage({ capability_id: "sf-calc", pillar: "calculator", timestamp: new Date().toISOString(), tokens_consumed: 5000, success: true });
    capabilityEffectivenessEngine.recordUsage({ capability_id: "sf-calc", pillar: "calculator", timestamp: new Date().toISOString(), tokens_consumed: 4000, success: true });

    const r = capabilityEffectivenessEngine.generateReport(["sf-calc", "pp-gen", "quick-quote"]);
    expect(r.active_capabilities).toBe(1);
    expect(r.unused_capabilities).toBe(2);
    expect(r.total_usage_events).toBe(2);
    expect(r.top_used.length).toBe(1);
    expect(r.improvement_suggestions.length).toBeGreaterThan(0);
  });
});

describe("CapabilityEffectivenessEngine — Token Benchmarks", () => {

  it("computes benchmarks from usage", () => {
    capabilityEffectivenessEngine.recordUsage({ capability_id: "sf-calc", pillar: "calculator", timestamp: new Date().toISOString(), tokens_consumed: 3000, success: true });
    capabilityEffectivenessEngine.recordUsage({ capability_id: "sf-calc", pillar: "calculator", timestamp: new Date().toISOString(), tokens_consumed: 5000, success: true });
    capabilityEffectivenessEngine.recordUsage({ capability_id: "sf-calc", pillar: "calculator", timestamp: new Date().toISOString(), tokens_consumed: 8000, success: true });

    const b = capabilityEffectivenessEngine.getTokenBenchmark("sf-calc");
    expect(b.min_tokens).toBe(3000);
    expect(b.max_tokens).toBe(8000);
    expect(b.avg_tokens).toBeCloseTo(5333, -1);
    expect(b.samples).toBe(3);
  });

  it("returns zeros for unused capability", () => {
    const b = capabilityEffectivenessEngine.getTokenBenchmark("unused");
    expect(b.samples).toBe(0);
    expect(b.avg_tokens).toBe(0);
  });
});
