#!/usr/bin/env node
/**
 * SFC-ACCURACY-MS2 -- Variability-corpus accuracy auditor (CLI).
 *
 * Streams the SFC-ACCURACY-MS1 result corpus
 * (state/shared/sfc-variability-results/<domain>/chunk-*.jsonl) and checks
 * every computed speed/feed row against closed-form SFC identities and
 * physical-validity invariants (see sfc-accuracy-audit-lib.mjs). Emits an
 * operator-readable JSON + markdown report. This is the VERIFICATION half of
 * the operator goal "run millions of variations so we KNOW all calcs accurate":
 * the batch produces the rows, this proves them correct (or surfaces defects
 * with the exact offending config).
 *
 * Usage:
 *   node scripts/sfc-accuracy-audit.mjs [--domain mill|lathe|both]
 *        [--results-root <dir>] [--out <prefix>] [--max-rows N]
 *        [--sample-limit N] [--json] [--fail-on-critical] [--progress N]
 *
 * Defaults: --domain both, results-root state/shared/sfc-variability-results,
 *           out state/shared/SFC-ACCURACY-AUDIT, max-rows 0 (all), progress 1e6.
 * Exit: 0 normally; 1 if --fail-on-critical and grade==FAIL; 2 on bad args.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createReport,
  recordRow,
  finalizeReport,
  streamAllRows,
  renderMarkdown,
} from "./lib/sfc-accuracy-audit-lib.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const DEFAULT_RESULTS_ROOT = "state/shared/sfc-variability-results";
const DEFAULT_OUT_PREFIX = "state/shared/SFC-ACCURACY-AUDIT";
const DEFAULT_PROGRESS_EVERY = 1_000_000;
const VALID_DOMAINS = ["mill", "lathe"];
const EXIT_BAD_ARGS = 2;
const EXIT_FAIL = 1;

function parseArgs(argv) {
  const args = {
    domain: "both",
    resultsRoot: DEFAULT_RESULTS_ROOT,
    out: DEFAULT_OUT_PREFIX,
    maxRows: 0,
    sampleLimit: 5,
    json: false,
    failOnCritical: false,
    progressEvery: DEFAULT_PROGRESS_EVERY,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--domain") args.domain = argv[++i];
    else if (a === "--results-root") args.resultsRoot = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--max-rows") args.maxRows = Number(argv[++i]);
    else if (a === "--sample-limit") args.sampleLimit = Number(argv[++i]);
    else if (a === "--progress") args.progressEvery = Number(argv[++i]);
    else if (a === "--json") args.json = true;
    else if (a === "--fail-on-critical") args.failOnCritical = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function resolveSources(args) {
  const root = resolve(PROJECT_ROOT, args.resultsRoot);
  const domains = args.domain === "both" ? VALID_DOMAINS : [args.domain];
  return domains.map((domain) => ({ domain, dir: resolve(root, domain) }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write("node scripts/sfc-accuracy-audit.mjs [--domain mill|lathe|both] [--max-rows N] [--out <prefix>] [--json] [--fail-on-critical]\n");
    return 0;
  }
  if (args.domain !== "both" && !VALID_DOMAINS.includes(args.domain)) {
    process.stderr.write(`bad --domain ${args.domain} (expect mill|lathe|both)\n`);
    return EXIT_BAD_ARGS;
  }
  if (!Number.isFinite(args.maxRows) || args.maxRows < 0) {
    process.stderr.write(`bad --max-rows\n`);
    return EXIT_BAD_ARGS;
  }
  if (!Number.isFinite(args.progressEvery) || args.progressEvery <= 0) {
    process.stderr.write(`bad --progress (must be a positive number)\n`);
    return EXIT_BAD_ARGS;
  }
  if (!Number.isFinite(args.sampleLimit) || args.sampleLimit < 0) {
    process.stderr.write(`bad --sample-limit (must be >= 0)\n`);
    return EXIT_BAD_ARGS;
  }

  const sources = resolveSources(args);
  const report = createReport({ sampleLimit: args.sampleLimit });
  let parseErrors = 0;
  const onParseError = () => parseErrors++;

  process.stderr.write(`[sfc-accuracy-audit] streaming ${sources.map((s) => s.domain).join("+")} from ${args.resultsRoot}${args.maxRows ? ` (cap ${args.maxRows})` : ""}\n`);
  const t0 = Date.now();
  for await (const { cell, domain } of streamAllRows(sources, { maxRows: args.maxRows, onParseError })) {
    recordRow(report, domain, cell);
    if (report.totals.rows % args.progressEvery === 0) {
      const rate = Math.round(report.totals.rows / ((Date.now() - t0) / 1000));
      process.stderr.write(`  ... ${report.totals.rows.toLocaleString()} rows (${rate.toLocaleString()}/s) crit=${report.totals.critical} warn=${report.totals.warn}\n`);
    }
  }
  report.parseErrors = parseErrors;
  report.elapsedMs = Date.now() - t0;
  report.generatedAt = new Date().toISOString();
  finalizeReport(report);

  const outJson = resolve(PROJECT_ROOT, `${args.out}.json`);
  const outMd = resolve(PROJECT_ROOT, `${args.out}.md`);
  await mkdir(dirname(outJson), { recursive: true });
  await writeFile(outJson, JSON.stringify(report, null, 2));
  await writeFile(outMd, renderMarkdown(report));

  const t = report.totals;
  process.stderr.write(
    `[sfc-accuracy-audit] GRADE ${report.grade} | rows ${t.rows.toLocaleString()} | ` +
    `critical ${t.critical.toLocaleString()} | warn ${t.warn.toLocaleString()} | info ${t.info.toLocaleString()} | ` +
    `err ${t.errRows.toLocaleString()} | parseErr ${parseErrors} | ${Math.round(report.elapsedMs / 1000)}s\n` +
    `[sfc-accuracy-audit] report: ${args.out}.{json,md}\n`,
  );
  if (args.json) process.stdout.write(JSON.stringify({ grade: report.grade, totals: t, checks: report.checksSorted, parseErrors }, null, 2) + "\n");

  return args.failOnCritical && report.grade === "FAIL" ? EXIT_FAIL : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(`[sfc-accuracy-audit] FATAL ${e && e.stack ? e.stack : e}\n`);
    process.exit(EXIT_BAD_ARGS);
  });
