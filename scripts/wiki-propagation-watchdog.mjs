#!/usr/bin/env node
/**
 * wiki-propagation-watchdog.mjs
 *
 * Detects stagnation in the 4-stage wiki propagation pipeline:
 *   1. WRITE (file on disk)
 *   2. SYSTEM-VIZ (system-graph.json fresh)
 *   3. WIKI INDEXES (_leaf-index.jsonl + _embeddings.jsonl fresh)
 *   4. OBSIDIAN VAULT (stop-obsidian-memory-feed.mjs fired)
 *
 * Surfaces stale-stage findings to:
 *   - stdout (human + --json)
 *   - state/shared/wiki-propagation-watchdog.jsonl (telemetry)
 *   - AGENT_CHAT.jsonl (advisory on critical staleness)
 *
 * Designed to run as:
 *   - One-shot: `node scripts/wiki-propagation-watchdog.mjs`
 *   - Cron: bind to /loop or Windows scheduled task on hourly cadence
 *   - Stop hook: detect post-commit staleness
 *
 * Per the 2026-05-18 user directive ("make sure everything you're building is
 * automated or it will sit stagnant") this is the missing layer that catches
 * the 19h-stale _leaf-index.jsonl class.
 *
 * Exits:
 *   0 — all stages fresh
 *   1 — one stage stale (warn)
 *   2 — two+ stages stale (critical; advisory emitted to AGENT_CHAT)
 *   3 — measurement failure (R12 fail-loud)
 */

import fs from "node:fs";
import path from "node:path";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const STATE_DIR = path.join(PRISM_ROOT, "state", "shared");

// Thresholds (knobs)
const SYSTEM_VIZ_STALE_HRS = Number(process.env.PRISM_WIKI_WATCHDOG_VIZ_STALE_HRS) || 4;
const LEAF_INDEX_STALE_HRS = Number(process.env.PRISM_WIKI_WATCHDOG_LEAF_STALE_HRS) || 24;
const EMBEDDINGS_STALE_HRS = Number(process.env.PRISM_WIKI_WATCHDOG_EMBED_STALE_HRS) || 48;
const OBSIDIAN_STALE_HRS = Number(process.env.PRISM_WIKI_WATCHDOG_OBSIDIAN_STALE_HRS) || 24;
const ADVISORY_COOLDOWN_SEC = Number(process.env.PRISM_WIKI_WATCHDOG_ADVISORY_COOLDOWN_SEC) || 3600;

const TELEMETRY = path.join(STATE_DIR, "wiki-propagation-watchdog.jsonl");
const AGENT_CHAT = path.join(STATE_DIR, "AGENT_CHAT.jsonl");
const ADVISORY_STAMP = path.join(STATE_DIR, ".wiki-watchdog-advisory-stamp");

const HOURS = 3600 * 1000;

// Pure: classify a path's freshness given its mtime and threshold
export function classifyStaleness(mtimeMs, thresholdHrs, now = Date.now()) {
  if (mtimeMs == null || !Number.isFinite(mtimeMs)) {
    return { stale: true, reason: "missing-or-unreadable", ageHrs: null };
  }
  const ageMs = now - mtimeMs;
  const ageHrs = ageMs / HOURS;
  return {
    stale: ageHrs > thresholdHrs,
    reason: ageHrs > thresholdHrs ? `${ageHrs.toFixed(1)}h > ${thresholdHrs}h` : "fresh",
    ageHrs,
  };
}

// Pure: read a file's mtime, return null on any error
function readMtime(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

// Stage 2 check: system-viz freshness via system-graph.json meta.generatedAt
function checkSystemViz() {
  const graphPath = path.join(PRISM_ROOT, "state", "shared", "system-viz", "system-graph.json");
  // Use file mtime as the proxy (parsing 370MB JSON for meta.generatedAt would be wasteful)
  const mtime = readMtime(graphPath);
  return {
    stage: "system-viz",
    path: graphPath,
    mtime,
    ...classifyStaleness(mtime, SYSTEM_VIZ_STALE_HRS),
  };
}

// Stage 3a check: _leaf-index.jsonl freshness
function checkLeafIndex() {
  const p = path.join(PRISM_ROOT, "knowledge", "wiki", "architecture", "_leaf-index.jsonl");
  const mtime = readMtime(p);
  return {
    stage: "leaf-index",
    path: p,
    mtime,
    ...classifyStaleness(mtime, LEAF_INDEX_STALE_HRS),
  };
}

// Stage 3b check: _embeddings.jsonl freshness (Ollama-dependent, longer threshold)
function checkEmbeddings() {
  const p = path.join(PRISM_ROOT, "knowledge", "wiki", "architecture", "_embeddings.jsonl");
  const mtime = readMtime(p);
  return {
    stage: "embeddings",
    path: p,
    mtime,
    ...classifyStaleness(mtime, EMBEDDINGS_STALE_HRS),
  };
}

// Stage 4 check: Obsidian feed stamp
function checkObsidianFeed() {
  // The stop-obsidian-memory-feed.mjs hook writes a CANONICAL stamp at the
  // first candidate (verified 2026-05-18 iter12 — this is the actual path the
  // hook uses, not the previously-guessed state/shared/ paths). The legacy
  // state/shared/ candidates are kept for forward-compat in case the hook ever
  // moves (a watchdog that probes the wrong path silently false-CRITICALs every
  // run — the writer-without-reader bug iter11+iter12 closed).
  const candidates = [
    path.join(PRISM_ROOT, ".claude", "cache", "obsidian-memory-feed-last.json"),
    path.join(STATE_DIR, ".obsidian-feed-stamp"),
    path.join(STATE_DIR, ".obsidian-memory-feed-stamp"),
    path.join(STATE_DIR, "obsidian-feed-history.jsonl"),
  ];
  for (const c of candidates) {
    const mt = readMtime(c);
    if (mt != null) {
      return {
        stage: "obsidian-feed",
        path: c,
        mtime: mt,
        ...classifyStaleness(mt, OBSIDIAN_STALE_HRS),
      };
    }
  }
  return {
    stage: "obsidian-feed",
    path: candidates[0],
    mtime: null,
    stale: true,
    reason: "no-stamp-file-found (hook may never have fired)",
    ageHrs: null,
  };
}

// Pure: aggregate per-stage results into overall status
export function aggregateStatus(stages) {
  const staleCount = stages.filter((s) => s.stale).length;
  if (staleCount === 0) return { status: "clean", exitCode: 0, staleCount: 0 };
  if (staleCount === 1) return { status: "warn", exitCode: 1, staleCount: 1 };
  return { status: "critical", exitCode: 2, staleCount };
}

// Side-effect: append telemetry record
function writeTelemetry(record) {
  try {
    fs.mkdirSync(path.dirname(TELEMETRY), { recursive: true });
    fs.appendFileSync(TELEMETRY, JSON.stringify(record) + "\n", "utf8");
  } catch (e) {
    process.stderr.write(`[wiki-watchdog] telemetry append failed: ${e.message}\n`);
  }
}

// Side-effect: emit chat-bus advisory if cooldown elapsed AND status critical
function maybeEmitAdvisory(status, stages) {
  if (status.status !== "critical") return { emitted: false, reason: "not-critical" };

  const stampMtime = readMtime(ADVISORY_STAMP);
  const now = Date.now();
  if (stampMtime != null && (now - stampMtime) < ADVISORY_COOLDOWN_SEC * 1000) {
    return { emitted: false, reason: "cooldown-active" };
  }

  const staleStages = stages.filter((s) => s.stale).map((s) => `${s.stage}:${s.reason}`).join(", ");
  const advisory = {
    ts: new Date().toISOString(),
    source: "wiki-propagation-watchdog",
    severity: "warn",
    message: `Wiki propagation stale: ${staleStages}. Run regen-wiki-from-viz.mjs OR check post-commit hook.`,
  };

  try {
    fs.appendFileSync(AGENT_CHAT, JSON.stringify(advisory) + "\n", "utf8");
    fs.writeFileSync(ADVISORY_STAMP, new Date().toISOString(), "utf8");
    return { emitted: true, reason: "advisory-sent" };
  } catch (e) {
    process.stderr.write(`[wiki-watchdog] advisory emit failed: ${e.message}\n`);
    return { emitted: false, reason: `error: ${e.message}` };
  }
}

function main() {
  const asJson = process.argv.includes("--json");
  const dryRun = process.argv.includes("--dry-run");

  let stages;
  try {
    stages = [
      checkSystemViz(),
      checkLeafIndex(),
      checkEmbeddings(),
      checkObsidianFeed(),
    ];
  } catch (e) {
    if (asJson) {
      process.stdout.write(JSON.stringify({ ok: false, error: e.message, phase: "measurement" }));
    } else {
      process.stderr.write(`measurement failure: ${e.message}\n`);
    }
    process.exit(3);
  }

  const status = aggregateStatus(stages);
  const advisory = dryRun ? { emitted: false, reason: "dry-run" } : maybeEmitAdvisory(status, stages);

  const record = {
    ts: new Date().toISOString(),
    pid: process.pid,
    host: process.env.COMPUTERNAME || "unknown",
    status: status.status,
    staleCount: status.staleCount,
    stages,
    advisory,
  };

  if (!dryRun) writeTelemetry(record);

  if (asJson) {
    process.stdout.write(JSON.stringify(record));
  } else {
    process.stdout.write(`wiki-propagation-watchdog — status: ${status.status.toUpperCase()}\n`);
    for (const s of stages) {
      const marker = s.stale ? "STALE" : "fresh";
      const age = s.ageHrs == null ? "?" : `${s.ageHrs.toFixed(1)}h`;
      process.stdout.write(`  [${marker}] ${s.stage.padEnd(15)} age=${age.padStart(7)}  ${s.reason}\n`);
    }
    if (advisory.emitted) process.stdout.write(`\nAdvisory emitted to AGENT_CHAT.\n`);
    if (status.status !== "clean") {
      process.stdout.write(`\nTo refresh:\n`);
      process.stdout.write(`  node scripts/regen-wiki-from-viz.mjs       # 21-stage, ~8 min\n`);
      process.stdout.write(`  node scripts/build-wiki-embeddings.mjs      # Ollama-dependent\n`);
      process.stdout.write(`  node scripts/system-viz-on-commit.mjs       # system-viz refresh\n`);
    }
  }

  process.exit(status.exitCode);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}
