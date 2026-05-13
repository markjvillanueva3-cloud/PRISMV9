#!/usr/bin/env node
/**
 * coord-db-sentinel.mjs — Coordination Store Health Sentinel (CLEANUP-MS0/U-CLEANUP-G2)
 *
 * Two-pronged health check on the coordination state pair:
 *   1. SQLite WAL (`state/shared/coordination.db`) — H8 store, source of truth
 *   2. Legacy JSON (`state/shared/WORK_CLAIMS.json`) — pre-H8 store, retirement candidate
 *
 * Runs PRAGMA integrity_check + quick_check on the DB, counts rows in the
 * claims/presence/meta tables, reads the JSON's claims object, and computes
 * a row-count divergence percentage. Alerts if |divergence| >= 10%.
 *
 * Drives the WORK_CLAIMS.json retirement decision: when the DB has been the
 * sole authoritative store for >=N consecutive runs (recorded in the report),
 * the operator can safely delete the JSON.
 *
 * Read-only / advisory-only. Exit 0 always. Operator (or peer-bus inject hook)
 * picks up alerts from the report files.
 *
 * Output:
 *   - state/shared/COORD_DB_HEALTH.md   (human)
 *   - state/shared/COORD_DB_HEALTH.json (machine)
 *
 * Usage:
 *   node scripts/coord-db-sentinel.mjs
 *   node scripts/coord-db-sentinel.mjs --json
 *   node scripts/coord-db-sentinel.mjs --frozen-time 2026-05-13T22:00:00Z
 *   node scripts/coord-db-sentinel.mjs --db <path> --json-claims <path>
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-G2.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { join, dirname, isAbsolute as pathIsAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";

// Repo root derived from script location so the sentinel works from forked
// worktrees per the CLAUDE.md conflict-fork rule.
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(__dirname, "..");
const DEFAULT_DB = "state/shared/coordination.db";
const DEFAULT_JSON_CLAIMS = "state/shared/WORK_CLAIMS.json";
const DEFAULT_OUT_MD = "state/shared/COORD_DB_HEALTH.md";
const DEFAULT_OUT_JSON = "state/shared/COORD_DB_HEALTH.json";

// Resolved better-sqlite3 entrypoint — sits under mcp-server/node_modules.
// Lazy-imported so test fixtures can inject a synthetic Database constructor.
const DEFAULT_SQLITE_MODULE = resolve(
  __dirname,
  "..",
  "mcp-server",
  "node_modules",
  "better-sqlite3",
  "lib",
  "index.js",
);

// Divergence threshold for ALERT. 10% per spec — small enough to catch real
// drift, big enough to absorb the 1-2-row noise from in-flight peer claims.
const DIVERGENCE_ALERT_PCT = 10;

// Tables we expect in the H8 schema (per CoordinationStoreEngine.ts schema v1).
const EXPECTED_TABLES = ["claims", "presence", "meta"];

// ──────────────────────────────────────────────────────────────────────
// argv parsing
// ──────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = {
    json: false,
    frozenTime: null,
    db: null,
    jsonClaims: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--frozen-time") args.frozenTime = argv[++i];
    else if (a === "--db") args.db = argv[++i];
    else if (a === "--json-claims") args.jsonClaims = argv[++i];
  }
  if (!args.frozenTime && process.env.PRISM_AUDIT_FROZEN_TIME) {
    args.frozenTime = process.env.PRISM_AUDIT_FROZEN_TIME;
  }
  return args;
}

// ──────────────────────────────────────────────────────────────────────
// SQLite probes — all synchronous, all guarded
// ──────────────────────────────────────────────────────────────────────

/**
 * Open the SQLite db read-only. Returns { ok, db, bytes, mtime } or
 * { ok:false, reason }. Caller MUST call db.close() when done.
 */
export async function loadSqliteDB(absPath, opts = {}) {
  if (!existsSync(absPath)) {
    return { ok: false, reason: `db not found: ${absPath}` };
  }
  let st;
  try { st = statSync(absPath); }
  catch (err) { return { ok: false, reason: `stat failed: ${String(err && err.message || err)}` }; }
  if (st.size === 0) {
    return { ok: false, reason: `db is zero-bytes (corrupt or never initialized)` };
  }
  // Short-circuit: skip the dynamic import entirely when the test fixture
  // provides a Database constructor (no wasted node:fs import).
  let Database;
  try {
    if (opts.databaseFactory) {
      Database = opts.databaseFactory;
    } else {
      const mod = opts.sqliteModule || DEFAULT_SQLITE_MODULE;
      // Node ESM dynamic import requires a file:// URL scheme for absolute
      // Windows paths (`h:\...` is rejected as an unknown protocol). Convert
      // when the path looks absolute; pass package specifiers through unchanged.
      const importTarget = pathIsAbsolute(mod) ? pathToFileURL(mod).href : mod;
      const imported = await import(importTarget);
      Database = imported.default || imported;
    }
  } catch (err) {
    return { ok: false, reason: `sqlite module load failed: ${String(err && err.message || err)}` };
  }
  let db;
  try {
    db = new Database(absPath, { readonly: true, fileMustExist: true });
    // 5-second busy_timeout — concurrent WAL writers from peer chats can hold
    // a shared lock during checkpoint; 5s is well below the 30s Stop budget.
    try { db.pragma("busy_timeout = 5000"); } catch {}
  } catch (err) {
    return { ok: false, reason: `open failed: ${String(err && err.message || err)}` };
  }
  return { ok: true, db, bytes: st.size, mtime: st.mtimeMs };
}

/**
 * Run PRAGMA integrity_check + PRAGMA quick_check. Returns the result rows
 * verbatim (typically [{integrity_check:"ok"}] / [{quick_check:"ok"}]).
 */
export function queryIntegrity(db) {
  const out = { integrity_check: [], quick_check: [] };
  try {
    out.integrity_check = db.prepare("PRAGMA integrity_check").all().map((r) => r.integrity_check);
  } catch (err) {
    out.integrity_check = [`error: ${String(err && err.message || err)}`];
  }
  try {
    out.quick_check = db.prepare("PRAGMA quick_check").all().map((r) => r.quick_check);
  } catch (err) {
    out.quick_check = [`error: ${String(err && err.message || err)}`];
  }
  return out;
}

/**
 * Count rows in each EXPECTED_TABLES entry. Tables that don't exist (schema
 * drift) get { ok:false, reason } — this is signal, not failure.
 */
export function getDbCounts(db) {
  const counts = {};
  let haveSchema = true;
  for (const tbl of EXPECTED_TABLES) {
    try {
      const r = db.prepare("SELECT COUNT(*) AS n FROM " + tbl).get();
      counts[tbl] = { ok: true, count: r.n };
    } catch (err) {
      counts[tbl] = { ok: false, count: 0, reason: String(err && err.message || err).slice(0, 200) };
      haveSchema = false;
    }
  }
  return { counts, haveSchema };
}

// ──────────────────────────────────────────────────────────────────────
// JSON probe — same guarded shape as loadSqliteDB
// ──────────────────────────────────────────────────────────────────────

/**
 * Read WORK_CLAIMS.json + count entries in `claims`. Returns
 * { ok, count, schemaVersion, updatedAt } or { ok:false, reason }.
 * Pre-H8 schema is `{ claims:{...}, schemaVersion, updatedAt }` — claims is
 * an object keyed by resource path.
 */
export function getJsonCounts(absPath) {
  if (!existsSync(absPath)) {
    return { ok: false, reason: `WORK_CLAIMS not found: ${absPath}` };
  }
  let raw;
  try { raw = readFileSync(absPath, "utf8"); }
  catch (err) { return { ok: false, reason: `read failed: ${String(err && err.message || err)}` }; }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (err) { return { ok: false, reason: `parse failed: ${String(err && err.message || err)}` }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "json root is not an object" };
  }
  const claims = parsed.claims;
  if (!claims || typeof claims !== "object") {
    // Treat empty-or-missing claims as 0 (valid post-migration state).
    return { ok: true, count: 0, schemaVersion: parsed.schemaVersion || null, updatedAt: parsed.updatedAt || null };
  }
  return {
    ok: true,
    count: Object.keys(claims).length,
    schemaVersion: parsed.schemaVersion || null,
    updatedAt: parsed.updatedAt || null,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Divergence math — pure
// ──────────────────────────────────────────────────────────────────────

/**
 * Compute |db - json| / max(db, json) as a percentage. When both are 0,
 * returns 0 (no division-by-zero, fully in-sync). When one is 0, returns
 * 100 (max divergence).
 */
export function computeDivergence(dbCount, jsonCount) {
  const a = Number.isFinite(dbCount) ? Math.max(0, Math.floor(dbCount)) : 0;
  const b = Number.isFinite(jsonCount) ? Math.max(0, Math.floor(jsonCount)) : 0;
  const denom = Math.max(a, b);
  if (denom === 0) return { dbCount: a, jsonCount: b, absDelta: 0, divergencePct: 0 };
  const absDelta = Math.abs(a - b);
  const divergencePct = (absDelta / denom) * 100;
  return { dbCount: a, jsonCount: b, absDelta, divergencePct };
}

/**
 * Convert health probe results into operator-actionable alert strings.
 * Empty array = clean. Each alert has severity (info|warn|alert) + message.
 */
export function generateAlerts({ integrity, dbCounts, divergence, jsonStatus, dbStatus, thresholdPct = DIVERGENCE_ALERT_PCT }) {
  const alerts = [];
  if (!dbStatus.ok) {
    alerts.push({ severity: "alert", message: `coordination.db unreadable: ${dbStatus.reason}` });
    return alerts;
  }
  if (!jsonStatus.ok) {
    alerts.push({ severity: "warn", message: `WORK_CLAIMS.json unreadable: ${jsonStatus.reason} (db is sole source — retirement candidate)` });
  }
  if (integrity) {
    const ic = integrity.integrity_check.filter((s) => s !== "ok");
    if (ic.length > 0) {
      alerts.push({ severity: "alert", message: `PRAGMA integrity_check FAILED: ${ic.slice(0, 3).join("; ")}` });
    }
    const qc = integrity.quick_check.filter((s) => s !== "ok");
    if (qc.length > 0) {
      alerts.push({ severity: "alert", message: `PRAGMA quick_check FAILED: ${qc.slice(0, 3).join("; ")}` });
    }
  }
  if (dbCounts && !dbCounts.haveSchema) {
    const missing = Object.entries(dbCounts.counts).filter(([, v]) => !v.ok).map(([k]) => k);
    alerts.push({ severity: "alert", message: `H8 schema drift — missing tables: ${missing.join(", ")}` });
  }
  if (divergence && divergence.divergencePct >= thresholdPct) {
    alerts.push({
      severity: "alert",
      message: `row-count divergence ${divergence.divergencePct.toFixed(1)}% >= ${thresholdPct}% (db=${divergence.dbCount}, json=${divergence.jsonCount}, |Δ|=${divergence.absDelta})`,
    });
  }
  return alerts;
}

// ──────────────────────────────────────────────────────────────────────
// Empty payload for ok:false branches — keeps consumer keys present.
// ──────────────────────────────────────────────────────────────────────

function emptyHealthShape() {
  return {
    schemaVersion: 1,
    db: { ok: false, bytes: 0, mtime: null, integrity: null, counts: { claims: { ok: false, count: 0 }, presence: { ok: false, count: 0 }, meta: { ok: false, count: 0 } }, haveSchema: false },
    json: { ok: false, count: 0, schemaVersion: null, updatedAt: null },
    divergence: { dbCount: 0, jsonCount: 0, absDelta: 0, divergencePct: 0 },
    alerts: [],
    retirement_candidate: false,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Top-level orchestrator
// ──────────────────────────────────────────────────────────────────────

function resolveAbsPath(repo, override, fallback) {
  if (!override) return join(repo, fallback);
  return pathIsAbsolute(override) ? override : join(repo, override);
}

export async function buildHealthReport(opts = {}) {
  const repo = opts.repo || DEFAULT_REPO;
  const dbPath = resolveAbsPath(repo, opts.db, DEFAULT_DB);
  const jsonPath = resolveAbsPath(repo, opts.jsonClaims, DEFAULT_JSON_CLAIMS);
  const generatedAt = opts.frozenTime || new Date().toISOString();
  const thresholdPct = typeof opts.thresholdPct === "number" ? opts.thresholdPct : DIVERGENCE_ALERT_PCT;

  const dbStatus = await loadSqliteDB(dbPath, opts);
  if (!dbStatus.ok) {
    const jsonStatus = getJsonCounts(jsonPath);
    return {
      ok: false,
      reason: `db: ${dbStatus.reason}`,
      generated_at: generatedAt,
      db_path: dbPath.replace(/\\/g, "/"),
      json_path: jsonPath.replace(/\\/g, "/"),
      ...emptyHealthShape(),
      json: jsonStatus.ok
        ? { ok: true, count: jsonStatus.count, schemaVersion: jsonStatus.schemaVersion, updatedAt: jsonStatus.updatedAt }
        : { ok: false, count: 0, schemaVersion: null, updatedAt: null, reason: jsonStatus.reason },
      alerts: generateAlerts({ integrity: null, dbCounts: null, divergence: null, jsonStatus, dbStatus, thresholdPct }),
    };
  }

  let integrity, dbCounts;
  try {
    integrity = queryIntegrity(dbStatus.db);
    dbCounts = getDbCounts(dbStatus.db);
  } finally {
    try { dbStatus.db.close(); } catch {}
  }

  const jsonStatus = getJsonCounts(jsonPath);
  const dbClaimsCount = dbCounts.counts.claims.ok ? dbCounts.counts.claims.count : 0;
  const jsonClaimsCount = jsonStatus.ok ? jsonStatus.count : 0;
  const divergence = computeDivergence(dbClaimsCount, jsonClaimsCount);
  const alerts = generateAlerts({ integrity, dbCounts, divergence, jsonStatus, dbStatus: { ok: true }, thresholdPct });

  // Retirement candidate when: integrity ok AND schema present AND json count is 0
  // (db is sole source AND json has nothing left to migrate).
  const integrityOk = integrity.integrity_check.every((s) => s === "ok") && integrity.quick_check.every((s) => s === "ok");
  const retirementCandidate = integrityOk && dbCounts.haveSchema && jsonClaimsCount === 0 && dbClaimsCount > 0;

  return {
    ok: true,
    schemaVersion: 1,
    generated_at: generatedAt,
    db_path: dbPath.replace(/\\/g, "/"),
    json_path: jsonPath.replace(/\\/g, "/"),
    db: {
      ok: true,
      bytes: dbStatus.bytes,
      mtime: new Date(dbStatus.mtime).toISOString(),
      integrity,
      counts: dbCounts.counts,
      haveSchema: dbCounts.haveSchema,
    },
    json: jsonStatus.ok
      ? { ok: true, count: jsonStatus.count, schemaVersion: jsonStatus.schemaVersion, updatedAt: jsonStatus.updatedAt }
      : { ok: false, count: 0, schemaVersion: null, updatedAt: null, reason: jsonStatus.reason },
    divergence,
    alerts,
    retirement_candidate: retirementCandidate,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Markdown render
// ──────────────────────────────────────────────────────────────────────

export function renderMarkdown(report) {
  if (!report.ok) {
    const lines = [];
    lines.push("# COORD_DB_HEALTH");
    lines.push("");
    lines.push(`**ERROR:** ${report.reason}`);
    lines.push("");
    lines.push(`Generated: ${report.generated_at}`);
    if (report.alerts && report.alerts.length > 0) {
      lines.push("");
      lines.push("## Alerts");
      for (const a of report.alerts) lines.push(`- **${a.severity.toUpperCase()}** — ${a.message}`);
    }
    return lines.join("\n") + "\n";
  }
  const lines = [];
  lines.push("# Coordination Store Health");
  lines.push("");
  lines.push(`> Generated: ${report.generated_at}`);
  lines.push(`> Source: \`scripts/coord-db-sentinel.mjs\``);
  lines.push(`> DB     : \`${report.db_path}\` (${report.db.bytes} bytes, mtime ${report.db.mtime})`);
  lines.push(`> JSON   : \`${report.json_path}\` (count=${report.json.count}, schemaVersion=${report.json.schemaVersion})`);
  lines.push("");
  lines.push("## Integrity");
  lines.push("");
  lines.push(`- \`PRAGMA integrity_check\`: ${report.db.integrity.integrity_check.join(", ")}`);
  lines.push(`- \`PRAGMA quick_check\`    : ${report.db.integrity.quick_check.join(", ")}`);
  lines.push("");
  lines.push("## Row counts");
  lines.push("");
  lines.push("| Table | DB rows | OK |");
  lines.push("|-------|--------:|:--:|");
  for (const tbl of EXPECTED_TABLES) {
    const c = report.db.counts[tbl];
    lines.push(`| ${tbl} | ${c.count} | ${c.ok ? "✓" : "✗"} |`);
  }
  lines.push("");
  lines.push("## Divergence (db.claims vs WORK_CLAIMS.json.claims)");
  lines.push("");
  lines.push(`- DB claims rows : **${report.divergence.dbCount}**`);
  lines.push(`- JSON claims    : **${report.divergence.jsonCount}**`);
  lines.push(`- Absolute Δ     : ${report.divergence.absDelta}`);
  lines.push(`- Divergence %   : ${report.divergence.divergencePct.toFixed(2)}%`);
  lines.push("");
  if (report.alerts.length === 0) {
    lines.push("## Alerts");
    lines.push("");
    lines.push("_None — coordination state is healthy._");
  } else {
    lines.push("## Alerts");
    lines.push("");
    for (const a of report.alerts) lines.push(`- **${a.severity.toUpperCase()}** — ${a.message}`);
  }
  if (report.retirement_candidate) {
    lines.push("");
    lines.push("> 🟢 **Retirement candidate** — db is sole authoritative store; WORK_CLAIMS.json can be safely deleted.");
  }
  lines.push("");
  lines.push("> Advisory only — divergence flags state mismatch but does not auto-reconcile.");
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────
// Atomic write (PID + ts + 3 random bytes — collision-safe)
// ──────────────────────────────────────────────────────────────────────

export function writeAtomic(absPath, content) {
  const dir = dirname(absPath);
  mkdirSync(dir, { recursive: true });
  const tmp = `${absPath}.tmp-${process.pid}-${Date.now()}-${randomBytes(3).toString("hex")}`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, absPath);
}

// ──────────────────────────────────────────────────────────────────────
// CLI entry
// ──────────────────────────────────────────────────────────────────────

export async function runCli(argv = process.argv, opts = {}) {
  const args = parseArgs(argv);
  const repo = opts.repo || DEFAULT_REPO;
  const report = await buildHealthReport({
    repo,
    db: args.db || opts.db,
    jsonClaims: args.jsonClaims || opts.jsonClaims,
    frozenTime: args.frozenTime,
    databaseFactory: opts.databaseFactory,
    sqliteModule: opts.sqliteModule,
    thresholdPct: opts.thresholdPct,
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return report;
  }

  const outJson = join(repo, DEFAULT_OUT_JSON);
  const outMd = join(repo, DEFAULT_OUT_MD);
  try {
    writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
    writeAtomic(outMd, renderMarkdown(report));
  } catch (err) {
    process.stderr.write(`coord-db-sentinel: write failed — ${String(err && err.message || err)}\n`);
    process.exitCode = 0;
  }

  if (report.ok) {
    process.stdout.write(
      `coord-db-sentinel: integrity=${report.db.integrity.integrity_check[0]} db.claims=${report.divergence.dbCount} json.claims=${report.divergence.jsonCount} divergence=${report.divergence.divergencePct.toFixed(1)}% alerts=${report.alerts.length}${report.retirement_candidate ? " retire=READY" : ""}\n`,
    );
  } else {
    process.stdout.write(`coord-db-sentinel: not ok — ${report.reason}\n`);
  }
  return report;
}

// Cross-platform CLI-vs-import detection: pathToFileURL normalizes Windows
// backslashes / forward-slash mixing / relative paths to a canonical href.
const invokedDirectly = (() => {
  try {
    if (!process.argv[1]) return false;
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  void runCli().catch((err) => {
    process.stderr.write(`coord-db-sentinel: unhandled — ${String(err && err.stack || err)}\n`);
    process.exitCode = 0;
  });
}
