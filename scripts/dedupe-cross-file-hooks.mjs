#!/usr/bin/env node
/**
 * dedupe-cross-file-hooks.mjs — remove hooks from H:/PRISM/.claude/settings.json
 * that are also registered in H:/.claude/settings.json (where they double-fire).
 *
 * Strategy: H:/.claude is canonical (portable user config). We strip the
 * project-level duplicates so each hook fires exactly once.
 *
 * Identity key: (event, matcher, normalized-script-path). Different command
 * wrappers (`node X` vs `portable-node X`) targeting the same script collapse
 * to the same key.
 */
import fs from "node:fs";

const USER = "H:/.claude/settings.json";
const PROJ = "H:/PRISM/.claude/settings.json";
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const BACKUP = `${PROJ}.pre-dedup-${ts}.bak`;

const userJson = JSON.parse(fs.readFileSync(USER, "utf8"));
const projJson = JSON.parse(fs.readFileSync(PROJ, "utf8"));

function scriptOf(cmd) {
  const m = (cmd || "").match(/[A-Za-z]:[\\/][^\s"']+\.m?js/);
  return m ? m[0].replace(/\\/g, "/").toLowerCase() : (cmd || "").trim().toLowerCase();
}

// Build identity set from H:/.claude (the side we keep)
const userKeys = new Set();
for (const ev of Object.keys(userJson.hooks || {})) {
  for (const block of (userJson.hooks[ev] || [])) {
    const matcher = block.matcher ?? "*";
    for (const h of (block.hooks || [])) {
      userKeys.add(`${ev}|${matcher}|${scriptOf(h.command)}`);
    }
  }
}

// Walk project-level, drop matching entries
let removed = 0, blocksKept = 0, blocksDropped = 0;
for (const ev of Object.keys(projJson.hooks || {})) {
  const blocks = projJson.hooks[ev] || [];
  const newBlocks = [];
  for (const block of blocks) {
    const matcher = block.matcher ?? "*";
    const keptHooks = [];
    for (const h of (block.hooks || [])) {
      const key = `${ev}|${matcher}|${scriptOf(h.command)}`;
      if (userKeys.has(key)) {
        removed++;
      } else {
        keptHooks.push(h);
      }
    }
    if (keptHooks.length > 0) {
      newBlocks.push({ ...block, hooks: keptHooks });
      blocksKept++;
    } else {
      blocksDropped++;
    }
  }
  if (newBlocks.length > 0) {
    projJson.hooks[ev] = newBlocks;
  } else {
    delete projJson.hooks[ev];
  }
}

if (process.argv.includes("--dry")) {
  console.log(`[DRY RUN] would remove ${removed} duplicate hook entries`);
  console.log(`[DRY RUN] blocks kept: ${blocksKept}  blocks dropped (empty): ${blocksDropped}`);
  process.exit(0);
}

fs.copyFileSync(PROJ, BACKUP);
fs.writeFileSync(PROJ, JSON.stringify(projJson, null, 2));

console.log(`✓ removed ${removed} cross-file duplicate hooks from ${PROJ}`);
console.log(`✓ blocks kept: ${blocksKept}  blocks dropped (empty): ${blocksDropped}`);
console.log(`✓ backup at ${BACKUP}`);
