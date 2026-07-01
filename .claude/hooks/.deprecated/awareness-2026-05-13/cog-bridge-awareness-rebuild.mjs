#!/usr/bin/env node
// tier: T3
/**
 * cog-bridge-awareness-rebuild.mjs — COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH10
 * ===========================================================================
 *
 * PostToolUse hook that triggers a self-awareness manifest rebuild when a new
 * engine, dispatcher, or schema file lands. Closes one of the 3 architectural
 * feedback loops identified in COGNITIVE-STACK-AUDIT-2026-05-07.json:
 *
 *   Self-Awareness: read-only — capability manifest doesn't rebuild on new
 *                   engine loads; manual `prism_session:self_awareness_build`
 *                   was previously required.
 *
 * Trigger: PostToolUse on Write/Edit when the file path is under
 *          mcp-server/src/engines/, mcp-server/src/tools/dispatchers/, or
 *          mcp-server/src/schemas/.
 *
 * Behavior: append a rebuild-needed marker to
 *           state/shared/awareness-rebuild-queue.jsonl. A debounced background
 *           drain script can batch-rebuild the manifest. The hook itself does
 *           NOT call the rebuild synchronously — that would block every
 *           Edit/Write with hundreds of ms of work.
 *
 * Wire into .claude/settings.json under "hooks.PostToolUse":
 *   { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/cog-bridge-awareness-rebuild.mjs" }] }
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH10
 */

import fs from "node:fs";
import path from "node:path";

const REBUILD_QUEUE = path.resolve("H:/prism/state/shared/awareness-rebuild-queue.jsonl");
const TRIGGER_DIRS = [
  "mcp-server/src/engines/",
  "mcp-server/src/tools/dispatchers/",
  "mcp-server/src/schemas/",
];

function readStdin() {
  try {
    const data = fs.readFileSync(0, "utf8");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function isAwarenessTrigger(filePath) {
  if (typeof filePath !== "string") return false;
  const normalized = filePath.replace(/\\/g, "/");
  for (const dir of TRIGGER_DIRS) {
    if (normalized.includes(dir)) return true;
  }
  return false;
}

function classifyFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("/engines/")) return "engine";
  if (normalized.includes("/dispatchers/")) return "dispatcher";
  if (normalized.includes("/schemas/")) return "schema";
  return "other";
}

function main() {
  const event = readStdin();
  if (!event) {
    process.exit(0);
    return;
  }
  const toolName = event.tool_name || event.toolName || "";
  if (toolName !== "Edit" && toolName !== "Write" && toolName !== "MultiEdit") {
    process.exit(0);
    return;
  }
  const filePath = event.tool_input?.file_path || event.tool_input?.filePath || event.file_path || "";
  if (!isAwarenessTrigger(filePath)) {
    process.exit(0);
    return;
  }
  // Skip __tests__ directories — test files don't change the capability surface
  if (filePath.includes("__tests__")) {
    process.exit(0);
    return;
  }
  const record = {
    ts: new Date().toISOString(),
    file: filePath,
    file_kind: classifyFile(filePath),
    tool: toolName,
    session_id: event.session_id || event.sessionId || null,
  };
  try {
    fs.mkdirSync(path.dirname(REBUILD_QUEUE), { recursive: true });
    fs.appendFileSync(REBUILD_QUEUE, JSON.stringify(record) + "\n");
  } catch (err) {
    process.stderr.write(`[cog-bridge-awareness-rebuild] write failed: ${err?.message ?? err}\n`);
  }
  process.exit(0);
}

main();
