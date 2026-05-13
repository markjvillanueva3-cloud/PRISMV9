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
 */

import { readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

// --------------------------------------------------------------------------
// Config (env knobs first, then constants)
// --------------------------------------------------------------------------

const ENABLED = process.env.PRISM_MASTER_INDEX_INJECT !== "0";
const TOP_K = clampInt(process.env.PRISM_MASTER_INDEX_K, 5, 1, 20);
const MIN_PROMPT_TOKENS = 2;
const MAX_PROMPT_LEN = 4000;
const PRISM_ROOT = "H:/prism";
const GRAPH_PATH = path.join(PRISM_ROOT, "state/shared/system-viz/system-graph.json");

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "its", "of", "on", "or", "the",
  "to", "was", "were", "with", "this", "that", "these", "those",
  "you", "your", "what", "where", "when", "how", "why", "which",
  "engine", "engines", "feature", "features", "system", "systems",
  "node", "label", "info", "wiki", "memory", "prism",
  "please", "would", "could", "should", "tell", "show", "find",
]);

const W_LABEL = 3.0;
const W_ID = 2.0;
const W_INFO = 1.5;
const W_VAULT = 1.0;
const MAX_QUERY_TOKENS = 8;

/**
 * L11 = filesystem leaves (raw file nodes) — they flood any query whose
 * keywords appear in a filename. The semantic layers (L0..L10) are what
 * future Claude actually needs. L9 (fs root) is similarly low-signal.
 */
const EXCLUDED_LAYERS = new Set(["L9", "L11"]);

// Process-wide cache (this script is invoked by the harness as a one-shot
// per UserPromptSubmit, so cache lives only for the current event — that's
// fine because the disk mtime check below would force a reload anyway).
let cachedMtime = 0;
let cachedNodes = null;
let cachedInverted = null;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  const trimmed = text.length > MAX_PROMPT_LEN
    ? text.slice(0, MAX_PROMPT_LEN).replace(/\S+$/u, "")
    : text;
  const cleaned = trimmed
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s]/gu, " ");
  const seen = new Set();
  const out = [];
  for (const tok of cleaned.split(/\s+/)) {
    if (tok.length < 3) continue;
    if (STOPWORDS.has(tok)) continue;
    if (seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
    if (out.length >= MAX_QUERY_TOKENS) break;
  }
  return out;
}

function entryName(entry) {
  try {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") {
      if (typeof entry.name === "string") return entry.name;
      if (typeof entry.path === "string") return entry.path;
    }
  } catch { /* fall through */ }
  return "";
}

function loadGraph() {
  if (!existsSync(GRAPH_PATH)) return null;
  let stat;
  try { stat = statSync(GRAPH_PATH); } catch { return null; }
  if (cachedNodes && cachedMtime === stat.mtimeMs) {
    return { nodes: cachedNodes, inverted: cachedInverted };
  }
  let raw;
  try { raw = JSON.parse(readFileSync(GRAPH_PATH, "utf8")); }
  catch { return null; }
  if (!raw || !Array.isArray(raw.nodes)) return null;

  const nodes = raw.nodes;
  const inverted = new Map();
  for (const n of nodes) {
    if (!n || typeof n.id !== "string") continue;
    const wikiNames = (n.knowledge?.wikiEntries ?? []).map(entryName).join(" ");
    const memNames = (n.knowledge?.memoryEntries ?? []).map(entryName).join(" ");
    const blob = `${n.id} ${n.label ?? ""} ${n.info ?? ""} ${wikiNames} ${memNames}`;
    for (const tok of tokenize(blob)) {
      let bucket = inverted.get(tok);
      if (!bucket) { bucket = new Set(); inverted.set(tok, bucket); }
      bucket.add(n.id);
    }
  }
  cachedNodes = nodes;
  cachedInverted = inverted;
  cachedMtime = stat.mtimeMs;
  return { nodes, inverted };
}

function searchHits(graph, queryTokens) {
  if (!graph || queryTokens.length === 0) return [];
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const candidates = new Map();
  for (const tok of queryTokens) {
    const bucket = graph.inverted.get(tok);
    if (!bucket) continue;
    for (const nodeId of bucket) {
      const node = nodeById.get(nodeId);
      if (!node) continue;
      const idLower = node.id.toLowerCase();
      const labelLower = (node.label ?? "").toLowerCase();
      const infoLower = (node.info ?? "").toLowerCase();
      const wikiBlob = (node.knowledge?.wikiEntries ?? [])
        .map(entryName).join(" ").toLowerCase();
      const memBlob = (node.knowledge?.memoryEntries ?? [])
        .map(entryName).join(" ").toLowerCase();
      let s = 0;
      if (labelLower.includes(tok)) s += W_LABEL;
      if (idLower.includes(tok)) s += W_ID;
      if (infoLower.includes(tok)) s += W_INFO;
      if (wikiBlob.includes(tok) || memBlob.includes(tok)) s += W_VAULT;
      if (s > 0) candidates.set(nodeId, (candidates.get(nodeId) ?? 0) + s);
    }
  }
  const ranked = [...candidates.entries()]
    .map(([id, score]) => {
      const node = nodeById.get(id);
      return {
        id,
        score,
        layer: node.layer || "?",
        label: (node.label || id).split("\n")[0].slice(0, 80),
        status: node.status || "?",
        wiki: (node.knowledge?.wikiEntries ?? []).map(entryName).filter(Boolean).slice(0, 3),
        memory: (node.knowledge?.memoryEntries ?? []).map(entryName).filter(Boolean).slice(0, 2),
      };
    })
    // Drop low-signal layers — keeps the digest semantically dense.
    .filter((h) => !EXCLUDED_LAYERS.has(h.layer))
    .sort((a, b) => b.score - a.score);

  // Dedup by label — many filesystem leaves share filenames across dirs.
  const seenLabels = new Set();
  const deduped = [];
  for (const h of ranked) {
    const key = h.label.toLowerCase();
    if (seenLabels.has(key)) continue;
    seenLabels.add(key);
    deduped.push(h);
    if (deduped.length >= TOP_K) break;
  }
  return deduped;
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

  const tokens = tokenize(prompt);
  if (tokens.length < MIN_PROMPT_TOKENS) { process.exit(0); }

  const graph = loadGraph();
  if (!graph) { process.exit(0); }

  const hits = searchHits(graph, tokens);
  if (hits.length === 0) { process.exit(0); }

  // Render compact reminder block — keep it under ~1KB to avoid
  // dominating context. Each line: layer / label / wiki[0] / memory[0].
  const lines = hits.map((h) => {
    const w = h.wiki.length > 0 ? `  wiki: ${h.wiki.slice(0, 2).join(", ")}` : "";
    const m = h.memory.length > 0 ? `  mem: ${h.memory.slice(0, 1).join(", ")}` : "";
    return `  • [${h.layer}/${h.status}] ${h.label}${w ? "\n   " + w : ""}${m ? "\n   " + m : ""}`;
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
