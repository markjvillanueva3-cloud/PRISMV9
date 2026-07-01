#!/usr/bin/env node
/**
 * audit-route-lazy-coverage.mjs — U-B1-LAZY-SPLIT-AUDIT (slot:quebec /goal-loop iter5)
 *
 * Read web/src/App.tsx, list every `<Route element=...>` wrapper, classify into
 * lazy-wrapped vs eager. Cross-reference web/src/pages/ LOC sizing to surface
 * pages where intra-page tab-level dynamic-import would help (spec §9.2).
 * Pure audit, no code-split implementation (per-page work is operator-gated
 * per spec line 224).
 *
 * Spec: state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md §6 U-B1
 * (reframed at line 368: "the original code-split mega-pages unit was a no-op
 * (already shipped). The new U-B1 is an audit unit").
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const APP_TSX = join(REPO, 'web', 'src', 'App.tsx');
const PAGES = join(REPO, 'web', 'src', 'pages');
const OUT_JSON = join(REPO, 'state', 'shared', 'dashboards', 'ROUTE-LAZY-AUDIT.json');
const OUT_MD = join(REPO, 'state', 'shared', 'dashboards', 'ROUTE-LAZY-AUDIT.md');

// Large-page threshold for split-candidate detection. Pages below this LOC
// don't benefit meaningfully from a second tier of code-splitting — route-
// level lazy already gives them their own chunk.
const LARGE_PAGE_LOC = 1000;

// Spec-named intra-page-split candidates from FRONTEND-PLAN-EXTENSION §9.2 +
// line 224. The audit auto-augments with any other page over LARGE_PAGE_LOC.
const SPEC_SPLIT_CANDIDATES = ['CalculatorPage', 'PostProcessorGeneratorPage', 'QuoteBuilderPage'];

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const outIdx = args.indexOf('--out');
const customOut = outIdx >= 0 ? args[outIdx + 1] : null;

function extractRouteWrappers(appText) {
  const routes = [];
  const matches = appText.matchAll(/<Route\b([^>]*?)\selement=\{([^}]+)\}/g);
  for (const m of matches) {
    const attrs = m[1];
    const elemText = m[2].trim();
    const pathMatch = attrs.match(/\bpath="([^"]*)"/);
    const indexMatch = attrs.match(/\bindex\b/);
    const compMatch = elemText.match(/<([A-Z]\w+)\s*\/?\s*>/);
    routes.push({
      raw: m[0],
      path: pathMatch ? pathMatch[1] : (indexMatch ? '(index)' : '(unknown)'),
      element: elemText,
      isLazy: /lazyElement\s*\(/.test(elemText),
      pageRef: compMatch ? compMatch[1] : null,
    });
  }
  return routes;
}

function extractLazyNamedImports(appText) {
  const out = [];
  const matches = appText.matchAll(/const\s+([A-Z]\w+)\s*=\s*lazyNamed\(\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g);
  for (const m of matches) {
    out.push({ name: m[1], importPath: m[2] });
  }
  return out;
}

async function walkPages(root) {
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
        if (ent.name.startsWith('.') || ent.name === '__tests__') continue;
        stack.push(p);
      } else if (ent.isFile() && /\.tsx$/.test(ent.name)) {
        const stats = await stat(p);
        const text = await readFile(p, 'utf8');
        out.push({
          rel: relative(REPO, p).replace(/\\/g, '/'),
          bytes: stats.size,
          loc: text.split(/\r?\n/).length,
          name: ent.name.replace(/\.tsx$/, ''),
        });
      }
    }
  }
  return out;
}

function detectSplitCandidates(pages, routes, lazyNamed) {
  const lazyNames = new Set(lazyNamed.map((l) => l.name));
  const routed = new Set(routes.filter((r) => r.pageRef).map((r) => r.pageRef));
  return pages
    .filter((p) => p.loc >= LARGE_PAGE_LOC)
    .map((p) => ({
      ...p,
      isLazyRouted: lazyNames.has(p.name) && routed.has(p.name),
      isSpecNamed: SPEC_SPLIT_CANDIDATES.includes(p.name),
    }))
    .filter((p) => p.isLazyRouted)
    .sort((a, b) => b.loc - a.loc);
}

function detectFindings(report) {
  const findings = [];
  if (report.eagerRoutes > 0) {
    findings.push({
      severity: 'WARN',
      message: `${report.eagerRoutes} route(s) NOT using lazyElement — each one is in the eager initial bundle.`,
    });
  } else {
    findings.push({
      severity: 'OK',
      message: `100% of routes (${report.routes.length}) use lazyElement — route-level code-splitting is complete (matches scrutiny round-2 finding that the original U-B1 was a no-op).`,
    });
  }
  if (report.splitCandidates.length > 0) {
    findings.push({
      severity: 'INFO',
      message: `${report.splitCandidates.length} lazy-routed page(s) >=${LARGE_PAGE_LOC} LOC are intra-page split candidates. Top: ${report.splitCandidates.slice(0, 3).map((p) => `${p.name} (${p.loc.toLocaleString()} LOC)`).join(', ')}.`,
    });
  }
  const routedSet = new Set(report.routes.filter((r) => r.pageRef).map((r) => r.pageRef));
  const unrouted = report.lazyNamed.filter((l) => !routedSet.has(l.name));
  if (unrouted.length > 0) {
    findings.push({
      severity: 'WARN',
      message: `${unrouted.length} lazyNamed declaration(s) not routed: ${unrouted.slice(0, 3).map((u) => u.name).join(', ')}. Either dead imports or referenced by something other than <Route>.`,
    });
  }
  return findings;
}

function format(report) {
  const lines = [];
  lines.push('# ROUTE-LAZY-AUDIT');
  lines.push('');
  lines.push(`> U-B1-LAZY-SPLIT-AUDIT (slot:quebec /goal-loop iter5)`);
  lines.push(`> Generated: ${report.generatedAt}`);
  lines.push(`> Source: web/src/App.tsx + walk of web/src/pages/`);
  lines.push('');
  lines.push(`Routes scanned: **${report.routes.length}** · lazy-wrapped: **${report.lazyRoutes}** · eager: **${report.eagerRoutes}**`);
  lines.push(`lazyNamed() declarations: **${report.lazyNamedCount}**`);
  lines.push(`Pages walked: **${report.pagesCount}** · pages >=${LARGE_PAGE_LOC} LOC and lazy-routed: **${report.splitCandidates.length}**`);
  lines.push('');
  lines.push('## Eager routes (NOT using lazyElement)');
  lines.push('');
  const eager = report.routes.filter((r) => !r.isLazy);
  if (eager.length === 0) {
    lines.push('_(none — every route uses lazyElement.)_');
  } else {
    lines.push('| Route | Element |');
    lines.push('|---|---|');
    for (const r of eager) {
      lines.push(`| \`${r.path}\` | \`${r.element.slice(0, 80)}\` |`);
    }
  }
  lines.push('');
  lines.push('## Intra-page split candidates (>=' + LARGE_PAGE_LOC + ' LOC AND lazy-routed)');
  lines.push('');
  lines.push('These pages get their own chunk via route-level lazy, but their internal tabs/sections would benefit from a SECOND tier of `React.lazy()` inside the page (spec §9.2). Per-page work is **operator-gated** per spec line 224.');
  lines.push('');
  lines.push('| Page | LOC | Spec-named |');
  lines.push('|---|---:|:-:|');
  for (const p of report.splitCandidates) {
    lines.push(`| ${p.rel} | ${p.loc.toLocaleString()} | ${p.isSpecNamed ? '**yes**' : '—'} |`);
  }
  lines.push('');
  lines.push('## Imported-but-unrouted lazyNamed declarations (dead imports)');
  lines.push('');
  const routedSet = new Set(report.routes.filter((r) => r.pageRef).map((r) => r.pageRef));
  const unrouted = report.lazyNamed.filter((l) => !routedSet.has(l.name));
  if (unrouted.length === 0) {
    lines.push('_(none — every lazyNamed() declaration is referenced by at least one route element.)_');
  } else {
    lines.push('| Declaration | Import |');
    lines.push('|---|---|');
    for (const u of unrouted) {
      lines.push(`| \`${u.name}\` | \`${u.importPath}\` |`);
    }
  }
  lines.push('');
  lines.push('## Findings (R12 — fail-loud, surface-only)');
  lines.push('');
  if (report.findings.length === 0) {
    lines.push('_(no automated findings.)_');
  } else {
    for (const f of report.findings) {
      lines.push(`- **${f.severity}** — ${f.message}`);
    }
  }
  lines.push('');
  lines.push('## Spec link');
  lines.push('');
  lines.push('Unit: U-B1-LAZY-SPLIT-AUDIT — `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §6 (reframed at line 368) + §9.2.');
  return lines.join('\n');
}

async function main() {
  const appText = await readFile(APP_TSX, 'utf8');
  const routes = extractRouteWrappers(appText);
  if (routes.length === 0) {
    console.error('FATAL: zero <Route element=...> wrappers found in App.tsx — parser broken?');
    process.exit(2);
  }
  const lazyNamed = extractLazyNamedImports(appText);
  const pages = await walkPages(PAGES);
  const splitCandidates = detectSplitCandidates(pages, routes, lazyNamed);
  const report = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    unit: 'U-B1-LAZY-SPLIT-AUDIT',
    slot: 'quebec',
    sourceApp: 'web/src/App.tsx',
    sourcePages: 'web/src/pages/',
    routes,
    lazyRoutes: routes.filter((r) => r.isLazy).length,
    eagerRoutes: routes.filter((r) => !r.isLazy).length,
    lazyNamed,
    lazyNamedCount: lazyNamed.length,
    pagesCount: pages.length,
    splitCandidates,
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
  console.log(`audit-route-lazy-coverage: wrote ${jsonPath} + ${outPath}`);
  console.log(`  ${report.routes.length} routes (${report.lazyRoutes} lazy / ${report.eagerRoutes} eager); ${report.splitCandidates.length} split candidates; ${report.findings.length} findings.`);
}

void main().catch((e) => {
  console.error('audit-route-lazy-coverage fatal:', e.stack || e.message);
  process.exit(1);
});
