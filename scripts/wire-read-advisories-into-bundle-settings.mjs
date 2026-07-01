#!/usr/bin/env node
// wire-read-advisories-into-bundle-settings.mjs
// FORK-STORM-CONSOLIDATION (slot:tango) -- removes the standalone "Read" advisory
// matcher block (5 hooks now folded into read-bundle.mjs) from both C:/ and H:/
// settings.json. The read-bundle entry already runs for "Read"; this just drops
// the redundant 5-spawn block.
//
// SAFE: removes a block ONLY if matcher === "Read" AND its hooks are EXACTLY the
// 5 known advisory hooks (so the read-bundle block, or any other Read block, is
// never touched). JSON-validates in+out; idempotent; backs up each target.
//
// Usage: node scripts/wire-read-advisories-into-bundle-settings.mjs [--dry] [--revert]

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const TARGETS = ["C:/Users/wompu/.claude/settings.json", "H:/.claude/settings.json"];
const FIVE = new Set([
  "wiki-read-offload-advisory", "large-read-digest-advisory", "big-data-read-enforce",
  "recall-first-advisory", "grep-index-taken-correlator",
]);

const MODE = process.argv.includes("--revert") ? "revert" : process.argv.includes("--dry") ? "dry" : "apply";
const cmdName = (h) => { const m = (h && h.command || "").match(/([a-zA-Z0-9_-]+)\.mjs/); return m ? m[1] : ""; };

function processFile(path) {
  if (!existsSync(path)) { console.log(`  [skip] ${path} -- not found`); return; }
  const bak = `${path}.bak-readabsorb`;
  if (MODE === "revert") {
    if (existsSync(bak)) { copyFileSync(bak, path); console.log(`  [REVERT] ${path} <- .bak`); }
    else console.log(`  [skip] ${path} -- no .bak`);
    return;
  }
  const raw = readFileSync(path, "utf8");
  let j;
  try { j = JSON.parse(raw); } catch (e) { console.log(`  [FAIL] ${path} -- input not valid JSON: ${e.message}`); return; }
  const blocks = j.hooks && j.hooks.PreToolUse;
  if (!Array.isArray(blocks)) { console.log(`  [skip] ${path} -- no PreToolUse array`); return; }

  const removeIdx = [];
  blocks.forEach((b, i) => {
    if ((b.matcher || "") !== "Read") return;
    const names = (b.hooks || []).map(cmdName);
    if (names.length === FIVE.size && names.every((n) => FIVE.has(n))) removeIdx.push(i);
  });
  if (!removeIdx.length) { console.log(`  [skip] ${path} -- no matching standalone Read advisory block (already absorbed?)`); return; }

  if (MODE === "dry") {
    console.log(`  [DRY] ${path} -- would remove Read block(s) [${removeIdx.join(", ")}]`);
    return;
  }
  for (const i of [...removeIdx].sort((a, b) => b - a)) blocks.splice(i, 1);
  const out = JSON.stringify(j, null, 2) + "\n";
  try { JSON.parse(out); } catch (e) { console.log(`  [FAIL] ${path} -- output invalid JSON, NOT written: ${e.message}`); return; }
  copyFileSync(path, bak);
  writeFileSync(path, out, "utf8");
  console.log(`  [OK] ${path} -- removed ${removeIdx.length} standalone Read advisory block(s)`);
}

console.log(`mode=${MODE}`);
for (const t of TARGETS) processFile(t);
