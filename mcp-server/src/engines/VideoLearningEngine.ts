/**
 * VideoLearningEngine — Direct Video Learning Pipeline
 * Extracts knowledge from local video files using FFmpeg + Whisper + Claude Vision.
 *
 * Pipeline: video → audio extraction → speech-to-text → keyframe extraction →
 *           vision analysis → knowledge fusion → component generation
 */
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import { log } from "../utils/Logger.js";

const execFileAsync = promisify(execFile);

// ── Types ──────────────────────────────────────────────────────────

export interface TranscriptSegment {
  start: number;   // seconds
  end: number;
  text: string;
}

export interface TranscriptResult {
  full_text: string;
  segments: TranscriptSegment[];
  language: string;
  duration_seconds: number;
}

export interface KeyframeInfo {
  path: string;          // path to extracted PNG
  timestamp: number;     // seconds into video
  scene_score?: number;  // scene change score (0-1)
}

export interface FrameAnalysis {
  timestamp: number;
  description: string;
  extracted_values: Record<string, string>;  // parameter name → value
  ui_elements: string[];
  category: "parameters" | "toolpath" | "simulation" | "setup" | "result" | "other";
}

export interface VideoKnowledgeItem {
  title: string;
  body: string;
  category: string;
  tags: string[];
  confidence: number;
  source: string;          // "video:<filename>@<timestamp>"
  transcript_excerpt?: string;
  frame_reference?: string;
}

export interface VideoProcessResult {
  video_path: string;
  duration_seconds: number;
  transcript: TranscriptResult;
  keyframes_extracted: number;
  keyframes_analyzed: number;
  knowledge_items: VideoKnowledgeItem[];
  api_cost_estimate: { whisper: number; vision: number; total: number };
}

export interface VideoProcessOptions {
  output_dir?: string;
  keyframe_interval?: number;      // seconds between frames (if not using scene detection)
  use_scene_detection?: boolean;   // default true
  scene_threshold?: number;        // 0-1, default 0.3
  max_keyframes?: number;          // limit frames analyzed, default 50
  vision_batch_size?: number;      // frames per Vision API call, default 4
  domain_override?: "cad" | "cam" | "shop";
  whisper_model?: string;          // default "whisper-1"
  skip_transcription?: boolean;    // skip audio, vision-only mode
  skip_vision?: boolean;           // skip vision, audio-only mode
  dry_run?: boolean;               // extract but don't generate components
}

/** A candidate operator/playbook rule extracted from video-derived text. */
export interface PlaybookRule {
  /** The rule statement (an imperative / conditional / prohibition / best-practice line). */
  rule: string;
  /** Classification by the cue phrase that matched. */
  kind: "imperative" | "conditional" | "prohibition" | "best_practice";
  /** Heuristic confidence (0-1) reflecting cue strength. */
  confidence: number;
  /** The source sentence the rule was lifted from. */
  source_excerpt: string;
}

// ── Engine ─────────────────────────────────────────────────────────

class VideoLearningEngineImpl {
  private ffmpegPath = "ffmpeg";
  private ffprobePath = "ffprobe";

  /**
   * Check if FFmpeg is available on the system.
   */
  async checkPrerequisites(): Promise<{ ffmpeg: boolean; ffprobe: boolean; version?: string }> {
    const result = { ffmpeg: false, ffprobe: false, version: undefined as string | undefined };
    try {
      const { stdout } = await execFileAsync(this.ffmpegPath, ["-version"], { timeout: 5000 });
      result.ffmpeg = true;
      const match = stdout.match(/ffmpeg version (\S+)/);
      if (match) result.version = match[1];
    } catch { /* not available */ }
    try {
      await execFileAsync(this.ffprobePath, ["-version"], { timeout: 5000 });
      result.ffprobe = true;
    } catch { /* not available */ }
    return result;
  }

  /**
   * Get video metadata using ffprobe.
   */
  async getVideoInfo(videoPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    has_audio: boolean;
    codec: string;
  }> {
    const { stdout } = await execFileAsync(this.ffprobePath, [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      videoPath,
    ], { timeout: 30000 });

    const info = JSON.parse(stdout);
    const videoStream = info.streams?.find((s: any) => s.codec_type === "video");
    const audioStream = info.streams?.find((s: any) => s.codec_type === "audio");

    return {
      duration: parseFloat(info.format?.duration ?? "0"),
      width: videoStream?.width ?? 0,
      height: videoStream?.height ?? 0,
      has_audio: !!audioStream,
      codec: videoStream?.codec_name ?? "unknown",
    };
  }

  /**
   * Extract audio track from video file as WAV (16kHz mono for Whisper).
   */
  async extractAudio(videoPath: string, outputDir: string): Promise<string> {
    const basename = path.basename(videoPath, path.extname(videoPath));
    const outputPath = path.join(outputDir, `${basename}_audio.wav`);

    await execFileAsync(this.ffmpegPath, [
      "-i", videoPath,
      "-vn",                    // no video
      "-acodec", "pcm_s16le",  // PCM 16-bit
      "-ar", "16000",          // 16kHz for Whisper
      "-ac", "1",              // mono
      "-y",                    // overwrite
      outputPath,
    ], { timeout: 300000 }); // 5 min timeout

    log.info(`[VideoLearning] Audio extracted: ${outputPath}`);
    return outputPath;
  }

  /**
   * Extract keyframes using scene-change detection or fixed interval.
   */
  async extractKeyframes(
    videoPath: string,
    outputDir: string,
    opts: {
      useSceneDetection?: boolean;
      sceneThreshold?: number;
      interval?: number;
      maxFrames?: number;
    } = {}
  ): Promise<KeyframeInfo[]> {
    const {
      useSceneDetection = true,
      sceneThreshold = 0.3,
      interval = 5,
      maxFrames = 50,
    } = opts;

    const basename = path.basename(videoPath, path.extname(videoPath));
    const frameDir = path.join(outputDir, `${basename}_frames`);
    if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

    // Build ffmpeg filter
    let vf: string;
    if (useSceneDetection) {
      // Scene-change detection + limit frame rate to avoid too many frames
      vf = `select='gt(scene,${sceneThreshold})',setpts=N/FRAME_RATE/TB`;
    } else {
      // Fixed interval: 1 frame every N seconds
      vf = `fps=1/${interval}`;
    }

    await execFileAsync(this.ffmpegPath, [
      "-i", videoPath,
      "-vf", vf,
      "-vsync", "vfr",
      "-frame_pts", "1",
      "-y",
      path.join(frameDir, `frame_%04d.png`),
    ], { timeout: 600000 }); // 10 min timeout

    // Read extracted frames and get their timestamps
    const frames: KeyframeInfo[] = [];
    const files = fs.readdirSync(frameDir)
      .filter(f => f.endsWith(".png"))
      .sort();

    // Get timestamps for each frame using ffprobe
    for (const file of files) {
      if (frames.length >= maxFrames) break;
      frames.push({
        path: path.join(frameDir, file),
        timestamp: frames.length * (useSceneDetection ? 0 : interval), // approximate
      });
    }

    // If scene detection was used, get actual timestamps
    if (useSceneDetection && frames.length > 0) {
      try {
        const { stdout } = await execFileAsync(this.ffprobePath, [
          "-v", "quiet",
          "-select_streams", "v:0",
          "-show_entries", "frame=pts_time",
          "-of", "csv=p=0",
          "-vf", `select='gt(scene,${sceneThreshold})'`,
          videoPath,
        ], { timeout: 300000 });

        const timestamps = stdout.trim().split("\n")
          .map(line => parseFloat(line.trim()))
          .filter(t => !isNaN(t));

        for (let i = 0; i < Math.min(frames.length, timestamps.length); i++) {
          frames[i].timestamp = timestamps[i];
        }
      } catch (err) {
        log.warn("[VideoLearning] Could not get exact frame timestamps, using estimates");
        // Fallback: distribute evenly across video duration
      }
    }

    log.info(`[VideoLearning] Extracted ${frames.length} keyframes from ${videoPath}`);
    return frames;
  }

  /**
   * Transcribe audio using Whisper API.
   * Requires OPENAI_API_KEY in environment.
   */
  async transcribeAudio(audioPath: string, model = "whisper-1"): Promise<TranscriptResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Try local whisper via ffmpeg's built-in whisper support
      return this.transcribeLocal(audioPath);
    }

    const audioBuffer = fs.readFileSync(audioPath);
    const fileSize = audioBuffer.length;

    // Whisper API limit: 25MB
    if (fileSize > 25 * 1024 * 1024) {
      return this.transcribeChunked(audioPath, model, apiKey);
    }

    // Use fetch to call OpenAI Whisper API
    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/wav" }), path.basename(audioPath));
    formData.append("model", model);
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const rawSegments = (data.segments ?? []) as Array<Record<string, unknown>>;

    const segments: TranscriptSegment[] = rawSegments.map((s) => ({
      start: s.start as number,
      end: s.end as number,
      text: (s.text as string).trim(),
    }));

    return {
      full_text: (data.text as string) ?? segments.map(s => s.text).join(" "),
      segments,
      language: (data.language as string) ?? "en",
      duration_seconds: (data.duration as number) ?? 0,
    };
  }

  /**
   * Transcribe chunked audio (>25MB files).
   */
  private async transcribeChunked(
    audioPath: string,
    model: string,
    apiKey: string
  ): Promise<TranscriptResult> {
    // Split audio into 20MB chunks using ffmpeg
    const dir = path.dirname(audioPath);
    const basename = path.basename(audioPath, path.extname(audioPath));
    const chunkDuration = 600; // 10 minutes per chunk (at 16kHz mono ≈ ~19MB)

    // Get total duration
    const info = await this.getVideoInfo(audioPath);
    const totalDuration = info.duration;
    const chunks: string[] = [];

    for (let start = 0; start < totalDuration; start += chunkDuration) {
      const chunkPath = path.join(dir, `${basename}_chunk_${chunks.length}.wav`);
      await execFileAsync(this.ffmpegPath, [
        "-i", audioPath,
        "-ss", String(start),
        "-t", String(chunkDuration),
        "-y",
        chunkPath,
      ], { timeout: 60000 });
      chunks.push(chunkPath);
    }

    // Transcribe each chunk
    const allSegments: TranscriptSegment[] = [];
    let fullText = "";
    let language = "en";
    let offset = 0;

    for (const chunk of chunks) {
      const chunkBuffer = fs.readFileSync(chunk);
      const formData = new FormData();
      formData.append("file", new Blob([chunkBuffer], { type: "audio/wav" }), path.basename(chunk));
      formData.append("model", model);
      formData.append("response_format", "verbose_json");
      formData.append("timestamp_granularities[]", "segment");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json() as Record<string, unknown>;
        language = (data.language as string) ?? language;
        fullText += (fullText ? " " : "") + ((data.text as string) ?? "");
        for (const s of ((data.segments ?? []) as Array<Record<string, unknown>>)) {
          allSegments.push({
            start: (s.start as number) + offset,
            end: (s.end as number) + offset,
            text: (s.text as string).trim(),
          });
        }
        offset += (data.duration as number) ?? chunkDuration;
      }

      // Cleanup chunk file
      try { fs.unlinkSync(chunk); } catch { /* ok */ }
    }

    return { full_text: fullText, segments: allSegments, language, duration_seconds: totalDuration };
  }

  /**
   * Local transcription fallback using ffmpeg's built-in whisper filter.
   * Requires ffmpeg compiled with --enable-whisper and a ggml model file.
   * Outputs JSONL with {start, end, text} per segment.
   */
  private async transcribeLocal(audioPath: string): Promise<TranscriptResult> {
    log.warn("[VideoLearning] No OPENAI_API_KEY — attempting local whisper via ffmpeg");

    const modelPath = process.env.WHISPER_MODEL_PATH ?? "H:/prism/models/ggml-base.bin";
    // Escape colons in Windows paths for ffmpeg filter syntax
    const escapedModel = modelPath.replace(/:/g, "\\:");
    const outputFile = audioPath.replace(/\.\w+$/, "_whisper.json");
    const escapedOutput = outputFile.replace(/:/g, "\\:");

    try {
      await execFileAsync(this.ffmpegPath, [
        "-i", audioPath,
        "-af", `whisper=model=${escapedModel}:format=json:destination=${escapedOutput}`,
        "-f", "null", "-",
      ], { timeout: 600000, env: { ...process.env, MSYS_NO_PATHCONV: "1" } });

      // Parse JSONL output: one {start, end, text} per line
      const raw = fs.readFileSync(outputFile, "utf-8").trim();
      const lines = raw.split("\n").filter(l => l.trim());
      const segments: TranscriptSegment[] = [];

      for (const line of lines) {
        try {
          const obj = JSON.parse(line) as { start: number; end: number; text: string };
          // Timestamps are in milliseconds, convert to seconds
          segments.push({
            start: obj.start / 1000,
            end: obj.end / 1000,
            text: obj.text.trim(),
          });
        } catch { /* skip malformed lines */ }
      }

      // Filter out music/noise markers like [MUSIC], (upbeat music), etc.
      const speechSegments = segments.filter(
        s => !/^\[.*\]$|^\(.*\)$/.test(s.text)
      );

      const fullText = speechSegments.map(s => s.text).join(" ");
      const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

      // Cleanup temp file
      try { fs.unlinkSync(outputFile); } catch { /* ok */ }

      log.info(`[VideoLearning] Local whisper: ${speechSegments.length} speech segments, ${fullText.length} chars`);

      return {
        full_text: fullText,
        segments: speechSegments,
        language: "en",
        duration_seconds: duration,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Local whisper failed: ${msg}. Ensure ffmpeg has --enable-whisper and model exists at ${modelPath}`);
    }
  }

  /**
   * Analyze keyframes through the FREE Ollama-first llmEngine.queryVision substrate
   * (Ollama vision model -> Claude vision backup -> offline). No API key required; on
   * offline (no provider) the batch is skipped with a warning (never fabricated).
   */
  async analyzeKeyframes(
    frames: KeyframeInfo[],
    context: { title?: string; transcript_excerpt?: string; domain?: string },
    batchSize = 4
  ): Promise<FrameAnalysis[]> {
    const { llmEngine } = await import("./LLMEngine.js");

    const results: FrameAnalysis[] = [];
    const batches: KeyframeInfo[][] = [];

    for (let i = 0; i < frames.length; i += batchSize) {
      batches.push(frames.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        // Multi-image batch -> VisionImage[] for the free Ollama-first vision substrate.
        const images = batch.map(frame => ({
          data: fs.readFileSync(frame.path).toString("base64"),
          media_type: "image/png" as const,
        }));

        const prompt = `You are analyzing keyframes from a manufacturing/CAM software tutorial video${context.title ? ` titled "${context.title}"` : ""}.${context.domain ? ` Domain: ${context.domain}.` : ""}

For each frame (${batch.length} images provided in order), extract:
1. A brief description of what's shown
2. Any parameter values visible in UI dialogs (parameter name → value)
3. UI elements visible (menus, toolbars, dialogs, 3D views)
4. Category: parameters, toolpath, simulation, setup, result, or other
${context.transcript_excerpt ? `\nTranscript context around these frames: "${context.transcript_excerpt}"` : ""}

Respond as JSON array:
[{"timestamp": <seconds>, "description": "...", "extracted_values": {"param": "value"}, "ui_elements": ["..."], "category": "..."}]`;

        const res = await llmEngine.queryVision({ prompt, images, complexity: "high", max_tokens: 2000 });
        if (res.model === "offline") {
          // R12: no provider answered (Ollama vision down + no Claude backup key). Skip the
          // batch with a warning -- never fabricate frame analyses from an empty read.
          log.warn("[VideoLearning] No vision provider available (Ollama vision down + no Claude backup key) -- skipping batch");
          continue;
        }
        const text = res.answer ?? "";

        // Parse JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as FrameAnalysis[];
          for (let i = 0; i < parsed.length && i < batch.length; i++) {
            parsed[i].timestamp = batch[i].timestamp;
            results.push(parsed[i]);
          }
        }
      } catch (err: any) {
        log.warn(`[VideoLearning] Vision batch failed: ${err.message}`);
      }
    }

    log.info(`[VideoLearning] Analyzed ${results.length}/${frames.length} keyframes`);
    return results;
  }

  /**
   * Fuse transcript + vision analysis into structured knowledge items.
   */
  /**
   * Extract candidate playbook rules -- experiential imperative / conditional /
   * prohibition / best-practice statements -- from video-derived text. Heuristic
   * cue-phrase parser: splits the source into sentences and keeps those that read
   * like an operator rule, classified + confidence-scored by the cue that matched.
   * Source may be a raw transcript string, a TranscriptResult, or the
   * VideoKnowledgeItem[] from processVideo(). Best-effort: blank source -> [].
   * Output rules are CANDIDATES for the playbook store (not authoritative); they
   * pair with prismSelfAwarenessEngine.searchPlaybookRules (the string rule corpus).
   */
  extractPlaybookRules(
    source: string | TranscriptResult | VideoKnowledgeItem[]
  ): PlaybookRule[] {
    const text = this.coalesceRuleSource(source);
    if (!text.trim()) return [];
    const rules: PlaybookRule[] = [];
    const seen = new Set<string>();
    const sentences = text
      .split(/(?<=[.!?])\s+|\n+/)
      .map(s => s.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      const classified = this.classifyRuleSentence(sentence);
      if (!classified) continue;
      const norm = sentence.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(norm)) continue; // dedup repeated phrasings
      seen.add(norm);
      rules.push({
        rule: sentence,
        kind: classified.kind,
        confidence: classified.confidence,
        source_excerpt: sentence,
      });
    }
    return rules;
  }

  /** Flatten any accepted extractPlaybookRules source into a single text blob. */
  private coalesceRuleSource(
    source: string | TranscriptResult | VideoKnowledgeItem[]
  ): string {
    if (typeof source === "string") return source;
    if (Array.isArray(source)) {
      return source.map(k => `${k.title}. ${k.body}`).join("\n");
    }
    return source.full_text ?? "";
  }

  /**
   * Classify a sentence as a playbook rule by cue phrase, or null if it does not
   * read like a rule. Prohibition/imperative cues score highest; best-practice and
   * conditional (if/when -> action) slightly lower. Questions and very short
   * fragments are rejected.
   */
  private classifyRuleSentence(
    sentence: string
  ): { kind: PlaybookRule["kind"]; confidence: number } | null {
    if (sentence.length < 12 || sentence.trimEnd().endsWith("?")) return null;
    const s = sentence.toLowerCase();
    const PROHIBITION = /\b(never|don'?t|do not|avoid|must not|shouldn'?t|should not)\b/;
    const IMPERATIVE = /\b(always|make sure|ensure|be sure to|remember to|you must|you should|you need to|be careful to)\b/;
    const BEST_PRACTICE = /\b(the key is|best practice|rule of thumb|pro ?tip|the trick is|i recommend|it'?s best to)\b/;
    const CONDITIONAL = /\b(if|when|whenever)\b.*\b(then|do|use|set|run|check|reduce|increase|stop|switch)\b/;
    if (PROHIBITION.test(s)) return { kind: "prohibition", confidence: 0.85 };
    if (IMPERATIVE.test(s)) return { kind: "imperative", confidence: 0.8 };
    if (BEST_PRACTICE.test(s)) return { kind: "best_practice", confidence: 0.75 };
    if (CONDITIONAL.test(s)) return { kind: "conditional", confidence: 0.7 };
    return null;
  }

  fuseKnowledge(
    transcript: TranscriptResult,
    frameAnalysis: FrameAnalysis[],
    videoPath: string,
    domain?: string
  ): VideoKnowledgeItem[] {
    const items: VideoKnowledgeItem[] = [];
    const videoName = path.basename(videoPath, path.extname(videoPath));

    // Group frame analyses by category
    const byCategory = new Map<string, FrameAnalysis[]>();
    for (const frame of frameAnalysis) {
      const cat = frame.category ?? "other";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(frame);
    }

    // Extract knowledge from frames with parameter values
    for (const frame of frameAnalysis) {
      if (Object.keys(frame.extracted_values).length > 0) {
        const params = Object.entries(frame.extracted_values)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");

        // Find matching transcript segment
        const matchingSegment = transcript.segments.find(
          s => Math.abs(s.start - frame.timestamp) < 10
        );

        items.push({
          title: `${frame.description.substring(0, 80)}`,
          body: `${frame.description}. Parameters observed: ${params}.${matchingSegment ? ` Narrator: "${matchingSegment.text}"` : ""}`,
          category: this.mapCategory(frame.category, domain),
          tags: [
            "video-learned",
            domain ?? "cam",
            frame.category,
            ...Object.keys(frame.extracted_values).slice(0, 3),
          ],
          confidence: matchingSegment ? 85 : 75,
          source: `video:${videoName}@${Math.round(frame.timestamp)}s`,
          transcript_excerpt: matchingSegment?.text,
          frame_reference: frame.timestamp.toFixed(1) + "s",
        });
      }
    }

    // Extract knowledge from transcript segments (topic-based grouping)
    if (transcript.segments.length > 0) {
      const topicGroups = this.groupByTopic(transcript.segments);
      for (const group of topicGroups) {
        const text = group.segments.map(s => s.text).join(" ");
        if (text.length < 50) continue; // skip very short groups

        // Check if any frame analysis covers this timerange
        const relatedFrames = frameAnalysis.filter(
          f => f.timestamp >= group.start && f.timestamp <= group.end
        );

        items.push({
          title: this.extractTitle(text),
          body: text.substring(0, 500),
          category: this.mapCategory(relatedFrames[0]?.category ?? "other", domain),
          tags: ["video-learned", domain ?? "cam", "transcript"],
          confidence: relatedFrames.length > 0 ? 80 : 65,
          source: `video:${videoName}@${Math.round(group.start)}-${Math.round(group.end)}s`,
          transcript_excerpt: text.substring(0, 200),
          frame_reference: relatedFrames.length > 0 ? `${relatedFrames.length} frames` : undefined,
        });
      }
    }

    return items;
  }

  /**
   * Group transcript segments by topic (based on pauses and content shifts).
   */
  private groupByTopic(segments: TranscriptSegment[]): Array<{
    start: number;
    end: number;
    segments: TranscriptSegment[];
  }> {
    const groups: Array<{ start: number; end: number; segments: TranscriptSegment[] }> = [];
    let current: { start: number; end: number; segments: TranscriptSegment[] } | null = null;

    for (const seg of segments) {
      if (!current || seg.start - current.end > 5) {
        // New group if >5s gap
        if (current) groups.push(current);
        current = { start: seg.start, end: seg.end, segments: [seg] };
      } else {
        current.end = seg.end;
        current.segments.push(seg);
      }
    }
    if (current) groups.push(current);

    return groups;
  }

  private extractTitle(text: string): string {
    // Take first sentence or first 80 chars
    const firstSentence = text.match(/^[^.!?]+[.!?]/);
    if (firstSentence && firstSentence[0].length <= 100) return firstSentence[0].trim();
    return text.substring(0, 80).trim() + "...";
  }

  private mapCategory(frameCategory: string, domain?: string): string {
    const map: Record<string, string> = {
      parameters: "speeds_feeds",
      toolpath: "tooling",
      simulation: "safety",
      setup: "setup",
      result: "surface_finish",
      other: "general",
    };
    return map[frameCategory] ?? "general";
  }

  /**
   * Full pipeline: process a video file end-to-end.
   */
  async processVideo(
    videoPath: string,
    opts: VideoProcessOptions = {}
  ): Promise<VideoProcessResult> {
    const {
      output_dir,
      use_scene_detection = true,
      scene_threshold = 0.3,
      keyframe_interval = 5,
      max_keyframes = 50,
      vision_batch_size = 4,
      domain_override,
      whisper_model = "whisper-1",
      skip_transcription = false,
      skip_vision = false,
    } = opts;

    // Validate input
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const outputDir = output_dir ?? path.join(path.dirname(videoPath), "_video_learn_output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    log.info(`[VideoLearning] Processing: ${videoPath}`);

    // Step 1: Get video info
    const videoInfo = await this.getVideoInfo(videoPath);
    log.info(`[VideoLearning] Duration: ${videoInfo.duration.toFixed(1)}s, ${videoInfo.width}x${videoInfo.height}, audio: ${videoInfo.has_audio}`);

    // Step 2: Extract audio + transcribe
    let transcript: TranscriptResult = {
      full_text: "",
      segments: [],
      language: "en",
      duration_seconds: videoInfo.duration,
    };

    if (!skip_transcription && videoInfo.has_audio) {
      const audioPath = await this.extractAudio(videoPath, outputDir);
      transcript = await this.transcribeAudio(audioPath, whisper_model);
      log.info(`[VideoLearning] Transcript: ${transcript.segments.length} segments, ${transcript.full_text.length} chars`);
    }

    // Step 3: Extract keyframes
    let keyframes: KeyframeInfo[] = [];
    if (!skip_vision) {
      keyframes = await this.extractKeyframes(videoPath, outputDir, {
        useSceneDetection: use_scene_detection,
        sceneThreshold: scene_threshold,
        interval: keyframe_interval,
        maxFrames: max_keyframes,
      });
    }

    // Step 4: Analyze keyframes with Vision
    let frameAnalysis: FrameAnalysis[] = [];
    if (!skip_vision && keyframes.length > 0) {
      frameAnalysis = await this.analyzeKeyframes(
        keyframes,
        {
          title: path.basename(videoPath),
          transcript_excerpt: transcript.full_text.substring(0, 500),
          domain: domain_override,
        },
        vision_batch_size
      );
    }

    // Step 5: Fuse knowledge
    const knowledgeItems = this.fuseKnowledge(
      transcript,
      frameAnalysis,
      videoPath,
      domain_override
    );

    // Cost estimate
    const whisperCost = (videoInfo.duration / 60) * 0.006;
    // FREE-AI-MIGRATION: keyframe vision now routes through the free Ollama-first
    // llmEngine.queryVision substrate (was paid Claude Haiku ~$0.04/call), so the vision leg
    // is $0 at launch. A non-zero figure here would over-report cost to consumers (R12).
    const visionCost = 0;
    const totalCost = whisperCost + visionCost;

    const result: VideoProcessResult = {
      video_path: videoPath,
      duration_seconds: videoInfo.duration,
      transcript,
      keyframes_extracted: keyframes.length,
      keyframes_analyzed: frameAnalysis.length,
      knowledge_items: knowledgeItems,
      api_cost_estimate: { whisper: whisperCost, vision: visionCost, total: totalCost },
    };

    log.info(`[VideoLearning] Complete: ${knowledgeItems.length} knowledge items, est. cost $${totalCost.toFixed(3)}`);

    // Bridge: ingest learned tips into TribalKnowledgeEngine for persistence
    if (knowledgeItems.length > 0 && !opts.dry_run) {
      try {
        const { tribalKnowledgeEngine } = require("./TribalKnowledgeEngine.js");
        const videoName = path.basename(videoPath, path.extname(videoPath));
        const tribalTips = knowledgeItems.map((item, i) => ({
          id: `tk-vl-${videoName.substring(0, 20)}-${String(i + 1).padStart(2, "0")}`,
          title: item.title,
          body: item.body,
          category: item.category as string,
          tags: [...item.tags, "video-learned-auto"],
          confidence: item.confidence,
          source: item.source,
          created_at: new Date().toISOString().slice(0, 10),
          usage_count: 0,
          ...(item.transcript_excerpt ? { material_groups: undefined, operation_types: undefined } : {}),
        }));
        const ingested = tribalKnowledgeEngine.ingest(tribalTips);
        if (ingested > 0) {
          log.info(`[VideoLearning] Ingested ${ingested} tips into TribalKnowledgeEngine`);
        }
      } catch (err) {
        log.warn(`[VideoLearning] Could not ingest into TribalKnowledgeEngine: ${err}`);
      }
    }

    return result;
  }

  /**
   * Process all videos in a directory.
   */
  async processDirectory(
    dirPath: string,
    opts: VideoProcessOptions = {}
  ): Promise<VideoProcessResult[]> {
    const videoExtensions = [".mp4", ".mkv", ".avi", ".mov", ".webm"];
    const files = fs.readdirSync(dirPath)
      .filter(f => videoExtensions.includes(path.extname(f).toLowerCase()))
      .map(f => path.join(dirPath, f));

    log.info(`[VideoLearning] Found ${files.length} videos in ${dirPath}`);

    const results: VideoProcessResult[] = [];
    for (const file of files) {
      try {
        const result = await this.processVideo(file, opts);
        results.push(result);
      } catch (err: any) {
        log.error(`[VideoLearning] Failed to process ${file}: ${err.message}`);
      }
    }

    return results;
  }
}

export const videoLearningEngine = new VideoLearningEngineImpl();
