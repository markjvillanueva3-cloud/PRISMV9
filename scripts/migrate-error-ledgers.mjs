#!/usr/bin/env node
/**
 * migrate-error-ledgers.mjs — one-shot merge into UNIFIED_ERROR_LEDGER
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P2-U01.
 *
 * Walks the four legacy error silos (any that exist), normalizes each
 * row into a UnifiedErrorLedgerEntry, and appends to
 * `mcp-server/data/state/UNIFIED_ERROR_LEDGER.jsonl`. Originals are
 * preserved in place AND copied to a sibling `.deprecated` so the
 * migration is reversible.
 *
 * Sources walked:
 *   - mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl    (source: learner)
 *   - mcp-server/data/state/error-memory.json           (source: pattern_memory)
 *   - {USERPROFILE|HOME}/.claude/learning/error-recovery.json (source: recovery)
 *   - state/shared/session-learning-log.jsonl           (source: session)
 *
 * The script is idempotent: a content hash of every emitted entry is
 * tracked in `UNIFIED_ERROR_LEDGER.index.json`, so re-running never
 * appends duplicates.
 *
 * Usage:
 *   node scripts/migrate-error-ledgers.mjs           # migrate
 *   node scripts/migrate-error-ledgers.mjs --dry-run # report only
 *   node scripts/migrate-error-ledgers.mjs --keep-original # skip .deprecated copy
 *
 * Exit:
 *   0 — JSON summary on stdout
 *   1 — fatal (cannot write target)
 *   2 — invalid args
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P2-U01
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const STATE_DIR = "H:/prism/mcp-server/data/state";
const TARGET = path.join(STATE_DIR, "UNIFIED_ERROR_LEDGER.jsonl");
const INDEX = path.join(STATE_DIR, "UNIFIED_ERROR_LEDGER.index.json");
const HOME = (process.env.USERPROFILE ?? process.env.HOME ?? "").replace(/\\/g, "/");

const SOURCES = [
  { path: path.join(STATE_DIR, "ERROR_LEARN_LEDGER.jsonl"), kind: "jsonl", source: "learner" },
  { path: path.join(STATE_DIR, "error-memory.json"), kind: "json-error-memory", source: "pattern_memory" },
  { path: HOME ? `${HOME}/.claude/learning/error-recovery.json` : "", kind: "json-recovery", source: "recovery" },
  { path: "H:/prism/state/shared/session-learning-log.jsonl", kind: "jsonl-session", source: "session" },
];

function parseArgs(argv) {
  const out = { dryRun: false, keepOriginal: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--keep-original") out.keepOriginal = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: node scripts/migrate-error-ledgers.mjs [--dry-run] [--keep-original]\n");
      process.exit(0);
    } else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      process.exit(2);
    }
  }
  return out;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function loadIndex() {
  if (!fs.existsSync(INDEX)) return { hashes: {}, schemaVersion: "1.0.0" };
  try { return JSON.parse(fs.readFileSync(INDEX, "utf8")); }
  catch { return { hashes: {}, schemaVersion: "1.0.0" }; }
}

function saveIndex(idx) {
  fs.writeFileSync(INDEX, JSON.stringify(idx, null, 2));
}

function hashEntry(e) {
  const stable = JSON.stringify({ source: e.source, signature: e.signature, ts: e.ts, tool: e.tool ?? "" });
  return createHash("sha1").update(stable).digest("hex").slice(0, 16);
}

function buildSignature({ errorClass, message, tool }) {
  const cls = (errorClass ?? "").trim();
  const msg = (message ?? "").trim().split(/\r?\n/)[0]?.trim() ?? "";
  const t = (tool ?? "").trim();
  const dropPaths = (s) => s.replace(/[A-Z]:[\\/][^\s"']+/g, "<path>");
  return dropPaths([t, cls, msg].filter(Boolean).join(" :: ")).slice(0, 240) || "unknown-error";
}

function* iterJsonl(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try { yield JSON.parse(line); } catch { /* skip malformed */ }
  }
}

function normalizeLearner(row, source) {
  return {
    id: row.id ? String(row.id) : `learn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: row.timestamp ?? row.ts ?? new Date().toISOString(),
    source,
    tool: row.tool ?? row.command ?? row.dispatcher ?? undefined,
    context: { ...row, _origin: "ERROR_LEARN_LEDGER" },
    signature: buildSignature({ errorClass: row.errorClass ?? row.class, message: row.message ?? row.error, tool: row.tool }),
    embedding_id: null,
  };
}

function normalizeRecovery(row, source) {
  return {
    id: row.id ? String(row.id) : `recovery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: row.timestamp ?? row.ts ?? new Date().toISOString(),
    source,
    tool: row.tool ?? row.action ?? undefined,
    context: { ...row, _origin: "error-recovery.json" },
    signature: buildSignature({ errorClass: row.errorClass ?? row.class, message: row.message ?? row.error ?? row.symptom, tool: row.tool }),
    embedding_id: null,
  };
}

function normalizePatternMemory(parsed, source) {
  // error-memory.json may be: {errors:[], hotspots:{}, patterns:{}, ...}
  const out = [];
  if (Array.isArray(parsed.errors)) {
    for (const row of parsed.errors) {
      out.push({
        id: row.id ? String(row.id) : `pat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ts: row.ts ?? row.timestamp ?? new Date().toISOString(),
        source,
        tool: row.tool ?? row.action ?? undefined,
        context: { ...row, _origin: "error-memory.json" },
        signature: buildSignature({ errorClass: row.errorClass ?? row.class, message: row.message ?? row.error, tool: row.tool }),
        embedding_id: null,
      });
    }
  }
  if (parsed.patterns && typeof parsed.patterns === "object") {
    for (const [key, val] of Object.entries(parsed.patterns)) {
      out.push({
        id: `pat-pattern-${key}`,
        ts: val?.lastSeen ?? val?.ts ?? new Date().toISOString(),
        source,
        tool: val?.tool ?? undefined,
        context: { pattern_key: key, ...val, _origin: "error-memory.json:patterns" },
        signature: buildSignature({ errorClass: "pattern", message: key }),
        embedding_id: null,
      });
    }
  }
  return out;
}

function normalizeSession(row, source) {
  // session-learning-log.jsonl rows may have error_fix_pairs[] of {error, fix, tool}
  const out = [];
  const baseCtx = { event_id: row.event_id, session_id: row.session_id, agent_id: row.agent_id, ts: row.timestamp };
  if (Array.isArray(row.error_fix_pairs)) {
    for (const pair of row.error_fix_pairs) {
      const errStr = typeof pair.error === "string" ? pair.error : (pair.error?.message ?? JSON.stringify(pair.error ?? ""));
      out.push({
        id: `sess-${row.event_id ?? Date.now()}-${out.length}`,
        ts: row.timestamp ?? new Date().toISOString(),
        source,
        tool: pair.tool ?? pair.action ?? undefined,
        context: { ...baseCtx, fix: pair.fix, _origin: "session-learning-log.jsonl" },
        signature: buildSignature({ errorClass: "session", message: errStr, tool: pair.tool }),
        embedding_id: null,
      });
    }
  }
  return out;
}

function processSource(spec, stats) {
  const r = { source: spec.source, file: spec.path, exists: false, raw: 0, normalized: 0, error: null };
  if (!spec.path || !fs.existsSync(spec.path)) {
    stats.bySource.push(r);
    return [];
  }
  r.exists = true;
  const out = [];
  try {
    if (spec.kind === "jsonl") {
      for (const row of iterJsonl(spec.path)) {
        r.raw++;
        out.push(normalizeLearner(row, spec.source));
      }
    } else if (spec.kind === "jsonl-session") {
      for (const row of iterJsonl(spec.path)) {
        r.raw++;
        out.push(...normalizeSession(row, spec.source));
      }
    } else if (spec.kind === "json-recovery") {
      const parsed = JSON.parse(fs.readFileSync(spec.path, "utf8"));
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.errors) ? parsed.errors : Object.values(parsed);
      for (const row of items) {
        if (!row || typeof row !== "object") continue;
        r.raw++;
        out.push(normalizeRecovery(row, spec.source));
      }
    } else if (spec.kind === "json-error-memory") {
      const parsed = JSON.parse(fs.readFileSync(spec.path, "utf8"));
      r.raw = (Array.isArray(parsed.errors) ? parsed.errors.length : 0)
        + (parsed.patterns ? Object.keys(parsed.patterns).length : 0);
      out.push(...normalizePatternMemory(parsed, spec.source));
    }
    r.normalized = out.length;
  } catch (e) {
    r.error = e?.message ?? String(e);
  }
  stats.bySource.push(r);
  return out;
}

function appendToLedger(entries, idx, args) {
  let appended = 0;
  let dedup = 0;
  let lines = [];
  for (const e of entries) {
    const h = hashEntry(e);
    if (idx.hashes[h]) { dedup++; continue; }
    idx.hashes[h] = { ts: e.ts, source: e.source };
    lines.push(JSON.stringify(e));
    appended++;
  }
  if (!args.dryRun && lines.length > 0) {
    ensureDir(path.dirname(TARGET));
    fs.appendFileSync(TARGET, lines.join("\n") + "\n");
    saveIndex(idx);
  }
  return { appended, dedup };
}

function deprecateOriginals(args, stats) {
  if (args.dryRun || args.keepOriginal) return;
  for (const r of stats.bySource) {
    if (!r.exists || r.error) continue;
    const dep = r.file + ".deprecated";
    if (fs.existsSync(dep)) continue;
    try { fs.copyFileSync(r.file, dep); }
    catch (e) { r.error = `deprecate-copy-failed: ${e?.message ?? e}`; }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  ensureDir(STATE_DIR);
  const idx = loadIndex();
  const stats = {
    target: TARGET,
    indexFile: INDEX,
    bySource: [],
    totalRaw: 0,
    totalNormalized: 0,
    appended: 0,
    deduped: 0,
    dryRun: args.dryRun,
    keepOriginal: args.keepOriginal,
  };

  let allEntries = [];
  for (const spec of SOURCES) {
    const entries = processSource(spec, stats);
    allEntries = allEntries.concat(entries);
  }
  stats.totalRaw = stats.bySource.reduce((a, b) => a + (b.raw ?? 0), 0);
  stats.totalNormalized = allEntries.length;

  const { appended, dedup } = appendToLedger(allEntries, idx, args);
  stats.appended = appended;
  stats.deduped = dedup;

  deprecateOriginals(args, stats);

  process.stdout.write(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${e?.message ?? e}\n`);
  process.exit(1);
});
