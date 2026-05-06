#!/usr/bin/env node
/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U01 — csm-inventory driver.
 *
 * Walks H: for `*.claude/memory.db` and `*.swarm/memory.db` files, opens
 * each via better-sqlite3, extracts schema fingerprint + row count, then
 * emits a JSON summary + markdown report via CSMMemoryDBAuditEngine.
 *
 * Usage:
 *   node scripts/csm-inventory.mjs \
 *     [--root H:/]                                   # Scan root (default H:/)
 *     [--max-depth 8]                                # Walk depth cap
 *     [--report-out state/shared/CSM_INVENTORY.md]   # Markdown report path
 *     [--json-out state/shared/CSM_INVENTORY.json]   # JSON summary path
 *     [--no-write]                                   # Print only; skip file writes
 *
 * Output (stdout): JSON summary { ok, totalDBs, readableDBs, schemaVariantCount, byClass, errors }.
 *
 * @module scripts/csm-inventory
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

// Paths to skip during the walk — node_modules + git internals + Windows bin
// holding pens that never contain our target files.
const SKIP_DIR_NAMES = new Set([
  "node_modules", ".git", "$RECYCLE.BIN", "System Volume Information",
  ".pnpm-store", ".cache",
]);
// Filename targets — exact matches.
const TARGET_FILENAME = "memory.db";

function parseArgs(argv) {
  const out = {
    root: "H:/",
    maxDepth: 8,
    reportOut: "H:/prism/state/shared/CSM_INVENTORY.md",
    jsonOut: "H:/prism/state/shared/CSM_INVENTORY.json",
    noWrite: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") out.root = argv[++i] ?? out.root;
    else if (a === "--max-depth") {
      const n = Number.parseInt(argv[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) out.maxDepth = n;
    }
    else if (a === "--report-out") out.reportOut = argv[++i] ?? out.reportOut;
    else if (a === "--json-out") out.jsonOut = argv[++i] ?? out.jsonOut;
    else if (a === "--no-write") out.noWrite = true;
  }
  return out;
}

function walkForMemoryDBs(rootDir, maxDepth) {
  const found = [];
  function recurse(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile()) {
        if (e.name === TARGET_FILENAME) found.push(full);
      } else if (e.isDirectory()) {
        if (SKIP_DIR_NAMES.has(e.name)) continue;
        recurse(full, depth + 1);
      }
    }
  }
  recurse(rootDir, 0);
  return found;
}

/**
 * Inspect one DB file via better-sqlite3. Returns a DBReport. Never throws —
 * inspection failures land in the report's `error` field so a single broken
 * DB doesn't abort the whole walk.
 */
async function inspectDB(dbPath, engine) {
  const report = {
    path: dbPath.replace(/\\/g, "/"),
    exists: false,
    sizeBytes: 0,
    lastModifiedISO: "",
    rowCount: null,
    schemaFingerprint: null,
    tableNames: [],
    error: "",
  };
  let stat;
  try { stat = fs.statSync(dbPath); report.exists = true; }
  catch (err) {
    report.error = String(err?.message ?? err).slice(0, 200);
    return report;
  }
  report.sizeBytes = stat.size;
  report.lastModifiedISO = stat.mtime.toISOString();

  let Database;
  try { ({ default: Database } = await import("better-sqlite3")); }
  catch (err) {
    report.error = `better-sqlite3 not available: ${String(err?.message ?? err).slice(0, 150)}`;
    return report;
  }

  let db;
  try { db = new Database(dbPath, { readonly: true, fileMustExist: true }); }
  catch (err) {
    report.error = `open: ${String(err?.message ?? err).slice(0, 200)}`;
    return report;
  }

  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    const tableMeta = [];
    let totalRows = 0;
    for (const t of tables) {
      const tableName = String(t.name);
      report.tableNames.push(tableName);
      let colCount = 0;
      try {
        const cols = db.prepare(`PRAGMA table_info("${tableName.replace(/"/g, '""')}")`).all();
        colCount = cols.length;
      } catch { /* table_info failed — colCount stays 0 */ }
      tableMeta.push({ name: tableName, colCount });
      try {
        const r = db.prepare(`SELECT COUNT(*) AS n FROM "${tableName.replace(/"/g, '""')}"`).get();
        if (r && typeof r.n === "number") totalRows += r.n;
      } catch { /* count failed — keep going */ }
    }
    report.rowCount = totalRows;
    report.schemaFingerprint = engine.buildSchemaFingerprint(tableMeta);
  } catch (err) {
    report.error = `inspect: ${String(err?.message ?? err).slice(0, 200)}`;
  } finally {
    try { db.close(); } catch { /* ignore close error */ }
  }
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "engines", "CSMMemoryDBAuditEngine.js");
  if (!fs.existsSync(distPath)) {
    console.log(JSON.stringify({
      ok: false,
      error: "engine-not-built",
      message: `CSMMemoryDBAuditEngine compiled artifact not found at ${distPath}. Run npm run build:fast first.`,
    }, null, 2));
    process.exit(2);
  }
  const { csmMemoryDBAuditEngine } = await import(pathToFileURL(distPath).href);

  if (!fs.existsSync(args.root)) {
    console.log(JSON.stringify({
      ok: false,
      error: "root-not-found",
      message: `Scan root not found: ${args.root}`,
    }, null, 2));
    process.exit(2);
  }

  const dbPaths = walkForMemoryDBs(args.root, args.maxDepth);
  const reports = [];
  for (const p of dbPaths) {
    reports.push(await inspectDB(p, csmMemoryDBAuditEngine));
  }
  const summary = csmMemoryDBAuditEngine.summarize(reports);
  const markdown = csmMemoryDBAuditEngine.formatReport(reports, summary);

  const result = {
    ok: true,
    root: args.root,
    found: dbPaths.length,
    summary,
    reports,
    errors: reports.filter((r) => r.error.length > 0).map((r) => ({ path: r.path, error: r.error })),
  };

  if (!args.noWrite) {
    try {
      fs.mkdirSync(path.dirname(args.reportOut), { recursive: true });
      fs.writeFileSync(args.reportOut, markdown);
      fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
      fs.writeFileSync(args.jsonOut, JSON.stringify(result, null, 2));
      result.outputs = { reportPath: args.reportOut, jsonPath: args.jsonOut };
    } catch (err) {
      result.ok = false;
      result.errors.push({ phase: "write-output", error: String(err?.message ?? err) });
    }
  }

  // Always print compact summary to stdout (full reports are in --json-out).
  const compact = {
    ok: result.ok,
    root: result.root,
    found: result.found,
    summary: result.summary,
    errors: result.errors,
    outputs: result.outputs ?? "(--no-write set; no files written)",
  };
  console.log(JSON.stringify(compact, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.log(JSON.stringify({
    ok: false,
    error: "unhandled",
    message: String(err?.message ?? err),
    stack: String(err?.stack ?? "").slice(0, 2000),
  }, null, 2));
  process.exit(1);
});
