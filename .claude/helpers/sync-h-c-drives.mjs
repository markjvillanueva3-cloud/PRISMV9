#!/usr/bin/env node
/**
 * sync-h-c-drives.mjs — Bidirectional H:/C: sync for ~/.claude
 *
 * H:\.claude\ is canonical. This script:
 *   1. Copies H: → C: for files missing or outdated on C:
 *   2. Copies C: → H: for files only on C: (preserves new C-only work)
 *   3. On conflict, prefers H: (unless --c-wins)
 *
 * Neither side is ever deleted — this is a sync, not a migration.
 *
 * Usage: node sync-h-c-drives.mjs [--dry-run] [--c-wins] [--verbose]
 */

import { readdirSync, existsSync, statSync, copyFileSync, mkdirSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const USER_AUTHORED_DIRS = ["commands", "agents", "hooks", "skills", "rules", "plans"];
const HOOKIFY_PATTERN = /^hookify[.\-].*\.local\.md$/;

// Root-level config files that must sync (H: canonical). These are the
// ones whose divergence causes "it opened in the wrong model"-style issues.
const USER_AUTHORED_ROOT_FILES = [
  "settings.json",        // model, env, permissions, hooks
  "settings.local.json",  // local overrides
  "CLAUDE.md",            // global operational playbook
  ".mcp.json",            // MCP server registry
  "ARCHITECTURE.json",    // dashboard schema
  "dashboard.json",       // dashboard data
];

// Files/dirs that are PER-MACHINE and must NEVER sync. Kept here so the
// exclusion list is auditable in one place.
const NEVER_SYNC_PATTERNS = [
  /^\.credentials\.json$/i,              // secret auth tokens
  /^history\.jsonl$/i,                    // per-machine conversation log
  /^cache(\/|$)/i, /^debug(\/|$)/i,       // runtime state
  /^file-history(\/|$)/i, /^statsig(\/|$)/i, /^todos(\/|$)/i,
  /^backups(\/|$)/i, /^_backups(\/|$)/i,  // local backup snapshots
  /^projects(\/|$)/i,                     // per-machine session JSONL
  /\.bak([.\-].*)?$/i,                    // *.bak, *.bak-2026-..., *.bak.2
  /\.pre-junction[-.]/i,                  // pre-junction migration backups
  /\.pre-mirror[-.]/i,                    // pre-mirror migration backups
  /\.pre-master[-.]/i,                    // pre-master migration backups
];

function isExcluded(rel) {
  return NEVER_SYNC_PATTERNS.some(rx => rx.test(rel));
}

function isSymlink(p) {
  try { return lstatSync(p).isSymbolicLink(); } catch { return false; }
}

const cRoot = join(homedir(), ".claude");
const hRoot = "H:\\.claude";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const cWins = args.includes("--c-wins");
const verbose = args.includes("--verbose");

function scanDirRecursive(dir, base = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  try {
    if (!statSync(dir).isDirectory()) return out;
  } catch { return out; }
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      out.push(...scanDirRecursive(full, base));
    } else if (st.isFile()) {
      out.push(full.slice(base.length + 1));
    }
  }
  return out;
}

function syncRootFiles() {
  // Root config files: settings.json, CLAUDE.md, .mcp.json, etc.
  // Junctioned dirs on C: (e.g. commands/ → H:/commands/) share files
  // via the symlink so they don't need copy-based sync. Root FILES
  // are independent on each drive and must be copied explicitly.
  const results = [];
  for (const f of USER_AUTHORED_ROOT_FILES) {
    if (isExcluded(f)) continue;
    const hPath = join(hRoot, f);
    const cPath = join(cRoot, f);
    // If C: side is a symlink we've nothing to sync — they already
    // point at the same bytes.
    if (isSymlink(cPath) || isSymlink(hPath)) continue;
    const r = syncPair(f, hPath, cPath);
    if (r) results.push(r);
  }
  return results;
}

function mtime(p) {
  try { return statSync(p).mtimeMs; } catch { return 0; }
}

function ensureDir(p) {
  if (!existsSync(p)) {
    if (!dryRun) mkdirSync(p, { recursive: true });
  }
}

function copy(from, to) {
  ensureDir(join(to, ".."));
  if (!dryRun) copyFileSync(from, to);
}

function syncPair(relFile, hPath, cPath) {
  const onH = existsSync(hPath);
  const onC = existsSync(cPath);
  if (!onH && !onC) return null;

  if (onH && !onC) {
    copy(hPath, cPath);
    return { action: "H→C (new on C:)", file: relFile };
  }
  if (onC && !onH) {
    copy(cPath, hPath);
    return { action: "C→H (new on H:)", file: relFile };
  }
  // Both exist — compare mtime
  const hM = mtime(hPath);
  const cM = mtime(cPath);
  if (hM === cM) return null; // identical timestamps → skip
  if (cWins ? cM >= hM : hM >= cM) {
    // Canonical side is up-to-date or newer
    if (hM > cM && !cWins) {
      copy(hPath, cPath);
      return { action: "H→C (H newer)", file: relFile };
    }
    if (cM > hM && cWins) {
      copy(cPath, hPath);
      return { action: "C→H (C newer, --c-wins)", file: relFile };
    }
    return null;
  }
  // Conflict: other side is newer but not the winner
  if (!cWins && cM > hM) {
    // C is newer but H wins → push H to C anyway
    copy(hPath, cPath);
    return { action: "H→C (H wins conflict, C was newer)", file: relFile, conflict: true };
  }
  if (cWins && hM > cM) {
    copy(cPath, hPath);
    return { action: "C→H (C wins conflict, H was newer)", file: relFile, conflict: true };
  }
  return null;
}

function syncSubdir(subdir) {
  const hSub = join(hRoot, subdir);
  const cSub = join(cRoot, subdir);
  // If C:/<subdir> is a junction/symlink to H:/<subdir>, both readdirs
  // return the same list and every pair would compare equal — skip.
  if (isSymlink(cSub) || isSymlink(hSub)) return [];
  const results = [];
  const allFiles = new Set([
    ...scanDirRecursive(hSub),
    ...scanDirRecursive(cSub),
  ]);
  for (const rel of allFiles) {
    const relKey = `${subdir}/${rel.replace(/\\/g, "/")}`;
    if (isExcluded(relKey) || isExcluded(rel.replace(/\\/g, "/"))) continue;
    const r = syncPair(relKey, join(hSub, rel), join(cSub, rel));
    if (r) results.push(r);
  }
  return results;
}

function syncHookifyRoot() {
  const results = [];
  const hFiles = existsSync(hRoot)
    ? readdirSync(hRoot).filter(f => HOOKIFY_PATTERN.test(f))
    : [];
  const cFiles = existsSync(cRoot)
    ? readdirSync(cRoot).filter(f => HOOKIFY_PATTERN.test(f))
    : [];
  const all = new Set([...hFiles, ...cFiles]);
  for (const f of all) {
    const r = syncPair(f, join(hRoot, f), join(cRoot, f));
    if (r) results.push(r);
  }
  return results;
}

console.log(`\n=== H:/C: Sync ${dryRun ? "(DRY RUN) " : ""}${cWins ? "[C-wins mode]" : "[H canonical]"} ===\n`);

const all = [];
all.push(...syncRootFiles());
for (const sub of USER_AUTHORED_DIRS) {
  all.push(...syncSubdir(sub));
}
all.push(...syncHookifyRoot());

if (all.length === 0) {
  console.log("Already in sync. No changes needed.");
} else {
  const htoc = all.filter(r => r.action.startsWith("H→C")).length;
  const ctoh = all.filter(r => r.action.startsWith("C→H")).length;
  const conflicts = all.filter(r => r.conflict).length;

  console.log(`Summary:`);
  console.log(`  H: → C:  ${htoc} files`);
  console.log(`  C: → H:  ${ctoh} files`);
  if (conflicts > 0) console.log(`  conflicts resolved: ${conflicts}`);
  console.log("");

  if (verbose || all.length <= 40) {
    for (const r of all) {
      const flag = r.conflict ? " [!]" : "";
      console.log(`  ${r.action}${flag}: ${r.file}`);
    }
  } else {
    for (const r of all.slice(0, 20)) {
      const flag = r.conflict ? " [!]" : "";
      console.log(`  ${r.action}${flag}: ${r.file}`);
    }
    console.log(`  ... and ${all.length - 20} more (pass --verbose to see all)`);
  }
}

console.log(`\n=== Sync ${dryRun ? "preview" : "complete"} ===\n`);
