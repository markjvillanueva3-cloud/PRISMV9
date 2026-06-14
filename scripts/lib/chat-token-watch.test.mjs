/**
 * chat-token-watch.test.mjs — coverage for the per-chat token-usage
 * estimator (CHAT-ORCHESTRATOR-MS0/U-CHO02).
 *
 * Hermetic + injected-IO: every test passes synthetic buffers / fake fs
 * functions, no real disk reads. Run: node --test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  findLastCompactOffsetInBuffer,
  estimateTokens,
  classifyPressure,
  readTranscriptBytes,
  readChatPressure,
  zoneToLevel,
  readSidecarPressure,
  DEFAULT_WARN_AT_TOKENS,
  DEFAULT_CRITICAL_AT_TOKENS,
  DEFAULT_BYTES_PER_TOKEN,
  FULL_LOAD_CEILING_BYTES,
  LARGE_SCAN_BUDGET_BYTES,
} from "./chat-token-watch.mjs";

// ─── findLastCompactOffsetInBuffer ──────────────────────────────────────────

test("findLastCompactOffsetInBuffer: no compact summary → returns bufStartOffset", () => {
  const buf = Buffer.from('{"role":"user","content":"hi"}\n{"role":"assistant","content":"hello"}\n', "utf8");
  assert.equal(findLastCompactOffsetInBuffer(buf, 0), 0);
  assert.equal(findLastCompactOffsetInBuffer(buf, 1000), 1000, "preserves the bufStartOffset baseline");
});

test("findLastCompactOffsetInBuffer: single compact boundary → returns offset past it", () => {
  const pre = '{"role":"user","content":"old"}\n';
  const compactLine = '{"isCompactSummary":true,"summary":"prior"}\n';
  const post = '{"role":"user","content":"new"}\n';
  const buf = Buffer.from(pre + compactLine + post, "utf8");
  const offset = findLastCompactOffsetInBuffer(buf, 0);
  // The post-compact content is `post`; offset is the start of `post`.
  assert.equal(offset, Buffer.byteLength(pre + compactLine, "utf8"));
  // Slicing the buffer at offset should give the post-compact content.
  assert.equal(buf.subarray(offset).toString("utf8"), post);
});

test("findLastCompactOffsetInBuffer: MULTIPLE boundaries → returns offset past LAST one", () => {
  const buf = Buffer.from([
    '{"isCompactSummary":true,"s":"first"}',
    '{"isCompactSummary":true,"s":"second"}',
    '{"role":"user","content":"only-this-counts"}',
  ].join("\n") + "\n", "utf8");
  const offset = findLastCompactOffsetInBuffer(buf, 0);
  assert.equal(buf.subarray(offset).toString("utf8").trim(),
    '{"role":"user","content":"only-this-counts"}');
});

test("findLastCompactOffsetInBuffer: boundary on LAST line (no trailing newline) → returns end-of-buf", () => {
  const buf = Buffer.from('{"role":"user","content":"old"}\n{"isCompactSummary":true,"s":"latest"}', "utf8");
  const offset = findLastCompactOffsetInBuffer(buf, 0);
  assert.equal(offset, buf.length, "no post-compact content yet");
});

test("findLastCompactOffsetInBuffer: empty buffer → returns bufStartOffset", () => {
  assert.equal(findLastCompactOffsetInBuffer(Buffer.alloc(0), 0), 0);
  assert.equal(findLastCompactOffsetInBuffer(Buffer.alloc(0), 999), 999);
});

test("findLastCompactOffsetInBuffer: null/undefined buffer → returns bufStartOffset", () => {
  assert.equal(findLastCompactOffsetInBuffer(null, 0), 0);
  assert.equal(findLastCompactOffsetInBuffer(undefined, 42), 42);
});

// ─── estimateTokens ─────────────────────────────────────────────────────────

test("estimateTokens: standard bytes-per-token gives floor(bytes/3.5)", () => {
  assert.equal(estimateTokens(0), 0);
  assert.equal(estimateTokens(7), 2);              // floor(7/3.5) = 2
  assert.equal(estimateTokens(3500), 1000);
  assert.equal(estimateTokens(3_290_000), Math.floor(3_290_000 / DEFAULT_BYTES_PER_TOKEN));
});

test("estimateTokens: custom bytes-per-token honoured", () => {
  assert.equal(estimateTokens(100, 4), 25);
  assert.equal(estimateTokens(100, 2), 50);
});

test("estimateTokens: invalid inputs → 0 (safe-default)", () => {
  assert.equal(estimateTokens(-1), 0);
  assert.equal(estimateTokens(NaN), 0);
  assert.equal(estimateTokens(Infinity), 0);
  assert.equal(estimateTokens(undefined), 0);
  assert.equal(estimateTokens(1000, 0), 0);
  assert.equal(estimateTokens(1000, -1), 0);
});

// ─── classifyPressure ───────────────────────────────────────────────────────

test("classifyPressure: default thresholds — clean/warn/critical bands", () => {
  assert.equal(classifyPressure(0), "clean");
  assert.equal(classifyPressure(DEFAULT_WARN_AT_TOKENS - 1), "clean");
  assert.equal(classifyPressure(DEFAULT_WARN_AT_TOKENS), "warn",
    "boundary: exactly at warnAt → warn");
  assert.equal(classifyPressure(DEFAULT_CRITICAL_AT_TOKENS - 1), "warn");
  assert.equal(classifyPressure(DEFAULT_CRITICAL_AT_TOKENS), "critical",
    "boundary: exactly at critAt → critical");
  assert.equal(classifyPressure(2_000_000), "critical");
});

test("classifyPressure: custom thresholds honoured", () => {
  assert.equal(classifyPressure(100, 50, 200), "warn");
  assert.equal(classifyPressure(250, 50, 200), "critical");
  assert.equal(classifyPressure(40, 50, 200), "clean");
});

test("classifyPressure: mis-ordered thresholds (critAt < warnAt) → safely clamped", () => {
  // Operator misconfigured — we use max(c, w) as the effective critical
  // threshold so critical is only returned for genuinely-high values.
  const r = classifyPressure(100, 200, 100);
  // 100 < 200 (warnAt) → clean. The critAt of 100 was clamped up to 200.
  assert.equal(r, "clean");
});

test("classifyPressure: invalid token count → clean (safe-default)", () => {
  assert.equal(classifyPressure(-1), "clean");
  assert.equal(classifyPressure(NaN), "clean");
  assert.equal(classifyPressure(undefined), "clean");
});

// ─── readTranscriptBytes (mock IO) ──────────────────────────────────────────

test("readTranscriptBytes: missing file → fail-soft 0 + error reason", () => {
  const r = readTranscriptBytes("nope", {
    _io: { existsSync: () => false, statSync: () => { throw new Error("nope"); } },
  });
  assert.equal(r.totalBytes, 0);
  assert.equal(r.postCompactBytes, 0);
  assert.equal(r.found, false);
  assert.equal(r.error, "file-not-found");
});

test("readTranscriptBytes: invalid sessionId → fail-soft", () => {
  const r1 = readTranscriptBytes("", {});
  assert.equal(r1.error, "invalid-session-id");
  const r2 = readTranscriptBytes(null, {});
  assert.equal(r2.error, "invalid-session-id");
});

test("readTranscriptBytes: small file with compact boundary → reads full + finds offset", () => {
  const content = '{"role":"user","msg":"a"}\n{"isCompactSummary":true}\n{"role":"user","msg":"b"}\n';
  const buf = Buffer.from(content, "utf8");
  const r = readTranscriptBytes("test-sid", {
    _io: {
      existsSync: () => true,
      statSync: () => ({ size: buf.length }),
      readFileSync: () => buf,
    },
  });
  assert.equal(r.totalBytes, buf.length);
  assert.equal(r.found, true);
  assert.equal(r.postCompactBytes, Buffer.byteLength('{"role":"user","msg":"b"}\n', "utf8"));
});

test("readTranscriptBytes: small file with NO compact → postCompactBytes = totalBytes", () => {
  const buf = Buffer.from('{"role":"user","msg":"all-new"}\n', "utf8");
  const r = readTranscriptBytes("test-sid", {
    _io: {
      existsSync: () => true,
      statSync: () => ({ size: buf.length }),
      readFileSync: () => buf,
    },
  });
  assert.equal(r.totalBytes, buf.length);
  assert.equal(r.postCompactBytes, buf.length);
  assert.equal(r.found, false);
  assert.equal(r.lastCompactOffset, 0);
});

test("readTranscriptBytes: empty file → zero everything", () => {
  const r = readTranscriptBytes("sid", {
    _io: {
      existsSync: () => true,
      statSync: () => ({ size: 0 }),
      readFileSync: () => Buffer.alloc(0),
    },
  });
  assert.equal(r.totalBytes, 0);
  assert.equal(r.postCompactBytes, 0);
  assert.equal(r.found, false);
});

test("readTranscriptBytes: large file path uses tail-read (mock open/read)", () => {
  // Simulate a 10MB file with a compact boundary in the last 256KB tail.
  const totalSize = 10 * 1024 * 1024;
  const tailWindow = 256 * 1024;
  // Construct the tail content that should be read.
  const tailPrefix = "Z".repeat(tailWindow - 80);
  const tail = tailPrefix + '\n{"isCompactSummary":true}\n{"role":"user","msg":"recent"}\n';
  const tailBuf = Buffer.from(tail, "utf8");
  // Pad tail buffer to exact window size if needed.
  const padded = Buffer.alloc(tailWindow);
  tailBuf.copy(padded, 0, 0, Math.min(tailBuf.length, tailWindow));
  let openCalled = false, readCalled = false, closeCalled = false;
  const r = readTranscriptBytes("sid", {
    _io: {
      existsSync: () => true,
      statSync: () => ({ size: totalSize }),
      openSync: () => { openCalled = true; return 42; },
      readSync: (fd, buf, off, len) => {
        readCalled = true;
        assert.equal(fd, 42);
        padded.copy(buf, 0, 0, len);
        return len;
      },
      closeSync: () => { closeCalled = true; },
      // readFileSync should NOT be called for large files.
      readFileSync: () => { throw new Error("should not be called for large file"); },
    },
  });
  assert.ok(openCalled && readCalled && closeCalled, "tail-read path engaged");
  assert.equal(r.totalBytes, totalSize);
  assert.equal(r.found, true, "compact boundary found in tail window");
  assert.ok(r.lastCompactOffset > totalSize - tailWindow, "offset within tail window");
});

test("readTranscriptBytes: large file, boundary NOT in tail → conservatively over-estimates", () => {
  const totalSize = 10 * 1024 * 1024;
  const padded = Buffer.alloc(256 * 1024, "Z"[0].charCodeAt(0));
  const r = readTranscriptBytes("sid", {
    _io: {
      existsSync: () => true,
      statSync: () => ({ size: totalSize }),
      openSync: () => 42,
      readSync: (fd, buf, off, len) => { padded.copy(buf, 0, 0, len); return len; },
      closeSync: () => {},
    },
  });
  assert.equal(r.totalBytes, totalSize);
  assert.equal(r.postCompactBytes, totalSize, "no boundary found → over-estimate from whole file");
  assert.equal(r.found, false);
});

// ─── readChatPressure (top-level integration) ───────────────────────────────

test("readChatPressure: kill-switch env → clean+0 stub", () => {
  const r = readChatPressure("sid", { _env: { PRISM_CHAT_TOKEN_DISABLE: "1" } });
  assert.equal(r.pressureLevel, "clean");
  assert.equal(r.tokensEstimate, 0);
  assert.equal(r.error, "disabled");
});

test("readChatPressure: small clean transcript → clean", () => {
  const buf = Buffer.from("x".repeat(100), "utf8");
  const r = readChatPressure("sid", {
    slot: "alpha",
    _env: {},
    _io: {
      existsSync: () => true,
      statSync: () => ({ size: buf.length }),
      readFileSync: () => buf,
    },
  });
  assert.equal(r.slot, "alpha");
  assert.equal(r.pressureLevel, "clean");
  assert.ok(r.tokensEstimate < 100, "tiny transcript → tiny token estimate");
});

test("readChatPressure: large IN-WINDOW post-compact bytes → critical", () => {
  // ~3.36MB post-compact → ≈960K tokens: OVER the 940K critical threshold but UNDER the
  // 1.1M suspect cap, so it is a GENUINE in-window critical (not transcript-bloat). A
  // fixture ≥ ~3.85MB (>1.1M tok) is now correctly SUSPECT → warn (see the SUSPECT tests).
  const size = 3_360_000;
  const buf = Buffer.alloc(size, "x".charCodeAt(0));
  const r = readChatPressure("sid", {
    _env: {},
    _io: {
      existsSync: () => true,
      statSync: () => ({ size }),
      readFileSync: () => buf,
    },
  });
  assert.equal(r.pressureLevel, "critical");
  assert.ok(r.tokensEstimate > DEFAULT_CRITICAL_AT_TOKENS);
});

test("readChatPressure: env thresholds honoured", () => {
  const buf = Buffer.alloc(1000, "x".charCodeAt(0));  // ~286 tokens at default bytes/tok
  const r = readChatPressure("sid", {
    _env: { PRISM_CHAT_TOKEN_WARN_AT: "100", PRISM_CHAT_TOKEN_CRITICAL_AT: "200" },
    _io: {
      existsSync: () => true,
      statSync: () => ({ size: buf.length }),
      readFileSync: () => buf,
    },
  });
  assert.equal(r.pressureLevel, "critical", "286 tokens > 200 crit threshold");
});

test("readChatPressure: missing file → clean (with error surfaced)", () => {
  const r = readChatPressure("sid", {
    _env: {},
    _io: { existsSync: () => false, statSync: () => { throw new Error("nope"); } },
  });
  assert.equal(r.pressureLevel, "clean");
  assert.equal(r.error, "file-not-found");
});

test("readChatPressure: result shape stable (sessionId + slot + pressure fields)", () => {
  const r = readChatPressure("test-sid-12345", {
    slot: "golf",
    _env: { PRISM_CHAT_TOKEN_DISABLE: "1" },
  });
  assert.equal(r.sessionId, "test-sid-12345");
  assert.equal(r.slot, "golf");
  assert.equal(typeof r.tokensEstimate, "number");
  assert.equal(typeof r.pressureLevel, "string");
  assert.equal(typeof r.totalBytes, "number");
  assert.equal(typeof r.postCompactBytes, "number");
  assert.equal(typeof r.found, "boolean");
});

// ─── Tier-2 escalation: the zulu-advisory dormancy fix (2026-06-09) ──────────
// The 256KB tail misses a compact marker when moderate post-compact content
// pushed it back; Tier-2 reads a bounded LARGE_SCAN_BUDGET window to find it so a
// long-but-not-huge chat is not mis-read as false-critical. These FAIL on the
// pre-fix code (which returned found=false / postCompactBytes=total here).

// Virtual transcript: `total` bytes of 'Z' filler with one marker line at an
// absolute byte offset, WITHOUT allocating the whole file. readSync fills the
// requested [position, position+len) window, overlaying the marker where it lands.
function virtualTranscriptIo(total, markerAbs, markerLine) {
  const marker = Buffer.from(markerLine, "utf8");
  return {
    existsSync: () => true,
    statSync: () => ({ size: total }),
    openSync: () => 7,
    closeSync: () => {},
    readSync: (fd, buf, off, len, position) => {
      buf.fill(0x5a, off, off + len); // 'Z'
      const wStart = position, wEnd = position + len;
      const mStart = markerAbs, mEnd = markerAbs + marker.length;
      const oStart = Math.max(mStart, wStart), oEnd = Math.min(mEnd, wEnd);
      for (let i = oStart; i < oEnd; i++) buf[off + (i - wStart)] = marker[i - mStart];
      return len;
    },
  };
}

test("readTranscriptBytes: Tier-2 finds a marker 2MB back that the 256KB tail misses", () => {
  const total = 8 * 1024 * 1024;          // > FULL_LOAD_CEILING -> large-file path
  const markerAbs = 6 * 1024 * 1024;      // 2MB from EOF -> outside the 256KB tail
  const r = readTranscriptBytes("sid", { _io: virtualTranscriptIo(total, markerAbs, '{"isCompactSummary":true}\n') });
  assert.equal(r.found, true, "Tier-2 escalation finds the marker the tail missed");
  // marker line is 26 bytes ({"isCompactSummary":true} = 25 + \n); post-compact
  // starts at the byte after that newline.
  assert.equal(r.lastCompactOffset, markerAbs + 26);
  assert.equal(r.postCompactBytes, total - (markerAbs + 26));
  assert.ok(r.postCompactBytes < total, "did NOT over-estimate from the whole file");
});

test("readTranscriptBytes: Tier-3 over-estimates when the marker is beyond LARGE_SCAN_BUDGET", () => {
  const total = LARGE_SCAN_BUDGET_BYTES + 4 * 1024 * 1024;  // 20MB
  const markerAbs = 1 * 1024 * 1024;       // 19MB from EOF -> beyond the 16MB budget
  const r = readTranscriptBytes("sid", { _io: virtualTranscriptIo(total, markerAbs, '{"isCompactSummary":true}\n') });
  assert.equal(r.found, false, "marker beyond budget -> not found");
  assert.equal(r.postCompactBytes, total, "Tier-3 over-estimate (safe direction)");
  assert.equal(r.lastCompactOffset, 0);
});

test("readTranscriptBytes: Tier-1 still wins when the marker IS in the 256KB tail (no needless escalation)", () => {
  const total = 8 * 1024 * 1024;
  const markerAbs = total - 100 * 1024;    // 100KB from EOF -> inside the 256KB tail
  let reads = 0;
  const base = virtualTranscriptIo(total, markerAbs, '{"isCompactSummary":true}\n');
  const io = { ...base, readSync: (...a) => { reads++; return base.readSync(...a); } };
  const r = readTranscriptBytes("sid", { _io: io });
  assert.equal(r.found, true);
  assert.equal(r.lastCompactOffset, markerAbs + 26);
  assert.equal(reads, 1, "only the Tier-1 256KB read, no Tier-2 escalation");
});

test("findLastCompactOffsetInBuffer: byte-accurate offset across multibyte UTF-8 (not char index)", () => {
  // 5 'e-acute' (2 bytes each) before the marker -> string char index != byte
  // offset. The byte-op impl must return the BYTE offset of post-compact start.
  const buf = Buffer.from('ééééé\n{"isCompactSummary":true}\nafter\n', "utf8");
  const needleByte = buf.lastIndexOf(Buffer.from('"isCompactSummary":true', "utf8"));
  const nlByte = buf.indexOf(0x0a, needleByte);
  const expected = nlByte + 1;                  // byte offset of 'after\n'
  assert.equal(findLastCompactOffsetInBuffer(buf, 0), expected);
  assert.equal(buf.length - expected, Buffer.byteLength("after\n", "utf8"), "post-compact = 'after' line");
});

// --- Sidecar-first pressure (the byte-estimate over-report fix, 2026-06-10) ---

test("zoneToLevel: GREEN/YELLOW/RED + aliases map to clean/warn/critical", () => {
  assert.equal(zoneToLevel("RED"), "critical");
  assert.equal(zoneToLevel("CRITICAL"), "critical");
  assert.equal(zoneToLevel("YELLOW"), "warn");
  assert.equal(zoneToLevel("WARN"), "warn");
  assert.equal(zoneToLevel("GREEN"), "clean");
  assert.equal(zoneToLevel("green"), "clean"); // case-insensitive
});

test("zoneToLevel: unknown/empty zone -> null (caller falls back, never guesses)", () => {
  assert.equal(zoneToLevel("PURPLE"), null);
  assert.equal(zoneToLevel(""), null);
  assert.equal(zoneToLevel(null), null);
  assert.equal(zoneToLevel(undefined), null);
});

const SIDECAR_FIXTURE = JSON.stringify({
  schemaVersion: "1.0.0", capturedAt: "2026-06-10T00:00:00.000Z",
  ctx: { tokens: 700230, maxTokens: 1000000, pct: 0.70023 }, zone: "YELLOW", slot: "bravo",
});
const FRESH_NOW = Date.parse("2026-06-10T00:00:30.000Z"); // 30s after capturedAt -> fresh
const sidecarIo = (json, exists = true) => ({
  existsSync: (p) => exists && String(p).includes("token-budget-"),
  readFileSync: () => json,
});

test("readSidecarPressure: fresh YELLOW sidecar -> {level:warn, source:sidecar, real tokens}", () => {
  const r = readSidecarPressure("bravo", { sidecarDir: "X", _io: sidecarIo(SIDECAR_FIXTURE), _now: FRESH_NOW });
  assert.equal(r.level, "warn");
  assert.equal(r.source, "sidecar");
  assert.equal(r.tokens, 700230);
  assert.equal(Math.round(r.pct * 100), 70);
});

test("readSidecarPressure: STALE sidecar (age > 180s) -> null (fall back)", () => {
  const stale = Date.parse("2026-06-10T01:00:00.000Z"); // 1h later
  assert.equal(readSidecarPressure("bravo", { sidecarDir: "X", _io: sidecarIo(SIDECAR_FIXTURE), _now: stale }), null);
});

test("readSidecarPressure: future capturedAt (age<0 clock skew) -> null", () => {
  const past = Date.parse("2026-06-09T00:00:00.000Z");
  assert.equal(readSidecarPressure("bravo", { sidecarDir: "X", _io: sidecarIo(SIDECAR_FIXTURE), _now: past }), null);
});

test("readSidecarPressure: missing file / unknown zone / unknown slot -> null", () => {
  assert.equal(readSidecarPressure("bravo", { sidecarDir: "X", _io: sidecarIo(SIDECAR_FIXTURE, false), _now: FRESH_NOW }), null);
  const bad = JSON.stringify({ capturedAt: "2026-06-10T00:00:00.000Z", ctx: { tokens: 1 }, zone: "MAUVE" });
  assert.equal(readSidecarPressure("bravo", { sidecarDir: "X", _io: sidecarIo(bad), _now: FRESH_NOW }), null);
  assert.equal(readSidecarPressure("unknown", { _io: sidecarIo(SIDECAR_FIXTURE), _now: FRESH_NOW }), null);
  assert.equal(readSidecarPressure("", { _io: sidecarIo(SIDECAR_FIXTURE), _now: FRESH_NOW }), null);
});

test("readChatPressure: fresh sidecar BEATS the byte-estimate (warn, not false-critical)", () => {
  // transcript readFileSync THROWS -> proves the transcript is never read when a
  // fresh sidecar is present (sidecar-first short-circuits the over-reporting path).
  const io = {
    existsSync: (p) => String(p).includes("token-budget-"),
    readFileSync: (p) => {
      if (String(p).includes("token-budget-")) return SIDECAR_FIXTURE;
      throw new Error("transcript must NOT be read when a fresh sidecar exists");
    },
  };
  const r = readChatPressure("sid", { slot: "bravo", _sidecarDir: "X", _io: io, _now: FRESH_NOW, _env: {} });
  assert.equal(r.source, "sidecar");
  assert.equal(r.pressureLevel, "warn");      // YELLOW zone -> warn (NOT byte-est critical)
  assert.equal(r.tokensEstimate, 700230);
});

test("readChatPressure: PRISM_CHAT_TOKEN_SIDECAR_DISABLE=1 -> byte-estimate fallback", () => {
  const io = { existsSync: () => false, readdirSync: () => [] }; // transcript not found
  const r = readChatPressure("sid", { slot: "bravo", _sidecarDir: "X", _io: io, _now: FRESH_NOW, _env: { PRISM_CHAT_TOKEN_SIDECAR_DISABLE: "1" } });
  assert.equal(r.source, "byte-estimate");
});

test("readChatPressure: no sidecar present -> byte-estimate path", () => {
  const io = { existsSync: () => false, readdirSync: () => [] };
  const r = readChatPressure("sid", { slot: "bravo", _sidecarDir: "X", _io: io, _now: FRESH_NOW, _env: {} });
  assert.equal(r.source, "byte-estimate");
});

// ── SUSPECT guard (U-FIBA-COMPACT-PHANTOM-FIX, slot:alpha 2026-06-11) ──────────
// A byte-estimate above the physical context ceiling (1M) is impossible as REAL
// context fill -> transcript-bloat, not pressure. It must NOT classify "critical"
// (that drives zulu CHO01 -> /compact, the operator's "chats stop constantly to
// compact" bug). It downgrades to "warn" (-> advise-only, no nudge) + flags suspect.
import { readChatPressure as _rcpSuspect } from "./chat-token-watch.mjs";

function bigBloatIo(postCompactBytes) {
  // A transcript whose post-compact span is huge (bloat) with a real compact marker
  // near the start, so readTranscriptBytes returns a large postCompactBytes.
  const total = postCompactBytes + 1024;
  return {
    statSync: () => ({ size: total }),
    existsSync: () => true,
    readFileSync: () => Buffer.from(`{"isCompactSummary":true}\n` + "x".repeat(postCompactBytes)),
    readdirSync: () => [],
  };
}

test("SUSPECT: byte-estimate above 1.1x context cap downgrades critical -> warn + suspect flag", () => {
  // ~3.9MB post-compact -> ~1.11M tokens, over the 1.1M suspect threshold but UNDER the
  // 4MB full-load ceiling (so the readFileSync mock path is exercised, not tail-read).
  const p = _rcpSuspect("aaaaaaaa-1111-2222-3333-444444444444", {
    slot: "unknown", _io: bigBloatIo(3_900_000),
    _env: { PRISM_CHAT_TOKEN_SIDECAR_DISABLE: "1" },
  });
  assert.equal(p.source, "byte-estimate");
  assert.ok(p.tokensEstimate > 1_100_000, "fixture must exceed the suspect threshold");
  assert.equal(p.suspect, true, "must flag suspect");
  assert.equal(p.pressureLevel, "warn", "must NOT be critical (would false-nudge /compact)");
});

test("SUSPECT: a byte-estimate within the cap still classifies critical (real pressure preserved)", () => {
  // ~3.3MB -> ~960K tokens: over critical (940K) but UNDER the 1.1M suspect cap.
  const p = _rcpSuspect("bbbbbbbb-1111-2222-3333-444444444444", {
    slot: "unknown", _io: bigBloatIo(3_360_000),
    _env: { PRISM_CHAT_TOKEN_SIDECAR_DISABLE: "1" },
  });
  assert.ok(p.tokensEstimate >= 940_000 && p.tokensEstimate <= 1_100_000, `got ${p.tokensEstimate}`);
  assert.notEqual(p.suspect, true, "below 1.1x cap is NOT suspect");
  assert.equal(p.pressureLevel, "critical", "genuine in-window critical must still fire");
});

test("SUSPECT: knob PRISM_CHAT_TOKEN_CONTEXT_CAP tunes the ceiling", () => {
  const p = _rcpSuspect("cccccccc-1111-2222-3333-444444444444", {
    slot: "unknown", _io: bigBloatIo(3_360_000),
    _env: { PRISM_CHAT_TOKEN_SIDECAR_DISABLE: "1", PRISM_CHAT_TOKEN_CONTEXT_CAP: "500000" },
  });
  // With a 500K cap, 960K tokens > 1.1*500K=550K -> suspect -> warn.
  assert.equal(p.suspect, true);
  assert.equal(p.pressureLevel, "warn");
});
