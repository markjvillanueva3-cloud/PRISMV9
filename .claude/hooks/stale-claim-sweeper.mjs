#!/usr/bin/env node
/**
 * stale-claim-sweeper.mjs — SessionStart + Stop hook.
 *
 * When chat sessions die abruptly (terminal close, claude.exe killed, PC
 * shutdown), Stop hooks never fire and the cross-session coordination state
 * accumulates stale entries forever. Other chats then see ghost claims and
 * fire spurious CONFLICT messages on every PreToolUse Edit/Write.
 *
 * This hook reaps three kinds of stale state on every SessionStart (and
 * optionally Stop). Conservative thresholds — only sweeps clearly-dead state.
 *
 * 1. session-file-ownership.json — remove claim entries older than
 *    CLAIM_TTL_MS. Validated: PID-derived sessions whose process is gone are
 *    swept regardless of age.
 *
 * 2. state/shared/GIT_LOCK_*.json — remove lock files older than LOCK_TTL_MS
 *    or whose holder PID is no longer running.
 *
 * 3. state/shared/AGENT_WORKBOARD.md — strip agent sections whose
 *    `Last Updated:` field is older than HEARTBEAT_TTL_MS.
 *
 * Safe to run repeatedly. Atomic writes (tmp + rename). Emits {continue:true}
 * on every error path. Disable via env: PRISM_CLAIM_SWEEP=0
 */

import {
  existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync,
  renameSync, mkdirSync, appendFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";

const OWNERSHIP_PATH = "H:/prism/mcp-server/data/state/session-file-ownership.json";
const LOCK_DIR = "H:/prism/state/shared";
const WORKBOARD_PATH = "H:/prism/state/shared/AGENT_WORKBOARD.md";
const LOG_DIR = "H:/prism/state/shared";
const LOG_FILE = `${LOG_DIR}/stale-claim-sweeper.log`;

const CLAIM_TTL_MS = 5 * 60 * 1000;       // 5 min — match git-lock TTL convention
const LOCK_TTL_MS = 5 * 60 * 1000;        // 5 min
const HEARTBEAT_TTL_MS = 60 * 60 * 1000;  // 1 hour

function log(msg) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`, "utf8");
  } catch { /* best-effort */ }
}

function drainStdin() {
  try { readFileSync(0, "utf8"); } catch { /* ok */ }
}

function atomicWriteJson(path, obj) {
  const tmp = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
    renameSync(tmp, path);
    return true;
  } catch (err) {
    log(`atomic write failed for ${path}: ${err?.message || err}`);
    try { unlinkSync(tmp); } catch { /* ok */ }
    return false;
  }
}

function pidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    // process.kill(pid, 0) probes existence without signaling.
    // On Windows, throws EPERM if exists-but-no-permission, ESRCH if dead.
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if (err?.code === "EPERM") return true;
    return false;
  }
}

function extractPidFromSession(sessionStr) {
  if (typeof sessionStr !== "string") return null;
  const m = sessionStr.match(/(?:^|[^\d])pid-?(\d{2,7})(?:$|[^\d])/i)
        ?? sessionStr.match(/-(\d{4,7})(?:$|[^\d])/);
  return m ? Number.parseInt(m[1], 10) : null;
}

function sweepFileOwnership() {
  if (!existsSync(OWNERSHIP_PATH)) return { swept: 0, kept: 0 };
  let data;
  try {
    data = JSON.parse(readFileSync(OWNERSHIP_PATH, "utf8"));
  } catch (err) {
    log(`ownership parse failed: ${err?.message || err}`);
    return { swept: 0, kept: 0 };
  }
  const files = data?.files || {};
  const now = Date.now();
  const kept = {};
  let swept = 0;
  for (const [path, claim] of Object.entries(files)) {
    const ts = Number(claim?.timestamp) || 0;
    const age = now - ts;
    const session = claim?.session || "";
    const pid = extractPidFromSession(session);
    const pidDead = pid !== null && !pidAlive(pid);
    if (age > CLAIM_TTL_MS || pidDead) {
      swept++;
      continue;
    }
    kept[path] = claim;
  }
  if (swept > 0) {
    data.files = kept;
    atomicWriteJson(OWNERSHIP_PATH, data);
  }
  return { swept, kept: Object.keys(kept).length };
}

function sweepGitLocks() {
  if (!existsSync(LOCK_DIR)) return { swept: 0 };
  const now = Date.now();
  let swept = 0;
  let entries;
  try {
    entries = readdirSync(LOCK_DIR);
  } catch { return { swept: 0 }; }
  for (const name of entries) {
    if (!/^GIT_LOCK_.*\.json$/.test(name)) continue;
    const path = join(LOCK_DIR, name);
    let claim;
    try {
      claim = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      // Corrupt lock file — sweep
      try { unlinkSync(path); swept++; } catch { /* ok */ }
      continue;
    }
    const ts = Number(claim?.timestamp || claim?.acquiredAt || 0);
    const holder = String(claim?.holder || "");
    const pid = extractPidFromSession(holder);
    const pidDead = pid !== null && !pidAlive(pid);
    if ((ts > 0 && (now - ts) > LOCK_TTL_MS) || pidDead) {
      try { unlinkSync(path); swept++; } catch { /* ok */ }
    }
  }
  return { swept };
}

function sweepWorkboard() {
  if (!existsSync(WORKBOARD_PATH)) return { swept: 0 };
  let text;
  try { text = readFileSync(WORKBOARD_PATH, "utf8"); } catch { return { swept: 0 }; }
  const now = Date.now();
  // Split into sections by `## Agent@...` headers, keep ones still fresh.
  const sectionPattern = /^## [^\n]+\n([\s\S]*?)(?=^## |\Z)/gm;
  const lines = text.split(/\r?\n/);
  const out = [];
  let i = 0;
  let swept = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!/^## .+@/.test(line)) {
      out.push(line);
      i++;
      continue;
    }
    // Found an agent section — collect until next ## or end
    const sectionStart = i;
    let sectionEnd = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^## /.test(lines[j])) { sectionEnd = j; break; }
    }
    const section = lines.slice(sectionStart, sectionEnd).join("\n");
    const tsMatch = section.match(/Last Updated:\s*([^\s\n]+)/);
    let stale = false;
    if (tsMatch) {
      const ts = Date.parse(tsMatch[1]);
      if (Number.isFinite(ts) && (now - ts) > HEARTBEAT_TTL_MS) stale = true;
    }
    if (stale) {
      swept++;
    } else {
      out.push(...lines.slice(sectionStart, sectionEnd));
    }
    i = sectionEnd;
  }
  if (swept > 0) {
    try { writeFileSync(WORKBOARD_PATH, out.join("\n"), "utf8"); }
    catch (err) { log(`workboard write failed: ${err?.message || err}`); }
  }
  return { swept };
}

function main() {
  drainStdin();
  if (process.env.PRISM_CLAIM_SWEEP === "0") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const claims = sweepFileOwnership();
  const locks = sweepGitLocks();
  const board = sweepWorkboard();
  const total = claims.swept + locks.swept + board.swept;
  if (total > 0) {
    log(`swept claims=${claims.swept} locks=${locks.swept} workboard=${board.swept} (claims kept=${claims.kept})`);
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: `stale-claim-sweeper: reaped ${claims.swept} claims, ${locks.swept} locks, ${board.swept} workboard agents`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

try { main(); } catch (err) {
  log(`fatal: ${err?.message || err}`);
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* ok */ }
}
