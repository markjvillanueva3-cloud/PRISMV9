#!/usr/bin/env node
/**
 * youtube-night-extract.mjs -- STAGING-ONLY night wrapper around
 * youtube-free-extract.mjs (U-YT-NIGHT-STAGE, slot:zulu 2026-06-12).
 *
 * WHY: youtube-free-extract was HARD-REJECTED from the off-hours Ollama lane
 * (wf_eaeb1510) for in-process tribal ingest -- an unattended mutation of the
 * shared tribal store is the clobber-class defect (8bf1873577). This wrapper
 * fixes the NAMED defect instead of re-adding the rejected job: every run
 * forces `--no-ingest --no-wiki`, so tips land ONLY in the pipeline's own
 * staging dir (state/shared/youtube-extraction/<id>.json). Promotion into
 * TribalKnowledgeEngine + wiki happens ATTENDED via
 * scripts/promote-youtube-staged.mjs (dry-run default, --apply to execute).
 *
 * Queue-driven: state/shared/youtube-extraction/night-queue.json declares
 * curated searches/URLs (domain-tagged for the closed-loop slots). A query is
 * DUE when enabled and its last OK run is older than the cooldown (default 7
 * days -- weekly rotation; failed runs retry the next night). Per-query
 * fail-soft with durable JSONL forensics; bounded per night by --max-queries.
 *
 * Night-lane contract: no detached children (spawnSync, argv arrays), no
 * shared-index writes, bounded wall time by construction
 * (maxQueries x perQueryTimeout < the registry job timeout), fail-loud on a
 * corrupt queue (nothing runs), exit 0 on a no-due idempotent night.
 *
 * Usage:
 *   node scripts/youtube-night-extract.mjs [--max-queries 3] [--cooldown-days 7]
 *        [--per-query-timeout-ms 780000] [--dry-run] [--status]
 */

import { spawnSync } from "node:child_process";
import { readFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

export const QUEUE_PATH = join(REPO_ROOT, "state", "shared", "youtube-extraction", "night-queue.json");
export const LEDGER_PATH = join(REPO_ROOT, "state", "shared", "youtube-extraction", "night-ledger.jsonl");
export const EXTRACT_SCRIPT = join(REPO_ROOT, "scripts", "youtube-free-extract.mjs");
export const QUEUE_SCHEMA = "1.0.0";
export const DEFAULT_MAX_QUERIES = 3;
export const DEFAULT_COOLDOWN_DAYS = 7;
// 13 min/query x 3 = 39 min, inside the 45-min registry timeout with margin.
export const DEFAULT_PER_QUERY_TIMEOUT_MS = 13 * 60 * 1000;
const TAIL_MAX = 400;
const MAX_BUFFER = 16 * 1024 * 1024;

/** Pure: validate one queue entry; returns a reason string or null when valid. */
export function queryInvalidReason(q) {
  if (!q || typeof q !== "object") return "entry is not an object";
  if (!q.id || typeof q.id !== "string") return "missing string id";
  if (!q.query || typeof q.query !== "string" || !q.query.trim()) return `'${q.id}': missing query`;
  // Spawned via argv arrays so shell injection is impossible, but a leading
  // dash would be parsed as a FLAG by youtube-free-extract -- reject it.
  if (q.query.trim().startsWith("-")) return `'${q.id}': query must not start with '-'`;
  return null;
}

/** Pure: parse + validate the queue file content. FAIL-LOUD: bad queue -> nothing runs. */
export function parseQueue(text) {
  let j;
  try { j = JSON.parse(text); } catch (e) { return { ok: false, error: `queue JSON parse failed: ${e.message}` }; }
  if (j.schemaVersion !== QUEUE_SCHEMA) return { ok: false, error: `schemaVersion ${j.schemaVersion} != ${QUEUE_SCHEMA}` };
  if (!Array.isArray(j.queries)) return { ok: false, error: "queries is not an array" };
  const seen = new Set();
  for (const q of j.queries) {
    const why = queryInvalidReason(q);
    if (why) return { ok: false, error: why };
    if (seen.has(q.id)) return { ok: false, error: `duplicate query id '${q.id}'` };
    seen.add(q.id);
  }
  return { ok: true, queue: j };
}

/** Pure: parse ledger JSONL -> rows (malformed lines skipped -- forensics, not state). */
export function parseLedger(text) {
  if (!text) return [];
  const rows = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { rows.push(JSON.parse(t)); } catch { /* torn/garbage forensics line -- skip */ }
  }
  return rows;
}

/**
 * Pure: which queries are DUE tonight. Enabled, and the most recent OK run is
 * older than cooldown (failed runs do NOT count -- they retry next night).
 */
export function dueQueries(queue, ledgerRows, nowMs, cooldownDays = DEFAULT_COOLDOWN_DAYS) {
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const lastOk = new Map();
  for (const r of ledgerRows) {
    if (r && r.queryId && r.ok === true) {
      const t = Date.parse(r.ts || "");
      if (Number.isFinite(t)) lastOk.set(r.queryId, Math.max(t, lastOk.get(r.queryId) || 0));
    }
  }
  return (queue.queries || []).filter((q) => {
    if (q.enabled === false) return false;
    const t = lastOk.get(q.id);
    return !(Number.isFinite(t) && nowMs - t < cooldownMs);
  });
}

/**
 * Run the due queries sequentially. Per-query fail-soft: one failure never
 * stops the next; every outcome is a durable ledger row BEFORE the next query
 * starts. `runImpl`/`logImpl` injectable for the hermetic suite.
 */
export function runQueries(queries, opts = {}) {
  const {
    runImpl = defaultRunImpl,
    logImpl = defaultLogImpl,
    perQueryTimeoutMs = DEFAULT_PER_QUERY_TIMEOUT_MS,
    nowIso = () => new Date().toISOString(),
  } = opts;
  const out = { ran: 0, failed: 0, rows: [] };
  for (const q of queries) {
    let row;
    try {
      const r = runImpl(q, perQueryTimeoutMs);
      const exitCode = typeof r.status === "number" ? r.status : -1; // null=timeout/kill -> never a silent 0
      const ok = exitCode === 0;
      row = {
        ts: nowIso(), queryId: q.id, domain: q.domain || null, ok, exitCode,
        tail: String((ok ? r.stdout : (r.stderr || r.stdout)) || "").slice(-TAIL_MAX),
        ...(r.error ? { spawnError: String(r.error.message || r.error).slice(0, TAIL_MAX) } : {}),
      };
    } catch (e) {
      row = { ts: nowIso(), queryId: q.id, domain: q.domain || null, ok: false, exitCode: -1, tail: String(e?.message || e).slice(0, TAIL_MAX) };
    }
    if (row.ok) out.ran++; else out.failed++;
    out.rows.push(row);
    try { logImpl(row); } catch { /* forensics best-effort; the run itself already happened */ }
  }
  return out;
}

function defaultRunImpl(q, timeoutMs) {
  // STAGING-ONLY invariant lives HERE: --no-ingest --no-wiki are not optional.
  return spawnSync(process.execPath, [EXTRACT_SCRIPT, q.query, "--no-ingest", "--no-wiki", "--json"],
    { encoding: "utf8", timeout: timeoutMs, maxBuffer: MAX_BUFFER, windowsHide: true, cwd: REPO_ROOT });
}

function defaultLogImpl(row) {
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  appendFileSync(LEDGER_PATH, JSON.stringify(row) + "\n", "utf8");
}

function intFlag(argv, name, dflt) {
  const i = argv.indexOf(name);
  if (i === -1 || !argv[i + 1]) return dflt;
  const n = Number(argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

export async function main(argv = process.argv.slice(2)) {
  const maxQueries = intFlag(argv, "--max-queries", DEFAULT_MAX_QUERIES);
  const cooldownDays = intFlag(argv, "--cooldown-days", DEFAULT_COOLDOWN_DAYS);
  const perQueryTimeoutMs = intFlag(argv, "--per-query-timeout-ms", DEFAULT_PER_QUERY_TIMEOUT_MS);

  if (!existsSync(QUEUE_PATH)) { console.error(`[yt-night] queue missing: ${QUEUE_PATH} -- nothing to do`); return 0; }
  const parsed = parseQueue(readFileSync(QUEUE_PATH, "utf8"));
  if (!parsed.ok) { console.error(`[yt-night] QUEUE INVALID (nothing runs): ${parsed.error}`); return 1; }

  const ledger = existsSync(LEDGER_PATH) ? parseLedger(readFileSync(LEDGER_PATH, "utf8")) : [];
  const due = dueQueries(parsed.queue, ledger, Date.now(), cooldownDays).slice(0, maxQueries);

  if (argv.includes("--status") || argv.includes("--dry-run")) {
    console.log(JSON.stringify({ queue: parsed.queue.queries.length, due: due.map((q) => q.id), maxQueries, cooldownDays }, null, 2));
    return 0;
  }
  if (due.length === 0) { console.log("[yt-night] no due queries -- idempotent night, exit 0"); return 0; }

  const r = runQueries(due, { perQueryTimeoutMs });
  console.log(`[yt-night] ran=${r.ran} failed=${r.failed} (staging-only; promote via scripts/promote-youtube-staged.mjs)`);
  return 0; // per-query failures are ledger forensics, not a lane failure
}

const __isMain = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (__isMain) main().then((c) => process.exit(c)).catch((e) => { console.error(`[yt-night] fatal: ${e?.message || e}`); process.exit(1); });
