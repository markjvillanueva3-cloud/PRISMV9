#!/usr/bin/env node
// wire-index-daemon-guardian-settings.mjs
// FLEET-SEARCH-DAEMON-MS0 / U-DAEMON-SELFHEAL
//
// Idempotently wires .claude/hooks/ensure-index-daemon-guardian.mjs into the
// SessionStart + UserPromptSubmit hook chains of the canonical user settings.json
// (C:/Users/wompu/.claude/settings.json) and mirrors the patched file to
// H:/.claude/settings.json (the c-to-h mirror only fires on Edit/Write TOOL use,
// not on a bash/node write, so we write both explicitly).
//
// SAFE: JSON.parse-validates input, re-parse-validates output before writing,
// backs up each target to .bak-daemonguardian, idempotent (skips if already
// wired). Insertion is positional-after-anchor, never a blind append.
//
// Usage: node scripts/wire-index-daemon-guardian-settings.mjs [--dry] [--revert]

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const TARGETS = [
  "C:/Users/wompu/.claude/settings.json",
  "H:/.claude/settings.json",
];
const GUARD_CMD = '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/ensure-index-daemon-guardian.mjs';
const GUARD_ENTRY = { type: "command", command: GUARD_CMD, timeout: 2000 };
const MARKER = "ensure-index-daemon-guardian";

// SessionStart: insert after the last of these autostart-class hooks (so the daemon
// warms early alongside ollama/nim/docker autostart). UserPromptSubmit: after session-id-pin.
const SS_AFTER = ["docker-intel-autostart", "nim-autostart", "ollama-autostart", "session-id-pin"];
const UPS_AFTER = ["session-id-pin"];

const MODE = process.argv.includes("--revert") ? "revert" : process.argv.includes("--dry") ? "dry" : "apply";

function cmdName(h) {
  const m = (h && h.command || "").match(/([a-z0-9-]+)\.mjs/i);
  return m ? m[1] : "";
}

// Insert GUARD_ENTRY into block[0].hooks of the named event, right after the first
// anchor found in `afterList`. Returns {changed, reason}.
function wireEvent(j, ev, afterList) {
  const blocks = j.hooks && j.hooks[ev];
  if (!Array.isArray(blocks) || !blocks.length) return { changed: false, reason: "no-blocks" };
  // choose the matcher="" block (the universal one) else the first block
  const block = blocks.find((b) => (b.matcher || "") === "") || blocks[0];
  if (!Array.isArray(block.hooks)) return { changed: false, reason: "no-hooks-array" };
  if (block.hooks.some((h) => cmdName(h) === MARKER)) return { changed: false, reason: "already-wired" };
  let idx = -1;
  for (const anchor of afterList) {
    idx = block.hooks.findIndex((h) => cmdName(h) === anchor);
    if (idx >= 0) break;
  }
  if (idx < 0) return { changed: false, reason: "no-anchor-found" };
  block.hooks.splice(idx + 1, 0, { ...GUARD_ENTRY });
  return { changed: true, reason: `inserted-after-idx-${idx}` };
}

function processFile(path) {
  if (!existsSync(path)) { console.log(`  [skip] ${path} -- not found`); return; }
  const bak = `${path}.bak-daemonguardian`;

  if (MODE === "revert") {
    if (existsSync(bak)) { copyFileSync(bak, path); console.log(`  [REVERT] ${path} <- .bak`); }
    else console.log(`  [skip] ${path} -- no .bak`);
    return;
  }

  const raw = readFileSync(path, "utf8");
  let j;
  try { j = JSON.parse(raw); } catch (e) { console.log(`  [FAIL] ${path} -- input not valid JSON: ${e.message}`); return; }

  const ss = wireEvent(j, "SessionStart", SS_AFTER);
  const ups = wireEvent(j, "UserPromptSubmit", UPS_AFTER);

  if (!ss.changed && !ups.changed) {
    console.log(`  [skip] ${path} -- SessionStart:${ss.reason} UserPromptSubmit:${ups.reason}`);
    return;
  }

  const out = JSON.stringify(j, null, 2) + "\n";
  try { JSON.parse(out); } catch (e) { console.log(`  [FAIL] ${path} -- output would be invalid JSON, NOT written: ${e.message}`); return; }

  const beforeLines = raw.split("\n").length, afterLines = out.split("\n").length;
  if (MODE === "dry") {
    console.log(`  [DRY] ${path} -- SS:${ss.reason} UPS:${ups.reason} (lines ${beforeLines}->${afterLines}, delta ${afterLines - beforeLines})`);
    return;
  }
  copyFileSync(path, bak);
  writeFileSync(path, out, "utf8");
  console.log(`  [OK] ${path} -- SS:${ss.reason} UPS:${ups.reason} (lines ${beforeLines}->${afterLines})`);
}

console.log(`mode=${MODE}`);
for (const t of TARGETS) processFile(t);
