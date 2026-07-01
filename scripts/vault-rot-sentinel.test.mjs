// Tests for scripts/vault-rot-sentinel.mjs (U-VAULT06).
// Hermetic real-FS tmp vault; age is controlled via injected `nowMs` so the
// 90-day rot threshold is exercised deterministically.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runRotScan, resolveCreatedMs } from "./vault-rot-sentinel.mjs";

const DAY = 86_400_000;

test("resolveCreatedMs: frontmatter date wins over mtime", () => {
  const ms = resolveCreatedMs("x.md", "---\nname: x\nwritten_at: 2025-01-15T00:00:00Z\n---\n", 999);
  assert.equal(ms, Date.parse("2025-01-15T00:00:00Z"));
});
test("resolveCreatedMs: filename YYYY_MM_DD used when no frontmatter date", () => {
  const ms = resolveCreatedMs("reference_thing_2025_03_20.md", "---\nname: t\n---\n", 999);
  assert.equal(ms, Date.parse("2025-03-20"));
});
test("resolveCreatedMs: falls back to mtime when no date anywhere", () => {
  assert.equal(resolveCreatedMs("plain.md", "---\nname: p\n---\nno date", 4242), 4242);
});
test("resolveCreatedMs: matches an INDENTED provenance writtenAt (mirror block)", () => {
  // The memory-mirror provenance block is indented under `provenance:` — the
  // `[ \t]*` anchor must match it, else mirror-stamped notes lose their date.
  const raw = "---\nprovenance:\n  writtenAt: 2025-02-10T08:00:00Z\n---\nbody";
  assert.equal(resolveCreatedMs("x.md", raw, 999), Date.parse("2025-02-10T08:00:00Z"));
});

function makeVault() {
  const root = mkdtempSync(join(tmpdir(), "vault-rot-"));
  const mem = join(root, "knowledge", "memories");
  const wiki = join(root, "knowledge", "wiki");
  mkdirSync(join(mem, "feedback"), { recursive: true });
  mkdirSync(join(mem, "reference"), { recursive: true });
  mkdirSync(wiki, { recursive: true });
  return { root, mem, wiki };
}

test("runRotScan: flags an old AND orphaned note as rotting", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "reference", "reference_dead.md"), "---\nname: reference_dead\n---\nnobody links me");
    const future = Date.now() + 200 * DAY; // every file looks 200 days old
    const r = runRotScan({ memoryRoot: mem, wikiRoot: wiki, nowMs: future });
    assert.equal(r.rottingCount, 1);
    assert.equal(r.rotting[0].file.endsWith("reference_dead.md"), true);
    assert.equal(r.rotting[0].inboundRefs, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runRotScan: old but REFERENCED note is NOT rotting (alias ref keeps it alive)", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "reference", "reference_alive.md"), "---\nname: reference_alive\n---\nlinked");
    // a wiki entry references it via an aliased link -> must keep it alive
    writeFileSync(join(wiki, "some-entry.md"), "see [[reference_alive|the live one]]");
    const r = runRotScan({ memoryRoot: mem, wikiRoot: wiki, nowMs: Date.now() + 200 * DAY });
    assert.equal(r.rottingCount, 0);
    assert.equal(r.orphaned, 0);
    assert.equal(r.stale, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runRotScan: young orphan is NOT rotting (below stale threshold)", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "reference", "reference_young.md"), "---\nname: reference_young\n---\nfresh orphan");
    const r = runRotScan({ memoryRoot: mem, wikiRoot: wiki, nowMs: Date.now() + 5 * DAY });
    assert.equal(r.rottingCount, 0);
    assert.equal(r.orphaned, 1); // orphaned but not stale
    assert.equal(r.stale, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runRotScan: --stale-days threshold is honored", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "reference", "reference_mid.md"), "---\nname: reference_mid\n---\norphan");
    const now = Date.now() + 60 * DAY; // ~60 days old
    assert.equal(runRotScan({ memoryRoot: mem, wikiRoot: wiki, staleDays: 90, nowMs: now }).rottingCount, 0);
    assert.equal(runRotScan({ memoryRoot: mem, wikiRoot: wiki, staleDays: 30, nowMs: now }).rottingCount, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runRotScan: index files (MEMORY.md/index.md/log.md) are never flagged", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "MEMORY.md"), "# index\nnobody links the index");
    writeFileSync(join(wiki, "index.md"), "# wiki index");
    const r = runRotScan({ memoryRoot: mem, wikiRoot: wiki, includeWiki: true, nowMs: Date.now() + 365 * DAY });
    assert.equal(r.rottingCount, 0);
    assert.equal(r.scanned, 0); // both are index files -> excluded as candidates
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runRotScan: a note referenced only by ANOTHER stale orphan still counts as linked", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "reference", "reference_hub.md"), "---\nname: reference_hub\n---\nlinks [[reference_leaf]]");
    writeFileSync(join(mem, "reference", "reference_leaf.md"), "---\nname: reference_leaf\n---\nleaf");
    const r = runRotScan({ memoryRoot: mem, wikiRoot: wiki, nowMs: Date.now() + 200 * DAY });
    // hub is orphaned+old -> rotting; leaf is referenced by hub -> NOT rotting
    const files = r.rotting.map((x) => x.file);
    assert.equal(files.some((f) => f.endsWith("reference_hub.md")), true);
    assert.equal(files.some((f) => f.endsWith("reference_leaf.md")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runRotScan: empty vault yields zero counts, never throws", () => {
  const { root, mem, wiki } = makeVault();
  try {
    const r = runRotScan({ memoryRoot: mem, wikiRoot: wiki, nowMs: Date.now() });
    assert.equal(r.scanned, 0);
    assert.equal(r.rottingCount, 0);
    assert.deepEqual(r.rotting, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runRotScan: mirror scenario — OLD authored date but FRESH mtime is still flagged rotting", () => {
  const { root, mem, wiki } = makeVault();
  try {
    // mtime is "now" (just written), but the authored date is a year ago. The
    // mtime-only sentinel would miss this; the date-aware one must catch it.
    writeFileSync(join(mem, "reference", "reference_old_authored.md"),
      "---\nname: reference_old_authored\nwritten_at: 2025-01-01T00:00:00Z\n---\nstale by date");
    const r = runRotScan({ memoryRoot: mem, wikiRoot: wiki, staleDays: 90, nowMs: Date.parse("2025-12-01") });
    assert.equal(r.rottingCount, 1);
    assert.equal(r.rotting[0].file.endsWith("reference_old_authored.md"), true);
    assert.ok(r.rotting[0].ageDays > 300);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runRotScan: missing roots are handled gracefully (no throw)", () => {
  const r = runRotScan({ memoryRoot: "H:/prism/__definitely_not_here__", wikiRoot: "H:/prism/__nope__", nowMs: Date.now() });
  assert.equal(r.scanned, 0);
  assert.equal(r.rottingCount, 0);
});
