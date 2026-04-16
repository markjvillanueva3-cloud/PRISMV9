/**
 * AwarenessQueryEngine — Fast In-Memory Asset Awareness Cache
 *
 * Phase 0.2 from AGI proximity plan. Provides O(1) and O(log n) lookups for:
 * - Asset existence checks
 * - Similar asset discovery
 * - Dependency graph queries
 * - Invocation telemetry
 *
 * All methods target <100ms p99 latency via indexed Maps.
 * Loaded on SessionStart, invalidated by CrossTerminalBroadcastEngine.
 *
 * @module engines/AwarenessQueryEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ============================================================================
// TYPES
// ============================================================================

export type AssetType =
  | "engine"
  | "formula"
  | "algorithm"
  | "action"
  | "dispatcher"
  | "skill"
  | "hook"
  | "tribal_tip"
  | "playbook_rule"
  | "extraction";

export interface AssetEntry {
  type: AssetType;
  name: string;
  normalizedName: string;
  path?: string;
  description: string;
  keywords: string[];
  createdAt?: string;
  lastInvoked?: string;
  invocationCount?: number;
}

export interface SimilarityMatch {
  asset: AssetEntry;
  similarity: number;
  matchType: "exact" | "keyword" | "fuzzy";
}

export interface DependencyInfo {
  file: string;
  dependents: string[];
  dependencies: string[];
}

export interface InvocationRecord {
  assetName: string;
  assetType: AssetType;
  timestamp: string;
  sessionId: string;
}

// ============================================================================
// CACHE STATE
// ============================================================================

interface AwarenessCache {
  assets: Map<string, AssetEntry>; // normalized name → asset
  byType: Map<AssetType, Set<string>>; // type → set of normalized names
  byKeyword: Map<string, Set<string>>; // keyword → set of normalized names
  dependencies: Map<string, DependencyInfo>; // file path → dependency info
  invocations: InvocationRecord[]; // ring buffer of recent invocations
  loadedAt: number;
}

let CACHE: AwarenessCache | null = null;
const CACHE_TTL_MS = 300000; // 5 minutes
const MAX_INVOCATION_RECORDS = 1000;

// ============================================================================
// ENGINE
// ============================================================================

export class AwarenessQueryEngine {
  private baseDir: string;
  private registryPath: string;

  constructor() {
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    this.registryPath = path.join(this.baseDir, "data", "state", "cross-session-asset-registry.json");
    log.info("[AwarenessQuery] Initialized — fast in-memory asset cache");
  }

  // ============================================================================
  // CORE QUERY METHODS (all <100ms target)
  // ============================================================================

  /**
   * Check if an asset exists by type and name
   * O(1) lookup via Map
   */
  async exists(type: AssetType, name: string): Promise<boolean> {
    const cache = await this.ensureLoaded();
    const normalized = this.normalize(name);

    // Check type-specific index first
    const typeSet = cache.byType.get(type);
    if (!typeSet) return false;

    // Check exact match
    if (typeSet.has(normalized)) return true;

    // Check with common suffixes removed
    const baseName = normalized.replace(/engine$|algorithm$|formula$/, "");
    for (const entry of typeSet) {
      if (entry === baseName || entry.replace(/engine$|algorithm$|formula$/, "") === baseName) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find assets similar to given keywords
   * O(k * m) where k = keywords, m = matches per keyword
   */
  async findSimilar(keywords: string[], types?: AssetType[], limit = 10): Promise<SimilarityMatch[]> {
    const cache = await this.ensureLoaded();
    const normalizedKeywords = keywords.map((k) => this.normalize(k));
    const matches: Map<string, SimilarityMatch> = new Map();

    // Keyword-based matching
    for (const keyword of normalizedKeywords) {
      const keywordMatches = cache.byKeyword.get(keyword);
      if (keywordMatches) {
        for (const normalizedName of keywordMatches) {
          const asset = cache.assets.get(normalizedName);
          if (!asset) continue;
          if (types && !types.includes(asset.type)) continue;

          const existing = matches.get(normalizedName);
          const keywordScore = 1 / normalizedKeywords.length;
          if (existing) {
            existing.similarity += keywordScore;
          } else {
            matches.set(normalizedName, {
              asset,
              similarity: keywordScore,
              matchType: "keyword",
            });
          }
        }
      }
    }

    // Fuzzy matching for unmatched keywords
    const joinedQuery = normalizedKeywords.join("");
    for (const [normalizedName, asset] of cache.assets) {
      if (types && !types.includes(asset.type)) continue;
      if (matches.has(normalizedName)) continue;

      const similarity = this.calculateSimilarity(joinedQuery, normalizedName);
      if (similarity >= 0.75) { // Higher threshold to avoid false positives
        matches.set(normalizedName, {
          asset,
          similarity,
          matchType: "fuzzy",
        });
      }
    }

    // Sort by similarity and return top matches
    return Array.from(matches.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Find all assets that depend on a file
   * O(1) lookup via Map
   */
  async dependents(filePath: string): Promise<string[]> {
    const cache = await this.ensureLoaded();
    const normalized = this.normalizePath(filePath);
    const info = cache.dependencies.get(normalized);
    return info?.dependents || [];
  }

  /**
   * Find all files that a given file depends on
   * O(1) lookup via Map
   */
  async dependencies(filePath: string): Promise<string[]> {
    const cache = await this.ensureLoaded();
    const normalized = this.normalizePath(filePath);
    const info = cache.dependencies.get(normalized);
    return info?.dependencies || [];
  }

  /**
   * Get last invocation timestamp for an asset
   * O(n) where n = invocation records (capped at MAX_INVOCATION_RECORDS)
   */
  async lastInvoked(name: string): Promise<string | null> {
    const cache = await this.ensureLoaded();
    const normalized = this.normalize(name);

    for (let i = cache.invocations.length - 1; i >= 0; i--) {
      const record = cache.invocations[i];
      if (this.normalize(record.assetName) === normalized) {
        return record.timestamp;
      }
    }

    return null;
  }

  /**
   * Record an invocation for telemetry
   */
  async recordInvocation(assetName: string, assetType: AssetType): Promise<void> {
    const cache = await this.ensureLoaded();
    const record: InvocationRecord = {
      assetName,
      assetType,
      timestamp: new Date().toISOString(),
      sessionId: process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`,
    };

    cache.invocations.push(record);

    // Ring buffer: remove oldest if over limit
    if (cache.invocations.length > MAX_INVOCATION_RECORDS) {
      cache.invocations.shift();
    }

    // Persist async (don't block)
    this.persistInvocations(cache.invocations).catch((err) => {
      log.warn(`[AwarenessQuery] Failed to persist invocations: ${err}`);
    });
  }

  // ============================================================================
  // BULK QUERY METHODS
  // ============================================================================

  /**
   * Get all assets of a specific type
   */
  async getByType(type: AssetType): Promise<AssetEntry[]> {
    const cache = await this.ensureLoaded();
    const typeSet = cache.byType.get(type);
    if (!typeSet) return [];

    return Array.from(typeSet)
      .map((name) => cache.assets.get(name))
      .filter((a): a is AssetEntry => a !== undefined);
  }

  /**
   * Get asset counts by type
   */
  async getCounts(): Promise<Record<AssetType, number>> {
    const cache = await this.ensureLoaded();
    const counts: Record<string, number> = {};

    for (const [type, set] of cache.byType) {
      counts[type] = set.size;
    }

    return counts as Record<AssetType, number>;
  }

  /**
   * Get compact summary for session injection
   */
  async getCompactSummary(): Promise<string> {
    const counts = await this.getCounts();
    const lines: string[] = [];

    lines.push("# PRISM Asset Awareness");
    for (const [type, count] of Object.entries(counts)) {
      if (count > 0) {
        lines.push(`${type}: ${count}`);
      }
    }

    return lines.join("\n");
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Force reload cache (called by CrossTerminalBroadcastEngine on change)
   */
  async invalidateAndReload(): Promise<void> {
    CACHE = null;
    await this.ensureLoaded();
    log.info("[AwarenessQuery] Cache invalidated and reloaded");
  }

  /**
   * Check if cache is fresh
   */
  isCacheFresh(): boolean {
    if (!CACHE) return false;
    return Date.now() - CACHE.loadedAt < CACHE_TTL_MS;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async ensureLoaded(): Promise<AwarenessCache> {
    if (CACHE && Date.now() - CACHE.loadedAt < CACHE_TTL_MS) {
      return CACHE;
    }

    log.info("[AwarenessQuery] Loading cache...");

    const cache: AwarenessCache = {
      assets: new Map(),
      byType: new Map(),
      byKeyword: new Map(),
      dependencies: new Map(),
      invocations: [],
      loadedAt: Date.now(),
    };

    // Load from cross-session registry
    await this.loadFromRegistry(cache);

    // Load engines from file system
    await this.loadEnginesFromFS(cache);

    // Load dependency graph
    await this.loadDependencyGraph(cache);

    // Load invocation telemetry
    await this.loadInvocations(cache);

    CACHE = cache;
    log.info(`[AwarenessQuery] Loaded ${cache.assets.size} assets`);

    return cache;
  }

  private async loadFromRegistry(cache: AwarenessCache): Promise<void> {
    try {
      if (!fs.existsSync(this.registryPath)) return;

      const content = JSON.parse(fs.readFileSync(this.registryPath, "utf-8"));
      for (const entry of content.entries || []) {
        this.addToCache(cache, {
          type: entry.type as AssetType,
          name: entry.name,
          normalizedName: this.normalize(entry.name),
          path: entry.path,
          description: entry.description || "",
          keywords: this.extractKeywords(entry.name, entry.description || ""),
          createdAt: entry.createdAt,
        });
      }
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to load registry: ${err}`);
    }
  }

  private async loadEnginesFromFS(cache: AwarenessCache): Promise<void> {
    const enginesDir = path.join(this.baseDir, "src", "engines");
    try {
      const files = fs.readdirSync(enginesDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

      for (const file of files) {
        const name = file.replace(".ts", "");
        const normalized = this.normalize(name);

        if (!cache.assets.has(normalized)) {
          this.addToCache(cache, {
            type: "engine",
            name,
            normalizedName: normalized,
            path: `src/engines/${file}`,
            description: this.generateDescription(name),
            keywords: this.extractKeywords(name, ""),
          });
        }
      }
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to load engines from FS: ${err}`);
    }
  }

  private async loadDependencyGraph(cache: AwarenessCache): Promise<void> {
    const graphPath = path.join(this.baseDir, "data", "state", "DEP_GRAPH.json");
    try {
      if (!fs.existsSync(graphPath)) return;

      const content = JSON.parse(fs.readFileSync(graphPath, "utf-8"));
      for (const [file, info] of Object.entries(content.files || {})) {
        cache.dependencies.set(this.normalizePath(file), info as DependencyInfo);
      }
    } catch {
      // Graph doesn't exist yet, that's OK
    }
  }

  private async loadInvocations(cache: AwarenessCache): Promise<void> {
    const telemetryPath = path.join(this.baseDir, "data", "state", "INVOCATION_TELEMETRY.json");
    try {
      if (!fs.existsSync(telemetryPath)) return;

      const content = JSON.parse(fs.readFileSync(telemetryPath, "utf-8"));
      cache.invocations = (content.records || []).slice(-MAX_INVOCATION_RECORDS);
    } catch {
      // Telemetry doesn't exist yet
    }
  }

  private async persistInvocations(invocations: InvocationRecord[]): Promise<void> {
    const telemetryPath = path.join(this.baseDir, "data", "state", "INVOCATION_TELEMETRY.json");
    const content = {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      records: invocations.slice(-MAX_INVOCATION_RECORDS),
    };

    const dir = path.dirname(telemetryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(telemetryPath, JSON.stringify(content, null, 2));
  }

  private addToCache(cache: AwarenessCache, asset: AssetEntry): void {
    cache.assets.set(asset.normalizedName, asset);

    // Index by type
    if (!cache.byType.has(asset.type)) {
      cache.byType.set(asset.type, new Set());
    }
    cache.byType.get(asset.type)!.add(asset.normalizedName);

    // Index by keywords
    for (const keyword of asset.keywords) {
      if (!cache.byKeyword.has(keyword)) {
        cache.byKeyword.set(keyword, new Set());
      }
      cache.byKeyword.get(keyword)!.add(asset.normalizedName);
    }
  }

  private normalize(name: string): string {
    return name
      .toLowerCase()
      .replace(/engine$/i, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/").toLowerCase();
  }

  private extractKeywords(name: string, description: string): string[] {
    const text = `${name} ${description}`.toLowerCase();
    const words = text.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    return [...new Set(words)];
  }

  private generateDescription(name: string): string {
    return name
      .replace(/Engine$/, "")
      .replace(/([A-Z])/g, " $1")
      .trim();
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Jaccard similarity on characters
    const setA = new Set(a.split(""));
    const setB = new Set(b.split(""));
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const awarenessQueryEngine = new AwarenessQueryEngine();
