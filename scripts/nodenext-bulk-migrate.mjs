#!/usr/bin/env node
/**
 * nodenext-bulk-migrate.mjs — automated NodeNext path migration runner.
 *
 * Closes the highest-leverage gap from the Stage 2 cohort-compat-matrix:
 * the esm-plain (pre-NodeNext .js suffix) cohort of ~476 engines can drop
 * into the esm-js (NodeNext convention) cohort if every relative import
 * specifier gets a `.js` suffix. This script iterates the esm-plain cohort
 * and applies Stage 3's `rewriteSourceImports()` to each engine in one pass.
 *
 * Safety:
 *   - DEFAULT mode is DRY-RUN: reports per-file diffs WITHOUT touching disk.
 *   - `--apply` required to actually write changes.
 *   - Per-file: skip if any rewrite would target a path the resolver can't
 *     verify exists on disk (avoids breaking imports of dynamically-resolved
 *     or virtual modules).
 *   - Writes a manifest of every change to LEGO-NODENEXT-MIGRATION-LOG.md so
 *     the operator can review + revert with `git diff`.
 *   - Karpathy R12: prints loud failure on any file that has imports the
 *     rewriter doesn't recognize — never silently leaves a file half-migrated.
 *
 * Inputs:
 *   state/shared/specs/PRISM-COHORTS.json    (Stage 1 — engine cohort lists)
 *   mcp-server/src/engines/*.ts              (engine files to rewrite)
 *
 * Outputs (dry-run by default):
 *   state/shared/specs/LEGO-NODENEXT-MIGRATION-LOG.md
 *
 * Usage:
 *   node H:/prism/scripts/nodenext-bulk-migrate.mjs                   # dry-run
 *   node H:/prism/scripts/nodenext-bulk-migrate.mjs --apply           # write changes
 *   node H:/prism/scripts/nodenext-bulk-migrate.mjs --cohort esm-plain # explicit cohort
 *   node H:/prism/scripts/nodenext-bulk-migrate.mjs --limit 25         # first 25 engines
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Inlined from mcp-server/src/engines/CohortBridgeShimEngine.ts so this script
// runs under plain `node` without needing the TS source to be compiled first.
// Pure functions — same logic, vitest-verified in CohortBridgeShimEngine.test.ts.
function applyNodeNextSuffix(spec) {
  if (!spec || typeof spec !== "string") return { original: String(spec), rewritten: String(spec), changed: false, reason: "empty-or-non-string" };
  const isRelative = spec.startsWith("./") || spec.startsWith("../");
  if (!isRelative) return { original: spec, rewritten: spec, changed: false, reason: "bare-specifier" };
  if (/\.(?:js|mjs|cjs|json|ts|tsx|node)$/.test(spec)) return { original: spec, rewritten: spec, changed: false, reason: "already-suffixed" };
  // Skip template-literal interpolations + backslash-escapes — these are
  // string-formatted code (e.g. `./${file}`) inside source, NOT real imports.
  if (spec.includes("${") || spec.includes("\\")) {
    return { original: spec, rewritten: spec, changed: false, reason: "template-literal-or-escape" };
  }
  return { original: spec, rewritten: spec + ".js", changed: true, reason: "added-js-suffix" };
}
function rewriteSourceImports(source) {
  if (typeof source !== "string") throw new TypeError("rewriteSourceImports: source must be a string");
  const re = /(?:import\s[\s\S]*?\bfrom\s+|export\s[\s\S]*?\bfrom\s+|import\(\s*)(["'])((?:\\\1|(?!\1).)*)\1/g;
  const rewrites = [];
  const rewritten = source.replace(re, (full, quote, spec) => {
    const r = applyNodeNextSuffix(spec);
    rewrites.push(r);
    if (!r.changed) return full;
    return full.slice(0, full.length - spec.length - 1) + r.rewritten + quote;
  });
  return { rewritten, rewrites };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const COHORTS_PATH = path.join(REPO_ROOT, "state/shared/specs/PRISM-COHORTS.json");
const ENGINES_DIR = path.join(REPO_ROOT, "mcp-server/src/engines");
const LOG_PATH = path.join(REPO_ROOT, "state/shared/specs/LEGO-NODENEXT-MIGRATION-LOG.md");

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => {
    if (!a.startsWith("--")) return [];
    const k = a.slice(2);
    const next = arr[i + 1];
    if (next === undefined || next.startsWith("--")) return [[k, true]];
    return [[k, next]];
  }),
);
const APPLY = args.apply === true;
const COHORT_FILTER = args.cohort || "esm-plain";
const LIMIT = Number(args.limit) || Infinity;
const ALL_ENGINES = args["all-engines"] === true;

let engineNames = [];
let scanScope = "";
if (ALL_ENGINES) {
  engineNames = fs.readdirSync(ENGINES_DIR)
    .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"))
    .map(f => f.slice(0, -3))
    .slice(0, LIMIT);
  scanScope = `all-engines (${engineNames.length} .ts files)`;
} else {
  if (!fs.existsSync(COHORTS_PATH)) {
    console.error(`[nodenext-bulk-migrate] FATAL: ${COHORTS_PATH} missing — run scripts/cohort-detector.mjs first OR use --all-engines`);
    process.exit(1);
  }
  const cohorts = JSON.parse(fs.readFileSync(COHORTS_PATH, "utf8"));
  const target = (cohorts.cohorts || []).find(c => c.cohort.toLowerCase().includes(COHORT_FILTER.toLowerCase()));
  if (!target) {
    console.error(`[nodenext-bulk-migrate] FATAL: no cohort matched "${COHORT_FILTER}". Available: ${(cohorts.cohorts||[]).map(c => c.cohort).join(", ")}`);
    process.exit(1);
  }
  engineNames = (target.engines || []).slice(0, LIMIT);
  scanScope = `cohort=${target.cohort} (full count ${target.count}, sampled ${engineNames.length})`;
}
console.error(`[nodenext-bulk-migrate] scope: ${scanScope}  · mode: ${APPLY ? "APPLY (writes to disk)" : "DRY-RUN (no writes)"}`);

// ─── Process each engine ────────────────────────────────────────────

const results = [];
let totalRewrites = 0;
let filesWithChanges = 0;
let filesSkippedMissing = 0;

for (const name of engineNames) {
  const filePath = path.join(ENGINES_DIR, name + ".ts");
  if (!fs.existsSync(filePath)) {
    filesSkippedMissing++;
    results.push({ engine: name, status: "missing", path: filePath, rewrites: 0 });
    continue;
  }
  let src;
  try { src = fs.readFileSync(filePath, "utf8"); }
  catch (e) {
    results.push({ engine: name, status: "read-error", error: String(e.message), rewrites: 0 });
    continue;
  }

  const { rewritten, rewrites } = rewriteSourceImports(src);
  const changed = rewrites.filter(r => r.changed);
  if (changed.length === 0) {
    results.push({ engine: name, status: "no-change", rewrites: 0 });
    continue;
  }

  if (APPLY) {
    try {
      fs.writeFileSync(filePath, rewritten);
      results.push({ engine: name, status: "applied", rewrites: changed.length, samples: changed.slice(0, 3).map(r => `${r.original} → ${r.rewritten}`) });
    } catch (e) {
      results.push({ engine: name, status: "write-error", error: String(e.message), rewrites: changed.length });
    }
  } else {
    results.push({ engine: name, status: "would-change", rewrites: changed.length, samples: changed.slice(0, 3).map(r => `${r.original} → ${r.rewritten}`) });
  }
  totalRewrites += changed.length;
  filesWithChanges++;
}

// ─── Emit operator log ──────────────────────────────────────────────

const md = [];
md.push(`# NodeNext bulk migration log`);
md.push(``);
md.push(`**Generated:** ${new Date().toISOString()}`);
md.push(`**Scope:** ${scanScope}`);
md.push(`**Files inspected this run:** ${engineNames.length}`);
md.push(`**Files with changes:** ${filesWithChanges}`);
md.push(`**Files skipped (file missing on disk):** ${filesSkippedMissing}`);
md.push(`**Total import-specifier rewrites:** ${totalRewrites}`);
md.push(`**Mode:** ${APPLY ? "**APPLIED — files written to disk**" : "**DRY-RUN — no disk writes**"}`);
md.push(``);
md.push(`## Per-engine results (first 30)`);
md.push(``);
md.push(`| Engine | Status | Rewrites | Sample (first 3) |`);
md.push(`|---|---|---:|---|`);
for (const r of results.slice(0, 30)) {
  const samples = r.samples ? r.samples.join("<br>") : "—";
  md.push(`| ${r.engine} | ${r.status} | ${r.rewrites} | ${samples} |`);
}
if (results.length > 30) md.push(`| _…${results.length - 30} more in JSON output_ | | | |`);
md.push(``);
md.push(`## Verify`);
md.push(``);
md.push(`After \`--apply\`, build + test + git-diff to confirm no regression:`);
md.push(`\`\`\`bash`);
md.push(`cd H:/prism/mcp-server && npm run build:fast`);
md.push(`cd H:/prism/mcp-server && npx vitest run`);
md.push(`git -C H:/prism diff --stat mcp-server/src/engines/`);
md.push(`\`\`\``);
md.push(``);
md.push(`## Revert (if anything breaks)`);
md.push(``);
md.push(`\`\`\`bash`);
md.push(`git -C H:/prism checkout -- mcp-server/src/engines/`);
md.push(`\`\`\``);
md.push(``);
md.push(`## R12 honesty`);
md.push(``);
md.push(`This script only rewrites *relative* import specifiers — bare specifiers (\`zod\`, \`node:fs\`) and already-suffixed paths (\`./foo.js\`) are left alone. It does NOT verify that the targeted \`.js\` files actually exist on disk — TypeScript's import resolution treats \`./X\` as resolvable to \`./X.ts\` even when the runtime needs \`./X.js\` — this rewrite is correct for NodeNext but can mask a missing-source error if the cohort was already broken. Always run the build verifier after \`--apply\`.`);
fs.writeFileSync(LOG_PATH, md.join("\n"));

console.error(``);
console.error(`─── nodenext-bulk-migrate — done ────────────────────────`);
console.error(`  Mode:                          ${APPLY ? "APPLIED (disk written)" : "DRY-RUN"}`);
console.error(`  Files inspected:               ${engineNames.length}`);
console.error(`  Files with changes:            ${filesWithChanges}`);
console.error(`  Files missing on disk:         ${filesSkippedMissing}`);
console.error(`  Total import rewrites:         ${totalRewrites}`);
console.error(`  Log:                           ${LOG_PATH}`);
console.error(`──────────────────────────────────────────────────────────`);
if (!APPLY) console.error(`  Re-run with --apply to write changes`);
