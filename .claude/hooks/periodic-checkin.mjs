#!/usr/bin/env node
// tier: T4
/**
 * periodic-checkin.mjs — UserPromptSubmit periodic heartbeat + chat poll
 *
 * WHY: Concurrent chats (4+) need regular situational awareness of each
 * other's work. SessionStart-only coordination goes stale fast. This hook
 * fires on every UserPromptSubmit with a 20-minute cooldown per session:
 *   1. Posts a heartbeat to AGENT_CHAT.jsonl ("active: <prompt prefix>")
 *   2. Polls for unseen chat entries from other sessions
 *   3. Injects the poll summary as additionalContext
 *
 * Non-blocking: if the coordination helper is missing or throws, the hook
 * falls through silently. User prompts never fail because of check-in.
 *
 * FIRES ON: UserPromptSubmit
 * INPUT: { prompt, session_id, ... }
 * OUTPUT: { additionalContext: "..." } JSON when unseen entries exist,
 *         or exit 0 silent.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exit } from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COOLDOWN_FILE = "H:/prism/.claude/cache/periodic-checkin-last.json";
const COOLDOWN_DIR = "H:/prism/.claude/cache";
const COOLDOWN_MS = 20 * 60 * 1000; // 20 min

const COORDINATION_HELPER_CANDIDATES = [
  "H:/prism/.claude/helpers/agent-coordination.mjs",
  path.join(__dirname, "..", "helpers", "agent-coordination.mjs"),
];

// ── Parse stdin ───────────────────────────────────────────────────────

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  exit(0);
}

const promptRaw =
  payload?.prompt || payload?.user_prompt || payload?.userPrompt || "";
if (typeof promptRaw !== "string") exit(0);

const sessionId =
  payload?.session_id || payload?.sessionId || "unknown-session";

// Skip slash commands — they're already routed and don't need a heartbeat
if (promptRaw.trim().startsWith("/")) exit(0);

// ── Cooldown check ────────────────────────────────────────────────────

function readCooldown() {
  try {
    if (!existsSync(COOLDOWN_FILE)) return {};
    return JSON.parse(readFileSync(COOLDOWN_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeCooldown(state) {
  try {
    mkdirSync(COOLDOWN_DIR, { recursive: true });
  } catch { /* ignore */ }
  try {
    writeFileSync(COOLDOWN_FILE, JSON.stringify(state, null, 2));
  } catch { /* ignore */ }
}

const cooldown = readCooldown();
const lastPost = cooldown[sessionId]?.lastPost || 0;
const now = Date.now();
const withinCooldown = now - lastPost < COOLDOWN_MS;

// ── Find coordination helper ──────────────────────────────────────────

function findHelper() {
  for (const p of COORDINATION_HELPER_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

const helper = findHelper();
if (!helper) exit(0); // no coordination infra — silent fallthrough

// ── Post heartbeat (detached, non-blocking) when cooldown elapsed ─────

if (!withinCooldown) {
  const summary = promptRaw.replace(/\s+/g, " ").trim().slice(0, 120);
  const msg = `heartbeat: ${summary}`;
  try {
    const child = spawn(
      process.execPath,
      [helper, "post", "--message", msg, "--status", "active"],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      },
    );
    child.unref();
  } catch { /* best-effort */ }

  cooldown[sessionId] = { lastPost: now };
  // Prune old session entries (> 24h)
  const dayAgo = now - 24 * 60 * 60 * 1000;
  for (const k of Object.keys(cooldown)) {
    if ((cooldown[k]?.lastPost || 0) < dayAgo) delete cooldown[k];
  }
  writeCooldown(cooldown);
}

// ── Poll for unseen entries (synchronous, short timeout) ──────────────

let additionalContext = "";

try {
  const result = spawnSync(
    process.execPath,
    [helper, "poll", "--agent-instance", sessionId],
    {
      encoding: "utf-8",
      timeout: 1200,
      windowsHide: true,
    },
  );
  if (result.status === 0 && result.stdout) {
    try {
      const parsed = JSON.parse(result.stdout);
      if (parsed.additionalContext && parsed.unseen > 0) {
        additionalContext = parsed.additionalContext;
      }
    } catch { /* stdout was not JSON — skip */ }
  }
} catch { /* timeout or spawn failure — skip */ }

if (additionalContext) {
  process.stdout.write(JSON.stringify({ additionalContext }));
}

exit(0);
