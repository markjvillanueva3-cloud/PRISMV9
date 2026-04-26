/**
 * SuccessPatternBankEngine — AI Augmentation Learning Loop
 * ==========================================================
 *
 * Append-only JSONL store of successful approaches from Claude sessions.
 * Enables pattern retrieval for similar future tasks, completing the
 * AI augmentation feedback loop.
 *
 * Consumers:
 *   - session-learning-feedback.mjs Stop hook writes patterns
 *   - ai-feature-recommend.mjs UserPromptSubmit hook queries patterns
 *   - prism_ai dispatcher exposes pattern_record / pattern_query actions
 *
 * Invariants:
 *   - APPEND-ONLY. Patterns never mutate (reinforcement appends new entry).
 *   - ATOMIC WRITE. tmp+fsync+rename for 6-chat concurrency safety.
 *   - NEVER-THROW. Bad input returns {ok:false, warning}.
 *   - KEYWORD INDEXING. In-memory keyword→pattern_id map for fast lookup.
 *
 * @module engines/SuccessPatternBankEngine
 * @milestone CAM-EXHAUST-MS0 / AI-AUGMENT
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import {
  SuccessPatternSchema,
  RecordPatternInputSchema,
  QueryPatternInputSchema,
  ReinforcePatternInputSchema,
  type SuccessPattern,
  type RecordPatternInput,
  type QueryPatternInput,
  type ReinforcePatternInput,
  type TaskCategoryT,
  type ConfidenceLevelT,
} from "../schemas/successPatternSchema.js";

const PATTERNS_DIR = path.resolve(process.cwd(), "state/patterns");
const PATTERNS_FILE = "success-patterns.jsonl";
const SCHEMA_VERSION = "1.0.0" as const;
const MAX_LINE_BYTES = 64 * 1024;

// Confidence ordering for queries
const CONFIDENCE_ORDER: Record<ConfidenceLevelT, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export interface RecordResult {
  ok: boolean;
  pattern_id: string;
  path: string;
  warning?: string;
}

export interface QueryResult {
  ok: boolean;
  patterns: SuccessPattern[];
  total: number;
  warning?: string;
}

export interface ReinforceResult {
  ok: boolean;
  pattern_id: string;
  new_success_count: number;
  new_failure_count: number;
  warning?: string;
}

export interface StatsResult {
  ok: boolean;
  total_patterns: number;
  by_category: Record<string, number>;
  by_confidence: Record<string, number>;
  top_keywords: Array<{ keyword: string; count: number }>;
  warning?: string;
}

/**
 * SuccessPatternBankEngine — singleton pattern bank.
 */
export class SuccessPatternBankEngine {
  private readonly rootDir: string;
  private patterns: Map<string, SuccessPattern> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();
  private loaded = false;

  constructor(rootDir: string = PATTERNS_DIR) {
    this.rootDir = rootDir;
  }

  /**
   * Ensure patterns directory exists
   */
  private ensureDir(): void {
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }
  }

  /**
   * Get path to patterns file
   */
  private getFilePath(): string {
    return path.join(this.rootDir, PATTERNS_FILE);
  }

  /**
   * Load patterns from disk into memory (lazy, on first access)
   */
  private loadPatterns(): void {
    if (this.loaded) return;
    this.loaded = true;

    const filePath = this.getFilePath();
    if (!fs.existsSync(filePath)) return;

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const validated = SuccessPatternSchema.safeParse(parsed);
          if (validated.success) {
            const pattern = validated.data;
            this.patterns.set(pattern.pattern_id, pattern);
            this.indexKeywords(pattern);
          }
        } catch {
          // Skip malformed lines
        }
      }
    } catch {
      // File read error — start empty
    }
  }

  /**
   * Index pattern keywords for fast lookup
   */
  private indexKeywords(pattern: SuccessPattern): void {
    for (const kw of pattern.task_keywords) {
      const normalized = kw.toLowerCase();
      if (!this.keywordIndex.has(normalized)) {
        this.keywordIndex.set(normalized, new Set());
      }
      this.keywordIndex.get(normalized)!.add(pattern.pattern_id);
    }
  }

  /**
   * Atomic write to JSONL file
   */
  private atomicAppend(line: string): { ok: boolean; path: string; warning?: string } {
    this.ensureDir();
    const filePath = this.getFilePath();
    const tmpPath = path.join(os.tmpdir(), `pattern-${randomUUID()}.tmp`);

    try {
      // Check line size
      if (Buffer.byteLength(line, "utf8") > MAX_LINE_BYTES) {
        return { ok: false, path: filePath, warning: "Pattern exceeds max line size" };
      }

      // Read existing content
      let existing = "";
      if (fs.existsSync(filePath)) {
        existing = fs.readFileSync(filePath, "utf8");
        if (existing && !existing.endsWith("\n")) {
          existing += "\n";
        }
      }

      // Write to temp file with fsync
      const fd = fs.openSync(tmpPath, "w");
      fs.writeSync(fd, existing + line + "\n");
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      // Atomic rename (on Windows, target must not exist)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fs.renameSync(tmpPath, filePath);

      return { ok: true, path: filePath };
    } catch (err) {
      // Cleanup temp file if exists
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup errors
      }
      return {
        ok: false,
        path: filePath,
        warning: `Write failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Record a new success pattern
   */
  record(input: RecordPatternInput): RecordResult {
    const parsed = RecordPatternInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        pattern_id: "",
        path: "",
        warning: `Schema validation failed: ${parsed.error.message}`,
      };
    }

    const now = new Date().toISOString();
    const pattern_id = parsed.data.pattern_id ?? randomUUID();

    const pattern: SuccessPattern = {
      schemaVersion: SCHEMA_VERSION,
      pattern_id,
      lineage_id: parsed.data.lineage_id,
      task_category: parsed.data.task_category,
      task_description: parsed.data.task_description,
      task_keywords: parsed.data.task_keywords,
      approach_summary: parsed.data.approach_summary,
      mcp_actions_used: parsed.data.mcp_actions_used ?? [],
      tools_used: parsed.data.tools_used ?? [],
      engines_invoked: parsed.data.engines_invoked ?? [],
      confidence: parsed.data.confidence ?? "medium",
      success_count: 1,
      failure_count: 0,
      domain: parsed.data.domain,
      constraints: parsed.data.constraints,
      created_at: now,
      last_used_at: now,
    };

    const line = JSON.stringify(pattern);
    const writeResult = this.atomicAppend(line);

    if (writeResult.ok) {
      // Update in-memory index
      this.loadPatterns();
      this.patterns.set(pattern_id, pattern);
      this.indexKeywords(pattern);
    }

    return {
      ok: writeResult.ok,
      pattern_id,
      path: writeResult.path,
      warning: writeResult.warning,
    };
  }

  /**
   * Query patterns by category, keywords, domain
   */
  query(input: QueryPatternInput): QueryResult {
    const parsed = QueryPatternInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        patterns: [],
        total: 0,
        warning: `Schema validation failed: ${parsed.error.message}`,
      };
    }

    this.loadPatterns();

    let candidates: SuccessPattern[] = Array.from(this.patterns.values());

    // Filter by category
    if (parsed.data.task_category) {
      candidates = candidates.filter((p) => p.task_category === parsed.data.task_category);
    }

    // Filter by domain
    if (parsed.data.domain) {
      candidates = candidates.filter((p) => p.domain === parsed.data.domain);
    }

    // Filter by minimum confidence
    if (parsed.data.min_confidence) {
      const minOrder = CONFIDENCE_ORDER[parsed.data.min_confidence];
      candidates = candidates.filter(
        (p) => CONFIDENCE_ORDER[p.confidence] >= minOrder
      );
    }

    // Filter by minimum success count
    if (parsed.data.min_success_count) {
      candidates = candidates.filter(
        (p) => p.success_count >= parsed.data.min_success_count!
      );
    }

    // Filter/boost by keywords (keyword score is primary ranking)
    const hasKeywordFilter = parsed.data.keywords && parsed.data.keywords.length > 0;
    if (hasKeywordFilter) {
      const queryKeywords = new Set(parsed.data.keywords!.map((k) => k.toLowerCase()));
      candidates = candidates
        .map((p) => {
          const patternKeywords = new Set(p.task_keywords.map((k) => k.toLowerCase()));
          const overlap = [...queryKeywords].filter((k) => patternKeywords.has(k)).length;
          return { pattern: p, score: overlap };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.pattern);
    } else {
      // No keyword filter: sort by success rate and recency
      candidates.sort((a, b) => {
        const aRate = a.success_count / (a.success_count + a.failure_count);
        const bRate = b.success_count / (b.success_count + b.failure_count);
        if (Math.abs(aRate - bRate) > 0.1) return bRate - aRate;
        return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
      });
    }

    const limit = parsed.data.limit ?? 10;
    const results = candidates.slice(0, limit);

    return {
      ok: true,
      patterns: results,
      total: candidates.length,
    };
  }

  /**
   * Reinforce a pattern (record success/failure)
   */
  reinforce(input: ReinforcePatternInput): ReinforceResult {
    const parsed = ReinforcePatternInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        pattern_id: "",
        new_success_count: 0,
        new_failure_count: 0,
        warning: `Schema validation failed: ${parsed.error.message}`,
      };
    }

    this.loadPatterns();

    const existing = this.patterns.get(parsed.data.pattern_id);
    if (!existing) {
      return {
        ok: false,
        pattern_id: parsed.data.pattern_id,
        new_success_count: 0,
        new_failure_count: 0,
        warning: `Pattern not found: ${parsed.data.pattern_id}`,
      };
    }

    // Create updated pattern (append new entry, don't mutate)
    const now = new Date().toISOString();
    const updated: SuccessPattern = {
      ...existing,
      success_count: existing.success_count + (parsed.data.success ? 1 : 0),
      failure_count: existing.failure_count + (parsed.data.success ? 0 : 1),
      last_used_at: now,
      last_verified_at: now,
      // Upgrade confidence if success count reaches threshold
      confidence:
        existing.success_count + (parsed.data.success ? 1 : 0) >= 3
          ? "high"
          : existing.confidence,
    };

    const line = JSON.stringify(updated);
    const writeResult = this.atomicAppend(line);

    if (writeResult.ok) {
      this.patterns.set(updated.pattern_id, updated);
    }

    return {
      ok: writeResult.ok,
      pattern_id: updated.pattern_id,
      new_success_count: updated.success_count,
      new_failure_count: updated.failure_count,
      warning: writeResult.warning,
    };
  }

  /**
   * Get statistics about the pattern bank
   */
  stats(): StatsResult {
    this.loadPatterns();

    const byCategory: Record<string, number> = {};
    const byConfidence: Record<string, number> = {};
    const keywordCounts: Map<string, number> = new Map();

    for (const pattern of this.patterns.values()) {
      // Count by category
      byCategory[pattern.task_category] = (byCategory[pattern.task_category] || 0) + 1;

      // Count by confidence
      byConfidence[pattern.confidence] = (byConfidence[pattern.confidence] || 0) + 1;

      // Count keywords
      for (const kw of pattern.task_keywords) {
        const normalized = kw.toLowerCase();
        keywordCounts.set(normalized, (keywordCounts.get(normalized) || 0) + 1);
      }
    }

    // Get top 10 keywords
    const topKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    return {
      ok: true,
      total_patterns: this.patterns.size,
      by_category: byCategory,
      by_confidence: byConfidence,
      top_keywords: topKeywords,
    };
  }

  /**
   * Find patterns similar to a task description
   */
  findSimilar(taskDescription: string, limit = 5): QueryResult {
    // Extract keywords from description (words > 3 chars)
    const words = taskDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 10);

    // No extractable keywords = no matches
    if (words.length === 0) {
      return { ok: true, patterns: [], total: 0 };
    }

    return this.query({
      keywords: words,
      limit,
      min_confidence: "low",
    });
  }

  /**
   * Clear in-memory cache (for testing)
   */
  clearCache(): void {
    this.patterns.clear();
    this.keywordIndex.clear();
    this.loaded = false;
  }
}

// Singleton export
export const successPatternBankEngine = new SuccessPatternBankEngine();
