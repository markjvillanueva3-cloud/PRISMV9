// scripts/galaxy-completeness-audit.test.mjs
// R9 tests for the galaxy-completeness audit — the fleet's scoring AUTHORITY.
// Locks the three defects the 2026-06-09 conflicts/gaps audit found:
//   1. synthesis-freshness blindness (gate reported 34/34 while synth lagged MEMORY)
//   2. keyword bleed (dormant-data scored 103/104 cross-galaxy generic tokens)
//   3. node_* auto-gen filter asymmetry (mem-only; now all axes)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFmGalaxy, fileCountsForGalaxy, isSynthesisFresh } from "./galaxy-completeness-audit.mjs";

test("isSynthesisFresh FIRES (false) when synthesis is older than MEMORY.md", () => {
  // The verifier's named requirement: stale synthesis must fail the freshness check.
  assert.equal(isSynthesisFresh(1000, 2000), false, "older synth must be stale");
});
test("isSynthesisFresh passes when synthesis is newer or equal", () => {
  assert.equal(isSynthesisFresh(2000, 1000), true, "newer synth is fresh");
  assert.equal(isSynthesisFresh(1500, 1500), true, "equal mtime is fresh (not stale)");
});
test("isSynthesisFresh is fail-closed on non-finite mtimes", () => {
  assert.equal(isSynthesisFresh(NaN, 1000), false);
  assert.equal(isSynthesisFresh(1000, undefined), false);
});

test("fileCountsForGalaxy: generic cross-galaxy keyword no longer bleeds (the 103/104 fix)", () => {
  // dormant-data KW was reverted to the specific set — an `unwired`-named file from
  // another galaxy must NOT count toward dormant-data anymore.
  const dormantKw = ["dormant", "dormant-engine", "orphan-data", "orphan-engine"];
  assert.equal(
    fileCountsForGalaxy({ basename: "system-viz-g4-unwired-edges.md", fmTag: null, galaxy: "dormant-data", slot: "victor", kws: dormantKw }),
    false, "an unwired-named system-viz file must not count for dormant-data");
  // but a genuinely dormant-named file still counts via the curated keyword
  assert.equal(
    fileCountsForGalaxy({ basename: "dormant-engine-cleanup.md", fmTag: null, galaxy: "dormant-data", slot: "victor", kws: dormantKw }),
    true, "a dormant-engine-named file still counts");
});

test("fileCountsForGalaxy: frontmatter galaxy tag is authoritative + hyphen/underscore tolerant", () => {
  // tag match counts regardless of filename
  assert.equal(
    fileCountsForGalaxy({ basename: "anything.md", fmTag: "shop-floor", galaxy: "shop-floor", slot: null, kws: ["adaptive"] }),
    true, "frontmatter tag match counts");
  // underscore tag vs hyphen galaxy normalizes
  assert.equal(
    fileCountsForGalaxy({ basename: "anything.md", fmTag: "shop_floor", galaxy: "shop-floor", slot: null, kws: ["adaptive"] }),
    true, "shop_floor tag matches shop-floor galaxy");
  // wrong tag + no keyword + no slot key → no count
  assert.equal(
    fileCountsForGalaxy({ basename: "anything.md", fmTag: "cad", galaxy: "shop-floor", slot: null, kws: ["adaptive"] }),
    false, "a cad-tagged file does not count for shop-floor");
});

test("fileCountsForGalaxy: node_* auto-gen excluded on ALL axes even with a matching tag", () => {
  assert.equal(
    fileCountsForGalaxy({ basename: "node_dormant_x.md", fmTag: "dormant-data", galaxy: "dormant-data", slot: "victor", kws: ["dormant"], allowSlotKey: true }),
    false, "auto-gen node_* file never counts (filter asymmetry fix)");
});

test("fileCountsForGalaxy: slot-key only counts when allowSlotKey is set (mem axis)", () => {
  const args = { basename: "reference_victor_x.md", fmTag: null, galaxy: "dormant-data", slot: "victor", kws: ["dormant"] };
  assert.equal(fileCountsForGalaxy({ ...args, allowSlotKey: true }), true, "slot-keyed mem file counts on mem axis");
  assert.equal(fileCountsForGalaxy({ ...args, allowSlotKey: false }), false, "slot-keyed file does NOT count on wiki/tribal axes");
});

test("readFmGalaxy parses both top-level and metadata-block galaxy tags; null when absent", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gca-"));
  try {
    const top = path.join(dir, "a.md");
    fs.writeFileSync(top, "---\ngalaxy: wedm\n---\nbody");
    assert.equal(readFmGalaxy(top), "wedm");
    const block = path.join(dir, "b.md");
    fs.writeFileSync(block, "---\nname: x\nmetadata:\n  galaxy: Shop-Floor\n---\nbody");
    assert.equal(readFmGalaxy(block), "shop-floor", "indented metadata galaxy tag, lowercased");
    const none = path.join(dir, "c.md");
    fs.writeFileSync(none, "---\nname: x\n---\nno tag");
    assert.equal(readFmGalaxy(none), null);
    assert.equal(readFmGalaxy(path.join(dir, "missing.md")), null, "missing file → null, not throw");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
