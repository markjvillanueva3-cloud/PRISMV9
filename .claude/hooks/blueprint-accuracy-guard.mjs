#!/usr/bin/env node
// tier: T1
/**
 * blueprint-accuracy-guard.mjs — PostToolUse hook (BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U5)
 *
 * Monitors blueprint-extraction tool outputs. Two responsibilities:
 *
 * 1. THRESHOLD CHECKS (legacy CADCAM-DAGI-MS0/U-DAGI08 — preserved verbatim):
 *    - Dimensional accuracy < 99% (exit-gate requirement) → warning/error
 *    - GD&T preservation < 95% → warning
 *    - OCR confidence < 0.8 → info
 *    - Missing standard orthographic views → warning
 *
 * 2. CLOSED-LOOP LEARNING (new in U-MS1-U5):
 *    a. Conformal-bound drift — if the new extraction's confidence-bound widens
 *       >20% vs the rolling 50-sample window, append a `drift_observation` JSONL
 *       event for offline xproc_drift_observe / xproc_mondrian_stats consumption.
 *    b. Replay-buffer add — when an extraction has confidence < 0.8 (below the
 *       legacy OCR floor) OR the operator confirms a ground-truth match in the
 *       tool input, append a `replay_add` event with priority = (1 - confidence).
 *    c. Operator correction — when the tool result includes an
 *       `operator_correction` block (the canonical shape produced by
 *       GroundTruthValidationEngine + U-MS1-U4 extension), append an
 *       `outcome_record` event. If accumulated corrections since the last
 *       consolidation exceed CONSOLIDATE_THRESHOLD, also append `ewc_consolidate`.
 *
 * EVENTS go to `H:/prism/state/shared/blueprint-accuracy-events.jsonl`. An
 * offline consumer (script or scheduled task) reads this file and dispatches
 * the corresponding `xproc_*` actions through `prism_ai`. Hooks CANNOT call
 * MCP dispatchers directly (no transport from a stdin-fed .mjs to an MCP
 * client), so the JSONL pattern is the canonical bridge.
 *
 * WIRED: PostToolUse (Edit|Write|Bash) in settings.json — both H:/.claude and
 * C:/Users/<user>/.claude. Advisory only — emits `additionalContext`, never
 * blocks. Sister hook `blueprint-coverage-floor-guard` (Stop, MINIMAL_ALLOWLIST)
 * carries the blocking responsibility.
 *
 * KNOBS:
 *   PRISM_BLUEPRINT_ACCURACY_GUARD_DISABLE=1   — full disable (silent continue)
 *   PRISM_BLUEPRINT_ACCURACY_GUARD_VERBOSE=1   — emit event-route diagnostics
 *   PRISM_BLUEPRINT_DRIFT_WIDEN_PCT=N          — drift threshold % (default 20)
 *   PRISM_BLUEPRINT_REPLAY_FLOOR=F             — confidence floor below which
 *                                                 replay_add is auto-emitted
 *                                                 (default 0.80, must be 0-1)
 *   PRISM_BLUEPRINT_CONSOLIDATE_THRESHOLD=N    — outcome count before ewc
 *                                                 consolidate event (default 25)
 *   PRISM_BLUEPRINT_ROLLING_WINDOW=N           — drift rolling-window size
 *                                                 (default 50, min 5, max 500)
 *   PRISM_BLUEPRINT_EVENTS_FILE=path           — override JSONL output path
 *
 * Adopted v8.89.002 PRISM_OCR_ENGINE.js → modernized stdin/stdout pattern per
 * PRISM hook convention. The original function-export (the dead-code form on
 * disk pre-2026-05-16) is no longer required — never wired.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

const HOOK_NAME = "blueprint-accuracy-guard";

// Legacy thresholds (CADCAM-DAGI-MS0/U-DAGI08 — preserved)
const MIN_DIM_ACCURACY = 99;
const MIN_GDT_PRESERVATION = 95;
const MIN_OCR_CONFIDENCE = 0.8;

// U-MS1-U5 defaults
const DEFAULT_DRIFT_WIDEN_PCT = 20;
const DEFAULT_REPLAY_FLOOR = 0.8;
const DEFAULT_CONSOLIDATE_THRESHOLD = 25;
const DEFAULT_ROLLING_WINDOW = 50;
const MIN_ROLLING_WINDOW = 5;
const MAX_ROLLING_WINDOW = 500;

// Default event-stream + state files. Override via PRISM_BLUEPRINT_EVENTS_FILE.
const DEFAULT_EVENTS_FILE = "H:/prism/state/shared/blueprint-accuracy-events.jsonl";
const DEFAULT_STATE_FILE = "H:/prism/state/shared/blueprint-accuracy-state.json";

/** Read JSON from stdin until EOF, with a 5s safety timeout. */
async function readStdinJson(timeoutMs = 5000) {
  const chunks = [];
  let resolved = false;
  return await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
    process.stdin.on("error", () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(null);
    });
  });
}

function clampNumber(raw, fallback, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  if (typeof min === "number" && n < min) return min;
  if (typeof max === "number" && n > max) return max;
  return n;
}

export function getConfig(env = process.env) {
  return {
    driftWidenPct: clampNumber(env.PRISM_BLUEPRINT_DRIFT_WIDEN_PCT, DEFAULT_DRIFT_WIDEN_PCT, 1, 500),
    replayFloor: clampNumber(env.PRISM_BLUEPRINT_REPLAY_FLOOR, DEFAULT_REPLAY_FLOOR, 0, 1),
    consolidateThreshold: clampNumber(env.PRISM_BLUEPRINT_CONSOLIDATE_THRESHOLD, DEFAULT_CONSOLIDATE_THRESHOLD, 1, 10000),
    rollingWindow: clampNumber(env.PRISM_BLUEPRINT_ROLLING_WINDOW, DEFAULT_ROLLING_WINDOW, MIN_ROLLING_WINDOW, MAX_ROLLING_WINDOW),
    eventsFile: env.PRISM_BLUEPRINT_EVENTS_FILE || DEFAULT_EVENTS_FILE,
    stateFile: env.PRISM_BLUEPRINT_STATE_FILE || DEFAULT_STATE_FILE,
    verbose: env.PRISM_BLUEPRINT_ACCURACY_GUARD_VERBOSE === "1",
  };
}

/**
 * Does this tool payload look like blueprint-extraction work?
 * Pure function — testable on raw string content.
 */
export function isBlueprintExtractionContent(content) {
  if (typeof content !== "string" || content.length === 0) return false;
  const lower = content.toLowerCase();
  // Conservative keyword set — false positives are harmless (hook just no-ops on
  // missing extraction shape), but false negatives miss training signal.
  return (
    lower.includes("blueprint") ||
    lower.includes("pdfblueprint") ||
    lower.includes("blueprintvision") ||
    lower.includes("blueprintextraction") ||
    lower.includes("dimensionvalidation") ||
    lower.includes("groundtruthvalidation") ||
    lower.includes("rescue_counts") || // U-MS1-U2 fingerprint
    lower.includes("operator_correction")
  );
}

/**
 * Run the legacy threshold checks. Returns the warnings array (severity-tagged).
 * Preserved verbatim from CADCAM-DAGI-MS0/U-DAGI08 with the same regex shapes
 * so existing test fixtures still light up identically.
 */
export function computeThresholdWarnings(content) {
  const warnings = [];
  if (typeof content !== "string" || content.length === 0) return warnings;

  const dimMatch = content.match(/accuracyPercent[":]\s*([\d.]+)/i);
  if (dimMatch) {
    const accuracy = parseFloat(dimMatch[1]);
    if (Number.isFinite(accuracy) && accuracy < MIN_DIM_ACCURACY) {
      warnings.push({
        severity: accuracy < 90 ? "error" : "warning",
        msg: `Dimensional accuracy ${accuracy.toFixed(1)}% is below ${MIN_DIM_ACCURACY}% threshold`,
      });
    }
  }

  const gdtMatch = content.match(/preservationPercent[":]\s*([\d.]+)/i);
  if (gdtMatch) {
    const preservation = parseFloat(gdtMatch[1]);
    if (Number.isFinite(preservation) && preservation < MIN_GDT_PRESERVATION) {
      warnings.push({
        severity: "warning",
        msg: `GD&T preservation ${preservation.toFixed(1)}% is below ${MIN_GDT_PRESERVATION}% threshold`,
      });
    }
  }

  // Use unambiguous decimal pattern (no greedy `.?\d*` — same fix doctrine as
  // PDFBlueprintPatternRescueEngine P0-2). Matches 0.0..1.0 confidence values.
  const ocrConfMatch = content.match(/"confidence":\s*(0\.\d+)/i);
  if (ocrConfMatch) {
    const confidence = parseFloat(ocrConfMatch[1]);
    if (Number.isFinite(confidence) && confidence < MIN_OCR_CONFIDENCE) {
      warnings.push({
        severity: "info",
        msg: `OCR confidence ${(confidence * 100).toFixed(0)}% is low — verify extracted dimensions`,
      });
    }
  }

  const viewsMatch = content.match(/viewsProcessed[":]\s*\[(.*?)\]/i);
  if (viewsMatch) {
    const views = viewsMatch[1].toLowerCase();
    if (!views.includes("front") && !views.includes("top") && !views.includes("side")) {
      warnings.push({
        severity: "warning",
        msg: "No standard orthographic views (front/top/side) processed",
      });
    }
  }

  // Match both legacy un-quoted form (withinTolerance: false) and real JSON
  // form ("withinTolerance": false). The original regex `[":]` was a character
  // class (OR), not the intended literal `"`+`:` sequence — so real JSON never
  // matched. Fix: optional `"` then required `:` then whitespace then `false`.
  const dimFailMatches = content.match(/withinTolerance"?\s*:\s*false/gi);
  if (dimFailMatches && dimFailMatches.length > 0) {
    warnings.push({
      severity: "info",
      msg: `${dimFailMatches.length} dimension(s) outside tolerance — review validation details`,
    });
  }

  return warnings;
}

/** Format warnings into a markdown advisory block. */
export function formatWarnings(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) return "";
  const errors = warnings.filter((w) => w.severity === "error");
  const warns = warnings.filter((w) => w.severity === "warning");
  const infos = warnings.filter((w) => w.severity === "info");
  let msg = "";
  if (errors.length > 0) {
    msg += `\n⛔ BLUEPRINT ACCURACY ERRORS:\n${errors.map((e) => `  - ${e.msg}`).join("\n")}`;
  }
  if (warns.length > 0) {
    msg += `\n⚠️ BLUEPRINT ACCURACY WARNINGS:\n${warns.map((w) => `  - ${w.msg}`).join("\n")}`;
  }
  if (infos.length > 0) {
    msg += `\nℹ️ BLUEPRINT INFO:\n${infos.map((i) => `  - ${i.msg}`).join("\n")}`;
  }
  return msg.trim();
}

/**
 * Extract the confidence values from a blueprint tool payload. Returns the
 * full sample list (every "confidence": 0.xx match) — used by drift detector
 * to characterise the new extraction's confidence-bound.
 */
export function extractConfidences(content) {
  if (typeof content !== "string") return [];
  const samples = [];
  // Strict pattern: bare `0` / `1` OR fully-formed decimal `0.NN` / `1.0`.
  // Rejects `0.` (incomplete decimal — parseFloat("0.") === 0 silently
  // inflates bound width). Drops the case-insensitive flag — JSON keys are
  // case-sensitive and `"Confidence"` in free-text rescue notes shouldn't
  // pollute the sample set.
  const re = /"confidence":\s*(0(?:\.\d+)|1(?:\.0+)?|[01])(?!\.|\d)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v) && v >= 0 && v <= 1) samples.push(v);
    if (samples.length > 2000) break; // bound — defends against pathological inputs
  }
  return samples;
}

/** Width of a confidence sample — max minus min, or 0 for ≤1 sample. */
export function confidenceBoundWidth(samples) {
  if (!Array.isArray(samples) || samples.length < 2) return 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of samples) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return Math.max(0, hi - lo);
}

/**
 * Depth-aware extractor — finds the first balanced `{...}` block starting at
 * `start`. Returns the substring (inclusive) or null if no balanced block fits
 * within `maxLen`. Respects JSON string-literal boundaries + escape sequences
 * so a `}` inside `"foo}"` doesn't close the block early.
 *
 * This is the same fix doctrine as the U-MS1-U2 P0 (greedy slice hostile-
 * payload class) and the E1 IdeaBlockExtractor tryParseJson. The legacy lazy
 * regex `\{[\s\S]{0,N}?\}` matched the FIRST `}` it found, including string
 * literal contents — silently dropping legitimate correction events.
 */
export function extractBalancedBrace(content, start, maxLen = 4096) {
  if (typeof content !== "string" || start < 0 || start >= content.length) return null;
  if (content[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  const end = Math.min(content.length, start + maxLen);
  for (let i = start; i < end; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") { depth++; continue; }
    if (ch === "}") {
      depth--;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }
  return null;
}

/** Detect whether the payload signals operator correction. */
export function detectOperatorCorrection(content) {
  if (typeof content !== "string") return null;
  // Operator-correction shape (canonical from U-MS1-U4 extension):
  //   "operator_correction": {"feature_id": "...", "before": ..., "after": ...}
  // Find the marker position, then depth-aware-walk the value's braces.
  const markerRe = /"operator_correction"\s*:\s*(?=\{)/;
  const m = markerRe.exec(content);
  if (!m) return null;
  const braceStart = m.index + m[0].length;
  const json = extractBalancedBrace(content, braceStart, 4096);
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    if (obj && typeof obj === "object" && !Array.isArray(obj) && typeof obj.feature_id === "string") {
      return {
        feature_id: obj.feature_id,
        before: obj.before ?? null,
        after: obj.after ?? null,
      };
    }
  } catch {
    // Even a balanced brace can contain invalid JSON (e.g. `{not json}`).
    // Fall through to null — downstream offline consumer surfaces the error.
  }
  return null;
}

/** Detect a known-ground-truth marker. */
export function detectGroundTruthMatch(content) {
  if (typeof content !== "string") return null;
  // GroundTruth shape — set by GroundTruthValidationEngine when match=true:
  //   "ground_truth_match": true | { ... feature_id }
  if (/"ground_truth_match"\s*:\s*true\b/.test(content)) return { kind: "boolean" };
  const markerRe = /"ground_truth_match"\s*:\s*(?=\{)/;
  const m = markerRe.exec(content);
  if (!m) return null;
  const json = extractBalancedBrace(content, m.index + m[0].length, 2048);
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return { kind: "object", payload: obj };
    }
  } catch {
    // ignore — silent null
  }
  return null;
}

/** Load (or initialise) the rolling-window state. */
export function loadState(stateFile) {
  if (!existsSync(stateFile)) {
    return {
      schemaVersion: 1,
      window: [], // [{ts, width}]
      outcomesSinceConsolidate: 0,
      lastConsolidatedAt: null,
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(stateFile, "utf8"));
    if (parsed && typeof parsed === "object" && parsed.schemaVersion === 1) {
      // Normalize defensively
      parsed.window = Array.isArray(parsed.window) ? parsed.window : [];
      parsed.outcomesSinceConsolidate = Number.isFinite(parsed.outcomesSinceConsolidate)
        ? parsed.outcomesSinceConsolidate
        : 0;
      parsed.lastConsolidatedAt = parsed.lastConsolidatedAt || null;
      return parsed;
    }
  } catch {
    // Corrupted state — start fresh; the event JSONL is the durable record
  }
  return { schemaVersion: 1, window: [], outcomesSinceConsolidate: 0, lastConsolidatedAt: null };
}

export function saveState(stateFile, state) {
  // Atomic write: temp-file + rename. Defends against partial-write
  // truncation if the hook crashes mid-write (next loadState would otherwise
  // see invalid JSON, reset state, and lose accumulated outcomesSinceConsolidate).
  // On Windows, rename is atomic when both paths are on the same drive.
  try {
    mkdirSync(dirname(stateFile), { recursive: true });
    const tmp = `${stateFile}.tmp.${process.pid}.${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
    try {
      renameSync(tmp, stateFile);
    } catch (renameErr) {
      // Rename failed — clean up tmp to avoid disk fill, then fall through.
      try { unlinkSync(tmp); } catch { /* best-effort */ }
      throw renameErr;
    }
    return true;
  } catch {
    return false;
  }
}

/** Should this width trigger a drift observation? */
export function detectDrift(window, newWidth, widenPctThreshold) {
  if (!Array.isArray(window) || window.length < MIN_ROLLING_WINDOW) {
    return { triggered: false, reason: "warm_up", samples: window?.length || 0 };
  }
  // Use the median of the rolling window — robust to outliers from one
  // pathological extraction batch (Reviewer A finding patterned from
  // U-MS1-U2's microinch P0).
  const widths = window.map((e) => e.width).sort((a, b) => a - b);
  const mid = Math.floor(widths.length / 2);
  const median = widths.length % 2 === 0 ? (widths[mid - 1] + widths[mid]) / 2 : widths[mid];
  if (median <= 0) {
    // Trivial window — only trigger if new width is meaningfully > 0.
    return { triggered: newWidth > 0.01, reason: "trivial_median", median, newWidth };
  }
  const widenPct = ((newWidth - median) / median) * 100;
  return {
    triggered: widenPct > widenPctThreshold,
    reason: widenPct > widenPctThreshold ? "widened" : "stable",
    median,
    newWidth,
    widenPct,
  };
}

/** Append an event row. Returns true on success, false on I/O failure. */
export function appendEvent(eventsFile, event) {
  try {
    mkdirSync(dirname(eventsFile), { recursive: true });
    const row = JSON.stringify({ ts: new Date().toISOString(), ...event });
    appendFileSync(eventsFile, row + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Core hook logic — pure-ish (takes injectable IO via opts for tests).
 * Returns the additionalContext message string (may be "") + the side-effect
 * receipt (events written).
 */
export function processPayload(payload, opts = {}) {
  const cfg = opts.config || getConfig();
  const now = opts.now || (() => new Date().toISOString());

  const tool = payload?.tool_name || payload?.tool || "";
  const toolInput = payload?.tool_input || payload?.toolInput || {};
  const toolResult = payload?.tool_response || payload?.toolResult || {};
  const sessionId = payload?.session_id || payload?.sessionId || "";

  // The legacy hook accepted only Write|Bash. Modernized: also accept Edit
  // (Edit→Edit toolResult uses the same accuracy shape). Reject everything else
  // — the matcher in settings.json should already filter, but a defensive check
  // costs nothing.
  if (!["Write", "Edit", "Bash", "MultiEdit"].includes(tool)) {
    return { advisory: "", events: [], skipped: "non_matching_tool" };
  }

  const resultStr = typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult ?? {});
  const inputStr = typeof toolInput === "string" ? toolInput : JSON.stringify(toolInput ?? {});
  const combined = resultStr + "\n" + inputStr;

  if (!isBlueprintExtractionContent(combined)) {
    return { advisory: "", events: [], skipped: "non_blueprint_content" };
  }

  const events = [];

  // 1. Threshold warnings (legacy)
  const warnings = computeThresholdWarnings(combined);

  // 2. Conformal drift
  const state = opts.loadState ? opts.loadState(cfg.stateFile) : loadState(cfg.stateFile);
  const samples = extractConfidences(combined);
  const width = confidenceBoundWidth(samples);
  let driftEventEmitted = false;
  let drift = null;
  if (samples.length >= 2) {
    drift = detectDrift(state.window, width, cfg.driftWidenPct);
    if (drift.triggered) {
      events.push({
        kind: "drift_observation",
        sessionId,
        tool,
        widenPct: drift.widenPct ?? null,
        median: drift.median ?? null,
        newWidth: width,
        sampleCount: samples.length,
        reason: drift.reason,
        dispatch: { action: "xproc_drift_observe", params: { metric: "blueprint_confidence_bound", value: width } },
      });
      driftEventEmitted = true;
    }
    // Rolling-window update — bounded by cfg.rollingWindow
    state.window.push({ ts: now(), width });
    if (state.window.length > cfg.rollingWindow) {
      state.window = state.window.slice(state.window.length - cfg.rollingWindow);
    }
  }

  // 3. Replay-buffer add — fire when ANY sample below floor OR ground-truth match
  const gtMatch = detectGroundTruthMatch(combined);
  const lowestConfidence = samples.length > 0 ? Math.min(...samples) : null;
  const lowConfidenceTriggered = lowestConfidence !== null && lowestConfidence < cfg.replayFloor;
  if (lowConfidenceTriggered || gtMatch) {
    const priority = lowestConfidence !== null ? Math.max(0, 1 - lowestConfidence) : 0.5;
    events.push({
      kind: "replay_add",
      sessionId,
      tool,
      reason: gtMatch ? "ground_truth_match" : "low_confidence",
      priority: Number(priority.toFixed(4)),
      lowestConfidence,
      groundTruthShape: gtMatch?.kind || null,
      dispatch: {
        action: "xproc_replay_add",
        params: {
          sample_key: `blueprint:${sessionId || "anon"}:${Date.now()}`,
          priority: Number(priority.toFixed(4)),
        },
      },
    });
  }

  // 4. Operator correction → outcome_record (+ predlog_pair) + maybe ewc_consolidate
  const correction = detectOperatorCorrection(combined);
  if (correction) {
    events.push({
      kind: "outcome_record",
      sessionId,
      tool,
      feature_id: correction.feature_id,
      hasBefore: correction.before !== null,
      hasAfter: correction.after !== null,
      dispatch: { action: "xproc_outcome_record", params: { kind: "operator_correction", feature_id: correction.feature_id } },
    });
    events.push({
      kind: "predlog_pair",
      sessionId,
      tool,
      feature_id: correction.feature_id,
      dispatch: { action: "xproc_predlog_pair", params: { feature_id: correction.feature_id } },
    });
    state.outcomesSinceConsolidate = (state.outcomesSinceConsolidate || 0) + 1;
    if (state.outcomesSinceConsolidate >= cfg.consolidateThreshold) {
      events.push({
        kind: "ewc_consolidate",
        sessionId,
        accumulated: state.outcomesSinceConsolidate,
        threshold: cfg.consolidateThreshold,
        dispatch: { action: "xproc_ewc_consolidate", params: {} },
      });
      state.outcomesSinceConsolidate = 0;
      state.lastConsolidatedAt = now();
    }
  }

  // Persist events + state (or hand to injectable IO for tests)
  const appender = opts.appendEvent || appendEvent;
  const saver = opts.saveState || saveState;
  for (const ev of events) appender(cfg.eventsFile, ev);
  saver(cfg.stateFile, state);

  // Build advisory
  let advisory = "";
  const warnStr = formatWarnings(warnings);
  if (warnStr) advisory += warnStr;
  if (events.length > 0) {
    const eventSummary = events
      .map((e) => `  • ${e.kind}` + (e.reason ? ` (${e.reason})` : ""))
      .join("\n");
    advisory += (advisory ? "\n\n" : "") + `🧠 BLUEPRINT LEARNING EVENTS (${events.length}):\n${eventSummary}`;
  }
  if (driftEventEmitted && cfg.verbose) {
    advisory += (advisory ? "\n" : "") + `   drift widenPct=${drift?.widenPct?.toFixed(1) ?? "?"} median=${drift?.median?.toFixed(4) ?? "?"} newWidth=${width.toFixed(4)}`;
  }

  return { advisory: advisory.trim(), events, state };
}

/** CLI entry — read stdin JSON, emit stdout JSON, exit 0. */
async function main() {
  if (process.env.PRISM_BLUEPRINT_ACCURACY_GUARD_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }
  const payload = await readStdinJson();
  if (!payload) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }
  let result;
  try {
    result = processPayload(payload);
  } catch (err) {
    // Hook must NEVER crash — log + continue. The Stop hook
    // blueprint-coverage-floor-guard carries the real enforcement.
    process.stdout.write(
      JSON.stringify({
        continue: true,
        suppressOutput: true,
        hookSpecificOutput: { hookEventName: "PostToolUse", reason: "hook_internal_error", error: String(err?.message || err) },
      })
    );
    process.exit(0);
  }
  if (!result.advisory) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }
  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: result.advisory,
      },
    })
  );
  process.exit(0);
}

// Only run main() when invoked directly (not when imported by tests).
const isMain = (() => {
  try {
    const argv1 = process.argv[1] || "";
    return argv1.endsWith("blueprint-accuracy-guard.mjs");
  } catch {
    return false;
  }
})();
if (isMain) {
  main().catch(() => process.exit(0));
}
