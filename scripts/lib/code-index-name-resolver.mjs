/**
 * code-index-name-resolver.mjs -- cap-safe name->path resolver from CODE_SYSTEM_INDEX.json
 * (FORCE-USE-MAP-MS0/U-GREP-FORCE-ACTIVATE, slot:alpha 2026-06-15).
 *
 * WHY: the grep-index-first force-deny (deny an exact-asset-name Grep, name the file to Read
 * instead -- a real token win) shipped LATENT. It needs a graph hit that carries a file PATH,
 * but the cap-safe find-cache.json nodes carry NONE (verified: 345,174 nodes, 0 with path --
 * they hold {label,id,info,subgroup,layer,noteCount}). The 728MB system-graph that DOES carry
 * paths exceeds V8's 512MiB string cap, so it cannot be read in a hook. This module is the
 * missing authoritative, CAP-SAFE (~943KB) name->path source: CODE_SYSTEM_INDEX.json's `.codes`
 * map (4180 entries of {code, path, name, category}, paths relative to `_meta.root`).
 *
 * Pure index/resolve fns (exported, unit-tested) + a thin fail-soft loader. ASCII-only.
 */

import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

/** Default location of the shortcode index (repo-relative). */
export const DEFAULT_CODE_INDEX_PATH = "mcp-server/data/docs/CODE_SYSTEM_INDEX.json";
/** Cap guard -- the file is ~943KB; never read a pathological multi-hundred-MB blob into a string. */
export const MAX_INDEX_BYTES = 50 * 1024 * 1024;

/**
 * Pure: build a `lower(key) -> Set<repo-relative-path>` index from a parsed CODE_SYSTEM_INDEX.
 * Keys are BOTH the asset `name` ("AHP") AND the path basename without extension ("AHPEngine"),
 * so a Grep for either the short name or the full file/class name resolves. Paths are made
 * repo-relative by prefixing `_meta.root` (e.g. "mcp-server/") so exists()/Read work from cwd.
 * A name that maps to multiple files yields a multi-entry Set (the force names all of them).
 */
export function buildNameIndex(codeSystemIndex) {
  const idx = new Map();
  const codes = codeSystemIndex && codeSystemIndex.codes;
  if (!codes || typeof codes !== "object") return idx;
  const root = (codeSystemIndex._meta && typeof codeSystemIndex._meta.root === "string")
    ? codeSystemIndex._meta.root : "";
  const toRepoRel = (p) => (root && !p.startsWith(root) ? root + p : p);
  const add = (key, path) => {
    if (!key || !path) return;
    const k = String(key).trim().toLowerCase();
    if (k.length < 1) return;
    if (!idx.has(k)) idx.set(k, new Set());
    idx.get(k).add(path);
  };
  for (const entry of Object.values(codes)) {
    if (!entry || typeof entry.path !== "string" || !entry.path) continue;
    const repoPath = toRepoRel(entry.path);
    if (entry.name) add(entry.name, repoPath);                          // short name: "AHP"
    add(basename(entry.path).replace(/\.[A-Za-z0-9]+$/, ""), repoPath); // file stem: "AHPEngine"
  }
  return idx;
}

/**
 * Pure: resolve an identifier to its repo-relative path(s) via the index. Case-insensitive,
 * exact key match only (never substring -- the force must not fire on a partial name). Returns
 * a (possibly empty) string[].
 */
export function resolveNameToPaths(name, idx) {
  if (!(idx instanceof Map)) return [];
  const k = String(name == null ? "" : name).trim().toLowerCase();
  if (!k) return [];
  const s = idx.get(k);
  return s ? [...s] : [];
}

/**
 * Cap-safe load + parse of CODE_SYSTEM_INDEX.json. Returns the parsed object or null (fail-soft:
 * a missing/oversize/corrupt index must never throw into a hook -- the force just stays dormant).
 * I/O impls are injectable for testability.
 */
export function loadCodeIndex(path = DEFAULT_CODE_INDEX_PATH, { readImpl = readFileSync, existsImpl = existsSync } = {}) {
  try {
    if (!existsImpl(path)) return null;
    const raw = String(readImpl(path, "utf8"));
    if (raw.length > MAX_INDEX_BYTES) return null;   // refuse a pathological blob (cap-safe)
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Convenience: load the index and return a `name -> string[]` resolver fn, or null when the index
 * is unavailable. The returned fn is what grep-index-first passes to decideForceGraphRead.
 */
export function makeResolver(path = DEFAULT_CODE_INDEX_PATH, deps = {}) {
  const parsed = loadCodeIndex(path, deps);
  if (!parsed) return null;
  const idx = buildNameIndex(parsed);
  if (idx.size === 0) return null;
  return (name) => resolveNameToPaths(name, idx);
}
