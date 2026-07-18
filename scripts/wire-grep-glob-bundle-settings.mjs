#!/usr/bin/env node
// wire-grep-glob-bundle-settings.mjs
// FORK-STORM-CONSOLIDATION (slot:tango) -- replaces the three advisory Grep/Glob
// PreToolUse matcher blocks with ONE grep-glob-bundle.mjs entry, in both C:/ and
// H:/ settings.json (bash/node writes do not trigger the c-to-h mirror).
//
// SAFE: a block is removed ONLY if its matcher is exactly Glob|Grep / Grep / Glob
// AND every one of its hooks is in the known advisory set (so a hard-gate Grep/Glob
// block, or a universal .* block, is never touched). JSON-validates in + out;
// idempotent (skips if grep-glob-bundle already wired); backs up each target.
//
// Usage: node scripts/wire-grep-glob-bundle-settings.mjs [--dry] [--revert]

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const TARGETS = ["C:/Users/wompu/.claude/settings.json", "H:/.claude/settings.json"];
const BUNDLE_CMD = '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/grep-glob-bundle.mjs';
const MARKER = "grep-glob-bundle";
const TARGET_MATCHERS = new Set(["Glob|Grep", "Grep", "Glob"]);
const ADVISORY_HOOKS = new Set([
  "search-optimizer", "grep-index-first", "viz-first-redirect",
  "glob-narrow-path", "pre-grep-graph-inject", "pre-tool-savings-multi",
]);

const MODE = process.argv.includes("--revert") ? "revert" : process.argv.includes("--dry") ? "dry" : "apply";
const cmdName = (h) => { const m = (h && h.command || "").match(/([a-zA-Z0-9_-]+)\.mjs/); return m ? m[1] : ""; };

function processFile(path) {
  if (!existsSync(path)) { console.log(`  [skip] ${path} -- not found`); return; }
  const bak = `${path}.bak-grepglob`;
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
  if (blocks.some((b) => (b.hooks || []).some((h) => cmdName(h) === MARKER))) {
    console.log(`  [skip] ${path} -- already wired`); return;
  }

  // identify the advisory Grep/Glob blocks (matcher + ALL hooks in the advisory set)
  const removeIdx = [];
  blocks.forEach((b, i) => {
    const m = b.matcher || "";
    if (!TARGET_MATCHERS.has(m)) return;
    const hs = b.hooks || [];
    if (hs.length && hs.every((h) => ADVISORY_HOOKS.has(cmdName(h)))) removeIdx.push(i);
  });
  if (!removeIdx.length) { console.log(`  [skip] ${path} -- no advisory Grep/Glob blocks matched`); return; }

  const insertAt = removeIdx[0];
  const bundleBlock = { matcher: "Glob|Grep", hooks: [{ type: "command", command: BUNDLE_CMD, timeout: 10000 }] };
  // remove from the end so earlier indices stay valid
  for (const i of [...removeIdx].sort((a, b) => b - a)) blocks.splice(i, 1);
  blocks.splice(insertAt, 0, bundleBlock);

  const out = JSON.stringify(j, null, 2) + "\n";
  try { JSON.parse(out); } catch (e) { console.log(`  [FAIL] ${path} -- output invalid JSON, NOT written: ${e.message}`); return; }
  if (MODE === "dry") {
    console.log(`  [DRY] ${path} -- would remove blocks [${removeIdx.join(", ")}], insert bundle at ${insertAt} (lines ${raw.split("\n").length}->${out.split("\n").length})`);
    return;
  }
  copyFileSync(path, bak);
  writeFileSync(path, out, "utf8");
  console.log(`  [OK] ${path} -- removed ${removeIdx.length} advisory block(s), wired grep-glob-bundle`);
}

console.log(`mode=${MODE}`);
for (const t of TARGETS) processFile(t);
