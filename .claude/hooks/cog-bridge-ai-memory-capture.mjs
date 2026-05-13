#!/usr/bin/env node
// tier: T3
/**
 * cog-bridge-ai-memory-capture.mjs — COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH10
 * ===========================================================================
 *
 * PostToolUse hook that auto-captures cognitive-stack outcomes into the memory
 * graph. Closes one of the 3 architectural feedback loops identified in
 * COGNITIVE-STACK-AUDIT-2026-05-07.json:
 *
 *   AI ↔ Memory: AI outcomes don't auto-record to cross-session graph;
 *                manual `prism_memory:remember` was previously required.
 *
 * Trigger: PostToolUse on `prism_orchestrate` or `prism_ai` actions whose name
 *          starts with `cognitive_` (the BATCH5–BATCH8 cognitive-bridge actions).
 *
 * Behavior: read tool result, extract a compact outcome summary, and write it
 *           to `state/shared/cog-bridge-memory-capture.jsonl` as a deferred
 *           capture record. A nightly drain script can replay these into
 *           QdrantMemoryEngine via prism_memory:remember.
 *
 * The hook is intentionally non-blocking and never throws — it logs the
 * capture line and returns 0.
 *
 * Wire into .claude/settings.json under "hooks.PostToolUse":
 *   { "matcher": "mcp__prism__prism_orchestrate", "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/cog-bridge-ai-memory-capture.mjs" }] }
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH10
 */

import fs from "node:fs";
import path from "node:path";

const CAPTURE_LOG = path.resolve("H:/prism/state/shared/cog-bridge-memory-capture.jsonl");
const COGNITIVE_ACTION_PREFIX = "cognitive_";

function readStdin() {
  try {
    const data = fs.readFileSync(0, "utf8");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function isCognitiveAction(toolName, params) {
  if (!toolName) return false;
  if (!toolName.includes("prism_orchestrate") && !toolName.includes("prism_ai")) return false;
  const action = (params && (params.action || params.input?.action)) ?? "";
  return typeof action === "string" && action.startsWith(COGNITIVE_ACTION_PREFIX);
}

function summarizeOutcome(toolResult) {
  if (!toolResult || typeof toolResult !== "object") return null;
  const content = Array.isArray(toolResult.content) ? toolResult.content[0] : null;
  if (!content || typeof content.text !== "string") return null;
  try {
    const parsed = JSON.parse(content.text);
    return {
      keys: Object.keys(parsed).slice(0, 10),
      has_error: typeof parsed.engine_error === "string" && parsed.engine_error.length > 0,
      result_size_bytes: content.text.length,
    };
  } catch {
    return { keys: [], has_error: false, result_size_bytes: content.text.length };
  }
}

function main() {
  const event = readStdin();
  if (!event) {
    process.exit(0);
    return;
  }
  const toolName = event.tool_name || event.toolName || "";
  const params = event.tool_input || event.params || {};
  if (!isCognitiveAction(toolName, params)) {
    process.exit(0);
    return;
  }
  const action = (params.action || params.input?.action) ?? "";
  const summary = summarizeOutcome(event.tool_response || event.result);
  if (!summary) {
    process.exit(0);
    return;
  }
  const record = {
    ts: new Date().toISOString(),
    tool: toolName,
    action,
    summary,
    session_id: event.session_id || event.sessionId || null,
  };
  try {
    fs.mkdirSync(path.dirname(CAPTURE_LOG), { recursive: true });
    fs.appendFileSync(CAPTURE_LOG, JSON.stringify(record) + "\n");
  } catch (err) {
    process.stderr.write(`[cog-bridge-memory-capture] write failed: ${err?.message ?? err}\n`);
  }
  process.exit(0);
}

main();
