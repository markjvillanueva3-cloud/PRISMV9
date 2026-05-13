#!/usr/bin/env node
// tier: T0
/**
 * duplication-hard-block.mjs — PreToolUse hook (U-AWARE07)
 *
 * HARD BLOCK if attempting to create an asset that:
 * 1. EXACTLY matches an existing engine name in the engines index
 * 2. EXISTS in the cross-session asset registry (built by another chat)
 *
 * This is the final gate - blocks Write operations that would create duplicates.
 */

import * as fs from 'fs';
import * as path from 'path';

const ENGINES_INDEX = 'H:/prism/mcp-server/src/engines/index.ts';
const REGISTRY_PATH = 'H:/prism/mcp-server/data/state/cross-session-asset-registry.json';
const CREATE_PATHS = ['/engines/', '/hooks/', '/.claude/commands/'];

function isAssetCreate(tool, input) {
  if (tool !== 'Write') return false;
  const filePath = input?.file_path || '';
  return CREATE_PATHS.some(p => filePath.includes(p)) &&
         (filePath.endsWith('.ts') || filePath.endsWith('.mjs') || filePath.endsWith('.md'));
}

function getAssetInfo(filePath) {
  const name = path.basename(filePath).replace(/\.(ts|mjs|js|md)$/, '');

  if (filePath.includes('/engines/')) {
    return { type: 'engine', name };
  } else if (filePath.includes('/hooks/') || filePath.includes('/.claude/hooks/')) {
    return { type: 'hook', name };
  } else if (filePath.includes('/.claude/commands/')) {
    return { type: 'skill', name };
  }
  return { type: 'unknown', name };
}

function engineExistsInIndex(engineName) {
  try {
    const index = fs.readFileSync(ENGINES_INDEX, 'utf8');
    const exportPattern = new RegExp(`export\\s*{\\s*${engineName}\\s*}`, 'i');
    if (exportPattern.test(index)) return true;
    const reexportPattern = new RegExp(`from\\s*["']\\.\\.?\\/${engineName}["']`, 'i');
    if (reexportPattern.test(index)) return true;
    const directPattern = new RegExp(`\\b${engineName}\\b`);
    if (directPattern.test(index)) return true;
    return false;
  } catch {
    return false;
  }
}

function existsInRegistry(assetType, assetName) {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) return false;
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    const typeMap = {
      engine: 'engines',
      hook: 'hooks',
      skill: 'skills'
    };
    const collection = registry.assets?.[typeMap[assetType]] || {};
    return assetName in collection;
  } catch {
    return false;
  }
}

function getRegistryEntry(assetType, assetName) {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) return null;
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    const typeMap = { engine: 'engines', hook: 'hooks', skill: 'skills' };
    return registry.assets?.[typeMap[assetType]]?.[assetName] || null;
  } catch {
    return null;
  }
}

function engineFileExists(engineName) {
  const enginePath = path.join('H:/prism/mcp-server/src/engines', `${engineName}.ts`);
  return fs.existsSync(enginePath);
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

  if (!isAssetCreate(tool, toolInput)) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const filePath = toolInput?.file_path || '';
  const { type: assetType, name: assetName } = getAssetInfo(filePath);

  // If file already exists, this is an edit, not create - allow
  if (fs.existsSync(filePath)) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  // Check cross-session registry FIRST (catches builds from other chats)
  const registryEntry = getRegistryEntry(assetType, assetName);
  if (registryEntry) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `
╔══════════════════════════════════════════════════════════════╗
║       CROSS-SESSION DUPLICATION BLOCK                        ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: ${assetType} "${assetName}" already exists!
║                                                              ║
║ Built by: ${registryEntry.addedBy || 'another session'}
║ At: ${registryEntry.addedAt || 'unknown'}
║ Path: ${registryEntry.path || 'unknown'}
║                                                              ║
║ ACTION: Use the existing ${assetType} instead of creating a
║ duplicate. Check cross-session-asset-registry.json for details.
╚══════════════════════════════════════════════════════════════╝
`
    }));
    return;
  }

  // For engines, also check local index and file system
  if (assetType === 'engine') {
    const inIndex = engineExistsInIndex(assetName);
    const fileExists = engineFileExists(assetName);

    if (inIndex || fileExists) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `
╔══════════════════════════════════════════════════════════════╗
║           DUPLICATION HARD BLOCK (AWARE-MS0)                 ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Engine "${assetName}" already exists!
║                                                              ║
║ Location: mcp-server/src/engines/${assetName}.ts
║ In Index: ${inIndex ? 'YES' : 'NO'}
║ File Exists: ${fileExists ? 'YES' : 'NO'}
║                                                              ║
║ ACTION: Use the existing engine instead of creating a        ║
║ duplicate. Import it from the engines index.                 ║
╚══════════════════════════════════════════════════════════════╝
`
      }));
      return;
    }
  }

  console.log(JSON.stringify({ decision: 'approve' }));
}

main().catch(() => {
  console.log(JSON.stringify({ decision: 'approve' }));
});
