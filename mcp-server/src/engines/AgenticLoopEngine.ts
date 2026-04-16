/**
 * AgenticLoopEngine — Observe-Think-Act Orchestrator
 *
 * AGENT ROADMAP: U-AGT13 (MS4)
 *
 * Core agentic loop for autonomous manufacturing intelligence:
 * - OBSERVE: Parse input, extract intent, gather context
 * - THINK: Reason about approach, evaluate options
 * - ACT: Execute tools, apply decisions
 * - LEARN: Update memory from outcomes
 *
 * @module engines/AgenticLoopEngine
 */

import {
  IntentRouterEngine,
  RoutingResult,
  IntentClassification,
} from "./IntentRouterEngine.js";
import {
  ManufacturingReasoningEngine,
  ManufacturingReasoningChain,
  ManufacturingProblem,
} from "./ManufacturingReasoningEngine.js";
import {
  ToolExecutionEngine,
  ToolExecutionRequest,
  ToolExecutionResult,
} from "./ToolExecutionEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Loop configuration */
export interface LoopConfig {
  maxIterations?: number;
  thinkingDepth?: "shallow" | "standard" | "deep";
  autoLearn?: boolean;
  requireConfidence?: number;
  timeout?: number;
  verbose?: boolean;
}

/** User input to the agentic loop */
export interface AgentInput {
  text: string;
  context?: AgentContext;
  config?: LoopConfig;
}

/** Agent context */
export interface AgentContext {
  sessionId?: string;
  userId?: string;
  conversationHistory?: ConversationTurn[];
  workingMemory?: Record<string, unknown>;
  constraints?: string[];
}

/** Conversation turn */
export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/** Loop phase */
export type LoopPhase = "observe" | "think" | "act" | "learn" | "complete" | "error";

/** Observation result */
export interface Observation {
  input: string;
  intent: IntentClassification;
  routing: RoutingResult;
  entities: ExtractedEntity[];
  contextFactors: ContextFactor[];
}

/** Extracted entity */
export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
}

/** Context factor */
export interface ContextFactor {
  name: string;
  value: unknown;
  relevance: number;
}

/** Thinking result */
export interface Thinking {
  approach: string;
  reasoning: ManufacturingReasoningChain | null;
  confidence: number;
  plannedActions: PlannedAction[];
  alternatives: AlternativeApproach[];
  risks: IdentifiedRisk[];
}

/** Planned action */
export interface PlannedAction {
  dispatcher: string;
  action: string;
  parameters: Record<string, unknown>;
  priority: number;
  reason: string;
}

/** Alternative approach */
export interface AlternativeApproach {
  description: string;
  confidence: number;
  tradeoffs: string[];
}

/** Identified risk */
export interface IdentifiedRisk {
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  mitigation: string;
}

/** Action result */
export interface ActionResult {
  executed: ExecutedAction[];
  aggregatedResult: unknown;
  success: boolean;
  errors: ActionError[];
}

/** Executed action */
export interface ExecutedAction {
  dispatcher: string;
  action: string;
  result: ToolExecutionResult;
  timing: { startMs: number; endMs: number; durationMs: number };
}

/** Action error */
export interface ActionError {
  action: string;
  error: string;
  recoverable: boolean;
}

/** Learning result */
export interface LearningResult {
  lessonsLearned: string[];
  memoryUpdates: MemoryUpdate[];
  feedbackApplied: boolean;
}

/** Memory update */
export interface MemoryUpdate {
  type: "fact" | "preference" | "correction";
  key: string;
  value: unknown;
  reason: string;
}

/** Complete agent response */
export interface AgentResponse {
  id: string;
  input: string;
  phases: LoopPhase[];
  observation: Observation | null;
  thinking: Thinking | null;
  actionResult: ActionResult | null;
  learning: LearningResult | null;
  finalAnswer: string;
  confidence: number;
  metrics: LoopMetrics;
  trace?: LoopTrace;
}

/** Loop metrics */
export interface LoopMetrics {
  totalDurationMs: number;
  observeMs: number;
  thinkMs: number;
  actMs: number;
  learnMs: number;
  iterationCount: number;
  toolCallCount: number;
}

/** Loop trace */
export interface LoopTrace {
  steps: TraceStep[];
}

/** Trace step */
export interface TraceStep {
  phase: LoopPhase;
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class AgenticLoopEngine {
  private readonly intentRouter: IntentRouterEngine;
  private readonly reasoningEngine: ManufacturingReasoningEngine;
  private readonly toolEngine: ToolExecutionEngine;

  private readonly defaultConfig: Required<LoopConfig> = {
    maxIterations: 5,
    thinkingDepth: "standard",
    autoLearn: true,
    requireConfidence: 0.5,
    timeout: 60000,
    verbose: false
  };

  private responseCounter = 0;

  constructor() {
    this.intentRouter = new IntentRouterEngine();
    this.reasoningEngine = new ManufacturingReasoningEngine();
    this.toolEngine = new ToolExecutionEngine();
  }

  /**
   * Run the agentic loop
   */
  async run(input: AgentInput): Promise<AgentResponse> {
    const startTime = Date.now();
    const config = { ...this.defaultConfig, ...input.config };
    const trace: TraceStep[] = [];
    const phases: LoopPhase[] = [];

    const metrics: LoopMetrics = {
      totalDurationMs: 0,
      observeMs: 0,
      thinkMs: 0,
      actMs: 0,
      learnMs: 0,
      iterationCount: 0,
      toolCallCount: 0
    };

    let observation: Observation | null = null;
    let thinking: Thinking | null = null;
    let actionResult: ActionResult | null = null;
    let learning: LearningResult | null = null;
    let finalAnswer = "";
    let confidence = 0;

    try {
      // OBSERVE phase
      const observeStart = Date.now();
      phases.push("observe");
      trace.push({
        phase: "observe",
        timestamp: new Date().toISOString(),
        message: "Starting observation phase"
      });

      observation = await this.observe(input.text, input.context);
      metrics.observeMs = Date.now() - observeStart;

      trace.push({
        phase: "observe",
        timestamp: new Date().toISOString(),
        message: `Identified intent: ${observation.intent.category}`,
        data: { confidence: observation.intent.confidence }
      });

      // THINK phase
      const thinkStart = Date.now();
      phases.push("think");
      trace.push({
        phase: "think",
        timestamp: new Date().toISOString(),
        message: "Starting reasoning phase"
      });

      thinking = await this.think(observation, config, input.context);
      metrics.thinkMs = Date.now() - thinkStart;

      trace.push({
        phase: "think",
        timestamp: new Date().toISOString(),
        message: `Planned ${thinking.plannedActions.length} actions`,
        data: { approach: thinking.approach, confidence: thinking.confidence }
      });

      // Check confidence threshold
      if (thinking.confidence < config.requireConfidence) {
        trace.push({
          phase: "think",
          timestamp: new Date().toISOString(),
          message: `Confidence ${thinking.confidence} below threshold ${config.requireConfidence}`
        });
        finalAnswer = this.generateLowConfidenceResponse(observation, thinking);
        confidence = thinking.confidence;
      } else {
        // ACT phase
        const actStart = Date.now();
        phases.push("act");
        trace.push({
          phase: "act",
          timestamp: new Date().toISOString(),
          message: "Starting action phase"
        });

        actionResult = await this.act(thinking.plannedActions);
        metrics.actMs = Date.now() - actStart;
        metrics.toolCallCount = actionResult.executed.length;

        trace.push({
          phase: "act",
          timestamp: new Date().toISOString(),
          message: `Executed ${actionResult.executed.length} actions`,
          data: { success: actionResult.success }
        });

        // LEARN phase
        if (config.autoLearn) {
          const learnStart = Date.now();
          phases.push("learn");
          trace.push({
            phase: "learn",
            timestamp: new Date().toISOString(),
            message: "Starting learning phase"
          });

          learning = await this.learn(observation, thinking, actionResult);
          metrics.learnMs = Date.now() - learnStart;

          trace.push({
            phase: "learn",
            timestamp: new Date().toISOString(),
            message: `Captured ${learning.lessonsLearned.length} lessons`
          });
        }

        // Generate final answer
        finalAnswer = this.generateResponse(observation, thinking, actionResult);
        const thinkingConf = isNaN(thinking.confidence) ? 0.5 : thinking.confidence;
        confidence = thinkingConf * (actionResult.success ? 1.0 : 0.7);
      }

      phases.push("complete");
      metrics.iterationCount = 1;
      metrics.totalDurationMs = Date.now() - startTime;

      return {
        id: this.generateResponseId(),
        input: input.text,
        phases,
        observation,
        thinking,
        actionResult,
        learning,
        finalAnswer,
        confidence,
        metrics,
        trace: config.verbose ? { steps: trace } : undefined
      };

    } catch (error) {
      phases.push("error");
      metrics.totalDurationMs = Date.now() - startTime;

      trace.push({
        phase: "error",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Unknown error"
      });

      return {
        id: this.generateResponseId(),
        input: input.text,
        phases,
        observation,
        thinking,
        actionResult,
        learning,
        finalAnswer: `I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
        confidence: 0,
        metrics,
        trace: config.verbose ? { steps: trace } : undefined
      };
    }
  }

  /**
   * OBSERVE: Parse input, extract intent, gather context
   */
  private async observe(text: string, context?: AgentContext): Promise<Observation> {
    // Route intent
    const routing = this.intentRouter.route(text);
    const intent = this.intentRouter.classifyIntent(text);
    const entities = this.intentRouter.extractEntities(text);

    // Build context factors
    const contextFactors: ContextFactor[] = [];

    if (context?.conversationHistory?.length) {
      contextFactors.push({
        name: "conversation_length",
        value: context.conversationHistory.length,
        relevance: 0.6
      });

      // Check for recent topics
      const recentTopics = this.extractRecentTopics(context.conversationHistory);
      if (recentTopics.length > 0) {
        contextFactors.push({
          name: "recent_topics",
          value: recentTopics,
          relevance: 0.8
        });
      }
    }

    if (context?.workingMemory) {
      const memoryKeys = Object.keys(context.workingMemory);
      if (memoryKeys.length > 0) {
        contextFactors.push({
          name: "working_memory",
          value: memoryKeys,
          relevance: 0.7
        });
      }
    }

    if (context?.constraints?.length) {
      contextFactors.push({
        name: "constraints",
        value: context.constraints,
        relevance: 0.9
      });
    }

    return {
      input: text,
      intent,
      routing,
      entities: entities.map(e => ({
        type: e.type,
        value: e.value,
        confidence: 0.8
      })),
      contextFactors
    };
  }

  /**
   * THINK: Reason about approach, plan actions
   */
  private async think(
    observation: Observation,
    config: Required<LoopConfig>,
    context?: AgentContext
  ): Promise<Thinking> {
    // Build reasoning problem
    const problem: ManufacturingProblem = {
      problem: observation.input,
      goal: this.inferGoal(observation),
      domain: this.mapIntentToDomain(observation.intent.category),
      known_facts: observation.entities.map(e => `${e.type}: ${e.value}`),
      constraints: context?.constraints
    };

    // Get reasoning chain
    let reasoning: ManufacturingReasoningChain | null = null;
    let reasoningConfidence = 0.6;

    if (config.thinkingDepth !== "shallow") {
      reasoning = await this.reasoningEngine.reason(problem);
      reasoningConfidence = reasoning.confidence;
    }

    // Plan actions based on routing
    const plannedActions: PlannedAction[] = [];

    if (observation.routing.success && observation.routing.match) {
      // Primary action from routing
      plannedActions.push({
        dispatcher: observation.routing.match.dispatcher,
        action: observation.routing.match.action,
        parameters: observation.routing.match.parameters,
        priority: 1,
        reason: `Direct routing for ${observation.intent.category} intent`
      });

      // Add alternatives as lower priority
      if (observation.routing.match.alternatives) {
        for (let i = 0; i < Math.min(2, observation.routing.match.alternatives.length); i++) {
          const alt = observation.routing.match.alternatives[i];
          plannedActions.push({
            dispatcher: alt.dispatcher,
            action: alt.action,
            parameters: observation.routing.match.parameters,
            priority: 2 + i,
            reason: `Alternative: ${alt.action}`
          });
        }
      }
    }

    // Build alternatives
    const alternatives: AlternativeApproach[] = [];
    if (observation.routing.suggestions) {
      for (const suggestion of observation.routing.suggestions.slice(0, 3)) {
        alternatives.push({
          description: suggestion,
          confidence: 0.5,
          tradeoffs: ["May not fully address the request"]
        });
      }
    }

    // Identify risks
    const risks: IdentifiedRisk[] = [];

    if (observation.intent.category === "calculation" &&
        observation.entities.some(e => e.type === "hardness")) {
      risks.push({
        description: "High hardness material may require special considerations",
        severity: "medium",
        mitigation: "Verify tool material compatibility"
      });
    }

    if (reasoningConfidence < 0.5) {
      risks.push({
        description: "Low confidence in reasoning chain",
        severity: "low",
        mitigation: "Consider requesting clarification"
      });
    }

    // Calculate overall confidence
    const baseConfidence = observation.routing.success ?
      (observation.routing.match?.confidence ?? 0.5) : 0.3;
    // Ensure we don't get NaN
    const safeBaseConfidence = isNaN(baseConfidence) ? 0.5 : baseConfidence;
    const safeReasoningConfidence = isNaN(reasoningConfidence) ? 0.5 : reasoningConfidence;
    const confidence = Math.min(1, (safeBaseConfidence + safeReasoningConfidence) / 2);

    return {
      approach: this.describeApproach(observation, plannedActions),
      reasoning,
      confidence,
      plannedActions,
      alternatives,
      risks
    };
  }

  /**
   * ACT: Execute planned actions
   */
  private async act(plannedActions: PlannedAction[]): Promise<ActionResult> {
    const executed: ExecutedAction[] = [];
    const errors: ActionError[] = [];

    // Sort by priority and execute primary actions
    const sortedActions = [...plannedActions].sort((a, b) => a.priority - b.priority);
    const primaryActions = sortedActions.filter(a => a.priority === 1);

    for (const action of primaryActions) {
      const startMs = Date.now();

      const request: ToolExecutionRequest = {
        dispatcher: action.dispatcher,
        action: action.action,
        parameters: action.parameters
      };

      const result = await this.toolEngine.execute(request);
      const endMs = Date.now();

      executed.push({
        dispatcher: action.dispatcher,
        action: action.action,
        result,
        timing: {
          startMs,
          endMs,
          durationMs: endMs - startMs
        }
      });

      if (!result.success && result.error) {
        errors.push({
          action: `${action.dispatcher}:${action.action}`,
          error: result.error.message,
          recoverable: result.error.retryable
        });
      }
    }

    // Aggregate results
    const successfulResults = executed
      .filter(e => e.result.success)
      .map(e => e.result.result);

    const aggregatedResult = successfulResults.length === 1 ?
      successfulResults[0] :
      successfulResults.length > 1 ?
        { results: successfulResults } :
        null;

    return {
      executed,
      aggregatedResult,
      success: errors.length === 0 || errors.some(e => !e.recoverable) === false,
      errors
    };
  }

  /**
   * LEARN: Update memory from outcomes
   */
  private async learn(
    observation: Observation,
    thinking: Thinking,
    actionResult: ActionResult
  ): Promise<LearningResult> {
    const lessonsLearned: string[] = [];
    const memoryUpdates: MemoryUpdate[] = [];

    // Capture successful patterns
    if (actionResult.success && thinking.confidence > 0.7) {
      lessonsLearned.push(
        `Successfully handled ${observation.intent.category} intent with ${thinking.approach}`
      );

      memoryUpdates.push({
        type: "fact",
        key: `success_pattern_${observation.intent.category}`,
        value: {
          intent: observation.intent.category,
          approach: thinking.approach,
          confidence: thinking.confidence
        },
        reason: "Successful execution pattern"
      });
    }

    // Capture entities that led to good results
    for (const entity of observation.entities) {
      if (actionResult.success) {
        memoryUpdates.push({
          type: "fact",
          key: `entity_${entity.type}_${entity.value}`,
          value: entity,
          reason: `Entity involved in successful action`
        });
      }
    }

    // Capture errors for future avoidance
    for (const error of actionResult.errors) {
      lessonsLearned.push(`Error in ${error.action}: ${error.error}`);

      if (!error.recoverable) {
        memoryUpdates.push({
          type: "correction",
          key: `avoid_${error.action}`,
          value: { error: error.error, context: observation.intent.category },
          reason: "Non-recoverable error pattern"
        });
      }
    }

    return {
      lessonsLearned,
      memoryUpdates,
      feedbackApplied: memoryUpdates.length > 0
    };
  }

  /**
   * Generate final response
   */
  private generateResponse(
    observation: Observation,
    thinking: Thinking,
    actionResult: ActionResult
  ): string {
    if (!actionResult.success || actionResult.aggregatedResult === null) {
      if (actionResult.errors.length > 0) {
        return `I attempted to ${thinking.approach}, but encountered issues: ${actionResult.errors.map(e => e.error).join("; ")}`;
      }
      return `I couldn't complete the request. ${thinking.alternatives[0]?.description || "Please try rephrasing."}`;
    }

    const result = actionResult.aggregatedResult;

    // Format based on intent
    switch (observation.intent.category) {
      case "calculation":
        return this.formatCalculationResult(result);
      case "quote":
        return this.formatQuoteResult(result);
      case "selection":
        return this.formatSelectionResult(result);
      case "query":
        return this.formatQueryResult(result);
      default:
        return this.formatGenericResult(result, observation.intent.category);
    }
  }

  /**
   * Generate low confidence response
   */
  private generateLowConfidenceResponse(
    observation: Observation,
    thinking: Thinking
  ): string {
    const suggestions = thinking.alternatives.map(a => a.description).join(", ");
    return `I'm not confident about how to handle this request. ` +
      `You asked about "${observation.input}". ` +
      (suggestions ? `Some alternatives: ${suggestions}` : "Could you please clarify?");
  }

  // ============================================================================
  // FORMATTING HELPERS
  // ============================================================================

  private formatCalculationResult(result: unknown): string {
    if (typeof result !== "object" || result === null) {
      return `Result: ${JSON.stringify(result)}`;
    }

    const r = result as Record<string, unknown>;

    // Speed/feed result
    if ("sfm" in r || "rpm" in r) {
      const parts = [];
      if (r.sfm) parts.push(`SFM: ${r.sfm}`);
      if (r.rpm) parts.push(`RPM: ${r.rpm}`);
      if (r.feed_ipr) parts.push(`Feed: ${r.feed_ipr} IPR`);
      if (r.feed_ipm) parts.push(`${r.feed_ipm} IPM`);
      return `Recommended cutting parameters:\n${parts.join("\n")}`;
    }

    // Force result
    if ("force_n" in r) {
      const parts = [`Cutting force: ${r.force_n} N`];
      if (r.torque_nm) parts.push(`Torque: ${r.torque_nm} Nm`);
      if (r.power_kw) parts.push(`Power: ${r.power_kw} kW`);
      return parts.join("\n");
    }

    // Tool life result
    if ("life_minutes" in r) {
      const parts = [`Tool life: ${r.life_minutes} minutes`];
      if (r.parts_per_edge) parts.push(`Parts per edge: ${r.parts_per_edge}`);
      return parts.join("\n");
    }

    return `Calculation result:\n${JSON.stringify(result, null, 2)}`;
  }

  private formatQuoteResult(result: unknown): string {
    if (typeof result !== "object" || result === null) {
      return `Quote: ${JSON.stringify(result)}`;
    }

    const r = result as Record<string, unknown>;
    const parts = [];

    if (r.total_cost) parts.push(`Total: $${r.total_cost}`);
    if (r.material_cost) parts.push(`Material: $${r.material_cost}`);
    if (r.labor_cost) parts.push(`Labor: $${r.labor_cost}`);
    if (r.lead_time_days) parts.push(`Lead time: ${r.lead_time_days} days`);

    return `Quote estimate:\n${parts.join("\n")}`;
  }

  private formatSelectionResult(result: unknown): string {
    if (typeof result !== "object" || result === null) {
      return `Selection: ${JSON.stringify(result)}`;
    }

    const r = result as Record<string, unknown>;
    let response = "";

    if (r.recommended) {
      response = `Recommended: ${r.recommended}`;
    }

    if (r.alternatives && Array.isArray(r.alternatives)) {
      response += `\nAlternatives: ${r.alternatives.join(", ")}`;
    }

    if (r.confidence) {
      response += ` (${Math.round((r.confidence as number) * 100)}% confident)`;
    }

    return response || `Selection: ${JSON.stringify(result, null, 2)}`;
  }

  private formatQueryResult(result: unknown): string {
    if (typeof result === "string") {
      return result;
    }

    if (typeof result !== "object" || result === null) {
      return `${JSON.stringify(result)}`;
    }

    return JSON.stringify(result, null, 2);
  }

  private formatGenericResult(result: unknown, category: string): string {
    return `${category} result:\n${JSON.stringify(result, null, 2)}`;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private extractRecentTopics(history: ConversationTurn[]): string[] {
    const topics: string[] = [];
    const recentTurns = history.slice(-5);

    for (const turn of recentTurns) {
      if (turn.role === "user") {
        const intent = this.intentRouter.classifyIntent(turn.content);
        if (intent.category && !topics.includes(intent.category)) {
          topics.push(intent.category);
        }
      }
    }

    return topics;
  }

  private inferGoal(observation: Observation): string {
    switch (observation.intent.category) {
      case "calculation":
        return "Calculate and return numeric result";
      case "quote":
        return "Provide cost and time estimate";
      case "selection":
        return "Recommend optimal choice";
      case "query":
        return "Provide information";
      case "validation":
        return "Verify correctness and safety";
      case "generation":
        return "Generate requested content";
      case "comparison":
        return "Compare options and explain differences";
      default:
        return "Assist with manufacturing task";
    }
  }

  private mapIntentToDomain(category: string): string {
    const mapping: Record<string, string> = {
      calculation: "machining",
      quote: "business",
      selection: "machining",
      query: "general",
      validation: "safety",
      generation: "cam",
      comparison: "machining"
    };
    return mapping[category] || "general";
  }

  private describeApproach(observation: Observation, actions: PlannedAction[]): string {
    if (actions.length === 0) {
      return "No specific action planned";
    }

    const primary = actions[0];
    return `Execute ${primary.dispatcher}:${primary.action} for ${observation.intent.category}`;
  }

  private generateResponseId(): string {
    return `resp_${Date.now()}_${++this.responseCounter}`;
  }

  // ============================================================================
  // PUBLIC UTILITIES
  // ============================================================================

  /**
   * Quick intent check without full loop
   */
  checkIntent(text: string): IntentClassification {
    return this.intentRouter.classifyIntent(text);
  }

  /**
   * Get available actions for a dispatcher
   */
  getAvailableActions(dispatcher: string): string[] {
    return this.toolEngine.getActions(dispatcher);
  }

  /**
   * Get all available dispatchers
   */
  getDispatchers(): string[] {
    return this.toolEngine.getDispatchers();
  }

  /**
   * Get loop statistics
   */
  getStats(): {
    toolStats: ReturnType<ToolExecutionEngine["getStats"]>;
    routingStats: ReturnType<IntentRouterEngine["getStats"]>;
  } {
    return {
      toolStats: this.toolEngine.getStats(),
      routingStats: this.intentRouter.getStats()
    };
  }
}

// Export singleton
export const agenticLoopEngine = new AgenticLoopEngine();
