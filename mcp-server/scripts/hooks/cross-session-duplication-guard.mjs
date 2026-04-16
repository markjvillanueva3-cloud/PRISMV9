#!/usr/bin/env node
/**
 * Cross-Session Duplication Guard Hook
 * =====================================
 * Fires on session start to load and display recently created assets
 * from OTHER Claude sessions. Prevents duplicate builds across sessions.
 *
 * Reads: data/state/cross-session-asset-registry.json
 * Output: JSON with hookSpecificOutput containing recent assets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, '../../data/state/cross-session-asset-registry.json');

// Look back 72 hours for cross-session assets
const HOURS_BACK = 72;

function getRecentAssets() {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) {
      return [];
    }

    const content = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    const cutoff = Date.now() - HOURS_BACK * 60 * 60 * 1000;

    return (content.entries || []).filter(e =>
      new Date(e.createdAt).getTime() > cutoff
    );
  } catch {
    return [];
  }
}

function formatAwareness(assets) {
  if (assets.length === 0) {
    return `
## Cross-Session Duplication Guard: ACTIVE
No assets created in the last ${HOURS_BACK}h across sessions.
BEFORE creating ANY new engine/algorithm/formula:
\`\`\`typescript
const check = await duplicationGuardEngine.checkBeforeCreating('engine', 'Name', 'desc');
if (!check.shouldProceed) { /* USE existing: check.alternatives[0] */ }
\`\`\`
`;
  }

  // Group by type
  const byType = {};
  for (const entry of assets) {
    if (!byType[entry.type]) byType[entry.type] = [];
    byType[entry.type].push(entry);
  }

  const lines = [
    `## CROSS-SESSION ASSETS (last ${HOURS_BACK}h) — DO NOT DUPLICATE`,
    '',
  ];

  for (const [type, entries] of Object.entries(byType)) {
    lines.push(`### ${type.toUpperCase()}S (${entries.length})`);
    for (const e of entries.slice(0, 15)) {
      const shortDesc = e.description?.slice(0, 50) || 'No description';
      const session = e.createdBy?.slice(0, 20) || 'unknown';
      lines.push(`- **${e.name}**: ${shortDesc}${e.description?.length > 50 ? '...' : ''} [${session}]`);
    }
    if (entries.length > 15) {
      lines.push(`  ... and ${entries.length - 15} more`);
    }
    lines.push('');
  }

  lines.push('### MANDATORY CHECK BEFORE CREATING:');
  lines.push('```typescript');
  lines.push("const check = await duplicationGuardEngine.checkBeforeCreating('engine', 'Name', 'desc');");
  lines.push("if (check.isDuplicate || check.similarity > 0.7) {");
  lines.push("  // USE existing asset instead: check.alternatives[0]");
  lines.push("}");
  lines.push('```');
  lines.push('');
  lines.push('After creating a new asset, REGISTER it:');
  lines.push('```typescript');
  lines.push("await duplicationGuardEngine.registerNewAsset('engine', 'MyEngine', 'src/...', 'description');");
  lines.push('```');

  return lines.join('\n');
}

// Main
const recentAssets = getRecentAssets();
const awareness = formatAwareness(recentAssets);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: awareness
  }
}));
