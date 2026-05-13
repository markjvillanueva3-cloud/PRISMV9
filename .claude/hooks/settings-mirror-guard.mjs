#!/usr/bin/env node
// tier: T3
/**
 * settings-mirror-guard.mjs — PRISM-STAB-MS0/U-A5 (2026-05-09).
 *
 * SessionStart hook that asserts hash-equality between
 *   C:/Users/wompu/.claude/settings.json   (canonical source per CLAUDE.md)
 *   H:/.claude/settings.json               (mirror)
 *
 * The c-to-h-mirror.mjs PostToolUse hook only fires when the Edit/Write
 * tool touches the C: file. External writes (a script like
 * scripts/u-a4-archive-disabled-hooks.mjs, or another chat editing H:
 * directly) bypass it. By the next SessionStart the two layers can drift
 * silently, leading to confusing "this hook fired but settings says it
 * doesn't exist" bugs.
 *
 * This hook closes the loop:
 *   - hash both files
 *   - if equal, exit silently (continue:true)
 *   - if not equal, compare mtimes
 *       a) C: newer  → forced sync C: → H: (re-asserts the canonical direction)
 *       b) H: newer  → LOUD warning. H: edits violate doctrine. Sync C: → H:
 *          anyway (overwrites H:'s unauthorized changes; rationale logged).
 *   - log every reconciliation to state/shared/settings-mirror-guard.log
 *
 * Non-blocking. Always exits with continue:true.
 *
 * Rollback: PRISM_MIRROR_GUARD_OFF=1 disables the guard entirely.
 */

import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync, appendFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

const C_PATH = "C:/Users/wompu/.claude/settings.json";
const H_PATH = "H:/.claude/settings.json";
const LOG_PATH = "H:/prism/state/shared/settings-mirror-guard.log";

function hashFile(p) {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

function logEvent(record) {
  try {
    if (!existsSync(dirname(LOG_PATH))) mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
  } catch { /* never fatal */ }
}

function main() {
  if (process.env.PRISM_MIRROR_GUARD_OFF === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  if (!existsSync(C_PATH) || !existsSync(H_PATH)) {
    // One side missing — nothing to compare, log and exit
    logEvent({ event: "missing_layer", c_exists: existsSync(C_PATH), h_exists: existsSync(H_PATH) });
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const cHash = hashFile(C_PATH);
  const hHash = hashFile(H_PATH);
  if (cHash === hHash) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Drift detected
  const cMtime = statSync(C_PATH).mtimeMs;
  const hMtime = statSync(H_PATH).mtimeMs;
  const hWasNewer = hMtime > cMtime;

  // Always reconcile C: → H: per doctrine. Logs which direction the drift went.
  try {
    copyFileSync(C_PATH, H_PATH);
    logEvent({
      event: "reconciled",
      direction: "C->H",
      h_was_newer: hWasNewer,
      c_hash: cHash.slice(0, 12),
      h_hash_was: hHash.slice(0, 12),
      c_mtime: new Date(cMtime).toISOString(),
      h_mtime: new Date(hMtime).toISOString(),
    });
  } catch (e) {
    logEvent({ event: "reconcile_failed", error: e.message });
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  if (hWasNewer) {
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage:
        `⚠ settings.json mirror drift detected — H: was edited directly (newer mtime than C:). ` +
        `Reconciled C: → H: per doctrine; H:'s unauthorized changes overwritten. ` +
        `If those H: edits were intentional, copy H: → C: now or they will be lost. ` +
        `Log: state/shared/settings-mirror-guard.log`,
    }));
  } else {
    // C: was newer — c-to-h-mirror should have fired but didn't (e.g. external script).
    // Quietly sync; not a doctrine violation, just a missed mirror trigger.
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: `✓ settings.json mirror synced C: → H: (C: was ahead; missed mirror trigger reconciled).`,
    }));
  }
}

try { main(); }
catch (e) {
  logEvent({ event: "fatal", error: e.message });
  process.stdout.write(JSON.stringify({ continue: true }));
}
