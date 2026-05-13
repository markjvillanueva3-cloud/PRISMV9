#!/usr/bin/env node
// tier: T3
/**
 * edit-multiedit-suggest.mjs — PostToolUse Edit
 *
 * Tracks Edit calls per file. After 3+ Edits to the same file within a
 * 60-second window, suggests using MultiEdit instead — which batches
 * multiple edits into a single round-trip (saves ~30 tokens + ~500ms
 * per skipped Edit call).
 *
 * State: H:/prism/state/edit-multiedit-suggest/edits-${session}.json
 *
 * Non-blocking: emits suggestion on threshold, never denies.
 */

import * as fs from "fs";
import * as path from "path";

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
const STATE_DIR = "H:/prism/state/edit-multiedit-suggest";
const STATE_FILE = path.join(STATE_DIR, `edits-${SESSION_ID}.json`);

const WINDOW_MS = 60_000;
const THRESHOLD = 3;
const MAX_TRACKED = 200;

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch {}
  return { edits: [], suggested: {} };
}

function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    if (state.edits.length > MAX_TRACKED) {
      state.edits = state.edits.slice(-MAX_TRACKED);
    }
    const tmp = `${STATE_FILE}.tmp.${process.pid}.${Date.now().toString(36)}`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch {}
}

async function main() {
  let input;
  try {
    const _raw = readStdinSafe();
    if (!_raw) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    input = JSON.parse(_raw);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const tool = input?.tool || input?.tool_name;
  if (tool !== "Edit") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const inputs = input?.input || input?.tool_input || {};
  const filePath = inputs?.file_path;
  if (!filePath) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  try {
    const state = loadState();
    const now = Date.now();

    // Record this Edit
    state.edits.push({ file: filePath, at: now });

    // Count Edits to this file in last WINDOW_MS
    const recentSameFile = state.edits.filter(
      (e) => e.file === filePath && now - e.at <= WINDOW_MS,
    );

    let message = null;
    // Only suggest once per file per cooldown
    const lastSuggested = state.suggested[filePath] || 0;
    const cooledDown = now - lastSuggested > WINDOW_MS * 5;

    if (recentSameFile.length >= THRESHOLD && cooledDown) {
      state.suggested[filePath] = now;
      message =
        `💡 EDIT BATCHING: ${recentSameFile.length} Edits to ${path.basename(filePath)} ` +
        `in last ${Math.round(WINDOW_MS / 1000)}s. Consider MultiEdit for the next batch ` +
        `(single round-trip vs ${recentSameFile.length} sequential).`;
    }

    saveState(state);

    if (message) {
      console.log(
        JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: message,
          },
        }),
      );
      return;
    }
  } catch {
    // never block
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
