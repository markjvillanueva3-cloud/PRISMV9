#!/usr/bin/env node
/**
 * drain-local-transcripts-tribal.mjs -- autonomous, resumable bulk drain of the
 * ON-DISK lecture-VIDEO transcripts (.vtt / .srt) into tribal knowledge.
 *
 * CAD-LEARNING-AI/U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN (slot:india 2026-06-25).
 *
 * The operator wants the /learn pipeline to "include videos and other reputable
 * sources ... from MIT and other college courses." The MIT-OCW + college corpus
 * under H:/prism/resources ships its lecture videos as caption files -- 351 of
 * them (236 .vtt + 115 .srt) -- which the PDF-only drain (drain-resources-tribal)
 * ignores. This is the SIBLING drain for that gap: same proven downstream
 * (chunk-pdf-text-to-nodes -> generate-pdf-tribal-tips-hermes -> embed), different
 * source enumerator (transcripts) + extractor (transcript-file-extract, pure JS --
 * no python text-layer step needed).
 *
 * Each run:
 *   1. picks the next --max-files not-yet-attempted .vtt/.srt under the roots
 *   2. extracts each via extractTranscriptFile (reuses parseVtt; adds parseSrt)
 *   3. chunks each (per-file domain) -> generator nodes (chunk-pdf-text-to-nodes)
 *   4. generates tips via Ollama (generate-pdf-tribal-tips-hermes --ollama-only)
 *   5. embeds the delta into the SHARED tribal-embed-index (hash-skip idempotent)
 *
 * "Only add NEW knowledge" (operator) is structural, not best-effort: the
 * per-file attempted cursor + the generator's chunk-sha8 cursor + the embedder's
 * content-hash skip all dedup. A transcript already drained (or whose chunk text
 * matches an existing PDF chunk) produces nothing new.
 *
 * Fully resumable: attempted-file cursor (this script) + generator chunk cursor +
 * embedder hash-skip. A reaper/session kill resumes next run. A run-lock
 * (dead-PID-aware steal) stops two scheduled runs colliding. Ollama-first (R5 --
 * $0 Claude). Separate WORK_DIR + LOCK from the PDF drain so the two never fight.
 *
 * Usage:
 *   node scripts/drain-local-transcripts-tribal.mjs                  # one bounded batch (default 4 files)
 *   node scripts/drain-local-transcripts-tribal.mjs --max-files 6
 *   node scripts/drain-local-transcripts-tribal.mjs --status         # progress only, no work
 *   node scripts/drain-local-transcripts-tribal.mjs --max-chunks-per-doc 20
 *   node scripts/drain-local-transcripts-tribal.mjs --no-embed       # generate only; cron embeds
 *
 * @milestone CAD-LEARNING-AI/U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractTranscriptFile } from "./lib/transcript-file-extract.mjs";
import { classify } from "./build-cad-cam-resources-pdf-index.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const ROOTS = { resources: "H:/prism/resources", "jm-die": "H:/PRISM/JM DIE" };
const WORK_DIR = path.join(ROOT, "state", "shared", "transcript-tribal-tips");
const CURSOR = path.join(WORK_DIR, "transcript-drain-cursor.json");
const NODES_DIR = path.join(WORK_DIR, "transcript-drain-nodes");
const PROGRESS_LOG = path.join(WORK_DIR, "transcript-drain-progress.jsonl");
const LOCK = path.join(WORK_DIR, "transcript-drain.lock");
const LOCK_STALE_MS = 45 * 60 * 1000; // a run is bounded to ~15min; 45min = surely dead
const NODE = process.execPath;
const DEFAULT_MAX_FILES = 4;
const WALK_MAX = 5000; // hard cap protects against runaway recursion

// Bundled library/runtime trees that hold no lecture transcripts -- skip wholesale
// (mirrors the resources-index walker's skip set).
const SKIP_DIRS = new Set([
  "node_modules", "site-packages", "bin", "Lib", "dist",
  "venv", "__pycache__", ".git", "mpl-data", "images",
]);
const TRANSCRIPT_RE = /\.(vtt|srt)$/i;

/** Recursively collect transcript files under d into `out` (capped). */
export function walkTranscripts(d, out, max = WALK_MAX, fsImpl = fs) {
  if (out.length >= max) return;
  let xs;
  try { xs = fsImpl.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const x of xs) {
    if (out.length >= max) return;
    if (x.name.startsWith(".") || SKIP_DIRS.has(x.name)) continue;
    const ff = path.join(d, x.name);
    if (x.isDirectory()) walkTranscripts(ff, out, max, fsImpl);
    else if (TRANSCRIPT_RE.test(x.name)) out.push(ff);
  }
}

/**
 * Resolve {domain, software} for a transcript path. resources-root transcripts
 * reuse the canonical index `classify` (so MIT COURSES -> training/mit-ocw);
 * jm-die transcripts (rare) default to training. Pure.
 */
export function transcriptDomain(absPath, source) {
  if (source === "resources") {
    const rel = path.relative(ROOTS.resources, absPath).replace(/\\/g, "/");
    const { domain, software } = classify(rel);
    return { domain, software };
  }
  return { domain: "training", software: "lecture-transcript" };
}

/**
 * Build the candidate worklist from already-walked absolute paths, in stable,
 * yield-first order (LARGER first = more lecture content per run, then abs for a
 * deterministic resume tiebreak -- no Date/random). Pure.
 * @param {Array<{abs:string, source:string, sizeBytes:number}>} found
 */
export function buildCandidates(found) {
  return found
    .map((f) => {
      const { domain, software } = transcriptDomain(f.abs, f.source);
      return { abs: f.abs, source: f.source, sizeBytes: f.sizeBytes || 0, domain, software };
    })
    .sort((a, b) => (b.sizeBytes - a.sizeBytes) || (a.abs < b.abs ? -1 : a.abs > b.abs ? 1 : 0));
}

/** Pick the next N not-yet-attempted candidates given a cursor's `attempted` map. Pure. */
export function pickNext(candidates, attempted, maxFiles) {
  const out = [];
  for (const c of candidates) {
    if (attempted[c.abs]) continue;
    out.push(c);
    if (out.length >= maxFiles) break;
  }
  return out;
}

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}
function writeJsonAtomic(p, obj) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, p);
}

/** Is a PID still alive? signal-0 probe (Windows + POSIX). EPERM = alive-but-not-ours. */
export function pidAlive(pid) {
  if (!pid || Number.isNaN(pid)) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; }
}

/**
 * Acquire a run-lock. Returns false ONLY if a LIVE peer run holds a fresh lock.
 * A dead-PID lock (holder reaped/killed mid-run) is stolen immediately -- age is
 * only a fallback for a live-but-wedged holder. (Same discipline as the PDF drain,
 * whose dead-lock bug froze it 48 min on 2026-06-24.)
 */
function acquireLock() {
  try {
    const st = fs.statSync(LOCK);
    const heldPid = parseInt(String(fs.readFileSync(LOCK, "utf8")).trim(), 10);
    const fresh = Date.now() - st.mtimeMs < LOCK_STALE_MS;
    if (fresh && pidAlive(heldPid)) return false; // a LIVE peer run owns it
    fs.rmSync(LOCK, { force: true });             // stale OR dead-pid -> steal
  } catch { /* no lock */ }
  try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); return true; }
  catch { return false; }
}
function releaseLock() { try { fs.rmSync(LOCK, { force: true }); } catch { /* ignore */ } }

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: opts.timeout || 20 * 60 * 1000, ...opts });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "", error: r.error };
}

export function main(argv = process.argv.slice(2)) {
  const flags = { maxFiles: DEFAULT_MAX_FILES, status: false, maxChunksPerDoc: null, noEmbed: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--max-files") flags.maxFiles = parseInt(argv[++i], 10);
    else if (a === "--max-chunks-per-doc") flags.maxChunksPerDoc = parseInt(argv[++i], 10);
    else if (a === "--status") flags.status = true;
    else if (a === "--no-embed") flags.noEmbed = true;
  }

  // Enumerate transcripts across both roots.
  const found = [];
  for (const [source, root] of Object.entries(ROOTS)) {
    if (!fs.existsSync(root)) continue;
    const abs = [];
    walkTranscripts(root, abs, WALK_MAX);
    for (const f of abs) {
      const sizeBytes = (() => { try { return fs.statSync(f).size; } catch { return 0; } })();
      found.push({ abs: f, source, sizeBytes });
    }
  }
  const candidates = buildCandidates(found);
  const cursor = readJson(CURSOR, { schemaVersion: "1.0.0", attempted: {}, stats: { extracted: 0, failed: 0, drained: 0 } });

  const attemptedN = Object.keys(cursor.attempted).length;
  const okN = Object.values(cursor.attempted).filter((a) => a && a.ok).length;
  if (flags.status) {
    console.log(JSON.stringify({ ok: true, totalTranscripts: candidates.length, attempted: attemptedN, textOk: okN, remaining: candidates.length - attemptedN, stats: cursor.stats }, null, 2));
    return;
  }

  if (!acquireLock()) { console.log("[transcript-drain] another run holds the lock (fresh) -- skipping this tick"); return; }
  const onSignal = () => { releaseLock(); process.exit(143); };
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  try {
    fs.mkdirSync(NODES_DIR, { recursive: true });
    const batch = pickNext(candidates, cursor.attempted, flags.maxFiles);
    if (!batch.length) { console.log(`[transcript-drain] DONE -- all ${candidates.length} transcripts attempted (${okN} had text). Nothing to do.`); return; }
    console.log(`[transcript-drain] batch=${batch.length} of ${candidates.length - attemptedN} remaining (${attemptedN} attempted)`);

    let newNodes = 0;
    for (const c of batch) {
      // 1. extract one transcript's clean prose (pure JS, no subprocess).
      const row = extractTranscriptFile(c.abs);
      cursor.attempted[c.abs] = { ok: row.ok, chars: row.chars || 0, format: row.format, reason: row.reason };
      if (row.ok) {
        cursor.stats.extracted++;
        // 2. write the one-row jsonl (PDF-extractor shape) + chunk it with the
        //    transcript's own domain (so MIT lectures land in the training domain).
        const exJsonl = path.join(WORK_DIR, `_transcript-ex-${process.pid}.jsonl`);
        fs.writeFileSync(exJsonl, JSON.stringify({ path: c.abs, text: row.text, ok: true, chars: row.chars }) + "\n");
        const chunkArgs = [path.join(ROOT, "scripts/chunk-pdf-text-to-nodes.mjs"), "--in", exJsonl, "--out-dir", NODES_DIR, "--domain", c.domain, "--software", c.software || "lecture-transcript"];
        if (flags.maxChunksPerDoc) chunkArgs.push("--max-chunks-per-doc", String(flags.maxChunksPerDoc));
        const ch = run(NODE, chunkArgs);
        try { const m = JSON.parse(ch.stdout.trim()); newNodes += (m && m.nodes) || 0; } catch { /* ignore */ }
        try { fs.rmSync(exJsonl, { force: true }); } catch { /* ignore */ }
      } else {
        cursor.stats.failed++;
      }
      writeJsonAtomic(CURSOR, cursor); // checkpoint after EACH file (resumable)
    }

    // 3. generate tips over ALL pending nodes (generator cursor skips drained chunks).
    const genConc = process.env.PRISM_TRIBAL_DRAIN_CONCURRENCY || "8";
    const gen = run(NODE, [path.join(ROOT, "scripts/generate-pdf-tribal-tips-hermes.mjs"), "--concurrency", genConc, "--ollama-only"], { env: { ...process.env, PRISM_TRIBAL_SOURCE_DIR: NODES_DIR }, timeout: 25 * 60 * 1000 });
    const genTail = (gen.stdout || "").trim().split("\n").slice(-1)[0] || "";

    // 4. embed the delta into the SHARED index (hash-skip idempotent). SKIPPED
    //    under --no-embed -- the decoupled monitor cron owns the index rewrite.
    let embTail = flags.noEmbed ? "[skipped --no-embed; cron embeds]" : "";
    if (!flags.noEmbed) {
      const emb = run(NODE, [path.join(ROOT, "scripts/embed-pdf-tribal-tips-into-index.mjs")], { timeout: 20 * 60 * 1000 });
      embTail = (emb.stdout || "").split("\n").filter((l) => l.includes("[summary]")).slice(-1)[0] || "";
    }

    cursor.stats.drained += batch.filter((c) => cursor.attempted[c.abs] && cursor.attempted[c.abs].ok).length;
    writeJsonAtomic(CURSOR, cursor);
    const rec = { batch: batch.length, newNodes, gen: genTail.slice(0, 120), embed: embTail.slice(0, 160), remaining: candidates.length - Object.keys(cursor.attempted).length };
    fs.appendFileSync(PROGRESS_LOG, JSON.stringify(rec) + "\n");
    console.log(`[transcript-drain] ${JSON.stringify(rec)}`);
  } finally {
    releaseLock();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error("[transcript-drain][fatal]", String(e && e.message ? e.message : e)); process.exit(1); }
}
