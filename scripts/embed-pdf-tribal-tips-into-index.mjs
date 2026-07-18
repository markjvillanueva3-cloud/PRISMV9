#!/usr/bin/env node
/**
 * embed-pdf-tribal-tips-into-index.mjs
 *
 * PDF-TRIBAL-HERMES/U-TRIBAL-EMBED-INDEX (slot:zulu 2026-06-24).
 *
 * Embeds the AI-generated tribal tips (Hermes /learn over the resources corpus +
 * the youtube-extraction video tips) into the canonical L1 vector index
 * `state/shared/tribal-embed-index.json` so they reach the PER-PROMPT surface:
 *   tribal-by-domain-inject (PSN leg #5, every UserPromptSubmit) -> tribal-rerank
 * and the RAG/semantic retrieval that reads the same index.
 *
 * This is the careful follow-up to U-TRIBAL-SEEDS-INGEST (which fed the same tips
 * into the small `cad-cam-pdf-tribal-seeds.json` /shop-knowledge surface). The
 * seeds JSON is NOT read by any hook -- the embed index IS. (verified 2026-06-24)
 *
 * ## Why a sibling of embed-cited-tips-into-tribal-index.mjs and not a fork
 *
 * It reuses EVERY hardened index IO primitive from that proven embedder -- the
 * shard-safe, clobber-guarded read/write (readTribalIndexGuarded /
 * writeTribalIndexGuarded), the cross-process write lock (withTribalIndexLock),
 * the Ollama embedder (embedText) and the bounded GPU pool (runEmbedPool). NONE
 * of the dangerous ~1.18 GB-index code is new here; only the SOURCE reader (JSONL
 * + youtube JSON -> per-tip records) and the per-tip granularity differ. The
 * index was clobbered to 1 entry on 2026-06-08 (V8 string-cap fail-OPEN); every
 * write here goes through the guarded, atomic, manifest-aware path that fixed it.
 * [[reference_tribal_shard_read_clobber_2026_06_10]] [[reference_tribal_index_v8_string_cap_2026_06_08]]
 *
 * ## Resumability
 *
 * One entry PER TIP (best RAG granularity), id `tip:pdf-<sha8>-<i>` / the youtube
 * tip's own stable id `tip:<tk-yt-...>`. The hash skip-check makes a re-run after
 * a kill (reaper / session-limit) cheap: already-embedded ids with an unchanged
 * input hash are skipped, so the only cost of an interrupted run is re-embedding
 * the un-flushed tail (~ms each on Blackwell). Default ONE final flush (the
 * ~1.18 GB rewrite is the only slow step) -- raise checkpointing with --checkpoint
 * for finer resumability at the cost of extra full-index rewrites.
 *
 * Usage:
 *   node scripts/embed-pdf-tribal-tips-into-index.mjs --dry-run     # count, no write
 *   node scripts/embed-pdf-tribal-tips-into-index.mjs --limit 5     # sample (prove non-clobber)
 *   node scripts/embed-pdf-tribal-tips-into-index.mjs               # full run (all sources)
 *   node scripts/embed-pdf-tribal-tips-into-index.mjs --source pdf  # one source only
 *   node scripts/embed-pdf-tribal-tips-into-index.mjs --force       # re-embed all
 *
 * Env: PRISM_OLLAMA_URL (via embedText) · PRISM_EMBED_CONCURRENCY · PRISM_TRIBAL_INDEX_PATH
 *
 * @milestone PDF-TRIBAL-HERMES/U-TRIBAL-EMBED-INDEX
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { embedText } from "./embed-wiki-into-tribal-index.mjs";
import { runEmbedPool, resolveEmbedConcurrency } from "./lib/embed-pool.mjs";
import { withTribalIndexLock, EXIT_TRIBAL_INDEX_LOCK_SKIP } from "./lib/tribal-index-lock.mjs";
import { readTribalIndexGuarded, writeTribalIndexGuarded } from "./lib/tribal-index-guarded-io.mjs";

const __filename = fileURLToPath(import.meta.url);
const PRISM_ROOT = path.resolve(path.dirname(__filename), "..");
const INDEX_PATH = process.env.PRISM_TRIBAL_INDEX_PATH || path.join(PRISM_ROOT, "state", "shared", "tribal-embed-index.json");
const PDF_TIPS = path.join(PRISM_ROOT, "state", "shared", "pdf-tribal-tips", "tips.jsonl");
// per-tool cutting params extracted from the tooling vendor catalogs (extract-catalog-cutting-params.mjs):
// FLAT one-tip-per-line {id, domain, source, page, tip, meta} -- distinct schema from PDF_TIPS (per-doc tips[]).
const CATALOG_TIPS = path.join(PRISM_ROOT, "state", "shared", "pdf-tribal-tips", "catalog-cutting-tips.jsonl");
// CAD/CAM software help-HTML tips (drain-html-help-tribal.mjs over the operator-named
// Fusion/hyperCAD-S/hyperMILL/Mastercam help systems). Same per-doc tips[] shape as
// PDF_TIPS but a DISTINCT corpus + id namespace so the per-tip hash-skip dedups cleanly.
const HTML_TIPS = path.join(PRISM_ROOT, "state", "shared", "pdf-tribal-tips", "html-help-tips.jsonl");
const YT_DIR = path.join(PRISM_ROOT, "state", "shared", "youtube-extraction");
// Hermes per-domain enrichment-loop staging (hermes-domain-enrichment-loop.mjs).
// Capture-tip schema {tips:[{title,body,tags:["domain:mill"],source,id:"hkl-<dom>-NNN"}]}.
// Previously stranded at staging -- this is the L1 hop that makes the Hermes/Grok
// per-domain knowledge reach the PER-PROMPT tribal surface (tribal-rerank, PSN leg #5)
// + RAG. Embedded for advisory RETRIEVAL only (unreviewed-cron); never auto-fires a gate.
const HERMES_STAGING = path.join(PRISM_ROOT, "state", "shared", "staging", "hermes-enrichment-loop-tips.json");
// Hermes PARALLEL-AGENT knowledge-enrichment staging (stage-hermes-knowledge-tips.mjs
// over the two committed wave-1/wave-2 specs -- 84 zulu-R12-verified cited items across
// the 6 primary print-to-program domains). DISTINCT from HERMES_STAGING: that is the
// per-domain enrichment LOOP (hkl-<dom>-NNN); this is the 6-parallel-Grok-agent CAMPAIGN
// (hk-w<wave>-<dom>-NNN, richer body: rule + formula/threshold + any [ARITH?] caution).
// Both were stranded at staging with NO live-index consumer -- grep proved 0 of the 84
// items in the index. Advisory RETRIEVAL only (needs_specialist_confirm carried in the
// body text); never auto-fires a gate. [[reference_tribal_shard_read_clobber_2026_06_10]]
const HERMES_KNOWLEDGE_STAGING = path.join(PRISM_ROOT, "state", "shared", "staging", "hermes-knowledge-tips-staging.json");
// SINGLE source of truth for the default tip sources. Used by BOTH collectAllTips'
// signature default AND main()'s flags default -- the durable cron runs main() with
// NO --source, so a list that diverges from collectAllTips silently drops sources on
// the cron path (the bug that left `catalog` + `hermes` dead on the cron: a list was
// added to the function default but not main()'s). One const => no drift.
export const DEFAULT_SOURCES = ["pdf", "video", "resources", "catalog", "html", "hermes", "hermes-knowledge"];
// Page-cited tips already extracted from the H:/PRISM/resources manuals (e.g.
// "Fundamentals of CNC Machining"), one tip per jsonl row with book/chapter/page
// provenance. These are real (confidence>0.3); the batch-stub heuristic rows
// (confidence 0.3, extraction_quality "batch-stub") are excluded.
const EXTRACTED_PDF_DIR = path.join(PRISM_ROOT, "state", "shared", "extracted-pdfs");
const STUB_CONFIDENCE = 0.3; // <= this = batch-stub heuristic tip, not page-cited

// Heap for the re-exec child. A flush re-reads the WHOLE sharded index into memory
// (grows with the corpus: 74K entries ~1.18 GB at session start -> 88K+ ~1.4 GB and
// climbing as the overnight drain adds tips). The 12 GB default hit "Array buffer
// allocation failed" at ~88K entries (2026-06-24), especially under a concurrent
// load. Host has 136 GB RAM, so give generous headroom for the growing index.
const HEAP_MB = Number(process.env.PRISM_TRIBAL_EMBED_HEAP_MB) || 28672;

/**
 * Should this process re-exec itself with a larger heap? True unless we're ALREADY
 * the re-exec child (env breaker) or the launcher already passed a heap flag. Pure
 * + exported so the breaker/flag-present paths are unit-tested without spawning.
 */
export function shouldReexecForHeap(execArgv = process.execArgv, env = process.env) {
  if (env.PRISM_TRIBAL_EMBED_REEXEC === "1") return false;          // already re-exec'd
  if ((execArgv || []).some((a) => String(a).includes("--max-old-space-size"))) return false; // flag present
  return true;
}

const DEFAULT_DIM = 768;
const MAX_INPUT_CHARS = 2000; // embed-input cap (keeps each embed call fast)
const TEXT_MAX = 400;         // stored display snippet (matches sibling embedders)
// One full-index (~1.18 GB sharded) rewrite per flush -> default to a SINGLE
// final flush. Override with --checkpoint N for finer resumability.
const DEFAULT_CHECKPOINT = 100000;
// Lock stale-steal window must exceed the worst-case full-index rewrite (the
// sharded ~1.18 GB index measured minutes to stringify+write). Match the
// cited-tips embedder's 10 min headroom so a peer never steals the lock mid-write.
const LOCK_STALE_MS = 600_000;

// Source domain -> a tribal-rerank VALID_DOMAINS member (mill|lathe|wedm|cad|cam|
// backend-dev|general). A tip stored with a domain the rerank cannot match never
// gets the in-domain 2x boost (raw cosine still retrieves it), so map known
// domains through; everything else -> general (retrievable, never mis-boosted).
const DOMAIN_MAP = {
  cad: "cad", cam: "cam", mill: "mill", milling: "mill",
  lathe: "lathe", turning: "lathe", wedm: "wedm", "wire-edm": "wedm",
};
export function toValidDomain(d) {
  return DOMAIN_MAP[String(d || "").toLowerCase().trim()] || "general";
}

/** Pull the tip text from a youtube tip record ({title, body} -- body is the
 *  knowledge field) or a plain string / legacy {tip}/{text}. Title-prefixed for
 *  context. Mirrors videoTipText in ingest-tribal-tips-to-seeds.mjs. */
export function videoTipText(t) {
  if (typeof t === "string") return t.trim();
  if (!t || typeof t !== "object") return "";
  const body = String(t.body || t.tip || t.text || "").trim();
  if (!body) return "";
  const title = String(t.title || "").trim();
  return title && title !== body ? `${title}: ${body}` : body;
}

/** SHA-256 of the embedding input -- change-detection hash (skip-unchanged). */
export function hashInput(input) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/**
 * Build a CANONICAL array entry -- the EXACT shape tribal-rerank.mjs reads
 * (e.id/e.embedding/e.domain/e.source/e.text/e.title). `embedding` is injected by
 * the caller so this stays pure + unit-testable.
 */
export function buildTipEntry(rec, embedding) {
  const input = String(rec.text || "").slice(0, MAX_INPUT_CHARS);
  return {
    id: rec.id,
    source: "tribal-tip",
    domain: toValidDomain(rec.domain),
    title: rec.title || rec.id,
    path: rec.path || null,
    text: input.slice(0, TEXT_MAX),
    hash: hashInput(input),
    embedding,
    tipSource: rec.sourceCorpus || null,
    origin: rec.origin || null,
  };
}

/** Read PDF tips.jsonl -> flat per-tip records. Pure w.r.t. the file path. */
export function collectPdfTips(jsonlPath = PDF_TIPS) {
  const out = [];
  let raw;
  try { raw = fs.readFileSync(jsonlPath, "utf8"); } catch { return out; }
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; } // tolerate torn line
    if (!r || !Array.isArray(r.tips)) continue;
    const sha8 = r.sha8 || hashInput(String(r.title || r.source || ""));
    r.tips.map((t) => String(t || "").trim()).filter(Boolean).forEach((tip, i) => {
      out.push({
        id: `tip:pdf-${sha8}-${i}`,
        domain: r.domain,
        title: r.title || r.source || sha8,
        text: tip,
        path: r.source || null,
        sourceCorpus: "cad-cam-pdf-nodes",
        origin: `pdf:${sha8}`,
      });
    });
  }
  return out;
}

/** Read html-help-tips.jsonl (per-doc tips[], same shape as PDF_TIPS) -> per-tip
 *  records. DISTINCT id namespace (tip:html-<sha8>-<i>) + corpus so the embedder's
 *  per-tip hash-skip dedups these against PDF/video/catalog tips cleanly. */
export function collectHtmlHelpTips(jsonlPath = HTML_TIPS) {
  const out = [];
  let raw;
  try { raw = fs.readFileSync(jsonlPath, "utf8"); } catch { return out; }
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; } // tolerate torn line
    if (!r || !Array.isArray(r.tips)) continue;
    const sha8 = r.sha8 || hashInput(String(r.title || r.source || ""));
    const sw = r.software ? `${r.software}: ` : "";
    r.tips.map((t) => String(t || "").trim()).filter(Boolean).forEach((tip, i) => {
      out.push({
        id: `tip:html-${sha8}-${i}`,
        domain: r.domain || "cam",
        title: `${sw}${r.title || r.source || sha8}`.trim(),
        text: tip,
        path: r.source || null,
        sourceCorpus: "cad-cam-html-help",
        origin: `html:${sha8}`,
      });
    });
  }
  return out;
}

/** Read catalog-cutting-tips.jsonl (FLAT one-tip-per-line) -> per-tip records.
 *  Distinct from collectPdfTips: each line is already one tip with a stable id. */
export function collectCatalogCuttingTips(jsonlPath = CATALOG_TIPS) {
  const out = [];
  let raw;
  try { raw = fs.readFileSync(jsonlPath, "utf8"); } catch { return out; }
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; } // tolerate torn line
    const text = String(r?.tip || "").trim();
    if (!text || !r.id) continue;
    out.push({
      id: `tip:${r.id}`, // r.id already namespaced "catalog-cutting:<slug>:<series>:<iso>:<page>"
      domain: r.domain || "speed-feed",
      title: r.meta?.vendor ? `${r.meta.vendor} ${r.meta.series || ""}`.trim() : (r.source || r.id),
      text,
      path: r.source || null,
      sourceCorpus: "manufacturer-catalogs",
      origin: `catalog:${r.source || ""}#p${r.page || 0}`,
    });
  }
  return out;
}

/** Read youtube-extraction/*.json -> flat per-tip records. Skips fallback files
 *  (no tips) and any file whose tips array is empty. */
export function collectVideoTips(ytDir = YT_DIR) {
  const out = [];
  let files;
  try { files = fs.readdirSync(ytDir); } catch { return out; }
  for (const f of files) {
    if (!f.endsWith(".json") || f.includes("fallback")) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(ytDir, f), "utf8")); } catch { continue; }
    const tips = Array.isArray(j.tips) ? j.tips : (Array.isArray(j.tribal_tips) ? j.tribal_tips : []);
    if (!tips.length) continue;
    const meta = j.meta || {};
    const vid = meta.videoId || f.replace(/\.json$/, "");
    const vidTitle = meta.title || meta.video_title || j.title || f;
    tips.forEach((t, i) => {
      const text = videoTipText(t);
      if (!text) return;
      // youtube tips carry their own stable id (tk-yt-<vid>-NNN) -- reuse it.
      const tipId = t && typeof t === "object" && t.id ? String(t.id) : `${vid}-${i}`;
      out.push({
        id: `tip:${tipId}`,
        domain: (t && t.category) || meta.domain || "machining",
        title: (t && t.title) || vidTitle,
        text,
        path: meta.url || f,
        sourceCorpus: "youtube-extraction",
        origin: `yt:${vid}`,
      });
    });
  }
  return out;
}

/** Read state/shared/extracted-pdfs/*.jsonl -> per-tip records. Excludes batch-stub
 *  heuristic rows (confidence <= STUB_CONFIDENCE). `source` is an object here
 *  ({book,author,chapter,section,pages,pdf_path}) -- flatten to a string path. */
export function collectExtractedPdfTips(dir = EXTRACTED_PDF_DIR) {
  const out = [];
  let files;
  try { files = fs.readdirSync(dir); } catch { return out; }
  for (const f of files) {
    if (!f.endsWith(".jsonl")) continue;
    let raw;
    try { raw = fs.readFileSync(path.join(dir, f), "utf8"); } catch { continue; }
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      let r;
      try { r = JSON.parse(line); } catch { continue; } // tolerate torn line
      if (!r) continue;
      // page-cited only: confidence absent (=trusted) or above the stub floor.
      if (typeof r.confidence === "number" && r.confidence <= STUB_CONFIDENCE) continue;
      const text = String(r.tip || r.body || r.text || "").trim();
      if (!text || !r.id) continue;
      const src = r.source;
      const srcPath = src && typeof src === "object" ? (src.pdf_path || src.book || null) : (src || null);
      const book = src && typeof src === "object" ? src.book : null;
      out.push({
        id: `tip:respdf-${r.id}`,
        domain: r.domain,
        title: r.topic || book || r.id,
        text,
        path: srcPath,
        sourceCorpus: "resources-pdf",
        origin: `respdf:${r.id}`,
      });
    }
  }
  return out;
}

/** Read the Hermes per-domain enrichment-loop staging tips
 *  ({tips:[{title, body, tags:["domain:mill"], source, id:"hkl-<dom>-NNN", ...}]})
 *  -> flat per-tip records. The knowledge is the one-line `title` rule; `source`
 *  carries the canonical cite. Domain comes from the `domain:<x>` tag (fallback
 *  `category`) and is mapped to a VALID_DOMAINS member by buildTipEntry/toValidDomain
 *  (post/other -> general, still retrievable). These are unreviewed-cron items --
 *  embedded for advisory RETRIEVAL only, never to auto-fire a gate. The tip's own
 *  stable id makes the per-tip hash-skip resumable + idempotent. */
export function collectHermesEnrichmentTips(stagingPath = HERMES_STAGING) {
  const out = [];
  let doc;
  try { doc = JSON.parse(fs.readFileSync(stagingPath, "utf8")); } catch { return out; }
  const tips = Array.isArray(doc && doc.tips) ? doc.tips : [];
  for (const t of tips) {
    if (!t || typeof t !== "object" || !t.id) continue;
    const text = String(t.title || t.body || "").trim();
    if (!text) continue;
    const domTag = (Array.isArray(t.tags) ? t.tags : [])
      .map((x) => /^domain:(.+)$/.exec(String(x || "").trim()))
      .find(Boolean);
    const domain = domTag ? domTag[1] : (t.category || "general");
    out.push({
      id: `tip:${t.id}`, // tip:hkl-mill-001 (stable -> hash-skip idempotent)
      domain,
      title: text.slice(0, 140),
      text,
      path: t.source || null, // the source cite
      sourceCorpus: "hermes-enrichment-loop",
      origin: `hermes:${t.id}`,
    });
  }
  return out;
}

/** Read the Hermes PARALLEL-AGENT knowledge-enrichment campaign staging
 *  (stage-hermes-knowledge-tips.mjs -> {tips:[{title, body, tags:["domain:mill",
 *  "wave:1",...], source, id:"hk-w1-mill-001", safety, needs_specialist_confirm}]})
 *  -> flat per-tip records. Embed text is the `body` (rule + formula/threshold + any
 *  [ARITH?] caution the stager baked in), richer than the title alone. Domain from the
 *  `domain:<x>` tag (post-processor -> general via toValidDomain, still retrievable).
 *  These are the 84 zulu-R12-verified cited items across the 6 primary print-to-program
 *  domains -- advisory RETRIEVAL only, never auto-fires a gate. The tip's own stable id
 *  makes the per-tip hash-skip resumable + idempotent (re-run after a kill is cheap). */
export function collectHermesKnowledgeTips(stagingPath = HERMES_KNOWLEDGE_STAGING) {
  const out = [];
  let doc;
  try { doc = JSON.parse(fs.readFileSync(stagingPath, "utf8")); } catch { return out; }
  const tips = Array.isArray(doc && doc.tips) ? doc.tips : [];
  for (const t of tips) {
    if (!t || typeof t !== "object" || !t.id) continue;
    const text = String(t.body || t.title || "").trim();
    if (!text) continue;
    const domTag = (Array.isArray(t.tags) ? t.tags : [])
      .map((x) => /^domain:(.+)$/.exec(String(x || "").trim()))
      .find(Boolean);
    const domain = domTag ? domTag[1] : (t.category || "general");
    out.push({
      id: `tip:${t.id}`, // tip:hk-w1-mill-001 (stable -> hash-skip idempotent)
      domain,
      title: String(t.title || t.id).slice(0, 140),
      text,
      path: t.source || null, // "hermes:grok-4.20 (wave N) | cite: <source>"
      sourceCorpus: "hermes-knowledge-campaign",
      origin: `hermes-knowledge:${t.id}`,
    });
  }
  return out;
}

/** All source tips (deduped by id -- last writer wins, e.g. across re-extracts). */
export function collectAllTips({ pdf = PDF_TIPS, video = YT_DIR, extracted = EXTRACTED_PDF_DIR, catalog = CATALOG_TIPS, html = HTML_TIPS, hermes = HERMES_STAGING, hermesKnowledge = HERMES_KNOWLEDGE_STAGING, sources = DEFAULT_SOURCES } = {}) {
  const byId = new Map();
  if (sources.includes("pdf")) for (const r of collectPdfTips(pdf)) byId.set(r.id, r);
  if (sources.includes("video")) for (const r of collectVideoTips(video)) byId.set(r.id, r);
  if (sources.includes("resources")) for (const r of collectExtractedPdfTips(extracted)) byId.set(r.id, r);
  if (sources.includes("catalog")) for (const r of collectCatalogCuttingTips(catalog)) byId.set(r.id, r);
  if (sources.includes("html")) for (const r of collectHtmlHelpTips(html)) byId.set(r.id, r);
  if (sources.includes("hermes")) for (const r of collectHermesEnrichmentTips(hermes)) byId.set(r.id, r);
  if (sources.includes("hermes-knowledge")) for (const r of collectHermesKnowledgeTips(hermesKnowledge)) byId.set(r.id, r);
  return [...byId.values()];
}

/**
 * Load the canonical ARRAY-shaped index via the guarded, manifest-aware reader.
 * REFUSES an object-shaped `entries` (the bug that made every tip non-retrievable).
 */
export function loadIndex(indexPath = INDEX_PATH) {
  const parsed = readTribalIndexGuarded(indexPath, {
    emptyHead: { schemaVersion: "1.0.0", model: "nomic-embed-text:latest", dim: DEFAULT_DIM, generatedAt: new Date().toISOString() },
  });
  if (!Array.isArray(parsed.entries)) {
    throw new Error(
      `tribal-embed-index entries must be an ARRAY (found ${typeof parsed.entries}) -- ` +
      `refusing to write an object-shaped index that tribal-rerank cannot read (R12 schema-probe)`,
    );
  }
  return parsed;
}

/** Replace-by-id or append canonical tip entries; keeps idIndexMap in sync. */
export function spliceTipEntries(idx, built, idIndexMap) {
  let added = 0, replaced = 0;
  for (const entry of built) {
    const at = idIndexMap.get(entry.id);
    if (at !== undefined) { idx.entries[at] = entry; replaced++; }
    else { idx.entries.push(entry); idIndexMap.set(entry.id, idx.entries.length - 1); added++; }
  }
  return { added, replaced };
}

export async function main(argv = process.argv.slice(2)) {
  const flags = { limit: Infinity, dryRun: false, force: false, verbose: false, sources: [...DEFAULT_SOURCES], checkpoint: DEFAULT_CHECKPOINT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") flags.limit = parseInt(argv[++i], 10);
    else if (a === "--dry-run") flags.dryRun = true;
    else if (a === "--force") flags.force = true;
    else if (a === "--verbose") flags.verbose = true;
    else if (a === "--checkpoint") flags.checkpoint = parseInt(argv[++i], 10);
    else if (a === "--source") flags.sources = [argv[++i]];
  }

  const all = collectAllTips({ sources: flags.sources });
  const tips = Number.isFinite(flags.limit) ? all.slice(0, flags.limit) : all;
  const stats = { totalTips: tips.length, embedded: 0, skipped: 0, failed: 0, indexBefore: 0, indexAfter: 0 };
  console.log(`[pdf-tribal-embed] sources=${flags.sources.join("+")} tips=${all.length}${tips.length !== all.length ? ` (limited to ${tips.length})` : ""}`);

  if (flags.dryRun) {
    const byDomain = {};
    for (const r of all) { const d = toValidDomain(r.domain); byDomain[d] = (byDomain[d] || 0) + 1; }
    console.log(`[dry-run] would embed ${all.length} tip(s); by-domain: ${JSON.stringify(byDomain)}`);
    return stats;
  }

  const idx = loadIndex();
  stats.indexBefore = idx.entries.length;
  const expectedDim = Number(idx.dim) > 0 ? Number(idx.dim) : DEFAULT_DIM;
  const idIndexMap = new Map(idx.entries.map((e, i) => [e && e.id, i]));
  const CONCURRENCY = resolveEmbedConcurrency();

  // Fail-loud Ollama preflight (nothing is written if embeddings are unavailable).
  try {
    const probe = await embedText("ping", fetch, 0);
    if (!Array.isArray(probe) || probe.length === 0) {
      console.error("[pdf-tribal-embed] Ollama embeddings probe returned empty -- aborting (nothing written)");
      process.exitCode = 3; return stats;
    }
    console.log(`[pdf-tribal-embed] Ollama probe OK (dim=${probe.length}) · conc=${CONCURRENCY} · index=${stats.indexBefore} entries`);
  } catch (e) {
    console.error(`[pdf-tribal-embed] Ollama embeddings probe FAILED -- ${String((e && e.message) || e)} (nothing written)`);
    process.exitCode = 3; return stats;
  }

  let built = [];
  let sinceFlush = 0;
  let lockHeldByPeer = false;
  const flush = () => {
    if (!built.length) return true;
    const r = withTribalIndexLock(INDEX_PATH, () => {
      const fresh = loadIndex();
      const freshMap = new Map(fresh.entries.map((e, i) => [e && e.id, i]));
      spliceTipEntries(fresh, built, freshMap);
      fresh.generatedAt = new Date().toISOString();
      writeTribalIndexGuarded(fresh, INDEX_PATH);
      stats.indexAfter = fresh.entries.length;
    }, { staleMs: LOCK_STALE_MS });
    if (!r.ran) { lockHeldByPeer = true; return false; }
    built = [];
    return true;
  };

  // TOLERATE-ON-RETURN worker -- never throws; one bad tip never aborts the pool.
  const embedOne = async (rec) => {
    const input = String(rec.text || "").slice(0, MAX_INPUT_CHARS);
    const h = hashInput(input);
    const at = idIndexMap.get(rec.id);
    const prior = at !== undefined ? idx.entries[at] : null;
    if (prior && prior.hash === h && !flags.force) return { status: "skipped" };
    try {
      const vec = await embedText(input, fetch, expectedDim);
      return { status: "embedded", entry: buildTipEntry(rec, vec) };
    } catch (e) {
      if (flags.verbose) console.error(`  [fail] ${rec.id}: ${String((e && e.message) || e)}`);
      return { status: "failed" };
    }
  };

  for (let start = 0; start < tips.length && !lockHeldByPeer; start += CONCURRENCY) {
    const chunk = tips.slice(start, start + CONCURRENCY);
    const results = await runEmbedPool(chunk, embedOne, { concurrency: CONCURRENCY });
    for (const r of results) {
      const bucket = r.status === "skipped" ? "skipped" : r.status === "embedded" ? "embedded" : "failed";
      stats[bucket]++;
      if (r.status === "embedded" && r.entry) { built.push(r.entry); sinceFlush++; }
    }
    if (sinceFlush >= flags.checkpoint) {
      if (!flush()) break;
      sinceFlush = 0;
      if (flags.verbose) console.log(`  [checkpoint] embedded=${stats.embedded}`);
    }
  }
  if (!lockHeldByPeer) flush(); // final flush -- persist the tail

  if (lockHeldByPeer) {
    console.error(`[pdf-tribal-embed] tribal-index held by a peer writer -- ${built.length} staged tip(s) NOT written; index UNTOUCHED. Re-run after the peer finishes.`);
    process.exitCode = EXIT_TRIBAL_INDEX_LOCK_SKIP;
  }

  console.log(`\n[summary] tips=${stats.totalTips} embedded=${stats.embedded} skipped=${stats.skipped} failed=${stats.failed} | index ${stats.indexBefore} -> ${stats.indexAfter || stats.indexBefore}`);
  if (stats.failed > 0) {
    console.error(`[warn] ${stats.failed} tip(s) failed to embed (likely Ollama). Re-run after recovery; checkpoint progress preserved.`);
    process.exitCode = stats.failed === stats.totalTips ? 2 : 1;
  }
  return stats;
}

const argv1 = process.argv[1];
if (argv1 && (import.meta.url === `file://${argv1.replace(/\\/g, "/")}` || import.meta.url === `file:///${argv1.replace(/\\/g, "/")}`)) {
  if (shouldReexecForHeap()) {
    // Re-exec once with a large old-space so the full-index flush never OOMs,
    // regardless of how this script was launched (ad-hoc, cron, or via a wrapper).
    const r = spawnSync(process.execPath, [`--max-old-space-size=${HEAP_MB}`, __filename, ...process.argv.slice(2)], {
      stdio: "inherit", env: { ...process.env, PRISM_TRIBAL_EMBED_REEXEC: "1" }, windowsHide: true,
    });
    process.exit(r.status == null ? 0 : r.status);
  }
  main().catch((err) => { console.error("[fatal]", err); process.exit(2); });
}
