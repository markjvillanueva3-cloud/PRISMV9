#!/usr/bin/env node
/**
 * context-eval-golden-check.mjs
 *
 * OBSIDIAN-INTELLIGENCE-MS3/D5/U-CONTEXT-EVAL-GATE — the "scripted half" of
 * the golden lifecycle (Arm-B P1-3 fix: the golden was write-once /
 * rot-forever with no machine-checkable freshness or drift signal).
 *
 * Does NOT reimplement validation — it loads the golden through
 * ContextEvalEngine.loadGolden() (the canonical schema + dup-id + symlink +
 * size validator, R8: reuse the engine, don't fork its logic) and then
 * layers two rot signals on top:
 *
 *   1. FRESHNESS — `lastReviewed` + `reviewIntervalDays` age check. A golden
 *      older than its review interval is flagged stale (rot becomes visible
 *      instead of silent).
 *   2. FRAGILE TOKENS — pure-alphabetic requiredTokens of length ≤ 2 are
 *      sound (post P0-3 they only whole-token match) but inherently rare as
 *      standalone tokens; surfaced so a human re-confirms each is genuinely
 *      a standalone identifier in the target context (e.g. physics `mc`).
 *
 * Advisory tool — exit codes are for cron/CI gating, not agent-blocking:
 *   0  OK (schema valid, fresh, no fragile-token surprises)
 *   1  WARN (stale OR fragile tokens OR loader warnings) — review suggested
 *   2  ERROR (golden unreadable / schema-invalid / no entries)
 *
 * Usage:
 *   node scripts/context-eval-golden-check.mjs            # human report
 *   node scripts/context-eval-golden-check.mjs --json     # machine-readable
 *   node scripts/context-eval-golden-check.mjs --golden <path>
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D5/U-CONTEXT-EVAL-GATE
 */

import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const ENGINE_PATH = join(PRISM_ROOT, "mcp-server", "src", "engines", "ContextEvalEngine.ts");
const DEFAULT_GOLDEN = join(PRISM_ROOT, "state", "shared", "context-eval-golden.json");

function parseArgs(argv) {
  const a = { json: false, golden: DEFAULT_GOLDEN };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json") a.json = true;
    else if (argv[i] === "--golden") a.golden = argv[++i];
  }
  return a;
}

async function loadEngine() {
  const req = createRequire(pathToFileURL(join(PRISM_ROOT, "mcp-server", "package.json")));
  const tsxApi = req.resolve("tsx/esm/api");
  const tsx = await import(pathToFileURL(tsxApi).href);
  return tsx.tsImport(pathToFileURL(ENGINE_PATH).href, import.meta.url);
}

function isPureAlpha(s) {
  return /^[a-z]+$/i.test(s);
}

async function main() {
  const args = parseArgs(process.argv);
  const goldenPath = resolve(args.golden);
  const report = {
    goldenPath,
    ok: false,
    exitCode: 2,
    entryCount: 0,
    loaderWarnings: [],
    stale: false,
    ageDays: null,
    reviewIntervalDays: null,
    fragileTokens: [],
    errors: [],
  };

  // 1. Canonical load via the engine (single source of validation truth).
  let engineMod;
  try {
    engineMod = await loadEngine();
  } catch (e) {
    report.errors.push(`engine load failed: ${e instanceof Error ? e.message : String(e)}`);
    return emit(report, args);
  }
  const loaded = engineMod.contextEvalEngine.loadGolden({ goldenPath });
  report.loaderWarnings = loaded.warnings;
  report.entryCount = loaded.entries.length;
  if (loaded.entries.length === 0) {
    report.errors.push("golden produced 0 valid entries (see loaderWarnings)");
    return emit(report, args);
  }

  // 2. Freshness — read the raw file for the lastReviewed/interval metadata
  //    (loadGolden intentionally ignores non-schema top-level keys).
  try {
    const rawObj = JSON.parse(readFileSync(goldenPath, "utf8"));
    const interval = Number(rawObj.reviewIntervalDays);
    report.reviewIntervalDays = Number.isFinite(interval) ? interval : null;
    const lr = rawObj.lastReviewed ? Date.parse(rawObj.lastReviewed) : NaN;
    if (Number.isFinite(lr)) {
      const ageDays = (Date.now() - lr) / 86_400_000;
      report.ageDays = Math.round(ageDays * 10) / 10;
      if (Number.isFinite(interval) && ageDays > interval) report.stale = true;
    } else {
      report.loaderWarnings = [...report.loaderWarnings, "no parseable lastReviewed — cannot assess freshness"];
    }
  } catch (e) {
    report.loaderWarnings = [...report.loaderWarnings, `freshness metadata unreadable: ${e instanceof Error ? e.message : String(e)}`];
  }

  // 3. Fragile-token surface — sound but rare-as-standalone.
  for (const entry of loaded.entries) {
    for (const tok of entry.requiredTokens) {
      if (isPureAlpha(tok) && tok.length <= 2) {
        report.fragileTokens.push({ id: entry.id, token: tok });
      }
    }
  }

  const hasWarn =
    report.stale ||
    report.fragileTokens.length > 0 ||
    report.loaderWarnings.length > 0;
  report.ok = !hasWarn;
  report.exitCode = hasWarn ? 1 : 0;
  return emit(report, args);
}

function emit(report, args) {
  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    const L = [];
    L.push(`context-eval-golden-check — ${report.goldenPath}`);
    L.push(`  entries        : ${report.entryCount}`);
    L.push(`  freshness      : ${report.stale ? `STALE (${report.ageDays}d > ${report.reviewIntervalDays}d)` : report.ageDays === null ? "unknown" : `OK (${report.ageDays}d / ${report.reviewIntervalDays}d)`}`);
    L.push(`  fragile tokens : ${report.fragileTokens.length ? report.fragileTokens.map((f) => `${f.id}:${f.token}`).join(", ") : "none"}`);
    if (report.loaderWarnings.length) L.push(`  loader warnings: ${report.loaderWarnings.join(" | ")}`);
    if (report.errors.length) L.push(`  ERRORS         : ${report.errors.join(" | ")}`);
    L.push(`  verdict        : ${report.exitCode === 0 ? "OK" : report.exitCode === 1 ? "WARN (review suggested)" : "ERROR"}`);
    process.stdout.write(L.join("\n") + "\n");
  }
  process.exit(report.exitCode);
}

main().catch((e) => {
  process.stdout.write(`context-eval-golden-check fatal: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(2);
});
