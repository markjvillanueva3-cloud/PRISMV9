/**
 * Tests for fusion-scratch-close.mjs — verifies the fail-soft probe/close decision
 * logic against a mocked Fusion bridge (no live Fusion needed). The invariants under
 * test are the SAFETY ones: never close on the wrong port, never request a save on
 * scratch, no-op gracefully when Fusion is down or the add-in is old.
 *
 *   node --test scripts/lib/fusion-scratch-close.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  probeAndClose,
  closeFusionScratch,
  parsePorts,
  DEFAULT_PORTS,
} from "./fusion-scratch-close.mjs";

/** Build a mock fetch from a route->handler map. Records every call. */
function mockFetch(routes, calls = []) {
  return async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || "GET", body: opts.body });
    for (const [pattern, handler] of Object.entries(routes)) {
      if (String(url).includes(pattern)) return handler(url, opts);
    }
    return { ok: false, status: 404, json: async () => ({ error: "not found" }) };
  };
}
const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("Fusion down (ECONNREFUSED) → up:false, error 'down', no close attempted", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    throw new Error("connect ECONNREFUSED 127.0.0.1:18365");
  };
  const r = await probeAndClose({ port: 18365, fetchImpl });
  assert.equal(r.up, false);
  assert.equal(r.error, "down");
  assert.equal(r.closed, 0);
  assert.equal(calls.length, 1, "only the status probe is attempted when down");
});

test("old add-in (status OK, /documents 404) → capable:false, restart hint, no close POST", async () => {
  const calls = [];
  const fetchImpl = mockFetch({
    "/status": () => jsonRes(200, { ok: true }),
    "/documents": () => jsonRes(404, { error: "Unknown endpoint" }),
  }, calls);
  const r = await probeAndClose({ port: 18365, fetchImpl });
  assert.equal(r.up, true);
  assert.equal(r.capable, false);
  assert.match(r.error, /restart Fusion/i);
  assert.ok(!calls.some((c) => c.method === "POST"), "must NOT POST /doc/close to an old add-in");
});

test("capable, zero scratch docs → no close POST", async () => {
  const calls = [];
  const fetchImpl = mockFetch({
    "/status": () => jsonRes(200, { ok: true }),
    "/documents": () => jsonRes(200, { count: 2, scratchCount: 0, registeredScratch: 0 }),
  }, calls);
  const r = await probeAndClose({ port: 18365, fetchImpl });
  assert.equal(r.capable, true);
  assert.equal(r.scratchCount, 0);
  assert.equal(r.closed, 0);
  assert.ok(!calls.some((c) => c.method === "POST"), "no close when nothing to close");
});

test("capable, 3 scratch docs → closes 3, requests target=scratch (never saveChanges)", async () => {
  const calls = [];
  const fetchImpl = mockFetch({
    "/status": () => jsonRes(200, { ok: true }),
    "/documents": () => jsonRes(200, { count: 5, scratchCount: 3 }),
    "/doc/close": () => jsonRes(200, { closed: ["PRISM-SCRATCH-1", "PRISM-SCRATCH-2", "PRISM-SCRATCH-3"], closedCount: 3, skipped: [] }),
  }, calls);
  const r = await probeAndClose({ port: 18365, fetchImpl });
  assert.equal(r.closed, 3);
  assert.deepEqual(r.closedNames, ["PRISM-SCRATCH-1", "PRISM-SCRATCH-2", "PRISM-SCRATCH-3"]);
  const closeCall = calls.find((c) => c.url.includes("/doc/close"));
  assert.ok(closeCall, "issued a close POST");
  const sentBody = JSON.parse(closeCall.body);
  assert.equal(sentBody.target, "scratch", "must target scratch only");
  assert.notEqual(sentBody.saveChanges, true, "must NEVER request saveChanges on scratch");
});

test("R12: /documents 200 with error envelope → loud bad-shape error, NEVER silent 0-scratch", async () => {
  // This is the class of bug that masked the _nav_safe scope defect: the add-in
  // returned {error,traceback} at HTTP 200; the old code read it as scratchCount:0.
  const calls = [];
  const fetchImpl = mockFetch({
    "/status": () => jsonRes(200, { ok: true }),
    "/documents": () => jsonRes(200, { error: "name '_nav_safe' is not defined", traceback: "..." }),
    "/doc/close": () => { throw new Error("must not close on a bad /documents shape"); },
  }, calls);
  const r = await probeAndClose({ port: 18365, fetchImpl });
  assert.equal(r.capable, false, "a broken endpoint is NOT 'capable'");
  assert.match(r.error, /bad-shape/, "surfaces the bad shape loudly");
  assert.equal(r.closed, 0);
  assert.ok(!calls.some((c) => c.method === "POST"), "must NOT attempt close on a bad /documents shape");
});

test("dryRun → reports scratchCount but never closes", async () => {
  const calls = [];
  const fetchImpl = mockFetch({
    "/status": () => jsonRes(200, { ok: true }),
    "/documents": () => jsonRes(200, { count: 4, scratchCount: 4 }),
    "/doc/close": () => { throw new Error("should not be called in dryRun"); },
  }, calls);
  const r = await probeAndClose({ port: 18365, fetchImpl, dryRun: true });
  assert.equal(r.scratchCount, 4);
  assert.equal(r.closed, 0);
  assert.ok(!calls.some((c) => c.method === "POST"), "dryRun must not POST");
});

test("closeFusionScratch defaults to ONLY :18365 (never delta :18362)", async () => {
  const calls = [];
  const fetchImpl = mockFetch({
    "/status": () => jsonRes(200, { ok: true }),
    "/documents": () => jsonRes(200, { count: 1, scratchCount: 1 }),
    "/doc/close": () => jsonRes(200, { closedCount: 1, closed: ["PRISM-SCRATCH-1"] }),
  }, calls);
  assert.deepEqual(DEFAULT_PORTS, [18365]);
  const r = await closeFusionScratch({ fetchImpl });
  assert.equal(r.totalClosed, 1);
  assert.ok(calls.every((c) => c.url.includes("18365")), "must only ever touch :18365 by default");
  assert.ok(!calls.some((c) => c.url.includes("18362")), "must NEVER touch delta :18362");
});

test("parsePorts: env override, fallback, junk-filtering", () => {
  assert.deepEqual(parsePorts(""), DEFAULT_PORTS);
  assert.deepEqual(parsePorts(undefined), DEFAULT_PORTS);
  assert.deepEqual(parsePorts("18365"), [18365]);
  assert.deepEqual(parsePorts("18365, 18362"), [18365, 18362]);
  assert.deepEqual(parsePorts("abc, -1, 99999999"), DEFAULT_PORTS, "all-junk → fallback");
  assert.deepEqual(parsePorts("18365, abc"), [18365], "drops junk, keeps valid");
});

test("missing fetch impl → graceful no-op", async () => {
  // null (not undefined — undefined would trigger the param default globalThis.fetch)
  const r = await probeAndClose({ port: 18365, fetchImpl: null });
  assert.equal(r.up, false);
  assert.equal(r.error, "no-fetch-impl");
});
