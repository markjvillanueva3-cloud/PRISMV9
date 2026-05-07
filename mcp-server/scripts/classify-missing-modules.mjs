#!/usr/bin/env node
/**
 * Classify missing modules from tsc output into:
 *   RENAMED_CASE   - basename exists with different case
 *   MOVED          - basename exists under different directory
 *   TRULY_MISSING  - no file anywhere under src/
 *
 * Reads /tmp/missing-modules.txt (one "Cannot find module 'X'" per line),
 * walks src/ for actual .ts/.json files, emits JSON + compact text reports.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const MCP_ROOT = 'H:/prism/mcp-server';
const MISSING_FILE = 'H:/prism/.cache/temp/missing-modules.txt';
const REPORT_JSON = 'H:/prism/.cache/temp/missing-modules-classified.json';
const REPORT_TXT = 'H:/prism/.cache/temp/missing-modules-classified.txt';

const missingRaw = readFileSync(MISSING_FILE, 'utf8')
  .split(/\r?\n/)
  .map(l => {
    const m = l.match(/Cannot find module '([^']+)'/);
    return m ? m[1] : null;
  })
  .filter(Boolean);

const missing = [...new Set(missingRaw)];

// Walk src/ via git ls-files (fast, respects tracked files)
const lsOutput = execFileSync(
  'C:/Program Files/Git/cmd/git.exe',
  ['ls-files', 'mcp-server/src'],
  { cwd: 'H:/prism', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);
const actualFiles = lsOutput.split(/\r?\n/).filter(Boolean);

// Also include untracked (might be staged-new)
let untrackedFiles = [];
try {
  const untrackedOut = execFileSync(
    'C:/Program Files/Git/cmd/git.exe',
    ['ls-files', '--others', '--exclude-standard', 'mcp-server/src'],
    { cwd: 'H:/prism', encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  untrackedFiles = untrackedOut.split(/\r?\n/).filter(Boolean);
} catch {}

const allFiles = [...new Set([...actualFiles, ...untrackedFiles])];

// Build index: basename (lower, with .ts extension) -> array of full paths
const byBasenameLower = new Map();
const byBasenameExact = new Map();
for (const f of allFiles) {
  if (!f.endsWith('.ts') && !f.endsWith('.json')) continue;
  const b = basename(f);
  const bLower = b.toLowerCase();
  if (!byBasenameLower.has(bLower)) byBasenameLower.set(bLower, []);
  byBasenameLower.get(bLower).push(f);
  if (!byBasenameExact.has(b)) byBasenameExact.set(b, []);
  byBasenameExact.get(b).push(f);
}

const buckets = {
  RENAMED_CASE: [],    // basename exists with different case
  MOVED: [],           // basename exists but at a different directory
  TRULY_MISSING: [],   // no file with this basename exists at all
};

for (const importPath of missing) {
  // Strip leading ../.. and trailing .js
  const asFile = importPath.replace(/\.js$/, '.ts');
  const bn = basename(asFile);           // e.g. "AHPEngine.ts"
  const bnJson = bn.replace(/\.ts$/, '.json');
  const bnLower = bn.toLowerCase();
  const bnJsonLower = bnJson.toLowerCase();

  const exactMatches = byBasenameExact.get(bn) || byBasenameExact.get(bnJson) || [];
  const caseMatches = byBasenameLower.get(bnLower) || byBasenameLower.get(bnJsonLower) || [];

  if (exactMatches.length > 0) {
    buckets.MOVED.push({ importPath, foundAt: exactMatches });
  } else if (caseMatches.length > 0) {
    buckets.RENAMED_CASE.push({ importPath, foundAt: caseMatches });
  } else {
    buckets.TRULY_MISSING.push({ importPath });
  }
}

writeFileSync(REPORT_JSON, JSON.stringify(buckets, null, 2));

const summary = [
  `MISSING MODULES CLASSIFICATION`,
  `=============================`,
  `Total unique missing: ${missing.length}`,
  `  MOVED (basename exists elsewhere):         ${buckets.MOVED.length}`,
  `  RENAMED_CASE (exists with diff case):      ${buckets.RENAMED_CASE.length}`,
  `  TRULY_MISSING (no file anywhere):          ${buckets.TRULY_MISSING.length}`,
  ``,
  `-- Sample MOVED (up to 15) --`,
  ...buckets.MOVED.slice(0, 15).map(x => `  ${x.importPath}  ->  ${x.foundAt[0]}`),
  ``,
  `-- Sample RENAMED_CASE (up to 15) --`,
  ...buckets.RENAMED_CASE.slice(0, 15).map(x => `  ${x.importPath}  ->  ${x.foundAt[0]}`),
  ``,
  `-- Sample TRULY_MISSING (up to 30) --`,
  ...buckets.TRULY_MISSING.slice(0, 30).map(x => `  ${x.importPath}`),
];
const text = summary.join('\n');
writeFileSync(REPORT_TXT, text);
console.log(text);
