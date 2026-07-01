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
// PRIMARY FIX (R12 fail-loud): the detached drainer ran with stdio:"ignore", so EVERY failure was
// silently discarded -> a multi-day drain stall went UNDIAGNOSABLE twice (06-17, and again 06-21
// found 06-23). The drain works when run by hand (proven both heaps), so the stall is a transient
// failure INSIDE the detached child (loadConsensusEngine()->null "MCP not built" early-returns
// BEFORE recording; or an Ollama hiccup) that left no trace. -> tee the child's stdout+stderr to an
// append LOG so the next failure is diagnosable in seconds, not days. (Detection is already covered:
// reconcile-zulu-ledger's octopus meta-probe flags drain age >48h.)
// SECONDARY (precautionary, Blackwell doctrine "never fight a low default"): portable-node's default
// old-space heap is only ~432MB; the consensus engine transitively loads master-index-search-lib
// (823MB graph, survives only via that lib's file-size fallback). A generous heap removes the OOM edge.
const DRAIN_HEAP_MB = Number(process.env.PRISM_CONSENSUS_DRAIN_HEAP_MB) || 4096;
const DRAIN_LOG_PATH = process.env.PRISM_CONSENSUS_DRAIN_LOG ?? "H:/prism/state/shared/consensus-drain.log";

// THE root-cause fix (silent-autofire bug): spawn the REAL node binary, NEVER the extensionless
// "H:/.claude/bin/portable-node" shim. On Windows, cp.spawn (no shell) cannot CreateProcess a file
// with no .exe/.cmd extension -> ENOENT, and that error fires ASYNCHRONOUSLY (an 'error' event), so
// the synchronous try/catch around spawn() below NEVER catches it. The hook then returned
// "drainer spawned" while NOTHING actually ran -> the autofire drain was dead for days at a time
// (recurring 06-17/06-19/06-21; every recorded drain was a MANUAL shell-resolved run during an
// investigation, never the hook). The 06-19 "fix" re-wired the hook but only verified it RETURNS
// "spawned", never that a processed record appeared. process.execPath is the node already executing
// this hook -- always a real, spawnable .exe, and the same H:/Tools/nodejs/node.exe that
// portable-node.cmd resolves to.
export function resolveNodeBin(execPath = process.execPath, existsImpl = fs.existsSync) {
  // BASENAME anchor (`(^|[\\/])`): accept only a path whose final segment is `node` / `node.exe`.
  // A bare `/node(\.exe)?$/` FALSE-matches `portable-node` (it ends in "node") -> would return the
  // very shim this fix exists to reject (scrutiny P1, both arms). The anchor requires `node` to be
  // preceded by a slash or string-start, so `portable-node` (preceded by "-") is correctly rejected.
  if (execPath && /(^|[\\/])node(\.exe)?$/i.test(execPath) && existsImpl(execPath)) return execPath;
  for (const p of ["H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe"]) {
    if (existsImpl(p)) return p;
  }
  return execPath; // last resort -- still a real binary, just not the preferred install path
}
const NODE_BIN = resolveNodeBin();

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
export function run({
  queuePath = QUEUE_PATH,
  candidates = DRAINER_CANDIDATES,
  spawnImpl = spawn,
  logPath = DRAIN_LOG_PATH,
  heapMb = DRAIN_HEAP_MB,
  nodeBin = NODE_BIN,
  fsImpl = fs,
} = {}) {
  const depth = queueDepth(queuePath);
  if (depth === 0) return { continue: true };
  const drainer = pickDrainer(candidates);
  if (!drainer) return { continue: true, systemMessage: `consensus-drain: queue=${depth} but drainer not found` };
  // Tee the detached child's stdout+stderr to an append log (R12: no more silent failures). If the
  // log can't be opened, fall back to "ignore" -- a logging problem must NEVER block Stop.
  let stdio = "ignore";
  let logFd = null;
  try {
    logFd = fsImpl.openSync(logPath, "a");
    stdio = ["ignore", logFd, logFd];
  } catch {
    /* log open failed -> silent drain, but still spawn (Stop must never block) */
  }
  try {
    const child = spawnImpl(nodeBin, [`--max-old-space-size=${heapMb}`, drainer, "--max=1"], {
      detached: true,
      stdio,
      windowsHide: true,
    });
    child?.unref?.();
  } catch {
    /* never block Stop on spawn failure */
  } finally {
    // Close the PARENT's fd after spawn; the child keeps its own dup'd copy and goes on writing.
    if (logFd !== null) {
      try { fsImpl.closeSync(logFd); } catch { /* best-effort */ }
    }
  }
  const logged = logFd !== null ? `log=${logPath}` : "log=unavailable";
  return { continue: true, systemMessage: `consensus-drain: queue=${depth}, drainer spawned (--max=1, heap=${heapMb}MB, ${logged})` };
}

// Run only as a direct hook invocation, never on import. The prior top-level execution
// ran the drain logic AND process.exit'd on import -- making the hook untestable; this
// isDirect guard makes it import-safe while preserving the CLI behavior exactly.
const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("stop-consensus-drain.mjs");
if (isDirect) {
  emit(run());
}
