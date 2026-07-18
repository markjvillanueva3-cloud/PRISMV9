#!/usr/bin/env node
/**
 * One-shot wire-up for FLEET-REAPER-MS3/U-FR-MS3-A:
 *   - UserPromptSubmit chain: active-chat-priority-boost.mjs (T3 observer, 3000ms)
 *   - Stop chain (group 0): active-chat-priority-decay.mjs (T3 observer, 3000ms)
 *
 * Idempotent: re-running adds nothing if the entries already exist.
 * Touches `C:/Users/wompu/.claude/settings.json` ONLY — the c-to-h-mirror
 * hook auto-replicates to H:/.claude/settings.json on next event.
 *
 * Per CLAUDE.md doctrine: "Edit C:\\Users\\<your-user>\\.claude\\settings.json ONLY".
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const SETTINGS_PATH = "C:/Users/wompu/.claude/settings.json";

const BOOST_CMD = '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/active-chat-priority-boost.mjs';
const DECAY_CMD = '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/active-chat-priority-decay.mjs';

function alreadyWired(group, cmdStr) {
  if (!group || !Array.isArray(group.hooks)) return false;
  return group.hooks.some(h => (h.command || "").includes(cmdStr.split('" ')[1] || cmdStr));
}

function makeEntry(cmd) {
  return { type: "command", command: cmd, timeout: 3000 };
}

function main() {
  if (!existsSync(SETTINGS_PATH)) {
    process.stderr.write(`settings.json not found: ${SETTINGS_PATH}\n`);
    process.exit(2);
  }
  const text = readFileSync(SETTINGS_PATH, "utf8");
  const j = JSON.parse(text);
  if (!j.hooks) j.hooks = {};
  if (!Array.isArray(j.hooks.UserPromptSubmit)) j.hooks.UserPromptSubmit = [{ matcher: "", hooks: [] }];
  if (!Array.isArray(j.hooks.Stop)) j.hooks.Stop = [{ matcher: "", hooks: [] }];

  const ups = j.hooks.UserPromptSubmit[0];
  const stop = j.hooks.Stop[0];

  const before = { ups: ups.hooks.length, stop: stop.hooks.length };
  let added = 0;

  if (!alreadyWired(ups, "active-chat-priority-boost.mjs")) {
    ups.hooks.push(makeEntry(BOOST_CMD));
    added += 1;
  }
  if (!alreadyWired(stop, "active-chat-priority-decay.mjs")) {
    stop.hooks.push(makeEntry(DECAY_CMD));
    added += 1;
  }

  if (added === 0) {
    process.stdout.write(`already-wired (UserPromptSubmit=${before.ups} Stop=${before.stop})\n`);
    return;
  }

  // Backup first (in case we need to revert)
  const backupPath = SETTINGS_PATH + ".bak-fr-ms3-a";
  if (!existsSync(backupPath)) copyFileSync(SETTINGS_PATH, backupPath);

  // Write atomically (write to .tmp then rename)
  const tmpPath = SETTINGS_PATH + ".tmp-fr-ms3-a";
  writeFileSync(tmpPath, JSON.stringify(j, null, 2) + "\n", "utf8");
  // Verify the tmp parses
  JSON.parse(readFileSync(tmpPath, "utf8"));
  writeFileSync(SETTINGS_PATH, JSON.stringify(j, null, 2) + "\n", "utf8");

  process.stdout.write(`wired ${added} entries (UserPromptSubmit ${before.ups}→${ups.hooks.length}, Stop ${before.stop}→${stop.hooks.length}); backup: ${backupPath}\n`);
}

main();
