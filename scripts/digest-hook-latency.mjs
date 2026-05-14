#!/usr/bin/env node
/**
 * digest-hook-latency.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
 *                           + CLEANUP-MS0 / U-CLEANUP-F4 extension
 *
 * Reads `state/shared/hook-latency.jsonl` (produced by `_envelope.mjs`) AND
 * `state/shared/async-hook-results.jsonl` (produced by AsyncHookDispatcherEngine,
 * the H7 detached-runner for T4 hooks), computes P50/P95/P99 + fire counts per
 * hook over the chosen window, and writes a digest at
 * `state/shared/HOOK_LATENCY_DIGEST.md`. Flags regressions by diffing against
 * the previous digest's snapshot block.
 *
 * U-CLEANUP-F4 ADDED (extends, does NOT rewrite the renderer per R1):
 *   1. H7 async-results merge — async-hook-results.jsonl records are normalized
 *      into the same {ts,hook,durationMs,exitCode} shape and merged into the
 *      windowed dataset, so async (T4) hooks appear in the per-hook P95 table
 *      AND get the same 1.5×-prior-P95 regression flagging as sync hooks.
 *   2. Per-(event,tier) stack-time view — async records carry `event` (Stop,
 *      PreToolUse, …) and `tier` (T0–T4). The digest sums durationMs grouped by
 *      (event,tier) so the operator can see which event×tier combination costs
 *      the most stacked hook time. NOTE: the spec asked for per-(tool,event);
 *      neither telemetry source records the triggering *tool*, so this groups
 *      by the dimensions that actually exist. Capturing `tool` would require a
 *      future `_envelope.mjs` enrichment (out of F4's named scope).
 *
 * INTENDED USE
 *   Run from a scheduled task (nightly) or manually:
 *     node H:/prism/scripts/digest-hook-latency.mjs                 # full digest
 *     node H:/prism/scripts/digest-hook-latency.mjs --window 24h    # 24-hour window
 *     node H:/prism/scripts/digest-hook-latency.mjs --json          # emit JSON to stdout
 *     node H:/prism/scripts/digest-hook-latency.mjs --top 10        # only top-10 by P95
 *     node H:/prism/scripts/digest-hook-latency.mjs --check         # exit 1 if regressions
 *     node H:/prism/scripts/digest-hook-latency.mjs --no-async      # skip the H7 merge
 *
 * REGRESSION FLAG — a hook is flagged as REGRESSED when:
 *   - its current P95 is ≥ 1.5× the previous-digest P95, AND
 *   - the current P95 is ≥ 50 ms (so 1ms→2ms churn doesn't spam)
 *
 * Implementation is pure node (no deps), uses the snapshot in
 * `state/shared/.hook-latency-digest-snapshot.json` as the regression baseline.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const HARNESS_ROOT = "H:/prism";
const JSONL = path.join(HARNESS_ROOT, "state/shared/hook-latency.jsonl");
const ASYNC_JSONL = path.join(HARNESS_ROOT, "state/shared/async-hook-results.jsonl");
const DIGEST_MD = path.join(HARNESS_ROOT, "state/shared/HOOK_LATENCY_DIGEST.md");
const SNAPSHOT = path.join(HARNESS_ROOT, "state/shared/.hook-latency-digest-snapshot.json");

const REGRESSION_MULTIPLIER = 1.5;     // 1.5× P95 vs previous digest → flag
const REGRESSION_MIN_MS = 50;          // only flag if current P95 is at least this slow
const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TOP = 25;

// ── arg parse ────────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") { out.json = true; continue; }
    if (a === "--check") { out.check = true; continue; }
    if (a === "--no-async") { out.noAsync = true; continue; }
    // For value-taking flags, only consume the next token if it is NOT itself a
    // flag — `--window --json` must not swallow `--json` as the window value.
    const next = argv[i + 1];
    const nextIsValue = next != null && !next.startsWith("--");
    if (a === "--window" && nextIsValue) { out.window = argv[++i]; continue; }
    if (a === "--top" && nextIsValue) { out.top = argv[++i]; continue; }
  }
  return out;
}

export function parseWindow(s) {
  // "30s", "30m", "24h", "7d", "1w" (case-insensitive), or a raw ms count.
  const m = String(s).match(/^(\d+)\s*([smhdwSMHDW]?)$/);
  if (!m) return DEFAULT_WINDOW_MS;
  const n = Number(m[1]);
  const unit = (m[2] || "").toLowerCase();
  const mult = unit === "s" ? 1000 :
               unit === "m" ? 60_000 :
               unit === "h" ? 3_600_000 :
               unit === "d" ? 86_400_000 :
               unit === "w" ? 604_800_000 : 1;
  return Math.max(1000, n * mult);
}

// ── load + parse JSONL (sync hook-latency.jsonl) ─────────────────────────────
export function loadJsonl(p) {
  let raw;
  try { raw = fs.readFileSync(p, "utf8"); }
  catch { return []; }
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const r = JSON.parse(t);
      // Number.isFinite (not typeof === "number") so NaN/Infinity durations —
      // which would poison percentile()/statsFor() — are rejected at load.
      // Date.parse(ts) is validated here too: a record with an unparseable ts
      // would otherwise survive load, then `Date.parse(ts) >= cutoff` → NaN
      // comparison → false → the record vanishes from the window with no
      // signal. Reject it loudly at load instead (R12 — fail loud).
      if (typeof r?.ts === "string" && Number.isFinite(Date.parse(r.ts)) &&
          typeof r?.hook === "string" && Number.isFinite(r?.durationMs) && Number.isFinite(r?.exitCode)) {
        out.push(r);
      }
    } catch { /* skip malformed */ }
  }
  return out;
}

/**
 * Normalize one async-hook-results.jsonl record into the {ts,hook,durationMs,
 * exitCode} shape the per-hook stats pipeline expects, while preserving the
 * async-only `event` + `tier` fields for the stack-time view. Returns null on
 * a record missing the fields the digest needs.
 */
export function normalizeAsyncRecord(r) {
  if (!r || typeof r !== "object") return null;
  const hookPath = typeof r.hookPath === "string" ? r.hookPath : null;
  // Number.isFinite rejects NaN/Infinity — a NaN durationMs would otherwise
  // pass `typeof === "number"` and poison the percentile math downstream.
  const durationMs = Number.isFinite(r.durationMs) ? r.durationMs : null;
  const exitCode = Number.isFinite(r.exitCode) ? r.exitCode : null;
  // completedAt is the truthful "when it finished" stamp; fall back to
  // startedAt. The chosen ts must be Date.parse-able — an unparseable stamp
  // survives into computeDigest's window filter as NaN and silently drops the
  // record. So: prefer a parseable completedAt, else a parseable startedAt,
  // else null (whole record rejected — matches loadJsonl's fail-loud guard).
  // Falling through means a garbage completedAt does NOT discard a record that
  // still has a usable startedAt.
  const parseableTs = (v) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null);
  const ts = parseableTs(r.completedAt) ?? parseableTs(r.startedAt);
  if (hookPath === null || durationMs === null || exitCode === null || ts === null) {
    return null;
  }
  return {
    ts,
    hook: path.basename(hookPath),
    durationMs,
    exitCode,
    signal: typeof r.signal === "string" ? r.signal : null,
    targetPath: hookPath.replace(/\\/g, "/"),
    // async-only dimensions, used by stackTimeByEventTier:
    async: true,
    event: typeof r.event === "string" && r.event ? r.event : "(unknown)",
    tier: typeof r.tier === "string" && r.tier ? r.tier : "(unknown)",
    status: typeof r.status === "string" ? r.status : null,
  };
}

/** Load async-hook-results.jsonl → normalized records (same shape as loadJsonl,
 *  plus async/event/tier fields). Missing file → []. */
export function loadAsyncResults(p) {
  let raw;
  try { raw = fs.readFileSync(p, "utf8"); }
  catch { return []; }
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const norm = normalizeAsyncRecord(JSON.parse(t));
      if (norm) out.push(norm);
    } catch { /* skip malformed */ }
  }
  return out;
}

export function loadSnapshot(p) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    const j = JSON.parse(raw);
    if (j && j.hooks && typeof j.hooks === "object") return j.hooks;
  } catch { /* first run */ }
  return {};
}

export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[Math.min(rank - 1, sorted.length - 1)];
}

export function statsFor(hook, rows) {
  const durations = rows.map((r) => r.durationMs).sort((a, b) => a - b);
  const failures = rows.reduce((acc, r) => acc + (r.exitCode === 0 ? 0 : 1), 0);
  // lastSeen via lexical string compare — correct ONLY for Z-form ISO-8601
  // (e.g. 2026-05-14T12:00:00.000Z). Both current producers (_envelope.mjs and
  // AsyncHookDispatcherEngine) emit Z-form, so this holds; a future producer
  // emitting offset form (+00:00) or variable precision would need Date.parse.
  let lastSeen = rows[0].ts;
  for (const r of rows) if (r.ts > lastSeen) lastSeen = r.ts;
  const asyncFires = rows.reduce((acc, r) => acc + (r.async ? 1 : 0), 0);
  return {
    hook,
    fires: rows.length,
    asyncFires,
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    p99: percentile(durations, 0.99),
    max: durations[durations.length - 1],
    failures,
    lastSeen,
  };
}

/**
 * Per-(event,tier) stack-time view from the windowed ASYNC records only (sync
 * hook-latency.jsonl has no event/tier). "Stack time" = the total durationMs
 * the detached runner spent on hooks for that event×tier combination — i.e.
 * the cost that would have been on the synchronous Stop path before H7.
 * Returns rows sorted by totalMs descending.
 */
export function stackTimeByEventTier(asyncWindowed) {
  const byKey = new Map();
  for (const r of asyncWindowed) {
    // NUL-byte (\u0000) separator: event/tier are free-form strings, so a
    // printable delimiter (":", "|", space) could collide with a value
    // that contained it. NUL is not emitted by any known producer
    // (_envelope.mjs, AsyncHookDispatcherEngine) and is exceedingly unlikely
    // in practice -- a far safer delimiter than printable ":" or "|" which
    // DO appear in real event/tier names. (A corrupt record could carry a
    // literal NUL, so this is "practically collision-free", not a hard
    // guarantee -- acceptable: the only consumer is a display aggregation.)
    const key = `${r.event}\u0000${r.tier}`;
    let agg = byKey.get(key);
    if (!agg) {
      agg = { event: r.event, tier: r.tier, fires: 0, totalMs: 0, durations: [] };
      byKey.set(key, agg);
    }
    agg.fires += 1;
    agg.totalMs += r.durationMs;
    agg.durations.push(r.durationMs);
  }
  const rows = [];
  for (const agg of byKey.values()) {
    const sorted = agg.durations.slice().sort((a, b) => a - b);
    rows.push({
      event: agg.event,
      tier: agg.tier,
      fires: agg.fires,
      totalMs: agg.totalMs,
      p95: percentile(sorted, 0.95),
    });
  }
  rows.sort((a, b) => b.totalMs - a.totalMs || b.fires - a.fires ||
    a.event.localeCompare(b.event) || a.tier.localeCompare(b.tier));
  return rows;
}

/**
 * Pure core: take the raw record arrays + options, return everything the
 * emitters need. Extracted so tests can exercise the full pipeline without
 * spawning the CLI or touching the real telemetry files.
 */
export function computeDigest({ records, asyncRecords = [], windowMs, top, now = Date.now(), snapshot = {} }) {
  const cutoff = now - windowMs;
  const allRecords = [...records, ...asyncRecords];
  const windowed = allRecords.filter((r) => Date.parse(r.ts) >= cutoff);
  const asyncWindowed = windowed.filter((r) => r.async);

  // per-hook stats (sync + async merged by hook basename)
  const byHook = new Map();
  for (const r of windowed) {
    const arr = byHook.get(r.hook);
    if (arr) arr.push(r); else byHook.set(r.hook, [r]);
  }
  const stats = [];
  for (const [hook, rows] of byHook) stats.push(statsFor(hook, rows));
  stats.sort((a, b) => b.p95 - a.p95 || b.fires - a.fires || a.hook.localeCompare(b.hook));

  // regression flags vs snapshot — applies to the MERGED set, so a regressed
  // async (T4) hook is flagged identically to a sync one.
  const regressions = [];
  for (const s of stats) {
    const prevS = snapshot[s.hook];
    if (!prevS) continue;
    if (s.p95 < REGRESSION_MIN_MS) continue;
    if (s.p95 >= prevS.p95 * REGRESSION_MULTIPLIER) {
      regressions.push({
        hook: s.hook,
        before_p95: prevS.p95,
        after_p95: s.p95,
        mult: (s.p95 / Math.max(1, prevS.p95)).toFixed(2),
      });
    }
  }

  const stackTime = stackTimeByEventTier(asyncWindowed);

  return {
    windowed,
    asyncWindowed,
    stats,
    regressions,
    stackTime,
    totalFires: windowed.length,
    asyncFires: asyncWindowed.length,
    uniqueHooks: byHook.size,
    topByP95: stats.slice(0, top),
  };
}

export function renderMarkdown({ stats, regressions, stackTime, windowMs, totalFires, asyncFires, top, sources = [JSONL, ASYNC_JSONL] }) {
  const lines = [];
  lines.push("# HOOK_LATENCY_DIGEST");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Window: ${(windowMs / 3_600_000).toFixed(1)} h · Total fires: ${totalFires} (async: ${asyncFires}) · Unique hooks: ${stats.length}`);
  lines.push(`Source: \`${sources[0]}\` + \`${sources[1]}\``);
  lines.push("");
  if (regressions.length > 0) {
    lines.push(`## ⚠ Regressions (${regressions.length})`);
    lines.push("");
    lines.push("| hook | before P95 (ms) | after P95 (ms) | ×slower |");
    lines.push("|---|---:|---:|---:|");
    for (const r of regressions) {
      lines.push(`| \`${r.hook}\` | ${r.before_p95} | ${r.after_p95} | ${r.mult} |`);
    }
    lines.push("");
  } else {
    lines.push("## ✓ No regressions vs prior digest snapshot");
    lines.push("");
  }
  lines.push(`## Top ${Math.min(top, stats.length)} hooks by P95 latency`);
  lines.push("");
  lines.push("| hook | fires | async | P50 (ms) | P95 (ms) | P99 (ms) | max (ms) | failures | last seen |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const s of stats.slice(0, top)) {
    lines.push(`| \`${s.hook}\` | ${s.fires} | ${s.asyncFires} | ${s.p50} | ${s.p95} | ${s.p99} | ${s.max} | ${s.failures} | ${s.lastSeen} |`);
  }
  lines.push("");
  // U-CLEANUP-F4: per-(event,tier) stack-time view from async-hook-results.
  lines.push("## Async stack-time by (event, tier)");
  lines.push("");
  if (stackTime.length === 0) {
    lines.push("_No async-hook-results in window (H7 dispatcher idle or async-hook-results.jsonl absent)._");
  } else {
    lines.push("| event | tier | fires | total stack-time (ms) | P95 (ms) |");
    lines.push("|---|---|---:|---:|---:|");
    for (const r of stackTime) {
      lines.push(`| ${r.event} | ${r.tier} | ${r.fires} | ${r.totalMs} | ${r.p95} |`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("Generated by `scripts/digest-hook-latency.mjs` · regression-flag: P95 ≥ 1.5× previous AND ≥ 50 ms.");
  lines.push("Re-run nightly via the PRISM scheduled tasks. `--json` for machine-readable, `--check` for CI gate, `--no-async` to skip the H7 merge.");
  return lines.join("\n") + "\n";
}

// ── main run() — wrapped so test imports don't execute the CLI ───────────────
/**
 * @param {string[]} argv  CLI args (defaults to process.argv tail).
 * @param {object}   [opts]
 * @param {string}   [opts.jsonl]      override sync hook-latency.jsonl path
 * @param {string}   [opts.asyncJsonl] override async-hook-results.jsonl path
 * @param {string}   [opts.digestMd]   override digest output path
 * @param {string}   [opts.snapshot]   override regression-baseline snapshot path
 *
 * The `opts` path overrides exist so tests can drive the full CLI pipeline
 * (`--check` exit codes, `--top` truncation, snapshot round-trip) against
 * tmpdir fixtures instead of the real telemetry files. CLI callers pass none.
 * @returns {number} process exit code (0 = ok, 1 = `--check` saw regressions)
 */
export function run(argv = process.argv.slice(2), opts = {}) {
  const paths = {
    jsonl: opts.jsonl ?? JSONL,
    asyncJsonl: opts.asyncJsonl ?? ASYNC_JSONL,
    digestMd: opts.digestMd ?? DIGEST_MD,
    snapshot: opts.snapshot ?? SNAPSHOT,
  };
  const args = parseArgs(argv);
  const windowMs = args.window ? parseWindow(args.window) : DEFAULT_WINDOW_MS;
  // --top coercion: a finite numeric arg is floored at 1 (so `--top 0` → 1, not
  // a silent fallback to DEFAULT_TOP); a non-numeric arg (`--top abc`) → DEFAULT_TOP.
  const topNum = args.top != null ? Number(args.top) : NaN;
  const top = Number.isFinite(topNum) ? Math.max(1, Math.floor(topNum)) : DEFAULT_TOP;
  const emitJson = !!args.json;
  const checkOnly = !!args.check;
  const noAsync = !!args.noAsync;

  const records = loadJsonl(paths.jsonl);
  const asyncRecords = noAsync ? [] : loadAsyncResults(paths.asyncJsonl);
  const snapshot = loadSnapshot(paths.snapshot);

  const digest = computeDigest({ records, asyncRecords, windowMs, top, snapshot });

  if (emitJson) {
    const out = {
      schemaVersion: "1.1.0",
      generatedAt: new Date().toISOString(),
      windowMs,
      totalFires: digest.totalFires,
      asyncFires: digest.asyncFires,
      uniqueHooks: digest.uniqueHooks,
      topByP95: digest.topByP95,
      regressions: digest.regressions,
      stackTimeByEventTier: digest.stackTime,
      sources: [paths.jsonl, paths.asyncJsonl],
      // `source` (singular) — defensive alias for `sources[0]`. No known
      // consumer reads it (the persisted artifacts are the .md digest and the
      // snapshot JSON, not this stdout payload); retained only in case an
      // ad-hoc `--json` parser keys off a single path. Prefer `sources`.
      source: paths.jsonl,
    };
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  } else {
    const md = renderMarkdown({
      stats: digest.stats,
      regressions: digest.regressions,
      stackTime: digest.stackTime,
      windowMs,
      totalFires: digest.totalFires,
      asyncFires: digest.asyncFires,
      top,
      sources: [paths.jsonl, paths.asyncJsonl],
    });
    try { fs.mkdirSync(path.dirname(paths.digestMd), { recursive: true }); } catch { /* ignore */ }
    // Snapshot the per-hook P95 for the next regression diff.
    const snap = {};
    for (const s of digest.stats) snap[s.hook] = { p95: s.p95, p99: s.p99, max: s.max, fires: s.fires };
    // Both writes are guarded: a nightly scheduled task hitting an unwritable
    // path (perms, disk full, parent-is-a-file) must exit non-zero with a
    // stderr line, not throw an uncaught stack trace out of process.exit(run()).
    try {
      fs.writeFileSync(paths.digestMd, md);
      // SCHEMA VERSIONING: the snapshot is a state JSON → carries schemaVersion.
      fs.writeFileSync(paths.snapshot, JSON.stringify({
        schemaVersion: "1.1.0",
        generatedAt: new Date().toISOString(),
        windowMs,
        hooks: snap,
      }, null, 2));
    } catch (err) {
      process.stderr.write(`digest-hook-latency: ✗ write failed — ${err?.message || err}\n`);
      return 1;
    }
    process.stdout.write(`digest-hook-latency: ✓ ${paths.digestMd} — ${digest.totalFires} fires (${digest.asyncFires} async) across ${digest.uniqueHooks} hooks, ${digest.regressions.length} regression(s)\n`);
  }

  return checkOnly && digest.regressions.length > 0 ? 1 : 0;
}

// CLI guard: importing this module for tests must NOT run the CLI.
const invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (invokedAsCli) {
  process.exit(run());
}

export {
  REGRESSION_MULTIPLIER,
  REGRESSION_MIN_MS,
  DEFAULT_WINDOW_MS,
  DEFAULT_TOP,
  JSONL,
  ASYNC_JSONL,
};
