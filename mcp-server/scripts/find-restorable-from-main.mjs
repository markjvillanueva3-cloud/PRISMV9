#!/usr/bin/env node
/**
 * For each TRULY_MISSING module on the current branch, check if the file
 * exists on `main` (or elsewhere in repo history). Emits a ranked restore plan.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const CLASSIFIED = 'H:/prism/.cache/temp/missing-modules-classified.json';
const MAIN_FILES = 'H:/prism/.cache/temp/main-files.txt';
const REPORT = 'H:/prism/.cache/temp/restore-plan.json';
const REPORT_TXT = 'H:/prism/.cache/temp/restore-plan.txt';

const buckets = JSON.parse(readFileSync(CLASSIFIED, 'utf8'));
const mainFiles = readFileSync(MAIN_FILES, 'utf8').split(/\r?\n/).filter(Boolean);

// Index main files by basename
const mainByBasename = new Map();
for (const f of mainFiles) {
  const b = basename(f);
  if (!mainByBasename.has(b)) mainByBasename.set(b, []);
  mainByBasename.get(b).push(f);
}

const restoreFromMain = [];
const stillMissing = [];

for (const entry of buckets.TRULY_MISSING) {
  const importPath = entry.importPath; // e.g. '../../engines/AHPEngine.js'
  const asFile = importPath.replace(/\.js$/, '.ts');
  const bn = basename(asFile);          // 'AHPEngine.ts'
  const bnJson = bn.replace(/\.ts$/, '.json');

  const matches = [
    ...(mainByBasename.get(bn) || []),
    ...(mainByBasename.get(bnJson) || []),
  ];
  if (matches.length > 0) {
    restoreFromMain.push({ importPath, mainPath: matches[0], allMatches: matches });
  } else {
    stillMissing.push(importPath);
  }
}

writeFileSync(REPORT, JSON.stringify({ restoreFromMain, stillMissing }, null, 2));

const lines = [
  `RESTORATION PLAN`,
  `================`,
  `Classified TRULY_MISSING on branch: ${buckets.TRULY_MISSING.length}`,
  `  Restorable from main:             ${restoreFromMain.length}`,
  `  Still missing even on main:       ${stillMissing.length}`,
  ``,
  `-- Sample still-missing on main (first 40) --`,
  ...stillMissing.slice(0, 40).map(p => `  ${p}`),
  ``,
  `-- Restore paths (first 30) --`,
  ...restoreFromMain.slice(0, 30).map(x => `  ${x.mainPath}`),
];
writeFileSync(REPORT_TXT, lines.join('\n'));
console.log(lines.join('\n'));
