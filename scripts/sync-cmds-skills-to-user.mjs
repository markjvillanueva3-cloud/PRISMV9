#!/usr/bin/env node
/**
 * sync-cmds-skills-to-user.mjs
 *
 * Refreshes the user-scope copies of PRISM project-scoped slash commands and
 * skills so they load from ANY working directory (not just from H:/prism).
 *
 * Why this exists: Claude Code loads project-scoped commands/skills only when
 * the session CWD is inside the project (H:/prism). The user (~/.claude ->
 * H:/.claude) scope loads everywhere. The c-to-h-mirror hook is C:->H: only and
 * does NOT keep project<->user in sync, so this script is the manual refresh.
 *
 * Direction: PROJECT (source of truth) -> USER (convenience copies).
 * Default behavior is "missing only" (never clobbers a user file). Pass --force
 * to also overwrite user copies whose content differs from the project source
 * (use when project commands/skills have been edited and you want copies fresh).
 *
 * Usage:
 *   node scripts/sync-cmds-skills-to-user.mjs            # copy missing only (safe)
 *   node scripts/sync-cmds-skills-to-user.mjs --force    # also refresh drifted copies
 *   node scripts/sync-cmds-skills-to-user.mjs --dry-run  # report, change nothing
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PROJECT_ROOT = 'H:/prism/.claude';
const USER_ROOT = 'H:/.claude';

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const DRY = args.has('--dry-run');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Recursively list every file under dir as paths relative to dir. */
function listFilesRel(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    const abs = path.join(dir, rel);
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const childRel = rel ? path.join(rel, e.name) : e.name;
      if (e.isDirectory()) stack.push(childRel);
      else if (e.isFile()) out.push(childRel);
    }
  }
  return out;
}

/**
 * Sync one tree (project -> user) restricted to a file filter.
 * For commands: top-level *.md only. For skills: every file (recursive).
 */
function syncTree(label, projDir, userDir, fileFilter) {
  const projFiles = listFilesRel(projDir).filter(fileFilter);
  let copied = 0;
  let refreshed = 0;
  let identical = 0;
  let drifted = 0; // differs, left as-is (no --force)
  let failed = 0;

  for (const rel of projFiles) {
    const src = path.join(projDir, rel);
    const dst = path.join(userDir, rel);
    let srcBuf;
    try {
      srcBuf = fs.readFileSync(src);
    } catch {
      failed++;
      continue;
    }

    if (!fs.existsSync(dst)) {
      if (!DRY) {
        try {
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.writeFileSync(dst, srcBuf);
        } catch {
          failed++;
          continue;
        }
      }
      copied++;
      continue;
    }

    // Destination exists -- compare content.
    let dstBuf;
    try {
      dstBuf = fs.readFileSync(dst);
    } catch {
      failed++;
      continue;
    }
    if (sha256(srcBuf) === sha256(dstBuf)) {
      identical++;
      continue;
    }
    // Content differs.
    if (FORCE) {
      if (!DRY) {
        try {
          fs.writeFileSync(dst, srcBuf);
        } catch {
          failed++;
          continue;
        }
      }
      refreshed++;
    } else {
      drifted++;
    }
  }

  console.log(
    `${label}: copied=${copied} refreshed=${refreshed} identical=${identical} ` +
      `drifted-left=${drifted} failed=${failed}` +
      (DRY ? '  [DRY-RUN: no changes written]' : '')
  );
  if (drifted > 0 && !FORCE) {
    console.log(
      `  note: ${drifted} ${label.trim().toLowerCase()} differ from project source. ` +
        `Re-run with --force to overwrite the user copies.`
    );
  }
  return { copied, refreshed, drifted, failed };
}

console.log(`PRISM cmd/skill sync  (project -> user)  force=${FORCE} dry=${DRY}`);
console.log(`  source: ${PROJECT_ROOT}`);
console.log(`  dest:   ${USER_ROOT}\n`);

const cmd = syncTree(
  'COMMANDS',
  path.join(PROJECT_ROOT, 'commands'),
  path.join(USER_ROOT, 'commands'),
  (rel) => !rel.includes(path.sep) && rel.endsWith('.md') // top-level *.md only
);

const sk = syncTree(
  'SKILLS  ',
  path.join(PROJECT_ROOT, 'skills'),
  path.join(USER_ROOT, 'skills'),
  () => true // every file under each skill dir
);

const countMd = (d) =>
  fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.md')).length : 0;
const countDirs = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).filter((x) => x.isDirectory()).length
    : 0;

console.log(
  `\nParity now:` +
    `  commands user=${countMd(path.join(USER_ROOT, 'commands'))}` +
    `/project=${countMd(path.join(PROJECT_ROOT, 'commands'))}` +
    `  skills user=${countDirs(path.join(USER_ROOT, 'skills'))}` +
    `/project=${countDirs(path.join(PROJECT_ROOT, 'skills'))}`
);

const failed = cmd.failed + sk.failed;
if (failed > 0) {
  console.error(`\nFAILED: ${failed} file(s) could not be copied. Exit 1.`);
  process.exit(1);
}
console.log('\nSync OK. Restart Claude Code (or it reloads on next file touch) to pick up changes.');
