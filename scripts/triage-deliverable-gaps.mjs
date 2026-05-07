#!/usr/bin/env node
// Triage deliverable-gap units against sibling branches.
// Output: state/shared/INTEL-OLLAMA-OBSIDIAN-MS0-DRIFT-TRIAGE.md
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const MILESTONE_ID = 'INTEL-OLLAMA-OBSIDIAN-MS0';

const BRANCHES = [
  'origin/main',
  'origin/work/intel-p8-schema',
  'origin/work/intel-ollama-obsidian-ms1',
  'origin/work/intel-ollama-obsidian-ms0',
];

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function existsOnBranch(branch, relPath) {
  const out = git(['cat-file', '-e', `${branch}:${relPath}`]);
  // cat-file -e exits 0/non-0 — execFileSync throws on non-0, returns '' from catch
  // Use ls-tree for reliability
  const ls = git(['ls-tree', '--name-only', branch, relPath]);
  return ls.trim() === relPath;
}

function getAuditJson() {
  const out = execFileSync(process.execPath, [
    'mcp-server/scripts/audit-milestone-integrity.mjs',
    '--milestone', MILESTONE_ID,
    '--json',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  return JSON.parse(out);
}

function classifyDeliverable(rawPath) {
  // Skip directory deliverables and absolute system paths
  if (rawPath.endsWith('/') || rawPath.endsWith('\\')) {
    return { kind: 'directory', branchHits: [] };
  }
  if (rawPath.startsWith('H:/') || rawPath.startsWith('H:\\')) {
    return { kind: 'absolute', branchHits: [] };
  }
  const branchHits = BRANCHES.filter(b => existsOnBranch(b, rawPath));
  let kind;
  if (branchHits.length === 0) kind = 'orphaned';
  else if (branchHits.length === BRANCHES.length) kind = 'on-all';
  else kind = 'cross-branch';
  return { kind, branchHits };
}

function main() {
  const audit = getAuditJson();
  const gaps = audit.rows.filter(r => r.verdict === 'deliverable-gap');
  console.error(`Triaging ${gaps.length} deliverable-gap units...`);

  const triaged = gaps.map(unit => {
    const items = (unit.deliverables || []).map(d => ({
      raw: d.raw,
      existsLocal: d.exists,
      ...classifyDeliverable(d.raw),
    }));
    // Aggregate: if all items either exist locally OR exist on canonical → cross-branch
    const missing = items.filter(i => !i.existsLocal && i.kind !== 'directory' && i.kind !== 'absolute');
    let unitKind;
    if (missing.length === 0) unitKind = 'all-local-or-meta';
    else if (missing.every(m => m.branchHits.length > 0)) unitKind = 'cross-branch-only';
    else if (missing.every(m => m.kind === 'orphaned')) unitKind = 'orphaned-only';
    else unitKind = 'mixed';
    return { unitId: unit.unitId, unitKind, items };
  });

  const buckets = {
    'cross-branch-only': [],
    'mixed': [],
    'orphaned-only': [],
    'all-local-or-meta': [],
  };
  for (const t of triaged) buckets[t.unitKind].push(t);

  const lines = [];
  lines.push(`# ${MILESTONE_ID} — Drift Triage`);
  lines.push(``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`Triaged ${triaged.length} deliverable-gap units against ${BRANCHES.length} branches.`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Bucket | Count | Action |`);
  lines.push(`|--------|-------|--------|`);
  lines.push(`| cross-branch-only | ${buckets['cross-branch-only'].length} | Auto-resolved by merge to main |`);
  lines.push(`| mixed | ${buckets['mixed'].length} | Some files cross-branch, some need new build |`);
  lines.push(`| orphaned-only | ${buckets['orphaned-only'].length} | True gap — never built, needs unit work or scope-invalidate |`);
  lines.push(`| all-local-or-meta | ${buckets['all-local-or-meta'].length} | Audit false-positive — local files or directory placeholders |`);
  lines.push(``);

  for (const [kind, units] of Object.entries(buckets)) {
    if (units.length === 0) continue;
    lines.push(`## ${kind} (${units.length})`);
    lines.push(``);
    for (const u of units) {
      lines.push(`### ${u.unitId}`);
      for (const it of u.items) {
        const localTag = it.existsLocal ? '✓local' : '✗local';
        const branchTag = it.kind === 'directory' ? 'dir-placeholder'
          : it.kind === 'absolute' ? 'absolute-path'
          : it.branchHits.length > 0
            ? `→ ${it.branchHits.map(b => b.replace('origin/', '')).join(', ')}`
            : 'no-branch';
        lines.push(`- \`${it.raw}\` — ${localTag} ${branchTag}`);
      }
      lines.push(``);
    }
  }

  const outPath = join('state', 'shared', `${MILESTONE_ID}-DRIFT-TRIAGE.md`);
  writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`cross-branch-only=${buckets['cross-branch-only'].length} mixed=${buckets['mixed'].length} orphaned-only=${buckets['orphaned-only'].length} all-local-or-meta=${buckets['all-local-or-meta'].length}`);
}

main();
