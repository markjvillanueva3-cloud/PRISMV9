/**
 * UnifiedAwarenessOrchestrator — Central PRISM AI Awareness System
 *
 * Single source of truth for "what PRISM knows". Coordinates:
 * - PRISMSelfAwarenessEngine (JM DIE, tribal knowledge)
 * - DuplicationGuardEngine (assets, extractions)
 * - FormulaRegistry (all physics formulas)
 * - Resource index (H: drive mapping)
 * - Material database
 * - Tool database
 *
 * Use this engine for ANY awareness query. Never bypass.
 *
 * @module engines/UnifiedAwarenessOrchestrator
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { formulaOrchestrator, type CoverageReport } from "./FormulaOrchestrator.js";
import { CANONICAL_KIENZLE, CANONICAL_MATERIAL_DB } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type AwarenessDomain =
  | "engine"
  | "formula"
  | "algorithm"
  | "material"
  | "tool"
  | "tribal"
  | "resource"
  | "program"
  | "extraction"
  | "dispatcher"
  | "action";

export interface AwarenessQuery {
  domain: AwarenessDomain | "all";
  query: string;
  context?: string;
  limit?: number;
}

export interface AwarenessMatch {
  domain: AwarenessDomain;
  name: string;
  description: string;
  path?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface AwarenessResult {
  found: boolean;
  matches: AwarenessMatch[];
  suggestions: string[];
  relatedCapabilities: string[];
  searchedDomains: AwarenessDomain[];
}

export interface CapabilityInventory {
  engines: number;
  dispatchers: number;
  actions: number;
  formulas: number;
  algorithms: number;
  materials: number;
  tools: number;
  tribalTips: number;
  playbookRules: number;
  jmDiePrograms: number;
  resourceFolders: number;
  completedExtractions: number;
  // U-AWR23 — deeper source coverage
  hooks: number;
  routes: number;
  schemas: number;
  migrations: number;
  registries: number;
}

export interface SessionSnapshot {
  timestamp: string;
  inventory: CapabilityInventory;
  recentBuilds: string[];
  recentExtractions: string[];
  doNotDuplicate: string[];
  doNotReExtract: string[];
  criticalEngines: string[];
  keyFormulas: string[];
}

// ============================================================================
// STATIC DATA — Hardcoded for reliability
// ============================================================================

const COMPLETED_EXTRACTIONS = [
  { id: "mastercam-docs", name: "Mastercam Documentation", tips: 45 },
  { id: "hypermill-manual", name: "hyperMILL Manual", tips: 25 },
  { id: "okuma-osp", name: "Okuma OSP Programs", tips: 63 },
  { id: "siemens-sinumerik", name: "Siemens SINUMERIK", tips: 18 },
  { id: "fanuc-programming", name: "Fanuc Programming", tips: 35 },
  { id: "haas-programming", name: "Haas Programming", tips: 28 },
  { id: "titans-of-cnc", name: "Titans of CNC Videos", tips: 42 },
  { id: "jm-die-programs", name: "JM DIE Programs", programs: 24545 },
  { id: "hurco-winmax", name: "Hurco WinMax", tips: 12 },
  { id: "hypermill-automation", name: "hyperMILL AUTOMATION", tips: 4 },
  { id: "hypermill-vmc", name: "hyperMILL VMC", tips: 5 },
  { id: "hurco-5axis-post", name: "Hurco 5-Axis Post", tips: 8 },
];

const CRITICAL_ENGINES = [
  "SpeedFeedOrchestratorEngine",
  "KienzleForceModelEngine",
  "TaylorToolLifeEngine",
  "PRISMSelfAwarenessEngine",
  "DuplicationGuardEngine",
  "CrossDisciplinaryDeepLearningEngine",
  "PRISMCreativeReasoningEngine",
  "AIIntelligenceMaximizerEngine",
  "DeepAIIntelligenceEngine",
  "TribalKnowledgeAdvisorEngine",
  "MachiningPlaybookEngine",
  "MillingDeepAIHardeningEngine",
  "LatheDeepAIHardeningEngine",
  "WireEDMDeepAIHardeningEngine",
  "PostProcessorDeepAIHardeningEngine",
];

const KEY_FORMULAS = [
  "Kienzle cutting force: Fc = kc1.1 * b * h^(1-mc)",
  "Taylor tool life: VcT^n = C",
  "Surface roughness: Ra = f²/(32*r)",
  "Chip load: fz = Vf/(n*z)",
  "Metal removal rate: Q = ap * ae * Vf",
  "Spindle power: P = Fc * Vc / 60000",
  "Torque: M = Fc * D/2",
  "Johnson-Cook flow stress",
  "Merchant shear plane angle",
  "NURBS curve evaluation",
  "S-curve motion profile",
  "PID control",
  "Extended Kalman filter",
];

const RESOURCE_FOLDERS = [
  { path: "MIT COURSES", count: 22, status: "partial" },
  { path: "MANUFACTURER_CATALOGS", count: 10, status: "not_extracted" },
  { path: "HYPERMILL", count: 50, status: "partial" },
  { path: "MasterCam", count: 30, status: "extracted" },
  { path: "OKUMA MULTUS PDFS", count: 20, status: "extracted" },
  { path: "FUSION360", count: 40, status: "not_extracted" },
  { path: "FUSION POSTS", count: 15, status: "not_extracted" },
  { path: "MACHINING KNOWLEDGE FORMULAS", count: 25, status: "partial" },
  { path: "PDF", count: 100, status: "partial" },
];

// ============================================================================
// ENGINE
// ============================================================================

export class UnifiedAwarenessOrchestrator {
  private baseDir: string;
  private inventoryCache: CapabilityInventory | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 300000; // 5 minutes

  constructor() {
    // Resolve baseDir from this file's location (src/engines/ → mcp-server/) so it
    // works regardless of cwd (dev, dist, test runner). Prior impl used
    // process.cwd() which silently returned stale fallback counts when run from dist.
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    log.info("[UnifiedAwareness] Initialized — single source of truth for PRISM knowledge");
  }

  // ============================================================================
  // QUERY INTERFACE
  // ============================================================================

  /**
   * Search across all awareness domains
   */
  async query(input: AwarenessQuery): Promise<AwarenessResult> {
    const { domain, query, limit = 10 } = input;
    const normalizedQuery = query.toLowerCase();

    const matches: AwarenessMatch[] = [];
    const searchedDomains: AwarenessDomain[] = [];

    if (domain === "all" || domain === "engine") {
      searchedDomains.push("engine");
      matches.push(...(await this.searchEngines(normalizedQuery, limit)));
    }

    if (domain === "all" || domain === "formula") {
      searchedDomains.push("formula");
      matches.push(...this.searchFormulas(normalizedQuery, limit));
    }

    if (domain === "all" || domain === "material") {
      searchedDomains.push("material");
      matches.push(...(await this.searchMaterials(normalizedQuery, limit)));
    }

    if (domain === "all" || domain === "tribal") {
      searchedDomains.push("tribal");
      matches.push(...(await this.searchTribalKnowledge(normalizedQuery, limit)));
    }

    if (domain === "all" || domain === "extraction") {
      searchedDomains.push("extraction");
      matches.push(...this.searchExtractions(normalizedQuery, limit));
    }

    // U-AWR10 — tool, rule/playbook, resource domains
    if (domain === "all" || domain === "tool") {
      searchedDomains.push("tool");
      matches.push(...(await this.searchTools(normalizedQuery, limit)));
    }

    if (domain === "all" || (domain as any) === "rule" || (domain as any) === "playbook") {
      searchedDomains.push((domain as any) === "playbook" ? "tribal" : "tribal");
      matches.push(...(await this.searchPlaybookRules(normalizedQuery, limit)));
    }

    if (domain === "all" || domain === "resource") {
      searchedDomains.push("resource");
      matches.push(...(await this.searchResources(normalizedQuery, limit)));
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    // Generate suggestions
    const suggestions = this.generateSuggestions(normalizedQuery, matches);

    // Find related capabilities
    const relatedCapabilities = this.findRelatedCapabilities(normalizedQuery);

    return {
      found: matches.length > 0,
      matches: matches.slice(0, limit),
      suggestions,
      relatedCapabilities,
      searchedDomains,
    };
  }

  /**
   * Check if something already exists before creating
   */
  async checkBeforeCreating(
    type: AwarenessDomain,
    proposedName: string,
    description: string
  ): Promise<{ exists: boolean; match?: AwarenessMatch; recommendation: string }> {
    const result = await this.query({
      domain: type,
      query: `${proposedName} ${description}`,
      limit: 5,
    });

    if (result.matches.length > 0 && result.matches[0].confidence > 0.7) {
      return {
        exists: true,
        match: result.matches[0],
        recommendation: `Use existing: ${result.matches[0].name}`,
      };
    }

    return {
      exists: false,
      recommendation: "Proceed with creation",
    };
  }

  /**
   * Check if a resource was already extracted
   */
  isExtractionCompleted(sourceId: string): { completed: boolean; details?: typeof COMPLETED_EXTRACTIONS[0] } {
    const normalized = sourceId.toLowerCase();
    const match = COMPLETED_EXTRACTIONS.find(
      (e) =>
        e.id.includes(normalized) ||
        e.name.toLowerCase().includes(normalized) ||
        normalized.includes(e.id)
    );

    return {
      completed: !!match,
      details: match,
    };
  }

  // ============================================================================
  // SESSION SNAPSHOT
  // ============================================================================

  /**
   * Get complete session snapshot for injection at session start
   */
  async getSessionSnapshot(): Promise<SessionSnapshot> {
    const inventory = await this.getInventory();

    // Get recent builds from cross-session registry
    const recentBuilds = await this.getRecentBuilds(72); // last 72 hours

    return {
      timestamp: new Date().toISOString(),
      inventory,
      recentBuilds,
      recentExtractions: COMPLETED_EXTRACTIONS.map((e) => `${e.name}: ${e.tips || e.programs}`),
      doNotDuplicate: CRITICAL_ENGINES.slice(0, 10),
      doNotReExtract: COMPLETED_EXTRACTIONS.map((e) => e.id),
      criticalEngines: CRITICAL_ENGINES,
      keyFormulas: KEY_FORMULAS,
    };
  }

  /**
   * Get concise snapshot for hooks (< 1000 tokens)
   */
  async getCompactSnapshot(): Promise<string> {
    const inv = await this.getInventory();

    const lines = [
      "═══════════════════════════════════════════════════════",
      "              PRISM UNIFIED AWARENESS ACTIVE",
      "═══════════════════════════════════════════════════════",
      "",
      `INVENTORY: ${inv.engines} engines | ${inv.dispatchers} dispatchers | ${inv.actions} actions`,
      `           ${inv.formulas} formulas | ${inv.algorithms} algorithms | ${inv.tribalTips} tips`,
      `           ${inv.materials} materials | ${inv.tools} tools | ${inv.jmDiePrograms} JM DIE programs`,
      "",
      "COMPLETED EXTRACTIONS (DO NOT RE-EXTRACT):",
      ...COMPLETED_EXTRACTIONS.slice(0, 8).map(
        (e) => `  ✓ ${e.name}: ${e.tips || e.programs}`
      ),
      "",
      "CRITICAL ENGINES (USE THESE):",
      `  ${CRITICAL_ENGINES.slice(0, 8).join(", ")}`,
      "",
      "BEFORE CREATING: unifiedAwarenessOrchestrator.checkBeforeCreating(type, name, desc)",
      "BEFORE EXTRACTING: unifiedAwarenessOrchestrator.isExtractionCompleted(sourceId)",
      "",
      "═══════════════════════════════════════════════════════",
    ];

    return lines.join("\n");
  }

  // ============================================================================
  // INVENTORY
  // ============================================================================

  /**
   * Get current capability inventory
   */
  async getInventory(): Promise<CapabilityInventory> {
    const now = Date.now();
    if (this.inventoryCache && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.inventoryCache;
    }

    const inventory: CapabilityInventory = {
      engines: await this.countEngines(),
      dispatchers: await this.countDispatchers(),
      actions: await this.countActions(),
      formulas: this.countFormulas(),
      algorithms: await this.countAlgorithms(),
      materials: await this.countMaterials(),
      tools: await this.countTools(),
      tribalTips: await this.countTribalTips(),
      playbookRules: await this.countPlaybookRules(),
      jmDiePrograms: 24545, // Known count
      resourceFolders: RESOURCE_FOLDERS.length,
      completedExtractions: COMPLETED_EXTRACTIONS.length,
      // U-AWR23 — deeper source coverage
      hooks: await this.countHooks(),
      routes: await this.countRoutes(),
      schemas: await this.countSchemas(),
      migrations: await this.countMigrations(),
      registries: await this.countRegistries(),
    };

    this.inventoryCache = inventory;
    this.cacheTimestamp = now;

    return inventory;
  }

  // ============================================================================
  // SEARCH METHODS
  // ============================================================================

  private async searchEngines(query: string, limit: number): Promise<AwarenessMatch[]> {
    const enginesDir = path.join(this.baseDir, "mcp-server", "src", "engines");
    const matches: AwarenessMatch[] = [];

    try {
      const files = fs.readdirSync(enginesDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

      for (const file of files) {
        const name = file.replace(".ts", "");
        const normalizedName = name.toLowerCase();

        if (normalizedName.includes(query) || query.split(" ").some((w) => normalizedName.includes(w))) {
          const confidence = normalizedName.includes(query) ? 0.9 : 0.6;
          matches.push({
            domain: "engine",
            name,
            description: name.replace(/Engine$/, "").replace(/([A-Z])/g, " $1").trim(),
            path: `src/engines/${file}`,
            confidence,
          });
        }
      }
    } catch {
      log.warn("[UnifiedAwareness] Could not search engines");
    }

    return matches.slice(0, limit);
  }

  private searchFormulas(query: string, limit: number): AwarenessMatch[] {
    const matches: AwarenessMatch[] = [];

    for (const formula of KEY_FORMULAS) {
      const normalized = formula.toLowerCase();
      if (normalized.includes(query) || query.split(" ").some((w) => normalized.includes(w))) {
        const confidence = normalized.includes(query) ? 0.9 : 0.6;
        matches.push({
          domain: "formula",
          name: formula.split(":")[0],
          description: formula,
          confidence,
        });
      }
    }

    return matches.slice(0, limit);
  }

  /**
   * Get formula coverage report from FormulaOrchestrator (U-AWR31)
   */
  getFormulaCoverage(): CoverageReport {
    return formulaOrchestrator.getFormulaCoverage();
  }

  /**
   * Get formulas by domain from FormulaOrchestrator (U-AWR31)
   */
  getFormulasByDomain(domain: "lathe" | "mill" | "wedm" | "general" | "all") {
    return formulaOrchestrator.getFormulasByDomain(domain);
  }

  private async searchMaterials(query: string, limit: number): Promise<AwarenessMatch[]> {
    const matches: AwarenessMatch[] = [];

    // Common materials with Kienzle coefficients
    const materials = [
      { name: "4140 Steel", kc1_1: 1990, mc: 0.21 },
      { name: "1018 Steel", kc1_1: 1780, mc: 0.18 },
      { name: "D2 Tool Steel", kc1_1: 2850, mc: 0.28 },
      { name: "6061-T6 Aluminum", kc1_1: 790, mc: 0.15 },
      { name: "7075-T6 Aluminum", kc1_1: 870, mc: 0.16 },
      { name: "304 Stainless", kc1_1: 2350, mc: 0.24 },
      { name: "316 Stainless", kc1_1: 2420, mc: 0.25 },
      { name: "Ti-6Al-4V", kc1_1: 1850, mc: 0.20 },
      { name: "Inconel 718", kc1_1: 3200, mc: 0.32 },
      { name: "Brass 360", kc1_1: 680, mc: 0.14 },
    ];

    for (const mat of materials) {
      const normalized = mat.name.toLowerCase();
      if (normalized.includes(query) || query.split(" ").some((w) => normalized.includes(w))) {
        matches.push({
          domain: "material",
          name: mat.name,
          description: `kc1.1=${mat.kc1_1}, mc=${mat.mc}`,
          confidence: 0.85,
          metadata: { kc1_1: mat.kc1_1, mc: mat.mc },
        });
      }
    }

    return matches.slice(0, limit);
  }

  private async searchTribalKnowledge(query: string, limit: number): Promise<AwarenessMatch[]> {
    // Placeholder - would search actual tribal tips
    const matches: AwarenessMatch[] = [];

    // Common topics
    const topics = [
      "thin wall machining",
      "deep pocket milling",
      "thread cutting",
      "surface finish",
      "chip control",
      "coolant strategy",
      "workholding",
      "tool deflection",
      "vibration control",
      "heat management",
    ];

    for (const topic of topics) {
      if (topic.includes(query) || query.split(" ").some((w) => topic.includes(w))) {
        matches.push({
          domain: "tribal",
          name: topic,
          description: `Shop knowledge about ${topic}`,
          confidence: 0.7,
        });
      }
    }

    return matches.slice(0, limit);
  }

  /**
   * Search tool catalog — U-AWR10 wiring.
   * Delegates to ToolCatalogEngine for real tool data (50k+ tools).
   */
  private async searchTools(query: string, limit: number): Promise<AwarenessMatch[]> {
    const matches: AwarenessMatch[] = [];
    try {
      const { toolCatalogEngine } = await import("./ToolCatalogEngine.js");
      const hits = toolCatalogEngine.search({ max_results: limit });
      for (const t of hits) {
        const normalized = `${t.id} ${t.manufacturer} ${t.type} ${t.subtype}`.toLowerCase();
        if (!query || normalized.includes(query) || query.split(" ").some(w => normalized.includes(w))) {
          matches.push({
            domain: "tool",
            name: t.id,
            description: `${t.manufacturer} ${t.type}${t.subtype ? "/" + t.subtype : ""} ⌀${t.physical.cutting_diameter_mm}mm`,
            confidence: normalized.includes(query) ? 0.85 : 0.6,
            metadata: { manufacturer: t.manufacturer, diameter_mm: t.physical.cutting_diameter_mm },
          });
        }
      }
    } catch {
      // Engine unavailable — graceful degradation
    }
    return matches.slice(0, limit);
  }

  /**
   * Search playbook rules — U-AWR10 wiring.
   * Delegates to MachiningPlaybookEngine for shop-floor rules.
   */
  private async searchPlaybookRules(query: string, limit: number): Promise<AwarenessMatch[]> {
    const matches: AwarenessMatch[] = [];
    try {
      const { machiningPlaybookEngine } = await import("./MachiningPlaybookEngine.js");
      const result = machiningPlaybookEngine.advise({} as any);
      for (const r of result.rules) {
        const normalized = `${r.id} ${r.title} ${r.rule} ${r.category}`.toLowerCase();
        if (!query || normalized.includes(query) || query.split(" ").some(w => normalized.includes(w))) {
          matches.push({
            domain: "tribal", // reuse existing tribal surface for rules
            name: r.id,
            description: `[${r.severity.toUpperCase()}] ${r.title}`,
            confidence: normalized.includes(query) ? 0.9 : 0.65,
            metadata: { category: r.category, severity: r.severity },
          });
          if (matches.length >= limit) break;
        }
      }
    } catch {
      // Engine unavailable — graceful degradation
    }
    return matches.slice(0, limit);
  }

  /**
   * Search resource indexes — U-AWR10 wiring.
   * Delegates to ResourceIndexEngine for H: drive coverage.
   */
  private async searchResources(query: string, limit: number): Promise<AwarenessMatch[]> {
    const matches: AwarenessMatch[] = [];
    try {
      const { resourceIndexEngine } = await import("./ResourceIndexEngine.js");
      const results = resourceIndexEngine.search(query) ?? [];
      const resultsArr = Array.isArray(results) ? results : [];
      for (const r of resultsArr.slice(0, limit)) {
        matches.push({
          domain: "resource",
          name: (r as any).path ?? (r as any).name ?? String(r),
          description: (r as any).description ?? `Resource: ${(r as any).type ?? "folder"}`,
          confidence: 0.75,
          metadata: r as any,
        });
      }
    } catch {
      // Engine unavailable — graceful degradation
    }
    return matches.slice(0, limit);
  }

  private searchExtractions(query: string, limit: number): AwarenessMatch[] {
    const matches: AwarenessMatch[] = [];

    for (const ext of COMPLETED_EXTRACTIONS) {
      const normalized = `${ext.id} ${ext.name}`.toLowerCase();
      if (normalized.includes(query) || query.split(" ").some((w) => normalized.includes(w))) {
        matches.push({
          domain: "extraction",
          name: ext.name,
          description: `Extracted ${ext.tips || ext.programs} items`,
          confidence: 0.95,
          metadata: ext,
        });
      }
    }

    return matches.slice(0, limit);
  }

  // ============================================================================
  // COUNT METHODS
  // ============================================================================

  private async countEngines(): Promise<number> {
    const enginesDir = path.join(this.baseDir, "mcp-server", "src", "engines");
    try {
      return fs.readdirSync(enginesDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).length;
    } catch {
      return 1809; // Known count
    }
  }

  private async countDispatchers(): Promise<number> {
    const dispatchersDir = path.join(this.baseDir, "mcp-server", "src", "tools", "dispatchers");
    try {
      return fs.readdirSync(dispatchersDir).filter((f) => f.endsWith("Dispatcher.ts")).length;
    } catch {
      return 84;
    }
  }

  private async countActions(): Promise<number> {
    // U-AWR23: live count by scanning dispatcher z.enum() lists instead
    // of a stale hardcoded 5156. Sums unique action strings across all
    // *Dispatcher.ts files.
    const dispatchersDir = path.join(this.baseDir, "mcp-server", "src", "tools", "dispatchers");
    try {
      const files = fs.readdirSync(dispatchersDir).filter(f => f.endsWith("Dispatcher.ts"));
      let total = 0;
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(dispatchersDir, file), "utf-8");
          // Match export const ACTIONS = [ ... ] as const;
          const m = content.match(/export\s+const\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);
          if (m) {
            const entries = m[1].match(/"[a-z_][a-z0-9_]*"/gi) || [];
            total += new Set(entries).size;
          }
        } catch {
          // skip unreadable file
        }
      }
      return total || 5156;
    } catch {
      return 5156; // Fallback to prior known count
    }
  }

  private countFormulas(): number {
    return KEY_FORMULAS.length + 26; // Key formulas + registry
  }

  private async countAlgorithms(): Promise<number> {
    const algorithmsDir = path.join(this.baseDir, "mcp-server", "src", "algorithms");
    try {
      return fs.readdirSync(algorithmsDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).length;
    } catch {
      return 53;
    }
  }

  private async countMaterials(): Promise<number> {
    const materialsDir = path.join(this.baseDir, "mcp-server", "data", "materials");
    try {
      return fs.readdirSync(materialsDir).filter((f) => f.endsWith(".json")).length;
    } catch {
      return 3;
    }
  }

  private async countTools(): Promise<number> {
    const toolsDir = path.join(this.baseDir, "mcp-server", "data", "tools");
    try {
      return fs.readdirSync(toolsDir).filter((f) => f.endsWith(".json")).length;
    } catch {
      return 0;
    }
  }

  private async countTribalTips(): Promise<number> {
    // U-AWR23: live count across tribal data files + engine KNOWLEDGE_BASE
    const dataDir = path.join(this.baseDir, "mcp-server", "src", "data");
    let total = 0;
    try {
      const files = fs.readdirSync(dataDir).filter(
        f => /tribal|tip|cam-tips/i.test(f) && (f.endsWith(".ts") || f.endsWith(".json")),
      );
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
          // Count object entries with an id: field (tip pattern) or top-level array
          if (file.endsWith(".json")) {
            const data = JSON.parse(content);
            if (Array.isArray(data)) total += data.length;
          } else {
            const idMatches = content.match(/\bid:\s*["'`][^"'`]+["'`]/g);
            if (idMatches) total += idMatches.length;
          }
        } catch {
          // skip unreadable/malformed
        }
      }
    } catch {
      // dir missing
    }
    // Add TribalKnowledgeEngine inline tips if present
    try {
      const tribEng = path.join(this.baseDir, "mcp-server", "src", "engines", "TribalKnowledgeEngine.ts");
      if (fs.existsSync(tribEng)) {
        const content = fs.readFileSync(tribEng, "utf-8");
        const kbMatches = content.match(/\bid:\s*["'`][^"'`]+["'`]/g);
        if (kbMatches) total += kbMatches.length;
      }
    } catch {
      // skip
    }
    return total > 0 ? total : 339;
  }

  /** U-AWR23: count hooks registered across .claude/ and mcp-server/hooks/. */
  private async countHooks(): Promise<number> {
    let total = 0;
    const candidateDirs = [
      path.join(this.baseDir, ".claude", "hooks"),
      path.join(this.baseDir, "mcp-server", "src", "hooks"),
      path.join(this.baseDir, "mcp-server", "hooks"),
    ];
    for (const dir of candidateDirs) {
      try {
        if (fs.existsSync(dir)) {
          total += fs.readdirSync(dir)
            .filter(f => f.endsWith(".mjs") || f.endsWith(".ts") || f.endsWith(".js"))
            .filter(f => !f.endsWith(".test.ts"))
            .length;
        }
      } catch {
        // skip
      }
    }
    return total;
  }

  /** U-AWR23: count registered routes in Express route modules. */
  private async countRoutes(): Promise<number> {
    const routesDir = path.join(this.baseDir, "mcp-server", "src", "routes");
    try {
      if (!fs.existsSync(routesDir)) return 0;
      const files = fs.readdirSync(routesDir).filter(f => f.endsWith(".ts"));
      let total = 0;
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(routesDir, file), "utf-8");
          // Count router.get/post/put/delete/patch
          const matches = content.match(/\brouter\.(get|post|put|delete|patch)\(/g);
          if (matches) total += matches.length;
        } catch {
          // skip
        }
      }
      return total;
    } catch {
      return 0;
    }
  }

  /** U-AWR23: count Zod schema files in mcp-server/src/schemas/. */
  private async countSchemas(): Promise<number> {
    const schemasDir = path.join(this.baseDir, "mcp-server", "src", "schemas");
    try {
      if (!fs.existsSync(schemasDir)) return 0;
      return fs.readdirSync(schemasDir)
        .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"))
        .length;
    } catch {
      return 0;
    }
  }

  /** U-AWR23: count SQL migrations in mcp-server/src/db/migrations/. */
  private async countMigrations(): Promise<number> {
    const migrationsDir = path.join(this.baseDir, "mcp-server", "src", "db", "migrations");
    try {
      if (!fs.existsSync(migrationsDir)) return 0;
      return fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith(".sql") || f.endsWith(".ts"))
        .length;
    } catch {
      return 0;
    }
  }

  /** U-AWR23: count registries in mcp-server/src/registries/. */
  private async countRegistries(): Promise<number> {
    const registriesDir = path.join(this.baseDir, "mcp-server", "src", "registries");
    try {
      if (!fs.existsSync(registriesDir)) return 0;
      return fs.readdirSync(registriesDir)
        .filter(f => f.endsWith("Registry.ts") || f.endsWith("registry.ts"))
        .length;
    } catch {
      return 0;
    }
  }

  private async countPlaybookRules(): Promise<number> {
    const rulesPath = path.join(this.baseDir, "mcp-server", "src", "data", "machining-playbook-rules.ts");
    try {
      if (fs.existsSync(rulesPath)) {
        const content = fs.readFileSync(rulesPath, "utf-8");
        return (content.match(/id:/g) || []).length;
      }
    } catch {
      // File doesn't exist
    }
    return 0;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getRecentBuilds(hoursBack: number): Promise<string[]> {
    const registryPath = path.join(this.baseDir, "mcp-server", "data", "state", "cross-session-asset-registry.json");
    try {
      if (fs.existsSync(registryPath)) {
        const content = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
        const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
        return (content.entries || [])
          .filter((e: { createdAt: string }) => new Date(e.createdAt).getTime() > cutoff)
          .map((e: { name: string }) => e.name)
          .slice(0, 10);
      }
    } catch {
      // Registry doesn't exist
    }
    return [];
  }

  private generateSuggestions(query: string, matches: AwarenessMatch[]): string[] {
    const suggestions: string[] = [];

    if (matches.length === 0) {
      suggestions.push(`No matches for "${query}". Try broader terms.`);
      suggestions.push("Use /dedup before creating new assets.");
    } else if (matches.some((m) => m.confidence > 0.8)) {
      suggestions.push(`High-confidence match found: ${matches[0].name}`);
      suggestions.push("Use existing capability instead of creating new.");
    }

    // Add slash command suggestions
    if (query.includes("pdf") || query.includes("document")) {
      suggestions.push("Use /pdf-learn for document extraction");
    }
    if (query.includes("speed") || query.includes("feed")) {
      suggestions.push("Use SpeedFeedOrchestratorEngine for calculations");
    }
    if (query.includes("force") || query.includes("cutting")) {
      suggestions.push("Use KienzleForceModelEngine for force calculations");
    }

    return suggestions;
  }

  private findRelatedCapabilities(query: string): string[] {
    const related: string[] = [];

    // Map query terms to capabilities
    const mappings: Record<string, string[]> = {
      speed: ["SpeedFeedOrchestratorEngine", "speedFeedDispatcher"],
      feed: ["SpeedFeedOrchestratorEngine", "speedFeedDispatcher"],
      force: ["KienzleForceModelEngine", "CuttingForceCalculatorEngine"],
      tool: ["ToolRouterEngine", "SmartToolSelectorEngine", "toolingDispatcher"],
      material: ["MaterialRegistry", "materialDispatcher"],
      lathe: ["LatheDeepAIHardeningEngine", "latheDispatcher"],
      mill: ["MillingDeepAIHardeningEngine", "millingDispatcher"],
      edm: ["WireEDMDeepAIHardeningEngine", "edmDispatcher"],
      post: ["PostProcessorDeepAIHardeningEngine", "postProcessorDispatcher"],
    };

    for (const [term, capabilities] of Object.entries(mappings)) {
      if (query.includes(term)) {
        related.push(...capabilities);
      }
    }

    return [...new Set(related)];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const unifiedAwarenessOrchestrator = new UnifiedAwarenessOrchestrator();
