#!/usr/bin/env node
// tier: T4
/**
 * stop-consensus-drain.mjs — Stop hook that triggers async consensus queue drain.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTOFIRE.
 *
 * The auto-consensus hooks (UserPromptSubmit + PreToolUse-critical) enqueue
 * pending consensus tasks instead of running them inline (consensus is 30-60s,
 * far too slow for any critical-path hook). This Stop hook drains the queue at
 * the natural idle moment — when the agent finishes responding.
 *
 * Behavior:
 *   - Read queue depth; if empty, return continue:true (zero overhead).
 *   - If non-empty, spawn the real drainer DETACHED with --max=1 and return
 *     continue:true immediately. The drainer runs out-of-band and never blocks
 *     Stop. Multiple Stop events naturally rate-limit drains to one per turn.
 *
 * Always exits 0 with continue:true so it never blocks Stop.
 */

import * as fs from "node:fs";
import { spawn } from "node:child_process";

const QUEUE_PATH = process.env.PRISM_CONSENSUS_QUEUE ?? "H:/prism/state/shared/consensus-queue.jsonl";
const DRAINER_CANDIDATES = [
  "H:/prism-iooms0/.claude/scripts/consensus-queue-drain.mjs",
  "H:/prism/.claude/scripts/consensus-queue-drain.mjs",
];

function emit(payload) {
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(0);
}

function queueDepth() {
  if (!fs.existsSync(QUEUE_PATH)) return 0;
  try {
    const raw = fs.readFileSync(QUEUE_PATH, "utf-8");
    return raw.split("\n").filter((l) => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}

function pickDrainer() {
  for (const p of DRAINER_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const depth = queueDepth();
if (depth === 0) {
  emit({ continue: true });
}

const drainer = pickDrainer();
if (!drainer) {
  emit({ continue: true, systemMessage: `consensus-drain: queue=${depth} but drainer not found` });
}

try {
  const child = spawn("H:/.claude/bin/portable-node", [drainer, "--max=1"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
} catch {
  /* never block Stop on spawn failure */
}

emit({ continue: true, systemMessage: `consensus-drain: queue=${depth}, drainer spawned (--max=1)` });
