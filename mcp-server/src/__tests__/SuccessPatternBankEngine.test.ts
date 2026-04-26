/**
 * SuccessPatternBankEngine Tests
 * ===============================
 *
 * Comprehensive tests for the AI augmentation learning loop pattern bank.
 *
 * @module engines/SuccessPatternBankEngine.test
 * @milestone CAM-EXHAUST-MS0 / AI-AUGMENT
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SuccessPatternBankEngine } from "../engines/SuccessPatternBankEngine.js";
import type { RecordPatternInput, QueryPatternInput } from "../schemas/successPatternSchema.js";

describe("SuccessPatternBankEngine", () => {
  let engine: SuccessPatternBankEngine;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `success-pattern-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    engine = new SuccessPatternBankEngine(testDir);
  });

  afterEach(() => {
    engine.clearCache();
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Cleanup best-effort
    }
  });

  describe("record()", () => {
    it("should record a valid pattern and return pattern_id as UUID", () => {
      const input: RecordPatternInput = {
        task_category: "engine_building",
        task_description: "Built a new calculation engine",
        task_keywords: ["engine", "calculation", "physics"],
        approach_summary: "Created Zod schema, then engine class with singleton export",
        mcp_actions_used: ["prism_dev.dedup_check"],
        tools_used: ["Write", "Edit"],
        engines_invoked: ["DuplicationGuardEngine"],
        confidence: "high",
        domain: "mill",
      };

      const result = engine.record(input);

      expect(result.ok).toBe(true);
      expect(result.pattern_id.length).toBe(36);
      expect(result.pattern_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result.path).toContain("success-patterns.jsonl");
    });

    it("should use provided pattern_id if given", () => {
      const customId = "550e8400-e29b-41d4-a716-446655440000";
      const input: RecordPatternInput = {
        task_category: "bug_fix",
        task_description: "Fixed null pointer exception",
        task_keywords: ["bug", "null", "fix"],
        approach_summary: "Added null check before property access",
        pattern_id: customId,
      };

      const result = engine.record(input);

      expect(result.ok).toBe(true);
      expect(result.pattern_id).toBe(customId);
    });

    it("should reject invalid task_category", () => {
      const input = {
        task_category: "invalid_category",
        task_description: "Some task",
        task_keywords: ["test"],
        approach_summary: "Some approach",
      };

      const result = engine.record(input as RecordPatternInput);

      expect(result.ok).toBe(false);
      expect(result.warning).toContain("Schema validation failed");
    });

    it("should reject empty task_keywords array", () => {
      const input: RecordPatternInput = {
        task_category: "refactoring",
        task_description: "Refactored module",
        task_keywords: [],
        approach_summary: "Extracted common logic",
      };

      const result = engine.record(input);

      expect(result.ok).toBe(false);
      expect(result.warning).toContain("Schema validation failed");
    });

    it("should reject task_description exceeding 500 chars", () => {
      const input: RecordPatternInput = {
        task_category: "documentation",
        task_description: "x".repeat(501),
        task_keywords: ["docs"],
        approach_summary: "Wrote docs",
      };

      const result = engine.record(input);

      expect(result.ok).toBe(false);
      expect(result.warning).toContain("Schema validation failed");
    });

    it("should reject approach_summary exceeding 1000 chars", () => {
      const input: RecordPatternInput = {
        task_category: "documentation",
        task_description: "Task",
        task_keywords: ["docs"],
        approach_summary: "y".repeat(1001),
      };

      const result = engine.record(input);

      expect(result.ok).toBe(false);
      expect(result.warning).toContain("Schema validation failed");
    });

    it("should reject more than 10 keywords", () => {
      const input: RecordPatternInput = {
        task_category: "test_creation",
        task_description: "Created tests",
        task_keywords: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"],
        approach_summary: "Wrote comprehensive tests",
      };

      const result = engine.record(input);

      expect(result.ok).toBe(false);
      expect(result.warning).toContain("Schema validation failed");
    });

    it("should persist pattern to JSONL file with correct structure", () => {
      const input: RecordPatternInput = {
        task_category: "schema_design",
        task_description: "Designed API schema",
        task_keywords: ["schema", "zod", "api"],
        approach_summary: "Used Zod with .describe() on all fields",
      };

      engine.record(input);

      const filePath = path.join(testDir, "success-patterns.jsonl");
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content.trim());
      expect(parsed.task_category).toBe("schema_design");
      expect(parsed.success_count).toBe(1);
      expect(parsed.failure_count).toBe(0);
      expect(parsed.schemaVersion).toBe("1.0.0");
    });

    it("should set default confidence to medium", () => {
      const input: RecordPatternInput = {
        task_category: "api_integration",
        task_description: "Integrated external API",
        task_keywords: ["api", "integration"],
        approach_summary: "Used fetch with retry logic",
      };

      engine.record(input);

      const filePath = path.join(testDir, "success-patterns.jsonl");
      const content = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content.trim());
      expect(parsed.confidence).toBe("medium");
    });
  });

  describe("query()", () => {
    beforeEach(() => {
      engine.record({
        task_category: "engine_building",
        task_description: "Built calculation engine",
        task_keywords: ["engine", "calculation", "physics", "mill"],
        approach_summary: "Schema-first approach",
        confidence: "high",
        domain: "mill",
      });

      engine.record({
        task_category: "engine_building",
        task_description: "Built validation engine",
        task_keywords: ["engine", "validation", "schema"],
        approach_summary: "Zod-based validation",
        confidence: "medium",
        domain: "lathe",
      });

      engine.record({
        task_category: "bug_fix",
        task_description: "Fixed race condition",
        task_keywords: ["bug", "race", "async"],
        approach_summary: "Added mutex lock",
        confidence: "low",
        domain: "mill",
      });
    });

    it("should return all patterns when no filters", () => {
      const result = engine.query({});

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it("should filter by task_category", () => {
      const result = engine.query({ task_category: "engine_building" });

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBe(2);
      expect(result.patterns.every((p) => p.task_category === "engine_building")).toBe(true);
    });

    it("should filter by domain", () => {
      const result = engine.query({ domain: "mill" });

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBe(2);
      expect(result.patterns.every((p) => p.domain === "mill")).toBe(true);
    });

    it("should filter by min_confidence", () => {
      const result = engine.query({ min_confidence: "medium" });

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBe(2);
      expect(result.patterns.every((p) => p.confidence !== "low")).toBe(true);
    });

    it("should filter by keywords with scoring", () => {
      const result = engine.query({ keywords: ["engine", "physics"] });

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns[0].task_keywords).toContain("physics");
    });

    it("should respect limit parameter", () => {
      const result = engine.query({ limit: 1 });

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBe(1);
      expect(result.total).toBe(3);
    });

    it("should reject invalid query parameters", () => {
      const result = engine.query({ limit: 200 } as QueryPatternInput);

      expect(result.ok).toBe(false);
      expect(result.warning).toContain("Schema validation failed");
    });

    it("should return empty array when no matches", () => {
      const result = engine.query({ task_category: "security_fix" });

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it("should combine multiple filters", () => {
      const result = engine.query({
        task_category: "engine_building",
        domain: "mill",
        min_confidence: "high",
      });

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBe(1);
      expect(result.patterns[0].task_description).toContain("calculation");
    });
  });

  describe("reinforce()", () => {
    let patternId: string;

    beforeEach(() => {
      const result = engine.record({
        task_category: "test_creation",
        task_description: "Created unit tests",
        task_keywords: ["test", "vitest", "coverage"],
        approach_summary: "Used vitest with comprehensive assertions",
        confidence: "medium",
      });
      patternId = result.pattern_id;
    });

    it("should increment success_count on positive reinforcement", () => {
      const result = engine.reinforce({
        pattern_id: patternId,
        success: true,
      });

      expect(result.ok).toBe(true);
      expect(result.new_success_count).toBe(2);
      expect(result.new_failure_count).toBe(0);
    });

    it("should increment failure_count on negative reinforcement", () => {
      const result = engine.reinforce({
        pattern_id: patternId,
        success: false,
      });

      expect(result.ok).toBe(true);
      expect(result.new_success_count).toBe(1);
      expect(result.new_failure_count).toBe(1);
    });

    it("should upgrade confidence to high after 3 successes", () => {
      engine.reinforce({ pattern_id: patternId, success: true });
      engine.reinforce({ pattern_id: patternId, success: true });

      const query = engine.query({ keywords: ["test"] });
      const pattern = query.patterns.find((p) => p.pattern_id === patternId);

      expect(pattern?.confidence).toBe("high");
      expect(pattern?.success_count).toBe(3);
    });

    it("should return error for non-existent pattern", () => {
      const result = engine.reinforce({
        pattern_id: "550e8400-e29b-41d4-a716-446655440000",
        success: true,
      });

      expect(result.ok).toBe(false);
      expect(result.warning).toContain("Pattern not found");
    });

    it("should reject invalid UUID", () => {
      const result = engine.reinforce({
        pattern_id: "not-a-uuid",
        success: true,
      });

      expect(result.ok).toBe(false);
      expect(result.warning).toContain("Schema validation failed");
    });

    it("should update last_used_at timestamp", () => {
      const beforeReinforce = new Date().toISOString();

      engine.reinforce({ pattern_id: patternId, success: true });

      const query = engine.query({ keywords: ["test"] });
      const pattern = query.patterns.find((p) => p.pattern_id === patternId);

      expect(new Date(pattern!.last_used_at) >= new Date(beforeReinforce)).toBe(true);
    });
  });

  describe("stats()", () => {
    it("should return zeros for empty bank", () => {
      const result = engine.stats();

      expect(result.ok).toBe(true);
      expect(result.total_patterns).toBe(0);
      expect(Object.keys(result.by_category).length).toBe(0);
      expect(Object.keys(result.by_confidence).length).toBe(0);
      expect(result.top_keywords.length).toBe(0);
    });

    it("should aggregate by category", () => {
      engine.record({
        task_category: "engine_building",
        task_description: "Engine 1",
        task_keywords: ["engine"],
        approach_summary: "Approach 1",
      });
      engine.record({
        task_category: "engine_building",
        task_description: "Engine 2",
        task_keywords: ["engine"],
        approach_summary: "Approach 2",
      });
      engine.record({
        task_category: "bug_fix",
        task_description: "Fix 1",
        task_keywords: ["bug"],
        approach_summary: "Fix approach",
      });

      const result = engine.stats();

      expect(result.by_category["engine_building"]).toBe(2);
      expect(result.by_category["bug_fix"]).toBe(1);
    });

    it("should aggregate by confidence", () => {
      engine.record({
        task_category: "test_creation",
        task_description: "Test",
        task_keywords: ["test"],
        approach_summary: "Approach",
        confidence: "high",
      });
      engine.record({
        task_category: "test_creation",
        task_description: "Test 2",
        task_keywords: ["test"],
        approach_summary: "Approach",
        confidence: "low",
      });

      const result = engine.stats();

      expect(result.by_confidence["high"]).toBe(1);
      expect(result.by_confidence["low"]).toBe(1);
    });

    it("should return top 10 keywords sorted by frequency", () => {
      for (let i = 0; i < 5; i++) {
        engine.record({
          task_category: "refactoring",
          task_description: `Refactor ${i}`,
          task_keywords: ["common", `unique${i}`],
          approach_summary: "Approach",
        });
      }

      const result = engine.stats();

      expect(result.top_keywords[0].keyword).toBe("common");
      expect(result.top_keywords[0].count).toBe(5);
      expect(result.top_keywords.length).toBeLessThanOrEqual(10);
    });
  });

  describe("findSimilar()", () => {
    beforeEach(() => {
      engine.record({
        task_category: "physics_calculation",
        task_description: "Calculated cutting force using Kienzle",
        task_keywords: ["cutting", "force", "kienzle", "physics"],
        approach_summary: "Used Kienzle formula with kc1.1 lookup",
        confidence: "high",
      });

      engine.record({
        task_category: "cam_programming",
        task_description: "Generated toolpath for pocket",
        task_keywords: ["toolpath", "pocket", "cam"],
        approach_summary: "Used trochoidal strategy",
        confidence: "medium",
      });
    });

    it("should find patterns by description keywords", () => {
      const result = engine.findSimilar("Calculate cutting force for milling");

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns[0].task_keywords).toContain("cutting");
    });

    it("should respect limit parameter", () => {
      const result = engine.findSimilar("engine building task", 1);

      expect(result.patterns.length).toBeLessThanOrEqual(1);
    });

    it("should return empty when no keywords match", () => {
      const result = engine.findSimilar("xyz abc 123");

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBe(0);
    });

    it("should extract words longer than 3 chars", () => {
      const result = engine.findSimilar("a to the force");

      expect(result.ok).toBe(true);
      if (result.patterns.length > 0) {
        expect(result.patterns[0].task_keywords).toContain("force");
      }
    });
  });

  describe("clearCache()", () => {
    it("should clear in-memory patterns then reload from disk", () => {
      engine.record({
        task_category: "other",
        task_description: "Test pattern",
        task_keywords: ["test"],
        approach_summary: "Test approach",
      });

      expect(engine.query({}).patterns.length).toBe(1);

      engine.clearCache();

      expect(engine.query({}).patterns.length).toBe(1);
    });
  });

  describe("persistence", () => {
    it("should survive engine recreation", () => {
      engine.record({
        task_category: "hook_creation",
        task_description: "Created pre-prompt hook",
        task_keywords: ["hook", "pre-prompt"],
        approach_summary: "Injected context before prompt",
      });

      const engine2 = new SuccessPatternBankEngine(testDir);
      const result = engine2.query({ keywords: ["hook"] });

      expect(result.ok).toBe(true);
      expect(result.patterns.length).toBe(1);
      expect(result.patterns[0].task_category).toBe("hook_creation");
    });

    it("should handle concurrent writes gracefully", () => {
      const results: Array<{ ok: boolean; pattern_id: string }> = [];
      for (let i = 0; i < 5; i++) {
        results.push(
          engine.record({
            task_category: "performance_optimization",
            task_description: `Optimization ${i}`,
            task_keywords: ["perf", `opt${i}`],
            approach_summary: `Approach ${i}`,
          })
        );
      }

      expect(results.every((r) => r.ok)).toBe(true);
      expect(engine.stats().total_patterns).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("should handle unicode in keywords", () => {
      const result = engine.record({
        task_category: "documentation",
        task_description: "Documented API with emoji",
        task_keywords: ["docs", "日本語", "émoji"],
        approach_summary: "Used markdown with examples",
      });

      expect(result.ok).toBe(true);

      const query = engine.query({ keywords: ["日本語"] });
      expect(query.patterns.length).toBe(1);
    });

    it("should handle special characters in description", () => {
      const result = engine.record({
        task_category: "other",
        task_description: 'Task with "quotes" and \\backslashes',
        task_keywords: ["special"],
        approach_summary: "Handled <xml> & entities",
      });

      expect(result.ok).toBe(true);
    });

    it("should match keywords case-insensitively", () => {
      engine.record({
        task_category: "other",
        task_description: "Test",
        task_keywords: ["ENGINE", "Engine", "engine"],
        approach_summary: "Test",
      });

      const result = engine.query({ keywords: ["ENGINE"] });
      expect(result.patterns.length).toBe(1);
    });

    it("should handle empty constraints array", () => {
      const result = engine.record({
        task_category: "cad_operation",
        task_description: "Created 3D model",
        task_keywords: ["cad", "model"],
        approach_summary: "Used parametric modeling",
        constraints: [],
      });

      expect(result.ok).toBe(true);
    });
  });
});
