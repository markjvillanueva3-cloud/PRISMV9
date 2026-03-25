/**
 * ============================================================================
 * PRISM MULTI-AGENT ARCHITECTURE BLUEPRINT v1.0
 * ============================================================================
 *
 * This file contains the comprehensive multi-agent architecture design for
 * PRISM Manufacturing Intelligence, informed by analysis of:
 *
 *   Book Patterns (Agentic Patterns):
 *   - Chapter 7:  Multi-Agent Collaboration (hierarchical, sequential, parallel, debate)
 *   - Chapter 15: Inter-Agent Communication / A2A Protocol
 *   - Chapter 6:  Planning (decomposition, adaptive replanning)
 *   - Chapter 3:  Parallelization (fan-out/fan-in, concurrent validation)
 *   - Chapter 11: Goal Setting & Monitoring (SMART goals, feedback loops)
 *
 *   PRISM Infrastructure (existing):
 *   - agentConfig.ts:        5 subagents (SF, Feasibility, Simulation, CAM, Quote)
 *   - AgentExecutor.ts:      Task queue, parallel/pipeline execution, Anthropic API
 *   - SwarmExecutor.ts:      8 patterns (parallel, pipeline, consensus, competition, etc.)
 *   - HookEngine.ts:         59+ hooks with blocking safety gates
 *   - EventBus.ts:           Typed pub/sub with correlation tracking
 *   - AgentRegistry.ts:      64+ agents with capabilities, dependencies, metrics
 *   - orchestrationDispatcher: 27 actions (agent, swarm, roadmap, claim/release)
 *   - autonomousDispatcher:  ATCS bridge with cost control, safety escalation
 *   - sampling.ts:           Server-side LLM orchestration via MCP sampling
 *   - taskTools.ts:          Async tasks with polling (CNC simulation)
 *
 * The blueprint is expressed as TypeScript types and interfaces that conform
 * to PRISM's existing conventions. It is NOT runnable code — it is a design
 * document in code form, ready to be implemented incrementally.
 *
 * @see data/docs/MASTER_INDEX_COMPACT.md for system scale
 * @see src/engines/AgentExecutor.ts for existing execution infrastructure
 * @see src/engines/SwarmExecutor.ts for swarm patterns
 */

// ============================================================================
// SECTION 1: CURRENT STATE ANALYSIS
// ============================================================================

/**
 * ## 1. Current Agent Topology
 *
 * PRISM already has a Supervisor-model multi-agent system:
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │  Coordinator Agent (Opus)                               │
 * │  - System prompt: delegation rules, safety constraints  │
 * │  - Tools: all mcp__prism__* + Read/Grep/Agent           │
 * │  - Budget: $5.00 / 50 turns                             │
 * ├─────────────────────────────────────────────────────────┤
 * │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
 * │  │ SF Expert     │  │ Feasibility  │  │ Simulator    │  │
 * │  │ (Haiku)       │  │ (Sonnet)     │  │ (Sonnet)     │  │
 * │  │ prism_calc    │  │ prism_feas   │  │ prism_cnc    │  │
 * │  │ prism_data    │  │ prism_data   │  │ prism_calc   │  │
 * │  │               │  │ prism_calc   │  │ prism_data   │  │
 * │  └──────────────┘  └──────────────┘  └──────────────┘  │
 * │  ┌──────────────┐  ┌──────────────┐                     │
 * │  │ CAM Strategy  │  │ Quote Est.   │                     │
 * │  │ (Sonnet)      │  │ (Haiku)      │                     │
 * │  │ prism_cam     │  │ prism_biz    │                     │
 * │  │ prism_toolp   │  │ prism_calc   │                     │
 * │  │ prism_data    │  │ prism_data   │                     │
 * │  └──────────────┘  └──────────────┘                     │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * Parallel infrastructure:
 *   - AgentExecutor:      executeAgentsParallel(), executeAgentPipeline()
 *   - SwarmExecutor:      8 patterns, all operational
 *   - AutoPilot v3:       7-lens brainstorm with parallel API calls + RALPH loops
 *   - autonomousDispatcher: ATCS bridge with cost/safety gates
 *   - orchestrationDispatcher: swarm_quick for auto-pattern selection
 *   - EventBus:           pub/sub with correlation IDs
 *   - HookEngine:         59 Phase-0 hooks, 7,073 domain hooks
 *   - TaskClaimService:   mkdir-based locking for multi-Claude coordination
 *
 * What's MISSING:
 *   1. No formal job decomposition (print → setups → operations → parameters)
 *   2. No structured inter-agent conflict resolution protocol
 *   3. No A2A-style external agent integration (ERP, CAM, machines)
 *   4. No LoopAgent pattern for iterative optimization convergence
 *   5. No debate/consensus for safety-critical parameter decisions
 *   6. No goal monitoring with SMART criteria per operation
 *   7. Agent topology is flat — all 5 subagents report to one coordinator
 */

// ============================================================================
// SECTION 2: BOOK PATTERNS APPLICABLE TO MANUFACTURING
// ============================================================================

/**
 * ## 2. Pattern-to-Manufacturing Mapping
 *
 * ### 2A. Sequential Handoff (Ch.7 / Ch.6)
 * Manufacturing NATURAL FIT: operations proceed in sequence.
 *
 * Use cases:
 *   - Print reading → material selection → setup planning → toolpath → G-code → verify
 *   - Raw stock → Op10 (face) → Op20 (rough) → Op30 (finish) → Op40 (bore) → inspect
 *   - Each operation's output (workpiece state) feeds the next operation's input
 *
 * PRISM mapping: SequentialAgent pattern via executeAgentPipeline()
 * The key insight from Ch.7: use `output_key` to store intermediate workpiece
 * state in session, so each operation agent reads the prior agent's result.
 *
 * ### 2B. Parallel Fan-Out/Fan-In (Ch.3)
 * Manufacturing NATURAL FIT: independent validations run concurrently.
 *
 * Use cases:
 *   - Fan-out: run Kienzle force, Taylor tool life, stability lobe, thermal,
 *     deflection, surface finish, and power checks IN PARALLEL for one cut
 *   - Fan-out: validate 5 different setups simultaneously
 *   - Fan-in: merge all 67 analysis points into a single recommendation
 *
 * PRISM mapping: ParallelAgent via executeAgentsParallel() or swarm_parallel
 *
 * ### 2C. Debate/Consensus (Ch.7)
 * Manufacturing CRITICAL for safety decisions.
 *
 * Use cases:
 *   - SF agent recommends 8000 RPM. Simulation shows chatter at 7500+.
 *     Safety agent flags thermal risk. Consensus: reduce to 7000 RPM.
 *   - Three agents independently calculate tool life from different models.
 *     Consensus vote picks the median, not the optimistic outlier.
 *   - Feasibility says pass, but Simulation shows collision in one setup.
 *     Debate protocol escalates to human review.
 *
 * PRISM mapping: swarm_consensus with consensusThreshold >= 0.67 for safety
 *
 * ### 2D. Hierarchical Delegation (Ch.7)
 * Manufacturing NATURAL FIT: job → setup → operation → parameter.
 *
 * Use cases:
 *   - Level 1 planner decomposes a part into 4 setups
 *   - Level 2 setup agents each plan 3-5 operations
 *   - Level 3 parameter agents compute physics for each operation
 *   - Results flow UP: parameters → operation plans → setup plans → job plan
 *
 * PRISM mapping: NEW — requires the 3-level hierarchy in Section 3
 *
 * ### 2E. LoopAgent / Iterative Optimization (Ch.7 / Ch.11)
 * Manufacturing USE: converging on optimal parameters.
 *
 * Use cases:
 *   - Start with conservative S/F → simulate → check stability → adjust → repeat
 *   - Optimize MRR while staying within force/thermal/deflection limits
 *   - RALPH loops already do this (4 iterations of scrutinize/improve/validate)
 *
 * PRISM mapping: RALPH loops in AutoPilot + new LoopAgent wrapper
 *
 * ### 2F. Agent-as-Tool (Ch.7)
 * Manufacturing USE: dynamic delegation to specialist.
 *
 * Use cases:
 *   - Planner calls "physics_check" which is actually the SF Expert agent
 *   - CAM agent calls "simulate_toolpath" which invokes the Simulation agent
 *   - Quote agent calls "get_cycle_time" which delegates to SF + Simulation
 *
 * PRISM mapping: AgentTool wrapper around existing subagents
 */

// ============================================================================
// SECTION 3: PROPOSED 3-LEVEL HIERARCHY
// ============================================================================

/**
 * ## 3. Three-Level Manufacturing Agent Hierarchy
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ LEVEL 1: MANUFACTURING PLANNER (Opus)                                  │
 * │ Role: Decompose jobs into setups and operations                        │
 * │ Pattern: Planning (Ch.6) + Hierarchical Delegation (Ch.7)              │
 * │ Owns: Job context, setup sequence, global constraints                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐             │
 * │   │ L2: SETUP-A   │  │ L2: SETUP-B   │  │ L2: SETUP-C   │  ...        │
 * │   │ (Sonnet)      │  │ (Sonnet)      │  │ (Sonnet)      │             │
 * │   │ Op10, Op20    │  │ Op30, Op40    │  │ Op50, Op60    │             │
 * │   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘             │
 * │           │                   │                   │                     │
 * │   ┌───────┴───────┐  ┌───────┴───────┐  ┌───────┴───────┐             │
 * │   │ L3 AGENTS     │  │ L3 AGENTS     │  │ L3 AGENTS     │             │
 * │   │ ┌─────┐┌────┐│  │ ┌─────┐┌────┐│  │ ┌─────┐┌────┐│             │
 * │   │ │Phys ││Safe││  │ │Phys ││Safe││  │ │Phys ││Safe││             │
 * │   │ │(Hku)││(Son)││  │ │(Hku)││(Son)││  │ │(Hku)││(Son)││             │
 * │   │ └─────┘└────┘│  │ └─────┘└────┘│  │ └─────┘└────┘│             │
 * │   │ ┌─────┐┌────┐│  │ ┌─────┐┌────┐│  │ ┌─────┐┌────┐│             │
 * │   │ │Qual ││CAM ││  │ │Qual ││CAM ││  │ │Qual ││CAM ││             │
 * │   │ │(Hku)││(Son)││  │ │(Hku)││(Son)││  │ │(Hku)││(Son)││             │
 * │   │ └─────┘└────┘│  │ └─────┘└────┘│  │ └─────┘└────┘│             │
 * │   └──────────────┘  └──────────────┘  └──────────────┘             │
 * └─────────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * Level 2 setup agents run IN PARALLEL when setups are independent.
 * Level 3 calculation agents run IN PARALLEL within each setup.
 * Safety consensus runs AFTER all L3 agents complete for a setup.
 */

// ---------------------------------------------------------------------------
// Level 1: Manufacturing Planner
// ---------------------------------------------------------------------------

/** The top-level job planner that decomposes work. */
export interface ManufacturingPlanner {
  /** Unique planner agent ID */
  id: "PLANNER-MFG-001";
  model: "opus";

  /** Accepts a manufacturing job specification and produces a plan. */
  plan(job: ManufacturingJob): Promise<ManufacturingPlan>;

  /** Replans when a setup or operation fails or constraints change. */
  replan(
    plan: ManufacturingPlan,
    failure: OperationFailure
  ): Promise<ManufacturingPlan>;

  /** Monitors goal completion across all setups (Ch.11 pattern). */
  monitorGoals(plan: ManufacturingPlan): Promise<GoalStatus[]>;
}

/** Input: what needs to be manufactured. */
export interface ManufacturingJob {
  job_id: string;
  part_number: string;
  material: string;
  quantity: number;
  tolerances: ToleranceSpec[];
  machine_constraints?: MachineConstraints;
  due_date?: string;

  /** Optional: customer-specified operations (override auto-decomposition). */
  prescribed_operations?: OperationSpec[];

  /** Optional: CAD/STEP geometry reference. */
  geometry_ref?: string;
}

/** Output: structured plan with setups and operations. */
export interface ManufacturingPlan {
  plan_id: string;
  job_id: string;
  created_at: string;
  status: "draft" | "validated" | "executing" | "completed" | "failed";

  /** Ordered list of setups (may contain parallel groups). */
  setups: SetupPlan[];

  /** Global constraints that apply to all setups. */
  global_constraints: GlobalConstraints;

  /** Goal tracking per the Ch.11 pattern. */
  goals: ManufacturingGoal[];

  /** Estimated total cycle time (seconds). */
  estimated_cycle_time_s: number;

  /** Estimated cost (USD). */
  estimated_cost_usd: number;
}

export interface SetupPlan {
  setup_id: string;
  setup_number: number;
  fixture: string;
  workholding: string;
  datum: string;

  /** Operations within this setup, in sequence. */
  operations: OperationPlan[];

  /** Can this setup run in parallel with others? */
  parallel_group?: string;

  /** Dependencies: setup IDs that must complete first. */
  dependencies: string[];
}

export interface OperationPlan {
  operation_id: string;
  operation_number: number;
  type: OperationType;
  description: string;

  /** Tool assembly for this operation. */
  tool: ToolAssemblyRef;

  /** Cutting parameters (filled by L3 Physics agent). */
  parameters?: CuttingParameters;

  /** Safety analysis (filled by L3 Safety agent). */
  safety?: SafetyAnalysis;

  /** Quality prediction (filled by L3 Quality agent). */
  quality?: QualityPrediction;

  /** CAM strategy (filled by L3 CAM agent). */
  cam_strategy?: CamStrategy;

  /** Goal: what this operation must achieve. */
  goal: OperationGoal;
}

export type OperationType =
  | "face" | "rough" | "semi_finish" | "finish"
  | "drill" | "bore" | "ream" | "tap" | "thread_mill"
  | "pocket" | "contour" | "slot" | "chamfer" | "deburr"
  | "turn_rough" | "turn_finish" | "groove" | "part_off"
  | "grind" | "edm_wire" | "edm_sinker"
  | "inspect" | "custom";

// ---------------------------------------------------------------------------
// Level 2: Operation Specialist Agents
// ---------------------------------------------------------------------------

/** A Level 2 agent that manages one setup's operations. */
export interface SetupAgent {
  id: string;
  model: "sonnet";
  setup_plan: SetupPlan;

  /** Execute all operations in this setup, coordinating L3 agents. */
  executeSetup(
    context: SetupContext
  ): Promise<SetupResult>;

  /** Handle operation failure: retry, adjust, or escalate to L1. */
  handleFailure(
    operation: OperationPlan,
    failure: OperationFailure
  ): Promise<FailureResolution>;
}

export interface SetupContext {
  /** Workpiece state inherited from previous setup. */
  workpiece_state: WorkpieceState;

  /** Machine capabilities for this setup. */
  machine: MachineCapabilities;

  /** Shared session state keys from the planner. */
  session_state: Record<string, unknown>;
}

export interface SetupResult {
  setup_id: string;
  status: "completed" | "partial" | "failed";
  operations: OperationResult[];
  workpiece_state_out: WorkpieceState;
  cycle_time_s: number;
  safety_score: number;
}

// ---------------------------------------------------------------------------
// Level 3: Calculation Agents (run in parallel per operation)
// ---------------------------------------------------------------------------

/** Physics calculation agent — Kienzle, Taylor, stability, thermal, deflection. */
export interface PhysicsAgent {
  id: "L3-PHYSICS";
  model: "haiku";

  /** Calculate cutting parameters for an operation. */
  calculate(
    operation: OperationPlan,
    material: MaterialProperties,
    tool: ToolAssemblyRef,
    machine: MachineCapabilities
  ): Promise<CuttingParameters>;
}

/** Safety analysis agent — collision, force limits, chatter, thermal. */
export interface SafetyAgent {
  id: "L3-SAFETY";
  model: "sonnet";

  /** Analyze safety of proposed parameters. */
  analyze(
    parameters: CuttingParameters,
    operation: OperationPlan,
    machine: MachineCapabilities
  ): Promise<SafetyAnalysis>;
}

/** Quality prediction agent — surface finish, dimensional, Cpk. */
export interface QualityAgent {
  id: "L3-QUALITY";
  model: "haiku";

  /** Predict quality outcomes from parameters. */
  predict(
    parameters: CuttingParameters,
    operation: OperationPlan,
    tolerances: ToleranceSpec[]
  ): Promise<QualityPrediction>;
}

/** CAM strategy agent — toolpath selection, cross-CAM comparison. */
export interface CamStrategyAgent {
  id: "L3-CAM";
  model: "sonnet";

  /** Recommend toolpath strategy for an operation. */
  recommend(
    operation: OperationPlan,
    material: MaterialProperties,
    machine: MachineCapabilities
  ): Promise<CamStrategy>;
}

// ============================================================================
// SECTION 4: COMMUNICATION PROTOCOL
// ============================================================================

/**
 * ## 4. Inter-Agent Communication Protocol
 *
 * Three mechanisms, layered:
 *
 * ### 4A. Shared Session State (synchronous, lightweight)
 * Agents read/write to a shared state map, keyed by operation.
 * This maps to the Google ADK `output_key` pattern from Ch.3/Ch.7.
 *
 * ### 4B. Event Bus (asynchronous, decoupled)
 * Using the existing PRISM EventBus with correlation IDs.
 * Events propagate safety alerts, completion signals, and goal updates.
 *
 * ### 4C. Message Passing (structured, for handoffs)
 * For sequential handoff between operations, a typed message carries
 * the workpiece state from one operation agent to the next.
 */

/** Session state keys that agents share. Convention: `{level}:{setup}:{op}:{field}` */
export interface AgentSessionState {
  /** L1 writes, L2/L3 read */
  "plan:current": ManufacturingPlan;
  "plan:global_constraints": GlobalConstraints;

  /** L2 writes, L3 reads */
  [key: `setup:${string}:workpiece_state`]: WorkpieceState;
  [key: `setup:${string}:machine`]: MachineCapabilities;

  /** L3 writes, L2 reads */
  [key: `op:${string}:parameters`]: CuttingParameters;
  [key: `op:${string}:safety`]: SafetyAnalysis;
  [key: `op:${string}:quality`]: QualityPrediction;
  [key: `op:${string}:cam_strategy`]: CamStrategy;

  /** Cross-cutting */
  [key: `goal:${string}`]: GoalStatus;
  [key: `conflict:${string}`]: ConflictRecord;
}

/** Events emitted on the EventBus for inter-agent coordination. */
export interface AgentEvents {
  /** L1 → L2: setup is ready to execute */
  "agent.setup.ready": {
    setup_id: string;
    plan_id: string;
    workpiece_state: WorkpieceState;
  };

  /** L2 → L1: setup completed */
  "agent.setup.complete": {
    setup_id: string;
    result: SetupResult;
  };

  /** L3 → L2: operation calculation complete */
  "agent.operation.calculated": {
    operation_id: string;
    agent_type: "physics" | "safety" | "quality" | "cam";
    result: unknown;
  };

  /** Any → All: safety alert (high priority, blocks execution) */
  "agent.safety.alert": {
    source_agent: string;
    operation_id: string;
    severity: "warning" | "critical" | "emergency";
    description: string;
    recommended_action: string;
  };

  /** L2 → L1: conflict detected between L3 agents */
  "agent.conflict.detected": {
    conflict: ConflictRecord;
  };

  /** L1: goal status update */
  "agent.goal.updated": {
    goal_id: string;
    status: GoalStatus;
  };
}

/** Message passed in sequential handoff between operations. */
export interface OperationHandoffMessage {
  from_operation_id: string;
  to_operation_id: string;
  timestamp: string;

  /** Workpiece state after the prior operation. */
  workpiece_state: WorkpieceState;

  /** Accumulated cycle time so far. */
  cumulative_cycle_time_s: number;

  /** Any warnings or notes from the prior operation. */
  notes: string[];

  /** Correlation ID for tracing the full operation chain. */
  correlation_id: string;
}

// ============================================================================
// SECTION 5: CONFLICT RESOLUTION PROTOCOL
// ============================================================================

/**
 * ## 5. Conflict Resolution: When Agents Disagree
 *
 * Manufacturing conflict example:
 *   - Physics agent: RPM 8000, feed 0.15mm/tooth → MRR optimal
 *   - Safety agent: chatter risk above 7200 RPM (stability lobe boundary)
 *   - Quality agent: Ra 1.6 requires RPM >= 7500
 *   - CAM agent: strategy needs minimum 0.12mm/tooth
 *
 * Resolution protocol (escalation ladder):
 *
 * ```
 *   Step 1: CONSTRAINT INTERSECTION (automatic)
 *     Find parameter ranges where ALL agents' constraints overlap.
 *     If overlap exists → use center of intersection.
 *     Physics: [6000-8000], Safety: [0-7200], Quality: [7500+], CAM: [any]
 *     Intersection: [7500-7200] = EMPTY → escalate
 *
 *   Step 2: PRIORITY-WEIGHTED CONSENSUS (swarm_consensus)
 *     Run consensus with safety-weighted voting:
 *       Safety weight:  3.0 (veto power on critical)
 *       Quality weight: 2.0
 *       Physics weight: 1.5
 *       CAM weight:     1.0
 *     Threshold: 0.67 (supermajority)
 *     If consensus reached → accept
 *
 *   Step 3: SAFETY-FIRST OVERRIDE (automatic)
 *     If no consensus, apply Safety agent's recommendation.
 *     Log the override with full rationale.
 *     Flag for human review.
 *
 *   Step 4: HUMAN ESCALATION (terminal)
 *     If Safety agent's recommendation also fails quality gates,
 *     pause execution and request human decision.
 * ```
 */

export interface ConflictRecord {
  conflict_id: string;
  operation_id: string;
  timestamp: string;

  /** The parameter under dispute. */
  parameter: string;

  /** Each agent's recommendation with rationale. */
  positions: AgentPosition[];

  /** Resolution attempt results. */
  resolution: ConflictResolution;
}

export interface AgentPosition {
  agent_id: string;
  agent_type: "physics" | "safety" | "quality" | "cam";
  recommended_value: number;
  acceptable_range: { min: number; max: number };
  confidence: number;
  rationale: string;

  /** Priority weight for consensus voting. */
  weight: number;
}

export type ConflictResolution =
  | {
      method: "constraint_intersection";
      resolved: true;
      value: number;
      intersection: { min: number; max: number };
    }
  | {
      method: "weighted_consensus";
      resolved: true;
      value: number;
      consensus_score: number;
      votes: Record<string, number>;
    }
  | {
      method: "safety_override";
      resolved: true;
      value: number;
      overridden_agents: string[];
      safety_rationale: string;
      flagged_for_review: true;
    }
  | {
      method: "human_escalation";
      resolved: false;
      reason: string;
      all_positions: AgentPosition[];
      awaiting_human: true;
    };

/** The conflict resolution engine that implements the escalation ladder. */
export interface ConflictResolver {
  /** Attempt automatic resolution of an agent disagreement. */
  resolve(
    positions: AgentPosition[],
    parameter: string,
    operation_id: string
  ): Promise<ConflictResolution>;

  /** Register resolution weights per agent type. */
  weights: {
    safety: 3.0;
    quality: 2.0;
    physics: 1.5;
    cam: 1.0;
  };

  /** Consensus threshold (supermajority for safety-critical). */
  consensus_threshold: 0.67;
}

// ============================================================================
// SECTION 6: A2A INTEGRATION — EXTERNAL AGENTS
// ============================================================================

/**
 * ## 6. A2A Integration: External Agent Protocol
 *
 * Following the A2A pattern from Ch.15, PRISM exposes an Agent Card
 * and can discover external agents. Three integration points:
 *
 * ### 6A. ERP Agent (inbound: job orders, material stock, scheduling)
 * ### 6B. CAM Agent (bidirectional: toolpath requests and G-code delivery)
 * ### 6C. Machine Monitoring Agent (inbound: real-time spindle load, vibration)
 *
 * Each external agent communicates via HTTP JSON-RPC 2.0 (A2A spec).
 * PRISM acts as both A2A Client (discovering external agents) and
 * A2A Server (exposing manufacturing intelligence capabilities).
 */

/** PRISM's Agent Card — discoverable at /.well-known/agent.json */
export interface PrismAgentCard {
  name: "PRISM Manufacturing Intelligence";
  description: "Autonomous manufacturing intelligence with 1,245 engines, physics-backed speed/feed, CNC simulation, feasibility analysis, and quoting.";
  url: string;
  version: "7.0.0";
  capabilities: {
    streaming: true;
    pushNotifications: true;
    stateTransitionHistory: true;
  };
  authentication: {
    schemes: ["apiKey", "oauth2"];
  };
  defaultInputModes: ["text", "application/json"];
  defaultOutputModes: ["text", "application/json"];
  skills: PrismSkill[];
}

export interface PrismSkill {
  id: string;
  name: string;
  description: string;
  inputModes: string[];
  outputModes: string[];
  examples: string[];
  tags: string[];
}

/** External agent registration and discovery. */
export interface ExternalAgentRegistry {
  /** Discover agents from a well-known URI or registry. */
  discover(url: string): Promise<ExternalAgentCard>;

  /** Register an external agent for use by PRISM agents. */
  register(card: ExternalAgentCard): void;

  /** Send a task to an external agent (A2A sendTask). */
  sendTask(
    agent_url: string,
    task: A2ATask
  ): Promise<A2ATaskResult>;

  /** Subscribe to streaming updates from an external agent. */
  subscribe(
    agent_url: string,
    task_id: string,
    callback: (update: A2ATaskUpdate) => void
  ): void;
}

export interface ExternalAgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
  }>;
  authentication: {
    schemes: string[];
  };
}

export interface A2ATask {
  id: string;
  sessionId: string;
  message: {
    role: "user";
    parts: Array<{
      type: "text" | "application/json";
      text?: string;
      data?: Record<string, unknown>;
    }>;
  };
  acceptedOutputModes: string[];
}

export interface A2ATaskResult {
  taskId: string;
  status: "submitted" | "working" | "completed" | "failed" | "input-required";
  artifacts?: Array<{
    parts: Array<{
      type: string;
      text?: string;
      data?: Record<string, unknown>;
    }>;
  }>;
}

export interface A2ATaskUpdate {
  taskId: string;
  status: string;
  statusMessage?: string;
  artifact?: Record<string, unknown>;
}

/** Concrete A2A adapters for manufacturing systems. */
export interface ERPAgent {
  card: ExternalAgentCard;

  /** Get pending job orders. */
  getJobOrders(): Promise<ManufacturingJob[]>;

  /** Report job completion. */
  reportCompletion(job_id: string, result: ManufacturingPlan): Promise<void>;

  /** Check material stock availability. */
  checkStock(material: string, quantity: number): Promise<{
    available: boolean;
    lead_time_days?: number;
  }>;
}

export interface CAMSystemAgent {
  card: ExternalAgentCard;

  /** Request toolpath generation for an operation. */
  generateToolpath(request: CamToolpathRequest): Promise<CamToolpathResult>;

  /** Get G-code for a completed toolpath. */
  getGCode(toolpath_id: string, post_processor: string): Promise<string>;

  /** Verify toolpath against simulation results. */
  verifyToolpath(
    toolpath_id: string,
    simulation_result: Record<string, unknown>
  ): Promise<{ verified: boolean; issues: string[] }>;
}

export interface MachineMonitorAgent {
  card: ExternalAgentCard;

  /** Get real-time machine state. */
  getMachineState(machine_id: string): Promise<{
    spindle_load_pct: number;
    vibration_rms: number;
    temperature_c: number;
    coolant_flow_lpm: number;
    feed_override_pct: number;
  }>;

  /** Subscribe to machine alerts. */
  subscribeAlerts(
    machine_id: string,
    callback: (alert: MachineAlert) => void
  ): void;
}

// ============================================================================
// SECTION 7: EXECUTION ORCHESTRATION — WIRING IT ALL TOGETHER
// ============================================================================

/**
 * ## 7. How a Job Flows Through the Architecture
 *
 * ```
 * Job In ──→ L1 Planner ──→ Decompose ──→ [Setup Plans]
 *                                            │
 *                            ┌────────────────┼────────────────┐
 *                            ▼                ▼                ▼
 *                         L2 Setup-A      L2 Setup-B      L2 Setup-C
 *                         (parallel)      (parallel)      (sequential after A)
 *                            │                │                │
 *              ┌─────────────┼─────────────┐  │                │
 *              ▼             ▼             ▼  ▼                ▼
 *           L3 Phys      L3 Safety     L3 Qual  ...          ...
 *           (parallel within operation)
 *              │             │             │
 *              └──────┬──────┘             │
 *                     ▼                    │
 *              Conflict Resolver ◄─────────┘
 *                     │
 *                     ▼
 *              Consensus / Override
 *                     │
 *                     ▼
 *              Operation Result ──→ Next Operation (handoff)
 *                                          │
 *                                          ▼
 *                                  Setup Complete ──→ L1 Goal Monitor
 *                                                          │
 *                                                          ▼
 *                                                    Job Complete
 * ```
 *
 * Implementation uses existing PRISM infrastructure:
 *
 * - L1 decomposition: New ManufacturingPlannerEngine (extends planning pattern)
 * - L2 parallel:      executeAgentsParallel() from AgentExecutor
 * - L3 parallel:      swarm_parallel from SwarmExecutor
 * - Conflict:         swarm_consensus with custom weights
 * - Handoff:          output_key pattern via session state
 * - Goals:            New GoalMonitorEngine (Ch.11 pattern)
 * - Events:           EventBus with agent.* event types
 * - Hooks:            ORCH-* hooks from HookEngine for safety gates
 * - A2A:              New A2AAdapter engine for external integration
 * - Claim/Release:    TaskClaimService for multi-Claude coordination
 */

/** The main orchestrator that ties all levels together. */
export interface ManufacturingOrchestrator {
  /** Process a complete manufacturing job through the 3-level hierarchy. */
  processJob(job: ManufacturingJob): Promise<ManufacturingPlan>;

  /** Resume a partially-completed job. */
  resumeJob(plan_id: string): Promise<ManufacturingPlan>;

  /** Get current execution status. */
  getStatus(plan_id: string): Promise<OrchestratorStatus>;
}

export interface OrchestratorStatus {
  plan_id: string;
  phase: "planning" | "executing" | "validating" | "completed" | "failed";
  setups_total: number;
  setups_completed: number;
  operations_total: number;
  operations_completed: number;
  conflicts_resolved: number;
  conflicts_pending: number;
  safety_score: number;
  goal_completion_pct: number;
  elapsed_ms: number;
  estimated_remaining_ms: number;
}

// ============================================================================
// SECTION 8: GOAL MONITORING (Ch.11 Pattern)
// ============================================================================

/**
 * ## 8. SMART Goal Monitoring for Manufacturing
 *
 * Each operation and setup has measurable goals.
 * The Goal Monitor runs as a continuous background agent
 * that checks progress against criteria and triggers replanning
 * when goals are at risk.
 */

export interface ManufacturingGoal {
  goal_id: string;
  level: "job" | "setup" | "operation";
  target_id: string;

  /** SMART criteria */
  specific: string;
  measurable: {
    metric: string;
    target_value: number;
    current_value?: number;
    unit: string;
    direction: "minimize" | "maximize" | "target";
    tolerance?: number;
  };
  achievable: {
    confidence: number;
    blockers: string[];
  };
  relevant: string;
  time_bound: {
    deadline_ms?: number;
    elapsed_ms: number;
  };

  status: "not_started" | "in_progress" | "at_risk" | "achieved" | "failed";
}

export interface GoalStatus {
  goal_id: string;
  status: ManufacturingGoal["status"];
  progress_pct: number;
  current_value: number;
  target_value: number;
  risk_factors: string[];
  recommended_action?: string;
}

export interface GoalMonitor {
  /** Register goals for a plan. */
  registerGoals(goals: ManufacturingGoal[]): void;

  /** Update a goal's progress from an operation result. */
  updateProgress(goal_id: string, current_value: number): GoalStatus;

  /** Check all goals and return those at risk. */
  checkAll(): GoalStatus[];

  /** Trigger replanning if goals are failing. */
  triggerReplan(
    at_risk_goals: GoalStatus[],
    planner: ManufacturingPlanner,
    current_plan: ManufacturingPlan
  ): Promise<ManufacturingPlan>;
}

// ============================================================================
// SECTION 9: IMPLEMENTATION MAPPING TO EXISTING PRISM CODE
// ============================================================================

/**
 * ## 9. Implementation Roadmap — Maps to Existing Code
 *
 * | Blueprint Component      | Existing PRISM Code                    | New Work Needed        |
 * |--------------------------|----------------------------------------|------------------------|
 * | L1 Planner               | AutoPilot v3 (classify + plan)         | ManufacturingPlannerEngine |
 * | L2 Setup Agents          | agentConfig.ts subagents               | SetupAgentEngine       |
 * | L3 Physics Agent         | SF Expert (agentConfig.ts)             | Refactor as L3 agent   |
 * | L3 Safety Agent          | prism_safety dispatcher (29 actions)   | Wrap as agent          |
 * | L3 Quality Agent         | prism_validate dispatcher (7 actions)  | Wrap as agent          |
 * | L3 CAM Agent             | CAM Strategist (agentConfig.ts)        | Refactor as L3 agent   |
 * | Conflict Resolver        | swarm_consensus (SwarmExecutor)        | ConflictResolverEngine |
 * | Session State            | prism_session (20 actions)             | Add typed state keys   |
 * | Event Bus                | EventBus.ts (exists)                   | Add agent.* event types|
 * | Goal Monitor             | prism_omega (Omega scoring)            | GoalMonitorEngine      |
 * | A2A Integration          | sampling.ts (MCP sampling)             | A2AAdapterEngine       |
 * | Sequential Handoff       | executeAgentPipeline()                 | OperationHandoff type  |
 * | Parallel Fan-Out         | executeAgentsParallel()                | Wired to L2/L3        |
 * | Hooks/Safety Gates       | HookEngine (59+ hooks)                 | Add ORCH-CONFLICT-*   |
 * | Multi-Claude Coord       | TaskClaimService + roadmap_claim       | Works as-is            |
 * | Cost Control             | autonomousDispatcher (TOKEN_COSTS)     | Budget propagation     |
 * | Swarm Patterns           | SwarmExecutor (8 patterns)             | Works as-is            |
 *
 * ## Estimated Implementation Effort
 *
 * Phase 1 (Core): ManufacturingPlannerEngine + SetupAgentEngine + typed state
 *   ~3 sessions, ~15 files, ~3,000 lines
 *
 * Phase 2 (Conflicts): ConflictResolverEngine + safety-weighted consensus
 *   ~2 sessions, ~8 files, ~1,500 lines
 *
 * Phase 3 (Goals): GoalMonitorEngine + SMART criteria + replan triggers
 *   ~2 sessions, ~6 files, ~1,200 lines
 *
 * Phase 4 (A2A): A2AAdapterEngine + Agent Card + external agent discovery
 *   ~3 sessions, ~10 files, ~2,500 lines
 *
 * Total: ~10 sessions, ~39 files, ~8,200 lines
 */

// ============================================================================
// SUPPORTING TYPES (referenced above)
// ============================================================================

export interface ToleranceSpec {
  feature: string;
  dimension: number;
  tolerance_plus: number;
  tolerance_minus: number;
  surface_finish_ra?: number;
  geometric_tolerance?: string;
}

export interface MachineConstraints {
  machine_id?: string;
  max_rpm: number;
  max_power_kw: number;
  max_torque_nm: number;
  axes: number;
  work_envelope: { x: number; y: number; z: number };
}

export interface GlobalConstraints {
  max_cycle_time_s?: number;
  max_cost_usd?: number;
  required_surface_finish_ra?: number;
  material_restrictions?: string[];
  tool_restrictions?: string[];
}

export interface OperationSpec {
  type: OperationType;
  description: string;
  tool_diameter_mm: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
}

export interface ToolAssemblyRef {
  tool_id: string;
  tool_type: string;
  diameter_mm: number;
  flutes: number;
  material: string;
  coating?: string;
  stickout_mm: number;
  holder_type: string;
}

export interface CuttingParameters {
  rpm: number;
  feed_rate_mm_min: number;
  feed_per_tooth_mm: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  cutting_speed_m_min: number;
  mrr_cm3_min: number;
  cutting_force_n: number;
  power_kw: number;
  torque_nm: number;
  tool_life_min: number;
  predicted_ra: number;
  confidence: number;
}

export interface SafetyAnalysis {
  safe: boolean;
  safety_score: number;
  chatter_risk: "none" | "low" | "medium" | "high" | "critical";
  collision_risk: boolean;
  thermal_risk: "none" | "low" | "medium" | "high";
  deflection_mm: number;
  deflection_limit_mm: number;
  power_utilization_pct: number;
  torque_utilization_pct: number;
  violations: string[];
  recommendations: string[];
}

export interface QualityPrediction {
  predicted_ra: number;
  predicted_rz: number;
  cpk_estimate: number;
  dimensional_risk: "none" | "low" | "medium" | "high";
  meets_tolerance: boolean;
  confidence: number;
}

export interface CamStrategy {
  strategy_name: string;
  cam_system: string;
  toolpath_type: string;
  stepover_pct: number;
  entry_method: string;
  alternatives: Array<{
    name: string;
    trade_off: string;
    mrr_relative: number;
    finish_relative: number;
  }>;
}

export interface CamToolpathRequest {
  operation: OperationPlan;
  parameters: CuttingParameters;
  cam_system: string;
  post_processor: string;
}

export interface CamToolpathResult {
  toolpath_id: string;
  g_code_lines: number;
  cycle_time_s: number;
  status: "generated" | "failed";
}

export interface WorkpieceState {
  /** Material remaining (simplified bounding box or mesh ref). */
  stock_envelope: { x: number; y: number; z: number };
  material_removed_cm3: number;
  features_completed: string[];
  surface_conditions: Record<string, number>;
  datum_reference: string;
}

export interface MaterialProperties {
  name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hrc?: number;
  tensile_strength_mpa: number;
  kc1_1: number;
  mc: number;
  taylor_c: number;
  taylor_n: number;
}

export interface MachineCapabilities {
  machine_id: string;
  brand: string;
  model: string;
  type: "vertical_mill" | "horizontal_mill" | "lathe" | "5axis" | "mill_turn" | "wire_edm" | "grinder";
  max_rpm: number;
  max_power_kw: number;
  max_torque_nm: number;
  axes: number;
  work_envelope: { x: number; y: number; z: number };
  has_coolant_through: boolean;
  controller: string;
}

export interface MachineAlert {
  machine_id: string;
  timestamp: string;
  severity: "info" | "warning" | "critical" | "emergency";
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface OperationResult {
  operation_id: string;
  status: "completed" | "failed" | "skipped";
  parameters: CuttingParameters;
  safety: SafetyAnalysis;
  quality: QualityPrediction;
  cam_strategy?: CamStrategy;
  cycle_time_s: number;
  conflicts_resolved: number;
}

export interface OperationFailure {
  operation_id: string;
  reason: string;
  agent_type: "physics" | "safety" | "quality" | "cam" | "conflict";
  severity: "recoverable" | "blocking" | "fatal";
  suggested_fix?: string;
}

export type FailureResolution =
  | { action: "retry"; adjusted_params: Partial<CuttingParameters> }
  | { action: "skip"; reason: string }
  | { action: "escalate"; to: "planner" | "human"; context: string };

export interface OperationGoal {
  target_ra?: number;
  target_mrr_min?: number;
  max_force_n?: number;
  min_tool_life_min?: number;
  max_deflection_mm?: number;
  custom?: Record<string, number>;
}
