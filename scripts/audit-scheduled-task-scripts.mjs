#!/usr/bin/env node
/**
 * Enumerate scripts referenced by scheduled-task installers so we know which
 * subset of audit-windows-hide findings actually matter for popup suppression.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const installerDir = ".claude/helpers";
const installers = readdirSync(installerDir).filter((f) =>
  /^install-.+\.ps1$|^register-.+\.ps1$|^ensure-all-watchdogs\.ps1$/.test(f),
);

const SCRIPT_RE = /(?:scripts|\.claude[\\/](?:helpers|hooks))[\\/][\w\-./\\]+\.(?:mjs|cjs|js)/g;

const targets = new Set();
for (const f of installers) {
  const text = readFileSync(join(installerDir, f), "utf8");
  for (const m of text.matchAll(SCRIPT_RE)) {
    targets.add(m[0].replace(/\\/g, "/"));
  }
}

console.log("TASK-FIRED SCRIPTS (" + targets.size + "):");
for (const t of Array.from(targets).sort()) console.log("  " + t);
