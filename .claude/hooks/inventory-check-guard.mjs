#!/usr/bin/env node
/**
 * inventory-check-guard.mjs — UserPromptSubmit hook (U-AWARE02)
 *
 * Detects build/create/audit intent in user messages and injects
 * current PRISM inventory counts as mandatory context.
 *
 * Triggers: "build", "create", "implement", "add engine", "new feature",
 *           "audit", "investigate", "analyze"
 */

import * as fs from 'fs';

const INVENTORY_PATH = 'H:/prism/mcp-server/data/state/BASELINE_INVENTORY.json';

const BUILD_PATTERNS = [
  /\b(build|create|implement|add|write|make|develop)\b.*\b(engine|algorithm|hook|skill|dispatcher|feature|system)\b/i,
  /\bnew\s+(engine|algorithm|hook|skill|dispatcher|feature)\b/i,
  /\b(audit|investigate|analyze|review|check)\b.*\b(code|system|engine|architecture)\b/i,
  /\/forge/i,
  /\/dedup/i
];

function detectsBuildIntent(message) {
  if (!message) return false;
  return BUILD_PATTERNS.some(p => p.test(message));
}

function readInventory() {
  try {
    return JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function formatCompactInventory(inv) {
  if (!inv) return 'Inventory unavailable';

  return `PRISM: ${inv.engines || 0} engines | ${inv.dispatchers || 0} dispatchers | ${inv.actions || 0} actions | ${inv.algorithms || 0} algorithms | ${inv.hooks_registry || 0} hooks | ${inv.skills || 0} skills | ${inv.tests_passing || 0} tests`;
}

async function main() {
  let input;
  try {
    const _raw = readStdinSafe();
    if (!_raw) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    input = JSON.parse(_raw);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const message = input?.message?.content || input?.message || '';

  if (!detectsBuildIntent(message)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const inventory = readInventory();
  const compact = formatCompactInventory(inventory);

  console.log(JSON.stringify({ continue: true, systemMessage: `**[Inventory]** ${compact}\nCheck MASTER_INDEX_COMPACT.md + DuplicationGuardEngine before creating.` }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
