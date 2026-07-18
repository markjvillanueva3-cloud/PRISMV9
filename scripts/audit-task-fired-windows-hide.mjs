#!/usr/bin/env node
/**
 * Filter audit-windows-hide findings to ONLY scripts that scheduled tasks
 * fire. Those are the sites that actually produce visible console popups.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// 1) Discover scheduled-task target scripts by parsing install-*.ps1 files.
const installerDir = ".claude/helpers";
const installers = readdirSync(installerDir).filter((f) =>
  /^install-.+\.ps1$|^register-.+\.ps1$|^ensure-all-watchdogs\.ps1$/.test(f),
);
const SCRIPT_RE = /(?:scripts|\.claude[\\/](?:helpers|hooks))[\\/][\w\-./\\]+\.(?:mjs|cjs|js)/g;
const targets = new Set();
for (const f of installers) {
  const text = readFileSync(join(installerDir, f), "utf8");
  for (const m of text.matchAll(SCRIPT_RE)) targets.add(m[0].replace(/\\/g, "/"));
}

// 2) Read the previously emitted audit JSON if present, else re-run the audit
//    by importing the auditor lib. Simpler: read the JSON file the user just
//    wrote, or fail loudly.
const auditPath = ".audit-wh.json";
let data;
try {
  data = JSON.parse(readFileSync(auditPath, "utf8"));
} catch (e) {
  process.stderr.write("missing " + auditPath + " - run: node scripts/audit-windows-hide.mjs --json > .audit-wh.json\n");
  process.exit(2);
}

const missing = data.missing.filter((m) => targets.has(m.file));
process.stdout.write("Task-fired subprocess sites missing windowsHide: " + missing.length + "\n\n");
const byFile = {};
for (const m of missing) byFile[m.file] = (byFile[m.file] || 0) + 1;
for (const [f, c] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) {
  process.stdout.write("  " + String(c).padStart(2) + " x " + f + "\n");
}
process.stdout.write("\n");
for (const m of missing) {
  process.stdout.write("--- " + m.file + ":" + m.line + " (" + m.fn + ")\n");
  process.stdout.write("    " + m.snippet + "\n");
}
