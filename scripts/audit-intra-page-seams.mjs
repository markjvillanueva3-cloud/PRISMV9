#!/usr/bin/env node
/**
 * audit-intra-page-seams.mjs — U-F3-SEAM-AUDIT (slot:quebec /goal-loop yolo iter5)
 *
 * Pairs with U-B1-LAZY-SPLIT-AUDIT (the route-level audit). For each of the
 * 9 intra-page split candidates U-B1 surfaced, this audit finds candidate
 * SEAMS — points in the file where a React.lazy() boundary could land:
 *   - `<TabsContent value="...">` blocks (Radix Tabs)
 *   - `<Tab eventKey="...">` blocks (React-Bootstrap-style)
 *   - top-level `function <Name>Tab()` / `function <Name>Section()` /
 *     `function <Name>Wizard()` declarations
 *   - large JSX fragments under `case 'tab-name':` switch arms
 *
 * Per spec FRONTEND-PLAN-EXTENSION §9.2 + line 224: "NOT a code-split
 * implementation unit -- that's per-page operator-gated follow-on work."
 * This audit is the RECOMMENDATION layer that bridges U-B1's "which pages"
 * and the operator's "where do I cut?".
 *
 * Surface-only, never auto-edit. Output: state/shared/dashboards/INTRA-PAGE-SEAM-AUDIT.{json,md}.
 *
 * Usage:
 *   node scripts/audit-intra-page-seams.mjs                 # MD + JSON
 *   node scripts/audit-intra-page-seams.mjs --json          # stdout JSON
 *   node scripts/audit-intra-page-seams.mjs --out <path>    # custom out
 */

import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const OUT_JSON = join(REPO, 'state', 'shared', 'dashboards', 'INTRA-PAGE-SEAM-AUDIT.json');
const OUT_MD = join(REPO, 'state', 'shared', 'dashboards', 'INTRA-PAGE-SEAM-AUDIT.md');

// Source: U-B1-LAZY-SPLIT-AUDIT findings (3 spec-named + 6 NEW).
// Updates here propagate to this audit's scope without re-deriving from U-B1.
const CANDIDATES = [
  'web/src/pages/CalculatorPage.tsx',
  'web/src/pages/PostProcessorGeneratorPage.tsx',
  'web/src/pages/QuoteBuilderPage.tsx',
  'web/src/pages/JobsPage.tsx',
  'web/src/pages/ShopFloorClockPage.tsx',
  'web/src/pages/ProgramReleasePage.tsx',
  'web/src/pages/TravelerPage.tsx',
  'web/src/pages/PostProcessorPage.tsx',
  'web/src/pages/CustomerPortalPage.tsx',
];

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const outIdx = args.indexOf('--out');
const customOut = outIdx >= 0 ? args[outIdx + 1] : null;

// SEAM DETECTION PATTERNS — ordered most-specific first. A line that matches
// any pattern becomes a seam candidate; counts and locations report which.
const SEAM_PATTERNS = [
  { name: 'tabs-content', re: /<TabsContent\s+value="([^"]+)"/g, kind: 'radix-tab' },
  { name: 'bootstrap-tab', re: /<Tab\s+eventKey="([^"]+)"/g, kind: 'bootstrap-tab' },
  { name: 'tab-trigger', re: /<TabsTrigger\s+value="([^"]+)"/g, kind: 'radix-tab-trigger' },
  { name: 'fn-tab', re: /^\s*function\s+(\w+Tab)\s*\(/gm, kind: 'function-tab' },
  { name: 'fn-section', re: /^\s*function\s+(\w+Section)\s*\(/gm, kind: 'function-section' },
  { name: 'fn-wizard', re: /^\s*function\s+(\w+Wizard\w*)\s*\(/gm, kind: 'function-wizard' },
  { name: 'fn-panel', re: /^\s*function\s+(\w+Panel)\s*\(/gm, kind: 'function-panel' },
  { name: 'switch-case', re: /case\s+['"]([\w-]+)['"]\s*:\s*\n\s*return\s+\(/g, kind: 'switch-case' },
];

async function scanPage(absPath) {
  const text = await readFile(absPath, 'utf8');
  const stats = await stat(absPath);
  const loc = text.split(/\r?\n/).length;
  const seams = [];
  for (const pat of SEAM_PATTERNS) {
    const matches = [...text.matchAll(pat.re)];
    for (const m of matches) {
      const idx = m.index ?? 0;
      const before = text.slice(0, idx);
      const line = before.split(/\r?\n/).length;
      seams.push({
        kind: pat.kind,
        pattern: pat.name,
        identifier: m[1] ?? null,
        line,
      });
    }
  }
  // Group seams by kind for the per-page summary line.
  const byKind = seams.reduce((acc, s) => {
    acc[s.kind] = (acc[s.kind] ?? 0) + 1;
    return acc;
  }, {});
  return {
    rel: relative(REPO, absPath).replace(/\\/g, '/'),
    bytes: stats.size,
    loc,
    seamCount: seams.length,
    byKind,
    seams: seams.sort((a, b) => a.line - b.line),
  };
}

function format(report) {
  const lines = [];
  lines.push('# INTRA-PAGE-SEAM-AUDIT');
  lines.push('');
  lines.push(`> U-F3-SEAM-AUDIT (slot:quebec /goal-loop yolo iter5)`);
  lines.push(`> Generated: ${report.generatedAt}`);
  lines.push(`> Source: the 9 intra-page split candidates from U-B1.`);
  lines.push('');
  lines.push('Pages scanned: **' + report.pages.length + '**');
  lines.push('Total seam candidates: **' + report.totalSeams + '**');
  lines.push('Pages with ZERO detected seams: **' + report.pages.filter((p) => p.seamCount === 0).length + '**');
  lines.push('');
  lines.push('## Per-page seam map');
  lines.push('');
  for (const p of report.pages) {
    lines.push(`### ${p.rel} — ${p.loc.toLocaleString()} LOC · ${p.seamCount} seam(s)`);
    lines.push('');
    if (p.seamCount === 0) {
      lines.push('_No tab / section / wizard / panel / switch-case seams detected. This page is a single-flow surface — intra-page React.lazy is NOT the right tool here; consider extracting heavy sub-components into separate files instead._');
      lines.push('');
      continue;
    }
    // By-kind summary
    const summary = Object.entries(p.byKind)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    lines.push(`Seam kinds: ${summary}`);
    lines.push('');
    // Top 12 seams
    lines.push('| Line | Kind | Identifier |');
    lines.push('|---:|---|---|');
    const top = p.seams.slice(0, 12);
    for (const s of top) {
      lines.push(`| ${s.line} | ${s.kind} | \`${s.identifier ?? '(anon)'}\` |`);
    }
    if (p.seams.length > 12) {
      lines.push(`| … | (${p.seams.length - 12} more) | … |`);
    }
    lines.push('');
  }
  lines.push('## Recommendations');
  lines.push('');
  lines.push('For each page with **>=3 seam candidates of the same kind**, the operator-gated unit U-F3-TAB-LEVEL-DYNAMIC-IMPORTS (P1, 4-8h per page) is the right next step:');
  lines.push('');
  lines.push('1. Extract each named tab / section / wizard into its own file under `web/src/pages/<PageName>/<TabName>.tsx`.');
  lines.push('2. Replace the inline render with `React.lazy(() => import("./<TabName>"))` + a `<Suspense>` boundary.');
  lines.push('3. Wire into `vite.config.ts manualChunks()` so the per-tab chunk is named (parallel to the existing `viewer-toolbar` / `learning-core` / `academy-data` entries).');
  lines.push('4. Re-run U-F5-ROLLUP-CHUNK-AUDIT after the split — the unbucketed LOC for that page should drop into the new chunks.');
  lines.push('');
  lines.push('## Findings (R12 — fail-loud, surface-only)');
  lines.push('');
  for (const f of report.findings) {
    lines.push(`- **${f.severity}** — ${f.message}`);
  }
  lines.push('');
  lines.push('## Spec link');
  lines.push('');
  lines.push('Unit: U-F3-SEAM-AUDIT — `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §9.2 + line 224. Bridges U-B1 (which pages) to operator-gated U-F3 (where to cut).');
  return lines.join('\n');
}

function detectFindings(report) {
  const findings = [];
  const noSeams = report.pages.filter((p) => p.seamCount === 0);
  if (noSeams.length > 0) {
    findings.push({
      severity: 'INFO',
      message: `${noSeams.length} candidate page(s) have ZERO tab/section/wizard seams. These are single-flow surfaces — extract heavy sub-components into separate files instead of intra-page lazy. Pages: ${noSeams.map((p) => p.rel.split('/').pop()).join(', ')}.`,
    });
  }
  const richSeams = report.pages.filter((p) => p.seamCount >= 3);
  if (richSeams.length > 0) {
    findings.push({
      severity: 'INFO',
      message: `${richSeams.length} page(s) have >=3 seam candidates and are ready for U-F3-TAB-LEVEL-DYNAMIC-IMPORTS (operator-gated, 4-8h per page). Top: ${richSeams.slice(0, 3).map((p) => `${p.rel.split('/').pop()} (${p.seamCount} seams)`).join(', ')}.`,
    });
  }
  return findings;
}

async function main() {
  const pages = [];
  for (const c of CANDIDATES) {
    const abs = join(REPO, c);
    try {
      pages.push(await scanPage(abs));
    } catch (e) {
      console.error(`SKIP: ${c}: ${e.message}`);
    }
  }
  if (pages.length === 0) {
    console.error('FATAL: no candidate pages readable.');
    process.exit(2);
  }
  const report = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    unit: 'U-F3-SEAM-AUDIT',
    slot: 'quebec',
    candidateSource: 'U-B1-LAZY-SPLIT-AUDIT',
    pages,
    totalSeams: pages.reduce((a, p) => a + p.seamCount, 0),
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
  console.log(`audit-intra-page-seams: wrote ${jsonPath} + ${outPath}`);
  console.log(`  ${report.pages.length} pages / ${report.totalSeams} total seam candidates / ${report.findings.length} findings.`);
}

void main().catch((e) => {
  console.error('audit-intra-page-seams fatal:', e.stack || e.message);
  process.exit(1);
});
