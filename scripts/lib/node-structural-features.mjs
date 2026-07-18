#!/usr/bin/env node
/**
 * node-structural-features.mjs -- leakage-safe STRUCTURAL feature augmentation for the GNN
 * tier-5 direct-embed dispatcher classifier (U-GNN-STRUCT-FEATURES, slot:india 2026-06-25).
 *
 * THE PROBLEM (measured, not guessed). analyze-ghost-embed-separability.mjs proved the deployed
 * 768-d nomic TEXT embeddings barely separate engines by dispatcher class: only prism_turning
 * clears a useful per-class margin (+0.10); every other class sits in an undifferentiated blob
 * (meanMargin 0.0263, prism_dev NEGATIVE). The tier-5 classifier is direct-embed cosine-kNN over
 * those embeddings, so weak separation => the selective-deploy gate emits only ~2/13 classes (PSN
 * leg #10). Ref-pool GROWTH alone was MEASURED not to help (the codebase-wired --apply lever DROPS
 * AUROC -- reference_india_refpool_apply_disproven_2026_06_25). The remaining lever is SHARPER
 * FEATURES.
 *
 * THE LEAKAGE TRAP (the reason this is non-trivial). The classifier is evaluated leave-one-out over
 * LABELED ghost.unwired-engine refs: a held-out engine is classified by cosine-kNN against the rest
 * of the pool, label = its dispatcher. So any feature that encodes an engine's OWN engine->dispatcher
 * import edge is the LABEL itself -- it would inflate the separability metric while doing NOTHING for
 * a genuinely UNWIRED engine (which by definition has no dispatcher import yet). The 2026-06-21
 * scoping note's "engine->dispatcher import-adjacency" feature is exactly that trap.
 *
 * THE NON-CIRCULAR SIGNAL (what this module builds). An engine's IMPORT NEIGHBORS' dispatcher
 * classes -- the company it keeps. If engine E imports engine N and N is wired to dispatcher D, that
 * is generalizable evidence E belongs near D, and it is available for an unwired E (E still imports
 * other engines even with no dispatcher edge of its own). E's OWN label is never read -- only its
 * neighbors' labels -- so there is no self-leak. This is the engine->engine analogue of GNN
 * neighbourhood aggregation, computed cheaply from the source tree (no 542MB graph load).
 *
 * Engine->engine edges are NOT captured by wired-engine-mapper.extractEngineImports (that regex only
 * matches engines-dir dispatcher-style paths; engine files import siblings RELATIVELY, e.g. a
 * sibling ./BarEngine.js, with no engines-dir segment). So this module matches EVERY import path's
 * basename and keeps the ones that are themselves engine names.
 *
 * Pure + hermetically testable: the core operates on an injected Map of engineName -> sourceText; a
 * thin FS loader (loadEngineSources) is the only impure surface and is itself injectable.
 *
 * Pure-export contract:
 *   extractImportedBasenames(src) -> string[]                              import path basenames
 *   buildEngineImportAdjacencyFromSources(sourcesByEngine) -> Map<eng, Set<eng>>
 *   buildClassList(engineToDisp) -> string[]                              stable sorted class axis
 *   neighborDispatcherHistogram(engine, adjacency, engineToDisp, opts) -> Map<disp, count>
 *   structuralVector(engine, adjacency, engineToDisp, classList, opts) -> number[]
 *   l2normalize(vec) -> number[]
 *   concatWeighted(textVec, structVec, alpha) -> number[]
 *   loadEngineSources(enginesDir, opts) -> Map<engineName, sourceText>    (impure FS walk)
 */
import fs from "node:fs";
import path from "node:path";

// Module-specifier matcher: a single/double-quoted path following `from`, `import`, or `import(`.
// matchAll (not exec-in-loop) keeps this free of the RegExp-exec / child_process-exec ambiguity.
const IMPORT_SPEC_RE = /(?:\bfrom|\bimport(?:\s*\()?)\s*["']([^"']+)["']/g;
const SRC_EXT_RE = /\.(?:js|ts|mjs|cjs|jsx|tsx)$/i;

/**
 * Every import / dynamic-import path basename in a source file. Strips the directory and a
 * trailing .js/.ts/.mjs/.cjs/.jsx/.tsx extension, so a `from` of ./sub/FooEngine.js -> "FooEngine".
 * Matches static `from`, side-effect `import`, and dynamic `import(...)` forms. NOT comment- or
 * string-literal-aware (a commented-out import is captured) and NOT `require()` -- same scope as the
 * sibling wired-engine-mapper.extractEngineImports (R11 convention match). Bounded by the engine-name
 * membership test downstream, so a spurious basename only becomes an edge if it equals a real engine.
 * Pure. Returns de-duplicated basenames in first-seen order.
 */
export function extractImportedBasenames(src) {
  if (typeof src !== "string" || src.length === 0) return [];
  const out = [];
  const seen = new Set();
  for (const m of src.matchAll(IMPORT_SPEC_RE)) {
    const spec = m[1];
    if (typeof spec !== "string" || spec.length === 0) continue;
    const seg = spec.split(/[\\/]/).pop() || spec; // last path segment
    const base = seg.replace(SRC_EXT_RE, "");
    if (base.length === 0 || seen.has(base)) continue;
    seen.add(base);
    out.push(base);
  }
  return out;
}

/**
 * Build an engine -> Set<engine> import-adjacency map from a Map of engineName -> sourceText.
 * The engine-name universe is exactly the keys of the input; an import is an edge only when its
 * basename is itself a known engine name (and not self). Directed edges (E imports N); callers that
 * want undirected neighbourhood can union both directions, but for the dispatcher-cooccurrence
 * feature the OUTBOUND imports already carry the signal ("the engines I depend on").
 *
 * Pure. Engines whose source has no engine-imports still get an (empty) entry so degree/lookup is
 * total. Returns Map<engine, Set<engine>>.
 */
export function buildEngineImportAdjacencyFromSources(sourcesByEngine) {
  const adj = new Map();
  if (!(sourcesByEngine instanceof Map) || sourcesByEngine.size === 0) return adj;
  const engineNames = new Set(sourcesByEngine.keys());
  for (const engine of engineNames) adj.set(engine, new Set());
  for (const [engine, src] of sourcesByEngine) {
    const nbrs = adj.get(engine);
    for (const base of extractImportedBasenames(src)) {
      if (base === engine) continue;       // self-import -> not an edge
      if (engineNames.has(base)) nbrs.add(base);
    }
  }
  return adj;
}

/**
 * Normalize a dispatcher-map VALUE to a string[] of labels. Accepts a single label (string), a
 * Set<string>, or a string[]. This makes the module robust to BOTH the single-label map
 * (extractWiredEngines: Map<engine,string>) AND the raw buildEngineDispatcherMap
 * (Map<engine,Set<namespace>>): passing the latter would otherwise SILENTLY yield all-zero features,
 * which a deploy-gate measurement would misread as "the structural lever gives no lift" instead of
 * failing loud (R12). A multi-wired neighbour legitimately contributes to EACH of its classes.
 * Non-string members are dropped. Pure.
 */
export function dispatchersOf(value) {
  if (typeof value === "string") return value.length > 0 ? [value] : [];
  if (value instanceof Set || Array.isArray(value)) {
    const out = [];
    for (const v of value) if (typeof v === "string" && v.length > 0) out.push(v);
    return out;
  }
  return [];
}

/**
 * Stable, sorted class axis for the histogram dimension. Derived from the engine->dispatcher map's
 * values so the structural-vector layout is deterministic and independent of insertion order.
 * `engineToDisp` is a Map of engineName -> (string | Set<string> | string[]) -- both the single-label
 * map (extractWiredEngines) and the raw Set-valued buildEngineDispatcherMap are accepted via
 * dispatchersOf. Pure. Returns string[] (sorted, de-duplicated).
 */
export function buildClassList(engineToDisp) {
  const classes = new Set();
  if (engineToDisp instanceof Map) {
    for (const d of engineToDisp.values()) {
      for (const c of dispatchersOf(d)) classes.add(c);
    }
  }
  return [...classes].sort();
}

/**
 * Neighbour-dispatcher histogram for one engine: tally the dispatcher class of each import-neighbour.
 * THE ENGINE'S OWN LABEL IS NEVER READ -- only its neighbours' labels -- so a held-out engine's class
 * cannot leak into its own feature. Self-edges are skipped (defensive; the adjacency builder already
 * drops them). A neighbour with no known dispatcher contributes nothing.
 *
 * Pure. Returns Map<dispatcher, count>; empty when the engine has no wired neighbours (the caller
 * then produces an all-zero structural block, which degrades gracefully to text-only under cosine).
 *
 * @param {string} engine
 * @param {Map<string,Set<string>>} adjacency  engine -> Set<engine>
 * @param {Map<string,string>} engineToDisp    engine -> dispatcher (single label)
 */
export function neighborDispatcherHistogram(engine, adjacency, engineToDisp, opts = {}) {
  void opts;
  const hist = new Map();
  if (!(adjacency instanceof Map) || !(engineToDisp instanceof Map)) return hist;
  const nbrs = adjacency.get(engine);
  if (!(nbrs instanceof Set) || nbrs.size === 0) return hist;
  for (const n of nbrs) {
    if (n === engine) continue;                  // never count self
    // Tally each of the neighbour's dispatcher labels (a multi-wired neighbour contributes to all
    // of its classes). The engine's OWN label is never read -- only neighbours' -- so no self-leak.
    for (const d of dispatchersOf(engineToDisp.get(n))) {
      hist.set(d, (hist.get(d) || 0) + 1);
    }
  }
  return hist;
}

/**
 * Structural feature vector for one engine over a fixed class axis. Layout:
 *   [ L2-normalized neighbour-class histogram over classList (K dims),  (optional) log-degree (1 dim) ]
 * The histogram block is L2-normalized so its DIRECTION (the class mix) is what cosine compares,
 * decoupled from raw neighbour count. An engine with no wired neighbours yields an all-zero histogram
 * block (NOT a crash, NOT a uniform vector) -- under concatWeighted the node simply falls back to its
 * text embedding. The optional log-degree scalar is a class-agnostic structural hint (hub vs leaf);
 * `opts.includeDegree:false` ablates it.
 *
 * Pure. Returns number[] of length classList.length (+1 when includeDegree).
 *
 * @param {string} engine
 * @param {Map<string,Set<string>>} adjacency
 * @param {Map<string,string>} engineToDisp
 * @param {string[]} classList
 * @param {{includeDegree?:boolean, degreeNorm?:number}} [opts]
 */
export function structuralVector(engine, adjacency, engineToDisp, classList, opts = {}) {
  const classes = Array.isArray(classList) ? classList : [];
  const includeDegree = opts.includeDegree !== false; // default true
  const hist = neighborDispatcherHistogram(engine, adjacency, engineToDisp, opts);
  const block = classes.map((c) => hist.get(c) || 0);
  const normBlock = l2normalize(block); // all-zero stays all-zero (l2normalize guards /0)
  if (!includeDegree) return normBlock;
  const degree = adjacency instanceof Map && adjacency.get(engine) instanceof Set
    ? adjacency.get(engine).size
    : 0;
  // log1p compresses hub degree; divide by a fixed degreeNorm (default log(64)) so the scalar sits
  // in roughly [0,1] without a global max scan (keeps the function pure + order-independent).
  const degreeNorm = Number.isFinite(opts.degreeNorm) && opts.degreeNorm > 0
    ? opts.degreeNorm
    : Math.log(64);
  const degreeFeat = Math.min(1, Math.log1p(degree) / degreeNorm);
  return [...normBlock, degreeFeat];
}

/** L2-normalize a numeric vector to unit length. An all-zero (or empty) vector is returned as-is
 *  (no divide-by-zero) so a signal-less node stays signal-less rather than becoming NaN. Pure. */
export function l2normalize(vec) {
  if (!Array.isArray(vec) || vec.length === 0) return Array.isArray(vec) ? vec.slice() : [];
  let ss = 0;
  for (const x of vec) { const v = Number.isFinite(x) ? x : 0; ss += v * v; }
  if (ss === 0) return vec.map((x) => (Number.isFinite(x) ? x : 0));
  const inv = 1 / Math.sqrt(ss);
  return vec.map((x) => (Number.isFinite(x) ? x : 0) * inv);
}

/**
 * Late-fusion concatenation of a text embedding and a structural vector, balanced by `alpha`.
 * Each block is L2-normalized, then the text block is scaled by (1-alpha) and the structural block by
 * alpha, and the two are concatenated:
 *     [ (1-alpha) * unit(textVec) ... , alpha * unit(structVec) ... ]
 * The DOT PRODUCT of two such concatenations is
 *     (1-alpha)^2 * cos(text, text') + alpha^2 * cos(struct, struct')
 * (true cosine after dividing by each concatenation's norm -- the per-vector norm cancels in kNN
 * ranking, which stays monotone in alpha as intended). So `alpha` directly trades text vs structural
 * agreement. alpha=0 -> text only (the baseline);
 * alpha=1 -> structural only. An all-zero structural block contributes 0, so the node degrades to
 * pure text -- the graceful zero-fallback the diagnostic called for.
 *
 * Pure. alpha is clamped to [0,1]. Returns number[] of length textVec.length + structVec.length.
 */
export function concatWeighted(textVec, structVec, alpha) {
  const a = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 0;
  const t = l2normalize(Array.isArray(textVec) ? textVec : []);
  const s = l2normalize(Array.isArray(structVec) ? structVec : []);
  const out = new Array(t.length + s.length);
  const wt = 1 - a;
  for (let i = 0; i < t.length; i++) out[i] = t[i] * wt;
  for (let j = 0; j < s.length; j++) out[t.length + j] = s[j] * a;
  return out;
}

/**
 * FS loader (the only impure surface): recursively walk `enginesDir` for engine source files and
 * return a Map of engineName -> sourceText keyed by basename (X.ts -> "X"). Excludes *.test.ts,
 * *.d.ts. On a duplicate basename (same engine name in two dirs) the first-seen wins (deterministic
 * via sorted walk). Engine class names are globally unique by convention, so this is defensive only.
 *
 * `opts.readdirImpl`/`opts.readFileImpl`/`opts.statImpl` are injectable for tests. Default reads
 * the real FS. Returns an empty Map when the dir is missing/unreadable (fail-soft, R12-honest: the
 * caller measures zero structural lift rather than crashing).
 *
 * @param {string} enginesDir
 * @param {{readdirImpl?:Function, readFileImpl?:Function, statImpl?:Function, maxFiles?:number}} [opts]
 */
export function loadEngineSources(enginesDir, opts = {}) {
  const out = new Map();
  if (typeof enginesDir !== "string" || enginesDir.length === 0) return out;
  const readdirImpl = typeof opts.readdirImpl === "function"
    ? opts.readdirImpl
    : (d) => fs.readdirSync(d, { withFileTypes: true });
  const readFileImpl = typeof opts.readFileImpl === "function"
    ? opts.readFileImpl
    : (p) => fs.readFileSync(p, "utf8");
  const statImpl = typeof opts.statImpl === "function" ? opts.statImpl : null;
  const maxFiles = Number.isFinite(opts.maxFiles) && opts.maxFiles > 0 ? opts.maxFiles : Infinity;

  const isEngineFile = (name) =>
    /Engine\.ts$/.test(name) &&
    !name.endsWith(".test.ts") &&
    !name.endsWith(".d.ts");

  // Iterative DFS so a deep tree never blows the call stack.
  const stack = [enginesDir];
  const files = [];
  while (stack.length > 0 && files.length < maxFiles) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirImpl(dir); } catch { continue; }
    if (!Array.isArray(entries)) continue;
    // Sort for deterministic first-seen-wins on duplicate basenames.
    const norm = entries
      .map((e) => normalizeDirent(e, dir, statImpl))
      .filter(Boolean)
      .sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
    for (const ent of norm) {
      if (ent.isDir) { stack.push(ent.full); continue; }
      if (isEngineFile(ent.name)) files.push(ent.full);
    }
  }
  files.sort();
  for (const full of files) {
    if (out.size >= maxFiles) break;
    const base = path.basename(full).replace(/\.ts$/i, "");
    if (out.has(base)) continue; // first-seen wins
    let src;
    try { src = readFileImpl(full); } catch { continue; }
    if (typeof src === "string") out.set(base, src);
  }
  return out;
}

/** Normalize a readdir entry (Dirent or plain string) into { name, full, isDir }. With a statImpl,
 *  string entries are stat'd to learn dir-ness; without one, a string with no extension is treated
 *  as a directory (best-effort). Dirent objects use their own isDirectory(). Internal helper. */
function normalizeDirent(e, dir, statImpl) {
  if (e && typeof e === "object" && typeof e.isDirectory === "function") {
    const name = e.name;
    if (typeof name !== "string" || name.length === 0) return null;
    return { name, full: path.join(dir, name), isDir: e.isDirectory() };
  }
  if (typeof e === "string") {
    const full = path.join(dir, e);
    let isDir = false;
    if (statImpl) {
      try { isDir = !!statImpl(full).isDirectory(); } catch { isDir = false; }
    } else {
      isDir = !path.extname(e); // no extension -> assume directory
    }
    return { name: e, full, isDir };
  }
  return null;
}
