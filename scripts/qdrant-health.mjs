#!/usr/bin/env node
// U-PSN-QDRANT-REVIVE-2026-05-24 — Qdrant health probe
//
// Probes the local Qdrant instance and reports its state.
// Uses curl subprocess (same pattern as ollama-docker-health.mjs) to avoid
// Windows http connection-pool starvation on localhost.
//
// Usage:
//   node H:/prism/scripts/qdrant-health.mjs              # human-readable
//   node H:/prism/scripts/qdrant-health.mjs --json       # JSON output
//
// Output shape (JSON):
//   { reachable, version, collections: string[], collectionStats: Record<name,{vectorCount,pointCount,indexedVectorCount,status}>, probedAt, error? }
//   vectorCount === pointCount (authoritative row count); indexedVectorCount is
//   the HNSW-indexed subset (0 below the indexing_threshold but still searchable).
//
// Exit codes: 0 = probe ran (regardless of health) · 1 = usage error · 2 = internal error

import { spawnSync } from "node:child_process";

export const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const PROBE_TIMEOUT_MS = Number(process.env.QDRANT_PROBE_TIMEOUT_MS) || 5000;
const COLLECTION_FETCH_TIMEOUT_MS = 4000;

/**
 * Low-level HTTP GET via curl (fail-soft).
 * @param {string} url
 * @param {number} timeoutMs
 * @param {function} [spawnImpl] — injectable for tests
 * @returns {{ ok: boolean, body?: string, error?: string, status?: number }}
 */
export function curlGet(url, timeoutMs = PROBE_TIMEOUT_MS, spawnImpl = spawnSync) {
  const timeoutSec = Math.max(1, Math.round(timeoutMs / 1000));
  const r = spawnImpl(
    "curl",
    ["-fsS", "--max-time", String(timeoutSec), url],
    { encoding: "utf8", timeout: timeoutMs + 500 }
  );
  if (r.error) {
    return { ok: false, error: String(r.error.message || r.error).slice(0, 160) };
  }
  if (r.status !== 0) {
    return { ok: false, error: (r.stderr || `curl exit ${r.status}`).slice(0, 160) };
  }
  return { ok: true, body: r.stdout || "" };
}

/**
 * Probe Qdrant /healthz endpoint.
 * Returns { reachable, version?, error? }
 * @param {function} [spawnImpl]
 */
export function probeHealth(spawnImpl = spawnSync) {
  const r = curlGet(`${QDRANT_URL}/healthz`, PROBE_TIMEOUT_MS, spawnImpl);
  if (!r.ok) {
    return { reachable: false, error: r.error };
  }
  // /healthz returns plain "healthz check passed" or JSON {"title":"qdrant","version":"..."}
  let version = null;
  try {
    const j = JSON.parse(r.body);
    if (j && typeof j.version === "string") version = j.version;
  } catch { /* not JSON — that's fine */ }
  return { reachable: true, version };
}

/**
 * Fetch collection list + per-collection stats.
 * Returns { collections: string[], collectionStats: Record<name,{vectorCount,status}> }
 * Fail-soft: if the endpoint fails, returns empty collections.
 * @param {function} [spawnImpl]
 */
export function probeCollections(spawnImpl = spawnSync) {
  const r = curlGet(`${QDRANT_URL}/collections`, COLLECTION_FETCH_TIMEOUT_MS, spawnImpl);
  if (!r.ok) {
    return { collections: [], collectionStats: {}, collectionsError: r.error };
  }
  let names = [];
  const stats = {};
  try {
    const j = JSON.parse(r.body);
    const list = j?.result?.collections;
    if (Array.isArray(list)) {
      names = list.map((c) => (typeof c === "string" ? c : c?.name)).filter(Boolean);
    }
  } catch { /* ignore parse error */ }

  // Fetch per-collection info (fail-soft per collection)
  for (const name of names) {
    const info = curlGet(`${QDRANT_URL}/collections/${encodeURIComponent(name)}`, COLLECTION_FETCH_TIMEOUT_MS, spawnImpl);
    if (info.ok) {
      try {
        const j = JSON.parse(info.body);
        const res = j?.result;
        // points_count is the authoritative row count. vectors_count is
        // DEPRECATED (modern Qdrant returns null), and indexed_vectors_count is
        // 0 for any collection below the HNSW indexing_threshold (~10k pts) even
        // though those points exist and are searchable via exact search. Report
        // points_count as `vectorCount` so a populated-but-unindexed collection
        // (e.g. prism_skills 241, prism_formulas 32) is never falsely shown as
        // empty -- the bug that made the vault look un-setup. indexedVectorCount
        // is surfaced separately for HNSW-build insight.
        const pointCount = res?.points_count ?? null;
        const indexedVectorCount = res?.indexed_vectors_count ?? null;
        stats[name] = {
          vectorCount: pointCount ?? res?.vectors_count ?? indexedVectorCount ?? null,
          pointCount,
          indexedVectorCount,
          status: res?.status ?? null,
        };
      } catch { stats[name] = { vectorCount: null, pointCount: null, indexedVectorCount: null, status: null }; }
    } else {
      stats[name] = { vectorCount: null, pointCount: null, indexedVectorCount: null, status: null, error: info.error };
    }
  }

  return { collections: names, collectionStats: stats };
}

/**
 * Full health probe. Safe to call from tests via spawnImpl injection.
 * @param {{ spawnImpl?: function }} [opts]
 * @returns {{ reachable: boolean, version: string|null, collections: string[], collectionStats: object, probedAt: string, error?: string }}
 */
export function runHealthProbe(opts = {}) {
  const spawnImpl = opts.spawnImpl || spawnSync;
  const probedAt = new Date().toISOString();
  const health = probeHealth(spawnImpl);
  if (!health.reachable) {
    return {
      reachable: false,
      version: null,
      collections: [],
      collectionStats: {},
      probedAt,
      error: health.error,
    };
  }
  const { collections, collectionStats, collectionsError } = probeCollections(spawnImpl);
  return {
    reachable: true,
    version: health.version,
    collections,
    collectionStats,
    probedAt,
    ...(collectionsError ? { collectionsError } : {}),
  };
}

// ── CLI entry point ────────────────────────────────────────────────────────────

function printHuman(report) {
  if (!report.reachable) {
    process.stdout.write(`Qdrant: OFFLINE — ${report.error || "connection refused"}\n`);
    process.stdout.write(`  probed: ${report.probedAt} at ${QDRANT_URL}\n`);
    process.stdout.write(`  hint: run 'node H:/prism/scripts/qdrant-revive.mjs' to start the container\n`);
    return;
  }
  const ver = report.version ? ` v${report.version}` : "";
  process.stdout.write(`Qdrant: ONLINE${ver} — ${report.collections.length} collection(s)\n`);
  process.stdout.write(`  probed: ${report.probedAt} at ${QDRANT_URL}\n`);
  if (report.collections.length === 0) {
    process.stdout.write(`  collections: (none)\n`);
  } else {
    for (const name of report.collections) {
      const s = report.collectionStats[name] || {};
      const vc = s.vectorCount !== null && s.vectorCount !== undefined ? ` ${s.vectorCount} pts` : "";
      const ix =
        s.indexedVectorCount !== null && s.indexedVectorCount !== undefined && s.indexedVectorCount !== s.vectorCount
          ? ` (${s.indexedVectorCount} HNSW-indexed)`
          : "";
      const st = s.status ? ` [${s.status}]` : "";
      process.stdout.write(`  - ${name}${vc}${ix}${st}\n`);
    }
  }
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv1 = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv1);
  } catch { return false; }
})();

if (invokedDirect) {
  try {
    const wantJson = process.argv.includes("--json");
    const report = runHealthProbe();
    if (wantJson) {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    } else {
      printHuman(report);
    }
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[qdrant-health] FATAL: ${e?.stack || e?.message || e}\n`);
    process.exit(2);
  }
}
