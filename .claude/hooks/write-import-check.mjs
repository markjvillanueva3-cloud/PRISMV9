#!/usr/bin/env node
// tier: T3
/**
 * write-import-check.mjs - PostToolUse Write
 * After creating a new file, verifies imports resolve.
 * Catches missing dependencies early.
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, resolve, join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input, tool_result } = input;

if (tool_name !== 'Write') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const filePath = tool_input?.file_path;
const content = tool_input?.content;

if (!filePath || !content) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Only check TypeScript/JavaScript files
if (!filePath.match(/\.(ts|tsx|js|jsx|mjs)$/)) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const issues = [];
const dir = dirname(resolve(filePath));

// Extract imports
const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
let match;

while ((match = importRegex.exec(content)) !== null) {
  const importPath = match[1];

  // Skip node_modules imports
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    continue;
  }

  // Resolve the import path
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.js', ''];
  let found = false;

  for (const ext of extensions) {
    const fullPath = resolve(dir, importPath + ext);
    if (existsSync(fullPath)) {
      found = true;
      break;
    }
    // Also check without .js extension for .ts files
    if (importPath.endsWith('.js')) {
      const tsPath = resolve(dir, importPath.replace(/\.js$/, '.ts'));
      if (existsSync(tsPath)) {
        found = true;
        break;
      }
    }
  }

  if (!found) {
    issues.push(`Import not found: ${importPath}`);
  }
}

// Check for common issues in new files
if (content.includes('export default') && content.includes('export {')) {
  // Check if default export is also in named exports (common mistake)
  const defaultMatch = content.match(/export default (\w+)/);
  if (defaultMatch) {
    const defaultName = defaultMatch[1];
    if (content.includes(`export { ${defaultName}`) || content.includes(`export {${defaultName}`)) {
      issues.push(`"${defaultName}" is both default and named export - may cause import confusion`);
    }
  }
}

if (issues.length > 0) {
  const message = [
    `📦 Import issues in new file:`,
    `  File: ${filePath}`,
    ...issues.map(i => `  • ${i}`),
    `  Tip: Run build to catch more issues.`,
  ].join('\n');

  console.log(JSON.stringify({ message }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
