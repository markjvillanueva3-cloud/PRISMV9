#!/usr/bin/env node
// tier: T4
/**
 * pre-read-graph-inject.mjs — PreToolUse:Read graph-context injector.
 *
 * PRISM-SEARCH-MS0 / U-PSM01 (2026-05-18, slot golf).
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A5 (2026-05-22, slot echo) — key
 *   derivation refactored onto the shared scripts/lib/graph-key-derive.mjs
 *   so all four PreToolUse graph hooks (read / grep / write / bash) share
 *   ONE derivation core. The old bespoke deriveQueryKey() (extension-strip
 *   + MIN_LEN + index/main/dotfile skip) is gone — deriveGraphKeys({tool:
 *   "read"}) + the search's >=2-token floor cover every case it gated.
 *
 * Gap this hook closes: the existing read-bundle.mjs sub-hooks handle
 * caching, limits, routing, watchdog timing — but NONE surface graph
 * context. The sibling `wiki-recall-on-read` hook fires PostToolUse, so
 * wiki/graph info arrives AFTER the Read, when Claude has already decided
 * what to read. This hook injects "this file's master-index node + top-3
 * hits" BEFORE the Read, so Claude sees callers / wiring / wiki entry
 * without a follow-up Grep for "who calls this?".
 *
 * Karpathy discipline:
 *   CLASSIFY: PreToolUse hook, JSON-stdin → JSON-stdout
 *   TECHNIQUE: file_path → deriveGraphKeys({tool:"read"}) → master-index BM25
 *   EDGE CASES: missing file_path (continue), basename with no usable stem
 *     (deriveGraphKeys → [] → no inject), noisy/short names like index.ts /
 *     a.ts (lib tokenize MIN_TOKEN_LEN + the search's >=2-token floor
 *     naturally yield no hits → no inject), graph load fails (continue),
 *     import fails (continue)
 *   FAILURE MODES: all wrapped — never blocks, never throws to caller
 *
 * Fail-open: any error path returns {continue:true}. Advisory only — never
 * load-bearing.
 *
 * Knobs:
 *   PRISM_PRE_READ_GRAPH_INJECT=0   — disable entirely
 *   PRISM_PRE_READ_GRAPH_TOPK=N     — number of hits to surface (default 3, cap 5)
 */

import { readFileSync } from "node:fs";

const DEFAULT_TOPK = 3;
const MAX_TOPK = 5;
const MAX_INJECT_BYTES = 1500;

function readStdinSync() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function emit(obj) {
  try {
    process.stdout.write(JSON.stringify(obj));
  } catch {
    /* stdout broken — non-fatal */
  }
}

/**
 * Render the top-K hits as a compact additionalContext block.
 * @param {string[]} keys  the derived graph keys (for the header)
 * @param {Array} hits     master-index hits
 * @returns {string|null}
 */
export function renderInject(keys, hits) {
  if (!Array.isArray(hits) || hits.length === 0) return null;
  const keyStr = Array.isArray(keys) && keys.length ? keys.join(", ") : "this file";
  const lines = [
    `## 🔗 Pre-Read graph context — top-${Math.min(hits.length, MAX_TOPK)} hits for "${keyStr}"`,
  ];
  for (const h of hits.slice(0, MAX_TOPK)) {
    const layer = h.layer ? `[${h.layer}/${h.status || "?"}]` : "[?]";
    const label = h.label || h.id || "?";
    const info = (h.info || "").slice(0, 120);
    lines.push(`  • ${layer} ${label}${info ? " — " + info : ""}`);
  }
  lines.push("_Source: system-graph.json via master-index-search-lib. Disable: PRISM_PRE_READ_GRAPH_INJECT=0._");
  const out = lines.join("\n");
  return out.length <= MAX_INJECT_BYTES ? out : out.slice(0, MAX_INJECT_BYTES) + "…";
}

async function main() {
  if (process.env.PRISM_PRE_READ_GRAPH_INJECT === "0") {
    emit({ continue: true });
    return;
  }
  let stdin;
  try {
    const raw = readStdinSync();
    if (!raw) { emit({ continue: true }); return; }
    stdin = JSON.parse(raw);
  } catch {
    emit({ continue: true });
    return;
  }

  // Claude Code PreToolUse stdin shape: { tool_name, tool_input:{ file_path, ... }, ... }
  const filePath = stdin?.tool_input?.file_path
    ?? stdin?.tool_input?.path
    ?? stdin?.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) { emit({ continue: true }); return; }

  // Lazy-import both libs so an import failure (e.g. during a refactor)
  // never blocks the Read.
  let deriveGraphKeys;
  let runMasterIndexSearch;
  try {
    ({ deriveGraphKeys } = await import("../../scripts/lib/graph-key-derive.mjs"));
    ({ runMasterIndexSearch } = await import("../../scripts/lib/master-index-search-lib.mjs"));
  } catch {
    emit({ continue: true });
    return;
  }

  // deriveGraphKeys{tool:"read"}: basename stem, dash/underscore-split,
  // tokenized. A nameless / all-stopword / too-short path yields [] → no
  // inject. Noisy stems (index, main, a.ts) tokenize to 0-1 keys → the
  // search's >=2-token floor then yields no hits → no inject.
  let keys = [];
  try {
    keys = deriveGraphKeys({ input: filePath, tool: "read" });
  } catch {
    emit({ continue: true });
    return;
  }
  if (!Array.isArray(keys) || keys.length === 0) { emit({ continue: true }); return; }

  const envK = Number(process.env.PRISM_PRE_READ_GRAPH_TOPK);
  const topK = Number.isFinite(envK) && envK >= 1 && envK <= MAX_TOPK ? envK : DEFAULT_TOPK;

  let hits = [];
  try {
    const result = runMasterIndexSearch(keys.join(" "), { topK });
    hits = (result && Array.isArray(result.hits)) ? result.hits : [];
  } catch {
    emit({ continue: true });
    return;
  }

  const block = renderInject(keys, hits);
  if (!block) { emit({ continue: true }); return; }

  // U-PRGI-DEDUP (2026-05-25, slot:alpha) — per-(session,file) dedup. Companion
  // to U-PWGI-DEDUP. Fail-soft on lib unavailable.
  let additionalContext = block;
  try {
    const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
    const sid = String(stdin?.session_id || stdin?.sessionId || "").slice(0, 8);
    if (!dedupDisabled && sid && filePath) {
      const lib = await import("../../scripts/lib/injection-dedup.mjs");
      const fs = await import("node:fs");
      const cacheFile = "H:/prism/state/shared/dashboards/injection-dedup-cache.json";
      let cache = {};
      try { cache = JSON.parse(fs.readFileSync(cacheFile, "utf8")); } catch { /* fail-soft */ }
      const hookTag = `pre-read-graph-inject:${sid}:${filePath}`;
      const contentHash = lib.hashBlock(block);
      const now = Date.now();
      const ttl = 24 * 60 * 60_000;
      cache = lib.pruneExpired(cache, now, ttl);
      const decision = lib.shouldEmit(cache, hookTag, contentHash, now, ttl);
      if (!decision.emit) {
        additionalContext = lib.formatDedupedMarker(hookTag);
      } else if (contentHash) {
        try {
          const newCache = lib.recordEmit(cache, hookTag, contentHash, now);
          fs.mkdirSync("H:/prism/state/shared/dashboards", { recursive: true });
          fs.writeFileSync(cacheFile, JSON.stringify(newCache), "utf8");
        } catch { /* fail-soft */ }
      }
    }
  } catch { /* fail-soft */ }

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
  && process.argv[1].replace(/\\/g, "/").endsWith("pre-read-graph-inject.mjs");
if (invokedDirectly) {
  void main().catch(() => emit({ continue: true }));
}
