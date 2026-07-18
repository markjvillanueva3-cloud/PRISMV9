#!/usr/bin/env node
// tier: T4
/**
 * pretool-edit-batching-nudge.mjs — PreToolUse hook (Edit)
 * Gap A3: when operator has Edited the same file 3+ times in 60s, suggest
 * batching with MultiEdit. Tracks recent edits in a session-scoped sidecar.
 * Knob: PRISM_EDIT_BATCH_NUDGE_DISABLE=1
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const STATE_FILE = "H:/prism/state/shared/edit-batch-tracker.json";
const WINDOW_MS = 60 * 1000;
const THRESHOLD_EDITS = 3;

export function recordEdit(state, sessionId, filePath, now = Date.now()) {
  const base = state && typeof state === "object" ? { ...state } : { sessions: {} };
  base.sessions = base.sessions || {};
  const key = sessionId || "_unknown";
  const sess = base.sessions[key] || {};
  const arr = (sess[filePath] || []).filter(ts => (now - ts) < WINDOW_MS);
  arr.push(now);
  return { ...base, sessions: { ...base.sessions, [key]: { ...sess, [filePath]: arr } } };
}

export function shouldNudge(state, sessionId, filePath, now = Date.now()) {
  if (!state || !state.sessions) return false;
  const sess = state.sessions[sessionId];
  if (!sess) return false;
  const arr = (sess[filePath] || []).filter(ts => (now - ts) < WINDOW_MS);
  return arr.length >= THRESHOLD_EDITS;
}

export function formatBatchNudge(filePath, editCount) {
  return `## 📝 Sequential-Edit batching nudge (A3)\nYou've Edited \`${filePath}\` ${editCount}+ times in 60s. If the remaining changes are still in flight, consider switching to \`MultiEdit\` with an \`edits[]\` array — single hook-stack invocation, atomic apply, easier to review. Disable: \`PRISM_EDIT_BATCH_NUDGE_DISABLE=1\`.`;
}

async function readStdin() { try { return JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return {}; } }
function pass() { process.stdout.write(JSON.stringify({ continue: true })); }
async function main() {
  if (process.env.PRISM_EDIT_BATCH_NUDGE_DISABLE === "1") { pass(); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  if (toolName !== "Edit") { pass(); return; }
  const filePath = String((input.tool_input || input.input || {}).file_path || "");
  const sessionId = String(input.session_id || input.sessionId || "").slice(0, 36);
  if (!filePath) { pass(); return; }
  let state; try { state = JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { state = { sessions: {} }; }
  const newState = recordEdit(state, sessionId, filePath);
  try {
    if (!existsSync(dirname(STATE_FILE))) mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(newState), "utf8");
  } catch { /* tolerate */ }
  if (shouldNudge(newState, sessionId, filePath)) {
    const editCount = ((newState.sessions[sessionId] || {})[filePath] || []).length;
    process.stdout.write(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: formatBatchNudge(filePath, editCount) } }));
  } else pass();
}
if (process.argv[1] && process.argv[1].endsWith("pretool-edit-batching-nudge.mjs")) main().catch(() => pass());
