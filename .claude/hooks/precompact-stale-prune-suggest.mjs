#!/usr/bin/env node
// tier: T4
/**
 * precompact-stale-prune-suggest.mjs — PreCompact hook
 *
 * Before /compact runs, surface suggestion to /stale-prune first if there
 * are recorded stale segments that could be dropped. Saves tokens by
 * removing noise BEFORE compaction's lossy summarization.
 *
 * Non-blocking: just informs.
 */

import * as fs from "fs";
import * as path from "path";

const STATE_DIR = "H:/prism/state/conversation-stale-detector";
const SESSION_ID = process.env.CLAUDE_SESSION_ID || "default";
const STATE_FILE = path.join(STATE_DIR, `segments-${SESSION_ID}.json`);

const RECENT_WINDOW = 20;

const FAILED_EXPLORATION_PATTERNS = [
  /no.*matches found/i,
  /not found/i,
  /no.*results/i,
  /\b0 results\b/i,
];

const COMPLETION_PATTERNS = [/\btask completed\b/i, /\bdone\b/i, /\bfinished\b/i, /✓|✅/];

function matches(patterns, text) {
  for (const p of patterns) {
    if (p.test(text)) return true;
  }
  return false;
}

function quickEstimate(state) {
  if (!state.segments || state.segments.length === 0) return { droppable: 0, tokens: 0 };
  let droppable = 0;
  let tokens = 0;
  for (const seg of state.segments) {
    if (
      seg.status === "resolved" ||
      seg.status === "completed" ||
      seg.status === "abandoned" ||
      matches(FAILED_EXPLORATION_PATTERNS, seg.summary || "") ||
      matches(COMPLETION_PATTERNS, seg.summary || "")
    ) {
      droppable += 1;
      tokens += seg.tokens || 0;
    }
  }
  return { droppable, tokens };
}

async function main() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    const { droppable, tokens } = quickEstimate(state);

    if (droppable >= 5 || tokens >= 1000) {
      console.log(
        JSON.stringify({
          continue: true,
          message: `💡 STALE-PRUNE OPPORTUNITY: ${droppable} stale segments (~${tokens} tokens) detected. Run /stale-prune before /compact for cleaner result.`,
        })
      );
      return;
    }
  } catch {
    // ignore
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
