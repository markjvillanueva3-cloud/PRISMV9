#!/usr/bin/env node
/**
 * audit-page-wiring.mjs -- per-PAGE backend-wiring liveness audit for the PRISM SPA.
 *
 * The THIRD seam in the FE<->BE wiring stack. The two existing audits cover:
 *   - audit-frontend-backend-contract.mjs : does a backend ROUTE exist for each SPA /api prefix?
 *   - audit-fe-route-action-contract.mjs  : does each route's callTool action exist on its dispatcher?
 * Neither answers: does each PAGE actually CALL a real api client / fetch live /api data, or does it
 * render hardcoded/mock/empty data (a "dead page")? That is this auditor. It is the buildable-queue
 * seed for the FE->BE wiring goal and is re-runnable (cron-friendly).
 *
 * Distinct from the engine->dispatcher "wiring-audit" family (audit-unwired-engines.mjs,
 * stop-wiring-audit-suggest): those check backend engine consumption; this checks SPA page data flow.
 *
 * Heuristic + CONSERVATIVE (R12): it NARROWS the search to candidates; it does not pass final
 * judgement. A 'dead' classification means "no detected backend call" -- confirm before wiring.
 *
 * Usage:
 *   node scripts/audit-page-wiring.mjs            # write JSON+MD, print summary
 *   node scripts/audit-page-wiring.mjs --json     # print JSON to stdout
 *   node scripts/audit-page-wiring.mjs --dead     # print only dead/partial candidates
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Repo root: this file lives at <root>/scripts/, so root = parent of __dirname.
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const PAGES_DIR = join(ROOT, 'mcp-server', 'web', 'src', 'pages');
const OUT_JSON = join(ROOT, 'state', 'shared', 'dashboards', 'PAGE-WIRING-AUDIT.json');
const OUT_MD = join(ROOT, 'state', 'shared', 'dashboards', 'PAGE-WIRING-AUDIT.md');

// Pages that legitimately need no backend data on load (auth shells, marketing, gateways).
export const STATIC_OK = new Set([
  'LoginPage.tsx', 'SignupPage.tsx', 'LandingPage.tsx', 'IndexGateway.tsx',
  'SettingsPage.tsx', 'SubscriptionPage.tsx', 'PricingPage.tsx', 'CheckoutOutcomePage.tsx',
  'ShellGatewayPage.tsx', 'FeatureTogglePage.tsx',
]);

// --- detection patterns ------------------------------------------------------
// A page is WIRED when it both (a) imports an api/* or hooks/* client AND (b) actually calls it.
const RE_API_IMPORT = /from\s+['"][^'"]*\/(?:api|hooks)\/[A-Za-z0-9_.-]+['"]/g;
const RE_API_BARREL = /from\s+['"][^'"]*\/api['"]/;            // import ... from '../api'
const RE_FETCH_USE = /\bfetch\(\s*[`'"]\/api\b/;               // raw fetch('/api...')
const RE_CLIENT_USE = /\b(?:useQuery|useMutation|useInfiniteQuery|useSuspenseQuery)\s*\(/;
const RE_REQUEST_USE = /\b(?:request|requestData|fetchJson|apiGet|apiPost|callTool)\s*\(/;
// Lazy/code-split wiring: `await import('../api/client')` / `import('../hooks/useX')` (e.g. ViewerPage, CalculatorPage).
const RE_DYNAMIC_IMPORT = /import\(\s*['"][^'"]*\/(?:api|hooks)\/[A-Za-z0-9_.-]+['"]\s*\)/;

// Conservative dead/mock signals. Each match is reported as a labeled candidate string.
const DEAD_SIGNALS = [
  ['math-random', /\bMath\.random\s*\(/],
  ['mock-identifier', /\bmock[A-Z][A-Za-z0-9_]*/],
  ['MOCK_const', /\bMOCK_[A-Z0-9_]+/],
  ['sample-data', /\bsample(?:Data|Rows|Items|Records)\b/i],
  ['demo-data', /\bdemo(?:Data|Rows|Items)\b/i],
  ['coming-soon', /coming soon/i],
  ['placeholder-data', /\bplaceholder data\b/i],
  ['todo-wiring', /(?:TODO|FIXME)[^\n]*\b(?:wir(?:e|ing)|api|backend|endpoint|hook ?up|stub)\b/i],
  ['hardcoded-note', /\bhard[- ]?coded\b/i],
];

const DOMAIN_RULES = [
  [/sfc|speedfeed|calculator/i, 'sfc'],
  [/quote|quoting|cost|estimat|vendor|pricing|rfq|marketprice/i, 'quoting'],
  // NB: short tokens (erp/hr) are anchored to avoid mid-word false matches (viewERPage, tHRead).
  [/erpdashboard|payroll|employee|invoice|ledger|hrcompliance|customer|commission|capacity|kanban|kaizen|oee|order|purchas|inventory|receiving|shipping|equipment|maintenance|a3report|rootcause|financial|jobprofit|department|executive|dailyflash|timecard|business|hotel/i, 'business-erp'],
  [/lathe|turning|swiss|millturn/i, 'lathe'],
  [/wireedm|wedm|edm/i, 'wedm'],
  [/mill|milling/i, 'mill'],
  [/cam|toolpath|postprocessor|ppg|setupsheet|proveout|programrelease/i, 'cam-post'],
  [/cad|mechanical|viewer|geometry|blueprint|partslibrary/i, 'cad'],
  [/course|learning|knowledge|academy/i, 'academy'],
  [/quality|spc|calibration|osha|complianc|audit|receivinginspection/i, 'quality'],
  [/shopfloor|machinelive|telemetry|cncops|alarm|diagnosis|safety|vibration|thermal/i, 'shop-floor'],
];

export function inferDomain(name) {
  for (const [re, dom] of DOMAIN_RULES) if (re.test(name)) return dom;
  return 'other';
}

/**
 * Pure classifier. Given a page filename + its source, return a classification record.
 * status: 'wired' | 'partial' | 'dead' | 'static-ok'
 */
export function classifyPage(name, content) {
  const loc = content.split('\n').length;
  const apiModules = [...content.matchAll(RE_API_IMPORT)]
    .map((m) => m[0].match(/\/(?:api|hooks)\/([A-Za-z0-9_.-]+)/)?.[1])
    .filter(Boolean);
  const usesBarrel = RE_API_BARREL.test(content);
  const hasImport = apiModules.length > 0 || usesBarrel;
  const hasFetchApi = RE_FETCH_USE.test(content);
  const hasDynamicApi = RE_DYNAMIC_IMPORT.test(content);
  // Informational: does it use react-query / the request() helpers (vs a direct client call)?
  const hasQueryHook = RE_CLIENT_USE.test(content) || RE_REQUEST_USE.test(content);
  // A page is on a live backend path if it imports an api/hooks client (static OR dynamic) OR raw-fetches /api.
  // (Importing a client = the wiring; pages call it directly in effects, not always via useQuery,
  // so requiring useQuery undercounts massively -- see 2026-06-25 wired=1 false reading.)
  const hasBackendPath = hasImport || hasFetchApi || hasDynamicApi;
  const deadSignals = DEAD_SIGNALS.filter(([, re]) => re.test(content)).map(([label]) => label);

  let status;
  if (STATIC_OK.has(name)) {
    status = 'static-ok';
  } else if (!hasBackendPath) {
    // No api/hooks import and no /api fetch -> renders without a backend call (dead candidate).
    status = 'dead';
  } else if (deadSignals.length >= 2) {
    // Has a backend path but also multiple mock/hardcoded signals -> mixed live+dead panels.
    status = 'partial';
  } else {
    status = 'wired';
  }

  return {
    name,
    domain: inferDomain(name),
    status,
    loc,
    apiModules: [...new Set(apiModules)],
    usesBarrel,
    rawFetchApi: hasFetchApi && !hasImport,
    hasQueryHook,
    deadSignals,
  };
}

// --- transitive (child-component / context) wiring resolution --------------
// BLIND SPOT FIX (2026-06-26): classifyPage inspects ONLY the page file's own
// content. A thin wrapper page that delegates data-fetching to imported child
// components / a context provider (e.g. WireEdmStudioPage -> StepImport ->
// ../../api/wedmStudio) has NO backend call in its own body and was mis-flagged
// 'dead'. Mirrors the engine->engine blind spot fixed in audit-unwired-engines
// ([[reference_audit_wired_via_engine_2026_06_10]]): follow the import graph.
const RE_REL_IMPORT = /(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]+)['"]/g;

/** Backend-path detector reused for CHILD modules (same signals as classifyPage). */
export function hasBackendPath(content) {
  const apiImport = [...content.matchAll(RE_API_IMPORT)].length > 0;
  const barrel = RE_API_BARREL.test(content);
  return apiImport || barrel || RE_FETCH_USE.test(content) || RE_DYNAMIC_IMPORT.test(content);
}

/** Relative ('./' or '../') import/export specifiers in a module's source. */
export function extractRelativeImports(content) {
  return [...content.matchAll(RE_REL_IMPORT)].map((m) => m[1]);
}

// Modules under /api/ that are infra (http wrapper, error formatter, config, types) --
// importing/calling these is NOT data wiring. Reached transitively, they were the P1
// false-positive source (LoadingState -> ../api/requestCore's describeApiError).
const API_INFRA_MODULES = new Set(['requestCore', 'client', 'http', 'apiBase', 'apiConfig', 'config', 'types']);
const RE_IMPORT_FROM_API = /import\s+([^;]*?)\s+from\s+['"][^'"]*\/api\/([A-Za-z0-9_.-]+)['"]/g;

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Strip block + full-line // comments so a commented-out import/call is not counted. */
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

/** Symbols imported from NON-infra /api/<module> data clients (named + default). */
function dataClientSymbols(content) {
  const syms = [];
  for (const m of content.matchAll(RE_IMPORT_FROM_API)) {
    const clause = m[1];
    if (/^\s*type\b/.test(clause)) continue;   // `import type {...}` is type-only, never a data call
    if (API_INFRA_MODULES.has(m[2])) continue;
    const named = clause.match(/\{([^}]*)\}/);
    if (named) {
      for (const part of named[1].split(',')) {
        const name = part.split(/\bas\b/).pop().trim().replace(/^type\s+/, '');
        if (/^[A-Za-z_$][\w$]*$/.test(name)) syms.push(name);
      }
    }
    const def = clause.replace(/\{[^}]*\}/, '').replace(/^\s*type\s+/, '').match(/^\s*([A-Za-z_$][\w$]*)/);
    if (def) syms.push(def[1]);
  }
  return syms;
}

/**
 * Stricter-than-page wiring test for a CHILD module reached transitively. A page-body
 * bare `import ../api/x` is accepted as wired by classifyPage, but transitively a child
 * importing a UI hook (../hooks/useHaptics) or an api infra util (../api/requestCore's
 * describeApiError) must NOT mark the page wired (P1 false-positive fix 2026-06-26). So
 * require an ACTUAL data operation: raw /api fetch, a query hook, a request helper, or a
 * CALL / member-access of a symbol from a non-infra /api client. Type-only imports
 * (`import type`, a type-position `import('../api/types').Foo`) are excluded -- they are
 * compile-time references, not runtime data (e.g. the operating-system contracts.ts seam).
 */
export function childHasBackendWiring(rawContent) {
  const content = stripComments(rawContent);
  if (RE_FETCH_USE.test(content)) return true;
  if (RE_CLIENT_USE.test(content)) return true;
  if (RE_REQUEST_USE.test(content)) return true;
  for (const sym of dataClientSymbols(content)) {
    if (new RegExp(`\\b${escapeRe(sym)}\\s*[(.\\[]`).test(content)) return true;
  }
  return false;
}

/**
 * Classify a page, then -- only if it is 'dead' by its own content -- follow its
 * relative import graph (children/context) to see if wiring lives downstream.
 * loadModule(fromFile, spec) -> {file, content} | null is injected so this is
 * unit-testable without a filesystem. Bounded by maxDepth + fileCap (cycle-safe
 * via a visited set). On a transitive hit: status 'wired', wiredTransitive=true.
 */
export function classifyPageTransitive(file, content, loadModule, opts = {}) {
  const base = classifyPage(file.split(/[\\/]/).pop(), content);
  if (base.status !== 'dead') return base;
  const maxDepth = opts.maxDepth ?? 2;
  const fileCap = opts.fileCap ?? 120;
  const visited = new Set([file]);
  const queue = extractRelativeImports(content).map((spec) => ({ from: file, spec, depth: 1 }));
  let reads = 0;
  while (queue.length) {
    if (reads >= fileCap) break;
    const { from, spec, depth } = queue.shift();
    const mod = loadModule(from, spec);
    if (!mod || visited.has(mod.file)) continue;
    visited.add(mod.file);
    reads++;
    if (childHasBackendWiring(mod.content)) {
      return { ...base, status: 'wired', wiredTransitive: true, wiredVia: mod.file.split(/[\\/]/).pop() };
    }
    if (depth < maxDepth) {
      for (const s of extractRelativeImports(mod.content)) queue.push({ from: mod.file, spec: s, depth: depth + 1 });
    }
  }
  return base; // genuinely dead -- no backend path anywhere in the import graph
}

/**
 * Filesystem-backed loader: resolve a relative TS/TSX import to {file, content}.
 * `confineRoot` (when given) rejects any target resolving outside it, so a deep
 * `../../../package.json`-style escape into the repo root / node_modules cannot be
 * read (P2 defense-in-depth 2026-06-26). Only source extensions are tried.
 */
export function makeFsLoader(confineRoot) {
  const EXTS = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
  const root = confineRoot ? resolve(confineRoot) : null;
  return (fromFile, spec) => {
    const target = resolve(dirname(fromFile), spec);
    if (root && !target.startsWith(root)) return null;
    for (const ext of EXTS) {
      const p = target + ext;
      try {
        if (existsSync(p) && statSync(p).isFile()) return { file: p, content: readFileSync(p, 'utf8') };
      } catch { /* unreadable -> skip */ }
    }
    return null;
  };
}

function walkPages(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkPages(full));
    else if (entry.isFile() && entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

export function main() {
  if (!existsSync(PAGES_DIR)) {
    console.error(`[audit-page-wiring] pages dir not found: ${PAGES_DIR}`);
    process.exit(1);
  }
  const files = walkPages(PAGES_DIR).sort();
  const loadModule = makeFsLoader(join(ROOT, 'mcp-server', 'web', 'src'));
  const records = files.map((f) => classifyPageTransitive(f, readFileSync(f, 'utf8'), loadModule));
  const transitiveWired = records.filter((r) => r.wiredTransitive).length;

  const byStatus = { wired: 0, partial: 0, dead: 0, 'static-ok': 0 };
  for (const r of records) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  const byDomain = {};
  for (const r of records) {
    byDomain[r.domain] ??= { wired: 0, partial: 0, dead: 0, 'static-ok': 0 };
    byDomain[r.domain][r.status]++;
  }

  const queue = records
    .filter((r) => r.status === 'dead' || r.status === 'partial')
    .sort((a, b) => (a.status === b.status ? a.domain.localeCompare(b.domain) : a.status === 'dead' ? -1 : 1));

  const payload = {
    schemaVersion: '1.1.0',
    generatedAt: new Date().toISOString(),
    pagesDir: 'mcp-server/web/src/pages',
    totalPages: records.length,
    byStatus,
    byDomain,
    transitiveWired,
    note: 'CONSERVATIVE heuristic -- "dead" = no backend call in the page OR its child-component/context import graph (depth<=2); confirm before wiring. Route-prefix coverage: audit-frontend-backend-contract.mjs; route->action: audit-fe-route-action-contract.mjs.',
    queue,
    records,
  };

  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));
  writeFileSync(OUT_MD, renderMd(payload));

  const args = process.argv.slice(2);
  if (args.includes('--json')) {
    console.log(JSON.stringify(payload, null, 2));
  } else if (args.includes('--dead')) {
    for (const r of queue) console.log(`${r.status.toUpperCase().padEnd(7)} ${r.domain.padEnd(12)} ${r.name}  ${r.deadSignals.join(',')}`);
  } else {
    console.log(`audit-page-wiring: ${records.length} pages`);
    console.log(`  wired=${byStatus.wired} partial=${byStatus.partial} dead=${byStatus.dead} static-ok=${byStatus['static-ok']}`);
    console.log(`  buildable queue (dead+partial): ${queue.length}`);
    console.log(`  wrote ${OUT_JSON.replace(ROOT, '.')} + ${OUT_MD.replace(ROOT, '.')}`);
  }
  return payload;
}

function renderMd(p) {
  const lines = [];
  lines.push('# PAGE-WIRING-AUDIT');
  lines.push('');
  lines.push('> Deterministic per-page backend-wiring liveness audit (`scripts/audit-page-wiring.mjs`).');
  lines.push(`> Generated: ${p.generatedAt}`);
  lines.push(`> ${p.note}`);
  lines.push('');
  lines.push(`Pages: **${p.totalPages}** -- wired **${p.byStatus.wired}** / partial **${p.byStatus.partial}** / dead **${p.byStatus.dead}** / static-ok **${p.byStatus['static-ok']}**`);
  if (p.transitiveWired) lines.push(`> ${p.transitiveWired} page(s) wired via child-component/context import graph (not a direct call in the page body).`);
  lines.push('');
  lines.push('## By domain');
  lines.push('');
  lines.push('| domain | wired | partial | dead | static-ok |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const [dom, s] of Object.entries(p.byDomain).sort()) {
    lines.push(`| ${dom} | ${s.wired} | ${s.partial} | ${s.dead} | ${s['static-ok']} |`);
  }
  lines.push('');
  lines.push(`## Buildable queue -- dead + partial (${p.queue.length})`);
  lines.push('');
  lines.push('| status | domain | page | LOC | api modules | signals |');
  lines.push('|---|---|---|---:|---|---|');
  for (const r of p.queue) {
    lines.push(`| ${r.status} | ${r.domain} | ${r.name} | ${r.loc} | ${r.apiModules.join(', ') || '-'} | ${r.deadSignals.join(', ') || '-'} |`);
  }
  lines.push('');
  return lines.join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
