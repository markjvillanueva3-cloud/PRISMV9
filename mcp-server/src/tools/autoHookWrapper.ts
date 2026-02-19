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
  autoPreCompactionDump,
  autoPreTaskRecon, autoWarmStartData, autoContextRehydrate,
  autoInputValidation, autoErrorLearn, autoD3ErrorChain,
  autoD3LkgUpdate, autoAntiRegression, autoDecisionCapture,
  autoQualityGate, autoVariationCheck,
  autoD4CacheCheck, autoD4DiffCheck, autoD4BatchTick,
  autoTelemetrySnapshot,
  autoPythonCompactionPredict, autoPythonCompress, autoPythonExpand
} from "./cadenceExecutor.js";
import {
  autoSkillHint, autoKnowledgeCrossQuery, autoDocAntiRegression, autoAgentRecommend,
  autoScriptRecommend,
  autoPhaseSkillLoader, autoSkillContextMatch, autoNLHookEvaluator,
  autoHookActivationPhaseCheck, autoD4PerfSummary
} from "./cadenceExecutor.js";
import { slimJsonResponse, slimCadence, getSlimLevel, getCurrentPressurePct } from "../utils/responseSlimmer.js";
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
var hookHistory = [];
var MAX_HISTORY = 1000;
function logHookExecution(execution) {
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
function validateSafetyProof(context) {
  const { tool_name, inputs, result } = context;
  const issues = [];
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
function verifyFactualClaims(content) {
  const detectedClaims = [];
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
  const caveats = [];
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
async function fireHook(hookId, data) {
  const startTime = Date.now();
  try {
    const hookContext = {
      operation: data.tool_name || "unknown",
      phase: "before",
      timestamp: /* @__PURE__ */ new Date(),
      target: {
        type: "calculation",
        data
      },
      metadata: { hookId, ...data }
    };
    const executorResult = await hookExecutor.execute("before", hookContext).catch(() => null);
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
export function wrapToolWithAutoHooks(toolName, handler) {
  if (!AUTO_HOOK_CONFIG.enabled) {
    return handler;
  }
  const wrappedHandler = async (...args) => {
    const context = {
      tool_name: toolName,
      inputs: args[0] || {},
      start_time: Date.now()
    };
    if (AUTO_HOOK_CONFIG.calcTools.includes(toolName)) {
      await fireHook("CALC-BEFORE-EXEC-001", {
        tool_name: toolName,
        event: "calculation:before",
        inputs: context.inputs
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
        inputs: context.inputs
      });
      throw error;
    }
    if (AUTO_HOOK_CONFIG.calcTools.includes(toolName)) {
      await fireHook("CALC-AFTER-EXEC-001", {
        tool_name: toolName,
        event: "calculation:after",
        inputs: context.inputs,
        result: context.result,
        duration_ms: Date.now() - context.start_time
      });
      const proofResult = validateSafetyProof(context);
      await fireHook("INTEL-PROOF-001", {
        tool_name: toolName,
        event: "proof:validate",
        lambda_score: proofResult.validity_score,
        is_valid: proofResult.is_valid,
        issues: proofResult.issues
      });
      if (!proofResult.is_valid && proofResult.validity_score < 0.5) {
        await fireHook("CALC-SAFETY-VIOLATION-001", {
          tool_name: toolName,
          event: "safety:violation",
          score: proofResult.validity_score,
          threshold: AUTO_HOOK_CONFIG.thresholds.lambda_min,
          issues: proofResult.issues
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
        caveats: factResult.caveats
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
var lastCheckpointReminder = 0;
var lastPressureCheck = 0;
var lastCompactionCheck = 0;
var lastAttentionCheck = 0;
var handoffFired = false;
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
var recentToolCalls = [];
var RECENT_ACTIONS_FILE = path.join("C:\\PRISM\\state", "RECENT_ACTIONS.json");
var STATE_DIR12 = "C:\\PRISM\\state";
function buildCurrentTaskDescription(cadence, toolName, action2) {
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
function recordFlightAction(callNum, toolName, action2, params2, success, durationMs, result, errorMsg) {
  try {
    let actions = [];
    if (fs.existsSync(RECENT_ACTIONS_FILE)) {
      try {
        actions = JSON.parse(fs.readFileSync(RECENT_ACTIONS_FILE, "utf-8")).actions || [];
      } catch {
      }
    }
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
    const entry = {
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
    actions.push(entry);
    if (actions.length > MAX_RECORDED_ACTIONS) {
      actions = actions.slice(-MAX_RECORDED_ACTIONS);
    }
    fs.writeFileSync(RECENT_ACTIONS_FILE, JSON.stringify({
      updated: (/* @__PURE__ */ new Date()).toISOString(),
      session_call_count: callNum,
      actions,
      _hint: "READ THIS FIRST after compaction. Shows last 12 tool calls with results."
    }, null, 2));
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
export function wrapWithUniversalHooks(toolName, handler) {
  const wrapped = async function(...args) {
    if (!AUTO_HOOK_CONFIG.enabled) {
      return handler.apply(this, args);
    }
    const startTime = Date.now();
    const action2 = args[0]?.action || "unknown";
    globalDispatchCount++;
    const callNum = globalDispatchCount;
    const cadence = { call_number: callNum, actions: [] };
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
      const isSessionReboot = action2 === "session_boot" && firstCallReconDone;
      if (gapSeconds > 120 && firstCallReconDone || isSessionReboot) {
        compactionDetectedThisCall = true;
        try {
          const rehydrateResult = autoContextRehydrate(callNum);
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
          warnings: recon.warnings,
          recent_errors: recon.recent_errors.length,
          recurring_patterns: recon.recurring_patterns.length,
          registry_status: warmStart.registry_status
        });
        let knowledgeHints = null;
        try {
          knowledgeHints = autoKnowledgeCrossQuery(callNum, toolName, action2, args[0]?.params || {});
          if (knowledgeHints.total_enrichments > 0) {
            cadence.actions.push(`\u{1F9E0} KNOWLEDGE_ENRICHED: ${knowledgeHints.total_enrichments} hints (${knowledgeHints.domain})`);
            cadence.knowledge_hints = knowledgeHints;
          }
        } catch {
        }
        let scriptRecs = null;
        try {
          scriptRecs = autoScriptRecommend(callNum, toolName, action2);
          if (scriptRecs.recommendations.length > 0) {
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
        } catch {
        }
        let rehydrated = null;
        try {
          const rehydrateResult = autoContextRehydrate(callNum);
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
            if (rehydrateResult.age_minutes < 240 && !isLegitBoot) {
              compactionRecoveryCallsRemaining = 1;
              compactionRecoverySurvival = cadence.rehydrated;
              compactionDetectedThisCall = true;
              cadence.actions.push("\u26A0\uFE0F RECOVERY_TRIGGERED: Fresh survival data found on server start \u2014 likely post-compaction");
            }
          }
        } catch {
        }
        globalThis.__prism_recon = {
          recon: recon.warnings,
          warmStart: warmStart.session_info,
          knowledge: knowledgeHints?.total_enrichments ? knowledgeHints : undefined,
          scripts: scriptRecs?.recommendations?.length ? scriptRecs : undefined,
          rehydrated: rehydrated ? cadence.rehydrated : undefined
        };
      } catch {
      }
    }
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
        await hookExecutor.execute(domainPhase, {
          operation: action2,
          target: { type: "dispatcher", id: `${toolName}:${action2}` },
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
      const inputVal = autoInputValidation(callNum, toolName, action2, args[0]?.params || {});
      if (inputVal.warnings.length > 0) {
        cadence.input_validation = inputVal;
        const criticalCount = inputVal.warnings.filter((w) => w.severity === "critical").length;
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
            _cadence: cadence
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
              _cadence: cadence
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
        } catch (err3) {
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
          } catch {
          }
          try {
            const d3Result = autoD3ErrorChain(callNum, toolName, action2, err3.message);
            if (d3Result.success && d3Result.pattern) {
              cadence.actions.push(`\u{1F9E0} D3_ERROR_LEARNED: ${JSON.stringify(d3Result.pattern).slice(0, 60)}`);
            }
          } catch {
          }
          try {
            await hookExecutor.execute("on-error", {
              operation: action2,
              target: { type: "tool", id: `${toolName}:${action2}` },
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
      pfpEngine.recordAction(toolName, action2, pfpOutcome as any, durationMs, error?.constructor?.name, args[0]?.params || {});
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
      const errorClass = error ? error.constructor?.name || "UnknownError" : undefined;
      const payloadSize = result?.content?.[0]?.text?.length || 0;
      const pressurePct = cadence.pressure?.pressure_pct ?? 0;
      telemetryEngine2.record(
        toolName,
        action2,
        telemetryStartMs,
        telemetryEndMs,
        outcome,
        errorClass,
        payloadSize,
        pressurePct
      );
      telemetryEngine2.recordWrapperOverhead(durationMs < 1 ? 0 : 0.1);
    } catch {
    }
    try {
      const { memoryGraphEngine: memoryGraphEngine2 } = await import("../engines/MemoryGraphEngine.js");
      const paramsSummary = typeof args.params === "object" ? JSON.stringify(args.params).slice(0, 200) : String(args.params || "").slice(0, 200);
      const resultSummary = result?.content?.[0]?.text?.slice(0, 200) || "";
      const errorClass = error ? error.constructor?.name || "UnknownError" : undefined;
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
    // H1-MS4: Auto-capture decisions for high-value actions
    logDecisionIfApplicable(toolName, action2, args, result, error, durationMs);
    try {
      const { certificateEngine: certificateEngine2 } = await import("../engines/CertificateEngine.js");
      const validationSteps = [];
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
        { params_summary: (typeof args.params === "object" ? JSON.stringify(args.params) : "").slice(0, 100) }
      );
    } catch {
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
    }
    if (toolName === "prism_dev" && action2 === "build" && !error) {
      try {
        const resultText = result?.content?.[0]?.text;
        if (typeof resultText === "string" && resultText.includes("SUCCESS")) {
          cadence.actions.push("\u2705 BUILD_SUCCESS \u2014 Phase checklist REQUIRED: skills\u2192hooks\u2192GSD\u2192memories\u2192orchestrators\u2192state\u2192scripts");
          cadence.actions.push("\u26A0\uFE0F RESTART REQUIRED: New build must be loaded. Restart Claude app or the changes won't take effect. Current session still runs OLD code.");
          const checklistPath = path.join("C:\\PRISM\\state", "build_checklist.json");
          fs.writeFileSync(checklistPath, JSON.stringify({
            build_at: (/* @__PURE__ */ new Date()).toISOString(),
            build_call: callNum,
            completed: { skills: false, hooks: false, gsd: false, memories: false, orchestrators: false, state: false, scripts: false }
          }, null, 2));
          try {
            const syncOut = execSync(`py -3 "${path.join("C:\\PRISM\\scripts\\core", "gsd_sync_v2.py")}" --apply --json`, {
              encoding: "utf-8",
              timeout: 15e3,
              cwd: "C:\\PRISM\\scripts\\core"
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
          let scoreField = null;
          let scoreValue = null;
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
          if (scoreField && scoreValue !== null) {
            const stateFile = path.join("C:\\PRISM\\state", "CURRENT_STATE.json");
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
          target: { type: "tool", id: `${toolName}:${action2}` },
          metadata: { dispatcher: toolName, action: action2, call_number: callNum, duration_ms: durationMs, success: true }
        });
      } catch {
      }
      if (mapping?.category === "AGENT" || mapping?.category === "ORCH") {
        try {
          const domainPhase = mapping.category === "ORCH" ? "post-swarm-complete" : "post-agent-execute";
          await hookExecutor.execute(domainPhase, {
            operation: action2,
            target: { type: "dispatcher", id: `${toolName}:${action2}` },
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
        const extDir = path.join("C:\\PRISM\\state", "externalized");
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
    accumulatedResultBytes += resultBytes;
    totalResultCount++;
    if (resultBytes > largestResultBytes) largestResultBytes = resultBytes;
    const avgResultBytes = totalResultCount > 0 ? Math.round(accumulatedResultBytes / totalResultCount) : 0;
    let classifiedDomain;
    const mfgDispatchers = ["prism_calc", "prism_safety", "prism_thread", "prism_toolpath", "prism_data", "prism_orchestrate", "prism_atcs"];
    if (!error && mfgDispatchers.includes(toolName)) {
      try {
        const agentRec = autoAgentRecommend(callNum, toolName, action2, args[0]?.params || {});
        if (agentRec.hint) {
          cadence.actions.push(`\u{1F916} AGENT_REC: ${agentRec.hint}`);
          cadence.agent_recommend = agentRec;
        }
        classifiedDomain = agentRec.classification?.domain;
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
        const resultStr = typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
        const templateMatch = autoResponseTemplate(toolName, action2, resultStr, pressurePct);
        if (templateMatch) {
          cadence.actions.push(`\u{1F4CB} TEMPLATE: ${templateMatch.template_id} (${templateMatch.size_level})`);
          cadence.response_template = templateMatch;
        }
      } catch {
      }
    }
    if (callNum - lastTodoReminder >= 5) {
      lastTodoReminder = callNum;
      const todoResult = autoTodoRefresh(callNum);
      cadence.actions.push(todoResult.success ? "TODO_AUTO_REFRESHED" : "TODO_REFRESH_FAILED");
      cadence.todo = todoResult;
      // H1: Also write HOT_RESUME at todo cadence (every 5 calls, more frequent than checkpoint@10)
      try {
        const hrPath5 = "C:\\PRISM\\state\\HOT_RESUME.md";
        const cpPath5 = "C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md";
        let pos5 = ""; try { pos5 = fs.existsSync(cpPath5) ? fs.readFileSync(cpPath5, "utf-8").slice(0, 1500) : ""; } catch {}
        let errs5 = ""; try { const ep = "C:\\PRISM\\state\\ERROR_LOG.jsonl"; if (fs.existsSync(ep)) { const el = fs.readFileSync(ep, "utf-8").trim().split("\n").filter(Boolean).slice(-3); errs5 = el.map(l => { try { const e = JSON.parse(l); return `${e.tool_name}:${e.action} — ${(e.error_message||"").slice(0,80)}`; } catch { return ""; }}).filter(Boolean).join(" | "); } } catch {}
        const ra5 = (() => { try { return JSON.parse(fs.readFileSync(RECENT_ACTIONS_FILE, "utf-8")).actions?.slice(-8)?.map((a: any) => `${a.tool}:${a.action} ${a.success?"✓":"✗"} ${a.duration_ms}ms`).join("\n") || ""; } catch { return ""; } })();
        fs.writeFileSync(hrPath5, `# HOT_RESUME (auto call ${callNum} — ${new Date().toISOString()})\n\n## Position\n${pos5}\n\n## Recent\n${ra5}\n${errs5 ? "\n## Errors\n" + errs5 + "\n" : ""}\n## Recovery\nContinue task above. Transcripts: /mnt/transcripts/\n`);
      } catch {}
      await fireHook("STATE-SESSION-BOUNDARY-001", {
        event: "cadence_todo_executed",
        call_number: callNum,
        success: todoResult.success,
        preview: todoResult.todo_preview
      });
      try {
        const currentTask = buildCurrentTaskDescription(cadence, toolName, action2);
        const pct = cadence.pressure?.pressure_pct || 0;
        const manifestResult = autoRecoveryManifest(callNum, pct, cadence.actions, currentTask);
        if (manifestResult.success) cadence.actions.push("\u{1F4CB} RECOVERY_MANIFEST_SAVED");
      } catch {
      }
    }
    if (callNum - lastCheckpointReminder >= 10) {
      lastCheckpointReminder = callNum;
      const cpResult = autoCheckpoint(callNum);
      cadence.actions.push(cpResult.success ? `CHECKPOINT_AUTO_SAVED:${cpResult.checkpoint_id}` : "CHECKPOINT_FAILED");
          // TOKEN OPT v2: Write HOT_RESUME.md at checkpoint cadence
          try {
            const hrPath = "C:\\PRISM\\state\\HOT_RESUME.md";
            const cpPath = "C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md";
            let positionContent = "";
            try { positionContent = fs.existsSync(cpPath) ? fs.readFileSync(cpPath, "utf-8").slice(0, 1500) : ""; } catch {}
            // Read recent errors for context
            let recentErrors = "";
            try {
              const errPath = "C:\\PRISM\\state\\ERROR_LOG.jsonl";
              if (fs.existsSync(errPath)) {
                const errLines = fs.readFileSync(errPath, "utf-8").trim().split("\n").filter(Boolean).slice(-3);
                const errs = errLines.map(l => { try { const e = JSON.parse(l); return `${e.tool_name}:${e.action} — ${(e.error_message||"").slice(0,80)}`; } catch { return ""; } }).filter(Boolean);
                if (errs.length) recentErrors = "Recent errors: " + errs.join(" | ");
              }
            } catch {}
            const hotContent = [
              "# HOT_RESUME (auto-generated call " + callNum + " — " + new Date().toISOString() + ")",
              "",
              "## Position",
              positionContent,
              "",
              "## Recent Activity",
              (() => { try { const ra = JSON.parse(fs.readFileSync(RECENT_ACTIONS_FILE, "utf-8")).actions || []; return ra.slice(-8).map((a: any) => `${a.tool}:${a.action} ${a.success?"✓":"✗"} ${a.duration_ms}ms`).join("\n"); } catch { return "unavailable"; } })(),
              "",
              recentErrors ? "## Errors\n" + recentErrors + "\n" : "",
              "## Recovery",
              "Continue the task in Position above. Do NOT re-audit or ask user what to do.",
              "Transcripts: /mnt/transcripts/"
            ].join("\n");
            fs.writeFileSync(hrPath, hotContent);
          } catch {}
      cadence.checkpoint = cpResult;
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
      if (pressureResult.pressure_pct >= 70) {
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
          recommendations: compressResult.recommendations
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
        signals: compactResult.signals,
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
          const fpPath = path.join("C:\\PRISM\\state", "failure_patterns.jsonl");
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
            regressions: regrResult.regressions,
            old_metrics: regrResult.old_metrics,
            new_metrics: regrResult.new_metrics
          });
        }
      } catch {
      }
    }
    const isFileWrite = toolName === "prism_dev" && action2 === "file_write" || toolName === "prism_doc" && (action2 === "write" || action2 === "append");
    if (isFileWrite && args[0]?.params?.content && (args[0]?.params?.path || args[0]?.params?.name)) {
      try {
        const docPath = args[0].params.path || path.join("C:\\PRISM\\mcp-server\\data\\docs", args[0].params.name);
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
    }
    if (callNum % 8 === 0) {
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
        const { synergyCrossEngineHealth: synergyCrossEngineHealth2 } = await import("../engines/synergyIntegration.js");
        const health = synergyCrossEngineHealth2();
        if (!health.all_healthy) {
          const degraded = Object.entries(health.engines).filter(([, v]) => v.status !== "healthy").map(([k]) => k);
          cadence.actions.push(`\u26A0\uFE0F ENGINE_HEALTH: ${degraded.join(", ")} degraded`);
        }
      } catch {
      }
    }
    if (callNum === 1 && globalThis.__prism_recon) {
      cadence.session_recon = globalThis.__prism_recon;
      delete globalThis.__prism_recon;
    }
    if (callNum > 0 && callNum % 15 === 0) {
      try {
        const currentTask = cadence.todo?.currentFocus || cadence.todo?.taskName || "unknown";
        const pct = cadence.pressure?.pressure_pct || 50;
        const survResult = autoCompactionSurvival(callNum, pct, cadence.actions, currentTask);
        if (survResult.success) cadence.actions.push("SURVIVAL_CHECKPOINT_15");
      } catch {
      }
    }
    if (callNum > 0 && callNum % 25 === 0) {
      try {
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
    }
    try {
      const ctxMatch = autoSkillContextMatch(callNum, toolName, action, params);
      if (ctxMatch.success && ctxMatch.total_matched > 0) {
        cadence.actions.push(`\u{1F3AF} SKILL_MATCH: ${ctxMatch.total_matched} skills matched for ${ctxMatch.context_key}`);
        cadence.skill_context_matches = ctxMatch;
      }
    } catch {
    }
    if (callNum > 0 && callNum % 8 === 0) {
      try {
        fs.appendFileSync(path.join("C:\\PRISM\\state", "nl_hook_debug.log"), `[${new Date().toISOString()}] CALLSITE: call=${callNum} tool=${toolName} action=${action2}\n`);
        const nlResult = autoNLHookEvaluator(callNum, toolName, action2);
        if (nlResult.success && nlResult.hooks_fired > 0) {
          cadence.actions.push(`\u{1FA9D} NL_HOOKS: ${nlResult.hooks_fired}/${nlResult.hooks_evaluated} fired`);
          cadence.nl_hook_eval = nlResult;
          fs.appendFileSync(path.join("C:\\PRISM\\state", "nl_hook_debug.log"), `  -> result: success=${nlResult.success} fired=${nlResult.hooks_fired} evaluated=${nlResult.hooks_evaluated}\n`);
        }
      } catch {
      }
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
        const autoSaveState = {};
        const stateFile = path.join("C:\\PRISM\\state", "CURRENT_STATE.json");
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
          const atcsDir = "C:\\PRISM\\autonomous-tasks";
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
    }
    if (cadence.actions.length > 0 && result?.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(result.content[0].text);
        const fullCadence = { call_number: cadence.call_number, actions: cadence.actions };
        for (const [k, v] of Object.entries(cadence)) {
          if (k === "call_number" || k === "actions") continue;
          if (v != null && v !== "" && !(Array.isArray(v) && v.length === 0)) fullCadence[k] = v;
        }
        const pressurePct = cadence.pressure?.pressure_pct ?? 0;
        parsed._cadence = slimCadence(fullCadence, pressurePct);
        try {
          const cadenceFiresPath = path.join("C:\\PRISM\\state", "CADENCE_FIRES.json");
          let fires = {};
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
          }
          fires._last_call = callNum;
          fires._updated = (/* @__PURE__ */ new Date()).toISOString();
          if (callNum % 5 === 0) fs.writeFileSync(cadenceFiresPath, JSON.stringify(fires, null, 2));
        } catch {
        }
        try {
          const survivalPath = path.join("C:\\PRISM\\state", "COMPACTION_SURVIVAL.json");
          const actionsPath = path.join("C:\\PRISM\\state", "RECENT_ACTIONS.json");
          const trackerPath = path.join("C:\\PRISM\\mcp-server\\data\\docs", "ACTION_TRACKER.md");
          let ctx = { call: callNum };
          // SURVIVAL_READ REMOVED v2
          // TRACKER_CTX REMOVED v2
          // transcripts_hint REMOVED ? static waste
          try {
            const wfPath = path.join(STATE_DIR12, "WORKFLOW_STATE.json");
            if (fs.existsSync(wfPath)) {
              const wf = JSON.parse(fs.readFileSync(wfPath, "utf-8"));
              if (wf.status === "active" && wf.current_step && wf.steps) {
                const cur = wf.steps[wf.current_step - 1];
                const done = wf.steps.filter((s) => s.status === "done").length;
                ctx.workflow = `${wf.workflow_type}:${wf.current_step}/${wf.total_steps} ${cur?.name || "?"} \u2014 ${cur?.intent || "?"}`;
                ctx.task = `${wf.workflow_type} step ${wf.current_step}/${wf.total_steps}: ${cur?.name || "?"} \u2014 ${cur?.intent || "?"}`;
                ctx.next = wf.current_step < wf.total_steps ? `Step ${wf.current_step + 1}: ${wf.steps[wf.current_step]?.name} \u2014 ${wf.steps[wf.current_step]?.intent}` : "Final step \u2014 complete workflow after this";
              }
            }
          } catch {
          }
          if (ctx.resume || ctx.task || ctx.next || ctx.workflow) {
            // _hint REMOVED ? static waste, points stale
            if (cadence.agent_recommend?.classification) {
              const c = cadence.agent_recommend.classification;
              if (c.recommended_agents?.length > 0 || c.recommended_swarm) {
                ctx.agent_hint = cadence.agent_recommend.hint;
              }
            }
            if (cadence.skill_hints?.bundle_name) {
              const sh = cadence.skill_hints;
              ctx.skill_bundle = `\u{1F4E6} ${sh.bundle_name} (${sh.loaded_excerpts} skills, ${sh.pressure_mode || "full"})${sh.chain_suggestion ? ` | chain: ${sh.chain_suggestion}` : ""}`;
            }
            if (cadence.agent_recommend?.atcs_recommendation?.suggested) {
              const atcs = cadence.agent_recommend.atcs_recommendation;
              ctx.atcs_hint = `\u{1F504} ATCS RECOMMENDED: ${atcs.reason} (~${atcs.estimated_units} units). Consider: prism_atcs\u2192task_init to manage this as autonomous multi-unit task.`;
            }
            try {
              const bridge = getBridgeStatus();
              if (bridge.active_delegations > 0) {
                ctx.manus_bridge = `\u{1F916} ${bridge.active_delegations} delegated units (${bridge.by_status.running || 0} running, ${bridge.by_status.completed || 0} ready). Auto-completing on next poll cycle.`;
              }
            } catch {
            }
            // _wip_reminder REMOVED v2
            parsed._context = ctx;
          }
        } catch {
        }
        const recoveryData = cadence.rehydrated || compactionRecoverySurvival;
        if (recoveryData && compactionRecoveryCallsRemaining > 0) {
          const nextAction = recoveryData.next_action || "Run prism_gsd\u2192quick_resume then prism_context\u2192todo_read";
          parsed._COMPACTION_RECOVERY = { _read: "C:\\PRISM\\state\\HOT_RESUME.md", rule: "Read HOT_RESUME.md via Shell then continue." };
          compactionRecoveryCallsRemaining--;
          if (compactionRecoveryCallsRemaining <= 0) compactionRecoverySurvival = null;
        }
        if (compactionDetectedThisCall) {
          // TOKEN OPT v2: Lean compaction recovery
          // Read CURRENT_POSITION.md (always fresh, ~1KB) instead of 5 stale state files
          let hotResume = "";
          try {
            const cpPath = "C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md";
            if (fs.existsSync(cpPath)) {
              hotResume = fs.readFileSync(cpPath, "utf-8").slice(0, 2000);
            }
          } catch {}
          
          // Also read HOT_RESUME.md if it exists (auto-maintained by cadence)
          let hotResumeExtra = "";
          try {
            const hrPath = "C:\\PRISM\\state\\HOT_RESUME.md";
            if (fs.existsSync(hrPath)) {
              hotResumeExtra = fs.readFileSync(hrPath, "utf-8").slice(0, 3000);
            }
          } catch {}
          
          const hijacked = {
            _COMPACTION_DETECTED: true,
            _RECOVERY: {
              instruction: "Read HOT_RESUME below, then continue seamlessly. Do NOT ask user what happened.",
              position: hotResume,
              context: hotResumeExtra,
            },
            _original: parsed
          };
          result.content[0].text = JSON.stringify(hijacked);
          compactionDetectedThisCall = false;
        } else {
          result.content[0].text = JSON.stringify(parsed);
        }
      } catch {
      }
    }
    if (!error && result?.content?.[0]?.text) {
      try {
        const preOutputResult = await hookExecutor.execute("pre-output", {
          operation: action2,
          target: { type: "output", id: `${toolName}:${action2}` },
          content: { text: result.content[0].text.slice(0, 2e3) },
          // Cap context sent to hooks
          metadata: { dispatcher: toolName, action: action2, call_number: callNum }
        });
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
    recordFlightAction(callNum, toolName, action2, args[0], !error, durationMs, result, error?.message);
    // CRITICAL: Write survival data on EVERY call so compaction recovery always has current state
    try {
      const survivalData = {
        captured_at: new Date().toISOString(),
        call_number: callNum,
        session: process.env.SESSION_ID || "unknown",
        phase: cadence.todo?.taskName || cadence.pressure?.phase || "unknown",
        current_task: `Working with ${toolName}:${action2} (call ${callNum})`,
        recent_actions: recentToolCalls.slice(-10),
        key_findings: cadence.actions.filter((a: string) => !a.startsWith("TODO") && !a.startsWith("PRESSURE")).slice(-5),
        active_files: [],
        todo_snapshot: cadence.todo?.raw?.slice?.(0, 1000) || "",
        quick_resume: `Phase: ${cadence.todo?.taskName || "unknown"}, Call: ${callNum}, Last: ${toolName}:${action2}`,
        next_action: cadence.todo?.nextStep || null,
      };
      fs.writeFileSync(path.join(STATE_DIR12, "COMPACTION_SURVIVAL.json"), JSON.stringify(survivalData, null, 2));
      // Also keep HOT_RESUME.md current on every call
      const hrPath = path.join(STATE_DIR12, "HOT_RESUME.md");
      const recentStr = recentToolCalls.slice(-8).map(t => `- ${t}`).join("\n");
      const hotContent = `# HOT_RESUME (auto call ${callNum} — ${new Date().toISOString()})\n\n## What Just Happened\nLast call: ${toolName}:${action2} (call ${callNum}, ${durationMs}ms, ${error ? "FAILED" : "OK"})\n\n## Recent Calls\n${recentStr}\n\n## Cadence Actions This Call\n${cadence.actions.slice(-5).map((a: string) => `- ${a}`).join("\n")}\n\n## Recovery\nRead ACTION_TRACKER.md for pending items. Transcripts: /mnt/transcripts/\n`;
      fs.writeFileSync(hrPath, hotContent);
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
