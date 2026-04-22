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

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class PRISMSelfAwarenessEngine {
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

    this.manifest = {
      engines,
      dispatchers,
      actions,
      hooks,
      skills,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
      stats,
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
    const queryTerms = queryLower.split(/\s+/);

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
        matches.push({
          capability: `${action.dispatcher}:${action.action}`,
          confidence: Math.min(score / queryTerms.length / 3, 1),
          action: action.action,
          dispatcher: action.dispatcher,
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
      log("error", `Failed to load engines: ${err}`);
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
          description: `Dispatcher: ${name}`,
        });
      }
    } catch (err) {
      log("error", `Failed to load dispatchers: ${err}`);
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
    const hooksDir = path.join(PRISM_ROOT, ".claude/hooks");

    try {
      if (fs.existsSync(hooksDir)) {
        const files = fs.readdirSync(hooksDir).filter((f) => f.endsWith(".mjs") || f.endsWith(".js"));

        for (const file of files) {
          const name = path.basename(file).replace(/\.(mjs|js)$/, "");
          hooks.push({
            name,
            event: this.inferHookEvent(name),
            priority: 50,
            path: `.claude/hooks/${file}`,
          });
        }
      }
    } catch (err) {
      log("error", `Failed to load hooks: ${err}`);
    }

    return hooks;
  }

  private loadSkills(): SkillEntry[] {
    const skills: SkillEntry[] = [];
    const skillsDir = path.join(PRISM_ROOT, ".claude/commands");

    try {
      if (fs.existsSync(skillsDir)) {
        const files = fs.readdirSync(skillsDir).filter((f) => f.endsWith(".md"));

        for (const file of files) {
          const name = path.basename(file, ".md");
          skills.push({
            name,
            path: `.claude/commands/${file}`,
          });
        }
      }
    } catch (err) {
      log("error", `Failed to load skills: ${err}`);
    }

    return skills;
  }

  private computeStats(): ManifestStats {
    try {
      if (fs.existsSync(INVENTORY_PATH)) {
        const content = fs.readFileSync(INVENTORY_PATH, "utf8");
        const engineMatch = content.match(/Engines:\s*(\d+)/i);
        const dispatcherMatch = content.match(/Dispatchers:\s*(\d+)/i);
        const actionMatch = content.match(/Actions:\s*(\d+)/i);
        const hookMatch = content.match(/Hooks:\s*(\d+)/i);
        const skillMatch = content.match(/Skills:\s*(\d+)/i);

        return {
          engineCount: engineMatch ? parseInt(engineMatch[1]) : 0,
          dispatcherCount: dispatcherMatch ? parseInt(dispatcherMatch[1]) : 0,
          actionCount: actionMatch ? parseInt(actionMatch[1]) : 0,
          hookCount: hookMatch ? parseInt(hookMatch[1]) : 0,
          skillCount: skillMatch ? parseInt(skillMatch[1]) : 0,
          tribalTipCount: 0,
          formulaCount: 0,
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
