#!/usr/bin/env node
/**
 * memory-compact.test.mjs — U-OBF03 unit + E2E tests (node:test).
 *
 *   node --test scripts/memory-compact.test.mjs
 *
 * Real-behavior assertions: reference byte counts, conservation invariants
 * (kept + archived === original), idempotency, the drain<->append interleave,
 * lock contention, and abort-not-proceed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parseMemory,
  buildMemoryText,
  compactPlan,
  buildArchiveText,
  acquireLock,
  releaseLock,
  run,
  CEILING_BYTES,
} from "./memory-compact.mjs";

// ---- fixtures -------------------------------------------------------------

const HEAD = [
  "# PRISM Project Memory",
  "## Last synced: 2026-05-17",
  "",
  "## Working Mode",
  "- YOLO autonomous.",
  "",
  "## Indexed memories",
];
const TAIL = ["", "## Recent Commits", "Use `git log`.", "", "> footer."];

/**
 * Build a MEMORY.md fixture with n index entries, newest-first (e1 newest).
 * Each entry is padded to ~padTo chars so the fixture reaches realistic byte
 * sizes — 130 entries clears the real 24576-byte truncation ceiling.
 */
function makeMemory(n, eol = "\n", padTo = 190) {
  const entries = [];
  for (let i = 1; i <= n; i++) {
    let e = `- [entry-${i}](reference_entry_${i}.md) — pointer body ${i}.`;
    while (e.length < padTo) e += " padword";
    entries.push(e.slice(0, padTo));
  }
  return [...HEAD, ...entries, ...TAIL].join(eol);
}

const _tmpDirs = new Set();
function tmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "memcompact-"));
  _tmpDirs.add(d);
  return d;
}
process.on("exit", () => {
  for (const d of _tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

// ---- parseMemory ----------------------------------------------------------

test("parseMemory: splits head / entries / tail", () => {
  const p = parseMemory(makeMemory(5));
  assert.equal(p.sectionFound, true);
  assert.equal(p.entries.length, 5);
  assert.ok(p.entries[0].startsWith("- [entry-1](reference_entry_1.md) — "));
  assert.equal(p.entries[0].length, 190); // padded fixture entry width
  assert.ok(p.headLines[p.headLines.length - 1] === "## Indexed memories");
  assert.ok(p.tailLines.includes("## Recent Commits"));
  assert.equal(p.strayLines.length, 0);
});

test("parseMemory: missing section -> sectionFound false", () => {
  assert.equal(parseMemory("# just a title\nno index here").sectionFound, false);
});

test("parseMemory: non-string input -> sectionFound false", () => {
  assert.equal(parseMemory(null).sectionFound, false);
  assert.equal(parseMemory(undefined).sectionFound, false);
  assert.equal(parseMemory(42).sectionFound, false);
});

test("parseMemory: strips a prior archive pointer line", () => {
  const withPointer = [
    ...HEAD,
    "> Older index entries are archived to [MEMORY-ARCHIVE.md](MEMORY-ARCHIVE.md) — read on demand.",
    "",
    "- [entry-1](reference_entry_1.md) — body.",
    ...TAIL,
  ].join("\n");
  const p = parseMemory(withPointer);
  assert.equal(p.entries.length, 1);
  // the `>` pointer line must NOT survive into entries or strayLines
  assert.equal(p.strayLines.length, 0);
  assert.ok(!p.entries.some((e) => e.includes("MEMORY-ARCHIVE.md")));
});

test("parseMemory: preserves stray non-entry lines", () => {
  const withStray = [...HEAD, "a stray prose line", "- [entry-1](x.md) — body.", ...TAIL].join("\n");
  const p = parseMemory(withStray);
  assert.deepEqual(p.strayLines, ["a stray prose line"]);
  assert.equal(p.entries.length, 1);
});

test("parseMemory: detects CRLF", () => {
  assert.equal(parseMemory(makeMemory(3, "\r\n")).eol, "\r\n");
  assert.equal(parseMemory(makeMemory(3, "\n")).eol, "\n");
});

// ---- compactPlan ----------------------------------------------------------

test("compactPlan: archives oldest, keeps newest, conserves all entries", () => {
  const p = parseMemory(makeMemory(40));
  const plan = compactPlan(p, { targetBytes: 1800, keepMin: 5, pointerLine: ">P" });
  assert.equal(plan.keep.length + plan.archive.length, 40);
  // kept are the newest (entry-1..); archived are the oldest (..entry-40)
  assert.equal(plan.keep[0], p.entries[0]);
  assert.equal(plan.archive[plan.archive.length - 1], p.entries[39]);
  // no overlap
  assert.ok(!plan.archive.includes(plan.keep[plan.keep.length - 1]));
});

test("compactPlan: result is under targetBytes when archiving is possible", () => {
  const p = parseMemory(makeMemory(60));
  const plan = compactPlan(p, { targetBytes: 1500, keepMin: 3, pointerLine: ">P" });
  assert.ok(plan.archive.length > 0, "should archive something");
  assert.ok(plan.finalBytes <= 1500, `finalBytes ${plan.finalBytes} <= 1500`);
});

test("compactPlan: nothing archived when already under target", () => {
  const p = parseMemory(makeMemory(3));
  const plan = compactPlan(p, { targetBytes: 50000, keepMin: 1, pointerLine: ">P" });
  assert.equal(plan.archive.length, 0);
  assert.equal(plan.keep.length, 3);
});

test("compactPlan: keepMin floor honored even if still over target", () => {
  const p = parseMemory(makeMemory(50));
  const plan = compactPlan(p, { targetBytes: 10, keepMin: 8, pointerLine: ">P" });
  assert.equal(plan.keep.length, 8); // cannot shrink below the floor
  assert.equal(plan.archive.length, 42);
  assert.ok(plan.finalBytes > 10, "surfaced as over-target, not silently shrunk past floor");
});

// ---- buildMemoryText ------------------------------------------------------

test("buildMemoryText: pointer present, structure intact, round-trips", () => {
  const p = parseMemory(makeMemory(10));
  const text = buildMemoryText({
    headLines: p.headLines, strayLines: p.strayLines, keep: p.entries.slice(0, 4),
    tailLines: p.tailLines, eol: p.eol, pointerLine: "> POINTER",
  });
  assert.ok(text.includes("> POINTER"));
  assert.ok(text.includes("## Indexed memories"));
  assert.ok(text.includes("## Recent Commits"));
  // re-parsing the rebuilt file yields the 4 kept entries
  const re = parseMemory(text);
  assert.equal(re.entries.length, 4);
  assert.equal(re.entries[0], p.entries[0]);
});

// ---- buildArchiveText -----------------------------------------------------

test("buildArchiveText: fresh archive has title + intro + batch", () => {
  const a = buildArchiveText("", ["- [old-1](x.md) — body."], "2026-05-17T00:00:00.000Z");
  assert.ok(a.startsWith("# PRISM Memory — Archived Index Entries"));
  assert.ok(a.includes("## Archived 2026-05-17T00:00:00.000Z — 1 entry"));
  assert.ok(a.includes("- [old-1](x.md) — body."));
});

test("buildArchiveText: prepends new batch, preserves prior, newest on top", () => {
  const first = buildArchiveText("", ["- [old-1](x.md) — b."], "2026-05-16T00:00:00.000Z");
  const second = buildArchiveText(first, ["- [old-2](y.md) — b."], "2026-05-17T00:00:00.000Z");
  const iNew = second.indexOf("2026-05-17");
  const iOld = second.indexOf("2026-05-16");
  assert.ok(iNew > -1 && iOld > -1 && iNew < iOld, "newest batch above older batch");
  assert.ok(second.includes("- [old-1](x.md) — b."), "prior entry preserved");
  assert.ok(second.includes("- [old-2](y.md) — b."), "new entry present");
});

test("buildArchiveText: no run of 3+ blank lines", () => {
  const a = buildArchiveText(
    buildArchiveText("", ["- [a](a.md) — b."], "2026-05-16T00:00:00.000Z"),
    ["- [b](b.md) — b."], "2026-05-17T00:00:00.000Z"
  );
  assert.ok(!/\n\n\n/.test(a), "collapsed blank-line runs");
});

// ---- acquireLock ----------------------------------------------------------

test("acquireLock: acquires when free, fails when held fresh, steals when stale", () => {
  const d = tmpDir();
  const lock = path.join(d, ".lk");
  const a = acquireLock(lock, { now: 1000 });
  assert.equal(a.ok, true);

  const b = acquireLock(lock, { now: 1500, ttlMs: 60000 });
  assert.equal(b.ok, false);
  assert.equal(b.reason, "locked");

  const c = acquireLock(lock, { now: 1000 + 70000, ttlMs: 60000 });
  assert.equal(c.ok, true);
  assert.equal(c.stoleStale, true);

  releaseLock(lock);
  assert.equal(fs.existsSync(lock), false);
});

// Regression — pre-2026-05-26 `ageEffective` dereferenced `holder.ts` without
// a null-guard. A 0-byte stale lockfile (the in-prod observed failure mode)
// made JSON.parse("") throw, left `holder=null`, then `holder.ts` re-threw.
// Every Stop-hook auto-compact silently no-op'd; MEMORY.md grew to 99.19% of
// the 24576B truncation ceiling fleet-wide. The fix: steal a null-holder lock.
test("acquireLock: 0-byte stale lockfile steals cleanly (regression — null-holder no-throw)", () => {
  const d = tmpDir();
  const lock = path.join(d, ".lk");
  fs.writeFileSync(lock, ""); // 0-byte stale lock — JSON.parse("") throws
  const r = acquireLock(lock, { now: 1000, ttlMs: 60000 });
  assert.equal(r.ok, true, "must not throw on null holder");
  assert.equal(r.stoleStale, true, "0-byte holder treated as stale-stealable");
  releaseLock(lock);
});

test("acquireLock: corrupt-JSON holder steals cleanly (no-throw)", () => {
  const d = tmpDir();
  const lock = path.join(d, ".lk");
  fs.writeFileSync(lock, "{not valid json"); // partial-write / disk error
  const r = acquireLock(lock, { now: 1000, ttlMs: 60000 });
  assert.equal(r.ok, true);
  assert.equal(r.stoleStale, true);
  releaseLock(lock);
});

test("acquireLock: holder with missing ts steals cleanly", () => {
  const d = tmpDir();
  const lock = path.join(d, ".lk");
  fs.writeFileSync(lock, JSON.stringify({ pid: 1234, host: "x" })); // valid JSON, no ts
  const r = acquireLock(lock, { now: 1000, ttlMs: 60000 });
  assert.equal(r.ok, true);
  assert.equal(r.stoleStale, true);
  releaseLock(lock);
});

// ---- run() E2E ------------------------------------------------------------

test("run: archives oldest entries, MEMORY.md drops under ceiling, archive created", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(130));
  const before = fs.statSync(mem).size;
  assert.ok(before > CEILING_BYTES * 0.95, "fixture starts near the ceiling");

  const r = run({ memoryPath: mem, force: true });
  assert.equal(r.ok, true);
  assert.ok(r.archived > 0, "archived some entries");
  assert.equal(r.archived + r.kept, 130, "conservation: all entries accounted for");
  assert.ok(r.afterBytes < r.beforeBytes, "MEMORY.md shrank");
  assert.ok(r.afterBytes <= CEILING_BYTES, "result under truncation ceiling");

  const archived = fs.readFileSync(path.join(d, "MEMORY-ARCHIVE.md"), "utf8");
  assert.ok(archived.includes("## Archived"));
  const after = fs.readFileSync(mem, "utf8");
  assert.ok(after.includes("MEMORY-ARCHIVE.md"), "pointer left behind");
  // every archived entry is now in the archive file and not in MEMORY.md
  const archParsed = archived.split(/\r?\n/).filter((l) => /^- /.test(l));
  assert.equal(archParsed.length, r.archived);
});

test("run: lock is released after a successful run", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(130));
  const r = run({ memoryPath: mem, force: true });
  assert.equal(r.ok, true);
  assert.equal(fs.existsSync(path.join(d, ".memory-compact.lock")), false, "lock released after success");
  // A second run must be able to acquire the lock (so this one wouldn't be
  // throttle-blocked we pass --force).
  const r2 = run({ memoryPath: mem, force: true });
  assert.equal(r2.ok, true, "second run acquired the lock after the first released it");
});

test("run: steals a stale lock and proceeds (integration via run, not just acquireLock)", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(130));
  const lock = path.join(d, ".memory-compact.lock");
  // Holder timestamp older than LOCK_TTL_MS (60s) — the stale path.
  fs.writeFileSync(lock, JSON.stringify({ pid: 99999, host: "dead", ts: Date.now() - 5 * 60 * 1000 }));
  const r = run({ memoryPath: mem, force: true });
  assert.equal(r.ok, true, "run succeeded by stealing the stale lock");
  assert.ok(r.archived > 0, "stale-steal path reaches the archive step");
});

test("run: idempotent — second run is a no-op once under target", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(130));
  const r1 = run({ memoryPath: mem, force: true });
  assert.ok(r1.archived > 0);
  const r2 = run({ memoryPath: mem, force: true });
  assert.equal(r2.ok, true);
  assert.equal(r2.archived, 0, "nothing left to archive");
});

test("run: re-run does NOT duplicate the archive pointer line", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(130));
  run({ memoryPath: mem, force: true });
  run({ memoryPath: mem, force: true });
  const after = fs.readFileSync(mem, "utf8");
  const pointerCount = (after.match(/MEMORY-ARCHIVE\.md/g) || []).length;
  // exactly one markdown link target — `[MEMORY-ARCHIVE.md](MEMORY-ARCHIVE.md)` has the
  // basename twice on ONE line, so the pointer LINE appears once.
  const pointerLines = after.split(/\r?\n/).filter((l) => l.includes("MEMORY-ARCHIVE.md"));
  assert.equal(pointerLines.length, 1, "pointer line appears exactly once");
  assert.equal(pointerCount, 2, "single pointer line, two basename occurrences (link text + href)");
});

test("run: drain<->append interleave — append a fresh entry, re-run drains again", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(130));
  run({ memoryPath: mem, force: true });

  // simulate a chat appending a new newest entry at the top of the index
  let text = fs.readFileSync(mem, "utf8");
  const lines = text.split("\n");
  const hdr = lines.findIndex((l) => l.trim() === "## Indexed memories");
  // insert after the header + pointer + blank
  lines.splice(hdr + 3, 0, "- [brand-new](reference_brand_new.md) — freshly added entry.");
  // pad it big so the file goes back over target
  for (let i = 0; i < 60; i++) {
    lines.splice(hdr + 3, 0, `- [pad-${i}](reference_pad_${i}.md) — padding entry to re-bloat the file body.`);
  }
  fs.writeFileSync(mem, lines.join("\n"));

  const r = run({ memoryPath: mem, force: true });
  assert.equal(r.ok, true);
  assert.ok(r.archived > 0, "drained again after re-bloat");
  const after = fs.readFileSync(mem, "utf8");
  assert.ok(after.includes("- [brand-new]"), "freshest entry preserved (newest = kept)");
  assert.ok(after.includes("MEMORY-ARCHIVE.md"), "pointer still present");
  // count index entries via the parser (a bare /^- / regex also catches the
  // head fixture's "- YOLO autonomous." line, which is not an index entry)
  assert.equal(parseMemory(after).entries.length, r.kept, "kept count matches file");
});

test("run: abort-not-proceed on missing memory file — no writes", () => {
  const d = tmpDir();
  const mem = path.join(d, "does-not-exist.md");
  const r = run({ memoryPath: mem, force: true });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "memory_read_failed");
  assert.equal(fs.existsSync(path.join(d, "MEMORY-ARCHIVE.md")), false, "no archive written");
});

test("run: aborts when lock is held by a fresh holder — no writes", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(130));
  const lock = path.join(d, ".memory-compact.lock");
  fs.writeFileSync(lock, JSON.stringify({ pid: 999999, host: "peer", ts: Date.now() }));
  const r = run({ memoryPath: mem, force: true });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "locked");
  assert.equal(fs.existsSync(path.join(d, "MEMORY-ARCHIVE.md")), false, "no archive written under lock");
});

test("run: dry-run makes no writes", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  const original = makeMemory(130);
  fs.writeFileSync(mem, original);
  const r = run({ memoryPath: mem, force: true, dryRun: true });
  assert.equal(r.ok, true);
  assert.equal(r.dryRun, true);
  assert.ok(r.archived > 0);
  assert.equal(fs.readFileSync(mem, "utf8"), original, "MEMORY.md untouched");
  assert.equal(fs.existsSync(path.join(d, "MEMORY-ARCHIVE.md")), false, "no archive in dry-run");
});

test("run: throttle skips a second run inside the window; --force bypasses", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(130));
  const t0 = 1_000_000;
  const r1 = run({ memoryPath: mem, now: t0 });          // first run, no stamp -> proceeds
  assert.equal(r1.ok, true);
  assert.ok(r1.archived > 0, "first run actually archived (anchors the sequence)");
  const r2 = run({ memoryPath: mem, now: t0 + 5_000 });  // 5s later -> throttled
  assert.equal(r2.skipped, "throttled");
  const r3 = run({ memoryPath: mem, now: t0 + 5_000, force: true }); // force bypasses
  assert.equal(r3.ok, true, "forced run completed");
  assert.notEqual(r3.skipped, "throttled");
  const r4 = run({ memoryPath: mem, now: t0 + 40 * 60 * 1000 }); // past the 30-min window
  assert.equal(r4.ok, true, "post-window run completed");
  assert.notEqual(r4.skipped, "throttled");
});

test("run: rejects invalid targetPct loudly (out-of-range silently no-ops)", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(5));
  for (const bad of [0, -0.5, 1.5, NaN, Infinity]) {
    const r = run({ memoryPath: mem, targetPct: bad, force: true });
    if (!Number.isFinite(bad)) {
      // Non-finite means "no value provided" (matches the CLI's num() returning
      // undefined for missing args) — falls through to the default. The invariant
      // we exercise here is that explicit out-of-range FINITE values fail loud.
      assert.equal(r.ok, true, `non-finite targetPct=${bad} falls through to default`);
      continue;
    }
    assert.equal(r.ok, false, `targetPct=${bad} must be rejected`);
    assert.equal(r.reason, "invalid_target_pct");
  }
});

test("run: rejects invalid keepMin", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, makeMemory(5));
  const r = run({ memoryPath: mem, keepMin: -1, force: true });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_keep_min");
});

test("run: empty index section archives nothing, stays ok", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  fs.writeFileSync(mem, [...HEAD, ...TAIL].join("\n"));
  const r = run({ memoryPath: mem, force: true });
  assert.equal(r.ok, true);
  assert.equal(r.archived, 0);
  assert.equal(r.kept, 0);
});

test("run: entries with unusual characters survive the round-trip", () => {
  const d = tmpDir();
  const mem = path.join(d, "MEMORY.md");
  const weird = [
    "- [emoji](x.md) — accents éàü and symbols ±∞≤ kept verbatim.",
    "- [brackets](y.md) — has [nested] (parens) and `backticks`.",
  ];
  fs.writeFileSync(mem, [...HEAD, ...weird, ...Array.from({ length: 130 }, (_, i) =>
    `- [bulk-${i}](b${i}.md) — bulk padding entry number ${i} to force the archive path.`), ...TAIL].join("\n"));
  const r = run({ memoryPath: mem, force: true });
  assert.equal(r.ok, true);
  const after = fs.readFileSync(mem, "utf8");
  // the two weird entries are newest -> always kept
  assert.ok(after.includes("accents éàü and symbols ±∞≤"));
  assert.ok(after.includes("has [nested] (parens)"));
});

test("run: targetPct knob changes how aggressively it archives", () => {
  const d1 = tmpDir(); const m1 = path.join(d1, "MEMORY.md");
  const d2 = tmpDir(); const m2 = path.join(d2, "MEMORY.md");
  fs.writeFileSync(m1, makeMemory(130));
  fs.writeFileSync(m2, makeMemory(130));
  const loose = run({ memoryPath: m1, force: true, targetPct: 0.90 });
  const tight = run({ memoryPath: m2, force: true, targetPct: 0.60 });
  assert.ok(tight.archived > loose.archived, "lower target archives more");
});
