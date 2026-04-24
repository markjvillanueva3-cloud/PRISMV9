#!/usr/bin/env node
// Find any Stop-chain hook that references bare 'node' in a way that might
// fail on systems without node in PATH.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const settings = JSON.parse(readFileSync("H:/.claude/settings.json", "utf8"));
const stopFiles = [];
for (const chain of settings.hooks.Stop || []) {
  for (const h of chain.hooks || []) {
    const m = (h.command || "").match(/([^"\s]+\.mjs)/);
    if (m) stopFiles.push(m[1]);
  }
}

const NODE_STRING = /(["'`])node([\s/\\])/;

for (const f of stopFiles) {
  try {
    const src = readFileSync(f, "utf8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      const t = line.trim();
      if (/^(?:\/\/|\*|import |from |const\s+\{.*=.*require\()/.test(t)) return;
      if (/process\.execPath/.test(t)) return;
      if (/portable-node/.test(t)) return;
      if (/node:(\w+)/.test(t)) return; // import { x } from "node:fs"
      if (NODE_STRING.test(t)) {
        console.log(`${basename(f)}:${i + 1}: ${t.slice(0, 110)}`);
      }
    });
  } catch {}
}
