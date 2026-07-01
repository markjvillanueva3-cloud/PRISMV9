#!/usr/bin/env node
/**
 * synergy-regression-watch — re-runnable measurement tool for /forge-audit-v2.
 *
 * Runs system-synergy-map.mjs, persists a history record under
 * state/shared/synergy-history.jsonl, and emits a structured alert when the
 * synergy ratio regresses week-over-week beyond a configurable threshold.
 *
 * Compounding-gains rationale: the system-viz-audit shipped 2026-05-09 had no
 * automated regression detector. By 2026-05-16 synergy had dropped 22.2% →
 * 21.1% (-1.1pp) with zero alerts — the manual run was the only signal. This
 * script bolts a 30-line cron-able watcher onto the existing measurement so
 * regressions surface to the chat-bus on the day they happen.
 *
 * Usage:
 *   node scripts/synergy-regression-watch.mjs              # snapshot + alert check
 *   node scripts/synergy-regression-watch.mjs --json       # machine-readable
 *   node scripts/synergy-regression-watch.mjs --history    # dump history
 *   node scripts/synergy-regression-watch.mjs --threshold 0.005  # 0.5pp default
 *
 * Verification channel for the AUDIT-DEV-TOOLS finding F1:
 *   `node scripts/synergy-regression-watch.mjs --json | jq -r .currentRatio`
 *   Expected baseline (2026-05-16): 0.211. Alert fires if drop >= threshold.
 *
 * Exit codes (script-as-cron-job friendly):
 *   0 — no regression detected (or first run, no baseline yet)
 *   1 — regression detected (>= threshold)
 *   2 — measurement error (synergy-map failed)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HISTORY_FILE = join(REPO_ROOT, "state", "shared", "synergy-history.jsonl");
const DEFAULT_THRESHOLD = 0.005;   // 0.5 percentage-point drop
const COMPARE_WINDOW_DAYS = 7;     // week-over-week comparison

// --- args ---
const argv = process.argv.slice(2);
const jsonOut = argv.includes("--json");
const dumpHistory = argv.includes("--history");
const thresholdIdx = argv.indexOf("--threshold");
const threshold = thresholdIdx >= 0 && argv[thresholdIdx + 1]
  ? Number(argv[thresholdIdx + 1])
  : DEFAULT_THRESHOLD;

if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 1) {
  console.error(`ERROR: --threshold must be a positive number in (0,1); got '${argv[thresholdIdx + 1]}'`);
  process.exit(2);
}

// --- helpers ---
function emitJSON(payload) {
  if (jsonOut) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}

function loadHistory() {
  if (!existsSync(HISTORY_FILE)) return { ok: true, history: [], corrupt: 0 };
  const raw = readFileSync(HISTORY_FILE, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const out = [];
  let corrupt = 0;
  for (const line of lines) {
    try {
      const rec = JSON.parse(line);
      if (typeof rec.ratio === "number" && typeof rec.timestamp === "string") {
        out.push(rec);
      } else {
        corrupt++;   // valid JSON but wrong shape
      }
    } catch {
      corrupt++;     // unparseable line
    }
  }
  // Fail-loud on a corrupt-dominated history: a corruption rate >25% with at
  // least one bad line + fewer than 2 good entries means the watcher can't
  // safely baseline. Surface to stderr + caller decides (exit 2 in main flow).
  const total = out.length + corrupt;
  const tooCorrupt = corrupt > 0 && (out.length < 2 || corrupt / total > 0.25);
  return { ok: !tooCorrupt, history: out, corrupt, totalLines: total };
}

function appendRecord(rec) {
  // Atomic append: write to a sibling tmp file, then concat the existing
  // history + the new record via a single writeFileSync. If the writeFileSync
  // throws, the original history file is untouched (no torn writes).
  // The PIPE_BUF guarantee on POSIX is < 4096 bytes for appendFileSync, but
  // on NTFS / Windows that guarantee doesn't hold; the read-rewrite pattern
  // is portable.
  const dir = dirname(HISTORY_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const existing = existsSync(HISTORY_FILE) ? readFileSync(HISTORY_FILE, "utf-8") : "";
  const trailingNl = existing.length === 0 || existing.endsWith("\n");
  const newContent = existing + (trailingNl ? "" : "\n") + JSON.stringify(rec) + "\n";
  const tmp = HISTORY_FILE + ".tmp." + process.pid + "." + Date.now();
  writeFileSync(tmp, newContent, "utf-8");
  // Rename is atomic on the same filesystem (NTFS + ext4 + APFS all guarantee
  // an unbroken-name-binding swap); if this throws, the tmp file is orphaned
  // but the original is intact.
  renameSync(tmp, HISTORY_FILE);
}

function findBaseline(history, asOfMs, windowMs) {
  // Pick the most recent history entry that's >= windowMs old. Tolerates
  // missing days (cron skipped) by sliding back across the whole history.
  const cutoff = asOfMs - windowMs;
  for (let i = history.length - 1; i >= 0; i--) {
    const ts = Date.parse(history[i].timestamp);
    if (Number.isFinite(ts) && ts <= cutoff) return history[i];
  }
  return null;
}

function runSynergyMap() {
  const r = spawnSync(
    process.execPath,
    [join(REPO_ROOT, "scripts", "system-synergy-map.mjs"), "--json"],
    { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024, windowsHide: true },
  );
  if (r.status !== 0) {
    return { ok: false, error: `synergy-map exit=${r.status}: ${r.stderr.slice(0, 500)}` };
  }
  try {
    const j = JSON.parse(r.stdout);
    const ratio = typeof j.ratio === "number" ? j.ratio
      : typeof j.synergyRatio === "number" ? j.synergyRatio
      : null;
    if (ratio === null) return { ok: false, error: "synergy-map output had no .ratio or .synergyRatio" };
    return { ok: true, ratio, raw: j };
  } catch (e) {
    return { ok: false, error: `parse failure: ${e.message}` };
  }
}

// --- --history mode (no measurement) ---
if (dumpHistory) {
  const loaded = loadHistory();
  if (!loaded.ok) {
    const msg = `corrupt-history: ${loaded.corrupt}/${loaded.totalLines} lines unparseable`;
    if (jsonOut) emitJSON({ ok: false, error: msg, validCount: loaded.history.length });
    else console.error(`[synergy-watch] ${msg}`);
    process.exit(2);
  }
  const history = loaded.history;
  if (jsonOut) {
    emitJSON({ ok: true, count: history.length, history });
  } else {
    console.log(`synergy-history.jsonl (${history.length} record${history.length === 1 ? "" : "s"}):`);
    for (const r of history) {
      const pct = (r.ratio * 100).toFixed(2);
      console.log(`  ${r.timestamp}  ratio=${r.ratio.toFixed(4)} (${pct}%)`);
    }
  }
  process.exit(0);
}

// --- normal mode: measure + persist + alert ---
const measurement = runSynergyMap();
if (!measurement.ok) {
  emitJSON({ ok: false, error: measurement.error });
  if (!jsonOut) console.error(`MEASUREMENT FAILED: ${measurement.error}`);
  process.exit(2);
}

const now = new Date();
const newRec = {
  timestamp: now.toISOString(),
  ratio: measurement.ratio,
  total: measurement.raw?.total,
  auto: measurement.raw?.auto,
  manual: measurement.raw?.manual,
  none: measurement.raw?.none,
};

const loadedMain = loadHistory();
if (!loadedMain.ok) {
  const msg = `corrupt-history: ${loadedMain.corrupt}/${loadedMain.totalLines} lines unparseable in ${HISTORY_FILE}; refusing to baseline against a corrupt file. Inspect or delete + re-seed.`;
  if (jsonOut) emitJSON({ ok: false, error: msg, validCount: loadedMain.history.length });
  else console.error(`[synergy-watch] ${msg}`);
  process.exit(2);
}
const history = loadedMain.history;
const baseline = findBaseline(history, now.getTime(), COMPARE_WINDOW_DAYS * 86400 * 1000);

// Atomic-write the new record. Throws on disk failure (caught below).
// The append happens BEFORE alert evaluation so a measurement is never lost,
// but the atomic-rename pattern in appendRecord means a torn write can't corrupt
// the existing history — either the new record lands or the file is unchanged.
try {
  appendRecord(newRec);
} catch (e) {
  const msg = `failed to persist measurement: ${e.message}`;
  if (jsonOut) emitJSON({ ok: false, error: msg, currentRatio: measurement.ratio });
  else console.error(`[synergy-watch] ${msg}`);
  process.exit(2);
}

let alert = null;
if (baseline) {
  const delta = measurement.ratio - baseline.ratio;
  if (delta <= -threshold) {
    alert = {
      severity: delta <= -threshold * 2 ? "p0" : "p1",
      message: `Synergy regressed ${(delta * 100).toFixed(2)}pp `
        + `(${(baseline.ratio * 100).toFixed(2)}% → ${(measurement.ratio * 100).toFixed(2)}%) `
        + `over the past ${COMPARE_WINDOW_DAYS}d`,
      baselineRatio: baseline.ratio,
      baselineTimestamp: baseline.timestamp,
      currentRatio: measurement.ratio,
      currentTimestamp: newRec.timestamp,
      deltaPp: Number((delta * 100).toFixed(3)),
      thresholdPp: Number((threshold * 100).toFixed(3)),
    };
  }
}

const result = {
  ok: true,
  currentRatio: measurement.ratio,
  currentTimestamp: newRec.timestamp,
  baselineRatio: baseline?.ratio ?? null,
  baselineTimestamp: baseline?.timestamp ?? null,
  comparisonWindowDays: COMPARE_WINDOW_DAYS,
  thresholdPp: Number((threshold * 100).toFixed(3)),
  alert,
  historyCount: history.length + 1,
};

if (jsonOut) {
  emitJSON(result);
} else {
  const pct = (measurement.ratio * 100).toFixed(2);
  console.log(`[synergy-watch] current=${pct}%  (${newRec.timestamp})`);
  if (baseline) {
    const bpct = (baseline.ratio * 100).toFixed(2);
    const dpp = ((measurement.ratio - baseline.ratio) * 100).toFixed(2);
    console.log(`[synergy-watch] baseline=${bpct}% (${baseline.timestamp})  Δ=${dpp >= 0 ? "+" : ""}${dpp}pp`);
  } else {
    console.log(`[synergy-watch] no baseline yet — first run within ${COMPARE_WINDOW_DAYS}d window`);
  }
  if (alert) {
    console.log(`[synergy-watch] ALERT (${alert.severity}): ${alert.message}`);
  } else if (baseline) {
    console.log(`[synergy-watch] no regression (threshold=${(threshold * 100).toFixed(2)}pp)`);
  }
}

process.exit(alert ? 1 : 0);
