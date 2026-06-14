#!/usr/bin/env node
// tier: T3
/**
 * stop-session-spend-summary.mjs — Stop hook (S4)
 *
 * TOKEN-SAVINGS-EXPAND/U-PSN-STOP-S4 (2026-05-23, slot:alpha)
 *
 * At session end, emit a 1-block summary of this session's token spend
 * derived from the route-suggest sidecar's recent[] events. Helps operator
 * learn from each session: "you fired 50 large Reads — next session
 * consider Ollama postread routing".
 *
 * Pure-function aggregation; IO best-effort. Knob:
 * PRISM_STOP_SPEND_SUMMARY_DISABLE=1
 */

import { readFileSync } from "node:fs";

const SIDECAR = "H:/prism/state/shared/mcp-route-suggest-stats.json";

/**
 * Pure: filter recent[] entries to this session, count by toolName + classifier.
 */
export function summarizeSession(sidecar, sessionPrefix) {
  const out = { fires: 0, byTool: {}, byClassifier: {} };
  if (!sidecar || !Array.isArray(sidecar.recent) || !sessionPrefix) return out;
  for (const entry of sidecar.recent) {
    if (!entry || typeof entry !== "object") continue;
    const sid = String(entry.sessionId || "");
    if (!sid.startsWith(sessionPrefix.slice(0, 8))) continue;
    out.fires += 1;
    const t = entry.toolName || "_unknown";
    out.byTool[t] = (out.byTool[t] || 0) + 1;
    for (const c of (Array.isArray(entry.classifiers) ? entry.classifiers : [])) {
      out.byClassifier[c] = (out.byClassifier[c] || 0) + 1;
    }
  }
  return out;
}

/**
 * Pure: format the summary block. Returns null when fires == 0.
 */
export function formatSpendSummary(summary, opts = {}) {
  if (!summary || typeof summary.fires !== "number" || summary.fires === 0) return null;
  const topTool = Object.entries(summary.byTool).sort((a, b) => b[1] - a[1])[0];
  const topCls = Object.entries(summary.byClassifier).sort((a, b) => b[1] - a[1])[0];
  const lines = [
    "## 💸 Session spend summary",
    "",
    `Route-suggest fired **${summary.fires}** time(s) this session.`,
    topTool ? `Top tool: \`${topTool[0]}\` (${topTool[1]} fires)` : "",
    topCls ? `Top classifier: \`${topCls[0]}\` (${topCls[1]})` : "",
    "",
    "_Next session opportunity_: if these dominated, route them through MCP early — see `/r12-audit` for verified action targets. Disable: `PRISM_STOP_SPEND_SUMMARY_DISABLE=1`.",
  ].filter(Boolean);
  return lines.join("\n");
}

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { return {}; }
}
function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

async function main() {
  if (process.env.PRISM_STOP_SPEND_SUMMARY_DISABLE === "1") { pass(); return; }
  const input = await readStdin();
  const sessionId = String(input.session_id || input.sessionId || "").slice(0, 36);
  if (!sessionId) { pass(); return; }
  let sidecar;
  try { sidecar = JSON.parse(readFileSync(SIDECAR, "utf8")); }
  catch { pass(); return; }
  const summary = summarizeSession(sidecar, sessionId);
  const block = formatSpendSummary(summary);
  if (!block) { pass(); return; }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "Stop", additionalContext: block },
  }));
}

if (process.argv[1] && process.argv[1].endsWith("stop-session-spend-summary.mjs")) {
  main().catch(() => pass());
}
