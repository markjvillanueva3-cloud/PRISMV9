#!/usr/bin/env node
// tier: T1
/**
 * stale-claim-sweeper.mjs — SessionStart + Stop hook.
 *
 * When chat sessions die abruptly (terminal close, claude.exe killed, PC
 * shutdown), Stop hooks never fire and the cross-session coordination state
 * accumulates stale entries forever. Other chats then see ghost claims and
 * fire spurious CONFLICT messages on every PreToolUse Edit/Write.
 *
 * This hook reaps SEVEN kinds of stale state on every SessionStart (and
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
 * 4. state/shared/chat-bus/messages/*.json — remove message files older than
 *    CHAT_BUS_MSG_TTL_MS. Inject hook only shows last 10min, so older
 *    messages have zero consumers but cost N file reads per hook fire.
 *
 * 5. state/shared/chat-bus/claims/*.json — remove claim files older than
 *    CHAT_BUS_CLAIM_TTL_MS or whose self-declared `expires` is in the past.
 *    Default chat-bus claim TTL is 15-30min; this sweeps 30min+ stragglers.
 *
 * 6. C:/Users/<user>/AppData/Local/Temp/claude/<project>/<session>/tasks/
 *    *.output — remove background bash task output files older than
 *    TASK_OUTPUT_TTL_MS (24h). These accumulate from orphaned background
 *    Bash tool tasks where the harness didn't reap on session end.
 *
 * 7. Zombie node hook processes — kill node.exe processes whose:
 *      - command line contains `\.claude\(hooks|helpers|scripts)\`
 *      - lifetime > NODE_HOOK_MAX_AGE_MS (5 min — hooks normally complete in <30s)
 *      - parent claude.exe is dead (orphaned)
 *      - NOT the MCP server (excluded by cmdline match `mcp-server\dist\index.js`)
 *    Conservative filters protect active hooks across all 6 concurrent chats.
 *
 * Safe to run repeatedly. Atomic writes (tmp + rename). Emits {continue:true}
 * on every error path. Disable via env: PRISM_CLAIM_SWEEP=0
 * Disable just node-killer with: PRISM_NODE_REAP=0
 */

import {
  existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync,
  renameSync, mkdirSync, appendFileSync, rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import os from "node:os";

// Directory constants are env-overridable for sandboxed unit tests. Production
// invocation gets the hard-coded H: paths; tests set PRISM_SWEEPER_TEST_ROOT.
const TEST_ROOT = process.env.PRISM_SWEEPER_TEST_ROOT || null;
const OWNERSHIP_PATH = TEST_ROOT
  ? join(TEST_ROOT, "session-file-ownership.json")
  : "H:/prism/mcp-server/data/state/session-file-ownership.json";
const LOCK_DIR = TEST_ROOT ? join(TEST_ROOT, "locks") : "H:/prism/state/shared";
const WORKBOARD_PATH = TEST_ROOT
  ? join(TEST_ROOT, "AGENT_WORKBOARD.md")
  : "H:/prism/state/shared/AGENT_WORKBOARD.md";
const CHAT_BUS_MSG_DIR = TEST_ROOT
  ? join(TEST_ROOT, "chat-bus", "messages")
  : "H:/prism/state/shared/chat-bus/messages";
const CHAT_BUS_CLAIM_DIR = TEST_ROOT
  ? join(TEST_ROOT, "chat-bus", "claims")
  : "H:/prism/state/shared/chat-bus/claims";
const CLAUDE_TASKS_ROOT = TEST_ROOT
  ? join(TEST_ROOT, "claude-tasks")
  : join(os.homedir(), "AppData", "Local", "Temp", "claude");
const LOG_DIR = TEST_ROOT || "H:/prism/state/shared";
const LOG_FILE = `${LOG_DIR}/stale-claim-sweeper.log`;

const CLAIM_TTL_MS = 5 * 60 * 1000;             // 5 min — match git-lock TTL convention
const LOCK_TTL_MS = 5 * 60 * 1000;              // 5 min
const HEARTBEAT_TTL_MS = 60 * 60 * 1000;        // 1 hour
const CHAT_BUS_MSG_TTL_MS = 60 * 60 * 1000;     // 1 hour — inject only shows last 10min
const CHAT_BUS_CLAIM_TTL_MS = 30 * 60 * 1000;   // 30 min — chat-bus claim TTL is 15-30min
const TASK_OUTPUT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hour — background bash .output files
const NODE_HOOK_MAX_AGE_MS = 5 * 60 * 1000;     // 5 min — hooks should finish in <30s
const NODE_HOOK_HARD_KILL_AGE_MS = 15 * 60 * 1000; // 15 min — kill regardless of parent_alive (wedged-hook protection)
const ATOMIC_TMP_TTL_MS = 5 * 60 * 1000;        // 5 min — atomic writes complete in <1s; stale = crashed chat

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

export function sweepFileOwnership() {
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

export function sweepGitLocks() {
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

export function sweepAtomicWriteTmps() {
  // Atomic-write tmp files leak when a chat crashes mid-rename. Pattern variants
  // observed in state/shared/: `*.json.tmp.*`, `*.json.NNNNN.HEX.tmp`, `*.tmp`.
  // All complete within milliseconds when healthy; >5min stale = crashed chat.
  if (!existsSync(LOCK_DIR)) return { swept: 0 };
  const now = Date.now();
  let swept = 0;
  let entries;
  try { entries = readdirSync(LOCK_DIR); } catch { return { swept: 0 }; }
  for (const name of entries) {
    if (!/\.tmp(\.|$)/.test(name)) continue;
    if (/^GIT_LOCK_/.test(name)) continue;  // owned by sweepGitLocks
    const path = join(LOCK_DIR, name);
    try {
      const st = statSync(path);
      if (!st.isFile()) continue;
      if ((now - st.mtimeMs) > ATOMIC_TMP_TTL_MS) {
        unlinkSync(path);
        swept++;
      }
    } catch { /* vanished — skip */ }
  }
  return { swept };
}

export function sweepWorkboard() {
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

export function sweepChatBusMessages() {
  if (!existsSync(CHAT_BUS_MSG_DIR)) return { swept: 0 };
  const now = Date.now();
  let swept = 0;
  let entries;
  try { entries = readdirSync(CHAT_BUS_MSG_DIR); } catch { return { swept: 0 }; }
  for (const name of entries) {
    const path = join(CHAT_BUS_MSG_DIR, name);
    try {
      const st = statSync(path);
      if (!st.isFile()) continue;
      if ((now - st.mtimeMs) > CHAT_BUS_MSG_TTL_MS) {
        unlinkSync(path);
        swept++;
      }
    } catch { /* file vanished or perm error — skip */ }
  }
  return { swept };
}

export function sweepChatBusClaims() {
  if (!existsSync(CHAT_BUS_CLAIM_DIR)) return { swept: 0 };
  const now = Date.now();
  let swept = 0;
  let entries;
  try { entries = readdirSync(CHAT_BUS_CLAIM_DIR); } catch { return { swept: 0 }; }
  for (const name of entries) {
    const path = join(CHAT_BUS_CLAIM_DIR, name);
    let stale = false;
    let stMtimeMs = 0;
    try {
      const st = statSync(path);
      if (!st.isFile()) continue;
      stMtimeMs = st.mtimeMs;
      if ((now - st.mtimeMs) > CHAT_BUS_CLAIM_TTL_MS) {
        stale = true;
      } else {
        // Check self-declared expiry — claim format includes `expires` ISO string
        try {
          const claim = JSON.parse(readFileSync(path, "utf8"));
          const expiresMs = Date.parse(claim?.expires || claim?.expiresAt || "");
          if (Number.isFinite(expiresMs) && expiresMs < now) stale = true;
        } catch { /* unparseable — sweep */ stale = true; }
      }
      if (stale) {
        // Re-stat just before unlink. If a peer chat atomically renewed the claim
        // (renameSync writes a fresh tmp onto the same canonical filename) the
        // mtime advances. Skip the unlink in that case to avoid clobbering the
        // peer's renewal — we'll catch it on the next sweep if it really is stale.
        try {
          const stCheck = statSync(path);
          if (shouldSkipUnlinkDueToRace(stMtimeMs, stCheck.mtimeMs)) continue;
        } catch { continue; /* vanished — peer already cleaned it */ }
        unlinkSync(path);
        swept++;
      }
    } catch { /* file vanished — skip */ }
  }
  return { swept };
}

export function sweepClaudeTaskOutputs() {
  if (!existsSync(CLAUDE_TASKS_ROOT)) return { swept: 0, dirs: 0 };
  const now = Date.now();
  let swept = 0;
  let dirsScanned = 0;
  const projectDirs = (() => {
    try { return readdirSync(CLAUDE_TASKS_ROOT); } catch { return []; }
  })();
  for (const proj of projectDirs) {
    const projPath = join(CLAUDE_TASKS_ROOT, proj);
    let sessionDirs;
    try { sessionDirs = readdirSync(projPath); } catch { continue; }
    for (const sess of sessionDirs) {
      const tasksDir = join(projPath, sess, "tasks");
      if (!existsSync(tasksDir)) continue;
      dirsScanned++;
      let files;
      try { files = readdirSync(tasksDir); } catch { continue; }
      for (const f of files) {
        // Only sweep .output (background-bash stdout) — NOT .json (task control metadata).
        // Task .json holds harness state for resumable tasks; harness owns its lifecycle.
        if (!isClaudeTaskOutputFile(f)) continue;
        const fpath = join(tasksDir, f);
        try {
          const st = statSync(fpath);
          if ((now - st.mtimeMs) > TASK_OUTPUT_TTL_MS) {
            unlinkSync(fpath);
            swept++;
          }
        } catch { /* ok */ }
      }
    }
  }
  return { swept, dirs: dirsScanned };
}

// Pure helper: parse WMI CreationDate (yyyymmddHHMMSS.ffffff+ZZZ) → unix ms
// in host TZ. Returns null on malformed input. Extracted for unit testing.
export function parseWmiCreationDate(created) {
  const m = (typeof created === "string") ? created.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/) : null;
  if (!m) return null;
  const ms = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  return Number.isFinite(ms) ? ms : null;
}

// Pure helper: extract {pid, ppid, created, cmdline} from one wmic /format:csv row.
// Returns null on malformed input. Anchors fields from the right since CommandLine
// (the only comma-bearing field) sits in the middle.
export function parseWmicRow(row) {
  if (typeof row !== "string" || !row.trim() || row.startsWith("Node,")) return null;
  const parts = row.split(",");
  if (parts.length < 5) return null;
  const pid = Number.parseInt(parts[parts.length - 1], 10);
  const ppid = Number.parseInt(parts[parts.length - 2], 10);
  const created = parts[parts.length - 3];
  const cmdline = parts.slice(1, parts.length - 3).join(",");
  // Reject if pid or ppid failed to parse as a finite integer. Both fields must
  // be valid numbers for the downstream pidAlive / kill paths to work safely.
  if (!Number.isFinite(pid) || !Number.isFinite(ppid)) return null;
  return { pid, ppid, created, cmdline };
}

// Pure helper: is this filename a sweep-eligible Claude background-bash output?
// Returns false for .json (harness-owned task metadata) and other extensions.
export function isClaudeTaskOutputFile(name) {
  return typeof name === "string" && /\.output$/.test(name);
}

// Pure helper: should we skip unlinking a chat-bus claim because a peer renewed
// it between our first stat and our re-stat? Returns true (skip) when mtimes
// differ. Extracted so the race-check branch is unit-testable independent of fs.
export function shouldSkipUnlinkDueToRace(originalMtimeMs, recheckMtimeMs) {
  return originalMtimeMs !== recheckMtimeMs;
}

function getZombieNodeHooks() {
  // Returns array of {pid, age_ms, cmdline, parent_alive} for hook node procs.
  // Windows-specific via wmic. Returns [] on non-Windows or any error.
  // Note: WMIC is deprecated on Windows 11 24H2+; this fail-closed (returns [])
  // when wmic is missing. Migration to `Get-CimInstance Win32_Process` will be a
  // separate unit when 24H2 lands on dev machines.
  if (process.platform !== "win32") return [];
  let csv;
  try {
    csv = execFileSync("wmic", [
      "process", "where", "name='node.exe'",
      "get", "ProcessId,ParentProcessId,CommandLine,CreationDate", "/format:csv",
    ], { encoding: "utf8", timeout: 4000, windowsHide: true });
  } catch { return []; }
  // wmic /format:csv emits columns alphabetically: Node,CommandLine,CreationDate,ParentProcessId,ProcessId
  // regardless of the order requested in the `get` clause.
  const rows = csv.split(/\r?\n/).filter(r => r.trim() && !r.startsWith("Node,"));
  const result = [];
  const now = Date.now();
  for (const row of rows) {
    const parsed = parseWmicRow(row);
    if (!parsed) continue;
    const { pid, ppid, created, cmdline } = parsed;

    // SAFETY FILTER: skip MCP server unconditionally
    if (/mcp-server[\\/]dist[\\/]index\.js/i.test(cmdline)) continue;
    // Only target our hook/helper/script nodes
    if (!/[\\/]\.claude[\\/](hooks|helpers|scripts)[\\/]/i.test(cmdline)) continue;

    const createdMs = parseWmiCreationDate(created);
    if (createdMs === null) continue;
    const age_ms = now - createdMs;
    if (age_ms < NODE_HOOK_MAX_AGE_MS) continue;

    const parent_alive = pidAlive(ppid);
    result.push({ pid, ppid, age_ms, cmdline: cmdline.trim(), parent_alive });
  }
  return result;
}

export function sweepZombieNodeHooks() {
  if (process.env.PRISM_NODE_REAP === "0") return { swept: 0, found: 0 };
  if (process.platform !== "win32") return { swept: 0, found: 0 };
  const candidates = getZombieNodeHooks();
  let swept = 0;
  for (const c of candidates) {
    // Default: kill only if parent dead (protects active session hooks).
    // Escalation: if hook has been alive past NODE_HOOK_HARD_KILL_AGE_MS,
    // it's wedged regardless of parent state — every hook is supposed to
    // self-exit in <30s. This guard catches stuck mcp-http-bridge.mjs,
    // PostToolUse cascades, and other zombies whose parent claude.exe is
    // still running but who themselves are dead-locked.
    const hardKill = c.age_ms > NODE_HOOK_HARD_KILL_AGE_MS;
    if (c.parent_alive && !hardKill) continue;
    try {
      execFileSync("taskkill", ["/F", "/PID", String(c.pid)], { timeout: 2000, windowsHide: true, stdio: "ignore" });
      swept++;
    } catch { /* may already be dead */ }
  }
  return { swept, found: candidates.length };
}

function main() {
  drainStdin();
  if (process.env.PRISM_CLAIM_SWEEP === "0") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const claims = sweepFileOwnership();
  const locks = sweepGitLocks();
  const atomicTmps = sweepAtomicWriteTmps();
  const board = sweepWorkboard();
  const busMsgs = sweepChatBusMessages();
  const busClaims = sweepChatBusClaims();
  const taskOutputs = sweepClaudeTaskOutputs();
  const nodeHooks = sweepZombieNodeHooks();
  const total = claims.swept + locks.swept + atomicTmps.swept + board.swept
              + busMsgs.swept + busClaims.swept + taskOutputs.swept + nodeHooks.swept;
  if (total > 0) {
    log(`swept claims=${claims.swept} locks=${locks.swept} atomicTmps=${atomicTmps.swept} ` +
        `workboard=${board.swept} busMsgs=${busMsgs.swept} busClaims=${busClaims.swept} ` +
        `taskOutputs=${taskOutputs.swept}/${taskOutputs.dirs}dirs ` +
        `zombieNodes=${nodeHooks.swept}/${nodeHooks.found}found ` +
        `(claims kept=${claims.kept})`);
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: `stale-claim-sweeper: reaped ${claims.swept} ownership-claims, ${locks.swept} git-locks, ${atomicTmps.swept} atomic-tmps, ${board.swept} workboard, ${busMsgs.swept} bus-msgs, ${busClaims.swept} bus-claims, ${taskOutputs.swept} task-outputs, ${nodeHooks.swept}/${nodeHooks.found} zombie-nodes (killed/found)`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

// Run main() only when invoked as a script, not when imported by a test.
// Node convention: import.meta.url matches file:// URL of process.argv[1] iff CLI.
import { pathToFileURL } from "node:url";
const isEntryPoint = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] || "").href;
  } catch { return false; }
})();

if (isEntryPoint) {
  try { main(); } catch (err) {
    log(`fatal: ${err?.message || err}`);
    try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* ok */ }
  }
}

export { main };
