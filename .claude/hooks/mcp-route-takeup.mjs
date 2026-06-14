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
 * action_search, prism_dev:code_search, prism_dev:file_write) AND the same
 * session had a TOKEN-SAVE nudge fire within the last 60s, it increments a
 * `takeups[]` counter on the sidecar. The same atomic-write per-PID-temp+
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
 * Pure: given a sidecar object + the freshly-detected MCP action + now-ms,
 * decide which classifiers had a fire in the last WINDOW_MS that could be
 * credited as taken. Returns array of classifier names. Exported for tests.
 */
export function classifiersTakenBy(sidecar, mcpAction, sessionId, nowMs = Date.now()) {
  if (!sidecar || typeof sidecar !== "object") return [];
  const eligible = _ACTION_TO_CLASSIFIERS[mcpAction];
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

function _recordTakeup(sessionId, mcpAction, takenClassifiers) {
  if (process.env.PRISM_MCP_ROUTE_TAKEUP_DISABLE === "1") return;
  if (takenClassifiers.length === 0) return;
  try {
    let stats;
    try { stats = JSON.parse(_fs.readFileSync(_STATS_FILE, "utf8")); }
    catch { return; /* no sidecar yet — nothing to credit against */ }
    stats.takeups ??= [];
    stats.takeupTotals ??= {};
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
    const tmp = `${_STATS_FILE}.tmp-${process.pid}`;
    _fs.writeFileSync(tmp, JSON.stringify(stats, null, 2), "utf8");
    try { _fs.renameSync(tmp, _STATS_FILE); }
    catch { try { _fs.unlinkSync(tmp); } catch { /* gone */ } }
  } catch {
    // Telemetry MUST never fail. Swallow.
  }
}

async function main() {
  if (_hp_shouldSkip("mcp-route-takeup")) { process.stdout.write(JSON.stringify({ continue: true })); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  const sessionId = (input.session_id || input.sessionId || "").toString().slice(0, 36);

  const mcpAction = extractMcpAction(toolName, toolInput);
  if (!mcpAction) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  let sidecar;
  try { sidecar = JSON.parse(_fs.readFileSync(_STATS_FILE, "utf8")); }
  catch { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const taken = classifiersTakenBy(sidecar, mcpAction, sessionId);
  if (taken.length > 0) _recordTakeup(sessionId, mcpAction, taken);

  process.stdout.write(JSON.stringify({ continue: true }));
}

if (process.argv[1] && process.argv[1].endsWith("mcp-route-takeup.mjs")) {
  main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
}
