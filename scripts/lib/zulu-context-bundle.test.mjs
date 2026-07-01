// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — tests for the CLAUDE-BRIEF + BUILD-VISION
// reader. Hermetic via injected synthetic reader + node:test + node:assert/strict.
//
// Acceptance criteria from `state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md` §7:
//   - tests pin fail-soft + cache-hit + ttl-expiry + stale-mark behavior
//   - one real-data E2E per the MS1 P0 lesson
//     ("pure-core+injected-readers MUST ship a real-data E2E")

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_BRIEF_PATH,
  DEFAULT_VISION_PATH,
  DEFAULT_ROADMAP_PATH,
  DEFAULT_SOULS_DIR,
  DEFAULT_LOOP_STATE_DIR,
  DEFAULT_TOKEN_BUDGET_DIR,
  KNOWN_SLOTS,
  KNOWN_LOOP_SCHEMA_VERSIONS,
  KNOWN_TOKEN_BUDGET_SCHEMA_VERSIONS,
  defaultReader,
  safeJsonParse,
  loadBrief,
  loadVision,
  loadBriefAndVision,
  loadBridgeUnits,
  loadSlotSoulRefuseList,
  loadLoopState,
  findActiveLoops,
  loadTokenAwarenessZone,
  loadSlotContext,
  parseBridgeUnits,
  parseSoulFrontmatter,
  extractFrontmatterText,
  parseLoopState,
  parseTokenBudget,
  deriveZebraDecision,
  isValidSessionId,
  invalidateContextCache,
  getCacheSnapshot,
} from "./zulu-context-bundle.mjs";

const FAKE_NOW = 1_700_000_000_000;
const ONE_HOUR_MS = 3_600_000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

function makeReader(records) {
  // records: { [absPath]: { ok:true, content, mtime } | { ok:false, reason } }
  // Both record keys AND the path passed in by the reader are normalized via
  // path.resolve, so tests don't need to predict the exact path.join form
  // the impl uses internally.
  //
  // `reader.calls.get(p)` and `.has(p)` ALSO resolve the lookup path so
  // existing MS0-01 tests that pass the un-joined string keep working.
  const resolved = new Map();
  for (const [k, v] of Object.entries(records)) {
    resolved.set(path.resolve(k), v);
  }
  const callsByResolved = new Map();
  const reader = (p) => {
    const key = path.resolve(p);
    callsByResolved.set(key, (callsByResolved.get(key) || 0) + 1);
    return resolved.get(key) || { ok: false, reason: "missing" };
  };
  reader.calls = {
    get: (p) => callsByResolved.get(path.resolve(p)),
    has: (p) => callsByResolved.has(path.resolve(p)),
    get size() { return callsByResolved.size; },
  };
  return reader;
}

beforeEach(() => {
  delete process.env.PRISM_ZEBRA_CONTEXT_DISABLE;
  delete process.env.PRISM_ZEBRA_CONTEXT_TTL_MS;
  delete process.env.PRISM_ZEBRA_CONTEXT_STALE_HRS;
  // Per arm-B P2: also clear path-override knobs so the real-data E2E
  // can't be diverted by a leaked env var from a prior test.
  delete process.env.PRISM_ZEBRA_CONTEXT_BRIEF_PATH;
  delete process.env.PRISM_ZEBRA_CONTEXT_VISION_PATH;
  // U-ZO-MS0-02/03/04 path overrides.
  delete process.env.PRISM_ZEBRA_CONTEXT_ROADMAP_PATH;
  delete process.env.PRISM_ZEBRA_CONTEXT_SOULS_DIR;
  delete process.env.PRISM_ZEBRA_CONTEXT_LOOP_DIR;
  // U-ZO-MS0-05 path override.
  delete process.env.PRISM_ZEBRA_CONTEXT_TOKEN_DIR;
  invalidateContextCache();
});

describe("defaultReader", () => {
  it("returns ok:false reason:missing for ENOENT", () => {
    const r = defaultReader(path.join(process.cwd(), "no-such-file-zebra-context-test.md"));
    assert.equal(r.ok, false);
    assert.equal(r.reason, "missing");
  });

  it("returns ok:true with content + mtime for a real file", () => {
    const tmp = path.join(process.cwd(), `tmp-zct-${Date.now()}.md`);
    fs.writeFileSync(tmp, "hello-zebra");
    try {
      const r = defaultReader(tmp);
      assert.equal(r.ok, true);
      assert.equal(r.content, "hello-zebra");
      assert.equal(typeof r.mtime, "number");
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("returns read-error reason for a directory path (not a file)", () => {
    const r = defaultReader(process.cwd());
    // readFileSync on a directory yields EISDIR; defaultReader reports read-error.
    assert.equal(r.ok, false);
    assert.equal(r.reason, "read-error");
  });
});

describe("loadBrief — fail-soft", () => {
  it("missing file → reason:missing, content:'', ok:false", () => {
    const reader = makeReader({});
    const env = loadBrief({ reader, briefPath: "/no/such/brief.md", now: () => FAKE_NOW });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "missing");
    assert.equal(env.content, "");
    assert.equal(env.mtime, null);
    assert.equal(env.ageSeconds, null);
    assert.equal(env.stale, false);
  });

  it("disabled-env returns disabled envelope without reading", () => {
    process.env.PRISM_ZEBRA_CONTEXT_DISABLE = "1";
    const reader = makeReader({ "/x": { ok: true, content: "x", mtime: 0 } });
    const env = loadBrief({ reader, briefPath: "/x", now: () => FAKE_NOW });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "disabled-env");
    assert.equal(reader.calls.size, 0);
  });

  it("empty-string briefPath → reason:no-path (explicit-empty fail-loud)", () => {
    const env = loadBrief({ briefPath: "", now: () => FAKE_NOW });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "no-path");
  });

  it("explicit null briefPath → reason:no-path", () => {
    const env = loadBrief({ briefPath: null, now: () => FAKE_NOW });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "no-path");
  });

  it("non-string briefPath (number) → reason:no-path", () => {
    const env = loadBrief({ briefPath: 42, now: () => FAKE_NOW });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "no-path");
  });
});

describe("loadBrief — happy path", () => {
  it("returns content + mtime + ageSeconds=0 for fresh file", () => {
    const p = "/canonical/brief.md";
    const reader = makeReader({ [p]: { ok: true, content: "# brief", mtime: FAKE_NOW } });
    const env = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW });
    assert.equal(env.ok, true);
    assert.equal(env.content, "# brief");
    assert.equal(env.mtime, FAKE_NOW);
    assert.equal(env.ageSeconds, 0);
    assert.equal(env.stale, false);
    assert.equal(env.source, "fresh");
  });

  it("stale:true when ageSeconds > staleHrs*3600", () => {
    const p = "/canonical/old-brief.md";
    const reader = makeReader({ [p]: { ok: true, content: "old", mtime: FAKE_NOW - 2 * ONE_DAY_MS } });
    const env = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW, staleHrs: 24 });
    assert.equal(env.ok, true);
    assert.equal(env.stale, true);
    assert.ok(env.ageSeconds > 24 * 3600);
  });

  it("mtime in the future clamps ageSeconds to 0 (clock-drift safety)", () => {
    const p = "/canonical/future-brief.md";
    const reader = makeReader({ [p]: { ok: true, content: "future", mtime: FAKE_NOW + ONE_HOUR_MS } });
    const env = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW });
    assert.equal(env.ok, true);
    assert.equal(env.ageSeconds, 0);
    assert.equal(env.stale, false);
  });

  it("empty file → ok:true, content:'' (zero-byte file is valid)", () => {
    const p = "/canonical/empty-brief.md";
    const reader = makeReader({ [p]: { ok: true, content: "", mtime: FAKE_NOW } });
    const env = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW });
    assert.equal(env.ok, true);
    assert.equal(env.content, "");
    assert.equal(env.reason, null);
  });
});

describe("loadBrief — cache behavior", () => {
  it("second call within TTL returns source:'cache' and skips reader", () => {
    const p = "/canonical/cached.md";
    const reader = makeReader({ [p]: { ok: true, content: "v1", mtime: FAKE_NOW } });
    const a = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW, ttlMs: 60_000 });
    const b = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW + 1000, ttlMs: 60_000 });
    assert.equal(a.source, "fresh");
    assert.equal(b.source, "cache");
    assert.equal(reader.calls.get(p), 1);
    assert.equal(b.content, "v1");
  });

  it("call after TTL expiry re-reads", () => {
    const p = "/canonical/ttl-expire.md";
    const reader = makeReader({ [p]: { ok: true, content: "v1", mtime: FAKE_NOW } });
    loadBrief({ reader, briefPath: p, now: () => FAKE_NOW, ttlMs: 1000 });
    const b = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW + 5000, ttlMs: 1000 });
    assert.equal(b.source, "fresh");
    assert.equal(reader.calls.get(p), 2);
  });

  it("failed read is NOT cached (subsequent calls re-attempt)", () => {
    const p = "/no/such/file.md";
    const reader = makeReader({}); // always missing
    loadBrief({ reader, briefPath: p, now: () => FAKE_NOW });
    loadBrief({ reader, briefPath: p, now: () => FAKE_NOW + 1000 });
    // Both calls hit reader because the failed envelope wasn't cached.
    assert.equal(reader.calls.get(p), 2);
  });

  it("ttlMs=0 disables caching (no entry written)", () => {
    const p = "/canonical/no-cache.md";
    const reader = makeReader({ [p]: { ok: true, content: "x", mtime: FAKE_NOW } });
    loadBrief({ reader, briefPath: p, now: () => FAKE_NOW, ttlMs: 0 });
    const snap = getCacheSnapshot();
    assert.equal(Object.keys(snap).length, 0);
  });

  it("path normalization: ./-prefixed + absolute hit the same cache entry", () => {
    // Per arm-B P1: register ONLY the canonical abs key. If path-resolve
    // normalization breaks, the second call's lookup misses + falls through
    // to the synthetic reader for `dotForm` (un-registered) → reason:"missing",
    // which would FAIL `source==="cache"` and surface the break loudly.
    const abs = path.resolve("/tmp/zct-norm-test.md");
    const dotForm = path.join("/tmp", "./zct-norm-test.md");
    const reader = makeReader({
      [abs]: { ok: true, content: "n", mtime: FAKE_NOW },
      // dotForm intentionally NOT registered — only normalized lookup survives.
    });
    const first = loadBrief({ reader, briefPath: abs, now: () => FAKE_NOW });
    assert.equal(first.ok, true);
    const second = loadBrief({ reader, briefPath: dotForm, now: () => FAKE_NOW + 100 });
    assert.equal(second.source, "cache");
    assert.equal(second.ok, true);
    assert.equal(second.content, "n");
  });
});

describe("loadVision", () => {
  it("reads the vision file via opts.visionPath", () => {
    const p = "/canonical/vision.md";
    const reader = makeReader({ [p]: { ok: true, content: "# vision", mtime: FAKE_NOW } });
    const env = loadVision({ reader, visionPath: p, now: () => FAKE_NOW });
    assert.equal(env.ok, true);
    assert.equal(env.content, "# vision");
  });

  it("default path is the canonical PRISM-BUILD-VISION.md", () => {
    // We don't read the actual file here — just verify the constant.
    assert.ok(DEFAULT_VISION_PATH.endsWith("PRISM-BUILD-VISION.md"));
  });
});

describe("loadBriefAndVision", () => {
  it("composes both surfaces + composedAt timestamp", () => {
    const bp = "/canonical/brief2.md";
    const vp = "/canonical/vision2.md";
    const reader = makeReader({
      [bp]: { ok: true, content: "brief-body", mtime: FAKE_NOW },
      [vp]: { ok: true, content: "vision-body", mtime: FAKE_NOW },
    });
    const composed = loadBriefAndVision({
      reader,
      briefPath: bp,
      visionPath: vp,
      now: () => FAKE_NOW,
    });
    assert.equal(composed.brief.ok, true);
    assert.equal(composed.vision.ok, true);
    assert.equal(composed.brief.content, "brief-body");
    assert.equal(composed.vision.content, "vision-body");
    assert.equal(composed.composedAt, FAKE_NOW);
  });

  it("propagates fail-soft: missing brief + ok vision → mixed envelope", () => {
    const vp = "/canonical/vision3.md";
    const reader = makeReader({
      [vp]: { ok: true, content: "v", mtime: FAKE_NOW },
    });
    const composed = loadBriefAndVision({
      reader,
      briefPath: "/no/brief.md",
      visionPath: vp,
      now: () => FAKE_NOW,
    });
    assert.equal(composed.brief.ok, false);
    assert.equal(composed.brief.reason, "missing");
    assert.equal(composed.vision.ok, true);
  });
});

describe("invalidateContextCache", () => {
  it("null clears everything", () => {
    const p = "/canonical/inv-all.md";
    const reader = makeReader({ [p]: { ok: true, content: "x", mtime: FAKE_NOW } });
    loadBrief({ reader, briefPath: p, now: () => FAKE_NOW });
    assert.ok(Object.keys(getCacheSnapshot()).length > 0);
    invalidateContextCache(null);
    assert.equal(Object.keys(getCacheSnapshot()).length, 0);
  });

  it("specific path clears only that entry (with path normalization)", () => {
    const a = "/canonical/inv-a.md";
    const b = "/canonical/inv-b.md";
    const reader = makeReader({
      [a]: { ok: true, content: "a", mtime: FAKE_NOW },
      [b]: { ok: true, content: "b", mtime: FAKE_NOW },
    });
    loadBrief({ reader, briefPath: a, now: () => FAKE_NOW });
    loadBrief({ reader, briefPath: b, now: () => FAKE_NOW });
    assert.equal(Object.keys(getCacheSnapshot()).length, 2);
    invalidateContextCache(a);
    assert.equal(Object.keys(getCacheSnapshot()).length, 1);
  });

  it("ignores empty/non-string input (no-op safety)", () => {
    invalidateContextCache("");
    invalidateContextCache(123);
    invalidateContextCache({});
    // No throw, no state change.
    assert.equal(Object.keys(getCacheSnapshot()).length, 0);
  });
});

describe("env knobs", () => {
  it("PRISM_ZEBRA_CONTEXT_TTL_MS=1 → expires fast (env read, not default 60s)", () => {
    process.env.PRISM_ZEBRA_CONTEXT_TTL_MS = "1";
    const p = "/canonical/env-ttl.md";
    const reader = makeReader({ [p]: { ok: true, content: "x", mtime: FAKE_NOW } });
    loadBrief({ reader, briefPath: p, now: () => FAKE_NOW });
    const second = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW + 1000 });
    // 1ms TTL + 1000ms gap → re-read, not cache.
    assert.equal(second.source, "fresh");
    assert.equal(reader.calls.get(p), 2);
  });

  it("PRISM_ZEBRA_CONTEXT_TTL_MS=999999 → caches longer than default (inverse lock)", () => {
    // Per arm-B P1: inverse test locks env-read direction. Without env honor,
    // the default 60s TTL would NOT cache across a 100s gap → this test fails.
    process.env.PRISM_ZEBRA_CONTEXT_TTL_MS = "999999";
    const p = "/canonical/env-ttl-long.md";
    const reader = makeReader({ [p]: { ok: true, content: "x", mtime: FAKE_NOW } });
    loadBrief({ reader, briefPath: p, now: () => FAKE_NOW });
    // 100s gap exceeds default 60s TTL but is well under the 999999ms env TTL.
    const second = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW + 100_000 });
    assert.equal(second.source, "cache");
    assert.equal(reader.calls.get(p), 1);
  });

  it("PRISM_ZEBRA_CONTEXT_STALE_HRS honored when no opts.staleHrs", () => {
    process.env.PRISM_ZEBRA_CONTEXT_STALE_HRS = "1"; // 1 hour
    const p = "/canonical/env-stale.md";
    const reader = makeReader({
      [p]: { ok: true, content: "x", mtime: FAKE_NOW - 2 * ONE_HOUR_MS },
    });
    const env = loadBrief({ reader, briefPath: p, now: () => FAKE_NOW });
    assert.equal(env.stale, true);
  });
});

describe("mtime-advance invalidation (defaultReader branch)", () => {
  it("mtime bump on a real temp file invalidates the cache (re-reads new content)", () => {
    // Per arm-B P1: this exercises lib L143-149 (the defaultReader branch
    // of the cache re-stat) — uncovered by the injected-reader tests.
    invalidateContextCache();
    const tmp = path.join(process.cwd(), `tmp-zct-mtime-${Date.now()}.md`);
    try {
      fs.writeFileSync(tmp, "v1");
      const first = loadBrief({ briefPath: tmp, ttlMs: 60_000 });
      assert.equal(first.ok, true);
      assert.equal(first.content, "v1");
      assert.equal(first.source, "fresh");

      // Cache hit on second call (same mtime).
      const cached = loadBrief({ briefPath: tmp, ttlMs: 60_000 });
      assert.equal(cached.source, "cache");
      assert.equal(cached.content, "v1");

      // Mutate content + bump mtime forward. utimesSync gives us deterministic
      // mtime advance regardless of filesystem mtime granularity.
      fs.writeFileSync(tmp, "v2");
      const futureMtime = (first.mtime + 5000) / 1000; // utimes wants seconds
      fs.utimesSync(tmp, futureMtime, futureMtime);

      // Cache should invalidate due to mtime advance → re-read new content.
      const after = loadBrief({ briefPath: tmp, ttlMs: 60_000 });
      assert.equal(after.source, "fresh");
      assert.equal(after.content, "v2");
      assert.notEqual(after.mtime, first.mtime);
    } finally {
      try { fs.unlinkSync(tmp); } catch { /* best-effort cleanup */ }
    }
  });
});

describe("real-data E2E (per MS1 P0 lesson)", () => {
  it("CLAUDE-BRIEF.md actually loads from disk on this checkout", () => {
    invalidateContextCache();
    const env = loadBrief({}); // no opts → default path + default reader
    // The brief is auto-regenerated; if it exists, we should read it cleanly.
    if (fs.existsSync(DEFAULT_BRIEF_PATH)) {
      assert.equal(env.ok, true);
      assert.equal(env.reason, null);
      assert.ok(env.content.length > 0);
      assert.equal(typeof env.mtime, "number");
      assert.equal(env.path, DEFAULT_BRIEF_PATH);
    } else {
      assert.equal(env.ok, false);
      assert.equal(env.reason, "missing");
    }
  });

  it("PRISM-BUILD-VISION.md actually loads from disk on this checkout", () => {
    invalidateContextCache();
    const env = loadVision({});
    if (fs.existsSync(DEFAULT_VISION_PATH)) {
      assert.equal(env.ok, true);
      assert.equal(env.reason, null);
      assert.ok(env.content.length > 0);
      assert.equal(typeof env.mtime, "number");
    } else {
      assert.equal(env.ok, false);
      assert.equal(env.reason, "missing");
    }
  });
});

// ============================================================================
// U-ZO-MS0-02 — loadBridgeUnits + parseBridgeUnits + safeJsonParse
// ============================================================================

describe("safeJsonParse — prototype-pollution guard", () => {
  it("parses normal JSON", () => {
    assert.deepEqual(safeJsonParse('{"a":1,"b":[2,3]}'), { a: 1, b: [2, 3] });
  });
  it("drops __proto__ key without polluting", () => {
    const out = safeJsonParse('{"a":1,"__proto__":{"polluted":true}}');
    assert.equal(out.a, 1);
    // The __proto__ key is dropped, so reflective enumeration must not see it.
    assert.equal(Object.prototype.hasOwnProperty.call(out, "__proto__"), false);
    // Object.prototype must NOT have been polluted.
    assert.equal(({}).polluted, undefined);
  });
  it("drops constructor + prototype keys", () => {
    const out = safeJsonParse('{"constructor":{"name":"x"},"prototype":{"k":1},"safe":42}');
    assert.equal(out.safe, 42);
    assert.equal(Object.prototype.hasOwnProperty.call(out, "constructor"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out, "prototype"), false);
  });
  it("returns null on malformed JSON", () => {
    assert.equal(safeJsonParse("{not json"), null);
    assert.equal(safeJsonParse(""), null);
  });
  it("returns null on non-string input", () => {
    assert.equal(safeJsonParse(null), null);
    assert.equal(safeJsonParse(undefined), null);
    assert.equal(safeJsonParse(42), null);
  });
});

describe("parseBridgeUnits — pure schema parser", () => {
  it("happy path — both wiring + deep_integration arrays present", () => {
    const r = parseBridgeUnits({
      bridge_units: {
        wiring: [{ id: "U-W1" }, { id: "U-W2" }],
        deep_integration: [{ id: "U-D1" }],
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.wiring.length, 2);
    assert.equal(r.deepIntegration.length, 1);
  });
  it("missing bridge_units key → no-bridge-units, both arrays still present", () => {
    const r = parseBridgeUnits({ stats: {} });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no-bridge-units");
    assert.deepEqual(r.wiring, []);
    assert.deepEqual(r.deepIntegration, []);
  });
  it("non-array wiring/deep_integration silently coerce to [] (forward-compat)", () => {
    const r = parseBridgeUnits({ bridge_units: { wiring: "not-array", deep_integration: null } });
    assert.equal(r.ok, true);
    assert.deepEqual(r.wiring, []);
    assert.deepEqual(r.deepIntegration, []);
  });
  it("rejects non-object input", () => {
    assert.equal(parseBridgeUnits(null).ok, false);
    assert.equal(parseBridgeUnits(undefined).ok, false);
    assert.equal(parseBridgeUnits("string").ok, false);
    assert.equal(parseBridgeUnits(42).ok, false);
  });
});

describe("loadBridgeUnits — fail-soft", () => {
  it("disable-env short-circuits before path lookup", () => {
    process.env.PRISM_ZEBRA_CONTEXT_DISABLE = "1";
    const env = loadBridgeUnits({ roadmapPath: "/nonexistent/x.json" });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "disabled-env");
  });
  it("explicit empty roadmapPath → no-path (R12 fail-loud)", () => {
    const env = loadBridgeUnits({ roadmapPath: "" });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "no-path");
  });
  it("invalid kind → invalid-kind BEFORE disk I/O", () => {
    // Use a synthetic reader; it should never be called.
    const reader = makeReader({});
    const env = loadBridgeUnits({ kind: "garbage", reader, now: () => FAKE_NOW });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "invalid-kind");
    assert.equal(reader.calls.size, 0); // never reached the file system
  });
  it("adversarial topK (NaN, negative, Infinity) rejected pre-I/O", () => {
    for (const bad of [NaN, -1, -Infinity, Infinity, "abc"]) {
      const reader = makeReader({});
      const env = loadBridgeUnits({ topK: bad, reader });
      assert.equal(env.ok, false, `topK=${String(bad)} should fail`);
      assert.equal(env.reason, "invalid-topk");
    }
  });
  it("missing file → missing reason", () => {
    const reader = makeReader({}); // empty store → every read returns missing
    const env = loadBridgeUnits({ roadmapPath: "/x.json", reader });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "missing");
  });
  it("malformed JSON → parse-error", () => {
    const tmp = path.join(process.env.TEMP || "/tmp", `roadmap-bad-${Date.now()}.json`);
    fs.writeFileSync(tmp, "{not json", "utf8");
    try {
      const env = loadBridgeUnits({ roadmapPath: tmp });
      assert.equal(env.ok, false);
      assert.equal(env.reason, "parse-error");
    } finally {
      try { fs.unlinkSync(tmp); } catch { /* best-effort */ }
    }
  });
});

describe("loadBridgeUnits — happy path + filters", () => {
  const SAMPLE = {
    bridge_units: {
      wiring: [{ id: "U-W1" }, { id: "U-W2" }, { id: "U-W3" }],
      deep_integration: [{ id: "U-D1" }, { id: "U-D2" }],
    },
  };
  const SAMPLE_JSON = JSON.stringify(SAMPLE);

  it("kind=all returns wiring concat deep_integration (5 total)", () => {
    const reader = makeReader({ ["/r.json"]: { ok: true, content: SAMPLE_JSON, mtime: FAKE_NOW } });
    const env = loadBridgeUnits({ roadmapPath: "/r.json", reader, now: () => FAKE_NOW });
    assert.equal(env.ok, true);
    assert.equal(env.bridgeUnits.length, 5);
    assert.equal(env.wiringCount, 3);
    assert.equal(env.deepIntegrationCount, 2);
    assert.equal(env.totalAvailable, 5);
    assert.equal(env.kind, "all");
  });
  it("kind=wiring returns wiring only", () => {
    const reader = makeReader({ ["/r.json"]: { ok: true, content: SAMPLE_JSON, mtime: FAKE_NOW } });
    const env = loadBridgeUnits({ roadmapPath: "/r.json", kind: "wiring", reader });
    assert.equal(env.bridgeUnits.length, 3);
    assert.equal(env.kind, "wiring");
  });
  it("kind=deep_integration returns deep_integration only", () => {
    const reader = makeReader({ ["/r.json"]: { ok: true, content: SAMPLE_JSON, mtime: FAKE_NOW } });
    const env = loadBridgeUnits({ roadmapPath: "/r.json", kind: "deep_integration", reader });
    assert.equal(env.bridgeUnits.length, 2);
    assert.equal(env.kind, "deep_integration");
  });
  it("topK clamps to totalAvailable", () => {
    const reader = makeReader({ ["/r.json"]: { ok: true, content: SAMPLE_JSON, mtime: FAKE_NOW } });
    const env = loadBridgeUnits({ roadmapPath: "/r.json", topK: 100, reader });
    assert.equal(env.bridgeUnits.length, 5); // clamped, not crashed
    assert.equal(env.topK, 5);
  });
  it("topK=0 returns empty array (valid edge — explicit no-results)", () => {
    const reader = makeReader({ ["/r.json"]: { ok: true, content: SAMPLE_JSON, mtime: FAKE_NOW } });
    const env = loadBridgeUnits({ roadmapPath: "/r.json", topK: 0, reader });
    assert.equal(env.ok, true);
    assert.equal(env.bridgeUnits.length, 0);
    assert.equal(env.topK, 0);
  });
  it("schema-mismatch (no bridge_units key) → reason surfaced", () => {
    const reader = makeReader({ ["/r.json"]: { ok: true, content: '{"stats":{}}', mtime: FAKE_NOW } });
    const env = loadBridgeUnits({ roadmapPath: "/r.json", reader });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "no-bridge-units");
  });
});

// ============================================================================
// U-ZO-MS0-03 — loadSlotSoulRefuseList + parseSoulFrontmatter + extractFrontmatterText
// ============================================================================

describe("extractFrontmatterText", () => {
  it("extracts standard frontmatter", () => {
    const t = "---\nslot: bravo\nrole: x\n---\n# body";
    assert.equal(extractFrontmatterText(t), "slot: bravo\nrole: x");
  });
  it("tolerates CRLF line endings", () => {
    const t = "---\r\nslot: bravo\r\n---\r\nbody";
    assert.equal(extractFrontmatterText(t), "slot: bravo");
  });
  it("tolerates BOM prefix", () => {
    const t = "﻿---\nk: v\n---\nbody";
    assert.equal(extractFrontmatterText(t), "k: v");
  });
  it("returns null when no frontmatter block", () => {
    assert.equal(extractFrontmatterText("# just a heading\nno frontmatter"), null);
  });
  it("returns null on non-string input", () => {
    assert.equal(extractFrontmatterText(null), null);
    assert.equal(extractFrontmatterText(42), null);
  });
});

describe("parseSoulFrontmatter", () => {
  it("happy path — extracts refuseList + hermesRole + domainFilter", () => {
    const fm = `slot: bravo
hermes_role: specialist-mill
domain_filter: mill|milling
refuse_list:
  - inline-physics-constants
  - stub-engine-creation`;
    const r = parseSoulFrontmatter(fm);
    assert.deepEqual(r.refuseList, ["inline-physics-constants", "stub-engine-creation"]);
    assert.equal(r.hermesRole, "specialist-mill");
    assert.equal(r.domainFilter, "mill|milling");
    assert.equal(r.malformed, false);
  });
  it("no refuse_list key → empty array, not malformed", () => {
    const r = parseSoulFrontmatter("slot: alpha\nhermes_role: x");
    assert.deepEqual(r.refuseList, []);
    assert.equal(r.hermesRole, "x");
    assert.equal(r.malformed, false);
  });
  it("inline-bracket refuse_list → malformed", () => {
    const r = parseSoulFrontmatter("refuse_list: [a, b]");
    assert.equal(r.malformed, true);
  });
  it("strips surrounding quotes on list items", () => {
    const r = parseSoulFrontmatter('refuse_list:\n  - "quoted-item"\n  - \'single-quoted\'');
    assert.deepEqual(r.refuseList, ["quoted-item", "single-quoted"]);
  });
  it("empty string → empty arrays, not malformed (genuinely empty doc)", () => {
    const r = parseSoulFrontmatter("");
    assert.deepEqual(r.refuseList, []);
    assert.equal(r.malformed, false);
  });
  it("non-string input → malformed:true (programmer error)", () => {
    assert.equal(parseSoulFrontmatter(null).malformed, true);
    assert.equal(parseSoulFrontmatter(42).malformed, true);
  });
});

describe("loadSlotSoulRefuseList — fail-soft", () => {
  it("disable-env short-circuits BEFORE slot validation (P0-B)", () => {
    process.env.PRISM_ZEBRA_CONTEXT_DISABLE = "1";
    const env = loadSlotSoulRefuseList("not-a-slot");
    assert.equal(env.ok, false);
    assert.equal(env.reason, "disabled-env");
    assert.equal(env.slot, null); // not reflected
  });
  it("path-traversal string → invalid-slot, slot field is null (P0-C — no reflection)", () => {
    const env = loadSlotSoulRefuseList("../../etc/passwd");
    assert.equal(env.ok, false);
    assert.equal(env.reason, "invalid-slot");
    assert.equal(env.slot, null);
  });
  it("rejects non-NATO slots", () => {
    for (const bad of ["alphax", "zaza", "", null, undefined, 42]) {
      const env = loadSlotSoulRefuseList(bad);
      assert.equal(env.ok, false, `slot=${String(bad)} should be invalid`);
      assert.equal(env.reason, "invalid-slot");
    }
  });
  it("normalizes case + whitespace before validation", () => {
    const reader = makeReader({});
    const env = loadSlotSoulRefuseList("  BRAVO  ", { reader });
    // Normalized to "bravo" which IS in KNOWN_SLOTS, so we proceed to read
    // — file is missing in our synthetic reader, but slot validation passed.
    assert.equal(env.reason, "missing");
    assert.equal(env.slot, "bravo");
  });
  it("missing soul file → missing reason", () => {
    const reader = makeReader({});
    const env = loadSlotSoulRefuseList("bravo", { soulsDir: "/no/such/dir", reader });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "missing");
    assert.equal(env.slot, "bravo");
  });
});

describe("loadSlotSoulRefuseList — happy path across spanning slots", () => {
  // ≥3 spanning slots per comprehensive-build floor.
  const SAMPLES = {
    bravo: `---
slot: bravo
role: mill-specialist
hermes_role: specialist-mill
domain_filter: mill|milling|kienzle
refuse_list:
  - inline-physics-constants
  - stub-engine-creation
  - softening-safety-thresholds
---
# Bravo soul`,
    lima: `---
slot: lima
hermes_role: specialist-academy
refuse_list:
  - bypass-prerequisite-checks
---
body`,
    india: `---
slot: india
hermes_role: specialist-post
refuse_list:
  - emit-without-postvalidate
  - skip-controller-dialect-check
---
body`,
  };
  function mkRecords(soulsDir) {
    const recs = {};
    for (const [slot, content] of Object.entries(SAMPLES)) {
      recs[path.resolve(path.join(soulsDir, `${slot}.md`))] = { ok: true, content, mtime: FAKE_NOW };
    }
    return recs;
  }

  it("bravo — mill specialist with 3 refuses", () => {
    const soulsDir = "/test/souls";
    const reader = makeReader(mkRecords(soulsDir));
    const env = loadSlotSoulRefuseList("bravo", { soulsDir, reader, now: () => FAKE_NOW });
    assert.equal(env.ok, true);
    assert.equal(env.slot, "bravo");
    assert.equal(env.refuseList.length, 3);
    assert.ok(env.refuseList.includes("inline-physics-constants"));
    assert.equal(env.hermesRole, "specialist-mill");
    assert.equal(env.domainFilter, "mill|milling|kienzle");
  });
  it("lima — academy specialist with 1 refuse", () => {
    const soulsDir = "/test/souls";
    const reader = makeReader(mkRecords(soulsDir));
    const env = loadSlotSoulRefuseList("lima", { soulsDir, reader });
    assert.equal(env.refuseList.length, 1);
    assert.equal(env.hermesRole, "specialist-academy");
  });
  it("india — post specialist with 2 refuses", () => {
    const soulsDir = "/test/souls";
    const reader = makeReader(mkRecords(soulsDir));
    const env = loadSlotSoulRefuseList("india", { soulsDir, reader });
    assert.equal(env.refuseList.length, 2);
  });
});

describe("KNOWN_SLOTS sanity", () => {
  it("contains 26 NATO names", () => {
    assert.equal(KNOWN_SLOTS.length, 26);
  });
  it("is frozen", () => {
    assert.throws(() => { KNOWN_SLOTS.push("extra"); }, /TypeError|Cannot|read.only/);
  });
  it("includes all golf-and-after slots (post-2026-05-19 expansion)", () => {
    for (const slot of ["golf", "mike", "november", "zulu"]) {
      assert.ok(KNOWN_SLOTS.includes(slot), `${slot} missing`);
    }
  });
});

// ============================================================================
// U-ZO-MS0-04 — loadLoopState + findActiveLoops + parseLoopState + isValidSessionId
// ============================================================================

describe("isValidSessionId", () => {
  it("accepts canonical UUID-shape", () => {
    assert.equal(isValidSessionId("00a9c6dc-0c91-4629-88da-a181fbfef41f"), true);
  });
  it("rejects non-UUID strings", () => {
    for (const bad of ["", "bad-id", "not-a-uuid", "00a9c6dc", null, undefined, 42, "../etc/passwd"]) {
      assert.equal(isValidSessionId(bad), false, `${String(bad)} should be invalid`);
    }
  });
  it("accepts uppercase hex (case-insensitive)", () => {
    assert.equal(isValidSessionId("00A9C6DC-0C91-4629-88DA-A181FBFEF41F"), true);
  });
});

describe("parseLoopState", () => {
  it("happy path — running loop", () => {
    const r = parseLoopState({
      schemaVersion: "1.0.0", sessionId: "x", task: "build", target: 5,
      iter: 3, status: "running", startedAt: "2026-05-25T00:00:00Z",
      lastTickAt: "2026-05-25T00:10:00Z",
    });
    assert.equal(r.ok, true);
    assert.equal(r.running, true);
    assert.equal(r.iter, 3);
    assert.equal(r.target, 5);
  });
  it("status != running → running:false", () => {
    for (const s of ["completed", "failed", "cancelled", "stopped"]) {
      const r = parseLoopState({ schemaVersion: "1.0.0", status: s });
      assert.equal(r.running, false, `status=${s}`);
    }
  });
  it("unknown schemaVersion → schema-version-unsupported (P1-F)", () => {
    const r = parseLoopState({ schemaVersion: "2.0.0", status: "running" });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "schema-version-unsupported");
    assert.equal(r.parsedVersion, "2.0.0");
  });
  it("missing schemaVersion → still parses (back-compat)", () => {
    const r = parseLoopState({ status: "running" });
    assert.equal(r.ok, true);
    assert.equal(r.running, true);
  });
  it("rejects non-object input", () => {
    assert.equal(parseLoopState(null).ok, false);
    assert.equal(parseLoopState("string").ok, false);
    assert.equal(parseLoopState(42).ok, false);
  });
  it("status field missing → unknown status, running:false", () => {
    const r = parseLoopState({ schemaVersion: "1.0.0" });
    assert.equal(r.status, "unknown");
    assert.equal(r.running, false);
  });
  it("KNOWN_LOOP_SCHEMA_VERSIONS is frozen", () => {
    assert.throws(() => { KNOWN_LOOP_SCHEMA_VERSIONS.push("x"); }, /TypeError|Cannot|read.only/);
  });
});

describe("loadLoopState — fail-soft", () => {
  const VALID_SID = "00a9c6dc-0c91-4629-88da-a181fbfef41f";
  it("disable-env short-circuits BEFORE sessionId validation (P0-B)", () => {
    process.env.PRISM_ZEBRA_CONTEXT_DISABLE = "1";
    const env = loadLoopState("not-a-uuid");
    assert.equal(env.ok, false);
    assert.equal(env.reason, "disabled-env");
    assert.equal(env.sessionId, null);
  });
  it("invalid sessionId → invalid-session-id, sessionId is null (P0-C — no reflection)", () => {
    const env = loadLoopState("../etc/passwd");
    assert.equal(env.reason, "invalid-session-id");
    assert.equal(env.sessionId, null);
  });
  it("missing file → no-loop (specialized from 'missing')", () => {
    const reader = makeReader({});
    const env = loadLoopState(VALID_SID, { loopDir: "/no/dir", reader });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "no-loop");
  });
  it("malformed JSON → parse-error", () => {
    const reader = makeReader({ [path.resolve(`/d/loop-${VALID_SID}.json`)]: { ok: true, content: "{not json", mtime: FAKE_NOW } });
    const env = loadLoopState(VALID_SID, { loopDir: "/d", reader });
    assert.equal(env.reason, "parse-error");
  });
  it("happy path — running loop returns full envelope", () => {
    const json = JSON.stringify({
      schemaVersion: "1.0.0", sessionId: VALID_SID, task: "wire engines",
      target: 8, iter: 3, status: "running",
      startedAt: "2026-05-25T00:00:00Z", lastTickAt: "2026-05-25T00:30:00Z",
    });
    const reader = makeReader({ [path.resolve(`/d/loop-${VALID_SID}.json`)]: { ok: true, content: json, mtime: FAKE_NOW } });
    const env = loadLoopState(VALID_SID, { loopDir: "/d", reader, now: () => FAKE_NOW });
    assert.equal(env.ok, true);
    assert.equal(env.running, true);
    assert.equal(env.iter, 3);
    assert.equal(env.target, 8);
    assert.equal(env.task, "wire engines");
  });
});

describe("findActiveLoops", () => {
  const SID_A = "00a9c6dc-0c91-4629-88da-a181fbfef41f";
  const SID_B = "11b9c6dc-0c91-4629-88da-a181fbfef41f";
  const SID_C = "22c9c6dc-0c91-4629-88da-a181fbfef41f";

  it("disable-env returns disabled-env", () => {
    process.env.PRISM_ZEBRA_CONTEXT_DISABLE = "1";
    const env = findActiveLoops();
    assert.equal(env.ok, false);
    assert.equal(env.reason, "disabled-env");
    assert.equal(env.scanned, 0);
  });
  it("ENOENT loopDir → loop-dir-missing", () => {
    const env = findActiveLoops({
      readdir: () => ({ ok: false, code: "ENOENT" }),
    });
    assert.equal(env.reason, "loop-dir-missing");
  });
  it("EACCES loopDir → loop-dir-error (distinguished from missing — P1-D)", () => {
    const env = findActiveLoops({
      readdir: () => ({ ok: false, code: "EACCES" }),
    });
    assert.equal(env.reason, "loop-dir-error");
  });
  it("legacy array-return readdir still works (back-compat)", () => {
    const reader = (p) => ({ ok: false, reason: "missing" });
    const env = findActiveLoops({ readdir: () => [], reader });
    assert.equal(env.ok, true);
    assert.equal(env.scanned, 0);
  });
  it("collects only running loops + sorts newest-first", () => {
    const files = [
      `loop-${SID_A}.json`,
      `loop-${SID_B}.json`,
      `loop-${SID_C}.json`,
      "not-a-loop.json",
    ];
    // Use makeReader so record-key path normalization matches the impl's
    // path.join(loopDir, name) lookup form.
    const reader = makeReader({
      [path.join("/d", `loop-${SID_A}.json`)]: { ok: true, content: JSON.stringify({ schemaVersion: "1.0.0", status: "running", lastTickAt: "2026-05-25T01:00:00Z", iter: 1, target: 5, task: "A" }), mtime: FAKE_NOW },
      [path.join("/d", `loop-${SID_B}.json`)]: { ok: true, content: JSON.stringify({ schemaVersion: "1.0.0", status: "completed", lastTickAt: "2026-05-25T00:30:00Z" }), mtime: FAKE_NOW },
      [path.join("/d", `loop-${SID_C}.json`)]: { ok: true, content: JSON.stringify({ schemaVersion: "1.0.0", status: "running", lastTickAt: "2026-05-25T02:00:00Z", iter: 7, target: 10, task: "C" }), mtime: FAKE_NOW },
    });
    const env = findActiveLoops({ loopDir: "/d", readdir: () => files, reader });
    assert.equal(env.ok, true);
    assert.equal(env.scanned, 3); // 3 loop-*.json (not-a-loop.json filtered)
    assert.equal(env.active.length, 2); // SID_B is completed
    // Newest first: SID_C at 02:00 before SID_A at 01:00.
    assert.equal(env.active[0].sessionId, SID_C);
    assert.equal(env.active[1].sessionId, SID_A);
  });
  it("throwing reader does NOT crash scan; skipped counter increments", () => {
    const files = [`loop-${SID_A}.json`, `loop-${SID_B}.json`];
    const reader = (p) => {
      if (p.includes(SID_A)) throw new Error("boom");
      return { ok: true, content: JSON.stringify({ schemaVersion: "1.0.0", status: "running" }), mtime: FAKE_NOW };
    };
    const env = findActiveLoops({ loopDir: "/d", readdir: () => files, reader });
    assert.equal(env.ok, true);
    assert.equal(env.scanned, 2);
    assert.equal(env.skipped, 1); // SID_A threw
    assert.equal(env.active.length, 1); // SID_B ran clean
  });
  it("malformed JSON in one file → skipped, others continue", () => {
    const files = [`loop-${SID_A}.json`, `loop-${SID_B}.json`];
    const reader = (p) => {
      if (p.includes(SID_A)) return { ok: true, content: "{not json", mtime: FAKE_NOW };
      return { ok: true, content: JSON.stringify({ schemaVersion: "1.0.0", status: "running", task: "b" }), mtime: FAKE_NOW };
    };
    const env = findActiveLoops({ loopDir: "/d", readdir: () => files, reader });
    assert.equal(env.skipped, 1);
    assert.equal(env.active.length, 1);
  });
  it("__proto__ injection in a loop file does NOT pollute (proto-pollution guard via safeJsonParse)", () => {
    const files = [`loop-${SID_A}.json`];
    const reader = () => ({
      ok: true,
      content: '{"schemaVersion":"1.0.0","status":"running","__proto__":{"polluted":true}}',
      mtime: FAKE_NOW,
    });
    findActiveLoops({ loopDir: "/d", readdir: () => files, reader });
    // Object.prototype must not have been polluted by the scan.
    assert.equal(({}).polluted, undefined);
  });
});

// ============================================================================
// Real-data E2E for U-ZO-MS0-02/03/04 (per MS1 P0 lesson)
// ============================================================================

describe("real-data E2E for U-ZO-MS0-02/03/04", () => {
  it("ROADMAP-CONSOLIDATED.json actually loads bridge_units on this checkout", () => {
    invalidateContextCache();
    const env = loadBridgeUnits({});
    if (fs.existsSync(DEFAULT_ROADMAP_PATH)) {
      // If the file exists and has the bridge_units key, expect ok:true.
      // If the file is just a stub without bridge_units, no-bridge-units is fine.
      assert.ok(env.reason === null || env.reason === "no-bridge-units",
        `unexpected reason: ${env.reason}`);
      if (env.ok) {
        assert.ok(Array.isArray(env.bridgeUnits));
        assert.equal(typeof env.wiringCount, "number");
        assert.equal(typeof env.deepIntegrationCount, "number");
      }
    } else {
      assert.equal(env.ok, false);
      assert.equal(env.reason, "missing");
    }
  });
  it("bravo soul actually loads on this checkout (or missing)", () => {
    invalidateContextCache();
    const env = loadSlotSoulRefuseList("bravo");
    const bravoPath = path.join(DEFAULT_SOULS_DIR, "bravo.md");
    if (fs.existsSync(bravoPath)) {
      // If the soul file exists, expect ok:true OR a named soft-failure
      // reason (no-frontmatter / malformed) — never crash.
      assert.ok(["ok", "no-frontmatter", "malformed-frontmatter"]
        .includes(env.ok ? "ok" : env.reason),
        `unexpected outcome ok=${env.ok} reason=${env.reason}`);
      if (env.ok) {
        assert.ok(Array.isArray(env.refuseList));
      }
    } else {
      assert.equal(env.ok, false);
      assert.equal(env.reason, "missing");
    }
  });
  it("findActiveLoops actually scans the loop-state dir on this checkout", () => {
    invalidateContextCache();
    const env = findActiveLoops();
    // Either the dir is missing (loop-dir-missing) or the scan succeeded.
    // The scan result must be a structured envelope, never an exception.
    assert.ok(env.ok === true || env.reason === "loop-dir-missing"
      || env.reason === "loop-dir-error",
      `unexpected outcome ok=${env.ok} reason=${env.reason}`);
    if (env.ok) {
      assert.ok(Array.isArray(env.active));
      assert.equal(typeof env.scanned, "number");
      assert.equal(typeof env.skipped, "number");
    }
  });
});

// ============================================================================
// U-ZO-MS0-05 — loadTokenAwarenessZone + parseTokenBudget
// ============================================================================

describe("parseTokenBudget", () => {
  it("happy path — full sidecar shape", () => {
    const r = parseTokenBudget({
      schemaVersion: "1.0.0", zone: "YELLOW", worstPct: 0.45, worstSource: "ctx",
      action: "proceed-cautiously", stale: false, ageMs: 100,
      ctx: { tokens: 450000, maxTokens: 1000000, pct: 0.45 },
      sessionId: "abc", capturedAt: "2026-05-25T20:00:00Z",
    });
    assert.equal(r.ok, true);
    assert.equal(r.zone, "YELLOW");
    assert.equal(r.worstPct, 0.45);
    assert.equal(r.ctxTokens, 450000);
    assert.equal(r.ctxMaxTokens, 1000000);
    assert.equal(r.sessionId, "abc");
  });
  it("unknown zone → UNKNOWN normalization", () => {
    const r = parseTokenBudget({ schemaVersion: "1.0.0", zone: "PURPLE" });
    assert.equal(r.ok, true);
    assert.equal(r.zone, "UNKNOWN");
  });
  it("unknown schemaVersion → schema-version-unsupported", () => {
    const r = parseTokenBudget({ schemaVersion: "9.9.9", zone: "GREEN" });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "schema-version-unsupported");
  });
  it("missing ctx → null ctx fields, still ok", () => {
    const r = parseTokenBudget({ schemaVersion: "1.0.0", zone: "GREEN" });
    assert.equal(r.ok, true);
    assert.equal(r.ctxTokens, null);
    assert.equal(r.ctxMaxTokens, null);
    assert.equal(r.ctxPct, null);
  });
  it("rejects non-object input", () => {
    assert.equal(parseTokenBudget(null).ok, false);
    assert.equal(parseTokenBudget("str").ok, false);
    assert.equal(parseTokenBudget(42).ok, false);
  });
  it("KNOWN_TOKEN_BUDGET_SCHEMA_VERSIONS is frozen", () => {
    assert.throws(() => { KNOWN_TOKEN_BUDGET_SCHEMA_VERSIONS.push("x"); }, /TypeError|Cannot|read.only/);
  });
});

describe("loadTokenAwarenessZone — fail-soft", () => {
  it("disable-env short-circuits BEFORE slot validation", () => {
    process.env.PRISM_ZEBRA_CONTEXT_DISABLE = "1";
    const env = loadTokenAwarenessZone("not-a-slot");
    assert.equal(env.reason, "disabled-env");
    assert.equal(env.slot, null);
  });
  it("path-traversal slot → invalid-slot, slot:null", () => {
    const env = loadTokenAwarenessZone("../etc/passwd");
    assert.equal(env.reason, "invalid-slot");
    assert.equal(env.slot, null);
  });
  it("non-NATO slot rejected", () => {
    for (const bad of ["", null, undefined, 42, "alphax"]) {
      const env = loadTokenAwarenessZone(bad);
      assert.equal(env.reason, "invalid-slot", `slot=${String(bad)}`);
    }
  });
  it("missing sidecar → missing reason", () => {
    const reader = makeReader({});
    const env = loadTokenAwarenessZone("bravo", { tokenBudgetDir: "/no/dir", reader });
    assert.equal(env.reason, "missing");
  });
  it("malformed JSON → parse-error", () => {
    const reader = makeReader({
      [path.join("/d", "token-budget-bravo.json")]: { ok: true, content: "{not json", mtime: FAKE_NOW },
    });
    const env = loadTokenAwarenessZone("bravo", { tokenBudgetDir: "/d", reader });
    assert.equal(env.reason, "parse-error");
  });
});

describe("loadTokenAwarenessZone — happy path across zones", () => {
  const FIXTURES = {
    "alpha-green": { zone: "GREEN", worstPct: 0.15, worstSource: "ctx" },
    "bravo-yellow": { zone: "YELLOW", worstPct: 0.45, worstSource: "ctx" },
    "charlie-red": { zone: "RED", worstPct: 0.78, worstSource: "5h" },
  };
  function mkRecords(dir) {
    return Object.fromEntries(Object.entries(FIXTURES).map(([k, v]) => {
      const slot = k.split("-")[0];
      return [
        path.join(dir, `token-budget-${slot}.json`),
        { ok: true, content: JSON.stringify({
          schemaVersion: "1.0.0", capturedAt: "2026-05-25T20:00:00Z",
          zone: v.zone, worstPct: v.worstPct, worstSource: v.worstSource,
          stale: false, ageMs: 0, action: "proceed",
          ctx: { tokens: Math.round(v.worstPct * 1000000), maxTokens: 1000000, pct: v.worstPct },
          slot, sessionId: `sid-${slot}`,
        }), mtime: FAKE_NOW },
      ];
    }));
  }

  it("alpha GREEN — low pct", () => {
    const dir = "/test/tb";
    const env = loadTokenAwarenessZone("alpha", { tokenBudgetDir: dir, reader: makeReader(mkRecords(dir)), now: () => FAKE_NOW });
    assert.equal(env.ok, true);
    assert.equal(env.zone, "GREEN");
    assert.equal(env.worstPct, 0.15);
  });
  it("bravo YELLOW — mid pct", () => {
    const dir = "/test/tb";
    const env = loadTokenAwarenessZone("bravo", { tokenBudgetDir: dir, reader: makeReader(mkRecords(dir)), now: () => FAKE_NOW });
    assert.equal(env.zone, "YELLOW");
    assert.equal(env.worstPct, 0.45);
  });
  it("charlie RED — high pct, 5h source", () => {
    const dir = "/test/tb";
    const env = loadTokenAwarenessZone("charlie", { tokenBudgetDir: dir, reader: makeReader(mkRecords(dir)), now: () => FAKE_NOW });
    assert.equal(env.zone, "RED");
    assert.equal(env.worstSource, "5h");
  });
});

// ============================================================================
// U-ZO-MS0-06 — loadSlotContext + deriveZebraDecision
// ============================================================================

describe("deriveZebraDecision — pure suggestion derivation", () => {
  const SOUL_OK = { ok: true, refuseList: [] };
  const SOUL_REFUSES_FORK = { ok: true, refuseList: ["suggest-fork"] };
  const LOOP_RUNNING = { ok: true, running: true };
  const LOOP_IDLE = { ok: true, running: false };
  const TOKEN_GREEN = { ok: true, zone: "GREEN" };
  const TOKEN_RED = { ok: true, zone: "RED" };
  const TOKEN_CRIT = { ok: true, zone: "CRITICAL" };
  const BRIDGE_FULL = { ok: true, bridgeUnits: [{ id: "U-X1" }] };

  it("missing soul → suppressCompact=true (hard-constraint)", () => {
    const d = deriveZebraDecision({ soul: { ok: false } });
    assert.equal(d.recommend, "noop");
    assert.equal(d.suppressCompact, true);
    assert.equal(d.rationale, "no-soul");
  });
  it("loop running → suppressCompact=true (mid-loop bug fix)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_RUNNING });
    assert.equal(d.suppressCompact, true);
    assert.equal(d.rationale, "loop-running");
  });
  it("token GREEN → suppressCompact=true", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: TOKEN_GREEN });
    assert.equal(d.suppressCompact, true);
    assert.ok(d.rationale.includes("token-zone-green"));
  });
  it("token RED → recommend compact", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: TOKEN_RED });
    assert.equal(d.recommend, "compact");
    assert.ok(d.rationale.includes("red"));
  });
  it("token CRITICAL → recommend compact", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: TOKEN_CRIT });
    assert.equal(d.recommend, "compact");
    assert.ok(d.rationale.includes("critical"));
  });
  it("soul refuses 'suggest-fork' → fork removed from allowedSuggestions", () => {
    const d = deriveZebraDecision({ soul: SOUL_REFUSES_FORK, loop: LOOP_IDLE, tokenZone: TOKEN_GREEN });
    assert.ok(!d.allowedSuggestions.includes("suggest-fork"));
    assert.ok(d.allowedSuggestions.includes("suggest-pick"));
  });
  it("bridge units available + idle + not compacting → 'bridge-units-available' in rationale", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, bridgeUnits: BRIDGE_FULL });
    assert.ok(d.rationale.includes("bridge-units-available"));
  });
  it("token RED + bridge units → recommend compact (no bridge-available rationale; compact wins)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: TOKEN_RED, bridgeUnits: BRIDGE_FULL });
    assert.equal(d.recommend, "compact");
    assert.ok(!d.rationale.includes("bridge-units-available"));
  });
  it("loop running + token RED → suppressCompact wins (loop > token)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_RUNNING, tokenZone: TOKEN_RED });
    assert.equal(d.suppressCompact, true);
    assert.equal(d.rationale, "loop-running");
  });
  it("stale token RED → demoted to noop (P1-1 — never compact off dead sidecar)", () => {
    const TOKEN_RED_STALE = { ok: true, zone: "RED", stale: true };
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: TOKEN_RED_STALE });
    assert.equal(d.recommend, "noop");
    assert.equal(d.suppressCompact, true);
    assert.ok(d.rationale.includes("stale"));
  });
  it("stale token CRITICAL → demoted to noop", () => {
    const TOKEN_CRIT_STALE = { ok: true, zone: "CRITICAL", stale: true };
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: TOKEN_CRIT_STALE });
    assert.equal(d.recommend, "noop");
    assert.ok(d.rationale.includes("critical-but-stale"));
  });

  // YELLOW branch (slot:bravo 2026-06-18) -- the PRUDENT proactive-compaction band that
  // was a dead no-op before this fix, so self-compact never activated until the late RED
  // zone. Honors the token-awareness writer's own `action` (wrap-up/compact) as the
  // corroborating signal the doc promised.
  it("token YELLOW + action wrap-up -> recommend compact (the prudent band; was the missing branch)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: { ok: true, zone: "YELLOW", action: "wrap-up" } });
    assert.equal(d.recommend, "compact");
    assert.equal(d.suppressCompact, false);
    assert.equal(d.rationale, "token-zone-yellow-wrap-up");
  });
  it("token YELLOW + action compact -> recommend compact", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: { ok: true, zone: "YELLOW", action: "compact" } });
    assert.equal(d.recommend, "compact");
    assert.equal(d.rationale, "token-zone-yellow-compact");
  });
  it("token YELLOW below midpoint (worstPct 0.3) -> noop mild EVEN WITH wrap-up (don't compact at 25-50%)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: { ok: true, zone: "YELLOW", action: "wrap-up", worstPct: 0.3 } });
    assert.equal(d.recommend, "noop");
    assert.ok(d.rationale.includes("token-zone-yellow-mild"));
  });
  it("token YELLOW past midpoint (worstPct 0.6) + wrap-up -> recommend compact", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: { ok: true, zone: "YELLOW", action: "wrap-up", worstPct: 0.6 } });
    assert.equal(d.recommend, "compact");
    assert.equal(d.rationale, "token-zone-yellow-wrap-up");
  });
  it("token YELLOW + non-compact action (continue) -> noop mild (defensive guard)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: { ok: true, zone: "YELLOW", action: "continue", worstPct: 0.6 } });
    assert.equal(d.recommend, "noop");
    assert.ok(d.rationale.includes("token-zone-yellow-mild"));
  });
  it("token YELLOW + wrap-up but STALE -> demoted to noop (never compact off a dead sidecar)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: { ok: true, zone: "YELLOW", action: "wrap-up", stale: true } });
    assert.equal(d.recommend, "noop");
    assert.equal(d.rationale, "token-zone-yellow-but-stale");
  });
  it("token YELLOW wrap-up + bridge units -> compact wins (no bridge-available rationale)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: { ok: true, zone: "YELLOW", action: "wrap-up" }, bridgeUnits: BRIDGE_FULL });
    assert.equal(d.recommend, "compact");
    assert.ok(!d.rationale.includes("bridge-units-available"));
  });
  it("token YELLOW below midpoint + bridge units -> noop WITH bridge-units-available (keep building)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_IDLE, tokenZone: { ok: true, zone: "YELLOW", action: "wrap-up", worstPct: 0.3 }, bridgeUnits: BRIDGE_FULL });
    assert.equal(d.recommend, "noop");
    assert.ok(d.rationale.includes("bridge-units-available"));
  });
  it("loop running + token YELLOW wrap-up -> suppress wins (loop > token)", () => {
    const d = deriveZebraDecision({ soul: SOUL_OK, loop: LOOP_RUNNING, tokenZone: { ok: true, zone: "YELLOW", action: "wrap-up" } });
    assert.equal(d.suppressCompact, true);
    assert.equal(d.rationale, "loop-running");
  });
});

describe("loadSlotContext — composite reader", () => {
  it("disable-env returns disabled-env decision", () => {
    process.env.PRISM_ZEBRA_CONTEXT_DISABLE = "1";
    const ctx = loadSlotContext("bravo");
    assert.equal(ctx.ok, false);
    assert.equal(ctx.reason, "disabled-env");
    assert.equal(ctx.decision.suppressCompact, true);
  });
  it("invalid slot → suppressCompact + invalid-slot decision", () => {
    const ctx = loadSlotContext("../etc/passwd");
    assert.equal(ctx.ok, false);
    assert.equal(ctx.reason, "invalid-slot");
    assert.equal(ctx.slot, null);
    assert.equal(ctx.decision.suppressCompact, true);
  });
  it("happy path — all 5 surfaces resolve, full bundle returned", () => {
    const soulsDir = "/test/souls";
    const tbDir = "/test/tb";
    const loopDir = "/test/loops";
    const roadmapPath = "/test/roadmap.json";
    const SID = "00a9c6dc-0c91-4629-88da-a181fbfef41f";

    const soulContent = `---
slot: bravo
hermes_role: specialist-mill
refuse_list:
  - inline-physics-constants
---
body`;
    const tokenContent = JSON.stringify({
      schemaVersion: "1.0.0", zone: "YELLOW", worstPct: 0.45,
      ctx: { tokens: 450000, maxTokens: 1000000, pct: 0.45 },
      stale: false, capturedAt: "2026-05-25T20:00:00Z",
    });
    const loopContent = JSON.stringify({
      schemaVersion: "1.0.0", sessionId: SID, status: "running",
      iter: 2, target: 10, task: "x",
    });
    const roadmapContent = JSON.stringify({
      bridge_units: {
        wiring: [{ id: "U-W1" }],
        deep_integration: [{ id: "U-D1" }],
      },
    });

    const records = {
      [path.join(soulsDir, "bravo.md")]: { ok: true, content: soulContent, mtime: FAKE_NOW },
      [path.join(tbDir, "token-budget-bravo.json")]: { ok: true, content: tokenContent, mtime: FAKE_NOW },
      [path.join(loopDir, `loop-${SID}.json`)]: { ok: true, content: loopContent, mtime: FAKE_NOW },
      [roadmapPath]: { ok: true, content: roadmapContent, mtime: FAKE_NOW },
    };
    const reader = makeReader(records);
    const ctx = loadSlotContext("bravo", {
      sessionId: SID, soulsDir, tokenBudgetDir: tbDir, loopDir, roadmapPath,
      reader, now: () => FAKE_NOW,
    });
    assert.equal(ctx.ok, true);
    assert.equal(ctx.slot, "bravo");
    assert.equal(ctx.sessionId, SID);
    assert.equal(ctx.soul.ok, true);
    assert.equal(ctx.loop.ok, true);
    assert.equal(ctx.loop.running, true);
    assert.equal(ctx.tokenZone.ok, true);
    assert.equal(ctx.tokenZone.zone, "YELLOW");
    assert.equal(ctx.bridgeUnits.ok, true);
    assert.equal(ctx.bridgeUnits.bridgeUnits.length, 2);
    // Loop running → suppressCompact wins over token-yellow
    assert.equal(ctx.decision.suppressCompact, true);
    assert.equal(ctx.decision.rationale, "loop-running");
    // Per-surface envelope summaries
    assert.equal(ctx.surfaces.soul.ok, true);
    assert.equal(ctx.surfaces.loop.ok, true);
    assert.equal(ctx.surfaces.tokenZone.ok, true);
  });
  it("no sessionId → loop returns no-session-id, other surfaces still tried", () => {
    const soulsDir = "/test/souls";
    const records = {
      [path.join(soulsDir, "lima.md")]: { ok: true, content: "---\nslot: lima\nrefuse_list:\n  - x\n---\nbody", mtime: FAKE_NOW },
    };
    const reader = makeReader(records);
    const ctx = loadSlotContext("lima", { soulsDir, reader });
    assert.equal(ctx.soul.ok, true);
    assert.equal(ctx.loop.ok, false);
    assert.equal(ctx.loop.reason, "no-session-id");
  });
  it("CRITICAL token + idle + soul ok → recommend compact (operator-gate preserved — SUGGESTION only)", () => {
    const soulsDir = "/test/souls";
    const tbDir = "/test/tb";
    // Multi-line empty refuse_list (inline `[]` is rejected by parseSoulFrontmatter as malformed).
    const soulContent = "---\nslot: bravo\nhermes_role: specialist-mill\nrefuse_list:\n---\nbody";
    const records = {
      [path.join(soulsDir, "bravo.md")]: { ok: true, content: soulContent, mtime: FAKE_NOW },
      [path.join(tbDir, "token-budget-bravo.json")]: { ok: true, content: JSON.stringify({ schemaVersion: "1.0.0", zone: "CRITICAL", stale: false }), mtime: FAKE_NOW },
    };
    const reader = makeReader(records);
    const ctx = loadSlotContext("bravo", { soulsDir, tokenBudgetDir: tbDir, reader, now: () => FAKE_NOW });
    assert.equal(ctx.decision.recommend, "compact");
    assert.ok(ctx.decision.rationale.includes("critical"));
    // Verify NOT the stale-demoted form (P1-1)
    assert.ok(!ctx.decision.rationale.includes("stale"));
  });
  it("real-data E2E — bravo slot loads composite without crash", () => {
    invalidateContextCache();
    const ctx = loadSlotContext("bravo");
    // We may or may not have a soul/token/loop on this checkout; the
    // composite must NEVER throw and always return a well-shaped envelope.
    assert.equal(typeof ctx, "object");
    assert.equal(typeof ctx.decision, "object");
    assert.equal(typeof ctx.surfaces, "object");
    assert.ok(["clear", "compact", "noop"].includes(ctx.decision.recommend));
    assert.equal(typeof ctx.decision.suppressCompact, "boolean");
    assert.ok(Array.isArray(ctx.decision.allowedSuggestions));
  });
});
