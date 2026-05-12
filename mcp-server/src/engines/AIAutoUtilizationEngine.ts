/**
 * AIAutoUtilizationEngine — Automatic Capability Utilization System
 * ===================================================================
 * Automatically identifies when to invoke skills, scripts, hooks, and slash
 * commands based on user input patterns, context, and system state.
 *
 * This engine is the "recommendation brain" that ensures:
 *   1. No session is unaware of available capabilities
 *   2. Appropriate commands are suggested automatically
 *   3. Complex tasks are decomposed into command sequences
 *   4. Learning from user feedback improves recommendations
 *
 * Integration Points:
 *   - UserPromptSubmit hooks (pattern detection)
 *   - SessionStart hooks (capability injection)
 *   - NeuralIntegrationEngine (cross-engine routing)
 *   - TribalKnowledgeAdvisorEngine (domain expertise)
 *
 * @module engines/AIAutoUtilizationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type CapabilityType = "skill" | "script" | "hook" | "command" | "engine" | "dispatcher_action";

export interface Capability {
  name: string;
  type: CapabilityType;
  triggers: string[];
  auto_invoke_patterns: string[];
  description: string;
  domain: string;
  priority: number; // 0-100, higher = more important
  engines_used: string[];
  effort_level: "quick" | "standard" | "intensive" | "high";
}

export interface PatternMatch {
  capability: Capability;
  match_score: number;
  matched_patterns: string[];
  context_relevance: number;
  recommended_action: "invoke" | "suggest" | "inform";
}

export interface UtilizationRecommendation {
  primary: PatternMatch | null;
  alternatives: PatternMatch[];
  reasoning: string;
  auto_invoke: boolean;
  command_sequence: string[];
}

export interface UserContext {
  recent_files: string[];
  recent_engines: string[];
  domain_focus: string;
  session_goals: string[];
  error_history: string[];
}

export interface UtilizationStats {
  total_capabilities: number;
  commands_available: number;
  skills_available: number;
  scripts_available: number;
  hooks_active: number;
  engines_registered: number;
  auto_invoke_rules: number;
}

// ============================================================================
// CAPABILITY REGISTRY
// ============================================================================

const CAPABILITY_REGISTRY: Capability[] = [
  // === CRITICAL LEARNING COMMANDS ===
  {
    name: "/pdf-learn",
    type: "command",
    triggers: ["pdf", "document", "manual", "catalog", "paper", "extract knowledge", "learn from pdf"],
    auto_invoke_patterns: ["learn from pdf", "extract from pdf", "pdf knowledge", "read this pdf"],
    description: "AI-powered PDF knowledge extraction into tribal knowledge",
    domain: "learning",
    priority: 95,
    engines_used: ["PDFFormulaExtractionEngine", "LectureNoteExtractionEngine", "AIExtractionReasonerEngine"],
    effort_level: "high",
  },
  {
    name: "/video-learn",
    type: "command",
    triggers: ["video", "youtube", "tutorial", "training video", "machining video", "watch and learn"],
    auto_invoke_patterns: ["learn from video", "extract from video", "video knowledge", "watch this video"],
    description: "AI-powered video knowledge extraction into procedures/tips",
    domain: "learning",
    priority: 90,
    engines_used: ["VideoELearningAIEngine", "VideoLearningEngine", "VideoReplayOrchestratorEngine"],
    effort_level: "high",
  },
  {
    name: "/shop-knowledge",
    type: "command",
    triggers: ["tribal", "shop floor", "operator", "experience", "wisdom", "expert knowledge"],
    auto_invoke_patterns: ["tribal knowledge", "shop wisdom", "operator tips", "how does the shop do this"],
    description: "Extract and categorize shop floor knowledge",
    domain: "learning",
    priority: 85,
    engines_used: ["TribalKnowledgeAdvisorEngine", "MachiningPlaybookEngine"],
    effort_level: "standard",
  },
  {
    name: "/ingest",
    type: "command",
    triggers: ["ingest", "import", "load data", "add knowledge", "bring in data"],
    auto_invoke_patterns: ["ingest data", "import data", "add this to prism"],
    description: "Ingest external data sources into PRISM",
    domain: "learning",
    priority: 80,
    engines_used: ["ResourceHarvestingIntelligenceEngine", "AutomatedResourceHarvestingPipeline"],
    effort_level: "high",
  },

  // === FORGE/CREATION COMMANDS ===
  {
    name: "/forge-triple",
    type: "command",
    triggers: ["forge", "create engine", "build engine", "new engine", "create skill", "create hook", "build new capability", "create a new engine", "build new", "create new"],
    auto_invoke_patterns: ["build new engine", "create new capability", "forge new", "we need a new engine for", "create new engine", "create a new"],
    description: "Create engines + skills + hooks with EXHAUSTIVE extraction",
    domain: "development",
    priority: 100,
    engines_used: ["DuplicationGuardEngine", "AISystemSynchronizerEngine"],
    effort_level: "high",
  },
  {
    name: "/forge-engine",
    type: "command",
    triggers: ["single engine", "one engine", "simple engine"],
    auto_invoke_patterns: ["just create the engine", "only need an engine"],
    description: "Create a single new engine",
    domain: "development",
    priority: 75,
    engines_used: ["DuplicationGuardEngine"],
    effort_level: "standard",
  },
  {
    name: "/dedup",
    type: "command",
    triggers: ["duplicate", "dedup", "redundant", "already exists", "check for duplicates", "check for duplicate", "duplicate engines"],
    auto_invoke_patterns: ["check duplicate", "before creating", "is there already", "check for duplicate"],
    description: "Find and eliminate duplicate code/engines",
    domain: "development",
    priority: 95,
    engines_used: ["DuplicationGuardEngine"],
    effort_level: "quick",
  },

  // === MACHINE-SPECIFIC COMMANDS ===
  {
    name: "/wire-edm-studio",
    type: "command",
    triggers: ["wire edm", "wedm", "wire cut", "edm program", "spark erosion", "wire erosion"],
    auto_invoke_patterns: ["edm program", "wire edm job", "write wedm program", "mitsubishi edm"],
    description: "Full Wire EDM programming studio with AI",
    domain: "wire_edm",
    priority: 90,
    engines_used: ["WireEDMDeepAIHardeningEngine", "WEDMProgramAnalyzerEngine"],
    effort_level: "high",
  },
  {
    name: "/lathe-studio",
    type: "command",
    triggers: ["lathe", "turning", "okuma lathe", "cnc lathe", "turning center"],
    auto_invoke_patterns: ["lathe program", "turning job", "okuma program"],
    description: "Full lathe programming studio",
    domain: "turning",
    priority: 90,
    engines_used: ["LatheDeepAIHardeningEngine", "LatheAIOrchestrationEngine"],
    effort_level: "high",
  },
  {
    name: "/machine-harden",
    type: "command",
    triggers: ["harden", "hardening", "strengthen", "improve machine ai", "deep ai"],
    auto_invoke_patterns: ["harden capabilities", "strengthen machine", "improve the ai for"],
    description: "Harden machine-specific AI capabilities",
    domain: "development",
    priority: 85,
    engines_used: ["MillingDeepAIHardeningEngine", "LatheDeepAIHardeningEngine", "WireEDMDeepAIHardeningEngine"],
    effort_level: "high",
  },

  // === OPTIMIZATION COMMANDS ===
  {
    name: "/program-optimize",
    type: "command",
    triggers: ["optimize program", "improve program", "faster program", "speed up"],
    auto_invoke_patterns: ["optimize cnc", "speed up program", "make it faster"],
    description: "Optimize CNC programs for speed/feed/tool life",
    domain: "optimization",
    priority: 85,
    engines_used: ["SpeedFeedOrchestratorEngine", "AIPhysicsOptimizationEngine"],
    effort_level: "standard",
  },
  {
    name: "/auto-speed-feed",
    type: "command",
    triggers: ["speed feed", "speeds and feeds", "cutting parameters", "what speed", "what feed", "speed and feed", "calculate cutting"],
    auto_invoke_patterns: ["calculate speed feed", "what speed feed", "recommended parameters", "what speed and feed", "calculate cutting parameters"],
    description: "Auto-calculate optimal speed/feed",
    domain: "optimization",
    priority: 90,
    engines_used: ["SpeedFeedOrchestratorEngine", "UltimateSpeedFeedEngine"],
    effort_level: "quick",
  },
  {
    name: "/scrutinize",
    type: "command",
    triggers: ["scrutinize", "deep review", "audit code", "check quality", "thorough review"],
    auto_invoke_patterns: ["scrutinize code", "deep audit", "review thoroughly"],
    description: "Deep scrutiny of code for issues and improvements",
    domain: "quality",
    priority: 80,
    engines_used: ["PRISMCreativeReasoningEngine", "DeepAIIntelligenceEngine"],
    effort_level: "intensive",
  },

  // === BUSINESS COMMANDS ===
  {
    name: "/quote-to-ship",
    type: "command",
    triggers: ["quote", "estimate", "job", "order", "ship", "pricing", "bid"],
    auto_invoke_patterns: ["new quote", "create quote", "job quote", "estimate this job"],
    description: "Full quote-to-ship pipeline orchestration",
    domain: "business",
    priority: 90,
    engines_used: ["QuoteEstimatorEngine", "JobCostingEngine", "SchedulingEngine"],
    effort_level: "high",
  },
  {
    name: "/job-cost",
    type: "command",
    triggers: ["cost", "pricing", "estimate cost", "job cost", "calculate cost"],
    auto_invoke_patterns: ["calculate cost", "job costing", "how much will this cost"],
    description: "Calculate job costing and estimates",
    domain: "business",
    priority: 85,
    engines_used: ["JobCostingEngine", "ActualCostEngine"],
    effort_level: "standard",
  },
  {
    name: "/shop-schedule",
    type: "command",
    triggers: ["schedule", "capacity", "workload", "planning", "when can we"],
    auto_invoke_patterns: ["show schedule", "capacity planning", "when is available"],
    description: "View/manage shop floor schedule",
    domain: "business",
    priority: 80,
    engines_used: ["SchedulingEngine", "CapacityPlanningEngine"],
    effort_level: "standard",
  },

  // === DATA COMMANDS ===
  {
    name: "/material-lookup",
    type: "command",
    triggers: ["material", "steel", "aluminum", "hardness", "material properties"],
    auto_invoke_patterns: ["what material", "material properties", "look up material"],
    description: "Look up material properties",
    domain: "data",
    priority: 75,
    engines_used: ["MaterialRegistry"],
    effort_level: "quick",
  },
  {
    name: "/tool-select",
    type: "command",
    triggers: ["tool", "insert", "holder", "which tool", "tool selection"],
    auto_invoke_patterns: ["select tool", "recommend tool", "which tool should I use"],
    description: "AI tool selection",
    domain: "data",
    priority: 80,
    engines_used: ["ToolRouterEngine", "SmartToolSelectorEngine"],
    effort_level: "standard",
  },

  // === VERIFICATION COMMANDS ===
  {
    name: "/formula-check",
    type: "command",
    triggers: ["formula", "physics", "validate formula", "kienzle", "taylor", "check physics"],
    auto_invoke_patterns: ["validate formula", "check physics", "is this formula correct"],
    description: "Validate physics formulas against constants",
    domain: "verification",
    priority: 85,
    engines_used: ["KienzleForceModelEngine", "FormulaValidationEngine"],
    effort_level: "quick",
  },
  {
    name: "/verify-loop",
    type: "command",
    triggers: ["verify", "continuous check", "validation loop", "keep checking"],
    auto_invoke_patterns: ["continuous verification", "keep verifying"],
    description: "Continuous verification loop",
    domain: "verification",
    priority: 70,
    engines_used: ["PRISMIntelligenceLayer"],
    effort_level: "intensive",
  },

  // === AI/SMART COMMANDS ===
  {
    name: "/smart",
    type: "command",
    triggers: ["smart", "ai", "intelligent", "auto", "figure it out"],
    auto_invoke_patterns: ["smart mode", "ai mode", "just figure it out", "use ai to"],
    description: "Smart AI-powered task execution",
    domain: "ai",
    priority: 85,
    engines_used: ["DeepAIIntelligenceEngine", "NeuralIntegrationEngine"],
    effort_level: "standard",
  },
  {
    name: "/self-improve",
    type: "command",
    triggers: ["self improve", "enhance", "evolve", "upgrade ai", "make ai better"],
    auto_invoke_patterns: ["improve the ai", "enhance capabilities", "upgrade the system"],
    description: "AI self-improvement cycle",
    domain: "ai",
    priority: 70,
    engines_used: ["AISystemSynchronizerEngine"],
    effort_level: "intensive",
  },

  // === ROADMAP COMMANDS ===
  {
    name: "/continue-roadmap",
    type: "command",
    triggers: ["roadmap", "milestone", "next task", "continue work", "what's next"],
    auto_invoke_patterns: ["continue roadmap", "next milestone", "pick up where we left off"],
    description: "Continue working on PRISM roadmap",
    domain: "development",
    priority: 80,
    engines_used: ["RoadmapExecutorEngine"],
    effort_level: "high",
  },
  {
    name: "/rgs",
    type: "command",
    triggers: ["rgs", "protocol", "systematic", "rigorous"],
    auto_invoke_patterns: ["use rgs", "rgs protocol"],
    description: "RGS protocol for systematic work",
    domain: "development",
    priority: 75,
    engines_used: [],
    effort_level: "high",
  },
];

// ============================================================================
// PATTERN MATCHING ENGINE
// ============================================================================

class PatternMatcher {
  /**
   * Match user input against all capabilities
   */
  match(input: string, context: UserContext): PatternMatch[] {
    const normalizedInput = input.toLowerCase().trim();
    const matches: PatternMatch[] = [];

    for (const capability of CAPABILITY_REGISTRY) {
      const matchResult = this.matchCapability(normalizedInput, capability, context);
      if (matchResult.match_score > 0.3) {
        matches.push(matchResult);
      }
    }

    // Sort by combined score (match_score * context_relevance * priority)
    return matches.sort((a, b) => {
      const scoreA = a.match_score * a.context_relevance * (a.capability.priority / 100);
      const scoreB = b.match_score * b.context_relevance * (b.capability.priority / 100);
      return scoreB - scoreA;
    });
  }

  private matchCapability(input: string, cap: Capability, context: UserContext): PatternMatch {
    const matched_patterns: string[] = [];
    let match_score = 0;

    // Check triggers
    for (const trigger of cap.triggers) {
      if (input.includes(trigger.toLowerCase())) {
        matched_patterns.push(`trigger:${trigger}`);
        match_score += 0.3;
      }
    }

    // Check auto-invoke patterns (weighted higher)
    for (const pattern of cap.auto_invoke_patterns) {
      if (input.includes(pattern.toLowerCase())) {
        matched_patterns.push(`auto:${pattern}`);
        match_score += 0.5;
      }
    }

    // Check for exact command mention
    if (input.includes(cap.name.toLowerCase())) {
      matched_patterns.push(`exact:${cap.name}`);
      match_score += 1.0;
    }

    // Calculate context relevance
    const context_relevance = this.calculateContextRelevance(cap, context);

    // Determine recommended action
    let recommended_action: "invoke" | "suggest" | "inform" = "inform";
    if (match_score >= 0.8 && context_relevance >= 0.6) {
      recommended_action = "invoke";
    } else if (match_score >= 0.5) {
      recommended_action = "suggest";
    }

    return {
      capability: cap,
      match_score: Math.min(match_score, 1.0),
      matched_patterns,
      context_relevance,
      recommended_action,
    };
  }

  private calculateContextRelevance(cap: Capability, context: UserContext): number {
    let relevance = 0.5; // Base relevance

    // Domain match
    if (context.domain_focus === cap.domain) {
      relevance += 0.3;
    }

    // Recent engine overlap
    const engineOverlap = cap.engines_used.filter((e) =>
      context.recent_engines.some((re) => re.includes(e) || e.includes(re))
    ).length;
    relevance += (engineOverlap / Math.max(cap.engines_used.length, 1)) * 0.2;

    return Math.min(relevance, 1.0);
  }
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

export class AIAutoUtilizationEngine {
  private patternMatcher = new PatternMatcher();

  /**
   * Analyze user input and recommend capabilities to utilize
   */
  analyze(input: string, context?: Partial<UserContext>): UtilizationRecommendation {
    const fullContext: UserContext = {
      recent_files: context?.recent_files ?? [],
      recent_engines: context?.recent_engines ?? [],
      domain_focus: context?.domain_focus ?? "",
      session_goals: context?.session_goals ?? [],
      error_history: context?.error_history ?? [],
    };

    const matches = this.patternMatcher.match(input, fullContext);
    const primary = matches.length > 0 ? matches[0] : null;
    const alternatives = matches.slice(1, 4);

    // Determine if we should auto-invoke
    const auto_invoke = primary !== null &&
      primary.recommended_action === "invoke" &&
      primary.match_score >= 0.8;

    // Build command sequence for complex tasks
    const command_sequence = this.buildCommandSequence(input, matches);

    // Generate reasoning
    const reasoning = this.generateReasoning(primary, alternatives, input);

    return {
      primary,
      alternatives,
      reasoning,
      auto_invoke,
      command_sequence,
    };
  }

  /**
   * Get all available capabilities
   */
  listCapabilities(): Capability[] {
    return [...CAPABILITY_REGISTRY];
  }

  /**
   * Get capabilities by type
   */
  getCapabilitiesByType(type: CapabilityType): Capability[] {
    return CAPABILITY_REGISTRY.filter((c) => c.type === type);
  }

  /**
   * Get capabilities by domain
   */
  getCapabilitiesByDomain(domain: string): Capability[] {
    return CAPABILITY_REGISTRY.filter((c) => c.domain === domain);
  }

  /**
   * Get utilization statistics
   */
  getStats(): UtilizationStats {
    const byType = (type: CapabilityType) =>
      CAPABILITY_REGISTRY.filter((c) => c.type === type).length;

    const autoInvokeRules = CAPABILITY_REGISTRY.reduce(
      (sum, c) => sum + c.auto_invoke_patterns.length,
      0
    );

    return {
      total_capabilities: CAPABILITY_REGISTRY.length,
      commands_available: byType("command"),
      skills_available: byType("skill"),
      scripts_available: byType("script"),
      hooks_active: byType("hook"),
      engines_registered: new Set(
        CAPABILITY_REGISTRY.flatMap((c) => c.engines_used)
      ).size,
      auto_invoke_rules: autoInvokeRules,
    };
  }

  /**
   * Check if a specific capability should be suggested for input
   */
  shouldSuggest(capabilityName: string, input: string): boolean {
    const cap = CAPABILITY_REGISTRY.find((c) => c.name === capabilityName);
    if (!cap) return false;

    const normalizedInput = input.toLowerCase();
    return (
      cap.triggers.some((t) => normalizedInput.includes(t.toLowerCase())) ||
      cap.auto_invoke_patterns.some((p) => normalizedInput.includes(p.toLowerCase()))
    );
  }

  /**
   * Get all triggers that match input
   */
  getMatchingTriggers(input: string): { capability: string; trigger: string }[] {
    const normalizedInput = input.toLowerCase();
    const matches: { capability: string; trigger: string }[] = [];

    for (const cap of CAPABILITY_REGISTRY) {
      for (const trigger of cap.triggers) {
        if (normalizedInput.includes(trigger.toLowerCase())) {
          matches.push({ capability: cap.name, trigger });
        }
      }
    }

    return matches;
  }

  // Private helpers

  private buildCommandSequence(input: string, matches: PatternMatch[]): string[] {
    const sequence: string[] = [];
    const normalizedInput = input.toLowerCase();

    // Always start with dedup check if creating something new
    if (
      normalizedInput.includes("create") ||
      normalizedInput.includes("new") ||
      normalizedInput.includes("build") ||
      normalizedInput.includes("forge")
    ) {
      sequence.push("/dedup");
    }

    // Add primary command
    if (matches.length > 0 && matches[0].match_score >= 0.5) {
      sequence.push(matches[0].capability.name);
    }

    // Add follow-up commands based on domain
    if (normalizedInput.includes("optimize") || normalizedInput.includes("improve")) {
      if (!sequence.includes("/program-optimize")) {
        sequence.push("/program-optimize");
      }
    }

    if (normalizedInput.includes("verify") || normalizedInput.includes("check")) {
      if (!sequence.includes("/formula-check")) {
        sequence.push("/formula-check");
      }
    }

    return sequence;
  }

  private generateReasoning(
    primary: PatternMatch | null,
    alternatives: PatternMatch[],
    input: string
  ): string {
    if (!primary) {
      return `No specific capability matched for: "${input.substring(0, 50)}...". Consider using /smart for AI-assisted task routing.`;
    }

    let reasoning = `Detected intent matching ${primary.capability.name} (${primary.capability.description})`;

    if (primary.matched_patterns.length > 0) {
      reasoning += `. Triggers matched: ${primary.matched_patterns.slice(0, 3).join(", ")}`;
    }

    if (alternatives.length > 0) {
      reasoning += `. Also consider: ${alternatives.map((a) => a.capability.name).join(", ")}`;
    }

    if (primary.recommended_action === "invoke") {
      reasoning += ". [AUTO-INVOKE RECOMMENDED]";
    }

    return reasoning;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const aiAutoUtilizationEngine = new AIAutoUtilizationEngine();

log.info(`AIAutoUtilizationEngine initialized — ${CAPABILITY_REGISTRY.length} capabilities, ${
  CAPABILITY_REGISTRY.reduce((sum, c) => sum + c.auto_invoke_patterns.length, 0)
} auto-invoke rules`);
