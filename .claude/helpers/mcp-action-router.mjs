#!/usr/bin/env node
/**
 * mcp-action-router.mjs — PreToolUse hook for MCP tool calls (mcp__prism*)
 *
 * When Claude calls a PRISM MCP tool, injects the dispatcher's full action list
 * so Claude can pick the right action on the first attempt instead of guessing.
 *
 * Also warns if the action doesn't exist in the dispatcher's known action set,
 * preventing wasted MCP round-trips on typos or hallucinated action names.
 *
 * Uses MASTER_INDEX.json for O(1) action→dispatcher lookup.
 * Saves ~1-3 failed MCP calls (500-2000 tokens each) per session.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import process from "node:process";

const MASTER_INDEX = "H:/prism/mcp-server/data/MASTER_INDEX.json";
const CACHE_FILE = "/tmp/prism-mcp-action-cache.json";
const CACHE_TTL_MS = 3600_000; // 1 hour

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(""); return; }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 150);
  });
}

// Dispatcher name → { actions: string[], category: string, action_count: number }
let _dispatcherMap = null;
// Action name → dispatcher name (reverse lookup)
let _actionToDisp = null;

function loadIndex() {
  if (_dispatcherMap) return;

  // Try file cache
  try {
    if (existsSync(CACHE_FILE)) {
      const cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
      if (Date.now() - cache.ts < CACHE_TTL_MS) {
        _dispatcherMap = new Map(cache.dm);
        _actionToDisp = new Map(cache.a2d);
        return;
      }
    }
  } catch { /* rebuild */ }

  try {
    const mi = JSON.parse(readFileSync(MASTER_INDEX, "utf8"));
    _dispatcherMap = new Map();
    _actionToDisp = new Map();

    for (const d of mi.dispatchers || []) {
      const info = {
        actions: d.actions || [],
        category: d.category || "unknown",
        action_count: d.action_count || 0,
        file: d.file || "",
      };
      _dispatcherMap.set(d.name, info);

      for (const action of info.actions) {
        _actionToDisp.set(action, d.name);
      }
    }

    // Write cache
    try {
      writeFileSync(CACHE_FILE, JSON.stringify({
        ts: Date.now(),
        dm: [..._dispatcherMap],
        a2d: [..._actionToDisp],
      }));
    } catch { /* non-critical */ }
  } catch {
    _dispatcherMap = new Map();
    _actionToDisp = new Map();
  }
}

function extractToolInfo(raw) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const toolName = parsed.tool_name || "";
    const toolInput = parsed.tool_input || {};
    const action = toolInput.action || toolInput.command || "";
    return { toolName, action, toolInput };
  } catch {
    return { toolName: "", action: "", toolInput: {} };
  }
}

function mcpToolToDispatcher(toolName) {
  // mcp__prism__prism_business → prism_business
  // mcp__prism-mcp-server__prism_calc → prism_calc
  const parts = toolName.split("__");
  return parts[parts.length - 1] || "";
}

function findSimilarActions(action, dispActions, maxResults = 5) {
  if (!action || !dispActions?.length) return [];

  const actionLower = action.toLowerCase();
  const scored = dispActions
    .map((a) => {
      const aLower = a.toLowerCase();
      let score = 0;
      // Exact prefix match
      if (aLower.startsWith(actionLower) || actionLower.startsWith(aLower)) score += 3;
      // Shared words
      const aWords = aLower.split("_");
      const qWords = actionLower.split("_");
      for (const w of qWords) {
        if (aWords.includes(w)) score += 2;
      }
      // Substring match
      if (aLower.includes(actionLower) || actionLower.includes(aLower)) score += 1;
      return { action: a, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map((x) => x.action);
}

async function main() {
  const raw = await readStdin();
  const { toolName, action } = extractToolInfo(raw);

  // Only handle PRISM MCP tools
  if (!toolName.startsWith("mcp__prism")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  loadIndex();

  const dispName = mcpToolToDispatcher(toolName);
  const dispInfo = _dispatcherMap?.get(dispName);

  if (!dispInfo) {
    // Unknown dispatcher — pass through
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // If no action specified, inject the full action list
  if (!action) {
    const actionList = dispInfo.actions.length <= 30
      ? dispInfo.actions.join(", ")
      : dispInfo.actions.slice(0, 25).join(", ") + ` ... (${dispInfo.action_count} total)`;

    process.stdout.write(JSON.stringify({
      additionalContext: `MCP DISPATCHER ${dispName} (${dispInfo.category}, ${dispInfo.action_count} actions): ${actionList}`,
    }));
    process.exit(0);
    return;
  }

  // Action specified — validate it exists
  const actionExists = dispInfo.actions.includes(action);

  if (actionExists) {
    // Action is valid — pass through silently (no extra context needed)
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // Action NOT found — check if it exists in a different dispatcher
  const correctDisp = _actionToDisp?.get(action);
  if (correctDisp) {
    process.stdout.write(JSON.stringify({
      additionalContext: `ACTION MISMATCH: "${action}" belongs to ${correctDisp}, not ${dispName}. Use the correct MCP tool.`,
    }));
    process.exit(0);
    return;
  }

  // Action doesn't exist anywhere — suggest similar
  const similar = findSimilarActions(action, dispInfo.actions);
  const suggestion = similar.length > 0
    ? `Did you mean: ${similar.join(", ")}?`
    : `Available actions (first 15): ${dispInfo.actions.slice(0, 15).join(", ")}`;

  process.stdout.write(JSON.stringify({
    additionalContext: `ACTION NOT FOUND: "${action}" not in ${dispName}. ${suggestion}`,
  }));
  process.exit(0);
}

main();
