#!/usr/bin/env node
// extraction-intake.mjs -- EXTRACTION-INTAKE-MS0 (slot:bravo, 2026-06-12)
//
// Auto-enforcement INTAKE: drains extraction-produced wiki entries into the LIVE
// tribal embed index so extracted knowledge becomes RAG-retrievable + galaxy-routed
// instead of sitting inert in knowledge/wiki/ + *-tips-fallback.json. Closes the
// gap found 2026-06-12: youtube-free-extract reported "ingested into
// TribalKnowledgeEngine: 0" on every run (its engine.ingest() path is dead), so
// 24+ extracted wiki entries never reached the searchable index.
//
// The heavy lifting -- read md -> inferDomain() galaxy tag -> nomic-embed -> safe
// clobber-guarded index write -- is done by the EXISTING
// .claude/scripts/tribal-embed-index.mjs --add <path>, which is idempotent
// (hash-skips unchanged entries) and already uses the V8-cap-safe loadTribalIndex
// + clobber-guarded writeTribalIndex (the 29,723->1 / 33,639->1 regression fixes).
// This runner just DISCOVERS new extraction wiki entries + drives --add on the
// un-indexed ones. It never writes the index directly.
//
// Usage:
//   node scripts/extraction-intake.mjs              # drain new entries (bounded)
//   node scripts/extraction-intake.mjs --max 100    # bigger batch
//   node scripts/extraction-intake.mjs --dry-run    # list what would be added
//   node scripts/extraction-intake.mjs --dir <d> --prefix youtube-   # custom source
//   node scripts/extraction-intake.mjs --all        # every code-tribal md (no prefix)
//
// Fail-soft: per-entry errors are logged + skipped; one bad file never aborts the run.
// Cross-worktree: set PRISM_EXTRACTION_INTAKE_ROOT to the tree that holds the live
// index (the 537MB tribal index is gitignored + maintained in H:/prism, not the
// slot worktree) -- defaults to this script's repo root.
//
// Knobs: PRISM_EXTRACTION_INTAKE_DISABLE=1 | PRISM_EXTRACTION_INTAKE_MAX=N |
//        PRISM_EXTRACTION_INTAKE_ROOT=<repo> | PRISM_EXTRACTION_INTAKE_VERBOSE=1

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = (process.env.PRISM_EXTRACTION_INTAKE_ROOT || path.resolve(__dirname, ".."))
  .replace(/\\/g, "/");
const INDEX_PATH = path.join(ROOT, "state/shared/tribal-embed-index.json");
const TRIBAL_CLI = path.join(ROOT, ".claude/scripts/tribal-embed-index.mjs");
const DEFAULT_DIR = path.join(ROOT, "knowledge/wiki/code-tribal");
const DEFAULT_PREFIX = "youtube-"; // extraction-produced wiki entries
const ADD_TIMEOUT_MS = 180000;     // per --add (embed can be slow on a cold model)
const DEFAULT_MAX = 50;            // entries per run (bounded; re-run to advance)
const HEAP_MB = Number(process.env.PRISM_EXTRACTION_INTAKE_HEAP_MB) || 8192; // the 537MB index OOMs default heap

/**
 * Pure: true when this process must re-exec itself with a larger heap. Loading the
 * 537MB+ tribal index (loadTribalIndex parses every entry) OOMs node's default ~1GB
 * heap. Returns false once already re-exec'd (loop guard) or the heap flag is present.
 */
export function shouldReexecForHeap(env = process.env, execArgv = process.execArgv) {
  if (env.PRISM_EXTRACTION_INTAKE_REEXEC === "1") return false;
  if ((execArgv || []).some((a) => String(a).startsWith("--max-old-space-size"))) return false;
  return true;
}

/**
 * Pure: the tribal-index id a wiki md path resolves to. Mirrors readMdEntry() in
 * tribal-embed-index.mjs exactly: id = `wiki:<repo-relative-path>` (forward slashes).
 */
export function wikiIdFor(absPath, root = ROOT) {
  const p = String(absPath).replace(/\\/g, "/");
  const r = String(root).replace(/\\/g, "/").replace(/\/$/, "");
  const rel = p.startsWith(r + "/") ? p.slice(r.length + 1) : p;
  return `wiki:${rel}`;
}

/**
 * Pure: of the candidate md paths, return those whose wiki-id is NOT already in the
 * index id set. (An empty/failed id set -> return all; --add then hash-skips dupes.)
 */
export function selectUnindexed(candidatePaths, indexedIds, root = ROOT) {
  const have = indexedIds instanceof Set ? indexedIds : new Set(indexedIds || []);
  return (candidatePaths || []).filter((p) => !have.has(wikiIdFor(p, root)));
}

/** Pure: parse argv into options. */
export function parseArgs(argv) {
  const a = {
    max: Number(process.env.PRISM_EXTRACTION_INTAKE_MAX) || DEFAULT_MAX,
    dryRun: false, prefix: DEFAULT_PREFIX, dir: DEFAULT_DIR,
  };
  for (let i = 0; i < (argv || []).length; i++) {
    const v = argv[i];
    if (v === "--max") a.max = Number(argv[++i]) || a.max;
    else if (v === "--dry-run") a.dryRun = true;
    else if (v === "--all") a.prefix = "";
    else if (v === "--prefix") a.prefix = argv[++i] ?? "";
    else if (v === "--dir") a.dir = path.resolve(argv[++i] || a.dir);
  }
  return a;
}

/** List candidate md files in a dir filtered by prefix. Returns [] on a missing dir (fail-soft). */
export function listCandidates(dir, prefix, readdir = fs.readdirSync) {
  try {
    return readdir(dir)
      .filter((f) => f.endsWith(".md") && (!prefix || f.startsWith(prefix)))
      .map((f) => path.join(dir, f).replace(/\\/g, "/"))
      .sort();
  } catch {
    return [];
  }
}

/** Load the set of ids already in the live tribal index. Fail-soft: returns empty Set. */
async function loadIndexedIds() {
  try {
    const { loadTribalIndex } = await import(pathToFileURL(path.join(ROOT, "scripts/lib/load-tribal-index.mjs")).href);
    const idx = loadTribalIndex(INDEX_PATH, fs);
    return new Set((idx.entries || []).map((e) => e && e.id).filter(Boolean));
  } catch (e) {
    console.error(`[extraction-intake] index id-set unavailable (${e?.message || e}); --add will hash-skip dupes`);
    return new Set();
  }
}

/** Drive tribal-embed-index.mjs --add on one md file. Returns {ok,status,out,err}. */
function addOne(absPath) {
  const r = spawnSync(process.execPath, [`--max-old-space-size=${HEAP_MB}`, TRIBAL_CLI, "--add", absPath], {
    encoding: "utf8", timeout: ADD_TIMEOUT_MS,
  });
  return { ok: r.status === 0, status: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

async function main() {
  if (process.env.PRISM_EXTRACTION_INTAKE_DISABLE === "1") { console.log("[extraction-intake] disabled"); return; }
  const verbose = process.env.PRISM_EXTRACTION_INTAKE_VERBOSE === "1";
  const a = parseArgs(process.argv.slice(2));
  const candidates = listCandidates(a.dir, a.prefix);
  const indexed = await loadIndexedIds();
  const todo = selectUnindexed(candidates, indexed).slice(0, a.max);
  console.log(`[extraction-intake] root=${ROOT} candidates=${candidates.length} indexed=${indexed.size} to-add=${todo.length} (max ${a.max})`);
  if (a.dryRun) { todo.forEach((p) => console.log(`  would add: ${path.basename(p)}`)); return; }
  let added = 0, unchanged = 0, failed = 0;
  for (const p of todo) {
    try {
      const r = addOne(p);
      if (r.ok) {
        if (/unchanged/.test(r.out)) unchanged++; else added++;
        if (verbose) console.log(`  ${/unchanged/.test(r.out) ? "skip" : "add"}: ${path.basename(p)}`);
      } else {
        failed++;
        console.error(`  [fail] ${path.basename(p)}: status=${r.status} ${r.err.slice(0, 200)}`);
      }
    } catch (e) {
      failed++;
      console.error(`  [err] ${path.basename(p)}: ${e?.message || e}`);
    }
  }
  console.log(`[extraction-intake] done: added=${added} unchanged=${unchanged} failed=${failed}`);
}

// Only run main() when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (shouldReexecForHeap()) {
    // Re-launch once with a larger heap so loadTribalIndex (537MB index) does not OOM.
    const r = spawnSync(
      process.execPath,
      [`--max-old-space-size=${HEAP_MB}`, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
      { stdio: "inherit", env: { ...process.env, PRISM_EXTRACTION_INTAKE_REEXEC: "1" } },
    );
    process.exit(r.status ?? 0);
  }
  main().catch((e) => { console.error(`[extraction-intake] fatal: ${e?.message || e}`); process.exit(1); });
}
