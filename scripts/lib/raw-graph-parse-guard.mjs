// scripts/lib/raw-graph-parse-guard.mjs
//
// REGRESSION GUARD for the most destructive recurring PRISM bug class: a raw
// `JSON.parse(readFileSync(<merged-graph>, "utf8"))` on `system-graph.json`.
//
// The merged graph is ~875MB. `readFileSync(path, "utf8")` materializes it as ONE
// JS string, which throws V8's hard max-string-length error
// ("Cannot create a string longer than 0x1fffffe8") the moment the graph crosses
// 512MiB -- BEFORE JSON.parse even runs. This has bitten repeatedly (tribal-index
// V8 cap clobber, graph-OOM, build-business-value-map, augment-graph-with-awareness)
// and is fixed each time by routing through the cap-safe Buffer-incremental reader
// `readGraphStreaming` (scripts/lib/graph-io.mjs / system-viz-graph.mjs). But the
// fix is held only by CONVENTION -- nothing stops a future edit from reintroducing
// the raw read and silently breaking (or fatally crashing) a fleet hook/script.
//
// This pure scanner flags any script that reads the MERGED graph (`system-graph.json`)
// as a utf8 string feeding JSON.parse without using a cap-safe reader. The companion
// test asserts ZERO violations across scripts/, locking the class against regression.
//
// Karpathy discipline:
//   CLASSIFY: static-analysis regression guard (pure string scan)
//   TECHNIQUE: bind merged-graph path vars -> detect raw utf8 JSON.parse of them ->
//              exempt files that use the cap-safe reader
//   EDGE CASES: architecture-graph.json (small, OK), system-graph-index.json (sidecar,
//              handled by its own ceiling), const-then-use var aliasing, comments,
//              Buffer reads (no "utf8"), the cap-safe reader files themselves
//   FAILURE MODES: false positives (the small arch graph / the safe reader) excluded
//              explicitly; false negatives (deep aliasing) accepted -- the guard catches
//              the common direct + single-alias forms.

// Tokens that prove a file routes graph reads through the cap-safe path. A file using
// any of these is considered safe (exempt from the raw-parse flag).
const CAP_SAFE_TOKENS = Object.freeze([
  "readGraphStreaming",
  "graph-io",
  "system-viz-graph",
  "load-tribal-index",
  "loadGraphBuffer",
  "readGraphMeta",
]);

// Strip line + block comments so a commented example never trips the guard.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")        // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");   // line comments (avoid eating http://)
}

// A path string refers to the MERGED graph iff it contains system-graph.json and is
// NOT the small architecture graph or the sidecar index.
function isMergedGraphPath(s) {
  return /system-graph\.json/.test(s)
    && !/architecture-graph\.json/.test(s)
    && !/system-graph-index\.json/.test(s);
}

// Escape a JS identifier for safe embedding in a RegExp ('$' is a regex anchor).
function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Is `varName` ALSO used as a loop iterator / index variable anywhere in the
 * source? Such a name is SCOPE-AMBIGUOUS for a flat regex scanner (the same
 * identifier names different bindings in different scopes -- e.g.
 * `const path = ".../system-graph.json"` in one fn AND `for (const path of
 * candidates)` over small files in another). Excluding it kills the
 * false-positive class without weakening detection of a uniquely-named
 * merged-graph var. (Caught live on psn-synergy-collect.mjs, 2026-06-23.)
 * @param {string} src
 * @param {string} varName
 * @returns {boolean}
 */
export function isReusedAsLoopVar(src, varName) {
  const v = escapeForRegex(varName);
  // for (const path of ...) / for (let path = ...) / for (path of ...)
  return new RegExp(`for\\s*\\(\\s*(?:const|let|var\\s)?\\s*${v}\\b`).test(src);
}

/**
 * Variables (and a literal flag) bound to the MERGED graph path in this source.
 * Loop-reused names are dropped (scope-ambiguous -> false-positive source).
 * @param {string} src  comment-stripped source
 * @returns {{ vars: Set<string>, hasLiteral: boolean }}
 */
export function mergedGraphPathBindings(src) {
  const vars = new Set();
  let hasLiteral = false;
  const assignRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*system-graph\.json[^;\n]*)/g;
  for (const m of src.matchAll(assignRe)) {
    if (isMergedGraphPath(m[2]) && !isReusedAsLoopVar(src, m[1])) vars.add(m[1]);
  }
  const litRe = /["'`][^"'`]*system-graph\.json[^"'`]*["'`]/g;
  for (const m of src.matchAll(litRe)) {
    if (isMergedGraphPath(m[0])) hasLiteral = true;
  }
  return { vars, hasLiteral };
}

/**
 * Scan one source file for a raw utf8 JSON.parse of the MERGED graph.
 * @param {string} src       raw file source
 * @param {string} fileName  for the violation message
 * @returns {string[]}  violation messages (empty = clean)
 */
export function scanForRawGraphParse(src, fileName = "<src>") {
  if (typeof src !== "string" || src.length === 0) return [];
  const clean = stripComments(src);

  // Exempt: the file routes graph reads through a cap-safe reader.
  if (CAP_SAFE_TOKENS.some((t) => clean.includes(t))) return [];

  const { vars, hasLiteral } = mergedGraphPathBindings(clean);
  if (vars.size === 0 && !hasLiteral) return []; // never touches the merged graph

  const violations = [];
  const parseRe =
    /JSON\.parse\(\s*(?:await\s+)?(?:[\w$]+\.)?readFileSync\(\s*([A-Za-z_$][\w$.]*|["'`][^"'`]*["'`])\s*,\s*["']utf-?8["']/g;
  for (const m of clean.matchAll(parseRe)) {
    const arg = m[1];
    const argIsMergedVar = vars.has(arg);
    const argIsMergedLiteral = /["'`]/.test(arg) && isMergedGraphPath(arg);
    if (argIsMergedVar || argIsMergedLiteral) {
      violations.push(
        `${fileName}: raw JSON.parse(readFileSync(${arg}, "utf8")) on the MERGED system-graph.json `
        + `(~875MB -> V8 512MiB string-cap crash). Use readGraphStreaming (scripts/lib/graph-io.mjs).`,
      );
    }
  }
  return violations;
}

/**
 * Scan a directory of .mjs scripts (skipping *.test.mjs fixtures) for violations.
 * FLAT (non-recursive). Kept for back-compat; prefer scanTreeForRawGraphParse.
 * @param {string} dir
 * @param {(p:string)=>string} readFile  injectable for tests
 * @param {(d:string)=>string[]} listDir injectable for tests
 * @returns {string[]}
 */
export function scanDirForRawGraphParse(dir, readFile, listDir) {
  const out = [];
  let names;
  try { names = listDir(dir); } catch { return out; }
  for (const name of names) {
    if (!name.endsWith(".mjs") || name.endsWith(".test.mjs")) continue;
    let src;
    try { src = readFile(`${dir}/${name}`); } catch { continue; }
    out.push(...scanForRawGraphParse(src, `${dir}/${name}`));
  }
  return out;
}

// Dirs (relative to the repo root) where a raw merged-graph parse would bite an
// interactive hook / commit / script flow. Single source of truth so the CLI,
// the FLEET LOCK test, AND the PreToolUse commit guard all cover the SAME scope
// (the original scripts/-only scope missed the live bug in .claude/hooks).
export const SCAN_ROOTS_REL = Object.freeze([
  "scripts",
  ".claude/hooks",
  ".claude/helpers",
  "mcp-server/scripts",
]);

/** Absolute scan roots for a given repo root. */
export function defaultScanRoots(repoRoot) {
  return SCAN_ROOTS_REL.map((r) => `${repoRoot}/${r}`);
}

/**
 * Untracked scratch/temp files are NEVER committed code. Skip them so a stray
 * scratch violator dropped by any chat (e.g. a `.tmp-*.mjs` or `__tmp_*.mjs`
 * probe) cannot block EVERY commit fleet-wide via the whole-tree scan -- the
 * scanner is git-status-blind by design (scans disk, not the index), so the
 * scratch exclusion is what keeps that from becoming a cross-slot false-block.
 * (Scrutiny arm C P2, 2026-06-24.) Committed .mjs never start with `.`/`__tmp`.
 */
function isScratchName(name) {
  return name.startsWith(".") || name.startsWith("__tmp") || name.includes(".tmp-");
}

/**
 * Recursively scan a directory TREE of .mjs scripts for violations, skipping
 * *.test.mjs fixtures (they contain the pattern by design), node_modules/.git,
 * untracked scratch files, and symlinks (cycle / unbounded-walk guard).
 * @param {string} root
 * @param {(p:string)=>string} readFile      injectable for tests
 * @param {(d:string)=>Array<{name:string,isDir:boolean,isSymlink?:boolean}>} listEntries injectable for tests
 * @returns {string[]}
 */
export function scanTreeForRawGraphParse(root, readFile, listEntries) {
  const out = [];
  let ents;
  try { ents = listEntries(root); } catch { return out; }
  for (const e of ents) {
    if (!e || !e.name) continue;
    if (e.isSymlink) continue;             // never follow symlinks (cycle / escape the scoped tree)
    const p = `${root}/${e.name}`;
    if (e.isDir) {
      if (e.name === "node_modules" || e.name === ".git" || isScratchName(e.name)) continue;
      out.push(...scanTreeForRawGraphParse(p, readFile, listEntries));
    } else if (e.name.endsWith(".mjs") && !e.name.endsWith(".test.mjs") && !isScratchName(e.name)) {
      let src;
      try { src = readFile(p); } catch { continue; }
      out.push(...scanForRawGraphParse(src, p));
    }
  }
  return out;
}

// ── CLI lint mode ──────────────────────────────────────────────────────────
// `node scripts/lib/raw-graph-parse-guard.mjs` -> scan scripts/ + scripts/lib/,
// print violations, exit 1 if any (0 if clean). Usable in pre-commit / manual
// sweeps. Main-guarded so importing (e.g. from the test) never runs it: the test
// file ends with `.test.mjs`, which does not match this module's basename.
const _argv1 = (typeof process !== "undefined" && process.argv && process.argv[1]) || "";
if (_argv1.replace(/\\/g, "/").endsWith("scripts/lib/raw-graph-parse-guard.mjs")) {
  const { readFileSync, readdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const here = dirname(fileURLToPath(import.meta.url));   // scripts/lib
  const repoRoot = dirname(dirname(here));                 // repo root
  const rf = (p) => readFileSync(p, "utf8");
  const le = (d) => readdirSync(d, { withFileTypes: true }).map((e) => ({ name: e.name, isDir: e.isDirectory(), isSymlink: e.isSymbolicLink() }));
  const violations = defaultScanRoots(repoRoot).flatMap((root) => scanTreeForRawGraphParse(root, rf, le));
  if (violations.length > 0) {
    process.stderr.write(
      `[raw-graph-parse-guard] ${violations.length} violation(s) -- raw utf8 parse of the merged graph (512MiB string-cap crash):\n`
      + violations.map((v) => `  - ${v}`).join("\n") + "\n",
    );
    process.exit(1);
  }
  process.stdout.write("[raw-graph-parse-guard] clean -- no raw merged-graph parses.\n");
}
