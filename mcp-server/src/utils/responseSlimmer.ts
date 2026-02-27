/**
 * PRISM Response Slimmer
 * ======================
 * 
 * Reduces response payload sizes to minimize context pressure.
 * Three tiers: NORMAL (light trim), MODERATE (significant trim), AGGRESSIVE (bare minimum).
 * 
 * Used by dispatchers to keep results context-friendly without losing critical data.
 * 
 * @version 1.0.0
 * @date 2026-02-08
 */

import * as path from "path";
import { log } from "./Logger.js";
import { PATHS } from "../constants.js";
import { safeWriteSync } from "./atomicWrite.js";

export type SlimLevel = "NORMAL" | "MODERATE" | "AGGRESSIVE";

interface SlimConfig {
  maxArrayItems: number;      // Cap array results
  maxStringLength: number;    // Truncate long strings
  maxObjectDepth: number;     // Depth-limit nested objects
  stripFields: Set<string>;   // Remove low-value fields
  keepFields: Set<string>;    // Always keep these
}

const CONFIGS: Record<SlimLevel, SlimConfig> = {
  NORMAL: {
    maxArrayItems: 20,
    maxStringLength: 2000,
    maxObjectDepth: 4,
    stripFields: new Set(["_raw", "_debug", "raw_data", "internal_id", "created_at", "updated_at", "metadata_version"]),
    keepFields: new Set(["id", "name", "error", "status", "success", "blocked", "result", "value", "score"]),
  },
  MODERATE: {
    maxArrayItems: 8,
    maxStringLength: 800,
    maxObjectDepth: 3,
    stripFields: new Set([
      "_raw", "_debug", "raw_data", "internal_id", "created_at", "updated_at", "metadata_version",
      "description", "notes", "comments", "history", "changelog", "tags", "aliases",
      "source_reference", "last_modified_by", "validation_details",
      // Cadence metadata — strip at moderate pressure
      "agent_recommend", "skill_hints", "phase_skills", "session_recon",
      "compaction_prediction", "budget_report", "session_quality", "session_health",
      "nl_hook_eval", "auto_skill_hooks", "hook_activation_check",
      "pressure_recommendations", "compaction_trend", "parallel_dispatch", "graph_evict",
      "d4_perf_summary", "kv_stability", "priority_score", "knowledge_hints"
    ]),
    keepFields: new Set(["id", "name", "error", "status", "success", "blocked", "result", "value", "score", "count", "total"]),
  },
  AGGRESSIVE: {
    maxArrayItems: 3,
    maxStringLength: 300,
    maxObjectDepth: 2,
    stripFields: new Set([
      "_raw", "_debug", "raw_data", "internal_id", "created_at", "updated_at", "metadata_version",
      "description", "notes", "comments", "history", "changelog", "tags", "aliases",
      "source_reference", "last_modified_by", "validation_details",
      "specifications", "properties", "extended_data", "mechanical_properties",
      "thermal_properties", "physical_properties", "processing_notes",
      // Cadence metadata — strip at aggressive pressure
      "agent_recommend", "skill_hints", "phase_skills", "session_recon",
      "compaction_prediction", "budget_report", "session_quality", "session_health",
      "nl_hook_eval", "auto_skill_hooks", "hook_activation_check",
      "pressure_recommendations", "compaction_trend", "parallel_dispatch", "graph_evict",
      "d4_perf_summary", "kv_stability", "priority_score", "knowledge_hints",
      "script_recommendations", "attention", "cognitive", "error_learn",
      "skill_context_matches", "todo", "checkpoint", "rehydrated"
    ]),
    keepFields: new Set(["id", "name", "error", "status", "success", "blocked", "result", "value", "score", "count", "total"]),
  }
};


/**
 * Get slim level based on current pressure percentage.
 */
export function getSlimLevel(pressurePct: number): SlimLevel {
  if (pressurePct >= 70) return "AGGRESSIVE";
  if (pressurePct >= 50) return "MODERATE";
  return "NORMAL";
}

/**
 * Get current pressure from disk state (non-blocking read).
 * Returns 0 if no pressure data available.
 */
let _cachedPressurePct = 0;
let _lastPressureRead = 0;

export function getCurrentPressurePct(): number {
  const now = Date.now();
  // Cache for 10 seconds to avoid disk thrash
  if (now - _lastPressureRead < 10000) return _cachedPressurePct;
  _lastPressureRead = now;
  try {
    const fs = require("fs");
    const data = fs.readFileSync(path.join(PATHS.STATE_DIR, "context_pressure.json"), "utf-8");
    const parsed = JSON.parse(data);
    _cachedPressurePct = parsed.pressure_pct || 0;
  } catch { _cachedPressurePct = 0; }
  return _cachedPressurePct;
}

/**
 * Slim a value recursively based on config.
 */
function slimValue(val: any, config: SlimConfig, depth: number = 0): any {
  if (val === null || val === undefined) return val;
  
  // Strings: truncate
  if (typeof val === "string") {
    if (val.length > config.maxStringLength) {
      return val.slice(0, config.maxStringLength) + `…[+${val.length - config.maxStringLength}]`;
    }
    return val;
  }
  
  // Primitives pass through
  if (typeof val !== "object") return val;
  
  // Arrays: cap length
  if (Array.isArray(val)) {
    const capped = val.slice(0, config.maxArrayItems);
    const slimmed = depth < config.maxObjectDepth 
      ? capped.map(item => slimValue(item, config, depth + 1))
      : capped;
    if (val.length > config.maxArrayItems) {
      return { _items: slimmed, _total: val.length, _showing: config.maxArrayItems };
    }
    return slimmed;
  }
  
  // Objects: filter fields, depth-limit
  if (depth >= config.maxObjectDepth) {
    const keys = Object.keys(val);
    return `{${keys.length} keys: ${keys.slice(0, 5).join(", ")}${keys.length > 5 ? "…" : ""}}`;
  }
  
  const result: Record<string, any> = {};
  for (const [key, v] of Object.entries(val)) {
    // Always keep critical fields
    if (config.keepFields.has(key)) {
      result[key] = slimValue(v, config, depth + 1);
      continue;
    }
    // Strip low-value fields
    if (config.stripFields.has(key)) continue;
    // Include everything else, slimmed
    result[key] = slimValue(v, config, depth + 1);
  }
  return result;
}

/**
 * Main entry point: slim a response object.
 * Auto-detects pressure if level not specified.
 */
export function slimResponse(data: any, level?: SlimLevel): any {
  const effectiveLevel = level || getSlimLevel(getCurrentPressurePct());
  const config = CONFIGS[effectiveLevel];
  return slimValue(data, config, 0);
}

/**
 * Slim a JSON string response. Returns slimmed JSON string.
 */
export function slimJsonResponse(jsonStr: string, level?: SlimLevel): string {
  try {
    const parsed = JSON.parse(jsonStr);
    const slimmed = slimResponse(parsed, level);
    return JSON.stringify(slimmed);
  } catch {
    // Not valid JSON, just truncate
    const maxLen = level === "AGGRESSIVE" ? 2000 : level === "MODERATE" ? 5000 : 10000;
    if (jsonStr.length > maxLen) return jsonStr.slice(0, maxLen) + `…[+${jsonStr.length - maxLen}]`;
    return jsonStr;
  }
}

/**
 * Slim cadence metadata based on CADENCE_VERBOSITY env + pressure.
 * 
 * CADENCE_VERBOSITY levels:
 *   "silent"   → nothing in response (cadence still fires internally)
 *   "critical"  → only COMPACTION, PFP_BLOCKED/WARNING, SAFETY_BLOCK, INPUT_BLOCKED (default)
 *   "normal"    → current behavior (all actions, pressure-slimmed)
 */
const CRITICAL_PATTERNS = [
  // Compaction & recovery
  "COMPACTION_DETECTED", "RECOVERY_TRIGGERED", "CONTEXT_REHYDRATED", "STATE_RECONSTRUCTED",
  // Safety & blocking
  "PFP_BLOCKED", "PFP_WARNING", "SAFETY_BLOCK", "INPUT_BLOCKED",
  "SAFETY BLOCK", "OUTPUT_BLOCKED",
  // Budget & quality
  "OVER_BUDGET", "QUALITY_GATE_BLOCKED",
  // Parallel, Swarm & ATCS
  "PARALLEL_DISPATCH", "SWARM_RESULTS", "SWARM_GROUPS", "ATCS_PARALLEL", "ATCS_EMERGENCY",
  // Error & regression
  "ANTI-REGRESSION", "DOC_ANTI_REGRESSION",
  "KNOWN_ERROR", "ERROR_LEARNED", "D3_ERROR",
  // Engine health
  "ENGINE_HEALTH", "BRIDGE_DEGRADED", "NL_HOOKS_BROKEN",
  "CRITICAL_ANOMALIES", "SLO_BREACHES", "HOOK_PHASE_GAP",
  // Score captures
  "COMPLIANCE_BOOT", "GRAPH_INTEGRITY",
  // High-value state changes
  "REGISTRY_REFRESHED", "COGNITIVE_STATE_RESTORED", "SUPERPOWERS",
  "KNOWLEDGE_ENGINE_PREWARMED", "OMEGA_HISTORY_RESTORED",
  // Recovery manifest
  "RECOVERY_MANIFEST",
];

/** Actions that are always routine — never surface in response even in "normal" mode */
const ROUTINE_PATTERNS = [
  "TODO_AUTO_REFRESHED", "CHECKPOINT_AUTO_SAVED", "CHECKPOINT_FAILED",
  "D3_LKG_UPDATED", "SURVIVAL_SAVED", "SURVIVAL_CHECKPOINT",
  "COMPACTION_SURVIVAL_SAVED", "RECOVERY_MANIFEST_SAVED",
  "WIP_CAPTURED", "SESSION_LIFECYCLE_STARTED", "SESSION_LIFECYCLE_ENDED",
  "STATE_AUTO_SAVED", "GRAPH_FLUSHED", "FOCUS_OPTIMIZED",
  "RELEVANCE_FILTERED", "CONTEXT_AUTO_COMPRESSED",
  "PRESSURE_CHECK:🟢 LOW", "ROADMAP_HEARTBEAT", "SESSION_HANDOFF_GENERATED",
  "NEXT_SESSION_PREP_GENERATED",
];

/** Write full cadence to disk for monitoring; return alert-only summary for response */
export function persistCadenceToDisk(fullCadence: Record<string, any>, stateDir: string): { alerts: string[]; alert_count: number; routine_count: number } {
  const actions: string[] = fullCadence.actions || [];

  // Classify actions
  const alerts = actions.filter((a: string) =>
    typeof a === "string" && !ROUTINE_PATTERNS.some(p => a.includes(p))
  );
  const routineCount = actions.length - alerts.length;

  // Write full cadence to disk (non-blocking, non-fatal)
  try {
    const fs = require("fs");
    const path = require("path");
    const cadencePath = path.join(stateDir, "CADENCE_LATEST.json");
    const diskData = {
      ...fullCadence,
      _persisted_at: new Date().toISOString(),
      _total_actions: actions.length,
      _alert_count: alerts.length,
      _routine_count: routineCount,
    };
    safeWriteSync(cadencePath, JSON.stringify(diskData, null, 2));

    // Also append to rolling cadence log (keep last 50 entries)
    const logPath = path.join(stateDir, "CADENCE_LOG.jsonl");
    const logEntry = {
      call: fullCadence.call_number,
      ts: new Date().toISOString(),
      alerts: alerts.length,
      routine: routineCount,
      zone: fullCadence.pressure?.zone || "?",
      top_alerts: alerts.slice(0, 3),
    };
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + "\n");
    // Prune log if too large
    try {
      const stat = fs.statSync(logPath);
      if (stat.size > 50000) {
        const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
        safeWriteSync(logPath, lines.slice(-50).join("\n") + "\n");
      }
    } catch (e: any) { log.debug(`[slimmer] log trim: ${e?.message?.slice(0, 80)}`); }
  } catch (e: any) { log.debug(`[slimmer] disk write: ${e?.message?.slice(0, 80)}`); }

  return { alerts, alert_count: alerts.length, routine_count: routineCount };
}

function getCadenceVerbosity(): string {
  return (process.env.CADENCE_VERBOSITY || "critical").toLowerCase();
}

export function slimCadence(cadence: Record<string, any>, pressurePct: number): Record<string, any> {
  const verbosity = getCadenceVerbosity();

  // SILENT: return bare minimum — just call number for tracking
  if (verbosity === "silent") {
    return { call_number: cadence.call_number };
  }

  // CRITICAL (default): only critical alerts + key scalar warnings
  if (verbosity === "critical") {
    const criticalActions = (cadence.actions || []).filter((a: string) =>
      typeof a === "string" && CRITICAL_PATTERNS.some(p => a.includes(p))
    );
    const result: Record<string, any> = { c: cadence.call_number };
    if (criticalActions.length > 0) result.a = criticalActions.map((a: string) => a.slice(0, 80));
    // Surface budget violations
    if (cadence.budget?.over_budget?.length > 0) result.bw = cadence.budget.over_budget;
    // Surface omega degradation
    if (cadence.cognitive?.omega != null && cadence.cognitive.omega < 0.7) result.ow = cadence.cognitive.omega;
    // Surface quality gate blocks
    if (cadence.quality_gate?.blocked) result.qb = cadence.quality_gate.blocked_reason;
    // Surface compaction recovery data
    if (cadence.rehydrated) result.rh = { task: cadence.rehydrated.previous_task, resume: cadence.rehydrated.quick_resume?.slice(0, 200) };
    // Surface skill/knowledge hints only when present
    if (cadence.skill_hints?.hints?.length > 0) result.sh = cadence.skill_hints.hints.slice(0, 2);
    if (cadence.knowledge?.total_enrichments > 0) result.kh = cadence.knowledge.total_enrichments;
    // If nothing noteworthy, return minimal
    if (Object.keys(result).length <= 1) return { c: cadence.call_number };
    return result;
  }

  // NORMAL: alert-filtered with pressure-based slimming (no routine noise)
  const filtered = (cadence.actions || []).filter((a: string) =>
    typeof a === "string" && !ROUTINE_PATTERNS.some(p => a.includes(p))
  );
  if (pressurePct < 50) {
    const slim: Record<string, any> = { c: cadence.call_number, a: filtered.slice(0, 5).map((a: string) => a.slice(0, 80)) };
    if (cadence.pressure) slim.z = cadence.pressure.zone;
    return slim;
  }
  if (pressurePct < 70) {
    return { c: cadence.call_number, a: filtered.slice(0, 3).map((a: string) => a.slice(0, 60)) };
  }
  return { c: cadence.call_number, a: filtered.length ? [filtered[filtered.length - 1].slice(0, 60)] : [] };
}
