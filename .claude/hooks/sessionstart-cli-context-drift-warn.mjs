#!/usr/bin/env node
// tier: T3
/**
 * sessionstart-cli-context-drift-warn.mjs -- MULTI-CLI-SYNC-HOOK-MS28 / P0-U02 (slot:golf, 2026-06-18).
 *
 * SessionStart drift DETECTOR (warning-only) for the multi-CLI context mirrors.
 *
 * Complements P0-U01's `stop-sync-cli-context.mjs`: that Stop hook auto-syncs when a SOURCE
 * (CLAUDE.md / MEMORY.md) changed. THIS detector catches the OTHER failure mode -- a MIRROR
 * (GEMINI.md / AGENTS.md / CLI MEMORY.md) whose content diverged from its source WITHOUT a
 * source change (manually edited, partially written, or corrupted). The Stop hook's mtime gate
 * does NOT catch that (source mtime unchanged -> no sync), so a corrupted mirror would silently
 * feed Codex/Gemini STALE doctrine. This warns at SessionStart so it is fixed promptly.
 *
 * Reuses the EXACT MIRRORS map + header-strip + Codex addenda from sync-cli-context-files.mjs
 * (no duplicated mapping -- a drift detector with its own drifting copy would defeat itself).
 *
 * Warning-only: never blocks; emits a SessionStart additionalContext listing diverged mirrors.
 * Cheap: a handful of file reads + string compares, once per session.
 *
 * Knob: PRISM_CLI_CONTEXT_DRIFT_WARN_DISABLE=1
 *
 * @hook SessionStart  (non-blocking; tier T3 observer)
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { MIRRORS, stripExistingHeader, CODEX_ADDENDA } from "../helpers/sync-cli-context-files.mjs";

function readOrNull(p) {
  try { return readFileSync(p, "utf8"); } catch { return null; }
}

/**
 * Pure detector: returns the mirrors whose CURRENT content diverges from what a sync would
 * produce from their source -- i.e. manually edited / corrupted. A missing source OR a missing
 * mirror is SKIPPED (that is staleness handled by the Stop-hook sync, not content corruption).
 * `readFn(path) -> string|null` is injectable for tests.
 */
export function findDivergedMirrors(mirrors, readFn = readOrNull) {
  const diverged = [];
  for (const m of mirrors) {
    const src = readFn(m.src);
    if (src === null) continue; // source gone -> not this detector's concern
    const dst = readFn(m.dst);
    if (dst === null) continue; // mirror missing -> staleness (sync recreates it), not corruption
    const expectedBody = src + (m.codexAddenda ? CODEX_ADDENDA : "");
    if (stripExistingHeader(dst) !== expectedBody) {
      diverged.push({ src: m.src, dst: m.dst, target: m.target });
    }
  }
  return diverged;
}

function emit(additionalContext) {
  const out = { continue: true };
  if (additionalContext) {
    out.hookSpecificOutput = { hookEventName: "SessionStart", additionalContext };
  }
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

function main() {
  try { if (!process.stdin.isTTY) readFileSync(0, "utf8"); } catch { /* drain */ }
  if (String(process.env.PRISM_CLI_CONTEXT_DRIFT_WARN_DISABLE || "") === "1") return emit();

  let diverged = [];
  try { diverged = findDivergedMirrors(MIRRORS); } catch { return emit(); }
  if (!diverged.length) return emit();

  const list = diverged.map((d) => `  - ${d.dst} (${d.target}) diverged from ${d.src}`).join("\n");
  return emit(
    `## CLI context mirror DRIFT detected (${diverged.length})\n` +
    `These CLI doctrine mirrors no longer match their source (manually edited or corrupted) -- ` +
    `Codex/Gemini may be reading STALE PRISM doctrine:\n${list}\n` +
    `Restore: run \`node H:/PRISM/.claude/helpers/sync-cli-context-files.mjs\` (regenerates from CLAUDE.md/MEMORY.md). ` +
    `Disable this check: PRISM_CLI_CONTEXT_DRIFT_WARN_DISABLE=1.`
  );
}

const __isMain = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (__isMain) {
  try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
}
