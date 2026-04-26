/**
 * ObsidianVaultSyncEngine — Bidirectional Knowledge Sync
 *
 * U-OBS-SYNC01: Engine for bidirectional synchronization between PRISM's
 * knowledge base and Obsidian vaults. Handles conflict resolution, incremental
 * sync, and metadata mapping.
 *
 * Architecture:
 * - Pull: Obsidian markdown → PRISM KnowledgeTip entries
 * - Push: PRISM KnowledgeTip → Obsidian markdown with frontmatter
 * - State: SHA-256 checksums for incremental sync detection
 *
 * @module engines/ObsidianVaultSyncEngine
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { z } from "zod";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// SCHEMAS
// ============================================================================

/** Vault configuration schema */
export const VaultConfigSchema = z.object({
  vault_path: z.string().describe("Absolute path to Obsidian vault"),
  sync_folder: z.string().default("PRISM").describe("Folder within vault for PRISM notes"),
  enable_bidirectional: z.boolean().default(true).describe("Enable two-way sync"),
  conflict_strategy: z.enum(["prism_wins", "obsidian_wins", "manual", "newest"]).default("newest"),
  include_patterns: z.array(z.string()).default(["**/*.md"]).describe("Glob patterns to include"),
  exclude_patterns: z.array(z.string()).default(["**/templates/**", "**/.obsidian/**"]),
  frontmatter_mapping: z.record(z.string(), z.string()).default({
    category: "category",
    tags: "tags",
    domain: "domain",
    confidence: "confidence",
  }).describe("PRISM field → Obsidian frontmatter key mapping"),
});

export type VaultConfig = z.infer<typeof VaultConfigSchema>;

/** Pull parameters */
export const PullParamsSchema = z.object({
  vault_path: z.string().describe("Path to Obsidian vault"),
  sync_folder: z.string().optional().describe("Subfolder to sync from"),
  incremental: z.boolean().default(true).describe("Only sync changed files"),
  dry_run: z.boolean().default(false).describe("Preview without making changes"),
});

export type PullParams = z.infer<typeof PullParamsSchema>;

/** Push parameters */
export const PushParamsSchema = z.object({
  vault_path: z.string().describe("Path to Obsidian vault"),
  sync_folder: z.string().default("PRISM").describe("Subfolder for PRISM notes"),
  tip_ids: z.array(z.string()).optional().describe("Specific tip IDs to push (all if omitted)"),
  incremental: z.boolean().default(true).describe("Only push changed tips"),
  dry_run: z.boolean().default(false).describe("Preview without making changes"),
});

export type PushParams = z.infer<typeof PushParamsSchema>;

// ============================================================================
// TYPES
// ============================================================================

/** Sync entry representing a file's sync state */
interface SyncEntry {
  file_path: string;
  prism_id: string | null;
  checksum: string;
  last_sync: string;
  direction: "pull" | "push" | "both";
}

/** Sync state store */
interface SyncState {
  vault_path: string;
  last_full_sync: string | null;
  entries: Record<string, SyncEntry>;
  conflicts: ConflictRecord[];
}

/** Conflict record for manual resolution */
interface ConflictRecord {
  file_path: string;
  prism_id: string;
  obsidian_checksum: string;
  prism_checksum: string;
  detected_at: string;
  status: "pending" | "resolved";
  resolution?: "prism" | "obsidian" | "merged";
}

/** Parsed Obsidian note */
interface ObsidianNote {
  path: string;
  title: string;
  frontmatter: Record<string, unknown>;
  content: string;
  checksum: string;
  wiki_links: string[];
}

/** Result of a sync operation */
interface SyncResult {
  success: boolean;
  direction: "pull" | "push";
  files_processed: number;
  files_created: number;
  files_updated: number;
  files_skipped: number;
  conflicts_detected: number;
  dry_run: boolean;
  details: SyncDetail[];
  errors: string[];
}

interface SyncDetail {
  path: string;
  action: "create" | "update" | "skip" | "conflict";
  reason?: string;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const SYNC_STATE_PATH = path.join(
  process.cwd(),
  "data/state/obsidian_sync_state.json"
);

const DEFAULT_CONFIG: VaultConfig = {
  vault_path: "",
  sync_folder: "PRISM",
  enable_bidirectional: true,
  conflict_strategy: "newest",
  include_patterns: ["**/*.md"],
  exclude_patterns: ["**/templates/**", "**/.obsidian/**"],
  frontmatter_mapping: {
    category: "category",
    tags: "tags",
    domain: "domain",
    confidence: "confidence",
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compute SHA-256 checksum of content
 */
function computeChecksum(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}

/**
 * Parse Obsidian frontmatter from markdown content
 * @param content - Raw markdown content
 * @returns Parsed frontmatter and body
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = content.slice(match[0].length);
  const frontmatter: Record<string, unknown> = {};

  // Simple YAML parsing for common frontmatter patterns
  const lines = frontmatterText.split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Handle arrays (YAML list format)
    if (value === "") {
      // Check for multi-line array
      continue;
    }

    // Handle inline arrays [item1, item2]
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map(s => s.trim().replace(/^["']|["']$/g, ""));
    }
    // Handle numbers
    else if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) {
      value = parseFloat(value);
    }
    // Handle booleans
    else if (value === "true") value = true;
    else if (value === "false") value = false;
    // Remove quotes from strings
    else if (typeof value === "string") {
      value = value.replace(/^["']|["']$/g, "");
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Generate Obsidian frontmatter from PRISM tip
 */
function generateFrontmatter(tip: Record<string, unknown>, mapping: Record<string, string>): string {
  const lines: string[] = ["---"];

  for (const [prismKey, obsidianKey] of Object.entries(mapping)) {
    const value = tip[prismKey];
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      lines.push(`${obsidianKey}: [${value.map(v => `"${v}"`).join(", ")}]`);
    } else if (typeof value === "object") {
      lines.push(`${obsidianKey}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${obsidianKey}: ${value}`);
    }
  }

  // Add PRISM-specific metadata
  lines.push(`prism_id: "${String(tip.id || "")}"`);
  lines.push(`prism_synced: "${new Date().toISOString()}"`);

  lines.push("---");
  return lines.join("\n");
}

/**
 * Extract wiki-links from markdown content
 */
function extractWikiLinks(content: string): string[] {
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return links;
}

/**
 * Load sync state from disk
 */
function loadSyncState(): SyncState {
  try {
    if (fs.existsSync(SYNC_STATE_PATH)) {
      const data = fs.readFileSync(SYNC_STATE_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    log.warn("[ObsidianVaultSyncEngine] Failed to load sync state, starting fresh");
  }

  return {
    vault_path: "",
    last_full_sync: null,
    entries: {},
    conflicts: [],
  };
}

/**
 * Save sync state to disk
 */
function saveSyncState(state: SyncState): void {
  try {
    const dir = path.dirname(SYNC_STATE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    safeWriteSync(SYNC_STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    log.error("[ObsidianVaultSyncEngine] Failed to save sync state:", e);
  }
}

/**
 * Recursively find markdown files in a directory
 */
function findMarkdownFiles(
  dirPath: string,
  excludePatterns: string[] = []
): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(dirPath, fullPath);

    // Check exclusion patterns
    const isExcluded = excludePatterns.some(pattern => {
      if (pattern.includes("**")) {
        return fullPath.includes(pattern.replace(/\*\*/g, ""));
      }
      return entry.name === pattern || relativePath.startsWith(pattern);
    });

    if (isExcluded) continue;

    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath, excludePatterns));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * ObsidianVaultSyncEngine provides bidirectional synchronization between
 * PRISM knowledge base and Obsidian vaults.
 */
export class ObsidianVaultSyncEngine {
  private state: SyncState;
  private config: VaultConfig;

  constructor(config?: Partial<VaultConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = loadSyncState();
  }

  /**
   * Pull changes from Obsidian vault into PRISM knowledge entries
   * @param params - Pull parameters
   * @returns Sync result with details
   */
  async pull(params: PullParams): Promise<SyncResult> {
    const validated = PullParamsSchema.parse(params);
    const vaultPath = validated.vault_path;
    const syncFolder = validated.sync_folder || this.config.sync_folder;
    const targetPath = syncFolder ? path.join(vaultPath, syncFolder) : vaultPath;

    const result: SyncResult = {
      success: true,
      direction: "pull",
      files_processed: 0,
      files_created: 0,
      files_updated: 0,
      files_skipped: 0,
      conflicts_detected: 0,
      dry_run: validated.dry_run,
      details: [],
      errors: [],
    };

    if (!vaultPath || vaultPath.trim() === "") {
      result.success = false;
      result.errors.push("Vault path is required");
      return result;
    }

    if (!fs.existsSync(vaultPath)) {
      result.success = false;
      result.errors.push(`Vault path does not exist: ${vaultPath}`);
      return result;
    }

    // Find all markdown files
    const mdFiles = findMarkdownFiles(targetPath, this.config.exclude_patterns);
    log.info(`[ObsidianVaultSyncEngine] Found ${mdFiles.length} markdown files to process`);

    for (const filePath of mdFiles) {
      result.files_processed++;

      try {
        const content = fs.readFileSync(filePath, "utf8");
        const checksum = computeChecksum(content);
        const relativePath = path.relative(vaultPath, filePath);

        // Check if file has changed since last sync
        const existingEntry = this.state.entries[relativePath];
        if (validated.incremental && existingEntry && existingEntry.checksum === checksum) {
          result.files_skipped++;
          result.details.push({ path: relativePath, action: "skip", reason: "unchanged" });
          continue;
        }

        // Parse the note
        const { frontmatter, body } = parseFrontmatter(content);
        const wikiLinks = extractWikiLinks(body);
        const title = frontmatter.title as string || path.basename(filePath, ".md");

        const note: ObsidianNote = {
          path: relativePath,
          title,
          frontmatter,
          content: body,
          checksum,
          wiki_links: wikiLinks,
        };

        // Check for conflicts (file modified in both PRISM and Obsidian)
        if (existingEntry && existingEntry.prism_id) {
          const prismChecksum = await this.getPrismTipChecksum(existingEntry.prism_id);
          if (prismChecksum && prismChecksum !== existingEntry.checksum && checksum !== existingEntry.checksum) {
            result.conflicts_detected++;
            this.state.conflicts.push({
              file_path: relativePath,
              prism_id: existingEntry.prism_id,
              obsidian_checksum: checksum,
              prism_checksum: prismChecksum,
              detected_at: new Date().toISOString(),
              status: "pending",
            });
            result.details.push({ path: relativePath, action: "conflict", reason: "modified in both" });
            continue;
          }
        }

        // Import to PRISM
        if (!validated.dry_run) {
          const prismId = await this.importNoteToPrism(note);

          // Update sync state
          this.state.entries[relativePath] = {
            file_path: relativePath,
            prism_id: prismId,
            checksum,
            last_sync: new Date().toISOString(),
            direction: "pull",
          };

          if (existingEntry) {
            result.files_updated++;
            result.details.push({ path: relativePath, action: "update" });
          } else {
            result.files_created++;
            result.details.push({ path: relativePath, action: "create" });
          }
        } else {
          result.details.push({
            path: relativePath,
            action: existingEntry ? "update" : "create",
            reason: "dry_run",
          });
        }
      } catch (e) {
        result.errors.push(`Failed to process ${filePath}: ${e}`);
        log.error(`[ObsidianVaultSyncEngine] Error processing ${filePath}:`, e);
      }
    }

    if (!validated.dry_run) {
      this.state.vault_path = vaultPath;
      this.state.last_full_sync = validated.incremental ? this.state.last_full_sync : new Date().toISOString();
      saveSyncState(this.state);
    }

    return result;
  }

  /**
   * Push PRISM knowledge updates to Obsidian markdown files
   * @param params - Push parameters
   * @returns Sync result with details
   */
  async push(params: PushParams): Promise<SyncResult> {
    const validated = PushParamsSchema.parse(params);
    const vaultPath = validated.vault_path;
    const syncFolder = validated.sync_folder;
    const targetPath = path.join(vaultPath, syncFolder);

    const result: SyncResult = {
      success: true,
      direction: "push",
      files_processed: 0,
      files_created: 0,
      files_updated: 0,
      files_skipped: 0,
      conflicts_detected: 0,
      dry_run: validated.dry_run,
      details: [],
      errors: [],
    };

    if (!fs.existsSync(vaultPath)) {
      result.success = false;
      result.errors.push(`Vault path does not exist: ${vaultPath}`);
      return result;
    }

    // Ensure sync folder exists
    if (!validated.dry_run && !fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    // Get tips to push
    const tips = await this.getPrismTips(validated.tip_ids);
    log.info(`[ObsidianVaultSyncEngine] Pushing ${tips.length} tips to Obsidian`);

    for (const tip of tips) {
      result.files_processed++;

      try {
        const fileName = this.sanitizeFileName(String(tip.title || tip.id || "untitled")) + ".md";
        const relativePath = path.join(syncFolder, fileName);
        const fullPath = path.join(vaultPath, relativePath);

        // Generate markdown content
        const frontmatter = generateFrontmatter(tip, this.config.frontmatter_mapping);
        const content = `${frontmatter}\n\n# ${String(tip.title || "")}\n\n${String(tip.body || "")}`;
        const newChecksum = computeChecksum(content);

        // Check for existing file
        const existingEntry = this.state.entries[relativePath];
        if (fs.existsSync(fullPath)) {
          const existingContent = fs.readFileSync(fullPath, "utf8");
          const existingChecksum = computeChecksum(existingContent);

          // Check if file was modified externally
          if (existingEntry && existingChecksum !== existingEntry.checksum) {
            // File modified in Obsidian since last sync
            if (validated.incremental && this.config.conflict_strategy !== "prism_wins") {
              result.conflicts_detected++;
              this.state.conflicts.push({
                file_path: relativePath,
                prism_id: String(tip.id || ""),
                obsidian_checksum: existingChecksum,
                prism_checksum: newChecksum,
                detected_at: new Date().toISOString(),
                status: "pending",
              });
              result.details.push({ path: relativePath, action: "conflict", reason: "modified in obsidian" });
              continue;
            }
          }

          // Check if content unchanged
          if (validated.incremental && existingChecksum === newChecksum) {
            result.files_skipped++;
            result.details.push({ path: relativePath, action: "skip", reason: "unchanged" });
            continue;
          }
        }

        if (!validated.dry_run) {
          fs.writeFileSync(fullPath, content, "utf8");

          this.state.entries[relativePath] = {
            file_path: relativePath,
            prism_id: String(tip.id || ""),
            checksum: newChecksum,
            last_sync: new Date().toISOString(),
            direction: "push",
          };

          if (existingEntry || fs.existsSync(fullPath)) {
            result.files_updated++;
            result.details.push({ path: relativePath, action: "update" });
          } else {
            result.files_created++;
            result.details.push({ path: relativePath, action: "create" });
          }
        } else {
          result.details.push({
            path: relativePath,
            action: existingEntry ? "update" : "create",
            reason: "dry_run",
          });
        }
      } catch (e) {
        result.errors.push(`Failed to push tip ${String(tip.id || "unknown")}: ${e}`);
        log.error(`[ObsidianVaultSyncEngine] Error pushing tip ${String(tip.id || "unknown")}:`, e);
      }
    }

    if (!validated.dry_run) {
      saveSyncState(this.state);
    }

    return result;
  }

  /**
   * Get sync status for a vault
   * @param vaultPath - Path to Obsidian vault
   * @returns Sync status information
   */
  status(vaultPath?: string): {
    configured: boolean;
    vault_path: string;
    last_full_sync: string | null;
    total_entries: number;
    pending_conflicts: number;
    entries_by_direction: Record<string, number>;
  } {
    const targetVault = vaultPath || this.state.vault_path;

    const byDirection = { pull: 0, push: 0, both: 0 };
    for (const entry of Object.values(this.state.entries)) {
      byDirection[entry.direction]++;
    }

    return {
      configured: !!targetVault,
      vault_path: targetVault,
      last_full_sync: this.state.last_full_sync,
      total_entries: Object.keys(this.state.entries).length,
      pending_conflicts: this.state.conflicts.filter(c => c.status === "pending").length,
      entries_by_direction: byDirection,
    };
  }

  /**
   * Configure vault settings
   * @param config - Partial configuration to apply
   * @returns Updated configuration
   */
  configure(config: Partial<VaultConfig>): VaultConfig {
    this.config = VaultConfigSchema.parse({ ...this.config, ...config });

    if (config.vault_path) {
      this.state.vault_path = config.vault_path;
      saveSyncState(this.state);
    }

    return this.config;
  }

  /**
   * Get pending conflicts
   * @returns List of unresolved conflicts
   */
  getConflicts(): ConflictRecord[] {
    return this.state.conflicts.filter(c => c.status === "pending");
  }

  /**
   * Resolve a conflict
   * @param filePath - Path to conflicting file
   * @param resolution - How to resolve: "prism", "obsidian", or "merged"
   */
  async resolveConflict(
    filePath: string,
    resolution: "prism" | "obsidian" | "merged"
  ): Promise<{ success: boolean; message: string }> {
    const conflict = this.state.conflicts.find(
      c => c.file_path === filePath && c.status === "pending"
    );

    if (!conflict) {
      return { success: false, message: `No pending conflict for ${filePath}` };
    }

    conflict.status = "resolved";
    conflict.resolution = resolution;

    // Apply resolution
    if (resolution === "prism") {
      // Re-push PRISM version
      const tip = await this.getPrismTipById(conflict.prism_id);
      if (tip) {
        const fullPath = path.join(this.state.vault_path, filePath);
        const frontmatter = generateFrontmatter(tip, this.config.frontmatter_mapping);
        const content = `${frontmatter}\n\n# ${String(tip.title || "")}\n\n${String(tip.body || "")}`;
        fs.writeFileSync(fullPath, content, "utf8");

        this.state.entries[filePath] = {
          file_path: filePath,
          prism_id: String(tip.id || ""),
          checksum: computeChecksum(content),
          last_sync: new Date().toISOString(),
          direction: "push",
        };
      }
    } else if (resolution === "obsidian") {
      // Re-import Obsidian version
      const fullPath = path.join(this.state.vault_path, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf8");
        const { frontmatter, body } = parseFrontmatter(content);
        const note: ObsidianNote = {
          path: filePath,
          title: frontmatter.title as string || path.basename(filePath, ".md"),
          frontmatter,
          content: body,
          checksum: computeChecksum(content),
          wiki_links: extractWikiLinks(body),
        };

        await this.importNoteToPrism(note, conflict.prism_id);

        this.state.entries[filePath] = {
          file_path: filePath,
          prism_id: conflict.prism_id,
          checksum: note.checksum,
          last_sync: new Date().toISOString(),
          direction: "pull",
        };
      }
    }

    saveSyncState(this.state);
    return { success: true, message: `Conflict resolved: ${resolution}` };
  }

  // ── Private Methods ──

  /**
   * Import an Obsidian note into PRISM as a KnowledgeTip
   */
  private async importNoteToPrism(note: ObsidianNote, existingId?: string): Promise<string> {
    try {
      const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");

      const tipData = {
        title: note.title,
        body: note.content,
        category: (note.frontmatter.category as string) || "general",
        domain: (note.frontmatter.domain as string) || "document_learned",
        tags: Array.isArray(note.frontmatter.tags) ? note.frontmatter.tags : [],
        confidence: typeof note.frontmatter.confidence === "number" ? note.frontmatter.confidence : 70,
        source: "obsidian_sync",
        metadata: {
          obsidian_path: note.path,
          wiki_links: note.wiki_links,
          synced_at: new Date().toISOString(),
        },
      };

      // Use existing ID if updating
      if (existingId) {
        (tipData as any).id = existingId;
      }

      const result = tribalKnowledgeEngine.capture(tipData);
      return result?.id || existingId || `obs_${computeChecksum(note.path)}`;
    } catch (e) {
      log.error("[ObsidianVaultSyncEngine] Failed to import note:", e);
      return `obs_${computeChecksum(note.path)}`;
    }
  }

  /**
   * Get checksum of a PRISM tip by ID
   */
  private async getPrismTipChecksum(tipId: string): Promise<string | null> {
    try {
      const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
      const results = tribalKnowledgeEngine.search({ query: tipId, limit: 1 });

      if (results && results.length > 0) {
        const tip = results[0];
        return computeChecksum(JSON.stringify({ title: tip.title, body: tip.body }));
      }
    } catch {
      // Engine not available
    }
    return null;
  }

  /**
   * Get PRISM tip by ID
   */
  private async getPrismTipById(tipId: string): Promise<Record<string, unknown> | null> {
    try {
      const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
      const results = tribalKnowledgeEngine.search({ query: tipId, limit: 1 });

      if (results && results.length > 0) {
        return results[0] as Record<string, unknown>;
      }
    } catch {
      // Engine not available
    }
    return null;
  }

  /**
   * Get PRISM tips to push
   */
  private async getPrismTips(tipIds?: string[]): Promise<Array<Record<string, unknown>>> {
    try {
      const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");

      if (tipIds && tipIds.length > 0) {
        const tips: Array<Record<string, unknown>> = [];
        for (const id of tipIds) {
          const results = tribalKnowledgeEngine.search({ query: id, limit: 1 });
          if (results && results.length > 0) {
            tips.push(results[0] as Record<string, unknown>);
          }
        }
        return tips;
      }

      // Get all tips (limited to recent/important ones)
      const results = tribalKnowledgeEngine.search({ query: "*", limit: 100 });
      return (results || []) as Array<Record<string, unknown>>;
    } catch {
      return [];
    }
  }

  /**
   * Sanitize a string for use as a filename
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 100);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const obsidianVaultSyncEngine = new ObsidianVaultSyncEngine();

export default ObsidianVaultSyncEngine;
