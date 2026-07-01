// Tests for inject-throttle.mjs — per-session same-prompt throttle.
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  promptHash, safeSessionId, decideThrottle, statePathFor,
  loadPrev, savePrev, shouldThrottleInject, pruneStaleSessions,
  DEFAULT_THROTTLE_MS, DEFAULT_PRUNE_MS,
} from "./inject-throttle.mjs";

describe("promptHash", () => {
  it("is deterministic + collision-distinct + null-safe", () => {
    assert.equal(promptHash("hello world"), promptHash("hello world"));
    assert.notEqual(promptHash("a"), promptHash("b"));
    assert.equal(typeof promptHash(null), "string");
    assert.equal(promptHash("").length, 16);
  });
});

describe("safeSessionId", () => {
  it("strips unsafe chars + null-on-empty (path-traversal guard)", () => {
    assert.equal(safeSessionId("abc-123_DEF.4"), "abc-123_DEF.4");
    assert.equal(safeSessionId("../../etc/passwd"), "....etcpasswd");
    assert.equal(safeSessionId(""), null);
    assert.equal(safeSessionId(null), null);
  });
});

describe("decideThrottle (pure)", () => {
  const hash = "h1";
  it("does NOT skip when there is no prior injection", () => {
    assert.equal(decideThrottle({ prev: null, hash, nowMs: 1000, ttlMs: 60000 }).skip, false);
  });
  it("SKIPS the same prompt within the ttl window", () => {
    const prev = { hash: "h1", ts: 1000 };
    assert.equal(decideThrottle({ prev, hash, nowMs: 1000 + 30_000, ttlMs: 60_000 }).skip, true);
  });
  it("does NOT skip the same prompt once the ttl window has elapsed", () => {
    const prev = { hash: "h1", ts: 1000 };
    assert.equal(decideThrottle({ prev, hash, nowMs: 1000 + 61_000, ttlMs: 60_000 }).skip, false);
  });
  it("does NOT skip a DIFFERENT prompt within the window", () => {
    const prev = { hash: "h1", ts: 1000 };
    assert.equal(decideThrottle({ prev, hash: "h2", nowMs: 1000 + 10_000, ttlMs: 60_000 }).skip, false);
  });
  it("returns the next {hash, ts} stamp", () => {
    const { next } = decideThrottle({ prev: null, hash, nowMs: 1234, ttlMs: 60000 });
    assert.deepEqual(next, { hash: "h1", ts: 1234 });
  });
});

describe("statePathFor", () => {
  it("is per-session + null when no session id", () => {
    assert.ok(statePathFor("sess-1", { stateDir: "/s" }).includes("sess-1.json"));
    assert.equal(statePathFor("", { stateDir: "/s" }), null);
  });
});

// In-memory fs so the round trip is hermetic.
function memFs() {
  const files = new Map();
  const dirs = new Set();
  return {
    files,
    readImpl: (p) => { if (!files.has(p)) throw new Error("ENOENT"); return files.get(p); },
    writeImpl: (p, d) => { files.set(p, d); },
    renameImpl: (a, b) => { files.set(b, files.get(a)); files.delete(a); },
    mkdirImpl: (d) => { dirs.add(d); },
    existsImpl: (p) => files.has(p) || dirs.has(p),
  };
}

describe("shouldThrottleInject (end-to-end, /loop scenario)", () => {
  it("first prompt injects, immediate repeat is throttled, repeat re-injects after ttl, new prompt injects", () => {
    const fs = memFs();
    const stateDir = "/st";
    const opts = (prompt, nowMs) => ({ sessionId: "S", prompt, nowMs, ttlMs: 60_000, stateDir, fs });

    // t=0: first /loop tick — inject (not throttled)
    assert.equal(shouldThrottleInject(opts("same loop prompt", 0)), false);
    // t=20s: identical prompt re-fires — THROTTLED (the win: no /loop context burn)
    assert.equal(shouldThrottleInject(opts("same loop prompt", 20_000)), true);
    // t=70s: identical prompt, window elapsed — re-inject
    assert.equal(shouldThrottleInject(opts("same loop prompt", 70_000)), false);
    // t=75s: a DIFFERENT prompt — inject
    assert.equal(shouldThrottleInject(opts("different prompt", 75_000)), false);
  });

  it("fails OPEN (no throttle) when sessionId is missing", () => {
    const fs = memFs();
    assert.equal(shouldThrottleInject({ sessionId: "", prompt: "x", nowMs: 0, fs, stateDir: "/st" }), false);
  });

  it("ttlMs 0 disables throttling entirely (knob)", () => {
    const fs = memFs();
    const opts = (nowMs) => ({ sessionId: "S", prompt: "p", nowMs, ttlMs: 0, stateDir: "/st", fs });
    assert.equal(shouldThrottleInject(opts(0)), false);
    assert.equal(shouldThrottleInject(opts(1)), false);   // never throttles
  });

  it("loadPrev/savePrev round-trip via injected fs", () => {
    const fs = memFs();
    const p = "/st/S.json";
    assert.equal(loadPrev(p, fs), null);
    assert.equal(savePrev(p, { hash: "h", ts: 5 }, { ...fs, stateDir: "/st" }), true);
    assert.deepEqual(loadPrev(p, fs), { hash: "h", ts: 5 });
  });

  it("DEFAULT_THROTTLE_MS is 60s", () => {
    assert.equal(DEFAULT_THROTTLE_MS, 60_000);
  });
});

describe("pruneStaleSessions (P1 leak guard — bounds the per-session dir)", () => {
  // dir-aware in-memory fs keyed by BASENAME — separator-tolerant so path.join's
  // platform separator (backslash on win32) still resolves (cf. makeFakeFs norm).
  function dirFs(filesWithMtime) {
    const base = (p) => String(p).replace(/\\/g, "/").split("/").pop();
    const files = new Map(Object.entries(filesWithMtime).map(([k, v]) => [base(k), v]));
    return {
      files,
      existsImpl: (p) => String(p).replace(/\\/g, "/") === "/st" || files.has(base(p)),
      readdirImpl: () => [...files.keys()],
      statImpl: (p) => { const b = base(p); if (!files.has(b)) throw new Error("ENOENT"); return { mtimeMs: files.get(b) }; },
      unlinkImpl: (p) => { files.delete(base(p)); },
    };
  }

  it("removes session files older than pruneMs, keeps fresh ones", () => {
    const now = 1_000_000_000;
    const fs = dirFs({
      "old1.json": now - 90_000_000,    // ~25h > 24h -> remove
      "old2.json": now - 200_000_000,   // ~55h > 24h -> remove
      "fresh.json": now - 1_000,        // recent -> keep
    });
    const removed = pruneStaleSessions("/st", { nowMs: now, pruneMs: DEFAULT_PRUNE_MS, ...fs });
    assert.equal(removed, 2);
    assert.equal(fs.files.has("fresh.json"), true);
    assert.equal(fs.files.has("old1.json"), false);
  });

  it("never touches in-flight .tmp. files and fails soft on a missing dir", () => {
    const now = 1_000_000_000;
    const fs = dirFs({ "/st/x.json.tmp.123": now - 90_000_000 });
    assert.equal(pruneStaleSessions("/st", { nowMs: now, pruneMs: DEFAULT_PRUNE_MS, ...fs }), 0);
    assert.equal(pruneStaleSessions("/missing", { nowMs: now, existsImpl: () => false }), 0);
  });

  it("DEFAULT_PRUNE_MS is 24h", () => {
    assert.equal(DEFAULT_PRUNE_MS, 86_400_000);
  });
});
