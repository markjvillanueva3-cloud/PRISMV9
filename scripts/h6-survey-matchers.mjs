#!/usr/bin/env node
// H6 / U-HOOK-FAST-LANE — one-shot survey: per-hook tier in current settings matchers.
// Read-only — does not mutate settings.json. Output is fed into the engine spec.
import * as fs from "node:fs";

const HOOK_PATH_RE = /(H:[\/\\][^"' ]+\.mjs)/;
const BASENAME_RE = /([\w-]+)\.mjs/;
const TIER_RE = /\/\/ tier: (T\d)/;

function tierOf(cmd) {
  const m = String(cmd).match(HOOK_PATH_RE);
  if (!m) return "?";
  const p = m[1].replace(/\\/g, "/");
  try {
    const src = fs.readFileSync(p, "utf8");
    const t = src.match(TIER_RE);
    return t ? t[1] : "untagged";
  } catch {
    return "MISSING";
  }
}

const FILES = ["H:/.claude/settings.json", "H:/prism/.claude/settings.json"];

for (const f of FILES) {
  console.log("======= " + f + " =======");
  const s = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const evt of ["PreToolUse", "PostToolUse"]) {
    const blocks = s.hooks?.[evt] || [];
    for (const block of blocks) {
      const m = block.matcher === undefined ? "(no-matcher)" : JSON.stringify(block.matcher);
      const hooks = block.hooks || [];
      if (hooks.length === 0) continue;
      console.log("  " + evt + " matcher=" + m);
      for (const h of hooks) {
        const cmd = h.command || "";
        const tier = tierOf(cmd);
        const base = (cmd.match(BASENAME_RE) || [])[1] || cmd.slice(0, 70);
        console.log("    [" + tier + "] " + base);
      }
    }
  }
}
