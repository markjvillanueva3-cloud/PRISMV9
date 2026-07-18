#!/usr/bin/env node
/**
 * code-file-facts.mjs -- pure structural-fact extractor for a PRISM source file.
 *
 * The SSOT parser behind `scripts/code-to-vault.mjs` (the code-file -> Obsidian
 * brain-node bridge, slot:sierra). Given a `.ts` path + its text, it returns the
 * structured facts that make a good 2nd-brain summary node WITHOUT any LLM call:
 * primary symbol, exports, public methods, sibling-engine dependencies (as vault
 * wikilinks), physics-constant imports, galaxy, LOC, and the file's own JSDoc header.
 *
 * Pure + side-effect-free (no fs, no network) so `code-to-vault` can test it and the
 * caller controls all I/O. The caller reads the file; this module only parses text.
 *
 * Design notes / discipline:
 *  - Regex-only, fail-soft: a malformed file yields a sparse-but-valid facts object,
 *    never a throw (R12 -- a parse gap is recorded as empty, never faked).
 *  - Uses String.matchAll (not g-flagged RegExp.exec loops) -- the codebase-preferred
 *    idiom that avoids the exported-regex .exec/.test footgun.
 *  - Dependency wikilinks reuse the SAME slug scheme as code-to-vault (`slugify`) so
 *    `[[reference_code_engine_<slug>]]` edges resolve to the notes the generator emits
 *    -- this is what densifies the Obsidian graph (the "maximize 2nd brain" lever).
 *  - No real TS parse (would need typescript as a dep -- ask-before-add law, overkill
 *    for a summary). The heuristics are tuned to the actual PRISM engine idiom (one
 *    `export class XEngine`, a top JSDoc header, `./Sibling` relative imports).
 */

/** Lowercase alphanumeric slug of a symbol/basename (matches code-to-vault). */
export function slugify(name) {
  return String(name || "")
    .replace(/\.d\.ts$/i, "")
    .replace(/\.(mjs|cjs|jsx?|tsx?)$/i, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toLowerCase();
}

/** Strip leading `*` / whitespace from a JSDoc block body. */
function cleanBlock(raw) {
  return String(raw)
    .split("\n")
    .map((l) => l.replace(/^\s*\*?\s?/, "").replace(/\s+$/, ""))
    .join("\n")
    .trim();
}

/**
 * Extract the FILE-HEADER comment only -- ANCHORED to the top of the file (after an
 * optional shebang + blank lines). Supports a leading `/** *\/` doc block OR consecutive
 * `//` line comments (common in .mjs). Returns "" when the file leads with code, so an
 * inline `/** *\/` deeper down is NEVER misattributed as the header (the P1 bug: a script
 * whose first doc-comment documented an `ASK_OLLAMA` const was summarized as that const).
 */
export function extractHeaderJsdoc(text) {
  const src = String(text || "").replace(/^#![^\n]*\n/, ""); // drop shebang
  const lead = src.replace(/^\s+/, "");                       // skip leading blank lines
  // Case 1: header is a /** */ doc block at the very top.
  if (lead.startsWith("/**")) {
    const m = lead.match(/^\/\*\*([\s\S]*?)\*\//);
    if (m) return cleanBlock(m[1]);
  }
  // Case 2: header is consecutive // line comments at the very top.
  if (/^\/\//.test(lead)) {
    const hdr = [];
    for (const l of lead.split("\n")) {
      if (/^\s*\/\//.test(l)) hdr.push(l.replace(/^\s*\/\/\s?/, ""));
      else if (l.trim() === "" && hdr.length) break; // blank after header ends it
      else break;                                    // first code line ends it
    }
    return hdr.join("\n").trim();
  }
  return ""; // file leads with code -> no header (do NOT grab a deep inline block)
}

/** All exported symbol names, in file order (deduped, capped by caller). */
export function extractExports(text) {
  const out = [];
  const seen = new Set();
  const declRe = /export\s+(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(class|function|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of String(text || "").matchAll(declRe)) {
    const name = m[2];
    if (!seen.has(name)) { seen.add(name); out.push({ kind: m[1], name }); }
  }
  // `export { A, B as C }` re-exports.
  const braceRe = /export\s*\{([^}]*)\}/g;
  for (const m of String(text || "").matchAll(braceRe)) {
    for (const part of m[1].split(",")) {
      const nm = part.trim().split(/\s+as\s+/i)[0].trim();
      if (nm && /^[A-Za-z_$][\w$]*$/.test(nm) && !seen.has(nm)) { seen.add(nm); out.push({ kind: "re-export", name: nm }); }
    }
  }
  return out;
}

/**
 * The primary exported symbol: an `export class` if present, else the export whose name
 * matches the file BASENAME (so `trigger-command-pipeline.mjs` titles as its
 * `triggerCommandPipeline` export, not an arbitrary first `ASK_OLLAMA` const), else the
 * first export. `basename` is optional (back-compat); when omitted, first-export fallback.
 */
export function extractPrimarySymbol(text, exportsList, basename) {
  const cls = String(text || "").match(/export\s+(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/);
  if (cls) return cls[1];
  const list = exportsList || extractExports(text);
  if (!list.length) return null;
  if (basename) {
    // A basename-matching export is the "primary" (redact-secrets.mjs -> redactSecrets);
    // otherwise return null so the caller titles by the FILE (correct for entry-point
    // scripts with many exports and no single primary -- avoids titling by an arbitrary
    // first export like ASK_OLLAMA). Back-compat: no basename -> first-export fallback.
    const baseSlug = slugify(basename);
    const match = list.find((e) => slugify(e.name) === baseSlug);
    return match ? match.name : null;
  }
  return list[0].name;
}

/**
 * Public method names of the primary class. Heuristic: indented lines of the form
 * `methodName(` / `async methodName(` / `public methodName(`, excluding language
 * keywords and `_`-prefixed (private-by-convention) members.
 */
export function extractMethods(text) {
  const out = [];
  const seen = new Set();
  const methodRe = /^\s{2,}(?:public\s+|static\s+|async\s+|readonly\s+|override\s+)*([a-zA-Z][\w$]*)\s*(?:<[^>]*>)?\s*\(/gm;
  const KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "return", "constructor", "function", "await", "super", "this", "get", "set", "new", "typeof", "case", "do", "else"]);
  for (const m of String(text || "").matchAll(methodRe)) {
    const name = m[1];
    if (KEYWORDS.has(name)) continue;
    if (name.startsWith("_")) continue; // convention: private
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * Sibling-engine dependencies: relative imports whose module basename looks like an
 * engine/algorithm (`*Engine`, or any PascalCase sibling module). Returned as
 * { module, slug } so the caller can emit `[[reference_code_engine_<slug>]]` edges.
 */
export function extractDeps(text) {
  const out = [];
  const seen = new Set();
  const importRe = /import\s+(?:[^"']*?\s+from\s+)?["'](\.\.?\/[^"']+)["']/g;
  for (const m of String(text || "").matchAll(importRe)) {
    const spec = m[1];
    const base = spec.split("/").pop().replace(/\.[tj]s$/i, "");
    if (!base) continue;
    // Keep engine-shaped or PascalCase sibling modules; drop lowercase util imports.
    if (!/Engine$|^[A-Z][A-Za-z0-9]+$/.test(base)) continue;
    const slug = slugify(base);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ module: base, slug });
  }
  return out;
}

/** True if the file imports canonical physics constants (a safety-relevant signal). */
export function importsPhysicsConstants(text) {
  return /from\s+["'][^"']*physics\/constants(?:\.js)?["']/.test(String(text || ""));
}

// Engine subdirs that are infrastructure, NOT manufacturing galaxies -- excluded so a
// file under engines/lib/ is not mislabeled galaxy:"lib" (gap-audit finding, 2026-07-02).
const NON_GALAXY_SUBDIRS = new Set([
  "lib", "plugins", "util", "utils", "helpers", "helper", "types", "shared", "common",
  "base", "core", "config", "internal", "__tests__", "__mocks__", "node_modules", "data",
]);

/** Galaxy from an engines-subdir path, else null. e.g. .../engines/mill/X.ts -> "mill". */
export function galaxyFromPath(relPath) {
  const m = String(relPath || "").replace(/\\/g, "/").match(/engines\/([a-z0-9-]+)\//i);
  if (!m) return null;
  const sub = m[1].toLowerCase();
  return NON_GALAXY_SUBDIRS.has(sub) ? null : sub;
}

/**
 * Full facts object for one source file (pure).
 * @param {string} relPath  repo-relative path (used for galaxy + display).
 * @param {string} text     file contents.
 * @param {string} kind     'engine'|'algorithm'|'dispatcher'|'schema'|'module'
 */
export function extractFacts(relPath, text, kind = "module") {
  const src = String(text || "");
  const exportsList = extractExports(src);
  const loc = src ? src.split("\n").length : 0;
  const basename = String(relPath || "").replace(/\\/g, "/").split("/").pop() || "";
  return {
    kind,
    path: String(relPath || "").replace(/\\/g, "/"),
    basename,
    galaxy: galaxyFromPath(relPath),
    loc,
    primary: extractPrimarySymbol(src, exportsList, basename),
    jsdoc: extractHeaderJsdoc(src),
    exports: exportsList,
    methods: extractMethods(src),
    deps: extractDeps(src),
    importsPhysicsConstants: importsPhysicsConstants(src),
  };
}
