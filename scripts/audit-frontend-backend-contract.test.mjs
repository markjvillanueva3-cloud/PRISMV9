// Tests for audit-frontend-backend-contract.mjs pure helpers (reachability classification).
// Run directly: node scripts/audit-frontend-backend-contract.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefixOf, relativeImports, routedPageBasenames, classifyGap } from './audit-frontend-backend-contract.mjs';

test('prefixOf: /api/v1/<domain>', () => {
  assert.equal(prefixOf('/api/v1/tool-crib'), '/api/v1/tool-crib');
  assert.equal(prefixOf('/api/v1/sfc/cycle-time'), '/api/v1/sfc');
});

test('prefixOf: /api/mcp/<domain> and bare /api/<domain>', () => {
  assert.equal(prefixOf('/api/mcp/foo/bar'), '/api/mcp/foo');
  assert.equal(prefixOf('/api/dispatch/cam'), '/api/dispatch');
  assert.equal(prefixOf('/api/prism'), '/api/prism');
});

test('prefixOf: non-/api path -> null', () => {
  assert.equal(prefixOf('/health'), null);
  assert.equal(prefixOf('/v1/api/x'), null);
});

test('relativeImports: relative specifiers only, incl dynamic + export-from', () => {
  const src = `import A from "../pages/A";\nimport { b } from "./util";\nimport x from "react";\nexport { z } from "../api/z";\nawait import("./lazy");`;
  const rels = relativeImports(src);
  assert.ok(rels.includes('../pages/A'));
  assert.ok(rels.includes('./util'));
  assert.ok(rels.includes('../api/z'));
  assert.ok(rels.includes('./lazy'));
  assert.ok(!rels.includes('react'));
});

test('routedPageBasenames: static + lazy ./pages/ imports -> basenames', () => {
  const app = `
import Dashboard from "./pages/DashboardPage";
const Lathe = lazy(() => import("./pages/LatheWizardPage"));
import { Foo } from "../other/NotAPage";
`;
  const routed = routedPageBasenames(app);
  assert.ok(routed.has('DashboardPage.tsx'));
  assert.ok(routed.has('LatheWizardPage.tsx'));
  assert.equal(routed.has('NotAPage.tsx'), false);
});

test('routedPageBasenames: an unrouted page is absent (the orphan signal)', () => {
  const app = `import Dashboard from "./pages/DashboardPage";`;
  const routed = routedPageBasenames(app);
  assert.equal(routed.has('LathePrintToProgram.tsx'), false); // unrouted -> orphan
});

test('classifyGap: live when a referencing file is reachable', () => {
  const reachable = new Set(['/src/pages/DashboardPage.tsx', '/src/api/erp.ts']);
  assert.equal(classifyGap(['/src/api/erp.ts'], reachable), 'live');
  assert.equal(classifyGap(['/src/pages/DashboardPage.tsx', '/src/api/dead.ts'], reachable), 'live');
});

test('classifyGap: orphan when ALL referencing files are unreachable (dead code)', () => {
  const reachable = new Set(['/src/pages/DashboardPage.tsx']);
  // latheAI.ts imported by no routed page; LathePrintToProgram.tsx unrouted -> both orphan.
  assert.equal(classifyGap(['/src/api/latheAI.ts', '/src/pages/LathePrintToProgram.tsx'], reachable), 'orphan');
});

test('classifyGap: empty referencing list -> orphan (no live caller)', () => {
  assert.equal(classifyGap([], new Set(['/x'])), 'orphan');
});
