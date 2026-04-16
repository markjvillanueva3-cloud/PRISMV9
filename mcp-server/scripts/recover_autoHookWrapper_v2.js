/**
 * recover_autoHookWrapper.js
 * 
 * Proper recovery of autoHookWrapper.ts from bundle extraction.
 * 
 * Input: autoHookWrapper.recovered.js (1820 lines, extracted from dist/index.js)
 * Input: autoHookWrapper.NEW.ts (69 lines, proper TS imports)
 * Output: autoHookWrapper.RECOVERED.ts (proper TypeScript with imports + exports)
 * 
 * This script:
 * 1. Takes the imports from .NEW.ts (lines 1-69)
 * 2. Takes function bodies from .recovered.js (skipping the bundle import preamble)
 * 3. Replaces bundle-renamed variables (fs21→fs, path24→path, etc.)
 * 4. Adds 'export' to required symbols
 * 5. Adds registerAutoHookTools stub
 * 6. Writes the combined result
 * 
 * DOES NOT modify any existing file — writes to a NEW file only.
 */
const fs = require('fs');
const path = require('path');

const BASE = 'C:\\PRISM\\mcp-server\\src\\tools';
const recoveredPath = path.join(BASE, 'autoHookWrapper.recovered.js');
const newTsPath = path.join(BASE, 'autoHookWrapper.NEW.ts');
const outputPath = path.join(BASE, 'autoHookWrapper.RECOVERED.ts');

// Read inputs
const recovered = fs.readFileSync(recoveredPath, 'utf-8');
const newTs = fs.readFileSync(newTsPath, 'utf-8');

// --- Step 1: Get the imports section from .NEW.ts ---
const importLines = newTs.split('\n');
console.log(`[1/6] Import section: ${importLines.length} lines`);

// --- Step 2: Find where real code starts in recovered.js ---
// Skip the bundle preamble (first line is "// src/tools/autoHookWrapper.ts")
// Skip bundle variable aliases (var fs21, var path24, etc.) until we hit AUTO_HOOK_CONFIG
const recoveredLines = recovered.split('\n');
let codeStartLine = 0;
for (let i = 0; i < recoveredLines.length; i++) {
  if (recoveredLines[i].startsWith('var AUTO_HOOK_CONFIG')) {
    codeStartLine = i;
    break;
  }
}
console.log(`[2/6] Code starts at recovered line ${codeStartLine} (skipping ${codeStartLine} bundle preamble lines)`);

// --- Step 3: Extract function bodies ---
const functionBody = recoveredLines.slice(codeStartLine);
console.log(`[3/6] Function body: ${functionBody.length} lines`);

// --- Step 4: Replace bundle-renamed variables ---
let bodyText = functionBody.join('\n');

// Map of bundle renames → proper names
const replacements = [
  // File system
  [/\bfs21\b/g, 'fs'],
  [/\bpath24\b/g, 'path'],
  // Child process
  [/\bimport_child_process2\b/g, 'child_process_import'],
  // Note: execSync is imported directly, so we handle it differently
  // The bundle uses (0, import_child_process2.execSync) → just execSync
  [/\(0,\s*child_process_import\.execSync\)/g, 'execSync'],
  [/\(0,\s*import_child_process2\.execSync\)/g, 'execSync'],
  // Remove __toESM wrappers
  // var X = __toESM(require("...")); → already handled by imports
  // Clean up any remaining esbuild artifacts
  [/void 0/g, 'undefined'],
  [/1e3/g, '1000'],
];

let replacementCount = 0;
for (const [pattern, replacement] of replacements) {
  const before = bodyText;
  bodyText = bodyText.replace(pattern, replacement);
  if (before !== bodyText) {
    const count = (before.match(pattern) || []).length;
    replacementCount += count;
    console.log(`  Replaced ${pattern.source || pattern}: ${count} occurrences`);
  }
}
console.log(`[4/6] Applied ${replacementCount} replacements`);

// --- Step 5: Add export to required symbols ---
const requiredExports = [
  'AUTO_HOOK_CONFIG',
  'getHookHistory',
  'getDispatchCount',
  'resetReconFlag',
  'wrapToolWithAutoHooks',
  'wrapWithUniversalHooks'
];

let exportCount = 0;
for (const name of requiredExports) {
  // var NAME → export var NAME (only at line start)
  const varPattern = new RegExp(`^var ${name}\\b`, 'm');
  const funcPattern = new RegExp(`^function ${name}\\b`, 'm');
  const asyncPattern = new RegExp(`^async function ${name}\\b`, 'm');
  
  if (varPattern.test(bodyText)) {
    bodyText = bodyText.replace(varPattern, `export var ${name}`);
    exportCount++;
    console.log(`  Exported: var ${name}`);
  } else if (asyncPattern.test(bodyText)) {
    bodyText = bodyText.replace(asyncPattern, `export async function ${name}`);
    exportCount++;
    console.log(`  Exported: async function ${name}`);
  } else if (funcPattern.test(bodyText)) {
    bodyText = bodyText.replace(funcPattern, `export function ${name}`);
    exportCount++;
    console.log(`  Exported: function ${name}`);
  } else {
    console.log(`  WARNING: ${name} not found as var/function declaration!`);
  }
}
console.log(`[5/6] Added ${exportCount}/${requiredExports.length} exports`);

// --- Step 6: Add registerAutoHookTools stub ---
const stub = `
// registerAutoHookTools: stub — imported by index.ts but was never
// defined (tree-shook away in original build). Providing no-op.
export function registerAutoHookTools(server: any): void {
  // No-op: tool registration handled elsewhere
}
`;

// --- Combine everything ---
const finalContent = importLines.join('\n') + '\n\n' + bodyText + '\n' + stub;
const finalLines = finalContent.split('\n').length;

fs.writeFileSync(outputPath, finalContent, 'utf-8');
console.log(`[6/6] Wrote ${outputPath}`);
console.log(`  Total lines: ${finalLines}`);
console.log(`  Total size: ${Buffer.byteLength(finalContent)} bytes`);

// --- Verification ---
console.log('\n=== VERIFICATION ===');
const allExportsNeeded = [...requiredExports, 'registerAutoHookTools'];
for (const name of allExportsNeeded) {
  const found = finalContent.includes(`export var ${name}`) || 
                finalContent.includes(`export function ${name}`) ||
                finalContent.includes(`export async function ${name}`);
  console.log(`  ${found ? '✅' : '❌'} export ${name}`);
}

// Check for remaining bundle artifacts
const artifacts = ['fs21', 'path24', '__toESM', '__toCommonJS', 'init_'];
for (const art of artifacts) {
  const found = finalContent.includes(art);
  console.log(`  ${found ? '⚠️  REMAINING' : '✅ Clean'}: ${art}`);
}
