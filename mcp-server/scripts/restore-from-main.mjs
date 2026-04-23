#!/usr/bin/env node
/**
 * Restore from main branch: files listed in still-missing-branch-scan.json
 * that have foundInRefs including 'main'. Uses `git checkout main -- <path>`
 * which is safe (only touches the specified paths).
 *
 * Emits a list of still-missing-after-restore for follow-up.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const GIT = 'C:/Program Files/Git/cmd/git.exe';
const REPO = 'H:/prism';
const SCAN = 'H:/prism/.cache/temp/still-missing-branch-scan.json';
const OUT = 'H:/prism/.cache/temp/restore-from-main-log.json';

const scan = JSON.parse(readFileSync(SCAN, 'utf8'));
const restorable = [];
const stillMissing = [];
for (const r of scan.results) {
  const mainHit = r.foundInRefs.find(f => f.ref === 'main');
  if (mainHit) restorable.push({ path: mainHit.path, basename: r.basename });
  else stillMissing.push({ basename: r.basename, importPath: r.importPath, otherRefs: r.foundInRefs.map(f => f.ref) });
}

// Deduplicate by path (importers use different relative paths for same file)
const uniquePaths = [...new Set(restorable.map(r => r.path))];
console.log(`Restoring ${uniquePaths.length} unique paths from main (${restorable.length} total hits after dedup)`);

const errors = [];
let ok = 0;
for (const p of uniquePaths) {
  try {
    execFileSync(GIT, ['checkout', 'main', '--', p], {
      cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'],
    });
    ok++;
  } catch (err) {
    errors.push({ path: p, error: String(err.message || err).slice(0, 200) });
  }
}

const log = {
  finishedAt: new Date().toISOString(),
  uniquePathsAttempted: uniquePaths.length,
  restored: ok,
  errors,
  stillMissing,
};
writeFileSync(OUT, JSON.stringify(log, null, 2));

console.log(`Restored: ${ok} / ${uniquePaths.length}`);
console.log(`Errors:   ${errors.length}`);
console.log(`\nStill-missing-everywhere (${stillMissing.length}):`);
for (const s of stillMissing) {
  console.log(`  ${s.basename.padEnd(50)} (from ${s.importPath})`);
}
