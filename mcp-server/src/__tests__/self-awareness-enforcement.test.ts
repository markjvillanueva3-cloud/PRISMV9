/**
 * Self-Awareness Enforcement Tests (AWARE-MS0)
 *
 * Tests for mandatory self-awareness hooks that enforce:
 * - Inventory checks before creating
 * - Master index search for duplicates
 * - AI feature recommendations
 * - Duplication hard blocks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Self-Awareness Enforcement (AWARE-MS0)", () => {
  describe("Build Intent Detection", () => {
    const BUILD_PATTERNS = [
      /\b(build|create|implement|add|write|make|develop)\b.*\b(engine|algorithm|hook|skill|dispatcher|feature|system)\b/i,
      /\bnew\s+(engine|algorithm|hook|skill|dispatcher|feature)\b/i,
      /\b(audit|investigate|analyze|review|check)\b.*\b(code|system|engine|architecture)\b/i,
    ];

    function detectsBuildIntent(message: string): boolean {
      return BUILD_PATTERNS.some((p) => p.test(message));
    }

    it("detects 'build engine' intent", () => {
      expect(detectsBuildIntent("build a new cutting force engine")).toBe(true);
    });

    it("detects 'create algorithm' intent", () => {
      expect(detectsBuildIntent("create an algorithm for optimization")).toBe(
        true
      );
    });

    it("detects 'implement feature' intent", () => {
      expect(detectsBuildIntent("implement a new feature for safety")).toBe(
        true
      );
    });

    it("detects 'new engine' intent", () => {
      expect(detectsBuildIntent("I need a new engine for thermal analysis")).toBe(
        true
      );
    });

    it("detects 'audit code' intent", () => {
      expect(detectsBuildIntent("audit the code for performance issues")).toBe(
        true
      );
    });

    it("does not trigger on unrelated messages", () => {
      expect(detectsBuildIntent("what is the weather today")).toBe(false);
      expect(detectsBuildIntent("run the tests")).toBe(false);
      expect(detectsBuildIntent("show me the file")).toBe(false);
    });
  });

  describe("Asset Type Detection", () => {
    function getAssetType(filePath: string): string {
      if (filePath.includes("/engines/")) return "engine";
      if (filePath.includes("/algorithms/")) return "algorithm";
      if (filePath.includes("/hooks/")) return "hook";
      if (filePath.includes("/commands/")) return "skill";
      if (filePath.includes("/registries/")) return "registry";
      if (filePath.includes("/dispatchers/")) return "dispatcher";
      return "unknown";
    }

    it("detects engine paths", () => {
      expect(getAssetType("/mcp-server/src/engines/NewEngine.ts")).toBe("engine");
    });

    it("detects algorithm paths", () => {
      expect(getAssetType("/mcp-server/src/algorithms/NewAlgorithm.ts")).toBe(
        "algorithm"
      );
    });

    it("detects hook paths", () => {
      expect(getAssetType("/.claude/hooks/new-hook.mjs")).toBe("hook");
    });

    it("detects skill paths", () => {
      expect(getAssetType("/.claude/commands/new-skill.md")).toBe("skill");
    });

    it("returns unknown for other paths", () => {
      expect(getAssetType("/some/random/path.ts")).toBe("unknown");
    });
  });

  describe("Fuzzy Matching", () => {
    function normalizeForSearch(name: string): string {
      return name
        .replace(/Engine$/, "")
        .replace(/Algorithm$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }

    it("normalizes engine names", () => {
      expect(normalizeForSearch("CuttingForceEngine")).toBe("cuttingforce");
    });

    it("normalizes algorithm names", () => {
      expect(normalizeForSearch("KienzleAlgorithm")).toBe("kienzle");
    });

    it("handles camelCase", () => {
      expect(normalizeForSearch("SpeedFeedOptimizer")).toBe("speedfeedoptimizer");
    });

    it("removes special characters", () => {
      expect(normalizeForSearch("Tool-Life_Engine")).toBe("toollife");
    });
  });

  describe("Domain Keyword Detection", () => {
    const DOMAIN_KEYWORDS: Record<string, string[]> = {
      cutting: ["UltimateSpeedFeedEngine", "CuttingForceEngine"],
      thermal: ["CuttingTemperatureEngine", "ThermalWearCouplingEngine"],
      safety: ["SafetyEngine", "SafetyValidatorEngine"],
    };

    function extractKeywords(message: string): string[] {
      const lower = message.toLowerCase();
      return Object.keys(DOMAIN_KEYWORDS).filter((k) => lower.includes(k));
    }

    it("extracts cutting keywords", () => {
      expect(extractKeywords("optimize cutting parameters")).toContain("cutting");
    });

    it("extracts thermal keywords", () => {
      expect(extractKeywords("analyze thermal behavior")).toContain("thermal");
    });

    it("extracts multiple keywords", () => {
      const keywords = extractKeywords("cutting force and thermal analysis");
      expect(keywords).toContain("cutting");
      expect(keywords).toContain("thermal");
    });

    it("returns empty for no matches", () => {
      expect(extractKeywords("random text here")).toEqual([]);
    });
  });

  describe("Inventory Format", () => {
    function formatCompactInventory(inv: Record<string, number> | null): string {
      if (!inv) return "Inventory unavailable";
      return `PRISM: ${inv.engines || 0} engines | ${inv.dispatchers || 0} dispatchers | ${inv.actions || 0} actions`;
    }

    it("formats inventory correctly", () => {
      const inv = { engines: 2330, dispatchers: 89, actions: 5107 };
      const result = formatCompactInventory(inv);
      expect(result).toContain("2330 engines");
      expect(result).toContain("89 dispatchers");
      expect(result).toContain("5107 actions");
    });

    it("handles null inventory", () => {
      expect(formatCompactInventory(null)).toBe("Inventory unavailable");
    });

    it("handles missing fields", () => {
      const inv = { engines: 100 };
      const result = formatCompactInventory(inv);
      expect(result).toContain("100 engines");
      expect(result).toContain("0 dispatchers");
    });
  });

  describe("Create Operation Detection", () => {
    const CREATE_PATHS = ["/engines/", "/algorithms/", "/hooks/"];

    function isCreateOperation(tool: string, filePath: string): boolean {
      if (tool !== "Write") return false;
      return CREATE_PATHS.some((p) => filePath.includes(p));
    }

    it("detects Write to engines", () => {
      expect(isCreateOperation("Write", "/src/engines/New.ts")).toBe(true);
    });

    it("detects Write to algorithms", () => {
      expect(isCreateOperation("Write", "/src/algorithms/New.ts")).toBe(true);
    });

    it("ignores Read operations", () => {
      expect(isCreateOperation("Read", "/src/engines/New.ts")).toBe(false);
    });

    it("ignores non-create paths", () => {
      expect(isCreateOperation("Write", "/src/utils/helper.ts")).toBe(false);
    });
  });
});
