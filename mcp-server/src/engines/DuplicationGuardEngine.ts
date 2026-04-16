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
}

export interface AssetRegistry {
  engines: Map<string, ExistingAsset>;
  formulas: Map<string, ExistingAsset>;
  algorithms: Map<string, ExistingAsset>;
  actions: Map<string, ExistingAsset>;
  extractions: Map<string, ExistingAsset>;
  skills: Map<string, ExistingAsset>;
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
   */
  async checkBeforeCreating(
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
        alternatives: [],
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
      };
    }

    return {
      isDuplicate: false,
      similarity: 0,
      recommendation: "proceed",
      reason: "No duplicates or similar assets found",
      alternatives: [],
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

      // Ensure directory exists
      const stateDir = path.dirname(registryPath);
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      fs.writeFileSync(registryPath, JSON.stringify(content, null, 2));
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
    // Known formulas from CrossDisciplinaryDeepLearningEngine
    const knownFormulas = [
      // Physics
      { id: "thermo-heat-generation", name: "Cutting Heat Generation", desc: "Heat from mechanical work" },
      { id: "thermo-carnot-cooling", name: "Carnot Cooling Efficiency", desc: "Maximum cooling efficiency" },
      { id: "thermo-stefan-boltzmann", name: "Stefan-Boltzmann Radiation", desc: "Heat loss through radiation" },
      { id: "fluid-reynolds", name: "Reynolds Number", desc: "Laminar vs turbulent flow" },
      { id: "wave-vibration-modes", name: "Tool Vibration Modes", desc: "Natural vibration frequencies" },
      { id: "quantum-tunneling", name: "Quantum Annealing", desc: "Escape local minima" },
      // Finance
      { id: "finance-black-scholes", name: "Black-Scholes", desc: "Options pricing" },
      { id: "finance-value-at-risk", name: "Value at Risk", desc: "Maximum expected loss" },
      { id: "finance-sharpe-ratio", name: "Sharpe Ratio", desc: "Risk-adjusted return" },
      // Music
      { id: "music-harmonics", name: "Harmonic Series", desc: "Fundamental and overtones" },
      { id: "music-beat-frequency", name: "Beat Frequency", desc: "Interference between frequencies" },
      // Ecology
      { id: "ecology-logistic-growth", name: "Logistic Growth", desc: "S-curve saturation" },
      { id: "ecology-predator-prey", name: "Lotka-Volterra", desc: "Predator-prey dynamics" },
      // Information Theory
      { id: "info-shannon-entropy", name: "Shannon Entropy", desc: "Uncertainty measure" },
      { id: "info-mutual-information", name: "Mutual Information", desc: "Variable dependency" },
      // Materials Science
      { id: "mat-johnson-cook", name: "Johnson-Cook Flow Stress", desc: "High strain-rate stress" },
      { id: "mat-taylor-toollife", name: "Extended Taylor Tool Life", desc: "Tool life prediction" },
      { id: "mat-specific-cutting-force", name: "Kienzle Specific Cutting Force", desc: "Force per chip area" },
      // Precision Engineering
      { id: "precision-error-budget", name: "Error Budget RSS", desc: "Root sum square errors" },
      { id: "precision-thermal-expansion", name: "Thermal Expansion", desc: "Length change from temp" },
      { id: "precision-abbe-error", name: "Abbe Error", desc: "Offset measurement error" },
      { id: "precision-merchant-shear", name: "Merchant Shear Plane", desc: "Shear angle calculation" },
    ];

    for (const f of knownFormulas) {
      index.formulas.set(this.normalizeName(f.id), {
        type: "formula",
        name: f.name,
        description: f.desc,
        source: "CrossDisciplinaryDeepLearningEngine",
      });
    }
  }

  private loadAlgorithms(index: AssetRegistry): void {
    // Known algorithms
    const knownAlgorithms = [
      // Biology
      { id: "bio-genetic-algorithm", name: "Genetic Algorithm", desc: "Evolutionary optimization" },
      { id: "bio-particle-swarm", name: "Particle Swarm Optimization", desc: "Swarm intelligence" },
      { id: "bio-ant-colony", name: "Ant Colony Optimization", desc: "Pheromone-based pathfinding" },
      // Statistics
      { id: "stats-monte-carlo", name: "Monte Carlo Simulation", desc: "Probabilistic simulation" },
      { id: "stats-bayesian-update", name: "Bayesian Update", desc: "Belief updating with evidence" },
      // Computer Science
      { id: "cs-voronoi", name: "Fortune's Voronoi", desc: "Voronoi diagram sweep line" },
      { id: "cs-astar", name: "A* Pathfinding", desc: "Optimal path with heuristic" },
      // Control Theory
      { id: "control-pid", name: "PID Controller", desc: "Proportional-integral-derivative" },
      { id: "control-lqr", name: "LQR", desc: "Linear quadratic regulator" },
      { id: "control-kalman", name: "Extended Kalman Filter", desc: "Recursive state estimation" },
      // Geometry
      { id: "geo-nurbs-eval", name: "NURBS Evaluation", desc: "Non-uniform rational B-spline" },
      { id: "geo-bezier", name: "de Casteljau Bezier", desc: "Bezier curve evaluation" },
      { id: "geo-laplacian-smooth", name: "Laplacian Smoothing", desc: "Mesh smoothing" },
      // Robotics
      { id: "robot-forward-kinematics", name: "Forward Kinematics", desc: "End-effector pose from joints" },
      { id: "robot-rtcp", name: "RTCP Transformation", desc: "Rotary tool center point" },
      { id: "robot-scurve", name: "S-Curve Motion Profile", desc: "Jerk-limited trajectory" },
      // Machine Learning
      { id: "ml-linear-regression", name: "Ridge Linear Regression", desc: "L2 regularized regression" },
      { id: "ml-kmeans", name: "K-Means Clustering", desc: "Partition into k clusters" },
      { id: "ml-cnn-conv2d", name: "2D Convolution", desc: "CNN feature extraction" },
    ];

    for (const a of knownAlgorithms) {
      index.algorithms.set(this.normalizeName(a.id), {
        type: "algorithm",
        name: a.name,
        description: a.desc,
        source: "CrossDisciplinaryDeepLearningEngine",
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
      let content = { extractions: [] as any[] };
      if (fs.existsSync(logPath)) {
        content = JSON.parse(fs.readFileSync(logPath, "utf-8"));
      }

      content.extractions.push({
        id: `${type}-${name}`,
        type,
        name,
        source: assetPath,
        description,
        timestamp: new Date().toISOString(),
      });

      fs.writeFileSync(logPath, JSON.stringify(content, null, 2));
    } catch (err) {
      log.warn(`[DuplicationGuard] Could not update extraction log: ${err}`);
    }
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
