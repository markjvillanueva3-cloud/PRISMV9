#!/usr/bin/env node
/**
 * crash-postmortem-digest.mjs -- close the chat-crash-postmortems DEAD-END (golf).
 *
 * U-GOLF-CRASH-POSTMORTEM-DIGEST (golf self-repair-harness assessment, 2026-06-09;
 * ultracode Workflow golf-self-repair-harness-assess). `fleet-reaper-sweep.mjs`
 * writes `state/shared/chat-crash-postmortems.jsonl` every sweep (per-slot crash
 * forensics: which slot froze, for how long, under what memory pressure) -- but
 * NOTHING reads it (grep-proven: only the writer + its lib + that lib's test). A
 * loop's output that feeds nothing is the exact "trace lands, nobody acts" gap the
 * self-repairing-harness pattern targets.
 *
 * This is the missing READ/COMPOUND arm: aggregate the crash corpus + the
 * task-reenable ledger over a window ->
 *   - top crashing slots + memory-pressure correlation (which slots die, and is it
 *     under CRITICAL RAM pressure -> a /compact-cadence problem, not a code bug),
 *   - FLAPPING safety nets: a scheduled task re-enabled >= FLAPPING_THRESHOLD times
 *     in the window is being RE-DISABLED faster than the G10 guard heals it -- the
 *     named-open root cause "WHAT keeps disabling the crash-critical tasks"
 *     (golf plan iter-2). G10 re-enables blind; this surfaces the flap so it can be
 *     diagnosed instead of re-healed forever.
 *
 * Read-only + advisory: NO reap, NO disable, NO daemon restart, NO Start/Enable --
 * trips none of the golf-soul refuses. The output compounds outward (an AGENT_CHAT
 * advisory + a durable dashboard) so a dead-end loop now feeds the brain.
 *
 * Usage:
 *   node scripts/crash-postmortem-digest.mjs            # --text (default)
 *   node scripts/crash-postmortem-digest.mjs --json
 *   node scripts/crash-postmortem-digest.mjs --days 14  # window (default 7)
 *   node scripts/crash-postmortem-digest.mjs --write    # also write dashboard json+md + AGENT_CHAT advisory
 *
 * Pure core (parseJsonlRows / filterWindow / aggregateCrashes / aggregateReenables /
 * buildDigestAdvisory / renderDigestMarkdown) is exported for the hermetic suite --
 * no filesystem needed to test the aggregation logic.
 */
import { readFileSync, statSync, writeFileSync, mkdirSync, appendFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DIGEST_SCHEMA_VERSION = 1;
export const DEFAULT_WINDOW_DAYS = 7;
export const FLAPPING_THRESHOLD = 3;             // re-enabled >= N times in window = flapping
export const MAX_JSONL_BYTES = 64 * 1024 * 1024; // size guard: fail-loud over cap (rotate keeps each file < 256KB)
const TOP_N = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PRESSURE_TIERS = ["normal", "warn", "critical", "unknown"];

// ── pure core ──────────────────────────────────────────────────────────────

/**
 * Parse JSONL text into row objects. Tolerant: blank lines skipped, ONE malformed
 * line is dropped (never throws the whole digest -- a half-written tail row must
 * not blind the entire corpus).
 */
export function parseJsonlRows(text) {
  const rows = [];
  if (!text) return rows;
  for (const line of String(text).split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { const o = JSON.parse(t); if (o && typeof o === "object") rows.push(o); }
    catch { /* skip one malformed row */ }
  }
  return rows;
}

/** Keep rows whose `ts` (ISO) parses into [sinceMs, nowMs]. Rows without a finite ts are dropped. */
export function filterWindow(rows, sinceMs, nowMs) {
  const lo = Number.isFinite(sinceMs) ? sinceMs : -Infinity;
  const hi = Number.isFinite(nowMs) ? nowMs : Infinity;
  return (rows || []).filter((r) => {
    const t = r && r.ts ? Date.parse(r.ts) : NaN;
    return Number.isFinite(t) && t >= lo && t <= hi;
  });
}

/**
 * Aggregate chat-crash rows -> totals, top-N crashing slots (count + avg frozen
 * minutes + last seen), and a memory-pressure-tier histogram. Pure.
 */
export function aggregateCrashes(rows) {
  const bySlot = new Map();
  const byPressure = { normal: 0, warn: 0, critical: 0, unknown: 0 };
  let total = 0;
  for (const r of rows || []) {
    if (!r || r.kind !== "chat-crash") continue;
    total++;
    const slot = (typeof r.slot === "string" && r.slot) ? r.slot : "unknown";
    const cur = bySlot.get(slot) || { slot, count: 0, lastTs: null, frozenMinSum: 0, frozenMinN: 0 };
    cur.count++;
    if (r.ts && (!cur.lastTs || r.ts > cur.lastTs)) cur.lastTs = r.ts;
    if (Number.isFinite(r.frozenMinutes)) { cur.frozenMinSum += r.frozenMinutes; cur.frozenMinN++; }
    bySlot.set(slot, cur);
    const tier = PRESSURE_TIERS.includes(r.pressureTier) ? r.pressureTier : "unknown";
    byPressure[tier]++;
  }
  const slots = [...bySlot.values()]
    .map((s) => ({
      slot: s.slot, count: s.count, lastTs: s.lastTs,
      avgFrozenMin: s.frozenMinN ? Math.round(s.frozenMinSum / s.frozenMinN) : null,
    }))
    .sort((a, b) => b.count - a.count || String(a.slot).localeCompare(String(b.slot)));
  return { totalCrashes: total, distinctSlots: slots.length, bySlot: slots.slice(0, TOP_N), byPressure };
}

/**
 * Aggregate task-reenable-ledger rows -> per-task re-enable counts + the FLAPPING
 * set (count >= threshold). Each ledger row = one time a crash-critical task was
 * found disabled and the G10 guard re-enabled it; a high count means something is
 * re-disabling it (the real root cause the guard only treats symptomatically). Pure.
 */
export function aggregateReenables(ledgerRows, threshold = FLAPPING_THRESHOLD) {
  const byTask = new Map();
  for (const r of ledgerRows || []) {
    if (!r || typeof r.task !== "string" || !r.task) continue;
    byTask.set(r.task, (byTask.get(r.task) || 0) + 1);
  }
  const tasks = [...byTask.entries()].map(([task, count]) => ({ task, count }))
    .sort((a, b) => b.count - a.count || a.task.localeCompare(b.task));
  const flapping = tasks.filter((t) => t.count >= threshold);
  return { totalReenables: tasks.reduce((n, t) => n + t.count, 0), distinctTasks: tasks.length, byTask: tasks, flapping };
}

/**
 * One-line AGENT_CHAT advisory, or null when there is nothing notable (no crashes
 * AND no flapping -> silent, no cry-wolf). Flapping leads because it names a real
 * unresolved failure; crash counts follow.
 */
export function buildDigestAdvisory(crashAgg, reenableAgg) {
  const parts = [];
  if (reenableAgg && Array.isArray(reenableAgg.flapping) && reenableAgg.flapping.length) {
    const f = reenableAgg.flapping.map((x) => `${x.task} x${x.count}`).join(", ");
    parts.push(`FLAPPING safety net(s): ${f} -- re-disabled faster than G10 heals (find the disabler)`);
  }
  if (crashAgg && crashAgg.totalCrashes > 0) {
    const top = crashAgg.bySlot.slice(0, 3).map((s) => `${s.slot} x${s.count}`).join(", ");
    const critN = (crashAgg.byPressure && crashAgg.byPressure.critical) || 0;
    parts.push(`${crashAgg.totalCrashes} chat-crash(es)/${crashAgg.distinctSlots} slot(s); top: ${top}`
      + (critN ? `; ${critN} under CRITICAL mem pressure (compact-cadence)` : ""));
  }
  if (!parts.length) return null;
  return `crash-postmortem digest: ${parts.join(" | ")}`;
}

/** Render the durable dashboard markdown. Pure. */
export function renderDigestMarkdown(crashAgg, reenableAgg, meta = {}) {
  const L = [];
  L.push(`# Crash-Postmortem Digest`);
  L.push(``);
  L.push(`- Generated: ${meta.generatedIso || "(unknown)"} - window ${meta.windowDays || DEFAULT_WINDOW_DAYS}d - rows scanned: ${meta.rowsScanned ?? "?"}`);
  L.push(`- Source: \`state/shared/chat-crash-postmortems.jsonl\` (+ rotated \`.1\`) - written by fleet-reaper-sweep, read by THIS digest (U-GOLF-CRASH-POSTMORTEM-DIGEST).`);
  L.push(`- NOTE: retained depth is bounded by the writer's single-generation rotation (current + one \`.1\`), so under heavy churn the effective history can be SHALLOWER than the stated ${meta.windowDays || DEFAULT_WINDOW_DAYS}d window. "crash" = the crash-watch heuristic (heartbeat frozen >=10min, chatId unchanged) -- may include idle-but-alive slots; see avg-frozen-min to disambiguate.`);
  L.push(``);
  L.push(`## Chat crashes (${crashAgg.totalCrashes} total, ${crashAgg.distinctSlots} slot(s))`);
  if (crashAgg.totalCrashes === 0) {
    L.push(`_No chat-crash rows in window._`);
  } else {
    L.push(`| slot | crashes | avg frozen (min) | last seen |`);
    L.push(`|------|---------|------------------|-----------|`);
    for (const s of crashAgg.bySlot) {
      L.push(`| ${s.slot} | ${s.count} | ${s.avgFrozenMin ?? "-"} | ${s.lastTs || "-"} |`);
    }
    const p = crashAgg.byPressure;
    L.push(``);
    L.push(`Memory pressure at crash: normal ${p.normal} / warn ${p.warn} / **critical ${p.critical}** / unknown ${p.unknown}.`);
    if (p.critical > 0) L.push(`> ${p.critical} crash(es) under CRITICAL pressure -- a /compact-cadence issue, route to the fleet-memory-monitor advisory, not a code bug.`);
  }
  L.push(``);
  L.push(`## Safety-net re-enable ledger`);
  if (!reenableAgg || reenableAgg.totalReenables === 0) {
    L.push(`_No re-enable events in window (ledger empty or absent -- the G10 guard fired no heals, or the ledger has not yet accumulated)._`);
  } else {
    L.push(`| task | re-enables | flapping? |`);
    L.push(`|------|-----------|-----------|`);
    for (const t of reenableAgg.byTask) {
      L.push(`| ${t.task} | ${t.count} | ${t.count >= FLAPPING_THRESHOLD ? `**YES (>=${FLAPPING_THRESHOLD})**` : "no"} |`);
    }
    if (reenableAgg.flapping.length) {
      L.push(``);
      L.push(`> FLAPPING: ${reenableAgg.flapping.map((f) => f.task).join(", ")} are re-disabled faster than the G10 guard heals them. The guard treats the symptom; this is the disabler-root-cause signal. Next: Windows-side trace (Get-ScheduledTaskInfo failure history + -Settings) on each flapping task.`);
    }
  }
  L.push(``);
  return L.join("\n");
}

// ── IO shell (only runs as a CLI) ────────────────────────────────────────────

function repoRoot() { return join(dirname(fileURLToPath(import.meta.url)), ".."); }

/** Read a JSONL file fail-soft, with a fail-LOUD size guard (per the tribal-index V8 cap lesson). */
function readJsonlSafe(path) {
  let size = 0;
  try { size = statSync(path).size; } catch { return ""; }   // absent -> empty
  if (Number.isFinite(size) && size > MAX_JSONL_BYTES) {
    throw new Error(`crash-postmortem-digest: ${path} is ${size}B > MAX_JSONL_BYTES ${MAX_JSONL_BYTES} -- refusing a giant read (rotation should keep each file < 256KB; investigate).`);
  }
  try { return readFileSync(path, "utf8"); } catch { return ""; }
}

function loadAllCrashRows(root) {
  // Current + rotated (.1). fleet-reaper-crash-watch rotates at 256KB, so a full
  // window can span both files; read both, newest concatenated last is fine
  // (filterWindow + aggregation are order-independent).
  const base = join(root, "state", "shared", "chat-crash-postmortems.jsonl");
  return [...parseJsonlRows(readJsonlSafe(base)), ...parseJsonlRows(readJsonlSafe(base + ".1"))];
}

function loadReenableLedger(root) {
  return parseJsonlRows(readJsonlSafe(join(root, "state", "shared", "fleet-task-reenable-ledger.jsonl")));
}

function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

function postAgentChat(root, advisory) {
  if (!advisory) return;
  try {
    const row = {
      ts: new Date().toISOString(),
      from: "crash-postmortem-digest",
      kind: "crash-digest",
      level: "info",
      subject: "fleet crash + safety-net flap digest",
      body: advisory,
      message: advisory,
    };
    appendFileSync(join(root, "state", "shared", "AGENT_CHAT.jsonl"), JSON.stringify(row) + "\n");
  } catch { /* bus post is best-effort; the dashboard is the durable record */ }
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const write = argv.includes("--write");
  const di = argv.indexOf("--days");
  const windowDays = (di >= 0 && argv[di + 1] && Number.isFinite(Number(argv[di + 1])))
    ? Math.max(1, Number(argv[di + 1])) : DEFAULT_WINDOW_DAYS;

  const root = repoRoot();
  const nowMs = Date.now();
  const sinceMs = nowMs - windowDays * MS_PER_DAY;

  let crashRows, ledgerRows;
  try {
    crashRows = loadAllCrashRows(root);
    ledgerRows = loadReenableLedger(root);
  } catch (e) {
    // The only throw is the size guard (fail-loud). Surface it, do not silently empty-digest.
    if (json) process.stdout.write(JSON.stringify({ ok: false, error: String(e?.message || e) }));
    else process.stdout.write(`[crash-digest] ERROR: ${String(e?.message || e)}\n`);
    process.exit(2);
  }

  const rowsScanned = crashRows.length + ledgerRows.length;
  const crashAgg = aggregateCrashes(filterWindow(crashRows, sinceMs, nowMs));
  const reenableAgg = aggregateReenables(filterWindow(ledgerRows, sinceMs, nowMs));
  const advisory = buildDigestAdvisory(crashAgg, reenableAgg);
  const generatedIso = new Date(nowMs).toISOString();
  const meta = { generatedIso, windowDays, rowsScanned };

  if (write) {
    const dashJson = join(root, "state", "shared", "dashboards", "crash-postmortem-digest.json");
    const dashMd = join(root, "state", "shared", "dashboards", "crash-postmortem-digest.md");
    try {
      atomicWrite(dashJson, JSON.stringify({ schemaVersion: DIGEST_SCHEMA_VERSION, ...meta, crashAgg, reenableAgg, advisory }, null, 2));
      atomicWrite(dashMd, renderDigestMarkdown(crashAgg, reenableAgg, meta));
    } catch (e) { process.stderr.write(`[crash-digest] dashboard write failed: ${String(e?.message || e)}\n`); }
    postAgentChat(root, advisory);
  }

  if (json) {
    process.stdout.write(JSON.stringify({ ok: true, ...meta, crashAgg, reenableAgg, advisory }));
    process.exit(0);
  }

  process.stdout.write(renderDigestMarkdown(crashAgg, reenableAgg, meta));
  if (advisory) process.stdout.write(`\nADVISORY: ${advisory}\n`);
  process.exit(0);
}

// Run main ONLY when invoked directly (compare the entry basename, not this
// module's own name -- which always matches and would fire on import, killing
// a test run via process.exit).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) main();
