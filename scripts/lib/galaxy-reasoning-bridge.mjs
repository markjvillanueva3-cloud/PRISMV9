/**
 * galaxy-reasoning-bridge.mjs -- the generic, fleet-wide AI reasoning bridge that
 * wires EVERY galaxy to leg-#10 deep-reasoning (AI-SYNERGY-AUDIT-MS0/U-AISYN-BRIDGE,
 * slot:charlie).
 *
 * The audit's worst real gap was ownsOrWiresAi: ~23 galaxies (mostly infra/meta)
 * have NO AI reasoning wiring. Building 23 bespoke domain bridge engines would be
 * making-work (most have no manufacturing domain to reason about) and risks stubs.
 * The R15 build-once answer: ONE real bridge that lets ANY galaxy reason over ITS
 * OWN knowledge (synthesis memory + CLAUDE identity + live AI posture) through the
 * local Ollama stack. Every galaxy becomes AI-reasoning-capable from a single asset.
 *
 * Split: buildReasoningPrompt is PURE (testable); assembleGalaxyContext + the Ollama
 * call are fail-soft I/O. reasonForGalaxy degrades to context-only when Ollama is
 * down (returns the assembled prompt so the caller's own LLM can reason) -- it never
 * throws.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chunkMarkdown, retrieveTopK, scoreChunks } from "./galaxy-context-retrieval.mjs";
import { cagKey, corpusFingerprint, getCached, putCached, loadCache, saveCache, recordCagStat, cagStatsFileFor } from "./galaxy-cag-cache.mjs";
import { hybridRetrieve } from "./galaxy-dense-rerank.mjs";
import { buildLoraPair, appendLoraPair } from "./galaxy-lora-emit.mjs";
import { readGalaxyBrain } from "./galaxy-brain-read.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "..", "..");
// CAG (cache-augmented generation) answer cache for the bridge -- per (galaxy, model,
// question), content-invalidated by the galaxy's doctrine fingerprint. Off via
// PRISM_GALAXY_BRIDGE_CAG_DISABLE=1 or opts.cache===false.
const CAG_FILE = path.resolve(__dirname, "..", "..", "state/shared/cache/galaxy-reasoning-cag.json");
// Per-galaxy LoRA training-pair sink: every grounded bridge reason becomes an Alpaca pair
// (RAG+reasoning+LoRA synergy). OPT-IN via PRISM_GALAXY_BRIDGE_LORA_EMIT=1 (writing training
// data should be deliberate). Append-only, id-deduped, secret-redacted.
const LORA_DIR = path.resolve(__dirname, "..", "..", "state/shared/lora/bridge-reasoning");
const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
// Default reasoning model: a mid model keeps per-galaxy validation fast; override via env.
const DEFAULT_MODEL = process.env.PRISM_GALAXY_BRIDGE_MODEL || "qwen2.5-coder:32b";
// 120s default: a COLD 32B reasoning model (e.g. qwen2.5-coder:32b ~20GB) can take >60s to
// load+generate on a memory-pressured host. Too short a budget aborts the FIRST call before
// the model finishes loading, so keep_alive never registers and the bridge degrades on every
// subsequent call forever. Override via PRISM_GALAXY_BRIDGE_TIMEOUT_MS.
// [BRAVO AI-SYNERGY-BRIDGE-WARMTH 2026-06-13]
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_GALAXY_BRIDGE_TIMEOUT_MS) || 120000;
// Deep-reasoning model preference (opt-in). The DEFAULT_MODEL above is a fast coder
// model so a 34-galaxy validation sweep stays quick. DEEP mode (opts.deep /
// PRISM_GALAXY_BRIDGE_DEEP=1) trades speed for depth on the /goal-named "deep
// reasoning", routing to the strongest INSTALLED local reasoning model. The order
// mirrors ollama-cost-router.mjs TIER_PREFERENCES.best reasoning rank (gpt-oss:120b
// is the strongest local reasoner, then the deepseek-r1 distills) -- kept as a short
// local list, NOT a fork of the hook router's full task matrix (the bridge's concern
// -- per-galaxy reasoning depth -- is narrower than task routing).
const DEEP_REASONING_PREFERENCE = Object.freeze([
  "gpt-oss:120b",     // strongest local reasoner (96GB Blackwell, deep chain-of-thought)
  "deepseek-r1:32b",  // reasoning distill, 20GB, installed (BLACKWELL-MODEL-EXPAND 2026-06-10)
  "gpt-oss:20b",      // mid reasoning fallback
]);
const SYNTHESIS_MAX_CHARS = 1800;
// RAG hot path: how many retrieved sections to feed, and the BOUNDED per-galaxy corpus.
// We retrieve over the galaxy's OWN doctrine brain (CLAUDE + MEMORY + AWARENESS + the
// synthesis memory) -- a small, deterministic, always-present file set (NOT a full-vault
// scan, which would risk the tribal-index 512MiB-cap landmine and non-determinism). A
// dense/embedding rerank arm can layer on top later via the same chunk interface.
const RAG_TOP_K = Number(process.env.PRISM_GALAXY_BRIDGE_RAG_K) || 5;
const RAG_CHUNK_MAX_CHARS = 900;
// Wiki synergy (BRAVO AI-SYNERGY-BRIDGE-WIKI, slot:bravo 2026-06-13): the /goal names
// "synergized with ... wikis across all galaxies". The reasoning corpus resolves the
// [[wiki-links]] the galaxy's OWN doctrine docs reference to their wiki bodies under
// knowledge/wiki/**, so per-galaxy reasoning can draw on the galaxy's curated wiki (the
// Karpathy LLM-wiki the CLAUDE.md says to "query before re-deriving"). Bounded + fail-soft +
// a NAMES-ONLY memoized index (readdir, NOT a content vault-scan -> no 512MiB-cap landmine).
// Default OFF in gatherGalaxyDocs (protects the GNN node-feature consumer that reads it
// directly); default ON only on the reasoning path (assembleGalaxyContext, env opt-out
// PRISM_GALAXY_BRIDGE_WIKI=0). Mirrors the masterBrain opt-in pattern (R11).
const WIKI_DIR_REL = "knowledge/wiki";
const WIKI_LINK_CAP = Number(process.env.PRISM_GALAXY_BRIDGE_WIKI_CAP) || 6;
const WIKI_DOC_MAX_CHARS = 1600;
const _wikiNameIndexCache = new Map(); // root -> Map(basenameLower -> fullpath)
// A-06 cross-galaxy compound recall (HERMES-ZULU-A06, slot:zulu 2026-06-11): the galaxy's
// MASTER-brain back-pointer + fleet cross-recall edge set, added to the doctrine corpus so the
// bridge reasons FLEET-aware, not just self-aware. The master memory is an absolute host path
// (injectable for tests). Source: scripts/lib/galaxy-brain-read.mjs (built+tested separately).
const MASTER_MEMORY_DEFAULT = process.env.PRISM_MASTER_MEMORY ||
  "C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md";

/**
 * masterBrainEnabled -- gate for the A-06 master-brain corpus arm. OPT-IN
 * (PRISM_GALAXY_BRIDGE_MASTER=1) by deliberate choice: unlike the dense arm (additive within
 * the local corpus), this pulls an absolute-path host file into the fleet-wide reasoning corpus
 * + CAG fingerprint, so it stays flagged until a 3-of-3 review flips it on by default. PURE.
 */
export function masterBrainEnabled(env = process.env) { return env.PRISM_GALAXY_BRIDGE_MASTER === "1"; }

function readOptional(p) {
  try {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  } catch {
    /* absent */
  }
  return null;
}

/** First meaningful (non-frontmatter, non-blank, non-bare-heading) line of a doc. */
export function firstIdentityLine(md, fallback) {
  if (typeof md !== "string" || !md) return fallback;
  let body = md;
  const fm = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (fm) body = body.slice(fm[0].length);
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const h = line.replace(/^#+\s*/, "").trim();
      if (h) return h;
      continue;
    }
    if (line.startsWith(">") || line.startsWith("<!--") || line === "---") continue;
    return line.replace(/^[-*]\s*/, "").trim();
  }
  return fallback;
}

/**
 * PURE: extract unique [[wiki-link]] names from text. Handles [[name]], [[name|alias]],
 * [[name#section]]. Returns lowercase-normalized unique names (insertion order preserved).
 */
export function extractWikiLinks(text) {
  if (typeof text !== "string" || !text) return [];
  const out = [];
  const seen = new Set();
  const re = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;
  for (const m of text.matchAll(re)) {
    const name = m[1].trim().toLowerCase();
    if (name && !seen.has(name)) { seen.add(name); out.push(name); }
  }
  return out;
}

/** Memoized NAMES-ONLY index of the wiki tree: basename(lower, no .md) -> fullpath. Fail-soft. */
function wikiNameIndex(root) {
  if (_wikiNameIndexCache.has(root)) return _wikiNameIndexCache.get(root);
  const idx = new Map();
  try {
    const wikiDir = path.join(root, WIKI_DIR_REL);
    const entries = fs.readdirSync(wikiDir, { recursive: true, withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith(".md")) continue;
      const base = e.name.slice(0, -3).toLowerCase();
      if (!idx.has(base)) idx.set(base, path.join(e.parentPath || e.path || wikiDir, e.name));
    }
  } catch { /* no wiki dir -> empty index (fail-soft) */ }
  _wikiNameIndexCache.set(root, idx);
  return idx;
}

/**
 * Resolve the [[wiki-links]] present in the galaxy's local doctrine text to their wiki bodies.
 * Bounded (<= WIKI_LINK_CAP), char-capped, frontmatter-stripped, fail-soft (NEVER throws ->
 * worst case returns []). Non-wiki [[links]] (memory refs etc.) simply don't resolve and are
 * skipped, so this naturally filters to real wiki entries the galaxy references.
 */
export function resolveGalaxyWikiDocs(localText, root, opts = {}) {
  try {
    const cap = opts.cap || WIKI_LINK_CAP;
    const charCap = opts.charCap || WIKI_DOC_MAX_CHARS;
    const idx = wikiNameIndex(root);
    if (!idx.size) return [];
    const out = [];
    const usedPaths = new Set();
    for (const name of extractWikiLinks(localText)) {
      if (out.length >= cap) break;
      const p = idx.get(name);
      if (!p || usedPaths.has(p)) continue;
      let text = readOptional(p);
      if (!text || !text.trim()) continue;
      const fm = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
      if (fm) text = text.slice(fm[0].length);
      text = text.trim().slice(0, charCap);
      if (!text) continue;
      usedPaths.add(p);
      out.push({ source: `wiki/${name}`, text });
    }
    return out;
  } catch {
    return []; // fully fail-soft -- wiki synergy never breaks the corpus
  }
}

/**
 * PURE: resolve whether the REASONING path includes galaxy wiki in its corpus. Default ON;
 * env opt-out PRISM_GALAXY_BRIDGE_WIKI=0; explicit opts.includeWiki wins. SINGLE source of the
 * decision so the corpus the prompt is built over == the corpus the dense rerank AND the CAG
 * fingerprint are computed over (else dense silently drops wiki / a stale wiki-blind cache
 * serves pre-wiki answers -- the 3-of-3 scrutiny P1). gatherGalaxyDocs's OWN default stays OFF
 * (protects the GNN node-feature consumer); this gates only the reasoning path.
 */
export function resolveWikiMode({ optsIncludeWiki, env = process.env } = {}) {
  return optsIncludeWiki ?? (env.PRISM_GALAXY_BRIDGE_WIKI !== "0");
}

// Local-reasoning resilience: a model FALLBACK LADDER. When the requested reasoning model fails
// to load/generate (cold-load timeout under memory pressure, a reaped runner, or 404), retry with
// a progressively SMALLER installed reasoner BEFORE degrading to the caller's LLM -- so local
// per-galaxy reasoning survives instead of bouncing to Claude (token-economy + the resilience half
// of "robust leg #10"; keep_alive is the warmth half). Validatable since the substrate recovery:
// 120B/32B/1.5B all confirmed loadable. Size-ordered large->small; the ladder starts at the
// requested model and only DESCENDS (never tries a larger/slower model). An unknown/custom
// requested model gets NO fallback ([requested] only) -- we never guess a substitute for a model
// we don't recognize. Override the tier list via PRISM_GALAXY_BRIDGE_FALLBACK (csv, large->small).
const FALLBACK_TIERS = Object.freeze(["gpt-oss:120b", "qwen2.5-coder:32b", "gpt-oss:20b", "qwen2.5-coder:1.5b"]);
export function buildFallbackLadder(requestedModel, env = process.env) {
  const override = String(env.PRISM_GALAXY_BRIDGE_FALLBACK || "").split(",").map((s) => s.trim()).filter(Boolean);
  const tiers = override.length ? override : FALLBACK_TIERS;
  const idx = tiers.indexOf(requestedModel);
  if (idx === -1) return [requestedModel]; // unknown/custom model -> no fallback (don't guess a substitute)
  return tiers.slice(idx); // requested + all SMALLER tiers, in order
}

/**
 * Gather the BOUNDED per-galaxy doctrine corpus for retrieval: the galaxy's own
 * CLAUDE/SOUL/MEMORY/AWARENESS.md + its synthesis memory. Returns [{source, text}] for every
 * file that exists (fail-soft). Deterministic + small (<=5 files) -- NO full-vault scan.
 *
 * SOUL.md is the galaxy's domain-specialist identity (refuses, domain filters, the slot soul
 * body); the operator /goal names "souls.md of each galaxy" as a required AI-synergy surface,
 * so it is part of the corpus EVERY AI unit (RAG/CAG/dense/LoRA/GNN node-features) reads.
 */
export function gatherGalaxyDocs(galaxy, root = DEFAULT_ROOT, opts = {}) {
  const g = galaxy;
  const gDir = path.join(root, "mcp-server/src/engines", g);
  const candidates = [
    [`${g}/CLAUDE.md`, path.join(gDir, "CLAUDE.md")],
    [`${g}/SOUL.md`, path.join(gDir, "SOUL.md")],
    [`${g}/MEMORY.md`, path.join(gDir, "MEMORY.md")],
    [`${g}/AWARENESS.md`, path.join(gDir, "AWARENESS.md")],
    [`${g}_synthesis.md`, path.join(root, "knowledge/memories/patterns", `${g}_synthesis.md`)],
  ];
  const docs = [];
  for (const [label, p] of candidates) {
    const text = readOptional(p);
    if (text && text.trim()) docs.push({ source: label, text });
  }
  // A-06: append the MASTER-brain cross-galaxy compound-recall doc (back-pointer + fleet edge
  // set) so the bridge reasons fleet-aware. Opt-in (masterBrainEnabled); fully fail-soft -- any
  // failure or absent master simply omits it, the local corpus is never affected.
  const includeMaster = opts.includeMaster ?? masterBrainEnabled();
  if (includeMaster) {
    try {
      const brain = readGalaxyBrain(g, { prismRoot: root, masterMemoryPath: opts.masterMemoryPath || MASTER_MEMORY_DEFAULT });
      if (brain.master && brain.master.present && brain.master.backPointer) {
        const cross = brain.crossGalaxy.length
          ? `\nFleet cross-recall (${brain.crossGalaxy.length} galaxies): ${brain.crossGalaxy.join(", ")}`
          : "";
        docs.push({ source: `${g}/MASTER-BRAIN`, text: `## Master-brain (cross-galaxy compound recall)\n${brain.master.backPointer}${cross}` });
      }
    } catch {
      /* master-brain best-effort -- never breaks the local corpus */
    }
  }
  // Wiki synergy (opt-in; default OFF here so the GNN node-feature consumer that reads
  // gatherGalaxyDocs directly is unaffected -- the reasoning path turns it on). Resolves the
  // galaxy's own [[wiki-links]] to their wiki bodies; fully fail-soft (resolveGalaxyWikiDocs
  // never throws -> worst case adds nothing).
  const includeWiki = opts.includeWiki ?? false;
  if (includeWiki && docs.length) {
    const localText = docs.map((d) => d.text).join("\n");
    for (const w of resolveGalaxyWikiDocs(localText, root)) docs.push(w);
  }
  return docs;
}

/**
 * Assemble a galaxy's reasoning context from its real knowledge surfaces. Fail-soft:
 * any missing source is simply omitted.
 *
 * RAG hybrid: when opts.query is a non-empty string, retrieve the top-K most relevant
 * SECTIONS from the galaxy's bounded doctrine corpus (gatherGalaxyDocs) for THAT query
 * (deterministic sparse retrieval, scripts/lib/galaxy-context-retrieval.mjs) and return
 * them in `retrieved`. The fixed synthesis prefix is kept as a FALLBACK spine for when no
 * query is given or nothing scores above the relevance floor (so the contract never
 * regresses to "empty context"). identity + posture are always present.
 *
 * @returns {object} { galaxy, identity, synthesis, posture, retrieved, sources }
 */
export function assembleGalaxyContext(galaxy, opts = {}) {
  const root = opts.root || DEFAULT_ROOT;
  if (typeof galaxy !== "string" || !galaxy.trim()) {
    throw new Error("assembleGalaxyContext: galaxy (non-empty string) required");
  }
  const g = galaxy.trim();
  const gDir = path.join(root, "mcp-server/src/engines", g);
  const claude = readOptional(path.join(gDir, "CLAUDE.md"));
  const identity = firstIdentityLine(claude, `${g} galaxy`);

  let synthesis = readOptional(path.join(root, "knowledge/memories/patterns", `${g}_synthesis.md`));
  if (synthesis) {
    const fm = synthesis.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    if (fm) synthesis = synthesis.slice(fm[0].length);
    synthesis = synthesis.trim().slice(0, SYNTHESIS_MAX_CHARS);
  }

  // Live AI posture from the audit (so the galaxy reasons aware of its own synergy state).
  let posture = null;
  try {
    const audit = JSON.parse(readOptional(path.join(root, "state/shared/specs/AI-SYNERGY-AUDIT.json")) || "null");
    const hit = audit && Array.isArray(audit.galaxies) ? audit.galaxies.find((x) => x.galaxy === g) : null;
    if (hit) posture = { score: hit.score, band: hit.band, gaps: (hit.gaps || []).map((x) => x.dimension) };
  } catch {
    /* posture optional */
  }

  // RAG retrieval: per-question top-K sections over the bounded doctrine corpus.
  let retrieved = [];
  const query = typeof opts.query === "string" ? opts.query.trim() : "";
  if (query) {
    try {
      // Wiki synergy ON for reasoning by default (env opt-out PRISM_GALAXY_BRIDGE_WIKI=0);
      // the raw gatherGalaxyDocs default stays OFF so the GNN node-feature consumer is unchanged.
      const includeWiki = resolveWikiMode({ optsIncludeWiki: opts.includeWiki });
      const docs = gatherGalaxyDocs(g, root, { includeWiki });
      const chunks = docs.flatMap((d) => chunkMarkdown(d.text, d.source, { maxChars: RAG_CHUNK_MAX_CHARS }));
      retrieved = retrieveTopK(chunks, query, { k: RAG_TOP_K }).map((c) => ({
        source: c.source,
        heading: c.heading,
        text: c.text,
        score: c.score,
      }));
    } catch {
      retrieved = []; // retrieval is best-effort; never breaks the bridge
    }
  }

  const sources = [];
  if (claude) sources.push("CLAUDE.md");
  if (retrieved.length) sources.push(`retrieved:${retrieved.length}`);
  else if (synthesis) sources.push("synthesis-memory");
  if (posture) sources.push("ai-synergy-audit");
  return { galaxy: g, identity, synthesis: synthesis || null, posture, retrieved, sources };
}

/** Build the reasoning prompt for a galaxy + query. PURE. */
export function buildReasoningPrompt(context, query) {
  const c = context || {};
  const q = typeof query === "string" && query.trim() ? query.trim() : "Summarize this galaxy's purpose and current AI-synergy posture.";
  const lines = [];
  lines.push(`You are the AI reasoning bridge for the PRISM "${c.galaxy || "unknown"}" galaxy.`);
  lines.push(`Galaxy identity: ${c.identity || c.galaxy || "unknown"}`);
  if (c.posture) {
    lines.push(`AI-synergy posture: score ${c.posture.score} (${c.posture.band})${c.posture.gaps && c.posture.gaps.length ? ", gaps: " + c.posture.gaps.join(", ") : ""}.`);
  }
  // RAG hybrid: prefer the per-question retrieved sections; fall back to the fixed
  // synthesis prefix only when retrieval found nothing relevant (keeps the old contract).
  if (Array.isArray(c.retrieved) && c.retrieved.length) {
    lines.push("Most relevant galaxy context for THIS question (retrieved from the galaxy's doctrine brain):");
    for (const r of c.retrieved) {
      const head = r.heading ? ` # ${r.heading}` : "";
      lines.push(`--- [${r.source}${head}]`);
      lines.push(r.text);
    }
  } else if (c.synthesis) {
    lines.push("Known galaxy context (compounded synthesis):");
    lines.push(c.synthesis);
  }
  lines.push("");
  lines.push(`Question: ${q}`);
  lines.push("Answer concisely and ONLY from the galaxy context above. If the context is insufficient, say so explicitly rather than inventing.");
  return lines.join("\n");
}

// keep_alive holds the reasoning model resident after a call so a 34-galaxy validation sweep
// pays cold-load ONCE, not per-galaxy. Without it Ollama evicts at its ~5min default and every
// bridge call re-cold-loads the 32B model -> blows the timeout -> degrades to the caller's LLM
// (a token-economy leak: local per-galaxy reasoning silently bounces back to Claude). Clones the
// ask-ollama.mjs convention (OLLAMA_KEEP_ALIVE; operator sets 30m on the Blackwell host).
export function resolveKeepAlive(env = process.env) {
  return env.OLLAMA_KEEP_ALIVE || "30m";
}
/** PURE: the exact Ollama /api/generate request body (keep_alive holds the model warm). */
export function buildOllamaRequestBody(prompt, model, env = process.env) {
  return { model, prompt, stream: false, keep_alive: resolveKeepAlive(env) };
}

/** Call Ollama /api/generate. Throws on any failure (caller decides fallback). */
async function callOllama(prompt, model, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildOllamaRequestBody(prompt, model)),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`ollama ${res.status}`);
    const j = await res.json();
    return typeof j.response === "string" ? j.response.trim() : "";
  } finally {
    clearTimeout(t);
  }
}

/** Best-effort: list installed Ollama model names from /api/tags. null on any failure. */
async function fetchInstalledModels(timeoutMs = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.min(timeoutMs || 4000, 4000));
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    return Array.isArray(j.models) ? j.models.map((m) => m && m.name).filter(Boolean) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * resolveReasoningModel -- PURE selector for the Ollama reasoning model.
 *
 * DEFAULT (fast) mode keeps the coder DEFAULT_MODEL so per-galaxy fleet validation
 * stays fast (the author's deliberate choice -- see DEFAULT_MODEL comment). DEEP mode
 * (opts.deep===true or PRISM_GALAXY_BRIDGE_DEEP=1) routes to the strongest INSTALLED
 * local reasoning model from DEEP_REASONING_PREFERENCE -- the /goal-named "deep
 * reasoning across all galaxies". One selector => every galaxy gains the mode (R15).
 *
 * Install-gated: when `available` (the /api/tags model list) is provided, only an
 * INSTALLED preferred model is chosen; if none is installed it falls back to the fast
 * DEFAULT_MODEL rather than a tag that is not there. When `available` is null (tag list
 * unreachable -- Ollama down), it returns the TOP preference: a down Ollama would fail
 * the fast default identically, so attempting the deep model costs nothing. An explicit
 * opts.model always wins (caller override). Pure -> hermetically testable.
 *
 * @param {{env?:object, optsModel?:string, optsDeep?:boolean, available?:string[]|null}} a
 * @returns {string} the resolved model tag
 */
export function resolveReasoningModel({ env = process.env, optsModel, optsDeep, available } = {}) {
  if (optsModel) return optsModel; // explicit caller override wins outright
  const deep = optsDeep === true || (optsDeep === undefined && env.PRISM_GALAXY_BRIDGE_DEEP === "1");
  if (!deep) return DEFAULT_MODEL;
  const have = Array.isArray(available) ? available : null;
  for (const m of DEEP_REASONING_PREFERENCE) {
    if (!have || have.includes(m)) return m;
  }
  return DEFAULT_MODEL; // deep requested but no preferred reasoner installed -> fast fallback
}

/**
 * resolveDenseMode -- PURE gating predicate for the dense/hybrid rerank arm.
 *
 * ON by DEFAULT (operator directive 2026-06-10: "utilize ... cag+rag+hybrids across
 * all galaxies"). On-by-default is SAFE because the dense arm in reasonForGalaxy is
 * wrapped in a fail-soft catch that keeps the sparse retrieval on ANY embed failure --
 * the original "no embed service => no regression" guarantee is preserved, the hybrid
 * arm just actually RUNS now wherever embeddings are reachable (Blackwell: live).
 *
 * Opt-OUT: PRISM_GALAXY_RAG_DENSE=0 (env) or opts.dense===false (caller). Requires a
 * real query -- there is nothing to rerank when reasoning from the synthesis fallback.
 * Back-compat: callers that explicitly set PRISM_GALAXY_RAG_DENSE=1 keep working.
 *
 * @param {{env?:object, optsDense?:boolean, queryGiven?:boolean}} a
 * @returns {boolean}
 */
export function resolveDenseMode({ env = process.env, optsDense, queryGiven } = {}) {
  if (!queryGiven) return false; // synthesis-fallback path: nothing to rerank
  if (optsDense === false) return false; // explicit caller opt-out
  if (env.PRISM_GALAXY_RAG_DENSE === "0") return false; // explicit env opt-out
  return true; // default ON
}

/**
 * Reason for a galaxy over its own context via local Ollama. NEVER throws on an
 * Ollama failure -- degrades to { degraded:true, prompt } so the caller's LLM can
 * reason from the assembled context.
 * @returns {Promise<object>} { galaxy, ok, degraded, model, answer|prompt, sources }
 */
export async function reasonForGalaxy(galaxy, query, opts = {}) {
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const root = opts.root || DEFAULT_ROOT;
  // Deep-reasoning model routing (opt-in). Probe /api/tags ONLY when DEEP is requested
  // and there is no explicit model override -- the fast default path stays zero-extra-I/O.
  const deepRequested = opts.deep === true || (opts.deep === undefined && process.env.PRISM_GALAXY_BRIDGE_DEEP === "1");
  const available = deepRequested && !opts.model ? await fetchInstalledModels(timeoutMs) : null;
  const model = resolveReasoningModel({ optsModel: opts.model, optsDeep: opts.deep, available });
  let context;
  try {
    // Thread the query into assembly so the RAG retrieval runs for THIS question.
    context = assembleGalaxyContext(galaxy, { ...opts, query });
  } catch (e) {
    return { galaxy, ok: false, degraded: true, error: String(e && e.message), sources: [] };
  }

  // CAG hot path: a fresh cached answer (same galaxy+model+question AND unchanged doctrine
  // corpus) returns instantly with NO Ollama call. Fully fail-soft: any cache error -> fall
  // through to live reasoning. A doctrine edit changes the fingerprint -> cache miss -> re-reason.
  const queryGiven = typeof query === "string" && query.trim().length > 0;
  // DENSE hybrid arm: sparse retrieval -> embed top-M candidates -> RRF-fuse. ON by DEFAULT
  // (operator 2026-06-10 "utilize hybrids across all galaxies"); opt-OUT PRISM_GALAXY_RAG_DENSE=0
  // or opts.dense===false. Cached under a dense-aware key so sparse + hybrid answers for the
  // same question never collide in the CAG store. Fail-soft below keeps the no-regression guard.
  const denseOn = resolveDenseMode({ optsDense: opts.dense, queryGiven });
  // Wiki mode resolved ONCE here so the CAG fingerprint + the dense rerank below build over the
  // SAME corpus assembleGalaxyContext used for the prompt (P1 fix: dense was re-gathering without
  // wiki and overwriting context.retrieved -> wiki silently dropped on the live default path).
  const includeWiki = resolveWikiMode({ optsIncludeWiki: opts.includeWiki });
  const cagOn =
    opts.cache !== false &&
    process.env.PRISM_GALAXY_BRIDGE_CAG_DISABLE !== "1" &&
    queryGiven;
  // wiki in the key namespace so wiki-on/off answers never collide in the CAG store (same reason
  // dense is in the key); the fingerprint (below) covers wiki BODY edits.
  const cacheModel = `${model}${denseOn ? "+dense" : ""}${includeWiki ? "+wiki" : ""}`;
  const cagFile = opts.cagFile || CAG_FILE; // injectable for tests/ops
  const cagStatsFile = opts.cagStatsFile || cagStatsFileFor(cagFile); // CAG hit-rate telemetry sink beside cagFile (fail-soft; auto-hermetic in tests)
  // Build the reasoning corpus ONCE -> the CAG fingerprint AND the dense rerank below operate on
  // the IDENTICAL wiki-included corpus (single gather: no fingerprint/dense divergence possible,
  // one place includeWiki lives -- the 3-of-3 P1). Skipped when neither cache nor dense uses it.
  const reasoningDocs = cagOn || denseOn ? gatherGalaxyDocs(context.galaxy, root, { includeWiki }) : null;
  let fingerprint = null;
  let key = null;
  let cache = null;
  if (cagOn) {
    try {
      fingerprint = corpusFingerprint(reasoningDocs);
      key = cagKey(context.galaxy, cacheModel, query);
      cache = loadCache(cagFile);
      const hit = getCached(cache, key, fingerprint);
      if (hit) {
        recordCagStat(context.galaxy, true, cagStatsFile); // CAG hit -> fleet-wide hit-rate telemetry (fail-soft)
        // R12 transparency: report the model that ACTUALLY produced the cached answer (a fallback
        // ladder may have descended from the requested model), matching the live path (model:
        // usedModel below). Legacy entries lack usedModel -> fall back to the requested model.
        return { galaxy: context.galaxy, ok: true, degraded: false, cached: true, model: hit.usedModel || model, answer: hit.answer, sources: hit.sources || context.sources };
      }
      // Classify the miss (U-CAG-HITRATE-HONESTY, slot:alpha): a raw key PRESENT but returned
      // null by getCached means the doctrine-corpus fingerprint changed -> INVALIDATED (the only
      // RECOVERABLE miss). An absent key is NOVEL (cold first-touch OR a genuinely new question --
      // unavoidable). This lets cag-cache-stats compute a warm hit-rate that cold-start misses
      // (the bulk at ~1 lookup/galaxy) no longer drown.
      const rawEntry = cache && cache.entries ? cache.entries[key] : null;
      recordCagStat(context.galaxy, false, cagStatsFile, rawEntry ? "invalidated" : "novel"); // CAG miss -> compute fresh below (fail-soft telemetry; counted at lookup so the denominator is every cagOn lookup)
    } catch {
      // A cache-layer fault (fingerprint/key/load/lookup threw) is recorded as an ERROR miss so it
      // is counted distinctly -- never silently uncounted nor miscategorised as novel (makes the
      // `error` bucket real; U-CAG-HITRATE-HONESTY). recordCagStat is itself fail-soft (never throws).
      recordCagStat(context.galaxy, false, cagStatsFile, "error");
      fingerprint = key = cache = null; // cache best-effort; never blocks reasoning
    }
  }

  // DENSE rerank (best-effort): refine the sparse retrieved set with an embedding rerank,
  // RRF-fused with the sparse ranking. Fail-soft -> keeps the sparse context on any embed
  // failure (no embedding service => no regression).
  if (denseOn) {
    const hadSparseRetrieval = Array.isArray(context.retrieved) && context.retrieved.length > 0;
    let denseApplied = false;
    try {
      // SAME corpus as the prompt + fingerprint (reasoningDocs); non-null here since denseOn.
      const chunks = reasoningDocs.flatMap((d) => chunkMarkdown(d.text, d.source, { maxChars: RAG_CHUNK_MAX_CHARS }));
      const sparseFull = scoreChunks(chunks, query).filter((c) => c.score > 0);
      if (sparseFull.length) {
        const fused = await hybridRetrieve(chunks, query, { sparseRanked: sparseFull, topK: RAG_TOP_K });
        if (fused && fused.length) {
          context.retrieved = fused.map((c) => ({ source: c.source, heading: c.heading, text: c.text, score: c.score }));
          context.sources = context.sources.map((s) => (s.startsWith("retrieved:") ? `retrieved-hybrid:${fused.length}` : s));
          denseApplied = true;
        }
      }
    } catch {
      /* dense best-effort -> keep sparse retrieval */
    }
    // R12: when the hybrid arm was requested AND there was a sparse set to rerank but the
    // embed rerank could not apply (no embed service, embed error, empty fusion), say so
    // explicitly instead of silently masquerading as sparse-only. Lets the fleet MEASURE
    // real hybrid coverage per galaxy (retrieved-hybrid vs retrieved+dense-degraded).
    if (hadSparseRetrieval && !denseApplied && !context.sources.includes("dense-degraded")) {
      context.sources.push("dense-degraded");
    }
  }

  const prompt = buildReasoningPrompt(context, query);
  try {
    // Fallback ladder: try the requested model, then progressively smaller installed reasoners
    // (each non-installed/failed tier throws fast -> we descend) before degrading to the caller.
    let answer = null;
    let usedModel = model;
    let lastErr = null;
    for (const m of buildFallbackLadder(model)) {
      try { answer = await callOllama(prompt, m, timeoutMs); usedModel = m; break; }
      catch (e) { lastErr = e; }
    }
    if (answer === null) throw lastErr || new Error("ollama: all fallback models failed");
    if (cagOn && key && fingerprint) {
      try {
        // Persist usedModel so a later cache HIT can report the ACTUAL producer (R12 transparency),
        // not the requested model -- the fallback ladder above may have descended to a smaller model.
        const next = putCached(cache || loadCache(cagFile), key, { answer, sources: context.sources, corpusHash: fingerprint, ts: Date.now(), usedModel }, {});
        saveCache(cagFile, next);
      } catch {
        /* cache write best-effort */
      }
    }
    // LoRA synergy: emit this grounded (question, RAG context, answer) as an Alpaca training
    // pair so the bridge self-improves the per-galaxy LoRA dataset. Opt-in + best-effort.
    if (process.env.PRISM_GALAXY_BRIDGE_LORA_EMIT === "1" && answer && queryGiven) {
      try {
        const pair = buildLoraPair({ galaxy: context.galaxy, query, retrieved: context.retrieved, answer, model: usedModel, sources: context.sources });
        // Sanitize the slug to the sink filename so a galaxy name can never traverse out of
        // LORA_DIR (defense-in-depth; reviewer-C P2 -- internal callers only, but cheap to close).
        const safeG = String(context.galaxy).replace(/[^a-z0-9_-]/gi, "");
        if (pair && safeG) {
          appendLoraPair(path.join(LORA_DIR, `${safeG}.jsonl`), pair);
          // U-FLOR-BRIDGE-LORA-WIRE (2026-06-10): ALSO append to a single combined sink so
          // the fleet-training corpus inventory can register ONE bridge-reasoning source
          // (the assembler reads one jsonl per source, not a dir of per-galaxy files).
          // appendLoraPair is id-deduped, so a pair lands once in each sink. Keeps the
          // wired source fresh on EVERY sweep (no stale-snapshot concat step). Sibling of
          // LORA_DIR so a future dir-glob source never double-counts it.
          appendLoraPair(path.resolve(LORA_DIR, "..", "bridge-reasoning-combined.jsonl"), pair);
        }
      } catch {
        /* LoRA emit best-effort -- never affects the answer */
      }
    }
    return { galaxy: context.galaxy, ok: true, degraded: false, cached: false, model: usedModel, answer, sources: context.sources };
  } catch (e) {
    // Ollama down / timeout -> context-only fallback (still useful, never throws).
    return { galaxy: context.galaxy, ok: true, degraded: true, model, prompt, error: String(e && e.message), sources: context.sources };
  }
}

// CLI: node scripts/lib/galaxy-reasoning-bridge.mjs <galaxy> "<query>"
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , galaxy, ...rest] = process.argv;
  if (!galaxy) {
    process.stderr.write('usage: node scripts/lib/galaxy-reasoning-bridge.mjs <galaxy> "<query>" [--deep]\n');
    process.exit(1);
  }
  const deep = rest.includes("--deep");
  const query = rest.filter((a) => a !== "--deep").join(" ");
  reasonForGalaxy(galaxy, query, deep ? { deep: true } : {})
    .then((r) => process.stdout.write(JSON.stringify(r, null, 2) + "\n"))
    .catch((e) => {
      process.stderr.write(`bridge error: ${e && e.message}\n`);
      process.exit(1);
    });
}
