#!/usr/bin/env node
/**
 * chat-bus-prune.mjs — retention for state/shared/chat-bus/messages.
 *
 * DEV-STACK-FIX/U-CHATBUS-RETENTION (2026-07-18, post-reinstall recovery).
 *
 * The chat bus had ZERO retention: 34,219 message files (2+ months, back to
 * 2026-05-15) accumulated, and chat-bus-inject.mjs listDir+parses EVERY file on
 * every inject (O(34K) reads per fire) — the observed "34K unread" per session.
 * This prunes messages older than N days using a lexicographic PREFIX cutoff on
 * the ISO-timestamp filename (`2026-05-15T16-48-18-920Z-...`), so old files are
 * skipped by NAME with zero content parsing.
 *
 * SAFE BY DEFAULT: dry-run unless --apply. Only touches files whose name starts
 * with an ISO date prefix (YYYY-MM-DDT...), never anything else in the dir.
 *
 *   node scripts/chat-bus-prune.mjs                 # dry-run, 7d retention
 *   node scripts/chat-bus-prune.mjs --days 3        # dry-run, 3d retention
 *   node scripts/chat-bus-prune.mjs --apply         # DELETE messages older than 7d
 *   node scripts/chat-bus-prune.mjs --apply --archive state/shared/chat-bus/_archive
 *
 * Wire to a cron for hands-off retention (daily): install-*.ps1 pattern, --apply.
 */

import { readdirSync, statSync, rmSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

const DAYS = Number(arg("--days", 7)) || 7;
const APPLY = process.argv.includes("--apply");
const ARCHIVE = typeof arg("--archive", null) === "string" ? arg("--archive", null) : null;

// repo root = this script's dir (.../scripts) -> parent
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const MSG_DIR = join(repoRoot, "state", "shared", "chat-bus", "messages");

// Cutoff as an ISO-with-dashes prefix matching the filename format:
//   toISOString() 2026-05-15T16:48:18.920Z  ->  2026-05-15T16-48-18-920Z
const cutoffIso = new Date(Date.now() - DAYS * 86400_000).toISOString().replace(/[:.]/g, "-");
// Only prune well-formed message filenames (leading ISO date), never stray files.
const NAME_RE = /^\d{4}-\d{2}-\d{2}T/;

let files;
try {
  files = readdirSync(MSG_DIR);
} catch (e) {
  console.error(`chat-bus-prune: cannot read ${MSG_DIR} — ${e.message}`);
  process.exit(1);
}

let scanned = 0, matched = 0, bytes = 0, errors = 0;
const doomed = [];
for (const name of files) {
  if (!NAME_RE.test(name)) continue; // skip non-message files entirely
  scanned++;
  // Prefix compare: filename's first 24 chars vs cutoff. Fixed-width ISO -> lexicographic == chronological.
  if (name.slice(0, 24) < cutoffIso.slice(0, 24)) {
    matched++;
    doomed.push(name);
    try { bytes += statSync(join(MSG_DIR, name)).size; } catch { /* file vanished — fine */ }
  }
}

const mb = (bytes / 1024 / 1024).toFixed(2);
console.log(`chat-bus-prune: ${scanned} message file(s) scanned; ${matched} older than ${DAYS}d (${mb} MB).`);
console.log(`  cutoff (keep names >= ): ${cutoffIso.slice(0, 24)}`);

if (!APPLY) {
  console.log(`  DRY-RUN — nothing deleted. Re-run with --apply to ${ARCHIVE ? "archive" : "delete"} the ${matched} file(s).`);
  process.exit(0);
}

if (matched === 0) { console.log("  nothing to prune."); process.exit(0); }

let archiveDir = null;
if (ARCHIVE) {
  archiveDir = join(repoRoot, ARCHIVE);
  try { mkdirSync(archiveDir, { recursive: true }); } catch (e) { console.error(`  archive mkdir failed: ${e.message}`); process.exit(1); }
}

let done = 0;
for (const name of doomed) {
  const src = join(MSG_DIR, name);
  try {
    if (archiveDir) renameSync(src, join(archiveDir, name));
    else rmSync(src, { force: true });
    done++;
  } catch { errors++; }
}
console.log(`  ${archiveDir ? "archived" : "deleted"} ${done}/${matched} file(s)${errors ? ` (${errors} error(s))` : ""}. ~${mb} MB reclaimed.`);
