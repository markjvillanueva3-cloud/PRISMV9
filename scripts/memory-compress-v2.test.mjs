/**
 * memory-compress-v2.test.mjs — paired with scripts/memory-compress-v2.mjs.
 *
 * Test plan per state/shared/specs/UNITS/U-MEMORY-COMPRESS-V2.md:
 *   1. idempotency        — compress(compress(x)) === compress(x)
 *   2. pointer preservation — every skeleton `[name](file.md)` survives
 *   3. max line length     — every entry line ≤ cap post-compress
 *
 * Coverage floor (per comprehensive-build-enforce):
 *   happy path · ≥3 failure modes · ≥2 adversarial · ≥3 variability configs.
 *
 * Run: node --test H:/prism/scripts/memory-compress-v2.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  truncateEntry,
  compressMemory,
  extractMdLinks,
  resolveMemoryFile,
} from "./memory-compress-v2.mjs";

// ─── Fixtures ────────────────────────────────────────────────────────────

const SHORT_ENTRY =
  "- [short-slug](short-slug.md) — short description";
const LONG_DESC =
  "this is a deliberately very long description that goes on and on and includes details that belong in the per-slug file not the index pointer line so the compressor must truncate it at a word boundary while preserving the skeleton";
const LONG_ENTRY = `- [long-slug](long-slug.md) — ${LONG_DESC}`;

// 250-char skeleton (over the 200 cap) — cannot truncate without corruption.
const HUGE_SKEL =
  "- [" + "x".repeat(180) + "](huge.md) — desc";

const SAMPLE_DOC = [
  "# PRISM Project Memory",
  "## Last synced: 2026-05-19",
  "",
  "## Primary Roadmap",
  "**File:** `C:\\plans\\sleepy.md` — narrative paragraph that is NOT an entry line",
  "",
  "## Indexed memories",
  SHORT_ENTRY,
  LONG_ENTRY,
  "- [em-dash-title — with em-dash](em.md) — body has em-dashes — like — this",
  "- [empty-desc](e.md) — ",
  "",
  "## Trailer section",
  "Footer prose, no entries here.",
].join("\n");

// ─── Pure helpers ────────────────────────────────────────────────────────

test("truncateEntry: short input passes through unchanged", () => {
  const r = truncateEntry("- [a](a.md) — ", "tiny", 200);
  assert.equal(r.line, "- [a](a.md) — tiny");
  assert.equal(r.truncated, false);
});

test("truncateEntry: over-budget input cut at a word boundary + ellipsis", () => {
  const skel = "- [x](x.md) — ";
  const desc = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty";
  const r = truncateEntry(skel, desc, 60);
  assert.equal(r.truncated, true);
  assert.ok(r.line.length <= 60, `length ${r.line.length} ≤ 60`);
  assert.ok(r.line.endsWith("…"), "appends ellipsis");
  assert.ok(r.line.startsWith(skel), "skeleton preserved verbatim");
  // No dangling punctuation right before the ellipsis.
  assert.ok(!/[.,;:—-]…$/.test(r.line), "no dangling punctuation before …");
});

test("truncateEntry: skeleton overflow returns skeleton with flag (R12 — never corrupt a pointer)", () => {
  const r = truncateEntry(HUGE_SKEL + " ", "desc", 100);
  assert.equal(r.truncated, false);
  assert.equal(r.skeletonOverflow, true);
  // The skeleton survives verbatim — pointer integrity is non-negotiable.
  assert.ok(r.line.startsWith("- ["));
});

test("truncateEntry: budget ≤ skeleton.length forces skeleton-overflow path", () => {
  // skeleton length 14, desc len 50, maxLen 14 → budget = -1 → overflow path
  const r = truncateEntry("- [a](a.md) — ", "x".repeat(50), 14);
  assert.equal(r.skeletonOverflow, true);
});

// ─── compressMemory: core behaviour ─────────────────────────────────────

test("compressMemory: idempotency — compress(compress(x)) deeply equals compress(x)", () => {
  const r1 = compressMemory(SAMPLE_DOC);
  const r2 = compressMemory(r1.compressed);
  assert.equal(r2.compressed, r1.compressed, "second pass produces zero diff");
  assert.equal(r2.entriesTruncated, 0, "second pass truncates nothing");
  assert.equal(r2.changed, false, "second pass reports no change");
});

test("compressMemory: pointer preservation — every skeleton .md link survives", () => {
  const r = compressMemory(SAMPLE_DOC);
  const before = extractMdLinks(SAMPLE_DOC).filter((l) => /\.md\)$/.test(l));
  const after = extractMdLinks(r.compressed).filter((l) => /\.md\)$/.test(l));
  assert.deepEqual(after, before, "every [name](slug.md) skeleton link survives");
});

test("compressMemory: every entry line ≤ cap post-compress (excluding skeleton-overflow lines)", () => {
  const cap = 200;
  const r = compressMemory(SAMPLE_DOC, { maxLineLen: cap });
  for (const line of r.compressed.split(/\r?\n/)) {
    const m = line.match(/^(- \[.*?\]\([^)]*\) — )(.*)$/);
    if (!m) continue;
    // Skip skeleton-overflow rows — those legitimately stay over-cap per R12.
    if (m[1].length > cap) continue;
    assert.ok(line.length <= cap, `entry line ${line.length} ≤ ${cap}: "${line.slice(0, 60)}…"`);
  }
});

test("compressMemory: non-entry lines pass through verbatim (header/footer/prose)", () => {
  const r = compressMemory(SAMPLE_DOC);
  const lines = r.compressed.split(/\r?\n/);
  assert.equal(lines[0], "# PRISM Project Memory");
  assert.equal(lines[2], "");
  assert.equal(lines[4], "**File:** `C:\\plans\\sleepy.md` — narrative paragraph that is NOT an entry line");
  assert.ok(r.compressed.includes("## Trailer section"));
  assert.ok(r.compressed.includes("Footer prose, no entries here."));
});

test("compressMemory: em-dash inside title — anchor split picks the FIRST ' — ' AFTER ')'", () => {
  const r = compressMemory("- [foo — bar](slug.md) — body — with — em-dash", { maxLineLen: 200 });
  // The pointer should still resolve to slug.md.
  assert.match(r.compressed, /\[foo — bar\]\(slug\.md\) — /);
});

test("compressMemory: empty description line passes through (skeleton intact)", () => {
  const r = compressMemory("- [e](e.md) — ", { maxLineLen: 200 });
  assert.match(r.compressed, /\[e\]\(e\.md\) — /);
});

test("compressMemory: stats reflect work done", () => {
  const r = compressMemory(SAMPLE_DOC, { maxLineLen: 80 });
  assert.ok(r.entriesSeen >= 4, "saw all 4 sample entries");
  assert.ok(r.entriesTruncated >= 1, "truncated at least the long one");
  assert.ok(r.compressedBytes <= r.originalBytes, "bytes do not grow");
});

// ─── Failure modes ──────────────────────────────────────────────────────

test("compressMemory: empty string input — no entries, no change", () => {
  const r = compressMemory("");
  assert.equal(r.compressed, "");
  assert.equal(r.entriesSeen, 0);
  assert.equal(r.changed, false);
});

test("compressMemory: document with only header/footer (no entries) — unchanged", () => {
  const text = "# header\n\nbody prose\n\n## footer\n";
  const r = compressMemory(text);
  assert.equal(r.compressed, text);
  assert.equal(r.entriesSeen, 0);
  assert.equal(r.changed, false);
});

test("compressMemory: CRLF line endings preserved", () => {
  const crlf = "# Title\r\n\r\n## Indexed memories\r\n" + SHORT_ENTRY + "\r\n";
  const r = compressMemory(crlf);
  assert.ok(r.compressed.includes("\r\n"), "CRLF preserved");
  assert.equal(r.compressed.split(/\r?\n/).length, crlf.split(/\r?\n/).length);
});

test("compressMemory: skeleton-overflow line keeps the skeleton, counts in stats", () => {
  const text = HUGE_SKEL + "\n" + SHORT_ENTRY;
  const r = compressMemory(text, { maxLineLen: 100 });
  assert.equal(r.skeletonOverflow, 1, "stat counts the overflow");
  assert.ok(r.compressed.split("\n")[0].startsWith("- ["), "skeleton intact on overflow line");
});

// ─── Adversarial inputs ─────────────────────────────────────────────────

test("compressMemory: single huge entry (10KB description) compresses without crash", () => {
  const huge = "- [big](big.md) — " + "word ".repeat(2000); // ~10KB
  const r = compressMemory(huge, { maxLineLen: 200 });
  assert.ok(r.compressedBytes < r.originalBytes, "shrinks");
  assert.ok(r.compressed.length <= 220, "result line is bounded");
  assert.ok(r.compressed.includes("[big](big.md)"), "pointer survives");
});

test("compressMemory: 10,000 entries — completes in reasonable bytes, no pointer drop", () => {
  const many = Array.from({ length: 10000 }, (_, i) =>
    `- [e${i}](e${i}.md) — ${"detail ".repeat(40)}`).join("\n");
  const r = compressMemory(many, { maxLineLen: 200 });
  const links = extractMdLinks(r.compressed).filter((l) => /\.md\)$/.test(l));
  assert.equal(links.length, 10000, "every pointer survives");
  assert.ok(r.entriesTruncated === 10000, "every entry truncated");
});

test("compressMemory: malformed entry lines (broken brackets) pass through unchanged", () => {
  const text = "- broken entry no brackets\n- [unclosed link description";
  const r = compressMemory(text);
  assert.equal(r.compressed, text);
  assert.equal(r.entriesSeen, 0);
});

test("compressMemory: max line len = 0 forces skeleton-overflow on every entry (no infinite-loop)", () => {
  const r = compressMemory(SAMPLE_DOC, { maxLineLen: 0 });
  // Every parsable entry should land in skeletonOverflow (budget ≤ 0).
  assert.ok(r.skeletonOverflow >= r.entriesSeen - 1, "every entry overflows at cap 0");
});

// ─── Variability: 3+ cap configurations ─────────────────────────────────

test("compressMemory: cap=200 (default) leaves SHORT_ENTRY untouched", () => {
  const r = compressMemory(SHORT_ENTRY, { maxLineLen: 200 });
  assert.equal(r.compressed, SHORT_ENTRY);
  assert.equal(r.entriesTruncated, 0);
});

test("compressMemory: cap=80 truncates LONG_ENTRY", () => {
  const r = compressMemory(LONG_ENTRY, { maxLineLen: 80 });
  assert.equal(r.entriesTruncated, 1);
  assert.ok(r.compressed.length <= 80);
});

test("compressMemory: cap=300 leaves LONG_ENTRY untouched", () => {
  const r = compressMemory(LONG_ENTRY, { maxLineLen: 300 });
  assert.equal(r.compressed, LONG_ENTRY);
  assert.equal(r.entriesTruncated, 0);
});

// ─── extractMdLinks ─────────────────────────────────────────────────────

test("extractMdLinks: catches inline + skeleton links", () => {
  const t = "see [doc](doc.md) and [wiki](wiki/page.md) and an [external](https://x.com)";
  const links = extractMdLinks(t);
  assert.equal(links.length, 3);
  assert.ok(links.some((l) => l.includes("doc.md")));
  assert.ok(links.some((l) => l.includes("https://x.com")));
});

test("extractMdLinks: no links → empty array (not undefined)", () => {
  assert.deepEqual(extractMdLinks("plain prose with no links"), []);
});

// ─── resolveMemoryFile ──────────────────────────────────────────────────

test("resolveMemoryFile: PRISM_AUTO_MEMORY_FILE override wins when file exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "memcompv2-"));
  const p = join(dir, "MEMORY.md");
  writeFileSync(p, "# fake\n");
  try {
    const got = resolveMemoryFile({ PRISM_AUTO_MEMORY_FILE: p }, "/no/such/home");
    assert.equal(got, p);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("resolveMemoryFile: missing override falls through to first candidate (predictable)", () => {
  const got = resolveMemoryFile({ PRISM_AUTO_MEMORY_FILE: "/definitely/not/there" }, "/fake/home");
  // Just assert the contract: returns a defined string under the fake home.
  assert.equal(typeof got, "string");
  assert.ok(got.length > 0);
});

// ─── Live-file regression (only if the real MEMORY.md is present) ────────

test("live MEMORY.md (if present): compressing it preserves every skeleton pointer + file is unmodified on disk", () => {
  const live = resolveMemoryFile();
  let text, mtimeBefore;
  try {
    text = readFileSync(live, "utf8");
    mtimeBefore = statSync(live).mtimeMs;
  } catch { return; /* skip if absent */ }
  const r = compressMemory(text);
  const before = extractMdLinks(text).filter((l) => /\.md\)$/.test(l));
  const after = extractMdLinks(r.compressed).filter((l) => /\.md\)$/.test(l));
  // assert.deepEqual under node:assert/strict IS deepStrictEqual — array order
  // is enforced, so a swap of two adjacent slugs FAILS the assertion. Pins
  // pointer survival structurally, not by count.
  assert.deepEqual(after, before, "live MEMORY.md skeleton pointers intact (structural, order-preserving)");
  // Compressing again must produce zero diff (idempotency on the real file).
  const r2 = compressMemory(r.compressed);
  assert.equal(r2.compressed, r.compressed);
  // Defense-in-depth (per per-file scrutiny Reviewer-B): a future refactor that
  // makes compressMemory non-pure (e.g. silently logging to the file) must FAIL
  // this assertion. Today compressMemory is read-only; this pins that invariant.
  const mtimeAfter = statSync(live).mtimeMs;
  assert.equal(mtimeAfter, mtimeBefore, "compressMemory must not mutate the file on disk");
});
