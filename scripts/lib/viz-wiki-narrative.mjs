/**
 * viz-wiki-narrative.mjs -- pure helpers for the viz->wiki narrative enrichment.
 *
 * The viz->wiki generators (generate-{layer,domain,dispatcher}-wiki.mjs) emit
 * entries whose bodies are 100% procedural field-dumps (counts, tables, Mermaid)
 * with NO prose explaining what the layer/domain/dispatcher IS or WHY it exists.
 * U-VIZ-WIKI-NARRATIVE (OLLAMA-SYNERGY backlog #1, sierra) adds a 1-2 sentence
 * "what/why" narrative generated LOCALLY (qwen2.5-coder:32b via the reused
 * generateBlurb from contextual-blurb.mjs) -- $0-Claude, never-Claude CREATION
 * that lifts search recall on PRISM's own canonical wiki tier.
 *
 * This module is PURE (no FS, no network, no Date) so the marker/inject logic is
 * trivially testable and idempotent. The async generation + caching + file I/O
 * live in the standalone post-pass scripts/generate-viz-wiki-narrative.mjs, which
 * is flag-gated (PRISM_VIZ_WIKI_NARRATIVE=1) so the every-commit regen hot path is
 * unchanged by default. The block is bracketed by HTML-comment markers (mirroring
 * the generators' own AUTO-START/END convention) so it is detected + replaced
 * deterministically, never duplicated.
 */

import { createHash } from "node:crypto";

// Distinct from the generators' AUTO-START/END markers so the two never collide.
export const NARRATIVE_START = "<!-- viz-narrative:start (local-llm) -->";
export const NARRATIVE_END = "<!-- viz-narrative:end -->";

// Cap the content we hand the local model -- the entry bodies are small, but a
// few dispatcher pages are large; 4000 chars is plenty to situate a "what/why".
export const DEFAULT_MAX_CONTENT_CHARS = 4000;

/**
 * Split a markdown doc into its YAML frontmatter block (incl. the closing `---`
 * and trailing newline) and the remaining body. If there is no leading `---`
 * frontmatter, `frontmatter` is "" and `body` is the whole input.
 * @param {string} md
 * @returns {{frontmatter:string, body:string}}
 */
export function splitFrontmatter(md) {
  const s = typeof md === "string" ? md : "";
  if (!s.startsWith("---")) return { frontmatter: "", body: s };
  // match the SECOND `---` line that closes the frontmatter
  const m = s.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!m) return { frontmatter: "", body: s };
  return { frontmatter: m[0], body: s.slice(m[0].length) };
}

/**
 * Remove any existing narrative block (markers inclusive, plus one trailing
 * blank line if present) from a doc. Idempotent + safe when no block exists.
 * Removes EVERY complete start->end span (so duplicated blocks all go). A start
 * marker with NO matching end is left as-is -- atomic writes make a torn block
 * near-impossible, and a half-marker is safer left visible than greedily eaten.
 * @param {string} md
 * @returns {string}
 */
export function stripNarrative(md) {
  const s = typeof md === "string" ? md : "";
  if (!s.includes(NARRATIVE_START)) return s;
  const startEsc = NARRATIVE_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const endEsc = NARRATIVE_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // start marker -> end marker (non-greedy), plus optional trailing blank line.
  const re = new RegExp(`${startEsc}[\\s\\S]*?${endEsc}\\r?\\n?\\r?\\n?`, "g");
  return s.replace(re, "");
}

/**
 * Build the narrative block markdown for a blurb. Returns "" for an empty/blank
 * blurb (caller then strips any stale block and writes nothing new).
 * @param {string} blurb
 * @returns {string}
 */
export function narrativeBlock(blurb) {
  const b = typeof blurb === "string" ? blurb.trim() : "";
  if (!b) return "";
  return `${NARRATIVE_START}\n> **In brief:** ${b}\n${NARRATIVE_END}\n\n`;
}

/**
 * Idempotently inject (or replace, or with an empty blurb remove) the narrative
 * block right after the frontmatter. Calling twice with the same blurb yields the
 * same output (the old block is stripped first). An empty blurb leaves the doc
 * with no narrative block (stale block removed) -- a safe no-op when none existed.
 * @param {string} md
 * @param {string} blurb
 * @returns {string}
 */
export function injectNarrative(md, blurb) {
  const stripped = stripNarrative(md);
  const block = narrativeBlock(blurb);
  if (!block) return stripped; // empty blurb -> just ensure no stale block remains
  const { frontmatter, body } = splitFrontmatter(stripped);
  return frontmatter + block + body;
}

/** True iff the doc already carries a narrative block. */
export function hasNarrative(md) {
  return typeof md === "string" && md.includes(NARRATIVE_START);
}

/**
 * Extract the text to hand the local model: the body with frontmatter and any
 * existing narrative block removed, capped at maxChars. Frontmatter is dropped
 * because it is mechanical metadata, not content to situate.
 * @param {string} md
 * @param {{maxContentChars?:number}} [opts]
 * @returns {string}
 */
export function extractContent(md, opts = {}) {
  const maxChars = Number.isFinite(opts.maxContentChars) && opts.maxContentChars > 0
    ? Math.trunc(opts.maxContentChars) : DEFAULT_MAX_CONTENT_CHARS;
  const { body } = splitFrontmatter(stripNarrative(md));
  return body.trim().slice(0, maxChars);
}

/**
 * Deterministic content fingerprint for cache invalidation -- re-narrate only when
 * the (narrative-stripped) content changes, not on every regen.
 * @param {string} content
 * @returns {string} sha1 hex (16 chars)
 */
export function contentHash(content) {
  return createHash("sha1").update(typeof content === "string" ? content : "").digest("hex").slice(0, 16);
}
