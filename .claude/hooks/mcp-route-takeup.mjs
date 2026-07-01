#!/usr/bin/env node
// tier: T4
/**
 * mcp-route-takeup.mjs
 * --------------------
 * PostToolUse companion to mcp-route-suggest.mjs (TOKEN-SAVINGS-PIVOT iter8).
 *
 * Closes the take-rate measurement gap. The route-suggest hook fires TOKEN-SAVE
 * nudges and records each fire to state/shared/mcp-route-suggest-stats.json,
 * but until now we had NO data on how often the model actually TOOK the
 * suggested route. The 30% take-rate doctrine in /route-suggest-stats was a
 * guess, not a measurement.
 *
 * This hook fires after every tool call. When it sees a tool that matches a
 * suggested MCP route (prism_session:master_index_query, prism_session:
 * action_search, prism_dev:code_search, prism_dev:file_write) it records a
 * `takeupTotals.evaluations` tick (the credit path was EXERCISED -- the honest
 * denominator), and IF the same session had a TOKEN-SAVE nudge fire within the
 * window it also credits a `takeups[]`/`byClassifier` entry. The evaluations
 * denominator lets the audit tell a GENUINE 0 take-rate (path exercised, fleet
 * just isn't routing in-window) apart from a never-exercised credit path -- so
 * it no longer mislabels a proven-live wiring as "takeup-wiring-broken"
 * (U-TAKEUP-EVAL-DENOMINATOR, slot:alpha). Same atomic-write per-PID-temp+
 * rename pattern; same best-effort try/catch (R12 inverted for advisory IO).
 *
 * Disable: PRISM_MCP_ROUTE_TAKEUP_DISABLE=1
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import _fs from "node:fs";

const _STATS_FILE = "H:/prism/state/shared/mcp-route-suggest-stats.json";
// 2026-05-26 (U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND, slot:alpha): widened 60s → 600s.
// Audit dashboard showed 5/2255 = 0.2% take-rate (target 30%); root cause was
// the 60s window cutting off take-ups that happen mid-thinking. 10 min covers
// the realistic Pre→Post latency without crediting unrelated reasoning hours
// later. Env-tunable so operators can tighten/loosen without re-shipping.
const _WINDOW_MS = parseInt(process.env.PRISM_MCP_ROUTE_TAKEUP_WINDOW_MS || "600000", 10) || 600_000;
export { _WINDOW_MS }; // exported so the audit script can surface the actual window in the dashboard

// MCP action → classifier(s) it satisfies. When the model uses any of these,
// it's a take-up of the nudge that recommended them.
// TOKEN-SAVINGS-PIVOT/U-WEBSEARCH-KB-ROUTE (2026-05-23): added isBroadWebSearch
// crediting via prism_knowledge:search (internal-query route) and
// prism_session:master_index_query (graph-search route).
// TOKEN-SAVINGS-PIVOT/U-DOCTRINE-AUDIT-CREDIT (iter21, 2026-05-23): added
// backendAuditChain + doctrineSurface crediting. These two classifiers fire
// ~86% of all nudges (142+35 of 205 in a typical session) but had NO MCP
// action that could be credited as taken — so the measured take-rate was
// artificially deflated. The audit-chain nudge points at a search path that
// naturally terminates in master_index_query / code_search; the doctrine-
// surface nudge points at the MCP-surface inventory which IS
// dispatcher_map_compact. Crediting through those routes reflects reality.
// TOKEN-SAVINGS-PIVOT/U-PSN-TAKEUP-MAP-EXPORT (iter6, 2026-05-23, slot:alpha):
// Export this map so the iter1 action-hint test in mcp-route-action-hint.
// test.mjs can derive its TAKEUP_CREDITED_ACTIONS set from the canonical
// source instead of duplicating the keyset inline. Without this export
// iter1's test drifts the next time takeup adds a new MCP-action mapping
// (e.g. /U-WEBSEARCH-KB-ROUTE added prism_knowledge:* without iter1 noticing).
export const _ACTION_TO_CLASSIFIERS = {
  "prism_session:master_index_query":     ["isBroadGrep", "isLargeRead", "isBroadGlob", "isBroadWebSearch", "backendAuditChain", "doctrineSurface"],
  "prism_session:action_search":          ["isVerboseBash", "doctrineSurface"],
  "prism_session:tool_route_best":        ["isVerboseBash", "isBroadGrep", "isBroadGlob", "doctrineSurface"],
  "prism_session:dispatcher_map_compact": ["isLargeRead", "doctrineSurface"],
  "prism_dev:code_search":                ["isBroadGrep", "isVerboseBash", "backendAuditChain"],
  "prism_dev:file_write":                 ["isLargeWrite"],
  "prism_dev:file_read":                  ["isLargeRead"],
  "prism_knowledge:search":               ["isBroadWebSearch"],
  "prism_knowledge:cross_query":          ["isBroadWebSearch"],
};

// U-MCP-ROUTE-TAKEUP-SCRIPT-CREDIT (2026-06-18, slot:alpha): the fleet takes the
// search-first / offload nudges via the DOCUMENTED native-script route, not only
// the prism_* MCP dispatcher. The substrate-routing + loop-awareness injects
// tell slots to run `node scripts/system-viz-query.mjs find|node-card|
// blast-radius` (the MCP-DOWN equivalent of prism_session:master_index_query)
// and `node scripts/ask-ollama.mjs` (the Ollama-offload route) BEFORE Grep.
// Those are Bash tool calls, never `mcp__...`, so the MCP-only credit path
// scored them 0 -- the dashboard's "takeup-wiring-broken" 0% was a measurement
// artifact (the fleet DOES route, just via scripts when :3100 is down). Credit
// the script routes too. `script:master-index` mirrors
// prism_session:master_index_query's classifier set (the literal equivalent).
export const _SCRIPT_ROUTE_TO_CLASSIFIERS = {
  "script:master-index": ["isBroadGrep", "isLargeRead", "isBroadGlob", "isBroadWebSearch", "backendAuditChain", "doctrineSurface"],
  "script:ollama":       ["isVerboseBash", "isLargeRead", "isBroadGrep"],
};

// Resolve the eligible classifier list for a route key from EITHER map (an MCP
// dispatcher action OR a native-script route). Exported for tests.
export function eligibleClassifiersFor(routeKey) {
  return _ACTION_TO_CLASSIFIERS[routeKey] || _SCRIPT_ROUTE_TO_CLASSIFIERS[routeKey] || null;
}

function readStdin() {
  return new Promise((resolve) => {
    let buffer = "";
    process.stdin.on("data", (chunk) => { buffer += chunk; });
    process.stdin.on("end", () => {
      try { resolve(buffer ? JSON.parse(buffer) : {}); }
      catch { resolve({}); }
    });
  });
}

/**
 * Pure: extract the prism_*:* action key from a tool input, or null if it
 * doesn't look like an MCP dispatcher call. Exported for tests.
 */
export function extractMcpAction(toolName, toolInput) {
  if (typeof toolName !== "string" || !toolName.startsWith("mcp__")) return null;
  // Tool names look like "mcp__prism_safe__prism_session" with `action` in input.
  if (!toolInput || typeof toolInput !== "object") return null;
  const action = typeof toolInput.action === "string" ? toolInput.action : null;
  if (!action) return null;
  // Convert mcp__prism_safe__prism_session → prism_session.
  const parts = toolName.split("__");
  const dispatcher = parts[parts.length - 1];
  if (!dispatcher || !dispatcher.startsWith("prism_")) return null;
  return `${dispatcher}:${action}`;
}

/**
 * Pure: detect a DOCUMENTED native-script route-take from a Bash/PowerShell tool
 * call. Returns a synthetic route key ("script:master-index" | "script:ollama")
 * that `eligibleClassifiersFor` maps to classifiers, or null. The MCP-down
 * fallback the substrate-routing inject points the fleet at. Exported for tests.
 */
// True only for an ACTUAL `node ... <name>.mjs` invocation -- not a bare mention
// (echo/cat/comment), a hyphen-prefixed look-alike (my-<name>.mjs), or a
// suffixed file (<name>.mjs.bak). The script must be preceded by a path-sep or
// whitespace (excludes the hyphen-prefix) and `.mjs` terminated by ws/quote/end
// (excludes `.mjs.bak`). U-MCP-ROUTE-TAKEUP-CREDIT-ANCHOR (2026-06-18, slot:alpha)
// -- closes the over-credit surface scrutiny flagged (a bare mention while a
// nudge is open would have dishonestly inflated the take-rate).
function invokesNodeScript(cmd, name) {
  return new RegExp(`(?:^|[\\s/])${name}\\.mjs(?=$|[\\s'"])`).test(cmd);
}

export function extractScriptRoute(toolName, toolInput) {
  if (toolName !== "Bash" && toolName !== "PowerShell") return null;
  const cmd = toolInput && typeof toolInput === "object" && typeof toolInput.command === "string"
    ? toolInput.command
    : "";
  if (!cmd || !/\bnode\b/.test(cmd)) return null; // must be a node invocation, not a mention
  // search-first: the documented MCP-down equivalent of master_index_query.
  if (invokesNodeScript(cmd, "system-viz-query") || invokesNodeScript(cmd, "master-index-search-lib")) return "script:master-index";
  // Ollama / Hermes local-offload route.
  if (invokesNodeScript(cmd, "ask-ollama") || invokesNodeScript(cmd, "ask-hermes")) return "script:ollama";
  return null;
}

/**
 * Pure: given a sidecar object + the freshly-detected MCP action + now-ms,
 * decide which classifiers had a fire in the last WINDOW_MS that could be
 * credited as taken. Returns array of classifier names. Exported for tests.
 */
export function classifiersTakenBy(sidecar, mcpAction, sessionId, nowMs = Date.now()) {
  if (!sidecar || typeof sidecar !== "object") return [];
  const eligible = eligibleClassifiersFor(mcpAction);
  if (!eligible || !Array.isArray(sidecar.recent)) return [];
  const eligibleSet = new Set(eligible);
  const matches = new Set();
  for (const entry of sidecar.recent) {
    if (!entry || typeof entry !== "object") continue;
    if (sessionId && entry.sessionId && !sessionId.startsWith(entry.sessionId)) continue;
    const ts = Date.parse(entry.ts);
    if (Number.isNaN(ts)) continue;
    if (nowMs - ts > _WINDOW_MS) continue;
    for (const c of (Array.isArray(entry.classifiers) ? entry.classifiers : [])) {
      if (eligibleSet.has(c)) matches.add(c);
    }
  }
  return Array.from(matches);
}

// Record one takeup EVALUATION (and any credits). Called whenever an eligible
// route -- an MCP dispatcher action or a documented native-script route -- is
// invoked, REGARDLESS of whether an in-window fire credited it. The
// `takeupTotals.evaluations` counter is the honest DENOMINATOR the audit was
// missing: it proves the credit path is being EXERCISED (the hook is wired and
// saw a creditable route), so a 0 take-rate with evaluations>0 is a GENUINE
// low-take-rate, NOT a "wiring-broken" measurement artifact (U-TAKEUP-EVAL-
// DENOMINATOR, 2026-06-19, slot:alpha -- closes the false "takeup-wiring-broken"
// diagnosis the live probe disproved: classifiersTakenBy credits correctly when
// an eligible route fires in-window). Credits (`byClassifier`/`takeups[]`) are
// still recorded only on an actual in-window match.
// `statsFile` defaults to the live sidecar (prod path unchanged); tests pass a
// temp file. Returns the written stats object on success, or null on no-op
// (disabled / unreadable sidecar) -- exported so the evaluation-denominator
// behaviour is unit-testable with real reference values.
export function _recordTakeup(sessionId, mcpAction, takenClassifiers, statsFile = _STATS_FILE) {
  if (process.env.PRISM_MCP_ROUTE_TAKEUP_DISABLE === "1") return null;
  try {
    let stats;
    try { stats = JSON.parse(_fs.readFileSync(statsFile, "utf8")); }
    catch { return null; /* no sidecar yet -- nothing to credit against */ }
    stats.takeupTotals ??= {};
    // Denominator: an eligible route was invoked and the credit path evaluated it.
    stats.takeupTotals.evaluations = (stats.takeupTotals.evaluations || 0) + 1;
    stats.lastTakeupCheckAt = new Date().toISOString();
    if (takenClassifiers.length > 0) {
      stats.takeups ??= [];
      stats.takeupTotals.totalTakeups = (stats.takeupTotals.totalTakeups || 0) + takenClassifiers.length;
      stats.takeupTotals.byClassifier ??= {};
      for (const c of takenClassifiers) {
        stats.takeupTotals.byClassifier[c] = (stats.takeupTotals.byClassifier[c] || 0) + 1;
      }
      stats.takeups.unshift({
        ts: new Date().toISOString(),
        sessionId: (sessionId || "").toString().slice(0, 8),
        mcpAction,
        creditedClassifiers: takenClassifiers,
      });
      if (stats.takeups.length > 100) stats.takeups.length = 100;
      stats.lastTakeupAt = new Date().toISOString();
    }
    const tmp = `${statsFile}.tmp-${process.pid}`;
    _fs.writeFileSync(tmp, JSON.stringify(stats, null, 2), "utf8");
    try { _fs.renameSync(tmp, statsFile); }
    catch { try { _fs.unlinkSync(tmp); } catch { /* gone */ } }
    return stats;
  } catch {
    // Telemetry MUST never fail. Swallow.
    return null;
  }
}

async function main() {
  if (_hp_shouldSkip("mcp-route-takeup")) { process.stdout.write(JSON.stringify({ continue: true })); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  const sessionId = (input.session_id || input.sessionId || "").toString().slice(0, 36);

  const mcpAction = extractMcpAction(toolName, toolInput) || extractScriptRoute(toolName, toolInput);
  if (!mcpAction) { process.stdout.write(JSON.stringify({ continue: true })); return; }
  // CREDITABLE-only denominator: extractMcpAction returns a key for ANY prism_*:*
  // action (e.g. prism_cam:toolpath_generate), but only routes in the classifier
  // maps can ever be credited. An unmapped action must NOT inflate `evaluations`
  // (it would deflate a takes/evaluations rate with unrelated dispatcher traffic)
  // -- gate on a real classifier mapping so the denominator means "evaluations of
  // routes that COULD be credited". (script routes are always mapped -> eligible.)
  if (!eligibleClassifiersFor(mcpAction)) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  let sidecar;
  try { sidecar = JSON.parse(_fs.readFileSync(_STATS_FILE, "utf8")); }
  catch { process.stdout.write(JSON.stringify({ continue: true })); return; }

  // An eligible route was invoked -> the credit path is being exercised. Record
  // the evaluation (the honest denominator) even when no in-window fire credits
  // it, so the audit can tell "wiring proven live, genuinely 0 takes" apart from
  // "credit path never exercised". Credits land only on an in-window match.
  const taken = classifiersTakenBy(sidecar, mcpAction, sessionId);
  _recordTakeup(sessionId, mcpAction, taken);

  process.stdout.write(JSON.stringify({ continue: true }));
}

if (process.argv[1] && process.argv[1].endsWith("mcp-route-takeup.mjs")) {
  main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
}
