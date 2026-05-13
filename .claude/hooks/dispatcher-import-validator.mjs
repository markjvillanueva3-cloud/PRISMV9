#!/usr/bin/env node
// tier: T3
/**
 * dispatcher-import-validator.mjs — PostToolUse hook
 *
 * Validates that all engine imports in dispatcher files actually exist.
 * Catches the bug where dispatcher references non-existent engines.
 *
 * Fires on: Edit to *Dispatcher.ts files
 */

import * as fs from 'fs';
import * as path from 'path';

const ENGINES_DIR = 'H:/prism/mcp-server/src/engines';

function extractImports(content) {
  const imports = [];
  // Match: await import("../../engines/EngineName.js")
  const importPattern = /await\s+import\s*\(\s*["']([^"']+engines\/[^"']+)["']\s*\)/g;
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    const importPath = match[1];
    // Extract engine name from path like ../../engines/TokenEconomyEngine.js
    const engineMatch = importPath.match(/engines\/([^./]+)\.js/);
    if (engineMatch) {
      imports.push({
        raw: importPath,
        engineName: engineMatch[1],
        fullMatch: match[0]
      });
    }
  }
  return imports;
}

function engineExists(engineName) {
  const tsPath = path.join(ENGINES_DIR, `${engineName}.ts`);
  const jsPath = path.join(ENGINES_DIR, `${engineName}.js`);
  return fs.existsSync(tsPath) || fs.existsSync(jsPath);
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
    return;
  }

  const { tool, tool_result, input: toolInput } = input;

  // Only check Edit operations on dispatcher files
  if (tool !== 'Edit') return;

  const filePath = toolInput?.file_path || '';
  if (!filePath.includes('Dispatcher.ts')) return;

  // Read the file content after edit
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  const imports = extractImports(content);
  const missingEngines = [];

  for (const imp of imports) {
    if (!engineExists(imp.engineName)) {
      missingEngines.push(imp.engineName);
    }
  }

  if (missingEngines.length > 0) {
    const warning = `
╔══════════════════════════════════════════════════════════════╗
║     ⚠️  DISPATCHER IMPORT VALIDATION FAILED                  ║
╠══════════════════════════════════════════════════════════════╣
║ The following engine imports do NOT exist:
║
${missingEngines.map(e => `║   ✗ ${e}`).join('\n')}
║
║ These will cause runtime errors when the dispatcher is called.
║
║ ACTION REQUIRED:
║   1. Create the missing engine(s), OR
║   2. Fix the import to use an existing engine
║
║ Use /dedup to check if a similar engine already exists.
╚══════════════════════════════════════════════════════════════╝
`;
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: warning } }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
