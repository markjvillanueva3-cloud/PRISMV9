#!/usr/bin/env node
// tier: T3
// handoff-memory-seed-stop.mjs — Stop hook
//
// SYSTEM-VIZ-BRAIN-MS0/U-P1-HANDOFF-MEMORY-SEED.
//
// After Stop fires (and the existing precompact/handoff-writer hooks have
// already written the per-agent handoff for this chat), append/replace a
// ## MEMORY_SEED section with top distilled signals (recent error events +
// just-shipped Obsidian memos + wiki code-tribal learnings) so the next
// chat starts with context instead of a blank slate.
//
// Non-blocking. Always returns {"continue":true}. Skip if disabled or if no
// session id resolvable.
//
// Knobs:
//   PRISM_HANDOFF_MEMORY_SEED_DISABLE=1   no-op
//   PRISM_HANDOFF_MEMORY_SEED_SYNC=1      run synchronously (default detached)
//   PRISM_HANDOFF_MEMORY_SEED_TIMEOUT_MS  default 5000 (sync mode only)
//   PRISM_ROOT                            repo root (default H:/prism)

import { execFileSync, spawn } from "node:child_process";
import { existsSync, openSync, closeSync, mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 5000;
const DISABLE = process.env.PRISM_HANDOFF_MEMORY_SEED_DISABLE === "1";
const SYNC = process.env.PRISM_HANDOFF_MEMORY_SEED_SYNC === "1";
const TIMEOUT_MS = parseInt(process.env.PRISM_HANDOFF_MEMORY_SEED_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10) || DEFAULT_TIMEOUT_MS;
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";

function approve() { process.stdout.write(JSON.stringify({ continue: true })); }

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function resolveInstance(payload) {
  if (payload && (payload.session_id || payload.sessionId)) {
    return String(payload.session_id || payload.sessionId).slice(0, 32);
  }
  try {
    const helper = path.join(PRISM_ROOT, ".claude", "helpers", "stable-session-id.mjs");
    if (existsSync(helper)) {
      const out = execFileSync(process.execPath, [helper], {
        encoding: "utf8", timeout: 1500, stdio: ["ignore", "pipe", "ignore"],
        input: JSON.stringify(payload || {}),
      });
      const id = out.trim();
      if (id && id !== "unresolved") return id;
    }
  } catch { /* fallthrough */ }
  return null;
}

function runSync(scriptPath, instance) {
  try {
    execFileSync(process.execPath, [scriptPath, "--instance", instance], {
      encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "ignore", "ignore"],
    });
  } catch { /* non-blocking */ }
}

function runDetached(scriptPath, instance) {
  try {
    const logDir = path.join(PRISM_ROOT, "state", "shared");
    mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, ".handoff-memory-seed.log");
    const fd = openSync(logPath, "a");
    const child = spawn(process.execPath, [scriptPath, "--instance", instance], {
      detached: true,
      stdio: ["ignore", fd, fd],
      windowsHide: true,
    });
    child.unref();
    closeSync(fd);
  } catch { /* non-blocking */ }
}

function main() {
  if (DISABLE) { approve(); return; }
  const payload = readStdin();
  const instance = resolveInstance(payload);
  if (!instance) { approve(); return; }

  const scriptPath = path.join(PRISM_ROOT, "scripts", "handoff-memory-seed.mjs");
  if (!existsSync(scriptPath)) { approve(); return; }

  if (SYNC) runSync(scriptPath, instance);
  else runDetached(scriptPath, instance);
  approve();
}

main();
