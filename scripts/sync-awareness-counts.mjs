#!/usr/bin/env node
/**
 * sync-awareness-counts.mjs — Auto-update CLAUDE.md and directive counts
 *
 * Called by inventory-on-write hook after new engines/dispatchers are created.
 * Updates count strings in:
 *   - H:/prism/CLAUDE.md (main)
 *   - H:/prism/mcp-server/CLAUDE.md
 *   - H:/prism/state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md
 *   - C:/Users/<user>/.claude/projects/H--prism/memory/MEMORY.md
 *
 * Reads live counts from BASELINE_INVENTORY.json (updated by update-prism-inventory.mjs).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const BASELINE_PATH = "H:/prism/mcp-server/data/state/BASELINE_INVENTORY.json";
const TARGETS = [
  "H:/prism/CLAUDE.md",
  "H:/prism/mcp-server/CLAUDE.md",
  "H:/prism/state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md",
  path.join(os.homedir(), ".claude/projects/H--prism/memory/MEMORY.md"),
];

const QUIET = process.argv.includes("--quiet");

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

function loadBaseline() {
  try {
    const data = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
    const inv = data.inventory || {};
    return {
      dispatchers: inv.dispatchers || 90,
      actions: inv.actions || 5658,
      engines: typeof inv.engines === "number" ? inv.engines : (inv.engines?.files || 2510),
      algorithms: inv.algorithms || 53,
      registries: inv.registries || 25,
      tests: inv.test_count || 2363,
      hooks: inv.hooks || 181,
      skills: inv.skills || 134,
      formulas: inv.formulas?.registered || 499,
    };
  } catch (e) {
    console.error("Failed to load baseline:", e.message);
    process.exit(1);
  }
}

function updateFile(filePath, counts) {
  if (!fs.existsSync(filePath)) {
    if (!QUIET) console.log(`  skip: ${filePath} (not found)`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  // Pattern 1: "90 dispatchers, 5,426 actions, 2,495 engines" (various formats)
  const mainPattern = /(\d[\d,]*)\s*dispatchers.*?(\d[\d,]*)\s*actions.*?(\d[\d,]*)\s*engines/gi;
  content = content.replace(mainPattern, () => {
    changed = true;
    return `${counts.dispatchers} dispatchers, ${formatNumber(counts.actions)} actions, ${formatNumber(counts.engines)} engines`;
  });

  // Pattern 2: "PRISM: 90 dispatchers / 5,426 actions / 2,495 engines"
  const slashPattern = /PRISM:\s*\d+\s*dispatchers\s*\/\s*[\d,]+\s*actions\s*\/\s*[\d,]+\s*engines/gi;
  content = content.replace(slashPattern, () => {
    changed = true;
    return `PRISM: ${counts.dispatchers} dispatchers / ${formatNumber(counts.actions)} actions / ${formatNumber(counts.engines)} engines`;
  });

  // Pattern 3: "2,495 engines | 499 formulas | 53 algorithms | 5,426 actions | 181 hooks"
  const pipePattern = /[\d,]+\s*engines?\s*\|\s*[\d,]+\s*formulas?\s*\|\s*\d+\s*algorithms?\s*\|\s*[\d,]+\s*actions?\s*\|\s*\d+\s*hooks?/gi;
  content = content.replace(pipePattern, () => {
    changed = true;
    return `${formatNumber(counts.engines)} engines | ${counts.formulas} formulas | ${counts.algorithms} algorithms | ${formatNumber(counts.actions)} actions | ${counts.hooks} hooks`;
  });

  // Pattern 4: "- 90 dispatchers, 5658 actions, 2504 engine files" (MEMORY.md style)
  const memPattern = /-\s*\d+\s*dispatchers,\s*[\d,]+\s*actions,\s*[\d,]+\s*engine\s*files?/gi;
  content = content.replace(memPattern, () => {
    changed = true;
    return `- ${counts.dispatchers} dispatchers, ${counts.actions} actions, ${counts.engines} engine files`;
  });

  // Pattern 5: "Formulas: 499 | Algorithms: 53 | Hooks: 181 | Skills: 134"
  const statsPattern = /Formulas:\s*\d+\s*\|\s*Algorithms:\s*\d+\s*\|\s*Hooks:\s*\d+\s*\|\s*Skills:\s*\d+/gi;
  content = content.replace(statsPattern, () => {
    changed = true;
    return `Formulas: ${counts.formulas} | Algorithms: ${counts.algorithms} | Hooks: ${counts.hooks} | Skills: ${counts.skills}`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    if (!QUIET) console.log(`  updated: ${filePath}`);
    return true;
  } else {
    if (!QUIET) console.log(`  no changes: ${filePath}`);
    return false;
  }
}

function main() {
  const counts = loadBaseline();
  if (!QUIET) {
    console.log("Syncing awareness counts:");
    console.log(`  dispatchers: ${counts.dispatchers}`);
    console.log(`  actions: ${counts.actions}`);
    console.log(`  engines: ${counts.engines}`);
    console.log(`  hooks: ${counts.hooks}`);
    console.log(`  skills: ${counts.skills}`);
    console.log("");
  }

  let updated = 0;
  for (const target of TARGETS) {
    if (updateFile(target, counts)) updated++;
  }

  if (!QUIET) {
    console.log(`\nSync complete: ${updated}/${TARGETS.length} files updated`);
  }
}

main();
