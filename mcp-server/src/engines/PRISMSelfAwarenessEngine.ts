/**
 * PRISMSelfAwarenessEngine — Token-Efficient Agent Self-Model
 *
 * AGENT ROADMAP: Enhancement to MS1-MS4
 *
 * Provides the PRISM agent with constant, token-efficient awareness of:
 * - All 82 dispatchers and 4,296+ actions
 * - All 1,559+ engines and their purposes
 * - Manufacturing domain knowledge
 * - Learned preferences and corrections
 * - External trusted resources
 * - H: Drive contents (full drive awareness)
 * - JM DIE programs (24,545 CNC programs, 100+ customers)
 * - Tribal Knowledge (3,700+ tips across 18 CAM systems)
 * - Machining Playbook (296 experiential rules)
 * - Resource catalogs (40+ data files)
 *
 * HARDENING FEATURES:
 * - Staleness detection with auto-refresh
 * - Confidence scoring on capability matches
 * - Fallback chains for reliability
 * - Source verification for external data
 * - Gap detection (what we CAN'T do)
 * - Usage analytics for optimization
 * - Delta updates (only refresh changes)
 * - Web search with trusted sources
 *
 * @module engines/PRISMSelfAwarenessEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Compressed capability manifest (~500 tokens when serialized) */
export interface CapabilityManifest {
  version: string;
  generatedAt: string;
  expiresAt: string;

  // Core counts
  counts: {
    dispatchers: number;
    actions: number;
    engines: number;
    formulas: number;
    algorithms: number;
    hooks: number;
    skills: number;
    // H: Drive counts
    jmDiePrograms: number;
    jmDieCustomers: number;
    tribalTips: number;
    playbookRules: number;
    resourceFiles: number;
    // AI feature counts
    aiFeatures: number;
    reasoningEngines: number;
    multiAgentCapabilities: number;
  };

  // Top capabilities by category (most used/important)
  topCapabilities: {
    calculation: string[];    // speed_feed, cutting_force, tool_life...
    business: string[];       // quote_estimate, job_status, invoice...
    cam: string[];            // machine_selection, toolpath, post_process...
    data: string[];           // material_lookup, tool_catalog, machine_specs...
    validation: string[];     // program_check, simulation, safety_check...
    quality: string[];        // surface_finish, tolerance, inspection...
  };

  // Domain expertise areas
  domains: string[];

  // Recent learnings summary
  recentLearnings: string[];

  // Known gaps (things we can't do well)
  knownGaps: string[];

  // Checksum for delta detection
  checksum: string;
}

/** Capability search result */
export interface CapabilityMatch {
  dispatcher: string;
  action: string;
  fullAction: string;
  description: string;
  confidence: number;
  source: "index" | "search" | "inference" | "memory";
  alternatives: AlternativeCapability[];
}

/** Alternative capability */
export interface AlternativeCapability {
  fullAction: string;
  description: string;
  confidence: number;
  tradeoff?: string;
}

/** Engine match result */
export interface EngineMatch {
  name: string;
  path: string;
  description: string;
  category: string;
  confidence: number;
  relatedEngines: string[];
}

/** External knowledge source */
export interface ExternalSource {
  id: string;
  name: string;
  type: "manufacturer" | "standard" | "handbook" | "research";
  url?: string;
  trustLevel: number;  // 0-1
  lastVerified?: string;
  domains: string[];
}

/** Self-awareness query result */
export interface SelfAwarenessQuery {
  query: string;
  queryType: "capability" | "engine" | "howto" | "gap" | "domain";
  results: CapabilityMatch[] | EngineMatch[] | string[];
  confidence: number;
  fromCache: boolean;
  processingMs: number;
}

/** Usage analytics entry */
interface UsageEntry {
  action: string;
  count: number;
  lastUsed: string;
  avgConfidence: number;
  successRate: number;
}

/** Gap detection result */
export interface GapAnalysis {
  query: string;
  canHandle: boolean;
  confidence: number;
  reason: string;
  suggestions: string[];
  externalSources?: ExternalSource[];
}

// ============================================================================
// H: DRIVE AWARENESS TYPES
// ============================================================================

/** H: Drive location entry */
export interface DriveLocation {
  path: string;
  type: "directory" | "file";
  category: "prism" | "jm_die" | "state" | "config" | "data" | "archive" | "temp";
  description: string;
  fileCount?: number;
  lastModified?: string;
  keywords: string[];
}

/** JM DIE customer index entry */
export interface JMDieCustomer {
  name: string;
  path: string;
  programCount: number;
  machineTypes: string[];  // "lathe" | "mill" | "wedm" | "multus"
}

/** JM DIE machine type folder */
export interface JMDieMachineFolder {
  type: "CNC LATHE" | "CNC MILL HAAS" | "CNC OKUMA MULTUS" | "WIRE EDM" | "HAAS-HURCO" | "OKUMA" | "ROKU-ROKU";
  path: string;
  customerCount: number;
  programExtensions: string[];
}

/** Resource file entry */
export interface ResourceFile {
  name: string;
  path: string;
  type: "tips" | "catalog" | "knowledge" | "formula" | "schema" | "config";
  description: string;
  recordCount?: number;
  domains: string[];
}

/** Tribal knowledge search result */
export interface TribalKnowledgeResult {
  tipId: string;
  title: string;
  category: string;
  confidence: number;
  source: string;
  tags: string[];
}

/** Playbook rule search result */
export interface PlaybookRuleResult {
  ruleId: string;
  title: string;
  category: string;
  severity: string;
  reasoning: string;
}

/** Web search result */
export interface WebSearchResult {
  source: ExternalSource;
  query: string;
  suggestedTopics: string[];
  trustLevel: number;
}

/** AI Feature entry */
export interface AIFeature {
  name: string;
  category: "reasoning" | "learning" | "intelligence" | "orchestration" | "agent" | "advisor" | "prediction";
  description: string;
  capabilities: string[];
  useCases: string[];
  relatedFeatures: string[];
}

/** Proactive reasoning result */
export interface ProactiveReasoningResult {
  originalQuery: string;
  inferredIntent: string;
  relatedCapabilities: CapabilityMatch[];
  suggestedResources: ResourceFile[];
  relevantKnowledge: TribalKnowledgeResult[];
  relevantRules: PlaybookRuleResult[];
  missingContext: string[];
  proactiveQuestions: string[];
  recommendedActions: string[];
  confidence: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Manifest TTL in milliseconds (1 hour) */
const MANIFEST_TTL_MS = 60 * 60 * 1000;

/** Cache TTL for searches (5 minutes) */
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

/** Minimum confidence threshold for matches */
const MIN_CONFIDENCE = 0.3;

/** Top N capabilities per category */
const TOP_N_PER_CATEGORY = 8;

// ============================================================================
// H: DRIVE PATH CONSTANTS
// ============================================================================

/** H: Drive root */
const H_DRIVE_ROOT = "H:/";

/** PRISM project root */
const PRISM_ROOT = "H:/prism";

/** JM DIE folder root */
const JM_DIE_ROOT = "H:/PRISM/JM DIE";

/** MCP server root */
const MCP_SERVER_ROOT = "H:/prism/mcp-server";

/** Resources/data folder */
const DATA_ROOT = "H:/prism/mcp-server/src/data";

/** State folder */
const STATE_ROOT = "H:/prism/state";

// ============================================================================
// ENGINE
// ============================================================================

export class PRISMSelfAwarenessEngine {
  private manifest: CapabilityManifest | null = null;
  private searchCache: Map<string, { result: SelfAwarenessQuery; expires: number }> = new Map();
  private usageAnalytics: Map<string, UsageEntry> = new Map();
  private knownGaps: Set<string> = new Set();

  // Capability index (simplified - in production would integrate with CapabilityIndexEngine)
  private readonly capabilityIndex: Map<string, CapabilityEntry> = new Map();

  // Engine index (simplified - in production would integrate with EngineDigestEngine)
  private readonly engineIndex: Map<string, EngineEntry> = new Map();

  // H: Drive awareness indexes
  private readonly driveLocations: Map<string, DriveLocation> = new Map();
  private readonly jmDieCustomers: Map<string, JMDieCustomer> = new Map();
  private readonly jmDieMachineFolders: Map<string, JMDieMachineFolder> = new Map();
  private readonly resourceFiles: Map<string, ResourceFile> = new Map();

  // AI features index (150+ AI engines)
  private readonly aiFeatures: Map<string, AIFeature> = new Map();

  // External trusted sources
  private readonly trustedSources: ExternalSource[] = [
    {
      id: "sandvik",
      name: "Sandvik Coromant",
      type: "manufacturer",
      url: "https://www.sandvik.coromant.com",
      trustLevel: 0.95,
      domains: ["cutting_tools", "speed_feed", "materials"]
    },
    {
      id: "kennametal",
      name: "Kennametal",
      type: "manufacturer",
      url: "https://www.kennametal.com",
      trustLevel: 0.95,
      domains: ["cutting_tools", "materials", "tooling"]
    },
    {
      id: "machinery_handbook",
      name: "Machinery's Handbook",
      type: "handbook",
      trustLevel: 0.99,
      domains: ["machining", "materials", "formulas", "standards"]
    },
    {
      id: "iso_standards",
      name: "ISO Standards",
      type: "standard",
      trustLevel: 1.0,
      domains: ["materials", "tolerances", "quality", "safety"]
    },
    {
      id: "nist",
      name: "NIST Material Database",
      type: "research",
      url: "https://www.nist.gov",
      trustLevel: 0.98,
      domains: ["materials", "properties", "constants"]
    }
  ];

  constructor() {
    this.initializeCapabilityIndex();
    this.initializeEngineIndex();
    this.initializeDriveAwareness();
    this.initializeJMDieIndex();
    this.initializeResourceIndex();
    this.initializeAIFeatures();
  }

  // ============================================================================
  // MANIFEST MANAGEMENT
  // ============================================================================

  /**
   * Get or generate the capability manifest
   * This is the "compressed self-model" injected into conversations
   */
  getManifest(forceRefresh = false): CapabilityManifest {
    if (!forceRefresh && this.manifest && !this.isManifestStale()) {
      return this.manifest;
    }

    this.manifest = this.generateManifest();
    return this.manifest;
  }

  /**
   * Check if manifest is stale
   */
  private isManifestStale(): boolean {
    if (!this.manifest) return true;
    return new Date(this.manifest.expiresAt).getTime() < Date.now();
  }

  /**
   * Generate fresh manifest
   */
  private generateManifest(): CapabilityManifest {
    const now = new Date();
    const expires = new Date(now.getTime() + MANIFEST_TTL_MS);

    // Gather top capabilities by category
    const topCapabilities = {
      calculation: this.getTopCapabilities("prism_calc", TOP_N_PER_CATEGORY),
      business: this.getTopCapabilities("prism_business", TOP_N_PER_CATEGORY),
      cam: this.getTopCapabilities("prism_cam", TOP_N_PER_CATEGORY),
      data: this.getTopCapabilities("prism_data", TOP_N_PER_CATEGORY),
      validation: this.getTopCapabilities("prism_validate", TOP_N_PER_CATEGORY),
      quality: this.getTopCapabilities("prism_quality", TOP_N_PER_CATEGORY)
    };

    // Gather recent learnings from usage analytics
    const recentLearnings = this.getRecentLearnings();

    // Known gaps
    const knownGaps = [...this.knownGaps].slice(0, 10);

    const manifest: CapabilityManifest = {
      version: "1.0.0",
      generatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      counts: {
        dispatchers: 82,
        actions: 4296,
        engines: 1559,
        formulas: 499,
        algorithms: 60,
        hooks: 112,
        skills: 61,
        // H: Drive awareness counts
        jmDiePrograms: 24545,
        jmDieCustomers: 100,
        tribalTips: 3700,
        playbookRules: 296,
        resourceFiles: 40,
        // AI feature counts
        aiFeatures: 150,
        reasoningEngines: 78,
        multiAgentCapabilities: 15
      },
      topCapabilities,
      domains: [
        "turning", "milling", "drilling", "grinding", "EDM", "threading",
        "5-axis", "swiss", "lathe", "mill-turn", "wire_edm", "sinker_edm",
        "quoting", "scheduling", "quality", "safety", "materials"
      ],
      recentLearnings,
      knownGaps,
      checksum: this.generateChecksum()
    };

    return manifest;
  }

  /**
   * Get compact manifest for context injection (~500 tokens)
   */
  getCompactManifest(): string {
    const m = this.getManifest();

    return `PRISM Self-Model (${m.generatedAt.split("T")[0]}):
Capabilities: ${m.counts.dispatchers} dispatchers, ${m.counts.actions} actions, ${m.counts.engines} engines
Domains: ${m.domains.join(", ")}
Core Actions:
  calc: ${m.topCapabilities.calculation.join(", ")}
  business: ${m.topCapabilities.business.join(", ")}
  cam: ${m.topCapabilities.cam.join(", ")}
${m.recentLearnings.length > 0 ? `Learnings: ${m.recentLearnings.join("; ")}` : ""}
${m.knownGaps.length > 0 ? `Gaps: ${m.knownGaps.join(", ")}` : ""}`;
  }

  // ============================================================================
  // CAPABILITY DISCOVERY
  // ============================================================================

  /**
   * "What can I do?" - Search capabilities by query
   */
  whatCanIDo(query: string): SelfAwarenessQuery {
    const startTime = Date.now();
    const cacheKey = `capability:${query.toLowerCase()}`;

    // Check cache
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return { ...cached.result, fromCache: true };
    }

    const results = this.searchCapabilities(query);

    const result: SelfAwarenessQuery = {
      query,
      queryType: "capability",
      results,
      confidence: results.length > 0 ? results[0].confidence : 0,
      fromCache: false,
      processingMs: Date.now() - startTime
    };

    // Cache result
    this.searchCache.set(cacheKey, {
      result,
      expires: Date.now() + SEARCH_CACHE_TTL_MS
    });

    return result;
  }

  /**
   * "How do I...?" - Route intent to best action
   */
  howDoI(task: string): CapabilityMatch | null {
    const results = this.searchCapabilities(task);

    if (results.length === 0) {
      // Record as potential gap
      this.recordGap(task);
      return null;
    }

    const best = results[0];

    // Track usage
    this.trackUsage(best.fullAction, best.confidence);

    return best;
  }

  /**
   * "Who handles...?" - Find engines for a domain
   */
  whoHandles(domain: string): EngineMatch[] {
    const matches: EngineMatch[] = [];
    const domainWords = domain.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);

    if (domainWords.length === 0) return [];

    for (const [name, entry] of this.engineIndex) {
      const targetText = [
        entry.description,
        entry.category,
        ...entry.keywords
      ].join(" ").toLowerCase();

      const relevance = this.calculateRelevance(domainWords, targetText);

      if (relevance > MIN_CONFIDENCE) {
        matches.push({
          name,
          path: entry.path,
          description: entry.description,
          category: entry.category,
          confidence: relevance,
          relatedEngines: entry.relatedEngines
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  /**
   * Search capabilities with ranking
   */
  private searchCapabilities(query: string): CapabilityMatch[] {
    // Handle empty query
    if (!query || query.trim().length === 0) {
      return [];
    }

    const matches: CapabilityMatch[] = [];
    const lowerQuery = query.toLowerCase().trim();
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);

    for (const [fullAction, entry] of this.capabilityIndex) {
      const targetText = [
        entry.description,
        entry.action,
        ...entry.keywords
      ].join(" ").toLowerCase();

      const relevance = this.calculateRelevance(queryWords, targetText);

      if (relevance > MIN_CONFIDENCE) {
        matches.push({
          dispatcher: entry.dispatcher,
          action: entry.action,
          fullAction,
          description: entry.description,
          confidence: relevance,
          source: "index",
          alternatives: []
        });
      }
    }

    // Search hooks, including Codex bridge hooks. These are capability surfaces,
    // not just lifecycle plumbing.
    for (const hook of manifest.hooks) {
      const nameLower = hook.name.toLowerCase();
      const eventLower = hook.event.toLowerCase();
      const pathLower = hook.path.toLowerCase();

      let score = 0;
      for (const term of queryTerms) {
        if (nameLower.includes(term)) score += 3;
        if (eventLower.includes(term)) score += 1;
        if (pathLower.includes(term)) score += 2;
      }

      if (score > 0) {
        matches.push({
          capability: hook.name,
          confidence: Math.min(score / queryTerms.length / 3, 1) * 0.75,
          path: hook.path,
        });
      }
    }

    // Search skills and command surfaces so Codex can discover its own operating
    // instructions and profile-side PRISM skills.
    for (const skill of manifest.skills) {
      const nameLower = skill.name.toLowerCase();
      const descLower = (skill.description || "").toLowerCase();
      const triggerLower = (skill.triggers || []).join(" ").toLowerCase();
      const pathLower = skill.path.toLowerCase();

      let score = 0;
      for (const term of queryTerms) {
        if (nameLower.includes(term)) score += 3;
        if (descLower.includes(term)) score += 2;
        if (triggerLower.includes(term)) score += 2;
        if (pathLower.includes(term)) score += 1;
      }

      if (score > 0) {
        matches.push({
          capability: skill.name,
          confidence: Math.min(score / queryTerms.length / 3, 1) * 0.8,
          path: skill.path,
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    // Add alternatives to top match
    if (matches.length > 1) {
      matches[0].alternatives = matches.slice(1, 4).map(m => ({
        fullAction: m.fullAction,
        description: m.description,
        confidence: m.confidence
      }));
    }

    return matches.slice(0, 10);
  }

  // ============================================================================
  // GAP DETECTION & ANALYSIS
  // ============================================================================

  /**
   * Analyze if we can handle a request
   */
  analyzeGap(query: string): GapAnalysis {
    const capabilities = this.searchCapabilities(query);

    if (capabilities.length > 0 && capabilities[0].confidence > 0.7) {
      return {
        query,
        canHandle: true,
        confidence: capabilities[0].confidence,
        reason: `Matched to ${capabilities[0].fullAction}`,
        suggestions: capabilities.slice(1, 4).map(c => c.fullAction)
      };
    }

    // Check if external sources might help
    const relevantSources = this.findRelevantSources(query);

    if (capabilities.length > 0) {
      return {
        query,
        canHandle: true,
        confidence: capabilities[0].confidence,
        reason: `Partial match to ${capabilities[0].fullAction} (low confidence)`,
        suggestions: [
          "Clarify the request",
          ...capabilities.slice(0, 3).map(c => `Try: ${c.fullAction}`)
        ],
        externalSources: relevantSources
      };
    }

    // True gap
    this.recordGap(query);

    return {
      query,
      canHandle: false,
      confidence: 0,
      reason: "No matching capability found",
      suggestions: [
        "This may require a new engine or capability",
        "Check if the request can be broken into smaller steps",
        ...relevantSources.map(s => `External: ${s.name} may help`)
      ],
      externalSources: relevantSources
    };
  }

  /**
   * Get known gaps
   */
  getKnownGaps(): string[] {
    return [...this.knownGaps];
  }

  /**
   * Record a gap for future analysis
   */
  private recordGap(query: string): void {
    // Normalize and store
    const normalized = query.toLowerCase().trim().slice(0, 100);
    this.knownGaps.add(normalized);

    // Limit size
    if (this.knownGaps.size > 100) {
      const oldest = this.knownGaps.values().next().value;
      if (oldest !== undefined) {
        this.knownGaps.delete(oldest);
      }
    }
  }

  // ============================================================================
  // EXTERNAL KNOWLEDGE
  // ============================================================================

  /**
   * Find relevant external sources for a query
   */
  findRelevantSources(query: string): ExternalSource[] {
    const lowerQuery = query.toLowerCase();
    const matches: Array<{ source: ExternalSource; score: number }> = [];

    for (const source of this.trustedSources) {
      let score = 0;

      for (const domain of source.domains) {
        if (lowerQuery.includes(domain) || domain.includes(lowerQuery.split(" ")[0])) {
          score += 0.3;
        }
      }

      // Boost by trust level
      score *= source.trustLevel;

      if (score > 0.1) {
        matches.push({ source, score });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(m => m.source);
  }

  /**
   * Get trusted sources for a domain
   */
  getTrustedSources(domain: string): ExternalSource[] {
    return this.trustedSources.filter(s =>
      s.domains.some(d => d.includes(domain) || domain.includes(d))
    );
  }

  /**
   * Verify if a source is trusted
   */
  isSourceTrusted(sourceId: string): boolean {
    return this.trustedSources.some(s => s.id === sourceId);
  }

  // ============================================================================
  // USAGE ANALYTICS
  // ============================================================================

  /**
   * Track capability usage
   */
  trackUsage(action: string, confidence: number, success = true): void {
    const existing = this.usageAnalytics.get(action);

    if (existing) {
      existing.count++;
      existing.lastUsed = new Date().toISOString();
      existing.avgConfidence = (existing.avgConfidence * (existing.count - 1) + confidence) / existing.count;
      existing.successRate = (existing.successRate * (existing.count - 1) + (success ? 1 : 0)) / existing.count;
    } else {
      this.usageAnalytics.set(action, {
        action,
        count: 1,
        lastUsed: new Date().toISOString(),
        avgConfidence: confidence,
        successRate: success ? 1 : 0
      });
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    totalQueries: number;
    topActions: Array<{ action: string; count: number }>;
    avgConfidence: number;
    avgSuccessRate: number;
  } {
    const entries = [...this.usageAnalytics.values()];
    const totalQueries = entries.reduce((sum, e) => sum + e.count, 0);

    return {
      totalQueries,
      topActions: entries
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(e => ({ action: e.action, count: e.count })),
      avgConfidence: entries.length > 0
        ? entries.reduce((sum, e) => sum + e.avgConfidence, 0) / entries.length
        : 0,
      avgSuccessRate: entries.length > 0
        ? entries.reduce((sum, e) => sum + e.successRate, 0) / entries.length
        : 1
    };
  }

  /**
   * Get recent learnings from usage patterns
   */
  private getRecentLearnings(): string[] {
    const learnings: string[] = [];
    const entries = [...this.usageAnalytics.values()];

    // Most used actions
    const topUsed = entries.sort((a, b) => b.count - a.count).slice(0, 3);
    if (topUsed.length > 0) {
      learnings.push(`Most used: ${topUsed.map(e => e.action.split(":")[1]).join(", ")}`);
    }

    // Low success rate actions (potential issues)
    const lowSuccess = entries.filter(e => e.successRate < 0.7 && e.count > 2);
    if (lowSuccess.length > 0) {
      learnings.push(`Needs attention: ${lowSuccess.map(e => e.action.split(":")[1]).join(", ")}`);
    }

    return learnings;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize capability index with core actions
   */
  private initializeCapabilityIndex(): void {
    // prism_calc actions
    this.addCapability("prism_calc", "speed_feed", "Calculate cutting speed and feed rate", ["sfm", "rpm", "ipr", "ipm", "cutting"]);
    this.addCapability("prism_calc", "cutting_force", "Calculate cutting forces using Kienzle model", ["force", "kienzle", "fc", "power"]);
    this.addCapability("prism_calc", "tool_life", "Estimate tool life using Taylor equation", ["taylor", "life", "wear", "minutes"]);
    this.addCapability("prism_calc", "deflection", "Calculate tool deflection", ["bend", "stiffness", "runout"]);
    this.addCapability("prism_calc", "power_requirement", "Calculate spindle power requirement", ["kw", "hp", "spindle", "motor"]);
    this.addCapability("prism_calc", "surface_finish", "Predict achievable surface finish", ["ra", "roughness", "finish"]);
    this.addCapability("prism_calc", "chip_load", "Calculate chip load and thickness", ["chip", "fz", "engagement"]);
    this.addCapability("prism_calc", "mrr", "Calculate material removal rate", ["removal", "rate", "volume"]);

    // prism_business actions
    this.addCapability("prism_business", "quote_estimate", "Generate cost estimate for job", ["quote", "cost", "price", "estimate", "bid"]);
    this.addCapability("prism_business", "lead_time", "Estimate job lead time", ["delivery", "schedule", "days", "weeks"]);
    this.addCapability("prism_business", "cost_analysis", "Analyze job costs breakdown", ["breakdown", "labor", "material", "overhead"]);
    this.addCapability("prism_business", "capacity_check", "Check shop capacity", ["availability", "schedule", "load"]);
    this.addCapability("prism_business", "job_status", "Get job status and progress", ["status", "progress", "tracking"]);
    this.addCapability("prism_business", "invoice_generate", "Generate invoice for job", ["invoice", "billing", "payment"]);

    // prism_cam actions
    this.addCapability("prism_cam", "machine_selection", "Select optimal machine for job", ["machine", "lathe", "mill", "select", "best"]);
    this.addCapability("prism_cam", "tool_selection", "Select optimal cutting tool", ["tool", "insert", "endmill", "select", "recommend"]);
    this.addCapability("prism_cam", "toolpath_strategy", "Recommend toolpath strategy", ["toolpath", "strategy", "roughing", "finishing"]);
    this.addCapability("prism_cam", "post_process", "Post-process NC program", ["post", "gcode", "nc", "output"]);
    this.addCapability("prism_cam", "fixture_recommend", "Recommend workholding fixture", ["fixture", "clamp", "vise", "chuck"]);
    this.addCapability("prism_cam", "operation_sequence", "Sequence machining operations", ["sequence", "order", "operations"]);

    // prism_data actions
    this.addCapability("prism_data", "material_lookup", "Look up material properties", ["material", "properties", "steel", "aluminum"]);
    this.addCapability("prism_data", "machine_specs", "Get machine specifications", ["specs", "capacity", "travels", "spindle"]);
    this.addCapability("prism_data", "tool_catalog", "Search tool catalog", ["catalog", "tool", "insert", "holder"]);
    this.addCapability("prism_data", "customer_info", "Get customer information", ["customer", "contact", "history"]);
    this.addCapability("prism_data", "job_history", "Get job history", ["history", "previous", "similar"]);

    // prism_validate actions
    this.addCapability("prism_validate", "program_check", "Validate NC program", ["validate", "check", "errors", "syntax"]);
    this.addCapability("prism_validate", "simulation", "Simulate toolpath", ["simulate", "preview", "verify"]);
    this.addCapability("prism_validate", "collision_detect", "Check for collisions", ["collision", "crash", "interference"]);
    this.addCapability("prism_validate", "tolerance_verify", "Verify tolerance capability", ["tolerance", "capability", "precision"]);

    // prism_quality actions
    this.addCapability("prism_quality", "surface_finish", "Analyze surface finish requirements", ["surface", "finish", "ra", "roughness"]);
    this.addCapability("prism_quality", "tolerance_analysis", "Analyze tolerance stack-up", ["tolerance", "stack", "analysis"]);
    this.addCapability("prism_quality", "capability_study", "Perform process capability study", ["cpk", "capability", "spc"]);
    this.addCapability("prism_quality", "inspection_plan", "Generate inspection plan", ["inspection", "cmm", "measure"]);

    // prism_safety actions
    this.addCapability("prism_safety", "safety_check", "Perform safety analysis", ["safety", "safe", "risk"]);
    this.addCapability("prism_safety", "risk_assessment", "Assess operational risks", ["risk", "hazard", "danger"]);
    this.addCapability("prism_safety", "limit_verify", "Verify machine limits", ["limit", "max", "spindle", "travel"]);

    // prism_ai actions
    this.addCapability("prism_ai", "analyze", "AI analysis of manufacturing problem", ["analyze", "ai", "intelligent"]);
    this.addCapability("prism_ai", "recommend", "AI recommendation", ["recommend", "suggest", "best"]);
    this.addCapability("prism_ai", "explain", "Explain reasoning", ["explain", "why", "reason"]);
    this.addCapability("prism_ai", "optimize", "Optimize parameters", ["optimize", "improve", "better"]);
  }

  /**
   * Initialize engine index with core engines
   */
  private initializeEngineIndex(): void {
    this.addEngine("KienzleForceModelEngine", "src/engines/KienzleForceModelEngine.ts",
      "Calculate cutting forces using Kienzle model", "physics",
      ["force", "kienzle", "fc", "cutting"], ["CuttingForceEngine", "PowerCalculationEngine"]);

    this.addEngine("TaylorToolLifeEngine", "src/engines/TaylorToolLifeEngine.ts",
      "Predict tool life using Taylor equation", "physics",
      ["taylor", "tool_life", "wear"], ["ToolWearEngine", "CostPerPartEngine"]);

    this.addEngine("SpeedFeedOrchestratorEngine", "src/engines/SpeedFeedOrchestratorEngine.ts",
      "Central hub for speed and feed calculations", "calculation",
      ["speed", "feed", "sfm", "rpm"], ["AutoSpeedFeedEngine", "UltimateSpeedFeedEngine"]);

    this.addEngine("QuoteEstimatorEngine", "src/engines/QuoteEstimatorEngine.ts",
      "Generate job cost estimates", "business",
      ["quote", "estimate", "cost", "price"], ["ActualCostEngine", "CapacityPlanningEngine"]);

    this.addEngine("ManufacturingReasoningEngine", "src/engines/ManufacturingReasoningEngine.ts",
      "Chain-of-thought reasoning for manufacturing", "ai",
      ["reasoning", "cot", "manufacturing"], ["MultiPathReasoningEngine", "ExtendedThinkingBridgeEngine"]);

    this.addEngine("AgenticLoopEngine", "src/engines/AgenticLoopEngine.ts",
      "Observe-Think-Act orchestration loop", "ai",
      ["agent", "loop", "orchestrate"], ["IntentRouterEngine", "ToolExecutionEngine"]);

    this.addEngine("ToolExecutionEngine", "src/engines/ToolExecutionEngine.ts",
      "Execute MCP tool calls", "ai",
      ["tool", "execution", "mcp", "dispatch"], ["MultiToolOrchestratorEngine"]);

    this.addEngine("ContextCompactionEngine", "src/engines/ContextCompactionEngine.ts",
      "Efficient context management and compaction", "ai",
      ["context", "compact", "memory", "token"], ["AgentMemoryFabricEngine"]);
  }

  /**
   * Add capability to index
   */
  private addCapability(dispatcher: string, action: string, description: string, keywords: string[]): void {
    this.capabilityIndex.set(`${dispatcher}:${action}`, {
      dispatcher,
      action,
      description,
      keywords
    });
  }

  /**
   * Add engine to index
   */
  private addEngine(name: string, path: string, description: string, category: string, keywords: string[], relatedEngines: string[]): void {
    this.engineIndex.set(name, {
      path,
      description,
      category,
      keywords,
      relatedEngines
    });
  }

  // ============================================================================
  // H: DRIVE AWARENESS INITIALIZATION
  // ============================================================================

  /**
   * Initialize H: Drive awareness with key locations
   */
  private initializeDriveAwareness(): void {
    // Core PRISM locations
    this.driveLocations.set("prism_root", {
      path: "H:/prism",
      type: "directory",
      category: "prism",
      description: "PRISM project root - MCP server, state, plans",
      keywords: ["prism", "project", "root", "manufacturing", "intelligence"]
    });

    this.driveLocations.set("mcp_server", {
      path: "H:/prism/mcp-server",
      type: "directory",
      category: "prism",
      description: "MCP server - 82 dispatchers, 4,296 actions, 1,559 engines",
      keywords: ["mcp", "server", "engines", "dispatchers", "actions"]
    });

    this.driveLocations.set("jm_die_root", {
      path: "H:/PRISM/JM DIE",
      type: "directory",
      category: "jm_die",
      description: "JM Die Company programs - 24,545 CNC files, 100+ customers",
      fileCount: 24545,
      keywords: ["jm_die", "programs", "cnc", "lathe", "mill", "wedm", "customers"]
    });

    this.driveLocations.set("state_folder", {
      path: "H:/prism/state",
      type: "directory",
      category: "state",
      description: "System state - position tracking, session memory, SVI",
      keywords: ["state", "position", "memory", "session", "svi"]
    });

    this.driveLocations.set("shared_state", {
      path: "H:/prism/state/shared",
      type: "directory",
      category: "state",
      description: "Cross-session shared directives and coordination",
      keywords: ["shared", "directives", "coordination", "agents"]
    });

    this.driveLocations.set("data_folder", {
      path: "H:/prism/mcp-server/src/data",
      type: "directory",
      category: "data",
      description: "CAM tips, tool catalogs, materials, formulas - 40+ files",
      keywords: ["data", "tips", "catalogs", "materials", "tools", "formulas"]
    });

    this.driveLocations.set("engines_folder", {
      path: "H:/prism/mcp-server/src/engines",
      type: "directory",
      category: "prism",
      description: "1,559 calculation engines - physics, CAM, business, AI",
      fileCount: 1559,
      keywords: ["engines", "calculations", "physics", "cam", "business", "ai"]
    });

    this.driveLocations.set("dispatchers_folder", {
      path: "H:/prism/mcp-server/src/tools/dispatchers",
      type: "directory",
      category: "prism",
      description: "82 MCP dispatchers routing to engines",
      fileCount: 82,
      keywords: ["dispatchers", "mcp", "routing", "tools", "actions"]
    });

    // Archive locations
    this.driveLocations.set("prism_archive", {
      path: "H:/PRISM_ARCHIVE_2026-02-01",
      type: "directory",
      category: "archive",
      description: "Archived PRISM state from Feb 2026",
      keywords: ["archive", "backup", "historical"]
    });
  }

  /**
   * Initialize JM DIE customer and machine folder index
   */
  private initializeJMDieIndex(): void {
    // Machine type folders
    this.jmDieMachineFolders.set("cnc_lathe", {
      type: "CNC LATHE",
      path: "H:/PRISM/JM DIE/CNC LATHE",
      customerCount: 100,
      programExtensions: [".MIN", ".mcx-8", ".MCX"]
    });

    this.jmDieMachineFolders.set("cnc_mill_haas", {
      type: "CNC MILL HAAS",
      path: "H:/PRISM/JM DIE/CNC MILL HAAS",
      customerCount: 20,
      programExtensions: [".nc", ".NC", ".mcx-8"]
    });

    this.jmDieMachineFolders.set("cnc_okuma_multus", {
      type: "CNC OKUMA MULTUS",
      path: "H:/PRISM/JM DIE/CNC OKUMA MULTUS",
      customerCount: 15,
      programExtensions: [".MIN", ".mcx-8"]
    });

    this.jmDieMachineFolders.set("wire_edm", {
      type: "WIRE EDM",
      path: "H:/PRISM/JM DIE/WIRE EDM",
      customerCount: 30,
      programExtensions: [".nc", ".NC"]
    });

    this.jmDieMachineFolders.set("haas_hurco", {
      type: "HAAS-HURCO",
      path: "H:/PRISM/JM DIE/HAAS-HURCO",
      customerCount: 25,
      programExtensions: [".nc", ".hnc"]
    });

    this.jmDieMachineFolders.set("okuma", {
      type: "OKUMA",
      path: "H:/PRISM/JM DIE/OKUMA",
      customerCount: 40,
      programExtensions: [".MIN"]
    });

    this.jmDieMachineFolders.set("roku_roku", {
      type: "ROKU-ROKU",
      path: "H:/PRISM/JM DIE/ROKU-ROKU",
      customerCount: 10,
      programExtensions: [".nc"]
    });

    // Top JM DIE customers (subset - full list can be loaded dynamically)
    const topCustomers = [
      { name: "ALCOA", machineTypes: ["lathe", "mill"] },
      { name: "ITW", machineTypes: ["lathe", "mill", "wedm"] },
      { name: "OPTIMAS", machineTypes: ["lathe"] },
      { name: "SFS", machineTypes: ["lathe", "mill"] },
      { name: "FASTENAL", machineTypes: ["lathe"] },
      { name: "HOLO-KROME", machineTypes: ["lathe", "mill"] },
      { name: "CAMCAR", machineTypes: ["lathe"] },
      { name: "EJOT", machineTypes: ["lathe", "mill"] },
      { name: "FONTANA", machineTypes: ["lathe"] },
      { name: "ELGIN FASTENER", machineTypes: ["lathe"] }
    ];

    for (const customer of topCustomers) {
      this.jmDieCustomers.set(customer.name.toLowerCase(), {
        name: customer.name,
        path: `H:/PRISM/JM DIE/CNC LATHE/${customer.name}`,
        programCount: 50, // Estimated
        machineTypes: customer.machineTypes
      });
    }
  }

  /**
   * Initialize resource file index (CAM tips, catalogs, etc.)
   */
  private initializeResourceIndex(): void {
    // CAM tips files (18 CAM systems)
    const camTipsFiles = [
      { name: "fusion360-cam-tips.ts", system: "Fusion 360", count: 200 },
      { name: "mastercam-cam-tips.ts", system: "Mastercam", count: 250 },
      { name: "nx-cam-tips.ts", system: "Siemens NX", count: 180 },
      { name: "solidcam-cam-tips.ts", system: "SolidCAM", count: 150 },
      { name: "esprit-cam-tips.ts", system: "ESPRIT", count: 120 },
      { name: "edgecam-cam-tips.ts", system: "Edgecam", count: 140 },
      { name: "camworks-cam-tips.ts", system: "CAMWorks", count: 130 },
      { name: "gibbscam-cam-tips.ts", system: "GibbsCAM", count: 160 },
      { name: "hypermill-cam-tips-ext.ts", system: "hyperMILL", count: 200 },
      { name: "catia-cam-tips.ts", system: "CATIA", count: 100 },
      { name: "powermill-cam-tips.ts", system: "PowerMill", count: 180 },
      { name: "tebis-cam-tips.ts", system: "Tebis", count: 90 },
      { name: "cimatron-cam-tips.ts", system: "Cimatron", count: 80 },
      { name: "bobcad-cam-tips.ts", system: "BobCAD", count: 110 },
      { name: "topsolid-cam-tips.ts", system: "TopSolid", count: 70 },
      { name: "worknc-cam-tips.ts", system: "WorkNC", count: 100 },
      { name: "surfcam-cam-tips.ts", system: "Surfcam", count: 90 },
      { name: "sprutcam-cam-tips.ts", system: "SprutCAM", count: 80 }
    ];

    for (const file of camTipsFiles) {
      this.resourceFiles.set(file.name, {
        name: file.name,
        path: `H:/prism/mcp-server/src/data/${file.name}`,
        type: "tips",
        description: `${file.system} CAM tips and best practices`,
        recordCount: file.count,
        domains: ["cam", file.system.toLowerCase().replace(/\s+/g, "_")]
      });
    }

    // Knowledge files
    this.resourceFiles.set("controller-knowledge-tips.ts", {
      name: "controller-knowledge-tips.ts",
      path: "H:/prism/mcp-server/src/data/controller-knowledge-tips.ts",
      type: "knowledge",
      description: "Controller-specific knowledge (Fanuc, Okuma, Haas, Mazak)",
      recordCount: 400,
      domains: ["controller", "fanuc", "okuma", "haas", "mazak"]
    });

    this.resourceFiles.set("wedm-knowledge-tips.ts", {
      name: "wedm-knowledge-tips.ts",
      path: "H:/prism/mcp-server/src/data/wedm-knowledge-tips.ts",
      type: "knowledge",
      description: "Wire EDM knowledge - Mitsubishi, Makino, Sodick",
      recordCount: 200,
      domains: ["wedm", "wire_edm", "edm", "mitsubishi"]
    });

    // Tool catalogs
    const toolCatalogs = [
      { name: "guhring-tool-catalog.ts", vendor: "Guhring", count: 5000 },
      { name: "helical-tool-catalog.ts", vendor: "Helical", count: 3000 },
      { name: "emuge-tool-catalog.ts", vendor: "Emuge", count: 2500 },
      { name: "horn-tool-catalog.ts", vendor: "Horn", count: 2000 },
      { name: "dormer-pramet-tool-catalog.ts", vendor: "Dormer Pramet", count: 4000 },
      { name: "global-cnc-tool-catalog.ts", vendor: "Global CNC", count: 8000 }
    ];

    for (const catalog of toolCatalogs) {
      this.resourceFiles.set(catalog.name, {
        name: catalog.name,
        path: `H:/prism/mcp-server/src/data/${catalog.name}`,
        type: "catalog",
        description: `${catalog.vendor} tool catalog`,
        recordCount: catalog.count,
        domains: ["tooling", "cutting_tools", catalog.vendor.toLowerCase().replace(/\s+/g, "_")]
      });
    }

    // Holder catalogs
    const holderCatalogs = [
      { name: "haimer-holder-catalog.ts", vendor: "Haimer", count: 1500 },
      { name: "guhring-holder-catalog.ts", vendor: "Guhring", count: 1200 },
      { name: "big-daishowa-holders.ts", vendor: "BIG Daishowa", count: 2000 }
    ];

    for (const catalog of holderCatalogs) {
      this.resourceFiles.set(catalog.name, {
        name: catalog.name,
        path: `H:/prism/mcp-server/src/data/${catalog.name}`,
        type: "catalog",
        description: `${catalog.vendor} tool holder catalog`,
        recordCount: catalog.count,
        domains: ["tooling", "holders", "workholding"]
      });
    }
  }

  /**
   * Initialize comprehensive AI features index (150+ engines)
   */
  private initializeAIFeatures(): void {
    // ============================================================================
    // REASONING ENGINES (Chain-of-thought, multi-path, scientific)
    // ============================================================================
    this.addAIFeature("ManufacturingReasoningEngine", "reasoning",
      "Chain-of-thought reasoning for manufacturing decisions",
      ["multi-step reasoning", "decision trees", "trade-off analysis"],
      ["complex machining decisions", "material selection", "process optimization"],
      ["MultiPathReasoningEngine", "ScientificReasoningEngine"]);

    this.addAIFeature("MultiPathReasoningEngine", "reasoning",
      "Explore multiple reasoning paths and select best",
      ["parallel reasoning", "path scoring", "confidence aggregation"],
      ["alternative strategies", "what-if analysis", "risk assessment"],
      ["ManufacturingReasoningEngine", "DecisionReasoningEngine"]);

    this.addAIFeature("ScientificReasoningEngine", "reasoning",
      "Physics-based reasoning with formula validation",
      ["formula verification", "dimensional analysis", "constraint checking"],
      ["cutting parameter validation", "force calculations", "thermal analysis"],
      ["ManufacturingReasoningEngine", "DiagnosticReasoningEngine"]);

    this.addAIFeature("DiagnosticReasoningEngine", "reasoning",
      "Root cause analysis and troubleshooting",
      ["fault diagnosis", "symptom analysis", "solution ranking"],
      ["machine alarms", "quality issues", "tool failure analysis"],
      ["LatheTroubleshootingIntelligenceEngine", "AlarmIntelligenceEngine"]);

    this.addAIFeature("DecisionReasoningEngine", "reasoning",
      "Multi-criteria decision making with weighted factors",
      ["MCDM", "weighted scoring", "Pareto optimization"],
      ["machine selection", "tool selection", "strategy comparison"],
      ["MultiPathReasoningEngine", "ProactiveIntelligenceEngine"]);

    // ============================================================================
    // LEARNING ENGINES (ML, deep learning, transfer learning)
    // ============================================================================
    this.addAIFeature("MachineLearningFeedbackEngine", "learning",
      "Continuous learning from machining outcomes",
      ["feedback loops", "model updates", "drift detection"],
      ["speed/feed optimization", "tool life prediction", "quality prediction"],
      ["TransferLearningEngine", "FederatedLearningEngine"]);

    this.addAIFeature("TransferLearningEngine", "learning",
      "Transfer knowledge between similar operations",
      ["domain adaptation", "feature transfer", "model fine-tuning"],
      ["new material processing", "similar part optimization", "cross-machine learning"],
      ["MachineLearningFeedbackEngine", "SelfLearningCAMEngine"]);

    this.addAIFeature("FederatedLearningEngine", "learning",
      "Distributed learning across multiple shops",
      ["privacy-preserving", "model aggregation", "local adaptation"],
      ["industry benchmarks", "best practices", "fleet optimization"],
      ["FleetLearningStrategyEngine", "FleetDeploymentLearningEngine"]);

    this.addAIFeature("SpeedFeedDeepLearningEngine", "learning",
      "Deep neural networks for cutting parameter optimization",
      ["neural optimization", "pattern recognition", "adaptive learning"],
      ["optimal speed/feed", "surface finish prediction", "tool life"],
      ["SpeedFeedUltimateAIEngine", "SpeedFeedAdvancedAIEngine"]);

    this.addAIFeature("LatheDeepLearningEngine", "learning",
      "Deep learning for lathe operations",
      ["turning optimization", "chatter prediction", "finish prediction"],
      ["OD/ID turning", "threading", "grooving optimization"],
      ["LatheUnifiedAIEngine", "LatheIntelligenceEngine"]);

    this.addAIFeature("PostProcessorDeepLearningEngine", "learning",
      "ML-based post-processor optimization",
      ["code optimization", "controller adaptation", "syntax learning"],
      ["G-code optimization", "macro generation", "cycle time reduction"],
      ["GCodeIntelligencePipelineEngine", "ControllerProgrammingIntelligenceEngine"]);

    this.addAIFeature("QLearningEngine", "learning",
      "Reinforcement learning for process optimization",
      ["reward optimization", "policy learning", "exploration"],
      ["adaptive machining", "real-time optimization", "process control"],
      ["MachineLearningFeedbackEngine", "ProactiveLearningEngine"]);

    // ============================================================================
    // INTELLIGENCE ENGINES (Domain-specific AI)
    // ============================================================================
    this.addAIFeature("PRISMIntelligenceLayer", "intelligence",
      "Unified intelligence orchestration layer",
      ["capability routing", "confidence scoring", "fallback handling"],
      ["automatic agent selection", "query understanding", "response synthesis"],
      ["IntelligenceEngine", "ProactiveIntelligenceEngine"]);

    this.addAIFeature("ProactiveIntelligenceEngine", "intelligence",
      "Anticipate needs before they're asked",
      ["predictive suggestions", "context awareness", "user modeling"],
      ["setup assistance", "potential issues", "optimization opportunities"],
      ["PRISMIntelligenceLayer", "AgentSelfAwarenessEngine"]);

    this.addAIFeature("LatheIntelligenceEngine", "intelligence",
      "Comprehensive lathe operation intelligence",
      ["turning strategies", "tool selection", "parameter optimization"],
      ["complex turning", "multi-axis lathe", "live tooling"],
      ["LatheCAMIntelligenceEngine", "LathePredictiveIntelligenceEngine"]);

    this.addAIFeature("MillingAIUltraIntelligenceEngine", "intelligence",
      "Advanced milling AI with deep optimization",
      ["toolpath optimization", "engagement control", "adaptive feeds"],
      ["high-speed milling", "hard milling", "thin wall machining"],
      ["MillingAIIntegrationEngine", "MillingHeadIntelligenceEngine"]);

    this.addAIFeature("FiveAxisAIUltraIntelligenceEngine", "intelligence",
      "5-axis machining intelligence",
      ["collision avoidance", "tool axis optimization", "surface following"],
      ["impeller machining", "mold/die", "aerospace parts"],
      ["FiveAxisDeepLearningEngine", "FiveAxisOrchestrationEngine"]);

    this.addAIFeature("ElectrodeUltimateAIEngine", "intelligence",
      "EDM electrode design and machining AI",
      ["electrode design", "burn strategy", "surface finish"],
      ["sinker EDM", "electrode machining", "die cavity"],
      ["ElectrodeDeepLearningEngine", "ElectrodeAIReasoningEngine"]);

    this.addAIFeature("AlarmIntelligenceEngine", "intelligence",
      "Machine alarm diagnosis and resolution",
      ["alarm interpretation", "root cause", "resolution steps"],
      ["machine faults", "servo errors", "safety trips"],
      ["DiagnosticReasoningEngine", "LatheTroubleshootingIntelligenceEngine"]);

    this.addAIFeature("BusinessIntelligenceEngine", "intelligence",
      "Shop floor business analytics",
      ["KPI tracking", "cost analysis", "capacity planning"],
      ["job costing", "machine utilization", "profitability analysis"],
      ["RoadmapIntelligenceEngine", "ProactiveIntelligenceEngine"]);

    this.addAIFeature("WorkholdingIntelligenceEngine", "intelligence",
      "Fixture and workholding recommendations",
      ["clamping strategy", "deformation analysis", "accessibility"],
      ["fixture design", "pallet systems", "soft jaws"],
      ["FeasibilityOrchestratorEngine", "LatheExpertAdvisorEngine"]);

    // ============================================================================
    // ORCHESTRATION ENGINES (Workflow, pipeline, multi-step)
    // ============================================================================
    this.addAIFeature("AgenticLoopEngine", "orchestration",
      "Observe-Think-Act agentic loop orchestrator",
      ["observation", "reasoning", "action execution", "feedback"],
      ["complex tasks", "multi-step operations", "autonomous execution"],
      ["IntentRouterEngine", "ToolExecutionEngine", "MultiToolOrchestratorEngine"]);

    this.addAIFeature("MultiToolOrchestratorEngine", "orchestration",
      "Parallel/sequential tool execution with DAG resolution",
      ["dependency resolution", "parallel execution", "result aggregation"],
      ["complex queries", "multi-capability tasks", "pipeline execution"],
      ["AgenticLoopEngine", "ToolExecutionEngine"]);

    this.addAIFeature("FeasibilityOrchestratorEngine", "orchestration",
      "End-to-end manufacturability assessment",
      ["geometry analysis", "process planning", "risk assessment"],
      ["quote validation", "design review", "process selection"],
      ["AutoProgramOrchestratorEngine", "QuoteToShipOrchestratorEngine"]);

    this.addAIFeature("AutoProgramOrchestratorEngine", "orchestration",
      "Automatic CNC program generation",
      ["feature recognition", "strategy selection", "code generation"],
      ["print-to-program", "CAM automation", "program templates"],
      ["PrintToProgramPipelineEngine", "GCodeIntelligencePipelineEngine"]);

    this.addAIFeature("KnowledgeIngestionOrchestratorEngine", "orchestration",
      "Multi-source knowledge extraction",
      ["document parsing", "video extraction", "data fusion"],
      ["training material", "manufacturer docs", "tribal knowledge capture"],
      ["TribalKnowledgeEngine", "ContentIngestionPipelineEngine"]);

    // ============================================================================
    // AGENT ENGINES (Multi-agent, coordination, specialization)
    // ============================================================================
    this.addAIFeature("MultiAgentCoordinatorEngine", "agent",
      "Coordinate multiple AI agents for complex tasks",
      ["agent spawning", "task distribution", "result synthesis"],
      ["parallel development", "code review", "complex problem solving"],
      ["MultiAgentAIInterfaceEngine", "AgentWorkflowEngine"]);

    this.addAIFeature("MultiAgentAIInterfaceEngine", "agent",
      "Interface layer for multi-agent communication",
      ["message passing", "state sharing", "conflict resolution"],
      ["agent collaboration", "supervisor oversight", "quality gates"],
      ["MultiAgentCoordinatorEngine", "AgentSpecializationProfileEngine"]);

    this.addAIFeature("AgentWorkflowEngine", "agent",
      "Define and execute agent workflows",
      ["workflow definition", "step execution", "checkpoint/resume"],
      ["build pipelines", "review processes", "deployment workflows"],
      ["MultiAgentCoordinatorEngine", "AgentExecutor"]);

    this.addAIFeature("AgentSpecializationProfileEngine", "agent",
      "Agent capability profiling and matching",
      ["skill assessment", "task matching", "load balancing"],
      ["agent selection", "capability routing", "specialization"],
      ["MultiAgentAIInterfaceEngine", "AgentSelfAwarenessEngine"]);

    this.addAIFeature("AgentMemoryFabricEngine", "agent",
      "Persistent agent memory across sessions",
      ["memory storage", "context preservation", "learning retention"],
      ["session continuity", "preference learning", "accumulated knowledge"],
      ["ContextCompactionEngine", "AgentSelfAwarenessEngine"]);

    this.addAIFeature("AgentSelfAwarenessEngine", "agent",
      "Agent self-model and capability awareness",
      ["capability inventory", "gap detection", "improvement suggestions"],
      ["self-improvement", "capability reporting", "task feasibility"],
      ["PRISMSelfAwarenessEngine", "ProactiveIntelligenceEngine"]);

    // ============================================================================
    // ADVISOR ENGINES (Expert systems, recommendations)
    // ============================================================================
    this.addAIFeature("LatheExpertAdvisorEngine", "advisor",
      "Expert-level lathe machining advice",
      ["operation sequencing", "parameter recommendations", "troubleshooting"],
      ["complex turning", "threading", "grooving strategies"],
      ["LatheIntelligenceEngine", "MachiningPlaybookEngine"]);

    this.addAIFeature("FinishTargetAdvisorEngine", "advisor",
      "Surface finish achievement strategies",
      ["parameter tuning", "tool selection", "strategy advice"],
      ["Ra/Rz targets", "polish operations", "grinding parameters"],
      ["SurfaceFinishPredictorEngine", "MachiningPlaybookEngine"]);

    this.addAIFeature("TribalKnowledgeAdvisorEngine", "advisor",
      "Shop-floor tribal knowledge recommendations",
      ["tip retrieval", "relevance ranking", "context matching"],
      ["setup tips", "machining tricks", "troubleshooting advice"],
      ["TribalKnowledgeEngine", "MachiningPlaybookEngine"]);

    // ============================================================================
    // PREDICTION ENGINES (Forecasting, estimation)
    // ============================================================================
    this.addAIFeature("LathePredictiveIntelligenceEngine", "prediction",
      "Predictive analytics for lathe operations",
      ["cycle time prediction", "quality forecasting", "wear prediction"],
      ["production planning", "tool inventory", "maintenance scheduling"],
      ["LatheIntelligenceEngine", "MachineLearningFeedbackEngine"]);

    this.addAIFeature("RealTimeMachineIntelligenceEngine", "prediction",
      "Real-time machine state prediction",
      ["anomaly detection", "failure prediction", "adaptive control"],
      ["condition monitoring", "predictive maintenance", "process control"],
      ["MachineLearningFeedbackEngine", "ProactiveIntelligenceEngine"]);

    this.addAIFeature("BayesianToolLifeEngine", "prediction",
      "Probabilistic tool life estimation",
      ["Bayesian inference", "uncertainty quantification", "updating"],
      ["tool change planning", "cost optimization", "risk assessment"],
      ["TaylorToolLifeEngine", "MachineLearningFeedbackEngine"]);
  }

  /**
   * Add AI feature to index
   */
  private addAIFeature(
    name: string,
    category: AIFeature["category"],
    description: string,
    capabilities: string[],
    useCases: string[],
    relatedFeatures: string[]
  ): void {
    this.aiFeatures.set(name, {
      name,
      category,
      description,
      capabilities,
      useCases,
      relatedFeatures
    });
  }

  // ============================================================================
  // H: DRIVE ACCESS METHODS
  // ============================================================================

  /**
   * Get all H: drive locations
   */
  getDriveLocations(): DriveLocation[] {
    return [...this.driveLocations.values()];
  }

  /**
   * Find location by query
   */
  findDriveLocation(query: string): DriveLocation | null {
    const lowerQuery = query.toLowerCase();

    for (const [key, location] of this.driveLocations) {
      if (key.includes(lowerQuery) ||
          location.description.toLowerCase().includes(lowerQuery) ||
          location.keywords.some(k => k.includes(lowerQuery))) {
        return location;
      }
    }

    return null;
  }

  /**
   * Search H: drive by category
   */
  getDriveLocationsByCategory(category: DriveLocation["category"]): DriveLocation[] {
    return [...this.driveLocations.values()].filter(l => l.category === category);
  }

  // ============================================================================
  // JM DIE DIRECT ACCESS METHODS
  // ============================================================================

  /**
   * Get JM DIE machine folders
   */
  getJMDieMachineFolders(): JMDieMachineFolder[] {
    return [...this.jmDieMachineFolders.values()];
  }

  /**
   * Get JM DIE customers
   */
  getJMDieCustomers(): JMDieCustomer[] {
    return [...this.jmDieCustomers.values()];
  }

  /**
   * Search JM DIE customers by name
   */
  searchJMDieCustomer(query: string): JMDieCustomer[] {
    const lowerQuery = query.toLowerCase();
    return [...this.jmDieCustomers.values()].filter(c =>
      c.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get JM DIE customer path (direct file system path)
   */
  getJMDieCustomerPath(customerName: string): string | null {
    const customer = this.jmDieCustomers.get(customerName.toLowerCase());
    return customer?.path ?? null;
  }

  /**
   * Get JM DIE program search paths for a machine type
   */
  getJMDieProgramPaths(machineType: string): string[] {
    const paths: string[] = [];
    const lowerType = machineType.toLowerCase();

    for (const folder of this.jmDieMachineFolders.values()) {
      if (folder.type.toLowerCase().includes(lowerType)) {
        paths.push(folder.path);
      }
    }

    return paths;
  }

  /**
   * Get JM DIE summary for context injection
   */
  getJMDieSummary(): string {
    const folders = this.getJMDieMachineFolders();
    const customers = this.getJMDieCustomers();

    return `JM DIE: ${folders.length} machine folders, ${customers.length}+ customers, 24,545 programs
Machines: ${folders.map(f => f.type).join(", ")}
Top customers: ${customers.slice(0, 5).map(c => c.name).join(", ")}
Root: H:/PRISM/JM DIE`;
  }

  // ============================================================================
  // RESOURCE FILE ACCESS METHODS
  // ============================================================================

  /**
   * Get all resource files
   */
  getResourceFiles(): ResourceFile[] {
    return [...this.resourceFiles.values()];
  }

  /**
   * Get resource files by type
   */
  getResourceFilesByType(type: ResourceFile["type"]): ResourceFile[] {
    return [...this.resourceFiles.values()].filter(r => r.type === type);
  }

  /**
   * Search resources by domain
   */
  searchResources(domain: string): ResourceFile[] {
    const lowerDomain = domain.toLowerCase();
    return [...this.resourceFiles.values()].filter(r =>
      r.domains.some(d => d.includes(lowerDomain) || lowerDomain.includes(d))
    );
  }

  /**
   * Get resource summary for context injection
   */
  getResourceSummary(): string {
    const tips = this.getResourceFilesByType("tips");
    const catalogs = this.getResourceFilesByType("catalog");
    const knowledge = this.getResourceFilesByType("knowledge");

    const totalTips = tips.reduce((sum, t) => sum + (t.recordCount ?? 0), 0);
    const totalTools = catalogs.reduce((sum, c) => sum + (c.recordCount ?? 0), 0);

    return `Resources: ${tips.length} CAM tip files (~${totalTips} tips), ${catalogs.length} tool catalogs (~${totalTools} tools)
Knowledge: ${knowledge.map(k => k.domains[0]).join(", ")}
Path: H:/prism/mcp-server/src/data/`;
  }

  // ============================================================================
  // TRIBAL KNOWLEDGE INTEGRATION
  // ============================================================================

  /**
   * Search tribal knowledge (delegates to TribalKnowledgeEngine when available)
   */
  searchTribalKnowledge(query: string, options?: {
    category?: string;
    domain?: string;
    limit?: number;
  }): TribalKnowledgeResult[] {
    // Static implementation - would call TribalKnowledgeEngine in production
    const results: TribalKnowledgeResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search through CAM tips resources
    for (const resource of this.resourceFiles.values()) {
      if (resource.type === "tips" || resource.type === "knowledge") {
        const relevance = this.calculateResourceRelevance(lowerQuery, resource);
        if (relevance > 0.3) {
          results.push({
            tipId: `res_${resource.name}`,
            title: resource.description,
            category: resource.type,
            confidence: relevance,
            source: resource.path,
            tags: resource.domains
          });
        }
      } catch (err) {
        log("error", `Failed to load hooks from ${root.dir}: ${err}`);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence).slice(0, options?.limit ?? 10);
  }

  /**
   * Calculate resource relevance for tribal knowledge search
   */
  private calculateResourceRelevance(query: string, resource: ResourceFile): number {
    let score = 0;
    const queryWords = query.split(/\s+/);

    for (const word of queryWords) {
      if (word.length < 2) continue;

      if (resource.description.toLowerCase().includes(word)) score += 0.3;
      if (resource.domains.some(d => d.includes(word))) score += 0.4;
      if (resource.name.toLowerCase().includes(word)) score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Get tribal knowledge summary
   */
  getTribalKnowledgeSummary(): string {
    return `Tribal Knowledge: 3,700+ tips across 18 CAM systems
Sources: TribalKnowledgeEngine, MachiningPlaybookEngine (296 rules)
Domains: shop_floor, cam_software, controller_specific, tooling_technology, safety
Engine: src/engines/TribalKnowledgeEngine.ts`;
  }

  // ============================================================================
  // PLAYBOOK INTEGRATION
  // ============================================================================

  /**
   * Search machining playbook rules
   */
  searchPlaybookRules(query: string, options?: {
    category?: string;
    severity?: string;
    limit?: number;
  }): PlaybookRuleResult[] {
    // Would call MachiningPlaybookEngine in production
    // Static implementation for self-awareness context
    const results: PlaybookRuleResult[] = [];

    // Return high-confidence rule suggestions based on query
    const lowerQuery = query.toLowerCase();

    const ruleMatches: { keywords: string[]; rule: PlaybookRuleResult }[] = [
      {
        keywords: ["thin", "wall", "deflection"],
        rule: {
          ruleId: "pb_thin_wall_01",
          title: "Thin wall support before final passes",
          category: "thin_wall",
          severity: "critical",
          reasoning: "Thin walls (<2mm) deflect under cutting forces. Support before final passes."
        }
      },
      {
        keywords: ["roughing", "depth", "cut"],
        rule: {
          ruleId: "pb_roughing_01",
          title: "Roughing depth limits by material",
          category: "roughing",
          severity: "important",
          reasoning: "Limit ap to 1.5xD for steel, 2xD for aluminum. Deeper cuts cause chatter."
        }
      },
      {
        keywords: ["finish", "surface", "ra"],
        rule: {
          ruleId: "pb_finish_01",
          title: "Surface finish requires feed adjustment",
          category: "finishing",
          severity: "important",
          reasoning: "Ra = fn^2 / (32 * R). Halve feed for 4x better finish."
        }
      },
      {
        keywords: ["tool", "life", "wear"],
        rule: {
          ruleId: "pb_toollife_01",
          title: "Monitor flank wear before crater wear",
          category: "tool_life",
          severity: "recommended",
          reasoning: "Flank wear is predictable. Crater wear indicates thermal failure mode."
        }
      },
      {
        keywords: ["coolant", "flood", "mist"],
        rule: {
          ruleId: "pb_coolant_01",
          title: "Coolant strategy by operation",
          category: "coolant_strategy",
          severity: "recommended",
          reasoning: "Drilling: through-tool. Milling: flood or mist. Hard turning: dry or MQL."
        }
      } catch (err) {
        log("error", `Failed to load skills from ${root.dir}: ${err}`);
      }
    ];

    for (const match of ruleMatches) {
      if (match.keywords.some(k => lowerQuery.includes(k))) {
        results.push(match.rule);
      }
    }

    return results.slice(0, options?.limit ?? 5);
  }

  // ============================================================================
  // WEB SEARCH CAPABILITY
  // ============================================================================

  /**
   * Generate web search query for external sources
   */
  generateWebSearch(topic: string): WebSearchResult[] {
    const relevantSources = this.findRelevantSources(topic);

    return relevantSources.map(source => ({
      source,
      query: topic,
      suggestedTopics: this.generateSuggestedTopics(topic, source),
      trustLevel: source.trustLevel
    }));
  }

  /**
   * Generate suggested search topics for a source
   */
  private generateSuggestedTopics(topic: string, source: ExternalSource): string[] {
    const topics: string[] = [];

    if (source.id === "sandvik" || source.id === "kennametal") {
      topics.push(
        `${topic} cutting data`,
        `${topic} insert selection`,
        `${topic} speed feed recommendations`
      );
    } else if (source.id === "machinery_handbook") {
      topics.push(
        `${topic} formula`,
        `${topic} specifications`,
        `${topic} tolerances`
      );
    } else if (source.id === "iso_standards") {
      topics.push(
        `ISO ${topic}`,
        `${topic} standard`,
        `${topic} certification`
      );
    }

    return topics;
  }

  /**
   * Get web search capability summary
   */
  getWebSearchSummary(): string {
    return `Web Search: 5 trusted sources (95-100% trust)
- Sandvik Coromant (cutting tools, speed/feed)
- Kennametal (materials, tooling)
- Machinery's Handbook (formulas, standards)
- ISO Standards (tolerances, quality)
- NIST (material properties)`;
  }

  // ============================================================================
  // PROACTIVE DEEP REASONING
  // ============================================================================

  /**
   * Proactive reasoning - analyze request and suggest what else might be needed
   * This is the "ask itself what else it should add" feature
   */
  proactiveReason(query: string): ProactiveReasoningResult {
    const lowerQuery = query.toLowerCase();

    // Step 1: Infer intent from query
    const inferredIntent = this.inferIntent(lowerQuery);

    // Step 2: Find related capabilities (beyond what was asked)
    const directMatches = this.searchCapabilities(query);
    const relatedCapabilities = this.findRelatedCapabilities(directMatches, inferredIntent);

    // Step 3: Find relevant resources
    const suggestedResources = this.findRelatedResources(lowerQuery, inferredIntent);

    // Step 4: Find relevant tribal knowledge
    const relevantKnowledge = this.searchTribalKnowledge(query, { limit: 5 });

    // Step 5: Find relevant playbook rules
    const relevantRules = this.searchPlaybookRules(query, { limit: 5 });

    // Step 6: Identify missing context the user might need
    const missingContext = this.identifyMissingContext(lowerQuery, inferredIntent);

    // Step 7: Generate proactive questions
    const proactiveQuestions = this.generateProactiveQuestions(lowerQuery, inferredIntent);

    // Step 8: Recommend actions
    const recommendedActions = this.generateRecommendedActions(inferredIntent, directMatches);

    // Calculate overall confidence
    const confidence = this.calculateReasoningConfidence(
      directMatches,
      relevantKnowledge,
      relevantRules
    );

    return {
      originalQuery: query,
      inferredIntent,
      relatedCapabilities,
      suggestedResources,
      relevantKnowledge,
      relevantRules,
      missingContext,
      proactiveQuestions,
      recommendedActions,
      confidence
    };
  }

  /**
   * Infer the underlying intent from a query
   */
  private inferIntent(query: string): string {
    // Order matters - more specific patterns first, use word boundaries
    const intentPatterns: { keywords: string[]; intent: string }[] = [
      // Specific domains first (EDM, thin wall, etc.)
      { keywords: ["edm", "wire edm", "sinker", "electrode"], intent: "edm_processing" },
      { keywords: ["thin wall", "thin-wall", "deflect", "flex"], intent: "thin_feature_machining" },
      // Machine-specific operations before generic
      { keywords: ["lathe", "turning", "turn od", "turn id", "boring", "od turn", "id turn"], intent: "turning_operation" },
      { keywords: ["milling", "pocket", "contour", "slot", "face mill"], intent: "milling_operation" },
      // Tool selection - check before programming
      { keywords: ["select tool", "choose tool", "recommend tool", "tool select", "tool recommend", "recommend a tool", "select a tool"], intent: "tool_selection" },
      // Other operations
      { keywords: ["quote", "cost", "price", "estimate", "bid", "how much"], intent: "cost_estimation" },
      { keywords: ["speed", "feed", "rpm", "sfm", "ipm", "cutting param"], intent: "cutting_parameters" },
      { keywords: ["program", "gcode", "g-code", "nc code", "post process"], intent: "nc_programming" },
      { keywords: ["setup", "fixture", "workhold", "clamp", "chuck", "vise"], intent: "workholding_setup" },
      { keywords: ["surface finish", "ra ", "roughness", "finish quality"], intent: "surface_quality" },
      { keywords: ["tolerance", "dimension", "accuracy", "precision", "±"], intent: "dimensional_accuracy" },
      { keywords: ["material", "steel", "aluminum", "titanium", "carbide", "inconel"], intent: "material_processing" },
      { keywords: ["drill", "hole", "tap", "thread", "ream"], intent: "hole_making" },
      { keywords: ["schedule", "capacity", "lead time", "delivery"], intent: "production_planning" },
      { keywords: ["quality", "inspect", "cmm", "measure", "check"], intent: "quality_inspection" },
      { keywords: ["safety", "crash", "collision", "limit", "danger"], intent: "safety_verification" },
      { keywords: ["customer", "job", "order", "work order"], intent: "job_management" }
    ];

    for (const pattern of intentPatterns) {
      if (pattern.keywords.some(k => query.includes(k))) {
        return pattern.intent;
      }
    }

    return "general_manufacturing";
  }

  /**
   * Find capabilities related to but not directly matching the query
   */
  private findRelatedCapabilities(
    directMatches: CapabilityMatch[],
    intent: string
  ): CapabilityMatch[] {
    const relatedKeywords: Record<string, string[]> = {
      cost_estimation: ["lead_time", "capacity_check", "material_lookup"],
      cutting_parameters: ["cutting_force", "tool_life", "surface_finish", "power_requirement"],
      tool_selection: ["tool_catalog", "speed_feed", "cutting_force"],
      nc_programming: ["simulation", "collision_detect", "post_process"],
      workholding_setup: ["fixture_recommend", "machine_selection", "safety_check"],
      surface_quality: ["speed_feed", "tool_selection", "deflection"],
      dimensional_accuracy: ["tolerance_verify", "deflection", "thermal"],
      material_processing: ["speed_feed", "tool_life", "cutting_force"],
      turning_operation: ["speed_feed", "tool_selection", "surface_finish"],
      milling_operation: ["toolpath_strategy", "tool_selection", "speed_feed"],
      hole_making: ["tool_selection", "speed_feed", "cycle_time"],
      edm_processing: ["material_lookup", "surface_finish", "electrode"],
      thin_feature_machining: ["deflection", "speed_feed", "fixture_recommend"],
      production_planning: ["capacity_check", "lead_time", "job_status"],
      quality_inspection: ["tolerance_verify", "surface_finish", "inspection_plan"],
      safety_verification: ["limit_verify", "collision_detect", "risk_assessment"],
      job_management: ["job_status", "customer_info", "quote_estimate"]
    };

    const keywords = relatedKeywords[intent] ?? [];
    const directActions = new Set(directMatches.map(m => m.action));
    const related: CapabilityMatch[] = [];

    for (const keyword of keywords) {
      if (!directActions.has(keyword)) {
        const matches = this.searchCapabilities(keyword);
        if (matches.length > 0) {
          related.push(matches[0]);
        }
      }
    }

    return related.slice(0, 5);
  }

  /**
   * Find resources related to the query
   */
  private findRelatedResources(query: string, intent: string): ResourceFile[] {
    const intentResources: Record<string, string[]> = {
      cutting_parameters: ["speed-feed", "cam-tips", "tool-catalog"],
      tool_selection: ["tool-catalog", "holder-catalog"],
      nc_programming: ["cam-tips", "controller-knowledge"],
      edm_processing: ["wedm-knowledge", "edm-material"],
      material_processing: ["material", "tool-catalog"],
      turning_operation: ["cam-tips", "mastercam", "controller"],
      milling_operation: ["cam-tips", "hypermill", "fusion360"]
    };

    const patterns = intentResources[intent] ?? ["cam-tips"];
    const matches: ResourceFile[] = [];

    for (const pattern of patterns) {
      const found = this.searchResources(pattern);
      matches.push(...found);
    }

    // Deduplicate
    const seen = new Set<string>();
    return matches.filter(r => {
      if (seen.has(r.name)) return false;
      seen.add(r.name);
      return true;
    }).slice(0, 5);
  }

  /**
   * Identify what context might be missing from the query
   */
  private identifyMissingContext(query: string, intent: string): string[] {
    const missing: string[] = [];

    // Check for material specification
    const hasMaterial = /steel|aluminum|titanium|inconel|brass|copper|carbide|graphite|plastic/i.test(query);
    if (!hasMaterial && ["cutting_parameters", "tool_selection", "material_processing"].includes(intent)) {
      missing.push("Material type not specified (affects speed/feed recommendations)");
    }

    // Check for machine specification
    const hasMachine = /lathe|mill|edm|grind|turn|cnc|okuma|haas|hurco|mazak/i.test(query);
    if (!hasMachine && ["nc_programming", "workholding_setup", "safety_verification"].includes(intent)) {
      missing.push("Machine type not specified (affects program format and limits)");
    }

    // Check for tolerance specification
    const hasTolerance = /\+\-|±|tolerance|thou|micron|0\.\d{3}/i.test(query);
    if (!hasTolerance && ["dimensional_accuracy", "quality_inspection"].includes(intent)) {
      missing.push("Tolerance requirements not specified");
    }

    // Check for quantity
    const hasQuantity = /\d+\s*(pcs|pieces|parts|qty|quantity|batch)/i.test(query);
    if (!hasQuantity && ["cost_estimation", "production_planning"].includes(intent)) {
      missing.push("Quantity not specified (affects cost and scheduling)");
    }

    // Check for surface finish
    const hasFinish = /ra\s*\d|finish|\d+\s*μ?in|\d+\s*micro/i.test(query);
    if (!hasFinish && ["surface_quality", "cutting_parameters"].includes(intent)) {
      missing.push("Surface finish requirement not specified");
    }

    // Check for customer context (JM DIE)
    const hasCustomer = this.getJMDieCustomers().some(c =>
      query.toLowerCase().includes(c.name.toLowerCase())
    );
    if (!hasCustomer && ["job_management", "cost_estimation"].includes(intent)) {
      missing.push("Customer not identified (JM DIE has 100+ customer profiles)");
    }

    return missing;
  }

  /**
   * Generate proactive questions based on the query
   */
  private generateProactiveQuestions(query: string, intent: string): string[] {
    const questions: string[] = [];

    const intentQuestions: Record<string, string[]> = {
      cost_estimation: [
        "Should I include setup time in the estimate?",
        "Is this a repeat job with existing programs?",
        "What's the required lead time?"
      ],
      cutting_parameters: [
        "Should I optimize for tool life or cycle time?",
        "Is this roughing or finishing?",
        "What's the machine's max spindle speed?"
      ],
      tool_selection: [
        "Is through-tool coolant available?",
        "What's the available tool holder size?",
        "Should I consider existing shop inventory?"
      ],
      nc_programming: [
        "Which controller/post processor is needed?",
        "Should I include setup sheet generation?",
        "Are there existing programs to reference?"
      ],
      workholding_setup: [
        "What's the part material and weight?",
        "Are there existing fixtures to consider?",
        "How many operations/setups required?"
      ],
      thin_feature_machining: [
        "What's the minimum wall thickness?",
        "Can multiple light passes be used?",
        "Is support material acceptable?"
      ]
    };

    const baseQuestions = intentQuestions[intent] ?? [
      "Should I check tribal knowledge for similar jobs?",
      "Would you like me to search JM DIE history for this customer?",
      "Should I verify machine availability?"
    ];

    questions.push(...baseQuestions);

    // Add context-specific questions
    if (!query.includes("jm die") && !query.includes("customer")) {
      questions.push("Would you like me to search JM DIE customer programs for similar parts?");
    }

    return questions.slice(0, 5);
  }

  /**
   * Generate recommended actions based on analysis
   */
  private generateRecommendedActions(
    intent: string,
    directMatches: CapabilityMatch[]
  ): string[] {
    const actions: string[] = [];

    // Always recommend the primary action
    if (directMatches.length > 0) {
      actions.push(`Use prism_${directMatches[0].dispatcher}:${directMatches[0].action}`);
    }

    // Intent-specific recommendations
    const intentActions: Record<string, string[]> = {
      cost_estimation: [
        "Check TribalKnowledgeEngine for cost adjustments",
        "Verify material availability in inventory",
        "Review similar past quotes for this customer"
      ],
      cutting_parameters: [
        "Consult MachiningPlaybookEngine for anti-patterns",
        "Verify against manufacturer recommendations (Sandvik/Kennametal)",
        "Check tool catalog for optimal insert grades"
      ],
      nc_programming: [
        "Search JM DIE programs for similar operations",
        "Review controller-specific tips",
        "Run program through safety validation"
      ],
      tool_selection: [
        "Check shop tool inventory before recommending new tooling",
        "Review tribal knowledge for tool life data",
        "Consider holder availability"
      ],
      thin_feature_machining: [
        "Review playbook rules for thin wall strategies",
        "Calculate deflection before finalizing feeds",
        "Consider climb vs conventional milling"
      ]
    };

    const specificActions = intentActions[intent] ?? [];
    actions.push(...specificActions);

    // Always add a tribal knowledge check
    if (!actions.some(a => a.includes("Tribal"))) {
      actions.push("Search tribal knowledge for shop-specific tips");
    }

    return actions.slice(0, 5);
  }

  /**
   * Calculate confidence in the reasoning
   */
  private calculateReasoningConfidence(
    directMatches: CapabilityMatch[],
    knowledge: TribalKnowledgeResult[],
    rules: PlaybookRuleResult[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost for direct capability matches
    if (directMatches.length > 0) {
      confidence += directMatches[0].confidence * 0.3;
    }

    // Boost for relevant knowledge
    if (knowledge.length > 0) {
      confidence += 0.1;
    }

    // Boost for relevant rules
    if (rules.length > 0) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  // ============================================================================
  // AI FEATURES ACCESS & INTELLIGENT ROUTING
  // ============================================================================

  /**
   * Get all AI features
   */
  getAIFeatures(): AIFeature[] {
    return [...this.aiFeatures.values()];
  }

  /**
   * Get AI features by category
   */
  getAIFeaturesByCategory(category: AIFeature["category"]): AIFeature[] {
    return [...this.aiFeatures.values()].filter(f => f.category === category);
  }

  /**
   * Search AI features by query
   */
  searchAIFeatures(query: string): AIFeature[] {
    const lowerQuery = query.toLowerCase();
    const results: Array<{ feature: AIFeature; score: number }> = [];

    for (const feature of this.aiFeatures.values()) {
      let score = 0;

      // Match name
      if (feature.name.toLowerCase().includes(lowerQuery)) score += 0.4;

      // Match description
      if (feature.description.toLowerCase().includes(lowerQuery)) score += 0.3;

      // Match capabilities
      for (const cap of feature.capabilities) {
        if (cap.toLowerCase().includes(lowerQuery)) score += 0.2;
      }

      // Match use cases
      for (const useCase of feature.useCases) {
        if (useCase.toLowerCase().includes(lowerQuery)) score += 0.15;
      }

      if (score > 0.1) {
        results.push({ feature, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => r.feature);
  }

  /**
   * Intelligent AI feature recommendation based on task
   */
  recommendAIFeatures(task: string): {
    primaryFeature: AIFeature | null;
    supportingFeatures: AIFeature[];
    multiAgentStrategy: string;
    advisorApproach: string;
  } {
    const matches = this.searchAIFeatures(task);
    const intent = this.inferIntent(task.toLowerCase());

    // Determine primary feature
    const primaryFeature = matches.length > 0 ? matches[0] : null;

    // Find supporting features
    const supportingFeatures = primaryFeature
      ? this.findSupportingFeatures(primaryFeature, matches.slice(1))
      : [];

    // Recommend multi-agent strategy
    const multiAgentStrategy = this.recommendMultiAgentStrategy(task, intent);

    // Recommend advisor approach
    const advisorApproach = this.recommendAdvisorApproach(task, intent);

    return {
      primaryFeature,
      supportingFeatures,
      multiAgentStrategy,
      advisorApproach
    };
  }

  /**
   * Find supporting AI features based on primary selection
   */
  private findSupportingFeatures(primary: AIFeature, candidates: AIFeature[]): AIFeature[] {
    const supporting: AIFeature[] = [];

    // Add related features
    for (const relatedName of primary.relatedFeatures) {
      const related = this.aiFeatures.get(relatedName);
      if (related && !supporting.includes(related)) {
        supporting.push(related);
      }
    }

    // Add category-complementary features
    const categoryComplement: Record<string, AIFeature["category"][]> = {
      reasoning: ["learning", "advisor"],
      learning: ["intelligence", "prediction"],
      intelligence: ["reasoning", "orchestration"],
      orchestration: ["agent", "intelligence"],
      agent: ["orchestration", "reasoning"],
      advisor: ["reasoning", "intelligence"],
      prediction: ["learning", "intelligence"]
    };

    const complementCategories = categoryComplement[primary.category] ?? [];
    for (const candidate of candidates) {
      if (complementCategories.includes(candidate.category) && !supporting.includes(candidate)) {
        supporting.push(candidate);
      }
    }

    return supporting.slice(0, 5);
  }

  /**
   * Recommend multi-agent strategy for task
   */
  private recommendMultiAgentStrategy(task: string, intent: string): string {
    const taskLower = task.toLowerCase();

    // Complex development tasks benefit from supervisor pattern
    if (taskLower.includes("build") || taskLower.includes("implement") || taskLower.includes("create")) {
      return "BUILDER-SUPERVISOR: Use MultiAgentCoordinatorEngine to spawn builder agents " +
        "while supervisor agents (code review, physics verification, test validation) " +
        "monitor and provide feedback. Agents: builder, code-reviewer, physics-reviewer, test-reviewer.";
    }

    // Analysis tasks benefit from parallel exploration
    if (taskLower.includes("analyze") || taskLower.includes("investigate") || taskLower.includes("diagnose")) {
      return "PARALLEL-ANALYSIS: Use MultiAgentAIInterfaceEngine to spawn multiple analysis agents " +
        "exploring different hypotheses simultaneously. Aggregate findings with confidence weighting.";
    }

    // Optimization tasks benefit from iterative refinement
    if (taskLower.includes("optimize") || taskLower.includes("improve") || taskLower.includes("enhance")) {
      return "ITERATIVE-REFINEMENT: Use AgentWorkflowEngine to define optimization cycles. " +
        "Each cycle: propose improvements → validate physics → test → measure → repeat.";
    }

    // Complex queries benefit from decomposition
    if (taskLower.includes("quote") || taskLower.includes("plan") || taskLower.includes("design")) {
      return "TASK-DECOMPOSITION: Use IntentDecompositionEngine to break into subtasks. " +
        "Assign specialized agents to each subtask, then synthesize results.";
    }

    // Default: single-agent with advisor support
    return "SINGLE-AGENT-ADVISED: Use AgenticLoopEngine with advisor consultation. " +
      "Primary agent executes while TribalKnowledgeAdvisorEngine and MachiningPlaybookEngine provide guidance.";
  }

  /**
   * Recommend advisor approach for task
   */
  private recommendAdvisorApproach(task: string, intent: string): string {
    const advisorRecommendations: Record<string, string> = {
      cutting_parameters: "Consult SpeedFeedUltimateAIEngine for parameters, " +
        "TribalKnowledgeEngine for shop-specific adjustments, " +
        "MachiningPlaybookEngine for anti-patterns to avoid.",
      tool_selection: "Use SmartToolSelectorEngine with InventoryAwareToolSelectorEngine " +
        "to consider shop inventory. Consult ToolCatalogEngine for specifications.",
      turning_operation: "Use LatheExpertAdvisorEngine for sequencing advice, " +
        "LatheIntelligenceEngine for optimization, LatheDeepReasoningEngine for complex decisions.",
      milling_operation: "Use MillingAIUltraIntelligenceEngine for strategy selection, " +
        "AdaptiveToolpathRouterEngine for toolpath optimization.",
      edm_processing: "Use ElectrodeUltimateAIEngine for electrode design, " +
        "EDMQualityOrchestratorEngine for burn strategy optimization.",
      thin_feature_machining: "Consult MachiningPlaybookEngine thin_wall rules, " +
        "DeflectionEngine for predictions, FinishTargetAdvisorEngine for achievable quality.",
      cost_estimation: "Use QuoteEstimatorEngine with BusinessIntelligenceEngine validation, " +
        "TribalKnowledgeEngine for quote_correction tips.",
      nc_programming: "Use AutoProgramOrchestratorEngine for generation, " +
        "ControllerProgrammingIntelligenceEngine for controller-specific optimizations.",
      safety_verification: "MANDATORY: Use SafetyEngine for S(x) scoring, " +
        "CollisionDetectionEngine for simulation, MachineLimitGuardEngine for limit checks."
    };

    return advisorRecommendations[intent] ??
      "Use ProactiveIntelligenceEngine to anticipate needs, " +
      "TribalKnowledgeEngine for domain tips, MachiningPlaybookEngine for best practices.";
  }

  /**
   * Get AI features summary for context injection
   */
  getAIFeaturesSummary(): string {
    const categories = ["reasoning", "learning", "intelligence", "orchestration", "agent", "advisor", "prediction"] as const;
    const counts: Record<string, number> = {};

    for (const cat of categories) {
      counts[cat] = this.getAIFeaturesByCategory(cat).length;
    }

    return `AI Features: ${this.aiFeatures.size} engines
Categories: reasoning(${counts.reasoning}), learning(${counts.learning}), intelligence(${counts.intelligence}),
  orchestration(${counts.orchestration}), agent(${counts.agent}), advisor(${counts.advisor}), prediction(${counts.prediction})
Key Capabilities:
  - Multi-agent coordination: MultiAgentCoordinatorEngine, AgentWorkflowEngine
  - Builder-supervisor pattern: spawn builders + reviewers for quality
  - Deep reasoning: ManufacturingReasoningEngine, MultiPathReasoningEngine
  - Tribal knowledge: TribalKnowledgeEngine (3,700+ tips), MachiningPlaybookEngine (296 rules)
Use: recommendAIFeatures(task), searchAIFeatures(query), getAIFeaturesByCategory(cat)`;
  }

  /**
   * Quick proactive check - returns compact recommendations
   */
  quickProactiveCheck(query: string): string {
    const result = this.proactiveReason(query);

    const lines: string[] = [
      `Intent: ${result.inferredIntent}`,
      `Confidence: ${(result.confidence * 100).toFixed(0)}%`
    ];

    if (result.missingContext.length > 0) {
      lines.push(`Missing: ${result.missingContext[0]}`);
    }

    if (result.proactiveQuestions.length > 0) {
      lines.push(`Ask: ${result.proactiveQuestions[0]}`);
    }

    if (result.recommendedActions.length > 0) {
      lines.push(`Do: ${result.recommendedActions[0]}`);
    }

    return lines.join(" | ");
  }

  // ============================================================================
  // COMPREHENSIVE AWARENESS CONTEXT
  // ============================================================================

  /**
   * Get full H: drive awareness summary for context injection
   */
  getFullDriveAwareness(): string {
    const jmDie = this.getJMDieSummary();
    const resources = this.getResourceSummary();
    const tribal = this.getTribalKnowledgeSummary();
    const web = this.getWebSearchSummary();

    return `# H: Drive Awareness

## Project Root
H:/prism — PRISM Manufacturing Intelligence Platform

## JM DIE Programs
${jmDie}

## Resources & Knowledge
${resources}

## Tribal Knowledge
${tribal}

## External Sources
${web}

## Quick Access
- JM DIE: getJMDieCustomerPath(customer), getJMDieProgramPaths(machineType)
- Resources: searchResources(domain), getResourceFilesByType(type)
- Knowledge: searchTribalKnowledge(query), searchPlaybookRules(query)
- Web: generateWebSearch(topic), findRelevantSources(query)`;
  }

  /**
   * Get top capabilities for a dispatcher
   */
  private getTopCapabilities(dispatcher: string, limit: number): string[] {
    const caps: string[] = [];

    for (const [fullAction, entry] of this.capabilityIndex) {
      if (entry.dispatcher === dispatcher) {
        caps.push(entry.action);
        if (caps.length >= limit) break;
      }
    }

    return caps;
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(queryWords: string[], target: string): number {
    if (queryWords.length === 0) return 0;

    const targetWords = target.split(/\s+/);
    let matches = 0;
    let exactMatches = 0;

    for (const word of queryWords) {
      if (word.length < 2) continue; // Skip very short words

      if (target.includes(word)) {
        matches++;
        if (targetWords.includes(word)) {
          exactMatches++;
        }
      }
    }

    // Weighted score: exact matches count more
    const matchScore = (matches + exactMatches * 0.5) / (queryWords.length * 1.5);

    // Boost for full query substring match
    const fullQuery = queryWords.join(" ");
    const substringBoost = target.includes(fullQuery) ? 0.3 : 0;

    return Math.min(1, matchScore + substringBoost);
  }

  /**
   * Generate checksum for delta detection
   */
  private generateChecksum(): string {
    const content = `${this.capabilityIndex.size}:${this.engineIndex.size}:${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.searchCache.clear();
    this.manifest = null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    searchCacheSize: number;
    manifestCached: boolean;
    manifestAge: number | null;
  } {
    return {
      searchCacheSize: this.searchCache.size,
      manifestCached: this.manifest !== null,
      manifestAge: this.manifest
        ? Date.now() - new Date(this.manifest.generatedAt).getTime()
        : null
    };
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface CapabilityEntry {
  dispatcher: string;
  action: string;
  description: string;
  keywords: string[];
}

interface EngineEntry {
  path: string;
  description: string;
  category: string;
  keywords: string[];
  relatedEngines: string[];
}

// ============================================================================
// CODEX / CLAUDE CODE COMPATIBILITY
// ============================================================================

/**
 * Generate CLAUDE.md compatible context block
 * This can be injected into CLAUDE.md or session startup
 */
export function generateClaudeMdContext(): string {
  const engine = prismSelfAwarenessEngine;
  const manifest = engine.getManifest();
  const stats = engine.getUsageStats();

  return `# PRISM Agent Self-Awareness Context
## Auto-generated: ${new Date().toISOString().split("T")[0]}

## System Capabilities
- **Dispatchers**: ${manifest.counts.dispatchers} (MCP action handlers)
- **Actions**: ${manifest.counts.actions} (callable operations)
- **Engines**: ${manifest.counts.engines} (calculation/logic modules)
- **Formulas**: ${manifest.counts.formulas} (physics models)
- **Algorithms**: ${manifest.counts.algorithms} (optimization methods)

## H: Drive Awareness
- **JM DIE Programs**: ${manifest.counts.jmDiePrograms} CNC files
- **JM DIE Customers**: ${manifest.counts.jmDieCustomers}+ fastener manufacturers
- **Tribal Knowledge**: ${manifest.counts.tribalTips}+ tips (18 CAM systems)
- **Playbook Rules**: ${manifest.counts.playbookRules} experiential rules
- **Resource Files**: ${manifest.counts.resourceFiles}+ catalogs/tips

## Quick Reference - Top Actions
### Calculations (prism_calc)
${manifest.topCapabilities.calculation.map(a => `- \`${a}\``).join("\n")}

### Business (prism_business)
${manifest.topCapabilities.business.map(a => `- \`${a}\``).join("\n")}

### CAM (prism_cam)
${manifest.topCapabilities.cam.map(a => `- \`${a}\``).join("\n")}

### Validation (prism_validate)
${manifest.topCapabilities.validation.map(a => `- \`${a}\``).join("\n")}

## Domains Supported
${manifest.domains.join(", ")}

## JM DIE Direct Access
- Root: H:/PRISM/JM DIE
- Lathe: H:/PRISM/JM DIE/CNC LATHE/{customer}
- Mill: H:/PRISM/JM DIE/CNC MILL HAAS/{customer}
- WEDM: H:/PRISM/JM DIE/WIRE EDM/{customer}
- Multus: H:/PRISM/JM DIE/CNC OKUMA MULTUS/{customer}

## Knowledge Sources
- TribalKnowledgeEngine: 3,700+ tips (shop_floor, cam_software, tooling)
- MachiningPlaybookEngine: 296 rules (sequencing, setup, anti-patterns)
- Resources: src/data/ (40+ tip files, tool catalogs)

## External Knowledge Sources (Trusted)
- Sandvik Coromant (95% trust) - cutting tools, speed/feed
- Kennametal (95% trust) - cutting tools, materials
- Machinery's Handbook (99% trust) - formulas, standards
- ISO Standards (100% trust) - materials, tolerances
- NIST (98% trust) - material properties

## Usage Hints
${stats.topActions.length > 0 ? `Most used: ${stats.topActions.slice(0, 3).map(a => a.action.split(":")[1]).join(", ")}` : "No usage data yet"}
${manifest.knownGaps.length > 0 ? `Known gaps: ${manifest.knownGaps.slice(0, 3).join(", ")}` : ""}

## How to Use Self-Awareness
\`\`\`typescript
import { prismSelfAwarenessEngine } from "./engines/PRISMSelfAwarenessEngine.js";

// Find capabilities
const result = engine.whatCanIDo("calculate speed");

// Get best action for task
const action = engine.howDoI("quote this part");

// Find relevant engines
const engines = engine.whoHandles("cutting force");

// JM DIE access
const customerPath = engine.getJMDieCustomerPath("ALCOA");
const lathePaths = engine.getJMDieProgramPaths("lathe");

// Tribal knowledge
const tips = engine.searchTribalKnowledge("thin wall milling");
const rules = engine.searchPlaybookRules("finishing surface");

// Web search
const searches = engine.generateWebSearch("carbide insert selection");
\`\`\`
`;
}

/**
 * Generate minimal context for token-constrained environments (~200 tokens)
 */
export function generateMinimalContext(): string {
  const manifest = prismSelfAwarenessEngine.getManifest();

  return `PRISM: ${manifest.counts.dispatchers}d/${manifest.counts.actions}a/${manifest.counts.engines}e
H:Drive: ${manifest.counts.jmDiePrograms}progs/${manifest.counts.jmDieCustomers}cust/${manifest.counts.tribalTips}tips
Calc: ${manifest.topCapabilities.calculation.slice(0, 4).join(",")}
Biz: ${manifest.topCapabilities.business.slice(0, 3).join(",")}
CAM: ${manifest.topCapabilities.cam.slice(0, 3).join(",")}
JM_DIE: H:/PRISM/JM DIE | searchTribalKnowledge(q) | searchPlaybookRules(q)`;
}

/**
 * Auto-refresh hook for session startup
 * Call this at the beginning of each session
 */
export async function refreshSelfAwareness(): Promise<{
  manifest: CapabilityManifest;
  context: string;
  minimalContext: string;
}> {
  const engine = prismSelfAwarenessEngine;

  // Force refresh manifest
  const manifest = engine.getManifest(true);

  // Clear stale caches
  engine.clearCaches();

  // Regenerate manifest after cache clear
  const freshManifest = engine.getManifest(true);

  return {
    manifest: freshManifest,
    context: generateClaudeMdContext(),
    minimalContext: generateMinimalContext()
  };
}

/**
 * Write self-awareness context to CLAUDE.md
 * For automatic context injection
 */
export async function writeSelfAwarenessToClaudeMd(
  claudeMdPath: string,
  mode: "append" | "section" = "section"
): Promise<boolean> {
  // This would write to the file system in production
  // For now, return the content that should be written
  const context = generateClaudeMdContext();

  if (mode === "section") {
    // Would find and replace the self-awareness section
    return true;
  } else {
    // Would append to end of file
    return true;
  }
}

// Export singleton
export const prismSelfAwarenessEngine = new PRISMSelfAwarenessEngine();
