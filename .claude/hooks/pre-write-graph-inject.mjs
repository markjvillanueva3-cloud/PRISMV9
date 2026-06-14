#!/usr/bin/env node
// tier: T4
/**
 * pre-write-graph-inject.mjs — PreToolUse:Write graph-context injector.
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A3.
 *
 * Sibling of pre-read / pre-grep graph-inject. Before a Write creates or
 * overwrites a file, surface the master-index nodes whose name overlaps the
 * target filename — "the graph has N related/duplicate nodes for this name".
 * This is a soft duplicate-detection nudge: a chat about to Write
 * `CuttingForceEngine.ts` sees the existing CuttingForce* nodes BEFORE it
 * writes, complementing the harder duplication-guard hooks.
 *
 * U-SV-NAV-INJECT-GREP-WRITE (sierra): when the target name resolves to exactly
 * ONE concrete node, collapse to an EXACT-MATCH banner with a `→ Read <repoPath>`
 * line — "this asset already exists; Read it before you (re)write" — the
 * strongest dedup-before-create signal. Credited to the nav-savings ledger only
 * when the banner actually emits (not when deduped).
 *
 * ADVISORY ONLY — never blocks a Write (the hard duplicate block lives in
 * duplication-hard-block.mjs). This hook only injects context.
 *
 * Karpathy discipline:
 *   CLASSIFY: PreToolUse hook, JSON-stdin → JSON-stdout
 *   TECHNIQUE: file_path → deriveGraphKeys({tool:"write"}) → master-index BM25
 *   EDGE CASES: missing file_path (continue), basename with no stem
 *     (deriveGraphKeys → []), no hits (no inject), graph/import fails (continue)
 *   FAILURE MODES: every path wrapped — never blocks, never throws
 *
 * Fail-open: any error path returns {continue:true}.
 *
 * Knobs:
 *   PRISM_PRE_WRITE_GRAPH_INJECT=0   — disable entirely
 *   PRISM_PRE_WRITE_GRAPH_TOPK=N     — hits to surface (default 3, cap 5)
 */

import { readFileSync } from "node:fs";
// Shared exact-match predicate + EXACT-MATCH banner builder (canonical home;
// pre-bash/pre-grep share these). exactMatchHit re-exported for the test.
import { exactMatchHit, exactMatchBanner } from "../../scripts/lib/graph-exact-match.mjs";
export { exactMatchHit };

const DEFAULT_TOPK = 3;
const MAX_TOPK = 5;
const MAX_INJECT_BYTES = 1500;

function readStdinSync() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function emit(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* stdout broken — non-fatal */ }
}

/**
 * Render the top-K related/duplicate nodes as a compact additionalContext
 * block. Advisory framing — surfaces possible duplicates, never blocks.
 * @param {string[]} keys
 * @param {Array} hits
 * @param {(label:string)=>({repoPath?:string,type?:string}|null)} [resolve]
 *        optional node-label→source-path resolver. On an exact match the
 *        EXACT-MATCH banner gains a `→ Read <repoPath>` line (read-before-write).
 * @returns {string|null}
 */
export function renderInject(keys, hits, resolve, seekDocs) {
  if (!Array.isArray(hits) || hits.length === 0) return null;
  // Exact-match collapse: the target name maps to exactly ONE concrete node →
  // it almost certainly already exists; surface "Read it before you (re)write"
  // plus the node's Obsidian vault docs (seekDocs) — extra dedup signal.
  const h0 = exactMatchHit(keys, hits);
  if (h0) {
    return exactMatchBanner(h0, {
      header: "## ⚡ Pre-Write EXACT MATCH — this asset already exists:",
      footer: "_Read it before you create/overwrite — likely a duplicate (see /dedup). Disable: PRISM_PRE_WRITE_GRAPH_INJECT=0._",
      maxBytes: MAX_INJECT_BYTES,
      resolve,
      seekDocs,
    });
  }
  const keyStr = Array.isArray(keys) && keys.length ? keys.join(", ") : "this name";
  const lines = [
    `## 🔗 Pre-Write graph context — ${Math.min(hits.length, MAX_TOPK)} related node(s) for "${keyStr}"`,
  ];
  for (const h of hits.slice(0, MAX_TOPK)) {
    const layer = h.layer ? `[${h.layer}/${h.status || "?"}]` : "[?]";
    const label = h.label || h.id || "?";
    const info = (h.info || "").slice(0, 120);
    lines.push(`  • ${layer} ${label}${info ? " — " + info : ""}`);
  }
  lines.push("_Advisory — if you are creating a NEW asset, confirm it does not duplicate the above (see /dedup). Disable: PRISM_PRE_WRITE_GRAPH_INJECT=0._");
  const out = lines.join("\n");
  return out.length <= MAX_INJECT_BYTES ? out : out.slice(0, MAX_INJECT_BYTES) + "…";
}

async function main() {
  if (process.env.PRISM_PRE_WRITE_GRAPH_INJECT === "0") { emit({ continue: true }); return; }

  let stdin;
  try {
    const raw = readStdinSync();
    if (!raw) { emit({ continue: true }); return; }
    stdin = JSON.parse(raw);
  } catch {
    emit({ continue: true });
    return;
  }

  // Claude Code PreToolUse stdin: { tool_name:"Write", tool_input:{ file_path, content } }
  const filePath = stdin?.tool_input?.file_path
    ?? stdin?.tool_input?.path
    ?? stdin?.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) { emit({ continue: true }); return; }

  // Lazy-import both libs so an import failure (mid-refactor) never blocks Write.
  let deriveGraphKeys;
  let runMasterIndexSearch;
  try {
    ({ deriveGraphKeys } = await import("../../scripts/lib/graph-key-derive.mjs"));
    ({ runMasterIndexSearch } = await import("../../scripts/lib/master-index-search-lib.mjs"));
  } catch {
    emit({ continue: true });
    return;
  }

  // deriveGraphKeys{tool:"write"}: basename stem, dash/underscore-split,
  // tokenized. A nameless / all-stopword path yields [] → no inject.
  let keys = [];
  try {
    keys = deriveGraphKeys({ input: filePath, tool: "write" });
  } catch {
    emit({ continue: true });
    return;
  }
  if (!Array.isArray(keys) || keys.length === 0) { emit({ continue: true }); return; }

  const envK = Number(process.env.PRISM_PRE_WRITE_GRAPH_TOPK);
  const topK = Number.isFinite(envK) && envK >= 1 && envK <= MAX_TOPK ? envK : DEFAULT_TOPK;

  let hits = [];
  try {
    const result = runMasterIndexSearch(keys.join(" "), { topK });
    hits = (result && Array.isArray(result.hits)) ? result.hits : [];
  } catch {
    emit({ continue: true });
    return;
  }

  // U-SV-NAV-INJECT (sierra): optional node→path resolver + nav-savings telemetry,
  // lazy-imported (fail-open — an import defect never blocks Write, only drops the line).
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
        if (np && np.repoPath) navHit = { label: h0.label, path: np.repoPath, source: "pre-write" };
      }
    } catch { /* resolver never blocks the inject */ }
  }

  // U-PWGI-DEDUP (2026-05-25, slot:alpha) — per-(session,file) dedup.
  // Re-fires only when (file, hits) change. Fail-soft on lib unavailable.
  let additionalContext = block;
  let emittedBanner = true; // false when the dedup cache suppresses the banner
  try {
    const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
    const sid = String(stdin?.session_id || stdin?.sessionId || "").slice(0, 8);
    if (!dedupDisabled && sid && filePath) {
      const lib = await import("../../scripts/lib/injection-dedup.mjs");
      const fs = await import("node:fs");
      const cacheFile = "H:/prism/state/shared/dashboards/injection-dedup-cache.json";
      let cache = {};
      try { cache = JSON.parse(fs.readFileSync(cacheFile, "utf8")); } catch { /* fail-soft */ }
      const hookTag = `pre-write-graph-inject:${sid}:${filePath}`;
      const contentHash = lib.hashBlock(block);
      const now = Date.now();
      const ttl = 24 * 60 * 60_000;
      cache = lib.pruneExpired(cache, now, ttl);
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
  } catch { /* fail-soft — emit full block */ }

  // Credit the nav-savings hit ONLY when the banner is actually shown (not
  // suppressed by dedup) — emission ⇔ a saved search. creditNavOnEmit is fail-soft
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
  && process.argv[1].replace(/\\/g, "/").endsWith("pre-write-graph-inject.mjs");
if (invokedDirectly) {
  void main().catch(() => emit({ continue: true }));
}
