#!/usr/bin/env node
// KNOWLEDGE-VAULT-MS0/U-VAULT06 — Vault-rot sentinel (slot:sierra, 2026-06-06).
//
// Read-only auditor for the dunik "vault-rot" pattern: a note is ROTTING when it
// is BOTH stale (file mtime older than STALE_DAYS, default 90) AND orphaned
// (zero inbound [[wikilinks]] from anywhere in memory+wiki). Such notes are
// dead weight — old knowledge nobody links to — and dilute recall.
//
// NEVER deletes or moves anything (per [[feedback_never_delete_only_disable]]).
// Emits a triage report (state/shared/vault-rot-report.json) + console summary;
// the operator decides what to archive. Reuses the alias-aware [[target|alias]]
// extraction + normId from promote-memory-to-wiki.mjs so there is ONE source of
// truth for wikilink parsing (the lesson from U-VAULT-ALIAS-LINK-FIX: a second,
// drifting regex silently under-counts links).
//
// CLI:
//   node scripts/vault-rot-sentinel.mjs                  # report (default)
//   node scripts/vault-rot-sentinel.mjs --stale-days 60  # tighter threshold
//   node scripts/vault-rot-sentinel.mjs --json           # machine report
//   node scripts/vault-rot-sentinel.mjs --include-wiki   # also flag wiki notes
//   node scripts/vault-rot-sentinel.mjs --write          # persist report JSON
// Knobs: PRISM_VAULT_ROT_STALE_DAYS=<N> (default 90).

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { extractWikilinkTargets, normId } from "./promote-memory-to-wiki.mjs";

const DEFAULT_MEMORY_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_WIKI_ROOT = "H:/prism/knowledge/wiki";
const DEFAULT_REPORT = "H:/prism/state/shared/vault-rot-report.json";
const DEFAULT_STALE_DAYS = 90;
const MS_PER_DAY = 86_400_000;

function walkMd(root, { readdirImpl = readdirSync } = {}) {
  const out = [];
  let entries;
  try { entries = readdirImpl(root, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) {
      if (/^(_archive|archive|quarantine|\.)/i.test(e.name)) continue;
      out.push(...walkMd(p, { readdirImpl }));
    } else if (e.isFile() && /\.md$/i.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

function isIndexFile(fileName) {
  const b = basename(String(fileName)).toLowerCase();
  return b === "memory.md" || b === "memory-archive.md" || b === "memory-recent.md" ||
    b === "index.md" || b === "log.md";
}

// Identifiers a note can be referenced by: filename-no-ext + `name:` frontmatter.
function noteIdentifiers(fileName, raw) {
  const ids = new Set([normId(basename(String(fileName)))]);
  const m = raw.slice(0, 600).match(/^name:\s*(.+?)\s*$/m);
  if (m) ids.add(normId(m[1].replace(/^["']|["']$/g, "")));
  ids.delete("");
  return ids;
}

// Resolve a note's authored timestamp (ms). The C:->H: memory mirror REWRITES
// files constantly, so filesystem mtime is a useless staleness signal for the
// memory namespace (everything looks fresh). Prefer an authored date from
// frontmatter, then a YYYY-MM-DD stamp in the filename, then mtime as last resort.
export function resolveCreatedMs(fileName, raw, mtimeMs) {
  const head = String(raw).slice(0, 800);
  // Allow leading indentation so an indented provenance `  writtenAt:` (the
  // memory-mirror provenance block) is matched, not just column-0 keys.
  const fmDate = head.match(/^[ \t]*(?:written_at|writtenAt|updated|date|promoted_at|indexed_at|created):\s*["']?(\d{4}-\d{2}-\d{2}[^"'\s]*)/m);
  if (fmDate) {
    const t = Date.parse(fmDate[1]);
    if (Number.isFinite(t)) return t;
  }
  const fnDate = basename(String(fileName)).match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
  if (fnDate) {
    const t = Date.parse(`${fnDate[1]}-${fnDate[2]}-${fnDate[3]}`);
    if (Number.isFinite(t)) return t;
  }
  return mtimeMs;
}

export function runRotScan({
  memoryRoot = DEFAULT_MEMORY_ROOT,
  wikiRoot = DEFAULT_WIKI_ROOT,
  staleDays = DEFAULT_STALE_DAYS,
  includeWiki = false,
  nowMs = Date.now(),
  readdirImpl = readdirSync,
  readFileImpl = readFileSync,
  statImpl = statSync,
} = {}) {
  // Candidate notes we judge for rot (memory always; wiki only with --include-wiki).
  const memFiles = walkMd(memoryRoot, { readdirImpl }).filter((p) => !isIndexFile(p));
  const wikiFiles = walkMd(wikiRoot, { readdirImpl }).filter((p) => !isIndexFile(p));
  const candidates = includeWiki ? [...memFiles, ...wikiFiles] : memFiles;

  // id -> candidate path, for inbound attribution.
  const idToPath = new Map();
  const meta = new Map(); // path -> { createdMs }
  for (const f of candidates) {
    let raw, st;
    try { raw = readFileImpl(f, "utf8"); st = statImpl(f); } catch { continue; }
    meta.set(f, { createdMs: resolveCreatedMs(f, raw, st.mtimeMs) });
    for (const id of noteIdentifiers(f, raw)) if (!idToPath.has(id)) idToPath.set(id, f);
  }

  // Inbound counts: scan BOTH memory and wiki (a wiki entry linking a memory
  // keeps that memory alive even when --include-wiki only judges memory notes).
  const inbound = new Map();
  for (const f of [...memFiles, ...wikiFiles]) {
    let raw;
    try { raw = readFileImpl(f, "utf8"); } catch { continue; }
    const seen = new Set();
    for (const target of extractWikilinkTargets(raw)) {
      const dest = idToPath.get(normId(target));
      if (!dest || dest === f || seen.has(dest)) continue;
      seen.add(dest);
      inbound.set(dest, (inbound.get(dest) || 0) + 1);
    }
  }

  const report = {
    staleDays, includeWiki, generatedAt: new Date(nowMs).toISOString(),
    scanned: meta.size, stale: 0, orphaned: 0, rotting: [],
  };
  for (const [f, { createdMs }] of meta) {
    const aDays = (nowMs - createdMs) / MS_PER_DAY;
    const refs = inbound.get(f) || 0;
    const isStale = Number.isFinite(aDays) && aDays > staleDays;
    const isOrphan = refs === 0;
    if (isStale) report.stale++;
    if (isOrphan) report.orphaned++;
    if (isStale && isOrphan) {
      report.rotting.push({
        file: f.replace(/\\/g, "/").replace(/^.*\/knowledge\//, "knowledge/"),
        ageDays: Math.round(aDays), inboundRefs: refs,
      });
    }
  }
  report.rotting.sort((a, b) => b.ageDays - a.ageDays);
  report.rottingCount = report.rotting.length;
  return report;
}

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseArgs(argv) {
  const out = { json: false, write: false, includeWiki: false, staleDays: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--write") out.write = true;
    else if (a === "--include-wiki") out.includeWiki = true;
    else if (a === "--stale-days") out.staleDays = parseInt(argv[++i], 10);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const staleDays = Number.isFinite(args.staleDays) ? args.staleDays
    : clampInt(process.env.PRISM_VAULT_ROT_STALE_DAYS, DEFAULT_STALE_DAYS, 1, 100000);

  const start = Date.now();
  const report = runRotScan({ staleDays, includeWiki: args.includeWiki });
  const elapsedMs = Date.now() - start;

  if (args.write) {
    if (!existsSync(dirname(DEFAULT_REPORT))) mkdirSync(dirname(DEFAULT_REPORT), { recursive: true });
    writeFileSync(DEFAULT_REPORT, JSON.stringify({ ...report, elapsedMs }, null, 2) + "\n", "utf8");
  }
  if (args.json) {
    process.stdout.write(JSON.stringify({ ...report, elapsedMs }, null, 2) + "\n");
    return;
  }

  process.stdout.write(
    `[vault-rot-sentinel] staleDays=${staleDays} includeWiki=${args.includeWiki} ` +
    `scanned=${report.scanned} stale=${report.stale} orphaned=${report.orphaned} ` +
    `ROTTING=${report.rottingCount} elapsed=${elapsedMs}ms\n`,
  );
  if (report.rottingCount > 0) {
    process.stdout.write("  (oldest 8 rotting notes — old AND zero inbound links):\n");
    report.rotting.slice(0, 8).forEach((r) => {
      process.stdout.write(`    ${r.file} (age ${r.ageDays}d, ${r.inboundRefs} refs)\n`);
    });
    process.stdout.write("  Triage manually — this sentinel NEVER deletes (never-delete-only-disable).\n");
    process.stdout.write("  Re-run with --write to persist state/shared/vault-rot-report.json.\n");
  }
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) {
  try { main(); }
  catch (err) {
    try { process.stderr.write(`[vault-rot-sentinel] ${err?.stack || err?.message || err}\n`); }
    catch { /* ignore */ }
    process.exit(1);
  }
}
