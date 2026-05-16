/**
 * DuplicationGuardEngine — Prevent Duplicate Builds & Extractions
 *
 * CRITICAL SYSTEM: This engine MUST be consulted before:
 * - Creating any new engine
 * - Adding any new formula
 * - Adding any algorithm
 * - Extracting any content from resources
 * - Creating any new dispatcher action
 *
 * Knowledge Sources:
 * - ENGINE_DIGEST.md (1,559+ engines with summaries)
 * - DISPATCHER_DIGEST.md (82 dispatchers, 4,296+ actions)
 * - FormulaRegistry (499 formulas)
 * - AlgorithmRegistry (60+ algorithms)
 * - CrossDisciplinaryDeepLearningEngine (120+ formulas/algorithms)
 * - Extraction logs (PDF, video, resource processing)
 *
 * @module engines/DuplicationGuardEngine
 */

import { log } from "../utils/Logger.js";
import { atomicLockedWrite } from "../utils/atomicLockedWrite.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export type AssetType = "engine" | "formula" | "algorithm" | "dispatcher_action" | "extraction" | "skill" | "hook";

export interface ExistingAsset {
  type: AssetType;
  name: string;
  path?: string;
  description: string;
  createdAt?: string;
  source?: string;
}

export interface DuplicationCheckResult {
  isDuplicate: boolean;
  existingAsset?: ExistingAsset;
  similarity: number;
  recommendation: "skip" | "extend" | "rename" | "proceed";
  reason: string;
  alternatives: ExistingAsset[];
  // Compatibility aliases for tests
  shouldProceed: boolean;
  matches: ExistingAsset[];
}

export interface CheckBeforeCreatingInput {
  assetType: AssetType;
  proposedName: string;
  keywords?: string[];
  description: string;
}

export interface AssetRegistry {
  engines: Map<string, ExistingAsset>;
  formulas: Map<string, ExistingAsset>;
  algorithms: Map<string, ExistingAsset>;
  actions: Map<string, ExistingAsset>;
  extractions: Map<string, ExistingAsset>;
  skills: Map<string, ExistingAsset>;
  scripts: Map<string, ExistingAsset>;
  hooks: Map<string, ExistingAsset>;
}

// ============================================================================
// CACHED ASSET INDEX (loaded once per session)
// ============================================================================

let ASSET_INDEX: AssetRegistry | null = null;
let INDEX_LOADED_AT: number = 0;
const INDEX_TTL_MS = 300000; // 5 minutes

// ============================================================================
// CROSS-SESSION PERSISTENT REGISTRY (survives across chat sessions)
// ============================================================================

/** U-AWR24: extraction-log.json entry schema */
interface ExtractionEntry {
  id?: string;
  type?: string;
  name?: string;
  source?: string;
  description?: string;
  timestamp?: string;
  status?: "completed" | "partial" | "failed" | "superseded";
  tipsGenerated?: number;
  programsIndexed?: number;
  [key: string]: unknown;
}

/** U-AWR24: full extraction-log.json shape */
interface ExtractionLog {
  schemaVersion?: string;
  lastUpdated?: string;
  description?: string;
  extractions?: ExtractionEntry[];
  doNotExtract?: string[];
  stats?: Record<string, unknown>;
}

interface CrossSessionEntry {
  id: string;
  type: AssetType;
  name: string;
  path: string;
  description: string;
  createdAt: string;
  createdBy: string; // session identifier
}

interface CrossSessionRegistry {
  schemaVersion: 1;
  lastUpdated: string;
  entries: CrossSessionEntry[];
}

const CROSS_SESSION_REGISTRY_FILE = "cross-session-asset-registry.json";

// ============================================================================
// ENGINE
// ============================================================================

export class DuplicationGuardEngine {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), "..");
    log.info("[DuplicationGuard] Initialized — consult before creating ANY new asset");
  }

  /**
   * MANDATORY CHECK: Call this BEFORE creating any new engine, formula, or algorithm
   * Supports both positional args and object input for compatibility
   */
  checkBeforeCreating(input: CheckBeforeCreatingInput): DuplicationCheckResult;
  checkBeforeCreating(type: AssetType, proposedName: string, description: string): Promise<DuplicationCheckResult>;
  checkBeforeCreating(
    typeOrInput: AssetType | CheckBeforeCreatingInput,
    proposedName?: string,
    description?: string
  ): DuplicationCheckResult | Promise<DuplicationCheckResult> {
    // Handle object-style input (synchronous for test compatibility)
    if (typeof typeOrInput === "object" && "assetType" in typeOrInput) {
      return this.checkBeforeCreatingSync(typeOrInput);
    }
    // Handle positional args (async)
    return this.checkBeforeCreatingAsync(typeOrInput as AssetType, proposedName!, description!);
  }

  private checkBeforeCreatingSync(input: CheckBeforeCreatingInput): DuplicationCheckResult {
    const { assetType, proposedName, description, keywords } = input;
    const normalizedName = this.normalizeName(proposedName);
    const normalizedDesc = description.toLowerCase();

    // Quick synchronous check using cached index
    const index = this.cachedIndex || this.loadAssetIndexSync();
    const registry = this.getRegistryForType(index, assetType);

    // Check exact match
    if (registry.has(normalizedName)) {
      const existing = registry.get(normalizedName)!;
      return {
        isDuplicate: true,
        existingAsset: existing,
        similarity: 1.0,
        recommendation: "skip",
        reason: `Exact match found: ${existing.name}`,
        alternatives: [existing],
        shouldProceed: false,
        matches: [existing],
      };
    }

    // Check similar names (fuzzy match)
    const similar: ExistingAsset[] = [];
    for (const [name, asset] of registry.entries()) {
      const similarity = this.calculateSimilarity(normalizedName, name);
      if (similarity > 0.7) {
        similar.push(asset);
      }
    }

    // Check keyword overlap if provided
    if (keywords && keywords.length > 0) {
      for (const [, asset] of registry.entries()) {
        const assetKeywords = asset.description.toLowerCase().split(/\s+/);
        const overlap = keywords.filter(k => assetKeywords.some(ak => ak.includes(k.toLowerCase())));
        if (overlap.length >= 2 && !similar.some(s => s.name === asset.name)) {
          similar.push(asset);
        }
      }
    }

    if (similar.length > 0) {
      return {
        isDuplicate: false,
        existingAsset: similar[0],
        similarity: this.calculateSimilarity(normalizedName, this.normalizeName(similar[0].name)),
        recommendation: "extend",
        reason: `Similar assets found: ${similar.map(s => s.name).join(", ")}`,
        alternatives: similar,
        shouldProceed: false,
        matches: similar,
      };
    }

    return {
      isDuplicate: false,
      existingAsset: undefined,
      similarity: 0,
      recommendation: "proceed",
      reason: "No duplicates found",
      alternatives: [],
      shouldProceed: true,
      matches: [],
    };
  }

  /**
   * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U03: semantic duplicate check via the
   * Qdrant `engine` collection (populated by
   * scripts/embed-all-engines.mjs). Falls back to the existing sync
   * fuzzy match when MCP is unreachable so callers always get a
   * deterministic answer. Returns the same DuplicationCheckResult
   * shape as the legacy paths so it can drop in for hooks that
   * previously called the sync API.
   *
   * @param input — same shape as checkBeforeCreating sync path
   * @param opts.minScore — threshold below which a hit is ignored
   *                         (defaults to 0.55)
   * @param opts.limit — max top-K to retrieve (defaults to 5)
   */
  async checkBeforeCreatingSemantic(
    input: CheckBeforeCreatingInput,
    opts: { minScore?: number; limit?: number; mcpUrl?: string } = {}
  ): Promise<DuplicationCheckResult & { semanticHits?: Array<{ id: string; score: number; description: string }> }> {
    const minScore = typeof opts.minScore === "number" ? opts.minScore : 0.55;
    const limit = typeof opts.limit === "number" ? opts.limit : 5;
    const url = opts.mcpUrl ?? process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
    const SEMANTIC_KIND_FOR_ASSET: Record<AssetType, string | null> = {
      engine: "engine",
      formula: null,
      algorithm: null,
      dispatcher_action: null,
      extraction: null,
      skill: "skill",
      hook: null,
    };
    const kind = SEMANTIC_KIND_FOR_ASSET[input.assetType];
    let semanticHits: Array<{ id: string; score: number; description: string }> = [];
    if (kind) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      try {
        const query = `${input.proposedName}\n\n${input.description}\n\n${(input.keywords ?? []).join(" ")}`.slice(0, 2000);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "prism_memory", arguments: { action: "semantic_search", params: { query, kind, limit } } },
          }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const body = await res.json();
          const inner = (body as { result?: { content?: Array<{ text?: string }> } })?.result?.content?.[0]?.text ?? "";
          try {
            const parsed = JSON.parse(inner) as { items?: Array<{ id?: unknown; score?: number; text?: string }> };
            const items = Array.isArray(parsed?.items) ? parsed.items : [];
            semanticHits = items
              .filter((it) => typeof it.score === "number" && (it.score as number) >= minScore)
              .map((it) => ({
                id: String(it.id ?? ""),
                score: it.score as number,
                description: typeof it.text === "string" ? it.text.slice(0, 240) : "",
              }));
          } catch { /* fall through to fuzzy */ }
        }
      } catch {
        clearTimeout(timer);
      }
    }
    // Always run the deterministic sync fallback so we have a baseline answer
    const fuzzy = this.checkBeforeCreatingSync(input);
    if (semanticHits.length === 0) {
      return { ...fuzzy, semanticHits: [] };
    }
    // Promote semantic to "extend" recommendation (not exact dup) so the
    // caller sees the alternatives without being hard-blocked. If fuzzy
    // already found an exact match, preserve that — vector hits are
    // additive, not authoritative for exact duplication.
    if (fuzzy.isDuplicate) return { ...fuzzy, semanticHits };
    const semanticAlternatives: ExistingAsset[] = semanticHits.map((h) => ({
      type: input.assetType,
      name: h.id.replace(/^engine\//, "").replace(/^skill\//, ""),
      path: h.id,
      description: h.description,
    }));
    return {
      isDuplicate: false,
      existingAsset: semanticAlternatives[0],
      similarity: semanticHits[0].score,
      recommendation: "extend",
      reason: `Semantic neighbors found (Qdrant): ${semanticHits.slice(0, 3).map((h) => h.id).join(", ")}`,
      alternatives: [...fuzzy.alternatives, ...semanticAlternatives],
      shouldProceed: false,
      matches: [...fuzzy.matches, ...semanticAlternatives],
      semanticHits,
    };
  }

  private cachedIndex: AssetRegistry | null = null;

  private loadAssetIndexSync(): AssetRegistry {
    if (this.cachedIndex) return this.cachedIndex;

    const index: AssetRegistry = {
      engines: new Map(),
      formulas: new Map(),
      algorithms: new Map(),
      actions: new Map(),
      extractions: new Map(),
      skills: new Map(),
      scripts: new Map(),
      hooks: new Map(),
    };

    // Load engines from filesystem synchronously
    try {
      const enginesDir = path.join(this.baseDir, "mcp-server", "src", "engines");
      const files = fs.readdirSync(enginesDir).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"));
      for (const file of files) {
        const name = file.replace(".ts", "");
        index.engines.set(this.normalizeName(name), {
          type: "engine",
          name,
          path: `src/engines/${file}`,
          description: name.replace(/Engine$/, "").replace(/([A-Z])/g, " $1").trim(),
        });
      }
    } catch {
      // Ignore errors in sync load
    }

    this.cachedIndex = index;
    return index;
  }

  private async checkBeforeCreatingAsync(
    type: AssetType,
    proposedName: string,
    description: string
  ): Promise<DuplicationCheckResult> {
    const index = await this.loadAssetIndex();
    const normalizedName = this.normalizeName(proposedName);
    const normalizedDesc = description.toLowerCase();

    // Check exact match
    const registry = this.getRegistryForType(index, type);
    if (registry.has(normalizedName)) {
      const existing = registry.get(normalizedName)!;
      return {
        isDuplicate: true,
        existingAsset: existing,
        similarity: 1.0,
        recommendation: "skip",
        reason: `Exact match found: ${existing.name} at ${existing.path || "registry"}`,
        alternatives: [existing],
        shouldProceed: false,
        matches: [existing],
      };
    }

    // Check similar names (fuzzy match)
    const similar: ExistingAsset[] = [];
    for (const [name, asset] of registry.entries()) {
      const similarity = this.calculateSimilarity(normalizedName, name);
      if (similarity > 0.7) {
        similar.push(asset);
      }
    }

    // Check description overlap
    for (const [, asset] of registry.entries()) {
      const descSimilarity = this.calculateSimilarity(normalizedDesc, asset.description.toLowerCase());
      if (descSimilarity > 0.6 && !similar.some((s) => s.name === asset.name)) {
        similar.push(asset);
      }
    }

    if (similar.length > 0) {
      const closest = similar[0];
      return {
        isDuplicate: false,
        existingAsset: closest,
        similarity: this.calculateSimilarity(normalizedName, this.normalizeName(closest.name)),
        recommendation: similar.length > 2 ? "skip" : "extend",
        reason: `Similar assets found: ${similar.map((s) => s.name).join(", ")}`,
        alternatives: similar,
        shouldProceed: false,
        matches: similar,
      };
    }

    return {
      isDuplicate: false,
      existingAsset: undefined,
      similarity: 0,
      recommendation: "proceed",
      reason: "No duplicates or similar assets found",
      alternatives: [],
      shouldProceed: true,
      matches: [],
    };
  }

  /**
   * Get a concise summary of what already exists (for session context)
   */
  async getExistingSummary(): Promise<string> {
    const index = await this.loadAssetIndex();

    return [
      "=== PRISM EXISTING ASSETS (DO NOT DUPLICATE) ===",
      "",
      `ENGINES: ${index.engines.size} total`,
      `  Key engines: ${this.getTopNames(index.engines, 20).join(", ")}`,
      "",
      `FORMULAS: ${index.formulas.size} total`,
      `  Sources: Kienzle, Taylor, Johnson-Cook, Black-Scholes, Shannon, etc.`,
      "",
      `ALGORITHMS: ${index.algorithms.size} total`,
      `  Types: Genetic, ParticleSwarm, AntColony, MonteCarlo, Bayesian, Kalman, LQR, PID, NURBS, K-means, CNN`,
      "",
      `DISPATCHER ACTIONS: ${index.actions.size} total across 82 dispatchers`,
      "",
      `SKILLS: ${index.skills.size} slash commands`,
      "",
      `HOOKS: ${index.hooks.size} safety/validation hooks`,
      "",
      `EXTRACTIONS: ${index.extractions.size} processed resources`,
      "",
      "BEFORE CREATING ANYTHING NEW:",
      "1. Call duplicationGuardEngine.checkBeforeCreating(type, name, description)",
      "2. If isDuplicate=true, DO NOT CREATE",
      "3. If similarity > 0.7, EXTEND existing instead",
      "4. Only proceed if recommendation='proceed'",
    ].join("\n");
  }

  /**
   * Search for existing assets by keyword
   */
  async searchExisting(keyword: string, types?: AssetType[]): Promise<ExistingAsset[]> {
    const index = await this.loadAssetIndex();
    const results: ExistingAsset[] = [];
    const normalizedKeyword = keyword.toLowerCase();

    const registries =
      types?.map((t) => this.getRegistryForType(index, t)) || [
        index.engines,
        index.formulas,
        index.algorithms,
        index.actions,
      ];

    for (const registry of registries) {
      for (const asset of registry.values()) {
        if (
          asset.name.toLowerCase().includes(normalizedKeyword) ||
          asset.description.toLowerCase().includes(normalizedKeyword)
        ) {
          results.push(asset);
        }
      }
    }

    return results;
  }

  /**
   * Register a newly created asset (call AFTER successful creation)
   * CRITICAL: This persists to cross-session registry for ALL Claude sessions
   */
  async registerNewAsset(type: AssetType, name: string, assetPath: string, description: string): Promise<void> {
    const index = await this.loadAssetIndex();
    const registry = this.getRegistryForType(index, type);

    registry.set(this.normalizeName(name), {
      type,
      name,
      path: assetPath,
      description,
      createdAt: new Date().toISOString(),
      source: "session",
    });

    // CRITICAL: Persist to cross-session registry (survives across ALL chat sessions)
    await this.saveToCrossSessionRegistry(type, name, assetPath, description);

    // Also persist to extraction log (legacy)
    await this.appendToExtractionLog(type, name, assetPath, description);

    log.info(`[DuplicationGuard] Registered new ${type}: ${name} (cross-session persisted)`);
  }

  /**
   * Get counts of all asset types
   */
  async getCounts(): Promise<Record<AssetType, number>> {
    const index = await this.loadAssetIndex();

    return {
      engine: index.engines.size,
      formula: index.formulas.size,
      algorithm: index.algorithms.size,
      dispatcher_action: index.actions.size,
      extraction: index.extractions.size,
      skill: index.skills.size,
      hook: index.hooks.size,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async loadAssetIndex(): Promise<AssetRegistry> {
    const now = Date.now();
    if (ASSET_INDEX && now - INDEX_LOADED_AT < INDEX_TTL_MS) {
      return ASSET_INDEX;
    }

    log.info("[DuplicationGuard] Loading asset index...");

    const index: AssetRegistry = {
      engines: new Map(),
      formulas: new Map(),
      algorithms: new Map(),
      actions: new Map(),
      extractions: new Map(),
      skills: new Map(),
      scripts: new Map(),
      hooks: new Map(),
    };

    // CRITICAL: Load cross-session registry FIRST (entries from OTHER sessions)
    await this.loadCrossSessionRegistry(index);

    // Load engines from file system
    await this.loadEnginesFromFS(index);

    // Load formulas from CrossDisciplinaryDeepLearningEngine + FormulaRegistry
    this.loadFormulas(index);

    // Load algorithms
    this.loadAlgorithms(index);

    // Load dispatcher actions from DISPATCHER_DIGEST
    await this.loadDispatcherActions(index);

    // Load extractions from log
    await this.loadExtractionLog(index);

    // Load skills
    await this.loadSkills(index);

    // Load hooks
    await this.loadHooks(index);

    ASSET_INDEX = index;
    INDEX_LOADED_AT = now;

    log.info(
      `[DuplicationGuard] Loaded ${index.engines.size} engines, ${index.formulas.size} formulas, ${index.algorithms.size} algorithms`
    );

    return index;
  }

  /**
   * Load cross-session registry (assets created in OTHER Claude sessions)
   * This is the CRITICAL path for preventing duplicate builds across sessions
   */
  private async loadCrossSessionRegistry(index: AssetRegistry): Promise<void> {
    const registryPath = path.join(this.baseDir, "mcp-server", "data", "state", CROSS_SESSION_REGISTRY_FILE);

    try {
      if (fs.existsSync(registryPath)) {
        const content: CrossSessionRegistry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
        let loadedCount = 0;

        for (const entry of content.entries) {
          const registry = this.getRegistryForType(index, entry.type);
          const normalizedName = this.normalizeName(entry.name);

          // Mark as from cross-session registry for awareness
          registry.set(normalizedName, {
            type: entry.type,
            name: entry.name,
            path: entry.path,
            description: entry.description,
            createdAt: entry.createdAt,
            source: `cross-session:${entry.createdBy}`,
          });
          loadedCount++;
        }

        if (loadedCount > 0) {
          log.info(`[DuplicationGuard] Loaded ${loadedCount} assets from cross-session registry`);
        }
      }
    } catch (err) {
      log.warn(`[DuplicationGuard] Could not load cross-session registry: ${err}`);
    }
  }

  /**
   * Save entry to cross-session registry (persists across ALL Claude sessions)
   */
  private async saveToCrossSessionRegistry(
    type: AssetType,
    name: string,
    filePath: string,
    description: string
  ): Promise<void> {
    const registryPath = path.join(this.baseDir, "mcp-server", "data", "state", CROSS_SESSION_REGISTRY_FILE);

    try {
      let content: CrossSessionRegistry = {
        schemaVersion: 1,
        lastUpdated: new Date().toISOString(),
        entries: [],
      };

      if (fs.existsSync(registryPath)) {
        content = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
      }

      // Check for existing entry to prevent duplicates in registry itself
      const normalizedName = this.normalizeName(name);
      const existingIndex = content.entries.findIndex(
        (e) => e.type === type && this.normalizeName(e.name) === normalizedName
      );

      const entry: CrossSessionEntry = {
        id: `${type}-${normalizedName}-${Date.now()}`,
        type,
        name,
        path: filePath,
        description,
        createdAt: new Date().toISOString(),
        createdBy: process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`,
      };

      if (existingIndex >= 0) {
        // Update existing entry
        content.entries[existingIndex] = entry;
      } else {
        // Add new entry
        content.entries.push(entry);
      }

      content.lastUpdated = new Date().toISOString();

      // Phase 0.4: cross-process-locked atomic write. Prevents 6+ concurrent
      // Claude terminals from clobbering the registry when creating assets
      // simultaneously. atomicLockedWrite creates the parent dir + handles
      // proper-lockfile retry/stale-detection.
      await atomicLockedWrite(registryPath, JSON.stringify(content, null, 2));
      log.info(`[DuplicationGuard] Saved to cross-session registry: ${type}/${name}`);
    } catch (err) {
      log.warn(`[DuplicationGuard] Could not save to cross-session registry: ${err}`);
    }
  }

  /**
   * Get recent cross-session assets (for session startup awareness)
   */
  async getRecentCrossSessionAssets(hoursBack: number = 24): Promise<CrossSessionEntry[]> {
    const registryPath = path.join(this.baseDir, "mcp-server", "data", "state", CROSS_SESSION_REGISTRY_FILE);

    try {
      if (!fs.existsSync(registryPath)) {
        return [];
      }

      const content: CrossSessionRegistry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
      const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;

      return content.entries.filter((e) => new Date(e.createdAt).getTime() > cutoff);
    } catch {
      return [];
    }
  }

  /**
   * Get cross-session awareness string (for session startup injection)
   */
  async getCrossSessionAwareness(): Promise<string> {
    const recent = await this.getRecentCrossSessionAssets(48); // last 48 hours

    if (recent.length === 0) {
      return "";
    }

    const byType: Record<string, CrossSessionEntry[]> = {};
    for (const entry of recent) {
      if (!byType[entry.type]) byType[entry.type] = [];
      byType[entry.type].push(entry);
    }

    const lines = [
      "# CROSS-SESSION ASSETS (last 48h) — DO NOT DUPLICATE",
      "",
    ];

    for (const [type, entries] of Object.entries(byType)) {
      lines.push(`## ${type.toUpperCase()}S (${entries.length})`);
      for (const e of entries.slice(0, 10)) {
        lines.push(`- ${e.name}: ${e.description.slice(0, 60)}${e.description.length > 60 ? "..." : ""}`);
      }
      if (entries.length > 10) {
        lines.push(`  ... and ${entries.length - 10} more`);
      }
      lines.push("");
    }

    lines.push("BEFORE CREATING ANYTHING:");
    lines.push("1. Check if it's listed above");
    lines.push("2. Run: duplicationGuardEngine.checkBeforeCreating(type, name, desc)");
    lines.push("3. Only proceed if recommendation='proceed'");

    return lines.join("\n");
  }

  private async loadEnginesFromFS(index: AssetRegistry): Promise<void> {
    const enginesDir = path.join(this.baseDir, "mcp-server", "src", "engines");

    try {
      const files = fs.readdirSync(enginesDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

      for (const file of files) {
        const name = file.replace(".ts", "");
        index.engines.set(this.normalizeName(name), {
          type: "engine",
          name,
          path: `src/engines/${file}`,
          description: name.replace(/Engine$/, "").replace(/([A-Z])/g, " $1").trim(),
        });
      }
    } catch {
      log.warn("[DuplicationGuard] Could not read engines directory");
    }
  }

  private loadFormulas(index: AssetRegistry): void {
    // Phase 0.5: read live FormulaRegistry (~509 entries across 20 domains)
    // instead of the 21 hardcoded entries that had shipped here. Registry
    // access is synchronous after SessionStart load. Fallback to the
    // minimal baseline set if the registry fails to resolve (bootstrap-safe).
    let loaded = 0;
    try {
      // Lazy require to avoid circular deps on cold start. formulaRegistry is
      // a singleton populated by FormulaRegistry.ts constructor.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { formulaRegistry } = require("../registries/FormulaRegistry.js");
      const entries = formulaRegistry?.all?.() ?? [];
      for (const f of entries) {
        const id = f.formula_id ?? f.id;
        const name = f.name;
        const desc = f.description ?? "";
        if (!id || !name) continue;
        index.formulas.set(this.normalizeName(id), {
          type: "formula",
          name,
          description: desc,
          source: "FormulaRegistry (live)",
        });
        // Also index by normalized name so dedup catches "Kienzle" regardless
        // of formula_id casing (`mat-specific-cutting-force` vs `KIENZLE-001`).
        index.formulas.set(this.normalizeName(name), {
          type: "formula",
          name,
          description: desc,
          source: "FormulaRegistry (live)",
        });
        loaded++;
      }
    } catch (err) {
      log.warn(`[DuplicationGuard] FormulaRegistry live-read failed, using baseline: ${err}`);
    }

    if (loaded > 0) {
      log.debug(`[DuplicationGuard] Loaded ${loaded} formulas from live FormulaRegistry`);
      return;
    }

    // Baseline fallback — minimal set from CrossDisciplinaryDeepLearningEngine
    // kept so dedup works during cold-start or when the registry is torn.
    const baselineFormulas = [
      { id: "thermo-heat-generation", name: "Cutting Heat Generation", desc: "Heat from mechanical work" },
      { id: "fluid-reynolds", name: "Reynolds Number", desc: "Laminar vs turbulent flow" },
      { id: "wave-vibration-modes", name: "Tool Vibration Modes", desc: "Natural vibration frequencies" },
      { id: "mat-johnson-cook", name: "Johnson-Cook Flow Stress", desc: "High strain-rate stress" },
      { id: "mat-taylor-toollife", name: "Extended Taylor Tool Life", desc: "Tool life prediction" },
      { id: "mat-specific-cutting-force", name: "Kienzle Specific Cutting Force", desc: "Force per chip area" },
      { id: "precision-error-budget", name: "Error Budget RSS", desc: "Root sum square errors" },
      { id: "precision-thermal-expansion", name: "Thermal Expansion", desc: "Length change from temp" },
      { id: "precision-abbe-error", name: "Abbe Error", desc: "Offset measurement error" },
      { id: "precision-merchant-shear", name: "Merchant Shear Plane", desc: "Shear angle calculation" },
      { id: "info-shannon-entropy", name: "Shannon Entropy", desc: "Uncertainty measure" },
    ];
    for (const f of baselineFormulas) {
      index.formulas.set(this.normalizeName(f.id), {
        type: "formula",
        name: f.name,
        description: f.desc,
        source: "CrossDisciplinaryDeepLearningEngine (baseline fallback)",
      });
    }
  }

  private loadAlgorithms(index: AssetRegistry): void {
    // Phase 0.5: read live AlgorithmRegistry (~51 entries) instead of the
    // 20 hardcoded entries that had shipped here. Fallback to baseline set
    // if the registry is torn (bootstrap-safe).
    let loaded = 0;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { algorithmRegistry } = require("../registries/AlgorithmRegistry.js");
      const entries = algorithmRegistry?.all?.() ?? [];
      for (const a of entries) {
        const id = a.id;
        const name = a.name;
        const desc = a.description ?? "";
        if (!id || !name) continue;
        index.algorithms.set(this.normalizeName(id), {
          type: "algorithm",
          name,
          description: desc,
          source: "AlgorithmRegistry (live)",
        });
        index.algorithms.set(this.normalizeName(name), {
          type: "algorithm",
          name,
          description: desc,
          source: "AlgorithmRegistry (live)",
        });
        loaded++;
      }
    } catch (err) {
      log.warn(`[DuplicationGuard] AlgorithmRegistry live-read failed, using baseline: ${err}`);
    }

    if (loaded > 0) {
      log.debug(`[DuplicationGuard] Loaded ${loaded} algorithms from live AlgorithmRegistry`);
      return;
    }

    // Baseline fallback
    const baselineAlgorithms = [
      { id: "bio-genetic-algorithm", name: "Genetic Algorithm", desc: "Evolutionary optimization" },
      { id: "stats-monte-carlo", name: "Monte Carlo Simulation", desc: "Probabilistic simulation" },
      { id: "stats-bayesian-update", name: "Bayesian Update", desc: "Belief updating with evidence" },
      { id: "control-pid", name: "PID Controller", desc: "Proportional-integral-derivative" },
      { id: "control-lqr", name: "LQR", desc: "Linear quadratic regulator" },
      { id: "control-kalman", name: "Extended Kalman Filter", desc: "Recursive state estimation" },
      { id: "geo-nurbs-eval", name: "NURBS Evaluation", desc: "Non-uniform rational B-spline" },
      { id: "geo-bezier", name: "de Casteljau Bezier", desc: "Bezier curve evaluation" },
      { id: "ml-linear-regression", name: "Ridge Linear Regression", desc: "L2 regularized regression" },
      { id: "ml-kmeans", name: "K-Means Clustering", desc: "Partition into k clusters" },
    ];
    for (const a of baselineAlgorithms) {
      index.algorithms.set(this.normalizeName(a.id), {
        type: "algorithm",
        name: a.name,
        description: a.desc,
        source: "CrossDisciplinaryDeepLearningEngine (baseline fallback)",
      });
    }
  }

  private async loadDispatcherActions(index: AssetRegistry): Promise<void> {
    const dispatchersDir = path.join(this.baseDir, "mcp-server", "src", "tools", "dispatchers");

    try {
      const files = fs.readdirSync(dispatchersDir).filter((f) => f.endsWith("Dispatcher.ts"));

      for (const file of files) {
        const dispatcherName = file.replace(".ts", "").replace("Dispatcher", "");
        // Count actions as approximation
        index.actions.set(this.normalizeName(dispatcherName), {
          type: "dispatcher_action",
          name: `${dispatcherName}Dispatcher`,
          path: `src/tools/dispatchers/${file}`,
          description: `Dispatcher for ${dispatcherName} operations`,
        });
      }
    } catch {
      log.warn("[DuplicationGuard] Could not read dispatchers directory");
    }
  }

  private async loadExtractionLog(index: AssetRegistry): Promise<void> {
    const logPath = path.join(this.baseDir, "mcp-server", "data", "state", "extraction-log.json");

    try {
      if (fs.existsSync(logPath)) {
        const content = JSON.parse(fs.readFileSync(logPath, "utf-8"));
        for (const entry of content.extractions || []) {
          index.extractions.set(this.normalizeName(entry.id || entry.name), {
            type: "extraction",
            name: entry.name,
            path: entry.source,
            description: entry.description || "Extracted content",
            createdAt: entry.timestamp,
          });
        }
      }
    } catch {
      // Log doesn't exist yet, that's OK
    }
  }

  private async loadSkills(index: AssetRegistry): Promise<void> {
    // Skills are typically in userSettings commands
    const knownSkills = [
      "commit", "review-pr", "rgs", "pdf-learn", "video-learn", "forge", "navigate",
      "playbook", "scrutinize", "test", "physics-verify", "calibrate", "trace",
    ];

    for (const skill of knownSkills) {
      index.skills.set(this.normalizeName(skill), {
        type: "skill",
        name: `/${skill}`,
        description: `Skill command: ${skill}`,
      });
    }
  }

  private async loadHooks(index: AssetRegistry): Promise<void> {
    const hooksDir = path.join(this.baseDir, "mcp-server", "src", "hooks");

    try {
      if (fs.existsSync(hooksDir)) {
        const files = fs.readdirSync(hooksDir).filter((f) => f.endsWith(".ts"));
        for (const file of files) {
          const name = file.replace(".ts", "");
          index.hooks.set(this.normalizeName(name), {
            type: "hook",
            name,
            path: `src/hooks/${file}`,
            description: `Hook: ${name}`,
          });
        }
      }
    } catch {
      // Hooks dir doesn't exist
    }
  }

  private async appendToExtractionLog(
    type: AssetType,
    name: string,
    assetPath: string,
    description: string
  ): Promise<void> {
    const logPath = path.join(this.baseDir, "mcp-server", "data", "state", "extraction-log.json");

    try {
      let content: ExtractionLog = { extractions: [] };
      if (fs.existsSync(logPath)) {
        content = JSON.parse(fs.readFileSync(logPath, "utf-8"));
      }

      content.extractions = content.extractions ?? [];
      content.extractions.push({
        id: `${type}-${name}`,
        type,
        name,
        source: assetPath,
        description,
        timestamp: new Date().toISOString(),
        status: "completed",
      });

      // U-AWR24: auto-sync doNotExtract after every append
      content.doNotExtract = this.buildDoNotExtract(content.extractions);
      content.lastUpdated = new Date().toISOString();

      // Phase 0.4: cross-process-locked atomic write
      await atomicLockedWrite(logPath, JSON.stringify(content, null, 2));
    } catch (err) {
      log.warn(`[DuplicationGuard] Could not update extraction log: ${err}`);
    }
  }

  /**
   * U-AWR24: Rebuild doNotExtract array from the extractions list, 1:1.
   * Filters to entries with status === "completed" and generates a
   * human-readable blocker line for each.
   */
  buildDoNotExtract(extractions: ExtractionEntry[]): string[] {
    const out: string[] = [];
    for (const e of extractions) {
      if (e.status && e.status !== "completed") continue; // skip superseded, failed
      const id = e.id ?? e.name ?? "unknown";
      let count = "";
      if (typeof (e as any).tipsGenerated === "number") {
        count = ` - ${(e as any).tipsGenerated} tips already extracted`;
      } else if (typeof (e as any).programsIndexed === "number") {
        count = ` - ${(e as any).programsIndexed} programs already indexed`;
      } else {
        count = " - already extracted";
      }
      out.push(`${id}${count}`);
    }
    return out;
  }

  /**
   * U-AWR24: Public utility — sync the extraction log's doNotExtract array
   * against the current extractions list. Called by post-extract hook and
   * directly for one-time reconciliation.
   */
  async syncDoNotExtract(): Promise<{
    synced: boolean;
    before: number;
    after: number;
    added: string[];
  }> {
    const logPath = path.join(this.baseDir, "mcp-server", "data", "state", "extraction-log.json");
    if (!fs.existsSync(logPath)) {
      return { synced: false, before: 0, after: 0, added: [] };
    }
    try {
      const content: ExtractionLog = JSON.parse(fs.readFileSync(logPath, "utf-8"));
      const before = (content.doNotExtract ?? []).length;
      const before_set = new Set(content.doNotExtract ?? []);
      const rebuilt = this.buildDoNotExtract(content.extractions ?? []);
      const added = rebuilt.filter(x => !before_set.has(x));
      content.doNotExtract = rebuilt;
      content.lastUpdated = new Date().toISOString();
      // Phase 0.4: cross-process-locked atomic write
      await atomicLockedWrite(logPath, JSON.stringify(content, null, 2));
      return { synced: true, before, after: rebuilt.length, added };
    } catch (err) {
      log.warn(`[DuplicationGuard] syncDoNotExtract failed: ${err}`);
      return { synced: false, before: 0, after: 0, added: [] };
    }
  }

  /**
   * U-AWR24: ResourceType coverage — verify every enum value has at least
   * one extraction path covered, so mustNotReExtract can block future
   * re-extractions across all resource types.
   */
  getResourceTypeCoverage(): { type: string; covered: boolean; extractionCount: number }[] {
    const logPath = path.join(this.baseDir, "mcp-server", "data", "state", "extraction-log.json");
    const allTypes = ["pdf", "video", "course", "catalog", "program", "cad", "post",
                      "model", "spreadsheet", "archive", "other"];
    const counts: Record<string, number> = {};
    try {
      if (fs.existsSync(logPath)) {
        const content: ExtractionLog = JSON.parse(fs.readFileSync(logPath, "utf-8"));
        for (const e of content.extractions ?? []) {
          const t = (e.type || "other").toLowerCase();
          counts[t] = (counts[t] || 0) + 1;
        }
      }
    } catch {
      // fall through
    }
    return allTypes.map(t => ({
      type: t,
      covered: (counts[t] || 0) > 0,
      extractionCount: counts[t] || 0,
    }));
  }

  private getRegistryForType(index: AssetRegistry, type: AssetType): Map<string, ExistingAsset> {
    switch (type) {
      case "engine":
        return index.engines;
      case "formula":
        return index.formulas;
      case "algorithm":
        return index.algorithms;
      case "dispatcher_action":
        return index.actions;
      case "extraction":
        return index.extractions;
      case "skill":
        return index.skills;
      case "hook":
        return index.hooks;
      default:
        return index.engines;
    }
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/engine$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Jaccard similarity on words
    const wordsA = new Set(a.split(/[^a-z0-9]+/).filter(Boolean));
    const wordsB = new Set(b.split(/[^a-z0-9]+/).filter(Boolean));

    const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }

  private getTopNames(registry: Map<string, ExistingAsset>, count: number): string[] {
    return Array.from(registry.values())
      .slice(0, count)
      .map((a) => a.name);
  }

  /**
   * Get a session context string for AI awareness
   */
  async getSessionContext(): Promise<string> {
    const counts = await this.getCounts();

    return [
      "# DUPLICATION GUARD ACTIVE",
      "",
      "## Current Asset Counts",
      `- Engines: ${counts.engine}`,
      `- Formulas: ${counts.formula}`,
      `- Algorithms: ${counts.algorithm}`,
      `- Actions: ${counts.dispatcher_action}`,
      `- Extractions: ${counts.extraction}`,
      "",
      "## MANDATORY PROTOCOL",
      "Before creating ANY new engine, formula, or algorithm:",
      "```typescript",
      "const check = await duplicationGuardEngine.checkBeforeCreating('engine', 'ProposedName', 'description');",
      "if (check.isDuplicate || check.similarity > 0.7) {",
      "  // DO NOT CREATE — use existing or extend",
      "}",
      "```",
      "",
      "## Search for Existing",
      "```typescript",
      "const existing = await duplicationGuardEngine.searchExisting('keyword');",
      "```",
    ].join("\n");
  }

  // ============================================================================
  // HARD BLOCK METHODS — Throw errors to prevent bypass
  // ============================================================================

  /**
   * HARD BLOCK: Throws error if asset already exists or is too similar
   * Use this when you MUST prevent duplicate creation
   */
  async mustCheckBeforeCreating(
    type: AssetType,
    proposedName: string,
    description: string
  ): Promise<void> {
    const result = await this.checkBeforeCreating(type, proposedName, description);

    if (result.isDuplicate) {
      throw new Error(
        `[DUPLICATION GUARD BLOCK] Cannot create ${type} "${proposedName}" — ` +
        `exact duplicate exists: ${result.existingAsset?.name} at ${result.existingAsset?.path || "registry"}`
      );
    }

    if (result.similarity > 0.7) {
      throw new Error(
        `[DUPLICATION GUARD BLOCK] Cannot create ${type} "${proposedName}" — ` +
        `${Math.round(result.similarity * 100)}% similar to: ${result.alternatives.map(a => a.name).join(", ")}. ` +
        `Use existing asset or extend it instead.`
      );
    }
  }

  /**
   * Check if a document/resource was already extracted
   * @returns extraction details if completed, null if not extracted
   */
  async isExtractionCompleted(sourceIdentifier: string): Promise<ExistingAsset | null> {
    const index = await this.loadAssetIndex();
    const normalizedId = this.normalizeName(sourceIdentifier);

    // Check extractions registry
    for (const [key, asset] of index.extractions.entries()) {
      if (key.includes(normalizedId) || asset.path?.includes(sourceIdentifier)) {
        return asset;
      }
    }

    // Also check cross-session registry for extractions
    const registryPath = path.join(this.baseDir, "mcp-server", "data", "state", CROSS_SESSION_REGISTRY_FILE);
    try {
      if (fs.existsSync(registryPath)) {
        const content: CrossSessionRegistry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
        for (const entry of content.entries) {
          if (entry.type === "extraction") {
            if (
              this.normalizeName(entry.name).includes(normalizedId) ||
              entry.path.includes(sourceIdentifier)
            ) {
              return {
                type: "extraction",
                name: entry.name,
                path: entry.path,
                description: entry.description,
                createdAt: entry.createdAt,
                source: `cross-session:${entry.createdBy}`,
              };
            }
          }
        }
      }
    } catch {
      // Registry doesn't exist, that's OK
    }

    return null;
  }

  /**
   * HARD BLOCK: Throws error if extraction was already completed
   */
  async mustNotReExtract(sourceIdentifier: string): Promise<void> {
    const existing = await this.isExtractionCompleted(sourceIdentifier);
    if (existing) {
      throw new Error(
        `[DUPLICATION GUARD BLOCK] Cannot re-extract "${sourceIdentifier}" — ` +
        `already extracted: ${existing.name} (${existing.createdAt}). ` +
        `${existing.description}`
      );
    }
  }

  /**
   * Get session startup snapshot — concise intelligence for injection
   * Returns key facts in under 1000 tokens
   */
  async getSessionStartSnapshot(): Promise<string> {
    const counts = await this.getCounts();
    const recent = await this.getRecentCrossSessionAssets(72);

    // Categorize recent by type
    const byType: Record<string, string[]> = {};
    for (const entry of recent) {
      if (!byType[entry.type]) byType[entry.type] = [];
      byType[entry.type].push(entry.name);
    }

    // Known completed extractions (hardcoded for reliability)
    const COMPLETED_EXTRACTIONS = [
      "Mastercam docs (45 tips)",
      "hyperMILL manual (25 tips)",
      "Okuma OSP programs (63 tips)",
      "Siemens SINUMERIK (18 tips)",
      "Fanuc programming (35 tips)",
      "Haas programming (28 tips)",
      "Titans of CNC videos (42 procedures)",
      "JM DIE programs (24,545 indexed)",
    ];

    const lines = [
      "═══════════════════════════════════════════════════════════════",
      "         PRISM SESSION INTELLIGENCE SNAPSHOT",
      "═══════════════════════════════════════════════════════════════",
      "",
      "ASSET COUNTS:",
      `  Engines: ${counts.engine} | Formulas: ${counts.formula} | Algorithms: ${counts.algorithm}`,
      `  Actions: ${counts.dispatcher_action} | Extractions: ${counts.extraction}`,
      "",
      "COMPLETED EXTRACTIONS (DO NOT RE-EXTRACT):",
      ...COMPLETED_EXTRACTIONS.map(e => `  ✓ ${e}`),
      "",
    ];

    if (recent.length > 0) {
      lines.push("RECENT BUILDS (last 72h):");
      for (const [type, names] of Object.entries(byType)) {
        lines.push(`  ${type}: ${names.slice(0, 5).join(", ")}${names.length > 5 ? `... (+${names.length - 5})` : ""}`);
      }
      lines.push("");
    }

    lines.push("MANDATORY CHECKS:");
    lines.push("  • BEFORE creating: duplicationGuardEngine.mustCheckBeforeCreating(type, name, desc)");
    lines.push("  • BEFORE extracting: duplicationGuardEngine.mustNotReExtract(source)");
    lines.push("  • Search existing: duplicationGuardEngine.searchExisting(keyword)");
    lines.push("");
    lines.push("═══════════════════════════════════════════════════════════════");

    return lines.join("\n");
  }

  /**
   * Get quick intelligence for hooks (compact version)
   */
  async getHookIntelligence(): Promise<string> {
    const counts = await this.getCounts();

    return [
      `PRISM: ${counts.engine} engines | ${counts.formula} formulas | ${counts.algorithm} algorithms`,
      `DO NOT RE-EXTRACT: Mastercam, hyperMILL, Okuma OSP, Fanuc, Haas, Titans of CNC`,
      `BEFORE CREATING: duplicationGuardEngine.mustCheckBeforeCreating(type, name, desc)`,
    ].join("\n");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const duplicationGuardEngine = new DuplicationGuardEngine();
