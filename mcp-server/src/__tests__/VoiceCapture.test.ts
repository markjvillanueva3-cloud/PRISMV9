/**
 * VoiceCapture.test.ts
 *
 * OBSIDIAN-INTELLIGENCE-MS3/F1/U-VOICE-CAPTURE — watcher behavior matrix.
 *
 * Exit-criterion proven here: 2 fixture .wav files produce 2 inbox .md
 * notes with valid provenance frontmatter (source/captured_at/audio_path).
 *
 * Comprehensive-build floor: happy path + ≥3 failure modes (bad
 * extension, missing file, empty file, oversize, transcription-empty) +
 * ≥2 adversarial (transcript forging `---`/`<!--` frontmatter, transcriber
 * throws, dotfile, symlink) + ≥3 spanning configs (.wav vs .mp3; string
 * vs {text} transcriber return; idempotency re-run), determinism (pinned
 * now), `_internals` units.
 *
 * The transcriber is INJECTED — the suite never touches whisper.cpp, so
 * it is hermetic + no network. Filename matches the unit's named
 * deliverable. The watcher script is a `.mjs`; vitest imports it directly.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  processAudioFile,
  buildTranscriptMarkdown,
  watchCaptureDir,
  _internals,
} from "../../../scripts/voice-capture-watcher.mjs";

const NOW = Date.UTC(2026, 4, 17, 12, 0, 0);
const NOW_ISO = "2026-05-17T12:00:00.000Z";

interface Fixture {
  dir: string;
  inbox: string;
  capture: string;
  /** Write a fake audio file (content irrelevant — transcriber is injected). */
  audio: (name: string, bytes?: number) => string;
  cleanup: () => void;
}

function makeFixture(): Fixture {
  const dir = mkdtempSync(join(tmpdir(), "prism-voice-test-"));
  const inbox = join(dir, "inbox");
  const capture = join(dir, "capture");
  mkdirSync(capture, { recursive: true }); // audio() writes here; inbox is made by the engine
  return {
    dir, inbox, capture,
    audio: (name, bytes = 64) => {
      const p = join(capture, name);
      writeFileSync(p, Buffer.alloc(bytes, 1));
      return p;
    },
    cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* swallow */ } },
  };
}

/** Parse the leading YAML-ish frontmatter block of a markdown string. */
function parseFrontmatter(md: string): Record<string, string> {
  const lines = md.split("\n");
  if (lines[0] !== "---") throw new Error("no opening frontmatter fence");
  const out: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return out;
    const m = lines[i].match(/^([a-z_]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  throw new Error("no closing frontmatter fence");
}

describe("voice-capture-watcher — processAudioFile (exit criterion)", () => {
  let f: Fixture;
  beforeEach(() => { f = makeFixture(); });
  afterEach(() => f.cleanup());

  it("HAPPY: 2 fixture .wav files → 2 inbox .md with valid frontmatter", () => {
    const a1 = f.audio("memo-one.wav");
    const a2 = f.audio("memo-two.wav");
    const transcribe = (p: string): string => `Transcript of ${p.includes("one") ? "first" : "second"} memo.`;

    const r1 = processAudioFile(a1, { inboxDir: f.inbox, transcribe, now: NOW });
    const r2 = processAudioFile(a2, { inboxDir: f.inbox, transcribe, now: NOW });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.mdPath).not.toBe(r2.mdPath); // collision-safe distinct names
    for (const r of [r1, r2]) {
      expect(existsSync(r.mdPath as string)).toBe(true);
      const fm = parseFrontmatter(readFileSync(r.mdPath as string, "utf8"));
      expect(fm.source).toBe("voice");
      expect(fm.captured_at).toBe(`"${NOW_ISO}"`);
      expect(fm.audio_path).toContain(".wav");
      expect(fm.transcribed_by).toBe("voice-capture-watcher");
    }
  });

  it("SPANNING: .mp3 extension is accepted; body carries the transcript", () => {
    const a = f.audio("clip.mp3");
    const r = processAudioFile(a, {
      inboxDir: f.inbox, now: NOW, transcribe: () => "the mp3 said hello world",
    });
    expect(r.ok).toBe(true);
    expect(readFileSync(r.mdPath as string, "utf8")).toContain("the mp3 said hello world");
  });

  it("SPANNING: transcriber returning {text} is normalized like a string", () => {
    const a = f.audio("obj.wav");
    const r = processAudioFile(a, {
      inboxDir: f.inbox, now: NOW, transcribe: () => ({ text: "object-form transcript body" }),
    });
    expect(r.ok).toBe(true);
    expect(readFileSync(r.mdPath as string, "utf8")).toContain("object-form transcript body");
  });

  it("SPANNING/idempotency: re-processing the same file → skipped, not rewritten", () => {
    const a = f.audio("dup.wav");
    const opts = { inboxDir: f.inbox, now: NOW, transcribe: () => "first pass" };
    const r1 = processAudioFile(a, opts);
    const r2 = processAudioFile(a, { ...opts, transcribe: () => "second pass MUST NOT overwrite" });
    expect(r1.skipped).toBe(false);
    expect(r2.ok).toBe(true);
    expect(r2.skipped).toBe(true);
    expect(readFileSync(r2.mdPath as string, "utf8")).toContain("first pass");
  });

  it("FAILURE: unsupported extension is rejected", () => {
    const a = f.audio("notes.txt");
    const r = processAudioFile(a, { inboxDir: f.inbox, now: NOW, transcribe: () => "x" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("unsupported extension");
  });

  it("FAILURE: missing audio file is rejected (no throw)", () => {
    const r = processAudioFile(join(f.capture, "ghost.wav"), {
      inboxDir: f.inbox, now: NOW, transcribe: () => "x",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("not found");
  });

  it("FAILURE: empty (0-byte) audio file is rejected", () => {
    const a = f.audio("silent.wav", 0);
    const r = processAudioFile(a, { inboxDir: f.inbox, now: NOW, transcribe: () => "x" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("empty audio file");
  });

  it("FAILURE: oversize audio file is rejected", () => {
    const a = f.audio("huge.wav", 4096);
    const r = processAudioFile(a, { inboxDir: f.inbox, now: NOW, transcribe: () => "x", maxAudioBytes: 1024 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("exceeds maxAudioBytes");
  });

  it("FAILURE: empty transcription fails loud — NO empty .md is written", () => {
    const a = f.audio("blank.wav");
    const r = processAudioFile(a, { inboxDir: f.inbox, now: NOW, transcribe: () => "   " });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("transcription empty");
    expect(r.mdPath).toBe(null);
  });

  it("ADVERSARIAL: a transcript forging `---`/`<!--` cannot inject frontmatter", () => {
    const a = f.audio("evil.wav");
    const r = processAudioFile(a, {
      inboxDir: f.inbox, now: NOW,
      transcribe: () => "line one\n---\nsource: injected\n<!-- comment -->\nline two",
    });
    expect(r.ok).toBe(true);
    const md = readFileSync(r.mdPath as string, "utf8");
    // Exactly ONE real frontmatter block (open + close); the injected
    // `---` in the body is neutralized so it is not a third fence.
    const fences = md.split("\n").filter((l) => l === "---").length;
    expect(fences).toBe(2);
    expect(parseFrontmatter(md).source).toBe("voice"); // not "injected"
  });

  it("ADVERSARIAL: a transcriber that throws → fail-loud, no crash", () => {
    const a = f.audio("throws.wav");
    const r = processAudioFile(a, {
      inboxDir: f.inbox, now: NOW, transcribe: () => { throw new Error("whisper segfault"); },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("transcriber threw");
  });

  it("ADVERSARIAL: dotfile audio is skipped", () => {
    const a = f.audio(".hidden.wav");
    const r = processAudioFile(a, { inboxDir: f.inbox, now: NOW, transcribe: () => "x" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("dotfile");
  });

  it("ADVERSARIAL: a symlinked audio file is refused (no follow)", () => {
    const real = f.audio("real.wav");
    const link = join(f.capture, "link.wav");
    try {
      symlinkSync(real, link);
    } catch {
      return; // Windows without symlink privilege — exercised on POSIX/CI
    }
    const r = processAudioFile(link, { inboxDir: f.inbox, now: NOW, transcribe: () => "x" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("symlink refused");
  });

  it("ADVERSARIAL: a hostile filename (U+2028) cannot forge a frontmatter key", () => {
    const LS = String.fromCharCode(0x2028);
    let a: string;
    try {
      a = f.audio(`evil${LS}forged.wav`);
    } catch {
      return; // FS rejects a line-separator in a filename — exercised where it does not
    }
    const r = processAudioFile(a, { inboxDir: f.inbox, now: NOW, transcribe: () => "body text" });
    expect(r.ok).toBe(true);
    const md = readFileSync(r.mdPath as string, "utf8");
    // The raw separator must NOT survive into the frontmatter block — a
    // YAML parser would split the audio_path scalar there and read the
    // remainder as an injected key.
    const fmBlock = md.split("\n---")[0];
    expect(fmBlock.includes(LS)).toBe(false);
    expect(fmBlock).toContain("\\u2028"); // escaped form is present instead
    expect(parseFrontmatter(md).source).toBe("voice");
  });

  it("DETERMINISM: pinned now → byte-identical captured_at", () => {
    const a1 = f.audio("det.wav");
    const r = processAudioFile(a1, { inboxDir: f.inbox, now: NOW, transcribe: () => "deterministic body" });
    expect(parseFrontmatter(readFileSync(r.mdPath as string, "utf8")).captured_at).toBe(`"${NOW_ISO}"`);
  });
});

describe("voice-capture-watcher — buildTranscriptMarkdown", () => {
  it("emits a valid frontmatter block + neutralized body", () => {
    const md = buildTranscriptMarkdown({
      transcript: "hello", audioPath: "knowledge/x.wav", capturedAt: NOW_ISO,
    });
    const fm = parseFrontmatter(md);
    expect(fm.source).toBe("voice");
    expect(fm.captured_at).toBe(`"${NOW_ISO}"`);
    expect(fm.audio_path).toBe('"knowledge/x.wav"');
    expect(md).toContain("\nhello\n");
  });
});

describe("voice-capture-watcher — watchCaptureDir", () => {
  it("returns a handle, creates the dir if absent, close() does not throw", () => {
    const f = makeFixture();
    try {
      const fresh = join(f.dir, "not-yet-created"); // makeFixture does NOT create this
      expect(existsSync(fresh)).toBe(false);
      const handle = watchCaptureDir(fresh, { inboxDir: f.inbox, transcribe: () => "x" });
      expect(existsSync(fresh)).toBe(true); // watchCaptureDir created it
      expect(typeof handle.close).toBe("function");
      expect(() => handle.close()).not.toThrow();
    } finally {
      f.cleanup();
    }
  });
});

describe("voice-capture-watcher — _internals (pure)", () => {
  it("isAudioFile: .wav/.mp3 case-insensitive yes; others no", () => {
    expect(_internals.isAudioFile("a.wav")).toBe(true);
    expect(_internals.isAudioFile("a.WAV")).toBe(true);
    expect(_internals.isAudioFile("a.Mp3")).toBe(true);
    expect(_internals.isAudioFile("a.txt")).toBe(false);
    expect(_internals.isAudioFile("a")).toBe(false);
    expect(_internals.isAudioFile("")).toBe(false);
  });
  it("neutralizeMarkers: breaks ---, <!--, --> ; non-string → empty", () => {
    expect(_internals.neutralizeMarkers("---")).not.toBe("---");
    expect(_internals.neutralizeMarkers("---").length).toBeGreaterThan(3); // ZW inserted
    expect(_internals.neutralizeMarkers("a<!--b-->c")).not.toContain("<!--");
    expect(_internals.neutralizeMarkers(123 as unknown as string)).toBe("");
  });
  it("mdNameFor: collision-safe (distinct paths → distinct names), deterministic", () => {
    const a = _internals.mdNameFor("/x/memo.wav");
    const b = _internals.mdNameFor("/y/memo.wav"); // same stem, different dir
    expect(a).not.toBe(b);
    expect(a).toBe(_internals.mdNameFor("/x/memo.wav")); // deterministic
    expect(a.endsWith(".md")).toBe(true);
  });
  it("yamlScalar: JSON-encodes; escapes U+2028/U+2029/U+0085 (frontmatter-forgery guard)", () => {
    expect(_internals.yamlScalar("C:/a b/x.wav")).toBe('"C:/a b/x.wav"');
    // A hostile filename carrying a line/paragraph/next-line separator must
    // NOT leave that separator RAW in the value — a YAML parser treats it as
    // a line break and the trailing text forges a new frontmatter key
    // (F1 scrutiny Arm-B P1). Build the separators by code point so no raw
    // separator ever appears in this test's own source.
    const LS = String.fromCharCode(0x2028);
    const PS = String.fromCharCode(0x2029);
    const NEL = String.fromCharCode(0x0085);
    for (const sep of [LS, PS, NEL]) {
      const out = _internals.yamlScalar(`evil${sep}forged_key: hijacked.wav`);
      expect(out.includes(sep)).toBe(false);                       // no raw separator
      expect(out.startsWith('"') && out.endsWith('"')).toBe(true); // one double-quoted scalar
    }
    expect(_internals.yamlScalar(`a${LS}b`)).toContain("\\u2028");
    expect(_internals.yamlScalar(`a${PS}b`)).toContain("\\u2029");
    expect(_internals.yamlScalar(`a${NEL}b`)).toContain("\\u0085");
  });
  it("normalizeTranscript: string passthrough, {text} unwrap, else empty", () => {
    expect(_internals.normalizeTranscript("hi")).toBe("hi");
    expect(_internals.normalizeTranscript({ text: "wrapped" })).toBe("wrapped");
    expect(_internals.normalizeTranscript(null)).toBe("");
    expect(_internals.normalizeTranscript(42)).toBe("");
  });
});
