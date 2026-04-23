#!/usr/bin/env node
/**
 * dedup-auto-invoke.mjs — PreToolUse hook (U-AWARE05)
 *
 * Automatically runs duplication check logic when creating new assets.
 * Silent check - injects warning context if duplicates found.
 */

import * as fs from 'fs';
import * as path from 'path';

const REGISTRY_PATH = 'H:/prism/mcp-server/data/state/cross-session-asset-registry.json';
const ENGINES_INDEX = 'H:/prism/mcp-server/src/engines/index.ts';

const CREATE_PATHS = ['/engines/', '/algorithms/', '/hooks/'];

function isCreateOperation(tool, input) {
  if (tool !== 'Write') return false;
  const filePath = input?.file_path || '';
  return CREATE_PATHS.some(p => filePath.includes(p));
}

function getAssetInfo(filePath) {
  const basename = path.basename(filePath).replace(/\.(ts|js|mjs)$/, '');
  let type = 'unknown';
  if (filePath.includes('/engines/')) type = 'engine';
  if (filePath.includes('/algorithms/')) type = 'algorithm';
  if (filePath.includes('/hooks/')) type = 'hook';
  return { name: basename, type };
}

function normalizeForSearch(name) {
  return name
    .replace(/Engine$/, '')
    .replace(/Algorithm$/, '')
    .replace(/Hook$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function searchRegistry(assetName) {
  try {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    const normalized = normalizeForSearch(assetName);

    const matches = [];
    for (const asset of (registry.assets || [])) {
      const assetNorm = normalizeForSearch(asset.name || '');
      if (assetNorm.includes(normalized) || normalized.includes(assetNorm)) {
        matches.push(asset.name);
      }
    }
    return matches.slice(0, 3);
  } catch {
    return [];
  }
}

function searchEnginesIndex(assetName) {
  try {
    const index = fs.readFileSync(ENGINES_INDEX, 'utf8');
    const normalized = normalizeForSearch(assetName);
    const matches = [];

    const exportMatches = index.match(/export\s*{\s*(\w+)\s*}/g) || [];
    for (const exp of exportMatches) {
      const name = exp.match(/export\s*{\s*(\w+)\s*}/)?.[1];
      if (name && normalizeForSearch(name).includes(normalized)) {
        matches.push(name);
      }
    }

    // Also check direct class exports
    const classMatches = index.match(/(\w+Engine)/g) || [];
    for (const cls of classMatches) {
      if (normalizeForSearch(cls).includes(normalized) && !matches.includes(cls)) {
        matches.push(cls);
      }
    }

    return [...new Set(matches)].slice(0, 5);
  } catch {
    return [];
  }
}

async function main() {
  let input;
  try {
    input = JSON.parse(await fs.promises.readFile('/dev/stdin', 'utf8'));
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

  // Skip if editing existing file
  if (fs.existsSync(filePath)) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const { name, type } = getAssetInfo(filePath);

  const registryMatches = searchRegistry(name);
  const indexMatches = searchEnginesIndex(name);
  const allMatches = [...new Set([...registryMatches, ...indexMatches])];

  if (allMatches.length === 0) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const warning = `
## POTENTIAL DUPLICATES DETECTED (AWARE-MS0 Auto-Dedup)

Creating: **${name}** (${type})

Similar existing assets found:
${allMatches.map(m => `  - ${m}`).join('\n')}

**STOP:** Verify this is not a duplicate. If >50% overlap, use existing asset.
`;

  console.log(JSON.stringify({
    decision: 'approve',
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: warning,
      }
    }));
}

main().catch(() => {
  console.log(JSON.stringify({ decision: 'approve' }));
});
