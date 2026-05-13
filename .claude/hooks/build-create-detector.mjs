#!/usr/bin/env node
// tier: T1
/**
 * build-create-detector.mjs — PreToolUse hook (U-AWARE01)
 *
 * Detects when user intends to build/create/implement something.
 * Triggers mandatory self-awareness checks before proceeding.
 *
 * POLICY: ALL internal build/audit/investigate requests MUST check:
 *   - BASELINE_INVENTORY.json
 *   - MASTER_INDEX_COMPACT.md
 *   - PRISMSelfAwarenessEngine
 *   - DuplicationGuardEngine
 */

import * as fs from 'fs';
import * as path from 'path';

const ENGINES_DIR = 'H:/prism/mcp-server/src/engines';
const ALGORITHMS_DIR = 'H:/prism/mcp-server/src/algorithms';
const HOOKS_DIR = 'H:/prism/.claude/hooks';
const SKILLS_DIR = 'H:/.claude/commands';

const CREATE_PATHS = [
  '/engines/',
  '/algorithms/',
  '/hooks/',
  '/commands/',
  '/registries/',
  '/dispatchers/'
];

function isCreateOperation(tool, input) {
  if (tool !== 'Write') return false;

  const filePath = input?.file_path || '';
  return CREATE_PATHS.some(p => filePath.includes(p));
}

function getAssetType(filePath) {
  if (filePath.includes('/engines/')) return 'engine';
  if (filePath.includes('/algorithms/')) return 'algorithm';
  if (filePath.includes('/hooks/')) return 'hook';
  if (filePath.includes('/commands/')) return 'skill';
  if (filePath.includes('/registries/')) return 'registry';
  if (filePath.includes('/dispatchers/')) return 'dispatcher';
  return 'unknown';
}

function getAssetName(filePath) {
  return path.basename(filePath).replace(/\.(ts|js|mjs|md)$/, '');
}

async function readInventory() {
  try {
    const inv = JSON.parse(fs.readFileSync(
      'H:/prism/mcp-server/data/state/BASELINE_INVENTORY.json',
      'utf8'
    ));
    return {
      engines: inv.engines || 0,
      dispatchers: inv.dispatchers || 0,
      actions: inv.actions || 0,
      algorithms: inv.algorithms || 0,
      hooks: inv.hooks_registry || 0,
      skills: inv.skills || 0
    };
  } catch {
    return null;
  }
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
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const { tool, input: toolInput } = input;

  if (!isCreateOperation(tool, toolInput)) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const filePath = toolInput?.file_path || '';
  const assetType = getAssetType(filePath);
  const assetName = getAssetName(filePath);
  const inventory = await readInventory();

  // Check if file already exists (would be overwrite, not create)
  if (fs.existsSync(filePath)) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  // This is a NEW asset creation - inject mandatory context
  const inventoryLine = inventory
    ? `Current: ${inventory.engines} engines, ${inventory.algorithms} algorithms, ${inventory.hooks} hooks, ${inventory.skills} skills`
    : 'Inventory unavailable';

  const context = `
## MANDATORY SELF-AWARENESS CHECK (AWARE-MS0)

Creating new ${assetType}: **${assetName}**

${inventoryLine}

**BEFORE PROCEEDING, YOU MUST:**
1. Search MASTER_INDEX_COMPACT.md for "${assetName}" or similar
2. Call DuplicationGuardEngine.mustCheckBeforeCreating("${assetType}", "${assetName}", "...")
3. Check PRISMSelfAwarenessEngine.searchAIFeatures("${assetName.replace(/Engine$/, '')}")

If a similar asset exists, USE IT instead of creating a duplicate.
`;

  console.log(JSON.stringify({
    decision: 'approve',
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: context,
      }
    }));
}

main().catch(() => {
  console.log(JSON.stringify({ decision: 'approve' }));
});
