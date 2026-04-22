#!/usr/bin/env node
/**
 * auto-anchor-from-prompt.mjs — UserPromptSubmit hook (runs BEFORE inject)
 *
 * MUST run before session-reorient-inject.mjs so the brief includes the
 * just-stated user intent.
 *
 * Captures every user prompt as a `user_directive` anchor. If the prompt
 * matches imperative-verb patterns (build, fix, implement, audit, etc.),
 * also records a `task_anchor`.
 *
 * Model-aware: only records when on Opus 4.7 1M (the model that needs
 * reorientation). Other models: silent no-op to keep state-file clean.
 *
 * Non-blocking: never denies prompts.
 */

import * as fs from "fs";
import * as path from "path";

// Inline session-id resolution to avoid TS module dependency
function resolveSessionId() {
  const candidates = [
    process.env.CLAUDE_SESSION_ID,
    process.env.TERM_SESSION_ID,
    process.env.CLAUDE_TERMINAL_ID,
    process.env.SSH_TTY,
    process.env.WT_SESSION,
    process.ppid ? `ppid_${process.ppid}` : null,
  ];
  for (const c of candidates) {
    if (c && String(c).trim().length > 0) {
      return String(c).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
    }
  }
  return "default";
}

const SESSION_ID = resolveSessionId();
const STATE_DIR = "H:/prism/state/session-reorientation";
const STATE_FILE = path.join(STATE_DIR, `reorientation-${SESSION_ID}.json`);

// ── Model gate (4.7 1M only) ─────────────────────────────────────
function isOpus47OneMillion(payloadModel) {
  const raw = payloadModel || process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || "";
  return /(?:claude-)?opus[-.]?4[-.]?7\b|opus[-.]?4[-.]?7.*?1m/i.test(raw);
}

// ── Anchor extraction ─────────────────────────────────────────────
const IMPERATIVE_VERBS = /^\s*(?:please\s+)?(build|fix|implement|create|add|write|refactor|audit|review|test|analyze|investigate|debug|optimize|improve|design|plan|setup|configure|deploy|ship|commit|merge|update|remove|delete|rename|migrate)\b/i;

const SLASH_COMMAND = /^\s*\/(\w[\w-]*)/;

function extractTags(text) {
  const tags = new Set();
  // File path tags
  const files = text.match(/[\w/.-]+\.(ts|js|mjs|md|json|py|tsx|jsx|sh|yml|yaml)/g) || [];
  for (const f of files) {
    const ext = f.split(".").pop()?.toLowerCase();
    if (ext) tags.add(`ext:${ext}`);
    const m = f.match(/(?:src|mcp-server|state|\.claude)\/([^/]+)/);
    if (m) tags.add(`mod:${m[1]}`);
  }
  // Task ID tags
  for (const m of text.matchAll(/\bU-[A-Z]+\d+\b/g)) tags.add(m[0]);
  // Domain keyword tags
  const kw = ["test", "engine", "hook", "skill", "dispatcher", "schema",
              "kienzle", "taylor", "speed", "feed", "tool", "material",
              "wedm", "lathe", "mill", "cad", "cam", "edm", "grind",
              "force", "thermal", "chatter", "wear", "deflection",
              "compact", "context", "token", "session", "reorient"];
  const lower = text.toLowerCase();
  for (const k of kw) if (lower.includes(k)) tags.add(`kw:${k}`);
  return [...tags];
}

function extractFiles(text) {
  const matches = text.match(/[A-Za-z]:[\\/][^\s'"<>|()]+|[\w./-]+\.(ts|js|mjs|md|json|py|tsx|jsx|sh|yml|yaml|ini|toml)/g) || [];
  return [...new Set(matches)].slice(0, 10);
}

function generateId() {
  return `anc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Atomic write helpers ──────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch {
    try {
      const backup = `${STATE_FILE}.last-good`;
      if (fs.existsSync(backup)) return JSON.parse(fs.readFileSync(backup, "utf8"));
    } catch {}
  }
  return {
    sessionId: SESSION_ID,
    anchors: [],
    stats: {
      promptsSeen: 0, toolCallsSeen: 0, anchorsRecorded: 0,
      briefsGenerated: 0, lastBriefAt: null,
      promptsSinceLastBrief: 0, toolCallsSinceLastBrief: 0,
    },
    config: { promptInterval: 15, toolCallInterval: 50, maxAnchors: 200,
              driftWindowSize: 10, driftThreshold: 0.7 },
    briefHistory: [],
  };
}

function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    const tmp = `${STATE_FILE}.tmp.${process.pid}.${Date.now().toString(36)}`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch {}
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  let input;
  try {
    input = JSON.parse(await fs.promises.readFile("/dev/stdin", "utf8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (!isOpus47OneMillion(input?.model)) {
    // Non-1M model — don't pollute state with anchors that won't drive briefs
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const promptText = input?.prompt || input?.user_prompt || input?.text || "";
  if (!promptText || typeof promptText !== "string") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Skip slash commands — they're tool invocations not directives
  if (SLASH_COMMAND.test(promptText)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const trimmed = promptText.slice(0, 200);
  const isImperative = IMPERATIVE_VERBS.test(promptText);

  try {
    const state = loadState();

    // Always record user_directive (importance 10, surfaces in brief)
    state.anchors.push({
      id: generateId(),
      type: "user_directive",
      timestamp: new Date().toISOString(),
      summary: trimmed,
      files: extractFiles(promptText),
      importance: 10,
      active: true,
      tags: extractTags(promptText),
    });

    // If imperative, ALSO record task_anchor (the verb starts a new task pivot)
    if (isImperative) {
      state.anchors.push({
        id: generateId(),
        type: "task_anchor",
        timestamp: new Date().toISOString(),
        summary: trimmed,
        files: extractFiles(promptText),
        importance: 9,
        active: true,
        tags: extractTags(promptText),
      });
    }

    state.stats = state.stats || {};
    state.stats.anchorsRecorded = (state.stats.anchorsRecorded || 0) + (isImperative ? 2 : 1);

    saveState(state);
  } catch {
    // never block on anchor recording
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
