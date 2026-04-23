/**
 * WorkflowOrchestrationEngine — MXU-MS5
 *
 * Multi-agent/hook/script coordination for complex manufacturing workflows:
 *   1. Workflow definition — steps with dependencies and parallelism
 *   2. Spawn strategy — determine what to parallelize vs serialize
 *   3. Result aggregation — merge multi-agent outputs
 *   4. Conflict resolution — handle competing edits/claims
 *   5. Execution planning — optimize step ordering
 *
 * Sources:
 *   - MXU-MS5: Hook, Script, Agent + Worktree Orchestration
 */

// ============================================================================
// TYPES
// ============================================================================

export type StepType = "agent" | "hook" | "script" | "engine" | "manual";
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type ParallelStrategy = "serial" | "parallel" | "fan_out_fan_in";

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  action: string;
  depends_on: string[];
  timeout_ms: number;
  retry_count: number;
  can_skip: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  strategy: ParallelStrategy;
  max_parallel: number;
  total_timeout_ms: number;
}

export interface ExecutionPlan {
  workflow_id: string;
  phases: ExecutionPhase[];
  total_steps: number;
  estimated_duration_ms: number;
  parallelism_ratio: number;
}

export interface ExecutionPhase {
  phase_number: number;
  steps: string[];
  can_parallelize: boolean;
  depends_on_phases: number[];
}

export interface StepResult {
  step_id: string;
  status: StepStatus;
  duration_ms: number;
  output?: unknown;
  error?: string;
}

export interface WorkflowResult {
  workflow_id: string;
  status: "completed" | "partial" | "failed";
  steps: StepResult[];
  total_duration_ms: number;
  parallel_phases: number;
  serial_phases: number;
}

export interface ConflictDetection {
  has_conflict: boolean;
  conflicting_steps: Array<{ step_a: string; step_b: string; resource: string }>;
  resolution: string;
}

// ============================================================================
// BUILT-IN WORKFLOWS
// ============================================================================

const BUILT_IN_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "forge-engine",
    name: "Engine Forge",
    description: "Create a new engine: scaffold → implement → test → wire → review",
    strategy: "serial",
    max_parallel: 1,
    total_timeout_ms: 300_000,
    steps: [
      { id: "scaffold", name: "Generate scaffold", type: "engine", action: "copilot_template", depends_on: [], timeout_ms: 5000, retry_count: 0, can_skip: false },
      { id: "implement", name: "Write implementation", type: "agent", action: "coder", depends_on: ["scaffold"], timeout_ms: 120_000, retry_count: 0, can_skip: false },
      { id: "typecheck", name: "TypeScript check", type: "script", action: "tsc --noEmit", depends_on: ["implement"], timeout_ms: 60_000, retry_count: 1, can_skip: false },
      { id: "test", name: "Write & run tests", type: "agent", action: "tester", depends_on: ["typecheck"], timeout_ms: 60_000, retry_count: 1, can_skip: false },
      { id: "wire", name: "Wire to dispatcher", type: "agent", action: "dispatcher-wirer", depends_on: ["test"], timeout_ms: 30_000, retry_count: 0, can_skip: true },
      { id: "review", name: "Code review", type: "agent", action: "reviewer", depends_on: ["wire"], timeout_ms: 60_000, retry_count: 0, can_skip: true },
    ],
  },
  {
    id: "physics-validate",
    name: "Physics Validation",
    description: "Validate physics changes: benchmark → formula check → cross-pipeline",
    strategy: "fan_out_fan_in",
    max_parallel: 3,
    total_timeout_ms: 180_000,
    steps: [
      { id: "benchmark", name: "Physics benchmark", type: "script", action: "vitest run benchmark", depends_on: [], timeout_ms: 60_000, retry_count: 0, can_skip: false },
      { id: "formula", name: "Formula accuracy check", type: "engine", action: "formula_accuracy", depends_on: [], timeout_ms: 30_000, retry_count: 0, can_skip: false },
      { id: "cross-pipe", name: "Cross-pipeline consistency", type: "engine", action: "physics_verify", depends_on: [], timeout_ms: 30_000, retry_count: 0, can_skip: true },
      { id: "merge", name: "Merge results", type: "script", action: "aggregate", depends_on: ["benchmark", "formula", "cross-pipe"], timeout_ms: 5000, retry_count: 0, can_skip: false },
    ],
  },
  {
    id: "quote-pipeline",
    name: "Full Quote Pipeline",
    description: "End-to-end quote: DFM → cycle time → costing → document",
    strategy: "serial",
    max_parallel: 1,
    total_timeout_ms: 120_000,
    steps: [
      { id: "dfm", name: "DFM analysis", type: "engine", action: "dfm_check", depends_on: [], timeout_ms: 15_000, retry_count: 0, can_skip: true },
      { id: "cycle", name: "Cycle time estimate", type: "engine", action: "quote_autopilot_run", depends_on: ["dfm"], timeout_ms: 15_000, retry_count: 0, can_skip: false },
      { id: "cost", name: "Cost breakdown", type: "engine", action: "quote_autopilot_run", depends_on: ["cycle"], timeout_ms: 10_000, retry_count: 0, can_skip: false },
      { id: "doc", name: "Generate document", type: "engine", action: "export_quote", depends_on: ["cost"], timeout_ms: 10_000, retry_count: 0, can_skip: true },
    ],
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class WorkflowOrchestrationEngine {

  // ── Workflow Catalog ───────────────────────────────────────

  listWorkflows(): Array<{ id: string; name: string; steps: number; strategy: ParallelStrategy }> {
    return BUILT_IN_WORKFLOWS.map(w => ({ id: w.id, name: w.name, steps: w.steps.length, strategy: w.strategy }));
  }

  getWorkflow(id: string): WorkflowDefinition | undefined {
    return BUILT_IN_WORKFLOWS.find(w => w.id === id);
  }

  // ── Execution Planning ─────────────────────────────────────

  /**
   * Plan execution phases for a workflow, maximizing parallelism.
   */
  planExecution(workflow: WorkflowDefinition): ExecutionPlan {
    const phases: ExecutionPhase[] = [];
    const completed = new Set<string>();
    const allSteps = new Map(workflow.steps.map(s => [s.id, s]));
    let remaining = new Set(workflow.steps.map(s => s.id));

    let phaseNum = 0;
    while (remaining.size > 0) {
      // Find steps whose dependencies are all completed
      const ready: string[] = [];
      for (const id of remaining) {
        const step = allSteps.get(id)!;
        if (step.depends_on.every(d => completed.has(d))) {
          ready.push(id);
        }
      }

      if (ready.length === 0) {
        // Circular dependency or missing steps — add remaining as serial
        phases.push({ phase_number: phaseNum, steps: [...remaining], can_parallelize: false, depends_on_phases: [phaseNum - 1] });
        break;
      }

      const canParallel = ready.length > 1 && workflow.strategy !== "serial";
      const stepsInPhase = canParallel ? ready.slice(0, workflow.max_parallel) : [ready[0]];

      phases.push({
        phase_number: phaseNum,
        steps: stepsInPhase,
        can_parallelize: canParallel,
        depends_on_phases: phaseNum > 0 ? [phaseNum - 1] : [],
      });

      for (const id of stepsInPhase) {
        completed.add(id);
        remaining.delete(id);
      }
      phaseNum++;
    }

    const parallelPhases = phases.filter(p => p.can_parallelize).length;
    const estimatedDuration = workflow.steps.reduce((sum, s) => sum + s.timeout_ms, 0) / Math.max(1, workflow.max_parallel);

    return {
      workflow_id: workflow.id,
      phases,
      total_steps: workflow.steps.length,
      estimated_duration_ms: Math.round(estimatedDuration),
      parallelism_ratio: phases.length > 0 ? parseFloat((parallelPhases / phases.length).toFixed(2)) : 0,
    };
  }

  // ── Conflict Detection ─────────────────────────────────────

  /**
   * Detect potential conflicts between parallel steps.
   */
  detectConflicts(workflow: WorkflowDefinition): ConflictDetection {
    const plan = this.planExecution(workflow);
    const conflicts: Array<{ step_a: string; step_b: string; resource: string }> = [];

    for (const phase of plan.phases) {
      if (!phase.can_parallelize || phase.steps.length < 2) continue;

      // Check if parallel steps modify the same files/resources
      for (let i = 0; i < phase.steps.length; i++) {
        for (let j = i + 1; j < phase.steps.length; j++) {
          const a = workflow.steps.find(s => s.id === phase.steps[i])!;
          const b = workflow.steps.find(s => s.id === phase.steps[j])!;

          // Same action type = potential conflict
          if (a.action === b.action && a.type === "agent") {
            conflicts.push({ step_a: a.id, step_b: b.id, resource: `shared action: ${a.action}` });
          }
        }
      }
    }

    return {
      has_conflict: conflicts.length > 0,
      conflicting_steps: conflicts,
      resolution: conflicts.length > 0
        ? "Serialize conflicting steps or use worktree isolation"
        : "No conflicts detected — safe to parallelize",
    };
  }

  // ── Result Aggregation ─────────────────────────────────────

  /**
   * Aggregate results from multiple workflow steps.
   */
  aggregateResults(stepResults: StepResult[]): WorkflowResult {
    const failed = stepResults.filter(r => r.status === "failed");
    const completed = stepResults.filter(r => r.status === "completed");
    const totalDuration = stepResults.reduce((sum, r) => sum + r.duration_ms, 0);

    return {
      workflow_id: "aggregated",
      status: failed.length > 0 ? (completed.length > 0 ? "partial" : "failed") : "completed",
      steps: stepResults,
      total_duration_ms: totalDuration,
      parallel_phases: 0,
      serial_phases: stepResults.length,
    };
  }

  // ── Custom Workflow Creation ────────────────────────────────

  /**
   * Create a workflow definition from a list of steps.
   */
  createWorkflow(
    name: string,
    steps: Array<{ name: string; type: StepType; action: string; depends_on?: string[]; can_skip?: boolean }>,
    strategy: ParallelStrategy = "serial",
    maxParallel: number = 3,
  ): WorkflowDefinition {
    return {
      id: `custom_${Date.now()}`,
      name,
      description: `Custom workflow: ${name}`,
      steps: steps.map((s, i) => ({
        id: `step_${i}`,
        name: s.name,
        type: s.type,
        action: s.action,
        depends_on: s.depends_on || (i > 0 && strategy === "serial" ? [`step_${i - 1}`] : []),
        timeout_ms: 60_000,
        retry_count: 0,
        can_skip: s.can_skip ?? false,
      })),
      strategy,
      max_parallel: maxParallel,
      total_timeout_ms: steps.length * 60_000,
    };
  }
}

export const workflowOrchestrationEngine = new WorkflowOrchestrationEngine();
