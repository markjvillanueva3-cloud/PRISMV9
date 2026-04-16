/**
 * AgentMemoryFabricEngine — Cross-Session Memory for PRISM Agent
 *
 * AGENT ROADMAP: U-AGT04 (MS2)
 *
 * Persistent memory fabric that survives across sessions and compactions.
 * Stores learned facts, user preferences, shop-specific knowledge, and
 * conversation context that should persist.
 *
 * Memory Types:
 * - facts: Learned truths about the shop/machines/materials
 * - preferences: User preferences and working styles
 * - corrections: Past mistakes and their fixes
 * - context: Important context from prior sessions
 *
 * @module engines/AgentMemoryFabricEngine
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";

/**
 * A single memory entry
 */
export interface MemoryEntry {
  /** Unique identifier */
  id: string;
  /** Memory type */
  type: "fact" | "preference" | "correction" | "context" | "tribal";
  /** The memory content */
  content: string;
  /** Source of the memory (user, inference, system) */
  source: "user" | "inference" | "system" | "correction";
  /** Confidence level 0-1 */
  confidence: number;
  /** Number of times this memory was reinforced */
  reinforcements: number;
  /** Related entity (machine, material, customer, etc.) */
  relatedEntity?: string;
  /** Tags for categorization */
  tags: string[];
  /** When created */
  createdAt: string;
  /** When last accessed */
  lastAccessedAt: string;
  /** When last reinforced */
  lastReinforcedAt?: string;
  /** Expiration time (null = never) */
  expiresAt?: string;
  /** Priority for context injection (higher = more important) */
  priority: number;
}

/**
 * Memory store structure
 */
export interface MemoryStore {
  /** Schema version */
  version: string;
  /** Shop/tenant ID */
  shopId: string;
  /** All memories */
  memories: MemoryEntry[];
  /** Last sync time */
  lastSyncAt: string;
  /** Total memory count by type */
  counts: Record<string, number>;
}

/**
 * Memory query options
 */
export interface MemoryQuery {
  /** Filter by type */
  type?: MemoryEntry["type"];
  /** Filter by tags */
  tags?: string[];
  /** Filter by related entity */
  relatedEntity?: string;
  /** Minimum confidence */
  minConfidence?: number;
  /** Maximum age in days */
  maxAgeDays?: number;
  /** Limit results */
  limit?: number;
  /** Sort by field */
  sortBy?: "priority" | "confidence" | "createdAt" | "lastAccessedAt";
  /** Sort order */
  sortOrder?: "asc" | "desc";
}

/**
 * AgentMemoryFabricEngine — Persistent cross-session memory
 */
export class AgentMemoryFabricEngine {
  private store: MemoryStore | null = null;
  private storePath: string;
  private dirty = false;
  private autoSaveIntervalMs = 30000; // 30 seconds
  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor(storePath?: string) {
    this.storePath =
      storePath ||
      join(process.cwd(), "data", "state", "agent-memory.json");
  }

  /**
   * Initialize the memory store
   */
  async initialize(shopId = "default"): Promise<void> {
    if (this.store) return;

    try {
      if (existsSync(this.storePath)) {
        const content = await readFile(this.storePath, "utf-8");
        this.store = JSON.parse(content);
      } else {
        this.store = this.createEmptyStore(shopId);
        await this.save();
      }
    } catch {
      this.store = this.createEmptyStore(shopId);
    }

    // Start auto-save
    this.startAutoSave();
  }

  /**
   * Create empty store
   */
  private createEmptyStore(shopId: string): MemoryStore {
    return {
      version: "1.0.0",
      shopId,
      memories: [],
      lastSyncAt: new Date().toISOString(),
      counts: {},
    };
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) return;
    this.autoSaveTimer = setInterval(async () => {
      if (this.dirty) {
        await this.save();
      }
    }, this.autoSaveIntervalMs);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Save store to disk
   */
  async save(): Promise<void> {
    if (!this.store) return;

    this.store.lastSyncAt = new Date().toISOString();
    this.updateCounts();

    const dir = dirname(this.storePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(
      this.storePath,
      JSON.stringify(this.store, null, 2),
      "utf-8"
    );
    this.dirty = false;
  }

  /**
   * Update counts
   */
  private updateCounts(): void {
    if (!this.store) return;

    const counts: Record<string, number> = {};
    for (const mem of this.store.memories) {
      counts[mem.type] = (counts[mem.type] || 0) + 1;
    }
    this.store.counts = counts;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Remember a fact
   */
  async rememberFact(
    content: string,
    options: {
      relatedEntity?: string;
      tags?: string[];
      confidence?: number;
      priority?: number;
      source?: MemoryEntry["source"];
    } = {}
  ): Promise<MemoryEntry> {
    await this.initialize();

    const entry: MemoryEntry = {
      id: this.generateId(),
      type: "fact",
      content,
      source: options.source || "user",
      confidence: options.confidence ?? 0.8,
      reinforcements: 0,
      relatedEntity: options.relatedEntity,
      tags: options.tags || [],
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      priority: options.priority ?? 5,
    };

    this.store!.memories.push(entry);
    this.dirty = true;

    return entry;
  }

  /**
   * Remember a user preference
   */
  async rememberPreference(
    content: string,
    options: {
      tags?: string[];
      priority?: number;
    } = {}
  ): Promise<MemoryEntry> {
    await this.initialize();

    const entry: MemoryEntry = {
      id: this.generateId(),
      type: "preference",
      content,
      source: "user",
      confidence: 1.0, // Preferences are always confident
      reinforcements: 0,
      tags: options.tags || [],
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      priority: options.priority ?? 8, // High priority
    };

    this.store!.memories.push(entry);
    this.dirty = true;

    return entry;
  }

  /**
   * Remember a correction (learning from mistakes)
   */
  async rememberCorrection(
    wrongAnswer: string,
    correctAnswer: string,
    context: string,
    options: {
      relatedEntity?: string;
      tags?: string[];
    } = {}
  ): Promise<MemoryEntry> {
    await this.initialize();

    const content = JSON.stringify({
      wrong: wrongAnswer,
      correct: correctAnswer,
      context,
    });

    const entry: MemoryEntry = {
      id: this.generateId(),
      type: "correction",
      content,
      source: "correction",
      confidence: 1.0,
      reinforcements: 0,
      relatedEntity: options.relatedEntity,
      tags: options.tags || ["mistake", "learning"],
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      priority: 9, // Very high priority
    };

    this.store!.memories.push(entry);
    this.dirty = true;

    return entry;
  }

  /**
   * Remember context from conversation
   */
  async rememberContext(
    content: string,
    options: {
      expiresInDays?: number;
      tags?: string[];
      priority?: number;
    } = {}
  ): Promise<MemoryEntry> {
    await this.initialize();

    const entry: MemoryEntry = {
      id: this.generateId(),
      type: "context",
      content,
      source: "system",
      confidence: 0.9,
      reinforcements: 0,
      tags: options.tags || [],
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      priority: options.priority ?? 6,
    };

    if (options.expiresInDays) {
      const expires = new Date();
      expires.setDate(expires.getDate() + options.expiresInDays);
      entry.expiresAt = expires.toISOString();
    }

    this.store!.memories.push(entry);
    this.dirty = true;

    return entry;
  }

  /**
   * Remember tribal knowledge
   */
  async rememberTribal(
    content: string,
    options: {
      relatedEntity?: string;
      tags?: string[];
      source?: MemoryEntry["source"];
    } = {}
  ): Promise<MemoryEntry> {
    await this.initialize();

    const entry: MemoryEntry = {
      id: this.generateId(),
      type: "tribal",
      content,
      source: options.source || "user",
      confidence: 0.85,
      reinforcements: 0,
      relatedEntity: options.relatedEntity,
      tags: options.tags || ["tribal"],
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      priority: 7,
    };

    this.store!.memories.push(entry);
    this.dirty = true;

    return entry;
  }

  /**
   * Query memories
   */
  async query(options: MemoryQuery = {}): Promise<MemoryEntry[]> {
    await this.initialize();

    let results = [...this.store!.memories];

    // Filter by type
    if (options.type) {
      results = results.filter((m) => m.type === options.type);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter((m) =>
        options.tags!.some((t) => m.tags.includes(t))
      );
    }

    // Filter by related entity
    if (options.relatedEntity) {
      results = results.filter(
        (m) =>
          m.relatedEntity?.toLowerCase() ===
          options.relatedEntity!.toLowerCase()
      );
    }

    // Filter by confidence
    if (options.minConfidence !== undefined) {
      results = results.filter((m) => m.confidence >= options.minConfidence!);
    }

    // Filter by age
    if (options.maxAgeDays !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - options.maxAgeDays);
      results = results.filter(
        (m) => new Date(m.createdAt) >= cutoff
      );
    }

    // Filter out expired
    const now = new Date();
    results = results.filter(
      (m) => !m.expiresAt || new Date(m.expiresAt) > now
    );

    // Sort
    const sortBy = options.sortBy || "priority";
    const sortOrder = options.sortOrder || "desc";
    results.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortBy) {
        case "priority":
          aVal = a.priority;
          bVal = b.priority;
          break;
        case "confidence":
          aVal = a.confidence;
          bVal = b.confidence;
          break;
        case "createdAt":
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case "lastAccessedAt":
          aVal = a.lastAccessedAt;
          bVal = b.lastAccessedAt;
          break;
        default:
          aVal = a.priority;
          bVal = b.priority;
      }

      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return bVal < aVal ? -1 : bVal > aVal ? 1 : 0;
      }
    });

    // Limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    // Update access times
    const resultIds = new Set(results.map((r) => r.id));
    for (const mem of this.store!.memories) {
      if (resultIds.has(mem.id)) {
        mem.lastAccessedAt = new Date().toISOString();
      }
    }
    this.dirty = true;

    return results;
  }

  /**
   * Search memories by content
   */
  async search(
    query: string,
    options: { limit?: number; type?: MemoryEntry["type"] } = {}
  ): Promise<MemoryEntry[]> {
    await this.initialize();

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 1);

    let results = this.store!.memories.filter((m) => {
      const contentLower = m.content.toLowerCase();
      return queryTerms.some((term) => contentLower.includes(term));
    });

    if (options.type) {
      results = results.filter((m) => m.type === options.type);
    }

    // Score by number of matching terms
    const scored = results.map((m) => {
      const contentLower = m.content.toLowerCase();
      const matchCount = queryTerms.filter((t) =>
        contentLower.includes(t)
      ).length;
      return { memory: m, score: matchCount + m.priority / 10 };
    });

    scored.sort((a, b) => b.score - a.score);

    const limit = options.limit || 20;
    return scored.slice(0, limit).map((s) => s.memory);
  }

  /**
   * Reinforce a memory (increases confidence)
   */
  async reinforce(memoryId: string): Promise<MemoryEntry | null> {
    await this.initialize();

    const memory = this.store!.memories.find((m) => m.id === memoryId);
    if (!memory) return null;

    memory.reinforcements++;
    memory.confidence = Math.min(1.0, memory.confidence + 0.05);
    memory.lastReinforcedAt = new Date().toISOString();
    memory.lastAccessedAt = new Date().toISOString();
    this.dirty = true;

    return memory;
  }

  /**
   * Forget a memory
   */
  async forget(memoryId: string): Promise<boolean> {
    await this.initialize();

    const index = this.store!.memories.findIndex((m) => m.id === memoryId);
    if (index === -1) return false;

    this.store!.memories.splice(index, 1);
    this.dirty = true;

    return true;
  }

  /**
   * Get memories for context injection
   */
  async getForContextInjection(
    maxTokens = 1000
  ): Promise<{ memories: MemoryEntry[]; summary: string }> {
    await this.initialize();

    // Get high-priority, recent, confident memories
    const memories = await this.query({
      minConfidence: 0.7,
      sortBy: "priority",
      sortOrder: "desc",
      limit: 50,
    });

    // Estimate tokens (4 chars = 1 token)
    let currentTokens = 0;
    const selected: MemoryEntry[] = [];

    for (const mem of memories) {
      const memTokens = Math.ceil(mem.content.length / 4);
      if (currentTokens + memTokens > maxTokens) break;
      selected.push(mem);
      currentTokens += memTokens;
    }

    // Build summary
    const byType: Record<string, number> = {};
    for (const m of selected) {
      byType[m.type] = (byType[m.type] || 0) + 1;
    }

    const summary = Object.entries(byType)
      .map(([t, c]) => `${c} ${t}s`)
      .join(", ");

    return { memories: selected, summary: `Loaded ${selected.length} memories: ${summary}` };
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    avgConfidence: number;
    oldestMemory: string | null;
    newestMemory: string | null;
  }> {
    await this.initialize();

    const memories = this.store!.memories;
    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const m of memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
      totalConfidence += m.confidence;
    }

    const sorted = [...memories].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      total: memories.length,
      byType,
      avgConfidence:
        memories.length > 0 ? totalConfidence / memories.length : 0,
      oldestMemory: sorted[0]?.createdAt || null,
      newestMemory: sorted[sorted.length - 1]?.createdAt || null,
    };
  }

  /**
   * Clear all memories (dangerous!)
   */
  async clearAll(): Promise<void> {
    await this.initialize();
    this.store!.memories = [];
    this.dirty = true;
    await this.save();
  }

  /**
   * Export memories for backup
   */
  async export(): Promise<MemoryStore> {
    await this.initialize();
    return JSON.parse(JSON.stringify(this.store));
  }

  /**
   * Import memories from backup
   */
  async import(store: MemoryStore): Promise<void> {
    this.store = store;
    this.dirty = true;
    await this.save();
  }
}

// Export singleton
export const agentMemoryFabricEngine = new AgentMemoryFabricEngine();
