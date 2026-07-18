/**
 * Real-behavior tests for oscar-sfc-next.mjs (node:test).
 * Verifies intent (R9): next/claim pick highest-priority OPEN, forward-only
 * lifecycle, dry-signal, merge without clobber, status-validation, atomic write,
 * and the real CLI layer (exit codes, --json failure) via child_process.
 * No toBeDefined stubs — concrete assertions.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  readBacklog, writeBacklog, pickNext, claimNext, counts, setStatus, mergeItems,
} from "./oscar-sfc-next.mjs";

const HARNESS = path.join(path.dirname(fileURLToPath(import.meta.url)), "oscar-sfc-next.mjs");

function fixture(items) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sfc-backlog-"));
  const p = path.join(dir, "SFC-LIVE-BACKLOG.json");
  const data = {
    schemaVersion: "1.0.0",
    domain: "speed-feed",
    slot: "oscar",
    items: items || [
      { id: "U-A", rank: 3, roi: 4, effort: "S", phase: "2", category: "accuracy", status: "open", title: "A", why: "w", evidence: "e" },
      { id: "U-B", rank: 1, roi: 5, effort: "M", phase: "1", category: "accuracy", status: "open", title: "B", why: "w", evidence: "e" },
      { id: "U-C", rank: 2, roi: 5, effort: "L", phase: "1", category: "capability", status: "shipped", title: "C", why: "w", evidence: "e" },
    ],
  };
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return { p, dir };
}

/** Run the harness CLI against a fixture backlog; returns {status, stdout, stderr}. */
function cli(backlogPath, args) {
  return spawnSync(process.execPath, [HARNESS, ...args], {
    env: { ...process.env, SFC_BACKLOG_PATH: backlogPath },
    encoding: "utf8",
  });
}

// ---- pure-function contract ----

test("readBacklog throws loud on missing file (R12)", () => {
  assert.throws(() => readBacklog(path.join(os.tmpdir(), "nope-" + Date.now() + ".json")), /not found/);
});

test("readBacklog throws on missing schemaVersion", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sfc-bad-"));
  const p = path.join(dir, "b.json");
  fs.writeFileSync(p, JSON.stringify({ items: [] }));
  assert.throws(() => readBacklog(p), /schemaVersion/);
});

test("pickNext returns lowest-rank OPEN item, skipping shipped", () => {
  const { p } = fixture();
  assert.equal(pickNext(readBacklog(p)).id, "U-B");
});

test("pickNext breaks rank ties by higher roi", () => {
  const b = { schemaVersion: "1", items: [
    { id: "X", rank: 1, roi: 3, status: "open" },
    { id: "Y", rank: 1, roi: 5, status: "open" },
  ] };
  assert.equal(pickNext(b).id, "Y");
});

test("pickNext returns null when no OPEN items (dry)", () => {
  const b = { schemaVersion: "1", items: [{ id: "Z", rank: 1, status: "shipped" }] };
  assert.equal(pickNext(b), null);
});

test("claimNext picks top OPEN and marks it in_progress atomically", () => {
  const { p } = fixture();
  const b = readBacklog(p);
  const it = claimNext(b, "2026-07-05T00:00:00Z");
  assert.equal(it.id, "U-B");
  assert.equal(it.status, "in_progress");
  assert.equal(it.startedAt, "2026-07-05T00:00:00Z");
  // a second claim on the same (mutated) backlog now returns the NEXT open (U-A), never U-B again
  assert.equal(claimNext(b).id, "U-A");
});

test("claimNext returns null on dry backlog", () => {
  const b = { schemaVersion: "1", items: [{ id: "Z", rank: 1, status: "shipped" }] };
  assert.equal(claimNext(b), null);
});

test("counts tallies each status and ignores garbage status (no prototype-walk)", () => {
  const { p } = fixture();
  assert.deepEqual(counts(readBacklog(p)), { open: 2, in_progress: 0, shipped: 1, total: 3 });
  const c2 = counts({ items: [{ id: "g", status: "toString" }, { id: "o", status: "open" }] });
  assert.deepEqual(c2, { open: 1, in_progress: 0, shipped: 0, total: 2 });
});

test("setStatus forward transitions and stamps; done then re-pick skips it", () => {
  const { p } = fixture();
  const b = readBacklog(p);
  setStatus(b, "U-B", "shipped", { shippedAt: "2026-07-05T00:00:00Z" });
  writeBacklog(b, p);
  const b2 = readBacklog(p);
  assert.equal(b2.items.find((x) => x.id === "U-B").status, "shipped");
  assert.equal(pickNext(b2).id, "U-A");
});

test("setStatus refuses backward transition (shipped -> open)", () => {
  const b = readBacklog(fixture().p);
  assert.throws(() => setStatus(b, "U-C", "open"), /backward transition/);
});

test("setStatus throws on unknown id", () => {
  const b = readBacklog(fixture().p);
  assert.throws(() => setStatus(b, "U-NOPE", "in_progress"), /no backlog item/);
});

test("mergeItems appends new ids and updates existing forward-only without clobbering curated fields", () => {
  const b = readBacklog(fixture().p);
  const res = mergeItems(b, [
    { id: "U-NEW", rank: 5, roi: 2, title: "new one", status: "open" },
    { id: "U-A", status: "in_progress" },
    { id: "U-C", status: "open" },   // backward should NOT apply
    { id: "U-B", why: "" },          // empty why must NOT clobber curated why
  ]);
  assert.equal(res.added, 1);
  assert.ok(res.updated >= 2);
  assert.equal(b.items.find((x) => x.id === "U-NEW").title, "new one");
  assert.equal(b.items.find((x) => x.id === "U-A").status, "in_progress");
  assert.equal(b.items.find((x) => x.id === "U-C").status, "shipped");
  assert.equal(b.items.find((x) => x.id === "U-B").why, "w");
});

test("mergeItems rejects an unknown incoming status (R12, no silent orphan)", () => {
  const b = readBacklog(fixture().p);
  assert.throws(() => mergeItems(b, [{ id: "U-X", status: "in-progress" }]), /unknown status/);
});

test("mergeItems dedups two entries with the same NEW id in one batch (identity fix)", () => {
  const b = readBacklog(fixture().p);
  mergeItems(b, [
    { id: "U-DUP", title: "first" },
    { id: "U-DUP", title: "second", roi: 9 },
  ]);
  const dups = b.items.filter((x) => x.id === "U-DUP");
  // identity fix: byId stores the pushed object, so the 2nd batch entry updates the
  // SAME item instead of mutating an orphan (arm A P2). One item, 2nd fields applied.
  assert.equal(dups.length, 1, "same-id-in-batch dedups to one item");
  assert.equal(dups[0].title, "second");
  assert.equal(dups[0].roi, 9);
});

test("writeBacklog is atomic (no .tmp left behind) and preserves schemaVersion", () => {
  const { p, dir } = fixture();
  writeBacklog(readBacklog(p), p);
  assert.equal(fs.readdirSync(dir).filter((f) => f.includes(".tmp-")).length, 0);
  assert.equal(readBacklog(p).schemaVersion, "1.0.0");
});

// ---- CLI layer (real process, exit codes) ----

test("CLI claim marks in_progress and exits 0; the file reflects the claim", () => {
  const { p } = fixture();
  const r = cli(p, ["claim"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SFC-NEXT \[U-B\]/);
  assert.equal(readBacklog(p).items.find((x) => x.id === "U-B").status, "in_progress");
});

test("CLI next is read-only (does NOT claim) and exits 0", () => {
  const { p } = fixture();
  const r = cli(p, ["next"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SFC-NEXT \[U-B\]/);
  assert.equal(readBacklog(p).items.find((x) => x.id === "U-B").status, "open", "next must not mutate");
});

test("CLI claim/next exit 3 on a dry backlog", () => {
  const { p } = fixture([{ id: "Z", rank: 1, status: "shipped", title: "z", why: "w", evidence: "e" }]);
  const rClaim = cli(p, ["claim"]);
  assert.equal(rClaim.status, 3);
  assert.match(rClaim.stdout, /SFC-BACKLOG-DRY/);
  const rNext = cli(p, ["next"]);
  assert.equal(rNext.status, 3);
});

test("CLI add --json bad JSON exits 1 and writes nothing", () => {
  const { p } = fixture();
  const before = fs.readFileSync(p, "utf8");
  const r = cli(p, ["add", "--json", "{not json"]);
  assert.equal(r.status, 1);
  assert.equal(fs.readFileSync(p, "utf8"), before, "no partial write on parse failure");
});

test("CLI add --json unknown status exits 1", () => {
  const { p } = fixture();
  const r = cli(p, ["add", "--json", JSON.stringify([{ id: "U-Z", status: "bogus" }])]);
  assert.equal(r.status, 1);
});

test("CLI done marks shipped and records --commit", () => {
  const { p } = fixture();
  const r = cli(p, ["done", "U-A", "--commit", "abc1234"]);
  assert.equal(r.status, 0);
  const it = readBacklog(p).items.find((x) => x.id === "U-A");
  assert.equal(it.status, "shipped");
  assert.equal(it.commit, "abc1234");
});

test("CLI unknown command exits 2 with usage", () => {
  const { p } = fixture();
  const r = cli(p, ["frobnicate"]);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /usage:/);
});

test("CLI mutating command fails LOUD (exit 1) when the lock is held by a peer", () => {
  const { p } = fixture();
  // Fresh lock file (mtime < staleMs) that acquire cannot steal -> withExclusiveLock
  // exhausts its retry window and returns {ran:false} -> mutateBacklog throws (R12).
  fs.writeFileSync(`${p}.lock`, JSON.stringify({ pid: 999999, acquiredAt: new Date().toISOString() }));
  try {
    const r = cli(p, ["claim"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /lock busy/);
  } finally {
    fs.rmSync(`${p}.lock`, { force: true });
  }
});

test("dry claim does NOT rewrite the file (no updatedAt churn)", () => {
  const { p } = fixture([{ id: "Z", rank: 1, status: "shipped", title: "z", why: "w", evidence: "e" }]);
  const before = fs.statSync(p).mtimeMs;
  const beforeBytes = fs.readFileSync(p, "utf8");
  const r = cli(p, ["claim"]);
  assert.equal(r.status, 3);
  assert.equal(fs.readFileSync(p, "utf8"), beforeBytes, "dry claim must not rewrite the backlog");
  assert.equal(fs.statSync(p).mtimeMs, before, "mtime unchanged on dry claim");
});
