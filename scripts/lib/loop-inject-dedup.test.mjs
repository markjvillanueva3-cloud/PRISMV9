#!/usr/bin/env node
/**
 * Tests for loop-inject-dedup.mjs — session-scoped injection dedup.
 * Run: node --test scripts/lib/loop-inject-dedup.test.mjs
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  normalize,
  digest,
  decideDedup,
  pointerFor,
  cachePath,
  recordAndCheck,
  suppressWindowMs,
} from "./loop-inject-dedup.mjs";
import { normalize as auditNormalize } from "../loop-inject-cost-audit.mjs";

describe("normalize", () => {
  it("strips ISO timestamps, dates, ages, iteration counters", () => {
    assert.equal(normalize("done 2026-05-18T02:01:08Z"), "done <TS>");
    assert.equal(normalize("synced 2026-05-18"), "synced <DATE>");
    assert.equal(normalize("5m old"), "<AGE>");
    assert.equal(normalize("iter 7"), "iter<N>");
  });
  it("returns empty string for null / undefined", () => {
    assert.equal(normalize(null), "");
    assert.equal(normalize(undefined), "");
  });
  it("is idempotent", () => {
    const x = "panel at 2026-05-18T02:01:08Z iter 4 — 5m old hash a1b2c3d4";
    assert.equal(normalize(normalize(x)), normalize(x));
  });
});

describe("digest", () => {
  it("is stable for identical content", () => {
    assert.equal(digest("hello world"), digest("hello world"));
  });
  it("is equal for content differing only by volatile tokens", () => {
    const a = "/goal pre-flight fresh 2026-05-18T01:00:00Z (2m old)";
    const b = "/goal pre-flight fresh 2026-05-18T09:00:00Z (8m old)";
    assert.equal(digest(a), digest(b));
  });
  it("differs for substantively-different content", () => {
    assert.notEqual(digest("panel A: 3 pending"), digest("panel A: 9 pending"));
  });
  it("returns empty string for empty / whitespace / null content", () => {
    assert.equal(digest(""), "");
    assert.equal(digest("   \n\t "), "");
    assert.equal(digest(null), "");
  });
  it("produces a 40-char sha1 hex for non-empty content", () => {
    assert.match(digest("real content"), /^[0-9a-f]{40}$/);
  });
});

describe("decideDedup", () => {
  const NOW = 1_000_000;
  const WINDOW = 10 * 60 * 1000; // matches DEFAULT_SUPPRESS_WINDOW_MS
  it("does not suppress when current digest is empty", () => {
    assert.deepEqual(decideDedup({ digest: "x", ts: NOW }, "", NOW, WINDOW),
      { suppress: false, reason: "empty-content" });
  });
  it("does not suppress when there is no prior record", () => {
    assert.deepEqual(decideDedup(undefined, "abc", NOW, WINDOW),
      { suppress: false, reason: "no-prior" });
  });
  it("does not suppress when content changed", () => {
    assert.deepEqual(decideDedup({ digest: "old", ts: NOW }, "new", NOW, WINDOW),
      { suppress: false, reason: "changed" });
  });
  it("suppresses when digest matches and prior is within the window", () => {
    assert.deepEqual(decideDedup({ digest: "abc", ts: NOW - 5000 }, "abc", NOW, WINDOW),
      { suppress: true, reason: "unchanged" });
  });
  it("does NOT suppress when the prior is older than the window (may be compacted away)", () => {
    assert.deepEqual(decideDedup({ digest: "abc", ts: NOW - WINDOW - 1 }, "abc", NOW, WINDOW),
      { suppress: false, reason: "stale-prior" });
  });
});

describe("pointerFor", () => {
  it("names the hook and signals a token-save", () => {
    const p = pointerFor("goal-prereq-inject");
    assert.match(p, /goal-prereq-inject/);
    assert.match(p, /token-save/);
  });
});

describe("cachePath", () => {
  it("sanitizes unsafe characters in the session id", () => {
    const p = cachePath("/tmp/cache", "claude-d9/9d..\\x");
    assert.equal(path.basename(p), "claude-d9_9d.._x.json");
  });
  it("caps an over-long session key", () => {
    const p = cachePath("/tmp/cache", "z".repeat(500));
    assert.ok(path.basename(p).length <= 120 + ".json".length);
  });
});

describe("recordAndCheck", () => {
  let dir;
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-dedup-")); });
  after(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } });

  const call = (over) => recordAndCheck({
    sessionId: "sess-1", hookName: "goal-prereq-inject",
    content: "panel content", cacheDir: dir, now: 1_000_000, ...over,
  });

  it("does not suppress a first-seen injection and writes the cache", () => {
    const r = call({ sessionId: "first-seen-s" });
    assert.equal(r.suppress, false);
    assert.equal(r.reason, "no-prior");
    assert.ok(fs.existsSync(cachePath(dir, "first-seen-s")));
  });
  it("suppresses an identical second injection in the same session", () => {
    const sid = "repeat-s";
    assert.equal(call({ sessionId: sid }).suppress, false);
    const r2 = call({ sessionId: sid });
    assert.equal(r2.suppress, true);
    assert.equal(r2.reason, "unchanged");
    assert.match(r2.pointer, /goal-prereq-inject/);
  });
  it("suppresses content that differs ONLY by volatile tokens", () => {
    const sid = "volatile-s";
    call({ sessionId: sid, content: "fresh 2026-05-18T01:00:00Z 2m old" });
    const r2 = call({ sessionId: sid, content: "fresh 2026-05-18T09:00:00Z 8m old" });
    assert.equal(r2.suppress, true);
  });
  it("does not suppress when content substantively changed, and re-records", () => {
    const sid = "changed-s";
    call({ sessionId: sid, content: "3 pending" });
    const r2 = call({ sessionId: sid, content: "9 pending" });
    assert.equal(r2.suppress, false);
    assert.equal(r2.reason, "changed");
    const r3 = call({ sessionId: sid, content: "9 pending" });
    assert.equal(r3.suppress, true); // re-recorded, now matches
  });
  it("does not suppress when the prior record is stale (older than the window)", () => {
    const sid = "stale-s";
    const win = 10 * 60 * 1000;
    call({ sessionId: sid, now: 1_000_000, maxAgeMs: win });
    const r2 = call({ sessionId: sid, now: 1_000_000 + win + 1, maxAgeMs: win });
    assert.equal(r2.suppress, false);
    assert.equal(r2.reason, "stale-prior");
  });
  it("honors an explicit maxAgeMs arg — suppresses inside it, re-emits outside it", () => {
    const sid = "explicit-window-s";
    call({ sessionId: sid, now: 1_000_000, maxAgeMs: 5000 });
    assert.equal(call({ sessionId: sid, now: 1_000_000 + 4000, maxAgeMs: 5000 }).suppress, true);
    assert.equal(call({ sessionId: sid, now: 1_000_000 + 9000, maxAgeMs: 5000 }).reason, "stale-prior");
  });
  it("keeps two hooks in the same session independent", () => {
    const sid = "two-hooks-s";
    call({ sessionId: sid, hookName: "hook-a" });
    const rB = call({ sessionId: sid, hookName: "hook-b" });
    assert.equal(rB.suppress, false); // hook-b first-seen even though hook-a recorded
    assert.equal(call({ sessionId: sid, hookName: "hook-a" }).suppress, true);
  });
  it("does not suppress when sessionId or hookName is missing (fail-open)", () => {
    assert.equal(recordAndCheck({ hookName: "h", content: "x", cacheDir: dir }).reason, "missing-key");
    assert.equal(recordAndCheck({ sessionId: "s", content: "x", cacheDir: dir }).reason, "missing-key");
    assert.equal(recordAndCheck({ hookName: "h", content: "x", cacheDir: dir }).suppress, false);
  });
  it("does not suppress empty content", () => {
    const r = call({ sessionId: "empty-s", content: "   " });
    assert.equal(r.suppress, false);
    assert.equal(r.reason, "empty-content");
  });
  it("fails open (no suppression) when the cache file is corrupt", () => {
    const sid = "corrupt-s";
    fs.writeFileSync(cachePath(dir, sid), "{not valid json", "utf8");
    const r = call({ sessionId: sid });
    assert.equal(r.suppress, false); // corrupt cache treated as no-prior
    assert.equal(r.reason, "no-prior");
  });
  it("returns a defined result shape on every call", () => {
    const r = call({ sessionId: "shape-s" });
    assert.equal(typeof r.suppress, "boolean");
    assert.equal(typeof r.pointer, "string");
    assert.equal(typeof r.reason, "string");
    assert.equal(typeof r.digest, "string");
  });
});

describe("suppressWindowMs", () => {
  it("defaults to 10 minutes when the env knob is unset", () => {
    const saved = process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS;
    delete process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS;
    try { assert.equal(suppressWindowMs(), 10 * 60 * 1000); }
    finally { if (saved !== undefined) process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS = saved; }
  });
  it("honors the PRISM_LOOP_INJECT_DEDUP_WINDOW_MS env override", () => {
    const saved = process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS;
    process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS = "300000";
    try { assert.equal(suppressWindowMs(), 300000); }
    finally {
      if (saved === undefined) delete process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS;
      else process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS = saved;
    }
  });
  it("falls back to the default for a non-numeric or non-positive override", () => {
    const saved = process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS;
    for (const bad of ["abc", "0", "-5"]) {
      process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS = bad;
      assert.equal(suppressWindowMs(), 10 * 60 * 1000);
    }
    if (saved === undefined) delete process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS;
    else process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS = saved;
  });
});

describe("normalize drift-guard (KEEP-IN-SYNC with loop-inject-cost-audit.mjs)", () => {
  // The dedup decision and the audit's saving measurement must agree on what
  // "volatile" means — a drift between the two normalize() copies would make
  // the audit's projected saving stop matching real dedup behavior.
  const corpus = [
    "done at 2026-05-18T02:01:08.509Z ok",
    "synced 2026-05-18 — 5m old, iter 7, hash d99dc7c4",
    "panel: 3 pending · 417.6h · 12:30 · queue 6 d deep · count 12345678",
    "/goal pre-flight ✓ CLOSE-OUT-CANDIDATES fresh (2.0h, 0 pending triage)",
    "",
  ];
  for (const s of corpus) {
    it(`agrees with the audit normalize() on: ${JSON.stringify(s).slice(0, 48)}`, () => {
      assert.equal(normalize(s), auditNormalize(s));
    });
  }
});
