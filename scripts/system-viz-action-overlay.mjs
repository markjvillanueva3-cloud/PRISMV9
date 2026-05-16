#!/usr/bin/env node
/**
 * system-viz-action-overlay — render the append-only agent-write trace log
 * into a READ-ONLY system-viz overlay (timeline + per-agent / per-target /
 * per-tool rollups).
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-ACTION-TRACES (D4).
 *
 * Reads `state/shared/action-traces.jsonl` (the ActionTraceEngine log;
 * PRISM_ACTION_TRACE_FILE override honoured for parity with the engine) and
 * writes ONE additive staging artifact:
 *
 *   state/shared/system-viz/staging/action-trace-overlay.json
 *
 * It never mutates system-graph.json or any other graph input — the overlay
 * is a sidecar the viz layer reads on top of the live graph. Rollback is
 * "delete the staging file"; the trace log is untouched.
 *
 * The overlay deliberately drops `promptHash` + `sessionId` from the per-edge
 * `recent[]` slice — a viz timeline only needs the visible dims (ts / agent /
 * tool / target / action), and a JSON artifact under state/shared/ should not
 * carry the prompt-linkage hash any wider than the raw log already does.
 *
 * Usage:
 *   node scripts/system-viz-action-overlay.mjs                # write + human summary
 *   node scripts/system-viz-action-overlay.mjs --json         # write + emit overlay JSON
 *   node scripts/system-viz-action-overlay.mjs --since <ISO>   # only edges ts >= ISO
 *   node scripts/system-viz-action-overlay.mjs --limit <N>     # recent[] size (default 50)
 *   node scripts/system-viz-action-overlay.mjs --dry-run       # compute + print, do NOT write
 *
 * Read-only w.r.t. the graph. Exit 0 even when the log is absent (honest
 * empty-state overlay) so a cron/viz caller never fails on a fresh install.
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D4
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OVERLAY_SCHEMA_VERSION = "1.0.0";
const DEFAULT_RECENT = 50;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const a = { json: false, dryRun: false, since: null, limit: DEFAULT_RECENT };
  const unknown = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--since") a.since = argv[++i] ?? null;
    else if (t === "--limit") {
      const n = Number(argv[++i]);
      a.limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_RECENT;
    } else {
      unknown.push(t);
    }
  }
  // Fail-loud-but-soft (Karpathy R12): a mistyped flag from a cron must be
  // VISIBLE, but must NOT break the cron contract (exit non-zero) — warn to
  // stderr and continue with the recognized args.
  if (unknown.length) {
    process.stderr.write(
      `[system-viz-action-overlay] ignoring unrecognized arg(s): ${unknown.join(" ")}\n`,
    );
  }
  // A `--since` that isn't a parseable timestamp would silently filter
  // nothing useful (raw lexical compare against ISO). Surface it + null it.
  if (a.since && Number.isNaN(Date.parse(a.since))) {
    process.stderr.write(
      `[system-viz-action-overlay] --since ${JSON.stringify(a.since)} is not a parseable timestamp; ignoring the filter\n`,
    );
    a.since = null;
  }
  return a;
}

function traceFilePath() {
  const override = process.env.PRISM_ACTION_TRACE_FILE;
  if (override && override.trim()) return override.trim();
  return path.join(REPO_ROOT, "state", "shared", "action-traces.jsonl");
}

/** Read + parse the log. Corrupt lines are skipped + counted (never throws
 * on a bad line — one torn concurrent append must not blind the timeline). */
function readEdges(file, since) {
  if (!fs.existsSync(file)) return { edges: [], total: 0, skipped: 0 };
  const raw = fs.readFileSync(file, "utf8");
  const edges = [];
  let skipped = 0;
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    let e;
    try {
      e = JSON.parse(s);
    } catch {
      skipped++;
      continue;
    }
    // Minimal structural validation — the engine owns the strict schema; the
    // overlay just needs the visible dims to be present strings.
    if (
      !e ||
      typeof e.ts !== "string" ||
      typeof e.agent !== "string" ||
      typeof e.tool !== "string" ||
      typeof e.target !== "string" ||
      typeof e.action !== "string"
    ) {
      skipped++;
      continue;
    }
    if (since && e.ts < since) continue;
    edges.push(e);
  }
  return { edges, total: edges.length, skipped };
}

function buildOverlay(edges, total, skipped, since, recentLimit) {
  const byAgent = {};
  const byTool = {};
  const targetCounts = {};
  const timelineBuckets = {};
  for (const e of edges) {
    byAgent[e.agent] = (byAgent[e.agent] || 0) + 1;
    byTool[e.tool] = (byTool[e.tool] || 0) + 1;
    targetCounts[e.target] = (targetCounts[e.target] || 0) + 1;
    // Hourly bucket: YYYY-MM-DDTHH (lexical-sortable, ts already canonical Z).
    const bucket = e.ts.slice(0, 13);
    timelineBuckets[bucket] = (timelineBuckets[bucket] || 0) + 1;
  }
  const sortDescEntries = (obj) =>
    Object.fromEntries(Object.entries(obj).sort((x, y) => y[1] - x[1]));
  const topTargets = Object.entries(targetCounts)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 20)
    .map(([target, count]) => ({ target, count }));
  const timeline = Object.entries(timelineBuckets)
    .sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))
    .map(([bucket, count]) => ({ bucket, count }));
  const recent = edges.slice(-recentLimit).map((e) => ({
    ts: e.ts,
    agent: e.agent,
    tool: e.tool,
    target: e.target,
    action: e.action,
  }));
  return {
    schemaVersion: OVERLAY_SCHEMA_VERSION,
    kind: "action-trace-overlay",
    readOnly: true,
    generatedAt: new Date().toISOString(),
    windowSince: since || null,
    total,
    skipped,
    byAgent: sortDescEntries(byAgent),
    byTool: sortDescEntries(byTool),
    topTargets,
    timeline,
    recent,
  };
}

/** Atomic write so a concurrent viz reader never sees a half-written file.
 * The tmp is colocated with the target (same dir → same filesystem → rename
 * is atomic). On any failure the tmp is best-effort removed so a crashing
 * cron run can't accrete `.tmp-*` orphans in staging/. */
function atomicWriteJson(file, obj) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  // Best-effort sweep of stale tmp orphans from prior crashed runs.
  try {
    const base = path.basename(file);
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith(`${base}.tmp-`)) {
        try {
          fs.rmSync(path.join(dir, f), { force: true });
        } catch {
          /* leave it — next run retries */
        }
      }
    }
  } catch {
    /* dir unreadable — nothing to sweep */
  }
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, file);
  } catch (err) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      /* best-effort */
    }
    throw err;
  }
}

function humanSummary(overlay, outPath, wrote) {
  const lines = [];
  lines.push(`action-trace overlay — ${overlay.total} edge(s), ${overlay.skipped} skipped`);
  if (overlay.windowSince) lines.push(`  window: since ${overlay.windowSince}`);
  const agents = Object.entries(overlay.byAgent).slice(0, 5);
  if (agents.length) {
    lines.push(`  top agents: ${agents.map(([a, c]) => `${a}=${c}`).join("  ")}`);
  }
  const tools = Object.entries(overlay.byTool);
  if (tools.length) {
    lines.push(`  by tool: ${tools.map(([t, c]) => `${t}=${c}`).join("  ")}`);
  }
  if (overlay.topTargets.length) {
    lines.push(`  hottest target: ${overlay.topTargets[0].target} (${overlay.topTargets[0].count})`);
  }
  lines.push(`  timeline buckets: ${overlay.timeline.length} hour(s)`);
  if (overlay.total === 0) {
    lines.push("  (empty — no traces logged yet; overlay written as empty timeline)");
  }
  lines.push(wrote ? `  written: ${outPath}` : `  dry-run: NOT written (${outPath})`);
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = traceFilePath();
  const { edges, total, skipped } = readEdges(file, args.since);
  const overlay = buildOverlay(edges, total, skipped, args.since, args.limit);
  const outPath = path.join(
    REPO_ROOT,
    "state",
    "shared",
    "system-viz",
    "staging",
    "action-trace-overlay.json",
  );
  let wrote = false;
  if (!args.dryRun) {
    atomicWriteJson(outPath, overlay);
    wrote = true;
  }
  if (args.json) {
    process.stdout.write(JSON.stringify(overlay, null, 2) + "\n");
  } else {
    process.stdout.write(humanSummary(overlay, outPath, wrote) + "\n");
  }
}

main();
