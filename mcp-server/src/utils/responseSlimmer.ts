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
import { PATHS } from "../constants.js";

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
      "source_reference", "last_modified_by", "validation_details"
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
      "thermal_properties", "physical_properties", "processing_notes"
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
  "COMPACTION_DETECTED", "RECOVERY_TRIGGERED", "CONTEXT_REHYDRATED",
  "PFP_BLOCKED", "PFP_WARNING", "SAFETY_BLOCK", "INPUT_BLOCKED",
  "SAFETY BLOCK", "INPUT_VALIDATION_BLOCKED"
];

function getCadenceVerbosity(): string {
  return (process.env.CADENCE_VERBOSITY || "critical").toLowerCase();
}

export function slimCadence(cadence: Record<string, any>, pressurePct: number): Record<string, any> {
  const verbosity = getCadenceVerbosity();
  
  // SILENT: return bare minimum — just call number for tracking
  if (verbosity === "silent") {
    return { call_number: cadence.call_number };
  }
  
  // CRITICAL: only safety/compaction/blocking messages
  if (verbosity === "critical") {
    const criticalActions = (cadence.actions || []).filter((a: string) =>
      typeof a === "string" && CRITICAL_PATTERNS.some(p => a.includes(p))
    );
    if (criticalActions.length === 0) {
      return { call_number: cadence.call_number };
    }
    return { call_number: cadence.call_number, actions: criticalActions };
  }
  
  // NORMAL: original behavior with pressure-based slimming
  if (pressurePct < 50) {
    const slim: Record<string, any> = { call_number: cadence.call_number, actions: cadence.actions?.slice(0, 5) };
    if (cadence.pressure) slim.pressure_zone = cadence.pressure.zone;
    return slim;
  }
  if (pressurePct < 70) {
    return {
      call_number: cadence.call_number,
      actions: cadence.actions?.slice(0, 3),
    };
  }
  return {
    call_number: cadence.call_number,
    actions: cadence.actions?.length ? [cadence.actions[cadence.actions.length - 1]] : [],
  };
}
