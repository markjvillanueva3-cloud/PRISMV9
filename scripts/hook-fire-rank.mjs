#!/usr/bin/env node
// scripts/hook-fire-rank.mjs
//
// Empirical hook fire-rate ranker — the safe-on-Windows alternative to the
// audit's named `hook-overhead-profiler.mjs` (the spawn-based profiler
// approach is fork-storm prone per the documented CLAUDE.md xmalloc
// regression class; reading the existing telemetry is bounded-IO).
//
// What it does:
//   1. Parse `mcp-server/data/state/hook-fire-counts.jsonl` (8K+ events,
//      auto-populated by harness instrumentation).
//   2. Aggregate per-hook fire count + decision distribution.
//   3. Compute fire-rate (events / hour) over the observation window.
//   4. Cross-reference vs hooks-on-disk → find zero-fire candidates
//      (likely-dead or wired-but-never-fires).
//   5. Emit a ranked dashboard for the dev-tool-leverage-rank aggregator
//      and for direct operator use.
//
// Output ranking signal: high fire-rate = high p95-latency-budget consumer
// (if a hook fires 1000× per hour, latency × rate is the budget impact —
// reducing its rate or making it async is the highest-leverage fix).
//
// Usage:
//   node scripts/hook-fire-rank.mjs                  # text top-25
//   node scripts/hook-fire-rank.mjs --json
//   node scripts/hook-fire-rank.mjs --top 50
//   node scripts/hook-fire-rank.mjs --include-zero   # also list never-fires
//   node scripts/hook-fire-rank.mjs --no-disk-scan   # skip on-disk join
//   node scripts/hook-fire-rank.mjs --frozen-time ISO   # tests
//
// Exit: 0 ok, 2 input failure.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DEFAULT_LEDGER = resolve(REPO_ROOT, "mcp-server/data/state/hook-fire-counts.jsonl");
const HOOKS_DIR = resolve(REPO_ROOT, ".claude/hooks");

const DEFAULT_TOP_N = 25;
const MS_PER_HOUR = 3_600_000;

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    json: false,
    topN: DEFAULT_TOP_N,
    includeZero: false,
    noDiskScan: false,
    frozenTime: process.env.PRISM_AUDIT_FROZEN_TIME || null,
    ledgerPath: DEFAULT_LEDGER,
    hooksDir: HOOKS_DIR,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--include-zero") out.includeZero = true;
    else if (a === "--no-disk-scan") out.noDiskScan = true;
    else if (a === "--top") out.topN = readIntArg(argv[++i], "--top", 1, 5000);
    else if (a === "--frozen-time") out.frozenTime = argv[++i];
    else if (a === "--ledger-path") out.ledgerPath = resolve(argv[++i]);
    else if (a === "--hooks-dir") out.hooksDir = resolve(argv[++i]);
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  return out;
}

function readIntArg(raw, name, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
    console.error(`${name} requires integer in [${min},${max}], got: ${raw}`);
    process.exit(2);
  }
  return n;
}

function printHelp() {
  console.log(`hook-fire-rank.mjs — empirical hook fire-rate ranker

Reads mcp-server/data/state/hook-fire-counts.jsonl, ranks hooks by events/hour.

Flags:
  --json                emit JSON
  --top N               keep top-N (default ${DEFAULT_TOP_N})
  --include-zero        also list hooks on-disk that never fire
  --no-disk-scan        skip the .claude/hooks/ enumeration
  --frozen-time ISO     deterministic now for tests
  --ledger-path PATH    override JSONL ledger location
  --hooks-dir PATH      override .claude/hooks/ location`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry parser — pure function.
// ─────────────────────────────────────────────────────────────────────────────
export function parseLedger(jsonlText) {
  if (typeof jsonlText !== "string" || jsonlText.length === 0) {
    return { events: [], parseErrors: 0 };
  }
  const events = [];
  let parseErrors = 0;
  for (const raw of jsonlText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const j = JSON.parse(line);
      const ts = Date.parse(j.ts ?? "");
      if (!Number.isFinite(ts)) { parseErrors++; continue; }
      const hook = typeof j.hook === "string" && j.hook.length > 0 ? j.hook : null;
      if (!hook) { parseErrors++; continue; }
      events.push({
        ts,
        hook,
        decision: typeof j.decision === "string" ? j.decision : null,
      });
    } catch {
      parseErrors++;
    }
  }
  return { events, parseErrors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregator — pure function.
// ─────────────────────────────────────────────────────────────────────────────
export function aggregateFires(events, nowMs) {
  if (!Array.isArray(events) || events.length === 0) {
    return {
      windowMs: 0,
      windowHours: 0,
      totalEvents: 0,
      uniqueHooks: 0,
      perHook: [],
    };
  }
  let minTs = Infinity;
  let maxTs = -Infinity;
  const byHook = new Map();
  for (const e of events) {
    if (e.ts < minTs) minTs = e.ts;
    if (e.ts > maxTs) maxTs = e.ts;
    let entry = byHook.get(e.hook);
    if (!entry) {
      entry = { hook: e.hook, count: 0, decisions: new Map(), firstSeen: e.ts, lastSeen: e.ts };
      byHook.set(e.hook, entry);
    }
    entry.count++;
    if (e.ts < entry.firstSeen) entry.firstSeen = e.ts;
    if (e.ts > entry.lastSeen) entry.lastSeen = e.ts;
    if (e.decision != null) {
      entry.decisions.set(e.decision, (entry.decisions.get(e.decision) || 0) + 1);
    }
  }
  const upper = Math.max(maxTs, Number(nowMs) || maxTs);
  const windowMs = upper - minTs;
  const windowHours = Math.max(windowMs / MS_PER_HOUR, 0.0001); // avoid divide-by-zero
  const perHook = [];
  for (const entry of byHook.values()) {
    const decisionsArr = [...entry.decisions.entries()]
      .map(([k, v]) => ({ decision: k, count: v }))
      .sort((a, b) => b.count - a.count);
    perHook.push({
      hook: entry.hook,
      count: entry.count,
      fire_rate_per_hour: entry.count / windowHours,
      first_seen: new Date(entry.firstSeen).toISOString(),
      last_seen: new Date(entry.lastSeen).toISOString(),
      decisions: decisionsArr,
    });
  }
  perHook.sort((a, b) => (b.fire_rate_per_hour - a.fire_rate_per_hour) || (a.hook < b.hook ? -1 : 1));
  return {
    windowMs,
    windowHours,
    totalEvents: events.length,
    uniqueHooks: byHook.size,
    perHook,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Disk join — list of hooks on disk that never appear in the ledger.
// ─────────────────────────────────────────────────────────────────────────────
export function findZeroFireHooks(diskHookNames, firedHookNames) {
  const fired = new Set(firedHookNames);
  const zeros = [];
  for (const name of diskHookNames) {
    if (!fired.has(name)) zeros.push(name);
  }
  return zeros.sort();
}

function listHooksOnDisk(hooksDir) {
  const out = [];
  try {
    for (const entry of readdirSync(hooksDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".mjs")) continue;
      if (entry.name.endsWith(".test.mjs")) continue;
      out.push(basename(entry.name, ".mjs"));
    }
  } catch {
    return null; // hooks dir missing — caller handles
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────
function renderText(agg, zeros, opts, nowIso) {
  const lines = [];
  lines.push("─── Hook Fire-Rate Ranking ───");
  lines.push(`Generated: ${nowIso}  ·  Ledger window: ${agg.windowHours.toFixed(1)}h`);
  lines.push(`Events: ${agg.totalEvents}  ·  Unique firing hooks: ${agg.uniqueHooks}`);
  if (zeros) {
    lines.push(`Hooks on disk (never fired): ${zeros.length}`);
  }
  lines.push("");
  lines.push(`Top ${Math.min(opts.topN, agg.perHook.length)} of ${agg.perHook.length} by fires/hr:`);
  if (agg.perHook.length === 0) {
    lines.push("  (no hook events in ledger)");
  } else {
    const top = agg.perHook.slice(0, opts.topN);
    const nameW = Math.min(40, Math.max(...top.map((r) => r.hook.length), 4));
    lines.push(pad("hook", nameW) + "  count  fires/hr  top decision");
    lines.push(pad("─".repeat(nameW), nameW) + "  ─────  ────────  ─────────────");
    for (const r of top) {
      const td = r.decisions[0] ? `${r.decisions[0].decision} (${r.decisions[0].count})` : "—";
      lines.push(
        pad(r.hook, nameW) +
        "  " + String(r.count).padStart(5) +
        "  " + r.fire_rate_per_hour.toFixed(2).padStart(8) +
        "  " + td,
      );
    }
  }
  if (opts.includeZero && zeros && zeros.length > 0) {
    lines.push("");
    lines.push(`Never-fired hooks on disk (${zeros.length} — top 20):`);
    for (const z of zeros.slice(0, 20)) lines.push(`  - ${z}`);
    if (zeros.length > 20) lines.push(`  (+ ${zeros.length - 20} more — use --json for full list)`);
  }
  return lines.join("\n");
}

function pad(s, w) { return s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length); }

// ─────────────────────────────────────────────────────────────────────────────
// I/O wrapper
// ─────────────────────────────────────────────────────────────────────────────
function loadLedger(path) {
  if (!existsSync(path)) {
    console.error(`hook fire-count ledger not found: ${path}`);
    process.exit(2);
  }
  try {
    const text = readFileSync(path, "utf8");
    return text;
  } catch (err) {
    console.error(`read failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}

function resolveNowMs(frozenTime) {
  if (!frozenTime) return Date.now();
  const t = Date.parse(frozenTime);
  if (!Number.isFinite(t)) { console.error(`--frozen-time invalid: ${frozenTime}`); process.exit(2); }
  return t;
}

function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const opts = parseArgs(process.argv.slice(2));
  const text = loadLedger(opts.ledgerPath);
  const { events, parseErrors } = parseLedger(text);
  const nowMs = resolveNowMs(opts.frozenTime);
  const agg = aggregateFires(events, nowMs);
  let zeros = null;
  if (!opts.noDiskScan) {
    const disk = listHooksOnDisk(opts.hooksDir);
    if (disk != null) {
      zeros = findZeroFireHooks(disk, agg.perHook.map((p) => p.hook));
    }
  }
  if (opts.json) {
    const payload = {
      schemaVersion: 1,
      generatedAt: new Date(nowMs).toISOString(),
      ledger: { path: opts.ledgerPath, parseErrors, totalEvents: agg.totalEvents },
      window: { hours: agg.windowHours },
      totals: {
        unique_firing_hooks: agg.uniqueHooks,
        zero_fire_hooks: zeros ? zeros.length : null,
      },
      ranked: agg.perHook.slice(0, opts.topN),
      zero_fire: zeros,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  } else {
    process.stdout.write(renderText(agg, zeros, opts, new Date(nowMs).toISOString()) + "\n");
  }
  process.exit(0);
}
