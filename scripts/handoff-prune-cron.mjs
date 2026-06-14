#!/usr/bin/env node
/**
 * handoff-prune-cron.mjs — ECHO-UNDONE H6 / U-HANDOFF-PRUNE-CRON.
 *
 * Counters handoff sprawl across the 26-slot fleet. state/shared/handoffs/
 * accumulates one HANDOFF-*.md per chat per topic and never self-cleans — 600+
 * files today. This archives every handoff untouched for >30 days into
 * state/shared/handoffs/archive/<YYYY-MM>/ (grouped by the handoff's own
 * month), keeping the live directory to just the active set.
 *
 * Archiving is a MOVE, never a delete — fully reversible (the file still
 * exists, one directory deeper). Aligns with the "never delete, only disable"
 * reversibility rule.
 *
 * Cron cadence: the script self-throttles to once per 30 days via
 * state/shared/handoffs/.prune-throttle.json, so it is safe to invoke from any
 * frequently-running surface (a Stop hook, a watchdog) — it no-ops until a
 * month has elapsed. `--force` bypasses the throttle.
 *
 * Safety: DRY-RUN by default. `--apply` is required to actually move files.
 *
 * Usage:
 *   node scripts/handoff-prune-cron.mjs              # dry-run — print the plan
 *   node scripts/handoff-prune-cron.mjs --apply      # archive (throttled monthly)
 *   node scripts/handoff-prune-cron.mjs --apply --force   # archive, ignore throttle
 *   node scripts/handoff-prune-cron.mjs --json       # machine-readable plan
 * Exit: 0 ok (incl. throttled no-op) · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
/** A handoff untouched for this many days is archive-eligible. */
export const STALE_DAYS = 30;
/** The cron self-throttles to one apply-run per this many days. */
export const THROTTLE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const HANDOFFS_DIR = path.join(ROOT, "state/shared/handoffs");
export const ARCHIVE_DIR = path.join(HANDOFFS_DIR, "archive");
const THROTTLE_PATH = path.join(HANDOFFS_DIR, ".prune-throttle.json");

// ───────────────────────── pure core ─────────────────────────

/** `YYYY-MM` of a timestamp — the archive subdir a handoff is grouped into. */
export function archiveSubdir(mtimeMs) {
  const d = new Date(Number(mtimeMs) || 0);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Pure: build the archive plan. Each entry { name, ageDays, subdir }.
 * @param files    [{name, mtimeMs}] — top-level HANDOFF-*.md only (callers
 *                 must NOT include anything already under archive/).
 * @param nowMs    clock injection.
 * @param staleDays archive-eligibility threshold (default STALE_DAYS).
 */
export function planArchive(files, nowMs = Date.now(), staleDays = STALE_DAYS) {
  const list = Array.isArray(files) ? files : [];
  const cutoffMs = staleDays * DAY_MS;
  const plan = [];
  for (const f of list) {
    if (!f || typeof f.name !== "string" || !/^HANDOFF-.+\.md$/i.test(f.name)) continue;
    if (!Number.isFinite(f.mtimeMs)) continue;
    const ageMs = nowMs - f.mtimeMs;
    if (ageMs < cutoffMs) continue;   // still active — keep in place
    plan.push({
      name: f.name,
      ageDays: Math.floor(ageMs / DAY_MS),
      subdir: archiveSubdir(f.mtimeMs),
    });
  }
  // deterministic: oldest first, then name
  plan.sort((a, b) => b.ageDays - a.ageDays || a.name.localeCompare(b.name));
  return plan;
}

/**
 * Pure: should the apply-run proceed given the throttle state?
 * @param throttle  parsed .prune-throttle.json ({lastRunAt}) or null.
 * @returns {run:boolean, reason:string}
 */
export function shouldRun(throttle, nowMs = Date.now(), throttleDays = THROTTLE_DAYS) {
  const last = throttle && typeof throttle.lastRunAt === "string" ? Date.parse(throttle.lastRunAt) : NaN;
  if (!Number.isFinite(last)) return { run: true, reason: "no prior run recorded" };
  const elapsedDays = (nowMs - last) / DAY_MS;
  if (elapsedDays >= throttleDays) {
    return { run: true, reason: `${elapsedDays.toFixed(1)}d since last run >= ${throttleDays}d` };
  }
  return { run: false, reason: `throttled — ${elapsedDays.toFixed(1)}d since last run < ${throttleDays}d` };
}

/**
 * Pure: extract the handoff's logical write time (ms) from its frontmatter
 * `written_at:` field. Filesystem mtime is unreliable here — a `git checkout`
 * or a C:->H: mirror sync rewrites every handoff's mtime to "now", which would
 * make the prune never fire. The frontmatter timestamp survives both.
 * Returns null when absent/unparseable (caller falls back to mtime).
 */
export function parseWrittenAt(headText) {
  const m = String(headText || "").match(/^written_at:\s*(.+?)\s*$/im);
  if (!m) return null;
  const t = Date.parse(m[1]);
  return Number.isFinite(t) ? t : null;
}

// ───────────────────────── I/O ─────────────────────────

/**
 * Read top-level HANDOFF-*.md files (the archive/ subdir is never recursed).
 * Each file's age timestamp is its frontmatter `written_at` when present,
 * else the filesystem mtime. The resolved value is returned as `mtimeMs` so
 * planArchive stays a pure function of one timestamp per file.
 */
function readHandoffFiles(dir) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return null; }
  const out = [];
  for (const ent of ents) {
    if (!ent.isFile()) continue;                       // skips the archive/ dir
    if (!/^HANDOFF-.+\.md$/i.test(ent.name)) continue;
    const full = path.join(dir, ent.name);
    try {
      const st = fs.statSync(full);
      let effective = st.mtimeMs, source = "mtime";
      try {
        const head = fs.readFileSync(full, "utf8").slice(0, 1024);
        const w = parseWrittenAt(head);
        if (w !== null) { effective = w; source = "written_at"; }
      } catch { /* unreadable body — keep mtime */ }
      out.push({ name: ent.name, mtimeMs: effective, source });
    } catch { /* skip unstatable */ }
  }
  return out;
}

function loadThrottle() {
  try { return JSON.parse(fs.readFileSync(THROTTLE_PATH, "utf8")); }
  catch { return null; }
}

function writeThrottle(nowMs, archivedCount) {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    lastRunAt: new Date(nowMs).toISOString(),
    lastArchivedCount: archivedCount,
  };
  fs.writeFileSync(THROTTLE_PATH, JSON.stringify(payload, null, 2));
}

export function main(argv = []) {
  const apply = argv.includes("--apply");
  const force = argv.includes("--force");
  const json = argv.includes("--json");
  const nowMs = Date.now();

  const files = readHandoffFiles(HANDOFFS_DIR);
  if (files === null) {
    console.error(`FATAL: cannot read ${HANDOFFS_DIR}`);
    return 2;
  }

  const plan = planArchive(files, nowMs, STALE_DAYS);

  // Throttle gate applies ONLY to a real apply-run; dry-run always reports.
  const throttle = loadThrottle();
  const gate = shouldRun(throttle, nowMs, THROTTLE_DAYS);
  const throttledOut = apply && !force && !gate.run;

  if (json) {
    console.log(JSON.stringify({
      schemaVersion: SCHEMA_VERSION, generatedAt: new Date(nowMs).toISOString(),
      scanned: files.length, eligible: plan.length, apply, throttled: throttledOut,
      throttleReason: gate.reason, plan,
    }, null, 2));
    return 0;
  }

  console.log(`handoff-prune-cron — scanned ${files.length} handoffs, ${plan.length} stale (>${STALE_DAYS}d)`);

  // ── dry-run: report only, never touches the throttle sidecar ──
  if (!apply) {
    if (plan.length === 0) {
      console.log("  nothing to archive — live directory is within the active window");
    } else {
      console.log(`  [dry-run] would archive ${plan.length} file(s) — pass --apply to move:`);
      for (const p of plan.slice(0, 20)) console.log(`    ${p.name}  (${p.ageDays}d) -> archive/${p.subdir}/`);
      if (plan.length > 20) console.log(`    … and ${plan.length - 20} more`);
    }
    return 0;
  }

  // ── apply: throttle gate ──
  if (throttledOut) {
    console.log(`  ${gate.reason} — skipping apply (use --force to override)`);
    return 0;
  }

  // A real apply-run proceeds. The throttle is armed for ANY non-throttled
  // apply-run — including one that archived nothing — so an empty run still
  // counts as "ran this month" and the cadence stays honest (R12).
  let archived = 0;
  const skipped = [];
  try {
    for (const p of plan) {
      const destDir = path.join(ARCHIVE_DIR, p.subdir);
      fs.mkdirSync(destDir, { recursive: true });
      const src = path.join(HANDOFFS_DIR, p.name);
      const dest = path.join(destDir, p.name);
      // Never clobber an existing archived file. A name collision is surfaced
      // (not a silent skip) so the stranded live-dir copy is visible (R12).
      // The existsSync->renameSync TOCTOU window is bounded: the apply-path is
      // single-instance (one throttled cron run per 30 days), so no concurrent
      // archiver can race the destination.
      if (fs.existsSync(dest)) { skipped.push(p.name); continue; }
      fs.renameSync(src, dest);
      archived++;
    }
    writeThrottle(nowMs, archived);
  } catch (e) {
    console.error(`FATAL: archive failed after ${archived} move(s) — ${e.message}`);
    return 2;
  }

  console.log(`  archived ${archived} handoff(s) -> state/shared/handoffs/archive/`);
  if (skipped.length) {
    console.warn(`  WARN: ${skipped.length} file(s) NOT archived — name collision with an existing`);
    console.warn(`        archived file; left in the live directory for manual review:`);
    for (const n of skipped.slice(0, 10)) console.warn(`    ${n}`);
    if (skipped.length > 10) console.warn(`    … and ${skipped.length - 10} more`);
  }
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main(process.argv.slice(2)));
