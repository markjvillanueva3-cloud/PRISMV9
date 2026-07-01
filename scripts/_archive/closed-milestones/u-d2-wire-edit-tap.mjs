#!/usr/bin/env node
/**
 * u-d2-wire-edit-tap.mjs — PRISM-STAB-MS0/U-D2 wiring (2026-05-10).
 *
 * Idempotently adds unified-edit-tap.mjs to the existing
 * PostToolUse:Edit|Write|MultiEdit matcher. Mirrors C:->H:. Auto-rolls
 * back on JSON validation failure. --rollback restores from .u-d2.bak.
 */
import fs from "node:fs";

const SETTINGS_C = "C:/Users/wompu/.claude/settings.json";
const SETTINGS_BAK = "C:/Users/wompu/.claude/settings.json.u-d2.bak";
const SETTINGS_H = "H:/.claude/settings.json";
const TARGET_MATCHER = "Edit|Write|MultiEdit";
const HOOK_NAME = "unified-edit-tap.mjs";
const HOOK_COMMAND = '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/unified-edit-tap.mjs';
const HOOK_TIMEOUT_MS = 2000;

function syncMirror() {
  fs.copyFileSync(SETTINGS_C, SETTINGS_H);
}

function main() {
  const apply = process.argv.includes("--apply");
  const rollback = process.argv.includes("--rollback");

  if (rollback) {
    if (!fs.existsSync(SETTINGS_BAK)) { console.error(`No backup at ${SETTINGS_BAK}`); process.exit(1); }
    fs.copyFileSync(SETTINGS_BAK, SETTINGS_C);
    syncMirror();
    console.log("Rolled back C: + H: from .u-d2.bak");
    return;
  }

  const settings = JSON.parse(fs.readFileSync(SETTINGS_C, "utf-8"));
  const post = settings.hooks?.PostToolUse;
  if (!Array.isArray(post)) { console.error("settings.hooks.PostToolUse is not an array"); process.exit(1); }
  const matcher = post.find((m) => m.matcher === TARGET_MATCHER);
  if (!matcher) { console.error(`No matcher found for "${TARGET_MATCHER}"`); process.exit(1); }
  if (!Array.isArray(matcher.hooks)) matcher.hooks = [];

  const already = matcher.hooks.some((h) => (h.command || "").includes(HOOK_NAME));
  if (already) { console.log(`Already wired: ${HOOK_NAME} in PostToolUse:${TARGET_MATCHER}. No-op.`); return; }

  if (!apply) {
    console.log(`Would add to PostToolUse:${TARGET_MATCHER}:`);
    console.log(`  command:    ${HOOK_COMMAND}`);
    console.log(`  timeout:    ${HOOK_TIMEOUT_MS}ms`);
    console.log(`\nDry-run. To apply: --apply`);
    return;
  }

  fs.copyFileSync(SETTINGS_C, SETTINGS_BAK);
  matcher.hooks.push({ type: "command", command: HOOK_COMMAND, timeout: HOOK_TIMEOUT_MS });
  fs.writeFileSync(SETTINGS_C, JSON.stringify(settings, null, 2) + "\n");
  syncMirror();

  // Validate both copies parse
  try {
    JSON.parse(fs.readFileSync(SETTINGS_C, "utf-8"));
    JSON.parse(fs.readFileSync(SETTINGS_H, "utf-8"));
  } catch (e) {
    console.error(`POST-WRITE VALIDATION FAILED: ${e.message}\nRolling back...`);
    fs.copyFileSync(SETTINGS_BAK, SETTINGS_C);
    syncMirror();
    process.exit(1);
  }
  console.log(`Wired ${HOOK_NAME} into PostToolUse:${TARGET_MATCHER}.`);
  console.log(`Backup: ${SETTINGS_BAK}`);
  console.log(`Rollback: node scripts/u-d2-wire-edit-tap.mjs --rollback`);
}

main();
