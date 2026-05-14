#!/usr/bin/env node
/**
 * hook-health-check.mjs — Re-runnable hook telemetry analyzer.
 *
 * META artifact for the 2026-05-14 /forge-audit-v2 of the hook stack.
 * Boris compounding-gains tax: an audit must emit ≥1 re-runnable measurement tool.
 *
 * Usage:
 *   node scripts/hook-health-check.mjs                       # tail report
 *   node scripts/hook-health-check.mjs --json                # machine-readable
 *   node scripts/hook-health-check.mjs --window=24h          # last 24h only
 *   node scripts/hook-health-check.mjs --hook=system-viz-live-bridge  # one hook
 *   node scripts/hook-health-check.mjs --top=20              # top-N noisy hooks
 *   node scripts/hook-health-check.mjs --since=2026-05-14    # since date
 *
 * Reads .claude/cache/hook-telemetry.jsonl (the canonical hook-fire stream).
 * Failure-class events (ping-failed, error, fail, deny) are tallied per hook
 * and compared to a (default 24h, configurable) window. Emits a verdict per
 * hook: ✅ healthy · ⚠ noisy · ❌ broken.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const TELEMETRY_FILE = path.join("H:", "prism", ".claude", "cache", "hook-telemetry.jsonl");
const FAILURE_EVENTS = new Set(["ping-failed", "error", "fail", "broken", "exception", "throw"]);
const NEUTRAL_EVENTS = new Set([
  "miss-recorded", "deny", "queued", "fired", "logged", "advised", "summarized",
  "fallthrough-already-summarized", "clean", "clean-write", "no-roadmap-tag",
  "unexpected-staged", "verified-ok", "precompact-clear", "viz-not-running",
  "pinged", "suggest"
]);
const NOISY_THRESHOLD = 50;   // events / hour from one hook = noisy
const BROKEN_THRESHOLD = 0.10; // ≥10% of one hook's events are failures = broken

function parseArgs(argv) {
  const a = { json: false, windowHours: 24, hook: null, top: 10, since: null };
  for (const x of argv) {
    if (x === "--json") a.json = true;
    else if (x.startsWith("--window=")) {
      const m = x.slice(9).match(/^(\d+)\s*([hd])?$/i);
      if (m) a.windowHours = Number(m[1]) * (m[2] === "d" ? 24 : 1);
    } else if (x.startsWith("--hook=")) a.hook = x.slice(7);
    else if (x.startsWith("--top=")) a.top = Number(x.slice(6)) || 10;
    else if (x.startsWith("--since=")) a.since = new Date(x.slice(8)).getTime();
  }
  return a;
}

function classifyEvent(ev) {
  if (FAILURE_EVENTS.has(ev)) return "failure";
  if (NEUTRAL_EVENTS.has(ev)) return "neutral";
  return "other";
}

function classifyHook({ total, failure }) {
  if (total === 0) return { verdict: "idle", icon: "·" };
  const failureRate = failure / total;
  if (failureRate >= BROKEN_THRESHOLD) return { verdict: "broken", icon: "❌" };
  if (total >= NOISY_THRESHOLD) return { verdict: "noisy", icon: "⚠" };
  return { verdict: "healthy", icon: "✅" };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = Date.now();
  const windowStart = args.since ?? (now - args.windowHours * 3600 * 1000);

  if (!fs.existsSync(TELEMETRY_FILE)) {
    const out = { ok: false, error: "telemetry file missing", path: TELEMETRY_FILE };
    process.stdout.write(args.json ? JSON.stringify(out) : `❌ no telemetry: ${TELEMETRY_FILE}\n`);
    process.exit(1);
  }

  const raw = fs.readFileSync(TELEMETRY_FILE, "utf-8");
  const lines = raw.split("\n").filter(Boolean);

  // hook → { total, failure, neutral, other, sampleFailures: [], lastSeen }
  const byHook = {};
  let scanned = 0, inWindow = 0;

  for (const line of lines) {
    scanned++;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const hook = rec.hook;
    if (!hook) continue;
    if (args.hook && hook !== args.hook) continue;
    const ts = rec.t || rec.ts;
    const t = ts ? new Date(ts).getTime() : 0;
    if (!Number.isFinite(t) || t < windowStart) continue;
    inWindow++;
    const cls = classifyEvent(rec.event);
    const slot = (byHook[hook] ||= { total: 0, failure: 0, neutral: 0, other: 0, sampleFailures: [], lastSeen: 0, events: {} });
    slot.total++;
    slot[cls]++;
    slot.events[rec.event] = (slot.events[rec.event] || 0) + 1;
    if (t > slot.lastSeen) slot.lastSeen = t;
    if (cls === "failure" && slot.sampleFailures.length < 3) {
      slot.sampleFailures.push({ event: rec.event, error: rec.post?.error || rec.error || null, file: rec.file || null });
    }
  }

  const rows = Object.entries(byHook).map(([hook, s]) => {
    const cls = classifyHook(s);
    return {
      hook,
      total: s.total,
      failure: s.failure,
      neutral: s.neutral,
      other: s.other,
      failureRate: s.total ? +(s.failure / s.total).toFixed(3) : 0,
      verdict: cls.verdict,
      icon: cls.icon,
      lastSeen: s.lastSeen ? new Date(s.lastSeen).toISOString() : null,
      topEvents: Object.entries(s.events).sort((a, b) => b[1] - a[1]).slice(0, 3),
      sampleFailures: s.sampleFailures,
    };
  });

  rows.sort((a, b) => {
    const score = (r) => (r.verdict === "broken" ? 1000 : 0) + (r.verdict === "noisy" ? 500 : 0) + r.total;
    return score(b) - score(a);
  });

  const summary = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    windowHours: args.windowHours,
    windowStart: new Date(windowStart).toISOString(),
    telemetryLines: scanned,
    inWindow,
    uniqueHooks: rows.length,
    counts: {
      healthy: rows.filter((r) => r.verdict === "healthy").length,
      noisy: rows.filter((r) => r.verdict === "noisy").length,
      broken: rows.filter((r) => r.verdict === "broken").length,
      idle: rows.filter((r) => r.verdict === "idle").length,
    },
    rows: rows.slice(0, args.top),
  };

  if (args.json) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); return; }

  const w = (s, n) => String(s ?? "").padEnd(n).slice(0, n);
  const lines2 = [];
  lines2.push(`┌─ hook-health-check ─ window=${args.windowHours}h ─ ${summary.inWindow}/${summary.telemetryLines} events`);
  lines2.push(`│ verdict: ✅ ${summary.counts.healthy} healthy · ⚠ ${summary.counts.noisy} noisy · ❌ ${summary.counts.broken} broken · · ${summary.counts.idle} idle`);
  lines2.push(`│ top ${args.top} (sorted: broken > noisy > total)`);
  lines2.push(`│ ${w("hook", 36)} ${w("total", 7)} ${w("fail", 6)} ${w("rate", 6)} verdict`);
  for (const r of summary.rows) {
    lines2.push(`│ ${r.icon} ${w(r.hook, 34)} ${w(r.total, 7)} ${w(r.failure, 6)} ${w(r.failureRate, 6)} ${r.verdict}`);
    if (r.verdict === "broken" || r.verdict === "noisy") {
      for (const sf of r.sampleFailures) {
        lines2.push(`│    sample: event=${sf.event}${sf.error ? " err=" + sf.error : ""}${sf.file ? " file=" + path.basename(sf.file) : ""}`);
      }
    }
  }
  lines2.push("└─────────────────────────────────────────────");
  process.stdout.write(lines2.join("\n") + "\n");
}

main();
