#!/usr/bin/env node
/**
 * audit-edit-hooks.mjs — list PreToolUse + PostToolUse hooks that fire on Edit/Write tools.
 *
 * Output ranks them by likely cost (hard-error gates first, then by matcher specificity).
 * Use to pick C4-style retirement candidates.
 */
import fs from "node:fs";

const SETTINGS = "C:/Users/wompu/.claude/settings.json";
const j = JSON.parse(fs.readFileSync(SETTINGS, "utf-8"));

const EDIT_TOOLS = ["Edit", "Write", "MultiEdit", "NotebookEdit"];
function matchesEdit(matcher) {
  if (!matcher) return true; // empty matcher = all tools
  if (matcher === "*") return true;
  return EDIT_TOOLS.some((t) => matcher.includes(t));
}

function nameOf(cmd) {
  const m = cmd.match(/[/\\]hooks[/\\]([^/\\]+)\.mjs/) ||
            cmd.match(/[/\\]helpers[/\\]([^/\\]+)\.mjs/) ||
            cmd.match(/[/\\]scripts[/\\]([^/\\]+)\.mjs/);
  if (m) return m[1];
  return cmd.slice(-60);
}

for (const phase of ["PreToolUse", "PostToolUse"]) {
  const matchers = j.hooks?.[phase] || [];
  const rows = [];
  for (const m of matchers) {
    if (!Array.isArray(m.hooks)) continue;
    if (!matchesEdit(m.matcher)) continue;
    for (const h of m.hooks) {
      rows.push({
        matcher: m.matcher || "(any)",
        name: nameOf(h.command || ""),
        hard: h.continueOnError === false,
        timeout: h.timeout || null,
      });
    }
  }
  console.log(`\n=== ${phase} (Edit-relevant: ${rows.length}) ===`);
  // hard-blockers first (highest cost when they fail)
  rows.sort((a, b) => (b.hard ? 1 : 0) - (a.hard ? 1 : 0));
  for (const r of rows) {
    const flags = [r.hard ? "HARD" : "soft", r.timeout ? `${r.timeout}ms` : ""].filter(Boolean).join(" ");
    console.log(`  [${r.matcher.padEnd(20)}] ${r.name.padEnd(40)} ${flags}`);
  }
}
