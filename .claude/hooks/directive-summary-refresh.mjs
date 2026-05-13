#!/usr/bin/env node
// tier: T3
/**
 * directive-summary-refresh.mjs
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P4-U02.
 *
 * PostToolUse Write/Edit hook. Watches for writes to
 * `state/shared/CLAUDE-CODEX-*.md` and spawns
 * `scripts/summarize-directives-via-ollama.mjs` in the background so
 * the SUMMARIES.md cache stays fresh without blocking the tool that
 * just edited the directive.
 *
 * Contract:
 *   - continueOnError: true (any failure exits 0)
 *   - Reads the standard PostToolUse JSON payload from stdin
 *     (tool_input.file_path / tool_input.path / tool_input.target)
 *   - Refresh runs detached: child stdout/stderr → telemetry log
 *   - Throttled: skip refresh if state file mtime is < REFRESH_THROTTLE_MS old
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P4-U02
 */

import { readFileSync, existsSync, statSync, openSync, writeSync, closeSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { spawn } from "node:child_process";

const DIRECTIVE_PREFIX = "CLAUDE-CODEX-";
const DIRECTIVE_SUFFIX = ".md";
const SCRIPT = resolve("H:/prism/scripts/summarize-directives-via-ollama.mjs");
const STATE_FILE = resolve("H:/prism/mcp-server/data/state/DIRECTIVE_SUMMARIES.json");
const TELEMETRY_LOG = resolve("H:/prism/mcp-server/data/state/DIRECTIVE_SUMMARIES_REFRESH.log");
const REFRESH_THROTTLE_MS = 30_000;

function readStdin() {
  try {
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pathFromPayload(p) {
  if (!p || typeof p !== "object") return null;
  const ti = p.tool_input ?? p.toolInput ?? {};
  const candidate =
    ti.file_path ?? ti.filePath ?? ti.path ?? ti.target ?? p.file_path ?? p.path ?? null;
  if (typeof candidate !== "string") return null;
  return candidate;
}

function isDirectiveFile(filePath) {
  if (!filePath) return false;
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  if (!norm.includes("/state/shared/")) return false;
  const name = basename(norm);
  return name.startsWith(DIRECTIVE_PREFIX.toLowerCase()) && name.endsWith(DIRECTIVE_SUFFIX);
}

function isThrottled() {
  if (!existsSync(STATE_FILE)) return false;
  try {
    const ageMs = Date.now() - statSync(STATE_FILE).mtimeMs;
    return ageMs < REFRESH_THROTTLE_MS;
  } catch {
    return false;
  }
}

function ensureLogDir() {
  try {
    mkdirSync(dirname(TELEMETRY_LOG), { recursive: true });
  } catch {
    /* ignore */
  }
}

function spawnRefresh(filePath) {
  ensureLogDir();
  let fd;
  try {
    fd = openSync(TELEMETRY_LOG, "a");
    writeSync(
      fd,
      `\n=== refresh ${new Date().toISOString()} trigger=${filePath} ===\n`,
    );
  } catch {
    return false;
  }
  try {
    const child = spawn(process.execPath, [SCRIPT], {
      stdio: ["ignore", fd, fd],
      detached: true,
      shell: false,
      cwd: resolve("H:/prism"),
    });
    child.unref();
    closeSync(fd);
    return true;
  } catch {
    try { closeSync(fd); } catch { /* ignore */ }
    return false;
  }
}

function main() {
  const payload = readStdin();
  const filePath = pathFromPayload(payload);
  if (!isDirectiveFile(filePath)) {
    process.exit(0);
  }
  if (isThrottled()) {
    process.stdout.write(
      `directive-summary-refresh: throttled (last refresh < ${REFRESH_THROTTLE_MS / 1000}s ago)\n`,
    );
    process.exit(0);
  }
  const ok = spawnRefresh(filePath);
  if (ok) {
    process.stdout.write(
      `directive-summary-refresh: spawned in background for ${basename(filePath)} — SUMMARIES.md refresh in ~5–15s\n`,
    );
  } else {
    process.stdout.write(
      `directive-summary-refresh: spawn failed for ${basename(filePath)} (run script manually if needed)\n`,
    );
  }
  process.exit(0);
}

try {
  main();
} catch {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}
