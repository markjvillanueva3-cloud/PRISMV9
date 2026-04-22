#!/usr/bin/env node
/**
 * Duplication Guard Hook — Blocks new engine creation without checking existing
 *
 * PreToolUse hook for Write/Edit operations on engine files.
 * Reads the cross-session registry and ENGINE_DIGEST.md to prevent duplicates.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const REGISTRY_PATH = 'H:/prism/mcp-server/data/state/cross-session-asset-registry.json';
const ENGINE_DIGEST_PATH = 'H:/prism/mcp-server/src/engines/ENGINE_DIGEST.md';
const ENGINES_DIR = 'H:/prism/mcp-server/src/engines';

// Parse environment for file path
const filePath = process.env.TOOL_INPUT_file_path || '';

// Only check engine file creations
if (!filePath.includes('/engines/') || !filePath.endsWith('Engine.ts')) {
  process.exit(0);
}

// Skip test files
if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
  process.exit(0);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return { entries: [] };
  }
}

async function loadEngineNames() {
  try {
    const files = await fs.readdir(ENGINES_DIR);
    return files.filter(f => f.endsWith('Engine.ts')).map(f => f.replace('.ts', ''));
  } catch {
    return [];
  }
}

function normalize(name) {
  return name.toLowerCase().replace(/engine$/i, '').replace(/[^a-z0-9]/g, '');
}

function findSimilar(proposedName, existingNames, threshold = 0.7) {
  const normalizedProposed = normalize(proposedName);
  const matches = [];

  for (const existing of existingNames) {
    const normalizedExisting = normalize(existing);

    // Exact match
    if (normalizedProposed === normalizedExisting) {
      matches.push({ name: existing, similarity: 1.0, reason: 'exact' });
      continue;
    }

    // Contains check
    if (normalizedProposed.includes(normalizedExisting) || normalizedExisting.includes(normalizedProposed)) {
      matches.push({ name: existing, similarity: 0.9, reason: 'contains' });
      continue;
    }

    // Levenshtein similarity
    const sim = similarity(normalizedProposed, normalizedExisting);
    if (sim >= threshold) {
      matches.push({ name: existing, similarity: sim, reason: 'similar' });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

async function main() {
  // Check if file already exists (editing vs creating)
  if (await exists(filePath)) {
    // Editing existing file — allow
    process.exit(0);
  }

  // New file creation — check for duplicates
  const proposedName = path.basename(filePath, '.ts');

  // Load existing engines
  const [registry, existingEngines] = await Promise.all([
    loadRegistry(),
    loadEngineNames()
  ]);

  // Combine registry entries with file system
  const registryNames = registry.entries
    .filter(e => e.type === 'engine')
    .map(e => e.name);

  const allNames = [...new Set([...existingEngines, ...registryNames])];

  // Check for duplicates
  const matches = findSimilar(proposedName, allNames);

  if (matches.length > 0 && matches[0].similarity >= 0.85) {
    const top = matches[0];
    const output = {
      decision: 'WARN',
      additionalContext: `DUPLICATION WARNING: "${proposedName}" is ${Math.round(top.similarity * 100)}% similar to existing "${top.name}". ` +
        `Before creating: 1) Check if ${top.name} already does what you need, 2) Extend it instead of duplicating, ` +
        `3) If truly different, rename to be more distinct. Other similar: ${matches.slice(1, 3).map(m => m.name).join(', ') || 'none'}`
    };
    console.log(JSON.stringify(output));
  }

  // Always allow — this is a warning, not a block
  process.exit(0);
}

main().catch(err => {
  console.error('DuplicationGuardHook error:', err.message);
  process.exit(0);  // Don't block on errors
});
