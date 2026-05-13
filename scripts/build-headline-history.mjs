#!/usr/bin/env node
/**
 * build-headline-history.mjs — daily append of system-viz headline counts.
 *
 * U-CLEANUP-G18 (CLEANUP-MS0). Invokes `scripts/system-viz-query.mjs headline --json`,
 * extracts a small subset of fields, and appends one row to
 *   state/shared/system-viz-headline-history.jsonl
 * Idempotent per UTC day — running multiple times in the same day will
 * NOT produce duplicate rows (last row's UTC date wins). To force a row
 * append regardless, pass --force.
 *
 * Subcommands:
 *   (default)  Append one row for today (idempotent unless --force).
 *   digest     Render F4-style 7-day / 30-day delta summary to stdout.
 *
 * Usage:
 *   node scripts/build-headline-history.mjs                  # daily tick
 *   node scripts/build-headline-history.mjs --force          # force-append even if today already present
 *   node scripts/build-headline-history.mjs digest           # 7-day + 30-day deltas
 *   node scripts/build-headline-history.mjs digest --json    # machine-readable
 *
 * Exit codes:
 *   0 — append succeeded (or already-present, idempotent) / digest rendered
 *   1 — system-viz-query.mjs invocation failed or output unparseable
 *   2 — write/disk failure
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, appendFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIZ_QUERY = resolve(__dirname, "system-viz-query.mjs");
const HISTORY_PATH = resolve(__dirname, "..", "state", "shared", "system-viz-headline-history.jsonl");

const args = process.argv.slice(2);
const flags = new Set();
const subcommand = (args[0] && !args[0].startsWith("--")) ? args[0] : "append";
for (const a of args) {
  if (a.startsWith("--")) flags.add(a.slice(2));
}

// ─── Helpers ───────────────────────────────────────────────────────────
function todayUTC(now = new Date()) {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function readJsonl(path) {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf-8");
  if (!raw.trim()) return [];
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // Skip malformed lines; never block the daily append on history corruption.
    }
  }
  return out;
}

function runVizHeadline() {
  if (!existsSync(VIZ_QUERY)) {
    return { ok: false, error: `system-viz-query.mjs not found at ${VIZ_QUERY}` };
  }
  const r = spawnSync(process.execPath, [VIZ_QUERY, "headline", "--json"], {
    encoding: "utf-8",
    timeout: 30_000,
    windowsHide: true,
  });
  if (r.status !== 0) {
    return { ok: false, error: `system-viz-query exit=${r.status} stderr=${(r.stderr || "").slice(0, 400)}` };
  }
  try {
    const parsed = JSON.parse(r.stdout);
    return { ok: true, headline: parsed };
  } catch (e) {
    return { ok: false, error: `headline JSON parse failed: ${e.message}` };
  }
}

function projectHeadline(headline, nowIso) {
  // Whitelist the fields explicitly so a future headline schema change
  // doesn't bloat the history file by accident.
  const keys = ["built", "unwired", "wikiEntries", "pendingFE", "drift"];
  const row = { ts: nowIso, day: nowIso.slice(0, 10) };
  for (const k of keys) {
    if (k in headline) row[k] = headline[k];
  }
  return row;
}

// ─── append (default subcommand) ───────────────────────────────────────
function cmdAppend() {
  const nowIso = new Date().toISOString();
  const today = todayUTC();

  const existing = readJsonl(HISTORY_PATH);
  const lastSameDay = existing.findLast?.((r) => r?.day === today)
    ?? [...existing].reverse().find((r) => r?.day === today);
  if (lastSameDay && !flags.has("force")) {
    return {
      ok: true,
      appended: false,
      reason: "already_present_today",
      day: today,
      existing_rows: existing.length,
      last_row: lastSameDay,
    };
  }

  const viz = runVizHeadline();
  if (!viz.ok) return { ok: false, error: viz.error, exit: 1 };

  const row = projectHeadline(viz.headline, nowIso);

  try {
    mkdirSync(dirname(HISTORY_PATH), { recursive: true });
    appendFileSync(HISTORY_PATH, JSON.stringify(row) + "\n", "utf-8");
  } catch (e) {
    return { ok: false, error: `write failed: ${e.message}`, exit: 2 };
  }

  return {
    ok: true,
    appended: true,
    forced: flags.has("force"),
    row,
    path: HISTORY_PATH,
    rows_after: existing.length + 1,
  };
}

// ─── digest subcommand ─────────────────────────────────────────────────
function deltaBetween(a, b) {
  const keys = ["built", "unwired", "wikiEntries", "pendingFE", "drift"];
  const out = {};
  for (const k of keys) {
    if (typeof a?.[k] === "number" && typeof b?.[k] === "number") {
      out[k] = b[k] - a[k];
    }
  }
  return out;
}

function rowFromNDaysAgo(rows, daysAgo) {
  if (rows.length === 0) return null;
  const target = new Date(Date.now() - daysAgo * 86_400_000)
    .toISOString().slice(0, 10);
  // Pick the most recent row on or BEFORE the target day.
  let pick = null;
  for (const r of rows) {
    if (!r?.day) continue;
    if (r.day <= target) pick = r;
  }
  return pick;
}

function cmdDigest() {
  const rows = readJsonl(HISTORY_PATH);
  const latest = rows[rows.length - 1] ?? null;
  if (!latest) {
    const payload = { ok: true, rows: 0, message: "no history yet — run the append subcommand first" };
    if (flags.has("json")) {
      process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    } else {
      process.stdout.write("system-viz headline-history digest\n----------------------------------\nNo history yet. Run `node scripts/build-headline-history.mjs` first.\n");
    }
    return { ok: true, exit: 0 };
  }

  const r7 = rowFromNDaysAgo(rows, 7);
  const r30 = rowFromNDaysAgo(rows, 30);
  const d7 = r7 ? deltaBetween(r7, latest) : null;
  const d30 = r30 ? deltaBetween(r30, latest) : null;

  const payload = {
    ok: true,
    rows: rows.length,
    latest_day: latest.day,
    latest: latest,
    delta_7d: d7,
    delta_30d: d30,
    baseline_7d_day: r7?.day ?? null,
    baseline_30d_day: r30?.day ?? null,
  };

  if (flags.has("json")) {
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return { ok: true, exit: 0 };
  }

  // F4-style human render
  const sign = (n) => (typeof n !== "number" ? "—" : (n > 0 ? `+${n}` : `${n}`));
  const fmt = (delta) => {
    if (!delta) return "(no baseline)";
    const parts = ["built", "unwired", "wikiEntries", "pendingFE", "drift"]
      .map((k) => `${k}=${sign(delta[k])}`);
    return parts.join("  ");
  };

  const lines = [
    "system-viz headline-history digest",
    "----------------------------------",
    `rows:           ${rows.length}`,
    `latest day:     ${latest.day}  (${latest.ts})`,
    `latest values:  built=${latest.built}  unwired=${latest.unwired}  wikiEntries=${latest.wikiEntries}  pendingFE=${latest.pendingFE}  drift=${latest.drift}`,
    "",
    `Δ 7d (baseline ${r7?.day ?? "n/a"}):   ${fmt(d7)}`,
    `Δ 30d (baseline ${r30?.day ?? "n/a"}):  ${fmt(d30)}`,
    "",
    `file: ${HISTORY_PATH}`,
  ];
  process.stdout.write(lines.join("\n") + "\n");
  return { ok: true, exit: 0 };
}

// Exports for in-process testing — vitest imports these without spawning
// the script. Placed BEFORE the as-main guard so importers see them even
// if the as-main check is somehow falsy in their context.
export const _internals = {
  todayUTC,
  readJsonl,
  projectHeadline,
  deltaBetween,
  rowFromNDaysAgo,
  HISTORY_PATH,
};

// ─── Entry point — only when invoked as the main script ─────────────────
// Guard against vitest's loader / `node -e` invocation crashing on the
// top-level process.exit. Basename-endsWith is enough; we never synthesize
// a `file://` URL here (would trip Vite's static analyzer).
const __mainBasename = (process.argv[1] || "").replace(/\\/g, "/").split("/").pop() || "";
if (__mainBasename && import.meta.url.endsWith(__mainBasename)) {
  const result = subcommand === "digest" ? cmdDigest() : cmdAppend();
  if (subcommand !== "digest") {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }
  process.exit(result.exit ?? (result.ok ? 0 : 1));
}
