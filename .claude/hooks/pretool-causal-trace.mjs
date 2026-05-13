#!/usr/bin/env node
// tier: T1
/**
 * pretool-causal-trace.mjs — hook_pre_tool_causal_trace (PP-0.18 U-AGI2)
 *
 * Fires PreTool on Write|Edit. Reads CAUSAL_GRAPH.json (built by
 * session-start-causal-trace.mjs) and traces up to 3-hop dependents of the
 * target file path. Injects a WHY-context warning when ≥5 downstream nodes
 * would be in the impact blast radius. Non-blocking, advisory only.
 *
 * Budget: ≤150ms. Silent if graph missing, file not in graph, or <5 dependents.
 */

import * as fs from "fs";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const CAUSAL_GRAPH_FILE = "H:/prism/mcp-server/data/state/CAUSAL_GRAPH.json";
const TELEMETRY = `${process.env.USERPROFILE || process.env.HOME}/.prism/telemetry/phase-018-causal-trace.jsonl`;
const MAX_HOPS = 3;
const MIN_DEPENDENTS_FOR_WARN = 5;

function loadGraph() {
  try { return JSON.parse(fs.readFileSync(CAUSAL_GRAPH_FILE, "utf-8")); } catch { return null; }
}

function logTelemetry(ev) {
  try {
    const dir = TELEMETRY.replace(/[^/\\]+$/, "");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(TELEMETRY, JSON.stringify({ at: new Date().toISOString(), ...ev }) + "\n");
  } catch { /* ignore */ }
}

function matchingNodeId(nodes, filePath) {
  const tail = filePath.replace(/\\/g, "/").split("/").slice(-3).join("/").toLowerCase();
  return nodes.find((n) => String(n).toLowerCase().includes(tail)) || null;
}

function traceDependents(edges, startId, maxHops) {
  const visited = new Set([startId]);
  let frontier = [startId];
  for (let hop = 0; hop < maxHops; hop++) {
    const next = [];
    for (const u of frontier) {
      for (const e of edges) if (e.from === u && !visited.has(e.to)) { visited.add(e.to); next.push(e.to); }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  visited.delete(startId);
  return [...visited];
}

async function main() {
  const t0 = Date.now();
  const input = readStdinSafe();
  let data;
  try { data = JSON.parse(input); } catch { process.exit(0); }

  const toolName = data.tool_name || "";
  if (toolName !== "Write" && toolName !== "Edit") process.exit(0);

  const filePath = data.tool_input?.file_path || "";
  if (!filePath) process.exit(0);

  const graph = loadGraph();
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    logTelemetry({ gated: "no-graph", filePath });
    process.exit(0);
  }

  const node = matchingNodeId(graph.nodes, filePath);
  if (!node) { logTelemetry({ gated: "file-not-in-graph", filePath }); process.exit(0); }

  const dependents = traceDependents(graph.edges, node, MAX_HOPS);
  const latencyMs = Date.now() - t0;
  logTelemetry({ node, dependents: dependents.length, latencyMs });

  if (dependents.length < MIN_DEPENDENTS_FOR_WARN) process.exit(0);

  const preview = dependents.slice(0, 5).join(", ") + (dependents.length > 5 ? `, +${dependents.length - 5} more` : "");
  console.log(JSON.stringify({  continue: true,  hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `[Phase 0.18 / Causal Trace] Editing ${node} may ripple to ${dependents.length} node(s) within ${MAX_HOPS} hops: ${preview}. Consider reviewing tests for dependents before committing.`,
    },
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
