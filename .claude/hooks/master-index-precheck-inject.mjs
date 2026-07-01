#!/usr/bin/env node
// tier: T2
/**
 * master-index-precheck-inject.mjs — UserPromptSubmit injector
 *
 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
 * BEFORE the model decides which search tool to fire. Reads system-graph.json
 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
 * each node. Sister hook to wiki-precheck-inject.mjs (which only covers
 * wiki/index.md) — this one covers the full graph + obsidian augmentation.
 *
 * Disable with: PRISM_MASTER_INDEX_INJECT=0
 * Tune K with:  PRISM_MASTER_INDEX_K=<n>  (default 5)
 * Throttle:     PRISM_MASTER_INDEX_THROTTLE_MS=<ms> (default 60000; 0=off) --
 *               same-prompt re-inject suppression so a /loop re-firing the
 *               identical prompt does not re-inject the identical block each tick.
 *
 * Backed by mcp-server/src/engines/MasterIndexEngine.ts at runtime; this
 * hook is the always-on injection layer (the engine is also reachable via
 * `prism_session:master_index_query`). Per-event, capped at GRAPH-NUDGE
 * keywords to avoid spamming every prompt.
 *
 * Implementation: delegates to `scripts/lib/master-index-search-lib.mjs`
 * (also consumed by `scripts/agents/spawned-agent-context-lib.mjs` so
 * spawned subagents get the same search). Refactored 2026-05-15 from
 * inlined BM25; behavior preserved (same weights, same stopwords, same
 * layer exclusions, same dedup).
 *
 * Sync-to-system-viz: the lib reads `state/shared/system-viz/system-graph.json`
 * via mtime cache — any peer chat that regenerates the graph (e.g.,
 * SYSTEM-VIZ-FS-COVERAGE-MS0 expanding L12 filesystem leaves) invalidates
 * the cache automatically. No manual refresh required.
 */

import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { masterIndexSearch } from "../../scripts/lib/master-index-search-lib.mjs";
import { edgeOrder } from "../../scripts/lib/edge-order.mjs";
import { rerank as lexicalRerank } from "../../scripts/lib/lexical-rerank.mjs";
// U-SCP01 (papa): stamp source-chain provenance onto each surfaced hit so it
// self-describes its resolvable node-id — "[src: <type>:<id>]" — letting the
// model node-card/Read it directly and giving the PSN-attribution ledger a
// uniform tag to parse. Additive + fail-soft; PRISM_SOURCE_CHAIN_DISABLE=1 →
// byte-identical legacy output.
import { decorateHits, renderHitProvenance } from "../../scripts/lib/source-chain-lib.mjs";
// U-PSN-ATTR01 (papa, lever #2): tap the decorated hits' provenance into the
// PSN-attribution ledger — records which of the 11 PSN legs this retrieval
// consulted (per-session N/11 coverage). Compounds on the source-chain tags
// above. Fail-soft by contract (recordLegConsult never throws);
// PRISM_PSN_ATTRIBUTION_DISABLE=1 → no-op.
import { recordLegConsult } from "../../scripts/lib/psn-attribution-lib.mjs";
// U-SV-NODE-PATH-TEMPLATE (sierra): resolve an exact-match node's label → real
// source path so the banner can emit `Read: <path>` (direct Read beats Grep/Glob),
// and credit the saved search to the nav-savings ledger. Both fail-soft.
import { resolveCodePath } from "../../scripts/lib/code-path-resolver.mjs";
import { recordNavHit } from "../../scripts/lib/nav-savings-ledger.mjs";
// 2026-05-26 (U-D2-SYSTEMVIZ-COUNTER-WIRE, slot:alpha): S6 shared counter for
// FEATURE-UTILIZATION dashboard. SystemViz feature was 0-fire pre-wire.
import { incrementFeature } from "../helpers/feature-counter.mjs";
// 2026-05-27 (U-CAG-INJECTORS-CONSUME, slot:sierra): short-circuit on COLD-tier
// CAG-route decisions to realize the ~12k-tokens/cold-hit saving the producer hook
// promises. Fail-OPEN — every defect of the sidecar path falls through to full search.
import { shouldSkip, skipAdvisory } from "../helpers/cag-consume.mjs";
// U-MASTER-INDEX-THROTTLE (2026-06-10 slot:bravo): per-session same-prompt
// throttle so a /loop (which re-submits the IDENTICAL prompt every tick) does
// not re-inject an identical top-K block each tick. Same proven lib + pattern
// as memory-index-precheck-inject. Fail-open (no session id / I/O error =>
// inject). Knob PRISM_MASTER_INDEX_THROTTLE_MS (default 60000; 0 = off).
import { shouldThrottleInject } from "../../scripts/lib/inject-throttle.mjs";
import { stripLoneSurrogates } from "../../scripts/lib/safe-truncate.mjs";

// --------------------------------------------------------------------------
// Config (env knobs first, then constants)
// --------------------------------------------------------------------------

const ENABLED = process.env.PRISM_MASTER_INDEX_INJECT !== "0";
const TOP_K = clampInt(process.env.PRISM_MASTER_INDEX_K, 5, 1, 20);
// RAG-UPGRADE-MS0/U-RAG-2: widen stage-1 master-index recall, then narrow via
// the lexical reranker to TOP_K. STAGE1_K = TOP_K × 5 clamped to [TOP_K, 30]
// — keeps a wide-enough pool for the reranker's coverage/phrase signals to
// matter, capped to bound stage-1 cost.
const STAGE1_K = Math.min(30, Math.max(TOP_K, TOP_K * 5));
const DSL_EMIT = process.env.PRISM_MASTER_INDEX_DSL_EMIT !== "0";
// Same-prompt re-inject throttle window (ms). 60s default mirrors
// memory-index-precheck-inject; 0 disables (legacy always-inject). clampInt is
// a hoisted function declaration so use at module load is safe.
const THROTTLE_MS = clampInt(process.env.PRISM_MASTER_INDEX_THROTTLE_MS, 60000, 0, 3600000);

// CODE_SYSTEM_INDEX.json reverse-lookup (SYSTEM-VIZ-DSL-MS0).
// 12,772 codes including AC/SK/ML/FM/GH from supplementary extraction.
// mtime-cached — peer regen of the index invalidates automatically.
const __dirname = dirname(fileURLToPath(import.meta.url));
const DSL_INDEX_PATH = join(__dirname, "..", "..", "mcp-server", "data", "docs", "CODE_SYSTEM_INDEX.json");
let _dslCache = { mtimeMs: 0, reverse: null };
function loadDslReverse() {
  try {
    const st = statSync(DSL_INDEX_PATH);
    if (st.mtimeMs === _dslCache.mtimeMs && _dslCache.reverse) return _dslCache.reverse;
    const j = JSON.parse(readFileSync(DSL_INDEX_PATH, "utf8"));
    _dslCache = { mtimeMs: st.mtimeMs, reverse: j.reverse || {} };
    return _dslCache.reverse;
  } catch { return null; }
}
function dslLookup(name) {
  if (!DSL_EMIT || typeof name !== "string" || name.length === 0) return null;
  const rev = loadDslReverse();
  if (!rev) return null;
  return rev[name] || rev[name.toLowerCase()] || null;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function readStdinSync() {
  try { return readFileSync(0, "utf8"); }
  catch { return ""; }
}

function emit(systemReminder) {
  // additionalContext stdout is consumed by the UserPromptSubmit hook
  // protocol — the harness merges it into the next model turn's context.
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: stripLoneSurrogates(systemReminder),
    },
  }));
}

/**
 * U-RAG-2 stage-2 lexical rerank over the wider stage-1 master-index recall.
 * Mirrors the proven pattern from `tribal-by-domain-inject.mjs` (commit
 * 6df057e098). The synthesized `text` field aggregates label + cross-ref
 * wiki + memory mentions so the reranker's coverage/phrase signals score
 * against what the rendered block will actually show. Returns the narrowed
 * list in the original hit shape (drops the synthesized scoring inputs so
 * the renderer doesn't receive a polluted shape).
 */
export function applyLexicalRerank(prompt, items, topK) {
  if (!Array.isArray(items)) return [];
  if (items.length <= 1) return items.slice(0, topK);
  const cands = items.map((x) => ({
    ...x,
    text: `${x.label || ""} ${(x.wiki || []).join(" ")} ${(x.memory || []).join(" ")}`.trim(),
    // label is also a scoring input — the reranker treats label-hits as a
    // stronger signal than body-hits (labelHit weight 0.15).
    label: x.label || "",
  }));
  const out = lexicalRerank(prompt, cands, { topK });
  // Strip the synthesized `text` field (was only a scoring input — the
  // renderer doesn't use it). The original hit fields came in via the spread
  // and survive.
  return out.slice(0, topK).map((c) => {
    const { text: _t, ...rest } = c;
    return rest;
  });
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  if (!ENABLED) { process.exit(0); }

  let payload;
  try { payload = JSON.parse(readStdinSync() || "{}"); }
  catch { process.exit(0); }

  const prompt = String(payload.prompt ?? "");
  if (!prompt || prompt.length < 6) { process.exit(0); }

  // U-CAG-INJECTORS-CONSUME (2026-05-27, sierra): COLD-tier prompts are already
  // answered by the cached static-doctrine block; running the full BM25 + lexical
  // rerank + render here would just duplicate that signal. Fail-OPEN — any
  // sidecar defect falls through to the regular search path below.
  const sid = String(payload.session_id ?? payload.sessionId ?? "");
  // U-MASTER-INDEX-THROTTLE: identical prompt+session within the TTL => skip the
  // re-inject (a /loop re-submits the same prompt every tick). Placed BEFORE the
  // CAG + search work so a suppressed tick does ZERO downstream work and emits
  // nothing. Fail-open (no session id / I/O error => proceeds to inject).
  if (shouldThrottleInject({ sessionId: sid, prompt, nowMs: Date.now(), ttlMs: THROTTLE_MS })) {
    process.exit(0);
  }
  const cag = shouldSkip("masterIndexInject", { sessionId: sid });
  if (cag.skip) {
    emit(skipAdvisory("Master-index precheck", cag));
    process.exit(0);
  }

  // Daemon-FIRST (full 110K-node coverage) via the ASYNC HTTP variant: the in-process
  // fallback parses a degraded ~59MB subset (the full sidecar fails this fresh process's
  // heap ceiling), so masterIndexSearch tries the warm :3101 daemon over http.request
  // (NO subprocess spawn -- the per-turn caveat on the curl-based *Sync variant does NOT
  // apply) and fail-soft falls back to the same in-process search on ANY miss (daemon
  // down/disabled/timeout) => zero regression when the daemon is absent.
  //
  // daemonTimeoutMs: the lib default WAS 250ms -- the warm daemon answers a full-graph
  // search in ~255ms (LIVE-measured), right AT that 250ms boundary, so 2-of-3 calls timed
  // out and fell to the slow (~2.4s) degraded in-process path, making the daemon win a
  // coin-flip. The lib default was raised 250->400 fleet-wide on this exact finding
  // (U-SIERRA-OLLAMA-GROUNDING-HYGIENE, 2026-06-29); this explicit 400 now MATCHES it
  // (belt-and-suspenders). 400ms reliably catches the warm daemon (~145ms jitter margin) while
  // bounding the wedged-daemon-then-fallback worst case (~400ms + ~2.4s in-process) under
  // the 3000ms harness kill. Env-tunable for ops (raise if the daemon runs hotter under
  // fleet load; never raise so high that timeout + in-process exceeds the harness budget).
  const DAEMON_TIMEOUT_MS = Number(process.env.PRISM_MASTER_INDEX_DAEMON_TIMEOUT_MS) || 400;
  const { tokens, hits: stage1 } = await masterIndexSearch(prompt, { topK: STAGE1_K, daemonTimeoutMs: DAEMON_TIMEOUT_MS });
  if (stage1.length === 0) { process.exit(0); }
  // U-D2: feature engaged — master-index returned hits.
  try { incrementFeature("SystemViz", { slot: payload?.slot ?? null }); } catch { /* never blocks */ }
  // U-RAG-2 stage-2: rerank the wider stage-1 recall by the lexical scorer's
  // coverage/phrase/labelHit signals (not just BM25-lite stage-1 score), then
  // narrow to TOP_K. Two-stage retrieval per the spec.
  const hits = decorateHits(applyLexicalRerank(prompt, stage1, TOP_K), "graph", { surface: "master-index-precheck" });
  if (hits.length === 0) { process.exit(0); }
  // U-PSN-ATTR01: record which PSN legs this retrieval consulted (fail-soft —
  // never throws into the prompt path; skips silently when disabled/empty).
  recordLegConsult({
    sessionId: String(payload.session_id ?? payload.sessionId ?? ""),
    surface: "master-index-precheck",
    citations: hits.map((h) => h && h.sourceChain).filter(Boolean),
  });

  // HIGH-ROI-TS2 iter2 (2026-05-22): exact-match collapse. When a single hit
  // exactly matches a query token AND has built/wired status, the user's
  // prompt is most likely already answered by that single node. Collapse the
  // multi-line block into a one-line "EXACT MATCH" banner — saves ~80% of the
  // block bytes (~400B → ~80B) every prompt where the match is unambiguous.
  // Multi-hit / ambiguous / ghost-status falls through to the edge-ordered
  // multi-line render unchanged.
  const exactMatch = hits.length >= 1 && (() => {
    const h = hits[0];
    if (!h || !h.label) return null;
    const labelLow = String(h.label).toLowerCase();
    const exactToken = tokens.find((t) => String(t).toLowerCase() === labelLow);
    if (!exactToken) return null;
    if (h.status && String(h.status).startsWith("ghost")) return null;
    // Second hit must be markedly weaker (drop the banner if the rank-2 hit
    // is also an exact match — that means the query is genuinely ambiguous).
    if (hits.length > 1) {
      const h2 = hits[1];
      if (h2 && h2.label && String(h2.label).toLowerCase() === labelLow) return null;
    }
    return h;
  })();

  if (exactMatch) {
    const code = dslLookup(exactMatch.label);
    const prefix = code ? `[${code}] ` : "";
    const w = exactMatch.wiki.length > 0 ? `\n  wiki: ${exactMatch.wiki[0]}` : "";
    const m = exactMatch.memory.length > 0 ? `\n  mem: ${exactMatch.memory[0]}` : "";
    // U-SV-NODE-PATH-TEMPLATE (sierra): resolve the node's exact source path so the
    // model can `Read` it DIRECTLY instead of Grep/Glob-searching. Fail-soft — a
    // miss/ambiguous resolve just omits the line (never a guessed path), and the
    // telemetry write can never throw into the inject.
    let navLine = "";
    try {
      const np = resolveCodePath(exactMatch.label);
      // Emit repoPath (repo-root-relative) — a bare `src/...` read from the repo
      // root opens the untracked top-level dup, not the canonical mcp-server source.
      if (np && np.repoPath) {
        navLine = `\n  → \`Read ${np.repoPath}\`${np.type ? ` (${np.type})` : ""}`;
        recordNavHit({ label: exactMatch.label, path: np.repoPath, source: "master-index" });
      }
    } catch { /* nav resolve/telemetry never blocks the inject */ }
    const prov = renderHitProvenance(exactMatch);
    const provStr = prov ? ` ${prov}` : "";
    const banner = `## ⚡ Master-index EXACT MATCH — graph already knows \`${exactMatch.label}\`
  • [${exactMatch.layer}/${exactMatch.status}] ${prefix}${exactMatch.label}${provStr}${w}${m}${navLine}
_TOKEN-SAVE: skip the Grep/Glob for this term — the graph node IS the answer. Disable: \`PRISM_MASTER_INDEX_INJECT=0\`._`;
    emit(banner);
    process.exit(0);
  }

  // Render compact reminder block — keep it under ~1KB to avoid
  // dominating context. Each line: layer / label / wiki[0] / memory[0].
  // RAG-UPGRADE-MS0/U-RAG-4: edge-order the rank-sorted hits so the strongest
  // land at the head AND tail of the block, weakest in the low-attention
  // middle ("lost in the middle"). Pure O(n), no count change, no latency.
  // HMEMV02 explainable retrieval: compact "why retrieved" tag (which scored fields
  // matched + matched tokens). Default OFF (this block fires every prompt across the
  // fleet); PRISM_MASTER_INDEX_EXPLAIN=1 surfaces it for an operator audit. The lib
  // always returns h.explanation; this only controls rendering.
  const MI_EXPLAIN_ON = process.env.PRISM_MASTER_INDEX_EXPLAIN === "1";
  const explainTag = (h) => {
    if (!MI_EXPLAIN_ON) return "";
    const e = h && h.explanation;
    if (!e) return "";
    const f = Array.isArray(e.fields) && e.fields.length ? e.fields.join("/") : "?";
    const mt = Array.isArray(e.matchedTokens) && e.matchedTokens.length ? ` matched:${e.matchedTokens.join("/")}` : "";
    return ` [via ${f}${mt}]`;
  };
  const lines = edgeOrder(hits).map((h) => {
    const code = dslLookup(h.label);
    const prefix = code ? `[${code}] ` : "";
    const prov = renderHitProvenance(h);
    const provStr = prov ? ` ${prov}` : "";
    const w = h.wiki.length > 0 ? `  wiki: ${h.wiki.slice(0, 2).join(", ")}` : "";
    const m = h.memory.length > 0 ? `  mem: ${h.memory.slice(0, 1).join(", ")}` : "";
    return `  • [${h.layer}/${h.status}] ${prefix}${h.label}${provStr}${explainTag(h)}${w ? "\n   " + w : ""}${m ? "\n   " + m : ""}`;
  });

  const block = `## 🧭 Master-index pre-search (top ${hits.length} of system-graph + obsidian)
Query tokens: ${tokens.join(", ")}

${lines.join("\n")}

_Source: system-graph.json (110K nodes) + pre-joined wiki/memory entries._
_To query manually: \`prism_session:master_index_query\` (action) or \`/master-index <query>\` (skill)._
_To disable: \`PRISM_MASTER_INDEX_INJECT=0\`._`;

  emit(block);
  process.exit(0);
}

// Run as a hook only when invoked directly (not when imported by a test).
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  // main() is async (daemon-first master-index search via http.request). Every code
  // path inside calls process.exit(0) explicitly, and the daemon HTTP call is timeout-
  // bounded + fail-soft, so the process never hangs. .catch() handles async rejection
  // the way the prior try/catch handled sync throws -- hooks must never block the prompt.
  void main().catch((err) => {
    process.stderr.write(`[master-index-precheck-inject] ${err?.message || err}\n`);
    process.exit(0);
  });
}
