#!/usr/bin/env node
/**
 * audit-state-coverage.mjs — U-V1-STATE-COVERAGE-LINT (slot:quebec /goal-loop iter4)
 *
 * Scan every web/src/pages/**\/*.tsx for the three load-state branches
 * (`isLoading` | `isPending` | loading; `isError` | error; empty/zero) and
 * report which pages render less than 3 of them. The vibe-coded vs
 * professional gap in §9.5 of the FRONTEND-PLAN-EXTENSION spec — "pages that
 * skip the empty + error branches" — is exactly what this surfaces.
 *
 * Spec: state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md §9.5 + §6 U-V1.
 * Surfaces as REPORT (Karpathy R12 fail-loud), never auto-blocks — existing
 * pages would all fail and that's not the operator's gate.
 *
 * Usage:
 *   node scripts/audit-state-coverage.mjs                 # human-readable MD + JSON
 *   node scripts/audit-state-coverage.mjs --json          # stdout raw JSON
 *   node scripts/audit-state-coverage.mjs --out <path>    # custom output path
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const PAGES = join(REPO, 'web', 'src', 'pages');
const OUT_JSON = join(REPO, 'state', 'shared', 'dashboards', 'STATE-COVERAGE-AUDIT.json');
const OUT_MD = join(REPO, 'state', 'shared', 'dashboards', 'STATE-COVERAGE-AUDIT.md');

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const outIdx = args.indexOf('--out');
const customOut = outIdx >= 0 ? args[outIdx + 1] : null;

// Three signal classes per page. A page can use any spelling within the class
// (loading/isLoading/isFetching/isPending; error/isError/hasError; empty/noData/
// length === 0). Detection is regex-substring — false-positive friendly but
// surfaces gaps; we report the matched terms so an operator can inspect.
const LOADING = [
  /\bisLoading\b/, /\bisPending\b/, /\bisFetching\b/, /\bloading\s*[:=]/, /\bShimmer\b/,
  /\bSkeleton\b/, /\bSpinner\b/,
];
const ERRORED = [
  /\bisError\b/, /\bhasError\b/, /\bonError\b/, /\berror\s*[:=]/,
  /\bcatch\s*\(/, /\bErrorBoundary\b/, /\bErrorState\b/,
];
const EMPTY = [
  /\bisEmpty\b/, /\bnoData\b/, /\bEmptyState\b/, /\.length\s*===?\s*0\b/,
  /\.length\s*<\s*1\b/, /!\s*data\.length/, /data\s*&&\s*data\.length/,
];

async function walk(root) {
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let ents;
    try {
      ents = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name.startsWith('.') || ent.name === '__tests__' || ent.name === 'node_modules') continue;
        stack.push(p);
      } else if (ent.isFile() && /\.tsx$/.test(ent.name)) {
        out.push(p);
      }
    }
  }
  return out;
}

function matchClass(text, patterns) {
  const hits = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) hits.push(m[0]);
  }
  return hits;
}

async function audit(file) {
  const text = await readFile(file, 'utf8');
  const stats = await stat(file);
  const loadingHits = matchClass(text, LOADING);
  const erroredHits = matchClass(text, ERRORED);
  const emptyHits = matchClass(text, EMPTY);
  // Count how many of the THREE classes have at least one match.
  const classesCovered =
    (loadingHits.length > 0 ? 1 : 0) +
    (erroredHits.length > 0 ? 1 : 0) +
    (emptyHits.length > 0 ? 1 : 0);
  return {
    path: file,
    rel: relative(REPO, file).replace(/\\/g, '/'),
    bytes: stats.size,
    loc: text.split(/\r?\n/).length,
    classesCovered,
    hasLoading: loadingHits.length > 0,
    hasErrored: erroredHits.length > 0,
    hasEmpty: emptyHits.length > 0,
    loadingHits: Array.from(new Set(loadingHits)),
    erroredHits: Array.from(new Set(erroredHits)),
    emptyHits: Array.from(new Set(emptyHits)),
  };
}

function detectFindings(report) {
  const findings = [];
  const missing = report.pages.filter((p) => p.classesCovered < 3);
  if (missing.length > 0) {
    findings.push({
      severity: 'INFO',
      message: `${missing.length} of ${report.pages.length} pages (${((missing.length / report.pages.length) * 100).toFixed(1)}%) cover fewer than 3 of the {loading, errored, empty} state classes.`,
    });
  }
  const zeroCoverage = report.pages.filter((p) => p.classesCovered === 0);
  if (zeroCoverage.length > 0) {
    findings.push({
      severity: 'WARN',
      message: `${zeroCoverage.length} page(s) cover ZERO load-state classes — most likely a static landing page or a vibe-coded form. Top: ${zeroCoverage.slice(0, 3).map((p) => p.rel).join(', ')}.`,
    });
  }
  return findings;
}

function format(report) {
  const lines = [];
  lines.push('# STATE-COVERAGE-AUDIT');
  lines.push('');
  lines.push(`> U-V1-STATE-COVERAGE-LINT (slot:quebec /goal-loop iter4)`);
  lines.push(`> Generated: ${report.generatedAt}`);
  lines.push(`> Source: web/src/pages/**/*.tsx`);
  lines.push('');
  lines.push(`Total pages scanned: **${report.pages.length}**`);
  lines.push(`Pages covering all 3 classes (loading + errored + empty): **${report.pages.filter((p) => p.classesCovered === 3).length}**`);
  lines.push(`Pages with 2 of 3: **${report.pages.filter((p) => p.classesCovered === 2).length}**`);
  lines.push(`Pages with 1 of 3: **${report.pages.filter((p) => p.classesCovered === 1).length}**`);
  lines.push(`Pages with 0 of 3: **${report.pages.filter((p) => p.classesCovered === 0).length}**`);
  lines.push('');
  lines.push('## Per-page coverage (LOC desc; missing-class flagged)');
  lines.push('');
  lines.push('| Page | LOC | Load | Err | Empty | Classes |');
  lines.push('|---|---:|:-:|:-:|:-:|:-:|');
  const sorted = [...report.pages].sort((a, b) => b.loc - a.loc);
  for (const p of sorted) {
    lines.push(`| ${p.rel} | ${p.loc.toLocaleString()} | ${p.hasLoading ? 'OK' : 'GAP'} | ${p.hasErrored ? 'OK' : 'GAP'} | ${p.hasEmpty ? 'OK' : 'GAP'} | ${p.classesCovered}/3 |`);
  }
  lines.push('');
  lines.push('## Pages with ZERO state-class coverage');
  lines.push('');
  const zero = report.pages.filter((p) => p.classesCovered === 0).sort((a, b) => b.loc - a.loc);
  if (zero.length === 0) {
    lines.push('_(none — every page covers at least one state class.)_');
  } else {
    lines.push('| Page | LOC |');
    lines.push('|---|---:|');
    for (const p of zero) {
      lines.push(`| ${p.rel} | ${p.loc.toLocaleString()} |`);
    }
  }
  lines.push('');
  lines.push('## Findings (R12 — fail-loud, surface-only, never auto-block)');
  lines.push('');
  if (report.findings.length === 0) {
    lines.push('_(no automated findings.)_');
  } else {
    for (const f of report.findings) {
      lines.push(`- **${f.severity}** — ${f.message}`);
    }
  }
  lines.push('');
  lines.push('## Detection notes');
  lines.push('');
  lines.push('- Detection is regex-substring on three signal classes: loading (isLoading|isPending|isFetching|loading:|Shimmer|Skeleton|Spinner), errored (isError|hasError|onError|error:|catch(|ErrorBoundary|ErrorState), empty (isEmpty|noData|EmptyState|.length === 0|.length < 1|!data.length|data && data.length).');
  lines.push('- False positives possible (the *word* matches without a real branch). Use this report as a triage filter — operator inspects each `GAP` page to confirm the branch is genuinely missing vs. cosmetically-named differently.');
  lines.push('- Per spec, this audit NEVER auto-blocks; it surfaces. The 3-of-3 scrutiny gate may use it as a P1 input.');
  lines.push('');
  lines.push('## Spec link');
  lines.push('');
  lines.push('Unit: U-V1-STATE-COVERAGE-LINT — `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §6 + §9.5.');
  return lines.join('\n');
}

async function main() {
  const files = await walk(PAGES);
  if (files.length === 0) {
    console.error(`FATAL: walked 0 .tsx files under ${PAGES} — wrong root?`);
    process.exit(2);
  }
  const pages = [];
  for (const f of files) {
    pages.push(await audit(f));
  }
  const report = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    unit: 'U-V1-STATE-COVERAGE-LINT',
    slot: 'quebec',
    sourceRoot: 'web/src/pages/',
    pages,
    findings: [],
  };
  report.findings = detectFindings(report);

  if (wantJson) {
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }

  const md = format(report);
  const outPath = customOut ?? OUT_MD;
  const jsonPath = customOut ? customOut.replace(/\.md$/, '.json') : OUT_JSON;
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(outPath, md);
  const full = report.pages.filter((p) => p.classesCovered === 3).length;
  console.log(`audit-state-coverage: wrote ${jsonPath} + ${outPath}`);
  console.log(`  ${report.pages.length} pages scanned; ${full} cover all 3 classes; ${report.pages.length - full} have gaps; ${report.findings.length} findings.`);
}

void main().catch((e) => {
  console.error('audit-state-coverage fatal:', e.stack || e.message);
  process.exit(1);
});
