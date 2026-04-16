/**
 * ResourceExtractionStateEngine.ts
 *
 * PDF-EXT-MS1: Filing System for Resource Extraction
 *
 * Tracks what has been:
 * - Scanned (discovered in resources folder)
 * - Extracted (data pulled from PDF/document)
 * - Merged (integrated into catalogs/registries)
 * - Utilized (referenced by calculations/queries)
 *
 * Prevents duplicate extraction and enables incremental processing.
 *
 * @module engines/ResourceExtractionStateEngine
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "../utils/Logger.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ResourceEntry {
  id: string;
  path: string;
  filename: string;
  category: ResourceCategory;
  status: ExtractionStatus;
  fileSize: number;
  fileHash?: string;
  discoveredAt: string;
  extractedAt?: string;
  mergedAt?: string;
  lastAccessedAt?: string;
  extractionResult?: ExtractionResult;
  metadata?: ResourceMetadata;
}

export type ResourceCategory =
  | "handbook"          // Machinery's Handbook, Kalpakjian, etc.
  | "tool_catalog"      // Sandvik, Kennametal, Walter, ISCAR
  | "material_catalog"  // Material databases
  | "machine_manual"    // Machine tool manuals
  | "mit_course"        // MIT OCW materials
  | "academic_paper"    // Research papers
  | "cam_documentation" // CAM software docs
  | "standard"          // ISO, ASME, DIN standards
  | "video_transcript"  // Extracted video transcripts
  | "jm_die_program"    // JM Die CNC programs
  | "unknown";

export type ExtractionStatus =
  | "discovered"    // Found in folder, not yet processed
  | "queued"        // In extraction queue
  | "extracting"    // Currently being processed
  | "extracted"     // Data extracted, not yet merged
  | "merged"        // Merged into catalogs/registries
  | "failed"        // Extraction failed
  | "skipped"       // Intentionally skipped (duplicate, unsupported)
  | "archived";     // Old version, superseded

export interface ExtractionResult {
  success: boolean;
  extractedAt: string;
  duration: number;
  counts: {
    tools?: number;
    materials?: number;
    formulas?: number;
    tables?: number;
    tips?: number;
    pages?: number;
  };
  errors?: string[];
  outputFiles?: string[];
  targetRegistries?: string[];
}

export interface ResourceMetadata {
  title?: string;
  author?: string;
  publisher?: string;
  year?: number;
  edition?: string;
  isbn?: string;
  pages?: number;
  manufacturer?: string;
  version?: string;
  language?: string;
  tags?: string[];
}

export interface ExtractionStats {
  total: number;
  byStatus: Record<ExtractionStatus, number>;
  byCategory: Record<ResourceCategory, number>;
  totalExtracted: {
    tools: number;
    materials: number;
    formulas: number;
    tables: number;
    tips: number;
  };
  lastScanAt?: string;
  lastExtractionAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_PATTERNS: Array<{
  pattern: RegExp;
  category: ResourceCategory;
}> = [
  // Tool catalogs by manufacturer
  { pattern: /sandvik/i, category: "tool_catalog" },
  { pattern: /kennametal/i, category: "tool_catalog" },
  { pattern: /walter/i, category: "tool_catalog" },
  { pattern: /iscar/i, category: "tool_catalog" },
  { pattern: /seco/i, category: "tool_catalog" },
  { pattern: /mitsubishi.*carbide/i, category: "tool_catalog" },
  { pattern: /tungaloy/i, category: "tool_catalog" },
  { pattern: /kyocera/i, category: "tool_catalog" },
  { pattern: /sumitomo/i, category: "tool_catalog" },
  { pattern: /horn/i, category: "tool_catalog" },
  { pattern: /guhring|güring/i, category: "tool_catalog" },
  { pattern: /osg/i, category: "tool_catalog" },
  { pattern: /emuge/i, category: "tool_catalog" },
  { pattern: /dormer|pramet/i, category: "tool_catalog" },
  { pattern: /widia/i, category: "tool_catalog" },
  { pattern: /ingersoll/i, category: "tool_catalog" },
  { pattern: /sgs/i, category: "tool_catalog" },
  { pattern: /helical/i, category: "tool_catalog" },

  // Handbooks
  { pattern: /machinery.*handbook/i, category: "handbook" },
  { pattern: /kalpakjian/i, category: "handbook" },
  { pattern: /shaw.*metal.*cutting/i, category: "handbook" },
  { pattern: /boothroyd/i, category: "handbook" },
  { pattern: /sme.*handbook/i, category: "handbook" },
  { pattern: /tool.*engineer/i, category: "handbook" },
  { pattern: /machinist.*handbook/i, category: "handbook" },

  // MIT courses
  { pattern: /mit.*2\.\d{3}/i, category: "mit_course" },
  { pattern: /mit.*ocw/i, category: "mit_course" },
  { pattern: /mit.*lecture/i, category: "mit_course" },

  // Academic papers
  { pattern: /altintas/i, category: "academic_paper" },
  { pattern: /merchant/i, category: "academic_paper" },
  { pattern: /oxley/i, category: "academic_paper" },
  { pattern: /doi.*10\./i, category: "academic_paper" },
  { pattern: /arxiv/i, category: "academic_paper" },

  // CAM documentation
  { pattern: /hypermill/i, category: "cam_documentation" },
  { pattern: /mastercam/i, category: "cam_documentation" },
  { pattern: /fusion.*360/i, category: "cam_documentation" },
  { pattern: /solidcam/i, category: "cam_documentation" },
  { pattern: /esprit/i, category: "cam_documentation" },
  { pattern: /nx.*cam/i, category: "cam_documentation" },
  { pattern: /catia/i, category: "cam_documentation" },

  // Machine manuals
  { pattern: /okuma/i, category: "machine_manual" },
  { pattern: /haas/i, category: "machine_manual" },
  { pattern: /mazak/i, category: "machine_manual" },
  { pattern: /dmg.*mori/i, category: "machine_manual" },
  { pattern: /hurco/i, category: "machine_manual" },
  { pattern: /fanuc/i, category: "machine_manual" },
  { pattern: /siemens.*sinumerik/i, category: "machine_manual" },
  { pattern: /mitsubishi.*edm/i, category: "machine_manual" },

  // Standards
  { pattern: /iso.*\d{3,5}/i, category: "standard" },
  { pattern: /asme.*y14/i, category: "standard" },
  { pattern: /din.*\d{3,5}/i, category: "standard" },
  { pattern: /ansi/i, category: "standard" },

  // JM Die programs
  { pattern: /\.min$/i, category: "jm_die_program" },
  { pattern: /\.mcx/i, category: "jm_die_program" },
  { pattern: /\.nc$/i, category: "jm_die_program" },
];

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class ResourceExtractionStateEngine {
  private stateDir: string;
  private stateFile: string;
  private resources: Map<string, ResourceEntry> = new Map();
  private dirty: boolean = false;

  constructor() {
    this.stateDir = path.join(process.cwd(), "data", "state");
    this.stateFile = path.join(this.stateDir, "resource-extraction-state.json");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });
    await this.load();
    logger.info(`[ResourceExtractionState] Loaded ${this.resources.size} resources`);
  }

  // ─── State Persistence ─────────────────────────────────────────────────

  private async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.stateFile, "utf-8");
      const data = JSON.parse(content);
      this.resources = new Map(Object.entries(data.resources || {}));
    } catch {
      // File doesn't exist yet
      this.resources = new Map();
    }
  }

  async save(): Promise<void> {
    if (!this.dirty) return;

    const data = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      resourceCount: this.resources.size,
      resources: Object.fromEntries(this.resources),
    };

    await fs.writeFile(this.stateFile, JSON.stringify(data, null, 2));
    this.dirty = false;
    logger.info(`[ResourceExtractionState] Saved ${this.resources.size} resources`);
  }

  // ─── Resource Discovery ────────────────────────────────────────────────

  async scanDirectory(
    directory: string,
    options?: {
      recursive?: boolean;
      extensions?: string[];
      maxFiles?: number;
    }
  ): Promise<{ discovered: number; skipped: number; errors: string[] }> {
    const opts = {
      recursive: true,
      extensions: [".pdf", ".PDF", ".txt", ".md", ".json"],
      maxFiles: 10000,
      ...options,
    };

    let discovered = 0;
    let skipped = 0;
    const errors: string[] = [];

    const scanDir = async (dir: string, depth: number = 0): Promise<void> => {
      if (depth > 10) return; // Prevent infinite recursion

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (discovered >= opts.maxFiles) break;

          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && opts.recursive) {
            await scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!opts.extensions.some(e => e.toLowerCase() === ext)) {
              continue;
            }

            // Generate ID from path
            const id = this.pathToId(fullPath);

            // Skip if already tracked
            if (this.resources.has(id)) {
              skipped++;
              continue;
            }

            try {
              const stats = await fs.stat(fullPath);
              const category = this.detectCategory(entry.name, fullPath);

              const resource: ResourceEntry = {
                id,
                path: fullPath,
                filename: entry.name,
                category,
                status: "discovered",
                fileSize: stats.size,
                discoveredAt: new Date().toISOString(),
              };

              this.resources.set(id, resource);
              this.dirty = true;
              discovered++;
            } catch (e) {
              errors.push(`${fullPath}: ${e}`);
            }
          }
        }
      } catch (e) {
        errors.push(`${dir}: ${e}`);
      }
    };

    await scanDir(directory);
    await this.save();

    logger.info(
      `[ResourceExtractionState] Scan complete: ${discovered} discovered, ${skipped} skipped`
    );

    return { discovered, skipped, errors };
  }

  // ─── Category Detection ────────────────────────────────────────────────

  private detectCategory(filename: string, filepath: string): ResourceCategory {
    const combined = `${filename} ${filepath}`;

    for (const { pattern, category } of CATEGORY_PATTERNS) {
      if (pattern.test(combined)) {
        return category;
      }
    }

    return "unknown";
  }

  private pathToId(filepath: string): string {
    // Normalize path and create stable ID
    return filepath
      .replace(/\\/g, "/")
      .toLowerCase()
      .replace(/[^a-z0-9/]/g, "-")
      .replace(/-+/g, "-")
      .slice(-100); // Limit length
  }

  // ─── Status Management ─────────────────────────────────────────────────

  getResource(id: string): ResourceEntry | undefined {
    return this.resources.get(id);
  }

  getByPath(filepath: string): ResourceEntry | undefined {
    const id = this.pathToId(filepath);
    return this.resources.get(id);
  }

  getByStatus(status: ExtractionStatus): ResourceEntry[] {
    return Array.from(this.resources.values()).filter(r => r.status === status);
  }

  getByCategory(category: ResourceCategory): ResourceEntry[] {
    return Array.from(this.resources.values()).filter(r => r.category === category);
  }

  getPending(): ResourceEntry[] {
    return Array.from(this.resources.values()).filter(
      r => r.status === "discovered" || r.status === "queued"
    );
  }

  updateStatus(
    id: string,
    status: ExtractionStatus,
    result?: ExtractionResult
  ): boolean {
    const resource = this.resources.get(id);
    if (!resource) return false;

    resource.status = status;

    if (status === "extracted" || status === "failed") {
      resource.extractedAt = new Date().toISOString();
      if (result) {
        resource.extractionResult = result;
      }
    } else if (status === "merged") {
      resource.mergedAt = new Date().toISOString();
    }

    this.dirty = true;
    return true;
  }

  recordAccess(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastAccessedAt = new Date().toISOString();
      this.dirty = true;
    }
  }

  setMetadata(id: string, metadata: ResourceMetadata): boolean {
    const resource = this.resources.get(id);
    if (!resource) return false;

    resource.metadata = { ...resource.metadata, ...metadata };
    this.dirty = true;
    return true;
  }

  // ─── Duplicate Detection ───────────────────────────────────────────────

  async checkDuplicate(filepath: string): Promise<{
    isDuplicate: boolean;
    existingId?: string;
    reason?: string;
  }> {
    const id = this.pathToId(filepath);

    // Check by ID
    if (this.resources.has(id)) {
      return {
        isDuplicate: true,
        existingId: id,
        reason: "Same path already tracked",
      };
    }

    // Check by filename (might be same file in different location)
    const filename = path.basename(filepath);
    for (const [existingId, resource] of this.resources) {
      if (resource.filename === filename && resource.status !== "failed") {
        // Could be duplicate - check file size
        try {
          const stats = await fs.stat(filepath);
          if (stats.size === resource.fileSize) {
            return {
              isDuplicate: true,
              existingId,
              reason: `Same filename and size as ${resource.path}`,
            };
          }
        } catch {
          // Can't stat, assume not duplicate
        }
      }
    }

    return { isDuplicate: false };
  }

  // ─── Queue Management ──────────────────────────────────────────────────

  queueForExtraction(
    ids: string[],
    priority?: "high" | "normal" | "low"
  ): number {
    let queued = 0;

    for (const id of ids) {
      const resource = this.resources.get(id);
      if (resource && resource.status === "discovered") {
        resource.status = "queued";
        queued++;
        this.dirty = true;
      }
    }

    return queued;
  }

  getNextInQueue(category?: ResourceCategory): ResourceEntry | undefined {
    const queued = this.getByStatus("queued");

    if (category) {
      return queued.find(r => r.category === category);
    }

    // Prioritize by category (handbooks first, then tool catalogs, etc.)
    const priorityOrder: ResourceCategory[] = [
      "handbook",
      "tool_catalog",
      "material_catalog",
      "mit_course",
      "standard",
      "academic_paper",
      "cam_documentation",
      "machine_manual",
    ];

    for (const cat of priorityOrder) {
      const found = queued.find(r => r.category === cat);
      if (found) return found;
    }

    return queued[0];
  }

  // ─── Statistics ────────────────────────────────────────────────────────

  getStats(): ExtractionStats {
    const stats: ExtractionStats = {
      total: this.resources.size,
      byStatus: {
        discovered: 0,
        queued: 0,
        extracting: 0,
        extracted: 0,
        merged: 0,
        failed: 0,
        skipped: 0,
        archived: 0,
      },
      byCategory: {
        handbook: 0,
        tool_catalog: 0,
        material_catalog: 0,
        machine_manual: 0,
        mit_course: 0,
        academic_paper: 0,
        cam_documentation: 0,
        standard: 0,
        video_transcript: 0,
        jm_die_program: 0,
        unknown: 0,
      },
      totalExtracted: {
        tools: 0,
        materials: 0,
        formulas: 0,
        tables: 0,
        tips: 0,
      },
    };

    for (const resource of this.resources.values()) {
      stats.byStatus[resource.status]++;
      stats.byCategory[resource.category]++;

      if (resource.extractionResult?.counts) {
        const c = resource.extractionResult.counts;
        stats.totalExtracted.tools += c.tools || 0;
        stats.totalExtracted.materials += c.materials || 0;
        stats.totalExtracted.formulas += c.formulas || 0;
        stats.totalExtracted.tables += c.tables || 0;
        stats.totalExtracted.tips += c.tips || 0;
      }

      if (resource.extractedAt) {
        if (!stats.lastExtractionAt || resource.extractedAt > stats.lastExtractionAt) {
          stats.lastExtractionAt = resource.extractedAt;
        }
      }
    }

    return stats;
  }

  // ─── Reporting ─────────────────────────────────────────────────────────

  generateReport(): string {
    const stats = this.getStats();
    const lines: string[] = [
      "# Resource Extraction State Report",
      "",
      `**Generated:** ${new Date().toISOString()}`,
      `**Total Resources:** ${stats.total}`,
      "",
      "## Status Breakdown",
      "",
      "| Status | Count |",
      "|--------|-------|",
    ];

    for (const [status, count] of Object.entries(stats.byStatus)) {
      if (count > 0) {
        lines.push(`| ${status} | ${count} |`);
      }
    }

    lines.push("", "## Category Breakdown", "", "| Category | Count |", "|----------|-------|");

    for (const [category, count] of Object.entries(stats.byCategory)) {
      if (count > 0) {
        lines.push(`| ${category} | ${count} |`);
      }
    }

    lines.push("", "## Extraction Totals", "");
    lines.push(`- **Tools:** ${stats.totalExtracted.tools}`);
    lines.push(`- **Materials:** ${stats.totalExtracted.materials}`);
    lines.push(`- **Formulas:** ${stats.totalExtracted.formulas}`);
    lines.push(`- **Tables:** ${stats.totalExtracted.tables}`);
    lines.push(`- **Tips:** ${stats.totalExtracted.tips}`);

    if (stats.lastExtractionAt) {
      lines.push("", `**Last Extraction:** ${stats.lastExtractionAt}`);
    }

    // List pending items
    const pending = this.getPending();
    if (pending.length > 0) {
      lines.push("", "## Pending Extraction", "");
      for (const r of pending.slice(0, 20)) {
        lines.push(`- [${r.category}] ${r.filename}`);
      }
      if (pending.length > 20) {
        lines.push(`- ... and ${pending.length - 20} more`);
      }
    }

    return lines.join("\n");
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  async pruneInvalid(): Promise<number> {
    let pruned = 0;

    for (const [id, resource] of this.resources) {
      try {
        await fs.access(resource.path);
      } catch {
        // File no longer exists
        this.resources.delete(id);
        pruned++;
        this.dirty = true;
      }
    }

    if (pruned > 0) {
      await this.save();
      logger.info(`[ResourceExtractionState] Pruned ${pruned} invalid entries`);
    }

    return pruned;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const resourceExtractionStateEngine = new ResourceExtractionStateEngine();
