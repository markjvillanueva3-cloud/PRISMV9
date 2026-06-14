#!/usr/bin/env node
// source-chain-lib.mjs — fail-soft .mjs mirror of SourceChainEngine's pure core,
// for the RETRIEVAL / INJECT path (hooks + scripts that cannot import the TS engine).
//
// WHY A MIRROR (not import the engine): SourceChainEngine.ts lives in
// mcp-server/src/engines/ and pulls in TypeScript + Zod + node:crypto. The
// per-prompt knowledge-inject hooks in .claude/hooks/ run as bare .mjs with NO
// build step and cannot import it. This lib re-implements ONLY the pure,
// deterministic primitives (digest / renderMarkdown / decorate / Citation shape)
// so retrieval hits can self-describe their provenance inline — "[src: <type>:
// <node-id>]" — at the exact point the model reads them. (Same mirror-pattern as
// master-index-search-lib.mjs mirroring the in-hook BM25.)
//
// DRIFT LOCK (R7 — "two brains that disagree" IS the failure mode): the vitest
// parity test mcp-server/src/__tests__/sourceChainLibParity.test.ts asserts this
// lib's digest() + renderMarkdown() + decorate() are BYTE-IDENTICAL to the TS
// SourceChainEngine for shared citation fixtures. Change one side without the
// other and that test goes red.
//
// DELIBERATE, DOCUMENTED DIVERGENCE: the TS engine THROWS on an invalid citation
// (engine-grade, Zod .parse). This lib is HOOK-GRADE and must NEVER crash a
// prompt, so normalizeCitation() FAILS SOFT — an invalid citation is normalized
// and flagged `provenance:"unverified"`, never thrown. Parity is asserted only
// for VALID inputs (where both sides produce identical output); invalid-input
// behavior intentionally differs and is covered by THIS lib's own tests.
//
// Pure + I/O-free + dependency-light (only node:crypto). ADDITIVE: callers opt in
// by calling decorateHits() / renderHitProvenance(); the search libs themselves
// are untouched, so the per-prompt hot path keeps its exact existing behavior and
// shape (zero regression risk to the fleet). Knob: PRISM_SOURCE_CHAIN_DISABLE=1
// makes decorateHits() a pass-through.
//
// @module source-chain-lib

import { createHash } from "node:crypto";

// Mirrors SourceChainEngine.CitationSchema source_type enum EXACTLY. A change
// here without the TS side is caught by the parity test's source_type fixtures.
export const CITATION_SOURCE_TYPES = Object.freeze([
  "wiki", "memory", "tribal", "engine", "dispatcher", "external",
]);
const SOURCE_TYPE_SET = new Set(CITATION_SOURCE_TYPES);

// ----------------------------------------------------------------------------
// PURE PARITY PRIMITIVES — must stay byte-identical to SourceChainEngine.*
// ----------------------------------------------------------------------------

/**
 * Deterministic SHA-256 digest of a citation set. Order-independent: citations
 * are sorted by `path` before hashing, and only {path, source_type, score} are
 * canonicalized (score defaulting to null) — IDENTICAL to
 * SourceChainEngine.digest. Same citations → same digest (cache key + audit id).
 *
 * @param {Array<{path?:string, source_type?:string, score?:number}>} citations
 * @returns {string} 64-char hex sha256
 */
export function digest(citations) {
  const list = Array.isArray(citations) ? citations : [];
  const sorted = [...list].sort((a, b) => String(a?.path).localeCompare(String(b?.path)));
  const canonical = JSON.stringify(
    sorted.map((c) => ({
      path: c?.path,
      source_type: c?.source_type,
      score: c?.score ?? null,
    })),
  );
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Render a citation chain as operator-visible markdown — IDENTICAL output to
 * SourceChainEngine.renderMarkdown (empty → "_(no sources cited)_", the
 * "**Sources:**" header, the `- [type] \`path\` (score=x.xxx) — used_for` line
 * shape).
 *
 * @param {Array<{path?:string, source_type?:string, score?:number, used_for?:string}>} citations
 * @returns {string}
 */
export function renderMarkdown(citations) {
  const list = Array.isArray(citations) ? citations : [];
  if (list.length === 0) return "_(no sources cited)_";
  const lines = ["**Sources:**"];
  for (const c of list) {
    // Number.isFinite is a fail-soft SUPERSET of the TS engine's bare
    // `typeof === "number"` guard: byte-identical for VALID citations (the TS
    // CitationSchema refines score to a finite [0,1], so a valid score is always
    // finite) while never emitting "NaN"/"Infinity" garbage if a raw,
    // un-normalized score reaches this exported primitive directly.
    const scoreStr = (typeof c?.score === "number" && Number.isFinite(c.score))
      ? ` (score=${c.score.toFixed(3)})`
      : "";
    const usedFor = c?.used_for ? ` — ${c.used_for}` : "";
    lines.push(`- [${c?.source_type}] \`${c?.path}\`${scoreStr}${usedFor}`);
  }
  return lines.join("\n");
}

/**
 * Decorate a value with a citation chain. Fail-soft mirror of
 * SourceChainEngine.decorate: where the TS engine validates-and-throws, this
 * NORMALIZES each citation (never throws). For VALID citations the output is
 * identical (same sources, same digest) — the parity test asserts exactly that.
 *
 * @template T
 * @param {T} value
 * @param {readonly object[]} citations
 * @returns {{ value: T, sources: object[], digest: string }}
 */
export function decorate(value, citations) {
  const list = Array.isArray(citations) ? citations : [];
  const sources = list.map((c) => normalizeCitation(c));
  return { value, sources, digest: digest(sources) };
}

// ----------------------------------------------------------------------------
// FAIL-SOFT CITATION NORMALIZER (hook-grade — the divergence from the TS engine)
// ----------------------------------------------------------------------------

/**
 * Normalize an arbitrary object into a valid-shaped Citation WITHOUT throwing.
 * Invalid path or source_type → safe defaults + a `provenance:"unverified"`
 * marker so a downstream consumer can tell a real citation from a salvaged one.
 * A VALID citation round-trips unchanged on the parity-relevant fields
 * (path/source_type/score/used_for), so digest + renderMarkdown match the TS
 * engine. Optional fields are clamped to the TS schema's max lengths.
 *
 * @param {object} c
 * @param {object} [opts]
 * @param {string} [opts.now] — ISO timestamp injected for deterministic tests
 * @returns {object} citation
 */
export function normalizeCitation(c, opts = {}) {
  const hasPath = !!(c && typeof c.path === "string" && c.path.length > 0);
  const hasType = !!(c && SOURCE_TYPE_SET.has(c.source_type));
  const out = {
    path: hasPath ? c.path : "(unknown)",
    source_type: hasType ? c.source_type : "external",
    retrieved_at: (c && typeof c.retrieved_at === "string" && c.retrieved_at.length > 0)
      ? c.retrieved_at
      : (opts.now || new Date().toISOString()),
  };
  // score: optional, must be a finite number in [0,1] (else dropped — never a
  // fabricated value). Matches the TS CitationSchema refine.
  if (c && typeof c.score === "number" && Number.isFinite(c.score) && c.score >= 0 && c.score <= 1) {
    out.score = c.score;
  }
  if (c && typeof c.used_for === "string" && c.used_for.length > 0) {
    out.used_for = c.used_for.slice(0, 200);
  }
  if (c && typeof c.excerpt === "string" && c.excerpt.length > 0) {
    out.excerpt = c.excerpt.slice(0, 500);
  }
  if (!(hasPath && hasType)) out.provenance = "unverified";
  return out;
}

// ----------------------------------------------------------------------------
// HIT → CITATION (per retrieval-corpus shape) + ADDITIVE DECORATION
// ----------------------------------------------------------------------------

// master-index graph hits carry the node id; the id PREFIX is the cheapest
// honest source_type signal. Anything outside the Citation taxonomy (skill /
// formula / ghost / fs node) maps to "external" — the full id is preserved in
// `path`, so no provenance is lost, only the coarse bucket is approximate.
function graphHitSourceType(hit) {
  const id = String(hit?.id || "").toLowerCase();
  // Live system-graph node-ids use COMPOUND namespaces (verified against the
  // graph: `vault.wiki.*`, `vault.mem.*`, `memory_*`, `ghost.*`), not just bare
  // tokens — match the real shapes so the source_type bucket is honest. The full
  // id is always preserved in `path`, so the "external" fallback (e.g. ghost
  // roosts, fs/pipeline nodes — none of which are a citation source) loses no
  // provenance, only approximates the coarse bucket.
  if (id.startsWith("eng")) return "engine";
  if (id.startsWith("disp")) return "dispatcher";
  if (id.startsWith("wiki") || id.startsWith("vault.wiki")) return "wiki";
  if (id.startsWith("memory") || id.startsWith("vault.mem")) return "memory";
  if (id.startsWith("tribal")) return "tribal";
  return "external";
}

/**
 * Build a Citation from a master-index graph hit ({id, layer, label, ...}).
 * @param {object} hit
 * @param {{surface?:string, now?:string}} [opts]
 */
export function citeGraphHit(hit, opts = {}) {
  return normalizeCitation({
    path: hit?.id,
    source_type: graphHitSourceType(hit),
    used_for: opts.surface,
  }, opts);
}

/**
 * Build a Citation from a tribal hit ({id, source, domain, title, path, ...}).
 * @param {object} hit
 * @param {{surface?:string, now?:string}} [opts]
 */
export function citeTribalHit(hit, opts = {}) {
  return normalizeCitation({
    path: (hit && typeof hit.path === "string" && hit.path.length > 0) ? hit.path : hit?.id,
    source_type: "tribal",
    used_for: opts.surface,
  }, opts);
}

/**
 * Build a Citation from a memory hit ({name, fileName, namespace, ...}). The
 * canonical memo path is `<namespace>/<fileName>`.
 * @param {object} hit
 * @param {{surface?:string, now?:string}} [opts]
 */
export function citeMemoryHit(hit, opts = {}) {
  const ns = hit?.namespace;
  // Canonical memory identity is the SLUG (fileName minus .md), matching
  // memory-index-search-lib.mjs recordKey() `${namespace}/${name}` — so the
  // cited path resolves to the same node id a consumer would look up. Prefer the
  // precomputed `name` slug; fall back to stripping .md off fileName.
  const slug = (hit && typeof hit.name === "string" && hit.name.length > 0)
    ? hit.name
    : (hit && typeof hit.fileName === "string" ? hit.fileName.replace(/\.md$/i, "") : undefined);
  const path = (ns && slug) ? `${ns}/${slug}` : (slug || hit?.fileName || hit?.name);
  return normalizeCitation({
    path,
    source_type: "memory",
    used_for: opts.surface,
  }, opts);
}

const CITERS = { graph: citeGraphHit, tribal: citeTribalHit, memory: citeMemoryHit };

/**
 * Return a NEW array of hits, each with an additive `sourceChain` Citation field
 * stamped from its OWN identity fields. The originals are never mutated (spread
 * into a fresh object), so concurrent decoration of a shared hit across the
 * 26-chat fleet can't corrupt it, and any caller-supplied `sourceChain` on the
 * input is OVERWRITTEN with the true, derived one (no spoofed provenance).
 *
 * Pass-through (returns hits unchanged) when PRISM_SOURCE_CHAIN_DISABLE=1 or the
 * `kind` is unknown — fail-soft, never throws.
 *
 * @param {object[]} hits
 * @param {"graph"|"tribal"|"memory"} kind
 * @param {{surface?:string, now?:string}} [opts]
 * @returns {object[]}
 */
export function decorateHits(hits, kind, opts = {}) {
  if (process.env.PRISM_SOURCE_CHAIN_DISABLE === "1") return Array.isArray(hits) ? hits : [];
  if (!Array.isArray(hits)) return [];
  const citer = CITERS[kind];
  if (!citer) return hits;
  return hits.map((h) => (h && typeof h === "object" ? { ...h, sourceChain: citer(h, opts) } : h));
}

/**
 * Compact inline provenance tag for inject-hook rendering — e.g.
 * "[src: memory:feedback/feedback_psn_definition.md]". Empty string when the hit
 * carries no `sourceChain` (so callers can unconditionally append it). An
 * `unverified` citation is marked so it never reads as a trustworthy source.
 *
 * @param {object} hit — a hit previously passed through decorateHits()
 * @returns {string}
 */
export function renderHitProvenance(hit) {
  const c = hit && hit.sourceChain;
  if (!c || typeof c !== "object") return "";
  const type = c.source_type || "external";
  const path = c.path || "(unknown)";
  const flag = c.provenance === "unverified" ? "?" : "";
  return `[src: ${type}:${path}${flag}]`;
}
