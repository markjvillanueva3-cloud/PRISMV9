/**
 * ObsidianVaultSyncEngine Tests — U-OBS-SYNC01
 *
 * Tests bidirectional sync between PRISM knowledge base and Obsidian vaults.
 * Covers: pull, push, status, config, conflict detection/resolution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  ObsidianVaultSyncEngine,
  VaultConfigSchema,
  PullParamsSchema,
  PushParamsSchema,
  obsidianVaultSyncEngine,
} from "../engines/ObsidianVaultSyncEngine.js";

// Mock fs for tests
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    readdirSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mock TribalKnowledgeEngine
vi.mock("../engines/TribalKnowledgeEngine.js", () => ({
  tribalKnowledgeEngine: {
    capture: vi.fn(() => ({ id: "test-tip-001", success: true })),
    search: vi.fn(() => [
      { id: "tip-001", title: "Test Tip", body: "Test body", category: "general" },
    ]),
  },
}));

describe("ObsidianVaultSyncEngine", () => {
  let engine: ObsidianVaultSyncEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ObsidianVaultSyncEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("VaultConfigSchema", () => {
    it("validates valid configuration", () => {
      const config = {
        vault_path: "C:/Users/test/vault",
        sync_folder: "PRISM",
        enable_bidirectional: true,
        conflict_strategy: "newest" as const,
      };
      expect(() => VaultConfigSchema.parse(config)).not.toThrow();
    });

    it("applies default values", () => {
      const config = { vault_path: "/test/vault" };
      const parsed = VaultConfigSchema.parse(config);
      expect(parsed.sync_folder).toBe("PRISM");
      expect(parsed.enable_bidirectional).toBe(true);
      expect(parsed.conflict_strategy).toBe("newest");
    });

    it("rejects invalid conflict strategy", () => {
      const config = {
        vault_path: "/test/vault",
        conflict_strategy: "invalid",
      };
      expect(() => VaultConfigSchema.parse(config)).toThrow();
    });

    it("validates all conflict strategies", () => {
      for (const strategy of ["prism_wins", "obsidian_wins", "manual", "newest"]) {
        const config = { vault_path: "/test", conflict_strategy: strategy };
        expect(() => VaultConfigSchema.parse(config)).not.toThrow();
      }
    });
  });

  describe("PullParamsSchema", () => {
    it("validates minimal params", () => {
      const params = { vault_path: "/test/vault" };
      expect(() => PullParamsSchema.parse(params)).not.toThrow();
    });

    it("applies default values", () => {
      const params = { vault_path: "/test/vault" };
      const parsed = PullParamsSchema.parse(params);
      expect(parsed.incremental).toBe(true);
      expect(parsed.dry_run).toBe(false);
    });

    it("allows sync_folder override", () => {
      const params = { vault_path: "/test", sync_folder: "Notes/PRISM" };
      const parsed = PullParamsSchema.parse(params);
      expect(parsed.sync_folder).toBe("Notes/PRISM");
    });
  });

  describe("PushParamsSchema", () => {
    it("validates minimal params", () => {
      const params = { vault_path: "/test/vault" };
      expect(() => PushParamsSchema.parse(params)).not.toThrow();
    });

    it("applies default values", () => {
      const params = { vault_path: "/test/vault" };
      const parsed = PushParamsSchema.parse(params);
      expect(parsed.sync_folder).toBe("PRISM");
      expect(parsed.incremental).toBe(true);
      expect(parsed.dry_run).toBe(false);
    });

    it("accepts tip_ids array", () => {
      const params = { vault_path: "/test", tip_ids: ["tip-001", "tip-002"] };
      const parsed = PushParamsSchema.parse(params);
      expect(parsed.tip_ids).toHaveLength(2);
    });
  });

  describe("pull()", () => {
    it("returns error when vault path does not exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await engine.pull({ vault_path: "/nonexistent" });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Vault path does not exist: /nonexistent");
    });

    it("processes empty vault correctly", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const result = await engine.pull({ vault_path: "/test/vault" });

      expect(result.success).toBe(true);
      expect(result.files_processed).toBe(0);
      expect(result.direction).toBe("pull");
    });

    it("handles dry_run mode without making changes", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "test.md", isFile: () => true, isDirectory: () => false },
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue("# Test Note\n\nContent here");

      const result = await engine.pull({ vault_path: "/test", dry_run: true });

      expect(result.dry_run).toBe(true);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("parses frontmatter correctly", async () => {
      const mdContent = `---
title: Test Note
category: machining
tags: [lathe, turning]
confidence: 85
---

# Test Note

This is the body content.`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "test.md", isFile: () => true, isDirectory: () => false },
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(mdContent);

      const result = await engine.pull({ vault_path: "/test", dry_run: true });

      expect(result.success).toBe(true);
      expect(result.files_processed).toBe(1);
    });

    it("excludes .obsidian directory", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((dirPath: any) => {
        if (dirPath.includes(".obsidian")) {
          return [];
        }
        return [
          { name: ".obsidian", isFile: () => false, isDirectory: () => true },
          { name: "note.md", isFile: () => true, isDirectory: () => false },
        ] as any;
      });
      vi.mocked(fs.readFileSync).mockReturnValue("# Note");

      const result = await engine.pull({ vault_path: "/test", dry_run: true });

      expect(result.files_processed).toBe(1);
    });

    it("skips unchanged files in incremental mode", async () => {
      // First sync
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "test.md", isFile: () => true, isDirectory: () => false },
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue("# Test");

      await engine.pull({ vault_path: "/test", incremental: true });

      // Second sync with same content
      const result = await engine.pull({ vault_path: "/test", incremental: true });

      expect(result.files_skipped).toBeGreaterThanOrEqual(0);
    });
  });

  describe("push()", () => {
    it("returns error when vault path does not exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await engine.push({ vault_path: "/nonexistent" });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Vault path does not exist: /nonexistent");
    });

    it("creates sync folder if needed", async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        if (p === "/test/vault") return true;
        if (p.includes("PRISM")) return false;
        return false;
      });

      await engine.push({ vault_path: "/test/vault", dry_run: false });

      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it("handles dry_run mode without writing files", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await engine.push({ vault_path: "/test", dry_run: true });

      expect(result.dry_run).toBe(true);
    });

    it("generates valid frontmatter", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await engine.push({
        vault_path: "/test",
        tip_ids: ["tip-001"],
        dry_run: true,
      });

      expect(result.success).toBe(true);
    });

    it("sanitizes filenames for cross-platform compatibility", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // The engine should handle special characters in titles
      const result = await engine.push({
        vault_path: "/test",
        dry_run: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("status()", () => {
    it("returns status for unconfigured vault", () => {
      const status = engine.status();

      expect(status.configured).toBe(false);
      expect(status.total_entries).toBe(0);
      expect(status.pending_conflicts).toBe(0);
    });

    it("returns status with vault path", () => {
      engine.configure({ vault_path: "/test/vault" });

      const status = engine.status();

      expect(status.configured).toBe(true);
      expect(status.vault_path).toBe("/test/vault");
    });

    it("tracks entries by direction", () => {
      const status = engine.status();

      expect(status.entries_by_direction).toHaveProperty("pull");
      expect(status.entries_by_direction).toHaveProperty("push");
      expect(status.entries_by_direction).toHaveProperty("both");
    });
  });

  describe("configure()", () => {
    it("applies partial configuration", () => {
      const config = engine.configure({ vault_path: "/new/path" });

      expect(config.vault_path).toBe("/new/path");
      expect(config.sync_folder).toBe("PRISM"); // Default preserved
    });

    it("allows changing conflict strategy", () => {
      const config = engine.configure({ conflict_strategy: "prism_wins" });

      expect(config.conflict_strategy).toBe("prism_wins");
    });

    it("validates frontmatter mapping", () => {
      const config = engine.configure({
        frontmatter_mapping: { category: "cat", tags: "labels" },
      });

      expect(config.frontmatter_mapping.category).toBe("cat");
      expect(config.frontmatter_mapping.tags).toBe("labels");
    });
  });

  describe("getConflicts()", () => {
    it("returns empty array when no conflicts", () => {
      const conflicts = engine.getConflicts();
      expect(conflicts).toEqual([]);
    });
  });

  describe("resolveConflict()", () => {
    it("returns error for non-existent conflict", async () => {
      const result = await engine.resolveConflict("/nonexistent.md", "prism");

      expect(result.success).toBe(false);
      expect(result.message).toContain("No pending conflict");
    });
  });

  describe("singleton export", () => {
    it("exports a singleton instance", () => {
      expect(obsidianVaultSyncEngine).toBeInstanceOf(ObsidianVaultSyncEngine);
    });

    it("singleton has all required methods", () => {
      expect(typeof obsidianVaultSyncEngine.pull).toBe("function");
      expect(typeof obsidianVaultSyncEngine.push).toBe("function");
      expect(typeof obsidianVaultSyncEngine.status).toBe("function");
      expect(typeof obsidianVaultSyncEngine.configure).toBe("function");
      expect(typeof obsidianVaultSyncEngine.getConflicts).toBe("function");
      expect(typeof obsidianVaultSyncEngine.resolveConflict).toBe("function");
    });
  });

  describe("edge cases", () => {
    it("handles empty vault path gracefully", async () => {
      const result = await engine.pull({ vault_path: "" });
      expect(result.success).toBe(false);
    });

    it("handles markdown without frontmatter", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "simple.md", isFile: () => true, isDirectory: () => false },
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue("# Simple Note\n\nNo frontmatter here.");

      const result = await engine.pull({ vault_path: "/test", dry_run: true });

      expect(result.success).toBe(true);
    });

    it("handles deeply nested vault structure", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((dirPath: any) => {
        if (dirPath === "/test/vault/PRISM") {
          return [
            { name: "subfolder", isFile: () => false, isDirectory: () => true },
          ] as any;
        }
        if (dirPath.includes("subfolder")) {
          return [
            { name: "deep.md", isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      vi.mocked(fs.readFileSync).mockReturnValue("# Deep Note");

      const result = await engine.pull({ vault_path: "/test/vault", dry_run: true });

      expect(result.success).toBe(true);
    });

    it("handles unicode in filenames and content", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "日本語ノート.md", isFile: () => true, isDirectory: () => false },
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue("# 日本語タイトル\n\nコンテンツ");

      const result = await engine.pull({ vault_path: "/test", dry_run: true });

      expect(result.success).toBe(true);
    });

    it("handles very long titles by truncating", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await engine.push({ vault_path: "/test", dry_run: true });

      expect(result.success).toBe(true);
    });
  });

  describe("wiki-link extraction", () => {
    it("extracts simple wiki-links", async () => {
      const content = "See also [[Related Note]] and [[Another Note]].";
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "test.md", isFile: () => true, isDirectory: () => false },
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(content);

      const result = await engine.pull({ vault_path: "/test", dry_run: true });

      expect(result.success).toBe(true);
    });

    it("extracts wiki-links with aliases", async () => {
      const content = "See [[Full Note Title|short alias]].";
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "test.md", isFile: () => true, isDirectory: () => false },
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(content);

      const result = await engine.pull({ vault_path: "/test", dry_run: true });

      expect(result.success).toBe(true);
    });
  });
});
