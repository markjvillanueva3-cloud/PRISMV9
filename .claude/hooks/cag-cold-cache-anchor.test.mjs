// tier: T2
// .claude/hooks/cag-cold-cache-anchor.test.mjs
//
// TOKEN-SAVINGS-PIVOT/U-CAG-CACHE-CONTROL (sierra 2026-05-27).
// Unit + integration tests for the SessionStart cold-cache anchor hook.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  snapshotColdSources,
  renderAnchorBlock,
  writeAnchorSidecar,
} from "./cag-cold-cache-anchor.mjs";

const NODE = process.execPath;
const HOOK = "H:/prism/.claude/hooks/cag-cold-cache-anchor.mjs";

describe("snapshotColdSources — pure-core", () => {
  it("returns one entry per cold source, with declaredSizeBytes preserved", () => {
    const fake = [
      { id: "a", path: "/exists", coldRationale: "stable", keywords: [], sizeBytes: 100 },
      { id: "b", path: "/missing", coldRationale: "n/a", keywords: [], sizeBytes: 0 },
    ];
    const fakeStat = (p) => (p === "/exists" ? { size: 999, mtimeMs: 1700000000000 } : null);
    const snap = snapshotColdSources(fake, fakeStat);
    assert.equal(snap.length, 2);
    assert.equal(snap[0].id, "a");
    assert.equal(snap[0].declaredSizeBytes, 100);
    assert.equal(snap[0].actualSizeBytes, 999);
    assert.equal(snap[0].present, true);
    assert.equal(snap[0].mtimeMs, 1700000000000);
    assert.equal(snap[1].present, false);
    assert.equal(snap[1].actualSizeBytes, null);
    assert.equal(snap[1].mtimeMs, null);
  });

  it("works with the live COLD_SOURCES (smoke — defaults the source arg)", () => {
    const snap = snapshotColdSources();
    assert.ok(snap.length >= 2, "expected at least claude-md + memory-md cold sources");
    for (const s of snap) {
      assert.equal(typeof s.id, "string");
      assert.equal(typeof s.path, "string");
      assert.ok("declaredSizeBytes" in s);
      assert.ok("present" in s);
    }
  });
});

describe("renderAnchorBlock — pure-core", () => {
  const snap = [
    { id: "a", path: "/a.md", coldRationale: "rare-change", actualSizeBytes: 4096, present: true },
    { id: "b", path: "/b.md", coldRationale: "rare-change", actualSizeBytes: null, present: false },
  ];

  it("includes header + cache_control:ephemeral pattern attribution", () => {
    const block = renderAnchorBlock(snap);
    assert.match(block, /CAG cold-cache anchor/);
    assert.match(block, /SessionStart/);
    assert.match(block, /akshay_pachaar/);
    assert.match(block, /cache_control:ephemeral/);
  });

  it("marks present vs missing with ✓ vs ✗ glyphs", () => {
    const block = renderAnchorBlock(snap);
    assert.match(block, /\[✓\] \*\*a\*\*/);
    assert.match(block, /\[✗\] \*\*b\*\*/);
  });

  it("verbose flag surfaces the coldRationale per source", () => {
    const compact = renderAnchorBlock(snap, { verbose: false });
    const verbose = renderAnchorBlock(snap, { verbose: true });
    assert.ok(!compact.includes("rare-change"));
    assert.ok(verbose.includes("rare-change"));
  });

  it("respects maxBytes cap (last-resort guard)", () => {
    const longSnap = Array.from({ length: 200 }, (_, i) => ({
      id: `entry-${i}`,
      path: `/p${i}.md`,
      coldRationale: "stable" + "X".repeat(100),
      actualSizeBytes: 1000,
      present: true,
    }));
    const block = renderAnchorBlock(longSnap, { verbose: true, maxBytes: 512 });
    assert.ok(block.length <= 512, `got ${block.length}, expected ≤ 512`);
    assert.match(block, /\(cold-anchor truncated\)/);
  });

  it("handles empty cold-source list gracefully", () => {
    const block = renderAnchorBlock([]);
    assert.match(block, /CAG cold-cache anchor/);
    // No entries — just header, intro, footer. Should not crash.
    assert.ok(block.length > 0);
  });
});

describe("writeAnchorSidecar — IO", () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cag-anchor-")); });
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* swallow */ } });

  it("writes a schemaVersion=1 sidecar with the snapshot and recommendation", () => {
    const sid = randomUUID();
    const snap = [{ id: "a", path: "/a", actualSizeBytes: 1, present: true }];
    const p = writeAnchorSidecar({ sid, snap, blockBytes: 100, ts: "2026-05-27T00:00:00.000Z", sidecarDir: dir });
    assert.equal(p, join(dir, `cold-cache-anchor-${sid}.json`));
    const j = JSON.parse(readFileSync(p, "utf8"));
    assert.equal(j.schemaVersion, 1);
    assert.equal(j.sid, sid);
    assert.equal(j.blockBytes, 100);
    assert.equal(j.kind, "cag-cold-cache-anchor");
    assert.equal(j.cacheControlRecommendation, "ephemeral");
    assert.deepEqual(j.coldSources, snap);
  });

  it("returns null on IO failure (best-effort)", () => {
    // Point at an unwriteable location — use a deeply nested path inside a file
    // (Windows: writing into a file-as-directory fails). Empty string also fails.
    const r = writeAnchorSidecar({
      sid: "x",
      snap: [],
      blockBytes: 0,
      ts: "x",
      sidecarDir: "\0invalid\0path", // null byte forces fs error on every platform
    });
    assert.equal(r, null);
  });

  it("creates the sidecar dir if missing", () => {
    const nested = join(dir, "deep", "nested");
    const sid = randomUUID();
    const p = writeAnchorSidecar({ sid, snap: [], blockBytes: 0, ts: "x", sidecarDir: nested });
    assert.ok(p);
    assert.ok(existsSync(p));
  });
});

describe("end-to-end SessionStart hook", () => {
  function run(stdin, env = {}, timeoutMs = 8000) {
    return spawnSync(NODE, [HOOK], {
      input: JSON.stringify(stdin),
      encoding: "utf8",
      env: { ...process.env, ...env },
      timeout: timeoutMs,
    });
  }

  it("emits a SessionStart envelope with cold-cache anchor block", () => {
    const sid = randomUUID();
    const r = run({ session_id: sid });
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.continue, true);
    assert.equal(env.hookSpecificOutput?.hookEventName, "SessionStart");
    assert.match(env.hookSpecificOutput.additionalContext, /CAG cold-cache anchor/);
  });

  it("PRISM_CAG_COLD_ANCHOR_DISABLE=1 → empty envelope, no anchor", () => {
    const r = run({ session_id: randomUUID() }, { PRISM_CAG_COLD_ANCHOR_DISABLE: "1" });
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.continue, true);
    assert.equal(env.hookSpecificOutput, undefined);
  });

  it("missing session_id → empty envelope (no sidecar to key)", () => {
    const r = run({});
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.continue, true);
    assert.equal(env.hookSpecificOutput, undefined);
  });

  it("malformed stdin → empty envelope, no crash", () => {
    const r = spawnSync(NODE, [HOOK], { input: "not json {{{", encoding: "utf8", env: { ...process.env }, timeout: 5000 });
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.continue, true);
  });

  it("PRISM_CAG_COLD_ANCHOR_VERBOSE=1 → surfaces coldRationale (visible in additionalContext)", () => {
    const r = run({ session_id: randomUUID() }, { PRISM_CAG_COLD_ANCHOR_VERBOSE: "1" });
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    // Live COLD_SOURCES rationales include "rarely change" / "Engine inventory" — assert any rationale phrase appears.
    assert.match(env.hookSpecificOutput.additionalContext, /(Engine inventory|rarely change|append-only|Stable)/);
  });
});
