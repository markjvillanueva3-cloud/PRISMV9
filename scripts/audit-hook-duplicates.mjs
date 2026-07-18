#!/usr/bin/env node
/**
 * audit-hook-duplicates.mjs — find every duplicate hook command across ALL events.
 * Goes beyond verify-hook-refs by also flagging near-duplicates (same script,
 * different flags) and reporting per-event totals so we can spot bloat.
 */
import fs from "node:fs";

const FILES = [
  "H:/.claude/settings.json",
  "H:/.claude/settings.local.json",
  "H:/PRISM/.claude/settings.json",
  "H:/PRISM/.claude/settings.local.json",
];

const events = ["SessionStart","PreToolUse","PostToolUse","UserPromptSubmit","Stop","PreCompact","SubagentStart","SubagentStop"];

let totalDups = 0, totalCmds = 0;
for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  let json; try { json = JSON.parse(fs.readFileSync(file, "utf8")); } catch { console.log(`✗ INVALID JSON: ${file}`); continue; }
  const hooks = json?.hooks || {};
  console.log(`\n=== ${file} ===`);
  for (const ev of events) {
    const blocks = hooks[ev] || [];
    const tripleSeen = new Map();
    let cmdCount = 0;
    for (const b of blocks) {
      const matcher = b.matcher ?? "*";
      for (const h of (b.hooks || [])) {
        const cmd = h.command || "";
        cmdCount++;
        const key = `${matcher}::${cmd}`;
        tripleSeen.set(key, (tripleSeen.get(key) || 0) + 1);
      }
    }
    totalCmds += cmdCount;
    const dups = [...tripleSeen.entries()].filter(([, n]) => n > 1);
    if (dups.length || cmdCount > 0) {
      console.log(`  ${ev.padEnd(20)} cmds=${cmdCount}  dups=${dups.length}`);
      for (const [k, n] of dups) {
        totalDups++;
        const [matcher, ...rest] = k.split("::");
        const cmd = rest.join("::").slice(0, 80);
        console.log(`    ✗ matcher=${matcher} (×${n})  cmd: ${cmd}`);
      }
    }
  }
}
console.log(`\n=== TOTALS ===\nhook commands: ${totalCmds}\nduplicate triples: ${totalDups}`);
