#!/usr/bin/env node
/**
 * For each of the 84 still-missing engine files, search every local and
 * remote-tracking branch for a version of the file.
 *
 * Uses `git cat-file -e <ref>:<path>` to check existence (fast, no
 * checkout needed).
 *
 * Output: table of filename -> list of refs that have it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const GIT = 'C:/Program Files/Git/cmd/git.exe';
const REPO = 'H:/prism';
const MISSING_LIST = 'H:/prism/.cache/temp/still-missing.txt';
const OUT_TXT = 'H:/prism/.cache/temp/still-missing-branch-scan.txt';
const OUT_JSON = 'H:/prism/.cache/temp/still-missing-branch-scan.json';

function git(args) {
  return execFileSync(GIT, args, {
    cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const missingRaw = readFileSync(MISSING_LIST, 'utf8').split(/\r?\n/).filter(Boolean);
// Convert import path to candidate src paths — imports start with '../../engines/X.js'
const candidates = missingRaw.map(imp => {
  const bn = basename(imp).replace(/\.js$/, '.ts');
  // Try common dirs — engines is where most live, but some may be elsewhere
  return {
    importPath: imp,
    basename: bn,
    candidatePaths: [
      `mcp-server/src/engines/${bn}`,
      `mcp-server/src/algorithms/${bn}`,
      `mcp-server/src/services/${bn}`,
      `mcp-server/src/pipelines/${bn}`,
      `mcp-server/src/orchestration/${bn}`,
    ],
  };
});

// Get all refs: local branches + remote-tracking + tags (excluding worktree-* locks)
const refLines = git(['for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes'])
  .split(/\r?\n/)
  .filter(Boolean)
  .filter(r => !r.includes('HEAD'));

const results = [];
const stats = { found: 0, notFound: 0 };

for (const c of candidates) {
  const foundIn = [];
  for (const ref of refLines) {
    for (const p of c.candidatePaths) {
      try {
        execFileSync(GIT, ['cat-file', '-e', `${ref}:${p}`], {
          cwd: REPO, stdio: 'ignore',
        });
        foundIn.push({ ref, path: p });
        break; // one candidate per ref is enough
      } catch { /* ref doesn't have it at this path */ }
    }
  }
  if (foundIn.length > 0) stats.found++;
  else stats.notFound++;
  results.push({
    basename: c.basename,
    importPath: c.importPath,
    foundInRefs: foundIn,
  });
}

writeFileSync(OUT_JSON, JSON.stringify({ stats, results }, null, 2));

const lines = [
  `STILL-MISSING BRANCH SCAN`,
  `=========================`,
  `Missing modules scanned:  ${candidates.length}`,
  `  Found on some branch:    ${stats.found}`,
  `  Not found anywhere:      ${stats.notFound}`,
  ``,
  `Per-file results:`,
];
for (const r of results) {
  if (r.foundInRefs.length === 0) {
    lines.push(`  ${r.basename}  <NOT ON ANY BRANCH>`);
  } else {
    const refs = r.foundInRefs.map(f => f.ref).slice(0, 4).join(', ');
    const extra = r.foundInRefs.length > 4 ? ` (+${r.foundInRefs.length - 4} more)` : '';
    lines.push(`  ${r.basename.padEnd(55)} ${refs}${extra}`);
  }
}
const txt = lines.join('\n');
writeFileSync(OUT_TXT, txt);
console.log(txt);
