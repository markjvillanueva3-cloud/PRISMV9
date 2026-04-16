/**
 * ReasoningChainSharingEngine — AI-INTEG-MS1
 * ==========================================
 * Enables agents to share reasoning chains so discoveries by one agent
 * benefit all. Integrates with:
 *   - ChainOfThoughtEngine (explicit reasoning steps)
 *   - MultiAgentAIInterfaceEngine (cross-agent coordination)
 *   - TribalKnowledgeEngine (converting insights to tips)
 *   - EventBus (real-time chain propagation)
 *
 * Key Features:
 *   - Cross-agent chain sharing with confidence aggregation
 *   - Duplicate chain detection via intent hashing
 *   - Reasoning chain persistence for cross-session memory
 *   - Automatic tribal knowledge extraction from chains
 *   - Chain provenance tracking for audit
 *
 * @module engines/ReasoningChainSharingEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { eventBus } from "./EventBus.js";
import type { ReasoningChain, FinalAnswer } from "./ChainOfThoughtEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const CHAIN_STORAGE_PATH = path.join(process.cwd(), "data", "state", "reasoning-chains.json");
const MAX_CACHED_CHAINS = 1000;
const CHAIN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_CONFIDENCE_FOR_SHARING = 0.6;
const TRIBAL_EXTRACTION_THRESHOLD = 0.85;

// ============================================================================
// TYPES
// ============================================================================

/** Shared reasoning chain with provenance */
export interface SharedReasoningChain {
  /** Unique chain identifier */
  chain_id: string;
  /** Hash of the original problem for deduplication */
  problem_hash: string;
  /** Original problem statement */
  problem: string;
  /** Goal of the reasoning */
  goal: string;
  /** Agent that created this chain */
  created_by: string;
  /** When the chain was created */
  created_at: string;
  /** When the chain was last accessed */
  last_accessed: string;
  /** Final answer if completed */
  final_answer?: FinalAnswer;
  /** Overall confidence in the chain */
  confidence: number;
  /** How many agents have used this chain */
  usage_count: number;
  /** Agents this has been shared with */
  shared_with: string[];
  /** Whether this has been converted to tribal knowledge */
  converted_to_tribal: boolean;
  /** Tribal knowledge tip ID if converted */
  tribal_tip_id?: string;
  /** Aggregated confidence from multiple agent validations */
  aggregated_confidence: number;
  /** Number of agents that validated this chain */
  validation_count: number;
  /** Key insights extracted from the chain */
  key_insights: string[];
  /** Tags for searchability */
  tags: string[];
  /** Domain (speed_feed, tooling, physics, etc.) */
  domain?: string;
  /** Time to complete (ms) */
  duration_ms: number;
  /** Number of reasoning steps */
  step_count: number;
  /** Number of backtrack attempts */
  backtrack_count: number;
}

/** Chain sharing event */
export interface ChainShareEvent {
  chain_id: string;
  from_agent: string;
  to_agents: string[];
  timestamp: string;
  summary: string;
}

/** Chain validation */
export interface ChainValidation {
  chain_id: string;
  validator_agent: string;
  timestamp: string;
  confidence_assessment: number;
  agrees_with_conclusion: boolean;
  additional_insights?: string[];
  corrections?: string[];
}

/** Chain query parameters */
export interface ChainQuery {
  /** Search in problem text */
  problem_pattern?: string;
  /** Filter by domain */
  domain?: string;
  /** Minimum confidence */
  min_confidence?: number;
  /** Created after this time */
  since?: string;
  /** Created by specific agent */
  created_by?: string;
  /** Tags to match (any) */
  tags?: string[];
  /** Maximum results */
  limit?: number;
}

/** Chain statistics */
export interface ChainSharingStats {
  total_chains: number;
  chains_shared: number;
  total_usages: number;
  total_validations: number;
  avg_confidence: number;
  converted_to_tribal: number;
  chains_by_domain: Record<string, number>;
  top_agents: Array<{ agent: string; chains_created: number }>;
  cache_hit_rate: number;
}

/** Tribal extraction result */
export interface TribalExtractionResult {
  chain_id: string;
  extracted: boolean;
  tip_id?: string;
  reason?: string;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ReasoningChainSharingEngine {
  private chains: Map<string, SharedReasoningChain> = new Map();
  private chainsByHash: Map<string, string> = new Map(); // problem_hash -> chain_id
  private validations: Map<string, ChainValidation[]> = new Map();
  private shareEvents: ChainShareEvent[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.loadPersistedChains();
    // Set up periodic cleanup
    setInterval(() => this.cleanupExpiredChains(), 5 * 60 * 1000);
    // Subscribe to chain events
    this.subscribeToEvents();
  }

  // ==========================================================================
  // CHAIN CREATION & SHARING
  // ==========================================================================

  /**
   * Register a completed reasoning chain for sharing.
   */
  registerChain(
    chain: ReasoningChain,
    createdBy: string,
    domain?: string,
    tags?: string[]
  ): SharedReasoningChain {
    const problemHash = this.hashProblem(chain.problem);

    // Check if similar chain already exists
    const existingId = this.chainsByHash.get(problemHash);
    if (existingId) {
      const existing = this.chains.get(existingId);
      if (existing) {
        // Update existing chain if new one has higher confidence
        if (chain.current_confidence > existing.confidence) {
          existing.confidence = chain.current_confidence;
          existing.final_answer = chain.final_answer;
          existing.key_insights = this.extractInsights(chain);
          existing.last_accessed = new Date().toISOString();
        }
        existing.usage_count++;
        log.info(`[ChainSharing] Merged with existing chain: ${existingId}`);
        return existing;
      }
    }

    const now = new Date().toISOString();
    const sharedChain: SharedReasoningChain = {
      chain_id: chain.chain_id,
      problem_hash: problemHash,
      problem: chain.problem,
      goal: chain.goal,
      created_by: createdBy,
      created_at: now,
      last_accessed: now,
      final_answer: chain.final_answer,
      confidence: chain.current_confidence,
      usage_count: 1,
      shared_with: [],
      converted_to_tribal: false,
      aggregated_confidence: chain.current_confidence,
      validation_count: 1,
      key_insights: this.extractInsights(chain),
      tags: tags || this.autoTagChain(chain),
      domain,
      duration_ms: chain.total_time_ms,
      step_count: chain.steps.length,
      backtrack_count: chain.meta.backtrack_count,
    };

    this.chains.set(chain.chain_id, sharedChain);
    this.chainsByHash.set(problemHash, chain.chain_id);

    // Publish event for other agents
    eventBus.publish("chain_sharing", "chain_registered", {
      chain_id: chain.chain_id,
      created_by: createdBy,
      problem: chain.problem.slice(0, 100),
      confidence: chain.current_confidence,
    } as Record<string, unknown>);

    log.info(`[ChainSharing] Registered chain: ${chain.chain_id} by ${createdBy}`);

    // Check if eligible for tribal extraction
    if (sharedChain.confidence >= TRIBAL_EXTRACTION_THRESHOLD) {
      this.scheduleTribalExtraction(sharedChain);
    }

    this.persistChains();
    return sharedChain;
  }

  /**
   * Share a chain with specific agents.
   */
  shareChain(
    chainId: string,
    fromAgent: string,
    toAgents: string[],
    summary?: string
  ): ChainShareEvent | null {
    const chain = this.chains.get(chainId);
    if (!chain) {
      log.warn(`[ChainSharing] Chain not found: ${chainId}`);
      return null;
    }

    // Add to shared list
    for (const agent of toAgents) {
      if (!chain.shared_with.includes(agent)) {
        chain.shared_with.push(agent);
      }
    }

    const event: ChainShareEvent = {
      chain_id: chainId,
      from_agent: fromAgent,
      to_agents: toAgents,
      timestamp: new Date().toISOString(),
      summary: summary || `Chain solving: ${chain.problem.slice(0, 50)}...`,
    };

    this.shareEvents.push(event);

    // Publish event
    eventBus.publish("chain_sharing", "chain_shared", {
      ...event,
    } as Record<string, unknown>);

    log.info(`[ChainSharing] Chain ${chainId} shared by ${fromAgent} to ${toAgents.join(", ")}`);
    return event;
  }

  /**
   * Share chain with all active agents.
   */
  shareChainWithAll(chainId: string, fromAgent: string): ChainShareEvent | null {
    // This would integrate with MultiAgentAIInterfaceEngine to get active sessions
    // For now, we publish to EventBus which all agents can subscribe to
    const chain = this.chains.get(chainId);
    if (!chain) return null;

    const event: ChainShareEvent = {
      chain_id: chainId,
      from_agent: fromAgent,
      to_agents: ["*"], // Broadcast
      timestamp: new Date().toISOString(),
      summary: `Broadcast: ${chain.problem.slice(0, 50)}...`,
    };

    this.shareEvents.push(event);

    eventBus.publish("chain_sharing", "chain_broadcast", {
      ...event,
      confidence: chain.confidence,
      domain: chain.domain,
      insights: chain.key_insights.slice(0, 3),
    } as Record<string, unknown>);

    return event;
  }

  // ==========================================================================
  // CHAIN RETRIEVAL
  // ==========================================================================

  /**
   * Find a cached chain for a similar problem.
   */
  findSimilarChain(problem: string, minConfidence = MIN_CONFIDENCE_FOR_SHARING): SharedReasoningChain | null {
    const hash = this.hashProblem(problem);
    const chainId = this.chainsByHash.get(hash);

    if (chainId) {
      const chain = this.chains.get(chainId);
      if (chain && chain.confidence >= minConfidence) {
        this.cacheHits++;
        chain.usage_count++;
        chain.last_accessed = new Date().toISOString();
        log.info(`[ChainSharing] Cache hit for problem hash: ${hash.slice(0, 8)}...`);
        return chain;
      }
    }

    this.cacheMisses++;
    return null;
  }

  /**
   * Query chains with filters.
   */
  queryChains(query: ChainQuery): SharedReasoningChain[] {
    let chains = Array.from(this.chains.values());

    if (query.problem_pattern) {
      const pattern = new RegExp(query.problem_pattern, "i");
      chains = chains.filter((c) => pattern.test(c.problem) || pattern.test(c.goal));
    }

    if (query.domain) {
      chains = chains.filter((c) => c.domain === query.domain);
    }

    if (query.min_confidence !== undefined) {
      chains = chains.filter((c) => c.confidence >= query.min_confidence);
    }

    if (query.since) {
      const sinceTime = new Date(query.since).getTime();
      chains = chains.filter((c) => new Date(c.created_at).getTime() >= sinceTime);
    }

    if (query.created_by) {
      chains = chains.filter((c) => c.created_by === query.created_by);
    }

    if (query.tags && query.tags.length > 0) {
      chains = chains.filter((c) =>
        query.tags!.some((tag) => c.tags.includes(tag))
      );
    }

    // Sort by confidence and recency
    chains.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff;
      return b.created_at.localeCompare(a.created_at);
    });

    return chains.slice(0, query.limit ?? 20);
  }

  /**
   * Get a specific chain by ID.
   */
  getChain(chainId: string): SharedReasoningChain | null {
    const chain = this.chains.get(chainId);
    if (chain) {
      chain.last_accessed = new Date().toISOString();
    }
    return chain || null;
  }

  // ==========================================================================
  // CHAIN VALIDATION
  // ==========================================================================

  /**
   * Add a validation from another agent.
   */
  validateChain(validation: ChainValidation): boolean {
    const chain = this.chains.get(validation.chain_id);
    if (!chain) return false;

    // Store validation
    const validations = this.validations.get(validation.chain_id) || [];
    validations.push(validation);
    this.validations.set(validation.chain_id, validations);

    // Update aggregated confidence
    chain.validation_count++;
    const allConfidences = validations.map((v) => v.confidence_assessment);
    allConfidences.push(chain.confidence); // Include original
    chain.aggregated_confidence =
      allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length;

    // Add any additional insights
    if (validation.additional_insights) {
      for (const insight of validation.additional_insights) {
        if (!chain.key_insights.includes(insight)) {
          chain.key_insights.push(insight);
        }
      }
    }

    // Publish validation event
    eventBus.publish("chain_sharing", "chain_validated", {
      chain_id: validation.chain_id,
      validator: validation.validator_agent,
      confidence: validation.confidence_assessment,
      agrees: validation.agrees_with_conclusion,
      aggregated_confidence: chain.aggregated_confidence,
    } as Record<string, unknown>);

    log.info(
      `[ChainSharing] Chain ${validation.chain_id} validated by ${validation.validator_agent} ` +
      `(confidence: ${validation.confidence_assessment}, agrees: ${validation.agrees_with_conclusion})`
    );

    // Check for tribal extraction after validation boost
    if (chain.aggregated_confidence >= TRIBAL_EXTRACTION_THRESHOLD && !chain.converted_to_tribal) {
      this.scheduleTribalExtraction(chain);
    }

    this.persistChains();
    return true;
  }

  /**
   * Get validations for a chain.
   */
  getValidations(chainId: string): ChainValidation[] {
    return this.validations.get(chainId) || [];
  }

  // ==========================================================================
  // TRIBAL KNOWLEDGE EXTRACTION
  // ==========================================================================

  /**
   * Extract tribal knowledge from a high-confidence chain.
   */
  async extractTribalKnowledge(chainId: string): Promise<TribalExtractionResult> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      return { chain_id: chainId, extracted: false, reason: "Chain not found" };
    }

    if (chain.converted_to_tribal) {
      return { chain_id: chainId, extracted: false, reason: "Already converted", tip_id: chain.tribal_tip_id };
    }

    if (chain.aggregated_confidence < TRIBAL_EXTRACTION_THRESHOLD) {
      return {
        chain_id: chainId,
        extracted: false,
        reason: `Confidence ${chain.aggregated_confidence.toFixed(2)} below threshold ${TRIBAL_EXTRACTION_THRESHOLD}`,
      };
    }

    try {
      // Dynamic import to avoid circular dependency
      const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");

      // Create tribal tip from chain
      const tipContent = this.formatChainAsTribalTip(chain);
      const result = await tribalKnowledgeEngine.captureKnowledge({
        title: `AI Insight: ${chain.goal.slice(0, 50)}`,
        body: tipContent,
        category: this.domainToCategory(chain.domain),
        tags: [...chain.tags, "ai_extracted", "reasoning_chain"],
        source: `reasoning_chain:${chainId}`,
        confidence: Math.round(chain.aggregated_confidence * 100),
      });

      chain.converted_to_tribal = true;
      chain.tribal_tip_id = result.tip.id;

      eventBus.publish("chain_sharing", "tribal_extracted", {
        chain_id: chainId,
        tip_id: result.tip.id,
        confidence: chain.aggregated_confidence,
      } as Record<string, unknown>);

      log.info(`[ChainSharing] Extracted tribal knowledge from chain ${chainId} -> tip ${result.tip.id}`);
      this.persistChains();

      return { chain_id: chainId, extracted: true, tip_id: result.tip.id };
    } catch (error: any) {
      log.error(`[ChainSharing] Tribal extraction failed: ${error.message}`);
      return { chain_id: chainId, extracted: false, reason: error.message };
    }
  }

  /**
   * Schedule tribal extraction after a delay (to allow more validations).
   */
  private scheduleTribalExtraction(chain: SharedReasoningChain): void {
    // Wait 5 minutes for more validations before extracting
    setTimeout(() => {
      this.extractTribalKnowledge(chain.chain_id);
    }, 5 * 60 * 1000);
  }

  /**
   * Format chain insights as a tribal knowledge tip.
   */
  private formatChainAsTribalTip(chain: SharedReasoningChain): string {
    const lines: string[] = [];

    lines.push(`**Problem:** ${chain.problem}`);
    lines.push(`**Goal:** ${chain.goal}`);
    lines.push("");
    lines.push("**Key Insights:**");
    for (const insight of chain.key_insights) {
      lines.push(`- ${insight}`);
    }

    if (chain.final_answer) {
      lines.push("");
      lines.push("**Conclusion:**");
      lines.push(chain.final_answer.justification.join(" "));

      if (chain.final_answer.caveats.length > 0) {
        lines.push("");
        lines.push("**Caveats:**");
        for (const caveat of chain.final_answer.caveats) {
          lines.push(`- ${caveat}`);
        }
      }
    }

    lines.push("");
    lines.push(`*Confidence: ${(chain.aggregated_confidence * 100).toFixed(0)}% (${chain.validation_count} validations)*`);
    lines.push(`*Source: AI reasoning chain by ${chain.created_by}*`);

    return lines.join("\n");
  }

  /**
   * Map domain to tribal knowledge category.
   */
  private domainToCategory(domain?: string): string {
    const mapping: Record<string, string> = {
      speed_feed: "speeds_feeds",
      tooling: "tooling",
      physics: "troubleshooting",
      thermal: "troubleshooting",
      surface_finish: "surface_finish",
      quality: "quality",
      safety: "safety",
      process: "setup",
    };
    return domain ? (mapping[domain] || "general") : "general";
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Hash a problem for deduplication.
   */
  private hashProblem(problem: string): string {
    // Normalize: lowercase, remove extra whitespace, remove punctuation
    const normalized = problem
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim();
    return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  }

  /**
   * Extract key insights from a chain.
   */
  private extractInsights(chain: ReasoningChain): string[] {
    const insights: string[] = [];

    // Get insights from conclusion steps
    for (const step of chain.steps) {
      if (step.type === "conclusion" || step.type === "deduction") {
        if (step.confidence > 0.8) {
          insights.push(step.content);
        }
      }
    }

    // Add from final answer
    if (chain.final_answer) {
      insights.push(...chain.final_answer.justification.slice(0, 3));
    }

    // Deduplicate and limit
    return [...new Set(insights)].slice(0, 5);
  }

  /**
   * Auto-tag a chain based on content.
   */
  private autoTagChain(chain: ReasoningChain): string[] {
    const tags: string[] = [];
    const text = `${chain.problem} ${chain.goal}`.toLowerCase();

    const tagPatterns: Record<string, string[]> = {
      speed_feed: ["speed", "feed", "sfm", "ipm", "rpm"],
      tooling: ["tool", "insert", "endmill", "cutter", "drill"],
      material: ["steel", "aluminum", "titanium", "inconel", "brass"],
      thermal: ["temperature", "heat", "thermal", "cooling"],
      deflection: ["deflection", "deflect", "bend", "stiffness"],
      surface_finish: ["surface", "finish", "roughness", "ra"],
      chatter: ["chatter", "vibration", "stability"],
      force: ["force", "load", "kienzle", "cutting force"],
    };

    for (const [tag, patterns] of Object.entries(tagPatterns)) {
      if (patterns.some((p) => text.includes(p))) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * Subscribe to EventBus events.
   */
  private subscribeToEvents(): void {
    // Listen for chain events from other sources
    eventBus.subscribe("puoa", "chain_completed", (data: any) => {
      // Auto-register PUOA chains if not already registered
      if (data.chain_id && !this.chains.has(data.chain_id)) {
        log.debug(`[ChainSharing] Received PUOA chain completion: ${data.chain_id}`);
      }
    });
  }

  /**
   * Clean up expired chains.
   */
  private cleanupExpiredChains(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [chainId, chain] of this.chains.entries()) {
      const lastAccess = new Date(chain.last_accessed).getTime();
      const age = now - lastAccess;

      // Keep if: recently accessed, high confidence, or converted to tribal
      if (
        age > CHAIN_TTL_MS &&
        chain.confidence < 0.9 &&
        !chain.converted_to_tribal
      ) {
        this.chains.delete(chainId);
        this.chainsByHash.delete(chain.problem_hash);
        cleaned++;
      }
    }

    // Also trim if over max size
    if (this.chains.size > MAX_CACHED_CHAINS) {
      const sorted = Array.from(this.chains.entries())
        .sort((a, b) => a[1].last_accessed.localeCompare(b[1].last_accessed));

      const toRemove = sorted.slice(0, this.chains.size - MAX_CACHED_CHAINS);
      for (const [chainId, chain] of toRemove) {
        this.chains.delete(chainId);
        this.chainsByHash.delete(chain.problem_hash);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info(`[ChainSharing] Cleaned up ${cleaned} expired chains`);
      this.persistChains();
    }
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  /**
   * Load persisted chains from disk.
   */
  private loadPersistedChains(): void {
    try {
      if (fs.existsSync(CHAIN_STORAGE_PATH)) {
        const data = JSON.parse(fs.readFileSync(CHAIN_STORAGE_PATH, "utf-8"));
        for (const chain of data.chains || []) {
          this.chains.set(chain.chain_id, chain);
          this.chainsByHash.set(chain.problem_hash, chain.chain_id);
        }
        log.info(`[ChainSharing] Loaded ${this.chains.size} persisted chains`);
      }
    } catch (error: any) {
      log.warn(`[ChainSharing] Failed to load persisted chains: ${error.message}`);
    }
  }

  /**
   * Persist chains to disk.
   */
  private persistChains(): void {
    try {
      const data = {
        version: 1,
        updated_at: new Date().toISOString(),
        chains: Array.from(this.chains.values()),
      };
      safeWriteSync(CHAIN_STORAGE_PATH, JSON.stringify(data, null, 2));
    } catch (error: any) {
      log.warn(`[ChainSharing] Failed to persist chains: ${error.message}`);
    }
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get statistics about chain sharing.
   */
  getStats(): ChainSharingStats {
    const chains = Array.from(this.chains.values());
    const byDomain: Record<string, number> = {};
    const byAgent: Record<string, number> = {};

    for (const chain of chains) {
      if (chain.domain) {
        byDomain[chain.domain] = (byDomain[chain.domain] || 0) + 1;
      }
      byAgent[chain.created_by] = (byAgent[chain.created_by] || 0) + 1;
    }

    const topAgents = Object.entries(byAgent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([agent, count]) => ({ agent, chains_created: count }));

    const totalRequests = this.cacheHits + this.cacheMisses;

    return {
      total_chains: chains.length,
      chains_shared: chains.filter((c) => c.shared_with.length > 0).length,
      total_usages: chains.reduce((sum, c) => sum + c.usage_count, 0),
      total_validations: chains.reduce((sum, c) => sum + c.validation_count, 0),
      avg_confidence:
        chains.length > 0
          ? chains.reduce((sum, c) => sum + c.aggregated_confidence, 0) / chains.length
          : 0,
      converted_to_tribal: chains.filter((c) => c.converted_to_tribal).length,
      chains_by_domain: byDomain,
      top_agents: topAgents,
      cache_hit_rate: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const reasoningChainSharingEngine = new ReasoningChainSharingEngine();
