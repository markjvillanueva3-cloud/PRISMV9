import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { extractBlock, shapeDirective, resolveSpec, ledgerRecord, acquireBuildLoopLock, releaseBuildLoopLock, shippedByArtifact } from "./zulu-build-loop.mjs";

const SPEC = [
  "## Candidate Ranking",
  "### C1 -- Wave Scheduler",
  "Est-effort: S",
  "Body of C1.",
  "### C4 -- Delegation Contract",
  "Est-effort: M",
  "Body of C4 line 1.",
  "Body of C4 line 2.",
  "### C8 -- Soul Evolution",
  "Est-effort: L",
].join("\n");

test("extractBlock returns the C4 section only (up to next ###)", () => {
  const b = extractBlock(SPEC, "C4");
  assert.ok(b.startsWith("### C4 -- Delegation Contract"));
  assert.ok(b.includes("Body of C4 line 2."));
  assert.ok(!b.includes("Soul Evolution"), "must stop at the next ### header");
  assert.ok(!b.includes("Wave Scheduler"), "must not bleed into the prior block");
});

test("extractBlock on a missing id / empty -> empty string", () => {
  assert.equal(extractBlock(SPEC, "C99"), "");
  assert.equal(extractBlock("", "C1"), "");
  assert.equal(extractBlock(null, "C1"), "");
});

test("shapeDirective: pending queue -> next populated, gated note, counts", () => {
  const queue = {
    next: { id: "C5", title: "Back-Pressure", effort: "S" },
    pending: [{ id: "C5", title: "Back-Pressure", effort: "S" }, { id: "C4", title: "Delegation", effort: "M" }],
    done: [{ id: "C1" }, { id: "C2" }, { id: "C3" }],
    blocked: [{ id: "C9", title: "governance enforcer" }],
  };
  const d = shapeDirective(queue, { summary: "build the thing", nowIso: "2026-06-15T00:00:00.000Z", specPath: "spec.md", briefPath: "brief.md" });
  assert.equal(d.drained, false);
  assert.equal(d.builder, "bravo");
  assert.deepEqual(d.next, { id: "C5", title: "Back-Pressure", effort: "S", summary: "build the thing" });
  assert.equal(d.pendingCount, 2);
  assert.equal(d.doneCount, 3);
  assert.equal(d.blockedCount, 1);
  assert.deepEqual(d.blocked, ["C9"]);
  assert.match(d.note, /GATED build for bravo: C5/);
  assert.match(d.note, /NEVER auto-commit/);
  assert.equal(d.at, "2026-06-15T00:00:00.000Z");
  assert.equal(d.schemaVersion, "1.0.0");
});

test("shapeDirective: drained queue -> next null, DRAINED note", () => {
  const queue = { next: null, pending: [], done: [{ id: "C1" }], blocked: [] };
  const d = shapeDirective(queue, { nowIso: "2026-06-15T01:00:00.000Z", specPath: "s", briefPath: "b" });
  assert.equal(d.drained, true);
  assert.equal(d.next, null);
  assert.equal(d.pendingCount, 0);
  assert.match(d.note, /DRAINED/);
  assert.match(d.note, /operator-gated/);
});

// ---- U-ZBL-CRON-FAILLOUD: resolveSpec fallback + ledgerRecord structured-state (overnight article) ----
const mkSpecDir = () => fs.mkdtempSync(path.join(os.tmpdir(), `zbl-spec-${process.pid}-`));
const wspec = (dir, name, body) => { const p = path.join(dir, name); fs.writeFileSync(p, body, "utf8"); return p; };

test("resolveSpec: configured path exists + non-empty -> uses it, viaFallback false", () => {
  const dir = mkSpecDir();
  try {
    const cfg = wspec(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md", "### C1 -- X\nbody");
    const r = resolveSpec(cfg, { specsDir: dir });
    assert.ok(r); assert.equal(r.path, cfg); assert.equal(r.viaFallback, false);
    assert.ok(r.text.includes("C1"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("resolveSpec: configured MISSING -> falls back to the LATEST dated spec (viaFallback true)", () => {
  const dir = mkSpecDir();
  try {
    wspec(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md", "### C1\nold");
    const newer = wspec(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-18.md", "### C1\nnew");
    const missing = path.join(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-2099-01-01.md"); // never written
    const r = resolveSpec(missing, { specsDir: dir });
    assert.ok(r); assert.equal(r.path, newer, "latest dated spec by lexical name");
    assert.equal(r.viaFallback, true);
    assert.ok(r.text.includes("new"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("resolveSpec: configured present but EMPTY -> falls back to a non-empty dated spec (no phantom drained)", () => {
  const dir = mkSpecDir();
  try {
    const cfg = wspec(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md", "   \n  "); // whitespace-only
    const older = wspec(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-10.md", "### C1\nreal-older");
    const r = resolveSpec(cfg, { specsDir: dir });
    assert.ok(r, "empty-configured must NOT be treated as a valid spec");
    assert.equal(r.path, older);
    assert.equal(r.viaFallback, true);
    assert.ok(r.text.includes("real-older"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("resolveSpec: no configured + no dated specs -> null (FAIL-LOUD signal to main)", () => {
  const dir = mkSpecDir();
  try {
    const r = resolveSpec(path.join(dir, "nope.md"), { specsDir: dir });
    assert.equal(r, null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("resolveSpec: a NON-dated sibling (...-FINAL.md) never out-ranks a real date in the fallback", () => {
  const dir = mkSpecDir();
  try {
    // 'FINAL' sorts lexically AFTER any '-YYYY-' date; the date-shape filter must exclude it
    // so it cannot be wrongly chosen as "latest".
    wspec(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-FINAL.md", "### C1\nNOT-a-dated-spec");
    const dated = wspec(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-18.md", "### C1\ndated-real");
    const r = resolveSpec(path.join(dir, "missing.md"), { specsDir: dir });
    assert.ok(r); assert.equal(r.path, dated, "must pick the ISO-dated spec, not the FINAL sibling");
    assert.ok(r.text.includes("dated-real"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("resolveSpec: .html siblings are ignored -- only .md candidates match", () => {
  const dir = mkSpecDir();
  try {
    wspec(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-18.html", "<h1>not a spec</h1>");
    const md = wspec(dir, "HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-17.md", "### C1\nreal");
    const r = resolveSpec(path.join(dir, "missing.md"), { specsDir: dir });
    assert.ok(r); assert.equal(r.path, md); assert.ok(r.text.includes("real"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("ledgerRecord: ok row carries the four mandatory fields (at/status/source) + spread content", () => {
  const r = ledgerRecord("2026-06-18T00:00:00.000Z", "ok", { next: "C6", pending: 3, done: 5 });
  assert.equal(r.at, "2026-06-18T00:00:00.000Z");
  assert.equal(r.status, "ok");
  assert.equal(r.source, "zulu-build-loop");
  assert.equal(r.next, "C6"); assert.equal(r.pending, 3); assert.equal(r.done, 5);
});

test("ledgerRecord: failed row is durable + carries the reason (distinguishes broken from drained)", () => {
  const r = ledgerRecord("2026-06-18T00:00:00.000Z", "failed", { reason: "spec unreadable", specPath: "state/shared/specs/X.md" });
  assert.equal(r.status, "failed");
  assert.equal(r.source, "zulu-build-loop");
  assert.equal(r.reason, "spec unreadable");
  assert.ok(r.at);
});

// ---- U-ZBL-OVERLAP-LOCK: cron overlap process-lock (reuses the canonical exclusive-file-lock) ----
// The driver fires on a ~15-min cron; a slow run (Ollama summarize up to 60s) could still be running
// when the next tick fires, OR the durable scheduled task could overlap an ad-hoc invocation. Without
// this lock BOTH runs spend the (expensive) Ollama call AND race the single-writer NEXT_PATH atomic-
// write / ledger append. R9: free->acquire, held->SKIP (not block), release->re-acquire; a FRESH peer
// lock is never stolen (the slow-but-alive safety property) but a STALE one is reclaimed in one call.
const mkLockDir = () => fs.mkdtempSync(path.join(os.tmpdir(), `zbl-plock-${process.pid}-`));

test("acquireBuildLoopLock: free->acquire, held->SKIP, release->re-acquire (no parallel runs)", () => {
  const dir = mkLockDir();
  const lk = path.join(dir, "loop-process.lock");
  try {
    const a = acquireBuildLoopLock(lk);
    assert.equal(a.acquired, true, "first run acquires the process lock");
    const b = acquireBuildLoopLock(lk);
    assert.equal(b.acquired, false, "a CONCURRENT run SKIPS -- no duplicate Ollama spend / racing writes");
    releaseBuildLoopLock(lk);
    const c = acquireBuildLoopLock(lk);
    assert.equal(c.acquired, true, "after release the next tick can run");
    releaseBuildLoopLock(lk);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("acquireBuildLoopLock: a FRESH peer lock is NOT stolen (a slow-but-alive run is never reclaimed)", () => {
  const dir = mkLockDir();
  const lk = path.join(dir, "loop-process.lock");
  try {
    // A foreign pid holds it with a NOW mtime -> within staleMs -> must NOT be stolen (else a slow
    // but alive run loses its lock to a second run -> the exact 2x-Ollama race this lock prevents).
    fs.writeFileSync(lk, JSON.stringify({ pid: 999999, acquiredAt: new Date().toISOString() }), "utf8");
    const r = acquireBuildLoopLock(lk);
    assert.equal(r.acquired, false, "a fresh live-peer lock blocks acquisition (no premature steal)");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("acquireBuildLoopLock: a STALE peer lock (mtime past the derived staleMs) IS reclaimed in ONE call", () => {
  const dir = mkLockDir();
  const lk = path.join(dir, "loop-process.lock");
  try {
    fs.writeFileSync(lk, JSON.stringify({ pid: 999999, acquiredAt: "2000-01-01T00:00:00.000Z" }), "utf8");
    // Age the lock 10 min back -- well past the derived staleMs (180s floor) -> a crashed holder.
    const old = Date.now() - 600_000;
    fs.utimesSync(lk, new Date(old), new Date(old));
    const r = acquireBuildLoopLock(lk);
    // retries:2 is what makes this single-call reclaim work; with retries:1 the steal consumes the
    // only attempt and this returns acquired:false -> a wasted ~5-min tick. This pins that choice.
    assert.equal(r.acquired, true, "a crashed holder's stale lock is reclaimed so the cron never wedges a tick");
    assert.equal(r.stolenStale, true, "reclaim is via the stale-steal path");
    releaseBuildLoopLock(lk);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// --- shippedByArtifact (U-ZBL-ARTIFACT-SHIPPED) ---

test("shippedByArtifact returns only ids whose artifact exists (injected existsFn)", () => {
  const artifacts = { C1: "a/one.ts", C2: "a/two.ts", C3: "a/three.ts" };
  const present = new Set(["/root/a/one.ts", "/root/a/three.ts"].map((p) => path.normalize(p)));
  const existsFn = (p) => present.has(path.normalize(p));
  const got = shippedByArtifact("/root", artifacts, existsFn);
  assert.deepEqual([...got].sort(), ["C1", "C3"]);
});

test("shippedByArtifact is fail-soft: a throwing existsFn on one path never blocks the rest", () => {
  const artifacts = { C1: "a/one.ts", C2: "a/two.ts" };
  const existsFn = (p) => {
    if (p.includes("one")) throw new Error("EACCES");
    return true; // C2 resolves
  };
  const got = shippedByArtifact("/root", artifacts, existsFn);
  assert.deepEqual([...got], ["C2"]); // C1 swallowed, C2 still detected
});

test("shippedByArtifact with empty artifact map -> empty set", () => {
  assert.equal(shippedByArtifact("/root", {}, () => true).size, 0);
});

// LIVE GUARD: the seeded default map must point at engines that actually exist on this
// branch -- if an engine is renamed/removed the map goes stale and the pointer reverts
// to falsely re-driving the queue. This pins the real C1-C8 artifacts present today.
test("shippedByArtifact default map resolves all of C1-C8 against the real repo", () => {
  const got = shippedByArtifact(); // real ROOT + real UNIT_ARTIFACTS + fs.existsSync
  assert.deepEqual([...got].sort(), ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]);
});
