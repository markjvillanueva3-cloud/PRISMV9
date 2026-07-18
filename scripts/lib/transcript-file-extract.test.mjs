#!/usr/bin/env node
/**
 * Tests for transcript-file-extract.mjs (CAD-LEARNING-AI/U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN).
 * Reference-value + algebraic-invariant asserts (R9): every test fails if the
 * parse/dispatch/extract intent regresses. Run: node scripts/lib/transcript-file-extract.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSrt,
  transcriptFormat,
  parseTranscriptText,
  extractTranscriptFile,
  MIN_TRANSCRIPT_CHARS,
} from "./transcript-file-extract.mjs";

// ---- parseSrt: reference cases ------------------------------------------------

test("parseSrt parses a 2-cue block to correct text + comma-ms seconds", () => {
  const srt = "1\n00:00:01,000 --> 00:00:04,000\nHello world\n\n2\n00:00:04,000 --> 00:00:07,500\nSecond line here\n";
  const r = parseSrt(srt);
  assert.equal(r.segments.length, 2);
  assert.equal(r.segments[0].text, "Hello world");
  assert.equal(r.segments[0].start, 1);
  assert.equal(r.segments[0].end, 4);
  assert.equal(r.segments[1].text, "Second line here");
  assert.equal(r.segments[1].end, 7.5); // comma-ms 07,500 -> 7.5s
  assert.equal(r.full_text, "Hello world Second line here");
  assert.equal(r.duration_seconds, 7.5);
});

test("parseSrt joins multi-line cue text with a space", () => {
  const srt = "1\n00:00:01,000 --> 00:00:05,000\nLine one\nLine two\n";
  assert.equal(parseSrt(srt).segments[0].text, "Line one Line two");
});

test("parseSrt tolerates a missing index line (timestamp on line 0)", () => {
  const srt = "00:00:01,000 --> 00:00:02,000\nNo index line\n";
  const r = parseSrt(srt);
  assert.equal(r.segments.length, 1);
  assert.equal(r.segments[0].text, "No index line");
});

test("parseSrt strips HTML/ASS styling + decodes entities", () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,000\n{\\an8}<i>Italic</i> and <font color="red">red</font> &amp; more\n';
  assert.equal(parseSrt(srt).segments[0].text, "Italic and red & more");
});

test("parseSrt de-dupes consecutive identical captions and extends end", () => {
  const srt = "1\n00:00:01,000 --> 00:00:02,000\nSame caption\n\n2\n00:00:02,000 --> 00:00:03,000\nSame caption\n";
  const r = parseSrt(srt);
  assert.equal(r.segments.length, 1);
  assert.equal(r.segments[0].text, "Same caption");
  assert.equal(r.segments[0].end, 3); // end extended over the merged dup
});

test("parseSrt returns empty shape for null/empty/non-string", () => {
  for (const bad of [null, undefined, "", 42, {}]) {
    const r = parseSrt(bad);
    assert.equal(r.full_text, "");
    assert.deepEqual(r.segments, []);
  }
});

test("parseSrt yields zero segments for a block with no timestamp", () => {
  assert.equal(parseSrt("just\nsome\nprose\nno timestamps here").segments.length, 0);
});

test("parseSrt handles CRLF line endings + a leading BOM", () => {
  const srt = "﻿1\r\n00:00:01,000 --> 00:00:02,000\r\nCRLF caption\r\n";
  assert.equal(parseSrt(srt).segments[0].text, "CRLF caption");
});

// ---- transcriptFormat ---------------------------------------------------------

test("transcriptFormat lower-cases the extension, handles no-ext/null", () => {
  assert.equal(transcriptFormat("/a/b.VTT"), "vtt");
  assert.equal(transcriptFormat("x.srt"), "srt");
  assert.equal(transcriptFormat("/dir/name.with.dots.SRT"), "srt");
  assert.equal(transcriptFormat("noext"), "");
  assert.equal(transcriptFormat(null), "");
});

// ---- parseTranscriptText: dispatch -------------------------------------------

test("parseTranscriptText routes vtt -> parseVtt, srt -> parseSrt, else null", () => {
  const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nVTT caption text\n";
  const v = parseTranscriptText(vtt, "vtt");
  assert.equal(v.segments[0].text, "VTT caption text");
  const s = parseTranscriptText("1\n00:00:01,000 --> 00:00:02,000\nSRT caption\n", "srt");
  assert.equal(s.segments[0].text, "SRT caption");
  assert.equal(parseTranscriptText("whatever", "txt"), null);
});

// ---- extractTranscriptFile: row-shape + failure modes ------------------------

/** Build an SRT whose full_text exceeds `chars` using DISTINCT cues (dedup-safe). */
function longSrt(chars) {
  let out = "";
  let i = 0;
  let textLen = 0;
  while (textLen < chars) {
    const line = `Lecture point number ${i} about numerical methods`;
    out += `${i + 1}\n00:0${i % 9}:0${i % 9},000 --> 00:0${i % 9}:0${(i % 9) + 1},000\n${line}\n\n`;
    textLen += line.length + 1;
    i++;
  }
  return out;
}

test("extractTranscriptFile returns ok row in PDF-extractor shape for a real SRT", () => {
  const raw = longSrt(MIN_TRANSCRIPT_CHARS + 50);
  const row = extractTranscriptFile("/x/MIT COURSES/10.34/lec.srt", { readFileImpl: () => raw });
  assert.equal(row.ok, true);
  assert.equal(row.path, "/x/MIT COURSES/10.34/lec.srt");
  assert.equal(row.format, "srt");
  assert.ok(row.chars >= MIN_TRANSCRIPT_CHARS, `chars ${row.chars} >= ${MIN_TRANSCRIPT_CHARS}`);
  assert.equal(row.chars, row.text.length); // chars == text length (invariant)
  assert.ok(row.segments > 0);
  assert.equal(row.reason, undefined);
});

test("extractTranscriptFile handles a VTT file via the format dispatch", () => {
  const vtt = "WEBVTT\n\n" + Array.from({ length: 20 }, (_, i) =>
    `00:00:${String(i).padStart(2, "0")}.000 --> 00:00:${String(i + 1).padStart(2, "0")}.000\nDifferential equations lecture segment ${i}`
  ).join("\n\n") + "\n";
  const row = extractTranscriptFile("/x/18.03/lec.vtt", { readFileImpl: () => vtt });
  assert.equal(row.ok, true);
  assert.equal(row.format, "vtt");
  assert.ok(row.text.includes("Differential equations lecture segment 0"));
});

test("extractTranscriptFile -> ok:false for an unsupported extension", () => {
  const row = extractTranscriptFile("/x/notes.txt", { readFileImpl: () => "irrelevant" });
  assert.equal(row.ok, false);
  assert.match(row.reason, /unsupported format: txt/);
});

test("extractTranscriptFile -> ok:false when read throws (fail-soft, no throw)", () => {
  const row = extractTranscriptFile("/x/missing.srt", { readFileImpl: () => { throw new Error("ENOENT"); } });
  assert.equal(row.ok, false);
  assert.match(row.reason, /read failed: ENOENT/);
});

test("extractTranscriptFile -> ok:false below min-chars (title-card track skipped)", () => {
  const tiny = "1\n00:00:01,000 --> 00:00:02,000\nIntro\n";
  const row = extractTranscriptFile("/x/intro.srt", { readFileImpl: () => tiny });
  assert.equal(row.ok, false);
  assert.match(row.reason, /below min-chars/);
  assert.ok(row.chars < MIN_TRANSCRIPT_CHARS);
});

test("extractTranscriptFile -> ok:false when no cues parse", () => {
  const row = extractTranscriptFile("/x/empty.vtt", { readFileImpl: () => "WEBVTT\n\n(no cues)\n" });
  assert.equal(row.ok, false);
  assert.match(row.reason, /no caption cues parsed/);
});

test("extractTranscriptFile respects a custom minChars override", () => {
  const tiny = "1\n00:00:01,000 --> 00:00:02,000\nShort caption here\n";
  const row = extractTranscriptFile("/x/s.srt", { readFileImpl: () => tiny, minChars: 5 });
  assert.equal(row.ok, true);
});
