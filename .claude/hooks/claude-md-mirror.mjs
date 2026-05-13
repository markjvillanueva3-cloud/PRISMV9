#!/usr/bin/env node
// tier: T4
/**
 * claude-md-mirror.mjs — SessionStart: mirror H:\.claude\CLAUDE.md → ~/.claude/CLAUDE.md.
 *
 * H: is canonical. If ~/.claude/CLAUDE.md differs from the master, back up the C: copy
 * and overwrite from H:. This turns the per-PC global CLAUDE.md into a view of the
 * shared master — any edit to H:\.claude\CLAUDE.md becomes active on both PCs on the
 * next session start.
 *
 * continueOnError: true — non-blocking. If the mirror fails, the session still proceeds
 * with whatever C: CLAUDE.md currently contains.
 */

import { copyFileSync, existsSync, readFileSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const MASTER = "H:\\.claude\\CLAUDE.md";
const TARGET = join(homedir(), ".claude", "CLAUDE.md");

function ts() {
  return new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 15).replace(/(\d{8})(\d{6})/, "$1-$2");
}

function main() {
  if (!existsSync(MASTER)) {
    process.stderr.write(`  claude-md-mirror: master not found at ${MASTER} (skip)\n`);
    return;
  }
  const hContent = readFileSync(MASTER);
  if (existsSync(TARGET)) {
    const cContent = readFileSync(TARGET);
    if (hContent.equals(cContent)) {
      // Already in sync — silent success.
      return;
    }
    // Differs — backup C: version before overwriting.
    const backup = `${TARGET}.pre-mirror-${ts()}`;
    try {
      renameSync(TARGET, backup);
      process.stdout.write(`  claude-md-mirror: C: differed — backed up to ${backup}\n`);
    } catch (e) {
      process.stderr.write(`  claude-md-mirror: backup rename failed: ${e.message} (aborting mirror)\n`);
      return;
    }
  }
  try {
    copyFileSync(MASTER, TARGET);
    process.stdout.write(`  ✓ CLAUDE.md mirrored H: → ~/.claude/ (${hContent.length} bytes)\n`);
  } catch (e) {
    process.stderr.write(`  claude-md-mirror: copy failed: ${e.message}\n`);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
