#!/usr/bin/env node
/**
 * u-a4-archive-disabled-hooks.mjs — PRISM-STAB-MS0/U-A4 (2026-05-09).
 *
 * Removes the 9 hook registrations whose source has the
 * DISABLED_TOKEN_REDUX_2026_04_23 marker from C:/Users/wompu/.claude/settings.json.
 *
 * The marker hooks short-circuit at the top of their main() but still cost a
 * node subprocess fork per matching event. Removing the registration eliminates
 * that fork. The hook source files stay on disk untouched (move to disabled/
 * archive is left to a follow-up task — no behavior change there since they're
 * already short-circuited).
 *
 * Usage:
 *   node scripts/u-a4-archive-disabled-hooks.mjs              # dry-run (default)
 *   node scripts/u-a4-archive-disabled-hooks.mjs --apply      # write changes
 *   node scripts/u-a4-archive-disabled-hooks.mjs --rollback   # restore from .bak
 */

import fs from "node:fs";

const SETTINGS_C = "C:/Users/wompu/.claude/settings.json";
const SETTINGS_BAK = "C:/Users/wompu/.claude/settings.json.u-a4.bak";

const DISABLED = [
  "pre-edit-impact-analyzer.mjs",
  "prism-awareness-v2.mjs",
  "ai-feature-recommend.mjs",
  "reference-inject.mjs",
  "naming-convention-enforcer.mjs",
  "performance-pattern-detector.mjs",
  "lathe-master-post-quality-gate.mjs",
  "complexity-gate.mjs",
  "task-goal-tracker.mjs",
];

function isDisabled(cmd) {
  return DISABLED.some((d) => cmd.includes(`/${d}`));
}

function processSettings(settings) {
  const removals = [];
  if (!settings.hooks) return { removed: 0, removals };

  for (const [event, matchers] of Object.entries(settings.hooks)) {
    if (!Array.isArray(matchers)) continue;
    for (const matcher of matchers) {
      if (!matcher.hooks || !Array.isArray(matcher.hooks)) continue;
      const before = matcher.hooks.length;
      matcher.hooks = matcher.hooks.filter((h) => {
        const cmd = h.command || "";
        if (isDisabled(cmd)) {
          removals.push({ event, matcher: matcher.matcher || "(empty)", cmd });
          return false;
        }
        return true;
      });
    }
  }

  return { removed: removals.length, removals };
}

function main() {
  const apply = process.argv.includes("--apply");
  const rollback = process.argv.includes("--rollback");

  if (rollback) {
    if (!fs.existsSync(SETTINGS_BAK)) {
      console.error(`No backup found at ${SETTINGS_BAK}`);
      process.exit(1);
    }
    fs.copyFileSync(SETTINGS_BAK, SETTINGS_C);
    console.log(`Restored ${SETTINGS_C} from backup.`);
    return;
  }

  const original = fs.readFileSync(SETTINGS_C, "utf-8");
  const settings = JSON.parse(original);
  const { removed, removals } = processSettings(settings);

  console.log(`Would remove ${removed} hook registrations:`);
  for (const r of removals) {
    const hookName = r.cmd.split("/").pop().replace(/"$/, "");
    console.log(`  [${r.event}] matcher=${r.matcher.padEnd(35)} ${hookName}`);
  }

  if (!apply) {
    console.log("\nDry-run only. Pass --apply to write changes (creates .bak first).");
    return;
  }

  fs.copyFileSync(SETTINGS_C, SETTINGS_BAK);
  const next = JSON.stringify(settings, null, 2) + "\n";
  fs.writeFileSync(SETTINGS_C, next);
  console.log(`\nApplied. Backup at ${SETTINGS_BAK}.`);
  console.log("Validate: node -e \"JSON.parse(require('fs').readFileSync('" + SETTINGS_C + "'))\"");
}

main();
