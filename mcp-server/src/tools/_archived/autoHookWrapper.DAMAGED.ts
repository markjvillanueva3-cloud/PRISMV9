/**
 * autoHookWrapper.ts - Universal hook/cadence system
 * RECOVERED from dist/index.js bundle on 2026-02-18T20:40:27.201Z
 * Note: Types are approximate. Bundle variables renamed by esbuild.
 */
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  HookResult, ToolCallContext, ProofValidation, FactVerify,
  HookExecution, RecordedAction, CompactionSurvivalData
} from "../types/prism-schema.js";
import { hookExecutor } from "../engines/HookExecutor.js";
import { hookEngine } from "../orchestration/HookEngine.js";
import {
  autoTodoRefresh, autoCheckpoint, autoContextPressure,
  autoContextCompress, autoCompactionDetect, autoCompactionSurvival,
  rehydrateFromSurvival, autoAttentionScore, autoContextPullBack,
  autoRecoveryManifest, autoHandoffPackage, markHandoffResumed,
  autoPreCompactionDump
} from "./cadenceExecutor.js";
import { slimJsonResponse, slimCadence, getSlimLevel, getCurrentPressurePct } from "../utils/responseSlimmer.js";
import { autoSkillHint, autoKnowledgeCrossQuery, autoDocAntiRegression, autoAgentRecommend,
  autoPhaseSkillLoader, autoSkillContextMatch, autoNLHookEvaluator, autoHookActivationPhaseCheck,
  autoD4PerfSummary
} from "./cadenceExecutor.js";
import { autoResponseTemplate, getResponseTemplateStats } from "../engines/ResponseTemplateEngine.js";
import { TelemetryEngine } from "../engines/TelemetryEngine.js";
import { MemoryGraphEngine } from "../engines/MemoryGraphEngine.js";
import { PredictiveFailureEngine } from "../engines/PredictiveFailureEngine.js";
import { computationCache } from "../engines/ComputationCache.js";
import {
  recordSessionToolCall, recordSessionHook, recordSessionSkillInjection,
  recordSessionTemplateMatch, recordSessionPressure, recordSessionCheckpoint,
  recordSessionCompactionRecovery, recordSessionError,
  writeSessionIncrementalPrep, getSessionQualityScore, getSessionMetrics
} from "../engines/SessionLifecycleEngine.js";
import { autoManusATCSPoll, getBridgeStatus } from "../engines/ManusATCSBridge.js";

var fs21 = __toESM(require("fs"));
var path24 = __toESM(require("path"));
var import_child_process2 = require("child_process");
init_HookExecutor();

// src/orchestration/HookEngine.ts
var fs12 = __toESM(require("fs"));
var PHASE0_HOOKS = [
  // CALCULATION HOOKS (12)
  { id: "CALC-BEFORE-EXEC-001", name: "Pre-Calculation Validation", category: "CALC", trigger: "before_calculation", priority: 100, enabled: true, isBlocking: false },
  { id: "CALC-AFTER-EXEC-001", name: "Post-Calculation Validation", category: "CALC", trigger: "after_calculation", priority: 100, enabled: true, isBlocking: false },
  { id: "CALC-RANGE-CHECK-001", name: "Range Boundary Check", category: "CALC", trigger: "range_check", priority: 90, enabled: true, isBlocking: true },
  { id: "CALC-TIER-VALIDATE-001", name: "Tier Validation", category: "CALC", trigger: "tier_validate", priority: 85, enabled: true, isBlocking: false },
  { id: "CALC-UNCERTAINTY-EXCEED-001", name: "Uncertainty Threshold Alert", category: "CALC", trigger: "uncertainty_exceed", priority: 80, enabled: true, isBlocking: false },
  { id: "CALC-PHYSICS-VALIDATE-001", name: "Physics Model Validation", category: "CALC", trigger: "physics_validate", priority: 95, enabled: true, isBlocking: true },
  { id: "CALC-SAFETY-VIOLATION-001", name: "Safety Score Violation (HARD BLOCK)", category: "CALC", trigger: "safety_violation", priority: 100, enabled: true, isBlocking: true },
  { id: "CALC-KIENZLE-001", name: "Kienzle Calculation Hook", category: "CALC", trigger: "kienzle_calc", priority: 85, enabled: true, isBlocking: false },
  { id: "CALC-TAYLOR-001", name: "Taylor Tool Life Hook", category: "CALC", trigger: "taylor_calc", priority: 85, enabled: true, isBlocking: false },
  { id: "CALC-JOHNSON-COOK-001", name: "Johnson-Cook Flow Stress Hook", category: "CALC", trigger: "johnson_cook_calc", priority: 85, enabled: true, isBlocking: false },
  { id: "CALC-MRR-001", name: "Material Removal Rate Hook", category: "CALC", trigger: "mrr_calc", priority: 80, enabled: true, isBlocking: false },
  { id: "CALC-POWER-001", name: "Power Consumption Hook", category: "CALC", trigger: "power_calc", priority: 80, enabled: true, isBlocking: false },
  // FILE HOOKS (8)
  { id: "FILE-BEFORE-READ-001", name: "Pre-Read Validation", category: "FILE", trigger: "before_read", priority: 90, enabled: true, isBlocking: false },
  { id: "FILE-AFTER-READ-001", name: "Post-Read Processing", category: "FILE", trigger: "after_read", priority: 90, enabled: true, isBlocking: false },
  { id: "FILE-BEFORE-WRITE-001", name: "Pre-Write Validation", category: "FILE", trigger: "before_write", priority: 95, enabled: true, isBlocking: true },
  { id: "FILE-AFTER-WRITE-001", name: "Post-Write Verification", category: "FILE", trigger: "after_write", priority: 95, enabled: true, isBlocking: false },
  { id: "FILE-BACKUP-TRIGGER-001", name: "Auto-Backup Trigger", category: "FILE", trigger: "backup_trigger", priority: 85, enabled: true, isBlocking: false },
  { id: "FILE-GCODE-VALIDATE-001", name: "G-Code Safety Validation (HARD BLOCK)", category: "FILE", trigger: "gcode_validate", priority: 100, enabled: true, isBlocking: true },
  { id: "FILE-JSON-VALIDATE-001", name: "JSON Schema Validation", category: "FILE", trigger: "json_validate", priority: 90, enabled: true, isBlocking: false },
  { id: "FILE-SIZE-CHECK-001", name: "File Size Threshold Check", category: "FILE", trigger: "size_check", priority: 80, enabled: true, isBlocking: false },
  // STATE HOOKS (6)
  { id: "STATE-BEFORE-MUTATE-001", name: "Pre-State Mutation", category: "STATE", trigger: "before_mutate", priority: 95, enabled: true, isBlocking: false },
  { id: "STATE-AFTER-MUTATE-001", name: "Post-State Mutation", category: "STATE", trigger: "after_mutate", priority: 95, enabled: true, isBlocking: false },
  { id: "STATE-CHECKPOINT-CREATE-001", name: "Checkpoint Creation", category: "STATE", trigger: "checkpoint_create", priority: 90, enabled: true, isBlocking: false },
  { id: "STATE-CHECKPOINT-RESTORE-001", name: "Checkpoint Restoration", category: "STATE", trigger: "checkpoint_restore", priority: 90, enabled: true, isBlocking: false },
  { id: "STATE-ANTI-REGRESSION-001", name: "Anti-Regression Check (HARD BLOCK)", category: "STATE", trigger: "anti_regression", priority: 100, enabled: true, isBlocking: true },
  { id: "STATE-SESSION-BOUNDARY-001", name: "Session Boundary Management", category: "STATE", trigger: "session_boundary", priority: 85, enabled: true, isBlocking: false },
  // AGENT HOOKS (5)
  { id: "AGENT-BEFORE-SPAWN-001", name: "Pre-Agent Spawn", category: "AGENT", trigger: "before_spawn", priority: 90, enabled: true, isBlocking: false },
  { id: "AGENT-AFTER-SPAWN-001", name: "Post-Agent Spawn", category: "AGENT", trigger: "after_spawn", priority: 90, enabled: true, isBlocking: false },
  { id: "AGENT-ON-COMPLETE-001", name: "Agent Completion Handler", category: "AGENT", trigger: "on_complete", priority: 85, enabled: true, isBlocking: false },
  { id: "AGENT-ON-ERROR-001", name: "Agent Error Handler", category: "AGENT", trigger: "on_error", priority: 95, enabled: true, isBlocking: false },
  { id: "AGENT-TIER-SELECT-001", name: "Agent Tier Selection", category: "AGENT", trigger: "tier_select", priority: 80, enabled: true, isBlocking: false },
  // BATCH HOOKS (6)
  { id: "BATCH-BEFORE-START-001", name: "Pre-Batch Validation", category: "BATCH", trigger: "before_start", priority: 90, enabled: true, isBlocking: false },
  { id: "BATCH-AFTER-COMPLETE-001", name: "Post-Batch Processing", category: "BATCH", trigger: "after_complete", priority: 90, enabled: true, isBlocking: false },
  { id: "BATCH-ITEM-COMPLETE-001", name: "Batch Item Completion", category: "BATCH", trigger: "item_complete", priority: 80, enabled: true, isBlocking: false },
  { id: "BATCH-ERROR-HANDLER-001", name: "Batch Error Recovery", category: "BATCH", trigger: "error_handler", priority: 95, enabled: true, isBlocking: false },
  { id: "BATCH-PROGRESS-UPDATE-001", name: "Progress Update Trigger", category: "BATCH", trigger: "progress_update", priority: 75, enabled: true, isBlocking: false },
  { id: "BATCH-CHECKPOINT-001", name: "Batch Checkpoint Trigger", category: "BATCH", trigger: "checkpoint", priority: 85, enabled: true, isBlocking: false },
  // FORMULA HOOKS (4)
  { id: "FORMULA-BEFORE-APPLY-001", name: "Pre-Formula Validation", category: "FORMULA", trigger: "before_apply", priority: 90, enabled: true, isBlocking: false },
  { id: "FORMULA-AFTER-APPLY-001", name: "Post-Formula Verification", category: "FORMULA", trigger: "after_apply", priority: 90, enabled: true, isBlocking: false },
  { id: "FORMULA-UNIT-CHECK-001", name: "Unit Consistency Check", category: "FORMULA", trigger: "unit_check", priority: 85, enabled: true, isBlocking: true },
  { id: "FORMULA-RANGE-VALIDATE-001", name: "Formula Range Validation", category: "FORMULA", trigger: "range_validate", priority: 85, enabled: true, isBlocking: false },
  // INTEL HOOKS - Λ(x)/Φ(x) Protocol (3)
  { id: "INTEL-PROOF-001", name: "\u039B(x) Formal Logic Proof Validation", category: "INTEL", trigger: "proof_validate", priority: 100, enabled: true, isBlocking: false },
  { id: "INTEL-FACT-001", name: "\u03A6(x) Factual Claim Verification", category: "INTEL", trigger: "fact_verify", priority: 90, enabled: true, isBlocking: false },
  { id: "AUTOHOOK-TEST-001", name: "Auto-Hook System Test", category: "DIAG", trigger: "test_ping", priority: 10, enabled: true, isBlocking: false },
  // REFLECTION HOOKS (1)
  { id: "REFL-002", name: "Error Reflection Analysis", category: "REFL", trigger: "error_detected", priority: 95, enabled: true, isBlocking: false },
  // DISPATCHER HOOKS — Integration Stop 0 (3)
  { id: "DISPATCH-ACTION-VALIDATE-001", name: "Dispatcher Action Validator", category: "DISPATCH", trigger: "before_dispatch", priority: 100, enabled: true, isBlocking: true },
  { id: "DISPATCH-LEGACY-REDIRECT-001", name: "Legacy Tool Name Redirect", category: "DISPATCH", trigger: "legacy_tool_call", priority: 80, enabled: true, isBlocking: false },
  { id: "DISPATCH-PERF-TRACK-001", name: "Dispatcher Performance Tracker", category: "DISPATCH", trigger: "after_dispatch", priority: 50, enabled: true, isBlocking: false },
  // P1A — BLOCKING HOOK GAPS (5 new hooks — all isBlocking: true)
  { id: "AGENT-PARAM-VALIDATE-001", name: "Agent Parameter Validator (BLOCKING)", category: "AGENT", trigger: "before_spawn", priority: 100, enabled: true, isBlocking: true },
  { id: "BATCH-SIZE-LIMIT-001", name: "Batch Size Limit Guard (BLOCKING)", category: "BATCH", trigger: "before_start", priority: 100, enabled: true, isBlocking: true },
  { id: "INTEL-PROOF-ENFORCE-001", name: "Formal Proof Enforcement (BLOCKING)", category: "INTEL", trigger: "proof_validate", priority: 100, enabled: true, isBlocking: true },
  { id: "DIAG-CRITICAL-BLOCK-001", name: "Critical Diagnostic Blocker (BLOCKING)", category: "DIAG", trigger: "critical_failure", priority: 95, enabled: true, isBlocking: true },
  { id: "REFL-ERROR-ESCALATE-001", name: "Repeated Error Escalation (BLOCKING)", category: "REFL", trigger: "error_detected", priority: 90, enabled: true, isBlocking: true },
  // AGENT HOOKS — Enhanced with Real Logic (3 new)
  { id: "AGENT-COST-GUARD-001", name: "Agent Cost Guard (BLOCKING)", category: "AGENT", trigger: "before_spawn", priority: 100, enabled: true, isBlocking: true },
  { id: "AGENT-ESCALATION-DETECT-001", name: "Agent Tier Escalation Detector", category: "AGENT", trigger: "on_error", priority: 85, enabled: true, isBlocking: false },
  { id: "AGENT-RESULT-QUALITY-001", name: "Agent Result Quality Gate", category: "AGENT", trigger: "on_complete", priority: 90, enabled: true, isBlocking: false },
  // ORCHESTRATION HOOKS — Swarm/Pipeline/Consensus Enforcement (6 new)
  { id: "ORCH-BEFORE-SWARM-001", name: "Pre-Swarm Validation", category: "ORCH", trigger: "before_spawn", priority: 90, enabled: true, isBlocking: false },
  { id: "ORCH-AFTER-SWARM-001", name: "Post-Swarm Tracking", category: "ORCH", trigger: "on_complete", priority: 85, enabled: true, isBlocking: false },
  { id: "ORCH-CONSENSUS-GUARD-001", name: "Consensus Quorum Guard (BLOCKING)", category: "ORCH", trigger: "before_spawn", priority: 100, enabled: true, isBlocking: true },
  { id: "ORCH-PARALLEL-LIMIT-001", name: "Parallel Agent Limit (BLOCKING)", category: "ORCH", trigger: "before_spawn", priority: 100, enabled: true, isBlocking: true },
  { id: "ORCH-PATTERN-VALIDATE-001", name: "Swarm Pattern Selection Validator", category: "ORCH", trigger: "before_spawn", priority: 90, enabled: true, isBlocking: false },
  { id: "ORCH-PIPELINE-CHECKPOINT-001", name: "Pipeline Stage Checkpoint", category: "ORCH", trigger: "on_complete", priority: 80, enabled: true, isBlocking: false }
];
var HookEngine = class {
  hooks = /* @__PURE__ */ new Map();
  domainHooks = /* @__PURE__ */ new Map();
  executionLog = [];
  registryPath = "C:\\PRISM\\state\\HOOK_REGISTRY.json";
  constructor() {
    this.loadPhase0Hooks();
    this.loadDomainHooks();
  }
  loadPhase0Hooks() {
    for (const hook of PHASE0_HOOKS) {
      this.hooks.set(hook.id, hook);
    }
  }
  loadDomainHooks() {
    try {
      if (fs12.existsSync(this.registryPath)) {
        const registry = JSON.parse(fs12.readFileSync(this.registryPath, "utf-8"));
        const domainHookList = registry.hooks || [];
        for (const hook of domainHookList) {
          this.domainHooks.set(hook.id, {
            id: hook.id,
            name: hook.name || hook.id,
            category: hook.category || "DOMAIN",
            trigger: hook.trigger || "manual",
            priority: hook.priority || 50,
            enabled: hook.enabled !== false,
            isBlocking: hook.isBlocking || false
          });
        }
      }
    } catch (error) {
    }
  }
  async executeHook(hookId, context) {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    let hook = this.hooks.get(hookId) || this.domainHooks.get(hookId);
    if (!hook) {
      return { status: "warning", hookId, message: `Hook ${hookId} not found` };
    }
    if (!hook.enabled) {
      return { status: "warning", hookId, message: `Hook ${hookId} is disabled` };
    }
    const hookContext = {
      hookId,
      timestamp: timestamp2,
      source: context.source || "unknown",
      data: context
    };
    try {
      const startMs = Date.now();
      const result = await this.executeBuiltInHandler(hook, hookContext);
      const duration_ms = Date.now() - startMs;
      this.executionLog.push({ hookId, timestamp: timestamp2, result, duration_ms, category: hook.category, isBlocking: hook.isBlocking, source: context.source || "hookEngine" });
      if (this.executionLog.length > 1e3) {
        this.executionLog = this.executionLog.slice(-500);
      }
      return result;
    } catch (error) {
      const errorResult = { status: "error", hookId, message: `Hook execution failed: ${error}` };
      this.executionLog.push({ hookId, timestamp: timestamp2, result: errorResult, duration_ms: Date.now() - (Date.parse(timestamp2) || Date.now()), category: hook.category, isBlocking: hook.isBlocking, source: "hookEngine" });
      return errorResult;
    }
  }
  async executeBuiltInHandler(hook, context) {
    if (hook.id === "CALC-SAFETY-VIOLATION-001") {
      const safetyScore = context.data.safety_score ?? context.data.S ?? 1;
      if (safetyScore < 0.7) {
        return { status: "blocked", hookId: hook.id, message: `HARD BLOCK: Safety score ${safetyScore} < 0.70`, blockReason: "safety_violation" };
      }
    }
    if (hook.id === "STATE-ANTI-REGRESSION-001") {
      const oldCount = context.data.old_count ?? 0;
      const newCount = context.data.new_count ?? 0;
      if (newCount < oldCount) {
        return { status: "blocked", hookId: hook.id, message: `HARD BLOCK: Regression detected. Old: ${oldCount}, New: ${newCount}`, blockReason: "anti_regression" };
      }
    }
    if (hook.id === "FILE-GCODE-VALIDATE-001") {
      const gcode = context.data.gcode || "";
      const dangerousCodes = ["M00", "M01", "M30", "M99"];
      for (const code of dangerousCodes) {
        if (gcode.includes(code) && !context.data.approved) {
          return { status: "blocked", hookId: hook.id, message: `HARD BLOCK: Dangerous G-code ${code}`, blockReason: "dangerous_gcode" };
        }
      }
    }
    if (hook.id === "CALC-RANGE-CHECK-001") {
      const { value, min, max } = context.data;
      if (value !== void 0 && min !== void 0 && value < min) {
        return { status: "blocked", hookId: hook.id, message: `BLOCK: Value ${value} below minimum ${min}`, blockReason: "range_violation" };
      }
      if (value !== void 0 && max !== void 0 && value > max) {
        return { status: "blocked", hookId: hook.id, message: `BLOCK: Value ${value} above maximum ${max}`, blockReason: "range_violation" };
      }
    }
    if (hook.id === "CALC-PHYSICS-VALIDATE-001") {
      const { rpm, feed, depth, force } = context.data;
      if (rpm !== void 0 && rpm < 0) return { status: "blocked", hookId: hook.id, message: `BLOCK: Negative RPM (${rpm})`, blockReason: "physics_violation" };
      if (feed !== void 0 && feed < 0) return { status: "blocked", hookId: hook.id, message: `BLOCK: Negative feed (${feed})`, blockReason: "physics_violation" };
      if (depth !== void 0 && depth < 0) return { status: "blocked", hookId: hook.id, message: `BLOCK: Negative depth (${depth})`, blockReason: "physics_violation" };
      const divisor = context.data.divisor ?? context.data.denominator;
      if (divisor !== void 0 && divisor === 0) return { status: "blocked", hookId: hook.id, message: `BLOCK: Division by zero`, blockReason: "division_by_zero" };
    }
    if (hook.id === "FILE-BEFORE-WRITE-001") {
      const { old_size, new_size } = context.data;
      if (old_size !== void 0 && new_size !== void 0 && old_size > 0) {
        const ratio = new_size / old_size;
        if (ratio < 0.4) return { status: "blocked", hookId: hook.id, message: `BLOCK: >60% content loss (${old_size}\u2192${new_size} bytes)`, blockReason: "content_loss" };
        if (ratio < 0.7) return { status: "warning", hookId: hook.id, message: `WARNING: >30% content reduction (${old_size}\u2192${new_size} bytes)` };
      }
    }
    if (hook.id === "FORMULA-UNIT-CHECK-001") {
      const { expected_unit, actual_unit } = context.data;
      if (expected_unit && actual_unit && expected_unit !== actual_unit) {
        return { status: "blocked", hookId: hook.id, message: `BLOCK: Unit mismatch \u2014 expected ${expected_unit}, got ${actual_unit}`, blockReason: "unit_mismatch" };
      }
    }
    if (hook.id === "DISPATCH-ACTION-VALIDATE-001") {
      const { action: action2, valid_actions } = context.data;
      if (action2 && valid_actions && Array.isArray(valid_actions) && !valid_actions.includes(action2)) {
        return { status: "blocked", hookId: hook.id, message: `BLOCK: Invalid action "${action2}"`, blockReason: "invalid_action" };
      }
    }
    if (hook.id === "AGENT-PARAM-VALIDATE-001") {
      const { agent_id, tier } = context.data;
      if (!agent_id) return { status: "blocked", hookId: hook.id, message: `BLOCK: Missing agent_id`, blockReason: "missing_param" };
      if (tier && !["opus", "sonnet", "haiku"].includes(tier.toLowerCase())) {
        return { status: "blocked", hookId: hook.id, message: `BLOCK: Invalid tier "${tier}"`, blockReason: "invalid_tier" };
      }
    }
    if (hook.id === "BATCH-SIZE-LIMIT-001") {
      const { batch_size, max_batch_size } = context.data;
      const limit = max_batch_size || 100;
      if (batch_size !== void 0 && batch_size > limit) {
        return { status: "blocked", hookId: hook.id, message: `BLOCK: Batch size ${batch_size} exceeds limit ${limit}`, blockReason: "batch_too_large" };
      }
    }
    if (hook.id === "AGENT-COST-GUARD-001") {
      const action2 = context.data.action || "";
      const tier = (context.data.tier || context.data.model || "").toLowerCase();
      const isOpus = tier.includes("opus");
      const simpleLookupActions = [
        "material_get",
        "material_search",
        "machine_get",
        "machine_search",
        "tool_get",
        "tool_search",
        "alarm_decode",
        "alarm_search",
        "formula_get",
        "skill_get",
        "script_get",
        "skill_list",
        "script_list"
      ];
      const taskComplexity = context.data.task_complexity || context.data.complexity || "";
      const isSimpleTask = simpleLookupActions.includes(action2) || taskComplexity === "low" || taskComplexity === "simple";
      if (isOpus && isSimpleTask) {
        return {
          status: "blocked",
          hookId: hook.id,
          message: `COST GUARD: OPUS requested for simple action "${action2}". Use HAIKU ($0.25/1M) or SONNET ($3/1M) instead of OPUS ($75/1M).`,
          blockReason: "cost_optimization",
          data: { recommended_tier: simpleLookupActions.includes(action2) ? "haiku" : "sonnet", action: action2, original_tier: tier }
        };
      }
    }
    if (hook.id === "AGENT-ESCALATION-DETECT-001") {
      const { error_message, tier, action: action2, agent_id, severity } = context.data;
      const currentTier = (tier || "").toLowerCase();
      const isSevere = severity === "HIGH" || severity === "CRITICAL";
      const isConfidenceLow = context.data.confidence !== void 0 && context.data.confidence < 0.8;
      const isSafetyRelated = context.data.safety_score !== void 0 && context.data.safety_score < 0.7;
      let recommendedTier = null;
      let reason = "";
      if (currentTier.includes("haiku") && (error_message || isConfidenceLow)) {
        recommendedTier = "sonnet";
        reason = error_message ? `HAIKU failed: ${(error_message || "").slice(0, 80)}` : `Low confidence (${context.data.confidence})`;
      }
      if ((currentTier.includes("haiku") || currentTier.includes("sonnet")) && (isSevere || isSafetyRelated)) {
        recommendedTier = "opus";
        reason = isSafetyRelated ? `Safety-critical: S(x)=${context.data.safety_score}` : `Severity: ${severity}`;
      }
      if (recommendedTier) {
        return {
          status: "warning",
          hookId: hook.id,
          message: `ESCALATION RECOMMENDED: ${currentTier} \u2192 ${recommendedTier}. ${reason}`,
          data: { current_tier: currentTier, recommended_tier: recommendedTier, reason, agent_id, action: action2 }
        };
      }
    }
    if (hook.id === "AGENT-RESULT-QUALITY-001") {
      const { result_size, omega_score, has_uncertainty, action: action2 } = context.data;
      const warnings = [];
      if (result_size !== void 0 && result_size < 10) {
        warnings.push(`Suspiciously small result (${result_size} chars) \u2014 possible empty/stub response`);
      }
      if (omega_score !== void 0 && omega_score < 0.7) {
        warnings.push(`\u03A9 score ${omega_score} below release threshold 0.70`);
      }
      if (has_uncertainty === false && context.data.is_numeric === true) {
        warnings.push("Numeric result missing uncertainty bounds \u2014 violates CMD5");
      }
      if (warnings.length > 0) {
        return {
          status: "warning",
          hookId: hook.id,
          message: `QUALITY CONCERNS: ${warnings.join("; ")}`,
          data: { warnings, action: action2, suggestion: "Review agent result before accepting" }
        };
      }
    }
    if (hook.id === "ORCH-CONSENSUS-GUARD-001") {
      const action2 = context.data.action || "";
      const pattern = context.data.pattern || "";
      const agentCount = context.data.agent_count || context.data.agents?.length || 0;
      const isConsensus = action2 === "swarm_consensus" || pattern === "consensus";
      if (isConsensus && agentCount < 3) {
        return {
          status: "blocked",
          hookId: hook.id,
          message: `BLOCK: Consensus requires \u22653 agents for meaningful voting. Got ${agentCount}. Add more agents or use a different pattern.`,
          blockReason: "insufficient_quorum",
          data: { required: 3, provided: agentCount, pattern }
        };
      }
    }
    if (hook.id === "ORCH-PARALLEL-LIMIT-001") {
      const action2 = context.data.action || "";
      const agentCount = context.data.agent_count || context.data.agents?.length || 0;
      const maxParallel = 20;
      const isParallel = action2 === "swarm_parallel" || action2 === "agent_parallel" || action2 === "swarm_execute";
      if (isParallel && agentCount > maxParallel) {
        return {
          status: "blocked",
          hookId: hook.id,
          message: `BLOCK: ${agentCount} parallel agents exceeds system limit of ${maxParallel}. Reduce agent count or use map_reduce pattern with batching.`,
          blockReason: "parallel_limit_exceeded",
          data: { limit: maxParallel, requested: agentCount }
        };
      }
    }
    if (hook.id === "ORCH-PATTERN-VALIDATE-001") {
      const action2 = context.data.action || "";
      const pattern = context.data.pattern || "";
      const agentCount = context.data.agent_count || context.data.agents?.length || 0;
      const warnings = [];
      if (pattern === "ralph_loop" && agentCount > 3) {
        warnings.push(`ralph_loop is a 3-agent pattern (generate\u2192critique\u2192refine). ${agentCount} agents is unusual \u2014 consider specialist_team instead.`);
      }
      if (pattern === "parallel_extract" && agentCount === 1) {
        warnings.push("parallel_extract with 1 agent gains nothing. Use agent_execute for single-agent tasks.");
      }
      if (pattern === "consensus" && agentCount % 2 === 0) {
        warnings.push(`Consensus with even agent count (${agentCount}) risks ties. Use odd numbers (3, 5) for clean majority.`);
      }
      if (pattern === "pipeline" && agentCount > 10) {
        warnings.push(`Pipeline with ${agentCount} stages is very long. Consider breaking into sub-pipelines with checkpoints.`);
      }
      if ((action2 === "swarm_parallel" || action2 === "swarm_execute") && !pattern) {
        warnings.push("Swarm execution without explicit pattern. Specify a pattern (parallel_extract, ralph_loop, consensus, etc.) for better results.");
      }
      if (warnings.length > 0) {
        return {
          status: "warning",
          hookId: hook.id,
          message: `PATTERN ADVISORY: ${warnings.join(" | ")}`,
          data: { pattern, agent_count: agentCount, warnings }
        };
      }
    }
    if (hook.id === "ORCH-PIPELINE-CHECKPOINT-001") {
      const { pipeline_stage, total_stages, stage_result, pattern } = context.data;
      const isPipeline = pattern === "pipeline" || context.data.action === "swarm_pipeline";
      if (isPipeline && pipeline_stage !== void 0 && total_stages !== void 0) {
        const progress = Math.round(pipeline_stage / total_stages * 100);
        const stageFailed = stage_result === "error" || stage_result === "failed";
        if (stageFailed) {
          return {
            status: "warning",
            hookId: hook.id,
            message: `PIPELINE STAGE ${pipeline_stage}/${total_stages} FAILED (${progress}% complete). Consider replan or rollback.`,
            data: { stage: pipeline_stage, total: total_stages, progress, suggestion: "Use prism_atcs\u2192replan to adjust remaining stages" }
          };
        }
        return {
          status: "success",
          hookId: hook.id,
          message: `Pipeline stage ${pipeline_stage}/${total_stages} complete (${progress}%)`,
          data: { stage: pipeline_stage, total: total_stages, progress }
        };
      }
    }
    return { status: "success", hookId: hook.id, message: `Hook ${hook.id} executed`, data: { trigger: hook.trigger, priority: hook.priority } };
  }
  async executeChain(hookIds, context) {
    const results = [];
    for (const hookId of hookIds) {
      const result = await this.executeHook(hookId, context);
      results.push(result);
      if (result.status === "blocked") break;
    }
    return results;
  }
  getHook(hookId) {
    return this.hooks.get(hookId) || this.domainHooks.get(hookId);
  }
  listHooks(category) {
    const allHooks2 = [...this.hooks.values(), ...this.domainHooks.values()];
    return category ? allHooks2.filter((h) => h.category === category) : allHooks2;
  }
  /** Accept external hook execution records (from autoHookWrapper cadence functions) */
  recordExternalExecution(entry) {
    if (!entry.hookId || typeof entry.hookId !== "string") return;
    const duration = Math.max(0, Math.min(Number(entry.duration_ms) || 0, 6e4));
    const category = entry.hookId.split("-")[0] || "EXTERNAL";
    this.executionLog.push({
      hookId: entry.hookId,
      timestamp: entry.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      result: { status: entry.success ? "success" : "error", hookId: entry.hookId, message: entry.event || "external" },
      duration_ms: duration,
      category,
      isBlocking: false,
      source: entry.source || "autoHookWrapper"
    });
    if (this.executionLog.length > 1e3) {
      this.executionLog = this.executionLog.slice(-500);
    }
  }
  getExecutionLog(limit = 50) {
    return this.executionLog.slice(-limit);
  }
  setHookEnabled(hookId, enabled) {
    const hook = this.hooks.get(hookId) || this.domainHooks.get(hookId);
    if (hook) {
      hook.enabled = enabled;
      return true;
    }
    return false;
  }
  // Alias for backward compatibility with hookDispatcher
  toggleHook(hookId, enabled) {
    return this.setHookEnabled(hookId, enabled);
  }
  getCoverage(domain) {
    const allHooks2 = [...this.hooks.values(), ...this.domainHooks.values()];
    const filtered = domain ? allHooks2.filter((h) => h.category === domain.toUpperCase()) : allHooks2;
    const byCategory = {};
    for (const h of filtered) {
      if (!byCategory[h.category]) byCategory[h.category] = { total: 0, enabled: 0 };
      byCategory[h.category].total++;
      if (h.enabled) byCategory[h.category].enabled++;
    }
    const enabled = filtered.filter((h) => h.enabled).length;
    return { total: filtered.length, covered: enabled, coverage_pct: filtered.length > 0 ? Math.round(enabled / filtered.length * 100) : 0, by_category: byCategory };
  }
  getGaps(domain, severity) {
    const allHooks2 = [...this.hooks.values(), ...this.domainHooks.values()];
    const filtered = domain ? allHooks2.filter((h) => h.category === domain.toUpperCase()) : allHooks2;
    const gaps = [];
    for (const h of filtered) {
      if (!h.enabled) gaps.push({ category: h.category, hook_id: h.id, issue: "disabled", severity: h.isBlocking ? "critical" : "warning" });
    }
    const categories = new Set(filtered.map((h) => h.category));
    for (const cat of categories) {
      const catHooks = filtered.filter((h) => h.category === cat);
      if (!catHooks.some((h) => h.isBlocking && h.enabled)) {
        gaps.push({ category: cat, hook_id: "N/A", issue: "no_blocking_hook", severity: "info" });
      }
    }
    if (severity && severity !== "all") return { gaps: gaps.filter((g) => g.severity === severity) };
    return { gaps };
  }
  getPerformance(hookId, sortBy, limit) {
    let log2 = this.executionLog;
    if (hookId) log2 = log2.filter((e) => e.hookId === hookId);
    const total = log2.length;
    const byStatus = {};
    const byCategory = {};
    let totalDuration = 0;
    let durationCount = 0;
    for (const e of log2) {
      byStatus[e.result.status] = (byStatus[e.result.status] || 0) + 1;
      if (e.category) byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      if (e.duration_ms !== void 0) {
        totalDuration += e.duration_ms;
        durationCount++;
      }
    }
    if (sortBy === "duration" || sortBy === "avg_duration") {
      log2 = [...log2].sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0));
    }
    log2 = log2.slice(-(limit || 20));
    return {
      executions: log2.map((e) => ({ hookId: e.hookId, timestamp: e.timestamp, status: e.result.status, duration_ms: e.duration_ms, category: e.category, isBlocking: e.isBlocking, source: e.source })),
      summary: { total, byStatus, byCategory, avgDuration_ms: durationCount > 0 ? Math.round(totalDuration / durationCount * 100) / 100 : 0 }
    };
  }
  getFailures(hookId, lastN, includeStack) {
    let log2 = this.executionLog.filter((e) => e.result.status === "error" || e.result.status === "blocked");
    if (hookId) log2 = log2.filter((e) => e.hookId === hookId);
    log2 = log2.slice(-(lastN || 100));
    return { failures: log2.map((e) => ({ hookId: e.hookId, timestamp: e.timestamp, message: e.result.message || "" })) };
  }
  getStats() {
    const allHooks2 = [...this.hooks.values(), ...this.domainHooks.values()];
    return {
      phase0Count: this.hooks.size,
      domainCount: this.domainHooks.size,
      totalCount: allHooks2.length,
      enabledCount: allHooks2.filter((h) => h.enabled).length,
      blockingCount: allHooks2.filter((h) => h.isBlocking).length,
      executionCount: this.executionLog.length
    };
  }
};
var hookEngine = new HookEngine();
