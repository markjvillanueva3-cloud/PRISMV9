#!/usr/bin/env node
/**
 * handoff-prune.mjs — supersession-aware handoff archiver
 *
 * WIRE-UNWIRED / SYSTEM-SYNERGY-AUDIT-2026-05-09 Track H6 (§3 finding #8):
 * "207 handoff files = no LRU." As of 2026-05-19 the live count is 876
 * `HANDOFF-*.md` files — the accumulation every SessionStart's open-threads
 * reader and consolidation pass has to scan.
 *
 * WHY A NEW SCRIPT, not `per-agent-handoff.mjs gc`:
 *   `cmdGC` (per-agent-handoff.mjs:810) already archives — but ONLY by age,
 *   with `STALE_HOURS_DEFAULT = 6`. Auto-running that would archive the
 *   handoff of any chat merely quiet for 6 hours (overnight, between
 *   sessions) — and `session-start-auto-resume` would then find no handoff.
 *   The audit's §8 open-question #3 ("confirm criteria for 'resolved'") was
 *   never answered. This script answers it: a handoff is provably safe to
 *   archive when the SAME chat instance has since written a NEWER handoff —
 *   the chat demonstrably moved on, and the cross-topic open-threads
 *   consolidator has already captured the older topic. Age alone never
 *   archives a chat's only/newest handoff here.
 *
 * Criterion: group live `HANDOFF-<instance>-<topic>.md` by chat INSTANCE;
 * keep the newest-mtime handoff per instance; archive the older siblings
 * (they are superseded). An absolute age floor (`--max-age-days`, default
 * 45) additionally archives a kept-but-ancient handoff whose instance is
 * long dead — but only when it is ALSO not the freshest activity in the
 * dir (guarded so an idle-but-live fleet is never stripped).
 *
 * Archive = MOVE to `state/shared/handoffs/archive/` (the dir `cmdGC`
 * already uses) — never delete. Reversible. `applyPlan` no-clobbers any
 * name already present in archive/ (suffixes a timestamp). NOTE: `cmdGC`
 * does a bare `renameSync` with NO no-clobber guard, so if `cmdGC` is ever
 * given its own auto-trigger the two writers could race on archive/. Today
 * `cmdGC` has no trigger (the gap this unit's scheduled task fills), so the
 * collision window is not live — but a future `cmdGC` cron should adopt the
 * same no-clobber guard before both run unattended.
 *
 * Usage:
 *   node scripts/handoff-prune.mjs                 # dry-run (default) — prints the plan
 *   node scripts/handoff-prune.mjs --apply         # actually move superseded handoffs
 *   node scripts/handoff-prune.mjs --max-age-days 60
 *   node scripts/handoff-prune.mjs --json          # machine-readable plan
 *
 * Knobs:
 *   PRISM_HANDOFF_PRUNE_DISABLE=1   runner no-ops (for the scheduled wrapper)
 *   PRISM_HANDOFF_PRUNE_MAX_AGE_DAYS=N   default absolute age floor (45)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
// PRISM_HANDOFF_PRUNE_DIR overrides the handoffs dir — used by the test
// subprocess oracle and available to an operator pointing at a copy.
const HANDOFFS_DIR = process.env.PRISM_HANDOFF_PRUNE_DIR
  ? path.resolve(process.env.PRISM_HANDOFF_PRUNE_DIR)
  : path.join(ROOT, "state", "shared", "handoffs");
const ARCHIVE_DIR = path.join(HANDOFFS_DIR, "archive");

const DEFAULT_MAX_AGE_DAYS = (() => {
  const env = Number(process.env.PRISM_HANDOFF_PRUNE_MAX_AGE_DAYS);
  return Number.isFinite(env) && env > 0 ? env : 45;
})();

// ── Pure core ─────────────────────────────────────────────────────────────

/**
 * Extract the stable chat-instance key from a handoff filename.
 * Returns null when the filename does not match a known instance pattern —
 * the caller MUST treat a null-instance file as its own singleton group so
 * an unparseable name is never mis-grouped and archived.
 *
 * Known patterns (verified against the live handoffs dir 2026-05-19 —
 * 768 + 11 claude-<8hex>, 8 + 28 Agent@ / claude-Agent@; ~60 unparseable):
 *   HANDOFF-claude-<8hex>[-<topic>].md           — topic optional
 *   HANDOFF-[claude-]Agent@<host>_pid-<pid>[-<topic>].md
 * `claude` is matched case-insensitively (live data has both `claude-` and
 * `Claude-`). The `claude-` wrapper on an Agent key is optional — the two
 * forms collapse onto the same host+pid Agent instance. The key is
 * lowercased so case-variants of one host/id never split into two groups.
 * Unparseable names (pure-topic, slot-keyed golf, ad-hoc test ids) return
 * null — fail-safe: each becomes its own singleton, never archived as a
 * sibling of another.
 */
export function extractInstance(filename) {
  if (typeof filename !== "string") return null;
  const stem = filename.match(/^HANDOFF-(.+)\.md$/)?.[1];
  if (!stem) return null;
  // claude-<8hex>, topic optional. EXACTLY 8 hex — a longer id is not a
  // stable session id, so it stays its own singleton (fail-safe).
  let m = stem.match(/^claude-([0-9a-f]{8})(?:-.+)?$/i);
  if (m) return `claude-${m[1].toLowerCase()}`;
  // [claude-]Agent@<host>_pid-<pid>, topic optional. The optional claude-
  // wrapper collapses HANDOFF-claude-Agent@… and HANDOFF-Agent@… for the
  // same host+pid onto one instance.
  m = stem.match(/^(?:claude-)?(Agent@[^_]+_pid-\d+)(?:-.+)?$/i);
  if (m) return m[1].toLowerCase();
  return null;
}

/**
 * Decide which handoffs to keep vs archive.
 *
 * @param {{file:string, mtimeMs:number}[]} entries  live HANDOFF-*.md files
 * @param {{maxAgeDays?:number, now?:number}} opts
 * @returns {{keep:string[], archive:{file:string,reason:string}[], groups:number}}
 *
 * Rules (fail-safe — when in doubt, KEEP):
 *  - Group by extractInstance(). A null instance → its own singleton group.
 *  - Per group: the newest-mtime file is kept; every older sibling is
 *    archived with reason "superseded".
 *  - A singleton (newest-and-only file for its instance) is archived ONLY
 *    when (a) it is older than maxAgeDays AND (b) it is NOT itself the
 *    single freshest file in the entire directory — reason "aged-out".
 *    This guarantees an idle-but-live fleet (every chat has exactly one
 *    handoff) is never stripped to zero.
 */
export function planPrune(entries, opts = {}) {
  const maxAgeDays = Number.isFinite(opts.maxAgeDays) && opts.maxAgeDays > 0
    ? opts.maxAgeDays
    : DEFAULT_MAX_AGE_DAYS;
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const ageFloorMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const list = Array.isArray(entries) ? entries.filter(
    (e) => e && typeof e.file === "string" && Number.isFinite(e.mtimeMs),
  ) : [];

  // Freshest file in the whole dir — never archived, even if it is an
  // ancient singleton (it is the most-recent fleet activity that exists).
  let freshest = null;
  for (const e of list) {
    if (!freshest || e.mtimeMs > freshest.mtimeMs) freshest = e;
  }

  // Group by instance; a null instance becomes a unique singleton key.
  const groups = new Map();
  let nullSeq = 0;
  for (const e of list) {
    const inst = extractInstance(e.file);
    const key = inst === null ? `__singleton_${nullSeq++}__` : inst;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const keep = [];
  const archive = [];
  for (const members of groups.values()) {
    members.sort((a, b) => b.mtimeMs - a.mtimeMs); // newest first
    const newest = members[0];
    // Older siblings — provably superseded.
    for (let i = 1; i < members.length; i++) {
      archive.push({ file: members[i].file, reason: "superseded" });
    }
    // The newest-per-instance file: keep, unless it is an aged-out dead
    // singleton AND not the freshest file in the directory.
    const isFreshest = freshest && newest.file === freshest.file;
    const aged = (now - newest.mtimeMs) > ageFloorMs;
    if (aged && !isFreshest) {
      archive.push({ file: newest.file, reason: "aged-out" });
    } else {
      keep.push(newest.file);
    }
  }

  return { keep, archive, groups: groups.size };
}

// ── Side-effecting layer ──────────────────────────────────────────────────

export function readLiveHandoffs(dir = HANDOFFS_DIR) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch (e) {
    throw new Error(`handoff-prune: cannot read handoffs dir ${dir}: ${e.message}`);
  }
  const entries = [];
  for (const f of names) {
    // Live handoffs only: HANDOFF-*.md, exclude already-archived suffix files.
    if (!/^HANDOFF-.+\.md$/.test(f)) continue;
    if (f.includes(".archive.")) continue;
    let stat;
    try {
      stat = fs.statSync(path.join(dir, f));
    } catch {
      continue; // vanished mid-scan — skip
    }
    if (!stat.isFile()) continue;
    entries.push({ file: f, mtimeMs: stat.mtimeMs });
  }
  return entries;
}

export function applyPlan(plan, dir = HANDOFFS_DIR, archiveDir = ARCHIVE_DIR) {
  const moved = [];
  const failed = [];
  if (plan.archive.length > 0) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  for (const item of plan.archive) {
    const src = path.join(dir, item.file);
    let dest = path.join(archiveDir, item.file);
    try {
      // Never clobber an existing archived file of the same name.
      if (fs.existsSync(dest)) {
        dest = path.join(archiveDir, `${item.file}.${Date.now()}`);
      }
      fs.renameSync(src, dest);
      moved.push(item.file);
    } catch (e) {
      failed.push({ file: item.file, error: e.message });
    }
  }
  return { moved, failed };
}

// ── CLI ───────────────────────────────────────────────────────────────────

function main(argv) {
  if (process.env.PRISM_HANDOFF_PRUNE_DISABLE === "1") {
    console.log(JSON.stringify({ ok: true, disabled: true }));
    return 0;
  }
  const args = new Set(argv.slice(2));
  const apply = args.has("--apply");
  const jsonOut = args.has("--json");
  let maxAgeDays = DEFAULT_MAX_AGE_DAYS;
  const idx = argv.indexOf("--max-age-days");
  if (idx !== -1 && argv[idx + 1]) {
    const v = Number(argv[idx + 1]);
    if (Number.isFinite(v) && v > 0) {
      maxAgeDays = v;
    } else {
      // R12 — never silently accept a typo'd flag value.
      console.error(`handoff-prune: ignoring invalid --max-age-days '${argv[idx + 1]}' — using ${maxAgeDays}`);
    }
  }

  let entries;
  try {
    entries = readLiveHandoffs();
  } catch (e) {
    // R12 — fail loud, non-zero exit, never pretend success.
    console.error(e.message);
    console.log(JSON.stringify({ ok: false, error: e.message }));
    return 1;
  }

  const plan = planPrune(entries, { maxAgeDays });
  const result = {
    ok: true,
    apply,
    live_handoffs: entries.length,
    instances: plan.groups,
    keep: plan.keep.length,
    archive_planned: plan.archive.length,
    superseded: plan.archive.filter((a) => a.reason === "superseded").length,
    aged_out: plan.archive.filter((a) => a.reason === "aged-out").length,
    max_age_days: maxAgeDays,
  };

  if (apply) {
    const { moved, failed } = applyPlan(plan);
    result.archived = moved.length;
    result.failed = failed.length;
    if (failed.length > 0) {
      result.ok = false;
      result.failures = failed;
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const mode = apply ? "APPLIED" : "DRY-RUN (use --apply to act)";
    console.log(`handoff-prune [${mode}]`);
    console.log(`  live handoffs : ${result.live_handoffs}`);
    console.log(`  chat instances: ${result.instances}`);
    console.log(`  keep          : ${result.keep}`);
    console.log(`  archive plan  : ${result.archive_planned} (${result.superseded} superseded, ${result.aged_out} aged-out)`);
    if (apply) console.log(`  archived      : ${result.archived}${result.failed ? ` · FAILED ${result.failed}` : ""}`);
  }
  return result.ok ? 0 : 1;
}

// Canonical ESM main-detect — pathToFileURL normalizes Windows backslashes
// + drive letters so this fires for the CLI but never for a test import.
const isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1] || "")).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  process.exit(main(process.argv));
}
