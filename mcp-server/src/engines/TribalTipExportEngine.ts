/**
 * TribalTipExportEngine — U-OBS-TRIBAL03
 *
 * Exports PRISM tribal tips to Obsidian-compatible markdown with proper
 * wiki-links, frontmatter, and tag structure. Maintains bidirectional link
 * integrity. Supports bulk export and incremental updates.
 *
 * Actions: tribal_export_single, tribal_export_bulk, tribal_export_config, tribal_export_status
 */

import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { z } from "zod";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { log } from "../utils/Logger.js";
import { tribalKnowledgeEngine, KnowledgeTip, KnowledgeCategory } from "./TribalKnowledgeEngine.js";

// ============================================================================
// SCHEMAS
// ============================================================================

/** Single tip export parameters */
export const ExportSingleSchema = z.object({
  tip_id: z.string().describe("Tribal tip ID to export"),
  output_path: z.string().optional().describe("Output file path (default: auto-generated)"),
  include_backlinks: z.boolean().optional().default(true).describe("Include backlinks section"),
  template: z.string().optional().describe("Template name to use"),
});

export type ExportSingleParams = z.input<typeof ExportSingleSchema>;

/** Bulk export parameters */
export const ExportBulkSchema = z.object({
  category: z.string().optional().describe("Filter by category"),
  tags: z.array(z.string()).optional().describe("Filter by tags (AND logic)"),
  material_groups: z.array(z.string()).optional().describe("Filter by material groups"),
  output_dir: z.string().describe("Output directory for exported files"),
  include_index: z.boolean().optional().default(true).describe("Generate index MOC file"),
  incremental: z.boolean().optional().default(false).describe("Only export changed tips"),
});

export type ExportBulkParams = z.input<typeof ExportBulkSchema>;

/** Export configuration parameters */
export const ExportConfigSchema = z.object({
  default_template: z.string().optional().describe("Default template name"),
  tag_prefix: z.string().optional().default("#prism/").describe("Prefix for exported tags"),
  category_folders: z.boolean().optional().default(true).describe("Organize by category folders"),
  link_style: z.enum(["wiki", "markdown"]).optional().default("wiki").describe("Link syntax style"),
  frontmatter_fields: z.array(z.string()).optional().describe("Fields to include in frontmatter"),
  custom_tag_mappings: z.record(z.string(), z.string()).optional().describe("Map PRISM tags to Obsidian tags"),
});

export type ExportConfigParams = z.input<typeof ExportConfigSchema>;

// ============================================================================
// TYPES
// ============================================================================

/** Export configuration */
interface ExportConfig {
  default_template: string;
  tag_prefix: string;
  category_folders: boolean;
  link_style: "wiki" | "markdown";
  frontmatter_fields: string[];
  custom_tag_mappings: Record<string, string>;
}

/** Export state for incremental updates */
interface ExportState {
  last_export: string;
  exported_tips: Record<string, {
    checksum: string;
    output_path: string;
    exported_at: string;
  }>;
  total_exported: number;
}

/** Single export result */
interface ExportSingleResult {
  success: boolean;
  tip_id: string;
  output_path: string;
  markdown: string;
  frontmatter: Record<string, unknown>;
  wiki_links: string[];
  tags: string[];
  checksum: string;
}

/** Bulk export result */
interface ExportBulkResult {
  success: boolean;
  total_tips: number;
  exported_count: number;
  skipped_count: number;
  failed_count: number;
  output_dir: string;
  index_path?: string;
  exported_files: string[];
  errors: Array<{ tip_id: string; error: string }>;
}

/** Export status */
interface ExportStatus {
  configured: boolean;
  config: ExportConfig;
  state: ExportState;
  available_templates: string[];
}

// ============================================================================
// TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: Record<string, string> = {
  standard: `---
{{frontmatter}}
---

# {{title}}

{{body}}

{{#if related_tips}}
## Related Tips
{{#each related_tips}}
- {{wiki_link}}
{{/each}}
{{/if}}

{{#if backlinks}}
## Backlinks
{{#each backlinks}}
- {{wiki_link}}
{{/each}}
{{/if}}

---
*Source: {{source}} | Confidence: {{confidence}}%*
`,
  minimal: `---
{{frontmatter}}
---

# {{title}}

{{body}}
`,
  detailed: `---
{{frontmatter}}
---

# {{title}}

> **Category:** {{category}} | **Confidence:** {{confidence}}%

## Tip Content

{{body}}

## Context

{{#if material_groups}}
**Materials:** {{#each material_groups}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{#if operation_types}}
**Operations:** {{#each operation_types}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{#if machine_ids}}
**Machines:** {{#each machine_ids}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

## Related Knowledge
{{#if related_tips}}
{{#each related_tips}}
- {{wiki_link}}
{{/each}}
{{else}}
*No related tips found.*
{{/if}}

---
*Created: {{created_at}} | Source: {{source}} | Usage: {{usage_count}}x*
`,
};

// ============================================================================
// STATE PATHS
// ============================================================================

const STATE_DIR = path.resolve(process.cwd(), "data/state");
const CONFIG_PATH = path.join(STATE_DIR, "TRIBAL_EXPORT_CONFIG.json");
const STATE_PATH = path.join(STATE_DIR, "TRIBAL_EXPORT_STATE.json");

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TribalTipExportEngine {
  private config: ExportConfig;
  private state: ExportState;
  private templates: Record<string, string>;

  constructor() {
    this.templates = { ...DEFAULT_TEMPLATES };
    this.config = this.loadConfig();
    this.state = this.loadState();
    log.info("[TribalTipExportEngine] Initialized");
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  private loadConfig(): ExportConfig {
    const defaults: ExportConfig = {
      default_template: "standard",
      tag_prefix: "#prism/",
      category_folders: true,
      link_style: "wiki",
      frontmatter_fields: ["id", "title", "category", "tags", "confidence", "source", "created_at"],
      custom_tag_mappings: {},
    };

    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        return { ...defaults, ...data };
      }
    } catch (err) {
      log.warn(`[TribalTipExportEngine] Failed to load config: ${err}`);
    }
    return defaults;
  }

  private loadState(): ExportState {
    const defaults: ExportState = {
      last_export: "",
      exported_tips: {},
      total_exported: 0,
    };

    try {
      if (fs.existsSync(STATE_PATH)) {
        const data = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
        return { ...defaults, ...data };
      }
    } catch (err) {
      log.warn(`[TribalTipExportEngine] Failed to load state: ${err}`);
    }
    return defaults;
  }

  private saveConfig(): void {
    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }
      safeWriteSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    } catch (err) {
      log.error(`[TribalTipExportEngine] Failed to save config: ${err}`);
    }
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }
      safeWriteSync(STATE_PATH, JSON.stringify(this.state, null, 2));
    } catch (err) {
      log.error(`[TribalTipExportEngine] Failed to save state: ${err}`);
    }
  }

  // ==========================================================================
  // MARKDOWN GENERATION
  // ==========================================================================

  /**
   * Generate YAML frontmatter for a tribal tip
   */
  private generateFrontmatter(tip: KnowledgeTip): Record<string, unknown> {
    const fm: Record<string, unknown> = {};

    for (const field of this.config.frontmatter_fields) {
      const value = (tip as unknown as Record<string, unknown>)[field];
      if (value !== undefined && value !== null) {
        if (field === "tags") {
          // Convert tags with prefix
          fm.tags = (tip.tags || []).map(t => this.mapTag(t));
        } else {
          fm[field] = value;
        }
      }
    }

    // Always include aliases for wiki-link resolution
    fm.aliases = [tip.id, this.slugify(tip.title)];

    return fm;
  }

  /**
   * Map a PRISM tag to Obsidian format
   */
  private mapTag(tag: string): string {
    // Check custom mappings first
    if (this.config.custom_tag_mappings[tag]) {
      return this.config.custom_tag_mappings[tag];
    }
    // Apply prefix and normalize
    return `${this.config.tag_prefix}${tag.toLowerCase().replace(/\s+/g, "-")}`;
  }

  /**
   * Generate wiki-link for a tip
   */
  private generateWikiLink(tip: KnowledgeTip): string {
    const filename = this.generateFilename(tip);
    if (this.config.link_style === "wiki") {
      return `[[${filename}|${tip.title}]]`;
    }
    return `[${tip.title}](${encodeURIComponent(filename)}.md)`;
  }

  /**
   * Generate filename from tip
   */
  private generateFilename(tip: KnowledgeTip): string {
    return this.slugify(tip.title);
  }

  /**
   * Slugify a string for filenames
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 100);
  }

  /**
   * Find related tips based on shared tags, category, materials
   */
  private findRelatedTips(tip: KnowledgeTip, allTips: KnowledgeTip[]): KnowledgeTip[] {
    const related: Array<{ tip: KnowledgeTip; score: number }> = [];

    for (const other of allTips) {
      if (other.id === tip.id) continue;

      let score = 0;

      // Same category = +2
      if (other.category === tip.category) score += 2;

      // Shared tags = +1 each
      const sharedTags = (tip.tags || []).filter(t => (other.tags || []).includes(t));
      score += sharedTags.length;

      // Shared material groups = +1 each
      const sharedMaterials = (tip.material_groups || []).filter(m =>
        (other.material_groups || []).includes(m)
      );
      score += sharedMaterials.length;

      // Shared operation types = +1 each
      const sharedOps = (tip.operation_types || []).filter(o =>
        (other.operation_types || []).includes(o)
      );
      score += sharedOps.length;

      if (score > 0) {
        related.push({ tip: other, score });
      }
    }

    // Sort by score descending, take top 5
    return related
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => r.tip);
  }

  /**
   * Render frontmatter as YAML string
   */
  private renderFrontmatter(fm: Record<string, unknown>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(fm)) {
      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${JSON.stringify(item)}`);
        }
      } else if (typeof value === "object" && value !== null) {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      } else if (typeof value === "string") {
        // Quote strings with special chars
        if (value.includes(":") || value.includes("#") || value.includes("'")) {
          lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
        } else {
          lines.push(`${key}: ${value}`);
        }
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    return lines.join("\n");
  }

  /**
   * Generate markdown for a single tip
   */
  private generateMarkdown(
    tip: KnowledgeTip,
    relatedTips: KnowledgeTip[],
    backlinks: KnowledgeTip[],
    templateName?: string
  ): string {
    const frontmatter = this.generateFrontmatter(tip);
    const fmYaml = this.renderFrontmatter(frontmatter);

    // Build related links
    const relatedLinks = relatedTips.map(t => this.generateWikiLink(t));
    const backlinkLinks = backlinks.map(t => this.generateWikiLink(t));

    // Build tags line
    const tagLine = (tip.tags || []).map(t => this.mapTag(t)).join(" ");

    // Simple template rendering (not using a full template engine)
    let md = `---
${fmYaml}
---

# ${tip.title}

${tip.body}

`;

    if (relatedLinks.length > 0) {
      md += `## Related Tips\n${relatedLinks.map(l => `- ${l}`).join("\n")}\n\n`;
    }

    if (backlinkLinks.length > 0) {
      md += `## Backlinks\n${backlinkLinks.map(l => `- ${l}`).join("\n")}\n\n`;
    }

    // Context section
    const contexts: string[] = [];
    if (tip.material_groups?.length) {
      contexts.push(`**Materials:** ${tip.material_groups.join(", ")}`);
    }
    if (tip.operation_types?.length) {
      contexts.push(`**Operations:** ${tip.operation_types.join(", ")}`);
    }
    if (tip.machine_ids?.length) {
      contexts.push(`**Machines:** ${tip.machine_ids.join(", ")}`);
    }

    if (contexts.length > 0) {
      md += `## Context\n${contexts.join("\n")}\n\n`;
    }

    // Footer
    md += `---\n*Source: ${tip.source} | Confidence: ${tip.confidence}% | Created: ${tip.created_at}*\n`;

    if (tagLine) {
      md += `\n${tagLine}\n`;
    }

    return md;
  }

  /**
   * Compute checksum for change detection
   */
  private computeChecksum(tip: KnowledgeTip): string {
    const content = JSON.stringify({
      id: tip.id,
      title: tip.title,
      body: tip.body,
      category: tip.category,
      tags: tip.tags,
      confidence: tip.confidence,
    });
    return createHash("sha256").update(content).digest("hex").substring(0, 16);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Export a single tribal tip to Obsidian markdown
   */
  exportSingle(params: ExportSingleParams): ExportSingleResult {
    const validated = ExportSingleSchema.parse(params);
    const { tip_id, output_path, include_backlinks, template } = validated;

    // Get the tip
    const allTips = tribalKnowledgeEngine.search({});
    const tip = allTips.find(t => t.id === tip_id);

    if (!tip) {
      return {
        success: false,
        tip_id,
        output_path: "",
        markdown: "",
        frontmatter: {},
        wiki_links: [],
        tags: [],
        checksum: "",
      };
    }

    // Find related tips
    const relatedTips = this.findRelatedTips(tip, allTips);

    // Find backlinks (tips that link to this one)
    const backlinks = include_backlinks
      ? allTips.filter(t => {
          const related = this.findRelatedTips(t, allTips);
          return related.some(r => r.id === tip_id);
        })
      : [];

    // Generate markdown
    const markdown = this.generateMarkdown(tip, relatedTips, backlinks, template);
    const frontmatter = this.generateFrontmatter(tip);
    const checksum = this.computeChecksum(tip);

    // Determine output path
    const filename = this.generateFilename(tip);
    let finalPath = output_path || "";
    if (!finalPath) {
      if (this.config.category_folders) {
        finalPath = path.join(tip.category, `${filename}.md`);
      } else {
        finalPath = `${filename}.md`;
      }
    }

    // Extract wiki links
    const wikiLinks = relatedTips.map(t => this.generateWikiLink(t));

    // Extract tags
    const tags = (tip.tags || []).map(t => this.mapTag(t));

    // Update state
    this.state.exported_tips[tip_id] = {
      checksum,
      output_path: finalPath,
      exported_at: new Date().toISOString(),
    };
    this.state.total_exported++;
    this.state.last_export = new Date().toISOString();
    this.saveState();

    return {
      success: true,
      tip_id,
      output_path: finalPath,
      markdown,
      frontmatter,
      wiki_links: wikiLinks,
      tags,
      checksum,
    };
  }

  /**
   * Bulk export tribal tips to Obsidian markdown files
   */
  exportBulk(params: ExportBulkParams): ExportBulkResult {
    const validated = ExportBulkSchema.parse(params);
    const { category, tags, material_groups, output_dir, include_index, incremental } = validated;

    // Get all tips
    let tips = tribalKnowledgeEngine.search({});

    // Apply filters
    if (category) {
      tips = tips.filter(t => t.category === category);
    }
    if (tags?.length) {
      tips = tips.filter(t => tags.every(tag => (t.tags || []).includes(tag)));
    }
    if (material_groups?.length) {
      tips = tips.filter(t =>
        material_groups.some(mg => (t.material_groups || []).includes(mg))
      );
    }

    const result: ExportBulkResult = {
      success: true,
      total_tips: tips.length,
      exported_count: 0,
      skipped_count: 0,
      failed_count: 0,
      output_dir,
      exported_files: [],
      errors: [],
    };

    // Create output directory
    try {
      if (!fs.existsSync(output_dir)) {
        fs.mkdirSync(output_dir, { recursive: true });
      }
    } catch (err) {
      result.success = false;
      result.errors.push({ tip_id: "*", error: `Failed to create output dir: ${err}` });
      return result;
    }

    // Export each tip
    for (const tip of tips) {
      try {
        const checksum = this.computeChecksum(tip);

        // Skip if incremental and unchanged
        if (incremental) {
          const prev = this.state.exported_tips[tip.id];
          if (prev && prev.checksum === checksum) {
            result.skipped_count++;
            continue;
          }
        }

        // Export single
        const singleResult = this.exportSingle({
          tip_id: tip.id,
          include_backlinks: true,
        });

        if (!singleResult.success) {
          result.failed_count++;
          result.errors.push({ tip_id: tip.id, error: "Export failed" });
          continue;
        }

        // Write to file
        const fullPath = path.join(output_dir, singleResult.output_path);
        const dir = path.dirname(fullPath);

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, singleResult.markdown, "utf-8");
        result.exported_files.push(fullPath);
        result.exported_count++;
      } catch (err) {
        result.failed_count++;
        result.errors.push({ tip_id: tip.id, error: String(err) });
      }
    }

    // Generate index MOC (Map of Content)
    if (include_index && result.exported_count > 0) {
      try {
        const indexPath = path.join(output_dir, "PRISM-Tribal-Knowledge-Index.md");
        const indexMd = this.generateIndexMOC(tips);
        fs.writeFileSync(indexPath, indexMd, "utf-8");
        result.index_path = indexPath;
      } catch (err) {
        result.errors.push({ tip_id: "*", error: `Failed to create index: ${err}` });
      }
    }

    result.success = result.failed_count === 0;
    return result;
  }

  /**
   * Generate Map of Content index file
   */
  private generateIndexMOC(tips: KnowledgeTip[]): string {
    // Group by category
    const byCategory = new Map<string, KnowledgeTip[]>();
    for (const tip of tips) {
      const cat = tip.category || "uncategorized";
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(tip);
    }

    let md = `---
title: PRISM Tribal Knowledge Index
type: MOC
created: ${new Date().toISOString()}
tags:
  - "#prism/moc"
  - "#prism/tribal-knowledge"
---

# PRISM Tribal Knowledge Index

> Map of Content for tribal knowledge exported from PRISM

**Total Tips:** ${tips.length}
**Categories:** ${byCategory.size}
**Exported:** ${new Date().toISOString()}

`;

    // Sort categories
    const sortedCategories = Array.from(byCategory.keys()).sort();

    for (const category of sortedCategories) {
      const categoryTips = byCategory.get(category)!;
      md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

      // Sort tips by confidence descending
      const sorted = categoryTips.sort((a, b) => b.confidence - a.confidence);

      for (const tip of sorted) {
        const link = this.generateWikiLink(tip);
        const confidence = tip.confidence >= 80 ? "🟢" : tip.confidence >= 50 ? "🟡" : "🔴";
        md += `- ${confidence} ${link}\n`;
      }
      md += "\n";
    }

    return md;
  }

  /**
   * Configure export settings
   */
  configure(params: ExportConfigParams): ExportConfig {
    const validated = ExportConfigSchema.parse(params);

    if (validated.default_template !== undefined) {
      this.config.default_template = validated.default_template;
    }
    if (validated.tag_prefix !== undefined) {
      this.config.tag_prefix = validated.tag_prefix;
    }
    if (validated.category_folders !== undefined) {
      this.config.category_folders = validated.category_folders;
    }
    if (validated.link_style !== undefined) {
      this.config.link_style = validated.link_style;
    }
    if (validated.frontmatter_fields !== undefined) {
      this.config.frontmatter_fields = validated.frontmatter_fields;
    }
    if (validated.custom_tag_mappings !== undefined) {
      this.config.custom_tag_mappings = {
        ...this.config.custom_tag_mappings,
        ...validated.custom_tag_mappings,
      };
    }

    this.saveConfig();
    log.info("[TribalTipExportEngine] Configuration updated");
    return this.config;
  }

  /**
   * Get export status and configuration
   */
  status(): ExportStatus {
    return {
      configured: fs.existsSync(CONFIG_PATH),
      config: this.config,
      state: this.state,
      available_templates: Object.keys(this.templates),
    };
  }

  /**
   * Add a custom template
   */
  addTemplate(name: string, content: string): void {
    this.templates[name] = content;
    log.info(`[TribalTipExportEngine] Added template: ${name}`);
  }

  /**
   * Reset export state (for fresh export)
   */
  resetState(): void {
    this.state = {
      last_export: "",
      exported_tips: {},
      total_exported: 0,
    };
    this.saveState();
    log.info("[TribalTipExportEngine] State reset");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const tribalTipExportEngine = new TribalTipExportEngine();
