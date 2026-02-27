/**
 * autoHookWrapper.ts - Universal hook/cadence system
 * 
 * RECOVERED AND RECONSTRUCTED: 2026-02-18
 * Source: dist/index.js bundle extraction (autoHookWrapper.recovered.js, 1820 lines)
 * 
 * This file wraps every MCP dispatcher with:
 *   - Safety validation hooks (Λ/Φ scores)
 *   - Cadence-based auto-fire functions (todo, checkpoint, pressure, etc.)
 *   - Telemetry, memory graph, and certificate integration
 *   - Compaction detection and recovery
 *   - Anti-regression and error learning
 *   - DA-MS11 enforcement: phase skills, context matching, NL hooks, hook activation
 * 
 * EXPORTS: wrapToolWithAutoHooks, wrapWithUniversalHooks, getDispatchCount,
 *          AUTO_HOOK_CONFIG, registerAutoHookTools, getHookHistory, resetReconFlag
 * 
 * BACKUP POLICY: Always run backup-before-edit.ps1 before modifying this file.
 */
import "../engines/reactiveChainBootstrap.js";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  HookResult, ToolCallContext,
  HookExecution, RecordedAction, CompactionSurvivalData
} from "../types/prism-schema.js";
// ProofValidation and FactVerify do not exist as exports — functionality is inline
import { hookExecutor } from "../engines/HookExecutor.js";
import { hookEngine } from "../orchestration/HookEngine.js";
import {
  autoTodoRefresh, autoCheckpoint, autoContextPressure,
  autoContextCompress, autoCompactionDetect, autoCompactionSurvival,
  autoAttentionScore, autoContextPullBack,
  autoRecoveryManifest, autoHandoffPackage, markHandoffResumed,
  autoPreCompactionDump,
  autoPreTaskRecon, autoWarmStartData, autoContextRehydrate,
  autoInputValidation, autoErrorLearn, autoD3ErrorChain,
  autoD3LkgUpdate, autoAntiRegression, autoDecisionCapture,
  autoQualityGate, autoVariationCheck,
  autoD4CacheCheck, autoD4DiffCheck, autoD4BatchTick,
  autoTelemetrySnapshot,
  autoPythonCompactionPredict, autoPythonCompress, autoPythonExpand,
  autoPatternMatch, autoPatternStatsUpdate, autoFailurePatternSync
} from "./cadenceExecutor.js";
import type { PatternMatchResult } from "./cadenceExecutor.js";
import {
  autoSkillHint, autoKnowledgeCrossQuery, autoDocAntiRegression, autoAgentRecommend,
  autoScriptRecommend,
  autoPhaseSkillLoader, autoSkillContextMatch, autoNLHookEvaluator,
  autoHookActivationPhaseCheck, autoD4PerfSummary,
  autoSkillHookMatch, autoSuperpowerBoot,
  autoBudgetTrack, autoMemoryExternalize, autoSessionHealthPoll, autoKvCacheStabilityCheck,
  autoNextSessionPrep, autoPfpPatternExtract, autoSessionQualityTrack,
  autoPatternDetect, autoFocusOptimize, autoRelevanceFilter,
  autoMemoryGraphFlush, autoWipCapture, autoSessionLifecycleStart, autoSessionLifecycleEnd,
  autoLearningQuery, autoTelemetryAnomalyCheck, autoBudgetReport, autoAttentionAnchor,
  autoCognitiveUpdate, autoSessionHandoffGenerate, autoTelemetrySloCheck,
  autoStateReconstruct, autoSessionMetricsSnapshot, autoMemoryGraphIntegrity,
  autoParallelDispatch, autoGroupedSwarmDispatch, autoATCSParallelUpgrade,
  autoPriorityScore, autoSkillPreload, autoKvStabilityPeriodic,
  autoContextPressureRecommend, autoMemoryGraphEvict, autoCompactionTrend,
  autoDispatcherByteTrack,
  autoCompress, autoTemplateOptimizer, autoResumeDetector, autoLearningStorePersist,
  autoComplianceAuditBoot, autoSLBConsume, autoBridgeHealthCheck, autoRegistryRefresh,
  autoGsdAccessSummary, autoSwarmPatternDecay, autoNLHookValidate, autoOmegaHistoryPersist,
  autoOmegaHistoryRestore, autoCognitiveStatePersist, autoCognitiveStateRestore,
  autoConversationalMemorySave, autoTelemetryResolve, autoScriptQueueDrain,
  autoRoadmapHeartbeat, autoCalcPreEnrich, autoKnowledgePreWarm, autoJobLearningPersist,
  autoATCSCheckpointScan, autoRalphScoreCapture
} from "./cadenceExecutor.js";
import { slimJsonResponse, slimCadence, persistCadenceToDisk, getSlimLevel, getCurrentPressurePct } from "../utils/responseSlimmer.js";
import { compactJsonValues, getDslLegend } from "../config/dslAbbreviations.js";
import { PATHS } from "../constants.js";
import { autoResponseTemplate, getResponseTemplateStats } from "../engines/ResponseTemplateEngine.js";
import { TelemetryEngine } from "../engines/TelemetryEngine.js";
import { MemoryGraphEngine } from "../engines/MemoryGraphEngine.js";
import { PredictiveFailureEngine, pfpEngine } from "../engines/PredictiveFailureEngine.js";
import { computationCache } from "../engines/ComputationCache.js";
import {
  recordSessionToolCall, recordSessionHook, recordSessionSkillInjection,
  recordSessionTemplateMatch, recordSessionPressure, recordSessionCheckpoint,
  recordSessionCompactionRecovery, recordSessionError,
  writeSessionIncrementalPrep, getSessionQualityScore, getSessionMetrics
} from "../engines/SessionLifecycleEngine.js";
import { autoManusATCSPoll, getBridgeStatus } from "../engines/ManusATCSBridge.js";

// ============================================================================
// CONFIGURATION
// ============================================================================

// H1-MS4: Decision logging — top-level function to prevent tree-shaking
const DECISION_ACTIONS = new Set([
  "strategy_select", "speed_feed", "tool_recommend", "cross_query",
  "cutting_force", "tool_life", "coolant_strategy", "multi_pass"
]);

function logDecisionIfApplicable(
  toolName: string, action: string, args: any, result: any, error: any, durationMs: number
): void {
  try {
    if (!DECISION_ACTIONS.has(action) || error) return;
    const resultText = result?.content?.[0]?.text || "";
    let parsed: any = {};
    try { parsed = JSON.parse(resultText); } catch { /* not JSON */ }
    const entry = {
      ts: new Date().toISOString(),
      session: process.env.SESSION_ID || "unknown",
      type: "auto_decision",
      dispatcher: toolName,
      action,
      params: typeof args.params === "object" ? JSON.stringify(args.params).slice(0, 300) : "",
      chosen: (parsed.strategy_id || parsed.name || parsed.strategy || resultText.slice(0, 100)),
      duration_ms: durationMs,
    };
    const decLogPath = path.join("C:", "PRISM", "state", "DECISION_LOG.jsonl");
    fs.appendFileSync(decLogPath, JSON.stringify(entry) + "\n");
  } catch { /* decision logging non-fatal */ }
}

let telemetryEngine: any = null;

// H1-MS4: Error→Fix tracking in LEARNING_LOG
export function logErrorFix(errorSignature: string, dispatcher: string, action: string, fix: string, file?: string): void {
  try {
    const entry = {
      ts: new Date().toISOString(),
      type: "error_fix",
      error_signature: errorSignature,
      dispatcher, action, fix, file,
      session: process.env.SESSION_ID || "unknown",
    };
    const logPath = path.join("C:", "PRISM", "state", "LEARNING_LOG.jsonl");
    fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
  } catch { /* non-fatal */ }
}



export var AUTO_HOOK_CONFIG = {
  enabled: true,
  // Tools that trigger safety calculation hooks
  calcTools: [
    "calc_cutting_force",
    "calc_tool_life",
    "calc_mrr",
    "calc_surface_finish",
    "calc_power",
    "calc_deflection",
    "calc_stability",
    "calc_thermal",
    "calc_speed_feed",
    "calc_chip_load",
    "calc_engagement",
    "calc_trochoidal",
    "calc_hsm",
    "calc_scallop",
    "calc_stepover",
    "calc_cycle_time",
    "calc_arc_fit",
    "calc_cost_optimize",
    "calc_multi_optimize",
    "calc_productivity",
    "prism_cutting_force",
    "prism_tool_life",
    "prism_speed_feed",
    "prism_formula_calc"
  ],
  // Tools that trigger factual verification
  webTools: ["web_search", "web_fetch"],
  // Claim indicators for Φ(x) verification
  claimIndicators: [
    "studies show",
    "research indicates",
    "according to",
    "data shows",
    "evidence suggests",
    "proven that",
    "the fact that",
    "it is known that",
    "established that",
    "scientists found",
    "experts agree"
  ],
  // Safety thresholds
  thresholds: {
    lambda_min: 0.9,
    phi_high: 0.85,
    phi_moderate: 0.6,
    safety_min: 0.7
  }
};
var hookHistory: any[] = [];
var MAX_HISTORY = 100;
function logHookExecution(execution: any) {
  hookHistory.unshift(execution);
  if (hookHistory.length > MAX_HISTORY) {
    hookHistory.pop();
  }
  try {
    hookEngine.recordExternalExecution({
      hookId: execution.hook_id || execution.hookId || "unknown",
      timestamp: execution.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      success: execution.success !== false,
      duration_ms: Math.max(0, Number(execution.duration_ms) || 0),
      source: "autoHookWrapper",
      event: execution.event || "cadence"
    });
  } catch (e) {
    process.stderr.write(`[PRISM-TELEMETRY-WARN] Bridge failed: ${e instanceof Error ? e.message : String(e)}
`);
  }
}
export function getHookHistory(limit = 50) {
  return hookHistory.slice(0, limit);
}
function validateSafetyProof(context: any) {
  const { tool_name, inputs, result } = context;
  const issues: string[] = [];
  let validityScore = 1;
  if (inputs) {
    if (inputs.cutting_speed !== undefined) {
      if (inputs.cutting_speed < 1 || inputs.cutting_speed > 2e3) {
        issues.push(`Cutting speed ${inputs.cutting_speed} outside valid range [1-2000] m/min`);
        validityScore -= 0.3;
      }
    }
    if (inputs.feed_per_tooth !== undefined) {
      if (inputs.feed_per_tooth < 1e-3 || inputs.feed_per_tooth > 2) {
        issues.push(`Feed per tooth ${inputs.feed_per_tooth} outside valid range [0.001-2] mm`);
        validityScore -= 0.3;
      }
    }
    if (inputs.axial_depth !== undefined) {
      if (inputs.axial_depth < 0.01 || inputs.axial_depth > 100) {
        issues.push(`Axial depth ${inputs.axial_depth} outside valid range [0.01-100] mm`);
        validityScore -= 0.3;
      }
    }
    if (inputs.tool_diameter !== undefined) {
      if (inputs.tool_diameter < 0.1 || inputs.tool_diameter > 500) {
        issues.push(`Tool diameter ${inputs.tool_diameter} outside valid range [0.1-500] mm`);
        validityScore -= 0.3;
      }
    }
  }
  if (result) {
    if (result.cutting_force !== undefined && result.cutting_force < 0) {
      issues.push(`Negative cutting force ${result.cutting_force} is physically impossible`);
      validityScore -= 0.5;
    }
    if (result.power !== undefined) {
      if (result.power < 0) {
        issues.push(`Negative power ${result.power} is physically impossible`);
        validityScore -= 0.5;
      } else if (result.power > 100) {
        issues.push(`Power ${result.power} kW exceeds typical machine limits - verify`);
        validityScore -= 0.1;
      }
    }
    if (result.tool_life !== undefined && result.tool_life <= 0) {
      issues.push(`Zero or negative tool life is invalid`);
      validityScore -= 0.5;
    }
  }
  const isValid2 = validityScore >= AUTO_HOOK_CONFIG.thresholds.lambda_min;
  return {
    is_valid: isValid2,
    validity_score: Math.max(0, validityScore),
    conclusion: isValid2 ? "SAFE" : "REVIEW_REQUIRED",
    issues
  };
}
function verifyFactualClaims(content: any) {
  const detectedClaims: string[] = [];
  const lowerContent = content.toLowerCase();
  for (const indicator of AUTO_HOOK_CONFIG.claimIndicators) {
    if (lowerContent.includes(indicator)) {
      const idx = lowerContent.indexOf(indicator);
      const start = Math.max(0, idx - 50);
      const end = Math.min(content.length, idx + indicator.length + 100);
      detectedClaims.push(content.slice(start, end).trim());
    }
  }
  if (detectedClaims.length === 0) {
    return { verdict: "VERIFIED", confidence: 1, phi_score: 1, caveats: [] };
  }
  const caveats: string[] = [];
  let confidence = 0.7;
  if (detectedClaims.length > 3) {
    confidence -= 0.1;
    caveats.push(`Multiple claims detected (${detectedClaims.length}) - verify each`);
  }
  const hedgingWords = ["may", "might", "could", "possibly", "potentially", "some"];
  for (const word of hedgingWords) {
    if (lowerContent.includes(` ${word} `)) {
      caveats.push("Contains hedging language - claims may be uncertain");
      confidence -= 0.05;
      break;
    }
  }
  let verdict;
  if (confidence >= AUTO_HOOK_CONFIG.thresholds.phi_high) {
    verdict = "VERIFIED";
  } else if (confidence >= AUTO_HOOK_CONFIG.thresholds.phi_moderate) {
    verdict = "LIKELY";
  } else if (confidence >= 0.4) {
    verdict = "UNCERTAIN";
  } else {
    verdict = "UNVERIFIED";
    caveats.push("Low confidence - recommend additional source verification");
  }
  return {
    verdict,
    confidence: Math.max(0, confidence),
    phi_score: Math.max(0, confidence),
    caveats
  };
}
async function fireHook(hookId: string, data: any) {
  const startTime = Date.now();
  try {
    const hookContext: any = {
      operation: data.tool_name || "unknown",
      phase: "before",
      timestamp: /* @__PURE__ */ new Date(),
      target: {
        type: "calculation",
        data
      },
      metadata: { hookId, ...data }
    };
    const executorResult = await hookExecutor.execute("before" as any, hookContext).catch(() => null);
    const result = {
      hook_id: hookId,
      success: true,
      data: { logged: true, executorFired: !!executorResult, ...data },
      duration_ms: Date.now() - startTime
    };
    logHookExecution({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      hook_id: hookId,
      tool_name: data.tool_name || "unknown",
      event: data.event || "auto_fire",
      success: true,
      duration_ms: result.duration_ms,
      data: result.data
    });
    return result;
  } catch (error) {
    const result = {
      hook_id: hookId,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration_ms: Date.now() - startTime
    };
    logHookExecution({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      hook_id: hookId,
      tool_name: data.tool_name || "unknown",
      event: data.event || "auto_fire",
      success: false,
      duration_ms: result.duration_ms,
      data: { error: result.error }
    });
    return result;
  }
}
export function wrapToolWithAutoHooks(toolName: string, handler: (...a: any[]) => any) {
  if (!AUTO_HOOK_CONFIG.enabled) {
    return handler;
  }
  const wrappedHandler = async (...args: any[]) => {
    const context: any = {
      tool_name: toolName,
      inputs: args[0] || {},
      start_time: Date.now()
    };
    if (AUTO_HOOK_CONFIG.calcTools.includes(toolName)) {
      await fireHook("CALC-BEFORE-EXEC-001", {
        tool_name: toolName,
        event: "calculation:before",
        input_keys: Object.keys(context.inputs || {}).slice(0, 5)
      });
    }
    let result;
    try {
      result = await handler(...args);
      context.result = result;
    } catch (error) {
      context.error = error instanceof Error ? error : new Error(String(error));
      await fireHook("REFL-002", {
        tool_name: toolName,
        event: "error:detected",
        error: context.error.message,
        input_keys: Object.keys(context.inputs || {}).slice(0, 5)
      });
      throw error;
    }
    if (AUTO_HOOK_CONFIG.calcTools.includes(toolName)) {
      await fireHook("CALC-AFTER-EXEC-001", {
        tool_name: toolName,
        event: "calculation:after",
        input_keys: Object.keys(context.inputs || {}).slice(0, 5),
        has_result: !!context.result,
        duration_ms: Date.now() - context.start_time
      });
      const proofResult = validateSafetyProof(context);
      await fireHook("INTEL-PROOF-001", {
        tool_name: toolName,
        event: "proof:validate",
        lambda_score: proofResult.validity_score,
        is_valid: proofResult.is_valid,
        issue_count: proofResult.issues?.length || 0
      });
      if (!proofResult.is_valid && proofResult.validity_score < 0.5) {
        await fireHook("CALC-SAFETY-VIOLATION-001", {
          tool_name: toolName,
          event: "safety:violation",
          score: proofResult.validity_score,
          threshold: AUTO_HOOK_CONFIG.thresholds.lambda_min,
          issue_count: proofResult.issues?.length || 0
        });
        if (typeof result === "object" && result !== null) {
          result._safety_warning = {
            lambda_score: proofResult.validity_score,
            issues: proofResult.issues,
            recommendation: "Review calculation parameters"
          };
        }
      }
    }
    if (AUTO_HOOK_CONFIG.webTools.includes(toolName)) {
      const content = typeof result === "string" ? result : JSON.stringify(result);
      const factResult = verifyFactualClaims(content);
      await fireHook("INTEL-FACT-001", {
        tool_name: toolName,
        event: "fact:verify",
        phi_score: factResult.phi_score,
        verdict: factResult.verdict,
        caveat_count: factResult.caveats?.length || 0
      });
      if (typeof result === "object" && result !== null && factResult.caveats.length > 0) {
        result._fact_verification = {
          phi_score: factResult.phi_score,
          verdict: factResult.verdict,
          caveats: factResult.caveats
        };
      }
    }
    return result;
  };
  return wrappedHandler;
}
var DISPATCHER_HOOK_MAP = {
  // Core manufacturing
  prism_calc: { before: "before_calculation", after: "after_calculation", category: "CALC" },
  prism_safety: { before: "before_calculation", after: "after_calculation", category: "CALC" },
  prism_thread: { before: "before_calculation", after: "after_calculation", category: "CALC" },
  // Data & files
  prism_data: { before: "before_read", after: "after_read", category: "FILE" },
  prism_doc: { before: "before_write", after: "after_write", category: "FILE" },
  prism_knowledge: { before: "before_read", after: "after_read", category: "FILE" },
  // State & context
  prism_session: { before: "before_mutate", after: "after_mutate", category: "STATE" },
  prism_context: { before: "before_mutate", after: "after_mutate", category: "STATE" },
  // Orchestration & agents
  prism_orchestrate: { before: "before_spawn", after: "on_complete", category: "ORCH" },
  prism_manus: { before: "before_spawn", after: "on_complete", category: "AGENT" },
  prism_autopilot_d: { before: "before_spawn", after: "on_complete", category: "AGENT" },
  // Validation & quality
  prism_validate: { before: "before_apply", after: "after_apply", category: "FORMULA" },
  prism_omega: { before: "before_apply", after: "after_apply", category: "FORMULA" },
  prism_ralph: { before: "before_apply", after: "after_apply", category: "FORMULA" },
  // Skills, scripts, toolpath
  prism_skill_script: { before: "before_read", after: "after_read", category: "FILE" },
  prism_toolpath: { before: "before_calculation", after: "after_calculation", category: "CALC" },
  // Dev & meta
  prism_dev: { before: "before_write", after: "after_write", category: "FILE" },
  prism_gsd: { before: "before_read", after: "after_read", category: "FILE" },
  prism_sp: { before: "before_mutate", after: "after_mutate", category: "STATE" },
  prism_hook: { before: "before_mutate", after: "after_mutate", category: "STATE" },
  prism_generator: { before: "before_apply", after: "after_apply", category: "FORMULA" },
  prism_guard: { before: "before_read", after: "after_read", category: "FILE" },
  prism_atcs: { before: "before_spawn", after: "on_complete", category: "AGENT" }
};
var globalDispatchCount = 0;
var lastTodoReminder = 0;
// A7: State-aware cadence — skip TODO refresh if file unchanged, backoff interval
var _lastTodoHash = "";
var _todoInterval = 5;
var lastCheckpointReminder = 0;
var lastPressureCheck = 0;
var lastCompactionCheck = 0;
var lastAttentionCheck = 0;
var handoffFired = false;
var accumulatedResultBytes = 0;
var largestResultBytes = 0;
var totalResultCount = 0;
var currentTruncationCap = 2e4;
var firstCallReconDone = false;
var lastVariationCheck = 0;
var lastCallTimestamp = 0;
var compactionRecoveryCallsRemaining = 0;
var compactionRecoverySurvival = null;
var recentToolCalls: string[] = [];
var sessionSlimOverride: string | null = null;
var highPressureStreak = 0;
var RECENT_ACTIONS_FILE = path.join(PATHS.STATE_DIR, "RECENT_ACTIONS.json");
var STATE_DIR12 = PATHS.STATE_DIR;

// Task O: Batched flight action writes — buffer to reduce disk I/O
let _pendingActions: any[] = [];
const FLUSH_THRESHOLD = 5;

// A2: In-memory cache for RECENT_ACTIONS (avoids redundant disk reads per cadence window)
let _recentActionsCache: any[] | null = null;
let _recentActionsCacheCall = 0;
function getCachedRecentActions(callNum: number): any[] {
  if (_recentActionsCache !== null && callNum - _recentActionsCacheCall <= 2) return _recentActionsCache;
  try {
    _recentActionsCache = JSON.parse(fs.readFileSync(RECENT_ACTIONS_FILE, "utf-8")).actions || [];
  } catch { _recentActionsCache = []; }
  _recentActionsCacheCall = callNum;
  return _recentActionsCache;
}

function flushPendingActions(callNum: number): void {
  if (_pendingActions.length === 0) return;
  _recentActionsCache = null; // A2: invalidate cache on flush
  try {
    let actions: any[] = [];
    if (fs.existsSync(RECENT_ACTIONS_FILE)) {
      try {
        actions = JSON.parse(fs.readFileSync(RECENT_ACTIONS_FILE, "utf-8")).actions || [];
      } catch {}
    }
    actions.push(..._pendingActions);
    if (actions.length > MAX_RECORDED_ACTIONS) {
      actions = actions.slice(-MAX_RECORDED_ACTIONS);
    }
    fs.writeFileSync(RECENT_ACTIONS_FILE, JSON.stringify({
      updated: (/* @__PURE__ */ new Date()).toISOString(),
      session_call_count: callNum,
      actions,
      _hint: "READ THIS FIRST after compaction. Shows last 12 tool calls with results."
    }, null, 2));
    _pendingActions = [];
  } catch {
    // Flush failure is non-fatal — entries stay in buffer for next attempt
  }
}
function buildCurrentTaskDescription(cadence: any, toolName: string, action2: string) {
  const todoFocus = cadence.todo?.currentFocus || cadence.todo?.taskName;
  if (todoFocus && todoFocus !== "Initialization" && todoFocus !== "Session startup") {
    return `${todoFocus} (last: ${toolName}:${action2})`;
  }
  if (recentToolCalls.length >= 3) {
    const unique = [...new Set(recentToolCalls.slice(-5))];
    return `Working with ${unique.join(", ")} (${recentToolCalls.length} calls)`;
  }
  return `${toolName}:${action2} (call #${cadence.call_number})`;
}
var MAX_RECORDED_ACTIONS = 12;
function recordFlightAction(callNum: number, toolName: string, action2: string, params2: any, success: boolean, durationMs: number, result: any, errorMsg?: string) {
  try {
    let paramsSummary = "{}";
    try {
      const p = params2?.params || params2 || {};
      const keys = Object.keys(p);
      if (keys.length > 0) {
        paramsSummary = keys.map((k) => {
          const v = p[k];
          const vs = typeof v === "string" ? v.slice(0, 30) : JSON.stringify(v)?.slice(0, 30) || "";
          return `${k}=${vs}`;
        }).join(", ").slice(0, 120);
      }
    } catch {
    }
    let resultPreview = "";
    try {
      const text = result?.content?.[0]?.text || "";
      const parsed = JSON.parse(text);
      delete parsed._cadence;
      resultPreview = JSON.stringify(parsed).slice(0, 150);
    } catch {
      resultPreview = (result?.content?.[0]?.text || "").slice(0, 150);
    }
    const entry: any = {
      seq: callNum,
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      tool: toolName,
      action: action2,
      params_summary: paramsSummary,
      success,
      duration_ms: Math.round(durationMs),
      result_preview: resultPreview
    };
    if (errorMsg) entry.error = errorMsg.slice(0, 100);
    _pendingActions.push(entry);
    // Flush on buffer threshold or session end (call >= 41)
    if (_pendingActions.length >= FLUSH_THRESHOLD || callNum >= 41) {
      flushPendingActions(callNum);
    }
  } catch {
  }
}
export function getDispatchCount() {
  return globalDispatchCount;
}
export function resetReconFlag() {
  firstCallReconDone = false;
  compactionRecoveryCallsRemaining = 0;
  compactionRecoverySurvival = null;
  lastCallTimestamp = 0;
}
export function wrapWithUniversalHooks(toolName: string, handler: (...a: any[]) => any) {
  const wrapped = async function(this: any, ...args: any[]) {
    if (!AUTO_HOOK_CONFIG.enabled) {
      return handler.apply(this, args);
    }
    const startTime = Date.now();
    const action2 = args[0]?.action || "unknown";
    globalDispatchCount++;
    const callNum = globalDispatchCount;
    const cadence: any = { call_number: callNum, actions: [] as string[] };
    let compactionDetectedThisCall = false;
    const journalPath = path.join(STATE_DIR12, "SESSION_JOURNAL.jsonl");
    const userNotes = args[0]?.params?._notes;
    if (userNotes) {
      delete args[0].params._notes;
    }
    try {
      const entry = JSON.stringify({
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        call: callNum,
        tool: toolName,
        action: action2,
        notes: userNotes || null,
        params_hint: Object.keys(args[0]?.params || {}).filter((k) => k !== "_notes").join(",")
      }) + "\n";
      fs.appendFileSync(journalPath, entry);
      try {
        const stat3 = fs.statSync(journalPath);
        if (stat3.size > 5e4) {
          const all = fs.readFileSync(journalPath, "utf-8").trim().split("\n");
          if (all.length > 200) {
            fs.writeFileSync(journalPath, all.slice(-100).join("\n") + "\n");
          }
        }
      } catch {
      }
    } catch {
    }
    recentToolCalls.push(`${toolName}:${action2}`);
    if (recentToolCalls.length > 20) recentToolCalls = recentToolCalls.slice(-20);
    const now = Date.now();
    if (lastCallTimestamp > 0 && compactionRecoveryCallsRemaining <= 0) {
      const gapSeconds = (now - lastCallTimestamp) / 1000;
      // Only detect compaction if gap > 120s AND we're past the first few calls
      // (fresh sessions always have a large gap from previous session's last call)
      if (gapSeconds > 120 && firstCallReconDone && callNum > 3) {
        compactionDetectedThisCall = true;
        try {
          const rehydrateResult: any = autoContextRehydrate(callNum);
          if (rehydrateResult.rehydrated && rehydrateResult.survival_data) {
            const survival = rehydrateResult.survival_data;
            cadence.actions.push(`\u26A0\uFE0F COMPACTION_DETECTED: ${Math.round(gapSeconds)}s gap between calls, rehydrating from survival data`);
            cadence.rehydrated = {
              previous_task: survival.current_task,
              key_findings: survival.key_findings,
              active_files: survival.active_files,
              recent_decisions: survival.recent_decisions,
              todo_snapshot: survival.todo_snapshot?.slice(0, 500),
              quick_resume: survival.quick_resume?.slice(0, 500),
              next_action: survival.next_action || null,
              age_minutes: rehydrateResult.age_minutes
            };
            compactionRecoveryCallsRemaining = 1;
            compactionRecoverySurvival = cadence.rehydrated;
          }
        } catch {
        }
      }
    }
    lastCallTimestamp = now;
    if (!firstCallReconDone) {
      firstCallReconDone = true;
      try {
        const recon = autoPreTaskRecon(callNum);
        const warmStart = autoWarmStartData();
        await fireHook("SESSION-AUTO-BOOT-001", {
          event: "auto_session_recon",
          call_number: callNum,
          warnings_count: recon.warnings?.length || 0,
          recent_errors_count: recon.recent_errors?.length || 0,
          recurring_patterns_count: recon.recurring_patterns?.length || 0,
          registry_ready: !!warmStart?.registry_status
        });
        // KV Cache stability check — one-time at session boot
        try {
          const kvResult = autoKvCacheStabilityCheck(callNum);
          if (kvResult.issues_found > 0) {
            cadence.actions.push(`\u{1F511} KV_CACHE: score=${kvResult.stability_score}, ${kvResult.issues_found} issues`);
            cadence.kv_cache_stability = kvResult;
          }
        } catch {
        }
        // Session lifecycle start + memory graph integrity + skill preload — one-time at boot
        try { autoSessionLifecycleStart(callNum); cadence.actions.push("SESSION_LIFECYCLE_STARTED"); } catch {}
        try {
          const gResult = autoMemoryGraphIntegrity(callNum);
          if (gResult.violations > 0) cadence.actions.push(`GRAPH_INTEGRITY: ${gResult.violations} violations, ${gResult.fixed} fixed`);
        } catch {}
        try {
          const sp = autoSkillPreload(callNum);
          if (sp.preloaded) cadence.actions.push(`SKILLS_PRELOADED: ${sp.skills_count} dynamic skills`);
        } catch {}
        // Template optimizer — session boot
        try {
          const tOpt = autoTemplateOptimizer(callNum);
          if (tOpt.optimized && tOpt.tokens_saved) cadence.actions.push(`TEMPLATES_OPTIMIZED: ${tOpt.tokens_saved} tokens saved`);
        } catch {}
        // Resume detector — session boot
        try {
          const rd = autoResumeDetector(callNum);
          if (rd.scenario && rd.scenario !== "NEW_START") {
            cadence.actions.push(`RESUME_DETECTED: ${rd.scenario}${rd.actions?.length ? ` (${rd.actions.length} actions)` : ""}`);
            cadence.resume_scenario = rd;
          }
        } catch {}
        // Budget engine reset for new session
        try {
          const { ContextBudgetEngine } = await import("../engines/ContextBudgetEngine.js");
          ContextBudgetEngine.resetBudget();
        } catch {}
        let knowledgeHints: any = null;
        try {
          knowledgeHints = autoKnowledgeCrossQuery(callNum, toolName, action2, args[0]?.params || {});
          if (knowledgeHints.total_enrichments > 0) {
            cadence.actions.push(`\u{1F9E0} KNOWLEDGE_ENRICHED: ${knowledgeHints.total_enrichments} hints (${knowledgeHints.domain})`);
            cadence.knowledge_hints = knowledgeHints;
          }
        } catch {
        }
        let scriptRecs: any = null;
        try {
          scriptRecs = autoScriptRecommend(callNum, toolName, action2);
          if (scriptRecs.recommendations?.length > 0) {
            cadence.actions.push(`\u{1F4DC} SCRIPTS_AVAILABLE: ${scriptRecs.recommendations.length} relevant scripts`);
            cadence.script_recommendations = scriptRecs;
          }
        } catch {
        }
        try {
          const agentRec = autoAgentRecommend(callNum, toolName, action2, args[0]?.params || {});
          if (agentRec.hint) {
            cadence.actions.push(`\u{1F916} AGENT_REC: ${agentRec.hint}`);
            cadence.agent_recommend = agentRec;
          }
          // Auto-dispatch grouped swarm when auto_orchestrate=true (pre-call: fire-and-forget via void)
          if (agentRec.classification?.auto_orchestrate) {
            try {
              void autoGroupedSwarmDispatch(callNum, agentRec.classification, toolName, action2, args[0]?.params || {}).then(pd => {
                if (pd.dispatched) {
                  (globalThis as any).__prism_swarm_pending = {
                    result: { synthesis: pd.synthesis, groups: pd.groupCount, timedOut: pd.timedOut, mode: pd.mode },
                    injected_at: callNum,
                    remaining: 3
                  };
                }
              }).catch(() => {});
            } catch { /* non-fatal */ }
            // Write orchestration hint for AutoPilot consumption
            if (agentRec.classification?.complexity === "complex" || agentRec.classification?.complexity === "critical") {
              try {
                fs.writeFileSync(path.join(PATHS.STATE_DIR, "AUTO_ORCHESTRATE_HINT.json"), JSON.stringify({
                  ts: new Date().toISOString(),
                  call: callNum,
                  tool: toolName,
                  action: action2,
                  classification: agentRec.classification,
                  recommended_pattern: agentRec.classification.complexity === "critical" ? "consensus" : "parallel",
                }, null, 2));
                cadence.actions.push(`\u{1F3AF} AUTO_ORCHESTRATE: ${agentRec.classification.complexity} complexity → ${agentRec.classification.complexity === "critical" ? "consensus" : "parallel"} pattern`);
              } catch {}
            }
          }
        } catch {
        }
        let rehydrated: any = null;
        try {
          const rehydrateResult: any = autoContextRehydrate(callNum);
          if (rehydrateResult.rehydrated && rehydrateResult.survival_data) {
            rehydrated = rehydrateResult.survival_data;
            cadence.actions.push(`\u{1F504} CONTEXT_REHYDRATED: from ${rehydrated.session_id} (${rehydrateResult.age_minutes}min ago, was at ${rehydrated.pressure_pct}% pressure)`);
            cadence.rehydrated = {
              previous_task: rehydrated.current_task,
              key_findings: rehydrated.key_findings,
              active_files: rehydrated.active_files,
              recent_decisions: rehydrated.recent_decisions,
              todo_snapshot: rehydrated.todo_snapshot?.slice(0, 500),
              quick_resume: rehydrated.quick_resume?.slice(0, 500),
              next_action: rehydrated.next_action || null,
              age_minutes: rehydrateResult.age_minutes
            };
            const isLegitBoot = action2 === "session_boot";
            // Only trigger compaction if survival data is fresh AND we're past call 3
            // (calls 1-3 of any new session always see "fresh" survival from last session)
            if (rehydrateResult.age_minutes < 30 && !isLegitBoot && callNum > 3) {
              compactionRecoveryCallsRemaining = 1;
              compactionRecoverySurvival = cadence.rehydrated;
              compactionDetectedThisCall = true;
              cadence.actions.push("\u26A0\uFE0F RECOVERY_TRIGGERED: Fresh survival data found on server start \u2014 likely post-compaction");
            }
          }
        } catch {
        }
        // Load superpowers on session boot
        let superpowerResult: any = null;
        try {
          superpowerResult = autoSuperpowerBoot(callNum);
          if (superpowerResult.loaded > 0) {
            cadence.actions.push(`\u{1F9B8} SUPERPOWERS: ${superpowerResult.loaded}/${superpowerResult.total_superpowers} loaded on session boot`);
            cadence.superpowers = superpowerResult;
            for (let i = 0; i < superpowerResult.loaded; i++) recordSessionSkillInjection();
          }
        } catch { /* non-fatal */ }

        // === NEW AUTO-FIRES: Session boot (Opp 1,2,3,9,10,11,17) ===
        try {
          const compAudit = autoComplianceAuditBoot(callNum);
          if (compAudit.gaps_found > 0) cadence.actions.push(`📋 COMPLIANCE_BOOT: ${compAudit.templates_audited} templates, ${compAudit.gaps_found} gaps`);
        } catch {}
        try {
          const slb = autoSLBConsume(callNum);
          if (slb.patterns_consumed > 0) cadence.actions.push(`🔄 SLB_CONSUMED: ${slb.patterns_consumed} patterns`);
        } catch {}
        try {
          const bridge = autoBridgeHealthCheck(callNum);
          if (bridge.degraded > 0) cadence.actions.push(`⚠️ BRIDGE_DEGRADED: ${bridge.degraded}/${bridge.endpoints_checked} endpoints`);
          else if (bridge.endpoints_checked > 0) cadence.actions.push(`✅ BRIDGE_HEALTHY: ${bridge.endpoints_checked} endpoints`);
        } catch {}
        try {
          const omRestore = autoOmegaHistoryRestore(callNum);
          if (omRestore.entries_restored > 0) cadence.actions.push(`📊 OMEGA_HISTORY_RESTORED: ${omRestore.entries_restored} entries`);
        } catch {}
        try {
          const cogRestore = autoCognitiveStateRestore(callNum);
          if (cogRestore.restored) cadence.actions.push("🧠 COGNITIVE_STATE_RESTORED");
        } catch {}
        try {
          const kwResult = autoKnowledgePreWarm(callNum);
          if (kwResult.warmed) cadence.actions.push("🔥 KNOWLEDGE_ENGINE_PREWARMED");
        } catch {}

        globalThis.__prism_recon = {
          recon: recon.warnings,
          warmStart: warmStart.session_info,
          knowledge: knowledgeHints?.total_enrichments ? knowledgeHints : undefined,
          scripts: scriptRecs?.recommendations?.length ? scriptRecs : undefined,
          rehydrated: rehydrated ? cadence.rehydrated : undefined,
          superpowers: superpowerResult?.loaded ? superpowerResult : undefined,
        };
      } catch {
      }
    }
    // GAP A: Pre-dispatch routing pattern match
    let preDispatchPattern: PatternMatchResult | null = null;
    try {
      preDispatchPattern = autoPatternMatch(callNum, toolName, action2, args[0]?.params || {}, undefined, "task-routing");
      if (preDispatchPattern.matched) {
        cadence.actions.push(`🧭 PATTERN_ROUTE: ${preDispatchPattern.pattern_id} (${(preDispatchPattern.confidence * 100).toFixed(0)}%) → ${preDispatchPattern.suggested_action}`);
      }
    } catch { /* non-fatal */ }

    await fireHook("DISPATCH-ACTION-VALIDATE-001", {
      tool_name: toolName,
      action: action2,
      event: "before_dispatch",
      call_number: callNum,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    const mapping = DISPATCHER_HOOK_MAP[toolName];
    if (mapping) {
      await fireHook(`${mapping.category}-BEFORE-EXEC-001`, {
        tool_name: toolName,
        action: action2,
        event: mapping.before,
        category: mapping.category
      });
    }
    if (mapping?.category === "AGENT" || mapping?.category === "ORCH") {
      try {
        const domainPhase = mapping.category === "ORCH" ? "pre-swarm-execute" : "pre-agent-execute";
        await hookExecutor.execute(domainPhase as any, {
          operation: action2,
          target: { type: "dispatcher" as any, id: `${toolName}:${action2}` },
          metadata: {
            dispatcher: toolName,
            action: action2,
            call_number: callNum,
            ...args[0]?.params || {}
          }
        });
      } catch {
      }
    }
    let inputBlocked = false;
    try {
      const inputVal: any = autoInputValidation(callNum, toolName, action2, args[0]?.params || {});
      if (inputVal.warnings.length > 0) {
        cadence.input_validation = inputVal;
        const criticalCount = inputVal.warnings.filter((w: any) => w.severity === "critical").length;
        if (criticalCount > 0) {
          cadence.actions.push(`\u26A0\uFE0F INPUT_WARNINGS: ${criticalCount} critical, ${inputVal.warnings.length} total`);
        } else {
          cadence.actions.push(`\u{1F4CB} INPUT_CHECKED: ${inputVal.warnings.length} advisory warnings`);
        }
        if (inputVal.blocked) {
          inputBlocked = true;
          cadence.actions.push(`\u{1F6D1} INPUT_BLOCKED: ${inputVal.block_reason}`);
          await fireHook("CALC-SAFETY-VIOLATION-001", {
            event: "input_validation_blocked",
            tool_name: toolName,
            action: action2,
            block_reason: inputVal.block_reason,
            warnings: inputVal.warnings
          });
        }
      }
    } catch {
    }
    let result;
    let error = null;
    if (inputBlocked) {
      const valData = cadence.input_validation;
      result = {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: `\u{1F6D1} SAFETY BLOCK: ${valData?.block_reason || "Input validation failed"}`,
            warnings: valData?.warnings || [],
            guidance: "Fix the flagged parameters and retry.",
            _cadence: { c: cadence.call_number }
          })
        }]
      };
    } else {
      // === PFP PRE-FILTER (B1) ===
      let pfpBlocked = false;
      let pfpAssessment: any = null;
      try {
        pfpAssessment = pfpEngine.assessRisk(toolName, action2, args[0]?.params || {}, 0, callNum);
        if (pfpAssessment && pfpAssessment.riskLevel === 'RED' && pfpAssessment.recommendation === 'PRE_FILTER') {
          pfpBlocked = true;
          cadence.actions.push(`??? PFP_BLOCKED: ${toolName}:${action2} risk=${(pfpAssessment.riskScore * 100).toFixed(0)}% (${pfpAssessment.matchedPatterns?.length || 0} patterns)`);
        } else if (pfpAssessment && pfpAssessment.riskLevel === 'YELLOW') {
          cadence.actions.push(`?? PFP_WARNING: ${toolName}:${action2} risk=${(pfpAssessment.riskScore * 100).toFixed(0)}%`);
        }
      } catch { /* PFP failure = proceed normally (fail-open) */ }

      if (pfpBlocked) {
        result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: `??? PFP PRE-FILTER BLOCK: High failure probability for ${toolName}:${action2}`,
              risk_score: pfpAssessment?.riskScore,
              matched_patterns: pfpAssessment?.matchedPatterns?.length || 0,
              guidance: "This action has a high historical failure rate. Review parameters and retry.",
              _cadence: { c: cadence.call_number }
            })
          }]
        };
      } else {
            const cacheKey = `${toolName}:${action2}`;
      const cacheResult = computationCache.get(cacheKey, args[0]?.params || args[0] || {});
      if (cacheResult.hit) {
        result = cacheResult.value;
        cadence.actions.push(`\u26A1 CACHE_HIT: ${cacheKey} (${cacheResult.tier} tier)`);
      } else {
          // Opp 19: Pre-enrich calc dispatchers with material+machine context
          if (toolName === "prism_calc" && ["speed_feed_calc", "cutting_force", "tool_life", "speed_feed"].includes(action2)) {
            try {
              const enrichResult = autoCalcPreEnrich(callNum, args[0]?.params || {});
              if (enrichResult.enriched) {
                cadence.material_context = enrichResult.material_context;
                cadence.machine_context = enrichResult.machine_context;
                cadence.actions.push("🔧 CALC_PRE_ENRICHED");
              }
            } catch {}
          }
        try {
          result = await handler.apply(this, args);
            // FIX 5: Slim main tool response based on pressure
            try { const _sl = getSlimLevel(getCurrentPressurePct()); if (_sl !== "NORMAL") { const txt = result?.content?.[0]?.text; if (txt) { try { const _p = JSON.parse(txt); result.content[0].text = JSON.stringify(slimJsonResponse(_p, _sl)); } catch {} } } } catch {}
          if (!error) {
            try {
              computationCache.set(cacheKey, args[0]?.params || args[0] || {}, result);
            } catch {
            }
          }
        } catch (err3: any) {
          error = err3;
          await fireHook("REFL-002", {
            tool_name: toolName,
            action: action2,
            event: "error_detected",
            error_message: err3.message,
            stack: err3.stack?.slice(0, 500),
            call_number: callNum
          });
          try {
            const learnResult = autoErrorLearn(callNum, toolName, action2, err3.message, args[0] || {});
            if (learnResult.pattern_matched && learnResult.prevention) {
              await fireHook("REFL-002-PREVENTION", {
                event: "known_pattern_detected",
                pattern_id: learnResult.pattern_id,
                prevention: learnResult.prevention,
                occurrences: learnResult.occurrences
              });
            }
            // GAP B: Create PATTERN node + TRIGGERED edge in memory graph
            if (learnResult.pattern_id && learnResult.occurrences >= 2) {
              try {
                const { memoryGraphEngine: mge } = await import("../engines/MemoryGraphEngine.js");
                // Find recent ERROR node for this dispatcher
                const errorNodes = (mge as any).index?.nodesByType?.ERROR || [];
                const recentErrorId = errorNodes.length > 0 ? errorNodes[errorNodes.length - 1] : undefined;
                mge.createPatternFromError(
                  process.env.SESSION_ID || "unknown",
                  learnResult.pattern_matched ? "error-recovery" : "error-new",
                  `${toolName}:${action2} — ${err3.message.slice(0, 150)}`,
                  0.5 + Math.min(0.3, (learnResult.occurrences || 1) * 0.05),
                  learnResult.occurrences || 1,
                  recentErrorId
                );
              } catch { /* graph wiring non-fatal */ }
            }
          } catch {
          }
          try {
            const d3Result: any = autoD3ErrorChain(callNum, toolName, action2, err3.message);
            if (d3Result.success && d3Result.pattern) {
              cadence.actions.push(`\u{1F9E0} D3_ERROR_LEARNED: ${JSON.stringify(d3Result.pattern).slice(0, 60)}`);
            }
          } catch {
          }
          // GAP A: Post-error recovery pattern match
          try {
            const errPattern = autoPatternMatch(callNum, toolName, action2, args[0]?.params || {}, err3.message, "error-recovery");
            if (errPattern.matched) {
              cadence.actions.push(`🩹 PATTERN_RECOVER: ${errPattern.pattern_id} (${(errPattern.confidence * 100).toFixed(0)}%) → ${errPattern.suggested_action}`);
              cadence.error_pattern = errPattern;
            }
          } catch { /* non-fatal */ }
          // Opp 6: PFP re-extract after error chain
          try { pfpEngine.extractPatterns?.(); } catch {}
          try {
            await hookExecutor.execute("on-error", {
              operation: action2,
              target: { type: "tool" as any, id: `${toolName}:${action2}` },
              metadata: { dispatcher: toolName, action: action2, call_number: callNum, error_message: err3.message, duration_ms: Date.now() - startTime }
            });
          } catch {
          }
        }
      }
    }
    } // end PFP else block
        const durationMs = Date.now() - startTime;
    // === PFP OUTCOME RECORDING (B1) ===
    try {
      const pfpOutcome = error ? 'failure' : 'success';
      pfpEngine.recordAction(toolName, action2, pfpOutcome as any, durationMs, (error as any)?.constructor?.name, args[0]?.params || {});
    } catch { /* PFP recording failure is non-fatal */ }
    await fireHook("DISPATCH-PERF-TRACK-001", {
      tool_name: toolName,
      action: action2,
      event: "after_dispatch",
      duration_ms: durationMs,
      success: !error,
      call_number: callNum
    });
    try {
      const telemetryStartMs = startTime;
      const telemetryEndMs = startTime + durationMs;
      const outcome = error ? "failure" : result?.content?.[0]?.text?.includes('"blocked":true') ? "blocked" : "success";
      const errorClass = error ? (error as any)?.constructor?.name || "UnknownError" : undefined;
      const payloadSize = result?.content?.[0]?.text?.length || 0;
      const pressurePct = cadence.pressure?.pressure_pct ?? 0;
      (telemetryEngine as any)?.record(
        toolName,
        action2,
        telemetryStartMs,
        telemetryEndMs,
        outcome,
        errorClass,
        payloadSize,
        pressurePct
      );
      (telemetryEngine as any)?.recordWrapperOverhead(durationMs < 1 ? 0 : 0.1);
    } catch {
    }
    try {
      const { memoryGraphEngine: memoryGraphEngine2 } = await import("../engines/MemoryGraphEngine.js");
      const paramsSummary = typeof (args as any).params === "object" ? JSON.stringify((args as any).params).slice(0, 200) : String((args as any).params || "").slice(0, 200);
      const resultSummary = result?.content?.[0]?.text?.slice(0, 200) || "";
      const errorClass = error ? (error as any)?.constructor?.name || "UnknownError" : undefined;
      memoryGraphEngine2.captureDispatch(
        process.env.SESSION_ID || "unknown",
        toolName,
        action2,
        paramsSummary,
        !error,
        durationMs,
        resultSummary,
        errorClass
      );
    } catch {
    }
    // GAP A: Update pattern stats if a routing pattern was matched pre-dispatch
    try {
      if (preDispatchPattern?.matched && preDispatchPattern.pattern_id) {
        autoPatternStatsUpdate(preDispatchPattern.pattern_id, !error);
      }
    } catch { /* non-fatal */ }
    // H1-MS4: Auto-capture decisions for high-value actions
    logDecisionIfApplicable(toolName, action2, args, result, error, durationMs);
    try {
      const { certificateEngine: certificateEngine2 } = await import("../engines/CertificateEngine.js");
      const validationSteps: any[] = [];
      if (mapping) {
        validationSteps.push({
          hookId: `${mapping.category}-BEFORE-EXEC-001`,
          hookName: `${mapping.before} pre-hook`,
          category: mapping.category,
          result: error ? "block" : "pass",
          timestamp: startTime,
          durationMs
        });
      }
      const safetyScore = cadence.pressure?.safety_score ?? 0.85;
      certificateEngine2.generateCertificate(
        toolName,
        action2,
        process.env.SESSION_ID || "unknown",
        validationSteps,
        safetyScore,
        undefined,
        // omegaScore computed separately
        { params_summary: (typeof (args as any).params === "object" ? JSON.stringify((args as any).params) : "").slice(0, 100) }
      );
    } catch {
    }
    // Auto-persist certificates for safety-critical actions to disk audit trail
    if (!error && ["cutting_force", "tool_life", "speed_feed", "speed_feed_calc", "safety", "stability"].includes(action2)) {
      try {
        const certDir = path.join(PATHS.STATE_DIR, "certificates");
        if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
        const certFile = path.join(certDir, `CERT-${toolName}-${action2}-${Date.now()}.json`);
        const certData = {
          type: "safety_critical_audit",
          dispatcher: toolName,
          action: action2,
          call_number: callNum,
          timestamp: new Date().toISOString(),
          duration_ms: durationMs,
          safety_score: cadence.pressure?.safety_score ?? null,
          input_hash: typeof args[0]?.params === "object" ? JSON.stringify(args[0].params).length : 0,
          result_hash: result?.content?.[0]?.text?.length || 0,
          session: process.env.SESSION_ID || "unknown",
        };
        fs.writeFileSync(certFile, JSON.stringify(certData, null, 2));
        // Keep max 50 cert files
        const certFiles = fs.readdirSync(certDir).filter(f => f.startsWith("CERT-")).sort();
        if (certFiles.length > 50) {
          for (const old of certFiles.slice(0, certFiles.length - 50)) {
            try { fs.unlinkSync(path.join(certDir, old)); } catch {}
          }
        }
      } catch { /* cert persistence non-fatal */ }
    }
    if (mapping) {
      await fireHook(`${mapping.category}-AFTER-EXEC-001`, {
        tool_name: toolName,
        action: action2,
        event: mapping.after,
        duration_ms: durationMs,
        success: !error
      });
    }
    if (!error) {
      try {
        const lkgResult = autoD3LkgUpdate(callNum, toolName, action2, durationMs);
        if (lkgResult.success) {
          cadence.actions.push(`\u2705 D3_LKG_UPDATED: ${toolName}:${action2}`);
        }
      } catch {
      }
      // Opp 7: Auto-acknowledge resolved telemetry anomalies
      try {
        const telResolve = autoTelemetryResolve(callNum, toolName, action2);
        if (telResolve.resolved > 0) cadence.actions.push(`📉 ANOMALY_RESOLVED: ${telResolve.resolved} for ${toolName}:${action2}`);
      } catch {}
    }
    if (toolName === "prism_dev" && action2 === "build" && !error) {
      try {
        const resultText = result?.content?.[0]?.text;
        if (typeof resultText === "string" && resultText.includes("SUCCESS")) {
          cadence.actions.push("\u2705 BUILD_SUCCESS \u2014 Phase checklist REQUIRED: skills\u2192hooks\u2192GSD\u2192memories\u2192orchestrators\u2192state\u2192scripts");
          cadence.actions.push("\u26A0\uFE0F RESTART REQUIRED: New build must be loaded. Restart Claude app or the changes won't take effect. Current session still runs OLD code.");
          const checklistPath = path.join(PATHS.STATE_DIR, "build_checklist.json");
          fs.writeFileSync(checklistPath, JSON.stringify({
            build_at: (/* @__PURE__ */ new Date()).toISOString(),
            build_call: callNum,
            completed: { skills: false, hooks: false, gsd: false, memories: false, orchestrators: false, state: false, scripts: false }
          }, null, 2));
          try {
            const syncOut = execSync(`py -3 "${path.join(PATHS.SCRIPTS_CORE, "gsd_sync_v2.py")}" --apply --json`, {
              encoding: "utf-8",
              timeout: 15e3,
              cwd: PATHS.SCRIPTS_CORE
            }).trim();
            const syncResult = JSON.parse(syncOut);
            if (syncResult.changed) {
              cadence.actions.push(`\u{1F4CA} GSD_SYNC: ${syncResult.changes?.length || 0} changes applied`);
            }
          } catch {
          }
        }
      } catch {
      }
    }
    if (toolName === "prism_safety" && result) {
      try {
        const resultText = typeof result?.content?.[0]?.text === "string" ? JSON.parse(result.content[0].text) : null;
        if (resultText?.safety_score !== undefined && resultText.safety_score < 0.7) {
          await fireHook("CALC-SAFETY-VIOLATION-001", {
            tool_name: toolName,
            action: action2,
            event: "safety_violation",
            safety_score: resultText.safety_score,
            HARD_BLOCK: true
          });
        }
      } catch {
      }
    }
    if (!error && result?.content?.[0]?.text) {
      try {
        const txt = result.content[0].text;
        const parsed = typeof txt === "string" ? JSON.parse(txt) : null;
        if (parsed) {
          let scoreField: string | null = null;
          let scoreValue: any = null;
          if (toolName === "prism_omega" && action2 === "compute" && parsed.omega !== undefined) {
            scoreField = "omega_score";
            scoreValue = parsed.omega;
          }
          if (toolName === "prism_validate" && action2 === "safety" && parsed.safety_score !== undefined) {
            scoreField = "safety_score";
            scoreValue = parsed.safety_score;
          }
          if (toolName === "prism_safety" && parsed.safety_score !== undefined) {
            scoreField = "safety_score";
            scoreValue = parsed.safety_score;
          }
          // Opp 12: Ralph → Omega/Safety score feed
          if (toolName === "prism_ralph") {
            try {
              const ralphCapture = autoRalphScoreCapture(callNum, txt);
              if (ralphCapture.quality_score !== null) { scoreField = "omega_score"; scoreValue = ralphCapture.quality_score; }
              if (ralphCapture.safety_score !== null && !scoreField) { scoreField = "safety_score"; scoreValue = ralphCapture.safety_score; }
            } catch {}
          }
          if (scoreField && scoreValue !== null) {
            const stateFile = path.join(PATHS.STATE_DIR, "CURRENT_STATE.json");
            if (fs.existsSync(stateFile)) {
              const state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
              state.currentSession = state.currentSession || {};
              state.currentSession.progress = state.currentSession.progress || {};
              state.currentSession.progress[scoreField] = scoreValue;
              state.currentSession.progress[`${scoreField}_at`] = (/* @__PURE__ */ new Date()).toISOString();
              state.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
              fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
            }
          }
        }
      } catch {
      }
    }
    if (!error) {
      try {
        await hookExecutor.execute("on-outcome", {
          operation: action2,
          target: { type: "tool" as any, id: `${toolName}:${action2}` },
          metadata: { dispatcher: toolName, action: action2, call_number: callNum, duration_ms: durationMs, success: true }
        });
      } catch {
      }
      if (mapping?.category === "AGENT" || mapping?.category === "ORCH") {
        try {
          const domainPhase = mapping.category === "ORCH" ? "post-swarm-complete" : "post-agent-execute";
          await hookExecutor.execute(domainPhase as any, {
            operation: action2,
            target: { type: "dispatcher" as any, id: `${toolName}:${action2}` },
            metadata: {
              dispatcher: toolName,
              action: action2,
              call_number: callNum,
              duration_ms: durationMs,
              success: true,
              ...args[0]?.params || {}
            }
          });
        } catch {
        }
      }
    }
    let resultBytes = 0;
    try {
      const resultText = result?.content?.[0]?.text;
      if (typeof resultText === "string") resultBytes = resultText.length;
    } catch {
    }
    const MAX_RESULT_BYTES = currentTruncationCap;
    if (resultBytes > MAX_RESULT_BYTES && result?.content?.[0]?.text) {
      try {
        const fullText = result.content[0].text;
        const extDir = path.join(PATHS.STATE_DIR, "externalized");
        if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });
        const extFile = path.join(extDir, `result_${toolName}_${action2}_${Date.now()}.json`);
        fs.writeFileSync(extFile, fullText);
        const parsed = JSON.parse(fullText);
        const truncated = {
          _truncated: true,
          _original_bytes: resultBytes,
          _externalized_to: extFile,
          _kept_keys: Object.keys(parsed).slice(0, 5),
          _message: `Result truncated from ${Math.round(resultBytes / 1024)}KB to stay under 20KB cap. Full data saved to disk.`,
          // Keep error/status fields if present
          ...parsed.error ? { error: parsed.error } : {},
          ...parsed.status ? { status: parsed.status } : {},
          ...parsed.success !== undefined ? { success: parsed.success } : {},
          // Keep first 2 items if result is an array-like structure
          ...parsed.results ? { results_preview: parsed.results.slice(0, 2), total_results: parsed.results.length } : {},
          ...parsed.materials ? { materials_preview: parsed.materials.slice(0, 2), total_materials: parsed.materials.length } : {}
        };
        result.content[0].text = JSON.stringify(truncated, null, 2);
        resultBytes = result.content[0].text.length;
        await fireHook("CONTEXT-TRUNCATE-001", {
          event: "result_auto_truncated",
          tool_name: toolName,
          action: action2,
          original_bytes: fullText.length,
          truncated_bytes: resultBytes,
          externalized_to: extFile,
          call_number: callNum
        });
      } catch {
      }
    }
    if (resultBytes > 2e3 && result?.content?.[0]?.text) {
      try {
        const pPct = getCurrentPressurePct();
        if (pPct >= 50) {
          const slimmed = slimJsonResponse(result.content[0].text, getSlimLevel(pPct));
          if (slimmed.length < resultBytes) {
            resultBytes = slimmed.length;
            result.content[0].text = slimmed;
          }
        }
      } catch {
      }
    }
    // L0-P1-MS1: DSL compression — apply abbreviations when dsl_mode is enabled
    if (result?.content?.[0]?.text && resultBytes > 500) {
      try {
        const dslStateFile = path.join(STATE_DIR12, "CURRENT_STATE.json");
        if (fs.existsSync(dslStateFile)) {
          const dslState = JSON.parse(fs.readFileSync(dslStateFile, "utf-8"));
          if (dslState?.dsl_mode?.enabled) {
            const compacted = compactJsonValues(result.content[0].text);
            if (compacted.length < resultBytes) {
              result.content[0].text = compacted;
              resultBytes = compacted.length;
            }
          }
        }
      } catch { /* DSL compression failure is non-fatal */ }
    }
    accumulatedResultBytes += resultBytes;
    totalResultCount++;
    if (resultBytes > largestResultBytes) largestResultBytes = resultBytes;
    const avgResultBytes = totalResultCount > 0 ? Math.round(accumulatedResultBytes / totalResultCount) : 0;
    // Budget tracking — every call
    try {
      const budgetResult = autoBudgetTrack(callNum, toolName, action2, resultBytes);
      if (budgetResult.over_budget) {
        cadence.actions.push(`\u{1F4B8} OVER_BUDGET: ${budgetResult.category} at ${budgetResult.utilization_pct}%`);
      }
      cadence.budget = budgetResult;
    } catch {}
    // Dispatcher byte tracking — every call
    try {
      autoDispatcherByteTrack(callNum, toolName, resultBytes);
    } catch {}
    // Index staleness detection — flag when Write/Edit touches a tracked MCP source file
    try {
      const editedFile = args[0]?.file_path || args[0]?.path || "";
      if (typeof editedFile === "string" && editedFile.length > 0) {
        const { isStale } = await import("../engines/MasterIndexGenerator.js");
        if (isStale(editedFile)) {
          (globalThis as any).__prism_index_stale = true;
        }
      }
    } catch { /* non-fatal */ }
    let classifiedDomain;
    // Post-result grouped swarm dispatch — ALL dispatchers (removed MFG-only gate)
    if (!error) {
      try {
        const agentRec = autoAgentRecommend(callNum, toolName, action2, args[0]?.params || {});
        if (agentRec.hint) {
          cadence.actions.push(`\u{1F916} AGENT_REC: ${agentRec.hint}`);
          cadence.agent_recommend = agentRec;
        }
        classifiedDomain = agentRec.classification?.domain;
        // Auto-dispatch grouped swarm — await for inline synthesis
        if (agentRec.classification?.auto_orchestrate) {
          try {
            const pd = await autoGroupedSwarmDispatch(callNum, agentRec.classification, toolName, action2, args[0]?.params || {});
            if (pd.dispatched) {
              const label = pd.groupCount && pd.groupCount > 1
                ? `\u{26A1} SWARM_GROUPS: ${pd.groupCount} groups (${pd.agents?.length} agents)`
                : `\u{26A1} PARALLEL_DISPATCH: ${pd.mode} \u{2192} [${pd.agents?.join(", ")}]`;
              cadence.actions.push(label);
              cadence.parallel_dispatch = pd;
              if (pd.synthesis && pd.synthesis.length > 0) {
                cadence.swarm_results = { synthesis: pd.synthesis, groups: pd.groupCount, timedOut: pd.timedOut };
              }
            }
          } catch { /* non-fatal */ }
          // Write orchestration hint for AutoPilot consumption
          if (agentRec.classification?.complexity === "complex" || agentRec.classification?.complexity === "critical") {
            try {
              fs.writeFileSync(path.join(PATHS.STATE_DIR, "AUTO_ORCHESTRATE_HINT.json"), JSON.stringify({
                ts: new Date().toISOString(),
                call: callNum,
                tool: toolName,
                action: action2,
                classification: agentRec.classification,
                recommended_pattern: agentRec.classification.complexity === "critical" ? "consensus" : "parallel",
              }, null, 2));
              cadence.actions.push(`\u{1F3AF} AUTO_ORCHESTRATE: ${agentRec.classification.complexity} complexity \u{2192} ${agentRec.classification.complexity === "critical" ? "consensus" : "parallel"} pattern`);
            } catch {}
          }
        }
      } catch {
      }
      try {
        const skillHint = autoSkillHint(callNum, toolName, action2, args[0]?.params || {}, classifiedDomain);
        if (skillHint.hints.length > 0) {
          cadence.actions.push(`\u{1F4A1} SKILL_HINTS: ${skillHint.hints.length} from [${skillHint.skill_ids.join(", ")}]`);
          cadence.skill_hints = skillHint;
        }
      } catch {
      }
    }
    if (!error && ["prism_calc", "prism_safety", "prism_thread", "prism_data", "prism_atcs"].includes(toolName)) {
      try {
        const kq = autoKnowledgeCrossQuery(callNum, toolName, action2, args[0]?.params || {});
        if (kq.total_enrichments > 0) {
          cadence.actions.push(`\u{1F9E0} KNOWLEDGE: ${kq.total_enrichments} enrichments (${kq.domain})`);
          cadence.knowledge = kq;
        }
      } catch {
      }
    }
    if (!error && ["prism_calc", "prism_data", "prism_safety", "prism_thread", "prism_toolpath"].includes(toolName)) {
      try {
        const pressurePct = getCurrentPressurePct();
        const resultStr = typeof result === "string" ? result : JSON.stringify(result);
        const templateMatch: any = autoResponseTemplate(toolName, action2, resultStr, pressurePct);
        if (templateMatch) {
          cadence.actions.push(`\u{1F4CB} TEMPLATE: ${templateMatch.template_id} (${templateMatch.size_level})`);
          cadence.response_template = templateMatch;
        }
      } catch {
      }
    }
    if (callNum - lastTodoReminder >= _todoInterval) {
      lastTodoReminder = callNum;
      // A7: Check if TODO file actually changed before full refresh
      let todoChanged = true;
      try {
        const tp = path.join(PATHS.STATE_DIR, "TODO.md");
        const content = fs.existsSync(tp) ? fs.readFileSync(tp, "utf-8") : "";
        const hash = content.length + ":" + content.slice(0, 200);
        if (hash === _lastTodoHash) { todoChanged = false; _todoInterval = Math.min(_todoInterval + 2, 15); }
        else { _lastTodoHash = hash; _todoInterval = 5; }
      } catch {}
      const todoResult = todoChanged ? autoTodoRefresh(callNum) : { success: true, skipped: true, todo_preview: "(unchanged)" };
      cadence.actions.push(todoResult.success ? (todoChanged ? "TODO_AUTO_REFRESHED" : "TODO_SKIP_UNCHANGED") : "TODO_REFRESH_FAILED");
      cadence.todo = todoResult;
      // H1: Also write HOT_RESUME at todo cadence (every 5 calls, skip when every-10 will overwrite)
      if (callNum % 10 !== 0) try {
        const hrPath5 = path.join(PATHS.STATE_DIR, "HOT_RESUME.md");
        const cpPath5 = path.join(PATHS.MCP_SERVER, "data", "docs", "roadmap", "CURRENT_POSITION.md");
        let pos5 = ""; try { pos5 = fs.existsSync(cpPath5) ? fs.readFileSync(cpPath5, "utf-8").slice(0, 1500) : ""; } catch {}
        let errs5 = ""; try { const ep = path.join(PATHS.STATE_DIR, "ERROR_LOG.jsonl"); if (fs.existsSync(ep)) { const el = fs.readFileSync(ep, "utf-8").trim().split("\n").filter(Boolean).slice(-3); errs5 = el.map(l => { try { const e = JSON.parse(l); return `${e.tool_name}:${e.action} — ${(e.error_message||"").slice(0,80)}`; } catch { return ""; }}).filter(Boolean).join(" | "); } } catch {}
        const ra5 = (() => { try { const merged = [...getCachedRecentActions(callNum), ..._pendingActions]; return merged.slice(-8).map((a: any) => `${a.tool}:${a.action} ${a.success?"✓":"✗"} ${a.duration_ms}ms`).join("\n") || ""; } catch { return ""; } })();
        fs.writeFileSync(hrPath5, `# HOT_RESUME (auto call ${callNum} — ${new Date().toISOString()})\n\n## Position\n${pos5}\n\n## Recent\n${ra5}\n${errs5 ? "\n## Errors\n" + errs5 + "\n" : ""}\n## Recovery\nContinue task above. Transcripts: /mnt/transcripts/\n`);
      } catch {}
      await fireHook("STATE-SESSION-BOUNDARY-001", {
        event: "cadence_todo_executed",
        call_number: callNum,
        success: todoResult.success,
        preview: todoResult.todo_preview
      });
      // Recovery manifest moved to every-10 checkpoint block (dedup)
      // A3: Short-circuit non-critical cadence at high pressure (>75%)
      if (getCurrentPressurePct() < 75) {
        // Learning query — every 5 calls (read back learned patterns)
        try {
          const lq = autoLearningQuery(callNum, toolName, action2);
          if (lq.matches > 0) {
            cadence.actions.push(`\u{1F4D6} LEARNING: ${lq.matches} lessons for ${toolName}:${action2}`);
            cadence.learning = lq;
          }
        } catch {}
        // Attention anchor — every 5 calls (structured goal hierarchy)
        try {
          const anchor = autoAttentionAnchor(callNum);
          if (anchor.anchor) {
            cadence.actions.push(`\u{1F3AF} ANCHOR: ${anchor.anchor.slice(0, 100)}`);
            cadence.attention_anchor = anchor;
          }
        } catch {}
      }
    }
    if (callNum - lastCheckpointReminder >= 10) {
      lastCheckpointReminder = callNum;
      // A4: Read ERROR_LOG once, share between HOT_RESUME and cognitive update
      let _errLogLines: string[] = [];
      try { const ep = path.join(PATHS.STATE_DIR, "ERROR_LOG.jsonl"); if (fs.existsSync(ep)) _errLogLines = fs.readFileSync(ep, "utf-8").trim().split("\n").filter(Boolean); } catch {}
      const cpResult = autoCheckpoint(callNum);
      cadence.actions.push(cpResult.success ? `CHECKPOINT_AUTO_SAVED:${cpResult.checkpoint_id}` : "CHECKPOINT_FAILED");
          // TOKEN OPT v2: Write HOT_RESUME.md at checkpoint cadence
          try {
            const hrPath = path.join(PATHS.STATE_DIR, "HOT_RESUME.md");
            const cpPath = path.join(PATHS.MCP_SERVER, "data", "docs", "roadmap", "CURRENT_POSITION.md");
            let positionContent = "";
            try { positionContent = fs.existsSync(cpPath) ? fs.readFileSync(cpPath, "utf-8").slice(0, 1500) : ""; } catch {}
            // A4: Reuse shared _errLogLines instead of re-reading
            let recentErrors = "";
            try {
              const errs = _errLogLines.slice(-3).map(l => { try { const e = JSON.parse(l); return `${e.tool_name}:${e.action} — ${(e.error_message||"").slice(0,80)}`; } catch { return ""; } }).filter(Boolean);
              if (errs.length) recentErrors = "Recent errors: " + errs.join(" | ");
            } catch {}
            const hotContent = [
              "# HOT_RESUME (auto-generated call " + callNum + " — " + new Date().toISOString() + ")",
              "",
              "## Position",
              positionContent,
              "",
              "## Recent Activity",
              (() => { try { const merged = [...getCachedRecentActions(callNum), ..._pendingActions]; return merged.slice(-8).map((a: any) => `${a.tool}:${a.action} ${a.success?"✓":"✗"} ${a.duration_ms}ms`).join("\n"); } catch { return "unavailable"; } })(),
              "",
              recentErrors ? "## Errors\n" + recentErrors + "\n" : "",
              "## Recovery",
              "Continue the task in Position above. Do NOT re-audit or ask user what to do.",
              "Transcripts: /mnt/transcripts/"
            ].join("\n");
            fs.writeFileSync(hrPath, hotContent);
          } catch {}
      cadence.checkpoint = cpResult;
      // Opp 13: Include ATCS manifests in session checkpoints
      try {
        const atcsScan = autoATCSCheckpointScan(callNum);
        if (atcsScan.active_tasks > 0) {
          cadence.actions.push(`📋 ATCS_IN_CHECKPOINT: ${atcsScan.active_tasks} active tasks`);
          cadence.atcs_checkpoint = atcsScan.tasks;
        }
      } catch {}
      await fireHook("STATE-CHECKPOINT-CREATE-001", {
        event: "cadence_checkpoint_executed",
        call_number: callNum,
        success: cpResult.success,
        checkpoint_id: cpResult.checkpoint_id,
        zone: cpResult.zone
      });
      try {
        const currentTask = buildCurrentTaskDescription(cadence, toolName, action2);
        const survivalResult = autoCompactionSurvival(callNum, 50, cadence.actions, currentTask);
        if (survivalResult.success) {
          cadence.actions.push(`\u{1F4BE} SURVIVAL_SAVED`);
        }
      } catch {
      }
      // Session health poll — at checkpoint cadence (every 10 calls)
      try {
        const pPct = cadence.pressure?.pressure_pct || getCurrentPressurePct();
        const healthResult = autoSessionHealthPoll(callNum, pPct);
        if (healthResult.status !== "GREEN") {
          cadence.actions.push(`\u{1FA7A} HEALTH:${healthResult.status} — ${healthResult.advisory}`);
        }
        cadence.session_health = healthResult;
      } catch {}
      // Session quality track — every 10 calls (resurrect dead SessionLifecycleEngine)
      try {
        const sqt = autoSessionQualityTrack(callNum, cadence.actions);
        if (sqt.quality_score) cadence.actions.push(`QUALITY:${(sqt.quality_score as any).grade || "?"}`);
        cadence.session_quality = sqt;
      } catch {}
      // Budget report — every 10 calls
      try {
        const br = autoBudgetReport(callNum);
        if (br.over_budget.length > 0) cadence.actions.push(`\u{1F4B8} BUDGET_REPORT: ${br.utilization_pct}% used, over: ${br.over_budget.join(",")}`);
        cadence.budget_report = br;
      } catch {}
      // WIP capture — every 10 calls
      try {
        const wip = autoWipCapture(callNum);
        if (wip.captured) cadence.actions.push("WIP_CAPTURED");
      } catch {}
      // Cognitive update — every 10 calls
      try {
        const errCount = _errLogLines.length; // A4: reuse shared error log data
        const pPct2 = cadence.pressure?.pressure_pct || getCurrentPressurePct();
        const cog = autoCognitiveUpdate(callNum, pPct2, errCount);
        if (cog.omega > 0) cadence.actions.push(`\u{1F9E0} COGNITIVE: \u03A9=${cog.omega}`);
        cadence.cognitive = cog;
      } catch {}
      // === NEW AUTO-FIRES: Every-10 (Opp 5,6,8,12,17,20) ===
      try {
        const omPersist = autoOmegaHistoryPersist(callNum);
        if (omPersist.entries_saved > 0) cadence.actions.push(`📊 OMEGA_HISTORY_SAVED: ${omPersist.entries_saved}`);
      } catch {}
      try { autoCognitiveStatePersist(callNum); } catch {}
      try { autoConversationalMemorySave(callNum, recentToolCalls); } catch {}
      // Opp 6: PFP pattern extract moved from every-25 to every-10
      try {
        const pfp10 = autoPfpPatternExtract(callNum);
        if (pfp10.after > pfp10.before) cadence.actions.push(`PFP_PATTERNS_10: ${pfp10.before}→${pfp10.after}`);
      } catch {}
      // KV cache stability — every 10 calls
      try {
        const kvStab = autoKvStabilityPeriodic(callNum);
        if (kvStab.success && kvStab.checked && kvStab.stable === false) {
          cadence.actions.push(`\u26A0\uFE0F KV_STABILITY: unstable`);
          cadence.kv_stability = kvStab;
        }
      } catch {}
    }
    if (callNum - lastPressureCheck >= 8) {
      lastPressureCheck = callNum;
      const pressureResult = autoContextPressure(callNum, accumulatedResultBytes);
      cadence.actions.push(pressureResult.success ? `PRESSURE_CHECK:${pressureResult.zone}` : "PRESSURE_CHECK_FAILED");
      cadence.pressure = pressureResult;
      if (pressureResult.pressure_pct >= 85) {
        currentTruncationCap = 5e3;
      } else if (pressureResult.pressure_pct >= 70) {
        currentTruncationCap = 8e3;
      } else if (pressureResult.pressure_pct >= 60) {
        currentTruncationCap = 12e3;
      } else {
        currentTruncationCap = 2e4;
      }
      cadence.truncation_cap = currentTruncationCap;
      // Session-level slim override: lock AGGRESSIVE after 3+ consecutive high-pressure checks
      if (pressureResult.pressure_pct >= 70) {
        highPressureStreak++;
        if (highPressureStreak >= 3 && !sessionSlimOverride) {
          sessionSlimOverride = "AGGRESSIVE";
          cadence.actions.push("🔒 SLIM_LOCKED: AGGRESSIVE mode (sustained high pressure)");
        }
      } else if (pressureResult.pressure_pct < 40) {
        // H5 fix: Unlock AGGRESSIVE when pressure drops below 40% for 3+ consecutive checks
        highPressureStreak--;
        if (highPressureStreak <= -3 && sessionSlimOverride) {
          sessionSlimOverride = null;
          highPressureStreak = 0;
          cadence.actions.push("🔓 SLIM_UNLOCKED: pressure recovered, resuming normal slimming");
        }
      } else {
        // Between 40-70%: reset streak toward 0
        if (highPressureStreak > 0) highPressureStreak = 0;
      }
      await fireHook("CONTEXT-PRESSURE-CHECK-001", {
        event: "cadence_pressure_checked",
        call_number: callNum,
        pressure_pct: pressureResult.pressure_pct,
        zone: pressureResult.zone,
        estimated_tokens: pressureResult.estimated_tokens,
        recommendation: pressureResult.recommendation
      });
      if (pressureResult.pressure_pct >= 55) {
        try {
          const currentTask = buildCurrentTaskDescription(cadence, toolName, action2);
          const dumpResult = autoPreCompactionDump(callNum, pressureResult.pressure_pct, cadence.actions, currentTask);
          if (dumpResult.success) {
            cadence.actions.push(`\u{1F4BE} PRE_COMPACTION_DUMP: pos=${dumpResult.position_saved} snap=${dumpResult.snapshot_saved}`);
          }
        } catch {
        }
      }
      // Memory externalize — at pressure >= 65%, move accumulated data to filesystem
      if (pressureResult.pressure_pct >= 65) {
        try {
          const extResult = autoMemoryExternalize(callNum, pressureResult.pressure_pct, cadence.actions);
          if (extResult.externalized_count > 0) {
            cadence.actions.push(`\u{1F4E4} MEMORY_EXTERNALIZED: ${extResult.externalized_count} files, ~${Math.round(extResult.estimated_bytes_saved / 1024)}KB freed`);
            cadence.memory_externalize = extResult;
          }
        } catch {}
        // Focus optimize — semantic trimming at pressure >= 65%
        try {
          const fo = autoFocusOptimize(callNum, pressureResult.pressure_pct);
          if (fo.optimized) cadence.actions.push("FOCUS_OPTIMIZED");
        } catch {}
      }
      if (pressureResult.pressure_pct >= 70) {
        // Relevance filter — drop low-relevance content before compression
        try {
          const rf = autoRelevanceFilter(callNum, pressureResult.pressure_pct);
          if (rf.filtered) cadence.actions.push("RELEVANCE_FILTERED");
        } catch {}
        const compressResult = autoContextCompress(callNum, {
          task: "Active session \u2014 auto-triggered by high pressure",
          completedSteps: cadence.actions,
          pendingSteps: ["Continue current work"],
          keyFindings: [`Pressure at ${pressureResult.pressure_pct}%`, `${callNum} calls made`],
          activeFiles: []
        });
        cadence.actions.push(compressResult.success ? "CONTEXT_AUTO_COMPRESSED" : "COMPRESS_FAILED");
        cadence.compress = compressResult;
        await fireHook("CONTEXT-COMPRESS-AUTO-001", {
          event: "cadence_auto_compress",
          call_number: callNum,
          snapshot_saved: compressResult.snapshot_saved,
          recommendation_count: compressResult.recommendations?.length || 0
        });
        try {
          const currentTask = buildCurrentTaskDescription(cadence, toolName, action2);
          const survivalResult = autoCompactionSurvival(callNum, pressureResult.pressure_pct, cadence.actions, currentTask);
          if (survivalResult.success) {
            cadence.actions.push(`\u{1F4BE} COMPACTION_SURVIVAL_SAVED: ${survivalResult.file}`);
          }
        } catch {
        }
      } else if (pressureResult.pressure_pct < 40) {
        try {
          const pullBack = autoContextPullBack(callNum, pressureResult.pressure_pct, accumulatedResultBytes);
          if (pullBack.pulled_back.length > 0) {
            cadence.actions.push(`\u{1F504} CONTEXT_RESTORED: ${pullBack.pulled_back.length} items pulled back (${pullBack.pulled_back_bytes}B)`);
            cadence.context_pullback = pullBack;
          }
        } catch {
        }
      }
    }
    if (callNum - lastCompactionCheck >= 12) {
      lastCompactionCheck = callNum;
      const compactResult = autoCompactionDetect(callNum, {
        accumulatedBytes: accumulatedResultBytes,
        avgResultBytes,
        largestResultBytes,
        callsSinceCheckpoint: callNum - lastCheckpointReminder
      });
      cadence.actions.push(compactResult.success ? `COMPACTION_DETECT:${compactResult.risk_level}` : "COMPACTION_DETECT_FAILED");
      cadence.compaction = compactResult;
      await fireHook("CONTEXT-COMPACTION-DETECT-001", {
        event: "cadence_compaction_detected",
        call_number: callNum,
        risk_level: compactResult.risk_level,
        risk_score: compactResult.risk_score,
        signal_count: Array.isArray(compactResult.signals) ? compactResult.signals.length : (compactResult.signals ? Object.keys(compactResult.signals).length : 0),
        action_required: compactResult.action_required
      });
    }
    if (callNum - lastAttentionCheck >= 8) {
      lastAttentionCheck = callNum;
      try {
        const currentTask = cadence.todo?.currentFocus || "general";
        const attResult = autoAttentionScore(callNum, currentTask);
        if (attResult.success && attResult.summary) {
          cadence.actions.push(`\u{1F3AF} ATTENTION_SCORED: avg=${attResult.summary.average_score || "N/A"}`);
          cadence.attention = attResult.summary;
        }
      } catch {
      }
    }
    if (callNum > 0 && callNum % 12 === 0) {
      try {
        const pct = cadence.pressure?.pressure_pct || 50;
        const prediction = autoPythonCompactionPredict(callNum, pct);
        if (prediction.success && prediction.prediction) {
          cadence.actions.push(`\u{1F52E} COMPACTION_PREDICT: ${JSON.stringify(prediction.prediction).slice(0, 60)}`);
          cadence.compaction_prediction = prediction.prediction;
        }
      } catch {
      }
    }
    if (cadence.pressure?.pressure_pct > 70) {
      try {
        const pyCompress = autoPythonCompress(callNum, cadence.pressure.pressure_pct);
        if (pyCompress.success) {
          cadence.actions.push("\u{1F5DC}\uFE0F PYTHON_COMPRESS_RAN");
          cadence.python_compress = pyCompress.compress_result;
        }
      } catch {
      }
      // Priority scoring — pressure >= 70%
      try {
        const priScore = autoPriorityScore(callNum, cadence.pressure.pressure_pct);
        if (priScore.success && priScore.scored && priScore.segments) {
          cadence.actions.push(`\u{1F3AF} PRIORITY_SCORE: ${priScore.segments} segments scored at ${cadence.pressure.pressure_pct}%`);
          cadence.priority_score = priScore;
        }
      } catch {}
    }
    if (cadence.pressure?.pressure_pct < 40 && cadence.pressure?.pressure_pct > 0) {
      try {
        const pyExpand = autoPythonExpand(callNum, cadence.pressure.pressure_pct);
        if (pyExpand.success) {
          cadence.actions.push("\u{1F4E6} PYTHON_EXPAND_RAN");
          cadence.python_expand = pyExpand.expand_result;
        }
      } catch {
      }
    }
    if (!error && result?.isError) {
      try {
        const errText = result?.content?.[0]?.text || "";
        const parsed = typeof errText === "string" && errText.startsWith("{") ? JSON.parse(errText) : null;
        const errMsg = parsed?.error || parsed?.message || errText.slice(0, 200);
        if (errMsg) autoErrorLearn(callNum, toolName, action2, errMsg, args[0] || {});
      } catch {
      }
    }
    if (!error && !result?.isError && result?.content?.[0]?.text) {
      try {
        const txt = result.content[0].text;
        if (typeof txt === "string" && txt.includes('"error"')) {
          const parsed = JSON.parse(txt);
          if (parsed.error && typeof parsed.error === "string" && parsed.error.length > 5) {
            const learnResult = autoErrorLearn(callNum, toolName, action2, parsed.error, args[0]?.params || {});
            if (learnResult.pattern_matched && learnResult.prevention) {
              cadence.actions.push(`\u26A0\uFE0F KNOWN_ERROR: ${learnResult.prevention.slice(0, 60)}`);
            } else {
              cadence.actions.push(`\u{1F4DD} ERROR_LEARNED: ${parsed.error.slice(0, 60)}`);
            }
            cadence.error_learn = learnResult;
          }
        }
      } catch {
      }
    }
    if (!error && !result?.isError) {
      try {
        const txt = result?.content?.[0]?.text;
        const hasError = typeof txt === "string" && txt.includes('"error"') && JSON.parse(txt).error;
        if (!hasError) {
          const fpPath = path.join(PATHS.STATE_DIR, "failure_patterns.jsonl");
          if (fs.existsSync(fpPath)) {
            const lines = fs.readFileSync(fpPath, "utf-8").trim().split("\n").filter(Boolean);
            const patterns = lines.map((l) => {
              try {
                return JSON.parse(l);
              } catch {
                return null;
              }
            }).filter(Boolean);
            const toolKey = `${toolName}:${action2}`;
            const match = patterns.find((p) => p.last_tool === toolKey && !p.resolved);
            if (match && match.occurrences >= 2) {
              match.resolved = true;
              match.resolved_at = (/* @__PURE__ */ new Date()).toISOString();
              match.prevention = match.prevention || `Auto-resolved after successful ${toolKey} call. Review what changed.`;
              fs.writeFileSync(fpPath, patterns.map((p) => JSON.stringify(p)).join("\n") + "\n");
              cadence.actions.push(`\u2705 ERROR_RESOLVED: ${match.type}/${match.domain} (was ${match.occurrences}x)`);
              cadence.error_resolved = { pattern_id: match.id, type: match.type, domain: match.domain, occurrences: match.occurrences };
              // GAP B: Create RESOLVED_BY edge in memory graph
              try {
                const { memoryGraphEngine: mgeResolve } = await import("../engines/MemoryGraphEngine.js");
                const errorNodes = (mgeResolve as any).index?.nodesByType?.ERROR || [];
                const decisionNodes = (mgeResolve as any).index?.nodesByType?.DECISION || [];
                // Link most recent ERROR to most recent DECISION (the one that resolved it)
                if (errorNodes.length > 0 && decisionNodes.length > 0) {
                  const recentErrorId = errorNodes[errorNodes.length - 1];
                  const recentDecisionId = decisionNodes[decisionNodes.length - 1];
                  mgeResolve.linkErrorResolution(recentErrorId, recentDecisionId, 0.9);
                  cadence.actions.push(`🔗 GRAPH_RESOLVED_BY: ${recentErrorId.slice(0, 8)}→${recentDecisionId.slice(0, 8)}`);
                }
              } catch { /* graph wiring non-fatal */ }
            }
          }
        }
      } catch {
      }
    }
    if (toolName === "prism_dev" && action2 === "file_write" && args[0]?.params?.content && args[0]?.params?.path) {
      try {
        const fullPath = path.resolve(args[0].params.path);
        const regrResult = autoAntiRegression(fullPath, args[0].params.content);
        if (!regrResult.passed) {
          cadence.actions.push("\u26A0\uFE0F ANTI-REGRESSION BLOCKED");
          cadence.anti_regression = regrResult;
          await fireHook("STATE-ANTI-REGRESSION-001", {
            event: "regression_detected",
            file: fullPath,
            regression_count: regrResult.regressions?.length || 0,
            metrics_changed: !!regrResult.old_metrics && !!regrResult.new_metrics
          });
        }
      } catch {
      }
    }
    const isFileWrite = toolName === "prism_dev" && action2 === "file_write" || toolName === "prism_doc" && (action2 === "write" || action2 === "append");
    if (isFileWrite && args[0]?.params?.content && (args[0]?.params?.path || args[0]?.params?.name)) {
      try {
        const docPath = args[0].params.path || path.join(path.join(PATHS.MCP_SERVER, "data", "docs"), args[0].params.name);
        const docResult = autoDocAntiRegression(docPath, args[0].params.content);
        if (docResult.severity === "BLOCK" && !args[0]?.params?.bypass_doc_regression) {
          cadence.actions.push(`\u{1F6D1} DOC_ANTI_REGRESSION_BLOCKED: ${docResult.file} (${docResult.old_lines}\u2192${docResult.new_lines}, -${docResult.reduction_pct}%)`);
          cadence.doc_anti_regression = docResult;
        } else if (docResult.severity === "WARNING") {
          cadence.actions.push(`\u26A0\uFE0F DOC_CONTENT_WARNING: ${docResult.file} (-${docResult.reduction_pct}%)`);
          cadence.doc_anti_regression = docResult;
        }
        if (!docResult.has_changelog && docResult.new_lines > 20) {
          cadence.actions.push(`\u26A0\uFE0F MISSING_CHANGELOG: ${docResult.file}`);
        }
      } catch {
      }
    }
    if (toolName === "prism_dev" && action2 === "file_write" && args[0]?.params?.path) {
      try {
        const decResult = autoDecisionCapture(callNum, toolName, action2, args[0].params.path);
        if (decResult.auto_captured) {
          cadence.actions.push(`DECISION_CAPTURED:${decResult.decision_id}`);
          cadence.decision = decResult;
        }
      } catch {
      }
    }
    if (toolName === "prism_context" && action2 === "todo_update") {
      try {
        const todoContent = args[0]?.params?.content || args[0]?.params?.task || "";
        const hasCompletion = typeof todoContent === "string" && (todoContent.includes("COMPLETE") || todoContent.includes("DONE") || todoContent.includes("100%"));
        if (hasCompletion) {
          const gateResult = autoQualityGate(callNum);
          if (!gateResult.gate_passed) {
            cadence.actions.push("\u26A0\uFE0F QUALITY_GATE_BLOCKED");
            cadence.quality_gate = gateResult;
          } else {
            cadence.actions.push("\u2705 QUALITY_GATE_PASSED");
          }
        }
      } catch {
      }
    }
    if (callNum - lastVariationCheck >= 20) {
      lastVariationCheck = callNum;
      try {
        const varResult = autoVariationCheck(callNum);
        if (varResult.variation_needed) {
          cadence.actions.push("\u{1F501} VARIATION_NEEDED");
          cadence.variation = varResult;
        }
      } catch {
      }
    }
    if (callNum % 15 === 0) {
      try {
        const d4Result = autoD4CacheCheck(callNum);
        if (d4Result.success) {
          cadence.actions.push(`\u{1F5C4}\uFE0F D4_CACHE: ${d4Result.cache_stats?.hit_rate ? (d4Result.cache_stats.hit_rate * 100).toFixed(0) : 0}% hit rate, ${d4Result.expired_cleaned || 0} expired`);
        }
      } catch {
      }
      try {
        const diffResult = autoD4DiffCheck(callNum);
        if (diffResult.success && diffResult.diff_stats.skipped_writes > 0) {
          cadence.actions.push(`\u{1F4CA} D4_DIFF: ${diffResult.diff_stats.skipped_writes} writes skipped, ${diffResult.diff_stats.bytes_saved}B saved`);
        }
      } catch {
      }
      // Memory graph flush — every 15 calls (prevent WAL data loss)
      try {
        const gf = autoMemoryGraphFlush(callNum);
        if (gf.flushed && gf.stats) cadence.actions.push(`GRAPH_FLUSHED: ${gf.stats.nodes}n/${gf.stats.edges}e`);
      } catch {}
      // === NEW AUTO-FIRES: Every-15 (Opp 3, 5, 7, 10) ===
      try {
        const gi15 = autoMemoryGraphIntegrity(callNum);
        if (gi15.violations > 0) cadence.actions.push(`GRAPH_INTEGRITY_15: ${gi15.violations} violations, ${gi15.fixed} fixed`);
      } catch {}
      try {
        const regRefresh = autoRegistryRefresh(callNum);
        if (regRefresh.refreshed) cadence.actions.push("🔄 REGISTRY_REFRESHED");
      } catch {}
      try {
        const bridgeH = autoBridgeHealthCheck(callNum);
        if (bridgeH.degraded > 0) cadence.actions.push(`⚠️ BRIDGE_HEALTH: ${bridgeH.degraded} degraded`);
      } catch {}
    }
    // H1 fix: Stagger D4/ATCS to offset-4 (fires at 4,12,20,28) to avoid spike with pressure/attention at 8,16,24
    if (callNum > 0 && (callNum + 4) % 8 === 0) {
      try {
        const batchResult = await autoD4BatchTick(callNum);
        if (batchResult.success && batchResult.processed > 0) {
          cadence.actions.push(`\u2699\uFE0F D4_BATCH: ${batchResult.processed} processed, ${batchResult.queue_remaining} queued`);
        }
      } catch {
      }
      try {
        const bridgePoll = autoManusATCSPoll(callNum);
        if (bridgePoll.completed && bridgePoll.completed > 0) {
          cadence.actions.push(`\u{1F916} MANUS_BRIDGE: ${bridgePoll.completed} units auto-completed`);
        } else if (bridgePoll.running && bridgePoll.running > 0) {
          cadence.actions.push(`\u23F3 MANUS_BRIDGE: ${bridgePoll.running} units running`);
        }
      } catch {
      }
      // Auto-upgrade ATCS batches to parallel execution
      try {
        const atcsUpgrade = autoATCSParallelUpgrade(callNum);
        if (atcsUpgrade.upgraded) {
          cadence.actions.push(`\u{26A1} ATCS_PARALLEL: batch upgraded to parallel execution`);
        }
      } catch { /* non-fatal */ }
      // === NEW AUTO-FIRES: Every-8 (Opp 9, 15, 18) ===
      try {
        const sqd = autoScriptQueueDrain(callNum);
        if (sqd.processed > 0) cadence.actions.push(`📜 SCRIPT_QUEUE: ${sqd.processed} processed, ${sqd.remaining} remaining`);
      } catch {}
      try {
        const hb = autoRoadmapHeartbeat(callNum);
        if (hb.beat) cadence.actions.push("💓 ROADMAP_HEARTBEAT");
      } catch {}
    }
    if (callNum % 15 === 0) {
      try {
        const telSnap = autoTelemetrySnapshot(callNum);
        if (telSnap.success) {
          cadence.actions.push(`\u{1F4C8} TELEMETRY: ${telSnap.dispatchers_tracked} dispatchers, ${telSnap.total_records} records, ${telSnap.anomalies} anomalies${telSnap.unacknowledged_critical > 0 ? ` \u26A0\uFE0F${telSnap.unacknowledged_critical} CRITICAL` : ""}`);
        }
      } catch {
      }
      try {
        // @ts-ignore — synergyIntegration may not exist yet
        const { synergyCrossEngineHealth: synergyCrossEngineHealth2 } = await import("../engines/synergyIntegration.js");
        const health = synergyCrossEngineHealth2();
        if (!health.all_healthy) {
          const degraded = Object.entries(health.engines).filter(([, v]: [string, any]) => v.status !== "healthy").map(([k]: [string, any]) => k);
          cadence.actions.push(`\u26A0\uFE0F ENGINE_HEALTH: ${degraded.join(", ")} degraded`);
        }
      } catch {
      }
      // Telemetry anomaly check — every 15 calls
      try {
        const anomResult = autoTelemetryAnomalyCheck(callNum);
        if (anomResult.critical_count > 0) cadence.actions.push(`\u{26A0}\u{FE0F} CRITICAL_ANOMALIES: ${anomResult.critical_count}`);
      } catch {}
      // Pattern detect — every 15 calls
      try {
        const pd = autoPatternDetect(callNum);
        if (pd.patterns_found > 0) cadence.actions.push(`\u{1F50D} PATTERNS: ${pd.patterns_found} new`);
      } catch {}
      // Session metrics snapshot — every 15 calls
      try { autoSessionMetricsSnapshot(callNum); } catch {}
    }
    if (callNum === 1 && globalThis.__prism_recon) {
      cadence.session_recon = globalThis.__prism_recon;
      delete globalThis.__prism_recon;
    }
    // Master Index generation — on first call (session boot), async non-blocking
    if (callNum === 1) {
      try {
        import("../engines/MasterIndexGenerator.js").then(async (mig) => {
          const idx = await mig.generate();
          (globalThis as any).__prism_master_index = idx;
          cadence.actions?.push(`\u{1F4CB} INDEX_REFRESHED: ${idx.totals.dispatchers} dispatchers, ${idx.totals.actions} actions, ${idx.totals.engines} engines`);
        }).catch(() => {});
      } catch { /* non-fatal */ }
    }
    // Index staleness detection — if a tracked file was edited, mark stale
    try {
      if ((globalThis as any).__prism_index_stale) {
        (globalThis as any).__prism_index_stale = false;
        import("../engines/MasterIndexGenerator.js").then(async (mig) => {
          const idx = await mig.generate();
          (globalThis as any).__prism_master_index = idx;
        }).catch(() => {});
        cadence.actions.push(`\u{1F4CB} INDEX_STALE: reindexing`);
      }
    } catch { /* non-fatal */ }
    // Deferred swarm result injection — surfaces pending results for 3 calls after dispatch
    try {
      const swarmPending = (globalThis as any).__prism_swarm_pending;
      if (swarmPending && swarmPending.remaining > 0) {
        cadence.swarm_results = swarmPending.result;
        swarmPending.remaining--;
        if (swarmPending.remaining <= 0) {
          delete (globalThis as any).__prism_swarm_pending;
        }
      }
    } catch { /* non-fatal */ }
    // Survival checkpoint consolidated into every-10 checkpoint block (dedup)
    // Memory graph eviction — every 20 calls (prune expired nodes)
    if (callNum > 0 && callNum % 20 === 0) {
      try {
        const evictResult = autoMemoryGraphEvict(callNum);
        if (evictResult.success && evictResult.evicted > 0) {
          cadence.actions.push(`\u{1F5D1}\uFE0F GRAPH_EVICT: ${evictResult.evicted} expired nodes pruned`);
          cadence.graph_evict = evictResult;
        }
      } catch {}
    }
    // GAP A: Sync failure_patterns.jsonl → memory.db pattern_history
    try { autoFailurePatternSync(callNum); } catch { /* non-fatal */ }
    if (callNum > 0 && callNum % 25 === 0) {
      try {
        // @ts-ignore — synergyIntegration may not exist yet
        const { synergyComplianceAudit: synergyComplianceAudit2 } = await import("../engines/synergyIntegration.js");
        const auditResult = synergyComplianceAudit2(callNum);
        if (auditResult.ran) {
          cadence.actions.push(`\u{1F4CB} COMPLIANCE_AUDIT: ${auditResult.details}`);
        }
      } catch {
      }
    }
    if (callNum > 0 && callNum % 10 === 0) {
      try {
        const phaseSkills = autoPhaseSkillLoader(callNum);
        if (phaseSkills.success && phaseSkills.skills_loaded > 0) {
          cadence.actions.push(`\u{1F4DA} PHASE_SKILLS: ${phaseSkills.skills_loaded}/${phaseSkills.skills_matched} loaded for phase "${phaseSkills.current_phase}" (${phaseSkills.pressure_mode})`);
          cadence.phase_skills = phaseSkills;
        }
      } catch {
      }
      // Compaction trend analysis — every 10 calls at pressure >= 50%
      try {
        const pPctTrend = cadence.pressure?.pressure_pct || getCurrentPressurePct();
        if (pPctTrend >= 50) {
          const trend = autoCompactionTrend(callNum, pPctTrend);
          if (trend.success && trend.escalating) {
            cadence.actions.push(`\u{1F4C8} COMPACTION_TREND: escalating — ${trend.trend || "rising"}`);
            cadence.compaction_trend = trend;
          }
        }
      } catch {}
    }
    // H3 fix: Skill matching moved from every-call to every-5 (reduces 40x→8x per session)
    if (callNum <= 1 || (callNum - lastTodoReminder <= 1)) {
      try {
        const ctxMatch = autoSkillContextMatch(callNum, toolName, action2, args[0]?.params || {});
        if (ctxMatch.success && ctxMatch.total_matched > 0) {
          cadence.actions.push(`\u{1F3AF} SKILL_MATCH: ${ctxMatch.total_matched} skills matched for ${ctxMatch.context_key}`);
          cadence.skill_context_matches = ctxMatch;
        }
      } catch {
      }
      try {
        const hookMatch = autoSkillHookMatch(callNum, toolName, action2, args[0]?.params || {});
        if (hookMatch.success && hookMatch.total_matched > 0) {
          const hookNames = hookMatch.matched_hooks.map(h => h.name).join(", ");
          cadence.actions.push(`\u{1FA9D} AUTO_HOOKS: ${hookMatch.total_matched} fired (${hookNames}), ${hookMatch.total_skills_loaded} skills`);
          cadence.auto_skill_hooks = hookMatch;
          recordSessionSkillInjection();
        }
      } catch {
      }
    }
    // H1 fix: NL hooks staggered to offset-4 (same tier as D4/ATCS)
    if (callNum > 0 && (callNum + 4) % 8 === 0) {
      try {
        fs.appendFileSync(path.join(PATHS.STATE_DIR, "nl_hook_debug.log"), `[${new Date().toISOString()}] CALLSITE: call=${callNum} tool=${toolName} action=${action2}\n`);
        const nlResult = autoNLHookEvaluator(callNum, toolName, action2);
        if (nlResult.success && nlResult.hooks_fired > 0) {
          cadence.actions.push(`\u{1FA9D} NL_HOOKS: ${nlResult.hooks_fired}/${nlResult.hooks_evaluated} fired`);
          cadence.nl_hook_eval = nlResult;
          fs.appendFileSync(path.join(PATHS.STATE_DIR, "nl_hook_debug.log"), `  -> result: success=${nlResult.success} fired=${nlResult.hooks_fired} evaluated=${nlResult.hooks_evaluated}\n`);
        }
      } catch {
      }
      // Context pressure recommendations — every 8 calls at pressure >= 50%
      try {
        const pPctNow = cadence.pressure?.pressure_pct || getCurrentPressurePct();
        if (pPctNow >= 50) {
          const cpRec = autoContextPressureRecommend(callNum, pPctNow);
          if (cpRec.success && cpRec.recommendation) {
            cadence.actions.push(`\u{1F4CA} PRESSURE_REC: ${cpRec.recommendation}`);
            cadence.pressure_recommendations = cpRec;
          }
        }
        // Auto-compress — every 8 calls at pressure >= 65%
        if (pPctNow >= 65) {
          const ac = autoCompress(callNum, pPctNow);
          if (ac.compressed && ac.bytes_saved) {
            cadence.actions.push(`\u{1F5DC}\uFE0F AUTO_COMPRESS: ${ac.bytes_saved}B saved`);
          }
        }
      } catch {}
    }
    if (callNum > 0 && callNum % 25 === 0) {
      try {
        const hookCheck = autoHookActivationPhaseCheck(callNum);
        if (hookCheck.success && hookCheck.missing_hooks.length > 0) {
          cadence.actions.push(`\u26A0\uFE0F HOOK_PHASE_GAP: ${hookCheck.missing_hooks.length} hooks missing for phase "${hookCheck.current_phase}" (${hookCheck.coverage_pct}% coverage)`);
          cadence.hook_activation_check = hookCheck;
        }
      } catch {
      }
      // H2 fix: PFP pattern extract removed from every-25 (already fires at every-10 as PFP_PATTERNS_10)
      // SLO compliance check — every 25 calls
      try {
        const slo = autoTelemetrySloCheck(callNum);
        if (slo.breaches.length > 0) cadence.actions.push(`\u26A0\uFE0F SLO_BREACHES: ${slo.breaches.length}`);
      } catch {}
      // Learning store persist — every 25 calls
      try {
        const lsp = autoLearningStorePersist(callNum);
        if (lsp.persisted && lsp.patterns_count) cadence.actions.push(`\u{1F4DA} LEARNING_PERSISTED: ${lsp.patterns_count} patterns`);
      } catch {}
      // === NEW AUTO-FIRES: Every-25 (Opp 2, 5, 6, 7, 14, 15) ===
      try {
        const slb25 = autoSLBConsume(callNum);
        if (slb25.patterns_consumed > 0) cadence.actions.push(`🔄 SLB_DRAINED: ${slb25.patterns_consumed}`);
      } catch {}
      try {
        const gsd25 = autoGsdAccessSummary(callNum);
        if (gsd25.entries_before > 200) cadence.actions.push(`📋 GSD_PRUNED: ${gsd25.entries_before}→${gsd25.entries_after}`);
      } catch {}
      try {
        const decay = autoSwarmPatternDecay(callNum);
        if (decay.patterns_decayed > 0) cadence.actions.push(`⏳ SWARM_DECAY: ${decay.patterns_decayed} decayed`);
      } catch {}
      try {
        const nlVal = autoNLHookValidate(callNum);
        if (nlVal.hooks_broken > 0) cadence.actions.push(`⚠️ NL_HOOKS_BROKEN: ${nlVal.hooks_broken} (${nlVal.broken_names.join(", ")})`);
      } catch {}
    }
    // D4 Performance summary — cache/diff/batch stats + recommendations (every 40 calls)
    if (callNum > 0 && callNum % 40 === 0) {
      try {
        const perfSummary = autoD4PerfSummary(callNum);
        if (perfSummary.success && perfSummary.recommendations.length > 0) {
          cadence.actions.push(`📊 D4_PERF: ${perfSummary.recommendations.length} recommendations — ${perfSummary.recommendations[0]}`);
          cadence.d4_perf_summary = perfSummary;
        }
      } catch {
      }
    }
    if (callNum >= 41) {
      cadence.actions.push("\u26AB ADVISORY: 41+ calls \u2014 consider checkpoint if pressure is rising");
      try {
        const autoSaveState: any = {};
        const stateFile = path.join(PATHS.STATE_DIR, "CURRENT_STATE.json");
        if (fs.existsSync(stateFile)) {
          try {
            Object.assign(autoSaveState, JSON.parse(fs.readFileSync(stateFile, "utf-8")));
          } catch {
          }
        }
        autoSaveState.auto_saved = true;
        autoSaveState.auto_save_reason = "HIGH_CALL_COUNT_41+";
        autoSaveState.auto_save_time = (/* @__PURE__ */ new Date()).toISOString();
        autoSaveState.currentSession = autoSaveState.currentSession || {};
        autoSaveState.currentSession.progress = autoSaveState.currentSession.progress || {};
        autoSaveState.currentSession.progress.toolCalls = callNum;
        autoSaveState.currentSession.progress.zone = "\u26AB BLACK";
        autoSaveState.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        fs.writeFileSync(stateFile, JSON.stringify(autoSaveState, null, 2));
        cadence.actions.push("STATE_AUTO_SAVED:HIGH_CALLS");
        try {
          const currentTask = cadence.todo?.currentFocus || cadence.todo?.taskName || "unknown";
          const pct = cadence.pressure?.pressure_pct || 50;
          const survResult = autoCompactionSurvival(callNum, pct, cadence.actions, currentTask);
          if (survResult.success) cadence.actions.push("COMPACTION_SURVIVAL_SAVED:HIGH_CALLS");
        } catch {
        }
        try {
          const atcsDir = path.join(PATHS.PRISM_ROOT, "autonomous-tasks");
          if (fs.existsSync(atcsDir)) {
            const taskDirs = fs.readdirSync(atcsDir).filter((d) => {
              try {
                return fs.statSync(path.join(atcsDir, d)).isDirectory();
              } catch {
                return false;
              }
            });
            for (const dir of taskDirs) {
              const mfPath = path.join(atcsDir, dir, "TASK_MANIFEST.json");
              if (fs.existsSync(mfPath)) {
                try {
                  const mf = JSON.parse(fs.readFileSync(mfPath, "utf-8"));
                  if (mf.status === "IN_PROGRESS") {
                    mf.last_emergency_save = (/* @__PURE__ */ new Date()).toISOString();
                    mf.emergency_reason = "HIGH_CALL_COUNT";
                    mf.emergency_call_number = callNum;
                    fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2));
                    cadence.actions.push("ATCS_EMERGENCY_SAVED:" + mf.task_id);
                  }
                } catch {
                }
              }
            }
          }
        } catch {
        }
      } catch {
      }
    } else if (callNum >= 31) {
      cadence.actions.push("\u{1F534} NOTICE: 31+ calls \u2014 checkpoint recommended, monitor pressure");
    } else if (callNum >= 21) {
      cadence.actions.push("\u{1F7E1} NOTICE: 21+ calls \u2014 plan checkpoint soon");
    }
    if (!handoffFired && (callNum >= 21 || (cadence.pressure?.pressure_pct || 0) >= 60)) {
      try {
        const trigger = callNum >= 21 ? "yellow_zone" : "pressure_high";
        const currentTask = buildCurrentTaskDescription(cadence, toolName, action2);
        const handoffResult = autoHandoffPackage(callNum, trigger, currentTask);
        if (handoffResult.success) {
          cadence.actions.push(`\u{1F4E6} HANDOFF_PACKAGE_SAVED: ${trigger} (call ${callNum})`);
          handoffFired = true;
        }
      } catch {
      }
      // Session handoff generate — once at yellow zone (quality-scored)
      try {
        const shg = autoSessionHandoffGenerate(callNum, cadence.actions);
        if (shg.generated) cadence.actions.push("SESSION_HANDOFF_GENERATED");
      } catch {}
    }
    // Next session prep — once at call >= 35 (pre-BLACK)
    if (callNum >= 35) {
      try {
        const nsp = autoNextSessionPrep(callNum);
        if (nsp.prepared) cadence.actions.push("NEXT_SESSION_PREP_GENERATED");
      } catch {}
    }
    // Session lifecycle end — once at call >= 41 (BLACK zone)
    if (callNum >= 41) {
      try {
        const sle = autoSessionLifecycleEnd(callNum);
        if (sle.ended) cadence.actions.push("SESSION_LIFECYCLE_ENDED");
      } catch {}
      // Opp 18: Persist job learning on session end
      try {
        const jlp = autoJobLearningPersist(callNum);
        if (jlp.persisted) cadence.actions.push("📚 JOB_LEARNING_PERSISTED");
      } catch {}
    }
    // State reconstruct — after compaction detected (one-time)
    if (cadence.compaction?.risk_level === "IMMINENT" || cadence.compaction?.risk_level === "HIGH") {
      try {
        const sr = autoStateReconstruct(callNum);
        if (sr.reconstructed) cadence.actions.push("STATE_RECONSTRUCTED");
      } catch {}
    }
    if (cadence.actions.length > 0 && result?.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(result.content[0].text);
        const fullCadence: any = { call_number: cadence.call_number, actions: cadence.actions };
        for (const [k, v] of Object.entries(cadence)) {
          if (k === "call_number" || k === "actions") continue;
          if (v != null && v !== "" && !(Array.isArray(v) && v.length === 0)) fullCadence[k] = v;
        }
        // CADENCE-TO-DISK: Persist full cadence for monitoring, return alert-only for response
        const { alerts, alert_count, routine_count } = persistCadenceToDisk(fullCadence, STATE_DIR12);
        const pressurePct = cadence.pressure?.pressure_pct ?? 0;
        parsed._cadence = sessionSlimOverride === "AGGRESSIVE"
          ? slimCadence({ ...fullCadence, actions: alerts }, 90)  // Force max pressure slimming
          : slimCadence({ ...fullCadence, actions: alerts }, pressurePct);
        try {
          const cadenceFiresPath = path.join(PATHS.STATE_DIR, "CADENCE_FIRES.json");
          let fires: any = {};
          if (fs.existsSync(cadenceFiresPath)) {
            try {
              fires = JSON.parse(fs.readFileSync(cadenceFiresPath, "utf-8"));
            } catch {
              fires = {};
            }
          }
          for (const action3 of cadence.actions) {
            if (typeof action3 !== "string") continue;
            if (action3.includes("TODO_AUTO_REFRESHED")) fires["autoTodoRefresh"] = (fires["autoTodoRefresh"] || 0) + 1;
            else if (action3.includes("CHECKPOINT_AUTO_SAVED")) fires["autoCheckpoint"] = (fires["autoCheckpoint"] || 0) + 1;
            else if (action3.includes("PRESSURE_CHECK")) fires["autoContextPressure"] = (fires["autoContextPressure"] || 0) + 1;
            else if (action3.includes("COMPACTION_DETECT")) fires["autoCompactionDetect"] = (fires["autoCompactionDetect"] || 0) + 1;
            else if (action3.includes("ATTENTION_SCORED")) fires["autoAttentionScore"] = (fires["autoAttentionScore"] || 0) + 1;
            else if (action3.includes("SKILL_HINT")) fires["autoSkillHint"] = (fires["autoSkillHint"] || 0) + 1;
            else if (action3.includes("KNOWLEDGE_CROSS")) fires["autoKnowledgeCrossQuery"] = (fires["autoKnowledgeCrossQuery"] || 0) + 1;
            else if (action3.includes("DOC_ANTI_REGRESSION")) fires["autoDocAntiRegression"] = (fires["autoDocAntiRegression"] || 0) + 1;
            else if (action3.includes("PHASE_SKILLS")) fires["autoPhaseSkillLoader"] = (fires["autoPhaseSkillLoader"] || 0) + 1;
            else if (action3.includes("SKILL_MATCH")) fires["autoSkillContextMatch"] = (fires["autoSkillContextMatch"] || 0) + 1;
            else if (action3.includes("NL_HOOK")) fires["autoNLHookEvaluator"] = (fires["autoNLHookEvaluator"] || 0) + 1;
            else if (action3.includes("HOOK_PHASE")) fires["autoHookActivationPhaseCheck"] = (fires["autoHookActivationPhaseCheck"] || 0) + 1;
            else if (action3.includes("D4_PERF")) fires["autoD4PerfSummary"] = (fires["autoD4PerfSummary"] || 0) + 1;
            else if (action3.includes("SCRIPT_REC")) fires["autoScriptRecommend"] = (fires["autoScriptRecommend"] || 0) + 1;
            else if (action3.includes("RECOVERY_MANIFEST")) fires["autoRecoveryManifest"] = (fires["autoRecoveryManifest"] || 0) + 1;
            else if (action3.includes("SURVIVAL_SAVED")) fires["autoSurvivalSave"] = (fires["autoSurvivalSave"] || 0) + 1;
            else if (action3.includes("COMPACTION_PREDICT")) fires["autoCompactionPredict"] = (fires["autoCompactionPredict"] || 0) + 1;
            else if (action3.includes("TELEMETRY_SNAP")) fires["autoTelemetrySnapshot"] = (fires["autoTelemetrySnapshot"] || 0) + 1;
            else if (action3.includes("COMPLIANCE_AUDIT")) fires["autoComplianceAudit"] = (fires["autoComplianceAudit"] || 0) + 1;
            else if (action3.includes("SLB_")) fires["autoSLBConsume"] = (fires["autoSLBConsume"] || 0) + 1;
            else if (action3.includes("BRIDGE_")) fires["autoBridgeHealthCheck"] = (fires["autoBridgeHealthCheck"] || 0) + 1;
            else if (action3.includes("REGISTRY_REFRESHED")) fires["autoRegistryRefresh"] = (fires["autoRegistryRefresh"] || 0) + 1;
            else if (action3.includes("OMEGA_HISTORY")) fires["autoOmegaHistory"] = (fires["autoOmegaHistory"] || 0) + 1;
            else if (action3.includes("COGNITIVE_STATE")) fires["autoCognitiveState"] = (fires["autoCognitiveState"] || 0) + 1;
            else if (action3.includes("SCRIPT_QUEUE")) fires["autoScriptQueueDrain"] = (fires["autoScriptQueueDrain"] || 0) + 1;
            else if (action3.includes("ROADMAP_HEARTBEAT")) fires["autoRoadmapHeartbeat"] = (fires["autoRoadmapHeartbeat"] || 0) + 1;
            else if (action3.includes("SWARM_DECAY")) fires["autoSwarmPatternDecay"] = (fires["autoSwarmPatternDecay"] || 0) + 1;
            else if (action3.includes("NL_HOOKS_BROKEN")) fires["autoNLHookValidate"] = (fires["autoNLHookValidate"] || 0) + 1;
            else if (action3.includes("GSD_PRUNED")) fires["autoGsdAccessSummary"] = (fires["autoGsdAccessSummary"] || 0) + 1;
            else if (action3.includes("ATCS_IN_CHECKPOINT")) fires["autoATCSCheckpointScan"] = (fires["autoATCSCheckpointScan"] || 0) + 1;
            else if (action3.includes("CALC_PRE_ENRICHED")) fires["autoCalcPreEnrich"] = (fires["autoCalcPreEnrich"] || 0) + 1;
            else if (action3.includes("ANOMALY_RESOLVED")) fires["autoTelemetryResolve"] = (fires["autoTelemetryResolve"] || 0) + 1;
            else if (action3.includes("JOB_LEARNING")) fires["autoJobLearningPersist"] = (fires["autoJobLearningPersist"] || 0) + 1;
          }
          fires._last_call = callNum;
          fires._updated = (/* @__PURE__ */ new Date()).toISOString();
          if (callNum % 5 === 0) fs.writeFileSync(cadenceFiresPath, JSON.stringify(fires, null, 2));
        } catch {
        }
        // === HYBRID CONTEXT SYSTEM v3 ===
        // _context ONLY when active workflow (zero overhead otherwise)
        try {
          const wfPath = path.join(STATE_DIR12, "WORKFLOW_STATE.json");
          if (fs.existsSync(wfPath)) {
            const wf = JSON.parse(fs.readFileSync(wfPath, "utf-8"));
            if (wf.status === "active" && wf.current_step && wf.steps) {
              const cur = wf.steps[wf.current_step - 1];
              const done = wf.steps.filter((s: any) => s.status === "done").length;
              const next = wf.current_step < wf.total_steps ? wf.steps[wf.current_step] : null;
              parsed._context = {
                wf: `${wf.workflow_type}:${done}/${wf.total_steps}`,
                step: `${cur?.name || "?"}: ${cur?.intent || "?"}`,
                next: next ? `${next.name}: ${next.intent}` : "FINAL STEP"
              };
            }
          }
        } catch {}
        // === SINGLE-SHOT COMPACTION RECOVERY v3 ===
        // One hijack with lean workflow state, then done. No multi-call injection.
        if (compactionDetectedThisCall) {
          let recoveryLine = "";
          // 1. Try workflow state (most precise)
          try {
            const wfPath = path.join(STATE_DIR12, "WORKFLOW_STATE.json");
            if (fs.existsSync(wfPath)) {
              const wf = JSON.parse(fs.readFileSync(wfPath, "utf-8"));
              if (wf.status === "active" && wf.current_step && wf.steps) {
                const cur = wf.steps[wf.current_step - 1];
                const done = wf.steps.filter((s: any) => s.status === "done").length;
                recoveryLine = `WORKFLOW ACTIVE: ${wf.workflow_type} step ${wf.current_step}/${wf.total_steps} (${done} done). Current: ${cur?.name} — ${cur?.intent}. Next: step ${wf.current_step + 1}.`;
              }
            }
          } catch {}
          // 2. Try session digest (concise summary)
          let digest = "";
          try {
            const digestPath = path.join(STATE_DIR12, "SESSION_DIGEST.md");
            if (fs.existsSync(digestPath)) digest = fs.readFileSync(digestPath, "utf-8").slice(0, 800);
          } catch {}
          // 3. Try survival data (always fresh from every-call write)
          let survival: any = {};
          try {
            const survPath = path.join(STATE_DIR12, "COMPACTION_SURVIVAL.json");
            if (fs.existsSync(survPath)) survival = JSON.parse(fs.readFileSync(survPath, "utf-8"));
          } catch {}
          // 4. CURRENT_POSITION.md as fallback
          let position = "";
          try {
            const cpPath = path.join(PATHS.MCP_SERVER, "data", "docs", "roadmap", "CURRENT_POSITION.md");
            if (fs.existsSync(cpPath)) position = fs.readFileSync(cpPath, "utf-8").slice(0, 1500);
          } catch {}
          const hijacked = {
            _COMPACTION_DETECTED: true,
            _RECOVERY: {
              do: recoveryLine || survival.quick_resume || "Read CURRENT_POSITION.md and continue",
              recent: (survival.recent_actions || []).slice(-5),
              digest: digest || undefined,
              position: !recoveryLine ? position : undefined,
            },
            _original: parsed
          };
          result.content[0].text = JSON.stringify(hijacked);
          compactionDetectedThisCall = false;
          compactionRecoveryCallsRemaining = 0;
          compactionRecoverySurvival = null;
        } else {
          result.content[0].text = JSON.stringify(parsed);
        }
      } catch {
      }
    }
    if (!error && result?.content?.[0]?.text) {
      try {
        const preOutputResult: any = await hookExecutor.execute("pre-output", {
          operation: action2,
          target: { type: "output" as any, id: `${toolName}:${action2}` },
          metadata: { dispatcher: toolName, action: action2, call_number: callNum, content_preview: result.content[0].text.slice(0, 2e3) }
        } as any);
        if (preOutputResult.blocked) {
          result = {
            content: [{
              type: "text",
              text: JSON.stringify({
                blocked: true,
                blocker: preOutputResult.blockedBy,
                reason: preOutputResult.summary || "Output blocked by safety gate",
                _cadence: { call_number: callNum, actions: [...cadence.actions, `\u{1F6D1} OUTPUT_BLOCKED: ${preOutputResult.blockedBy}`] }
              })
            }]
          };
        }
      } catch {
      }
    }
    recordFlightAction(callNum, toolName, action2, args[0], !error, durationMs, result, (error as any)?.message);
    // CRITICAL: Write survival data on EVERY call so compaction recovery always has current state
    try {
      const survivalData = {
        captured_at: new Date().toISOString(),
        call_number: callNum,
        session: process.env.SESSION_ID || "unknown",
        phase: cadence.todo?.taskName || cadence.pressure?.phase || "unknown",
        current_task: `${toolName}:${action2}`,
        recent_actions: recentToolCalls.slice(-10),
        key_findings: cadence.actions.filter((a: string) => !a.startsWith("TODO") && !a.startsWith("PRESSURE")).slice(-5),
        todo_snapshot: cadence.todo?.raw?.slice?.(0, 500) || "",
        quick_resume: `Phase: ${cadence.todo?.taskName || "unknown"}, Call: ${callNum}, Last: ${toolName}:${action2}`,
        next_action: cadence.todo?.nextStep || null,
        error_summary: error ? (error as any).message?.slice(0, 200) : null,
      };
      fs.writeFileSync(path.join(STATE_DIR12, "COMPACTION_SURVIVAL.json"), JSON.stringify(survivalData, null, 2));
      // HOT_RESUME: lean, recent calls only
      const hrPath = path.join(STATE_DIR12, "HOT_RESUME.md");
      const recentStr = recentToolCalls.slice(-8).map(t => `- ${t}`).join("\n");
      fs.writeFileSync(hrPath, `# HOT_RESUME (call ${callNum} — ${new Date().toISOString()})\nLast: ${toolName}:${action2} (${durationMs}ms, ${error ? "FAIL" : "OK"})\n## Recent\n${recentStr}\n`);
      // SESSION_DIGEST: every 10 calls, write concise summary (~500 tokens)
      if (callNum % 10 === 0 && callNum > 0) {
        const digestPath = path.join(STATE_DIR12, "SESSION_DIGEST.md");
        const actions = recentToolCalls.slice(-20);
        const errors = cadence.actions.filter((a: string) => a.includes("ERROR") || a.includes("FAIL")).slice(-3);
        const findings = cadence.actions.filter((a: string) => a.includes("✅") || a.includes("COMPLETE") || a.includes("FIXED")).slice(-5);
        const wfStatus = (() => { try { const wf = JSON.parse(fs.readFileSync(path.join(STATE_DIR12, "WORKFLOW_STATE.json"), "utf-8")); return wf.status === "active" ? `${wf.workflow_type} step ${wf.current_step}/${wf.total_steps}` : "none"; } catch { return "none"; } })();
        fs.writeFileSync(digestPath, `# Session Digest (call ${callNum})\nWorkflow: ${wfStatus}\nPhase: ${survivalData.phase}\n## Last 20 calls\n${actions.map(a => `- ${a}`).join("\n")}\n## Key findings\n${findings.map(f => `- ${f}`).join("\n") || "- none yet"}\n## Errors\n${errors.map(e => `- ${e}`).join("\n") || "- none"}\n`);
      }
    } catch { /* non-fatal */ }
    if (error) throw error;
    return result;
  };
  return wrapped;
}


// registerAutoHookTools: stub — imported by index.ts but was never
// defined (tree-shook away in original build). Providing no-op.
export function registerAutoHookTools(server: any): void {
  // No-op: tool registration handled elsewhere
}
