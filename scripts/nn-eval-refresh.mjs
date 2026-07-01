#!/usr/bin/env node
// scripts/nn-eval-refresh.mjs
//
// U-NN-EVAL-REFRESH — surface the most recent NN-GRAPH retrain candidate's
// metrics into state/shared/nn-graph/latest-candidate.json so the SessionStart
// PSN-LEG-STATE banner reads CURRENT data instead of the stale NN-EVAL.json
// frozen at the 2026-05-16 8-dim checkpoint (AUROC 0.0961). Live retrains
// since 2026-05-22 land at 768-dim with substantially better metrics; that
// progress is invisible to the fleet until this sidecar exists.
//
// Closes audit-2026-05-26 finding #10 (P1): NN-EVAL.json frozen at AUROC
// 0.0961 despite live 768d retrains being measured.
//
// Pure-script + library exports for testability. No side-effects on import.
// On every run: scans state/shared/nn-graph/retrain-lifecycle.jsonl, finds
// the most recent entry with trained:true + assessment, emits the canonical
// {ts, assessment, promote, promoted, drift, fingerprint} envelope to
// latest-candidate.json. If no trained entry found, emits a degraded marker
// so the SessionStart banner shows "ungraded — last run skipped" instead of
// stale 0.0961.
//
// CLI: node scripts/nn-eval-refresh.mjs
//      node scripts/nn-eval-refresh.mjs --json     (stdout JSON, no file write)
//      node scripts/nn-eval-refresh.mjs --dry-run  (compute, don't write)

import fs from "node:fs";
import path from "node:path";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const DEFAULT_LIFECYCLE = path.join(PRISM_ROOT, "state/shared/nn-graph/retrain-lifecycle.jsonl");
const DEFAULT_OUTPUT = path.join(PRISM_ROOT, "state/shared/nn-graph/latest-candidate.json");
const SCHEMA_VERSION = 1;

function getLifecyclePath() {
  return process.env.PRISM_NN_LIFECYCLE_PATH || DEFAULT_LIFECYCLE;
}
function getOutputPath() {
  return process.env.PRISM_NN_LATEST_OUTPUT || DEFAULT_OUTPUT;
}

/**
 * Stream-read the JSONL lifecycle ledger. Returns array of parsed objects.
 * Corrupt lines silently skipped (ledger is best-effort).
 */
export function readLifecycle(lifecyclePath) {
  if (!fs.existsSync(lifecyclePath)) return [];
  const raw = fs.readFileSync(lifecyclePath, "utf8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}

/**
 * Find the most recent entry where trained === true. These carry assessment
 * + promote info. Returns null if none found (system has been "skip" only).
 */
export function findLatestTrained(entries) {
  if (!Array.isArray(entries)) return null;
  // Iterate in reverse — most recent first.
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e && e.trained === true) return e;
  }
  return null;
}

/**
 * Find the most recent entry of ANY kind (action:"retrain" OR "skip"). Used
 * for the degraded-marker fallback when no trained entry exists.
 */
export function findLatestAny(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries[entries.length - 1];
}

/**
 * Build the latest-candidate.json envelope from a trained entry.
 */
export function buildLatestCandidate(trainedEntry) {
  return {
    schemaVersion: SCHEMA_VERSION,
    refreshedAt: new Date().toISOString(),
    source: "retrain-lifecycle.jsonl",
    ts: trainedEntry.ts,
    action: trainedEntry.action,
    ok: trainedEntry.ok,
    trained: trainedEntry.trained,
    trainExitCode: trainedEntry.trainExitCode ?? null,
    assessment: trainedEntry.assessment ?? null,
    promote: trainedEntry.promote ?? null,
    promoted: trainedEntry.promoted ?? false,
    drift: trainedEntry.drift ?? null,
    fingerprint: trainedEntry.fingerprint ?? null,
    errors: trainedEntry.errors ?? [],
    note: "Latest candidate from retrain-lifecycle.jsonl. SessionStart PSN-LEG-STATE banner should prefer this over the stale NN-EVAL.json checkpoint when present + trained:true.",
  };
}

/**
 * Build the degraded-marker envelope when no trained entry exists. The
 * SessionStart banner can render this as "ungraded — last action: skip
 * (no significant drift)" instead of pretending NN-EVAL.json is current.
 */
export function buildDegradedMarker(latestAny) {
  return {
    schemaVersion: SCHEMA_VERSION,
    refreshedAt: new Date().toISOString(),
    source: "retrain-lifecycle.jsonl",
    degraded: true,
    reason: latestAny ? "no-trained-entry-in-lifecycle" : "empty-lifecycle-ledger",
    lastEntry: latestAny
      ? {
          ts: latestAny.ts,
          action: latestAny.action,
          drift: latestAny.drift ?? null,
          trained: latestAny.trained ?? false,
        }
      : null,
    note: "No trained:true entry found in retrain-lifecycle.jsonl. The system has only run drift-skipped passes; no fresh AUROC measurement is available. SessionStart should show 'ungraded' not the stale NN-EVAL.json checkpoint.",
  };
}

/**
 * Top-level refresh: read ledger → pick latest trained → build envelope OR
 * degraded-marker.
 */
export function refresh(lifecyclePath) {
  const entries = readLifecycle(lifecyclePath);
  const trained = findLatestTrained(entries);
  if (trained) return buildLatestCandidate(trained);
  return buildDegradedMarker(findLatestAny(entries));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function writeOutput(envelope, outputPath) {
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, JSON.stringify(envelope, null, 2));
  return outputPath;
}

// ─── CLI ───────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes("--json");
  const dryRun = args.includes("--dry-run");

  const lifecyclePath = getLifecyclePath();
  const envelope = refresh(lifecyclePath);

  if (jsonOnly) {
    console.log(JSON.stringify(envelope, null, 2));
    return;
  }

  if (dryRun) {
    console.log(
      `# DRY RUN — would write to ${getOutputPath()} (degraded=${!!envelope.degraded}, trained=${envelope.trained ?? false})`,
    );
    return;
  }

  const out = writeOutput(envelope, getOutputPath());
  if (envelope.degraded) {
    console.log(`# Wrote DEGRADED marker to ${out} (reason: ${envelope.reason})`);
  } else {
    console.log(`# Wrote candidate envelope to ${out} (last trained: ${envelope.ts}, promoted: ${envelope.promoted})`);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
