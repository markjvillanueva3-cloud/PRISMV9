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

export function queueDepth(queuePath = QUEUE_PATH) {
  if (!fs.existsSync(queuePath)) return 0;
  try {
    const raw = fs.readFileSync(queuePath, "utf-8");
    return raw.split("\n").filter((l) => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}

export function pickDrainer(candidates = DRAINER_CANDIDATES) {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Decide + act: return the Stop payload. Spawns the drainer DETACHED only when the
 * queue is non-empty AND a drainer exists; never throws (Stop must never block).
 * Deps (queuePath/candidates/spawnImpl) are injected so the decision path is
 * unit-testable without a real spawn or real queue file.
 */
export function run({ queuePath = QUEUE_PATH, candidates = DRAINER_CANDIDATES, spawnImpl = spawn } = {}) {
  const depth = queueDepth(queuePath);
  if (depth === 0) return { continue: true };
  const drainer = pickDrainer(candidates);
  if (!drainer) return { continue: true, systemMessage: `consensus-drain: queue=${depth} but drainer not found` };
  try {
    const child = spawnImpl("H:/.claude/bin/portable-node", [drainer, "--max=1"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child?.unref?.();
  } catch {
    /* never block Stop on spawn failure */
  }
  return { continue: true, systemMessage: `consensus-drain: queue=${depth}, drainer spawned (--max=1)` };
}

// Run only as a direct hook invocation, never on import. The prior top-level execution
// ran the drain logic AND process.exit'd on import -- making the hook untestable; this
// isDirect guard makes it import-safe while preserving the CLI behavior exactly.
const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("stop-consensus-drain.mjs");
if (isDirect) {
  emit(run());
}
