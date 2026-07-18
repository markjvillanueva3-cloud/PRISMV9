#!/usr/bin/env node
/**
 * drain-resources-tribal.mjs -- autonomous, resumable bulk tribal-knowledge drain.
 *
 * PDF-TRIBAL-HERMES/U-TRIBAL-OVERNIGHT-DRAIN (slot:zulu 2026-06-24).
 *
 * Drives the FULL resources-PDF -> tribal-tip -> L1-index pipeline in BOUNDED,
 * RESUMABLE batches so a scheduled task can run it every ~20 min overnight and
 * make steady progress without supervision. Each run:
 *   1. picks the next --max-pdfs not-yet-attempted text PDFs (resources index)
 *   2. extracts each text layer (pdf-text-layer-extract.py; scans -> marked done,
 *      they need vision OCR which is a different pipeline)
 *   3. chunks each (per-PDF domain) -> generator nodes
 *   4. generates tips via Ollama (generate-pdf-tribal-tips-hermes.mjs --ollama-only)
 *   5. embeds the delta into tribal-embed-index.json (hash-skip/idempotent)
 *
 * Fully resumable: an attempted-PDF cursor (this script) + the generator's chunk
 * cursor (tips.jsonl sha8s) + the embedder's hash-skip. A reaper/session kill at
 * any point just resumes next run. A run-lock (skip-if-fresh) stops two scheduled
 * runs from colliding. Ollama-first per R5 (no Claude tokens spent on the drain).
 *
 * Usage:
 *   node scripts/drain-resources-tribal.mjs                 # one bounded batch (default 6 PDFs)
 *   node scripts/drain-resources-tribal.mjs --max-pdfs 10
 *   node scripts/drain-resources-tribal.mjs --status        # progress only, no work
 *   node scripts/drain-resources-tribal.mjs --max-chunks-per-doc 40   # cap huge catalogs
 *
 * Env: PRISM_EMBED_CONCURRENCY * PRISM_TRIBAL_DRAIN_CONCURRENCY (generator)
 *
 * @milestone PDF-TRIBAL-HERMES/U-TRIBAL-OVERNIGHT-DRAIN
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const INDEX = path.join(ROOT, "mcp-server", "data", "state", "cad-cam-resources-pdf-index.json");
const WORK_DIR = path.join(ROOT, "state", "shared", "pdf-tribal-tips");
const CURSOR = path.join(WORK_DIR, "resources-drain-cursor.json");
const NODES_DIR = path.join(WORK_DIR, "resources-drain-nodes");
const PROGRESS_LOG = path.join(WORK_DIR, "resources-drain-progress.jsonl");
const LOCK = path.join(WORK_DIR, "resources-drain.lock");
const LOCK_STALE_MS = 45 * 60 * 1000; // a run is bounded to ~15min; 45min = surely dead
const PY = process.env.PRISM_PORTABLE_PY || "H:/Tools/python/python.exe";
const NODE = process.execPath;
const DEFAULT_MAX_PDFS = 6;

// Verified 2026-06-24: most resources PDFs are thin CAD tool-drawings (e.g.
// H4Y4A0750.pdf, "SECTION A-A" + dimension callouts) whose text layer yields 0
// machining knowledge. The GOLD is clean-text operator manuals/handbooks/guides
// (one Haas operator manual gave ~600 tips). Tooling CATALOGS are valuable too but
// huge (170-271MB) + image-heavy (sparse text, slow extract) -> a SECOND tier so
// the clean mid-size manuals drain FIRST and produce tips fast overnight.
const CLEAN_PROSE = /manual|handbook|guide|programming|machining|fundamental|reference|operator|machinist|instruction|\bcourse\b|textbook|training[\s_-]?(?:manual|guide|book)/i;
const CATALOG = /catalog|catalogue|tooling[\s_-]?systems/i;

/**
 * Priority for overnight yield (lower = drained sooner). Tier dominates: clean
 * prose manuals (0) -> tooling catalogs (1) -> everything else incl thin drawings
 * (2). Within a tier, resources-root over jm-die, non-blueprint over blueprint.
 * So the drain spends its early ticks on real knowledge, not dimension callouts. Pure.
 */
export function drainPriority(x) {
  const p = x.relPath || "";
  const tier = CLEAN_PROSE.test(p) ? 0 : CATALOG.test(p) ? 1 : 2;
  const isResources = x.source === "resources" ? 0 : 1;
  const isBlueprint = /blueprint/i.test(x.domain || "") ? 1 : 0;
  return tier * 4 + isResources * 2 + isBlueprint; // 0=clean/resources/non-bp .. 11=drawing/jm-die/blueprint
}

/** Build the worklist of candidate PDFs from the resources index, in stable, yield-first order. */
export function candidatePdfs(index, roots) {
  const abs = (x) => `${roots[x.source] || ""}/${x.relPath}`;
  return (index.entries || [])
    .filter((x) => /\.pdf$/i.test(x.relPath || ""))
    .map((x) => ({ abs: abs(x), domain: x.domain || "manufacturing", relPath: x.relPath, source: x.source, sizeBytes: x.sizeBytes || 0 }))
    // priority tier first (prose manuals before thin drawings), then LARGER first
    // within a tier (more text = more tips), then abs for a deterministic,
    // reproducible-resume tiebreak (no Date/random).
    .sort((a, b) => drainPriority(a) - drainPriority(b) || (b.sizeBytes - a.sizeBytes) || (a.abs < b.abs ? -1 : a.abs > b.abs ? 1 : 0));
}

/** Pick the next N not-yet-attempted candidates given a cursor's `attempted` map. */
export function pickNext(candidates, attempted, maxPdfs) {
  const out = [];
  for (const c of candidates) {
    if (attempted[c.abs]) continue;
    out.push(c);
    if (out.length >= maxPdfs) break;
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
 * A dead-PID lock (the holder was reaped/killed mid-run -- SIGTERM does not fire
 * the finally release) is stolen IMMEDIATELY, not after LOCK_STALE_MS -- otherwise
 * one task-limit kill blocks the next ~2 scheduled ticks for 45 min (observed
 * 2026-06-24: pid 77620 held a dead lock 48 min, freezing the drain). Age is only
 * a fallback for a live-but-wedged holder.
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
  const flags = { maxPdfs: DEFAULT_MAX_PDFS, status: false, maxChunksPerDoc: null, noEmbed: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--max-pdfs") flags.maxPdfs = parseInt(argv[++i], 10);
    else if (a === "--max-chunks-per-doc") flags.maxChunksPerDoc = parseInt(argv[++i], 10);
    else if (a === "--status") flags.status = true;
    // Decouple the fast producer (extract+chunk+generate) from the slow consumer
    // (the ~1.18GB full-index embed). With --no-embed the drain tick only
    // generates tips into tips.jsonl (resumable, no index rewrite), and a SEPARATE
    // cadence (the 30-min monitor cron) runs the embed -- so a tick's time budget
    // is never eaten by an index rewrite that then gets killed before it finishes.
    else if (a === "--no-embed") flags.noEmbed = true;
  }

  const index = readJson(INDEX, null);
  if (!index || !index.roots) { console.error("[drain] resources index not found:", INDEX); process.exit(2); }
  const candidates = candidatePdfs(index, index.roots);
  const cursor = readJson(CURSOR, { schemaVersion: "1.0.0", attempted: {}, stats: { extracted: 0, failed: 0, drained: 0 } });

  const attemptedN = Object.keys(cursor.attempted).length;
  const okN = Object.values(cursor.attempted).filter((a) => a && a.ok).length;
  if (flags.status) {
    console.log(JSON.stringify({ ok: true, totalPdfs: candidates.length, attempted: attemptedN, textOk: okN, remaining: candidates.length - attemptedN, stats: cursor.stats }, null, 2));
    return;
  }

  if (!acquireLock()) { console.log("[drain] another run holds the lock (fresh) -- skipping this tick"); return; }
  // Release the lock if the scheduled-task ExecutionTimeLimit (or a reaper) kills
  // us mid-run -- otherwise the dead lock blocks the next ticks (the bug fixed above).
  const onSignal = () => { releaseLock(); process.exit(143); };
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  try {
    fs.mkdirSync(NODES_DIR, { recursive: true });
    const batch = pickNext(candidates, cursor.attempted, flags.maxPdfs);
    if (!batch.length) { console.log(`[drain] DONE -- all ${candidates.length} PDFs attempted (${okN} had text). Nothing to do.`); return; }
    console.log(`[drain] batch=${batch.length} of ${candidates.length - attemptedN} remaining (${attemptedN} attempted)`);

    let newNodes = 0;
    for (const c of batch) {
      // 1. extract one PDF's text layer
      const wl = path.join(WORK_DIR, `_drain-wl-${process.pid}.txt`);
      fs.writeFileSync(wl, c.abs + "\n");
      const outJsonl = path.join(WORK_DIR, `_drain-ex-${process.pid}.jsonl`);
      try { fs.rmSync(outJsonl, { force: true }); } catch { /* ignore */ }
      run(PY, [path.join(ROOT, "scripts/lib/pdf-text-layer-extract.py"), "--worklist", wl, "--out", outJsonl, "--min-chars", "200"], { timeout: 10 * 60 * 1000 });
      let row = null;
      try { const line = fs.readFileSync(outJsonl, "utf8").split("\n").find((l) => l.trim()); row = line ? JSON.parse(line) : null; } catch { /* none */ }
      const ok = !!(row && row.ok && row.text);
      cursor.attempted[c.abs] = { ok, chars: (row && row.chars) || 0, reason: row && row.reason };
      if (ok) {
        cursor.stats.extracted++;
        // 2. chunk into the shared nodes dir with the PDF's own domain
        const chunkArgs = [path.join(ROOT, "scripts/chunk-pdf-text-to-nodes.mjs"), "--in", outJsonl, "--out-dir", NODES_DIR, "--domain", c.domain];
        if (flags.maxChunksPerDoc) chunkArgs.push("--max-chunks-per-doc", String(flags.maxChunksPerDoc));
        const ch = run(NODE, chunkArgs);
        try { const m = JSON.parse(ch.stdout.trim()); newNodes += (m && m.nodes) || 0; } catch { /* ignore */ }
      } else {
        cursor.stats.failed++;
      }
      try { fs.rmSync(wl, { force: true }); fs.rmSync(outJsonl, { force: true }); } catch { /* ignore */ }
      writeJsonAtomic(CURSOR, cursor); // checkpoint after EACH pdf (resumable)
    }

    // 3. generate tips over ALL pending nodes (generator cursor skips drained chunks)
    const genConc = process.env.PRISM_TRIBAL_DRAIN_CONCURRENCY || "8";
    const gen = run(NODE, [path.join(ROOT, "scripts/generate-pdf-tribal-tips-hermes.mjs"), "--concurrency", genConc, "--ollama-only"], { env: { ...process.env, PRISM_TRIBAL_SOURCE_DIR: NODES_DIR }, timeout: 25 * 60 * 1000 });
    const genTail = (gen.stdout || "").trim().split("\n").slice(-1)[0] || "";

    // 4. embed the delta (self-reexecs heap; hash-skip idempotent). SKIPPED under
    // --no-embed -- the decoupled cadence (monitor cron) owns the index rewrite so
    // a generate-heavy tick is never killed mid-embed. Tips stay durable in tips.jsonl.
    let embTail = flags.noEmbed ? "[skipped --no-embed; cron embeds]" : "";
    if (!flags.noEmbed) {
      const emb = run(NODE, [path.join(ROOT, "scripts/embed-pdf-tribal-tips-into-index.mjs")], { timeout: 20 * 60 * 1000 });
      embTail = (emb.stdout || "").split("\n").filter((l) => l.includes("[summary]")).slice(-1)[0] || "";
    }

    cursor.stats.drained += batch.filter((c) => cursor.attempted[c.abs] && cursor.attempted[c.abs].ok).length;
    writeJsonAtomic(CURSOR, cursor);
    const rec = { batch: batch.length, newNodes, gen: genTail.slice(0, 120), embed: embTail.slice(0, 160), remaining: candidates.length - Object.keys(cursor.attempted).length };
    fs.appendFileSync(PROGRESS_LOG, JSON.stringify(rec) + "\n");
    console.log(`[drain] ${JSON.stringify(rec)}`);
  } finally {
    releaseLock();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error("[drain][fatal]", String(e && e.message ? e.message : e)); process.exit(1); }
}
