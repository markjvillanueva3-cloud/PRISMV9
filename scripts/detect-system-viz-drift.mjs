#!/usr/bin/env node
/**
 * detect-system-viz-drift.mjs — SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-DRIFT-DETECTOR
 *
 * Diffs system-viz graph state against current disk reality. Surfaces stale
 * namespaces (lastWalkedAt aging past threshold) AND coverage-delta cases
 * (where dir mtime is significantly past lastWalkedAt). Writes a machine-readable
 * report at state/shared/system-viz/DRIFT_REPORT.json that the /system-viz-drift
 * skill (U-MS1-DRIFT-SKILL) and the stop-system-viz-drift.mjs hook
 * (U-MS1-DRIFT-STOP-HOOK) read.
 *
 * Drift categorisation (per namespace):
 *   - "fresh"        — walk is current, no recent disk activity since walk
 *   - "stale-time"   — walk older than max-staleness threshold (default 24h)
 *   - "stale-churn"  — disk activity since walk (dirMtime > lastWalkedAt + tolerance)
 *   - "truncated"    — fsCoverage.truncated === true, coverage incomplete
 *   - "root-missing" — walkRoot no longer exists on disk
 *   - "never-walked" — namespace tracked in graph but lastWalkedAt missing
 *
 * Companion to:
 *   - namespace-churn-ranker.mjs — both consume fsCoverage; this enriches it
 *   - cron-revwalk.mjs           — picks the stalest ones to actually re-walk
 *
 * Pure-export contract (for tests):
 *   classifyDrift(entry, deps) → { category, stalenessMs, severity }
 *   buildDriftReport(graphPath, deps) → DriftReport
 *
 * Usage:
 *   node scripts/detect-system-viz-drift.mjs                # writes report, prints summary
 *   node scripts/detect-system-viz-drift.mjs --json         # machine-readable to stdout
 *   node scripts/detect-system-viz-drift.mjs --quiet        # silent unless stderr error
 *   node scripts/detect-system-viz-drift.mjs --no-write     # don't update DRIFT_REPORT.json
 *   node scripts/detect-system-viz-drift.mjs --max-staleness-hours 12
 *   node scripts/detect-system-viz-drift.mjs --tolerance-ms 60000
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadNamespacesFromGraph,
  defaultFsStat,
  DEFAULT_MAX_STALENESS_MS,
} from "./lib/namespace-churn-ranker.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const REPORT_PATH = path.join(ROOT, "state", "shared", "system-viz", "DRIFT_REPORT.json");
const DEFAULT_MTIME_TOLERANCE_MS = 30 * 1000; // 30s — debounces FS timestamp jitter

export const DRIFT_CATEGORIES = Object.freeze({
  FRESH: "fresh",
  STALE_TIME: "stale-time",
  STALE_CHURN: "stale-churn",
  TRUNCATED: "truncated",
  ROOT_MISSING: "root-missing",
  NEVER_WALKED: "never-walked",
});

const SEVERITY_RANK = {
  [DRIFT_CATEGORIES.FRESH]: 0,
  [DRIFT_CATEGORIES.STALE_CHURN]: 1,
  [DRIFT_CATEGORIES.STALE_TIME]: 2,
  [DRIFT_CATEGORIES.TRUNCATED]: 3,
  [DRIFT_CATEGORIES.NEVER_WALKED]: 4,
  [DRIFT_CATEGORIES.ROOT_MISSING]: 5,
};

/**
 * Pure classifier: given one namespace entry + dependency-injected deps,
 * return { category, stalenessMs, severity, dirMtimeMs, lastWalkedAtMs, deltaMs }.
 */
export function classifyDrift(entry, deps = {}) {
  const fsStat = deps.fsStat ?? defaultFsStat;
  const nowMs = deps.nowMs ?? Date.now();
  const maxStalenessMs = deps.maxStalenessMs ?? DEFAULT_MAX_STALENESS_MS;
  const toleranceMs = deps.toleranceMs ?? DEFAULT_MTIME_TOLERANCE_MS;

  const lastWalkedAtMs = entry.lastWalkedAt ? Date.parse(entry.lastWalkedAt) : 0;
  const stalenessMs = lastWalkedAtMs > 0 ? Math.max(nowMs - lastWalkedAtMs, 0) : Infinity;

  let dirMtimeMs = 0;
  let rootStatError = null;
  try {
    const st = fsStat(entry.root);
    if (!st) rootStatError = "root-missing";
    else dirMtimeMs = Number(st.mtimeMs) || 0;
  } catch (err) {
    rootStatError = `stat-failed: ${err?.message || String(err)}`;
  }

  if (rootStatError === "root-missing") {
    return {
      category: DRIFT_CATEGORIES.ROOT_MISSING,
      stalenessMs,
      severity: SEVERITY_RANK[DRIFT_CATEGORIES.ROOT_MISSING],
      dirMtimeMs: 0,
      lastWalkedAtMs,
      deltaMs: 0,
      note: "walkRoot no longer exists on disk",
    };
  }

  if (!lastWalkedAtMs || !Number.isFinite(lastWalkedAtMs)) {
    return {
      category: DRIFT_CATEGORIES.NEVER_WALKED,
      stalenessMs: Infinity,
      severity: SEVERITY_RANK[DRIFT_CATEGORIES.NEVER_WALKED],
      dirMtimeMs,
      lastWalkedAtMs: 0,
      deltaMs: 0,
      note: "namespace tracked in graph but no lastWalkedAt",
    };
  }

  if (entry.truncated === true) {
    return {
      category: DRIFT_CATEGORIES.TRUNCATED,
      stalenessMs,
      severity: SEVERITY_RANK[DRIFT_CATEGORIES.TRUNCATED],
      dirMtimeMs,
      lastWalkedAtMs,
      deltaMs: dirMtimeMs - lastWalkedAtMs,
      note: "fsCoverage.truncated=true — walk hit max-files cap",
    };
  }

  if (stalenessMs > maxStalenessMs) {
    return {
      category: DRIFT_CATEGORIES.STALE_TIME,
      stalenessMs,
      severity: SEVERITY_RANK[DRIFT_CATEGORIES.STALE_TIME],
      dirMtimeMs,
      lastWalkedAtMs,
      deltaMs: dirMtimeMs - lastWalkedAtMs,
      note: `walk age ${formatMs(stalenessMs)} > threshold ${formatMs(maxStalenessMs)}`,
    };
  }

  const deltaMs = dirMtimeMs - lastWalkedAtMs;
  if (deltaMs > toleranceMs) {
    return {
      category: DRIFT_CATEGORIES.STALE_CHURN,
      stalenessMs,
      severity: SEVERITY_RANK[DRIFT_CATEGORIES.STALE_CHURN],
      dirMtimeMs,
      lastWalkedAtMs,
      deltaMs,
      note: `disk activity Δ=${formatMs(deltaMs)} since walk`,
    };
  }

  return {
    category: DRIFT_CATEGORIES.FRESH,
    stalenessMs,
    severity: SEVERITY_RANK[DRIFT_CATEGORIES.FRESH],
    dirMtimeMs,
    lastWalkedAtMs,
    deltaMs,
    note: "fresh — within tolerance",
  };
}

/**
 * Build a full DriftReport for a system-viz graph file.
 * Returns { generatedAt, graphPath, total, byCategory, namespaces, summary }.
 */
export function buildDriftReport(graphPath, deps = {}) {
  const generatedAt = new Date(deps.nowMs ?? Date.now()).toISOString();
  const entries = loadNamespacesFromGraph(graphPath);
  if (entries.length === 0) {
    return {
      generatedAt,
      graphPath,
      total: 0,
      byCategory: {},
      namespaces: [],
      summary: "no fsCoverage entries in graph",
    };
  }
  const classified = entries.map((entry) => {
    const c = classifyDrift(entry, deps);
    return {
      namespace: entry.namespace,
      root: entry.root,
      lastWalkedAt: entry.lastWalkedAt,
      filesRepresented: entry.filesRepresented,
      coverageRatio: entry.coverageRatio,
      truncated: entry.truncated,
      driftCategory: c.category,
      driftSeverity: c.severity,
      stalenessMs: Number.isFinite(c.stalenessMs) ? c.stalenessMs : null,
      stalenessHr: Number.isFinite(c.stalenessMs) ? +(c.stalenessMs / 3_600_000).toFixed(2) : null,
      deltaMs: c.deltaMs,
      dirMtimeMs: c.dirMtimeMs,
      note: c.note,
    };
  });

  // Sort: highest severity first, then by stalenessMs DESC, then namespace ASC
  classified.sort((a, b) => {
    if (a.driftSeverity !== b.driftSeverity) return b.driftSeverity - a.driftSeverity;
    const aStale = a.stalenessMs ?? Infinity;
    const bStale = b.stalenessMs ?? Infinity;
    if (aStale !== bStale) return bStale - aStale;
    return String(a.namespace).localeCompare(String(b.namespace));
  });

  const byCategory = {};
  for (const c of Object.values(DRIFT_CATEGORIES)) byCategory[c] = 0;
  for (const n of classified) byCategory[n.driftCategory]++;

  const driftedCount = classified.length - byCategory[DRIFT_CATEGORIES.FRESH];
  const summary = driftedCount === 0
    ? `all ${classified.length} namespaces fresh`
    : `${driftedCount}/${classified.length} drifted — ${describeNonFresh(byCategory)}`;

  return {
    generatedAt,
    graphPath,
    total: classified.length,
    byCategory,
    namespaces: classified,
    summary,
  };
}

function describeNonFresh(byCategory) {
  const parts = [];
  for (const cat of Object.values(DRIFT_CATEGORIES)) {
    if (cat === DRIFT_CATEGORIES.FRESH) continue;
    if (byCategory[cat] > 0) parts.push(`${cat}: ${byCategory[cat]}`);
  }
  return parts.join(", ");
}

function formatMs(ms) {
  if (!Number.isFinite(ms)) return "∞";
  const abs = Math.abs(ms);
  if (abs < 1000) return `${ms}ms`;
  if (abs < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (abs < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (abs < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

function parseCliArgs(argv) {
  const out = {
    graphPath: GRAPH,
    reportPath: REPORT_PATH,
    json: false,
    quiet: false,
    noWrite: false,
    maxStalenessMs: DEFAULT_MAX_STALENESS_MS,
    toleranceMs: DEFAULT_MTIME_TOLERANCE_MS,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--quiet") out.quiet = true;
    else if (a === "--no-write") out.noWrite = true;
    else if (a === "--graph") out.graphPath = argv[++i];
    else if (a === "--report") out.reportPath = argv[++i];
    else if (a === "--max-staleness-hours") out.maxStalenessMs = Number(argv[++i]) * 3_600_000;
    else if (a === "--tolerance-ms") out.toleranceMs = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.error("usage: detect-system-viz-drift [--json] [--quiet] [--no-write] [--graph path] [--report path] [--max-staleness-hours N] [--tolerance-ms N]");
      process.exit(0);
    }
  }
  return out;
}

/** Atomic write — write tmp then rename. Idempotent — re-runs overwrite. */
function writeReportAtomic(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const tmp = reportPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(report, null, 2));
  fs.renameSync(tmp, reportPath);
}

function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  const report = buildDriftReport(opts.graphPath, {
    maxStalenessMs: opts.maxStalenessMs,
    toleranceMs: opts.toleranceMs,
  });

  if (!opts.noWrite) {
    try { writeReportAtomic(opts.reportPath, report); }
    catch (err) {
      if (!opts.quiet) console.error(`WARN: failed to write report at ${opts.reportPath}: ${err?.message || err}`);
    }
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (opts.quiet) return;

  console.log(`System-Viz Drift Report — generated ${report.generatedAt}`);
  console.log(`  total: ${report.total} namespaces`);
  console.log(`  summary: ${report.summary}`);
  console.log("");
  console.log("  category        count");
  console.log("  " + "-".repeat(28));
  for (const [cat, count] of Object.entries(report.byCategory)) {
    console.log(`  ${cat.padEnd(15)} ${String(count).padStart(5)}`);
  }
  const driftedRows = report.namespaces.filter((n) => n.driftCategory !== DRIFT_CATEGORIES.FRESH);
  if (driftedRows.length > 0) {
    console.log("\n  drifted namespaces (top 10):\n");
    console.log("  category        staleness  files     namespace");
    console.log("  " + "-".repeat(80));
    for (const n of driftedRows.slice(0, 10)) {
      const stale = n.stalenessHr === null ? "?" : `${n.stalenessHr.toFixed(1)}h`;
      console.log(`  ${n.driftCategory.padEnd(15)} ${stale.padEnd(10)} ${String(n.filesRepresented).padEnd(9)} ${n.namespace}`);
      console.log(`    └─ ${n.note}`);
    }
  }
  if (!opts.noWrite) console.log(`\n  report written → ${opts.reportPath}`);
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { DEFAULT_MTIME_TOLERANCE_MS, parseCliArgs, writeReportAtomic };
