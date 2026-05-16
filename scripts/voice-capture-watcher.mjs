#!/usr/bin/env node
/**
 * voice-capture-watcher.mjs — OBSIDIAN-INTELLIGENCE-MS3 / F1
 *
 * Watches a capture directory for .wav/.mp3/.m4a files (e.g. operator voice
 * memos from a phone or shop-floor mic), pipes each new file through a
 * pluggable transcriber (default: local `whisper.exe` if on PATH;
 * test-stub for unit tests), and writes the transcript as a frontmatter-tagged
 * .md into `knowledge/memories/inbox/` for downstream tribal-knowledge ingest.
 *
 * Phase 1: watcher-only (no Telegram bot, no auto-classify, no Ollama
 * post-processing — those are F1.x phases).
 *
 * CLI:
 *   node scripts/voice-capture-watcher.mjs                 # start watcher
 *   node scripts/voice-capture-watcher.mjs --once <file>   # one-shot
 *   node scripts/voice-capture-watcher.mjs --dry-run       # report what would be done
 *
 * Knobs:
 *   PRISM_VOICE_CAPTURE_DIR   — capture-source dir (default: H:/prism/state/shared/voice-capture/)
 *   PRISM_VOICE_INBOX_DIR     — inbox output dir (default: H:/prism/knowledge/memories/inbox/)
 *   PRISM_VOICE_WHISPER_BIN   — whisper binary (default: whisper.exe on PATH)
 *   PRISM_VOICE_DISABLE=1     — short-circuit (for tests / safety)
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const CAPTURE_DIR = process.env.PRISM_VOICE_CAPTURE_DIR
  || path.join(REPO_ROOT, "state", "shared", "voice-capture");
const INBOX_DIR = process.env.PRISM_VOICE_INBOX_DIR
  || path.join(REPO_ROOT, "knowledge", "memories", "inbox");
const WHISPER_BIN = process.env.PRISM_VOICE_WHISPER_BIN || "whisper";
const DISABLED = process.env.PRISM_VOICE_DISABLE === "1";

const AUDIO_EXT = new Set([".wav", ".mp3", ".m4a", ".ogg", ".flac"]);
const MAX_TRANSCRIBE_MS = 120_000;

/**
 * Default transcriber: invokes the configured whisper binary.
 * Returns { ok, text, error? }. Pure-ish — depends on PATH + binary.
 * Tests inject a stub instead.
 */
export function whisperTranscribe(audioPath, { whisperBin = WHISPER_BIN, timeoutMs = MAX_TRANSCRIBE_MS } = {}) {
  if (!audioPath || !fs.existsSync(audioPath)) {
    return { ok: false, error: "audio-file-missing" };
  }
  try {
    // whisper.cpp / whisper-faster CLI convention: `whisper --output_format txt <file>`
    // Implementations vary; tolerate failure and surface error class.
    const out = execFileSync(whisperBin, ["--output_format", "txt", audioPath], {
      timeout: timeoutMs,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, text: out.trim() };
  } catch (err) {
    if (err.code === "ENOENT") {
      return { ok: false, error: "whisper-not-installed" };
    }
    if (err.signal === "SIGTERM" || err.killed) {
      return { ok: false, error: "whisper-timeout" };
    }
    return { ok: false, error: "whisper-failed", detail: String(err.message || err).slice(0, 200) };
  }
}

/**
 * Slugify a filename to a kebab-case slug for the inbox memo filename.
 * Pure.
 */
export function slugify(name) {
  return String(name || "voice")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60) || "voice";
}

/**
 * Render the inbox .md content. Pure.
 */
export function renderInboxMd({ transcript, sourceAudio, capturedAt = new Date().toISOString(), source = "voice" }) {
  const slug = slugify(path.basename(sourceAudio, path.extname(sourceAudio)));
  const id = crypto.createHash("sha256")
    .update(`${slug}${capturedAt}`).digest("hex").slice(0, 16);
  const body = transcript && transcript.trim().length > 0
    ? transcript.trim()
    : "(empty transcript — whisper returned no text)";
  return [
    "---",
    `name: voice-${slug}-${id}`,
    `description: Voice memo captured ${capturedAt.slice(0, 10)}: ${body.slice(0, 80).replace(/\n/g, " ")}`,
    `metadata:`,
    `  type: project`,
    `  source: ${source}`,
    `  captured_at: ${capturedAt}`,
    `  audio_path: ${sourceAudio.replace(/\\/g, "/")}`,
    "---",
    "",
    `# Voice memo — ${slug}`,
    "",
    body,
    "",
  ].join("\n");
}

/**
 * Process a single audio file: transcribe + write inbox memo.
 * Returns { ok, inboxPath?, error?, transcript? }.
 *
 * Injectable: pass `transcriber` for tests; defaults to whisperTranscribe.
 * Injectable: pass `writeFn`/`mkdirFn` for tests; defaults to fs sync.
 */
export function processAudioFile(audioPath, {
  inboxDir = INBOX_DIR,
  transcriber = whisperTranscribe,
  writeFn = fs.writeFileSync,
  mkdirFn = fs.mkdirSync,
  nowIso = null,
} = {}) {
  if (!audioPath) return { ok: false, error: "no-audio-path" };
  const ext = path.extname(audioPath).toLowerCase();
  if (!AUDIO_EXT.has(ext)) {
    return { ok: false, error: "unsupported-extension", ext };
  }
  const transcribeResult = transcriber(audioPath);
  if (!transcribeResult.ok) {
    return { ok: false, error: transcribeResult.error || "transcribe-failed", detail: transcribeResult.detail };
  }
  const capturedAt = nowIso || new Date().toISOString();
  const md = renderInboxMd({
    transcript: transcribeResult.text,
    sourceAudio: audioPath,
    capturedAt,
  });
  const slug = slugify(path.basename(audioPath, ext));
  const stamp = capturedAt.slice(0, 19).replace(/[:T]/g, "-");
  const inboxPath = path.join(inboxDir, `voice-${stamp}-${slug}.md`);
  try {
    mkdirFn(inboxDir, { recursive: true });
    writeFn(inboxPath, md, "utf8");
    return { ok: true, inboxPath, transcript: transcribeResult.text, bytes: md.length };
  } catch (err) {
    return { ok: false, error: "write-failed", detail: String(err.message || err).slice(0, 200) };
  }
}

/**
 * Watch capture dir + process new audio files. Stubbed for test-mode
 * (returns immediately if `oneShot` is true and processes the path).
 *
 * Returns a handle: { stop(), processed }.
 */
export function startWatcher({
  captureDir = CAPTURE_DIR,
  inboxDir = INBOX_DIR,
  transcriber = whisperTranscribe,
  onProcess = null,
  oneShot = null, // if a file-path, process once + return
} = {}) {
  if (DISABLED) {
    return { stop: () => {}, processed: [], disabled: true };
  }
  const processed = [];

  if (oneShot) {
    const result = processAudioFile(oneShot, { inboxDir, transcriber });
    processed.push({ file: oneShot, result });
    if (onProcess) onProcess({ file: oneShot, result });
    return { stop: () => {}, processed };
  }

  if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir, { recursive: true });
  }

  const seen = new Set();
  const watcher = fs.watch(captureDir, { persistent: true }, (eventType, filename) => {
    if (!filename || eventType !== "rename") return;
    const full = path.join(captureDir, filename);
    if (!fs.existsSync(full)) return;
    if (seen.has(full)) return;
    const ext = path.extname(filename).toLowerCase();
    if (!AUDIO_EXT.has(ext)) return;
    seen.add(full);
    const result = processAudioFile(full, { inboxDir, transcriber });
    processed.push({ file: full, result });
    if (onProcess) onProcess({ file: full, result });
  });

  return {
    stop: () => { try { watcher.close(); } catch {} },
    processed,
  };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1]?.endsWith("voice-capture-watcher.mjs")) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onceIdx = args.indexOf("--once");
  const oneShot = onceIdx >= 0 ? args[onceIdx + 1] : null;

  if (dryRun) {
    process.stdout.write(JSON.stringify({
      ok: true, mode: "dry-run",
      captureDir: CAPTURE_DIR,
      inboxDir: INBOX_DIR,
      whisperBin: WHISPER_BIN,
      audioExtensions: [...AUDIO_EXT],
    }, null, 2) + "\n");
    process.exit(0);
  }

  if (oneShot) {
    const result = processAudioFile(oneShot);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exit(result.ok ? 0 : 1);
  }

  process.stderr.write(`[voice-capture] watching ${CAPTURE_DIR} → ${INBOX_DIR}\n`);
  const handle = startWatcher({ onProcess: (e) => {
    process.stderr.write(`[voice-capture] ${e.file} → ${JSON.stringify(e.result)}\n`);
  }});
  process.on("SIGINT", () => { handle.stop(); process.exit(0); });
  // Keep alive
  setInterval(() => {}, 60_000);
}
