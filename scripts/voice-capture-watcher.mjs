#!/usr/bin/env node
/**
 * voice-capture-watcher.mjs
 *
 * OBSIDIAN-INTELLIGENCE-MS3/F1/U-VOICE-CAPTURE — phase 1 (watcher only).
 *
 * Watches a capture directory for operator voice memos (.wav / .mp3),
 * transcribes each with a local Whisper build (whisper.cpp / whisper-
 * faster — no cloud, no API key), and writes the transcript as a markdown
 * note into `knowledge/memories/inbox/` with provenance frontmatter
 * (`source: voice`, `captured_at`, `audio_path`). Downstream the existing
 * inbox-promotion flow ingests it into tribal knowledge.
 *
 * Phase 2 (a Telegram capture bot) is a SEPARATE unit — deliberately not
 * here.
 *
 * Testable two-phase shape, mirroring the B3/B5/B6 family:
 *   1. processAudioFile(audioPath, opts) — PURE-ish core: validate the
 *      file, transcribe via the INJECTED transcriber (DI; default =
 *      whisper.cpp subprocess), write the inbox .md atomically. No
 *      directory scan, no fs.watch — fully hermetic-testable.
 *   2. watchCaptureDir(dir, opts) — the side-effecting fs.watch loop that
 *      debounces filesystem events and feeds processAudioFile.
 *
 * The transcriber is INJECTED so the test never needs whisper.cpp on
 * disk (the engine works with Whisper absent — it just records a
 * fail-loud error, never crashes the watcher).
 *
 * Hardening carried from the family: atomic tmp+rename writes, frozen-now
 * determinism, lstat symlink rejection, dotfile skip, oversize skip,
 * marker neutralization (a transcript saying "---" must not forge YAML
 * frontmatter), content-addressed md names (collision-safe + idempotent),
 * `_internals` test seam.
 *
 * Knobs (env):
 *   PRISM_VOICE_CAPTURE_DIR   — directory to watch
 *   PRISM_VOICE_INBOX_DIR     — override inbox output dir
 *   PRISM_WHISPER_BIN         — path to the whisper binary
 *   PRISM_WHISPER_MODEL       — path to the ggml model file
 *   PRISM_VOICE_MAX_AUDIO_MB  — oversize skip threshold (default 200)
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/F1/U-VOICE-CAPTURE
 */

import {
  existsSync, lstatSync, statSync, readFileSync, writeFileSync, renameSync,
  unlinkSync, mkdirSync, watch as fsWatch,
} from "node:fs";
import { resolve, dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");

// ---------- Defaults ---------------------------------------------------------

const AUDIO_EXTENSIONS = [".wav", ".mp3"];
const DEFAULT_INBOX_DIR = join(PRISM_ROOT, "knowledge", "memories", "inbox");
const DEFAULT_MAX_AUDIO_MB = 200;
const DEFAULT_DEBOUNCE_MS = 1500;
const MB = 1024 * 1024;
const MD_HASH_LEN = 8;

// ---------- Helpers (pure) ---------------------------------------------------

/**
 * Neutralize markdown/frontmatter markers in untrusted transcript text so
 * a memo that literally says "---" or "<!--" cannot forge a YAML
 * frontmatter fence or an HTML comment in the emitted note. Inserts a
 * zero-width space (U+200B) after the first char of each marker token —
 * invisible to a human reader, structurally inert to a parser.
 */
function neutralizeMarkers(text) {
  if (typeof text !== "string") return "";
  const ZW = "​";
  return text
    .replace(/---/g, `-${ZW}--`)
    .replace(/<!--/g, `<${ZW}!--`)
    .replace(/-->/g, `-${ZW}->`);
}

/** True when the path has a supported audio extension (case-insensitive). */
function isAudioFile(p) {
  if (typeof p !== "string" || p.length === 0) return false;
  return AUDIO_EXTENSIONS.includes(extname(p).toLowerCase());
}

/** Content-addressed, collision-safe md name: <stem>-<hash8>.md. */
function mdNameFor(audioPath) {
  const stem = basename(audioPath, extname(audioPath)).replace(/[^A-Za-z0-9._-]/g, "_") || "memo";
  const hash = createHash("sha256").update(audioPath).digest("hex").slice(0, MD_HASH_LEN);
  return `${stem}-${hash}.md`;
}

/**
 * YAML-safe scalar for a frontmatter VALUE. JSON-encode (handles quotes,
 * backslashes, and the C0 controls + \n\r\t that JSON.stringify escapes),
 * then ALSO escape U+2028 / U+2029 / U+0085 — the line/paragraph/next-line
 * separators that JSON.stringify leaves RAW. A YAML parser can treat those
 * as line breaks, so a hostile capture-dir filename landing in `audio_path`
 * could otherwise terminate the scalar early and forge an arbitrary new
 * frontmatter key (F1 scrutiny Arm-B P1). Escaped, the value stays a
 * faithful single-line double-quoted scalar.
 */
function yamlScalar(v) {
  return JSON.stringify(String(v))
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/\u0085/g, "\\u0085");
}

/**
 * Render the inbox markdown note: provenance frontmatter + the
 * marker-neutralized transcript body.
 */
function buildTranscriptMarkdown({ transcript, audioPath, capturedAt }) {
  const body = neutralizeMarkers(typeof transcript === "string" ? transcript : "").trim();
  return [
    "---",
    "source: voice",
    `captured_at: ${yamlScalar(capturedAt)}`,
    `audio_path: ${yamlScalar(audioPath)}`,
    "transcribed_by: voice-capture-watcher",
    "---",
    "",
    body,
    "",
  ].join("\n");
}

/** Normalize an injected transcriber's return into a plain string | "". */
function normalizeTranscript(raw) {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && typeof raw.text === "string") return raw.text;
  return "";
}

// ---------- Default transcriber (whisper.cpp subprocess) --------------------

/**
 * Default transcriber — invoke a local whisper.cpp / whisper-faster build.
 * Fail-SOFT: a missing binary, a non-zero exit, or an unreadable output
 * file returns "" (the caller records a fail-loud error and moves on; the
 * watcher never crashes on a bad audio file or an absent Whisper).
 *
 * @param audioPath  Absolute path to the audio file.
 * @param opts       { whisperBin, whisperModel }.
 * @returns          Transcript text, or "" on any failure.
 */
function transcribeWithWhisper(audioPath, opts = {}) {
  const bin = opts.whisperBin || process.env.PRISM_WHISPER_BIN || "whisper-cli";
  const model = opts.whisperModel || process.env.PRISM_WHISPER_MODEL || "";
  const args = ["-f", audioPath, "-otxt", "-of", `${audioPath}.prismvoice`];
  if (model) args.unshift("-m", model);
  let res;
  try {
    res = spawnSync(bin, args, { encoding: "utf8", timeout: 600_000 });
  } catch {
    return "";
  }
  if (!res || res.error || res.status !== 0) return "";
  const txtPath = `${audioPath}.prismvoice.txt`;
  try {
    if (!existsSync(txtPath)) return "";
    const text = readFileSync(txtPath, "utf8");
    try { unlinkSync(txtPath); } catch { /* leave the artifact, not fatal */ }
    return text;
  } catch {
    return "";
  }
}

// ---------- Core — processAudioFile -----------------------------------------

/**
 * Validate, transcribe, and write one audio file to the inbox. Never
 * throws — every failure mode degrades to `{ ok: false, error }` (R12:
 * fail loud, never silent).
 *
 * @param audioPath  Path to a .wav / .mp3 file.
 * @param opts       { inboxDir, transcribe, now, whisperBin, whisperModel,
 *                     maxAudioBytes }.
 * @returns {{ ok: boolean, mdPath: string|null, skipped?: boolean,
 *             error: string|null }}
 */
function processAudioFile(audioPath, opts = {}) {
  const inboxDir = opts.inboxDir ? resolve(opts.inboxDir) : DEFAULT_INBOX_DIR;
  const maxBytes = Number.isFinite(opts.maxAudioBytes)
    ? opts.maxAudioBytes
    : (Number(process.env.PRISM_VOICE_MAX_AUDIO_MB) || DEFAULT_MAX_AUDIO_MB) * MB;
  const now = opts.now ?? Date.now();
  const capturedAt = new Date(now).toISOString();

  if (typeof audioPath !== "string" || audioPath.length === 0) {
    return { ok: false, mdPath: null, error: "empty audio path" };
  }
  const base = basename(audioPath);
  if (base.startsWith(".")) {
    return { ok: false, mdPath: null, error: `dotfile skipped (${base})` };
  }
  if (!isAudioFile(audioPath)) {
    return { ok: false, mdPath: null, error: `unsupported extension (${extname(audioPath)})` };
  }
  // Symlink rejection — never follow a symlinked capture file.
  let st;
  try {
    const ls = lstatSync(audioPath);
    if (ls.isSymbolicLink()) {
      return { ok: false, mdPath: null, error: `symlink refused (${audioPath})` };
    }
    st = statSync(audioPath);
  } catch {
    return { ok: false, mdPath: null, error: `audio file not found (${audioPath})` };
  }
  if (!st.isFile()) {
    return { ok: false, mdPath: null, error: `not a regular file (${audioPath})` };
  }
  if (st.size === 0) {
    return { ok: false, mdPath: null, error: `empty audio file (${audioPath})` };
  }
  if (st.size > maxBytes) {
    return { ok: false, mdPath: null, error: `audio exceeds maxAudioBytes (${st.size} > ${maxBytes})` };
  }

  // Idempotency — content-addressed md name; skip if already transcribed.
  const mdPath = join(inboxDir, mdNameFor(audioPath));
  if (existsSync(mdPath)) {
    return { ok: true, mdPath, skipped: true, error: null };
  }

  // Transcribe via the injected transcriber, or the whisper subprocess.
  const transcriber = typeof opts.transcribe === "function"
    ? opts.transcribe
    : (p) => transcribeWithWhisper(p, opts);
  let transcript;
  try {
    transcript = normalizeTranscript(transcriber(audioPath));
  } catch (e) {
    return { ok: false, mdPath: null, error: `transcriber threw: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (transcript.trim().length === 0) {
    // Fail loud — do NOT write an empty note (a silent empty .md would
    // pollute the inbox and look like a successful capture).
    return { ok: false, mdPath: null, error: `transcription empty/failed (${audioPath})` };
  }

  // Atomic write: tmp + rename, with orphan cleanup on rename failure.
  const md = buildTranscriptMarkdown({ transcript, audioPath, capturedAt });
  const tmp = `${mdPath}.tmp.${process.pid}`;
  try {
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(tmp, md, "utf8");
    renameSync(tmp, mdPath);
  } catch (e) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* swallow */ }
    return { ok: false, mdPath: null, error: `inbox write failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  return { ok: true, mdPath, skipped: false, error: null };
}

// ---------- Watcher — watchCaptureDir ---------------------------------------

/**
 * fs.watch the capture directory; on a settled .wav/.mp3 event run
 * processAudioFile. fs.watch fires duplicate + delete events, so each
 * filename is debounced and existence is re-checked before processing.
 * The watch callback never throws (a throw would kill the watcher).
 *
 * @param captureDir  Directory to watch.
 * @param opts        processAudioFile opts + { debounceMs, onResult }.
 * @returns {{ close: () => void }}  Handle the caller closes to stop.
 */
function watchCaptureDir(captureDir, opts = {}) {
  const dir = resolve(captureDir);
  const debounceMs = Number.isFinite(opts.debounceMs) ? opts.debounceMs : DEFAULT_DEBOUNCE_MS;
  const lastSeen = new Map();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const handler = (_eventType, filename) => {
    try {
      if (!filename || !isAudioFile(filename)) return;
      const now = Date.now();
      const prev = lastSeen.get(filename);
      if (prev !== undefined && now - prev < debounceMs) return;
      lastSeen.set(filename, now);
      const full = join(dir, filename);
      if (!existsSync(full)) return; // a 'rename' delete event — nothing to do
      const result = processAudioFile(full, opts);
      if (typeof opts.onResult === "function") {
        try { opts.onResult(result, full); } catch { /* swallow */ }
      }
    } catch {
      /* a watch callback must never throw — swallow and keep watching */
    }
  };

  const watcher = fsWatch(dir, { persistent: opts.persistent !== false }, handler);
  return { close: () => { try { watcher.close(); } catch { /* swallow */ } } };
}

// ---------- CLI --------------------------------------------------------------

/**
 * CLI entry — start the watcher on the configured capture directory.
 * Blocks (the fs.watch handle keeps the event loop alive).
 */
function runVoiceCaptureWatcher(opts = {}) {
  const captureDir = opts.captureDir
    || process.env.PRISM_VOICE_CAPTURE_DIR
    || join(PRISM_ROOT, "knowledge", "memories", "voice-capture");
  const inboxDir = opts.inboxDir
    || process.env.PRISM_VOICE_INBOX_DIR
    || DEFAULT_INBOX_DIR;
  process.stdout.write(`voice-capture-watcher: watching ${captureDir} -> ${inboxDir}\n`);
  return watchCaptureDir(captureDir, {
    ...opts,
    inboxDir,
    onResult: (r, f) => {
      const line = r.ok
        ? (r.skipped ? `skip (already transcribed): ${f}` : `transcribed: ${f} -> ${r.mdPath}`)
        : `FAILED: ${f} — ${r.error}`;
      process.stdout.write(`voice-capture-watcher: ${line}\n`);
    },
  });
}

// ---------- Exports ----------------------------------------------------------

export {
  processAudioFile,
  watchCaptureDir,
  runVoiceCaptureWatcher,
  transcribeWithWhisper,
  buildTranscriptMarkdown,
};

/** @internal — exported for the test suite only. */
export const _internals = {
  neutralizeMarkers,
  isAudioFile,
  mdNameFor,
  yamlScalar,
  normalizeTranscript,
  AUDIO_EXTENSIONS,
  DEFAULT_MAX_AUDIO_MB,
};

// CLI invocation guard — run the watcher only when executed directly.
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  runVoiceCaptureWatcher();
}
