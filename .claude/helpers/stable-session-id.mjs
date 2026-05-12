#!/usr/bin/env node
/**
 * stable-session-id.mjs — Generates a stable session ID that persists across hook invocations
 *
 * Problem: Hooks get new PIDs each invocation, so using $PPID creates phantom sessions.
 * Solution: Generate a UUID on first invocation for this terminal window, cache it by
 *           a stable identifier (WT_SESSION, terminal title hash, or fallback to machine+time slot).
 *
 * Usage in hooks:
 *   SESSION_ID=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
 *   node per-agent-handoff.mjs register --terminal "$SESSION_ID"
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { spawnSync } from "node:child_process";

// Absolute paths required — portable-node's PATH often lacks System32.
const WIN_WMIC = "C:/Windows/System32/wbem/WMIC.exe";
const WIN_PS = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";

const SESSION_CACHE_FILE = "H:/prism/state/shared/handoffs/.stable-session-cache.json";
const PIN_FILE = "H:/prism/state/shared/handoffs/.active-sessions-by-pid.json";
const STALE_SESSION_HOURS = 8; // Sessions older than this are considered stale
const TRANSCRIPT_ACTIVE_MS = 5 * 60 * 1000; // Only treat a transcript as "this chat" if modified in last 5 min
const PIN_FRESH_MS = 10 * 60 * 1000; // Only trust a PID pin if updated within last 10 min

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_CACHE_FILE, "utf-8"));
  } catch {
    return { sessions: {}, lastGC: null };
  }
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(SESSION_CACHE_FILE), { recursive: true });
  fs.writeFileSync(SESSION_CACHE_FILE, JSON.stringify(cache, null, 2) + "\n");
}

function readStdinSessionId() {
  // Hooks pass JSON on stdin containing Claude's own session_id — that ID is
  // stable across /compact within the same conversation and is the BEST anchor
  // for "this chat". We read non-blockingly — if stdin isn't a hook JSON blob
  // we fall through silently.
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    const parsed = JSON.parse(buf);
    const sid = parsed?.session_id || parsed?.sessionId;
    if (typeof sid === "string" && sid.length >= 8) return sid.slice(0, 36);
  } catch { /* no stdin or not JSON */ }
  return null;
}

function readClaudeTranscriptSessionId() {
  // Second-best anchor: Claude Code writes transcript JSONL files under
  // ~/.claude/projects/<project-hash>/<session-id>.jsonl.
  //
  // CRITICAL: prefer EXACT directory match, not substring. Previous substring
  // filter caused `H--prism-session-efficiency` to pick up `H--prism` transcripts
  // from a concurrent chat, stealing its session_id and writing handoffs to the
  // wrong chat's file. Exact match first; substring is only a last-resort fallback.
  try {
    const home = os.homedir();
    if (!home) return null;
    const projectsRoot = path.join(home, ".claude", "projects");
    if (!fs.existsSync(projectsRoot)) return null;

    const cwd = process.cwd().replace(/\\/g, "-").replace(/[:/\\.]/g, "-");
    const allDirs = fs.readdirSync(projectsRoot);

    // (1) Exact match on sanitized cwd
    let projectDirs = allDirs.filter((d) => d === cwd);
    // (2) Fallback: only accept a substring match if NO exact match and the
    //     candidate dir is as specific as possible (longest name wins, avoiding
    //     `H--prism` hijacking `H--prism-session-efficiency`).
    if (projectDirs.length === 0) {
      const candidates = allDirs.filter((d) => d.includes(cwd) || cwd.includes(d));
      if (candidates.length) {
        candidates.sort((a, b) => b.length - a.length);
        projectDirs = [candidates[0]];
      }
    }
    if (projectDirs.length === 0) return null;

    let best = null;
    for (const pd of projectDirs) {
      const full = path.join(projectsRoot, pd);
      if (!fs.statSync(full).isDirectory()) continue;
      const jsonls = fs.readdirSync(full).filter((f) => f.endsWith(".jsonl"));
      for (const j of jsonls) {
        const fp = path.join(full, j);
        const mt = fs.statSync(fp).mtimeMs;
        if (!best || mt > best.mtime) {
          best = { mtime: mt, id: j.replace(/\.jsonl$/, "") };
        }
      }
    }
    // GAP2 fix (2026-05-09): with 6 concurrent chats actively writing their
    // .jsonl transcripts, "most-recently-modified" rotates every few hundred
    // ms across all 6 — every chat appears fresh, winner flips run-to-run.
    // Default OFF; single-chat dev opts in via PRISM_ALLOW_TRANSCRIPT_FALLBACK=1.
    if (best && (Date.now() - best.mtime) < TRANSCRIPT_ACTIVE_MS
        && process.env.PRISM_ALLOW_TRANSCRIPT_FALLBACK === "1") {
      return best.id;
    }
  } catch { /* ignore */ }
  return null;
}

function readPidPinnedSessionId() {
  // Walk our own parent-PID chain and look up any matching entry in the
  // pin file written by session-id-pin.mjs on UserPromptSubmit / SessionStart.
  // This is the MOST RELIABLE anchor when called from Bash (no stdin).
  // Claude Code's PID is an ancestor of every tool it spawns, so the
  // mapping `{ccPid: session_id}` deterministically identifies this chat
  // even with 10 concurrent chats sharing one project directory.
  try {
    if (!fs.existsSync(PIN_FILE)) return null;
    const reg = JSON.parse(fs.readFileSync(PIN_FILE, "utf-8"));
    if (!reg?.pids) return null;

    // Collect fresh pins (updated within PIN_FRESH_MS)
    const now = Date.now();
    const fresh = {};
    for (const [pid, entry] of Object.entries(reg.pids)) {
      const last = new Date(entry.last_seen || entry.created_at || 0).getTime();
      if (now - last < PIN_FRESH_MS) fresh[pid] = entry;
    }
    if (Object.keys(fresh).length === 0) return null;

    // Walk our ancestry: start with process.pid, climb via OS lookup.
    // On Windows, use wmic. On POSIX, /proc/<pid>/status.
    const ancestors = collectAncestors(process.pid, 12);
    for (const pid of ancestors) {
      if (fresh[String(pid)]) return fresh[String(pid)].session_id;
    }
    // GAP3 fix (2026-05-09): with 6 concurrent chats the "exactly one unique
    // fresh sid" branch is unreachable (always 6). Disambiguate by cwd —
    // each chat's worktree has a distinct cwd, so a fresh pin whose
    // entry.cwd matches process.cwd() likely belongs to THIS chat.
    const ourCwd = process.cwd();
    const cwdMatches = Object.values(fresh).filter((e) => {
      if (!e?.cwd) return false;
      try { return path.resolve(e.cwd) === path.resolve(ourCwd); }
      catch { return false; }
    });
    const cwdSids = [...new Set(cwdMatches.map((e) => e.session_id))];
    if (cwdSids.length === 1) return cwdSids[0];
    // Pre-existing fallback retained: single fresh sid in the whole registry.
    // Still useful when only one chat is alive and its PID walk failed.
    const uniqueSids = [...new Set(Object.values(fresh).map((e) => e.session_id))];
    if (uniqueSids.length === 1) return uniqueSids[0];
    return null;
  } catch { return null; }
}

function collectAncestors(startPid, maxDepth = 8) {
  const chain = [];
  let pid = Number(startPid);
  let depth = 0;
  while (pid && pid > 1 && depth < maxDepth) {
    chain.push(pid);
    const ppid = getParentPid(pid);
    if (!ppid || ppid === pid) break;
    pid = ppid;
    depth++;
  }
  return chain;
}

function getParentPid(pid) {
  try {
    if (process.platform === "win32") {
      // WMIC (absolute path — portable-node PATH often lacks System32).
      // WMIC is deprecated but installed on every current Windows release.
      if (fs.existsSync(WIN_WMIC)) {
        const r = spawnSync(
          WIN_WMIC,
          ["process", "where", `processid=${pid}`, "get", "parentprocessid", "/value"],
          { encoding: "utf-8", timeout: 1500 }
        );
        if (r.status === 0 && r.stdout) {
          const m = r.stdout.match(/ParentProcessId=(\d+)/);
          if (m) return Number(m[1]);
        }
      }
      // Fallback: PowerShell CIM
      if (fs.existsSync(WIN_PS)) {
        const r = spawnSync(
          WIN_PS,
          ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" | Select-Object -ExpandProperty ParentProcessId`],
          { encoding: "utf-8", timeout: 3000 }
        );
        if (r.status === 0 && r.stdout) {
          const n = Number(r.stdout.trim());
          if (Number.isFinite(n) && n > 0) return n;
        }
      }
      return null;
    } else {
      const status = fs.readFileSync(`/proc/${pid}/status`, "utf-8");
      const m = status.match(/^PPid:\s*(\d+)/m);
      return m ? Number(m[1]) : null;
    }
  } catch { return null; }
}

function getStableIdentifier() {
  // (1) Claude's own session_id via stdin (most stable — survives /compact)
  const stdinSid = readStdinSessionId();
  if (stdinSid) return `claude-sid-${stdinSid}`;

  // (2) PID-anchored pin (most reliable when called from Bash).
  //     Walks parent PIDs to find Claude Code's PID in the pin registry
  //     written by session-id-pin.mjs. Works deterministically even with
  //     10 concurrent chats sharing the same project directory.
  const pidSid = readPidPinnedSessionId();
  if (pidSid) return `claude-sid-${pidSid}`;

  // (3) Explicit override via env (useful for scripts)
  if (process.env.CLAUDE_SESSION_ID) {
    return `claude-sid-${process.env.CLAUDE_SESSION_ID.slice(0, 36)}`;
  }

  // (4) Claude transcript file (LAST RESORT — unreliable with concurrent chats).
  //     Demoted from (3) because with 6+ chats sharing one project dir, the
  //     "most recent transcript" winner flips each time any chat flushes.
  const txSid = readClaudeTranscriptSessionId();
  if (txSid) return `claude-tx-${txSid}`;

  // (4) Terminal env var (only if unique per chat — VSCODE_GIT_ASKPASS_NODE
  //     REMOVED because it's a binary path shared across every VS Code terminal).
  const candidates = [
    process.env.WT_SESSION,           // Windows Terminal session (per-pane GUID)
    process.env.TERM_SESSION_ID,      // macOS Terminal
    process.env.TERMINAL_SESSION_ID,  // Generic
    process.env.CONEMU_SESSION_ID,    // ConEmu
    process.env.WEZTERM_SESSION_ID,   // WezTerm
  ];
  for (const c of candidates) {
    if (c && c.trim()) return `env-${c.trim().slice(0, 32)}`;
  }

  // (5) GAP1 fix (2026-05-09): time-slot fallback silently collided 6-chat IDs
  //     in the same 15-min window, causing concurrent /compact storms to
  //     overwrite each other's handoffs. Return null and let the caller
  //     surface the failure (e.g. /precompact prompts user for explicit
  //     --terminal). The previous fallback was an auditable lost-handoff bug.
  return null;
}

function gcStaleEntries(cache) {
  const now = Date.now();
  const staleMs = STALE_SESSION_HOURS * 60 * 60 * 1000;

  // Don't GC more than once per hour
  if (cache.lastGC && (now - new Date(cache.lastGC).getTime()) < 60 * 60 * 1000) {
    return cache;
  }

  const before = Object.keys(cache.sessions).length;
  const sessions = {};

  for (const [key, session] of Object.entries(cache.sessions)) {
    const age = now - new Date(session.created_at).getTime();
    if (age < staleMs) {
      sessions[key] = session;
    }
  }

  cache.sessions = sessions;
  cache.lastGC = new Date().toISOString();

  const removed = before - Object.keys(sessions).length;
  if (removed > 0) {
    console.error(`GC: removed ${removed} stale sessions`);
  }

  return cache;
}

function deriveTerminalFromIdentifier(identifier) {
  // precompact-handoff.mjs uses `claude-${sessionId.slice(0,8)}` as the
  // terminal name. For per-agent-handoff read to find the right file, we
  // must emit the SAME format. Match identifier forms:
  //   "claude-sid-<full-uuid>"      → "claude-<first8>"   (stdin, env, pin)
  //   "claude-tx-<full-uuid>"       → "claude-<first8>"   (transcript-derived)
  //   anything else                 → return null (fall through to UUID cache)
  const m = identifier.match(/^claude-(?:sid|tx)-([0-9a-f]{8})/i);
  if (m) return `claude-${m[1].toLowerCase()}`;
  return null;
}

function main() {
  let cache = loadCache();

  // Run GC
  cache = gcStaleEntries(cache);

  const identifier = getStableIdentifier();

  // GAP1 fix (2026-05-09): with the time-slot fallback removed,
  // getStableIdentifier may legitimately return null when ALL 5 resolution
  // methods fail (no stdin / no fresh PID pin / no recent transcript / no
  // terminal env). Surface the failure on stderr and exit non-zero so the
  // caller (per-agent-handoff, /precompact, /startup) prompts for explicit
  // --terminal instead of silently picking the wrong chat.
  if (!identifier) {
    // HS-01 fallback (2026-05-12): all 5 primary anchors failed (typically
    // after /compact-resume in a Bash-launched chat where the PID pin
    // hasn't been refreshed yet). Instead of exit-2-ing — which broke the
    // /precompact handoff write this very session — return the most-
    // recently-touched cached session_id whose last_seen is within
    // RECENT_CACHE_MS. Soft-warn on stderr so the caller knows it's a
    // best-effort answer; the next prompt's SessionStart hook chain will
    // refresh the real anchors and the cache resyncs automatically.
    const RECENT_CACHE_MS = 30 * 60 * 1000;
    const now = Date.now();
    const recent = Object.values(cache.sessions || {})
      .filter((s) => s?.session_id && s?.last_seen)
      .filter((s) => (now - new Date(s.last_seen).getTime()) < RECENT_CACHE_MS)
      .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
    if (recent.length > 0 && process.env.PRISM_STABLE_ID_HARD_FAIL !== "1") {
      process.stderr.write(
        `stable-session-id: anchors unresolved — falling back to most-recently-touched cached session (last_seen ${recent[0].last_seen}). Set PRISM_STABLE_ID_HARD_FAIL=1 to disable.\n`
      );
      console.log(recent[0].session_id);
      return;
    }
    process.stderr.write(
      "stable-session-id: unresolved — pass session_id via stdin JSON, "
        + "set WT_SESSION, or run from a chat with a fresh PID pin.\n"
    );
    process.exit(2);
  }

  // If the identifier is derived from Claude's own session_id (stdin, pin,
  // env, or transcript), emit `claude-<first8>` so this matches the filename
  // precompact-handoff.mjs uses when it writes the per-agent handoff.
  const derivedTerminal = deriveTerminalFromIdentifier(identifier);
  if (derivedTerminal) {
    // Still update cache so other callers can see activity
    cache.sessions[identifier] = cache.sessions[identifier] || {
      session_id: derivedTerminal,
      identifier,
      machine: os.hostname(),
      created_at: new Date().toISOString(),
    };
    cache.sessions[identifier].last_seen = new Date().toISOString();
    cache.sessions[identifier].session_id = derivedTerminal;
    saveCache(cache);
    console.log(derivedTerminal);
    return;
  }

  // Fallback path (env-based / slot-based identifiers) — check cached UUID
  if (cache.sessions[identifier]) {
    cache.sessions[identifier].last_seen = new Date().toISOString();
    saveCache(cache);
    console.log(cache.sessions[identifier].session_id);
    return;
  }

  // Last resort: generate a new stable session ID
  const sessionId = `claude-${crypto.randomUUID().slice(0, 8)}`;

  cache.sessions[identifier] = {
    session_id: sessionId,
    identifier,
    machine: os.hostname(),
    created_at: new Date().toISOString(),
    last_seen: new Date().toISOString(),
  };

  saveCache(cache);
  console.log(sessionId);
}

try {
  main();
} catch {
  process.stdout.write(JSON.stringify({ continue: true }));
}
