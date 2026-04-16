#!/usr/bin/env node
/**
 * Agent Auto-Update Hook
 * ======================
 * Fires on PostToolUse for Write/Edit to auto-register new assets.
 * Ensures ALL agents across ALL sessions immediately know about new capabilities.
 *
 * Triggers on:
 * - New engine creation (src/engines/*Engine.ts)
 * - New algorithm creation (src/algorithms/*.ts)
 * - New dispatcher creation (src/tools/dispatchers/*Dispatcher.ts)
 * - New hook creation (src/hooks/*.ts)
 *
 * Updates:
 * - cross-session-asset-registry.json
 * - agent-update-log.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, '../../data/state/cross-session-asset-registry.json');
const UPDATE_LOG_PATH = path.resolve(__dirname, '../../data/state/agent-update-log.json');

// Read stdin for tool input
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    processFileChange(data);
  } catch {
    // No valid input, exit silently
    outputResult(null);
  }
});

function processFileChange(data) {
  const filePath = data.tool_input?.file_path || '';

  // Only process TypeScript files in tracked directories
  if (!filePath.endsWith('.ts')) {
    outputResult(null);
    return;
  }

  const relativePath = filePath.replace(/\\/g, '/');
  let assetType = null;
  let assetName = null;
  let description = null;

  // Detect asset type
  if (relativePath.includes('/engines/') && relativePath.endsWith('Engine.ts')) {
    assetType = 'engine';
    assetName = path.basename(filePath, '.ts');
    description = `New engine: ${assetName}`;
  } else if (relativePath.includes('/algorithms/')) {
    assetType = 'algorithm';
    assetName = path.basename(filePath, '.ts');
    description = `New algorithm: ${assetName}`;
  } else if (relativePath.includes('/dispatchers/') && relativePath.endsWith('Dispatcher.ts')) {
    assetType = 'dispatcher_action';
    assetName = path.basename(filePath, '.ts');
    description = `New dispatcher: ${assetName}`;
  } else if (relativePath.includes('/hooks/') && relativePath.endsWith('.ts')) {
    assetType = 'hook';
    assetName = path.basename(filePath, '.ts');
    description = `New hook: ${assetName}`;
  }

  if (!assetType) {
    outputResult(null);
    return;
  }

  // Check if already registered
  let registry = { schemaVersion: 1, lastUpdated: '', entries: [] };
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }

  const normalizedName = assetName.toLowerCase().replace(/engine$/i, '').replace(/[^a-z0-9]+/g, '-');
  const exists = registry.entries.some(e =>
    e.type === assetType &&
    e.name.toLowerCase().replace(/engine$/i, '').replace(/[^a-z0-9]+/g, '-') === normalizedName
  );

  if (exists) {
    outputResult(null);
    return;
  }

  // Add to registry
  const entry = {
    id: `${assetType}-${normalizedName}-${Date.now()}`,
    type: assetType,
    name: assetName,
    path: relativePath,
    description,
    createdAt: new Date().toISOString(),
    createdBy: 'agent-auto-update-hook'
  };

  registry.entries.push(entry);
  registry.lastUpdated = new Date().toISOString();

  // Ensure directory exists
  const stateDir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

  // Also log the update
  let updateLog = { lastUpdated: '', updates: [], knownFiles: [] };
  try {
    if (fs.existsSync(UPDATE_LOG_PATH)) {
      updateLog = JSON.parse(fs.readFileSync(UPDATE_LOG_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }

  updateLog.updates.push({
    type: `${assetType}_created`,
    timestamp: new Date().toISOString(),
    asset_name: assetName,
    asset_path: relativePath,
    description,
    detected_by: 'hook',
    propagated_to: ['CrossSessionRegistry', 'AgentAutoUpdateEngine']
  });
  updateLog.lastUpdated = new Date().toISOString();

  // Keep last 100 updates
  if (updateLog.updates.length > 100) {
    updateLog.updates = updateLog.updates.slice(-100);
  }

  fs.writeFileSync(UPDATE_LOG_PATH, JSON.stringify(updateLog, null, 2));

  // Output success message
  outputResult({
    message: `Auto-registered: ${assetName} (${assetType})`,
    registered: true,
    assetName,
    assetType
  });
}

function outputResult(result) {
  if (result) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[AgentAutoUpdate] ${result.message}\nAll agents across ALL sessions now know about this capability.`
      }
    }));
  } else {
    // No output needed
    console.log(JSON.stringify({}));
  }
}
