#!/usr/bin/env node
// tier: T3
/**
 * unified-edit-tap.mjs — PRISM-STAB-MS0/U-D2 (2026-05-10).
 *
 * SINGLE PostToolUse hook that captures every Edit/Write/MultiEdit event into
 * one JSONL stream. Replaces the per-event work that 12 retired hooks were
 * doing, deferring the analysis to unified-observability-drain.mjs at cadence.
 *
 * Cost contract: must complete in <10ms wall-clock. Never blocks. Failures
 * are silent. The tap is lossy by design — observability is best-effort.
 *
 * Stream format (one JSON object per line):
 *   { at, tool, file_path, op, agent, session, bytes? }
 *
 * Consumed by:
 *   scripts/unified-observability-drain.mjs
 *   (run via daemon-supervisor every 60s)
 */
import * as fs from "fs";
import * as path from "path";

const TAP_FILE = "H:/prism/state/shared/UNIFIED_EDIT_TAP.jsonl";
const MAX_LINE_BYTES = 1024;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

try {
  const raw = readStdinSafe();
  if (!raw) process.exit(0);
  let payload;
  try { payload = JSON.parse(raw); } catch { process.exit(0); }

  const tool = payload.tool_name || payload.tool || "";
  if (!tool) process.exit(0);

  const ti = payload.tool_input || payload.params || {};
  const filePath = ti.file_path || ti.path || ti.notebook_path || "";
  const op = tool === "Edit" ? "edit"
           : tool === "MultiEdit" ? "multiedit"
           : tool === "Write" ? "write"
           : tool === "NotebookEdit" ? "notebook-edit"
           : "other";

  const entry = {
    at: new Date().toISOString(),
    tool,
    file_path: filePath ? String(filePath).slice(0, 256) : null,
    op,
    agent: payload.agent || process.env.CLAUDE_AGENT || "claude",
    session: payload.session_id || process.env.CLAUDE_SESSION_ID || null,
  };

  const line = JSON.stringify(entry);
  if (line.length > MAX_LINE_BYTES) process.exit(0);

  fs.mkdirSync(path.dirname(TAP_FILE), { recursive: true });
  fs.appendFileSync(TAP_FILE, line + "\n");
} catch {
  // Best-effort. Never block.
}
process.exit(0);
