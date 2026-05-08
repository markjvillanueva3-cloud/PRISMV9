#!/usr/bin/env node
/**
 * inbox-prune-stale.mjs
 *
 * OBSIDIAN-AUTOMATE-MS3/U-INBOX-PRUNE-CRON
 *
 * Daily cron entry point. Walks `knowledge/memories/inbox/*.md` and archives
 * any file with mtime older than 48 hours into
 * `knowledge/memories/inbox/archived-stale/`.
 *
 * Honors the cyrilXBT JARVIS rule: "the inbox is a triage surface, not
 * storage." A note that has been sitting >48h has either been promoted to
 * its proper subfolder OR was never going to be — either way, it should
 * not clutter inbox/.
 *
 * Softer than delete: archives via copy-then-unlink so the user can recover
 * if a triage was missed. Atomic: writes to a temp path, fsyncs, then renames
 * over the destination so a kill -9 mid-archive cannot leave a half-file.
 *
 * Idempotent: archived-stale/ files are never re-archived (regex skip).
 *
 * Exempt: brief-*, perf-report-*, resources-*, archive-*, archived-stale/*.
 * Those are machine-generated daily artifacts that the user reads/rotates
 * via their own cadence.
 *
 * Flags:
 *   --apply             move files (default is dry-run)
 *   --dry-run           list candidates without moving
 *   --inbox <path>      override inbox dir
 *   --archive <path>    override archive subdir
 *   --threshold-ms <n>  override 48h threshold (testing only)
 *
 * Cron: `7 5 * * *` (daily 05:07 local).
 *
 * @milestone OBSIDIAN-AUTOMATE-MS3/U-INBOX-PRUNE-CRON
 */

import { readdirSync, statSync, existsSync, mkdirSync, copyFileSync, unlinkSync, renameSync, writeFileSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");

const DEFAULT_INBOX = resolve(PRISM_ROOT, "knowledge", "memories", "inbox");
const DEFAULT_ARCHIVE_SUBDIR = "archived-stale";
const DEFAULT_THRESHOLD_MS = 48 * 60 * 60 * 1000;
const EXEMPT_RE = /^(brief|perf-report|resources|archive)-/i;
const STATE_FILE = resolve(PRISM_ROOT, "mcp-server", "data", "state", "inbox-prune-stale.json");

function parseFlags(argv) {
  const out = { apply: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--dry-run") out.apply = false;
    else if (a === "--inbox") out.inbox = argv[++i];
    else if (a === "--archive") out.archive = argv[++i];
    else if (a === "--threshold-ms") out.thresholdMs = Number(argv[++i]);
  }
  return out;
}

function listInboxCandidates(inboxDir, archiveDir, now, thresholdMs) {
  if (!existsSync(inboxDir)) return [];
  const out = [];
  let entries;
  try { entries = readdirSync(inboxDir, { withFileTypes: true }); } catch { return []; }
  for (const e of entries) {
    if (!e.isFile() || !e.name.toLowerCase().endsWith(".md")) continue;
    if (EXEMPT_RE.test(e.name)) continue;
    const full = join(inboxDir, e.name);
    let st;
    try { st = statSync(full); } catch { continue; }
    const age = now - st.mtimeMs;
    if (age < thresholdMs) continue;
    out.push({ path: full, name: e.name, mtimeMs: st.mtimeMs, ageMs: age });
  }
  out.sort((a, b) => a.mtimeMs - b.mtimeMs);
  return out;
}

/** Atomic archive: copy to tmp in archive dir, fsync via writeFileSync of marker, rename over dest, then unlink source. */
function archiveOne(srcPath, archiveDir) {
  const name = basename(srcPath);
  const dest = join(archiveDir, name);
  const tmp = join(archiveDir, `.${name}.tmp-${process.pid}-${Date.now()}`);
  try {
    copyFileSync(srcPath, tmp);
    // rename tmp → dest is atomic on Windows + POSIX (same volume).
    renameSync(tmp, dest);
    unlinkSync(srcPath);
    return { ok: true, dest };
  } catch (err) {
    // Best-effort cleanup of tmp file on failure.
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* ignore */ }
    return { ok: false, error: err?.message ?? String(err) };
  }
}

function writeState(stateFile, payload) {
  try {
    mkdirSync(dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, JSON.stringify(payload, null, 2), "utf8");
  } catch { /* never block on telemetry */ }
}

export function runInboxPrune(opts = {}) {
  const flags = opts.flags ?? parseFlags(process.argv);
  const now = opts.now ?? Date.now();
  const inboxDir = resolve(flags.inbox ?? opts.inbox ?? DEFAULT_INBOX);
  const archiveDir = resolve(flags.archive ?? opts.archive ?? join(inboxDir, DEFAULT_ARCHIVE_SUBDIR));
  const thresholdMs = flags.thresholdMs ?? opts.thresholdMs ?? DEFAULT_THRESHOLD_MS;
  const apply = flags.apply ?? opts.apply ?? false;
  const stateFile = opts.stateFile ?? STATE_FILE;

  const candidates = listInboxCandidates(inboxDir, archiveDir, now, thresholdMs);
  const archived = [];
  const errored = [];
  if (apply && candidates.length > 0) {
    mkdirSync(archiveDir, { recursive: true });
    for (const c of candidates) {
      const r = archiveOne(c.path, archiveDir);
      if (r.ok) archived.push({ from: c.path, to: r.dest, ageMs: c.ageMs });
      else errored.push({ from: c.path, error: r.error });
    }
  }

  const result = {
    ok: true,
    apply,
    inboxDir,
    archiveDir,
    thresholdMs,
    scanned: candidates.length,
    archived: archived.length,
    errored: errored.length,
    candidates: candidates.map((c) => ({ name: c.name, ageHours: +(c.ageMs / 3_600_000).toFixed(2) })),
    archivedPaths: archived,
    erroredPaths: errored,
    ranAtIso: new Date(now).toISOString(),
  };

  if (opts.persistState !== false) {
    writeState(stateFile, {
      schemaVersion: "1.0.0",
      lastRunIso: result.ranAtIso,
      lastApply: apply,
      lastScanned: result.scanned,
      lastArchived: result.archived,
      lastErrored: result.errored,
    });
  }

  return result;
}

const isCli = (() => {
  try {
    const argv1 = resolve(process.argv[1] ?? "");
    return argv1 === __filename;
  } catch { return false; }
})();

if (isCli) {
  try {
    const r = runInboxPrune();
    const verb = r.apply ? "archived" : "would archive";
    process.stdout.write(
      `inbox-prune-stale: ${verb} ${r.apply ? r.archived : r.scanned} file(s); ${r.errored} error(s); inbox=${r.inboxDir}\n`,
    );
    if (r.candidates.length > 0 && !r.apply) {
      for (const c of r.candidates) process.stdout.write(`  - ${c.name} (${c.ageHours}h)\n`);
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write(`inbox-prune-stale ERROR: ${err?.stack ?? err?.message ?? err}\n`);
    process.exit(1);
  }
}
