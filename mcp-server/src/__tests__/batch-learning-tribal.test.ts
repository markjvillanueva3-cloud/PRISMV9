/**
 * Tests for final unwired engine wiring:
 * BatchOptimizationEngine, LearningPathEngine, TribalKnowledgeEngine
 */
import { describe, it, expect } from "vitest";
import { batchOptimizationEngine } from "../engines/BatchOptimizationEngine.js";
import { learningPathEngine } from "../engines/LearningPathEngine.js";
import { tribalKnowledgeEngine } from "../engines/TribalKnowledgeEngine.js";

// ── Batch Optimization ──────────────────────────────────────────
describe("BatchOptimizationEngine", () => {
  const jobs = [
    {
      id: "J1", part_name: "Bracket", quantity: 50, material: "AL6061",
      material_iso_group: "N", tooling_group: "TG-A", fixture_type: "vise",
      cycle_time_min: 8, setup_time_min: 30, due_date: "2026-04-01",
    },
    {
      id: "J2", part_name: "Housing", quantity: 20, material: "AL6061",
      material_iso_group: "N", tooling_group: "TG-A", fixture_type: "vise",
      cycle_time_min: 15, setup_time_min: 45, due_date: "2026-04-05",
    },
    {
      id: "J3", part_name: "Shaft", quantity: 100, material: "4140",
      material_iso_group: "P", tooling_group: "TG-B", fixture_type: "chuck",
      cycle_time_min: 5, setup_time_min: 25, due_date: "2026-04-02",
    },
  ];

  it("groups jobs by tooling/material similarity", () => {
    const groups = batchOptimizationEngine.group(jobs);
    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThan(0);
    // J1 and J2 share TG-A tooling → should be grouped
    const tgAGroup = groups.find(g => g.jobs.includes("J1") && g.jobs.includes("J2"));
    expect(tgAGroup).toBeDefined();
  });

  it("sequences groups with makespan", () => {
    const seq = batchOptimizationEngine.sequence(jobs);
    expect(seq.sequence.length).toBeGreaterThan(0);
    expect(seq.total_makespan_min).toBeGreaterThan(0);
    expect(seq.setup_savings_pct).toBeDefined();
  });

  it("generates setup changeover matrix", () => {
    const matrix = batchOptimizationEngine.setupMatrix(jobs);
    expect(matrix.groups.length).toBeGreaterThan(0);
    expect(Object.keys(matrix.matrix).length).toBe(matrix.groups.length);
  });

  it("calculates capacity utilization", () => {
    const cap = batchOptimizationEngine.capacity(jobs, 8, 5);
    expect(cap.load_pct).toBeGreaterThan(0);
    expect(cap.total_demand_hours).toBeGreaterThan(0);
    expect(cap.available_hours).toBeGreaterThan(0);
  });

  it("empty jobs returns empty groups", () => {
    const groups = batchOptimizationEngine.group([]);
    expect(groups.length).toBe(0);
  });
});

// ── Learning Path ──────────────────────────────────────────────
describe("LearningPathEngine", () => {
  const skills = {
    machine_setup: "beginner" as const,
    programming: "novice" as const,
    measurement: "intermediate" as const,
    safety: "advanced" as const,
  };

  it("assesses operator skill levels", () => {
    const r = learningPathEngine.assess("OP-001", skills, "operator");
    expect(r.role).toBe("operator");
    expect(r.overall_level).toBeDefined();
    expect(Object.keys(r.skills).length).toBeGreaterThan(0);
  });

  it("generates a learning plan", () => {
    const assessment = learningPathEngine.assess("OP-001", skills, "programmer");
    const plan = learningPathEngine.plan("OP-001", assessment, "programmer");
    expect(plan.target_role).toBe("programmer");
    expect(plan.modules.length).toBeGreaterThan(0);
    expect(plan.milestones.length).toBeGreaterThan(0);
  });

  it("tracks progress with completed modules", () => {
    const assessment = learningPathEngine.assess("OP-001", skills, "operator");
    const plan = learningPathEngine.plan("OP-001", assessment, "operator");
    const moduleIds = plan.modules.slice(0, 1).map(m => m.id);
    const progress = learningPathEngine.progress("OP-001", plan, moduleIds);
    expect(progress.completion_pct).toBeGreaterThanOrEqual(0);
    expect(progress.completion_pct).toBeLessThanOrEqual(100);
  });

  it("recommends modules based on skills", () => {
    const modules = learningPathEngine.recommend(skills);
    expect(Array.isArray(modules)).toBe(true);
    // Should recommend modules for weakest skills (novice/beginner)
  });

  it("higher role = more training needed", () => {
    const opAssess = learningPathEngine.assess("OP-001", skills, "operator");
    const engAssess = learningPathEngine.assess("OP-001", skills, "engineer");
    const opPlan = learningPathEngine.plan("OP-001", opAssess, "operator");
    const engPlan = learningPathEngine.plan("OP-001", engAssess, "engineer");
    expect(engPlan.modules.length).toBeGreaterThanOrEqual(opPlan.modules.length);
  });
});

// ── Tribal Knowledge ──────────────────────────────────────────
describe("TribalKnowledgeEngine", () => {
  it("searches knowledge base", () => {
    const tips = tribalKnowledgeEngine.search({ query: "chatter", limit: 5 });
    expect(Array.isArray(tips)).toBe(true);
  });

  it("captures a new tip", () => {
    // U-TK01: Use unique content to avoid content-based dedup rejection
    const ts = Date.now();
    const tip = tribalKnowledgeEngine.capture({
      title: `Test Tip — Aluminum Face Milling ${ts}`,
      body: `Use climb milling with sharp tools on 6061 to avoid BUE — unique ${ts}`,
      category: "tooling",
      source: "test",
      tags: ["aluminum", "face-milling"],
      confidence: 80,
    });
    expect(tip).not.toBeNull();
    expect(tip!.id).toBeDefined();
    expect(tip!.title).toContain("Aluminum");
    expect(tip!.created_at).toBeDefined();
    expect(tip!.usage_count).toBe(0);
  });

  it("suggests tips for material+operation", () => {
    const suggestion = tribalKnowledgeEngine.suggest("P", "turning");
    expect(suggestion).toBeDefined();
    expect(Array.isArray(suggestion.tips)).toBe(true);
  });

  it("returns knowledge base stats", () => {
    const s = tribalKnowledgeEngine.stats();
    expect(s.total_tips).toBeGreaterThan(0);
    expect(s.by_category).toBeDefined();
  });

  it("filters by category", () => {
    const tips = tribalKnowledgeEngine.search({ category: "tooling", limit: 50 });
    if (tips.length > 0) {
      expect(tips.every(t => t.category === "tooling")).toBe(true);
    }
  });
});
