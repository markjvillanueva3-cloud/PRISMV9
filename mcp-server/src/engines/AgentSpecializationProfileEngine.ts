/**
 * AgentSpecializationProfileEngine — AI-INTEG-MS5
 * ================================================
 * Defines and manages agent specialization profiles for the multi-agent
 * AI interface. Each profile specifies capabilities, knowledge domains,
 * tool access, and coordination patterns.
 *
 * Key Features:
 *   - Profile definition with capabilities and domains
 *   - Task-to-profile matching with scoring
 *   - Multi-agent team composition
 *   - Profile performance tracking
 *   - Dynamic profile adaptation
 *
 * Integration Points:
 *   - MultiAgentAIInterfaceEngine (session management)
 *   - ReasoningChainSharingEngine (knowledge sharing)
 *   - OpusCapabilityEngine (tier routing)
 *   - KnowledgeGraphNeuralBridgeEngine (semantic matching)
 *
 * @module engines/AgentSpecializationProfileEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { eventBus } from "./EventBus.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const PROFILES_PATH = path.join(process.cwd(), "data", "state", "agent-profiles.json");
const MAX_PROFILES = 100;
const DEFAULT_CAPABILITY_WEIGHT = 1.0;

// ============================================================================
// TYPES
// ============================================================================

/** Agent family type */
export type AgentFamily = "claude" | "codex" | "gemini" | "gpt" | "custom";

/** Model tier for the agent */
export type ProfileModelTier = "haiku" | "sonnet" | "opus";

/** Knowledge domain */
export type KnowledgeDomain =
  | "machining"
  | "materials"
  | "tooling"
  | "fixtures"
  | "quality"
  | "safety"
  | "scheduling"
  | "quoting"
  | "cam"
  | "cad"
  | "gcode"
  | "physics"
  | "tribal"
  | "business"
  | "general";

/** Agent capability */
export type AgentCapability =
  | "speed_feed_optimization"
  | "tool_selection"
  | "operation_sequencing"
  | "toolpath_strategy"
  | "physics_validation"
  | "safety_checking"
  | "cost_estimation"
  | "feasibility_analysis"
  | "error_resolution"
  | "knowledge_extraction"
  | "natural_language"
  | "code_generation"
  | "deep_reasoning"
  | "hypothesis_generation"
  | "pattern_recognition";

/** Coordination pattern */
export type CoordinationPattern =
  | "independent"      // Works alone
  | "collaborative"    // Shares work with peers
  | "supervisory"      // Oversees other agents
  | "specialist"       // Called for specific tasks
  | "validator";       // Reviews other agents' work

/** Capability definition with weight */
export interface CapabilityDefinition {
  capability: AgentCapability;
  weight: number;        // 0-1, how strong this capability is
  requires_tier?: ProfileModelTier; // Minimum tier for this capability
}

/** Agent specialization profile */
export interface AgentProfile {
  profile_id: string;
  name: string;
  description: string;
  family: AgentFamily;
  preferred_tier: ProfileModelTier;
  capabilities: CapabilityDefinition[];
  domains: KnowledgeDomain[];
  coordination_pattern: CoordinationPattern;
  tool_access: string[];           // Dispatcher actions allowed
  max_concurrent_tasks: number;
  token_budget_default: number;
  created_at: string;
  updated_at: string;
  performance: ProfilePerformance;
  metadata: Record<string, unknown>;
}

/** Profile performance metrics */
export interface ProfilePerformance {
  tasks_completed: number;
  tasks_failed: number;
  avg_completion_time_ms: number;
  avg_confidence: number;
  success_rate: number;
  last_used: string | null;
}

/** Task requirements for matching */
export interface TaskRequirements {
  task_id?: string;
  description: string;
  required_capabilities: AgentCapability[];
  preferred_domains?: KnowledgeDomain[];
  complexity?: "low" | "medium" | "high";
  urgency?: "low" | "normal" | "high";
  requires_validation?: boolean;
  max_cost?: number;
}

/** Profile match result */
export interface ProfileMatch {
  profile: AgentProfile;
  score: number;
  capability_coverage: number;
  domain_relevance: number;
  tier_fit: number;
  reasons: string[];
}

/** Team composition */
export interface TeamComposition {
  team_id: string;
  task_description: string;
  members: TeamMember[];
  coordination_strategy: string;
  estimated_completion_ms: number;
  created_at: string;
}

/** Team member assignment */
export interface TeamMember {
  profile_id: string;
  role: "lead" | "specialist" | "validator" | "support";
  assigned_capabilities: AgentCapability[];
  token_allocation: number;
}

/** Profile statistics */
export interface ProfileStats {
  total_profiles: number;
  profiles_by_family: Record<AgentFamily, number>;
  profiles_by_tier: Record<ProfileModelTier, number>;
  profiles_by_pattern: Record<CoordinationPattern, number>;
  total_tasks_completed: number;
  avg_success_rate: number;
  most_used_profiles: Array<{ profile_id: string; usage_count: number }>;
}

// ============================================================================
// BUILT-IN PROFILES
// ============================================================================

const BUILT_IN_PROFILES: Omit<AgentProfile, "created_at" | "updated_at" | "performance">[] = [
  {
    profile_id: "cam-expert",
    name: "CAM Expert",
    description: "Specializes in CAM programming, toolpath strategies, and G-code optimization",
    family: "claude",
    preferred_tier: "sonnet",
    capabilities: [
      { capability: "toolpath_strategy", weight: 1.0 },
      { capability: "operation_sequencing", weight: 0.9 },
      { capability: "code_generation", weight: 0.8 },
      { capability: "speed_feed_optimization", weight: 0.7 },
    ],
    domains: ["cam", "gcode", "tooling", "machining"],
    coordination_pattern: "specialist",
    tool_access: ["prism_cam", "prism_toolpath", "prism_calc"],
    max_concurrent_tasks: 3,
    token_budget_default: 50000,
    metadata: { specialty: "multi-axis" },
  },
  {
    profile_id: "physics-validator",
    name: "Physics Validator",
    description: "Validates cutting forces, power requirements, and thermal calculations",
    family: "claude",
    preferred_tier: "opus",
    capabilities: [
      { capability: "physics_validation", weight: 1.0, requires_tier: "opus" },
      { capability: "safety_checking", weight: 0.9 },
      { capability: "deep_reasoning", weight: 0.8, requires_tier: "opus" },
    ],
    domains: ["physics", "safety", "materials"],
    coordination_pattern: "validator",
    tool_access: ["prism_calc", "prism_safety", "prism_validate"],
    max_concurrent_tasks: 2,
    token_budget_default: 100000,
    metadata: { focus: "force_thermal" },
  },
  {
    profile_id: "tribal-knowledge-specialist",
    name: "Tribal Knowledge Specialist",
    description: "Extracts, validates, and applies shop floor tribal knowledge",
    family: "claude",
    preferred_tier: "sonnet",
    capabilities: [
      { capability: "knowledge_extraction", weight: 1.0 },
      { capability: "pattern_recognition", weight: 0.9 },
      { capability: "natural_language", weight: 0.8 },
    ],
    domains: ["tribal", "machining", "quality"],
    coordination_pattern: "collaborative",
    tool_access: ["prism_knowledge", "prism_ai", "prism_quality"],
    max_concurrent_tasks: 4,
    token_budget_default: 40000,
    metadata: { source: "shop_floor" },
  },
  {
    profile_id: "tool-selector",
    name: "Tool Selection Expert",
    description: "Selects optimal cutting tools based on material, operation, and constraints",
    family: "claude",
    preferred_tier: "sonnet",
    capabilities: [
      { capability: "tool_selection", weight: 1.0 },
      { capability: "speed_feed_optimization", weight: 0.9 },
      { capability: "cost_estimation", weight: 0.6 },
    ],
    domains: ["tooling", "materials", "machining"],
    coordination_pattern: "specialist",
    tool_access: ["prism_calc", "prism_knowledge", "prism_data"],
    max_concurrent_tasks: 5,
    token_budget_default: 30000,
    metadata: { inventory_aware: true },
  },
  {
    profile_id: "quote-optimizer",
    name: "Quote Optimization Specialist",
    description: "Optimizes manufacturing quotes for profitability and competitiveness",
    family: "claude",
    preferred_tier: "sonnet",
    capabilities: [
      { capability: "cost_estimation", weight: 1.0 },
      { capability: "feasibility_analysis", weight: 0.8 },
      { capability: "deep_reasoning", weight: 0.7 },
    ],
    domains: ["quoting", "business", "scheduling"],
    coordination_pattern: "independent",
    tool_access: ["prism_business", "prism_scheduling", "prism_calc"],
    max_concurrent_tasks: 3,
    token_budget_default: 40000,
    metadata: { margin_aware: true },
  },
  {
    profile_id: "error-resolver",
    name: "Error Resolution Specialist",
    description: "Diagnoses and resolves machining errors, alarms, and quality issues",
    family: "claude",
    preferred_tier: "sonnet",
    capabilities: [
      { capability: "error_resolution", weight: 1.0 },
      { capability: "hypothesis_generation", weight: 0.9 },
      { capability: "pattern_recognition", weight: 0.8 },
    ],
    domains: ["machining", "quality", "safety"],
    coordination_pattern: "specialist",
    tool_access: ["prism_diagnosis", "prism_quality", "prism_knowledge"],
    max_concurrent_tasks: 2,
    token_budget_default: 50000,
    metadata: { real_time: true },
  },
  {
    profile_id: "deep-reasoner",
    name: "Deep Reasoning Agent",
    description: "Handles complex multi-step reasoning, formula derivation, and synthesis",
    family: "claude",
    preferred_tier: "opus",
    capabilities: [
      { capability: "deep_reasoning", weight: 1.0, requires_tier: "opus" },
      { capability: "hypothesis_generation", weight: 0.9, requires_tier: "opus" },
      { capability: "physics_validation", weight: 0.8, requires_tier: "opus" },
      { capability: "natural_language", weight: 0.7 },
    ],
    domains: ["physics", "general", "machining"],
    coordination_pattern: "supervisory",
    tool_access: ["prism_ai", "prism_calc", "prism_knowledge"],
    max_concurrent_tasks: 1,
    token_budget_default: 200000,
    metadata: { opus_only: true },
  },
  {
    profile_id: "quick-responder",
    name: "Quick Response Agent",
    description: "Fast responses for simple queries, lookups, and status checks",
    family: "claude",
    preferred_tier: "haiku",
    capabilities: [
      { capability: "natural_language", weight: 1.0 },
      { capability: "pattern_recognition", weight: 0.6 },
    ],
    domains: ["general"],
    coordination_pattern: "independent",
    tool_access: ["prism_data", "prism_knowledge"],
    max_concurrent_tasks: 10,
    token_budget_default: 10000,
    metadata: { low_latency: true },
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class AgentSpecializationProfileEngine {
  private profiles: Map<string, AgentProfile> = new Map();
  private teams: Map<string, TeamComposition> = new Map();
  private taskHistory: Array<{ task_id: string; profile_id: string; success: boolean; duration_ms: number }> = [];

  constructor() {
    this.loadProfiles();
    this.ensureBuiltInProfiles();
  }

  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================

  /**
   * Register a new agent profile.
   */
  registerProfile(
    profile: Omit<AgentProfile, "profile_id" | "created_at" | "updated_at" | "performance">
  ): AgentProfile {
    const profile_id = this.generateProfileId(profile.name);

    if (this.profiles.has(profile_id)) {
      throw new Error(`Profile with ID ${profile_id} already exists`);
    }

    if (this.profiles.size >= MAX_PROFILES) {
      throw new Error(`Maximum profile limit (${MAX_PROFILES}) reached`);
    }

    const now = new Date().toISOString();
    const newProfile: AgentProfile = {
      ...profile,
      profile_id,
      created_at: now,
      updated_at: now,
      performance: {
        tasks_completed: 0,
        tasks_failed: 0,
        avg_completion_time_ms: 0,
        avg_confidence: 0,
        success_rate: 1.0,
        last_used: null,
      },
    };

    this.profiles.set(profile_id, newProfile);
    this.persistProfiles();

    eventBus.publish("agent_profiles", "profile_registered", {
      profile_id,
      name: profile.name,
    } as Record<string, unknown>);

    log.info(`[AgentProfiles] Registered profile: ${profile.name} (${profile_id})`);
    return newProfile;
  }

  /**
   * Update an existing profile.
   */
  updateProfile(
    profile_id: string,
    updates: Partial<Omit<AgentProfile, "profile_id" | "created_at" | "performance">>
  ): AgentProfile | null {
    const profile = this.profiles.get(profile_id);
    if (!profile) return null;

    const updatedProfile: AgentProfile = {
      ...profile,
      ...updates,
      profile_id, // Can't change ID
      created_at: profile.created_at, // Can't change creation time
      performance: profile.performance, // Performance tracked separately
      updated_at: new Date().toISOString(),
    };

    this.profiles.set(profile_id, updatedProfile);
    this.persistProfiles();

    return updatedProfile;
  }

  /**
   * Get a profile by ID.
   */
  getProfile(profile_id: string): AgentProfile | null {
    return this.profiles.get(profile_id) ?? null;
  }

  /**
   * List all profiles with optional filters.
   */
  listProfiles(filters?: {
    family?: AgentFamily;
    tier?: ProfileModelTier;
    domain?: KnowledgeDomain;
    capability?: AgentCapability;
    pattern?: CoordinationPattern;
  }): AgentProfile[] {
    let profiles = Array.from(this.profiles.values());

    if (filters) {
      if (filters.family) {
        profiles = profiles.filter(p => p.family === filters.family);
      }
      if (filters.tier) {
        profiles = profiles.filter(p => p.preferred_tier === filters.tier);
      }
      if (filters.domain) {
        profiles = profiles.filter(p => p.domains.includes(filters.domain!));
      }
      if (filters.capability) {
        profiles = profiles.filter(p =>
          p.capabilities.some(c => c.capability === filters.capability)
        );
      }
      if (filters.pattern) {
        profiles = profiles.filter(p => p.coordination_pattern === filters.pattern);
      }
    }

    return profiles;
  }

  /**
   * Remove a profile.
   */
  removeProfile(profile_id: string): boolean {
    if (!this.profiles.has(profile_id)) return false;

    // Don't allow removing built-in profiles
    const builtInIds = BUILT_IN_PROFILES.map(p => p.profile_id);
    if (builtInIds.includes(profile_id)) {
      throw new Error(`Cannot remove built-in profile: ${profile_id}`);
    }

    this.profiles.delete(profile_id);
    this.persistProfiles();

    return true;
  }

  // ==========================================================================
  // PROFILE MATCHING
  // ==========================================================================

  /**
   * Match task requirements to best-fit profiles.
   */
  matchProfiles(requirements: TaskRequirements, limit: number = 5): ProfileMatch[] {
    const matches: ProfileMatch[] = [];

    for (const profile of this.profiles.values()) {
      const match = this.scoreProfileMatch(profile, requirements);
      if (match.score > 0) {
        matches.push(match);
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit);
  }

  /**
   * Get the best profile for a task.
   */
  getBestProfile(requirements: TaskRequirements): ProfileMatch | null {
    const matches = this.matchProfiles(requirements, 1);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Score a profile against task requirements.
   */
  private scoreProfileMatch(profile: AgentProfile, requirements: TaskRequirements): ProfileMatch {
    const reasons: string[] = [];

    // Capability coverage (0-1)
    let capabilityCoverage = 0;
    const profileCapabilities = new Set(profile.capabilities.map(c => c.capability));

    for (const required of requirements.required_capabilities) {
      if (profileCapabilities.has(required)) {
        const capDef = profile.capabilities.find(c => c.capability === required);
        capabilityCoverage += capDef?.weight ?? DEFAULT_CAPABILITY_WEIGHT;
        reasons.push(`Has ${required} (weight: ${capDef?.weight ?? 1})`);
      }
    }
    capabilityCoverage = requirements.required_capabilities.length > 0
      ? capabilityCoverage / requirements.required_capabilities.length
      : 0.5;

    // Domain relevance (0-1)
    let domainRelevance = 0.5; // Default if no preferred domains
    if (requirements.preferred_domains && requirements.preferred_domains.length > 0) {
      const matchedDomains = requirements.preferred_domains.filter(d =>
        profile.domains.includes(d)
      );
      domainRelevance = matchedDomains.length / requirements.preferred_domains.length;
      if (matchedDomains.length > 0) {
        reasons.push(`Domains: ${matchedDomains.join(", ")}`);
      }
    }

    // Tier fit (0-1)
    let tierFit = 0.7; // Default
    if (requirements.complexity) {
      const tierMap: Record<string, ProfileModelTier[]> = {
        low: ["haiku", "sonnet", "opus"],
        medium: ["sonnet", "opus"],
        high: ["opus"],
      };
      const appropriateTiers = tierMap[requirements.complexity];
      if (appropriateTiers.includes(profile.preferred_tier)) {
        tierFit = 1.0;
        reasons.push(`Tier ${profile.preferred_tier} fits ${requirements.complexity} complexity`);
      } else {
        tierFit = 0.3;
      }
    }

    // Urgency adjustment
    let urgencyBonus = 0;
    if (requirements.urgency === "high" && profile.preferred_tier === "haiku") {
      urgencyBonus = 0.1;
      reasons.push("Fast response for urgent task");
    }

    // Validation requirement
    if (requirements.requires_validation && profile.coordination_pattern === "validator") {
      urgencyBonus += 0.15;
      reasons.push("Validator profile for validation task");
    }

    // Performance bonus
    const performanceBonus = profile.performance.success_rate * 0.1;

    // Calculate final score
    const score = Math.min(1.0,
      (capabilityCoverage * 0.5) +
      (domainRelevance * 0.25) +
      (tierFit * 0.15) +
      urgencyBonus +
      performanceBonus
    );

    return {
      profile,
      score,
      capability_coverage: capabilityCoverage,
      domain_relevance: domainRelevance,
      tier_fit: tierFit,
      reasons,
    };
  }

  // ==========================================================================
  // TEAM COMPOSITION
  // ==========================================================================

  /**
   * Compose a team for a complex task.
   */
  composeTeam(
    task_description: string,
    requirements: TaskRequirements[],
    max_members: number = 4
  ): TeamComposition {
    const team_id = `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const members: TeamMember[] = [];
    const usedProfiles = new Set<string>();

    // Find lead (highest overall match across all requirements)
    const allCapabilities = new Set<AgentCapability>();
    for (const req of requirements) {
      req.required_capabilities.forEach(c => allCapabilities.add(c));
    }

    const leadReq: TaskRequirements = {
      description: "Team lead",
      required_capabilities: Array.from(allCapabilities).slice(0, 3),
      complexity: "high",
    };

    const leadMatch = this.getBestProfile(leadReq);
    if (leadMatch) {
      members.push({
        profile_id: leadMatch.profile.profile_id,
        role: "lead",
        assigned_capabilities: leadReq.required_capabilities,
        token_allocation: leadMatch.profile.token_budget_default * 1.5,
      });
      usedProfiles.add(leadMatch.profile.profile_id);
    }

    // Find specialists for each requirement
    for (const req of requirements) {
      if (members.length >= max_members) break;

      const matches = this.matchProfiles(req, 3);
      for (const match of matches) {
        if (!usedProfiles.has(match.profile.profile_id) && members.length < max_members) {
          members.push({
            profile_id: match.profile.profile_id,
            role: "specialist",
            assigned_capabilities: req.required_capabilities,
            token_allocation: match.profile.token_budget_default,
          });
          usedProfiles.add(match.profile.profile_id);
          break;
        }
      }
    }

    // Add validator if needed
    const needsValidator = requirements.some(r => r.requires_validation);
    if (needsValidator && members.length < max_members) {
      const validators = this.listProfiles({ pattern: "validator" });
      for (const v of validators) {
        if (!usedProfiles.has(v.profile_id)) {
          members.push({
            profile_id: v.profile_id,
            role: "validator",
            assigned_capabilities: ["physics_validation", "safety_checking"],
            token_allocation: v.token_budget_default,
          });
          break;
        }
      }
    }

    // Determine coordination strategy
    let coordination_strategy = "parallel_independent";
    if (members.some(m => m.role === "lead")) {
      coordination_strategy = "hierarchical_lead";
    }
    if (members.some(m => m.role === "validator")) {
      coordination_strategy += "_with_validation";
    }

    // Estimate completion time
    const estimated_completion_ms = this.estimateTeamCompletionTime(members, requirements);

    const team: TeamComposition = {
      team_id,
      task_description,
      members,
      coordination_strategy,
      estimated_completion_ms,
      created_at: new Date().toISOString(),
    };

    this.teams.set(team_id, team);

    eventBus.publish("agent_profiles", "team_composed", {
      team_id,
      member_count: members.length,
      strategy: coordination_strategy,
    } as Record<string, unknown>);

    log.info(`[AgentProfiles] Composed team ${team_id} with ${members.length} members`);
    return team;
  }

  /**
   * Get a team by ID.
   */
  getTeam(team_id: string): TeamComposition | null {
    return this.teams.get(team_id) ?? null;
  }

  /**
   * Estimate completion time for a team.
   */
  private estimateTeamCompletionTime(members: TeamMember[], requirements: TaskRequirements[]): number {
    // Base time per requirement
    const baseTimePerReq = 5000; // 5 seconds

    // Complexity multiplier
    const complexityMultipliers = requirements.map(r => {
      switch (r.complexity) {
        case "low": return 0.5;
        case "medium": return 1.0;
        case "high": return 2.0;
        default: return 1.0;
      }
    });

    const avgComplexity = complexityMultipliers.reduce((a, b) => a + b, 0) / complexityMultipliers.length;

    // Parallelism factor
    const parallelismFactor = Math.max(1, members.length - 1); // More members = faster

    // Validation overhead
    const validationOverhead = members.some(m => m.role === "validator") ? 1.3 : 1.0;

    return Math.round(
      (baseTimePerReq * requirements.length * avgComplexity * validationOverhead) / parallelismFactor
    );
  }

  // ==========================================================================
  // PERFORMANCE TRACKING
  // ==========================================================================

  /**
   * Record task completion for a profile.
   */
  recordTaskCompletion(
    profile_id: string,
    task_id: string,
    success: boolean,
    duration_ms: number,
    confidence?: number
  ): void {
    const profile = this.profiles.get(profile_id);
    if (!profile) return;

    // Update performance metrics
    const perf = profile.performance;
    const totalTasks = perf.tasks_completed + perf.tasks_failed;

    if (success) {
      perf.tasks_completed++;
    } else {
      perf.tasks_failed++;
    }

    // Update average completion time (rolling average)
    perf.avg_completion_time_ms = totalTasks > 0
      ? (perf.avg_completion_time_ms * totalTasks + duration_ms) / (totalTasks + 1)
      : duration_ms;

    // Update average confidence
    if (confidence !== undefined) {
      perf.avg_confidence = totalTasks > 0
        ? (perf.avg_confidence * totalTasks + confidence) / (totalTasks + 1)
        : confidence;
    }

    // Update success rate
    const newTotal = perf.tasks_completed + perf.tasks_failed;
    perf.success_rate = newTotal > 0 ? perf.tasks_completed / newTotal : 1.0;

    perf.last_used = new Date().toISOString();

    // Track in history
    this.taskHistory.push({ task_id, profile_id, success, duration_ms });
    if (this.taskHistory.length > 1000) {
      this.taskHistory = this.taskHistory.slice(-500);
    }

    this.persistProfiles();
  }

  /**
   * Get profile performance.
   */
  getProfilePerformance(profile_id: string): ProfilePerformance | null {
    return this.profiles.get(profile_id)?.performance ?? null;
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get overall profile statistics.
   */
  getStats(): ProfileStats {
    const profiles = Array.from(this.profiles.values());

    const byFamily: Record<AgentFamily, number> = {
      claude: 0, codex: 0, gemini: 0, gpt: 0, custom: 0,
    };
    const byTier: Record<ProfileModelTier, number> = {
      haiku: 0, sonnet: 0, opus: 0,
    };
    const byPattern: Record<CoordinationPattern, number> = {
      independent: 0, collaborative: 0, supervisory: 0, specialist: 0, validator: 0,
    };

    let totalTasksCompleted = 0;
    let totalSuccessRate = 0;
    const usageCounts: Map<string, number> = new Map();

    for (const profile of profiles) {
      byFamily[profile.family]++;
      byTier[profile.preferred_tier]++;
      byPattern[profile.coordination_pattern]++;

      totalTasksCompleted += profile.performance.tasks_completed;
      totalSuccessRate += profile.performance.success_rate;

      usageCounts.set(profile.profile_id, profile.performance.tasks_completed);
    }

    // Sort by usage
    const mostUsed = Array.from(usageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([profile_id, usage_count]) => ({ profile_id, usage_count }));

    return {
      total_profiles: profiles.length,
      profiles_by_family: byFamily,
      profiles_by_tier: byTier,
      profiles_by_pattern: byPattern,
      total_tasks_completed: totalTasksCompleted,
      avg_success_rate: profiles.length > 0 ? totalSuccessRate / profiles.length : 0,
      most_used_profiles: mostUsed,
    };
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private loadProfiles(): void {
    try {
      if (fs.existsSync(PROFILES_PATH)) {
        const data = JSON.parse(fs.readFileSync(PROFILES_PATH, "utf-8"));
        for (const profile of data.profiles || []) {
          this.profiles.set(profile.profile_id, profile);
        }
        log.info(`[AgentProfiles] Loaded ${this.profiles.size} profiles`);
      }
    } catch (error: any) {
      log.warn(`[AgentProfiles] Failed to load profiles: ${error.message}`);
    }
  }

  private persistProfiles(): void {
    try {
      const data = {
        version: "1.0.0",
        updated_at: new Date().toISOString(),
        profiles: Array.from(this.profiles.values()),
      };
      safeWriteSync(PROFILES_PATH, JSON.stringify(data, null, 2));
    } catch (error: any) {
      log.warn(`[AgentProfiles] Failed to persist profiles: ${error.message}`);
    }
  }

  private ensureBuiltInProfiles(): void {
    const now = new Date().toISOString();

    for (const builtin of BUILT_IN_PROFILES) {
      if (!this.profiles.has(builtin.profile_id)) {
        const profile: AgentProfile = {
          ...builtin,
          created_at: now,
          updated_at: now,
          performance: {
            tasks_completed: 0,
            tasks_failed: 0,
            avg_completion_time_ms: 0,
            avg_confidence: 0,
            success_rate: 1.0,
            last_used: null,
          },
        };
        this.profiles.set(profile.profile_id, profile);
      }
    }

    this.persistProfiles();
  }

  private generateProfileId(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const hash = createHash("md5").update(name + Date.now()).digest("hex").slice(0, 6);
    return `${base}-${hash}`;
  }

  /**
   * Clear all non-built-in profiles.
   */
  clearCustomProfiles(): number {
    const builtInIds = new Set(BUILT_IN_PROFILES.map(p => p.profile_id));
    let removed = 0;

    for (const [id] of this.profiles) {
      if (!builtInIds.has(id)) {
        this.profiles.delete(id);
        removed++;
      }
    }

    this.persistProfiles();
    return removed;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const agentSpecializationProfileEngine = new AgentSpecializationProfileEngine();
