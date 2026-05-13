#!/usr/bin/env node
// tier: T1
/**
 * git-commit-checkin.mjs — PreToolUse check-in on git commit/push
 *
 * WHY: Multiple Claude + Codex chats work concurrently on the same worktree.
 * git-anti-clobber.mjs serializes mutations but gives no *semantic* view of
 * "who is about to commit what". This hook posts an intent note to
 * AGENT_CHAT.jsonl before any commit/push, and surfaces any overlapping
 * intent from other chats in the last 5 minutes.
 *
 * It does NOT deny — coordination is a trace, not a gate. git-anti-clobber
 * handles the hard serialization via GIT_LOCK.json.
 *
 * FIRES ON: PreToolUse, matcher ^Bash$
 * INPUT: Claude Code PreToolUse JSON on stdin
 * OUTPUT: permissionDecisionReason with coordination context (non-blocking),
 *         or exit 0 silent when no overlap.
 *
 * SIDE EFFECT: Spawns detached node subprocess that posts to AGENT_CHAT via
 * agent-coordination.mjs. The hook does not block on that post.
 */

import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exit } from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHAT_JSONL_CANDIDATES = [
  "H:/prism/state/shared/AGENT_CHAT.jsonl",
];

const COORDINATION_HELPER_CANDIDATES = [
  "H:/prism/.claude/helpers/agent-coordination.mjs",
  path.join(__dirname, "..", "helpers", "agent-coordination.mjs"),
];

const OVERLAP_WINDOW_MS = 5 * 60 * 1000; // 5 min
const HOT_OVERLAP_MS = 30 * 1000; // 30s — same-moment conflict
const COMMIT_KEYWORDS = ["commit-intent", "committing", "about to commit", "pushing", "committing_at"];

// ── Parse stdin ───────────────────────────────────────────────────────

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  exit(0);
}

const tool = payload?.tool_name || payload?.tool || "";
if (tool !== "Bash") exit(0);

const cmd = payload?.tool_input?.command || payload?.input?.command || "";
if (typeof cmd !== "string" || !cmd.trim()) exit(0);

const sessionId = payload?.session_id || payload?.sessionId || "unknown-session";

// ── Only trigger on commit/push (the social-coordination commands) ────

const isCommit = /\bgit(?:\.exe)?\s+(?:-[^\s]+\s+)*commit\b/i.test(cmd);
const isPush = /\bgit(?:\.exe)?\s+(?:-[^\s]+\s+)*push\b/i.test(cmd);
if (!isCommit && !isPush) exit(0);

const action = isCommit ? "commit" : "push";

// ── Scan recent chat for overlapping intent ──────────────────────────

function readRecentChat() {
  for (const p of CHAT_JSONL_CANDIDATES) {
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, "utf-8");
      const lines = raw.split(/\r?\n/).filter(Boolean);
      const cutoff = Date.now() - OVERLAP_WINDOW_MS;
      const recent = [];
      // Scan last 50 entries (latest → oldest)
      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 50); i--) {
        try {
          const entry = JSON.parse(lines[i]);
          const t = Date.parse(entry.timestamp);
          if (isNaN(t) || t < cutoff) break;
          recent.push(entry);
        } catch { /* skip */ }
      }
      return recent;
    } catch { /* try next */ }
  }
  return [];
}

const recent = readRecentChat();

// ── Find overlapping commit/push intent from OTHER sessions ──────────

const meInstance = payload?.agent_instance || payload?.session_key || sessionId;

const overlaps = recent.filter((entry) => {
  if (!entry || entry.agent_instance === meInstance || entry.session_key === sessionId) {
    return false;
  }
  const text = `${entry.message || ""} ${entry.raw_message || ""} ${entry.status || ""}`.toLowerCase();
  return COMMIT_KEYWORDS.some((kw) => text.includes(kw));
});

// ── Post our intent (detached, non-blocking) ─────────────────────────

function findCoordinationHelper() {
  for (const p of COORDINATION_HELPER_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

function extractCommitSubject(command) {
  // Pick -m "..." or -m '...' from the command. Best-effort.
  const m = command.match(/-m\s+(?:"([^"]+)"|'([^']+)'|(\S+))/);
  return (m && (m[1] || m[2] || m[3])) || null;
}

function postIntent() {
  const helper = findCoordinationHelper();
  if (!helper) return;
  const now = new Date();
  const isoTs = now.toISOString();
  const clockLabel = now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
  const subject = extractCommitSubject(cmd);
  const subjectPart = subject ? ` subject="${subject.slice(0, 80)}"` : "";
  const msg =
    `commit-intent [committing_at=${isoTs}]: ${action.toUpperCase()} NOW at ${clockLabel}.` +
    `${subjectPart} cmd="${cmd.slice(0, 120)}"`;
  try {
    const child = spawn(
      process.execPath,
      [helper, "post", "--message", msg, "--status", `${action}ing`],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      },
    );
    child.unref();
  } catch { /* best-effort */ }
}

postIntent();

// ── Emit non-blocking warning when overlap found ─────────────────────

if (overlaps.length === 0) {
  exit(0);
}

const latestOverlap = overlaps[0]; // entries are in latest-first order
const overlapTs = Date.parse(latestOverlap.timestamp);
const ageMs = Date.now() - overlapTs;
const ageSec = Math.round(ageMs / 1000);
const severity = ageMs < HOT_OVERLAP_MS
  ? "🔴 HOT OVERLAP (<30s)"
  : "⚠ Recent overlap";
const myTs = new Date().toISOString();
const reason =
  `${severity}: another chat posted commit/push intent ${ageSec}s ago.\n` +
  `Their instance: ${latestOverlap.agent_instance || latestOverlap.agent || "unknown"}\n` +
  `Their timestamp: ${latestOverlap.timestamp}\n` +
  `Their note: ${String(latestOverlap.message || latestOverlap.raw_message || "").slice(0, 240)}\n` +
  `Your ${action} now:  ${myTs}\n` +
  `Your cmd:         ${cmd.slice(0, 200)}\n\n` +
  `Your intent (with committing_at timestamp) has been posted to AGENT_CHAT.\n` +
  `git-anti-clobber will serialize the actual git mutation via GIT_LOCK.json.`;

// Use permissionDecision "allow" with reason — reason is shown to Claude but
// the command proceeds. This is a coordination trace, not a gate.
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: reason,
    },
  }),
);
exit(0);
