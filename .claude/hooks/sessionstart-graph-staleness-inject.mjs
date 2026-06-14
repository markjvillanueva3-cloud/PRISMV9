#!/usr/bin/env node
// tier: T2
/**
 * sessionstart-graph-staleness-inject.mjs — SessionStart hook (T2 injector)
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-B5 — staleness visibility.
 *
 * Reads the regen artifacts produced by U-GO-B2 / B3 / B4:
 *   - state/shared/system-viz/system-graph.json           (the graph)
 *   - state/shared/system-viz/system-graph-index.json     (the sidecar)
 *   - state/shared/system-viz/.last-successful-regen.json (success sentinel, B2)
 *   - state/shared/system-viz/.last-regen-failure.json    (failure marker, B4)
 *
 * Emits ONE concise SessionStart advisory in priority order:
 *   1. The last regen FAILED (failure marker newer than success sentinel) →
 *      surface the failed stage / exit / stderr tail. The most loud signal.
 *   2. system-graph.json is missing → tell the operator to regen.
 *   3. system-graph.json is older than PRISM_GRAPH_STALENESS_INJECT_HRS
 *      (default 6h — more lenient than B4's 3h spawn-trigger so a fresh
 *      backstop-spawned regen does not re-surface the warning).
 *   4. system-graph-index.json is missing OR built from an older graph than
 *      the current one → master-index search degrades; the on-commit B3 fix
 *      makes this rare but a manual regen-viz invocation that skipped the
 *      sidecar stage would land here.
 *   5. Otherwise silent.
 *
 * Knobs:
 *   PRISM_GRAPH_STALENESS_INJECT_DISABLE=1   — off entirely
 *   PRISM_GRAPH_STALENESS_INJECT_HRS=N       — staleness threshold (default 6)
 *   PRISM_GRAPH_STALENESS_GRAPH_PATH=...     — graph path override (tests)
 *   PRISM_GRAPH_STALENESS_SIDECAR_PATH=...   — sidecar path override
 *   PRISM_GRAPH_STALENESS_SENTINEL_PATH=...  — sentinel path override
 *   PRISM_GRAPH_STALENESS_FAILURE_PATH=...   — failure marker path override
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = "H:/prism";
const SILENCE = { continue: true, suppressOutput: true };
const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_STALE_HRS = 6;
const STDERR_LINE_LIMIT = 120;

function graphPath() {
  return process.env.PRISM_GRAPH_STALENESS_GRAPH_PATH
    || path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
}
function sidecarPath() {
  return process.env.PRISM_GRAPH_STALENESS_SIDECAR_PATH
    || path.join(ROOT, "state", "shared", "system-viz", "system-graph-index.json");
}
function sentinelPath() {
  return process.env.PRISM_GRAPH_STALENESS_SENTINEL_PATH
    || path.join(ROOT, "state", "shared", "system-viz", ".last-successful-regen.json");
}
function failurePath() {
  return process.env.PRISM_GRAPH_STALENESS_FAILURE_PATH
    || path.join(ROOT, "state", "shared", "system-viz", ".last-regen-failure.json");
}
function resolveStaleHrs() {
  const v = Number(process.env.PRISM_GRAPH_STALENESS_INJECT_HRS);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_STALE_HRS;
}

function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }
function safeReadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
}

/**
 * Pure decision — given the regen artifacts' state, return one advisory or
 * null. Fully deterministic for tests; no I/O.
 *
 * @param {object} a
 * @param {number|null} a.graphMtimeMs
 * @param {number|null} a.sidecarMtimeMs
 * @param {number|null} a.sentinelTs       (ms; null if no sentinel)
 * @param {number|null} a.failureTs        (ms; null if no failure marker)
 * @param {object|null} a.failure          parsed failure marker (stage, exitCode, signal, stderrTail)
 * @param {number} a.nowMs
 * @param {number} a.staleHrs              graph-stale threshold in HOURS
 * @returns {{advisory: string|null, reason: string}}
 */
export function decideStalenessAdvisory({
  graphMtimeMs, sidecarMtimeMs, sentinelTs, failureTs, failure, nowMs, staleHrs,
}) {
  // P1: a failure newer than the last success — surface it loudly.
  if (
    failure && failureTs != null && Number.isFinite(failureTs)
    && (sentinelTs == null || !Number.isFinite(sentinelTs) || failureTs > sentinelTs)
  ) {
    const ageHrs = ((nowMs - failureTs) / HOUR_MS).toFixed(1);
    const stage = (typeof failure.stage === "string" && failure.stage) || "unknown stage";
    const exit = failure.exitCode != null
      ? `exit ${failure.exitCode}`
      : `signal ${failure.signal || "?"}`;
    const lastSuccess = (sentinelTs != null && Number.isFinite(sentinelTs))
      ? `${((nowMs - sentinelTs) / HOUR_MS).toFixed(1)}h ago`
      : "never (no sentinel)";
    const tail = String(failure.stderrTail || "").split("\n").filter(Boolean).pop() || "";
    const lines = [
      `## ⚠ system-viz regen FAILED (master-index search may be degraded)`,
      `Last run failed at \`${stage}\` (${exit}) ${ageHrs}h ago. Last success: ${lastSuccess}.`,
    ];
    if (tail) lines.push(`Stderr: \`${tail.slice(0, STDERR_LINE_LIMIT)}\``);
    lines.push(`Backstop retries on the next Stop. Disable: \`PRISM_GRAPH_STALENESS_INJECT_DISABLE=1\``);
    return { advisory: lines.join("\n"), reason: "failure" };
  }

  // P2: graph missing.
  if (graphMtimeMs == null || !Number.isFinite(graphMtimeMs)) {
    return {
      advisory: [
        `## ⚠ system-viz graph missing`,
        `\`state/shared/system-viz/system-graph.json\` is absent — master-index search returns no hits.`,
        `Run: \`node scripts/system-viz-on-commit.mjs\``,
      ].join("\n"),
      reason: "graph-missing",
    };
  }

  // P3: graph stale beyond the threshold. Strict `>` is intentional — a graph
  // aged EXACTLY to the threshold is still "fresh" (boundary equality = fresh),
  // mirroring decideBackstop in the B4 hook. Test L103-113 pins this contract.
  const graphAgeMs = nowMs - graphMtimeMs;
  if (graphAgeMs > staleHrs * HOUR_MS) {
    return {
      advisory: [
        `## ⚠ system-viz graph stale (${(graphAgeMs / HOUR_MS).toFixed(1)}h old)`,
        `Master-index search may be degraded. The U-GO-B4 backstop fires on the next Stop.`,
        `Disable: \`PRISM_GRAPH_STALENESS_INJECT_DISABLE=1\``,
      ].join("\n"),
      reason: "graph-stale",
    };
  }

  // P4: sidecar missing or older than the graph (loadGraph's staleness gate
  // would reject it → search falls back to architecture-graph or legacy parse).
  if (sidecarMtimeMs == null || !Number.isFinite(sidecarMtimeMs)) {
    return {
      advisory: [
        `## ⚠ master-index sidecar missing`,
        `\`state/shared/system-viz/system-graph-index.json\` is absent — search degrades to the architecture-graph fallback.`,
        `Run: \`node scripts/build-graph-index.mjs\``,
      ].join("\n"),
      reason: "sidecar-missing",
    };
  }
  if (sidecarMtimeMs < graphMtimeMs) {
    const lagHrs = ((graphMtimeMs - sidecarMtimeMs) / HOUR_MS).toFixed(1);
    return {
      advisory: [
        `## ⚠ master-index sidecar stale (${lagHrs}h behind graph)`,
        `\`loadGraph\` rejects a stale sidecar → search degrades to the architecture-graph fallback.`,
        `Run: \`node scripts/build-graph-index.mjs\` (or commit anything — the post-commit chain rebuilds it).`,
      ].join("\n"),
      reason: "sidecar-stale",
    };
  }

  return { advisory: null, reason: "fresh" };
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}
function emit(o) { process.stdout.write(JSON.stringify(o)); }

function main() {
  if (process.env.PRISM_GRAPH_STALENESS_INJECT_DISABLE === "1") { emit(SILENCE); return; }
  readStdin();
  const nowMs = Date.now();
  const gStat = safeStat(graphPath());
  const sStat = safeStat(sidecarPath());
  const sentinel = safeReadJson(sentinelPath());
  const failure = safeReadJson(failurePath());
  const d = decideStalenessAdvisory({
    graphMtimeMs: gStat ? gStat.mtimeMs : null,
    sidecarMtimeMs: sStat ? sStat.mtimeMs : null,
    sentinelTs: sentinel && sentinel.ts ? Date.parse(sentinel.ts) : null,
    failureTs: failure && failure.ts ? Date.parse(failure.ts) : null,
    failure,
    nowMs,
    staleHrs: resolveStaleHrs(),
  });
  if (!d.advisory) { emit(SILENCE); return; }
  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: d.advisory,
    },
  });
}

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invoked && import.meta.url === invoked) {
  try { main(); } catch { emit(SILENCE); }
}
