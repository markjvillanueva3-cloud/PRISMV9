#!/usr/bin/env node
// tier: T1
/**
 * file-ownership-tracker.mjs — Tracks which session is editing which files.
 *
 * Runs on PreToolUse for Edit/Write/MultiEdit tools to record ownership
 * BEFORE the edit happens. This allows commit-ownership-guard.mjs to know
 * which session last touched each file.
 *
 * State stored in: mcp-server/data/state/session-file-ownership.json
 *
 * Hook trigger: PreToolUse on Edit, Write, MultiEdit tools
 *
 * Part of cross-PC + multi-session coordination from 2026-04-21.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, isAbsolute } from "node:path";
import { hostname } from "node:os";

const REPO = "H:/prism";
const STATE_FILE = join(REPO, "mcp-server/data/state/session-file-ownership.json");

function getSessionId(hookInput) {
  // SESSION-ID-UNIFY: Mirror commit-ownership-guard.mjs resolution exactly so
  // tracker (writer) and guard (reader) always see the same identity for the
  // same edit. Previous tracker only read env+host, while guard reads
  // hookInput+env+host — that mismatch caused tracker to attribute edits to
  // one ID and guard to read another, blocking the editor's own commits.
  //
  // 1) Hook payload session_id — most stable, anchors to the conversation
  const sid = hookInput?.session_id;
  if (typeof sid === "string" && sid.length >= 8) {
    return sid.startsWith("claude-") ? sid : ("claude-" + sid.slice(0, 8));
  }
  // 2) Env override
  if (process.env.CLAUDE_SESSION_ID) {
    return process.env.CLAUDE_SESSION_ID;
  }
  // 3) Host-based fallback. We previously used hostname-PID here, but each
  //    Bash subprocess gets a new PID, so successive commit attempts from
  //    the same Claude Code instance got different IDs and the hook
  //    false-positive-blocked its own commits. host-hostname is stable
  //    across subprocess invocations on the same machine.
  return `host-${hostname()}`;
}

function loadOwnership() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf8"));
    }
  } catch { /* ignore */ }
  return { files: {}, sessions: {} };
}

function saveOwnership(state) {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* non-fatal */ }
}

function normalizeFilePath(filePath) {
  if (!filePath) return null;

  // Convert to forward slashes
  let normalized = filePath.replace(/\\/g, "/");

  // If it's within the repo, make it relative
  const repoNorm = REPO.replace(/\\/g, "/").toLowerCase();
  const fileNorm = normalized.toLowerCase();

  if (fileNorm.startsWith(repoNorm)) {
    normalized = normalized.substring(REPO.length).replace(/^\//, "");
  } else if (fileNorm.startsWith("h:/prism/")) {
    normalized = normalized.substring(9); // Remove "h:/prism/"
  }

  return normalized || null;
}

function main() {
  // Parse hook input from stdin
  let hookInput = {};
  try {
    const stdin = readFileSync(0, "utf8");
    hookInput = JSON.parse(stdin);
  } catch {
    // Not a hook call
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = hookInput.tool_name || "";
  const toolInput = hookInput.tool_input || {};

  // Only track Edit, Write, MultiEdit tools
  if (!["Edit", "Write", "MultiEdit"].includes(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Extract file path(s)
  const filePaths = [];

  if (toolName === "Edit" || toolName === "Write") {
    const fp = normalizeFilePath(toolInput.file_path);
    if (fp) filePaths.push(fp);
  } else if (toolName === "MultiEdit") {
    // MultiEdit has an array of edits
    const edits = toolInput.edits || [];
    for (const edit of edits) {
      const fp = normalizeFilePath(edit.file_path);
      if (fp) filePaths.push(fp);
    }
  }

  if (filePaths.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Update ownership
  const sessionId = getSessionId(hookInput);
  const now = Date.now();
  const state = loadOwnership();

  for (const file of filePaths) {
    // Skip non-repo files
    if (file.startsWith("/") || file.includes(":")) continue;

    state.files[file] = {
      session: sessionId,
      timestamp: now,
    };
  }

  // Update session record
  state.sessions[sessionId] = {
    lastActive: now,
    hostname: hostname(),
    filesOwned: Object.values(state.files).filter(f => f.session === sessionId).length,
  };

  // Prune old entries (>24h)
  const pruneThreshold = now - (24 * 60 * 60 * 1000);
  for (const [file, ownership] of Object.entries(state.files)) {
    if (ownership.timestamp < pruneThreshold) {
      delete state.files[file];
    }
  }

  saveOwnership(state);

  // Always allow — this is just tracking
  process.stdout.write(JSON.stringify({ continue: true }));
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
