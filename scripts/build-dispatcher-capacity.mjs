#!/usr/bin/env node
/**
 * build-dispatcher-capacity.mjs — Dispatcher Capacity Audit
 *   (CLEANUP-MS0 / U-CLEANUP-F7)
 *
 * Daily audit that flags dispatchers approaching or exceeding the
 * adaptive `dispatcher_capacity_ceiling` (default 200 actions/dispatcher).
 *
 * The signal feeds:
 *   - C1 WiringPotentialEngine — must NOT route new engines to a
 *     dispatcher already at >= 80% capacity.
 *   - Operator dashboards — eyes-on awareness of capacity hotspots.
 *
 * Inputs (read-only, advisory):
 *   - mcp-server/data/dispatcher-health/AGGREGATE.json
 *     (the canonical per-dispatcher action-count manifest written by
 *      the periodic dispatcher-health builder; 89-97 entries)
 *   - state/shared/adaptive-thresholds.json
 *     (values.dispatcher_capacity_ceiling — current adaptive ceiling)
 *
 * Outputs:
 *   - state/shared/DISPATCHER_CAPACITY.md  (human-readable)
 *   - state/shared/DISPATCHER_CAPACITY.json (machine; schemaVersion 1)
 *
 * CLI:
 *   node scripts/build-dispatcher-capacity.mjs
 *   node scripts/build-dispatcher-capacity.mjs --json
 *   node scripts/build-dispatcher-capacity.mjs --ceiling 300
 *   node scripts/build-dispatcher-capacity.mjs --frozen-time 2026-05-14T00:00:00Z
 *   node scripts/build-dispatcher-capacity.mjs --aggregate <path> --thresholds <path>
 *
 * Exit codes:
 *   0  — report written (advisory pass)
 *   1  — fatal IO / missing required inputs / unrecoverable parse
 *
 * Pure-functional core (computeCapacityReport) is exported for tests.
 * The CLI wrapper handles atomic writes via PID+ts+random tmp.
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-F7.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { dirname, isAbsolute as pathIsAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_REPO = resolve(__dirname, "..");

// Capacity ratio thresholds (semantic constants, not magic numbers).
const WARN_RATIO = 0.8;
const CRITICAL_RATIO = 1.0;
const DEFAULT_CEILING = 200;
const STALE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_AGGREGATE_REL = "mcp-server/data/dispatcher-health/AGGREGATE.json";
const DEFAULT_THRESHOLDS_REL = "state/shared/adaptive-thresholds.json";
const DEFAULT_OUT_MD_REL = "state/shared/DISPATCHER_CAPACITY.md";
const DEFAULT_OUT_JSON_REL = "state/shared/DISPATCHER_CAPACITY.json";

/**
 * Parse argv into an options object. Pure; never reads disk.
 *
 * @param {string[]} argv  process.argv.slice(2) shape (no node / script path).
 * @returns {{
 *   json: boolean,
 *   ceilingOverride: number | null,
 *   frozenTime: string | null,
 *   aggregatePath: string | null,
 *   thresholdsPath: string | null,
 *   outMd: string | null,
 *   outJson: string | null,
 *   help: boolean,
 * }}
 */
export function parseArgs(argv) {
  const opts = {
    json: false,
    ceilingOverride: null,
    frozenTime: null,
    aggregatePath: null,
    thresholdsPath: null,
    outMd: null,
    outJson: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--ceiling") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) opts.ceilingOverride = n;
    } else if (a === "--frozen-time") opts.frozenTime = argv[++i] ?? null;
    else if (a === "--aggregate") opts.aggregatePath = argv[++i] ?? null;
    else if (a === "--thresholds") opts.thresholdsPath = argv[++i] ?? null;
    else if (a === "--out-md") opts.outMd = argv[++i] ?? null;
    else if (a === "--out-json") opts.outJson = argv[++i] ?? null;
  }
  return opts;
}

/**
 * Compute the capacity report from already-parsed inputs.
 *
 * Pure: no disk, no clock, no env. All non-determinism is injected.
 * This is the unit under test for the bulk of the suite.
 *
 * @param {object} args
 * @param {object} args.aggregate         parsed AGGREGATE.json contents
 * @param {object|null} args.thresholds   parsed adaptive-thresholds.json or null
 * @param {number|null} args.ceilingOverride  CLI override of capacity ceiling
 * @param {string} args.nowIso            current time (frozen for tests)
 * @param {string|null} args.aggregateMtimeIso  mtime of AGGREGATE for staleness
 * @returns {{
 *   schemaVersion: number,
 *   generatedAt: string,
 *   ceiling: number,
 *   ceilingSource: 'override' | 'adaptive' | 'default',
 *   sourceTimestamp: string | null,
 *   sourceAgeDays: number | null,
 *   sourceStale: boolean,
 *   totals: { dispatchers: number, actions: number },
 *   stats: { meanRatio: number, maxRatio: number, p95Ratio: number },
 *   counts: { critical: number, warn: number, ok: number },
 *   rows: Array<{name:string, actions:number, ratio:number, status:string}>,
 *   flagged: Array<{name:string, actions:number, ratio:number, status:string}>,
 *   top10: Array<{name:string, actions:number, ratio:number, status:string}>,
 *   notes: string[],
 * }}
 */
export function computeCapacityReport({
  aggregate,
  thresholds,
  ceilingOverride,
  nowIso,
  aggregateMtimeIso,
}) {
  const notes = [];

  // Resolve ceiling (override > adaptive > default).
  let ceiling = DEFAULT_CEILING;
  let ceilingSource = "default";
  if (Number.isFinite(ceilingOverride) && ceilingOverride > 0) {
    ceiling = ceilingOverride;
    ceilingSource = "override";
  } else if (
    thresholds &&
    thresholds.values &&
    Number.isFinite(thresholds.values.dispatcher_capacity_ceiling) &&
    thresholds.values.dispatcher_capacity_ceiling > 0
  ) {
    ceiling = thresholds.values.dispatcher_capacity_ceiling;
    ceilingSource = "adaptive";
  } else {
    notes.push(
      `adaptive-thresholds.values.dispatcher_capacity_ceiling not found — using default ${DEFAULT_CEILING}`,
    );
  }

  // Source staleness.
  const sourceTimestamp =
    aggregate && typeof aggregate.timestamp === "string" ? aggregate.timestamp : null;
  let sourceAgeDays = null;
  if (sourceTimestamp && nowIso) {
    const dt = Date.parse(sourceTimestamp);
    const dn = Date.parse(nowIso);
    if (Number.isFinite(dt) && Number.isFinite(dn)) {
      sourceAgeDays = Math.max(0, Math.round((dn - dt) / MS_PER_DAY));
    }
  }
  // Fall back to file mtime if aggregate.timestamp absent.
  if (sourceAgeDays === null && aggregateMtimeIso && nowIso) {
    const dt = Date.parse(aggregateMtimeIso);
    const dn = Date.parse(nowIso);
    if (Number.isFinite(dt) && Number.isFinite(dn)) {
      sourceAgeDays = Math.max(0, Math.round((dn - dt) / MS_PER_DAY));
    }
  }
  const sourceStale = sourceAgeDays !== null && sourceAgeDays > STALE_DAYS;
  if (sourceStale) {
    notes.push(
      `AGGREGATE source is STALE — ${sourceAgeDays} days old (> ${STALE_DAYS}d threshold); regenerate via dispatcher-health builder`,
    );
  }

  // Build per-dispatcher rows.
  const reports = Array.isArray(aggregate?.dispatcherReports)
    ? aggregate.dispatcherReports
    : [];
  if (reports.length === 0) {
    notes.push("aggregate.dispatcherReports is empty or missing");
  }

  const rows = [];
  for (const r of reports) {
    if (!r || typeof r.name !== "string") continue;
    // Coerce actions to a sane non-negative finite integer.
    let actions = 0;
    if (Number.isFinite(r.actions) && r.actions >= 0) {
      actions = Math.floor(r.actions);
    }
    const ratio = ceiling > 0 ? actions / ceiling : 0;
    let status = "ok";
    if (ratio >= CRITICAL_RATIO) status = "critical";
    else if (ratio >= WARN_RATIO) status = "warn";
    rows.push({ name: r.name, actions, ratio, status });
  }
  // Sort descending by ratio (stable on equal ratio by name asc).
  rows.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    return a.name.localeCompare(b.name);
  });

  // Stats.
  const totalDispatchers = rows.length;
  const totalActions = rows.reduce((acc, r) => acc + r.actions, 0);
  const ratios = rows.map((r) => r.ratio);
  const meanRatio = ratios.length === 0 ? 0 : ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const maxRatio = ratios.length === 0 ? 0 : Math.max(...ratios);
  // p95 — nearest-rank on sorted-ascending ratios.
  let p95Ratio = 0;
  if (ratios.length > 0) {
    const sortedAsc = ratios.slice().sort((a, b) => a - b);
    const rank = Math.min(sortedAsc.length - 1, Math.ceil(0.95 * sortedAsc.length) - 1);
    p95Ratio = sortedAsc[Math.max(0, rank)];
  }

  const counts = {
    critical: rows.filter((r) => r.status === "critical").length,
    warn: rows.filter((r) => r.status === "warn").length,
    ok: rows.filter((r) => r.status === "ok").length,
  };
  const flagged = rows.filter((r) => r.status !== "ok");
  const top10 = rows.slice(0, 10);

  return {
    schemaVersion: 1,
    generatedAt: nowIso ?? new Date().toISOString(),
    ceiling,
    ceilingSource,
    sourceTimestamp,
    sourceAgeDays,
    sourceStale,
    totals: { dispatchers: totalDispatchers, actions: totalActions },
    stats: {
      meanRatio: round3(meanRatio),
      maxRatio: round3(maxRatio),
      p95Ratio: round3(p95Ratio),
    },
    counts,
    rows,
    flagged,
    top10,
    notes,
  };
}

/**
 * Render a capacity report to markdown.
 * Pure; never reads disk.
 *
 * @param {ReturnType<typeof computeCapacityReport>} report
 * @returns {string}
 */
export function renderMarkdown(report) {
  const lines = [];
  lines.push(`# Dispatcher Capacity Audit`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(
    `Ceiling: ${report.ceiling} actions/dispatcher (source: ${report.ceilingSource})`,
  );
  if (report.sourceTimestamp) {
    const staleTag = report.sourceStale ? " ⚠ STALE" : "";
    lines.push(`Source: ${report.sourceTimestamp} (age ${report.sourceAgeDays}d${staleTag})`);
  }
  lines.push("");
  lines.push(`## Totals`);
  lines.push("");
  lines.push(`- Dispatchers: **${report.totals.dispatchers}**`);
  lines.push(`- Actions: **${report.totals.actions}**`);
  lines.push(`- Mean ratio: **${report.stats.meanRatio}**`);
  lines.push(`- p95 ratio: **${report.stats.p95Ratio}**`);
  lines.push(`- Max ratio: **${report.stats.maxRatio}**`);
  lines.push("");
  lines.push(`## Status counts`);
  lines.push("");
  lines.push(`- 🔴 critical (≥100%): **${report.counts.critical}**`);
  lines.push(`- 🟡 warn (≥80%): **${report.counts.warn}**`);
  lines.push(`- 🟢 ok (<80%): **${report.counts.ok}**`);
  lines.push("");

  if (report.flagged.length === 0) {
    lines.push(`## Flagged dispatchers`);
    lines.push("");
    lines.push(`_none — all dispatchers below 80% capacity_`);
    lines.push("");
  } else {
    lines.push(`## Flagged dispatchers (≥80%)`);
    lines.push("");
    lines.push(`| Status | Dispatcher | Actions | Ratio |`);
    lines.push(`|---|---|---:|---:|`);
    for (const r of report.flagged) {
      const icon = r.status === "critical" ? "🔴" : "🟡";
      lines.push(
        `| ${icon} ${r.status} | ${r.name} | ${r.actions} | ${formatPct(r.ratio)} |`,
      );
    }
    lines.push("");
  }

  lines.push(`## Top 10 by ratio`);
  lines.push("");
  if (report.top10.length === 0) {
    lines.push(`_no dispatcher rows_`);
  } else {
    lines.push(`| Rank | Dispatcher | Actions | Ratio | Status |`);
    lines.push(`|---:|---|---:|---:|---|`);
    report.top10.forEach((r, idx) => {
      lines.push(
        `| ${idx + 1} | ${r.name} | ${r.actions} | ${formatPct(r.ratio)} | ${r.status} |`,
      );
    });
  }
  lines.push("");

  if (report.notes.length > 0) {
    lines.push(`## Notes`);
    lines.push("");
    for (const n of report.notes) lines.push(`- ${n}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("Source: CLEANUP-MS0 / U-CLEANUP-F7 build-dispatcher-capacity.mjs");
  return lines.join("\n") + "\n";
}

function round3(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

function formatPct(ratio) {
  if (!Number.isFinite(ratio)) return "n/a";
  return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * Atomic write — writes to a tmp file in the same directory then renames.
 * tmp suffix uses PID+ts+random so concurrent writers on different
 * inodes don't collide. The MD/JSON files live in state/shared/ which
 * IS edited by other chats; the rename is the only file-system mutation
 * peers can observe.
 *
 * On rename-EEXIST (Windows) retries up to 3× with new tmp names.
 */
function writeAtomic(dest, contents) {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const tag = `${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const tmp = `${dest}.tmp-${tag}`;
    try {
      writeFileSync(tmp, contents, "utf-8");
      renameSync(tmp, dest);
      return;
    } catch (e) {
      lastErr = e;
      try {
        if (existsSync(tmp)) unlinkSync(tmp);
      } catch (_) {
        /* ignore tmp cleanup failure */
      }
    }
  }
  throw lastErr ?? new Error(`writeAtomic failed for ${dest}`);
}

function readJsonSafe(path) {
  try {
    const raw = readFileSync(path, "utf-8");
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function getMtimeIso(path) {
  try {
    return statSync(path).mtime.toISOString();
  } catch (_) {
    return null;
  }
}

function abs(repo, p) {
  return pathIsAbsolute(p) ? p : resolve(repo, p);
}

/**
 * CLI entry-point. Returns the report object so tests can inspect.
 *
 * @param {object} cliEnv
 * @param {string[]} cliEnv.argv         process.argv.slice(2)
 * @param {string} [cliEnv.repo]         repo root (default: parent of this file)
 * @param {(...a:any[])=>void} [cliEnv.out]   stdout sink (default: console.log)
 * @param {(...a:any[])=>void} [cliEnv.err]   stderr sink (default: console.error)
 * @returns {Promise<{exitCode: number, report?: any}>}
 */
export async function main({
  argv,
  repo = DEFAULT_REPO,
  out = (...a) => console.log(...a),
  err = (...a) => console.error(...a),
} = {}) {
  const opts = parseArgs(argv ?? []);
  if (opts.help) {
    out(
      [
        "build-dispatcher-capacity.mjs — Dispatcher capacity audit",
        "",
        "Flags:",
        "  --json                 emit machine JSON to stdout (no MD write)",
        "  --ceiling N            override capacity ceiling (default: adaptive)",
        "  --frozen-time ISO      freeze 'now' for deterministic output",
        "  --aggregate <path>     override AGGREGATE.json path",
        "  --thresholds <path>    override adaptive-thresholds.json path",
        "  --out-md <path>        override DISPATCHER_CAPACITY.md path",
        "  --out-json <path>      override DISPATCHER_CAPACITY.json path",
        "  -h, --help             print this help and exit",
      ].join("\n"),
    );
    return { exitCode: 0 };
  }

  const aggregatePath = abs(repo, opts.aggregatePath ?? DEFAULT_AGGREGATE_REL);
  const thresholdsPath = abs(repo, opts.thresholdsPath ?? DEFAULT_THRESHOLDS_REL);
  const outMd = abs(repo, opts.outMd ?? DEFAULT_OUT_MD_REL);
  const outJson = abs(repo, opts.outJson ?? DEFAULT_OUT_JSON_REL);
  const nowIso = opts.frozenTime ?? new Date().toISOString();

  const aggRes = readJsonSafe(aggregatePath);
  if (!aggRes.ok) {
    err(`[F7] FATAL: cannot read ${aggregatePath} — ${aggRes.error?.message ?? aggRes.error}`);
    return { exitCode: 1 };
  }

  // Thresholds is optional — we fall back to DEFAULT_CEILING with a note.
  const thrRes = readJsonSafe(thresholdsPath);
  const thresholds = thrRes.ok ? thrRes.value : null;

  const aggregateMtimeIso = getMtimeIso(aggregatePath);

  const report = computeCapacityReport({
    aggregate: aggRes.value,
    thresholds,
    ceilingOverride: opts.ceilingOverride,
    nowIso,
    aggregateMtimeIso,
  });

  if (opts.json) {
    out(JSON.stringify(report, null, 2));
    return { exitCode: 0, report };
  }

  // Write outputs (atomic).
  writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
  writeAtomic(outMd, renderMarkdown(report));

  out(
    `[F7] capacity report — ${report.totals.dispatchers} dispatchers, ${report.totals.actions} actions, ` +
      `${report.counts.critical} critical / ${report.counts.warn} warn / ${report.counts.ok} ok ` +
      `(ceiling ${report.ceiling}, source ${report.ceilingSource})`,
  );
  if (report.sourceStale) {
    out(`[F7] WARN: AGGREGATE source is stale (${report.sourceAgeDays}d > ${STALE_DAYS}d)`);
  }

  return { exitCode: 0, report };
}

// Only auto-run when invoked as the script entrypoint (not when imported by tests).
const invokedAsScript = (() => {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    return resolve(argv1) === resolve(__filename);
  } catch (_) {
    return false;
  }
})();

if (invokedAsScript) {
  main({ argv: process.argv.slice(2) }).then(
    (r) => process.exit(r.exitCode),
    (e) => {
      console.error("[F7] uncaught:", e);
      process.exit(1);
    },
  );
}

// Export constants for tests.
export const _internals = {
  WARN_RATIO,
  CRITICAL_RATIO,
  DEFAULT_CEILING,
  STALE_DAYS,
};
