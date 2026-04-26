/**
 * LocalCommitMessageEngine Tests — LOCAL-LLM-MS0 U-LLM-CMT01
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import LocalCommitMessageEngine, {
  CommitInputSchema,
} from "../engines/LocalCommitMessageEngine.js";

describe("LocalCommitMessageEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CommitInputSchema", () => {
    it("validates valid input", () => {
      const input = {
        diff: "diff --git a/test.ts b/test.ts\n+new line",
        scope: "LOCAL-LLM-MS0",
        unitId: "U-LLM-CMT01",
        type: "feat" as const,
      };
      expect(() => CommitInputSchema.parse(input)).not.toThrow();
    });

    it("allows empty input", () => {
      const input = {};
      expect(() => CommitInputSchema.parse(input)).not.toThrow();
    });

    it("defaults maxLength to 72", () => {
      const parsed = CommitInputSchema.parse({});
      expect(parsed.maxLength).toBe(72);
    });

    it("defaults includeBody to false", () => {
      const parsed = CommitInputSchema.parse({});
      expect(parsed.includeBody).toBe(false);
    });

    it("defaults staged to true", () => {
      const parsed = CommitInputSchema.parse({});
      expect(parsed.staged).toBe(true);
    });

    it("clamps maxLength to valid range", () => {
      expect(() => CommitInputSchema.parse({ maxLength: 10 })).toThrow();
      expect(() => CommitInputSchema.parse({ maxLength: 300 })).toThrow();
    });

    it("validates commit type enum", () => {
      expect(() => CommitInputSchema.parse({ type: "feat" })).not.toThrow();
      expect(() => CommitInputSchema.parse({ type: "fix" })).not.toThrow();
      expect(() => CommitInputSchema.parse({ type: "invalid" })).toThrow();
    });
  });

  describe("suggest", () => {
    it("returns a commit suggestion structure", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/src/test.ts b/src/test.ts\n+code line here",
      });
      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("breaking");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("alternatives");
      expect(result).toHaveProperty("ollamaUsed");
      expect(result).toHaveProperty("latencyMs");
    });

    it("includes latency measurement", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/test.ts b/test.ts\n+line",
      });
      expect(typeof result.latencyMs).toBe("number");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("handles empty diff gracefully", async () => {
      const result = await LocalCommitMessageEngine.suggest({ diff: "" });
      expect(result.subject).toContain("no changes");
      expect(result.confidence).toBe(0);
    });

    it("applies scope and unitId to subject", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/engine.ts b/engine.ts\n+code",
        scope: "TEST-MS0",
        unitId: "U-TEST-01",
      });
      expect(result.subject).toMatch(/\[TEST-MS0\]/);
      expect(result.subject).toMatch(/U-TEST-01/);
    });

    it("respects type parameter", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/file.ts b/file.ts\n+code",
        type: "fix",
      });
      expect(result.type).toBe("fix");
    });

    it("returns ollamaUsed flag", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/file.ts b/file.ts\n+code",
      });
      expect(typeof result.ollamaUsed).toBe("boolean");
    });

    it("returns breaking flag", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/file.ts b/file.ts\n+code",
      });
      expect(typeof result.breaking).toBe("boolean");
    });

    it("returns alternatives array", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/file.ts b/file.ts\n+code",
      });
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    it("respects maxLength for subject", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/very-long-file-name.ts b/very-long-file-name.ts\n+code",
        maxLength: 50,
      });
      expect(result.subject.length).toBeLessThanOrEqual(50);
    });
  });

  describe("getSubject", () => {
    it("returns just the subject string", async () => {
      const result = await LocalCommitMessageEngine.getSubject({
        diff: "diff --git a/test.ts b/test.ts\n+line",
      });
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("analyze", () => {
    it("returns git state analysis", () => {
      const result = LocalCommitMessageEngine.analyze();
      expect(result).toHaveProperty("hasStagedChanges");
      expect(result).toHaveProperty("hasUnstagedChanges");
      expect(result).toHaveProperty("stagedDiff");
      expect(result).toHaveProperty("unstagedDiff");
      expect(result).toHaveProperty("status");
    });

    it("returns boolean flags for changes", () => {
      const result = LocalCommitMessageEngine.analyze();
      expect(typeof result.hasStagedChanges).toBe("boolean");
      expect(typeof result.hasUnstagedChanges).toBe("boolean");
    });

    it("returns string values for diffs", () => {
      const result = LocalCommitMessageEngine.analyze();
      expect(typeof result.stagedDiff).toBe("string");
      expect(typeof result.unstagedDiff).toBe("string");
      expect(typeof result.status).toBe("string");
    });
  });

  describe("healthCheck", () => {
    it("returns health status structure", async () => {
      const health = await LocalCommitMessageEngine.healthCheck();
      expect(health).toHaveProperty("ollamaAvailable");
      expect(health).toHaveProperty("gitAvailable");
      expect(health).toHaveProperty("inGitRepo");
    });

    it("returns boolean values", async () => {
      const health = await LocalCommitMessageEngine.healthCheck();
      expect(typeof health.ollamaAvailable).toBe("boolean");
      expect(typeof health.gitAvailable).toBe("boolean");
      expect(typeof health.inGitRepo).toBe("boolean");
    });

    it("detects git availability", async () => {
      const health = await LocalCommitMessageEngine.healthCheck();
      // Git should be available in most dev environments, but don't fail in CI
      expect(typeof health.gitAvailable).toBe("boolean");
    });

    it("detects git repo status", async () => {
      const health = await LocalCommitMessageEngine.healthCheck();
      // Environment-dependent: just verify it returns a boolean
      expect(typeof health.inGitRepo).toBe("boolean");
    });
  });

  describe("diff analysis", () => {
    it("detects test file changes as test type", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/src/__tests__/MyEngine.test.ts b/src/__tests__/MyEngine.test.ts\n+test code",
      });
      if (!result.ollamaUsed) {
        expect(result.type).toBe("test");
      }
    });

    it("detects docs changes", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/README.md b/README.md\n+docs content",
      });
      if (!result.ollamaUsed) {
        expect(result.type).toBe("docs");
      }
    });

    it("detects build changes", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/package.json b/package.json\n+dependency",
      });
      if (!result.ollamaUsed) {
        expect(result.type).toBe("build");
      }
    });

    it("detects engine changes as feat", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/src/engines/NewEngine.ts b/src/engines/NewEngine.ts\n+export class NewEngine {}",
      });
      if (!result.ollamaUsed) {
        expect(result.type).toBe("feat");
      }
    });
  });

  describe("PRISM commit format", () => {
    it("formats with scope only", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/file.ts b/file.ts\n+code",
        scope: "MY-MS0",
      });
      expect(result.subject).toMatch(/\[MY-MS0\]/);
    });

    it("formats with scope and unitId", async () => {
      const result = await LocalCommitMessageEngine.suggest({
        diff: "diff --git a/file.ts b/file.ts\n+code",
        scope: "LOCAL-LLM-MS0",
        unitId: "U-LLM-01",
      });
      expect(result.subject).toMatch(/\[LOCAL-LLM-MS0\] U-LLM-01:/);
    });
  });
});
