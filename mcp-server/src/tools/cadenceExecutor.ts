/**
 * PRISM Cadence Executor — Auto-fire side-channel
 * =================================================
 * 
 * PURPOSE: Execute todo_update and auto_checkpoint DIRECTLY from disk,
 * bypassing dispatchers to avoid recursive hook loops.
 * 
 * IMPORTED BY: autoHookWrapper.ts ONLY
 * IMPORTS FROM: nothing in dispatchers (zero circular dependency)
 * 
 * @version 1.0.0
 * @date 2026-02-07
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type {
  CompactionSurvivalData,
  TodoRefreshResult,
  CheckpointResult,
  ContextPressureResult,
  CompactionDetectResult,
  ContextCompressResult,
  ErrorLearnResult,
  ReconResult,
  QualityGateResult,
  AntiRegressionResult,
  CodeMetrics,
  DecisionCaptureResult,
  WarmStartResult,
  VariationCheckResult,
  SkillHintResult,
  KnowledgeCrossQueryResult,
  ContextPullBackResult,
  ValidationWarning,
  InputValidationResult,
  ScriptRecommendResult,
} from "../types/prism-schema.js";
import { classifyTask, type TaskClassification } from "../engines/TaskAgentClassifier.js";

const STATE_DIR = "C:\\PRISM\\state";
const SCRIPTS_DIR = "C:\\PRISM\\scripts\\core";
const PYTHON = "C:\\Users\\Admin.DIGITALSTORM-PC\\AppData\\Local\\Programs\\Python\\Python312\\python.exe";
const TODO_FILE = path.join(STATE_DIR, "todo.md");
const CURRENT_STATE_FILE = path.join(STATE_DIR, "CURRENT_STATE.json");
const EVENT_LOG_FILE = path.join(STATE_DIR, "session_events.jsonl");

// Ensure state dir exists
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

/** P2-001: Append event to immutable log (used by cadence functions) */
function appendEventLine(type: string, data: Record<string, any>): void {
  try {
    const event = { ts: new Date().toISOString(), type, ...data };
    fs.appendFileSync(EVENT_LOG_FILE, JSON.stringify(event) + "\n");
  } catch { /* non-fatal */ }
}
// ============================================================================
// AUTO TODO REFRESH
// ============================================================================

// TodoRefreshResult — imported from prism-schema

export function autoTodoRefresh(callNumber: number): TodoRefreshResult {
  try {
    if (!fs.existsSync(TODO_FILE)) {
      // Create minimal todo if none exists
      const minimal = `# PRISM Active Task: Session Active\n## Auto-refreshed at call ${callNumber}\n> No task defined yet — call prism_context todo_update to set one.\n`;
      fs.writeFileSync(TODO_FILE, minimal);
      return {
        success: true,
        call_number: callNumber,
        todo_preview: minimal.slice(0, 200),
      };
    }

    // Read existing todo
    let content = fs.readFileSync(TODO_FILE, "utf-8");

    // Update the timestamp line if present
    const tsRegex = /Updated: \d{4}-\d{2}-\d{2}T[\d:.]+Z/;
    const newTs = `Updated: ${new Date().toISOString()}`;
    if (tsRegex.test(content)) {
      content = content.replace(tsRegex, newTs);
    }

    // Append cadence marker at bottom
    const marker = `\n---\n_Auto-refreshed at dispatch #${callNumber} | ${new Date().toISOString()}_\n`;
    // Remove previous auto-refresh marker if present
    content = content.replace(/\n---\n_Auto-refreshed at dispatch #\d+.*\n/g, "");
    content += marker;

    fs.writeFileSync(TODO_FILE, content);

    // Extract focus line for attention anchoring
    const focusMatch = content.match(/> (.+)/);
    const focus = focusMatch ? focusMatch[1] : "No focus set";

    return {
      success: true,
      call_number: callNumber,
      todo_preview: `FOCUS: ${focus} | Progress: ${(content.match(/\[x\]/g) || []).length}/${(content.match(/\[[ x]\]/g) || []).length} steps`,
    };
  } catch (err: any) {
    return {
      success: false,
      call_number: callNumber,
      todo_preview: "",
      error: err.message,
    };
  }
}

// ============================================================================
// AUTO CHECKPOINT
// ============================================================================

// CheckpointResult — imported from prism-schema

function getZone(callNum: number): string {
  // v2 PRESSURE-FIRST zones — advisory only, no cap overrides
  // Actual truncation governed solely by pressure-based system in autoHookWrapper
  if (callNum >= 41) return "⚫ BLACK";
  if (callNum >= 31) return "🔴 RED";
  if (callNum >= 21) return "🟡 YELLOW";
  return "🟢 GREEN";
}

export function autoCheckpoint(callNumber: number): CheckpointResult {
  const zone = getZone(callNumber);

  try {
    const checkpointId = `CP-${new Date().toISOString().replace(/[:-]/g, "").split(".")[0]}`;

    let state: any = {};
    if (fs.existsSync(CURRENT_STATE_FILE)) {
      try {
        state = JSON.parse(fs.readFileSync(CURRENT_STATE_FILE, "utf-8"));
      } catch {
        state = {};
      }
    }

    // Update state with checkpoint info
    state.currentSession = state.currentSession || {};
    state.currentSession.progress = state.currentSession.progress || {};
    state.currentSession.progress.lastCheckpoint = checkpointId;
    state.currentSession.progress.checkpointTime = new Date().toISOString();
    state.currentSession.progress.toolCalls = callNumber;
    state.currentSession.progress.zone = zone;
    state.lastUpdated = new Date().toISOString();

    fs.writeFileSync(CURRENT_STATE_FILE, JSON.stringify(state, null, 2));
    appendEventLine("cadence_checkpoint", { checkpoint_id: checkpointId, zone, call_number: callNumber });

    return {
      success: true,
      call_number: callNumber,
      zone,
      checkpoint_id: checkpointId,
    };
  } catch (err: any) {
    return {
      success: false,
      call_number: callNumber,
      zone,
      checkpoint_id: null,
      error: err.message,
    };
  }
}


// ============================================================================
// CONTEXT PRESSURE MONITORING — Side-channel token tracking
// ============================================================================

const CONTEXT_PRESSURE_FILE = path.join(STATE_DIR, "context_pressure.json");

// Approximate tokens per byte (conservative: ~4 chars per token)
const BYTES_PER_TOKEN = 4;
// Claude context window ~200k tokens, but practical limit before compaction ~150k
const MAX_TOKENS_ESTIMATE = 150000;

// ContextPressureResult — imported from prism-schema

export function autoContextPressure(callNumber: number, accumulatedBytes: number): ContextPressureResult {
  try {
    // GAP-B5: Include system prompt overhead (~120KB ≈ 30K tokens) in pressure estimation
    const SYSTEM_PROMPT_OVERHEAD_BYTES = 120000;
    const estimatedTokens = Math.round((SYSTEM_PROMPT_OVERHEAD_BYTES + accumulatedBytes) / BYTES_PER_TOKEN);
    const pressurePct = Math.round((estimatedTokens / MAX_TOKENS_ESTIMATE) * 100);

    let zone: string;
    let recommendation: string;

    if (pressurePct >= 85) {
      zone = "⚫ CRITICAL";
      recommendation = "COMPRESS NOW — compaction imminent. Drop verbose results, externalize memory.";
    } else if (pressurePct >= 70) {
      zone = "🔴 HIGH";
      recommendation = "Compress context. Use terse responses. Externalize large data to disk.";
    } else if (pressurePct >= 50) {
      zone = "🟡 MODERATE";
      recommendation = "Monitor closely. Avoid large result sets. Consider memory_externalize for big data.";
    } else {
      zone = "🟢 LOW";
      recommendation = "Context healthy. Normal operations.";
    }

    // Persist pressure state to disk for cross-call tracking
    const pressureState = {
      call_number: callNumber,
      accumulated_bytes: accumulatedBytes,
      estimated_tokens: estimatedTokens,
      pressure_pct: pressurePct,
      zone,
      timestamp: new Date().toISOString(),
      history: [] as any[],
    };

    // Load previous history
    if (fs.existsSync(CONTEXT_PRESSURE_FILE)) {
      try {
        const prev = JSON.parse(fs.readFileSync(CONTEXT_PRESSURE_FILE, "utf-8"));
        pressureState.history = (prev.history || []).slice(-20); // Keep last 20
      } catch { /* fresh start */ }
    }
    pressureState.history.push({ call: callNumber, pct: pressurePct, zone, ts: pressureState.timestamp });
    fs.writeFileSync(CONTEXT_PRESSURE_FILE, JSON.stringify(pressureState, null, 2));

    return {
      success: true,
      call_number: callNumber,
      accumulated_bytes: accumulatedBytes,
      estimated_tokens: estimatedTokens,
      pressure_pct: pressurePct,
      zone,
      recommendation,
    };
  } catch (err: any) {
    return {
      success: false,
      call_number: callNumber,
      accumulated_bytes: accumulatedBytes,
      estimated_tokens: 0,
      pressure_pct: 0,
      zone: "UNKNOWN",
      recommendation: `Pressure check failed: ${err.message}`,
    };
  }
}


// ============================================================================
// COMPACTION DETECTION — Early warning for context window exhaustion
// ============================================================================

const COMPACTION_LOG_FILE = path.join(STATE_DIR, "compaction_log.json");

// CompactionDetectResult — imported from prism-schema

export function autoCompactionDetect(
  callNumber: number,
  metrics: {
    accumulatedBytes: number;
    avgResultBytes: number;
    largestResultBytes: number;
    callsSinceCheckpoint: number;
  }
): CompactionDetectResult {
  try {
    const signals: string[] = [];
    let riskScore = 0;

    const estTokens = metrics.accumulatedBytes / BYTES_PER_TOKEN;
    const pct = estTokens / MAX_TOKENS_ESTIMATE;

    // Signal 1: Raw pressure
    if (pct >= 0.85) { riskScore += 0.4; signals.push(`Context at ${Math.round(pct*100)}% capacity`); }
    else if (pct >= 0.65) { riskScore += 0.2; signals.push(`Context at ${Math.round(pct*100)}% — trending high`); }

    // Signal 2: Large average results (bloating fast)
    if (metrics.avgResultBytes > 5000) { riskScore += 0.15; signals.push(`Avg result ${Math.round(metrics.avgResultBytes/1024)}KB — consider terse mode`); }
    if (metrics.avgResultBytes > 15000) { riskScore += 0.15; signals.push(`Avg result very large — material_search returns are huge`); }

    // Signal 3: Monster single result
    if (metrics.largestResultBytes > 50000) { riskScore += 0.1; signals.push(`Largest result ${Math.round(metrics.largestResultBytes/1024)}KB — should externalize`); }

    // Signal 4: Too many calls without checkpoint
    if (metrics.callsSinceCheckpoint > 15) { riskScore += 0.1; signals.push(`${metrics.callsSinceCheckpoint} calls since last checkpoint`); }

    // Signal 5: High call count (v2: raised from 15 to 30)
    if (callNumber >= 30) { riskScore += 0.15; signals.push(`${callNumber} total calls — monitor pressure`); }

    riskScore = Math.min(1, riskScore);

    let riskLevel: CompactionDetectResult["risk_level"];
    if (riskScore >= 0.7) riskLevel = "IMMINENT";
    else if (riskScore >= 0.5) riskLevel = "HIGH";
    else if (riskScore >= 0.3) riskLevel = "MODERATE";
    else if (riskScore >= 0.1) riskLevel = "LOW";
    else riskLevel = "NONE";

    // Log to disk
    const logEntry = {
      call_number: callNumber,
      risk_level: riskLevel,
      risk_score: Math.round(riskScore * 100) / 100,
      signals,
      timestamp: new Date().toISOString(),
    };
    let logHistory: any[] = [];
    if (fs.existsSync(COMPACTION_LOG_FILE)) {
      try { logHistory = JSON.parse(fs.readFileSync(COMPACTION_LOG_FILE, "utf-8")); } catch { logHistory = []; }
    }
    logHistory.push(logEntry);
    if (logHistory.length > 50) logHistory = logHistory.slice(-50);
    fs.writeFileSync(COMPACTION_LOG_FILE, JSON.stringify(logHistory, null, 2));

    return {
      success: true,
      call_number: callNumber,
      risk_level: riskLevel,
      risk_score: Math.round(riskScore * 100) / 100,
      signals,
      action_required: riskScore >= 0.5,
    };
  } catch (err: any) {
    return {
      success: false,
      call_number: callNumber,
      risk_level: "NONE",
      risk_score: 0,
      signals: [`Detection failed: ${err.message}`],
      action_required: false,
    };
  }
}

// ============================================================================
// AUTO CONTEXT COMPRESS — Emergency state snapshot + cleanup recommendations
// ============================================================================

const COMPRESS_SNAPSHOT_FILE = path.join(STATE_DIR, "context_snapshot.json");

// ContextCompressResult — imported from prism-schema

export function autoContextCompress(
  callNumber: number,
  sessionSummary: {
    task: string;
    completedSteps: string[];
    pendingSteps: string[];
    keyFindings: string[];
    activeFiles: string[];
  }
): ContextCompressResult {
  try {
    const recommendations: string[] = [];

    // Save compressed snapshot to disk for recovery
    const snapshot = {
      call_number: callNumber,
      timestamp: new Date().toISOString(),
      task: sessionSummary.task,
      completed: sessionSummary.completedSteps,
      pending: sessionSummary.pendingSteps,
      findings: sessionSummary.keyFindings,
      files: sessionSummary.activeFiles,
    };
    fs.writeFileSync(COMPRESS_SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));

    // Generate cleanup recommendations
    recommendations.push("Drop previous tool result payloads from context — snapshot saved to disk");
    recommendations.push("Use terse mode for remaining tool calls (add _terse:true to params)");
    recommendations.push("Avoid material_search with broad queries — use material_get with specific IDs");
    
    if (sessionSummary.completedSteps.length > 3) {
      recommendations.push(`${sessionSummary.completedSteps.length} steps done — summarize and drop step-by-step history`);
    }
    if (sessionSummary.activeFiles.length > 5) {
      recommendations.push("Multiple files in play — externalize file contents to disk references");
    }

    // Estimate bytes that could be freed
    const bytesExt = (sessionSummary.completedSteps.length * 2000) + (sessionSummary.keyFindings.length * 500);

    return {
      success: true,
      call_number: callNumber,
      snapshot_saved: true,
      recommendations,
      bytes_externalizable: bytesExt,
    };
  } catch (err: any) {
    return {
      success: false,
      call_number: callNumber,
      snapshot_saved: false,
      recommendations: [`Compress failed: ${err.message}`],
      bytes_externalizable: 0,
    };
  }
}


// ============================================================================
// GAP 1: ERROR AUTO-LEARN — Persist errors to failure_library automatically
// ============================================================================

const FAILURE_PATTERNS_PATH = path.join(STATE_DIR, "failure_patterns.jsonl");
const ERROR_LOG_PATH = path.join(STATE_DIR, "error_log.jsonl");

// ErrorLearnResult — imported from prism-schema

function categorizeError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (msg.includes("not a function") || msg.includes("undefined")) return "stale-reference";
  if (msg.includes("cannot find") || msg.includes("not found")) return "missing-data";
  if (msg.includes("type") && (msg.includes("error") || msg.includes("mismatch"))) return "type-error";
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (msg.includes("permission") || msg.includes("access denied")) return "permission-denied";
  if (msg.includes("build") || msg.includes("compile") || msg.includes("esbuild")) return "build-error";
  if (msg.includes("validation") || msg.includes("invalid")) return "validation-failure";
  if (msg.includes("off by") || msg.includes("index")) return "off-by-one";
  if (msg.includes("unit") || msg.includes("conversion")) return "wrong-unit";
  return "uncategorized";
}

function inferDomain(toolName: string, action: string): string {
  if (toolName.includes("calc") || toolName.includes("safety")) return "calculations";
  if (toolName.includes("data")) return "materials";
  if (toolName.includes("session") || toolName.includes("context")) return "state-management";
  if (toolName.includes("hook") || toolName.includes("generator")) return "hooks";
  if (toolName.includes("dev")) return "build-system";
  if (toolName.includes("doc")) return "file-operations";
  if (toolName.includes("orchestrat") || toolName.includes("manus")) return "orchestration";
  if (toolName.includes("skill") || toolName.includes("script")) return "tool-routing";
  return "other";
}

export function autoErrorLearn(
  callNumber: number,
  toolName: string,
  action: string,
  errorMessage: string,
  params: Record<string, any> = {}
): ErrorLearnResult {
  try {
    const errorType = categorizeError(errorMessage);
    const domain = inferDomain(toolName, action);
    const errorId = `ERR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

    // 1. Append to error_log.jsonl
    const errorEntry = {
      id: errorId, timestamp: new Date().toISOString(),
      error_message: errorMessage, tool_name: toolName, action,
      error_type: errorType, domain, call_number: callNumber,
      parameters: Object.keys(params).slice(0, 5).reduce((o: any, k) => { o[k] = typeof params[k] === "string" ? params[k].slice(0, 100) : params[k]; return o; }, {}),
    };
    fs.appendFileSync(ERROR_LOG_PATH, JSON.stringify(errorEntry) + "\n");
    appendEventLine("error", { error_id: errorEntry.id, tool: errorEntry.tool_name, action: errorEntry.action, message: errorMessage.slice(0, 200) });

    // 2. Check/update failure_patterns.jsonl
    let patterns: any[] = [];
    if (fs.existsSync(FAILURE_PATTERNS_PATH)) {
      patterns = fs.readFileSync(FAILURE_PATTERNS_PATH, "utf-8").trim().split("\n")
        .filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    }

    // Find matching pattern by type+domain
    const existing = patterns.find((p: any) => p.type === errorType && p.domain === domain);

    if (existing) {
      existing.occurrences = (existing.occurrences || 1) + 1;
      existing.last_seen = new Date().toISOString();
      existing.last_error = errorMessage.slice(0, 200);
      existing.last_tool = `${toolName}:${action}`;
      // Rewrite file
      fs.writeFileSync(FAILURE_PATTERNS_PATH, patterns.map((p: any) => JSON.stringify(p)).join("\n") + "\n");
      return {
        success: true, call_number: callNumber, error_id: errorId,
        pattern_matched: true, pattern_id: existing.id,
        prevention: existing.prevention || null, occurrences: existing.occurrences,
      };
    }

    // Create new pattern
    const newPattern = {
      id: `FAIL-${Date.now().toString(36)}`, type: errorType, domain,
      context: `${toolName}:${action}`, error: errorMessage.slice(0, 300),
      root_cause: "", prevention: "", severity: "medium",
      occurrences: 1, first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(), last_tool: `${toolName}:${action}`,
    };
    fs.appendFileSync(FAILURE_PATTERNS_PATH, JSON.stringify(newPattern) + "\n");

    return {
      success: true, call_number: callNumber, error_id: errorId,
      pattern_matched: false, pattern_id: newPattern.id,
      prevention: null, occurrences: 1,
    };
  } catch (err: any) {
    return {
      success: false, call_number: callNumber, error_id: "CAPTURE_FAILED",
      pattern_matched: false, pattern_id: null, prevention: null, occurrences: 0,
    };
  }
}


// ============================================================================
// GAP 2: PRE-TASK RECON — Auto-check known pitfalls on session start
// ============================================================================

// ReconResult — imported from prism-schema

export function autoPreTaskRecon(callNumber: number): ReconResult {
  const warnings: string[] = [];
  let recentErrors: any[] = [];
  let recurringPatterns: any[] = [];
  let sessionCtx: any = { session: "unknown", phase: "unknown", last_checkpoint: null };

  try {
    // 1. Last 5 errors
    if (fs.existsSync(ERROR_LOG_PATH)) {
      const lines = fs.readFileSync(ERROR_LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
      recentErrors = lines.slice(-5).map(l => {
        try { const e = JSON.parse(l); return { tool: `${e.tool_name}:${e.action||""}`, type: e.error_type, message: (e.error_message||"").slice(0, 80), when: e.timestamp }; } catch { return null; }
      }).filter(Boolean);
      if (recentErrors.length > 0) warnings.push(`⚠️ ${recentErrors.length} recent errors — check before repeating same operations`);
    }

    // 2. Top recurring failure patterns
    if (fs.existsSync(FAILURE_PATTERNS_PATH)) {
      const patterns = fs.readFileSync(FAILURE_PATTERNS_PATH, "utf-8").trim().split("\n").filter(Boolean)
        .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      recurringPatterns = patterns.filter((p: any) => p.occurrences >= 2)
        .sort((a: any, b: any) => b.occurrences - a.occurrences).slice(0, 5)
        .map((p: any) => ({ type: p.type, domain: p.domain, occurrences: p.occurrences, prevention: p.prevention || "No prevention recorded" }));
      if (recurringPatterns.length > 0) warnings.push(`🔁 ${recurringPatterns.length} recurring failure patterns — review before starting`);
    }

    // 3. Session context
    if (fs.existsSync(CURRENT_STATE_FILE)) {
      try {
        const state = JSON.parse(fs.readFileSync(CURRENT_STATE_FILE, "utf-8"));
        sessionCtx = {
          session: state.session || state.sessionNumber || "unknown",
          phase: state.phase || state.currentPhase || "unknown",
          last_checkpoint: state.currentSession?.progress?.lastCheckpoint || null,
        };
      } catch { /* corrupt state */ }
    }

    // GAP-A2: Check for active ATCS tasks that need resuming
    try {
      const atcsDir = "C:\\PRISM\\autonomous-tasks";
      if (fs.existsSync(atcsDir)) {
        const taskDirs = fs.readdirSync(atcsDir).filter((d: any) => {
          try { return fs.statSync(path.join(atcsDir, d)).isDirectory(); } catch { return false; }
        });
        for (const dir of taskDirs) {
          const mfPath = path.join(atcsDir, dir, "TASK_MANIFEST.json");
          if (fs.existsSync(mfPath)) {
            try {
              const mf = JSON.parse(fs.readFileSync(mfPath, "utf-8"));
              if (mf.status === "IN_PROGRESS") {
                const pct = mf.progress_pct || "?";
                warnings.push("🔄 ACTIVE ATCS TASK: " + mf.task_id + " — " + (mf.description || "unnamed") + " (" + pct + "% done). Call prism_atcs action=task_resume to continue.");
              }
            } catch { /* manifest parse failed */ }
          }
        }
      }
    } catch { /* ATCS check failed — non-fatal */ }

    if (warnings.length === 0) warnings.push("✅ No known pitfalls — clear to proceed");
  } catch { warnings.push("⚠️ Recon failed — proceed with caution"); }

  return { success: true, call_number: callNumber, recent_errors: recentErrors, recurring_patterns: recurringPatterns, session_context: sessionCtx, warnings };
}


// ============================================================================
// GAP 5: QUALITY GATE AUTO-ENFORCE — Block completion without evidence
// ============================================================================

// QualityGateResult — imported from prism-schema

export function autoQualityGate(callNumber: number): QualityGateResult {
  const blockers: string[] = [];
  let safetyVerified = false;
  let omegaVerified = false;

  try {
    // Check if safety/omega computations happened this session
    if (fs.existsSync(CURRENT_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(CURRENT_STATE_FILE, "utf-8"));
      const progress = state.currentSession?.progress || {};

      if (progress.safety_score !== undefined && progress.safety_score >= 0.70) {
        safetyVerified = true;
      } else {
        blockers.push("S(x) not verified ≥ 0.70 — run prism_validate safety or prism_safety check");
      }

      if (progress.omega_score !== undefined && progress.omega_score >= 0.70) {
        omegaVerified = true;
      } else {
        blockers.push("Ω(x) not verified ≥ 0.70 — run prism_omega compute before marking complete");
      }
    } else {
      blockers.push("No session state found — cannot verify quality gates");
    }
  } catch { blockers.push("Quality gate check failed — state parse error"); }

  return {
    success: true, call_number: callNumber,
    gate_passed: blockers.length === 0,
    checks: { safety_verified: safetyVerified, omega_verified: omegaVerified, evidence_level: blockers.length === 0 ? "L3+" : "INSUFFICIENT" },
    blockers,
  };
}


// ============================================================================
// GAP 6: ANTI-REGRESSION ON FILE WRITE — Block writes that lose capabilities
// ============================================================================

// AntiRegressionResult — imported from prism-schema

function countCodeMetrics(content: string): CodeMetrics {
  const lines = content.split("\n").length;
  const exports = (content.match(/export\s+(function|const|class|interface|type|enum)/g) || []).length;
  const functions = (content.match(/(function\s+\w+|=>\s*{|\w+\s*\([^)]*\)\s*{)/g) || []).length;
  return { lines, exports, functions };
}

export function autoAntiRegression(filePath: string, newContent: string): AntiRegressionResult {
  const regressions: string[] = [];
  let oldMetrics = { lines: 0, exports: 0, functions: 0 };
  let newMetrics = countCodeMetrics(newContent);

  try {
    if (fs.existsSync(filePath)) {
      const oldContent = fs.readFileSync(filePath, "utf-8");
      oldMetrics = countCodeMetrics(oldContent);

      if (newMetrics.exports < oldMetrics.exports) {
        regressions.push(`EXPORT LOSS: ${oldMetrics.exports} → ${newMetrics.exports} (lost ${oldMetrics.exports - newMetrics.exports} exports)`);
      }
      if (newMetrics.functions < oldMetrics.functions * 0.8) { // Allow 20% reduction for refactoring
        regressions.push(`FUNCTION LOSS: ${oldMetrics.functions} → ${newMetrics.functions} (significant reduction)`);
      }
      if (newMetrics.lines < oldMetrics.lines * 0.5) { // Lost more than half
        regressions.push(`LINE LOSS: ${oldMetrics.lines} → ${newMetrics.lines} (lost >50% of code)`);
      }
    }
  } catch { /* file doesn't exist yet — no regression possible */ }

  return {
    success: true, passed: regressions.length === 0,
    old_metrics: oldMetrics, new_metrics: newMetrics, regressions,
  };
}


// ============================================================================
// W1.3: DOC ANTI-REGRESSION — Protect skills & docs from content loss
// ============================================================================

const DOC_BASELINES_FILE = path.join(STATE_DIR, "doc_baselines.json");

export interface DocAntiRegressionResult {
  success: boolean;
  passed: boolean;
  file: string;
  old_lines: number;
  new_lines: number;
  reduction_pct: number;
  severity: "OK" | "WARNING" | "BLOCK";
  message: string;
  has_changelog: boolean;
}

function loadDocBaselines(): Record<string, number> {
  try {
    if (fs.existsSync(DOC_BASELINES_FILE)) {
      return JSON.parse(fs.readFileSync(DOC_BASELINES_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveDocBaselines(baselines: Record<string, number>): void {
  try {
    fs.writeFileSync(DOC_BASELINES_FILE, JSON.stringify(baselines, null, 2));
  } catch {}
}

export function autoDocAntiRegression(filePath: string, newContent: string): DocAntiRegressionResult {
  // Only applies to .md files in skills/ or data/docs/
  const isDocFile = filePath && (
    filePath.includes("SKILL.md") ||
    filePath.includes("skills-consolidated") ||
    (filePath.includes("data") && filePath.includes("docs") && filePath.endsWith(".md"))
  );
  if (!isDocFile) {
    return { success: true, passed: true, file: filePath || "", old_lines: 0, new_lines: 0, reduction_pct: 0, severity: "OK", message: "Not a doc file", has_changelog: true };
  }

  const newLines = newContent.split("\n").length;
  const hasChangelog = /## Changelog/i.test(newContent);
  let oldLines = 0;
  let severity: "OK" | "WARNING" | "BLOCK" = "OK";
  let passed = true;
  let message = "";

  // Check baseline first
  const baselines = loadDocBaselines();
  const baselineKey = filePath.replace(/\\/g, "/");

  // Get old line count from disk or baseline
  try {
    oldLines = fs.readFileSync(filePath, "utf-8").split("\n").length;
  } catch {
    // File doesn't exist yet — that's fine, baseline will be used
  }

  // Use baseline if higher (tracks historical max)
  if (baselines[baselineKey] && baselines[baselineKey] > oldLines) {
    oldLines = baselines[baselineKey];
  }

  // Calculate reduction
  let reductionPct = 0;
  if (oldLines > 0) {
    reductionPct = Math.round(((oldLines - newLines) / oldLines) * 100);
  }

  // Check thresholds
  if (reductionPct > 60) {
    severity = "BLOCK";
    passed = false;
    message = `🛑 DOC ANTI-REGRESSION BLOCK: ${filePath} lost ${reductionPct}% content (${oldLines}→${newLines} lines). This exceeds the 60% threshold. Use bypass_doc_regression=true to override.`;
  } else if (reductionPct > 30) {
    severity = "WARNING";
    passed = true; // warning only, not blocking
    message = `⚠️ DOC CONTENT WARNING: ${filePath} lost ${reductionPct}% content (${oldLines}→${newLines} lines). Consider using append instead of rewrite.`;
  } else {
    message = `✅ Doc check passed: ${filePath} (${oldLines}→${newLines} lines, ${reductionPct > 0 ? "-" + reductionPct + "%" : "OK"})`;
  }

  // Check changelog requirement
  if (!hasChangelog && newLines > 20) {
    message += `\n⚠️ Missing ## Changelog section in ${filePath}`;
  }

  // Update baseline (always track max)
  if (newLines > (baselines[baselineKey] || 0)) {
    baselines[baselineKey] = newLines;
    saveDocBaselines(baselines);
  }

  return { success: true, passed, file: filePath, old_lines: oldLines, new_lines: newLines, reduction_pct: reductionPct, severity, message, has_changelog: hasChangelog };
}


// ============================================================================
// GAP 7: DECISION AUTO-CAPTURE — Record architectural decisions on code changes
// ============================================================================

const DECISIONS_DIR = path.join(STATE_DIR, "decisions");

// DecisionCaptureResult — imported from prism-schema

export function autoDecisionCapture(callNumber: number, toolName: string, action: string, filePath: string): DecisionCaptureResult {
  try {
    // Only capture for code file writes to dispatchers/engines
    const isCodeChange = filePath && (
      filePath.includes("dispatcher") || filePath.includes("engine") ||
      filePath.includes("Executor") || filePath.includes("index.ts") ||
      filePath.includes("autoHook") || filePath.includes("cadence")
    );
    if (!isCodeChange) return { success: true, decision_id: null, file_changed: filePath || "", auto_captured: false };

    if (!fs.existsSync(DECISIONS_DIR)) fs.mkdirSync(DECISIONS_DIR, { recursive: true });

    const id = `DEC-AUTO-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 5)}`;
    const decision = {
      id, decision: `Code change to ${path.basename(filePath || "unknown")} via ${toolName}:${action}`,
      alternatives: [], reasoning: "Auto-captured — fill in reasoning on next review",
      revisit_if: [], confidence: 0.5, domain: "architecture",
      status: "auto-captured", created: new Date().toISOString(),
      updated: new Date().toISOString(), session: callNumber,
    };
    fs.writeFileSync(path.join(DECISIONS_DIR, `${id}.json`), JSON.stringify(decision, null, 2));
    return { success: true, decision_id: id, file_changed: filePath || "", auto_captured: true };
  } catch { return { success: true, decision_id: null, file_changed: filePath || "", auto_captured: false }; }
}


// ============================================================================
// GAP 8: WARM-START DATA — Rich boot context in one call
// ============================================================================

const DATA_DIR = path.join(STATE_DIR, "..", "data");

// WarmStartResult — imported from prism-schema

export function autoWarmStartData(): WarmStartResult {
  const result: WarmStartResult = {
    success: true, registry_status: {}, recent_errors: [], top_failures: [],
    session_info: { session: "unknown", phase: "unknown", quick_resume: "None" },
    roadmap_next: [],
  };

  try {
    // 1. Registry status from data dirs (W5: recurse into ISO group subdirs for materials)
    const dataRoot = path.join(DATA_DIR);
    const registryDirs = ["materials", "machines", "alarms", "formulas", "tools"];
    for (const dir of registryDirs) {
      const dirPath = path.join(dataRoot, dir);
      if (fs.existsSync(dirPath)) {
        // Collect all JSON files including subdirectories (materials uses ISO group subdirs)
        const allJsonFiles: string[] = [];
        const topEntries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of topEntries) {
          if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "index.json" && entry.name !== "MASTER_INDEX.json") {
            allJsonFiles.push(path.join(dirPath, entry.name));
          } else if (entry.isDirectory()) {
            try {
              const subFiles = fs.readdirSync(path.join(dirPath, entry.name)).filter(f => f.endsWith(".json") && f !== "index.json");
              for (const sf of subFiles) allJsonFiles.push(path.join(dirPath, entry.name, sf));
            } catch {}
          }
        }
        let count = 0;
        for (const fp of allJsonFiles.slice(0, 8)) { // Sample first 8 files
          try {
            const d = JSON.parse(fs.readFileSync(fp, "utf-8"));
            count += d.materials?.length || (Array.isArray(d) ? d.length : 1);
          } catch {}
        }
        if (allJsonFiles.length > 8) count = Math.round(count / 8 * allJsonFiles.length); // Estimate
        result.registry_status[dir] = count;
      } else { result.registry_status[dir] = 0; }
    }

    // 2. Last 3 errors
    if (fs.existsSync(ERROR_LOG_PATH)) {
      const lines = fs.readFileSync(ERROR_LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
      result.recent_errors = lines.slice(-3).map(l => {
        try { const e = JSON.parse(l); return { tool: e.tool_name || "?", type: e.error_type || "?", when: e.timestamp || "?" }; } catch { return null; }
      }).filter(Boolean) as any[];
    }

    // 3. Top failure patterns
    if (fs.existsSync(FAILURE_PATTERNS_PATH)) {
      const patterns = fs.readFileSync(FAILURE_PATTERNS_PATH, "utf-8").trim().split("\n").filter(Boolean)
        .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      result.top_failures = patterns.sort((a: any, b: any) => (b.occurrences || 0) - (a.occurrences || 0)).slice(0, 3)
        .map((p: any) => ({ type: p.type, domain: p.domain, count: p.occurrences || 1, prevention: p.prevention || "None recorded" }));
    }

    // 4. Session info
    if (fs.existsSync(CURRENT_STATE_FILE)) {
      try {
        const state = JSON.parse(fs.readFileSync(CURRENT_STATE_FILE, "utf-8"));
        result.session_info = {
          session: state.session || state.sessionNumber || "unknown",
          phase: state.phase || "unknown",
          quick_resume: state.quickResume || "None",
        };
      } catch {}
    }

    // 5. Roadmap next items
    const roadmapPaths = [path.join(DATA_DIR, "docs", "PRIORITY_ROADMAP.md"), path.join(STATE_DIR, "PRIORITY_ROADMAP.md")];
    for (const rp of roadmapPaths) {
      if (fs.existsSync(rp)) {
        const rm = fs.readFileSync(rp, "utf-8");
        result.roadmap_next = rm.split("\n").filter(l => l.includes("NOT STARTED")).slice(0, 3).map(l => l.replace(/^#+\s*\d+\.\s*/, "").trim().slice(0, 80));
        break;
      }
    }
  } catch { result.success = false; }

  return result;
}


// ============================================================================
// GAP 10: RESPONSE VARIATION CHECK — Detect repetitive patterns (Manus Law 6)
// ============================================================================

const VARIATION_LOG_PATH = path.join(STATE_DIR, "variation_log.json");

// VariationCheckResult — imported from prism-schema

export function autoVariationCheck(callNumber: number): VariationCheckResult {
  const repetitive: string[] = [];
  try {
    // Read recent pressure/checkpoint history to detect repetitive tool patterns
    if (fs.existsSync(path.join(STATE_DIR, "context_pressure.json"))) {
      const pressure = JSON.parse(fs.readFileSync(path.join(STATE_DIR, "context_pressure.json"), "utf-8"));
      const history = pressure.history || [];
      if (history.length >= 5) {
        const zones = history.slice(-5).map((h: any) => h.zone);
        if (zones.every((z: string) => z === zones[0])) {
          repetitive.push(`Same pressure zone (${zones[0]}) for 5+ checks — may be stuck in loop`);
        }
      }
    }

    // Check error patterns for same error repeating
    if (fs.existsSync(ERROR_LOG_PATH)) {
      const lines = fs.readFileSync(ERROR_LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
      const recent = lines.slice(-10).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const toolCounts: Record<string, number> = {};
      for (const e of recent) {
        const key = `${e.tool_name}:${e.error_type}`;
        toolCounts[key] = (toolCounts[key] || 0) + 1;
      }
      for (const [key, count] of Object.entries(toolCounts)) {
        if (count >= 3) repetitive.push(`Same error ${key} occurred ${count}x in last 10 — breaking loop needed`);
      }
    }

    const variationNeeded = repetitive.length > 0;
    const recommendation = variationNeeded
      ? "Break pattern: try different tool, approach, or pause to reassess"
      : "No repetitive patterns detected — continue normally";

    // Log check
    const log: any = { call_number: callNumber, timestamp: new Date().toISOString(), variation_needed: variationNeeded, patterns: repetitive };
    let history: any[] = [];
    if (fs.existsSync(VARIATION_LOG_PATH)) {
      try { history = JSON.parse(fs.readFileSync(VARIATION_LOG_PATH, "utf-8")); } catch { history = []; }
    }
    history.push(log);
    if (history.length > 20) history = history.slice(-20);
    fs.writeFileSync(VARIATION_LOG_PATH, JSON.stringify(history, null, 2));

    return { success: true, call_number: callNumber, variation_needed: variationNeeded, repetitive_patterns: repetitive, recommendation };
  } catch { return { success: true, call_number: callNumber, variation_needed: false, repetitive_patterns: [], recommendation: "Check failed — continue normally" }; }
}


// ============================================================================
// ENHANCEMENT 1: AUTO SKILL HINTS — Surface relevant skills for active task
// ============================================================================

const SKILLS_DIR = "C:\\PRISM\\skills-consolidated";
const SKILL_INDEX_FILE = path.join(STATE_DIR, "SKILL_INVENTORY.json");

// Domain-to-skill mapping for fast lookup (no registry import needed)
const SKILL_DOMAIN_MAP: Record<string, string[]> = {
  // ===== prism_calc actions =====
  "cutting_force": ["prism-cutting-mechanics", "prism-physics-formulas", "prism-universal-formulas", "prism-speed-feed-engine"],
  "tool_life": ["prism-cutting-tools", "prism-universal-formulas", "prism-physics-formulas"],
  "speed_feed": ["prism-speed-feed-engine", "prism-cutting-mechanics", "prism-process-optimizer"],
  "flow_stress": ["prism-material-physics", "prism-physics-formulas"],
  "surface_finish": ["prism-cam-strategies", "prism-cutting-mechanics"],
  "mrr": ["prism-cutting-mechanics", "prism-process-optimizer", "prism-universal-formulas"],
  "power": ["prism-cutting-mechanics", "prism-universal-formulas"],
  "chip_load": ["prism-cutting-mechanics", "prism-cutting-tools"],
  "stability": ["prism-cutting-mechanics", "prism-physics-formulas"],
  "deflection": ["prism-cutting-tools", "prism-physics-formulas"],
  "thermal": ["prism-expert-thermodynamics", "prism-material-physics"],
  "cost_optimize": ["prism-process-optimizer", "prism-mathematical-planning"],
  "multi_optimize": ["prism-mathematical-planning", "prism-ai-optimization"],
  "trochoidal": ["prism-cam-strategies", "prism-cutting-mechanics"],
  "hsm": ["prism-cam-strategies", "prism-speed-feed-engine"],
  "scallop": ["prism-cam-strategies"],
  "stepover": ["prism-cam-strategies", "prism-cutting-mechanics"],
  "cycle_time": ["prism-process-optimizer"],
  "productivity": ["prism-process-optimizer", "prism-cutting-mechanics"],
  "engagement": ["prism-cam-strategies", "prism-cutting-mechanics"],
  "arc_fit": ["prism-cam-strategies"],
  // ===== prism_safety actions =====
  "check_toolpath_collision": ["prism-safety-framework", "prism-cam-strategies"],
  "validate_rapid_moves": ["prism-safety-framework", "prism-gcode-reference"],
  "check_fixture_clearance": ["prism-safety-framework"],
  "calculate_safe_approach": ["prism-safety-framework", "prism-gcode-reference"],
  "detect_near_miss": ["prism-safety-framework"],
  "validate_tool_clearance": ["prism-safety-framework", "prism-cutting-tools"],
  "check_5axis_head_clearance": ["prism-safety-framework", "prism-cam-strategies"],
  "validate_coolant_flow": ["prism-safety-framework"],
  "check_through_spindle_coolant": ["prism-safety-framework"],
  "calculate_chip_evacuation": ["prism-safety-framework", "prism-cutting-mechanics"],
  "check_spindle_torque": ["prism-cutting-mechanics", "prism-safety-framework"],
  "check_spindle_power": ["prism-cutting-mechanics", "prism-safety-framework"],
  "validate_spindle_speed": ["prism-safety-framework"],
  "predict_tool_breakage": ["prism-cutting-tools", "prism-safety-framework"],
  "calculate_tool_stress": ["prism-cutting-tools", "prism-physics-formulas"],
  "check_chip_load_limits": ["prism-cutting-mechanics", "prism-safety-framework"],
  "estimate_tool_fatigue": ["prism-cutting-tools"],
  "get_safe_cutting_limits": ["prism-safety-framework", "prism-cutting-mechanics"],
  "calculate_clamp_force_required": ["prism-safety-framework", "prism-physics-formulas"],
  "validate_workholding_setup": ["prism-safety-framework"],
  "check_pullout_resistance": ["prism-safety-framework", "prism-cutting-tools"],
  "analyze_liftoff_moment": ["prism-safety-framework", "prism-physics-formulas"],
  "calculate_part_deflection": ["prism-physics-formulas", "prism-safety-framework"],
  "validate_vacuum_fixture": ["prism-safety-framework"],
  // ===== prism_thread actions =====
  "calculate_tap_drill": ["prism-universal-formulas"],
  "calculate_thread_mill_params": ["prism-cutting-mechanics"],
  "calculate_thread_depth": ["prism-universal-formulas"],
  "calculate_engagement_percent": ["prism-universal-formulas"],
  "get_thread_specifications": ["prism-physics-reference"],
  "get_go_nogo_gauges": ["prism-expert-quality-control"],
  "calculate_pitch_diameter": ["prism-universal-formulas"],
  "select_thread_insert": ["prism-cutting-tools"],
  "calculate_thread_cutting_params": ["prism-cutting-mechanics", "prism-speed-feed-engine"],
  "generate_thread_gcode": ["prism-gcode-reference", "prism-fanuc-programming"],
  // ===== prism_toolpath actions =====
  "strategy_select": ["prism-cam-strategies", "prism-tool-selector"],
  "params_calculate": ["prism-cam-strategies", "prism-speed-feed-engine"],
  "strategy_search": ["prism-cam-strategies"],
  "strategy_list": ["prism-cam-strategies"],
  "strategy_info": ["prism-cam-strategies"],
  "material_strategies": ["prism-cam-strategies", "prism-material-physics"],
  "prism_novel": ["prism-cam-strategies"],
  // ===== prism_data actions =====
  "material_get": ["prism-material-lookup", "prism-material-physics"],
  "material_search": ["prism-material-lookup"],
  "material_compare": ["prism-material-lookup", "prism-material-physics"],
  "machine_get": ["prism-expert-mechanical-engineer"],
  "machine_search": ["prism-expert-mechanical-engineer"],
  "machine_capabilities": ["prism-expert-mechanical-engineer"],
  "tool_get": ["prism-cutting-tools", "prism-tool-selector"],
  "tool_search": ["prism-cutting-tools"],
  "tool_recommend": ["prism-tool-selector", "prism-cutting-tools"],
  "alarm_decode": ["prism-controller-quick-ref"],
  "alarm_search": ["prism-controller-quick-ref"],
  "alarm_fix": ["prism-controller-quick-ref", "prism-error-recovery"],
  "formula_get": ["prism-universal-formulas", "prism-physics-formulas"],
  "formula_calculate": ["prism-universal-formulas", "prism-physics-formulas"],
  // ===== prism_validate / prism_omega / prism_ralph actions =====
  "safety": ["prism-safety-framework", "prism-quality-gates"],
  "completeness": ["prism-quality-gates", "prism-validator"],
  "anti_regression": ["prism-anti-regression"],
  "compute": ["prism-master-equation", "prism-quality-gates"],
  "loop": ["prism-ralph-validation", "prism-quality-gates"],
  "scrutinize": ["prism-ralph-validation"],
  "assess": ["prism-ralph-validation", "prism-quality-gates"],
  // ===== prism_session actions =====
  "state_save": ["prism-state-manager", "prism-session-master"],
  "state_load": ["prism-state-manager"],
  "state_checkpoint": ["prism-state-manager", "prism-session-buffer"],
  "resume_session": ["prism-session-handoff", "prism-task-continuity"],
  "handoff_prepare": ["prism-session-handoff"],
  "context_compress": ["prism-context-pressure", "prism-context-engineering"],
  "context_pressure": ["prism-context-pressure"],
  "compaction_detect": ["prism-context-pressure"],
  // ===== prism_context actions =====
  "todo_update": ["prism-task-continuity"],
  "todo_read": ["prism-task-continuity"],
  "memory_externalize": ["prism-context-engineering"],
  "memory_restore": ["prism-context-engineering"],
  "error_preserve": ["prism-error-handling-patterns"],
  "error_patterns": ["prism-error-handling-patterns", "prism-learning-engines"],
  "attention_score": ["prism-context-engineering"],
  "focus_optimize": ["prism-context-engineering"],
  // ===== prism_orchestrate actions =====
  "agent_execute": ["prism-agent-selector", "prism-swarm-coordinator"],
  "agent_parallel": ["prism-batch-orchestrator", "prism-swarm-coordinator"],
  "swarm_execute": ["prism-swarm-coordinator"],
  "swarm_consensus": ["prism-swarm-coordinator"],
  "plan_create": ["prism-mathematical-planning", "prism-sp-planning"],
  "plan_execute": ["prism-sp-execution"],
  // ===== prism_sp actions =====
  "brainstorm": ["prism-sp-brainstorm", "prism-cognitive-core"],
  "plan": ["prism-sp-planning", "prism-mathematical-planning"],
  "execute": ["prism-sp-execution"],
  "review_spec": ["prism-sp-review-spec"],
  "review_quality": ["prism-sp-review-quality"],
  "debug": ["prism-sp-debugging", "prism-error-recovery"],
  // ===== prism_hook actions =====
  "chain": ["prism-hook-system"],
  "toggle": ["prism-hook-system"],
  "emit": ["prism-hook-system"],
  // ===== prism_dev actions =====
  "build": ["prism-dev-tools", "prism-development"],
  "code_template": ["prism-coding-patterns", "prism-wiring-templates"],
  "code_search": ["prism-dev-tools"],
  "file_read": ["prism-dev-tools"],
  "file_write": ["prism-dev-tools", "prism-large-file-writer"],
  // ===== prism_generator actions =====
  "generate": ["prism-hook-system", "prism-coding-patterns"],
  "generate_batch": ["prism-hook-system", "prism-batch-orchestrator"],
  "validate": ["prism-validator", "prism-quality-gates"],
  // ===== prism_knowledge actions =====
  "search": ["prism-knowledge-base"],
  "cross_query": ["prism-knowledge-base"],
  "formula": ["prism-universal-formulas", "prism-physics-formulas"],
  "relations": ["prism-knowledge-base"],
};

// ============================================================================
// D1.4: SKILL AUTO-LOADER — Domain-aware bundle loading with cache
// ============================================================================

/** Map TaskAgentClassifier domains → predefined chain configs */
const DOMAIN_CHAIN_MAP: Record<string, {
  chain_name: string;
  purpose: string;
  skills: string[];
}> = {
  calculations: {
    chain_name: "speed-feed-full",
    purpose: "Complete speed/feed calculation with physics validation and safety checks",
    skills: ["prism-speed-feed-engine", "prism-cutting-mechanics", "prism-material-physics", "prism-cutting-tools", "prism-safety-framework"],
  },
  toolpath: {
    chain_name: "toolpath-optimize",
    purpose: "Toolpath strategy selection with cutting parameter optimization",
    skills: ["prism-cam-strategies", "prism-cutting-mechanics", "prism-speed-feed-engine", "prism-process-optimizer", "prism-safety-framework"],
  },
  materials: {
    chain_name: "material-complete",
    purpose: "Full material analysis with physics properties and machinability assessment",
    skills: ["prism-material-lookup", "prism-material-physics", "prism-material-enhancer", "prism-cutting-mechanics", "prism-universal-formulas"],
  },
  alarms: {
    chain_name: "alarm-diagnose",
    purpose: "Cross-controller alarm diagnosis with fix procedures",
    skills: ["prism-controller-quick-ref", "prism-fanuc-programming", "prism-heidenhain-programming", "prism-siemens-programming", "prism-error-recovery"],
  },
  safety: {
    chain_name: "quality-release",
    purpose: "Full quality validation pipeline for release readiness",
    skills: ["prism-quality-gates", "prism-anti-regression", "prism-ralph-validation", "prism-master-equation", "prism-safety-framework"],
  },
  validation: {
    chain_name: "quality-release",
    purpose: "Quality validation pipeline",
    skills: ["prism-quality-gates", "prism-anti-regression", "prism-ralph-validation", "prism-master-equation", "prism-safety-framework"],
  },
  quality: {
    chain_name: "quality-release",
    purpose: "Quality validation pipeline",
    skills: ["prism-quality-gates", "prism-anti-regression", "prism-ralph-validation", "prism-master-equation", "prism-safety-framework"],
  },
  threading: {
    chain_name: "speed-feed-full",
    purpose: "Thread cutting requires speed/feed + cutting mechanics",
    skills: ["prism-speed-feed-engine", "prism-cutting-mechanics", "prism-universal-formulas", "prism-safety-framework"],
  },
  tooling: {
    chain_name: "toolpath-optimize",
    purpose: "Tool selection with cutting parameter optimization",
    skills: ["prism-cutting-tools", "prism-tool-selector", "prism-cutting-mechanics", "prism-speed-feed-engine"],
  },
  physics: {
    chain_name: "speed-feed-full",
    purpose: "Physics-based calculation with validation",
    skills: ["prism-physics-formulas", "prism-cutting-mechanics", "prism-material-physics", "prism-uncertainty-propagation"],
  },
  machines: {
    chain_name: "material-complete",
    purpose: "Machine capability analysis",
    skills: ["prism-expert-mechanical-engineer", "prism-cutting-mechanics", "prism-safety-framework"],
  },
};

/** In-memory cache for skill content with TTL */
interface CachedSkill {
  title: string;
  content: string;
  loadedAt: number;
}
const _skillCache: Map<string, CachedSkill> = new Map();
const CACHE_TTL_MS = 120_000; // 2 minutes
let _cacheHits = 0;
let _cacheMisses = 0;

function getCacheStats(): { cached: number; hits: number; misses: number } {
  return { cached: _skillCache.size, hits: _cacheHits, misses: _cacheMisses };
}

/** Load a skill's key content (title + first substantive section), using cache */
function loadSkillExcerpt(skillId: string, maxChars: number): CachedSkill | null {
  const now = Date.now();
  const cached = _skillCache.get(skillId);
  if (cached && (now - cached.loadedAt) < CACHE_TTL_MS) {
    _cacheHits++;
    return { ...cached, content: cached.content.slice(0, maxChars) };
  }

  const skillPath = path.join(SKILLS_DIR, skillId, "SKILL.md");
  if (!fs.existsSync(skillPath)) return null;

  _cacheMisses++;
  try {
    const raw = fs.readFileSync(skillPath, "utf-8");
    const lines = raw.split("\n");
    let title = "";
    const keyLines: string[] = [];
    let inSection = false;

    for (const line of lines.slice(0, 80)) {
      if (line.startsWith("# ") && !title) { title = line.replace("# ", ""); continue; }
      if (line.startsWith("## ")) {
        if (inSection) break; // stop at second section
        inSection = true;
        continue;
      }
      if (inSection && line.trim() && !line.startsWith("---") && !line.startsWith("```")) {
        keyLines.push(line.trim());
      }
      if (keyLines.length >= 8) break;
    }

    const content = keyLines.join(" ");
    const entry: CachedSkill = { title, content, loadedAt: now };
    _skillCache.set(skillId, entry);
    return { ...entry, content: content.slice(0, maxChars) };
  } catch {
    return null;
  }
}

interface AutoLoadResult {
  bundle: {
    bundle_name: string;
    purpose: string;
    chain_suggestion: string;
    skills_available: number;
    skills_loaded: number;
    pressure_mode: string;
    excerpts: Array<{ skill_id: string; title: string; content: string }>;
  } | null;
}

/** D1.4 core: Load skill bundle for a classified domain, pressure-adaptive */
function autoLoadForDomain(domain: string, action: string, pressurePct: number): AutoLoadResult {
  const chainConfig = DOMAIN_CHAIN_MAP[domain];
  if (!chainConfig) return { bundle: null };

  // Pressure-adaptive loading
  let maxSkills: number;
  let maxCharsPerSkill: number;
  let pressureMode: string;

  if (pressurePct > 70) {
    maxSkills = 1;
    maxCharsPerSkill = 80;
    pressureMode = "minimal";
  } else if (pressurePct > 50) {
    maxSkills = 2;
    maxCharsPerSkill = 150;
    pressureMode = "compact";
  } else if (pressurePct > 30) {
    maxSkills = 3;
    maxCharsPerSkill = 250;
    pressureMode = "standard";
  } else {
    maxSkills = 4;
    maxCharsPerSkill = 400;
    pressureMode = "full";
  }

  const excerpts: Array<{ skill_id: string; title: string; content: string }> = [];
  let loaded = 0;

  // Load skills from chain, prioritizing action-specific skills first
  const actionSkills = SKILL_DOMAIN_MAP[action] || [];
  const chainSkills = chainConfig.skills;
  // Merge: action-specific first, then chain skills (deduplicated)
  const orderedSkills = [...new Set([...actionSkills, ...chainSkills])];

  for (const skillId of orderedSkills.slice(0, maxSkills)) {
    const excerpt = loadSkillExcerpt(skillId, maxCharsPerSkill);
    if (excerpt) {
      excerpts.push({ skill_id: skillId, title: excerpt.title, content: excerpt.content });
      loaded++;
    }
  }

  if (loaded === 0) return { bundle: null };

  return {
    bundle: {
      bundle_name: chainConfig.chain_name,
      purpose: chainConfig.purpose,
      chain_suggestion: chainConfig.chain_name,
      skills_available: chainConfig.skills.length,
      skills_loaded: loaded,
      pressure_mode: pressureMode,
      excerpts,
    }
  };
}

// SkillHintResult — imported from prism-schema

export function autoSkillHint(
  callNumber: number,
  toolName: string,
  action: string,
  params: Record<string, any>,
  classifiedDomain?: string
): SkillHintResult {
  try {
    const hints: string[] = [];
    const skillIds: string[] = [];
    let loadedExcerpts = 0;

    // Pressure-adaptive: skip skill hints at high pressure
    const pressureFile = path.join(STATE_DIR, "context_pressure.json");
    let pressurePct = 0;
    try {
      if (fs.existsSync(pressureFile)) {
        const p = JSON.parse(fs.readFileSync(pressureFile, "utf-8"));
        pressurePct = p.pressure_pct || 0;
      }
    } catch { /* ignore */ }
    
    if (pressurePct > 85) {
      return { success: true, call_number: callNumber, hints: ["⚡ Skill hints suppressed (pressure >85%)"], skill_ids: [], loaded_excerpts: 0, pressure_mode: "suppressed" };
    }

    // ================================================================
    // D1.4: Try domain-bundle loading via SkillAutoLoader FIRST
    // ================================================================
    let bundleName: string | undefined;
    let bundlePurpose: string | undefined;
    let chainSuggestion: string | undefined;
    let domain = classifiedDomain;

    // If no domain provided, try quick classify
    if (!domain) {
      try {
        const quick = classifyTask(toolName, action, params);
        domain = quick.domain !== "general" ? quick.domain : undefined;
      } catch { /* classifier not critical */ }
    }

    if (domain) {
      const loadResult = autoLoadForDomain(domain, action, pressurePct);
      if (loadResult.bundle) {
        const b = loadResult.bundle;
        bundleName = b.bundle_name;
        bundlePurpose = b.purpose;
        chainSuggestion = b.chain_suggestion || undefined;

        // Use bundle excerpts as primary hints
        for (const excerpt of b.excerpts) {
          hints.push(`📦 [${excerpt.skill_id}] ${excerpt.title}: ${excerpt.content.slice(0, pressurePct > 60 ? 100 : 300)}`);
          skillIds.push(excerpt.skill_id);
          loadedExcerpts++;
        }

        if (chainSuggestion) {
          hints.push(`🔗 Chain: skill_chain chain_name="${chainSuggestion}" (${b.skills_available} skills)`);
        }

        // Add cache stats compactly
        const cs = getCacheStats();
        const cacheNote = cs.hits > 0 ? ` [cache: ${cs.hits}h/${cs.misses}m]` : "";
        hints.push(`📦 Bundle "${bundleName}": ${b.skills_loaded}/${b.skills_available} loaded (${b.pressure_mode})${cacheNote}`);

        // Still check material context
        if (params?.material || params?.material_id || params?.material_name) {
          const matRef = params.material || params.material_id || params.material_name;
          hints.push(`📋 Material context: "${matRef}" — use material_get for full Kienzle/Taylor constants`);
        }

        return {
          success: true, call_number: callNumber, hints, skill_ids: skillIds, loaded_excerpts: loadedExcerpts,
          bundle_name: bundleName, bundle_purpose: bundlePurpose, chain_suggestion: chainSuggestion,
          domain, pressure_mode: b.pressure_mode,
          cache_stats: { cached: cs.cached, hits: cs.hits, misses: cs.misses }
        };
      }
    }

    // ================================================================
    // FALLBACK: Original SKILL_DOMAIN_MAP approach for unmapped domains
    // ================================================================
    const maxSkills = pressurePct > 70 ? 1 : pressurePct > 60 ? 2 : 3;
    const maxCharsPerHint = pressurePct > 60 ? 100 : 200;

    const lookupKey = action || toolName;
    const relevantSkills = SKILL_DOMAIN_MAP[lookupKey] || [];

    if (relevantSkills.length === 0) {
      return { success: true, call_number: callNumber, hints: [], skill_ids: [], loaded_excerpts: 0 };
    }

    for (const skillDir of relevantSkills.slice(0, maxSkills)) {
      const skillPath = path.join(SKILLS_DIR, skillDir, "SKILL.md");
      if (!fs.existsSync(skillPath)) continue;

      try {
        const content = fs.readFileSync(skillPath, "utf-8");
        const lines = content.split("\n");
        
        let title = "";
        const keyLines: string[] = [];
        for (const line of lines.slice(0, 40)) {
          if (line.startsWith("# ") && !title) { title = line.replace("# ", ""); continue; }
          if (line.startsWith("## ") && keyLines.length > 0) break;
          if (line.trim() && !line.startsWith("#") && !line.startsWith("---") && !line.startsWith("```")) {
            keyLines.push(line.trim());
          }
          if (keyLines.length >= 3) break;
        }

        if (title || keyLines.length > 0) {
          hints.push(`[${skillDir}] ${title}: ${keyLines.join(" ").slice(0, maxCharsPerHint)}`);
          skillIds.push(skillDir);
          loadedExcerpts++;
        }
      } catch { /* file read failed */ }
    }

    // Material-specific hints
    if (params?.material || params?.material_id || params?.material_name) {
      const matRef = params.material || params.material_id || params.material_name;
      hints.push(`📋 Material context: "${matRef}" — use material_get for full Kienzle/Taylor constants`);
    }

    // Chain suggestions (fallback)
    const CHAIN_TRIGGERS: Record<string, string> = {
      "speed_feed": "speed-feed-full",
      "cutting_force": "speed-feed-full",
      "strategy_select": "toolpath-optimize",
      "params_calculate": "toolpath-optimize",
      "material_get": "material-complete",
      "material_search": "material-complete",
      "alarm_decode": "alarm-diagnose",
      "alarm_fix": "alarm-diagnose",
      "safety": "quality-release",
      "compute": "quality-release",
      "resume_session": "session-recovery",
      "state_load": "session-recovery",
    };
    const fallbackChain = CHAIN_TRIGGERS[lookupKey];
    if (fallbackChain) {
      hints.push(`🔗 Chain available: skill_chain chain_name="${fallbackChain}"`);
      chainSuggestion = fallbackChain;
    }

    return {
      success: true, call_number: callNumber, hints, skill_ids: skillIds, loaded_excerpts: loadedExcerpts,
      chain_suggestion: chainSuggestion, domain
    };
  } catch (err: any) {
    return { success: false, call_number: callNumber, hints: [`Skill hint failed: ${err.message}`], skill_ids: [], loaded_excerpts: 0 };
  }
}


// ============================================================================
// D1.3: AGENT RECOMMEND — Auto-recommend agents/swarm for current task
// ============================================================================

export interface AgentRecommendResult {
  success: boolean;
  call_number: number;
  classification: TaskClassification | null;
  hint: string;
  atcs_recommendation?: {
    suggested: boolean;
    reason: string;
    estimated_units?: number;
    task_type?: string;
  };
}

export function autoAgentRecommend(
  callNumber: number,
  toolName: string,
  action: string,
  params: Record<string, any>
): AgentRecommendResult {
  try {
    // Skip for non-manufacturing dispatchers and simple state ops
    const skipDispatchers = ["prism_session", "prism_context", "prism_doc", "prism_gsd", "prism_dev", "prism_guard"];
    if (skipDispatchers.includes(toolName)) {
      return { success: true, call_number: callNumber, classification: null, hint: "" };
    }

    // Pressure-adaptive: skip at high pressure
    const pressureFile = path.join(STATE_DIR, "context_pressure.json");
    let pressurePct = 0;
    try {
      if (fs.existsSync(pressureFile)) {
        const p = JSON.parse(fs.readFileSync(pressureFile, "utf-8"));
        pressurePct = p.pressure_pct || 0;
      }
    } catch { /* ignore */ }
    if (pressurePct > 80) {
      return { success: true, call_number: callNumber, classification: null, hint: "⚡ Agent hints suppressed (pressure >80%)" };
    }

    const classification = classifyTask(toolName, action, params);

    // Build compact hint
    const parts: string[] = [];
    if (classification.complexity === "critical") {
      parts.push(`🔴 CRITICAL: ${classification.domain} — use OPUS tier`);
    }
    if (classification.recommended_agents.length > 0) {
      const top = classification.recommended_agents[0];
      parts.push(`🤖 Agent: ${top.name} (${top.tier})`);
    }
    if (classification.recommended_swarm) {
      const s = classification.recommended_swarm;
      parts.push(`🐝 Swarm: ${s.pattern} (${s.agents.length} agents, cost: ${s.estimated_cost_tier})`);
    }
    if (classification.auto_orchestrate) {
      parts.push("⚡ AutoPilot recommended");
    }

    // F2.1: ATCS Auto-Trigger Detection
    let atcs_recommendation: AgentRecommendResult["atcs_recommendation"] = undefined;
    const atcsDetect = detectATCSCandidate(toolName, action, params, classification);
    if (atcsDetect.suggested) {
      parts.push(`🔄 ATCS recommended: ${atcsDetect.reason} (~${atcsDetect.estimated_units} units)`);
      atcs_recommendation = atcsDetect;
    }

    const hint = parts.length > 0 ? parts.join(" | ") : "";

    return { success: true, call_number: callNumber, classification, hint, atcs_recommendation };
  } catch (err: any) {
    return { success: false, call_number: callNumber, classification: null, hint: `Agent classify failed: ${err.message}` };
  }
}

// ============================================================================
// F2.1: ATCS AUTO-TRIGGER DETECTION
// ============================================================================

/** Batch-indicator keywords in param values */
const BATCH_KEYWORDS = ["all", "batch", "every", "complete", "full", "entire", "comprehensive", "systematic"];

/** Actions that inherently suggest multi-unit work */
const MULTI_UNIT_ACTIONS: Record<string, { units: number; type: string }> = {
  "material_compare": { units: 5, type: "material-comparison-campaign" },
  "alarm_search": { units: 15, type: "alarm-documentation-campaign" },
  "tool_recommend": { units: 8, type: "tooling-optimization-campaign" },
  "machine_capabilities": { units: 10, type: "machine-audit-campaign" },
  "strategy_select": { units: 8, type: "toolpath-strategy-evaluation" },
};

/**
 * Detect whether a task is a candidate for ATCS (Autonomous Task Completion System).
 * Returns suggested=true if task appears to decompose into >10 work units.
 */
function detectATCSCandidate(
  toolName: string,
  action: string,
  params: Record<string, any>,
  classification: TaskClassification
): { suggested: boolean; reason: string; estimated_units?: number; task_type?: string } {
  // Only trigger for complex/critical tasks
  if (classification.complexity === "simple") {
    return { suggested: false, reason: "simple-task" };
  }

  let estimatedUnits = 0;
  let reason = "";
  let taskType = "";

  // 1. Check for explicit batch indicators in params
  const paramStr = JSON.stringify(params).toLowerCase();
  const hasBatchKeyword = BATCH_KEYWORDS.some(kw => paramStr.includes(kw));
  
  // 2. Check for array params with many items
  for (const [key, val] of Object.entries(params)) {
    if (Array.isArray(val) && val.length > 5) {
      estimatedUnits = Math.max(estimatedUnits, val.length);
      reason = `Array param '${key}' has ${val.length} items`;
      taskType = `batch-${action}`;
    }
  }

  // 3. Check for count/quantity params suggesting large scope
  const countKeys = ["count", "limit", "quantity", "num", "total", "size"];
  for (const [key, val] of Object.entries(params)) {
    if (countKeys.some(ck => key.toLowerCase().includes(ck)) && typeof val === "number" && val > 10) {
      estimatedUnits = Math.max(estimatedUnits, val);
      reason = `Param '${key}'=${val} suggests ${val}+ work units`;
      taskType = `bulk-${action}`;
    }
  }

  // 4. Check multi-unit actions map
  const muAction = MULTI_UNIT_ACTIONS[action];
  if (muAction && (hasBatchKeyword || classification.complexity === "critical")) {
    estimatedUnits = Math.max(estimatedUnits, muAction.units);
    reason = reason || `${action} with batch scope`;
    taskType = taskType || muAction.type;
  }

  // 5. Check for "all materials" / "all machines" type requests
  if (hasBatchKeyword && (classification.domain === "materials" || classification.domain === "machines" || classification.domain === "alarms")) {
    // These domains have thousands of entries
    const domainSizes: Record<string, number> = { materials: 50, machines: 20, alarms: 30, tooling: 15 };
    const domainUnits = domainSizes[classification.domain] || 15;
    estimatedUnits = Math.max(estimatedUnits, domainUnits);
    reason = reason || `Batch operation on ${classification.domain} domain`;
    taskType = taskType || `${classification.domain}-campaign`;
  }

  // 6. Complex + auto_orchestrate = likely needs ATCS
  if (classification.auto_orchestrate && classification.complexity === "critical" && estimatedUnits < 10) {
    estimatedUnits = 12; // Conservative estimate for critical auto-orchestrate tasks
    reason = reason || "Critical task requiring auto-orchestration";
    taskType = taskType || "complex-orchestrated-task";
  }

  // Check for active ATCS — don't recommend if already in ATCS
  try {
    const atcsDir = "C:\\PRISM\\autonomous-tasks";
    if (fs.existsSync(atcsDir)) {
      const taskDirs = fs.readdirSync(atcsDir)
        .filter(d => { try { return fs.statSync(path.join(atcsDir, d)).isDirectory(); } catch { return false; } });
      for (const td of taskDirs) {
        const manifest = path.join(atcsDir, td, "TASK_MANIFEST.json");
        if (fs.existsSync(manifest)) {
          const m = JSON.parse(fs.readFileSync(manifest, "utf-8"));
          if (m.status === "active" || m.status === "in_progress") {
            return { suggested: false, reason: `ATCS already active: ${m.task_id || td}` };
          }
        }
      }
    }
  } catch {}

  if (estimatedUnits >= 10) {
    return { suggested: true, reason, estimated_units: estimatedUnits, task_type: taskType };
  }

  return { suggested: false, reason: estimatedUnits > 0 ? `Only ~${estimatedUnits} units (threshold: 10)` : "no-batch-indicators" };
}


// ============================================================================
// ENHANCEMENT 2: KNOWLEDGE CROSS-QUERY — Enrich recon with relevant knowledge
// ============================================================================

const MATERIALS_MASTER_FILE = "C:\\PRISM\\extracted\\materials\\MATERIALS_MASTER.json";

// KnowledgeCrossQueryResult — imported from prism-schema

export function autoKnowledgeCrossQuery(
  callNumber: number,
  toolName: string,
  action: string,
  params: Record<string, any>
): KnowledgeCrossQueryResult {
  try {
    const materialHints: string[] = [];
    const formulaHints: string[] = [];
    const alarmHints: string[] = [];
    let domain = "general";

    // Determine domain from tool/action
    if (toolName === "prism_calc" || toolName === "prism_safety") domain = "machining";
    else if (toolName === "prism_thread") domain = "threading";
    else if (toolName === "prism_toolpath") domain = "toolpath";
    else if (toolName === "prism_data" && (action === "material_get" || action === "material_search")) domain = "materials";
    else if (toolName === "prism_data" && (action === "alarm_decode" || action === "alarm_search")) domain = "alarms";

    // === Material enrichment for machining/threading domains ===
    if ((domain === "machining" || domain === "threading") && params) {
      // Check for material param variants
      const matRef = params.material || params.material_id || params.material_name || params.work_material || "";
      if (matRef && typeof matRef === "string" && matRef.length > 0) {
        try {
          if (fs.existsSync(MATERIALS_MASTER_FILE)) {
            const data = JSON.parse(fs.readFileSync(MATERIALS_MASTER_FILE, "utf-8"));
            const entries = Array.isArray(data.materials) ? data.materials : Array.isArray(data) ? data : [];
            const matLower = matRef.toLowerCase();
            for (const entry of entries) {
              const eName = (entry.name || "").toLowerCase();
              const eId = (entry.material_id || "").toLowerCase();
              const eCat = (entry.category || "").toLowerCase();
              const eIso = (entry.iso || "").toLowerCase();
              // Match on name, id, category, or ISO group
              if (eName.includes(matLower) || eId.includes(matLower) || eCat.includes(matLower) || matLower === eIso) {
                const displayName = entry.name || entry.material_id || "unknown";
                const kc = entry.Kc1 || entry.kc1_1 || entry.specific_cutting_force || "?";
                const mc = entry.mc || "?";
                const iso = entry.iso || entry.iso_group || "?";
                const hb = entry.hardness_bhn ? `, HB=${entry.hardness_bhn}` : "";
                const hint = `🔧 ${displayName} (${eId.toUpperCase()}): Kc1=${kc}, mc=${mc}, ISO=${iso}${hb}`;
                materialHints.push(hint.slice(0, 200));
                if (materialHints.length >= 3) break;
              }
            }
          }
        } catch { /* material lookup failed */ }
      }

      // Add safe default ranges based on domain
      if (domain === "machining") {
        if (params.cutting_speed !== undefined) {
          const vc = Number(params.cutting_speed);
          if (vc > 0) {
            if (vc > 500) materialHints.push("⚠️ Vc>500 m/min — verify: typical steel <300, aluminum <600, titanium <80");
            if (vc < 5) materialHints.push("⚠️ Vc<5 m/min — unusually low, verify units (m/min expected)");
          }
        }
        if (params.axial_depth !== undefined && params.tool_diameter !== undefined) {
          const ap = Number(params.axial_depth);
          const d = Number(params.tool_diameter);
          if (ap > 2 * d) materialHints.push(`⚠️ ap/D ratio=${(ap/d).toFixed(1)} — exceeds 2.0, high deflection risk`);
        }
      }
    }

    // === Formula enrichment — surface relevant formulas for calc actions ===
    if (toolName === "prism_calc") {
      const FORMULA_MAP: Record<string, string[]> = {
        "cutting_force": ["Kienzle: Fc = kc1.1 × b × h^(1-mc)", "Specific energy: e = Fc/(ap×ae)"],
        "tool_life": ["Taylor: VcT^n = C", "Extended Taylor: VcT^n × f^a × ap^b = C"],
        "speed_feed": ["Vc = π×D×n/1000", "Vf = fz × z × n"],
        "flow_stress": ["Johnson-Cook: σ = (A+Bε^n)(1+C·ln(ε̇*))(1-T*^m)"],
        "mrr": ["MRR = Vc × fz × z × ap × ae / (π×D)", "Q = ae × ap × Vf"],
        "power": ["Pc = Fc × Vc / (60×1000×η)", "Torque: M = Fc × D/(2×1000)"],
        "stability": ["Spindle speed lobes: n_stable = 60×f_n/(k+ε/π)", "blim = -1/(2Ks×Re[G])"],
        "thermal": ["Qchip = (1-Γ)×Fc×Vc", "T_tool = T_ambient + ΔT×(1-e^(-t/τ))"],
        "deflection": ["δ = F×L³/(3EI)", "I_round = π×d⁴/64"],
        "trochoidal": ["ae_eff = D/2 - √((D/2)² - s²)", "MRR_troch = ae × ap × Vf_path"],
      };
      const formulas = FORMULA_MAP[action] || [];
      for (const f of formulas) formulaHints.push(`📐 ${f}`);
    }

    // === Alarm enrichment for alarm-related queries ===
    if (action === "alarm_decode" || action === "alarm_search") {
      alarmHints.push("💡 Use alarm_fix for resolution steps after decoding");
    }

    const totalEnrichments = materialHints.length + formulaHints.length + alarmHints.length;

    return {
      success: true,
      call_number: callNumber,
      domain,
      material_hints: materialHints,
      formula_hints: formulaHints,
      alarm_hints: alarmHints,
      total_enrichments: totalEnrichments,
    };
  } catch (err: any) {
    return { success: false, call_number: callNumber, domain: "unknown", material_hints: [], formula_hints: [], alarm_hints: [], total_enrichments: 0 };
  }
}


// ============================================================================
// ENHANCEMENT 3: CONTEXT PULL-BACK — Re-import externalized data when room available
// ============================================================================

const EXTERNALIZED_DIR = path.join(STATE_DIR, "EXPANSION_CACHE");
const SNAPSHOTS_DIR_CE = path.join(STATE_DIR, "snapshots");

// ContextPullBackResult — imported from prism-schema

export function autoContextPullBack(
  callNumber: number,
  pressurePct: number,
  accumulatedBytes: number
): ContextPullBackResult {
  try {
    // Only pull back when pressure is low AND we've been working (not first call)
    if (pressurePct > 40 || callNumber < 5) {
      return {
        success: true, call_number: callNumber, pressure_pct: pressurePct,
        available_files: 0, pulled_back: [], pulled_back_bytes: 0,
        skipped_reason: pressurePct > 40 ? "Pressure too high for pull-back" : "Too early in session"
      };
    }

    const pulledBack: string[] = [];
    let pulledBackBytes = 0;
    let availableFiles = 0;

    // Check EXPANSION_CACHE for externalized results from this session
    const sessionTimestamp = new Date().toISOString().split("T")[0]; // today's date

    for (const dir of [EXTERNALIZED_DIR, SNAPSHOTS_DIR_CE]) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir)
          .filter(f => f.endsWith(".json") || f.endsWith(".jsonl"))
          .sort()
          .reverse()
          .slice(0, 10); // only check recent files
        
        availableFiles += files.length;

        for (const file of files) {
          // Only pull back files from today's session
          if (!file.includes(sessionTimestamp) && !file.includes("ext_")) continue;
          
          const filepath = path.join(dir, file);
          try {
            const stat = fs.statSync(filepath);
            const fileBytes = stat.size;
            
            // Don't pull back if it would push us over 50% pressure
            if (pulledBackBytes + fileBytes > 50000) continue; // max 50KB pull-back
            
            const content = fs.readFileSync(filepath, "utf-8");
            const data = JSON.parse(content);
            
            // Create a pull-back summary (not full content — just key fields)
            const summary: any = {
              _pulled_from: filepath,
              _pulled_at: new Date().toISOString(),
            };
            
            // Extract meaningful fields only
            if (data.tool_name) summary.original_tool = data.tool_name;
            if (data.action) summary.original_action = data.action;
            if (data.timestamp) summary.original_time = data.timestamp;
            if (data.result_preview) summary.result_preview = data.result_preview;
            if (data.key_findings) summary.key_findings = data.key_findings;
            if (data.task) summary.task = data.task;
            if (data.completed) summary.completed_steps = data.completed;
            
            // Write the summary to a pull-back manifest
            const manifestPath = path.join(STATE_DIR, "pullback_manifest.json");
            let manifest: any[] = [];
            if (fs.existsSync(manifestPath)) {
              try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")); } catch { manifest = []; }
            }
            manifest.push(summary);
            if (manifest.length > 10) manifest = manifest.slice(-10);
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            
            pulledBack.push(`${path.basename(filepath)} (${Math.round(fileBytes/1024)}KB)`);
            pulledBackBytes += fileBytes;
          } catch { /* individual file failed — continue */ }
        }
      } catch { /* dir read failed */ }
    }

    return {
      success: true,
      call_number: callNumber,
      pressure_pct: pressurePct,
      available_files: availableFiles,
      pulled_back: pulledBack,
      pulled_back_bytes: pulledBackBytes,
      skipped_reason: pulledBack.length === 0 ? "No eligible files for pull-back" : null,
    };
  } catch (err: any) {
    return {
      success: false, call_number: callNumber, pressure_pct: pressurePct,
      available_files: 0, pulled_back: [], pulled_back_bytes: 0,
      skipped_reason: `Pull-back failed: ${err.message}`
    };
  }
}


// ============================================================================
// ENHANCEMENT 4: INPUT VALIDATION WITH TEETH — Real range checks before calcs
// ============================================================================

// ValidationWarning — imported from prism-schema

// InputValidationResult — imported from prism-schema

// Safe manufacturing ranges based on physics (not arbitrary)
const SAFE_RANGES: Record<string, { min: number; max: number; unit: string; critical_max?: number }> = {
  cutting_speed:     { min: 1,    max: 1000,  unit: "m/min",  critical_max: 2000 },
  feed_per_tooth:    { min: 0.001, max: 2.0,  unit: "mm/tooth", critical_max: 5.0 },
  axial_depth:       { min: 0.01,  max: 100,  unit: "mm",     critical_max: 200 },
  radial_depth:      { min: 0.01,  max: 200,  unit: "mm",     critical_max: 300 },
  tool_diameter:     { min: 0.1,   max: 200,  unit: "mm",     critical_max: 500 },
  number_of_teeth:   { min: 1,     max: 20,   unit: "teeth",  critical_max: 100 },
  spindle_speed:     { min: 1,     max: 80000, unit: "rpm",   critical_max: 120000 },
  depth_of_cut:      { min: 0.01,  max: 100,  unit: "mm",     critical_max: 200 },
  feed_rate:         { min: 1,     max: 20000, unit: "mm/min", critical_max: 50000 },
  chip_thickness:    { min: 0.001, max: 2.0,  unit: "mm",     critical_max: 5.0 },
  nose_radius:       { min: 0.01,  max: 10,   unit: "mm",     critical_max: 25 },
  lead_angle:        { min: 0,     max: 90,   unit: "deg",    critical_max: 90 },
  rake_angle:        { min: -30,   max: 30,   unit: "deg",    critical_max: 45 },
  tool_length:       { min: 10,    max: 500,  unit: "mm",     critical_max: 1000 },
  // Thread-specific
  thread_pitch:      { min: 0.2,   max: 8,    unit: "mm",     critical_max: 25 },
  hole_diameter:     { min: 0.5,   max: 500,  unit: "mm",     critical_max: 1000 },
  thread_depth:      { min: 0.1,   max: 100,  unit: "mm",     critical_max: 300 },
  // Safety-specific
  clamp_force:       { min: 100,   max: 500000, unit: "N",    critical_max: 1000000 },
  cutting_force:     { min: 1,     max: 50000,  unit: "N",    critical_max: 100000 },
};

// Ratio checks (param1/param2 relationships)
const RATIO_CHECKS: Array<{
  num: string; den: string; max_ratio: number; warning: string; severity: "warning" | "critical";
}> = [
  { num: "axial_depth", den: "tool_diameter", max_ratio: 3.0, warning: "ap/D > 3.0 — extreme slotting depth, high deflection risk", severity: "critical" },
  { num: "radial_depth", den: "tool_diameter", max_ratio: 1.0, warning: "ae/D > 1.0 — radial engagement exceeds tool diameter", severity: "critical" },
  { num: "tool_length", den: "tool_diameter", max_ratio: 10.0, warning: "L/D > 10 — severe chatter/deflection risk", severity: "warning" },
];

export function autoInputValidation(
  callNumber: number,
  toolName: string,
  action: string,
  params: Record<string, any>
): InputValidationResult {
  try {
    const warnings: ValidationWarning[] = [];
    let blocked = false;
    let blockReason: string | null = null;

    // Only validate calc, safety, and thread tools
    if (!["prism_calc", "prism_safety", "prism_thread"].includes(toolName)) {
      return { success: true, call_number: callNumber, tool: toolName, action, warnings: [], blocked: false, block_reason: null };
    }

    if (!params || typeof params !== "object") {
      return { success: true, call_number: callNumber, tool: toolName, action, warnings: [], blocked: false, block_reason: null };
    }

    // === Individual param range checks ===
    for (const [paramName, range] of Object.entries(SAFE_RANGES)) {
      const val = params[paramName];
      if (val === undefined || val === null) continue;
      const numVal = Number(val);
      if (isNaN(numVal)) {
        warnings.push({ param: paramName, value: NaN, issue: `Non-numeric value: "${val}"`, severity: "critical" });
        continue;
      }
      if (numVal <= 0 && range.min > 0) {
        warnings.push({ param: paramName, value: numVal, issue: `Zero or negative value for ${paramName}`, severity: "critical", safe_range: `${range.min}-${range.max} ${range.unit}` });
        blocked = true;
        blockReason = `${paramName}=${numVal} is non-positive — physically impossible`;
        continue;
      }
      if (range.critical_max && numVal > range.critical_max) {
        warnings.push({ param: paramName, value: numVal, issue: `EXCEEDS CRITICAL MAX (${range.critical_max} ${range.unit})`, severity: "critical", safe_range: `${range.min}-${range.max} ${range.unit}` });
        blocked = true;
        blockReason = `${paramName}=${numVal} exceeds critical maximum ${range.critical_max} ${range.unit}`;
      } else if (numVal > range.max) {
        warnings.push({ param: paramName, value: numVal, issue: `Above normal range (max ${range.max} ${range.unit})`, severity: "warning", safe_range: `${range.min}-${range.max} ${range.unit}` });
      } else if (numVal < range.min) {
        warnings.push({ param: paramName, value: numVal, issue: `Below normal range (min ${range.min} ${range.unit})`, severity: "warning", safe_range: `${range.min}-${range.max} ${range.unit}` });
      }
    }

    // === Ratio checks ===
    for (const check of RATIO_CHECKS) {
      const numVal = Number(params[check.num]);
      const denVal = Number(params[check.den]);
      if (!isNaN(numVal) && !isNaN(denVal) && denVal > 0) {
        const ratio = numVal / denVal;
        if (ratio > check.max_ratio) {
          warnings.push({
            param: `${check.num}/${check.den}`,
            value: Math.round(ratio * 100) / 100,
            issue: check.warning,
            severity: check.severity,
            safe_range: `< ${check.max_ratio}`,
          });
          if (check.severity === "critical") {
            blocked = true;
            blockReason = blockReason || check.warning;
          }
        }
      }
    }

    // === Unit sanity checks ===
    // If cutting_speed > 1000 and looks like RPM was given instead of m/min
    if (params.cutting_speed && params.tool_diameter) {
      const vc = Number(params.cutting_speed);
      const d = Number(params.tool_diameter);
      if (vc > 500 && d > 0) {
        const impliedRPM = (vc * 1000) / (Math.PI * d);
        if (impliedRPM > 100000) {
          warnings.push({
            param: "cutting_speed",
            value: vc,
            issue: `Implies ${Math.round(impliedRPM)} RPM — did you pass RPM instead of m/min?`,
            severity: "warning",
            safe_range: "Vc in m/min, not RPM",
          });
        }
      }
    }

    // Persist validation results for learning
    if (warnings.length > 0) {
      try {
        const valLogPath = path.join(STATE_DIR, "validation_warnings.jsonl");
        const entry = {
          timestamp: new Date().toISOString(),
          call_number: callNumber,
          tool: toolName,
          action,
          warnings: warnings.length,
          blocked,
          details: warnings.map(w => `${w.param}=${w.value}: ${w.issue}`).join("; "),
        };
        fs.appendFileSync(valLogPath, JSON.stringify(entry) + "\n");
      } catch { /* log failed — non-fatal */ }
    }

    return { success: true, call_number: callNumber, tool: toolName, action, warnings, blocked, block_reason: blockReason };
  } catch (err: any) {
    return { success: false, call_number: callNumber, tool: toolName, action, warnings: [], blocked: false, block_reason: `Validation error: ${err.message}` };
  }
}


// ============================================================================
// ENHANCEMENT 5: SCRIPT RECOMMENDATIONS — Surface relevant scripts for tasks
// ============================================================================

const SCRIPTS_BASE_DIR = "C:\\PRISM\\scripts";
const SCRIPT_INDEX_FILE = path.join(STATE_DIR, "SCRIPT_INDEX.md");

// Domain-to-script mapping for fast lookup (built from script inventory)
const SCRIPT_DOMAIN_MAP: Record<string, Array<{ script: string; description: string }>> = {
  // Calc-related
  "cutting_force": [
    { script: "kienzle_calculator.py", description: "Full Kienzle force calculation with material DB lookup" },
    { script: "cutting_force_analyzer.py", description: "Multi-pass force analysis with chip thinning" },
  ],
  "tool_life": [
    { script: "taylor_optimizer.py", description: "Taylor tool life optimization across speed range" },
    { script: "tool_wear_predictor.py", description: "Flank wear prediction based on cutting conditions" },
  ],
  "speed_feed": [
    { script: "speed_feed_optimizer.py", description: "Multi-objective speed/feed optimization" },
    { script: "productivity_calculator.py", description: "Cycle time vs. tool cost optimization" },
  ],
  "mrr": [
    { script: "mrr_optimizer.py", description: "MRR optimization with power/force constraints" },
  ],
  "thermal": [
    { script: "thermal_model.py", description: "FDM-based thermal simulation for cutting zone" },
  ],
  // Material-related
  "material_get": [
    { script: "material_card_generator.py", description: "Generate complete material data card (PDF)" },
  ],
  "material_search": [
    { script: "material_comparator.py", description: "Side-by-side material property comparison" },
    { script: "material_selector.py", description: "Material selection by application requirements" },
  ],
  // Validation-related
  "validate_workholding_setup": [
    { script: "clamp_force_calculator.py", description: "Required clamping force with safety factors" },
  ],
  "check_toolpath_collision": [
    { script: "collision_checker.py", description: "Toolpath collision detection with fixture model" },
  ],
  // General
  "alarm_decode": [
    { script: "alarm_history_analyzer.py", description: "Alarm frequency analysis and root cause patterns" },
  ],
  "strategy_select": [
    { script: "strategy_advisor.py", description: "Toolpath strategy comparison with pros/cons" },
  ],
};

// ScriptRecommendResult — imported from prism-schema

export function autoScriptRecommend(
  callNumber: number,
  toolName: string,
  action: string,
  params?: Record<string, any>
): ScriptRecommendResult {
  try {
    const recommendations: Array<{ script: string; description: string; path: string | null }> = [];
    let domain = action || toolName;
    let scriptsScanned = 0;

    // Check domain map first (fast path)
    const mapped = SCRIPT_DOMAIN_MAP[action] || SCRIPT_DOMAIN_MAP[domain] || [];
    for (const rec of mapped) {
      // Verify script actually exists on disk
      let scriptPath: string | null = null;
      const candidates = [
        path.join(SCRIPTS_DIR, rec.script),
        path.join(SCRIPTS_DIR, "utilities", rec.script),
        path.join(SCRIPTS_DIR, "analysis", rec.script),
        path.join(SCRIPTS_DIR, "extraction", rec.script),
        path.join(SCRIPTS_DIR, "validation", rec.script),
      ];
      for (const candidate of candidates) {
        scriptsScanned++;
        if (fs.existsSync(candidate)) {
          scriptPath = candidate;
          break;
        }
      }
      recommendations.push({ script: rec.script, description: rec.description, path: scriptPath });
    }

    // Fallback: scan SCRIPTS_DIR for keyword matches if no mapped scripts
    if (recommendations.length === 0 && fs.existsSync(SCRIPTS_DIR)) {
      try {
        const keywords = [action, ...(action || "").split("_")].filter(k => k && k.length > 2);
        const allScripts = fs.readdirSync(SCRIPTS_DIR, { recursive: false }) as string[];
        scriptsScanned += allScripts.length;
        
        for (const file of allScripts) {
          if (typeof file !== "string" || !file.endsWith(".py")) continue;
          const fileLower = file.toLowerCase();
          for (const keyword of keywords) {
            if (fileLower.includes(keyword.toLowerCase())) {
              recommendations.push({
                script: file,
                description: `Script matching "${keyword}" — review before use`,
                path: path.join(SCRIPTS_DIR, file),
              });
              break;
            }
          }
          if (recommendations.length >= 3) break;
        }
      } catch { /* dir scan failed */ }
    }

    return {
      success: true,
      call_number: callNumber,
      recommendations: recommendations.slice(0, 3),
      domain,
      scripts_scanned: scriptsScanned,
    };
  } catch (err: any) {
    return { success: false, call_number: callNumber, recommendations: [], domain: action, scripts_scanned: 0 };
  }
}

// ============================================================================
// D2: CONTEXT INTELLIGENCE — Python-backed cadence hooks
// ============================================================================

function runPythonCadence(script: string, args: string[] = [], timeoutMs = 10000): any {
  const scriptPath = path.join(SCRIPTS_DIR, script);
  if (!fs.existsSync(scriptPath)) return { error: `Script not found: ${script}` };
  try {
    const output = execSync(`"${PYTHON}" "${scriptPath}" ${args.join(' ')}`, {
      encoding: 'utf-8', timeout: timeoutMs, cwd: SCRIPTS_DIR
    }).trim();
    try { return JSON.parse(output); } catch { return { raw: output }; }
  } catch (err: any) {
    return { error: err.message?.slice(0, 150) || "Python cadence script failed" };
  }
}

/**
 * D2 Cadence: Attention scoring — runs every 8 calls
 * Scores current context to identify low-value segments for eviction
 */
export function autoAttentionScore(
  callNumber: number,
  currentTask: string = "general"
): { success: boolean; call_number: number; summary?: any; error?: string } {
  try {
    const result = runPythonCadence("attention_scorer.py", ["--task", `"${currentTask}"`]);
    if (result.error) return { success: false, call_number: callNumber, error: result.error };
    return { success: true, call_number: callNumber, summary: result };
  } catch (err: any) {
    return { success: false, call_number: callNumber, error: err.message };
  }
}

/**
 * D2 Cadence: Python-enhanced compaction prediction — supplements @12 detect
 * Uses compaction_detector.py for deeper ML-style risk analysis
 */
export function autoPythonCompactionPredict(
  callNumber: number,
  pressurePct: number
): { success: boolean; call_number: number; prediction?: any; error?: string } {
  try {
    const result = runPythonCadence("compaction_detector.py", [
      "--call-number", String(callNumber),
      "--pressure", String(pressurePct),
      "--json"
    ]);
    if (result.error) return { success: false, call_number: callNumber, error: result.error };
    return { success: true, call_number: callNumber, prediction: result };
  } catch (err: any) {
    return { success: false, call_number: callNumber, error: err.message };
  }
}

/**
 * D2 Cadence: Python-enhanced auto compress — runs when pressure > 70%
 * Uses auto_compress.py for smarter compression decisions
 */
export function autoPythonCompress(
  callNumber: number,
  pressurePct: number
): { success: boolean; call_number: number; compress_result?: any; error?: string } {
  try {
    const result = runPythonCadence("auto_compress.py", [
      "--pressure", String(pressurePct),
      "--call-number", String(callNumber),
      "--json"
    ]);
    if (result.error) return { success: false, call_number: callNumber, error: result.error };
    return { success: true, call_number: callNumber, compress_result: result };
  } catch (err: any) {
    return { success: false, call_number: callNumber, error: err.message };
  }
}

/**
 * D2 Cadence: Context expansion — runs when pressure < 40%
 * Uses context_expander.py to restore previously compressed content
 */
export function autoPythonExpand(
  callNumber: number,
  pressurePct: number
): { success: boolean; call_number: number; expand_result?: any; error?: string } {
  try {
    const result = runPythonCadence("context_expander.py", [
      "--pressure", String(pressurePct),
      "--call-number", String(callNumber),
      "--json"
    ]);
    if (result.error) return { success: false, call_number: callNumber, error: result.error };
    return { success: true, call_number: callNumber, expand_result: result };
  } catch (err: any) {
    return { success: false, call_number: callNumber, error: err.message };
  }
}

// ============================================================================
// D3: LEARNING & PATTERN DETECTION — Python-backed auto-fire hooks
// ============================================================================

/**
 * D3 Auto-fire: Error chain — error_extractor → pattern_detector → learning_store
 * Runs on every error for persistent cross-session learning
 */
export function autoD3ErrorChain(
  callNumber: number,
  toolName: string,
  action: string,
  errorMessage: string
): { success: boolean; call_number: number; extracted?: any; pattern?: any; learned?: any; error?: string } {
  try {
    const safeMsg = errorMessage.slice(0, 200).replace(/"/g, "'");
    const safeAction = `${toolName}:${action}`;

    // error_extractor.py: --text TEXT (not --error)
    const extracted = runPythonCadence("error_extractor.py", [
      "--text", `"${safeAction}: ${safeMsg}"`
    ], 5000);

    // pattern_detector.py: --detect (no --tool)
    const pattern = runPythonCadence("pattern_detector.py", [
      "--detect"
    ], 5000);

    // learning_store.py: --learn TYPE TRIGGER ACTION EXPLAIN (4 positional args)
    const learned = runPythonCadence("learning_store.py", [
      "--learn", "error", `"${safeAction}"`, "investigate", `"${safeMsg.slice(0, 80)}"`
    ], 5000);

    return { success: true, call_number: callNumber, extracted, pattern, learned };
  } catch (err: any) {
    return { success: false, call_number: callNumber, error: err.message };
  }
}

/**
 * D3 Auto-fire: LKG update — runs on every success to track last-known-good state
 */
export function autoD3LkgUpdate(
  callNumber: number,
  toolName: string,
  action: string,
  durationMs: number
): { success: boolean; call_number: number; lkg?: any; error?: string } {
  try {
    const result = runPythonCadence("lkg_tracker.py", [
      "auto", "--json"
    ], 5000);
    return { success: true, call_number: callNumber, lkg: result };
  } catch (err: any) {
    return { success: false, call_number: callNumber, error: err.message };
  }
}


// ============================================================================
// D2: COMPACTION SURVIVAL — Persist critical context before compaction
// ============================================================================

const COMPACTION_SURVIVAL_FILE = path.join(STATE_DIR, "COMPACTION_SURVIVAL.json");

// CompactionSurvivalData — imported from prism-schema


/**
 * Derives the next actionable step from todo and recent context.
 * Used by compaction survival to give Claude an explicit continuation instruction.
 */
function deriveNextAction(todoSnapshot: string, quickResume: string, recentActions: string[]): string {
  // Priority 0: WORKFLOW_STATE.json — most authoritative (W6.1)
  try {
    const wfPath = path.join(STATE_DIR, "WORKFLOW_STATE.json");
    if (fs.existsSync(wfPath)) {
      const wf = JSON.parse(fs.readFileSync(wfPath, "utf-8"));
      if (wf.status === "active" && wf.current_step && wf.steps) {
        const cur = wf.steps[wf.current_step - 1];
        if (cur) {
          const done = wf.steps.filter((s: any) => s.status === "done").length;
          return `WORKFLOW ${wf.workflow_type} step ${wf.current_step}/${wf.total_steps} (${cur.name}): ${cur.intent} [${done} done, ${wf.total_steps - done} remaining]`;
        }
      }
    }
  } catch {}

  // Priority 1: ACTION_TRACKER next pending items
  try {
    const trackerPath = "C:\\PRISM\\mcp-server\\data\\docs\\ACTION_TRACKER.md";
    if (fs.existsSync(trackerPath)) {
      const tracker = fs.readFileSync(trackerPath, "utf-8");
      const nextMatch = tracker.match(/## NEXT SESSION[^\n]*\n([\s\S]*?)(?=\n## |$)/);
      if (nextMatch) {
        const pending = nextMatch[1].match(/⏳\s*([^\n]+)/g);
        if (pending && pending.length > 0) {
          return pending[0].replace(/⏳\s*/, "").trim().slice(0, 250);
        }
      }
    }
  } catch {}

  // Priority 2: todo current step
  try {
    const lines = todoSnapshot.split("\n");
    const currentStep = lines.find(l => l.includes("← CURRENT") || (l.includes("- [ ]") && !l.includes("- [x]")));
    if (currentStep) {
      const stepText = currentStep.replace(/.*\]\s*/, "").replace("← CURRENT", "").trim();
      if (stepText.length > 5) return `Continue: ${stepText}`;
    }
  } catch { /* */ }

  // Priority 3: quick_resume
  if (quickResume && quickResume.length > 10) {
    const parts = quickResume.split("|").pop()?.trim() || quickResume.split(".").pop()?.trim();
    if (parts && parts.length > 5) return `Resume: ${parts.slice(0, 200)}`;
  }

  // Priority 4: flight recorder last action  
  try {
    const raFile = path.join(STATE_DIR, "RECENT_ACTIONS.json");
    if (fs.existsSync(raFile)) {
      const ra = JSON.parse(fs.readFileSync(raFile, "utf-8"));
      const actions = ra.actions || [];
      if (actions.length > 0) {
        const last = actions[actions.length - 1];
        return `Continue from: ${last.tool}:${last.action} (${last.params_summary || ""})`.slice(0, 250);
      }
    }
  } catch {}

  return "Read ACTION_TRACKER.md and RECENT_ACTIONS.json, then continue W2 wiring roadmap.";
}

// ============================================================================
// F2.2: RECOVERY MANIFEST — Single-file recovery for compaction survival
// ============================================================================

const RECOVERY_MANIFEST_FILE = path.join(STATE_DIR, "RECOVERY_MANIFEST.json");

export interface RecoveryManifest {
  version: "2.0";
  captured_at: string;
  call_number: number;
  pressure_pct: number;
  /** Single sentence: what Claude should do NEXT */
  next_action: string;
  /** Current task being worked on */
  current_task: string;
  /** Phase/workflow context */
  phase: string;
  workflow_step: string | null;
  /** Files actively being edited */
  active_files: string[];
  /** Last 5 tool calls for continuity */
  recent_calls: string[];
  /** Todo items (pending only) */
  pending_todos: string[];
  /** Key decisions made this session */
  recent_decisions: string[];
  /** Claude's own reasoning notes from SESSION_JOURNAL */
  reasoning_notes: string[];
  /** Quick resume from CURRENT_STATE */
  quick_resume: string;
  /** ATCS state if active */
  atcs_active: boolean;
  atcs_task_id?: string;
  atcs_current_unit?: string;
}

/**
 * F2.2: Writes a single comprehensive RECOVERY_MANIFEST.json every 5 calls.
 * On compaction, this ONE file has everything Claude needs to continue.
 * Replaces the need to read 4+ files during recovery.
 */
export function autoRecoveryManifest(
  callNumber: number,
  pressurePct: number,
  recentCadenceActions: string[] = [],
  currentTaskOverride?: string
): { success: boolean; call_number: number; file: string; error?: string } {
  try {
    // 1. Current task
    let currentTask = currentTaskOverride || "unknown";
    let quickResume = "";
    let phase = "unknown";
    try {
      if (fs.existsSync(CURRENT_STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(CURRENT_STATE_FILE, "utf-8"));
        quickResume = (state.quickResume || state.quick_resume || "").slice(0, 2000);
        phase = state.currentSession?.phase || state.phase || "unknown";
        if (currentTask === "unknown") {
          currentTask = state.currentSession?.task || state.currentTask || "unknown";
        }
      }
    } catch {}

    // 2. Workflow step
    let workflowStep: string | null = null;
    try {
      const wfPath = path.join(STATE_DIR, "WORKFLOW_STATE.json");
      if (fs.existsSync(wfPath)) {
        const wf = JSON.parse(fs.readFileSync(wfPath, "utf-8"));
        if (wf.status === "active") {
          const cur = wf.steps?.[wf.current_step - 1];
          const total = wf.total_steps || wf.steps?.length || 0;
          workflowStep = `Step ${wf.current_step}/${total}: ${cur?.name || "?"} — ${cur?.intent || "?"}`;
        }
      }
    } catch {}

    // 3. Active files from RECENT_ACTIONS
    let activeFiles: string[] = [];
    let recentCalls: string[] = [];
    try {
      const raFile = path.join(STATE_DIR, "RECENT_ACTIONS.json");
      if (fs.existsSync(raFile)) {
        const ra = JSON.parse(fs.readFileSync(raFile, "utf-8"));
        const actions = ra.actions || [];
        recentCalls = actions.slice(-5).map((a: any) =>
          `${a.tool}:${a.action} ${a.success ? "✓" : "✗"} ${(a.params_summary || "").slice(0, 80)}`
        );
        // Extract file paths
        const files = new Set<string>();
        for (const a of actions.slice(-20)) {
          const ps = a.params_summary || "";
          const m = ps.match(/(?:path|file|filePath|name)[=:]\s*["']?([^\s"',}]+)/gi);
          if (m) m.forEach((match: string) => {
            const val = match.replace(/^[^=:]+[=:]\s*["']?/, "");
            if (val.includes("\\") || val.includes("/")) files.add(val);
          });
        }
        activeFiles = [...files].slice(-10);
      }
    } catch {}

    // 4. Pending todos
    let pendingTodos: string[] = [];
    try {
      if (fs.existsSync(TODO_FILE)) {
        const todo = fs.readFileSync(TODO_FILE, "utf-8");
        pendingTodos = todo.split("\n")
          .filter(l => l.includes("⏳") || l.includes("- [ ]") || (l.includes("🔴") && !l.includes("✅")))
          .map(l => l.trim().replace(/^[-*]\s*(\[.\])?\s*/, "").replace(/^⏳\s*/, ""))
          .filter(Boolean)
          .slice(0, 10);
      }
    } catch {}

    // 5. Recent decisions
    let recentDecisions: string[] = [];
    try {
      const decDir = path.join(STATE_DIR, "decisions");
      if (fs.existsSync(decDir)) {
        const files = fs.readdirSync(decDir).sort().slice(-5);
        for (const f of files) {
          try {
            const d = JSON.parse(fs.readFileSync(path.join(decDir, f), "utf-8"));
            recentDecisions.push(`${d.decision || d.description || f}: ${d.rationale || ""}`.slice(0, 150));
          } catch {}
        }
      }
    } catch {}

    // 6. Claude's own reasoning notes from SESSION_JOURNAL
    let reasoningNotes: string[] = [];
    try {
      const jPath = path.join(STATE_DIR, "SESSION_JOURNAL.jsonl");
      if (fs.existsSync(jPath)) {
        const lines = fs.readFileSync(jPath, "utf-8").trim().split("\n").filter(Boolean);
        reasoningNotes = lines.slice(-20)
          .map(l => { try { return JSON.parse(l); } catch { return null; } })
          .filter((e: any) => e?.notes)
          .map((e: any) => `[call ${e.call}] ${e.tool}:${e.action} — ${e.notes}`)
          .slice(-8);
      }
    } catch {}

    // 7. ATCS state
    let atcsActive = false;
    let atcsTaskId: string | undefined;
    let atcsCurrentUnit: string | undefined;
    try {
      const atcsDir = "C:\\PRISM\\autonomous-tasks";
      if (fs.existsSync(atcsDir)) {
        const taskDirs = fs.readdirSync(atcsDir)
          .filter(d => { try { return fs.statSync(path.join(atcsDir, d)).isDirectory(); } catch { return false; } });
        for (const td of taskDirs) {
          const manifest = path.join(atcsDir, td, "TASK_MANIFEST.json");
          if (fs.existsSync(manifest)) {
            const m = JSON.parse(fs.readFileSync(manifest, "utf-8"));
            if (m.status === "active" || m.status === "in_progress") {
              atcsActive = true;
              atcsTaskId = m.task_id || td;
              // Find current unit
              const queue = path.join(atcsDir, td, "WORK_QUEUE.json");
              if (fs.existsSync(queue)) {
                const q = JSON.parse(fs.readFileSync(queue, "utf-8"));
                const current = (q.units || []).find((u: any) => u.status === "in_progress" || u.status === "pending");
                if (current) atcsCurrentUnit = `${current.unit_id}: ${current.description || current.name || "?"}`;
              }
              break;
            }
          }
        }
      }
    } catch {}

    // 8. Derive next action
    const nextAction = deriveNextAction(
      pendingTodos.join("\n"),
      quickResume,
      recentCalls
    );

    // Build manifest
    const manifest: RecoveryManifest = {
      version: "2.0",
      captured_at: new Date().toISOString(),
      call_number: callNumber,
      pressure_pct: pressurePct,
      next_action: nextAction,
      current_task: currentTask,
      phase,
      workflow_step: workflowStep,
      active_files: activeFiles,
      recent_calls: recentCalls,
      pending_todos: pendingTodos,
      recent_decisions: recentDecisions,
      reasoning_notes: reasoningNotes,
      quick_resume: quickResume.slice(0, 1000),
      atcs_active: atcsActive,
      ...(atcsTaskId ? { atcs_task_id: atcsTaskId } : {}),
      ...(atcsCurrentUnit ? { atcs_current_unit: atcsCurrentUnit } : {}),
    };

    fs.writeFileSync(RECOVERY_MANIFEST_FILE, JSON.stringify(manifest, null, 2));
    return { success: true, call_number: callNumber, file: RECOVERY_MANIFEST_FILE };
  } catch (err: any) {
    return { success: false, call_number: callNumber, file: RECOVERY_MANIFEST_FILE, error: err.message };
  }
}

// ============================================================================
// F2.4: AUTO-HANDOFF PACKAGE — Cross-session continuation
// ============================================================================

const HANDOFF_PACKAGE_FILE = path.join(STATE_DIR, "HANDOFF_PACKAGE.json");

export interface HandoffPackage {
  version: "1.0";
  created_at: string;
  session_call_count: number;
  trigger: "yellow_zone" | "pressure_high" | "manual";
  /** What was being worked on */
  current_task: string;
  phase: string;
  /** Explicit instruction for next session's Claude */
  resume_instruction: string;
  /** Workflow state if active */
  workflow: {
    active: boolean;
    type?: string;
    name?: string;
    current_step?: number;
    total_steps?: number;
    current_step_name?: string;
    current_step_intent?: string;
    completed_steps?: string[];
    remaining_steps?: string[];
  };
  /** Files that were being edited */
  active_files: string[];
  /** Pending work items */
  pending_todos: string[];
  /** Claude's reasoning notes */
  reasoning_notes: string[];
  /** ATCS state */
  atcs: {
    active: boolean;
    task_id?: string;
    current_unit?: string;
    progress_pct?: number;
  };
  /** Quick resume string */
  quick_resume: string;
  /** Whether this handoff has been consumed by a subsequent session */
  resumed: boolean;
}

/**
 * F2.4: Creates a comprehensive handoff package for cross-session continuation.
 * Fires ONCE when entering yellow zone (call 21+) or when pressure exceeds threshold.
 * More structured than recovery manifest — includes explicit resume instructions.
 */
export function autoHandoffPackage(
  callNumber: number,
  trigger: HandoffPackage["trigger"],
  currentTaskOverride?: string
): { success: boolean; call_number: number; file: string; error?: string } {
  try {
    // 1. Current task + phase
    let currentTask = currentTaskOverride || "unknown";
    let quickResume = "";
    let phase = "unknown";
    try {
      if (fs.existsSync(CURRENT_STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(CURRENT_STATE_FILE, "utf-8"));
        quickResume = (state.quickResume || state.quick_resume || "").slice(0, 2000);
        phase = state.currentSession?.phase || state.phase || "unknown";
        if (currentTask === "unknown") {
          currentTask = state.currentSession?.task || state.currentTask || "unknown";
        }
      }
    } catch {}

    // 2. Workflow state
    const workflow: HandoffPackage["workflow"] = { active: false };
    try {
      const wfPath = path.join(STATE_DIR, "WORKFLOW_STATE.json");
      if (fs.existsSync(wfPath)) {
        const wf = JSON.parse(fs.readFileSync(wfPath, "utf-8"));
        if (wf.status === "active") {
          const cur = wf.steps?.[wf.current_step - 1];
          workflow.active = true;
          workflow.type = wf.workflow_type;
          workflow.name = wf.name;
          workflow.current_step = wf.current_step;
          workflow.total_steps = wf.total_steps || wf.steps?.length || 0;
          workflow.current_step_name = cur?.name;
          workflow.current_step_intent = cur?.intent;
          workflow.completed_steps = wf.steps
            .filter((s: any) => s.status === "done")
            .map((s: any) => `${s.name} ✅`);
          workflow.remaining_steps = wf.steps
            .filter((s: any) => s.status !== "done")
            .map((s: any) => `Step ${s.id}: ${s.name} — ${s.intent}`);
        }
      }
    } catch {}

    // 3. Active files from recent actions
    let activeFiles: string[] = [];
    try {
      const raFile = path.join(STATE_DIR, "RECENT_ACTIONS.json");
      if (fs.existsSync(raFile)) {
        const ra = JSON.parse(fs.readFileSync(raFile, "utf-8"));
        const files = new Set<string>();
        for (const a of (ra.actions || []).slice(-20)) {
          const ps = a.params_summary || "";
          const m = ps.match(/(?:path|file|filePath|name)[=:]\s*["']?([^\s"',}]+)/gi);
          if (m) m.forEach((match: string) => {
            const val = match.replace(/^[^=:]+[=:]\s*["']?/, "");
            if (val.includes("\\") || val.includes("/")) files.add(val);
          });
        }
        activeFiles = [...files].slice(-10);
      }
    } catch {}

    // 4. Pending todos
    let pendingTodos: string[] = [];
    try {
      if (fs.existsSync(TODO_FILE)) {
        pendingTodos = fs.readFileSync(TODO_FILE, "utf-8").split("\n")
          .filter(l => l.includes("⏳") || l.includes("- [ ]") || (l.includes("🔴") && !l.includes("✅")))
          .map(l => l.trim().replace(/^[-*]\s*(\[.\])?\s*/, "").replace(/^⏳\s*/, ""))
          .filter(Boolean)
          .slice(0, 10);
      }
    } catch {}

    // 5. Reasoning notes
    let reasoningNotes: string[] = [];
    try {
      const jPath = path.join(STATE_DIR, "SESSION_JOURNAL.jsonl");
      if (fs.existsSync(jPath)) {
        reasoningNotes = fs.readFileSync(jPath, "utf-8").trim().split("\n").filter(Boolean)
          .slice(-20)
          .map(l => { try { return JSON.parse(l); } catch { return null; } })
          .filter((e: any) => e?.notes)
          .map((e: any) => `[call ${e.call}] ${e.tool}:${e.action} — ${e.notes}`)
          .slice(-8);
      }
    } catch {}

    // 6. ATCS state
    const atcs: HandoffPackage["atcs"] = { active: false };
    try {
      const atcsDir = "C:\\PRISM\\autonomous-tasks";
      if (fs.existsSync(atcsDir)) {
        const taskDirs = fs.readdirSync(atcsDir)
          .filter(d => { try { return fs.statSync(path.join(atcsDir, d)).isDirectory(); } catch { return false; } });
        for (const td of taskDirs) {
          const manifest = path.join(atcsDir, td, "TASK_MANIFEST.json");
          if (fs.existsSync(manifest)) {
            const m = JSON.parse(fs.readFileSync(manifest, "utf-8"));
            if (m.status === "active" || m.status === "in_progress") {
              atcs.active = true;
              atcs.task_id = m.task_id || td;
              atcs.progress_pct = m.progress_pct;
              const queue = path.join(atcsDir, td, "WORK_QUEUE.json");
              if (fs.existsSync(queue)) {
                const q = JSON.parse(fs.readFileSync(queue, "utf-8"));
                const current = (q.units || []).find((u: any) => u.status === "in_progress" || u.status === "pending");
                if (current) atcs.current_unit = `${current.unit_id}: ${current.description || current.name || "?"}`;
              }
              break;
            }
          }
        }
      }
    } catch {}

    // 7. Build resume instruction
    let resumeInstruction: string;
    if (workflow.active) {
      resumeInstruction = `RESUME workflow "${workflow.name}" at step ${workflow.current_step}/${workflow.total_steps}: ${workflow.current_step_name} — ${workflow.current_step_intent}. Do NOT redo completed steps: ${(workflow.completed_steps || []).join(", ")}`;
    } else if (atcs.active) {
      resumeInstruction = `RESUME ATCS task ${atcs.task_id}. Current unit: ${atcs.current_unit || "next in queue"}. Run prism_atcs→task_resume then queue_next.`;
    } else if (pendingTodos.length > 0) {
      resumeInstruction = `Continue work. Next pending: ${pendingTodos[0]}. Read todo.md and RECOVERY_MANIFEST.json for full context.`;
    } else {
      resumeInstruction = deriveNextAction(
        pendingTodos.join("\n"),
        quickResume,
        []
      );
    }

    // 8. Write package
    const pkg: HandoffPackage = {
      version: "1.0",
      created_at: new Date().toISOString(),
      session_call_count: callNumber,
      trigger,
      current_task: currentTask.slice(0, 500),
      phase,
      resume_instruction: resumeInstruction,
      workflow,
      active_files: activeFiles,
      pending_todos: pendingTodos,
      reasoning_notes: reasoningNotes,
      atcs,
      quick_resume: quickResume.slice(0, 1000),
      resumed: false,
    };

    fs.writeFileSync(HANDOFF_PACKAGE_FILE, JSON.stringify(pkg, null, 2));
    return { success: true, call_number: callNumber, file: HANDOFF_PACKAGE_FILE };
  } catch (err: any) {
    return { success: false, call_number: callNumber, file: HANDOFF_PACKAGE_FILE, error: err.message };
  }
}

/**
 * Mark a handoff package as resumed (so it doesn't trigger auto-resume again).
 */
export function markHandoffResumed(): boolean {
  try {
    if (fs.existsSync(HANDOFF_PACKAGE_FILE)) {
      const pkg = JSON.parse(fs.readFileSync(HANDOFF_PACKAGE_FILE, "utf-8"));
      pkg.resumed = true;
      pkg.resumed_at = new Date().toISOString();
      fs.writeFileSync(HANDOFF_PACKAGE_FILE, JSON.stringify(pkg, null, 2));
      return true;
    }
    return false;
  } catch { return false; }
}

/**
 * Captures critical working context to disk so it survives compaction.
 * Fires automatically when pressure >= 75%. Overwrites on each capture
 * so it always reflects the latest state.
 */
export function autoCompactionSurvival(
  callNumber: number,
  pressurePct: number,
  recentActions: string[] = [],
  currentTask: string = "unknown"
): { success: boolean; call_number: number; file: string; error?: string } {
  try {
    let todoSnapshot = "";
    try {
      if (fs.existsSync(TODO_FILE)) todoSnapshot = fs.readFileSync(TODO_FILE, "utf-8").slice(0, 2000);
    } catch { /* */ }

    let quickResume = "", sessionId = "unknown", phase = "unknown";
    try {
      if (fs.existsSync(CURRENT_STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(CURRENT_STATE_FILE, "utf-8"));
        quickResume = (state.quickResume || "").slice(0, 3000);
        sessionId = state.currentSession?.id || state.session?.toString() || state.sessionNumber || "unknown";
        phase = state.currentSession?.phase || state.phase || "unknown";
      }
    } catch { /* */ }

    let recentDecisions: string[] = [];
    try {
      const decDir = path.join(STATE_DIR, "decisions");
      if (fs.existsSync(decDir)) {
        const files = fs.readdirSync(decDir).sort().slice(-5);
        for (const f of files) {
          try {
            const d = JSON.parse(fs.readFileSync(path.join(decDir, f), "utf-8"));
            recentDecisions.push(`${d.decision || d.description || f}: ${d.rationale || ""}`.slice(0, 150));
          } catch { /* */ }
        }
      }
    } catch { /* */ }

    let activeFiles: string[] = [];
    try {
      const raFile = path.join(STATE_DIR, "RECENT_ACTIONS.json");
      if (fs.existsSync(raFile)) {
        const ra = JSON.parse(fs.readFileSync(raFile, "utf-8"));
        const actions = ra.actions || [];
        const files = actions
          .filter((a: any) => a.params_summary)
          .map((a: any) => {
            // Extract file paths from params_summary
            const m = (a.params_summary || "").match(/(?:path|file|filePath)[=:]\s*["']?([^\s"',}]+)/i);
            return m ? m[1] : null;
          })
          .filter(Boolean);
        // Also check for file_read/file_write actions directly
        const fileActions = actions
          .filter((a: any) => (a.action === "file_read" || a.action === "file_write") && a.params_summary)
          .map((a: any) => {
            const m = (a.params_summary || "").match(/["']?([A-Z]:\\[^\s"',}]+)/i);
            return m ? m[1] : null;
          })
          .filter(Boolean);
        activeFiles = [...new Set([...files, ...fileActions])].slice(-10) as string[];
      }
    } catch { /* */ }

    let keyFindings: string[] = [`Pressure: ${pressurePct}% at call #${callNumber}`];
    try {
      if (todoSnapshot) {
        const lines = todoSnapshot.split("\n").filter(l => l.includes("✅") || l.includes("🔴") || l.includes("current"));
        keyFindings.push(...lines.slice(0, 5));
      }
    } catch { /* */ }

    const survival: CompactionSurvivalData = {
      captured_at: new Date().toISOString(),
      call_number: callNumber,
      pressure_pct: pressurePct,
      current_task: currentTask,
      key_findings: keyFindings,
      active_files: activeFiles,
      recent_decisions: recentDecisions,
      recent_actions: recentActions.slice(-15),
      todo_snapshot: todoSnapshot,
      quick_resume: quickResume,
      session_id: sessionId,
      phase,
      next_action: deriveNextAction(todoSnapshot, quickResume, recentActions),
      warnings: [`Captured at ${pressurePct}% pressure — compaction likely imminent`],
    };

    // FIX: Improve current_task from ACTION_TRACKER if still "unknown"
    if (survival.current_task === "unknown" || !survival.current_task) {
      try {
        const trackerPath = path.join(STATE_DIR, "..", "mcp-server", "data", "docs", "ACTION_TRACKER.md");
        const alt = "C:\\PRISM\\mcp-server\\data\\docs\\ACTION_TRACKER.md";
        const tp = fs.existsSync(trackerPath) ? trackerPath : (fs.existsSync(alt) ? alt : null);
        if (tp) {
          const tracker = fs.readFileSync(tp, "utf-8");
          // Try NEXT SESSION section first
          const nextMatch = tracker.match(/## NEXT SESSION[^\n]*\n([\s\S]*?)(?=\n## |$)/);
          if (nextMatch) {
            const firstPending = nextMatch[1].match(/⏳\s*([^\n]+)/);
            if (firstPending) survival.current_task = firstPending[1].trim().slice(0, 150);
          }
          // Fallback: session title
          if (survival.current_task === "unknown") {
            const titleMatch = tracker.match(/# ACTION TRACKER[^\n]*Session \d+[^(]*\(([^)]+)\)/);
            if (titleMatch) survival.current_task = titleMatch[1].trim();
          }
        }
      } catch {}
    }

    fs.writeFileSync(COMPACTION_SURVIVAL_FILE, JSON.stringify(survival, null, 2));
    return { success: true, call_number: callNumber, file: COMPACTION_SURVIVAL_FILE };
  } catch (err: any) {
    return { success: false, call_number: callNumber, file: COMPACTION_SURVIVAL_FILE, error: err.message };
  }
}

/**
 * Rehydrates context from COMPACTION_SURVIVAL.json on session start.
 * Called from PreTaskRecon. Returns null if no survival data or if stale (>4h).
 */
export function autoContextRehydrate(callNumber: number): {
  success: boolean; call_number: number; rehydrated: boolean;
  survival_data?: CompactionSurvivalData; age_minutes?: number; error?: string;
} {
  try {
    if (!fs.existsSync(COMPACTION_SURVIVAL_FILE)) {
      return { success: true, call_number: callNumber, rehydrated: false };
    }
    const data: CompactionSurvivalData = JSON.parse(fs.readFileSync(COMPACTION_SURVIVAL_FILE, "utf-8"));
    const age = (Date.now() - new Date(data.captured_at).getTime()) / 60000;
    if (age > 240) {
      return { success: true, call_number: callNumber, rehydrated: false, age_minutes: Math.round(age) };
    }
    return { success: true, call_number: callNumber, rehydrated: true, survival_data: data, age_minutes: Math.round(age) };
  } catch (err: any) {
    return { success: false, call_number: callNumber, rehydrated: false, error: err.message };
  }
}


// ============================================================================
// D4: PERFORMANCE & CACHING — Cadence Functions
// ============================================================================

import { computationCache, type CacheStats } from '../engines/ComputationCache.js';
import { diffEngine, type DiffStats } from '../engines/DiffEngine.js';
import { batchProcessor, type BatchStats } from '../engines/BatchProcessor.js';

export interface D4CacheCheckResult {
  success: boolean;
  call_number: number;
  cache_stats: CacheStats;
  expired_cleaned: number;
}

export interface D4DiffCheckResult {
  success: boolean;
  call_number: number;
  diff_stats: DiffStats;
}

export interface D4BatchTickResult {
  success: boolean;
  call_number: number;
  processed: number;
  queue_remaining: number;
  batch_stats: BatchStats;
}

export interface D4PerfSummaryResult {
  success: boolean;
  call_number: number;
  cache: CacheStats;
  diff: DiffStats;
  batch: BatchStats;
  recommendations: string[];
}

/**
 * D4 Cache maintenance — cleanup expired entries, persist stats.
 * Cadence: every 15 calls (piggybacks on existing rhythm)
 */
export function autoD4CacheCheck(callNumber: number): D4CacheCheckResult {
  try {
    const cleaned = computationCache.cleanup();
    computationCache.persistStats();
    return {
      success: true, call_number: callNumber,
      cache_stats: computationCache.getStats(),
      expired_cleaned: cleaned,
    };
  } catch (err: any) {
    return {
      success: false, call_number: callNumber,
      cache_stats: computationCache.getStats(),
      expired_cleaned: 0,
    };
  }
}

/**
 * D4 Diff stats persist — track write savings.
 * Cadence: every 15 calls (with cache check)
 */
export function autoD4DiffCheck(callNumber: number): D4DiffCheckResult {
  try {
    diffEngine.persistStats();
    return {
      success: true, call_number: callNumber,
      diff_stats: diffEngine.getStats(),
    };
  } catch {
    return {
      success: false, call_number: callNumber,
      diff_stats: diffEngine.getStats(),
    };
  }
}

/**
 * D4 Batch processor tick — process queued items.
 * Cadence: every 8 calls (with pressure check, high frequency)
 */
export async function autoD4BatchTick(callNumber: number): Promise<D4BatchTickResult> {
  try {
    const results = await batchProcessor.processTick();
    batchProcessor.persistStats();
    return {
      success: true, call_number: callNumber,
      processed: results.length,
      queue_remaining: batchProcessor.getQueueSize(),
      batch_stats: batchProcessor.getStats(),
    };
  } catch {
    return {
      success: false, call_number: callNumber,
      processed: 0, queue_remaining: batchProcessor.getQueueSize(),
      batch_stats: batchProcessor.getStats(),
    };
  }
}

/**
 * D4 Performance summary — aggregated view of all D4 subsystems.
 * Called on demand or at session end.
 */
export function autoD4PerfSummary(callNumber: number): D4PerfSummaryResult {
  const cache = computationCache.getStats();
  const diff = diffEngine.getStats();
  const batch = batchProcessor.getStats();
  const recommendations: string[] = [];

  // Generate recommendations
  if (cache.hit_rate < 0.3 && cache.hits + cache.misses > 10) {
    recommendations.push("Low cache hit rate — review TTL settings or cache key generation");
  }
  if (cache.bypasses > cache.hits) {
    recommendations.push("More safety bypasses than hits — expected for safety-heavy workloads");
  }
  if (diff.skipped_writes > 0) {
    recommendations.push(`Diff engine saved ${diff.bytes_saved} bytes across ${diff.skipped_writes} skipped writes`);
  }
  if (batch.total_failed > batch.total_processed * 0.1 && batch.total_processed > 5) {
    recommendations.push("Batch failure rate >10% — review failed operations");
  }
  if (batch.avg_wait_ms > 5000) {
    recommendations.push("High batch wait time — consider increasing MAX_BATCH_PER_TICK");
  }

  // Persist all stats
  computationCache.persistStats();
  diffEngine.persistStats();
  batchProcessor.persistStats();

  return { success: true, call_number: callNumber, cache, diff, batch, recommendations };
}


// ============================================================================
// F3: TELEMETRY SNAPSHOT CADENCE (every ~15 calls)
// ============================================================================

interface TelemetrySnapshotResult {
  success: boolean;
  call_number: number;
  dispatchers_tracked: number;
  total_records: number;
  anomalies: number;
  unacknowledged_critical: number;
  memory_kb: number;
}

export function autoTelemetrySnapshot(callNumber: number): TelemetrySnapshotResult {
  try {
    // Late import to avoid circular dependency at module load time
    const { telemetryEngine } = require('../engines/TelemetryEngine.js');
    const stats = telemetryEngine.getStats();
    return {
      success: true,
      call_number: callNumber,
      dispatchers_tracked: stats.dispatchers,
      total_records: stats.totalRecords,
      anomalies: stats.anomalies,
      unacknowledged_critical: stats.unacknowledgedCritical,
      memory_kb: Math.round(stats.memoryEstimateBytes / 1024),
    };
  } catch (e: any) {
    return {
      success: false,
      call_number: callNumber,
      dispatchers_tracked: 0,
      total_records: 0,
      anomalies: 0,
      unacknowledged_critical: 0,
      memory_kb: 0,
    };
  }
}
