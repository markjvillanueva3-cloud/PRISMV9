#!/usr/bin/env node
// extraction-forge-detect.mjs -- EXTRACTION-FORGE-MS0 (slot:bravo 2026-06-12)
//
// Scans extraction-produced wiki entries (knowledge/wiki/code-tribal/*.md) for content
// that is a FORGE-WORTHY capability (a new engine/algorithm/formula) rather than a plain
// knowledge tip, and appends worthy candidates to state/shared/forge-queue.jsonl. The
// autonomous /loop drains that queue by running /forge-triple on each (dedup-gated by
// DuplicationGuard) -- so nothing is ever auto-built; the queue is a worthiness-gated TODO.
//
// This is the PRODUCER. The classifier (scripts/lib/forge-worthiness.mjs) is a coarse
// pre-filter; /forge-triple is the real worthiness + dedup gate when the loop drains.
//
// Light by design: reads markdown only, NEVER loads the 537MB tribal index, so no heap
// reexec. Idempotent: skips entries already in the queue (by source path).
//
// Usage:
//   node scripts/extraction-forge-detect.mjs            # scan + enqueue new candidates
//   node scripts/extraction-forge-detect.mjs --max 100
//   node scripts/extraction-forge-detect.mjs --dry-run  # classify + report, do not enqueue
//   node scripts/extraction-forge-detect.mjs --all      # every code-tribal md (not just youtube-)
//
// Knobs: PRISM_EXTRACTION_FORGE_DISABLE=1 | PRISM_EXTRACTION_INTAKE_ROOT=<repo>
//        | PRISM_EXTRACTION_FORGE_MAX=N

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { classifyForgeWorthiness, forgeActionFor } from "./lib/forge-worthiness.mjs";
import { conceptAlreadyBuilt } from "./lib/forge-dedup-prefilter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = (process.env.PRISM_EXTRACTION_INTAKE_ROOT || path.resolve(__dirname, ".."))
  .replace(/\\/g, "/");
const QUEUE_PATH = path.join(ROOT, "state/shared/forge-queue.jsonl");
const DEFAULT_DIR = path.join(ROOT, "knowledge/wiki/code-tribal");
const DEFAULT_PREFIX = "youtube-";
const DEFAULT_MAX = 50;

/** Pure: strip YAML frontmatter, return {title, body}. Mirrors tribal-embed-index readMdEntry. */
export function parseEntry(raw) {
  if (typeof raw !== "string") return { title: "", body: "" };
  let body = raw, title = "";
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end > 0) {
      const fm = raw.slice(3, end);
      body = raw.slice(end + 4);
      const tm = fm.match(/^title:\s*(.+)$/m) || fm.match(/^name:\s*(.+)$/m);
      if (tm) title = tm[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return { title, body };
}

/** Pure: the dedup key for a queue record (its source path). */
export function queueKey(rec) {
  return rec && typeof rec.sourcePath === "string" ? rec.sourcePath : "";
}

/**
 * Pure: of the classified candidates, return those whose source is NOT already queued.
 * `queuedKeys` is a Set (or array) of source paths already in the queue.
 */
export function selectNewCandidates(candidates, queuedKeys) {
  const have = queuedKeys instanceof Set ? queuedKeys : new Set(queuedKeys || []);
  return (candidates || []).filter((c) => c && c.sourcePath && !have.has(c.sourcePath));
}

function relOf(absPath) {
  const p = absPath.replace(/\\/g, "/");
  const r = ROOT.replace(/\/$/, "");
  return p.startsWith(r + "/") ? p.slice(r.length + 1) : p;
}

function listCandidates(dir, prefix) {
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".md") && (!prefix || f.startsWith(prefix)))
      .map((f) => path.join(dir, f)).sort();
  } catch { return []; }
}

/** Engine + algorithm basenames (no ext) for the dedup pre-filter. Filenames ONLY
 *  -- keeps the script "light by design" (no content read, no index load). Fail-soft. */
function listEngineNames() {
  const dirs = [
    path.join(ROOT, "mcp-server/src/engines"),
    path.join(ROOT, "mcp-server/src/algorithms"),
  ];
  const names = [];
  for (const d of dirs) {
    let entries;
    try { entries = fs.readdirSync(d); } catch { continue; }
    for (const e of entries) {
      if (!e.endsWith(".ts") || e.endsWith(".test.ts") || e === "index.ts") continue;
      names.push(e.slice(0, -3));
    }
  }
  return names;
}

/** Read the set of source paths already queued (fail-soft -> empty). */
function loadQueuedKeys() {
  try {
    return new Set(
      fs.readFileSync(QUEUE_PATH, "utf8").split("\n").filter(Boolean)
        .map((l) => { try { return queueKey(JSON.parse(l)); } catch { return ""; } })
        .filter(Boolean),
    );
  } catch { return new Set(); }
}

function parseArgs(argv) {
  const a = { max: Number(process.env.PRISM_EXTRACTION_FORGE_MAX) || DEFAULT_MAX, dryRun: false, prefix: DEFAULT_PREFIX, dir: DEFAULT_DIR };
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

function nowIso() {
  // Date is available in a normal node process (only Workflow scripts forbid it).
  return new Date().toISOString();
}

function main() {
  if (process.env.PRISM_EXTRACTION_FORGE_DISABLE === "1") { console.log("[forge-detect] disabled"); return; }
  const a = parseArgs(process.argv.slice(2));
  const files = listCandidates(a.dir, a.prefix);
  const queued = loadQueuedKeys();

  const engineNames = listEngineNames();
  const worthy = [];
  const prefiltered = [];
  for (const f of files) {
    let raw;
    try { raw = fs.readFileSync(f, "utf8"); } catch { continue; }
    const { title, body } = parseEntry(raw);
    const verdict = classifyForgeWorthiness(body, { title });
    if (!verdict.worthy) continue;
    // Dedup pre-filter: do NOT queue a concept PRISM already has (the queue used to
    // fill with already-built concepts -- a 22/22 false-positive batch 2026-06-15).
    // Conservative: only skips on a high-precision filename match; ambiguous concepts
    // still queue and /forge-triple's DuplicationGuard remains the real gate.
    const dup = conceptAlreadyBuilt(verdict.conceptName, engineNames);
    if (dup.built) {
      prefiltered.push({ conceptName: verdict.conceptName, match: dup.match, matchedOn: dup.matchedOn, sourcePath: relOf(f) });
      continue;
    }
    worthy.push({
      conceptName: verdict.conceptName, kind: verdict.kind, score: verdict.score,
      reason: verdict.reason, forgeAction: forgeActionFor(verdict),
      sourcePath: relOf(f), detectedAt: nowIso(), status: "pending",
    });
  }
  const fresh = selectNewCandidates(worthy, queued).slice(0, a.max);
  console.log(`[forge-detect] root=${ROOT} scanned=${files.length} worthy=${worthy.length} dedup-prefiltered=${prefiltered.length} already-queued=${queued.size} new=${fresh.length}`);
  // R12: name every concept the pre-filter dropped (never silently suppress).
  for (const p of prefiltered.slice(0, 25)) console.log(`  [prefilter] already-built: "${p.conceptName}" ~ ${p.match} (${p.matchedOn})`);
  if (a.dryRun) { fresh.forEach((c) => console.log(`  ${c.kind} @${c.score}: ${c.conceptName}  (${c.forgeAction})`)); return; }
  if (fresh.length === 0) return;
  try {
    fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
    fs.appendFileSync(QUEUE_PATH, fresh.map((c) => JSON.stringify(c)).join("\n") + "\n", "utf8");
    console.log(`[forge-detect] enqueued ${fresh.length} forge candidate(s) -> ${relOf(QUEUE_PATH)}`);
  } catch (e) {
    console.error(`[forge-detect] enqueue failed: ${e?.message || e}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error(`[forge-detect] fatal: ${e?.message || e}`); process.exit(1); }
}
