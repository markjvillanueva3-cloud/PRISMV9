/**
 * Tests for fleet-reaper-enum-cache.mjs
 *
 * Coverage: 5 pure-decision functions + I/O wrappers + the high-level
 * enumerateProcessesCached() orchestrator. All tests are hermetic — no real
 * filesystem touches (injected readFileImpl/writeFileImpl/existsImpl), no
 * real clock (injected nowMs), no real host (injected host).
 *
 * Real-data regression oracle (last suite) drives the actual file I/O path
 * against tmpdir() to prove the wiring matches the pure-core contract — the
 * "hermetic fakes don't prove production wiring" defense ([[reference_rgs_tool_autoinvoke_ms1_2026_05_16]]).
 */

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  SCHEMA_VERSION,
  DEFAULT_TTL_MS,
  STALE_FALLBACK_FACTOR,
  decideCacheFresh,
  decideStaleFallback,
  buildCacheRecord,
  ttlFromEnv,
  disabledFromEnv,
  readCache,
  writeCache,
  enumerateProcessesCached,
  defaultCachePathFor,
} from "./fleet-reaper-enum-cache.mjs";

const HOST = "TEST-HOST";
const NOW = Date.parse("2026-05-18T14:00:00.000Z");
const TTL = 60_000;

function freshCache(overrides = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    writtenAt: new Date(NOW - 30_000).toISOString(),
    host: HOST,
    ttlMs: TTL,
    procCount: 2,
    procs: [
      { pid: 100, ppid: 1, name: "node", cmd: "node x.mjs", createdMs: NOW - 60000, rssBytes: 1024 },
      { pid: 200, ppid: 100, name: "bash", cmd: "bash -c y", createdMs: NOW - 30000, rssBytes: 512 },
    ],
    ...overrides,
  };
}

// ─── decideCacheFresh ────────────────────────────────────────────────────────

describe("decideCacheFresh", () => {
  test("fresh cache (age < ttl) → useFresh: true", () => {
    const r = decideCacheFresh(freshCache(), { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useFresh, true);
    assert.equal(r.reason, "fresh");
    assert.equal(r.ageMs, 30_000);
  });

  test("null cache → no-cache", () => {
    const r = decideCacheFresh(null, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useFresh, false);
    assert.equal(r.reason, "no-cache");
  });

  test("schema mismatch → not fresh", () => {
    const r = decideCacheFresh(freshCache({ schemaVersion: "0.9.0" }), { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useFresh, false);
    assert.equal(r.reason, "schema-mismatch");
  });

  test("different host → not fresh", () => {
    const r = decideCacheFresh(freshCache({ host: "OTHER-PC" }), { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useFresh, false);
    assert.equal(r.reason, "different-host");
  });

  test("procs not array → not fresh", () => {
    const r = decideCacheFresh(freshCache({ procs: "oops" }), { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useFresh, false);
    assert.equal(r.reason, "procs-not-array");
  });

  test("writtenAt unparseable → not fresh", () => {
    const r = decideCacheFresh(freshCache({ writtenAt: "garbage" }), { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useFresh, false);
    assert.equal(r.reason, "writtenAt-bad");
  });

  test("writtenAt in future (clock skew) → not fresh", () => {
    const r = decideCacheFresh(
      freshCache({ writtenAt: new Date(NOW + 60_000).toISOString() }),
      { host: HOST, nowMs: NOW, ttlMs: TTL },
    );
    assert.equal(r.useFresh, false);
    assert.equal(r.reason, "writtenAt-future");
  });

  test("age = ttl exactly → fresh (boundary inclusive)", () => {
    const c = freshCache({ writtenAt: new Date(NOW - TTL).toISOString() });
    const r = decideCacheFresh(c, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useFresh, true);
    assert.equal(r.ageMs, TTL);
  });

  test("age = ttl + 1ms → stale", () => {
    const c = freshCache({ writtenAt: new Date(NOW - TTL - 1).toISOString() });
    const r = decideCacheFresh(c, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useFresh, false);
    assert.equal(r.reason, "stale");
  });
});

// ─── decideStaleFallback ─────────────────────────────────────────────────────

describe("decideStaleFallback", () => {
  test("stale-but-within-fallback-window → useStale: true", () => {
    const c = freshCache({ writtenAt: new Date(NOW - TTL * 3).toISOString() });
    const r = decideStaleFallback(c, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useStale, true);
    assert.equal(r.reason, "usable-fallback");
  });

  test("too stale (>5×ttl) → useStale: false", () => {
    const c = freshCache({ writtenAt: new Date(NOW - TTL * STALE_FALLBACK_FACTOR - 1).toISOString() });
    const r = decideStaleFallback(c, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useStale, false);
    assert.equal(r.reason, "too-stale");
  });

  test("boundary = 5×ttl exactly → still usable", () => {
    const c = freshCache({ writtenAt: new Date(NOW - TTL * STALE_FALLBACK_FACTOR).toISOString() });
    const r = decideStaleFallback(c, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useStale, true);
  });

  test("null cache → no fallback", () => {
    const r = decideStaleFallback(null, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useStale, false);
    assert.equal(r.reason, "no-cache");
  });

  test("different host → no fallback (correctness > availability)", () => {
    const c = freshCache({ host: "OTHER", writtenAt: new Date(NOW - TTL * 2).toISOString() });
    const r = decideStaleFallback(c, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useStale, false);
    assert.equal(r.reason, "different-host");
  });

  test("writtenAt in future → not usable", () => {
    const c = freshCache({ writtenAt: new Date(NOW + 1000).toISOString() });
    const r = decideStaleFallback(c, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.useStale, false);
    assert.equal(r.reason, "writtenAt-future");
  });
});

// ─── buildCacheRecord ────────────────────────────────────────────────────────

describe("buildCacheRecord", () => {
  test("shapes correct record", () => {
    const procs = [{ pid: 1, ppid: 0, name: "init", cmd: "", createdMs: 0, rssBytes: 0 }];
    const r = buildCacheRecord(procs, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.schemaVersion, SCHEMA_VERSION);
    assert.equal(r.host, HOST);
    assert.equal(r.ttlMs, TTL);
    assert.equal(r.procCount, 1);
    assert.deepEqual(r.procs, procs);
    assert.equal(Date.parse(r.writtenAt), NOW);
  });

  test("non-array procs → empty array + procCount 0", () => {
    const r = buildCacheRecord(null, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.procCount, 0);
    assert.deepEqual(r.procs, []);
  });

  test("preserves arbitrary proc fields verbatim", () => {
    const procs = [{ pid: 99, ppid: 1, name: "x", cmd: "y", createdMs: 1, rssBytes: 2, extra: "z" }];
    const r = buildCacheRecord(procs, { host: HOST, nowMs: NOW, ttlMs: TTL });
    assert.equal(r.procs[0].extra, "z");
  });
});

// ─── ttlFromEnv ──────────────────────────────────────────────────────────────

describe("ttlFromEnv", () => {
  test("unset → default 60s", () => assert.equal(ttlFromEnv({}), DEFAULT_TTL_MS));
  test("custom 30 → 30000ms", () => assert.equal(ttlFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC: "30" }), 30_000));
  test("string non-number → default", () => assert.equal(ttlFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC: "abc" }), DEFAULT_TTL_MS));
  test("negative → default", () => assert.equal(ttlFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC: "-5" }), DEFAULT_TTL_MS));
  test("zero → default", () => assert.equal(ttlFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC: "0" }), DEFAULT_TTL_MS));
  test("clamps too small (3 → 5s floor)", () => assert.equal(ttlFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC: "3" }), 5000));
  test("clamps too large (99999 → 3600s ceiling)", () => assert.equal(ttlFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC: "99999" }), 3600_000));
});

// ─── disabledFromEnv ─────────────────────────────────────────────────────────

describe("disabledFromEnv", () => {
  test("unset → false", () => assert.equal(disabledFromEnv({}), false));
  test("'1' → true", () => assert.equal(disabledFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE: "1" }), true));
  test("'true' → true", () => assert.equal(disabledFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE: "true" }), true));
  test("'TRUE' → true (case-insensitive)", () => assert.equal(disabledFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE: "TRUE" }), true));
  test("'yes' → true", () => assert.equal(disabledFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE: "yes" }), true));
  test("'0' → false", () => assert.equal(disabledFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE: "0" }), false));
  test("garbage → false", () => assert.equal(disabledFromEnv({ PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE: "maybe" }), false));
});

// ─── readCache / writeCache (with injected I/O) ──────────────────────────────

describe("readCache (injected I/O)", () => {
  test("non-existent → null", () => {
    const r = readCache("/nope.json", { existsImpl: () => false, readFileImpl: () => { throw new Error("nope"); } });
    assert.equal(r, null);
  });

  test("valid JSON → parsed", () => {
    const r = readCache("/x", { existsImpl: () => true, readFileImpl: () => '{"a":1}' });
    assert.deepEqual(r, { a: 1 });
  });

  test("corrupt JSON → null (no throw)", () => {
    const r = readCache("/x", { existsImpl: () => true, readFileImpl: () => "{not json" });
    assert.equal(r, null);
  });

  test("oversize file → null (no parse attempt)", () => {
    const huge = "x".repeat(33 * 1024 * 1024);
    const r = readCache("/x", { existsImpl: () => true, readFileImpl: () => huge });
    assert.equal(r, null);
  });

  test("read throws → null", () => {
    const r = readCache("/x", { existsImpl: () => true, readFileImpl: () => { throw new Error("EACCES"); } });
    assert.equal(r, null);
  });
});

describe("writeCache (injected I/O)", () => {
  test("happy path → ok:true", () => {
    let wrote = null;
    let renamed = null;
    const r = writeCache("/target.json", { x: 1 }, {
      writeFileImpl: (p, c) => { wrote = { p, c }; },
      renameImpl: (a, b) => { renamed = { a, b }; },
    });
    assert.equal(r.ok, true);
    assert.match(wrote.p, /target\.json\.\d+\.\w+\.tmp$/);
    assert.equal(JSON.parse(wrote.c).x, 1);
    assert.equal(renamed.b, "/target.json");
  });

  test("write throws → ok:false + cleanup attempt", () => {
    let unlinked = null;
    const r = writeCache("/target.json", { x: 1 }, {
      writeFileImpl: () => { throw new Error("EROFS"); },
      renameImpl: () => {},
      unlinkImpl: (p) => { unlinked = p; },
    });
    assert.equal(r.ok, false);
    assert.match(r.error, /EROFS/);
  });

  test("rename throws → ok:false", () => {
    const r = writeCache("/target.json", { x: 1 }, {
      writeFileImpl: () => {},
      renameImpl: () => { throw new Error("EXDEV"); },
      unlinkImpl: () => {},
    });
    assert.equal(r.ok, false);
    assert.match(r.error, /EXDEV/);
  });
});

// ─── enumerateProcessesCached (orchestrator) ─────────────────────────────────

describe("enumerateProcessesCached", () => {
  test("throws if enumerator missing", () => {
    assert.throws(() => enumerateProcessesCached({}), /enumerator/);
  });

  test("disabled env → bypasses cache entirely", () => {
    let enumCalled = 0;
    const r = enumerateProcessesCached({
      enumerator: () => { enumCalled++; return [{ pid: 1, ppid: 0, name: "x", cmd: "", createdMs: 0, rssBytes: 0 }]; },
      env: { PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE: "1" },
      io: { existsImpl: () => true, readFileImpl: () => '{"never":"read"}' },
      host: HOST,
      nowMs: NOW,
    });
    assert.equal(r.disabled, true);
    assert.equal(r.fromCache, false);
    assert.equal(enumCalled, 1);
    assert.equal(r.procs.length, 1);
  });

  test("fresh cache hit → enumerator NOT called", () => {
    let enumCalled = 0;
    const fresh = freshCache();
    const r = enumerateProcessesCached({
      enumerator: () => { enumCalled++; return []; },
      env: {},
      io: { existsImpl: () => true, readFileImpl: () => JSON.stringify(fresh) },
      host: HOST,
      nowMs: NOW,
    });
    assert.equal(enumCalled, 0, "enumerator must not run on fresh cache hit");
    assert.equal(r.fromCache, true);
    assert.equal(r.fromStaleCache, false);
    assert.equal(r.procs.length, 2);
  });

  test("stale cache → enumerator runs + cache rewritten", () => {
    let enumCalled = 0;
    let wrote = null;
    const stale = freshCache({ writtenAt: new Date(NOW - TTL * 2).toISOString() });
    const liveProcs = [{ pid: 999, ppid: 1, name: "live", cmd: "", createdMs: NOW, rssBytes: 0 }];
    const r = enumerateProcessesCached({
      enumerator: () => { enumCalled++; return liveProcs; },
      env: {},
      io: {
        existsImpl: () => true,
        readFileImpl: () => JSON.stringify(stale),
        writeFileImpl: (_, c) => { wrote = JSON.parse(c); },
        renameImpl: () => {},
      },
      host: HOST,
      nowMs: NOW,
    });
    assert.equal(enumCalled, 1);
    assert.equal(r.fromCache, false);
    assert.equal(r.wroteCache, true);
    assert.equal(wrote.procs[0].pid, 999);
    assert.equal(wrote.host, HOST);
  });

  test("live enumerate FAILS + recent stale cache → fromStaleCache:true", () => {
    const stale = freshCache({ writtenAt: new Date(NOW - TTL * 2).toISOString() });
    const r = enumerateProcessesCached({
      enumerator: () => [],  // empty = failed (default predicate)
      env: {},
      io: { existsImpl: () => true, readFileImpl: () => JSON.stringify(stale) },
      host: HOST,
      nowMs: NOW,
    });
    assert.equal(r.fromCache, true);
    assert.equal(r.fromStaleCache, true);
    assert.equal(r.reason, "stale-fallback");
    assert.equal(r.procs.length, 2, "served the cached procs, not empty");
  });

  test("live enumerate FAILS + no cache → empty (preserves safe-degraded)", () => {
    const r = enumerateProcessesCached({
      enumerator: () => [],
      env: {},
      io: { existsImpl: () => false, readFileImpl: () => { throw new Error(); } },
      host: HOST,
      nowMs: NOW,
    });
    assert.equal(r.fromCache, false);
    assert.equal(r.fromStaleCache, false);
    assert.deepEqual(r.procs, []);
    assert.match(r.reason, /^enumerate-failed/);
  });

  test("live enumerate FAILS + cache too stale → empty (no stale-fallback)", () => {
    const tooStale = freshCache({ writtenAt: new Date(NOW - TTL * 100).toISOString() });
    const r = enumerateProcessesCached({
      enumerator: () => [],
      env: {},
      io: { existsImpl: () => true, readFileImpl: () => JSON.stringify(tooStale) },
      host: HOST,
      nowMs: NOW,
    });
    assert.deepEqual(r.procs, []);
    assert.equal(r.fromStaleCache, false);
  });

  test("different-host cache + live success → overwrites with this host", () => {
    let wrote = null;
    const otherCache = freshCache({ host: "OTHER-PC" });
    const r = enumerateProcessesCached({
      enumerator: () => [{ pid: 7, ppid: 0, name: "n", cmd: "", createdMs: NOW, rssBytes: 0 }],
      env: {},
      io: {
        existsImpl: () => true,
        readFileImpl: () => JSON.stringify(otherCache),
        writeFileImpl: (_, c) => { wrote = JSON.parse(c); },
        renameImpl: () => {},
      },
      host: HOST,
      nowMs: NOW,
    });
    assert.equal(r.fromCache, false);
    assert.equal(wrote.host, HOST, "wrote with current host, not OTHER-PC");
  });

  test("corrupt cache + live success → enumerator runs + cache rewritten", () => {
    let wrote = null;
    const r = enumerateProcessesCached({
      enumerator: () => [{ pid: 1, ppid: 0, name: "x", cmd: "", createdMs: 0, rssBytes: 0 }],
      env: {},
      io: {
        existsImpl: () => true,
        readFileImpl: () => "{garbage",
        writeFileImpl: (_, c) => { wrote = JSON.parse(c); },
        renameImpl: () => {},
      },
      host: HOST,
      nowMs: NOW,
    });
    assert.equal(r.fromCache, false);
    assert.equal(r.wroteCache, true);
    assert.equal(wrote.procs.length, 1);
  });

  test("custom enumerateFailed predicate", () => {
    // Treat any result without pid 42 as "failed"
    const stale = freshCache({ writtenAt: new Date(NOW - TTL * 2).toISOString() });
    const r = enumerateProcessesCached({
      enumerator: () => [{ pid: 1, ppid: 0, name: "x", cmd: "", createdMs: 0, rssBytes: 0 }],
      enumerateFailed: (procs) => !procs.some(p => p.pid === 42),
      env: {},
      io: { existsImpl: () => true, readFileImpl: () => JSON.stringify(stale) },
      host: HOST,
      nowMs: NOW,
    });
    assert.equal(r.fromStaleCache, true);
  });
});

// ─── defaultCachePathFor (per-host suffix) ───────────────────────────────────

describe("defaultCachePathFor", () => {
  test("path contains host suffix", () => {
    const p = defaultCachePathFor("MARKV");
    assert.match(p, /\.fleet-reaper-enum-cache-MARKV\.json$/);
  });
  test("different hosts → different paths (no cross-PC contention)", () => {
    const a = defaultCachePathFor("PC-A");
    const b = defaultCachePathFor("PC-B");
    assert.notEqual(a, b);
  });
  test("sanitizes path-unsafe chars in host", () => {
    const p = defaultCachePathFor("weird/host:name");
    assert.doesNotMatch(p, /[\/:]name/);
    assert.match(p, /weird_host_name/);
  });
  test("null/empty host → 'unknown'", () => {
    assert.match(defaultCachePathFor(null), /unknown/);
    assert.match(defaultCachePathFor(""), /unknown/);
  });
});

// ─── Real-data regression oracle ─────────────────────────────────────────────
// Exercises the actual fs.* calls — the hermetic-fakes-don't-prove-wiring defense.

describe("real-fs integration (tmpdir)", () => {
  test("write → read round-trip with real fs", () => {
    const dir = mkdtempSync(join(tmpdir(), "prism-enum-cache-test-"));
    try {
      const cachePath = join(dir, "cache.json");
      const record = buildCacheRecord(
        [{ pid: 5, ppid: 0, name: "node", cmd: "node x", createdMs: NOW, rssBytes: 1234 }],
        { host: HOST, nowMs: NOW, ttlMs: TTL },
      );
      const w = writeCache(cachePath, record);
      assert.equal(w.ok, true);
      assert.equal(existsSync(cachePath), true);
      // Plain file content matches what we wrote
      const back = JSON.parse(readFileSync(cachePath, "utf-8"));
      assert.equal(back.host, HOST);
      assert.equal(back.procs[0].pid, 5);
      // Round-trip through readCache
      const round = readCache(cachePath);
      assert.equal(round.host, HOST);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("enumerateProcessesCached real-fs round-trip: 2nd call hits cache", () => {
    const dir = mkdtempSync(join(tmpdir(), "prism-enum-cache-test-"));
    try {
      const cachePath = join(dir, "cache.json");
      let enumCalls = 0;
      const enumerator = () => {
        enumCalls++;
        return [{ pid: 42, ppid: 1, name: "node", cmd: "", createdMs: NOW, rssBytes: 0 }];
      };
      // First call — cache miss, enumerator fires, cache written
      const r1 = enumerateProcessesCached({ enumerator, cachePath, host: HOST, nowMs: NOW, env: {} });
      assert.equal(r1.fromCache, false);
      assert.equal(r1.wroteCache, true);
      assert.equal(enumCalls, 1);
      // Second call — cache hit, enumerator NOT called
      const r2 = enumerateProcessesCached({ enumerator, cachePath, host: HOST, nowMs: NOW + 1000, env: {} });
      assert.equal(r2.fromCache, true, "second call must hit the on-disk cache");
      assert.equal(r2.procs[0].pid, 42);
      assert.equal(enumCalls, 1, "enumerator must not run twice");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
