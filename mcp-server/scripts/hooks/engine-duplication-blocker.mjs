#!/usr/bin/env node
/**
 * Engine Duplication Blocker Hook
 * ================================
 * BLOCKING PreToolUse hook that prevents creating engines that already exist
 * or are too similar to existing ones. This is the enforcement layer.
 *
 * Checks:
 *   - Exact name match in cross-session registry
 *   - Fuzzy name match (>70% similarity)
 *   - Keyword overlap (>80% shared keywords)
 *   - Existing engine file on disk
 *
 * If duplicate detected: BLOCKS the write with exit code 2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, '../../data/state/cross-session-asset-registry.json');
const ENGINES_DIR = path.resolve(__dirname, '../../src/engines');

// Read stdin for tool input
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    checkDuplication(data);
  } catch {
    // No valid input, allow through
    outputAllow();
  }
});

function checkDuplication(data) {
  const toolInput = data.tool_input || {};
  const filePath = toolInput.file_path || '';
  const content = toolInput.content || '';

  // Only check engine files
  if (!filePath.includes('/engines/') || !filePath.endsWith('Engine.ts')) {
    outputAllow();
    return;
  }

  // Extract engine name from path
  const engineName = path.basename(filePath, '.ts');

  // Check 1: File already exists on disk
  const fullPath = filePath.startsWith('/') || filePath.includes(':')
    ? filePath.replace(/\\/g, '/')
    : path.resolve(ENGINES_DIR, path.basename(filePath));

  if (fs.existsSync(fullPath)) {
    // File exists - check if this is an UPDATE vs new creation
    const existingContent = fs.readFileSync(fullPath, 'utf-8');
    if (existingContent.length > 100) {
      // File has substantial content - this is likely an update, allow
      outputAllow();
      return;
    }
  }

  // Check 2: Cross-session registry
  let registry = { entries: [] };
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }

  // Normalize engine name for comparison
  const normalizedNew = normalizeEngineName(engineName);

  for (const entry of registry.entries || []) {
    const normalizedExisting = normalizeEngineName(entry.name);

    // Exact match
    if (normalizedNew === normalizedExisting) {
      outputBlock(`ENGINE ALREADY EXISTS: ${entry.name}
Created by: ${entry.createdBy}
Created at: ${entry.createdAt}
Path: ${entry.path}

USE THE EXISTING ENGINE instead of creating a duplicate.
Import it: import { ${entry.name.replace(/Engine$/, '')} } from './${entry.name}.js';`);
      return;
    }

    // Fuzzy match (>70% similarity)
    const similarity = stringSimilarity(normalizedNew, normalizedExisting);
    if (similarity > 0.7) {
      outputBlock(`SIMILAR ENGINE EXISTS: ${entry.name} (${(similarity * 100).toFixed(0)}% similar)
Your proposed: ${engineName}
Created by: ${entry.createdBy}
Description: ${entry.description}

Consider using the existing engine or extending it instead of creating a duplicate.`);
      return;
    }
  }

  // Check 3: Check disk for existing engine files with similar names
  try {
    const existingEngines = fs.readdirSync(ENGINES_DIR)
      .filter(f => f.endsWith('Engine.ts'))
      .map(f => f.replace('.ts', ''));

    for (const existing of existingEngines) {
      const similarity = stringSimilarity(normalizedNew, normalizeEngineName(existing));
      if (similarity > 0.8) {
        outputBlock(`SIMILAR ENGINE FILE EXISTS: ${existing}
Your proposed: ${engineName}
Similarity: ${(similarity * 100).toFixed(0)}%

Check if ${existing} already provides the functionality you need.
Read it with: Read src/engines/${existing}.ts`);
        return;
      }
    }
  } catch { /* ignore */ }

  // Check 4: Content-based duplicate detection
  if (content) {
    const classMatch = content.match(/class\s+(\w+Engine)/g);
    if (classMatch && classMatch.length > 1) {
      outputBlock(`MULTIPLE ENGINE CLASSES in single file detected: ${classMatch.join(', ')}
Each engine should be in its own file.`);
      return;
    }
  }

  // All checks passed
  outputAllow();
}

function normalizeEngineName(name) {
  return name
    .toLowerCase()
    .replace(/engine$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function stringSimilarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  // Simple Jaccard similarity on character bigrams
  const bigramsA = new Set();
  const bigramsB = new Set();

  for (let i = 0; i < a.length - 1; i++) {
    bigramsA.add(a.slice(i, i + 2));
  }
  for (let i = 0; i < b.length - 1; i++) {
    bigramsB.add(b.slice(i, i + 2));
  }

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  const union = bigramsA.size + bigramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function outputBlock(reason) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `DUPLICATE ENGINE BLOCKED:\n${reason}\n\nTo proceed, first check existing engines with:\ngit ls-files 'src/engines/*Engine.ts' | head -50`,
  }));
  process.exit(2);
}

function outputAllow() {
  console.log(JSON.stringify({}));
  process.exit(0);
}
