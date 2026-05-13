#!/usr/bin/env node
// tier: T3
/**
 * session-write-tracker.mjs — PostToolUse per-session write log
 *
 * WHY: `staged-hygiene-check.mjs` needs to answer "which files has THIS
 * session written?" so it can flag staged files that came from other chats.
 * No existing telemetry captures that — file-read-cache tracks reads,
 * state-write-watch only tracks state JSON writes. This hook fills the gap
 * by logging every Write/Edit/MultiEdit keyed by session_id.
 *
 * FIRES ON: PostToolUse, matcher ^(Write|Edit|MultiEdit)$
 * OUTPUT: silent (logging-only hook)
 * SIDE EFFECT: appends a line to .claude/cache/session-writes/<sessionId>.jsonl
 *
 * Caps the per-session log at 500 entries (rolling — newest kept).
 *
 * AGI-INFRA Phase D / D-SESSION-WRITE-TRACKER.
 */

import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

const BASE_DIR = "H:/prism/.claude/cache/session-writes";
const TELEMETRY_FILE = "H:/prism/.claude/cache/hook-telemetry.jsonl";
const MAX_ENTRIES = 500;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => { data += line + "\n"; });
    rl.on("close", () => resolve(data));
  });
}

async function logTelemetry(event) {
  try {
    await fs.appendFile(TELEMETRY_FILE, JSON.stringify(event) + "\n", "utf8");
  } catch { /* non-fatal */ }
}

function sessionLogPath(sessionId) {
  const safe = String(sessionId || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(BASE_DIR, `${safe}.jsonl`);
}

async function rollOverIfNeeded(logPath) {
  try {
    const raw = await fs.readFile(logPath, "utf8");
    const lines = raw.split("\n").filter((l) => l.trim());
    if (lines.length <= MAX_ENTRIES) return;
    const kept = lines.slice(-MAX_ENTRIES);
    await fs.writeFile(logPath, kept.join("\n") + "\n", "utf8");
  } catch { /* file doesn't exist yet or unreadable — ignore */ }
}

function extractFilePaths(toolName, input) {
  if (!input) return [];
  if (toolName === "MultiEdit") {
    // MultiEdit typically has file_path + edits[]
    return typeof input.file_path === "string" ? [input.file_path] : [];
  }
  // Write + Edit both have a single file_path
  return typeof input.file_path === "string" ? [input.file_path] : [];
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);
  let event;
  try { event = JSON.parse(raw); } catch { process.exit(0); }

  const tool = event.tool_name;
  if (tool !== "Write" && tool !== "Edit" && tool !== "MultiEdit") process.exit(0);

  const files = extractFilePaths(tool, event.tool_input);
  if (files.length === 0) process.exit(0);

  const sessionId = event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID || "unknown";
  const logPath = sessionLogPath(sessionId);

  try {
    await fs.mkdir(BASE_DIR, { recursive: true });
  } catch { /* ignore */ }

  // Only log writes that actually succeeded. PostToolUse passes tool_response.
  const resp = event.tool_response || event.response || {};
  const exitCode =
    typeof resp.exit_code === "number" ? resp.exit_code :
    typeof resp.exitCode === "number" ? resp.exitCode :
    typeof resp.code === "number" ? resp.code :
    null;
  // If exit info exists and is non-zero, skip. If unknown, log anyway.
  if (exitCode !== null && exitCode !== 0) process.exit(0);

  const entry = {
    ts: new Date().toISOString(),
    ts_ms: Date.now(),
    tool,
    files,
    session_id: sessionId,
  };

  try {
    await fs.appendFile(logPath, JSON.stringify(entry) + "\n", "utf8");
  } catch { /* non-fatal */ }

  await rollOverIfNeeded(logPath);
  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "session-write-tracker",
    event: "logged",
    session_id: sessionId,
    tool,
    file_count: files.length,
  });
  process.exit(0);
}

main().catch(() => process.exit(0));
