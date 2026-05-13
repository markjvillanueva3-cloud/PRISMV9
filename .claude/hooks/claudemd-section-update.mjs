#!/usr/bin/env node
// tier: T3
/**
 * claudemd-section-update.mjs — PostToolUse hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U05.
 *
 * Re-runs the CLAUDE.md chunker whenever Write/Edit/MultiEdit touches
 * H:/prism/CLAUDE.md or ~/.claude/CLAUDE.md. The chunker is idempotent
 * (skips unchanged sections), so re-running on every edit is cheap.
 * Spawned as a detached background process so the tool flow is never
 * blocked by chunker latency or Qdrant unavailability.
 *
 * Stdin: PostToolUse hook event (Write/Edit/MultiEdit)
 * Stdout: hookSpecificOutput.additionalContext when chunker spawned
 * Exit: always 0
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P1-U05
 */

import { readFileSync, openSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname } from "node:path";

const CHUNKER = "H:/prism/scripts/chunk-claudemd-vault.mjs";
const LOG_FILE = "H:/prism/.claude/cache/claudemd-chunker.log";
const PROJECT_CLAUDEMD = "h:/prism/claude.md";
// Match any user's global CLAUDE.md path — handles wompu / Mark Villanueva / etc.
const GLOBAL_PATTERN = /[\\/]\.claude[\\/]claude\.md$/i;

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    try { return JSON.parse(buf.toString("utf8")); } catch { return null; }
  } catch { return null; }
}

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function isClaudeMd(filePath) {
  if (!filePath) return false;
  const norm = String(filePath).replace(/\\/g, "/").toLowerCase();
  if (norm === PROJECT_CLAUDEMD) return true;
  if (GLOBAL_PATTERN.test(filePath)) return true;
  return false;
}

function spawnChunker() {
  try {
    if (!existsSync(CHUNKER)) return { ok: false, reason: "script-missing" };
    ensureDir(dirname(LOG_FILE));
    const fd = openSync(LOG_FILE, "a");
    const child = spawn(process.execPath, [CHUNKER], {
      detached: true,
      windowsHide: true,
      stdio: ["ignore", fd, fd],
    });
    child.unref();
    return { ok: true, pid: child.pid };
  } catch (e) {
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

function main() {
  const input = readStdin();
  if (!input) { console.log(JSON.stringify({ continue: true })); return; }
  const tool = input.tool_name ?? input.toolName ?? "";
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const filePath = String(input.tool_input?.file_path ?? input.tool_input?.filePath ?? "");
  if (!isClaudeMd(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const r = spawnChunker();
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: r.ok
        ? `claudemd-chunker spawned (pid=${r.pid}) for ${filePath}`
        : `claudemd-chunker not spawned: ${r.reason}`,
    },
  }));
}

try {
  main();
} catch (e) {
  process.stderr.write(`claudemd-section-update error: ${e?.message ?? e}\n`);
  console.log(JSON.stringify({ continue: true }));
}
