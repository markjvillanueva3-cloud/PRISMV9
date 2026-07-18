#!/usr/bin/env node
// tier: T2
/**
 * ghost-roost-inject.mjs -- UserPromptSubmit injector
 *
 * Closes the graph-x-cli gap (substrate-util w0yjhqcp9): when a prompt
 * names a GALAXY/DOMAIN keyword but contains NO explicit system-viz node id,
 * the node-card-prefetch hook does not fire (it only triggers on dotted ids
 * like `eng.mill`). This hook bridges that gap: detect a galaxy keyword,
 * run `system-viz-query.mjs find <keyword>`, and inject the top-3 ghost-roost /
 * node hits as additionalContext so the model arrives with graph topology
 * already resolved -- zero tool call needed.
 *
 * OPT-IN -- default OFF (per-prompt fleet cost):
 *   PRISM_GHOST_ROOST_INJECT=1   enable
 *
 * CHEAP-WHEN-IRRELEVANT: the common case (no galaxy keyword) costs only a
 * Set lookup + substring scan over the prompt (~0ms) -- the find subprocess is
 * spawned ONLY when a keyword is matched. A keyword match in the middle of a
 * longer word (e.g. "prelathework") is suppressed by a word-boundary check
 * so the hit rate stays meaningful.
 *
 * Fail-soft: ANY error / timeout / empty results -> exit 0, no output, never
 * blocks a prompt. Mirrors the fail-soft discipline of node-card-prefetch-inject.
 *
 * Tune K: PRISM_GHOST_ROOST_K=<n> (default 3, max 8)
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

const ENABLED = process.env.PRISM_GHOST_ROOST_INJECT === "1";

function clampInt(raw, fallback, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

const MAX_HITS = clampInt(process.env.PRISM_GHOST_ROOST_K, 3, 1, 8);

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const FIND_SCRIPT = join(REPO_ROOT, "scripts", "system-viz-query.mjs");

// --------------------------------------------------------------------------
// Galaxy keyword table
// Derived from state/shared/CHAT-SLOT-DOMAINS.md + galaxy brain back-pointers
// in MEMORY.md. Kept as a flat array of lowercase tokens; matching uses whole-
// word boundary check so "lathe" does not fire on "prelathework".
// Extend deliberately -- each entry is one more class of prompts that pays the
// find subprocess cost per prompt (when enabled).
// --------------------------------------------------------------------------

export const GALAXY_KEYWORDS = Object.freeze([
  // Core manufacturing domains (slot designations)
  "mill", "milling",
  "lathe", "turning",
  "wedm", "wire-edm", "wire edm",
  "cam",
  "cad",
  "quoting",
  "business",
  "post-processor", "post processor", "postprocessor",
  "speed-feed", "speed feed", "speedfeed",
  "academy",
  "system-viz", "system viz", "systemviz",
  "blueprint",
  "fleet-hygiene", "fleet hygiene",
  "ai-training", "ai training",
  "frontend",
  "database",
  // Additional galaxies from galaxy brain index
  "wiring",
  "discovery",
  "compliance",
  "quality",
  "shop-floor", "shop floor",
  "knowledge-conversion", "knowledge conversion",
  "corpus",
  "tribal",
  "agent-orchestration", "agent orchestration",
  "blueprint-vision", "blueprint vision",
  "database-expansion", "database expansion",
  "cad-fusion", "cad fusion",
  "hermes",
  "zulu",
]);

// Build a lookup Set of single-word keywords (no spaces) for O(1) whole-word
// check, and a separate list of multi-word phrases for substring scan.
const _singleWords = new Set();
const _phrases = [];
for (const kw of GALAXY_KEYWORDS) {
  if (kw.includes(" ") || kw.includes("-")) {
    _phrases.push(kw);
  } else {
    _singleWords.add(kw);
  }
}

/**
 * Detect the first galaxy keyword in a prompt.
 * Returns the matched keyword string, or null if none found.
 * Uses whole-word boundary for single-word keywords so "cam" does not fire
 * on "camera" or "camping". Multi-word phrases use simple substring.
 * Pure -- exported for tests.
 *
 * @param {string} prompt
 * @returns {string|null}
 */
export function detectGalaxyKeyword(prompt) {
  if (typeof prompt !== "string" || !prompt) return null;
  const lower = prompt.toLowerCase();

  // Single-word keywords: whole-word boundary (non-alphanumeric/underscore on both sides).
  // We scan each word token in the prompt rather than iterating the keyword set to keep
  // complexity O(n_words) -- the prompt is far shorter than the keyword set.
  // We use a regex word-boundary split: split on non-alphanum-underscore.
  // Exception: hyphenated single tokens like "post-processor" are in _phrases, not here.
  const tokens = lower.split(/[^a-z0-9_]+/);
  for (const tok of tokens) {
    if (!tok) continue;
    if (_singleWords.has(tok)) return tok;
  }

  // Multi-word / hyphenated phrases: simple substring (they contain a separator so
  // false-positive collision risk is low).
  for (const phrase of _phrases) {
    if (lower.includes(phrase)) return phrase;
  }

  return null;
}

/**
 * Alias: detectGalaxyKeywords(prompt) -> string[] (list of matched keywords).
 * Returns an array with at most the first matched keyword, for backward compat
 * and to give tests a list-based API surface without needing a second export.
 * Pure -- exported for tests.
 *
 * @param {string} prompt
 * @returns {string[]}
 */
export function detectGalaxyKeywords(prompt) {
  const kw = detectGalaxyKeyword(prompt);
  return kw ? [kw] : [];
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function readStdinSync() {
  try { return readFileSync(0, "utf8"); }
  catch { return ""; }
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  }));
}

/**
 * Parse the human-readable output lines from `system-viz-query.mjs find`.
 * Format per system-viz-query.mjs line ~82:
 *   "  L6/_  id.padEnd(28)  label [docs:N]"
 * Returns array of {layer, id, label, docs} objects. At most MAX_HITS.
 * Pure -- exported for tests.
 *
 * @param {string} raw  stdout from the find command
 * @param {number} limit
 * @returns {Array<{layer:string,id:string,label:string,docs:number}>}
 */
export function parseFindOutput(raw, limit) {
  const out = [];
  if (typeof raw !== "string" || !raw) return out;
  const lim = Number.isFinite(limit) ? limit : MAX_HITS;
  for (const line of raw.split("\n")) {
    if (out.length >= lim) break;
    // Skip header lines ("Found N node(s)..." or blank)
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("Found ")) continue;
    // Each hit line starts with spaces then "L<n>/<subgroup>  <id>  <label>"
    // We parse by stripping the leading spaces and splitting on runs of 2+ spaces.
    const parts = trimmed.split(/\s{2,}/);
    if (parts.length < 2) continue;
    const layerPart = parts[0]; // e.g. "L6/_" or "L8/built"
    const idPart = parts[1] ? parts[1].trim() : "";
    const rest = parts.slice(2).join("  ").trim();
    // Parse optional [docs:N] suffix from rest
    const docsMatch = rest.match(/\[docs:(\d+)\]\s*$/);
    const docs = docsMatch ? parseInt(docsMatch[1], 10) : 0;
    const label = docsMatch ? rest.slice(0, docsMatch.index).trim() : rest;
    if (!idPart) continue;
    out.push({ layer: layerPart, id: idPart, label: label || idPart, docs });
  }
  return out;
}

/**
 * Run system-viz-query find for a keyword, parse results, return additionalContext
 * string or null. Fail-soft on all errors (timeout, parse, etc.).
 *
 * @param {string} keyword
 * @returns {string|null}
 */
export function buildGhostRoostContext(keyword) {
  if (!keyword || typeof keyword !== "string") return null;
  let raw = "";
  try {
    const result = spawnSync(process.execPath, [FIND_SCRIPT, "find", keyword], {
      timeout: 3000,
      windowsHide: true,
      encoding: "utf8",
      // No cwd override -- FIND_SCRIPT uses its own __dirname for REPO_ROOT
    });
    if (result.status !== 0 && result.status !== null) return null;
    if (result.error) return null; // timeout or spawn error
    raw = result.stdout || "";
  } catch {
    return null;
  }

  let hits;
  try {
    hits = parseFindOutput(raw, MAX_HITS);
  } catch {
    return null;
  }
  if (!hits || hits.length === 0) return null;

  const lines = hits.map((h) => {
    const docsTag = h.docs > 0 ? ` [docs:${h.docs}]` : "";
    return `  - [${h.layer}] \`${h.id}\` -- ${h.label}${docsTag}`;
  });

  return (
    `## Graph topology -- ghost-roost / node hits for "${keyword}" (top ${hits.length})\n` +
    `_Prefetched by ghost-roost-inject (PRISM_GHOST_ROOST_INJECT=1). ` +
    `Use these ids with \`node-card\` / \`prism_session:master_index_query\` ` +
    `instead of re-searching. Disable: PRISM_GHOST_ROOST_INJECT=0._\n` +
    lines.join("\n")
  );
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
  if (!prompt || prompt.length < 3) { process.exit(0); }

  let keyword = null;
  try { keyword = detectGalaxyKeyword(prompt); }
  catch { process.exit(0); }
  if (!keyword) { process.exit(0); }

  let ctx = null;
  try { ctx = buildGhostRoostContext(keyword); }
  catch { process.exit(0); }

  if (ctx) emit(ctx);
  process.exit(0);
}

// Run as a hook only when invoked directly (not when imported by a test).
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
