// @ts-nocheck
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
// ENGINE USAGE INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface EngineUsage {
  dispatchers: string[];
  actions: string[];
  skills: string[];
  hooks: string[];
  tests: string[];
  routes: string[];
  formulas: string[];
  tipsReferencing: string[];
}

interface EngineUsageIndex {
  schemaVersion: number;
  lastUpdated: string;
  engineCount: number;
  engines: Record<string, EngineUsage>;
}

// ============================================================================
// ACTION RESOLUTION INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface ActionResolution {
  dispatcher: string;
  engines: string[];
  inputSchema: string | null;
  outputType: string | null;
  skills: string[];
  tests: string[];
}

interface ActionResolutionIndex {
  schemaVersion: number;
  lastUpdated: string;
  actionCount: number;
  actions: Record<string, ActionResolution>;
}

// ============================================================================
// SKILL MANIFEST INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface SkillManifest {
  file: string;
  name: string;
  description: string;
  version: string | null;
  engines: string[];
  actions: string[];
  hooks: string[];
  dispatchers: string[];
  sha256: string;
  lineCount: number;
}

interface SkillManifestIndex {
  schemaVersion: number;
  lastUpdated: string;
  skillCount: number;
  skills: Record<string, SkillManifest>;
}

// ============================================================================
// HOOK GUARD INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface HookGuard {
  hookFile: string;
  hookType: "PreToolUse" | "PostToolUse" | "PreCompact" | "SessionStart" | "Other";
  toolPattern: string | null;
  fileGlobs: string[];
  description: string;
}

interface HookGuardIndex {
  schemaVersion: number;
  lastUpdated: string;
  hookCount: number;
  guards: HookGuard[];
  byGlob: Record<string, string[]>;
}

// ============================================================================
// FORMULA PROVENANCE INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface FormulaProvenance {
  name: string;
  formulaId: string;
  domain: string;
  category: string;
  equation: string;
  references: string[];
  source: string | null;
  consumers: string[];
  enginesUsing: string[];
  sha256: string;
}

interface FormulaProvenanceIndex {
  schemaVersion: number;
  lastUpdated: string;
  formulaCount: number;
  formulas: Record<string, FormulaProvenance>;
  byDomain: Record<string, string[]>;
  byReference: Record<string, string[]>;
}

// ============================================================================
// TRIBAL TIP INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface TribalTipEntry {
  id: string;
  content: string;
  domain: string;
  source: string;
  keywords: string[];
  confidence: number;
  createdAt: string | null;
  sha256: string;
}

interface TribalTipIndex {
  schemaVersion: number;
  lastUpdated: string;
  tipCount: number;
  tips: Record<string, TribalTipEntry>;
  byDomain: Record<string, string[]>;
  byKeyword: Record<string, string[]>;
}

// ============================================================================
// DISPATCHER GRAPH INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface DispatcherNode {
  name: string;
  file: string;
  actions: string[];
  enginesCalled: string[];
  importsFrom: string[];
  exportedFunctions: string[];
  lineCount: number;
  sha256: string;
}

interface DispatcherGraphIndex {
  schemaVersion: number;
  lastUpdated: string;
  dispatcherCount: number;
  totalActions: number;
  dispatchers: Record<string, DispatcherNode>;
  byEngine: Record<string, string[]>;
  byAction: Record<string, string>;
}

// ============================================================================
// EXTRACTION INVERSE INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface ExtractionEntry {
  id: string;
  name: string;
  source: string;
  type: string;
  description: string;
  tipsGenerated: number;
  timestamp: string;
  status: string;
  supersededBy?: string;
  sha256: string;
}

interface ExtractionInverseIndex {
  schemaVersion: number;
  lastUpdated: string;
  extractionCount: number;
  totalTipsGenerated: number;
  extractions: Record<string, ExtractionEntry>;
  bySource: Record<string, string>;
  byType: Record<string, string[]>;
  byStatus: Record<string, string[]>;
}

// ============================================================================
// ALIAS TABLE INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface AliasEntry {
  alias: string;
  canonical: string;
  reason: string;
  deprecated: boolean;
  addedAt: string;
}

interface AliasTableIndex {
  schemaVersion: number;
  lastUpdated: string;
  aliasCount: number;
  aliases: Record<string, AliasEntry>;
  byCanonical: Record<string, string[]>;
}

// ============================================================================
// SIGNATURE HASH INDEX TYPES (from Universal 0.7)
// ============================================================================

export interface SignatureEntry {
  file: string;
  name: string;
  fullHash: string;
  normalizedHash: string;
  lineCount: number;
  byteSize: number;
  methodCount: number;
  exportCount: number;
}

export interface DuplicateGroup {
  hash: string;
  files: string[];
  type: "exact" | "normalized";
}

interface SignatureHashIndex {
  schemaVersion: number;
  lastUpdated: string;
  fileCount: number;
  uniqueHashes: number;
  duplicateGroups: number;
  signatures: Record<string, SignatureEntry>;
  byFullHash: Record<string, string[]>;
  byNormalizedHash: Record<string, string[]>;
  duplicates: DuplicateGroup[];
}

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

  // Synchronous variant — used by tests and any caller that already has the
  // cache loaded. Renamed from the shadowing `exists` overload (the duplicate
  // member silently shadowed the async version at runtime).
  existsSync(type: "engine" | "formula" | "algorithm", name: string): boolean {
    if (!this.cachedAssets) {
      this.loadCacheSync();
    }
    const normalized = this.normalize(name);
    const typeSet = this.cachedAssets?.byType.get(type as AssetType);
    if (!typeSet) return false;
    if (typeSet.has(normalized)) return true;
    const baseName = normalized.replace(/engine$|algorithm$|formula$/, "");
    for (const entry of typeSet) {
      if (entry === baseName || entry.replace(/engine$|algorithm$|formula$/, "") === baseName) {
        return true;
      }
    }
    return false;
  }

  private cachedAssets: AssetCache | null = null;

  private loadCacheSync(): void {
    if (this.cachedAssets) return;
    const cache: AssetCache = {
      assets: new Map(),
      byType: new Map(),
      byKeyword: new Map(),
      lastUpdated: Date.now(),
    };
    // Load engines from filesystem
    try {
      const enginesDir = path.join(process.cwd(), "src", "engines");
      const files = fs.readdirSync(enginesDir).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"));
      for (const file of files) {
        const name = file.replace(".ts", "");
        const normalized = this.normalize(name);
        cache.assets.set(normalized, {
          type: "engine",
          name,
          path: `src/engines/${file}`,
          description: name.replace(/Engine$/, "").replace(/([A-Z])/g, " $1").trim(),
          keywords: [],
          dependencies: [],
        });
        if (!cache.byType.has("engine")) cache.byType.set("engine", new Set());
        cache.byType.get("engine")!.add(normalized);
      }
    } catch {
      // Ignore errors
    }
    this.cachedAssets = cache;
  }

  /**
   * Find similar assets by keywords (synchronous)
   */
  findSimilar(keywords: string[]): CachedAsset[] {
    if (!this.cachedAssets) this.loadCacheSync();
    const results: CachedAsset[] = [];
    const normalizedKeywords = keywords.map(k => k.toLowerCase());
    for (const [, asset] of this.cachedAssets?.assets || []) {
      const nameLower = asset.name.toLowerCase();
      const descLower = (asset.description || "").toLowerCase();
      const matches = normalizedKeywords.filter(kw => nameLower.includes(kw) || descLower.includes(kw));
      if (matches.length > 0) results.push(asset);
    }
    return results.slice(0, 10);
  }

  /**
   * Get dependents of an engine
   */
  dependentsOf(engineName: string): string[] {
    // Return empty array - dependency tracking not implemented
    return [];
  }

  /**
   * Track last invocation time
   */
  lastInvokedAt(dispatcherName: string): Date | null {
    // Return null - invocation tracking not implemented
    return null;
  }

  /**
   * Find assets similar to given keywords (async)
   * O(k * m) where k = keywords, m = matches per keyword
   */
  async findSimilarAsync(keywords: string[], types?: AssetType[], limit = 10): Promise<SimilarityMatch[]> {
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
   * Find all consumers of an engine (Universal 0.7)
   * Reads from ENGINE_USAGE_INDEX.json built by build-engine-usage-index.ts
   * O(1) lookup via JSON key access
   */
  async dependentsOfEngine(engineName: string): Promise<EngineUsage | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "ENGINE_USAGE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] ENGINE_USAGE_INDEX.json not found — run build-engine-usage-index.ts");
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as EngineUsageIndex;

      // Try exact match first
      if (content.engines[engineName]) {
        return content.engines[engineName];
      }

      // Try with/without Engine suffix
      const withSuffix = engineName.endsWith("Engine") ? engineName : `${engineName}Engine`;
      const withoutSuffix = engineName.endsWith("Engine") ? engineName.slice(0, -6) : engineName;

      if (content.engines[withSuffix]) {
        return content.engines[withSuffix];
      }
      if (content.engines[withoutSuffix]) {
        return content.engines[withoutSuffix];
      }

      return null;
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read ENGINE_USAGE_INDEX: ${err}`);
      return null;
    }
  }

  /**
   * Get all engines that have no dispatcher consumers (potential orphans)
   * Useful for orphan detection and cleanup tasks
   */
  async getOrphanEngines(): Promise<string[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "ENGINE_USAGE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as EngineUsageIndex;
      const orphans: string[] = [];

      for (const [name, usage] of Object.entries(content.engines)) {
        if (
          usage.dispatchers.length === 0 &&
          usage.hooks.length === 0 &&
          usage.routes.length === 0
        ) {
          orphans.push(name);
        }
      }

      return orphans;
    } catch {
      return [];
    }
  }

  /**
   * Get engine coverage statistics
   */
  async getEngineCoverageStats(): Promise<{
    total: number;
    withDispatchers: number;
    withTests: number;
    orphans: number;
    coverageRatio: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "ENGINE_USAGE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { total: 0, withDispatchers: 0, withTests: 0, orphans: 0, coverageRatio: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as EngineUsageIndex;
      let withDispatchers = 0;
      let withTests = 0;
      let orphans = 0;

      for (const usage of Object.values(content.engines)) {
        if (usage.dispatchers.length > 0) withDispatchers++;
        if (usage.tests.length > 0) withTests++;
        if (
          usage.dispatchers.length === 0 &&
          usage.hooks.length === 0 &&
          usage.routes.length === 0
        ) {
          orphans++;
        }
      }

      const total = content.engineCount;
      const coverageRatio = total > 0 ? withDispatchers / total : 0;

      return { total, withDispatchers, withTests, orphans, coverageRatio };
    } catch {
      return { total: 0, withDispatchers: 0, withTests: 0, orphans: 0, coverageRatio: 0 };
    }
  }

  /**
   * Resolve an action to its components (Universal 0.7)
   * Reads from ACTION_RESOLUTION_INDEX.json built by build-action-resolution-index.ts
   */
  async resolveAction(actionId: string): Promise<ActionResolution | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "ACTION_RESOLUTION_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] ACTION_RESOLUTION_INDEX.json not found — run build-action-resolution-index.ts");
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as ActionResolutionIndex;
      return content.actions[actionId] || null;
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read ACTION_RESOLUTION_INDEX: ${err}`);
      return null;
    }
  }

  /**
   * Get all actions for a specific dispatcher
   */
  async getActionsByDispatcher(dispatcherFile: string): Promise<string[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "ACTION_RESOLUTION_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) return [];

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as ActionResolutionIndex;
      return Object.entries(content.actions)
        .filter(([, res]) => res.dispatcher === dispatcherFile)
        .map(([action]) => action);
    } catch {
      return [];
    }
  }

  /**
   * Get action coverage statistics
   */
  async getActionCoverageStats(): Promise<{
    total: number;
    withEngines: number;
    withTests: number;
    withSkills: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "ACTION_RESOLUTION_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { total: 0, withEngines: 0, withTests: 0, withSkills: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as ActionResolutionIndex;
      let withEngines = 0;
      let withTests = 0;
      let withSkills = 0;

      for (const res of Object.values(content.actions)) {
        if (res.engines.length > 0) withEngines++;
        if (res.tests.length > 0) withTests++;
        if (res.skills.length > 0) withSkills++;
      }

      return { total: content.actionCount, withEngines, withTests, withSkills };
    } catch {
      return { total: 0, withEngines: 0, withTests: 0, withSkills: 0 };
    }
  }

  /**
   * Get skill call graph (Universal 0.7)
   * Returns the skill manifest with its referenced engines, actions, hooks
   */
  async skillCallGraph(skillId: string): Promise<SkillManifest | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "SKILL_MANIFEST_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] SKILL_MANIFEST_INDEX.json not found — run build-skill-manifest-index.ts");
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as SkillManifestIndex;
      return content.skills[skillId] || null;
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read SKILL_MANIFEST_INDEX: ${err}`);
      return null;
    }
  }

  /**
   * Get all skills that reference a specific engine
   */
  async skillsReferencingEngine(engineName: string): Promise<string[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "SKILL_MANIFEST_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) return [];

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as SkillManifestIndex;
      return Object.entries(content.skills)
        .filter(([, manifest]) => manifest.engines.includes(engineName))
        .map(([name]) => name);
    } catch {
      return [];
    }
  }

  /**
   * Get skill coverage statistics
   */
  async getSkillCoverageStats(): Promise<{
    total: number;
    withEngines: number;
    withActions: number;
    avgLineCount: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "SKILL_MANIFEST_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { total: 0, withEngines: 0, withActions: 0, avgLineCount: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as SkillManifestIndex;
      let withEngines = 0;
      let withActions = 0;
      let totalLines = 0;

      for (const manifest of Object.values(content.skills)) {
        if (manifest.engines.length > 0) withEngines++;
        if (manifest.actions.length > 0) withActions++;
        totalLines += manifest.lineCount;
      }

      const avgLineCount = content.skillCount > 0 ? Math.round(totalLines / content.skillCount) : 0;
      return { total: content.skillCount, withEngines, withActions, avgLineCount };
    } catch {
      return { total: 0, withEngines: 0, withActions: 0, avgLineCount: 0 };
    }
  }

  // ============================================================================
  // HOOK GUARD INDEX METHODS (Universal 0.7)
  // ============================================================================

  /**
   * Get hooks that guard a specific file glob pattern
   * O(1) lookup from HOOK_GUARD_INDEX.json
   */
  async hooksGuarding(glob: string): Promise<HookGuard[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "HOOK_GUARD_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] HOOK_GUARD_INDEX.json not found — run build-hook-guard-index.ts");
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as HookGuardIndex;
      const hookFiles = content.byGlob[glob] || [];
      return content.guards.filter((g) => hookFiles.includes(g.hookFile));
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read HOOK_GUARD_INDEX: ${err}`);
      return [];
    }
  }

  /**
   * Get all hooks by type (PreToolUse, PostToolUse, etc.)
   */
  async getHooksByType(hookType: HookGuard["hookType"]): Promise<HookGuard[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "HOOK_GUARD_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as HookGuardIndex;
      return content.guards.filter((g) => g.hookType === hookType);
    } catch {
      return [];
    }
  }

  /**
   * Get hook coverage statistics
   */
  async getHookCoverageStats(): Promise<{
    total: number;
    preToolUse: number;
    postToolUse: number;
    globsCovered: number;
    withGlobs: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "HOOK_GUARD_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { total: 0, preToolUse: 0, postToolUse: 0, globsCovered: 0, withGlobs: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as HookGuardIndex;
      const preToolUse = content.guards.filter((g) => g.hookType === "PreToolUse").length;
      const postToolUse = content.guards.filter((g) => g.hookType === "PostToolUse").length;
      const withGlobs = content.guards.filter((g) => g.fileGlobs.length > 0).length;

      return {
        total: content.hookCount,
        preToolUse,
        postToolUse,
        globsCovered: Object.keys(content.byGlob).length,
        withGlobs,
      };
    } catch {
      return { total: 0, preToolUse: 0, postToolUse: 0, globsCovered: 0, withGlobs: 0 };
    }
  }

  // ============================================================================
  // FORMULA PROVENANCE INDEX METHODS (Universal 0.7)
  // ============================================================================

  /**
   * Get formula provenance by formula ID
   * O(1) lookup from FORMULA_PROVENANCE_INDEX.json
   */
  async formulaProvenance(formulaId: string): Promise<FormulaProvenance | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "FORMULA_PROVENANCE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] FORMULA_PROVENANCE_INDEX.json not found — run build-formula-provenance-index.ts");
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as FormulaProvenanceIndex;
      return content.formulas[formulaId] || null;
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read FORMULA_PROVENANCE_INDEX: ${err}`);
      return null;
    }
  }

  /**
   * Get all formulas in a specific domain
   */
  async getFormulasByDomain(domain: string): Promise<FormulaProvenance[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "FORMULA_PROVENANCE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as FormulaProvenanceIndex;
      const formulaIds = content.byDomain[domain] || [];
      return formulaIds.map((id) => content.formulas[id]).filter((f): f is FormulaProvenance => f !== undefined);
    } catch {
      return [];
    }
  }

  /**
   * Get formula coverage statistics
   */
  async getFormulaCoverageStats(): Promise<{
    total: number;
    withReferences: number;
    withEngines: number;
    domains: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "FORMULA_PROVENANCE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { total: 0, withReferences: 0, withEngines: 0, domains: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as FormulaProvenanceIndex;
      const withReferences = Object.values(content.formulas).filter((f) => f.references.length > 0).length;
      const withEngines = Object.values(content.formulas).filter((f) => f.enginesUsing.length > 0).length;

      return {
        total: content.formulaCount,
        withReferences,
        withEngines,
        domains: Object.keys(content.byDomain).length,
      };
    } catch {
      return { total: 0, withReferences: 0, withEngines: 0, domains: 0 };
    }
  }

  // ============================================================================
  // TRIBAL TIP INDEX METHODS (Universal 0.7)
  // ============================================================================

  /**
   * Search tribal tips by keyword
   * O(k) where k = number of matching keywords
   */
  async tribalTipSearch(keyword: string): Promise<TribalTipEntry[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "TRIBAL_TIP_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] TRIBAL_TIP_INDEX.json not found — run build-tribal-tip-index.ts");
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as TribalTipIndex;
      const tipIds = content.byKeyword[keyword.toLowerCase()] || [];
      return tipIds.map((id) => content.tips[id]).filter((t): t is TribalTipEntry => t !== undefined);
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read TRIBAL_TIP_INDEX: ${err}`);
      return [];
    }
  }

  /**
   * Get tribal tips by domain
   */
  async getTipsByDomain(domain: string): Promise<TribalTipEntry[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "TRIBAL_TIP_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as TribalTipIndex;
      const tipIds = content.byDomain[domain] || [];
      return tipIds.map((id) => content.tips[id]).filter((t): t is TribalTipEntry => t !== undefined);
    } catch {
      return [];
    }
  }

  /**
   * Get tribal tip coverage statistics
   */
  async getTribalTipCoverageStats(): Promise<{
    total: number;
    domains: number;
    keywords: number;
    avgConfidence: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "TRIBAL_TIP_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { total: 0, domains: 0, keywords: 0, avgConfidence: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as TribalTipIndex;
      const tips = Object.values(content.tips);
      const totalConfidence = tips.reduce((sum, t) => sum + t.confidence, 0);
      const avgConfidence = tips.length > 0 ? totalConfidence / tips.length : 0;

      return {
        total: content.tipCount,
        domains: Object.keys(content.byDomain).length,
        keywords: Object.keys(content.byKeyword).length,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
      };
    } catch {
      return { total: 0, domains: 0, keywords: 0, avgConfidence: 0 };
    }
  }

  // ============================================================================
  // DISPATCHER GRAPH INDEX METHODS (Universal 0.7)
  // ============================================================================

  /**
   * Get dispatcher call graph by name
   * O(1) lookup from DISPATCHER_GRAPH_INDEX.json
   */
  async dispatcherCallGraph(dispatcherName: string): Promise<DispatcherNode | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "DISPATCHER_GRAPH_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] DISPATCHER_GRAPH_INDEX.json not found — run build-dispatcher-graph-index.ts");
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as DispatcherGraphIndex;
      return content.dispatchers[dispatcherName] || null;
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read DISPATCHER_GRAPH_INDEX: ${err}`);
      return null;
    }
  }

  /**
   * Find which dispatcher owns an action
   */
  async dispatcherForAction(action: string): Promise<string | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "DISPATCHER_GRAPH_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as DispatcherGraphIndex;
      return content.byAction[action] || null;
    } catch {
      return null;
    }
  }

  /**
   * Find dispatchers that call a specific engine
   */
  async dispatchersCallingEngine(engineName: string): Promise<string[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "DISPATCHER_GRAPH_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as DispatcherGraphIndex;
      return content.byEngine[engineName] || [];
    } catch {
      return [];
    }
  }

  /**
   * Get dispatcher coverage statistics
   */
  async getDispatcherCoverageStats(): Promise<{
    total: number;
    totalActions: number;
    enginesReferenced: number;
    avgActionsPerDispatcher: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "DISPATCHER_GRAPH_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { total: 0, totalActions: 0, enginesReferenced: 0, avgActionsPerDispatcher: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as DispatcherGraphIndex;
      const avgActions = content.dispatcherCount > 0
        ? Math.round(content.totalActions / content.dispatcherCount)
        : 0;

      return {
        total: content.dispatcherCount,
        totalActions: content.totalActions,
        enginesReferenced: Object.keys(content.byEngine).length,
        avgActionsPerDispatcher: avgActions,
      };
    } catch {
      return { total: 0, totalActions: 0, enginesReferenced: 0, avgActionsPerDispatcher: 0 };
    }
  }

  // ============================================================================
  // EXTRACTION INVERSE INDEX METHODS (Universal 0.7)
  // ============================================================================

  /**
   * Check if a source has already been extracted
   * O(1) lookup from EXTRACTION_INVERSE_INDEX.json
   */
  async extractionForSource(sourcePath: string): Promise<ExtractionEntry | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "EXTRACTION_INVERSE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] EXTRACTION_INVERSE_INDEX.json not found — run build-extraction-inverse-index.ts");
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as ExtractionInverseIndex;
      const normalizedSource = sourcePath.toLowerCase().replace(/\\/g, "/");
      const extractionId = content.bySource[normalizedSource];
      return extractionId ? content.extractions[extractionId] : null;
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read EXTRACTION_INVERSE_INDEX: ${err}`);
      return null;
    }
  }

  /**
   * Get extractions by type (pdf, tribal-tips, etc.)
   */
  async getExtractionsByType(type: string): Promise<ExtractionEntry[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "EXTRACTION_INVERSE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as ExtractionInverseIndex;
      const ids = content.byType[type] || [];
      return ids.map((id) => content.extractions[id]).filter((e): e is ExtractionEntry => e !== undefined);
    } catch {
      return [];
    }
  }

  /**
   * Get extraction coverage statistics
   */
  async getExtractionCoverageStats(): Promise<{
    total: number;
    totalTipsGenerated: number;
    completed: number;
    superseded: number;
    types: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "EXTRACTION_INVERSE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { total: 0, totalTipsGenerated: 0, completed: 0, superseded: 0, types: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as ExtractionInverseIndex;
      const completed = content.byStatus["completed"]?.length || 0;
      const superseded = content.byStatus["superseded"]?.length || 0;

      return {
        total: content.extractionCount,
        totalTipsGenerated: content.totalTipsGenerated,
        completed,
        superseded,
        types: Object.keys(content.byType).length,
      };
    } catch {
      return { total: 0, totalTipsGenerated: 0, completed: 0, superseded: 0, types: 0 };
    }
  }

  // ============================================================================
  // ALIAS TABLE INDEX METHODS (Universal 0.7)
  // ============================================================================

  /**
   * Resolve an engine alias to its canonical name
   * O(1) lookup from ALIAS_TABLE_INDEX.json
   */
  async resolveAlias(alias: string): Promise<string | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "ALIAS_TABLE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] ALIAS_TABLE_INDEX.json not found — run build-alias-table-index.ts");
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as AliasTableIndex;
      const normalizedAlias = alias.toLowerCase();
      const entry = content.aliases[normalizedAlias];
      return entry ? entry.canonical : null;
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read ALIAS_TABLE_INDEX: ${err}`);
      return null;
    }
  }

  /**
   * Get all aliases for a canonical engine name
   */
  async getAliasesForEngine(canonical: string): Promise<string[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "ALIAS_TABLE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as AliasTableIndex;
      return content.byCanonical[canonical] || [];
    } catch {
      return [];
    }
  }

  /**
   * Get alias entry with full metadata
   */
  async getAliasEntry(alias: string): Promise<AliasEntry | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "ALIAS_TABLE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as AliasTableIndex;
      const normalizedAlias = alias.toLowerCase();
      return content.aliases[normalizedAlias] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get alias table coverage statistics
   */
  async getAliasCoverageStats(): Promise<{
    totalAliases: number;
    canonicalEngines: number;
    knownAliases: number;
    autoDetected: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "ALIAS_TABLE_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { totalAliases: 0, canonicalEngines: 0, knownAliases: 0, autoDetected: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as AliasTableIndex;
      const aliases = Object.values(content.aliases);
      const known = aliases.filter((a) => !a.reason.startsWith("auto-")).length;
      const autoDetected = aliases.filter((a) => a.reason.startsWith("auto-")).length;

      return {
        totalAliases: content.aliasCount,
        canonicalEngines: Object.keys(content.byCanonical).length,
        knownAliases: known,
        autoDetected,
      };
    } catch {
      return { totalAliases: 0, canonicalEngines: 0, knownAliases: 0, autoDetected: 0 };
    }
  }

  // ============================================================================
  // SIGNATURE HASH INDEX METHODS (Universal 0.7)
  // ============================================================================

  /**
   * Get signature entry for an engine by name
   * O(1) lookup from SIGNATURE_HASH_INDEX.json
   */
  async getSignature(engineName: string): Promise<SignatureEntry | null> {
    const indexPath = path.join(this.baseDir, "data", "state", "SIGNATURE_HASH_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        log.warn("[AwarenessQuery] SIGNATURE_HASH_INDEX.json not found — run build-signature-hash-index.ts");
        return null;
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as SignatureHashIndex;
      return content.signatures[engineName] || null;
    } catch (err) {
      log.warn(`[AwarenessQuery] Failed to read SIGNATURE_HASH_INDEX: ${err}`);
      return null;
    }
  }

  /**
   * Find engines with the same content hash (exact duplicates)
   */
  async findDuplicates(engineName: string): Promise<string[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "SIGNATURE_HASH_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as SignatureHashIndex;
      const entry = content.signatures[engineName];
      if (!entry) return [];

      const duplicates = content.byFullHash[entry.fullHash] || [];
      return duplicates.filter((n) => n !== engineName);
    } catch {
      return [];
    }
  }

  /**
   * Find engines with similar content (normalized hash match)
   */
  async findSimilarByHash(engineName: string): Promise<string[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "SIGNATURE_HASH_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as SignatureHashIndex;
      const entry = content.signatures[engineName];
      if (!entry) return [];

      const similar = content.byNormalizedHash[entry.normalizedHash] || [];
      return similar.filter((n) => n !== engineName);
    } catch {
      return [];
    }
  }

  /**
   * Get all duplicate groups in the codebase
   */
  async getAllDuplicateGroups(): Promise<DuplicateGroup[]> {
    const indexPath = path.join(this.baseDir, "data", "state", "SIGNATURE_HASH_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return [];
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as SignatureHashIndex;
      return content.duplicates;
    } catch {
      return [];
    }
  }

  /**
   * Get signature hash coverage statistics
   */
  async getSignatureCoverageStats(): Promise<{
    totalFiles: number;
    uniqueHashes: number;
    duplicateGroups: number;
    avgLineCount: number;
    avgMethodCount: number;
  }> {
    const indexPath = path.join(this.baseDir, "data", "state", "SIGNATURE_HASH_INDEX.json");
    try {
      if (!fs.existsSync(indexPath)) {
        return { totalFiles: 0, uniqueHashes: 0, duplicateGroups: 0, avgLineCount: 0, avgMethodCount: 0 };
      }

      const content = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as SignatureHashIndex;
      const sigs = Object.values(content.signatures);
      const avgLineCount = sigs.length > 0 ? Math.round(sigs.reduce((s, e) => s + e.lineCount, 0) / sigs.length) : 0;
      const avgMethodCount = sigs.length > 0 ? Math.round(sigs.reduce((s, e) => s + e.methodCount, 0) / sigs.length) : 0;

      return {
        totalFiles: content.fileCount,
        uniqueHashes: content.uniqueHashes,
        duplicateGroups: content.duplicateGroups,
        avgLineCount,
        avgMethodCount,
      };
    } catch {
      return { totalFiles: 0, uniqueHashes: 0, duplicateGroups: 0, avgLineCount: 0, avgMethodCount: 0 };
    }
  }

  // ============================================================================
  // IMPACT / RENAME / DELETE PROTOCOL (Universal 0.8)
  // ============================================================================

  /**
   * Compute blast-radius impact analysis before editing an engine
   * Returns all dependents that would be affected by changes
   */
  async impactAnalysis(engineId: string): Promise<{
    engineId: string;
    exists: boolean;
    dispatchers: string[];
    actions: string[];
    skills: string[];
    hooks: string[];
    tests: string[];
    formulas: string[];
    aliases: string[];
    totalDependents: number;
    safeToModify: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    const engineUsagePath = path.join(this.baseDir, "data", "state", "ENGINE_USAGE_INDEX.json");
    const aliasPath = path.join(this.baseDir, "data", "state", "ALIAS_TABLE_INDEX.json");

    let dispatchers: string[] = [];
    let actions: string[] = [];
    let skills: string[] = [];
    let hooks: string[] = [];
    let tests: string[] = [];
    let formulas: string[] = [];
    let aliases: string[] = [];
    let exists = false;

    try {
      if (fs.existsSync(engineUsagePath)) {
        const usageIndex = JSON.parse(fs.readFileSync(engineUsagePath, "utf-8")) as EngineUsageIndex;
        const usage = usageIndex.engines[engineId];
        if (usage) {
          exists = true;
          dispatchers = usage.dispatchers || [];
          actions = usage.actions || [];
          skills = usage.skills || [];
          hooks = usage.hooks || [];
          tests = usage.tests || [];
          formulas = usage.formulas || [];
        }
      }

      if (fs.existsSync(aliasPath)) {
        const aliasIndex = JSON.parse(fs.readFileSync(aliasPath, "utf-8")) as AliasTableIndex;
        aliases = aliasIndex.byCanonical[engineId] || [];
      }
    } catch (err) {
      warnings.push(`Failed to read indexes: ${err}`);
    }

    const totalDependents = dispatchers.length + actions.length + skills.length + hooks.length;
    const safeToModify = totalDependents === 0 || (dispatchers.length <= 1 && skills.length === 0);

    if (dispatchers.length > 3) {
      warnings.push(`High dispatcher coupling: ${dispatchers.length} dispatchers depend on this engine`);
    }
    if (skills.length > 0) {
      warnings.push(`Skill coupling: ${skills.length} skills reference this engine`);
    }
    if (aliases.length > 0) {
      warnings.push(`Alias coupling: ${aliases.length} aliases point to this engine`);
    }

    return {
      engineId,
      exists,
      dispatchers,
      actions,
      skills,
      hooks,
      tests,
      formulas,
      aliases,
      totalDependents,
      safeToModify,
      warnings,
    };
  }

  /**
   * Generate a rename plan for coordinated multi-file rename
   * Returns all files that need updating and the specific changes
   */
  async renamePlan(oldId: string, newId: string): Promise<{
    oldId: string;
    newId: string;
    valid: boolean;
    reason?: string;
    filesToUpdate: Array<{ file: string; type: string; changes: string[] }>;
    aliasToAdd: { alias: string; canonical: string; reason: string } | null;
    testFileRename: { from: string; to: string } | null;
    estimatedChanges: number;
  }> {
    if (!oldId || !newId) {
      return { oldId, newId, valid: false, reason: "Both oldId and newId are required", filesToUpdate: [], aliasToAdd: null, testFileRename: null, estimatedChanges: 0 };
    }

    if (oldId === newId) {
      return { oldId, newId, valid: false, reason: "oldId and newId are identical", filesToUpdate: [], aliasToAdd: null, testFileRename: null, estimatedChanges: 0 };
    }

    const impact = await this.impactAnalysis(oldId);
    if (!impact.exists) {
      return { oldId, newId, valid: false, reason: `Engine ${oldId} not found`, filesToUpdate: [], aliasToAdd: null, testFileRename: null, estimatedChanges: 0 };
    }

    const filesToUpdate: Array<{ file: string; type: string; changes: string[] }> = [];

    for (const dispatcher of impact.dispatchers) {
      filesToUpdate.push({
        file: `src/tools/dispatchers/${dispatcher}.ts`,
        type: "dispatcher",
        changes: [`Update import: ${oldId} → ${newId}`, `Update engine references`],
      });
    }

    for (const skill of impact.skills) {
      filesToUpdate.push({
        file: `~/.claude/commands/${skill}.md`,
        type: "skill",
        changes: [`Update engine reference: ${oldId} → ${newId}`],
      });
    }

    for (const hook of impact.hooks) {
      filesToUpdate.push({
        file: `src/hooks/${hook}`,
        type: "hook",
        changes: [`Update engine reference: ${oldId} → ${newId}`],
      });
    }

    for (const test of impact.tests) {
      filesToUpdate.push({
        file: test,
        type: "test",
        changes: [`Update import: ${oldId} → ${newId}`, `Update test descriptions`],
      });
    }

    filesToUpdate.push({
      file: `src/engines/${oldId}.ts`,
      type: "engine",
      changes: [`Rename file to ${newId}.ts`, `Update class name`, `Update exports`],
    });

    const aliasToAdd = {
      alias: oldId,
      canonical: newId,
      reason: "renamed",
    };

    const testFileRename = impact.tests.length > 0 ? {
      from: `src/__tests__/${oldId}.test.ts`,
      to: `src/__tests__/${newId}.test.ts`,
    } : null;

    const estimatedChanges = filesToUpdate.reduce((sum, f) => sum + f.changes.length, 0);

    return {
      oldId,
      newId,
      valid: true,
      filesToUpdate,
      aliasToAdd,
      testFileRename,
      estimatedChanges,
    };
  }

  /**
   * Generate a delete plan with safety checks
   * Returns whether deletion is safe and what cleanup is needed
   */
  async deletePlan(engineId: string): Promise<{
    engineId: string;
    canDelete: boolean;
    reason?: string;
    blockingDependents: string[];
    filesToRemove: string[];
    registriesToUpdate: string[];
    archiveActions: string[];
    warnings: string[];
  }> {
    const impact = await this.impactAnalysis(engineId);
    const warnings: string[] = [];

    if (!impact.exists) {
      return {
        engineId,
        canDelete: false,
        reason: `Engine ${engineId} not found`,
        blockingDependents: [],
        filesToRemove: [],
        registriesToUpdate: [],
        archiveActions: [],
        warnings: [],
      };
    }

    const blockingDependents: string[] = [];

    if (impact.dispatchers.length > 0) {
      blockingDependents.push(...impact.dispatchers.map((d) => `dispatcher:${d}`));
    }
    if (impact.skills.length > 0) {
      blockingDependents.push(...impact.skills.map((s) => `skill:${s}`));
    }
    if (impact.hooks.length > 0) {
      blockingDependents.push(...impact.hooks.map((h) => `hook:${h}`));
    }

    const canDelete = blockingDependents.length === 0;

    if (!canDelete) {
      return {
        engineId,
        canDelete: false,
        reason: `${blockingDependents.length} dependents still reference this engine`,
        blockingDependents,
        filesToRemove: [],
        registriesToUpdate: [],
        archiveActions: [],
        warnings: [`Remove all dependents before deleting`],
      };
    }

    const filesToRemove = [
      `src/engines/${engineId}.ts`,
      ...impact.tests,
    ];

    const registriesToUpdate = [
      "data/state/cross-session-asset-registry.json",
      "data/state/ENGINE_USAGE_INDEX.json",
      "data/state/SIGNATURE_HASH_INDEX.json",
    ];

    if (impact.aliases.length > 0) {
      registriesToUpdate.push("data/state/ALIAS_TABLE_INDEX.json");
      warnings.push(`${impact.aliases.length} aliases will become orphaned: ${impact.aliases.join(", ")}`);
    }

    const archiveActions = [
      `Archive engine metadata to extraction-log.json`,
      `Mark as deleted in cross-session-asset-registry.json`,
    ];

    return {
      engineId,
      canDelete: true,
      blockingDependents: [],
      filesToRemove,
      registriesToUpdate,
      archiveActions,
      warnings,
    };
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
