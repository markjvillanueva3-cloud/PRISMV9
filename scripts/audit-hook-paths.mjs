#!/usr/bin/env node
import fs from "node:fs";

const settings = JSON.parse(fs.readFileSync("H:/.claude/settings.json", "utf8"));
const events = ["SessionStart", "PreToolUse", "PostToolUse", "UserPromptSubmit", "Stop", "PreCompact", "SubagentStart"];

let totalCmds = 0, missing = [], ok = 0;
for (const ev of events) {
  const groups = settings.hooks?.[ev] || [];
  for (const g of groups) {
    for (const h of g.hooks || []) {
      const cmd = h.command || "";
      if (!cmd) continue;
      totalCmds++;
      // Extract every absolute path that ends in .mjs/.js/.mjs etc
      const paths = [...cmd.matchAll(/"?H:[\\/][^"\s]+\.m?js/g)].map(m => m[0].replace(/^"/, "").replace(/\\/g, "/"));
      for (const p of paths) {
        if (fs.existsSync(p)) ok++;
        else missing.push({ event: ev, matcher: g.matcher || "*", path: p, cmd: cmd.slice(0, 80) });
      }
    }
  }
}

console.log(`Total hook commands: ${totalCmds}`);
console.log(`Resolved paths OK: ${ok}`);
console.log(`MISSING paths: ${missing.length}`);
for (const m of missing) {
  console.log(`  ✗ [${m.event}/${m.matcher}] ${m.path}`);
}
