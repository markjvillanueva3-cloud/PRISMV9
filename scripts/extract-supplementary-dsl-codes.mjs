#!/usr/bin/env node
/**
 * extract-supplementary-dsl-codes.mjs — SYSTEM-VIZ-DSL-MS0/U-DSL-SUPP-EXTRACT
 *
 * Companion to regen-dsl-shortcodes.mjs. That script extracts node names from
 * the system-viz graph's `kind` field — which works for `ML` (milestone) and
 * `GH` (ghost-L13) types but NOT for `AC` (action), `SK` (skill), `FM` (formula)
 * because those graph nodes are still typed `wiki_entry` rather than the
 * type-specific kind tag. This script fills the gap by reading from
 * SUPPLEMENTARY SOURCES:
 *
 *   AC (action)   ← parse `case "<name>":` patterns in mcp-server/src/tools/dispatchers/*.ts
 *   SK (skill)    ← walk .claude/commands/**.md + .claude/commands-archive/**.md
 *   FM (formula)  ← parse `export const ... =` patterns in src/physics/*.ts
 *
 * Reuses assignShortcodes + atomic writer from regen-dsl-shortcodes.mjs so the
 * determinism contract is identical. NEVER reassigns existing codes.
 *
 * Edge cases handled:
 *   - z.enum spread literals (`[...A, ...B]`) → case statements catch the
 *     actual action names; we don't parse the enum declarations.
 *   - Comment-quoted strings (`// case "fake":`) → skipped via comment strip.
 *   - Duplicate action names across dispatchers → deduplicated.
 *   - Skill .md files in subdirs → recursive walk with file_path.basename.
 *   - Physics constants with non-identifier names → regex limits to [A-Z][A-Z0-9_]*.
 *
 * Usage:
 *   node scripts/extract-supplementary-dsl-codes.mjs --dry-run
 *   node scripts/extract-supplementary-dsl-codes.mjs --apply
 *   node scripts/extract-supplementary-dsl-codes.mjs --apply --json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assignShortcodes, NEW_CATEGORIES, DSL_VERSION } from "./regen-dsl-shortcodes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "mcp-server", "data", "docs", "CODE_SYSTEM_INDEX.json");

const DEFAULT_SOURCES = Object.freeze({
  dispatcherDir: path.join(ROOT, "mcp-server", "src", "tools", "dispatchers"),
  skillDirs: [
    path.join(ROOT, ".claude", "commands"),
    path.join(ROOT, ".claude", "commands-archive"),
  ],
  physicsDir: path.join(ROOT, "mcp-server", "src", "physics"),
});

/**
 * Extract dispatcher action names from a single .ts file. Looks for
 *   case "<action_name>":
 * patterns. Skips:
 *   - lines starting with `//` (single-line comments)
 *   - lines inside /* ... *\/ blocks
 * Returns Set of unique action names.
 */
export function extractActionsFromDispatcherSource(src) {
  if (typeof src !== "string" || src.length === 0) return new Set();
  // Strip /* ... */ blocks first
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, "");
  // Then strip // ... single-line comments (preserve string contents — we don't
  // care about precision here, just dropping comment-quoted strings)
  const noComments = noBlock.split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
  const out = new Set();
  // Action names: lowercase + underscore. Min 4 chars OR must contain underscore.
  // This filters out short opaque case discriminators (e.g. `case "aabb":` in a
  // geometry switch) while keeping every real dispatcher action.
  const re = /case\s+["']([a-z][a-z0-9_]*)["']\s*:/g;
  let m;
  while ((m = re.exec(noComments)) !== null) {
    const name = m[1];
    if (name.includes("_") && name.length >= 4) out.add(name);
  }
  return out;
}

/**
 * Walk a directory tree (synchronous) for files matching a predicate.
 * Returns array of absolute paths. Skips node_modules, .git, .cache.
 */
export function walkDir(rootDir, predicate, opts = {}) {
  const maxDepth = opts.maxDepth ?? 8;
  const out = [];
  if (!fs.existsSync(rootDir)) return out;
  const stack = [{ dir: rootDir, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git" || e.name === ".cache" || e.name.startsWith(".")) continue;
        stack.push({ dir: full, depth: depth + 1 });
      } else if (e.isFile() && predicate(e.name, full)) {
        out.push(full);
      }
    }
  }
  return out;
}

/** Read action names by scanning every dispatcher .ts in the directory. */
export function extractAllActions(dispatcherDir) {
  const all = new Set();
  if (!fs.existsSync(dispatcherDir)) return all;
  const files = fs.readdirSync(dispatcherDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(".test.ts"));
  for (const f of files) {
    let src;
    try { src = fs.readFileSync(path.join(dispatcherDir, f), "utf8"); }
    catch { continue; }
    for (const a of extractActionsFromDispatcherSource(src)) all.add(a);
  }
  return all;
}

/**
 * Read skill names from all .md files in given dirs (basename without extension).
 * Strict slug filter — `/^[a-z0-9][a-z0-9_-]*$/` — drops uppercase reports
 * (README, COMMAND_COMPLIANCE_REPORT) which are NOT skills.
 */
export const SKILL_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
export function extractAllSkills(skillDirs) {
  const all = new Set();
  for (const dir of skillDirs) {
    const files = walkDir(dir, (name) => name.endsWith(".md"));
    for (const f of files) {
      const slug = path.basename(f, ".md");
      if (SKILL_SLUG_PATTERN.test(slug)) all.add(slug);
    }
  }
  return all;
}

/**
 * Read formula constant names from physics .ts files.
 * Looks for `export const <NAME> = ...` where NAME is UPPER_SNAKE_CASE.
 * (Lowercase / camelCase exports are typically utility funcs, not constants.)
 */
export function extractFormulasFromPhysicsSource(src) {
  if (typeof src !== "string" || src.length === 0) return new Set();
  const out = new Set();
  const re = /export\s+const\s+([A-Z][A-Z0-9_]+)\s*[:=]/g;
  let m;
  while ((m = re.exec(src)) !== null) out.add(m[1]);
  return out;
}

export function extractAllFormulas(physicsDir) {
  const all = new Set();
  if (!fs.existsSync(physicsDir)) return all;
  const files = fs.readdirSync(physicsDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  for (const f of files) {
    let src;
    try { src = fs.readFileSync(path.join(physicsDir, f), "utf8"); }
    catch { continue; }
    for (const c of extractFormulasFromPhysicsSource(src)) all.add(c);
  }
  return all;
}

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (err) { throw new Error(`failed to read ${filePath}: ${err?.message || err}`); }
}

function writeJsonAtomic(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  const RETRY_DELAYS_MS = [50, 100, 200, 400, 800, 1600];
  let lastErr = null;
  for (const delay of RETRY_DELAYS_MS) {
    try { fs.renameSync(tmp, filePath); return; }
    catch (err) {
      lastErr = err;
      const code = err?.code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "EACCES" && code !== "EEXIST") throw err;
      const until = Date.now() + delay;
      while (Date.now() < until) { /* spin */ }
    }
  }
  throw lastErr ?? new Error("rename retry exhausted");
}

function parseArgs(argv) {
  const out = { dryRun: true, apply: false, json: false, indexPath: INDEX_PATH };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") { out.apply = true; out.dryRun = false; }
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--index") out.indexPath = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.error("usage: extract-supplementary-dsl-codes [--dry-run | --apply] [--json] [--index path]");
      process.exit(0);
    }
  }
  return out;
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));
  const index = readJsonSafe(opts.indexPath);
  if (!index?.codes || !index?.reverse) throw new Error(`malformed index: ${opts.indexPath}`);

  const actions = extractAllActions(DEFAULT_SOURCES.dispatcherDir);
  const skills = extractAllSkills(DEFAULT_SOURCES.skillDirs);
  const formulas = extractAllFormulas(DEFAULT_SOURCES.physicsDir);

  const newNamesByCategory = {
    AC: [...actions],
    SK: [...skills],
    FM: [...formulas],
    // ML + GH are graph-bound; not extended here. The graph script handles them.
  };

  const result = assignShortcodes(index.codes, newNamesByCategory);

  // Merge added codes into the index (preserve existing codes verbatim)
  let mergeCount = 0;
  for (const [code, entry] of Object.entries(result.added)) {
    if (!index.codes[code]) {
      index.codes[code] = entry;
      index.reverse[entry.name] = code;
      mergeCount++;
    }
  }

  // Update category metadata (preserve graph-added ML + GH counts; add/update AC/SK/FM)
  index.categories = index.categories || {};
  for (const prefix of ["AC", "SK", "FM"]) {
    const def = NEW_CATEGORIES[prefix];
    const stats = result.byCategory[prefix] || { added: 0, preserved: 0, total: 0 };
    const existingCount = index.categories[prefix]?.count || 0;
    index.categories[prefix] = {
      label: def.label,
      prefix,
      count: existingCount + stats.added,
      source: "supplementary-extractor",
      kind: def.kindMatch?.source || null,
    };
  }
  index._meta = index._meta || {};
  index._meta.version = DSL_VERSION;
  index._meta.dsl_supplementary_at = new Date().toISOString();
  index._meta.dsl_supplementary_by = "extract-supplementary-dsl-codes.mjs (SYSTEM-VIZ-DSL-MS0/U-DSL-SUPP-EXTRACT)";
  index._meta.total_codes = Object.keys(index.codes).length;

  const report = {
    ok: true,
    dryRun: opts.dryRun,
    indexPath: opts.indexPath,
    sources: {
      actions: actions.size,
      skills: skills.size,
      formulas: formulas.size,
    },
    added: mergeCount,
    preservedExisting: result.preserved,
    overflows: result.overflows,
    byCategory: result.byCategory,
    totalCodesAfter: index._meta.total_codes,
    samples: Object.fromEntries(
      ["AC", "SK", "FM"].map((p) => [
        p,
        Object.entries(result.added).filter(([c]) => c.startsWith(p)).slice(0, 3).map(([c, e]) => `${c}: ${e.name}`),
      ])
    ),
  };

  if (opts.dryRun) {
    if (opts.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report);
    return;
  }

  writeJsonAtomic(opts.indexPath, index);
  report.written = true;
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else { printReport(report); console.log(`\n  → wrote ${opts.indexPath} (${index._meta.total_codes} total codes)`); }
}

function printReport(r) {
  console.log(`DSL Supplementary Extension — ${r.dryRun ? "DRY-RUN" : "APPLY"}`);
  console.log(`  index:       ${r.indexPath}`);
  console.log(`  sources:     actions=${r.sources.actions} skills=${r.sources.skills} formulas=${r.sources.formulas}`);
  console.log(`  added:       ${r.added} new codes`);
  console.log(`  preserved:   ${r.preservedExisting} existing codes`);
  console.log(`  total:       ${r.totalCodesAfter} codes after`);
  if (r.overflows.length > 0) console.log(`  ⚠ overflows: ${r.overflows.length} names exceed body capacity`);
  console.log(`  by category:`);
  for (const [prefix, stats] of Object.entries(r.byCategory)) {
    if (stats.total === 0) continue;
    console.log(`    ${prefix}: +${stats.added} new, ${stats.preserved} preserved → ${stats.total} total`);
    const samples = r.samples?.[prefix] || [];
    samples.forEach((s) => console.log(`      e.g. ${s}`));
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
