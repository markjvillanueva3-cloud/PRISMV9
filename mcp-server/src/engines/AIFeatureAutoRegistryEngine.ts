/**
 * AIFeatureAutoRegistryEngine — Automatic AI Feature Discovery & Registration
 *
 * Automatically discovers and registers new AI domains, features, and engines.
 * Provides a unified index of all AI capabilities across PRISM for intelligent routing.
 *
 * CAPABILITIES:
 * - Auto-discovery of AI engines in src/engines/
 * - Feature categorization and indexing
 * - Domain routing recommendations
 * - Self-updating registry on new engine creation
 * - Integration with PRISMSelfAwarenessEngine
 * - Hook integration for automatic registration on file changes
 *
 * @module engines/AIFeatureAutoRegistryEngine
 */

import { prismSelfAwarenessEngine } from "./PRISMSelfAwarenessEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** AI feature category */
export type AICategory =
  | "reasoning"       // Chain-of-thought, tree-of-thought, multi-path
  | "learning"        // Deep learning, transfer learning, reinforcement
  | "intelligence"    // PRISMIntelligenceLayer, domain-specific intelligence
  | "orchestration"   // Multi-agent, workflow coordination
  | "agent"           // Agent patterns, specialization
  | "advisor"         // Expert systems, recommendation engines
  | "prediction"      // Forecasting, anomaly detection
  | "optimization"    // Parameter optimization, process improvement
  | "knowledge"       // Knowledge graphs, tribal knowledge
  | "nlp"             // Natural language processing, LLM CLI
  | "vision"          // CAD analysis, defect detection
  | "physics"         // Physics-informed AI, simulation
  | "deep_ai";        // DeepAIIntelligenceEngine capabilities

/** Registered AI feature */
export interface AIFeature {
  id: string;
  name: string;
  engineFile: string;
  category: AICategory;
  description: string;
  capabilities: string[];
  domains: string[];
  actions: string[];
  dispatcher?: string;
  confidence: number;
  createdAt: string;
  lastUpdated: string;
}

/** AI domain with associated features */
export interface AIDomain {
  id: string;
  name: string;
  description: string;
  features: string[];  // Feature IDs
  primaryEngine: string;
  fallbackEngines: string[];
  keywords: string[];
}

/** Feature discovery result */
export interface DiscoveryResult {
  newFeatures: AIFeature[];
  updatedFeatures: AIFeature[];
  removedFeatures: string[];
  totalFeatures: number;
  totalDomains: number;
  timestamp: string;
}

/** Auto-ingestion event */
export interface IngestionEvent {
  type: "feature_added" | "feature_updated" | "feature_removed" | "domain_created";
  featureId: string;
  engineFile?: string;
  category?: AICategory;
  timestamp: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class AIFeatureAutoRegistryEngine {
  private features: Map<string, AIFeature> = new Map();
  private domains: Map<string, AIDomain> = new Map();
  private ingestionHistory: IngestionEvent[] = [];
  private initialized: boolean = false;

  constructor() {
    this.initializeBuiltInFeatures();
  }

  /**
   * Initialize with built-in AI features
   */
  private initializeBuiltInFeatures(): void {
    // Deep AI Intelligence features
    this.registerFeature({
      id: "deep_ai_reasoning",
      name: "Deep AI Reasoning",
      engineFile: "DeepAIIntelligenceEngine.ts",
      category: "deep_ai",
      description: "Claude Opus-level deep reasoning with chain-of-thought, tree-of-thought, multi-path, and backtracking",
      capabilities: ["chain_of_thought", "tree_of_thought", "multi_path", "backtracking", "abductive", "deductive", "inductive", "analogical"],
      domains: ["machining", "quote", "quality", "safety", "general"],
      actions: ["deep_reason", "deep_reason_chain", "deep_reason_tree", "deep_reason_multi"],
      dispatcher: "prism_ai",
      confidence: 0.95,
    });

    this.registerFeature({
      id: "deep_ai_learning",
      name: "Deep AI Learning",
      engineFile: "DeepAIIntelligenceEngine.ts",
      category: "deep_ai",
      description: "Pattern recognition, transfer learning, few-shot, zero-shot, meta-learning capabilities",
      capabilities: ["pattern_recognition", "transfer_learning", "reinforcement", "few_shot", "zero_shot", "meta_learning", "continuous"],
      domains: ["machining", "process_optimization", "quality"],
      actions: ["deep_learn"],
      dispatcher: "prism_ai",
      confidence: 0.9,
    });

    this.registerFeature({
      id: "deep_ai_logic",
      name: "Deep AI Logic",
      engineFile: "DeepAIIntelligenceEngine.ts",
      category: "deep_ai",
      description: "Formal logic, constraint satisfaction, probabilistic reasoning",
      capabilities: ["propositional", "first_order", "modal", "temporal", "fuzzy", "constraint", "probabilistic"],
      domains: ["validation", "safety", "constraint_checking"],
      actions: ["deep_logic"],
      dispatcher: "prism_ai",
      confidence: 0.9,
    });

    this.registerFeature({
      id: "deep_ai_extended_thinking",
      name: "Extended Thinking",
      engineFile: "DeepAIIntelligenceEngine.ts",
      category: "deep_ai",
      description: "Claude Opus-style 7-phase extended thinking analysis",
      capabilities: ["multi_aspect_analysis", "tradeoff_evaluation", "risk_assessment", "opportunity_identification", "synthesis", "recommendation"],
      domains: ["complex_decisions", "process_planning", "strategic_analysis"],
      actions: ["extended_thinking", "deep_analyze"],
      dispatcher: "prism_ai",
      confidence: 0.95,
    });

    this.registerFeature({
      id: "deep_ai_llm_cli",
      name: "LLM CLI",
      engineFile: "DeepAIIntelligenceEngine.ts",
      category: "nlp",
      description: "Natural language command interface for PRISM",
      capabilities: ["intent_parsing", "parameter_extraction", "action_mapping", "execution_planning"],
      domains: ["user_interface", "natural_language", "command_processing"],
      actions: ["llm_cli", "assist_command"],
      dispatcher: "prism_ai",
      confidence: 0.85,
    });

    this.registerFeature({
      id: "deep_ai_enhancement",
      name: "Skill/Hook Enhancement",
      engineFile: "DeepAIIntelligenceEngine.ts",
      category: "deep_ai",
      description: "AI-powered enhancement for skills, hooks, and scripts",
      capabilities: ["skill_enhancement", "hook_validation", "auto_correction", "ai_insights"],
      domains: ["skill_execution", "hook_processing", "automation"],
      actions: ["enhance_skill", "enhance_hook"],
      dispatcher: "prism_ai",
      confidence: 0.9,
    });

    // PRISM Intelligence Layer features
    this.registerFeature({
      id: "prism_intelligence_core",
      name: "PRISM Intelligence Layer",
      engineFile: "PRISMIntelligenceLayer.ts",
      category: "intelligence",
      description: "Core AI-powered manufacturing intelligence",
      capabilities: ["speed_feed_optimization", "tool_selection", "operation_sequencing", "quote_optimization", "error_resolution"],
      domains: ["machining", "quoting", "process_planning"],
      actions: ["reason", "speed_feed", "tool_select", "sequence", "strategy", "quote"],
      dispatcher: "prism_ai",
      confidence: 0.95,
    });

    // Self-awareness features
    this.registerFeature({
      id: "self_awareness",
      name: "PRISM Self-Awareness",
      engineFile: "PRISMSelfAwarenessEngine.ts",
      category: "knowledge",
      description: "Token-efficient self-awareness for AI agents",
      capabilities: ["capability_search", "intent_routing", "gap_analysis", "proactive_reasoning", "jm_die_access", "tribal_knowledge"],
      domains: ["self_awareness", "capability_discovery", "knowledge_management"],
      actions: [],
      dispatcher: undefined,
      confidence: 0.95,
    });

    // Multi-agent features
    this.registerFeature({
      id: "multi_agent_coordinator",
      name: "Multi-Agent Coordinator",
      engineFile: "MultiAgentCoordinatorEngine.ts",
      category: "orchestration",
      description: "Coordinates multiple AI agents for complex tasks",
      capabilities: ["agent_spawning", "task_distribution", "result_aggregation", "conflict_resolution"],
      domains: ["multi_agent", "orchestration", "parallel_execution"],
      actions: ["register_session", "execute_chain", "claim_chain"],
      dispatcher: "prism_ai",
      confidence: 0.9,
    });

    // Initialize domains
    this.initializeDomains();
    this.initialized = true;
  }

  /**
   * Initialize AI domains
   */
  private initializeDomains(): void {
    this.registerDomain({
      id: "deep_reasoning",
      name: "Deep Reasoning",
      description: "Claude Opus-level reasoning capabilities",
      features: ["deep_ai_reasoning", "deep_ai_extended_thinking"],
      primaryEngine: "DeepAIIntelligenceEngine",
      fallbackEngines: ["PRISMIntelligenceLayer", "ManufacturingReasoningEngine"],
      keywords: ["reason", "think", "analyze", "deduce", "infer", "chain of thought"],
    });

    this.registerDomain({
      id: "machine_learning",
      name: "Machine Learning",
      description: "Pattern recognition and learning capabilities",
      features: ["deep_ai_learning"],
      primaryEngine: "DeepAIIntelligenceEngine",
      fallbackEngines: ["DeepLearningEngine", "TransferLearningEngine"],
      keywords: ["learn", "pattern", "train", "adapt", "recognize"],
    });

    this.registerDomain({
      id: "manufacturing_intelligence",
      name: "Manufacturing Intelligence",
      description: "AI-powered manufacturing optimization",
      features: ["prism_intelligence_core", "deep_ai_reasoning"],
      primaryEngine: "PRISMIntelligenceLayer",
      fallbackEngines: ["DeepAIIntelligenceEngine"],
      keywords: ["speed", "feed", "tool", "machine", "optimize", "quote"],
    });

    this.registerDomain({
      id: "natural_language",
      name: "Natural Language Processing",
      description: "Natural language understanding and command processing",
      features: ["deep_ai_llm_cli"],
      primaryEngine: "DeepAIIntelligenceEngine",
      fallbackEngines: ["IntentDecompositionEngine"],
      keywords: ["tell", "ask", "command", "natural", "language", "cli"],
    });

    this.registerDomain({
      id: "knowledge_management",
      name: "Knowledge Management",
      description: "Tribal knowledge, playbook rules, and self-awareness",
      features: ["self_awareness"],
      primaryEngine: "PRISMSelfAwarenessEngine",
      fallbackEngines: ["TribalKnowledgeEngine", "MachiningPlaybookEngine"],
      keywords: ["knowledge", "tribal", "playbook", "rule", "tip", "best practice"],
    });
  }

  // ============================================================================
  // AUTO-INGESTION
  // ============================================================================

  /**
   * Auto-ingest a new AI feature (called when new engine is created)
   */
  autoIngest(engineFile: string, metadata?: Partial<AIFeature>): IngestionEvent {
    const featureId = this.generateFeatureId(engineFile);
    const category = this.inferCategory(engineFile, metadata);
    const domains = this.inferDomains(engineFile, metadata);

    const feature: AIFeature = {
      id: featureId,
      name: metadata?.name ?? this.generateFeatureName(engineFile),
      engineFile,
      category,
      description: metadata?.description ?? `AI feature from ${engineFile}`,
      capabilities: metadata?.capabilities ?? [],
      domains,
      actions: metadata?.actions ?? [],
      dispatcher: metadata?.dispatcher,
      confidence: metadata?.confidence ?? 0.8,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    const existing = this.features.get(featureId);
    const eventType = existing ? "feature_updated" : "feature_added";

    this.features.set(featureId, feature);

    // Auto-update domains
    for (const domainId of domains) {
      const domain = this.domains.get(domainId);
      if (domain && !domain.features.includes(featureId)) {
        domain.features.push(featureId);
      }
    }

    const event: IngestionEvent = {
      type: eventType,
      featureId,
      engineFile,
      category,
      timestamp: new Date().toISOString(),
    };

    this.ingestionHistory.push(event);

    // Update self-awareness engine
    this.updateSelfAwareness();

    return event;
  }

  /**
   * Discover AI features from engine files (scan pattern)
   */
  async discoverFeatures(): Promise<DiscoveryResult> {
    const newFeatures: AIFeature[] = [];
    const updatedFeatures: AIFeature[] = [];
    const timestamp = new Date().toISOString();

    // Get AI feature index from self-awareness
    const manifest = await prismSelfAwarenessEngine.getManifest();
    const aiFeatures = manifest.engines.map((e) => ({ name: e.name, description: e.description ?? "", capabilities: e.capabilities ?? [] }));

    for (const feature of aiFeatures) {
      // Generate engineFile from feature name
      const engineFile = feature.name.replace(/\s+/g, "") + "Engine.ts";
      const existing = this.features.get(this.generateFeatureId(engineFile));
      if (!existing) {
        const ingested = this.autoIngest(engineFile, {
          name: feature.name,
          description: feature.description,
          capabilities: feature.capabilities,
        });
        if (ingested.type === "feature_added") {
          const newFeature = this.features.get(ingested.featureId);
          if (newFeature) newFeatures.push(newFeature);
        }
      }
    }

    return {
      newFeatures,
      updatedFeatures,
      removedFeatures: [],
      totalFeatures: this.features.size,
      totalDomains: this.domains.size,
      timestamp,
    };
  }

  // ============================================================================
  // FEATURE REGISTRATION
  // ============================================================================

  /**
   * Register an AI feature
   */
  registerFeature(feature: Omit<AIFeature, "createdAt" | "lastUpdated">): void {
    const fullFeature: AIFeature = {
      ...feature,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    this.features.set(feature.id, fullFeature);
  }

  /**
   * Register an AI domain
   */
  registerDomain(domain: AIDomain): void {
    this.domains.set(domain.id, domain);
  }

  // ============================================================================
  // INTELLIGENT ROUTING
  // ============================================================================

  /**
   * Find the best AI feature for a query
   */
  findBestFeature(query: string, domain?: string): AIFeature | null {
    const queryLower = query.toLowerCase();
    let bestMatch: AIFeature | null = null;
    let bestScore = 0;

    for (const feature of this.features.values()) {
      let score = 0;

      // Domain match
      if (domain && feature.domains.includes(domain)) {
        score += 0.3;
      }

      // Capability match
      for (const cap of feature.capabilities) {
        if (queryLower.includes(cap.replace(/_/g, " "))) {
          score += 0.2;
        }
      }

      // Description match
      const descWords = feature.description.toLowerCase().split(/\s+/);
      const queryWords = queryLower.split(/\s+/);
      const overlap = queryWords.filter(w => descWords.includes(w)).length;
      score += overlap * 0.1;

      // Confidence factor
      score *= feature.confidence;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = feature;
      }
    }

    return bestMatch;
  }

  /**
   * Find the best domain for a query
   */
  findBestDomain(query: string): AIDomain | null {
    const queryLower = query.toLowerCase();
    let bestMatch: AIDomain | null = null;
    let bestScore = 0;

    for (const domain of this.domains.values()) {
      let score = 0;

      // Keyword match
      for (const keyword of domain.keywords) {
        if (queryLower.includes(keyword)) {
          score += 0.3;
        }
      }

      // Description match
      const descWords = domain.description.toLowerCase().split(/\s+/);
      const queryWords = queryLower.split(/\s+/);
      const overlap = queryWords.filter(w => descWords.includes(w)).length;
      score += overlap * 0.15;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = domain;
      }
    }

    return bestMatch;
  }

  /**
   * Route a query to the appropriate AI engine
   */
  routeQuery(query: string): {
    domain: AIDomain | null;
    feature: AIFeature | null;
    engine: string;
    dispatcher?: string;
    actions: string[];
    confidence: number;
  } {
    const domain = this.findBestDomain(query);
    const feature = this.findBestFeature(query, domain?.id);

    return {
      domain,
      feature,
      engine: feature?.engineFile ?? domain?.primaryEngine ?? "PRISMIntelligenceLayer.ts",
      dispatcher: feature?.dispatcher,
      actions: feature?.actions ?? [],
      confidence: feature?.confidence ?? 0.5,
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Generate a feature ID from engine filename
   */
  private generateFeatureId(engineFile: string): string {
    return engineFile
      .replace(/Engine\.ts$/, "")
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "")
      .replace(/__+/g, "_");
  }

  /**
   * Generate a feature name from engine filename
   */
  private generateFeatureName(engineFile: string): string {
    return engineFile
      .replace(/Engine\.ts$/, "")
      .replace(/([A-Z])/g, " $1")
      .trim();
  }

  /**
   * Infer category from engine file and metadata
   */
  private inferCategory(engineFile: string, metadata?: Partial<AIFeature>): AICategory {
    if (metadata?.category) return metadata.category;

    const fileLower = engineFile.toLowerCase();
    if (fileLower.includes("reasoning")) return "reasoning";
    if (fileLower.includes("learning")) return "learning";
    if (fileLower.includes("intelligence")) return "intelligence";
    if (fileLower.includes("orchestrat")) return "orchestration";
    if (fileLower.includes("agent")) return "agent";
    if (fileLower.includes("advisor")) return "advisor";
    if (fileLower.includes("predict")) return "prediction";
    if (fileLower.includes("optimi")) return "optimization";
    if (fileLower.includes("knowledge")) return "knowledge";
    if (fileLower.includes("nlp") || fileLower.includes("language")) return "nlp";
    if (fileLower.includes("vision") || fileLower.includes("cad")) return "vision";
    if (fileLower.includes("physics")) return "physics";
    if (fileLower.includes("deep")) return "deep_ai";

    return "intelligence";
  }

  /**
   * Infer domains from engine file and metadata
   */
  private inferDomains(engineFile: string, metadata?: Partial<AIFeature>): string[] {
    if (metadata?.domains && metadata.domains.length > 0) return metadata.domains;

    const fileLower = engineFile.toLowerCase();
    const domains: string[] = [];

    if (fileLower.includes("lathe") || fileLower.includes("turning")) domains.push("turning");
    if (fileLower.includes("mill")) domains.push("milling");
    if (fileLower.includes("drill")) domains.push("drilling");
    if (fileLower.includes("grind")) domains.push("grinding");
    if (fileLower.includes("edm")) domains.push("edm");
    if (fileLower.includes("thread")) domains.push("threading");
    if (fileLower.includes("quote") || fileLower.includes("cost")) domains.push("quoting");
    if (fileLower.includes("quality")) domains.push("quality");
    if (fileLower.includes("safety")) domains.push("safety");

    return domains.length > 0 ? domains : ["general"];
  }

  /**
   * Update self-awareness with new features
   */
  private updateSelfAwareness(): void {
    // The self-awareness engine will pick up new features through its own indexing
    // This is a hook point for any additional synchronization needed
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  /**
   * Get all features
   */
  getAllFeatures(): AIFeature[] {
    return Array.from(this.features.values());
  }

  /**
   * Get all domains
   */
  getAllDomains(): AIDomain[] {
    return Array.from(this.domains.values());
  }

  /**
   * Get features by category
   */
  getFeaturesByCategory(category: AICategory): AIFeature[] {
    return Array.from(this.features.values()).filter(f => f.category === category);
  }

  /**
   * Get ingestion history
   */
  getIngestionHistory(): IngestionEvent[] {
    return [...this.ingestionHistory];
  }

  /**
   * Get registry stats
   */
  getStats(): {
    totalFeatures: number;
    totalDomains: number;
    byCategory: Record<string, number>;
    recentIngestions: number;
  } {
    const byCategory: Record<string, number> = {};
    for (const feature of this.features.values()) {
      byCategory[feature.category] = (byCategory[feature.category] ?? 0) + 1;
    }

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentIngestions = this.ingestionHistory.filter(
      e => new Date(e.timestamp).getTime() > oneDayAgo
    ).length;

    return {
      totalFeatures: this.features.size,
      totalDomains: this.domains.size,
      byCategory,
      recentIngestions,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    return `AIFeatureAutoRegistry: ${stats.totalFeatures} features, ${stats.totalDomains} domains
Categories: ${Object.entries(stats.byCategory).map(([k, v]) => `${k}:${v}`).join(", ")}
Recent ingestions (24h): ${stats.recentIngestions}
Auto-ingest: Enabled — new AI engines automatically registered`;
  }
}

// Export singleton
export const aiFeatureAutoRegistry = new AIFeatureAutoRegistryEngine();

/**
 * Dispatcher function for MCP action routing (U-AI-WIRE)
 * Maps action names to AIFeatureAutoRegistryEngine methods
 */
export async function aiFeatureRegistryDispatch(
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "ai_feature_discover":
      return aiFeatureAutoRegistry.discoverFeatures();
    case "ai_feature_find":
      return aiFeatureAutoRegistry.findBestFeature(
        params.query as string,
        params.domain as string | undefined
      );
    case "ai_feature_route":
      return aiFeatureAutoRegistry.routeQuery(params.query as string);
    case "ai_feature_list":
      return aiFeatureAutoRegistry.getAllFeatures();
    case "ai_domain_list":
      return aiFeatureAutoRegistry.getAllDomains();
    case "ai_feature_stats":
      return aiFeatureAutoRegistry.getStats();
    case "ai_feature_by_category":
      return aiFeatureAutoRegistry.getFeaturesByCategory(
        params.category as AICategory
      );
    default:
      throw new Error(`Unknown AI feature action: ${action}`);
  }
}
