#!/usr/bin/env node
/**
 * classify-hooks-for-broker.mjs — U-DOCKER-HOOK-BROKER-P1
 *
 * Walks `.claude/hooks/*.mjs`, classifies each file via
 * `scripts/lib/hook-broker-classifier.mjs`, and emits a compatibility
 * report at `state/shared/HOOK-BROKER-COMPAT-REPORT.{json,md}`.
 *
 * This is the Phase-1 SURVEY for U-DOCKER-HOOK-BROKER. The report tells
 * the Tier-1 broker design which hooks can be served in-process
 * (`module-safe`), which need a warm-subprocess pipe (`cli-safe-stdin-stdout`),
 * and which must remain spawn-isolated (`mutates-process` / `unknown`).
 *
 * Excludes: `*.test.mjs`, `_envelope.mjs` (already process-shim itself),
 * `_disabled/`, `.deprecated/`, `__tests__/`.
 *
 * Usage:
 *   node scripts/classify-hooks-for-broker.mjs
 *   node scripts/classify-hooks-for-broker.mjs --json   (JSON only, no MD)
 *   node scripts/classify-hooks-for-broker.mjs --quiet  (suppress summary)
 *
 * Exit codes:
 *   0  always (advisory survey, not a gate)
 *
 * @milestone U-DOCKER-HOOK-BROKER (Tier-1 prep — Phase 1 Survey)
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyHookContent, summarizeReport } from "./lib/hook-broker-classifier.mjs";

// Hook source-file size cap. Anything larger is suspicious (likely a vendored
// minified bundle, not a real hook) — the survey records the read failure
// rather than choking the classifier with megabytes of opaque content.
const MAX_HOOK_SIZE_BYTES = 2 * 1024 * 1024;
const NORMALIZED_REPO_PREFIX = resolve(dirname(fileURLToPath(import.meta.url)), "..").replace(/\\/g, "/") + "/";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO = resolve(__dirname, "..");
const HOOKS_DIR = join(REPO, ".claude", "hooks");
const OUT_JSON = join(REPO, "state", "shared", "HOOK-BROKER-COMPAT-REPORT.json");
const OUT_MD = join(REPO, "state", "shared", "HOOK-BROKER-COMPAT-REPORT.md");

// Excluded path segments — sub-directories that are NOT live hooks.
const EXCLUDED_DIRS = Object.freeze([
  "_disabled",
  ".deprecated",
  "__tests__",
  "node_modules",
]);

// Excluded basenames — files that are infrastructure, not hooks.
const EXCLUDED_BASENAMES = Object.freeze([
  "_envelope.mjs",   // process-spawn wrapper, broker would be wrapping itself
]);

/**
 * Recursively walk for .mjs hook files (excluding tests + disabled).
 * @param {string} dir
 * @returns {string[]}
 */
export function walkHookFiles(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (EXCLUDED_DIRS.includes(e.name)) continue;
      out.push(...walkHookFiles(p));
      continue;
    }
    if (!e.isFile()) continue;
    if (!e.name.endsWith(".mjs")) continue;
    if (e.name.endsWith(".test.mjs")) continue;
    if (EXCLUDED_BASENAMES.includes(e.name)) continue;
    out.push(p);
  }
  return out;
}

/**
 * Read + classify a single hook file. Returns a {filePath, classification}
 * entry suitable for `summarizeReport`.
 * @param {string} filePath
 * @returns {{filePath: string, classification: ReturnType<classifyHookContent>, sizeBytes: number}}
 */
export function classifyHookFile(filePath) {
  let source = "";
  let sizeBytes = 0;
  /** @type {string|null} */
  let readError = null;
  try {
    // P1-1 fix (Reviewer B): size cap. Skip + record rather than load
    // multi-MB hook files (vendored bundles, malformed checkouts).
    const st = statSync(filePath);
    if (st.size > MAX_HOOK_SIZE_BYTES) {
      readError = `oversized:${st.size}b>${MAX_HOOK_SIZE_BYTES}b`;
      sizeBytes = st.size;
    } else {
      source = readFileSync(filePath, "utf8");
      sizeBytes = source.length;
    }
  } catch (e) {
    // P1-1 fix (Reviewer A + B): distinguish read-error from empty by
    // recording the error code on the entry.
    readError = e?.code || String(e?.message || e);
  }
  return { filePath, classification: classifyHookContent(source), sizeBytes, readError };
}

/**
 * Build the markdown report body from a JSON report + raw entries.
 * Pure function — separated for tests.
 * @param {ReturnType<summarizeReport>} report
 * @param {Array<{filePath: string, classification: any}>} entries
 * @returns {string}
 */
export function renderMarkdownReport(report, entries) {
  const lines = [];
  lines.push("# HOOK-BROKER-COMPAT-REPORT");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Schema version: ${report.schemaVersion}`);
  lines.push(`Total hooks scanned: **${report.total}**`);
  if (report.invalidEntries > 0) lines.push(`Invalid entries: ${report.invalidEntries}`);
  lines.push("");
  lines.push("## Category breakdown");
  lines.push("");
  lines.push("| Category | Count | % | Broker strategy |");
  lines.push("|---|---|---|---|");
  const pct = (n) => report.total > 0 ? `${((n / report.total) * 100).toFixed(1)}%` : "—";
  const strategyLabel = {
    "module-safe": "share in-process",
    "cli-safe-stdin-stdout": "spawn-cache (warm pipe)",
    "mutates-process": "spawn-isolate (REQUIRED)",
    "imports-only": "ignore (header-only)",
    "empty": "ignore (trivial)",
    "unknown": "spawn-isolate (default)",
  };
  for (const [cat, count] of Object.entries(report.byCategory)) {
    lines.push(`| \`${cat}\` | ${count} | ${pct(count)} | ${strategyLabel[cat]} |`);
  }
  lines.push("");
  lines.push("## Broker integration plan");
  lines.push("");
  lines.push(`- **Share in-process:** ${report.brokerStrategy.sharable_in_process} hook(s) → broker dynamic-imports once + reuses across chats.`);
  lines.push(`- **Spawn-cache:** ${report.brokerStrategy.spawn_cache} hook(s) → broker keeps a warm subprocess pool + pipes stdin/stdout.`);
  lines.push(`- **Spawn-isolate:** ${report.brokerStrategy.spawn_isolate} hook(s) → broker spawns per-invocation (no shared state).`);
  lines.push(`- **Ignore:** ${report.brokerStrategy.ignore} hook(s) → header-only or empty, broker skips.`);
  lines.push("");
  if (report.topMutators.length > 0) {
    lines.push("## Sample `mutates-process` hooks (first 25)");
    lines.push("");
    lines.push("These hooks MUST be spawn-isolated. Broker design must NOT share their module state.");
    lines.push("");
    for (const p of report.topMutators) {
      lines.push(`- \`${p.replace(/\\/g, "/").replace(REPO.replace(/\\/g, "/") + "/", "")}\``);
    }
    if (report.mutatorsTruncated > 0) {
      lines.push(`- _…and ${report.mutatorsTruncated} more (truncated; full list in JSON report)_`);
    }
    lines.push("");
  }
  lines.push("## Methodology");
  lines.push("");
  lines.push("Classified by `scripts/lib/hook-broker-classifier.mjs`. Mutation detection is conservative — any hit on spawn / fs writes / network anywhere in the source disqualifies a hook from in-process sharing, regardless of whether the mutating call is at module scope or inside an exported async handler. The cost of misclassification is always more isolation, never less.");
  lines.push("");
  lines.push("Source: U-DOCKER-HOOK-BROKER-P1 (Tier-1 prep, Phase-1 survey). Spec: `state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md`.");
  lines.push("");
  return lines.join("\n");
}

/**
 * Main entry: walks the hooks dir, classifies each, writes both JSON + MD.
 * @param {{hooksDir?: string, outJson?: string, outMd?: string, write?: boolean, jsonOnly?: boolean}} opts
 */
export function run(opts = {}) {
  const hooksDir = opts.hooksDir ?? HOOKS_DIR;
  const outJson = opts.outJson ?? OUT_JSON;
  const outMd = opts.outMd ?? OUT_MD;
  const write = opts.write !== false;
  const jsonOnly = opts.jsonOnly === true;

  const files = walkHookFiles(hooksDir);
  const entries = files.map(classifyHookFile);
  const report = summarizeReport(entries);

  // Augmented JSON shape — include the per-file breakdown so downstream
  // tooling (broker config generator, regression detector) can read it
  // without re-walking the hook tree.
  // P1-1 (Reviewer A + B): surface read failures (oversize / ACL / ENOENT)
  // as a separate list rather than burying them as silent `empty` rows.
  const readFailures = entries
    .filter((e) => e.readError)
    .map((e) => ({ filePath: e.filePath.replace(/\\/g, "/"), error: e.readError, sizeBytes: e.sizeBytes }));
  // P1-3 (Reviewer B): freeze the merged report so callers reading
  // `run().fullReport` get the same mutability semantics as
  // `summarizeReport()` directly.
  const fullReport = Object.freeze({
    ...report,
    generated: new Date().toISOString(),
    hooksDir,
    readFailures: Object.freeze(readFailures),
    perFile: Object.freeze(entries.map((e) => Object.freeze({
      filePath: e.filePath.replace(/\\/g, "/"),
      category: e.classification.category,
      signals: e.classification.signals,
      sizeBytes: e.sizeBytes,
      ...(e.readError ? { readError: e.readError } : {}),
    }))),
  });

  if (write) {
    try { mkdirSync(dirname(outJson), { recursive: true }); } catch { /* exists */ }
    // P1-2 (Reviewer B): atomic write — write to <out>.tmp then rename.
    // Mid-write interruption no longer leaves the downstream consumer
    // with a partial JSON that crashes the next `JSON.parse`.
    writeAtomic(outJson, JSON.stringify(fullReport, null, 2));
    if (!jsonOnly) {
      writeAtomic(outMd, renderMarkdownReport(report, entries));
    }
  }
  return fullReport;
}

/**
 * Write a file atomically: data → `<path>.tmp` then rename to `<path>`.
 * Best-effort cleanup on failure.
 * @param {string} outPath
 * @param {string} data
 */
function writeAtomic(outPath, data) {
  const tmp = outPath + ".tmp";
  writeFileSync(tmp, data, "utf8");
  renameSync(tmp, outPath);
}

const invokedAsCli = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === __filename; }
  catch { return false; }
})();
if (invokedAsCli) {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes("--json");
  const quiet = args.includes("--quiet");
  const r = run({ jsonOnly });
  if (!quiet) {
    console.log(`HOOK-BROKER-COMPAT: scanned ${r.total} hooks`);
    console.log(`  byCategory: ${JSON.stringify(r.byCategory)}`);
    console.log(`  brokerStrategy: ${JSON.stringify(r.brokerStrategy)}`);
    console.log(`reports → ${OUT_JSON}${jsonOnly ? "" : ` + ${OUT_MD}`}`);
  }
}
