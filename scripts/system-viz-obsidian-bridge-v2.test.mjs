#!/usr/bin/env node
/**
 * Tests for system-viz-obsidian-bridge-v2.mjs streaming write.
 *
 * The augmentation's `augmentations` map outgrew V8's ~512MB max-string-length
 * ceiling, so JSON.stringify(out) (pretty OR compact) throws RangeError: Invalid
 * string length — the bridge had been silently failing to regenerate node.knowledge.
 * writeAugmentationStreaming emits the SAME compact JSON in bounded chunks. These
 * tests prove byte-identical round-trip + multi-flush correctness + the source guard.
 * (U-VIZ-OBSIDIAN-STREAM, 2026-05-31 sierra.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { open } from "node:fs/promises";

import { writeAugmentationStreaming, countBacklinks } from "./system-viz-obsidian-bridge-v2.mjs";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "system-viz-obsidian-bridge-v2.mjs");
const src = fs.readFileSync(SRC, "utf8");

function tmp(tag) { return path.join(os.tmpdir(), `sierra-aug-${tag}-${process.pid}-${src.length % 9973}.json`); }

test("round-trips byte-identically to JSON.parse(JSON.stringify(out))", async () => {
  const out = {
    schemaVersion: 2,
    generatedAt: "2026-05-31T00:00:00.000Z",
    scope: { nodesScanned: 3, nodesAugmented: 3 },
    totals: { wikiHits: 4, memHits: 1 },
    augmentations: {
      "eng.calc.x": { wiki: [{ path: "a.md", score: 2 }], mem: ["m1"] },
      "disp.camdispatcher": { wiki: [], mem: [] },
      "vault.mem.feedback.y": { nested: { deep: [3, 4], s: "héllo\"quote\\back" } },
    },
  };
  const f = tmp("rt");
  await writeAugmentationStreaming(f, out);
  const parsed = JSON.parse(fs.readFileSync(f, "utf8"));
  assert.deepEqual(parsed, out);
  // identical to what a (hypothetical, non-OOM) JSON.stringify would produce
  assert.equal(fs.readFileSync(f, "utf8"), JSON.stringify(out));
  fs.unlinkSync(f);
});

test("correct across MANY buffer flushes (tiny flush threshold forces chunk boundaries mid-map)", async () => {
  const augmentations = {};
  for (let i = 0; i < 80; i++) augmentations["node" + i] = { v: i, pad: "x".repeat(60), arr: [i, i + 1] };
  const out = { schemaVersion: 2, augmentations };
  const f = tmp("flush");
  await writeAugmentationStreaming(f, out, open, 64); // flush every ~64 bytes → dozens of flushes
  const parsed = JSON.parse(fs.readFileSync(f, "utf8"));
  assert.deepEqual(parsed, out);
  assert.equal(Object.keys(parsed.augmentations).length, 80);
  fs.unlinkSync(f);
});

test("empty augmentations map → valid JSON ({...,\"augmentations\":{}})", async () => {
  const out = { schemaVersion: 2, totals: { wikiHits: 0 }, augmentations: {} };
  const f = tmp("empty");
  await writeAugmentationStreaming(f, out);
  assert.deepEqual(JSON.parse(fs.readFileSync(f, "utf8")), out);
  fs.unlinkSync(f);
});

test("no key collision: a node id with quotes/specials is escaped correctly", async () => {
  const out = { schemaVersion: 2, augmentations: { 'weird"id\\x': { ok: true } } };
  const f = tmp("esc");
  await writeAugmentationStreaming(f, out);
  assert.deepEqual(JSON.parse(fs.readFileSync(f, "utf8")), out);
  fs.unlinkSync(f);
});

test("source guard: bridge uses streaming write, NOT a full-string JSON.stringify(out)", () => {
  assert.match(src, /await writeAugmentationStreaming\(OUT_PATH, out\)/,
    "bridge must call writeAugmentationStreaming for the augmentation");
  // the main write path must NOT build the whole string (pretty or compact)
  assert.doesNotMatch(src, /writeFile\(\s*OUT_PATH,\s*JSON\.stringify\(out\b/,
    "must NOT writeFile(OUT_PATH, JSON.stringify(out...)) — that hits V8's string cap");
  // main() must be guarded so importing this module doesn't trigger the graph scan
  assert.match(src, /if \(isMain\)/, "main() must be isMain-guarded for import-safety");
  // the 573MB graph must be stream-READ, not read as a >512MB utf8 string
  assert.match(src, /readGraphStreaming\(GRAPH_PATH\)/,
    "graph must be loaded via readGraphStreaming (573MB > V8 string cap)");
  assert.doesNotMatch(src, /JSON\.parse\(\s*await\s+readFile\(\s*GRAPH_PATH/,
    "must NOT JSON.parse(readFile(GRAPH_PATH,'utf8')) — that hits V8's string cap on the 573MB graph");
});

// ── Rank-6 single-walk+read refactor: no-regression on backlink counts ──────────
// The refactor (U-VIZ-OBSIDIAN-IO) threads the content the builders ALREADY read
// into countBacklinks(contents) instead of a 2nd walkMd + per-file re-read. These
// tests pin the backlink-count contract byte-exact: countBacklinks over in-memory
// content must equal the PRE-refactor "read each file then regex" path on a fixture.

// Faithful copy of the LEGACY backlink algorithm (the body of the old countBacklinks
// inner loop, operating on already-read content). matchAll is used in place of the
// global regex iterator so the reference is identical for counting (same capture
// group 1, same order, no statefulness). This is the oracle: if the threaded
// countBacklinks ever drifts from the pre-refactor behavior, this mismatch fails.
function legacyBacklinkCounts(fileContents) {
  const counts = new Map();
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const linkRe = /\[\[([^\]\n|]+?)(?:\|[^\]\n]+)?\]\]/g;
  for (const content of fileContents) {
    if (!content) continue; // old code: `if (!content) continue;`
    for (const m of String(content).matchAll(linkRe)) {
      const target = norm(m[1]);
      if (!target) continue;
      counts.set(target, (counts.get(target) || 0) + 1);
    }
  }
  return counts;
}

// A representative fixture spanning every backlink shape the real corpus carries:
// plain link, piped-display link, multiple links per line/file, repeated targets
// across files (additive), case/punctuation variants that norm() must collapse, an
// empty-content "file" (skip), a "file" with no links, and an unclosed bracket
// (must NOT match — the regex requires the closing ]]).
const WIKI_FIXTURE = [
  "# Title\nSee [[fleet-reaper]] and [[nn-graph-ms0]].",          // 2 distinct
  "Refs [[Fleet-Reaper]] again plus [[golf slot|the golf chat]].", // Fleet-Reaper→norm dup of fleet reaper; piped target = golf slot
  "",                                                              // empty wiki file → skipped
  "no links here at all, just prose with [[ an unclosed link",     // no valid match
];
const MEM_FIXTURE = [
  "## Header\nBacklink to [[fleet_reaper]] (punctuation variant) and [[NN-Graph-MS0]].", // both norm-collapse to existing
  "[[Obsidian Brain]] mention, and [[obsidian brain]] again same file.", // 2 → same norm target
  "",                                                              // empty mem file → skipped
];

test("countBacklinks: byte-exact match to the legacy re-read algorithm on a fixture", () => {
  const threaded = countBacklinks([...WIKI_FIXTURE, ...MEM_FIXTURE]);
  const legacy = legacyBacklinkCounts([...WIKI_FIXTURE, ...MEM_FIXTURE]);
  // Same key set and same count per key — the whole contract.
  assert.deepEqual(
    Object.fromEntries([...threaded].sort()),
    Object.fromEntries([...legacy].sort()),
    "threaded countBacklinks must equal the pre-refactor re-read path exactly"
  );
});

test("countBacklinks: concrete expected counts (norm collapse + additive across wiki+mem)", () => {
  const counts = countBacklinks([...WIKI_FIXTURE, ...MEM_FIXTURE]);
  // norm("fleet-reaper")="fleet reaper", "Fleet-Reaper"→same, "fleet_reaper"→same: 1+1+1 = 3
  assert.equal(counts.get("fleet reaper"), 3, "fleet reaper backlinks across 3 variants");
  // "nn-graph-ms0" + "NN-Graph-MS0" → "nn graph ms0": 1 + 1 = 2
  assert.equal(counts.get("nn graph ms0"), 2, "nn graph ms0 backlinks across wiki+mem");
  // piped link [[golf slot|...]] counts the TARGET (norm "golf slot"), display dropped
  assert.equal(counts.get("golf slot"), 1, "piped link counts the target, not the display text");
  assert.equal(counts.get("the golf chat"), undefined, "piped DISPLAY text must NOT be counted");
  // "Obsidian Brain" + "obsidian brain" → "obsidian brain": 2 (same file, additive)
  assert.equal(counts.get("obsidian brain"), 2, "repeated target within one file is additive");
  // unclosed "[[ an unclosed link" must produce no match
  assert.equal(counts.get("an unclosed link"), undefined, "unclosed [[ is not a backlink");
});

test("countBacklinks: empty/undefined content is skipped (matches old `if (!content) continue`)", () => {
  // Pure empties + undefined → empty Map (no throw). Mirrors the old per-file skip.
  assert.equal(countBacklinks(["", undefined, null]).size, 0);
  assert.equal(countBacklinks([]).size, 0);
  assert.equal(countBacklinks(undefined).size, 0, "missing contents arg degrades to empty (|| [] guard)");
  // An empty string interleaved between real files does not corrupt counts.
  const withGap = countBacklinks(["[[a]]", "", "[[a]] [[b]]"]);
  assert.equal(withGap.get("a"), 2);
  assert.equal(withGap.get("b"), 1);
});

test("countBacklinks: re-runnable — a 2nd call yields identical counts (no leaked regex state)", () => {
  const c1 = countBacklinks([...WIKI_FIXTURE, ...MEM_FIXTURE]);
  const c2 = countBacklinks([...WIKI_FIXTURE, ...MEM_FIXTURE]);
  assert.deepEqual(
    Object.fromEntries([...c1].sort()),
    Object.fromEntries([...c2].sort()),
    "two invocations must produce identical Maps (no leaked regex lastIndex state)"
  );
});

test("source guard: countBacklinks no longer re-walks/re-reads — it consumes threaded content", () => {
  // The whole Rank-6 win: countBacklinks must NOT call walkMd or safeRead anymore.
  const fnStart = src.indexOf("function countBacklinks(");
  assert.ok(fnStart >= 0, "countBacklinks must exist");
  const fnBody = src.slice(fnStart, src.indexOf("\n}", fnStart) + 2);
  assert.doesNotMatch(fnBody, /walkMd\s*\(/, "countBacklinks must NOT walkMd (single-pass: builders already walked)");
  assert.doesNotMatch(fnBody, /safeRead\s*\(/, "countBacklinks must NOT safeRead (content is threaded in)");
  assert.match(fnBody, /for\s*\(\s*const\s+content\s+of\s+contents/, "countBacklinks must iterate the threaded contents");
  // main() must thread the builders' already-read content into countBacklinks.
  assert.match(src, /countBacklinks\(\s*\[\s*\.\.\.wiki\.contents,\s*\.\.\.mem\.contents\s*\]\s*\)/,
    "main() must call countBacklinks with [...wiki.contents, ...mem.contents]");
  // Both builders must return the contents they read (so nothing is re-read).
  assert.match(src, /return \{ fileMeta, tokenToFiles, contents \}/,
    "buildWikiIndex/buildMemIndex must return their read contents for threading");
});
