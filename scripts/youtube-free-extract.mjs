#!/usr/bin/env node
/**
 * youtube-free-extract.mjs — $0 YouTube → PRISM tribal/wiki pipeline
 *
 * Implements the FREE extraction stack so PRISM can absorb machining-channel
 * tribal knowledge without paying for Whisper API or Claude Vision.
 *
 * TIER STACK (cheapest-first, each tier falls through on miss):
 *   1. yt-dlp auto-generated subtitles  ($0, instant, ~95% of YouTube)
 *   2. yt-dlp uploaded subtitles        ($0, instant, when present)
 *   3. yt-dlp audio + local faster-whisper  ($0 if installed — not wired here)
 *
 * Once a transcript is in hand, an Ollama local model (qwen2.5-coder:7b by
 * default) extracts machining tribal tips, which are:
 *   - Dedup-ingested into TribalKnowledgeEngine (U-TK01 prevents content dupes)
 *   - Appended to knowledge/wiki/code-tribal/youtube-<id>.md (LLM-Wiki pattern)
 *   - Written to state/shared/youtube-extraction/<id>.json (audit trail)
 *
 * Why this exists:
 *   - VideoLearningEngine.transcribeAudio requires OPENAI_API_KEY ($0.006/min)
 *   - VideoLearningEngine.analyzeKeyframes requires ANTHROPIC_API_KEY ($/batch)
 *   - 99% of public YouTube content has free auto-captions already — paying is
 *     waste. This script closes the gap.
 *
 * Reputable external sources used (all $0):
 *   - yt-dlp (github.com/yt-dlp/yt-dlp) — Python module, already installed
 *   - WebVTT W3C standard (w3.org/TR/webvtt1) — for subtitle parse
 *   - Ollama local LLM (ollama.com) — qwen2.5-coder:7b model already resident
 *   - PRISM TribalKnowledgeEngine — content-dedup ingestion (U-TK01)
 *
 * Security: every external-process call uses `spawn` with argv arrays (not
 * shell strings) so a YouTube URL with shell metacharacters cannot inject.
 *
 * Usage:
 *   node scripts/youtube-free-extract.mjs <url>
 *   node scripts/youtube-free-extract.mjs "ytsearch5:dapra machining"
 *   node scripts/youtube-free-extract.mjs <url> --no-ingest
 *   node scripts/youtube-free-extract.mjs <url> --model qwen2.5-coder:14b
 *
 * Exit codes:
 *   0  ok, tips extracted (or transcript-only when --transcript-only)
 *   2  usage error
 *   3  yt-dlp failed (URL unreachable, no subs, no audio fallback)
 *   4  Ollama unavailable AND no --transcript-only flag set
 *
 * Author: slot:victor (claude-2423b113) — 2026-05-26
 * Wiki: knowledge/wiki/lessons/youtube-free-extraction.md
 * Memory: reference_youtube_free_extraction_pipeline_2026_05_26.md
 */

import { spawn } from "node:child_process";
import {
  mkdirSync, writeFileSync, existsSync, readFileSync,
  rmSync, readdirSync, appendFileSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

// ── Constants (extracted from inline magic numbers per lint guidance) ─────
export const DEFAULT_OLLAMA_MODEL   = "qwen2.5-coder:32b";
export const DEFAULT_OLLAMA_URL     = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
export const DEFAULT_MAX_SEGMENTS   = 200;
export const DEFAULT_OUTPUT_DIR     = join(REPO_ROOT, "state", "shared", "youtube-extraction");
export const WIKI_DIR               = join(REPO_ROOT, "knowledge", "wiki", "code-tribal");
/**
 * Resolve a Python executable for `spawn` without relying on PATH (Windows
 * `spawn` without shell:true does NOT walk PATHEXT). Tries in priority order:
 *   1. PRISM_PYTHON env var (operator override)
 *   2. YT_DLP_CMD env var (legacy override — kept for back-compat)
 *   3. Portable PRISM Python (H:/Tools/python/python.exe — set in SessionStart)
 *   4. "python.exe" (Windows PATH-walks .exe suffix automatically when given)
 *   5. "python3"
 *   6. "python" (POSIX bare name)
 * The first existsSync() hit wins. Pure-ish (file-system probe only).
 */
function resolvePythonExe() {
  const tries = [
    process.env.PRISM_PYTHON,
    process.env.YT_DLP_CMD,
    "H:/Tools/python/python.exe",
    "C:/Python314/python.exe",
    "C:/Python313/python.exe",
    "C:/Python312/python.exe",
    "python.exe",
    "python3",
    "python",
  ].filter(Boolean);
  for (const t of tries) {
    if (t.includes("/") || t.includes("\\")) {
      try { if (existsSync(t)) return t; } catch { /* swallow */ }
    } else {
      // Bare-name fallback — return as-is; spawn will fail loud if not found
      return t;
    }
  }
  return "python";
}
export const YT_DLP_CMD             = resolvePythonExe();
export const YT_DLP_ARGS_BASE       = (process.env.YT_DLP_CMD && process.env.YT_DLP_CMD !== "python") ? [] : ["-m", "yt_dlp"];
export const OLLAMA_TIMEOUT_MS      = 240_000;   // 4 min — covers cold model load
export const YT_DLP_TIMEOUT_MS      = 90_000;    // 90s per video
export const DEFAULT_CHUNK_CHARS    = 8_000;     // ~2K tokens — fits 8K Ollama context
export const MIN_CHUNK_CHARS        = 500;       // smallest viable chunk
export const SUBPROCESS_MAX_BUFFER  = 16 * 1024 * 1024;
export const MAX_TITLE_CHARS        = 80;
export const MAX_BODY_CHARS         = 400;
export const MAX_TAGS_PER_TIP       = 8;
export const CONFIDENCE_DEFAULT     = 0.5;
export const TIMESTAMP_LEN_HHMMSS   = 3;         // h:m:s parts count
export const TIMESTAMP_LEN_MMSS     = 2;         // m:s parts count
export const YOUTUBE_ID_LEN         = 11;
export const VALID_CATEGORIES = new Set([
  "speed_feed","tooling","setup","chip_control","surface_finish",
  "workholding","troubleshooting","safety","general",
]);

// ── Pure helpers (unit-testable, exported) ────────────────────────────────

/**
 * Parse a WebVTT (.vtt) subtitle file into time-stamped segments.
 * Tolerates the variations YouTube auto-captions emit (inline word timing
 * tags <00:00:01.234>, position cues, kind:captions header). Pure.
 *
 * @param {string} vttText raw VTT file content
 * @returns {{full_text:string, segments:Array<{start:number,end:number,text:string}>, language:string, duration_seconds:number}}
 */
export function parseVtt(vttText) {
  if (!vttText || typeof vttText !== "string") {
    return { full_text: "", segments: [], language: "en", duration_seconds: 0 };
  }
  const lines = vttText.replace(/\r\n/g, "\n").split("\n");
  const segments = [];
  let i = 0;
  // Skip header (WEBVTT, Kind, Language, NOTE blocks)
  while (i < lines.length && !/-->/.test(lines[i])) i++;
  while (i < lines.length) {
    const cueLine = lines[i];
    const m = /(\d{1,2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}\.\d{3})/.exec(cueLine);
    if (!m) { i++; continue; }
    const start = vttTimestampToSeconds(m[1]);
    const end = vttTimestampToSeconds(m[2]);
    const textParts = [];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/-->/.test(lines[i])) {
      textParts.push(lines[i]);
      i++;
    }
    const raw = textParts.join(" ");
    const cleaned = raw
      .replace(/<\d{1,2}:\d{2}:\d{2}\.\d{3}>/g, "")    // inline word timestamps
      .replace(/<c[^>]*>/g, "").replace(/<\/c>/g, "")  // caption styling
      .replace(/<v[^>]+>/g, "").replace(/<\/v>/g, "")  // speaker tags
      .replace(/<[^>]+>/g, "")                          // any other HTML
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) segments.push({ start, end, text: cleaned });
    while (i < lines.length && lines[i].trim() === "") i++;
  }
  // De-dupe consecutive identical-text segments (YouTube auto-captions overlap)
  const deduped = [];
  for (const seg of segments) {
    const last = deduped[deduped.length - 1];
    if (last && last.text === seg.text) {
      last.end = seg.end;
      continue;
    }
    deduped.push({ ...seg });
  }
  const fullText = deduped.map((s) => s.text).join(" ");
  const duration = deduped.length ? deduped[deduped.length - 1].end : 0;
  return { full_text: fullText, segments: deduped, language: "en", duration_seconds: duration };
}

/** Convert "01:23:45.678" or "23:45.678" → seconds. Pure. */
export function vttTimestampToSeconds(stamp) {
  if (!stamp || typeof stamp !== "string") return 0;
  const parts = stamp.split(":");
  let h = 0, m = 0, s = 0;
  if (parts.length === TIMESTAMP_LEN_HHMMSS) { [h, m, s] = parts; }
  else if (parts.length === TIMESTAMP_LEN_MMSS) { [m, s] = parts; }
  else { s = parts[0]; }
  const seconds = parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s);
  return Number.isFinite(seconds) ? seconds : 0;
}

/**
 * Chunk a transcript by approximate token count so each LLM call stays within
 * the model's context window. ~4 chars/token. Pure.
 */
export function chunkTranscript(transcript, maxCharsPerChunk = DEFAULT_CHUNK_CHARS) {
  if (!transcript || !Array.isArray(transcript.segments) || !transcript.segments.length) return [];
  const chunks = [];
  let buf = [];
  let bufChars = 0;
  let chunkStart = transcript.segments[0].start;
  for (const seg of transcript.segments) {
    if (bufChars + seg.text.length + 1 > maxCharsPerChunk && buf.length) {
      chunks.push({
        start: chunkStart,
        end: buf[buf.length - 1].end,
        text: buf.map((s) => s.text).join(" "),
      });
      buf = [];
      bufChars = 0;
      chunkStart = seg.start;
    }
    buf.push(seg);
    bufChars += seg.text.length + 1;
  }
  if (buf.length) {
    chunks.push({
      start: chunkStart,
      end: buf[buf.length - 1].end,
      text: buf.map((s) => s.text).join(" "),
    });
  }
  return chunks;
}

/**
 * Build the Ollama extraction prompt — asks the local model to surface
 * machining tribal tips as STRICT JSON. The prompt is opinionated about
 * what counts as a tribal tip (operator wisdom, not textbook content) and
 * tells the model to return [] when uncertain (refuse hallucination).
 */
export function buildExtractionPrompt(chunkText, meta = {}) {
  const head = "You extract MACHINING TRIBAL KNOWLEDGE TIPS from a YouTube transcript chunk.";
  const def = [
    "TRIBAL TIP = operator-shared shop-floor wisdom: rules of thumb, speeds/feeds,",
    "tool-selection rationale, troubleshooting moves, setup tricks, parameter ranges.",
    "NOT a tribal tip: marketing claims, generic CAD/CAM definitions, narrator small talk.",
  ].join(" ");
  const rules = [
    "Rules:",
    "- Output STRICT JSON: an array of objects, NOTHING else.",
    `- Schema per tip: {"title":string<${MAX_TITLE_CHARS}, "body":string<${MAX_BODY_CHARS}, "category":one of [${[...VALID_CATEGORIES].map((c) => `"${c}"`).join(",")}], "tags":string[], "confidence":number 0-1, "timestamp_hint":string}`,
    "- If no real tips appear in this chunk, output [].",
    "- Confidence >= 0.7 only for direct quotes; <= 0.5 for inferred wisdom.",
    "- NEVER invent numeric values not in the transcript.",
  ].join("\n");
  const ctx = [
    meta.title ? `Video title: ${meta.title}` : null,
    meta.channel ? `Channel: ${meta.channel}` : null,
    meta.chunkIndex !== undefined ? `Chunk ${meta.chunkIndex + 1}/${meta.chunkTotal}` : null,
  ].filter(Boolean).join("\n");
  return `${head}\n\n${def}\n\n${rules}\n\n${ctx}\n\nTRANSCRIPT CHUNK:\n${chunkText}\n\nJSON_OUTPUT:`;
}

/**
 * Parse the LLM's JSON-array output into KnowledgeTip-shaped records. Lenient:
 * accepts JSON wrapped in markdown fences or mid-text. Discards malformed
 * entries (no silent count loss — caller stats track total in/out). Pure.
 */
export function parseTipsFromLlm(rawLlmText) {
  if (!rawLlmText || typeof rawLlmText !== "string") return [];
  let text = rawLlmText.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  let arr;
  try {
    arr = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const e of arr) {
    if (!e || typeof e !== "object") continue;
    const title = typeof e.title === "string" ? e.title.trim().slice(0, MAX_TITLE_CHARS) : "";
    const body  = typeof e.body  === "string" ? e.body.trim().slice(0, MAX_BODY_CHARS)  : "";
    if (!title || !body) continue;
    let category = typeof e.category === "string" ? e.category.toLowerCase().trim() : "general";
    if (!VALID_CATEGORIES.has(category)) category = "general";
    const tags = Array.isArray(e.tags)
      ? e.tags.filter((t) => typeof t === "string" && t.trim())
              .slice(0, MAX_TAGS_PER_TIP)
              .map((t) => t.trim().toLowerCase())
      : [];
    let confidence = typeof e.confidence === "number" ? e.confidence : CONFIDENCE_DEFAULT;
    if (!Number.isFinite(confidence) || confidence < 0) confidence = CONFIDENCE_DEFAULT;
    if (confidence > 1) confidence = 1;
    const timestampHint = typeof e.timestamp_hint === "string" ? e.timestamp_hint.trim() : "";
    out.push({ title, body, category, tags, confidence, timestamp_hint: timestampHint });
  }
  return out;
}

/**
 * Convert parsed tips → KnowledgeTip records that TribalKnowledgeEngine.ingest
 * accepts. The `source` carries the YouTube URL + timestamp hint so future
 * audits can replay exactly where the tip came from. Pure.
 */
export function tipsToKnowledgeTips(parsed, meta) {
  const today = new Date().toISOString().slice(0, 10);
  return parsed.map((t, i) => ({
    id: `tk-yt-${meta.videoId}-${String(i + 1).padStart(3, "0")}`,
    title: t.title,
    body: t.body,
    category: t.category,
    tags: [...new Set(["video-learned", "youtube", "youtube-free-extract", ...t.tags])],
    confidence: Math.round(t.confidence * 100),
    source: `youtube:${meta.videoId}${t.timestamp_hint ? `@${t.timestamp_hint}` : ""} (${meta.url})`,
    created_at: today,
    usage_count: 0,
    provenance: {
      video_url: meta.url,
      video_title: meta.title ?? null,
      channel: meta.channel ?? null,
      extractor: "youtube-free-extract@1.0",
      timestamp_hint: t.timestamp_hint || null,
    },
  }));
}

/**
 * Render a wiki entry (markdown) for the extracted video. Follows the
 * LLM-Wiki schema: frontmatter + tribal tips list + related links. Pure.
 */
export function renderWikiEntry(knowledgeTips, meta) {
  const today = new Date().toISOString().slice(0, 10);
  const slug = `youtube-${meta.videoId}`;
  const safeTitle = (meta.title || `YouTube video ${meta.videoId}`).replace(/"/g, '\\"');
  const fm = [
    "---",
    `title: "${safeTitle}"`,
    `slug: ${slug}`,
    `type: code-tribal`,
    `source: youtube-free-extract`,
    `url: ${meta.url}`,
    `channel: ${meta.channel || "unknown"}`,
    `video_id: ${meta.videoId}`,
    `extracted_at: ${today}`,
    `extractor_version: youtube-free-extract@1.0`,
    `tip_count: ${knowledgeTips.length}`,
    `aliases: [${slug}, video-${meta.videoId}]`,
    "---",
    "",
  ].join("\n");
  const head = `# ${meta.title || `YouTube video ${meta.videoId}`}\n\n`;
  const linkLine = `**Source:** [${meta.url}](${meta.url})  ·  **Channel:** ${meta.channel || "unknown"}  ·  **Extracted:** ${today}\n\n`;
  const summary = `Extracted ${knowledgeTips.length} tribal tip(s) using the FREE pipeline (yt-dlp auto-subs → Ollama → TribalKnowledgeEngine).\n\n`;
  const tipsHead = `## Extracted tribal tips\n\n`;
  const tipBlocks = knowledgeTips.map((t, i) => [
    `### Tip ${i + 1}: ${t.title}`,
    `- **Category:** \`${t.category}\``,
    `- **Confidence:** ${t.confidence}%`,
    `- **Tags:** ${t.tags.map((x) => `\`${x}\``).join(", ") || "(none)"}`,
    t.provenance?.timestamp_hint ? `- **Timestamp:** ${t.provenance.timestamp_hint}` : null,
    "",
    t.body,
    "",
  ].filter(Boolean).join("\n")).join("\n");
  const related = `## Related\n- [[youtube-free-extraction]] — pipeline doctrine\n- [[reference_youtube_free_extraction_pipeline_2026_05_26]] — memory\n- [[tribalknowledgeengine]] — ingestion target\n`;
  return fm + head + linkLine + summary + tipsHead + tipBlocks + "\n" + related;
}

/** Extract a YouTube video id from a URL. Returns the id, or null. Pure. */
export function extractVideoId(url) {
  if (!url || typeof url !== "string") return null;
  const idClass = `[A-Za-z0-9_-]{${YOUTUBE_ID_LEN}}`;
  let m = new RegExp(`[?&]v=(${idClass})`).exec(url);
  if (m) return m[1];
  m = new RegExp(`youtu\\.be/(${idClass})`).exec(url);
  if (m) return m[1];
  m = new RegExp(`/shorts/(${idClass})`).exec(url);
  if (m) return m[1];
  m = new RegExp(`/embed/(${idClass})`).exec(url);
  if (m) return m[1];
  if (new RegExp(`^${idClass}$`).test(url)) return url;
  return null;
}

/** Parse yt-dlp's --print-json stdout (one JSON object per line). */
export function parseYtDlpJsonStdout(stdout) {
  if (!stdout) return [];
  const out = [];
  for (const line of stdout.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || !t.startsWith("{")) continue;
    try { out.push(JSON.parse(t)); } catch { /* skip non-JSON */ }
  }
  return out;
}

/** Find the VTT file yt-dlp wrote for a given video id. Returns absolute path or null. */
export function findVttFile(workDir, videoId) {
  if (!existsSync(workDir)) return null;
  const files = readdirSync(workDir).filter((f) => f.startsWith(videoId) && f.endsWith(".vtt"));
  if (!files.length) return null;
  // Prefer the longest English variant (e.g. en-US > en)
  files.sort((a, b) => b.length - a.length);
  return join(workDir, files[0]);
}

// ── Impure shell ──────────────────────────────────────────────────────────

/**
 * Run a child process safely (argv-array form, never a shell string).
 * Returns { ok, stdout, stderr, code } — never throws.
 *
 * SECURITY: uses `spawn` with argv array form so a hostile URL with shell
 * metacharacters cannot inject. No shell is involved. See node:child_process
 * docs — `shell:false` (default) means no shell interpretation.
 */
export function runChild(cmd, args, opts = {}) {
  const { timeoutMs = YT_DLP_TIMEOUT_MS, maxBuffer = SUBPROCESS_MAX_BUFFER, env } = opts;
  return new Promise((res) => {
    const child = spawn(cmd, args, { shell: false, env: env || process.env });
    let stdout = "";
    let stderr = "";
    let overflowed = false;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      if (stdout.length + chunk.length > maxBuffer) {
        overflowed = true;
        try { child.kill("SIGKILL"); } catch { /* swallow */ }
        return;
      }
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", (err) => {
      clearTimeout(timer);
      res({ ok: false, stdout, stderr, code: -1, error: err?.message || String(err) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        res({ ok: false, stdout, stderr, code, error: `process timed out after ${timeoutMs}ms` });
      } else if (overflowed) {
        res({ ok: false, stdout, stderr, code, error: `stdout exceeded ${maxBuffer} bytes` });
      } else if (code === 0) {
        res({ ok: true, stdout, stderr, code });
      } else {
        res({ ok: false, stdout, stderr, code, error: `exit ${code}: ${stderr.slice(0, 400)}` });
      }
    });
  });
}

/**
 * Fetch auto-generated subtitles via yt-dlp. Writes the VTT to a temp dir,
 * reads it back, returns parsed TranscriptResult + the video's metadata.
 * Tries auto-subs first, then uploaded subs.
 */
export async function fetchSubtitles(url, opts = {}) {
  const {
    ytdlpCmd = YT_DLP_CMD,
    ytdlpArgsBase = YT_DLP_ARGS_BASE,
    runChildImpl = runChild,
    timeoutMs = YT_DLP_TIMEOUT_MS,
    tmpRoot = tmpdir(),
  } = opts;
  const id = randomBytes(6).toString("hex");
  const workDir = join(tmpRoot, `prism-ytfree-${id}`);
  mkdirSync(workDir, { recursive: true });
  const outTemplate = join(workDir, "%(id)s.%(ext)s");
  // --ignore-errors: skip an unavailable video in a search/playlist instead
  // of aborting the whole batch. --no-abort-on-error: same but for batch.
  // The Dapra live test surfaced this: 1 of 3 ytsearch hits was deleted →
  // pre-fix the entire batch exited 1 with zero output.
  const args = [
    ...ytdlpArgsBase,
    "--write-auto-subs",
    "--write-subs",
    "--sub-langs", "en.*,en",
    "--sub-format", "vtt",
    "--skip-download",
    "--no-warnings",
    "--no-playlist",
    "--ignore-errors",
    "--no-abort-on-error",
    "--print-json",
    "-o", outTemplate,
    url,
  ];
  const r = await runChildImpl(ytdlpCmd, args, { timeoutMs, maxBuffer: SUBPROCESS_MAX_BUFFER });
  // Even on non-zero exit, yt-dlp with --ignore-errors emits JSON for every
  // video it DID succeed on. Parse stdout first; only fail-hard when both the
  // process exited bad AND no JSON came back.
  const metaList = parseYtDlpJsonStdout(r.stdout);
  if (!metaList.length) {
    cleanupDir(workDir);
    const why = r.ok
      ? "yt-dlp returned no metadata — invalid URL or all videos failed"
      : `yt-dlp failed: ${r.error || r.stderr?.slice(0, 400)}`;
    return { ok: false, error: why };
  }
  // Partial success: log the failures but proceed with what we got.
  const partialWarning = (!r.ok && r.stderr) ? `partial-success: ${r.stderr.slice(0, 200)}` : null;
  const results = [];
  for (const meta of metaList) {
    const vid = meta.id || extractVideoId(meta.webpage_url || "") || "unknown";
    const vttPath = findVttFile(workDir, vid);
    if (!vttPath) {
      results.push({
        ok: false,
        error: "no English subtitles available (auto or manual)",
        meta: {
          videoId: vid,
          url: meta.webpage_url || meta.url || url,
          title: meta.title || null,
          channel: meta.channel || meta.uploader || null,
          duration: meta.duration || 0,
        },
      });
      continue;
    }
    const vttText = readFileSync(vttPath, "utf8");
    const transcript = parseVtt(vttText);
    results.push({
      ok: true,
      transcript,
      meta: {
        videoId: vid,
        url: meta.webpage_url || meta.url || url,
        title: meta.title || null,
        channel: meta.channel || meta.uploader || null,
        duration: meta.duration || transcript.duration_seconds,
      },
    });
  }
  cleanupDir(workDir);
  return { ok: true, results, partialWarning };
}

/** Best-effort recursive temp dir cleanup. Swallows errors — temp files leak harmlessly. */
function cleanupDir(p) {
  try { rmSync(p, { recursive: true, force: true }); } catch { /* swallow */ }
}

/**
 * Call Ollama /api/generate. Standalone (independent of ask-ollama.mjs).
 */
export async function callOllama(model, prompt, opts = {}) {
  const { fetchImpl = fetch, timeoutMs = OLLAMA_TIMEOUT_MS, ollamaUrl = DEFAULT_OLLAMA_URL } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        keep_alive: "10m",
        options: { temperature: 0.15, top_p: 0.9 },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Ollama HTTP ${res.status}: ${String(body).slice(0, 200)}` };
    }
    const j = await res.json();
    const text = String(j.response || "").trim();
    if (!text) return { ok: false, error: "Ollama returned empty response" };
    return { ok: true, text };
  } catch (e) {
    const reason = e?.name === "AbortError"
      ? `Ollama timed out after ${timeoutMs}ms`
      : `Ollama unreachable: ${e?.message || e}`;
    return { ok: false, error: reason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract tribal tips from a transcript via Ollama. Chunks the transcript,
 * calls the model once per chunk, dedupes results.
 *
 * NOTE: chunk calls are SEQUENTIAL by design — Ollama serializes against a
 * single resident model anyway, and parallel HTTP requests just cause queue
 * contention without speeding up wall-clock. Promise.all here would be a
 * micro-optimization that fights the server's actual concurrency model.
 */
export async function extractTipsFromTranscript(transcript, meta, opts = {}) {
  const { model = DEFAULT_OLLAMA_MODEL, callOllamaImpl = callOllama, maxChars = DEFAULT_CHUNK_CHARS } = opts;
  const chunks = chunkTranscript(transcript, maxChars);
  if (!chunks.length) return { ok: false, error: "transcript has no segments to process" };

  const allTips = [];
  let chunkOk = 0;
  let chunkFail = 0;
  for (let i = 0; i < chunks.length; i++) {
    const prompt = buildExtractionPrompt(chunks[i].text, {
      title: meta.title, channel: meta.channel,
      chunkIndex: i, chunkTotal: chunks.length,
    });
    // SEQUENTIAL: Ollama serializes single-model calls — parallel would not help.
    // eslint-disable-next-line no-await-in-loop
    const r = await callOllamaImpl(model, prompt, opts);
    if (!r.ok) { chunkFail++; continue; }
    const parsed = parseTipsFromLlm(r.text);
    for (const p of parsed) {
      const ts = `${Math.round(chunks[i].start)}-${Math.round(chunks[i].end)}s`;
      if (!p.timestamp_hint) p.timestamp_hint = ts;
      allTips.push(p);
    }
    chunkOk++;
  }
  // De-dupe by lowercased title
  const seen = new Set();
  const deduped = [];
  for (const t of allTips) {
    const key = t.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(t);
  }
  if (chunkOk === 0) {
    return { ok: false, error: `every Ollama call failed (${chunkFail}/${chunks.length})` };
  }
  return {
    ok: true,
    tips: deduped,
    stats: {
      chunks_total: chunks.length,
      chunks_ok: chunkOk,
      chunks_fail: chunkFail,
      tips_raw: allTips.length,
      tips_deduped: deduped.length,
    },
  };
}

/**
 * Ingest KnowledgeTip records into TribalKnowledgeEngine. Dynamic-imports the
 * engine so this script runs hermetically in tests without it. Falls back
 * to a JSON dump when the engine can't be loaded (e.g. uncompiled TS source).
 */
export async function ingestTips(knowledgeTips, opts = {}) {
  const { fallbackJsonPath } = opts;
  try {
    let mod;
    // pathToFileURL is REQUIRED here: on Windows a raw absolute path ("H:\\...")
    // is rejected by the ESM loader ("Received protocol 'h:'"), which made THIS
    // ingest fail silently into the fallback-JSON path on every run since ship
    // (root-caused 2026-06-12 via promote-youtube-staged --apply, slot:zulu).
    try {
      mod = await import(pathToFileURL(resolve(REPO_ROOT, "mcp-server", "dist", "engines", "TribalKnowledgeEngine.js")).href);
    } catch {
      try {
        mod = await import(pathToFileURL(resolve(REPO_ROOT, "mcp-server", "src", "engines", "TribalKnowledgeEngine.ts")).href);
      } catch (e2) {
        throw new Error(`engine import failed: ${e2?.message || e2}`);
      }
    }
    const engine = mod.tribalKnowledgeEngine || mod.default?.tribalKnowledgeEngine;
    if (!engine || typeof engine.ingest !== "function") {
      throw new Error("TribalKnowledgeEngine import succeeded but ingest() is missing");
    }
    const ingested = engine.ingest(knowledgeTips);
    return { ok: true, ingested };
  } catch (e) {
    if (fallbackJsonPath) {
      try {
        mkdirSync(dirname(fallbackJsonPath), { recursive: true });
        writeFileSync(fallbackJsonPath, JSON.stringify(knowledgeTips, null, 2), "utf8");
        return { ok: true, ingested: 0, fallback: fallbackJsonPath, error: `engine unavailable, wrote fallback JSON: ${e?.message || e}` };
      } catch (e2) {
        return { ok: false, ingested: 0, error: `engine + fallback both failed: ${e2?.message || e2}` };
      }
    }
    return { ok: false, ingested: 0, error: e?.message || String(e) };
  }
}

/** Write the extraction artifact JSON. Returns the path. */
export function writeExtractionArtifact(record, outDir = DEFAULT_OUTPUT_DIR) {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${record.meta.videoId}.json`);
  writeFileSync(path, JSON.stringify(record, null, 2), "utf8");
  return path;
}

/** Write the wiki entry. Returns the path. */
export function writeWikiEntry(knowledgeTips, meta, wikiDir = WIKI_DIR) {
  mkdirSync(wikiDir, { recursive: true });
  const path = join(wikiDir, `youtube-${meta.videoId}.md`);
  writeFileSync(path, renderWikiEntry(knowledgeTips, meta), "utf8");
  return path;
}

/** Append a one-line log entry to knowledge/wiki/log.md (LLM-Wiki audit). */
export function appendWikiLog(meta, tipCount, opts = {}) {
  const logPath = opts.logPath || join(REPO_ROOT, "knowledge", "wiki", "log.md");
  if (!existsSync(logPath)) return null;
  const ts = new Date().toISOString();
  const slot = process.env.PRISM_SLOT || "victor";
  const session = process.env.PRISM_SESSION_ID || "claude-2423b113";
  const line = `## [${ts}] by:${session} (slot:${slot}) — youtube-free-extract ingested ${tipCount} tip(s) from ${meta.videoId} (${meta.title || "untitled"})\n`;
  try {
    appendFileSync(logPath, "\n" + line, "utf8");
    return logPath;
  } catch { return null; }
}

// ── CLI ───────────────────────────────────────────────────────────────────

const USAGE = `youtube-free-extract — FREE YouTube → PRISM tribal/wiki

  node scripts/youtube-free-extract.mjs <url>                     single video
  node scripts/youtube-free-extract.mjs "ytsearch5:dapra machining" search 5
  node scripts/youtube-free-extract.mjs <url> --no-ingest         skip TribalEngine
  node scripts/youtube-free-extract.mjs <url> --no-wiki           skip wiki entry
  node scripts/youtube-free-extract.mjs <url> --transcript-only   no Ollama call
  node scripts/youtube-free-extract.mjs <url> --model qwen2.5-coder:14b
  node scripts/youtube-free-extract.mjs <url> --out <dir>         override artifact dir
  node scripts/youtube-free-extract.mjs <url> --json              machine-readable

flags: --no-ingest --no-wiki --transcript-only --model <name> --out <dir> --json --max-chars <n>`;

/** parseArgs: argv slice → { url, flags } or { error }. Pure. */
export function parseArgs(argv) {
  if (!argv.length) return { error: "no URL or search query given" };
  const flags = {
    ingest: true, wiki: true, transcriptOnly: false, json: false,
    model: DEFAULT_OLLAMA_MODEL, out: DEFAULT_OUTPUT_DIR, maxChars: DEFAULT_CHUNK_CHARS,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-ingest") flags.ingest = false;
    else if (a === "--no-wiki") flags.wiki = false;
    else if (a === "--transcript-only") flags.transcriptOnly = true;
    else if (a === "--json") flags.json = true;
    else if (a === "--model") {
      const v = argv[++i]; if (!v) return { error: "--model needs a value" };
      flags.model = v;
    } else if (a === "--out") {
      const v = argv[++i]; if (!v) return { error: "--out needs a value" };
      flags.out = v;
    } else if (a === "--max-chars") {
      const n = parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < MIN_CHUNK_CHARS) return { error: `--max-chars needs an integer >= ${MIN_CHUNK_CHARS}` };
      flags.maxChars = n;
    } else if (a.startsWith("--")) {
      return { error: `unknown flag: ${a}` };
    } else {
      positional.push(a);
    }
  }
  const url = positional.join(" ").trim();
  if (!url) return { error: "no URL or search query given" };
  return { url, flags };
}

/** Process one (transcript, meta) result through the rest of the pipeline. */
async function processSingleVideo(subResult, flags) {
  if (!subResult.ok) {
    return { ok: false, videoId: subResult.meta?.videoId, error: subResult.error, meta: subResult.meta };
  }
  const { transcript, meta } = subResult;
  const out = {
    ok: true, videoId: meta.videoId, title: meta.title, url: meta.url,
    channel: meta.channel, duration_s: transcript.duration_seconds,
    transcript_chars: transcript.full_text.length,
    transcript_segments: transcript.segments.length,
    tipsExtracted: 0, ingested: 0, artifactPath: null, wikiPath: null,
  };

  if (flags.transcriptOnly) {
    out.artifactPath = writeExtractionArtifact(
      { meta, transcript, tips: [], mode: "transcript-only" }, flags.out,
    );
    return out;
  }

  const ex = await extractTipsFromTranscript(transcript, meta, { model: flags.model, maxChars: flags.maxChars });
  if (!ex.ok) {
    out.ok = false;
    out.error = ex.error;
    return out;
  }
  out.tipsExtracted = ex.tips.length;
  out.extractionStats = ex.stats;

  const knowledgeTips = tipsToKnowledgeTips(ex.tips, meta);

  if (flags.ingest) {
    const ing = await ingestTips(knowledgeTips, {
      fallbackJsonPath: join(flags.out, `${meta.videoId}-tips-fallback.json`),
    });
    out.ingested = ing.ingested;
    if (!ing.ok) out.ingestError = ing.error;
    if (ing.fallback) out.ingestFallback = ing.fallback;
  }

  if (flags.wiki) {
    try {
      out.wikiPath = writeWikiEntry(knowledgeTips, meta);
      appendWikiLog(meta, knowledgeTips.length);
    } catch (e) {
      out.wikiError = e?.message || String(e);
    }
  }

  out.artifactPath = writeExtractionArtifact({
    meta,
    transcript_summary: {
      chars: transcript.full_text.length,
      segments: transcript.segments.length,
      duration_s: transcript.duration_seconds,
    },
    extractionStats: ex.stats,
    tips: knowledgeTips,
    mode: "full",
  }, flags.out);

  return out;
}

/** Human-readable summary for terminal output. */
export function formatHumanSummary(summary) {
  const lines = [
    `youtube-free-extract — ${summary.videos_total} video(s), ${summary.elapsed_ms}ms, $${summary.cost_usd.toFixed(2)}`,
    `  ok: ${summary.videos_ok} · failed: ${summary.videos_failed}`,
    `  tips extracted: ${summary.tips_extracted_total} · ingested into TribalKnowledgeEngine: ${summary.tips_ingested_total}`,
    "",
  ];
  for (const r of summary.results) {
    if (!r.ok) {
      lines.push(`  x ${r.videoId || "?"} — ${r.error}`);
      continue;
    }
    lines.push(`  ok ${r.videoId} "${r.title?.slice(0, 60) || ""}" (${Math.round(r.duration_s || 0)}s)`);
    lines.push(`      transcript: ${r.transcript_segments} segments, ${r.transcript_chars} chars`);
    lines.push(`      tips: extracted=${r.tipsExtracted} ingested=${r.ingested}`);
    if (r.artifactPath) lines.push(`      artifact: ${r.artifactPath}`);
    if (r.wikiPath) lines.push(`      wiki: ${r.wikiPath}`);
    if (r.ingestError) lines.push(`      ingest error: ${r.ingestError}`);
    if (r.ingestFallback) lines.push(`      ingest fallback: ${r.ingestFallback}`);
  }
  return lines.join("\n");
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(`[youtube-free-extract] ${parsed.error}\n\n${USAGE}`);
    process.exit(2);
  }
  const { url, flags } = parsed;
  const startedAt = Date.now();

  const subs = await fetchSubtitles(url);
  if (!subs.ok) {
    console.error(`[youtube-free-extract] ${subs.error}`);
    process.exit(3);
  }
  const allResults = [];
  for (const r of subs.results) {
    // SEQUENTIAL: pipeline shares Ollama (single resident model) — see extractTipsFromTranscript note.
    // eslint-disable-next-line no-await-in-loop
    const result = await processSingleVideo(r, flags);
    allResults.push(result);
  }

  const elapsedMs = Date.now() - startedAt;
  const summary = {
    started_at: new Date(startedAt).toISOString(),
    elapsed_ms: elapsedMs,
    videos_total: allResults.length,
    videos_ok: allResults.filter((x) => x.ok).length,
    videos_failed: allResults.filter((x) => !x.ok).length,
    tips_ingested_total: allResults.reduce((a, r) => a + (r.ingested || 0), 0),
    tips_extracted_total: allResults.reduce((a, r) => a + (r.tipsExtracted || 0), 0),
    cost_usd: 0,
    extractor_version: "youtube-free-extract@1.0",
    results: allResults,
  };

  if (flags.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(formatHumanSummary(summary));
  }
  process.exit(summary.videos_ok > 0 ? 0 : 3);
}

// Run only as CLI, never on import
const INVOKED_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (INVOKED_DIRECTLY) {
  // void-prefixed: explicitly fire-and-forget per anti-pattern lint guidance
  void main().catch((e) => {
    console.error(`[youtube-free-extract] fatal: ${e?.stack || e}`);
    process.exit(1);
  });
}
