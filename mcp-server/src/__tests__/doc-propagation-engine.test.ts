/**
 * Tests for DocPropagationEngine (Phase 0.15 U-DOC1)
 */

import { describe, it, expect } from "vitest";
import { DocPropagationEngine, docPropagationEngine } from "../engines/DocPropagationEngine.js";

describe("DocPropagationEngine", () => {
  const engine = new DocPropagationEngine();

  describe("classify() — engine writes", () => {
    it("flags engine-digest, master-index, and count surfaces for a new Engine", () => {
      const r = engine.classify("H:/prism/mcp-server/src/engines/FooEngine.ts");
      expect(r.matchedRules).toContain("engine-write");
      const surfaces = r.targets.map((t) => t.surface);
      expect(surfaces).toContain("engine-digest");
      expect(surfaces).toContain("master-index");
      expect(surfaces).toContain("mcp-claude-md");
      expect(surfaces).toContain("session-brief");
    });

    it("classifies the engine itself as full-regen for engine-digest", () => {
      const r = engine.classify("src/engines/FooEngine.ts");
      const d = r.targets.find((t) => t.surface === "engine-digest");
      expect(d?.action).toBe("full-regen");
    });

    it("uses touch-counts for root and MCP CLAUDE.md", () => {
      const r = engine.classify("src/engines/FooEngine.ts");
      expect(r.targets.find((t) => t.surface === "root-claude-md")?.action).toBe("touch-counts");
      expect(r.targets.find((t) => t.surface === "mcp-claude-md")?.action).toBe("touch-counts");
    });
  });

  describe("classify() — dispatcher writes", () => {
    it("flags dispatcher-digest and action-tracker for a Dispatcher.ts file", () => {
      const r = engine.classify("src/tools/dispatchers/fooDispatcher.ts");
      expect(r.matchedRules).toContain("dispatcher-write");
      const surfaces = r.targets.map((t) => t.surface);
      expect(surfaces).toContain("dispatcher-digest");
      expect(surfaces).toContain("action-tracker");
    });
  });

  describe("classify() — skill writes", () => {
    it("flags commands-manifest for files under .claude/commands/", () => {
      const r = engine.classify("C:/Users/u/.claude/commands/foo.md");
      expect(r.matchedRules).toContain("skill-write");
      const surfaces = r.targets.map((t) => t.surface);
      expect(surfaces).toContain("commands-manifest");
      expect(surfaces).toContain("capability-manifest");
    });

    it("does not match arbitrary .md files outside .claude/commands", () => {
      const r = engine.classify("docs/README.md");
      expect(r.matchedRules).not.toContain("skill-write");
    });
  });

  describe("classify() — hook writes", () => {
    it("flags hook-definitions for files in .claude/hooks", () => {
      const r = engine.classify("C:/Users/u/.claude/hooks/lib/foo.mjs");
      expect(r.matchedRules).toContain("hook-write");
      expect(r.targets.map((t) => t.surface)).toContain("hook-definitions");
    });

    it("flags hook-definitions for files in src/hooks", () => {
      const r = engine.classify("src/hooks/materialSanity.ts");
      expect(r.matchedRules).toContain("hook-write");
    });
  });

  describe("classify() — physics / formula / algorithm", () => {
    it("flags self-awareness-directive for algorithm writes", () => {
      const r = engine.classify("src/algorithms/kienzle.ts");
      expect(r.matchedRules).toContain("formula-or-algo");
      expect(r.targets.map((t) => t.surface)).toContain("self-awareness-directive");
    });

    it("flags self-awareness-directive for physics writes", () => {
      const r = engine.classify("src/physics/constants.ts");
      expect(r.matchedRules).toContain("formula-or-algo");
    });
  });

  describe("classify() — schema / registry", () => {
    it("flags action-tracker for schema writes", () => {
      const r = engine.classify("src/schemas/speedFeedSchema.ts");
      expect(r.matchedRules).toContain("schema-write");
      expect(r.targets.map((t) => t.surface)).toContain("action-tracker");
    });

    it("flags master-index for registry writes", () => {
      const r = engine.classify("src/registries/MaterialRegistry.ts");
      expect(r.matchedRules).toContain("registry-write");
      expect(r.targets.map((t) => t.surface)).toContain("master-index");
    });
  });

  describe("classify() — DSL", () => {
    it("flags code-system-index + dsl-compact for CODE_SYSTEM_INDEX.md", () => {
      const r = engine.classify("mcp-server/data/docs/CODE_SYSTEM_INDEX.md");
      expect(r.matchedRules).toContain("dsl-map");
      const surfaces = r.targets.map((t) => t.surface);
      expect(surfaces).toContain("code-system-index");
      expect(surfaces).toContain("dsl-compact");
    });
  });

  describe("classify() — structural (fallback)", () => {
    it("flags directory-digest for any src/*.ts source", () => {
      const r = engine.classify("src/utils/Logger.ts");
      expect(r.matchedRules).toContain("structural");
      expect(r.targets.map((t) => t.surface)).toContain("directory-digest");
    });

    it("does not flag directory-digest for non-src paths", () => {
      const r = engine.classify("state/shared/foo.md");
      expect(r.matchedRules).not.toContain("structural");
    });
  });

  describe("classify() — deduplication", () => {
    it("dedupes targets when multiple rules point at the same (surface, action)", () => {
      // An engine file matches engine-write AND structural. Both may emit different surfaces.
      const r = engine.classify("src/engines/FooEngine.ts");
      const keys = r.targets.map((t) => `${t.surface}:${t.action}`);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe("classify() — validation", () => {
    it("throws on empty filePath", () => {
      expect(() => engine.classify("")).toThrow(/non-empty/);
      expect(() => engine.classify("   ")).toThrow(/non-empty/);
    });
  });

  describe("classifyBatch() + mergeTargets()", () => {
    it("classifies multiple paths independently", () => {
      const results = engine.classifyBatch([
        "src/engines/AEngine.ts",
        "src/tools/dispatchers/bDispatcher.ts",
      ]);
      expect(results).toHaveLength(2);
      expect(results[0].matchedRules).toContain("engine-write");
      expect(results[1].matchedRules).toContain("dispatcher-write");
    });

    it("mergeTargets returns a deduped union across the batch", () => {
      const results = engine.classifyBatch([
        "src/engines/AEngine.ts",
        "src/engines/BEngine.ts",
      ]);
      const merged = engine.mergeTargets(results);
      const keys = merged.map((t) => `${t.surface}:${t.action}`);
      expect(new Set(keys).size).toBe(keys.length);
      expect(merged.map((t) => t.surface)).toContain("engine-digest");
    });

    it("mergeTargets is empty when no results match any rule", () => {
      const results = engine.classifyBatch(["random/unrelated.txt"]);
      expect(engine.mergeTargets(results)).toEqual([]);
    });
  });

  describe("module singleton + custom rules", () => {
    it("exposes a ready-to-use instance", () => {
      const r = docPropagationEngine.classify("src/engines/ZEngine.ts");
      expect(r.matchedRules.length).toBeGreaterThan(0);
    });

    it("accepts a custom rule set", () => {
      const custom = new DocPropagationEngine([
        {
          id: "catch-all",
          match: () => true,
          reason: "catch",
          targets: [{ surface: "master-index", action: "full-regen" }],
        },
      ]);
      const r = custom.classify("whatever.txt");
      expect(r.matchedRules).toEqual(["catch-all"]);
      expect(r.targets[0].surface).toBe("master-index");
    });

    it("getRules returns the configured rule set", () => {
      expect(engine.getRules().length).toBeGreaterThan(0);
    });
  });
});
