#!/usr/bin/env node
// tier: T3
/**
 * session-reorient-capture.mjs — PostToolUse companion to session-reorient-inject.mjs
 *
 * The reorientation hook (session-reorient-inject.mjs) reads state but does
 * not populate it. This hook captures anchors after significant tool events
 * so the reorientation brief has content to inject.
 *
 * Anchor types:
 *   - task_anchor:     captured from user directives (UserPromptSubmit)
 *   - decision:        file creation / major edit / dependency change
 *   - milestone:       commit / release / task completion
 *   - error_resolved:  successful build / test after prior failure
 *
 * Writes to: H:/prism/state/session-reorientation/reorientation-{SESSION_ID}.json
 *
 * Non-blocking: always exits {continue: true}.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const STATE_DIR = "H:/prism/state/session-reorientation";
const SESSION_ID = process.env.CLAUDE_SESSION_ID || "default";
const STATE_FILE = path.join(STATE_DIR, `reorientation-${SESSION_ID}.json`);
const MAX_ANCHORS = 500;

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch { /* ignore */ }
  return {
    sessionId: SESSION_ID,
    createdAt: new Date().toISOString(),
    anchors: [],
    stats: {
      promptsSeen: 0,
      toolCallsSeen: 0,
      anchorsRecorded: 0,
      briefsGenerated: 0,
      lastBriefAt: null,
      promptsSinceLastBrief: 0,
      toolCallsSinceLastBrief: 0,
    },
    briefHistory: [],
  };
}

function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* ignore */ }
}

function classify(toolName, toolInput, toolResult) {
  if (!toolName) return null;

  const filePath = toolInput?.file_path || toolInput?.notebook_path || "";
  const command = toolInput?.command || "";
  const resultText = typeof toolResult === "string"
    ? toolResult
    : JSON.stringify(toolResult || "");

  // Engine / dispatcher / schema / hook creation → decision anchor
  if (toolName === "Write") {
    if (/Engine\.ts$/.test(filePath)) {
      return {
        type: "decision",
        summary: `Created engine: ${path.basename(filePath)}`,
        rationale: "Engine file creation indicates architectural choice",
        files: [filePath],
        tags: ["engine", "creation"],
      };
    }
    if (/Dispatcher\.ts$/.test(filePath)) {
      return {
        type: "decision",
        summary: `Wired dispatcher: ${path.basename(filePath)}`,
        rationale: "Dispatcher change affects MCP action surface",
        files: [filePath],
        tags: ["dispatcher", "wiring"],
      };
    }
    if (/schemas?\/.+\.ts$/.test(filePath.replace(/\\/g, "/"))) {
      return {
        type: "decision",
        summary: `Schema: ${path.basename(filePath)}`,
        files: [filePath],
        tags: ["schema"],
      };
    }
    if (/\.test\.ts$/.test(filePath)) {
      return {
        type: "milestone",
        summary: `Wrote tests: ${path.basename(filePath)}`,
        files: [filePath],
        tags: ["test"],
      };
    }
    if (/\.claude.*\.mjs$/.test(filePath.replace(/\\/g, "/"))) {
      return {
        type: "decision",
        summary: `Created hook: ${path.basename(filePath)}`,
        files: [filePath],
        tags: ["hook"],
      };
    }
  }

  if (toolName === "Edit" || toolName === "MultiEdit") {
    if (/Engine\.ts$|Dispatcher\.ts$|schemas?\/|\.test\.ts$/.test(filePath.replace(/\\/g, "/"))) {
      return {
        type: "decision",
        summary: `Edited ${path.basename(filePath)}`,
        files: [filePath],
        tags: ["edit"],
      };
    }
  }

  if (toolName === "Bash") {
    if (/git commit/.test(command)) {
      // Capture the commit message hint if present
      const match = command.match(/-m\s+["']([^"']{1,120})/);
      return {
        type: "milestone",
        summary: match ? `Commit: ${match[1]}` : "Git commit",
        tags: ["commit", "milestone"],
      };
    }
    if (/npm\s+(run\s+)?(build|test)|vitest|tsc/.test(command)) {
      // Only record successful builds/tests as error_resolved anchors
      const looksSuccess =
        /PASS|passed|0 failing|✓|passed \(/.test(resultText) &&
        !/FAIL|failed|error TS/.test(resultText);
      if (looksSuccess) {
        return {
          type: "error_resolved",
          summary: `Build/test passed: ${command.slice(0, 60)}`,
          tags: ["build-green"],
        };
      }
    }
  }

  return null;
}

async function main() {
  let input;
  try {
    // Read from stdin fd=0 — portable across Windows/Linux unlike /dev/stdin
    input = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const state = loadState();
  state.stats.toolCallsSeen += 1;
  state.stats.toolCallsSinceLastBrief += 1;

  const anchor = classify(input.tool_name, input.tool_input, input.tool_result);
  if (anchor) {
    const now = new Date().toISOString();
    state.anchors.push({
      ...anchor,
      createdAt: now,
      active: true,
      toolName: input.tool_name,
    });
    state.stats.anchorsRecorded = (state.stats.anchorsRecorded || 0) + 1;
    if (state.anchors.length > MAX_ANCHORS) {
      // Drop oldest non-milestone anchors first
      const milestones = state.anchors.filter((a) => a.type === "milestone");
      const rest = state.anchors.filter((a) => a.type !== "milestone").slice(-MAX_ANCHORS + milestones.length);
      state.anchors = [...milestones, ...rest].slice(-MAX_ANCHORS);
    }
  }

  saveState(state);
  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
