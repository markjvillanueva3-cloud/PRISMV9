#!/usr/bin/env node
/**
 * algorithm-dispatcher-coverage -- find algorithm modules in mcp-server/src/algorithms/
 * that are DORMANT: not referenced (consumed) anywhere in src/ and not re-exported
 * by the algorithms barrel. The romeo-relevant "is this algorithm wired into the
 * system at all" signal -- the verified basis for the work order's "~20 dormant
 * algorithms to wire to prism_algorithm".
 *
 * DISCOVERY-EFFICIENCY/U-ALGORITHM-COVERAGE-DIFF (slot:tango, 2026-06-15).
 *
 * Why a pure-node fs walk (not a shell grep): an external grep is unreliable here --
 * it can fail silently on Windows (PATH resolution) and return an empty set, falsely
 * flagging every module dormant. The pure walk has no platform dependency. Tango's
 * law: verify-on-disk.
 *
 * "Referenced" = the literal token `algorithms/<Name>` appears in any .ts file in
 * src/ (how engines / dispatchers / registries / sibling algorithms import via a
 * relative path containing algorithms/). "Barrel-exported" = re-exported by
 * algorithms/index.ts (reachable via the public API surface). Dormant = neither.
 *
 * Note: a consumer importing ONLY through the barrel (`from "../algorithms"`, no
 * `/Name`) is captured by the barrel check, not the path check -- so barrel
 * membership counts as wired (a deliberate, documented proxy; see --strict to
 * require a direct path reference instead).
 *
 * Pure core + thin CLI (mirrors scripts/hub-blast-radius-rank.mjs).
 *
 * Usage: node scripts/algorithm-dispatcher-coverage.mjs [--src <dir>] [--strict] [--json]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DEFAULT_SRC = join(REPO_ROOT, "mcp-server", "src");

// Non-algorithm files that live in src/algorithms/ (barrel + shared types).
const NON_ALGORITHM_FILES = new Set(["index.ts", "types.ts"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage"]);

/** List algorithm module base-names (no .ts), excluding tests + barrel/types. Reads the dir. */
export function listAlgorithmModules(algoDir) {
  return readdirSync(algoDir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !NON_ALGORITHM_FILES.has(f))
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();
}

/** Recursively collect .ts file paths under dir (skips node_modules/dist/etc). */
export function walkTsFiles(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walkTsFiles(join(dir, ent.name), acc);
    } else if (ent.name.endsWith(".ts")) {
      acc.push(join(dir, ent.name));
    }
  }
  return acc;
}

/**
 * Set of algorithm names referenced via a path token `algorithms/<Name>` anywhere
 * in the supplied .ts files. Pure over the provided readFile + file list.
 */
export function computeReferenced(files, readFile = (f) => readFileSync(f, "utf8")) {
  const referenced = new Set();
  // Import-context only: `from "...algorithms/X"` or `import("...algorithms/X")`.
  // A bare token (a comment, a catalog string) is NOT a wiring -- so "wired" means
  // actually imported, not merely mentioned (R12: do not overclaim wired).
  const re = /(?:from|import)\s*\(?\s*["'][^"']*algorithms\/([A-Za-z0-9_]+)/g;
  for (const f of files) {
    let txt;
    try { txt = readFile(f); } catch { continue; }
    let m;
    while ((m = re.exec(txt)) !== null) referenced.add(m[1]);
  }
  return referenced;
}

/**
 * Does the module file carry a `// WIRE-EXEMPT:` marker (the canonical PRISM tag
 * for an asset intentionally not wired -- e.g. course-forge algorithms whose
 * primary input is a JS closure and so cannot cross a JSON dispatcher boundary)?
 * Such a module is dormant-by-design, NOT an orphan needing wiring. Pure over readFile.
 */
export function hasWireExemptMarker(algoDir, name, readFile = (f) => readFileSync(f, "utf8")) {
  let txt;
  try { txt = readFile(join(algoDir, `${name}.ts`)); } catch { return false; }
  return /WIRE-EXEMPT/.test(txt);
}

/** Names re-exported by algorithms/index.ts (`export ... from "./X"`). Pure over readFile. */
export function computeBarrelReexports(algoDir, readFile = (f) => readFileSync(f, "utf8")) {
  const reexp = new Set();
  let txt;
  try { txt = readFile(join(algoDir, "index.ts")); } catch { return reexp; }
  const re = /from\s+["']\.\/([A-Za-z0-9_]+)(?:\.js)?["']/g;
  let m;
  while ((m = re.exec(txt)) !== null) reexp.add(m[1]);
  return reexp;
}

/**
 * Compute algorithm dispatcher/consumer coverage.
 * @param {{srcDir?: string, strict?: boolean, via?: string}} [opts]
 *   strict = ignore barrel re-exports (require a direct import). via = scope the
 *   consumer set to files whose path includes this substring (e.g.
 *   "dispatchers/algorithmDispatcher" to ask "exposed via prism_algorithm?").
 * @returns {{total, wiredCount, dormantCount, coveragePct, dormant: string[], barrelOnly: string[]}}
 */
export function computeCoverage(opts = {}) {
  const srcDir = opts.srcDir || DEFAULT_SRC;
  const algoDir = join(srcDir, "algorithms");
  const strict = opts.strict === true;
  const via = typeof opts.via === "string" && opts.via.length ? opts.via : null;

  const modules = listAlgorithmModules(algoDir);
  let consumerFiles = walkTsFiles(srcDir);
  if (via) consumerFiles = consumerFiles.filter((f) => f.replace(/\\/g, "/").includes(via));
  const referenced = computeReferenced(consumerFiles);
  const barrel = computeBarrelReexports(algoDir);

  // When scoped to a specific consumer (via), barrel membership is irrelevant --
  // we only care whether THAT consumer imports the algorithm.
  const isWired = (n) => referenced.has(n) || (!strict && !via && barrel.has(n));
  const dormant = modules.filter((n) => !isWired(n));
  const wired = modules.filter(isWired);
  // Algorithms reachable ONLY via the barrel (no direct path ref) -- soft-wired.
  const barrelOnly = modules.filter((n) => !referenced.has(n) && barrel.has(n));

  // Split dormant: WIRE-EXEMPT (intentional, documented) vs genuinely orphaned.
  // Only the orphaned set is actionable for the wiring owner (romeo).
  const wireExempt = dormant.filter((n) => hasWireExemptMarker(algoDir, n)).sort();
  const wireExemptSet = new Set(wireExempt);
  const orphaned = dormant.filter((n) => !wireExemptSet.has(n)).sort();

  return {
    total: modules.length,
    wiredCount: wired.length,
    dormantCount: dormant.length,
    orphanedCount: orphaned.length,
    wireExemptCount: wireExempt.length,
    coveragePct: modules.length ? Math.round((wired.length / modules.length) * 100) : 0,
    dormant: dormant.sort(),
    orphaned,
    wireExempt,
    barrelOnly: barrelOnly.sort(),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function runCLI(argv) {
  const a = { src: DEFAULT_SRC, strict: false, json: false, via: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--src") a.src = argv[++i];
    else if (argv[i] === "--strict") a.strict = true;
    else if (argv[i] === "--json") a.json = true;
    else if (argv[i] === "--via") a.via = argv[++i];
  }
  const r = computeCoverage({ srcDir: a.src, strict: a.strict, via: a.via });
  if (a.json) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log(`algorithm-dispatcher coverage -- ${r.wiredCount}/${r.total} wired (${r.coveragePct}%), ${r.dormantCount} dormant = ${r.orphanedCount} orphaned + ${r.wireExemptCount} wire-exempt${a.strict ? " [strict: barrel re-exports ignored]" : ""}`);
  if (r.barrelOnly.length) console.log(`barrel-only (soft-wired via algorithms/index.ts): ${r.barrelOnly.join(", ")}`);
  if (r.wireExempt.length) console.log(`WIRE-EXEMPT (dormant by design, carries a // WIRE-EXEMPT marker -- NOT wiring candidates): ${r.wireExempt.join(", ")}`);
  console.log(`\nORPHANED (no import anywhere in src/ + no WIRE-EXEMPT marker -- the actionable wiring candidates):`);
  if (!r.orphaned.length) console.log("  (none)");
  r.orphaned.forEach((n, i) => console.log(`  ${String(i + 1).padStart(3)}  ${n}`));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCLI(process.argv.slice(2));
}
