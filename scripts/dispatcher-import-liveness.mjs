#!/usr/bin/env node
/**
 * dispatcher-import-liveness.mjs -- standing audit: does every NAMED import in a
 * dispatcher actually resolve to a real export of its target module?
 *
 * DISCOVERY-EFFICIENCY/U-DISPATCHER-IMPORT-LIVENESS (slot:tango, 2026-06-15).
 *
 * WHY THIS EXISTS (the bug it caught on first run): algorithmDispatcher.ts lazy-imports
 * `const { algorithmGatewayEngine } = await import("../../engines/AlgorithmGatewayEngine.js")`
 * and calls `algorithmGatewayEngine.<41 methods>` -- but AlgorithmGatewayEngine.ts NEVER
 * exports `algorithmGatewayEngine` (it exports the function `algorithmGateway` + standalone
 * fns). At runtime the destructured name is `undefined`, so ~40 prism_algorithm actions
 * throw `Cannot read properties of undefined`. The canonical algorithmDispatcher.test.ts has
 * been 13/14 RED since the 2026-04-23 "restore from Box canonical" -- undetected ~2 months.
 *
 * COMPLEMENTS, NOT DUPLICATES, `.claude/hooks/dispatcher-import-validator.mjs` (golf-owned):
 * that PostToolUse hook checks only that the imported engine FILE EXISTS
 * (`fs.existsSync(EngineName.ts)`). It does NOT check whether the imported NAME is exported --
 * which is exactly the gap that let this P0 hide (the file exists; the named export does not).
 * "existence != content." This tool fills that gap as a batch audit across every dispatcher.
 *
 * FALSE-POSITIVE DISCIPLINE (soul: never report coverage without naming what was dropped):
 * every imported name is classified LIVE / DEAD / INDETERMINATE. Only DEAD (target readable,
 * no matching export, NO `export *` wildcard in target, AND the name is actually USED in the
 * dispatcher) is the actionable signal. Unreadable target, a wildcard re-export, or an
 * unused import -> INDETERMINATE (named, never silently dropped, never a false DEAD).
 *
 * Pure core (injectable readDir/readFile) + a real-tree CLI. Filesystem reads only.
 *
 * CLI:
 *   node scripts/dispatcher-import-liveness.mjs              # human summary (DEAD first)
 *   node scripts/dispatcher-import-liveness.mjs --json       # machine-readable
 *   node scripts/dispatcher-import-liveness.mjs --dir <abs>  # override dispatcher dir
 *   node scripts/dispatcher-import-liveness.mjs --indeterminate  # also list INDETERMINATE
 *
 * @module scripts/dispatcher-import-liveness
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DISPATCHER_DIR_DEFAULT = path.join(REPO_ROOT, "mcp-server", "src", "tools", "dispatchers");

// ---------------------------------------------------------------------------
// Import extraction
// ---------------------------------------------------------------------------

/**
 * Extract NAMED imports from dispatcher source -- both the lazy
 * `const { A, B } = await import("path")` form and the static `import { A, B } from "path"`
 * form. Returns one record per import statement: { names, modPath, kind }.
 * Default imports (`import X from`) and namespace imports (`import * as X from`) are NOT
 * named-destructures and are out of scope (their member access cannot be checked the same
 * way); they are deliberately skipped, not silently mis-flagged.
 *
 * @param {string} src dispatcher source
 * @returns {Array<{names: string[], modPath: string, kind: "lazy"|"static"}>}
 */
export function extractNamedImports(src) {
  const out = [];
  if (typeof src !== "string" || !src) return out;

  // Lazy: const { A, B } = await import("path")   (also `let`/`var`)
  const lazyRe = /(?:const|let|var)\s*\{\s*([^}]+?)\s*\}\s*=\s*await\s+import\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of src.matchAll(lazyRe)) {
    const bindings = splitImportBindings(m[1]);
    if (bindings.length) out.push({ bindings, modPath: m[2], kind: "lazy" });
  }

  // Static: import { A, B } from "path"   (skip `import type { ... }` -- erased at runtime)
  const staticRe = /import\s+(type\s+)?\{\s*([^}]+?)\s*\}\s*from\s*["']([^"']+)["']/g;
  for (const m of src.matchAll(staticRe)) {
    if (m[1]) continue; // type-only import -- no runtime binding to check
    const bindings = splitImportBindings(m[2]);
    if (bindings.length) out.push({ bindings, modPath: m[3], kind: "static" });
  }

  return out;
}

/**
 * Split an import clause body ("A, B as C, type D") into { imported, local } binding pairs.
 * For a plain name `A` both are `A`. For `orig as local` the IMPORTED (export-side) name is
 * `orig` and the LOCAL (call-site) binding is `local` -- these MUST be tracked separately:
 * liveness is checked against the target's exports using `imported`, while call-site usage is
 * checked using `local`. (Conflating them mis-flags every working alias as DEAD -- the
 * false-positive class this tool exists to never produce.) Inline `type` markers are dropped.
 * @param {string} clause
 * @returns {Array<{imported: string, local: string}>}
 */
function splitImportBindings(clause) {
  return clause
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^type\s/.test(s)) // inline `type X` -- erased
    .map((s) => {
      const t = s.replace(/^type\s+/, "").trim();
      const asMatch = t.match(/^([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)$/);
      if (asMatch) return { imported: asMatch[1], local: asMatch[2] };
      return { imported: t, local: t };
    })
    .filter((b) => /^[A-Za-z0-9_$]+$/.test(b.imported) && /^[A-Za-z0-9_$]+$/.test(b.local));
}

// ---------------------------------------------------------------------------
// Target module export parsing
// ---------------------------------------------------------------------------

/**
 * Parse the set of names a module source EXPORTS, plus whether it has a wildcard
 * `export * from` re-export (which makes any unmatched name INDETERMINATE, not DEAD).
 * Mirrors the regex-export approach used by dispatcher-registration-coverage.mjs.
 *
 * @param {string} targetSrc
 * @returns {{ names: Set<string>, hasWildcard: boolean, hasDefault: boolean }}
 */
export function parseModuleExports(targetSrc) {
  const names = new Set();
  let hasWildcard = false;
  let hasDefault = false;
  if (typeof targetSrc !== "string" || !targetSrc) return { names, hasWildcard, hasDefault };

  // export const/let/var/function/async function/class/abstract class/interface/type/enum NAME
  const declRe = /export\s+(?:async\s+)?(?:const|let|var|function|class|abstract\s+class|interface|type|enum)\s+([A-Za-z0-9_$]+)/g;
  for (const m of targetSrc.matchAll(declRe)) names.add(m[1]);

  // export { A, B as C } [from "..."]  -> exported name is C (after `as`) else A
  const listRe = /export\s*\{\s*([^}]+?)\s*\}/g;
  for (const m of targetSrc.matchAll(listRe)) {
    for (const part of m[1].split(",")) {
      const t = part.trim();
      if (!t || t === "default") continue;
      const asMatch = t.match(/\bas\s+([A-Za-z0-9_$]+)\s*$/);
      const name = asMatch ? asMatch[1] : t.replace(/^type\s+/, "").trim();
      if (/^[A-Za-z0-9_$]+$/.test(name)) names.add(name);
    }
  }

  if (/export\s*\*\s*from/.test(targetSrc)) hasWildcard = true;
  if (/export\s+default\b/.test(targetSrc)) hasDefault = true;

  return { names, hasWildcard, hasDefault };
}

/**
 * Is a binding USED in the dispatcher beyond its import -- as a member access (`name.`),
 * a call (`name(`), or an index (`name[`)? An imported-but-unused name is not an actionable
 * runtime bug.
 * @param {string} src
 * @param {string} name
 * @returns {boolean}
 */
export function isNameUsed(src, name) {
  if (typeof src !== "string" || !name) return false;
  const escaped = name.replace(/[$]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\s*[.(\\[]`);
  return re.test(src);
}

/**
 * Resolve a relative import specifier (./ or ../, possibly `.js`) to candidate `.ts` files.
 * Bare package specifiers (no leading dot) are NOT resolvable here -> return null (skip).
 * @param {string} modPath
 * @param {string} fromFileAbs absolute path of the importing dispatcher
 * @returns {string[]|null} candidate absolute paths, or null for bare specifiers
 */
export function resolveTargetPath(modPath, fromFileAbs) {
  if (!modPath || !/^\.\.?\//.test(modPath)) return null; // only relative specifiers
  const base = path.resolve(path.dirname(fromFileAbs), modPath);
  if (base.endsWith(".js")) {
    return [base.replace(/\.js$/, ".ts"), base.replace(/\.js$/, ".tsx")];
  }
  return [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze one dispatcher's named imports for liveness.
 * @param {{ file: string, src: string, readFile: (p: string) => (string|null) }} args
 * @returns {{ file: string, dead: Array, indeterminate: Array, liveCount: number }}
 */
export function analyzeDispatcher({ file, src, readFile }) {
  const dead = [];
  const indeterminate = [];
  let liveCount = 0;

  const imports = extractNamedImports(src);
  const exportCache = new Map(); // module-path -> { parsed, resolvedPath }

  for (const imp of imports) {
    const candidates = resolveTargetPath(imp.modPath, file);
    let parsed = null;
    let resolvedPath = null;
    if (candidates) {
      const cacheKey = candidates.join("|");
      if (exportCache.has(cacheKey)) {
        ({ parsed, resolvedPath } = exportCache.get(cacheKey));
      } else {
        for (const c of candidates) {
          const t = readFile(c);
          if (t != null) { parsed = parseModuleExports(t); resolvedPath = c; break; }
        }
        exportCache.set(cacheKey, { parsed, resolvedPath });
      }
    }

    for (const b of imp.bindings) {
      // Liveness is decided on the IMPORTED (export-side) name; call-site usage on LOCAL.
      const rec = (extra) => ({ name: b.imported, local: b.local === b.imported ? undefined : b.local, modPath: imp.modPath, kind: imp.kind, ...extra });
      if (!parsed) {
        indeterminate.push(rec({ reason: candidates ? "target-unreadable" : "bare-specifier" }));
        continue;
      }
      if (parsed.names.has(b.imported)) { liveCount++; continue; }
      if (parsed.hasWildcard) {
        indeterminate.push(rec({ reason: "wildcard-reexport-in-target", resolvedPath }));
        continue;
      }
      if (!isNameUsed(src, b.local)) {
        indeterminate.push(rec({ reason: "imported-but-unused", resolvedPath }));
        continue;
      }
      // target readable, imported name not exported, no wildcard, AND the local binding is used -> DEAD
      dead.push(rec({ resolvedPath }));
    }
  }

  return { file: path.basename(file), dead, indeterminate, liveCount };
}

/**
 * Scan every dispatcher in a directory.
 * @param {{ dir?: string, readDir?: (d: string) => string[], readFile?: (p: string) => (string|null) }} [opts]
 * @returns {{ dir: string, scanned: number, dispatchers: Array, deadTotal: number, dead: Array }}
 */
export function scanDispatchers(opts = {}) {
  const dir = opts.dir || DISPATCHER_DIR_DEFAULT;
  const readDir = opts.readDir || ((d) => { try { return fs.readdirSync(d); } catch { return []; } });
  const readFile = opts.readFile || ((p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } });

  const files = readDir(dir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && /[Dd]ispatcher/.test(f));

  const dispatchers = [];
  const dead = [];
  for (const f of files) {
    const abs = path.join(dir, f);
    const src = readFile(abs);
    if (src == null) continue;
    const res = analyzeDispatcher({ file: abs, src, readFile });
    dispatchers.push(res);
    for (const d of res.dead) dead.push({ file: res.file, ...d });
  }

  return { dir, scanned: dispatchers.length, dispatchers, deadTotal: dead.length, dead };
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
    return result.deadTotal > 0 ? 1 : 0;
  }

  console.log(`dispatcher-import-liveness -- scanned ${result.scanned} dispatcher(s) in ${path.relative(REPO_ROOT, result.dir)}`);
  console.log(`DEAD named imports (runtime-undefined, name is used): ${result.deadTotal}\n`);
  if (result.deadTotal === 0) {
    console.log("  (none -- every used named import resolves to a real export)");
  } else {
    for (const d of result.dead) {
      console.log(`  DEAD  ${d.file}: { ${d.name} } from ${d.modPath} (${d.kind}) -- target has no such export`);
    }
  }
  if (showIndeterminate) {
    const ind = result.dispatchers.flatMap((p) => p.indeterminate.map((i) => ({ file: p.file, ...i })));
    console.log(`\nINDETERMINATE (named, not actionable as DEAD): ${ind.length}`);
    for (const i of ind) console.log(`  ?     ${i.file}: { ${i.name} } from ${i.modPath} -- ${i.reason}`);
  }
  return result.deadTotal > 0 ? 1 : 0;
}

const invokedPath = process.argv[1] ? process.argv[1].replace(/\\/g, "/") : "";
if (import.meta.url === `file://${invokedPath}` || import.meta.url === `file:///${invokedPath}`) {
  process.exit(runCLI(process.argv.slice(2)));
}
