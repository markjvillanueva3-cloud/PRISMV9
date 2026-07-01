/**
 * youtube-free-extract.test.mjs — hermetic tests for the FREE YouTube → PRISM
 * pipeline's pure helpers.
 *
 * Run: node --test H:/prism/scripts/youtube-free-extract.test.mjs
 *
 * R9 (tests verify intent, not behavior): every case encodes a real machining
 * tribal-tip extraction concern with concrete reference values from the live
 * Dapra extraction run (2026-05-26, slot:victor) — not stubs.
 *
 * Author: slot:victor — 2026-05-26
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseVtt,
  vttTimestampToSeconds,
  chunkTranscript,
  buildExtractionPrompt,
  parseTipsFromLlm,
  tipsToKnowledgeTips,
  renderWikiEntry,
  extractVideoId,
  parseYtDlpJsonStdout,
  parseArgs,
  formatHumanSummary,
  VALID_CATEGORIES,
  DEFAULT_CHUNK_CHARS,
  MAX_TITLE_CHARS,
  MAX_BODY_CHARS,
  YOUTUBE_ID_LEN,
} from "./youtube-free-extract.mjs";

// ── vttTimestampToSeconds ─────────────────────────────────────────────────
describe("vttTimestampToSeconds", () => {
  it("parses HH:MM:SS.mmm", () => {
    assert.equal(vttTimestampToSeconds("01:02:03.456"), 3723.456);
  });
  it("parses MM:SS.mmm (no hour)", () => {
    assert.equal(vttTimestampToSeconds("02:30.000"), 150);
  });
  it("parses seconds only", () => {
    assert.equal(vttTimestampToSeconds("45.500"), 45.5);
  });
  it("returns 0 for null/empty/undefined", () => {
    assert.equal(vttTimestampToSeconds(null), 0);
    assert.equal(vttTimestampToSeconds(""), 0);
    assert.equal(vttTimestampToSeconds(undefined), 0);
  });
  it("returns 0 for non-string input", () => {
    assert.equal(vttTimestampToSeconds(123), 0);
    assert.equal(vttTimestampToSeconds({}), 0);
  });
});

// ── parseVtt ──────────────────────────────────────────────────────────────
describe("parseVtt", () => {
  it("returns empty result for empty input", () => {
    const r = parseVtt("");
    assert.deepEqual(r, { full_text: "", segments: [], language: "en", duration_seconds: 0 });
  });
  it("returns empty result for null input (no throw)", () => {
    const r = parseVtt(null);
    assert.equal(r.segments.length, 0);
  });
  it("parses a minimal YouTube-style auto-subtitle VTT", () => {
    const vtt = [
      "WEBVTT",
      "Kind: captions",
      "Language: en",
      "",
      "00:00:00.000 --> 00:00:02.500",
      "Welcome to Dapra Corporation",
      "",
      "00:00:02.500 --> 00:00:05.000",
      "Today we're showing a back-draft cutter",
      "",
    ].join("\n");
    const r = parseVtt(vtt);
    assert.equal(r.segments.length, 2);
    assert.equal(r.segments[0].text, "Welcome to Dapra Corporation");
    assert.equal(r.segments[1].text, "Today we're showing a back-draft cutter");
    assert.equal(r.duration_seconds, 5);
  });
  it("strips inline <00:00:01.234> word-timing tags (the YouTube auto-caption pattern)", () => {
    // Real YouTube auto-captions emit per-word timestamps as inline tags
    const vtt = [
      "WEBVTT",
      "",
      "00:00:00.000 --> 00:00:03.000",
      "Welcome<00:00:00.500><c> to</c><00:00:01.000><c> Dapra</c>",
      "",
    ].join("\n");
    const r = parseVtt(vtt);
    assert.equal(r.segments.length, 1);
    assert.equal(r.segments[0].text, "Welcome to Dapra");
  });
  it("de-dupes consecutive identical-text cues (YouTube overlap artifact)", () => {
    // YouTube auto-captions emit overlapping cues with the same text — when
    // the second cue starts before the first ends, we get visible duplicates.
    // The dedupe collapses these so downstream tip extraction isn't poisoned.
    const vtt = [
      "WEBVTT",
      "",
      "00:00:00.000 --> 00:00:02.000",
      "use a back draft cutter",
      "",
      "00:00:01.500 --> 00:00:03.500",
      "use a back draft cutter",
      "",
    ].join("\n");
    const r = parseVtt(vtt);
    assert.equal(r.segments.length, 1, "consecutive identical-text cues must dedupe");
    assert.equal(r.segments[0].end, 3.5, "dedupe extends end timestamp of the kept cue");
  });
  it("strips HTML entities", () => {
    const vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello &amp; goodbye\n";
    const r = parseVtt(vtt);
    assert.equal(r.segments[0].text, "Hello & goodbye");
  });
});

// ── chunkTranscript ───────────────────────────────────────────────────────
describe("chunkTranscript", () => {
  it("returns empty array for empty transcript", () => {
    assert.deepEqual(chunkTranscript({ segments: [] }), []);
    assert.deepEqual(chunkTranscript({}), []);
    assert.deepEqual(chunkTranscript(null), []);
  });
  it("packs all short segments into a single chunk under cap", () => {
    const t = {
      segments: [
        { start: 0, end: 1, text: "hello" },
        { start: 1, end: 2, text: "world" },
      ],
    };
    const chunks = chunkTranscript(t, 1000);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].text, "hello world");
    assert.equal(chunks[0].start, 0);
    assert.equal(chunks[0].end, 2);
  });
  it("splits when accumulated text exceeds the char cap", () => {
    const segments = [];
    for (let i = 0; i < 10; i++) segments.push({ start: i, end: i + 1, text: "x".repeat(50) });
    // 10 segs × 51 chars = 510 chars. cap=100 → expect 5+ chunks.
    const chunks = chunkTranscript({ segments }, 100);
    assert.ok(chunks.length >= 5, `expected ≥5 chunks, got ${chunks.length}`);
    // Every chunk's text length stays under 1.5× cap (small slop for last seg)
    for (const c of chunks) assert.ok(c.text.length <= 150);
  });
  it("uses default DEFAULT_CHUNK_CHARS when no cap given", () => {
    const segments = [{ start: 0, end: 1, text: "a".repeat(5000) }];
    const chunks = chunkTranscript({ segments });
    assert.equal(chunks.length, 1);
    // Single 5K-char segment fits in default 8K cap
    assert.ok(chunks[0].text.length === 5000);
    // Confirm the default constant is what we expect (regression sentinel)
    assert.equal(DEFAULT_CHUNK_CHARS, 8000);
  });
});

// ── buildExtractionPrompt ─────────────────────────────────────────────────
describe("buildExtractionPrompt", () => {
  it("includes the strict-JSON requirement", () => {
    const p = buildExtractionPrompt("test transcript", {});
    assert.match(p, /STRICT JSON/);
    assert.match(p, /If no real tips appear in this chunk, output \[\]/);
  });
  it("forbids invented numeric values", () => {
    // Critical for tribal tip integrity: a model must NEVER invent speeds/feeds
    // that aren't in the transcript. This is the "fail loud" R12 manifestation.
    const p = buildExtractionPrompt("test", {});
    assert.match(p, /NEVER invent numeric values/);
  });
  it("enumerates every valid category in the schema line", () => {
    const p = buildExtractionPrompt("test", {});
    for (const cat of VALID_CATEGORIES) {
      assert.match(p, new RegExp(`"${cat}"`), `prompt must list category "${cat}"`);
    }
  });
  it("embeds video metadata when provided", () => {
    const p = buildExtractionPrompt("hi", { title: "Dapra back-draft demo", channel: "DAPRA" });
    assert.match(p, /Dapra back-draft demo/);
    assert.match(p, /DAPRA/);
  });
  it("includes chunk index when batching", () => {
    const p = buildExtractionPrompt("hi", { chunkIndex: 2, chunkTotal: 5 });
    assert.match(p, /Chunk 3\/5/);
  });
});

// ── parseTipsFromLlm ──────────────────────────────────────────────────────
describe("parseTipsFromLlm", () => {
  it("returns [] for null/empty/non-string input", () => {
    assert.deepEqual(parseTipsFromLlm(null), []);
    assert.deepEqual(parseTipsFromLlm(""), []);
    assert.deepEqual(parseTipsFromLlm(123), []);
  });
  it("returns [] when no JSON array present", () => {
    assert.deepEqual(parseTipsFromLlm("no JSON here just prose"), []);
    assert.deepEqual(parseTipsFromLlm("{}"), []);
  });
  it("returns [] for malformed JSON", () => {
    assert.deepEqual(parseTipsFromLlm("[{not valid json}]"), []);
  });
  it("parses a clean tip array (the happy path)", () => {
    const llm = JSON.stringify([{
      title: "Use back-draft cutter for deep pockets",
      body: "When finishing tapered pocket walls, a back-draft tool engages a small amount of the insert.",
      category: "tooling",
      tags: ["backdraft", "deep-pocket"],
      confidence: 0.9,
      timestamp_hint: "0:30",
    }]);
    const out = parseTipsFromLlm(llm);
    assert.equal(out.length, 1);
    assert.equal(out[0].title, "Use back-draft cutter for deep pockets");
    assert.equal(out[0].category, "tooling");
    assert.equal(out[0].confidence, 0.9);
  });
  it("strips ```json markdown fences (qwen2.5-coder occasionally wraps)", () => {
    const llm = '```json\n[{"title":"Tip","body":"Body text here.","category":"setup","tags":[],"confidence":0.7}]\n```';
    const out = parseTipsFromLlm(llm);
    assert.equal(out.length, 1);
    assert.equal(out[0].category, "setup");
  });
  it("downgrades unknown category to general (defensive — model drift)", () => {
    const llm = JSON.stringify([{
      title: "T", body: "B", category: "nonsense_category", tags: [], confidence: 0.5,
    }]);
    const out = parseTipsFromLlm(llm);
    assert.equal(out[0].category, "general");
  });
  it("truncates oversized title/body to limits", () => {
    const long = "x".repeat(500);
    const llm = JSON.stringify([{
      title: long, body: long, category: "general", tags: [], confidence: 0.5,
    }]);
    const out = parseTipsFromLlm(llm);
    assert.equal(out[0].title.length, MAX_TITLE_CHARS);
    assert.equal(out[0].body.length, MAX_BODY_CHARS);
  });
  it("clamps confidence to [0, 1]", () => {
    const llm = JSON.stringify([
      { title: "T1", body: "B1", category: "general", tags: [], confidence: 2.5 },
      { title: "T2", body: "B2", category: "general", tags: [], confidence: -0.5 },
      { title: "T3", body: "B3", category: "general", tags: [], confidence: "not a number" },
    ]);
    const out = parseTipsFromLlm(llm);
    assert.equal(out[0].confidence, 1);
    assert.equal(out[1].confidence, 0.5);   // default
    assert.equal(out[2].confidence, 0.5);   // default
  });
  it("rejects entries missing title OR body (defensive)", () => {
    const llm = JSON.stringify([
      { title: "", body: "valid body", category: "general", tags: [] },
      { title: "valid title", body: "", category: "general", tags: [] },
      { title: "ok", body: "ok", category: "general", tags: [] },
    ]);
    const out = parseTipsFromLlm(llm);
    assert.equal(out.length, 1);
  });
});

// ── tipsToKnowledgeTips ───────────────────────────────────────────────────
describe("tipsToKnowledgeTips", () => {
  it("assigns sequential IDs prefixed with tk-yt-<videoId>", () => {
    const parsed = [
      { title: "T1", body: "B1", category: "tooling", tags: ["a"], confidence: 0.8, timestamp_hint: "0:30" },
      { title: "T2", body: "B2", category: "setup",   tags: ["b"], confidence: 0.6, timestamp_hint: "1:00" },
    ];
    const meta = { videoId: "abc123def45", url: "https://youtu.be/abc123def45", title: "T", channel: "C" };
    const out = tipsToKnowledgeTips(parsed, meta);
    assert.equal(out[0].id, "tk-yt-abc123def45-001");
    assert.equal(out[1].id, "tk-yt-abc123def45-002");
  });
  it("converts confidence 0-1 to 0-100 integer (KnowledgeTip schema)", () => {
    const parsed = [{ title: "T", body: "B", category: "general", tags: [], confidence: 0.85, timestamp_hint: "" }];
    const out = tipsToKnowledgeTips(parsed, { videoId: "x", url: "y" });
    assert.equal(out[0].confidence, 85);
  });
  it("injects video-learned + youtube tags + dedupes with user tags", () => {
    const parsed = [{ title: "T", body: "B", category: "general", tags: ["youtube", "custom"], confidence: 0.5, timestamp_hint: "" }];
    const out = tipsToKnowledgeTips(parsed, { videoId: "x", url: "y" });
    // Set semantics: youtube appears once even though both system + user added it
    const youtubeCount = out[0].tags.filter((t) => t === "youtube").length;
    assert.equal(youtubeCount, 1);
    assert.ok(out[0].tags.includes("video-learned"));
    assert.ok(out[0].tags.includes("custom"));
  });
  it("builds a source string carrying URL + timestamp for replay", () => {
    // The source line is the replay anchor — every tribal-tip audit MUST be
    // able to jump back to the exact moment in the source video.
    const parsed = [{ title: "T", body: "B", category: "general", tags: [], confidence: 0.5, timestamp_hint: "0:42" }];
    const meta = { videoId: "vid", url: "https://www.youtube.com/watch?v=vid" };
    const out = tipsToKnowledgeTips(parsed, meta);
    assert.match(out[0].source, /youtube:vid@0:42/);
    assert.match(out[0].source, /https:\/\/www\.youtube\.com\/watch\?v=vid/);
  });
  it("emits provenance bundle for /system-viz roost", () => {
    const parsed = [{ title: "T", body: "B", category: "general", tags: [], confidence: 0.5, timestamp_hint: "" }];
    const out = tipsToKnowledgeTips(parsed, { videoId: "x", url: "y", title: "Demo", channel: "DAPRA" });
    assert.equal(out[0].provenance.extractor, "youtube-free-extract@1.0");
    assert.equal(out[0].provenance.channel, "DAPRA");
    assert.equal(out[0].provenance.video_title, "Demo");
  });
});

// ── extractVideoId ────────────────────────────────────────────────────────
describe("extractVideoId", () => {
  it("extracts from a standard watch URL", () => {
    assert.equal(extractVideoId("https://www.youtube.com/watch?v=y2yZ-Ql6eyo"), "y2yZ-Ql6eyo");
  });
  it("extracts from a youtu.be short URL", () => {
    assert.equal(extractVideoId("https://youtu.be/y2yZ-Ql6eyo"), "y2yZ-Ql6eyo");
  });
  it("extracts from /shorts/ URL", () => {
    assert.equal(extractVideoId("https://youtube.com/shorts/y2yZ-Ql6eyo"), "y2yZ-Ql6eyo");
  });
  it("extracts from /embed/ URL", () => {
    assert.equal(extractVideoId("https://www.youtube.com/embed/y2yZ-Ql6eyo"), "y2yZ-Ql6eyo");
  });
  it("returns null for non-YouTube URLs", () => {
    assert.equal(extractVideoId("https://example.com/watch?v=abc"), null);
  });
  it("returns null for null/empty/non-string", () => {
    assert.equal(extractVideoId(null), null);
    assert.equal(extractVideoId(""), null);
    assert.equal(extractVideoId(42), null);
  });
  it("accepts a bare 11-char video id", () => {
    assert.equal(extractVideoId("y2yZ-Ql6eyo"), "y2yZ-Ql6eyo");
    assert.equal(YOUTUBE_ID_LEN, 11);  // regression sentinel
  });
  it("rejects 10/12-char strings (must be exactly 11)", () => {
    assert.equal(extractVideoId("y2yZ-Ql6ey"), null);
    assert.equal(extractVideoId("y2yZ-Ql6eyo0"), null);
  });
});

// ── parseYtDlpJsonStdout ──────────────────────────────────────────────────
describe("parseYtDlpJsonStdout", () => {
  it("returns [] for empty/null input", () => {
    assert.deepEqual(parseYtDlpJsonStdout(""), []);
    assert.deepEqual(parseYtDlpJsonStdout(null), []);
  });
  it("parses one JSON object per line", () => {
    const stdout = [
      '{"id":"abc","title":"Video A"}',
      '{"id":"def","title":"Video B"}',
    ].join("\n");
    const out = parseYtDlpJsonStdout(stdout);
    assert.equal(out.length, 2);
    assert.equal(out[0].id, "abc");
    assert.equal(out[1].title, "Video B");
  });
  it("skips non-JSON lines (yt-dlp warning prefix tolerance)", () => {
    const stdout = [
      "WARNING: stuff happened",
      '{"id":"abc","title":"A"}',
      "ERROR: skipping bad video",
      '{"id":"def","title":"B"}',
    ].join("\n");
    const out = parseYtDlpJsonStdout(stdout);
    assert.equal(out.length, 2);
    assert.equal(out[0].id, "abc");
  });
  it("skips malformed JSON gracefully", () => {
    const stdout = '{"id":"good"}\n{not valid}\n{"id":"good2"}';
    const out = parseYtDlpJsonStdout(stdout);
    assert.equal(out.length, 2);
    assert.equal(out[0].id, "good");
    assert.equal(out[1].id, "good2");
  });
});

// ── renderWikiEntry ───────────────────────────────────────────────────────
describe("renderWikiEntry", () => {
  it("emits valid frontmatter with required keys", () => {
    const tips = [{ title: "T", body: "B", category: "tooling", tags: ["a"], confidence: 90, provenance: { timestamp_hint: "0:30" } }];
    const meta = { videoId: "abc", url: "https://youtu.be/abc", title: "Demo", channel: "DAPRA" };
    const md = renderWikiEntry(tips, meta);
    assert.match(md, /^---/);
    assert.match(md, /title: "Demo"/);
    assert.match(md, /video_id: abc/);
    assert.match(md, /channel: DAPRA/);
    assert.match(md, /tip_count: 1/);
  });
  it("escapes double quotes in title (YAML safety)", () => {
    const tips = [];
    const meta = { videoId: "abc", url: "x", title: 'Sloppy "quote" title', channel: "C" };
    const md = renderWikiEntry(tips, meta);
    assert.match(md, /title: "Sloppy \\"quote\\" title"/);
  });
  it("emits a tip block per tip with category + confidence", () => {
    const tips = [
      { title: "Tip1", body: "Body 1", category: "tooling", tags: ["x"], confidence: 85, provenance: { timestamp_hint: "0:30" } },
      { title: "Tip2", body: "Body 2", category: "setup",   tags: ["y"], confidence: 70, provenance: { timestamp_hint: "1:15" } },
    ];
    const meta = { videoId: "abc", url: "x", title: "T", channel: "C" };
    const md = renderWikiEntry(tips, meta);
    assert.match(md, /### Tip 1: Tip1/);
    assert.match(md, /### Tip 2: Tip2/);
    assert.match(md, /Confidence:\*\* 85%/);
    assert.match(md, /Confidence:\*\* 70%/);
  });
  it("emits a Related wikilink block (LLM-Wiki schema)", () => {
    const md = renderWikiEntry([], { videoId: "x", url: "y", title: "T", channel: "C" });
    assert.match(md, /\[\[youtube-free-extraction\]\]/);
    assert.match(md, /\[\[tribalknowledgeengine\]\]/);
  });
});

// ── parseArgs ─────────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("errors on empty argv", () => {
    assert.ok(parseArgs([]).error);
  });
  it("accepts a bare URL with default flags", () => {
    const r = parseArgs(["https://www.youtube.com/watch?v=abc123def45"]);
    assert.equal(r.url, "https://www.youtube.com/watch?v=abc123def45");
    assert.equal(r.flags.ingest, true);
    assert.equal(r.flags.wiki, true);
  });
  it("toggles --no-ingest + --no-wiki", () => {
    const r = parseArgs(["url", "--no-ingest", "--no-wiki"]);
    assert.equal(r.flags.ingest, false);
    assert.equal(r.flags.wiki, false);
  });
  it("rejects unknown flags (fail-loud)", () => {
    const r = parseArgs(["url", "--garbage"]);
    assert.ok(r.error);
    assert.match(r.error, /unknown flag/);
  });
  it("rejects --max-chars below minimum (defensive)", () => {
    const r = parseArgs(["url", "--max-chars", "100"]);
    assert.ok(r.error);
  });
  it("accepts a ytsearch query as the URL", () => {
    const r = parseArgs(["ytsearch3:dapra machining"]);
    assert.equal(r.url, "ytsearch3:dapra machining");
  });
});

// ── formatHumanSummary ────────────────────────────────────────────────────
describe("formatHumanSummary", () => {
  it("includes a $0 cost line (FREE pipeline invariant)", () => {
    // The whole POINT of this pipeline is $0 cost. The summary MUST surface
    // this — anyone reading the run output should see immediately that no
    // paid API was hit.
    const out = formatHumanSummary({
      videos_total: 1, videos_ok: 1, videos_failed: 0,
      tips_extracted_total: 5, tips_ingested_total: 0,
      elapsed_ms: 9000, cost_usd: 0,
      results: [],
    });
    assert.match(out, /\$0\.00/);
  });
  it("surfaces per-video failures with reason", () => {
    const out = formatHumanSummary({
      videos_total: 2, videos_ok: 1, videos_failed: 1,
      tips_extracted_total: 5, tips_ingested_total: 0,
      elapsed_ms: 5000, cost_usd: 0,
      results: [
        { ok: true, videoId: "good", title: "GoodVideo", duration_s: 60,
          transcript_segments: 10, transcript_chars: 500, tipsExtracted: 5, ingested: 0,
          artifactPath: "/a", wikiPath: "/w" },
        { ok: false, videoId: "bad", error: "no English subtitles available" },
      ],
    });
    assert.match(out, /no English subtitles available/);
    assert.match(out, /good/);
  });
});

// ── U-YT-INGEST-URL-FIX regression pin (slot:zulu, 2026-06-12) ───────────────
// ingestTips() dynamic-imported the engine with a raw Windows absolute path,
// which the ESM loader REJECTS ("Received protocol 'h:'") — so the in-process
// ingest failed silently into the fallback-JSON path on EVERY run since ship
// (root-caused via promote-youtube-staged --apply: 24 videos / 262 tips were
// stranded in staging 17 days). Both import sites must stay pathToFileURL-
// wrapped; this source pin fails if either regresses to a raw resolve().
describe("ingestTips engine import (Windows ESM loader)", () => {
  it("wraps BOTH dynamic-import sites in pathToFileURL (raw absolute path = silent fallback on Windows)", () => {
    const src = readFileSync(new URL("./youtube-free-extract.mjs", import.meta.url), "utf8");
    const wrapped = src.match(/await import\(pathToFileURL\(resolve\(/g) || [];
    assert.equal(wrapped.length, 2, "dist + src import sites must both be pathToFileURL-wrapped");
    assert.equal((src.match(/await import\(resolve\(/g) || []).length, 0, "no raw-path dynamic import may remain");
  });
});
