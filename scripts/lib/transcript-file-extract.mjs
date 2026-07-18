#!/usr/bin/env node
/**
 * transcript-file-extract.mjs -- pure VTT/SRT subtitle file -> clean prose extractor.
 *
 * CAD-LEARNING-AI/U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN (slot:india 2026-06-25).
 *
 * The operator wants the /learn pipeline to "include videos and other reputable
 * sources." The MIT-OCW + college course corpus under H:/PRISM/resources ships
 * its lecture VIDEOS as on-disk caption/transcript files (.vtt / .srt) -- 351 of
 * them (236 .vtt + 115 .srt) -- but the PDF-only resources drain
 * (drain-resources-tribal.mjs walks only `*.pdf`) ignores them entirely. Those
 * transcripts ARE the video knowledge content. This lib turns one transcript file
 * into the SAME `{path, text, ok, chars}` row shape the PDF text-layer extractor
 * (scripts/lib/pdf-text-layer-extract.py) emits, so the proven downstream
 * (chunk-pdf-text-to-nodes -> generate-pdf-tribal-tips-hermes -> embed) consumes
 * it unchanged.
 *
 * REUSE (R8 -- no duplicate subtitle parser): the WebVTT parser already lives in
 * scripts/youtube-free-extract.mjs (`parseVtt`, `vttTimestampToSeconds`) and is
 * battle-tested on YouTube auto-captions. We import it verbatim. The ONLY new
 * parser here is `parseSrt` (SubRip -- a distinct format: numbered cue blocks +
 * comma-millisecond timestamps).
 *
 * Pure functions only -- no disk writes, no child processes. Fail-soft: a
 * malformed or empty file returns `{ok:false, reason}`, never throws.
 *
 * @milestone CAD-LEARNING-AI/U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { parseVtt, vttTimestampToSeconds } from "../youtube-free-extract.mjs";

// A transcript with fewer real characters than this yields no mineable knowledge
// (a title card / empty caption track). Matches the PDF extractor's --min-chars 200.
export const MIN_TRANSCRIPT_CHARS = 200;
// Debug-CLI: how much extracted text to echo in the inspection print.
const CLI_PREVIEW_CHARS = 240;

/**
 * Parse a SubRip (.srt) subtitle file into the SAME shape as parseVtt:
 *   { full_text, segments:[{start,end,text}], language, duration_seconds }
 *
 * SRT structure (blocks separated by a blank line):
 *   1
 *   00:00:01,000 --> 00:00:04,000
 *   Caption line one
 *   Caption line two
 *
 * Differences from VTT handled here: an optional leading numeric index line, and
 * COMMA-millisecond timestamps (`00:00:01,000`) vs VTT's dot. We normalize the
 * comma to a dot and reuse `vttTimestampToSeconds` (R8) so both formats share one
 * time parser. Inline styling (`<i>`, `<font ...>`, ASS `{\...}` overrides) and
 * HTML entities are stripped, mirroring parseVtt's cleaning. Pure.
 *
 * @param {string} srtText raw .srt file content
 * @returns {{full_text:string, segments:Array<{start:number,end:number,text:string}>, language:string, duration_seconds:number}}
 */
export function parseSrt(srtText) {
  if (!srtText || typeof srtText !== "string") {
    return { full_text: "", segments: [], language: "en", duration_seconds: 0 };
  }
  const normalized = srtText.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Blocks are separated by one or more blank lines.
  const blocks = normalized.split(/\n[ \t]*\n/);
  const segments = [];
  // SRT comma-ms timestamp: 00:00:01,000 --> 00:00:04,000 (tolerate trailing cue settings).
  const tsRe = /(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/;
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trimEnd());
    // Find the timestamp line (it may be line 0 if the index line is absent, or
    // line 1 after a numeric index). Scan -- never assume a fixed offset.
    let tsIdx = -1;
    let m = null;
    for (let i = 0; i < lines.length; i++) {
      const mm = tsRe.exec(lines[i]);
      if (mm) { tsIdx = i; m = mm; break; }
    }
    if (tsIdx === -1 || !m) continue; // no timestamp -> not a cue block, skip
    const start = vttTimestampToSeconds(m[1].replace(",", "."));
    const end = vttTimestampToSeconds(m[2].replace(",", "."));
    const textLines = lines.slice(tsIdx + 1).filter((l) => l.trim() !== "");
    const cleaned = textLines
      .join(" ")
      .replace(/\{\\[^}]*\}/g, "")                      // ASS/SSA inline overrides {\an8}
      .replace(/<\/?[^>]+>/g, "")                        // <i>, <font ...>, any HTML/styling
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) segments.push({ start, end, text: cleaned });
  }
  // De-dupe consecutive identical-text segments (mirrors parseVtt -- some SRT
  // exports repeat a held caption across cues).
  const deduped = [];
  for (const seg of segments) {
    const last = deduped[deduped.length - 1];
    if (last && last.text === seg.text) { last.end = seg.end; continue; }
    deduped.push({ ...seg });
  }
  const fullText = deduped.map((s) => s.text).join(" ");
  const duration = deduped.length ? deduped[deduped.length - 1].end : 0;
  return { full_text: fullText, segments: deduped, language: "en", duration_seconds: duration };
}

/** Lower-cased extension WITHOUT the dot, or "" -- e.g. "/a/b.VTT" -> "vtt". Pure. */
export function transcriptFormat(p) {
  const m = /\.([a-z0-9]+)$/i.exec(String(p || ""));
  return m ? m[1].toLowerCase() : "";
}

/**
 * Parse raw transcript text by format. Returns the parser's shape (parseVtt's)
 * or null for an unsupported format. Pure -- dispatches on the explicit `format`
 * arg (caller resolves it from the filename), never sniffs content.
 * @param {string} raw  file contents
 * @param {string} format  "vtt" | "srt"
 */
export function parseTranscriptText(raw, format) {
  if (format === "vtt") return parseVtt(raw);
  if (format === "srt") return parseSrt(raw);
  return null;
}

/**
 * Read one local transcript file and return a row in the EXACT shape the PDF
 * text-layer extractor emits, so chunk-pdf-text-to-nodes.mjs::rowToNodes consumes
 * it with zero changes: `{ path, text, ok, chars, format, segments, reason }`.
 *
 * `ok` is false (with a `reason`) when the file is unreadable, the format is
 * unsupported, or the cleaned transcript is below MIN_TRANSCRIPT_CHARS -- so a
 * caption-less title-card track is skipped rather than producing an empty node.
 * Fail-soft: never throws.
 *
 * @param {string} absPath absolute path to a .vtt/.srt file
 * @param {{minChars?:number, readFileImpl?:(p:string)=>string}} [opts]
 * @returns {{path:string, text:string, ok:boolean, chars:number, format:string, segments:number, reason?:string}}
 */
export function extractTranscriptFile(absPath, opts = {}) {
  const minChars = Number.isFinite(opts.minChars) ? opts.minChars : MIN_TRANSCRIPT_CHARS;
  const readImpl = opts.readFileImpl || ((p) => fs.readFileSync(p, "utf8"));
  const format = transcriptFormat(absPath);
  const base = { path: absPath, text: "", ok: false, chars: 0, format, segments: 0 };
  if (format !== "vtt" && format !== "srt") {
    return { ...base, reason: `unsupported format: ${format || "(none)"}` };
  }
  let raw;
  try { raw = readImpl(absPath); }
  catch (e) { return { ...base, reason: `read failed: ${e && e.message ? e.message : e}` }; }
  const parsed = parseTranscriptText(raw, format);
  if (!parsed || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
    return { ...base, reason: "no caption cues parsed" };
  }
  const text = String(parsed.full_text || "").trim();
  if (text.length < minChars) {
    return { ...base, text, chars: text.length, segments: parsed.segments.length, reason: `below min-chars (${text.length} < ${minChars})` };
  }
  return { path: absPath, text, ok: true, chars: text.length, format, segments: parsed.segments.length };
}

// CLI: print one file's extracted JSON row (debug/inspection only).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const p = process.argv[2];
  if (!p) { console.error("usage: transcript-file-extract.mjs <file.vtt|file.srt>"); process.exit(2); }
  const row = extractTranscriptFile(p);
  const preview = row.text.slice(0, CLI_PREVIEW_CHARS) + (row.text.length > CLI_PREVIEW_CHARS ? "..." : "");
  console.log(JSON.stringify({ ...row, text: preview }, null, 2));
}
