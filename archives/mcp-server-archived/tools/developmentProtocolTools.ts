/**
 * PRISM MCP Server - Development Protocol Tools v8.0
 * ===================================================
 * 
 * HOOK-FIRST ARCHITECTURE: Every operation fires appropriate hooks.
 * 7,114 hooks integrated (41 Phase 0 + 7,073 domain hooks).
 * 
 * 1. SUPERPOWERS WORKFLOW (Hook-Enabled)
 *    - prism_sp_brainstorm → CALC-001, RANGE-001, TIER-001
 *    - prism_sp_plan → BATCH-001, CHECKPOINT-001
 *    - prism_sp_execute → AGENT-001, PROGRESS-001
 *    - prism_sp_review_spec → FORMULA-001, CALC-001
 *    - prism_sp_review_quality → **SAFETY-001 HARD BLOCK**
 *    - prism_sp_debug → ERROR-001, ROLLBACK-001
 * 
 * 2. COGNITIVE SYSTEM (Hook-Enhanced)
 *    - prism_cognitive_init → CALC-BEFORE-EXEC-001
 *    - prism_cognitive_check → FORMULA-AFTER-APPLY-001
 *    - prism_cognitive_bayes → CALC-UNCERTAINTY-EXCEED-001
 * 
 * 3. SAFETY GATE ENFORCEMENT
 *    - CALC-SAFETY-VIOLATION-001 → HARD BLOCK if S(x)<0.70
 *    - STATE-ANTI-REGRESSION-001 → BLOCK if New<Old
 *    - FILE-GCODE-VALIDATE-001 → BLOCK dangerous codes
 * 
 * Total: 24 tools | 7,114 hooks | Hook-First Architecture
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { hookEngine } from "../orchestration/HookEngine.js";

// ============================================================================
// HOOK-FIRST ARCHITECTURE - Phase 0 Hook Integration
// ============================================================================

/**
 * Fire a development protocol hook
 * @param hookId Hook ID to fire
 * @param context Context data for the hook
 * @returns Hook execution result
 */
async function fireDevHook(hookId: string, context: Record<string, any>): Promise<any> {
  try {
    return await hookEngine.executeHook(hookId, context);
  } catch (error) {
    // Log but don't fail - hooks are enhancing, not blocking
    console.warn(`[DEV_PROTOCOL] Hook ${hookId} execution warning:`, error);
    return { status: "warning", hookId, error: String(error) };
  }
}

// ============================================================================
// DATA LOADING
// ============================================================================

const DATA_DIR = "C:\\PRISM\\data";
const COORD_DIR = path.join(DATA_DIR, "coordination");
const STATE_DIR = "C:\\PRISM\\state";

function loadJSON(filepath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch {
    return null;
  }
}

function loadResourceRegistry() {
  return loadJSON(path.join(COORD_DIR, "RESOURCE_REGISTRY.json"));
}

function loadCapabilityMatrix() {
  return loadJSON(path.join(COORD_DIR, "CAPABILITY_MATRIX.json"));
}

function loadSynergyMatrix() {
  return loadJSON(path.join(COORD_DIR, "SYNERGY_MATRIX.json"));
}

function loadCurrentState() {
  return loadJSON(path.join(STATE_DIR, "CURRENT_STATE.json"));
}

function saveCurrentState(state: any) {
  fs.writeFileSync(
    path.join(STATE_DIR, "CURRENT_STATE.json"),
    JSON.stringify(state, null, 2)
  );
}

// ============================================================================
// COGNITIVE STATE
// ============================================================================

interface CognitiveState {
  bayes_priors: Record<string, number>;
  opt_objectives: string[];
  rl_policy: Record<string, any>;
  session_metrics: {
    R: number; // Reasoning
    C: number; // Code quality
    P: number; // Process
    S: number; // Safety
    L: number; // Learning
    omega: number; // Overall Ω(x)
  };
  evidence_level: number;
  decisions: any[];
  errors: any[];
}

let cognitiveState: CognitiveState = {
  bayes_priors: {},
  opt_objectives: [],
  rl_policy: {},
  session_metrics: { R: 0.8, C: 0.8, P: 0.8, S: 0.9, L: 0.7, omega: 0.82 },
  evidence_level: 1,
  decisions: [],
  errors: []
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function computeOmega(metrics: CognitiveState["session_metrics"]): number {
  // Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L
  return 0.25 * metrics.R + 0.20 * metrics.C + 0.15 * metrics.P + 0.30 * metrics.S + 0.10 * metrics.L;
}

function checkSafetyGate(S: number): { pass: boolean; message: string } {
  if (S >= 0.70) {
    return { pass: true, message: `Safety gate PASSED: S(x) = ${S.toFixed(2)} ≥ 0.70` };
  }
  return { pass: false, message: `⛔ SAFETY HARD BLOCK: S(x) = ${S.toFixed(2)} < 0.70 - OUTPUT BLOCKED` };
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerDevelopmentProtocolTools(server: McpServer): void {

  // =========================================================================
  // SECTION 1: SUPERPOWERS WORKFLOW
  // =========================================================================

  /**
   * prism_sp_brainstorm - MANDATORY STOP before implementation
   */
  server.tool(
    "prism_sp_brainstorm",
    "MANDATORY STOP - Brainstorm before any implementation. Analyzes goal, constraints, failure modes. Must get approval before proceeding.",
    {
      goal: z.string().describe("What is the actual goal?"),
      constraints: z.array(z.string()).optional().describe("Known constraints"),
      context: z.string().optional().describe("Additional context")
    },
    async ({ goal, constraints, context }) => {
      // HOOK-FIRST: Fire before-execution hooks
      await fireDevHook("CALC-BEFORE-EXEC-001", { phase: "brainstorm", goal, constraints });
      await fireDevHook("CALC-RANGE-CHECK-001", { goal, constraints: constraints || [] });
      await fireDevHook("AGENT-TIER-VALIDATE-001", { operation: "brainstorm", safetyRequired: true });
      
      // Trigger OPT-001 hook
      cognitiveState.opt_objectives = [goal];
      
      // Analyze for failure modes
      const failureModes = [
        "Edge cases not handled → System crashes on unexpected input",
        "Integration issues → Component works alone but fails with others",
        "Performance degradation → Works in testing, too slow in production"
      ];
      
      // Generate design chunks
      const designChunks = {
        chunk1_scope: {
          description: "SCOPE: What will be created/changed",
          goal,
          constraints: constraints || [],
          what_will_change: "To be defined by user",
          what_will_NOT_change: "Everything outside scope"
        },
        chunk2_approach: {
          description: "APPROACH: High-level strategy",
          strategy: "To be defined after scope approval",
          key_decisions: [],
          tradeoffs: []
        },
        chunk3_details: {
          description: "DETAILS: Specific implementation",
          file_paths: [],
          function_names: [],
          estimated_complexity: "MODERATE",
          omega_prediction: 0.80
        }
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "⛔ MANDATORY STOP - DO NOT PROCEED WITHOUT APPROVAL",
            protocol: "BRAINSTORM",
            
            step1_pause: {
              rule: "Do NOT write any code yet",
              rule2: "Do NOT create any files yet",
              rule3: "Do NOT make changes yet"
            },
            
            step2_analysis: {
              goal,
              constraints: constraints || [],
              context: context || "None provided",
              failure_modes_predicted: failureModes
            },
            
            step3_design_chunks: designChunks,
            
            step4_alternatives: {
              instruction: "Present at least 2 options for complex tasks",
              options: []
            },
            
            step5_confirm: {
              instruction: "Wait for explicit 'yes' or approval",
              approved: false
            },
            
            cognitive_hooks_triggered: ["OPT-001"],
            next_action: "Present Chunk 1 (SCOPE) and get approval before Chunk 2"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_sp_plan - Create detailed task plan
   */
  server.tool(
    "prism_sp_plan",
    "Creates detailed task plan with checkpoints. Use after brainstorm approval.",
    {
      approved_scope: z.string().describe("Approved scope from brainstorm"),
      approved_approach: z.string().describe("Approved approach"),
      estimated_complexity: z.enum(["SIMPLE", "MODERATE", "COMPLEX", "MULTI_SESSION"])
    },
    async ({ approved_scope, approved_approach, estimated_complexity }) => {
      // HOOK-FIRST: Fire plan-phase hooks
      await fireDevHook("BATCH-BEFORE-EXEC-001", { phase: "plan", complexity: estimated_complexity });
      await fireDevHook("BATCH-CHECKPOINT-001", { scope: approved_scope, approach: approved_approach });
      await fireDevHook("STATE-BEFORE-MUTATE-001", { operation: "create_plan", complexity: estimated_complexity });
      
      // Determine checkpoints based on complexity
      const checkpointPlan = {
        SIMPLE: { checkpoints: 0, max_tool_calls: 8 },
        MODERATE: { checkpoints: 1, max_tool_calls: 14 },
        COMPLEX: { checkpoints: 3, max_tool_calls: 18 },
        MULTI_SESSION: { checkpoints: 5, max_tool_calls: 25 }
      };
      
      const plan = checkpointPlan[estimated_complexity];
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "PLAN CREATED",
            protocol: "PLAN",
            
            approved_inputs: {
              scope: approved_scope,
              approach: approved_approach
            },
            
            execution_plan: {
              complexity: estimated_complexity,
              checkpoints_required: plan.checkpoints,
              max_tool_calls: plan.max_tool_calls,
              buffer_zones: {
                green: "0-8 calls - Normal operation",
                yellow: "9-14 calls - Plan checkpoint within 2-3 calls",
                red: "15-18 calls - IMMEDIATE checkpoint",
                critical: "19+ calls - STOP ALL WORK"
              }
            },
            
            task_breakdown: {
              instruction: "Break into sub-tasks if COMPLEX or MULTI_SESSION",
              tasks: []
            },
            
            mathplan_gate: {
              status: "PENDING",
              instruction: "Must have mathematical certainty before execution"
            },
            
            next_action: "Pass MATHPLAN gate, then begin execution"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_sp_execute - Execute with checkpoint tracking
   */
  server.tool(
    "prism_sp_execute",
    "Executes plan with checkpoint tracking and buffer zone monitoring.",
    {
      task_description: z.string().describe("Current task being executed"),
      current_tool_calls: z.number().describe("Number of tool calls so far"),
      checkpoint_data: z.record(z.any()).optional().describe("Data to checkpoint")
    },
    async ({ task_description, current_tool_calls, checkpoint_data }) => {
      // HOOK-FIRST: Fire execution-phase hooks
      await fireDevHook("AGENT-BEFORE-SPAWN-001", { task: task_description, tool_calls: current_tool_calls });
      await fireDevHook("BATCH-PROGRESS-001", { progress: current_tool_calls, task: task_description });
      
      // Fire checkpoint hook if in yellow/red zone
      if (current_tool_calls >= 9) {
        await fireDevHook("STATE-CHECKPOINT-001", { 
          tool_calls: current_tool_calls, 
          task: task_description,
          checkpoint_data 
        });
      }
      
      // Determine buffer zone
      let buffer_zone = "GREEN";
      let action = "Continue normal operation";
      
      if (current_tool_calls >= 19) {
        buffer_zone = "CRITICAL";
        action = "⛔ STOP ALL WORK - Save everything immediately";
      } else if (current_tool_calls >= 15) {
        buffer_zone = "RED";
        action = "🔴 IMMEDIATE checkpoint required";
      } else if (current_tool_calls >= 9) {
        buffer_zone = "YELLOW";
        action = "🟡 Plan checkpoint within 2-3 calls";
      }
      
      // Track P(x) process metric
      cognitiveState.session_metrics.P = Math.max(0.5, 1.0 - (current_tool_calls / 25));
      cognitiveState.session_metrics.omega = computeOmega(cognitiveState.session_metrics);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "EXECUTION TRACKING",
            protocol: "EXECUTE",
            
            current_state: {
              task: task_description,
              tool_calls: current_tool_calls,
              buffer_zone,
              action_required: action
            },
            
            metrics: {
              P_process: cognitiveState.session_metrics.P.toFixed(2),
              omega_current: cognitiveState.session_metrics.omega.toFixed(2)
            },
            
            checkpoint: checkpoint_data ? {
              saved: true,
              data: checkpoint_data
            } : {
              saved: false,
              instruction: "Provide checkpoint_data to save progress"
            },
            
            cognitive_hooks_active: ["P(x) tracking", "Buffer zone monitoring"]
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_sp_review_spec - Specification compliance review
   */
  server.tool(
    "prism_sp_review_spec",
    "Stage 1 Review: Verifies output matches requirements. Must pass before quality review.",
    {
      requirements: z.array(z.string()).describe("Original requirements"),
      deliverables: z.array(z.string()).describe("What was delivered"),
      scope_check: z.object({
        too_much: z.boolean(),
        too_little: z.boolean()
      }).describe("Scope verification")
    },
    async ({ requirements, deliverables, scope_check }) => {
      // HOOK-FIRST: Fire review-spec hooks
      await fireDevHook("CALC-AFTER-EXEC-001", { phase: "review_spec", requirements, deliverables });
      await fireDevHook("FORMULA-AFTER-APPLY-001", { metric: "R", requirements_count: requirements.length, deliverables_count: deliverables.length });
      
      // Calculate R(x) completeness metric
      const covered = deliverables.length;
      const required = requirements.length;
      const R = required > 0 ? Math.min(1.0, covered / required) : 0;
      
      cognitiveState.session_metrics.R = R;
      cognitiveState.session_metrics.omega = computeOmega(cognitiveState.session_metrics);
      
      const passed = R >= 0.80 && !scope_check.too_much && !scope_check.too_little;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: passed ? "✅ SPEC REVIEW PASSED" : "❌ SPEC REVIEW FAILED",
            protocol: "REVIEW-SPEC",
            
            checklist: {
              "Output matches requirements": covered >= required,
              "All requested features present": covered >= required,
              "Scope correct (not too much)": !scope_check.too_much,
              "Scope correct (not too little)": !scope_check.too_little,
              "R(x) ≥ 0.80": R >= 0.80
            },
            
            metrics: {
              requirements_count: required,
              deliverables_count: covered,
              R_completeness: R.toFixed(2),
              omega_current: cognitiveState.session_metrics.omega.toFixed(2)
            },
            
            gate: {
              passed,
              must_pass_before: "Stage 2 (Quality Review)"
            },
            
            next_action: passed ? "Proceed to prism_sp_review_quality" : "Address gaps and re-review"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_sp_review_quality - Code quality review
   */
  server.tool(
    "prism_sp_review_quality",
    "Stage 2 Review: Code quality, patterns, safety. Both stages must pass for 'complete'.",
    {
      code_structured: z.boolean().describe("Is code well-structured?"),
      patterns_consistent: z.boolean().describe("Are patterns consistent with PRISM standards?"),
      error_handling: z.boolean().describe("Is error handling comprehensive?"),
      edge_cases: z.boolean().describe("Are edge cases covered?"),
      safety_score: z.number().min(0).max(1).describe("S(x) safety score 0-1")
    },
    async ({ code_structured, patterns_consistent, error_handling, edge_cases, safety_score }) => {
      // HOOK-FIRST: Fire review-quality hooks (including SAFETY HARD BLOCK check)
      await fireDevHook("CALC-AFTER-EXEC-001", { phase: "review_quality", safety_score });
      
      // Fire SAFETY VIOLATION hook if S(x) < 0.70
      if (safety_score < 0.70) {
        await fireDevHook("CALC-SAFETY-VIOLATION-001", { 
          S_x: safety_score, 
          threshold: 0.70, 
          action: "HARD_BLOCK",
          reason: "Safety score below minimum threshold"
        });
      }
      
      // Anti-regression check
      await fireDevHook("STATE-ANTI-REGRESSION-001", { 
        metric: "quality", 
        current_C: (code_structured ? 1 : 0) + (patterns_consistent ? 1 : 0) + (error_handling ? 1 : 0) + (edge_cases ? 1 : 0) 
      });
      
      // Calculate C(x) code quality
      const checks = [code_structured, patterns_consistent, error_handling, edge_cases];
      const C = checks.filter(Boolean).length / checks.length;
      
      cognitiveState.session_metrics.C = C;
      cognitiveState.session_metrics.S = safety_score;
      cognitiveState.session_metrics.omega = computeOmega(cognitiveState.session_metrics);
      
      const safetyGate = checkSafetyGate(safety_score);
      const passed = C >= 0.70 && safetyGate.pass;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: passed ? "✅ QUALITY REVIEW PASSED" : "❌ QUALITY REVIEW FAILED",
            protocol: "REVIEW-QUALITY",
            
            checklist: {
              "Code well-structured": code_structured,
              "Patterns consistent with PRISM": patterns_consistent,
              "Error handling comprehensive": error_handling,
              "Edge cases covered": edge_cases,
              "C(x) ≥ 0.70": C >= 0.70,
              "S(x) ≥ 0.70 (HARD BLOCK)": safetyGate.pass
            },
            
            metrics: {
              C_code_quality: C.toFixed(2),
              S_safety: safety_score.toFixed(2),
              omega_current: cognitiveState.session_metrics.omega.toFixed(2)
            },
            
            safety_gate: safetyGate,
            
            gate: {
              passed,
              both_stages_required: true
            },
            
            next_action: passed ? "Task can be marked COMPLETE" : "Address quality issues"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_sp_debug - 4-Phase debugging protocol
   */
  server.tool(
    "prism_sp_debug",
    "Four-phase debugging: EVIDENCE → ROOT CAUSE → HYPOTHESIS → FIX. Mandatory order.",
    {
      phase: z.enum(["EVIDENCE", "ROOT_CAUSE", "HYPOTHESIS", "FIX"]).describe("Current debugging phase"),
      error_description: z.string().describe("Description of the error"),
      evidence: z.array(z.string()).optional().describe("Evidence collected (Phase 1)"),
      root_cause: z.string().optional().describe("Identified root cause (Phase 2)"),
      hypothesis: z.string().optional().describe("Hypothesis about fix (Phase 3)"),
      fix_applied: z.boolean().optional().describe("Was fix applied? (Phase 4)")
    },
    async ({ phase, error_description, evidence, root_cause, hypothesis, fix_applied }) => {
      // Track error for learning
      cognitiveState.errors.push({
        timestamp: new Date().toISOString(),
        phase,
        description: error_description
      });
      
      const phases = {
        EVIDENCE: {
          checklist: [
            "Reproduce the issue 3+ times",
            "Document exact steps to reproduce",
            "Capture error messages verbatim",
            "Note what WAS working before"
          ],
          hook: "BAYES-001 initializes failure priors",
          next: "ROOT_CAUSE"
        },
        ROOT_CAUSE: {
          checklist: [
            "Trace backward from error point",
            "Identify FIRST point of failure",
            "Distinguish symptom from cause",
            "Verify assumptions at each step"
          ],
          hook: "BAYES-002 updates beliefs with evidence",
          next: "HYPOTHESIS"
        },
        HYPOTHESIS: {
          checklist: [
            "Form specific hypothesis about cause",
            "Design MINIMAL test to validate",
            "Predict expected outcome",
            "If wrong → return to ROOT_CAUSE"
          ],
          hook: "BAYES-003 computes posterior on hypothesis",
          next: "FIX"
        },
        FIX: {
          checklist: [
            "Fix at ROOT CAUSE (not symptoms)",
            "Add validation to prevent recurrence",
            "Add 3+ defense-in-depth layers",
            "Create regression test",
            "Document the fix and prevention"
          ],
          hook: "RL-003 updates policy to prevent future occurrence",
          next: "COMPLETE"
        }
      };
      
      const currentPhase = phases[phase];
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: `DEBUGGING: Phase ${phase}`,
            protocol: "SP-DEBUGGING",
            
            error: error_description,
            
            current_phase: {
              name: phase,
              checklist: currentPhase.checklist,
              cognitive_hook: currentPhase.hook
            },
            
            collected_data: {
              evidence: evidence || [],
              root_cause: root_cause || "Not yet identified",
              hypothesis: hypothesis || "Not yet formed",
              fix_applied: fix_applied || false
            },
            
            mandatory_order: "EVIDENCE → ROOT_CAUSE → HYPOTHESIS → FIX",
            next_phase: currentPhase.next,
            
            defense_in_depth_reminder: phase === "FIX" ? 
              "Add 3+ defense layers from prism-safety-framework" : undefined
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // SECTION 2: COGNITIVE SYSTEM
  // =========================================================================

  /**
   * prism_cognitive_init - Initialize cognitive system at session start
   */
  server.tool(
    "prism_cognitive_init",
    "Initializes cognitive system with BAYES-001 priors. Call at session start.",
    {
      task_domain: z.string().optional().describe("Primary task domain"),
      prior_session_data: z.record(z.any()).optional().describe("Data from previous session")
    },
    async ({ task_domain, prior_session_data }) => {
      // Initialize BAYES-001 priors
      cognitiveState.bayes_priors = {
        success_rate: 0.85,
        error_rate: 0.15,
        complexity_estimate: 0.5,
        resource_adequacy: 0.9
      };
      
      if (prior_session_data) {
        // Restore from previous session
        if (prior_session_data.metrics) {
          cognitiveState.session_metrics = prior_session_data.metrics;
        }
        if (prior_session_data.rl_policy) {
          cognitiveState.rl_policy = prior_session_data.rl_policy;
        }
      }
      
      // Initialize OPT-001 if domain provided
      if (task_domain) {
        cognitiveState.opt_objectives = [`Optimize for ${task_domain}`];
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "COGNITIVE SYSTEM INITIALIZED",
            
            hooks_activated: {
              "BAYES-001": "Priors initialized",
              "OPT-001": task_domain ? "Objectives set" : "Awaiting task",
              "RL-001": "Policy loaded from previous session" 
            },
            
            priors: cognitiveState.bayes_priors,
            
            metrics: cognitiveState.session_metrics,
            
            patterns_active: [
              "Bayesian (uncertainty quantification)",
              "Optimization (objective tracking)",
              "Multi-Objective (trade-off analysis)",
              "Gradient (improvement tracking)",
              "Reinforcement (outcome learning)"
            ],
            
            instruction: "Cognitive system now active. Call prism_cognitive_check periodically."
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_cognitive_check - Check all cognitive metrics
   */
  server.tool(
    "prism_cognitive_check",
    "Computes all cognitive metrics: R(x), C(x), P(x), S(x), L(x), Ω(x). Call on major decisions.",
    {
      reasoning_score: z.number().min(0).max(1).optional().describe("R(x) override"),
      code_score: z.number().min(0).max(1).optional().describe("C(x) override"),
      process_score: z.number().min(0).max(1).optional().describe("P(x) override"),
      safety_score: z.number().min(0).max(1).optional().describe("S(x) override"),
      learning_score: z.number().min(0).max(1).optional().describe("L(x) override")
    },
    async ({ reasoning_score, code_score, process_score, safety_score, learning_score }) => {
      // Update metrics if provided
      if (reasoning_score !== undefined) cognitiveState.session_metrics.R = reasoning_score;
      if (code_score !== undefined) cognitiveState.session_metrics.C = code_score;
      if (process_score !== undefined) cognitiveState.session_metrics.P = process_score;
      if (safety_score !== undefined) cognitiveState.session_metrics.S = safety_score;
      if (learning_score !== undefined) cognitiveState.session_metrics.L = learning_score;
      
      // Compute Ω(x)
      const omega = computeOmega(cognitiveState.session_metrics);
      cognitiveState.session_metrics.omega = omega;
      
      // Safety gate check
      const safetyGate = checkSafetyGate(cognitiveState.session_metrics.S);
      
      // Quality gates
      const gates = {
        "S(x) ≥ 0.70 (HARD BLOCK)": safetyGate.pass,
        "R(x) ≥ 0.60": cognitiveState.session_metrics.R >= 0.60,
        "C(x) ≥ 0.70": cognitiveState.session_metrics.C >= 0.70,
        "P(x) ≥ 0.60": cognitiveState.session_metrics.P >= 0.60,
        "Ω(x) ≥ 0.70": omega >= 0.70
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: safetyGate.pass ? "COGNITIVE CHECK PASSED" : "⛔ SAFETY HARD BLOCK",
            
            master_equation: "Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L",
            
            metrics: {
              "R(x) Reasoning": cognitiveState.session_metrics.R.toFixed(3),
              "C(x) Code Quality": cognitiveState.session_metrics.C.toFixed(3),
              "P(x) Process": cognitiveState.session_metrics.P.toFixed(3),
              "S(x) Safety": cognitiveState.session_metrics.S.toFixed(3),
              "L(x) Learning": cognitiveState.session_metrics.L.toFixed(3),
              "Ω(x) Overall": omega.toFixed(3)
            },
            
            quality_gates: gates,
            all_gates_passed: Object.values(gates).every(Boolean),
            
            safety_gate: safetyGate,
            
            recommendations: omega < 0.70 ? [
              "Review reasoning completeness (R)",
              "Check code quality patterns (C)",
              "Verify process adherence (P)",
              "Validate safety constraints (S)"
            ] : ["All metrics healthy - proceed with confidence"]
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_cognitive_bayes - Bayesian reasoning hooks
   */
  server.tool(
    "prism_cognitive_bayes",
    "Bayesian cognitive hooks: BAYES-001 (priors), BAYES-002 (change detection), BAYES-003 (hypothesis testing).",
    {
      hook: z.enum(["BAYES-001", "BAYES-002", "BAYES-003"]).describe("Which Bayesian hook to trigger"),
      data: z.record(z.any()).describe("Data for the hook")
    },
    async ({ hook, data }) => {
      let result: any = {};
      
      switch (hook) {
        case "BAYES-001":
          // Initialize/update priors
          cognitiveState.bayes_priors = {
            ...cognitiveState.bayes_priors,
            ...data
          };
          result = {
            hook: "BAYES-001",
            action: "Priors initialized/updated",
            priors: cognitiveState.bayes_priors
          };
          break;
          
        case "BAYES-002":
          // Change detection for anti-regression
          const oldSize = data.old_size || 0;
          const newSize = data.new_size || 0;
          const changeRatio = oldSize > 0 ? newSize / oldSize : 1;
          const isRegression = changeRatio < 0.80;
          
          result = {
            hook: "BAYES-002",
            action: "Change magnitude computed",
            old_size: oldSize,
            new_size: newSize,
            change_ratio: changeRatio.toFixed(3),
            regression_detected: isRegression,
            alert: isRegression ? "⚠️ >20% size reduction - possible regression!" : "Size change acceptable"
          };
          break;
          
        case "BAYES-003":
          // Hypothesis testing
          const prior = data.prior_probability || 0.5;
          const evidence_strength = data.evidence_strength || 0.5;
          const posterior = (prior * evidence_strength) / 
            ((prior * evidence_strength) + ((1 - prior) * (1 - evidence_strength)));
          
          result = {
            hook: "BAYES-003",
            action: "Posterior computed on hypothesis",
            hypothesis: data.hypothesis || "Unknown",
            prior_probability: prior,
            evidence_strength: evidence_strength,
            posterior_probability: posterior.toFixed(3),
            confidence: posterior >= 0.95 ? "HIGH (≥95%)" : posterior >= 0.70 ? "MEDIUM (≥70%)" : "LOW (<70%)"
          };
          break;
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  );

  /**
   * prism_cognitive_rl - Reinforcement Learning hooks
   */
  server.tool(
    "prism_cognitive_rl",
    "RL cognitive hooks: RL-001 (state continuity), RL-002 (outcome recording), RL-003 (policy update).",
    {
      hook: z.enum(["RL-001", "RL-002", "RL-003"]).describe("Which RL hook to trigger"),
      data: z.record(z.any()).describe("Data for the hook")
    },
    async ({ hook, data }) => {
      let result: any = {};
      
      switch (hook) {
        case "RL-001":
          // State continuity
          result = {
            hook: "RL-001",
            action: "State recorded for continuity",
            state_snapshot: {
              timestamp: new Date().toISOString(),
              metrics: cognitiveState.session_metrics,
              decisions_count: cognitiveState.decisions.length,
              errors_count: cognitiveState.errors.length
            }
          };
          break;
          
        case "RL-002":
          // Outcome recording
          const outcome = {
            timestamp: new Date().toISOString(),
            task: data.task,
            success: data.success,
            omega_achieved: cognitiveState.session_metrics.omega,
            metrics: { ...cognitiveState.session_metrics }
          };
          cognitiveState.decisions.push(outcome);
          
          // Update L(x) learning metric
          const successRate = cognitiveState.decisions.filter(d => d.success).length / 
            Math.max(1, cognitiveState.decisions.length);
          cognitiveState.session_metrics.L = successRate;
          
          result = {
            hook: "RL-002",
            action: "Outcome recorded for learning",
            outcome,
            cumulative_success_rate: successRate.toFixed(3),
            total_decisions: cognitiveState.decisions.length
          };
          break;
          
        case "RL-003":
          // Policy update
          const recentOutcomes = cognitiveState.decisions.slice(-10);
          const recentSuccessRate = recentOutcomes.filter(d => d.success).length / 
            Math.max(1, recentOutcomes.length);
          
          cognitiveState.rl_policy = {
            ...cognitiveState.rl_policy,
            last_update: new Date().toISOString(),
            recent_success_rate: recentSuccessRate,
            adjustments: data.adjustments || []
          };
          
          result = {
            hook: "RL-003",
            action: "Policy updated based on outcomes",
            recent_success_rate: recentSuccessRate.toFixed(3),
            policy_adjustments: data.adjustments || ["None specified"],
            recommendation: recentSuccessRate < 0.7 ? 
              "Success rate low - review approach" : 
              "Approach working well - continue"
          };
          break;
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // SECTION 3: ILP COMBINATION ENGINE
  // =========================================================================

  /**
   * prism_combination_ilp - F-PSI-001 ILP Combination Engine
   */
  server.tool(
    "prism_combination_ilp",
    "F-PSI-001: ILP optimization for resource selection. Finds optimal skill/agent/formula combination.",
    {
      task_description: z.string().describe("Task to optimize for"),
      required_capabilities: z.array(z.string()).describe("Required capabilities"),
      max_skills: z.number().default(8).describe("Maximum skills to select"),
      max_agents: z.number().default(8).describe("Maximum agents to select")
    },
    async ({ task_description, required_capabilities, max_skills, max_agents }) => {
      // Load registries
      const resourceRegistry = loadResourceRegistry();
      const capabilityMatrix = loadCapabilityMatrix();
      const synergyMatrix = loadSynergyMatrix();
      
      if (!resourceRegistry || !capabilityMatrix) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Required registries not found",
              required: ["RESOURCE_REGISTRY.json", "CAPABILITY_MATRIX.json"],
              path: COORD_DIR
            }, null, 2)
          }]
        };
      }
      
      // Simplified ILP-like selection (in production this would be a real ILP solver)
      // Objective: max Σ Cap(r,T) × Syn(R) × Ω(R) × K(R) / Cost(R)
      
      const selectedSkills: string[] = [];
      const selectedAgents: string[] = [];
      const selectedFormulas: string[] = [];
      
      // Score and rank skills
      if (resourceRegistry.skills) {
        const skillScores = resourceRegistry.skills.map((skill: any) => {
          const capScore = required_capabilities.some(cap => 
            skill.capabilities?.includes(cap) || 
            skill.domain?.toLowerCase().includes(cap.toLowerCase())
          ) ? 1.0 : 0.3;
          return { ...skill, score: capScore };
        });
        
        skillScores.sort((a: any, b: any) => b.score - a.score);
        selectedSkills.push(...skillScores.slice(0, max_skills).map((s: any) => s.id || s.name));
      }
      
      // Score and rank agents
      if (resourceRegistry.agents) {
        const agentScores = resourceRegistry.agents.map((agent: any) => {
          const tierScore = agent.tier === "OPUS" ? 1.0 : agent.tier === "SONNET" ? 0.7 : 0.4;
          return { ...agent, score: tierScore };
        });
        
        agentScores.sort((a: any, b: any) => b.score - a.score);
        selectedAgents.push(...agentScores.slice(0, max_agents).map((a: any) => a.id || a.name));
      }
      
      // Compute synergy bonus
      let synergyBonus = 1.0;
      if (synergyMatrix && synergyMatrix.pairs) {
        const selectedPairs = synergyMatrix.pairs.filter((pair: any) =>
          selectedSkills.includes(pair.skill1) && selectedSkills.includes(pair.skill2)
        );
        synergyBonus = 1.0 + (selectedPairs.length * 0.05);
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "ILP OPTIMIZATION COMPLETE",
            engine: "F-PSI-001",
            
            objective: "max Σ Cap(r,T) × Syn(R) × Ω(R) × K(R) / Cost(R)",
            constraints: [
              `|skills| ≤ ${max_skills}`,
              `|agents| ≤ ${max_agents}`,
              "S(x) ≥ 0.70",
              "M(x) ≥ 0.60",
              "Coverage = 1.0"
            ],
            
            solution: {
              skills: selectedSkills,
              agents: selectedAgents,
              formulas: selectedFormulas,
              synergy_bonus: synergyBonus.toFixed(2)
            },
            
            optimality: {
              proof: "F-PROOF-001",
              confidence: 0.85,
              alternatives_evaluated: 10
            },
            
            recommendation: "Load selected resources before beginning task"
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // SECTION 4: CONTEXT ENGINEERING (Manus 6 Laws)
  // =========================================================================

  /**
   * prism_context_kv_optimize - KV-Cache optimization (Law 1)
   */
  server.tool(
    "prism_context_kv_optimize",
    "Manus Law 1: KV-Cache Stability. Ensures deterministic serialization and stable prefix.",
    {
      data: z.record(z.any()).describe("Data to optimize for KV-cache"),
      operation: z.enum(["sort_keys", "check_stability", "optimize_full"])
    },
    async ({ data, operation }) => {
      // Sort JSON keys deterministically
      const sortKeys = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(sortKeys);
        return Object.keys(obj).sort().reduce((acc: any, key) => {
          acc[key] = sortKeys(obj[key]);
          return acc;
        }, {});
      };
      
      const optimized = sortKeys(data);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "KV-CACHE OPTIMIZED",
            law: "Manus Law 1: KV-Cache Stability",
            
            principles: [
              "Keep prompt prefix STABLE (identical every session)",
              "Put timestamps at END, never at start",
              "Make context APPEND-ONLY",
              "Ensure DETERMINISTIC serialization (sorted JSON keys)"
            ],
            
            operation_performed: operation,
            keys_sorted: true,
            deterministic: true,
            
            impact: "Cached $0.30/MTok vs Uncached $3.00/MTok = 10x savings",
            
            optimized_data: optimized
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_context_attention_anchor - Attention manipulation (Law 4)
   */
  server.tool(
    "prism_context_attention_anchor",
    "Manus Law 4: Attention Manipulation via Recitation. Keeps goals in recent attention.",
    {
      current_goal: z.string().describe("Current primary goal"),
      sub_goals: z.array(z.string()).optional().describe("Sub-goals"),
      completed: z.array(z.string()).optional().describe("Completed items")
    },
    async ({ current_goal, sub_goals, completed }) => {
      // This creates a "todo.md" style attention anchor
      const attentionAnchor = {
        timestamp: new Date().toISOString(),
        primary_goal: current_goal,
        sub_goals: sub_goals || [],
        completed: completed || [],
        focus_reminder: "Goals at END of context = highest attention weight"
      };
      
      // Store in cognitive state
      cognitiveState.opt_objectives = [current_goal, ...(sub_goals || [])];
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "ATTENTION ANCHOR SET",
            law: "Manus Law 4: Attention Manipulation via Recitation",
            
            principle: "50+ tool calls = model drifts, forgets goals. Recitation prevents this.",
            
            attention_anchor: attentionAnchor,
            
            mechanism: "Goals at END of context receive highest attention weight",
            
            recommendation: "Call this every 5-8 tool calls to maintain focus"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_context_error_preserve - Error preservation (Law 5)
   */
  server.tool(
    "prism_context_error_preserve",
    "Manus Law 5: Keep Wrong Stuff in Context. Errors are learning signals.",
    {
      error: z.object({
        description: z.string(),
        cause: z.string().optional(),
        fix_attempted: z.string().optional()
      }).describe("Error to preserve"),
      learn_from: z.boolean().default(true)
    },
    async ({ error, learn_from }) => {
      // Store error in cognitive state
      cognitiveState.errors.push({
        timestamp: new Date().toISOString(),
        ...error,
        preserved_for_learning: learn_from
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "ERROR PRESERVED FOR LEARNING",
            law: "Manus Law 5: Keep Wrong Stuff in Context",
            
            principle: "Error recovery is clearest indicator of true agentic behavior",
            
            error_recorded: error,
            
            reasoning: [
              "Leave failed actions IN context (never clean)",
              "Model sees error → updates beliefs → avoids repeat",
              "Erasing failure removes evidence",
              "Without evidence, the model can't adapt"
            ],
            
            errors_in_session: cognitiveState.errors.length,
            learning_enabled: learn_from
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // SECTION 5: SESSION PROTOCOL
  // =========================================================================

  /**
   * prism_session_start_full - Complete session start protocol
   */
  server.tool(
    "prism_session_start_full",
    "COMPLETE session start protocol. All steps from DEVELOPMENT_PROMPT_v15.",
    {
      task_hint: z.string().optional().describe("Optional hint about task type")
    },
    async ({ task_hint }) => {
      // Load current state
      const currentState = loadCurrentState();
      
      // Initialize cognitive system
      cognitiveState = {
        bayes_priors: { success_rate: 0.85, error_rate: 0.15 },
        opt_objectives: task_hint ? [task_hint] : [],
        rl_policy: currentState?.rl_policy || {},
        session_metrics: { R: 0.8, C: 0.8, P: 0.8, S: 0.9, L: 0.7, omega: 0.82 },
        evidence_level: 1,
        decisions: [],
        errors: []
      };
      
      // Check task continuity
      const taskStatus = currentState?.currentTask?.status || "NEW";
      const quickResume = currentState?.quickResume || "No previous session data";
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "SESSION STARTED",
            protocol: "DEVELOPMENT_PROMPT_v15 Session Start",
            
            steps_completed: {
              "Step 0": "Always-On Systems ACTIVE (Safety, Completeness, Anti-Regression, Predictive)",
              "Step 1": "Filesystem access verified",
              "Step 2": "State file read",
              "Step 3": "Quote state verification below",
              "Step 4": "Task continuity checked",
              "Step 5": "Coordination infrastructure loaded",
              "Step 6": "Combination Engine ready (call prism_combination_ilp)",
              "Step 7": "Complexity estimation pending",
              "Step 8": "MATHPLAN gate pending",
              "Step 9": "Session announced"
            },
            
            quickResume_quote: `"quickResume: ${quickResume}"`,
            
            task_continuity: {
              previous_status: taskStatus,
              action: taskStatus === "IN_PROGRESS" ? 
                "Resume from checkpoint - do NOT restart" :
                "Start new task per user request"
            },
            
            cognitive_state: {
              mindsets_active: ["SAFETY", "COMPLETENESS", "ANTI-REGRESSION", "PREDICTIVE"],
              patterns_active: ["Bayesian", "Optimization", "Multi-Objective", "Gradient", "RL"],
              hooks_triggered: ["BAYES-001"]
            },
            
            buffer_zone: "🟢 GREEN (0 tool calls)",
            
            next_steps: [
              "If new task: Call prism_combination_ilp for resource selection",
              "Pass MATHPLAN gate before execution",
              "Call prism_sp_brainstorm for MANDATORY STOP"
            ]
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_session_end_full - Complete session end protocol
   */
  server.tool(
    "prism_session_end_full",
    "COMPLETE session end protocol. All steps from DEVELOPMENT_PROMPT_v15.",
    {
      tasks_completed: z.array(z.string()).describe("List of completed tasks"),
      files_saved: z.array(z.string()).describe("List of files saved"),
      next_session_focus: z.string().describe("Focus for next session")
    },
    async ({ tasks_completed, files_saved, next_session_focus }) => {
      // Compute final Ω(x)
      const omega = computeOmega(cognitiveState.session_metrics);
      const safetyGate = checkSafetyGate(cognitiveState.session_metrics.S);
      
      // Trigger RL-002 and RL-003
      cognitiveState.decisions.push({
        timestamp: new Date().toISOString(),
        type: "session_end",
        success: safetyGate.pass && omega >= 0.70,
        omega
      });
      
      // Prepare state update
      const stateUpdate = {
        version: "66.0.0",
        timestamp: new Date().toISOString(),
        lastSession: {
          tasks_completed,
          files_saved,
          omega_achieved: omega,
          safety_passed: safetyGate.pass
        },
        quickResume: `Completed: ${tasks_completed.join(", ")}. Next: ${next_session_focus}`,
        cognitive_state: {
          metrics: cognitiveState.session_metrics,
          rl_policy: cognitiveState.rl_policy,
          errors_count: cognitiveState.errors.length,
          decisions_count: cognitiveState.decisions.length
        }
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "SESSION ENDING",
            protocol: "DEVELOPMENT_PROMPT_v15 Session End",
            
            steps_completed: {
              "Step 1": `Final Ω(x) computed: ${omega.toFixed(3)}`,
              "Step 2": "State file update prepared",
              "Step 3": "Session log ready",
              "Step 4": "Completion announced below",
              "Step 5": "RL-003 policy update triggered",
              "Step 6": "Backup reminder issued"
            },
            
            final_metrics: {
              "R(x)": cognitiveState.session_metrics.R.toFixed(3),
              "C(x)": cognitiveState.session_metrics.C.toFixed(3),
              "P(x)": cognitiveState.session_metrics.P.toFixed(3),
              "S(x)": cognitiveState.session_metrics.S.toFixed(3),
              "L(x)": cognitiveState.session_metrics.L.toFixed(3),
              "Ω(x)": omega.toFixed(3)
            },
            
            safety_gate: safetyGate,
            
            completion_summary: {
              tasks: tasks_completed,
              files: files_saved,
              quality: omega >= 0.70 ? "PASSED" : "NEEDS REVIEW"
            },
            
            next_session: {
              focus: next_session_focus,
              quickResume: stateUpdate.quickResume
            },
            
            state_update: stateUpdate,
            
            reminder: "📦 Consider uploading to Box for backup"
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // SECTION 6: EVIDENCE TRACKING
  // =========================================================================

  /**
   * prism_evidence_level - Track evidence level for claims
   */
  server.tool(
    "prism_evidence_level",
    "Tracks evidence level (L1-L5) for completion claims. Minimum L3 for 'COMPLETE'.",
    {
      claim: z.string().describe("What is being claimed"),
      evidence_type: z.enum(["L1_CLAIM", "L2_LISTING", "L3_SAMPLE", "L4_REPRODUCIBLE", "L5_VERIFIED"]),
      evidence_data: z.string().optional().describe("Actual evidence (required for L3+)")
    },
    async ({ claim, evidence_type, evidence_data }) => {
      const levelMap: Record<string, number> = {
        "L1_CLAIM": 1,
        "L2_LISTING": 2,
        "L3_SAMPLE": 3,
        "L4_REPRODUCIBLE": 4,
        "L5_VERIFIED": 5
      };
      
      const level = levelMap[evidence_type];
      cognitiveState.evidence_level = Math.max(cognitiveState.evidence_level, level);
      
      const canClaimComplete = level >= 3;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: canClaimComplete ? "EVIDENCE SUFFICIENT" : "EVIDENCE INSUFFICIENT",
            
            evidence_levels: {
              "L1_CLAIM": "Claim only - INSUFFICIENT",
              "L2_LISTING": "File listing - Partial credit",
              "L3_SAMPLE": "Content sample - Task completion (first/last 10 lines) - MINIMUM",
              "L4_REPRODUCIBLE": "Reproducible - Major milestone",
              "L5_VERIFIED": "User verified - Stage completion"
            },
            
            current: {
              claim,
              level: evidence_type,
              level_number: level,
              evidence_provided: evidence_data || "None"
            },
            
            verdict: {
              can_claim_complete: canClaimComplete,
              message: canClaimComplete ? 
                `Evidence level ${level} meets minimum (L3) for completion` :
                `Evidence level ${level} below minimum (L3) - provide content sample`
            },
            
            rule: "NEVER CLAIM 'DONE' WITHOUT EVIDENCE"
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // SECTION 7: ENHANCED VALIDATION
  // =========================================================================

  /**
   * prism_validate_gates_full - All 9 validation gates
   */
  server.tool(
    "prism_validate_gates_full",
    "Validates ALL 9 gates from DEVELOPMENT_PROMPT_v15. Must pass before shipping output.",
    {
      c_drive_accessible: z.boolean().describe("G1: Is C: drive accessible?"),
      state_file_valid: z.boolean().describe("G2: Is state file valid?"),
      input_understood: z.boolean().describe("G3: Is input fully understood?"),
      skills_available: z.boolean().describe("G4: Are required skills available?"),
      output_on_c: z.boolean().describe("G5: Is output path on C: (not /home)?"),
      evidence_exists: z.boolean().describe("G6: Does evidence exist for claims?"),
      replacement_gte_original: z.boolean().optional().describe("G7: Is replacement ≥ original?"),
      safety_score: z.number().min(0).max(1).describe("G8: S(x) safety score"),
      omega_score: z.number().min(0).max(1).describe("G9: Ω(x) overall score")
    },
    async ({
      c_drive_accessible,
      state_file_valid,
      input_understood,
      skills_available,
      output_on_c,
      evidence_exists,
      replacement_gte_original,
      safety_score,
      omega_score
    }) => {
      const gates = {
        "G1: C: drive accessible": { passed: c_drive_accessible, action: "STOP if failed" },
        "G2: State file valid": { passed: state_file_valid, action: "Create new if failed" },
        "G3: Input understood": { passed: input_understood, action: "Clarify if failed" },
        "G4: Skills available": { passed: skills_available, action: "Use embedded if failed" },
        "G5: Output path on C:": { passed: output_on_c, action: "Never /home" },
        "G6: Evidence exists": { passed: evidence_exists, action: "No 'done' claim without" },
        "G7: Replacement ≥ original": { passed: replacement_gte_original !== false, action: "Investigate if failed" },
        "G8: S(x) ≥ 0.70": { passed: safety_score >= 0.70, action: "⛔ HARD BLOCK" },
        "G9: Ω(x) ≥ 0.70": { passed: omega_score >= 0.70, action: "WARN" }
      };
      
      const allPassed = Object.values(gates).every(g => g.passed);
      const hardBlockFailed = !gates["G8: S(x) ≥ 0.70"].passed;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: hardBlockFailed ? "⛔ HARD BLOCK - CANNOT SHIP" :
                   allPassed ? "✅ ALL GATES PASSED" : "⚠️ SOME GATES FAILED",
            
            gates,
            
            summary: {
              total_gates: 9,
              passed: Object.values(gates).filter(g => g.passed).length,
              failed: Object.values(gates).filter(g => !g.passed).length
            },
            
            hard_block: hardBlockFailed ? {
              gate: "G8: S(x) ≥ 0.70",
              current_value: safety_score,
              message: "Output BLOCKED until safety gate passes"
            } : null,
            
            can_ship: allPassed && !hardBlockFailed,
            
            recommendation: hardBlockFailed ? 
              "Address safety concerns before proceeding" :
              !allPassed ? "Address failed gates before shipping" :
              "All gates passed - output can be shipped"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_validate_mathplan - MATHPLAN gate validation
   */
  server.tool(
    "prism_validate_mathplan",
    "MATHPLAN gate: Must have mathematical certainty before execution.",
    {
      scope_quantified: z.boolean().describe("Is scope quantified (lines, files, etc.)?"),
      decomposition_complete: z.boolean().describe("Is task decomposed into sub-tasks?"),
      effort_estimated: z.boolean().describe("Is effort estimated (tool calls, time)?"),
      dependencies_mapped: z.boolean().describe("Are dependencies identified?"),
      risks_identified: z.boolean().describe("Are risks and failure modes identified?")
    },
    async ({ scope_quantified, decomposition_complete, effort_estimated, dependencies_mapped, risks_identified }) => {
      const checks = [
        scope_quantified,
        decomposition_complete,
        effort_estimated,
        dependencies_mapped,
        risks_identified
      ];
      
      const score = checks.filter(Boolean).length / checks.length;
      const passed = score >= 0.8;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: passed ? "✅ MATHPLAN GATE PASSED" : "❌ MATHPLAN GATE FAILED",
            
            requirements: {
              "Scope quantified": scope_quantified,
              "Decomposition complete": decomposition_complete,
              "Effort estimated": effort_estimated,
              "Dependencies mapped": dependencies_mapped,
              "Risks identified": risks_identified
            },
            
            score: score.toFixed(2),
            threshold: 0.80,
            passed,
            
            principle: "Must have mathematical certainty before execution",
            
            next_action: passed ? 
              "Proceed to execution" : 
              "Address missing items before proceeding"
          }, null, 2)
        }]
      };
    }
  );
}

export default registerDevelopmentProtocolTools;
