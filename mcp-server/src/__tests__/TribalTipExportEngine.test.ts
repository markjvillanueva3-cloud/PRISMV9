/**
 * TribalTipExportEngine Tests — U-OBS-TRIBAL03
 *
 * Tests tribal tip export to Obsidian markdown: single export, bulk export,
 * configuration, frontmatter generation, wiki-links, and incremental updates.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  TribalTipExportEngine,
  tribalTipExportEngine,
} from "../engines/TribalTipExportEngine.js";

// Mock fs to prevent disk I/O pollution between tests
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => "{}"),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mock safeWriteSync
vi.mock("../utils/atomicWrite.js", () => ({
  safeWriteSync: vi.fn(),
}));

// Mock TribalKnowledgeEngine
vi.mock("../engines/TribalKnowledgeEngine.js", () => ({
  tribalKnowledgeEngine: {
    search: vi.fn(() => [
      {
        id: "tip-001",
        title: "Use climb milling for better finish",
        body: "Climb milling produces better surface finish on aluminum because the chip is thickest at entry.",
        category: "machining",
        tags: ["milling", "aluminum", "surface-finish"],
        material_groups: ["aluminum", "non-ferrous"],
        operation_types: ["face-milling", "peripheral-milling"],
        machine_ids: ["haas-vf2"],
        confidence: 85,
        source: "operator:Mike",
        created_at: "2026-01-15",
        usage_count: 42,
      },
      {
        id: "tip-002",
        title: "Reduce feed rate at corners",
        body: "Reduce feed rate by 30% at inside corners to prevent tool breakage and chatter.",
        category: "machining",
        tags: ["milling", "feeds", "corners"],
        material_groups: ["steel"],
        operation_types: ["pocket-milling"],
        machine_ids: [],
        confidence: 90,
        source: "expert:Tom",
        created_at: "2026-02-01",
        usage_count: 28,
      },
      {
        id: "tip-003",
        title: "Check coolant concentration weekly",
        body: "Coolant should be 6-8% concentration. Use refractometer to verify. Too weak causes rust, too strong causes dermatitis.",
        category: "maintenance",
        tags: ["coolant", "maintenance", "safety"],
        material_groups: [],
        operation_types: [],
        machine_ids: [],
        confidence: 95,
        source: "shop_floor",
        created_at: "2026-01-20",
        usage_count: 15,
      },
      {
        id: "tip-004",
        title: "Aluminum needs sharp tools",
        body: "Always use sharp tools for aluminum. Dull tools cause built-up edge and poor finish.",
        category: "tooling",
        tags: ["aluminum", "tooling", "surface-finish"],
        material_groups: ["aluminum"],
        operation_types: ["milling", "turning"],
        machine_ids: [],
        confidence: 88,
        source: "operator:John",
        created_at: "2026-03-01",
        usage_count: 33,
      },
    ]),
  },
  KnowledgeTip: {},
  KnowledgeCategory: {},
}));

describe("TribalTipExportEngine", () => {
  let engine: TribalTipExportEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new TribalTipExportEngine();
    engine.resetState();
  });

  describe("exportSingle", () => {
    it("exports single tip returning markdown with YAML frontmatter", () => {
      const result = engine.exportSingle({ tip_id: "tip-001" });

      expect(result.success).toBe(true);
      expect(result.tip_id).toBe("tip-001");
      expect(result.markdown).toContain("---");
      expect(result.markdown).toContain("# Use climb milling for better finish");
      expect(result.markdown).toContain("Climb milling produces better surface finish");
    });

    it("generates frontmatter with id title category and tags fields", () => {
      const result = engine.exportSingle({ tip_id: "tip-001" });

      expect(result.frontmatter.id).toBe("tip-001");
      expect(result.frontmatter.title).toBe("Use climb milling for better finish");
      expect(result.frontmatter.category).toBe("machining");
      expect(Array.isArray(result.frontmatter.tags)).toBe(true);
    });

    it("generates aliases array for wiki-link resolution", () => {
      const result = engine.exportSingle({ tip_id: "tip-001" });

      expect(Array.isArray(result.frontmatter.aliases)).toBe(true);
      expect(result.frontmatter.aliases).toContain("tip-001");
    });

    it("includes related tips section with wiki-links when related tips exist", () => {
      const result = engine.exportSingle({ tip_id: "tip-001" });

      // tip-001 and tip-004 share aluminum tag
      expect(result.wiki_links.length).toBeGreaterThan(0);
      expect(result.markdown).toContain("## Related Tips");
    });

    it("generates output path with category folder when category_folders enabled", () => {
      engine.configure({ category_folders: true });
      const result = engine.exportSingle({ tip_id: "tip-001" });

      expect(result.output_path).toContain("machining");
      expect(result.output_path).toMatch(/\.md$/);
    });

    it("computes SHA-256 checksum for change detection", () => {
      const result = engine.exportSingle({ tip_id: "tip-001" });

      expect(result.checksum).toMatch(/^[a-f0-9]{16}$/);
    });

    it("returns failure result for non-existent tip ID", () => {
      const result = engine.exportSingle({ tip_id: "nonexistent-tip" });

      expect(result.success).toBe(false);
      expect(result.markdown).toBe("");
    });

    it("applies tag prefix from configuration", () => {
      engine.configure({ tag_prefix: "#tribal/" });
      const result = engine.exportSingle({ tip_id: "tip-001" });

      expect(result.tags.some(t => t.startsWith("#tribal/"))).toBe(true);
    });

    it("respects custom output path when provided", () => {
      const result = engine.exportSingle({
        tip_id: "tip-001",
        output_path: "custom/path/my-tip.md",
      });

      expect(result.output_path).toBe("custom/path/my-tip.md");
    });
  });

  describe("exportBulk", () => {
    it("exports all tips when no filters provided returning count stats", () => {
      const result = engine.exportBulk({ output_dir: "/tmp/obsidian-test" });

      expect(result.total_tips).toBe(4);
      expect(result.exported_count).toBeGreaterThanOrEqual(0);
      expect(typeof result.skipped_count).toBe("number");
      expect(typeof result.failed_count).toBe("number");
    });

    it("filters tips by category returning only matching tips", () => {
      const result = engine.exportBulk({
        output_dir: "/tmp/obsidian-test",
        category: "maintenance",
      });

      expect(result.total_tips).toBe(1);
    });

    it("filters tips by tags using AND logic", () => {
      const result = engine.exportBulk({
        output_dir: "/tmp/obsidian-test",
        tags: ["milling", "aluminum"],
      });

      // Only tip-001 has both tags
      expect(result.total_tips).toBe(1);
    });

    it("filters tips by material groups", () => {
      const result = engine.exportBulk({
        output_dir: "/tmp/obsidian-test",
        material_groups: ["aluminum"],
      });

      // tip-001 and tip-004 have aluminum
      expect(result.total_tips).toBe(2);
    });

    it("generates index MOC file when include_index is true", () => {
      const result = engine.exportBulk({
        output_dir: "/tmp/obsidian-test",
        include_index: true,
      });

      // Index path should be set if export succeeded
      if (result.exported_count > 0) {
        expect(result.index_path).toContain("PRISM-Tribal-Knowledge-Index.md");
      }
    });

    it("skips unchanged tips in incremental mode", () => {
      // First export
      engine.exportBulk({
        output_dir: "/tmp/obsidian-test",
        incremental: false,
      });

      // Second export with incremental
      const result = engine.exportBulk({
        output_dir: "/tmp/obsidian-test",
        incremental: true,
      });

      // All should be skipped since nothing changed
      expect(result.skipped_count).toBe(4);
      expect(result.exported_count).toBe(0);
    });
  });

  describe("configure", () => {
    it("updates tag_prefix configuration", () => {
      const config = engine.configure({ tag_prefix: "#shop/" });

      expect(config.tag_prefix).toBe("#shop/");
    });

    it("updates link_style to markdown format", () => {
      const config = engine.configure({ link_style: "markdown" });

      expect(config.link_style).toBe("markdown");
    });

    it("updates category_folders setting", () => {
      const config = engine.configure({ category_folders: false });

      expect(config.category_folders).toBe(false);
    });

    it("merges custom_tag_mappings with existing mappings", () => {
      engine.configure({ custom_tag_mappings: { old: "#legacy/old" } });
      const config = engine.configure({ custom_tag_mappings: { new: "#latest/new" } });

      expect(config.custom_tag_mappings.old).toBe("#legacy/old");
      expect(config.custom_tag_mappings.new).toBe("#latest/new");
    });

    it("updates frontmatter_fields list", () => {
      const config = engine.configure({
        frontmatter_fields: ["id", "title", "confidence"],
      });

      expect(config.frontmatter_fields).toEqual(["id", "title", "confidence"]);
    });
  });

  describe("status", () => {
    it("returns configuration and state objects", () => {
      const status = engine.status();

      expect(typeof status.configured).toBe("boolean");
      expect(typeof status.config).toBe("object");
      expect(typeof status.state).toBe("object");
    });

    it("includes available_templates array with standard templates", () => {
      const status = engine.status();

      expect(Array.isArray(status.available_templates)).toBe(true);
      expect(status.available_templates).toContain("standard");
      expect(status.available_templates).toContain("minimal");
      expect(status.available_templates).toContain("detailed");
    });

    it("tracks total_exported count in state", () => {
      engine.exportSingle({ tip_id: "tip-001" });
      engine.exportSingle({ tip_id: "tip-002" });

      const status = engine.status();
      expect(status.state.total_exported).toBe(2);
    });

    it("records last_export timestamp after export", () => {
      engine.exportSingle({ tip_id: "tip-001" });

      const status = engine.status();
      expect(status.state.last_export).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("wiki-link generation", () => {
    it("generates wiki-style links by default", () => {
      engine.configure({ link_style: "wiki" });
      const result = engine.exportSingle({ tip_id: "tip-001" });

      // Should contain [[filename|title]] style links
      if (result.wiki_links.length > 0) {
        expect(result.wiki_links[0]).toMatch(/^\[\[.+\|.+\]\]$/);
      }
    });

    it("generates markdown-style links when configured", () => {
      engine.configure({ link_style: "markdown" });
      const result = engine.exportSingle({ tip_id: "tip-001" });

      // Should contain [title](filename.md) style links
      if (result.wiki_links.length > 0) {
        expect(result.wiki_links[0]).toMatch(/^\[.+\]\(.+\.md\)$/);
      }
    });
  });

  describe("resetState", () => {
    it("clears exported_tips and resets counters", () => {
      engine.exportSingle({ tip_id: "tip-001" });
      engine.resetState();

      const status = engine.status();
      expect(status.state.total_exported).toBe(0);
      expect(Object.keys(status.state.exported_tips)).toHaveLength(0);
    });
  });
});
