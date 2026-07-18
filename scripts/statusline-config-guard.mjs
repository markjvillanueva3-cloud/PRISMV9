#!/usr/bin/env node
// statusline-config-guard.mjs — SessionStart self-heal for the chat-slot statusline UI.
//
// WHY (2026-07-04): the chat-slot UI "disappeared" from the terminal because the `statusLine`
// config was present only in the H: mirror (H:/.claude/settings.json) and NOT in the canonical
// C: settings (C:/Users/<u>/.claude/settings.json) that Claude Code actually reads. The c-to-h
// mirror is C->H only, so an H:-only edit never flows back — the UI silently vanished.
//
// This guard runs on SessionStart and ENSURES the statusLine config is present + valid in the
// canonical settings file. Idempotent (silent no-op when healthy), atomic (temp+rename, validates
// JSON before writing), and fail-safe (never throws, never corrupts settings, exit 0 always).
//
// Knobs: PRISM_STATUSLINE_GUARD_DISABLE=1 (no-op), PRISM_STATUSLINE_GUARD_SETTINGS=<path> (test).

import fs from 'node:fs';

const HOME = process.env.USERPROFILE || process.env.HOME || 'C:/Users/wompu';
export const SETTINGS = process.env.PRISM_STATUSLINE_GUARD_SETTINGS || `${HOME}/.claude/settings.json`;
const STATUSLINE_SCRIPT = 'H:/prism/.claude/statusline.mjs';
const NODE = 'H:/Tools/nodejs/node.exe';
const DESIRED = Object.freeze({ type: 'command', command: `"${NODE}" ${STATUSLINE_SCRIPT}`, padding: 0 });

/** Pure: does this settings object need the statusLine restored? Returns a reason or null. */
export function needsHeal(settings) {
  const sl = settings && settings.statusLine;
  if (!sl || typeof sl !== 'object') return 'missing';
  if (typeof sl.command !== 'string' || !sl.command.includes('statusline.mjs')) return 'wrong-command';
  return null; // healthy
}

/** Pure: apply the desired statusLine to a settings object (returns a new object). */
export function healed(settings) {
  return { ...settings, statusLine: { ...DESIRED } };
}

export function main() {
  if (process.env.PRISM_STATUSLINE_GUARD_DISABLE === '1') return 0;
  let settings;
  try { settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8')); }
  catch { return 0; } // no settings / unparseable -> do NOT touch (never risk corrupting it)
  const reason = needsHeal(settings);
  if (!reason) return 0; // healthy -> silent no-op
  // Only wire a script that actually exists (don't point the terminal at a ghost).
  if (!fs.existsSync(STATUSLINE_SCRIPT)) return 0;
  try {
    const out = JSON.stringify(healed(settings), null, 2);
    JSON.parse(out); // paranoia: never write invalid JSON over a working settings file
    const tmp = `${SETTINGS}.statusline-guard.tmp`;
    fs.writeFileSync(tmp, out);
    fs.renameSync(tmp, SETTINGS); // atomic swap
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `↺ statusline-config-guard: restored the chat-slot statusLine UI to settings.json (was ${reason}).`,
      },
    }));
  } catch { /* leave settings untouched on any write error */ }
  return 0;
}

const isMain = process.argv[1] && (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')));
if (isMain) { main(); process.exit(0); }
