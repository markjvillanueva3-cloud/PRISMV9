#!/usr/bin/env node
/**
 * audit-dispatcher-engine-methods.mjs -- standing audit: does every METHOD a
 * dispatcher calls on a resolved engine actually exist on that engine's class?
 *
 * [BACKEND-INTEGRITY]/U-DISPATCHER-ENGINE-METHOD-AUDIT (slot:bravo, 2026-06-22).
 *
 * THE THIRD SIBLING of the dispatcher-integrity family -- it catches a class of
 * silent runtime bug that the other two CANNOT:
 *   - audit-dispatcher-ghost-actions.mjs (romeo): action in enum has NO handler.
 *   - dispatcher-import-liveness.mjs (tango): imported NAME is not exported.
 *   - THIS: handler exists + import/getEngine resolves, but the handler calls a
 *     METHOD that does not exist on the resolved engine -> "<fn> is not a
 *     function" at runtime. tsc is blind because getEngine() returns `any` and
 *     lazy-imported engines are commonly typed `any`.
 *
 * WHY IT EXISTS (the bug it caught on first run): camDispatcher's 5 CK-MS11 probe
 * actions called generateWCSSetup/generateFirstArticle/generateInProcessCheck/
 * generateToolMeasure/generateAutoComp on ProbingProgramEngine, which only
 * implements generate(). All 5 threw at runtime; both sibling detectors passed
 * them (handler present; engine export present). Fixed in U-CK-MS11-PROBE-WIRE-FIX;
 * this tool generalizes the detection fleet-wide.
 *
 * SCOPE / PATTERN: the camDispatcher-style local indirection
 *   case "key": return _v ??= (await import("../../engines/Foo.js")).fooEngine;
 *   ...
 *   const eng = await getEngine("key");  eng.someMethod(...)
 * is the primary target (import-liveness does NOT cover this -- the imported name
 * IS exported; only the downstream method is wrong). Direct named-import method
 * calls (`const { fooEngine } = await import(...); fooEngine.method(...)`) are a
 * secondary pass.
 *
 * FALSE-POSITIVE DISCIPLINE (soul: never report a finding you can't stand behind):
 * a (engine, method) pair is LIVE / MISSING / INDETERMINATE. MISSING (actionable)
 * requires: engine file readable AND method absent from the class body AND the
 * full `extends` chain is resolvable-and-also-absent. Any unresolvable base class,
 * a non-class singleton, an `index` barrel, or a dynamically-shaped engine ->
 * INDETERMINATE (named, never a false MISSING). Method forms recognized:
 * `m(`, `async m(`, `get m(`, `set m(`, `static m(`, `m = (`, `m = async`,
 * `m: function`, `m: (` (object-literal singletons), plus `this.m =` constructor
 * assignment. Common Object/base members are whitelisted.
 *
 * Pure core (injectable readFile) + real-tree CLI. Filesystem reads only.
 *
 * CLI:
 *   node scripts/audit-dispatcher-engine-methods.mjs            # human summary (MISSING first)
 *   node scripts/audit-dispatcher-engine-methods.mjs --json     # machine-readable
 *   node scripts/audit-dispatcher-engine-methods.mjs --dir <abs>
 *   node scripts/audit-dispatcher-engine-methods.mjs --indeterminate
 *
 * @module scripts/audit-dispatcher-engine-methods
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DISPATCHER_DIR_DEFAULT = path.join(REPO_ROOT, "mcp-server", "src", "tools", "dispatchers");

// Members present on every object/engine that must never be flagged MISSING.
const UNIVERSAL_MEMBERS = new Set([
  "constructor", "toString", "valueOf", "hasOwnProperty", "then", "catch",
  "finally", "call", "apply", "bind", "name", "length",
]);

// ---------------------------------------------------------------------------
// getEngine("key") -> engine module path map (camDispatcher local indirection)
// ---------------------------------------------------------------------------

/**
 * Parse `case "key": return _v ??= (await import("path")).export;` lines into a
 * key -> { modPath, exportName } map. Tolerates `=` / `||=` / `??=` and optional
 * `.export` (a bare `(await import("p"))` resolves to the module namespace).
 * @param {string} src
 * @returns {Map<string, {modPath: string, exportName: string|null}>}
 */
export function parseGetEngineMap(src) {
  const map = new Map();
  if (typeof src !== "string") return map;
  const re = /case\s+["']([^"']+)["']\s*:\s*return\s+[A-Za-z0-9_$]+\s*(?:\?\?=|\|\|=|=)\s*\(await\s+import\(\s*["']([^"']+)["']\s*\)\)(?:\.([A-Za-z0-9_$]+))?/g;
  for (const m of src.matchAll(re)) {
    map.set(m[1], { modPath: m[2], exportName: m[3] ?? null });
  }
  return map;
}

/**
 * Find `const X = await getEngine("key")` bindings -> var name -> key.
 * @param {string} src
 * @returns {Array<{varName: string, key: string, index: number}>}
 */
export function parseGetEngineBindings(src) {
  const out = [];
  if (typeof src !== "string") return out;
  const re = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*await\s+getEngine\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of src.matchAll(re)) out.push({ varName: m[1], key: m[2], index: m.index ?? 0 });
  return out;
}

/**
 * Collect `<varName>.method(` calls in the window after a binding (until the next
 * getEngine binding or a reasonable cap), so a call is attributed to the right key.
 *
 * Line comments (`// ...`) are stripped before scanning so that a method name
 * mentioned only in a comment (e.g. `// engine.classify() FAIL-LOUD`) does not
 * produce a false MISSING finding against the wrong engine key.
 * @param {string} src
 * @param {string} varName
 * @param {number} from start index
 * @param {number} to end index (exclusive)
 * @returns {Set<string>}
 */
export function methodsCalledOnVar(src, varName, from, to) {
  const methods = new Set();
  // Strip single-line comments to avoid matching method names in comment text.
  const slice = src.slice(from, to).replace(/\/\/[^\n]*/g, "");
  const escaped = varName.replace(/[$]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\.([A-Za-z0-9_$]+)\\s*\\(`, "g");
  for (const m of slice.matchAll(re)) methods.add(m[1]);
  return methods;
}

// ---------------------------------------------------------------------------
// Engine class method parsing (+ one-level-deep extends resolution)
// ---------------------------------------------------------------------------

/**
 * Parse the method names an engine source defines, plus its `extends` base (if any)
 * and a flag for whether a usable class/object body was found.
 *
 * Recognized forms (in addition to class bodies):
 *
 * 1. Object-literal singleton exports:
 *      export const fooEngine = { compute, run: runImpl, analyze: analyzeImpl }
 *    Both shorthand keys (compute) and key:value keys (run: runImpl,
 *    analyze: (input) => ...) are extracted. shaped is set to true so the
 *    engine is not classified as engine-not-class-shaped (which would push
 *    every caller to INDETERMINATE instead of a real MISSING finding).
 *
 * 2. Top-level function / const declarations that back object-literal keys:
 *      export function compute(...) { ... }
 *      export const compute = (input) => ...
 *      function runImpl(...) { ... }
 *      const runImpl = async (...) => ...
 *    Extracted so shorthand keys are recognized even when the name only appears
 *    as a top-level declaration rather than an inline literal key.
 *
 * FALSE-POSITIVE DISCIPLINE: never widen so aggressively that a genuinely
 * absent method disappears. Object-literal key extraction only fires inside
 * export const NAME = { ... } blocks; top-level declarations are extracted by
 * anchored line-start patterns to avoid matching call expressions mid-line.
 *
 * @param {string} src
 * @returns {{ methods: Set<string>, baseClass: string|null, shaped: boolean }}
 */
export function parseEngineMethods(src) {
  const methods = new Set();
  let baseClass = null;
  let shaped = false;
  if (typeof src !== "string" || !src) return { methods, baseClass, shaped };

  const cls = src.match(/class\s+[A-Za-z0-9_$]+\s+extends\s+([A-Za-z0-9_$]+)/);
  if (cls) baseClass = cls[1];
  if (/\bclass\s+[A-Za-z0-9_$]+/.test(src)) shaped = true;

  // method() / async method() / get|set method() / static method() / public|private|protected method(
  const methodRe = /(?:^|\n)\s*(?:public\s+|private\s+|protected\s+|readonly\s+|static\s+|async\s+|get\s+|set\s+|override\s+)*([A-Za-z0-9_$]+)\s*(?:<[^>]*>)?\s*\(/g;
  for (const m of src.matchAll(methodRe)) {
    const n = m[1];
    if (!isKeyword(n)) { methods.add(n); shaped = true; }
  }
  // arrow / function-valued class fields + object-literal members:
  //   method = (..) => | method = async | method = function | method: (..) => | method: async | method: function
  const fieldRe = /(?:^|\n)\s*(?:public\s+|private\s+|protected\s+|readonly\s+|static\s+)*([A-Za-z0-9_$]+)\s*[:=]\s*(?:async\s+)?(?:function\b|\([^;=]*\)\s*(?::[^={]+)?=>|\<)/g;
  for (const m of src.matchAll(fieldRe)) {
    const n = m[1];
    if (!isKeyword(n)) { methods.add(n); shaped = true; }
  }
  // constructor assignment: this.method = (..)=> | this.method = function
  const thisRe = /\bthis\.([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:function\b|\([^;=]*\)\s*=>|[A-Za-z0-9_$.]+\s*;)/g;
  for (const m of src.matchAll(thisRe)) methods.add(m[1]);

  // -------------------------------------------------------------------------
  // Object-literal singleton exports:
  //   export const fooEngine = { compute, run: runImpl, analyze: fn, ... };
  //
  // Scan every `export const NAME = {` block and extract all keys from the
  // immediate brace body (stopping at the matching closing brace). Both
  // shorthand keys (compute,) and key:value keys (run: runImpl,) are
  // extracted. The key IS the public method name the dispatcher will call.
  // -------------------------------------------------------------------------
  const objExportRe = /\bexport\s+const\s+[A-Za-z0-9_$]+\s*=\s*\{/g;
  for (const startMatch of src.matchAll(objExportRe)) {
    // startMatch[0] ends with '{'; openBrace is its index
    const openBrace = startMatch.index + startMatch[0].length - 1;
    // Walk forward to find the matching closing brace (depth 1 = inside the block).
    let depth = 1;
    let i = openBrace + 1;
    while (i < src.length && depth > 0) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
      i++;
    }
    const body = src.slice(openBrace + 1, i - 1); // content between the braces

    // Extract each property key by splitting on commas (handles both single-line
    // and multi-line object bodies without lookahead-whitespace edge cases).
    // Accepted forms:
    //   shorthand:  compute   technologyWizard   run
    //   key:value:  run: runImpl   analyze: analyzePostProcessor
    //               name: "string"   version: "1.0"   actions: [...]
    // Skip metadata-only values (string/number/array/boolean literals).
    const tokens = body.split(",").map((t) => t.trim()).filter(Boolean);
    for (const tok of tokens) {
      // key:value form -- identifier followed by colon
      const kv = tok.match(/^([A-Za-z0-9_$]+)\s*:\s*([\s\S]+)$/);
      if (kv) {
        const key = kv[1];
        if (!key || isKeyword(key)) continue;
        const val = kv[2].trim();
        if (/^["'`]/.test(val)) continue;                           // string literal
        if (/^\d/.test(val)) continue;                              // number literal
        if (/^\[/.test(val)) continue;                              // array literal
        if (/^(?:true|false|null|undefined)\b/.test(val)) continue; // boolean/null
        methods.add(key);
        shaped = true;
        continue;
      }
      // shorthand form -- token is just an identifier (no colon)
      const sh = tok.match(/^([A-Za-z0-9_$]+)$/);
      if (sh) {
        const key = sh[1];
        if (!key || isKeyword(key)) continue;
        methods.add(key);
        shaped = true;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Top-level function / const declarations (back object-literal shorthand
  // keys and also appear as standalone exported functions).
  //   export function compute(...) { ... }
  //   function runImpl(...) { ... }
  //   export const compute = (async )? ((...) => | function)
  //   const runImpl = async (...) => ...
  // Anchored to line-start to avoid matching call expressions mid-line.
  // -------------------------------------------------------------------------
  const topFnRe = /(?:^|\n)(?:export\s+)?function\s+([A-Za-z0-9_$]+)\s*[(<]/gm;
  for (const m of src.matchAll(topFnRe)) {
    const n = m[1];
    if (!isKeyword(n)) methods.add(n);
  }
  const topConstRe = /(?:^|\n)(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*(?::\s*[^=>{]+)?\s*=>)/gm;
  for (const m of src.matchAll(topConstRe)) {
    const n = m[1];
    if (!isKeyword(n)) methods.add(n);
  }

  return { methods, baseClass, shaped };
}

// ONLY pure statement keywords that appear as `KW (` at line start (e.g. `if (`,
// `return (`). Excluding a real method NAME here would cause a false MISSING (the
// dangerous direction) -- so value/declaration keywords that are ALSO valid method
// names (export, type, enum, delete, get, set, ...) are deliberately NOT listed.
// Accidentally capturing a statement keyword as a "method" only enlarges the engine
// method set (a harmless superset), so this set is kept minimal on purpose.
const KEYWORDS = new Set([
  "if", "for", "while", "switch", "catch", "return", "throw", "do",
]);
function isKeyword(n) { return KEYWORDS.has(n); }

// ---------------------------------------------------------------------------
// Module resolution
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Advisory "did-you-mean" candidate ranking for a MISSING finding
// ---------------------------------------------------------------------------

function _bigrams(s) {
  const t = String(s).toLowerCase(); const out = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
}
function _dice(a, b) {
  const A = _bigrams(a), B = _bigrams(b);
  if (!A.length || !B.length) return 0;
  const bc = new Map();
  for (const g of B) bc.set(g, (bc.get(g) || 0) + 1);
  let inter = 0;
  for (const g of A) { const n = bc.get(g) || 0; if (n > 0) { inter++; bc.set(g, n - 1); } }
  return (2 * inter) / (A.length + B.length);
}
function _camelHead(s) { return (String(s).match(/^[a-z]+/) || [""])[0]; }

/** Name-similarity in [0,1]: Dice bigram overlap + containment + shared verb head. */
export function nameSimilarity(a, b) {
  const la = String(a).toLowerCase(), lb = String(b).toLowerCase();
  if (!la || !lb) return 0;
  let s = _dice(la, lb);
  if (la.includes(lb) || lb.includes(la)) s += 0.25;            // one contains the other
  const ha = _camelHead(a); if (ha && ha === _camelHead(b)) s += 0.1; // shared verb head (get/set/...)
  return Math.min(1, s);
}

/**
 * Rank an engine's methods by name-similarity to the CALLED method, for an
 * ADVISORY "did you mean" on a MISSING finding. This NEVER reclassifies
 * MISSING->LIVE (that would risk a false-green); it only suggests re-point
 * targets for a human/owner to VERIFY semantically before re-pointing.
 * @param {string} called
 * @param {Iterable<string>} methods
 * @param {number} [limit=3]
 * @returns {Array<{method: string, score: number}>}
 */
export function rankCandidates(called, methods, limit = 3) {
  return [...methods]
    .filter((m) => !KEYWORDS.has(m) && m !== "constructor")
    .map((m) => ({ method: m, score: Math.round(nameSimilarity(called, m) * 100) / 100 }))
    .filter((c) => c.score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Resolve a relative `.js` specifier to candidate `.ts` paths. */
export function resolveEnginePath(modPath, fromFileAbs) {
  if (!modPath || !/^\.\.?\//.test(modPath)) return null;
  const base = path.resolve(path.dirname(fromFileAbs), modPath);
  if (base.endsWith(".js")) return [base.replace(/\.js$/, ".ts"), base.replace(/\.js$/, ".tsx")];
  return [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
}

/**
 * Build the full method set of an engine, following one+ levels of `extends`.
 * Returns { methods, resolvable } -- resolvable=false if any base in the chain
 * could not be read (so a missing method is INDETERMINATE, not MISSING).
 * @param {string} startSrc engine source
 * @param {string} startFileAbs absolute path of the engine file
 * @param {(p:string)=>(string|null)} readFile
 * @returns {{ methods: Set<string>, resolvable: boolean, shaped: boolean }}
 */
export function collectEngineMethods(startSrc, startFileAbs, readFile, depth = 0) {
  const { methods, baseClass, shaped } = parseEngineMethods(startSrc);
  if (!baseClass || baseClass === "Object" || depth >= 4) {
    return { methods, resolvable: true, shaped };
  }
  // Resolve base via its import specifier in the same file.
  const impRe = new RegExp(`import\\s*\\{[^}]*\\b${baseClass}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`);
  const im = startSrc.match(impRe);
  if (!im) return { methods, resolvable: false, shaped };
  const cands = resolveEnginePath(im[1], startFileAbs);
  if (!cands) return { methods, resolvable: false, shaped };
  for (const c of cands) {
    const t = readFile(c);
    if (t != null) {
      const sub = collectEngineMethods(t, c, readFile, depth + 1);
      for (const mm of sub.methods) methods.add(mm);
      return { methods, resolvable: sub.resolvable, shaped: shaped || sub.shaped };
    }
  }
  return { methods, resolvable: false, shaped };
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze one dispatcher for engine-method existence (getEngine indirection pattern).
 * @param {{ file: string, src: string, readFile: (p:string)=>(string|null) }} args
 * @returns {{ file: string, missing: Array, indeterminate: Array, liveCount: number }}
 */
export function analyzeDispatcher({ file, src, readFile }) {
  const missing = [];
  const indeterminate = [];
  let liveCount = 0;

  const keyMap = parseGetEngineMap(src);
  const bindings = parseGetEngineBindings(src).sort((a, b) => a.index - b.index);
  const engineCache = new Map(); // modPath -> { methods, resolvable, shaped, resolvedPath } | null

  for (let i = 0; i < bindings.length; i++) {
    const b = bindings[i];
    const to = i + 1 < bindings.length ? bindings[i + 1].index : src.length;
    const called = methodsCalledOnVar(src, b.varName, b.index, to);
    if (called.size === 0) continue;

    const target = keyMap.get(b.key);
    if (!target) { // getEngine key not in the local map -> can't resolve
      for (const mth of called) indeterminate.push({ key: b.key, method: mth, reason: "key-not-in-getEngine-map" });
      continue;
    }

    let eng = engineCache.get(target.modPath);
    if (eng === undefined) {
      const cands = resolveEnginePath(target.modPath, file);
      eng = null;
      if (cands) {
        for (const c of cands) {
          const t = readFile(c);
          if (t != null) {
            const collected = collectEngineMethods(t, c, readFile);
            eng = { ...collected, resolvedPath: c };
            break;
          }
        }
      }
      engineCache.set(target.modPath, eng);
    }

    for (const mth of called) {
      if (UNIVERSAL_MEMBERS.has(mth)) { liveCount++; continue; }
      if (!eng) { indeterminate.push({ key: b.key, method: mth, modPath: target.modPath, reason: "engine-unreadable" }); continue; }
      if (!eng.shaped) { indeterminate.push({ key: b.key, method: mth, modPath: target.modPath, reason: "engine-not-class-shaped" }); continue; }
      if (eng.methods.has(mth)) { liveCount++; continue; }
      if (!eng.resolvable) { indeterminate.push({ key: b.key, method: mth, modPath: target.modPath, reason: "unresolved-base-class" }); continue; }
      missing.push({
        key: b.key, method: mth, modPath: target.modPath,
        engine: path.basename(eng.resolvedPath),
        candidates: rankCandidates(mth, eng.methods), // ADVISORY did-you-mean (verify before re-pointing)
      });
    }
  }

  return { file: path.basename(file), missing, indeterminate, liveCount };
}

/** Scan every dispatcher in a directory. */
export function scanDispatchers(opts = {}) {
  const dir = opts.dir || DISPATCHER_DIR_DEFAULT;
  const readDir = opts.readDir || ((d) => { try { return fs.readdirSync(d); } catch { return []; } });
  const readFile = opts.readFile || ((p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } });

  const files = readDir(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && /[Dd]ispatcher/.test(f));
  const dispatchers = [];
  const missing = [];
  for (const f of files) {
    const abs = path.join(dir, f);
    const src = readFile(abs);
    if (src == null) continue;
    const res = analyzeDispatcher({ file: abs, src, readFile });
    dispatchers.push(res);
    for (const mm of res.missing) missing.push({ file: res.file, ...mm });
  }
  return { dir, scanned: dispatchers.length, dispatchers, missingTotal: missing.length, missing };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function runCLI(argv) {
  const json = argv.includes("--json");
  const showIndeterminate = argv.includes("--indeterminate");
  const dirIdx = argv.indexOf("--dir");
  const dir = dirIdx >= 0 ? argv[dirIdx + 1] : undefined;

  const result = scanDispatchers(dir ? { dir } : {});

  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return result.missingTotal > 0 ? 1 : 0;
  }

  console.log(`audit-dispatcher-engine-methods -- scanned ${result.scanned} dispatcher(s) in ${path.relative(REPO_ROOT, result.dir)}`);
  console.log(`MISSING methods (handler calls a method the resolved engine does not define): ${result.missingTotal}\n`);
  if (result.missingTotal === 0) {
    console.log("  (none -- every getEngine(key).method() call resolves to a real method)");
  } else {
    for (const mm of result.missing) {
      const did = mm.candidates && mm.candidates.length
        ? `  did-you-mean: ${mm.candidates.map((c) => `${c.method}(${c.score})`).join(", ")}`
        : "  (no similar method -- likely a genuinely-missing capability)";
      console.log(`  MISSING  ${mm.file}: getEngine("${mm.key}").${mm.method}() -- ${mm.engine} has no such method`);
      console.log(did);
    }
  }
  if (showIndeterminate) {
    const ind = result.dispatchers.flatMap((p) => p.indeterminate.map((i) => ({ file: p.file, ...i })));
    console.log(`\nINDETERMINATE (named, not actionable): ${ind.length}`);
    for (const i of ind) console.log(`  ?     ${i.file}: getEngine("${i.key}").${i.method}() -- ${i.reason}`);
  }
  return result.missingTotal > 0 ? 1 : 0;
}

const invokedPath = process.argv[1] ? process.argv[1].replace(/\\/g, "/") : "";
if (import.meta.url === `file://${invokedPath}` || import.meta.url === `file:///${invokedPath}`) {
  process.exit(runCLI(process.argv.slice(2)));
}
