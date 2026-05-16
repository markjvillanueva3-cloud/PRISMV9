#!/usr/bin/env node
/**
 * Tests for voice-capture-watcher.mjs — pure-function units + injectable
 * processAudioFile path. Run: node --test scripts/voice-capture-watcher.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { slugify, renderInboxMd, processAudioFile } =
  await import("./voice-capture-watcher.mjs");

// ---------- slugify ----------

test("slugify converts to kebab-case lowercase", () => {
  assert.equal(slugify("Operator Memo 2026-05"), "operator-memo-2026-05");
});

test("slugify strips special chars", () => {
  assert.equal(slugify("memo!@#$.test"), "memotest");
});

test("slugify handles empty/null/undefined", () => {
  assert.equal(slugify(""), "voice");
  assert.equal(slugify(null), "voice");
  assert.equal(slugify(undefined), "voice");
});

test("slugify caps at 60 chars", () => {
  const long = "a".repeat(200);
  const out = slugify(long);
  assert.ok(out.length <= 60);
});

test("slugify normalizes unicode (NFKD strip)", () => {
  const out = slugify("café memo");
  assert.ok(out.includes("caf"));
  // diacritic should be normalized + stripped
  assert.ok(!/[áéíóú]/.test(out));
});

// ---------- renderInboxMd ----------

test("renderInboxMd produces frontmatter + body", () => {
  const md = renderInboxMd({
    transcript: "Operator says: tool 14 is broken.",
    sourceAudio: "C:/voice/memo1.wav",
    capturedAt: "2026-05-16T00:00:00.000Z",
  });
  assert.ok(md.startsWith("---"));
  assert.ok(md.includes("type: project"));
  assert.ok(md.includes("source: voice"));
  assert.ok(md.includes("captured_at: 2026-05-16T00:00:00.000Z"));
  assert.ok(md.includes("Operator says: tool 14 is broken."));
});

test("renderInboxMd uses default source=voice", () => {
  const md = renderInboxMd({ transcript: "hi", sourceAudio: "a.wav" });
  assert.ok(md.includes("source: voice"));
});

test("renderInboxMd handles empty transcript with placeholder", () => {
  const md = renderInboxMd({ transcript: "", sourceAudio: "a.wav" });
  assert.ok(md.includes("empty transcript"));
});

test("renderInboxMd normalizes backslash audio_path to forward slash", () => {
  const md = renderInboxMd({ transcript: "x", sourceAudio: "C:\\voice\\memo.wav" });
  assert.ok(md.includes("audio_path: C:/voice/memo.wav"));
});

test("renderInboxMd id is deterministic for same slug + capturedAt", () => {
  const a = renderInboxMd({ transcript: "x", sourceAudio: "memo.wav", capturedAt: "2026-05-16T00:00:00.000Z" });
  const b = renderInboxMd({ transcript: "y", sourceAudio: "memo.wav", capturedAt: "2026-05-16T00:00:00.000Z" });
  const idA = a.match(/name: voice-memo-([0-9a-f]+)/)[1];
  const idB = b.match(/name: voice-memo-([0-9a-f]+)/)[1];
  assert.equal(idA, idB);
});

// ---------- processAudioFile ----------

test("processAudioFile rejects unsupported extension", () => {
  const result = processAudioFile("memo.txt", {
    transcriber: () => ({ ok: true, text: "x" }),
    writeFn: () => {},
    mkdirFn: () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "unsupported-extension");
  assert.equal(result.ext, ".txt");
});

test("processAudioFile returns no-audio-path on empty input", () => {
  const result = processAudioFile("", {});
  assert.equal(result.ok, false);
  assert.equal(result.error, "no-audio-path");
});

test("processAudioFile propagates transcriber error class", () => {
  const result = processAudioFile("memo.wav", {
    transcriber: () => ({ ok: false, error: "whisper-not-installed" }),
    writeFn: () => {},
    mkdirFn: () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "whisper-not-installed");
});

test("processAudioFile writes inbox memo on success", () => {
  let writtenPath = null;
  let writtenBody = null;
  const result = processAudioFile("memo.wav", {
    inboxDir: "/test/inbox",
    transcriber: () => ({ ok: true, text: "this is a test transcript" }),
    writeFn: (p, body) => { writtenPath = p; writtenBody = body; },
    mkdirFn: () => {},
    nowIso: "2026-05-16T12:34:56.000Z",
  });
  assert.equal(result.ok, true);
  assert.ok(writtenPath.includes("voice-2026-05-16-12-34-56-memo.md"));
  assert.ok(writtenBody.includes("this is a test transcript"));
  assert.ok(result.bytes > 0);
});

test("processAudioFile accepts all canonical audio extensions", () => {
  for (const ext of [".wav", ".mp3", ".m4a", ".ogg", ".flac"]) {
    const result = processAudioFile(`memo${ext}`, {
      transcriber: () => ({ ok: true, text: "x" }),
      writeFn: () => {},
      mkdirFn: () => {},
    });
    assert.equal(result.ok, true, `expected accept of ${ext}`);
  }
});

test("processAudioFile is case-insensitive on extension", () => {
  const result = processAudioFile("MEMO.WAV", {
    transcriber: () => ({ ok: true, text: "x" }),
    writeFn: () => {},
    mkdirFn: () => {},
  });
  assert.equal(result.ok, true);
});

test("processAudioFile reports write-failed if writeFn throws", () => {
  const result = processAudioFile("memo.wav", {
    transcriber: () => ({ ok: true, text: "x" }),
    writeFn: () => { throw new Error("EACCES"); },
    mkdirFn: () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "write-failed");
});

// ---------- end-to-end smoke (real fs, temp dir) ----------

test("end-to-end: 2 fixture audio file paths produce 2 inbox memos", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-test-"));
  const inbox = path.join(tmp, "inbox");
  // We don't need real audio files — extension check passes on path even
  // if file content is bogus, because we inject the transcriber.
  const file1 = path.join(tmp, "memo1.wav");
  const file2 = path.join(tmp, "memo2.mp3");
  fs.writeFileSync(file1, "fake-audio-1");
  fs.writeFileSync(file2, "fake-audio-2");

  const result1 = processAudioFile(file1, {
    inboxDir: inbox,
    transcriber: () => ({ ok: true, text: "transcript one" }),
    nowIso: "2026-05-16T10:00:00.000Z",
  });
  const result2 = processAudioFile(file2, {
    inboxDir: inbox,
    transcriber: () => ({ ok: true, text: "transcript two" }),
    nowIso: "2026-05-16T10:01:00.000Z",
  });

  assert.equal(result1.ok, true);
  assert.equal(result2.ok, true);

  const inboxFiles = fs.readdirSync(inbox).filter((f) => f.startsWith("voice-"));
  assert.equal(inboxFiles.length, 2);

  for (const f of inboxFiles) {
    const body = fs.readFileSync(path.join(inbox, f), "utf8");
    assert.ok(body.startsWith("---"));
    assert.ok(body.includes("source: voice"));
    assert.ok(/captured_at: 2026-05-16T10:0[01]:00/.test(body));
  }

  fs.rmSync(tmp, { recursive: true, force: true });
});
