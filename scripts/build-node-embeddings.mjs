#!/usr/bin/env node
/**
 * build-node-embeddings.mjs — NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
 *
 * Computes a 768-d nomic-embed-text semantic vector for every node in
 * state/shared/system-viz/system-graph-normalized.json (output of U1's
 * regen-graph-normalized.mjs). Writes int8-quantized vectors to
 * state/shared/system-viz/_node-embeddings.jsonl — the semantic feature
 * block consumed by the GraphSAGE feature concat (U3).
 *
 * Follows the proven build-wiki-embeddings.mjs pattern (same Ollama endpoint,
 * same L2-norm + int8 quantize, same __meta header, same resume-by-name+hash)
 * with three NN-GRAPH-MS0-specific additions from the v3 plan scrutiny:
 *
 *   1. p-limit concurrency (default 4) — the wiki version is serial; 372k
 *      nodes serial at ~30ms/POST ≈ 3h. Bounded concurrency cuts that ~4x.
 *      (Arm A P0-2: OllamaEmbedderEngine.embed is async-instance + serial.)
 *   2. wiki-cache reuse with timestamp guard — if a node's label matches a
 *      wiki entry name AND the wiki _embeddings.jsonl was generated BEFORE
 *      the graph snapshot, reuse that vector (saves ~14k Ollama calls).
 *      The timestamp guard prevents label-leakage (Arm C P0-3).
 *   3. LocalEmbedding fallback — on Ollama failure, zero-pad a 384-d local
 *      vector to 768 and tag embedding_source:"local" so eval can stratify.
 *
 * Resume-on-restart: checkpoints every PRISM_NNG_RESUME_CHECKPOINT_EVERY
 * nodes; re-running skips already-embedded nodes (keyed by id+contentHash).
 *
 * Usage:
 *   node scripts/build-node-embeddings.mjs                 # full run
 *   node scripts/build-node-embeddings.mjs --limit 500     # first 500 nodes (smoke)
 *   node scripts/build-node-embeddings.mjs --dry-run       # count only, no Ollama
 *   node scripts/build-node-embeddings.mjs --json          # machine summary
 *
 * Knobs:
 *   PRISM_NNG_OLLAMA_BATCH_SIZE=64
 *   PRISM_NNG_OLLAMA_CONCURRENCY=4
 *   PRISM_NNG_RESUME_CHECKPOINT_EVERY=1000
 *   PRISM_NNG_USE_WIKI_CACHE=1
 *   PRISM_NNG_EMBED_FALLBACK_LOCAL=1
 *   OLLAMA_HOST=127.0.0.1:11434
 *
 * @milestone NN-GRAPH-MS0
 * @unit U-NNG-NODE-EMBED-INGEST
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";
import { nicifySelf } from "./lib/batch-self-nice.mjs";
import { buildActionSurfaceMap, actionSurfaceText } from "./lib/engine-action-surface.mjs";
import { buildImportFingerprintMap, buildImportIdfMap, importFingerprintText } from "./lib/engine-import-fingerprint.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const GRAPH_PATH = path.join(REPO_ROOT, "state/shared/system-viz/system-graph-normalized.json");
const OUT_PATH = path.join(REPO_ROOT, "state/shared/system-viz/_node-embeddings.jsonl");
const PARTIAL_PATH = `${OUT_PATH}.partial`;
const WIKI_EMB_PATH = path.join(REPO_ROOT, "knowledge/wiki/architecture/_embeddings.jsonl");

const MODEL = "nomic-embed-text";
const EMBED_DIM = 768;
const SCHEMA_VERSION = 1;

const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1:11434";
const OLLAMA_URL = `http://${OLLAMA_HOST.replace(/^https?:\/\//, "")}/api/embeddings`;
const CONCURRENCY = Math.max(1, parseInt(process.env.PRISM_NNG_OLLAMA_CONCURRENCY ?? "4", 10));
const CHECKPOINT_EVERY = Math.max(1, parseInt(process.env.PRISM_NNG_RESUME_CHECKPOINT_EVERY ?? "1000", 10));
const USE_WIKI_CACHE = process.env.PRISM_NNG_USE_WIKI_CACHE !== "0";
const FALLBACK_LOCAL = process.env.PRISM_NNG_EMBED_FALLBACK_LOCAL !== "0";
const OLLAMA_TIMEOUT_MS = 20000;
// GNN-F0 macroF1-lift: in --ghosts-only mode, enrich each ghost's embed text with a
// leak-free SOURCE signal (file docblock + class + method names) pulled from the
// engine's own .ts. Name-only embeddings cap macroF1 ~0.33 (CAM bridges land near
// prism_ai); the source docblock is the disambiguating cue. Disable for A/B with
// PRISM_NNG_GHOST_SOURCE=0 (falls back to name-only ghostEmbedText).
const GHOST_SOURCE = process.env.PRISM_NNG_GHOST_SOURCE !== "0";
// SHARP coverage lever (slot:india, NN-GRAPH tier-5): opt-in IDF-salience lead +
// drop-constant-kind in ghostEmbedText. Default OFF -> deployed embeddings byte-identical.
const GHOST_SHARP = process.env.PRISM_NNG_GHOST_SHARP === "1";
const GHOST_LEAD_K = Math.max(0, parseInt(process.env.PRISM_NNG_GHOST_LEAD_K || "12", 10) || 12);
const ENGINES_DIR = path.join(REPO_ROOT, "mcp-server/src/engines");
const DISPATCHERS_DIR = path.join(REPO_ROOT, "mcp-server/src/tools/dispatchers");
// GNN action-surface lever (slot:india 2026-06-21): in --ghosts-only mode, append the
// dispatcher ACTION names an engine BACKS to its source signal. Action names carry direct
// dispatcher-class vocabulary the description prose lacks (action-surface 6/18 vs name 5/18
// separable -- reference_action_surface_separability_measure_2026_06_21). LEAK-FREE: derived
// from dispatcher case bodies (engine<-action), never the node's own wiring label; a truly
// unwired ghost backs NO action -> EMPTY surface -> no-op (the deployed-355 ghosts stay
// byte-identical), so only the codebase-WIRED refs (real .ts, real backing actions) gain
// signal. Default OFF -> deployed embeddings byte-identical; A/B with PRISM_NNG_GHOST_ACTION_SURFACE=1.
const GHOST_ACTION_SURFACE = process.env.PRISM_NNG_GHOST_ACTION_SURFACE === "1";
// GNN import-fingerprint lever (slot:india 2026-06-21): in --ghosts-only mode, append the
// IDF-weighted non-engine import-path tokens to each ghost's source signal. Import paths
// carry domain-structural signal independent of description prose (a calc engine imports
// kinematics/material libs; a CAM engine imports gcode/toolpath libs). LEAK-FREE: import
// statements are structural properties of the .ts file, independent of which dispatcher
// routes to it -- no label appears in an import path. A ghost with no non-engine imports
// (or all-universal imports idf=0) produces an empty fingerprint -> no-op -> the deployed
// embeddings stay byte-identical. Default OFF -> byte-identical; A/B with PRISM_NNG_GHOST_IMPORT_FP=1.
const GHOST_IMPORT_FP = process.env.PRISM_NNG_GHOST_IMPORT_FP === "1";

/** Compact embedding-input string for a graph node. */
export function nodeEmbedText(node) {
  if (!node || typeof node !== "object") return "";
  const kind = node.kind ?? "";
  const label = node.label ?? node.id ?? "";
  const info = node.info ?? "";
  return [kind, label, info].filter(Boolean).join(" | ").slice(0, 1200);
}

/**
 * LEAK-FREE embed text for a ghost.unwired-engine node (GNN-F0/2d). The graph
 * `info` field embeds the keyword-rule's `proposed_wiring` VERBATIM ("...proposed
 * wiring: prism_X (confidence ...)") — which is the eval TRUTH label. Embedding it
 * leaks the answer (a k-NN over it scores a fake AUROC ~0.98). We strip that
 * sentence and embed only the legitimate identity signal: kind + engine name +
 * any residual non-answer info. The engine NAME is the real classification cue
 * (the keyword rule itself derived the label from the name) — this measures
 * whether the embedding can reproduce the dispatcher from the name, the real task.
 */
export function ghostEmbedText(node, sourceSignal = "", opts = {}) {
  if (!node || typeof node !== "object") return "";
  const kind = node.kind ?? "";
  const label = node.label ?? node.id ?? "";
  let info = String(node.info ?? "");
  // Strip the leaking "…proposed wiring: <dispatcher> (confidence …, reason: …)"
  // clause entirely (covers prism_* AND the UNKNOWN sentinel) — everything from
  // "proposed wiring:" to end-of-string is the keyword-rule's answer + rationale.
  info = info.replace(/proposed wiring:[^]*$/i, "").replace(/Unwired engine\s*[—-]?\s*$/i, "").trim();
  const sig = typeof sourceSignal === "string" ? sourceSignal.trim() : "";
  // REJECTED AT THE DEPLOY GATE (slot:india 2026-06-18, refs-only single-scheme eval): sharp RAISES
  // the global separability margin (0.0526->0.0648) but DROPS k-NN coverage/AUROC (refs-only AUROC
  // 0.7453->0.7031, Brier@gate 0.2243->0.2736) -- it loosens intra-class cohesion (0.83->0.72), so the
  // vote gets noisier. Margin is a MISLEADING proxy for selective-deploy coverage. Kept as an opt-in,
  // default-OFF measurement lever (reusable for future scheme experiments); do NOT enable in any
  // deployed path. See [[reference_gnn_sharp_embed_lever_2026_06_18]].
  // SHARP mode (opt-in, PRISM_NNG_GHOST_SHARP=1 -> opts.sharp + opts.idf Map): attack the
  // measured tier-5 coverage crowding (inter-class cosine ~0.75, mean separability margin
  // 0.053 -- reference_gnn_embed_separability_2026_06_18). Two crowding reducers: (1) LEAD
  // with the engine's highest-IDF (rarest = most domain-distinctive) tokens so nomic weights
  // the disambiguating vocabulary the diagnostic proved is the separator; (2) DROP the
  // constant `kind` ("ghost.unwired-engine" is identical for every ghost -- a pure shared
  // direction that inflates every pairwise cosine). Leak-free: IDF is source-frequency only,
  // never the dispatcher label. Default (no opts) is BYTE-IDENTICAL to the deployed path.
  if (opts && opts.sharp && opts.idf instanceof Map) {
    // The lead INTENTIONALLY repeats tokens already present in label/info/sig -- the
    // repetition is the salience boost (it biases nomic's mean-pooled vector toward the
    // rare/distinctive tokens). Do NOT de-dup the lead against the body: that removes the
    // boost and silently neuters the crowding-reduction lever (measured inter-cosine 0.75->0.60).
    const lead = salientLead([label, info, sig].filter(Boolean).join(" "), opts.idf, opts.leadK ?? 12);
    return [lead, label, info, sig].filter(Boolean).join(" | ").slice(0, 1600);
  }
  // cap 1600 (was 1200): the source signal is the valuable disambiguating part and
  // fits comfortably under nomic-embed-text's context window.
  return [kind, label, info, sig].filter(Boolean).join(" | ").slice(0, 1600);
}

/**
 * Leak-free SOURCE signal for an engine, extracted from its own .ts file. Returns
 * a compact descriptor: leading file docblock + class name(s) + public method names.
 *
 * BEST-EFFORT leak reduction (R12): the eval TRUTH label = keyword_rule(engineName)
 * and the graph `info` field embeds that answer verbatim (the leak ghostEmbedText
 * strips). The engine's SOURCE is independent human-written code, but a docblock
 * could still name a dispatcher — so we defensively strip BOTH the `proposed wiring:`
 * phrasing AND any literal `prism_*` dispatcher token. The disambiguating signal is
 * the DOMAIN vocabulary ("Mastercam", "toolpath", …), never the dispatcher name; the
 * engine NAME stays (legitimate, name-derived signal already in the embed text). At
 * real inference the source IS available for an unwired engine, so this measures the
 * production task ("recover the dispatcher from name + source"), not a self-answer.
 */
export function engineSourceSignal(src, { maxChars = 900 } = {}) {
  if (typeof src !== "string" || !src) return "";
  const parts = [];
  // 1. leading file docblock — the human description of what the engine does
  const doc = src.match(/\/\*\*([\s\S]*?)\*\//);
  if (doc) {
    const text = doc[1]
      .replace(/^\s*\*\s?/gm, " ")   // strip JSDoc leading "* "
      .replace(/@\w+/g, " ")          // drop @tags (@param, @milestone, …)
      .replace(/\s+/g, " ")
      .trim();
    if (text) parts.push(text);
  }
  // 2. class name(s) — strong identity cue
  const classes = [...src.matchAll(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g)].map((m) => m[1]);
  if (classes.length) parts.push("class " + [...new Set(classes)].slice(0, 3).join(", "));
  // 3. PUBLIC method names (best-effort, 2–6 space indent) — capability fingerprint.
  // Drop private/protected members: they are implementation noise, not capability,
  // and diluting the signal with them weakens the disambiguation (reviewer P1-1).
  const RESERVED = new Set(["constructor", "if", "for", "while", "switch", "catch", "return", "function", "get", "set"]);
  const methods = [...src.matchAll(/^\s{2,6}((?:public\s+|private\s+|protected\s+|static\s+|async\s+|readonly\s+)*)(\w+)\s*\(/gm)]
    .filter((m) => !/\b(?:private|protected)\b/.test(m[1]))
    .map((m) => m[2])
    .filter((n) => n && !RESERVED.has(n));
  const uniqMethods = [...new Set(methods)].slice(0, 18);
  if (uniqMethods.length) parts.push("methods: " + uniqMethods.join(", "));
  let out = parts.join(" | ");
  // Defensive leak reduction: drop the keyword-rule answer phrasing AND any literal
  // prism_* dispatcher token (a docblock that names its dispatcher would otherwise
  // restate the truth label). Domain words — the real signal — are untouched.
  out = out.replace(/proposed wiring:[^]*$/i, "").replace(/\bprism_[a-z0-9_]+/gi, " ").replace(/\s+/g, " ").trim();
  return out.slice(0, maxChars);
}

/**
 * Append an engine's dispatcher ACTION-SURFACE text to its leak-free source signal
 * (GNN action-surface lever, slot:india 2026-06-21). The action NAMES an engine backs carry
 * direct dispatcher-class signal the description prose lacks (action-surface separates 6/18 vs
 * the name's 5/18 -- reference_action_surface_separability_measure_2026_06_21).
 *
 * LEAK-SAFE: `surfText` is derived from dispatcher case bodies (engine <- action), NEVER the
 * node's own wiring label. A truly UNWIRED ghost backs no action -> empty `surfText` -> this
 * returns `sig` UNCHANGED: the no-op for the actual classification target. The signal therefore
 * lives only on the codebase-WIRED refs (real backing actions) and generalizes to unwired ghosts
 * via GraphSAGE message-passing, never via the ghost's own label (the anti fake-0.98 contract).
 * The defensive prism_* strip mirrors engineSourceSignal -- an action name is not a dispatcher
 * token today, but the strip keeps the truth label out under any future action-naming change.
 * Pure; the combined signal is bounded to `maxChars` so the action tail cannot crowd out the
 * source prose before ghostEmbedText's own 1600-char join cap.
 */
export function appendActionSurface(sig, surfText, { maxChars = 1400 } = {}) {
  const base = typeof sig === "string" ? sig : "";
  const surf = typeof surfText === "string"
    ? surfText.replace(/\bprism_[a-z0-9_]+/gi, " ").replace(/\s+/g, " ").trim()
    : "";
  if (!surf) return base; // unwired ghost / no surface -> identity (the leak-free contract)
  const tail = `actions: ${surf}`;
  return (base ? `${base} | ${tail}` : tail).slice(0, maxChars);
}

// --- SHARP-mode IDF salience (NN-GRAPH tier-5 coverage lever, slot:india) ---
// Pure, leak-free helpers behind ghostEmbedText's opt-in sharp path. Generic
// code/structural tokens that survive tokenization but carry no DOMAIN signal --
// IDF already down-weights frequent words, this just trims pure boilerplate so a
// short top-K lead is not wasted on "engine"/"return"/"public".
const IDF_STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "are", "not", "via", "per", "its",
  "class", "methods", "method", "public", "static", "async", "await", "const", "let", "var",
  "return", "returns", "string", "number", "boolean", "void", "object", "array", "null", "undefined",
  "engine", "engines", "function", "import", "export", "interface", "type", "value", "values",
  "param", "params", "data", "result", "results", "input", "output", "options", "opts", "node",
]);

/** Lowercase alnum tokens >=3 chars, minus pure-structural stopwords. Pure. */
export function tokenizeForIdf(text) {
  if (typeof text !== "string" || !text) return [];
  return (text.toLowerCase().match(/[a-z][a-z0-9]{2,}/g) || []).filter((t) => !IDF_STOP.has(t));
}

/**
 * Document-frequency IDF over a corpus of strings: Map<token, ln(N / df)>. A token
 * in EVERY doc -> idf 0 (suppressed shared vocab); a token in ONE doc -> idf ln(N)
 * (max salience). Pure + leak-free: frequency over SOURCE text, never the label.
 */
export function buildIdfMap(docStrings) {
  const docs = Array.isArray(docStrings) ? docStrings : [];
  const N = docs.length || 1;
  const df = new Map();
  for (const d of docs) {
    for (const t of new Set(tokenizeForIdf(d))) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf = new Map();
  for (const [t, c] of df) idf.set(t, Math.log(N / c));
  return idf;
}

/**
 * Top-K unique tokens of `text` by IDF (rarest/most-distinctive first), space-joined.
 * Ties broken by first occurrence so the lead is deterministic. Tokens absent from the
 * map or with idf<=0 (shared across the whole corpus) are dropped -- they only crowd.
 */
export function salientLead(text, idfMap, k = 12) {
  if (!(idfMap instanceof Map)) return "";
  const seen = new Set();
  const scored = [];
  const toks = tokenizeForIdf(text);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (seen.has(t)) continue;
    seen.add(t);
    const w = idfMap.get(t);
    if (Number.isFinite(w) && w > 0) scored.push({ t, w, i });
  }
  scored.sort((a, b) => (b.w - a.w) || (a.i - b.i));
  return scored.slice(0, Math.max(0, k | 0)).map((s) => s.t).join(" ");
}

/**
 * Recursively map engine source basenames → absolute path (first-wins on collision).
 * Skips test/spec/.d.ts files. Internal helper (fs-recursive; engineSourceSignal is
 * the pure, unit-tested unit). Returns { collisions } for reporting.
 */
function walkEngineSources(dir, map) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  let collisions = 0;
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { collisions += walkEngineSources(full, map); continue; }
    if (!e.isFile() || !/\.(ts|js|mts|cts)$/.test(e.name) || /\.(test|spec|d)\./.test(e.name)) continue;
    const base = e.name.replace(/\.(ts|js|mts|cts)$/, "");
    if (map.has(base)) { collisions++; continue; }
    map.set(base, full);
  }
  return collisions;
}

/** Stable content hash for resume-keying (id + embed-text). */
export function nodeContentHash(node) {
  return crypto.createHash("sha1").update(`${node.id}${nodeEmbedText(node)}`).digest("hex").slice(0, 12);
}

/**
 * The exact text embedded for a node given its mode + resolved source signal.
 * Exported so the resume-skip invariant is directly testable (the closures in
 * main() delegate here): a CHANGED `sourceSignal` MUST change the text (else a
 * richer-text ghost re-run is wrongly skipped as already-embedded), while a
 * non-ghost node returns `nodeEmbedText(node)` verbatim.
 */
export function embedTextFor(node, { ghostsOnly = false, sourceSignal = "", sharp = false, idf = null, leadK } = {}) {
  return ghostsOnly ? ghostEmbedText(node, sourceSignal, { sharp, idf, leadK }) : nodeEmbedText(node);
}

/**
 * Resume hash over (id + the ACTUAL embed text). MUST use the SAME \x1F id/text
 * delimiter as nodeContentHash so that for a non-ghost node embedResumeHash EXACTLY
 * equals nodeContentHash — otherwise the swap from nodeContentHash → this on the
 * resume path silently invalidates the full-graph (_node-embeddings.jsonl) cache and
 * re-embeds all ~372k nodes. (The delimiter also keeps id|text boundaries
 * collision-safe: id="ab",text="c" must not hash like id="a",text="bc".)
 */
export function embedResumeHash(node, opts = {}) {
  return crypto.createHash("sha1").update(`${node.id}\x1F${embedTextFor(node, opts)}`).digest("hex").slice(0, 12);
}

/** L2-normalize then int8-quantize. Mirrors build-wiki-embeddings.mjs:quantize. */
export function quantize(vec) {
  let norm = 0;
  for (const x of vec) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  const unit = vec.map((x) => x / norm);
  let maxAbs = 0;
  for (const x of unit) { const a = Math.abs(x); if (a > maxAbs) maxAbs = a; }
  const scale = (maxAbs || 1) / 127;
  const q = unit.map((x) => Math.max(-127, Math.min(127, Math.round(x / scale))));
  return { s: Number(scale.toExponential(4)), q };
}

/** Reconstruct an approximate unit vector from a quantized record. */
export function dequantize(rec) {
  if (!rec || !Array.isArray(rec.q) || typeof rec.s !== "number") return null;
  return rec.q.map((x) => x * rec.s);
}

async function ollamaEmbed(prompt, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const v = j && (j.embedding || (j.data && j.data[0] && j.data[0].embedding));
    return Array.isArray(v) && v.length ? v : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Load the wiki embedding cache keyed by name. Returns Map<name, {q,s}> + generatedAt. */
function loadWikiCache() {
  const byName = new Map();
  let generatedAtMs = 0;
  if (!USE_WIKI_CACHE || !fs.existsSync(WIKI_EMB_PATH)) return { byName, generatedAtMs };
  try {
    for (const line of fs.readFileSync(WIKI_EMB_PATH, "utf8").split(/\r?\n/)) {
      const trim = line.trim();
      if (!trim) continue;
      let r;
      try { r = JSON.parse(trim); } catch { continue; }
      if (r && r.__meta) {
        generatedAtMs = Date.parse(r.generatedAt ?? "1970") || 0;
        continue;
      }
      if (r && r.n && Array.isArray(r.q) && typeof r.s === "number") byName.set(r.n, { q: r.q, s: r.s });
    }
  } catch { /* ignore — cache is best-effort */ }
  return { byName, generatedAtMs };
}

/** Load already-emitted records for resume. Keyed by id. */
function loadExisting() {
  const byId = new Map();
  for (const p of [OUT_PATH, PARTIAL_PATH]) {
    if (!fs.existsSync(p)) continue;
    try {
      for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
        const trim = line.trim();
        if (!trim) continue;
        let r;
        try { r = JSON.parse(trim); } catch { continue; }
        if (r && r.__meta) continue;
        if (r && r.id && r.h) byId.set(r.id, r.h);
      }
    } catch { /* corrupt partial — resume from what parsed */ }
  }
  return byId;
}

/** Bounded-concurrency map. Pure helper (testable). */
export async function pMap(items, concurrency, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function parseArgs(argv) {
  const a = { limit: 0, dryRun: false, json: false, graph: null, out: null, ghostsOnly: false, emitTexts: null };
  for (let i = 2; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--limit") a.limit = parseInt(argv[++i], 10) || 0;
    else if (x === "--dry-run") a.dryRun = true;
    else if (x === "--json") a.json = true;
    // GNN-F0/2a: --graph points at a CURRENT graph (system-graph.json is fresh;
    // system-graph-normalized.json is stale). --ghosts-only embeds just the
    // ghost.unwired-engine nodes (~636) — distinct nomic vectors that break the
    // tier-5 constant-vote collapse. --out targets a dedicated file.
    else if (x === "--graph") a.graph = argv[++i];
    else if (x === "--out") a.out = argv[++i];
    else if (x === "--ghosts-only") a.ghostsOnly = true;
    // --emit-texts taps the EXACT per-node embed text (parity for an external embedder,
    // e.g. a GPU model A/B) WITHOUT calling Ollama -- it reuses the same text +
    // source-signal resolution as the embed path, so the emitted text is byte-identical
    // to what the deployed pipeline embeds. Vectorless; the consumer embeds + quantizes.
    else if (x === "--emit-texts") a.emitTexts = argv[++i];
    else if (x === "--help" || x === "-h") {
      process.stdout.write("usage: build-node-embeddings [--limit N] [--dry-run] [--json] [--graph PATH] [--out PATH] [--ghosts-only] [--emit-texts PATH]\n");
      process.exit(0);
    }
  }
  return a;
}

/** Ghost node kind whose distinct embeddings break the tier-5 constant-vote collapse. */
const GHOST_KIND = "ghost.unwired-engine";

async function main() {
  // Phase-3 throttle (slot:india 2026-06-15): yield CPU to interactive work during
  // the heavy corpus embed. Fail-soft; disable with PRISM_BATCH_NICE_DISABLE=1.
  nicifySelf();
  const args = parseArgs(process.argv);
  const startMs = Date.now();

  // GNN-F0/2a: a --graph override (point at the CURRENT system-graph.json, not the
  // stale -normalized one) + --out override for a dedicated ghost-embedding file.
  const graphPath = args.graph || GRAPH_PATH;
  const outPath = args.out || OUT_PATH;
  const partialPath = `${outPath}.partial`;

  if (!fs.existsSync(graphPath)) {
    process.stderr.write(`graph missing: ${graphPath}${args.graph ? "" : " — run regen-graph-normalized.mjs first"}\n`);
    process.exit(2);
  }
  // Streaming read — bypasses V8 ~512MB string-length ceiling. See scripts/lib/graph-io.mjs.
  const graph = readGraphStreaming(graphPath);
  let nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  if (args.ghostsOnly) nodes = nodes.filter((n) => n && n.kind === GHOST_KIND);
  if (args.limit > 0) nodes = nodes.slice(0, args.limit);

  const graphMtimeMs = fs.statSync(graphPath).mtimeMs;
  const { byName: wikiCache, generatedAtMs: wikiGenMs } = loadWikiCache();
  // Timestamp guard: only reuse wiki vectors if wiki cache predates the graph
  // snapshot (else the wiki entry may encode post-hoc wiring info → leakage).
  const wikiSafe = wikiGenMs > 0 && wikiGenMs <= graphMtimeMs;

  const existing = loadExisting();

  // GNN-F0 macroF1-lift: resolve a leak-free SOURCE signal per ghost from its .ts.
  // Built once before the embed loop so the resume-hash (below) reflects the ACTUAL
  // embed text — otherwise a richer-text re-run would be wrongly skipped as "already
  // embedded" (the prior bug: nodeContentHash keyed off name-only nodeEmbedText).
  const sourceSignalById = new Map();
  let sourceResolved = 0, sourceMissing = 0, sourceCollisions = 0, actionSurfaceApplied = 0, importFpApplied = 0;
  if (args.ghostsOnly && GHOST_SOURCE) {
    const nameToPath = new Map();
    sourceCollisions = walkEngineSources(ENGINES_DIR, nameToPath);
    // Action-surface map (engine stem -> dispatcher action names it backs), built ONCE.
    // appendActionSurface is a no-op for a truly-unwired ghost (empty surface) -> the
    // deployed-355 ghosts stay byte-identical; only codebase-wired refs gain the vocab.
    const surfaceMap = GHOST_ACTION_SURFACE ? buildActionSurfaceMap(DISPATCHERS_DIR) : null;
    // Import-fingerprint map (engine stem -> non-engine import-path tokens), built ONCE.
    // importFingerprintText is a no-op for a ghost with no non-universal imports -> empty
    // string -> append is identity -> deployed embeddings byte-identical when flag is OFF.
    const importFpMap = GHOST_IMPORT_FP ? buildImportFingerprintMap(ENGINES_DIR) : null;
    const importIdfMap = GHOST_IMPORT_FP ? buildImportIdfMap(importFpMap) : null;
    for (const n of nodes) {
      const name = n.label ?? n.id;
      const p = nameToPath.get(name);
      if (p) {
        try {
          let sig = engineSourceSignal(fs.readFileSync(p, "utf8"));
          if (sig) {
            if (surfaceMap) {
              const surf = actionSurfaceText(surfaceMap, String(name).toLowerCase());
              if (surf) { sig = appendActionSurface(sig, surf); actionSurfaceApplied++; }
            }
            if (importFpMap && importIdfMap) {
              const stemLower = String(name).toLowerCase();
              const fpTokens = importFpMap.get(stemLower) || [];
              const fpText = importFingerprintText(fpTokens, importIdfMap);
              if (fpText) { sig = (sig ? `${sig} | imports: ${fpText}` : `imports: ${fpText}`).slice(0, 1400); importFpApplied++; }
            }
            sourceSignalById.set(n.id, sig); sourceResolved++; continue;
          }
        } catch { /* unreadable source -> name-only fallback */ }
      }
      sourceMissing++;
    }
  }

  // Delegate to the exported helpers (tested): real embed text keeps resume correct
  // across enrichment changes, and embedResumeHash carries the SAME \x1F delimiter as
  // nodeContentHash so the non-ghost full-graph resume cache is NOT invalidated.
  // SHARP coverage lever: build the leak-free IDF map over THIS embed set's source text
  // (label + cleaned info + signal) so each ghost can LEAD with its rarest tokens.
  let idfMap = null;
  if (GHOST_SHARP && args.ghostsOnly) {
    const corpus = nodes.map((n) => {
      const info = String(n.info ?? "").replace(/proposed wiring:[^]*$/i, "").trim();
      return [n.label ?? n.id ?? "", info, sourceSignalById.get(n.id) || ""].join(" ");
    });
    idfMap = buildIdfMap(corpus);
  }
  const optsFor = (node) => ({ ghostsOnly: args.ghostsOnly, sourceSignal: sourceSignalById.get(node.id) || "", sharp: GHOST_SHARP, idf: idfMap, leadK: GHOST_LEAD_K });
  const embedTextForNode = (node) => embedTextFor(node, optsFor(node));
  const hashFor = (node) => embedResumeHash(node, optsFor(node));

  // --emit-texts: write the EXACT embed text (+ id/name/kind/resume-hash) per node and
  // return WITHOUT embedding. The text is produced by the same embedTextForNode/source-
  // signal resolution the Ollama path uses, so an external embedder (GPU model A/B) gets
  // byte-identical inputs -> only the MODEL differs, never the text (apples-to-apples).
  if (args.emitTexts) {
    const emitPath = path.resolve(args.emitTexts);
    fs.mkdirSync(path.dirname(emitPath), { recursive: true });
    const out = [JSON.stringify({
      __meta: true, emitTexts: true, source: path.basename(graphPath),
      ghostsOnly: args.ghostsOnly, count: nodes.length, generatedAt: new Date().toISOString(),
    })];
    for (const node of nodes) {
      out.push(JSON.stringify({
        id: node.id, n: node.label ?? node.id, k: node.kind ?? null,
        h: hashFor(node), text: embedTextForNode(node),
      }));
    }
    fs.writeFileSync(emitPath, out.join("\n") + "\n");
    if (args.json) process.stdout.write(JSON.stringify({ ok: true, emitTexts: emitPath, count: nodes.length }) + "\n");
    else process.stdout.write(`build-node-embeddings: emitted ${nodes.length} texts -> ${emitPath}\n`);
    return;
  }

  const stats = {
    total: nodes.length, embedded: 0, wikiReused: 0, ollama: 0,
    localFallback: 0, skippedResume: 0, failed: 0,
    sourceResolved, sourceMissing, sourceCollisions, actionSurfaceApplied, importFpApplied,
  };

  if (args.dryRun) {
    const wouldReuse = nodes.filter(n => wikiSafe && wikiCache.has(n.label ?? n.id)).length;
    const summary = {
      ok: true, dryRun: true, total: nodes.length,
      wikiCacheEntries: wikiCache.size, wikiSafe, wouldReuseFromWiki: wouldReuse,
      alreadyEmbedded: existing.size, concurrency: CONCURRENCY,
    };
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    return;
  }

  // Open partial stream
  fs.mkdirSync(path.dirname(partialPath), { recursive: true });
  const metaLine = JSON.stringify({
    __meta: true, model: MODEL, dim: EMBED_DIM, schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(), source: path.basename(graphPath),
    ghostsOnly: args.ghostsOnly,
  }) + "\n";
  // Fresh partial unless resuming
  if (!fs.existsSync(partialPath) || existing.size === 0) {
    fs.writeFileSync(partialPath, metaLine);
  }

  const pending = nodes.filter(n => {
    const h = hashFor(n);
    if (existing.get(n.id) === h) { stats.skippedResume++; return false; }
    return true;
  });

  let writeBuf = [];
  const flush = () => {
    if (writeBuf.length) { fs.appendFileSync(partialPath, writeBuf.join("")); writeBuf = []; }
  };

  await pMap(pending, CONCURRENCY, async (node) => {
    const name = node.label ?? node.id;
    const h = hashFor(node);
    let q = null, s = null, src = null;

    // 1. wiki-cache reuse (timestamp-guarded). NOT in --ghosts-only mode: a wiki
    // vector would BYPASS the leak-free ghostEmbedText (a wiki entry can encode
    // post-hoc wiring info), silently reintroducing the proposed_wiring leak the
    // ghost path exists to prevent. Ghosts always go to the leak-free nomic path.
    if (!args.ghostsOnly && wikiSafe && wikiCache.has(name)) {
      const c = wikiCache.get(name);
      q = c.q; s = c.s; src = "wiki";
      stats.wikiReused++;
    } else {
      // 2. Ollama embed (leak-free text for ghosts — `info` embeds the answer label;
      //    ghosts also carry the engine SOURCE signal via embedTextFor)
      const vec = await ollamaEmbed(embedTextForNode(node));
      if (vec && vec.length) {
        const qz = quantize(vec.slice(0, EMBED_DIM).concat(new Array(Math.max(0, EMBED_DIM - vec.length)).fill(0)));
        q = qz.q; s = qz.s; src = "nomic";
        stats.ollama++;
      } else if (FALLBACK_LOCAL) {
        // 3. zero-vector fallback (LocalEmbedding wiring deferred to peer slot;
        //    a zero vector is a valid no-info baseline that keeps dims aligned)
        q = new Array(EMBED_DIM).fill(0); s = 1; src = "zero";
        stats.localFallback++;
      } else {
        stats.failed++;
        return;
      }
    }
    writeBuf.push(JSON.stringify({ id: node.id, n: name, h, k: node.kind ?? null, src, s, q }) + "\n");
    stats.embedded++;
    if (writeBuf.length >= CHECKPOINT_EVERY) flush();
  });
  flush();

  // Atomic promote partial → final
  fs.renameSync(partialPath, outPath);

  const elapsedMs = Date.now() - startMs;
  const summary = { ok: true, elapsedMs, out: outPath, ...stats, concurrency: CONCURRENCY, wikiSafe };
  if (args.json) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); return; }
  process.stdout.write(`build-node-embeddings: wrote ${outPath}\n`);
  process.stdout.write(`  total=${stats.total} embedded=${stats.embedded} (wiki-reused=${stats.wikiReused} ollama=${stats.ollama} zero-fallback=${stats.localFallback}) skipped-resume=${stats.skippedResume} failed=${stats.failed}\n`);
  if (args.ghostsOnly) {
    process.stdout.write(`  ghost-source: enrich=${GHOST_SOURCE} resolved=${stats.sourceResolved} missing=${stats.sourceMissing} basename-collisions=${stats.sourceCollisions}\n`);
    if (GHOST_SHARP) process.stdout.write(`  ghost-sharp: ON leadK=${GHOST_LEAD_K} idf-vocab=${idfMap ? idfMap.size : 0} (IDF-salience lead + drop-constant-kind)\n`);
    if (GHOST_ACTION_SURFACE) process.stdout.write(`  ghost-action-surface: ON applied=${stats.actionSurfaceApplied}/${stats.sourceResolved} resolved-signals (dispatcher action vocab; empty for unwired ghosts)\n`);
    if (GHOST_IMPORT_FP) process.stdout.write(`  ghost-import-fp: ON applied=${stats.importFpApplied}/${stats.sourceResolved} resolved-signals (non-engine import-path IDF fingerprint; empty for all-universal imports)\n`);
  }
  process.stdout.write(`  wikiSafe=${wikiSafe} concurrency=${CONCURRENCY} elapsed=${(elapsedMs / 1000).toFixed(1)}s\n`);
}

if (import.meta.url.endsWith((process.argv[1] || "").replace(/\\/g, "/").replace(/^.*\//, "/"))) {
  main().catch((e) => { process.stderr.write(`fatal: ${e.stack || e.message}\n`); process.exit(1); });
}
