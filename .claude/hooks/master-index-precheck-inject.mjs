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
import { fileURLToPath } from "node:url";
import { runMasterIndexSearch } from "../../scripts/lib/master-index-search-lib.mjs";

// --------------------------------------------------------------------------
// Config (env knobs first, then constants)
// --------------------------------------------------------------------------

const ENABLED = process.env.PRISM_MASTER_INDEX_INJECT !== "0";
const TOP_K = clampInt(process.env.PRISM_MASTER_INDEX_K, 5, 1, 20);
const DSL_EMIT = process.env.PRISM_MASTER_INDEX_DSL_EMIT !== "0";

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
      additionalContext: systemReminder,
    },
  }));
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

function main() {
  if (!ENABLED) { process.exit(0); }

  let payload;
  try { payload = JSON.parse(readStdinSync() || "{}"); }
  catch { process.exit(0); }

  const prompt = String(payload.prompt ?? "");
  if (!prompt || prompt.length < 6) { process.exit(0); }

  const { tokens, hits } = runMasterIndexSearch(prompt, { topK: TOP_K });
  if (hits.length === 0) { process.exit(0); }

  // Render compact reminder block — keep it under ~1KB to avoid
  // dominating context. Each line: layer / label / wiki[0] / memory[0].
  const lines = hits.map((h) => {
    const code = dslLookup(h.label);
    const prefix = code ? `[${code}] ` : "";
    const w = h.wiki.length > 0 ? `  wiki: ${h.wiki.slice(0, 2).join(", ")}` : "";
    const m = h.memory.length > 0 ? `  mem: ${h.memory.slice(0, 1).join(", ")}` : "";
    return `  • [${h.layer}/${h.status}] ${prefix}${h.label}${w ? "\n   " + w : ""}${m ? "\n   " + m : ""}`;
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

try { main(); }
catch (err) {
  // Hooks must never block the prompt — log to stderr (which the harness
  // ignores for additionalContext) and exit 0.
  process.stderr.write(`[master-index-precheck-inject] ${err?.message || err}\n`);
  process.exit(0);
}
