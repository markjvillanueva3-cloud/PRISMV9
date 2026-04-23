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

const SESSION_CACHE_FILE = "H:/prism/state/shared/handoffs/.stable-session-cache.json";
const STALE_SESSION_HOURS = 8; // Sessions older than this are considered stale
const TRANSCRIPT_ACTIVE_MS = 5 * 60 * 1000; // Only treat a transcript as "this chat" if modified in last 5 min

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
    // Only use if modified very recently — an active chat has its transcript
    // being written AS we run. Older = stale / not this session.
    if (best && (Date.now() - best.mtime) < TRANSCRIPT_ACTIVE_MS) {
      return best.id;
    }
  } catch { /* ignore */ }
  return null;
}

function getStableIdentifier() {
  // (1) Claude's own session_id via stdin (most stable — survives /compact)
  const stdinSid = readStdinSessionId();
  if (stdinSid) return `claude-sid-${stdinSid}`;

  // (2) Explicit override via env (useful for scripts)
  if (process.env.CLAUDE_SESSION_ID) {
    return `claude-sid-${process.env.CLAUDE_SESSION_ID.slice(0, 36)}`;
  }

  // (3) Claude transcript file (most recent ACTIVE transcript in this project).
  //     Moved BEFORE terminal env vars because env vars like WT_SESSION are per
  //     terminal-window, not per-chat — two chats in the same Windows Terminal
  //     would share it. The transcript file is per-chat by construction.
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

  // (5) Fallback: machine + 15-min time slot (degraded — rotates every 15 min)
  const machine = os.hostname() || "unknown";
  const timeSlot = Math.floor(Date.now() / (15 * 60 * 1000));
  return `slot-${machine}-${timeSlot}`;
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

function main() {
  let cache = loadCache();

  // Run GC
  cache = gcStaleEntries(cache);

  const identifier = getStableIdentifier();

  // Check if we have a cached session for this identifier
  if (cache.sessions[identifier]) {
    // Update last_seen
    cache.sessions[identifier].last_seen = new Date().toISOString();
    saveCache(cache);
    console.log(cache.sessions[identifier].session_id);
    return;
  }

  // Generate a new stable session ID
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

main();
