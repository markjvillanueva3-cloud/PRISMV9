// scripts/lib/vault-hints.mjs
// SUBSTRATE-UTIL Gap 6 (2026-06-29, slot:sierra) -- cycle-free LEAF lib that grounds
// ONE-SHOT model calls (ask-ollama / ask-hermes) in the Obsidian memory vault.
//
// WHY A LEAF (not the bridge): ask-ollama / ask-hermes are blind on the vault substrate
// (audit matrix: Ollama-vault POOR, Hermes-vault NONE). The natural home for a shared
// helper is ollama-prism-bridge.mjs (it has scoreLeafFilenames + listObsidianMemoryFiles)
// -- BUT the bridge statically imports ask-ollama.mjs (bridge.mjs:60-66), so ask-ollama
// importing the bridge is a real cycle (bridge.mjs:69 forbids it; they moved the MCP
// client to a leaf for exactly this reason). This leaf has ZERO repo imports (node stdlib
// only), so ask-ollama, ask-hermes, AND the bridge can all depend on it cycle-free.
//
// R7 RELATIONSHIP (surfaced, not hidden): the memory-file walk + filename score below are
// a FOCUSED, purpose-built subset for one-shot grounding -- NOT the bridge's richer
// listObsidianMemoryFiles / scoreLeafFilenames (those carry wiki-leaf scanning, per-process
// caches, and injectable readdir/stat for the agent-loop's obsidian_lookup TOOL). FOLLOW-UP
// (queued, SUBSTRATE-UTILIZATION-AUDIT spec): make the bridge re-export these from this leaf
// to retire the bridge's copies (blocked today by OBSIDIAN_* constants used in 6 other
// bridge sites -- a careful refactor for a fresh window, not a near-limit one).
//
// Pure + fail-soft throughout (R12): a missing/unreadable vault never throws into a model
// call -- it yields an empty result so the caller injects nothing.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", ".."); // scripts/lib -> repo root

const MEMORIES_DIR_REL = join("knowledge", "memories");
const MAX_DEPTH = 5;
// Index/pointer files (not memory CONTENT) -- surfacing them as grounding is noise.
const EXCLUDED_BASENAMES = new Set(["MEMORY.md", "MEMORY-ARCHIVE.md"]);
const MIN_TOKEN_LEN = 3; // matches the bridge's WIKI_MIN_TOKEN_LEN
const DEFAULT_TOP_N = 3;
const DEFAULT_EXCERPT_CHARS = 280;

/**
 * Tokenize a query the same way the obsidian/wiki lookups do: lowercase, split on
 * non-alphanumeric, keep tokens >= MIN_TOKEN_LEN. Returns [] for empty/short input.
 * @param {string} query
 * @returns {string[]}
 */
export function tokenizeQuery(query, minLen = MIN_TOKEN_LEN) {
  return String(query == null ? "" : query)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= minLen);
}

/**
 * Walk knowledge/memories/ for *.md memory files (focused: no wiki leaves, no cache --
 * a one-shot CLI call does not benefit from a per-process cache). Excludes `_*.md`
 * (stats/index convention) and the two top-level pointer indexes. Fail-soft: returns []
 * on any fs error so grounding degrades to "no hints", never a throw.
 * @returns {Array<{relPath:string, basename:string}>}
 */
export function listMemoryFiles({ root = REPO_ROOT, readdirImpl, statImpl } = {}) {
  const readdir = readdirImpl || ((p) => readdirSync(p, { withFileTypes: true }));
  const stat = statImpl || ((p) => statSync(p));
  const startAbs = join(root, MEMORIES_DIR_REL);
  const out = [];
  const seen = new Set();
  try {
    if (!stat(startAbs).isDirectory()) return [];
  } catch {
    return [];
  }
  const walk = (absDir, depth) => {
    if (depth > MAX_DEPTH || seen.has(absDir)) return;
    seen.add(absDir);
    let entries;
    try { entries = readdir(absDir); } catch { return; }
    for (const ent of entries) {
      if (!ent || typeof ent.name !== "string") continue;
      const abs = join(absDir, ent.name);
      if (ent.isDirectory && ent.isDirectory()) { walk(abs, depth + 1); continue; }
      if (!(ent.isFile && ent.isFile())) continue;
      if (!ent.name.endsWith(".md")) continue;
      if (ent.name.startsWith("_")) continue;
      if (EXCLUDED_BASENAMES.has(ent.name)) continue;
      out.push({ relPath: relative(root, abs).split(/[\\/]+/).join("/"), basename: ent.name });
    }
  };
  walk(startAbs, 0);
  return out;
}

/**
 * Score memory files by how many query tokens their (lowercased, .md-stripped) BASENAME
 * contains. Returns the matches sorted strongest-first. Filename-only (cheap) -- the
 * excerpt read in getVaultHints supplies the actual grounding content.
 * @returns {Array<{relPath:string, score:number}>}
 */
export function scoreByFilename(files, tokens) {
  if (!Array.isArray(files) || !Array.isArray(tokens) || tokens.length === 0) return [];
  const out = [];
  for (const f of files) {
    if (!f || typeof f.basename !== "string") continue;
    const stem = f.basename.toLowerCase().replace(/\.md$/, "");
    let score = 0;
    for (const t of tokens) if (t && stem.includes(t)) score += 1;
    if (score > 0) out.push({ relPath: f.relPath, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/**
 * getVaultHints: top-N memory files whose filename tokens overlap the query, each with a
 * frontmatter-stripped content EXCERPT. The excerpt (not just the filename) is what grounds
 * a ONE-SHOT model call -- the model cannot open files itself, so the content must be inline.
 * Pure + fail-soft: [] on empty/short query, no match, or fs error.
 * @returns {Array<{relPath:string, score:number, excerpt:string}>}
 */
export function getVaultHints(query, {
  root = REPO_ROOT,
  topN = DEFAULT_TOP_N,
  excerptChars = DEFAULT_EXCERPT_CHARS,
  readImpl,
  listImpl,
} = {}) {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];
  const n = Number.isFinite(topN) ? Math.max(0, Math.floor(topN)) : DEFAULT_TOP_N;
  if (n === 0) return [];
  const files = (listImpl || listMemoryFiles)({ root });
  const scored = scoreByFilename(files, tokens).slice(0, n);
  if (scored.length === 0) return [];
  const read = readImpl || ((p) => readFileSync(p, "utf8"));
  const cap = Number.isFinite(excerptChars) ? Math.max(0, Math.floor(excerptChars)) : DEFAULT_EXCERPT_CHARS;
  return scored.map((s) => {
    let excerpt = "";
    try {
      excerpt = String(read(join(root, s.relPath)))
        .replace(/^﻿?---[\s\S]*?\n---\s*/, "") // strip a leading YAML frontmatter block
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, cap);
    } catch { /* fail-soft per file: a missing/unreadable note yields an empty excerpt */ }
    return { relPath: s.relPath, score: s.score, excerpt };
  });
}

/**
 * Render getVaultHints() output as a compact markdown block to PREPEND to a one-shot
 * prompt, or "" when there are no hints (so a no-match injects nothing). Shared by
 * ask-ollama + ask-hermes so both channels ground identically (R7 single render path).
 * @returns {string}
 */
export function formatVaultHintsBlock(hints, {
  label = "Relevant PRISM memory (ground your answer in these; do NOT invent engine/file names)",
} = {}) {
  if (!Array.isArray(hints) || hints.length === 0) return "";
  const lines = hints.map((h) => `- ${h.relPath}${h && h.excerpt ? `: ${h.excerpt}` : ""}`);
  return `## ${label}\n${lines.join("\n")}\n\n`;
}
