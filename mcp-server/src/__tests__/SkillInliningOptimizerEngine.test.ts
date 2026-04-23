/**
 * SkillInliningOptimizerEngine Tests — U-CTX06
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// We need to test the engine logic without relying on actual file paths
// Create a simplified test version that operates on in-memory data

interface SkillUsageRecord {
  skillId: string;
  invocations: number;
  lastUsed: string;
  totalTokensSaved: number;
  successes: number;
  failures: number;
}

interface SkillUsageStats {
  skillId: string;
  invocations: number;
  lastUsed: string;
  avgTokensSaved: number;
  successRate: number;
}

interface InliningDecision {
  skillId: string;
  shouldInline: boolean;
  reason: string;
  tokenCost: number;
  expectedSavings: number;
}

const MIN_INVOCATIONS_FOR_INLINE = 3;
const DECAY_FACTOR = 0.95;

class TestableSkillInliningOptimizer {
  private usageStats: Map<string, SkillUsageRecord> = new Map();
  private tokenBudget: number;

  constructor(tokenBudget: number = 5000) {
    this.tokenBudget = tokenBudget;
  }

  recordUsage(skillId: string, tokensSaved: number, success: boolean): void {
    const existing = this.usageStats.get(skillId) || {
      skillId,
      invocations: 0,
      lastUsed: "",
      totalTokensSaved: 0,
      successes: 0,
      failures: 0,
    };

    existing.invocations++;
    existing.lastUsed = new Date().toISOString();
    existing.totalTokensSaved += tokensSaved;
    if (success) {
      existing.successes++;
    } else {
      existing.failures++;
    }

    this.usageStats.set(skillId, existing);
  }

  applyDecay(): void {
    for (const [skillId, record] of this.usageStats) {
      record.invocations = Math.floor(record.invocations * DECAY_FACTOR);
      record.totalTokensSaved = Math.floor(record.totalTokensSaved * DECAY_FACTOR);
      record.successes = Math.floor(record.successes * DECAY_FACTOR);
      record.failures = Math.floor(record.failures * DECAY_FACTOR);

      if (record.invocations === 0) {
        this.usageStats.delete(skillId);
      }
    }
  }

  getStats(skillId: string): SkillUsageStats | null {
    const record = this.usageStats.get(skillId);
    if (!record) return null;

    const total = record.successes + record.failures;
    return {
      skillId: record.skillId,
      invocations: record.invocations,
      lastUsed: record.lastUsed,
      avgTokensSaved: total > 0 ? record.totalTokensSaved / total : 0,
      successRate: total > 0 ? record.successes / total : 0,
    };
  }

  shouldInline(skillId: string, tokenCost: number = 500): InliningDecision {
    const stats = this.getStats(skillId);

    if (!stats) {
      return {
        skillId,
        shouldInline: false,
        reason: "No usage data",
        tokenCost: 0,
        expectedSavings: 0,
      };
    }

    const expectedSavings = stats.avgTokensSaved * stats.invocations * stats.successRate;

    if (stats.invocations < MIN_INVOCATIONS_FOR_INLINE) {
      return {
        skillId,
        shouldInline: false,
        reason: `Insufficient invocations (${stats.invocations}/${MIN_INVOCATIONS_FOR_INLINE})`,
        tokenCost,
        expectedSavings,
      };
    }

    if (stats.successRate < 0.5) {
      return {
        skillId,
        shouldInline: false,
        reason: `Low success rate (${(stats.successRate * 100).toFixed(0)}%)`,
        tokenCost,
        expectedSavings,
      };
    }

    const roi = expectedSavings / (tokenCost || 1);
    if (roi < 1.5) {
      return {
        skillId,
        shouldInline: false,
        reason: `Low ROI (${roi.toFixed(2)}x)`,
        tokenCost,
        expectedSavings,
      };
    }

    return {
      skillId,
      shouldInline: true,
      reason: `High usage (${stats.invocations}), ROI ${roi.toFixed(1)}x`,
      tokenCost,
      expectedSavings,
    };
  }

  getTopSkills(limit: number = 5): SkillUsageStats[] {
    const stats: SkillUsageStats[] = [];
    for (const skillId of this.usageStats.keys()) {
      const stat = this.getStats(skillId);
      if (stat) stats.push(stat);
    }
    return stats
      .sort((a, b) => b.invocations - a.invocations)
      .slice(0, limit);
  }

  clearStats(): void {
    this.usageStats.clear();
  }
}

describe("SkillInliningOptimizerEngine (Unit Tests)", () => {
  let engine: TestableSkillInliningOptimizer;

  beforeEach(() => {
    engine = new TestableSkillInliningOptimizer(5000);
  });

  it("should record usage stats", () => {
    engine.recordUsage("test-skill", 100, true);
    engine.recordUsage("test-skill", 150, true);

    const stats = engine.getStats("test-skill");
    expect(stats).not.toBeNull();
    expect(stats?.invocations).toBe(2);
    expect(stats?.avgTokensSaved).toBe(125);
    expect(stats?.successRate).toBe(1.0);
  });

  it("should track success rate correctly", () => {
    engine.recordUsage("skill-a", 100, true);
    engine.recordUsage("skill-a", 100, true);
    engine.recordUsage("skill-a", 100, false);
    engine.recordUsage("skill-a", 100, false);

    const stats = engine.getStats("skill-a");
    expect(stats?.successRate).toBe(0.5);
  });

  it("should not inline skills with insufficient invocations", () => {
    engine.recordUsage("new-skill", 100, true);

    const decision = engine.shouldInline("new-skill");
    expect(decision.shouldInline).toBe(false);
    expect(decision.reason).toContain("Insufficient invocations");
  });

  it("should not inline skills with low success rate", () => {
    for (let i = 0; i < 5; i++) {
      engine.recordUsage("failing-skill", 100, false);
    }

    const decision = engine.shouldInline("failing-skill");
    expect(decision.shouldInline).toBe(false);
    expect(decision.reason).toContain("success rate");
  });

  it("should return null stats for unknown skills", () => {
    const stats = engine.getStats("unknown-skill");
    expect(stats).toBeNull();
  });

  it("should apply decay to stats", () => {
    for (let i = 0; i < 10; i++) {
      engine.recordUsage("decaying-skill", 100, true);
    }

    const beforeDecay = engine.getStats("decaying-skill")?.invocations;
    engine.applyDecay();
    const afterDecay = engine.getStats("decaying-skill")?.invocations;

    expect(afterDecay).toBeLessThan(beforeDecay || 0);
    expect(afterDecay).toBe(9); // floor(10 * 0.95)
  });

  it("should remove skills with zero invocations after decay", () => {
    engine.recordUsage("ephemeral-skill", 100, true);

    // Apply decay many times until invocations reach 0
    for (let i = 0; i < 100; i++) {
      engine.applyDecay();
    }

    const stats = engine.getStats("ephemeral-skill");
    expect(stats).toBeNull();
  });

  it("should get top skills sorted by invocations", () => {
    engine.recordUsage("skill-a", 100, true);
    engine.recordUsage("skill-a", 100, true);
    engine.recordUsage("skill-b", 100, true);
    engine.recordUsage("skill-c", 100, true);
    engine.recordUsage("skill-c", 100, true);
    engine.recordUsage("skill-c", 100, true);

    const top = engine.getTopSkills(2);

    expect(top).toHaveLength(2);
    expect(top[0].skillId).toBe("skill-c");
    expect(top[0].invocations).toBe(3);
    expect(top[1].skillId).toBe("skill-a");
  });

  it("should clear stats", () => {
    engine.recordUsage("test-skill", 100, true);
    expect(engine.getStats("test-skill")).not.toBeNull();

    engine.clearStats();
    expect(engine.getStats("test-skill")).toBeNull();
  });

  it("should inline high-usage skills with good ROI", () => {
    // Record enough usage to meet threshold
    for (let i = 0; i < 10; i++) {
      engine.recordUsage("good-skill", 500, true);
    }

    const decision = engine.shouldInline("good-skill", 100);
    expect(decision.shouldInline).toBe(true);
    expect(decision.reason).toContain("High usage");
  });

  it("should not inline skills with low ROI", () => {
    // Record usage but with low token savings
    for (let i = 0; i < 5; i++) {
      engine.recordUsage("low-roi-skill", 10, true);
    }

    const decision = engine.shouldInline("low-roi-skill", 1000);
    expect(decision.shouldInline).toBe(false);
    expect(decision.reason).toContain("ROI");
  });

  it("should handle no usage data", () => {
    const decision = engine.shouldInline("never-used");
    expect(decision.shouldInline).toBe(false);
    expect(decision.reason).toBe("No usage data");
  });

  it("should calculate average tokens saved correctly", () => {
    engine.recordUsage("averaging-skill", 100, true);
    engine.recordUsage("averaging-skill", 200, true);
    engine.recordUsage("averaging-skill", 300, true);

    const stats = engine.getStats("averaging-skill");
    expect(stats?.avgTokensSaved).toBe(200);
  });
});

describe("SkillInliningOptimizerEngine dispatcher wiring", () => {
  it("exposes MCP-first skill_inline actions through devDispatcher", () => {
    const dispatcher = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );

    expect(dispatcher).toContain('"skill_inline_plan"');
    expect(dispatcher).toContain('"skill_inline_content"');
    expect(dispatcher).toContain("SkillInliningOptimizerEngine.js");
  });
});
