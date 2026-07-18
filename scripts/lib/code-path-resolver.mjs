// code-path-resolver.mjs — resolve a PRISM node's name / label / id-tail / DSL
// shortcode to its SOURCE FILE PATH (+ asset type, + optional declaration line)
// via the canonical CODE_SYSTEM_INDEX.json.
//
// SYSTEM-VIZ / U-SV-CODE-PATH-RESOLVER (sierra, node-direct-navigation).
// EXTENDED U-SV-NODE-PATH-TEMPLATE (sierra): +type (from index `category`),
//   +byCode (DSL shortcode "E0001" → path), +opt-in {withLine} declaration-line scan.
//
// WHY: the node-direct-navigation surfaces (pre-bash EXACT-MATCH banner,
// master-index-precheck inject) already tell the model "the graph knows X" but emit
// only a label + a synthetic node id — never a file path. So the model still
// Grep/Glob-searches for the file to Read. This resolver closes that gap: given the
// name/id those hooks already carry, it returns the real file path (+ type, + line)
// so the hook can emit `Read: <path>` — a tool call that leads DIRECTLY to the
// node's file (compounding token savings). It is the CONSUMER-side half of the seam;
// there is intentionally NO find-cache producer change, because (unlike noteCount,
// whose source arrays are dropped during slimming) the path is fully recomputable
// here from the name/id the slim cache already carries — projecting it into the
// 302K-node sidecar would be a 3.6%-hit-rate schema-bump + regen tax for zero added
// reach. (Synthesis verdict wf_7fae44ef-d77; YAGNI list §5.)
//
// KEYING (verified against real data): CODE_SYSTEM_INDEX `codes` entries are
// `{code, path, name, category}` where `name` is SUFFIX-STRIPPED ("AHP" for
// src/engines/AHPEngine.ts). Find-cache node labels + id-tails carry the path
// BASENAME instead ("AHPEngine", id "eng.x.ahpengine"). So we index THREE ways:
//   - byCode     : uppercased DSL shortcode   ("E0001")           — unique, never ambiguous
//   - byName     : lowercased `name`          ("ahp")
//   - byBasename : lowercased path-basename   ("ahpengine")
// and try code-then-name-then-basename, case-insensitive, on the raw input AND its
// id-tail. Collisions in byName/byBasename (a key → ≥2 distinct paths; ~31 name +
// ~3 basename across 4,149) are marked AMBIGUOUS → resolve returns null. Unindexed
// (new engine, hook, non-src) → null. INVARIANT: never emit a path we are not
// certain of.
//
// COST CONTRACT (load-bearing — the inject hooks fire ~1060×/day):
//   - resolveCodePath(x)               → ZERO IO beyond the one-time, mtime-cached
//                                        parse of the compact ~4K-entry index. Never
//                                        touches the 548MB graph. Use this on the hot
//                                        PreToolUse path.
//   - resolveCodePath(x,{withLine:true}) → ADDS one readFileSync of the single
//                                        resolved source file (mtime-cached per path)
//                                        to find the declaration line. OPT-IN only —
//                                        for the interactive /nav skill, NOT the hooks.
//
// Knobs: PRISM_CODE_SYSTEM_INDEX_PATH=<p> (override index location, for tests),
//        PRISM_CODE_SYSTEM_SRC_ROOT=<dir> (override the source root the index paths
//                                          are relative to; default <repo>/mcp-server).
// mtime-cached: a peer regen of the index invalidates the maps automatically.

import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_INDEX = join(__dirname, "..", "..", "mcp-server", "data", "docs", "CODE_SYSTEM_INDEX.json");
// CODE_SYSTEM_INDEX paths are repo-relative to mcp-server/ (_meta.root="mcp-server/").
const DEFAULT_SRC_ROOT = join(__dirname, "..", "..", "mcp-server");

// DSL category prefix → human asset type. Mirrors CODE_SYSTEM_INDEX `categories`
// (E=src/engines, D=dispatchers, A=algorithms, …) + the viz-derived AC/SK/ML/FM/GH.
const CATEGORY_TYPE = {
  E: "engine", D: "dispatcher", A: "algorithm", S: "schema", H: "hook",
  U: "util", RG: "registry", SV: "service", T: "test", C: "data",
  M: "milestone", DOC: "doc", R: "source", AC: "action", SK: "skill",
  ML: "model", FM: "formula", GH: "graph-node", X: "project-file",
};

export function categoryToType(category) {
  if (typeof category !== "string" || !category) return null;
  return CATEGORY_TYPE[category.toUpperCase()] || category.toLowerCase();
}

function indexPath() {
  return process.env.PRISM_CODE_SYSTEM_INDEX_PATH || DEFAULT_INDEX;
}

function srcRoot() {
  return process.env.PRISM_CODE_SYSTEM_SRC_ROOT || DEFAULT_SRC_ROOT;
}

// Sentinel for a key that maps to >1 distinct path — resolve refuses these so a
// collision can never produce a confidently-wrong `Read: <path>`.
const AMBIGUOUS = Symbol("ambiguous-code-path");

let _cache = { mtimeMs: -1, path: null, byName: null, byBase: null, byCode: null, root: null };
// Per-source-file declaration-line cache (mtime-keyed). Only touched on withLine.
const _lineCache = new Map(); // absPath → { mtimeMs, line }

// Path leaf without extension: "src/engines/AHPEngine.ts" → "AHPEngine".
function baseNoExt(p) {
  const leaf = String(p).split(/[\\/]/).pop() || "";
  return leaf.replace(/\.[^.]+$/, "");
}

// Build (or reuse) the code + name + basename → entry maps from CODE_SYSTEM_INDEX.
// Each entry: { path, code, type }. Returns the cache object, or null if the index
// is missing/unparseable (fail-soft).
function loadMaps() {
  const p = indexPath();
  let st;
  try { st = statSync(p); } catch { return null; }
  if (st.mtimeMs === _cache.mtimeMs && _cache.path === p && _cache.byName) return _cache;
  let idx;
  try { idx = JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
  const codes = idx && idx.codes && typeof idx.codes === "object" ? idx.codes : {};
  // Index `path`s are relative to the index's declared root (`_meta.root`, e.g.
  // "mcp-server/"). repoPath = root + path = the path a consumer can Read DIRECTLY
  // from the repo root. Critical: a bare `src/...` read from the repo root opens an
  // untracked top-level dup, not the canonical mcp-server/src/... source. Default to
  // "mcp-server" (the documented root) when _meta.root is absent.
  const root = idx && idx._meta && typeof idx._meta.root === "string" && idx._meta.root.trim()
    ? idx._meta.root.replace(/[\\/]+$/, "")
    : "mcp-server";
  const byName = new Map();
  const byBase = new Map();
  const byCode = new Map();
  const put = (map, key, entry) => {
    if (!key) return;
    const k = key.toLowerCase();
    const prev = map.get(k);
    if (prev === undefined) map.set(k, entry);
    else if (prev !== AMBIGUOUS && prev.path !== entry.path) map.set(k, AMBIGUOUS);
  };
  for (const c of Object.values(codes)) {
    if (!c || typeof c.path !== "string") continue;
    const code = typeof c.code === "string" ? c.code : null;
    const entry = { path: c.path, code, type: categoryToType(c.category) };
    // Shortcodes are unique index keys — keyed directly, no ambiguity collapse.
    if (code) byCode.set(code.toUpperCase(), entry);
    if (typeof c.name === "string") put(byName, c.name, entry);
    put(byBase, baseNoExt(c.path), entry);
  }
  _cache = { mtimeMs: st.mtimeMs, path: p, byName, byBase, byCode, root };
  return _cache;
}

// "eng.calc.cuttingforceengine" → "cuttingforceengine"; a plain label passes through.
export function idTail(s) {
  if (typeof s !== "string" || !s) return "";
  return (s.split(".").pop() || s).trim();
}

// Best-effort declaration line for a resolved source file. Reads ONE small file
// (mtime-cached) and finds the line of the named export, falling back to the first
// top-level `export class|const|function|interface|type|enum`. Returns a 1-based
// line number, or null (fail-soft — never throws, never blocks resolution).
function declLine(relPath) {
  const abs = join(srcRoot(), relPath);
  let st;
  try { st = statSync(abs); } catch { return null; }
  const cached = _lineCache.get(abs);
  if (cached && cached.mtimeMs === st.mtimeMs) return cached.line;
  let text;
  try { text = readFileSync(abs, "utf8"); } catch { _lineCache.set(abs, { mtimeMs: st.mtimeMs, line: null }); return null; }
  const name = baseNoExt(relPath);
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 1) exact named export (class/const/function/interface/type/enum), the singleton
  //    camelCase form (xEngine = …), or default; 2) any first top-level export decl.
  const namedRe = new RegExp(
    `^\\s*export\\s+(?:default\\s+)?(?:abstract\\s+)?(?:class|const|let|var|function|interface|type|enum)\\s+${esc}\\b`,
    "i"
  );
  const singletonRe = new RegExp(`^\\s*export\\s+const\\s+${esc}[A-Za-z0-9_]*\\s*[:=]`, "i");
  const anyExportRe = /^\s*export\s+(?:default\s+)?(?:abstract\s+)?(?:class|const|let|var|function|interface|type|enum)\s+/;
  const lines = text.split(/\r?\n/);
  let fallback = null;
  let line = null;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (namedRe.test(ln) || singletonRe.test(ln)) { line = i + 1; break; }
    if (fallback === null && anyExportRe.test(ln)) fallback = i + 1;
  }
  const result = line ?? fallback;
  _lineCache.set(abs, { mtimeMs: st.mtimeMs, line: result });
  return result;
}

/**
 * Resolve a PRISM node's DSL shortcode / display name / label / id (or id-tail) to
 * its source path. Tries byCode (shortcode) then byName then byBasename
 * (case-insensitive) on the raw input and its id-tail.
 * @param {string} nameOrId  "CuttingForceEngine" | "AHP" | "eng.calc.cuttingforceengine" | "E0001"
 * @param {{withLine?:boolean}} [opts]  withLine → also resolve the declaration line
 *        (opt-in; adds one source-file read — do NOT use on the hot hook path).
 * @returns {{path:string, code:(string|null), type:(string|null), line?:(number|null)}|null}
 *          null on miss OR ambiguous — never a guessed path.
 */
export function resolveCodePath(nameOrId, opts = {}) {
  if (typeof nameOrId !== "string" || !nameOrId.trim()) return null;
  const maps = loadMaps();
  if (!maps) return null;
  const trimmed = nameOrId.trim();
  // Shortcode form ("E0001", "RG3") is a direct, never-ambiguous key.
  const codeHit = maps.byCode.get(trimmed.toUpperCase());
  let found = codeHit || null;
  if (!found) {
    const raw = trimmed.toLowerCase();
    const tail = idTail(nameOrId).toLowerCase();
    const keys = raw === tail ? [raw] : [raw, tail];
    for (const key of keys) {
      if (!key) continue;
      const n = maps.byName.get(key);
      if (n === AMBIGUOUS) return null;        // matched an ambiguous name → refuse
      if (n) { found = n; break; }
      const b = maps.byBase.get(key);
      if (b === AMBIGUOUS) return null;        // matched an ambiguous basename → refuse
      if (b) { found = b; break; }
    }
  }
  if (!found) return null;
  // `path` is index-root-relative (back-compat); `repoPath` is repo-root-relative
  // (root + path) — the path a hook/skill can Read DIRECTLY without opening the
  // untracked top-level src/ dup. Consumers that emit a `Read <x>` line use repoPath.
  const out = {
    path: found.path,
    repoPath: maps.root ? `${maps.root}/${found.path}` : found.path,
    code: found.code,
    type: found.type,
  };
  if (opts && opts.withLine) out.line = declLine(found.path);
  return out;
}

// Test seam (hermetic tests reach the internals + force a fresh load).
export const __test = {
  baseNoExt,
  loadMaps,
  declLine,
  categoryToType,
  AMBIGUOUS,
  CATEGORY_TYPE,
  resetCache: () => {
    _cache = { mtimeMs: -1, path: null, byName: null, byBase: null, byCode: null, root: null };
    _lineCache.clear();
  },
};
