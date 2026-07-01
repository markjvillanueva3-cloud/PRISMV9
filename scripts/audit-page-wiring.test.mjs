// Tests for audit-page-wiring.mjs classifier core.
// Run directly: node scripts/audit-page-wiring.test.mjs  (node:test auto-runs on exit;
// `node --test <file>` reports 0 tests in this env -- see RECENT-REGRESSIONS 2026-06-17.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPage, inferDomain, STATIC_OK,
  classifyPageTransitive, hasBackendPath, extractRelativeImports,
  childHasBackendWiring, stripComments,
} from './audit-page-wiring.mjs';

const WIRED_SRC = `
import { useQuery } from '@tanstack/react-query';
import { listEmployees } from '../api/erp';
export default function P() {
  const q = useQuery({ queryKey: ['e'], queryFn: () => listEmployees() });
  return null;
}`;

const DEAD_SRC = `
import React from 'react';
const rows = [{ id: 1, name: 'ACME' }, { id: 2, name: 'BETA' }];
export default function P() { return rows.map(r => r.name); }`;

const IMPORT_ONLY_SRC = `
import { vendorList } from '../api/erp';
export default function P() { return null; } // imported but never called`;

const RAW_FETCH_SRC = `
export default function P() {
  fetch('/api/v1/cam', { method: 'POST' });
  return null;
}`;

const MIXED_DEAD_SRC = `
import { useQuery } from '@tanstack/react-query';
import { getStuff } from '../api/data';
const mockRows = [];
export default function P() {
  const q = useQuery({ queryKey: ['s'], queryFn: getStuff });
  const x = Math.random();
  return null;
}`;

const WIRED_ONE_SIGNAL_SRC = `
import { useQuery } from '@tanstack/react-query';
import { getStuff } from '../api/data';
// NOTE: replace mockFallback once seeded
export default function P() {
  const q = useQuery({ queryKey: ['s'], queryFn: getStuff });
  return null;
}`;

test('wired: api import + useQuery -> wired', () => {
  const r = classifyPage('EmployeeDirectoryPage.tsx', WIRED_SRC);
  assert.equal(r.status, 'wired');
  assert.deepEqual(r.apiModules, ['erp']);
  assert.equal(r.domain, 'business-erp');
});

test('dead: no api import, no fetch -> dead', () => {
  const r = classifyPage('SomeWidgetPage.tsx', DEAD_SRC);
  assert.equal(r.status, 'dead');
  assert.deepEqual(r.apiModules, []);
});

test('wired: imports an api client (no mock) -> wired (backend path present)', () => {
  const r = classifyPage('VendorScorecardPage.tsx', IMPORT_ONLY_SRC);
  assert.equal(r.status, 'wired');
  assert.deepEqual(r.apiModules, ['erp']);
});

test('wired: raw /api fetch is a backend path, flagged rawFetchApi for client-migration', () => {
  const r = classifyPage('LathePrintToProgram.tsx', RAW_FETCH_SRC);
  assert.equal(r.status, 'wired');
  assert.equal(r.rawFetchApi, true);
});

test('wired: lazy/code-split via dynamic import("../api/...") -> wired (P2 false-negative fix)', () => {
  const src = `export default function P(){ useEffect(()=>{ import('../api/client').then(m=>m.getMaterial('x')); },[]); return null; }`;
  const r = classifyPage('ViewerPage.tsx', src);
  assert.equal(r.status, 'wired');
});

test('partial: wired but >=2 dead signals (mixed live+dead panels) -> partial', () => {
  const r = classifyPage('DashboardPage.tsx', MIXED_DEAD_SRC);
  assert.equal(r.status, 'partial');
  assert.ok(r.deadSignals.includes('math-random'));
  assert.ok(r.deadSignals.includes('mock-identifier'));
});

test('wired survives a single incidental dead signal (1 < 2 threshold)', () => {
  const r = classifyPage('SfcCalculatorPage.tsx', WIRED_ONE_SIGNAL_SRC);
  assert.equal(r.status, 'wired');
  assert.equal(r.deadSignals.length, 1);
});

test('static-ok: known auth/marketing shell needs no backend', () => {
  assert.ok(STATIC_OK.has('LoginPage.tsx'));
  const r = classifyPage('LoginPage.tsx', 'export default function P(){return null}');
  assert.equal(r.status, 'static-ok');
});

test('inferDomain maps representative pages', () => {
  assert.equal(inferDomain('SfcCalculatorPage.tsx'), 'sfc');
  assert.equal(inferDomain('QuoteBuilderPage.tsx'), 'quoting');
  assert.equal(inferDomain('PayrollPage.tsx'), 'business-erp');
  assert.equal(inferDomain('LatheStudioPage.tsx'), 'lathe');
  assert.equal(inferDomain('WireEdmStudioPage.tsx'), 'wedm');
  assert.equal(inferDomain('ViewerPage.tsx'), 'cad');
  assert.equal(inferDomain('ZzzUnknownPage.tsx'), 'other');
});

test('loc is counted', () => {
  const r = classifyPage('X.tsx', 'a\nb\nc');
  assert.equal(r.loc, 3);
});

// --- transitive (child-component / context) wiring -------------------------
// Map-backed loader so tests need no filesystem. Keys are POSIX-normalized.
function joinPosix(fromFile, spec) {
  const parts = fromFile.split('/').slice(0, -1).concat(spec.split('/'));
  const out = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') out.pop(); else out.push(p);
  }
  return '/' + out.join('/');
}
function mapLoader(map) {
  return (fromFile, spec) => {
    const base = joinPosix(fromFile, spec);
    for (const ext of ['', '.tsx', '.ts']) {
      const key = base + ext;
      if (map[key] != null) return { file: key, content: map[key] };
    }
    return null;
  };
}

// The real-world false positive: a thin wrapper page whose data-fetching lives
// in imported step components (WireEdmStudioPage -> StepImport -> api/wedmStudio).
const WRAPPER_PAGE = `
import StepImport from "../components/wedm-studio/StepImport";
export default function P() { return <StepImport/>; }`;

test('transitive: dead-by-self page wired via a direct child component -> wired', () => {
  const map = {
    '/src/components/wedm-studio/StepImport.tsx': `import { wedmImport } from "../../api/wedmStudio";\nexport default function S(){ wedmImport(); return null; }`,
  };
  const r = classifyPageTransitive('/src/pages/WireEdmStudioPage.tsx', WRAPPER_PAGE, mapLoader(map));
  assert.equal(r.status, 'wired');
  assert.equal(r.wiredTransitive, true);
  assert.equal(r.wiredVia, 'StepImport.tsx');
});

test('transitive: wiring two levels deep (page -> presentational child -> api child)', () => {
  const map = {
    '/src/components/Shell.tsx': `import Inner from "./Inner";\nexport default function Shell(){ return <Inner/>; }`,
    '/src/components/Inner.tsx': `import { getData } from "../api/data";\nexport default function Inner(){ getData(); return null; }`,
  };
  const page = `import Shell from "../components/Shell";\nexport default function P(){ return <Shell/>; }`;
  const r = classifyPageTransitive('/src/pages/SomePage.tsx', page, mapLoader(map), { maxDepth: 2 });
  assert.equal(r.status, 'wired');
  assert.equal(r.wiredTransitive, true);
});

test('transitive: genuinely dead -- child has no backend path anywhere -> stays dead', () => {
  const map = {
    '/src/components/Pure.tsx': `export default function Pure(){ return <div>static</div>; }`,
  };
  const page = `import Pure from "../components/Pure";\nexport default function P(){ return <Pure/>; }`;
  const r = classifyPageTransitive('/src/pages/DeadPage.tsx', page, mapLoader(map));
  assert.equal(r.status, 'dead');
  assert.equal(r.wiredTransitive, undefined);
});

test('transitive: import cycle (A<->B, no backend) terminates -> dead', () => {
  const map = {
    '/src/components/A.tsx': `import B from "./B";\nexport default function A(){ return <B/>; }`,
    '/src/components/B.tsx': `import A from "./A";\nexport default function B(){ return <A/>; }`,
  };
  const page = `import A from "../components/A";\nexport default function P(){ return <A/>; }`;
  const r = classifyPageTransitive('/src/pages/CyclePage.tsx', page, mapLoader(map));
  assert.equal(r.status, 'dead');
});

test('transitive: a non-dead page short-circuits (no graph walk)', () => {
  // WIRED_SRC already has a direct api import -> classifyPage returns wired; loader must never run.
  let called = false;
  const r = classifyPageTransitive('/src/pages/EmployeeDirectoryPage.tsx', WIRED_SRC, () => { called = true; return null; });
  assert.equal(r.status, 'wired');
  assert.equal(r.wiredTransitive, undefined);
  assert.equal(called, false);
});

test('hasBackendPath detects api import, barrel, raw fetch, dynamic import', () => {
  assert.equal(hasBackendPath(`import { x } from "../api/erp";`), true);
  assert.equal(hasBackendPath(`import { x } from "../hooks/useThing";`), true);
  assert.equal(hasBackendPath(`import { x } from "../api";`), true);
  assert.equal(hasBackendPath(`fetch('/api/v1/cam');`), true);
  assert.equal(hasBackendPath(`import('../api/client');`), true);
  assert.equal(hasBackendPath(`export default function P(){ return null; }`), false);
});

test('extractRelativeImports picks relative specifiers only (not bare packages)', () => {
  const src = `import a from "../components/A";\nimport b from "./B";\nimport c from "react";\nimport('../api/x');`;
  const rels = extractRelativeImports(src);
  assert.ok(rels.includes('../components/A'));
  assert.ok(rels.includes('./B'));
  assert.ok(rels.includes('../api/x'));
  assert.ok(!rels.includes('react'));
});

// --- childHasBackendWiring: stricter transitive detector (P1 false-positive fix) ---
test('childHasBackendWiring: named api-client import + call -> true', () => {
  assert.equal(childHasBackendWiring(`import { wedmImport } from "../../api/wedmStudio";\nwedmImport();`), true);
});

test('childHasBackendWiring: default api-client import + member call -> true', () => {
  assert.equal(childHasBackendWiring(`import wedmStudio from "../../api/wedmStudio";\nwedmStudio.optimize();`), true);
});

test('childHasBackendWiring: bare api import with NO call -> false (stricter than page level)', () => {
  assert.equal(childHasBackendWiring(`import { foo } from "../api/wedmStudio";\nexport const x = 1;`), false);
});

test('childHasBackendWiring: UI hook (useHaptics) imported AND called -> false (not data)', () => {
  assert.equal(childHasBackendWiring(`import { useHaptics } from "../../hooks/useHaptics";\nuseHaptics();`), false);
});

test('childHasBackendWiring: api INFRA util (requestCore.describeApiError) called -> false', () => {
  assert.equal(childHasBackendWiring(`import { describeApiError } from "../api/requestCore";\ndescribeApiError(e);`), false);
});

test('childHasBackendWiring: react-query hook and raw /api fetch -> true', () => {
  assert.equal(childHasBackendWiring(`import { useQuery } from "@tanstack/react-query";\nuseQuery({queryKey:['x'],queryFn:f});`), true);
  assert.equal(childHasBackendWiring(`fetch('/api/v1/edm');`), true);
});

test('childHasBackendWiring: commented-out api import+call -> false (stripComments)', () => {
  assert.equal(childHasBackendWiring(`// import { foo } from "../api/wedmStudio";\n// foo();`), false);
});

test('childHasBackendWiring: types-only contracts seam -> false (no runtime data op)', () => {
  // Real operating-system/contracts.ts shape: type imports + a type-position dynamic import.
  const src = `import type { Employee, Job } from '../../api/types';\nexport type { Job } from '../../api/types';\nexport interface X { p: import('../../api/types').ProcessType; }`;
  assert.equal(childHasBackendWiring(src), false);
});

test('childHasBackendWiring: import type {Foo} used as array type -> false (not a call)', () => {
  assert.equal(childHasBackendWiring(`import type { Foo } from "../api/wedmStudio";\nconst xs: Foo[] = [];`), false);
});

test('stripComments removes block + full-line comments, keeps code and URLs', () => {
  assert.equal(stripComments(`/* x */const a=1;`).includes('x'), false);
  assert.equal(stripComments(`// dead\nconst a=1;`).includes('dead'), false);
  assert.ok(stripComments(`const u = 'https://api.example';`).includes('https://api.example'));
});

test('transitive: child imports UI hook only (haptics) -> page stays DEAD (P1 guard)', () => {
  const map = {
    '/src/components/WorkspacePrimitives.tsx': `import { useHaptics } from "../hooks/useHaptics";\nexport default function W(){ useHaptics(); return null; }`,
  };
  const page = `import W from "../components/WorkspacePrimitives";\nexport default function P(){ return <W/>; }`;
  const r = classifyPageTransitive('/src/pages/ValueStreamPage.tsx', page, mapLoader(map));
  assert.equal(r.status, 'dead');
});

test('transitive: child imports api INFRA only (requestCore) -> page stays DEAD (P1 guard)', () => {
  const map = {
    '/src/components/LoadingState.tsx': `import { describeApiError } from "../api/requestCore";\nexport default function L({e}){ return describeApiError(e); }`,
  };
  const page = `import L from "../components/LoadingState";\nexport default function P(){ return <L/>; }`;
  const r = classifyPageTransitive('/src/pages/EmployeePortalPage.tsx', page, mapLoader(map));
  assert.equal(r.status, 'dead');
});
