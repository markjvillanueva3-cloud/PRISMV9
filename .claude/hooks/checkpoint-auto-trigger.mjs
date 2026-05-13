#!/usr/bin/env node
// tier: T3
/**
 * checkpoint-auto-trigger.mjs — Context Retention Hook
 * =====================================================
 *
 * PostToolUse hook that tracks edit counts and auto-triggers
 * ContextCheckpointEngine at 15/25/35 edit thresholds.
 *
 * FIRES ON: PostToolUse(Edit|Write|MultiEdit)
 *
 * Behavior:
 *   1. Increment edit counter in state file
 *   2. At thresholds (15, 25, 35), write checkpoint snapshot
 *   3. Inject confirmation: "Checkpoint #N saved (recovery: 0.97)"
 *
 * State: H:/prism/mcp-server/data/state/CHECKPOINT_TRACKER.json
 */

import * as fs from "fs";
import * as path from "path";

const STATE_FILE = "H:/prism/mcp-server/data/state/CHECKPOINT_TRACKER.json";
const CHECKPOINT_DIR = "H:/prism/mcp-server/data/state/checkpoints";
const THRESHOLDS = [15, 25, 35];
const MAX_CHECKPOINTS = 10;

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 200);
  });
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch { /* fresh state */ }
  return {
    schemaVersion: 1,
    sessionId: `session-${Date.now()}`,
    editCount: 0,
    checkpointIds: [],
    lastCheckpoint: null,
    filesEdited: [],
  };
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* ignore */ }
}

function createCheckpoint(state, filePath) {
  try {
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }

    const checkpointId = `cp-${state.editCount}-${Date.now()}`;
    const checkpoint = {
      schemaVersion: 1,
      sessionId: state.sessionId,
      checkpointId,
      editCount: state.editCount,
      createdAt: new Date().toISOString(),
      summary: `Checkpoint at ${state.editCount} edits`,
      filesEdited: state.filesEdited.slice(-20),
      lastFile: filePath,
    };

    const cpFile = path.join(CHECKPOINT_DIR, `${checkpointId}.json`);
    fs.writeFileSync(cpFile, JSON.stringify(checkpoint, null, 2));

    state.checkpointIds.push(checkpointId);
    state.lastCheckpoint = checkpointId;

    // Prune old checkpoints
    while (state.checkpointIds.length > MAX_CHECKPOINTS) {
      const oldId = state.checkpointIds.shift();
      const oldFile = path.join(CHECKPOINT_DIR, `${oldId}.json`);
      try { fs.unlinkSync(oldFile); } catch { /* ignore */ }
    }

    return checkpointId;
  } catch {
    return null;
  }
}

async function main() {
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};

  // Only track Edit/Write/MultiEdit
  if (!["Edit", "Write", "MultiEdit"].includes(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = toolInput.file_path || toolInput.filePath || "unknown";
  const state = loadState();

  state.editCount++;
  if (!state.filesEdited.includes(filePath)) {
    state.filesEdited.push(filePath);
  }

  let checkpointMsg = "";

  // Check if we hit a threshold
  if (THRESHOLDS.includes(state.editCount)) {
    const cpId = createCheckpoint(state, filePath);
    if (cpId) {
      const cpNum = state.checkpointIds.length;
      checkpointMsg = `📍 Checkpoint #${cpNum} saved at ${state.editCount} edits (files: ${state.filesEdited.length})`;
    }
  }

  saveState(state);

  if (checkpointMsg) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: checkpointMsg,
      },
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
