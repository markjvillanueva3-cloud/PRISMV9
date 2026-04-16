/**
 * MultiAgentCoordinatorEngine — Multi-Agent Orchestration for PRISM
 * ==================================================================
 * Coordinates multiple specialized AI agents for complex manufacturing tasks.
 * Each agent focuses on a specific domain (physics, optimization, quality, etc.)
 * and the coordinator synthesizes their outputs into unified recommendations.
 *
 * Agent Types:
 *   - PhysicsAgent: Cutting forces, thermal, deflection, stability
 *   - OptimizationAgent: Speed/feed optimization, cost/time tradeoffs
 *   - QualityAgent: Surface finish, tolerance analysis, SPC
 *   - SafetyAgent: Machine limits, collision detection, S(x) scoring
 *   - TribalAgent: Shop-specific knowledge, operator tips
 *   - PlanningAgent: Multi-step workflow planning
 *
 * Coordination Patterns:
 *   - Parallel: Independent agents run concurrently
 *   - Sequential: Agents run in dependency order
 *   - Consensus: Multiple agents vote on a decision
 *   - Hierarchical: Lead agent delegates to specialists
 *
 * @module engines/MultiAgentCoordinatorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Agent specialization types */
export type AgentType =
  | "physics"
  | "optimization"
  | "quality"
  | "safety"
  | "tribal"
  | "planning"
  | "materials"
  | "tooling"
  | "cam"
  | "costing";

/** Agent status */
export type AgentStatus = "idle" | "thinking" | "executing" | "waiting" | "completed" | "failed";

/** Coordination pattern */
export type CoordinationPattern = "parallel" | "sequential" | "consensus" | "hierarchical";

/** Agent definition */
export interface AgentDefinition {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  priority: number;  // Higher = more authoritative
  confidence_baseline: number;
}

/** Agent instance at runtime */
export interface AgentInstance {
  definition: AgentDefinition;
  status: AgentStatus;
  current_task?: string;
  started_at?: string;
  completed_at?: string;
  result?: AgentResult;
  error?: string;
}

/** Agent task */
export interface AgentTask {
  task_id: string;
  description: string;
  input: Record<string, unknown>;
  required_capabilities: string[];
  timeout_ms?: number;
  priority: "low" | "medium" | "high" | "critical";
}

/** Agent result */
export interface AgentResult {
  agent_id: string;
  agent_type: AgentType;
  task_id: string;
  status: "success" | "partial" | "failed";
  output: unknown;
  confidence: number;
  reasoning: string;
  evidence: string[];
  duration_ms: number;
  recommendations: string[];
  warnings: string[];
}

/** Coordination request */
export interface CoordinationRequest {
  request_id: string;
  task: AgentTask;
  pattern: CoordinationPattern;
  required_agents?: AgentType[];
  consensus_threshold?: number;  // For consensus pattern (0-1)
  timeout_ms?: number;
  context?: Record<string, unknown>;
}

/** Coordination result */
export interface CoordinationResult {
  request_id: string;
  status: "success" | "partial" | "failed" | "consensus_failed";
  pattern_used: CoordinationPattern;
  agents_involved: string[];
  agent_results: AgentResult[];
  synthesized_output: unknown;
  confidence: number;
  consensus_score?: number;
  conflicts: AgentConflict[];
  resolution: ConflictResolution | null;
  total_duration_ms: number;
  reasoning_chain: string[];
  final_recommendations: string[];
}

/** Conflict between agent outputs */
export interface AgentConflict {
  conflict_id: string;
  agents: string[];
  issue: string;
  values: Record<string, unknown>;
  severity: "low" | "medium" | "high" | "critical";
}

/** Resolution of a conflict */
export interface ConflictResolution {
  conflict_id: string;
  strategy: "authority" | "average" | "conservative" | "optimistic" | "physics_based";
  chosen_value: unknown;
  chosen_agent: string;
  reasoning: string;
}

/** Multi-agent reasoning trace */
export interface MultiAgentReasoning {
  coordination_summary: string;
  agent_contributions: Array<{
    agent: string;
    contribution: string;
    weight: number;
  }>;
  synthesis_approach: string;
  confidence_breakdown: Record<string, number>;
  dissenting_opinions: string[];
  key_tradeoffs: string[];
}

// ============================================================================
// AGENT DEFINITIONS
// ============================================================================

const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "physics-agent",
    type: "physics",
    name: "Physics Analysis Agent",
    description: "Analyzes cutting forces, thermal effects, deflection, and stability using physics models",
    capabilities: ["kienzle_force", "thermal_analysis", "deflection", "chatter_stability", "power_calculation"],
    priority: 9,
    confidence_baseline: 0.85,
  },
  {
    id: "optimization-agent",
    type: "optimization",
    name: "Optimization Agent",
    description: "Optimizes cutting parameters for productivity, cost, or tool life",
    capabilities: ["speed_feed_optimization", "mrr_optimization", "cost_optimization", "tool_life_optimization"],
    priority: 8,
    confidence_baseline: 0.80,
  },
  {
    id: "quality-agent",
    type: "quality",
    name: "Quality Analysis Agent",
    description: "Predicts surface finish, analyzes tolerances, monitors SPC metrics",
    capabilities: ["surface_finish_prediction", "tolerance_analysis", "spc_monitoring", "metrology"],
    priority: 8,
    confidence_baseline: 0.82,
  },
  {
    id: "safety-agent",
    type: "safety",
    name: "Safety Validation Agent",
    description: "Validates machine limits, detects collisions, calculates S(x) safety scores",
    capabilities: ["machine_limit_check", "collision_detection", "safety_scoring", "workholding_validation"],
    priority: 10,  // Highest priority - safety first
    confidence_baseline: 0.95,
  },
  {
    id: "tribal-agent",
    type: "tribal",
    name: "Tribal Knowledge Agent",
    description: "Applies shop-specific knowledge, operator tips, and proven practices",
    capabilities: ["tribal_modifiers", "operator_tips", "shop_practices", "proven_parameters"],
    priority: 7,
    confidence_baseline: 0.75,
  },
  {
    id: "planning-agent",
    type: "planning",
    name: "Planning Agent",
    description: "Creates multi-step plans, sequences operations, manages dependencies",
    capabilities: ["workflow_planning", "operation_sequencing", "dependency_management", "checkpoint_planning"],
    priority: 7,
    confidence_baseline: 0.78,
  },
  {
    id: "materials-agent",
    type: "materials",
    name: "Materials Science Agent",
    description: "Analyzes material properties, machinability, and material-specific behavior",
    capabilities: ["material_properties", "machinability_analysis", "hardness_effects", "thermal_properties"],
    priority: 8,
    confidence_baseline: 0.85,
  },
  {
    id: "tooling-agent",
    type: "tooling",
    name: "Tooling Agent",
    description: "Selects tools, predicts tool life, recommends coatings and geometries",
    capabilities: ["tool_selection", "tool_life_prediction", "coating_recommendation", "geometry_optimization"],
    priority: 8,
    confidence_baseline: 0.82,
  },
  {
    id: "cam-agent",
    type: "cam",
    name: "CAM Strategy Agent",
    description: "Recommends toolpath strategies, CAM settings, and machining approaches",
    capabilities: ["toolpath_strategy", "cam_optimization", "approach_selection", "feature_recognition"],
    priority: 7,
    confidence_baseline: 0.80,
  },
  {
    id: "costing-agent",
    type: "costing",
    name: "Costing Agent",
    description: "Estimates cycle times, calculates costs, analyzes profitability",
    capabilities: ["cycle_time_estimation", "cost_calculation", "profitability_analysis", "quote_generation"],
    priority: 6,
    confidence_baseline: 0.75,
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class MultiAgentCoordinatorEngine {
  private readonly engineName = "MultiAgentCoordinatorEngine";
  private agents: Map<string, AgentInstance> = new Map();
  private coordinationHistory: CoordinationResult[] = [];

  constructor() {
    this.initializeAgents();
  }

  /** Initialize all agent instances */
  private initializeAgents(): void {
    for (const def of AGENT_DEFINITIONS) {
      this.agents.set(def.id, {
        definition: def,
        status: "idle",
      });
    }
    log.info(`[${this.engineName}] Initialized ${this.agents.size} agents`);
  }

  /** Get available agents */
  getAgents(): AgentDefinition[] {
    return AGENT_DEFINITIONS;
  }

  /** Get agent by type */
  getAgentByType(type: AgentType): AgentDefinition | undefined {
    return AGENT_DEFINITIONS.find(a => a.type === type);
  }

  /** Get agents with specific capability */
  getAgentsWithCapability(capability: string): AgentDefinition[] {
    return AGENT_DEFINITIONS.filter(a => a.capabilities.includes(capability));
  }

  // ============================================================================
  // COORDINATION
  // ============================================================================

  /**
   * Coordinate multiple agents to complete a task.
   */
  async coordinate(request: CoordinationRequest): Promise<CoordinationResult> {
    const startTime = Date.now();
    log.info(`[${this.engineName}] Starting coordination: ${request.request_id} (${request.pattern})`);

    // Select agents for this task
    const selectedAgents = this.selectAgents(request);

    if (selectedAgents.length === 0) {
      return this.createFailedResult(request, "No suitable agents found", startTime);
    }

    // Execute based on pattern
    let agentResults: AgentResult[];
    switch (request.pattern) {
      case "parallel":
        agentResults = await this.executeParallel(selectedAgents, request);
        break;
      case "sequential":
        agentResults = await this.executeSequential(selectedAgents, request);
        break;
      case "consensus":
        agentResults = await this.executeConsensus(selectedAgents, request);
        break;
      case "hierarchical":
        agentResults = await this.executeHierarchical(selectedAgents, request);
        break;
      default:
        agentResults = await this.executeParallel(selectedAgents, request);
    }

    // Detect conflicts
    const conflicts = this.detectConflicts(agentResults);

    // Resolve conflicts
    const resolution = conflicts.length > 0
      ? this.resolveConflicts(conflicts, agentResults)
      : null;

    // Synthesize outputs
    const synthesis = this.synthesizeOutputs(agentResults, resolution);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(agentResults, conflicts);

    // Calculate consensus score for consensus pattern
    const consensusScore = request.pattern === "consensus"
      ? this.calculateConsensusScore(agentResults)
      : undefined;

    // Build reasoning chain
    const reasoningChain = this.buildReasoningChain(agentResults, conflicts, resolution);

    // Generate final recommendations
    const finalRecommendations = this.generateFinalRecommendations(agentResults, synthesis);

    const result: CoordinationResult = {
      request_id: request.request_id,
      status: this.determineStatus(agentResults, conflicts, consensusScore, request.consensus_threshold),
      pattern_used: request.pattern,
      agents_involved: selectedAgents.map(a => a.id),
      agent_results: agentResults,
      synthesized_output: synthesis.output,
      confidence,
      consensus_score: consensusScore,
      conflicts,
      resolution,
      total_duration_ms: Date.now() - startTime,
      reasoning_chain: reasoningChain,
      final_recommendations: finalRecommendations,
    };

    this.coordinationHistory.push(result);
    log.info(`[${this.engineName}] Coordination complete: ${result.status} (${result.total_duration_ms}ms)`);

    return result;
  }

  /** Select agents for a task based on required capabilities */
  private selectAgents(request: CoordinationRequest): AgentDefinition[] {
    if (request.required_agents && request.required_agents.length > 0) {
      return AGENT_DEFINITIONS.filter(a => request.required_agents!.includes(a.type));
    }

    // Auto-select based on capabilities
    const required = request.task.required_capabilities;
    if (required.length === 0) {
      // Default to core agents
      return AGENT_DEFINITIONS.filter(a =>
        ["physics", "optimization", "safety", "quality"].includes(a.type)
      );
    }

    const selected = new Set<AgentDefinition>();
    for (const cap of required) {
      const agents = this.getAgentsWithCapability(cap);
      agents.forEach(a => selected.add(a));
    }

    return Array.from(selected).sort((a, b) => b.priority - a.priority);
  }

  /** Execute agents in parallel */
  private async executeParallel(
    agents: AgentDefinition[],
    request: CoordinationRequest
  ): Promise<AgentResult[]> {
    const promises = agents.map(agent => this.executeAgent(agent, request));
    return Promise.all(promises);
  }

  /** Execute agents sequentially */
  private async executeSequential(
    agents: AgentDefinition[],
    request: CoordinationRequest
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    let accumulatedContext = { ...request.context };

    for (const agent of agents) {
      const result = await this.executeAgent(agent, {
        ...request,
        context: accumulatedContext,
      });
      results.push(result);

      // Pass output to next agent
      if (result.status === "success") {
        accumulatedContext = {
          ...accumulatedContext,
          [`${agent.type}_result`]: result.output,
        };
      }
    }

    return results;
  }

  /** Execute agents with consensus voting */
  private async executeConsensus(
    agents: AgentDefinition[],
    request: CoordinationRequest
  ): Promise<AgentResult[]> {
    // All agents work on the same problem independently
    return this.executeParallel(agents, request);
  }

  /** Execute with hierarchical delegation */
  private async executeHierarchical(
    agents: AgentDefinition[],
    request: CoordinationRequest
  ): Promise<AgentResult[]> {
    // Sort by priority (highest first is lead)
    const sorted = [...agents].sort((a, b) => b.priority - a.priority);
    const lead = sorted[0];
    const specialists = sorted.slice(1);

    // Lead agent first
    const leadResult = await this.executeAgent(lead, request);

    // Specialists work with lead's guidance
    const specialistResults = await Promise.all(
      specialists.map(s => this.executeAgent(s, {
        ...request,
        context: {
          ...request.context,
          lead_guidance: leadResult.output,
          lead_recommendations: leadResult.recommendations,
        },
      }))
    );

    return [leadResult, ...specialistResults];
  }

  /** Execute a single agent */
  private async executeAgent(
    agent: AgentDefinition,
    request: CoordinationRequest
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const instance = this.agents.get(agent.id)!;

    instance.status = "thinking";
    instance.current_task = request.task.task_id;
    instance.started_at = new Date().toISOString();

    try {
      // Simulate agent reasoning (in production, this would call actual engines)
      const output = await this.simulateAgentReasoning(agent, request);

      instance.status = "completed";
      instance.completed_at = new Date().toISOString();

      const result: AgentResult = {
        agent_id: agent.id,
        agent_type: agent.type,
        task_id: request.task.task_id,
        status: "success",
        output: output.value,
        confidence: output.confidence,
        reasoning: output.reasoning,
        evidence: output.evidence,
        duration_ms: Date.now() - startTime,
        recommendations: output.recommendations,
        warnings: output.warnings,
      };

      instance.result = result;
      return result;

    } catch (error) {
      instance.status = "failed";
      instance.error = String(error);

      return {
        agent_id: agent.id,
        agent_type: agent.type,
        task_id: request.task.task_id,
        status: "failed",
        output: null,
        confidence: 0,
        reasoning: `Agent failed: ${error}`,
        evidence: [],
        duration_ms: Date.now() - startTime,
        recommendations: [],
        warnings: [`${agent.name} failed to complete task`],
      };
    } finally {
      instance.status = "idle";
      instance.current_task = undefined;
    }
  }

  /** Simulate agent reasoning (would call actual engines in production) */
  private async simulateAgentReasoning(
    agent: AgentDefinition,
    request: CoordinationRequest
  ): Promise<{
    value: unknown;
    confidence: number;
    reasoning: string;
    evidence: string[];
    recommendations: string[];
    warnings: string[];
  }> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 10));

    const context = request.context || {};
    const task = request.task;

    // Agent-specific reasoning
    switch (agent.type) {
      case "physics":
        return this.physicsAgentReasoning(task, context);
      case "optimization":
        return this.optimizationAgentReasoning(task, context);
      case "quality":
        return this.qualityAgentReasoning(task, context);
      case "safety":
        return this.safetyAgentReasoning(task, context);
      case "tribal":
        return this.tribalAgentReasoning(task, context);
      case "materials":
        return this.materialsAgentReasoning(task, context);
      case "tooling":
        return this.toolingAgentReasoning(task, context);
      default:
        return this.genericAgentReasoning(agent, task, context);
    }
  }

  /** Physics agent reasoning */
  private physicsAgentReasoning(task: AgentTask, context: Record<string, unknown>) {
    const material = context.material as string || "steel";
    const operation = context.operation as string || "milling";

    return {
      value: {
        cutting_force_N: 850,
        power_kW: 4.2,
        temperature_C: 320,
        deflection_mm: 0.012,
        stable: true,
      },
      confidence: 0.88,
      reasoning: `Applied Kienzle force model for ${material} ${operation}. ` +
        `Thermal analysis shows acceptable temperature rise. ` +
        `Deflection within tolerance. SLD analysis confirms stable cutting.`,
      evidence: [
        "Kienzle model: Fc = kc1.1 * ap * fz^(1-mc)",
        "Taylor thermal model applied",
        "Deflection: delta = FL³/3EI",
        "SLD stability verified",
      ],
      recommendations: [
        "Parameters are within safe physics envelope",
        "Consider through-tool coolant for thermal management",
      ],
      warnings: [],
    };
  }

  /** Optimization agent reasoning */
  private optimizationAgentReasoning(task: AgentTask, context: Record<string, unknown>) {
    return {
      value: {
        optimized_speed_mpm: 180,
        optimized_feed_mm: 0.15,
        optimized_depth_mm: 2.5,
        mrr_cm3_min: 67.5,
        estimated_cycle_time_min: 12.4,
      },
      confidence: 0.82,
      reasoning: `Multi-objective optimization balancing MRR and tool life. ` +
        `Pareto frontier analysis selected optimal point. ` +
        `Speed reduced 8% from max to extend tool life by 35%.`,
      evidence: [
        "Pareto optimization complete",
        "Tool life constraint: T > 45 min",
        "MRR target: > 60 cm³/min",
      ],
      recommendations: [
        "Current parameters are 92% of theoretical maximum productivity",
        "Consider HEM strategy for 15% additional MRR",
      ],
      warnings: [],
    };
  }

  /** Quality agent reasoning */
  private qualityAgentReasoning(task: AgentTask, context: Record<string, unknown>) {
    return {
      value: {
        predicted_ra_um: 1.2,
        predicted_rz_um: 6.8,
        tolerance_achievable: true,
        cpk_estimate: 1.45,
      },
      confidence: 0.85,
      reasoning: `Surface finish prediction using empirical model. ` +
        `Feed marks dominant at this feed rate. ` +
        `Process capability adequate for specified tolerance.`,
      evidence: [
        "Ra = f²/(32*r) theoretical minimum",
        "BUE factor applied for material",
        "Cpk > 1.33 requirement met",
      ],
      recommendations: [
        "Finish pass recommended for Ra < 0.8 µm requirement",
        "Consider wiper insert geometry for improved finish",
      ],
      warnings: [],
    };
  }

  /** Safety agent reasoning */
  private safetyAgentReasoning(task: AgentTask, context: Record<string, unknown>) {
    return {
      value: {
        safety_score: 0.92,
        within_machine_limits: true,
        collision_risk: "none",
        workholding_adequate: true,
        emergency_stop_accessible: true,
      },
      confidence: 0.95,
      reasoning: `Safety validation complete. All parameters within machine envelope. ` +
        `Cutting forces well below workholding capacity. ` +
        `No collision risk detected in toolpath simulation.`,
      evidence: [
        "Spindle power: 4.2 kW < 15 kW limit",
        "Feed force: 320 N < fixture capacity 2000 N",
        "Collision simulation: PASS",
        "S(x) = 0.92 > 0.70 threshold",
      ],
      recommendations: [
        "Parameters approved for production",
        "Verify coolant nozzle position before start",
      ],
      warnings: [],
    };
  }

  /** Tribal agent reasoning */
  private tribalAgentReasoning(task: AgentTask, context: Record<string, unknown>) {
    const material = context.material as string || "steel";

    return {
      value: {
        speed_modifier: 0.95,
        feed_modifier: 1.0,
        proven_parameters: true,
        operator_notes: [`${material} runs best with flood coolant on this machine`],
      },
      confidence: 0.78,
      reasoning: `Consulted shop tribal knowledge for ${material}. ` +
        `5 similar jobs found with 92% success rate at these parameters. ` +
        `Operator preference: slight speed reduction for consistency.`,
      evidence: [
        "5 matching historical jobs",
        "92% first-pass success rate",
        "Operator validated approach",
      ],
      recommendations: [
        "Apply 5% speed reduction per shop practice",
        "Use flood coolant per operator preference",
      ],
      warnings: [],
    };
  }

  /** Materials agent reasoning */
  private materialsAgentReasoning(task: AgentTask, context: Record<string, unknown>) {
    const material = context.material as string || "steel";

    return {
      value: {
        hardness_hrc: 32,
        machinability_rating: 0.65,
        thermal_conductivity: 42,
        work_hardening_tendency: "moderate",
        recommended_approach: "conventional",
      },
      confidence: 0.88,
      reasoning: `Material analysis for ${material}. ` +
        `Moderate machinability with some work hardening tendency. ` +
        `Thermal properties favor conventional cutting over HSM.`,
      evidence: [
        "Material database lookup",
        "Machinability index calculated",
        "Work hardening coefficient from test data",
      ],
      recommendations: [
        "Avoid dwelling in cut",
        "Maintain consistent chip load",
      ],
      warnings: material.toLowerCase().includes("titanium")
        ? ["Titanium: monitor temperature closely"]
        : [],
    };
  }

  /** Tooling agent reasoning */
  private toolingAgentReasoning(task: AgentTask, context: Record<string, unknown>) {
    return {
      value: {
        recommended_tool: "carbide_endmill",
        coating: "AlTiN",
        geometry: "variable_helix",
        expected_life_min: 65,
      },
      confidence: 0.84,
      reasoning: `Tool selection based on material and operation. ` +
        `AlTiN coating optimal for elevated temperatures. ` +
        `Variable helix reduces harmonics for chatter-free cutting.`,
      evidence: [
        "Tool database match",
        "Coating thermal limit: 800°C",
        "Helix variation: 35°-38°",
      ],
      recommendations: [
        "Use tool presetter for accurate length",
        "Monitor for edge chipping after 50 min",
      ],
      warnings: [],
    };
  }

  /** Generic agent reasoning fallback */
  private genericAgentReasoning(
    agent: AgentDefinition,
    task: AgentTask,
    context: Record<string, unknown>
  ) {
    return {
      value: { status: "analyzed", agent: agent.type },
      confidence: agent.confidence_baseline,
      reasoning: `${agent.name} analyzed task: ${task.description}`,
      evidence: [`${agent.type} analysis complete`],
      recommendations: [],
      warnings: [],
    };
  }

  // ============================================================================
  // CONFLICT DETECTION & RESOLUTION
  // ============================================================================

  /** Detect conflicts between agent outputs */
  private detectConflicts(results: AgentResult[]): AgentConflict[] {
    const conflicts: AgentConflict[] = [];

    // Compare numeric outputs for significant differences
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const r1 = results[i];
        const r2 = results[j];

        if (r1.status !== "success" || r2.status !== "success") continue;

        const output1 = r1.output as Record<string, unknown> | null;
        const output2 = r2.output as Record<string, unknown> | null;

        if (!output1 || !output2) continue;

        // Check for conflicting speed recommendations
        if (output1.optimized_speed_mpm && output2.optimized_speed_mpm) {
          const speed1 = output1.optimized_speed_mpm as number;
          const speed2 = output2.optimized_speed_mpm as number;
          const diff = Math.abs(speed1 - speed2) / Math.max(speed1, speed2);

          if (diff > 0.2) {  // >20% difference
            conflicts.push({
              conflict_id: `conflict-speed-${Date.now()}`,
              agents: [r1.agent_id, r2.agent_id],
              issue: "Conflicting speed recommendations",
              values: { [r1.agent_id]: speed1, [r2.agent_id]: speed2 },
              severity: diff > 0.4 ? "high" : "medium",
            });
          }
        }

        // Check for safety vs optimization conflict
        if (r1.agent_type === "safety" && r2.agent_type === "optimization") {
          const safetyScore = (output1.safety_score as number) || 1;
          const isAggressive = (output2.optimized_speed_mpm as number) > 200;

          if (safetyScore < 0.85 && isAggressive) {
            conflicts.push({
              conflict_id: `conflict-safety-opt-${Date.now()}`,
              agents: [r1.agent_id, r2.agent_id],
              issue: "Safety concerns with aggressive optimization",
              values: { safety_score: safetyScore, aggressive_optimization: isAggressive },
              severity: "high",
            });
          }
        }
      }
    }

    return conflicts;
  }

  /** Resolve conflicts between agents */
  private resolveConflicts(
    conflicts: AgentConflict[],
    results: AgentResult[]
  ): ConflictResolution | null {
    if (conflicts.length === 0) return null;

    // Take the first (most severe) conflict
    const conflict = conflicts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })[0];

    // Find results for conflicting agents
    const agentResults = results.filter(r => conflict.agents.includes(r.agent_id));

    // Resolution strategy based on conflict type
    if (conflict.issue.includes("safety")) {
      // Safety always wins
      const safetyResult = agentResults.find(r => r.agent_type === "safety");
      return {
        conflict_id: conflict.conflict_id,
        strategy: "authority",
        chosen_value: safetyResult?.output,
        chosen_agent: safetyResult?.agent_id || conflict.agents[0],
        reasoning: "Safety agent has highest authority for safety-related conflicts",
      };
    }

    // For numeric conflicts, use physics-based resolution
    if (conflict.issue.includes("speed") || conflict.issue.includes("feed")) {
      const physicsResult = agentResults.find(r => r.agent_type === "physics");
      if (physicsResult) {
        return {
          conflict_id: conflict.conflict_id,
          strategy: "physics_based",
          chosen_value: physicsResult.output,
          chosen_agent: physicsResult.agent_id,
          reasoning: "Physics model provides authoritative constraints",
        };
      }

      // Otherwise, take conservative value
      const values = Object.values(conflict.values).filter(v => typeof v === "number") as number[];
      const conservative = Math.min(...values);
      const conservativeAgent = Object.entries(conflict.values).find(
        ([_, v]) => v === conservative
      )?.[0];

      return {
        conflict_id: conflict.conflict_id,
        strategy: "conservative",
        chosen_value: conservative,
        chosen_agent: conservativeAgent || conflict.agents[0],
        reasoning: "Conservative value chosen to minimize risk",
      };
    }

    // Default: highest priority agent wins
    const highestPriority = agentResults.sort((a, b) => {
      const defA = AGENT_DEFINITIONS.find(d => d.id === a.agent_id);
      const defB = AGENT_DEFINITIONS.find(d => d.id === b.agent_id);
      return (defB?.priority || 0) - (defA?.priority || 0);
    })[0];

    return {
      conflict_id: conflict.conflict_id,
      strategy: "authority",
      chosen_value: highestPriority.output,
      chosen_agent: highestPriority.agent_id,
      reasoning: `${highestPriority.agent_type} agent has highest authority`,
    };
  }

  // ============================================================================
  // SYNTHESIS & CONFIDENCE
  // ============================================================================

  /** Synthesize outputs from multiple agents */
  private synthesizeOutputs(
    results: AgentResult[],
    resolution: ConflictResolution | null
  ): { output: unknown } {
    const successful = results.filter(r => r.status === "success");

    if (successful.length === 0) {
      return { output: null };
    }

    // Merge all outputs
    const merged: Record<string, unknown> = {};

    for (const result of successful) {
      const output = result.output as Record<string, unknown> | null;
      if (output && typeof output === "object") {
        Object.assign(merged, output);
      }
    }

    // Apply resolution if there was a conflict
    if (resolution) {
      const resOutput = resolution.chosen_value as Record<string, unknown> | null;
      if (resOutput && typeof resOutput === "object") {
        Object.assign(merged, resOutput);
      }
    }

    return { output: merged };
  }

  /** Calculate overall confidence from agent results */
  private calculateOverallConfidence(
    results: AgentResult[],
    conflicts: AgentConflict[]
  ): number {
    const successful = results.filter(r => r.status === "success");

    if (successful.length === 0) return 0;

    // Weighted average by agent priority
    let weightedSum = 0;
    let weightSum = 0;

    for (const result of successful) {
      const def = AGENT_DEFINITIONS.find(d => d.id === result.agent_id);
      const weight = def?.priority || 5;
      weightedSum += result.confidence * weight;
      weightSum += weight;
    }

    let confidence = weightedSum / weightSum;

    // Reduce confidence for each conflict
    confidence -= conflicts.length * 0.05;

    // Reduce for any failed agents
    const failedCount = results.filter(r => r.status === "failed").length;
    confidence -= failedCount * 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /** Calculate consensus score */
  private calculateConsensusScore(results: AgentResult[]): number {
    const successful = results.filter(r => r.status === "success");
    if (successful.length < 2) return 1;

    // Compare outputs for agreement
    let agreements = 0;
    let comparisons = 0;

    for (let i = 0; i < successful.length; i++) {
      for (let j = i + 1; j < successful.length; j++) {
        comparisons++;
        const o1 = successful[i].output as Record<string, unknown> | null;
        const o2 = successful[j].output as Record<string, unknown> | null;

        if (o1 && o2) {
          // Check for similar confidence levels
          const confDiff = Math.abs(successful[i].confidence - successful[j].confidence);
          if (confDiff < 0.2) agreements += 0.5;

          // Check for similar outputs (simplified)
          const match = JSON.stringify(o1) === JSON.stringify(o2);
          if (match) agreements += 0.5;
        }
      }
    }

    return comparisons > 0 ? agreements / comparisons : 1;
  }

  /** Determine overall status */
  private determineStatus(
    results: AgentResult[],
    conflicts: AgentConflict[],
    consensusScore: number | undefined,
    consensusThreshold: number | undefined
  ): CoordinationResult["status"] {
    const allFailed = results.every(r => r.status === "failed");
    if (allFailed) return "failed";

    const anyFailed = results.some(r => r.status === "failed");
    const hasHighSeverityConflict = conflicts.some(c => c.severity === "critical" || c.severity === "high");

    if (consensusScore !== undefined && consensusThreshold !== undefined) {
      if (consensusScore < consensusThreshold) return "consensus_failed";
    }

    if (anyFailed || hasHighSeverityConflict) return "partial";

    return "success";
  }

  /** Build reasoning chain from agent results */
  private buildReasoningChain(
    results: AgentResult[],
    conflicts: AgentConflict[],
    resolution: ConflictResolution | null
  ): string[] {
    const chain: string[] = [];

    // Agent contributions
    for (const result of results.filter(r => r.status === "success")) {
      chain.push(`[${result.agent_type}] ${result.reasoning}`);
    }

    // Conflict detection
    for (const conflict of conflicts) {
      chain.push(`[CONFLICT] ${conflict.issue} between ${conflict.agents.join(", ")}`);
    }

    // Resolution
    if (resolution) {
      chain.push(`[RESOLUTION] ${resolution.strategy}: ${resolution.reasoning}`);
    }

    return chain;
  }

  /** Generate final recommendations */
  private generateFinalRecommendations(
    results: AgentResult[],
    synthesis: { output: unknown }
  ): string[] {
    const recs: string[] = [];

    // Collect all recommendations
    for (const result of results.filter(r => r.status === "success")) {
      recs.push(...result.recommendations);
    }

    // Collect warnings as recommendations
    for (const result of results) {
      for (const warning of result.warnings) {
        recs.push(`⚠️ ${warning}`);
      }
    }

    // Deduplicate
    return [...new Set(recs)];
  }

  /** Create a failed coordination result */
  private createFailedResult(
    request: CoordinationRequest,
    reason: string,
    startTime: number
  ): CoordinationResult {
    return {
      request_id: request.request_id,
      status: "failed",
      pattern_used: request.pattern,
      agents_involved: [],
      agent_results: [],
      synthesized_output: null,
      confidence: 0,
      conflicts: [],
      resolution: null,
      total_duration_ms: Date.now() - startTime,
      reasoning_chain: [`Failed: ${reason}`],
      final_recommendations: [],
    };
  }

  // ============================================================================
  // MULTI-AGENT REASONING
  // ============================================================================

  /**
   * Generate detailed multi-agent reasoning explanation.
   */
  generateMultiAgentReasoning(result: CoordinationResult): MultiAgentReasoning {
    const contributions = result.agent_results
      .filter(r => r.status === "success")
      .map(r => ({
        agent: r.agent_type,
        contribution: r.reasoning,
        weight: r.confidence,
      }));

    const confidenceBreakdown: Record<string, number> = {};
    for (const r of result.agent_results) {
      confidenceBreakdown[r.agent_type] = r.confidence;
    }

    const dissenting = result.agent_results
      .filter(r => r.confidence < 0.6 || r.warnings.length > 0)
      .map(r => `${r.agent_type}: ${r.warnings.join(", ") || "low confidence"}`);

    return {
      coordination_summary: `${result.agents_involved.length} agents coordinated using ${result.pattern_used} pattern. ` +
        `${result.conflicts.length} conflicts detected and resolved.`,
      agent_contributions: contributions,
      synthesis_approach: result.conflicts.length > 0
        ? `Conflict resolution via ${result.resolution?.strategy || "authority"}`
        : "Direct synthesis of agent outputs",
      confidence_breakdown: confidenceBreakdown,
      dissenting_opinions: dissenting,
      key_tradeoffs: result.final_recommendations.filter(r => r.includes("vs") || r.includes("tradeoff")),
    };
  }

  /** Clear coordination history */
  clearHistory(): void {
    this.coordinationHistory = [];
  }

  /** Get coordination history */
  getHistory(): CoordinationResult[] {
    return [...this.coordinationHistory];
  }
}

export const multiAgentCoordinatorEngine = new MultiAgentCoordinatorEngine();
