#!/usr/bin/env node
/**
 * drain-html-help-tribal.mjs -- CAD-LEARNING-AI/U-HTML-HELP-TRIBAL-LANE (slot:india 2026-06-26)
 * ==============================================================================
 *
 * The CAD/CAM-SOFTWARE-HELP half of the operator's "/learn pipeline on all cad and
 * engineering related sources in H:\PRISM\resources ... only add NEW knowledge"
 * directive, focused on the software the operator NAMED: Fusion 360, hyperCAD-S /
 * hyperMILL (OPEN MIND), and Mastercam.
 *
 * ## Why a NEW lane (not the running PDF drain)
 *
 * zulu's drain-resources-tribal.mjs ingests the resources PDF corpus. But the
 * operator's named CAD/CAM software ships its real procedural knowledge as HTML
 * HELP SYSTEMS (Mastercam WebHelp .htm, hyperMILL/hyperCAD-S .htm, Fusion .html) --
 * 100% INVISIBLE to a PDF pipeline. Census 2026-06-26: ~4,245 content-rich (>=1200
 * stripped chars) help docs across those three, ZERO ingested. This lane closes
 * exactly that gap and nothing else (no overlap with the PDF drain's cursor).
 *
 * ## Architecture (reuse, don't reinvent -- R8/R15 build-once)
 *
 *   walk software help dirs (language + version DEDUP) -> read + stripHtmlToText
 *   (REUSED from drain-web-sources-tribal.mjs) -> one extractor-shaped {path,text,ok,
 *   chars} row per doc -> rowToNodes (REUSED from chunk-pdf-text-to-nodes.mjs) into a
 *   dedicated nodes dir -> generate-pdf-tribal-tips-hermes.mjs (source-agnostic via
 *   PRISM_TRIBAL_SOURCE_DIR + PRISM_TRIBAL_OUT) -> html-help-tips.jsonl.
 *
 * The embed step is OWNED by embed-pdf-tribal-tips-into-index.mjs (this lane's tips
 * are wired into its collectAllTips via the "html" source), so the same shard-safe,
 * clobber-guarded, hash-skip ("only new") index writer promotes these tips to the
 * per-prompt tribal-by-domain injection surface with ZERO new index code.
 *
 * ## DEDUP -- "only add NEW knowledge" (three layers)
 *   1. LANGUAGE: keep English only (en / en-US / no-locale). A help tree ships the
 *      SAME topic in de-DE/fr-FR/ja-JP/zh-CN/... -- ingesting all would be 8x the
 *      same knowledge in languages the tribal store + reranker do not serve.
 *   2. VERSION: when the SAME relative help path exists under multiple version dirs
 *      (hyperMILL 31.0 AND 33.0), keep only the NEWEST. Older == stale duplicate.
 *   3. CONTENT: the chunker keys node sha8 on (path::chunkIdx) and the generator's
 *      resume cursor (done sha8s in html-help-tips.jsonl) skips drained chunks; the
 *      embedder's per-tip hash-skip drops unchanged tips. So a re-run is cheap and
 *      never double-ingests.
 *
 * SAFETY (instruction-source-boundary): help HTML is DATA. It is stripped to text and
 * handed to the Ollama tip-extraction prompt as CONTENT to mine for machining/CAD/CAM
 * tips -- never executed as instructions, never surfaced to the operator's chat as a
 * command. Ollama-only (--ollama-only) so the drain spends $0 Claude tokens (R5).
 *
 * Resumable + bounded: a per-doc attempted cursor (this script) + the generator's
 * chunk cursor + the embedder's hash-skip. A reaper/session kill at any point just
 * resumes next run. A run-lock (dead-PID-aware, skip-if-fresh) stops two scheduled
 * runs from colliding. Per-doc fail-soft (one bad file never blocks the batch).
 *
 * Usage:
 *   node scripts/drain-html-help-tribal.mjs --status              # coverage only, no work
 *   node scripts/drain-html-help-tribal.mjs                       # one bounded batch (default 40 docs)
 *   node scripts/drain-html-help-tribal.mjs --max-docs 80
 *   node scripts/drain-html-help-tribal.mjs --software mastercam  # one software only
 *   node scripts/drain-html-help-tribal.mjs --no-embed            # generate tips only; cron embeds
 *
 * @milestone CAD-LEARNING-AI/U-HTML-HELP-TRIBAL-LANE
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripHtmlToText } from "./drain-web-sources-tribal.mjs";
import { rowToNodes } from "./chunk-pdf-text-to-nodes.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const RESOURCES = path.join(ROOT, "resources");
const WORK_DIR = path.join(ROOT, "state", "shared", "pdf-tribal-tips");
const NODES_DIR = path.join(WORK_DIR, "html-help-nodes");
const OUT_JSONL = path.join(WORK_DIR, "html-help-tips.jsonl");
const CURSOR = path.join(WORK_DIR, "html-help-drain-cursor.json");
const PROGRESS_LOG = path.join(WORK_DIR, "html-help-drain-progress.jsonl");
const LOCK = path.join(WORK_DIR, "html-help-drain.lock");
const LOCK_STALE_MS = 45 * 60 * 1000; // bounded ~15min run; 45min = surely dead
const NODE = process.execPath;
const DEFAULT_MAX_DOCS = 40;
const MIN_RICH_CHARS = 1200;   // a help doc must strip to >= this many chars to be worth mining
const MAX_STRIP_CHARS = 60_000; // cap a single help doc's text (generator chunks it)

/**
 * The operator-named CAD/CAM software help roots. domain/software match the
 * tribal-by-domain-inject enum (cad|cam) + the cad-cam-resources-pdf-index DIR_MAP
 * so a help tip lands in the SAME domain bucket as that software's PDF tips.
 */
export const SOFTWARE_ROOTS = [
  { key: "mastercam", rel: "MasterCam", domain: "cam", software: "mastercam" },
  { key: "hypermill", rel: "OPEN MIND", domain: "cam", software: "hypermill" },
  { key: "hypermill", rel: "HYPERMILL", domain: "cam", software: "hypermill" },
  { key: "fusion360", rel: "FUSION360", domain: "cam", software: "fusion360" },
  { key: "hsmworks", rel: "HSMWorks 2026", domain: "cam", software: "hsmworks" },
];

// Non-English locale segments seen in these help trees (de-DE, fr-FR, ja-JP, ko,
// zh-CN, zh-TW, es-ES, it-IT, pt-BR, ru-RU, ...). A path segment matching this is a
// foreign-language mirror -> skip (English-only dedup layer 1).
const FOREIGN_LOCALE = /^(?:de|fr|es|it|ja|ko|zh|ru|pt|nl|pl|cs|tr|sv|hu|fi|da|no|el|th|vi|id|uk|ro|sk|bg|hr|sl|lt|lv|et)(?:[-_][a-z]{2})?$/i;
// English locale segments to ALLOW explicitly (everything else with no locale is also kept).
const ENGLISH_LOCALE = /^(?:en|en[-_](?:us|gb|au|ca))$/i;
// A version directory: "31.0", "33.0", "2026", "v2025", "X8", "mcamX8", "2027.1".
const VERSION_SEG = /^v?\d{1,4}(?:\.\d{1,3})*$|^(?:mcam)?x\d{1,2}$/i;

/** Pure: does this absolute/relative path contain a FOREIGN-language segment? */
export function isForeignLanguagePath(relPath) {
  const segs = String(relPath || "").split(/[\\/]/).filter(Boolean);
  for (const s of segs) {
    if (FOREIGN_LOCALE.test(s) && !ENGLISH_LOCALE.test(s)) return true;
  }
  return false;
}

/**
 * Pure: extract a comparable version key from a path's version-looking segments.
 * Returns the MAX numeric version tuple found (e.g. "33.0" -> [33,0]) or null.
 * Used to pick the newest of two same-topic docs that differ only by version dir.
 */
export function versionKeyOf(relPath) {
  const segs = String(relPath || "").split(/[\\/]/).filter(Boolean);
  let best = null;
  for (const s of segs) {
    if (!VERSION_SEG.test(s)) continue;
    const nums = (s.match(/\d+/g) || []).map((n) => parseInt(n, 10));
    if (!nums.length) continue;
    if (best === null || compareVersionTuples(nums, best) > 0) best = nums;
  }
  return best;
}

/** Pure: compare two numeric version tuples. >0 if a newer than b. */
export function compareVersionTuples(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

/**
 * Pure: the "topic identity" of a help doc -- its path with version + locale segments
 * REMOVED. Two docs with the same topicId are the same knowledge at different
 * versions/languages; keep only the newest English one. Lower-cased for stable keys.
 */
export function topicIdentity(relPath) {
  const segs = String(relPath || "").split(/[\\/]/).filter(Boolean)
    .filter((s) => !VERSION_SEG.test(s) && !FOREIGN_LOCALE.test(s) && !ENGLISH_LOCALE.test(s));
  return segs.join("/").toLowerCase();
}

/**
 * Pure: given a list of {relPath} HTML docs for ONE software, dedup to the
 * newest-version English copy per topic identity. English-only (drop foreign), then
 * group by topicId, then keep the entry with the highest versionKey (ties -> the
 * lexicographically-first relPath for deterministic resume). Returns kept entries.
 */
export function dedupHelpDocs(docs) {
  const byTopic = new Map();
  for (const d of docs) {
    if (isForeignLanguagePath(d.relPath)) continue; // layer 1: English only
    const topic = topicIdentity(d.relPath);
    const ver = versionKeyOf(d.relPath);
    const prev = byTopic.get(topic);
    if (!prev) { byTopic.set(topic, { ...d, _ver: ver }); continue; }
    // layer 2: keep newest version; tie -> deterministic relPath order
    const cmp = compareVersionTuples(ver || [], prev._ver || []);
    if (cmp > 0 || (cmp === 0 && d.relPath < prev.relPath)) byTopic.set(topic, { ...d, _ver: ver });
  }
  return [...byTopic.values()].sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
}

/**
 * Pure: drop docs whose path goes through a VERSION directory that has a NEWER
 * sibling version under the same parent. OPEN MIND ships parallel `<product>/31.0/`
 * and `<product>/33.0/` trees with opaque UUID filenames, so topic-identity cannot
 * collapse them -- but the directory structure can: for each (parentDir -> set of
 * version-dir names), keep only the max version; a doc passing through any
 * non-max version dir is a stale duplicate. Mastercam (single `mcamX8`) is
 * unaffected (one version per parent = always the max). Returns kept docs.
 */
export function pruneStaleVersionDirs(docs) {
  // 1. map each parent path -> set of version-segment names directly under it
  const parentVersions = new Map(); // parentKey -> Map(verName -> numeric tuple)
  for (const d of docs) {
    const segs = d.relPath.split("/");
    for (let i = 0; i < segs.length; i++) {
      if (!VERSION_SEG.test(segs[i])) continue;
      const nums = (segs[i].match(/\d+/g) || []).map((n) => parseInt(n, 10));
      if (!nums.length) continue;
      const parentKey = segs.slice(0, i).join("/"); // "" for top-level version dir
      if (!parentVersions.has(parentKey)) parentVersions.set(parentKey, new Map());
      parentVersions.get(parentKey).set(segs[i], nums);
    }
  }
  // 2. compute the max version name per parent
  const maxVersionByParent = new Map();
  for (const [parentKey, verMap] of parentVersions) {
    if (verMap.size < 2) continue; // only ONE version under this parent -> nothing to prune
    let bestName = null, bestNums = null;
    for (const [name, nums] of verMap) {
      if (bestNums === null || compareVersionTuples(nums, bestNums) > 0) { bestNums = nums; bestName = name; }
    }
    maxVersionByParent.set(parentKey, bestName);
  }
  if (!maxVersionByParent.size) return docs.slice();
  // 3. drop a doc if ANY version segment on its path is NOT the max for its parent
  return docs.filter((d) => {
    const segs = d.relPath.split("/");
    for (let i = 0; i < segs.length; i++) {
      if (!VERSION_SEG.test(segs[i])) continue;
      const parentKey = segs.slice(0, i).join("/");
      const max = maxVersionByParent.get(parentKey);
      if (max !== undefined && segs[i] !== max) return false; // stale older-version sibling
    }
    return true;
  });
}

/** Recursively collect *.htm/*.html under a dir. Skips node_modules/.git/cache dirs. */
function walkHtml(absRoot) {
  const out = [];
  const SKIP = new Set(["node_modules", ".git", "__pycache__", ".pytest_cache", "thumbnail", "SkinsPics", "images", "img"]);
  const stack = [absRoot];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP.has(e.name)) stack.push(full); }
      else if (e.isFile() && /\.html?$/i.test(e.name)) out.push(full);
    }
  }
  return out;
}

/** Build the full candidate list across all software roots, deduped per software. */
export function buildCandidates(softwareFilter = null) {
  const out = [];
  for (const sw of SOFTWARE_ROOTS) {
    if (softwareFilter && sw.software !== softwareFilter && sw.key !== softwareFilter) continue;
    const absRoot = path.join(RESOURCES, sw.rel);
    if (!fs.existsSync(absRoot)) continue;
    const files = walkHtml(absRoot).map((abs) => ({
      abs,
      relPath: path.relative(absRoot, abs).replace(/\\/g, "/"),
      domain: sw.domain,
      software: sw.software,
    }));
    // layer 0: drop stale older-version sibling dirs (31.0 when 33.0 exists) --
    // collapses the parallel-version UUID-filename trees topic-identity can't reach.
    const freshest = pruneStaleVersionDirs(files);
    // layers 1+2: English-only + newest-version-per-topic (within THIS software root)
    for (const kept of dedupHelpDocs(freshest)) out.push(kept);
  }
  // stable order: software then relPath (deterministic resume)
  return out.sort((a, b) => (a.software < b.software ? -1 : a.software > b.software ? 1 : a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
}

/** Pick the next N not-yet-attempted candidates given a cursor's `attempted` map. */
export function pickNext(candidates, attempted, maxDocs) {
  const out = [];
  for (const c of candidates) {
    if (attempted[c.abs]) continue;
    out.push(c);
    if (out.length >= maxDocs) break;
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

/** Acquire a run-lock. False ONLY if a LIVE peer holds a fresh lock; dead-PID -> steal. */
function acquireLock() {
  try {
    const st = fs.statSync(LOCK);
    const heldPid = parseInt(String(fs.readFileSync(LOCK, "utf8")).trim(), 10);
    const fresh = Date.now() - st.mtimeMs < LOCK_STALE_MS;
    if (fresh && pidAlive(heldPid)) return false;
    fs.rmSync(LOCK, { force: true });
  } catch { /* no lock */ }
  try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); return true; }
  catch { return false; }
}
function releaseLock() { try { fs.rmSync(LOCK, { force: true }); } catch { /* ignore */ } }

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: opts.timeout || 20 * 60 * 1000, ...opts });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "", error: r.error };
}

/**
 * Read one help doc, strip to text. Returns an extractor-shaped row {path,text,ok,
 * chars} (exactly what rowToNodes consumes) or {ok:false} if too thin. latin1 read
 * tolerates the legacy-encoded help files (Mastercam WebHelp is windows-1252).
 */
export function readHelpDocRow(abs, relPath) {
  let html;
  try { html = fs.readFileSync(abs, "latin1"); } catch { return { ok: false, reason: "read-error", path: relPath }; }
  // Strip + measure under try/catch: a pathological doc must yield {ok:false}, NEVER
  // throw -- one bad file must not abort the whole batch loop (per-doc fail-soft).
  try {
    const text = stripHtmlToText(html, { maxChars: MAX_STRIP_CHARS });
    const chars = text.replace(/\s+/g, "").length;
    if (chars < MIN_RICH_CHARS) return { ok: false, reason: "thin", chars, path: relPath };
    return { ok: true, text, chars, path: relPath };
  } catch (e) {
    return { ok: false, reason: `strip-error: ${String((e && e.message) || e).slice(0, 80)}`, path: relPath };
  }
}

export function main(argv = process.argv.slice(2)) {
  const flags = { maxDocs: DEFAULT_MAX_DOCS, status: false, software: null, noEmbed: false, maxChunksPerDoc: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--max-docs") flags.maxDocs = parseInt(argv[++i], 10);
    else if (a === "--software") flags.software = String(argv[++i] || "").toLowerCase();
    else if (a === "--status") flags.status = true;
    else if (a === "--no-embed") flags.noEmbed = true;
    else if (a === "--max-chunks-per-doc") flags.maxChunksPerDoc = parseInt(argv[++i], 10);
  }

  const candidates = buildCandidates(flags.software);
  const cursor = readJson(CURSOR, { schemaVersion: "1.0.0", attempted: {}, stats: { rich: 0, thin: 0, drained: 0 } });
  const attemptedN = Object.keys(cursor.attempted).length;
  const richN = Object.values(cursor.attempted).filter((a) => a && a.ok).length;

  if (flags.status) {
    const bySoftware = {};
    for (const c of candidates) bySoftware[c.software] = (bySoftware[c.software] || 0) + 1;
    console.log(JSON.stringify({
      ok: true, totalCandidates: candidates.length, attempted: attemptedN, rich: richN,
      remaining: candidates.length - attemptedN, bySoftware, stats: cursor.stats,
    }, null, 2));
    return;
  }

  if (!candidates.length) { console.error("[html-drain] no candidates -- resources software help dirs not found:", RESOURCES); process.exit(2); }
  if (!acquireLock()) { console.log("[html-drain] another run holds the lock (fresh) -- skipping this tick"); return; }
  const onSignal = () => { releaseLock(); process.exit(143); };
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  try {
    fs.mkdirSync(NODES_DIR, { recursive: true });
    const batch = pickNext(candidates, cursor.attempted, flags.maxDocs);
    if (!batch.length) { console.log(`[html-drain] DONE -- all ${candidates.length} help docs attempted (${richN} had rich text). Nothing to do.`); return; }
    console.log(`[html-drain] batch=${batch.length} of ${candidates.length - attemptedN} remaining (${attemptedN} attempted)`);

    let newNodes = 0;
    for (const c of batch) {
      const row = readHelpDocRow(c.abs, c.relPath);
      cursor.attempted[c.abs] = { ok: !!row.ok, chars: row.chars || 0, reason: row.reason, software: c.software };
      if (row.ok) {
        cursor.stats.rich++;
        // chunk into the dedicated nodes dir, tagged with this software's domain + software
        const nodes = rowToNodes(
          { path: c.relPath, text: row.text, ok: true },
          { domain: c.domain, software: c.software, maxChunksPerDoc: flags.maxChunksPerDoc ?? Infinity },
        );
        for (const node of nodes) {
          fs.writeFileSync(path.join(NODES_DIR, `${node.sha8}.json`), JSON.stringify(node), "utf8");
          newNodes++;
        }
      } else {
        cursor.stats.thin++;
      }
      writeJsonAtomic(CURSOR, cursor); // checkpoint after EACH doc (resumable)
    }

    // generate tips over ALL pending html-help nodes (generator cursor skips drained chunks).
    // Source-agnostic generator: point it at the html-help nodes dir + its own out jsonl.
    const genConc = process.env.PRISM_TRIBAL_DRAIN_CONCURRENCY || "8";
    const gen = run(NODE, [path.join(ROOT, "scripts/generate-pdf-tribal-tips-hermes.mjs"), "--concurrency", genConc, "--ollama-only"], {
      env: { ...process.env, PRISM_TRIBAL_SOURCE_DIR: NODES_DIR, PRISM_TRIBAL_OUT: OUT_JSONL },
      timeout: 25 * 60 * 1000,
    });
    const genTail = (gen.stdout || "").trim().split("\n").slice(-1)[0] || "";

    // embed the delta (owned by embed-pdf-tribal-tips, which reads the "html" source).
    let embTail = flags.noEmbed ? "[skipped --no-embed; cron embeds]" : "";
    if (!flags.noEmbed) {
      const emb = run(NODE, [path.join(ROOT, "scripts/embed-pdf-tribal-tips-into-index.mjs"), "--source", "html"], { timeout: 20 * 60 * 1000 });
      embTail = (emb.stdout || "").split("\n").filter((l) => l.includes("[summary]")).slice(-1)[0] || "";
    }

    cursor.stats.drained += batch.filter((c) => cursor.attempted[c.abs] && cursor.attempted[c.abs].ok).length;
    writeJsonAtomic(CURSOR, cursor);
    const rec = { batch: batch.length, newNodes, gen: genTail.slice(0, 120), embed: embTail.slice(0, 160), remaining: candidates.length - Object.keys(cursor.attempted).length };
    fs.appendFileSync(PROGRESS_LOG, JSON.stringify(rec) + "\n");
    console.log(`[html-drain] ${JSON.stringify(rec)}`);
  } finally {
    releaseLock();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error("[html-drain][fatal]", String(e && e.message ? e.message : e)); process.exit(1); }
}
