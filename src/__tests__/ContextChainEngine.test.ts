/**
 * ContextChainEngine Tests — ACP-MS3
 *
 * Validates context management chain:
 *   1. Context pressure estimation (low/medium/high/critical)
 *   2. Bundle priority scoring by task class
 *   3. Context load planning within budget
 *   4. Compaction planning with preserve/prune
 *   5. Context health reporting
 */
import { describe, it, expect } from "vitest";
import { contextChainEngine } from "../engines/ContextChainEngine.js";
import type { ContextBundle } from "../engines/AutomationChainEngine.js";

// ── Test Data ────────────────────────────────────────────────

const SAMPLE_BUNDLES: ContextBundle[] = [
  { id: "engine-digest", files: ["data/docs/ENGINE_DIGEST.md"], purpose: "Engine names", token_cost_estimate: 300 },
  { id: "dispatcher-digest", files: ["data/docs/DISPATCHER_DIGEST.md"], purpose: "Routing", token_cost_estimate: 200 },
  { id: "physics", files: ["src/physics/constants.ts"], purpose: "Physics constants", token_cost_estimate: 400 },
  { id: "position", files: ["../state/CURRENT_POSITION.md"], purpose: "Roadmap position", token_cost_estimate: 100 },
  { id: "handoff", files: ["../state/HANDOFF.md"], purpose: "Last handoff", token_cost_estimate: 200 },
  { id: "web-structure", files: ["web/src/App.tsx"], purpose: "React structure", token_cost_estimate: 200 },
];

// ── Context Pressure ─────────────────────────────────────────

describe("ContextChainEngine — Context Pressure", () => {

  it("low pressure at 30% utilization", () => {
    const p = contextChainEngine.estimatePressure(300_000, 1_000_000);
    expect(p.pressure_level).toBe("low");
    expect(p.should_compact).toBe(false);
    expect(p.utilization_pct).toBeCloseTo(30, 0);
  });

  it("medium pressure at 65% utilization", () => {
    const p = contextChainEngine.estimatePressure(650_000, 1_000_000);
    expect(p.pressure_level).toBe("medium");
    expect(p.should_compact).toBe(false);
  });

  it("high pressure at 80% utilization", () => {
    const p = contextChainEngine.estimatePressure(800_000, 1_000_000);
    expect(p.pressure_level).toBe("high");
    expect(p.should_compact).toBe(false);
  });

  it("critical pressure at 90% utilization → should compact", () => {
    const p = contextChainEngine.estimatePressure(900_000, 1_000_000);
    expect(p.pressure_level).toBe("critical");
    expect(p.should_compact).toBe(true);
  });

  it("estimates remaining messages", () => {
    const p = contextChainEngine.estimatePressure(500_000, 1_000_000);
    expect(p.estimated_messages_remaining).toBeGreaterThan(0);
    expect(p.estimated_tokens_available).toBe(500_000);
  });

  it("handles zero tokens used", () => {
    const p = contextChainEngine.estimatePressure(0, 1_000_000);
    expect(p.pressure_level).toBe("low");
    expect(p.utilization_pct).toBe(0);
  });
});

// ── Bundle Priority Scoring ──────────────────────────────────

describe("ContextChainEngine — Bundle Priority", () => {

  it("backend task prioritizes engine-digest and dispatcher-digest", () => {
    const priorities = contextChainEngine.prioritizeBundles("backend", SAMPLE_BUNDLES, 2000);
    const topTwo = priorities.slice(0, 2).map(p => p.bundle_id);
    expect(topTwo).toContain("engine-digest");
    expect(topTwo).toContain("dispatcher-digest");
  });

  it("speed_feed task prioritizes physics constants", () => {
    const priorities = contextChainEngine.prioritizeBundles("speed_feed", SAMPLE_BUNDLES, 2000);
    expect(priorities[0].bundle_id).toBe("physics");
    expect(priorities[0].relevance_score).toBe(1.0);
    expect(priorities[0].load_recommendation).toBe("must_load");
  });

  it("roadmap task prioritizes position and handoff", () => {
    const priorities = contextChainEngine.prioritizeBundles("roadmap", SAMPLE_BUNDLES, 2000);
    const topTwo = priorities.slice(0, 2).map(p => p.bundle_id);
    expect(topTwo).toContain("position");
    expect(topTwo).toContain("handoff");
  });

  it("web task prioritizes web-structure", () => {
    const priorities = contextChainEngine.prioritizeBundles("web", SAMPLE_BUNDLES, 2000);
    expect(priorities[0].bundle_id).toBe("web-structure");
  });

  it("general task gives low relevance to all bundles", () => {
    const priorities = contextChainEngine.prioritizeBundles("general", SAMPLE_BUNDLES, 2000);
    for (const p of priorities) {
      expect(p.relevance_score).toBeLessThanOrEqual(0.3);
    }
  });

  it("cost_benefit_ratio is computed correctly", () => {
    const priorities = contextChainEngine.prioritizeBundles("speed_feed", SAMPLE_BUNDLES, 2000);
    const physicsBundle = priorities.find(p => p.bundle_id === "physics")!;
    expect(physicsBundle.cost_benefit_ratio).toBeGreaterThan(0);
  });
});

// ── Context Load Planning ────────────────────────────────────

describe("ContextChainEngine — Load Planning", () => {

  it("loads must_load bundles within budget", () => {
    const plan = contextChainEngine.planContextLoad("speed_feed", SAMPLE_BUNDLES, 1000);
    expect(plan.bundles_to_load.length).toBeGreaterThan(0);
    expect(plan.bundles_to_load.some(b => b.bundle_id === "physics")).toBe(true);
  });

  it("skips low-relevance bundles", () => {
    const plan = contextChainEngine.planContextLoad("speed_feed", SAMPLE_BUNDLES, 500);
    const skippedIds = plan.bundles_skipped.map(b => b.bundle_id);
    // web-structure should be skipped for speed_feed task
    expect(skippedIds.some(id => id === "web-structure" || id === "position")).toBe(true);
  });

  it("tracks budget remaining", () => {
    const plan = contextChainEngine.planContextLoad("backend", SAMPLE_BUNDLES, 2000);
    expect(plan.budget_remaining).toBeLessThanOrEqual(2000);
    expect(plan.estimated_token_cost).toBeGreaterThan(0);
    expect(plan.estimated_token_cost + plan.budget_remaining).toBeLessThanOrEqual(
      plan.total_budget_tokens + 500 // allow for must_load overrides
    );
  });

  it("must_load overrides budget", () => {
    // Give a tiny budget but physics is must_load for speed_feed
    const plan = contextChainEngine.planContextLoad("speed_feed", SAMPLE_BUNDLES, 100);
    expect(plan.bundles_to_load.some(b => b.bundle_id === "physics")).toBe(true);
  });

  it("task_class is recorded", () => {
    const plan = contextChainEngine.planContextLoad("backend", SAMPLE_BUNDLES, 2000);
    expect(plan.task_class).toBe("backend");
  });
});

// ── Compaction Planning ──────────────────────────────────────

describe("ContextChainEngine — Compaction Planning", () => {

  it("recommends compaction at critical pressure", () => {
    const pressure = contextChainEngine.estimatePressure(900_000);
    const plan = contextChainEngine.planCompaction(
      pressure, "ACP-MS3", "PASS", ["engine X modified"]
    );
    expect(plan.should_compact).toBe(true);
    expect(plan.reason).toContain("compaction required");
  });

  it("does not recommend compaction at low pressure", () => {
    const pressure = contextChainEngine.estimatePressure(200_000);
    const plan = contextChainEngine.planCompaction(
      pressure, "ACP-MS3", "PASS", []
    );
    expect(plan.should_compact).toBe(false);
    expect(plan.reason).toContain("not yet needed");
  });

  it("preserves active task and build status", () => {
    const pressure = contextChainEngine.estimatePressure(900_000);
    const plan = contextChainEngine.planCompaction(
      pressure, "ACP-MS3", "PASS 0 errors", ["fact1"]
    );
    expect(plan.preserve.some(p => p.category === "position")).toBe(true);
    expect(plan.preserve.some(p => p.category === "build")).toBe(true);
  });

  it("includes critical facts in preserve list", () => {
    const pressure = contextChainEngine.estimatePressure(900_000);
    const plan = contextChainEngine.planCompaction(
      pressure, "task", "PASS", ["important fact 1", "important fact 2"]
    );
    expect(plan.preserve.filter(p => p.category === "incomplete_work")).toHaveLength(2);
  });

  it("generates handoff template", () => {
    const pressure = contextChainEngine.estimatePressure(900_000);
    const plan = contextChainEngine.planCompaction(
      pressure, "ACP-MS3", "PASS", ["fact"]
    );
    expect(plan.handoff_template.resume_instruction).toContain("ACP-MS3");
    expect(plan.handoff_template.build_status).toBe("PASS");
    expect(plan.handoff_template.critical_facts).toContain("fact");
  });

  it("estimates savings tokens", () => {
    const pressure = contextChainEngine.estimatePressure(900_000);
    const plan = contextChainEngine.planCompaction(pressure, "task", "PASS", []);
    expect(plan.estimated_savings_tokens).toBeGreaterThan(0);
  });
});

// ── Context Health Report ────────────────────────────────────

describe("ContextChainEngine — Health Report", () => {

  it("lean memory at 50 lines with bundles loaded", () => {
    const r = contextChainEngine.getHealthReport(50, 200_000, 3, 1000);
    expect(r.memory_status).toBe("lean");
    expect(r.recommendations).toHaveLength(0); // no issues when bundles are loaded
  });

  it("heavy memory at 180 lines triggers recommendation", () => {
    const r = contextChainEngine.getHealthReport(180, 200_000);
    expect(r.memory_status).toBe("heavy");
    expect(r.recommendations.some(r => r.includes("context-audit"))).toBe(true);
  });

  it("overflow memory at 260 lines", () => {
    const r = contextChainEngine.getHealthReport(260, 200_000);
    expect(r.memory_status).toBe("overflow");
  });

  it("critical pressure triggers compact recommendation", () => {
    const r = contextChainEngine.getHealthReport(50, 900_000);
    expect(r.pressure.pressure_level).toBe("critical");
    expect(r.recommendations.some(r => r.includes("compact immediately"))).toBe(true);
  });

  it("no bundles loaded triggers recommendation", () => {
    const r = contextChainEngine.getHealthReport(50, 100_000, 0, 0);
    expect(r.recommendations.some(r => r.includes("task classification"))).toBe(true);
  });

  it("high bundle cost triggers pruning recommendation", () => {
    const r = contextChainEngine.getHealthReport(50, 100_000, 5, 50000);
    expect(r.recommendations.some(r => r.includes("pruning"))).toBe(true);
  });
});

// ── Utility ──────────────────────────────────────────────────

describe("ContextChainEngine — Utility", () => {

  it("getPressureThresholds returns valid thresholds", () => {
    const t = contextChainEngine.getPressureThresholds();
    expect(t.low).toBeLessThan(t.medium);
    expect(t.medium).toBeLessThan(t.high);
    expect(t.high).toBeLessThan(t.critical);
  });

  it("getMemoryLimits returns ascending limits", () => {
    const l = contextChainEngine.getMemoryLimits();
    expect(l.lean).toBeLessThan(l.ok);
    expect(l.ok).toBeLessThan(l.heavy);
    expect(l.heavy).toBeLessThan(l.overflow);
  });
});
