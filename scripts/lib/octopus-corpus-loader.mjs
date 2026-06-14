// scripts/lib/octopus-corpus-loader.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1 — the real corpus loader (substrate).
//
// The HERMES×OCTOPUS coordinator (scripts/octopus-with-hermes-rag.mjs) shipped
// with `psnCorpora: {}` — an EMPTY map — so the input curator
// (octopus-input-curator.mjs) had nothing to rerank and every voice saw the
// bare prompt. This lib fills that gap: for a given operator query it retrieves
// top-K text snippets from PRISM's 4-5 TEXT-retrievable PSN legs and hands the
// curator BOTH the corpora AND a rerank function in the exact shape it expects.
//
// PSN legs WITH a real text surface (the only valid corpus sources):
//   - wiki        H:/prism/knowledge/wiki                       (markdown leaves)
//   - memories    H:/prism/knowledge/memories  +  C: auto-memory (markdown)
//   - tribal      tribal-embed-index.json (reuse runTribalSearch)
//   - skills      H:/prism/.claude/commands                     (markdown)
//   - master_index system-graph.json (reuse runMasterIndexSearch)
// NN/GNN, PRISM-AI, PRISM-OS, Algorithms, Formulas have NO text surface and are
// deliberately excluded — retrieving from them would be a hallucinated leg.
//
// Contract bridged here (the two consumers in octopus-with-hermes-rag.mjs §2):
//   buildSharedContext(prompt, { rerank, psnCorpora })   — curator
//   collectExemplars({ prompt, rerank, corpora })        — curator
// where:
//   psnCorpora / corpora :: { tribal?:string[], wiki?:string[], memories?:string[],
//                             skills?:string[], master_index?:string[] }
//   rerank(query, candidates:string[], topK) -> [{ candidate:string, score:number }]
// (the curator reads r.candidate + r.score — see octopus-input-curator.mjs:69-71).
//
// Pure-ish: filesystem reads are bounded (deadline + max-files + max-bytes) and
// every leg is independently try/caught — one bad/missing leg dir is skipped,
// never aborts the fan-out (R12 fail-soft). The rerank scoring is NOT re-rolled:
// it reuses lexical-rerank.scoreCandidate (the proven RAG-UPGRADE-MS0 reranker),
// adapted into the curator's {candidate,score} shape. The graph/tribal legs reuse
// master-index-search-lib verbatim (no parallel BM25).
//
// Karpathy discipline:
//   CLASSIFY: bounded retrieval/aggregation over a filesystem + two prebuilt indexes
//   TECHNIQUE: filename pre-filter (no-read) -> bounded read -> lexical rerank -> byte-cap
//   EDGE CASES: empty/non-string query, missing leg dir, empty leg dir, oversized
//     query, NaN/garbage budget, deadline exceeded, file unreadable mid-scan
//   FAILURE MODES: every leg fail-soft (skip+continue); whole loader fail-soft to {}

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { scoreCandidate, tokenize as rerankTokenize } from "./lexical-rerank.mjs";
import { redactSecrets } from "./redact-secrets.mjs";

// ---- canonical PSN leg roots (TEXT legs only) ---------------------------
//
// DATA-LEAK GUARD: the snippets retrieved here flow into an EXTERNAL multi-model
// consensus (gemini/grok) AND get persisted to the shared-branch ledger. The
// memories leg therefore defaults to ONLY the curated repo vault. The user's
// PRIVATE global auto-memory root (C: auto-memory mirror) is gated behind an
// explicit opt-in env (PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY=1, default OFF) so
// private cross-session notes never leave the box by accident.
export const PRIVATE_MEMORY_ROOT = "C:/Users/wompu/.claude/projects/H--prism/memory";

export const DEFAULT_LEG_ROOTS = Object.freeze({
  wiki: ["H:/prism/knowledge/wiki"],
  // Curated repo vault ONLY by default — see PRIVATE_MEMORY_ROOT gating above.
  memories: ["H:/prism/knowledge/memories"],
  skills: ["H:/prism/.claude/commands"],
});

// Canonical leg set this loader actually consults — the SINGLE source of truth
// for "how many PSN legs does octopus retrieve from". The 3 filesystem legs
// above (DEFAULT_LEG_ROOTS keys) PLUS the 2 pre-indexed legs (tribal,
// master_index) loaded via loadIndexLegs(). Out of the 11-leg PSN taxonomy
// (see feedback_psn_definition), these 5 are the only TEXT-retrievable surfaces;
// NN/GNN, PRISM-AI, PRISM-OS, Algorithms, Formulas have no text corpus and are
// deliberately excluded. The coverage-gauge advisory in psn-leg-state-inject.mjs
// imports this to derive the substrate-config N/11 gauge WITHOUT hardcoding the
// leg names — bump this array if a new text leg is wired and the gauge tracks it.
export const LOADER_LEG_SET = Object.freeze([
  ...Object.keys(DEFAULT_LEG_ROOTS), // wiki, memories, skills
  "tribal",
  "master_index",
]);

// DOMAIN-AWARE corpus roots (P1 per-galaxy tuning, PSN-OCTOPUS-FLEET-SYNERGY-MS0).
// When loadPsnCorpora is called with `opts.domain`, these TEXT-searchable deep-corpus
// directories are appended as a `<domain>_corpus` fs leg so the octopus RAG pulls the
// domain's own content on top of the generic wiki/memories/skills.
//
// These are the *verified text-searchable* subset (Phase B enumeration workflow,
// 2026-05-31) — NOT the raw galaxyHints in
// mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json, which point at
// the binary-heavy source trees (resources/MasterCam, JM DIE/WIRE EDM → .mcx/.step/.pdf
// the loader can't text-scan). Here we point only at extracted/consolidated text dirs.
// Single-file consolidated corpora (e.g. jm-die-corpus-pages.jsonl) are intentionally
// omitted — loadFsLeg scans *directories*, so a file root is a silent no-op; surfacing
// those is a follow-up (a file-root leg). Roots are best-effort + fail-soft: a missing or
// binary-heavy dir simply yields fewer/no snippets (the binary-extension guard in
// loadFsLeg blocks non-text files from being read as utf8).
export const DOMAIN_CORPUS_ROOTS = Object.freeze({
  wedm: [
    "H:/prism/state/shared/pdf-extracts/jm-die-tribal-wiki", // 67 .txt PDF extracts (Mastercam wire tutorial, CNC fundamentals)
    "H:/prism/state/shared/wedm-training-corpus",            // 99 .json wire-EDM job analyses
  ],
  "speed-feed": [
    "H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS", // 3 .js Kienzle/Taylor/Johnson-Cook reference
    "H:/prism/mcp-server/src/data",                                   // *-speed-feed-data.ts + 51 vendor *-extracted.json
  ],
  cam: [
    // BEST-EFFORT / THIN: hyperMILL install tree — mostly binary; only ~200 allowlisted
    // .html/.txt/.py/.cs docs surface. cam's dedicated text corpus (cam-tribal-tips.jsonl)
    // is pending kilo emission — swap this root for it when it lands.
    "H:/PRISM/resources/OPEN MIND",
  ],
  cad: [
    "H:/prism/cad-engine/data",            // ~25 .json/.md CAD strategy/reference (small but pure text)
    "H:/prism/state/shared/cad-generated", // STEP-gen QA reports + metadata (.json/.md)
  ],
  "post-processor": [
    // ONLY the .cps post corpus — kept disjoint from speed-feed (which owns mcp-server/src/data).
    // The controller-dialect .ts in src/data is already reachable via the master_index/tribal
    // legs (indexed source), so it isn't duplicated here.
    "H:/prism/mcp-server/data/posts", // .cps post-language sources (Fusion + HSMWorks post cache)
  ],
  // U-FLEET-P5: galaxies that already cloned india's self-improving AI (MillAGI/LatheAGI/
  // QuotingClosedLoop ContinuousLearning engines) but were NOT octopus-linked — wiring them in
  // closes the "some galaxies updated, others not" gap. Their dedicated corpus is the galaxy
  // "brain" (CLAUDE/MEMORY/PATHS/TOOLBELT.md) — dense, domain-unique, NOT covered by the
  // fleet-wide wiki(knowledge/wiki)/memories(knowledge/memories) legs which never scan src/engines.
  mill: [
    "H:/prism/mcp-server/src/engines/mill", // galaxy brain (.md) — pairs with MillAGIContinuousLearningEngine
  ],
  lathe: [
    "H:/prism/mcp-server/src/engines/lathe", // galaxy brain (.md) — pairs with LatheAGIContinuousLearningEngine
  ],
  quoting: [
    "H:/prism/mcp-server/src/engines/quoting", // galaxy brain (.md, MEMORY ~85K)
    "H:/prism/state/shared/quoting",           // 41 entries: vendor-sources, JM cost/order data, training evidence
  ],
});

// BRAIN-DIR FALLBACK (U-FLEET-P5-ALL-GALAXIES): any galaxy with a brain dir under
// src/engines/<domain>/ (CLAUDE/MEMORY/PATHS/TOOLBELT.md) is octopus-RAG-able WITHOUT a
// hand-listed DOMAIN_CORPUS_ROOTS entry — so a single opts.domain auto-covers all 34 galaxies
// (and every future one) instead of 34 literal entries that rot. The curated entries above win;
// uncurated domains fall back here. SAFE_DOMAIN_RE blocks path traversal (no slashes/dots/`..`),
// so a domainKey can never escape GALAXY_ENGINES_BASE.
const GALAXY_ENGINES_BASE = "H:/prism/mcp-server/src/engines";
const SAFE_DOMAIN_RE = /^[a-z0-9][a-z0-9_-]*$/i;

// TEXT / prose / code / CNC-post extensions the fs-leg prefilter will collect. The 3
// default legs (wiki/memories/skills) are pure .md (so .md must be present), but the
// DOMAIN_CORPUS_ROOTS dirs are .txt/.json/.cps/.ts/.py/etc. — a positive allowlist is
// what lets the octopus actually read a domain's deep corpus while still skipping the
// binaries those CAD/CAM trees are full of (.mcx/.step/.pdf/.dll → a garbage utf8
// "snippet" that would otherwise cross the trust boundary to an external voice).
// Geometry-exchange ASCII formats (.step/.dxf/.stl) are deliberately EXCLUDED: they are
// text but carry no prose for semantic RAG, only coordinates.
const TEXT_LEG_EXTENSIONS = new Set([
  // prose / docs
  ".md", ".markdown", ".txt", ".rst", ".adoc",
  // structured data
  ".json", ".jsonl", ".csv", ".tsv", ".yaml", ".yml", ".toml", ".ini",
  // code (domain data ships as .ts/.js/.py)
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".java", ".cs", ".go", ".rs", ".rb",
  ".php", ".sh", ".ps1", ".bas", ".vb", ".cls", ".h", ".hpp", ".cpp", ".c", ".cmake", ".lua",
  // web / markup
  ".html", ".htm", ".xml", ".svg", ".css",
  // CNC posts + G-code (post-processor / CAM corpora)
  ".cps", ".nc", ".min", ".tap", ".ngc", ".eia", ".pgm", ".mpf", ".spf", ".sub",
  ".gcode", ".cnc", ".dnc", ".iso", ".pim", ".lsp",
]);

/** True when a filename's extension is a known TEXT/prose/code type the prefilter collects. */
function isTextLegPath(name) {
  const lower = String(name).toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return false; // extensionless — skip (avoids reading binaries with no ext)
  return TEXT_LEG_EXTENSIONS.has(lower.slice(dot));
}

/**
 * Content-level binary sniff — defense-in-depth BEHIND the extension allowlist. A file with a
 * TEXT extension (.json/.txt/.ts) can still hold real binary (latin1/UTF-16/random bytes); decoded
 * as utf8 it becomes mojibake (NUL / control chars / U+FFFD) that redactSecrets cannot mask and
 * would otherwise cross the trust boundary to an external voice. Rejects a decoded body that holds
 * a NUL or whose sampled head is >10% non-text. Whitespace controls (\t\n\v\f\r) are allowed.
 * @param {string} body — the already-utf8-decoded (bounded) file body
 * @returns {boolean} true → looks binary, skip it
 */
function looksBinaryBody(body) {
  if (typeof body !== "string" || body.length === 0) return false;
  if (body.indexOf(String.fromCharCode(0)) >= 0) return true; // NUL byte → definitely binary
  const n = Math.min(body.length, 4096);
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const c = body.charCodeAt(i);
    if (c === 0xfffd || (c < 32 && c !== 9 && c !== 10 && c !== 11 && c !== 12 && c !== 13)) bad++;
  }
  return bad / n > 0.1;
}

// Resolve the memory leg roots for a load, honoring the private-memory opt-in.
// Pure: env read injected via `env` so tests toggle it without process mutation.
export function resolveMemoryRoots(baseRoots, env = process.env) {
  const roots = Array.isArray(baseRoots) ? baseRoots.slice() : [];
  const includePrivate = String(env?.PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY || "") === "1";
  if (includePrivate && !roots.includes(PRIVATE_MEMORY_ROOT)) {
    roots.push(PRIVATE_MEMORY_ROOT);
  }
  return roots;
}

// ---- bounds (every one tunable; all have a hard floor/ceiling) ----------

export const DEFAULT_MAX_FILES_PER_LEG = 6;   // read at most this many files / leg
export const DEFAULT_MAX_BYTES_PER_FILE = 8192; // read at most this many bytes / file
export const DEFAULT_MAX_SCAN_ENTRIES = 4000; // filename-prefilter visits at most this many dir entries / leg
export const DEFAULT_MAX_DEPTH = 4;           // recursion depth cap for the filename prefilter
export const DEFAULT_DEADLINE_MS = 4000;      // total wall-clock budget for the whole load
export const DEFAULT_TOP_K = 3;               // candidates surfaced per leg
export const DEFAULT_SNIPPET_BYTES = 600;     // per-candidate snippet length
// Rerank floor for THIS path. The curator's own DEFAULT_RERANK_FLOOR (0.3) was
// tuned for the jaccard-over-clusters reranker in its tests; lexical-rerank
// scoring over short filesystem snippets/frontmatter lands lower (a strongly
// relevant hit like "kienzle-force-model" measured ~0.23). 0.05 keeps the
// relevant band (≳0.07) while dropping true-zero noise. Measured 2026-05-31.
export const RECOMMENDED_RERANK_FLOOR = 0.05;
// Total corpus bytes are derived from the per-voice modelBudget so the assembled
// voice prompt stays bounded; clamped to this floor/ceiling regardless.
export const MIN_TOTAL_CORPUS_BYTES = 2000;
export const MAX_TOTAL_CORPUS_BYTES = 24000;
export const DEFAULT_MODEL_BUDGET = 4000;

// Directories that flood any keyword and carry no useful prose — skip during
// the filename prefilter (caches, index sidecars, hidden dirs).
const SKIP_DIR_RE = /^(\.|node_modules$|_index$|\.hook-cache$)/;

// -- small helpers --------------------------------------------------------

function clampInt(raw, def, lo, hi) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  const f = Math.floor(n);
  if (f < lo) return lo;
  if (f > hi) return hi;
  return f;
}

function deriveTotalBudget(modelBudget) {
  const n = Number(modelBudget);
  const base = Number.isFinite(n) && n > 0 ? n : DEFAULT_MODEL_BUDGET;
  // Reserve roughly half the voice budget for substrate; the rest is the
  // prompt + the voice's own answer headroom.
  const target = Math.floor(base * 1.5);
  if (target < MIN_TOTAL_CORPUS_BYTES) return MIN_TOTAL_CORPUS_BYTES;
  if (target > MAX_TOTAL_CORPUS_BYTES) return MAX_TOTAL_CORPUS_BYTES;
  return target;
}

// Extract a query-relevant snippet from a file body: find the first line that
// contains a query token (case-insensitive), return a window around it; fall
// back to the file head. Always byte-bounded. Strips markdown noise lightly.
function extractSnippet(body, queryTokens, snippetBytes) {
  if (typeof body !== "string" || body.length === 0) return "";
  const lines = body.split(/\r?\n/);
  let bestIdx = -1;
  outer: for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    for (const qt of queryTokens) {
      if (lower.includes(qt)) { bestIdx = i; break outer; }
    }
  }
  let window;
  if (bestIdx >= 0) {
    window = lines.slice(bestIdx, bestIdx + 6).join(" ");
  } else {
    window = lines.slice(0, 6).join(" ");
  }
  const cleaned = window.replace(/\s+/g, " ").trim();
  return cleaned.slice(0, snippetBytes);
}

// Bounded recursive filename prefilter: walk a leg root collecting TEXT-leg paths
// (extension in TEXT_LEG_EXTENSIONS — .md for the default legs, plus .txt/.json/.cps/.ts/
// etc. for the domain corpus legs) whose FILENAME matches a query token first (cheap, no
// read), else any text file as a fallback pool. Binaries (.mcx/.step/.pdf/.dll) are never
// collected. Returns { matched, fallback } path arrays. Hard-capped by maxEntries + depth
// + deadline so a 13K-file tree can never hang the loader.
function prefilterFiles(root, queryTokens, { maxEntries, maxDepth, deadlineAt }) {
  const matched = [];
  const fallback = [];
  let visited = 0;
  const stack = [{ dir: root, depth: 0 }];
  while (stack.length > 0) {
    if (Date.now() >= deadlineAt) break;
    if (visited >= maxEntries) break;
    const { dir, depth } = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // unreadable subdir — skip, keep walking the rest
    }
    for (const ent of entries) {
      if (visited >= maxEntries) break;
      visited++;
      const name = ent.name;
      if (ent.isDirectory()) {
        if (depth + 1 > maxDepth) continue;
        if (SKIP_DIR_RE.test(name)) continue;
        stack.push({ dir: join(dir, name), depth: depth + 1 });
        continue;
      }
      if (!isTextLegPath(name)) continue;
      const full = join(dir, name);
      const nameLower = name.toLowerCase();
      let isMatch = false;
      for (const qt of queryTokens) {
        if (nameLower.includes(qt)) { isMatch = true; break; }
      }
      if (isMatch) matched.push(full);
      else if (fallback.length < maxEntries) fallback.push(full);
    }
  }
  return { matched, fallback };
}

// Read a leg's candidate snippets from the filesystem. Returns string[].
// Every read is try/caught; a mid-scan unreadable file is skipped.
function loadFsLeg(roots, queryTokens, cfg) {
  const out = [];
  for (const root of roots) {
    if (out.length >= cfg.maxFilesPerLeg) break;
    if (Date.now() >= cfg.deadlineAt) break;
    if (!existsSync(root)) continue; // missing leg dir — fail-soft skip
    let isDir = false;
    try { isDir = statSync(root).isDirectory(); } catch { continue; }
    if (!isDir) continue;

    const { matched, fallback } = prefilterFiles(root, queryTokens, {
      maxEntries: cfg.maxScanEntries,
      maxDepth: cfg.maxDepth,
      deadlineAt: cfg.deadlineAt,
    });
    // Prefer filename-matched files; backfill with the fallback pool. Cap the
    // total candidate-file count so reads stay bounded.
    const pool = matched.concat(fallback).slice(0, cfg.maxFilesPerLeg * 2);
    for (const file of pool) {
      if (out.length >= cfg.maxFilesPerLeg) break;
      if (Date.now() >= cfg.deadlineAt) break;
      let body;
      try {
        // Bounded read — never slurp a multi-MB file whole.
        const buf = readFileSync(file);
        body = buf.toString("utf8", 0, Math.min(buf.length, cfg.maxBytesPerFile));
      } catch {
        continue; // unreadable — skip this file, keep going
      }
      // Content sniff behind the extension allowlist: a text-extension file holding real
      // binary bytes decodes to mojibake — never snippet it (would cross the trust boundary).
      if (looksBinaryBody(body)) continue;
      const snippet = redactSecrets(extractSnippet(body, queryTokens, cfg.snippetBytes));
      if (snippet.length > 0) out.push(snippet);
    }
  }
  return out;
}

/**
 * Build a redacted tribal snippet from one runTribalSearch hit.
 * Hit shape (verified): { id, source, domain, title, path, score } — there is
 * NO body text on the ranked hit, so the snippet is built from the real fields:
 * title (primary) + domain + source. (The pre-fix code read h.text, which never
 * exists → the tribal leg was silently title-only.) Returns "" for an empty hit.
 */
export function buildTribalSnippet(h, snippetBytes = DEFAULT_SNIPPET_BYTES) {
  const title = typeof h?.title === "string" ? h.title : "";
  const domain = typeof h?.domain === "string" ? h.domain : "";
  const source = typeof h?.source === "string" ? h.source : "";
  const detail = [domain && `domain: ${domain}`, source && `source: ${source}`]
    .filter(Boolean)
    .join(", ");
  const snippet = redactSecrets(
    `${title}${title && detail ? " — " : ""}${detail}`.slice(0, snippetBytes),
  );
  return snippet.trim();
}

/**
 * Build a redacted master-index snippet from one runMasterIndexSearch hit.
 * Hit shape (verified): { id, score, layer, label, status, wiki, memory } —
 * there is NO h.info (the pre-fix code read it → the detail was always ""). The
 * detail is built from the real fields: status + the wiki/memory back-pointer
 * arrays. Returns "" when there is no label/id content.
 */
export function buildMasterIndexSnippet(h, snippetBytes = DEFAULT_SNIPPET_BYTES) {
  const label = typeof h?.label === "string" ? h.label : (typeof h?.id === "string" ? h.id : "");
  const layer = typeof h?.layer === "string" ? h.layer : "";
  const status = typeof h?.status === "string" ? h.status : "";
  const wiki = Array.isArray(h?.wiki) ? h.wiki.filter((x) => typeof x === "string") : [];
  const memory = Array.isArray(h?.memory) ? h.memory.filter((x) => typeof x === "string") : [];
  const detail = [
    status && `status: ${status}`,
    wiki.length && `wiki: ${wiki.join(",")}`,
    memory.length && `memory: ${memory.join(",")}`,
  ]
    .filter(Boolean)
    .join("; ");
  const snippet = redactSecrets(
    `[${layer}] ${label}${detail ? " — " + detail : ""}`.slice(0, snippetBytes),
  );
  return snippet.replace(/[\[\]\s]/g, "").length > 0 ? snippet : "";
}

// Reuse master-index-search-lib for the two pre-indexed legs (tribal + graph).
// Lazy-imported so a missing/oversized graph never breaks the loader.
async function loadIndexLegs(query, cfg) {
  const legs = { tribal: [], master_index: [] };
  let lib;
  try {
    lib = await import("./master-index-search-lib.mjs");
  } catch {
    return legs; // lib unavailable — both index legs fail-soft to empty
  }
  try {
    const { hits } = lib.runTribalSearch(query, { topK: cfg.topK });
    for (const h of hits || []) {
      const snippet = buildTribalSnippet(h, cfg.snippetBytes);
      if (snippet.length > 0) legs.tribal.push(snippet);
    }
  } catch { /* tribal leg fail-soft */ }
  try {
    const { hits } = lib.runMasterIndexSearch(query, { topK: cfg.topK });
    for (const h of hits || []) {
      const snippet = buildMasterIndexSnippet(h, cfg.snippetBytes);
      if (snippet.length > 0) legs.master_index.push(snippet);
    }
  } catch { /* graph leg fail-soft */ }
  return legs;
}

// Cap the total bytes across ALL legs so the curator's voice-prompt overhead is
// bounded by the per-voice modelBudget. Walks legs round-robin-ish (leg order)
// keeping whole candidates until the budget is spent; drops the rest.
export function truncateCorporaToBudget(corpora, totalBudget) {
  const out = {};
  let spent = 0;
  for (const [leg, cands] of Object.entries(corpora || {})) {
    if (!Array.isArray(cands)) continue;
    const kept = [];
    for (const c of cands) {
      const s = typeof c === "string" ? c : "";
      if (s.length === 0) continue;
      if (spent + s.length > totalBudget) {
        // Try to fit a truncated tail of this one candidate, then stop this leg.
        const room = totalBudget - spent;
        if (room >= 80) { kept.push(s.slice(0, room)); spent = totalBudget; }
        break;
      }
      kept.push(s);
      spent += s.length;
    }
    if (kept.length > 0) out[leg] = kept;
    if (spent >= totalBudget) break;
  }
  return out;
}

/**
 * Build a rerank function in the curator's contract:
 *   (query, candidates:string[], topK) -> [{ candidate:string, score:number }]
 * Reuses lexical-rerank.scoreCandidate (no new BM25). Pure + deterministic;
 * never throws — a garbage query or non-array candidates degrades gracefully.
 */
export function makeRerankAdapter() {
  return function rerankAdapter(query, candidates, topK) {
    if (!Array.isArray(candidates)) return [];
    const q = typeof query === "string" ? query : "";
    const queryTokens = rerankTokenize(q);
    const queryLower = q.toLowerCase().trim();
    const k = Number.isFinite(topK) && topK > 0 ? Math.floor(topK) : candidates.length;
    // When the query is untokenizable, fall back to stage-1 (input) order with a
    // neutral score so the curator's floor still filters predictably.
    const scored = candidates.map((c, i) => {
      const text = typeof c === "string" ? c : String(c ?? "");
      let score = 0;
      if (queryTokens.length > 0) {
        try { score = scoreCandidate(queryTokens, queryLower, { text }); }
        catch { score = 0; }
      }
      return { candidate: text, score, i };
    });
    scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));
    return scored.slice(0, k).map(({ candidate, score }) => ({ candidate, score }));
  };
}

/**
 * Load PSN corpora for one octopus run.
 *
 * @param {string} query - the operator prompt going to the 5 voices.
 * @param {object} [opts]
 * @param {number} [opts.modelBudget]    - per-voice char budget (derives total corpus cap)
 * @param {number} [opts.topK]           - candidates per leg
 * @param {number} [opts.deadlineMs]     - total wall-clock budget
 * @param {number} [opts.maxFilesPerLeg] - read cap per fs leg
 * @param {object} [opts.legRoots]       - override DEFAULT_LEG_ROOTS (tests)
 * @param {object} [opts.env]            - env source for the private-memory opt-in (tests)
 * @param {string} [opts.domain]         - galaxy key (e.g. "wedm", "post-processor"); when it
 *                                          names a DOMAIN_CORPUS_ROOTS entry, appends a
 *                                          `<domain>_corpus` fs leg of that domain's deep text corpus
 * @param {object} [opts.domainRoots]    - override DOMAIN_CORPUS_ROOTS for the domain leg (tests)
 * @param {string} [opts.galaxyEnginesBase] - override the src/engines base for the brain-dir fallback (tests)
 * @param {Function} [opts.loadIndexLegs]- DI seam: inject the index-leg loader (tests only)
 * @returns {Promise<{ psnCorpora:object, rerank:Function, meta:object }>}
 *   psnCorpora: { tribal?:string[], wiki?:string[], memories?:string[],
 *                 skills?:string[], master_index?:string[],
 *                 ['<domain>_corpus']?:string[] }  (budget-capped)
 *   rerank: the {candidate,score} adapter (pass straight to the curator)
 *   meta: { legCounts, totalBudget, deadlineMs, durationMs, errors }
 */
export async function loadPsnCorpora(query, opts = {}) {
  const rerankFloor = Number.isFinite(opts.rerankFloor) ? opts.rerankFloor : RECOMMENDED_RERANK_FLOOR;
  const meta = { legCounts: {}, totalBudget: 0, deadlineMs: 0, durationMs: 0, errors: [], rerankFloor };
  const rerank = makeRerankAdapter();
  const startedAt = Date.now();
  // Fail-soft on a bad query — empty corpora, but still hand back a working
  // rerank so the caller's contract is uniform.
  if (typeof query !== "string" || query.trim().length === 0) {
    meta.errors.push("empty-or-nonstring-query");
    return { psnCorpora: {}, rerank, meta };
  }

  const deadlineMs = clampInt(opts.deadlineMs, DEFAULT_DEADLINE_MS, 200, 30000);
  const cfg = {
    maxFilesPerLeg: clampInt(opts.maxFilesPerLeg, DEFAULT_MAX_FILES_PER_LEG, 1, 50),
    maxBytesPerFile: clampInt(opts.maxBytesPerFile, DEFAULT_MAX_BYTES_PER_FILE, 256, 65536),
    maxScanEntries: clampInt(opts.maxScanEntries, DEFAULT_MAX_SCAN_ENTRIES, 50, 50000),
    maxDepth: clampInt(opts.maxDepth, DEFAULT_MAX_DEPTH, 1, 12),
    snippetBytes: clampInt(opts.snippetBytes, DEFAULT_SNIPPET_BYTES, 80, 4000),
    topK: clampInt(opts.topK, DEFAULT_TOP_K, 1, 20),
    deadlineAt: startedAt + deadlineMs,
  };
  meta.deadlineMs = deadlineMs;
  const totalBudget = deriveTotalBudget(opts.modelBudget);
  meta.totalBudget = totalBudget;

  const legRoots = opts.legRoots && typeof opts.legRoots === "object"
    ? opts.legRoots
    : DEFAULT_LEG_ROOTS;
  // Cap query length fed to the prefilter (oversized-query adversarial case).
  const safeQuery = query.length > 4000 ? query.slice(0, 4000) : query;
  const queryTokens = rerankTokenize(safeQuery);

  const corpora = {};
  const env = opts.env && typeof opts.env === "object" ? opts.env : process.env;

  // --- filesystem legs (wiki, memories, skills) FIRST — cheap, bounded scans.
  // LEG-STARVATION FIX (smoke-test finding 2026-05-31, [[reference_octopus_loader_leg_starvation_bug_2026_05_31]]):
  // these MUST run before the index legs. The index stage's master-index-search-lib
  // graph load can take ~17s on a stale 543MB graph; when it ran first it blew the
  // whole deadline and EVERY fs leg was skipped with `deadline-before:<leg>` (observed
  // 1/5 legs: only master_index). Running the bounded fs scans first guarantees the
  // octopus sees wiki/memories/tribal coverage even when the graph is slow.
  // Second-order effect (intended): truncateCorporaToBudget keeps legs in insertion
  // order, so fs-first ALSO makes the cheap, reliable fs legs win the budget cap over
  // the slow index legs under budget pressure — a deliberate priority, locked by test.
  // DOMAIN-AWARE leg (P1 per-galaxy tuning): when opts.domain names a known galaxy,
  // append its text-searchable deep-corpus dirs as a `<domain>_corpus` leg AFTER the 3
  // core PSN legs — supplementary, so it never starves wiki/memories/skills under the
  // budget cap. Unknown/absent/non-string domain is a clean no-op. opts.legRoots (a test
  // override) still takes precedence for the core legs; the domain leg is additive.
  const fsLegNames = ["wiki", "memories", "skills"];
  const effectiveLegRoots = { ...legRoots };
  // opts.domainRoots is a test seam (hermetic fixtures); production uses DOMAIN_CORPUS_ROOTS.
  const domainRegistry = opts.domainRoots && typeof opts.domainRoots === "object"
    ? opts.domainRoots
    : DOMAIN_CORPUS_ROOTS;
  const domainKey = typeof opts.domain === "string" ? opts.domain.trim() : "";
  if (domainKey) {
    let domainRoots = null;
    if (Array.isArray(domainRegistry[domainKey])) {
      domainRoots = domainRegistry[domainKey]; // curated roots win
    } else if (!opts.domainRoots && SAFE_DOMAIN_RE.test(domainKey)) {
      // Fallback (suppressed when a test injects opts.domainRoots, to stay hermetic): any galaxy
      // with a brain dir under src/engines/<domain>/ is octopus-RAG-able. SAFE_DOMAIN_RE already
      // rejects slashes/dots, so join() can't traverse out. opts.galaxyEnginesBase is a test seam.
      const galaxyBase = typeof opts.galaxyEnginesBase === "string" ? opts.galaxyEnginesBase : GALAXY_ENGINES_BASE;
      const brainDir = join(galaxyBase, domainKey);
      try {
        if (existsSync(brainDir) && statSync(brainDir).isDirectory()) domainRoots = [brainDir];
      } catch { /* fail-soft — no domain leg */ }
    }
    if (Array.isArray(domainRoots) && domainRoots.length > 0) {
      const domainLeg = `${domainKey.replace(/[^a-z0-9]+/gi, "_")}_corpus`;
      effectiveLegRoots[domainLeg] = domainRoots;
      fsLegNames.push(domainLeg);
    }
  }
  for (const legName of fsLegNames) {
    if (Date.now() >= cfg.deadlineAt) { meta.errors.push(`deadline-before:${legName}`); break; }
    let roots = Array.isArray(effectiveLegRoots[legName]) ? effectiveLegRoots[legName] : [];
    // DATA-LEAK GUARD: the private C: auto-memory root is only scanned when
    // PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY=1 (default OFF). Curated vault always.
    if (legName === "memories") roots = resolveMemoryRoots(roots, env);
    if (roots.length === 0) continue;
    try {
      const cands = loadFsLeg(roots, queryTokens.length > 0 ? queryTokens : [safeQuery.toLowerCase()], cfg);
      if (cands.length > 0) corpora[legName] = cands;
    } catch (e) {
      meta.errors.push(`${legName}:${e?.message || "error"}`);
      // leg fail-soft — continue to next leg
    }
  }

  // --- index legs (tribal + master_index) — reuse master-index-search-lib ---
  // Run AFTER the fs legs so a slow graph can't starve them (see leg-starvation
  // fix above). Skipped when query has <2 tokens (those libs return [] anyway),
  // when the budget is already spent, or via PRISM_OCTOPUS_SKIP_INDEX_LEGS=1 — the
  // latency escape hatch for a known-slow graph (the proper latency fix is a fresh
  // build-graph-index.mjs sidecar; the master-index load itself is blocking and
  // cannot be interrupted mid-flight once started).
  // Test seam (DI for testability): an injected index-leg loader lets a unit test
  // exercise the starvation path deterministically — the real master-index-search-lib
  // graph load is too slow/non-deterministic to drive a regression lock. Production
  // always falls through to the real loadIndexLegs.
  const indexLegsImpl = typeof opts.loadIndexLegs === "function" ? opts.loadIndexLegs : loadIndexLegs;
  const skipIndexLegs = String(env.PRISM_OCTOPUS_SKIP_INDEX_LEGS || "") === "1";
  if (skipIndexLegs) {
    meta.errors.push("index-legs:skipped-by-env");
  } else if (queryTokens.length >= 2 && Date.now() < cfg.deadlineAt) {
    try {
      const idx = await indexLegsImpl(safeQuery, cfg);
      if (Array.isArray(idx.tribal) && idx.tribal.length > 0) corpora.tribal = idx.tribal;
      if (Array.isArray(idx.master_index) && idx.master_index.length > 0) corpora.master_index = idx.master_index;
    } catch (e) {
      meta.errors.push(`index-legs:${e?.message || "error"}`);
    }
  } else if (Date.now() >= cfg.deadlineAt) {
    meta.errors.push("index-legs:deadline-spent");
  }

  // --- rerank-trim each leg to topK BEFORE budget capping, so the budget is
  // spent on the most relevant candidates (not raw fs order). The curator
  // reranks again, but pre-trimming keeps the budget honest. ---
  for (const [leg, cands] of Object.entries(corpora)) {
    try {
      const ranked = rerank(safeQuery, cands, cfg.topK).map((r) => r.candidate);
      corpora[leg] = ranked.length > 0 ? ranked : cands.slice(0, cfg.topK);
    } catch {
      corpora[leg] = cands.slice(0, cfg.topK);
    }
  }

  const capped = truncateCorporaToBudget(corpora, totalBudget);
  for (const [leg, cands] of Object.entries(capped)) meta.legCounts[leg] = cands.length;
  meta.durationMs = Date.now() - startedAt;

  return { psnCorpora: capped, rerank, meta };
}
