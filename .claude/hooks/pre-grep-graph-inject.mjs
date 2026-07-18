#!/usr/bin/env node
// tier: T4
/**
 * pre-grep-graph-inject.mjs — PreToolUse:Grep graph-context injector.
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A2.
 *
 * Sibling of pre-read-graph-inject.mjs. Before a Grep runs, surface the
 * master-index nodes that already match the grep pattern -- "the graph
 * already knows these N nodes for your pattern" -- so Claude can often
 * answer the question from the digest instead of paying for a full Grep,
 * or at least knows which layer/wiki the matches live in.
 *
 * U-SV-NAV-INJECT-GREP-WRITE (sierra): when the pattern resolves to exactly ONE
 * concrete node, collapse to a short EXACT-MATCH banner with a `-> Read <repoPath>`
 * line -- a direct Read beats the Grep -- and credit the saved search to the
 * nav-savings ledger (only when the banner actually emits, not when deduped).
 *
 * GAP-A (high-confidence top hit inline card): when the top non-exact hit has
 * score >= PRISM_PRE_GREP_INLINE_CARD_MIN_SCORE (default 10; p25=8.5, p50=13.5
 * in live topScore distribution so 10 is a confident floor), inject the node
 * CARD inline (id, layer, status, info, vault doc pointers) via seekDocs so
 * the model needs ZERO follow-up call. Only the top hit; respects the 1500-byte
 * cap (skips card if it would overflow); fail-open (any error -> names-only).
 * Set PRISM_PRE_GREP_INLINE_CARD_MIN_SCORE=0 to disable.
 *
 * Karpathy discipline:
 *   CLASSIFY: PreToolUse hook, JSON-stdin -> JSON-stdout
 *   TECHNIQUE: pattern -> deriveGraphKeys({tool:"grep"}) -> master-index BM25
 *   EDGE CASES: missing pattern (continue), all-metachar / all-stopword
 *     pattern -> deriveGraphKeys returns [] -> no inject, no hits -> no inject,
 *     graph load fails (continue), import fails (continue)
 *   FAILURE MODES: every path wrapped -- never blocks, never throws
 *
 * Fail-open: any error path returns {continue:true}. Advisory only.
 *
 * Knobs:
 *   PRISM_PRE_GREP_GRAPH_INJECT=0              -- disable entirely
 *   PRISM_PRE_GREP_GRAPH_TOPK=N                -- hits to surface (default 3, cap 5)
 *   PRISM_PRE_GREP_INLINE_CARD_MIN_SCORE=N     -- high-conf threshold (default 10; 0=disable)
 */

import { readFileSync } from "node:fs";
// Shared exact-match predicate + EXACT-MATCH banner builder + inline node-CARD
// renderer (canonical home; pre-read/grep/write/bash share these). exactMatchHit
// and renderTopCardBlock re-exported for the test.
import { exactMatchHit, exactMatchBanner, renderTopCardBlock } from "../../scripts/lib/graph-exact-match.mjs";
export { exactMatchHit, renderTopCardBlock };

const DEFAULT_TOPK = 3;
const MAX_TOPK = 5;
const MAX_INJECT_BYTES = 1500;
// High-confidence inline-card threshold (GAP-A). Live topScore distribution:
// p25=8.5, p50=13.5 -- 10 is a confident floor between them.
const DEFAULT_INLINE_CARD_MIN_SCORE = 10;

function readStdinSync() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function emit(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* stdout broken — non-fatal */ }
}

/**
 * Render the top-K hits as a compact additionalContext block.
 * @param {string[]} keys   the derived graph keys (for the header)
 * @param {Array} hits      master-index hits
 * @param {(label:string)=>({repoPath?:string,type?:string}|null)} [resolve]
 *        optional node-label->source-path resolver. When an exact match resolves,
 *        the EXACT-MATCH banner gains a "-> Read <repoPath>" line. Default: no
 *        path line (keeps renderInject hermetic for unit tests).
 * @param {((id:string)=>({wiki?:string[],mem?:string[]}|null))|undefined} [seekDocs]
 *        optional node-id->doc-pointer resolver for vault paths.
 * @param {number} [inlineCardMinScore]
 *        GAP-A threshold override; 0 or negative disables inline card.
 *        When omitted, reads PRISM_PRE_GREP_INLINE_CARD_MIN_SCORE env or uses 10.
 * @returns {string|null}
 */
export function renderInject(keys, hits, resolve, seekDocs, inlineCardMinScore) {
  if (!Array.isArray(hits) || hits.length === 0) return null;
  // Exact-match collapse: a single concrete node exactly matching the pattern ->
  // the Grep is almost certainly unnecessary; emit a short banner (+ Read path
  // + the node's Obsidian vault paths via seekDocs).
  const h0 = exactMatchHit(keys, hits);
  if (h0) {
    return exactMatchBanner(h0, {
      header: "## ⚡ Pre-Grep EXACT MATCH -- graph already knows",
      footer: "_TOKEN-SAVE: skip the Grep -- the graph node IS the answer. Disable: PRISM_PRE_GREP_GRAPH_INJECT=0._",
      maxBytes: MAX_INJECT_BYTES,
      resolve,
      seekDocs,
    });
  }
  const keyStr = Array.isArray(keys) && keys.length ? keys.join(", ") : "your pattern";
  const topHit = hits[0];
  const topScore = (topHit && typeof topHit.score === "number") ? topHit.score : 0;
  // GAP-A: resolve the effective threshold (caller-supplied wins over env/default).
  // A value <= 0 disables the inline card entirely.
  const threshold = (typeof inlineCardMinScore === "number")
    ? inlineCardMinScore
    : (() => {
        const env = Number(process.env.PRISM_PRE_GREP_INLINE_CARD_MIN_SCORE);
        return Number.isFinite(env) ? env : DEFAULT_INLINE_CARD_MIN_SCORE;
      })();
  // GAP-A: if top hit is high-confidence (score >= threshold > 0), attempt to
  // inject its card inline so the model needs zero follow-up calls. The card is
  // prepended only when it fits within the 1500-byte cap; otherwise names-only.
  // Fail-open: any renderTopCardBlock error -> inlineCard stays null.
  let inlineCard = null;
  if (threshold > 0 && topScore >= threshold && topHit) {
    try {
      inlineCard = renderTopCardBlock(topHit, seekDocs);
    } catch {
      inlineCard = null;
    }
  }
  const lines = [
    `## 🔗 Pre-Grep graph context -- ${Math.min(hits.length, MAX_TOPK)} node(s) already match "${keyStr}"`,
  ];
  for (const h of hits.slice(0, MAX_TOPK)) {
    const layer = h.layer ? `[${h.layer}/${h.status || "?"}]` : "[?]";
    const label = h.label || h.id || "?";
    const info = (h.info || "").slice(0, 120);
    lines.push(`  • ${layer} ${label}${info ? " -- " + info : ""}`);
  }
  lines.push("_The graph may already answer this -- consider it before a full Grep. Disable: PRISM_PRE_GREP_GRAPH_INJECT=0._");
  const namesBlock = lines.join("\n");
  if (inlineCard) {
    const combined = inlineCard + "\n" + namesBlock;
    if (combined.length <= MAX_INJECT_BYTES) return combined;
    // Card would overflow -- fall back to names-only (still byte-cap below).
  }
  // -3 reserves room for the "..." marker so a truncated block never exceeds the cap.
  return namesBlock.length <= MAX_INJECT_BYTES ? namesBlock : namesBlock.slice(0, MAX_INJECT_BYTES - 3) + "...";
}

async function main() {
  if (process.env.PRISM_PRE_GREP_GRAPH_INJECT === "0") { emit({ continue: true }); return; }

  let stdin;
  try {
    const raw = readStdinSync();
    if (!raw) { emit({ continue: true }); return; }
    stdin = JSON.parse(raw);
  } catch {
    emit({ continue: true });
    return;
  }

  // Claude Code PreToolUse stdin: { tool_name:"Grep", tool_input:{ pattern, ... } }
  const pattern = stdin?.tool_input?.pattern ?? stdin?.pattern;
  if (typeof pattern !== "string" || pattern.length === 0) { emit({ continue: true }); return; }

  // Lazy-import both libs so an import failure (mid-refactor) never blocks Grep.
  let deriveGraphKeys;
  let runMasterIndexSearch;
  let searchViaDaemon;
  try {
    ({ deriveGraphKeys } = await import("../../scripts/lib/graph-key-derive.mjs"));
    ({ runMasterIndexSearch, searchViaDaemon } = await import("../../scripts/lib/master-index-search-lib.mjs"));
  } catch {
    emit({ continue: true });
    return;
  }

  // deriveGraphKeys is the high-ROI gate: an all-metachar or all-stopword
  // pattern yields [] → skip the search entirely (no inject).
  let keys = [];
  try {
    keys = deriveGraphKeys({ input: pattern, tool: "grep" });
  } catch {
    emit({ continue: true });
    return;
  }
  if (!Array.isArray(keys) || keys.length === 0) { emit({ continue: true }); return; }

  const envK = Number(process.env.PRISM_PRE_GREP_GRAPH_TOPK);
  const topK = Number.isFinite(envK) && envK >= 1 && envK <= MAX_TOPK ? envK : DEFAULT_TOPK;

  let hits = [];
  try {
    // FLEET-SEARCH-DAEMON-MS0: warm-daemon first (node http, no spawn, full
    // coverage); fall back to in-process on any miss (down/disabled/timeout).
    let result = null;
    try { result = await searchViaDaemon(keys.join(" "), { topK, daemonTimeoutMs: 400 }); } catch { result = null; }
    if (!result) result = runMasterIndexSearch(keys.join(" "), { topK });
    hits = (result && Array.isArray(result.hits)) ? result.hits : [];
  } catch {
    emit({ continue: true });
    return;
  }

  // U-SV-NAV-INJECT (sierra): optional node→path resolver + nav-savings telemetry,
  // lazy-imported (fail-open — an import defect never blocks Grep, only drops the line).
  let resolveCodePath = null;
  let creditNavOnEmit = null;
  try {
    ({ resolveCodePath } = await import("../../scripts/lib/code-path-resolver.mjs"));
    ({ creditNavOnEmit } = await import("../../scripts/lib/nav-savings-ledger.mjs"));
  } catch { /* nav extras optional — base inject still fires */ }

  // U-SV-NODE-VAULT-PATHS (sierra): seekCard-backed node→vault/wiki/memory paths.
  // Hook-safe (seek-only, never the 644MB graph, never throws); fail-open import.
  let seekDocs = null;
  try {
    const { seekCard } = await import("../../scripts/lib/node-card-read.mjs");
    seekDocs = (id) => {
      const r = seekCard(id);
      if (!r || !r.card) return null;
      const c = r.card;
      return {
        wiki: Array.isArray(c.wikiEntries) ? c.wikiEntries : [],
        mem: Array.isArray(c.memoryEntries) ? c.memoryEntries : [],
      };
    };
  } catch { /* node-card optional — base inject still fires */ }

  const block = renderInject(keys, hits, resolveCodePath || undefined, seekDocs || undefined);
  if (!block) { emit({ continue: true }); return; }

  // Resolve the exact-match nav target; recorded below ONLY if the banner emits
  // (not deduped), so the credit matches the real saved search. Fail-soft.
  let navHit = null;
  if (resolveCodePath) {
    try {
      const h0 = exactMatchHit(keys, hits);
      if (h0) {
        const np = resolveCodePath(h0.label);
        if (np && np.repoPath) navHit = { label: h0.label, path: np.repoPath, source: "pre-grep" };
      }
    } catch { /* resolver never blocks the inject */ }
  }

  // U-PGGI-DEDUP (2026-05-25, slot:alpha) — per-(session,content-hash) dedup.
  // Same pattern as siblings (U-PWGI/U-PRGI/U-PBGI). Fail-soft.
  let additionalContext = block;
  let emittedBanner = true; // false when the dedup cache suppresses the banner
  try {
    const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
    const sid = String(stdin?.session_id || stdin?.sessionId || "").slice(0, 8);
    if (!dedupDisabled && sid) {
      const lib = await import("../../scripts/lib/injection-dedup.mjs");
      const fs = await import("node:fs");
      const cacheFile = "H:/prism/state/shared/dashboards/injection-dedup-cache.json";
      let cache = {};
      try { cache = JSON.parse(fs.readFileSync(cacheFile, "utf8")); } catch { /* fail-soft */ }
      const hookTag = `pre-grep-graph-inject:${sid}`;
      const contentHash = lib.hashBlock(block);
      const now = Date.now();
      const ttl = 24 * 60 * 60_000;
      cache = lib.pruneTag(cache, hookTag, now, ttl); // shared-cache-safe: prune only this tag (24h TTL)
      const decision = lib.shouldEmit(cache, hookTag, contentHash, now, ttl);
      if (!decision.emit) {
        additionalContext = lib.formatDedupedMarker(hookTag);
        emittedBanner = false;
      } else if (contentHash) {
        try {
          const newCache = lib.recordEmit(cache, hookTag, contentHash, now);
          fs.mkdirSync("H:/prism/state/shared/dashboards", { recursive: true });
          fs.writeFileSync(cacheFile, JSON.stringify(newCache), "utf8");
        } catch { /* fail-soft */ }
      }
    }
  } catch { /* fail-soft */ }

  // Credit the nav-savings hit ONLY when the banner is actually shown (not
  // suppressed by dedup) — emission ⇔ a saved Grep. creditNavOnEmit is fail-soft
  // and gates on (navHit ∧ emittedBanner) internally.
  if (creditNavOnEmit) creditNavOnEmit({ navHit, emittedBanner });

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext,
    },
  });
}

// Allow direct unit-test imports of renderInject without firing main().
const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, "/").endsWith("pre-grep-graph-inject.mjs");
if (invokedDirectly) {
  void main().catch(() => emit({ continue: true }));
}
