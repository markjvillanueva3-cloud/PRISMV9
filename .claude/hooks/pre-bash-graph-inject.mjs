#!/usr/bin/env node
// tier: T4
/**
 * pre-bash-graph-inject.mjs — PreToolUse:Bash graph-context injector.
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A4.
 *
 * Sibling of pre-read / pre-grep / pre-write graph-inject. Before a Bash
 * command runs, surface the master-index nodes the graph already knows —
 * but NARROW: bash is mostly `git` / `npm` / `node` / build commands that
 * carry no graph signal. deriveGraphKeys({tool:"bash"}) returns [] for all
 * of those; it only derives keys when the command verb is a file-search
 * verb (grep / rg / find / cat / head / tail / ls). So this hook is quiet
 * on ~95% of bash invocations and only injects when the shell is about to
 * do the same thing a graph lookup could answer.
 *
 * Karpathy discipline:
 *   CLASSIFY: PreToolUse hook, JSON-stdin → JSON-stdout
 *   TECHNIQUE: command → deriveGraphKeys({tool:"bash"}) → master-index BM25
 *   EDGE CASES: missing command (continue), non-file-search verb
 *     (deriveGraphKeys → [] → no inject), all-flag / no-arg file-search verb
 *     (→ [] → no inject), no hits (no inject), graph/import fails (continue)
 *   FAILURE MODES: every path wrapped — never blocks, never throws
 *
 * Fail-open: any error path returns {continue:true}. Advisory only.
 *
 * Knobs:
 *   PRISM_PRE_BASH_GRAPH_INJECT=0   — disable entirely
 *   PRISM_PRE_BASH_GRAPH_TOPK=N     — hits to surface (default 3, cap 5)
 */

import { readFileSync } from "node:fs";
// Shared exact-match predicate + nav path-line (canonical home; pre-grep/pre-write
// share these). exactMatchHit re-exported for the colocated test. (U-SV-NAV-INJECT.)
import { exactMatchHit, navPathLine } from "../../scripts/lib/graph-exact-match.mjs";
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
 * Render the top-K hits as a compact additionalContext block.
 * @param {string[]} keys   the derived graph keys (for the header)
 * @param {Array} hits      master-index hits
 * @param {(label:string)=>({path:string,type?:string}|null)} [resolve]
 *        optional node-label→source-path resolver. When an exact match resolves,
 *        the banner gains a `→ Read: <path>` line so the model opens the file
 *        DIRECTLY instead of running the shell search. Default: no path line
 *        (keeps renderInject hermetic for unit tests).
 * @param {(id:string)=>({wiki?:string[],mem?:string[]}|null)} [seekDocs]
 *        optional node-id→doc-pointer resolver (a seekCard wrapper). When an
 *        exact match resolves to a node card, the banner gains a `📂 vault paths`
 *        line carrying the node's Obsidian wiki/memory entries — so the model
 *        gets the node→vault paths INLINE (zero follow-up node-card / wiki-query
 *        / Read). Injected (not imported) to keep renderInject hermetic + the
 *        common no-card case zero-cost. (CHEAP-NODE-ACCESS-MS0 · U-SV-NODE-VAULT-PATHS.)
 * @returns {string|null}
 */
export function renderInject(keys, hits, resolve, seekDocs) {
  if (!Array.isArray(hits) || hits.length === 0) return null;
  const keyStr = Array.isArray(keys) && keys.length ? keys.join(", ") : "this search";

  // HIGH-ROI-TS2 iter3 (2026-05-22): exact-match collapse — when the shell call
  // is almost certainly unnecessary, emit a short banner instead of the 3-hit
  // block. U-SV-NODE-PATH-TEMPLATE (sierra): when that exact node resolves to a
  // real source path, add a `→ Read: <path>` line (token-save: a direct Read
  // beats the Grep/Glob). Multi-hit / no-exact-match falls through unchanged.
  const h0 = exactMatchHit(keys, hits);
  if (h0) {
    const layer = h0.layer ? `[${h0.layer}/${h0.status}]` : "[?]";
    const info = (h0.info || "").slice(0, 120);
    let navLine = "";
    if (typeof resolve === "function") {
      // navPathLine gates on repoPath (repo-root-relative, directly Readable) — a
      // bare `src/...` would open the untracked top-level dup, so it's never emitted.
      try { navLine = navPathLine(resolve(h0.label)); } catch { /* resolver never breaks the banner */ }
    }
    // U-SV-NODE-VAULT-PATHS (sierra): surface the node's Obsidian wiki/memory
    // paths INLINE from its card, so the model never needs a follow-up
    // node-card/wiki-query/Read to find the docs. Fail-soft + only when a card
    // resolves (seekDocs returns null otherwise → banner unchanged, no regression).
    let docLine = "";
    if (typeof seekDocs === "function") {
      try {
        const d = seekDocs(h0.id || h0.label);
        if (d) {
          const bits = [];
          if (Array.isArray(d.wiki) && d.wiki.length) bits.push(`wiki: ${d.wiki.slice(0, 2).join(" · ")}`);
          if (Array.isArray(d.mem) && d.mem.length) bits.push(`mem: ${d.mem.slice(0, 2).join(" · ")}`);
          if (bits.length) docLine = `\n  • 📂 vault paths — ${bits.join("  ·  ")}`;
        }
      } catch { /* card seek never breaks the banner */ }
    }
    const banner =
      `## ⚡ Pre-Bash EXACT MATCH — graph already knows \`${h0.label}\`\n` +
      `  • ${layer} ${h0.label}${info ? " — " + info : ""}${navLine}${docLine}\n` +
      `_TOKEN-SAVE: skip the shell search — the graph node IS the answer. Disable: PRISM_PRE_BASH_GRAPH_INJECT=0._`;
    return banner.length <= MAX_INJECT_BYTES ? banner : banner.slice(0, MAX_INJECT_BYTES) + "…";
  }

  const lines = [
    `## 🔗 Pre-Bash graph context — ${Math.min(hits.length, MAX_TOPK)} node(s) already match "${keyStr}"`,
  ];
  for (const h of hits.slice(0, MAX_TOPK)) {
    const layer = h.layer ? `[${h.layer}/${h.status || "?"}]` : "[?]";
    const label = h.label || h.id || "?";
    const info = (h.info || "").slice(0, 120);
    lines.push(`  • ${layer} ${label}${info ? " — " + info : ""}`);
  }
  lines.push("_The graph may already answer this — consider it before the shell search. Disable: PRISM_PRE_BASH_GRAPH_INJECT=0._");
  const out = lines.join("\n");
  return out.length <= MAX_INJECT_BYTES ? out : out.slice(0, MAX_INJECT_BYTES) + "…";
}

async function main() {
  if (process.env.PRISM_PRE_BASH_GRAPH_INJECT === "0") { emit({ continue: true }); return; }

  let stdin;
  try {
    const raw = readStdinSync();
    if (!raw) { emit({ continue: true }); return; }
    stdin = JSON.parse(raw);
  } catch {
    emit({ continue: true });
    return;
  }

  // Claude Code PreToolUse stdin: { tool_name:"Bash", tool_input:{ command, ... } }
  const command = stdin?.tool_input?.command ?? stdin?.command;
  if (typeof command !== "string" || command.length === 0) { emit({ continue: true }); return; }

  // Lazy-import both libs so an import failure (mid-refactor) never blocks Bash.
  let deriveGraphKeys;
  let runMasterIndexSearch;
  try {
    ({ deriveGraphKeys } = await import("../../scripts/lib/graph-key-derive.mjs"));
    ({ runMasterIndexSearch } = await import("../../scripts/lib/master-index-search-lib.mjs"));
  } catch {
    emit({ continue: true });
    return;
  }

  // deriveGraphKeys{tool:"bash"} is the high-ROI gate: it returns [] for any
  // command that is not a file-search verb (grep/rg/find/cat/head/tail/ls),
  // so ~95% of bash invocations skip the search entirely (no inject).
  let keys = [];
  try {
    keys = deriveGraphKeys({ input: command, tool: "bash" });
  } catch {
    emit({ continue: true });
    return;
  }
  if (!Array.isArray(keys) || keys.length === 0) { emit({ continue: true }); return; }

  const envK = Number(process.env.PRISM_PRE_BASH_GRAPH_TOPK);
  const topK = Number.isFinite(envK) && envK >= 1 && envK <= MAX_TOPK ? envK : DEFAULT_TOPK;

  let hits = [];
  try {
    const result = runMasterIndexSearch(keys.join(" "), { topK });
    hits = (result && Array.isArray(result.hits)) ? result.hits : [];
  } catch {
    emit({ continue: true });
    return;
  }

  // U-SV-NODE-PATH-TEMPLATE (sierra): optional node→path resolver + nav-savings
  // telemetry, lazy-imported with the same fail-open discipline as the graph libs
  // above — an import defect here must never block Bash, only drop the path line.
  let resolveCodePath = null;
  let creditNavOnEmit = null;
  try {
    ({ resolveCodePath } = await import("../../scripts/lib/code-path-resolver.mjs"));
    ({ creditNavOnEmit } = await import("../../scripts/lib/nav-savings-ledger.mjs"));
  } catch { /* nav extras optional — base inject still fires */ }

  // U-SV-NODE-VAULT-PATHS (sierra): seekCard-backed node→vault/wiki/memory path
  // resolver. seekCard is hook-safe (seek-only over the offset index, never the
  // 644MB graph, never throws) — so this is the SAME fail-open discipline. An
  // import defect drops the vault-paths line only; the base banner still fires.
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

  // Resolve the exact-match nav target (if any). Recorded to the savings ledger
  // BELOW — only if the banner actually emits (not suppressed by dedup) — so the
  // credited saving matches reality (P2 fix, scrutiny arm C: a deduped repeat
  // re-shows nothing, so it saved no NEW search). Fail-soft.
  let navHit = null;
  if (resolveCodePath) {
    try {
      const h0 = exactMatchHit(keys, hits);
      if (h0) {
        const np = resolveCodePath(h0.label);
        if (np && np.repoPath) navHit = { label: h0.label, path: np.repoPath, source: "pre-bash" };
      }
    } catch { /* resolver never blocks the inject */ }
  }

  // U-PBGI-DEDUP (2026-05-25, slot:alpha) — per-(session,content-hash) dedup.
  // For Bash, the natural cache discriminator is the rendered block itself
  // (same command base / keys → same hits → same block → dedup). Fail-soft.
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
      const hookTag = `pre-bash-graph-inject:${sid}`;
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
  } catch { /* fail-soft */ }

  // Credit the nav-savings hit ONLY when the banner is actually shown (not
  // suppressed by dedup) — emission ⇔ a saved shell search. creditNavOnEmit is
  // fail-soft and gates on (navHit ∧ emittedBanner) internally.
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
  && process.argv[1].replace(/\\/g, "/").endsWith("pre-bash-graph-inject.mjs");
if (invokedDirectly) {
  void main().catch(() => emit({ continue: true }));
}
