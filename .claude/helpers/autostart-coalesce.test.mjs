/**
 * autostart-coalesce.test.mjs — pure-helper coverage for the autostart
 * coalescing lock that closes OLLAMA-OBSIDIAN-ROUTING-AUDIT/F3.
 *
 * Tests decideAttempt + recordAttempt (pure). The shouldAttemptAutostart
 * top-level wrapper is integration-tested separately by invoking the helper
 * via CLI; this file is pure-unit only.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { decideAttempt, recordAttempt } from "./autostart-coalesce.mjs";

const NOW = 1_700_000_000_000; // deterministic baseline

describe("decideAttempt", () => {
  it("happy: empty stamps → attempt", () => {
    const d = decideAttempt({ stamps: {}, scope: "ollama", host: "MARKV", now: NOW, windowMs: 30000 });
    assert.strictEqual(d.attempt, true);
    assert.match(d.reason, /no-prior-stamp/);
  });

  it("happy: stamp older than window → attempt", () => {
    const stamps = { "ollama@MARKV": { ts: NOW - 60000, hook: "h1" } };
    const d = decideAttempt({ stamps, scope: "ollama", host: "MARKV", now: NOW, windowMs: 30000 });
    assert.strictEqual(d.attempt, true);
    assert.match(d.reason, /stamp-stale/);
  });

  it("failure: stamp within window → skip with peer info", () => {
    const stamps = { "ollama@MARKV": { ts: NOW - 5000, hook: "peer-hook" } };
    const d = decideAttempt({ stamps, scope: "ollama", host: "MARKV", now: NOW, windowMs: 30000 });
    assert.strictEqual(d.attempt, false);
    assert.match(d.reason, /peer-attempted-5000ms-ago/);
    assert.strictEqual(d.peerHook, "peer-hook");
    assert.strictEqual(d.peerAgeMs, 5000);
  });

  it("failure: per-scope isolation — different scope key still triggers attempt", () => {
    const stamps = { "ollama@MARKV": { ts: NOW - 1000, hook: "x" } };
    const d = decideAttempt({ stamps, scope: "nim", host: "MARKV", now: NOW, windowMs: 30000 });
    assert.strictEqual(d.attempt, true, "different scope must NOT be blocked by ollama stamp");
  });

  it("failure: per-host isolation — different host triggers attempt", () => {
    const stamps = { "ollama@MARKV": { ts: NOW - 1000, hook: "x" } };
    const d = decideAttempt({ stamps, scope: "ollama", host: "HOME-PC", now: NOW, windowMs: 30000 });
    assert.strictEqual(d.attempt, true, "different host must have its own lock");
  });

  it("failure: malformed stamp (non-numeric ts) → attempt (defensive)", () => {
    const stamps = { "ollama@MARKV": { ts: "garbage", hook: "x" } };
    const d = decideAttempt({ stamps, scope: "ollama", host: "MARKV", now: NOW, windowMs: 30000 });
    assert.strictEqual(d.attempt, true);
  });

  it("failure: missing stamp record → attempt", () => {
    const stamps = { "other@MARKV": { ts: NOW, hook: "x" } };
    const d = decideAttempt({ stamps, scope: "ollama", host: "MARKV", now: NOW, windowMs: 30000 });
    assert.strictEqual(d.attempt, true);
  });

  it("failure: clock skew (future stamp) → attempt (treat stale)", () => {
    const stamps = { "ollama@MARKV": { ts: NOW + 10000, hook: "x" } };
    const d = decideAttempt({ stamps, scope: "ollama", host: "MARKV", now: NOW, windowMs: 30000 });
    assert.strictEqual(d.attempt, true, "negative age (future stamp) must not block");
  });

  it("adversarial: zero window → always-attempt (immediate timeout)", () => {
    const stamps = { "ollama@MARKV": { ts: NOW, hook: "x" } };
    const d = decideAttempt({ stamps, scope: "ollama", host: "MARKV", now: NOW + 1, windowMs: 0 });
    assert.strictEqual(d.attempt, true);
  });

  it("adversarial: null stamps map → attempt (no crash)", () => {
    const d = decideAttempt({ stamps: null, scope: "ollama", host: "MARKV", now: NOW, windowMs: 30000 });
    assert.strictEqual(d.attempt, true);
  });

  it("adversarial: undefined windowMs falls back to default", () => {
    const stamps = { "ollama@MARKV": { ts: NOW - 1000, hook: "x" } };
    const d = decideAttempt({ stamps, scope: "ollama", host: "MARKV", now: NOW });
    // Default 30000ms; 1000ms ago is within window → block
    assert.strictEqual(d.attempt, false);
  });

  it("adversarial: invalid windowMs (NaN) falls back to default", () => {
    const stamps = { "ollama@MARKV": { ts: NOW - 1000, hook: "x" } };
    const d = decideAttempt({ stamps, scope: "ollama", host: "MARKV", now: NOW, windowMs: NaN });
    assert.strictEqual(d.attempt, false, "NaN windowMs must fall back, not crash");
  });

  it("variability: 3 different scopes share host but isolate locks", () => {
    // Per CLAUDE.md ≥3 spanning configurations.
    const stamps = {
      "ollama@H": { ts: NOW - 1000, hook: "a" },
      "nim@H": { ts: NOW - 1000, hook: "b" },
      "docker@H": { ts: NOW - 1000, hook: "c" },
    };
    for (const scope of ["ollama", "nim", "docker"]) {
      const d = decideAttempt({ stamps, scope, host: "H", now: NOW, windowMs: 30000 });
      assert.strictEqual(d.attempt, false, `${scope} must be blocked by its own stamp`);
    }
    // A 4th scope is NOT blocked
    const d4 = decideAttempt({ stamps, scope: "qdrant", host: "H", now: NOW, windowMs: 30000 });
    assert.strictEqual(d4.attempt, true);
  });
});

describe("recordAttempt", () => {
  it("happy: writes a new stamp under scope@host key", () => {
    const out = recordAttempt({ stamps: {}, scope: "ollama", host: "MARKV", hookName: "h1", now: NOW });
    assert.deepStrictEqual(out, { "ollama@MARKV": { ts: NOW, hook: "h1" } });
  });

  it("happy: preserves existing stamps for other scopes", () => {
    const stamps = { "other@MARKV": { ts: NOW - 5000, hook: "h0" } };
    const out = recordAttempt({ stamps, scope: "ollama", host: "MARKV", hookName: "h1", now: NOW });
    assert.deepStrictEqual(out["other@MARKV"], { ts: NOW - 5000, hook: "h0" });
    assert.deepStrictEqual(out["ollama@MARKV"], { ts: NOW, hook: "h1" });
  });

  it("happy: overwrites stale stamp for same scope@host", () => {
    const stamps = { "ollama@MARKV": { ts: NOW - 60000, hook: "old" } };
    const out = recordAttempt({ stamps, scope: "ollama", host: "MARKV", hookName: "new", now: NOW });
    assert.strictEqual(out["ollama@MARKV"].ts, NOW);
    assert.strictEqual(out["ollama@MARKV"].hook, "new");
  });

  it("failure: null hookName stored as null (not undefined)", () => {
    const out = recordAttempt({ stamps: {}, scope: "ollama", host: "MARKV", hookName: null, now: NOW });
    assert.strictEqual(out["ollama@MARKV"].hook, null);
  });

  it("failure: undefined initial stamps → fresh map", () => {
    const out = recordAttempt({ stamps: undefined, scope: "ollama", host: "MARKV", hookName: "h", now: NOW });
    assert.strictEqual(Object.keys(out).length, 1);
  });

  it("adversarial: input stamps object NOT mutated (purity)", () => {
    const stamps = { "ollama@MARKV": { ts: NOW - 10000, hook: "orig" } };
    const before = JSON.stringify(stamps);
    recordAttempt({ stamps, scope: "ollama", host: "MARKV", hookName: "new", now: NOW });
    assert.strictEqual(JSON.stringify(stamps), before, "input stamps must not be mutated");
  });

  it("variability: 3 different hooks recorded under same scope all overwrite", () => {
    let s = {};
    s = recordAttempt({ stamps: s, scope: "ollama", host: "H", hookName: "hookA", now: NOW });
    s = recordAttempt({ stamps: s, scope: "ollama", host: "H", hookName: "hookB", now: NOW + 100 });
    s = recordAttempt({ stamps: s, scope: "ollama", host: "H", hookName: "hookC", now: NOW + 200 });
    assert.strictEqual(s["ollama@H"].hook, "hookC");
    assert.strictEqual(s["ollama@H"].ts, NOW + 200);
  });
});
