#!/usr/bin/env node
/**
 * migrate-claims-to-sqlite.mjs — HOOK-SYNERGY-MS0 / U-HOOK-COORD-SQLITE (H8)
 *
 * One-shot seeder for `CoordinationStoreEngine`'s SQLite database from the
 * legacy `state/shared/WORK_CLAIMS.json` store. Idempotent — running it twice
 * produces the same final state.
 *
 * USAGE
 *   node H:/prism/scripts/migrate-claims-to-sqlite.mjs
 *   node H:/prism/scripts/migrate-claims-to-sqlite.mjs --source <path> --db <path>
 *   node H:/prism/scripts/migrate-claims-to-sqlite.mjs --dry-run     # parse + report, no writes
 *
 * FLAGS
 *   --source <path>   Override the JSON source (default state/shared/WORK_CLAIMS.json)
 *   --db <path>       Override the SQLite destination (default state/shared/coordination.db)
 *   --dry-run         Parse + report without opening the DB
 *
 * EXIT CODES
 *   0   Success (rowsUpserted may be 0 if the source was empty — that's still success)
 *   1   Source unreadable or unparseable
 *   2   Destination DB could not be opened
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const HARNESS_ROOT = "H:/prism";
const DEFAULT_SOURCE = path.join(HARNESS_ROOT, "state/shared/WORK_CLAIMS.json");
const DEFAULT_DB = path.join(HARNESS_ROOT, "state/shared/coordination.db");
const ENGINE_BUNDLE = path.join(HARNESS_ROOT, "mcp-server/dist/engines/CoordinationStoreEngine.js");

// ── arg parsing ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function valueOf(flag, def) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}
const sourcePath = valueOf("--source", DEFAULT_SOURCE);
const dbPath = valueOf("--db", DEFAULT_DB);
const dryRun = args.includes("--dry-run");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`migrate-claims-to-sqlite.mjs — SQLite WAL seeder (HOOK-SYNERGY-MS0 / H8)

Usage:
  node scripts/migrate-claims-to-sqlite.mjs [--source <path>] [--db <path>] [--dry-run]

Defaults:
  --source ${DEFAULT_SOURCE}
  --db     ${DEFAULT_DB}

Dry-run parses the source and prints what *would* be inserted; no writes.`);
  process.exit(0);
}

// ── dry-run: parse only ─────────────────────────────────────────────────────

if (dryRun) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`error: source not found: ${sourcePath}`);
    process.exit(1);
  }
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8")); }
  catch (err) { console.error(`error: parse failed: ${err.message}`); process.exit(1); }

  const claims = parsed?.claims;
  if (!claims || typeof claims !== "object") {
    console.error(`error: source has no "claims" key`);
    process.exit(1);
  }
  const keys = Object.keys(claims);
  console.log(`dry-run:`);
  console.log(`  source: ${sourcePath}`);
  console.log(`  destination (would write to): ${dbPath}`);
  console.log(`  rows in source: ${keys.length}`);
  let withSession = 0;
  for (const k of keys) {
    const c = claims[k];
    if (c?.session_id || c?.by) withSession++;
  }
  console.log(`  rows with session_id|by: ${withSession}`);
  console.log(`  rows that would be skipped (no session id): ${keys.length - withSession}`);
  process.exit(0);
}

// ── load engine bundle ──────────────────────────────────────────────────────

if (!fs.existsSync(ENGINE_BUNDLE)) {
  console.error(`error: engine bundle not found at ${ENGINE_BUNDLE}`);
  console.error(`hint:  cd mcp-server && ./node_modules/.bin/esbuild src/engines/CoordinationStoreEngine.ts --bundle=false --outfile=dist/engines/CoordinationStoreEngine.js --format=esm --platform=node --target=node18`);
  process.exit(2);
}

let mod;
try { mod = await import(pathToFileURL(ENGINE_BUNDLE).href); }
catch (err) {
  console.error(`error: engine import failed: ${err.message ?? err}`);
  process.exit(2);
}

const { CoordinationStoreEngine } = mod;

// ── run the migration ──────────────────────────────────────────────────────

let engine;
try {
  engine = new CoordinationStoreEngine({ dbPath });
} catch (err) {
  console.error(`error: failed to open destination DB at ${dbPath}: ${err.message ?? err}`);
  process.exit(2);
}

const before = engine.counts();
const result = engine.migrateFromJson(sourcePath);
const after = engine.counts();

console.log(`migrate-claims-to-sqlite — ${result.source}`);
console.log(`  destination:    ${engine.getDbPath()}`);
console.log(`  schema version: ${after.schemaVersion}`);
console.log(`  rows read:      ${result.rowsRead}`);
console.log(`  rows upserted:  ${result.rowsUpserted}`);
console.log(`  rows skipped:   ${result.rowsSkipped}`);
console.log(`  claims (before/after): ${before.claims} -> ${after.claims}`);

if (result.warnings.length > 0) {
  console.log(`  warnings (${result.warnings.length}):`);
  for (const w of result.warnings.slice(0, 20)) console.log(`    - ${w}`);
}

engine.close();
process.exit(0);
