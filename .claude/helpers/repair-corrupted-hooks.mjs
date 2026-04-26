#!/usr/bin/env node
/**
 * repair-corrupted-hooks.mjs — Fix corrupted function definitions
 *
 * The .catch() fix was incorrectly applied to function DEFINITIONS instead of CALLS:
 *   WRONG:  async function main().catch(() => {...}) {
 *   RIGHT:  async function main() { ... }
 *           main().catch(() => {...});
 *
 * This script repairs all affected files.
 */
import fs from "node:fs";
import path from "node:path";

const DIRS = [
  "H:/prism/.claude/hooks",
  "H:/prism/.claude/helpers",
];

const CORRUPTED_PATTERN = /async\s+function\s+main\(\)\.catch\(\(\)\s*=>\s*\{\s*process\.stdout\.write\(JSON\.stringify\(\{\s*continue:\s*true\s*\}\)\);\s*\}\)\s*\{/g;

const FIXED_DEF = "async function main() {";

let totalFixed = 0;
let totalScanned = 0;
const fixedFiles = [];

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  if (!CORRUPTED_PATTERN.test(content)) {
    return false;
  }

  // Reset regex state
  CORRUPTED_PATTERN.lastIndex = 0;

  const fixed = content.replace(CORRUPTED_PATTERN, FIXED_DEF);

  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed);
    return true;
  }

  return false;
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) {
      // Recurse into lib subdirectory
      if (file.name === "lib") {
        processDirectory(path.join(dir, file.name));
      }
      continue;
    }

    if (!file.name.endsWith(".mjs") && !file.name.endsWith(".js")) continue;
    if (file.name.includes(".disabled")) continue;

    const filePath = path.join(dir, file.name);
    totalScanned++;

    try {
      if (fixFile(filePath)) {
        totalFixed++;
        fixedFiles.push(file.name);
      }
    } catch (err) {
      console.error(`Error fixing ${file.name}: ${err.message}`);
    }
  }
}

console.log("=== Repairing Corrupted Hook Function Definitions ===\n");

for (const dir of DIRS) {
  processDirectory(dir);
}

console.log(`Scanned: ${totalScanned} files`);
console.log(`Fixed: ${totalFixed} files\n`);

if (fixedFiles.length > 0) {
  console.log("Fixed files:");
  for (const f of fixedFiles) {
    console.log(`  ✓ ${f}`);
  }
}
