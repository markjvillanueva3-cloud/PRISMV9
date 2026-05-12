#!/usr/bin/env node
/**
 * digest-hook-latency.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
 *
 * Reads `state/shared/hook-latency.jsonl` (produced by `_envelope.mjs`),
 * computes P50/P95/P99 + fire counts per hook over the chosen window, and
 * writes a digest at `state/shared/HOOK_LATENCY_DIGEST.md`. Flags regressions
 * by diffing against the previous digest's snapshot block.
 *
 * INTENDED USE
 *   Run from a scheduled task (nightly) or manually:
 *     node H:/prism/scripts/digest-hook-latency.mjs                 # full digest
 *     node H:/prism/scripts/digest-hook-latency.mjs --window 24h    # 24-hour window
 *     node H:/prism/scripts/digest-hook-latency.mjs --json          # emit JSON to stdout
 *     node H:/prism/scripts/digest-hook-latency.mjs --top 10        # only top-10 by P95
 *     node H:/prism/scripts/digest-hook-latency.mjs --check         # exit 1 if regressions
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

const HARNESS_ROOT = "H:/prism";
const JSONL = path.join(HARNESS_ROOT, "state/shared/hook-latency.jsonl");
const DIGEST_MD = path.join(HARNESS_ROOT, "state/shared/HOOK_LATENCY_DIGEST.md");
const SNAPSHOT = path.join(HARNESS_ROOT, "state/shared/.hook-latency-digest-snapshot.json");

const REGRESSION_MULTIPLIER = 1.5;     // 1.5× P95 vs previous digest → flag
const REGRESSION_MIN_MS = 50;          // only flag if current P95 is at least this slow
const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TOP = 25;

// ── arg parse ────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2));
const windowMs = args.window ? parseWindow(args.window) : DEFAULT_WINDOW_MS;
const top = args.top ? Math.max(1, Number(args.top) || DEFAULT_TOP) : DEFAULT_TOP;
const emitJson = !!args.json;
const checkOnly = !!args.check;

// ── load + parse JSONL ───────────────────────────────────────────────────────
const records = loadJsonl(JSONL);
const cutoff = Date.now() - windowMs;
const windowed = records.filter((r) => Date.parse(r.ts) >= cutoff);

// ── per-hook stats ───────────────────────────────────────────────────────────
const byHook = new Map();
for (const r of windowed) {
  const arr = byHook.get(r.hook);
  if (arr) arr.push(r); else byHook.set(r.hook, [r]);
}
const stats = [];
for (const [hook, rows] of byHook) {
  stats.push(statsFor(hook, rows));
}
stats.sort((a, b) => b.p95 - a.p95 || b.fires - a.fires || a.hook.localeCompare(b.hook));

// ── compare against snapshot for regression flags ────────────────────────────
const prev = loadSnapshot(SNAPSHOT);
const regressions = [];
for (const s of stats) {
  const prevS = prev[s.hook];
  if (!prevS) continue;
  if (s.p95 < REGRESSION_MIN_MS) continue;
  if (s.p95 >= prevS.p95 * REGRESSION_MULTIPLIER) {
    regressions.push({ hook: s.hook, before_p95: prevS.p95, after_p95: s.p95, mult: (s.p95 / Math.max(1, prevS.p95)).toFixed(2) });
  }
}

// ── emit ─────────────────────────────────────────────────────────────────────
if (emitJson) {
  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    windowMs,
    totalFires: windowed.length,
    uniqueHooks: byHook.size,
    topByP95: stats.slice(0, top),
    regressions,
    source: JSONL,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
} else {
  const md = renderMarkdown({ stats, regressions, windowMs, totalFires: windowed.length, top });
  // Ensure parent dir exists.
  try { fs.mkdirSync(path.dirname(DIGEST_MD), { recursive: true }); } catch { /* ignore */ }
  fs.writeFileSync(DIGEST_MD, md);
  // Snapshot the per-hook P95 for the next regression diff. Atomic-write pattern.
  const snap = {};
  for (const s of stats) snap[s.hook] = { p95: s.p95, p99: s.p99, max: s.max, fires: s.fires };
  fs.writeFileSync(SNAPSHOT, JSON.stringify({ generatedAt: new Date().toISOString(), windowMs, hooks: snap }, null, 2));
  process.stdout.write(`digest-hook-latency: ✓ ${DIGEST_MD} — ${windowed.length} fires across ${byHook.size} hooks, ${regressions.length} regression(s)\n`);
}

if (checkOnly && regressions.length > 0) process.exit(1);
process.exit(0);

// ── helpers ──────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") { out.json = true; continue; }
    if (a === "--check") { out.check = true; continue; }
    if (a === "--window" && argv[i + 1]) { out.window = argv[++i]; continue; }
    if (a === "--top" && argv[i + 1]) { out.top = argv[++i]; continue; }
  }
  return out;
}

function parseWindow(s) {
  // "24h", "7d", "30m", or raw ms.
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

function loadJsonl(p) {
  let raw;
  try { raw = fs.readFileSync(p, "utf8"); }
  catch { return []; }
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const r = JSON.parse(t);
      if (typeof r?.ts === "string" && typeof r?.hook === "string" && typeof r?.durationMs === "number" && typeof r?.exitCode === "number") {
        out.push(r);
      }
    } catch { /* skip malformed */ }
  }
  return out;
}

function loadSnapshot(p) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    const j = JSON.parse(raw);
    if (j && j.hooks && typeof j.hooks === "object") return j.hooks;
  } catch { /* first run */ }
  return {};
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[Math.min(rank - 1, sorted.length - 1)];
}

function statsFor(hook, rows) {
  const durations = rows.map((r) => r.durationMs).sort((a, b) => a - b);
  const failures = rows.reduce((acc, r) => acc + (r.exitCode === 0 ? 0 : 1), 0);
  let lastSeen = rows[0].ts;
  for (const r of rows) if (r.ts > lastSeen) lastSeen = r.ts;
  return {
    hook,
    fires: rows.length,
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    p99: percentile(durations, 0.99),
    max: durations[durations.length - 1],
    failures,
    lastSeen,
  };
}

function renderMarkdown({ stats, regressions, windowMs, totalFires, top }) {
  const lines = [];
  lines.push("# HOOK_LATENCY_DIGEST");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Window: ${(windowMs / 3_600_000).toFixed(1)} h · Total fires: ${totalFires} · Unique hooks: ${stats.length}`);
  lines.push(`Source: \`${JSONL}\``);
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
  lines.push("| hook | fires | P50 (ms) | P95 (ms) | P99 (ms) | max (ms) | failures | last seen |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---|");
  for (const s of stats.slice(0, top)) {
    lines.push(`| \`${s.hook}\` | ${s.fires} | ${s.p50} | ${s.p95} | ${s.p99} | ${s.max} | ${s.failures} | ${s.lastSeen} |`);
  }
  lines.push("");
  lines.push("---");
  lines.push("Generated by `scripts/digest-hook-latency.mjs` · regression-flag: P95 ≥ 1.5× previous AND ≥ 50 ms.");
  lines.push("Re-run nightly via the PRISM scheduled tasks. `--json` for machine-readable, `--check` for CI gate.");
  return lines.join("\n") + "\n";
}
