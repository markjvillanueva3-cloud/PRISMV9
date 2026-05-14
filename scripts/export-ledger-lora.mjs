#!/usr/bin/env node
/**
 * export-ledger-lora.mjs — CLEANUP-MS0 / U-CLEANUP-B12 (LedgerLoRAExporter)
 *
 * Nightly read-only export of `bug_attribution` rows from the golf-slot ledger
 * (state/shared/coordination.db) into a cam_lora-style JSONL dataset at
 *
 *   state/shared/lora-training/peer-audit-<YYYY-MM>.jsonl
 *
 * The exporter is **read-only** by contract: every SQL statement is `SELECT *`
 * and the DB is opened in `readonly: true` mode. Writing/training is OUT OF
 * SCOPE — this script only stages the corpus.
 *
 * Why monthly buckets:
 *   - Aligns the on-disk artifact cadence with how reviewers analyse model
 *     drift (B9 weekly cron reads month-buckets so a fresh export per night
 *     idempotently rewrites the current-month file).
 *   - A YYYY-MM filename is stable across the date boundary (a daily file
 *     would orphan itself after one day).
 *
 * "Preserves option-value once dataset >= 1000 rows" (spec §B12):
 *   - The exporter ALWAYS emits one JSONL line per row it sees, but it ONLY
 *     marks the dataset `training_ready: true` once cumulative row count
 *     across all months >= MIN_TRAINING_ROWS (default 1000). Before that
 *     threshold, the resulting JSONL is a staging artifact, not a training
 *     input — the `training_ready` flag is the signal a downstream LoRA
 *     trainer should poll.
 *   - Crossing the threshold preserves option-value (the choice to train
 *     a LoRA from peer-audit data) without forcing premature, low-quality
 *     fine-tuning.
 *
 * Schema (every JSONL row):
 *   {
 *     schemaVersion: 1,            // cam_lora schema marker
 *     dataset: "peer-audit",       // family identifier
 *     instruction: string,         // human-readable task framing
 *     input:  string (JSON),       // sorted-key JSON of the audit context
 *     output: string (JSON),       // sorted-key JSON of the bug verdict
 *     weight: number,              // 2.5 for P0/P1, 1.0 otherwise
 *     labels: string[],            // ["P0"] | ["P1"] | ["resolved"] | ...
 *     fingerprint: {               // dedup + cluster key
 *       commit_sha: string,
 *       file_count: number,
 *       agent_type: string|null,
 *     },
 *     ts_detected: number,         // bug_attribution.detected_at (epoch ms)
 *   }
 *
 * Atomic write: tmp+rename. PID+ts+random suffix on tmp to avoid concurrent
 * collision if two nightly crons race (which they shouldn't, but the safety
 * is cheap).
 *
 * Exit codes:
 *   0 — exported successfully OR no DB / no rows to export (advisory)
 *   1 — actual error (db open failure, write failure, malformed args)
 *   2 — usage error (--help shown, etc.)
 *
 * @module scripts/export-ledger-lora
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import * as path from "node:path";
import * as fsp from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 1;
export const DATASET_FAMILY = "peer-audit";
export const MIN_TRAINING_ROWS = 1000;
export const DEFAULT_REPO_ROOT = "H:/prism";
export const DEFAULT_DB_RELATIVE = "state/shared/coordination.db";
export const DEFAULT_OUT_DIR_RELATIVE = "state/shared/lora-training";
export const DISPATCH_PROMPT_EXCERPT_MAX = 2_000;   // chars; bound JSONL row size
export const FILE_PATHS_MAX = 32;                   // cap files-per-bug to keep row small
export const SAFE_PARSE_FILE_PATHS_HARD_CAP = 1_000; // upper bound from raw JSON
export const ATOMIC_WRITE_RETRY_DELAY_MS = 50;       // single-retry backoff on EBUSY/EPERM
export const LORA_INSTRUCTION_TEMPLATE =
  "Classify the peer-audit bug below and emit the verdict in the same shape the resolver wrote it.";

const SEVERITY_WEIGHT = { P0: 2.5, P1: 2.5, P2: 1.0, P3: 1.0 };
const VALID_SEVERITIES = new Set(["P0", "P1", "P2", "P3"]);

// PII sanitisation: redact credential-shaped substrings from dispatch_prompt
// before they enter the LoRA training corpus. Defence in depth — operators are
// supposed to never paste secrets into review prompts, but once it lands in
// the LoRA dataset it is effectively unreclaimable.
const PII_REDACTIONS = [
  { pattern: /gh[pousr]_[A-Za-z0-9]{30,}/g,  label: "<github-token-redacted>" },
  { pattern: /sk-[A-Za-z0-9]{20,}/g,         label: "<api-key-redacted>" },
  { pattern: /AKIA[0-9A-Z]{16}/g,            label: "<aws-key-redacted>" },
  { pattern: /[A-Za-z]:\\Users\\([^\\\/\s]+)/g, label: "C:\\Users\\<redacted>" },
];

// ── ARGS ─────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const out = {
    json: false,
    dryRun: false,
    repoRoot: DEFAULT_REPO_ROOT,
    dbPath: null,        // resolved later if null
    outDir: null,        // resolved later if null
    monthKey: null,      // YYYY-MM; defaults to now-UTC
    nowMs: null,         // for tests / frozen time
    minTrainingRows: MIN_TRAINING_ROWS,
    sinceMs: null,       // optional filter; defaults to start-of-month
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[i + 1];
    switch (a) {
      case "--json":            out.json = true; break;
      case "--dry-run":         out.dryRun = true; break;
      case "--repo-root":       out.repoRoot = next(); i++; break;
      case "--db":              out.dbPath = next(); i++; break;
      case "--out-dir":         out.outDir = next(); i++; break;
      case "--month":           out.monthKey = next(); i++; break;
      case "--now":             out.nowMs = parseIsoToMs(next()); i++; break;
      case "--min-training-rows": {
        const n = Number(next()); i++;
        if (Number.isFinite(n) && n >= 0) out.minTrainingRows = Math.floor(n);
        break;
      }
      case "--since":           out.sinceMs = parseIsoToMs(next()); i++; break;
      case "--help":
      case "-h":                out.help = true; break;
      default:
        if (a && a.startsWith("--")) {
          throw new Error(`Unknown flag: ${a}`);
        }
    }
  }
  if (out.monthKey !== null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(out.monthKey)) {
    throw new Error(`Invalid --month "${out.monthKey}"; expected YYYY-MM`);
  }
  return out;
}

function parseIsoToMs(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

// ── PATHS ────────────────────────────────────────────────────────────────────

export function resolvePaths(opts) {
  const dbPath = opts.dbPath ?? path.join(opts.repoRoot, DEFAULT_DB_RELATIVE);
  const outDir = opts.outDir ?? path.join(opts.repoRoot, DEFAULT_OUT_DIR_RELATIVE);
  const nowMs = opts.nowMs ?? Date.now();
  const monthKey = opts.monthKey ?? monthKeyFromMs(nowMs);
  const outFile = path.join(outDir, `${DATASET_FAMILY}-${monthKey}.jsonl`);
  const statsFile = path.join(outDir, `${DATASET_FAMILY}-${monthKey}.stats.json`);
  return { dbPath, outDir, monthKey, outFile, statsFile, nowMs };
}

export function monthKeyFromMs(ms) {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) throw new Error(`Invalid timestamp: ${ms}`);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Compute the previous YYYY-MM key in strict UTC. December → previous year.
 * Used by the nightly default path to also rewrite the previous month's file
 * (P0 boundary-data-loss fix): rows whose detected_at lands in the prior
 * month but get inserted into the DB after the prior month's cron fire would
 * otherwise be lost when the next nightly export filters on the new month.
 */
export function previousMonthKey(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) throw new Error(`Invalid monthKey: ${monthKey}`);
  let y = Number(m[1]);
  let mo = Number(m[2]) - 1;
  if (mo === 0) { mo = 12; y -= 1; }
  return `${y}-${String(mo).padStart(2, "0")}`;
}

export function monthBoundsUtc(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) throw new Error(`Invalid monthKey: ${monthKey}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const startMs = Date.UTC(y, mo - 1, 1, 0, 0, 0, 0);
  const endMs = mo === 12
    ? Date.UTC(y + 1, 0, 1, 0, 0, 0, 0)
    : Date.UTC(y, mo, 1, 0, 0, 0, 0);
  return { startMs, endMs };
}

// ── DB ───────────────────────────────────────────────────────────────────────

/**
 * Open the ledger DB read-only. Test seam: caller may inject `databaseFactory`
 * so unit tests can substitute a FakeDb without touching better-sqlite3.
 */
export async function openLedgerReadOnly(dbPath, { databaseFactory } = {}) {
  if (databaseFactory) {
    return databaseFactory(dbPath, { readonly: true });
  }
  // Dynamic import keeps the optional dep off the hot path for `--help`.
  const mod = await import("better-sqlite3");
  const Ctor = mod.default ?? mod;
  return new Ctor(dbPath, { readonly: true, fileMustExist: true });
}

/**
 * Count all bug_attribution rows (across all months) — drives training_ready.
 * Returns 0 when the DB is missing, table absent, or the count fails (so the
 * exporter degrades gracefully).
 */
export function safeCountAllBugs(db) {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM bug_attribution`).get();
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Fetch bug_attribution rows for the window. `monthStartMs <= detected_at < monthEndMs`.
 * Caller-supplied `since` (if any) further narrows the lower bound.
 */
export function fetchRowsForMonth(db, monthBounds, sinceMs) {
  const lowerBound = sinceMs !== null && sinceMs > monthBounds.startMs ? sinceMs : monthBounds.startMs;
  const stmt = db.prepare(`
    SELECT *
      FROM bug_attribution
     WHERE detected_at >= @start_ms
       AND detected_at <  @end_ms
     ORDER BY detected_at ASC
  `);
  return stmt.all({ start_ms: lowerBound, end_ms: monthBounds.endMs });
}

// ── RENDERING ────────────────────────────────────────────────────────────────

/**
 * Render a single bug_attribution row into a cam_lora-style record.
 * Pure function (no I/O) — tests verify reference shapes per row.
 */
export function renderRow(row) {
  if (!row || typeof row !== "object") return null;

  const severity = VALID_SEVERITIES.has(row.severity) ? row.severity : "P3";
  const weight = SEVERITY_WEIGHT[severity] ?? 1.0;
  const filePaths = safeParseFilePaths(row.file_paths_json);
  const expectedFiles = safeParseFilePaths(row.expected_files_json);

  const resolved = row.resolved_at !== null && row.resolved_at !== undefined;
  const labels = [severity];
  if (resolved) labels.push("resolved");
  else labels.push("open");

  const input = sortKeys({
    commit_sha: String(row.commit_sha ?? ""),
    file_paths: filePaths.slice(0, FILE_PATHS_MAX),
    file_count: filePaths.length,
    agent_type: row.agent_type ?? null,
    expected_files: expectedFiles.slice(0, FILE_PATHS_MAX),
    dispatch_prompt_excerpt: truncateText(row.dispatch_prompt, DISPATCH_PROMPT_EXCERPT_MAX),
    originating_chat: row.originating_chat ?? null,
    originating_tick_id: row.originating_tick_id ?? null,
  });

  const output = sortKeys({
    severity,
    summary: String(row.summary ?? "").trim(),
    resolution_note: row.resolution_note ?? null,
    resolved: Boolean(resolved),
    tokens_spent: safeNumber(row.tokens_spent, 0),
    cost_usd_micros: safeNumber(row.cost_usd_micros, 0),
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    dataset: DATASET_FAMILY,
    instruction: LORA_INSTRUCTION_TEMPLATE,
    input: JSON.stringify(input),
    output: JSON.stringify(output),
    weight,
    labels,
    fingerprint: sortKeys({
      commit_sha: String(row.commit_sha ?? ""),
      file_count: filePaths.length,
      agent_type: row.agent_type ?? null,
    }),
    ts_detected: safeNumber(row.detected_at, 0),
  };
}

function safeParseFilePaths(jsonStr) {
  if (!jsonStr) return [];
  try {
    const v = JSON.parse(jsonStr);
    if (Array.isArray(v)) return v.filter((s) => typeof s === "string").slice(0, SAFE_PARSE_FILE_PATHS_HARD_CAP);
    return [];
  } catch {
    return [];
  }
}

/**
 * Truncate operator text + apply PII redaction. Order matters: redact FIRST
 * so a token that crosses the truncation boundary isn't half-leaked. Surrogate-
 * safe truncation guards against splitting a 4-byte emoji at the boundary
 * (would produce invalid UTF-16 in the JSONL output).
 */
export function truncateText(s, maxChars) {
  if (s === null || s === undefined) return null;
  let str = String(s);
  for (const { pattern, label } of PII_REDACTIONS) {
    str = str.replace(pattern, label);
  }
  if (str.length <= maxChars) return str;
  // Surrogate-pair-safe: if the truncation falls between a high+low surrogate,
  // step back one code unit so we never emit a lone surrogate.
  let cut = maxChars;
  const code = str.charCodeAt(cut - 1);
  if (code >= 0xD800 && code <= 0xDBFF) cut -= 1;   // high surrogate at boundary
  return str.slice(0, cut) + `… [+${str.length - cut}ch]`;
}

function safeNumber(n, fallback) {
  if (n === null || n === undefined) return fallback;
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function sortKeys(o) {
  const out = {};
  for (const k of Object.keys(o).sort()) out[k] = o[k];
  return out;
}

// ── EXPORT ───────────────────────────────────────────────────────────────────

/**
 * Core export function — pure-ish (the only I/O is the DB read + atomic write).
 * Returns a stats summary; throws on hard errors (caller decides exit code).
 */
export async function exportLedgerLora(opts = {}) {
  const merged = {
    json: false,
    dryRun: false,
    repoRoot: DEFAULT_REPO_ROOT,
    dbPath: null,
    outDir: null,
    monthKey: null,
    nowMs: null,
    minTrainingRows: MIN_TRAINING_ROWS,
    sinceMs: null,
    databaseFactory: null,
    writeFile: null,
    ...opts,
  };
  const paths = resolvePaths(merged);
  const bounds = monthBoundsUtc(paths.monthKey);

  // No DB → nothing to export, return a clean stats record.
  if (!existsSync(paths.dbPath)) {
    return makeStats({
      ok: true,
      reason: "db_missing",
      paths,
      monthKey: paths.monthKey,
      bounds,
      totalRowsAllMonths: 0,
      rowsThisMonth: 0,
      trainingReady: false,
      written: false,
      dryRun: merged.dryRun,
      minTrainingRows: merged.minTrainingRows,
    });
  }

  let db = null;
  try {
    db = await openLedgerReadOnly(paths.dbPath, { databaseFactory: merged.databaseFactory });
  } catch (e) {
    throw new Error(`Could not open ledger DB at ${paths.dbPath}: ${e instanceof Error ? e.message : String(e)}`);
  }

  let rows;
  let totalAcrossAllMonths;
  try {
    totalAcrossAllMonths = safeCountAllBugs(db);
    rows = fetchRowsForMonth(db, bounds, merged.sinceMs);
  } finally {
    try { db.close?.(); } catch { /* ignore */ }
  }

  const rendered = [];
  const skipped = [];
  for (const r of rows) {
    const rec = renderRow(r);
    if (rec === null) { skipped.push({ id: r?.id ?? null, reason: "null_render" }); continue; }
    if (!Number.isFinite(rec.ts_detected) || rec.ts_detected <= 0) {
      skipped.push({ id: r?.id ?? null, reason: "bad_ts_detected" });
      continue;
    }
    rendered.push(rec);
  }

  const trainingReady = totalAcrossAllMonths >= merged.minTrainingRows;

  // Dry-run short-circuits write but still returns the stats so the operator
  // can preview what would land. Tests use this path heavily.
  if (merged.dryRun) {
    return makeStats({
      ok: true,
      reason: "dry_run",
      paths,
      monthKey: paths.monthKey,
      bounds,
      totalRowsAllMonths: totalAcrossAllMonths,
      rowsThisMonth: rows.length,
      rowsRendered: rendered.length,
      rowsSkipped: skipped.length,
      skippedDetail: skipped.slice(0, 16),   // cap so stats JSON stays small
      trainingReady,
      written: false,
      dryRun: true,
      minTrainingRows: merged.minTrainingRows,
    });
  }

  // Idempotent atomic write of the JSONL.
  try { mkdirSync(paths.outDir, { recursive: true }); } catch { /* ignore */ }
  const bodyLines = rendered.map((r) => JSON.stringify(r)).join("\n");
  const body = bodyLines.length ? bodyLines + "\n" : "";

  const writer = merged.writeFile ?? defaultAtomicWrite;
  const bytesWritten = await writer(paths.outFile, body);

  // Sidecar stats file — operator/automation surface for "is this dataset ready"?
  const stats = makeStats({
    ok: true,
    reason: rendered.length > 0 ? "exported" : "exported_empty",
    paths,
    monthKey: paths.monthKey,
    bounds,
    totalRowsAllMonths: totalAcrossAllMonths,
    rowsThisMonth: rows.length,
    rowsRendered: rendered.length,
    rowsSkipped: skipped.length,
    skippedDetail: skipped.slice(0, 16),
    trainingReady,
    written: true,
    bytesWritten,
    dryRun: false,
    minTrainingRows: merged.minTrainingRows,
  });
  await writer(paths.statsFile, JSON.stringify(stats, null, 2) + "\n");
  return stats;
}

function makeStats({
  ok, reason, paths, monthKey, bounds,
  totalRowsAllMonths, rowsThisMonth, rowsRendered = 0, rowsSkipped = 0,
  skippedDetail = [], trainingReady, written, bytesWritten = 0,
  dryRun, minTrainingRows,
}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    generator: "U-CLEANUP-B12 (LedgerLoRAExporter)",
    generatedAtMs: Date.now(),
    ok,
    reason,
    monthKey,
    windowStartMs: bounds.startMs,
    windowEndMs: bounds.endMs,
    dbPath: paths.dbPath,
    outFile: paths.outFile,
    statsFile: paths.statsFile,
    totalRowsAllMonths,
    rowsThisMonth,
    rowsRendered,
    rowsSkipped,
    skippedDetail,
    trainingReady,
    minTrainingRows,
    written,
    bytesWritten,
    dryRun,
  };
}

// Atomic tmp+rename writer. Default — tests inject a no-op via `writeFile`.
// Single retry on EBUSY/EPERM defends the most common Windows race: a reader
// has the destination file open when we try to rename over it.
export async function defaultAtomicWrite(file, body, opts = {}) {
  const dir = path.dirname(file);
  try { mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tryWrite = () => {
    writeFileSync(tmp, body, "utf-8");
    renameSync(tmp, file);
  };
  try {
    tryWrite();
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    const code = (e && typeof e === "object" && "code" in e) ? e.code : null;
    const shouldRetry = !opts.__retried && (code === "EBUSY" || code === "EPERM");
    if (shouldRetry) {
      await new Promise((r) => setTimeout(r, ATOMIC_WRITE_RETRY_DELAY_MS));
      return defaultAtomicWrite(file, body, { __retried: true });
    }
    throw e;
  }
  try { return statSync(file).size; } catch { return body.length; }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

/**
 * CLI driver. When no explicit `--month` is given, rewrite BOTH the previous
 * AND the current month — this is the P0-1 month-boundary-data-loss fix:
 * rows whose detected_at fell in the prior month but landed in the DB after
 * the prior month's nightly fire would otherwise be lost forever. Cheap +
 * idempotent: the previous-month file is just re-rendered from the same
 * source rows.
 *
 * Stats returned describe the CURRENT month (= the one operators care about
 * day-to-day); the previous-month export is best-effort (failures logged
 * but never block the current-month export).
 *
 * Test seam: a caller can override `databaseFactory` + `writeFile` via opts.
 */
export async function runCli(argv, { stdout, stderr, databaseFactory, writeFile } = {}) {
  const out = stdout ?? process.stdout;
  const err = stderr ?? process.stderr;
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    err.write(`export-ledger-lora: ${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  if (opts.help) {
    out.write(usage());
    return 2;
  }
  // Plumb test seams into the exporter — keeps runCli round-trip-able.
  const seamOpts = { ...opts };
  if (databaseFactory) seamOpts.databaseFactory = databaseFactory;
  if (writeFile) seamOpts.writeFile = writeFile;

  // Default path: rewrite previous month first (best-effort), then current.
  // Explicit --month skips the previous-month rewrite (operator-targeted run).
  if (!opts.monthKey) {
    const nowMs = opts.nowMs ?? Date.now();
    const curMonth = monthKeyFromMs(nowMs);
    const prevMonth = previousMonthKey(curMonth);
    try {
      await exportLedgerLora({ ...seamOpts, monthKey: prevMonth });
    } catch (e) {
      err.write(`export-ledger-lora: previous-month rewrite failed (best-effort): ${e instanceof Error ? e.message : String(e)}\n`);
      // Continue — current month export is the primary contract.
    }
  }

  let stats;
  try {
    stats = await exportLedgerLora(seamOpts);
  } catch (e) {
    err.write(`export-ledger-lora: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
  if (opts.json) {
    out.write(JSON.stringify(stats, null, 2) + "\n");
  } else {
    out.write(renderHuman(stats) + "\n");
  }
  return 0;
}

function usage() {
  return [
    "usage: export-ledger-lora [--json] [--dry-run] [--month YYYY-MM] [--since ISO]",
    "                          [--min-training-rows N] [--repo-root PATH]",
    "                          [--db PATH] [--out-dir PATH] [--now ISO]",
    "",
    "Read-only nightly export of bug_attribution rows from coordination.db",
    "to <out-dir>/peer-audit-<YYYY-MM>.jsonl (cam_lora schema, schemaVersion=1).",
    "",
  ].join("\n");
}

function renderHuman(s) {
  return [
    `[export-ledger-lora] month=${s.monthKey}  rendered=${s.rowsRendered}/${s.rowsThisMonth}` +
      (s.rowsSkipped ? `  skipped=${s.rowsSkipped}` : ""),
    `  ledger=${s.dbPath}`,
    `  out=${s.outFile}${s.dryRun ? "  (dry-run)" : ""}`,
    `  total_rows_all_months=${s.totalRowsAllMonths}` +
      `  training_ready=${s.trainingReady}` +
      `  threshold=${s.minTrainingRows}`,
    s.reason === "db_missing"
      ? "  status=db_missing (no-op; advisory)"
      : `  status=${s.reason}` + (s.bytesWritten ? `  bytes=${s.bytesWritten}` : ""),
  ].join("\n");
}

// ── ENTRY ────────────────────────────────────────────────────────────────────

// invokedDirectly: portable + cross-platform (handles Windows file:// URLs)
const __filename = fileURLToPath(import.meta.url);
const __entry = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (__entry && __filename === __entry) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  }).catch((e) => {
    process.stderr.write(`export-ledger-lora: fatal: ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
    process.exit(1);
  });
}
