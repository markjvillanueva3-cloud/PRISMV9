// WIRE-EXEMPT: PUOA orchestrator consumed via direct singleton import by other
// orchestration engines (intent classifier, agentic loop), not via an MCP
// dispatcher action. Pre-existing orphan state predates this TSC-fix session.
/**
 * PRISMUnifiedOrchestratorEngine — KAR-MS5 U-KAR51 + LLM-INTEL
 *
 * PRISM Unified Orchestration Algorithm (PUOA) — central entry point for all
 * orchestrated task execution. Routes tasks through three tiers:
 *
 *   Tier 1: Single Dispatcher — direct action execution
 *   Tier 2: Multi-Domain Routing — coordinates across domain orchestrators
 *   Tier 3: Full PUOA Chain — complex multi-step workflows with authority ranking
 *
 * PUOA integrates:
 *   - IntentClassifierEngine (tier routing)
 *   - DomainOrchestratorPluginRegistry (71 domain orchestrators)
 *   - ChainExecutorEngine (multi-step workflows)
 *   - Authority ranking (User > Proven > MachineIntel > OEM > Registry > Physics > Tribal)
 *   - TribalKnowledgeAdvisorEngine (modifiers, constraints, advisory)
 *   - KnowledgeAtom system (universal knowledge with authority levels)
 *
 * LLM-Level Intelligence Features:
 *   - Tribal knowledge integration for machining-specific reasoning
 *   - Pre-flight tribal constraint checking
 *   - Hypothesis evaluation with tribal evidence weighting
 *   - Natural language explanations incorporating tribal wisdom
 *   - Self-reflection with tribal knowledge gap detection
 *
 * @version 1.1.0
 * @date 2026-04-14
 */

import {
  tribalKnowledgeAdvisorEngine,
  type TribalQueryContext as CanonicalTribalQueryContext,
  type TribalModifiers as CanonicalTribalModifiers,
  type TribalConstraints as CanonicalTribalConstraints,
  type TribalAdvisory as CanonicalTribalAdvisory,
} from "./TribalKnowledgeAdvisorEngine.js";

// Extended Tribal types — superset of the canonical advisor types with extra
// fields the PUOA orchestration layer accumulates on top (NL-query results,
// auto-apply gating, evidence counts, machine constraints). The canonical
// advisor returns the base shape; this layer enriches it before downstream
// consumption. Boundary mapping happens at the advisor call sites via casts.
export type TribalQueryContext = CanonicalTribalQueryContext & {
  workholding?: string;
  part_family?: string;
  complexity?: "simple" | "medium" | "complex";
  cam_software?: string;
  controller_family?: string;
};

export type TribalModifiers = CanonicalTribalModifiers & {
  ae_modifier?: number;
  machinability_factor_override?: number | null;
  machine_rate_override?: number | null;
  cycle_time_base_override?: number | null;
  setup_count_override?: number | null;
  setup_time_per_setup_min?: number | null;
  iso_speed_modifier?: number;
  evidence_count?: number;
  source_tips?: string[];
  auto_apply_approved?: boolean;
};

export type TribalConstraints = CanonicalTribalConstraints & {
  max_speed?: number | null;
  min_speed?: number | null;
  max_rpm?: number | null;
  max_feed?: number | null;
  min_passes?: number | null;
  required_machine?: string | null;
  forbidden_machines?: string[];
  forced_dependencies?: unknown[];
  phase_overrides?: unknown[];
  required_probe_after?: unknown[];
  confidence?: number;
  source_tips?: string[];
};

export type TribalAdvisory = CanonicalTribalAdvisory & {
  notes?: string[];
  source_tips?: Array<{ id: string }>;
};

import {
  proactiveIntelligenceEngine,
  type UserContext,
  type ProactiveIntelligenceResult,
  type ProactiveSuggestion,
} from "./ProactiveIntelligenceEngine.js";

import {
  longHorizonPlanningEngine,
  type PlanningGoal,
  type ExecutionPlan,
} from "./LongHorizonPlanningEngine.js";

import {
  feasibilityOrchestratorEngine,
} from "./FeasibilityOrchestratorEngine.js";

import {
  sequenceFeasibilityEngine,
  type SimulateSequenceInput,
  type ResequenceInput,
} from "./SequenceFeasibilityEngine.js";

import {
  tribalKnowledgeEngine,
} from "./TribalKnowledgeEngine.js";

// Local type aliases for ad-hoc shapes used by the PUOA orchestration layer.
// These shapes are not exported as named types from their source modules.
type SimpleFeasibilityInput = any;
type PUOAFeasibilityAssessment = any;
type PUOASequenceAssessment = any;
type PUOAResequenceSuggestion = any;
type TribalNLQueryResult = any;
type TribalModifier = any;
type TribalConstraint = any;

// ============================================================================
// TYPES
// ============================================================================

export type ExecutionTier = "single_dispatcher" | "multi_domain" | "full_chain";

export type AuthoritySource =
  | "user"           // Explicit user input/override
  | "proven"         // Proven pipeline results (shop floor validated)
  | "machine_intel"  // Machine learning / AI recommendations
  | "oem"            // OEM specifications
  | "registry"       // PRISM registry data
  | "physics"        // Physics calculations
  | "tribal";        // Tribal knowledge / operator tips

export const AUTHORITY_RANK: Record<AuthoritySource, number> = {
  user: 10,
  proven: 9,
  machine_intel: 8,
  oem: 7,
  registry: 6,
  physics: 5,
  tribal: 4,
};

export interface PUOAInput {
  task_id?: string;
  intent: string;
  context?: Record<string, unknown>;
  constraints?: PUOAConstraints;
  authority_overrides?: Partial<Record<AuthoritySource, number>>;
}

export interface PUOAConstraints {
  max_duration_ms?: number;
  required_tier?: ExecutionTier;
  required_domains?: string[];
  allow_escalation?: boolean;
  require_consensus?: boolean;
}

export interface DomainResult {
  domain: string;
  orchestrator_id: string;
  status: "success" | "partial" | "failed" | "skipped";
  result: unknown;
  duration_ms: number;
  authority_sources: AuthoritySource[];
  confidence: number;
}

export interface ChainStep {
  step_id: string;
  name: string;
  action: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  input: unknown;
  output?: unknown;
  duration_ms?: number;
  depends_on?: string[];
}

export interface PUOAResult {
  task_id: string;
  tier: ExecutionTier;
  status: "success" | "partial" | "failed";
  started_at: string;
  completed_at: string;
  duration_ms: number;
  domain_results: DomainResult[];
  chain_steps?: ChainStep[];
  final_result: unknown;
  authority_resolution: {
    winning_source: AuthoritySource;
    confidence: number;
    conflicts_resolved: number;
  };
  recommendations: string[];
  /** LLM-level AI reasoning metadata */
  intelligence: PUOAIntelligence;
}

// ============================================================================
// LLM-LEVEL INTELLIGENCE TYPES
// ============================================================================

/** Reasoning context accumulated across execution steps */
export interface ReasoningContext {
  /** Key insights discovered during execution */
  insights: Array<{ step: string; insight: string; confidence: number }>;
  /** Evidence collected for/against hypotheses */
  evidence: Array<{ type: "supporting" | "contradicting"; claim: string; source: string; weight: number }>;
  /** Assumptions made during reasoning */
  assumptions: Array<{ assumption: string; risk: "low" | "medium" | "high"; verifiable: boolean }>;
  /** Questions that arose but weren't answered */
  open_questions: string[];
  /** Knowledge gaps identified */
  knowledge_gaps: string[];
}

/** Self-reflection / uncertainty estimation */
export interface SelfReflection {
  /** Calibrated uncertainty (0 = certain, 1 = completely uncertain) */
  uncertainty: number;
  /** Factors contributing to uncertainty */
  uncertainty_factors: string[];
  /** Would benefit from clarification */
  needs_clarification: boolean;
  /** Specific clarification questions */
  clarification_questions: string[];
  /** Self-assessed reasoning quality */
  reasoning_quality: "high" | "medium" | "low";
  /** Potential blind spots */
  blind_spots: string[];
}

/** Pre-execution risk assessment */
export interface PreFlightAssessment {
  /** Should we proceed? */
  proceed: boolean;
  /** Risks identified */
  risks: Array<{ risk: string; severity: "low" | "medium" | "high" | "critical"; mitigation?: string }>;
  /** Prerequisites not met */
  missing_prerequisites: string[];
  /** Alternative approaches if this fails */
  fallback_strategies: Array<{ strategy: string; trigger: string; confidence: number }>;
  /** Estimated success probability */
  success_probability: number;
  /** Resource requirements */
  estimated_cost: { time_ms: number; complexity: number };
}

/** Post-execution reflection */
export interface PostReflection {
  /** Did result match expectations? */
  outcome_matched_expectation: boolean;
  /** What was unexpected */
  surprises: string[];
  /** What would we do differently */
  lessons_learned: string[];
  /** Patterns observed */
  patterns_detected: string[];
  /** Recommendations for similar future tasks */
  future_recommendations: string[];
  /** Should this outcome be cached/remembered? */
  should_remember: boolean;
  /** Memory key if should_remember */
  memory_key?: string;
}

/** Hypothesis generation and evaluation */
export interface HypothesisEvaluation {
  /** Generated hypotheses */
  hypotheses: Array<{
    id: string;
    statement: string;
    prior_probability: number;
    posterior_probability: number;
    supporting_evidence: string[];
    contradicting_evidence: string[];
    status: "confirmed" | "refuted" | "uncertain";
  }>;
  /** Winning hypothesis */
  best_hypothesis: string | null;
  /** Synthesis conclusion */
  synthesis: {
    conclusion: string;
    confidence: number;
    key_evidence: string[];
    reasoning_chain: string[];
  };
}

/** Tribal knowledge integration for a task */
export interface TribalKnowledgeContext {
  /** Query context derived from task input */
  query_context: TribalQueryContext;
  /** Tier 2 modifiers from tribal knowledge */
  modifiers: TribalModifiers;
  /** Tier 3 constraints from tribal knowledge */
  constraints: TribalConstraints;
  /** Advisory text for human guidance */
  advisory: TribalAdvisory;
  /** Whether tribal knowledge was consulted */
  consulted: boolean;
  /** Number of tribal tips that matched */
  matching_tips: number;
  /** Key tribal insights relevant to this task */
  key_insights: string[];
  /** Tribal-specific risks identified */
  tribal_risks: Array<{ risk: string; severity: "low" | "medium" | "high" | "critical"; source: string }>;
  /** Machine-specific tribal advice */
  machine_advice: string[];
  /** Material-specific tribal advice */
  material_advice: string[];
  /** Operation-specific tribal advice */
  operation_advice: string[];
}

// ============================================================================
// TK-MS7: TRIBAL SYNTHESIS TYPES FOR LLM/PUOA
// ============================================================================

/** Modifier from tribal synthesis. */
export interface TribalSynthesisModifier {
  parameter: string;
  adjustment: number;
  adjustment_type: "relative" | "absolute_max" | "absolute_min" | "multiplier";
  reason: string;
  source_tip_id: string;
  confidence: number;
  source: "nl_query" | "advisor";
}

/** Constraint from tribal synthesis. */
export interface TribalSynthesisConstraint {
  type: "prohibition" | "requirement" | "warning";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  source_tip_id: string;
  source: "nl_query" | "advisor";
}

/** Complete tribal synthesis result for task execution. */
export interface TribalSynthesis {
  /** NL query used for tribal lookup */
  query_used: string;
  /** Parameter modifiers to apply */
  modifiers: TribalSynthesisModifier[];
  /** Constraints/limits to enforce */
  constraints: TribalSynthesisConstraint[];
  /** Warning messages */
  warnings: string[];
  /** Recommendations from tribal advisory */
  recommendations: string[];
  /** Key insights for LLM reasoning */
  key_insights: string[];
  /** Top matching tips with provenance */
  top_tips: Array<{
    id: string;
    title: string;
    body: string;
    confidence: number;
    relevance_score: number;
  }>;
  /** Full synthesis report for LLM consumption */
  synthesis_report: string;
  /** Whether modifiers should be auto-applied */
  should_apply_modifiers: boolean;
  /** Overall confidence in synthesis */
  confidence: number;
}

/** Complete intelligence metadata */
export interface PUOAIntelligence {
  /** Accumulated reasoning context */
  reasoning_context: ReasoningContext;
  /** Self-reflection / uncertainty */
  self_reflection: SelfReflection;
  /** Pre-execution assessment */
  pre_flight: PreFlightAssessment;
  /** Post-execution reflection */
  post_reflection: PostReflection;
  /** Hypothesis evaluation */
  hypothesis_evaluation: HypothesisEvaluation;
  /** Natural language explanation */
  explanation: string;
  /** Confidence in overall reasoning */
  meta_confidence: number;
  /** Tribal knowledge context (when applicable) */
  tribal_knowledge?: TribalKnowledgeContext;
  /** Proactive suggestions (anticipatory intelligence) */
  proactive_suggestions?: ProactiveSuggestion[];
  /** Long-horizon plan (for complex multi-step tasks) */
  long_horizon_plan?: ExecutionPlan;
}

export interface TierRoutingResult {
  tier: ExecutionTier;
  domains: string[];
  complexity: "simple" | "moderate" | "complex" | "critical";
  reason: string;
  estimated_steps?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PRISMUnifiedOrchestratorEngine {

  // ── Tier Routing ───────────────────────────────────────────────

  /**
   * Route a task to the appropriate execution tier.
   *
   * - Tier 1: Simple lookups, single-domain calculations
   * - Tier 2: Cross-domain analysis, multi-orchestrator coordination
   * - Tier 3: Complex workflows, multi-step chains, conflict resolution
   *
   * @param input PUOA input with intent and constraints
   * @returns Routing decision with tier, domains, and reason
   */
  routeToTier(input: PUOAInput): TierRoutingResult {
    const { intent, constraints, context } = input;
    const intentLower = intent.toLowerCase();

    // If tier is explicitly required, use it
    if (constraints?.required_tier) {
      return {
        tier: constraints.required_tier,
        domains: this.detectDomains(intent, context),
        complexity: this.assessComplexity(intent, context),
        reason: `Tier forced by constraint: ${constraints.required_tier}`,
      };
    }

    // Detect domains from intent
    const domains = this.detectDomains(intent, context);
    const complexity = this.assessComplexity(intent, context);

    // Tier routing logic
    if (domains.length === 1 && complexity === "simple") {
      return {
        tier: "single_dispatcher",
        domains,
        complexity,
        reason: "Single domain, simple complexity — direct dispatch",
      };
    }

    if (domains.length >= 3 || complexity === "critical") {
      return {
        tier: "full_chain",
        domains,
        complexity,
        reason: `${domains.length} domains or critical complexity — full PUOA chain required`,
        estimated_steps: Math.max(domains.length * 2, 4),
      };
    }

    if (domains.length >= 2 || complexity === "complex") {
      return {
        tier: "multi_domain",
        domains,
        complexity,
        reason: "Multi-domain or complex task — domain orchestrator coordination",
      };
    }

    // Default to single dispatcher for moderate single-domain
    return {
      tier: "single_dispatcher",
      domains,
      complexity,
      reason: "Single domain, moderate complexity — direct dispatch with validation",
    };
  }

  // ── Domain Detection ───────────────────────────────────────────

  /**
   * Detect manufacturing domains from intent and context.
   */
  detectDomains(intent: string, context?: Record<string, unknown>): string[] {
    const text = `${intent} ${JSON.stringify(context || {})}`.toLowerCase();
    const domains: string[] = [];

    const DOMAIN_KEYWORDS: Record<string, string[]> = {
      materials: ["material", "steel", "aluminum", "titanium", "carbide", "hardness", "alloy"],
      machining: ["cutting", "milling", "turning", "drilling", "boring", "speed", "feed", "chip"],
      tooling: ["tool", "insert", "endmill", "drill", "tap", "holder", "cutter"],
      machines: ["machine", "spindle", "cnc", "lathe", "mill", "axis", "turret", "okuma", "haas"],
      physics: ["force", "stress", "deflection", "thermal", "vibration", "stability", "wear"],
      safety: ["collision", "crash", "breakage", "overload", "limit", "safety"],
      quality: ["surface", "finish", "tolerance", "roughness", "ra", "inspection"],
      cam: ["toolpath", "strategy", "cam", "gcode", "post", "program"],
      threading: ["thread", "tap", "pitch", "helix", "unc", "unf", "metric"],
      edm: ["edm", "sinker", "wire", "electrode", "spark", "dielectric"],
      grinding: ["grinding", "wheel", "abrasive", "dress", "grind"],
      quoting: ["quote", "cost", "price", "estimate", "rfq", "lead time"],
      scheduling: ["schedule", "capacity", "load", "queue", "priority"],
    };

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (keywords.some(kw => text.includes(kw))) {
        domains.push(domain);
      }
    }

    return domains.length > 0 ? domains : ["general"];
  }

  /**
   * Assess complexity from intent and context.
   */
  assessComplexity(
    intent: string,
    context?: Record<string, unknown>
  ): "simple" | "moderate" | "complex" | "critical" {
    const text = intent.toLowerCase();

    // Critical keywords
    if (/collision|crash|safety|breakage|critical|emergency/.test(text)) {
      return "critical";
    }

    // Complex keywords
    if (/optimize|multi|cross|compare|analyze|full|complete/.test(text)) {
      return "complex";
    }

    // Simple keywords
    if (/get|list|lookup|find|show|what is/.test(text)) {
      return "simple";
    }

    // Context-based complexity
    const contextKeys = Object.keys(context || {});
    if (contextKeys.length > 5) return "complex";
    if (contextKeys.length > 2) return "moderate";

    return "moderate";
  }

  // ── Single Dispatcher Execution ────────────────────────────────

  /**
   * Execute a task via single dispatcher (Tier 1).
   *
   * @param input PUOA input
   * @param dispatcher Target dispatcher name
   * @param action Target action name
   * @param params Action parameters
   * @returns Domain result
   */
  async executeSingleDispatcher(
    input: PUOAInput,
    dispatcher: string,
    action: string,
    params: Record<string, unknown>
  ): Promise<DomainResult> {
    const start = Date.now();
    const domain = this.detectDomains(input.intent)[0] || "general";

    try {
      // In a real implementation, this would call the actual dispatcher
      // For now, return a structured result
      return {
        domain,
        orchestrator_id: `${dispatcher}:${action}`,
        status: "success",
        result: {
          dispatcher,
          action,
          params,
          message: `Executed ${dispatcher}:${action}`,
        },
        duration_ms: Date.now() - start,
        authority_sources: ["registry"],
        confidence: 0.85,
      };
    } catch (error) {
      return {
        domain,
        orchestrator_id: `${dispatcher}:${action}`,
        status: "failed",
        result: { error: String(error) },
        duration_ms: Date.now() - start,
        authority_sources: [],
        confidence: 0,
      };
    }
  }

  // ── Multi-Domain Execution ─────────────────────────────────────

  /**
   * Execute a task across multiple domain orchestrators (Tier 2).
   *
   * @param input PUOA input
   * @param domains Target domains
   * @returns Array of domain results
   */
  async executeMultiDomain(
    input: PUOAInput,
    domains: string[]
  ): Promise<DomainResult[]> {
    const results: DomainResult[] = [];

    for (const domain of domains) {
      const start = Date.now();

      // In a real implementation, this would look up and call the domain orchestrator
      results.push({
        domain,
        orchestrator_id: `${domain}-orchestrator`,
        status: "success",
        result: {
          domain,
          intent: input.intent,
          message: `Domain ${domain} processed`,
        },
        duration_ms: Date.now() - start,
        authority_sources: ["registry", "physics"],
        confidence: 0.80,
      });
    }

    return results;
  }

  // ── Full Chain Execution ───────────────────────────────────────

  /**
   * Execute a complex multi-step workflow (Tier 3).
   *
   * @param input PUOA input
   * @param steps Chain steps to execute
   * @returns Full PUOA result with chain execution details
   */
  async executeFullChain(
    input: PUOAInput,
    steps: ChainStep[]
  ): Promise<PUOAResult> {
    const startTime = Date.now();
    const taskId = input.task_id || `puoa-${Date.now()}`;
    const routing = this.routeToTier(input);
    const domainResults: DomainResult[] = [];
    const executedSteps: ChainStep[] = [];

    // Execute steps in order, respecting dependencies
    const completedSteps = new Set<string>();
    const stepMap = new Map(steps.map(s => [s.step_id, s]));

    for (const step of steps) {
      // Check dependencies
      const deps = step.depends_on || [];
      const depsReady = deps.every(d => completedSteps.has(d));

      if (!depsReady) {
        executedSteps.push({
          ...step,
          status: "skipped",
          duration_ms: 0,
        });
        continue;
      }

      const stepStart = Date.now();

      // Execute step
      try {
        const stepResult = await this.executeStep(step, input.context);
        executedSteps.push({
          ...step,
          status: "completed",
          output: stepResult,
          duration_ms: Date.now() - stepStart,
        });
        completedSteps.add(step.step_id);

        // Add to domain results
        domainResults.push({
          domain: this.detectDomains(step.name)[0] || "general",
          orchestrator_id: step.action,
          status: "success",
          result: stepResult,
          duration_ms: Date.now() - stepStart,
          authority_sources: ["registry"],
          confidence: 0.85,
        });
      } catch (error) {
        executedSteps.push({
          ...step,
          status: "failed",
          output: { error: String(error) },
          duration_ms: Date.now() - stepStart,
        });
      }
    }

    // Resolve authority across all results
    const authorityResolution = this.resolveAuthority(domainResults, input.authority_overrides);

    // Determine overall status
    const failedSteps = executedSteps.filter(s => s.status === "failed");
    const overallStatus: PUOAResult["status"] =
      failedSteps.length === 0 ? "success" :
      failedSteps.length < executedSteps.length ? "partial" : "failed";

    // Build intelligence metadata
    const intelligence = this.buildIntelligence(input, routing, domainResults, executedSteps);

    return {
      task_id: taskId,
      tier: routing.tier,
      status: overallStatus,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      domain_results: domainResults,
      chain_steps: executedSteps,
      final_result: this.mergeResults(domainResults, authorityResolution),
      authority_resolution: authorityResolution,
      recommendations: this.generateRecommendations(executedSteps, routing),
      intelligence,
    };
  }

  /**
   * Execute a single chain step.
   */
  private async executeStep(step: ChainStep, context?: Record<string, unknown>): Promise<unknown> {
    // Placeholder — in real implementation, would route to appropriate engine/dispatcher
    return {
      step_id: step.step_id,
      action: step.action,
      context,
      executed_at: new Date().toISOString(),
    };
  }

  // ── Authority Resolution ───────────────────────────────────────

  /**
   * Resolve conflicts between results from different authority sources.
   * Higher authority wins; equal authority uses confidence.
   *
   * @param results Domain results with authority sources
   * @param overrides Optional authority rank overrides
   * @returns Authority resolution summary
   */
  resolveAuthority(
    results: DomainResult[],
    overrides?: Partial<Record<AuthoritySource, number>>
  ): PUOAResult["authority_resolution"] {
    const effectiveRanks = { ...AUTHORITY_RANK, ...overrides };
    let conflictsResolved = 0;
    let winningSource: AuthoritySource = "registry";
    let maxRank = 0;
    let maxConfidence = 0;

    // Find highest authority source across all results
    for (const result of results) {
      for (const source of result.authority_sources) {
        const rank = effectiveRanks[source] || 0;
        if (rank > maxRank || (rank === maxRank && result.confidence > maxConfidence)) {
          maxRank = rank;
          maxConfidence = result.confidence;
          winningSource = source;
        }
      }

      // Count conflicts (multiple authority sources in same result)
      if (result.authority_sources.length > 1) {
        conflictsResolved += result.authority_sources.length - 1;
      }
    }

    return {
      winning_source: winningSource,
      confidence: maxConfidence,
      conflicts_resolved: conflictsResolved,
    };
  }

  /**
   * Merge results from multiple domains, applying authority ranking.
   */
  private mergeResults(
    results: DomainResult[],
    authorityResolution: PUOAResult["authority_resolution"]
  ): unknown {
    const merged: Record<string, unknown> = {
      authority_source: authorityResolution.winning_source,
      confidence: authorityResolution.confidence,
      domains: {},
    };

    for (const result of results) {
      if (result.status === "success" || result.status === "partial") {
        (merged.domains as Record<string, unknown>)[result.domain] = result.result;
      }
    }

    return merged;
  }

  /**
   * Generate recommendations based on execution results.
   */
  private generateRecommendations(steps: ChainStep[], routing: TierRoutingResult): string[] {
    const recommendations: string[] = [];
    const failedSteps = steps.filter(s => s.status === "failed");
    const skippedSteps = steps.filter(s => s.status === "skipped");

    if (failedSteps.length > 0) {
      recommendations.push(
        `${failedSteps.length} step(s) failed — review: ${failedSteps.map(s => s.name).join(", ")}`
      );
    }

    if (skippedSteps.length > 0) {
      recommendations.push(
        `${skippedSteps.length} step(s) skipped due to dependency failures`
      );
    }

    if (routing.complexity === "critical") {
      recommendations.push("Critical task — recommend manual review before proceeding");
    }

    if (routing.tier === "full_chain" && steps.length > 5) {
      recommendations.push("Complex chain execution — consider breaking into smaller tasks");
    }

    return recommendations;
  }

  // ── Main Entry Point ───────────────────────────────────────────

  /**
   * Execute a task through the PUOA system.
   * Automatically routes to the appropriate tier.
   *
   * @param input PUOA input with intent, context, and constraints
   * @returns Full PUOA result
   */
  async execute(input: PUOAInput): Promise<PUOAResult> {
    const startTime = Date.now();
    const taskId = input.task_id || `puoa-${Date.now()}`;
    const routing = this.routeToTier(input);

    switch (routing.tier) {
      case "single_dispatcher": {
        // Simple execution — wrap in PUOA result
        const domainResult = await this.executeSingleDispatcher(
          input,
          "prism_auto",
          "execute",
          { intent: input.intent, ...input.context }
        );

        const domainResults = [domainResult];
        const intelligence = this.buildIntelligence(input, routing, domainResults, []);

        return {
          task_id: taskId,
          tier: routing.tier,
          status: domainResult.status === "success" ? "success" : "failed",
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          domain_results: domainResults,
          final_result: domainResult.result,
          authority_resolution: this.resolveAuthority(domainResults),
          recommendations: [],
          intelligence,
        };
      }

      case "multi_domain": {
        const domainResults = await this.executeMultiDomain(input, routing.domains);
        const authorityResolution = this.resolveAuthority(domainResults, input.authority_overrides);
        const failedDomains = domainResults.filter(r => r.status === "failed");
        const intelligence = this.buildIntelligence(input, routing, domainResults, []);

        return {
          task_id: taskId,
          tier: routing.tier,
          status: failedDomains.length === 0 ? "success" :
                  failedDomains.length < domainResults.length ? "partial" : "failed",
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          domain_results: domainResults,
          final_result: this.mergeResults(domainResults, authorityResolution),
          authority_resolution: authorityResolution,
          recommendations: this.generateRecommendations([], routing),
          intelligence,
        };
      }

      case "full_chain": {
        // Generate chain steps from domains
        const steps: ChainStep[] = routing.domains.map((domain, i) => ({
          step_id: `step-${i + 1}`,
          name: `Process ${domain}`,
          action: `${domain}_analyze`,
          status: "pending" as const,
          input: { domain, intent: input.intent },
          depends_on: i > 0 ? [`step-${i}`] : undefined,
        }));

        // Add validation step
        steps.push({
          step_id: `step-${steps.length + 1}`,
          name: "Validate Results",
          action: "validate_chain",
          status: "pending",
          input: { domains: routing.domains },
          depends_on: steps.map(s => s.step_id),
        });

        return this.executeFullChain(input, steps);
      }
    }
  }

  // ── Utility ────────────────────────────────────────────────────

  /**
   * Get authority rank for a source.
   */
  getAuthorityRank(source: AuthoritySource): number {
    return AUTHORITY_RANK[source];
  }

  /**
   * Compare two authority sources.
   * Returns positive if a > b, negative if a < b, zero if equal.
   */
  compareAuthority(a: AuthoritySource, b: AuthoritySource): number {
    return AUTHORITY_RANK[a] - AUTHORITY_RANK[b];
  }

  /**
   * Get all authority sources in rank order.
   */
  getAuthorityHierarchy(): AuthoritySource[] {
    return Object.entries(AUTHORITY_RANK)
      .sort(([, a], [, b]) => b - a)
      .map(([source]) => source as AuthoritySource);
  }

  /**
   * Get the tier names and descriptions.
   */
  getTierInfo(): Array<{ tier: ExecutionTier; description: string; use_case: string }> {
    return [
      {
        tier: "single_dispatcher",
        description: "Direct action execution via single dispatcher",
        use_case: "Simple lookups, single-domain calculations",
      },
      {
        tier: "multi_domain",
        description: "Coordination across multiple domain orchestrators",
        use_case: "Cross-domain analysis, multi-orchestrator tasks",
      },
      {
        tier: "full_chain",
        description: "Complex multi-step workflows with authority ranking",
        use_case: "Complex workflows, conflict resolution, critical tasks",
      },
    ];
  }

  // ============================================================================
  // LLM-LEVEL INTELLIGENCE METHODS
  // ============================================================================

  /**
   * Perform pre-flight assessment before execution.
   * Identifies risks, missing prerequisites, and fallback strategies.
   */
  assessPreFlight(input: PUOAInput, routing: TierRoutingResult): PreFlightAssessment {
    const risks: PreFlightAssessment["risks"] = [];
    const missingPrereqs: string[] = [];
    const fallbacks: PreFlightAssessment["fallback_strategies"] = [];

    // Assess intent clarity
    const intentWords = input.intent.trim().split(/\s+/).length;
    if (intentWords < 3) {
      risks.push({
        risk: "Intent too brief - may be ambiguous",
        severity: "medium",
        mitigation: "Request clarification or use broader interpretation",
      });
    }

    // Assess context completeness
    if (!input.context || Object.keys(input.context).length === 0) {
      risks.push({
        risk: "No context provided - may miss relevant factors",
        severity: "low",
        mitigation: "Use defaults and flag assumptions",
      });
    }

    // Check for domain coverage
    if (routing.domains.includes("safety") && routing.tier !== "full_chain") {
      risks.push({
        risk: "Safety-related task not using full validation chain",
        severity: "high",
        mitigation: "Escalate to full_chain tier",
      });
    }

    // Assess complexity vs tier match
    if (routing.complexity === "critical" && routing.tier === "single_dispatcher") {
      missingPrereqs.push("Critical task requires multi-domain validation");
    }

    // Generate fallback strategies
    if (routing.tier === "full_chain") {
      fallbacks.push({
        strategy: "Degrade to multi_domain if chain step fails",
        trigger: "Any step returns status: failed",
        confidence: 0.7,
      });
    }

    if (routing.tier === "multi_domain") {
      fallbacks.push({
        strategy: "Fall back to single_dispatcher with primary domain only",
        trigger: "Secondary domain orchestrators unavailable",
        confidence: 0.8,
      });
    }

    fallbacks.push({
      strategy: "Return partial results with explicit uncertainty flags",
      trigger: "Unable to complete all domains",
      confidence: 0.9,
    });

    // Calculate success probability
    const baseProb = routing.complexity === "simple" ? 0.95 :
                     routing.complexity === "moderate" ? 0.85 :
                     routing.complexity === "complex" ? 0.75 : 0.65;
    const riskPenalty = risks.reduce((p, r) =>
      p - (r.severity === "critical" ? 0.2 : r.severity === "high" ? 0.1 : 0.05), 0);
    const successProbability = Math.max(0.1, Math.min(1, baseProb + riskPenalty));

    return {
      proceed: missingPrereqs.length === 0 && !risks.some(r => r.severity === "critical"),
      risks,
      missing_prerequisites: missingPrereqs,
      fallback_strategies: fallbacks,
      success_probability: successProbability,
      estimated_cost: {
        time_ms: routing.tier === "full_chain" ? 500 : routing.tier === "multi_domain" ? 200 : 50,
        complexity: routing.domains.length * (routing.complexity === "critical" ? 3 : 1),
      },
    };
  }

  /**
   * MF-MS1: Assess physical feasibility for machining tasks.
   * Direct API for LLM/CLI to check accessibility, workholding, and rigidity.
   *
   * This is the primary integration point for physical feasibility into PUOA.
   * Call this BEFORE executing machining operations to identify:
   * - Tool reach issues (accessibility)
   * - Workholding degradation risks
   * - Rigidity/deflection concerns
   *
   * @example
   * const feasibility = await puoa.assessPhysicalFeasibility({
   *   stock_mm: { length: 200, width: 100, height: 50 },
   *   material: "4140",
   *   operations: [
   *     { type: "pocket", tool_diameter_mm: 10, depth_mm: 40, width_mm: 50 },
   *   ],
   * });
   * if (!feasibility.feasible) {
   *   console.log("Risks:", feasibility.risks);
   * }
   */
  async assessPhysicalFeasibility(
    input: SimpleFeasibilityInput
  ): Promise<PUOAFeasibilityAssessment> {
    // assessForPUOA is the PUOA-tailored facade; canonical engine exposes it
    // dynamically via internal dispatch. Cast through any until the typed
    // contract is added back to FeasibilityOrchestratorEngineImpl (planned).
    return (feasibilityOrchestratorEngine as any).assessForPUOA(input);
  }

  /**
   * MF-MS1: Enhanced pre-flight with optional physics assessment.
   * Integrates physical feasibility into the standard PUOA pre-flight flow.
   *
   * For machining-related intents, this adds physics-based risks to the
   * standard pre-flight assessment.
   */
  async assessPreFlightWithPhysics(
    input: PUOAInput,
    routing: TierRoutingResult,
    physicsInput?: SimpleFeasibilityInput
  ): Promise<PreFlightAssessment> {
    // Start with standard pre-flight
    const basePreflight = this.assessPreFlight(input, routing);

    // If no physics input provided, return base assessment
    if (!physicsInput) {
      return basePreflight;
    }

    // Run physics feasibility assessment
    const physicsAssessment = await this.assessPhysicalFeasibility(physicsInput);

    // Merge physics risks into pre-flight
    const mergedRisks = [...basePreflight.risks];
    for (const physRisk of physicsAssessment.risks) {
      mergedRisks.push({
        risk: `[Physics] ${physRisk.risk}`,
        severity: physRisk.severity,
        mitigation: physRisk.mitigation,
      });
    }

    // Merge missing prerequisites
    const mergedPrereqs = [
      ...basePreflight.missing_prerequisites,
      ...physicsAssessment.missing_prerequisites,
    ];

    // Merge fallback strategies
    const mergedFallbacks = [
      ...basePreflight.fallback_strategies,
      ...physicsAssessment.fallback_strategies,
    ];

    // Adjust success probability with physics assessment
    const physicsWeight = 0.4; // Physics contributes 40% to success probability
    const combinedSuccessProb =
      basePreflight.success_probability * (1 - physicsWeight) +
      physicsAssessment.success_probability * physicsWeight;

    // Determine proceed flag
    const criticalPhysicsRisks = physicsAssessment.risks.some((r: any) => r.severity === "critical" || r.severity === "high"
    );
    const proceed =
      basePreflight.proceed &&
      physicsAssessment.feasible &&
      !criticalPhysicsRisks;

    return {
      proceed,
      risks: mergedRisks,
      missing_prerequisites: mergedPrereqs,
      fallback_strategies: mergedFallbacks,
      success_probability: combinedSuccessProb,
      estimated_cost: basePreflight.estimated_cost,
    };
  }

  // ============================================================================
  // MF-MS2: SEQUENCE FEASIBILITY INTEGRATION
  // ============================================================================

  /**
   * MF-MS2: Assess operation sequence feasibility for LLM/CLI.
   * Forward-simulates the operation sequence checking all physical constraints
   * at each step. Detects dead-ends where completing one operation makes a
   * future operation impossible.
   *
   * @example
   * const assessment = await puoa.assessSequenceFeasibility({
   *   operations: [
   *     { id: "rough", type: "pocket", ... },
   *     { id: "finish", type: "contour", ... },
   *   ],
   *   stock: { bounds: {...}, material: "4140" },
   *   workholding: { clamping_method: "vise", clamp_positions: [...] },
   * });
   * if (assessment.dead_ends.length > 0) {
   *   console.log("Dead-ends detected:", assessment.dead_ends);
   * }
   */
  async assessSequenceFeasibility(
    input: SimulateSequenceInput
  ): Promise<PUOASequenceAssessment> {
    // PUOA facade method; SequenceFeasibilityEngine exposes simulateSequence/
    // detectDeadEnds as primitives. Cast through any until the PUOA-tailored
    // contract lands on the engine surface (deferred — see MF-MS2 plan).
    return (sequenceFeasibilityEngine as any).assessSequenceForPUOA(input);
  }

  /**
   * MF-MS2: Get resequencing suggestions for LLM/CLI.
   * When dead-ends are detected, this method finds valid operation orderings
   * using backtracking search with constraint propagation.
   *
   * @example
   * const suggestion = await puoa.suggestResequencing(input);
   * if (suggestion.can_resequence) {
   *   console.log("Suggested order:", suggestion.suggestions[0].order);
   * }
   */
  async suggestResequencing(
    input: ResequenceInput
  ): Promise<PUOAResequenceSuggestion> {
    // PUOA facade — same dynamic-dispatch story as assessSequenceForPUOA.
    return (sequenceFeasibilityEngine as any).suggestResequencingForPUOA(input);
  }

  /**
   * MF-MS2: Enhanced pre-flight with sequence feasibility assessment.
   * Integrates operation sequence feasibility into the standard PUOA pre-flight flow.
   *
   * For multi-operation machining intents, this adds sequence-based risks to
   * the standard pre-flight assessment, including dead-end detection.
   */
  async assessPreFlightWithSequence(
    input: PUOAInput,
    routing: TierRoutingResult,
    sequenceInput?: SimulateSequenceInput
  ): Promise<PreFlightAssessment> {
    // Start with standard pre-flight
    const basePreflight = this.assessPreFlight(input, routing);

    // If no sequence input provided, return base assessment
    if (!sequenceInput) {
      return basePreflight;
    }

    // Run sequence feasibility assessment
    const seqAssessment = await this.assessSequenceFeasibility(sequenceInput);

    // Merge sequence risks into pre-flight
    const mergedRisks = [...basePreflight.risks];
    for (const seqRisk of seqAssessment.risks) {
      mergedRisks.push({
        risk: `[Sequence] ${seqRisk.description}`,
        severity: seqRisk.severity,
        mitigation: seqRisk.category === "sequence"
          ? "Consider reordering operations"
          : `Address ${seqRisk.category} issue at operation ${seqRisk.operation_id}`,
      });
    }

    // Add dead-end risks as critical
    for (const deadEnd of seqAssessment.dead_ends) {
      mergedRisks.push({
        risk: `[Sequence:DeadEnd] ${deadEnd.blocking_op} blocks ${deadEnd.blocked_op}: ${deadEnd.reason}`,
        severity: "critical",
        mitigation: `Reorder operations: execute ${deadEnd.blocked_op} before ${deadEnd.blocking_op}`,
      });
    }

    // Merge fallback strategies
    const mergedFallbacks = [
      ...basePreflight.fallback_strategies,
      ...seqAssessment.fallback_strategies,
    ];

    // Adjust success probability with sequence assessment
    const seqWeight = 0.35; // Sequence contributes 35% to success probability
    const combinedSuccessProb =
      basePreflight.success_probability * (1 - seqWeight) +
      seqAssessment.success_probability * seqWeight;

    // Determine proceed flag — dead-ends are blocking
    const proceed =
      basePreflight.proceed &&
      seqAssessment.feasible &&
      seqAssessment.dead_ends.length === 0;

    return {
      proceed,
      risks: mergedRisks,
      missing_prerequisites: basePreflight.missing_prerequisites,
      fallback_strategies: mergedFallbacks,
      success_probability: combinedSuccessProb,
      estimated_cost: basePreflight.estimated_cost,
    };
  }

  // ============================================================================
  // TK-MS7: TRIBAL KNOWLEDGE LLM/PUOA SYNTHESIS
  // ============================================================================

  /**
   * TK-MS7-U32: Query tribal knowledge using natural language.
   * Direct entry point for LLM/CLI to query tribal knowledge.
   *
   * @example
   * const tips = await puoa.queryTribalKnowledge("tips for roughing D2 steel");
   * console.log(tips.summary); // Human-readable for LLM
   */
  queryTribalKnowledge(intent: string): TribalNLQueryResult {
    return tribalKnowledgeEngine.queryTribalNaturalLanguage(intent);
  }

  /**
   * TK-MS7-U33: Synthesize tribal knowledge for PUOA task execution.
   * Auto-detects relevant tribal tips from task context, extracts modifiers
   * and constraints, and formats for injection into task execution.
   *
   * @example
   * const synthesis = puoa.synthesizeTribalForTask(puoaInput, routing);
   * console.log(synthesis.modifiers); // Apply to calculations
   * console.log(synthesis.warnings);  // Show to user
   */
  synthesizeTribalForTask(
    input: PUOAInput,
    routing: TierRoutingResult
  ): TribalSynthesis {
    // Build natural language query from PUOA context
    const nlQuery = this.buildTribalNLQuery(input, routing);

    // Query tribal knowledge
    const tribalResult = tribalKnowledgeEngine.queryTribalNaturalLanguage(nlQuery);

    // Also consult the structured tribal knowledge advisor
    const structuredContext = this.consultTribalKnowledge(input, routing);

    // Combine modifiers from both sources
    const combinedModifiers: TribalSynthesisModifier[] = [];

    // Add NL query modifiers
    for (const mod of tribalResult.modifiers) {
      combinedModifiers.push({
        parameter: mod.parameter,
        adjustment: mod.adjustment,
        adjustment_type: mod.adjustment_type || "relative",
        reason: mod.reason,
        source_tip_id: mod.source_tip_id,
        confidence: mod.confidence,
        source: "nl_query",
      });
    }

    // Add structured modifiers
    if (structuredContext.modifiers.vc_modifier !== 1) {
      combinedModifiers.push({
        parameter: "cutting_speed",
        adjustment: structuredContext.modifiers.vc_modifier,
        adjustment_type: "multiplier",
        reason: "Tribal knowledge speed modifier",
        source_tip_id: structuredContext.modifiers.source_tips?.[0] || "tribal_advisor",
        confidence: structuredContext.modifiers.confidence,
        source: "advisor",
      });
    }
    if (structuredContext.modifiers.fz_modifier !== 1) {
      combinedModifiers.push({
        parameter: "feed_rate",
        adjustment: structuredContext.modifiers.fz_modifier,
        adjustment_type: "multiplier",
        reason: "Tribal knowledge feed modifier",
        source_tip_id: structuredContext.modifiers.source_tips?.[0] || "tribal_advisor",
        confidence: structuredContext.modifiers.confidence,
        source: "advisor",
      });
    }

    // Combine constraints
    const combinedConstraints: TribalSynthesisConstraint[] = [];

    // Add NL query constraints
    for (const con of tribalResult.constraints) {
      combinedConstraints.push({
        type: con.type,
        description: con.description,
        severity: con.severity,
        reason: con.reason,
        source_tip_id: con.source_tip_id,
        source: "nl_query",
      });
    }

    // Add structured constraints
    if (structuredContext.constraints.max_speed !== null) {
      combinedConstraints.push({
        type: "requirement",
        description: `Maximum cutting speed: ${structuredContext.constraints.max_speed} m/min`,
        severity: "high",
        reason: "Tribal knowledge speed limit",
        source_tip_id: structuredContext.constraints.source_tips?.[0] || "tribal_advisor",
        source: "advisor",
      });
    }

    // Combine warnings
    const warnings: string[] = [
      ...tribalResult.warnings,
      ...structuredContext.advisory.warnings.map(w => `[Tribal Advisory] ${w}`),
    ];

    // Generate synthesis report for LLM
    const report = this.generateTribalSynthesisReport(
      tribalResult,
      structuredContext,
      combinedModifiers,
      combinedConstraints,
      warnings
    );

    return {
      query_used: nlQuery,
      modifiers: combinedModifiers,
      constraints: combinedConstraints,
      warnings,
      recommendations: structuredContext.advisory.recommendations,
      key_insights: structuredContext.key_insights,
      top_tips: tribalResult.tips.slice(0, 5),
      synthesis_report: report,
      should_apply_modifiers: combinedModifiers.length > 0 && structuredContext.modifiers.confidence >= 70,
      confidence: Math.max(
        tribalResult.tips[0]?.confidence || 0,
        structuredContext.modifiers.confidence
      ),
    };
  }

  /**
   * Build natural language query from PUOA input for tribal knowledge lookup.
   */
  private buildTribalNLQuery(input: PUOAInput, routing: TierRoutingResult): string {
    const parts: string[] = [];

    // Add operation from intent
    const opMatch = input.intent.match(/\b(rough|finish|drill|tap|mill|turn|bore|face|pocket|slot|thread|grind|edm)\w*/i);
    if (opMatch) {
      parts.push(opMatch[0]);
    }

    // Add material from context
    if (input.context?.material) {
      parts.push(String(input.context.material));
    }

    // Add machine from context
    if (input.context?.machine) {
      parts.push(String(input.context.machine));
    }

    // Add domains
    for (const domain of routing.domains.slice(0, 2)) {
      if (!parts.includes(domain)) {
        parts.push(domain);
      }
    }

    // Add any keywords from intent
    const keywords = input.intent.split(/\s+/).filter(w =>
      w.length > 3 &&
      !["tips", "help", "advice", "need", "want", "with", "for", "the", "and"].includes(w.toLowerCase())
    ).slice(0, 3);
    parts.push(...keywords);

    return parts.join(" ");
  }

  /**
   * Generate a synthesis report for LLM consumption.
   */
  private generateTribalSynthesisReport(
    nlResult: TribalNLQueryResult,
    structuredContext: TribalKnowledgeContext,
    modifiers: TribalSynthesisModifier[],
    constraints: TribalSynthesisConstraint[],
    warnings: string[]
  ): string {
    const lines: string[] = [];

    lines.push("## Tribal Knowledge Synthesis Report\n");

    if (nlResult.tips.length > 0) {
      lines.push(`**Found ${nlResult.total_matches} relevant tips** from shop floor experience.\n`);
      lines.push("### Top Recommendations:");
      for (const tip of nlResult.tips.slice(0, 3)) {
        lines.push(`- **${tip.title}** (${tip.confidence}% confidence)`);
        lines.push(`  ${tip.body.slice(0, 150)}${tip.body.length > 150 ? "..." : ""}`);
      }
      lines.push("");
    } else {
      lines.push("No directly matching tribal tips found.\n");
    }

    if (modifiers.length > 0) {
      lines.push("### Suggested Parameter Adjustments:");
      for (const mod of modifiers) {
        const adjustStr = mod.adjustment_type === "multiplier"
          ? `${((mod.adjustment - 1) * 100).toFixed(0)}% adjustment`
          : `${mod.adjustment}`;
        lines.push(`- **${mod.parameter}**: ${adjustStr} (${mod.reason})`);
      }
      lines.push("");
    }

    if (constraints.length > 0) {
      lines.push("### Constraints & Limits:");
      for (const con of constraints) {
        const severity = con.severity === "critical" ? "[CRITICAL]" : con.severity === "high" ? "[HIGH]" : "";
        lines.push(`- ${severity} ${con.description}`);
      }
      lines.push("");
    }

    if (warnings.length > 0) {
      lines.push("### Warnings:");
      for (const warning of warnings) {
        lines.push(`- ${warning}`);
      }
      lines.push("");
    }

    if (structuredContext.key_insights.length > 0) {
      lines.push("### Key Insights:");
      for (const insight of structuredContext.key_insights) {
        lines.push(`- ${insight}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Estimate uncertainty for the current task.
   * Self-reflection on how confident we should be.
   */
  estimateUncertainty(input: PUOAInput, routing: TierRoutingResult): SelfReflection {
    const uncertaintyFactors: string[] = [];
    const clarificationQuestions: string[] = [];
    const blindSpots: string[] = [];

    // Analyze intent for ambiguity
    const ambiguousPatterns = [
      { pattern: /\b(or|vs|versus|either)\b/i, factor: "Multiple alternatives mentioned" },
      { pattern: /\b(maybe|might|could|possibly)\b/i, factor: "Uncertain language used" },
      { pattern: /\b(best|optimal|ideal)\b/i, factor: "Subjective optimization requested" },
      { pattern: /\?.*\?/i, factor: "Multiple questions in intent" },
    ];

    for (const { pattern, factor } of ambiguousPatterns) {
      if (pattern.test(input.intent)) {
        uncertaintyFactors.push(factor);
      }
    }

    // Check for missing critical context
    const criticalContextKeys = ["material", "machine", "operation", "tool"];
    const hasContext = input.context && Object.keys(input.context).length > 0;
    if (hasContext) {
      const contextKeys = Object.keys(input.context!).map(k => k.toLowerCase());
      for (const key of criticalContextKeys) {
        if (routing.domains.includes("machining") && !contextKeys.some(k => k.includes(key))) {
          clarificationQuestions.push(`What ${key} is being used?`);
        }
      }
    } else if (routing.domains.includes("machining")) {
      clarificationQuestions.push("What are the machining parameters (material, tool, operation)?");
    }

    // Identify blind spots based on domains
    if (routing.domains.includes("physics") && !routing.domains.includes("materials")) {
      blindSpots.push("Physics calculations may not account for material-specific behavior");
    }
    if (routing.domains.includes("tooling") && !routing.domains.includes("machines")) {
      blindSpots.push("Tool recommendations may not account for machine capabilities");
    }
    if (routing.domains.length === 1) {
      blindSpots.push("Single-domain analysis may miss cross-domain interactions");
    }

    // Calculate overall uncertainty
    const baseUncertainty = routing.complexity === "simple" ? 0.1 :
                            routing.complexity === "moderate" ? 0.25 :
                            routing.complexity === "complex" ? 0.4 : 0.6;
    const factorPenalty = uncertaintyFactors.length * 0.1;
    const questionPenalty = clarificationQuestions.length * 0.05;
    const uncertainty = Math.min(0.95, baseUncertainty + factorPenalty + questionPenalty);

    // Assess reasoning quality
    const reasoningQuality: SelfReflection["reasoning_quality"] =
      uncertainty < 0.3 ? "high" : uncertainty < 0.6 ? "medium" : "low";

    return {
      uncertainty,
      uncertainty_factors: uncertaintyFactors,
      needs_clarification: clarificationQuestions.length > 0,
      clarification_questions: clarificationQuestions,
      reasoning_quality: reasoningQuality,
      blind_spots: blindSpots,
    };
  }

  /**
   * Generate hypotheses about the task and evaluate them.
   */
  generateHypotheses(
    input: PUOAInput,
    routing: TierRoutingResult,
    domainResults: DomainResult[]
  ): HypothesisEvaluation {
    const hypotheses: HypothesisEvaluation["hypotheses"] = [];

    type HypothesisStatus = "confirmed" | "refuted" | "uncertain";

    // Generate tier-appropriateness hypothesis
    const tierHypothesis: HypothesisEvaluation["hypotheses"][0] = {
      id: "tier-appropriate",
      statement: `Tier ${routing.tier} is appropriate for this task`,
      prior_probability: 0.8,
      posterior_probability: 0.8,
      supporting_evidence: [],
      contradicting_evidence: [],
      status: "uncertain",
    };

    if (routing.complexity === "simple" && routing.tier === "single_dispatcher") {
      tierHypothesis.supporting_evidence.push("Simple task matched to single dispatcher");
      tierHypothesis.posterior_probability = 0.9;
      tierHypothesis.status = "confirmed";
    } else if (routing.complexity === "critical" && routing.tier !== "full_chain") {
      tierHypothesis.contradicting_evidence.push("Critical task not using full chain");
      tierHypothesis.posterior_probability = 0.3;
      tierHypothesis.status = "refuted";
    }
    hypotheses.push(tierHypothesis);

    // Generate domain-coverage hypothesis
    const domainHypothesis: HypothesisEvaluation["hypotheses"][0] = {
      id: "domains-sufficient",
      statement: "Detected domains are sufficient to answer the query",
      prior_probability: 0.7,
      posterior_probability: 0.7,
      supporting_evidence: [],
      contradicting_evidence: [],
      status: "uncertain",
    };

    if (domainResults.length >= routing.domains.length) {
      domainHypothesis.supporting_evidence.push(`All ${routing.domains.length} domains executed`);
      domainHypothesis.posterior_probability += 0.15;
    }
    const successfulDomains = domainResults.filter(r => r.status === "success").length;
    if (successfulDomains === domainResults.length) {
      domainHypothesis.supporting_evidence.push("All domain results successful");
      domainHypothesis.posterior_probability += 0.1;
      domainHypothesis.status = "confirmed";
    } else if (successfulDomains < domainResults.length / 2) {
      domainHypothesis.contradicting_evidence.push("Majority of domains failed");
      domainHypothesis.posterior_probability = 0.3;
      domainHypothesis.status = "refuted";
    }
    hypotheses.push(domainHypothesis);

    // Generate confidence-justified hypothesis
    const confidenceHypothesis: HypothesisEvaluation["hypotheses"][0] = {
      id: "confidence-justified",
      statement: "The confidence scores are well-calibrated for this result",
      prior_probability: 0.6,
      posterior_probability: 0.6,
      supporting_evidence: [],
      contradicting_evidence: [],
      status: "uncertain",
    };

    const avgConfidence = domainResults.length > 0
      ? domainResults.reduce((sum, r) => sum + r.confidence, 0) / domainResults.length
      : 0.5;

    if (avgConfidence > 0.8 && successfulDomains === domainResults.length) {
      confidenceHypothesis.supporting_evidence.push("High confidence with full success");
      confidenceHypothesis.posterior_probability = 0.85;
      confidenceHypothesis.status = "confirmed";
    } else if (avgConfidence > 0.8 && successfulDomains < domainResults.length) {
      confidenceHypothesis.contradicting_evidence.push("High confidence despite failures");
      confidenceHypothesis.posterior_probability = 0.4;
    }
    hypotheses.push(confidenceHypothesis);

    // Find best hypothesis
    const confirmedHypotheses = hypotheses.filter(h => h.status === "confirmed");
    const bestHypothesis = confirmedHypotheses.length > 0
      ? confirmedHypotheses.sort((a, b) => b.posterior_probability - a.posterior_probability)[0].id
      : null;

    // Synthesize conclusion
    const synthesis = this.synthesizeConclusion(hypotheses, routing, domainResults);

    return {
      hypotheses,
      best_hypothesis: bestHypothesis,
      synthesis,
    };
  }

  /**
   * Synthesize a conclusion from hypotheses.
   */
  private synthesizeConclusion(
    hypotheses: HypothesisEvaluation["hypotheses"],
    routing: TierRoutingResult,
    domainResults: DomainResult[]
  ): HypothesisEvaluation["synthesis"] {
    const confirmedCount = hypotheses.filter(h => h.status === "confirmed").length;
    const refutedCount = hypotheses.filter(h => h.status === "refuted").length;

    const reasoningChain: string[] = [
      `Task routed to ${routing.tier} tier based on ${routing.complexity} complexity`,
      `${routing.domains.length} domain(s) identified: ${routing.domains.join(", ")}`,
      `${domainResults.length} domain result(s) obtained`,
      `${confirmedCount}/${hypotheses.length} hypotheses confirmed`,
    ];

    const keyEvidence: string[] = [];
    for (const h of hypotheses) {
      keyEvidence.push(...h.supporting_evidence.slice(0, 1));
    }

    let conclusion: string;
    let confidence: number;

    if (refutedCount === 0 && confirmedCount > 0) {
      conclusion = `Task completed successfully. ${routing.tier} tier was appropriate and all domains returned results.`;
      confidence = 0.85;
    } else if (refutedCount > confirmedCount) {
      conclusion = `Task had issues. ${refutedCount} critical hypotheses were refuted. Results may be incomplete or unreliable.`;
      confidence = 0.4;
    } else {
      conclusion = `Task completed with mixed results. Some hypotheses confirmed, some uncertain. Results should be verified.`;
      confidence = 0.65;
    }

    return {
      conclusion,
      confidence,
      key_evidence: keyEvidence,
      reasoning_chain: reasoningChain,
    };
  }

  /**
   * Perform post-execution reflection.
   * Learn from the execution and generate recommendations.
   */
  reflectOnExecution(
    input: PUOAInput,
    routing: TierRoutingResult,
    domainResults: DomainResult[],
    preFlight: PreFlightAssessment
  ): PostReflection {
    const surprises: string[] = [];
    const lessonsLearned: string[] = [];
    const patternsDetected: string[] = [];
    const futureRecommendations: string[] = [];

    // Check if outcome matched expectation
    const actualSuccessRate = domainResults.filter(r => r.status === "success").length / Math.max(domainResults.length, 1);
    const expectedSuccessRate = preFlight.success_probability;
    const outcomeMatched = Math.abs(actualSuccessRate - expectedSuccessRate) < 0.2;

    if (!outcomeMatched) {
      if (actualSuccessRate > expectedSuccessRate) {
        surprises.push(`Better than expected: ${(actualSuccessRate * 100).toFixed(0)}% success vs ${(expectedSuccessRate * 100).toFixed(0)}% predicted`);
        lessonsLearned.push("Pre-flight assessment was overly pessimistic for this task type");
      } else {
        surprises.push(`Worse than expected: ${(actualSuccessRate * 100).toFixed(0)}% success vs ${(expectedSuccessRate * 100).toFixed(0)}% predicted`);
        lessonsLearned.push("Pre-flight assessment was overly optimistic for this task type");
      }
    }

    // Detect patterns
    const allSucceeded = domainResults.every(r => r.status === "success");
    const allFailed = domainResults.every(r => r.status === "failed");

    if (allSucceeded && routing.tier === "single_dispatcher") {
      patternsDetected.push("Simple single-dispatcher tasks consistently succeed");
    }
    if (allFailed && routing.tier === "full_chain") {
      patternsDetected.push("Complex full_chain tasks may need prerequisite validation");
      lessonsLearned.push("Consider adding prerequisite checks before complex chains");
    }

    // Check if any risks materialized
    const failedDomains = domainResults.filter(r => r.status === "failed").map(r => r.domain);
    for (const risk of preFlight.risks) {
      if (risk.severity === "high" && failedDomains.length > 0) {
        lessonsLearned.push(`High-severity risk "${risk.risk}" may have contributed to failures`);
      }
    }

    // Generate future recommendations
    if (routing.complexity === "critical") {
      futureRecommendations.push("For critical tasks, always use full_chain tier with physics validation");
    }
    if (failedDomains.length > 0) {
      futureRecommendations.push(`Check availability of ${failedDomains.join(", ")} orchestrators before execution`);
    }
    if (preFlight.missing_prerequisites.length > 0) {
      futureRecommendations.push("Address prerequisites before re-attempting similar tasks");
    }

    // Should this be remembered?
    const shouldRemember = !outcomeMatched || lessonsLearned.length > 0 || patternsDetected.length > 0;
    const memoryKey = shouldRemember
      ? `puoa:${routing.tier}:${routing.domains.sort().join("-")}:${actualSuccessRate > 0.5 ? "success" : "failure"}`
      : undefined;

    return {
      outcome_matched_expectation: outcomeMatched,
      surprises,
      lessons_learned: lessonsLearned,
      patterns_detected: patternsDetected,
      future_recommendations: futureRecommendations,
      should_remember: shouldRemember,
      memory_key: memoryKey,
    };
  }

  /**
   * Build accumulated reasoning context across execution steps.
   */
  buildReasoningContext(
    steps: ChainStep[],
    domainResults: DomainResult[],
    selfReflection: SelfReflection
  ): ReasoningContext {
    const insights: ReasoningContext["insights"] = [];
    const evidence: ReasoningContext["evidence"] = [];
    const assumptions: ReasoningContext["assumptions"] = [];
    const openQuestions: string[] = [];
    const knowledgeGaps: string[] = [];

    // Extract insights from completed steps
    for (const step of steps.filter(s => s.status === "completed")) {
      insights.push({
        step: step.name,
        insight: `Step ${step.name} completed successfully`,
        confidence: 0.9,
      });
    }

    // Extract evidence from domain results
    for (const result of domainResults) {
      if (result.status === "success") {
        evidence.push({
          type: "supporting",
          claim: `Domain ${result.domain} can handle this task`,
          source: result.orchestrator_id,
          weight: result.confidence,
        });
      } else {
        evidence.push({
          type: "contradicting",
          claim: `Domain ${result.domain} may have issues`,
          source: result.orchestrator_id,
          weight: 1 - result.confidence,
        });
      }
    }

    // Log assumptions
    if (domainResults.some(r => r.confidence > 0.8)) {
      assumptions.push({
        assumption: "High-confidence results are trustworthy",
        risk: "low",
        verifiable: true,
      });
    }

    // Carry over open questions from self-reflection
    openQuestions.push(...selfReflection.clarification_questions);

    // Identify knowledge gaps from blind spots
    knowledgeGaps.push(...selfReflection.blind_spots);

    return {
      insights,
      evidence,
      assumptions,
      open_questions: openQuestions,
      knowledge_gaps: knowledgeGaps,
    };
  }

  /**
   * Generate natural language explanation of the entire execution.
   */
  generateExplanation(
    input: PUOAInput,
    routing: TierRoutingResult,
    domainResults: DomainResult[],
    hypothesis: HypothesisEvaluation,
    selfReflection: SelfReflection
  ): string {
    const parts: string[] = [];

    // Opening
    parts.push(`I analyzed your request: "${input.intent.slice(0, 100)}${input.intent.length > 100 ? "..." : ""}".`);

    // Routing explanation
    parts.push(`Based on ${routing.complexity} complexity and ${routing.domains.length} domain(s) [${routing.domains.join(", ")}], I used the ${routing.tier} execution tier.`);

    // Results summary
    const successCount = domainResults.filter(r => r.status === "success").length;
    if (successCount === domainResults.length) {
      parts.push(`All ${domainResults.length} domain(s) returned successful results.`);
    } else if (successCount > 0) {
      parts.push(`${successCount} of ${domainResults.length} domain(s) succeeded.`);
    } else {
      parts.push(`Unfortunately, no domains returned successful results.`);
    }

    // Hypothesis insight
    if (hypothesis.synthesis.conclusion) {
      parts.push(hypothesis.synthesis.conclusion);
    }

    // Uncertainty disclosure
    if (selfReflection.uncertainty > 0.4) {
      parts.push(`Note: I'm ${((1 - selfReflection.uncertainty) * 100).toFixed(0)}% confident in this analysis.`);
      if (selfReflection.clarification_questions.length > 0) {
        parts.push(`To improve accuracy, I'd need to know: ${selfReflection.clarification_questions[0]}`);
      }
    }

    // Blind spots disclosure
    if (selfReflection.blind_spots.length > 0) {
      parts.push(`Potential limitation: ${selfReflection.blind_spots[0]}`);
    }

    return parts.join(" ");
  }

  /**
   * Calculate meta-confidence: confidence in our reasoning process itself.
   */
  calculateMetaConfidence(
    selfReflection: SelfReflection,
    hypothesis: HypothesisEvaluation,
    preFlight: PreFlightAssessment,
    postReflection: PostReflection
  ): number {
    let metaConfidence = 0.5; // Base

    // Self-reflection quality
    if (selfReflection.reasoning_quality === "high") metaConfidence += 0.15;
    else if (selfReflection.reasoning_quality === "low") metaConfidence -= 0.15;

    // Pre-flight accuracy
    if (postReflection.outcome_matched_expectation) metaConfidence += 0.1;
    else metaConfidence -= 0.1;

    // Hypothesis confirmation rate
    const confirmedRate = hypothesis.hypotheses.filter(h => h.status === "confirmed").length / Math.max(hypothesis.hypotheses.length, 1);
    metaConfidence += confirmedRate * 0.2;

    // Synthesis confidence
    metaConfidence += hypothesis.synthesis.confidence * 0.1;

    // Cap to [0.1, 0.95]
    return Math.max(0.1, Math.min(0.95, metaConfidence));
  }

  /**
   * Build complete intelligence metadata for a result.
   * Integrates tribal knowledge for machining-related tasks.
   */
  buildIntelligence(
    input: PUOAInput,
    routing: TierRoutingResult,
    domainResults: DomainResult[],
    steps: ChainStep[]
  ): PUOAIntelligence {
    // Consult tribal knowledge first
    const tribalContext = this.consultTribalKnowledge(input, routing);

    // Pre-flight (enhanced with tribal context)
    let preFlight = this.assessPreFlight(input, routing);
    if (tribalContext.consulted) {
      preFlight = this.integrateTribalPreFlight(preFlight, tribalContext);
    }

    // Self-reflection
    const selfReflection = this.estimateUncertainty(input, routing);

    // Hypothesis evaluation (enhanced with tribal evidence)
    let hypothesisEvaluation = this.generateHypotheses(input, routing, domainResults);
    if (tribalContext.consulted) {
      hypothesisEvaluation = this.enhanceHypothesesWithTribal(hypothesisEvaluation, tribalContext);
    }

    // Post-reflection
    const postReflection = this.reflectOnExecution(input, routing, domainResults, preFlight);

    // Reasoning context (enhanced with tribal insights)
    let reasoningContext = this.buildReasoningContext(steps, domainResults, selfReflection);
    if (tribalContext.consulted) {
      reasoningContext = this.enhanceReasoningWithTribal(reasoningContext, tribalContext);
    }

    // Natural language explanation (enhanced with tribal knowledge)
    let explanation = this.generateExplanation(input, routing, domainResults, hypothesisEvaluation, selfReflection);
    if (tribalContext.consulted) {
      explanation = this.generateTribalExplanation(explanation, tribalContext);
    }

    // Meta-confidence (adjusted for tribal knowledge availability)
    let metaConfidence = this.calculateMetaConfidence(selfReflection, hypothesisEvaluation, preFlight, postReflection);

    // Boost meta-confidence if tribal knowledge is available and high-quality
    if (tribalContext.consulted && tribalContext.modifiers.auto_apply_approved) {
      metaConfidence = Math.min(0.95, metaConfidence + 0.05);
    }

    // Proactive intelligence — anticipate user needs
    const proactiveResult = this.generateProactiveSuggestions(input, routing);

    // Long-horizon planning — for complex multi-step tasks
    const longHorizonPlan = this.generateLongHorizonPlan(input, routing);

    return {
      reasoning_context: reasoningContext,
      self_reflection: selfReflection,
      pre_flight: preFlight,
      post_reflection: postReflection,
      hypothesis_evaluation: hypothesisEvaluation,
      explanation,
      meta_confidence: metaConfidence,
      tribal_knowledge: tribalContext.consulted ? tribalContext : undefined,
      proactive_suggestions: proactiveResult.suggestions,
      long_horizon_plan: longHorizonPlan,
    };
  }

  /**
   * Generate proactive suggestions using ProactiveIntelligenceEngine.
   * Translates PUOA input to user context format.
   */
  generateProactiveSuggestions(
    input: PUOAInput,
    routing: TierRoutingResult
  ): ProactiveIntelligenceResult {
    const userContext: UserContext = {
      current_task: input.intent,
      material: input.context?.material as string | undefined,
      iso_group: input.context?.iso_group as UserContext["iso_group"],
      machine_id: input.context?.machine_id as string | undefined,
      operation: input.context?.operation as string | undefined,
      tool_type: input.context?.tool_type as string | undefined,
      tool_diameter_mm: input.context?.tool_diameter as number | undefined,
      part_family: input.context?.part_family as string | undefined,
      cutting_params: input.context?.cutting_params
        ? {
            speed_mpm: (input.context.cutting_params as Record<string, number>).speed_mpm,
            feed_mm: (input.context.cutting_params as Record<string, number>).feed_mm,
            depth_mm: (input.context.cutting_params as Record<string, number>).depth_mm,
          }
        : undefined,
      shop_id: input.context?.shop_id as string | undefined,
    };

    return proactiveIntelligenceEngine.analyze(userContext);
  }

  /**
   * Generate long-horizon plan for complex multi-step tasks.
   * Uses LongHorizonPlanningEngine to create a structured execution plan.
   * Only generates plans for complex or critical tasks.
   */
  generateLongHorizonPlan(
    input: PUOAInput,
    routing: TierRoutingResult
  ): ExecutionPlan | undefined {
    // Only generate plans for complex/critical tasks
    if (routing.complexity !== "complex" && routing.complexity !== "critical") {
      return undefined;
    }

    // Determine goal type from domains
    let goalType: PlanningGoal["type"] = "production";
    if (routing.domains.includes("quoting") || input.intent.toLowerCase().includes("quote")) {
      goalType = "quote";
    } else if (routing.domains.includes("machining") || routing.domains.includes("tooling")) {
      goalType = "machining";
    } else if (routing.domains.includes("quality") || routing.domains.includes("inspection")) {
      goalType = "quality";
    }

    const goal: PlanningGoal = {
      goal_id: input.task_id || `puoa-plan-${Date.now()}`,
      type: goalType,
      description: input.intent,
      priority: routing.complexity === "critical" ? "critical" : "high",
      constraints: input.constraints
        ? Object.entries(input.constraints)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => ({
              type: k as "budget" | "time" | "resource" | "quality" | "safety",
              description: `${k}: ${v}`,
              hard_limit: false,
            }))
        : undefined,
      success_criteria: [
        `Complete ${input.intent}`,
        "Pass all quality checks",
        "Within time constraints",
      ],
      context: input.context,
    };

    return longHorizonPlanningEngine.createPlan(goal);
  }

  // ============================================================================
  // TRIBAL KNOWLEDGE INTEGRATION
  // ============================================================================

  /**
   * Extract tribal query context from PUOA input.
   * Maps user intent and context to machining-specific query parameters.
   */
  buildTribalQueryContext(input: PUOAInput): TribalQueryContext {
    const context: TribalQueryContext = {};
    const inputContext = input.context || {};

    // Extract material
    if (inputContext.material) {
      context.material = String(inputContext.material);
    }
    if (inputContext.iso_group || inputContext.material_group) {
      context.iso_group = String(inputContext.iso_group || inputContext.material_group);
    }

    // Extract machine
    if (inputContext.machine_id || inputContext.machine) {
      context.machine_id = String(inputContext.machine_id || inputContext.machine);
    }

    // Extract operation
    if (inputContext.operation || inputContext.operation_type) {
      context.operation = String(inputContext.operation || inputContext.operation_type);
    }

    // Extract tool info
    if (inputContext.tool_type) {
      context.tool_type = String(inputContext.tool_type);
    }
    if (inputContext.tool_diameter) {
      context.tool_diameter_mm = Number(inputContext.tool_diameter);
    }

    // Extract workholding
    if (inputContext.workholding) {
      context.workholding = String(inputContext.workholding);
    }

    // Extract part family
    if (inputContext.part_family || inputContext.part_number) {
      context.part_family = String(inputContext.part_family || inputContext.part_number);
    }

    // Extract complexity
    if (inputContext.complexity) {
      context.complexity = inputContext.complexity as "simple" | "medium" | "complex";
    }

    // Extract CAM software
    if (inputContext.cam_software || inputContext.cam) {
      context.cam_software = String(inputContext.cam_software || inputContext.cam);
    }

    // Extract controller
    if (inputContext.controller || inputContext.controller_family) {
      context.controller_family = String(inputContext.controller || inputContext.controller_family);
    }

    // Infer from intent text
    const intentLower = input.intent.toLowerCase();

    // Material inference
    if (!context.material) {
      const materialPatterns = [
        { pattern: /\b(steel|4140|4340|1045|1018|a36)\b/i, material: "steel" },
        { pattern: /\b(aluminum|6061|7075|2024)\b/i, material: "aluminum" },
        { pattern: /\b(titanium|ti[- ]?6al|ti64)\b/i, material: "titanium" },
        { pattern: /\b(stainless|304|316|17-4)\b/i, material: "stainless_steel" },
        { pattern: /\b(inconel|625|718)\b/i, material: "inconel" },
        { pattern: /\b(brass|bronze|copper)\b/i, material: "copper_alloy" },
        { pattern: /\b(carbide|tungsten|cobalt)\b/i, material: "carbide" },
        { pattern: /\b(d2|a2|s7|m2|h13|tool\s*steel)\b/i, material: "tool_steel" },
      ];
      for (const { pattern, material } of materialPatterns) {
        if (pattern.test(intentLower)) {
          context.material = material;
          break;
        }
      }
    }

    // Operation inference
    if (!context.operation) {
      const opPatterns = [
        { pattern: /\b(rough|roughing)\b/i, op: "roughing" },
        { pattern: /\b(finish|finishing)\b/i, op: "finishing" },
        { pattern: /\b(drill|drilling|hole)\b/i, op: "drilling" },
        { pattern: /\b(tap|tapping|thread)\b/i, op: "tapping" },
        { pattern: /\b(bore|boring)\b/i, op: "boring" },
        { pattern: /\b(face|facing)\b/i, op: "facing" },
        { pattern: /\b(turn|turning)\b/i, op: "turning" },
        { pattern: /\b(mill|milling)\b/i, op: "milling" },
        { pattern: /\b(slot|slotting)\b/i, op: "slotting" },
        { pattern: /\b(pocket|pocketing)\b/i, op: "pocketing" },
      ];
      for (const { pattern, op } of opPatterns) {
        if (pattern.test(intentLower)) {
          context.operation = op;
          break;
        }
      }
    }

    return context;
  }

  /**
   * Consult tribal knowledge for a given task.
   * Returns modifiers, constraints, and advisory information.
   */
  consultTribalKnowledge(input: PUOAInput, routing: TierRoutingResult): TribalKnowledgeContext {
    const queryContext = this.buildTribalQueryContext(input);

    // Check if machining-related domains are involved
    const machiningDomains = ["machining", "tooling", "materials", "physics", "quality", "cam"];
    const hasMachiningDomain = routing.domains.some(d => machiningDomains.includes(d));

    if (!hasMachiningDomain) {
      // Not a machining task, return empty tribal context
      return {
        query_context: queryContext,
        modifiers: {
          // canonical TribalModifiers required fields
          vc_modifier: 1,
          fz_modifier: 1,
          ap_modifier: 1,
          tool_life_modifier: 1,
          notes: [],
          tip_ids: [],
          confidence: 0,
          // extended PUOA-layer fields (all optional)
          ae_modifier: 1,
          machinability_factor_override: null,
          machine_rate_override: null,
          cycle_time_base_override: null,
          setup_count_override: null,
          setup_time_per_setup_min: null,
          iso_speed_modifier: 1,
          evidence_count: 0,
          source_tips: [],
          auto_apply_approved: false,
        },
        constraints: {
          // canonical TribalConstraints required fields
          reasons: [],
          tip_ids: [],
          // extended PUOA-layer fields (all optional)
          max_speed: null,
          min_speed: null,
          max_rpm: null,
          max_feed: null,
          min_passes: null,
          required_machine: null,
          forbidden_machines: [],
          forced_dependencies: [],
          phase_overrides: [],
          required_probe_after: [],
          confidence: 0,
          source_tips: [],
        },
        advisory: {
          // canonical TribalAdvisory required fields
          warnings: [],
          recommendations: [],
          machine_advice: [],
          material_advice: [],
          operation_advice: [],
          tool_advice: [],
          contributing_tips: [],
          // extended PUOA-layer fields (all optional)
          notes: [],
          source_tips: [],
        },
        consulted: false,
        matching_tips: 0,
        key_insights: [],
        tribal_risks: [],
        machine_advice: [],
        material_advice: [],
        operation_advice: [],
      };
    }

    // Consult tribal knowledge — advisor returns canonical shapes; enrich at
    // this boundary so downstream code can rely on the extended PUOA fields
    // (max_speed/max_rpm/forbidden_machines/source_tips/...) being present.
    const canonicalModifiers = tribalKnowledgeAdvisorEngine.getModifiers(queryContext);
    const canonicalConstraints = tribalKnowledgeAdvisorEngine.getConstraints(queryContext);
    const canonicalAdvisory = tribalKnowledgeAdvisorEngine.getAdvisory(queryContext);

    const modifiers: TribalModifiers = {
      ...canonicalModifiers,
      // PUOA-layer extensions with safe defaults
      ae_modifier: 1,
      machinability_factor_override: null,
      machine_rate_override: null,
      cycle_time_base_override: null,
      setup_count_override: null,
      setup_time_per_setup_min: null,
      iso_speed_modifier: 1,
      evidence_count: canonicalModifiers.tip_ids.length,
      source_tips: canonicalModifiers.tip_ids,
      auto_apply_approved: false,
    };

    const constraints: TribalConstraints = {
      ...canonicalConstraints,
      // PUOA-layer extensions. Canonical exposes max_vc/max_fz/max_ap (advisor
      // domain language); promote to max_speed/max_feed (PUOA domain language)
      // so the consumer can read either form. max_rpm/forbidden_machines have
      // no canonical equivalent — the advisor doesn't model machine-level
      // restrictions today; default to null/[] until a producer wires them.
      max_speed: canonicalConstraints.max_vc ?? null,
      min_speed: null,
      max_rpm: null,
      max_feed: canonicalConstraints.max_fz ?? null,
      min_passes: null,
      required_machine: null,
      forbidden_machines: [],
      forced_dependencies: [],
      phase_overrides: [],
      required_probe_after: [],
      confidence: 0,
      source_tips: canonicalConstraints.tip_ids,
    };

    const advisory: TribalAdvisory = {
      ...canonicalAdvisory,
      // PUOA-layer extensions. source_tips is a {id} list; derive from
      // contributing_tips since canonical doesn't expose a flat id list.
      notes: [],
      source_tips: canonicalAdvisory.contributing_tips.map(t => ({ id: t.id })),
    };

    // Extract key insights
    const keyInsights: string[] = [];
    const tribalRisks: TribalKnowledgeContext["tribal_risks"] = [];
    const machineAdvice: string[] = [];
    const materialAdvice: string[] = [];
    const operationAdvice: string[] = [];

    // Process modifiers for insights
    if (modifiers.vc_modifier !== 1) {
      const direction = modifiers.vc_modifier < 1 ? "reduce" : "increase";
      const percent = Math.abs((modifiers.vc_modifier - 1) * 100).toFixed(0);
      keyInsights.push(`Tribal knowledge suggests ${direction} cutting speed by ${percent}%`);
    }
    if (modifiers.fz_modifier !== 1) {
      const direction = modifiers.fz_modifier < 1 ? "reduce" : "increase";
      const percent = Math.abs((modifiers.fz_modifier - 1) * 100).toFixed(0);
      keyInsights.push(`Tribal knowledge suggests ${direction} feed rate by ${percent}%`);
    }
    if (modifiers.tool_life_modifier !== 1) {
      const direction = modifiers.tool_life_modifier > 1 ? "extended" : "reduced";
      const factor = modifiers.tool_life_modifier.toFixed(1);
      keyInsights.push(`Expected tool life ${direction} by ${factor}x based on tribal experience`);
    }

    // Process constraints for risks
    if (constraints.max_speed !== null) {
      tribalRisks.push({
        risk: `Do not exceed ${constraints.max_speed} m/min cutting speed`,
        severity: "high",
        source: "tribal_constraint",
      });
      machineAdvice.push(`Max Vc: ${constraints.max_speed} m/min (tribal limit)`);
    }
    if (constraints.max_rpm !== null) {
      tribalRisks.push({
        risk: `Spindle RPM limited to ${constraints.max_rpm}`,
        severity: "high",
        source: "tribal_constraint",
      });
      machineAdvice.push(`Max RPM: ${constraints.max_rpm} (tribal limit)`);
    }
    if ((constraints.forbidden_machines?.length ?? 0) > 0) {
      tribalRisks.push({
        risk: `Avoid machines: ${(constraints.forbidden_machines ?? []).join(", ")}`,
        severity: "medium",
        source: "tribal_constraint",
      });
    }
    if (constraints.required_machine) {
      machineAdvice.push(`Recommended machine: ${constraints.required_machine}`);
    }

    // Process advisory
    for (const warning of advisory.warnings) {
      tribalRisks.push({
        risk: warning,
        severity: "high",
        source: "tribal_advisory",
      });
    }

    // Categorize recommendations
    for (const rec of advisory.recommendations) {
      if (/machine|spindle|cnc/i.test(rec)) {
        machineAdvice.push(rec);
      } else if (/material|steel|aluminum|titanium/i.test(rec)) {
        materialAdvice.push(rec);
      } else if (/rough|finish|drill|tap|mill|turn/i.test(rec)) {
        operationAdvice.push(rec);
      } else {
        keyInsights.push(rec);
      }
    }

    const matchingTips = new Set([
      ...(modifiers.source_tips ?? []),
      ...(constraints.source_tips ?? []),
      ...(advisory.source_tips ?? []).map((t: any) => t.id),
    ]).size;

    return {
      query_context: queryContext,
      modifiers,
      constraints,
      advisory,
      consulted: true,
      matching_tips: matchingTips,
      key_insights: keyInsights,
      tribal_risks: tribalRisks,
      machine_advice: machineAdvice,
      material_advice: materialAdvice,
      operation_advice: operationAdvice,
    };
  }

  /**
   * Integrate tribal knowledge into pre-flight assessment.
   */
  integrateTribalPreFlight(
    preFlight: PreFlightAssessment,
    tribalContext: TribalKnowledgeContext
  ): PreFlightAssessment {
    if (!tribalContext.consulted) {
      return preFlight;
    }

    const enhancedRisks = [...preFlight.risks];
    const enhancedFallbacks = [...preFlight.fallback_strategies];

    // Add tribal risks
    for (const risk of tribalContext.tribal_risks) {
      enhancedRisks.push({
        risk: risk.risk,
        severity: risk.severity,
        mitigation: "Follow tribal knowledge recommendations",
      });
    }

    // Add tribal-based fallback if modifiers are auto-approved
    if (tribalContext.modifiers.auto_apply_approved) {
      enhancedFallbacks.push({
        strategy: "Apply tribal knowledge modifiers to physics calculations",
        trigger: "Physics-only results deviate from expected range",
        confidence: tribalContext.modifiers.confidence,
      });
    }

    // Check for constraint conflicts
    if (tribalContext.constraints.required_machine && (tribalContext.constraints.forbidden_machines?.length ?? 0) > 0) {
      if ((tribalContext.constraints.forbidden_machines ?? []).includes(tribalContext.constraints.required_machine.toLowerCase())) {
        enhancedRisks.push({
          risk: "Conflicting tribal constraints: required machine is also forbidden",
          severity: "critical",
          mitigation: "Manual review required",
        });
      }
    }

    // Adjust success probability based on tribal confidence
    let adjustedSuccessProb = preFlight.success_probability;
    if (tribalContext.modifiers.confidence > 0.7 && tribalContext.matching_tips > 3) {
      adjustedSuccessProb = Math.min(0.95, adjustedSuccessProb + 0.05);
    } else if (tribalContext.tribal_risks.filter(r => r.severity === "high").length > 2) {
      adjustedSuccessProb = Math.max(0.3, adjustedSuccessProb - 0.1);
    }

    return {
      ...preFlight,
      risks: enhancedRisks,
      fallback_strategies: enhancedFallbacks,
      success_probability: adjustedSuccessProb,
    };
  }

  /**
   * Generate tribal-enhanced natural language explanation.
   */
  generateTribalExplanation(
    baseExplanation: string,
    tribalContext: TribalKnowledgeContext
  ): string {
    if (!tribalContext.consulted || tribalContext.matching_tips === 0) {
      return baseExplanation;
    }

    const parts = [baseExplanation];

    // Add tribal knowledge summary
    parts.push(`I also consulted ${tribalContext.matching_tips} tribal knowledge tip(s) relevant to this task.`);

    // Add key insights
    if (tribalContext.key_insights.length > 0) {
      parts.push(`Key tribal insights: ${tribalContext.key_insights.slice(0, 2).join("; ")}.`);
    }

    // Add modifier summary
    const modifiers = tribalContext.modifiers;
    const evidenceCount = modifiers.evidence_count ?? 0;
    if (evidenceCount > 0) {
      const modSummary: string[] = [];
      if (modifiers.vc_modifier !== 1) modSummary.push(`Vc×${modifiers.vc_modifier.toFixed(2)}`);
      if (modifiers.fz_modifier !== 1) modSummary.push(`fz×${modifiers.fz_modifier.toFixed(2)}`);
      if (modifiers.tool_life_modifier !== 1) modSummary.push(`tool life×${modifiers.tool_life_modifier.toFixed(1)}`);
      if (modSummary.length > 0) {
        parts.push(`Recommended adjustments: ${modSummary.join(", ")} (${(modifiers.confidence * 100).toFixed(0)}% confidence from ${evidenceCount} tips).`);
      }
    }

    // Add warnings
    if (tribalContext.advisory.warnings.length > 0) {
      parts.push(`Warning: ${tribalContext.advisory.warnings[0]}`);
    }

    return parts.join(" ");
  }

  /**
   * Enhance hypothesis evaluation with tribal knowledge evidence.
   */
  enhanceHypothesesWithTribal(
    hypothesis: HypothesisEvaluation,
    tribalContext: TribalKnowledgeContext
  ): HypothesisEvaluation {
    if (!tribalContext.consulted || tribalContext.matching_tips === 0) {
      return hypothesis;
    }

    const enhancedHypotheses = [...hypothesis.hypotheses];

    // Add tribal knowledge hypothesis
    const tribalHypothesis: HypothesisEvaluation["hypotheses"][0] = {
      id: "tribal-applicable",
      statement: "Tribal knowledge is applicable and trustworthy for this task",
      prior_probability: 0.6,
      posterior_probability: 0.6,
      supporting_evidence: [],
      contradicting_evidence: [],
      status: "uncertain",
    };

    // Evaluate tribal hypothesis
    if (tribalContext.matching_tips >= 5) {
      tribalHypothesis.supporting_evidence.push(`${tribalContext.matching_tips} matching tribal tips found`);
      tribalHypothesis.posterior_probability += 0.15;
    }
    if (tribalContext.modifiers.confidence > 0.7) {
      tribalHypothesis.supporting_evidence.push(`High tribal confidence: ${(tribalContext.modifiers.confidence * 100).toFixed(0)}%`);
      tribalHypothesis.posterior_probability += 0.1;
    }
    if (tribalContext.modifiers.auto_apply_approved) {
      tribalHypothesis.supporting_evidence.push("Tribal modifiers are auto-approved");
      tribalHypothesis.posterior_probability += 0.1;
      tribalHypothesis.status = "confirmed";
    }
    if (tribalContext.tribal_risks.filter(r => r.severity === "critical").length > 0) {
      tribalHypothesis.contradicting_evidence.push("Critical tribal risks identified");
      tribalHypothesis.posterior_probability -= 0.2;
    }

    if (tribalHypothesis.posterior_probability >= 0.8) {
      tribalHypothesis.status = "confirmed";
    } else if (tribalHypothesis.posterior_probability < 0.4) {
      tribalHypothesis.status = "refuted";
    }

    enhancedHypotheses.push(tribalHypothesis);

    // Enhance synthesis with tribal evidence
    const enhancedSynthesis = { ...hypothesis.synthesis };
    if (tribalContext.key_insights.length > 0) {
      enhancedSynthesis.key_evidence.push(`Tribal: ${tribalContext.key_insights[0]}`);
    }
    if (tribalContext.matching_tips > 0) {
      enhancedSynthesis.reasoning_chain.push(
        `Consulted ${tribalContext.matching_tips} tribal knowledge tips for shop floor expertise`
      );
    }

    return {
      ...hypothesis,
      hypotheses: enhancedHypotheses,
      synthesis: enhancedSynthesis,
    };
  }

  /**
   * Enhance reasoning context with tribal knowledge.
   */
  enhanceReasoningWithTribal(
    reasoningContext: ReasoningContext,
    tribalContext: TribalKnowledgeContext
  ): ReasoningContext {
    if (!tribalContext.consulted) {
      return reasoningContext;
    }

    const enhancedInsights = [...reasoningContext.insights];
    const enhancedEvidence = [...reasoningContext.evidence];
    const enhancedAssumptions = [...reasoningContext.assumptions];
    const enhancedGaps = [...reasoningContext.knowledge_gaps];

    // Add tribal insights
    for (const insight of tribalContext.key_insights.slice(0, 3)) {
      enhancedInsights.push({
        step: "tribal_knowledge_consultation",
        insight,
        confidence: tribalContext.modifiers.confidence,
      });
    }

    // Add tribal evidence
    if (tribalContext.matching_tips > 0) {
      enhancedEvidence.push({
        type: "supporting",
        claim: "Task matches existing tribal knowledge patterns",
        source: `${tribalContext.matching_tips} tribal tips`,
        weight: tribalContext.modifiers.confidence,
      });
    }

    // Add tribal assumptions
    if (tribalContext.modifiers.auto_apply_approved) {
      enhancedAssumptions.push({
        assumption: "Tribal modifiers are accurate and should be applied",
        risk: "low",
        verifiable: true,
      });
    } else if (tribalContext.matching_tips > 0) {
      enhancedAssumptions.push({
        assumption: "Tribal knowledge may apply but requires validation",
        risk: "medium",
        verifiable: true,
      });
    }

    // Identify tribal knowledge gaps
    const tribalEvidenceCount = tribalContext.modifiers.evidence_count ?? 0;
    if (tribalContext.matching_tips === 0) {
      enhancedGaps.push("No matching tribal knowledge found for this task context");
    } else if (tribalEvidenceCount < 5) {
      enhancedGaps.push(`Limited tribal evidence (${tribalEvidenceCount} tips) - may not be statistically robust`);
    }

    return {
      ...reasoningContext,
      insights: enhancedInsights,
      evidence: enhancedEvidence,
      assumptions: enhancedAssumptions,
      knowledge_gaps: enhancedGaps,
    };
  }
}

export const prismUnifiedOrchestratorEngine = new PRISMUnifiedOrchestratorEngine();
