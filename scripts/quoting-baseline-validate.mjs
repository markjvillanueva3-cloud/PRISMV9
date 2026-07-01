#!/usr/bin/env node
/**
 * quoting-baseline-validate — standalone freshness/degeneracy preflight for the
 * quoting training baseline. Runs the SAME validateBaseline() the train-cycle
 * preflight uses, so an operator or cron can check a baseline WITHOUT training.
 *
 * QUOTING-SYNERGY-MS0/U-QP-BASELINE-GUARD (slot:charlie 2026-06-01).
 *
 * Built after a 2026-06-01 finding that the production baseline-records.json was a
 * degenerate placeholder (100 records, all actual_revenue_usd=10, 7 Okuma machine
 * MODELS as "customers") that a dry-run train-cycle scored at MAPE 1880.99% while
 * reporting safe_to_activate=true. This CLI is the executable freshness preflight
 * the charlie soul mandates before any training run.
 *
 * Usage:
 *   node scripts/quoting-baseline-validate.mjs
 *   node scripts/quoting-baseline-validate.mjs --baseline state/shared/quoting/baseline-records.json
 *   node scripts/quoting-baseline-validate.mjs --json
 *
 * Exit codes:
 *   0  baseline OK — safe to train
 *   1  could not read/parse the baseline file, or it has 0 records
 *   2  baseline REFUSED (degenerate/poisoned) — do NOT train
 */
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { validateBaseline } from "./lib/quoting-baseline-guard.mjs";

const DEFAULT_BASELINE = "state/shared/quoting/baseline-records.json";

/**
 * buildReport — pure: turn a parsed baseline payload into a flat, machine-readable
 * verdict. Exported so the test suite can pin the shape without spawning a process.
 */
export function buildReport(payload) {
  const records = Array.isArray(payload?.records) ? payload.records : [];
  const res = validateBaseline(records);
  const deg = res.degeneracy ?? {};
  return {
    ok: res.ok,
    refuse: res.refuse,
    total: res.total,
    poisoned: res.poisoned,
    clean_count: res.clean_count,
    reasons: res.reasons,
    machine_name_share: deg.machineNameShare ?? 0,
    builder_word_share: deg.builderWordShare ?? 0,
    revenue_unique_values: deg.revenueUniqueValues ?? 0,
  };
}

function parseArgs(argv) {
  const args = { baseline: DEFAULT_BASELINE, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--baseline") args.baseline = argv[++i];
    else if (a === "--json") args.json = true;
  }
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const path = resolve(process.cwd(), args.baseline);

  let payload;
  try {
    payload = JSON.parse(await fs.readFile(path, "utf-8"));
  } catch (e) {
    if (args.json) {
      process.stdout.write(JSON.stringify({ ok: false, reason: "read/parse failed", path, error: String(e) }) + "\n");
    } else {
      process.stderr.write(`[quoting-baseline-validate] FAIL: cannot read/parse ${path}: ${e}\n`);
    }
    return 1;
  }

  const records = Array.isArray(payload?.records) ? payload.records : [];
  if (records.length === 0) {
    if (args.json) {
      process.stdout.write(JSON.stringify({ ok: false, reason: "0 records", path }) + "\n");
    } else {
      process.stderr.write(`[quoting-baseline-validate] FAIL: ${path} has 0 records\n`);
    }
    return 1;
  }

  const report = buildReport(payload);
  if (args.json) {
    process.stdout.write(JSON.stringify({ ...report, path }) + "\n");
  } else if (report.refuse) {
    process.stderr.write(
      `[quoting-baseline-validate] REFUSE: ${report.total} records, ` +
        `${report.poisoned} machine-name, ${report.clean_count} clean — DEGENERATE, do NOT train:\n` +
        report.reasons.map((r) => `  • ${r}`).join("\n") + "\n",
    );
  } else {
    process.stdout.write(
      `[quoting-baseline-validate] OK: ${report.total} records, ${report.poisoned} machine-name filtered, ` +
        `${report.clean_count} clean — safe to train.\n`,
    );
  }
  return report.refuse ? 2 : 0;
}

// Import-safe CLI guard — main() runs only when invoked directly, not on import.
const isMain = (() => {
  try {
    return process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\//, ""));
  } catch {
    return false;
  }
})();

if (isMain) {
  main()
    .then((code) => process.exit(code))
    .catch((e) => {
      process.stderr.write(`[quoting-baseline-validate] UNHANDLED: ${e}\n`);
      process.exit(1);
    });
}
