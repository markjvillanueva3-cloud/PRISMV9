#!/usr/bin/env node
/**
 * session-token-state.mjs — per-session token + state isolation
 *
 * Purpose:
 *   Up to 8 concurrent Claude chats share this repo. Hooks that count tokens
 *   or track context pressure must NOT read/write a single shared JSON file —
 *   one chat at 800K tokens would otherwise flag every other chat as critical.
 *
 * Provides:
 *   - getSessionId(stdin?)          — stable 8-char session id from stdin / env
 *   - getTranscriptTokens(stdin)    — authoritative token count from transcript JSONL
 *                                     (sums input + cache_read + cache_creation on
 *                                      the most recent assistant message)
 *   - getSessionStatePath(session, name)  — per-session JSON path for arbitrary state
 *   - readSessionJson / writeSessionJson  — convenience helpers
 *   - CONTEXT_CAP                   — 1,000,000 (Opus 4.7 1M context, env override)
 *   - SOFT_THRESHOLD / HARD_THRESHOLD — match precompact-auto-trigger defaults
 *
 * Storage layout (per chat):
 *   H:/prism/.claude/cache/per-session/<session-id>/<name>.json
 */

import fs from "node:fs";
import path from "node:path";

const CACHE_ROOT = "H:/prism/.claude/cache/per-session";
const FALLBACK_SID = "default";
export const CONTEXT_CAP = Number(process.env.PRECOMPACT_CONTEXT_CAP || 1_000_000);
export const SOFT_THRESHOLD = Number(process.env.PRECOMPACT_SOFT_TOKENS || 800_000);
export const HARD_THRESHOLD = Number(process.env.PRECOMPACT_HARD_TOKENS || 900_000);
const CHARS_PER_TOKEN = 3.5;

export function getSessionId(stdin) {
  const raw =
    (stdin && typeof stdin.session_id === "string" && stdin.session_id) ||
    (stdin && typeof stdin.sessionId === "string" && stdin.sessionId) ||
    process.env.CLAUDE_SESSION_ID ||
    FALLBACK_SID;
  return raw.slice(0, 8);
}

export function getTranscriptTokens(stdin) {
  const transcriptPath = stdin?.transcript_path;
  if (!transcriptPath) return 0;
  // Authoritative: last assistant message's usage block
  try {
    const raw = fs.readFileSync(transcriptPath, "utf-8");
    const lines = raw.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      const usage = entry?.message?.usage ?? entry?.usage;
      if (entry?.type === "assistant" && usage && typeof usage === "object") {
        const input = Number(usage.input_tokens ?? 0);
        const cacheR = Number(usage.cache_read_input_tokens ?? 0);
        const cacheC = Number(usage.cache_creation_input_tokens ?? 0);
        return input + cacheR + cacheC;
      }
    }
  } catch { /* fall through */ }
  // Fallback: byte estimate
  try {
    const st = fs.statSync(transcriptPath);
    return Math.floor(st.size / CHARS_PER_TOKEN);
  } catch { return 0; }
}

export function getSessionStatePath(sessionId, name) {
  const sid = (sessionId || FALLBACK_SID).slice(0, 8);
  const dir = path.join(CACHE_ROOT, sid);
  return path.join(dir, `${name}.json`);
}

export function ensureSessionDir(sessionId) {
  const sid = (sessionId || FALLBACK_SID).slice(0, 8);
  const dir = path.join(CACHE_ROOT, sid);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readSessionJson(sessionId, name, fallback = null) {
  try {
    const p = getSessionStatePath(sessionId, name);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return fallback;
  }
}

export function writeSessionJson(sessionId, name, value) {
  try {
    ensureSessionDir(sessionId);
    const p = getSessionStatePath(sessionId, name);
    fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}

export function readStdinJson() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

// GC: remove session directories untouched for >48h. Bounded to 8 active chats.
export function gcStaleSessions({ maxAgeMs = 48 * 60 * 60 * 1000 } = {}) {
  let removed = 0;
  try {
    if (!fs.existsSync(CACHE_ROOT)) return 0;
    const now = Date.now();
    for (const dir of fs.readdirSync(CACHE_ROOT)) {
      const p = path.join(CACHE_ROOT, dir);
      try {
        const st = fs.statSync(p);
        if (st.isDirectory() && (now - st.mtimeMs) > maxAgeMs) {
          fs.rmSync(p, { recursive: true, force: true });
          removed++;
        }
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }
  return removed;
}
