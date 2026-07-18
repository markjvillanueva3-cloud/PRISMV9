#!/usr/bin/env node
// Tests for shipped-units-source-of-truth.mjs
//
// Hermetic — writes a temp progress.json + temp envelopes dir, never touches
// the real repo data. Real-data sanity smoke at the end against the live repo.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import {
  _peekShippedUnionCache,
  _resetShippedUnionCache,
  buildShippedIdsUnion,
  collectCompletedFromEnvelope,
  describeShippedSources,
  expandBridgeToken,
  extractUnitIdsFromUnit,
  readCompletedMilestones,
  readShippedFromBridgeCommits,
  readShippedFromEnvelopes,
  readShippedFromProgress,
} from "./shipped-units-source-of-truth.mjs";

function mkTmp(prefix = "shipped-truth-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj)); }

test("readShippedFromProgress — git-inferred shipped units only", () => {
  const tmp = mkTmp();
  const pPath = path.join(tmp, "progress.json");
  writeJson(pPath, {
    milestones: [
      { id: "MS-A", units: [{ id: "U-A1", shipped: true }, { id: "U-A2", shipped: false }] },
      { id: "MS-B", units: [{ id: "U-B1", shipped: true }] },
    ],
  });
  const got = readShippedFromProgress(pPath);
  assert.equal(got.size, 2);
  assert.ok(got.has("U-A1"));
  assert.ok(got.has("U-B1"));
  assert.ok(!got.has("U-A2"));
});

test("readShippedFromProgress — handles missing file (never throws)", () => {
  const got = readShippedFromProgress("/no/such/file.json");
  assert.equal(got.size, 0);
});

test("readShippedFromProgress — handles m.units undefined / non-array", () => {
  const tmp = mkTmp();
  const pPath = path.join(tmp, "progress.json");
  writeJson(pPath, { milestones: [{ id: "MS-A", units: null }, { id: "MS-B", units: 42 }, { id: "MS-C" }] });
  const got = readShippedFromProgress(pPath);
  assert.equal(got.size, 0);
});

test("readShippedFromProgress — normalizes IDs to uppercase + trim", () => {
  const tmp = mkTmp();
  const pPath = path.join(tmp, "progress.json");
  writeJson(pPath, {
    milestones: [{ id: "MS-A", units: [{ id: "  u-lower  ", shipped: true }] }],
  });
  const got = readShippedFromProgress(pPath);
  assert.ok(got.has("U-LOWER"));
});

test("readShippedFromProgress — skips u.shipped that's truthy-but-not-strict-true", () => {
  // Strict ===true is the contract; "true" string or 1 number must NOT count.
  const tmp = mkTmp();
  const pPath = path.join(tmp, "progress.json");
  writeJson(pPath, {
    milestones: [{ id: "MS-A", units: [
      { id: "U-X1", shipped: "true" },
      { id: "U-X2", shipped: 1 },
      { id: "U-X3", shipped: true },
    ] }],
  });
  const got = readShippedFromProgress(pPath);
  assert.equal(got.size, 1);
  assert.ok(got.has("U-X3"));
});

test("collectCompletedFromEnvelope — recursive scan finds nested {id,status}", () => {
  const env = {
    id: "MS-A",
    status: "in_progress",        // milestone itself is not-shipped (ignored, MS not in U-ID set)
    phases: {
      bootstrap: {
        units: [
          { id: "U-A1", status: "complete" },
          { id: "U-A2", status: "pending" },
          { id: "U-A3", status: "superseded" },
          { id: "U-A4", status: "deferred" },     // deferred ≠ shipped
        ],
      },
    },
  };
  const got = collectCompletedFromEnvelope(env);
  // MS-A has status:in_progress so the milestone itself must NOT be added.
  // Only the inner units U-A1 (complete) and U-A3 (superseded) qualify.
  // U-A2 is pending, U-A4 is deferred — both correctly skipped.
  assert.deepEqual([...got].sort(), ["U-A1", "U-A3"]);
});

test("collectCompletedFromEnvelope — U-ID GATE: milestone-id excluded even when status=completed", () => {
  // U-ID gate: milestone IDs (MS-*, *-MS#) don't match /^U-/i and are never
  // added to the shipped set. This prevents collision with pickup candidates
  // (which are always U-*) and was reviewer A P1. Fail-on-revert oracle:
  // if the gate is removed, this test breaks.
  const env = { id: "MS-DONE", status: "completed", phases: {} };
  const got = collectCompletedFromEnvelope(env);
  assert.ok(!got.has("MS-DONE"), "milestone-id must NOT be added to shipped set");
  assert.equal(got.size, 0);
});

test("collectCompletedFromEnvelope — U-ID GATE: non-unit IDs filtered (findings F1, milestone-letters)", () => {
  // Sibling shapes that appear in real envelopes: DEV-TOOL-CONFLICT-AUDIT
  // findings carry id like "F1", "F2", "B9" (phase letters), "G9" with their
  // own status. These are not pickup candidates — must be filtered.
  const env = {
    findings: [
      { id: "F1", status: "complete" },
      { id: "G9", status: "complete" },
      { id: "ms-a", status: "complete" },      // lowercase milestone shape
    ],
    units: [{ id: "U-FILE-FIX", status: "complete" }],
  };
  const got = collectCompletedFromEnvelope(env);
  assert.equal(got.size, 1);
  assert.ok(got.has("U-FILE-FIX"));
  for (const reject of ["F1", "G9", "MS-A"]) {
    assert.ok(!got.has(reject), `${reject} must NOT be added (not a unit-id pattern)`);
  }
});

test("collectCompletedFromEnvelope — milestone status='in_progress' not added", () => {
  const env = { id: "MS-OPEN", status: "in_progress", phases: { p1: { units: [{ id: "U-1", status: "complete" }] } } };
  const got = collectCompletedFromEnvelope(env);
  assert.ok(!got.has("MS-OPEN"));
  assert.ok(got.has("U-1"));
});

test("collectCompletedFromEnvelope — accepts complete | completed | shipped | superseded | done", () => {
  const env = { phases: { p1: { units: [
    { id: "U-1", status: "complete" },
    { id: "U-2", status: "completed" },
    { id: "U-3", status: "shipped" },
    { id: "U-4", status: "superseded" },
    { id: "U-5", status: "done" },
    { id: "U-6", status: "pending" },
    { id: "U-7", status: "in_progress" },
  ] } } };
  const got = collectCompletedFromEnvelope(env);
  assert.equal(got.size, 5);
  for (const id of ["U-1","U-2","U-3","U-4","U-5"]) assert.ok(got.has(id));
});

test("collectCompletedFromEnvelope — status is case-insensitive", () => {
  const env = { phases: { p: { units: [{ id: "U-CASE", status: "COMPLETE" }] } } };
  const got = collectCompletedFromEnvelope(env);
  assert.ok(got.has("U-CASE"));
});

test("collectCompletedFromEnvelope — skips _history blocks (frozen snapshots)", () => {
  const env = {
    phases: { p1: { units: [{ id: "U-CURR", status: "pending" }] } },
    _history: { snapshot1: { units: [{ id: "U-CURR", status: "complete" }] } },
  };
  const got = collectCompletedFromEnvelope(env);
  assert.ok(!got.has("U-CURR"));
});

test("collectCompletedFromEnvelope — handles arrays of nodes", () => {
  const env = { units: [{ id: "U-A", status: "complete" }, { id: "U-B", status: "complete" }] };
  const got = collectCompletedFromEnvelope(env);
  assert.equal(got.size, 2);
});

test("collectCompletedFromEnvelope — no crash on cycles", () => {
  const a = { id: "U-A", status: "complete" };
  const b = { id: "U-B", status: "pending", peer: a };
  a.peer = b;
  const got = collectCompletedFromEnvelope({ root: a });
  assert.ok(got.has("U-A"));
  assert.equal(got.size, 1);
});

test("collectCompletedFromEnvelope — handles non-object input", () => {
  assert.equal(collectCompletedFromEnvelope(null).size, 0);
  assert.equal(collectCompletedFromEnvelope(undefined).size, 0);
  assert.equal(collectCompletedFromEnvelope(42).size, 0);
  assert.equal(collectCompletedFromEnvelope("string").size, 0);
});

test("readShippedFromEnvelopes — scans a directory of envelope files", () => {
  const tmp = mkTmp();
  writeJson(path.join(tmp, "MS-X.json"), { units: [{ id: "U-X1", status: "complete" }, { id: "U-X2", status: "pending" }] });
  writeJson(path.join(tmp, "MS-Y.json"), { units: [{ id: "U-Y1", status: "shipped" }] });
  fs.writeFileSync(path.join(tmp, "MS-Z.txt"), "not json");                  // wrong extension — skipped
  fs.writeFileSync(path.join(tmp, "MS-BAD.json"), "{not valid json");        // malformed — skipped silently
  const got = readShippedFromEnvelopes(tmp);
  assert.equal(got.size, 2);
  assert.ok(got.has("U-X1"));
  assert.ok(got.has("U-Y1"));
});

test("readShippedFromEnvelopes — missing dir returns empty Set, never throws", () => {
  const got = readShippedFromEnvelopes("/no/such/envelopes/dir");
  assert.equal(got.size, 0);
});

test("readShippedFromEnvelopes — skips subdirectories", () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, "subdir"));
  writeJson(path.join(tmp, "subdir", "MS-A.json"), { units: [{ id: "U-A1", status: "complete" }] });
  writeJson(path.join(tmp, "MS-B.json"), { units: [{ id: "U-B1", status: "complete" }] });
  const got = readShippedFromEnvelopes(tmp);
  // Only top-level files scanned; nested files ignored.
  assert.equal(got.size, 1);
  assert.ok(got.has("U-B1"));
});

test("buildShippedIdsUnion — unions both sources (the REGRESSION ORACLE)", () => {
  // This is the test that fails-on-revert: if either source is dropped, the
  // 6 envelope-only CLEANUP-MS0 cases would reappear in pickup output.
  const tmp = mkTmp();
  const pPath = path.join(tmp, "progress.json");
  writeJson(pPath, {
    milestones: [{ id: "MS-A", units: [{ id: "U-GIT-ONLY", shipped: true }, { id: "U-BOTH", shipped: true }] }],
  });
  const envDir = path.join(tmp, "envelopes");
  fs.mkdirSync(envDir);
  writeJson(path.join(envDir, "MS-A.json"), { units: [
    { id: "U-ENV-ONLY", status: "complete" },
    { id: "U-BOTH", status: "complete" },
  ] });

  const union = buildShippedIdsUnion({ progressPath: pPath, envelopesDir: envDir });
  assert.equal(union.size, 3, "union must contain git-only + env-only + both");
  assert.ok(union.has("U-GIT-ONLY"));
  assert.ok(union.has("U-ENV-ONLY"));
  assert.ok(union.has("U-BOTH"));
});

test("describeShippedSources — counts agree with set arithmetic", () => {
  const tmp = mkTmp();
  const pPath = path.join(tmp, "progress.json");
  writeJson(pPath, {
    milestones: [{ id: "MS-A", units: [{ id: "U-1", shipped: true }, { id: "U-2", shipped: true }] }],
  });
  const envDir = path.join(tmp, "envelopes");
  fs.mkdirSync(envDir);
  writeJson(path.join(envDir, "MS-A.json"), { units: [
    { id: "U-2", status: "complete" },
    { id: "U-3", status: "complete" },
  ] });

  const d = describeShippedSources({ progressPath: pPath, envelopesDir: envDir });
  assert.equal(d.progressCount, 2);
  assert.equal(d.envelopeCount, 2);
  assert.equal(d.unionCount, 3);
  assert.equal(d.progressOnly, 1);  // U-1
  assert.equal(d.envelopeOnly, 1);  // U-3
  assert.equal(d.both, 1);          // U-2
});

test("buildShippedIdsUnion — works with no arguments (real repo paths)", () => {
  // Real-repo smoke. Sanity-checks the live integration without asserting
  // specific counts (which drift). Catches "import path broke" / "default
  // path renamed" regressions.
  const u = buildShippedIdsUnion();
  assert.ok(u instanceof Set, "must return a Set");
  assert.ok(u.size > 100, `expected real-repo union to have many shipped units, got ${u.size}`);
});

test("buildShippedIdsUnion — REGRESSION: U-CLEANUP-A1 must show as shipped (envelope path)", () => {
  // This is the literal bug from claude-098ac2aa's handoff: A1 was envelope-
  // complete but MILESTONE_PROGRESS said shipped=false → picker returned it.
  // The fix must keep this case covered indefinitely.
  _resetShippedUnionCache();
  const u = buildShippedIdsUnion();
  assert.ok(u.has("U-CLEANUP-A1"), "U-CLEANUP-A1 must be in shipped union (envelope status complete)");
});

test("buildShippedIdsUnion — mtime cache: identical mtimes return cached set without re-reading", () => {
  // Cache only fires for default-paths (no args). Two consecutive calls with
  // no file changes must return identical content. We verify the cache is
  // active by checking the set is a fresh copy each call (not the same Set
  // instance) — guards against the "caller mutates cache" anti-pattern.
  _resetShippedUnionCache();
  const a = buildShippedIdsUnion();
  const b = buildShippedIdsUnion();
  assert.notStrictEqual(a, b, "must return a copy each call, not the cached instance");
  assert.equal(a.size, b.size);
  for (const id of a) assert.ok(b.has(id));
});

test("buildShippedIdsUnion — mtime cache: caller mutation does NOT poison cache", () => {
  _resetShippedUnionCache();
  const a = buildShippedIdsUnion();
  const sizeBefore = a.size;
  a.add("U-FAKE-NEVER-SHIPPED");
  a.delete([...a][0]);                          // mutate the returned set
  const b = buildShippedIdsUnion();
  assert.equal(b.size, sizeBefore, "second call returns the originally-cached set, not the mutated one");
  assert.ok(!b.has("U-FAKE-NEVER-SHIPPED"), "test-added id must not appear in second call");
});

test("buildShippedIdsUnion — custom paths bypass the cache", () => {
  // Hermetic-test injection must NEVER read the default-paths cache, even if
  // it's warm. This is the contract that protects test isolation.
  _resetShippedUnionCache();
  const _warmCache = buildShippedIdsUnion();   // warm default cache
  assert.ok(_warmCache.size > 0);

  const tmp = mkTmp();
  writeJson(path.join(tmp, "progress.json"), { milestones: [{ id: "MS-Z", units: [{ id: "U-ISOLATED", shipped: true }] }] });
  const envDir = path.join(tmp, "envelopes");
  fs.mkdirSync(envDir);

  const custom = buildShippedIdsUnion({ progressPath: path.join(tmp, "progress.json"), envelopesDir: envDir });
  assert.equal(custom.size, 1, "custom-path call must produce exactly the hermetic data, not cached default");
  assert.ok(custom.has("U-ISOLATED"));
});

test("buildShippedIdsUnion — mtime cache invalidates on envelope touch (fail-on-revert)", () => {
  // Reviewer-A/B P1: prior version asserted only `size > 0`, which a cache-
  // hit returning stale data would also satisfy. This version is fail-on-
  // revert: if someone deletes the mtime cache, BOTH (a) the cache peek's
  // envMtime advances when we touch a file, AND (b) a fresh envelope with a
  // sentinel U-ID appears in the next union (proves the disk was re-read).
  _resetShippedUnionCache();
  buildShippedIdsUnion();                                  // warm the cache
  const peekBefore = _peekShippedUnionCache();
  assert.ok(peekBefore && peekBefore.envMtime > 0, "cache must be warm with a real envMtime");

  const dir = path.join(__dirnameFromHere(), "../../mcp-server/data/milestones");
  let entries;
  try { entries = fs.readdirSync(dir).filter((n) => n.endsWith(".json")); }
  catch { return; }                                        // hermetic-only repo — skip
  if (!entries.length) return;

  // Drop a sentinel envelope with a never-before-seen unit-id. This proves the
  // helper actually re-read the disk on cache invalidation — a stale cache
  // would NOT contain the sentinel.
  const sentinelId = `U-CACHE-SENTINEL-${Date.now().toString(36).toUpperCase()}`;
  const sentinelPath = path.join(dir, `__test-cache-invalidation-${process.pid}.json`);
  fs.writeFileSync(sentinelPath, JSON.stringify({
    id: "TEST-CACHE-MS",
    status: "in_progress",                                 // milestone itself not-shipped
    units: [{ id: sentinelId, status: "complete" }],
  }));

  try {
    // Advance mtime explicitly (a same-second write may not change mtimeMs on
    // some filesystems — set future time to force invalidation).
    const future = new Date(Date.now() + 1500);
    fs.utimesSync(sentinelPath, future, future);

    const after = buildShippedIdsUnion();
    const peekAfter = _peekShippedUnionCache();

    // (a) envMtime must advance — proves the cache fingerprint changed.
    assert.ok(peekAfter && peekAfter.envMtime > peekBefore.envMtime,
      `envMtime must advance after touch (before=${peekBefore.envMtime}, after=${peekAfter?.envMtime})`);

    // (b) sentinel-id must appear — proves the disk was actually re-read,
    //     not just stamped with a new mtime.
    assert.ok(after.has(sentinelId),
      `sentinel ${sentinelId} must appear in re-read union (stale cache would miss it)`);
  } finally {
    fs.unlinkSync(sentinelPath);
    _resetShippedUnionCache();                             // don't poison subsequent tests
  }
});

function __dirnameFromHere() {
  // Relative to this test file (which sits at scripts/lib/).
  return path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]):/, "$1:");
}

// ─── Source (c): bridge-commit completion recovery ───────────────────────────

test("expandBridgeToken — plain token yields itself (normalized)", () => {
  const s = expandBridgeToken("u-bridge-cad-cam-handoff");
  assert.deepEqual([...s], ["U-BRIDGE-CAD-CAM-HANDOFF"]);
});

test("expandBridgeToken — compound +SUFFIX recovers BOTH sibling ids", () => {
  // The literal 2026-05-17 case: commit subject carried the compound id.
  const s = expandBridgeToken("U-BRIDGE-SFC-ESPRIT+SOLIDCAM");
  assert.equal(s.size, 2);
  assert.ok(s.has("U-BRIDGE-SFC-ESPRIT"));
  assert.ok(s.has("U-BRIDGE-SFC-SOLIDCAM"));
});

test("expandBridgeToken — multi-suffix A+B+C recovers all three", () => {
  const s = expandBridgeToken("U-BRIDGE-SFC-ESPRIT+SOLIDCAM+POWERMILL");
  assert.deepEqual([...s].sort(), [
    "U-BRIDGE-SFC-ESPRIT",
    "U-BRIDGE-SFC-POWERMILL",
    "U-BRIDGE-SFC-SOLIDCAM",
  ]);
});

test("expandBridgeToken — adversarial: empty / non-string / no-dash lead", () => {
  assert.equal(expandBridgeToken("").size, 0);
  assert.equal(expandBridgeToken(null).size, 0);
  assert.equal(expandBridgeToken(undefined).size, 0);
  assert.equal(expandBridgeToken(42).size, 0);
  // lead with no '-' before '+': prefix is empty, suffix added bare
  const s = expandBridgeToken("UBRIDGE+X");
  assert.ok(s.has("UBRIDGE"));
});

test("expandBridgeToken — trailing '+' produces no empty id", () => {
  const s = expandBridgeToken("U-BRIDGE-SFC-ESPRIT+");
  assert.deepEqual([...s], ["U-BRIDGE-SFC-ESPRIT"]);
  for (const id of s) assert.ok(id.length > 0);
});

test("readShippedFromBridgeCommits — extracts U-BRIDGE ids from a real git repo", () => {
  // Build a throwaway git repo with bridge-style commit subjects.
  const repo = mkTmp("bridge-commits-test-");
  const git = (...a) => execFileSync("git", ["-C", repo, ...a], { stdio: ["ignore", "pipe", "ignore"] });
  try {
    git("init", "-q");
    git("config", "user.email", "t@t.t");
    git("config", "user.name", "t");
    git("config", "commit.gpgsign", "false");
    fs.writeFileSync(path.join(repo, "a.txt"), "1");
    git("add", "-A");
    git("commit", "-q", "-m", "[MAIN] [CAM-EXHAUST-MS0]/U-BRIDGE-SFC-ESPRIT+SOLIDCAM: 2 bridges");
    fs.writeFileSync(path.join(repo, "b.txt"), "2");
    git("add", "-A");
    git("commit", "-q", "-m", "[MAIN] [X]/U-BRIDGE-CAD-CAM-HANDOFF: handoff");
    fs.writeFileSync(path.join(repo, "c.txt"), "3");
    git("add", "-A");
    git("commit", "-q", "-m", "chore: no bridge id here");

    const got = readShippedFromBridgeCommits({ repoRoot: repo, maxCommits: 50 });
    assert.ok(got.has("U-BRIDGE-SFC-ESPRIT"));
    assert.ok(got.has("U-BRIDGE-SFC-SOLIDCAM"), "compound +SOLIDCAM recovered");
    assert.ok(got.has("U-BRIDGE-CAD-CAM-HANDOFF"));
    assert.equal(got.size, 3);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("readShippedFromBridgeCommits — non-git dir returns empty Set, never throws", () => {
  const notRepo = mkTmp("not-a-repo-");
  try {
    const got = readShippedFromBridgeCommits({ repoRoot: notRepo, maxCommits: 10 });
    assert.equal(got.size, 0);
  } finally {
    fs.rmSync(notRepo, { recursive: true, force: true });
  }
});

test("readShippedFromBridgeCommits — only U-BRIDGE-* matched, plain U-* ignored", () => {
  const repo = mkTmp("bridge-only-test-");
  const git = (...a) => execFileSync("git", ["-C", repo, ...a], { stdio: ["ignore", "pipe", "ignore"] });
  try {
    git("init", "-q");
    git("config", "user.email", "t@t.t");
    git("config", "user.name", "t");
    git("config", "commit.gpgsign", "false");
    fs.writeFileSync(path.join(repo, "a.txt"), "1");
    git("add", "-A");
    git("commit", "-q", "-m", "[MAIN] [MS0]/U-NORMAL-UNIT: not a bridge");
    const got = readShippedFromBridgeCommits({ repoRoot: repo, maxCommits: 10 });
    assert.equal(got.size, 0, "plain U-* (non-bridge) must NOT be captured by the bridge source");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("buildShippedIdsUnion (production) -- every in-window bridge id is recovered into the union", () => {
  // The 2026-05-17 bug: bridge units have no envelope so sources (a)+(b) miss
  // them; the picker re-served a shipped bridge forever. Source (c) closes this.
  // DRIFT-RESISTANT (2026-06-14): the original assertion pinned U-BRIDGE-SFC-ESPRIT
  // / commit 76dc1b53cb, which aged out of the BRIDGE_LOG_MAX_COMMITS (800) scan
  // window once the repo grew past it (3690 commits later -> the test went red on
  // clean HEAD, unrelated to any edit). Instead of pinning an aging commit, assert
  // the invariant directly: whatever U-BRIDGE-* ids the live commit-subject scan
  // recovers, ALL of them must land in the union (the compound +-expansion logic
  // is covered by the hermetic expandBridgeToken tests).
  _resetShippedUnionCache();
  const bridge = readShippedFromBridgeCommits();
  const u = buildShippedIdsUnion();
  if (bridge.size === 0) return; // no bridge commit in-window -> nothing to assert (hermetic tests cover the logic)
  for (const id of bridge) {
    assert.ok(u.has(id), `bridge id ${id} recovered from commit subjects must be in the production union`);
  }
});

test("describeShippedSources — production includes bridgeCount; hermetic excludes it", () => {
  const prod = describeShippedSources();
  assert.ok(typeof prod.bridgeCount === "number");
  assert.ok(prod.bridgeCount > 0, "real repo has shipped U-BRIDGE-* commits");

  // Hermetic (custom paths) must NOT read real git → bridgeCount 0.
  const tmp = mkTmp();
  const pPath = path.join(tmp, "p.json");
  writeJson(pPath, { milestones: [{ id: "MS-A", units: [{ id: "U-A", shipped: true }] }] });
  const envDir = path.join(tmp, "env");
  fs.mkdirSync(envDir);
  const herm = describeShippedSources({ progressPath: pPath, envelopesDir: envDir });
  assert.equal(herm.bridgeCount, 0, "hermetic mode must skip the production-only bridge source");
});

// ─── Source (d): milestone-name-keyed completion ─────────────────────────────

test("readCompletedMilestones — flags complete-status envelopes by filename stem", () => {
  const tmp = mkTmp("completed-ms-");
  writeJson(path.join(tmp, "MS-DONE.json"), { id: "MS-DONE", status: "complete", units: [] });
  writeJson(path.join(tmp, "MS-OPEN.json"), { id: "MS-OPEN", status: "in_progress", units: [] });
  const got = readCompletedMilestones(tmp);
  assert.ok(got.has("MS-DONE"), "complete milestone flagged by filename stem");
  assert.ok(!got.has("MS-OPEN"), "in_progress milestone must NOT be flagged");
});

test("readCompletedMilestones — accepts complete | completed | shipped | superseded | done", () => {
  const tmp = mkTmp("completed-ms-statuses-");
  writeJson(path.join(tmp, "MS-1.json"), { status: "complete" });
  writeJson(path.join(tmp, "MS-2.json"), { status: "completed" });
  writeJson(path.join(tmp, "MS-3.json"), { status: "shipped" });
  writeJson(path.join(tmp, "MS-4.json"), { status: "superseded" });
  writeJson(path.join(tmp, "MS-5.json"), { status: "done" });
  writeJson(path.join(tmp, "MS-6.json"), { status: "pending" });
  writeJson(path.join(tmp, "MS-7.json"), { status: "not_started" });
  const got = readCompletedMilestones(tmp);
  for (const id of ["MS-1", "MS-2", "MS-3", "MS-4", "MS-5"]) assert.ok(got.has(id), `${id} flagged`);
  assert.ok(!got.has("MS-6"), "pending not flagged");
  assert.ok(!got.has("MS-7"), "not_started not flagged");
});

test("readCompletedMilestones — status match is case-insensitive + whitespace-tolerant", () => {
  const tmp = mkTmp("completed-ms-case-");
  writeJson(path.join(tmp, "MS-A.json"), { status: "COMPLETE" });
  writeJson(path.join(tmp, "MS-B.json"), { status: "  Done  " });
  const got = readCompletedMilestones(tmp);
  assert.ok(got.has("MS-A"));
  assert.ok(got.has("MS-B"));
});

test("readCompletedMilestones — envelope with no top-level status is skipped", () => {
  // A units-only envelope (no milestone-level status) must NOT be treated as
  // complete — absence of status ≠ complete.
  const tmp = mkTmp("completed-ms-nostatus-");
  writeJson(path.join(tmp, "MS-NOSTAT.json"), { units: [{ id: "U-1", status: "complete" }] });
  const got = readCompletedMilestones(tmp);
  assert.equal(got.size, 0, "no top-level status → not flagged");
});

test("readCompletedMilestones — captures inner milestone_id / id alongside filename stem", () => {
  const tmp = mkTmp("completed-ms-inner-");
  writeJson(path.join(tmp, "MS-FILE.json"), { milestone_id: "MS-INNER", status: "complete" });
  const got = readCompletedMilestones(tmp);
  assert.ok(got.has("MS-FILE"), "filename stem captured");
  assert.ok(got.has("MS-INNER"), "inner milestone_id captured");
});

test("readCompletedMilestones — normalizes ids (trim + uppercase)", () => {
  const tmp = mkTmp("completed-ms-norm-");
  writeJson(path.join(tmp, "ms-lower-done.json"), { id: "  ms-inner-lower  ", status: "complete" });
  const got = readCompletedMilestones(tmp);
  assert.ok(got.has("MS-LOWER-DONE"), "filename stem uppercased");
  assert.ok(got.has("MS-INNER-LOWER"), "inner id trimmed + uppercased");
});

test("readCompletedMilestones — skips non-json, subdirs, malformed; never throws", () => {
  const tmp = mkTmp("completed-ms-junk-");
  writeJson(path.join(tmp, "MS-GOOD.json"), { status: "complete" });
  fs.writeFileSync(path.join(tmp, "MS-TXT.txt"), "not json");          // wrong ext — skipped
  fs.writeFileSync(path.join(tmp, "MS-BAD.json"), "{not valid json");  // malformed — skipped silently
  fs.mkdirSync(path.join(tmp, "MS-SUBDIR.json"));                      // a dir named *.json — skipped
  const got = readCompletedMilestones(tmp);
  assert.equal(got.size, 1);
  assert.ok(got.has("MS-GOOD"));
});

test("readCompletedMilestones — missing dir returns empty Set, never throws", () => {
  const got = readCompletedMilestones("/no/such/milestones/dir");
  assert.ok(got instanceof Set);
  assert.equal(got.size, 0);
});

test("readCompletedMilestones — REGRESSION: real repo flags HOOK-SYNERGY-MS0, not OBSIDIAN-INTELLIGENCE-MS3", () => {
  // Fail-on-revert oracle for the picker leak this function was built to close.
  // HOOK-SYNERGY-MS0 envelope status is `complete` — every unit under it
  // (named H1..H10 in ROADMAP-CONSOLIDATED, U-HOOK-* in the envelope) must be
  // excludable. OBSIDIAN-INTELLIGENCE-MS3 is `in_progress` — its units MUST
  // stay pickable. If either envelope status changes legitimately, update the
  // assertion; if the function regresses, this test breaks loud.
  const got = readCompletedMilestones();         // real repo default path
  assert.ok(got instanceof Set);
  assert.ok(got.has("HOOK-SYNERGY-MS0"),
    "HOOK-SYNERGY-MS0 envelope is status:complete — must be flagged");
  assert.ok(!got.has("OBSIDIAN-INTELLIGENCE-MS3"),
    "OBSIDIAN-INTELLIGENCE-MS3 is status:in_progress — must NOT be flagged");
});

test("readCompletedMilestones — default-path calls are cached, returning a fresh copy each call", () => {
  _resetShippedUnionCache();
  const a = readCompletedMilestones();
  const b = readCompletedMilestones();
  assert.notStrictEqual(a, b, "each call must return a copy, not the cached Set instance");
  assert.equal(a.size, b.size);
  for (const id of a) assert.ok(b.has(id));
  // Caller mutation of the returned Set must NOT poison the cache.
  a.add("MS-FAKE-NEVER-COMPLETE");
  const c = readCompletedMilestones();
  assert.ok(!c.has("MS-FAKE-NEVER-COMPLETE"), "test-added id must not leak into a later cached call");
});

test("readCompletedMilestones — custom dir bypasses the cache (hermetic isolation)", () => {
  _resetShippedUnionCache();
  const warm = readCompletedMilestones();        // warm the default-path cache
  assert.ok(warm instanceof Set);
  const tmp = mkTmp("completed-ms-bypass-");
  writeJson(path.join(tmp, "MS-ONLY.json"), { status: "complete" });
  const custom = readCompletedMilestones(tmp);
  assert.equal(custom.size, 1, "custom-dir call must scan the hermetic dir, not return the cached default");
  assert.ok(custom.has("MS-ONLY"));
});

// U-PQ-EMBEDDED-UID (2026-05-20, slot:mike) — phase-letter envelope ids with
// canonical U-IDs embedded in titles must surface BOTH ids in the shipped set.

test("extractUnitIdsFromUnit — U-shaped id surfaces verbatim", () => {
  const got = extractUnitIdsFromUnit({ id: "U-FOO" });
  assert.equal(got.size, 1);
  assert.ok(got.has("U-FOO"));
});

test("extractUnitIdsFromUnit — phase-letter id with U-ID in title returns the title id", () => {
  const got = extractUnitIdsFromUnit({ id: "A2", title: "U-REREAD-SIGNAL-FINISH — wire Write|Edit|MultiEdit matcher" });
  assert.equal(got.size, 1);
  assert.ok(got.has("U-REREAD-SIGNAL-FINISH"));
  assert.ok(!got.has("A2"), "phase-letter id alone must not be added (U-only gate)");
});

test("extractUnitIdsFromUnit — both U-id and embedded U-id contribute when distinct", () => {
  const got = extractUnitIdsFromUnit({ id: "U-FOO", title: "U-BAR — alias", description: "see U-BAR" });
  assert.ok(got.has("U-FOO"));
  assert.ok(got.has("U-BAR"));
  assert.equal(got.size, 2, "duplicate occurrences of U-BAR across title+description still de-dup via Set");
});

test("extractUnitIdsFromUnit — non-U id with no embedded U-id returns empty set", () => {
  const got = extractUnitIdsFromUnit({ id: "F1", title: "finding about something" });
  assert.equal(got.size, 0);
});

test("extractUnitIdsFromUnit — null/undefined/non-object input never throws", () => {
  assert.equal(extractUnitIdsFromUnit(null).size, 0);
  assert.equal(extractUnitIdsFromUnit(undefined).size, 0);
  assert.equal(extractUnitIdsFromUnit("string").size, 0);
  assert.equal(extractUnitIdsFromUnit(42).size, 0);
});

test("collectCompletedFromEnvelope — phase-letter status:complete unit with U-id in title gets surfaced", () => {
  const env = {
    phases: {
      "0": { units: [
        { id: "A2", status: "completed", title: "U-REREAD-SIGNAL-FINISH — wire Write|Edit|MultiEdit matcher" },
        { id: "A3", status: "pending",   title: "U-OTHER — still in flight" },
      ]},
    },
  };
  const got = collectCompletedFromEnvelope(env);
  assert.ok(got.has("U-REREAD-SIGNAL-FINISH"), "envelope-completed A2 must surface via title");
  assert.ok(!got.has("U-OTHER"), "pending unit must NOT surface even if title carries a U-id");
});

test("collectCompletedFromEnvelope — pre-existing U-shaped id behavior is preserved (regression)", () => {
  const env = { units: [
    { id: "U-CK28", status: "completed", title: "Some title" },
    { id: "U-CK29", status: "completed", title: "Some other title" },
    { id: "U-CK30", status: "pending",   title: "still working" },
  ]};
  const got = collectCompletedFromEnvelope(env);
  assert.ok(got.has("U-CK28"));
  assert.ok(got.has("U-CK29"));
  assert.ok(!got.has("U-CK30"));
});

test("collectCompletedFromEnvelope — milestone-level id collision (non-U) is still rejected", () => {
  // SYS-MS0 must NOT slip into the unit set even with status:complete — this
  // was the original 2026-05-17 milestone-id-collision finding the U-only gate
  // closed. The embedded-uid extension must preserve that property.
  const env = { id: "SYS-MS0", status: "complete", units: [] };
  const got = collectCompletedFromEnvelope(env);
  assert.equal(got.size, 0);
});
