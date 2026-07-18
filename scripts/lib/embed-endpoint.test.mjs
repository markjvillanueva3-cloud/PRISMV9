// scripts/lib/embed-endpoint.test.mjs -- U-INDIA-EMBED-LANE
// node --test scripts/lib/embed-endpoint.test.mjs
//
// All IO injected (fetchImpl/execImpl/read/write/exists) -- no live Ollama, no
// real tmpdir sidecar. Reference behaviors: lane-up -> LANE_URL + CPU pin;
// every failure shape (timeout, non-200, throw, kill switch, stale/corrupt
// cache) -> MAIN_URL with today's exact body untouched.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAIN_URL, LANE_URL, withLaneOptions, verdictFresh, laneDisabled,
  laneMisconfigured, recordLaneVerdict, withMainFallback,
  resolveEmbedUrl, resolveEmbedUrlSync, PROBE_TTL_MS,
} from "./embed-endpoint.mjs";

const NOW = 1_800_000_000_000;
const freshCache = (laneUp) => JSON.stringify({ schemaVersion: 1, laneUp, at: NOW - 1000 });
const noCache = { existsImpl: () => false, writeImpl: () => {} };

// ---- withLaneOptions (pure) -------------------------------------------------

test("withLaneOptions pins num_gpu:0 and preserves caller options", () => {
  const body = { model: "nomic-embed-text", prompt: "x", options: { temperature: 0 } };
  const out = withLaneOptions(body);
  assert.equal(out.options.num_gpu, 0);
  assert.equal(out.options.temperature, 0);
  assert.equal(out.model, "nomic-embed-text");
  assert.equal(body.options.num_gpu, undefined, "input must not be mutated");
});

test("withLaneOptions overrides a caller num_gpu (lane is CPU-only by contract)", () => {
  const out = withLaneOptions({ model: "m", prompt: "p", options: { num_gpu: 99 } });
  assert.equal(out.options.num_gpu, 0);
});

test("withLaneOptions adversarial: non-object bodies pass through untouched", () => {
  assert.equal(withLaneOptions(null), null);
  assert.equal(withLaneOptions("raw"), "raw");
  const arr = [1];
  assert.equal(withLaneOptions(arr), arr);
});

// ---- verdictFresh (pure) ----------------------------------------------------

test("verdictFresh: fresh verdict inside TTL is honored; boundary is stale", () => {
  assert.equal(verdictFresh({ schemaVersion: 1, laneUp: true, at: NOW - 1 }, NOW), true);
  assert.equal(verdictFresh({ schemaVersion: 1, laneUp: true, at: NOW - PROBE_TTL_MS }, NOW), false, "exactly-TTL-old is stale");
});

test("verdictFresh adversarial: malformed shapes are never fresh", () => {
  assert.equal(verdictFresh(null, NOW), false);
  assert.equal(verdictFresh({ schemaVersion: 2, laneUp: true, at: NOW }, NOW), false, "unknown schema");
  assert.equal(verdictFresh({ schemaVersion: 1, laneUp: "yes", at: NOW }, NOW), false, "non-boolean verdict");
  assert.equal(verdictFresh({ schemaVersion: 1, laneUp: true, at: "recent" }, NOW), false, "non-numeric at");
});

// ---- resolveEmbedUrl (async) ------------------------------------------------

test("lane up -> LANE_URL, verdict cached", async () => {
  let wrote = null;
  const r = await resolveEmbedUrl({
    fetchImpl: async () => ({ ok: true }),
    nowMs: NOW, env: {}, existsImpl: () => false,
    writeImpl: (_p, body) => { wrote = JSON.parse(body); },
  });
  assert.deepEqual(r, { url: LANE_URL, lane: true });
  assert.equal(wrote.laneUp, true);
});

test("failure: probe throws (conn refused) -> MAIN_URL, negative verdict cached", async () => {
  let wrote = null;
  const r = await resolveEmbedUrl({
    fetchImpl: async () => { throw new Error("ECONNREFUSED"); },
    nowMs: NOW, env: {}, existsImpl: () => false,
    writeImpl: (_p, body) => { wrote = JSON.parse(body); },
  });
  assert.deepEqual(r, { url: MAIN_URL, lane: false });
  assert.equal(wrote.laneUp, false);
});

test("failure: probe non-ok (500) -> MAIN_URL", async () => {
  const r = await resolveEmbedUrl({
    fetchImpl: async () => ({ ok: false, status: 500 }),
    nowMs: NOW, env: {}, ...noCache,
  });
  assert.deepEqual(r, { url: MAIN_URL, lane: false });
});

test("failure: probe hangs past timeout -> aborted -> MAIN_URL", async () => {
  const r = await resolveEmbedUrl({
    fetchImpl: (_u, { signal }) => new Promise((_res, rej) => {
      signal.addEventListener("abort", () => rej(new Error("aborted")));
    }),
    timeoutMs: 20, nowMs: NOW, env: {}, ...noCache,
  });
  assert.deepEqual(r, { url: MAIN_URL, lane: false });
});

test("kill switch PRISM_EMBED_LANE_DISABLE=1 -> MAIN_URL with ZERO probes", async () => {
  let probes = 0;
  const r = await resolveEmbedUrl({
    fetchImpl: async () => { probes++; return { ok: true }; },
    nowMs: NOW, env: { PRISM_EMBED_LANE_DISABLE: "1" },
    existsImpl: () => { probes++; return false; }, writeImpl: () => { probes++; },
  });
  assert.deepEqual(r, { url: MAIN_URL, lane: false });
  assert.equal(probes, 0, "kill switch must short-circuit all IO");
});

test("fresh cached verdict skips the probe entirely (both polarities)", async () => {
  let probes = 0;
  const probeCounter = async () => { probes++; return { ok: true }; };
  const up = await resolveEmbedUrl({
    fetchImpl: probeCounter, nowMs: NOW, env: {},
    existsImpl: () => true, readImpl: () => freshCache(true), writeImpl: () => {},
  });
  const down = await resolveEmbedUrl({
    fetchImpl: probeCounter, nowMs: NOW, env: {},
    existsImpl: () => true, readImpl: () => freshCache(false), writeImpl: () => {},
  });
  assert.deepEqual(up, { url: LANE_URL, lane: true });
  assert.deepEqual(down, { url: MAIN_URL, lane: false });
  assert.equal(probes, 0);
});

test("adversarial: corrupt cache JSON -> re-probe, no throw", async () => {
  const r = await resolveEmbedUrl({
    fetchImpl: async () => ({ ok: true }),
    nowMs: NOW, env: {},
    existsImpl: () => true, readImpl: () => "{not json", writeImpl: () => {},
  });
  assert.deepEqual(r, { url: LANE_URL, lane: true });
});

test("adversarial: sidecar write throws -> resolution still returns", async () => {
  const r = await resolveEmbedUrl({
    fetchImpl: async () => ({ ok: true }),
    nowMs: NOW, env: {}, existsImpl: () => false,
    writeImpl: () => { throw new Error("EACCES"); },
  });
  assert.deepEqual(r, { url: LANE_URL, lane: true });
});

// ---- resolveEmbedUrlSync ----------------------------------------------------

test("sync: curl exit 0 -> LANE_URL; curl throw -> MAIN_URL; kill switch bypasses", () => {
  const up = resolveEmbedUrlSync({ execImpl: () => "ok", nowMs: NOW, env: {}, ...noCache });
  assert.deepEqual(up, { url: LANE_URL, lane: true });
  const down = resolveEmbedUrlSync({ execImpl: () => { throw new Error("exit 7"); }, nowMs: NOW, env: {}, ...noCache });
  assert.deepEqual(down, { url: MAIN_URL, lane: false });
  let execs = 0;
  const off = resolveEmbedUrlSync({ execImpl: () => { execs++; }, nowMs: NOW, env: { PRISM_EMBED_LANE_DISABLE: "1" }, ...noCache });
  assert.deepEqual(off, { url: MAIN_URL, lane: false });
  assert.equal(execs, 0);
});

test("sync: fresh negative cache -> MAIN_URL without spawning curl", () => {
  let execs = 0;
  const r = resolveEmbedUrlSync({
    execImpl: () => { execs++; }, nowMs: NOW, env: {},
    existsImpl: () => true, readImpl: () => freshCache(false), writeImpl: () => {},
  });
  assert.deepEqual(r, { url: MAIN_URL, lane: false });
  assert.equal(execs, 0);
});

test("laneDisabled reads only the exact '1' sentinel", () => {
  assert.equal(laneDisabled({ PRISM_EMBED_LANE_DISABLE: "1" }), true);
  assert.equal(laneDisabled({ PRISM_EMBED_LANE_DISABLE: "true" }), false);
  assert.equal(laneDisabled({}), false);
});

test("laneMisconfigured: default env has distinct lane/main urls", () => {
  // Under this test env LANE_URL !== MAIN_URL; the guard makes a lane-url-
  // pointed-at-main misconfig behave as lane-disabled (num_gpu:0 pins must
  // never land on the shared instance).
  assert.equal(laneMisconfigured(), LANE_URL === MAIN_URL);
  assert.equal(laneMisconfigured(), false);
});

// ---- withMainFallback (broken-lane degrade) ----------------------------------

test("withMainFallback: failed LANE attempt retries MAIN exactly once", async () => {
  const calls = [];
  const out = await withMainFallback({ url: LANE_URL, lane: true }, async (url, lane) => {
    calls.push([url, lane]);
    return url === LANE_URL ? null : [0.1, 0.2];
  });
  assert.deepEqual(out, [0.1, 0.2]);
  assert.deepEqual(calls, [[LANE_URL, true], [MAIN_URL, false]]);
});

test("withMainFallback: successful LANE attempt never touches MAIN", async () => {
  const calls = [];
  const out = await withMainFallback({ url: LANE_URL, lane: true }, async (url, lane) => {
    calls.push([url, lane]);
    return [1];
  });
  assert.deepEqual(out, [1]);
  assert.equal(calls.length, 1);
});

test("withMainFallback: non-lane failure does NOT retry (byte-identical legacy)", async () => {
  const calls = [];
  const out = await withMainFallback({ url: MAIN_URL, lane: false }, async (url, lane) => {
    calls.push([url, lane]);
    return null;
  });
  assert.equal(out, null);
  assert.equal(calls.length, 1, "legacy single-attempt semantics must hold when no lane");
});

test("recordLaneVerdict writes a schema-valid verdict consumers honor", () => {
  let wrote = null;
  recordLaneVerdict(false, NOW, (_p, body) => { wrote = JSON.parse(body); });
  assert.equal(wrote.laneUp, false);
  assert.equal(verdictFresh(wrote, NOW + 1000), true, "guardian verdict must be readable as fresh");
  recordLaneVerdict(true, NOW, (_p, body) => { wrote = JSON.parse(body); });
  assert.equal(wrote.laneUp, true);
});
