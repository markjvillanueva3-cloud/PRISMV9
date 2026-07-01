#!/usr/bin/env node
/**
 * drain-web-sources-tribal.mjs -- U-WEB-SOURCE-TRIBAL-LANE (slot:india 2026-06-25)
 * ==============================================================================
 *
 * The NON-VIDEO half of the operator's "/learn pipeline ... include videos and
 * OTHER REPUTABLE SOURCES FROM ONLINE ... only add NEW knowledge" directive.
 * The video half is youtube-night-extract (transcripts); this is the web-article half.
 *
 * Architecture mirrors youtube-night-extract (proven, R8 -- reuse, don't reinvent):
 *   curated queue (web-source-queue.json) -> fetch URL -> strip HTML to text ->
 *   extractTipsFromTranscript (REUSED from youtube-free-extract -- it is source-agnostic
 *   machining tip-gen over ANY text, not transcript-specific) -> writeExtractionArtifact
 *   into the SHARED staging dir with meta.videoId = "web-<urlhash>".
 *
 * STAGING-ONLY (clobber-safety, same as youtube-night-extract): this NEVER mutates the
 * shared tribal store. The already-armed "PRISM Tribal Promotion Cron" (which runs
 * promote-youtube-staged --apply) then promotes these web artifacts into the tribal store
 * via U-TK01 content-dedup + the per-id promotion ledger -- so a "web-<hash>" artifact is
 * deduped exactly like a youtube one, with ZERO new promote wiring (R15 build-once).
 *
 * SAFETY (instruction-source-boundary): fetched HTML is DATA. It is stripped to text and
 * handed to the Ollama tip-extraction prompt as CONTENT to mine for machining tips -- it is
 * never executed as instructions and never reaches the operator's chat as a command.
 *
 * Resumable + bounded: per-source cooldown (default 7d, OK runs only), --max-sources cap,
 * run-lock (skip-if-fresh, dead-PID aware), per-source fail-soft (one bad URL never blocks
 * the rest). $0 Claude -- all model work is local Ollama.
 *
 * Usage:
 *   node scripts/drain-web-sources-tribal.mjs --status               # due-list only, no fetch
 *   node scripts/drain-web-sources-tribal.mjs --max-sources 3        # fetch up to 3 due sources
 *   node scripts/drain-web-sources-tribal.mjs --cooldown-days 7 --max-chars 120000
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
// node.exe external outbound is firewall-blocked on this box (node fetch hangs, curl works)
// -> probe node fetch, fall back to curl. Self-healing once the firewall allow-rule lands.
// See reference_node_external_outbound_blocked_2026_06_29. (slot:zulu 2026-06-29)
import { curlFallbackFetch } from "./lib/node-outbound-fetch.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

export const QUEUE_PATH = join(REPO_ROOT, "state", "shared", "web-source-extraction", "web-source-queue.json");
export const LEDGER_PATH = join(REPO_ROOT, "state", "shared", "web-source-extraction", "web-source-ledger.jsonl");
export const LOCK_PATH = join(REPO_ROOT, "state", "shared", "web-source-extraction", "web-source-drain.lock");
// Reuse the youtube staging dir so the armed promote cron (promote-youtube-staged) picks
// these up with no extra wiring. Artifacts are keyed by meta.videoId = "web-<hash>".
export const STAGING_DIR = join(REPO_ROOT, "state", "shared", "youtube-extraction");
export const QUEUE_SCHEMA = "1.0.0";

export const DEFAULT_MAX_SOURCES = 3;
export const DEFAULT_COOLDOWN_DAYS = 7;
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_CHARS = 120_000;
export const LOCK_STALE_MS = 30 * 60 * 1000; // 30 min: a drain run older than this is presumed dead

// -- pure helpers (exported for the hermetic test suite) ----------------------

/** Pure: deterministic staging id for a URL (dedup + ledger key). */
export function webSourceId(url) {
  const h = createHash("sha256").update(String(url)).digest("hex").slice(0, 12);
  return `web-${h}`;
}

/** Pure: strip an HTML document to plain text suitable for tip-gen. Drops
 * script/style/head/svg blocks + comments, strips tags, decodes common entities,
 * collapses whitespace, caps length. NOT a parser -- Ollama tolerates messy text. */
export function stripHtmlToText(html, opts = {}) {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  if (typeof html !== "string" || html.length === 0) return "";
  let s = html;
  s = s.replace(/<(script|style|noscript|template|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#0?39;/g, "'")
    .replace(/&rsquo;/gi, "'").replace(/&lsquo;/gi, "'").replace(/&mdash;/gi, "--").replace(/&ndash;/gi, "-");
  s = s.replace(/&#(\d+);/g, (_m, n) => {
    const c = parseInt(n, 10);
    return Number.isFinite(c) && c >= 32 && c < 0x110000 ? String.fromCodePoint(c) : " ";
  });
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, maxChars);
}

/** Pure: convert plain text into the {segments:[{start,end,text}]} transcript shape
 * that extractTipsFromTranscript/chunkTranscript require (the youtube lane feeds a
 * VTT-parse object, NOT a raw string -- a string yields zero segments). Web text has
 * no timestamps, so start/end are synthetic sequential indices; chunkTranscript then
 * groups these segChars-sized pieces into its own ~8K model chunks. Splits on a nearby
 * whitespace boundary to avoid mid-word cuts. */
export function textToTranscript(text, segChars = 1500) {
  const segments = [];
  if (typeof text === "string" && text.length) {
    let i = 0, idx = 0;
    while (i < text.length) {
      let end = Math.min(i + segChars, text.length);
      if (end < text.length) {
        const nextWs = text.indexOf(" ", end);
        if (nextWs !== -1 && nextWs - end < 200) end = nextWs;
      }
      const piece = text.slice(i, end).trim();
      if (piece) segments.push({ start: idx, end: idx, text: piece });
      i = end; idx++;
    }
  }
  return { full_text: typeof text === "string" ? text : "", segments, language: "en", duration_seconds: 0 };
}

/** Pure: normalize raw tip-gen output into the FULL KnowledgeTip shape the tribal
 * store ingest requires -- id / source / created_at / 0-100 confidence / provenance.
 * Mirrors youtube-free-extract's tipsToKnowledgeTips SHAPE (TribalKnowledgeEngine.ingest
 * calls inferDomain -> tip.source.toLowerCase() unconditionally, so a missing `source`
 * THROWS and the whole artifact fails to promote), but with WEB-accurate labels instead
 * of youtube ones (don't mislabel a web article as a video). Each tip gets a UNIQUE id
 * (a constant id would collide in ingest's id-dedup and drop all-but-the-first). */
export function tipsToWebKnowledgeTips(parsed, meta, today) {
  const day = today || new Date().toISOString().slice(0, 10);
  const base = meta.videoId || webSourceId(meta.source_url || "");
  const site = meta.channel || meta.source || "web";
  return (Array.isArray(parsed) ? parsed : []).map((t, i) => ({
    id: `tk-${base}-${String(i + 1).padStart(3, "0")}`,
    title: t.title,
    body: t.body,
    category: t.category,
    tags: [...new Set(["web-learned", "web-source", ...(meta.domain ? [meta.domain] : []), ...(Array.isArray(t.tags) ? t.tags : [])])],
    confidence: Math.round((Number.isFinite(t.confidence) ? t.confidence : 0.7) * 100),
    source: `web:${site} (${meta.source_url || ""})`,
    created_at: day,
    usage_count: 0,
    provenance: {
      source_url: meta.source_url || null,
      page_title: meta.title ?? null,
      site: site ?? null,
      extractor: "drain-web-sources-tribal@1.0",
    },
  }));
}

/** Pure: parse + validate the queue file. FAIL-LOUD: a bad queue -> nothing runs. */
export function parseQueue(text) {
  let j;
  try { j = JSON.parse(text); } catch (e) { return { ok: false, error: `queue JSON parse failed: ${e.message}` }; }
  if (j.schemaVersion !== QUEUE_SCHEMA) return { ok: false, error: `schemaVersion ${j.schemaVersion} != ${QUEUE_SCHEMA}` };
  if (!Array.isArray(j.sources)) return { ok: false, error: "sources is not an array" };
  const ids = new Set();
  for (const s of j.sources) {
    if (!s || typeof s.id !== "string" || !s.id) return { ok: false, error: "a source is missing a string id" };
    if (ids.has(s.id)) return { ok: false, error: `duplicate source id: ${s.id}` };
    ids.add(s.id);
    if (typeof s.url !== "string" || !/^https:\/\//i.test(s.url)) return { ok: false, error: `source ${s.id} url must be https://` };
  }
  return { ok: true, queue: j };
}

/** Pure: ndjson ledger -> rows (tolerates absent/empty/torn). */
export function parseLedger(text) {
  if (!text) return [];
  const rows = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { rows.push(JSON.parse(t)); } catch { /* skip torn line */ }
  }
  return rows;
}

/** Pure: which enabled sources are DUE -- never run, or last OK run older than cooldown. */
export function dueSources(queue, ledgerRows, nowMs, cooldownDays = DEFAULT_COOLDOWN_DAYS) {
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const lastOk = new Map();
  for (const r of ledgerRows) {
    if (r && r.ok === true && r.id && typeof r.ts === "string") {
      const ms = Date.parse(r.ts);
      if (Number.isFinite(ms) && (!lastOk.has(r.id) || ms > lastOk.get(r.id))) lastOk.set(r.id, ms);
    }
  }
  return (queue.sources || []).filter((s) => {
    if (s.enabled === false) return false;
    const last = lastOk.get(s.id);
    return last === undefined || nowMs - last >= cooldownMs;
  });
}

/** Pure: is a lock file fresh (held by a presumed-live run)? Dead-PID aware. */
export function isLockFresh(lockRaw, nowMs, isAliveImpl, staleMs = LOCK_STALE_MS) {
  if (!lockRaw) return false;
  let pid, ts;
  try { const j = JSON.parse(lockRaw); pid = j.pid; ts = Date.parse(j.ts); } catch { return false; }
  if (!Number.isFinite(ts) || nowMs - ts >= staleMs) return false; // too old -> stale
  if (typeof pid === "number" && isAliveImpl && !isAliveImpl(pid)) return false; // dead holder -> stale
  return true;
}

// -- side-effecting runner ----------------------------------------------------

function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; }
}

function intFlag(argv, name, dflt) {
  const i = argv.indexOf(name);
  if (i < 0 || i + 1 >= argv.length) return dflt;
  const n = parseInt(argv[i + 1], 10);
  return Number.isFinite(n) ? n : dflt;
}

/** Fetch a URL to text. Fail-soft: returns {ok:false,error} on any network/HTTP error. */
export async function fetchUrlText(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const fetchImpl = opts.fetchImpl ?? curlFallbackFetch;
  if (typeof fetchImpl !== "function") return { ok: false, error: "no fetch implementation available" };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      signal: ac.signal,
      redirect: "follow",
      headers: { "User-Agent": "PRISM-tribal-learn/1.0 (+local machining knowledge harvester)", "Accept": "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const ct = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
    if (ct && !/text\/html|xhtml|text\/plain/i.test(ct)) return { ok: false, error: `non-text content-type: ${ct}` };
    const html = await res.text();
    return { ok: true, html };
  } catch (e) {
    return { ok: false, error: e && e.name === "AbortError" ? `timeout after ${timeoutMs}ms` : (e?.message || String(e)) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const statusOnly = argv.includes("--status") || argv.includes("--dry-run");
  const maxSources = intFlag(argv, "--max-sources", DEFAULT_MAX_SOURCES);
  const cooldownDays = intFlag(argv, "--cooldown-days", DEFAULT_COOLDOWN_DAYS);
  const maxChars = intFlag(argv, "--max-chars", DEFAULT_MAX_CHARS);

  if (!existsSync(QUEUE_PATH)) { console.error(`[web-drain] queue missing: ${QUEUE_PATH} -- nothing to do`); return 0; }
  const parsed = parseQueue(readFileSync(QUEUE_PATH, "utf8"));
  if (!parsed.ok) { console.error(`[web-drain] QUEUE INVALID (nothing runs): ${parsed.error}`); return 1; }

  const ledgerRows = existsSync(LEDGER_PATH) ? parseLedger(readFileSync(LEDGER_PATH, "utf8")) : [];
  const due = dueSources(parsed.queue, ledgerRows, Date.now(), cooldownDays).slice(0, maxSources);

  if (statusOnly) {
    console.log(JSON.stringify({
      sources: parsed.queue.sources.length,
      due: due.map((s) => s.id),
      maxSources, cooldownDays,
    }, null, 2));
    return 0;
  }
  if (due.length === 0) { console.log("[web-drain] no due sources -- idempotent run, exit 0"); return 0; }

  // Run-lock: skip if a fresh run already holds it.
  mkdirSync(dirname(LOCK_PATH), { recursive: true });
  if (existsSync(LOCK_PATH) && isLockFresh(readFileSync(LOCK_PATH, "utf8"), Date.now(), pidAlive)) {
    console.log("[web-drain] a fresh run holds the lock -- skipping (correct, harmless)");
    return 0;
  }
  writeFileSync(LOCK_PATH, JSON.stringify({ pid: process.pid, ts: new Date().toISOString() }), "utf8");

  // Reuse the proven, source-agnostic tip-gen + artifact writer from the youtube lane.
  const yt = await import(pathToFileURL(join(REPO_ROOT, "scripts", "youtube-free-extract.mjs")).href);

  let ran = 0, failed = 0, totalTips = 0;
  try {
    for (const s of due) {
      const meta = { videoId: webSourceId(s.url), title: s.title || s.id, channel: s.source || "web", source_url: s.url, domain: s.domain };
      let row;
      try {
        const f = await fetchUrlText(s.url, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
        if (!f.ok) throw new Error(`fetch failed: ${f.error}`);
        const text = stripHtmlToText(f.html, { maxChars });
        if (text.length < 400) throw new Error(`stripped text too short (${text.length} chars) -- likely JS-rendered or empty`);
        // extractTipsFromTranscript/chunkTranscript need the {segments:[...]} shape, NOT a raw string.
        const ex = await yt.extractTipsFromTranscript(textToTranscript(text), meta, {});
        if (!ex.ok) throw new Error(`tip-gen failed: ${ex.error}`);
        if (ex.tips.length === 0) {
          // No machining tips found (a JS-rendered SPA shell, a nav/marketing page, or a
          // non-article). Ledger OK so the 7d cooldown applies (don't re-hammer it), but do
          // NOT stage a 0-tip artifact -- an empty artifact would pollute the promote queue.
          ran++;
          row = { ts: new Date().toISOString(), id: s.id, url: s.url, ok: true, tips: 0, note: "no tips (likely JS-rendered or non-article -- recurate)" };
          console.log(`[web-drain] OK ${s.id}: 0 tips (NOT staged -- likely JS-rendered/non-article; recurate the source)`);
        } else {
          // Normalize to the FULL KnowledgeTip shape BEFORE staging -- raw tip-gen output
          // lacks id/source and would THROW in the promote cron's ingest() (R15: the artifact
          // must round-trip through the CONSUMER, not just write to staging).
          const knowledgeTips = tipsToWebKnowledgeTips(ex.tips, meta);
          const record = { meta, tips: knowledgeTips, source_url: s.url, extractionStats: ex.stats, fetchedAt: new Date().toISOString() };
          const artifactPath = yt.writeExtractionArtifact(record, STAGING_DIR);
          totalTips += knowledgeTips.length;
          ran++;
          row = { ts: new Date().toISOString(), id: s.id, url: s.url, ok: true, tips: ex.tips.length, artifactPath };
          console.log(`[web-drain] OK ${s.id}: ${ex.tips.length} tip(s) staged -> ${artifactPath}`);
        }
      } catch (e) {
        failed++;
        row = { ts: new Date().toISOString(), id: s.id, url: s.url, ok: false, error: e?.message || String(e) };
        console.error(`[web-drain] FAIL ${s.id}: ${row.error}`);
      }
      appendFileSync(LEDGER_PATH, JSON.stringify(row) + "\n", "utf8");
    }
  } finally {
    try { rmSync(LOCK_PATH, { force: true }); } catch { /* best-effort */ }
  }

  console.log(`[web-drain] ran=${ran} failed=${failed} tipsStaged=${totalTips} (staging-only; promote via the armed PRISM Tribal Promotion Cron / promote-youtube-staged --apply)`);
  return 0;
}

// Run as main only (importable for tests). pathToFileURL handles Windows drive paths.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().then((code) => process.exit(code)).catch((e) => { console.error(e); process.exit(1); });
}
