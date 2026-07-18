/**
 * Postbuild fix: esbuild banner injects `import { createRequire } from 'module'` at line 1.
 * Some bundled dependencies also import createRequire, causing a duplicate declaration error
 * on Node 24+. This script renames the duplicates.
 */
const fs = require('fs');
const DIST = 'dist/index.js';

if (!fs.existsSync(DIST)) {
  console.log('postbuild: dist/index.js not found, skipping');
  process.exit(0);
}

let src = fs.readFileSync(DIST, 'utf8');
const firstLine = src.split('\n')[0];

// Only fix if the banner has createRequire
if (!firstLine.includes('createRequire')) {
  console.log('postbuild: no banner createRequire, skipping');
  process.exit(0);
}

let fixes = 0;

// Find all `import { createRequire } from "module"` AFTER line 1 and rename them
// Match: import { createRequire } from "module"  OR  import { createRequire } from 'module'
const pattern = /import\s*\{\s*createRequire\s*\}\s*from\s*["']module["']/g;
let match;
let firstMatch = true;

while ((match = pattern.exec(src)) !== null) {
  if (firstMatch) {
    // Skip the first one (banner)
    firstMatch = false;
    continue;
  }
  // Replace with dynamic import to avoid duplicate declaration
  const replacement = 'const createRequire$dup = globalThis.__createRequire || createRequire';
  src = src.slice(0, match.index) + replacement + src.slice(match.index + match[0].length);
  fixes++;
}

if (fixes > 0) {
  fs.writeFileSync(DIST, src);
  console.log(`postbuild: fixed ${fixes} duplicate createRequire import(s)`);
} else {
  console.log('postbuild: no duplicate createRequire found');
}
