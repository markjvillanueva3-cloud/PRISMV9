// scripts/lib/dispatcher-hints.mjs
// SUBSTRATE-UTIL Gap 4 (2026-06-29, slot:sierra) -- cycle-free LEAF that grounds the LIVE
// Ollama mcp_route lane in the real 123-dispatcher manifest so the routing model picks an
// EXISTING dispatcher:action instead of hallucinating one.
//
// SURFACE CORRECTION (verified by code-read, R12): the audit spec's Gap 4 pointed at the
// .ts OllamaHookBridgeEngine, but the LIVE mcp_route hook lane runs through
// .claude/hooks/lib/ollama-hook-bridge.mjs::queryOllama (the .mjs bridge; mcp-route-suggest.mjs
// imports queryOllama from it), whose HOOK_PROMPTS.mcp_route is generic/zero-manifest -- the
// routing model is asked to name "the best PRISM dispatcher and action" with NO list of the
// 123 that exist -> it invents dispatcher/action names. Enriching the .ts engine would have
// been an orphan (no live hook consumer; ai_feature has none at all). This leaf is the fix on
// the real surface.
//
// Mirrors scripts/lib/vault-hints.mjs (Gap 6) -- same tokenize -> score -> top-N -> format
// shape, and REUSES its tokenizeQuery so the two substrate-grounding leaves tokenize
// identically (DRY; vault-hints is a zero-repo-import leaf so importing it stays cycle-free).
//
// Pure + fail-soft throughout (R12): a missing/unreadable/empty digest yields [] / "" so the
// caller injects nothing -- grounding never breaks the sub-500ms hook path.

import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tokenizeQuery } from "./vault-hints.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", ".."); // scripts/lib -> repo root
const DIGEST_REL = join("mcp-server", "data", "docs", "DISPATCHER_DIGEST.md");
const DEFAULT_TOP_N = 6;
const MIN_ACTIONS = 1; // skip 0-action rows (the *.test / *.synergy.test stub dispatchers)

// Stopwords (>=3 chars, so they survive tokenizeQuery's length filter) that pollute
// dispatcher matching: structural words in the mcp-route-suggest prompt TEMPLATE ("Task: User
// is running ... best MCP action to use instead") plus words that recur across most digest
// domain cells ("prism_*", "... N actions", "... Dispatcher"). Without this, generic tokens
// match many verbose domain descriptions and bury the real signal tokens -- live-validated:
// "cutting force speed feed" surfaced guard/telemetry/security/knowledge instead of calc
// because "action"/"prism"/"mcp" matched everywhere. Filtering them yields a relevant manifest
// or (when no signal token matches a terse domain) an EMPTY one -> safe base prompt, never a
// misleading route. Domain-meaningful words (security/knowledge/toolpath/cam/quote/...) are
// deliberately NOT here.
const STOPWORDS = new Set([
  "action", "actions", "dispatcher", "dispatchers", "prism", "mcp",
  "the", "and", "for", "with", "via", "across", "all", "any", "are", "this", "that", "your",
  "best", "use", "using", "used", "instead", "task", "user", "running", "run", "runs",
  "codebase", "given", "respond", "what", "which", "how", "should", "would", "into", "from",
  "suggest", "suggestion", "route", "routing", "tool", "tools", "call", "calling",
]);

/** Drop generic/boilerplate tokens that match too many digest rows to be a useful signal. */
export function filterStopwords(tokens) {
  if (!Array.isArray(tokens)) return [];
  return tokens.filter((t) => typeof t === "string" && !STOPWORDS.has(t));
}

// Never offer a non-routable dispatcher as a route. unwiredBridgeDispatcher ("Bridge
// dispatcher for cross-cutting unwired engines") and any deprecated dispatcher are NOT
// user-facing routes -- surfacing them under the "choose the route ONLY from these" label
// actively misroutes (live-caught: a "cutting" query whole-word-matched "cross-cutting" and
// ranked the unwired bridge #2). 0-action stubs (.test/.synergy.test/Middleware) are already
// dropped by MIN_ACTIONS in parseDispatcherRows.
//
// REGRESSION FIX (2026-06-29, slot:sierra, audit w0yjhqcp9): this was `/\b(unwired|deprecated)\b/i`
// and silently STOPPED excluding the bridge after a DISPATCHER_DIGEST regen. The digest renders it
// as camelCase name "unwiredBridgeDispatcher" + snake_case domain "prism_unwired_bridge" + a
// width-TRUNCATED "...cross-cutting unwire..." cell -- a `\b`-anchored "unwired" matches NONE of
// them (B and `_` are word chars so there is no boundary; truncation drops the trailing 'd'). The
// intact NAME always contains the literal substring "unwired", so a bare (boundary-less) substring
// match is the robust exclusion. Caught by the live-digest test (getDispatcherHints vs the REAL
// digest) -- the exact value of testing against the real corpus, not a fixture.
const EXCLUDE_RE = /unwired|deprecated/i;

// Per-process cache: the digest is ~10KB and stable within a single (short-lived) hook
// process. Only cached for the REAL read -- an injected readImpl (tests) bypasses the cache
// so a fixture can never leak into the next test or into production.
let _digestCache = null; // { root, rows }

/**
 * Parse the DISPATCHER_DIGEST.md markdown table into typed rows. The table shape is:
 *   | Dispatcher | Domain | Actions |
 *   |-----------|--------|---------|
 *   | businessDispatcher | prism_business -- Business Operations Dispatcher | 909 |
 * Skips the header row, the |---| separator, and any 0-action stub dispatcher. Tolerant of
 * malformed rows (missing cells / non-numeric actions are dropped, never thrown).
 * @param {string} digestText
 * @returns {Array<{dispatcher:string, domain:string, actions:number}>}
 */
export function parseDispatcherRows(digestText) {
  if (typeof digestText !== "string" || digestText.length === 0) return [];
  const rows = [];
  for (const raw of digestText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    // "| a | b | c |" -> ["", "a", "b", "c", ""]; a 3-column row needs >= 5 cells.
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 5) continue;
    const dispatcher = cells[1];
    const domain = cells[2];
    const actions = parseInt(cells[3], 10);
    if (!dispatcher) continue;
    if (dispatcher.toLowerCase() === "dispatcher") continue; // header row
    if (/^[-:]+$/.test(dispatcher)) continue; // |---| separator row
    if (!Number.isFinite(actions) || actions < MIN_ACTIONS) continue;
    rows.push({ dispatcher, domain, actions });
  }
  return rows;
}

/**
 * Load + parse the dispatcher rows, cached per-process for the real read.
 * @returns {Array<{dispatcher:string, domain:string, actions:number}>}
 */
export function loadDispatcherRows({ root = REPO_ROOT, readImpl } = {}) {
  if (!readImpl && _digestCache && _digestCache.root === root) return _digestCache.rows;
  const read = readImpl || ((p) => readFileSync(p, "utf8"));
  let text = "";
  try { text = String(read(join(root, DIGEST_REL))); }
  catch {
    if (!readImpl) _digestCache = { root, rows: [] };
    return [];
  }
  const rows = parseDispatcherRows(text);
  if (!readImpl) _digestCache = { root, rows };
  return rows;
}

/**
 * Score dispatcher rows by how many query tokens appear in the (lowercased) dispatcher name
 * + domain text. Tie-break: higher score first, then more actions (a richer dispatcher is the
 * safer route target). Returns matches sorted strongest-first.
 * @returns {Array<{dispatcher:string, domain:string, actions:number, score:number}>}
 */
export function scoreDispatchers(rows, tokens) {
  if (!Array.isArray(rows) || !Array.isArray(tokens) || tokens.length === 0) return [];
  const out = [];
  for (const r of rows) {
    if (!r || typeof r.dispatcher !== "string") continue;
    // Drop non-routable dispatchers (unwired bridge / deprecated) so they can never be offered
    // as a route under the "choose ONLY from these" label.
    if (EXCLUDE_RE.test(r.dispatcher) || EXCLUDE_RE.test(String(r.domain || ""))) continue;
    // Name is a compound identifier (calcDispatcher, camFunctionDispatcher) -> substring match
    // catches the embedded stem ("cam" in "camdispatcher"). Domain is prose -> WHOLE-WORD match
    // only, so "force" does NOT match "enForcement" and "feed" does NOT match "feedback" (a real
    // misroute the live validation caught with raw substring matching).
    const name = r.dispatcher.toLowerCase();
    const domainWords = new Set(String(r.domain || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    let score = 0;
    for (const t of tokens) if (t && (name.includes(t) || domainWords.has(t))) score += 1;
    if (score > 0) out.push({ ...r, score });
  }
  out.sort((a, b) => (b.score - a.score) || (b.actions - a.actions));
  return out;
}

/**
 * getDispatcherHints: top-N dispatcher rows whose name/domain tokens overlap the query.
 * Pure + fail-soft: [] on empty/short query, topN<=0, or a missing/unreadable digest.
 * @returns {Array<{dispatcher:string, domain:string, actions:number, score:number}>}
 */
export function getDispatcherHints(query, { root = REPO_ROOT, topN = DEFAULT_TOP_N, readImpl } = {}) {
  const tokens = filterStopwords(tokenizeQuery(query));
  if (tokens.length === 0) return [];
  const n = Number.isFinite(topN) ? Math.max(0, Math.floor(topN)) : DEFAULT_TOP_N;
  if (n === 0) return [];
  const rows = loadDispatcherRows({ root, readImpl });
  return scoreDispatchers(rows, tokens).slice(0, n);
}

/**
 * Render getDispatcherHints() output as a compact manifest block to PREPEND to the mcp_route
 * system prompt, or "" when there are no hints (so a no-match injects nothing). The label
 * instructs the model to choose ONLY from the listed dispatchers (anti-hallucination).
 * @returns {string}
 */
export function formatDispatcherManifestBlock(hints, {
  label = "Relevant PRISM dispatchers (choose the route ONLY from these; do NOT invent dispatcher or action names)",
} = {}) {
  if (!Array.isArray(hints) || hints.length === 0) return "";
  const lines = hints.map((h) => {
    const dom = h && h.domain ? `: ${h.domain}` : "";
    const acts = h && Number.isFinite(h.actions) ? ` (${h.actions} actions)` : "";
    return `- ${h.dispatcher}${dom}${acts}`;
  });
  return `${label}:\n${lines.join("\n")}\n\n`;
}

// Test-only hook: clear the per-process digest cache between cases.
export function _resetDispatcherCache() { _digestCache = null; }
