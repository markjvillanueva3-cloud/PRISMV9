// Tests for erp-live-smoke.mjs pure classifier core.
// Run directly: node scripts/erp-live-smoke.test.mjs  (node:test auto-runs on exit;
// `node --test <file>` reports 0 tests in this env -- see RECENT-REGRESSIONS 2026-06-17.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGetRoutes, substituteParams, unwrapMcpContent, classifyResponse, SAMPLE_PARAMS,
} from './erp-live-smoke.mjs';

// ---- parseGetRoutes ----------------------------------------------------------
const ROUTE_SRC = `
  router.get("/operations-kpis", verifyToken, async (req, res) => {});
  router.post("/payroll-run", verifyToken, requireRole("hr_manager"), bizRoute(callTool, "run_payroll"));
  router.get('/value-stream/:jobId', verifyToken, async (req, res) => {});
  router.get("/gl-trial-balance", verifyToken, requireRole("admin"), async (req, res) => {});
  router.patch("/root-cause-action-status", verifyToken, bizRoute(callTool, "x"));
`;

test('parseGetRoutes extracts only GET routes, ignores POST/PATCH', () => {
  const routes = parseGetRoutes(ROUTE_SRC);
  const paths = routes.map((r) => r.path);
  assert.deepEqual(paths, ['/operations-kpis', '/value-stream/:jobId', '/gl-trial-balance']);
});

test('parseGetRoutes flags requireRole on the line', () => {
  const routes = parseGetRoutes(ROUTE_SRC);
  const tb = routes.find((r) => r.path === '/gl-trial-balance');
  const vs = routes.find((r) => r.path === '/value-stream/:jobId');
  assert.equal(tb.requiresRole, true);
  assert.equal(vs.requiresRole, false);
});

test('parseGetRoutes returns [] on empty / non-matching source', () => {
  assert.deepEqual(parseGetRoutes(''), []);
  assert.deepEqual(parseGetRoutes('const x = 1; router.post("/a", h);'), []);
});

// ---- substituteParams --------------------------------------------------------
test('substituteParams replaces known params with sample values', () => {
  assert.equal(substituteParams('/value-stream/:jobId'), '/value-stream/JOB-1001');
  assert.equal(substituteParams('/a/:employeeId/b/:id'), '/a/EMP-001/b/1');
});

test('substituteParams uses SAMPLE for unknown params and passes through param-less paths', () => {
  assert.equal(substituteParams('/widget/:weirdParam'), '/widget/SAMPLE');
  assert.equal(substituteParams('/operations-kpis'), '/operations-kpis');
});

test('SAMPLE_PARAMS covers the common business id shapes', () => {
  for (const k of ['jobId', 'job_id', 'employeeId', 'machineId', 'id']) {
    assert.ok(SAMPLE_PARAMS[k], `missing sample for :${k}`);
  }
});

// ---- unwrapMcpContent --------------------------------------------------------
test('unwrapMcpContent parses an MCP text-wrapper to the real object', () => {
  // Real shape observed live from callTool() via /erp/kaizen-suggestions.
  assert.deepEqual(unwrapMcpContent({ type: 'text', text: '{"success":true,"data":[]}' }),
    { success: true, data: [] });
});

test('unwrapMcpContent handles an array of content blocks', () => {
  assert.deepEqual(unwrapMcpContent([{ type: 'text', text: '{"a":1}' }]), { a: 1 });
});

test('unwrapMcpContent returns raw text when the wrapper text is not JSON', () => {
  assert.equal(unwrapMcpContent({ type: 'text', text: 'hello world' }), 'hello world');
});

test('unwrapMcpContent passes through a plain object and null', () => {
  assert.deepEqual(unwrapMcpContent({ a: 1 }), { a: 1 });
  assert.equal(unwrapMcpContent(null), null);
});

// ---- classifyResponse (the dead-wire signal) --------------------------------
test('classifyResponse: 501 stub -> ERROR (real dead-wire, observed live on /erp/cash-flow)', () => {
  assert.equal(classifyResponse({ status: 501, body: { ok: false, error: 'Not implemented' } }).status, 'ERROR');
});

test('classifyResponse: inner "Unknown business action" -> ERROR (observed live on /erp/revenue-forecast)', () => {
  const body = { ok: true, data: { type: 'text', text: '{"error":"Unknown business action: revenue_forecast"}' } };
  const v = classifyResponse({ status: 200, body });
  assert.equal(v.status, 'ERROR');
  assert.match(v.reason, /Unknown business action/);
});

test('classifyResponse: 500 -> ERROR; ok:false envelope -> ERROR', () => {
  assert.equal(classifyResponse({ status: 500, body: null }).status, 'ERROR');
  assert.equal(classifyResponse({ status: 200, body: { ok: false, error: 'boom' } }).status, 'ERROR');
});

test('classifyResponse: healthy non-empty payload -> OK (both {ok,data} and {result} envelopes)', () => {
  assert.equal(classifyResponse({ status: 200, body: { ok: true, data: { rows: [1, 2] } } }).status, 'OK');
  assert.equal(classifyResponse({ status: 200, body: { result: { total: 5 } } }).status, 'OK');
  // wrapped real data
  assert.equal(classifyResponse({ status: 200, body: { ok: true, data: { type: 'text', text: '{"items":[1]}' } } }).status, 'OK');
});

test('classifyResponse: data_available:false -> EMPTY (honest empty, observed live on /erp/value-stream)', () => {
  const body = { ok: true, data: { type: 'text', text: '{"data_available":false,"job_id":"JOB-1001"}' } };
  assert.equal(classifyResponse({ status: 200, body }).status, 'EMPTY');
});

test('classifyResponse: empty arrays / empty inner data -> EMPTY (observed live on /erp/kaizen-suggestions)', () => {
  assert.equal(classifyResponse({ status: 200, body: { ok: true, data: [] } }).status, 'EMPTY');
  const kaizen = { ok: true, data: { type: 'text', text: '{"success":true,"data":[]}' } };
  assert.equal(classifyResponse({ status: 200, body: kaizen }).status, 'EMPTY');
});

test('classifyResponse: inner success:false -> DENIED (valid business denial, not a bug)', () => {
  const body = { ok: true, data: { success: false, message: 'tool out of stock' } };
  const v = classifyResponse({ status: 200, body });
  assert.equal(v.status, 'DENIED');
  assert.match(v.reason, /out of stock/);
});

test('classifyResponse: 404/400 (synthetic param) -> EMPTY, not ERROR (no false alarms)', () => {
  assert.equal(classifyResponse({ status: 404, body: null }).status, 'EMPTY');
  assert.equal(classifyResponse({ status: 400, body: { error: 'missing field' } }).status, 'EMPTY');
});

test('classifyResponse: 401/403 -> AUTH; network failure -> UNREACHABLE', () => {
  assert.equal(classifyResponse({ status: 401, body: null }).status, 'AUTH');
  assert.equal(classifyResponse({ status: 403, body: null }).status, 'AUTH');
  assert.equal(classifyResponse({ networkError: 'ECONNREFUSED' }).status, 'UNREACHABLE');
});
