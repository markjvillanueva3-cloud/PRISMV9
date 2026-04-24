/**
 * OutputCacheEngine
 *
 * Stores and retrieves reusable text blocks to save output tokens.
 * Instead of regenerating common patterns, reference cached templates.
 *
 * Token savings: ~15 tokens (reference) vs ~500 tokens (regenerate) = 97% savings
 */

import { existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { atomicWriteJson, safeReadJson, snapshotLastGood } from "../utils/atomicSessionWrite.js";

export interface CachedBlock {
  id: string;
  hash: string;
  content: string;
  category: BlockCategory;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
  tokens: number;
}

export type BlockCategory =
  | "summary"
  | "explanation"
  | "code_pattern"
  | "error_response"
  | "status_update"
  | "commit_message"
  | "pr_description"
  | "test_template"
  | "other";

interface CacheState {
  blocks: Record<string, CachedBlock>;
  stats: {
    totalSaved: number;
    totalHits: number;
    totalMisses: number;
  };
}

// SHARED-STATE: All sessions benefit from the same cache - more sessions = better cache hits
const STATE_FILE = "H:/prism/state/output-cache.json";
const MAX_BLOCKS = 500;
const MIN_CONTENT_LENGTH = 50;
const MAX_CONTENT_LENGTH = 5000;

export class OutputCacheEngine {
  private state: CacheState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): CacheState {
    const fallback: CacheState = {
      blocks: {},
      stats: { totalSaved: 0, totalHits: 0, totalMisses: 0 },
    };
    const loaded = safeReadJson<CacheState>(STATE_FILE, fallback);
    if (loaded !== fallback) snapshotLastGood(STATE_FILE, loaded);
    return loaded;
  }

  private saveState(): void {
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    atomicWriteJson(STATE_FILE, this.state);
  }

  private hash(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
  }

  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  private detectCategory(content: string): BlockCategory {
    const lower = content.toLowerCase();
    if (lower.includes("summary") || lower.includes("completed")) return "summary";
    if (lower.includes("error") || lower.includes("failed")) return "error_response";
    if (lower.includes("```") || lower.includes("function") || lower.includes("class")) return "code_pattern";
    if (lower.includes("commit") || lower.includes("co-authored")) return "commit_message";
    if (lower.includes("## summary") || lower.includes("pull request")) return "pr_description";
    if (lower.includes("describe(") || lower.includes("it(") || lower.includes("expect(")) return "test_template";
    if (lower.includes("status") || lower.includes("progress")) return "status_update";
    if (lower.includes("because") || lower.includes("means") || lower.includes("works by")) return "explanation";
    return "other";
  }

  /**
   * Store a text block for future reuse
   */
  store(content: string, category?: BlockCategory): CachedBlock | null {
    if (content.length < MIN_CONTENT_LENGTH || content.length > MAX_CONTENT_LENGTH) {
      return null;
    }

    const hash = this.hash(content);

    // Check if already exists
    if (this.state.blocks[hash]) {
      this.state.blocks[hash].usageCount++;
      this.state.blocks[hash].lastUsed = new Date().toISOString();
      this.saveState();
      return this.state.blocks[hash];
    }

    // Prune if at capacity
    if (Object.keys(this.state.blocks).length >= MAX_BLOCKS) {
      this.pruneOldest();
    }

    const block: CachedBlock = {
      id: `blk_${hash.slice(0, 8)}`,
      hash,
      content,
      category: category || this.detectCategory(content),
      usageCount: 1,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tokens: this.estimateTokens(content),
    };

    this.state.blocks[hash] = block;
    this.saveState();
    return block;
  }

  /**
   * Retrieve a block by ID or hash
   */
  get(idOrHash: string): CachedBlock | null {
    // Try direct hash lookup
    if (this.state.blocks[idOrHash]) {
      const block = this.state.blocks[idOrHash];
      block.usageCount++;
      block.lastUsed = new Date().toISOString();
      this.state.stats.totalHits++;
      this.state.stats.totalSaved += block.tokens;
      this.saveState();
      return block;
    }

    // Try ID lookup
    for (const block of Object.values(this.state.blocks)) {
      if (block.id === idOrHash) {
        block.usageCount++;
        block.lastUsed = new Date().toISOString();
        this.state.stats.totalHits++;
        this.state.stats.totalSaved += block.tokens;
        this.saveState();
        return block;
      }
    }

    this.state.stats.totalMisses++;
    this.saveState();
    return null;
  }

  /**
   * Find similar blocks by content hash prefix or category
   */
  find(query: { category?: BlockCategory; hashPrefix?: string; limit?: number }): CachedBlock[] {
    const { category, hashPrefix, limit = 10 } = query;
    let results = Object.values(this.state.blocks);

    if (category) {
      results = results.filter((b) => b.category === category);
    }

    if (hashPrefix) {
      results = results.filter((b) => b.hash.startsWith(hashPrefix));
    }

    return results
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get reference string for a block (what Claude outputs instead of full content)
   */
  getReference(block: CachedBlock): string {
    return `[CACHED:${block.id}]`;
  }

  /**
   * Expand a reference back to full content
   */
  expandReference(ref: string): string | null {
    const match = ref.match(/\[CACHED:(blk_[a-f0-9]+)\]/);
    if (!match) return null;
    const block = this.get(match[1]);
    return block?.content || null;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalBlocks: number;
    totalTokensCached: number;
    totalTokensSaved: number;
    hitRate: number;
    topCategories: Array<{ category: BlockCategory; count: number }>;
  } {
    const blocks = Object.values(this.state.blocks);
    const totalTokensCached = blocks.reduce((sum, b) => sum + b.tokens, 0);
    const totalRequests = this.state.stats.totalHits + this.state.stats.totalMisses;

    const categoryCount: Record<string, number> = {};
    for (const block of blocks) {
      categoryCount[block.category] = (categoryCount[block.category] || 0) + 1;
    }

    return {
      totalBlocks: blocks.length,
      totalTokensCached,
      totalTokensSaved: this.state.stats.totalSaved,
      hitRate: totalRequests > 0 ? this.state.stats.totalHits / totalRequests : 0,
      topCategories: Object.entries(categoryCount)
        .map(([category, count]) => ({ category: category as BlockCategory, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  /**
   * Prune least-used blocks when at capacity
   */
  private pruneOldest(): void {
    const blocks = Object.entries(this.state.blocks)
      .sort(([, a], [, b]) => {
        // Score: usageCount * recency
        const aScore = a.usageCount * (1 / (Date.now() - new Date(a.lastUsed).getTime()));
        const bScore = b.usageCount * (1 / (Date.now() - new Date(b.lastUsed).getTime()));
        return aScore - bScore;
      });

    // Remove bottom 10%
    const toRemove = Math.ceil(blocks.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      delete this.state.blocks[blocks[i][0]];
    }
  }

  /**
   * Clear all cached blocks
   */
  reset(): void {
    this.state = {
      blocks: {},
      stats: { totalSaved: 0, totalHits: 0, totalMisses: 0 },
    };
    this.saveState();
  }
}

export const outputCacheEngine = new OutputCacheEngine();
