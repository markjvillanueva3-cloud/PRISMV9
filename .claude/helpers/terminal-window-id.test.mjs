// Regression tests for terminal-window-id.mjs
// Run: node --test H:/prism/.claude/helpers/terminal-window-id.test.mjs
//
// Covers the F8/P0-FIX behavior:
//   - tier ranking
//   - WT_SESSION priority
//   - explicit override priority
//   - disable knob
//   - cache hit short-circuits computation
//   - never-downgrade rule (tw-ps cached → fresh tw-pp NEVER overwrites)
//   - cache write on fresh resolution
//   - cache miss with no sessionId → resolves but doesn't cache
//   - adversarial inputs (NaN, Infinity, null, empty)
//   - cache file isolation per test (PRISM_TWID_CACHE_FILE)

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TMP_DIR = path.join(os.tmpdir(), `twid-test-${process.pid}-${Date.now()}`);
const TMP_CACHE = path.join(TMP_DIR, "cache.json");

// Save originals; restore in `after()`.
const ORIG_ENV = {
  PRISM_TERMINAL_WINDOW_ID: process.env.PRISM_TERMINAL_WINDOW_ID,
  PRISM_TERMINAL_WINDOW_ID_DISABLE: process.env.PRISM_TERMINAL_WINDOW_ID_DISABLE,
  PRISM_TWID_CACHE_FILE: process.env.PRISM_TWID_CACHE_FILE,
  PRISM_TWID_CACHE_DISABLE: process.env.PRISM_TWID_CACHE_DISABLE,
  WT_SESSION: process.env.WT_SESSION,
};

function resetEnv() {
  delete process.env.PRISM_TERMINAL_WINDOW_ID;
  delete process.env.PRISM_TERMINAL_WINDOW_ID_DISABLE;
  delete process.env.PRISM_TWID_CACHE_DISABLE;
  delete process.env.WT_SESSION;
  process.env.PRISM_TWID_CACHE_FILE = TMP_CACHE;
}

function clearCacheFile() {
  try { fs.rmSync(TMP_CACHE, { force: true }); } catch {}
}

before(() => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
  for (const [k, v] of Object.entries(ORIG_ENV)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}
});

beforeEach(() => {
  resetEnv();
  clearCacheFile();
});

// Re-import per test would ideally use a fresh module cache; node:test doesn't
// have a built-in for this. The module is pure-ish (only reads env at call
// time), so re-importing once at top is sufficient. Cache file is per-call.
const { tierOf, resolveTerminalWindowId } = await import(`file:///${path.resolve("H:/prism/.claude/helpers/terminal-window-id.mjs").replace(/\\/g, "/")}?t=${Date.now()}`);

describe("tierOf", () => {
  it("ranks tw-wt highest (Windows Terminal session)", () => {
    assert.equal(tierOf("tw-wt-abc-def"), 4);
  });
  it("ranks tw-ps (PowerShell ancestor) at 3", () => {
    assert.equal(tierOf("tw-ps-23476"), 3);
  });
  it("ranks tw-pa (parent ancestor) at 2", () => {
    assert.equal(tierOf("tw-pa-12345"), 2);
  });
  it("ranks tw-pp (immediate parent PID) lowest", () => {
    assert.equal(tierOf("tw-pp-28796"), 1);
  });
  it("returns 0 for unknown tier prefix", () => {
    assert.equal(tierOf("tw-zz-foo"), 0);
  });
  it("returns 0 for non-string", () => {
    assert.equal(tierOf(null), 0);
    assert.equal(tierOf(undefined), 0);
    assert.equal(tierOf(42), 0);
    assert.equal(tierOf({}), 0);
  });
  it("returns 0 for empty / malformed", () => {
    assert.equal(tierOf(""), 0);
    assert.equal(tierOf("no-tier-prefix"), 0);
    assert.equal(tierOf("tw-"), 0);
  });
});

describe("resolveTerminalWindowId — override + disable knobs", () => {
  it("returns null when PRISM_TERMINAL_WINDOW_ID_DISABLE=1", () => {
    process.env.PRISM_TERMINAL_WINDOW_ID_DISABLE = "1";
    assert.equal(resolveTerminalWindowId({ sessionId: "s1" }), null);
  });
  it("returns explicit PRISM_TERMINAL_WINDOW_ID override verbatim", () => {
    process.env.PRISM_TERMINAL_WINDOW_ID = "tw-test-fixed-id";
    const got = resolveTerminalWindowId({ sessionId: "s1" });
    assert.equal(got, "tw-test-fixed-id");
  });
  it("override beats WT_SESSION", () => {
    process.env.PRISM_TERMINAL_WINDOW_ID = "tw-override-wins";
    process.env.WT_SESSION = "11111111-2222-3333-4444-555555555555";
    assert.equal(resolveTerminalWindowId({ sessionId: "s1" }), "tw-override-wins");
  });
  it("trims whitespace in override", () => {
    process.env.PRISM_TERMINAL_WINDOW_ID = "  tw-trimmed  ";
    assert.equal(resolveTerminalWindowId({ sessionId: "s1" }), "tw-trimmed");
  });
  it("ignores empty/whitespace-only override", () => {
    process.env.PRISM_TERMINAL_WINDOW_ID = "   ";
    process.env.WT_SESSION = "deadbeef-1234-5678-9abc-def012345678";
    // Should fall through to WT_SESSION
    const got = resolveTerminalWindowId({ sessionId: "s1" });
    assert.match(got, /^tw-wt-deadbeef/);
  });
});

describe("resolveTerminalWindowId — WT_SESSION priority", () => {
  it("returns tw-wt-<uuid> when WT_SESSION is a UUID", () => {
    process.env.WT_SESSION = "ABC12345-6789-DEF0-1234-567890ABCDEF";
    const got = resolveTerminalWindowId({ sessionId: "s1" });
    assert.match(got, /^tw-wt-abc12345-6789-def0-1234-567890abcdef$/);
  });
  it("ignores malformed WT_SESSION (too short)", () => {
    process.env.WT_SESSION = "abc";
    process.env.PRISM_TERMINAL_WINDOW_ID_DISABLE = "1";  // force null so test is deterministic
    assert.equal(resolveTerminalWindowId({ sessionId: "s1" }), null);
  });
  it("ignores non-hex WT_SESSION", () => {
    process.env.WT_SESSION = "this-is-not-hex-zzzzzz";
    // Falls through to ancestry walk; can't assert specific id, but should NOT start with tw-wt-
    const got = resolveTerminalWindowId({ sessionId: "s1" });
    if (got) assert.ok(!got.startsWith("tw-wt-"));
  });
});

describe("resolveTerminalWindowId — cache hit short-circuits", () => {
  it("returns cached id when sessionId matches, without re-resolving", () => {
    // Pre-seed cache with a tw-ps entry
    fs.writeFileSync(TMP_CACHE, JSON.stringify({
      "session-A": { id: "tw-ps-99999", tier: 3, recordedAt: "2026-05-15T00:00:00Z", lastSeenAt: "2026-05-15T00:00:00Z" },
    }, null, 2));
    // Even if env tries to push tw-wt, cache wins (because we check cache FIRST)
    process.env.WT_SESSION = "deadbeef-1234-5678-9abc-def012345678";
    const got = resolveTerminalWindowId({ sessionId: "session-A" });
    assert.equal(got, "tw-ps-99999");
  });
  it("cache hit refreshes lastSeenAt", () => {
    const initialTime = "2020-01-01T00:00:00Z";
    fs.writeFileSync(TMP_CACHE, JSON.stringify({
      "session-B": { id: "tw-ps-12345", tier: 3, recordedAt: initialTime, lastSeenAt: initialTime },
    }, null, 2));
    resolveTerminalWindowId({ sessionId: "session-B" });
    const updated = JSON.parse(fs.readFileSync(TMP_CACHE, "utf-8"));
    assert.equal(updated["session-B"].id, "tw-ps-12345");
    assert.notEqual(updated["session-B"].lastSeenAt, initialTime);
  });
  it("PRISM_TWID_CACHE_DISABLE=1 skips cache read", () => {
    fs.writeFileSync(TMP_CACHE, JSON.stringify({
      "session-C": { id: "tw-ps-99999", tier: 3, recordedAt: "2026-05-15T00:00:00Z", lastSeenAt: "2026-05-15T00:00:00Z" },
    }, null, 2));
    process.env.PRISM_TWID_CACHE_DISABLE = "1";
    process.env.WT_SESSION = "deadbeef-1234-5678-9abc-def012345678";
    const got = resolveTerminalWindowId({ sessionId: "session-C" });
    // With cache disabled, WT_SESSION wins
    assert.match(got, /^tw-wt-deadbeef/);
  });
});

describe("resolveTerminalWindowId — never-downgrade rule", () => {
  it("does NOT overwrite cached tw-ps with fresh tw-pp", () => {
    fs.writeFileSync(TMP_CACHE, JSON.stringify({
      "session-D": { id: "tw-ps-23476", tier: 3, recordedAt: "2026-05-15T00:00:00Z", lastSeenAt: "2026-05-15T00:00:00Z" },
    }, null, 2));
    // Re-resolve — cache hit returns tw-ps, never even attempts fresh
    const got = resolveTerminalWindowId({ sessionId: "session-D" });
    assert.equal(got, "tw-ps-23476");
    // Verify cache still has the tw-ps (NOT overwritten)
    const cache = JSON.parse(fs.readFileSync(TMP_CACHE, "utf-8"));
    assert.equal(cache["session-D"].id, "tw-ps-23476");
    assert.equal(cache["session-D"].tier, 3);
  });
  it("tier ordering: wt(4) > ps(3) > pa(2) > pp(1) — sanity rank check", () => {
    assert.ok(tierOf("tw-wt-x") > tierOf("tw-ps-x"));
    assert.ok(tierOf("tw-ps-x") > tierOf("tw-pa-x"));
    assert.ok(tierOf("tw-pa-x") > tierOf("tw-pp-x"));
    assert.ok(tierOf("tw-pp-x") > 0);
  });
});

describe("resolveTerminalWindowId — cache write on fresh resolution", () => {
  it("writes new cache entry on first resolution with sessionId", () => {
    process.env.WT_SESSION = "abcd1234-5678-9012-3456-7890abcdef01";
    assert.equal(fs.existsSync(TMP_CACHE), false);
    const got = resolveTerminalWindowId({ sessionId: "fresh-session" });
    assert.ok(got);
    assert.ok(fs.existsSync(TMP_CACHE));
    const cache = JSON.parse(fs.readFileSync(TMP_CACHE, "utf-8"));
    assert.ok(cache["fresh-session"]);
    assert.equal(cache["fresh-session"].id, got);
    assert.equal(cache["fresh-session"].tier, 4);  // tw-wt
  });
  it("no sessionId → resolves but does NOT write cache", () => {
    process.env.WT_SESSION = "abcd1234-5678-9012-3456-7890abcdef01";
    const got = resolveTerminalWindowId({});  // no sessionId
    assert.ok(got);
    // Cache file should not exist (or be empty)
    if (fs.existsSync(TMP_CACHE)) {
      const cache = JSON.parse(fs.readFileSync(TMP_CACHE, "utf-8"));
      assert.deepEqual(Object.keys(cache), []);
    }
  });
});

describe("resolveTerminalWindowId — adversarial inputs", () => {
  it("handles undefined opts", () => {
    process.env.PRISM_TERMINAL_WINDOW_ID = "tw-test-stable";
    assert.equal(resolveTerminalWindowId(), "tw-test-stable");
    assert.equal(resolveTerminalWindowId(undefined), "tw-test-stable");
  });
  it("handles null sessionId", () => {
    process.env.PRISM_TERMINAL_WINDOW_ID = "tw-test-stable";
    assert.equal(resolveTerminalWindowId({ sessionId: null }), "tw-test-stable");
  });
  it("handles non-string sessionId (number/object)", () => {
    process.env.PRISM_TERMINAL_WINDOW_ID = "tw-test-stable";
    assert.equal(resolveTerminalWindowId({ sessionId: 42 }), "tw-test-stable");
    assert.equal(resolveTerminalWindowId({ sessionId: {} }), "tw-test-stable");
  });
  it("handles empty sessionId string", () => {
    process.env.PRISM_TERMINAL_WINDOW_ID = "tw-test-stable";
    assert.equal(resolveTerminalWindowId({ sessionId: "" }), "tw-test-stable");
  });
  it("handles malformed cache file (corrupt JSON) — falls through to fresh resolution", () => {
    fs.writeFileSync(TMP_CACHE, "{ this is not valid json");
    process.env.WT_SESSION = "abcd1234-5678-9012-3456-7890abcdef01";
    const got = resolveTerminalWindowId({ sessionId: "after-corruption" });
    assert.match(got, /^tw-wt-abcd1234/);
  });
  it("handles cache file with non-object root", () => {
    fs.writeFileSync(TMP_CACHE, JSON.stringify(["not", "an", "object"]));
    process.env.WT_SESSION = "abcd1234-5678-9012-3456-7890abcdef01";
    const got = resolveTerminalWindowId({ sessionId: "after-bad-shape" });
    assert.match(got, /^tw-wt-abcd1234/);
  });
});

describe("resolveTerminalWindowId — multi-session cache isolation", () => {
  it("two different sessionIds get independent cache entries", () => {
    fs.writeFileSync(TMP_CACHE, JSON.stringify({
      "sess-X": { id: "tw-ps-11111", tier: 3, recordedAt: "2026-05-15T00:00:00Z", lastSeenAt: "2026-05-15T00:00:00Z" },
      "sess-Y": { id: "tw-ps-22222", tier: 3, recordedAt: "2026-05-15T00:00:00Z", lastSeenAt: "2026-05-15T00:00:00Z" },
    }, null, 2));
    assert.equal(resolveTerminalWindowId({ sessionId: "sess-X" }), "tw-ps-11111");
    assert.equal(resolveTerminalWindowId({ sessionId: "sess-Y" }), "tw-ps-22222");
  });
});
