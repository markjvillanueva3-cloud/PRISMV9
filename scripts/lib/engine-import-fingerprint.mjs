#!/usr/bin/env node
/**
 * engine-import-fingerprint.mjs -- per-engine NON-ENGINE import-fingerprint extractor.
 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
 *
 * WHY: the GNN tier-5 text embeddings give 23/43 dispatcher-class separability
 * @ meanMargin 0.0527 (post action-surface). Adding more TEXT/action vocab is
 * exhausted (action-surface measured +0.0018, redundant --
 * [[reference_gnn_action_surface_insitu_measure_2026_06_21]]). The next lever must be
 * an INDEPENDENT structural signal. The engine->engine 1-hop adjacency is RULED OUT
 * (72% null, avg out-degree 0.62 --
 * [[reference_gnn_structural_feature_probe_2026_06_21]]). This lever: NON-ENGINE module
 * imports -- utility libs, physics-formula files, domain packages, internal paths --
 * everything EXCEPT paths containing /engines/. A calc engine imports
 * kinematics/material libs; a CAM engine imports gcode/toolpath libs. Coverage ~100%
 * (every engine imports something non-engine). Independent of description prose -- no
 * label appears in an import path.
 *
 * LEAK DISCIPLINE (india soul -- the fake-0.98 trap): import statements are a
 * structural property of the .ts file, written before/independent of which dispatcher
 * routes to it. An unwired ghost has the same imports it would have under any label. No
 * label appears in an import path. (Same .ts files engineSourceSignal already reads --
 * different section, different leak surface.)
 *
 * Pure-export contract (for tests): extractNonEngineImports, buildImportFingerprintMap,
 * buildImportIdfMap, importFingerprintText.
 *
 * Mirrors the style/contract of engine-action-surface.mjs (same slot, same session).
 */
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Path-normalisation helpers
// ---------------------------------------------------------------------------

/**
 * Normalize one raw import specifier to a short, refactor-stable token:
 *  1. Drop any path containing /engines/ (engine->engine adjacency; ruled out).
 *  2. Strip leading ./ and ../ (any depth).
 *  3. Strip .js, .ts, .mjs, .cjs, .mts, .cts suffix.
 *  4. Lowercase.
 *  5. Keep the last 1-2 path segments (refactor-stable: a rename of an intermediate
 *     dir does not change the token).
 * Returns "" for paths that should be suppressed.
 * Pure.
 *
 * @param {string} raw - raw specifier string (already unquoted)
 * @returns {string} normalized token, or "" to suppress
 */
function normalizePath(raw) {
  if (typeof raw !== "string" || !raw) return "";
  // Drop any path that routes through the engines tree -- the dead structural feature.
  if (raw.includes("/engines/")) return "";
  // Drop ./ ../ prefixes (any depth).
  const stripped = raw.replace(/^(?:\.\.?\/)+/, "");
  // Drop known source-extension suffixes.
  const noExt = stripped.replace(/\.(js|ts|mjs|cjs|mts|cts)$/, "");
  // Lowercase.
  const lower = noExt.toLowerCase();
  // Keep last 1-2 path segments for refactor-stability.
  const parts = lower.split("/").filter(Boolean);
  if (parts.length === 0) return "";
  return parts.slice(-2).join("/");
}

// ---------------------------------------------------------------------------
// extractNonEngineImports
// ---------------------------------------------------------------------------

// Static import: import ... from "..."
// Matches both single and double quoted specifiers.
// Uses a non-greedy [^'"]* inside the quote so it cannot span string boundaries.
const STATIC_IMPORT_RE = /\bimport\s[^;]*?from\s+(['"])([^'"]+)\1/g;

// Dynamic import: await import("...") or import("...")  -- also multiline
// The spec string is the first argument; we grab the literal inside the parens.
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g;

/**
 * Parse static `import ... from "..."` AND dynamic `await import("...")` from a
 * TypeScript source string. Drops any path containing /engines/. Normalizes each
 * surviving path: strip leading ./ ../, strip .js/.ts/.mjs suffix, lowercase, keep
 * last 1-2 path segments (refactor-stable). Non-string/empty src returns []. Pure.
 *
 * @param {string} src - TypeScript source text
 * @returns {string[]} normalized import-path tokens (may be empty)
 */
export function extractNonEngineImports(src) {
  if (typeof src !== "string" || !src) return [];
  const tokens = [];
  const seen = new Set();

  // Reset regex state (global regexes retain lastIndex).
  STATIC_IMPORT_RE.lastIndex = 0;
  DYNAMIC_IMPORT_RE.lastIndex = 0;

  let m;
  while ((m = STATIC_IMPORT_RE.exec(src)) !== null) {
    const tok = normalizePath(m[2]);
    if (tok && !seen.has(tok)) { seen.add(tok); tokens.push(tok); }
  }
  while ((m = DYNAMIC_IMPORT_RE.exec(src)) !== null) {
    const tok = normalizePath(m[2]);
    if (tok && !seen.has(tok)) { seen.add(tok); tokens.push(tok); }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// buildImportFingerprintMap
// ---------------------------------------------------------------------------

/**
 * Recursively walk *.ts files under enginesDir (skip *.test.ts, *.spec.ts,
 * *.d.ts), call extractNonEngineImports per file, and return
 * Map<engineStemLower, string[]> where engineStemLower is the file basename
 * (without extension) lowercased.
 *
 * Fail-soft: an unreadable directory returns an empty Map; unreadable individual
 * files are silently skipped.
 *
 * @param {string} enginesDir - absolute path to mcp-server/src/engines
 * @param {object} [fsImpl=fs] - injected fs for testing (must implement readdirSync
 *   with {withFileTypes:true} and readFileSync)
 * @returns {Map<string, string[]>}
 */
export function buildImportFingerprintMap(enginesDir, fsImpl = fs) {
  const map = new Map();
  _walkEngineFiles(enginesDir, map, fsImpl);
  // Second pass -- drop same-dir engine->engine tokens. The engines tree is FLAT, so an
  // engine importing a sibling engine writes `./XEngine.js` (NO /engines/ substring), which
  // survives normalizePath as the bare engine-stem token `xengine`. The engine->engine 1-hop
  // adjacency is RULED OUT (72% null -- reference_gnn_structural_feature_probe_2026_06_21) and
  // readmitting it would contaminate the "independent structural signal" premise + confound
  // the OFF-vs-ON measurement. Remove any token that is itself an engine stem (a map key);
  // exact (keyset-based, not a fragile name-suffix heuristic) and self-excluding.
  const stems = new Set(map.keys());
  for (const [k, toks] of map) map.set(k, toks.filter((t) => !stems.has(t)));
  return map;
}

/** Recursive walker. Mirrors walkEngineSources in build-node-embeddings.mjs. */
function _walkEngineFiles(dir, map, fsImpl) {
  let ents;
  try {
    ents = fsImpl.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // unreadable dir -> fail-soft
  }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { _walkEngineFiles(full, map, fsImpl); continue; }
    if (!e.isFile()) continue;
    // Only .ts sources; skip test/spec/declaration files.
    if (!/\.ts$/.test(e.name) || /\.(test|spec|d)\.ts$/.test(e.name)) continue;
    const stem = e.name.replace(/\.ts$/, "").toLowerCase();
    let src;
    try {
      src = fsImpl.readFileSync(full, "utf8");
    } catch {
      continue; // unreadable file -> skip
    }
    const tokens = extractNonEngineImports(src);
    if (!map.has(stem)) map.set(stem, tokens);
    // first-wins on collision (mirrors walkEngineSources)
  }
}

// ---------------------------------------------------------------------------
// buildImportIdfMap
// ---------------------------------------------------------------------------

/**
 * Document-frequency IDF over the corpus of all engines' import token arrays:
 * Map<token, ln(N / df)>. A token in EVERY engine -> idf 0 (suppressed shared
 * vocab, e.g. universal node/fs, zod); a token in ONE engine -> idf ln(N)
 * (max salience, rare domain import). Mirrors the EXACT formula of buildIdfMap in
 * build-node-embeddings.mjs. Pure.
 *
 * @param {Map<string, string[]>} map - output of buildImportFingerprintMap
 * @returns {Map<string, number>} token -> idf score
 */
export function buildImportIdfMap(map) {
  const docs = (map instanceof Map) ? [...map.values()] : [];
  const N = docs.length || 1;
  const df = new Map();
  for (const tokens of docs) {
    // Use a Set so each token is counted once per document (df not tf).
    for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf = new Map();
  for (const [t, c] of df) idf.set(t, Math.log(N / c));
  return idf;
}

// ---------------------------------------------------------------------------
// importFingerprintText
// ---------------------------------------------------------------------------

/**
 * Top-K import-path tokens by IDF descending (rarest/most-domain-specific first),
 * space-joined. Tokens with idf<=0 (universal imports present in every engine) are
 * dropped -- they only crowd the embedding budget. Ties broken by first occurrence
 * (first in the source order of extractNonEngineImports) for determinism.
 *
 * Non-array importPaths or non-Map idfMap -> "".
 * Empty importPaths or no survivors (all idf<=0) -> "".
 * Pure.
 *
 * @param {string[]} importPaths - normalized tokens from extractNonEngineImports
 * @param {Map<string, number>} idfMap - output of buildImportIdfMap
 * @param {number} [k=12] - max tokens to return
 * @returns {string}
 */
export function importFingerprintText(importPaths, idfMap, k = 12) {
  if (!Array.isArray(importPaths) || !(idfMap instanceof Map)) return "";
  const kInt = Math.max(0, (k | 0));
  const seen = new Set();
  const scored = [];
  for (let i = 0; i < importPaths.length; i++) {
    const t = importPaths[i];
    if (typeof t !== "string" || !t || seen.has(t)) continue;
    seen.add(t);
    const w = idfMap.get(t);
    // Drop tokens absent from the map OR with idf<=0 (universal imports).
    if (Number.isFinite(w) && w > 0) scored.push({ t, w, i });
  }
  // Sort by idf desc; ties by first occurrence (lower i wins).
  scored.sort((a, b) => (b.w - a.w) || (a.i - b.i));
  return scored.slice(0, kInt).map((s) => s.t).join(" ");
}
