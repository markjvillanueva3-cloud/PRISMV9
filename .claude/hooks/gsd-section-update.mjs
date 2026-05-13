#!/usr/bin/env node
// tier: T3
/**
 * gsd-section-update.mjs — PostToolUse hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01.
 *
 * Re-runs the GSD chunker whenever Write/Edit/MultiEdit touches one of
 * the canonical GSD source files (GSD_QUICK.md, DEV_PROTOCOL.md,
 * GSD_MICRO.md). The chunker is idempotent (skips unchanged sections),
 * so re-running on every edit is cheap. Spawned as a detached
 * background process so the tool flow is never blocked by chunker
 * latency or Qdrant unavailability.
 *
 * Stdin: PostToolUse hook event (Write/Edit/MultiEdit)
 * Stdout: hookSpecificOutput.additionalContext when chunker spawned
 * Exit: always 0
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01
 */

import { readFileSync, openSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname } from "node:path";

const CHUNKER = "H:/prism/scripts/chunk-gsd-vault.mjs";
const LOG_FILE = "H:/prism/.claude/cache/gsd-chunker.log";
const GSD_PATTERN = /[\\/]mcp-server[\\/]data[\\/]docs[\\/]gsd[\\/](GSD_QUICK|DEV_PROTOCOL|GSD_MICRO)\.md$/i;

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

function isGsdSource(filePath) {
  if (!filePath) return false;
  return GSD_PATTERN.test(String(filePath));
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
  if (!isGsdSource(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const r = spawnChunker();
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: r.ok
        ? `gsd-chunker spawned (pid=${r.pid}) for ${filePath}`
        : `gsd-chunker not spawned: ${r.reason}`,
    },
  }));
}

try {
  main();
} catch (e) {
  process.stderr.write(`gsd-section-update error: ${e?.message ?? e}\n`);
  console.log(JSON.stringify({ continue: true }));
}
