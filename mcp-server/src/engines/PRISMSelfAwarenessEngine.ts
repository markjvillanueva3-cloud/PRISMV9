/**
 * PRISMSelfAwarenessEngine — Core Infrastructure
 *
 * Maintains awareness of PRISM's capabilities (engines, dispatchers, actions).
 * Provides capability matching, gap detection, and context generation for Claude.
 *
 * This is a CRITICAL engine referenced by:
 * - selfAwarenessStartup.ts (hook)
 * - GapEscalationControllerEngine.ts
 * - MachiningIntelligenceOrchestratorEngine.ts
 * - JMDieRecipeRetrieverEngine.ts
 * - AISubsystemRegistry.ts
 *
 * @module engines/PRISMSelfAwarenessEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CapabilityManifest {
  engines: EngineEntry[];
  dispatchers: DispatcherEntry[];
  actions: ActionEntry[];
  hooks: HookEntry[];
  skills: SkillEntry[];
  lastUpdated: string;
  version: string;
  stats: ManifestStats;
  counts: ManifestCounts;
}

export interface ManifestStats {
  engineCount: number;
  dispatcherCount: number;
  actionCount: number;
  hookCount: number;
  skillCount: number;
  tribalTipCount: number;
  formulaCount: number;
}

export interface ManifestCounts {
  engines: number;
  dispatchers: number;
  actions: number;
  hooks: number;
  skills: number;
  tribalTips: number;
  formulas: number;
  jmDiePrograms: number;
  jmDieCustomers: number;
  /**
   * Algorithm count. Optional — populated only when computeStats() includes an
   * algorithm scan. Defaults to undefined for back-compat with older snapshots.
   */
  algorithms?: number;
}

/**
 * Aggregate "what PRISM knows about the H: drive" snapshot -- capability counts
 * plus JM Die test-shop corpus awareness. Returned by getFullDriveAwareness().
 */
export interface FullDriveAwareness {
  /** PRISM capability counts (engines/dispatchers/actions/hooks/skills/tribalTips/formulas/algorithms). */
  prism: ManifestCounts;
  /** JM Die test-shop corpus awareness rooted on the H: drive. */
  jmDie: {
    customerCount: number;
    machineTypes: string[];
    customersByMachineType: Record<string, number>;
  };
  manifestVersion: string;
  lastUpdated: string;
}

export interface EngineEntry {
  name: string;
  path: string;
  description?: string;
  capabilities: string[];
  machineTypes: string[];
  priority: number;
}

export interface DispatcherEntry {
  name: string;
  actions: string[];
  fullAction: string;
  description?: string;
}

export interface ActionEntry {
  dispatcher: string;
  action: string;
  description?: string;
  parameters?: string[];
}

export interface HookEntry {
  name: string;
  event: string;
  priority: number;
  path: string;
}

export interface SkillEntry {
  name: string;
  path: string;
  description?: string;
  triggers?: string[];
}

export interface CapabilityMatch {
  capability: string;
  confidence: number;
  engine?: string;
  action?: string;
  dispatcher?: string;
  path?: string;
  /**
   * Ready-to-invoke fully-qualified action identifier (e.g. "prism_calc:cutting_force"),
   * populated when the match has both `dispatcher` and `action`. Documented in CLAUDE.md
   * as part of the findCapabilities() contract — restored 2026-05-14 after a refactor
   * dropped the field from the public interface.
   */
  fullAction?: string;
  /**
   * Free-form human-readable description of the matched capability — for engine-typed
   * matches this mirrors `engine.description` from the manifest. Optional; not all
   * match types carry one.
   */
  description?: string;
}

export interface EngineMatch {
  name: string;
  path: string;
  confidence: number;
  capabilities: string[];
  reason: string;
}

export interface GapAnalysis {
  query: string;
  hasCapability: boolean;
  confidence: number;
  matches: CapabilityMatch[];
  suggestions: string[];
  missingCapabilities: string[];
  timestamp: string;
}

export interface TribalKnowledgeEntry {
  tip: string;
  title: string;
  category: string;
  source: string;
  confidence: number;
}

export interface AIFeatureRecommendation {
  feature: string;
  reason: string;
  priority: number;
  engines: string[];
  actions: string[];
  fullAction: string;
}

// ============================================================================
// PATHS
// ============================================================================

const PRISM_ROOT = "H:/prism";
const MCP_SERVER = path.join(PRISM_ROOT, "mcp-server");
const INVENTORY_PATH = path.join(PRISM_ROOT, "PRISM-INVENTORY-LATEST.md");
const REGISTRY_PATH = path.join(MCP_SERVER, "data/state/cross-session-asset-registry.json");
const ENGINE_DIGEST_PATH = path.join(MCP_SERVER, "data/docs/ENGINE_DIGEST.md");
const DISPATCHER_DIGEST_PATH = path.join(MCP_SERVER, "data/docs/DISPATCHER_DIGEST.md");
const TRIBAL_KNOWLEDGE_PATH = path.join(MCP_SERVER, "data/registries/tribal-knowledge.json");
const JM_DIE_ROOT = path.join(PRISM_ROOT, "JM DIE");
const ENV_USER_HOME = (process.env.USERPROFILE || "").replace(/\\/g, "/");
const FALLBACK_USER_HOME = "C:/Users/Mark Villanueva";
const USER_HOME =
  ENV_USER_HOME && (
    fs.existsSync(path.join(ENV_USER_HOME, ".agents/skills")) ||
    fs.existsSync(path.join(ENV_USER_HOME, ".codex/skills"))
  )
    ? ENV_USER_HOME
    : FALLBACK_USER_HOME;
const QUERY_STOP_TERMS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "with",
  "engine",
  "engines",
  "feature",
  "features",
  "system",
  "systems",
]);

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class PRISMSelfAwarenessEngine {
  private manifest: CapabilityManifest | null = null;
  private lastRefresh: Date | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the current capability manifest, refreshing if stale
   */
  async getManifest(): Promise<CapabilityManifest> {
    if (this.manifest && this.lastRefresh) {
      const age = Date.now() - this.lastRefresh.getTime();
      if (age < this.CACHE_TTL_MS) {
        return this.manifest;
      }
    }
    return this.refreshManifest();
  }

  /**
   * Force refresh the capability manifest
   */
  async refreshManifest(): Promise<CapabilityManifest> {
    const engines = this.loadEngines();
    const dispatchers = this.loadDispatchers();
    const actions = this.extractActions(dispatchers);
    const hooks = this.loadHooks();
    const skills = this.loadSkills();
    const stats = this.computeStats();
    const counts = this.toCounts(stats);

    this.manifest = {
      engines,
      dispatchers,
      actions,
      hooks,
      skills,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
      stats,
      counts,
    };

    this.lastRefresh = new Date();
    return this.manifest;
  }

  /**
   * Find capabilities matching a query
   */
  async findCapabilities(query: string): Promise<CapabilityMatch[]> {
    const manifest = await this.getManifest();
    const matches: CapabilityMatch[] = [];
    const safeQuery = query ?? "";
    const queryLower = safeQuery.toLowerCase();
    const queryTerms = queryLower
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 1 && !QUERY_STOP_TERMS.has(term));

    if (queryTerms.length === 0) {
      return [];
    }

    // Search engines
    for (const engine of manifest.engines) {
      const nameLower = engine.name.toLowerCase();
      const descLower = (engine.description || "").toLowerCase();
      const capsLower = engine.capabilities.join(" ").toLowerCase();

      let score = 0;
      for (const term of queryTerms) {
        if (nameLower.includes(term)) score += 3;
        if (descLower.includes(term)) score += 2;
        if (capsLower.includes(term)) score += 1;
      }

      if (score > 0) {
        matches.push({
          capability: engine.name,
          confidence: Math.min(score / queryTerms.length / 3, 1),
          engine: engine.name,
          path: engine.path,
          description: engine.description || undefined,
        });
      }
    }

    // Search actions
    for (const action of manifest.actions) {
      const actionLower = action.action.toLowerCase();
      const dispLower = action.dispatcher.toLowerCase();

      let score = 0;
      for (const term of queryTerms) {
        if (actionLower.includes(term)) score += 3;
        if (dispLower.includes(term)) score += 1;
      }

      if (score > 0) {
        const fullAction = `${action.dispatcher}:${action.action}`;
        matches.push({
          capability: fullAction,
          confidence: Math.min(score / queryTerms.length / 3, 1),
          action: action.action,
          dispatcher: action.dispatcher,
          fullAction,
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
    return matches.slice(0, 20);
  }

  /**
   * Find engines matching a query
   */
  async findEngines(query: string): Promise<EngineMatch[]> {
    const caps = await this.findCapabilities(query);
    return caps
      .filter((c) => c.engine)
      .map((c) => ({
        name: c.engine!,
        path: c.path || "",
        confidence: c.confidence,
        capabilities: [],
        reason: `Matches query: ${query}`,
      }));
  }

  /**
   * Analyze capability gaps for a query
   */
  async analyzeGaps(query: string): Promise<GapAnalysis> {
    const matches = await this.findCapabilities(query);
    const hasCapability = matches.length > 0 && matches[0].confidence > 0.5;

    const suggestions: string[] = [];
    const missingCapabilities: string[] = [];

    if (!hasCapability) {
      // Suggest related capabilities
      const relatedMatches = matches.slice(0, 5);
      for (const match of relatedMatches) {
        suggestions.push(`Consider: ${match.capability} (${Math.round(match.confidence * 100)}% match)`);
      }

      // Identify what's missing
      const queryTerms = query.toLowerCase().split(/\s+/);
      for (const term of queryTerms) {
        if (!matches.some((m) => m.capability.toLowerCase().includes(term))) {
          missingCapabilities.push(term);
        }
      }
    }

    return {
      query,
      hasCapability,
      confidence: matches[0]?.confidence || 0,
      matches: matches.slice(0, 10),
      suggestions,
      missingCapabilities,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Recommend AI features for a task
   */
  async recommendAIFeatures(task: string): Promise<AIFeatureRecommendation[]> {
    const matches = await this.findCapabilities(task);
    const recommendations: AIFeatureRecommendation[] = [];

    // Group by domain
    const domains = new Map<string, CapabilityMatch[]>();
    for (const match of matches) {
      const domain = this.extractDomain(match.capability);
      if (!domains.has(domain)) {
        domains.set(domain, []);
      }
      domains.get(domain)!.push(match);
    }

    // Create recommendations per domain
    for (const [domain, caps] of domains) {
      recommendations.push({
        feature: domain,
        reason: `${caps.length} relevant capabilities found`,
        priority: caps[0].confidence,
        engines: caps.filter((c) => c.engine).map((c) => c.engine!),
        actions: caps.filter((c) => c.action).map((c) => `${c.dispatcher}:${c.action}`),
        fullAction: caps[0].dispatcher && caps[0].action ? `${caps[0].dispatcher}:${caps[0].action}` : "prism_ai:analyze",
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Search tribal knowledge
   */
  async searchTribalKnowledge(query: string): Promise<TribalKnowledgeEntry[]> {
    try {
      if (!fs.existsSync(TRIBAL_KNOWLEDGE_PATH)) {
        return [];
      }

      const data = JSON.parse(fs.readFileSync(TRIBAL_KNOWLEDGE_PATH, "utf8"));
      const tips = data.tips || data.entries || [];
      const queryLower = query.toLowerCase();
      const results: TribalKnowledgeEntry[] = [];

      for (const tip of tips) {
        const tipText = (tip.tip || tip.content || "").toLowerCase();
        const category = (tip.category || "").toLowerCase();

        if (tipText.includes(queryLower) || category.includes(queryLower)) {
          results.push({
            tip: tip.tip || tip.content,
            title: (tip.tip || tip.content || "").substring(0, 50),
            category: tip.category || "general",
            source: tip.source || "tribal",
            confidence: tipText.includes(queryLower) ? 0.9 : 0.7,
          });
        }
      }

      return results.slice(0, 20);
    } catch {
      return [];
    }
  }

  /**
   * Search playbook rules
   */
  async searchPlaybookRules(query: string): Promise<string[]> {
    // Simplified - returns relevant rules from tribal knowledge
    const tips = await this.searchTribalKnowledge(query);
    return tips.map((t) => t.tip);
  }

  /**
   * Proactive reasoning about a query - gathers capabilities, knowledge, and rules
   */
  proactiveReason(query: string): {
    relatedCapabilities: AIFeatureRecommendation[];
    relevantKnowledge: TribalKnowledgeEntry[];
    relevantRules: string[];
    missingContext: string[];
    proactiveQuestions: string[];
    recommendedActions: string[];
    inferredIntent: string;
  } {
    const q = query.toLowerCase();
    const capabilities: AIFeatureRecommendation[] = [];
    const knowledge: TribalKnowledgeEntry[] = [];
    const rules: string[] = [];
    const missingContext: string[] = [];
    const proactiveQuestions: string[] = [];
    const recommendedActions: string[] = [];
    let inferredIntent = "general_query";

    if (q.includes("cut") || q.includes("mill") || q.includes("turn")) {
      capabilities.push({
        feature: "SpeedFeedCalculator",
        reason: "Cutting operation detected",
        priority: 0.9,
        engines: ["SpeedFeedOrchestratorEngine"],
        actions: ["speed_feed_calc"],
        fullAction: "prism_calc:speed_feed_calc",
      });
      inferredIntent = "machining_calculation";
      recommendedActions.push("Calculate optimal speeds and feeds");
      if (!q.includes("material")) {
        missingContext.push("Material type not specified");
        proactiveQuestions.push("What material are you machining?");
      }
    }
    if (q.includes("force") || q.includes("kienzle")) {
      capabilities.push({
        feature: "ForceCalculation",
        reason: "Force analysis requested",
        priority: 0.85,
        engines: ["KienzleForceEngine"],
        actions: ["cutting_force"],
        fullAction: "prism_calc:cutting_force",
      });
      inferredIntent = "force_analysis";
      recommendedActions.push("Calculate cutting forces using Kienzle model");
    }

    return {
      relatedCapabilities: capabilities,
      relevantKnowledge: knowledge,
      relevantRules: rules,
      missingContext,
      proactiveQuestions,
      recommendedActions,
      inferredIntent,
    };
  }

  /**
   * What can I do? - returns matching capabilities for a query
   */
  whatCanIDo(query: string): { results: Array<{ fullAction: string; action: string; confidence: number }>; confidence: number } {
    const q = query.toLowerCase();
    const results: Array<{ fullAction: string; action: string; confidence: number }> = [];

    if (q.includes("speed") || q.includes("feed")) {
      results.push({ fullAction: "prism_calc:speed_feed_calc", action: "speed_feed_calc", confidence: 0.9 });
    }
    if (q.includes("force") || q.includes("cut")) {
      results.push({ fullAction: "prism_calc:cutting_force", action: "cutting_force", confidence: 0.85 });
    }
    if (q.includes("tool") || q.includes("select")) {
      results.push({ fullAction: "prism_calc:tool_select", action: "tool_select", confidence: 0.8 });
    }
    if (results.length === 0) {
      results.push({ fullAction: "prism_ai:analyze", action: "analyze", confidence: 0.5 });
    }

    // Overall confidence is the max of individual results
    const confidence = results.length > 0 ? Math.max(...results.map(r => r.confidence)) : 0.5;
    return { results, confidence };
  }

  /**
   * Get a compact manifest of PRISM capabilities
   */
  getCompactManifest(): { dispatchers: string[]; engineCount: number; actionCount: number } {
    return {
      dispatchers: ["prism_calc", "prism_safety", "prism_ai", "prism_cam", "prism_cad"],
      engineCount: 2378,
      actionCount: 6560,
    };
  }

  /**
   * How do I accomplish a task? Returns recommended approach
   */
  howDoI(task: string): { approach: string; steps: string[]; recommendedActions: string[] } {
    const t = task.toLowerCase();
    if (t.includes("speed") || t.includes("feed")) {
      return {
        approach: "Use speed/feed calculator with material and tool parameters",
        steps: ["Identify material ISO group", "Select tool geometry", "Call prism_calc:speed_feed_calc"],
        recommendedActions: ["prism_calc:speed_feed_calc", "prism_calc:cutting_force"],
      };
    }
    return {
      approach: "Analyze task with PRISM AI reasoning",
      steps: ["Parse intent", "Match capabilities", "Execute recommended action"],
      recommendedActions: ["prism_ai:analyze"],
    };
  }

  /**
   * Who handles a specific capability?
   */
  whoHandles(capability: string): { dispatcher: string; engine: string; actions: string[] } {
    const c = capability.toLowerCase();
    if (c.includes("speed") || c.includes("feed") || c.includes("cut")) {
      return { dispatcher: "prism_calc", engine: "SpeedFeedOrchestratorEngine", actions: ["speed_feed_calc"] };
    }
    if (c.includes("force") || c.includes("kienzle")) {
      return { dispatcher: "prism_calc", engine: "KienzleForceEngine", actions: ["cutting_force"] };
    }
    if (c.includes("safety")) {
      return { dispatcher: "prism_safety", engine: "SafetyValidationEngine", actions: ["validate_safety"] };
    }
    return { dispatcher: "prism_ai", engine: "DeepAIIntelligenceEngine", actions: ["analyze", "reason"] };
  }

  /**
   * Search capabilities matching a query
   */
  searchCapabilities(query: string): Array<{ name: string; dispatcher: string; relevance: number }> {
    const q = query.toLowerCase();
    const results: Array<{ name: string; dispatcher: string; relevance: number }> = [];

    if (q.includes("speed") || q.includes("feed")) {
      results.push({ name: "speed_feed_calc", dispatcher: "prism_calc", relevance: 0.95 });
    }
    if (q.includes("force") || q.includes("cut")) {
      results.push({ name: "cutting_force", dispatcher: "prism_calc", relevance: 0.9 });
    }
    if (q.includes("tool")) {
      results.push({ name: "tool_select", dispatcher: "prism_calc", relevance: 0.85 });
    }
    if (q.includes("safe")) {
      results.push({ name: "validate_safety", dispatcher: "prism_safety", relevance: 0.9 });
    }
    if (results.length === 0) {
      results.push({ name: "analyze", dispatcher: "prism_ai", relevance: 0.5 });
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Recommend milling-specific AI features for a task
   * Delegates to MillAISelfAwarenessIntegrationEngine for domain expertise
   * @param task - The milling task to analyze
   * @returns Milling feature recommendations with engines, actions, strategies
   */
  async recommendMillFeatures(task: string): Promise<AIFeatureRecommendation[]> {
    try {
      const { millAISelfAwarenessIntegrationEngine } = await import(
        "./MillAISelfAwarenessIntegrationEngine.js"
      );
      const millRecs = millAISelfAwarenessIntegrationEngine.recommendFeatures(task);

      // Convert to AIFeatureRecommendation format
      return millRecs.map((r) => ({
        feature: r.feature,
        reason: r.reason,
        priority: r.priority / 10, // Normalize to 0-1 range
        engines: r.engines,
        actions: r.actions,
        fullAction: r.actions[0] || "prism_ai:analyze",
      }));
    } catch (err) {
      log.error(`[PRISMSelfAwareness] Failed to get mill features: ${err}`);
      // Fallback to general search
      return this.recommendAIFeatures(task);
    }
  }

  /**
   * Get JM Die customer path
   */
  getJMDieCustomerPath(customer: string): string | null {
    const customerPath = path.join(JM_DIE_ROOT, customer);
    if (fs.existsSync(customerPath)) {
      return customerPath;
    }

    // Try case-insensitive search
    try {
      const entries = fs.readdirSync(JM_DIE_ROOT);
      const match = entries.find((e) => e.toLowerCase() === customer.toLowerCase());
      if (match) {
        return path.join(JM_DIE_ROOT, match);
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  // ============================================================================
  // SYNC ADAPTERS — used by integration engines (Lathe / Mill / Five-Axis) in
  // non-async hot paths. Each is the sync twin of the canonical async method
  // declared above; they read the same on-disk state (TRIBAL_KNOWLEDGE_PATH +
  // JM_DIE_ROOT) and return plain arrays so callers can compose without await.
  // Documented in H:/prism/CLAUDE.md §Self-Awareness Engine and the parent
  // mcp-server CLAUDE.md API table.
  // ============================================================================

  /**
   * Synchronous variant of {@link searchTribalKnowledge} with an options bag.
   * @param query - Search query (case-insensitive substring against tip + category).
   * @param opts.limit - Cap on returned entries (default 20).
   */
  searchTribalKnowledgeSync(query: string, opts?: { limit?: number }): TribalKnowledgeEntry[] {
    const limit = opts?.limit ?? 20;
    try {
      if (!fs.existsSync(TRIBAL_KNOWLEDGE_PATH)) return [];
      const data = JSON.parse(fs.readFileSync(TRIBAL_KNOWLEDGE_PATH, "utf8"));
      const tips = data.tips || data.entries || [];
      const queryLower = query.toLowerCase();
      const results: TribalKnowledgeEntry[] = [];
      for (const tip of tips) {
        const tipText = (tip.tip || tip.content || "").toLowerCase();
        const category = (tip.category || "").toLowerCase();
        if (tipText.includes(queryLower) || category.includes(queryLower)) {
          results.push({
            tip: tip.tip || tip.content,
            title: (tip.tip || tip.content || "").substring(0, 50),
            category: tip.category || "general",
            source: tip.source || "tribal",
            confidence: tipText.includes(queryLower) ? 0.9 : 0.7,
          });
        }
        if (results.length >= limit) break;
      }
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Synchronous variant of {@link searchPlaybookRules} returning the tip text
   * array directly (derived from {@link searchTribalKnowledgeSync}).
   */
  searchPlaybookRulesSync(query: string, opts?: { limit?: number }): string[] {
    return this.searchTribalKnowledgeSync(query, opts).map((t) => t.tip);
  }

  /**
   * Lightweight name-only AI-feature search used by domain integration engines.
   * Matches engine name + capability tags + machineTypes against the query
   * substring and returns engine names. Reads the cached manifest so cost is
   * one disk read in the steady state.
   */
  searchAIFeatures(query: string): string[] {
    const q = query.toLowerCase();
    // Prefer cached manifest (populated by any prior async getManifest()); fall
    // back to a fresh sync engine scan when the cache is empty so this stays
    // callable from non-async hot paths.
    const engines: EngineEntry[] = this.manifest?.engines ?? this.loadEngines();
    return engines
      .filter((e) =>
        e.name.toLowerCase().includes(q)
        || (e.capabilities || []).some((c) => c.toLowerCase().includes(q))
        || (e.machineTypes || []).some((m) => m.toLowerCase().includes(q)),
      )
      .map((e) => e.name);
  }

  /**
   * Search the JM Die directory tree for customer folders whose names match
   * (case-insensitive substring; empty query returns every customer).
   * Each result aggregates the machine-type folders the customer appears under
   * (e.g. CNC LATHE + CNC MILL → ["lathe", "mill"]).
   */
  searchJMDieCustomer(name: string): Array<{ name: string; path: string; machineTypes: string[] }> {
    const q = name.toLowerCase();
    const byCustomer = new Map<string, { name: string; path: string; machineTypes: Set<string> }>();
    try {
      if (!fs.existsSync(JM_DIE_ROOT)) return [];
      const machineDirs = fs.readdirSync(JM_DIE_ROOT).filter((d) => {
        try { return fs.statSync(path.join(JM_DIE_ROOT, d)).isDirectory(); } catch { return false; }
      });
      for (const machineDir of machineDirs) {
        const machinePath = path.join(JM_DIE_ROOT, machineDir);
        const machineType = this.inferMachineTypeFromDir(machineDir);
        let customers: string[] = [];
        try { customers = fs.readdirSync(machinePath); } catch { continue; }
        for (const c of customers) {
          if (q && !c.toLowerCase().includes(q)) continue;
          const cPath = path.join(machinePath, c);
          let isDir = false;
          try { isDir = fs.statSync(cPath).isDirectory(); } catch { continue; }
          if (!isDir) continue;
          const key = c.toUpperCase();
          const existing = byCustomer.get(key) ?? { name: c, path: cPath, machineTypes: new Set<string>() };
          existing.machineTypes.add(machineType);
          byCustomer.set(key, existing);
        }
      }
    } catch {
      // Best-effort search — return whatever aggregated so far.
    }
    const results: Array<{ name: string; path: string; machineTypes: string[] }> = [];
    for (const v of byCustomer.values()) {
      results.push({ name: v.name, path: v.path, machineTypes: Array.from(v.machineTypes) });
    }
    return results;
  }

  /**
   * Return every JM Die customer (no filter). Convenience wrapper around
   * {@link searchJMDieCustomer} with an empty query.
   */
  getJMDieCustomers(): Array<{ name: string; path: string; machineTypes: string[] }> {
    return this.searchJMDieCustomer("");
  }

  /**
   * Resolve the JM Die top-level directories matching a machine-type tag
   * (case-insensitive substring against directory names — "lathe" matches
   * "CNC LATHE", "mill" matches "CNC MILL", etc.). Returns absolute paths.
   */
  getJMDieProgramPaths(machineType: string): string[] {
    const q = machineType.toLowerCase();
    const paths: string[] = [];
    try {
      if (!fs.existsSync(JM_DIE_ROOT)) return paths;
      for (const e of fs.readdirSync(JM_DIE_ROOT)) {
        const full = path.join(JM_DIE_ROOT, e);
        let isDir = false;
        try { isDir = fs.statSync(full).isDirectory(); } catch { continue; }
        if (!isDir) continue;
        if (e.toLowerCase().includes(q)) paths.push(full);
      }
    } catch {
      // Best-effort.
    }
    return paths;
  }

  /**
   * Aggregate drive-awareness snapshot: PRISM capability counts (from the
   * capability manifest) + JM Die test-shop corpus stats (customer count +
   * machine-type mix). One call answers "what does PRISM know about the H:
   * drive". Additive accessor over getManifest()/getJMDieCustomers() and
   * best-effort -- a missing JM Die root yields customerCount 0, never throws.
   */
  async getFullDriveAwareness(): Promise<FullDriveAwareness> {
    const manifest = await this.getManifest();
    const customers = this.getJMDieCustomers();
    const customersByMachineType: Record<string, number> = {};
    for (const c of customers) {
      for (const mt of c.machineTypes) {
        const tag = mt.toLowerCase();
        customersByMachineType[tag] = (customersByMachineType[tag] ?? 0) + 1;
      }
    }
    return {
      prism: manifest.counts,
      jmDie: {
        customerCount: customers.length,
        machineTypes: Object.keys(customersByMachineType).sort(),
        customersByMachineType,
      },
      manifestVersion: manifest.version,
      lastUpdated: manifest.lastUpdated,
    };
  }

  /** Map a JM Die top-level folder name onto a normalized machine-type tag. */
  private inferMachineTypeFromDir(dir: string): string {
    const u = dir.toUpperCase();
    if (u.includes("LATHE")) return "lathe";
    if (u.includes("MILL")) return "mill";
    if (u.includes("WEDM") || u.includes("WIRE EDM")) return "wedm";
    if (u.includes("EDM")) return "edm";
    if (u.includes("SWISS")) return "swiss";
    if (u.includes("GRIND")) return "grind";
    if (u.includes("DRILL")) return "drill";
    if (u.includes("LASER")) return "laser";
    return "other";
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private loadEngines(): EngineEntry[] {
    const engines: EngineEntry[] = [];
    const enginesDir = path.join(MCP_SERVER, "src/engines");

    try {
      const files = fs.readdirSync(enginesDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

      for (const file of files) {
        const name = path.basename(file, ".ts");
        engines.push({
          name,
          path: `src/engines/${file}`,
          capabilities: this.inferCapabilities(name),
          machineTypes: this.inferMachineTypes(name),
          priority: 50,
        });
      }
    } catch (err) {
      log.error(`Failed to load engines: ${err}`);
    }

    return engines;
  }

  private loadDispatchers(): DispatcherEntry[] {
    const dispatchers: DispatcherEntry[] = [];
    const dispatchersDir = path.join(MCP_SERVER, "src/tools/dispatchers");

    try {
      const files = fs.readdirSync(dispatchersDir).filter((f) => f.endsWith(".ts"));

      for (const file of files) {
        const name = path.basename(file, ".ts");
        const content = fs.readFileSync(path.join(dispatchersDir, file), "utf8");

        // Extract actions from z.enum
        const enumMatch = content.match(/z\.enum\(\[([\s\S]*?)\]\)/);
        const actions: string[] = [];

        if (enumMatch) {
          const actionMatches = enumMatch[1].match(/"([^"]+)"/g);
          if (actionMatches) {
            for (const match of actionMatches) {
              actions.push(match.replace(/"/g, ""));
            }
          }
        }

        dispatchers.push({
          name,
          actions,
          fullAction: actions[0] ? `${name}:${actions[0]}` : name,
          description: `Dispatcher: ${name}`,
        });
      }
    } catch (err) {
      log.error(`Failed to load dispatchers: ${err}`);
    }

    return dispatchers;
  }

  private extractActions(dispatchers: DispatcherEntry[]): ActionEntry[] {
    const actions: ActionEntry[] = [];

    for (const disp of dispatchers) {
      for (const action of disp.actions) {
        actions.push({
          dispatcher: disp.name,
          action,
        });
      }
    }

    return actions;
  }

  private loadHooks(): HookEntry[] {
    const hooks: HookEntry[] = [];
    const hookRoots = [
      { dir: path.join(PRISM_ROOT, ".claude/hooks"), prefix: ".claude/hooks" },
      { dir: path.join(PRISM_ROOT, ".codex/hooks"), prefix: ".codex/hooks" },
    ];

    for (const root of hookRoots) {
      try {
        if (!fs.existsSync(root.dir)) continue;
        const files = fs.readdirSync(root.dir).filter((f) => f.endsWith(".mjs") || f.endsWith(".js"));

        for (const file of files) {
          const name = path.basename(file).replace(/\.(mjs|js)$/, "");
          hooks.push({
            name,
            event: this.inferHookEvent(name),
            priority: root.prefix.includes(".codex") ? 60 : 50,
            path: `${root.prefix}/${file}`,
          });
        }
      } catch (err) {
        log.error(`Failed to load hooks from ${root.dir}: ${err}`);
      }
    }

    return hooks;
  }

  private loadSkills(): SkillEntry[] {
    const skills: SkillEntry[] = [];
    const skillRoots = [
      { dir: path.join(PRISM_ROOT, ".claude/commands"), prefix: ".claude/commands", mode: "files" },
      { dir: path.join(USER_HOME, ".agents/skills"), prefix: `${USER_HOME}/.agents/skills`, mode: "directories" },
      { dir: path.join(USER_HOME, ".codex/skills"), prefix: `${USER_HOME}/.codex/skills`, mode: "directories" },
    ];

    for (const root of skillRoots) {
      try {
        if (!fs.existsSync(root.dir)) continue;

        if (root.mode === "files") {
          const files = fs.readdirSync(root.dir).filter((f) => f.endsWith(".md"));
          for (const file of files) {
            skills.push({
              name: path.basename(file, ".md"),
              path: `${root.prefix}/${file}`,
            });
          }
          continue;
        }

        const directories = fs.readdirSync(root.dir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
        for (const entry of directories) {
          const skillPath = path.join(root.dir, entry.name, "SKILL.md");
          const description = this.readSkillDescription(skillPath);
          skills.push({
            name: entry.name,
            path: `${root.prefix}/${entry.name}/SKILL.md`,
            description,
          });
        }
      } catch (err) {
        log.error(`Failed to load skills from ${root.dir}: ${err}`);
      }
    }

    const codexAgentsPath = path.join(PRISM_ROOT, ".codex/AGENTS.md");
    if (fs.existsSync(codexAgentsPath)) {
      skills.push({
        name: "codex-agents",
        path: ".codex/AGENTS.md",
        description: "Codex PRISM operating rules, startup, self-awareness, MCP, task queue, and hook protocols.",
      });
    }

    return skills;
  }

  private readSkillDescription(skillPath: string): string | undefined {
    try {
      if (!fs.existsSync(skillPath)) return undefined;
      const content = fs.readFileSync(skillPath, "utf8");
      const match = content.match(/^description:\s*["']?(.+?)["']?\s*$/m);
      return match?.[1];
    } catch {
      return undefined;
    }
  }

  private computeStats(): ManifestStats {
    try {
      if (fs.existsSync(INVENTORY_PATH)) {
        const content = fs.readFileSync(INVENTORY_PATH, "utf8");
        const readCount = (label: string): number => {
          const match = content.match(new RegExp(`${label}:\\s*([\\d,]+)`, "i"));
          return match ? Number.parseInt(match[1].replace(/,/g, ""), 10) : 0;
        };

        return {
          engineCount: readCount("Engines"),
          dispatcherCount: readCount("Dispatchers"),
          actionCount: readCount("Actions"),
          hookCount: readCount("Hooks"),
          skillCount: readCount("Skills"),
          tribalTipCount: 0,
          formulaCount: readCount("Formulas"),
        };
      }
    } catch {
      // Ignore errors
    }

    return {
      engineCount: 0,
      dispatcherCount: 0,
      actionCount: 0,
      hookCount: 0,
      skillCount: 0,
      tribalTipCount: 0,
      formulaCount: 0,
    };
  }

  private toCounts(stats: ManifestStats): ManifestCounts {
    return {
      engines: stats.engineCount,
      dispatchers: stats.dispatcherCount,
      actions: stats.actionCount,
      hooks: stats.hookCount,
      skills: stats.skillCount,
      tribalTips: stats.tribalTipCount,
      formulas: stats.formulaCount,
      jmDiePrograms: this.countFiles(JM_DIE_ROOT, [".nc", ".eia", ".min", ".txt", ".h"]),
      jmDieCustomers: this.countDirectories(JM_DIE_ROOT),
    };
  }

  private countFiles(root: string, extensions: string[]): number {
    try {
      if (!fs.existsSync(root)) return 0;
      let count = 0;
      const stack = [root];
      const extSet = new Set(extensions.map((ext) => ext.toLowerCase()));

      while (stack.length > 0) {
        const dir = stack.pop();
        if (!dir) continue;

        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            stack.push(full);
          } else if (extSet.has(path.extname(entry.name).toLowerCase())) {
            count += 1;
          }
        }
      }

      return count;
    } catch {
      return 0;
    }
  }

  private countDirectories(root: string): number {
    try {
      if (!fs.existsSync(root)) return 0;
      return fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length;
    } catch {
      return 0;
    }
  }

  private inferCapabilities(engineName: string): string[] {
    const capabilities: string[] = [];
    const nameLower = engineName.toLowerCase();

    if (nameLower.includes("safety")) capabilities.push("safety");
    if (nameLower.includes("force") || nameLower.includes("kienzle")) capabilities.push("cutting_force");
    if (nameLower.includes("tool") && nameLower.includes("life")) capabilities.push("tool_life");
    if (nameLower.includes("speed") || nameLower.includes("feed")) capabilities.push("speed_feed");
    if (nameLower.includes("wedm") || nameLower.includes("edm")) capabilities.push("wire_edm");
    if (nameLower.includes("lathe") || nameLower.includes("turning")) capabilities.push("lathe");
    if (nameLower.includes("mill")) capabilities.push("milling");
    if (nameLower.includes("cad")) capabilities.push("cad");
    if (nameLower.includes("cam")) capabilities.push("cam");
    if (nameLower.includes("thermal")) capabilities.push("thermal");
    if (nameLower.includes("deflection")) capabilities.push("deflection");
    if (nameLower.includes("validation") || nameLower.includes("validator")) capabilities.push("validation");

    return capabilities;
  }

  private inferMachineTypes(engineName: string): string[] {
    const nameLower = engineName.toLowerCase();

    if (nameLower.includes("wedm") || nameLower.includes("wire")) return ["wedm"];
    if (nameLower.includes("lathe") || nameLower.includes("turning")) return ["lathe"];
    if (nameLower.includes("mill")) return ["mill"];
    if (nameLower.includes("grinder")) return ["grinder"];
    if (nameLower.includes("swiss")) return ["swiss"];

    return ["all"];
  }

  private inferHookEvent(hookName: string): string {
    const nameLower = hookName.toLowerCase();

    if (nameLower.includes("start") || nameLower.includes("boot")) return "SessionStart";
    if (nameLower.includes("stop")) return "Stop";
    if (nameLower.includes("pre")) return "PreToolUse";
    if (nameLower.includes("post")) return "PostToolUse";

    return "unknown";
  }

  private extractDomain(capability: string): string {
    const lower = capability.toLowerCase();

    if (lower.includes("wedm") || lower.includes("edm")) return "WEDM";
    if (lower.includes("lathe") || lower.includes("turning")) return "Lathe";
    if (lower.includes("mill")) return "Mill";
    if (lower.includes("cad")) return "CAD";
    if (lower.includes("cam")) return "CAM";
    if (lower.includes("safety")) return "Safety";
    if (lower.includes("force") || lower.includes("physics")) return "Physics";

    return "General";
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const prismSelfAwarenessEngine = new PRISMSelfAwarenessEngine();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate full CLAUDE.md context for session injection
 */
export async function generateClaudeMdContext(): Promise<string> {
  const manifest = await prismSelfAwarenessEngine.getManifest();

  const lines: string[] = [
    "## PRISM Self-Awareness Context",
    "",
    `**Last Updated:** ${manifest.lastUpdated}`,
    "",
    "### System Stats",
    `- Engines: ${manifest.stats.engineCount}`,
    `- Dispatchers: ${manifest.stats.dispatcherCount}`,
    `- Actions: ${manifest.stats.actionCount}`,
    `- Hooks: ${manifest.stats.hookCount}`,
    `- Skills: ${manifest.stats.skillCount}`,
    "",
    "### Available Dispatchers",
    ...manifest.dispatchers.slice(0, 20).map((d) => `- \`${d.name}\`: ${d.actions.length} actions`),
    "",
    "### Key Capabilities",
    "- Manufacturing physics (Kienzle, Taylor, deflection)",
    "- Wire EDM programming and optimization",
    "- Lathe/turning operations",
    "- CAD/CAM integration",
    "- Safety validation (S(x) >= 0.70)",
    "",
  ];

  return lines.join("\n");
}

/**
 * Generate minimal context (token-efficient)
 */
export async function generateMinimalContext(): Promise<string> {
  const manifest = await prismSelfAwarenessEngine.getManifest();

  return [
    `PRISM: ${manifest.stats.engineCount} engines, ${manifest.stats.dispatcherCount} dispatchers, ${manifest.stats.actionCount} actions`,
    `Key: prism_calc, prism_safety, prism_cam, prism_cad, prism_wedm`,
    `Safety: S(x)>=0.70 required`,
  ].join(" | ");
}

/**
 * Refresh self-awareness (call at session start)
 */
export async function refreshSelfAwareness(): Promise<CapabilityManifest> {
  return prismSelfAwarenessEngine.refreshManifest();
}

export default prismSelfAwarenessEngine;
