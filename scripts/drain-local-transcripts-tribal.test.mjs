#!/usr/bin/env node
/**
 * Tests for drain-local-transcripts-tribal.mjs (CAD-LEARNING-AI/U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN).
 * Pure-fn coverage: enumeration (real temp-dir walk), domain resolution, candidate
 * ordering, cursor-aware pickNext, run-lock pid probe. Reference-value asserts (R9).
 * Run: node scripts/drain-local-transcripts-tribal.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  walkTranscripts,
  transcriptDomain,
  buildCandidates,
  pickNext,
  pidAlive,
} from "./drain-local-transcripts-tribal.mjs";

// Deterministic temp dir (pid-keyed, no Date/random) for the walk test.
const TMP = path.join(os.tmpdir(), `prism-transcript-drain-test-${process.pid}`);

function makeTree() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(path.join(TMP, "course"), { recursive: true });
  fs.mkdirSync(path.join(TMP, "node_modules"), { recursive: true });
  fs.mkdirSync(path.join(TMP, ".hidden"), { recursive: true });
  fs.writeFileSync(path.join(TMP, "course", "lec1.vtt"), "WEBVTT");
  fs.writeFileSync(path.join(TMP, "course", "lec2.SRT"), "1"); // case-insensitive ext
  fs.writeFileSync(path.join(TMP, "course", "notes.pdf"), "%PDF");
  fs.writeFileSync(path.join(TMP, "course", "readme.txt"), "hi");
  fs.writeFileSync(path.join(TMP, "node_modules", "skip.vtt"), "WEBVTT"); // in SKIP_DIRS
  fs.writeFileSync(path.join(TMP, ".hidden", "hidden.vtt"), "WEBVTT");    // dotdir
}

test("walkTranscripts collects only .vtt/.srt, skips skip-dirs + dotdirs + other exts", () => {
  makeTree();
  try {
    const out = [];
    walkTranscripts(TMP, out);
    const names = out.map((p) => path.basename(p)).sort();
    assert.deepEqual(names, ["lec1.vtt", "lec2.SRT"]);
    assert.ok(!out.some((p) => p.includes("node_modules")), "skip-dir excluded");
    assert.ok(!out.some((p) => p.includes(".hidden")), "dotdir excluded");
    assert.ok(!out.some((p) => /\.(pdf|txt)$/i.test(p)), "non-transcript exts excluded");
  } finally {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

test("walkTranscripts respects the max cap", () => {
  makeTree();
  try {
    const out = [];
    walkTranscripts(TMP, out, 1);
    assert.equal(out.length, 1);
  } finally {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

test("walkTranscripts returns [] for a missing dir (fail-soft, no throw)", () => {
  const out = [];
  walkTranscripts(path.join(TMP, "does-not-exist"), out);
  assert.deepEqual(out, []);
});

test("transcriptDomain: resources MIT COURSES -> training/mit-ocw (via canonical classify)", () => {
  const d = transcriptDomain("H:/prism/resources/MIT COURSES/10.34/lec.vtt", "resources");
  assert.equal(d.domain, "training");
  assert.equal(d.software, "mit-ocw");
});

test("transcriptDomain: jm-die source -> training/lecture-transcript default", () => {
  const d = transcriptDomain("H:/PRISM/JM DIE/whatever/lec.srt", "jm-die");
  assert.equal(d.domain, "training");
  assert.equal(d.software, "lecture-transcript");
});

test("buildCandidates sorts LARGER-first, deterministic abs tiebreak, attaches domain", () => {
  const found = [
    { abs: "H:/prism/resources/MIT COURSES/a.vtt", source: "resources", sizeBytes: 100 },
    { abs: "H:/prism/resources/MIT COURSES/c.srt", source: "resources", sizeBytes: 900 },
    { abs: "H:/prism/resources/MIT COURSES/b.vtt", source: "resources", sizeBytes: 100 },
  ];
  const cands = buildCandidates(found);
  assert.equal(cands[0].sizeBytes, 900);          // largest first
  assert.equal(cands[1].abs.endsWith("a.vtt"), true); // tie at 100 -> abs order a before b
  assert.equal(cands[2].abs.endsWith("b.vtt"), true);
  assert.equal(cands[0].domain, "training");      // domain attached
});

test("buildCandidates returns [] for empty input", () => {
  assert.deepEqual(buildCandidates([]), []);
});

test("pickNext skips already-attempted and caps at maxFiles", () => {
  const cands = [
    { abs: "a" }, { abs: "b" }, { abs: "c" }, { abs: "d" },
  ];
  const attempted = { b: { ok: true } };
  const got = pickNext(cands, attempted, 2);
  assert.deepEqual(got.map((c) => c.abs), ["a", "c"]); // b skipped, capped at 2
});

test("pickNext returns [] when all attempted", () => {
  const cands = [{ abs: "a" }, { abs: "b" }];
  assert.deepEqual(pickNext(cands, { a: {}, b: {} }, 5), []);
});

test("pidAlive: current pid alive, bogus/0/NaN dead", () => {
  assert.equal(pidAlive(process.pid), true);
  assert.equal(pidAlive(0), false);
  assert.equal(pidAlive(NaN), false);
  assert.equal(pidAlive(2 ** 31 - 1), false); // almost-certainly-unused high pid
});
