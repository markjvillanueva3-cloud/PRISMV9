#!/usr/bin/env node
/**
 * cad-holdout-guard.mjs -- DELTA-CAD-COMPLETION / U-DELTA-HOLDOUT-SPLITS (keystone).
 *
 * The leak-guard for CAD closed-loop training. Per the master plan
 * (DELTA-CAD-CLOSED-LOOP-TRAINSUITE-MASTER-PLAN-2026-06-27.md sec 4-5): nothing trains
 * until held-out evaluation splits are FROZEN and a guard THROWS on any train/test leak.
 * Every accuracy number downstream is meaningless if a held-out part also appears in training.
 *
 * Two load-bearing jobs:
 *   1. freezeStratifiedHoldout() -- DETERMINISTICALLY select a class-stratified held-out
 *      sample from the corpus manifest (reproducible: stable FNV-1a hash ordering, NOT
 *      Math.random -- the same manifest + n always yields the same split).
 *   2. assertNoLeak() -- THROW (fail-loud, R9/R12) if any training abs_path is also in the
 *      held-out set. Train converters (cad-fix-ledger-to-training, outcome-to-alpaca, the new
 *      corpus miners) call this before emitting pairs.
 *
 * Pure + importable (no top-level I/O beyond explicit load helpers). Path comparison is
 * normalized (lowercase + forward-slash) so H:/prism vs h:\prism vs trailing-slash never
 * leak through a casing/separator gap.
 *
 * Sibling of scripts/lib/units-guard.mjs (a pure guard lib consumed by scripts, not a
 * dispatcher action). The prism_cad:holdout_check dispatcher surface is a follow-up unit.
 */

import { readFileSync } from "node:fs";

/**
 * Normalize a filesystem path for leak comparison: lowercase, backslash->forward-slash,
 * collapse duplicate slashes, strip a single trailing slash. So a part referenced as
 * "H:\PRISM\a.step" and "h:/prism/a.step" compare EQUAL (a real Windows leak vector).
 * @param {string} p
 * @returns {string}
 */
export function normalizePath(p) {
  if (typeof p !== "string") return "";
  let s = p.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/").toLowerCase();
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

/**
 * Extract the abs_path (or chosen key) from an item that may be a bare string or an
 * entry object. Returns "" for anything without a usable path (caller decides to skip/flag).
 * @param {string|object} item
 * @param {string} pathKey
 * @returns {string}
 */
export function itemPath(item, pathKey = "abs_path") {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const v = item[pathKey];
    if (typeof v === "string") return v;
  }
  return "";
}

/**
 * Build a Set of normalized paths from held-out entries (strings or {abs_path} objects).
 * @param {Array<string|object>} holdoutEntries
 * @param {string} pathKey
 * @returns {Set<string>}
 */
export function buildHoldoutSet(holdoutEntries, pathKey = "abs_path") {
  const set = new Set();
  if (!Array.isArray(holdoutEntries)) return set;
  for (const e of holdoutEntries) {
    const norm = normalizePath(itemPath(e, pathKey));
    if (norm) set.add(norm);
  }
  return set;
}

/**
 * Is this path in the held-out set? (normalized comparison)
 * @param {string} absPath
 * @param {Set<string>} holdoutSet
 * @returns {boolean}
 */
export function isHeldOut(absPath, holdoutSet) {
  if (!(holdoutSet instanceof Set)) return false;
  return holdoutSet.has(normalizePath(absPath));
}

/**
 * Assert that NO training item is also held out. THROWS a descriptive Error listing the
 * leaking paths (capped) if any overlap exists -- this is the fail-loud guard (R9/R12).
 * Returns the (empty) leak array on success so callers can also use it non-throwing if they
 * pass {throwOnLeak:false}.
 * @param {Array<string|object>} trainItems
 * @param {Set<string>|Array<string|object>} holdout
 * @param {{pathKey?:string, throwOnLeak?:boolean, labelTrain?:string, labelHoldout?:string, maxList?:number}} [opts]
 * @returns {string[]} the leaking normalized paths (empty if clean)
 */
export function assertNoLeak(trainItems, holdout, opts = {}) {
  const {
    pathKey = "abs_path",
    throwOnLeak = true,
    labelTrain = "train",
    labelHoldout = "holdout",
    maxList = 10,
  } = opts;
  const holdoutSet = holdout instanceof Set ? holdout : buildHoldoutSet(holdout, pathKey);
  const leaks = [];
  const seen = new Set();
  if (Array.isArray(trainItems)) {
    for (const t of trainItems) {
      const norm = normalizePath(itemPath(t, pathKey));
      if (norm && holdoutSet.has(norm) && !seen.has(norm)) {
        seen.add(norm);
        leaks.push(norm);
      }
    }
  }
  if (leaks.length > 0 && throwOnLeak) {
    const shown = leaks.slice(0, maxList).join("\n  - ");
    const more = leaks.length > maxList ? `\n  ...and ${leaks.length - maxList} more` : "";
    throw new Error(
      `[cad-holdout-guard] TRAIN/TEST LEAK: ${leaks.length} ${labelTrain} item(s) are also in the ${labelHoldout} set. ` +
        `Holding-out a part that is also trained on invalidates every downstream accuracy number. Leaking paths:\n  - ${shown}${more}`,
    );
  }
  return leaks;
}

/**
 * Deterministic 32-bit FNV-1a hash of a string -> unsigned int. Used to order entries
 * reproducibly for sampling (so the "random" split is stable across runs without Math.random,
 * which would make the held-out set non-reproducible and break leak auditing).
 * @param {string} str
 * @returns {number} unsigned 32-bit
 */
export function stableHash(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // h *= 16777619, kept in 32-bit via Math.imul
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Summarize how many entries fall in each stratum value.
 * @param {Array<object>} entries
 * @param {string} stratifyBy
 * @returns {Record<string, number>}
 */
export function summarizeStrata(entries, stratifyBy = "part_class") {
  const out = {};
  if (!Array.isArray(entries)) return out;
  for (const e of entries) {
    const k = (e && typeof e === "object" && e[stratifyBy] != null) ? String(e[stratifyBy]) : "(unknown)";
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// Path-segment markers for geometry that is NOT a manufacturable PART: machine-tool models,
// tool/command holders, posts, and tooling-database models. A CAD-PART-generation eval set must never
// contain these -- scoring the model on "generate a HAAS VF-2 / a tool holder" measures nothing real
// (U-CAD-HOLDOUT-PARTPURITY, slot:delta 2026-06-29). Patterns are normalized (lowercase, forward-slash)
// to match normalizePath() output, and are taken from the ACTUAL contaminants observed in geom-50.json
// (machine models for HAAS/OKUMA/MAZAK/HURCO/MATSUURA, MULTUS posts, command/tool holders).
const NON_PART_PATH_MARKERS = [
  "machine models for learning",   // .../MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION/<maker>/...
  "posts and machines",            // .../POSTS AND MACHINES/... (machine + post models, e.g. MULTUS B250II)
  "tool_holder_cad_files",         // .../TOOL_HOLDER_CAD_FILES/... (work/tool holders)
  "command holders",               // .../Command Holders/igs/... (tool holders)
  "tool database/tooling",         // .../Tool Database/Tooling/... (tooling-DB models)
];

/**
 * Is this path a NON-PART model (machine tool, holder, post, fixture/tooling) that must be excluded
 * from a CAD-PART-generation held-out eval set? Pure, normalized substring match (R12: conservative --
 * only the observed unambiguous non-part directories; a real part is never under these segments).
 * @param {string} absPath
 * @returns {boolean}
 */
export function isNonPartGeometry(absPath) {
  const np = normalizePath(absPath);
  if (!np) return false;
  return NON_PART_PATH_MARKERS.some((m) => np.includes(m));
}

/**
 * Content-level dedup key for an entry: the normalized BASENAME (final path segment). The builder's
 * path-dedup only collapses re-cased/separator twins of the SAME path; the SAME part mirrored at a
 * different directory (Resources/ vs BOX/, or two customer dirs -- e.g. PSV-30381A-32 / pd1083 /
 * L09...DIE / T-5UP-280-113161 each appear TWICE in geom-50) slips through. Keying on basename collapses
 * those. Conservative by design: for a held-out TEST set, a rare basename-collision-but-different-part
 * (under-count) is far safer than a duplicate that inflates the count or leaks a twin into training.
 * @param {string|object} entry
 * @param {string} pathKey
 * @returns {string}
 */
export function contentDedupKey(entry, pathKey = "abs_path") {
  const np = normalizePath(itemPath(entry, pathKey));
  if (!np) return "";
  const slash = np.lastIndexOf("/");
  return slash >= 0 ? np.slice(slash + 1) : np;
}

/**
 * Dedup entries by contentDedupKey, deterministically keeping the FIRST per key by ascending
 * stableHash(normalizedPath) (so the survivor is reproducible, not insertion-order-dependent).
 * Entries with no usable path are dropped (they cannot be leak-checked anyway). Returns the survivors.
 * @param {Array<string|object>} entries
 * @param {string} pathKey
 * @returns {Array<string|object>}
 */
export function dedupeByContentKey(entries, pathKey = "abs_path") {
  if (!Array.isArray(entries)) return [];
  const withPath = entries.filter((e) => normalizePath(itemPath(e, pathKey)));
  const ordered = withPath.slice().sort((x, y) => {
    const hx = stableHash(normalizePath(itemPath(x, pathKey)));
    const hy = stableHash(normalizePath(itemPath(y, pathKey)));
    return hx - hy || (normalizePath(itemPath(x, pathKey)) < normalizePath(itemPath(y, pathKey)) ? -1 : 1);
  });
  const seen = new Set();
  const out = [];
  for (const e of ordered) {
    const k = contentDedupKey(e, pathKey);
    if (k && !seen.has(k)) { seen.add(k); out.push(e); }
  }
  return out;
}

/**
 * Freeze a class-stratified held-out sample of size ~n from corpus entries, DETERMINISTICALLY.
 *
 * Allocation: PER-STRATUM FLOOR then proportional fill. When n >= number-of-strata every non-empty
 * stratum is guaranteed >=1 (capped at its size) so no class is dropped from the eval set; the
 * remaining budget fills proportionally by stratum size (largest-remainder). When n < number-of-strata
 * full coverage is impossible, so the n LARGEST strata get 1 each (a documented limitation, not a
 * silent drop). Selection within a stratum is the first k entries by ascending stableHash(abs_path)
 * (reproducible). The actual count can differ from n when n > total available -- `requested` vs
 * `actual` are both reported (never silently claim n while returning fewer -- R12).
 *
 * @param {Array<object>} entries  corpus entries (each with abs_path + the stratify field)
 * @param {{n:number, stratifyBy?:string, pathKey?:string}} opts
 * @returns {{held:object[], strata:Record<string,number>, requested:number, actual:number, total:number, pathKey:string, stratifyBy:string}}
 */
export function freezeStratifiedHoldout(entries, opts = {}) {
  const { stratifyBy = "part_class", pathKey = "abs_path" } = opts;
  const n = Number(opts.n);
  if (!Array.isArray(entries)) throw new Error("[cad-holdout-guard] freezeStratifiedHoldout: entries must be an array");
  if (!Number.isFinite(n) || n <= 0) throw new Error(`[cad-holdout-guard] freezeStratifiedHoldout: n must be a positive number, got ${opts.n}`);

  // Bucket valid entries (must have a usable path) by stratum.
  const buckets = new Map();
  let total = 0;
  for (const e of entries) {
    const p = itemPath(e, pathKey);
    if (!p) continue; // skip entries with no path -- they cannot be leak-checked
    const k = (e && typeof e === "object" && e[stratifyBy] != null) ? String(e[stratifyBy]) : "(unknown)";
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(e);
    total++;
  }
  if (total === 0) throw new Error("[cad-holdout-guard] freezeStratifiedHoldout: no entries with a usable path");

  const target = Math.min(n, total);
  // Deterministic stratum order (by name) so allocation is reproducible.
  const stratumNames = [...buckets.keys()].sort();
  const S = stratumNames.length;
  const alloc = stratumNames.map((k) => ({ k, size: buckets.get(k).length, base: 0, frac: 0 }));

  if (target >= S) {
    // PER-STRATUM FLOOR: every non-empty stratum gets >=1 (its size is >=1 here), so no class is
    // silently dropped from the eval set when the budget can cover all classes. Then distribute the
    // remaining budget proportionally by stratum size (largest-remainder), capped at each size.
    for (const a of alloc) a.base = 1;
    const remaining = target - S; // budget left after the floor
    for (const a of alloc) {
      const exact = remaining * (a.size / total);
      a.frac = exact - Math.floor(exact);
      a.base += Math.min(Math.floor(exact), a.size - a.base); // cap at available
    }
    let used = alloc.reduce((s, a) => s + (a.base - 1), 0); // budget consumed beyond the floor
    let rem2 = remaining - used;
    const order = [...alloc].sort((a, b) => (b.frac - a.frac) || (a.k < b.k ? -1 : 1));
    let guard = 0;
    while (rem2 > 0 && guard < S * 4) {
      let progressed = false;
      for (const a of order) {
        if (rem2 <= 0) break;
        if (a.base < a.size) { a.base++; rem2--; progressed = true; }
      }
      guard++;
      if (!progressed) break; // all strata saturated (target<=total guarantees we reach target first)
    }
  } else {
    // target < number-of-strata: full class coverage is impossible; give 1 each to the `target`
    // LARGEST strata (deterministic: size desc, then name). Documented limitation, not a silent drop.
    const bySize = [...alloc].sort((a, b) => (b.size - a.size) || (a.k < b.k ? -1 : 1));
    for (let i = 0; i < target; i++) bySize[i].base = 1;
  }

  // Select the first `base` entries of each stratum by ascending stableHash(path) (reproducible).
  const held = [];
  const strata = {};
  for (const a of alloc) {
    const pool = buckets.get(a.k)
      .slice()
      .sort((x, y) => {
        const hx = stableHash(normalizePath(itemPath(x, pathKey)));
        const hy = stableHash(normalizePath(itemPath(y, pathKey)));
        return hx - hy || (normalizePath(itemPath(x, pathKey)) < normalizePath(itemPath(y, pathKey)) ? -1 : 1);
      });
    const take = pool.slice(0, a.base);
    for (const e of take) held.push(e);
    if (take.length > 0) strata[a.k] = take.length;
  }

  return { held, strata, requested: n, actual: held.length, total, pathKey, stratifyBy };
}

/**
 * Load a frozen holdout manifest JSON from disk and return its entries array + path set.
 * Fails loud on read/parse error (a corrupt holdout manifest must NEVER silently degrade to
 * an empty set -- that would let every train item through the leak guard).
 * @param {string} manifestPath
 * @param {string} pathKey
 * @returns {{entries:object[], set:Set<string>, count:number, path:string}}
 */
export function loadHoldout(manifestPath, pathKey = "abs_path", allowEmpty = false) {
  let raw;
  try {
    raw = readFileSync(manifestPath, "utf8");
  } catch (e) {
    throw new Error(`[cad-holdout-guard] cannot read holdout manifest ${manifestPath}: ${e && e.message ? e.message : e}`);
  }
  let j;
  try {
    j = JSON.parse(raw);
  } catch (e) {
    throw new Error(`[cad-holdout-guard] holdout manifest ${manifestPath} is not valid JSON: ${e && e.message ? e.message : e}`);
  }
  const obj = (j && typeof j === "object") ? j : null; // guard null/primitive before .held/.entries
  const entries = Array.isArray(j)
    ? j
    : (obj && Array.isArray(obj.held) ? obj.held : (obj && Array.isArray(obj.entries) ? obj.entries : null));
  if (!Array.isArray(entries)) {
    throw new Error(`[cad-holdout-guard] holdout manifest ${manifestPath} has no array of entries (expected top-level array, or .held / .entries)`);
  }
  const set = buildHoldoutSet(entries, pathKey);
  if (set.size === 0 && !allowEmpty) {
    // An empty holdout makes assertNoLeak pass EVERY train item -- the leak guard silently OFF.
    // A truncated/corrupt manifest collapsing to [] must fail loud, not disable protection (R12).
    throw new Error(`[cad-holdout-guard] holdout manifest ${manifestPath} resolved to 0 paths -- an empty holdout silently disables the leak guard. Pass allowEmpty=true only if this is intentional.`);
  }
  return { entries, set, count: set.size, path: manifestPath };
}
