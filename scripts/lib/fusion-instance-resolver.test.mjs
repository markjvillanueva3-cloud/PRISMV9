/**
 * Tests for fusion-instance-resolver.mjs — verifies kilo only ever selects a Fusion instance
 * that is scratch-SAFE (capable + zero foreign docs) and REFUSES (fail-loud) otherwise. Mocked
 * topology models the real situation: delta's instance has live CAD docs; kilo's port runs the
 * old add-in. The load-bearing invariant: NEVER choose an instance holding another slot's work.
 *
 *   node --test scripts/lib/fusion-instance-resolver.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyInstance, resolveKiloScratchInstance, parsePorts, DEFAULT_KILO_PORTS,
} from "./fusion-instance-resolver.mjs";

function mockFetch(routes, calls = []) {
  return async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || "GET" });
    for (const [pattern, handler] of Object.entries(routes)) {
      if (String(url).includes(pattern)) return handler(url, opts);
    }
    return { ok: false, status: 404, json: async () => ({ error: "not found" }) };
  };
}
const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const upStatus = () => jsonRes(200, { ok: true });
const docs = (arr) => jsonRes(200, { success: true, count: arr.length, documents: arr });

const DELTA_DOCS = [
  { name: "DIE CASE 2.940 X 3.75 .992 ID", isSaved: true, isModified: false, prismScratch: false },
  { name: "UP SET - OP1 - 5AX SETUP", isSaved: true, isModified: true, prismScratch: false },
];

test("delta's instance (foreign saved CAD docs) is classified UNSAFE", async () => {
  const fetchImpl = mockFetch({ "/status": upStatus, "/documents": () => docs(DELTA_DOCS) });
  const r = await classifyInstance({ port: 18362, fetchImpl });
  assert.equal(r.up, true);
  assert.equal(r.capable, true);
  assert.equal(r.foreignDocs, 2);
  assert.equal(r.safe, false);
  assert.match(r.reason, /UNSAFE|foreign/i);
});

test("old add-in (/documents 404) is UNSAFE (not capable) with a restart hint", async () => {
  const fetchImpl = mockFetch({ "/status": upStatus, "/documents": () => jsonRes(404, { error: "Unknown endpoint" }) });
  const r = await classifyInstance({ port: 18365, fetchImpl });
  assert.equal(r.up, true);
  assert.equal(r.capable, false);
  assert.equal(r.safe, false);
  assert.match(r.reason, /old-addin|restart/i);
});

test("clean new-addin instance (0 docs) is SAFE", async () => {
  const fetchImpl = mockFetch({ "/status": upStatus, "/documents": () => docs([]) });
  const r = await classifyInstance({ port: 18363, fetchImpl });
  assert.equal(r.capable, true);
  assert.equal(r.foreignDocs, 0);
  assert.equal(r.totalDocs, 0);
  assert.equal(r.safe, true);
});

test("scratch-only instance (all PRISM scratch) is SAFE", async () => {
  const scratch = [{ name: "PRISM-SCRATCH-1", isSaved: false, isModified: true, prismScratch: true }];
  const fetchImpl = mockFetch({ "/status": upStatus, "/documents": () => docs(scratch) });
  const r = await classifyInstance({ port: 18363, fetchImpl });
  assert.equal(r.scratchDocs, 1);
  assert.equal(r.foreignDocs, 0);
  assert.equal(r.safe, true);
});

test("a modified-but-unsaved FOREIGN doc still makes the instance UNSAFE (dirty work, not ours)", async () => {
  const dirty = [{ name: "Untitled", isSaved: false, isModified: true, prismScratch: false }];
  const fetchImpl = mockFetch({ "/status": upStatus, "/documents": () => docs(dirty) });
  const r = await classifyInstance({ port: 18363, fetchImpl });
  assert.equal(r.foreignDocs, 1);
  assert.equal(r.safe, false);
});

test("down port → not up, no crash", async () => {
  const fetchImpl = async () => { throw new Error("connect ECONNREFUSED"); };
  const r = await classifyInstance({ port: 18366, fetchImpl });
  assert.equal(r.up, false);
  assert.equal(r.safe, false);
  assert.match(r.reason, /down/i);
});

test("resolveKiloScratchInstance: REFUSES when only delta-instance + old-addin exist (the real situation)", async () => {
  const fetchImpl = mockFetch({
    "127.0.0.1:18362/status": upStatus,
    "127.0.0.1:18362/documents": () => docs(DELTA_DOCS),
    "127.0.0.1:18365/status": upStatus,
    "127.0.0.1:18365/documents": () => jsonRes(404, { error: "Unknown endpoint" }),
  });
  const r = await resolveKiloScratchInstance({ ports: [18365, 18362], fetchImpl });
  assert.equal(r.chosenPort, null, "must NOT choose an instance with delta's docs or an old add-in");
  assert.match(r.refusal, /dedicated Fusion instance|restart/i);
  assert.match(r.refusal, /foreign|old-addin/i);
});

test("resolveKiloScratchInstance: picks the clean instance when one exists", async () => {
  const fetchImpl = mockFetch({
    "127.0.0.1:18365/status": upStatus,
    "127.0.0.1:18365/documents": () => docs([]),       // clean kilo instance
    "127.0.0.1:18362/status": upStatus,
    "127.0.0.1:18362/documents": () => docs(DELTA_DOCS), // delta's — must be skipped
  });
  const r = await resolveKiloScratchInstance({ ports: [18365, 18362], fetchImpl });
  assert.equal(r.chosenPort, 18365);
  assert.equal(r.refusal, null);
});

test("no-fetch-impl → graceful (not up, reasoned)", async () => {
  const r = await classifyInstance({ port: 18365, fetchImpl: null });
  assert.equal(r.up, false);
  assert.equal(r.reason, "no-fetch-impl");
});

test("parsePorts + DEFAULT_KILO_PORTS", () => {
  // kilo's pinned port (:18361) probes first; :18362 is delta-owned and NOT in the default probe order
  // (reference_fusion_port_assignment_kilo_18361_2026_06_02).
  assert.deepEqual(DEFAULT_KILO_PORTS, [18361, 18365]);
  assert.ok(!DEFAULT_KILO_PORTS.includes(18362), "delta's :18362 must not be a default kilo probe port");
  assert.deepEqual(parsePorts("18370,18371"), [18370, 18371]);
  assert.deepEqual(parsePorts(""), DEFAULT_KILO_PORTS);
  assert.deepEqual(parsePorts("junk,-1"), DEFAULT_KILO_PORTS);
});
